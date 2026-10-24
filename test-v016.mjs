// 复现用户截图中的神秘横线：注入生图轮（reasoning 空白 + content=---），dump DOM 找出那条线是哪个节点
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9696;
const userDir = mkdtempSync(join(tmpdir(), 'yz-v016-'));
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
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result);
    }
  });
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  const send = (method, params = {}, sessionId) => {
    const id = ++seq;
    return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
  };
  const ev = async (expression, sessionId) => {
    const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 600) };
    return r.result && r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) {
    const s = await ev(`document.readyState + '|' + (typeof render)`, sessionId);
    if (s === 'complete|function') break;
    await sleep(120);
  }
  await sleep(400);


  const srcTxt = await ev("fetch(chrome.runtime.getURL('sidepanel.js')).then(r=>r.text())", sessionId);
  const cssTxt = await ev("fetch(chrome.runtime.getURL('sidepanel.css')).then(r=>r.text())", sessionId);
  const dbTxt = await ev("fetch(chrome.runtime.getURL('db.js')).then(r=>r.text())", sessionId);

  // A 上下文自动压缩：实现存在且 callLLM 已接线
  out.A_comp = {
    hasFn: /async function compressContextIfNeeded/.test(srcTxt),
    wired: srcTxt.includes('compressContextIfNeeded(wireMessages())'),
    trimArg: srcTxt.includes('trimMessages(wm, ctxComp.pending)'),
    cache: srcTxt.includes('compCache')
  };

  // B hover 预览
  out.B_peek = {
    css: cssTxt.includes('.hover-peek'),
    delegate: srcTxt.includes("classList.contains('tool-img')") && srcTxt.includes("classList.contains('qc-img')")
  };

  // C 记忆模块
  out.C_mem = {
    extract: srcTxt.includes('memExtractAfterTurn'),
    hook: srcTxt.includes('memExtractAfterTurn();'),
    inject: srcTxt.includes('getMemoryPrompt()'),
    dbV2: dbTxt.includes('memories') && dbTxt.includes('DB_VER = 2')
  };

  // F 记忆 CRUD 冒烟（真实 IndexedDB）
  out.F_crud = await ev(`(async () => {
    if (!window.YZDB || !window.YZDB.memPut) return { api: false };
    await window.YZDB.memPut({ id: 't1', text: 'mem-test-1', at: Date.now(), hits: 0 });
    const rows = await window.YZDB.memList();
    const found = rows.some((r) => r.id === 't1' && r.text === 'mem-test-1');
    await window.YZDB.memDel('t1');
    const after = await window.YZDB.memList();
    const db = await new Promise((res) => { const r = indexedDB.open('yz_agent'); r.onsuccess = () => res(r.result); });
    const store = db.objectStoreNames.contains('memories');
    db.close();
    return { api: true, found, deleted: !after.some((r) => r.id === 't1'), store };
  })()`, sessionId);

  // D 孤线阈值 24px：20px 空 tool 壳被清、20px 有字块保留
  out.D_thresh = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    render();
    const ghost = document.createElement('details');
    ghost.className = 'tool';
    ghost.innerHTML = '<summary></summary>';
    ghost.style.height = '20px';
    document.getElementById('chat').appendChild(ghost);
    render();
    const gone = ![...document.getElementById('chat').children].some((n) => n === ghost);
    // 有字的短消息（真实 bot 消息，高约 20px）不被 prune 误删
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    messages.push({ role: 'assistant', content: '短回复' });
    render();
    const kept = document.querySelectorAll('.msg-bot').length === 1;
    return { gone, kept };
  })()`, sessionId);

  // E 存量孤线断言不回归（空 --- 消息不渲染）
  out.E_reg = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    messages.push({ role: 'assistant', content: '\\n---\\n' });
    render();
    return document.querySelectorAll('.msg-bot').length === 0;
  })()`, sessionId);

  out.pass = Object.values(out).every((v) => typeof v !== 'object' || v === null || Object.values(v).every(Boolean));
  console.log(JSON.stringify(out, null, 1));

  } catch (e) { out.fatal = String(e); console.log(JSON.stringify(out)); process.exitCode = 1; }
  finally { try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {} try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {} }
