// 極簡靜態伺服器：node tools/serve.mjs  →  http://localhost:8765
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = process.env.PORT === undefined ? 8765 : +process.env.PORT;
const pagesPath = '/Generative-music-tool/';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.mp3': 'audio/mpeg', '.json': 'application/json', '.css': 'text/css' };

const server = http.createServer((req, res) => {
  let p;
  try {
    p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end('bad path');
  }
  if (p === pagesPath.slice(0, -1)) {
    res.writeHead(308, { Location: pagesPath });
    return res.end();
  }
  if (p.startsWith(pagesPath)) p = p.slice(pagesPath.length - 1);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.stat(file, (err, s) => {
    if (err || !s.isFile()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': s.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
});
server.listen(port, '127.0.0.1', () => console.log(`focus-music: http://127.0.0.1:${server.address().port}`));
