// 操作栏 hover 接桥回归：鼠标从消息移向操作栏按钮、穿过 3px 空隙时不再掉 hover
// 真实模拟：hover 消息 → 鼠标逐像素移动到 ::before 接桥与按钮上 → 断言栏保持可见且按钮可点
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9678;
const userDir = mkdtempSync(join(tmpdir(), 'yz-bridge-'));
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
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 500) };
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
  out.A_ready = await ev(`({ ready: document.readyState, ver: (chrome.runtime.getManifest() || {}).version })`, sessionId);

  // 注入两条消息，让普通（非最后一条）操作栏出现在消息下方
  out.B_setup = await ev(`(() => {
    messages.push({ role: 'user', content: '回归消息一' });
    messages.push({ role: 'assistant', content: '回归消息二：这条下面有操作栏' });
    render();
    const bots = [...document.querySelectorAll('.msg-bot')];
    const bars = [...document.querySelectorAll('.msg-actions')];
    return { bots: bots.length, bars: bars.length };
  })()`, sessionId);

  // 核心：真实鼠标轨迹。用 CDP Input.dispatchMouseEvent 走像素级移动：
  // hover 消息底缘 → 穿过 3px 空隙（::before 接桥区）→ 停在复制按钮上 → 点击
  out.C_cross = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const bar = document.querySelector('.msg-bot .msg-actions');
    if (!bar) return { err: 'no bar' };
    const msg = bar.closest('.msg-bot');
    const btn = bar.querySelector('.ma-btn');            // 第一个 = 复制
    const mr = msg.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const btnR = btn.getBoundingClientRect();
    const gapY = (mr.bottom + br.top) / 2;               // 空隙正中（::before 接桥覆盖处）
    const btnX = (btnR.left + btnR.right) / 2;
    const R = { gapPx: +(br.top - mr.bottom).toFixed(1), bridge: !!bar.getBoundingClientRect().width };

    // CDP 坐标换算：页面视口 = chat 内滚动坐标 + 视口偏移
    // getBoundingClientRect 返回的就是视口坐标，CDP Input 直接可用
    return Object.assign(R, {
      steps: [
        { type: 'mouseMoved', x: mr.left + mr.width / 2, y: mr.bottom - 4 },   // 消息内
        { type: 'mouseMoved', x: btnX, y: gapY },                              // 穿过空隙（关键步）
        { type: 'mouseMoved', x: btnX, y: (btnR.top + btnR.bottom) / 2 },      // 停在复制按钮上
        { type: 'mousePressed', x: btnX, y: (btnR.top + btnR.bottom) / 2, button: 'left', clickCount: 1 },
        { type: 'mouseReleased', x: btnX, y: (btnR.top + btnR.bottom) / 2, button: 'left', clickCount: 1 }
      ],
      barVisibleNow: getComputedStyle(bar).opacity });
  })()` }, sessionId);

  // 用真实 CDP 输入事件重放轨迹（evaluate 包装层解包 .result.value）
  if (out.C_cross && out.C_cross.result && out.C_cross.result.value) out.C_cross = out.C_cross.result.value;
  if (out.C_cross && out.C_cross.err) throw new Error('C_cross 页内异常: ' + out.C_cross.err);
  const steps = (out.C_cross && out.C_cross.steps) || [];
  out.C_cross = out.C_cross || {};
  for (const st of steps) {
    const p = {
      type: st.type, x: Math.round(st.x), y: Math.round(st.y),
      button: st.button || 'none', buttons: st.type === 'mousePressed' ? 1 : 0, clickCount: st.clickCount || 0, pointerType: 'mouse'
    };
    const r2 = await send('Input.dispatchMouseEvent', p, sessionId);
    if (st.type === 'mouseMoved' && steps.indexOf(st) === 1) {
      // 穿过空隙后鼠标在半路停 250ms（真实场景：用户瞄准按钮的间隙）——栏必须保持完全可见
      await sleep(250);
      const snap = await ev(`(() => { const b = document.querySelector('.msg-bot .msg-actions'); const cs = getComputedStyle(b); return { opacity: cs.opacity, pe: cs.pointerEvents, hasBefore: getComputedStyle(b, '::before').content !== 'none' }; })()`, sessionId);
      out.C_cross.midGap = snap;
    }
  }
  await sleep(120);
  out.D_after = await ev(`(() => {
    const bar = document.querySelector('.msg-bot .msg-actions');
    const cs = getComputedStyle(bar);
    // 点击复制后：title 应变「已复制」（剪贴板写入成功的信号）
    const btn = bar.querySelector('.ma-btn');
    return { opacity: cs.opacity, pe: cs.pointerEvents, title: btn.title };
  })()`, sessionId);

  // 反证：没有接桥时（临时隐藏 ::before），同样轨迹穿过空隙会掉 hover
  out.E_control = await send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const bar = document.querySelector('.msg-bot .msg-actions');
    const style = document.createElement('style');
    // 同时禁掉 .msg-actions:hover —— 模拟 v0.7.8 之前（那时只有消息 hover 能点亮栏），
    // 否则停在栏 padding 内会被新规则点亮，反证就失真了
    style.textContent = '.msg-actions::before { display: none !important; } .msg-actions:hover { opacity: 0 !important; pointer-events: none !important; } .msg-actions:focus-within { opacity: 0 !important; pointer-events: none !important; }';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    document.head.appendChild(style);
    const msg = bar.closest('.msg-bot');
    const btn = bar.querySelector('.ma-btn');
    const mr = msg.getBoundingClientRect();
    const br = bar.getBoundingClientRect();
    const btnR = btn.getBoundingClientRect();
    const gapY = (mr.bottom + br.top) / 2;
    const btnX = (btnR.left + btnR.right) / 2;
    // 关键：无接桥时停在紧贴栏上缘之下 0.5px 处（一定脱离了消息 hover 区、又还没进按钮）
    const justAboveBar = Math.round(br.top + 0.5);
    window.__bridgeSteps = [
      { type: 'mouseMoved', x: Math.round(mr.left + mr.width / 2), y: Math.round(mr.bottom - 4) },
      { type: 'mouseMoved', x: Math.round(btnX), y: justAboveBar },
      { type: 'mouseMoved', x: Math.round(btnX), y: Math.round((btnR.top + btnR.bottom) / 2) }
    ];
    return { disabled: true };
  })()` }, sessionId);
  // 重放无接桥轨迹
  const st2 = await ev(`window.__bridgeSteps`, sessionId);
  for (const st of (st2 || [])) {
    await send('Input.dispatchMouseEvent', Object.assign({}, st, { button: 'none', buttons: 0, clickCount: 0, pointerType: 'mouse' }), sessionId);
    if (st === st2[1]) { await sleep(250); out.E_mid = await ev(`(() => { const b = document.querySelector('.msg-bot .msg-actions'); const cs = getComputedStyle(b); return { opacity: cs.opacity, pe: cs.pointerEvents }; })()`, sessionId); }
  }
  await sleep(120);
  out.E_end = await ev(`(() => { const cs = getComputedStyle(document.querySelector('.msg-bot .msg-actions')); return { opacity: cs.opacity, pe: cs.pointerEvents }; })()`, sessionId);

  // ---------- 断言 ----------
  const c = [];
  const push = (n, ok, d) => c.push({ n, ok: !!ok, d });
  const cc = out.C_cross || {};
  // 版本号只要求 >= 0.7.9（本修复引入），避免每次升版都要改测试
  push('ready', out.A_ready && (() => {
    const parts = String(out.A_ready.ver || '0').split('.').map(Number); // 0.7.9 → [0,7,9]
    const [p0, p1, p2] = parts;
    return p0 > 0 || p1 > 7 || (p1 === 7 && p2 >= 9);
  })(), out.A_ready);
  push('消息与操作栏都渲染', out.B_setup && out.B_setup.bars >= 2, out.B_setup);
  push('空隙确实存在(约3px)', cc.gapPx !== undefined && cc.gapPx > 0 && cc.gapPx <= 6, cc.gapPx);
  push('接桥::before存在', cc.midGap && cc.midGap.hasBefore === true, cc.midGap);
  push('穿过空隙后栏仍可见(opacity=1)', cc.midGap && cc.midGap.opacity === '1', cc.midGap);
  push('穿过空隙后可交互(pointer-events=auto)', cc.midGap && cc.midGap.pe === 'auto', cc.midGap);
  push('停在按钮上仍可见', out.D_after && out.D_after.opacity === '1', out.D_after);
  push('复制按钮点到了(标题变已复制)', out.D_after && out.D_after.title === '已复制', out.D_after && out.D_after.title);
  // 反证组：无接桥时同样轨迹应掉 hover（证明修复的正是这一环）
  push('反证.无接桥+禁栏自hover时中途掉可见性', out.E_mid && (out.E_mid.opacity !== '1' || out.E_mid.pe !== 'auto'), out.E_mid);
  push('反证.无接桥+禁栏自hover最终不可见', out.E_end && (out.E_end.opacity !== '1' || out.E_end.pe !== 'auto'), out.E_end);
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
