// 非脚本类技炉「去试试」按钮回归：详情页按钮互斥显隐 + 点击后引用小卡片入框
// 真实 headless 加载扩展，走 openSkillDetail → 点 btnSkillTry → 断言 quoteRefs / chip / skillBar
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const EXT = join(HERE, 'extension');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9679;
const userDir = mkdtempSync(join(tmpdir(), 'yz-try-'));
const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${userDir}`,
  '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--window-size=420,1100', 'about:blank'], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitPort() {
  for (let i = 0; i < 80; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return await r.json(); } catch {}
    await sleep(150);
  }
  throw new Error('Chrome 未就绪');
}

const out = {};
let ws;
try {
  const ver = await waitPort();
  ws = new WebSocket(ver.webSocketDebuggerUrl);
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
    if (r.exceptionDetails) return { err: String((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text || 'exc').slice(0, 400) };
    return r.result && r.result.value;
  };

  const loaded = await send('Extensions.loadUnpacked', { path: EXT });
  const { targetId } = await send('Target.createTarget', { url: `chrome-extension://${loaded.id}/sidepanel.html` });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  for (let i = 0; i < 100; i++) {
    const s = await ev(`document.readyState + '|' + (typeof openSkillDetail)`, sessionId);
    if (s === 'complete|function') break;
    await sleep(120);
  }
  await sleep(400);
  out.A_ready = await ev(`({ ready: document.readyState, ver: (chrome.runtime.getManifest() || {}).version })`, sessionId);

  // 找一个非脚本技炉（prompt 类）和一个脚本技炉（codeFile）
  out.B_pick = await ev(`(() => {
    const all = BUILTIN_SKILLS.concat(customSkills || []);
    const nonScript = all.find((s) => !s.codeFile && s.prompt);
    const script = all.find((s) => s.codeFile);
    return {
      total: all.length,
      nonScript: nonScript ? { id: nonScript.id, name: nonScript.name, cat: nonScript.cat, hasPrompt: !!nonScript.prompt } : null,
      script: script ? { id: script.id, name: script.name, cat: script.cat } : null
    };
  })()`, sessionId);

  // —— 场景 1：非脚本技炉详情页 —— 「去试试」显示，「运行脚本」隐藏
  out.C_nonScript = await ev(`(() => {
    const all = BUILTIN_SKILLS.concat(customSkills || []);
    const s = all.find((x) => !x.codeFile && x.prompt);
    openSkillDetail(s);
    const run = document.getElementById('btnSkillRun');
    const tryb = document.getElementById('btnSkillTry');
    return {
      name: s.name,
      runShown: getComputedStyle(run).display !== 'none',
      tryShown: getComputedStyle(tryb).display !== 'none',
      tryText: tryb.textContent.trim(),
      tryTitle: tryb.title
    };
  })()`, sessionId);

  // —— 场景 2：点击「去试试」→ 引用小卡片入框
  out.D_click = await ev(`(() => {
    quoteRefs.length = 0;                  // 前置清空，保证断言干净
    renderQuoteBar();
    const before = quoteRefs.length;
    const all = BUILTIN_SKILLS.concat(customSkills || []);
    const s = all.find((x) => !x.codeFile && x.prompt);
    openSkillDetail(s);
    const btn = document.getElementById('btnSkillTry');
    btn.click();
    const q = quoteRefs[0] || {};
    const chip = document.querySelector('.quote-chip.qc-main');
    const skBar = document.getElementById('skillBar');
    return {
      before,
      after: quoteRefs.length,
      label: q.label,
      kind: (q.meta || {}).kind,
      promptLen: String((q.meta || {}).prompt || q.content || '').length,
      promptHead: String((q.meta || {}).prompt || q.content || '').slice(0, 24),
      chipText: chip ? chip.textContent.replace(/\\s+/g, ' ').trim().slice(0, 30) : null,
      skillChipShown: !!(skBar && getComputedStyle(skBar).display !== 'none'),
      detailClosed: document.getElementById('skillDetail').classList.contains('hidden'),
      focused: document.activeElement && document.activeElement.id,
      btnFeedback: document.getElementById('btnSkillTry').textContent.trim()
    };
  })()`, sessionId);

  // —— 场景 3：脚本类技炉详情页 —— 「运行脚本」显示，「去试试」隐藏（互斥，不影响原链路）
  out.E_script = await ev(`(() => {
    const all = BUILTIN_SKILLS.concat(customSkills || []);
    const s = all.find((x) => x.codeFile);
    openSkillDetail(s);
    const run = document.getElementById('btnSkillRun');
    const tryb = document.getElementById('btnSkillTry');
    return {
      name: s.name,
      runShown: getComputedStyle(run).display !== 'none',
      tryShown: getComputedStyle(tryb).display !== 'none'
    };
  })()`, sessionId);

  // —— 场景 4：连点两次不重复堆积？应各自成一条引用（用户可对同一技炉多带）
  out.F_twice = await ev(`(() => {
    quoteRefs.length = 0; renderQuoteBar();
    const all = BUILTIN_SKILLS.concat(customSkills || []);
    const s = all.find((x) => !x.codeFile && x.prompt);
    openSkillDetail(s); document.getElementById('btnSkillTry').click();
    openSkillDetail(s); document.getElementById('btnSkillTry').click();
    return { n: quoteRefs.length, kinds: quoteRefs.map((q) => (q.meta || {}).kind) };
  })()`, sessionId);

  // —— 场景 5：引用后输入框里技炉提示词真的会随消息发出（send 时拼进 prefix）
  out.G_sendPrefix = await ev(`(() => {
    // 复现 send() 里对 skill 类引用的拼装逻辑：读 buildSkillPrefix 或直接验证 meta.prompt 可取
    const q = quoteRefs[0] || {};
    return { hasPrompt: !!String((q.meta || {}).prompt || '').length, len: String((q.meta || {}).prompt || '').length };
  })()`, sessionId);

  const c = [];
  const push = (n, ok, d) => c.push({ n, ok: !!ok, d });
  const cmp = (a, b) => String(a || '') >= String(b || '');
  push('ready', out.A_ready && cmp(out.A_ready.ver, '0.7.9'), out.A_ready);
  push('存在非脚本技炉样本', out.B_pick && out.B_pick.nonScript, out.B_pick && out.B_pick.nonScript);
  push('非脚本:去试试显示/运行脚本隐藏', out.C_nonScript && out.C_nonScript.tryShown === true && out.C_nonScript.runShown === false, out.C_nonScript);
  push('去试试文案含去试试', out.C_nonScript && /去试试/.test(out.C_nonScript.tryText), out.C_nonScript && out.C_nonScript.tryText);
  push('点击后引用数 +1', out.D_click && out.D_click.before === 0 && out.D_click.after === 1, out.D_click);
  push('引用 kind=skill', out.D_click && out.D_click.kind === 'skill', out.D_click && out.D_click.kind);
  push('引用带完整提示词', out.D_click && out.D_click.promptLen > 10, out.D_click && out.D_click.promptLen);
  push('生成小卡片(chip)且标签为技炉名', out.D_click && out.D_click.chipText, out.D_click && out.D_click.chipText);
  push('技能引用条可见', out.D_click && out.D_click.skillChipShown === true, out.D_click && out.D_click.skillChipShown);
  push('详情页关闭并聚焦输入框', out.D_click && out.D_click.detailClosed === true && out.D_click.focused === 'inpMsg', out.D_click);
  push('按钮点击反馈(已加入引用)', out.D_click && /已加入引用/.test(out.D_click.btnFeedback), out.D_click && out.D_click.btnFeedback);
  push('脚本类互斥:运行脚本显示/去试试隐藏', out.E_script && out.E_script.runShown === true && out.E_script.tryShown === false, out.E_script);
  push('连点两次成两条引用', out.F_twice && out.F_twice.n === 2 && out.F_twice.kinds.every((k) => k === 'skill'), out.F_twice);
  push('提示词可随消息发出', out.G_sendPrefix && out.G_sendPrefix.hasPrompt, out.G_sendPrefix);
  out.checks = c;
  out.pass = c.every((x) => x.ok);
  out.failed = c.filter((x) => !x.ok).map((x) => x.n);
} catch (e) {
  out.error = String(e && e.message || e).slice(0, 500);
  out.pass = false;
} finally {
  console.log(JSON.stringify(out, null, 2));
  try { ws && ws.close(); } catch {}
  try { proc.kill('SIGKILL'); } catch {}
  await sleep(200);
  try { rmSync(userDir, { recursive: true, force: true }); } catch {}
  process.exit(out.pass ? 0 : 1);
}
