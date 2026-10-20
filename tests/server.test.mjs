import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

test('Servidor listo para despliegue: puerto dinámico, assets y rutas privadas', async t => {
  const child = spawn(process.execPath, ['server.mjs'], { env: { ...process.env, PORT: '0', HOST: '127.0.0.1' }, stdio: ['ignore','pipe','pipe'] });
  t.after(async () => { child.kill(); await once(child, 'exit'); });
  let output = '';
  const base = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('El servidor no arrancó')), 10000);
    child.once('error', e => { clearTimeout(timer); reject(e); });
    child.stdout.on('data', data => {
      output += data;
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  assert.equal(await (await fetch(base + '/healthz')).text(), 'ok');
  const page = await fetch(base); assert.equal(page.status, 200); assert.match(await page.text(), /GMockup/);
  for (const asset of ['/assets/polo.glb','/assets/tela-normal.png','/vendor/build/three.module.js']) {
    const response = await fetch(base + asset, { method: 'HEAD' });
    assert.equal(response.status, 200, asset); assert.ok(+response.headers.get('content-length') > 0);
  }
  for (const route of ['/package.json','/.env','/OBJ/OBJ.obj','/%2e%2e%2fpackage.json','/vendor/%2e%2e%2fpackage.json']) {
    assert.ok([403,404].includes((await fetch(base + route)).status), route);
  }
  assert.equal((await fetch(base, { method:'POST' })).status,405);
});
