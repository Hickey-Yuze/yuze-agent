import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9909;
const userDir = mkdtempSync(join(tmpdir(), 'ca-tool-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,1100', 'about:blank'], { stdio: 'ignore' });
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
  await send('Page.enable', {}, sessionId);
  await sleep(1200);
  const msgs = [
    { role: 'user', display: '做一个订单关键词面板' },
    { role: 'assistant', content: '', tool_calls: [{ id: 't1', type: 'function', function: { name: 'save_js', arguments: JSON.stringify({ filename: 'panel.js', code: 'var a=1;'.repeat(60) }) } }] },
    { role: 'tool', tool_call_id: 't1', content: '已生成并下载 panel.js（540 字符）' },
    { role: 'assistant', content: '正在执行第二步…', reasoning: '需要先确认页面结构', _live: true }
  ];
  const pushed = await ev(`(async () => {
    sessionId = 'live-test';
    messages = [];
    const m = ${JSON.stringify(msgs)};
    messages = m;
    render();
    // 模拟后台一次完整快照回传（running 中，含工具卡片 + 思考过程）
    await chrome.storage.local.set({ agentRun: { sessionId: 'live-test', messages: m, running: true, status: '执行 save_js', step: 1 } });
    await new Promise(r => setTimeout(r, 400));
    return {
      tools: document.querySelectorAll('#chat .tool').length,
      think: document.querySelectorAll('#chat .think').length,
      thinkOpen: !document.querySelector('#chat .think')?.classList.contains('collapsed'),
      toolLabel: document.querySelector('#chat .tool .tlabel')?.textContent || '',
      status: document.getElementById('statusLine').textContent
    };
  })()`, sessionId);
  console.log('LIVETOOLS', JSON.stringify(pushed));
} finally { try { proc.kill(); } catch {} }
