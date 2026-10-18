(function() {
  'use strict';

  const SCRIPT_ID = 'tabbit-xhs-album-batch-uncollect';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const ANCHOR_ID = `${SCRIPT_ID}-anchor`;
  const BUTTON_ID = `${SCRIPT_ID}-button`;
  const OVERLAY_ID = `${SCRIPT_ID}-overlay`;
  const CLEANUP_KEY = '__tabbitXhsAlbumBatchUncollectCleanup';

  if (window[CLEANUP_KEY]) window[CLEANUP_KEY]();

  const defaultConfig = {
    maxScanNotes: 300,
    maxScrollRounds: 120,
    scrollStepRatio: 0.82,
    scrollDelay: 650,
    stableRoundsToStop: 5,
    apiRequestTimeoutMs: 12000,
    apiRetryCount: 2,
    apiRetryDelay: 520,
    apiStepDelay: 160,
    verifyAfterUncollect: true,
    verifyBoardNoteDelay: 900,
    maxVerifyPages: 12
  };

  const rawConfig = window.__tabbitXhsAlbumBatchUncollectConfig || {};
  const config = {
    ...defaultConfig,
    ...rawConfig,
    maxScanNotes: asInt(rawConfig.maxScanNotes, defaultConfig.maxScanNotes, 1),
    maxScrollRounds: asInt(rawConfig.maxScrollRounds, defaultConfig.maxScrollRounds, 1),
    scrollStepRatio: asNumber(rawConfig.scrollStepRatio, defaultConfig.scrollStepRatio, 0.2, 2),
    scrollDelay: asInt(rawConfig.scrollDelay, defaultConfig.scrollDelay, 80),
    stableRoundsToStop: asInt(rawConfig.stableRoundsToStop, defaultConfig.stableRoundsToStop, 1),
    apiRequestTimeoutMs: asInt(rawConfig.apiRequestTimeoutMs, defaultConfig.apiRequestTimeoutMs, 3000),
    apiRetryCount: asInt(rawConfig.apiRetryCount, defaultConfig.apiRetryCount, 0),
    apiRetryDelay: asInt(rawConfig.apiRetryDelay, defaultConfig.apiRetryDelay, 100),
    apiStepDelay: asInt(rawConfig.apiStepDelay, defaultConfig.apiStepDelay, 0),
    verifyAfterUncollect: rawConfig.verifyAfterUncollect === undefined ? defaultConfig.verifyAfterUncollect : rawConfig.verifyAfterUncollect !== false,
    verifyBoardNoteDelay: asInt(rawConfig.verifyBoardNoteDelay, defaultConfig.verifyBoardNoteDelay, 0),
    maxVerifyPages: asInt(rawConfig.maxVerifyPages, defaultConfig.maxVerifyPages, 1)
  };

  const state = {
    observer: null,
    scanTimer: null,
    running: false,
    apiModule: null,
    notes: []
  };

  function asInt(value, fallback, min) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.floor(number));
  }

  function asNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.max(min, Math.min(max, number));
  }

  function cleanText(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(value) {
    return cleanText(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeUrl(value, base = location.href) {
    const raw = cleanText(value);
    if (!raw || raw.startsWith('javascript:')) return '';
    try {
      if (raw.startsWith('//')) return `${location.protocol}${raw}`;
      return new URL(raw, base).href;
    } catch (error) {
      return '';
    }
  }

  function normalizeHref(value) {
    return normalizeUrl(value).split('#')[0];
  }

  function visible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function getCurrentBoardId() {
    const match = location.pathname.match(/\/board\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }

  function getBoardDetailInfo(href) {
    const url = normalizeUrl(href);
    if (!url) return null;
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/board\/([^/?#]+)\/([^/?#]+)/);
      if (!match) return null;
      return {
        boardId: decodeURIComponent(match[1]),
        noteId: decodeURIComponent(match[2]),
        href: parsed.href
      };
    } catch (error) {
      return null;
    }
  }

  function extractNoteId(href) {
    const text = String(href || '');
    const match = text.match(/\/(?:explore|discovery\/item)\/([A-Za-z0-9_-]+)/)
      || text.match(/\/user\/profile\/[A-Za-z0-9_-]+\/([A-Za-z0-9_-]+)/)
      || text.match(/\/board\/[A-Za-z0-9_-]+\/([A-Za-z0-9_-]+)/)
      || text.match(/[?&](?:note_id|noteId|notes_id|notesId)=([A-Za-z0-9_-]+)/);
    return match ? match[1] : '';
  }

  function scoreNoteHref(href) {
    const url = normalizeUrl(href);
    const noteId = extractNoteId(url);
    if (!url || !noteId) return -1;
    const currentBoardId = getCurrentBoardId();
    const boardInfo = getBoardDetailInfo(url);
    if (boardInfo) {
      let score = 100;
      if (currentBoardId && boardInfo.boardId === currentBoardId) score += 60;
      return score;
    }
    if (/\/(?:explore|discovery\/item)\//.test(url)) return 35;
    if (/\/user\/profile\//.test(url)) return 10;
    return 0;
  }

  function findNoteHrefNearElement(element) {
    const candidates = [];
    if (element?.matches?.('a[href]')) candidates.push(element);
    const card = element?.closest?.('section.note-item, .note-item, [class*="note-item"], [class*="NoteItem"], [data-note-id], [data-id], article, li, section');
    if (card) candidates.push(...Array.from(card.querySelectorAll('a[href]')));
    const hrefs = [];
    for (const anchor of candidates) {
      const href = normalizeHref(anchor.href || anchor.getAttribute('href') || '');
      if (extractNoteId(href)) hrefs.push(href);
    }
    hrefs.sort((left, right) => scoreNoteHref(right) - scoreNoteHref(left));
    return hrefs[0] || '';
  }

  function isUsableTitle(value) {
    const title = cleanText(value);
    if (!title || title.length < 2 || title.length > 160) return false;
    if (/^(赞|评论|收藏|分享|更多|登录|打开APP|小红书|关注|已关注|取消收藏)$/i.test(title)) return false;
    if (/^\d+(\.\d+)?[万wWkK]?$/.test(title)) return false;
    return true;
  }

  function collectTitleFromCard(card, anchor) {
    const selectors = ['a.title', '.title', '[class*="title"]', '[class*="Title"]', '[title]', '[aria-label]'];
    for (const selector of selectors) {
      const elements = Array.from(card?.querySelectorAll?.(selector) || []);
      for (const el of elements) {
        const text = cleanText(el.textContent || el.getAttribute?.('title') || el.getAttribute?.('aria-label'));
        if (isUsableTitle(text)) return text;
      }
    }
    const alt = cleanText(card?.querySelector?.('img')?.alt);
    if (isUsableTitle(alt)) return alt;
    const anchorText = cleanText(anchor?.textContent || anchor?.getAttribute?.('title') || anchor?.getAttribute?.('aria-label'));
    return isUsableTitle(anchorText) ? anchorText : '';
  }

  function collectImageFromCard(card) {
    const img = card?.querySelector?.('img');
    return normalizeUrl(img?.currentSrc || img?.src || img?.getAttribute?.('src') || img?.getAttribute?.('data-src') || '');
  }

  function collectVisibleBoardNotes() {
    const currentBoardId = getCurrentBoardId();
    const anchors = Array.from(document.querySelectorAll('a[href*="/board/"], a[href*="/explore/"], a[href*="/discovery/item/"], a[href*="/user/profile/"]'));
    const byKey = new Map();
    for (const anchor of anchors) {
      const href = findNoteHrefNearElement(anchor);
      const noteId = extractNoteId(href);
      if (!noteId) continue;
      const boardInfo = getBoardDetailInfo(href);
      if (currentBoardId && boardInfo && boardInfo.boardId !== currentBoardId) continue;
      const card = anchor.closest('section.note-item, .note-item, [class*="note-item"], [class*="NoteItem"], [data-note-id], [data-id], article, li, section') || anchor;
      const title = collectTitleFromCard(card, anchor) || `笔记 ${noteId}`;
      const key = noteId || normalizeHref(href);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, {
        noteId,
        href: normalizeHref(href),
        title,
        coverImage: collectImageFromCard(card)
      });
    }
    return Array.from(byKey.values()).slice(0, config.maxScanNotes);
  }

  function mergeNotes(existing, fresh) {
    const byKey = new Map(existing.map(note => [note.noteId || normalizeHref(note.href), note]));
    for (const item of fresh) {
      if (byKey.size >= config.maxScanNotes) break;
      const key = item.noteId || normalizeHref(item.href);
      if (!key || byKey.has(key)) continue;
      byKey.set(key, item);
    }
    return Array.from(byKey.values());
  }

  async function scanBoardNotes() {
    const originalY = window.scrollY;
    let items = collectVisibleBoardNotes();
    let lastCount = items.length;
    let stableRounds = 0;
    for (let round = 0; round < config.maxScrollRounds; round += 1) {
      if (items.length >= config.maxScanNotes) {
        updateProgress(72, `已达到扫描上限 ${config.maxScanNotes}`);
        break;
      }
      updateProgress(Math.min(72, 10 + round * 0.8), `正在扫描当前专辑，已发现 ${items.length} 篇`);
      window.scrollBy({ top: Math.max(520, Math.floor(window.innerHeight * config.scrollStepRatio)), behavior: 'smooth' });
      await sleep(config.scrollDelay);
      items = mergeNotes(items, collectVisibleBoardNotes());
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      if (items.length === lastCount) stableRounds += 1;
      else stableRounds = 0;
      lastCount = items.length;
      if ((nearBottom && stableRounds >= 1) || stableRounds >= config.stableRoundsToStop) break;
    }
    window.scrollTo({ top: originalY, behavior: 'smooth' });
    await sleep(260);
    return items.slice(0, config.maxScanNotes);
  }

  function getWebpackRequire() {
    let captured = null;
    const chunk = window.webpackChunkxhs_pc_web = window.webpackChunkxhs_pc_web || [];
    chunk.push([[`tabbit-xhs-album-uncollect-api-${Date.now()}`], {}, req => {
      captured = req;
    }]);
    if (!captured) throw new Error('没有获取到小红书 webpack runtime，无法调用前端接口封装');
    return captured;
  }

  function safeRequireModule(req, id) {
    try {
      return req?.(id);
    } catch (error) {
      console.warn('[Tabbit XHS Album Uncollect] require module failed', { id, error: errorText(error) });
      return null;
    }
  }

  function inspectApiExports(exports, found, checked) {
    if (!exports || checked.has(exports)) return;
    checked.add(exports);
    const entries = [];
    if (typeof exports === 'function') entries.push(['default', exports]);
    if (typeof exports === 'object') {
      for (const key of Object.keys(exports)) entries.push([key, exports[key]]);
    }
    for (const [, value] of entries) {
      if (typeof value !== 'function') continue;
      const source = Function.prototype.toString.call(value);
      if (!found.uncollect && /\/api\/sns\/web\/v1\/note\/uncollect|note\/uncollect/.test(source)) found.uncollect = value;
      if (!found.boardNote && /\/api\/sns\/web\/v1\/board\/note|board\/note/.test(source)) found.boardNote = value;
      if (found.uncollect && found.boardNote) break;
    }
  }

  function discoverXhsApiModule(req) {
    const found = { uncollect: null, boardNote: null };
    const checked = new Set();
    try {
      Object.values(req?.c || {}).forEach(module => inspectApiExports(module?.exports, found, checked));
    } catch (error) {
      console.warn('[Tabbit XHS Album Uncollect] inspect webpack cache failed', { error: errorText(error), detail: errorDetail(error) });
    }
    if ((!found.uncollect || !found.boardNote) && req?.m) {
      for (const id of Object.keys(req.m)) {
        inspectApiExports(safeRequireModule(req, id), found, checked);
        if (found.uncollect && found.boardNote) break;
      }
    }
    return found;
  }

  function getXhsApiModule() {
    if (state.apiModule?.uncollect) return state.apiModule;
    const req = getWebpackRequire();
    const known = safeRequireModule(req, 25717);
    const discovered = discoverXhsApiModule(req);
    const api = {
      uncollect: discovered.uncollect || known?.aG || known?.uncollect || null,
      boardNote: discovered.boardNote || null
    };
    if (!api.uncollect) throw new Error('没有找到小红书 note/uncollect 已签名接口封装');
    state.apiModule = api;
    console.debug('[Tabbit XHS Album Uncollect] 已获取小红书 API 模块', {
      hasUncollect: !!api.uncollect,
      hasBoardNote: !!api.boardNote
    });
    return api;
  }

  function withTimeout(promise, label, timeoutMs = config.apiRequestTimeoutMs) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} 超过 ${Math.round(timeoutMs / 1000)} 秒`)), timeoutMs);
      })
    ]).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  async function callApiWithRetry(factory, label, options = {}) {
    const retries = Math.max(0, Number(options.retries ?? config.apiRetryCount) || 0);
    let lastError = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await withTimeout(factory(), label, options.timeoutMs || config.apiRequestTimeoutMs);
        console.debug('[Tabbit XHS Album Uncollect] 请求完成', { label, attempt: attempt + 1, response: summarizeApiResponse(response) });
        return response;
      } catch (error) {
        lastError = error;
        if (attempt >= retries) break;
        const delay = config.apiRetryDelay * (attempt + 1);
        console.warn('[Tabbit XHS Album Uncollect] 请求失败，准备重试', { label, attempt: attempt + 1, delay, error: errorText(error), detail: errorDetail(error) });
        await sleep(delay);
      }
    }
    throw lastError || new Error(`${label} 失败`);
  }

  function summarizeApiResponse(response) {
    if (response == null || typeof response !== 'object') return response;
    return {
      code: response.code ?? response.data?.code,
      success: response.success ?? response.data?.success,
      msg: response.msg || response.message || response.data?.msg || response.data?.message || '',
      keys: Object.keys(response).slice(0, 8)
    };
  }

  function assertXhsSuccess(response, label) {
    if (response == null || typeof response !== 'object') return response;
    const code = response.code ?? response.data?.code;
    const success = response.success ?? response.data?.success;
    const msg = response.msg || response.message || response.data?.msg || response.data?.message || '';
    if (code === 0 || success === true) return response;
    if (code == null && success == null) return response;
    throw new Error(`${label} 返回失败${code != null ? ` code=${code}` : ''}${msg ? `：${msg}` : ''}`);
  }

  function errorText(error) {
    return cleanText(error?.message || error?.msg || error?.response?.msg || error?.response?.message || error?.data?.msg || error?.data?.message || error || '未知错误');
  }

  function errorDetail(error) {
    if (!error || typeof error !== 'object') return {};
    return {
      name: cleanText(error.name),
      message: errorText(error),
      code: error.code ?? error.response?.code ?? error.data?.code,
      status: error.status ?? error.response?.status,
      stack: cleanText(error.stack).split(' at ').slice(0, 3).join(' at ')
    };
  }

  function isLoginStateError(error) {
    return /无登录|登录信息|请先登录|未登录|login|unauthorized|401|403/i.test(errorText(error));
  }

  async function ensureXhsApiLoginReady() {
    const api = getXhsApiModule();
    if (!api.uncollect) throw new Error('小红书页面内已签名的取消收藏接口不可用，请刷新页面后重试');
    console.debug('[Tabbit XHS Album Uncollect] signed webpack api ready', {
      hasUncollect: true,
      hasBoardNote: !!api.boardNote
    });
    return { ready: true, strategy: 'signed-webpack-api' };
  }

  async function callUncollect(api, noteId) {
    const payloads = [
      { note_ids: noteId },
      { noteIds: noteId },
      { note_id: noteId },
      { noteId }
    ];
    let lastError = null;
    for (const payload of payloads) {
      try {
        const response = await callApiWithRetry(() => api.uncollect(payload), `取消收藏 ${noteId}`, { retries: 0 });
        assertXhsSuccess(response, `取消收藏 ${noteId}`);
        return response;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error(`取消收藏 ${noteId} 失败`);
  }

  async function uncollectOne(note) {
    if (!note.noteId) throw new Error('缺少 noteId');
    const api = getXhsApiModule();
    await callUncollect(api, note.noteId);
  }

  function collectNoteIdsFromApiValue(value, target = new Set()) {
    if (!value || target.size > 2000) return target;
    if (Array.isArray(value)) {
      value.forEach(item => collectNoteIdsFromApiValue(item, target));
      return target;
    }
    if (typeof value !== 'object') return target;
    const id = cleanText(value.id || value.note_id || value.noteId || value.notes_id || value.notesId);
    if (/^[A-Za-z0-9_-]{12,}$/.test(id)) target.add(id);
    Object.keys(value).forEach(key => {
      if (/note|card|item|list|data|items/i.test(key)) collectNoteIdsFromApiValue(value[key], target);
    });
    return target;
  }

  function collectCursorFromApiValue(value) {
    if (!value || typeof value !== 'object') return '';
    const direct = cleanText(value.cursor || value.next_cursor || value.nextCursor || value.lastCursor);
    if (direct) return direct;
    for (const key of Object.keys(value)) {
      if (!/data|page|cursor|note|list|items/i.test(key)) continue;
      const found = collectCursorFromApiValue(value[key]);
      if (found) return found;
    }
    return '';
  }

  function hasMoreFromApiValue(value) {
    if (!value || typeof value !== 'object') return false;
    if (value.has_more != null) return !!value.has_more;
    if (value.hasMore != null) return !!value.hasMore;
    if (value.more != null) return !!value.more;
    for (const key of Object.keys(value)) {
      if (!/data|page|cursor|note|list|items/i.test(key)) continue;
      if (hasMoreFromApiValue(value[key])) return true;
    }
    return false;
  }

  async function fetchBoardNoteIdsByApi(boardId) {
    const api = getXhsApiModule();
    if (!api.boardNote) throw new Error('没有找到 board/note 已签名接口封装，无法二次确认专辑内容');
    const ids = new Set();
    let cursor = '';
    for (let page = 0; page < config.maxVerifyPages; page += 1) {
      const payloads = [
        { board_id: boardId, num: 30, cursor, image_formats: 'jpg,webp,avif' },
        { boardId, num: 30, cursor, image_formats: 'jpg,webp,avif' }
      ];
      let response = null;
      let lastError = null;
      for (const payload of payloads) {
        try {
          response = await callApiWithRetry(() => api.boardNote(payload), `查询专辑笔记 ${boardId}`, { retries: 0 });
          assertXhsSuccess(response, `查询专辑笔记 ${boardId}`);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!response) throw lastError || new Error('查询专辑笔记失败');
      collectNoteIdsFromApiValue(response, ids);
      const nextCursor = collectCursorFromApiValue(response);
      if (!hasMoreFromApiValue(response) || !nextCursor || nextCursor === cursor) break;
      cursor = nextCursor;
    }
    return ids;
  }

  function iconSvg(name = 'trash', size = 16) {
    const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    const paths = {
      trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5"/><path d="M14 11v5"/>',
      close: '<path d="M18 6L6 18"/><path d="M6 6l12 12"/>',
      refresh: '<path d="M21 12a9 9 0 0 1-15.4 6.3"/><path d="M3 12A9 9 0 0 1 18.4 5.7"/><path d="M18 2v4h4"/><path d="M6 22v-4H2"/>',
      check: '<path d="M20 6L9 17l-5-5"/>'
    };
    return `<svg ${common}>${paths[name] || paths.trash}</svg>`;
  }

  function injectStyle() {
    document.getElementById(STYLE_ID)?.remove();
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${ANCHOR_ID}, #${OVERLAY_ID} {
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Segoe UI", sans-serif !important;
        letter-spacing: 0 !important;
      }

      #${ANCHOR_ID} {
        position: fixed !important;
        z-index: 2147483000 !important;
        right: clamp(14px, 3vw, 28px) !important;
        top: clamp(204px, 34vh, 292px) !important;
        display: flex !important;
        align-items: center !important;
      }

      #${BUTTON_ID} {
        appearance: none !important;
        -webkit-appearance: none !important;
        height: 40px !important;
        max-width: min(176px, calc(100vw - 32px)) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        padding: 0 14px 0 11px !important;
        border: 0.5px solid rgba(255, 255, 255, 0.72) !important;
        border-radius: 999px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.94), rgba(255,255,255,0.54)),
          linear-gradient(135deg, rgba(255,36,66,0.25), rgba(0,122,255,0.15), rgba(52,199,89,0.12)) !important;
        color: rgba(18, 24, 34, 0.92) !important;
        box-shadow:
          0 16px 38px rgba(15, 23, 42, 0.18),
          0 4px 12px rgba(15, 23, 42, 0.10),
          inset 0 1px 0 rgba(255,255,255,0.90) !important;
        backdrop-filter: blur(24px) saturate(1.68) !important;
        -webkit-backdrop-filter: blur(24px) saturate(1.68) !important;
        cursor: pointer !important;
        user-select: none !important;
        outline: none !important;
      }

      #${BUTTON_ID}:hover {
        transform: translateY(-1px) !important;
      }

      #${BUTTON_ID}:focus-visible {
        outline: 2px solid rgba(255,36,66,0.42) !important;
        outline-offset: 3px !important;
      }

      #${BUTTON_ID}[disabled] {
        cursor: default !important;
        opacity: 0.74 !important;
      }

      #${BUTTON_ID}.is-loading svg {
        animation: tabbitXhsAlbumUncollectSpin 900ms linear infinite !important;
      }

      #${BUTTON_ID} span {
        overflow: hidden !important;
        white-space: nowrap !important;
        text-overflow: ellipsis !important;
        font: 760 13px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif !important;
      }

      #${OVERLAY_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147482999 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 24px !important;
        background: rgba(18, 22, 30, 0.24) !important;
        backdrop-filter: blur(8px) saturate(1.18) !important;
        -webkit-backdrop-filter: blur(8px) saturate(1.18) !important;
        opacity: 0 !important;
        transition: opacity 200ms cubic-bezier(.2,.8,.2,1) !important;
      }

      #${OVERLAY_ID}.is-visible {
        opacity: 1 !important;
      }

      .${SCRIPT_ID}-sheet {
        width: min(720px, calc(100vw - 32px)) !important;
        max-height: min(760px, calc(100vh - 48px)) !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 20px !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.62)),
          linear-gradient(135deg, rgba(255,36,66,0.08), rgba(0,122,255,0.07), rgba(52,199,89,0.06)) !important;
        box-shadow: 0 34px 92px rgba(10,18,32,0.28), inset 0 1px 0 rgba(255,255,255,0.86) !important;
        backdrop-filter: blur(34px) saturate(1.64) !important;
        -webkit-backdrop-filter: blur(34px) saturate(1.64) !important;
        color: rgba(18,24,34,0.94) !important;
        transform: translateY(10px) scale(0.985) !important;
        transition: transform 200ms cubic-bezier(.2,.8,.2,1) !important;
      }

      #${OVERLAY_ID}.is-visible .${SCRIPT_ID}-sheet {
        transform: translateY(0) scale(1) !important;
      }

      .${SCRIPT_ID}-head {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        gap: 12px !important;
        align-items: start !important;
        padding: 18px 18px 14px !important;
        border-bottom: 0.5px solid rgba(255,255,255,0.62) !important;
      }

      .${SCRIPT_ID}-kicker {
        margin: 0 0 5px !important;
        font-size: 10px !important;
        line-height: 1.2 !important;
        font-weight: 780 !important;
        color: rgba(255,36,66,0.78) !important;
      }

      .${SCRIPT_ID}-title {
        margin: 0 !important;
        font-size: 20px !important;
        line-height: 1.2 !important;
        font-weight: 780 !important;
      }

      .${SCRIPT_ID}-subtitle {
        margin: 6px 0 0 !important;
        font-size: 12px !important;
        line-height: 1.45 !important;
        color: rgba(50,58,72,0.74) !important;
      }

      .${SCRIPT_ID}-close {
        appearance: none !important;
        width: 32px !important;
        height: 32px !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.48) !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        color: rgba(18,24,34,0.70) !important;
      }

      .${SCRIPT_ID}-body {
        min-height: 0 !important;
        overflow: auto !important;
        padding: 14px 18px 16px !important;
      }

      .${SCRIPT_ID}-progress {
        display: grid !important;
        gap: 12px !important;
      }

      .${SCRIPT_ID}-bar {
        position: relative !important;
        height: 8px !important;
        overflow: hidden !important;
        border-radius: 999px !important;
        background: rgba(18,24,34,0.08) !important;
      }

      .${SCRIPT_ID}-bar span {
        position: absolute !important;
        inset: 0 auto 0 0 !important;
        width: var(--tabbit-xhs-album-uncollect-progress, 6%) !important;
        border-radius: inherit !important;
        background: linear-gradient(90deg, rgba(255,36,66,0.88), rgba(0,122,255,0.76), rgba(52,199,89,0.66)) !important;
        transition: width 240ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .${SCRIPT_ID}-log {
        margin: 0 !important;
        font-size: 12px !important;
        line-height: 1.5 !important;
        color: rgba(48,56,70,0.76) !important;
      }

      .${SCRIPT_ID}-toolbar {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }

      .${SCRIPT_ID}-toolbar strong {
        font-size: 13px !important;
      }

      .${SCRIPT_ID}-list {
        display: grid !important;
        gap: 8px !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }

      .${SCRIPT_ID}-item {
        display: grid !important;
        grid-template-columns: 32px 52px minmax(0, 1fr) !important;
        gap: 10px !important;
        align-items: center !important;
        padding: 9px !important;
        border: 0.5px solid rgba(255,255,255,0.62) !important;
        border-radius: 12px !important;
        background: rgba(255,255,255,0.38) !important;
        cursor: pointer !important;
        position: relative !important;
        transition:
          background 160ms cubic-bezier(.2,.8,.2,1),
          border-color 160ms cubic-bezier(.2,.8,.2,1),
          box-shadow 160ms cubic-bezier(.2,.8,.2,1),
          transform 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .${SCRIPT_ID}-item:hover {
        background: rgba(255,255,255,0.56) !important;
        transform: translateY(-1px) !important;
      }

      .${SCRIPT_ID}-item.is-selected {
        border-color: rgba(0,122,255,0.42) !important;
        background:
          linear-gradient(145deg, rgba(255,255,255,0.76), rgba(255,255,255,0.44)),
          linear-gradient(135deg, rgba(255,36,66,0.14), rgba(0,122,255,0.13), rgba(52,199,89,0.08)) !important;
        box-shadow:
          0 10px 24px rgba(15,23,42,0.10),
          inset 0 0 0 1px rgba(255,255,255,0.42) !important;
      }

      .${SCRIPT_ID}-item input {
        position: absolute !important;
        opacity: 0 !important;
        pointer-events: none !important;
        width: 1px !important;
        height: 1px !important;
        margin: 0 !important;
      }

      .${SCRIPT_ID}-select-mark {
        width: 24px !important;
        height: 24px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1.5px solid rgba(50,58,72,0.32) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.62) !important;
        color: transparent !important;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.72) !important;
        transition:
          background 160ms cubic-bezier(.2,.8,.2,1),
          border-color 160ms cubic-bezier(.2,.8,.2,1),
          color 160ms cubic-bezier(.2,.8,.2,1),
          transform 160ms cubic-bezier(.2,.8,.2,1) !important;
      }

      .${SCRIPT_ID}-item.is-selected .${SCRIPT_ID}-select-mark {
        border-color: transparent !important;
        background: linear-gradient(135deg, rgba(255,36,66,0.94), rgba(0,122,255,0.86)) !important;
        color: white !important;
        transform: scale(1.04) !important;
      }

      .${SCRIPT_ID}-cover {
        width: 52px !important;
        height: 52px !important;
        border-radius: 8px !important;
        object-fit: cover !important;
        background: rgba(18,24,34,0.08) !important;
      }

      .${SCRIPT_ID}-item h3 {
        margin: 0 !important;
        font-size: 13px !important;
        line-height: 1.35 !important;
        font-weight: 720 !important;
        color: rgba(18,24,34,0.9) !important;
      }

      .${SCRIPT_ID}-item p {
        margin: 4px 0 0 !important;
        font-size: 11px !important;
        line-height: 1.35 !important;
        color: rgba(50,58,72,0.64) !important;
        word-break: break-all !important;
      }

      .${SCRIPT_ID}-actions {
        display: flex !important;
        justify-content: flex-end !important;
        flex-wrap: wrap !important;
        gap: 9px !important;
        padding: 13px 18px 16px !important;
        border-top: 0.5px solid rgba(255,255,255,0.62) !important;
      }

      .${SCRIPT_ID}-action {
        appearance: none !important;
        min-height: 34px !important;
        padding: 0 13px !important;
        border: 0.5px solid rgba(255,255,255,0.70) !important;
        border-radius: 999px !important;
        background: rgba(255,255,255,0.52) !important;
        color: rgba(18,24,34,0.78) !important;
        font: 720 12px/1 -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", sans-serif !important;
        cursor: pointer !important;
      }

      .${SCRIPT_ID}-action.primary {
        background: linear-gradient(135deg, rgba(255,36,66,0.88), rgba(0,122,255,0.72)) !important;
        color: white !important;
      }

      .${SCRIPT_ID}-action[disabled] {
        cursor: default !important;
        opacity: 0.55 !important;
      }

      @keyframes tabbitXhsAlbumUncollectSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  function renderShell(kicker, title, subtitle, bodyHtml, actionsHtml) {
    const overlay = document.getElementById(OVERLAY_ID) || document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.innerHTML = `
      <section class="${SCRIPT_ID}-sheet" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="${SCRIPT_ID}-head">
          <div>
            <p class="${SCRIPT_ID}-kicker">${escapeHtml(kicker)}</p>
            <h2 class="${SCRIPT_ID}-title">${escapeHtml(title)}</h2>
            <p class="${SCRIPT_ID}-subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <button class="${SCRIPT_ID}-close" type="button" aria-label="关闭">${iconSvg('close', 16)}</button>
        </div>
        <div class="${SCRIPT_ID}-body">${bodyHtml}</div>
        ${actionsHtml ? `<div class="${SCRIPT_ID}-actions">${actionsHtml}</div>` : ''}
      </section>
    `;
    if (!overlay.parentElement) document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('is-visible'));
    overlay.querySelector(`.${SCRIPT_ID}-close`)?.addEventListener('click', closeOverlay);
    return overlay;
  }

  function closeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.classList.remove('is-visible');
    setTimeout(() => overlay.remove(), 200);
  }

  function renderProgress(title, message) {
    renderShell(
      'ALBUM UNCOLLECT',
      title,
      message,
      `<div class="${SCRIPT_ID}-progress"><div class="${SCRIPT_ID}-bar"><span></span></div><p class="${SCRIPT_ID}-log">${escapeHtml(message)}</p></div>`,
      ''
    );
  }

  function updateProgress(progress, message) {
    const bar = document.querySelector(`.${SCRIPT_ID}-bar`);
    const log = document.querySelector(`.${SCRIPT_ID}-log`);
    if (bar) bar.style.setProperty('--tabbit-xhs-album-uncollect-progress', `${Math.max(6, Math.min(100, Math.round(progress)))}%`);
    if (log) log.textContent = message;
  }

  function renderError(error) {
    renderShell(
      '未完成',
      '取消收藏失败',
      errorText(error),
      '',
      `<button class="${SCRIPT_ID}-action primary" type="button" data-action="close">知道了</button>`
    ).querySelector('[data-action="close"]')?.addEventListener('click', closeOverlay);
  }

  function selectedNotesFromOverlay(overlay) {
    const selectedIds = new Set(Array.from(overlay.querySelectorAll('input[data-note-id]:checked')).map(input => input.getAttribute('data-note-id')));
    return state.notes.filter(note => selectedIds.has(note.noteId));
  }

  function updateSelectedCount(overlay) {
    const count = overlay.querySelectorAll('input[data-note-id]:checked').length;
    const total = overlay.querySelectorAll('input[data-note-id]').length;
    const countEl = overlay.querySelector('[data-role="selected-count"]');
    const removeButton = overlay.querySelector('[data-action="remove"]');
    overlay.querySelectorAll(`.${SCRIPT_ID}-item[data-selectable="true"]`).forEach(item => {
      const input = item.querySelector('input[data-note-id]');
      item.classList.toggle('is-selected', !!input?.checked);
      item.setAttribute('aria-selected', input?.checked ? 'true' : 'false');
    });
    if (countEl) countEl.textContent = `已选 ${count}/${total}`;
    if (removeButton) removeButton.disabled = count === 0;
  }

  function renderSelection(notes) {
    const itemsHtml = notes.map(note => `
      <li class="${SCRIPT_ID}-item is-selected" data-selectable="true" aria-selected="true">
        <span class="${SCRIPT_ID}-select-mark" aria-hidden="true">${iconSvg('check', 14)}</span>
        <input type="checkbox" data-note-id="${escapeHtml(note.noteId)}" checked aria-label="选择 ${escapeHtml(note.title)}">
        ${note.coverImage ? `<img class="${SCRIPT_ID}-cover" src="${escapeHtml(note.coverImage)}" alt="">` : `<div class="${SCRIPT_ID}-cover"></div>`}
        <div>
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.noteId)}</p>
        </div>
      </li>
    `).join('');
    const overlay = renderShell(
      'ALBUM UNCOLLECT',
      '选择要取消收藏的笔记',
      '会直接取消收藏。处理后这些笔记将不再出现在收藏和当前专辑中。',
      `
        <div class="${SCRIPT_ID}-toolbar">
          <strong data-role="selected-count">已选 ${notes.length}/${notes.length}</strong>
          <div>
            <button class="${SCRIPT_ID}-action" type="button" data-action="select-all">全选</button>
            <button class="${SCRIPT_ID}-action" type="button" data-action="select-none">清空</button>
          </div>
        </div>
        <ul class="${SCRIPT_ID}-list">${itemsHtml || `<li class="${SCRIPT_ID}-item"><div></div><div></div><div><h3>没有扫描到笔记</h3><p>请确认当前页面是小红书收藏专辑详情页。</p></div></li>`}</ul>
      `,
      `
        <button class="${SCRIPT_ID}-action" type="button" data-action="rescan">${iconSvg('refresh', 14)}重新扫描</button>
        <button class="${SCRIPT_ID}-action" type="button" data-action="cancel">取消</button>
        <button class="${SCRIPT_ID}-action primary" type="button" data-action="remove" ${notes.length ? '' : 'disabled'}>${iconSvg('trash', 14)}取消收藏</button>
      `
    );
    overlay.querySelectorAll('input[data-note-id]').forEach(input => {
      input.addEventListener('change', () => updateSelectedCount(overlay));
    });
    overlay.querySelectorAll(`.${SCRIPT_ID}-item[data-selectable="true"]`).forEach(item => {
      item.addEventListener('click', event => {
        const input = item.querySelector('input[data-note-id]');
        if (!input) return;
        if (event.target === input) return;
        input.checked = !input.checked;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    overlay.querySelector('[data-action="select-all"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('input[data-note-id]').forEach(input => { input.checked = true; });
      updateSelectedCount(overlay);
    });
    overlay.querySelector('[data-action="select-none"]')?.addEventListener('click', () => {
      overlay.querySelectorAll('input[data-note-id]').forEach(input => { input.checked = false; });
      updateSelectedCount(overlay);
    });
    overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', closeOverlay);
    overlay.querySelector('[data-action="rescan"]')?.addEventListener('click', startScan);
    overlay.querySelector('[data-action="remove"]')?.addEventListener('click', () => {
      const selected = selectedNotesFromOverlay(overlay);
      if (selected.length) uncollectSelected(selected);
    });
  }

  function renderResult(result) {
    const rows = [
      ...result.removed.map(item => `<li class="${SCRIPT_ID}-item"><div>${iconSvg('check', 16)}</div><div></div><div><h3>${escapeHtml(item.title)}</h3><p>已取消收藏</p></div></li>`),
      ...result.unverified.map(item => `<li class="${SCRIPT_ID}-item"><div>?</div><div></div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.error)}</p></div></li>`),
      ...result.failed.map(item => `<li class="${SCRIPT_ID}-item"><div>!</div><div></div><div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.error)}</p></div></li>`)
    ].join('');
    renderShell(
      '完成',
      `已取消 ${result.removed.length} 篇，未确认 ${result.unverified.length} 篇，失败 ${result.failed.length} 篇`,
      result.unverified.length ? '部分笔记接口返回成功，但二次查询仍看到它在当前专辑里。' : '已执行取消收藏。',
      `<ul class="${SCRIPT_ID}-list">${rows || `<li class="${SCRIPT_ID}-item"><div></div><div></div><div><h3>没有结果</h3><p>未处理任何笔记。</p></div></li>`}</ul>`,
      `<button class="${SCRIPT_ID}-action primary" type="button" data-action="close">完成</button>`
    ).querySelector('[data-action="close"]')?.addEventListener('click', closeOverlay);
  }

  function setButtonLoading(loading, label = '') {
    const button = document.getElementById(BUTTON_ID);
    if (!button) return;
    button.disabled = !!loading;
    button.classList.toggle('is-loading', !!loading);
    const text = button.querySelector('span');
    if (text) text.textContent = label || '取消收藏';
  }

  async function startScan() {
    if (state.running) return;
    if (!getCurrentBoardId()) {
      renderError(new Error('请在小红书收藏专辑详情页使用。'));
      return;
    }
    state.running = true;
    setButtonLoading(true, '扫描中');
    renderProgress('正在扫描专辑', '准备读取当前专辑内的笔记');
    try {
      const notes = await scanBoardNotes();
      state.notes = notes;
      updateProgress(100, `已扫描到 ${notes.length} 篇`);
      await sleep(180);
      renderSelection(notes);
    } catch (error) {
      renderError(error);
    } finally {
      state.running = false;
      setButtonLoading(false);
    }
  }

  async function uncollectSelected(selected) {
    if (state.running) return;
    const boardId = getCurrentBoardId();
    if (!boardId) {
      renderError(new Error('没有解析到当前专辑 id。'));
      return;
    }
    state.running = true;
    setButtonLoading(true, '取消中');
    const result = { removed: [], unverified: [], failed: [] };
    renderProgress('正在取消收藏', `准备处理 ${selected.length} 篇笔记`);
    try {
      updateProgress(5, '正在初始化小红书页面内已签名接口');
      await ensureXhsApiLoginReady();
      for (let index = 0; index < selected.length; index += 1) {
        const note = selected[index];
        updateProgress(10 + Math.round((index / Math.max(1, selected.length)) * 78), `正在取消 ${index + 1}/${selected.length}：${note.title}`);
        try {
          await uncollectOne(note);
          result.removed.push(note);
        } catch (error) {
          if (isLoginStateError(error)) throw error;
          result.failed.push({ ...note, error: errorText(error) });
        }
        if (config.apiStepDelay) await sleep(config.apiStepDelay);
      }
      if (config.verifyAfterUncollect && result.removed.length) {
        updateProgress(92, '正在二次确认当前专辑内容');
        try {
          if (config.verifyBoardNoteDelay) await sleep(config.verifyBoardNoteDelay);
          const stillInBoard = await fetchBoardNoteIdsByApi(boardId);
          const verified = [];
          for (const item of result.removed) {
            if (stillInBoard.has(item.noteId)) result.unverified.push({ ...item, error: '重新查询后仍在当前专辑中' });
            else verified.push(item);
          }
          result.removed = verified;
        } catch (error) {
          result.unverified.push(...result.removed.map(item => ({ ...item, error: `无法二次确认：${errorText(error)}` })));
          result.removed = [];
        }
      }
      updateProgress(100, '取消收藏流程完成');
      await sleep(220);
      renderResult(result);
    } catch (error) {
      renderError(error);
    } finally {
      state.running = false;
      setButtonLoading(false);
    }
  }

  function shouldMount() {
    return /xiaohongshu\.com$/i.test(location.hostname) && /\/board\/[^/?#]+/.test(location.pathname);
  }

  function mount() {
    injectStyle();
    const oldAnchor = document.getElementById(ANCHOR_ID);
    if (!shouldMount()) {
      oldAnchor?.remove();
      return;
    }
    let anchor = oldAnchor;
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = ANCHOR_ID;
      const button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.setAttribute('aria-label', '多选取消收藏当前小红书收藏专辑笔记');
      button.innerHTML = `${iconSvg('trash', 15)}<span>取消收藏</span>`;
      button.addEventListener('click', startScan);
      anchor.appendChild(button);
      document.body.appendChild(anchor);
    }
  }

  window[CLEANUP_KEY] = function cleanup() {
    state.observer?.disconnect();
    clearTimeout(state.scanTimer);
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(ANCHOR_ID)?.remove();
    document.getElementById(OVERLAY_ID)?.remove();
    window.removeEventListener('popstate', mount);
    window.removeEventListener('hashchange', mount);
    delete window[CLEANUP_KEY];
  };

  mount();
  state.observer = new MutationObserver(() => {
    clearTimeout(state.scanTimer);
    state.scanTimer = setTimeout(mount, 180);
  });
  state.observer.observe(document.body, { childList: true, subtree: true });
  window.addEventListener('popstate', mount);
  window.addEventListener('hashchange', mount);
  console.log('[Tabbit XHS Album Uncollect] 小红书收藏专辑多选取消收藏按钮已启用', { config });
})();