/* 从 sidepanel.js 抽取引擎到 engine.js（offscreen 用）。
   chrome.* → APIC.*（offscreen 里 RPC 代理到 background）。
   用法：node gen-engine.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync('extension/sidepanel.js', 'utf8');

function grab(startMark, endMark) {
  const a = src.indexOf(startMark);
  if (a < 0) throw new Error('start not found: ' + startMark);
  const b = src.indexOf(endMark, a);
  if (b < 0) throw new Error('end not found: ' + endMark);
  return src.slice(a, b).trimEnd();
}

const consts = grab('const DEFAULT_BASE', 'const $ = (id)');
const engine = grab('const sleep = ', '\nfunction setSendMode');
const mcp = grab('async function mcpRpc(', 'async function loadMcp');
let body = [consts, engine, mcp].join('\n\n');

// waitForTabLoad：事件监听改轮询
const wStart = body.indexOf('function waitForTabLoad(tabId, timeoutMs = 20000) {');
const wEnd = body.indexOf('\n}\n', body.indexOf('chrome.tabs.get(tabId)', wStart)) + 3;
if (wStart >= 0 && wEnd > wStart) {
  body = body.slice(0, wStart) + `async function waitForTabLoad(tabId, timeoutMs = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const t = await APIC.tabs.get(tabId);
      if (t && t.status === 'complete') { await sleep(250); return { ok: true, ms: Date.now() - t0 }; }
    } catch (_) {}
    await sleep(200);
  }
  return { ok: false, ms: Date.now() - t0 };
}
` + body.slice(wEnd);
}

body = body
  .replace(/chrome\.debugger\./g, 'APIC.debugger.')
  .replace(/chrome\.storage\.local\./g, 'APIC.storage.local.')
  .replace(/chrome\.tabs\./g, 'APIC.tabs.')
  .replace(/chrome\.downloads\./g, 'APIC.downloads.');

const out = `/* Yuze-agent 引擎 —— 由 gen-engine.mjs 从 sidepanel.js 自动抽取，勿手改。
   chrome.* 已替换为 APIC.*（offscreen 文档里由 RPC 代理到 background）。 */
window.Engine = (function () {
  'use strict';

  let attachedTabId = null;
  let mcpServers = [];
  let mcpTools = [];
  let abortCtrl = null;
  let stopRequested = false;
  let agentMode = 'task';
  let lastShot = null;

${body}

  return {
    DEFAULT_BASE, DEFAULT_MODEL, MAX_STEPS, sleep,
    activeTab, attachTo, ensureAttached, cdp, evalInPage,
    TOOLS, TOOL_IMPL, callLLM, parseArgs, runTool, readConf,
    toolScreenshot, toolSnapshot, toolGetText, toolEvaluate,
    SYSTEM_PROMPT, mcpRpc, connectMcp,
    setServers(list) { mcpServers = Array.isArray(list) ? list : []; },
    getServers() { return mcpServers; },
    setTools(list) { mcpTools = Array.isArray(list) ? list : []; },
    getTools() { return mcpTools; },
    setAbort(ctrl) { abortCtrl = ctrl; },
    abort() { try { abortCtrl?.abort(); } catch (_) {} },
    setMode(m) { agentMode = m === 'ask' ? 'ask' : 'task'; },
    get mode() { return agentMode; },
    requestStop() { stopRequested = true; },
    clearStop() { stopRequested = false; },
    get stopped() { return stopRequested; }
  };
})();
`;
writeFileSync('extension/engine.js', out);
console.log('engine.js lines:', out.split('\n').length);
