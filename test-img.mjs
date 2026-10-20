// 生图回归：工具调用后应渲染 <img class="tool-img" src="data:image/...">，且不依赖临时链接
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOCK = 9961;
const PORT = 9969;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let round = 0;
const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); }
  if (req.url === '/v1/images/generations') {
    req.on('data', () => {});
    req.on('end', () => {
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ data: [{ b64_json: PNG, revised_prompt: '一只猫' }] }));
    });
    return;
  }
  req.on('data', () => {});
  req.on('end', () => {
    round++;
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const push = (o) => res.write('data: ' + JSON.stringify(o) + '\n\n');
    if (round === 1) {
      // 第 1 轮：要求调用 generate_image
      push({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'generate_image', arguments: '' } }] } }] });
      push({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '{"prompt":"一只猫","size":"1024x1024"}' } }] } }] });
      push({ choices: [{ delta: {}, finish_reason: 'tool_calls' }] });
    } else {
      push({ choices: [{ delta: { content: '图片已经生成好了。' } }] });
      push({ choices: [{ delta: {}, finish_reason: 'stop' }] });
    }
    res.write('data: [DONE]\n\n');
    res.end();
  });
});
await new Promise((r) => server.listen(MOCK, r));

const userDir = mkdtempSync(join(tmpdir(), 'yz-img-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=840,1200', 'about:blank'], { stdio: 'ignore' });

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
    messages = []; running = false; backgroundMode = false; agentMode = 'task';
    render(); persist();
  })()`, sessionId);

  await ev(`(() => { document.getElementById('inpMsg').value = '帮我画一只猫'; send(); })()`, sessionId);

  let info = null;
  for (let i = 0; i < 100; i++) {
    await sleep(200);
    info = await ev(`(() => {
      const im = document.querySelector('.tool-img');
      const files = messages.filter((m) => m.role === 'file').length;
      const tools = messages.filter((m) => m.role === 'assistant' && m.tool_calls).length;
      return {
        img: !!im,
        dlBtn: !!document.querySelector('.img-dl'),
        srcType: im ? String(im.getAttribute('src') || '').slice(0, 22) : '',
        running: !!running,
        files,
        tools,
        msgs: messages.length,
      };
    })()`, sessionId);
    if (!info.running && info.img) break;
  }
  out.img = info.img;
  out.srcType = info.srcType;
  out.tools = info.tools;
  out.done = !info.running;
  out.dlBtn = info.dlBtn;
  out.ok = info.img && /^data:image\//.test(info.srcType) && !!info.dlBtn;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('IMG ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  server.close();
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
