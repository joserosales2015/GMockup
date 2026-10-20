import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.glb':'model/gltf-binary', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    if (url.pathname === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }).end(req.method === 'HEAD' ? undefined : 'ok'); return; }
    const vendor = url.pathname.startsWith('/vendor/');
    const base = path.join(root, vendor ? 'node_modules/three' : 'public');
    const relative = decodeURIComponent(vendor ? url.pathname.slice(8) : url.pathname.slice(1)) || 'index.html';
    const file = path.resolve(base, relative);
    if (!file.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control': 'no-cache' });
    if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('Archivo no encontrado'); }
});
server.listen(port, host, () => console.log(`GMockup: http://${host}:${server.address().port}`));
