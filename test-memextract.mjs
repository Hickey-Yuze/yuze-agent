// 记忆提炼质量回归：打桩 LLM 验证提取请求包含「禁止助手回复」指令 + user/assistant 双上下文
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9703;
const userDir = mkdtempSync(join(tmpdir(), 'yz-memx-'));
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

  const out = await ev(`(async () => {
    // 打桩提取请求：记录请求体并返回一条「用户」开头的记忆
    window.__EXTRACT_CALLS = [];
    const realFetch = window.fetch;
    window.fetch = async (url, opt) => {
      const u = String(url || '');
      if (u.includes('/chat/completions')) {
        const body = JSON.parse((opt && opt.body) || '{}');
        window.__EXTRACT_CALLS.push(body);
        return new Response(JSON.stringify({ choices: [{ message: { content: '用户偏好简洁的中文回复' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return realFetch(url, opt);
    };
    await chrome.storage.local.set({ providers: [{ id: 'p1', name: 'T', baseUrl: 'http://127.0.0.1:7863/v1', apiKey: 'sk-test', protocol: 'openai', model: 'cn:test' }], activeProvider: 'p1' });
    // 造一轮对话
    messages.length = 0;
    messages.push({ role: 'user', content: '我喜欢简洁的回复，项目在 /Users/yuze/Desktop/Yuze/ceshi' });
    messages.push({ role: 'assistant', content: '好的，我会用简短中文回复。' });
    await memExtractAfterTurn();
    await new Promise((r) => setTimeout(r, 300));
    const call = window.__EXTRACT_CALLS[0];
    const sys = call && call.messages[0].content;
    const usr = call && call.messages[1].content;
    const rows = await window.YZDB.memList();
    return {
      called: !!call,
      forbidsAssistant: !!sys && (sys.includes('禁止') || sys.includes('严格禁止')) && sys.includes('助手'),
      hasBothCtx: !!usr && usr.includes('[用户]') && usr.includes('[助手]'),
      strictRule: !!sys && sys.includes('宁缺毋滥'),
      stored: rows.some((r) => r.text === '用户偏好简洁的中文回复'),
      rowPrefix: rows.map((r) => r.text.slice(0, 4))
    };
  })()`, sessionId);
  console.log(JSON.stringify(out, null, 1));
} finally {
  try { ws.close(); } catch (_) {} try { proc.kill(); } catch (_) {}
  try { rmSync(userDir, { recursive: true, force: true, maxRetries: 5 }); } catch (_) {}
}
