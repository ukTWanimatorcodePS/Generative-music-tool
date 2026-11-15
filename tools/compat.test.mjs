import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, readdir } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { chromium, devices, webkit } from 'playwright';

const root = new URL('../', import.meta.url);
const prefix = '/Generative-music-tool/';
let server, origin;
before(async () => {
  server = spawn(process.execPath, [fileURLToPath(new URL('serve.mjs', import.meta.url))], {
    env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'inherit']
  });
  const [data] = await once(server.stdout, 'data');
  origin = String(data).match(/http:\/\/127\.0\.0\.1:\d+/)[0];
});
after(() => server?.kill());

test('static entry point and all 20 original sample packs at the Pages path', async () => {
  const redirect = await fetch(origin + prefix.slice(0, -1), { redirect: 'manual' });
  assert.equal(redirect.status, 308);
  assert.equal(redirect.headers.get('location'), prefix);
  for (const path of ['/', prefix]) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /viewport-fit=cover/);
    new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
  }
  const names = await readdir(new URL('samples/', root));
  assert.equal(names.length, 20);
  for (const name of names) {
    const response = await fetch(origin + prefix + 'samples/' + name);
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get('content-type'), /javascript/);
    const js = await response.text();
    assert.equal(js, await readFile(new URL('samples/' + name, root), 'utf8'));
    const window = {};
    vm.runInNewContext(js, { window });
    assert.ok(Object.keys(window.SMPK[name.slice(0, -3)]).length > 0, name);
  }
});

const profiles = [
  ['iPhone WebKit', webkit, devices['iPhone 13']],
  ['Android Chromium', chromium, devices['Pixel 7']],
  ['desktop Chrome', chromium, { viewport: { width: 1366, height: 768 } }, { channel: 'chromium' }],
  ['desktop Edge', chromium, { viewport: { width: 1366, height: 768 } }, { channel: 'msedge' }]
];
async function assertLayout(page, touch) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  for (const id of ['play', 'stop', 'gear', 'next', 'timer']) {
    const control = page.locator('#' + id);
    await control.scrollIntoViewIfNeeded();
    const box = await control.boundingBox();
    const viewport = page.viewportSize();
    assert.ok(box.x >= -1 && box.y >= -1 && box.x + box.width <= viewport.width + 1 &&
      box.y + box.height <= viewport.height + 1, id);
    if (touch) assert.ok(box.width >= 44 && box.height >= 44, id);
  }
}
async function playback(page, on) {
  await page.waitForFunction(expected => document.body.classList.contains('playing') === expected, on);
}
async function audible(page) {
  await page.waitForFunction(() => {
    const samples = new Float32Array(window.audioProbe.fftSize);
    window.audioProbe.getFloatTimeDomainData(samples);
    return samples.some(value => Math.abs(value) > .002);
  });
}

