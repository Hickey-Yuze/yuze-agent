import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9761;
const userDir = mkdtempSync(join(tmpdir(), 'ca-tb3-'));
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
const URLS = {
  all: 'https://skills.tabbit.com/plaza/skills',
  content: 'https://skills.tabbit.com/plaza/skills?category_id=content',
  study: 'https://skills.tabbit.com/plaza/skills?category_id=study',
  finance: 'https://skills.tabbit.com/plaza/skills?category_id=finance',
  dev: 'https://skills.tabbit.com/plaza/skills?category_id=dev',
  tools: 'https://skills.tabbit.com/plaza/skills?category_id=tools',
};
try {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  for (const [k, url] of Object.entries(URLS)) {
    await send('Page.navigate', { url }, sessionId);
    await sleep(4500);
    const r = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId);
    writeFileSync(join(DOCS, `tabbit-${k}.txt`), r.result.value || '');
    const cards = await send('Runtime.evaluate', { expression: `document.querySelectorAll('a[href*="/plaza/skill"], article, [class*="card"]').length`, returnByValue: true }, sessionId);
    console.log(k, 'len', (r.result.value || '').length);
  }
} finally {
  try { ws.close(); } catch (_) {}
  proc.kill('SIGKILL');
}
