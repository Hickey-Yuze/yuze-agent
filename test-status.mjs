// 验证状态条生命周期：准备中 → 思考中 → 收尾清空；不得反复回退到「准备中…」
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOCK = 9956;
const PORT = 9964;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); }
  req.on('data', () => {});
  req.on('end', () => {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const chunks = [
      { choices: [{ delta: { reasoning_content: '想一下' } }] },
      { choices: [{ delta: { content: '好的' } }] },
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i < chunks.length) res.write('data: ' + JSON.stringify(chunks[i++]) + '\n\n');
      else { res.write('data: [DONE]\n\n'); clearInterval(t); res.end(); }
    }, 400);
  });
});
await new Promise((r) => server.listen(MOCK, r));

const userDir = mkdtempSync(join(tmpdir(), 'yz-status-'));
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

  const t0 = Date.now();
  await ev(`(() => { document.getElementById('inpMsg').value = '测试状态'; send(); })()`, sessionId);

  const seqLog = [];
  let firstThink = null, firstTool = null, sawStuck = false, ended = null;
  for (let i = 0; i < 40; i++) {
    await sleep(200);
    const s = await ev(`({
      st: (document.getElementById('statusLine')||{}).textContent||'',
      running: !!running,
      n: messages.length,
    })`, sessionId);
    const t = Date.now() - t0;
    seqLog.push({ t, st: s.st, r: s.running });
    if (!firstThink && /思考/.test(s.st)) firstThink = t;
    if (!firstTool && /准备工具/.test(s.st)) firstTool = t;
    // 已经出现思考中之后又回退到「准备中…」= 看门狗抢文案，判定失败
    if (firstThink && /准备中\.\.\.|准备中…/.test(s.st)) sawStuck = true;
    if (firstThink && !s.running) { ended = s.st; break; }
  }
  out.thinkAt = firstThink;
  out.toolAt = firstTool;
  out.regressedToPreparing = sawStuck;
  out.endedWith = ended;
  out.tail = seqLog.slice(-6);
  out.ok = !!firstThink && !sawStuck && firstThink <= 2500;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('STATUS ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  server.close();
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
