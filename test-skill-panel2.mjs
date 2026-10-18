import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9691;
const userDir = mkdtempSync(join(tmpdir(), 'ca-skillp2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=980,1400', 'about:blank'], { stdio: 'ignore' });

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
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 960, height: 1380, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(1300);
  await send('Runtime.evaluate', { expression: `openSkillPanel()` }, sessionId);
  await sleep(500);
  const r = await send('Runtime.evaluate', { expression: `JSON.stringify({
    panel: !document.querySelector('#skillPanel').classList.contains('hidden'),
    sideVisible: !!document.querySelector('.sk-side') && getComputedStyle(document.querySelector('.sk-side')).display !== 'none',
    nAll: document.querySelector('#nAll') && document.querySelector('#nAll').textContent,
    title: document.querySelector('#skMainTitle') && document.querySelector('#skMainTitle').textContent,
    sub: document.querySelector('#skMainSub') && document.querySelector('#skMainSub').textContent,
    cards: document.querySelectorAll('.sk-card').length
  })`, returnByValue: true }, sessionId);
  console.log('PANEL:', r.result.value);
  let shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'skill-panel-wide.png'), Buffer.from(shot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 480, height: 1380, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(400);
  shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'skill-panel-narrow.png'), Buffer.from(shot.data, 'base64'));
  console.log('shots ok');
} finally {
  try { ws.close(); } catch (_) {}
  proc.kill('SIGKILL');
}
