import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9911;
const userDir = mkdtempSync(join(tmpdir(), 'ca-restore-'));
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
  // 页面 1：写入 storage（会话里只有两条用户消息，agentRun 里是完整的）
  const { targetId: t1 } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const s1 = (await send('Target.attachToTarget', { targetId: t1, flatten: true })).sessionId;
  await send('Runtime.enable', {}, s1);
  await sleep(1000);
  const full = [
    { role: 'user', display: '做一个订单关键词面板' },
    { role: 'assistant', content: '好的，先生成脚本。', tool_calls: [{ id: 't1', type: 'function', function: { name: 'save_js', arguments: JSON.stringify({ filename: 'panel.js', code: 'var a=1;' }) } }] },
    { role: 'tool', tool_call_id: 't1', content: '已生成并下载 panel.js（9 字符）' },
    { role: 'assistant', content: '已生成 panel.js，安装后刷新页面。' },
    { role: 'user', display: '还是没有生效' },
    { role: 'assistant', content: '我看下当前页面的实际状态。' }
  ];
  await ev(`(async () => {
    await chrome.storage.local.set({
      lastSessionId: 'sess-A',
      sessions: [{ id: 'sess-A', title: '订单关键词面板', at: Date.now(), messages: [
        { role: 'user', display: '做一个订单关键词面板' }, { role: 'user', display: '还是没有生效' }
      ] }],
      agentRun: { sessionId: 'sess-A', messages: ${JSON.stringify(full)}, running: false, status: '', step: 2, at: Date.now() },
      taskSnap: { sessionId: 'sess-A', messages: [{ role: 'user', display: '做一个订单关键词面板' }, { role: 'user', display: '还是没有生效' }], step: 1, running: false, interrupted: true, at: Date.now() - 5000 }
    });
    return true;
  })()`, s1);
  await sleep(300);
  // 页面 2：模拟关闭后重新打开侧边栏
  const { targetId: t2 } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const s2 = (await send('Target.attachToTarget', { targetId: t2, flatten: true })).sessionId;
  await send('Runtime.enable', {}, s2);
  await sleep(1400);
  const ui = await ev(`({
    user: document.querySelectorAll('#chat .msg-user').length,
    bot: document.querySelectorAll('#chat .msg-bot').length,
    tools: document.querySelectorAll('#chat .tool').length,
    resumeBar: !!document.querySelector('#chat .resume-bar'),
    status: document.getElementById('statusLine').textContent
  })`, s2);
  console.log('RESTORE', JSON.stringify(ui));
} finally { try { proc.kill(); } catch {} }
