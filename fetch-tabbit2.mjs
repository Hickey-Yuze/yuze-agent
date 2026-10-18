import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9751;
const userDir = mkdtempSync(join(tmpdir(), 'ca-tb2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=1280,1600', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
}
try {
  const { targetId } = await send('Target.createTarget', { url: 'https://skills.tabbit.com/plaza/skills' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(6000);
  const r = await send('Runtime.evaluate', { expression: `(async () => {
    const out = [];
    const anchors = [...document.querySelectorAll('a')].filter(a => a.href.includes('category_id') || a.href.includes('display_type'));
    const cats = {};
    for (const a of anchors) { const u = new URL(a.href); const k = (u.searchParams.get('category_id') || 'all') + '|' + (u.searchParams.get('display_type') || 'all'); cats[k] = a.href; }
    return JSON.stringify(cats);
  })()`, returnByValue: true }, sessionId);
  console.log('CATS:', r.result.value);
  const list = await send('Runtime.evaluate', { expression: `document.body.innerText`, returnByValue: true }, sessionId);
  writeFileSync(join(DOCS, 'tabbit-all.txt'), list.result.value || '');
} finally {
  try { ws.close(); } catch (_) {}
  proc.kill('SIGKILL');
}
