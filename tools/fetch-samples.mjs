// 下載開放授權的真實樂器取樣，打包成 samples/<樂器>.js（base64），讓 index.html 不需伺服器也能載入。
// 用法：node tools/fetch-samples.mjs [輸出資料夾]
// 來源：
//   鋼琴  Salamander Grand Piano（Yamaha C5，CC-BY 3.0，Alexander Holm）— 取自 Tone.js 的音檔鏡像
//   管弦  nbrosowsky/tonejs-instruments（CC-BY 3.0）
//   其他  gleitz/midi-js-soundfonts 的 MusyngKite（CC-BY-SA 3.0）
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve(process.argv[2] || 'samples');
fs.mkdirSync(out, { recursive: true });
const SAL = 'https://tonejs.github.io/audio/salamander/';
const TJ = 'https://raw.githubusercontent.com/nbrosowsky/tonejs-instruments/master/samples/';
const GZ = 'https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/MusyngKite/';
const r3 = (lo, hi) => { const o = []; for (let oc = lo; oc <= hi; oc++) for (const n of ['C', 'Eb', 'Gb', 'A']) o.push(n + oc); o.push('C' + (hi + 1)); return o; };
const w = s => s.split(' ');

const PACKS = {
  piano: [SAL, w('A0 C1 Ds1 Fs1 A1 C2 Ds2 Fs2 A2 C3 Ds3 Fs3 A3 C4 Ds4 Fs4 A4 C5 Ds5 Fs5 A5 C6 Ds6 Fs6 A6 C7 Ds7 Fs7 A7 C8')],
  cello: [TJ + 'cello/', w('C2 E2 Gs2 C3 E3 Gs3 C4 E4 Gs4 C5')],
  violin: [TJ + 'violin/', w('G3 C4 E4 G4 C5 E5 G5 C6 E6 A6')],
  flute: [TJ + 'flute/', w('C4 E4 A4 C5 E5 A5 C6 E6 A6')],
  clarinet: [TJ + 'clarinet/', w('D3 F3 As3 D4 F4 As4 D5 F5 As5 D6')],
  horn: [TJ + 'french-horn/', w('A1 C2 Ds2 G2 D3 F3 A3 C4 D5 F5')],
  harp: [TJ + 'harp/', w('E1 B1 D2 F2 A2 C3 E3 G3 B3 D4 F4 A4 C5 E5 G5 B5 D6 F6 A6')],
  guitar: [TJ + 'guitar-nylon/', w('B1 E2 Gs2 B2 D3 Fs3 A3 Cs4 E4 Gs4 B4 D5 Fs5 A5')],
  organ: [TJ + 'organ/', w('C2 Fs2 C3 Fs3 C4 Fs4 C5 Fs5 C6')],
  epiano: [GZ + 'electric_piano_1-mp3/', r3(2, 5)],
  harpsi: [GZ + 'harpsichord-mp3/', r3(2, 5)],
  marimba: [GZ + 'marimba-mp3/', r3(3, 5)],
  bell: [GZ + 'celesta-mp3/', r3(4, 6)],
  vibes: [GZ + 'vibraphone-mp3/', r3(3, 5)],
  mbox: [GZ + 'music_box-mp3/', r3(4, 6)],
  koto: [GZ + 'koto-mp3/', r3(3, 5)],
  pizz: [GZ + 'pizzicato_strings-mp3/', r3(2, 5)],
  upright: [GZ + 'acoustic_bass-mp3/', r3(1, 3)],
  strings: [GZ + 'string_ensemble_1-mp3/', r3(2, 5)],
  choir: [GZ + 'choir_aahs-mp3/', r3(3, 5)],
};

let total = 0, failed = 0;
for (const [name, [base, notes]] of Object.entries(PACKS)) {
  const got = {};
  await Promise.all(notes.map(async n => {
    try {
      const r = await fetch(base + n + '.mp3');
      if (!r.ok) throw new Error(r.status);
      got[n] = Buffer.from(await r.arrayBuffer()).toString('base64');
    } catch (e) { failed++; console.log('  失敗', name, n, String(e.message || e)); }
  }));
  const js = `(window.SMPK=window.SMPK||{})[${JSON.stringify(name)}]=${JSON.stringify(got)};window.onSamplePack&&window.onSamplePack(${JSON.stringify(name)});\n`;
  fs.writeFileSync(path.join(out, name + '.js'), js);
  total += js.length;
  console.log(name.padEnd(9), Object.keys(got).length + '/' + notes.length, (js.length / 1048576).toFixed(2) + ' MB');
}
console.log('合計', (total / 1048576).toFixed(1), 'MB，失敗', failed);
