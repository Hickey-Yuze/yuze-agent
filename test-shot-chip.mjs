/**
 * 端到端流式验证：真实调用网关，观察 reasoning/content 增量增长
 * 用法：CA_KEY=sk-... node test-stream-live.mjs
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9348;


const userDir = mkdtempSync(join(tmpdir(), 'ca-live-'));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,1200', 'about:blank'
], { stdio: 'ignore' });

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
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
  }
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
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1200, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(700);

  await sleep(600);
  const r = await send('Runtime.evaluate', {
  expression: `(async () => {
    pendingShot = 'data:image/png;base64,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';
    renderQuoteBar();
    await new Promise(r => setTimeout(r, 80));
    const chip = document.querySelector('#quoteBar .quote-chip.shot');
    return JSON.stringify({ hasChip: !!chip, img: !!(chip && chip.querySelector('.qc-img')), label: chip?.querySelector('.qc-tx')?.textContent, hidden: document.getElementById('quoteBar').classList.contains('hidden') });
  })()`, returnByValue: true, awaitPromise: true }, sessionId);
console.log('SHOT-CHIP:', JSON.stringify(r).slice(0,600));
await sleep(200);
const sh = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
writeFileSync(join(DOCS, 'shot-chip.png'), Buffer.from(sh.data, 'base64'));
console.log('saved shot-chip.png');

} catch (e) {
  console.error('FAIL', e);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
}
