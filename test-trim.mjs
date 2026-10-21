// trimMessages 回归：长对话被截断时，首条用户任务描述必须还在，且结构不得让网关 400
// 复刻 m00370 现场：任务文本 + 十几轮工具调用（工具结果含大 base64）把体量顶过 360000
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9675;
const userDir = mkdtempSync(join(tmpdir(), 'ca-trim-'));
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
async function ev(expr, sessionId) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) {
    const d = r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'exception';
    return { err: String(d).slice(0, 400) };
  }
  return r.result?.value;
}

// 在页面内构造消息数组并跑断言，返回纯数据（避免把 48 万字回传到 Node）
const CASE = (task, rounds, chunk, tailUser) => `(() => {
  const big = (n) => 'B'.repeat(n);
  const msgs = [{ role: 'user', content: ${JSON.stringify(task)} }];
  for (let i = 0; i < ${rounds}; i++) {
    msgs.push({ role: 'assistant', content: '', tool_calls: [{ id: 'c' + i, type: 'function', function: { name: 'browser_snapshot', arguments: '{}' } }] });
    msgs.push({ role: 'tool', tool_call_id: 'c' + i, content: big(${chunk}) });
    msgs.push({ role: 'assistant', content: '第 ' + i + ' 步已抓取 ' + (i * 7) + ' 条' });
  }
  msgs.push({ role: 'user', content: ${JSON.stringify(tailUser)} });
  const size = (m) => { const c = m.content; return typeof c === 'string' ? c.length : JSON.stringify(c || '').length; };
  const totalIn = msgs.reduce((a, m) => a + size(m), 0);
  const out = trimMessages(msgs);
  const totalOut = out.reduce((a, m) => a + size(m), 0);

  // 1) 首条用户任务描述还在（原文逐字）
  const firstUser = out.find((m) => m.role === 'user');
  const taskKept = !!firstUser && firstUser.content === ${JSON.stringify(task)};
  // 2) 有截断说明，且明确指向原始任务
  const note = out.find((m) => m.role === 'system');
  const noteOk = !!note && /截断/.test(note.content) && /任务/.test(note.content);
  // 3) 首个非 system 消息不能是孤儿 tool
  const firstNonSystem = out.find((m) => m.role !== 'system');
  const noOrphanHead = !!firstNonSystem && firstNonSystem.role !== 'tool';
  // 4) 每条 tool 都能在它前面找到对应的 assistant.tool_calls
  const callIds = new Set();
  let orphanTool = 0;
  for (const m of out) {
    if (m.role === 'assistant' && Array.isArray(m.tool_calls)) m.tool_calls.forEach((t) => callIds.add(t && t.id));
    if (m.role === 'tool' && !callIds.has(m.tool_call_id)) orphanTool++;
  }
  // 5) 每条带 tool_calls 的 assistant，其结果都必须还在（缺结果的会被网关 400）
  let dangling = 0;
  for (let i = 0; i < out.length; i++) {
    const m = out[i];
    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      const got = new Set(out.slice(i + 1).filter((x) => x.role === 'tool').map((x) => x.tool_call_id));
      if (m.tool_calls.some((t) => !got.has(t && t.id))) dangling++;
    }
  }
  // 6) 尾部用户消息（本轮真实输入）也在
  const tailKept = out.some((m) => m.role === 'user' && m.content === ${JSON.stringify(tailUser)});
  // 7) 确实发生了截断（否则这个用例没走到修复分支）
  const trimmed = out.length < msgs.length;

  return { totalIn, totalOut, inLen: msgs.length, outLen: out.length, trimmed, taskKept, noteOk, noOrphanHead, orphanTool, dangling, tailKept, headRoles: out.slice(0, 3).map((m) => m.role) };
})()`;

const SMALL = `(() => {
  const msgs = [
    { role: 'user', content: '短对话' },
    { role: 'assistant', content: '好的' },
    { role: 'user', content: '再来一句' }
  ];
  const out = trimMessages(msgs);
  return { same: out === msgs, len: out.length, hasNote: out.some((m) => m.role === 'system') };
})()`;

