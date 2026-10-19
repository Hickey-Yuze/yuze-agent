import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9915;
const userDir = mkdtempSync(join(tmpdir(), 'ca-stop-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,1200', 'about:blank'], { stdio: 'ignore' });
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
  if (r.exceptionDetails) return { err: r.exceptionDetails.text };
  return r.result.value;
};
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await sleep(1200);
  await ev(`(async () => {
    const payload = { sessionId, messages: [{ role: 'user', content: 'ping' }] };
    await chrome.storage.local.set({ lastSessionId: sessionId,
      sessions: [{ id: sessionId, title: 'ping', at: Date.now(), messages: payload.messages }],
      providers: [{ id: 'slow', name: '慢网关', baseUrl: 'http://10.255.255.1/v1', apiKey: 'test', protocol: 'openai', model: 'x' }],
      activeProvider: 'slow', model: 'x',
      mcp: [{ name: '黑洞', url: 'http://10.255.255.1/mcp' }] });
    agentsend();
    return true;
  })()`.replace("agentsend();", "send();"), sessionId);
  await sleep(1200);
  const before = await ev(`({ running, status: document.getElementById('statusLine').textContent, stop: !!document.getElementById('btnSend')?.classList.contains('stop') })`, sessionId);
  // 点停止
  await ev(`stopRun(); true`, sessionId);
  await sleep(3000);
  const mid = await ev(`chrome.storage.local.get('agentRun').then(o => ({ run: o.agentRun?.running, st: o.agentRun?.status }))`, sessionId);
  await sleep(4500);
  const after = await ev(`({ running, status: document.getElementById('statusLine').textContent, stop: !!document.getElementById('btnSend')?.classList.contains('stop') })`, sessionId);
  console.log('STOP', JSON.stringify({ before, mid, after }));
} finally { try { proc.kill(); } catch {} }
