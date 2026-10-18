(function () {
  'use strict';

  const SCRIPT_ID = 'tabbit-bilibili-favorites-organizer';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const HOST_ID = `${SCRIPT_ID}-host`;
  const BUTTON_ID = `${SCRIPT_ID}-button`;
  const OVERLAY_ID = `${SCRIPT_ID}-overlay`;
  const CLEANUP_KEY = '__tabbitBilibiliFavoritesOrganizerCleanup';
  const API_KEY = '__tabbitBilibiliFavoritesOrganizerApi';
  const SCRIPT_VERSION = '1.2.0';
  const API_ORIGIN = 'https://api.bilibili.com';

  if (typeof window[CLEANUP_KEY] === 'function') window[CLEANUP_KEY]();

  const defaults = {
    maxItems: 500,
    startOffset: 0,
    maxMatches: 1000,
    maxCategories: 20,
    pageSize: 40,
    apiTimeoutMs: 15000,
    llmTimeoutMs: 90000,
    apiRetryCount: 1,
    apiRetryDelayMs: 600,
    writeBatchSize: 20,
    writeBatchDelayMs: 1800,
    rateLimitCooldownMs: 20000,
    verifyAfterOrganize: true,
    defaultPrivateFolder: true,
    defaultOperation: 'move',
    defaultAutoGranularity: 'fine',
    testMode: false
  };
  const overrides = window.__tabbitBilibiliFavoritesOrganizerConfig || {};
  const config = {
    ...defaults,
    ...overrides,
    maxItems: clampInt(overrides.maxItems, 1, 5000, defaults.maxItems),
    startOffset: clampInt(overrides.startOffset, 0, 50000, defaults.startOffset),
    maxMatches: clampInt(overrides.maxMatches, 1, 5000, defaults.maxMatches),
    maxCategories: clampInt(overrides.maxCategories, 2, 200, defaults.maxCategories),
    pageSize: clampInt(overrides.pageSize, 20, 40, defaults.pageSize),
    apiTimeoutMs: clampInt(overrides.apiTimeoutMs, 3000, 120000, defaults.apiTimeoutMs),
    llmTimeoutMs: clampInt(overrides.llmTimeoutMs, 5000, 180000, defaults.llmTimeoutMs),
    apiRetryCount: clampInt(overrides.apiRetryCount, 0, 3, defaults.apiRetryCount),
    apiRetryDelayMs: clampInt(overrides.apiRetryDelayMs, 100, 10000, defaults.apiRetryDelayMs),
    writeBatchSize: clampInt(overrides.writeBatchSize, 1, 50, defaults.writeBatchSize),
    writeBatchDelayMs: clampInt(overrides.writeBatchDelayMs, 500, 30000, defaults.writeBatchDelayMs),
    rateLimitCooldownMs: clampInt(overrides.rateLimitCooldownMs, 5000, 120000, defaults.rateLimitCooldownMs),
    verifyAfterOrganize: overrides.verifyAfterOrganize === undefined ? defaults.verifyAfterOrganize : overrides.verifyAfterOrganize !== false,
    defaultPrivateFolder: overrides.defaultPrivateFolder === undefined ? defaults.defaultPrivateFolder : overrides.defaultPrivateFolder !== false,
    defaultOperation: overrides.defaultOperation === 'copy' ? 'copy' : 'move',
    defaultAutoGranularity: overrides.defaultAutoGranularity === undefined
      ? defaults.defaultAutoGranularity
      : overrides.defaultAutoGranularity === 'coarse' ? 'coarse' : 'fine',
    testMode: overrides.testMode === true
  };

  const state = {
    observer: null,
    mountTimer: null,
    running: false,
    organizing: false,
    cancelled: false,
    mode: 'auto',
    query: '',
    maxItems: config.maxItems,
    startOffset: config.startOffset,
    maxCategories: config.maxCategories,
    autoGranularity: config.defaultAutoGranularity,
    privateFolder: config.defaultPrivateFolder,
    operation: config.defaultOperation,
    context: null,
    folders: new Map(),
    collected: [],
    analysis: null,
    autoPlan: null,
    logs: [],
    lastResult: null
  };

  function clampInt(value, min, max, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function errorText(error) {
    if (!error) return '未知错误';
    return cleanText(error.message || error.msg || error.message || error);
  }

  class BilibiliApiError extends Error {
    constructor(message, details = {}) {
      super(message);
      this.name = 'BilibiliApiError';
      Object.assign(this, details);
    }
  }

  function isRateLimitError(error) {
    return Number(error?.status) === 412 || Number(error?.biliCode) === -412 || /(?:HTTP\s*412|request was banned|"code"\s*:\s*-412)/i.test(errorText(error));
  }

  function log(level, stage, message, details) {
    const row = { time: new Date().toISOString(), level, stage, message, ...(details ? { details } : {}) };
    state.logs.push(row);
    if (state.logs.length > 500) state.logs.shift();
    const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'debug';
    console[method]('[Tabbit Bilibili Organizer]', stage, message, details || '');
    return row;
  }

  function withTimeout(promise, label, timeoutMs = config.apiTimeoutMs) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label}超过 ${Math.round(timeoutMs / 1000)} 秒`)), timeoutMs); })
    ]).finally(() => clearTimeout(timer));
  }

  async function callWithRetry(factory, label, retryCount = config.apiRetryCount) {
    let lastError;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await withTimeout(factory(), label);
      } catch (error) {
        lastError = error;
        log('warn', 'api-retry', `${label}第 ${attempt + 1} 次失败`, { error: errorText(error) });
        if (attempt < retryCount) await sleep(config.apiRetryDelayMs * (attempt + 1));
      }
    }
    throw lastError || new Error(`${label}失败`);
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID}{position:fixed!important;right:28px!important;top:108px!important;z-index:2147483000!important;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif!important}
      #${BUTTON_ID}{appearance:none!important;height:42px!important;padding:0 17px!important;border:1px solid rgba(255,255,255,.72)!important;border-radius:12px!important;background:linear-gradient(135deg,#00aeec,#1686e8)!important;box-shadow:0 10px 28px rgba(0,174,236,.28)!important;color:#fff!important;font-size:14px!important;font-weight:720!important;cursor:pointer!important;transition:.18s ease!important}
      #${BUTTON_ID}:hover{transform:translateY(-2px)!important;box-shadow:0 14px 34px rgba(0,174,236,.34)!important}#${BUTTON_ID}:disabled{opacity:.62!important;cursor:wait!important;transform:none!important}
      #${OVERLAY_ID}{position:fixed!important;inset:0!important;z-index:2147483646!important;display:grid!important;place-items:center!important;padding:22px!important;background:rgba(11,17,26,.66)!important;backdrop-filter:blur(10px)!important;-webkit-backdrop-filter:blur(10px)!important;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif!important;color:#f6f9fc!important}
      #${OVERLAY_ID} *{box-sizing:border-box!important}.tabbit-bili-card{width:min(880px,calc(100vw - 28px))!important;max-height:min(800px,calc(100vh - 28px))!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:22px!important;background:linear-gradient(145deg,#202833,#121820)!important;box-shadow:0 32px 100px rgba(0,0,0,.48)!important}
      .tabbit-bili-head{display:flex!important;justify-content:space-between!important;gap:16px!important;padding:23px 24px 15px!important}.tabbit-bili-kicker{margin:0 0 7px!important;color:#54d7ff!important;font-size:11px!important;font-weight:800!important;letter-spacing:.12em!important}.tabbit-bili-head h2{margin:0!important;color:#fff!important;font-size:23px!important}.tabbit-bili-head p{margin:8px 0 0!important;max-width:650px!important;color:rgba(255,255,255,.61)!important;font-size:13px!important;line-height:1.6!important}.tabbit-bili-close{appearance:none!important;width:35px!important;height:35px!important;border:0!important;border-radius:50%!important;background:rgba(255,255,255,.08)!important;color:#fff!important;font-size:22px!important;cursor:pointer!important}
      .tabbit-bili-body{min-height:0!important;overflow:auto!important;padding:8px 24px 24px!important}.tabbit-bili-actions{display:flex!important;justify-content:flex-end!important;gap:10px!important;padding:16px 24px 22px!important;border-top:1px solid rgba(255,255,255,.08)!important}.tabbit-bili-action{appearance:none!important;min-width:116px!important;height:48px!important;padding:0 20px!important;border:0!important;border-radius:13px!important;background:rgba(255,255,255,.09)!important;color:#fff!important;font-size:14px!important;font-weight:680!important;cursor:pointer!important}.tabbit-bili-action.primary{background:linear-gradient(135deg,#00aeec,#4bcfff)!important}.tabbit-bili-action.danger{color:#ff9bad!important;background:rgba(251,114,153,.13)!important}.tabbit-bili-action:disabled{opacity:.42!important;cursor:default!important}
      .tabbit-bili-tabs{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important;margin-bottom:17px!important;padding:5px!important;border-radius:14px!important;background:rgba(255,255,255,.055)!important}.tabbit-bili-tab{appearance:none!important;height:46px!important;border:0!important;border-radius:11px!important;background:transparent!important;color:rgba(255,255,255,.50)!important;font-weight:700!important;cursor:pointer!important}.tabbit-bili-tab[aria-selected="true"]{background:rgba(0,174,236,.16)!important;color:#fff!important}.tabbit-bili-pane[hidden]{display:none!important}
      .tabbit-bili-label{display:block!important;margin:0 0 8px!important;color:rgba(255,255,255,.8)!important;font-size:13px!important;font-weight:680!important}.tabbit-bili-query,.tabbit-bili-input,.tabbit-bili-select{width:100%!important;border:1px solid rgba(255,255,255,.12)!important;border-radius:13px!important;outline:0!important;background:rgba(255,255,255,.07)!important;color:#fff!important;font:14px/1.55 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif!important}.tabbit-bili-query{min-height:108px!important;padding:13px 14px!important;resize:vertical!important}.tabbit-bili-input,.tabbit-bili-select{height:48px!important;padding:0 13px!important}.tabbit-bili-query:focus,.tabbit-bili-input:focus,.tabbit-bili-select:focus{border-color:#00aeec!important;box-shadow:0 0 0 3px rgba(0,174,236,.10)!important}.tabbit-bili-query::placeholder,.tabbit-bili-input::placeholder{color:rgba(255,255,255,.32)!important}
      .tabbit-bili-grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:12px!important;margin-top:14px!important}.tabbit-bili-option{padding:15px!important;border:1px solid rgba(255,255,255,.09)!important;border-radius:15px!important;background:rgba(255,255,255,.03)!important}.tabbit-bili-choice-group{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}.tabbit-bili-choice{appearance:none!important;min-height:66px!important;padding:10px 13px!important;border:1px solid rgba(255,255,255,.10)!important;border-radius:12px!important;background:rgba(255,255,255,.04)!important;color:rgba(255,255,255,.60)!important;text-align:left!important;cursor:pointer!important}.tabbit-bili-choice[aria-pressed="true"]{border-color:rgba(0,174,236,.72)!important;background:rgba(0,174,236,.13)!important;color:#fff!important}.tabbit-bili-choice strong,.tabbit-bili-choice span{display:block!important}.tabbit-bili-choice span{margin-top:4px!important;font-size:11px!important;color:rgba(255,255,255,.44)!important}.tabbit-bili-switch{display:flex!important;align-items:center!important;gap:8px!important;min-height:40px!important;color:rgba(255,255,255,.72)!important;font-size:13px!important}.tabbit-bili-switch input{width:16px!important;height:16px!important;accent-color:#00aeec!important}
      .tabbit-bili-note{margin-top:13px!important;padding:12px 13px!important;border-radius:12px!important;background:rgba(0,174,236,.07)!important;color:rgba(255,255,255,.53)!important;font-size:12px!important;line-height:1.55!important}.tabbit-bili-progress{height:8px!important;overflow:hidden!important;border-radius:999px!important;background:rgba(255,255,255,.08)!important}.tabbit-bili-progress span{display:block!important;width:var(--progress,6%)!important;height:100%!important;border-radius:inherit!important;background:linear-gradient(90deg,#00aeec,#fb7299)!important;transition:width .25s ease!important}.tabbit-bili-log{margin:13px 0 0!important;color:rgba(255,255,255,.67)!important;font-size:13px!important;line-height:1.6!important}
      .tabbit-bili-stats{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:9px!important;margin-bottom:14px!important}.tabbit-bili-stat{padding:11px!important;border-radius:13px!important;background:rgba(255,255,255,.055)!important}.tabbit-bili-stat span{display:block!important;color:rgba(255,255,255,.43)!important;font-size:11px!important}.tabbit-bili-stat b{display:block!important;margin-top:4px!important;color:#fff!important;font-size:20px!important}.tabbit-bili-summary{margin:0 0 13px!important;color:rgba(255,255,255,.64)!important;font-size:13px!important;line-height:1.6!important}.tabbit-bili-list{display:grid!important;gap:8px!important;margin:0!important;padding:0!important;list-style:none!important}.tabbit-bili-item{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:12px!important;align-items:start!important;padding:12px 13px!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:13px!important;background:rgba(255,255,255,.03)!important}.tabbit-bili-item.is-off{opacity:.42!important}.tabbit-bili-item h4{margin:0!important;color:rgba(255,255,255,.91)!important;font-size:13px!important;line-height:1.45!important}.tabbit-bili-item p{margin:4px 0 0!important;color:rgba(255,255,255,.46)!important;font-size:12px!important;line-height:1.45!important}.tabbit-bili-check{display:grid!important;grid-template-columns:20px minmax(0,1fr)!important;gap:10px!important;cursor:pointer!important}.tabbit-bili-check input{width:17px!important;height:17px!important;margin-top:2px!important;accent-color:#00aeec!important}.tabbit-bili-badge{display:inline-flex!important;align-items:center!important;min-height:25px!important;padding:0 9px!important;border-radius:999px!important;background:rgba(0,174,236,.11)!important;color:#75dcff!important;font-size:11px!important;white-space:nowrap!important}.tabbit-bili-remove{appearance:none!important;border:0!important;background:transparent!important;color:rgba(255,255,255,.42)!important;font-size:19px!important;cursor:pointer!important}.tabbit-bili-tools{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin-bottom:11px!important}.tabbit-bili-tools p{margin:0!important;color:rgba(255,255,255,.60)!important;font-size:13px!important}.tabbit-bili-mini{appearance:none!important;min-height:31px!important;padding:0 10px!important;border:1px solid rgba(255,255,255,.1)!important;border-radius:9px!important;background:rgba(255,255,255,.05)!important;color:rgba(255,255,255,.7)!important;cursor:pointer!important}
      @media(max-width:680px){.tabbit-bili-grid{grid-template-columns:1fr!important}.tabbit-bili-stats{grid-template-columns:1fr 1fr!important}#${HOST_ID}{right:14px!important;top:86px!important}}
    `;
    document.head.appendChild(style);
  }

  function isFavoritesPage() {
    if (config.testMode) return true;
    if (location.hostname !== 'space.bilibili.com') return false;
    return /^\/\d+(?:\/favlist)?\/?$/.test(location.pathname) && new URL(location.href).searchParams.has('fid');
  }

  function getPageContext() {
    const url = new URL(location.href);
    const uid = location.pathname.match(/^\/(\d+)(?:\/favlist)?/)?.[1] || cleanText(window.__INITIAL_STATE__?.mid);
    const sourceFolderId = cleanText(url.searchParams.get('fid'));
    const folderType = cleanText(url.searchParams.get('ftype') || 'create');
    if (!config.testMode && !uid) throw new Error('没有识别到空间 UID，请在自己的 B 站收藏页运行。');
    if (!sourceFolderId) throw new Error('当前没有选中收藏夹，请先在左侧打开一个收藏夹。');
    if (!config.testMode && folderType && folderType !== 'create') throw new Error('只能整理“我创建的收藏夹”，不能改动他人的收藏夹。');
    return { uid: uid || '10001', sourceFolderId, folderType, href: location.href };
  }

  function setButtonLoading(loading, label) {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = !!loading;
    button.textContent = loading ? (label || '处理中…') : 'AI 整理 B 站收藏';
  }

  function mountButton() {
    if (!isFavoritesPage()) {
      document.getElementById(HOST_ID)?.remove();
      return;
    }
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = HOST_ID;
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.textContent = 'AI 整理 B 站收藏';
      button.addEventListener('click', openStartSheet);
      host.appendChild(button);
      document.body.appendChild(host);
    }
    setButtonLoading(state.running || state.organizing, state.organizing ? '整理中…' : '扫描中…');
  }

  function closeOverlay() {
    if ((state.running || state.organizing) && !state.cancelled) state.cancelled = true;
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function renderShell(kicker, title, description, bodyHtml, actionsHtml) {
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `<section class="tabbit-bili-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="tabbit-bili-head"><div><p class="tabbit-bili-kicker">${escapeHtml(kicker)}</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><button class="tabbit-bili-close" type="button" aria-label="关闭">×</button></header>
      <div class="tabbit-bili-body">${bodyHtml}</div><footer class="tabbit-bili-actions">${actionsHtml}</footer></section>`;
    overlay.querySelector('.tabbit-bili-close')?.addEventListener('click', closeOverlay);
    document.body.appendChild(overlay);
    return overlay;
  }

  function numericOptions(values, current, suffix = '') {
    const normalized = Array.from(new Set([...values, Number(current)])).filter(Number.isFinite).sort((a, b) => a - b);
    return normalized.map(value => `<option value="${value}" ${value === Number(current) ? 'selected' : ''}>${value}${suffix}</option>`).join('');
  }

  function openStartSheet() {
    if (state.running || state.organizing) return;
    let context;
    try { context = getPageContext(); } catch (error) { renderError(error); return; }
    state.context = context;
    const overlay = renderShell('TABBIT · BILIBILI FAVORITES', 'AI 智能整理 B 站收藏', '读取当前收藏夹的标题、简介和 UP 主，先生成可编辑计划；确认前不会修改任何收藏。', `
      <div class="tabbit-bili-tabs"><button class="tabbit-bili-tab" data-mode="auto" aria-selected="${state.mode === 'auto'}">自动分类</button><button class="tabbit-bili-tab" data-mode="filter" aria-selected="${state.mode === 'filter'}">按需求筛选</button></div>
      <section class="tabbit-bili-pane" data-pane="auto" ${state.mode === 'auto' ? '' : 'hidden'}><div class="tabbit-bili-note" style="margin-top:0">AI 会参考已有收藏夹，优先复用合理分类；缺失的分类会在确认后新建。每个分组都可以单独取消。</div></section>
      <section class="tabbit-bili-pane" data-pane="filter" ${state.mode === 'filter' ? '' : 'hidden'}><label class="tabbit-bili-label" for="tabbit-bili-query">你想整理什么内容？</label><textarea id="tabbit-bili-query" class="tabbit-bili-query" placeholder="例如：筛选 AI Agent、自动化工作流和大模型教程，整理到一个收藏夹">${escapeHtml(state.query)}</textarea></section>
      <div class="tabbit-bili-grid">
        <div class="tabbit-bili-option"><label class="tabbit-bili-label">扫描范围</label><div class="tabbit-bili-grid" style="margin:0"><select id="tabbit-bili-start" class="tabbit-bili-select">${numericOptions([0,100,300,500,1000,2000], state.startOffset, ' 起')}</select><select id="tabbit-bili-max" class="tabbit-bili-select">${numericOptions([100,300,500,1000,2000,5000], state.maxItems, ' 个')}</select></div></div>
        <div class="tabbit-bili-option"><label class="tabbit-bili-label">整理方式</label><div class="tabbit-bili-choice-group"><button class="tabbit-bili-choice" data-operation="move" aria-pressed="${state.operation === 'move'}"><strong>移动</strong><span>加入新分组并移出当前收藏夹</span></button><button class="tabbit-bili-choice" data-operation="copy" aria-pressed="${state.operation === 'copy'}"><strong>复制</strong><span>保留当前收藏夹，同时加入新分组</span></button></div></div>
        <div class="tabbit-bili-option" data-auto-option ${state.mode === 'auto' ? '' : 'hidden'}><label class="tabbit-bili-label">分类粒度</label><div class="tabbit-bili-choice-group"><button class="tabbit-bili-choice" data-granularity="coarse" aria-pressed="${state.autoGranularity === 'coarse'}"><strong>粗分类</strong><span>稳定、少而清晰</span></button><button class="tabbit-bili-choice" data-granularity="fine" aria-pressed="${state.autoGranularity === 'fine'}"><strong>细分类</strong><span>主题更具体</span></button></div><select id="tabbit-bili-categories" class="tabbit-bili-select" style="margin-top:9px">${numericOptions([5,10,15,20,30,50,100,200], state.maxCategories, ' 类上限')}</select></div>
        <div class="tabbit-bili-option"><label class="tabbit-bili-switch"><input id="tabbit-bili-private" type="checkbox" ${state.privateFolder ? 'checked' : ''}>新建收藏夹设为私密</label><div class="tabbit-bili-note" style="margin:7px 0 0">源收藏夹 ID：${escapeHtml(context.sourceFolderId)}。失效或证据不足的视频会保留在“待整理”，不会混入专业类目。</div></div>
      </div>`, '<button class="tabbit-bili-action" data-action="cancel">取消</button><button class="tabbit-bili-action primary" data-action="start">扫描并生成计划</button>');

    const setMode = mode => {
      state.mode = mode;
      overlay.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.mode === mode)));
      overlay.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== mode; });
      const autoOption = overlay.querySelector('[data-auto-option]');
      if (autoOption) autoOption.hidden = mode !== 'auto';
    };
    overlay.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
    overlay.querySelectorAll('[data-operation]').forEach(button => button.addEventListener('click', () => {
      state.operation = button.dataset.operation;
      overlay.querySelectorAll('[data-operation]').forEach(row => row.setAttribute('aria-pressed', String(row === button)));
    }));
    overlay.querySelectorAll('[data-granularity]').forEach(button => button.addEventListener('click', () => {
      state.autoGranularity = button.dataset.granularity;
      overlay.querySelectorAll('[data-granularity]').forEach(row => row.setAttribute('aria-pressed', String(row === button)));
    }));
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', closeOverlay);
    overlay.querySelector('[data-action="start"]')?.addEventListener('click', () => {
      state.query = cleanText(overlay.querySelector('#tabbit-bili-query')?.value);
      state.startOffset = clampInt(overlay.querySelector('#tabbit-bili-start')?.value, 0, 50000, 0);
      state.maxItems = clampInt(overlay.querySelector('#tabbit-bili-max')?.value, 1, 5000, config.maxItems);
      state.maxCategories = clampInt(overlay.querySelector('#tabbit-bili-categories')?.value, 2, 200, config.maxCategories);
      state.privateFolder = !!overlay.querySelector('#tabbit-bili-private')?.checked;
      if (state.mode === 'filter' && !state.query) { overlay.querySelector('#tabbit-bili-query')?.focus(); return; }
      runPlanner();
    });
  }

  function renderProgress(title, description) {
    const overlay = renderShell('正在处理', title, description, '<div class="tabbit-bili-progress"><span></span></div><p class="tabbit-bili-log">正在准备…</p>', '<button class="tabbit-bili-action danger" data-action="stop">停止</button>');
    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', () => { state.cancelled = true; });
    return overlay;
  }

  function updateProgress(percent, message) {
    const overlay = document.getElementById(OVERLAY_ID);
    overlay?.querySelector('.tabbit-bili-progress span')?.style.setProperty('--progress', `${Math.max(2, Math.min(100, Number(percent) || 0))}%`);
    const text = overlay?.querySelector('.tabbit-bili-log');
    if (text) text.textContent = message;
    log('info', 'progress', message, { percent });
  }

  function updateProgressMessage(message, level = 'info') {
    const text = document.getElementById(OVERLAY_ID)?.querySelector('.tabbit-bili-log');
    if (text) text.textContent = message;
    log(level, 'progress', message);
  }

  async function interruptibleDelay(ms, message) {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      if (state.cancelled) throw new Error('已停止整理');
      const seconds = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
      if (message && (seconds === Math.ceil(ms / 1000) || seconds % 5 === 0)) updateProgressMessage(`${message}（${seconds} 秒）`, 'warn');
      await sleep(Math.min(1000, Math.max(0, deadline - Date.now())));
    }
  }

  function renderError(error) {
    const overlay = renderShell(`未完成 · v${SCRIPT_VERSION}`, 'B 站收藏整理失败', errorText(error), `<div class="tabbit-bili-note" style="margin-top:0">请确认当前打开的是自己的“收藏”页面，已选中具体收藏夹，并保持登录状态。扫描与 AI 分析不会修改收藏；若修改阶段失败，已完成项会保留。若日志中的请求不是 ${escapeHtml(API_ORIGIN)}，说明浏览器仍在运行旧脚本副本。</div>`, '<button class="tabbit-bili-action primary" data-action="close">知道了</button>');
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', closeOverlay);
    log('error', 'error', errorText(error));
  }

  function csrfToken() {
    return document.cookie.match(/(?:^|;\s*)bili_jct=([^;]+)/)?.[1] || '';
  }

  async function apiJson(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const requestUrl = config.testMode ? new URL(path, location.href) : new URL(path, API_ORIGIN);
    const init = { method, credentials: 'include', headers: { Accept: 'application/json, text/plain, */*', ...(options.headers || {}) } };
    if (options.form) {
      const form = new URLSearchParams();
      Object.entries(options.form).forEach(([key, value]) => { if (value !== undefined && value !== null) form.set(key, String(value)); });
      init.body = form.toString();
      init.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    log('info', 'api-request', `${method} ${requestUrl.href}`, {
      scriptVersion: SCRIPT_VERSION,
      pageUrl: location.href,
      apiOrigin: requestUrl.origin
    });
    const response = await window.fetch.call(window, requestUrl.href, init);
    const responseText = await response.text();
    let payload;
    try {
      payload = responseText ? JSON.parse(responseText) : {};
    } catch (error) {
      throw new Error(`B 站接口返回了非 JSON：${method} ${response.url || requestUrl.href}；HTTP ${response.status}；${cleanText(responseText).slice(0, 240) || '空响应'}`);
    }
    log(response.ok ? 'info' : 'warn', 'api-response', `${method} ${response.url || requestUrl.href} -> HTTP ${response.status}`, {
      scriptVersion: SCRIPT_VERSION,
      requestUrl: requestUrl.href,
      responseUrl: response.url || '',
      status: response.status,
      biliCode: payload?.code,
      bodyPreview: cleanText(responseText).slice(0, 500)
    });
    if (!response.ok) throw new BilibiliApiError(`B 站接口 HTTP ${response.status}：${response.url || requestUrl.href}；${cleanText(responseText).slice(0, 180) || '空响应'}`, {
      status: response.status,
      biliCode: Number(payload?.code || 0),
      requestUrl: requestUrl.href,
      responseUrl: response.url || ''
    });
    if (Number(payload?.code || 0) !== 0) throw new BilibiliApiError(`${cleanText(payload?.message || payload?.msg) || `B 站接口错误 ${payload?.code}`}（${response.url || requestUrl.href}）`, {
      status: response.status,
      biliCode: Number(payload?.code || 0),
      requestUrl: requestUrl.href,
      responseUrl: response.url || ''
    });
    return payload;
  }

  function normalizeFolder(raw) {
    return { id: cleanText(raw?.id ?? raw?.fid ?? raw?.media_id), name: cleanText(raw?.title ?? raw?.name), count: Number(raw?.media_count ?? raw?.count ?? 0), raw };
  }

  async function listAllFolders(context = state.context) {
    let payload;
    try {
      payload = await callWithRetry(() => apiJson(`/x/v3/fav/folder/created/list-all?up_mid=${encodeURIComponent(context.uid)}&type=2`), '读取收藏夹');
    } catch (primaryError) {
      log('warn', 'folders-fallback', '收藏夹全量接口失败，切换分页接口', { error: errorText(primaryError) });
      payload = await callWithRetry(() => apiJson(`/x/v3/fav/folder/created/list?up_mid=${encodeURIComponent(context.uid)}&pn=1&ps=100&type=2`), '备用接口读取收藏夹');
    }
    let list = Array.isArray(payload?.data?.list) ? payload.data.list : Array.isArray(payload?.data) ? payload.data : [];
    if (!list.length) {
      try {
        const currentPayload = await callWithRetry(() => apiJson(`/x/v3/fav/folder/info?media_id=${encodeURIComponent(context.sourceFolderId)}`), '读取当前收藏夹信息', 0);
        if (currentPayload?.data) list = [currentPayload.data];
        log('warn', 'folders-fallback', '收藏夹列表为空，已用当前收藏夹信息继续', { sourceFolderId: context.sourceFolderId });
      } catch (currentError) {
        log('warn', 'folders-fallback', '当前收藏夹信息兜底也失败，将继续扫描视频', { error: errorText(currentError) });
      }
    }
    const folders = new Map();
    list.map(normalizeFolder).filter(item => item.id && item.name).forEach(item => folders.set(item.name, item));
    log('info', 'folders', `读取到 ${folders.size} 个收藏夹`, { sourceFolderId: context.sourceFolderId });
    return folders;
  }

  function normalizeItem(raw) {
    const aid = cleanText(raw?.id ?? raw?.aid ?? raw?.rid);
    const type = Number(raw?.type || 2);
    return {
      itemId: aid,
      aid,
      bvid: cleanText(raw?.bvid),
      type,
      title: cleanText(raw?.title) || (Number(raw?.attr) > 0 ? '已失效视频' : `视频 ${aid}`),
      intro: cleanText(raw?.intro).slice(0, 500),
      author: cleanText(raw?.upper?.name),
      upperId: cleanText(raw?.upper?.mid),
      duration: Number(raw?.duration || 0),
      cover: cleanText(raw?.cover),
      invalid: cleanText(raw?.title) === '已失效视频' || Number(raw?.attr || 0) > 0,
      href: raw?.bvid ? `https://www.bilibili.com/video/${raw.bvid}` : '',
      raw
    };
  }

  async function listFolderPage(folderId, pageNumber, pageSize = config.pageSize) {
    const query = new URLSearchParams({ media_id: folderId, pn: pageNumber, ps: pageSize, keyword: '', order: 'mtime', type: '0', tid: '0', platform: 'web' });
    return callWithRetry(() => apiJson(`/x/v3/fav/resource/list?${query}`), `读取收藏第 ${pageNumber} 页`);
  }

  async function scanCurrentFolder() {
    const selected = [];
    let discovered = 0;
    let total = Infinity;
    let page = 1;
    const seen = new Set();
    while (selected.length < state.maxItems && discovered < total && page <= 200) {
      if (state.cancelled) throw new Error('已停止整理');
      const payload = await listFolderPage(state.context.sourceFolderId, page);
      const data = payload?.data || {};
      const medias = Array.isArray(data.medias) ? data.medias : [];
      total = Number(data?.info?.media_count ?? data?.info?.count ?? total);
      for (const raw of medias) {
        const item = normalizeItem(raw);
        if (!item.itemId || seen.has(item.itemId)) continue;
        seen.add(item.itemId);
        const index = discovered;
        discovered += 1;
        if (index >= state.startOffset && selected.length < state.maxItems) selected.push(item);
      }
      updateProgress(8 + Math.min(38, Math.round(selected.length / Math.max(1, state.maxItems) * 38)), `收藏夹共 ${Number.isFinite(total) ? total : '…'} 个，已读取 ${discovered} 个，送入分析 ${selected.length}/${state.maxItems}`);
      if (!medias.length || data.has_more === false || data.hasMore === false || discovered >= total) break;
      page += 1;
    }
    return { items: selected, discoveredCount: discovered, totalCount: Number.isFinite(total) ? total : discovered, startOffset: state.startOffset };
  }

  function parseJsonResponse(value) {
    if (value && typeof value === 'object') return value;
    const text = String(value || '').trim();
    if (!text) throw new Error('LLMBridge 返回为空');
    try { return JSON.parse(text); } catch (error) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
      if (fenced) return JSON.parse(fenced);
      const start = text.indexOf('{'); const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
      throw error;
    }
  }

  function normalizeFolderName(value, fallback = '智能整理') {
    return (cleanText(value).replace(/[<>:"/\\|?*]/g, '').slice(0, 20) || fallback).slice(0, 20);
  }

  function formatDuration(seconds) {
    const value = Math.max(0, Number(seconds || 0));
    const minutes = Math.floor(value / 60);
    const rest = Math.floor(value % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
  }

  function itemRows(items, introLimit) {
    const effectiveIntroLimit = Number.isFinite(Number(introLimit))
      ? Math.max(40, Number(introLimit))
      : Math.max(100, Math.min(300, Math.floor(60000 / Math.max(1, items.length))));
    return items.map((item, index) => [
      index + 1,
      item.invalid ? '失效' : '有效',
      `UP=${item.author || '未知'}`,
      `时长=${formatDuration(item.duration)}`,
      `标题=${item.title}`,
      `简介=${cleanText(item.intro).slice(0, effectiveIntroLimit) || '无'}`
    ].join('\t')).join('\n');
  }

  function localFilter(query, items) {
    const stop = new Set(['收藏','收藏夹','视频','内容','整理','一个','相关','所有','把','的','和','与','或']);
    const words = cleanText(query).toLowerCase().split(/[\s,，、。；;：:！!？?\/|]+/).filter(word => word.length >= 2 && !stop.has(word));
    const matches = items.filter(item => words.some(word => `${item.title} ${item.intro} ${item.author}`.toLowerCase().includes(word))).slice(0, config.maxMatches).map(item => ({ ...item, reason: '标题或简介命中关键词' }));
    return { folderName: normalizeFolderName(words.slice(0, 3).join('·'), '智能筛选'), summary: '模型不可用，已使用本地关键词筛选。', matches, usedFallback: true };
  }

  async function analyzeFilter(items) {
    if (!(window.LLMBridge && typeof window.LLMBridge.chat === 'function')) return localFilter(state.query, items);
    const prompt = ['你是 B 站收藏整理助手。根据用户需求，从候选视频中筛选真正相关的条目，并建议一个简洁的收藏夹名称。','宁缺毋滥，只能依据标题、简介和 UP 主判断，不要补造内容。失效视频通常不要选。',`用户需求：${state.query}`,`最多返回 ${Math.min(config.maxMatches, items.length)} 项；收藏夹名不超过 20 个字符。`,'只返回 JSON：{"folderName":"名称","summary":"一句说明","matches":[{"i":1,"reason":"原因"}]}。i 是候选序号。','候选视频：',itemRows(items)].join('\n');
    try {
      const parsed = parseJsonResponse(await withTimeout(window.LLMBridge.chat(prompt, 'json'), 'LLMBridge 筛选', config.llmTimeoutMs));
      const seen = new Set(); const matches = [];
      for (const row of Array.isArray(parsed.matches) ? parsed.matches : []) {
        const item = items[Math.floor(Number(row.i ?? row.index)) - 1];
        if (!item || seen.has(item.itemId) || matches.length >= config.maxMatches) continue;
        seen.add(item.itemId); matches.push({ ...item, reason: cleanText(row.reason) || '符合筛选需求' });
      }
      return { folderName: normalizeFolderName(parsed.folderName || parsed.title, '智能筛选'), summary: cleanText(parsed.summary) || '已按需求完成筛选。', matches, usedFallback: false };
    } catch (error) {
      log('warn', 'llm-filter', 'AI 筛选失败，使用本地回退', { error: errorText(error) });
      return localFilter(state.query, items);
    }
  }

  const FINE_CATEGORIES = [
    'AI应用', '编程开发', '数码评测', '软件工具', '摄影摄像', '剪辑后期', '设计创意',
    '财经投资', '商业职场', '学习考试', '读书思考', '科学科普', '人文历史', '游戏攻略',
    '动漫番剧', '音乐舞蹈', '影视综艺', '鬼畜搞笑', '美食烹饪', '运动健身', '旅行户外',
    '生活技能', '家居手作', '汽车出行', '时尚美妆', '情感心理', '萌宠动物', '新闻资讯'
  ];
  const COARSE_CATEGORIES = [
    '科技数码', '知识学习', '创作设计', '财经职场', '游戏电竞', '动漫影视', '音乐舞蹈',
    '鬼畜娱乐', '美食烹饪', '运动健康', '旅行户外', '生活技能', '人文科普', '时尚生活'
  ];

  function categoryPolicy(existingNames = []) {
    const canonical = state.autoGranularity === 'fine' ? FINE_CATEGORIES : COARSE_CATEGORIES;
    const reusable = existingNames.filter(name => {
      const value = cleanText(name);
      const folder = state.folders.get(value);
      const isSource = folder?.id && cleanText(folder.id) === cleanText(state.context?.sourceFolderId);
      return value && !isSource && !['其他', '待整理', '默认收藏夹', '我的收藏'].includes(value)
        && value.length <= 10 && !/[与和及&＋+]/.test(value);
    });
    const allowed = Array.from(new Set([...canonical, ...reusable]));
    const modeHint = state.autoGranularity === 'fine'
      ? '采用适合长期收藏管理的细粒度主题，区分工具、教程、内容消费和兴趣领域。'
      : '采用稳定粗分类，优先按视频的主要用途和内容分区归档。';
    return { canonical, allowed, modeHint };
  }

  function normalizeCategoryName(value, allowedNames = []) {
    const raw = normalizeFolderName(value, '待整理');
    const legacy = {
      'AI与编程': '编程开发', '摄影与创作': '摄影摄像', '财经与商业': '财经投资',
      '游戏与娱乐': '游戏攻略', '学习与成长': '知识学习', '生活与健康': '生活技能',
      '其他': '待整理'
    };
    const name = legacy[raw] || raw;
    if (/[与和及&＋+]/.test(name)) return '待整理';
    if (allowedNames.length && !allowedNames.includes(name)) return '待整理';
    return name;
  }

  function localAutoPlan(items, existingNames) {
    const fineRules = [
      ['AI应用', /\bAI\b|人工智能|大模型|LLM|agent|提示词|工作流|生成式|AIGC/i],
      ['编程开发', /Python|JavaScript|TypeScript|Java|Go语言|Rust|编程|代码|开发|前端|后端|算法|数据库|Linux|nginx/i],
      ['数码评测', /手机|电脑|显卡|CPU|相机|耳机|键盘|数码|评测|装机/i],
      ['摄影摄像', /摄影|摄像|拍照|镜头|布光|构图|相机/i], ['剪辑后期', /剪辑|后期|调色|PR教程|Premiere|达芬奇|特效/i],
      ['设计创意', /设计|平面|UI|UX|字体|海报|插画|建模|Blender/i],
      ['财经投资', /股票|基金|金融|理财|量化|投资|交易|期货|ETF/i], ['商业职场', /商业|创业|营销|电商|运营|职场|面试|管理|品牌/i],
      ['游戏攻略', /游戏|攻略|实况|电竞|主机|Steam|通关|速通/i], ['动漫番剧', /动漫|动画|番剧|MAD|MMD|二次元|声优/i],
      ['音乐舞蹈', /音乐|歌曲|翻唱|演奏|钢琴|吉他|舞蹈|编舞|MV/i], ['影视综艺', /电影|影视|电视剧|综艺|纪录片|影评|解说/i],
      ['鬼畜搞笑', /鬼畜|搞笑|沙雕|整活|恶搞|抽象/i], ['美食烹饪', /美食|烹饪|做饭|菜谱|甜品|探店|饮食/i],
      ['运动健身', /健身|运动|跑步|滑雪|篮球|足球|训练|减脂|增肌/i], ['旅行户外', /旅行|旅游|户外|露营|徒步|骑行|Vlog/i],
      ['家居手作', /家居|装修|手工|DIY|木工|房间/i],
      ['汽车出行', /汽车|新能源车|驾驶|摩托|买车|试驾/i], ['时尚美妆', /穿搭|时尚|美妆|护肤|发型/i],
      ['情感心理', /情感|心理|恋爱|婚姻|沟通|焦虑/i], ['萌宠动物', /猫|狗|宠物|动物|萌宠/i],
      ['科学科普', /科普|科学|天文|生物|医学|实验|原理/i], ['人文历史', /历史|人文|文化|文学|社会|政治|地理/i],
      ['读书思考', /读书|书评|阅读|哲学|思维|认知/i], ['学习考试', /课程|学习|考试|考研|高考|英语|数学|物理|化学|教学/i],
      ['软件工具', /软件|工具|插件|效率|Notion|Obsidian|Excel|Office|安装|配置/i],
      ['新闻资讯', /新闻|资讯|时事|热点|发布会/i], ['生活技能', /生活|技巧|收纳|清洁|日常|经验|教程/i]
    ];
    const coarseMap = {
      AI应用: '科技数码', 编程开发: '科技数码', 数码评测: '科技数码', 软件工具: '科技数码', 摄影摄像: '创作设计', 剪辑后期: '创作设计', 设计创意: '创作设计',
      财经投资: '财经职场', 商业职场: '财经职场', 学习考试: '知识学习', 读书思考: '知识学习', 科学科普: '人文科普', 人文历史: '人文科普',
      游戏攻略: '游戏电竞', 动漫番剧: '动漫影视', 音乐舞蹈: '音乐舞蹈', 影视综艺: '动漫影视', 鬼畜搞笑: '鬼畜娱乐', 美食烹饪: '美食烹饪',
      运动健身: '运动健康', 旅行户外: '旅行户外', 生活技能: '生活技能', 家居手作: '生活技能', 汽车出行: '生活技能', 时尚美妆: '时尚生活',
      情感心理: '时尚生活', 萌宠动物: '生活技能', 新闻资讯: '人文科普'
    };
    const policy = categoryPolicy(existingNames);
    const assignments = items.map(item => {
      const text = `${item.title} ${item.intro} ${item.author}`;
      const hit = fineRules.find(([, pattern]) => pattern.test(text));
      const fineName = hit?.[0] || '待整理';
      const category = state.autoGranularity === 'fine' ? fineName : (coarseMap[fineName] || '待整理');
      return { ...item, category, reason: hit ? '标题、简介或 UP 主命中主题特征' : '暂未识别稳定主题' };
    });
    return buildAutoPlan(assignments, items, existingNames, true, policy.allowed);
  }

  function buildAutoPlan(assignments, items, existingNames, usedFallback, allowedNames = []) {
    const existing = new Map(existingNames.map(name => [cleanText(name).toLowerCase(), name]));
    const categoryMap = new Map(); const assigned = new Set();
    for (const row of assignments) {
      const item = row.itemId ? row : items[Math.floor(Number(row.i ?? row.index)) - 1];
      if (!item || assigned.has(item.itemId)) continue;
      assigned.add(item.itemId);
      let name = normalizeCategoryName(row.category || row.name, allowedNames);
      name = existing.get(name.toLowerCase()) || name;
      if (!categoryMap.has(name)) categoryMap.set(name, { name, items: [], selected: true, existing: existingNames.includes(name) });
      categoryMap.get(name).items.push({ ...item, category: name, reason: cleanText(row.reason) || '按主题归类' });
    }
    items.filter(item => !assigned.has(item.itemId)).forEach(item => {
      if (!categoryMap.has('待整理')) categoryMap.set('待整理', { name: '待整理', items: [], selected: true, existing: existingNames.includes('待整理') });
      categoryMap.get('待整理').items.push({ ...item, category: '待整理', reason: '模型未返回分类' });
    });
    let categories = Array.from(categoryMap.values()).sort((a, b) => b.items.length - a.items.length);
    const other = categories.find(row => row.name === '待整理');
    const regular = categories.filter(row => row !== other).slice(0, state.maxCategories);
    const overflow = categories.filter(row => row !== other).slice(state.maxCategories).flatMap(row => row.items);
    categories = regular;
    if (other || overflow.length) categories.push({ name: '待整理', items: [...(other?.items || []), ...overflow], selected: true, existing: existingNames.includes('待整理') });
    return { categories, usedFallback, analyzedCount: items.length };
  }

  function groupedAssignments(parsed) {
    const direct = Array.isArray(parsed?.assignments) ? parsed.assignments : Array.isArray(parsed?.items) ? parsed.items : [];
    if (direct.length) return direct;
    const rows = [];
    for (const group of Array.isArray(parsed?.groups) ? parsed.groups : []) {
      const indices = Array.isArray(group?.indices) ? group.indices : Array.isArray(group?.items) ? group.items : [];
      indices.forEach(index => rows.push({ i: index, category: group.category || group.name, reason: 'AI 按标题和简介归类' }));
    }
    return rows;
  }

  async function analyzeAuto(items, existingNames) {
    if (!(window.LLMBridge && typeof window.LLMBridge.chat === 'function')) return localAutoPlan(items, existingNames);
    const policy = categoryPolicy(existingNames);
    const prompt = [
      '你是专业的 B 站收藏策展助手。请一次性把所有候选视频归入稳定、互斥、符合 B 站用户检索习惯的收藏夹。',
      policy.modeHint,
      `只允许使用以下类目名称：${policy.allowed.join('、')}。最多使用其中 ${Math.min(state.maxCategories, policy.allowed.length)} 个类目；实在无法判断才使用“待整理”。`,
      '类目名必须是单一主题，禁止出现“XX与XX”“XX和XX”“XX及XX”或 &、+ 等并列式名称。',
      '判断时同时参考标题和简介：标题明确时以标题为主；标题含糊、营销化或与简介冲突时，以简介中的具体内容为主；UP 主仅作辅助证据。不要臆测视频正文。',
      '每个候选序号必须且只能出现一次。为避免长列表输出截断，请按类目聚合序号，不要逐条复述标题或原因。',
      '只返回 JSON：{"summary":"一句说明","groups":[{"category":"类目名","indices":[1,2,3]}]}。',
      '候选视频字段依次为：序号、状态、UP、时长、标题、简介。',
      '候选视频：', itemRows(items)
    ].join('\n');
    try {
      const parsed = parseJsonResponse(await withTimeout(window.LLMBridge.chat(prompt, 'json'), 'LLMBridge 自动分类', config.llmTimeoutMs));
      const rows = groupedAssignments(parsed);
      if (!rows.length) throw new Error('没有返回有效分类');
      const allowed = [...policy.allowed, '待整理'];
      const validRows = rows.filter(row => allowed.includes(normalizeFolderName(row.category || row.name, '待整理')));
      const covered = new Set();
      validRows.forEach(row => {
        if (row.itemId) covered.add(row.itemId);
        else {
          const item = items[Math.floor(Number(row.i ?? row.index)) - 1];
          if (item) covered.add(item.itemId);
        }
      });
      const missing = items.filter(item => !covered.has(item.itemId));
      if (missing.length) {
        log('warn', 'llm-auto-coverage', `AI 返回缺少 ${missing.length} 个候选，已用本地专业规则补齐`, { returned: covered.size, total: items.length });
        const fallback = localAutoPlan(missing, existingNames);
        fallback.categories.forEach(category => category.items.forEach(item => validRows.push({ ...item, category: category.name })));
      }
      return buildAutoPlan(validRows, items, existingNames, false, allowed);
    } catch (error) {
      log('warn', 'llm-auto', 'AI 自动分类失败，使用本地回退', { error: errorText(error) });
      return localAutoPlan(items, existingNames);
    }
  }

  function statsHtml(scan, extraLabel, extraValue) {
    return `<div class="tabbit-bili-stats"><div class="tabbit-bili-stat"><span>收藏夹总数</span><b>${scan.totalCount}</b></div><div class="tabbit-bili-stat"><span>已发现</span><b>${scan.discoveredCount}</b></div><div class="tabbit-bili-stat"><span>送入分析</span><b>${scan.items.length}</b></div><div class="tabbit-bili-stat"><span>${escapeHtml(extraLabel)}</span><b>${escapeHtml(extraValue)}</b></div></div>`;
  }

  function renderFilterPlan(scan, analysis) {
    state.analysis = analysis;
    const rows = analysis.matches.slice(0, 300).map(item => `<li class="tabbit-bili-item" data-id="${item.itemId}"><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(`${item.author || '未知 UP'} · ${item.reason}`)}</p></div><button class="tabbit-bili-remove" data-remove="${item.itemId}" aria-label="移除">×</button></li>`).join('');
    const overlay = renderShell(analysis.usedFallback ? '本地筛选结果' : 'AI 筛选完成', `找到 ${analysis.matches.length} 个匹配视频`, analysis.summary, `${statsHtml(scan, '筛选命中', analysis.matches.length)}<label class="tabbit-bili-label" for="tabbit-bili-folder-name">目标收藏夹</label><input id="tabbit-bili-folder-name" class="tabbit-bili-input" maxlength="20" value="${escapeHtml(analysis.folderName)}"><ul class="tabbit-bili-list" style="margin-top:13px">${rows || '<li class="tabbit-bili-item"><div><h4>没有匹配项</h4><p>可以返回调整筛选需求。</p></div></li>'}</ul>`, '<button class="tabbit-bili-action" data-action="back">重新设置</button><button class="tabbit-bili-action primary" data-action="organize">确认整理</button>');
    const button = overlay.querySelector('[data-action="organize"]'); if (button) button.disabled = !analysis.matches.length;
    overlay.querySelector('[data-action="back"]')?.addEventListener('click', openStartSheet);
    overlay.querySelectorAll('[data-remove]').forEach(remove => remove.addEventListener('click', () => {
      analysis.matches = analysis.matches.filter(item => item.itemId !== remove.dataset.remove); remove.closest('li')?.remove(); if (button) button.disabled = !analysis.matches.length;
    }));
    button?.addEventListener('click', () => { analysis.folderName = normalizeFolderName(overlay.querySelector('#tabbit-bili-folder-name')?.value, '智能筛选'); organizeAssignments(analysis.matches.map(item => ({ ...item, category: analysis.folderName }))); });
  }

  function renderAutoPlan(scan, plan) {
    state.autoPlan = plan;
    const rows = plan.categories.map((category, index) => `<li class="tabbit-bili-item" data-category-index="${index}"><label class="tabbit-bili-check"><input type="checkbox" checked data-category-check="${index}"><span><h4>${escapeHtml(category.name)} ${category.existing ? '<span class="tabbit-bili-badge">复用已有</span>' : ''}</h4><p>${escapeHtml(`${category.items.length} 个 · ${category.items.slice(0, 3).map(item => item.title).join(' / ')}`)}</p></span></label><span class="tabbit-bili-badge">${category.items.length}</span></li>`).join('');
    const overlay = renderShell(plan.usedFallback ? '本地分类计划' : 'AI 分类计划', `准备整理 ${plan.analyzedCount} 个视频`, `共 ${plan.categories.length} 个分组；${state.operation === 'move' ? '移动后会从当前收藏夹移除' : '复制后仍保留在当前收藏夹'}。`, `${statsHtml(scan, '分类分组', plan.categories.length)}<div class="tabbit-bili-tools"><p data-selection-summary>已选择 ${plan.categories.length} 个分组</p><div><button class="tabbit-bili-mini" data-select="all">全选</button> <button class="tabbit-bili-mini" data-select="none">全不选</button></div></div><ul class="tabbit-bili-list">${rows}</ul>`, '<button class="tabbit-bili-action" data-action="back">重新设置</button><button class="tabbit-bili-action primary" data-action="organize">确认整理</button>');
    const sync = () => {
      overlay.querySelectorAll('[data-category-check]').forEach(input => { plan.categories[Number(input.dataset.categoryCheck)].selected = input.checked; input.closest('li')?.classList.toggle('is-off', !input.checked); });
      const selected = plan.categories.filter(row => row.selected); const count = selected.reduce((sum, row) => sum + row.items.length, 0);
      const summary = overlay.querySelector('[data-selection-summary]'); if (summary) summary.textContent = `已选择 ${selected.length} 个分组、${count} 个视频`;
      const button = overlay.querySelector('[data-action="organize"]'); if (button) button.disabled = !count;
    };
    overlay.querySelectorAll('[data-category-check]').forEach(input => input.addEventListener('change', sync));
    overlay.querySelector('[data-select="all"]')?.addEventListener('click', () => { overlay.querySelectorAll('[data-category-check]').forEach(input => { input.checked = true; }); sync(); });
    overlay.querySelector('[data-select="none"]')?.addEventListener('click', () => { overlay.querySelectorAll('[data-category-check]').forEach(input => { input.checked = false; }); sync(); });
    overlay.querySelector('[data-action="back"]')?.addEventListener('click', openStartSheet);
    overlay.querySelector('[data-action="organize"]')?.addEventListener('click', () => { sync(); organizeAssignments(plan.categories.filter(row => row.selected).flatMap(row => row.items.map(item => ({ ...item, category: row.name })))); });
    sync();
  }

  async function guardedWrite(factory, label, details = {}) {
    try {
      return await withTimeout(factory(), label);
    } catch (error) {
      if (!isRateLimitError(error)) throw error;
      log('warn', 'write-rate-limit', 'B 站返回 412，暂停后仅重试当前写入一次', { ...details, label, cooldownMs: config.rateLimitCooldownMs });
      await interruptibleDelay(config.rateLimitCooldownMs, '触发 B 站访问保护，正在冷却后重试当前写入');
      return withTimeout(factory(), label);
    }
  }

  async function createFolder(name) {
    const token = csrfToken(); if (!token) throw new Error('没有读取到 B 站 CSRF 凭据，请确认已登录。');
    const payload = await guardedWrite(() => apiJson('/x/v3/fav/folder/add', { method: 'POST', form: { title: name, intro: '由 Tabbit AI 收藏整理生成', privacy: state.privateFolder ? 1 : 0, csrf: token, csrf_token: token } }), `创建收藏夹“${name}”`, { endpoint: '/x/v3/fav/folder/add', folderName: name });
    return normalizeFolder({ ...(payload?.data || {}), title: payload?.data?.title || name });
  }

  async function dealBatch(items, targetFolder) {
    if (!items.length || targetFolder.id === state.context.sourceFolderId) return { skipped: true };
    const token = csrfToken(); if (!token) throw new Error('没有读取到 B 站 CSRF 凭据，请确认已登录。');
    const resources = items.map(item => `${item.aid}:${item.type || 2}`).join(',');
    const endpoint = `/x/v3/fav/resource/${state.operation === 'move' ? 'move' : 'copy'}`;
    const label = `${state.operation === 'move' ? '批量移动' : '批量复制'} ${items.length} 个视频`;
    const request = () => apiJson(endpoint, {
      method: 'POST',
      form: {
        resources,
        src_media_id: state.context.sourceFolderId,
        tar_media_id: targetFolder.id,
        mid: state.context.uid,
        platform: 'web',
        csrf: token,
        csrf_token: token
      }
    });
    return guardedWrite(request, label, { endpoint, itemCount: items.length, targetFolderId: targetFolder.id });
  }

  async function verifyFolder(folderId, items) {
    const expected = new Set(items.map(item => item.itemId)); const found = new Set(); let page = 1;
    while (found.size < expected.size && page <= 200) {
      const payload = await listFolderPage(folderId, page); const data = payload?.data || {}; const medias = Array.isArray(data.medias) ? data.medias : [];
      medias.forEach(raw => { const id = cleanText(raw?.id ?? raw?.aid); if (expected.has(id)) found.add(id); });
      if (!medias.length || data.has_more === false || data.hasMore === false || medias.length < config.pageSize) break;
      page += 1;
    }
    return { verified: items.filter(item => found.has(item.itemId)), unverified: items.filter(item => !found.has(item.itemId)).map(item => ({ ...item, error: '接口返回成功，但目标收藏夹中未找到' })) };
  }

  async function organizeAssignments(assignments) {
    if (state.running || state.organizing || !assignments.length) return;
    state.organizing = true; state.cancelled = false; setButtonLoading(true, '整理中…');
    const result = { created: [], reused: [], moved: [], verified: [], unverified: [], failed: [], folders: [], rateLimited: false };
    renderProgress('正在执行收藏整理', `准备${state.operation === 'move' ? '移动' : '复制'} ${assignments.length} 个视频`);
    try {
      updateProgress(5, '正在刷新已有收藏夹'); let folders = await listAllFolders();
      const names = Array.from(new Set(assignments.map(item => normalizeFolderName(item.category, '待整理'))));
      let creationRateLimited = false;
      for (let index = 0; index < names.length; index += 1) {
        if (state.cancelled) break; const name = names[index];
        updateProgress(8 + Math.round(index / Math.max(1, names.length) * 15), `正在准备收藏夹 ${index + 1}/${names.length}：${name}`);
        if (folders.has(name)) { result.reused.push(name); continue; }
        try {
          let folder = await createFolder(name); if (!folder.id) { await sleep(450); folders = await listAllFolders(); folder = folders.get(name); }
          if (!folder?.id) throw new Error('创建后没有读取到收藏夹 ID'); folders.set(name, folder); result.created.push(name);
          if (index < names.length - 1 && config.writeBatchDelayMs) await interruptibleDelay(config.writeBatchDelayMs);
        } catch (error) {
          assignments.filter(item => item.category === name).forEach(item => result.failed.push({ ...item, error: `创建收藏夹失败：${errorText(error)}` }));
          if (isRateLimitError(error)) {
            result.rateLimited = true; creationRateLimited = true;
            log('error', 'write-rate-limit', '创建收藏夹重试后仍被 412 拒绝，立即熔断所有剩余写请求', { folderName: name, createdCount: result.created.length });
            break;
          }
        }
      }
      if (creationRateLimited) {
        const failedIds = new Set(result.failed.map(item => item.itemId));
        assignments.forEach(item => { if (!failedIds.has(item.itemId)) result.failed.push({ ...item, error: '未发送：创建收藏夹阶段触发 B 站 412 访问保护，已自动熔断后续写入。' }); });
      } else if (result.created.length && config.writeBatchDelayMs) {
        await interruptibleDelay(config.writeBatchDelayMs * 2, '收藏夹创建完成，正在等待 B 站写入窗口恢复');
      }
      const failedIds = new Set(result.failed.map(item => item.itemId));
      const actionable = result.rateLimited ? [] : assignments.filter(item => folders.get(item.category)?.id && !failedIds.has(item.itemId));
      const groupedActions = new Map();
      actionable.forEach(item => { if (!groupedActions.has(item.category)) groupedActions.set(item.category, []); groupedActions.get(item.category).push(item); });
      const totalBatches = Array.from(groupedActions.values()).reduce((sum, items) => sum + Math.ceil(items.length / config.writeBatchSize), 0);
      let completedItems = 0; let completedBatches = 0; let rateLimitError = null;
      batchLoop:
      for (const [name, items] of groupedActions.entries()) {
        const folder = folders.get(name);
        for (let offset = 0; offset < items.length; offset += config.writeBatchSize) {
          if (state.cancelled) break batchLoop;
          const batch = items.slice(offset, offset + config.writeBatchSize);
          updateProgress(24 + Math.round(completedItems / Math.max(1, actionable.length) * 62), `正在${state.operation === 'move' ? '批量移动' : '批量复制'} ${name}：${completedItems + 1}-${completedItems + batch.length}/${actionable.length}`);
          try {
            await dealBatch(batch, folder);
            result.moved.push(...batch);
          } catch (error) {
            const message = errorText(error);
            if (isRateLimitError(error)) {
              result.rateLimited = true; rateLimitError = error;
              const failedMessage = `B 站返回 412，已停止后续写入以避免扩大风控：${message}`;
              batch.forEach(item => { if (!failedIds.has(item.itemId)) { failedIds.add(item.itemId); result.failed.push({ ...item, error: failedMessage }); } });
              log('error', 'write-rate-limit', '当前批次重试后仍被 412 拒绝，立即熔断所有剩余写请求', { category: name, batchSize: batch.length, completedItems, totalItems: actionable.length });
              break batchLoop;
            }
            batch.forEach(item => { if (!failedIds.has(item.itemId)) { failedIds.add(item.itemId); result.failed.push({ ...item, error: message }); } });
          }
          completedItems += batch.length; completedBatches += 1;
          if (completedBatches < totalBatches && config.writeBatchDelayMs) await interruptibleDelay(config.writeBatchDelayMs);
        }
      }
      if (rateLimitError) {
        const movedIds = new Set(result.moved.map(item => item.itemId));
        actionable.forEach(item => {
          if (movedIds.has(item.itemId) || failedIds.has(item.itemId)) return;
          failedIds.add(item.itemId);
          result.failed.push({ ...item, error: '未发送：检测到 B 站 412 访问保护后已自动熔断。请等待数分钟再重试，已有空收藏夹会直接复用。' });
        });
      }
      if (config.verifyAfterOrganize && result.moved.length) {
        const grouped = new Map(); result.moved.forEach(item => { if (!grouped.has(item.category)) grouped.set(item.category, []); grouped.get(item.category).push(item); }); let done = 0;
        for (const [name, items] of grouped.entries()) {
          updateProgress(88 + Math.round(done / Math.max(1, grouped.size) * 10), `正在确认 ${name}（${items.length} 个）`);
          try { const checked = await verifyFolder(folders.get(name).id, items); result.verified.push(...checked.verified); result.unverified.push(...checked.unverified); } catch (error) { result.unverified.push(...items.map(item => ({ ...item, error: `无法确认：${errorText(error)}` }))); }
          done += 1;
        }
      } else result.verified = result.moved.slice();
      names.forEach(name => result.folders.push({ name, count: assignments.filter(item => item.category === name).length, state: result.created.includes(name) ? '已创建' : result.reused.includes(name) ? '已复用' : '失败' }));
      updateProgress(100, state.cancelled ? '已停止，正在汇总已完成项' : '整理完成'); await sleep(220); renderResult(result);
    } catch (error) { renderError(error); }
    finally { state.organizing = false; setButtonLoading(false); mountButton(); }
  }

  function renderResult(result) {
    state.lastResult = result;
    const folders = result.folders.map(row => `<li class="tabbit-bili-item"><div><h4>${escapeHtml(row.name)}</h4><p>${row.count} 个视频</p></div><span class="tabbit-bili-badge">${escapeHtml(row.state)}</span></li>`).join('');
    const failures = result.failed.slice(0, 80).map(row => `<li class="tabbit-bili-item"><div><h4>${escapeHtml(row.title)}</h4><p>${escapeHtml(row.error)}</p></div><span class="tabbit-bili-badge">失败</span></li>`).join('');
    const resultTitle = result.rateLimited ? '已安全停止写入' : '整理完成';
    const resultDescription = result.rateLimited
      ? `检测到 B 站 412 访问保护，已立即熔断剩余请求。已确认 ${result.verified.length} 个；请等待数分钟后重新运行，已创建的空收藏夹会自动复用。`
      : `新建 ${result.created.length} 个收藏夹，复用 ${result.reused.length} 个；未确认 ${result.unverified.length} 个，失败 ${result.failed.length} 个。`;
    const overlay = renderShell(result.rateLimited ? '访问保护 · 已熔断' : '整理完成', resultTitle, resultDescription, `<div class="tabbit-bili-stats"><div class="tabbit-bili-stat"><span>已确认</span><b>${result.verified.length}</b></div><div class="tabbit-bili-stat"><span>未确认</span><b>${result.unverified.length}</b></div><div class="tabbit-bili-stat"><span>失败</span><b>${result.failed.length}</b></div><div class="tabbit-bili-stat"><span>收藏夹</span><b>${result.folders.length}</b></div></div><ul class="tabbit-bili-list">${folders}${failures}</ul>`, '<button class="tabbit-bili-action primary" data-action="done">完成</button>');
    overlay.querySelector('[data-action="done"]')?.addEventListener('click', () => { closeOverlay(); if (!config.testMode) location.reload(); });
  }

  async function runPlanner() {
    if (state.running || state.organizing) return;
    state.running = true; state.cancelled = false; setButtonLoading(true, '扫描中…');
    renderProgress(state.mode === 'auto' ? '正在扫描并自动分类' : '正在扫描并筛选', `最多读取 ${state.maxItems} 个视频，跳过前 ${state.startOffset} 个`);
    try {
      state.context = getPageContext(); updateProgress(3, '正在读取已有收藏夹'); state.folders = await listAllFolders();
      const source = Array.from(state.folders.values()).find(folder => folder.id === state.context.sourceFolderId);
      log('info', 'context', '已绑定当前收藏夹', { ...state.context, sourceFolderName: source?.name || '' });
      const scan = await scanCurrentFolder(); if (!scan.items.length) throw new Error(state.startOffset >= scan.totalCount ? `当前收藏夹只有 ${scan.totalCount} 个视频，未到达起点 ${state.startOffset}` : '当前收藏夹没有可整理的视频。');
      state.collected = scan.items; updateProgress(52, `已读取 ${scan.items.length} 个视频，正在进行一次合并 AI ${state.mode === 'auto' ? '分类' : '筛选'}`);
      if (state.mode === 'auto') { const plan = await analyzeAuto(scan.items, Array.from(state.folders.keys())); if (state.cancelled) throw new Error('已停止整理'); updateProgress(100, '分类计划已生成'); await sleep(180); renderAutoPlan(scan, plan); }
      else { const analysis = await analyzeFilter(scan.items); if (state.cancelled) throw new Error('已停止整理'); updateProgress(100, '筛选计划已生成'); await sleep(180); renderFilterPlan(scan, analysis); }
    } catch (error) { renderError(error); }
    finally { state.running = false; setButtonLoading(false); mountButton(); }
  }

  function scheduleMount() {
    clearTimeout(state.mountTimer); state.mountTimer = setTimeout(mountButton, 180);
  }

  function cleanup() {
    clearTimeout(state.mountTimer); state.observer?.disconnect(); document.getElementById(HOST_ID)?.remove(); document.getElementById(OVERLAY_ID)?.remove(); document.getElementById(STYLE_ID)?.remove();
    window.removeEventListener('popstate', scheduleMount); window.removeEventListener('hashchange', scheduleMount); delete window[API_KEY]; delete window[CLEANUP_KEY];
  }

  injectStyle(); mountButton();
  state.observer = new MutationObserver(scheduleMount); state.observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('popstate', scheduleMount); window.addEventListener('hashchange', scheduleMount);
  window[CLEANUP_KEY] = cleanup;
  window[API_KEY] = {
    version: SCRIPT_VERSION,
    open: openStartSheet,
    start(query) { state.mode = 'filter'; state.query = cleanText(query); return runPlanner(); },
    startAuto() { state.mode = 'auto'; return runPlanner(); },
    getState() { return { running: state.running, organizing: state.organizing, mode: state.mode, context: state.context, collectedCount: state.collected.length, logs: state.logs.slice(), lastResult: state.lastResult }; },
    cleanup
  };
  log('info', 'script-loaded', `B 站收藏智能整理 v${SCRIPT_VERSION} 已加载`, { apiOrigin: API_ORIGIN, pageUrl: location.href });
})();