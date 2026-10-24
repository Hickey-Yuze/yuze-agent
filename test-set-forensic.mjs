
// Settings-page DOM forensics: variants around set-group collapse; also thin-line scan in chat
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9704;
const userDir = mkdtempSync(join(tmpdir(), 'yz-forensic-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1000', 'about:blank'], { stdio: 'ignore' });
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
  await sleep(400);
  const out = {};

  out.errors = await ev(`(window.__errs || []).slice(0, 5)`, sessionId);

  // Variant 1: fresh open settings, scroll to bottom, dump set-card children with rects
  out.v1 = await ev(`(async () => {
    $('settings').classList.remove('hidden');
    await new Promise((r) => setTimeout(r, 100));
    const card = document.querySelector('.set-card');
    card.scrollTop = card.scrollHeight;
    await new Promise((r) => setTimeout(r, 100));
    const rows = [...card.children].map((el) => {
      const r = el.getBoundingClientRect();
      return { cls: el.className, id: el.id, tag: el.tagName, h: Math.round(r.height), w: Math.round(r.width), txt: (el.textContent || '').trim().slice(0, 40) };
    });
    const g = document.querySelector('.set-group');
    return { rows, groupH: g ? Math.round(g.getBoundingClientRect().height) : null, groupKids: g ? g.children.length : null };
  })()`, sessionId);

  // Variant 2: open memory panel then collapse, re-dump
  out.v2 = await ev(`(async () => {
    $('btnMemManage').click();
    await new Promise((r) => setTimeout(r, 120));
    $('btnMemManage').click();
    await new Promise((r) => setTimeout(r, 120));
    const g = document.querySelector('.set-group');
    const rows = [...document.querySelector('.set-card').children].map((el) => ({ cls: el.className, id: el.id, h: Math.round(el.getBoundingClientRect().height) }));
    return { groupH: g ? Math.round(g.getBoundingClientRect().height) : null, groupKids: g ? g.children.length : null, rows };
  })()`, sessionId);

  // Variant 3: open skills panel then close it (does settings come back intact?)
  out.v3 = await ev(`(async () => {
    $('btnSkillsManage').click();
    await new Promise((r) => setTimeout(r, 150));
    const settingsHidden = $('settings').classList.contains('hidden');
    // find and click close button of skill panel
    const x = document.querySelector('#skillPanel .set-x, #skillPanel [aria-label], #skillClose');
    let closedVia = null;
    if (x) { x.click(); closedVia = x.id || x.className; } else {
      // fallback: call closeSkillPanel directly
      closeSkillPanel();
    }
    await new Promise((r) => setTimeout(r, 120));
    const visibleAfter = !$('settings').classList.contains('hidden');
    const g = document.querySelector('.set-group');
    return { settingsHiddenWhenOpen: settingsHidden, closedVia, settingsVisibleAfter: visibleAfter, groupHAfter: g ? Math.round(g.getBoundingClientRect().height) : null };
  })()`, sessionId);

  // Variant 4: open MCP panel then close
  out.v4 = await ev(`(async () => {
    $('btnMcpManage').click();
    await new Promise((r) => setTimeout(r, 150));
    const wasHidden = $('settings').classList.contains('hidden');
    closeMcpPanel();
    await new Promise((r) => setTimeout(r, 120));
    const visibleAfter = !$('settings').classList.contains('hidden');
    const g = document.querySelector('.set-group');
    return { wasHidden, visibleAfter, groupHAfter: g ? Math.round(g.getBoundingClientRect().height) : null };
  })()`, sessionId);

  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
