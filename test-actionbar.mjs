// 消息操作栏回归（加固版）：注入两条消息 → 悬停出操作栏 → 复制 / 收藏 toggle / ⋯菜单 / 分支 / 删除 全链路
// 另验：收藏记录不污染会话抽屉、菜单不泄漏到抽屉、删空后库同步、异常不再被静默吞掉
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const DOCS = join(HERE, 'docs');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9673;
const userDir = mkdtempSync(join(tmpdir(), 'ca-actbar-'));
const proc = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  '--window-size=420,1100', 'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}
const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0; const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
function send(method, params = {}, sessionId) {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
}
// 页面内抛错必须浮出来，否则断言会静默变成 undefined
async function ev(expr, sessionId) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) {
    const d = r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'exception';
    return { err: String(d).slice(0, 300) };
  }
  return r.result?.value;
}
// 库里的收藏记录数（fav 记录带 fav:true，id 以 fav_ 开头）
const favCountExpr = `(async () => {
  if (!window.YZDB) return -1;
  const all = await window.YZDB.list();
  return all.filter((r) => r.fav || String(r.id || '').startsWith('fav_')).length;
})()`;

let result = {};
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 420, height: 1100, deviceScaleFactor: 2, mobile: false }, sessionId);
  await sleep(1200);

  // 注入两条历史消息并渲染；confirm 一律放行（headless 无对话框，默认返回 false 会让分支/删除走空）
  await ev(`
    window.confirm = () => true;
    messages.length = 0;
    messages.push({ role:'user', display:'帮我写个测试脚本', content:'帮我写个测试脚本' });
    messages.push({ role:'assistant', content:'这是测试回复内容。', reasoning:'测试思考' });
    render(); persist(); true
  `, sessionId);
  await sleep(500);

  result.bars = await ev(`(() => {
    const bars = [...document.querySelectorAll('.msg-actions')];
    const cs = bars[0] ? getComputedStyle(bars[0]) : null;
    return {
      count: bars.length,
      btnsPerBar: bars[0] ? bars[0].querySelectorAll('.ma-btn').length : 0,
      hiddenByDefault: !!cs && cs.opacity === '0' && cs.pointerEvents === 'none',
      absolute: !!cs && cs.position === 'absolute'
    };
  })()`, sessionId);

  // 悬停/聚焦出操作栏：transition .15s，必须等过渡结束再读，否则是假阴性
  await ev(`document.querySelector('.msg-actions').querySelector('.ma-btn').focus(); true`, sessionId);
  await sleep(300);
  result.hoverVisible = await ev(`(() => {
    const b = document.querySelector('.msg-actions');
    if (!b) return { visible:false, err:'no bar' };
    const cs = getComputedStyle(b);
    return { visible: cs.opacity === '1' && cs.pointerEvents === 'auto', opacity: cs.opacity, pointerEvents: cs.pointerEvents };
  })()`, sessionId);
  await ev(`document.activeElement && document.activeElement.blur(); true`, sessionId);
  await sleep(250);
  result.hiddenAfterBlur = await ev(`getComputedStyle(document.querySelector('.msg-actions')).opacity === '0'`, sessionId);

  // 复制按钮（headless 无剪贴板读权限，验证 writeText 不抛错 + title 反馈）
  result.copy = await ev(`(async () => {
    const btn = document.querySelectorAll('.msg-actions')[0].querySelectorAll('.ma-btn')[0];
    let err = null;
    try { btn.click(); await new Promise(r=>setTimeout(r,250)); } catch(e){ err = String(e).slice(0,60); }
    return { ok: err === null && btn.title === '已复制', title: btn.title, err };
  })()`, sessionId);

  // 收藏：可反复点击取消（确定性 id），且收藏数一加一减回到原值
  const favBefore = await ev(favCountExpr, sessionId);
  result.star = await ev(`(async () => {
    const btn = document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[1];
    const filled = () => btn.innerHTML.includes('fill="currentColor"');
    const off = { title: btn.title, filled: filled() };
    btn.click(); await new Promise(r=>setTimeout(r,350));
    const on = { title: btn.title, filled: filled() };
    btn.click(); await new Promise(r=>setTimeout(r,350));
    const back = { title: btn.title, filled: filled() };
    btn.click(); await new Promise(r=>setTimeout(r,350));   // 再点一次留着，供抽屉分组断言
    const on2 = { title: btn.title, filled: filled() };
    return { off, on, back, on2 };
  })()`, sessionId);
  const favAfterAdd = await ev(favCountExpr, sessionId);
  result.starToggle = await ev(`(async () => {
    const btn = document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[1];
    btn.click(); await new Promise(r=>setTimeout(r,350));   // 取消
    const titleAfterRemove = btn.title;
    const n1 = (await window.YZDB.list()).filter(r=>r.fav).length;
    btn.click(); await new Promise(r=>setTimeout(r,350));   // 再加回
    const n2 = (await window.YZDB.list()).filter(r=>r.fav).length;
    return { titleAfterRemove, n1, n2 };
  })()`, sessionId);
  result.starCounts = { favBefore, favAfterAdd, favAfterRemove: result.starToggle?.n1, favRefilled: result.starToggle?.n2 };
  result.starCounts.ok = favBefore >= 0 && result.starCounts.favAfterAdd === favBefore + 1
    && result.starCounts.favAfterRemove === favBefore && result.starCounts.favRefilled === favBefore + 1;
  result.star.ok = !!result.star?.off && result.star.off.title === '收藏' && result.star.off.filled === false
    && result.star.on.title === '取消收藏' && result.star.on.filled === true
    && result.star.back.title === '收藏' && result.star.back.filled === false
    && result.star.on2.title === '取消收藏' && result.star.on2.filled === true;

  // ⋯ 菜单出现，含分支/删除
  result.moreMenu = await ev(`(async () => {
    const btn = document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[3];
    btn.click(); await new Promise(r=>setTimeout(r,250));
    const menu = document.querySelector('.msg-more');
    if (!menu) return { open:false };
    const txt = menu.textContent;
    // 再点同一个 ⋯ 应当收起（wasMine 短路），而不是又开一个
    btn.click(); await new Promise(r=>setTimeout(r,250));
    const reopened = !!document.querySelector('.msg-more');
    return { open:true, hasFork: txt.includes('分支'), hasDelete: txt.includes('删除'), hasDanger: !!menu.querySelector('.danger'), toggleCloses: !reopened };
  })()`, sessionId);

  // 同一时刻只允许一个菜单：开 A 再开 B，A 必须被摘掉
  result.menuSingle = await ev(`(async () => {
    const bars = document.querySelectorAll('.msg-actions');
    bars[0].querySelectorAll('.ma-btn')[3].click(); await new Promise(r=>setTimeout(r,250));
    const n1 = document.querySelectorAll('.msg-more').length;
    bars[1].querySelectorAll('.ma-btn')[3].click(); await new Promise(r=>setTimeout(r,250));
    return { afterFirst: n1, afterSecond: document.querySelectorAll('.msg-more').length };
  })()`, sessionId);

  // 点击外部关闭菜单
  result.menuClose = await ev(`(async () => {
    document.body.click(); await new Promise(r=>setTimeout(r,250));
    return !document.querySelector('.msg-more');
  })()`, sessionId);

  // 菜单卫生：closePops() / render() / openDrawer() 都必须摘掉 .msg-more（fixed z-index:9999 会浮在抽屉上）
  result.menuHygiene = await ev(`(async () => {
    const openIt = async () => {
      document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[3].click();
      await new Promise(r=>setTimeout(r,250));
      return !!document.querySelector('.msg-more');
    };
    const out = {};
    out.openedForClosePops = await openIt(); closePops(); await new Promise(r=>setTimeout(r,150));
    out.closedByClosePops = !document.querySelector('.msg-more');
    out.openedForRender = await openIt(); render(); await new Promise(r=>setTimeout(r,200));
    out.closedByRender = !document.querySelector('.msg-more');
    out.openedForDrawer = await openIt(); openDrawer(); await new Promise(r=>setTimeout(r,300));
    out.closedByOpenDrawer = !document.querySelector('.msg-more');
    out.drawerOpen = !!document.querySelector('#sessionList');
    return out;
  })()`, sessionId);

  // 抽屉：收藏记录不得混进「全部对话」，且「⭐ 收藏」分组可见可数
  result.drawer = await ev(`(async () => {
    renderDrawer(document.getElementById('inpSearch').value);
    await new Promise(r=>setTimeout(r,300));
    const list = document.getElementById('sessionList');
    const groups = [...list.querySelectorAll('.sess-group')].map((g) => ({
      head: (g.querySelector('.sess-group-head span') || {}).textContent?.trim() || '',
      rows: g.querySelectorAll('.sess').length
    }));
    const db = await window.YZDB.list();
    const dbFav = db.filter(r=>r.fav).length, dbSess = db.length - dbFav;
    const all = groups.find(g=>g.head==='全部对话');
    const fav = groups.find(g=>g.head.includes('收藏'));
    const blankRow = [...list.querySelectorAll('.sess-t')].some(t => !String(t.textContent||'').trim());
    return {
      groups, dbFav, dbSess,
      allRows: all ? all.rows : -1,
      favRows: fav ? fav.rows : -1,
      noFavLeak: all ? all.rows === dbSess : dbSess === 0,
      favGroupOk: fav ? fav.rows === dbFav : dbFav === 0,
      blankRow
    };
  })()`, sessionId);

  // 搜索：关键词能命中收藏，且不会把收藏当会话渲染进「全部对话」
  result.drawerSearch = await ev(`(async () => {
    renderDrawer('测试回复');
    await new Promise(r=>setTimeout(r,250));
    const list = document.getElementById('sessionList');
    const heads = [...list.querySelectorAll('.sess-group-head span')].map(s=>s.textContent.trim());
    const hit = heads.some(h=>h.includes('收藏'));
    renderDrawer('');
    await new Promise(r=>setTimeout(r,150));
    closeDrawer();
    return { heads, favHitByKeyword: hit };
  })()`, sessionId);

  // 分支：从第 2 条消息分叉出新会话（sessionId 必须真的换掉，菜单必须收起）
  result.fork = await ev(`(async () => {
    const before = messages.length, sidBefore = sessionId;
    const btn = document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[3];
    btn.click(); await new Promise(r=>setTimeout(r,250));
    const menu = document.querySelector('.msg-more');
    const forkBtn = [...menu.querySelectorAll('button')].find(b=>b.textContent.includes('分支'));
    forkBtn.click(); await new Promise(r=>setTimeout(r,600));
    return {
      msgsBefore: before, msgsAfter: messages.length,
      sidBefore, sidAfter: sessionId,
      sessionIdChanged: sessionId !== sidBefore,
      menuClosed: !document.querySelector('.msg-more')
    };
  })()`, sessionId);

  // 删除其中一条：2 → 1，库里这条会话仍在
  result.del = await ev(`(async () => {
    const before = messages.length, sid = sessionId;
    const btn = document.querySelectorAll('.msg-actions')[1].querySelectorAll('.ma-btn')[3];
    btn.click(); await new Promise(r=>setTimeout(r,250));
    const delBtn = [...document.querySelector('.msg-more').querySelectorAll('button')].find(b=>b.textContent.includes('删除'));
    delBtn.click(); await new Promise(r=>setTimeout(r,500));
    const rec = await window.YZDB.get(sid);
    return { before, after: messages.length, dbStillHasSession: !!rec, dbMsgCount: rec ? rec.messages.length : -1, menuClosed: !document.querySelector('.msg-more') };
  })()`, sessionId);

  // 删到空：库里那条会话必须被删掉，并切到新会话（persist() 对空消息早退，靠 YZDB.del 兜）
  result.delToEmpty = await ev(`(async () => {
    const dead = sessionId, before = messages.length;
    const btn = document.querySelectorAll('.msg-actions')[0].querySelectorAll('.ma-btn')[3];
    btn.click(); await new Promise(r=>setTimeout(r,250));
    const delBtn = [...document.querySelector('.msg-more').querySelectorAll('button')].find(b=>b.textContent.includes('删除'));
    delBtn.click(); await new Promise(r=>setTimeout(r,600));
    const rec = await window.YZDB.get(dead);
    const st = await chrome.storage.local.get(['lastSessionId']);
    return {
      dead, before, after: messages.length,
      sessionIdChanged: sessionId !== dead,
      dbRecordGone: !rec,
      lastSessionIdSynced: st.lastSessionId === sessionId,
      status: (document.getElementById('statusLine') || {}).textContent || ''
    };
  })()`, sessionId);

  // 重载后收藏态仍在：boot 走 refreshFavs()，命中 favKey 的消息星标应为实心「取消收藏」
  result.favStateRestore = await ev(`(async () => {
    const all = await window.YZDB.list();
    const f = all.find((r) => r.fav);
    if (!f) return { ok:false, err:'库里没有收藏记录' };
    const savedSid = sessionId, savedMsgs = messages.slice();
    sessionId = f.sessionId;
    messages.length = 0;
    messages.push({ role:'assistant', content:f.text });
    await refreshFavs(); render(); await new Promise(r=>setTimeout(r,300));
    const bar = document.querySelector('.msg-actions');
    const star = bar ? bar.querySelectorAll('.ma-btn')[1] : null;
    const filled = !!star && star.innerHTML.includes('fill="currentColor"');
    const title = star ? star.title : null;
    sessionId = savedSid; messages.length = 0; savedMsgs.forEach((m)=>messages.push(m));
    await refreshFavs(); render(); await new Promise(r=>setTimeout(r,200));
    return { ok: filled && title === '取消收藏', filled, title, favId: f.id, favIdsSize: favIds.size };
  })()`, sessionId);

  const shot = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
  writeFileSync(join(DOCS, 'actionbar.png'), Buffer.from(shot.data, 'base64'));
  console.log(JSON.stringify(result, null, 2));
} finally {
  try { ws.close(); } catch (_) {}
  proc.kill('SIGKILL');
}
