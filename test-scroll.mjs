import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9907;
const userDir = mkdtempSync(join(tmpdir(), 'ca-scroll-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,900', 'about:blank'], { stdio: 'ignore' });
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
    const msgs = [];
    for (let i = 0; i < 40; i++) {
      msgs.push({ role: 'user', display: '第 ' + i + ' 条问题' });
      msgs.push({ role: 'assistant', content: '这是第 ' + i + ' 条很长很长很长的回答，用来把对话撑高，验证滚动位置。'.repeat(6) });
    }
    messages = msgs;
    render(true);
    const atBottom = chatEl.scrollTop + chatEl.clientHeight >= chatEl.scrollHeight - 4;
    // 用户向上翻到中间
    chatEl.scrollTop = Math.floor((chatEl.scrollHeight - chatEl.clientHeight) / 2);
    chatEl.dispatchEvent(new Event('scroll'));
    const before = chatEl.scrollTop;
    // 模拟任务跑动时的全量重渲染
    render();
    const after1 = chatEl.scrollTop;
    // 再渲染一次（模拟多轮工具）
    render();
    const after2 = chatEl.scrollTop;
    // 用户回到底部
    chatEl.scrollTop = chatEl.scrollHeight;
    chatEl.dispatchEvent(new Event('scroll'));
    render();
    const atBottomAfter = chatEl.scrollTop + chatEl.clientHeight >= chatEl.scrollHeight - 4;
    return { atBottom, before, after1, after2, drift: Math.abs(after2 - before), atBottomAfter };
  })()`, sessionId);
  console.log('SCROLL', JSON.stringify(r));
} finally { try { proc.kill(); } catch {} }