for (const [label, engine, profile, launch] of profiles) {
  if (label === 'desktop Edge' && !process.env.TEST_EDGE) continue;
  test(label + ' layout, controls and Web Audio', { timeout: 60000 }, async t => {
    const browser = await engine.launch(launch);
    try {
      const context = await browser.newContext(profile);
      const page = await context.newPage();
      const errors = [], samples = [];
      page.setDefaultTimeout(8000);
      const press = control => profile.hasTouch ? control.tap() : control.click();
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.url().includes('/samples/')) samples.push(request.url());
      });
      await page.addInitScript(() => {
        window.contexts = [];
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio) return;
        class TrackedAudio extends Audio {
          constructor(...args) { super(...args); window.contexts.push(this); }
        }
        window.AudioContext = TrackedAudio;
      });
      await page.goto(origin + prefix);
      assert.deepEqual(await page.evaluate(() => [contexts.length, document.querySelectorAll('script[src]').length]), [0, 0]);
      assert.deepEqual(samples, []);
      await assertLayout(page, profile.hasTouch);
      if (profile.hasTouch) {
        const { width, height } = page.viewportSize();
        await page.setViewportSize({ width: height, height: width });
        await assertLayout(page, true);
        await press(page.locator('#gear'));
        await page.locator('#midi').scrollIntoViewIfNeeded();
        assert.ok(await page.locator('#sheet').evaluate(sheet => sheet.scrollTop > 0));
        await press(page.locator('#sheet-close'));
        await page.setViewportSize({ width, height });
        await assertLayout(page, true);
      }
      await press(page.locator('#gear'));
      await page.locator('#vol').fill('0.65');
      await page.locator('#nvol').fill('0');
      await page.locator('#tempo').fill('1.15');
      await page.locator('#ntype').selectOption('pink');
      await page.locator('#rotate').selectOption('5');
      await page.locator('#fmin').fill('10');
      await press(page.locator('#treset'));
      assert.equal(await page.locator('#clock').textContent(), '10:00');
      await press(page.locator('#sheet-close'));
      const music = await page.evaluate(() => Object.values(window.__selftest()));
      assert.ok(music.length > 0 && music.every(result => result.notes > 0 && result.bad === 0));
      await press(page.locator('#play'));
      if (!await page.evaluate(() => !!(window.AudioContext || window.webkitAudioContext))) {
        assert.equal(engine, webkit, 'Web Audio is required in Chromium');
        await page.waitForFunction(() => document.querySelector('#audio-status').textContent.includes('無法'));
        assert.deepEqual(errors, []);
        t.diagnostic('This Playwright WebKit build lacks Web Audio. Only layout, settings, composition and unsupported-audio handling ran.');
        return;
      }
      await playback(page, true);
      await page.evaluate(() => {
        window.audioProbe = ctx.createAnalyser();
        master.connect(window.audioProbe);
      });
      await audible(page);
      await page.waitForFunction(() => SMP.has('piano'), null, { timeout: 20000 });
      assert.ok(samples.every(url => new URL(url).pathname.startsWith(prefix + 'samples/')));
      assert.ok(new Set(samples).size < 20);
      await press(page.locator('#play'));
      await playback(page, false);
      assert.deepEqual(await page.evaluate(() => [timerId, gen, noiseSrc]), [null, null, null]);
      await press(page.locator('#play'));
      await playback(page, true);
      await page.evaluate(() => ctx.suspend());
      await playback(page, false);
      await press(page.getByRole('button', { name: '繼續播放' }));
      await playback(page, true);
      if (profile.hasTouch) {
        // WebKit desktop cannot generate iOS hardware interruptions. Simulate
        // the state notification on the real AudioContext used by the app.
        await page.evaluate(() => {
          Object.defineProperty(ctx, 'state', { configurable: true, value: 'interrupted' });
          ctx.dispatchEvent(new Event('statechange'));
        });
        await playback(page, false);
        await page.evaluate(() => { delete ctx.state; });
        await press(page.getByRole('button', { name: '繼續播放' }));
        await playback(page, true);
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
          delete document.hidden;
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await playback(page, false);
        await press(page.getByRole('button', { name: '繼續播放' }));
        await playback(page, true);
      }
      await press(page.locator('#cats [data-c=lofi]'));
      await press(page.locator('#chips [data-id=lofinight]'));
      await press(page.locator('#next'));
      await press(page.locator('#cats [data-c=noise]'));
      await press(page.locator('#chips [data-id=white]'));
      await audible(page);
      assert.deepEqual(await page.evaluate(() => [noiseOnly, noiseType, contexts.length, timerId]),
        [true, 'white', 1, null]);
      await press(page.locator('#stop'));
      await playback(page, false);
      assert.deepEqual(await page.evaluate(() => [gen, st, noiseSrc]), [null, null, null]);
      await press(page.locator('#gear'));
      const download = page.waitForEvent('download');
      await press(page.locator('#midi'));
      assert.match((await download).suggestedFilename(), /\.mid$/);
      await press(page.locator('#sheet-close'));
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}

test('missing sample falls back to audible synthesis and retries the same URL', { timeout: 30000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    let requests = 0;
    await page.route('**/samples/piano.js', route => ++requests === 1
      ? route.fulfill({ status: 404 }) : route.continue());
    await page.goto(origin + prefix);
    await page.locator('#play').click();
    await playback(page, true);
    await page.waitForFunction(() => document.getElementById('smp').textContent.includes('合成音色'));
    await page.evaluate(() => {
      window.audioProbe = ctx.createAnalyser();
      master.connect(window.audioProbe);
      sampleFailures.set('piano', Date.now() - 1);
    });
    await audible(page);
    await page.locator('#next').click();
    await page.waitForFunction(() => SMP.has('piano'));
    assert.equal(requests, 2);
  } finally {
    await browser.close();
  }
});

test('standalone file remains playable with local samples', { timeout: 30000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(new URL('index.html', root).href);
    await page.locator('#play').click();
    await playback(page, true);
    await page.waitForFunction(() => SMP.has('piano'));
  } finally {
    await browser.close();
  }
});

test('a pending audio unlock can be cancelled, even if resume later resolves', { timeout: 15000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(origin + prefix);
    await page.evaluate(() => {
      const nativeUnlock = unlockAudio;
      unlockAudio = () => {
        const unlocked = nativeUnlock();
        const pending = new Promise(resolve => { window.finishUnlock = resolve; });
        return Promise.all([unlocked, pending]);
      };
    });
    await page.locator('#play').click();
    assert.equal(await page.locator('#play').getAttribute('aria-busy'), 'true');
    await page.locator('#stop').click();
    await page.evaluate(() => finishUnlock());
    await page.waitForFunction(() => ctx.state === 'running');
    await playback(page, false);
    assert.deepEqual(await page.evaluate(() => [gen, timerId, noiseSrc]), [null, null, null]);
  } finally {
    await browser.close();
  }
});

test('all sample packs decode with the original audio and a bounded cache', { timeout: 60000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const failures = [];
    page.on('console', message => {
      if (message.type() === 'warning' && message.text().startsWith('[取樣')) failures.push(message.text());
    });
    await page.goto(origin + prefix);
    await page.locator('#cats [data-c=noise]').click();
    await page.locator('#play').click();
    await playback(page, true);
    await page.evaluate(() => {
      for (const name of Object.keys(SK)) requestPack(name);
    });
    await page.waitForFunction(() => !loadingSamples && sampleQueue.size === 0, null, { timeout: 45000 });
    assert.deepEqual(failures, []);
    assert.ok(await page.evaluate(() => sampleBytes > 0 && sampleBytes <= SAMPLE_BUDGET && SMP.has('upright')));
  } finally {
    await browser.close();
  }
});
