// 真实生图端到端复现「孤线」：真调网关生图，dump 消息流每个顶层节点，找出线对应的 DOM
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9696;
const userDir = mkdtempSync(join(tmpdir(), 'yz-img-'));
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
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 800) };
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

  out.ver = await ev(`(chrome.runtime.getManifest()||{}).version`, sessionId);

  // 模拟生图完整消息流（与真实 run 的消息结构一致：assistant 带 generate_image tool_call + tool 结果 + 最终 assistant）
  out.dump = await ev(`(() => {
    messages.length = 0;
    messages.push({ role: 'user', content: '生成一张美女的照片' });
    // 第一轮 assistant：思考 + 生图 tool_call
    messages.push({
      role: 'assistant',
      reasoning: 'The user asks to generate a photo of a beautiful woman.',
      content: '',
      tool_calls: [{ id: 'c1', type: 'function', function: { name: 'generate_image', arguments: JSON.stringify({ prompt: 'a beautiful woman' }) } }]
    });
    messages.push({ role: 'tool', tool_call_id: 'c1', content: JSON.stringify({ ok: true, image: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' }) });
    // 第二轮 assistant：思考 + 正文
    messages.push({ role: 'assistant', reasoning: '竖图尺寸不支持，用1024x1024重试。', content: '图已生成。需要调整可以直接说。' });
    render();
    // dump 消息流顶层每个节点的类名/高度/文本/内层 hr
    return [...document.getElementById('chat').children].map((n) => {
      const r = n.getBoundingClientRect();
      return {
        cls: n.className, tag: n.tagName,
        h: Math.round(r.height),
        text: (n.textContent || '').replace(/\\s+/g, ' ').slice(0, 80),
        hrs: n.querySelectorAll(':scope hr').length,
        inner: n.innerHTML.slice(0, 260)
      };
    });
  })()`, sessionId);

  console.log(JSON.stringify(out, null, 2));
} finally {
  try { proc.kill(); } catch {}
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
}
