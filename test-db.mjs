// IndexedDB 会话库回归：2MB 级消息能存取、页面重开仍在（chrome.storage 会超 10MB 单条上限）
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9971;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const userDir = mkdtempSync(join(tmpdir(), 'yz-db-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('no chrome');
}

const out = {};
try {
  const ver = await waitPort();
  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); } });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); }); };
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: r.exceptionDetails.text };
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await sleep(1600);

  out.hasApi = await ev('!!(window.YZDB && window.YZDB.put && window.YZDB.list)', sessionId);

  // 2MB 消息：chrome.storage 单条 10MB 是整表合计，这里验证 IDB 能存
  out.put = await ev(`(() => {
    const big = 'x'.repeat(2 * 1024 * 1024);
    return window.YZDB.put({ id: 'big1', title: '大消息', at: Date.now(), messages: [{ role: 'assistant', content: big }] })
      .then(() => 'ok').catch((e) => 'err:' + (e && e.message));
  })()`, sessionId);

  out.read = await ev(`window.YZDB.list().then((rows) => {
    const r = rows.find((x) => x.id === 'big1');
    return { n: rows.length, len: r && r.messages[0].content.length, title: r && r.title };
  })`, sessionId);

  // 重开页面验证持久化
  await send('Page.reload', {}, sessionId);
  await sleep(1800);
  out.afterReload = await ev(`window.YZDB.list().then((rows) => {
    const r = rows.find((x) => x.id === 'big1');
    return { n: rows.length, len: r && r.messages[0].content.length };
  })`, sessionId);

  out.ok = out.hasApi === true && out.put === 'ok'
    && out.read && out.read.len === 2 * 1024 * 1024
    && out.afterReload && out.afterReload.len === 2 * 1024 * 1024;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('DB ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
