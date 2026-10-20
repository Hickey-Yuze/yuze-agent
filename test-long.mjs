// 长思考回归：流式期间不写 storage（改为增量广播），思考变长不卡死；第二轮发新消息必须有反应
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOCK = 9957;
const PORT = 9965;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 模拟长思考：60 段 reasoning，每段 60 字符 ≈ 3.6K 字符，间隔 60ms
let round = 0;
const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); }
  req.on('data', () => {});
  req.on('end', () => {
    round++;
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const chunks = [];
    for (let i = 0; i < 60; i++) chunks.push({ choices: [{ delta: { reasoning_content: '这是第' + i + '段思考内容，用来验证长思考不会把后台拖死。' } }] });
    chunks.push({ choices: [{ delta: { content: '第' + round + '轮结论。' } }] });
    let i = 0;
    const t = setInterval(() => {
      if (i < chunks.length) res.write('data: ' + JSON.stringify(chunks[i++]) + '\n\n');
      else { res.write('data: [DONE]\n\n'); clearInterval(t); res.end(); }
    }, 55);
  });
});
await new Promise((r) => server.listen(MOCK, r));

const userDir = mkdtempSync(join(tmpdir(), 'yz-long-'));
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
  await ev(`(() => { document.getElementById('inpMsg').value = '长思考第一轮'; send(); })()`, sessionId);

  // 采样思考文本长度，确认是增量增长（不是卡住后一次性蹦出来）
  const lens = [];
  let ended = null;
  for (let i = 0; i < 90; i++) {
    await sleep(150);
    const s = await ev(`(async () => {
      const o = await chrome.storage.local.get('agentStream');
      const a = o.agentStream || {};
      const m = messages[messages.length - 1] || {};
      return { len: (m.reasoning || '').length, clen: (m.content || '').length, running: !!running, role: m.role || '', seq: a.seq || 0, sid: (a.sessionId||'').slice(0,10), cur: (sessionId||'').slice(0,10), dlen: (a.dReasoning||'').length };
    })()`, sessionId);
    lens.push(s.len);
    if (s.clen > 0 && !out.contentAt) out.contentAt = Date.now() - t0;
    if (lens.length <= 3) { out.dbg = out.dbg || []; out.dbg.push(s); }
    if (!s.running && s.len > 0) { ended = s; break; }
  }
  out.firstLen = lens[lens.length - 1];
  out.grewIncremental = lens.filter((v) => v > 0).length >= 5;
  out.samples = lens.slice(0, 8);
  out.firstDone = !!ended;

  // 第二轮：必须能发出并拿到回复
  const before = await ev(`messages.length`, sessionId);
  await ev(`(() => { document.getElementById('inpMsg').value = '第二轮测试'; send(); })()`, sessionId);
  let secondOk = false;
  for (let i = 0; i < 90; i++) {
    await sleep(150);
    const s = await ev(`(() => {
      const m = messages[messages.length - 1] || {};
      return { n: messages.length, running: !!running, len: (m.reasoning || '').length, content: (m.content || '') };
    })()`, sessionId);
    if (s.n > before && /第2轮结论/.test(s.content || '')) { secondOk = true; break; }
  }
  out.secondOk = secondOk;
  out.mockHits = round;
  const kept = await ev(`(() => {
    const a = messages.filter((m) => m.role === 'assistant');
    return { n: a.length, first: (a[0] && a[0].reasoning || '').length, last: (a[a.length-1] && a[a.length-1].reasoning || '').length };
  })()`, sessionId);
  out.reasonings = kept;
  out.ok = out.firstDone && out.grewIncremental && out.firstLen > 1000 && secondOk && kept.first > 0;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('LONG ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  server.close();
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
