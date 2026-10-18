import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9781;
const userDir = mkdtempSync(join(tmpdir(), 'ca-sd2-'));
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
  const { targetId } = await send('Target.createTarget', { url: 'https://skills.tabbit.com/plaza/skills?display_type=script&category_id=productivity' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(7000);
  // 找到「打工人便利贴」卡片并点击
  const click = await send('Runtime.evaluate', { expression: `(() => {
    const el = [...document.querySelectorAll('div,span,button,a')].find(x => (x.textContent||'').trim() === '打工人便利贴');
    if (!el) return 'not found';
    let n = el;
    for (let i = 0; i < 6 && n; i++) { if (n.tagName === 'A' || n.getAttribute('role') === 'button' || n.className && String(n.className).includes('card')) { break; } n = n.parentElement; }
    (n || el).click();
    return 'clicked ' + (n ? n.tagName : 'el');
  })()`, returnByValue: true }, sessionId);
  console.log('CLICK:', click.result.value);
  await sleep(4000);
  const txt = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId);
  writeFileSync(join(DOCS, 'tabbit-detail-1.txt'), txt.result.value || '');
  const code = await send('Runtime.evaluate', { expression: `JSON.stringify([...document.querySelectorAll('pre,code')].map(e => e.textContent))`, returnByValue: true }, sessionId);
  writeFileSync(join(DOCS, 'tabbit-detail-1-code.json'), code.result.value || '[]');
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'tabbit-detail-1.png'), Buffer.from(shot.data, 'base64'));
  console.log('LEN:', (txt.result.value || '').length);
} finally {
  try { ws.close(); } catch (_) {}
  proc.kill('SIGKILL');
}
