// 复现用户截图中的神秘横线：注入生图轮（reasoning 空白 + content=---），dump DOM 找出那条线是哪个节点
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9695;
const userDir = mkdtempSync(join(tmpdir(), 'yz-line-'));
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

  // 复现场景：用户问生图 → assistant reasoning 空白串 + content 只有 --- （截图上下文）
  out.A_dump = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: '生成耄耋的图片' });
    messages.push({ role: 'assistant', reasoning: '   \\n  ', content: '\\n---\\n' });
    render();
    const bots = [...document.querySelectorAll('.msg-bot')];
    return bots.map((b) => ({
      html: b.innerHTML.slice(0, 500),
      rect: (({ x, y, width, height }) => ({ x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height) }))(b.getBoundingClientRect()),
      children: [...b.children].map((c) => ({ cls: c.className, h: Math.round(c.getBoundingClientRect().height), text: (c.textContent || '').slice(0, 60) }))
    }));
  })()`, sessionId);

  // 断言 1：content=--- 时，bot-md 里就是一条 hr（真凶确认，这是合法渲染——是模型输出了 --- 分隔线，不是空壳 bug）
  out.B_hrIsSeparator = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: '生成耄耋的图片' });
    messages.push({ role: 'assistant', content: '\\n---\\n' });
    render();
    const md = document.querySelector('.msg-bot .bot-md');
    return { isHr: !!md && md.children.length === 1 && md.firstChild.tagName === 'HR', bots: document.querySelectorAll('.msg-bot').length };
  })()`, sessionId);

  // 断言 2：纯空白 reasoning（无 content）不再渲染 bot 空节点
  out.C_blankOnly = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    messages.push({ role: 'assistant', reasoning: '  ' });
    render();
    return { bots: document.querySelectorAll('.msg-bot').length };
  })()`, sessionId);

  // 断言 3：content 为纯空白（无 ---、无文字）也不渲染空 bot
  out.D_blankContent = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    messages.push({ role: 'assistant', content: '  \\n  ' });
    render();
    return { bots: document.querySelectorAll('.msg-bot').length };
  })()`, sessionId);

  // 断言 4：有真实 reasoning/content 照常渲染（防误伤）
  out.E_normal = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    messages.push({ role: 'assistant', reasoning: '真实思考', content: '真实正文' });
    render();
    return { bots: document.querySelectorAll('.msg-bot').length, thinks: document.querySelectorAll('.think').length };
  })()`, sessionId);

  // 断言 5：实时路径（updateLive）注入空白 reasoning 也不建 think 壳
  out.F_liveBlank = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: 'x' });
    const m = { role: 'assistant', reasoning: ' ', content: '', _live: true, _id: 'mlive1' };
    messages.push(m);
    midOf(m); render(); updateLive(m);
    return { thinks: document.querySelectorAll('.think').length };
  })()`, sessionId);

  out.pass = out.B_hrIsSeparator.isHr
    && out.C_blankOnly.bots === 0
    && out.D_blankContent.bots === 0
    && out.E_normal.bots === 1 && out.E_normal.thinks === 1
    && out.F_liveBlank.thinks === 0;

  console.log(JSON.stringify(out, null, 2));
} finally {
  try { proc.kill(); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
}
