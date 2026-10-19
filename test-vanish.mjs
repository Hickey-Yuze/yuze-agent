// 复现「发完瞬间没了」：Extensions.loadUnpacked + mock SSE 网关
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MOCK = 9955;
const PORT = 9963;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  if (req.url === '/v1/models') { res.writeHead(200, { ...cors, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'mock-model' }] })); }
  req.on('data', () => {});
  req.on('end', () => {
    res.writeHead(200, { ...cors, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
    const chunks = [
      { choices: [{ delta: { reasoning_content: '先想一下' } }] },
      { choices: [{ delta: { content: '好的，我来处理' } }] },
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i < chunks.length) res.write('data: ' + JSON.stringify(chunks[i++]) + '\n\n');
      else { res.write('data: [DONE]\n\n'); clearInterval(t); res.end(); }
    }, 400);
  });
});
await new Promise((r) => server.listen(MOCK, r));

const userDir = mkdtempSync(join(tmpdir(), 'yz-vanish-'));
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
    if (r.exceptionDetails) return { err: r.exceptionDetails.text, desc: r.exceptionDetails.exception?.description?.slice(0, 160) };
    return r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await sleep(1800);

  out.setup = await ev(`(async () => {
    const base = 'http://127.0.0.1:${MOCK}/v1';
    await chrome.storage.local.set({
      providers: [{ id: 'mock', name: 'Mock', baseUrl: base, apiKey: 'k', model: 'mock-model', protocol: 'openai', models: ['mock-model'] }],
      activeProvider: 'mock', apiKey: 'k', baseUrl: base, model: 'mock-model',
    });
    settings.baseUrl = base; settings.apiKey = 'k'; settings.model = 'mock-model';
    messages = []; running = false; backgroundMode = false;
    render(); persist();
    return { ok: true, inp: !!document.getElementById('inpMsg') };
  })()`, sessionId);

  out.sent = await ev(`(() => { document.getElementById('inpMsg').value = '测试一下'; send(); return { n: messages.length, last: (messages[messages.length-1]||{}).content, running }; })()`, sessionId);

  const trace = [];
  for (let i = 0; i < 16; i++) {
    await sleep(400);
    const s = await ev(`({
      running,
      bg: backgroundMode,
      n: messages.length,
      last: (messages[messages.length-1] || {}).content?.slice(0, 16) || '',
      user: document.querySelectorAll('.msg-user').length,
      bot: document.querySelectorAll('.msg-bot').length,
      status: (document.getElementById('statusLine') || {}).textContent || '',
    })`, sessionId);
    trace.push({ t: (i + 1) * 400, ...s });
  }
  out.trace = trace;

  out.diag = await ev(`(() => {
    const sl = document.getElementById('statusLine');
    const info = { cls: sl ? sl.className : 'no-el', txt: sl ? (sl.textContent||'').slice(0,40) : '' };
    try { render(); info.renderOk = true; } catch (e) { info.renderErr = String(e && e.message || e).slice(0, 160); }
    info.bot = document.querySelectorAll('.msg-bot').length;
    info.user = document.querySelectorAll('.msg-user').length;
    info.roles = messages.map(m => m.role).join(',');
    return info;
  })()`, sessionId);

  // 幂等：同一 requestId 连投两次，后台应只认一次
  out.idem = await ev(`(async () => {
    const body = { sessionId, messages: messages.map(m => ({ role: m.role, content: m.content })), requestId: 'r_idem_test' };
    const a = await chrome.runtime.sendMessage({ type: 'agent:start', payload: body });
    const b = await chrome.runtime.sendMessage({ type: 'agent:start', payload: body });
    return { a, b };
  })()`, sessionId);
  await sleep(600);

  const g = await ev(`chrome.storage.local.get('agentRun')`, sessionId);
  const agentRun = g && g.agentRun;
  out.finalRun = agentRun ? { running: agentRun.running, status: agentRun.status, n: (agentRun.messages || []).length } : null;
  ws.close();
} catch (e) {
  out.error = String(e).slice(0, 200);
} finally {
  console.log('VANISH ' + JSON.stringify(out));
  try { proc.kill(); } catch {}
  server.close();
  await sleep(300);
  rmSync(userDir, { recursive: true, force: true });
  process.exit(0);
}
