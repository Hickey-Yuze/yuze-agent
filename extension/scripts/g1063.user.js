(function () {
  'use strict';

  const SCRIPT_ID = 'Yuze-douyin-favorites-organizer';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const HOST_ID = `${SCRIPT_ID}-host`;
  const BUTTON_ID = `${SCRIPT_ID}-button`;
  const OVERLAY_ID = `${SCRIPT_ID}-overlay`;
  const CLEANUP_KEY = '__YuzeDouyinFavoritesOrganizerCleanup';
  const API_KEY = '__YuzeDouyinFavoritesOrganizerApi';

  if (typeof window[CLEANUP_KEY] === 'function') window[CLEANUP_KEY]();

  const defaults = {
    maxItems: 500,
    startOffset: 0,
    maxMatches: 1000,
    maxCategories: 20,
    maxScrollRounds: 180,
    stableRoundsToStop: 5,
    scrollStepRatio: 0.84,
    scrollDelayMs: 620,
    llmTimeoutMs: 90000,
    apiTimeoutMs: 15000,
    apiRetryCount: 1,
    apiRetryDelayMs: 520,
    moveDelayMs: 160,
    verifyAfterMove: true,
    defaultPrivateFolder: true,
    defaultAutoGranularity: 'coarse',
    testMode: false
  };
  const overrides = window.__YuzeDouyinFavoritesOrganizerConfig || {};
  const config = {
    ...defaults,
    ...overrides,
    maxItems: Math.max(1, Math.min(5000, Math.floor(Number(overrides.maxItems) || defaults.maxItems))),
    startOffset: Math.max(0, Math.floor(Number(overrides.startOffset) || 0)),
    maxMatches: Math.max(1, Math.min(5000, Math.floor(Number(overrides.maxMatches) || defaults.maxMatches))),
    maxCategories: Math.max(2, Math.min(200, Math.floor(Number(overrides.maxCategories) || defaults.maxCategories))),
    maxScrollRounds: Math.max(10, Math.floor(Number(overrides.maxScrollRounds) || defaults.maxScrollRounds)),
    stableRoundsToStop: Math.max(2, Math.floor(Number(overrides.stableRoundsToStop) || defaults.stableRoundsToStop)),
    scrollDelayMs: Math.max(180, Math.floor(Number(overrides.scrollDelayMs) || defaults.scrollDelayMs)),
    llmTimeoutMs: Math.max(5000, Math.floor(Number(overrides.llmTimeoutMs) || defaults.llmTimeoutMs)),
    apiTimeoutMs: Math.max(3000, Math.floor(Number(overrides.apiTimeoutMs) || defaults.apiTimeoutMs)),
    apiRetryCount: Math.max(0, Math.min(3, Math.floor(Number(overrides.apiRetryCount ?? defaults.apiRetryCount)))),
    apiRetryDelayMs: Math.max(100, Math.floor(Number(overrides.apiRetryDelayMs) || defaults.apiRetryDelayMs)),
    moveDelayMs: Math.max(0, Math.floor(Number(overrides.moveDelayMs ?? defaults.moveDelayMs))),
    verifyAfterMove: overrides.verifyAfterMove === undefined ? defaults.verifyAfterMove : overrides.verifyAfterMove !== false,
    defaultPrivateFolder: overrides.defaultPrivateFolder === undefined
      ? defaults.defaultPrivateFolder
      : overrides.defaultPrivateFolder !== false,
    defaultAutoGranularity: overrides.defaultAutoGranularity === 'fine' ? 'fine' : 'coarse',
    testMode: overrides.testMode === true
  };

  const state = {
    observer: null,
    mountTimer: null,
    running: false,
    moving: false,
    cancelled: false,
    collected: [],
    analysis: null,
    autoPlan: null,
    apiModule: null,
    mode: 'filter',
    query: '',
    maxItems: config.maxItems,
    startOffset: config.startOffset,
    maxCategories: config.maxCategories,
    autoGranularity: config.defaultAutoGranularity,
    privateFolder: config.defaultPrivateFolder,
    lastResult: null
  };

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function visible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function errorText(error) {
    if (!error) return '未知错误';
    return cleanText(error.message || error.status_msg || error.statusMsg || error);
  }

  function withTimeout(promise, label, timeoutMs = config.apiTimeoutMs) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(`${label}超过 ${Math.round(timeoutMs / 1000)} 秒`)), timeoutMs);
      })
    ]).finally(() => clearTimeout(timer));
  }

  async function callWithRetry(factory, label, retryCount = config.apiRetryCount) {
    let lastError = null;
    for (let attempt = 0; attempt <= retryCount; attempt += 1) {
      try {
        return await withTimeout(factory(), label);
      } catch (error) {
        lastError = error;
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
      #${HOST_ID} {
        display: inline-flex !important;
        align-items: center !important;
        margin-right: 10px !important;
        vertical-align: middle !important;
        position: relative !important;
        z-index: 20 !important;
      }
      #${HOST_ID}.Yuze-dy-fixed {
        position: fixed !important;
        top: 92px !important;
        right: 26px !important;
        z-index: 2147483000 !important;
        margin: 0 !important;
      }
      #${BUTTON_ID} {
        appearance: none !important;
        height: 36px !important;
        padding: 0 15px !important;
        border: 1px solid rgba(255, 255, 255, .16) !important;
        border-radius: 10px !important;
        background: linear-gradient(135deg, rgba(37, 244, 238, .18), rgba(254, 44, 85, .20)), #202126 !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, .22), inset 0 1px 0 rgba(255, 255, 255, .10) !important;
        color: #f7f7f8 !important;
        font: 650 14px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: .01em !important;
        cursor: pointer !important;
        white-space: nowrap !important;
        transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease !important;
      }
      #${BUTTON_ID}:hover { transform: translateY(-1px) !important; box-shadow: 0 10px 28px rgba(0, 0, 0, .28) !important; }
      #${BUTTON_ID}:disabled { cursor: wait !important; opacity: .62 !important; transform: none !important; }
      #${OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483646 !important;
        display: grid !important;
        place-items: center !important;
        padding: 24px !important;
        background: rgba(3, 4, 7, .68) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
        color: #f7f7f8 !important;
        font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", sans-serif !important;
      }
      #${OVERLAY_ID} * { box-sizing: border-box !important; }
      .Yuze-dy-card {
        width: min(820px, calc(100vw - 32px)) !important;
        max-height: min(760px, calc(100vh - 32px)) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        border: 1px solid rgba(255, 255, 255, .14) !important;
        border-radius: 22px !important;
        background: linear-gradient(150deg, rgba(37, 39, 47, .98), rgba(18, 19, 24, .99)) !important;
        box-shadow: 0 30px 90px rgba(0, 0, 0, .48) !important;
      }
      .Yuze-dy-head { display: flex !important; align-items: flex-start !important; justify-content: space-between !important; gap: 16px !important; padding: 23px 24px 15px !important; }
      .Yuze-dy-kicker { margin: 0 0 7px !important; color: #25f4ee !important; font-size: 12px !important; font-weight: 750 !important; letter-spacing: .08em !important; }
      .Yuze-dy-head h2 { margin: 0 !important; color: #fff !important; font-size: 22px !important; line-height: 1.25 !important; }
      .Yuze-dy-head p { margin: 8px 0 0 !important; max-width: 570px !important; color: rgba(255,255,255,.62) !important; font-size: 13px !important; line-height: 1.6 !important; }
      .Yuze-dy-close { appearance: none !important; width: 34px !important; height: 34px !important; border: 0 !important; border-radius: 50% !important; background: rgba(255,255,255,.08) !important; color: #fff !important; font-size: 22px !important; cursor: pointer !important; }
      .Yuze-dy-body { min-height: 0 !important; overflow: auto !important; padding: 8px 24px 24px !important; }
      .Yuze-dy-mode-tabs { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 6px !important; margin: 0 0 18px !important; padding: 5px !important; border-radius: 14px !important; background: rgba(255,255,255,.055) !important; }
      .Yuze-dy-mode-tab { appearance: none !important; height: 46px !important; border: 0 !important; border-radius: 11px !important; background: transparent !important; color: rgba(255,255,255,.53) !important; font-size: 14px !important; font-weight: 680 !important; cursor: pointer !important; }
      .Yuze-dy-mode-tab[aria-selected="true"] { background: rgba(255,255,255,.11) !important; color: #fff !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.09) !important; }
      .Yuze-dy-mode-pane[hidden] { display: none !important; }
      .Yuze-dy-auto-intro { margin: 0 0 14px !important; padding: 13px 14px !important; border: 1px solid rgba(37,244,238,.13) !important; border-radius: 13px !important; background: rgba(37,244,238,.055) !important; color: rgba(255,255,255,.68) !important; font-size: 13px !important; line-height: 1.65 !important; }
      .Yuze-dy-label { display: block !important; margin: 0 0 9px !important; color: rgba(255,255,255,.82) !important; font-size: 14px !important; font-weight: 650 !important; }
      .Yuze-dy-query, .Yuze-dy-input, .Yuze-dy-select {
        width: 100% !important;
        border: 1px solid rgba(255,255,255,.13) !important;
        border-radius: 13px !important;
        outline: none !important;
        background: rgba(255,255,255,.07) !important;
        color: #fff !important;
        font: 14px/1.55 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif !important;
      }
      .Yuze-dy-query { min-height: 112px !important; resize: vertical !important; padding: 13px 14px !important; }
      .Yuze-dy-input, .Yuze-dy-select { height: 50px !important; padding: 0 14px !important; font-size: 15px !important; }
      .Yuze-dy-query:focus, .Yuze-dy-input:focus, .Yuze-dy-select:focus { border-color: rgba(37,244,238,.72) !important; box-shadow: 0 0 0 3px rgba(37,244,238,.09) !important; }
      .Yuze-dy-query::placeholder, .Yuze-dy-input::placeholder { color: rgba(255,255,255,.34) !important; }
      .Yuze-dy-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 12px !important; margin-top: 15px !important; }
      .Yuze-dy-option { padding: 16px !important; border: 1px solid rgba(255,255,255,.10) !important; border-radius: 16px !important; background: rgba(255,255,255,.035) !important; }
      .Yuze-dy-choice-group { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 9px !important; }
      .Yuze-dy-choice { appearance: none !important; min-height: 68px !important; padding: 11px 14px !important; border: 1px solid rgba(255,255,255,.11) !important; border-radius: 13px !important; background: rgba(255,255,255,.045) !important; color: rgba(255,255,255,.64) !important; text-align: left !important; cursor: pointer !important; transition: border-color .16s ease, background .16s ease, transform .16s ease !important; }
      .Yuze-dy-choice:hover { transform: translateY(-1px) !important; border-color: rgba(37,244,238,.30) !important; }
      .Yuze-dy-choice[aria-pressed="true"] { border-color: rgba(37,244,238,.62) !important; background: linear-gradient(135deg, rgba(37,244,238,.15), rgba(254,44,85,.08)) !important; color: #fff !important; box-shadow: inset 0 1px 0 rgba(255,255,255,.08), 0 8px 22px rgba(0,0,0,.14) !important; }
      .Yuze-dy-choice strong { display: block !important; font-size: 14px !important; line-height: 1.25 !important; }
      .Yuze-dy-choice span { display: block !important; margin-top: 5px !important; color: rgba(255,255,255,.48) !important; font-size: 11px !important; line-height: 1.35 !important; }
      .Yuze-dy-choice[aria-pressed="true"] span { color: rgba(255,255,255,.68) !important; }
      .Yuze-dy-switch { display: flex !important; align-items: center !important; gap: 9px !important; min-height: 42px !important; color: rgba(255,255,255,.78) !important; font-size: 13px !important; }
      .Yuze-dy-switch input { accent-color: #25f4ee !important; width: 16px !important; height: 16px !important; }
      .Yuze-dy-actions { display: flex !important; justify-content: flex-end !important; gap: 10px !important; padding: 16px 24px 22px !important; border-top: 1px solid rgba(255,255,255,.08) !important; }
      .Yuze-dy-action { appearance: none !important; min-width: 116px !important; height: 48px !important; padding: 0 20px !important; border: 0 !important; border-radius: 13px !important; color: #fff !important; background: rgba(255,255,255,.09) !important; font-size: 15px !important; font-weight: 650 !important; cursor: pointer !important; }
      .Yuze-dy-action.primary { color: #090a0c !important; background: linear-gradient(135deg, #25f4ee, #75fff8) !important; }
      .Yuze-dy-action.danger { background: rgba(254,44,85,.16) !important; color: #ff8ca3 !important; }
      .Yuze-dy-action:disabled { opacity: .45 !important; cursor: default !important; }
      .Yuze-dy-progress { height: 8px !important; overflow: hidden !important; border-radius: 999px !important; background: rgba(255,255,255,.08) !important; }
      .Yuze-dy-progress span { display: block !important; width: var(--Yuze-progress, 8%) !important; height: 100% !important; border-radius: inherit !important; background: linear-gradient(90deg, #25f4ee, #fe2c55) !important; transition: width .25s ease !important; }
      .Yuze-dy-progress-log { margin: 13px 0 0 !important; color: rgba(255,255,255,.68) !important; font-size: 13px !important; line-height: 1.6 !important; }
      .Yuze-dy-stats { display: grid !important; grid-template-columns: repeat(3, 1fr) !important; gap: 10px !important; margin-bottom: 15px !important; }
      .Yuze-dy-stat { padding: 12px !important; border-radius: 14px !important; background: rgba(255,255,255,.055) !important; }
      .Yuze-dy-stat span { display: block !important; color: rgba(255,255,255,.46) !important; font-size: 11px !important; }
      .Yuze-dy-stat b { display: block !important; margin-top: 4px !important; color: #fff !important; font-size: 21px !important; }
      .Yuze-dy-folder-row { display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; gap: 12px !important; align-items: end !important; margin-bottom: 14px !important; }
      .Yuze-dy-summary { margin: 0 0 14px !important; color: rgba(255,255,255,.65) !important; font-size: 13px !important; line-height: 1.6 !important; }
      .Yuze-dy-list { display: grid !important; grid-template-columns: minmax(0, 1fr) !important; gap: 8px !important; margin: 0 !important; padding: 0 !important; list-style: none !important; }
      .Yuze-dy-item { display: grid !important; grid-template-columns: minmax(0, 1fr) auto !important; gap: 12px !important; align-items: center !important; padding: 12px 13px !important; border: 1px solid rgba(255,255,255,.08) !important; border-radius: 14px !important; background: rgba(255,255,255,.035) !important; }
      .Yuze-dy-item h4 { margin: 0 !important; color: rgba(255,255,255,.92) !important; font-size: 13px !important; line-height: 1.5 !important; }
      .Yuze-dy-item p { margin: 4px 0 0 !important; color: rgba(255,255,255,.46) !important; font-size: 12px !important; line-height: 1.45 !important; }
      .Yuze-dy-category-item { align-items: start !important; }
      .Yuze-dy-category-item.is-deselected { opacity: .48 !important; background: rgba(255,255,255,.018) !important; }
      .Yuze-dy-category-select { display: grid !important; grid-template-columns: 20px minmax(0, 1fr) !important; gap: 11px !important; align-items: start !important; min-width: 0 !important; cursor: pointer !important; }
      .Yuze-dy-category-select input { width: 18px !important; height: 18px !important; margin: 2px 0 0 !important; accent-color: #25f4ee !important; cursor: pointer !important; }
      .Yuze-dy-category-select input:disabled { cursor: default !important; }
      .Yuze-dy-category-item h4 { display: flex !important; align-items: center !important; gap: 8px !important; }
      .Yuze-dy-category-examples { margin-top: 7px !important; color: rgba(255,255,255,.48) !important; }
      .Yuze-dy-selection-tools { display: flex !important; align-items: center !important; justify-content: space-between !important; gap: 12px !important; margin: 0 0 12px !important; }
      .Yuze-dy-selection-tools p { margin: 0 !important; color: rgba(255,255,255,.62) !important; font-size: 13px !important; }
      .Yuze-dy-selection-actions { display: flex !important; gap: 7px !important; }
      .Yuze-dy-mini-action { appearance: none !important; min-height: 32px !important; padding: 0 11px !important; border: 1px solid rgba(255,255,255,.10) !important; border-radius: 9px !important; background: rgba(255,255,255,.055) !important; color: rgba(255,255,255,.72) !important; font-size: 12px !important; cursor: pointer !important; }
      .Yuze-dy-mini-action:hover { border-color: rgba(37,244,238,.32) !important; color: #fff !important; }
      .Yuze-dy-remove { appearance: none !important; border: 0 !important; background: transparent !important; color: rgba(255,255,255,.42) !important; cursor: pointer !important; font-size: 18px !important; }
      .Yuze-dy-badge { display: inline-flex !important; align-items: center !important; min-height: 26px !important; padding: 0 9px !important; border-radius: 999px !important; background: rgba(37,244,238,.10) !important; color: #7cfbf6 !important; font-size: 11px !important; white-space: nowrap !important; }
      .Yuze-dy-note { margin-top: 12px !important; padding: 11px 12px !important; border-radius: 12px !important; background: rgba(255,255,255,.04) !important; color: rgba(255,255,255,.48) !important; font-size: 12px !important; line-height: 1.55 !important; }
      @media (max-width: 640px) {
        #${OVERLAY_ID} { padding: 8px !important; }
        .Yuze-dy-card { width: calc(100vw - 16px) !important; max-height: calc(100vh - 16px) !important; border-radius: 17px !important; }
        .Yuze-dy-grid, .Yuze-dy-folder-row { grid-template-columns: 1fr !important; }
        .Yuze-dy-selection-tools { align-items: flex-start !important; flex-direction: column !important; }
        .Yuze-dy-head { padding: 18px 17px 12px !important; }
        .Yuze-dy-body { padding: 7px 17px 18px !important; }
        .Yuze-dy-actions { padding: 13px 17px 17px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function isFavoriteCollectionPage() {
    if (config.testMode) return true;
    return /(^|\.)douyin\.com$/i.test(location.hostname)
      && /\/user\/self/.test(location.pathname)
      && new URL(location.href).searchParams.get('showTab') === 'favorite_collection';
  }

  function selectedSubtabName() {
    const selected = Array.from(document.querySelectorAll('[role="tab"][aria-selected="true"]'))
      .map(element => cleanText(element.textContent))
      .find(text => /^(收藏夹|视频|音乐|合集|短剧)$/.test(text));
    if (selected) return selected;
    const value = new URL(location.href).searchParams.get('showSubTab');
    return value === 'video' ? '视频' : value === 'favorite_folder' ? '收藏夹' : '';
  }

  function isVideoSubtabActive() {
    return isFavoriteCollectionPage() && selectedSubtabName() === '视频';
  }

  function findExactVisibleText(text) {
    return Array.from(document.querySelectorAll('button, [role="button"], span, div'))
      .find(element => visible(element) && cleanText(element.textContent) === text);
  }

  function setButtonLoading(loading, label) {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = !!loading;
    button.textContent = loading ? (label || '处理中…') : 'AI整理收藏';
  }

  function mountButton() {
    injectStyle();
    const existing = document.getElementById(HOST_ID);
    if (!isVideoSubtabActive()) {
      existing?.remove();
      return;
    }
    if (existing?.isConnected) return;

    const host = document.createElement('span');
    host.id = HOST_ID;
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = 'AI整理收藏';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openStartSheet();
    });
    host.appendChild(button);

    const batchManage = findExactVisibleText('批量管理');
    if (batchManage?.parentElement) {
      batchManage.parentElement.insertBefore(host, batchManage);
    } else {
      host.classList.add('Yuze-dy-fixed');
      document.body.appendChild(host);
    }
    setButtonLoading(state.running || state.moving, state.moving ? '整理中…' : '扫描中…');
  }

  function closeOverlay() {
    if (state.running || state.moving) state.cancelled = true;
    document.getElementById(OVERLAY_ID)?.remove();
  }

  function renderShell(kicker, title, description, bodyHtml, actionsHtml) {
    document.getElementById(OVERLAY_ID)?.remove();
    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <section class="Yuze-dy-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <header class="Yuze-dy-head">
          <div><div class="Yuze-dy-kicker">${escapeHtml(kicker)}</div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div>
          <button class="Yuze-dy-close" type="button" data-action="close" aria-label="关闭">×</button>
        </header>
        <div class="Yuze-dy-body">${bodyHtml}</div>
        <footer class="Yuze-dy-actions">${actionsHtml}</footer>
      </section>`;
    overlay.addEventListener('click', event => {
      if (event.target === overlay && !state.running && !state.moving) closeOverlay();
    });
    overlay.querySelector('[data-action="close"]')?.addEventListener('click', closeOverlay);
    document.body.appendChild(overlay);
    return overlay;
  }

  function numericOptionHtml(values, currentValue, suffix) {
    const current = Math.max(0, Math.floor(Number(currentValue) || 0));
    const choices = Array.from(new Set([...values, current])).sort((left, right) => left - right);
    return choices.map(value => `<option value="${value}" ${value === current ? 'selected' : ''}>${value} ${suffix}</option>`).join('');
  }

  function openStartSheet() {
    if (state.running || state.moving) return;
    const overlay = renderShell(
      'DOUYIN FAVORITES',
      '选择一种收藏整理方式',
      '按需求筛选到一个收藏夹，或让 AI 为全部候选作品自动分类并创建多个收藏夹；确认前不会移动任何作品。',
      `<div class="Yuze-dy-mode-tabs" role="tablist" aria-label="整理模式">
         <button class="Yuze-dy-mode-tab" type="button" role="tab" data-mode="filter" aria-selected="${state.mode === 'filter'}">按需求筛选</button>
         <button class="Yuze-dy-mode-tab" type="button" role="tab" data-mode="auto" aria-selected="${state.mode === 'auto'}">自动分类</button>
       </div>
       <div class="Yuze-dy-mode-pane" data-pane="filter" ${state.mode === 'filter' ? '' : 'hidden'}>
         <label class="Yuze-dy-label" for="Yuze-dy-query">你想整理什么？</label>
         <textarea id="Yuze-dy-query" class="Yuze-dy-query" maxlength="500" placeholder="例如：把 AI Agent、机器人和芯片相关的视频整理到一个科技收藏夹">${escapeHtml(state.query)}</textarea>
       </div>
       <div class="Yuze-dy-mode-pane" data-pane="auto" ${state.mode === 'auto' ? '' : 'hidden'}>
         <p class="Yuze-dy-auto-intro">AI 会先读取已有收藏夹名称，再把每个作品归入一个稳定分类；优先复用已有收藏夹，并自动创建缺少的分组。“其他”只保留在预览中，不自动建组或移动。</p>
         <div class="Yuze-dy-grid">
           <div class="Yuze-dy-option"><div class="Yuze-dy-label" id="Yuze-dy-granularity-label">分类粒度</div><div class="Yuze-dy-choice-group" role="group" aria-labelledby="Yuze-dy-granularity-label"><button class="Yuze-dy-choice" type="button" data-granularity="coarse" aria-pressed="${state.autoGranularity === 'coarse'}"><strong>粗粒度</strong><span>合并为稳定大类</span></button><button class="Yuze-dy-choice" type="button" data-granularity="fine" aria-pressed="${state.autoGranularity === 'fine'}"><strong>细粒度</strong><span>保留具体主题</span></button></div></div>
           <div class="Yuze-dy-option"><label class="Yuze-dy-label" for="Yuze-dy-max-categories">分类上限</label><select id="Yuze-dy-max-categories" class="Yuze-dy-select">${numericOptionHtml([5, 10, 15, 20, 30, 50, 80, 100, 150, 200], state.maxCategories, '个分组')}</select></div>
         </div>
       </div>
       <div class="Yuze-dy-grid">
         <div class="Yuze-dy-option"><label class="Yuze-dy-label" for="Yuze-dy-limit">最多扫描</label><select id="Yuze-dy-limit" class="Yuze-dy-select">${numericOptionHtml([100, 200, 300, 500, 1000, 2000, 5000], state.maxItems, '个作品')}</select></div>
         <div class="Yuze-dy-option"><label class="Yuze-dy-label" for="Yuze-dy-offset">从第几个之后开始</label><input id="Yuze-dy-offset" class="Yuze-dy-input" type="number" min="0" max="10000" step="1" value="${state.startOffset}"></div>
       </div>
       <div class="Yuze-dy-note">扫描只读取标题、作者和作品链接；每次整理合并为一次结构化 LLMBridge 调用，不会逐条请求模型。</div>`,
      `<button class="Yuze-dy-action" type="button" data-action="cancel">取消</button><button class="Yuze-dy-action primary" type="button" data-action="start">${state.mode === 'auto' ? '开始自动分类' : '开始筛选'}</button>`
    );
    const selectMode = mode => {
      state.mode = mode === 'auto' ? 'auto' : 'filter';
      overlay.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-selected', String(button.dataset.mode === state.mode)));
      overlay.querySelectorAll('[data-pane]').forEach(pane => { pane.hidden = pane.dataset.pane !== state.mode; });
      const startButton = overlay.querySelector('[data-action="start"]');
      if (startButton) startButton.textContent = state.mode === 'auto' ? '开始自动分类' : '开始筛选';
      if (state.mode === 'filter') setTimeout(() => overlay.querySelector('#Yuze-dy-query')?.focus(), 0);
    };
    overlay.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => selectMode(button.dataset.mode)));
    overlay.querySelectorAll('[data-granularity]').forEach(button => {
      button.addEventListener('click', () => {
        state.autoGranularity = button.dataset.granularity === 'fine' ? 'fine' : 'coarse';
        overlay.querySelectorAll('[data-granularity]').forEach(option => option.setAttribute('aria-pressed', String(option.dataset.granularity === state.autoGranularity)));
      });
    });
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', closeOverlay);
    overlay.querySelector('[data-action="start"]')?.addEventListener('click', () => {
      const query = cleanText(overlay.querySelector('#Yuze-dy-query')?.value);
      if (state.mode === 'filter' && !query) {
        overlay.querySelector('#Yuze-dy-query')?.focus();
        return;
      }
      if (query) state.query = query;
      state.maxItems = Math.max(1, Number(overlay.querySelector('#Yuze-dy-limit')?.value) || config.maxItems);
      state.startOffset = Math.max(0, Math.floor(Number(overlay.querySelector('#Yuze-dy-offset')?.value) || 0));
      state.maxCategories = Math.max(2, Math.min(200, Number(overlay.querySelector('#Yuze-dy-max-categories')?.value) || config.maxCategories));
      state.autoGranularity = overlay.querySelector('[data-granularity][aria-pressed="true"]')?.dataset.granularity === 'fine' ? 'fine' : 'coarse';
      if (state.mode === 'auto') runAutoOrganizer();
      else runOrganizer(query);
    });
    if (state.mode === 'filter') setTimeout(() => overlay.querySelector('#Yuze-dy-query')?.focus(), 0);
  }

  function renderProgress(title, description) {
    return renderShell(
      '正在处理',
      title,
      description,
      '<div class="Yuze-dy-progress" style="--Yuze-progress:8%"><span></span></div><p class="Yuze-dy-progress-log" data-role="progress-log">准备开始…</p>',
      '<button class="Yuze-dy-action danger" type="button" data-action="stop">停止</button>'
    );
  }

  function updateProgress(percent, message) {
    const overlay = document.getElementById(OVERLAY_ID);
    overlay?.querySelector('.Yuze-dy-progress')?.style.setProperty('--Yuze-progress', `${Math.max(4, Math.min(100, Math.round(percent)))}%`);
    const log = overlay?.querySelector('[data-role="progress-log"]');
    if (log) log.textContent = message;
  }

  function renderError(error) {
    const overlay = renderShell(
      '未完成',
      '收藏整理失败',
      errorText(error),
      '<div class="Yuze-dy-note">收藏作品不会因扫描或 AI 分析被修改。若错误发生在移动阶段，请以结果列表和收藏夹页面为准。</div>',
      '<button class="Yuze-dy-action primary" type="button" data-action="done">知道了</button>'
    );
    overlay.querySelector('[data-action="done"]')?.addEventListener('click', closeOverlay);
  }

  function extractItemId(href) {
    const match = String(href || '').match(/\/(?:video|note)\/(\d{8,})/) || String(href || '').match(/[?&]aweme_id=(\d{8,})/);
    return match ? match[1] : '';
  }

  function extractItemFromCard(card) {
    const anchor = card?.matches?.('a[href]') ? card : card?.querySelector?.('a[href*="/video/"], a[href*="/note/"], a[href*="aweme_id="]');
    const href = anchor?.href || anchor?.getAttribute?.('href') || '';
    const itemId = extractItemId(href);
    if (!itemId) return null;
    const title = cleanText(card.querySelector?.('p')?.innerText || card.querySelector?.('p')?.textContent || anchor?.querySelector?.('p')?.textContent);
    const alt = cleanText(card.querySelector?.('img')?.alt || anchor?.querySelector?.('img')?.alt);
    const author = alt.includes('：') ? cleanText(alt.split('：')[0]) : '';
    const normalizedTitle = title || (alt.includes('：') ? cleanText(alt.slice(alt.indexOf('：') + 1)) : alt) || `作品 ${itemId}`;
    return {
      itemId,
      title: normalizedTitle.slice(0, 600),
      author: author.slice(0, 80),
      href: new URL(href, location.origin).href,
      kind: /\/note\//.test(href) ? '图文' : '视频'
    };
  }

  function findVideoListRoot() {
    return document.querySelector('[data-e2e="user-post-list"] [data-e2e="scroll-list"]')
      || Array.from(document.querySelectorAll('[data-e2e="scroll-list"]')).find(root => root.querySelector('a[href*="/video/"], a[href*="/note/"]'))
      || document.querySelector('[data-e2e="user-post-list"]');
  }

  function findScrollContainer(root) {
    let node = root?.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = window.getComputedStyle(node);
      if (/(auto|scroll|overlay)/i.test(style.overflowY) && node.scrollHeight > node.clientHeight + 40) return node;
      node = node.parentElement;
    }
    const candidates = Array.from(document.querySelectorAll('.route-scroll-container, [class*="scroll-container"], [class*="scrollContainer"]'))
      .filter(element => {
        const style = window.getComputedStyle(element);
        return /(auto|scroll|overlay)/i.test(style.overflowY) && element.scrollHeight > element.clientHeight + 40;
      })
      .sort((left, right) => right.scrollHeight - left.scrollHeight);
    return candidates[0] || document.scrollingElement || document.documentElement;
  }

  function isDocumentScroller(element) {
    return element === document.scrollingElement || element === document.documentElement || element === document.body;
  }

  function scrollTopOf(element) {
    return isDocumentScroller(element) ? (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) : element.scrollTop;
  }

  function scrollViewportHeight(element) {
    return isDocumentScroller(element) ? (window.innerHeight || document.documentElement.clientHeight || 800) : element.clientHeight;
  }

  function setScrollTop(element, top) {
    const nextTop = Math.max(0, Number(top) || 0);
    if (isDocumentScroller(element)) window.scrollTo({ top: nextTop, left: window.scrollX, behavior: 'auto' });
    else element.scrollTo({ top: nextTop, left: element.scrollLeft, behavior: 'auto' });
  }

  function listStartTop(root, scrollContainer) {
    if (isDocumentScroller(scrollContainer)) return Math.max(0, root.getBoundingClientRect().top + scrollTopOf(scrollContainer) - 120);
    const rootRect = root.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    return Math.max(0, rootRect.top - containerRect.top + scrollContainer.scrollTop - 120);
  }

  async function scrollAndCollectItems() {
    const root = findVideoListRoot();
    if (!root) throw new Error('没有找到收藏视频列表，请确认已切换到“收藏 → 视频”。');
    const scrollingElement = findScrollContainer(root);
    const originalY = scrollTopOf(scrollingElement);
    const seen = new Set();
    const selected = [];
    let discovered = 0;
    let stableRounds = 0;
    let observer = null;

    const scan = scanRoot => {
      const cards = [];
      if (scanRoot?.matches?.('li, a[href*="/video/"], a[href*="/note/"]')) cards.push(scanRoot.closest?.('li') || scanRoot);
      cards.push(...Array.from(scanRoot?.querySelectorAll?.('li') || []));
      if (!cards.length) cards.push(...Array.from(root.querySelectorAll('a[href*="/video/"], a[href*="/note/"]')));
      for (const card of cards) {
        const item = extractItemFromCard(card);
        if (!item || seen.has(item.itemId)) continue;
        seen.add(item.itemId);
        const index = discovered;
        discovered += 1;
        if (index >= state.startOffset && selected.length < state.maxItems) selected.push(item);
      }
    };

    try {
      scan(root);
      observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) scan(node);
          });
        }
      });
      observer.observe(root, { childList: true, subtree: true });

      setScrollTop(scrollingElement, listStartTop(root, scrollingElement));
      await sleep(260);
      for (let round = 0; round < config.maxScrollRounds && selected.length < state.maxItems; round += 1) {
        if (state.cancelled) throw new Error('已停止整理');
        scan(root);
        const beforeCount = discovered;
        const beforeHeight = scrollingElement.scrollHeight;
        const viewport = scrollViewportHeight(scrollingElement);
        const nextTop = Math.min(
          Math.max(0, scrollingElement.scrollHeight - viewport),
          scrollTopOf(scrollingElement) + Math.max(440, Math.floor(viewport * config.scrollStepRatio))
        );
        setScrollTop(scrollingElement, nextTop);
        await sleep(config.scrollDelayMs);
        scan(root);
        const nearBottom = scrollTopOf(scrollingElement) + viewport >= scrollingElement.scrollHeight - 180;
        const unchanged = discovered === beforeCount && scrollingElement.scrollHeight === beforeHeight;
        stableRounds = nearBottom && unchanged ? stableRounds + 1 : 0;
        updateProgress(
          8 + Math.min(42, Math.round(selected.length / Math.max(1, state.maxItems) * 42)),
          `已发现 ${discovered} 个作品，跳过 ${Math.min(discovered, state.startOffset)} 个，已读取 ${selected.length}/${state.maxItems}`
        );
        if (stableRounds >= config.stableRoundsToStop) break;
      }
      return { items: selected, discoveredCount: discovered, startOffset: state.startOffset };
    } finally {
      observer?.disconnect();
      setScrollTop(scrollingElement, originalY);
    }
  }

  function parseJsonResponse(value) {
    if (value && typeof value === 'object') return value;
    const text = String(value || '').trim();
    if (!text) throw new Error('LLMBridge 返回为空');
    try {
      return JSON.parse(text);
    } catch (error) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
      if (fenced) return JSON.parse(fenced);
      const objectText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
      if (objectText) return JSON.parse(objectText);
      throw error;
    }
  }

  function normalizeFolderName(value, query) {
    const raw = cleanText(value).replace(/[<>:"/\\|?*]/g, '').slice(0, 15);
    if (raw) return raw;
    return cleanText(query).replace(/[，。！？、,.!?\s]+/g, '').slice(0, 12) || '智能整理';
  }

  function localFallback(query, items) {
    const stopWords = new Set(['把', '将', '的', '和', '与', '或', '相关', '视频', '作品', '内容', '整理', '收藏', '收藏夹', '一个', '一些', '所有', '关于', '进行']);
    const keywords = cleanText(query)
      .split(/[\s,，、。；;：:！!？?\/|]+|(?:和|与|或)/)
      .map(word => word.trim().toLowerCase())
      .filter(word => word.length >= 2 && !stopWords.has(word));
    const matches = items.filter(item => keywords.some(keyword => `${item.title} ${item.author}`.toLowerCase().includes(keyword)))
      .slice(0, config.maxMatches)
      .map(item => ({ ...item, reason: `标题命中：${keywords.filter(keyword => `${item.title} ${item.author}`.toLowerCase().includes(keyword)).slice(0, 3).join('、')}` }));
    return {
      folderName: normalizeFolderName('', query),
      summary: 'LLMBridge 不可用或分析失败，已使用标题关键词本地筛选。',
      matches,
      usedFallback: true
    };
  }

  async function analyzeItems(query, items) {
    if (!(window.LLMBridge && typeof window.LLMBridge.chat === 'function')) return localFallback(query, items);
    const rows = items.map((item, index) => `${index + 1}\t${item.kind}\t${item.author || '未知作者'}\t${item.title}`).join('\n');
    const prompt = [
      '你是抖音收藏整理助手。根据用户需求，从候选作品中筛选真正相关的条目，并为它们建议一个简洁收藏夹名称。',
      '宁缺毋滥；仅依据标题和作者判断，不要补造作品信息。',
      `用户需求：${query}`,
      `最多返回 ${Math.min(config.maxMatches, items.length)} 个匹配。收藏夹名称不超过 15 个中文字符。`,
      '只返回 JSON：{"folderName":"收藏夹名","summary":"一句筛选说明","matches":[{"i":1,"reason":"简短命中原因"}]}。matches.i 必须是候选序号。',
      '候选作品：',
      rows
    ].join('\n');
    try {
      const raw = await withTimeout(window.LLMBridge.chat(prompt, 'json'), 'LLMBridge 分析', config.llmTimeoutMs);
      const parsed = parseJsonResponse(raw);
      const seen = new Set();
      const matches = [];
      for (const match of Array.isArray(parsed.matches) ? parsed.matches : []) {
        const index = Math.floor(Number(match.i ?? match.index)) - 1;
        const item = items[index];
        if (!item || seen.has(item.itemId) || matches.length >= config.maxMatches) continue;
        seen.add(item.itemId);
        matches.push({ ...item, reason: cleanText(match.reason) || '符合整理需求' });
      }
      return {
        folderName: normalizeFolderName(parsed.folderName || parsed.albumTitle || parsed.title, query),
        summary: cleanText(parsed.summary) || '已按需求筛选相关收藏作品。',
        matches,
        usedFallback: false
      };
    } catch (error) {
      console.warn('[Yuze Douyin Organizer] LLM 分析失败，使用本地筛选', { error: errorText(error) });
      return localFallback(query, items);
    }
  }

  function isOtherCategoryName(value) {
    return /^(其他|其它|未分类|杂项|暂不分类)$/i.test(cleanText(value));
  }

  function autoCategoryDefinitions(granularity = state.autoGranularity) {
    const fine = [
      { name: 'AI与大模型', keys: ['ai', '人工智能', '大模型', 'agent', '智能体', 'openai', 'chatgpt', '提示词', '生成式'] },
      { name: '机器人与硬件', keys: ['机器人', '具身智能', '芯片', 'gpu', '硬件', '数码', '手机', '电脑', '相机'] },
      { name: '编程与产品', keys: ['编程', '代码', '程序员', '开发', '软件', 'app', '产品', '创业', '商业模式', '增长'] },
      { name: '美食与烹饪', keys: ['美食', '做菜', '厨房', '菜谱', '食谱', '烘焙', '早餐', '饮品', '好吃'] },
      { name: '游戏与动漫', keys: ['游戏', '电竞', 'steam', '主机', '手游', '动漫', '二次元', '剧情'] },
      { name: '影视与故事', keys: ['电影', '短片', '短剧', '剧集', '导演', '演员', '故事', '小说', '书单', '文学'] },
      { name: '旅行与户外', keys: ['旅行', '旅游', '攻略', '酒店', '民宿', '露营', '徒步', '自驾', '景点', '城市'] },
      { name: '宠物与动物', keys: ['宠物', '猫', '狗', '鸟', '鹦鹉', '萌宠', '动物', '养宠'] },
      { name: '家居与生活', keys: ['家居', '装修', '收纳', '清洁', '房间', '阳台', '生活技巧', '好物'] },
      { name: '健康与运动', keys: ['健康', '健身', '运动', '跑步', '瑜伽', '减脂', '饮食', '养生'] },
      { name: '学习与职场', keys: ['学习', '教程', '知识', '考试', '英语', '职场', '工作', '面试', '行业'] },
      { name: '摄影与创作', keys: ['摄影', '拍照', '剪辑', '创作', '设计', '插画', 'aigc', '画面', '艺术'] }
    ];
    if (granularity === 'fine') return fine;
    return [
      { name: '科技与AI', keys: [...fine[0].keys, ...fine[1].keys, ...fine[2].keys] },
      { name: '美食生活', keys: [...fine[3].keys, ...fine[8].keys] },
      { name: '文娱内容', keys: [...fine[4].keys, ...fine[5].keys] },
      fine[6],
      fine[7],
      { name: '学习成长', keys: [...fine[9].keys, ...fine[10].keys] },
      fine[11]
    ];
  }

  function normalizeAutoCategoryName(value, fallbackIndex = 0) {
    const name = cleanText(value).replace(/[<>:"/\\|?*《》'`]/g, '').slice(0, 15);
    return name || `分类${fallbackIndex + 1}`;
  }

  function canonicalExistingFolderName(name, existingNames) {
    const normalized = cleanText(name).toLowerCase();
    return existingNames.find(existing => cleanText(existing).toLowerCase() === normalized) || '';
  }

  function buildAutoPlan(assignments, items, existingNames, usedFallback) {
    const existingSet = new Set(existingNames.map(name => cleanText(name).toLowerCase()));
    const regular = new Map();
    const other = { name: '其他', items: [], summary: '无法可靠归入常规分类，保持原收藏状态。', isOther: true, isExisting: false, selected: false };
    const assignedIds = new Set();
    for (const assignment of assignments) {
      const item = assignment.item;
      if (!item || assignedIds.has(item.itemId)) continue;
      assignedIds.add(item.itemId);
      let name = cleanText(assignment.name);
      if (isOtherCategoryName(name)) {
        other.items.push({ ...item, reason: cleanText(assignment.reason) || '未能可靠分类' });
        continue;
      }
      const canonical = canonicalExistingFolderName(name, existingNames);
      name = canonical || normalizeAutoCategoryName(name, regular.size);
      const key = name.toLowerCase();
      if (!regular.has(key) && regular.size >= state.maxCategories) {
        other.items.push({ ...item, reason: '已达到分类上限' });
        continue;
      }
      if (!regular.has(key)) {
        regular.set(key, {
          name,
          items: [],
          summary: cleanText(assignment.summary),
          isOther: false,
          isExisting: existingSet.has(key),
          selected: true
        });
      }
      regular.get(key).items.push({ ...item, reason: cleanText(assignment.reason) || '符合该分类主题' });
    }
    for (const item of items) {
      if (!assignedIds.has(item.itemId)) other.items.push({ ...item, reason: '模型未返回该作品的分类' });
    }
    const categories = Array.from(regular.values()).filter(category => category.items.length);
    if (other.items.length) categories.push(other);
    return {
      categories,
      analyzedCount: items.length,
      existingFolderCount: existingNames.length,
      usedFallback,
      granularity: state.autoGranularity,
      maxCategories: state.maxCategories
    };
  }

  function localAutoPlan(items, existingNames) {
    const definitions = autoCategoryDefinitions();
    const assignments = items.map(item => {
      const haystack = `${item.title} ${item.author}`.toLowerCase();
      const definition = definitions.find(category => category.keys.some(key => haystack.includes(key.toLowerCase())));
      const canonical = definition ? canonicalExistingFolderName(definition.name, existingNames) : '';
      return {
        item,
        name: canonical || definition?.name || '其他',
        reason: definition ? `标题符合“${canonical || definition.name}”主题` : '没有足够明确的主题信号'
      };
    });
    return buildAutoPlan(assignments, items, existingNames, true);
  }

  async function analyzeItemsForAutoCategories(items, existingNames) {
    if (!(window.LLMBridge && typeof window.LLMBridge.chat === 'function')) return localAutoPlan(items, existingNames);
    const rows = items.map((item, index) => `${index + 1}\t${item.kind}\t${item.author || '未知作者'}\t${item.title.slice(0, 360)}`).join('\n');
    const granularityInstruction = state.autoGranularity === 'fine'
      ? '采用细分主题：在内容量足够时按明确技术、地区、菜系、游戏或创作主题拆分，但不要为单个作品建组。'
      : '采用大类整理：分类应宽泛稳定，避免同义或过细分组。';
    const existingLines = existingNames.length ? existingNames.slice(0, 60).map((name, index) => `${index + 1}. ${name}`).join('\n') : '暂无已有收藏夹。';
    const prompt = [
      '你是抖音收藏自动分类助手。把每个候选作品分配到且只分配到一个收藏夹。',
      granularityInstruction,
      `常规分类最多 ${state.maxCategories} 个。分类名不超过 15 个中文字符。`,
      '优先复用语义合适的已有收藏夹，复用时必须原样返回名称；只有确有必要才创建新分类。',
      '无法可靠判断的作品归入“其他”。不要因为标题表达略有差异就新建同义分类。',
      `已有收藏夹：\n${existingLines}`,
      '只返回 JSON：{"summary":"整体分类说明","categories":[{"name":"收藏夹名","summary":"该类主题","items":[1,2]}]}。items 中的序号必须来自候选列表，且每个序号只能出现一次。',
      '候选作品：',
      rows
    ].join('\n');
    try {
      const raw = await withTimeout(window.LLMBridge.chat(prompt, 'json'), 'LLMBridge 自动分类', config.llmTimeoutMs);
      const parsed = parseJsonResponse(raw);
      const assignments = [];
      const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
      for (const category of categories) {
        const name = cleanText(category.name || category.title || category.folderName);
        for (const rawIndex of Array.isArray(category.items) ? category.items : (category.indexes || [])) {
          const index = Math.floor(Number(typeof rawIndex === 'object' ? (rawIndex.i ?? rawIndex.index) : rawIndex)) - 1;
          if (!items[index]) continue;
          assignments.push({ item: items[index], name, summary: category.summary || category.reason, reason: category.reason || category.summary });
        }
      }
      for (const row of Array.isArray(parsed.assignments) ? parsed.assignments : []) {
        const index = Math.floor(Number(row.i ?? row.index)) - 1;
        if (items[index]) assignments.push({ item: items[index], name: row.name || row.category, reason: row.reason });
      }
      if (!assignments.length) throw new Error('LLMBridge 没有返回有效分类映射');
      const plan = buildAutoPlan(assignments, items, existingNames, false);
      plan.summary = cleanText(parsed.summary) || '已按主题完成收藏自动分类。';
      return plan;
    } catch (error) {
      console.warn('[Yuze Douyin Organizer] 自动分类失败，使用本地分类', { error: errorText(error) });
      return localAutoPlan(items, existingNames);
    }
  }

  function renderAnalysis(scanResult, analysis) {
    state.analysis = analysis;
    const listHtml = analysis.matches.length
      ? analysis.matches.map(item => `
          <li class="Yuze-dy-item" data-item-id="${escapeHtml(item.itemId)}">
            <div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml([item.author, item.reason].filter(Boolean).join(' · '))}</p></div>
            <button class="Yuze-dy-remove" type="button" data-action="remove" aria-label="移除">×</button>
          </li>`).join('')
      : '<li class="Yuze-dy-item"><div><h4>没有找到匹配作品</h4><p>可以换一种描述后重新扫描。</p></div></li>';
    const overlay = renderShell(
      analysis.usedFallback ? '本地筛选结果' : 'AI 筛选结果',
      `找到 ${analysis.matches.length} 个相关作品`,
      analysis.summary,
      `<div class="Yuze-dy-stats">
         <div class="Yuze-dy-stat"><span>页面发现</span><b>${scanResult.discoveredCount}</b></div>
         <div class="Yuze-dy-stat"><span>送入分析</span><b>${scanResult.items.length}</b></div>
         <div class="Yuze-dy-stat"><span>筛选命中</span><b data-role="match-count">${analysis.matches.length}</b></div>
       </div>
       <div class="Yuze-dy-folder-row">
         <div><label class="Yuze-dy-label" for="Yuze-dy-folder-name">目标收藏夹</label><input id="Yuze-dy-folder-name" class="Yuze-dy-input" maxlength="15" value="${escapeHtml(analysis.folderName)}"></div>
         <label class="Yuze-dy-switch"><input id="Yuze-dy-private" type="checkbox" ${state.privateFolder ? 'checked' : ''}>新建时设为私密</label>
       </div>
       <p class="Yuze-dy-summary">同名收藏夹会直接复用；只有点击“确认整理”后才会调用抖音页面内的签名接口。</p>
       <ul class="Yuze-dy-list">${listHtml}</ul>`,
      '<button class="Yuze-dy-action" type="button" data-action="back">重新设置</button><button class="Yuze-dy-action primary" type="button" data-action="move">确认整理</button>'
    );
    overlay.querySelector('[data-action="back"]')?.addEventListener('click', openStartSheet);
    const moveButton = overlay.querySelector('[data-action="move"]');
    if (moveButton) moveButton.disabled = !analysis.matches.length;
    moveButton?.addEventListener('click', () => {
      analysis.folderName = normalizeFolderName(overlay.querySelector('#Yuze-dy-folder-name')?.value, state.query);
      state.privateFolder = !!overlay.querySelector('#Yuze-dy-private')?.checked;
      organizeMatches();
    });
    overlay.querySelectorAll('[data-action="remove"]').forEach(button => {
      button.addEventListener('click', () => {
        const row = button.closest('[data-item-id]');
        const itemId = row?.getAttribute('data-item-id');
        state.analysis.matches = state.analysis.matches.filter(item => item.itemId !== itemId);
        row?.remove();
        const count = overlay.querySelector('[data-role="match-count"]');
        if (count) count.textContent = String(state.analysis.matches.length);
        if (moveButton) moveButton.disabled = !state.analysis.matches.length;
      });
    });
  }

  function autoAssignmentsFromPlan() {
    const assignments = [];
    for (const category of state.autoPlan?.categories || []) {
      if (category.isOther || category.selected === false || isOtherCategoryName(category.name)) continue;
      for (const item of category.items || []) assignments.push({ ...item, category: category.name });
    }
    return assignments;
  }

  function renderAutoPlan(scanResult, plan) {
    state.autoPlan = plan;
    const regular = plan.categories.filter(category => !category.isOther);
    const other = plan.categories.find(category => category.isOther);
    regular.forEach(category => { if (category.selected === undefined) category.selected = true; });
    const initialMovableCount = regular.filter(category => category.selected !== false).reduce((sum, category) => sum + category.items.length, 0);
    const listHtml = plan.categories.map((category, index) => {
      const examples = category.items.slice(0, 3).map(item => item.title).join(' / ');
      const status = category.isOther ? '不移动' : category.isExisting ? '复用已有' : '待创建';
      const selected = !category.isOther && category.selected !== false;
      return `
        <li class="Yuze-dy-item Yuze-dy-category-item${selected || category.isOther ? '' : ' is-deselected'}" data-category-row="${index}">
          <label class="Yuze-dy-category-select">
            <input type="checkbox" data-category-index="${index}" aria-label="选择分组 ${escapeHtml(category.name)}" ${selected ? 'checked' : ''} ${category.isOther ? 'disabled' : ''}>
            <div><h4>${escapeHtml(category.name)} <span class="Yuze-dy-badge">${escapeHtml(status)}</span></h4><p>${escapeHtml(category.summary || `${category.items.length} 个相关作品`)}</p><p class="Yuze-dy-category-examples">${escapeHtml(examples)}</p></div>
          </label>
          <span class="Yuze-dy-badge">${category.items.length} 个</span>
        </li>`;
    }).join('');
    const overlay = renderShell(
      plan.usedFallback ? '本地分类结果' : 'AI 自动分类结果',
      `已将 ${plan.analyzedCount} 个作品归为 ${regular.length} 个分组`,
      plan.summary || `${state.autoGranularity === 'fine' ? '细分主题' : '大类整理'}；优先复用 ${plan.existingFolderCount} 个已有收藏夹。`,
      `<div class="Yuze-dy-stats">
         <div class="Yuze-dy-stat"><span>已选分组</span><b data-role="selected-category-count">${regular.length}</b></div>
         <div class="Yuze-dy-stat"><span>已选作品</span><b data-role="selected-item-count">${initialMovableCount}</b></div>
         <div class="Yuze-dy-stat"><span>保留其他</span><b>${other?.items?.length || 0}</b></div>
       </div>
       <label class="Yuze-dy-switch"><input id="Yuze-dy-auto-private" type="checkbox" ${state.privateFolder ? 'checked' : ''}>新建收藏夹设为私密</label>
       <div class="Yuze-dy-selection-tools"><p>取消不需要的分组后，该收藏夹不会创建，其中作品也不会移动。</p><div class="Yuze-dy-selection-actions"><button class="Yuze-dy-mini-action" type="button" data-action="select-all-categories">全选</button><button class="Yuze-dy-mini-action" type="button" data-action="clear-categories">清空</button></div></div>
       <ul class="Yuze-dy-list">${listHtml}</ul>`,
      `<button class="Yuze-dy-action" type="button" data-action="back">重新设置</button><button class="Yuze-dy-action primary" type="button" data-action="auto-organize">整理已选 ${regular.length} 个分组</button>`
    );
    overlay.querySelector('[data-action="back"]')?.addEventListener('click', openStartSheet);
    const organizeButton = overlay.querySelector('[data-action="auto-organize"]');
    const syncCategorySelection = () => {
      let selectedCategoryCount = 0;
      let selectedItemCount = 0;
      overlay.querySelectorAll('[data-category-index]').forEach(input => {
        const index = Number(input.dataset.categoryIndex);
        const category = plan.categories[index];
        if (!category || category.isOther) return;
        category.selected = input.checked;
        overlay.querySelector(`[data-category-row="${index}"]`)?.classList.toggle('is-deselected', !input.checked);
        if (input.checked) {
          selectedCategoryCount += 1;
          selectedItemCount += category.items.length;
        }
      });
      const categoryCount = overlay.querySelector('[data-role="selected-category-count"]');
      const itemCount = overlay.querySelector('[data-role="selected-item-count"]');
      if (categoryCount) categoryCount.textContent = String(selectedCategoryCount);
      if (itemCount) itemCount.textContent = String(selectedItemCount);
      if (organizeButton) {
        organizeButton.disabled = selectedCategoryCount === 0;
        organizeButton.textContent = selectedCategoryCount ? `整理已选 ${selectedCategoryCount} 个分组` : '请先选择分组';
      }
    };
    overlay.querySelectorAll('[data-category-index]').forEach(input => input.addEventListener('change', syncCategorySelection));
    overlay.querySelector('[data-action="select-all-categories"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('[data-category-index]:not(:disabled)').forEach(input => { input.checked = true; });
      syncCategorySelection();
    });
    overlay.querySelector('[data-action="clear-categories"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('[data-category-index]:not(:disabled)').forEach(input => { input.checked = false; });
      syncCategorySelection();
    });
    syncCategorySelection();
    organizeButton?.addEventListener('click', () => {
      state.privateFolder = !!overlay.querySelector('#Yuze-dy-auto-private')?.checked;
      organizeAutoPlan();
    });
  }

  function getWebpackRequire() {
    let captured = null;
    const chunks = window.webpackChunkdouyin_web = window.webpackChunkdouyin_web || [];
    chunks.push([[`Yuze-douyin-organizer-${Date.now()}`], {}, require => { captured = require; }]);
    if (!captured) throw new Error('没有获取到抖音 webpack runtime，请刷新页面后重试。');
    return captured;
  }

  function safeRequire(require, id) {
    try {
      return require?.(id);
    } catch (error) {
      return null;
    }
  }

  function discoverApi(require) {
    const found = { listFolders: null, listFolderVideos: null, move: null, maintain: null };
    const inspect = exports => {
      if (!exports) return;
      const functions = typeof exports === 'function' ? [exports] : Object.values(exports).filter(value => typeof value === 'function');
      for (const fn of functions) {
        const source = Function.prototype.toString.call(fn);
        if (!found.listFolders && /\/aweme\/v1\/web\/collects\/list\//.test(source)) found.listFolders = fn;
        if (!found.listFolderVideos && /\/aweme\/v1\/web\/collects\/video\/list\//.test(source)) found.listFolderVideos = fn;
        if (!found.move && /\/aweme\/v1\/web\/collects\/video\/move\//.test(source)) found.move = fn;
        if (!found.maintain && /\/aweme\/v1\/web\/collects\/maintain\//.test(source)) found.maintain = fn;
      }
    };
    Object.values(require?.c || {}).forEach(module => inspect(module?.exports));
    const endpointPattern = /\/aweme\/v1\/web\/collects\/(?:list|video\/(?:list|move)|maintain)\//;
    for (const [moduleId, factory] of Object.entries(require?.m || {})) {
      if (found.listFolders && found.listFolderVideos && found.move && found.maintain) break;
      let source = '';
      try {
        source = Function.prototype.toString.call(factory);
      } catch (error) {
        continue;
      }
      if (!endpointPattern.test(source)) continue;
      inspect(safeRequire(require, Number.isNaN(Number(moduleId)) ? moduleId : Number(moduleId)));
    }
    return found;
  }

  function getDouyinApi() {
    if (state.apiModule?.move) return state.apiModule;
    const require = getWebpackRequire();
    const known = safeRequire(require, 284055) || safeRequire(require, 795568);
    const discovered = discoverApi(require);
    const api = {
      listFolders: known?.So || discovered.listFolders,
      listFolderVideos: known?.d6 || discovered.listFolderVideos,
      move: known?.RX || discovered.move,
      createFolder: known?.vr || null,
      maintain: known?.gC || discovered.maintain,
      source: known?.RX ? 'module-795568' : 'runtime-discovery'
    };
    if (!api.listFolders || !api.move || (!api.createFolder && !api.maintain)) {
      throw new Error('没有找到抖音收藏夹页面内签名接口，请刷新收藏页后重试。');
    }
    state.apiModule = api;
    console.debug('[Yuze Douyin Organizer] signed API ready', {
      source: api.source,
      hasList: !!api.listFolders,
      hasCreate: !!(api.createFolder || api.maintain),
      hasMove: !!api.move,
      hasVerify: !!api.listFolderVideos
    });
    return api;
  }

  function assertApiSuccess(response, label) {
    const code = Number(response?.statusCode ?? response?.status_code ?? 0);
    if (Number.isFinite(code) && code !== 0) {
      throw new Error(`${label}失败：${cleanText(response?.statusMsg || response?.status_msg) || `状态码 ${code}`}`);
    }
    return response;
  }

  async function listAllFolders(api) {
    const folders = new Map();
    let cursor = 0;
    for (let page = 0; page < 20; page += 1) {
      const response = assertApiSuccess(
        await callWithRetry(() => api.listFolders({ cursor, offset: 50 }), '读取收藏夹'),
        '读取收藏夹'
      );
      for (const folder of response?.data || response?.collects_list || []) {
        const id = cleanText(folder.collectionFolderId || folder.collects_id_str || folder.collects_id || folder.id);
        const name = cleanText(folder.collectionFolderName || folder.collects_name || folder.name);
        if (id && name) folders.set(name, { id, name, raw: folder });
      }
      if (!(response?.hasMore ?? response?.has_more)) break;
      const nextCursor = Number(response?.cursor ?? 0);
      if (!Number.isFinite(nextCursor) || nextCursor === cursor) break;
      cursor = nextCursor;
    }
    return folders;
  }

  async function createFolder(api, name, isPrivate) {
    const secret = isPrivate ? 1 : 0;
    const response = api.createFolder
      ? await callWithRetry(() => api.createFolder(name, secret), `创建收藏夹“${name}”`)
      : await callWithRetry(() => api.maintain({ action: 1, name, secret }), `创建收藏夹“${name}”`);
    assertApiSuccess(response, `创建收藏夹“${name}”`);
    const info = response?.collectInfo || response?.collects_info || {};
    return {
      id: cleanText(info.collectionFolderId || info.collects_id_str || info.collects_id || info.id),
      name: cleanText(info.collectionFolderName || info.collects_name || info.name) || name
    };
  }

  async function moveItem(api, item, folder) {
    const payload = {
      item_ids: [item.itemId],
      item_type: 2,
      to_collects_id: folder.id,
      collects_name: folder.name,
      update_collects_sort: true,
      move_collects_list: [folder.id]
    };
    const response = await callWithRetry(() => api.move(payload), `移动“${item.title.slice(0, 24)}”`);
    assertApiSuccess(response, `移动“${item.title.slice(0, 24)}”`);
    return response;
  }

  function collectIds(value, target = new Set(), depth = 0) {
    if (value == null || depth > 8 || target.size > 1000) return target;
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value);
      if (/^\d{8,}$/.test(text)) target.add(text);
      return target;
    }
    if (Array.isArray(value)) {
      value.forEach(item => collectIds(item, target, depth + 1));
      return target;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, child]) => {
        if (/aweme|item|id|data|list/i.test(key)) collectIds(child, target, depth + 1);
      });
    }
    return target;
  }

  async function verifyFolderItems(api, folderId, expectedItems) {
    if (!api.listFolderVideos) return { verified: [], unverified: expectedItems.map(item => ({ ...item, error: '当前前端未暴露收藏夹详情接口，无法二次确认' })) };
    const expectedIds = new Set(expectedItems.map(item => item.itemId));
    const foundIds = new Set();
    let cursor = 0;
    for (let page = 0; page < 30 && foundIds.size < expectedIds.size; page += 1) {
      const response = assertApiSuccess(
        await callWithRetry(() => api.listFolderVideos({ collectsId: folderId, cursor, offset: 50 }), '确认收藏夹内容', 0),
        '确认收藏夹内容'
      );
      const pageIds = collectIds(response?.data || response?.aweme_list || response);
      expectedIds.forEach(id => { if (pageIds.has(id)) foundIds.add(id); });
      if (!(response?.hasMore ?? response?.has_more)) break;
      const nextCursor = Number(response?.cursor ?? 0);
      if (!Number.isFinite(nextCursor) || nextCursor === cursor) break;
      cursor = nextCursor;
    }
    return {
      verified: expectedItems.filter(item => foundIds.has(item.itemId)),
      unverified: expectedItems.filter(item => !foundIds.has(item.itemId)).map(item => ({ ...item, error: '移动接口返回成功，但收藏夹详情查询未找到该作品' }))
    };
  }

  function renderResult(result) {
    state.lastResult = result;
    const rows = [
      ...result.verified.map(item => ({ ...item, state: '已确认', detail: `已进入“${result.folder.name}”` })),
      ...result.unverified.map(item => ({ ...item, state: '未确认', detail: item.error })),
      ...result.failed.map(item => ({ ...item, state: '失败', detail: item.error }))
    ];
    const listHtml = rows.slice(0, 120).map(item => `
      <li class="Yuze-dy-item"><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.detail)}</p></div><span class="Yuze-dy-badge">${escapeHtml(item.state)}</span></li>`).join('');
    const overlay = renderShell(
      result.created ? '已创建并整理' : '已复用收藏夹',
      `“${result.folder.name}”整理完成`,
      `已确认 ${result.verified.length} 个，未确认 ${result.unverified.length} 个，失败 ${result.failed.length} 个。`,
      `<div class="Yuze-dy-stats">
         <div class="Yuze-dy-stat"><span>已确认</span><b>${result.verified.length}</b></div>
         <div class="Yuze-dy-stat"><span>未确认</span><b>${result.unverified.length}</b></div>
         <div class="Yuze-dy-stat"><span>失败</span><b>${result.failed.length}</b></div>
       </div><ul class="Yuze-dy-list">${listHtml || '<li class="Yuze-dy-item"><div><h4>没有移动结果</h4></div></li>'}</ul>`,
      '<button class="Yuze-dy-action primary" type="button" data-action="done">完成</button>'
    );
    overlay.querySelector('[data-action="done"]')?.addEventListener('click', closeOverlay);
  }

  async function organizeMatches() {
    if (state.moving || state.running || !state.analysis?.matches?.length) return;
    state.moving = true;
    state.cancelled = false;
    setButtonLoading(true, '整理中…');
    const matches = state.analysis.matches.slice();
    const folderName = normalizeFolderName(state.analysis.folderName, state.query);
    const result = { folder: { id: '', name: folderName }, created: false, moved: [], verified: [], unverified: [], failed: [] };
    const overlay = renderProgress('正在整理收藏', `准备把 ${matches.length} 个作品移动到“${folderName}”`);
    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', () => { state.cancelled = true; });
    try {
      updateProgress(6, '正在连接抖音页面内签名接口');
      const api = getDouyinApi();
      updateProgress(12, '正在检查已有收藏夹');
      let folders = await listAllFolders(api);
      let folder = folders.get(folderName);
      if (!folder) {
        updateProgress(20, `正在创建收藏夹“${folderName}”`);
        folder = await createFolder(api, folderName, state.privateFolder);
        result.created = true;
        if (!folder.id) {
          await sleep(500);
          folders = await listAllFolders(api);
          folder = folders.get(folderName);
        }
      }
      if (!folder?.id) throw new Error(`没有读取到收藏夹“${folderName}”的 ID`);
      result.folder = folder;

      for (let index = 0; index < matches.length; index += 1) {
        if (state.cancelled) break;
        const item = matches[index];
        updateProgress(24 + Math.round(index / Math.max(1, matches.length) * 64), `正在移动 ${index + 1}/${matches.length}：${item.title.slice(0, 34)}`);
        try {
          const response = await moveItem(api, item, folder);
          result.moved.push({ ...item, existed: Array.isArray(response?.existed_item_ids) && response.existed_item_ids.map(String).includes(item.itemId) });
        } catch (error) {
          result.failed.push({ ...item, error: errorText(error) });
        }
        if (config.moveDelayMs) await sleep(config.moveDelayMs);
      }

      if (config.verifyAfterMove && result.moved.length) {
        updateProgress(92, '正在二次确认收藏夹内容');
        try {
          const verification = await verifyFolderItems(api, folder.id, result.moved);
          result.verified = verification.verified;
          result.unverified = verification.unverified;
        } catch (error) {
          result.unverified = result.moved.map(item => ({ ...item, error: `无法二次确认：${errorText(error)}` }));
        }
      } else {
        result.verified = result.moved.slice();
      }
      updateProgress(100, state.cancelled ? '已停止，正在汇总已完成项目' : '整理完成');
      await sleep(240);
      renderResult(result);
    } catch (error) {
      renderError(error);
    } finally {
      state.moving = false;
      setButtonLoading(false);
      mountButton();
    }
  }

  function renderAutoResult(result) {
    state.lastResult = result;
    const folderRows = result.folderOutcomes.map(folder => `
      <li class="Yuze-dy-item"><div><h4>${escapeHtml(folder.name)}</h4><p>${escapeHtml(`${folder.count} 个作品 · ${folder.status}`)}</p></div><span class="Yuze-dy-badge">${escapeHtml(folder.status)}</span></li>`).join('');
    const failedRows = result.failed.slice(0, 50).map(item => `
      <li class="Yuze-dy-item"><div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(`${item.category || '未分类'}：${item.error}`)}</p></div><span class="Yuze-dy-badge">失败</span></li>`).join('');
    const overlay = renderShell(
      '自动分类完成',
      `已整理 ${result.verified.length + result.unverified.length} 个作品`,
      `新建 ${result.created.length} 个收藏夹，复用 ${result.reused.length} 个；已确认 ${result.verified.length} 个，未确认 ${result.unverified.length} 个，失败 ${result.failed.length} 个。`,
      `<div class="Yuze-dy-stats">
         <div class="Yuze-dy-stat"><span>已确认</span><b>${result.verified.length}</b></div>
         <div class="Yuze-dy-stat"><span>未确认</span><b>${result.unverified.length}</b></div>
         <div class="Yuze-dy-stat"><span>失败</span><b>${result.failed.length}</b></div>
       </div><ul class="Yuze-dy-list">${folderRows}${failedRows}</ul>`,
      '<button class="Yuze-dy-action primary" type="button" data-action="done">完成</button>'
    );
    overlay.querySelector('[data-action="done"]')?.addEventListener('click', closeOverlay);
  }

  async function organizeAutoPlan() {
    const assignments = autoAssignmentsFromPlan();
    if (state.moving || state.running || !assignments.length) return;
    state.moving = true;
    state.cancelled = false;
    setButtonLoading(true, '分类中…');
    const result = {
      created: [],
      reused: [],
      folderOutcomes: [],
      moved: [],
      verified: [],
      unverified: [],
      failed: []
    };
    const overlay = renderProgress('正在创建分组并整理', `准备处理 ${assignments.length} 个作品`);
    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', () => { state.cancelled = true; });
    try {
      const api = getDouyinApi();
      updateProgress(7, '正在读取已有收藏夹');
      let folders = await listAllFolders(api);
      const requiredNames = Array.from(new Set(assignments.map(item => item.category)));
      for (let index = 0; index < requiredNames.length; index += 1) {
        if (state.cancelled) break;
        const name = requiredNames[index];
        updateProgress(10 + Math.round(index / Math.max(1, requiredNames.length) * 14), `正在准备分组 ${index + 1}/${requiredNames.length}：${name}`);
        if (folders.has(name)) {
          result.reused.push(name);
          continue;
        }
        try {
          let folder = await createFolder(api, name, state.privateFolder);
          if (!folder.id) {
            await sleep(400);
            folders = await listAllFolders(api);
            folder = folders.get(name);
          }
          if (!folder?.id) throw new Error('创建成功后仍未读取到收藏夹 ID');
          folders.set(name, folder);
          result.created.push(name);
        } catch (error) {
          assignments.filter(item => item.category === name).forEach(item => result.failed.push({ ...item, error: `创建收藏夹失败：${errorText(error)}` }));
        }
      }

      const movable = assignments.filter(item => folders.get(item.category)?.id && !result.failed.some(failed => failed.itemId === item.itemId));
      for (let index = 0; index < movable.length; index += 1) {
        if (state.cancelled) break;
        const item = movable[index];
        const folder = folders.get(item.category);
        updateProgress(26 + Math.round(index / Math.max(1, movable.length) * 60), `正在移动 ${index + 1}/${movable.length}：${item.title.slice(0, 30)}`);
        try {
          await moveItem(api, item, folder);
          result.moved.push(item);
        } catch (error) {
          result.failed.push({ ...item, error: errorText(error) });
        }
        if (config.moveDelayMs) await sleep(config.moveDelayMs);
      }

      if (config.verifyAfterMove && result.moved.length) {
        const movedByCategory = new Map();
        result.moved.forEach(item => {
          if (!movedByCategory.has(item.category)) movedByCategory.set(item.category, []);
          movedByCategory.get(item.category).push(item);
        });
        let verifiedFolders = 0;
        for (const [category, items] of movedByCategory.entries()) {
          updateProgress(88 + Math.round(verifiedFolders / Math.max(1, movedByCategory.size) * 10), `正在确认分组 ${verifiedFolders + 1}/${movedByCategory.size}：${category}`);
          try {
            const verification = await verifyFolderItems(api, folders.get(category).id, items);
            result.verified.push(...verification.verified);
            result.unverified.push(...verification.unverified);
          } catch (error) {
            result.unverified.push(...items.map(item => ({ ...item, error: `无法二次确认：${errorText(error)}` })));
          }
          verifiedFolders += 1;
        }
      } else {
        result.verified = result.moved.slice();
      }

      for (const name of requiredNames) {
        const count = assignments.filter(item => item.category === name).length;
        const status = result.created.includes(name) ? '已创建' : result.reused.includes(name) ? '已复用' : '创建失败';
        result.folderOutcomes.push({ name, count, status });
      }
      updateProgress(100, state.cancelled ? '已停止，正在汇总已完成项目' : '自动分类整理完成');
      await sleep(240);
      renderAutoResult(result);
    } catch (error) {
      renderError(error);
    } finally {
      state.moving = false;
      setButtonLoading(false);
      mountButton();
    }
  }

  async function runAutoOrganizer() {
    if (state.running || state.moving) return;
    state.running = true;
    state.cancelled = false;
    setButtonLoading(true, '扫描中…');
    const overlay = renderProgress('正在扫描并自动分类', `将跳过前 ${state.startOffset} 个，最多读取 ${state.maxItems} 个作品`);
    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', () => { state.cancelled = true; });
    try {
      if (!isVideoSubtabActive()) throw new Error('请先切换到“我的 → 收藏 → 视频”后再运行。');
      updateProgress(4, '正在读取已有收藏夹名称');
      const existingFolders = await listAllFolders(getDouyinApi());
      const scanResult = await scrollAndCollectItems();
      if (!scanResult.items.length) throw new Error('没有从收藏视频列表读取到作品。');
      state.collected = scanResult.items;
      updateProgress(55, `已读取 ${scanResult.items.length} 个作品，正在进行一次合并自动分类`);
      const plan = await analyzeItemsForAutoCategories(scanResult.items, Array.from(existingFolders.keys()));
      if (state.cancelled) throw new Error('已停止整理');
      updateProgress(100, '自动分类完成');
      await sleep(220);
      renderAutoPlan(scanResult, plan);
    } catch (error) {
      renderError(error);
    } finally {
      state.running = false;
      setButtonLoading(false);
      mountButton();
    }
  }

  async function runOrganizer(query) {
    if (state.running || state.moving) return;
    state.running = true;
    state.cancelled = false;
    setButtonLoading(true, '扫描中…');
    const overlay = renderProgress('正在扫描收藏视频', `将跳过前 ${state.startOffset} 个，最多读取 ${state.maxItems} 个作品`);
    overlay.querySelector('[data-action="stop"]')?.addEventListener('click', () => { state.cancelled = true; });
    try {
      if (!isVideoSubtabActive()) throw new Error('请先切换到“我的 → 收藏 → 视频”后再运行。');
      const scanResult = await scrollAndCollectItems();
      if (!scanResult.items.length) {
        if (scanResult.discoveredCount <= state.startOffset && state.startOffset > 0) {
          throw new Error(`当前只发现 ${scanResult.discoveredCount} 个作品，未到达起点 ${state.startOffset}。`);
        }
        throw new Error('没有从收藏视频列表读取到作品。');
      }
      state.collected = scanResult.items;
      updateProgress(55, `已读取 ${scanResult.items.length} 个作品，正在进行一次合并 AI 分析`);
      const analysis = await analyzeItems(query, scanResult.items);
      if (state.cancelled) throw new Error('已停止整理');
      updateProgress(100, '筛选完成');
      await sleep(220);
      renderAnalysis(scanResult, analysis);
    } catch (error) {
      renderError(error);
    } finally {
      state.running = false;
      setButtonLoading(false);
      mountButton();
    }
  }

  function scheduleMount() {
    if (state.running || state.moving) return;
    clearTimeout(state.mountTimer);
    state.mountTimer = setTimeout(mountButton, 180);
  }

  function cleanup() {
    state.cancelled = true;
    state.observer?.disconnect();
    clearTimeout(state.mountTimer);
    document.getElementById(HOST_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    window.removeEventListener('popstate', scheduleMount);
    window.removeEventListener('hashchange', scheduleMount);
    window.removeEventListener('resize', scheduleMount);
    delete window[CLEANUP_KEY];
    delete window[API_KEY];
  }

  window[CLEANUP_KEY] = cleanup;
  window[API_KEY] = {
    start(query) {
      const normalized = cleanText(query);
      if (!normalized) return openStartSheet();
      state.mode = 'filter';
      state.query = normalized;
      return runOrganizer(normalized);
    },
    startAuto() {
      state.mode = 'auto';
      return runAutoOrganizer();
    },
    open: openStartSheet,
    cleanup,
    refresh: mountButton,
    getState() {
      return {
        running: state.running,
        moving: state.moving,
        mode: state.mode,
        query: state.query,
        collectedCount: state.collected.length,
        matchCount: state.analysis?.matches?.length || 0,
        autoCategoryCount: state.autoPlan?.categories?.filter(category => !category.isOther).length || 0,
        lastResult: state.lastResult
      };
    }
  };

  injectStyle();
  mountButton();
  state.observer = new MutationObserver(scheduleMount);
  state.observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', scheduleMount);
  window.addEventListener('hashchange', scheduleMount);
  window.addEventListener('resize', scheduleMount);
  console.log('[Yuze Douyin Organizer] 抖音收藏整理按钮已启用');
})();