// 边界：只有 9 条超大消息（keep.length > 8 守卫导致窗口不收缩），不应误加截断说明
const EDGE = `(() => {
  const big = (n) => 'B'.repeat(n);
  const msgs = [];
  for (let i = 0; i < 4; i++) {
    msgs.push({ role: 'user', content: '任务 ' + i });
    msgs.push({ role: 'assistant', content: big(100000) });
  }
  msgs.push({ role: 'user', content: '最后一条' });
  const out = trimMessages(msgs);
  return { inLen: msgs.length, outLen: out.length, hasNote: out.some((m) => m.role === 'system'), tailKept: out.some((m) => m.content === '最后一条') };
})()`;

let result = {};
let exitCode = 0;
try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  for (let i = 0; i < 100; i++) {
    const r = await ev(`document.readyState + '|' + (typeof trimMessages)`, sessionId);
    if (r === 'complete|function') break;
    await sleep(120);
  }
  await sleep(300);

  const ready = await ev(`({ ready: document.readyState, fn: typeof trimMessages })`, sessionId);
  result.A_ready = ready;

  // 主用例：12 轮工具调用 × 4 万字工具结果 ≈ 48 万字，必过 360000 阈值
  result.B_longTask = await ev(CASE('帮我抓取派单决策路径所有条目，记得翻页，最后生成excel文件', 12, 40000, '继续，把剩下的页也抓完'), sessionId);
  // 变体：工具结果更大（真实截图 base64 量级）、轮次更多
  result.C_hugeShot = await ev(CASE('导出全量订单并生成 excel', 20, 60000, '继续'), sessionId);
  // 变体：任务描述本身带引用前缀（prefix 拼接后的真实形态）
  result.D_prefixTask = await ev(CASE('【引用标签页：派单决策路径】\n\n抓取所有条目并翻页', 14, 45000, '翻页继续'), sessionId);
  result.E_small = await ev(SMALL, sessionId);
  result.F_edge = await ev(EDGE, sessionId);

  const checks = [];
  const push = (name, ok, detail) => checks.push({ name, ok: !!ok, detail });
  const r = result.B_longTask || {};
  push('ready', ready && ready.fn === 'function', ready);
  push('trimmed', r.trimmed, { inLen: r.inLen, outLen: r.outLen });
  push('taskKept', r.taskKept, r.headRoles);
  push('noteOk', r.noteOk);
  push('noOrphanHead', r.noOrphanHead);
  push('orphanTool=0', r.orphanTool === 0, r.orphanTool);
  push('dangling=0', r.dangling === 0, r.dangling);
  push('tailKept', r.tailKept);
  for (const k of ['C_hugeShot', 'D_prefixTask']) {
    const x = result[k] || {};
    push(k + '.taskKept', x.taskKept, x.headRoles);
    push(k + '.orphanTool=0', x.orphanTool === 0, x.orphanTool);
    push(k + '.dangling=0', x.dangling === 0, x.dangling);
    push(k + '.noteOk', x.noteOk);
  }
  push('small.sameArray', result.E_small && result.E_small.same === true, result.E_small);
  push('small.noNote', result.E_small && result.E_small.hasNote === false, result.E_small);
  push('edge.tailKept', result.F_edge && result.F_edge.tailKept === true, result.F_edge);
  push('edge.noFalseNote', result.F_edge && result.F_edge.outLen === result.F_edge.inLen && result.F_edge.hasNote === false, result.F_edge);
  for (const c of checks) if (!c.ok) { exitCode = 1; }
  result.checks = checks;
  result.pass = exitCode === 0;
  result.failed = checks.filter((c) => !c.ok).map((c) => c.name);
} catch (e) {
  result.error = String(e && e.message || e);
  exitCode = 1;
} finally {
  console.log(JSON.stringify(result, null, 2));
  try { ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  process.exit(exitCode);
}
