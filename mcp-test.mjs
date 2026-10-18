/**
 * MCP 冒烟测试：起一个最小 MCP 服务器，验证扩展能握手、拉工具、调用。
 * 用法：node mcp-test.mjs
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MCP_PORT = 8931;
const CDP_PORT = 9335;

/* ── 最小 MCP 服务器 ─────────────────────────────────── */
const mcp = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    let j;
    try { j = JSON.parse(body || '{}'); } catch { res.statusCode = 400; return res.end('{}'); }
    const send = (result) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ jsonrpc: '2.0', id: j.id, result }));
    };
    if (j.method === 'initialize') {
      return send({ protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'smoke', version: '1.0' } });
    }
    if (j.method === 'tools/list') {
      return send({ tools: [{ name: 'echo', description: '回声测试', inputSchema: { type: 'object', properties: { text: { type: 'string' } } } }] });
    }
    if (j.method === 'tools/call') {
      return send({ content: [{ type: 'text', text: 'ECHO:' + (j.params?.arguments?.text || '') }] });
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ jsonrpc: '2.0', id: j.id, error: { code: -32601, message: 'no method' } }));
  });
});
await new Promise((r) => mcp.listen(MCP_PORT, '127.0.0.1', r));
console.log('mcp server on', MCP_PORT);

/* ── 浏览器 ──────────────────────────────────────────── */
const userDir = mkdtempSync(join(tmpdir(), 'ca-mcp-'));
const proc = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${CDP_PORT}`,
  `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  'about:blank'
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const ver = await waitPort();
const ws = new WebSocket(ver.webSocketDebuggerUrl);
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
const send = (method, params = {}, sessionId) => {
  const id = ++seq;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params, sessionId })); });
};

try {
  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const extId = loaded.id;
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${extId}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await sleep(800);

  const ev = async (expression) =>
    (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId));

  const a = await ev(`mcpServers = ['http://127.0.0.1:${MCP_PORT}/mcp']; loadMcp().then(() => JSON.stringify({ n: mcpTools.length, names: mcpTools.map(t => t.function.name) }))`);
  console.log('loadMcp:', a.result?.value, a.exceptionDetails ? a.exceptionDetails.text : '');

  const b = await ev(`runTool('mcp_echo', { text: '你好' }).then(r => JSON.stringify(r))`);
  console.log('call:', b.result?.value);

  const c = await ev(`JSON.stringify(TOOLS.concat(mcpTools).map(t => t.function.name))`);
  console.log('tools given to LLM:', c.result?.value);
} catch (e) {
  console.error('FAILED:', e.message);
  process.exitCode = 1;
} finally {
  ws.close();
  proc.kill('SIGKILL');
  mcp.close();
}
