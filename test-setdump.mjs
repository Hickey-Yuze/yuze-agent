
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

  // 设置页 DOM 结构全量验证（复刻用户操作：打开设置 → 点记忆展开 → dump 顺序与滚动）
  const res = await ev(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    $('settings').classList.remove('hidden');
    await wait(50);
    const seq = [...document.querySelectorAll('#settings section, #settings .set-card > *')].map((n) => {
      if (n.classList.contains('set-group')) {
        return 'set-group[' + [...n.querySelectorAll(':scope > *')].map((c) => c.id || c.className).join('|') + ']';
      }
      return n.id || (n.querySelector ? (n.className + (n.textContent || '').slice(0, 8)) : n.className);
    });
    out.seq = seq;
    // 点记忆展开后按钮组是否仍可见
    $('btnMemManage').click(); await wait(80);
    const sc = document.querySelector('.set-card');
    sc.scrollTop = 0;
    const vis = (el) => { const r = el.getBoundingClientRect(); const c = sc.getBoundingClientRect(); return r.height > 0 && r.top < c.bottom && r.bottom > c.top; };
    out.afterOpen = {
      memShown: !$('memPanel').classList.contains('hidden'),
      skillsVisible: vis($('btnSkillsManage')),
      mcpVisible: vis($('btnMcpManage')),
      memVisible: vis($('btnMemManage')),
      scrollable: sc.scrollHeight > sc.clientHeight
    };
    // 能否滚到保存按钮（用户说的「无法滚动下来」）
    sc.scrollTop = sc.scrollHeight;
    out.bottom = { saveVisible: vis($('btnSave')), scrollTop: sc.scrollTop, scrollH: sc.scrollHeight, clientH: sc.clientHeight };
    $('btnMemManage').click();
    return out;
  })()`, sessionId);
  console.log(JSON.stringify(res, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
