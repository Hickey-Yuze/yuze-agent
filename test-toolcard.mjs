import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9905;
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
    { role: 'user', display: '给订单页做一个关键词匹配面板' },
    { role: 'assistant', content: '', tool_calls: [{ id: 't1', type: 'function', function: { name: 'save_js', arguments: JSON.stringify({ filename: 'cleanup.js', code: 'const x = 1;'.repeat(87) }) } }] },
    { role: 'tool', tool_call_id: 't1', content: '已生成并下载 cleanup.js（869 字符）' },
    { role: 'assistant', content: '', tool_calls: [{ id: 't2', type: 'function', function: { name: 'run_skill_script', arguments: JSON.stringify({ name: 'Yuze-订单号关键词检索' }) } }] },
    { role: 'tool', tool_call_id: 't2', content: '{"ok":true}' },
    { role: 'assistant', content: '', tool_calls: [{ id: 't3', type: 'function', function: { name: 'mcp_gen_pdf', arguments: JSON.stringify({ title: '月报' }) } }] },
    { role: 'tool', tool_call_id: 't3', content: 'FILE_JSON:{"name":"月报.pdf","size":182400,"mime":"application/pdf","b64":"AA"}' },
    { role: 'assistant', content: '写好了：`cleanup.js` 859 B，命令已执行。' }
  ];
  await ev(`(() => { messages = ${JSON.stringify(msgs)}; render(); return true; })()`, sessionId);
  await sleep(500);
  const info = await ev(`[...document.querySelectorAll('#chat .tool')].map(d => d.querySelector('.tlabel')?.textContent + ' | ' + (d.querySelector('.tdetail')?.textContent||'') + ' | ' + (d.querySelector('.tsize')?.textContent||''))`, sessionId);
  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  mkdirSync(join(HERE, 'docs'), { recursive: true });
  writeFileSync(join(HERE, 'docs/panel-toolcard.png'), Buffer.from(shot.data, 'base64'));
  console.log('TOOLCARD', JSON.stringify(info));
} finally { try { proc.kill(); } catch {} }
