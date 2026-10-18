(function () {
  'use strict';

  const SCRIPT_ID = 'Yuze-bili-learning';
  const HOST_ID = `${SCRIPT_ID}-host`;
  const CLEANUP_KEY = `__${SCRIPT_ID}Cleanup`;
  const API_KEY = `__${SCRIPT_ID}Api`;
  const DB_NAME = 'Yuze-bili-learning-v1';
  const DB_VERSION = 1;
  const ANALYSIS_VERSION = 9;

  if (window[CLEANUP_KEY]) window[CLEANUP_KEY]();

  const state = {
    host: null,
    root: null,
    db: null,
    activeTab: 'overview',
    open: false,
    minimized: false,
    busy: false,
    busyLabel: '',
    requestId: '',
    routeKey: '',
    routeTimer: null,
    timeTimer: null,
    saveTimer: null,
    keyHandler: null,
    visibilityHandler: null,
    video: null,
    artifact: null,
    notes: [],
    cards: [],
    project: null,
    resources: [],
    transcriptSegments: [],
    goalDraft: '',
    levelDraft: 'intermediate',
    budgetDraft: '20',
    toast: null,
    flashcardId: '',
    quizAnswers: {},
    qa: [],
    learningStartedAt: 0,
    sessionVisibleSeconds: 0,
    lastTickAt: 0,
    scrollPositions: {},
    renderedTab: '',
    renderedBusy: false,
    lastError: null,
    transcriptDiagnostic: '',
    transcriptIdentity: null,
    transcriptValidation: null,
    logs: [],
    analysisRunId: '',
    analysisStartedAt: 0,
    subtitleBusy: false,
    subtitleBusyLabel: '',
    subtitleLoadPromise: null,
    subtitleAutoFollow: true,
    activeSubtitleIndex: -1,
    subtitleActivation: { status: 'unknown', message: '' }
  };

  const config = {
    bridgeTimeoutMs: 180000,
    maxTranscriptChars: 42000,
    maxComments: 100,
    maxResources: 80,
    maxProjectVideos: 20,
    maxLogs: 500,
    routePollMs: 1200,
    defaultGoal: '理解视频核心观点，掌握可复述、可应用的关键知识',
    analysisSchema: {
      one_line: '',
      goal_fit_score: 0,
      fit_reasons: [],
      difficulty: 'intermediate',
      information_density: 0,
      practice_level: 0,
      novelty: 0,
      recommended_watch_sec: 0,
      prerequisites: [],
      chapters: [],
      concepts: [],
      resources: [],
      quiz: [],
      flashcards: [],
      uncertainties: [],
      coverage: { subtitle: 0, visual: 0, audio: 0 }
    }
  };

  function uid(prefix) {
    const random = Math.random().toString(36).slice(2, 9);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function cleanText(value) {
    return String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function sanitizeLogDetails(value, depth = 0, seen = new WeakSet()) {
    if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      if (/^data:image\//i.test(value)) return `[image-data ${Math.round(value.length / 1024)}KB]`;
      return truncate(cleanText(value), 900);
    }
    if (depth >= 4) return '[max-depth]';
    if (typeof value !== 'object') return truncate(String(value), 300);
    if (seen.has(value)) return '[circular]';
    seen.add(value);
    if (Array.isArray(value)) return value.slice(0, 24).map(item => sanitizeLogDetails(item, depth + 1, seen));
    const result = {};
    Object.entries(value).slice(0, 30).forEach(([key, item]) => {
      result[key] = sanitizeLogDetails(item, depth + 1, seen);
    });
    return result;
  }

  function logEvent(level, stage, message, details = null) {
    const now = Date.now();
    const entry = {
      id: uid('log'),
      at: now,
      elapsed_ms: state.analysisStartedAt ? now - state.analysisStartedAt : 0,
      run_id: state.analysisRunId || '',
      level: ['debug', 'info', 'warn', 'error', 'success'].includes(level) ? level : 'info',
      stage: cleanText(stage) || 'general',
      message: truncate(cleanText(message), 700),
      details: details == null ? null : sanitizeLogDetails(details)
    };
    state.logs.push(entry);
    if (state.logs.length > config.maxLogs) state.logs.splice(0, state.logs.length - config.maxLogs);
    const consoleMethod = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : entry.level === 'debug' ? 'debug' : 'log';
    console[consoleMethod](`[Yuze Bili Learning][${entry.stage}] ${entry.message}`, entry.details || '');
    return entry;
  }

  function beginAnalysisLog(meta, force) {
    state.analysisRunId = uid('run');
    state.analysisStartedAt = Date.now();
    logEvent('info', 'analysis', force ? '开始强制重新分析' : '开始分析', {
      bvid: meta?.bvid,
      cid: meta?.cid,
      page: meta?.page,
      title: meta?.title,
      route: getRouteToken()
    });
  }

  function cleanMarkdown(value) {
    return String(value || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\u00a0/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function truncate(value, max) {
    const text = String(value || '');
    return text.length > max ? `${text.slice(0, max)}…` : text;
  }

  function clamp(value, min, max) {
    const number = Number(value);
    return Math.min(max, Math.max(min, Number.isFinite(number) ? number : min));
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatSubtitleTime(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const totalCentiseconds = Math.round(safe * 100);
    const h = Math.floor(totalCentiseconds / 360000);
    const m = Math.floor((totalCentiseconds % 360000) / 6000);
    const s = Math.floor((totalCentiseconds % 6000) / 100);
    const cs = totalCentiseconds % 100;
    const body = `${String(m).padStart(h > 0 ? 2 : 1, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    return h > 0 ? `${h}:${body}` : body;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function debounce(fn, wait) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function safeUrl(value) {
    try {
      const text = String(value || '').trim();
      if (!text) return '';
      const url = new URL(text, location.href);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function safeImageUrl(value) {
    const text = String(value || '').trim();
    if (/^data:image\/(?:jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i.test(text)) return text;
    return safeUrl(text);
  }

  function icon(name, size = 18) {
    const paths = {
      spark: '<path d="M12 2l1.4 4.1L17.5 7.5l-4.1 1.4L12 13l-1.4-4.1-4.1-1.4 4.1-1.4L12 2Z"/><path d="m5 13 .8 2.2L8 16l-2.2.8L5 19l-.8-2.2L2 16l2.2-.8L5 13Z"/><path d="m18 12 .7 1.8 1.8.7-1.8.7L18 17l-.7-1.8-1.8-.7 1.8-.7L18 12Z"/>',
      close: '<path d="M6 6l12 12M18 6 6 18"/>',
      minimize: '<path d="M5 12h14"/>',
      note: '<path d="M5 3h11l3 3v15H5z"/><path d="M15 3v4h4M8 11h8M8 15h6"/>',
      play: '<path d="m8 5 11 7-11 7z"/>',
      book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6z"/>',
      export: '<path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 13v7h14v-7"/>',
      folder: '<path d="M3 6h7l2 2h9v11H3z"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      link: '<path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1-1"/>',
      arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
      refresh: '<path d="M20 7v5h-5"/><path d="M18 16a8 8 0 1 1 1-8l1 4"/>',
      warning: '<path d="m12 3 10 18H2z"/><path d="M12 9v5M12 18h.01"/>'
    };
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.spark}</svg>`;
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        ['videos', 'artifacts', 'notes', 'cards', 'projects', 'logs'].forEach(name => {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('无法打开学习数据库'));
    });
  }

  function dbRequest(storeName, mode, operation) {
    if (!state.db) return Promise.resolve(null);
    return new Promise((resolve, reject) => {
      const tx = state.db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let request;
      try {
        request = operation(store);
      } catch (error) {
        reject(error);
        return;
      }
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      } else {
        tx.oncomplete = () => resolve(null);
      }
      tx.onerror = () => reject(tx.error);
    });
  }

  const store = {
    get: (name, id) => dbRequest(name, 'readonly', s => s.get(id)),
    all: name => dbRequest(name, 'readonly', s => s.getAll()).then(value => value || []),
    put: (name, value) => dbRequest(name, 'readwrite', s => s.put(value)),
    delete: (name, id) => dbRequest(name, 'readwrite', s => s.delete(id))
  };

  function getInitialState() {
    const candidates = [window.__INITIAL_STATE__, window.__initialState, window.__INITIAL_DATA__];
    return candidates.find(item => item && typeof item === 'object') || {};
  }

  function getPlayInfo() {
    return window.__playinfo__ || window.__PLAYINFO__ || {};
  }

  function getBvidFromPath(pathname = location.pathname) {
    return cleanText(String(pathname || '').match(/\/video\/(BV[\w]+)/i)?.[1]);
  }

  function getInitialStateBvid(initial = getInitialState()) {
    return cleanText(initial?.bvid || initial?.videoData?.bvid || '');
  }

  function sameBvid(left, right) {
    return Boolean(left && right && String(left).toUpperCase() === String(right).toUpperCase());
  }

  function parseVideoIdentity() {
    const initial = getInitialState();
    const pathBvid = getBvidFromPath();
    const initialBvid = getInitialStateBvid(initial);
    // B 站为 SPA：自动连播/相关推荐跳转后 __INITIAL_STATE__ 可能仍属于上一条视频。
    // 只要 URL 中存在 BVID，就把 URL 作为唯一身份真源；仅在两者明确一致时复用初始状态。
    const bvid = pathBvid || initialBvid;
    const initialMatchesCurrent = !pathBvid || sameBvid(pathBvid, initialBvid);
    const video = getPrimaryVideoElement();
    const urlPage = Number(new URL(location.href).searchParams.get('p') || 1);
    const pageData = initialMatchesCurrent && Array.isArray(initial.videoData?.pages)
      ? initial.videoData.pages.find(item => Number(item.page) === urlPage) || initial.videoData.pages[0]
      : null;
    const cid = cleanText(initialMatchesCurrent ? (initial.cid || initial.videoData?.cid || pageData?.cid || '0') : '0');
    const page = Math.max(1, Number(urlPage || pageData?.page || 1));
    const duration = Number(video?.duration || (initialMatchesCurrent ? initial.videoData?.duration : 0) || pageData?.duration || 0);
    const id = bvid ? `bilibili:${bvid}:${cid}:${page}` : `bilibili:url:${location.pathname}:${page}`;
    return { id, bvid, cid, page, duration, identity_source: pathBvid ? 'url' : 'initial-state' };
  }

  function getPrimaryVideoElement() {
    const preferredSelectors = [
      '.bpx-player-video-wrap video',
      '.bpx-player-container video',
      '#bilibili-player video',
      '[aria-label="哔哩哔哩播放器"] video'
    ];
    const candidates = Array.from(new Set([
      ...preferredSelectors.flatMap(selector => Array.from(document.querySelectorAll(selector))),
      ...Array.from(document.querySelectorAll('video'))
    ]));
    const ranked = candidates
      .map(video => {
        const rect = video.getBoundingClientRect();
        const style = getComputedStyle(video);
        const visible = video.isConnected
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || 1) > 0.02
          && rect.width >= 160
          && rect.height >= 90;
        const inMainPlayer = Boolean(video.closest('.bpx-player-video-wrap, .bpx-player-container, #bilibili-player, [aria-label="哔哩哔哩播放器"]'));
        const viewportOverlap = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0))
          * Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
        let score = visible ? 1_000_000_000 : -1_000_000_000;
        if (inMainPlayer) score += 300_000_000;
        if (!video.paused && !video.ended) score += 200_000_000;
        if (video.currentSrc || video.src) score += 20_000_000;
        score += viewportOverlap * 100;
        score += Math.max(0, rect.width) * Math.max(0, rect.height) * 10;
        score += Number(video.readyState || 0) * 100_000;
        return { video, visible, score };
      })
      .sort((a, b) => b.score - a.score);
    return (ranked.find(item => item.visible) || ranked[0])?.video || null;
  }

  function getVideoMetadata() {
    const initial = getInitialState();
    const identity = parseVideoIdentity();
    const initialMatchesCurrent = !identity.bvid || sameBvid(identity.bvid, getInitialStateBvid(initial));
    const videoData = initialMatchesCurrent ? (initial.videoData || {}) : {};
    const title = cleanText(document.querySelector('h1.video-title, h1')?.textContent || videoData.title || document.title.replace(/_哔哩哔哩.*/, ''));
    const author = cleanText(document.querySelector('.up-name, .up-detail-top .name, [class*="up-name"]')?.textContent || videoData.owner?.name || '');
    const description = cleanText(document.querySelector('.desc-info-text, .video-desc-container, [class*="desc-info"]')?.textContent || videoData.desc || '');
    const cover = safeUrl(document.querySelector('meta[property="og:image"]')?.content || videoData.pic || '');
    const videoEl = getPrimaryVideoElement();
    const duration = Number(videoEl?.duration || identity.duration || videoData.duration || 0);
    return {
      ...identity,
      title,
      author,
      description,
      cover,
      duration,
      url: location.href,
      currentTime: Number(videoEl?.currentTime || 0),
      identity_verified: initialMatchesCurrent && identity.cid && identity.cid !== '0' ? 'initial-state' : '',
      updated_at: Date.now()
    };
  }

  function getRouteToken() {
    const identity = parseVideoIdentity();
    return identity.bvid
      ? `${identity.bvid}:${identity.page}`
      : `${location.pathname}:${location.search}`;
  }

  function mediaSourceOf(video) {
    return cleanText(video?.currentSrc || video?.src || '');
  }

  function shortFingerprint(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function isTrustedValidationPage() {
    const host = String(location.hostname || '').toLowerCase();
    return location.protocol === 'file:' || host === 'localhost' || host === '127.0.0.1' || host === '::1';
  }

  function getLearningBridge() {
    // Mock Bridge 只允许出现在本地验证页。生产 B 站页面必须使用真实 LLMBridge，
    // 避免页面残留的调试对象让所有视频都返回同一份假数据。
    if (isTrustedValidationPage() && window.__YuzeBiliLearningBridge?.chat) {
      return window.__YuzeBiliLearningBridge;
    }
    return window.LLMBridge;
  }

  function createAnalysisContext(meta) {
    const video = getPrimaryVideoElement();
    const videoSrc = mediaSourceOf(video);
    return {
      routeToken: getRouteToken(),
      bvid: cleanText(meta?.bvid),
      cid: cleanText(meta?.cid),
      page: Number(meta?.page || 1),
      video,
      videoSrc,
      mediaFingerprint: shortFingerprint(`${meta?.bvid || ''}|${meta?.cid || ''}|${meta?.page || 1}|${videoSrc}`),
      playerDuration: Number(video?.duration || 0),
      createdAt: Date.now()
    };
  }

  function getMediaDebugSnapshot() {
    const meta = getVideoMetadata();
    const context = createAnalysisContext(meta);
    return {
      routeToken: context.routeToken,
      bvid: meta.bvid,
      cid: meta.cid,
      page: meta.page,
      title: meta.title,
      identityVerified: meta.identity_verified || '',
      metadataDuration: Number(meta.duration || 0),
      playerDuration: context.playerDuration,
      playerReadyState: Number(context.video?.readyState || 0),
      playerSize: `${Number(context.video?.videoWidth || 0)}x${Number(context.video?.videoHeight || 0)}`,
      sourceKind: /^blob:/i.test(context.videoSrc) ? 'blob' : /^https?:/i.test(context.videoSrc) ? 'http' : context.videoSrc ? 'other' : 'empty',
      mediaFingerprint: context.mediaFingerprint,
      matchesMetadata: playerMatchesMetadata(context.video, meta),
      contextCurrent: isAnalysisContextCurrent(context)
    };
  }

  function playerMatchesMetadata(video, meta) {
    if (isTrustedValidationPage() && getLearningBridge()?.chat && (!video || !mediaSourceOf(video))) return true;
    if (!video || !video.isConnected || !mediaSourceOf(video) || Number(video.readyState || 0) < 2) return false;
    const playerDuration = Number(video.duration || 0);
    const metadataDuration = Number(meta?.duration || 0);
    if (!Number.isFinite(playerDuration) || playerDuration <= 0) return false;
    if (!Number.isFinite(metadataDuration) || metadataDuration <= 0) return !meta?.public_api;
    if (meta?.identity_verified && meta?.title) {
      const visibleTitle = cleanText(document.querySelector('h1.video-title, .video-info-title-inner h1, h1')?.textContent);
      const expected = compactEvidenceText(meta.title);
      const actual = compactEvidenceText(visibleTitle);
      if (expected && actual && !expected.includes(actual) && !actual.includes(expected)) return false;
    }
    return Math.abs(playerDuration - metadataDuration) <= Math.max(12, metadataDuration * 0.035);
  }

  async function waitForMatchingPlayer(meta, routeToken, timeoutMs = 12000) {
    const deadline = Date.now() + timeoutMs;
    let stableSignature = '';
    let stableSince = 0;
    do {
      if (getRouteToken() !== routeToken) return null;
      const context = createAnalysisContext(meta);
      if (context.routeToken === routeToken && playerMatchesMetadata(context.video, meta)) {
        if (isTrustedValidationPage() && !context.videoSrc) return context;
        const signature = `${context.routeToken}|${context.videoSrc}|${Math.round(context.playerDuration * 10)}`;
        if (signature !== stableSignature) {
          stableSignature = signature;
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= 1600) {
          return context;
        }
      } else {
        stableSignature = '';
        stableSince = 0;
      }
      await sleep(160);
    } while (Date.now() < deadline);
    return null;
  }

  function isAnalysisContextCurrent(context) {
    if (!context || getRouteToken() !== context.routeToken) return false;
    const identity = parseVideoIdentity();
    if (context.bvid && !sameBvid(identity.bvid, context.bvid)) return false;
    if (Number(identity.page || 1) !== Number(context.page || 1)) return false;
    // 场景扫描会主动 pause 主播放器。此时页面里某个自动播放的预览 video
    // 可能在 getPrimaryVideoElement() 的动态排序中暂时胜出，但这并不代表视频
    // 已切换。上下文应绑定创建时的 DOM video、媒体源、时长和路由，而不能
    // 依赖会随播放状态变化的“当前最高分元素”。
    if (context.video && !context.video.isConnected) return false;
    if (context.videoSrc && mediaSourceOf(context.video) !== context.videoSrc) return false;
    if (context.video && context.playerDuration > 0) {
      const currentDuration = Number(context.video.duration || 0);
      if (!Number.isFinite(currentDuration) || Math.abs(currentDuration - context.playerDuration) > 0.75) return false;
    }
    return true;
  }

  function isAnalysisRouteCurrent(context) {
    if (!context || getRouteToken() !== context.routeToken) return false;
    const identity = parseVideoIdentity();
    if (context.bvid && !sameBvid(identity.bvid, context.bvid)) return false;
    return Number(identity.page || 1) === Number(context.page || 1);
  }

  function assertAnalysisContext(context) {
    if (isAnalysisContextCurrent(context)) return;
    const error = new Error('检测到 B 站视频已切换，本次分析已取消');
    error.code = 'STALE_VIDEO_CONTEXT';
    throw error;
  }

  function isStaleVideoError(error) {
    return error?.code === 'STALE_VIDEO_CONTEXT';
  }

  function stopStaleAnalysis(requestId) {
    if (state.requestId !== requestId) return;
    state.requestId = uid('cancel');
    state.busy = false;
    state.busyLabel = '';
    state.subtitleBusy = false;
    state.subtitleBusyLabel = '';
    toast('检测到视频已切换，已取消旧视频分析。请在当前视频上重新分析。', 'warning');
    render();
  }

  async function fetchBilibiliJson(url, timeoutMs = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const target = new URL(url, location.href);
      const sendBilibiliSession = /(^|\.)bilibili\.com$/i.test(target.hostname);
      const response = await fetch(url, {
        method: 'GET',
        credentials: sendBilibiliSession ? 'include' : 'omit',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error(`B 站接口 HTTP ${response.status}`);
      const result = await response.json();
      if (typeof result?.code === 'number' && result.code !== 0) {
        throw new Error(`B 站接口 ${result.code}：${cleanText(result.message || result.msg || '请求失败')}`);
      }
      return result;
    } finally {
      clearTimeout(timer);
    }
  }

  async function enrichMetadataFromPublicApi(meta) {
    if (!meta?.bvid) return meta;
    try {
      const result = await fetchBilibiliJson(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(meta.bvid)}`);
      if (result?.code !== 0 || !result.data) return meta;
      const data = result.data;
      if (data.bvid && !sameBvid(data.bvid, meta.bvid)) {
        throw new Error(`公开视频接口身份不匹配：期望 ${meta.bvid}，实际 ${data.bvid}`);
      }
      const page = (Array.isArray(data.pages) ? data.pages : []).find(item => Number(item.page) === Number(meta.page)) || data.pages?.[0];
      const cid = cleanText(page?.cid || data.cid || meta.cid);
      return {
        ...meta,
        id: cid ? `bilibili:${meta.bvid}:${cid}:${meta.page}` : meta.id,
        cid,
        title: cleanText(data.title) || meta.title,
        author: cleanText(data.owner?.name) || meta.author,
        description: cleanText(data.desc) || meta.description,
        cover: safeUrl(data.pic) || meta.cover,
        duration: Number(page?.duration || data.duration || meta.duration || 0),
        public_api: true,
        identity_verified: 'public-api'
      };
    } catch (error) {
      console.debug('[Yuze Bili Learning] 公开视频信息接口不可用', error);
      return meta;
    }
  }

  function collectUrlsDeep(value, output, depth = 0, seen = new Set()) {
    if (depth > 8 || value == null) return;
    if (typeof value === 'string') {
      if (/^(https?:|blob:)/i.test(value) && /(?:\.m4s|\.mp4|\.flv|\.webm|bilivideo|upos)/i.test(value)) output.push(value.replace(/\\u002F/g, '/').replace(/\\\//g, '/'));
      return;
    }
    if (typeof value !== 'object' || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) value.forEach(item => collectUrlsDeep(item, output, depth + 1, seen));
    else Object.values(value).forEach(item => collectUrlsDeep(item, output, depth + 1, seen));
  }

  function getVideoCandidates() {
    const urls = [];
    const primaryVideo = getPrimaryVideoElement();
    if (!primaryVideo) return [];
    [primaryVideo, ...Array.from(primaryVideo.querySelectorAll('source'))].forEach(element => {
      [element.currentSrc, element.src, element.getAttribute?.('src')].forEach(value => {
        if (value) urls.push(value);
      });
    });
    // 不再遍历全局 __playinfo__：SPA 跳转后它可能仍缓存上一条视频的播放地址。
    const unique = Array.from(new Set(urls.map(value => String(value || '').trim()).filter(Boolean)));
    return unique.sort((a, b) => videoCandidateScore(b) - videoCandidateScore(a));
  }

  function videoCandidateScore(value) {
    const text = String(value || '').toLowerCase();
    let score = 0;
    if (/https?:/.test(text)) score += 20;
    if (/video\.m4s|\.mp4/.test(text)) score += 25;
    if (/bilivideo|upos/.test(text)) score += 15;
    if (/blob:/.test(text)) score -= 100;
    if (/audio\.m4s|mime=audio|audio\//.test(text)) score -= 80;
    const width = Number(new URLSearchParams(text.split('?')[1] || '').get('width') || 0);
    score += Math.min(20, width / 100);
    return score;
  }

  function getBilibiliSubtitleUiState() {
    const caption = document.querySelector([
      '.bpx-player-subtitle-wrap [role="caption"]',
      '.bpx-player-subtitle-panel-text',
      '.bpx-player-subtitle-panel-text-content',
      '.bili-subtitle-x-subtitle-panel-text'
    ].join(', '));
    const captionStyle = caption ? getComputedStyle(caption) : null;
    const captionVisible = Boolean(caption
      && !caption.hidden
      && captionStyle?.display !== 'none'
      && captionStyle?.visibility !== 'hidden'
      && Number(captionStyle?.opacity || 1) > 0.02);
    const captionText = captionVisible ? cleanText(caption.textContent) : '';
    const closeSwitch = document.querySelector('.bpx-player-ctrl-subtitle-close-switch, .bpx-player-ctrl-subtitle-fake-switch');
    const closeActive = Boolean(closeSwitch?.classList.contains('bpx-state-active'));
    const languageItems = Array.from(document.querySelectorAll('.bpx-player-ctrl-subtitle-language-item'));
    const activeLanguage = languageItems.find(item => item.classList.contains('bpx-state-active'));
    const preferredLanguage = languageItems.find(item => /中文|汉语|AI|自动/i.test(cleanText(item.textContent))) || languageItems[0] || null;
    const enabled = Boolean(captionText || (activeLanguage && !closeActive));
    return {
      enabled,
      captionText,
      activeLanguage: cleanText(activeLanguage?.textContent),
      preferredLanguage,
      hasControl: Boolean(document.querySelector('.bpx-player-ctrl-subtitle, [aria-label="字幕"]')),
      languageCount: languageItems.length
    };
  }

  async function ensureBilibiliSubtitlesEnabled() {
    let info = getBilibiliSubtitleUiState();
    if (info.enabled) {
      state.subtitleActivation = {
        status: 'enabled',
        message: `播放器字幕已开启${info.activeLanguage ? `：${info.activeLanguage}` : ''}`
      };
      return state.subtitleActivation;
    }

    const control = document.querySelector('.bpx-player-ctrl-subtitle, [aria-label="字幕"]');
    if (!control) {
      state.subtitleActivation = { status: 'unavailable', message: '当前播放器没有检测到字幕按钮' };
      return state.subtitleActivation;
    }

    try {
      control.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, view: window }));
      await sleep(260);
      info = getBilibiliSubtitleUiState();
      if (!info.preferredLanguage) {
        control.click();
        await sleep(360);
        info = getBilibiliSubtitleUiState();
      }
      info.preferredLanguage?.click();
      await sleep(900);
      info = getBilibiliSubtitleUiState();
      if (info.enabled) {
        state.subtitleActivation = {
          status: 'enabled',
          message: `已自动开启${info.activeLanguage || '中文字幕'}`
        };
      } else {
        state.subtitleActivation = {
          status: 'needs-user',
          message: '未能自动开启字幕，请在播放器右下角“字幕”菜单中选择“中文（AI）”后重试'
        };
      }
    } catch (error) {
      state.subtitleActivation = {
        status: 'needs-user',
        message: `自动开启字幕失败：${cleanText(error?.message || error)}。请手动选择“中文（AI）”`
      };
    }
    return state.subtitleActivation;
  }

  function normalizeTranscriptSegments(items) {
    const result = [];
    const seen = new Set();
    (Array.isArray(items) ? items : []).map(item => ({
      start: Math.max(0, Number(item?.start || 0)),
      end: Math.max(0, Number(item?.end ?? item?.start ?? 0)),
      text: cleanText(item?.text)
    })).filter(item => item.text).sort((a, b) => a.start - b.start).forEach(item => {
      const key = `${Math.round(item.start * 10)}:${item.text}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push({ ...item, end: Math.max(item.start, item.end) });
    });
    return result;
  }

  function transcriptEndTime(segments) {
    return (Array.isArray(segments) ? segments : []).reduce((latest, item) => {
      return Math.max(latest, Number(item?.end || item?.start || 0));
    }, 0);
  }

  function subtitleEvidenceSimilarity(left, right) {
    const a = compactEvidenceText(left);
    const b = compactEvidenceText(right);
    if (!a || !b) return 0;
    if (a.includes(b) || b.includes(a)) return Math.min(a.length, b.length) / Math.max(a.length, b.length) > 0.34 ? 1 : 0.7;
    const grams = value => {
      const result = new Set();
      for (let index = 0; index < value.length - 1; index += 1) result.add(value.slice(index, index + 2));
      if (!result.size) Array.from(value).forEach(character => result.add(character));
      return result;
    };
    const aGrams = grams(a);
    const bGrams = grams(b);
    let overlap = 0;
    aGrams.forEach(gram => { if (bGrams.has(gram)) overlap += 1; });
    return overlap / Math.max(1, Math.min(aGrams.size, bGrams.size));
  }

  function transcriptTextsNear(segments, time, windowSec = 12) {
    return (Array.isArray(segments) ? segments : [])
      .filter(item => Math.abs(Number(item?.start || 0) - Number(time || 0)) <= windowSec)
      .map(item => cleanText(item?.text))
      .filter(Boolean);
  }

  function validateRemoteTranscriptAgainstPlayer(remoteSegments, localSegments, video) {
    const remote = Array.isArray(remoteSegments) ? remoteSegments : [];
    const local = Array.isArray(localSegments) ? localSegments : [];
    const checks = [];
    const currentTime = Number(video?.currentTime || 0);
    const expectedDuration = Number(video?.duration || 0);
    const remoteEnd = transcriptEndTime(remote);
    if (expectedDuration > 30 && remoteEnd > expectedDuration + Math.max(8, expectedDuration * 0.06)) {
      checks.push({
        type: 'duration',
        expected_sec: expectedDuration,
        observed_sec: remoteEnd,
        similarity: 0
      });
    }
    const visibleCaption = getBilibiliSubtitleUiState().captionText;
    if (visibleCaption && Number.isFinite(currentTime)) {
      const candidates = transcriptTextsNear(remote, currentTime, 14);
      if (candidates.length) {
        const similarity = Math.max(...candidates.map(text => subtitleEvidenceSimilarity(visibleCaption, text)));
        checks.push({ type: 'visible-caption', time: currentTime, similarity, observed: truncate(visibleCaption, 80) });
      }
    }

    if (local.length) {
      const step = Math.max(1, Math.floor(local.length / 16));
      for (let index = 0; index < local.length && checks.length < 18; index += step) {
        const cue = local[index];
        const candidates = transcriptTextsNear(remote, cue.start, 5);
        if (!candidates.length) continue;
        const similarity = Math.max(...candidates.map(text => subtitleEvidenceSimilarity(cue.text, text)));
        checks.push({ type: 'text-track', time: cue.start, similarity, observed: truncate(cue.text, 80) });
      }
    }

    const visibleCheck = checks.find(item => item.type === 'visible-caption');
    const localChecks = checks.filter(item => item.type === 'text-track');
    const localMatchRatio = localChecks.length
      ? localChecks.filter(item => item.similarity >= 0.2).length / localChecks.length
      : null;
    const durationCheck = checks.find(item => item.type === 'duration');
    const compatible = !durationCheck
      && !(visibleCheck && visibleCheck.similarity < 0.16)
      && !(localChecks.length >= 3 && localMatchRatio < 0.34);
    let reason = '未取得可比对的播放器字幕，依赖 BVID/CID 强绑定';
    if (visibleCheck) reason = `当前可见字幕相似度 ${Math.round(visibleCheck.similarity * 100)}%`;
    if (localChecks.length >= 3) reason += `${visibleCheck ? '；' : ''}本地字幕命中 ${Math.round(localMatchRatio * 100)}%`;
    if (durationCheck) reason = `字幕结束于 ${formatTime(remoteEnd)}，但当前播放器总时长仅 ${formatTime(expectedDuration)}`;
    if (!compatible) reason = `远程字幕与当前播放器不一致：${reason}`;
    return { compatible, reason, checks };
  }

  async function fetchFreshVideoPageIdentity(meta) {
    if (!meta?.bvid) throw new Error('当前页面缺少 BVID，不能安全读取远程字幕');
    const result = await fetchBilibiliJson(`https://api.bilibili.com/x/web-interface/view?bvid=${encodeURIComponent(meta.bvid)}&_=${Date.now()}`);
    const data = result?.data;
    if (!data?.bvid || !sameBvid(data.bvid, meta.bvid)) {
      throw new Error(`字幕身份校验失败：期望 ${meta.bvid}，接口返回 ${cleanText(data?.bvid) || '空'}`);
    }
    const pages = Array.isArray(data.pages) ? data.pages : [];
    const page = pages.find(item => Number(item?.page) === Number(meta.page || 1)) || pages[0];
    const cid = cleanText(page?.cid || data.cid);
    if (!cid) throw new Error('当前分P没有可验证的 CID');
    if (meta.cid && String(meta.cid) !== '0' && String(meta.cid) !== String(cid)) {
      throw new Error(`字幕 CID 冲突：页面为 ${meta.cid}，最新接口为 ${cid}，已拒绝可能属于其他视频的字幕`);
    }
    return {
      bvid: cleanText(data.bvid),
      cid,
      page: Number(page?.page || meta.page || 1),
      title: cleanText(data.title),
      duration: Number(page?.duration || data.duration || 0)
    };
  }

  async function fetchCompleteBilibiliTranscript(meta) {
    if (!meta?.bvid) return { segments: [], language: '', trackCount: 0, identity: null };
    const identity = await fetchFreshVideoPageIdentity(meta);
    const player = await fetchBilibiliJson(`https://api.bilibili.com/x/player/v2?bvid=${encodeURIComponent(identity.bvid)}&cid=${encodeURIComponent(identity.cid)}&_=${Date.now()}`);
    const playerBvid = cleanText(player?.data?.bvid);
    const playerCid = cleanText(player?.data?.cid);
    if (playerBvid && !sameBvid(playerBvid, identity.bvid)) {
      throw new Error(`播放器字幕接口 BVID 冲突：期望 ${identity.bvid}，实际 ${playerBvid}`);
    }
    if (playerCid && playerCid !== identity.cid) {
      throw new Error(`播放器字幕接口 CID 冲突：期望 ${identity.cid}，实际 ${playerCid}`);
    }
    const subtitles = Array.isArray(player?.data?.subtitle?.subtitles) ? player.data.subtitle.subtitles : [];
    const chineseTracks = subtitles.filter(item => /zh|中文|汉语|ai-zh/i.test(`${item?.lan || ''} ${item?.lan_doc || ''}`));
    const candidates = (chineseTracks.length ? chineseTracks : subtitles).slice(0, 8);
    const tracks = (await Promise.all(candidates.map(async track => {
      const rawUrl = track?.subtitle_url?.startsWith('//') ? `https:${track.subtitle_url}` : track?.subtitle_url;
      const subtitleUrl = safeUrl(rawUrl);
      if (!subtitleUrl) return null;
      try {
        const subtitle = await fetchBilibiliJson(subtitleUrl, 10000);
        const segments = normalizeTranscriptSegments((Array.isArray(subtitle?.body) ? subtitle.body : []).map(item => ({
          start: Number(item.from || 0),
          end: Number(item.to || item.from || 0),
          text: item.content
        })));
        return segments.length ? {
          segments,
          language: cleanText(track?.lan_doc || track?.lan || 'B 站字幕'),
          end: transcriptEndTime(segments)
        } : null;
      } catch (error) {
        console.debug('[Yuze Bili Learning] 单条字幕轨读取失败', track?.lan_doc || track?.lan, error);
        return null;
      }
    }))).filter(Boolean);
    tracks.sort((a, b) => (b.end - a.end) || (b.segments.length - a.segments.length));
    return { ...(tracks[0] || { segments: [], language: '' }), trackCount: subtitles.length, identity };
  }

  async function extractTranscript(meta = state.video, analysisContext = null) {
    if (analysisContext) assertAnalysisContext(analysisContext);
    state.transcriptIdentity = null;
    state.transcriptValidation = null;
    const video = analysisContext?.video || getPrimaryVideoElement();
    const localSegments = [];
    if (video?.textTracks) {
      for (const track of Array.from(video.textTracks)) {
        try {
          if (track.mode === 'disabled') track.mode = 'hidden';
          await sleep(120);
          Array.from(track.cues || []).forEach(cue => {
            const text = cleanText(cue.text);
            if (text) localSegments.push({ start: Number(cue.startTime || 0), end: Number(cue.endTime || 0), text });
          });
        } catch (_) {}
      }
    }
    const local = normalizeTranscriptSegments(localSegments);
    let remote = { segments: [], language: '', trackCount: 0, identity: null };
    let remoteError = null;
    try {
      // 即使本地 textTrack 已有 cue，也继续读取接口；播放器轨可能只加载了当前附近的一小段。
      remote = await fetchCompleteBilibiliTranscript(meta);
      if (analysisContext) assertAnalysisContext(analysisContext);
      state.transcriptIdentity = remote.identity;
      state.transcriptValidation = validateRemoteTranscriptAgainstPlayer(remote.segments, local, video);
      logEvent(state.transcriptValidation.compatible ? 'success' : 'warn', 'subtitle-validation', state.transcriptValidation.reason, {
        identity: remote.identity,
        remote_count: remote.segments.length,
        local_count: local.length,
        checks: state.transcriptValidation.checks
      });
      if (remote.segments.length && !state.transcriptValidation.compatible) {
        const error = new Error(`${state.transcriptValidation.reason}，已拒绝该远程字幕并改用播放器字幕/关键帧`);
        error.code = 'TRANSCRIPT_IDENTITY_MISMATCH';
        remote = { ...remote, segments: [], rejected: true };
        remoteError = error;
        console.warn('[Yuze Bili Learning] 拒绝疑似属于其他视频的远程字幕', state.transcriptValidation);
      }
    } catch (error) {
      if (isStaleVideoError(error)) throw error;
      remoteError = error;
      console.debug('[Yuze Bili Learning] 公开字幕接口不可用', error);
    }

    const localEnd = transcriptEndTime(local);
    const remoteEnd = transcriptEndTime(remote.segments);
    const selected = remoteEnd > localEnd + 2 || (remoteEnd >= localEnd - 2 && remote.segments.length > local.length)
      ? remote.segments
      : local;
    const selectedEnd = transcriptEndTime(selected);
    const duration = Math.max(Number(meta?.duration || 0), Number(video?.duration || 0), selectedEnd);
    const coverage = duration > 0 ? selectedEnd / duration : 0;
    const sourceLabel = selected === remote.segments ? `${remote.language || 'B 站'}完整字幕接口` : '播放器字幕轨';
    if (selected.length) {
      state.transcriptDiagnostic = `已从${sourceLabel}读取 ${selected.length} 条，最后时间 ${formatTime(selectedEnd)}，覆盖 ${Math.round(clamp(coverage * 100, 0, 100))}%`;
      if (remote.rejected) {
        state.transcriptDiagnostic += `；${cleanText(remoteError?.message || '远程字幕与当前播放器不一致，已拒绝')}`;
      }
      if (duration > 60 && coverage < 0.88) {
        state.transcriptDiagnostic += '；字幕可能不完整，将在时间线中标注并使用本地补全';
      }
    } else if (remote.rejected) {
      state.transcriptDiagnostic = cleanText(remoteError?.message || '远程字幕与当前播放器不一致，已拒绝');
    } else if (remote.trackCount) {
      state.transcriptDiagnostic = 'B 站返回了字幕轨道，但字幕正文为空';
    } else if (remoteError) {
      state.transcriptDiagnostic = `字幕接口失败：${cleanText(remoteError?.message || remoteError)}`;
    } else {
      state.transcriptDiagnostic = '该分P在当前登录态下没有可用字幕，将使用画面关键帧分析';
    }
    logEvent(selected.length ? 'success' : 'warn', 'subtitle', state.transcriptDiagnostic, {
      selected_source: selected === remote.segments ? 'remote' : 'local',
      selected_count: selected.length,
      selected_end_sec: selectedEnd,
      duration,
      remote_rejected: Boolean(remote.rejected)
    });
    return selected;
  }

  function transcriptQuality(segments, duration) {
    const list = Array.isArray(segments) ? segments : [];
    const end = transcriptEndTime(list);
    const safeDuration = Math.max(0, Number(duration || 0));
    return {
      count: list.length,
      end,
      coverage: safeDuration > 0 ? clamp(end / safeDuration, 0, 1) : (list.length ? 1 : 0)
    };
  }

  function transcriptIdentityMatchesMeta(identity, meta) {
    if (!identity) return state.video?.id && meta?.id && state.video.id === meta.id;
    if (meta?.bvid && !sameBvid(identity.bvid, meta.bvid)) return false;
    if (meta?.cid && identity.cid && String(meta.cid) !== String(identity.cid)) return false;
    if (Number(identity.page || 1) !== Number(meta?.page || 1)) return false;
    return true;
  }

  function transcriptSnapshot(segments) {
    return {
      segments: Array.isArray(segments) ? segments.slice() : [],
      diagnostic: state.transcriptDiagnostic,
      identity: state.transcriptIdentity ? { ...state.transcriptIdentity } : null,
      validation: state.transcriptValidation ? { ...state.transcriptValidation } : null
    };
  }

  function restoreTranscriptSnapshot(snapshot) {
    if (!snapshot) return [];
    state.transcriptDiagnostic = snapshot.diagnostic || '';
    state.transcriptIdentity = snapshot.identity || null;
    state.transcriptValidation = snapshot.validation || null;
    return snapshot.segments.slice();
  }

  async function acquireStableTranscript(meta, analysisContext = null, options = {}) {
    const video = analysisContext?.video || getPrimaryVideoElement();
    const duration = Math.max(Number(meta?.duration || 0), Number(video?.duration || 0));
    const minimumCoverage = clamp(options.minimumCoverage ?? 0.88, 0.1, 1);
    const maxAttempts = clamp(options.maxAttempts ?? 7, 1, 10);
    const useCached = options.useCached !== false;
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
    let best = null;

    if (useCached && state.transcriptSegments.length && transcriptIdentityMatchesMeta(state.transcriptIdentity, meta)) {
      const cachedQuality = transcriptQuality(state.transcriptSegments, duration);
      if (!duration || cachedQuality.end <= duration + Math.max(8, duration * 0.06)) {
        best = transcriptSnapshot(state.transcriptSegments);
        if (cachedQuality.coverage >= minimumCoverage) {
          logEvent('success', 'subtitle-cache', `复用当前视频已读取的 ${cachedQuality.count} 句完整字幕`, cachedQuality);
          onProgress?.(`已复用 ${cachedQuality.count} 句字幕`, 0, maxAttempts);
          return best.segments;
        }
      }
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      if (analysisContext) assertAnalysisContext(analysisContext);
      onProgress?.(`正在读取并验证完整字幕（${attempt}/${maxAttempts}）`, attempt, maxAttempts);
      try {
        const segments = await extractTranscript(meta, analysisContext);
        const quality = transcriptQuality(segments, duration);
        const bestQuality = transcriptQuality(best?.segments || [], duration);
        if (quality.coverage > bestQuality.coverage + 0.005
          || (Math.abs(quality.coverage - bestQuality.coverage) <= 0.005 && quality.count > bestQuality.count)) {
          best = transcriptSnapshot(segments);
        }
        if (quality.count && quality.coverage >= minimumCoverage) {
          logEvent('success', 'subtitle-ready', `完整字幕已就绪：${quality.count} 句，覆盖 ${Math.round(quality.coverage * 100)}%`, {
            attempt,
            ...quality
          });
          return segments;
        }
        if (attempt < maxAttempts) {
          logEvent('info', 'subtitle-retry', `字幕尚未完整，准备第 ${attempt + 1}/${maxAttempts} 次读取`, {
            attempt,
            ...quality,
            required_coverage: minimumCoverage
          });
        }
      } catch (error) {
        if (isStaleVideoError(error)) throw error;
        logEvent('warn', 'subtitle-retry', `第 ${attempt}/${maxAttempts} 次字幕读取失败`, {
          error: cleanText(error?.message || error)
        });
      }
      if (attempt < maxAttempts) await sleep(Math.min(3200, 450 + attempt * 420));
    }

    const selected = restoreTranscriptSnapshot(best);
    const quality = transcriptQuality(selected, duration);
    logEvent(selected.length ? 'warn' : 'error', 'subtitle-ready', selected.length
      ? `字幕只读取到 ${quality.count} 句，覆盖 ${Math.round(quality.coverage * 100)}%`
      : '字幕按钮已开启，但完整字幕正文仍未就绪', quality);
    return selected;
  }

  function subtitleSalienceAt(segments, time) {
    const list = Array.isArray(segments) ? segments : [];
    let closestIndex = -1;
    let closestDistance = Infinity;
    list.forEach((segment, index) => {
      const distance = Math.abs(Number(segment.start || 0) - time);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    if (closestIndex < 0 || closestDistance > 18) return { score: 0, text: '' };
    const current = list[closestIndex];
    const previous = list[closestIndex - 1];
    const text = cleanText(current.text);
    const gap = previous ? Number(current.start || 0) - Number(previous.end || previous.start || 0) : 0;
    let score = clamp(text.length / 42, 0.1, 0.55);
    if (gap >= 2.2) score += 0.25;
    if (/首先|接下来|然后|总结|小结|结论|案例|比如|例如|演示|实操|步骤|注意|重点|问题|原因|最后|下面|开始|我们来看|换句话说/i.test(text)) score += 0.35;
    if (/[：:]$/.test(text) || /^[一二三四五六七八九十\d]+[、.．]/.test(text)) score += 0.15;
    return { score: clamp(score, 0, 1), text: truncate(text, 90) };
  }

  function buildKeyFrameCandidates(duration, maxFrames, transcriptSegments) {
    const safeDuration = Math.max(1, Number(duration) || 1);
    const frameCount = clamp(Number(maxFrames) || 10, 4, 12);
    const start = safeDuration > 5 ? 1.5 : 0;
    // 不 seek 到片尾最后几秒。B 站会把接近 duration 的程序化 seek 当成播完，
    // 进而触发自动连播或重建 video 元素，导致仍属于当前视频的分析上下文失效。
    // 片尾内容仍由完整字幕覆盖；关键帧只是均匀抽样的视觉辅助证据。
    const tailGuard = safeDuration > 120
      ? clamp(safeDuration * 0.01, 8, 20)
      : Math.min(5, Math.max(1.5, safeDuration * 0.04));
    const end = Math.max(start, safeDuration - tailGuard);
    const uniformCount = clamp(frameCount * 2, 10, 24);
    const raw = Array.from({ length: uniformCount }, (_, index) => {
      const ratio = uniformCount === 1 ? 0 : index / (uniformCount - 1);
      const time = start + (end - start) * ratio;
      return { time, ...subtitleSalienceAt(transcriptSegments, time), source: 'coverage' };
    });

    const subtitleCandidates = (Array.isArray(transcriptSegments) ? transcriptSegments : []).map((segment, index, list) => {
      const time = clamp(Number(segment.start || 0) + 0.15, start, end);
      const previous = list[index - 1];
      const gap = previous ? Number(segment.start || 0) - Number(previous.end || previous.start || 0) : 0;
      const salience = subtitleSalienceAt(list, time);
      return { time, score: clamp(salience.score + (gap >= 3.5 ? 0.2 : 0), 0, 1), text: salience.text, source: 'subtitle' };
    }).filter(item => item.score >= 0.55).sort((a, b) => b.score - a.score).slice(0, frameCount);

    raw.push(...subtitleCandidates);
    const merged = [];
    raw.sort((a, b) => a.time - b.time).forEach(candidate => {
      const existing = merged.find(item => Math.abs(item.time - candidate.time) < 1.5);
      if (existing) {
        if (candidate.score > existing.score) Object.assign(existing, candidate);
      } else {
        merged.push(candidate);
      }
    });
    return merged;
  }

  function calculateFrameSignature(context, video, canvas) {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const histogram = Array(16).fill(0);
    let brightness = 0;
    let horizontalEdges = 0;
    let previousLuma = 0;
    let entropy = 0;
    const pixelCount = Math.max(1, pixels.length / 4);
    for (let index = 0; index < pixels.length; index += 4) {
      const luma = 0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
      histogram[Math.min(15, Math.floor(luma / 16))] += 1;
      brightness += luma;
      if ((index / 4) % canvas.width !== 0) horizontalEdges += Math.abs(luma - previousLuma);
      previousLuma = luma;
    }
    histogram.forEach((count, index) => {
      histogram[index] = count / pixelCount;
      if (histogram[index] > 0) entropy -= histogram[index] * Math.log2(histogram[index]);
    });
    const averageBrightness = brightness / pixelCount;
    const edgeDensity = clamp(horizontalEdges / (pixelCount * 55), 0, 1);
    const quality = clamp((entropy / 4) * 0.65 + edgeDensity * 0.35 - (averageBrightness < 8 || averageBrightness > 248 ? 0.5 : 0), 0, 1);
    return { histogram, brightness: averageBrightness, edgeDensity, quality };
  }

  function frameSignatureDistance(left, right) {
    if (!left || !right) return 0;
    const histogramDistance = left.histogram.reduce((sum, value, index) => sum + Math.abs(value - right.histogram[index]), 0) / 2;
    const brightnessDistance = Math.abs(left.brightness - right.brightness) / 255;
    const edgeDistance = Math.abs(left.edgeDensity - right.edgeDensity);
    return clamp(histogramDistance * 0.7 + brightnessDistance * 0.2 + edgeDistance * 0.1, 0, 1);
  }

  function selectAdaptiveKeyFrames(candidates, maxFrames, duration) {
    if (!candidates.length) return [];
    const count = clamp(Number(maxFrames) || 10, 4, 12);
    const sorted = [...candidates].sort((a, b) => a.time - b.time);
    sorted.forEach((candidate, index) => {
      const previous = sorted[index - 1];
      candidate.sceneScore = previous ? frameSignatureDistance(candidate.signature, previous.signature) : 0.25;
      candidate.baseScore = candidate.sceneScore * 0.48 + Number(candidate.score || 0) * 0.34 + Number(candidate.signature?.quality || 0) * 0.18;
    });

    const selected = [];
    const coverageBins = Math.min(5, count);
    for (let bin = 0; bin < coverageBins; bin += 1) {
      const binStart = duration * bin / coverageBins;
      const binEnd = duration * (bin + 1) / coverageBins;
      const pool = sorted.filter(item => item.time >= binStart && (bin === coverageBins - 1 ? item.time <= binEnd : item.time < binEnd));
      const best = pool.sort((a, b) => b.baseScore - a.baseScore)[0];
      if (best && !selected.includes(best)) selected.push(best);
    }

    const minimumSpacing = Math.max(3, duration / (count * 3));
    while (selected.length < count) {
      let best = null;
      let bestScore = -Infinity;
      sorted.forEach(candidate => {
        if (selected.includes(candidate)) return;
        const timeDistance = selected.length ? Math.min(...selected.map(item => Math.abs(item.time - candidate.time))) : duration;
        if (timeDistance < minimumSpacing) return;
        const visualDiversity = selected.length ? Math.min(...selected.map(item => frameSignatureDistance(item.signature, candidate.signature))) : 1;
        const coverageGain = clamp(timeDistance / Math.max(1, duration / count), 0, 1);
        const score = candidate.baseScore + visualDiversity * 0.32 + coverageGain * 0.2;
        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      });
      if (!best) break;
      selected.push(best);
    }
    sorted.forEach(candidate => {
      if (selected.length < count && !selected.includes(candidate)) selected.push(candidate);
    });
    return selected.slice(0, count).sort((a, b) => a.time - b.time).map(item => ({
      ...item,
      reason: item.sceneScore >= 0.42 ? '显著画面切换' : Number(item.score || 0) >= 0.62 ? '字幕话题边界' : '时段代表帧'
    }));
  }

  function waitForPresentedVideoFrame(video, timeoutMs = 1400) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let callbackId = null;
      const done = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (callbackId != null && typeof video.cancelVideoFrameCallback === 'function') {
          try { video.cancelVideoFrameCallback(callbackId); } catch (_) {}
        }
        error ? reject(error) : resolve();
      };
      // paused 视频在 seeked 触发前就可能已经提交目标帧；如果在 seeked 后才
      // 注册 requestVideoFrameCallback，Chromium 不一定再产生一次回调。这里
      // 用双 rAF 作为可靠完成信号，rVFC 只负责更早确认，不再把“没有下一帧”
      // 误判为 seek 失败。
      const fallbackDelay = Math.min(180, Math.max(80, timeoutMs / 8));
      const timer = setTimeout(() => done(), fallbackDelay);
      if (typeof video.requestVideoFrameCallback === 'function') {
        callbackId = video.requestVideoFrameCallback(() => done());
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => done()));
      }
    });
  }

  function waitForVideoSeek(video, time, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let verifying = false;
      const target = clamp(time, 0, Math.max(0, Number(video.duration || time)));
      const done = error => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        video.removeEventListener('seeked', onSeeked);
        video.removeEventListener('error', onError);
        error ? reject(error) : resolve();
      };
      const verifyAndFinish = async () => {
        if (settled || verifying) return;
        verifying = true;
        const actual = Number(video.currentTime || 0);
        if (!Number.isFinite(actual) || Math.abs(actual - target) > 0.45) {
          throw new Error(`播放器定位不准确：目标 ${formatTime(target)}，实际 ${formatTime(actual)}`);
        }
        if (Number(video.readyState || 0) < 2) throw new Error('播放器 seek 后画面未就绪');
        await waitForPresentedVideoFrame(video, Math.min(1600, Math.max(500, timeoutMs / 2)));
        done();
      };
      const onSeeked = () => verifyAndFinish().catch(done);
      const onError = () => done(new Error('视频定位失败'));
      const timer = setTimeout(() => {
        done(new Error(`视频定位超时：目标 ${formatTime(target)}，实际 ${formatTime(video.currentTime || 0)}`));
      }, timeoutMs);
      video.addEventListener('seeked', onSeeked, { once: true });
      video.addEventListener('error', onError, { once: true });
      try {
        video.currentTime = target;
        if (Math.abs(video.currentTime - target) < 0.08 && video.readyState >= 2) {
          setTimeout(() => verifyAndFinish().catch(done), 80);
        }
      } catch (error) {
        done(error);
      }
    });
  }

  async function captureKeyFrames(maxFrames = 10, transcriptSegments = state.transcriptSegments, analysisContext = null) {
    if (analysisContext) assertAnalysisContext(analysisContext);
    const video = analysisContext?.video || getPrimaryVideoElement();
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return [];
    const originalTime = Number(video.currentTime || 0);
    const wasPaused = video.paused;
    const width = Math.max(320, Math.min(720, Number(video.videoWidth || 720)));
    const sourceHeight = Number(video.videoHeight || 360);
    const height = Math.max(180, Math.round(width * sourceHeight / Math.max(1, Number(video.videoWidth || 640))));
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = width;
    outputCanvas.height = height;
    const outputContext = outputCanvas.getContext('2d', { alpha: false });
    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = 96;
    probeCanvas.height = Math.max(54, Math.round(96 * sourceHeight / Math.max(1, Number(video.videoWidth || 640))));
    const probeContext = probeCanvas.getContext('2d', { alpha: false, willReadFrequently: true });
    if (!outputContext || !probeContext) return [];
    const frames = [];
    const candidates = buildKeyFrameCandidates(video.duration, maxFrames, transcriptSegments);
    logEvent('info', 'scene-scan', `开始扫描 ${candidates.length} 个场景候选`, {
      duration: Number(video.duration || 0),
      target_frames: maxFrames,
      mode: '全时长均匀抽样（非逐帧扫描）',
      safe_end_sec: candidates.length ? Number(candidates[candidates.length - 1].time.toFixed(2)) : 0,
      candidate_times: candidates.map(item => Number(item.time.toFixed(2)))
    });
    try {
      video.pause();
      for (let index = 0; index < candidates.length; index += 1) {
        if (analysisContext) assertAnalysisContext(analysisContext);
        setBusy(true, `抽样检查场景候选 ${index + 1}/${candidates.length}（非逐帧）`);
        try {
          await waitForVideoSeek(video, candidates[index].time, 4500);
          if (analysisContext) assertAnalysisContext(analysisContext);
          candidates[index].signature = calculateFrameSignature(probeContext, video, probeCanvas);
          logEvent('debug', 'scene-scan', `候选 ${index + 1}/${candidates.length} 扫描成功`, {
            target_sec: candidates[index].time,
            actual_sec: Number(video.currentTime || 0),
            quality: Number(candidates[index].signature?.quality || 0),
            subtitle: candidates[index].text || ''
          });
        } catch (error) {
          if (isStaleVideoError(error)) throw error;
          logEvent('warn', 'scene-scan', `候选 ${index + 1}/${candidates.length} 扫描失败，继续下一个`, {
            target_sec: candidates[index].time,
            actual_sec: Number(video.currentTime || 0),
            error: cleanText(error?.message || error)
          });
        }
      }
      const successfulCandidates = candidates.filter(item => item.signature);
      if (!successfulCandidates.length) throw new Error(`全部 ${candidates.length} 个场景候选均扫描失败`);
      const selected = selectAdaptiveKeyFrames(successfulCandidates, maxFrames, video.duration);
      logEvent('info', 'scene-select', `从 ${successfulCandidates.length} 个成功候选中选出 ${selected.length} 帧`, {
        failed_candidates: candidates.length - successfulCandidates.length,
        selected: selected.map(item => ({ time: item.time, reason: item.reason, scene_score: item.sceneScore, quality: item.signature?.quality }))
      });
      for (let index = 0; index < selected.length; index += 1) {
        if (analysisContext) assertAnalysisContext(analysisContext);
        setBusy(true, `生成科学关键帧 ${index + 1}/${selected.length}`);
        try {
          await waitForVideoSeek(video, selected[index].time, 4500);
          if (analysisContext) assertAnalysisContext(analysisContext);
          outputContext.fillStyle = '#000';
          outputContext.fillRect(0, 0, width, height);
          outputContext.drawImage(video, 0, 0, width, height);
          const dataUrl = outputCanvas.toDataURL('image/jpeg', 0.78);
          if (analysisContext) assertAnalysisContext(analysisContext);
          frames.push({
            time: selected[index].time,
            dataUrl,
            reason: selected[index].reason,
            subtitle: selected[index].text || '',
            scene_score: Number(selected[index].sceneScore || 0),
            quality_score: Number(selected[index].signature?.quality || 0)
          });
          logEvent('success', 'frame-capture', `关键帧 ${index + 1}/${selected.length} 生成成功`, {
            target_sec: selected[index].time,
            actual_sec: Number(video.currentTime || 0),
            reason: selected[index].reason,
            bytes: dataUrl.length
          });
        } catch (error) {
          if (isStaleVideoError(error)) throw error;
          logEvent('warn', 'frame-capture', `关键帧 ${index + 1}/${selected.length} 生成失败，继续下一个`, {
            target_sec: selected[index].time,
            actual_sec: Number(video.currentTime || 0),
            error: cleanText(error?.message || error)
          });
        }
      }
    } catch (error) {
      if (isStaleVideoError(error) && !isAnalysisRouteCurrent(analysisContext)) throw error;
      console.debug('[Yuze Bili Learning] 关键帧抽取失败', error);
      logEvent(isStaleVideoError(error) ? 'warn' : 'error', 'scene-scan', isStaleVideoError(error)
        ? '播放器在视觉抽样时重建，但仍是同一视频；停止关键帧抽样并继续使用完整字幕生成概览'
        : '关键帧抽取阶段结束', {
        error: cleanText(error?.message || error),
        captured: frames.length,
        route_still_current: isAnalysisRouteCurrent(analysisContext)
      });
    } finally {
      try {
        // B 站可能复用同一个 video 元素播放下一条视频。上下文失效后绝不能
        // 再把新视频 seek 回旧视频的播放位置。
        if (!analysisContext || isAnalysisContextCurrent(analysisContext)) {
          await waitForVideoSeek(video, originalTime, 2500);
          if (!wasPaused) video.play().catch(() => {});
          logEvent('debug', 'scene-scan', '播放器位置已恢复', { original_sec: originalTime, resumed: !wasPaused });
        }
      } catch (error) {
        logEvent('warn', 'scene-scan', '播放器位置恢复失败', { error: cleanText(error?.message || error), original_sec: originalTime });
      }
    }
    logEvent(frames.length ? 'success' : 'warn', 'scene-scan', `视觉抽样结束，共生成 ${frames.length} 帧；完整内容覆盖以字幕为准`, {
      requested: maxFrames,
      candidates: candidates.length,
      mode: '抽样关键帧（非逐帧扫描）'
    });
    return frames;
  }

  function captureCurrentFrame(video = getPrimaryVideoElement()) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
      return { dataUrl: '', error: '播放器画面尚未就绪' };
    }
    try {
      const width = Math.max(320, Math.min(720, Number(video.videoWidth || 720)));
      const height = Math.max(180, Math.round(width * Number(video.videoHeight || 405) / Math.max(1, Number(video.videoWidth || 720))));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) return { dataUrl: '', error: '浏览器无法创建截图画布' };
      context.fillStyle = '#000';
      context.fillRect(0, 0, width, height);
      context.drawImage(video, 0, 0, width, height);
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.8),
        width,
        height,
        error: ''
      };
    } catch (error) {
      console.debug('[Yuze Bili Learning] 当前帧截图失败', error);
      return {
        dataUrl: '',
        error: /security|taint|cross-origin/i.test(String(error?.message || error))
          ? '视频源受跨域保护，浏览器禁止截图'
          : cleanText(error?.message || error || '截图失败')
      };
    }
  }

  function transcriptToText(segments, maxChars = config.maxTranscriptChars) {
    const lines = (Array.isArray(segments) ? segments : []).map(item => `[${formatTime(item.start)}] ${item.text}`);
    const full = lines.join('\n');
    if (full.length <= maxChars) return full;
    // 超长字幕不能只截取开头，否则模型会误以为视频提前结束。按时间均匀抽样并强制保留末条字幕。
    const averageLength = Math.max(20, full.length / Math.max(1, lines.length));
    const targetCount = Math.max(2, Math.floor((maxChars - 120) / averageLength));
    const selected = [];
    const selectedIndexes = new Set();
    for (let index = 0; index < targetCount; index += 1) {
      selectedIndexes.add(Math.round(index * (lines.length - 1) / Math.max(1, targetCount - 1)));
    }
    selectedIndexes.add(0);
    selectedIndexes.add(lines.length - 1);
    Array.from(selectedIndexes).sort((a, b) => a - b).forEach(index => selected.push(lines[index]));
    const header = '【字幕过长，以下为覆盖全时长的均匀抽样】\n';
    const sampled = `${header}${selected.join('\n')}`;
    if (sampled.length <= maxChars) return sampled;
    const lastLine = lines[lines.length - 1] || '';
    const tail = `\n【最后一条字幕】\n${lastLine}`;
    return `${sampled.slice(0, Math.max(0, maxChars - tail.length))}${tail}`;
  }

  function queryAllThroughOpenShadowRoots(root, selector) {
    const matches = [];
    const visitedRoots = new Set();
    const visitedElements = new Set();

    function visit(scope) {
      if (!scope || visitedRoots.has(scope) || typeof scope.querySelectorAll !== 'function') return;
      visitedRoots.add(scope);
      scope.querySelectorAll(selector).forEach(element => {
        if (visitedElements.has(element)) return;
        visitedElements.add(element);
        matches.push(element);
      });
      scope.querySelectorAll('*').forEach(element => {
        if (element.shadowRoot) visit(element.shadowRoot);
      });
    }

    visit(root);
    return matches;
  }

  function collectVisibleComments() {
    const texts = [];
    const seen = new Set();
    const addComment = (text, author = '') => {
      const content = cleanText(text);
      const user = cleanText(author);
      if (content.length < 2 || content.length > 1200) return;
      const key = `${user}\n${content}`;
      if (seen.has(key)) return;
      seen.add(key);
      texts.push(user ? `${user}：${content}` : content);
    };

    // B 站新版评论使用多层 Web Component。普通 querySelectorAll 无法穿透
    // bili-comments / thread / renderer / rich-text 的 Shadow Root。
    const commentsHost = document.querySelector('bili-comments');
    if (commentsHost?.shadowRoot) {
      const renderers = queryAllThroughOpenShadowRoots(commentsHost.shadowRoot, 'bili-comment-renderer');
      renderers.forEach(renderer => {
        const scope = renderer.shadowRoot || renderer;
        const richText = queryAllThroughOpenShadowRoots(scope, 'bili-rich-text')[0];
        const contentNode = richText?.shadowRoot?.querySelector('#contents')
          || queryAllThroughOpenShadowRoots(scope, 'bili-rich-text #contents, p#contents')[0];
        const userInfo = queryAllThroughOpenShadowRoots(scope, 'bili-comment-user-info')[0];
        const userNode = userInfo?.shadowRoot?.querySelector('#user-name');
        addComment(contentNode?.textContent, userNode?.textContent);
      });
    }

    // 兼容仍在使用旧版 light DOM 评论区的页面。
    const selectors = [
      '.reply-item .reply-content',
      '.root-reply-container .reply-content',
      '.sub-reply-container .reply-content',
      '[class*="reply-content"] p',
      '[class*="reply-content"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(element => {
      addComment(element.textContent);
    });
    return texts.slice(0, config.maxComments);
  }

  async function collectCommentsAfterLazyLoad() {
    let comments = collectVisibleComments();
    if (comments.length) return comments;

    const commentsHost = document.querySelector('bili-comments');
    if (!commentsHost) return comments;
    const previousX = window.scrollX;
    const previousY = window.scrollY;
    commentsHost.scrollIntoView({ block: 'start', behavior: 'auto' });
    try {
      for (let attempt = 0; attempt < 8 && !comments.length; attempt += 1) {
        await sleep(250);
        comments = collectVisibleComments();
      }
    } finally {
      window.scrollTo({ left: previousX, top: previousY, behavior: 'auto' });
    }
    return comments;
  }

  function extractResourcesFromPage() {
    const roots = Array.from(document.querySelectorAll([
      '.desc-info-text', '.video-desc-container', '[class*="desc-info"]'
    ].join(','))).map(root => ({ root, source_type: '视频简介', context: cleanText(root.textContent) }));

    const commentsHost = document.querySelector('bili-comments');
    if (commentsHost?.shadowRoot) {
      queryAllThroughOpenShadowRoots(commentsHost.shadowRoot, 'bili-comment-renderer').forEach(renderer => {
        const scope = renderer.shadowRoot || renderer;
        const richText = queryAllThroughOpenShadowRoots(scope, 'bili-rich-text')[0];
        const richRoot = richText?.shadowRoot || richText;
        const contentNode = richText?.shadowRoot?.querySelector('#contents')
          || queryAllThroughOpenShadowRoots(scope, 'p#contents')[0];
        if (richRoot && contentNode) {
          roots.push({ root: richRoot, source_type: '公开评论', context: cleanText(contentNode.textContent) });
        }
      });
    }

    Array.from(document.querySelectorAll([
      '.reply-item .reply-content', '.root-reply-container .reply-content',
      '.sub-reply-container .reply-content'
    ].join(','))).forEach(root => {
      roots.push({ root, source_type: '公开评论', context: cleanText(root.textContent) });
    });

    const result = [];
    const seen = new Set();
    const addUrl = (rawUrl, title, sourceType, context) => {
      const url = safeUrl(String(rawUrl || '').replace(/[),.;，。；】]+$/, ''));
      if (!url || seen.has(url)) return;
      const host = new URL(url).hostname;
      if (/search\.bilibili\.com$/i.test(host) || /\/search(?:[/?#]|$)/i.test(url)) return;
      if (/bilibili\.com$/i.test(host) && !/\/read\/|\/opus\//i.test(url)) return;
      seen.add(url);
      const resource = normalizeResourceCandidate({
        title: cleanText(title) || host,
        url,
        category: categorizeResource(url),
        source_type: sourceType,
        context
      }, sourceType);
      if (resource) result.push(resource);
    };

    roots.forEach(({ root, source_type: sourceType, context }) => {
      root.querySelectorAll?.('a[href]').forEach(anchor => {
        const url = safeUrl(anchor.href);
        addUrl(url, anchor.textContent, sourceType, context);
      });
      const text = context || root.textContent || '';
      const matches = text.match(/https?:\/\/[^\s<>"']+/g) || [];
      matches.forEach(raw => {
        addUrl(raw, '', sourceType, context);
      });
    });

    state.transcriptSegments.forEach(segment => {
      const matches = cleanText(segment.text).match(/https?:\/\/[^\s<>"']+/g) || [];
      matches.forEach(raw => addUrl(raw, '', `字幕 ${formatTime(segment.start)}`, segment.text));
    });
    return result.slice(0, config.maxResources);
  }

  function categorizeResource(url) {
    const text = String(url || '').toLowerCase();
    if (/github|gitlab|gitee/.test(text)) return '代码';
    if (/arxiv|doi|paper|research/.test(text)) return '论文';
    if (/docs|doc|wiki|notion|feishu/.test(text)) return '文档';
    if (/pan|drive|disk|quark|baidu/.test(text)) return '网盘';
    return '网站';
  }

  function normalizeResourceCandidate(item, fallbackSource = '页面提取') {
    const sourceType = cleanText(item?.source_type) || fallbackSource;
    const url = safeUrl(item?.url);
    const title = truncate(cleanText(item?.title) || (url ? new URL(url).hostname : ''), 160);
    if (!title && !url) return null;
    const context = truncate(cleanText(item?.context), 320);
    const flags = Array.isArray(item?.risk_flags) ? item.risk_flags.map(cleanText).filter(Boolean) : [];
    if (/公开评论|comment/i.test(sourceType)) flags.push('来自公开评论，请核验可信度');
    if (/b23\.tv|t\.cn|bit\.ly|tinyurl|dwz/i.test(url)) flags.push('短链接，请核验跳转目标');
    if (/pan\.|drive\.|disk\.|quark\.|baidu\./i.test(url)) flags.push('网盘/分享链接，请自行核验');
    if (/公众号|加群|QQ群|微信|回复\s*\d+|领取|资料.*整理|vx\s*[=:：]/i.test(`${title} ${context}`)) flags.push('可能含推广或引流信息');
    const mentioned = Number(item?.mentioned_at_sec);
    return {
      id: cleanText(item?.id) || uid('resource'),
      video_id: state.video?.id || '',
      title,
      url,
      category: truncate(cleanText(item?.category) || (url ? categorizeResource(url) : '资料提及'), 24),
      source_type: sourceType,
      mentioned_at_sec: Number.isFinite(mentioned) && mentioned >= 0 ? mentioned : null,
      context,
      risk_flags: Array.from(new Set(flags)).slice(0, 5),
      created_at: Number(item?.created_at || Date.now())
    };
  }

  function mergeResources(...collections) {
    const result = [];
    const seen = new Set();
    collections.flat().forEach(item => {
      const resource = normalizeResourceCandidate(item, cleanText(item?.source_type) || '页面提取');
      if (!resource) return;
      const normalizedUrl = resource.url ? resource.url.replace(/#.*$/, '').replace(/\/$/, '') : '';
      const key = normalizedUrl || `${resource.title.toLowerCase()}|${resource.source_type}|${Math.round(Number(resource.mentioned_at_sec || 0) / 5)}`;
      if (seen.has(key)) return;
      seen.add(key);
      result.push(resource);
    });
    return result.slice(0, config.maxResources);
  }

  function closestSubtitleSegment(segments, seconds, maxDistance = 20) {
    if (!Array.isArray(segments) || !segments.length) return null;
    let closest = null;
    let distance = Infinity;
    segments.forEach(segment => {
      const nextDistance = Math.abs(Number(segment.start || 0) - Number(seconds || 0));
      if (nextDistance < distance) {
        closest = segment;
        distance = nextDistance;
      }
    });
    return distance <= maxDistance ? closest : null;
  }

  function chapterSubtitleEvidence(item, start, end, transcriptSegments) {
    if (!Array.isArray(transcriptSegments) || !transcriptSegments.length) return [];
    const requested = Array.isArray(item?.subtitle_evidence) ? item.subtitle_evidence.slice(0, 2) : [];
    const selected = [];
    const seen = new Set();
    requested.forEach(evidence => {
      const segment = closestSubtitleSegment(transcriptSegments, evidence?.start_sec ?? start, 24);
      if (!segment) return;
      if (Number(segment.start || 0) < start - 2 || Number(segment.start || 0) > end + 2) return;
      const key = `${segment.start}:${segment.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        selected.push({ start_sec: Number(segment.start || 0), quote: truncate(cleanText(segment.text), 180) });
      }
    });
    const inChapter = transcriptSegments.filter(segment => Number(segment.start || 0) >= start - 1 && Number(segment.start || 0) <= end + 1 && cleanText(segment.text));
    [inChapter[0], inChapter[Math.floor(inChapter.length / 2)]].forEach(segment => {
      if (!segment || selected.length >= 2) return;
      const key = `${segment.start}:${segment.text}`;
      if (!seen.has(key)) {
        seen.add(key);
        selected.push({ start_sec: Number(segment.start || 0), quote: truncate(cleanText(segment.text), 180) });
      }
    });
    return selected;
  }

  function normalizeChapter(item, duration, transcriptSegments = []) {
    const rawStart = clamp(item?.start_sec, 0, Math.max(0, duration));
    const rawEnd = clamp(item?.end_sec ?? rawStart + 60, rawStart, Math.max(rawStart, duration || rawStart + 600));
    const startSegment = closestSubtitleSegment(transcriptSegments, rawStart, 20);
    const endSegment = closestSubtitleSegment(transcriptSegments, rawEnd, 20);
    const start = clamp(startSegment?.start ?? rawStart, 0, Math.max(0, duration));
    const end = clamp(endSegment?.end ?? endSegment?.start ?? rawEnd, start, Math.max(start, duration || start + 600));
    return {
      id: cleanText(item?.id) || uid('chapter'),
      start_sec: start,
      end_sec: end,
      title: truncate(cleanText(item?.title) || '未命名章节', 80),
      summary: truncate(cleanText(item?.summary), 900),
      key_points: (Array.isArray(item?.key_points) ? item.key_points : []).slice(0, 5).map(point => truncate(cleanText(point), 240)).filter(Boolean),
      subtitle_evidence: chapterSubtitleEvidence(item, start, end, transcriptSegments),
      kind: ['concept', 'demo', 'case', 'formula', 'opinion', 'summary', 'skip'].includes(item?.kind) ? item.kind : 'concept',
      importance: clamp(item?.importance, 0, 1),
      goal_relevance: clamp(item?.goal_relevance, 0, 1),
      confidence: clamp(item?.confidence, 0, 1),
      evidence: Array.isArray(item?.evidence) ? item.evidence.slice(0, 3).map(cleanText) : []
    };
  }

  function buildTranscriptChaptersForRange(startAt, endAt, transcriptSegments, offset = 0) {
    const available = transcriptSegments.filter(segment => Number(segment.end || segment.start || 0) > startAt && Number(segment.start || 0) < endAt);
    if (!available.length) return [];
    const remaining = Math.max(1, endAt - startAt);
    const targetCount = clamp(Math.ceil(remaining / 80), 1, 18);
    const chunkSeconds = remaining / targetCount;
    const chapters = [];
    for (let index = 0; index < targetCount; index += 1) {
      const rangeStart = startAt + index * chunkSeconds;
      const rangeEnd = index === targetCount - 1 ? endAt + 1 : startAt + (index + 1) * chunkSeconds;
      const group = available.filter(segment => Number(segment.start || 0) >= rangeStart && Number(segment.start || 0) < rangeEnd);
      if (!group.length) continue;
      const first = group[0];
      const last = group[group.length - 1];
      const sampleIndexes = [0, Math.floor(group.length / 2), group.length - 1];
      const points = Array.from(new Set(sampleIndexes.map(position => cleanText(group[position]?.text)).filter(Boolean))).slice(0, 3);
      chapters.push({
        id: `subtitle-tail-${offset + index + 1}`,
        start_sec: Number(first.start || rangeStart),
        end_sec: Number(last.end || last.start || rangeEnd),
        title: `字幕补全：${truncate(cleanText(first.text), 32)}`,
        summary: truncate(group.slice(0, 10).map(segment => cleanText(segment.text)).filter(Boolean).join('；'), 900),
        key_points: points,
        subtitle_evidence: [first, group[Math.floor(group.length / 2)]].filter(Boolean).map(segment => ({ start_sec: segment.start, quote: segment.text })),
        kind: 'concept',
        importance: 0.6,
        goal_relevance: 0.6,
        confidence: 0.65,
        evidence: ['subtitle-auto-completion']
      });
    }
    return chapters;
  }

  function ensureChapterCoverage(chapters, duration, transcriptSegments) {
    const sorted = Array.isArray(chapters) ? [...chapters].sort((a, b) => a.start_sec - b.start_sec) : [];
    const subtitleEnd = transcriptEndTime(transcriptSegments);
    if (!subtitleEnd || !transcriptSegments.length) return sorted;
    const lastEnd = sorted.reduce((latest, chapter) => Math.max(latest, Number(chapter.end_sec || chapter.start_sec || 0)), 0);
    if (lastEnd < subtitleEnd - Math.max(20, subtitleEnd * 0.04)) {
      const tailStart = Math.max(0, lastEnd - 1);
      const additions = buildTranscriptChaptersForRange(tailStart, subtitleEnd, transcriptSegments, sorted.length);
      additions.forEach(item => sorted.push(normalizeChapter(item, duration, transcriptSegments)));
    }
    return sorted.sort((a, b) => a.start_sec - b.start_sec).slice(0, 40);
  }

  function rawChapterEnd(chapters) {
    return (Array.isArray(chapters) ? chapters : []).reduce((latest, chapter) => {
      return Math.max(latest, Number(chapter?.end_sec || chapter?.start_sec || 0));
    }, 0);
  }

  function normalizeAnalysis(raw, meta, transcriptSegments = []) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const fitness = source.video_fitness && typeof source.video_fitness === 'object' ? source.video_fitness : source;
    const duration = Math.max(Number(meta.duration || 0), transcriptEndTime(transcriptSegments));
    const normalizedChapters = (Array.isArray(source.chapters) ? source.chapters : [])
      .slice(0, 40)
      .map(item => normalizeChapter(item, duration, transcriptSegments))
      .sort((a, b) => a.start_sec - b.start_sec);
    const chapters = ensureChapterCoverage(normalizedChapters, duration, transcriptSegments);
    const concepts = (Array.isArray(source.concepts) ? source.concepts : []).slice(0, 30).map(item => ({
      id: cleanText(item?.id) || uid('concept'),
      name: truncate(cleanText(item?.name), 80),
      explanation: truncate(cleanText(item?.explanation), 700),
      evidence_refs: Array.isArray(item?.evidence_refs) ? item.evidence_refs.slice(0, 5) : []
    })).filter(item => item.name);
    const quiz = (Array.isArray(source.quiz) ? source.quiz : []).slice(0, 8).map(item => ({
      id: cleanText(item?.id) || uid('quiz'),
      question: truncate(cleanText(item?.question), 500),
      answer: truncate(cleanText(item?.answer), 800),
      evidence_sec: clamp(item?.evidence_sec, 0, Math.max(0, duration)),
      type: cleanText(item?.type) || 'recall'
    })).filter(item => item.question && item.answer);
    const flashcards = (Array.isArray(source.flashcards) ? source.flashcards : []).slice(0, 12).map(item => ({
      id: cleanText(item?.id) || uid('card'),
      front: truncate(cleanText(item?.front), 400),
      back: truncate(cleanText(item?.back), 900),
      evidence_sec: clamp(item?.evidence_sec, 0, Math.max(0, duration))
    })).filter(item => item.front && item.back);
    return {
      schema_version: 1,
      source_binding: cleanText(source.source_binding),
      one_line: truncate(cleanText(fitness.one_line || source.one_line) || '已生成视频学习结构', 240),
      goal_fit_score: Math.round(clamp(fitness.goal_fit_score ?? source.goal_fit_score, 0, 100)),
      fit_reasons: (Array.isArray(fitness.reasons) ? fitness.reasons : source.fit_reasons || []).slice(0, 4).map(item => truncate(cleanText(item), 180)),
      difficulty: ['beginner', 'intermediate', 'advanced'].includes(fitness.difficulty) ? fitness.difficulty : 'intermediate',
      information_density: Math.round(clamp(source.information_density, 0, 100)),
      practice_level: Math.round(clamp(source.practice_level, 0, 100)),
      novelty: Math.round(clamp(source.novelty, 0, 100)),
      subtitle_digest: {
        overview: truncate(cleanText(source.subtitle_digest?.overview), 1600),
        takeaways: (Array.isArray(source.subtitle_digest?.takeaways) ? source.subtitle_digest.takeaways : []).slice(0, 12).map(item => truncate(cleanText(item), 320)).filter(Boolean),
        outline: (Array.isArray(source.subtitle_digest?.outline) ? source.subtitle_digest.outline : []).slice(0, 10).map(item => truncate(cleanText(item), 240)).filter(Boolean)
      },
      recommended_watch_sec: clamp(fitness.recommended_watch_sec ?? source.recommended_watch_sec, 0, Math.max(duration, 1)),
      prerequisites: (Array.isArray(fitness.prerequisites) ? fitness.prerequisites : source.prerequisites || []).slice(0, 8).map(item => truncate(cleanText(item), 120)),
      chapters,
      concepts,
      resources: (Array.isArray(source.resources) ? source.resources : []).slice(0, 20).map(item => {
        const mentioned = Number(item?.mentioned_at_sec);
        const sourceType = cleanText(item?.source_type)
          || (Number.isFinite(mentioned) && mentioned >= 0 ? `字幕 ${formatTime(mentioned)}` : '视频内容');
        return normalizeResourceCandidate({ ...item, source_type: sourceType }, sourceType);
      }).filter(Boolean),
      quiz,
      flashcards,
      uncertainties: (Array.isArray(source.uncertainties) ? source.uncertainties : []).slice(0, 8).map(item => truncate(cleanText(item), 240)),
      coverage: {
        subtitle: clamp(source.coverage?.subtitle, 0, 1),
        visual: clamp(source.coverage?.visual, 0, 1),
        audio: clamp(source.coverage?.audio, 0, 1)
      },
      generated_at: Date.now(),
      analysis_version: ANALYSIS_VERSION
    };
  }

  function compactEvidenceText(value) {
    return cleanText(value).toLowerCase().replace(/[\s，。！？、；：“”‘’（）()【】《》,.!?;:'"`~\-_]/g, '');
  }

  function validateBoundAnalysis(raw, expectedBinding, transcriptSegments, context = {}) {
    const actualBinding = cleanText(raw?.source_binding);
    if (!expectedBinding || actualBinding !== expectedBinding) {
      const error = new Error('AI 返回内容不属于本次媒体请求，已拒绝写入');
      error.code = 'MEDIA_BINDING_MISMATCH';
      throw error;
    }
    const segments = Array.isArray(transcriptSegments) ? transcriptSegments : [];
    const chapters = Array.isArray(raw?.chapters) ? raw.chapters : [];
    const duration = Math.max(Number(context.duration || 0), transcriptEndTime(segments));
    if (segments.length < 8) {
      if (duration > 120) {
        const chapterEnd = rawChapterEnd(chapters);
        const occupiedBins = new Set(chapters.map(chapter => Math.min(3, Math.floor(clamp(chapter?.start_sec, 0, duration) / Math.max(1, duration) * 4))));
        if (chapterEnd < duration * 0.55 || occupiedBins.size < 3) {
          const error = new Error(`无完整字幕时，AI 时间线仅覆盖至 ${formatTime(chapterEnd)}/${formatTime(duration)}，未覆盖整段视频，已拒绝局部画面误判`);
          error.code = 'ANALYSIS_COVERAGE_MISMATCH';
          throw error;
        }
      }
      return;
    }
    const corpus = compactEvidenceText(segments.map(item => item.text).join(''));
    const quotes = (Array.isArray(raw?.chapters) ? raw.chapters : [])
      .flatMap(chapter => Array.isArray(chapter?.subtitle_evidence) ? chapter.subtitle_evidence : [])
      .map(item => compactEvidenceText(item?.quote))
      .filter(item => item.length >= 4)
      .slice(0, 30);
    if (quotes.length < 3) {
      const error = new Error(`已有 ${segments.length} 条字幕，但 AI 只返回 ${quotes.length} 条可核验原文，已拒绝让关键帧覆盖字幕主线`);
      error.code = 'MISSING_SUBTITLE_EVIDENCE';
      throw error;
    }
    const matched = quotes.filter(quote => corpus.includes(quote) || corpus.includes(quote.slice(0, Math.min(12, quote.length)))).length;
    if (matched / quotes.length < 0.6) {
      const error = new Error(`AI 字幕证据与当前视频不一致（${matched}/${quotes.length} 命中），已拒绝错误结果`);
      error.code = 'VIDEO_EVIDENCE_MISMATCH';
      throw error;
    }
    logEvent('success', 'ai-validation', `AI 字幕证据校验通过：${matched}/${quotes.length} 命中`, {
      chapters: chapters.length,
      duration,
      raw_chapter_end: rawChapterEnd(chapters)
    });
  }

  function parseBridgeJson(value) {
    if (value && typeof value === 'object') {
      if (value.data && typeof value.data === 'object') return value.data;
      if (typeof value.content === 'string') return parseBridgeJson(value.content);
      if (typeof value.result === 'string') return parseBridgeJson(value.result);
      return value;
    }
    const text = String(value || '').trim();
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] || text;
    const start = fenced.indexOf('{');
    const end = fenced.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('AI 未返回有效 JSON');
    return JSON.parse(fenced.slice(start, end + 1));
  }

  function ensureBridge() {
    const bridge = getLearningBridge();
    if (!bridge || typeof bridge.chat !== 'function') {
      throw new Error('当前页面未检测到 LLMBridge.chat。普通浏览器页面不会自动提供该能力，请确认脚本由 Yuze 的脚本注入环境运行，并在注入后刷新 B 站页面');
    }
    return bridge;
  }

  async function waitForBridge(timeoutMs = 5000) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const bridge = getLearningBridge();
      if (bridge && typeof bridge.chat === 'function') return bridge;
      await sleep(120);
    }
    return ensureBridge();
  }

  async function withTimeout(promise, ms, label) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`${label || 'AI 请求'}超时`)), ms);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function bridgeChat(prompt, options) {
    const bridge = await waitForBridge();
    return withTimeout(bridge.chat(prompt, options), config.bridgeTimeoutMs, 'AI 请求');
  }

  function recommendedChapterRange(duration) {
    const seconds = Math.max(1, Number(duration || 0));
    const target = seconds < 180
      ? 4
      : seconds < 600
        ? clamp(Math.round(seconds / 60), 6, 10)
        : clamp(Math.round(seconds / 75), 8, 24);
    return { min: Math.max(3, target - 2), target, max: Math.min(30, target + 3) };
  }

  function buildAnalysisPrompt(meta, transcript, goal, subtitleCount = 0, subtitleEnd = 0, sourceBinding = '') {
    const chapterRange = recommendedChapterRange(meta.duration);
    return [
      '你是严谨的视频学习设计师，不是营销文案作者。请输出严格 JSON。',
      '证据优先级：完整字幕 > 浏览器本地关键帧 > 标题和简介。字幕存在时，章节、总结、汇总和结论必须主要依据字幕，不得用画面标题或简介替代字幕内容。',
      `当前视频唯一身份：BVID=${meta.bvid || 'unknown'}；CID=${meta.cid || 'unknown'}；分P=${meta.page || 1}。所有输入均应属于这一身份；如果字幕、关键帧、标题或简介互相冲突，必须停止推断并在 uncertainties 中明确报告“视频身份证据冲突”，不得拼接不同视频内容。`,
      `本次媒体绑定码：${sourceBinding}。返回 JSON 的 source_binding 必须逐字复制该值；它用于拒绝旧视频或旧请求的缓存响应。`,
      `学习目标：${goal.text}`,
      `用户基础：${goal.level}；时间预算：${goal.budget_min} 分钟。`,
      `视频标题：${meta.title}`,
      `UP 主：${meta.author || '未知'}`,
      `时长：${Math.round(meta.duration || 0)} 秒`,
      `字幕条数：${subtitleCount}`,
      `字幕最后时间：${formatTime(subtitleEnd)}（${Math.round(subtitleEnd)} 秒）`,
      `简介：${truncate(meta.description, 1800)}`,
      transcript ? `字幕片段：\n${transcript}` : '未获取到公开字幕，请明确降低字幕覆盖率。',
      '',
      '任务：判断该视频对学习目标的适配度；给出字幕汇总、详细章节时间线、概念、实操/案例/公式、外部资源提及、回忆题和闪卡。',
      `章节数量建议 ${chapterRange.min}-${chapterRange.max} 章，目标约 ${chapterRange.target} 章。按字幕话题、论证步骤、案例切换和小结位置切分，不要机械地按整分钟切分。`,
      '章节必须覆盖视频主要内容；相邻章节尽量无明显缺口。start_sec 对齐该主题第一句相关字幕，end_sec 对齐该主题最后一句相关字幕。除非字幕恰好如此，不要把时间统一写成 0:00、1:00、3:00 这样的整数分钟。',
      subtitleCount ? `硬性覆盖要求：最后一章 end_sec 不得早于 ${Math.max(0, Math.floor(subtitleEnd - 3))} 秒；必须处理从第一条到最后一条字幕，不能在中途停止。` : '没有字幕时，章节应覆盖关键帧所代表的完整视频时长，并明确降低置信度。',
      '每章 summary 写 2-3 句具体总结，key_points 给出 2-4 个信息点；subtitle_evidence 给出 1-2 条短字幕原文及其精确时间。禁止编造字幕原文。',
      'subtitle_digest.overview 用 3-5 句汇总整段字幕的论述结构；takeaways 给出 5-10 条可复述结论；outline 概括内容推进顺序。',
      'resources 只记录字幕或简介明确提到的资料、软件、平台、代码、文档、论文、书籍、课程和数据源。不得推荐未出现的资料，不得猜测 URL；没有原文 URL 就将 url 留空，并用 context 保留提及依据。',
      '每个事实性条目给出 start_sec/end_sec 或 evidence_sec；无法定位时不要编造时间。',
      '所有分数范围 0-100，coverage 范围 0-1。',
      'JSON 结构：',
      JSON.stringify({
        source_binding: sourceBinding,
        video_fitness: { one_line: '', goal_fit_score: 0, reasons: [], difficulty: 'beginner|intermediate|advanced', recommended_watch_sec: 0, prerequisites: [] },
        information_density: 0,
        practice_level: 0,
        novelty: 0,
        subtitle_digest: { overview: '', takeaways: [], outline: [] },
        chapters: [{ id: 'ch1', start_sec: 12.4, end_sec: 68.7, title: '', summary: '', key_points: [], subtitle_evidence: [{ start_sec: 12.4, quote: '' }], kind: 'concept|demo|case|formula|opinion|summary|skip', importance: 0.8, goal_relevance: 0.8, confidence: 0.8, evidence: ['subtitle|frame'] }],
        concepts: [{ id: 'c1', name: '', explanation: '', evidence_refs: ['ch1'] }],
        resources: [{ title: '', category: '', source_type: 'subtitle|description', mentioned_at_sec: 0, url: '', context: '', risk_flags: [] }],
        quiz: [{ id: 'q1', question: '', answer: '', evidence_sec: 0, type: 'recall|application' }],
        flashcards: [{ id: 'f1', front: '', back: '', evidence_sec: 0 }],
        uncertainties: [],
        coverage: { subtitle: 0, visual: 0, audio: 0 }
      }),
      '不要在 JSON 前后输出 Markdown 或解释。'
    ].join('\n');
  }

  function fallbackAnalysis(meta, transcriptSegments) {
    const duration = Math.max(1, Number(meta.duration || 0));
    const chapterTarget = recommendedChapterRange(duration).target;
    const chunk = Math.max(30, Math.round(duration / chapterTarget));
    const chapters = [];
    for (let start = 0, index = 0; start < duration && index < 30; start += chunk, index += 1) {
      const sectionSegments = transcriptSegments.filter(item => item.start >= start && item.start < start + chunk);
      const nearby = sectionSegments[0]?.text || '';
      chapters.push({
        id: `fallback-${index + 1}`,
        start_sec: start,
        end_sec: Math.min(duration, start + chunk),
        title: nearby ? truncate(nearby, 28) : `第 ${index + 1} 段`,
        summary: sectionSegments.length ? truncate(sectionSegments.slice(0, 6).map(item => item.text).join('；'), 700) : '等待 AI 分析或由用户补充章节说明',
        key_points: sectionSegments.slice(0, 4).map(item => item.text),
        subtitle_evidence: sectionSegments.slice(0, 2).map(item => ({ start_sec: item.start, quote: item.text })),
        kind: index === 0 ? 'summary' : 'concept',
        importance: index < 3 ? 0.7 : 0.5,
        goal_relevance: 0.5,
        confidence: transcriptSegments.length ? 0.45 : 0.2,
        evidence: transcriptSegments.length ? ['subtitle'] : []
      });
    }
    return normalizeAnalysis({
      video_fitness: {
        one_line: transcriptSegments.length ? '已根据公开字幕生成基础学习结构，建议启用 AI 获取更完整分析。' : '已进入手动学习模式，可继续做笔记、书签和进度记录。',
        goal_fit_score: 50,
        reasons: ['当前为本地降级结果', transcriptSegments.length ? '检测到公开字幕' : '未检测到可用字幕'],
        difficulty: 'intermediate',
        recommended_watch_sec: duration,
        prerequisites: []
      },
      information_density: 50,
      practice_level: 30,
      novelty: 50,
      subtitle_digest: {
        overview: transcriptSegments.length ? truncate(transcriptSegments.slice(0, 12).map(item => item.text).join('；'), 1200) : '',
        takeaways: transcriptSegments.filter((_, index) => index % Math.max(1, Math.floor(transcriptSegments.length / 8)) === 0).slice(0, 8).map(item => item.text),
        outline: chapters.slice(0, 10).map(item => item.title)
      },
      chapters,
      concepts: [], quiz: [], flashcards: [], resources: [],
      uncertainties: ['AI 视频理解未完成，章节标题和适配度仅供临时导航。'],
      coverage: { subtitle: transcriptSegments.length ? 0.4 : 0, visual: 0, audio: 0 }
    }, meta, transcriptSegments);
  }

  async function loadCurrentData() {
    const meta = await enrichMetadataFromPublicApi(getVideoMetadata());
    state.video = { ...(await store.get('videos', meta.id) || {}), ...meta, id: meta.id };
    const storedArtifact = await store.get('artifacts', `analysis:${meta.id}`);
    const storedIdentity = storedArtifact?.video_identity;
    const artifactMatchesVideo = Number(storedArtifact?.payload?.analysis_version || 0) >= ANALYSIS_VERSION
      && (!meta.bvid || (
        sameBvid(storedIdentity?.bvid, meta.bvid)
        && Number(storedIdentity?.page || 1) === Number(meta.page || 1)
        && (!meta.cid || !storedIdentity?.cid || String(storedIdentity.cid) === String(meta.cid))
      ));
    state.artifact = artifactMatchesVideo ? storedArtifact : null;
    state.lastError = state.artifact?.diagnostic || null;
    const artifactTranscript = Array.isArray(state.artifact?.transcript_segments) ? state.artifact.transcript_segments : [];
    const videoTranscript = Array.isArray(state.video?.transcript_segments) ? state.video.transcript_segments : [];
    const useArtifactTranscript = artifactTranscript.length > 0;
    state.transcriptSegments = useArtifactTranscript ? artifactTranscript : videoTranscript;
    state.transcriptDiagnostic = cleanText(useArtifactTranscript
      ? state.artifact?.transcript_diagnostic
      : state.video?.transcript_diagnostic || state.artifact?.transcript_diagnostic || '');
    state.transcriptIdentity = useArtifactTranscript
      ? state.artifact?.transcript_identity || null
      : state.video?.transcript_identity || null;
    state.transcriptValidation = useArtifactTranscript
      ? state.artifact?.transcript_validation || null
      : state.video?.transcript_validation || null;
    state.notes = (await store.all('notes')).filter(item => item.video_id === meta.id).sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    state.cards = (await store.all('cards')).filter(item => item.video_id === meta.id && Number(item.analysis_version || 0) >= ANALYSIS_VERSION);
    state.project = await ensureDefaultProject();
    state.resources = mergeResources(state.video.extracted_resources || [], extractResourcesFromPage());
    state.goalDraft = state.video.goal?.text || state.project.goal?.text || config.defaultGoal;
    state.levelDraft = state.video.goal?.level || state.project.goal?.level || 'intermediate';
    state.budgetDraft = String(state.video.goal?.budget_min || state.project.goal?.budget_min || 20);
    state.qa = Array.isArray(state.video.qa) ? state.video.qa : [];
    state.quizAnswers = {};
    state.flashcardId = '';
    state.activeSubtitleIndex = -1;
    await store.put('videos', state.video);
    if (state.host) {
      state.host.dataset.videoId = state.video.id || '';
      state.host.dataset.bvid = state.video.bvid || '';
      state.host.dataset.cid = state.video.cid || '';
      state.host.dataset.page = String(state.video.page || 1);
    }
  }

  async function ensureDefaultProject() {
    let project = await store.get('projects', 'default');
    if (!project) {
      project = {
        id: 'default',
        title: '我的 B 站学习项目',
        goal: { text: config.defaultGoal, level: 'intermediate', budget_min: 20 },
        video_ids: [],
        created_at: Date.now(),
        updated_at: Date.now(),
        compare_result: ''
      };
      await store.put('projects', project);
    }
    return project;
  }

  async function saveGoal() {
    const input = state.root.querySelector('[data-field="goal"]');
    const level = state.root.querySelector('[data-field="level"]');
    const budget = state.root.querySelector('[data-field="budget"]');
    const goal = {
      text: cleanText(input?.value || state.video?.goal?.text || state.goalDraft) || config.defaultGoal,
      level: level?.value || state.video?.goal?.level || state.levelDraft || 'intermediate',
      budget_min: clamp(budget?.value || state.video?.goal?.budget_min || state.budgetDraft || 20, 5, 180)
    };
    state.video.goal = goal;
    state.goalDraft = goal.text;
    state.levelDraft = goal.level;
    state.budgetDraft = String(goal.budget_min);
    await store.put('videos', { ...state.video, updated_at: Date.now() });
    toast('学习目标已保存');
    render();
  }

  async function analyzeCurrentVideo(force) {
    if (state.busy) return;
    if (state.subtitleLoadPromise) {
      setBusy(true, '等待完整字幕读取完成');
      await state.subtitleLoadPromise;
      setBusy(false);
    }
    if (state.artifact && !force) {
      state.activeTab = 'overview';
      render();
      return;
    }
    await saveGoal();
    const requestId = uid('analysis');
    state.requestId = requestId;
    const requestedMeta = getVideoMetadata();
    beginAnalysisLog(requestedMeta, force);
    setBusy(true, '检查并开启 B 站字幕');
    const requestedRouteToken = getRouteToken();
    const meta = await enrichMetadataFromPublicApi(requestedMeta);
    logEvent('info', 'identity', '已读取并补全当前视频身份', {
      requested: { bvid: requestedMeta.bvid, cid: requestedMeta.cid, page: requestedMeta.page, title: requestedMeta.title },
      verified: { bvid: meta.bvid, cid: meta.cid, page: meta.page, title: meta.title, source: meta.identity_verified }
    });
    if (getRouteToken() !== requestedRouteToken) {
      stopStaleAnalysis(requestId);
      return;
    }
    if (meta.bvid && !meta.identity_verified) {
      state.requestId = uid('cancel');
      state.busy = false;
      state.busyLabel = '';
      state.lastError = serializeError(new Error('无法确认当前播放器的 BVID/CID，已停止分析以避免理解到上一条视频。请等待播放器加载完成后重试或刷新页面。'));
      toast(state.lastError.message, 'warning');
      render();
      return;
    }
    let analysisContext = await waitForMatchingPlayer(meta, requestedRouteToken);
    if (!analysisContext || !isAnalysisContextCurrent(analysisContext)) {
      stopStaleAnalysis(requestId);
      return;
    }
    const sourceBinding = `bili-${shortFingerprint(`${meta.bvid}|${meta.cid}|${meta.page}|${analysisContext.mediaFingerprint}|${requestId}`)}`;
    logEvent('success', 'player-context', '播放器与视频身份连续稳定，已建立分析上下文', {
      binding: sourceBinding,
      bvid: analysisContext.bvid,
      cid: analysisContext.cid,
      media_fingerprint: analysisContext.mediaFingerprint,
      duration: analysisContext.playerDuration,
      source_kind: analysisContext.videoSrc ? (analysisContext.videoSrc.startsWith('blob:') ? 'blob' : 'url') : 'none'
    });
    state.video = { ...state.video, ...meta, goal: state.video.goal, id: meta.id };
    const subtitleActivation = await ensureBilibiliSubtitlesEnabled();
    logEvent(subtitleActivation.status === 'enabled' ? 'success' : 'warn', 'subtitle-activation', subtitleActivation.message, subtitleActivation);
    if (!isAnalysisContextCurrent(analysisContext)) {
      stopStaleAnalysis(requestId);
      return;
    }
    const playerDuration = Number(analysisContext.video?.duration || meta.duration || 0);
    let transcriptSegments;
    state.subtitleBusy = true;
    state.subtitleBusyLabel = '正在读取并验证完整字幕';
    try {
      transcriptSegments = await acquireStableTranscript(meta, analysisContext, {
        minimumCoverage: playerDuration > 60 ? 0.88 : 0.72,
        maxAttempts: 7,
        useCached: true,
        onProgress: label => {
          state.subtitleBusyLabel = label;
          setBusy(true, label);
        }
      });
    } catch (error) {
      if (isStaleVideoError(error)) {
        stopStaleAnalysis(requestId);
        return;
      }
      console.warn('[Yuze Bili Learning] 字幕读取失败，将继续使用关键帧', error);
      transcriptSegments = [];
      state.transcriptDiagnostic = `字幕读取失败：${cleanText(error?.message || error)}`;
      logEvent('error', 'subtitle', state.transcriptDiagnostic, { error: serializeError(error) });
    } finally {
      state.subtitleBusy = false;
      state.subtitleBusyLabel = '';
    }
    if (!transcriptSegments.length && subtitleActivation.status !== 'enabled') {
      state.transcriptDiagnostic = `${subtitleActivation.message}；${state.transcriptDiagnostic}`;
    }
    state.transcriptSegments = transcriptSegments;
    const subtitleEnd = transcriptEndTime(transcriptSegments);
    const subtitleCoverageBeforeAnalysis = playerDuration > 0 ? clamp(subtitleEnd / playerDuration, 0, 1) : 0;
    const subtitleUi = getBilibiliSubtitleUiState();
    if (subtitleActivation.status === 'enabled'
      && playerDuration > 60
      && subtitleCoverageBeforeAnalysis < 0.55
      && (subtitleUi.captionText || subtitleUi.activeLanguage)) {
      state.requestId = uid('cancel');
      state.busy = false;
      state.busyLabel = '';
      state.activeTab = 'subtitles';
      const error = new Error(`播放器字幕已开启，但完整字幕仅覆盖 ${Math.round(subtitleCoverageBeforeAnalysis * 100)}%。已暂停 AI 分析，避免继续生成不准确内容；请等待“完整字幕”读取完成后再试。`);
      error.code = 'TRANSCRIPT_NOT_READY';
      state.lastError = serializeError(error);
      state.transcriptDiagnostic = error.message;
      logEvent('error', 'analysis-blocked', error.message, {
        code: error.code,
        transcript_count: transcriptSegments.length,
        transcript_end_sec: subtitleEnd,
        duration: playerDuration
      });
      toast('完整字幕尚未就绪，已停止本次分析', 'warning');
      render();
      return;
    }
    const actualDuration = Math.max(Number(meta.duration || 0), Number(analysisContext.video?.duration || 0), subtitleEnd);
    meta.duration = actualDuration;
    state.video.duration = actualDuration;
    const transcript = transcriptToText(transcriptSegments);
    const transcriptCoverage = actualDuration > 0 ? clamp(subtitleEnd / actualDuration, 0, 1) : 0;
    logEvent(transcriptSegments.length ? 'success' : 'warn', 'evidence-ready', '分析证据准备完成', {
      transcript_count: transcriptSegments.length,
      transcript_end_sec: subtitleEnd,
      duration: actualDuration,
      transcript_coverage: transcriptCoverage,
      transcript_validation: state.transcriptValidation
    });
    const goal = state.video.goal;
    state.lastError = null;
    let normalized;
    let source = 'fallback';
    let keyFrameEvidence = [];
    try {
      setBusy(true, 'AI 正在构建学习结构');
      logEvent('info', 'bridge', '等待 LLMBridge.chat 可用');
      await waitForBridge();
      logEvent('success', 'bridge', 'LLMBridge.chat 已就绪');
      const prompt = buildAnalysisPrompt(meta, transcript, goal, transcriptSegments.length, subtitleEnd, sourceBinding);
      let result;
      try {
        assertAnalysisContext(analysisContext);
        setBusy(true, '正在抽取本地关键帧');
        const frames = await captureKeyFrames(meta.duration > 1800 ? 8 : 10, transcriptSegments, analysisContext);
        // B 站播放器可能因接近片尾的 seek 或内部缓冲而重建 video 元素。
        // 只要 BVID/分P 路由没有变化，就重新绑定播放器并继续纯字幕分析，
        // 不能把视觉抽样阶段的 DOM 重建误判成用户切换视频。
        if (!isAnalysisContextCurrent(analysisContext) && isAnalysisRouteCurrent(analysisContext)) {
          setBusy(true, '播放器已刷新，正在恢复当前视频分析');
          const reboundContext = await waitForMatchingPlayer(meta, requestedRouteToken, 7000);
          if (reboundContext) {
            logEvent('success', 'player-rebind', '视觉抽样后已重新绑定同一视频播放器，继续使用完整字幕生成概览', {
              old_media_fingerprint: analysisContext.mediaFingerprint,
              new_media_fingerprint: reboundContext.mediaFingerprint,
              bvid: reboundContext.bvid,
              cid: reboundContext.cid,
              page: reboundContext.page
            });
            analysisContext = reboundContext;
          } else {
            logEvent('warn', 'player-rebind', '同一视频播放器暂未恢复；跳过视觉证据，继续前再次校验路由身份', {
              bvid: meta.bvid,
              cid: meta.cid,
              page: meta.page,
              route: getRouteToken()
            });
          }
        }
        if (frames.length) {
          keyFrameEvidence = frames.map(frame => ({
            time: frame.time,
            reason: frame.reason,
            subtitle: frame.subtitle,
            scene_score: frame.scene_score,
            quality_score: frame.quality_score
          }));
          const frameIndex = frames.map((frame, index) => `图${index + 1}=${formatTime(frame.time)}（${frame.reason}${frame.subtitle ? `；附近字幕：${truncate(frame.subtitle, 42)}` : ''}）`).join('\n');
          const reliableTranscript = transcriptSegments.length >= 8 && transcriptCoverage >= 0.72;
          if (reliableTranscript) {
            logEvent('info', 'ai-strategy', '字幕覆盖充足，关键帧仅保存为视觉证据；主分析改用纯字幕，避免插入素材/画面文字覆盖视频主线', {
              transcript_count: transcriptSegments.length,
              transcript_coverage: transcriptCoverage,
              captured_frames: frames.length,
              frame_index: frameIndex
            });
          } else {
            assertAnalysisContext(analysisContext);
            logEvent('info', 'bridge-request', '发送关键帧多模态分析请求', {
              binding: sourceBinding,
              frame_count: frames.length,
              transcript_count: transcriptSegments.length,
              transcript_coverage: transcriptCoverage
            });
            result = await bridgeChat(`${prompt}\n\n关键帧由“全时段覆盖 + 字幕话题边界 + 画面变化 + 去相似”算法筛选：\n${frameIndex}\n关键帧可能只是 B-roll、插入节目或转场。视觉只能补充场景，不得改变标题和字幕确定的主线；不得把画面内弹幕、烧录字样或插入片段单独扩写成整条视频主题。`, {
              response_format: 'json',
              images: frames.map(frame => frame.dataUrl)
            });
            source = transcriptSegments.length ? 'frames+partial-subtitle' : 'frames-only';
          }
        }
      } catch (frameError) {
        if (isStaleVideoError(frameError) && !isAnalysisRouteCurrent(analysisContext)) throw frameError;
        console.warn('[Yuze Bili Learning] 关键帧理解失败，继续使用字幕分析', frameError);
        logEvent('warn', 'frame-analysis', isStaleVideoError(frameError)
          ? '播放器在关键帧阶段刷新，但仍是同一视频；跳过视觉证据并继续完整字幕分析'
          : '关键帧理解失败，继续使用字幕/页面分析', { error: cleanText(frameError?.message || frameError) });
      }
      if (!result) {
        // 纯字幕请求不依赖 video DOM。播放器刚好重建时，只要 BVID/分P
        // 仍与本次请求一致，就允许用已通过 BVID/CID 校验的完整字幕继续。
        if (!isAnalysisContextCurrent(analysisContext)) {
          if (!isAnalysisRouteCurrent(analysisContext)) assertAnalysisContext(analysisContext);
          logEvent('warn', 'player-context', '播放器 DOM 已刷新，但视频路由身份未变；使用已验证完整字幕继续分析', {
            bvid: meta.bvid,
            cid: meta.cid,
            page: meta.page,
            transcript_count: transcriptSegments.length,
            transcript_coverage: transcriptCoverage
          });
        }
        setBusy(true, transcriptSegments.length ? '正在根据字幕构建学习结构' : '正在根据页面信息构建学习结构');
        logEvent('info', 'bridge-request', transcriptSegments.length ? '发送纯字幕分析请求' : '发送页面元信息分析请求', {
          binding: sourceBinding,
          transcript_count: transcriptSegments.length,
          transcript_coverage: transcriptCoverage,
          prompt_chars: prompt.length
        });
        result = await bridgeChat(`${prompt}\n\n注意：不要调用外部视频理解接口。本次只依据已提供的字幕和页面元信息分析。`, { response_format: 'json' });
        source = transcriptSegments.length ? 'subtitle-only' : 'metadata-only';
      }
      if (!isAnalysisContextCurrent(analysisContext) && !isAnalysisRouteCurrent(analysisContext)) assertAnalysisContext(analysisContext);
      if (state.requestId !== requestId) return;
      let parsedResult = parseBridgeJson(result);
      logEvent('info', 'bridge-response', '收到并解析 AI JSON', {
        source,
        binding: cleanText(parsedResult?.source_binding),
        chapter_count: Array.isArray(parsedResult?.chapters) ? parsedResult.chapters.length : 0,
        chapter_end_sec: rawChapterEnd(parsedResult?.chapters),
        subtitle_evidence_count: (Array.isArray(parsedResult?.chapters) ? parsedResult.chapters : []).reduce((sum, chapter) => sum + (Array.isArray(chapter?.subtitle_evidence) ? chapter.subtitle_evidence.length : 0), 0)
      });
      try {
        validateBoundAnalysis(parsedResult, sourceBinding, transcriptSegments, { duration: actualDuration });
      } catch (validationError) {
        logEvent('error', 'ai-validation', validationError.message, { code: validationError.code, source });
        if (source.startsWith('frames') && transcriptSegments.length >= 8) {
          setBusy(true, '视觉结果与字幕冲突，正在切换纯字幕重做');
          logEvent('warn', 'ai-recovery', '多模态结果未通过字幕校验，发起纯字幕恢复请求', { code: validationError.code });
          const recovered = await bridgeChat(`${prompt}\n\n上一次视觉结果没有通过字幕证据校验。现在禁止使用关键帧，只依据完整字幕重做；每章必须提供真实 subtitle_evidence，并逐字复制 source_binding。`, { response_format: 'json' });
          parsedResult = parseBridgeJson(recovered);
          validateBoundAnalysis(parsedResult, sourceBinding, transcriptSegments, { duration: actualDuration });
          source = 'subtitle-recovery';
          logEvent('success', 'ai-recovery', '纯字幕恢复结果通过校验');
        } else {
          throw validationError;
        }
      }
      const firstPassEnd = rawChapterEnd(parsedResult?.chapters);
      if (transcriptSegments.length && firstPassEnd < subtitleEnd - Math.max(20, subtitleEnd * 0.05)) {
        try {
          setBusy(true, `时间线仅到 ${formatTime(firstPassEnd)}，正在补全至 ${formatTime(subtitleEnd)}`);
          logEvent('warn', 'timeline-repair', `首轮时间线仅到 ${formatTime(firstPassEnd)}，开始纯字幕补全`, {
            subtitle_end_sec: subtitleEnd,
            first_pass_end_sec: firstPassEnd,
            binding: sourceBinding
          });
          const repairPrompt = [
            '你是视频章节校对器。上一次结果提前结束。请重新阅读下面完整字幕，只返回 JSON。',
            `本次媒体绑定码：${sourceBinding}。输出 source_binding 必须逐字复制，不得省略。`,
            `视频时长 ${Math.round(actualDuration)} 秒，字幕共 ${transcriptSegments.length} 条，最后字幕在 ${Math.round(subtitleEnd)} 秒。`,
            `硬性要求：章节从开头覆盖到最后字幕；最后一章 end_sec 必须不早于 ${Math.max(0, Math.floor(subtitleEnd - 3))} 秒。按语义切分，时间对齐字幕，不得机械按整分钟切分。每章给 2-3 句 summary、2-4 个 key_points 和 1-2 条 subtitle_evidence。`,
            `输出：{"source_binding":"${sourceBinding}","subtitle_digest":{"overview":"","takeaways":[],"outline":[]},"chapters":[{"id":"","start_sec":0,"end_sec":0,"title":"","summary":"","key_points":[],"subtitle_evidence":[{"start_sec":0,"quote":""}],"kind":"concept|demo|case|formula|opinion|summary|skip","importance":0.8,"goal_relevance":0.8,"confidence":0.8,"evidence":["subtitle"]}]}`,
            `完整字幕：\n${transcript}`
          ].join('\n\n');
          const repaired = parseBridgeJson(await bridgeChat(repairPrompt, { response_format: 'json' }));
          if (!isAnalysisContextCurrent(analysisContext) && !isAnalysisRouteCurrent(analysisContext)) assertAnalysisContext(analysisContext);
          validateBoundAnalysis(repaired, sourceBinding, transcriptSegments, { duration: actualDuration });
          const repairedEnd = rawChapterEnd(repaired?.chapters);
          if (Array.isArray(repaired?.chapters) && repaired.chapters.length && repairedEnd >= subtitleEnd - Math.max(20, subtitleEnd * 0.05)) {
            parsedResult = {
              ...parsedResult,
              chapters: repaired.chapters,
              subtitle_digest: repaired.subtitle_digest || parsedResult.subtitle_digest
            };
            source = `${source}+timeline-repair`;
            logEvent('success', 'timeline-repair', `时间线补全通过，已覆盖至 ${formatTime(repairedEnd)}`, { chapter_count: repaired.chapters.length });
          } else {
            logEvent('warn', 'timeline-repair', `补全结果仍只到 ${formatTime(repairedEnd)}，不覆盖首轮结果，改用本地字幕补尾`, {
              required_end_sec: subtitleEnd,
              repaired_end_sec: repairedEnd
            });
          }
        } catch (timelineError) {
          console.warn('[Yuze Bili Learning] AI 时间线补全失败，将使用字幕本地补全', timelineError);
          logEvent('error', 'timeline-repair', 'AI 时间线补全失败，将使用本地字幕补尾', { error: cleanText(timelineError?.message || timelineError), code: timelineError?.code });
        }
      }
      normalized = normalizeAnalysis(parsedResult, meta, transcriptSegments);
      logEvent('success', 'analysis', '分析结果已标准化', {
        source,
        chapter_count: normalized.chapters.length,
        timeline_end_sec: rawChapterEnd(normalized.chapters),
        duration: actualDuration
      });
    } catch (error) {
      if (isStaleVideoError(error)) {
        stopStaleAnalysis(requestId);
        return;
      }
      state.lastError = serializeError(error);
      console.error('[Yuze Bili Learning] 分析失败，使用本地学习模式', state.lastError);
      normalized = fallbackAnalysis(meta, transcriptSegments);
      source = 'local-fallback';
      logEvent('error', 'analysis', 'AI 分析未通过，已切换本地可靠结构', { error: state.lastError, transcript_count: transcriptSegments.length });
      toast(`AI 分析未完成：${error.message || error}`, 'warning');
    }
    if (state.requestId !== requestId || (!isAnalysisContextCurrent(analysisContext) && !isAnalysisRouteCurrent(analysisContext))) {
      stopStaleAnalysis(requestId);
      return;
    }
    state.artifact = {
      id: `analysis:${meta.id}`,
      video_id: meta.id,
      type: 'analysis',
      payload: normalized,
      source,
      transcript_count: transcriptSegments.length,
      transcript_segments: transcriptSegments.slice(0, 5000),
      transcript_end_sec: subtitleEnd,
      timeline_end_sec: rawChapterEnd(normalized.chapters),
      video_duration_sec: actualDuration,
      key_frames: keyFrameEvidence,
      source_binding: sourceBinding,
      video_identity: {
        bvid: meta.bvid,
        cid: meta.cid,
        page: meta.page,
        route_token: analysisContext.routeToken,
        title: meta.title,
        media_fingerprint: analysisContext.mediaFingerprint
      },
      transcript_diagnostic: state.transcriptDiagnostic,
      transcript_identity: state.transcriptIdentity,
      transcript_validation: state.transcriptValidation,
      diagnostic: source === 'local-fallback' ? state.lastError : null,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await store.put('artifacts', state.artifact);
    logEvent('success', 'artifact', '分析结果已写入当前视频缓存', {
      artifact_id: state.artifact.id,
      video_id: state.artifact.video_id,
      source,
      transcript_count: transcriptSegments.length,
      frame_count: keyFrameEvidence.length,
      timeline_end_sec: state.artifact.timeline_end_sec,
      duration: actualDuration
    });
    await syncCardsFromAnalysis(normalized.flashcards);
    state.video.analysis_status = source === 'local-fallback' ? 'fallback' : 'ready';
    state.video.analysis_source = source;
    state.video.updated_at = Date.now();
    await store.put('videos', state.video);
    setBusy(false);
    state.activeTab = 'overview';
    render();
  }

  function serializeError(error) {
    return {
      message: cleanText(error?.message || error || '未知错误'),
      name: cleanText(error?.name),
      at: Date.now()
    };
  }

  async function syncCardsFromAnalysis(cards) {
    if (!Array.isArray(cards)) return;
    const existing = new Set(state.cards.map(item => item.source_id));
    for (const card of cards) {
      if (existing.has(card.id)) continue;
      const record = {
        id: uid('card'),
        source_id: card.id,
        video_id: state.video.id,
        project_id: 'default',
        front: card.front,
        back: card.back,
        evidence_sec: card.evidence_sec,
        mastery: 0,
        due_at: Date.now(),
        interval_days: 0,
        lapses: 0,
        analysis_version: ANALYSIS_VERSION,
        created_at: Date.now(),
        updated_at: Date.now()
      };
      await store.put('cards', record);
      state.cards.push(record);
    }
  }

  async function addNote(kind) {
    const video = getPrimaryVideoElement();
    const input = state.root.querySelector('[data-field="note"]');
    const text = cleanText(input?.value);
    if (kind === 'note' && !text) {
      toast('先写一点笔记内容', 'warning');
      input?.focus();
      return;
    }
    const frame = captureCurrentFrame(video);
    const note = {
      id: uid('note'),
      video_id: state.video.id,
      project_id: 'default',
      timestamp_sec: Number(video?.currentTime || 0),
      end_sec: null,
      kind,
      user_text: text || (kind === 'bookmark' ? '片段书签' : '时间点笔记'),
      screenshot_data_url: safeImageUrl(frame.dataUrl),
      screenshot_width: Number(frame.width || 0),
      screenshot_height: Number(frame.height || 0),
      screenshot_error: cleanText(frame.error),
      tags: [],
      created_at: Date.now(),
      updated_at: Date.now()
    };
    await store.put('notes', note);
    state.notes.push(note);
    state.notes.sort((a, b) => a.timestamp_sec - b.timestamp_sec);
    if (input) input.value = '';
    const savedLabel = kind === 'bookmark' ? '已添加片段书签' : '笔记已保存';
    toast(frame.dataUrl ? `${savedLabel}，并保存当前帧` : `${savedLabel}；${frame.error || '未能保存截图'}`, frame.dataUrl ? 'success' : 'warning');
    render();
  }

  function openScreenshot(noteId) {
    const note = state.notes.find(item => item.id === noteId);
    const imageUrl = safeImageUrl(note?.screenshot_data_url);
    if (!imageUrl) {
      toast(note?.screenshot_error || '这条笔记没有可放大的截图', 'warning');
      return;
    }
    const lightbox = state.root.querySelector('[data-lightbox]');
    const image = lightbox?.querySelector('img');
    const caption = lightbox?.querySelector('[data-lightbox-caption]');
    if (!lightbox || !image) return;
    image.src = imageUrl;
    image.alt = `${formatTime(note.timestamp_sec)} 的视频帧截图`;
    if (caption) caption.textContent = `${formatTime(note.timestamp_sec)} · ${note.user_text}`;
    lightbox.hidden = false;
  }

  function closeScreenshot() {
    const lightbox = state.root.querySelector('[data-lightbox]');
    const image = lightbox?.querySelector('img');
    if (lightbox) lightbox.hidden = true;
    image?.removeAttribute('src');
  }

  async function deleteNote(id) {
    await store.delete('notes', id);
    state.notes = state.notes.filter(item => item.id !== id);
    render();
  }

  function seekTo(seconds, autoplay = true) {
    const video = getPrimaryVideoElement();
    if (!video) {
      toast('没有找到播放器', 'warning');
      return false;
    }
    const duration = Number(video.duration || state.video?.duration || 0);
    video.currentTime = clamp(seconds, 0, Math.max(0, duration || seconds));
    if (autoplay) video.play().catch(() => {});
    const player = video.closest('[aria-label="哔哩哔哩播放器"], .bpx-player-container, #bilibili-player');
    player?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  async function addCurrentToProject() {
    if (state.project.video_ids.includes(state.video.id)) {
      toast('当前视频已经在学习项目中');
      return;
    }
    if (state.project.video_ids.length >= config.maxProjectVideos) {
      toast(`每个项目最多 ${config.maxProjectVideos} 个视频`, 'warning');
      return;
    }
    state.project.video_ids.push(state.video.id);
    state.project.updated_at = Date.now();
    await store.put('projects', state.project);
    toast('已加入学习项目');
    render();
  }

  async function removeCurrentFromProject() {
    state.project.video_ids = state.project.video_ids.filter(id => id !== state.video.id);
    state.project.updated_at = Date.now();
    await store.put('projects', state.project);
    render();
  }

  async function askQuestion() {
    if (state.busy) return;
    const input = state.root.querySelector('[data-field="question"]');
    const question = cleanText(input?.value);
    if (!question) {
      input?.focus();
      return;
    }
    const requestId = uid('qa');
    state.requestId = requestId;
    setBusy(true, '正在查找证据并回答');
    try {
      await ensureBilibiliSubtitlesEnabled();
      const transcript = transcriptToText(await extractTranscript(), 18000);
      const prompt = [
        '你是视频学习助教。只依据提供的结构化分析、字幕和用户笔记回答。',
        '先直接回答，再给推理/步骤，最后列出证据时间点。没有精确时间时明确说明，禁止编造。',
        '使用清晰的中文 Markdown 排版：可使用三级标题、粗体、有序/无序列表、引用、表格和代码块；不要把整篇回答包在 Markdown 代码围栏中。',
        `问题：${question}`,
        `视频：${state.video.title}`,
        `当前播放：${formatTime(getPrimaryVideoElement()?.currentTime || 0)}`,
        `分析：${truncate(JSON.stringify(state.artifact?.payload || {}), 18000)}`,
        `字幕：${transcript}`,
        `用户笔记：${truncate(state.notes.map(item => `[${formatTime(item.timestamp_sec)}] ${item.user_text}`).join('\n'), 6000)}`
      ].join('\n\n');
      const answer = await bridgeChat(prompt);
      if (state.requestId !== requestId) return;
      const text = cleanMarkdown(typeof answer === 'string' ? answer : answer?.content || answer?.result || JSON.stringify(answer));
      state.qa.push({ id: uid('qa'), question, answer: text, created_at: Date.now() });
      state.qa = state.qa.slice(-20);
      state.video.qa = state.qa;
      await store.put('videos', { ...state.video, updated_at: Date.now() });
      if (input) input.value = '';
    } catch (error) {
      toast(`回答失败：${error.message || error}`, 'warning');
    } finally {
      setBusy(false);
      render();
    }
  }

  async function analyzeComments() {
    if (state.busy) return;
    const comments = await collectCommentsAfterLazyLoad();
    if (!comments.length) {
      toast('未读取到评论，请先滚动到评论区，等待评论加载后重试', 'warning');
      return;
    }
    setBusy(true, `分析 ${comments.length} 条公开评论`);
    try {
      const prompt = [
        '分析下面公开评论，只返回 JSON。先给出整体讨论总结和有代表性的真实观点，再区分问题、痛点、纠错线索、争议、玩笑/灌水、推广信息和未经验证的观点。不要把广告或重复口号计入主流结论。另提取评论明确提到的资料、软件、平台和链接；不得猜测 URL。',
        '输出：{"summary":"","representative_views":[],"faq":[],"pain_points":[],"corrections":[],"controversies":[],"spam_or_promotion":[],"next_questions":[],"resources":[{"title":"","category":"","url":"","context":"","risk_flags":[]}],"warning":""}',
        comments.map((item, index) => `${index + 1}. ${item}`).join('\n')
      ].join('\n\n');
      const result = await bridgeChat(prompt, 'json');
      const data = parseBridgeJson(result);
      state.video.comment_insights = {
        summary: cleanText(data.summary),
        representative_views: Array.isArray(data.representative_views) ? data.representative_views.slice(0, 8) : [],
        faq: Array.isArray(data.faq) ? data.faq.slice(0, 8) : [],
        pain_points: Array.isArray(data.pain_points) ? data.pain_points.slice(0, 8) : [],
        corrections: Array.isArray(data.corrections) ? data.corrections.slice(0, 8) : [],
        controversies: Array.isArray(data.controversies) ? data.controversies.slice(0, 8) : [],
        spam_or_promotion: Array.isArray(data.spam_or_promotion) ? data.spam_or_promotion.slice(0, 8) : [],
        next_questions: Array.isArray(data.next_questions) ? data.next_questions.slice(0, 8) : [],
        warning: cleanText(data.warning) || '评论观点未经独立验证。',
        source_count: comments.length,
        created_at: Date.now()
      };
      const commentCorpus = comments.join('\n');
      const commentResources = (Array.isArray(data.resources) ? data.resources : []).slice(0, 30).map(item => {
        const proposedUrl = safeUrl(item?.url);
        const url = proposedUrl && commentCorpus.includes(proposedUrl) ? proposedUrl : '';
        const riskFlags = Array.isArray(item?.risk_flags) ? item.risk_flags : [];
        if (proposedUrl && !url) riskFlags.push('URL 未在评论原文中出现，已移除');
        return normalizeResourceCandidate({ ...item, url, source_type: '公开评论', risk_flags: riskFlags }, '公开评论');
      }).filter(Boolean);
      state.resources = mergeResources(extractResourcesFromPage(), commentResources, state.resources);
      state.video.extracted_resources = state.resources;
      await store.put('videos', { ...state.video, updated_at: Date.now() });
    } catch (error) {
      toast(`评论分析失败：${error.message || error}`, 'warning');
    } finally {
      setBusy(false);
      render();
    }
  }

  async function refreshResources() {
    if (state.busy) return;
    setBusy(true, '正在读取字幕与公开评论');
    let comments = [];
    let transcriptSegments = Array.isArray(state.transcriptSegments) ? state.transcriptSegments : [];
    let directResources = [];
    let aiError = null;
    try {
      comments = await collectCommentsAfterLazyLoad();
      await ensureBilibiliSubtitlesEnabled();
      if (!transcriptSegments.length) {
        transcriptSegments = await extractTranscript(state.video);
        state.transcriptSegments = transcriptSegments;
      }
      directResources = extractResourcesFromPage();
      const transcript = transcriptToText(transcriptSegments, 28000);
      const commentText = truncate(comments.map((item, index) => `${index + 1}. ${item}`).join('\n'), 18000);
      const sourceCorpus = `${state.video?.description || ''}\n${transcript}\n${commentText}`;
      let semanticResources = [];

      if (transcript || commentText) {
        setBusy(true, 'AI 正在从字幕与评论提取资料');
        const prompt = [
            '你是学习资料抽取器。只从提供的字幕、公开评论和视频简介中，识别明确出现的学习资料、软件、平台、代码仓库、文档、论文、书籍、课程、数据源和可访问链接。只返回 JSON。',
            '要求：字幕和评论优先于简介；不得推荐原文没有提到的资料；不得猜测或补写 URL；只有原文出现完整 URL 时才填写 url，否则留空。评论里的链接、领取口令、公众号、群聊和网盘必须标记推广或可信度风险。',
            '同一资料只保留一次。source_type 只能是 subtitle、comment 或 description；字幕资料填写 mentioned_at_sec，评论和简介填 null；context 用一句原文依据。',
            '输出：{"resources":[{"title":"","category":"软件|平台|代码|文档|论文|书籍|课程|数据源|网盘|网站|其他","source_type":"subtitle|comment|description","mentioned_at_sec":null,"url":"","context":"","risk_flags":[]}]}',
            `视频简介：${truncate(state.video?.description, 2500)}`,
            transcript ? `字幕：\n${transcript}` : '字幕：未读取到',
            commentText ? `公开评论：\n${commentText}` : '公开评论：未读取到'
        ].join('\n\n');
        const parsed = parseBridgeJson(await bridgeChat(prompt, { response_format: 'json' }));
        semanticResources = (Array.isArray(parsed.resources) ? parsed.resources : []).slice(0, 40).map(item => {
            const rawSource = cleanText(item?.source_type).toLowerCase();
            const mentioned = Number(item?.mentioned_at_sec);
            const sourceType = rawSource === 'subtitle'
              ? `字幕${Number.isFinite(mentioned) && mentioned >= 0 ? ` ${formatTime(mentioned)}` : ''}`
              : rawSource === 'comment'
                ? '公开评论'
                : '视频简介';
            const proposedUrl = safeUrl(item?.url);
            const url = proposedUrl && (sourceCorpus.includes(proposedUrl) || directResources.some(resource => resource.url === proposedUrl))
              ? proposedUrl
              : '';
            const riskFlags = Array.isArray(item?.risk_flags) ? item.risk_flags : [];
            if (proposedUrl && !url) riskFlags.push('URL 未在原文中出现，已移除');
            return normalizeResourceCandidate({ ...item, url, source_type: sourceType, risk_flags: riskFlags }, sourceType);
        }).filter(Boolean);
      }

      state.resources = mergeResources(directResources, semanticResources, state.video.extracted_resources || []);
      state.video.extracted_resources = state.resources;
      state.video.updated_at = Date.now();
      await store.put('videos', state.video);
    } catch (error) {
      aiError = error;
      state.resources = mergeResources(directResources, state.video.extracted_resources || [], extractResourcesFromPage());
    } finally {
      setBusy(false);
      toast(aiError
        ? `已提取 ${state.resources.length} 条直接资料；语义提取失败：${cleanText(aiError.message || aiError)}`
        : `已结合 ${transcriptSegments.length} 条字幕、${comments.length} 条评论，整理 ${state.resources.length} 条资料`, aiError ? 'warning' : 'success');
    }
  }

  async function reviewCard(id, rating) {
    const card = state.cards.find(item => item.id === id);
    if (!card) return;
    const intervals = rating === 'again'
      ? [0, 1]
      : rating === 'hard'
        ? [1, 3, 7, 14]
        : rating === 'good'
          ? [1, 3, 7, 14, 30]
          : [3, 7, 14, 30, 60];
    const currentIndex = Math.max(0, intervals.findIndex(day => day > Number(card.interval_days || 0)));
    const nextDays = rating === 'again' ? 0 : intervals[currentIndex >= 0 ? currentIndex : intervals.length - 1];
    card.interval_days = nextDays;
    card.due_at = Date.now() + Math.max(10 * 60 * 1000, nextDays * 86400000);
    card.mastery = clamp(Number(card.mastery || 0) + ({ again: -15, hard: 5, good: 15, easy: 25 }[rating] || 0), 0, 100);
    if (rating === 'again') card.lapses = Number(card.lapses || 0) + 1;
    card.updated_at = Date.now();
    await store.put('cards', card);
    await store.put('logs', { id: uid('review'), type: 'review', card_id: id, video_id: state.video.id, rating, created_at: Date.now() });
    state.flashcardId = '';
    render();
  }

  async function answerQuiz(id, answer) {
    state.quizAnswers[id] = { text: cleanText(answer), revealed: true };
    const quiz = state.artifact?.payload?.quiz?.find(item => item.id === id);
    if (quiz) {
      await store.put('logs', {
        id: uid('quiz-log'), type: 'quiz', video_id: state.video.id, quiz_id: id,
        answer: cleanText(answer), reference: quiz.answer, created_at: Date.now()
      });
    }
    render();
  }

  async function generateLearningOutput(kind) {
    if (state.busy || !state.artifact?.payload) return;
    const labels = {
      summary: '学习总结',
      outline: '分享提纲',
      practice: '实践清单',
      topics: '延伸选题'
    };
    const label = labels[kind] || labels.summary;
    const formatGuides = {
      summary: '至少包含“核心结论”“证据与来源”“下一步行动”三个小节，并用表格列出：结论｜字幕/评论证据｜时间点｜可执行动作。',
      outline: '用表格组织分享结构，列为：顺序｜主题｜要讲的内容｜视频时间点｜来源/证据；表格后补充开场与结尾建议。',
      practice: '主体必须是行动表格，列为：行动项｜具体步骤｜预期产出｜完成标准｜状态；状态默认写“待开始”。',
      topics: '主体必须是选题表格，列为：选题｜价值｜字幕/评论依据｜建议形式｜下一步。'
    };
    setBusy(true, `生成${label}`);
    try {
      const prompt = [
        `请只依据以下已保存的学习证据生成“${label}”，使用简洁中文 Markdown。`,
        '保留必要的原视频时间点；区分视频观点、评论反馈和你的归纳；不得虚构案例、资源或结论。',
        formatGuides[kind] || formatGuides.summary,
        'Markdown 必须可直接渲染：使用规范标题、列表和表格；表格每行连续书写，表头、分隔行和数据行之间不要插入空行；不要用代码块包裹全文，也不要输出 HTML。',
        `学习目标：${state.video.goal?.text || state.goalDraft}`,
        `视频：${state.video.title}`,
        `结构化分析：${truncate(JSON.stringify(state.artifact.payload), 22000)}`,
        `用户笔记：${truncate(state.notes.map(item => `[${formatTime(item.timestamp_sec)}] ${item.user_text}`).join('\n'), 7000)}`,
        `评论洞察：${truncate(JSON.stringify(state.video.comment_insights || {}), 5000)}`
      ].join('\n\n');
      const result = await bridgeChat(prompt);
      const text = typeof result === 'string' ? result : result?.content || result?.result || JSON.stringify(result);
      state.project.outputs = state.project.outputs || {};
      state.project.outputs[kind] = { label, text: cleanMarkdown(String(text || '')), video_id: state.video.id, updated_at: Date.now() };
      state.project.updated_at = Date.now();
      await store.put('projects', state.project);
      toast(`${label}已生成`);
    } catch (error) {
      toast(`${label}生成失败：${error.message || error}`, 'warning');
    } finally {
      setBusy(false);
      render();
    }
  }

  async function compareProject() {
    if (state.busy) return;
    const artifacts = (await store.all('artifacts')).filter(item => state.project.video_ids.includes(item.video_id));
    if (artifacts.length < 2) {
      toast('至少加入并分析两个视频后才能进行项目综合', 'warning');
      return;
    }
    setBusy(true, `综合 ${artifacts.length} 个视频`);
    try {
      const videos = await store.all('videos');
      const videoMap = new Map(videos.map(item => [item.id, item]));
      const materials = artifacts.map(item => ({
        video_id: item.video_id,
        title: videoMap.get(item.video_id)?.title || item.video_id,
        summary: item.payload?.one_line,
        concepts: item.payload?.concepts,
        chapters: item.payload?.chapters?.map(ch => ({ start_sec: ch.start_sec, title: ch.title, summary: ch.summary }))
      }));
      const prompt = [
        `围绕学习目标“${state.project.goal?.text || config.defaultGoal}”综合这些视频。`,
        '输出可直接渲染的中文 Markdown，并依次包含：项目结论、推荐学习顺序、共同与互补概念、冲突观点、目标覆盖空白、行动建议。',
        '至少使用三张表格：①学习顺序（顺序｜学习内容｜来源视频｜学习重点）；②观点对照（主题｜视频观点｜共同/互补/冲突｜证据）；③行动计划（覆盖空白｜建议行动｜完成标准｜优先级）。',
        '表格每行连续书写，表头、分隔行和数据行之间不要插入空行；使用规范标题和列表；不要用代码块包裹全文，也不要输出 HTML。',
        '所有观点必须标注来源视频标题；不得把单个作者观点写成共识。',
        JSON.stringify(materials)
      ].join('\n\n');
      state.project.compare_result = cleanMarkdown(await bridgeChat(prompt));
      state.project.updated_at = Date.now();
      await store.put('projects', state.project);
    } catch (error) {
      toast(`项目综合失败：${error.message || error}`, 'warning');
    } finally {
      setBusy(false);
      render();
    }
  }

  function markdownForExport() {
    const analysis = state.artifact?.payload;
    const lines = [
      `# ${state.video.title || 'B 站学习笔记'}`,
      '',
      `- 视频：${state.video.url}`,
      `- UP 主：${state.video.author || '未知'}`,
      `- 学习目标：${state.video.goal?.text || state.goalDraft}`,
      `- 导出时间：${new Date().toLocaleString()}`,
      ''
    ];
    if (analysis) {
      lines.push('## 视频体检', '', analysis.one_line, '', `适配度：${analysis.goal_fit_score}/100`, '');
      if (analysis.subtitle_digest?.overview) {
        lines.push('## 字幕汇总', '', analysis.subtitle_digest.overview, '');
        analysis.subtitle_digest.takeaways.forEach(item => lines.push(`- ${item}`));
        lines.push('');
      }
      lines.push('## 章节时间线', '');
      analysis.chapters.forEach(ch => {
        lines.push(`### [${formatTime(ch.start_sec)}] ${ch.title}`, '', ch.summary);
        ch.key_points?.forEach(point => lines.push(`- ${point}`));
        ch.subtitle_evidence?.forEach(evidence => lines.push(`- 字幕证据 [${formatTime(evidence.start_sec)}]：${evidence.quote}`));
        lines.push('');
      });
      lines.push('', '## 核心概念', '');
      analysis.concepts.forEach(item => lines.push(`- **${item.name}**：${item.explanation}`));
    }
    lines.push('', '## 我的笔记', '');
    state.notes.forEach(note => lines.push(`- [${formatTime(note.timestamp_sec)}] ${note.user_text}`));
    if (state.qa.length) {
      lines.push('', '## 问答', '');
      state.qa.forEach(item => lines.push(`### ${item.question}`, '', item.answer, ''));
    }
    lines.push('', '## 资料', '');
    state.resources.forEach(item => lines.push(`- [${item.title}](${item.url}) · ${item.source_type}`));
    return lines.join('\n');
  }

  function csvCell(value) {
    return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
  }

  function csvForExport() {
    const rows = [['类型', '时间', '标题/问题', '内容', '来源']];
    (state.artifact?.payload?.chapters || []).forEach(item => rows.push(['章节', formatTime(item.start_sec), item.title, item.summary, (item.evidence || []).join('|')]));
    state.notes.forEach(item => rows.push([item.kind === 'bookmark' ? '书签' : '笔记', formatTime(item.timestamp_sec), '', item.user_text, '用户记录']));
    state.qa.forEach(item => rows.push(['问答', '', item.question, item.answer, '当前视频 AI']));
    state.resources.forEach(item => rows.push(['资料', '', item.title, item.url, item.source_type]));
    return rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  }

  function transcriptForExport() {
    return state.transcriptSegments.length
      ? state.transcriptSegments.map(item => `[${formatTime(item.start)} --> ${formatTime(item.end)}] ${item.text}`).join('\n')
      : '当前视频没有可公开获取的字幕。';
  }

  function triggerDownload(content, mime, extension) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(state.video.title || 'bilibili-learning').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)}.${extension}`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`已导出 ${extension.toUpperCase()}`);
  }

  function downloadExport(format) {
    if (format === 'json') {
      triggerDownload(JSON.stringify({ video: state.video, analysis: state.artifact, notes: state.notes, cards: state.cards, resources: state.resources, transcript: state.transcriptSegments }, null, 2), 'application/json;charset=utf-8', 'json');
      return;
    }
    if (format === 'csv') {
      triggerDownload(`\uFEFF${csvForExport()}`, 'text/csv;charset=utf-8', 'csv');
      return;
    }
    if (format === 'transcript') {
      triggerDownload(transcriptForExport(), 'text/plain;charset=utf-8', 'txt');
      return;
    }
    triggerDownload(markdownForExport(), 'text/markdown;charset=utf-8', 'md');
  }

  function scoreRing(label, value, color) {
    const safe = Math.round(clamp(value, 0, 100));
    return `<div class="score-ring" style="--score:${safe};--ring:${color || '#4c7dff'}"><div><strong>${safe}</strong><span>${escapeHtml(label)}</span></div></div>`;
  }

  function progressBar(label, value) {
    const safe = Math.round(clamp(value, 0, 100));
    return `<div class="metric-row"><span>${escapeHtml(label)}</span><div class="bar"><i style="width:${safe}%"></i></div><b>${safe}</b></div>`;
  }

  function goalEditorHtml() {
    return `<section class="card goal-card">
      <div class="section-head"><div><small>LEARNING GOAL</small><h3>你想从这条视频学会什么？</h3></div></div>
      <textarea data-field="goal" rows="3" placeholder="例如：理解音画不同步的成因，并能在剪辑中排查">${escapeHtml(state.goalDraft || config.defaultGoal)}</textarea>
      <div class="goal-options">
        <label>基础<select data-field="level"><option value="beginner" ${state.levelDraft === 'beginner' ? 'selected' : ''}>入门</option><option value="intermediate" ${state.levelDraft === 'intermediate' ? 'selected' : ''}>有基础</option><option value="advanced" ${state.levelDraft === 'advanced' ? 'selected' : ''}>熟练</option></select></label>
        <label>时间<select data-field="budget"><option value="5" ${state.budgetDraft === '5' ? 'selected' : ''}>5 分钟</option><option value="20" ${state.budgetDraft === '20' ? 'selected' : ''}>20 分钟</option><option value="60" ${state.budgetDraft === '60' ? 'selected' : ''}>完整学习</option></select></label>
      </div>
      <div class="row-actions"><button class="secondary" data-action="save-goal">保存目标</button><button class="primary" data-action="analyze">${icon('spark')}<span>${state.artifact ? '重新分析' : '开始视频体检'}</span></button></div>
    </section>`;
  }

  function subtitlePreparationHtml() {
    const info = getBilibiliSubtitleUiState();
    if (info.enabled) {
      return `<section class="card subtitle-ready is-ready"><div><b>${icon('check', 15)}播放器字幕已开启</b><p>${escapeHtml(info.activeLanguage || '脚本会优先依据字幕生成时间线和汇总。')}</p></div></section>`;
    }
    const message = info.hasControl
      ? '检测到字幕按钮，但字幕尚未开启。分析前脚本会尝试自动选择“中文（AI）”；如自动开启失败，请在播放器右下角手动选择。'
      : '当前尚未检测到字幕按钮。播放器加载完成后再试；没有字幕时只能使用关键帧和页面信息。';
    return `<section class="card subtitle-ready needs-action"><div><b>${icon('warning', 15)}建议先开启 AI 中文字幕</b><p>${escapeHtml(message)}</p></div>${info.hasControl ? `<button class="secondary small" data-action="enable-subtitles">尝试自动开启</button>` : ''}</section>`;
  }

  async function loadSubtitlesFromUi() {
    const routeToken = getRouteToken();
    state.subtitleBusy = true;
    state.subtitleBusyLabel = '正在检查播放器字幕';
    render();
    try {
      const result = await ensureBilibiliSubtitlesEnabled();
      const meta = await enrichMetadataFromPublicApi(getVideoMetadata());
      state.video = { ...state.video, ...meta, id: meta.id };
      const duration = Math.max(Number(meta.duration || 0), Number(getPrimaryVideoElement()?.duration || 0));
      const segments = await acquireStableTranscript(meta, null, {
        minimumCoverage: duration > 60 ? 0.88 : 0.72,
        maxAttempts: 8,
        useCached: false,
        onProgress: label => {
          if (getRouteToken() !== routeToken) {
            const error = new Error('检测到视频已切换，已取消旧视频字幕读取');
            error.code = 'STALE_VIDEO_CONTEXT';
            throw error;
          }
          state.subtitleBusyLabel = label;
          render();
        }
      });
      if (getRouteToken() !== routeToken) {
        const error = new Error('检测到视频已切换，已取消旧视频字幕读取');
        error.code = 'STALE_VIDEO_CONTEXT';
        throw error;
      }
      state.transcriptSegments = segments;
      const quality = transcriptQuality(segments, duration);
      if (segments.length) {
        const ready = duration <= 60 || quality.coverage >= 0.88;
        state.transcriptDiagnostic = `${state.transcriptDiagnostic}；${ready ? '已可用于 AI 分析' : '字幕仍不完整，脚本会继续阻止低质量分析'}`;
        state.video.transcript_segments = segments.slice(0, 5000);
        state.video.transcript_diagnostic = state.transcriptDiagnostic;
        state.video.transcript_identity = state.transcriptIdentity;
        state.video.transcript_validation = state.transcriptValidation;
        state.video.updated_at = Date.now();
        await store.put('videos', state.video).catch(() => {});
        toast(ready ? `完整字幕已就绪：${segments.length} 句` : `只读取到 ${segments.length} 句，请稍后重试`, ready ? 'success' : 'warning');
      } else {
        state.transcriptDiagnostic = `${result.message}；${state.transcriptDiagnostic}`;
        toast('字幕已开启，但正文仍未就绪，请稍后重试', 'warning');
      }
      return segments;
    } catch (error) {
      if (isStaleVideoError(error)) {
        toast(error.message, 'warning');
        return [];
      }
      state.transcriptDiagnostic = `字幕读取失败：${cleanText(error?.message || error)}`;
      logEvent('error', 'subtitle-ui', state.transcriptDiagnostic, { error: serializeError(error) });
      toast(state.transcriptDiagnostic, 'warning');
      return [];
    } finally {
      state.subtitleBusy = false;
      state.subtitleBusyLabel = '';
      render();
    }
  }

  function enableSubtitlesFromUi() {
    if (state.subtitleLoadPromise) {
      toast('完整字幕正在读取，请勿重复点击', 'warning');
      return state.subtitleLoadPromise;
    }
    const operation = loadSubtitlesFromUi().finally(() => {
      if (state.subtitleLoadPromise === operation) state.subtitleLoadPromise = null;
    });
    state.subtitleLoadPromise = operation;
    return operation;
  }

  function overviewHtml() {
    if (!state.artifact) return `${goalEditorHtml()}${subtitlePreparationHtml()}${manualToolsHtml()}`;
    const data = state.artifact.payload;
    const projectAdded = state.project?.video_ids?.includes(state.video.id);
    const subtitleEnd = transcriptEndTime(state.transcriptSegments);
    const evidenceDuration = Math.max(Number(state.video?.duration || 0), subtitleEnd);
    const subtitleCoverage = evidenceDuration > 0 ? Math.round(clamp(subtitleEnd / evidenceDuration * 100, 0, 100)) : 0;
    const frameCount = Array.isArray(state.artifact?.key_frames) ? state.artifact.key_frames.length : 0;
    const subtitlePrimary = state.transcriptSegments.length >= 8 && subtitleCoverage >= 72;
    return `<div class="stack">
      <section class="hero-card">
        <div class="hero-top"><span class="status-pill ${state.video.analysis_status === 'fallback' ? 'warn' : ''}">${state.video.analysis_status === 'fallback' ? '抽样/本地模式' : '证据化分析'}</span><button class="text-button" data-action="edit-goal">目标：${escapeHtml(truncate(state.video.goal?.text || state.goalDraft, 22))}</button></div>
        <p class="one-line">${escapeHtml(data.one_line)}</p>
        <div class="evidence-scope">
          <span>${icon('check', 13)}概览主证据：${subtitlePrimary ? `完整字幕 ${state.transcriptSegments.length} 句 · 覆盖 ${subtitleCoverage}%` : '页面信息/部分字幕'}</span>
          <span>视觉证据：抽样关键帧 ${frameCount} 张（非逐帧扫描）</span>
        </div>
        <div class="score-grid">
          ${scoreRing('适配度', data.goal_fit_score, '#fb7299')}
          <div class="metrics">${progressBar('信息密度', data.information_density)}${progressBar('实操程度', data.practice_level)}${progressBar('新颖程度', data.novelty)}</div>
        </div>
        <div class="reason-list">${data.fit_reasons.map(item => `<span>${icon('check', 14)}${escapeHtml(item)}</span>`).join('')}</div>
        <div class="row-actions"><button class="secondary" data-action="analyze">${icon('refresh')}重新分析</button><button class="secondary" data-action="${projectAdded ? 'remove-project' : 'add-project'}">${icon('folder')}${projectAdded ? '移出项目' : '加入项目'}</button></div>
      </section>
      ${subtitleDigestHtml(data.subtitle_digest)}
      ${chapterTimelineHtml(data.chapters.slice(0, 18))}
      ${conceptsHtml(data.concepts.slice(0, 8))}
      ${analysisDiagnosticHtml()}
      ${data.uncertainties.length ? `<section class="card warning-card"><h3>${icon('warning')}不确定性</h3>${data.uncertainties.map(item => `<p>${escapeHtml(item)}</p>`).join('')}</section>` : ''}
    </div>`;
  }

  function subtitleDigestHtml(digest) {
    if (!digest?.overview && !digest?.takeaways?.length && !digest?.outline?.length) return '';
    const subtitleEnd = transcriptEndTime(state.transcriptSegments);
    const duration = Math.max(Number(state.video?.duration || 0), subtitleEnd);
    const coverage = duration > 0 ? Math.round(clamp(subtitleEnd / duration * 100, 0, 100)) : 0;
    return `<section class="card subtitle-digest"><div class="section-head"><div><small>SUBTITLE DIGEST</small><h3>字幕汇总</h3></div><span>${state.transcriptSegments.length} 条 · 至 ${formatTime(subtitleEnd)} · ${coverage}%</span></div>${digest.overview ? `<p class="digest-overview">${escapeHtml(digest.overview)}</p>` : ''}${digest.takeaways?.length ? `<div class="digest-takeaways">${digest.takeaways.map(item => `<span>${icon('check', 13)}${escapeHtml(item)}</span>`).join('')}</div>` : ''}${digest.outline?.length ? `<div class="digest-outline">${digest.outline.map((item, index) => `<span>${index + 1}. ${escapeHtml(item)}</span>`).join('')}</div>` : ''}</section>`;
  }

  function analysisDiagnosticHtml() {
    const errorMessage = cleanText(state.lastError?.message || state.artifact?.diagnostic?.message || '');
    const subtitleMessage = cleanText(state.transcriptDiagnostic || state.artifact?.transcript_diagnostic || '');
    const subtitleNeedsAction = /失败|未找到|未检测|没有可用|正文为空|请.*开启|手动选择|可能不完整/i.test(subtitleMessage);
    if (!errorMessage && !subtitleNeedsAction) return '';
    return `<section class="card diagnostic-card"><h3>${icon('warning')}分析诊断</h3>${errorMessage ? `<p><b>AI：</b>${escapeHtml(errorMessage)}</p>` : ''}${subtitleMessage ? `<p><b>字幕：</b>${escapeHtml(subtitleMessage)}</p>` : ''}${subtitleNeedsAction ? `<button class="secondary small" data-action="enable-subtitles">开启字幕并重新读取</button>` : ''}</section>`;
  }

  function chapterTimelineHtml(chapters) {
    if (!chapters?.length) return `<section class="card empty"><p>还没有章节。你仍可以用时间戳笔记组织内容。</p></section>`;
    const timelineEnd = rawChapterEnd(chapters);
    const duration = Math.max(Number(state.video?.duration || 0), timelineEnd);
    return `<section class="card"><div class="section-head"><div><small>CHAPTERS</small><h3>重点时间线</h3></div><span>${chapters.length} 章 · 至 ${formatTime(timelineEnd)}/${formatTime(duration)}</span></div><div class="timeline">${chapters.map(ch => `
      <button class="chapter kind-${escapeHtml(ch.kind)}" data-action="seek" data-time="${ch.start_sec}">
        <span class="chapter-time">${formatTime(ch.start_sec)}</span><i></i><span class="chapter-main"><b>${escapeHtml(ch.title)}</b><small class="chapter-summary">${escapeHtml(ch.summary)}</small>${ch.key_points?.length ? `<span class="chapter-points">${ch.key_points.map(point => `<em>• ${escapeHtml(point)}</em>`).join('')}</span>` : ''}${ch.subtitle_evidence?.length ? `<span class="chapter-evidence">${ch.subtitle_evidence.map(evidence => `<em>[${formatTime(evidence.start_sec)}] “${escapeHtml(evidence.quote)}”</em>`).join('')}</span>` : ''}</span><span class="confidence">${Math.round(ch.confidence * 100)}%</span>
      </button>`).join('')}</div></section>`;
  }

  function conceptsHtml(concepts) {
    if (!concepts?.length) return '';
    return `<section class="card"><div class="section-head"><div><small>KNOWLEDGE</small><h3>核心概念</h3></div></div><div class="concept-grid">${concepts.map(item => `<details class="concept"><summary>${escapeHtml(item.name)}</summary><p>${escapeHtml(item.explanation)}</p></details>`).join('')}</div></section>`;
  }

  function manualToolsHtml() {
    return `<section class="card"><div class="section-head"><div><small>MANUAL MODE</small><h3>不等 AI，也能开始学习</h3></div></div><div class="quick-grid"><button data-action="quick-note">${icon('note')}当前时间写笔记</button><button data-action="quick-bookmark">${icon('clock')}标记当前片段</button><button data-tab="resources">${icon('link')}整理公开资料</button><button data-action="add-project">${icon('folder')}加入学习项目</button></div></section>`;
  }

  function learningHtml() {
    if (!state.artifact) return `${goalEditorHtml()}${subtitlePreparationHtml()}${manualToolsHtml()}`;
    const data = state.artifact.payload;
    const due = state.cards.filter(card => Number(card.due_at || 0) <= Date.now());
    return `<div class="stack">
      ${chapterTimelineHtml(data.chapters)}
      <section class="card"><div class="section-head"><div><small>ACTIVE RECALL</small><h3>主动回忆</h3></div><span>${data.quiz.length} 题</span></div>${quizHtml(data.quiz)}</section>
      <section class="card"><div class="section-head"><div><small>SPACED REVIEW</small><h3>闪卡复习</h3></div><span>${due.length} 张到期</span></div>${flashcardsHtml(due.length ? due : state.cards.slice(0, 5))}</section>
      <section class="card qa-card"><div class="section-head"><div><small>EVIDENCE Q&A</small><h3>问当前视频</h3></div></div>${qaHistoryHtml()}<div class="ask-row"><textarea data-field="question" rows="2" placeholder="例如：蓝牙延迟为什么比有线明显？"></textarea><button class="primary icon-only" data-action="ask" title="发送">${icon('arrow')}</button></div></section>
    </div>`;
  }

  function quizHtml(items) {
    if (!items.length) return `<div class="empty-inline">本次分析没有生成题目，可在问答框输入“给我出三道题”。</div>`;
    return `<div class="quiz-list">${items.map((item, index) => {
      const answered = state.quizAnswers[item.id];
      return `<article class="quiz-item"><div class="quiz-index">${index + 1}</div><div><p class="quiz-question">${escapeHtml(item.question)}</p>${answered?.revealed ? `<div class="answer-box"><b>参考答案</b><p>${escapeHtml(item.answer)}</p>${Number.isFinite(item.evidence_sec) ? `<button class="time-link" data-action="seek" data-time="${item.evidence_sec}">${icon('play', 14)}${formatTime(item.evidence_sec)}</button>` : ''}</div>` : `<textarea data-field="quiz-${item.id}" rows="2" placeholder="先用自己的话回答…"></textarea><button class="secondary small" data-action="answer-quiz" data-id="${item.id}">查看答案</button>`}</div></article>`;
    }).join('')}</div>`;
  }

  function flashcardsHtml(cards) {
    if (!cards.length) return `<div class="empty-inline">还没有闪卡。完成一次 AI 分析后会自动生成。</div>`;
    const selected = cards.find(item => item.id === state.flashcardId) || cards[0];
    const revealed = state.flashcardId === selected.id;
    return `<div class="flashcard ${revealed ? 'revealed' : ''}" data-action="flip-card" data-id="${selected.id}"><small>${revealed ? '答案' : '问题'}</small><p>${escapeHtml(revealed ? selected.back : selected.front)}</p>${selected.evidence_sec != null ? `<span>${formatTime(selected.evidence_sec)}</span>` : ''}</div>${revealed ? `<div class="review-actions"><button data-action="review-card" data-id="${selected.id}" data-rating="again">忘记</button><button data-action="review-card" data-id="${selected.id}" data-rating="hard">困难</button><button data-action="review-card" data-id="${selected.id}" data-rating="good">记得</button><button data-action="review-card" data-id="${selected.id}" data-rating="easy">熟练</button></div>` : `<p class="hint">点击卡片查看答案</p>`}`;
  }

  function qaHistoryHtml() {
    if (!state.qa.length) return '<p class="hint">回答会尽量引用章节时间点；找不到证据时会明确说明。</p>';
    return `<div class="qa-history">${state.qa.slice(-5).reverse().map((item, index) => `<details ${index === 0 ? 'open' : ''}><summary>${escapeHtml(item.question)}</summary><div class="qa-answer prose">${renderSimpleMarkdown(item.answer)}</div></details>`).join('')}</div>`;
  }

  function notesHtml() {
    return `<div class="stack"><section class="card sticky-compose"><div class="section-head"><div><small>TIMESTAMP NOTE</small><h3>记录当前时间点</h3></div><span class="current-time">${formatTime(getPrimaryVideoElement()?.currentTime || 0)}</span></div><textarea data-field="note" rows="3" placeholder="写下你的理解、疑问或下一步行动…"></textarea><div class="row-actions"><button class="secondary" data-action="add-bookmark">${icon('clock')}片段书签</button><button class="primary" data-action="add-note">${icon('note')}保存笔记</button></div></section><section class="card"><div class="section-head"><div><small>MY NOTES</small><h3>时间戳笔记</h3></div><span>${state.notes.length} 条</span></div>${notesListHtml()}</section></div>`;
  }

  function notesListHtml() {
    if (!state.notes.length) return '<div class="empty-inline">还没有笔记。播放到关键位置后按 N 快速记录。</div>';
    return `<div class="notes-list">${state.notes.map(item => {
      const screenshot = safeImageUrl(item.screenshot_data_url);
      const media = screenshot
        ? `<button class="note-frame" data-action="open-screenshot" data-id="${escapeHtml(item.id)}" title="点击放大截图" aria-label="放大 ${formatTime(item.timestamp_sec)} 的帧截图"><img src="${escapeHtml(screenshot)}" alt="${formatTime(item.timestamp_sec)} 的视频帧截图" loading="lazy"></button>`
        : item.screenshot_error ? `<small class="frame-error">${escapeHtml(item.screenshot_error)}</small>` : '';
      return `<article class="note-item"><button class="time-link" data-action="seek" data-time="${item.timestamp_sec}">${formatTime(item.timestamp_sec)}</button><div><span class="note-kind">${item.kind === 'bookmark' ? '书签' : '笔记'}</span><p>${escapeHtml(item.user_text)}</p>${media}</div><button class="icon-delete" data-action="delete-note" data-id="${escapeHtml(item.id)}" title="删除">${icon('close', 14)}</button></article>`;
    }).join('')}</div>`;
  }

  function resourcesHtml() {
    const insights = state.video.comment_insights;
    return `<div class="stack"><section class="card"><div class="section-head"><div><small>SUBTITLE + COMMENTS</small><h3>资料中心</h3></div><button class="secondary small" data-action="refresh-resources">从字幕/评论提取</button></div><p class="hint">优先依据视频字幕和当前已加载评论识别资料；评论链接、网盘和引流信息会附带风险提示。</p>${resourceListHtml()}</section><section class="card"><div class="section-head"><div><small>COMMENT INSIGHT</small><h3>公开评论洞察</h3></div>${insights ? `<span>${insights.source_count} 条</span>` : ''}</div>${insights ? commentInsightsHtml(insights) : `<p class="hint">仅分析当前页面已加载的公开评论，最多 ${config.maxComments} 条；评论观点不等于事实。</p><button class="primary wide" data-action="analyze-comments">${icon('spark')}开始分析公开评论</button>`}</section></div>`;
  }

  function resourceListHtml() {
    const aiResources = (state.artifact?.payload?.resources || []).map(item => normalizeResourceCandidate(item, '字幕分析')).filter(Boolean);
    const resources = mergeResources(state.resources, aiResources);
    if (!resources.length) return '<div class="empty-inline">尚未从字幕、评论或简介中提取到资料。点击“从字幕/评论提取”重新读取。</div>';
    return `<div class="resource-list">${resources.map(item => {
      const details = [item.source_type, item.context ? truncate(item.context, 70) : '', ...(item.risk_flags || [])].filter(Boolean).join(' · ');
      return `<article><span class="resource-type">${escapeHtml(item.category)}</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(details)}</small></div>${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="打开资料">${icon('arrow')}</a>` : '<span class="muted">仅提及</span>'}</article>`;
    }).join('')}</div>`;
  }

  function commentInsightsHtml(data) {
    const group = (title, items) => items?.length ? `<div class="insight-group"><b>${title}</b>${items.map(item => `<p>• ${escapeHtml(typeof item === 'string' ? item : JSON.stringify(item))}</p>`).join('')}</div>` : '';
    return `${data.summary ? `<div class="insight-group"><b>讨论总结</b><p>${escapeHtml(data.summary)}</p></div>` : ''}${group('代表性观点', data.representative_views)}${group('高频问题', data.faq)}${group('用户痛点', data.pain_points)}${group('纠错线索', data.corrections)}${group('争议观点', data.controversies)}${group('推广/灌水', data.spam_or_promotion)}${group('延伸问题', data.next_questions)}<p class="warning-text">${escapeHtml(data.warning)}</p><button class="secondary small" data-action="analyze-comments">重新分析</button>`;
  }

  async function projectHtmlAsync() {
    const videos = await store.all('videos');
    const projectVideos = videos.filter(item => state.project.video_ids.includes(item.id));
    const allCards = (await store.all('cards')).filter(item => state.project.video_ids.includes(item.video_id));
    const artifacts = (await store.all('artifacts')).filter(item => state.project.video_ids.includes(item.video_id));
    const projectNotes = (await store.all('notes')).filter(item => state.project.video_ids.includes(item.video_id));
    const due = allCards.filter(item => Number(item.due_at || 0) <= Date.now());
    const mastery = allCards.length ? Math.round(allCards.reduce((sum, item) => sum + Number(item.mastery || 0), 0) / allCards.length) : 0;
    const averages = ['information_density', 'practice_level', 'novelty'].reduce((result, key) => {
      result[key] = artifacts.length ? Math.round(artifacts.reduce((sum, item) => sum + Number(item.payload?.[key] || 0), 0) / artifacts.length) : 0;
      return result;
    }, {});
    const goalCoverage = artifacts.length ? Math.round(artifacts.reduce((sum, item) => sum + Number(item.payload?.goal_fit_score || 0), 0) / artifacts.length) : 0;
    const effectiveMinutes = Math.round(projectVideos.reduce((sum, video) => sum + Number(video.session_seconds || 0), 0) / 60);
    const outputs = Object.values(state.project.outputs || {}).sort((a, b) => Number(b.updated_at || 0) - Number(a.updated_at || 0));
    const heatmap = projectVideos.map(video => {
      const progress = video.duration ? Math.round(clamp(Number(video.watch_position || 0) / Number(video.duration) * 100, 0, 100)) : 0;
      const noteCount = projectNotes.filter(note => note.video_id === video.id).length;
      return `<div class="heat-row"><span>${escapeHtml(truncate(video.title, 18))}</span><div><i style="width:${progress}%"></i>${projectNotes.filter(note => note.video_id === video.id).slice(0, 8).map(note => `<b style="left:${Math.round(clamp(Number(note.timestamp_sec || 0) / Math.max(1, Number(video.duration || 1)) * 100, 0, 100))}%"></b>`).join('')}</div><em>${progress}% · ${noteCount} 记</em></div>`;
    }).join('');
    return `<div class="stack">
      <section class="project-hero"><small>LEARNING PROJECT</small><h2>${escapeHtml(state.project.title)}</h2><p>${escapeHtml(state.project.goal?.text || config.defaultGoal)}</p><div class="project-stats"><div><b>${projectVideos.length}</b><span>视频</span></div><div><b>${effectiveMinutes}</b><span>有效分钟</span></div><div><b>${due.length}</b><span>待复习</span></div><div><b>${mastery}%</b><span>掌握度</span></div></div></section>
      <section class="card dashboard"><div class="section-head"><div><small>LEARNING DASHBOARD</small><h3>目标与掌握看板</h3></div><span>${artifacts.length} 条已分析</span></div><div class="dashboard-grid"><div>${progressBar('目标覆盖', goalCoverage)}${progressBar('信息密度', averages.information_density)}${progressBar('实操程度', averages.practice_level)}${progressBar('新颖程度', averages.novelty)}${progressBar('记忆掌握', mastery)}</div><div class="risk-box"><b>${due.length ? `${due.length} 张闪卡需要复习` : '当前没有到期闪卡'}</b><p>${due.length ? '优先复习遗忘次数多、掌握度低的卡片。' : '继续观看、做题和记录即可累积掌握度。'}</p></div></div>${heatmap ? `<div class="knowledge-heat"><small>知识热力时间线 · 蓝色为观看进度，粉点为笔记</small>${heatmap}</div>` : ''}</section>
      <section class="card"><div class="section-head"><div><small>LEARNING PATH</small><h3>学习队列</h3></div><button class="primary small" data-action="compare-project">AI 综合</button></div>${projectVideos.length ? `<div class="project-list">${projectVideos.map((video, index) => `<article><span class="order">${index + 1}</span><div><b>${escapeHtml(video.title)}</b><small>${video.analysis_status === 'ready' ? '已分析' : video.analysis_status === 'fallback' ? '降级结构' : '待分析'} · ${formatTime(video.watch_position || 0)} / ${formatTime(video.duration || 0)}</small></div>${video.id === state.video.id ? '<span class="current-badge">当前</span>' : `<a href="${escapeHtml(video.url)}" target="_self">打开</a>`}</article>`).join('')}</div>` : '<div class="empty-inline">从概览页把视频加入项目，之后可以跨视频综合。</div>'}</section>
      ${state.project.compare_result ? `<section class="card"><div class="section-head"><div><small>CROSS VIDEO</small><h3>项目综合</h3></div></div><div class="prose">${renderSimpleMarkdown(state.project.compare_result)}</div></section>` : ''}
      <section class="card"><div class="section-head"><div><small>LEARNING OUTPUT</small><h3>把学习成果变成行动</h3></div></div><div class="output-actions"><button data-action="generate-output" data-kind="summary">学习总结</button><button data-action="generate-output" data-kind="outline">分享提纲</button><button data-action="generate-output" data-kind="practice">实践清单</button><button data-action="generate-output" data-kind="topics">延伸选题</button></div>${outputs.map(item => `<details class="output-result"><summary>${escapeHtml(item.label)} · ${new Date(item.updated_at).toLocaleString()}</summary><div class="prose">${renderSimpleMarkdown(item.text)}</div></details>`).join('')}</section>
      <section class="card export-card"><div><h3>导出学习成果</h3><p>Markdown、JSON、CSV，以及公开字幕文本。</p></div><div class="row-actions wrap"><button class="secondary" data-action="export" data-format="md">${icon('export')}Markdown</button><button class="secondary" data-action="export" data-format="json">JSON</button><button class="secondary" data-action="export" data-format="csv">CSV</button><button class="secondary" data-action="export" data-format="transcript">字幕 TXT</button></div></section>
    </div>`;
  }

  function renderMarkdownInline(value) {
    const tokens = [];
    const token = html => {
      const marker = `\uE000${tokens.length}\uE001`;
      tokens.push(html);
      return marker;
    };
    let source = String(value || '');
    source = source.replace(/`([^`\n]+)`/g, (_, code) => token(`<code>${escapeHtml(code)}</code>`));
    source = source.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+["']([^"']*)["'])?\)/g, (_, label, href, title) => {
      const url = safeUrl(href);
      if (!url) return label;
      return token(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer"${title ? ` title="${escapeHtml(title)}"` : ''}>${escapeHtml(label)}</a>`);
    });
    let html = escapeHtml(source)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_]+)__/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>')
      .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    html = html.replace(/\uE000(\d+)\uE001/g, (_, index) => tokens[Number(index)] || '');
    return html;
  }

  function normalizeLegacyMarkdown(value) {
    let source = cleanMarkdown(value).replace(/\r\n?/g, '\n');
    const wasCollapsed = (source.match(/\n/g) || []).length <= 1;
    if (wasCollapsed && /(?:#{1,6}\s|\*\*|---)/.test(source)) {
      source = source
        .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
        .replace(/\s+---\s+/g, '\n\n---\n\n')
        .replace(/\s+(\d+[.)]\s+(?=\*\*))/g, '\n$1')
        .replace(/\s+([-*]\s+(?=\*\*))/g, '\n$1');
    }
    // Older saved AI results could be collapsed into one line. A Markdown row
    // boundary then looks like "... | | next row ..."; restore that boundary.
    if (wasCollapsed) {
      source = source.replace(/\|[ \t]+\|(?=[ \t]*(?:[:\-*✅❌\p{L}\p{N}]))/gu, '|\n|');
    }
    source = source.replace(/\n[ \t]*\n(?=[ \t]*\|)/g, '\n');

    // When prose and a table header were collapsed together, detach the prose
    // once the following non-empty line proves that this is a real table.
    const lines = source.split('\n');
    const normalized = [];
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      let nextIndex = index + 1;
      while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
      const next = lines[nextIndex] || '';
      const firstPipe = line.indexOf('|');
      if (firstPipe > 0 && next.includes('|')) {
        const dividerCells = next.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (dividerCells.length && dividerCells.every(cell => /^:?-{3,}:?$/.test(cell))) {
          const prose = line.slice(0, firstPipe).trim();
          if (prose) normalized.push(prose, '');
          normalized.push(line.slice(firstPipe).trim());
          continue;
        }
      }
      normalized.push(line);
    }
    return normalized.join('\n');
  }

  function renderSimpleMarkdown(text) {
    const lines = normalizeLegacyMarkdown(text).split('\n');
    const output = [];
    let listType = '';
    let listItems = [];
    const flushList = () => {
      if (!listType || !listItems.length) return;
      output.push(`<${listType}>${listItems.map(item => `<li>${item}</li>`).join('')}</${listType}>`);
      listType = '';
      listItems = [];
    };
    const tableCells = line => line.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
    const isTableDivider = line => {
      const cells = tableCells(line);
      return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
    };

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const fence = line.match(/^```\s*([\w-]*)\s*$/);
      if (fence) {
        flushList();
        const code = [];
        index += 1;
        while (index < lines.length && !/^```\s*$/.test(lines[index])) {
          code.push(lines[index]);
          index += 1;
        }
        output.push(`<pre><code${fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''}>${escapeHtml(code.join('\n'))}</code></pre>`);
        continue;
      }
      let dividerIndex = index + 1;
      while (dividerIndex < lines.length && !lines[dividerIndex].trim()) dividerIndex += 1;
      if (line.includes('|') && lines[dividerIndex]?.includes('|') && isTableDivider(lines[dividerIndex])) {
        flushList();
        const headers = tableCells(line);
        const rows = [];
        let rowIndex = dividerIndex + 1;
        while (rowIndex < lines.length) {
          while (rowIndex < lines.length && !lines[rowIndex].trim()) rowIndex += 1;
          if (rowIndex >= lines.length || !lines[rowIndex].includes('|')) break;
          rows.push(tableCells(lines[rowIndex]));
          rowIndex += 1;
        }
        index = rowIndex - 1;
        output.push(`<div class="md-table-wrap"><table><thead><tr>${headers.map(cell => `<th>${renderMarkdownInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${headers.map((_, cellIndex) => `<td>${renderMarkdownInline(row[cellIndex] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
        continue;
      }
      const unordered = line.match(/^\s*[-+*]\s+(.+)/);
      const ordered = line.match(/^\s*\d+[.)]\s+(.+)/);
      if (unordered || ordered) {
        const nextType = ordered ? 'ol' : 'ul';
        if (listType && listType !== nextType) flushList();
        listType = nextType;
        const item = (unordered || ordered)[1].replace(/^\[([ xX])\]\s*/, (_, checked) => checked.trim() ? '☑ ' : '☐ ');
        listItems.push(renderMarkdownInline(item));
        continue;
      }
      flushList();
      if (!line.trim()) continue;
      const heading = line.match(/^(#{1,6})\s+(.+)/);
      if (heading) {
        const level = Math.min(6, heading[1].length + 2);
        output.push(`<h${level}>${renderMarkdownInline(heading[2])}</h${level}>`);
        continue;
      }
      if (/^\s*(?:---+|___+|\*\*\*+)\s*$/.test(line)) {
        output.push('<hr>');
        continue;
      }
      const quote = line.match(/^>\s?(.*)/);
      if (quote) {
        output.push(`<blockquote>${renderMarkdownInline(quote[1])}</blockquote>`);
        continue;
      }
      output.push(`<p>${renderMarkdownInline(line)}</p>`);
    }
    flushList();
    return output.join('');
  }

  function logsToText() {
    return state.logs.map(entry => {
      const time = new Date(entry.at).toLocaleTimeString('zh-CN', { hour12: false });
      const elapsed = entry.elapsed_ms ? ` +${(entry.elapsed_ms / 1000).toFixed(2)}s` : '';
      const details = entry.details == null ? '' : ` ${JSON.stringify(entry.details)}`;
      return `[${time}${elapsed}] [${entry.level.toUpperCase()}] [${entry.stage}] ${entry.message}${details}`;
    }).join('\n');
  }

  function subtitlesToText() {
    return (Array.isArray(state.transcriptSegments) ? state.transcriptSegments : []).map(item => {
      return `[${formatSubtitleTime(item.start)} --> ${formatSubtitleTime(item.end)}] ${cleanText(item.text)}`;
    }).join('\n');
  }

  async function copyPlainText(text, successMessage) {
    const value = String(text || '');
    if (!value) {
      toast('没有可复制的内容', 'warning');
      return false;
    }
    try {
      await navigator.clipboard.writeText(value);
    } catch (_) {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    toast(successMessage || '已复制');
    return true;
  }

  function subtitlesHtml() {
    const segments = Array.isArray(state.transcriptSegments) ? state.transcriptSegments : [];
    if (!segments.length) {
      return `<div class="stack">${subtitlePreparationHtml()}<section class="card empty subtitle-empty" aria-busy="${state.subtitleBusy}"><div class="section-head"><div><small>FULL TRANSCRIPT</small><h3>完整字幕</h3></div></div>${state.subtitleBusy ? `<div class="subtitle-loading"><span class="mini-spinner"></span><b>${escapeHtml(state.subtitleBusyLabel || '正在读取完整字幕')}</b><p>正在等待 B 站挂载并验证当前视频的完整字幕，请勿重复点击。</p></div>` : '<p>当前还没有可展示的字幕。开启 B 站字幕后可单独读取，不必等待 AI 分析。</p>'}<button class="primary wide" data-action="refresh-subtitles" ${state.subtitleBusy ? 'disabled aria-disabled="true"' : ''}>${state.subtitleBusy ? '<span class="mini-spinner"></span>读取中…' : `${icon('refresh')}读取完整字幕`}</button></section></div>`;
    }
    const subtitleEnd = transcriptEndTime(segments);
    const duration = Math.max(Number(state.video?.duration || 0), subtitleEnd, 1);
    const currentTime = Number(getPrimaryVideoElement()?.currentTime || 0);
    const progress = clamp(currentTime / duration * 100, 0, 100);
    const coverage = Math.round(clamp(subtitleEnd / duration * 100, 0, 100));
    const markerStep = Math.max(1, Math.ceil(segments.length / 400));
    const markers = segments.filter((_, index) => index % markerStep === 0).map(item => {
      const left = clamp(Number(item.start || 0) / duration * 100, 0, 100);
      return `<i style="left:${left.toFixed(3)}%"></i>`;
    }).join('');
    return `<div class="stack transcript-view">
      <section class="card transcript-summary">
        <div class="section-head"><div><small>FULL TRANSCRIPT</small><h3>完整字幕时间线</h3></div><span>${segments.length} 句 · ${coverage}%</span></div>
        <p>${escapeHtml(state.subtitleBusy ? state.subtitleBusyLabel || '正在重新读取完整字幕' : state.transcriptDiagnostic || `字幕覆盖至 ${formatTime(subtitleEnd)}`)}</p>
        <div class="subtitle-clock"><b data-subtitle-clock>${formatSubtitleTime(currentTime)}</b><span>/ ${formatSubtitleTime(duration)}</span></div>
        <div class="subtitle-progress" data-subtitle-progress aria-label="字幕播放进度"><span class="subtitle-progress-fill" style="width:${progress.toFixed(3)}%"></span><em class="subtitle-playhead" style="left:${progress.toFixed(3)}%"></em><div>${markers}</div></div>
        ${state.subtitleBusy ? `<div class="subtitle-loading-inline" aria-live="polite"><span class="mini-spinner"></span>${escapeHtml(state.subtitleBusyLabel || '正在重新读取完整字幕')}</div>` : ''}
        <div class="row-actions wrap"><button class="secondary" data-action="jump-current-subtitle">${icon('clock')}当前句</button><button class="secondary ${state.subtitleAutoFollow ? 'is-on' : ''}" data-action="toggle-subtitle-follow">${state.subtitleAutoFollow ? '自动跟随：开' : '自动跟随：关'}</button><button class="secondary" data-action="copy-subtitles">${icon('note')}复制全部</button><button class="secondary" data-action="refresh-subtitles" ${state.subtitleBusy ? 'disabled aria-disabled="true"' : ''}>${state.subtitleBusy ? '<span class="mini-spinner"></span>读取中…' : `${icon('refresh')}重新读取`}</button></div>
      </section>
      <section class="card transcript-list-card"><div class="subtitle-lines" role="list" aria-label="完整字幕逐句时间线">${segments.map((item, index) => {
        const active = index === state.activeSubtitleIndex;
        return `<button class="subtitle-line ${active ? 'is-active' : ''}" role="listitem" data-action="seek" data-time="${Number(item.start || 0)}" data-subtitle-index="${index}" ${active ? 'aria-current="true"' : ''} aria-label="跳转到 ${formatSubtitleTime(item.start)}：${escapeHtml(truncate(item.text, 80))}"><span class="subtitle-time"><b>${formatSubtitleTime(item.start)}</b><small>${formatSubtitleTime(item.end)}</small></span><i></i><span class="subtitle-text">${escapeHtml(item.text)}</span></button>`;
      }).join('')}</div></section>
    </div>`;
  }

  function updateSubtitlePlayback(forceScroll = false) {
    const video = getPrimaryVideoElement();
    const segments = Array.isArray(state.transcriptSegments) ? state.transcriptSegments : [];
    const currentTime = Number(video?.currentTime || 0);
    const duration = Math.max(Number(video?.duration || state.video?.duration || 0), transcriptEndTime(segments), 1);
    const clock = state.root?.querySelector('[data-subtitle-clock]');
    const fill = state.root?.querySelector('.subtitle-progress-fill');
    const playhead = state.root?.querySelector('.subtitle-playhead');
    const progress = clamp(currentTime / duration * 100, 0, 100);
    if (clock) clock.textContent = formatSubtitleTime(currentTime);
    if (fill) fill.style.width = `${progress.toFixed(3)}%`;
    if (playhead) playhead.style.left = `${progress.toFixed(3)}%`;
    if (!segments.length) return;

    let low = 0;
    let high = segments.length - 1;
    let activeIndex = -1;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      if (Number(segments[middle]?.start || 0) <= currentTime + 0.05) {
        activeIndex = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (activeIndex < 0) activeIndex = 0;
    const changed = activeIndex !== state.activeSubtitleIndex;
    state.activeSubtitleIndex = activeIndex;
    if (state.activeTab !== 'subtitles') return;
    state.root?.querySelectorAll('.subtitle-line.is-active').forEach(element => {
      if (Number(element.dataset.subtitleIndex) !== activeIndex) {
        element.classList.remove('is-active');
        element.removeAttribute('aria-current');
      }
    });
    const line = state.root?.querySelector(`.subtitle-line[data-subtitle-index="${activeIndex}"]`);
    line?.classList.add('is-active');
    line?.setAttribute('aria-current', 'true');
    if ((!changed && !forceScroll) || (!state.subtitleAutoFollow && !forceScroll) || !line) return;
    const content = state.root?.querySelector('.content');
    if (!content) return;
    const contentRect = content.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const visibleTop = contentRect.top + 72;
    const visibleBottom = contentRect.bottom - 24;
    if (forceScroll || lineRect.top < visibleTop || lineRect.bottom > visibleBottom) {
      const target = content.scrollTop + lineRect.top - contentRect.top - Math.min(170, content.clientHeight * 0.32);
      content.scrollTo({ top: Math.max(0, target), behavior: forceScroll ? 'smooth' : 'auto' });
    }
  }

  function logsHtml() {
    const currentRunLogs = state.analysisRunId ? state.logs.filter(entry => entry.run_id === state.analysisRunId) : [];
    const visibleLogs = (currentRunLogs.length ? currentRunLogs : state.logs).slice(-300);
    const errors = visibleLogs.filter(entry => entry.level === 'error').length;
    const warnings = visibleLogs.filter(entry => entry.level === 'warn').length;
    return `<div class="stack logs-view">
      <section class="card log-summary"><div class="section-head"><div><small>DIAGNOSTIC LOG</small><h3>运行日志</h3></div><span>${state.busy ? '分析中' : '空闲'}</span></div>
        <p>${escapeHtml(state.busyLabel || '记录字幕、场景扫描、关键帧和 AI 校验过程。')}</p>
        <div class="log-stats"><span>${visibleLogs.length} 条</span><span class="warn">${warnings} 警告</span><span class="error">${errors} 错误</span></div>
        <div class="row-actions"><button class="secondary" data-action="copy-logs">${icon('note')}复制日志</button><button class="secondary" data-action="clear-logs">${icon('close')}清空</button></div>
      </section>
      <section class="card log-list">${visibleLogs.length ? visibleLogs.map(entry => {
        const time = new Date(entry.at).toLocaleTimeString('zh-CN', { hour12: false });
        const elapsed = entry.elapsed_ms ? `+${(entry.elapsed_ms / 1000).toFixed(2)}s` : '';
        const details = entry.details == null ? '' : `<pre>${escapeHtml(JSON.stringify(entry.details, null, 2))}</pre>`;
        return `<article class="log-entry level-${entry.level}"><div class="log-meta"><time>${escapeHtml(time)}</time><span>${escapeHtml(elapsed)}</span><b>${escapeHtml(entry.level.toUpperCase())}</b><em>${escapeHtml(entry.stage)}</em></div><p>${escapeHtml(entry.message)}</p>${details}</article>`;
      }).join('') : '<div class="empty-inline">还没有日志。点击“重新分析”后会记录完整流程。</div>'}</section>
    </div>`;
  }

  function shellHtml(content) {
    const tabs = [
      ['overview', '概览'], ['subtitles', '字幕'], ['learning', '学习'], ['notes', '笔记'], ['resources', '资料'], ['project', '项目'], ['logs', '日志']
    ];
    const dueCount = state.cards.filter(card => Number(card.due_at || 0) <= Date.now()).length;
    const cover = state.video.cover
      ? `<a class="cover" href="${escapeHtml(state.video.cover)}" target="_blank" rel="noopener noreferrer" title="打开公开封面原图" aria-label="打开公开封面原图" style="background-image:url('${escapeHtml(state.video.cover)}')"></a>`
      : '<div class="cover" aria-hidden="true"></div>';
    return `<button class="launcher ${state.open ? 'is-open' : ''}" data-action="toggle" aria-label="打开 AI 学习伴侣">${icon('book', 22)}<span>AI 学习</span>${dueCount ? `<b>${dueCount}</b>` : ''}</button><aside class="drawer ${state.open ? 'is-open' : ''} ${state.minimized ? 'is-minimized' : ''}" role="dialog" aria-modal="false" aria-label="B 站 AI 学习伴侣"><header class="app-header"><div class="brand"><span>${icon('spark', 20)}</span><div><small>Yuze LEARNING</small><h2>AI 学习伴侣</h2></div></div><div class="header-actions"><button data-action="minimize" title="最小化" aria-label="最小化">${icon('minimize')}</button><button data-action="close" title="关闭" aria-label="关闭">${icon('close')}</button></div></header><section class="video-strip">${cover}<div><b>${escapeHtml(truncate(state.video.title || '请打开 B 站视频页', 46))}</b><small>${escapeHtml(state.video.author || 'Bilibili')} · ${formatTime(state.video.duration || 0)}</small></div></section><nav aria-label="学习伴侣页面">${tabs.map(([key, label]) => `<button class="${state.activeTab === key ? 'active' : ''}" data-tab="${key}" ${state.activeTab === key ? 'aria-current="page"' : ''}>${label}${key === 'subtitles' && state.transcriptSegments.length ? `<i>${state.transcriptSegments.length}</i>` : ''}${key === 'notes' && state.notes.length ? `<i>${state.notes.length}</i>` : ''}${key === 'project' && dueCount ? `<i>${dueCount}</i>` : ''}${key === 'logs' && state.logs.some(entry => entry.level === 'error' && entry.run_id === state.analysisRunId) ? '<i>!</i>' : ''}</button>`).join('')}</nav><main class="content">${state.busy && !['logs', 'subtitles'].includes(state.activeTab) ? busyHtml() : content}</main><footer class="app-footer"><button class="footer-time" data-action="quick-note" aria-label="在当前时间写笔记">${icon('note', 16)}${formatTime(getPrimaryVideoElement()?.currentTime || 0)}</button><input data-field="footer-question" aria-label="问当前视频" placeholder="问当前视频…"><button class="send" data-action="footer-ask" aria-label="发送问题">${icon('arrow', 16)}</button></footer></aside><div class="image-lightbox" data-lightbox hidden role="dialog" aria-modal="true" aria-label="帧截图预览"><button class="lightbox-close" data-action="close-screenshot" aria-label="关闭截图预览">${icon('close', 24)}</button><div class="lightbox-stage"><img alt=""><p data-lightbox-caption></p></div></div><div class="toast-layer" aria-live="polite"></div>`;
  }

  function busyHtml() {
    return `<div class="busy"><div class="spinner"></div><h3>${escapeHtml(state.busyLabel || '处理中')}</h3><p>视频理解可能需要几十秒。你可以继续观看，完成后结果会自动保存。</p></div>`;
  }

  async function render() {
    if (!state.root) return;
    const previousContent = state.root.querySelector('.content');
    const previousTab = state.renderedTab || state.activeTab;
    if (previousContent && !state.renderedBusy) {
      state.scrollPositions[previousTab] = Number(previousContent.scrollTop || 0);
    }
    let content = '';
    if (state.activeTab === 'overview') content = overviewHtml();
    else if (state.activeTab === 'subtitles') content = subtitlesHtml();
    else if (state.activeTab === 'learning') content = learningHtml();
    else if (state.activeTab === 'notes') content = notesHtml();
    else if (state.activeTab === 'resources') content = resourcesHtml();
    else if (state.activeTab === 'project') content = await projectHtmlAsync();
    else if (state.activeTab === 'logs') content = logsHtml();
    state.root.innerHTML = `<style>${styles()}</style>${shellHtml(content)}`;
    const nextContent = state.root.querySelector('.content');
    const restoreScrollTop = state.busy ? 0 : Number(state.scrollPositions[state.activeTab] || 0);
    state.renderedTab = state.activeTab;
    state.renderedBusy = state.busy;
    if (nextContent && state.activeTab === 'logs' && state.busy) {
      requestAnimationFrame(() => { nextContent.scrollTop = nextContent.scrollHeight; });
    } else if (nextContent && restoreScrollTop > 0) {
      requestAnimationFrame(() => {
        nextContent.scrollTop = Math.min(restoreScrollTop, Math.max(0, nextContent.scrollHeight - nextContent.clientHeight));
      });
    }
    bindUiEvents();
    if (state.activeTab === 'subtitles') requestAnimationFrame(() => updateSubtitlePlayback(true));
  }

  function setBusy(value, label) {
    state.busy = Boolean(value);
    state.busyLabel = label || '';
    render();
  }

  function toast(message, type = 'success') {
    state.toast = { message: cleanText(message), type, id: uid('toast') };
    const layer = state.root?.querySelector('.toast-layer');
    if (!layer) return;
    const element = document.createElement('div');
    element.className = `toast ${type}`;
    element.textContent = state.toast.message;
    layer.appendChild(element);
    requestAnimationFrame(() => element.classList.add('show'));
    setTimeout(() => {
      element.classList.remove('show');
      setTimeout(() => element.remove(), 220);
    }, 2400);
  }

  function bindUiEvents() {
    const click = async event => {
      const tab = event.target.closest('[data-tab]')?.dataset.tab;
      if (tab) {
        state.activeTab = tab;
        if (tab === 'subtitles') state.activeSubtitleIndex = -1;
        await render();
        return;
      }
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'toggle') { state.open = !state.open; state.minimized = false; render(); }
      else if (action === 'close') { state.open = false; render(); }
      else if (action === 'minimize') { state.open = false; state.minimized = true; render(); }
      else if (action === 'save-goal') await saveGoal();
      else if (action === 'edit-goal') { state.artifact = null; render(); }
      else if (action === 'analyze') await analyzeCurrentVideo(true);
      else if (action === 'enable-subtitles') await enableSubtitlesFromUi();
      else if (action === 'refresh-subtitles') await enableSubtitlesFromUi();
      else if (action === 'seek') {
        seekTo(Number(button.dataset.time || 0), !event.shiftKey);
        if (state.activeTab === 'subtitles') requestAnimationFrame(() => updateSubtitlePlayback(true));
      }
      else if (action === 'jump-current-subtitle') updateSubtitlePlayback(true);
      else if (action === 'toggle-subtitle-follow') {
        state.subtitleAutoFollow = !state.subtitleAutoFollow;
        await render();
      }
      else if (action === 'copy-subtitles') await copyPlainText(subtitlesToText(), `已复制 ${state.transcriptSegments.length} 句字幕`);
      else if (action === 'quick-note') { state.open = true; state.activeTab = 'notes'; render(); setTimeout(() => state.root.querySelector('[data-field="note"]')?.focus(), 0); }
      else if (action === 'quick-bookmark' || action === 'add-bookmark') await addNote('bookmark');
      else if (action === 'add-note') await addNote('note');
      else if (action === 'delete-note') await deleteNote(button.dataset.id);
      else if (action === 'open-screenshot') openScreenshot(button.dataset.id);
      else if (action === 'close-screenshot') closeScreenshot();
      else if (action === 'add-project') await addCurrentToProject();
      else if (action === 'remove-project') await removeCurrentFromProject();
      else if (action === 'ask') await askQuestion();
      else if (action === 'footer-ask') {
        const footer = state.root.querySelector('[data-field="footer-question"]');
        const targetTab = 'learning';
        state.activeTab = targetTab;
        await render();
        const target = state.root.querySelector('[data-field="question"]');
        if (target) target.value = footer?.value || '';
        await askQuestion();
      }
      else if (action === 'answer-quiz') {
        const input = state.root.querySelector(`[data-field="quiz-${CSS.escape(button.dataset.id)}"]`);
        await answerQuiz(button.dataset.id, input?.value || '');
      }
      else if (action === 'flip-card') { state.flashcardId = button.dataset.id; render(); }
      else if (action === 'review-card') await reviewCard(button.dataset.id, button.dataset.rating);
      else if (action === 'refresh-resources') await refreshResources();
      else if (action === 'analyze-comments') await analyzeComments();
      else if (action === 'compare-project') await compareProject();
      else if (action === 'generate-output') await generateLearningOutput(button.dataset.kind || 'summary');
      else if (action === 'export') downloadExport(button.dataset.format || 'md');
      else if (action === 'copy-logs') {
        await copyPlainText(logsToText(), '日志已复制');
      }
      else if (action === 'clear-logs') { state.logs = []; await render(); }
    };
    state.root.querySelectorAll('[data-action], [data-tab]').forEach(element => {
      element.addEventListener('click', click, { once: true });
    });
    const goalInput = state.root.querySelector('[data-field="goal"]');
    if (goalInput) goalInput.addEventListener('input', debounce(() => { state.goalDraft = goalInput.value; }, 120));
    const noteInput = state.root.querySelector('[data-field="note"]');
    if (noteInput) noteInput.addEventListener('keydown', event => {
      if (!event.isComposing && (event.metaKey || event.ctrlKey) && event.key === 'Enter') addNote('note');
    });
    const questionInput = state.root.querySelector('[data-field="question"]');
    if (questionInput) questionInput.addEventListener('keydown', event => {
      if (!event.isComposing && (event.metaKey || event.ctrlKey) && event.key === 'Enter') askQuestion();
    });
    const footerQuestion = state.root.querySelector('[data-field="footer-question"]');
    if (footerQuestion) footerQuestion.addEventListener('keydown', event => {
      if (!event.isComposing && event.key === 'Enter') state.root.querySelector('[data-action="footer-ask"]')?.click();
    });
    state.root.querySelectorAll('input,textarea,select,[contenteditable="true"]').forEach(element => {
      ['keydown', 'keypress', 'keyup', 'beforeinput', 'input', 'compositionstart', 'compositionupdate', 'compositionend'].forEach(type => {
        element.addEventListener(type, event => event.stopPropagation());
      });
    });
    const lightbox = state.root.querySelector('[data-lightbox]');
    if (lightbox) lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeScreenshot();
    });
  }

  function styles() {
    return `
      :host{all:initial;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;color:#22252b;--pink:#fb7299;--blue:#4c7dff;--green:#26a269;--orange:#f59e0b;--bg:#f6f7f9;--card:#fff;--line:#e8eaf0;--muted:#6e7480;z-index:2147483000}
      *{box-sizing:border-box}button,input,textarea,select{font:inherit}button{cursor:pointer}.launcher{position:fixed;right:20px;bottom:132px;height:46px;padding:0 16px;border:0;border-radius:23px;background:linear-gradient(135deg,#fb7299,#ff9ab8);color:#fff;box-shadow:0 12px 35px rgba(251,114,153,.34);display:flex;align-items:center;gap:8px;font-weight:700;z-index:2147483001;transition:.2s transform,.2s opacity}.launcher:hover{transform:translateY(-2px)}.launcher.is-open{opacity:0;pointer-events:none}.launcher b{min-width:18px;height:18px;border-radius:9px;background:#fff;color:var(--pink);font-size:11px;display:grid;place-items:center}
      .drawer{position:fixed;right:16px;top:16px;width:min(440px,calc(100vw - 32px));height:calc(100vh - 32px);border:1px solid rgba(255,255,255,.7);border-radius:20px;background:var(--bg);box-shadow:0 24px 90px rgba(26,30,39,.28);overflow:hidden;display:flex;flex-direction:column;transform:translateX(calc(100% + 40px));opacity:0;pointer-events:none;transition:.24s cubic-bezier(.2,.8,.2,1);z-index:2147483000}.drawer.is-open{transform:translateX(0);opacity:1;pointer-events:auto}.app-header{height:68px;padding:12px 14px 10px 16px;background:rgba(255,255,255,.94);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}.brand{display:flex;align-items:center;gap:10px}.brand>span{width:36px;height:36px;border-radius:12px;background:linear-gradient(135deg,var(--pink),#ffacc2);color:#fff;display:grid;place-items:center}.brand small,.section-head small,.project-hero>small{font-size:9px;letter-spacing:.14em;color:#8b91a0}.brand h2{font-size:17px;margin:1px 0 0}.header-actions{display:flex;gap:4px}.header-actions button,.icon-delete{width:34px;height:34px;border:0;background:transparent;border-radius:10px;color:#737987;display:grid;place-items:center}.header-actions button:hover,.icon-delete:hover{background:#eef0f4;color:#20242c}
      .video-strip{min-height:58px;padding:9px 16px;background:#fff;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--line)}.cover{width:68px;height:38px;border-radius:8px;background:#e4e7ee center/cover no-repeat;flex:0 0 auto}.video-strip>div:last-child{min-width:0}.video-strip b{font-size:12px;line-height:1.35;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.video-strip small{display:block;margin-top:3px;color:var(--muted);font-size:10px}
      nav{height:44px;background:#fff;display:grid;grid-template-columns:repeat(6,1fr);padding:0 8px;border-bottom:1px solid var(--line)}nav button{position:relative;border:0;background:transparent;color:#727785;font-size:11px;font-weight:600;padding:0 2px}nav button.active{color:var(--pink)}nav button.active:after{content:"";position:absolute;left:25%;right:25%;bottom:0;height:3px;border-radius:3px 3px 0 0;background:var(--pink)}nav button i{font-style:normal;margin-left:2px;padding:1px 4px;border-radius:7px;background:#eef1f7;font-size:8px}.content{flex:1;min-height:0;overflow:auto;padding:12px;scrollbar-width:thin}.stack{display:flex;flex-direction:column;gap:12px}.card,.hero-card,.project-hero{border:1px solid var(--line);background:var(--card);border-radius:15px;padding:14px;box-shadow:0 4px 16px rgba(23,27,36,.035)}.hero-card{background:linear-gradient(145deg,#fff,#fff6f9)}.hero-top,.section-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.section-head h3{font-size:15px;margin:2px 0 10px}.section-head>span{color:var(--muted);font-size:11px}.status-pill{font-size:10px;padding:4px 8px;border-radius:10px;background:#e9f8ef;color:var(--green);font-weight:700}.status-pill.warn{background:#fff3dc;color:#a96500}.text-button{border:0;background:transparent;color:var(--blue);font-size:10px;max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.one-line{font-size:16px;line-height:1.55;font-weight:700;margin:14px 0}.score-grid{display:grid;grid-template-columns:96px 1fr;gap:14px;align-items:center}.score-ring{width:90px;height:90px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--ring) calc(var(--score)*1%),#eceef3 0);position:relative}.score-ring:before{content:"";position:absolute;inset:7px;background:#fff;border-radius:50%}.score-ring>div{position:relative;display:flex;flex-direction:column;align-items:center}.score-ring strong{font-size:24px}.score-ring span{font-size:10px;color:var(--muted)}.metrics{display:flex;flex-direction:column;gap:9px}.metric-row{display:grid;grid-template-columns:52px 1fr 25px;gap:7px;align-items:center;font-size:10px;color:var(--muted)}.metric-row b{color:#444b57;text-align:right}.bar{height:6px;background:#eceef3;border-radius:3px;overflow:hidden}.bar i{height:100%;display:block;background:linear-gradient(90deg,var(--blue),#8aa7ff);border-radius:3px}.reason-list{display:flex;flex-direction:column;gap:6px;margin:12px 0}.reason-list span{display:flex;align-items:flex-start;gap:5px;color:#606673;font-size:11px;line-height:1.4}
      textarea,input,select{border:1px solid #dfe2e8;background:#fff;color:#252a33;border-radius:10px;outline:none}textarea:focus,input:focus,select:focus{border-color:#91a9ff;box-shadow:0 0 0 3px rgba(76,125,255,.12)}textarea{width:100%;padding:10px 11px;resize:vertical;font-size:12px;line-height:1.5}.goal-options{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}.goal-options label{display:flex;align-items:center;gap:7px;font-size:11px;color:var(--muted)}.goal-options select{flex:1;padding:7px}.row-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}.primary,.secondary,.quick-grid button,.review-actions button{border-radius:10px;min-height:34px;padding:7px 11px;display:inline-flex;align-items:center;justify-content:center;gap:6px;font-size:11px;font-weight:650}.primary{border:1px solid var(--pink);background:var(--pink);color:#fff}.secondary{border:1px solid #dfe2e8;background:#fff;color:#4b5260}.small{min-height:28px;padding:5px 9px;font-size:10px}.wide{width:100%;margin-top:10px}.icon-only{width:38px;padding:0}.quick-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-grid button{border:1px solid var(--line);background:#f8f9fb;color:#454b58;justify-content:flex-start}.timeline{display:flex;flex-direction:column}.chapter{display:grid;grid-template-columns:42px 12px 1fr 34px;gap:7px;align-items:flex-start;border:0;background:transparent;text-align:left;padding:6px 0;color:inherit}.chapter-time{font-size:10px;color:var(--blue);font-weight:700;padding-top:2px}.chapter>i{width:8px;height:8px;border-radius:50%;background:var(--blue);margin-top:4px;position:relative}.chapter>i:after{content:"";position:absolute;width:2px;height:42px;background:#e4e8f1;left:3px;top:8px}.chapter:last-child>i:after{display:none}.kind-demo>i{background:#8357d8}.kind-skip>i{background:#aeb3bd}.kind-opinion>i{background:var(--orange)}.chapter-main b{display:block;font-size:12px}.chapter-main small{display:block;color:var(--muted);font-size:10px;line-height:1.4;margin-top:2px}.confidence{font-size:9px;color:#a2a7b1;text-align:right;padding-top:2px}.concept-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px}.concept{border:1px solid var(--line);border-radius:10px;padding:8px;background:#fafbfc}.concept summary{font-size:11px;font-weight:700;cursor:pointer}.concept p{font-size:10px;line-height:1.5;color:var(--muted);margin:7px 0 0}.warning-card{background:#fffaf0}.warning-card h3{display:flex;gap:6px;align-items:center;color:#936000;font-size:13px;margin:0 0 8px}.warning-card p,.warning-text{font-size:10px;color:#806a45;line-height:1.45}
      .quiz-list{display:flex;flex-direction:column;gap:12px}.quiz-item{display:grid;grid-template-columns:26px 1fr;gap:10px;padding:11px;border:1px solid var(--line);border-radius:12px;background:#fafbfc}.quiz-index{width:24px;height:24px;border-radius:8px;background:#e8efff;color:#315fd7;font-size:12px;font-weight:800;display:grid;place-items:center}.quiz-question{font-size:13px;line-height:1.55;font-weight:680;color:#252a33;margin:1px 0 9px}.quiz-item textarea{margin-bottom:7px}.answer-box{margin-top:6px;border:1px solid #bfe6cf;border-left:4px solid var(--green);background:#eaf8f0;border-radius:0 10px 10px 0;padding:10px;box-shadow:0 4px 14px rgba(38,162,105,.08)}.answer-box b{font-size:10px;color:#137547}.answer-box p{font-size:11.5px;line-height:1.6;color:#203a2b;margin:5px 0 7px}.time-link{border:0;background:transparent;color:#315fd7;padding:0;display:inline-flex;align-items:center;gap:3px;font-size:10.5px;font-weight:750}.flashcard{min-height:125px;border-radius:14px;padding:16px;background:linear-gradient(135deg,#edf2ff,#f9f5ff);display:flex;flex-direction:column;justify-content:center;cursor:pointer;box-shadow:inset 0 0 0 1px rgba(76,125,255,.12)}.flashcard.revealed{background:linear-gradient(135deg,#eefaf3,#f8fffb)}.flashcard small{color:var(--blue);font-weight:700}.flashcard p{font-size:15px;line-height:1.55;font-weight:650;margin:8px 0}.flashcard span{font-size:10px;color:var(--muted)}.review-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px}.review-actions button{padding:6px 2px;border:1px solid var(--line);background:#fff;color:#4a505d}.hint,.empty-inline{font-size:10px;color:var(--muted);line-height:1.5}.ask-row{display:grid;grid-template-columns:1fr 38px;gap:7px;align-items:end}.qa-history{max-height:220px;overflow:auto;margin-bottom:8px}.qa-history details{border-bottom:1px solid var(--line);padding:7px 0}.qa-history summary{font-size:11px;font-weight:650;cursor:pointer}.qa-history p{font-size:10px;line-height:1.55;color:#555c69;white-space:pre-wrap}.current-time{padding:4px 8px;border-radius:8px;background:#eef2ff;color:var(--blue)!important;font-weight:700}.notes-list,.resource-list,.project-list{display:flex;flex-direction:column}.note-item{display:grid;grid-template-columns:44px 1fr 28px;gap:8px;padding:9px 0;border-bottom:1px solid var(--line);align-items:flex-start}.note-item:last-child{border:0}.note-kind{font-size:9px;color:var(--muted)}.note-item p{font-size:11px;line-height:1.5;margin:3px 0}.note-frame{display:block;width:100%;max-width:240px;padding:0;margin:7px 0 2px;border:1px solid var(--line);border-radius:10px;overflow:hidden;background:#0d0f13}.note-frame img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;transition:transform .2s}.note-frame:hover img{transform:scale(1.025)}.frame-error{display:block;color:#9a6a24;font-size:9px;margin-top:5px}.diagnostic-card{background:#fff8e8;border-color:#ead9b7}.diagnostic-card h3{display:flex;align-items:center;gap:6px;color:#8b5a00;font-size:13px;margin:0 0 8px}.diagnostic-card p{font-size:10px;line-height:1.5;margin:5px 0;color:#765d32}.image-lightbox[hidden]{display:none}.image-lightbox{position:fixed;inset:0;z-index:2147483003;background:rgba(6,8,12,.88);display:flex;align-items:center;justify-content:center;padding:32px}.lightbox-stage{max-width:min(1080px,92vw);max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:10px}.lightbox-stage img{display:block;max-width:100%;max-height:calc(90vh - 48px);object-fit:contain;border-radius:12px;box-shadow:0 24px 80px rgba(0,0,0,.5)}.lightbox-stage p{color:#fff;font-size:11px;margin:0;max-width:760px;text-align:center}.lightbox-close{position:absolute;right:24px;top:20px;width:42px;height:42px;border:0;border-radius:50%;background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center}.resource-list article,.project-list article{display:grid;grid-template-columns:auto 1fr auto;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.resource-type{padding:3px 6px;background:#eef2ff;color:var(--blue);border-radius:7px;font-size:9px}.resource-list b,.project-list b{font-size:11px;display:block}.resource-list small,.project-list small{font-size:9px;color:var(--muted);display:block;margin-top:2px}.resource-list a{width:27px;height:27px;border-radius:8px;background:#f1f3f7;color:var(--blue);display:grid;place-items:center}.muted{font-size:9px;color:#a2a7b1}.insight-group{border-left:3px solid var(--blue);padding-left:8px;margin:10px 0}.insight-group b{font-size:11px}.insight-group p{font-size:10px;line-height:1.5;margin:4px 0}.project-hero{background:linear-gradient(135deg,#4c7dff,#805ad5);color:#fff}.project-hero>small{color:rgba(255,255,255,.7)}.project-hero h2{font-size:20px;margin:5px 0}.project-hero p{font-size:11px;line-height:1.5;opacity:.9}.project-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:14px}.project-stats div{background:rgba(255,255,255,.14);border-radius:10px;padding:8px;display:flex;flex-direction:column}.project-stats b{font-size:18px}.project-stats span{font-size:9px;opacity:.75}.order{width:25px;height:25px;border-radius:8px;background:#eef2ff;color:var(--blue);display:grid;place-items:center;font-size:10px;font-weight:700}.current-badge{font-size:9px;color:var(--green)}.project-list a{font-size:10px;color:var(--blue)}.export-card h3{font-size:14px;margin:0}.export-card p{font-size:10px;color:var(--muted)}.wrap{flex-wrap:wrap}.dashboard-grid{display:grid;grid-template-columns:1.3fr 1fr;gap:10px}.risk-box{border-radius:11px;background:#fff8e7;padding:10px;color:#6f5424}.risk-box b{font-size:11px}.risk-box p{font-size:9px;line-height:1.45}.knowledge-heat{border-top:1px solid var(--line);margin-top:12px;padding-top:10px}.knowledge-heat>small{font-size:9px;color:var(--muted)}.heat-row{display:grid;grid-template-columns:95px 1fr 62px;align-items:center;gap:7px;margin-top:8px}.heat-row>span{font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.heat-row>div{height:7px;background:#eceef3;border-radius:4px;position:relative}.heat-row i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),#8ba9ff);border-radius:4px}.heat-row b{position:absolute;top:-2px;width:4px;height:11px;border-radius:2px;background:var(--pink)}.heat-row em{font-size:8px;color:var(--muted);font-style:normal;text-align:right}.output-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.output-actions button{border:1px solid var(--line);background:#f8f9fb;border-radius:9px;padding:8px;font-size:10px;color:#414754}.output-result{border-top:1px solid var(--line);padding:9px 0;margin-top:8px}.output-result summary{font-size:10px;font-weight:700;cursor:pointer}.prose h3,.prose h4{font-size:13px;margin:12px 0 6px}.prose p{font-size:11px;line-height:1.55;margin:5px 0}.prose .bullet{padding-left:5px}.log-summary>p{font-size:10px;line-height:1.5;color:var(--muted);margin:0 0 10px}.log-stats{display:flex;gap:6px;margin-bottom:10px}.log-stats span{padding:3px 7px;border-radius:8px;background:#eef1f7;font-size:9px}.log-stats .warn{background:#fff3dc;color:#9a6200}.log-stats .error{background:#ffe8e8;color:#b13030}.log-list{padding:8px}.log-entry{padding:9px 7px;border-left:3px solid #aab2c0;border-bottom:1px solid var(--line)}.log-entry.level-warn{border-left-color:#d89315}.log-entry.level-error{border-left-color:#d84b4b}.log-entry.level-success{border-left-color:#26a269}.log-meta{display:flex;align-items:center;gap:5px;flex-wrap:wrap}.log-meta time,.log-meta span{font:8.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.log-meta b{font-size:8px;color:#596274}.log-meta em{font-size:8px;font-style:normal;color:var(--blue);background:#edf2ff;padding:2px 5px;border-radius:6px}.log-entry>p{font-size:10px;line-height:1.45;margin:5px 0;color:#3f4652}.log-entry pre{max-height:150px;overflow:auto;white-space:pre-wrap;word-break:break-word;background:#171a20;color:#d7dce6;border-radius:7px;padding:7px;margin:5px 0 0;font:8.5px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace}.app-footer{height:52px;padding:7px 10px;background:#fff;border-top:1px solid var(--line);display:grid;grid-template-columns:auto 1fr 34px;gap:7px;align-items:center}.footer-time{height:34px;border:1px solid var(--line);border-radius:9px;background:#f7f8fa;color:var(--blue);display:flex;align-items:center;gap:5px;font-size:10px}.app-footer input{height:34px;padding:0 9px;font-size:11px;min-width:0}.send{height:34px;border:0;border-radius:9px;background:var(--pink);color:#fff;display:grid;place-items:center}.busy{height:100%;min-height:300px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px}.spinner{width:38px;height:38px;border:3px solid #e5e8ef;border-top-color:var(--pink);border-radius:50%;animation:spin .9s linear infinite}.busy h3{font-size:15px;margin:14px 0 5px}.busy p{max-width:260px;color:var(--muted);font-size:10px;line-height:1.5}@keyframes spin{to{transform:rotate(360deg)}}.toast-layer{position:fixed;right:28px;top:28px;z-index:2147483004;display:flex;flex-direction:column;gap:8px}.toast{max-width:320px;padding:10px 13px;border-radius:10px;background:#242832;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:11px;transform:translateY(-8px);opacity:0;transition:.2s}.toast.show{transform:none;opacity:1}.toast.warning{background:#8b5a00}
      .chapter{padding:10px 0}.chapter>i:after{height:112px}.chapter-summary{line-height:1.55!important}.chapter-points,.chapter-evidence{display:flex;flex-direction:column;gap:3px;margin-top:6px}.chapter-points em{font-size:9px;line-height:1.45;color:#555d6b;font-style:normal}.chapter-evidence{padding:6px 8px;border-left:2px solid var(--blue);background:#f5f7ff;border-radius:0 7px 7px 0}.chapter-evidence em{font-size:8.5px;line-height:1.45;color:#64708b;font-style:normal}.subtitle-digest .digest-overview{font-size:11px;line-height:1.65;margin:0 0 10px}.digest-takeaways{display:flex;flex-direction:column;gap:6px}.digest-takeaways>span{display:flex;align-items:flex-start;gap:5px;font-size:10px;line-height:1.5;color:#505866}.digest-outline{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}.digest-outline>span{font-size:8.5px;padding:4px 6px;border-radius:7px;background:#eef2ff;color:#4f67a1}.subtitle-ready{display:flex;align-items:center;justify-content:space-between;gap:10px}.subtitle-ready b{display:flex;align-items:center;gap:5px;font-size:11px}.subtitle-ready p{font-size:9.5px;line-height:1.5;color:var(--muted);margin:4px 0 0}.subtitle-ready.is-ready{background:#f1faf5;border-color:#cfe9da}.subtitle-ready.is-ready b{color:var(--green)}.subtitle-ready.needs-action{background:#fff8e8;border-color:#ead9b7}.subtitle-ready.needs-action b{color:#8b5a00}
      .qa-answer{padding:8px 2px 3px;overflow-wrap:anywhere}.qa-answer p{white-space:normal!important}.prose h3,.prose h4,.prose h5,.prose h6{line-height:1.35;color:inherit}.prose h3{font-size:13px}.prose h4{font-size:12px}.prose h5,.prose h6{font-size:11px}.prose strong{font-weight:750;color:inherit}.prose em{font-style:italic}.prose del{opacity:.65}.prose ul,.prose ol{margin:6px 0 8px;padding-left:20px}.prose li{font-size:10.5px;line-height:1.6;margin:3px 0}.prose blockquote{margin:7px 0;padding:7px 9px;border-left:3px solid var(--blue);background:#f5f7ff;border-radius:0 7px 7px 0;font-size:10.5px;line-height:1.6;color:#59647c}.prose code{padding:1px 4px;border-radius:4px;background:#eef1f6;color:#c7254e;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em}.prose pre{margin:8px 0;padding:10px;overflow:auto;border-radius:9px;background:#171a20;color:#e7eaf0}.prose pre code{padding:0;background:transparent;color:inherit;white-space:pre;font-size:10px}.prose a{color:var(--blue);text-decoration:none}.prose a:hover{text-decoration:underline}.prose hr{height:1px;border:0;background:var(--line);margin:10px 0}.md-table-wrap{overflow:auto;margin:8px 0}.prose table{width:100%;border-collapse:collapse;font-size:9.5px}.prose th,.prose td{padding:6px;border:1px solid var(--line);text-align:left;vertical-align:top}.prose th{background:#f4f6fa;font-weight:700}
      nav{grid-template-columns:repeat(7,1fr);padding-left:6px;padding-right:6px}nav button{font-size:10px;padding-left:1px;padding-right:1px;min-width:0}nav button i{font-size:7px;padding:1px 3px;margin-left:1px}
      .evidence-scope{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}.evidence-scope span{display:inline-flex;align-items:center;gap:4px;padding:5px 7px;border-radius:7px;background:#eef6f1;color:#22784f;font-size:9px;font-weight:700}.evidence-scope span+span{background:#eef3ff;color:#4568ad}.transcript-summary{position:sticky;top:0;z-index:3;box-shadow:0 8px 22px rgba(23,27,36,.08)}.transcript-summary>p{font-size:9.5px;line-height:1.45;color:var(--muted);margin:0 0 8px}.subtitle-clock{display:flex;align-items:baseline;gap:5px;margin:4px 0 8px}.subtitle-clock b{font:700 16px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--pink)}.subtitle-clock span{font:9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--muted)}.subtitle-progress{position:relative;height:16px;margin:0 1px 8px;border-radius:8px;background:#edf0f5;overflow:hidden}.subtitle-progress-fill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,rgba(251,114,153,.28),rgba(76,125,255,.26))}.subtitle-playhead{position:absolute;z-index:3;top:1px;bottom:1px;width:2px;margin-left:-1px;background:var(--pink);box-shadow:0 0 0 2px rgba(251,114,153,.15)}.subtitle-progress>div{position:absolute;inset:0}.subtitle-progress>div i{position:absolute;top:6px;width:1px;height:4px;background:#8d95a4;opacity:.55}.secondary.is-on{border-color:#9eb5f7;background:#eef3ff;color:#315fd7}.transcript-list-card{padding:4px 10px}.subtitle-lines{display:flex;flex-direction:column}.subtitle-line{position:relative;display:grid;grid-template-columns:66px 12px minmax(0,1fr);gap:7px;align-items:flex-start;width:100%;padding:9px 5px;border:0;border-bottom:1px solid var(--line);border-radius:9px;background:transparent;color:inherit;text-align:left}.subtitle-line:last-child{border-bottom:0}.subtitle-line:hover{background:#f6f8fc}.subtitle-time{display:flex;flex-direction:column;gap:3px;padding-top:1px}.subtitle-time b,.subtitle-time small{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.subtitle-time b{font-size:9.5px;color:var(--blue)}.subtitle-time small{font-size:8px;color:var(--muted)}.subtitle-line>i{position:relative;width:8px;height:8px;margin-top:3px;border-radius:50%;background:#aeb6c5}.subtitle-line>i:after{content:"";position:absolute;left:3px;top:8px;width:2px;height:calc(100% + 22px);background:#e2e6ed}.subtitle-line:last-child>i:after{display:none}.subtitle-text{font-size:11.5px;line-height:1.58;overflow-wrap:anywhere}.subtitle-line.is-active{background:linear-gradient(90deg,rgba(251,114,153,.13),rgba(76,125,255,.08));box-shadow:inset 3px 0 var(--pink)}.subtitle-line.is-active .subtitle-time b{color:var(--pink)}.subtitle-line.is-active>i{background:var(--pink);box-shadow:0 0 0 4px rgba(251,114,153,.14)}.subtitle-line.is-active .subtitle-text{font-weight:700}.mini-spinner{display:inline-block;width:14px;height:14px;flex:0 0 14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spin .75s linear infinite}.subtitle-loading{display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px 8px}.subtitle-loading>.mini-spinner{width:30px;height:30px;flex-basis:30px;border-width:3px;color:var(--pink)}.subtitle-loading>b{font-size:12px}.subtitle-loading>p{margin:0!important;max-width:270px;text-align:center}.subtitle-loading-inline{display:flex;align-items:center;gap:7px;margin:8px 0;padding:7px 9px;border-radius:9px;background:#fff2f6;color:#b33f66;font-size:9.5px;font-weight:700}.row-actions button[disabled]{cursor:not-allowed;opacity:.62}.row-actions button[disabled]:hover{transform:none}.primary[disabled]{cursor:not-allowed;opacity:.72}
      @media(max-width:700px){.drawer{right:0;top:0;width:100vw;height:100vh;border-radius:0}.launcher{right:14px;bottom:86px;width:46px;padding:0;justify-content:center}.launcher span{display:none}.concept-grid{grid-template-columns:1fr}}
      @media(prefers-color-scheme:dark){:host{color:#e8ebf0;--bg:#15171b;--card:#202328;--line:#30343b;--muted:#a6abb5}.drawer,.card,.video-strip,nav,.app-header,.app-footer,.hero-card{background-color:var(--card)}.hero-card{background:linear-gradient(145deg,#202328,#2a2025)}textarea,input,select,.secondary,.review-actions button{background:#191b1f;color:#e8ebf0;border-color:#3a3e46}.score-ring:before{background:#202328}.bar{background:#383c44}.quick-grid button,.concept{background:#272a30;border-color:#363a42;color:#e2e5ea}.flashcard{color:#252a33}.warning-card{background:#2d271b}.chapter-main b,.metric-row b{color:#e8ebf0}.note-item p,.qa-history p,.prose p{color:#d4d7dc}}
      @media(prefers-color-scheme:dark){.chapter-points em{color:#c7cbd3}.chapter-evidence{background:#20283a}.chapter-evidence em{color:#b7c4e8}.digest-takeaways>span{color:#d4d7dc}.digest-outline>span{background:#29334b;color:#c7d3f5}.subtitle-ready.is-ready{background:#1d3026}.subtitle-ready.needs-action,.diagnostic-card{background:#332b1d}.prose blockquote{background:#20283a;color:#c4cee7}.prose code{background:#2b2f37;color:#ff9fbc}.prose th{background:#292d34}.quiz-item{background:#25282e;border-color:#3a3f47}.quiz-question{color:#f2f4f7}.quiz-index{background:#33446f;color:#a9c2ff}.answer-box{background:#173528;border-color:#2c6e4b;border-left-color:#4fd18b;box-shadow:0 5px 18px rgba(0,0,0,.18)}.answer-box b{color:#73e2a7}.answer-box p{color:#e7fff0}.answer-box .time-link{color:#90b4ff}}
      @media(prefers-color-scheme:dark){.transcript-summary{box-shadow:0 8px 22px rgba(0,0,0,.28)}.subtitle-progress{background:#343840}.secondary.is-on{background:#273553;border-color:#4565a8;color:#afc4ff}.subtitle-line:hover{background:#272b32}.subtitle-line.is-active{background:linear-gradient(90deg,rgba(251,114,153,.18),rgba(76,125,255,.12))}.subtitle-line>i:after{background:#3a3f48}.subtitle-text{color:#e5e8ed}}
    `;
  }

  async function onRouteChange() {
    const next = getRouteToken();
    if (!next || next === state.routeKey) return;
    state.requestId = uid('cancel');
    state.routeKey = next;
    if (state.video) await persistWatchPosition();
    await sleep(350);
    await loadCurrentData();
    render();
  }

  async function persistWatchPosition() {
    if (!state.video) return;
    const video = getPrimaryVideoElement();
    if (video) state.video.watch_position = Number(video.currentTime || 0);
    state.video.session_seconds = Number(state.video.session_seconds || 0) + state.sessionVisibleSeconds;
    state.sessionVisibleSeconds = 0;
    state.video.updated_at = Date.now();
    await store.put('videos', state.video).catch(() => {});
  }

  function tickLearningTime() {
    const now = Date.now();
    const video = getPrimaryVideoElement();
    if (!state.lastTickAt) state.lastTickAt = now;
    const delta = Math.min(3, (now - state.lastTickAt) / 1000);
    state.lastTickAt = now;
    if (!document.hidden && video && !video.paused && !video.ended) state.sessionVisibleSeconds += delta;
    const footer = state.root?.querySelector('.footer-time');
    if (footer) footer.innerHTML = `${icon('note', 16)}${formatTime(video?.currentTime || 0)}`;
    updateSubtitlePlayback(false);
  }

  function globalKeydown(event) {
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [event.target];
    const typing = path.some(target => target && (
      target.matches?.('input,textarea,select,[contenteditable="true"]')
      || target.closest?.('[contenteditable="true"]')
    ));
    if (event.key === 'Escape' && state.root?.querySelector('[data-lightbox]:not([hidden])')) {
      event.preventDefault();
      closeScreenshot();
      return;
    }
    if (event.isComposing || event.key === 'Process' || event.keyCode === 229) return;
    if (event.altKey && event.key.toLowerCase() === 'l') {
      event.preventDefault();
      state.open = !state.open;
      render();
      return;
    }
    if (typing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key.toLowerCase() === 'n') {
      event.preventDefault();
      state.open = true;
      state.activeTab = 'notes';
      render();
      setTimeout(() => state.root.querySelector('[data-field="note"]')?.focus(), 0);
    } else if (event.key.toLowerCase() === 'b') {
      event.preventDefault();
      addNote('bookmark');
    } else if (event.key.toLowerCase() === 'q') {
      event.preventDefault();
      state.open = true;
      state.activeTab = 'learning';
      render();
      setTimeout(() => state.root.querySelector('[data-field="question"]')?.focus(), 0);
    }
  }

  async function start() {
    state.host = document.createElement('div');
    state.host.id = HOST_ID;
    state.root = state.host.attachShadow({ mode: 'open' });
    document.documentElement.appendChild(state.host);
    try {
      state.db = await openDatabase();
    } catch (error) {
      console.warn('[Yuze Bili Learning] IndexedDB unavailable', error);
      state.db = null;
    }
    state.routeKey = getRouteToken();
    await loadCurrentData();
    state.open = /\/video\/BV/i.test(location.pathname);
    await render();
    state.keyHandler = globalKeydown;
    window.addEventListener('keydown', state.keyHandler, true);
    state.routeTimer = setInterval(onRouteChange, config.routePollMs);
    state.timeTimer = setInterval(tickLearningTime, 1000);
    state.saveTimer = setInterval(persistWatchPosition, 15000);
    state.visibilityHandler = () => { state.lastTickAt = Date.now(); };
    document.addEventListener('visibilitychange', state.visibilityHandler);
    window[API_KEY] = {
      version: '1.13.1',
      open: () => { state.open = true; render(); },
      close: () => { state.open = false; render(); },
      analyze: force => analyzeCurrentVideo(Boolean(force)),
      seek: seekTo,
      addNote: text => {
        state.open = true; state.activeTab = 'notes'; render();
        const input = state.root.querySelector('[data-field="note"]');
        if (input) input.value = cleanText(text);
        return addNote('note');
      },
      getState: () => ({
        video: state.video,
        analysis: state.artifact,
        notes: state.notes,
        cards: state.cards,
        project: state.project,
        resources: state.resources,
        busy: state.busy,
        open: state.open,
        lastError: state.lastError,
        transcriptDiagnostic: state.transcriptDiagnostic,
        transcriptIdentity: state.transcriptIdentity,
        transcriptValidation: state.transcriptValidation,
        subtitleActivation: state.subtitleActivation,
        bridgeAvailable: Boolean(getLearningBridge()?.chat),
        bridgeKind: isTrustedValidationPage() && window.__YuzeBiliLearningBridge?.chat ? 'validation-mock' : 'LLMBridge',
        mediaFingerprint: state.artifact?.video_identity?.media_fingerprint || '',
        transcriptCount: state.transcriptSegments.length,
        subtitleBusy: state.subtitleBusy,
        subtitleBusyLabel: state.subtitleBusyLabel,
        activeSubtitleIndex: state.activeSubtitleIndex,
        subtitleAutoFollow: state.subtitleAutoFollow,
        logCount: state.logs.length,
        analysisRunId: state.analysisRunId
      }),
      getLogs: () => state.logs.map(entry => ({ ...entry })),
      getTranscript: () => state.transcriptSegments.map(item => ({ ...item })),
      loadTranscript: () => enableSubtitlesFromUi(),
      clearLogs: () => { state.logs = []; render(); },
      getVideoCandidates,
      getMediaDebugSnapshot,
      collectVisibleComments,
      refreshResources,
      cleanup: () => window[CLEANUP_KEY]?.()
    };
    console.log('[Yuze Bili Learning] AI 学习伴侣已启用', { videoId: state.video.id, title: state.video.title });
  }

  window[CLEANUP_KEY] = async function cleanup() {
    state.requestId = uid('cancel');
    clearInterval(state.routeTimer);
    clearInterval(state.timeTimer);
    clearInterval(state.saveTimer);
    state.subtitleBusy = false;
    state.subtitleBusyLabel = '';
    state.subtitleLoadPromise = null;
    window.removeEventListener('keydown', state.keyHandler, true);
    document.removeEventListener('visibilitychange', state.visibilityHandler);
    state.host?.remove();
    if (window[CLEANUP_KEY] === cleanup) {
      delete window[API_KEY];
      delete window[CLEANUP_KEY];
    }
    await persistWatchPosition().catch(() => {});
    state.db?.close?.();
    console.log('[Yuze Bili Learning] 已清理');
  };

  if (document.documentElement) start().catch(error => {
    console.error('[Yuze Bili Learning] 启动失败', error);
    window[CLEANUP_KEY]?.();
  });
  else document.addEventListener('DOMContentLoaded', () => start(), { once: true });
})();