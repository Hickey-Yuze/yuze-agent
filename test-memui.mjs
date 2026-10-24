// 冒烟：点开设置→点记忆行→面板展开无布局错乱（可见、宽度合理、输入框可见）
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9697;
const userDir = mkdtempSync(join(tmpdir(), 'yz-memui-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}
const out = {};
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (m2) => {
    const m = JSON.parse(m2.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((res, rej) => { pending.set(id, { resolve: res, reject: rej }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId); if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || '').slice(0, 400) }; return r.result && r.result.value; };
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) { const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId); if (s === 'complete|function') break; await sleep(120); }
  await sleep(300);

  out.ui = await ev(`(async () => {
    document.getElementById('btnSettings').click();
    await new Promise(r => setTimeout(r, 100));
    const card = document.querySelector('.set-card');
    const sc0 = card.getBoundingClientRect();
    const h0 = sc0.height;
    document.getElementById('btnMemManage').click();
    await new Promise(r => setTimeout(r, 200));
    const p = document.getElementById('memPanel');
    const r = p.getBoundingClientRect();
    const inp = document.getElementById('inpMem').getBoundingClientRect();
    const btn = document.getElementById('btnMemAdd').getBoundingClientRect();
    const cardR = card.getBoundingClientRect();
    // 展开后卡片应正常长高且面板整体在卡片内
    return {
      shown: !p.classList.contains('hidden'),
      visible: r.height > 40,
      inside: r.left >= cardR.left - 1 && r.right <= cardR.right + 1,
      inpVisible: inp.width > 100 && inp.height > 20,
      btnVisible: btn.width > 30,
      clearBtn: !!document.getElementById('btnMemClear'),
      // 关键：展开记忆面板后，技炉 / MCP 行仍在 DOM 且位于面板上方（可返回）
      skillsAbove: (() => { const sk = document.getElementById('btnSkillsManage').getBoundingClientRect(); return sk.bottom <= r.top + 2; })(),
      mcpAbove: (() => { const mc = document.getElementById('btnMcpManage').getBoundingClientRect(); return mc.bottom <= r.top + 2; })(),
      cardGrew: card.getBoundingClientRect().height >= h0,
      hint: (p.querySelector('.set-hint') || {}).textContent || ''
    };
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
