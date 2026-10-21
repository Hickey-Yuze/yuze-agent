// v0.7.8 回归：① 输入法 Enter 不误发 ② 抽屉批量删除真删掉（含旧写法反证）
// 真机：headless 加载扩展 → sidepanel.html → 页面内真实派发事件 / 真实读写 IndexedDB
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9677;
const userDir = mkdtempSync(join(tmpdir(), 'yz-ime-del-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const out = {};
let ws;
try {
  const ver = await waitPort();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
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
    const s = await ev(`document.readyState + '|' + (typeof drawerBatchDelete) + '|' + (!!(window.YZDB && window.YZDB.del))`, sessionId);
    if (s === 'complete|function|true') break;
    await sleep(120);
  }
  await sleep(400);
  out.A_ready = await ev(`({ ready: document.readyState, del: typeof drawerBatchDelete, yzdb: !!(window.YZDB && window.YZDB.del), ver: (chrome.runtime.getManifest() || {}).version })`, sessionId);

  // ---------- ① 输入法 Enter 不误发 ----------
  // 用 stub 顶掉 runAgent，避免真发网络请求；send() 会先清空输入框再调 runAgent，故两者都能观测
  out.B_ime = await ev(`(() => {
    const inp = document.getElementById('inpMsg');
    const R = { stubbed: typeof window.runAgent === 'function' };
    const orig = window.runAgent;
    window.__sent = 0;
    if (R.stubbed) window.runAgent = async function () { window.__sent++; };
    const fire = (init) => {
      const e = new KeyboardEvent('keydown', Object.assign({ bubbles: true, cancelable: true }, init));
      inp.dispatchEvent(e);
    };
    const fireKeyCode = (kc) => {
      const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
      Object.defineProperty(e, 'keyCode', { get: () => kc });
      inp.dispatchEvent(e);
    };
    // 1) 组合态 Enter（isComposing=true，中文选词上屏）→ 不发送、内容保留
    window.__sent = 0; inp.value = 'zhongwen';
    fire({ key: 'Enter', isComposing: true });
    R.composing = { sent: window.__sent, value: inp.value };
    // 2) keyCode 229 兜底（部分环境不置 isComposing）→ 不发送
    window.__sent = 0; inp.value = 'pinyin';
    fireKeyCode(229);
    R.key229 = { sent: window.__sent, value: inp.value };
    // 3) 普通 Enter → 必须仍发送，且输入框清空（守卫不能误伤）
    window.__sent = 0; inp.value = 'real send';
    fire({ key: 'Enter', isComposing: false });
    R.normal = { sent: window.__sent, value: inp.value };
    // 4) Shift+Enter → 仍不发送（换行，原行为保留）
    window.__sent = 0; inp.value = 'line break';
    fire({ key: 'Enter', shiftKey: true });
    R.shift = { sent: window.__sent, value: inp.value };
    if (R.stubbed) window.runAgent = orig;
    inp.value = '';
    return R;
  })()`, sessionId);

  // ---------- ② 批量删除：旧写法反证 + 新写法验证 ----------
  out.C_delete = await ev(`(async () => {
    const R = {};
    const mk = (id, title) => ({ id, title, at: Date.now(), messages: [{ role: 'user', content: title }], host: 'test.local' });
    for (const i of [1, 2, 3, 4]) await window.YZDB.put(mk('tt' + i, '回归会话' + i));
    R.before = (await window.YZDB.list()).length;

    // 反证：旧写法 saveSessions(list.filter(...)) 底层是 putMany（只写不删）
    // → 被过滤掉的 tt1 应该【还在库里】，证明旧写法确实删不掉
    {
      const list = await loadSessions();
      await saveSessions(list.filter((s) => s.id !== 'tt1'));
      const ids = (await window.YZDB.list()).map((s) => s.id);
      R.oldWayStillHasTt1 = ids.includes('tt1');
    }

    // 新写法：drawerBatchDelete 逐条 YZDB.del
    drawerSel.clear();
    drawerSel.add('tt1'); drawerSel.add('tt2');
    await drawerBatchDelete();
    const ids = (await window.YZDB.list()).map((s) => s.id);
    R.after = ids.length;
    R.tt1Gone = !ids.includes('tt1');
    R.tt2Gone = !ids.includes('tt2');
    R.tt3Kept = ids.includes('tt3');
    R.tt4Kept = ids.includes('tt4');
    R.selCleared = drawerSel.size === 0;
    // 抽屉 UI 也应同步：renderDrawer 重读库后不该再出现被删会话
    const txt = document.body.textContent || '';
    R.uiGone = !txt.includes('回归会话1') && !txt.includes('回归会话2');
    R.uiKept = txt.includes('回归会话3');
    return R;
  })()`, sessionId);

  // ---------- ③ 重开页面仍在（删除是持久化的，不是内存过滤）----------
  await send('Page.reload', {}, sessionId);
  await sleep(1500);
  for (let i = 0; i < 100; i++) {
    const s = await ev(`typeof drawerBatchDelete + '|' + document.readyState`, sessionId);
    if (s === 'function|complete') break;
    await sleep(120);
  }
  out.D_afterReload = await ev(`(async () => {
    const ids = (await window.YZDB.list()).map((s) => s.id);
    return { ids, tt1Gone: !ids.includes('tt1'), tt2Gone: !ids.includes('tt2'), tt3Kept: ids.includes('tt3'), tt4Kept: ids.includes('tt4') };
  })()`, sessionId);

  // ---------- 断言 ----------
  const c = [];
  const push = (n, ok, d) => c.push({ n, ok: !!ok, d });
  const b = out.B_ime || {}, d = out.C_delete || {}, r = out.D_afterReload || {};
  push('ready', out.A_ready && out.A_ready.del === 'function' && out.A_ready.yzdb === true, out.A_ready);
  push('ime.stub可用', b.stubbed === true, b.stubbed);
  push('ime.组合态不发送', b.composing && b.composing.sent === 0, b.composing);
  push('ime.组合态内容保留', b.composing && b.composing.value === 'zhongwen', b.composing);
  push('ime.keyCode229不发送', b.key229 && b.key229.sent === 0, b.key229);
  push('ime.keyCode229内容保留', b.key229 && b.key229.value === 'pinyin', b.key229);
  push('ime.普通Enter仍发送', b.normal && b.normal.sent === 1, b.normal);
  push('ime.普通Enter清空输入', b.normal && b.normal.value === '', b.normal);
  push('ime.ShiftEnter不发送', b.shift && b.shift.sent === 0, b.shift);
  push('del.旧写法反证(tt1仍在)', d.oldWayStillHasTt1 === true, d.oldWayStillHasTt1);
  push('del.tt1真删', d.tt1Gone === true, d);
  push('del.tt2真删', d.tt2Gone === true, d);
  push('del.tt3未误删', d.tt3Kept === true, d.tt3Kept);
  push('del.tt4未误删', d.tt4Kept === true, d.tt4Kept);
  push('del.选中态清空', d.selCleared === true, d.selCleared);
  push('del.抽屉UI同步', d.uiGone === true, { uiGone: d.uiGone, uiKept: d.uiKept });
  push('del.抽屉保留未删项', d.uiKept === true, d.uiKept);
  push('del.重开页面仍已删', r.tt1Gone === true && r.tt2Gone === true, r);
  push('del.重开保留未删项', r.tt3Kept === true && r.tt4Kept === true, r);
  out.checks = c;
  out.pass = c.every((x) => x.ok);
  out.failed = c.filter((x) => !x.ok).map((x) => x.n);
} catch (e) {
  out.error = String(e && e.message || e).slice(0, 500);
  out.pass = false;
} finally {
  console.log(JSON.stringify(out, null, 2));
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  await sleep(200);
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
  process.exit(out.pass ? 0 : 1);
}
