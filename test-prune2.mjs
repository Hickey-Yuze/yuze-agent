
// Live-path regression: updateLive with separator-only content must not render <hr>
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9702;
const userDir = mkdtempSync(join(tmpdir(), 'yz-live2-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() { for (let i = 0; i < 80; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {} await sleep(150); } throw new Error('no'); }
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => { const m = JSON.parse(m2.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 300) }; return r.result && r.result.value; };
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) { const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId); if (s === 'complete|function') break; await sleep(120); }
  await sleep(300);

  // 幽灵清理新判据回归
  const res = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    messages.length = 0;
    messages.push({ role: 'user', content: 'q' });
    // a) 40px 无内容空壳（此前 >30px 豁免，漏网）——模拟带 border+padding 的空 div
    messages.push({ role: 'assistant', content: '', _live: true, _id: 'pa1' });
    render();
    // b) 真实生图结果形态：tool 卡（qc-img，无文字）必须保留；a) 空壳若真渲染出来应是 40px 壳
    const shell = chatEl.querySelector('[data-mid="pa1"]');
    if (shell) { shell.style.border = '1px solid #ddd'; shell.style.padding = '19px 0'; }
    const card = document.createElement('div');
    card.className = 'tool-card';
    card.innerHTML = '<img class="qc-img" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==">';
    chatEl.insertBefore(card, chatEl.querySelector('.feedback'));
    const hBefore = shell ? Math.round(shell.getBoundingClientRect().height) : -1;
    pruneGhostBlocks(chatEl);
    out.hBefore = hBefore;
    out.emptyGone = !chatEl.querySelector('[data-mid="pa1"]');
    out.imgKept = !!chatEl.querySelector('.tool-card .qc-img');
    // c) 流式空消息被删后 updateLive 能补回（reasoning 开始流入）
    const m3 = messages.find((m) => m._id === 'pa1');
    m3.reasoning = 'thinking again...';
    updateLive(m3);
    out.liveRebuild = !!chatEl.querySelector('[data-mid="pa1"]');
    out.thinkText = (chatEl.querySelector('[data-mid="pa1"] .think') || {}).textContent || '';
    out.pass = out.hBefore >= 40 && out.emptyGone && out.imgKept && out.liveRebuild && out.thinkText.includes('thinking again');
    return out;
  })()`, sessionId);
  console.log(JSON.stringify(res, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
