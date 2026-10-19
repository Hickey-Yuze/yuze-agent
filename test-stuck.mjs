import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9923;
const userDir = mkdtempSync(join(tmpdir(), 'ca-stuck-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,1000', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no chrome'); }
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); }
const ev = async (expression, sessionId) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (r.exceptionDetails) return { err: r.exceptionDetails.text, desc: r.exceptionDetails.exception?.description };
  return r.result.value;
};
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await sleep(1500);

  // PART 1：僵尸 agentRun（running=true 但 at 是 2 分钟前）应在 ~10 秒内自愈
  await ev(`(async () => {
    const sid = sessionId;
    running = true; backgroundMode = true;
    setSendMode('stop'); setDot('busy'); setStatus('准备中');
    await chrome.storage.local.set({ agentRun: { sessionId: sid, messages: [{ role: 'user', content: 'x' }], running: true, step: 1, at: Date.now() - 120000 } });
    return { ok: true };
  })()`, sessionId);
  await sleep(11000);
  const p1 = await ev(`({ running, status: (document.getElementById('statusLine')||{}).textContent||'', mode: document.querySelector('#btnSend') ? document.querySelector('#btnSend').dataset.mode || '' : '' })`, sessionId);
  console.log('PART1_ZOMBIE', JSON.stringify(p1));

  // PART 2：后台回执 busy → 应提示「上一个任务还在跑」而不是停在准备中
  const p2 = await ev(`(async () => {
    running = false; backgroundMode = false;
    const orig = chrome.runtime.sendMessage;
    chrome.runtime.sendMessage = async () => ({ ok: false, busy: true, error: '上一个任务还在运行' });
    await startInBackground('测试消息', null, { display: '' });
    chrome.runtime.sendMessage = orig;
    return { running, status: (document.getElementById('statusLine')||{}).textContent||'' };
  })()`, sessionId);
  console.log('PART2_BUSY', JSON.stringify(p2));
} finally { try { proc.kill(); } catch {} }
