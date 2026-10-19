import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9917;
const userDir = mkdtempSync(join(tmpdir(), 'ca-stream-'));
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
  if (r.exceptionDetails) return { err: r.exceptionDetails.text };
  return r.result.value;
};
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await sleep(1200);
  const r = await ev(`(() => {
    messages = [
      { role: 'user', display: '测试流式' },
      { role: 'assistant', content: '', reasoning: '第一步：', _live: true }
    ];
    render();
    const liveMsg = messages[1];
    const thinkEl = () => document.querySelector('#chat .think-body');
    const mdEl = () => document.querySelector('#chat .bot-md');
    const sizes = [];
    let ref = null; let changes = 0;
    for (let i = 0; i < 12; i++) {
      liveMsg.reasoning += '继续思考第' + i + '步，';
      liveMsg.content += '输出第' + i + '段 ';
      updateLive(liveMsg);
      const cur = thinkEl();
      if (ref && cur !== ref) changes++;
      ref = cur;
      sizes.push(thinkEl()?.textContent.length || 0);
    }
    return { sameNode: changes === 0, thinks: document.querySelectorAll('#chat .think').length, bots: document.querySelectorAll('#chat .msg-bot').length, grew: sizes[11] > sizes[0], first: sizes[0], last: sizes[11] };
  })()`, sessionId);
  console.log('STREAM', JSON.stringify(r));
} finally { try { proc.kill(); } catch {} }
