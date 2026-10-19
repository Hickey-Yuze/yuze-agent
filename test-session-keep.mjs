import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9903;
const userDir = mkdtempSync(join(tmpdir(), 'ca-sess-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=980,1300', 'about:blank'], { stdio: 'ignore' });
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
      activeProvider: 'slow', model: 'x' });
    return chrome.runtime.sendMessage({ type: 'agent:start', payload });
  })()`, sessionId);
  await sleep(900);
  const beforeSwitch = await ev(`chrome.storage.local.get('agentRun').then(o => o.agentRun?.running)`, sessionId);
  const ctxBefore = await ev(`chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).then(l => l.length)`, sessionId);
  const origId = await ev(`sessionId`, sessionId);
  // 切到另一个会话
  await ev(`(async () => {
    const cur = await chrome.storage.local.get('sessions');
    const list = Array.isArray(cur.sessions) ? cur.sessions : [];
    if (!list.some(s => s.id === 'other-sess')) list.push({ id: 'other-sess', title: '另一个会话', at: Date.now(), messages: [] });
    await chrome.storage.local.set({ sessions: list });
    await openSession('other-sess');
  })()`, sessionId);
  await sleep(600);
  const afterSwitch = await ev(`chrome.storage.local.get('agentRun').then(o => o.agentRun?.running)`, sessionId);
  const ctxAfter = await ev(`chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] }).then(l => l.length)`, sessionId);
  const otherUi = await ev(`({ active: document.querySelector('.sess.on')?.textContent?.slice(0, 12) || '', status: document.getElementById('statusLine').textContent })`, sessionId);
  // 切回原会话：应恢复进度
  await ev(`openSession(${JSON.stringify(origId)})`, sessionId);
  await sleep(700);
  const backUi = await ev(`({ user: document.querySelectorAll('#chat .msg-user').length, n: messages.length, sid: String(sessionId).slice(0, 10), run: !!running, status: document.getElementById('statusLine').textContent, stop: !!document.getElementById('btnSend')?.classList.contains('stop') })`, sessionId);
  console.log('SESSKEEP', JSON.stringify({ beforeSwitch, ctxBefore, afterSwitch, ctxAfter, otherUi, backUi }));
} finally { try { proc.kill(); } catch {} }
