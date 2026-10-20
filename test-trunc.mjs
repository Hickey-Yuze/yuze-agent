// 截断续写回归：第一次只给思考（finish_reason=length），必须自动续写而不是直接收工
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOCK = 9958;
const PORT = 9966;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let hits = 0;
const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); }
  req.on('data', () => {});
  req.on('end', () => {
    hits++;
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const push = (o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
    // 第 1 次：只有思考，且 finish_reason=length（模拟输出上限截断）
    if (hits === 1) {
      push({ choices: [{ delta: { reasoning_content: '我先想一下这个问题大概要怎么回答才完整。' } }] });
      push({ choices: [{ delta: {}, finish_reason: 'length' }] });
    } else {
      // 第 2 次：正常给出结论
      push({ choices: [{ delta: { content: '这是续写后的完整回答。' } }] });
      push({ choices: [{ delta: {}, finish_reason: 'stop' }] });
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });
});
await new Promise((r) => server.listen(MOCK, r));

const userDir = mkdtempSync(join(tmpdir(), 'yz-trunc-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,1000', 'about:blank'], { stdio: 'ignore' });

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
  await sleep(1800);

  await ev(`(async () => {
    const base = 'http://127.0.0.1:${MOCK}/v1';
    await chrome.storage.local.set({
      providers: [{ id: 'mock', name: 'Mock', baseUrl: base, apiKey: 'k', model: 'mock-model', protocol: 'openai', models: ['mock-model'] }],
      activeProvider: 'mock', apiKey: 'k', baseUrl: base, model: 'mock-model',
    });
    settings.baseUrl = base; settings.apiKey = 'k'; settings.model = 'mock-model';
    messages = []; running = false; backgroundMode = false;
    render(); persist();
  })()`, sessionId);

  await ev(`(() => { document.getElementById('inpMsg').value = '截断测试'; send(); })()`, sessionId);

  let state = null;
  for (let i = 0; i < 80; i++) {
    await sleep(150);
    state = await ev(`(() => {
      const all = messages.map((m) => ({ role: m.role, c: String(m.content || '').slice(0, 40), r: String(m.reasoning || '').slice(0, 20) }));
      const joined = all.map((m) => m.c).join('|');
      return { n: messages.length, running: !!running, cont: /继续接着写/.test(joined), answer: all.some((m) => m.role === 'assistant' && /续写后的完整回答/.test(m.c)), st: (document.getElementById('statusLine')||{}).textContent||'' };
    })()`, sessionId);
    if (!state.running && state.answer) break;
  }
  out.continuePromptSent = state.cont;
  out.finalAnswer = state.answer;
  out.mockHits = hits;
  out.status = state.st;
  out.ok = state.cont && state.answer && hits >= 2;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('TRUNC ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  server.close();
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
