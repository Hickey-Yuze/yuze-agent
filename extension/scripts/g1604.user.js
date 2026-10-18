/**
 * Tabbit · 抖音选题分析
 * 当前视频内容提取、结构拆解、选题分析与本地灵感库。
 */
(function () {
  'use strict';

  const SCRIPT_ID = 'tabbit-douyin-inspiration-library';
  const STYLE_ID = `${SCRIPT_ID}-style`;
  const HOST_ID = `${SCRIPT_ID}-host`;
  const CLEANUP_KEY = '__tabbitDouyinInspirationCleanup';
  const API_KEY = '__tabbitDouyinInspirationApi';
  const CONFIG_KEY = `${SCRIPT_ID}:config:v1`;
  const LIBRARY_KEY = `${SCRIPT_ID}:library:v1`;
  const CACHE_KEY = `${SCRIPT_ID}:analysis-cache:v7`;
  const LOG_KEY = `${SCRIPT_ID}:logs:v1`;
  const AI_RECORD_KEY = `${SCRIPT_ID}:ai-records:v1`;
  const ANALYSIS_VERSION = 7;
  const DIMENSIONS = [
    ['cover', '封面标题'],
    ['hook', '开头钩子'],
    ['structure', '内容结构'],
    ['rhythm', '节奏递进'],
    ['highlight', '爆点位置'],
    ['emotion', '情绪共鸣'],
    ['visual', '画面与剪辑'],
    ['audio', '字幕与声音'],
    ['comments', '评论反馈'],
    ['ending', '结尾引导'],
    ['formula', '可复用公式']
  ];
  const DIMENSION_ALIASES = {
    cover: ['cover', '封面', '封面标题'],
    hook: ['hook', '开头', '开头钩子', '钩子'],
    structure: ['structure', '结构', '内容结构', 'HKRR'],
    rhythm: ['rhythm', '节奏', '节奏递进'],
    highlight: ['highlight', '爆点', '爆点位置', '高潮'],
    emotion: ['emotion', '情绪', '情绪共鸣', '共鸣'],
    visual: ['visual', '画面', '剪辑', '画面与剪辑'],
    audio: ['audio', '字幕', '声音', '字幕与声音'],
    comments: ['comments', '评论', '评论反馈', '高赞评论'],
    ending: ['ending', '结尾', '结尾引导', '引导'],
    formula: ['formula', '公式', '可复用公式', '复用方法']
  };

  window[CLEANUP_KEY]?.();

  const defaults = {
    activeProfileId: 'default',
    profiles: [{
      id: 'default',
      name: '默认配置',
      track: 'AI 工具推荐',
      audience: '25-35 岁新媒体人，希望用 AI 提效',
      dimensions: DIMENSIONS.map(([key]) => key),
      extra: ''
    }],
    useNativeSummary: true,
    llmTimeoutMs: 90000,
    maxCacheItems: 24
  };
  const overrides = window.__tabbitDouyinInspirationConfig || {};

  const state = {
    config: normalizeConfig(readJson(CONFIG_KEY, {})),
    library: normalizeLibrary(readJson(LIBRARY_KEY, [])),
    cache: normalizeCache(readJson(CACHE_KEY, {})),
    logs: normalizeLogs(readJson(LOG_KEY, [])),
    aiRecords: normalizeAiRecords(readJson(AI_RECORD_KEY, [])),
    source: null,
    result: null,
    running: false,
    refining: false,
    summaryStatus: '',
    activeTab: 'analyze',
    panelOpen: false,
    libraryDetailId: '',
    activeVideoKey: '',
    filters: { query: '', tag: '', status: '' },
    host: null,
    root: null,
    observer: null,
    routeTimer: null,
    lastHref: location.href
  };

  function cleanText(value) {
    return String(value || '').replace(/\u200b/g, '').replace(/\s+/g, ' ').trim();
  }

  function cleanMultilineText(value) {
    return String(value || '').replace(/\u200b/g, '').replace(/\r/g, '')
      .replace(/[\t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function clamp(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function unique(values) {
    return [...new Set((values || []).map(cleanText).filter(Boolean))];
  }

  function makeId(prefix = 'item') {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      recordLog('error', '本地存储写入失败', { key, error: error?.message || String(error) });
      toast('本地存储失败，请检查浏览器空间或隐私设置', 'error');
      return false;
    }
  }

  function normalizeProfile(value, index = 0) {
    const dimensions = Array.isArray(value?.dimensions)
      ? value.dimensions.filter(key => DIMENSIONS.some(([candidate]) => candidate === key))
      : DIMENSIONS.map(([key]) => key);
    return {
      id: cleanText(value?.id) || makeId('profile'),
      name: cleanText(value?.name) || `配置 ${index + 1}`,
      track: cleanText(value?.track),
      audience: cleanText(value?.audience),
      dimensions: dimensions.length ? dimensions : ['hook'],
      extra: cleanText(value?.extra)
    };
  }

  function normalizeConfig(value) {
    const shouldMigrateDimensions = Number(value?.analysisVersion || 0) < ANALYSIS_VERSION;
    const profiles = (Array.isArray(value?.profiles) && value.profiles.length
      ? value.profiles
      : defaults.profiles).map((profile, index) => normalizeProfile(shouldMigrateDimensions
        ? { ...profile, dimensions: DIMENSIONS.map(([key]) => key) }
        : profile, index));
    const requested = cleanText(value?.activeProfileId);
    return {
      activeProfileId: profiles.some(profile => profile.id === requested) ? requested : profiles[0].id,
      profiles,
      analysisVersion: ANALYSIS_VERSION,
      useNativeSummary: value?.useNativeSummary !== false,
      llmTimeoutMs: clamp(overrides.llmTimeoutMs ?? value?.llmTimeoutMs, 5000, 180000, defaults.llmTimeoutMs),
      maxCacheItems: clamp(value?.maxCacheItems, 6, 60, defaults.maxCacheItems)
    };
  }

  function normalizeCache(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([key, entry]) => cleanText(key) && entry?.result?.source)
      .map(([key, entry]) => [key, {
        result: entry.result,
        updatedAt: entry.updatedAt || entry.result.analyzedAt || new Date(0).toISOString()
      }]));
  }

  function normalizeLogs(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object').map(item => ({
      id: cleanText(item.id) || makeId('log'),
      level: ['error', 'warn', 'info'].includes(item.level) ? item.level : 'error',
      message: cleanText(item.message) || '未知错误',
      detail: cleanText(item.detail),
      version: Number(item.version) || 0,
      at: item.at || new Date().toISOString()
    })).slice(0, 100);
  }

  function normalizeAiRecords(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object').map(item => ({
      id: cleanText(item.id) || makeId('ai-record'),
      videoKey: cleanText(item.videoKey),
      title: cleanText(item.title) || '未知视频',
      sourceUrl: cleanText(item.sourceUrl),
      question: cleanText(item.question),
      response: String(item.response || '').slice(0, 30000),
      status: cleanText(item.status) || 'unknown',
      mode: cleanText(item.mode),
      error: cleanText(item.error),
      transcript: String(item.transcript || '').slice(0, 10000),
      comments: Array.isArray(item.comments) ? item.comments.slice(0, 8) : [],
      commentStatus: cleanText(item.commentStatus),
      commentError: cleanText(item.commentError),
      visibleInfo: String(item.visibleInfo || '').slice(0, 5000),
      hashtags: unique(item.hashtags).slice(0, 16),
      metrics: item.metrics && typeof item.metrics === 'object' ? item.metrics : {},
      startedAt: item.startedAt || new Date().toISOString(),
      completedAt: item.completedAt || ''
    })).slice(0, 50);
  }

  function saveAiRecords() {
    state.aiRecords = state.aiRecords.slice(0, 50);
    writeJson(AI_RECORD_KEY, state.aiRecords);
  }

  function startAiRecord(source) {
    const record = {
      id: makeId('ai-record'),
      videoKey: source.key,
      title: source.title,
      sourceUrl: source.sourceUrl,
      question: douyinAiQuestion(),
      response: '',
      status: 'requesting',
      mode: 'stream',
      error: '',
      transcript: source.transcript || '',
      comments: [],
      commentStatus: 'requesting',
      commentError: '',
      visibleInfo: source.visibleInfo || '',
      hashtags: [...(source.hashtags || [])],
      metrics: { ...(source.metrics || {}) },
      startedAt: new Date().toISOString(),
      completedAt: ''
    };
    state.aiRecords.unshift(record);
    saveAiRecords();
    return record;
  }

  function updateAiRecord(record, patch) {
    if (!record) return;
    Object.assign(record, patch);
    saveAiRecords();
  }

  function logDetail(value) {
    if (value == null) return '';
    if (typeof value === 'string') return cleanText(value).slice(0, 4000);
    if (value instanceof Error) return cleanText(value.stack || value.message).slice(0, 4000);
    try {
      return cleanText(JSON.stringify(value, (key, item) => {
        if (item instanceof Error) return item.stack || item.message;
        if (typeof item === 'string' && item.length > 1800) return `${item.slice(0, 1800)}…`;
        return item;
      })).slice(0, 4000);
    } catch (error) {
      return cleanText(String(value)).slice(0, 4000);
    }
  }

  function recordLog(level, message, detail = '') {
    const item = {
      id: makeId('log'),
      level: ['error', 'warn', 'info'].includes(level) ? level : 'error',
      message: cleanText(message) || '未知错误',
      detail: logDetail(detail),
      version: ANALYSIS_VERSION,
      at: new Date().toISOString()
    };
    state.logs.unshift(item);
    state.logs = state.logs.slice(0, 100);
    try { localStorage.setItem(LOG_KEY, JSON.stringify(state.logs)); } catch (error) { /* avoid recursive logging */ }
    return item;
  }

  function normalizeLibrary(value) {
    if (!Array.isArray(value)) return [];
    return value.filter(item => item && typeof item === 'object').map(item => ({
      ...item,
      id: cleanText(item.id) || makeId('idea'),
      sourceKey: cleanText(item.sourceKey),
      title: cleanText(item.title) || '未命名选题',
      author: cleanText(item.author),
      sourceUrl: cleanText(item.sourceUrl),
      cover: cleanText(item.cover || item.result?.source?.cover),
      tags: unique(item.tags).slice(0, 8),
      status: ['todo', 'done', 'discarded'].includes(item.status) ? item.status : 'todo',
      note: cleanText(item.note),
      savedAt: item.savedAt || new Date().toISOString()
    })).sort((left, right) => new Date(right.savedAt) - new Date(left.savedAt));
  }

  function activeProfile() {
    return state.config.profiles.find(profile => profile.id === state.config.activeProfileId)
      || state.config.profiles[0];
  }

  function saveConfig() {
    writeJson(CONFIG_KEY, state.config);
  }

  function saveLibrary() {
    state.library.sort((left, right) => new Date(right.savedAt) - new Date(left.savedAt));
    writeJson(LIBRARY_KEY, state.library);
  }

  function cacheResult(result) {
    const key = cleanText(result?.source?.key);
    if (!key) return;
    state.cache[key] = { result: JSON.parse(JSON.stringify(result)), updatedAt: new Date().toISOString() };
    const entries = Object.entries(state.cache).sort((left, right) =>
      new Date(right[1].updatedAt) - new Date(left[1].updatedAt));
    state.cache = Object.fromEntries(entries.slice(0, state.config.maxCacheItems));
    if (!writeJson(CACHE_KEY, state.cache) && entries.length > 6) {
      state.cache = Object.fromEntries(entries.slice(0, Math.max(6, Math.floor(entries.length / 2))));
      writeJson(CACHE_KEY, state.cache);
    }
  }

  function cachedResult(key) {
    const result = state.cache[cleanText(key)]?.result;
    return result ? JSON.parse(JSON.stringify(result)) : null;
  }

  function restoreCachedResult(key) {
    const result = cachedResult(key);
    state.source = null;
    state.result = result;
    return Boolean(result);
  }

  function isVisible(element) {
    if (!element?.isConnected) return false;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  }

  function visibleArea(element) {
    const rect = element.getBoundingClientRect();
    const width = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0));
    const height = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0));
    return width * height;
  }

  function visibleRatio(element) {
    const rect = element.getBoundingClientRect();
    const total = Math.max(1, rect.width * rect.height);
    return visibleArea(element) / total;
  }

  function getMarkedActiveCard() {
    return Array.from(document.querySelectorAll(
      '[data-e2e="feed-active-video"], [data-e2e="feed-video"][aria-current="true"], [data-e2e="feed-video"].active'
    )).filter(isVisible).sort((left, right) => visibleArea(right) - visibleArea(left))[0] || null;
  }

  function getActiveVideo() {
    const markedCard = getMarkedActiveCard();
    const markedVideo = Array.from(markedCard?.querySelectorAll('video') || [])
      .filter(isVisible)
      .sort((left, right) => Number(left.paused) - Number(right.paused) || visibleArea(right) - visibleArea(left))[0];
    if (markedVideo) return markedVideo;

    return Array.from(document.querySelectorAll('video'))
      .filter(isVisible)
      .map(video => {
        const rect = video.getBoundingClientRect();
        return {
          video,
          area: visibleArea(video),
          ratio: visibleRatio(video),
          paused: video.paused,
          centerDistance: Math.abs((rect.top + rect.bottom) / 2 - innerHeight / 2)
        };
      })
      .sort((left, right) => right.ratio - left.ratio
        || Number(left.paused) - Number(right.paused)
        || right.area - left.area
        || left.centerDistance - right.centerDistance)[0]?.video || null;
  }

  function findVideoCard(video) {
    const markedCard = getMarkedActiveCard();
    if (markedCard && (!video || markedCard.contains(video))) return markedCard;
    if (video) {
      const stable = video.closest([
        '[data-e2e="feed-active-video"]', '[data-e2e="feed-video"]', '[class*="sliderVideo"]',
        '[class*="page-recommend-container"]', '[data-e2e="video-detail"]'
      ].join(','));
      if (stable) return stable;
      let current = video.parentElement;
      while (current && current !== document.body) {
        const rect = current.getBoundingClientRect();
        if (rect.height >= innerHeight * 0.45 && current.querySelector('[data-e2e="video-desc"], [data-e2e="video-info"]')) return current;
        current = current.parentElement;
      }
    }
    const info = Array.from(document.querySelectorAll('[data-e2e="video-info"], [data-e2e="video-desc"]'))
      .filter(isVisible).sort((left, right) => visibleArea(right) - visibleArea(left))[0];
    return info?.closest('[data-e2e="feed-video"], [class*="sliderVideo"], article, main > div') || info?.parentElement || null;
  }

  function firstText(root, selectors, max = 1200) {
    for (const selector of selectors) {
      const elements = Array.from(root?.querySelectorAll(selector) || []).filter(isVisible);
      const text = elements.map(element => cleanText(
        element.innerText || element.textContent || element.getAttribute('alt') || element.getAttribute('aria-label')
      )).find(Boolean);
      if (text) return text.slice(0, max);
    }
    return '';
  }

  function parseMetric(text) {
    const match = cleanText(text).match(/([\d.]+\s*[万亿wWkK]?)/);
    return match?.[1]?.replace(/\s+/g, '') || '';
  }

  function metricFrom(root, selectors, labels) {
    for (const selector of selectors) {
      const node = root?.querySelector(selector);
      if (!node) continue;
      const text = cleanText([node.getAttribute('aria-label'), node.innerText, node.textContent].filter(Boolean).join(' '));
      const value = parseMetric(text.replace(new RegExp(labels.join('|'), 'g'), ''));
      if (value) return value;
      const sibling = cleanText(node.parentElement?.innerText);
      if (parseMetric(sibling)) return parseMetric(sibling);
    }
    return '';
  }

  function videoKey(card, video, sourceUrl) {
    const directId = cleanText(card?.getAttribute('data-e2e-vid'));
    if (/^\d{8,}$/.test(directId)) return directId;
    const classMatch = String(card?.className || '').match(/(?:^|\s)video_(\d{8,})(?:\s|$)/);
    if (classMatch?.[1]) return classMatch[1];
    const candidates = [
      ...Array.from(card?.querySelectorAll('a[href]') || []).map(a => a.href),
      sourceUrl,
      location.href
    ];
    for (const value of candidates) {
      const match = String(value || '').match(/(?:\/video\/|[?&](?:aweme_id|modal_id)=)(\d{8,})/);
      if (match?.[1]) return match[1];
    }
    return `fallback:${cleanText(card?.textContent).slice(0, 180)}:${Math.round(video?.duration || 0)}`;
  }

  function detectCurrentVideoKey() {
    const video = getActiveVideo();
    const card = findVideoCard(video);
    return card ? videoKey(card, video, resolveSourceUrl(card)) : '';
  }

  function resolveSourceUrl(card) {
    const anchor = Array.from(card?.querySelectorAll('a[href*="/video/"], a[href*="aweme_id="]') || [])
      .find(item => item.getAttribute('href'));
    if (anchor) {
      try { return new URL(anchor.getAttribute('href'), location.href).href; } catch (error) { /* no-op */ }
    }
    return location.href;
  }

  function extractTranscript(card, video) {
    const cues = [];
    for (const track of Array.from(video?.textTracks || [])) {
      for (const cue of Array.from(track.cues || [])) cues.push(cleanText(cue.text));
    }
    const pageText = Array.from(card?.querySelectorAll([
      '[data-e2e="chapter-container"]', '[data-e2e*="subtitle"]', '[data-e2e*="caption"]',
      '[class*="subtitle"]', '[class*="Subtitle"]', '[class*="caption"]', '[class*="Caption"]'
    ].join(',')) || []).map(element => cleanText(
      element.innerText || element.textContent || element.getAttribute('aria-label')
    )).filter(text => text.length >= 2 && text.length <= 3000);
    return unique([...cues, ...pageText]).join('\n').slice(0, 8000);
  }

  function extractCurrentVideo() {
    const video = getActiveVideo();
    const card = findVideoCard(video);
    if (!card) throw new Error('没有识别到当前视频。请先打开或播放一条抖音视频后重试。');
    const discoveredUrl = resolveSourceUrl(card);
    const title = firstText(card, [
      '[data-e2e="video-desc"]', '[data-e2e="video-title"]', '[data-e2e="video-info"]',
      'h1', 'img[alt]'
    ], 1200);
    const author = firstText(card, [
      '[data-e2e="feed-video-nickname"]', '[data-e2e="video-author"]',
      'a[href*="/user/"] [class*="name"]', 'a[href*="/user/"]'
    ], 120);
    let publishedAt = firstText(card, [
      '[data-e2e="video-publish-time"]', 'time', '[class*="publish"]', '[class*="date"]'
    ], 80);
    const hashtags = unique(Array.from(card.querySelectorAll('a[href*="/search/"], a[href*="keyword="]'))
      .map(anchor => cleanText(anchor.textContent)).filter(text => text.startsWith('#'))).slice(0, 16);
    const transcript = extractTranscript(card, video);
    const visibleInfo = firstText(card, ['[data-e2e="video-info"]'], 3000);
    if (!publishedAt) {
      publishedAt = visibleInfo.match(/(?:·\s*)?(\d+\s*(?:分钟|小时|天|周|个月|月|年)前|昨天|前天|\d{1,2}月\d{1,2}日|\d{4}[-/.年]\d{1,2}(?:[-/.月]\d{1,2}日?)?)/)?.[1] || '';
    }
    const key = videoKey(card, video, discoveredUrl);
    const sourceUrl = /^\d{8,}$/.test(key)
      ? `${location.origin}/video/${key}`
      : discoveredUrl;
    return {
      key,
      title: title || visibleInfo || document.title || '未读取到标题',
      author,
      publishedAt,
      sourceUrl,
      hashtags,
      transcript,
      visibleInfo,
      durationSeconds: Number.isFinite(video?.duration) ? Math.round(video.duration) : null,
      metrics: {
        likes: metricFrom(card, ['[data-e2e="video-player-digg"]', '[data-e2e="feed-digg-icon"]'], ['点赞', '赞']),
        comments: metricFrom(card, ['[data-e2e="feed-comment-icon"]', '[data-e2e="video-player-comment"]'], ['评论']),
        favorites: metricFrom(card, ['[data-e2e="video-player-collect"]', '[data-e2e="feed-collect-icon"]'], ['收藏']),
        shares: metricFrom(card, ['[data-e2e="video-player-share"]', '[data-e2e="feed-share-icon"]'], ['分享'])
      },
      _card: card,
      _video: video
    };
  }

  function clickElement(element) {
    if (!element) return false;
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    element.click();
    return true;
  }

  function waitFor(probe, timeout = 3000, interval = 150) {
    const started = Date.now();
    return new Promise(resolve => {
      const check = () => {
        let value = null;
        try { value = probe(); } catch (error) { value = null; }
        if (value || Date.now() - started >= timeout) resolve(value || null);
        else setTimeout(check, interval);
      };
      check();
    });
  }

  function findExactVisible(text, root = document) {
    return Array.from(root.querySelectorAll('button, [role="button"], [role="tab"], div, span'))
      .find(element => {
        if (cleanText(element.textContent) !== text) return false;
        if (root !== document) {
          const rect = element.getBoundingClientRect();
          const style = root.defaultView?.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style?.display !== 'none' && style?.visibility !== 'hidden';
        }
        return isVisible(element);
      }) || null;
  }

  function readSummaryDocument(doc) {
    if (!doc?.body) return '';
    const candidates = Array.from(doc.querySelectorAll([
      'article', 'main', 'section', '[class*="answer"]', '[class*="Answer"]',
      '[class*="summary"]', '[class*="Summary"]', '[class*="markdown"]', '[class*="Markdown"]', 'div'
    ].join(','))).map(element => {
      const text = cleanText(element.innerText || element.textContent);
      const detailCount = element.querySelectorAll('p, li, h1, h2, h3, h4').length;
      const semantic = /answer|summary|markdown|content/i.test(String(element.className || '')) ? 1500 : 0;
      return { text, score: Math.min(text.length, 12000) + detailCount * 70 + semantic };
    }).filter(item => item.text.length >= 80 && item.text.length <= 18000
      && !/^(视频拆解|视频总结|音乐识别|问AI|更多功能指令)$/.test(item.text));
    const best = candidates.sort((left, right) => right.score - left.score)[0]?.text || '';
    return best.slice(0, 14000);
  }

  function findDetailPanelTab(label) {
    return Array.from(document.querySelectorAll('[role="tab"], button, [class*="tab"], [class*="Tab"]'))
      .filter(isVisible)
      .find(element => {
        const text = cleanText(element.innerText || element.textContent || element.getAttribute('aria-label'));
        return text === label || (label === 'AI抖音' && /^AI抖音/.test(text));
      }) || findExactVisible(label);
  }

  function findAiIframe() {
    return Array.from(document.querySelectorAll('iframe')).filter(frame => {
      const src = frame.getAttribute('src') || frame.src || '';
      return /search_ai|so-landing\.douyin\.com|\/search_ai_mobile\/pc/i.test(src);
    }).pop() || null;
  }

  async function ensureDouyinDetailPanel(source) {
    let tab = findDetailPanelTab('AI抖音') || findDetailPanelTab('评论');
    if (!tab) {
      const candidates = [
        source._card?.querySelector('[data-e2e="feed-comment-icon"], [data-e2e="video-player-comment"]'),
        ...Array.from(document.querySelectorAll('[data-e2e="feed-comment-icon"], [data-e2e="video-player-comment"]'))
          .filter(isVisible).sort((left, right) => visibleArea(right) - visibleArea(left))
      ].filter(Boolean);
      clickElement(candidates[0]);
      tab = await waitFor(() => findDetailPanelTab('AI抖音') || findDetailPanelTab('评论'), 8000, 200);
    }
    return tab;
  }

  async function ensureDouyinAiPanel(source) {
    await ensureDouyinDetailPanel(source);
    const aiTab = await waitFor(() => findDetailPanelTab('AI抖音'), 5000, 180);
    if (aiTab && aiTab.getAttribute('aria-selected') !== 'true') {
      clickElement(aiTab.closest('button, [role="button"], [role="tab"]') || aiTab);
    }
    return waitFor(findAiIframe, 10000, 220);
  }

  function metricNumber(value) {
    const text = cleanText(value);
    const match = text.match(/([\d.]+)\s*([万亿wWkK]?)/);
    if (!match) return 0;
    const multiplier = /万|w/i.test(match[2]) ? 10000 : /亿/.test(match[2]) ? 100000000 : /k/i.test(match[2]) ? 1000 : 1;
    return Number(match[1]) * multiplier || 0;
  }

  function findCommentList() {
    const selectors = [
      '[data-e2e="comment-list"]', '[class*="comment-list"]', '[class*="CommentList"]',
      '[class*="commentList"]', '[class*="comment-container"]', '[class*="CommentContainer"]'
    ];
    const candidates = Array.from(document.querySelectorAll(selectors.join(','))).filter(isVisible);
    const ranked = candidates.sort((left, right) => {
      const score = element => {
        const text = cleanText(element.innerText || element.textContent);
        const items = element.querySelectorAll('[data-e2e="comment-item"], [class*="comment-item"], [class*="CommentItem"], [class*="commentItem"]').length;
        return items * 100000 + (/全部评论|展开\d+条回复|回复/.test(text) ? 50000 : 0) + Math.min(visibleArea(element), 40000);
      };
      return score(right) - score(left);
    });
    const best = ranked[0];
    if (best) {
      const bestText = cleanText(best.innerText || best.textContent);
      const bestItems = best.querySelectorAll('[data-e2e="comment-item"], [class*="comment-item"], [class*="CommentItem"], [class*="commentItem"]').length;
      if (best.matches('[data-e2e="comment-list"]') || bestItems >= 2 || /全部评论/.test(bestText)) return best;
    }
    const countLabel = Array.from(document.querySelectorAll('div, span, p, h1, h2, h3, h4'))
      .filter(isVisible).find(element => /^全部评论\s*[（(]?\s*\d+/.test(cleanText(element.innerText || element.textContent)));
    let current = countLabel?.parentElement || null;
    for (let depth = 0; current && current !== document.body && depth < 9; depth += 1, current = current.parentElement) {
      const text = cleanText(current.innerText || current.textContent);
      const replies = (text.match(/回复/g) || []).length;
      if (replies >= 1 && current.querySelectorAll('img').length >= 1) return current;
    }
    return best || null;
  }

  function commentItems(root) {
    if (!root) return [];
    const selector = '[data-e2e="comment-item"], [class*="comment-item"], [class*="CommentItem"], [class*="commentItem"]';
    let candidates = Array.from(root.querySelectorAll(selector)).filter(item => isVisible(item)
      && cleanText(item.innerText || item.textContent).length >= 3);
    if (!candidates.length) {
      candidates = Array.from(root.querySelectorAll('div, article, li')).filter(item => {
        if (!isVisible(item) || !item.querySelector('img')) return false;
        const text = cleanText(item.innerText || item.textContent);
        return text.length >= 8 && text.length <= 1200 && /回复/.test(text);
      });
    }
    return candidates.filter(item => !candidates.some(other => other !== item && item.contains(other)))
      .slice(0, 40);
  }

  function commentAuthorTexts(item) {
    const selectors = [
      'a[href*="/user/"]', '[data-e2e*="comment-author"]', '[data-e2e*="comment-user"]',
      '[class*="nickname"]', '[class*="Nickname"]', '[class*="author-name"]', '[class*="user-name"]'
    ];
    const values = Array.from(item.querySelectorAll(selectors.join(',')))
      .map(element => cleanText(element.innerText || element.textContent)).filter(text => text.length >= 1 && text.length <= 100);
    Array.from(item.querySelectorAll('img[alt]')).map(image => cleanText(image.getAttribute('alt')))
      .filter(text => text && !/^(头像|用户头像|avatar)$/i.test(text)).forEach(text => values.push(text));
    return unique(values);
  }

  function isCommentNoise(text) {
    return !text || /^(回复|分享|举报|作者|置顶|展开\d*条回复|收起回复|\.\.\.|…|更多|\d+(?:\.\d+)?[万亿wWkK]?)$/.test(text)
      || /^\d+(?:天|小时|分钟|秒|月|年)前/.test(text);
  }

  function commentText(item) {
    const authors = new Set(commentAuthorTexts(item));
    const elements = Array.from(item.querySelectorAll([
      '[data-e2e*="comment-content"]', '[data-e2e*="comment-text"]', '[class*="comment-content"]',
      '[class*="CommentContent"]', '[class*="commentContent"]', '[class*="comment-text"]',
      '[class*="CommentText"]', 'p', 'span', 'div'
    ].join(',')));
    const candidates = elements.map(element => {
      let text = cleanText(element.innerText || element.textContent);
      for (const author of authors) {
        if (author && text.startsWith(author) && text !== author) text = cleanText(text.slice(author.length));
      }
      const signature = `${element.getAttribute('data-e2e') || ''} ${String(element.className || '')}`;
      const isAuthorNode = Boolean(element.closest('a[href*="/user/"]'))
        || /author|nickname|user[-_]?name|avatar/i.test(signature);
      const isMetaNode = /time|date|location|action|reply|share|like|digg/i.test(signature);
      const semantic = /comment[-_]?content|comment[-_]?text/i.test(signature) ? 1800 : 0;
      const leaf = element.children.length === 0 ? 250 : element.children.length <= 2 ? 80 : 0;
      return { text, score: semantic + leaf + Math.min(text.length, 700), usableShape: semantic > 0 || leaf > 0, isAuthorNode, isMetaNode };
    }).filter(candidate => candidate.text.length >= 2 && candidate.text.length <= 700
      && candidate.usableShape && !candidate.isAuthorNode && !candidate.isMetaNode
      && !authors.has(candidate.text) && !isCommentNoise(candidate.text));
    return candidates.sort((left, right) => right.score - left.score)[0]?.text || '';
  }

  function commentLikes(item) {
    const values = Array.from(item.querySelectorAll([
      '[data-e2e*="digg"]', '[data-e2e*="like"]', '[class*="digg"]', '[class*="Digg"]',
      '[class*="like"]', '[class*="Like"]', '[aria-label*="赞"]', '[title*="赞"]', 'p span'
    ].join(','))).flatMap(element => [element.innerText, element.textContent, element.getAttribute('aria-label'), element.getAttribute('title')])
      .filter(value => /^\s*\d+(?:\.\d+)?\s*[万亿wWkK]?\s*$/.test(String(value || '')) || /赞/.test(String(value || '')))
      .map(metricNumber).filter(Boolean);
    if (values.length) return Math.max(...values);
    const full = cleanText(item.innerText || item.textContent);
    return metricNumber(full.match(/(?:分享|点赞|赞)\s*([\d.]+\s*[万亿wWkK]?)/)?.[1]);
  }

  function collectTopComments() {
    const root = findCommentList();
    if (!root) return [];
    const seen = new Set();
    return commentItems(root).map(item => {
      const text = commentText(item).slice(0, 700);
      const likes = commentLikes(item);
      return { text, likes, stats: likes ? `${likes}赞` : '' };
    }).filter(item => item.text && !seen.has(item.text) && seen.add(item.text))
      .sort((left, right) => right.likes - left.likes).slice(0, 8);
  }

  function detailLeafTexts(root) {
    return Array.from(root?.querySelectorAll?.('span, div, p') || [])
      .filter(element => element.children.length === 0)
      .map(element => cleanText(element.textContent))
      .filter(text => text.length >= 2 && text.length <= 700);
  }

  function parseDetailCommentItem(item) {
    const author = commentAuthorTexts(item)[0] || '';
    const leaves = detailLeafTexts(item);
    const meta = leaves.find(text => /(?:分钟前|小时前|天前|月前|年前|\d{2}[-/.]\d{2}).*(?:·|IP|省|市|北京|上海|广东|浙江|江苏|四川|山东|河南|河北|湖北|湖南|安徽|福建|美国|海外)?/.test(text)) || '';
    const text = commentText(item);
    const likes = commentLikes(item);
    return text && text !== meta ? { text: text.slice(0, 700), likes, stats: likes ? `${likes}赞` : '', author, meta } : null;
  }

  async function collectCommentsFromDetailPage(source) {
    const mock = window.__tabbitDouyinInspirationTestComments?.[source.key];
    if (Array.isArray(mock)) return { comments: mock.slice(0, 8), status: 'mock', error: '' };
    if (!/^https?:.*\/(?:video|note)\//i.test(source.sourceUrl || '')) {
      return { comments: [], status: 'invalid_url', error: '作品详情链接不可用' };
    }
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;width:2px;height:2px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;border:0;';
    document.body.appendChild(iframe);
    try {
      await withTimeout(new Promise((resolve, reject) => {
        iframe.onload = resolve;
        iframe.onerror = () => reject(new Error('评论详情页加载失败'));
        iframe.src = source.sourceUrl;
      }), 15000, '评论详情页加载超时');
      const doc = iframe.contentDocument;
      if (!doc) throw new Error('无法读取评论详情页');
      await waitFor(() => doc.querySelector('[data-e2e="detail-video-info"]'), 10000, 220);
      Array.from(doc.querySelectorAll('video, audio')).forEach(media => {
        try { media.pause(); } catch (error) { /* no-op */ }
      });
      const comments = await waitFor(() => {
        const found = Array.from(doc.querySelectorAll('[data-e2e="comment-item"]'));
        if (!found.length) return null;
        const parsed = found.map(parseDetailCommentItem).filter(Boolean)
          .sort((left, right) => right.likes - left.likes).slice(0, 8);
        return parsed.length ? parsed : null;
      }, 12000, 300);
      if (comments?.length) await new Promise(resolve => setTimeout(resolve, 550));
      const hydrated = Array.from(doc.querySelectorAll('[data-e2e="comment-item"]'))
        .map(parseDetailCommentItem).filter(Boolean).sort((left, right) => right.likes - left.likes).slice(0, 8);
      const result = hydrated.length ? hydrated : Array.from(comments || []);
      return { comments: result, status: result.length ? 'detail_success' : 'detail_empty', error: '' };
    } catch (error) {
      return { comments: [], status: 'detail_failed', error: cleanText(error?.message || error) };
    } finally {
      iframe.src = 'about:blank';
      iframe.remove();
    }
  }

  function randomText(length, alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    const bytes = new Uint8Array(length);
    if (window.crypto?.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
    return Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
  }

  function repairMojibake(text) {
    const value = String(text || '');
    const suspicious = (value.match(/[\u0080-\u00ff]|[€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/g) || []).length;
    if (suspicious < 2) return value;
    try {
      const windows1252 = new Map(Array.from('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
        .map((char, index) => [char, [128, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 142, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 158, 159][index]]));
      const byteValues = Array.from(value, char => {
        const code = char.charCodeAt(0);
        if (code <= 255) return code;
        if (windows1252.has(char)) return windows1252.get(char);
        throw new Error('not windows-1252');
      });
      const bytes = Uint8Array.from(byteValues);
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      const before = (value.match(/[\u4e00-\u9fff]/g) || []).length;
      const after = (decoded.match(/[\u4e00-\u9fff]/g) || []).length;
      return after > before ? decoded : value;
    } catch (error) {
      return value;
    }
  }

  function douyinAiQuestion() {
    return [
      '请完整拆解当前视频，必须基于视频实际内容，不要给通用模板。',
      '按时间顺序说明：0-3秒开头钩子、逐段内容与时间点、节奏如何递进、爆点出现位置、画面与剪辑、字幕与声音、结尾引导。',
      '每项都引用具体画面、话术或时间点作为依据；无法确认的内容明确写“未识别”。'
    ].join('');
  }

  function buildDouyinAiStreamUrl(source, iframe) {
    if (!/^\d{8,}$/.test(source.key || '')) throw new Error('当前视频 ID 未识别，无法请求 AI抖音流式拆解');
    const frameUrl = new URL(iframe?.src || location.href, location.href);
    const params = new URLSearchParams({
      conversation_id: window.crypto?.randomUUID?.() || `${randomText(8)}-${randomText(4)}-${randomText(4)}-${randomText(4)}-${randomText(12)}`,
      pre_search_id: randomText(34),
      conversation_rank: '2',
      count: '5',
      cursor: '0',
      token: randomText(6, 'abcdefghijklmnopqrstuvwxyz'),
      ai_page_type: 'ai_chat',
      ai_search_enter_from_group_id: source.key,
      search_channel: 'aweme_ai_chat',
      enable_ai_tab_new_framework: '1',
      need_integration_card: '1',
      ai_chat_message_use_lynx: '1',
      version_code: '32.1.0',
      enter_method: 'ai_input',
      enter_from: 'search_result',
      search_type: 'ai_chat_search',
      aid: frameUrl.searchParams.get('aid') || '6383',
      keyword: douyinAiQuestion(),
      search_source: 'ai_input',
      enter_from_second: 'head_entry',
      pc_ai_search_enable_rich_media: '0',
      pc_ai_search_enable_ruyi: '1',
      enable_ai_search_deep_think: '0',
      client_server_extra: JSON.stringify({ ask_ai_client_config: JSON.stringify({ need_personal_summary: '' }) })
    });
    const deviceId = frameUrl.searchParams.get('device_id');
    if (deviceId) params.set('device_id', deviceId);
    return `https://so-landing.douyin.com/douyin/select/v1/ai/stream/?${params}`;
  }

  function appendDouyinAiEvent(groups, packet) {
    if (Number(packet?.status_code || 200) !== 200) {
      throw new Error(`AI抖音返回异常：${packet?.status_message || packet.status_code}`);
    }
    const items = Array.isArray(packet?.data) ? packet.data : [packet?.data].filter(Boolean);
    for (const item of items) {
      const id = cleanText(item?.args?.id || item?.key) || makeId('ai-card');
      if (!groups.has(id)) groups.set(id, { text: '', ended: false });
      const group = groups.get(id);
      const spans = item?.display?.display?.generation_spans;
      if (Array.isArray(spans)) {
        for (const span of spans) {
          const chunk = span?.text?.content;
          if (typeof chunk === 'string') group.text += chunk;
        }
      }
      if (item?.display?.display?.is_end === true) group.ended = true;
    }
  }

  async function requestDouyinAiBreakdown(source, iframe) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    const groups = new Map();
    let receivedBytes = 0;
    try {
      const response = await window.fetch(buildDouyinAiStreamUrl(source, iframe), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: 'text/event-stream' },
        signal: controller.signal
      });
      if (!response.ok || !response.body) throw new Error(`AI抖音请求失败：HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > 3500000) throw new Error('AI抖音返回内容过大，已停止读取');
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          try { appendDouyinAiEvent(groups, JSON.parse(line.slice(5))); } catch (error) {
            if (/AI抖音返回异常/.test(error?.message || '')) throw error;
          }
        }
      }
      buffer += decoder.decode();
      if (buffer.startsWith('data:')) {
        try { appendDouyinAiEvent(groups, JSON.parse(buffer.slice(5))); } catch (error) { /* incomplete tail */ }
      }
      const sections = Array.from(groups.values()).map(group => cleanMultilineText(repairMojibake(group.text)))
        .filter(text => text.length >= 60);
      const seen = new Set();
      const text = sections.filter(section => {
        const key = cleanText(section);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).join('\n\n').slice(0, 24000);
      if (!text) throw new Error('AI抖音没有返回可用的视频拆解文本');
      return text;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function collectNativeEvidence(source) {
    const evidence = { text: '', status: 'disabled', command: '', topComments: [] };
    if (!state.config.useNativeSummary) return evidence;
    const record = startAiRecord(source);
    await ensureDouyinDetailPanel(source);
    const commentTab = findDetailPanelTab('评论');
    if (commentTab) {
      clickElement(commentTab.closest('button, [role="button"], [role="tab"]') || commentTab);
      await waitFor(findCommentList, 8000, 200);
      await waitFor(() => collectTopComments().length, 3500, 250);
      evidence.topComments = collectTopComments();
    }
    let commentStatus = evidence.topComments.length ? 'panel_success' : 'panel_empty';
    let commentError = '';
    if (!evidence.topComments.length && metricNumber(source.metrics?.comments) > 0) {
      const detailComments = await collectCommentsFromDetailPage(source);
      evidence.topComments = detailComments.comments;
      commentStatus = detailComments.status;
      commentError = detailComments.error;
      if (evidence.topComments.length) {
        recordLog('info', '已从作品详情页读取高赞评论', {
          videoKey: source.key,
          commentsRead: evidence.topComments.length,
          source: detailComments.status
        });
      } else recordLog('warn', '页面显示有评论，但面板和详情页均未提取到评论文本', {
        videoKey: source.key,
        displayedComments: source.metrics.comments,
        commentPanelFound: Boolean(findCommentList()),
        detailStatus: detailComments.status,
        detailError: detailComments.error
      });
    }
    updateAiRecord(record, { comments: evidence.topComments, commentStatus, commentError });
    const iframe = await ensureDouyinAiPanel(source);
    try {
      evidence.text = await requestDouyinAiBreakdown(source, iframe);
      evidence.status = 'stream_success';
      evidence.command = 'AI抖音流式视频拆解';
      updateAiRecord(record, {
        response: evidence.text, status: 'success', mode: 'stream', completedAt: new Date().toISOString()
      });
      return evidence;
    } catch (error) {
      updateAiRecord(record, { status: iframe ? 'stream_failed' : 'panel_unavailable', error: cleanText(error?.message || error) });
      recordLog('warn', 'AI抖音流式拆解不可用，回退页面读取', {
        message: error?.message || String(error), videoKey: source.key
      });
    }
    if (!iframe) {
      updateAiRecord(record, { completedAt: new Date().toISOString() });
      return { ...evidence, status: 'panel_unavailable' };
    }
    let doc;
    try { doc = iframe.contentDocument; } catch (error) {
      updateAiRecord(record, { status: 'cross_origin', completedAt: new Date().toISOString() });
      return { ...evidence, status: 'cross_origin' };
    }
    if (!doc?.body) {
      updateAiRecord(record, { status: 'panel_unavailable', completedAt: new Date().toISOString() });
      return { ...evidence, status: 'panel_unavailable' };
    }
    const existing = readSummaryDocument(doc);
    const button = await waitFor(() => findExactVisible('视频拆解', doc) || findExactVisible('视频总结', doc), 3200);
    if (!button) {
      updateAiRecord(record, { status: 'button_unavailable', completedAt: new Date().toISOString() });
      return { ...evidence, status: 'button_unavailable' };
    }
    evidence.command = cleanText(button.textContent);
    clickElement(button.closest('button, [role="button"]') || button);
    const generated = await waitFor(() => {
      const text = readSummaryDocument(doc);
      return text && text !== existing && !/看到视频这一段|更多功能指令/.test(text) ? text : '';
    }, 22000, 350);
    evidence.text = cleanText(generated || '').slice(0, 14000);
    evidence.status = evidence.text ? 'page_success' : 'timeout';
    updateAiRecord(record, {
      response: evidence.text,
      status: evidence.text ? 'success' : 'timeout',
      mode: 'page',
      completedAt: new Date().toISOString()
    });
    return evidence;
  }

  function captureFrame(video, maxEdge = 640) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return '';
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    try {
      const context = canvas.getContext('2d', { alpha: false });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.64);
    } catch (error) {
      return '';
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  function extractCover(source) {
    const captured = captureFrame(source._video);
    if (captured) return captured;
    return Array.from(source._card?.querySelectorAll('img[src]') || [])
      .filter(isVisible).sort((left, right) => visibleArea(right) - visibleArea(left))
      .map(image => image.currentSrc || image.src).find(Boolean) || '';
  }

  function firstBalancedJson(text) {
    for (let start = 0; start < text.length; start += 1) {
      if (text[start] !== '{' && text[start] !== '[') continue;
      const stack = [];
      let inString = false;
      let escaped = false;
      for (let index = start; index < text.length; index += 1) {
        const char = text[index];
        if (inString) {
          if (escaped) escaped = false;
          else if (char === '\\') escaped = true;
          else if (char === '"') inString = false;
          continue;
        }
        if (char === '"') {
          inString = true;
          continue;
        }
        if (char === '{' || char === '[') stack.push(char);
        if (char === '}' || char === ']') {
          const expected = char === '}' ? '{' : '[';
          if (stack.pop() !== expected) break;
          if (!stack.length) {
            const candidate = text.slice(start, index + 1);
            try { return JSON.parse(candidate); } catch (error) { break; }
          }
        }
      }
    }
    return null;
  }

  function parseBridgeJson(value, stage = 'LLMBridge') {
    if (value && typeof value === 'object') {
      const looksLikeResult = value.classification || value.breakdown || value.angles
        || value.comment_insights || value.replication;
      if (looksLikeResult) return value;
      const wrapped = value.content ?? value.output_text ?? value.text ?? value.message?.content
        ?? value.choices?.[0]?.message?.content ?? value.data ?? value.result;
      if (wrapped != null && wrapped !== value) return parseBridgeJson(wrapped, stage);
      return value;
    }
    const original = String(value || '').replace(/^\uFEFF/, '').trim();
    const unfenced = original.replace(/^```(?:json)?\s*/i, '').replace(/\s*```[\s\S]*$/i, '').trim();
    for (const candidate of [unfenced, original]) {
      try { return JSON.parse(candidate); } catch (error) { /* try balanced extraction */ }
      const balanced = firstBalancedJson(candidate);
      if (balanced != null) return balanced;
    }
    const preview = cleanText(original).slice(0, 1200);
    recordLog('error', `${stage} JSON 解析失败`, { preview });
    throw new SyntaxError('AI 返回内容不是有效 JSON，原始返回已记录到“日志”页');
  }

  function withTimeout(promise, timeout, message) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error(message)), timeout))
    ]);
  }

  function defaultBreakdownBasis(source, key) {
    const basis = [];
    if (['cover', 'visual'].includes(key) && source.cover) basis.push('当前画面');
    if (key === 'comments' && source.topComments?.length) basis.push('高赞评论');
    if (source.douyinAiText) basis.push(source.douyinAiStatus === 'stream_success' ? 'AI抖音完整视频拆解' : 'AI抖音页面内容');
    if (source.transcript) basis.push('页面字幕');
    if (!basis.length) basis.push('标题与页面文案');
    return unique(basis);
  }

  function defaultBreakdownConfidence(source, key) {
    if (key === 'comments') return source.topComments?.length ? '高' : '低';
    if (['cover', 'visual'].includes(key)) return source.cover ? '中' : '低';
    if (source.douyinAiStatus === 'stream_success') return '高';
    if (source.douyinAiText || source.transcript) return '中';
    return '低';
  }

  function normalizeBreakdown(value, fallbackTitle, source, key) {
    const rawBasis = value?.basis || value?.evidence_source || value?.sources;
    const basis = unique(Array.isArray(rawBasis) ? rawBasis : cleanText(rawBasis).split(/[、,，;；]/))
      .filter(item => !/AI抖音/.test(item) || source.douyinAiText).slice(0, 5);
    const confidence = cleanText(value?.confidence || value?.certainty);
    if (typeof value === 'string') return {
      title: fallbackTitle, summary: cleanText(value), evidence: '', timestamp: '',
      basis: defaultBreakdownBasis(source, key), confidence: defaultBreakdownConfidence(source, key)
    };
    const evidenceConfidence = defaultBreakdownConfidence(source, key);
    const requestedConfidence = ['高', '中', '低'].includes(confidence) ? confidence : evidenceConfidence;
    const confidenceRank = { 低: 0, 中: 1, 高: 2 };
    const calibratedConfidence = confidenceRank[requestedConfidence] <= confidenceRank[evidenceConfidence]
      ? requestedConfidence : evidenceConfidence;
    return {
      title: cleanText(value?.title) || fallbackTitle,
      summary: cleanText(value?.summary || value?.analysis || value?.insight)
        || '现有画面、字幕和抖音 AI 证据不足，暂未形成可靠判断。',
      evidence: cleanText(value?.evidence || value?.quote || value?.wording),
      timestamp: cleanText(value?.timestamp || value?.position || value?.time),
      basis: basis.length ? basis : defaultBreakdownBasis(source, key),
      confidence: calibratedConfidence
    };
  }

  function breakdownValue(rawBreakdown, key, label) {
    if (!rawBreakdown) return null;
    const aliases = DIMENSION_ALIASES[key] || [key, label];
    if (Array.isArray(rawBreakdown)) {
      return rawBreakdown.find(item => {
        const name = cleanText(item?.key || item?.name || item?.title || item?.dimension).toLowerCase();
        return aliases.some(alias => name.includes(alias.toLowerCase()));
      }) || null;
    }
    if (typeof rawBreakdown === 'string') return key === 'structure' ? rawBreakdown : null;
    for (const [candidate, value] of Object.entries(rawBreakdown)) {
      const normalized = cleanText(candidate).toLowerCase();
      if (aliases.some(alias => normalized === alias.toLowerCase() || normalized.includes(alias.toLowerCase()))) return value;
    }
    return null;
  }

  function normalizeAngles(value) {
    const rawAngles = Array.isArray(value) ? value : [];
    return rawAngles.map((angle, index) => typeof angle === 'string'
      ? { title: `角度 ${index + 1}`, idea: cleanText(angle), reason: '' }
      : {
          title: cleanText(angle?.title || angle?.name) || `角度 ${index + 1}`,
          idea: cleanText(angle?.idea || angle?.approach || angle?.summary || angle?.content),
          reason: cleanText(angle?.reason || angle?.fit || angle?.why)
        }).filter(angle => angle.idea).slice(0, 8);
  }

  function timeTokenSeconds(value) {
    const text = String(value ?? '').replace(/\s+/g, '').replace(/：/g, ':');
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(text)) {
      return text.split(':').map(Number).reduce((total, part) => total * 60 + part, 0);
    }
    const minute = text.match(/^(\d+)分(?:(\d+)秒?)?$/);
    if (minute) return Number(minute[1]) * 60 + Number(minute[2] || 0);
    const second = text.match(/^(\d+)(?:秒)?$/);
    return second ? Number(second[1]) : NaN;
  }

  function formatClock(value) {
    const seconds = Math.max(0, Math.round(Number(value) || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const rest = seconds % 60;
    return hours
      ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
      : `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
  }

  function parseTimeRanges(value) {
    const text = cleanText(value).replace(/[—–~～至]/g, '-').replace(/：/g, ':');
    if (!text) return [];
    const token = '(?:\\d{1,2}:\\d{2}(?::\\d{2})?|\\d+分(?:\\d+秒?)?|\\d+秒|\\d+)';
    const matcher = new RegExp(`(${token})\\s*-\\s*(${token})`, 'g');
    const ranges = [];
    for (const match of text.matchAll(matcher)) {
      const start = timeTokenSeconds(match[1]);
      const end = timeTokenSeconds(match[2]);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) ranges.push({ start, end });
    }
    return ranges.filter((range, index) => !ranges.slice(0, index)
      .some(previous => previous.start === range.start && previous.end === range.end)).slice(0, 12);
  }

  function extractTimelineFromDouyinAi(value) {
    const text = String(value || '').replace(/：/g, ':');
    if (!text) return [];
    const matcher = /\|{1,2}\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–~-]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*\|/g;
    const matches = Array.from(text.matchAll(matcher));
    return matches.map((match, index) => {
      const body = text.slice(match.index + match[0].length, matches[index + 1]?.index ?? text.length)
        .replace(/^\|+|\|+$/g, '');
      const cells = body.split(/\s*\|\s*/).map(cleanText).filter(Boolean);
      const rhythmParts = cleanText(cells[2]).split(/[，,；;]/).map(cleanText).filter(Boolean);
      const segmentFunction = cleanText(cells[3]) || rhythmParts.slice(1).join('，');
      return {
        start: match[1], end: match[2], title: segmentFunction || `片段 ${index + 1}`,
        visual: cleanText(cells[0]), copy: cleanText(cells[1]), rhythm: rhythmParts[0] || cleanText(cells[2]),
        function: segmentFunction, evidence: 'AI抖音逐段内容与时间点'
      };
    }).filter(item => item.visual || item.copy || item.function).slice(0, 20);
  }

  function normalizeTimeline(value, source) {
    const input = Array.isArray(value) && value.length ? value : extractTimelineFromDouyinAi(source.douyinAiText);
    return input.map((item, index) => {
      const rangeText = cleanText(item?.range || item?.time_range || item?.timestamp || item?.time);
      const range = parseTimeRanges(rangeText)[0];
      const parsedStart = timeTokenSeconds(item?.start || item?.start_time || '');
      const parsedEnd = timeTokenSeconds(item?.end || item?.end_time || '');
      const start = item?.start_seconds != null && Number.isFinite(Number(item.start_seconds)) ? Number(item.start_seconds)
        : Number.isFinite(parsedStart) ? parsedStart : range?.start;
      const end = item?.end_seconds != null && Number.isFinite(Number(item.end_seconds)) ? Number(item.end_seconds)
        : Number.isFinite(parsedEnd) ? parsedEnd : range?.end;
      return {
        start: Number.isFinite(start) ? start : null,
        end: Number.isFinite(end) ? end : null,
        title: cleanText(item?.title || item?.stage || item?.function) || `片段 ${index + 1}`,
        visual: cleanText(item?.visual || item?.picture || item?.scene || item?.content),
        copy: cleanText(item?.copy || item?.speech || item?.subtitle || item?.wording),
        rhythm: cleanText(item?.rhythm || item?.pace),
        function: cleanText(item?.function || item?.purpose || item?.role),
        evidence: cleanText(item?.evidence || item?.basis) || (source.douyinAiText ? 'AI抖音逐段内容与时间点' : '页面字幕')
      };
    }).filter(item => Number.isFinite(item.start) && Number.isFinite(item.end) && item.end > item.start
      && (item.visual || item.copy || item.function)).sort((left, right) => left.start - right.start).slice(0, 20);
  }

  function normalizeResult(raw, source, profile) {
    const classification = raw?.classification || raw?.content || {};
    const breakdown = {};
    for (const [key, label] of DIMENSIONS) {
      if (profile.dimensions.includes(key)) breakdown[key] = normalizeBreakdown(
        breakdownValue(raw?.breakdown || raw?.video_breakdown || raw?.analysis, key, label), label, source, key
      );
    }
    const commentInsights = raw?.comment_insights || raw?.commentInsights || {};
    const replication = raw?.replication || raw?.replication_guide || raw?.reuse || {};
    return {
      version: ANALYSIS_VERSION,
      classification: {
        type: cleanText(classification.type || classification.category) || '内容案例',
        sellingPoint: cleanText(classification.selling_point || classification.sellingPoint),
        summary: cleanText(classification.summary || classification.one_liner || raw?.summary) || source.title.slice(0, 120)
      },
      transcriptSummary: cleanText(raw?.transcript_summary || raw?.content_summary),
      timeline: normalizeTimeline(raw?.timeline || raw?.segments || raw?.content_timeline, source),
      breakdown,
      angles: normalizeAngles(raw?.angles || raw?.topic_angles || raw?.ideas),
      tags: unique(raw?.tags || raw?.recommended_tags).slice(0, 5),
      commentInsights: {
        consensus: cleanText(commentInsights.consensus || commentInsights.common_view),
        controversy: cleanText(commentInsights.controversy || commentInsights.disagreement),
        questions: unique(commentInsights.questions || commentInsights.audience_questions).slice(0, 5),
        languageHooks: unique(commentInsights.language_hooks || commentInsights.phrases).slice(0, 5)
      },
      replication: {
        formula: cleanText(replication.formula || replication.template),
        outline: unique(replication.outline || replication.script_outline || replication.steps).slice(0, 8),
        avoid: unique(replication.avoid || replication.risks || replication.pitfalls).slice(0, 6)
      },
      chatHistory: Array.isArray(raw?.chatHistory) ? raw.chatHistory.slice(-12) : [],
      source: { ...source, _card: undefined, _video: undefined },
      profile: { ...profile },
      analyzedAt: new Date().toISOString()
    };
  }

  function localFallback(source, profile) {
    const tags = unique([...source.hashtags.map(tag => tag.replace(/^#/, '')), profile.track, '待完善']).slice(0, 5);
    return normalizeResult({
      classification: { type: '待 AI 完善', selling_point: '已完成页面内容提取', summary: source.title },
      transcript_summary: source.transcript || source.visibleInfo,
      breakdown: Object.fromEntries(DIMENSIONS.map(([key, label]) => [key, {
        title: label, summary: source.douyinAiText
          ? `已获取抖音 AI 证据，但当前环境没有 LLMBridge，暂不能完成“${label}”的结构化转换。`
          : '当前环境没有 LLMBridge，已保留素材，注入 Tabbit 后可重新分析。'
      }])),
      angles: [{ title: '原题复用', idea: `围绕“${source.title.slice(0, 60)}”结合 ${profile.track || '你的赛道'} 重新表达` }],
      tags
    }, source, profile);
  }

  async function callAnalysis(source, profile, frame) {
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') return localFallback(source, profile);
    const requested = DIMENSIONS.filter(([key]) => profile.dimensions.includes(key)).map(([, label]) => label);
    const payload = {
      account_track: profile.track,
      audience: profile.audience,
      requested_dimensions: requested,
      extra_requirement: profile.extra,
      video: {
        title: source.title,
        author: source.author,
        published_at: source.publishedAt,
        url: source.sourceUrl,
        hashtags: source.hashtags,
        duration_seconds: source.durationSeconds,
        metrics: source.metrics,
        cover_available: Boolean(source.cover),
        visible_info: source.visibleInfo,
        page_transcript: source.transcript,
        douyin_ai_status: source.douyinAiStatus,
        douyin_ai_command: source.douyinAiCommand,
        douyin_ai_breakdown_or_summary: source.douyinAiText,
        high_like_comments: source.topComments
      }
    };
    const prompt = [
      '你是短视频选题主编。请拆解当前这一条抖音视频，并把它转化为适合指定账号的拍摄灵感。',
      '将当前画面、页面字幕、抖音 AI 的视频拆解/总结、高赞评论视为不同证据源，交叉验证后输出。抖音 AI 文本即使格式自由也要适配提取，不要机械返回空字段。',
      '不得编造时间点、原话、互动数据。确实没有证据时可说明缺失，但要基于已有画面或标题给出可执行的观察。',
      `输出这些拆解维度：${requested.join('、') || '无'}。每个维度都必须有非空 summary，并尽量给 evidence、timestamp；没有可靠时间点时 timestamp 为空。`,
      '节奏递进、内容结构和爆点位置必须优先依据 AI抖音完整视频拆解里的时间顺序；只有页面总结而没有时间线时降低 confidence，不得把通用短视频模板当作原视频事实。',
      '每个维度额外返回 basis（实际使用的证据源数组）和 confidence（高/中/低）。confidence 为低时，summary 必须明确指出不确定性。',
      '封面标题要分析画面主体、文字、视觉冲突和点击理由；内容结构要给段落推进；评论反馈要提炼共识、争议、问题和用户原话钩子；可复用公式要形成可套用模板。',
      '必须额外输出 timeline 数组，把 AI抖音中的“逐段内容与时间点”原样结构化。每段包含 start、end、title、visual、copy、rhythm、function、evidence；start/end 使用 MM:SS。只保留有明确时间依据的片段，不得补造。',
      '选题角度至少 5 个，每个角度写 title、idea、reason，并针对账号赛道和粉丝画像，不能只是改写原标题。',
      '推荐 3 至 5 个短标签用于灵感库自动归类。',
      '额外输出 comment_insights 和 replication，便于后续拍摄。',
      '返回严格 JSON，不要 Markdown。结构：',
      '{"classification":{"type":"内容类型","selling_point":"核心卖点","summary":"一句话内容定性"},"transcript_summary":"完整内容摘要","timeline":[{"start":"00:00","end":"00:03","title":"开头钩子","visual":"具体画面","copy":"话术或字幕","rhythm":"节奏描述","function":"叙事功能","evidence":"AI抖音逐段拆解"}],"breakdown":{"cover":{"title":"封面类型","summary":"关键结论","evidence":"具体画面或话术","timestamp":"","basis":["AI抖音完整视频拆解"],"confidence":"高"},"hook":{},"structure":{},"rhythm":{},"highlight":{},"emotion":{},"visual":{},"audio":{},"comments":{},"ending":{},"formula":{}},"comment_insights":{"consensus":"共识","controversy":"争议","questions":["问题"],"language_hooks":["评论原话钩子"]},"replication":{"formula":"可套用公式","outline":["脚本步骤"],"avoid":["避坑"]},"angles":[{"title":"角度名","idea":"一句话拍法","reason":"适配原因"}],"tags":["标签"]}',
      `输入数据：${JSON.stringify(payload)}`
    ].join('\n');
    const options = frame
      ? { response_format: 'json', images: [frame] }
      : { response_format: 'json' };
    const response = await withTimeout(
      window.LLMBridge.chat(prompt, options),
      state.config.llmTimeoutMs,
      '视频拆解超时'
    );
    return normalizeResult(parseBridgeJson(response, '视频拆解'), source, profile);
  }

  async function analyzeCurrent(options = {}) {
    if (state.running) return;
    const force = options === true || options?.force === true;
    const visibleKey = detectCurrentVideoKey();
    if (!force && visibleKey && restoreCachedResult(visibleKey)) {
      state.activeVideoKey = visibleKey;
      state.activeTab = 'analyze';
      render();
      toast('已恢复这条视频之前的拆解', 'success');
      return;
    }
    state.running = true;
    state.result = null;
    state.source = null;
    render();
    let feedback = null;
    try {
      setProgress('正在读取当前视频…', 18);
      const source = extractCurrentVideo();
      const analysisVideoKey = source.key;
      state.activeVideoKey = analysisVideoKey;
      state.source = source;
      const frame = extractCover(source);
      source.cover = frame;
      if (state.config.useNativeSummary) {
        setProgress('正在读取字幕、高赞评论和 AI抖音拆解…', 38);
        const evidence = await collectNativeEvidence(source);
        state.summaryStatus = evidence.status;
        source.douyinAiText = evidence.text;
        source.douyinAiStatus = evidence.status;
        source.douyinAiCommand = evidence.command;
        source.topComments = evidence.topComments;
        if (!evidence.text && !['stream_success', 'page_success', 'disabled'].includes(evidence.status)) {
          const unavailableReason = evidence.status === 'panel_unavailable'
            ? '没有打开 AI抖音面板，且流式请求未获得结果'
            : `AI抖音取证状态：${evidence.status}`;
          recordLog('warn', 'AI抖音视频证据未获取，已使用页面信息降级分析', {
            status: evidence.status,
            meaning: unavailableReason,
            videoKey: analysisVideoKey,
            commentsRead: evidence.topComments.length
          });
        }
      }
      const keyBeforeAnalysis = detectCurrentVideoKey();
      if (keyBeforeAnalysis && keyBeforeAnalysis !== analysisVideoKey) {
        throw new Error('视频已切换，已停止上一个视频的分析，请重新点击拆解');
      }
      setProgress('AI 正在拆解结构并生成选题角度…', 68);
      const result = await callAnalysis(source, activeProfile(), frame);
      const keyAfterAnalysis = detectCurrentVideoKey();
      if (keyAfterAnalysis && keyAfterAnalysis !== analysisVideoKey) {
        throw new Error('视频已切换，已丢弃上一个视频的分析结果，请重新点击拆解');
      }
      state.result = result;
      cacheResult(result);
      state.activeTab = 'analyze';
      feedback = ['当前视频拆解完成', 'success'];
    } catch (error) {
      const message = cleanText(error?.message || error) || '分析失败';
      const currentKey = detectCurrentVideoKey();
      if (/视频已切换/.test(message) && currentKey) {
        state.activeVideoKey = currentKey;
        restoreCachedResult(currentKey);
      } else {
        state.source = null;
        state.result = null;
      }
      recordLog(/视频已切换/.test(message) ? 'warn' : 'error', /视频已切换/.test(message) ? '视频切换，中止旧分析' : '视频拆解失败', {
        message,
        stack: error?.stack,
        videoKey: currentKey || state.activeVideoKey,
        summaryStatus: state.summaryStatus
      });
      if (!/视频已切换/.test(message)) console.error('[Tabbit Douyin Inspiration]', error);
      feedback = [message, /视频已切换/.test(message) ? 'warning' : 'error'];
    } finally {
      state.running = false;
      render();
      if (feedback) toast(...feedback);
    }
  }

  async function refineTopics() {
    if (!state.result || state.running || state.refining) return;
    const input = state.root?.querySelector('[data-chat-input]');
    const instruction = cleanText(input?.value);
    if (!instruction) {
      toast('先输入你想怎么调整选题', 'warning');
      return;
    }
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') {
      toast('当前环境没有 LLMBridge，无法微调', 'error');
      return;
    }
    state.refining = true;
    state.result.chatHistory = [...(state.result.chatHistory || []), { role: 'user', text: instruction }].slice(-12);
    render();
    let feedback = null;
    try {
      const resultForPrompt = {
        classification: state.result.classification,
        transcriptSummary: state.result.transcriptSummary,
        breakdown: state.result.breakdown,
        commentInsights: state.result.commentInsights,
        replication: state.result.replication,
        angles: state.result.angles,
        tags: state.result.tags
      };
      const prompt = [
        '你是短视频选题编辑，正在对已经完成的视频拆解进行对话式微调。',
        '根据用户要求调整选题角度；保留与要求不冲突的优点。不要改写或虚构原视频证据。',
        '至少输出 5 个可拍角度，每个包含 title、idea、reason。可以同时更新内容定性、推荐标签和复用方案。',
        'reply 用一句简短中文说明这次具体改了什么。返回严格 JSON，不要 Markdown。',
        '{"reply":"调整说明","classification":{"type":"可选","selling_point":"可选","summary":"可选"},"angles":[{"title":"角度名","idea":"具体拍法","reason":"适配理由"}],"tags":["标签"],"replication":{"formula":"公式","outline":["步骤"],"avoid":["避坑"]}}',
        `账号配置：${JSON.stringify(state.result.profile)}`,
        `现有拆解：${JSON.stringify(resultForPrompt)}`,
        `用户要求：${instruction}`
      ].join('\n');
      const raw = parseBridgeJson(await withTimeout(
        window.LLMBridge.chat(prompt, { response_format: 'json' }), state.config.llmTimeoutMs, '选题微调超时'
      ), '选题微调');
      const nextAngles = normalizeAngles(raw?.angles || raw?.topic_angles || raw?.ideas);
      if (nextAngles.length) state.result.angles = nextAngles;
      const nextTags = unique(raw?.tags || raw?.recommended_tags).slice(0, 5);
      if (nextTags.length) state.result.tags = nextTags;
      if (raw?.classification) {
        state.result.classification = {
          type: cleanText(raw.classification.type) || state.result.classification.type,
          sellingPoint: cleanText(raw.classification.selling_point || raw.classification.sellingPoint) || state.result.classification.sellingPoint,
          summary: cleanText(raw.classification.summary) || state.result.classification.summary
        };
      }
      if (raw?.replication) {
        state.result.replication = {
          formula: cleanText(raw.replication.formula || raw.replication.template) || state.result.replication?.formula,
          outline: unique(raw.replication.outline || raw.replication.script_outline || state.result.replication?.outline).slice(0, 8),
          avoid: unique(raw.replication.avoid || raw.replication.risks || state.result.replication?.avoid).slice(0, 6)
        };
      }
      const reply = cleanText(raw?.reply) || `已按“${instruction.slice(0, 36)}”调整选题角度。`;
      state.result.chatHistory = [...state.result.chatHistory, { role: 'assistant', text: reply }].slice(-12);
      state.result.refinedAt = new Date().toISOString();
      cacheResult(state.result);
      const index = duplicateIndex(state.result);
      if (index >= 0) {
        const primary = state.result.angles[0];
        Object.assign(state.library[index], {
          title: primary?.title || state.library[index].title,
          angleSummary: primary?.idea || state.library[index].angleSummary,
          tags: [...state.result.tags],
          cover: state.result.source.cover || state.library[index].cover,
          result: JSON.parse(JSON.stringify(state.result))
        });
        saveLibrary();
      }
      feedback = ['选题已微调并保存到缓存', 'success'];
    } catch (error) {
      state.result.chatHistory = state.result.chatHistory.filter((message, index, values) =>
        !(index === values.length - 1 && message.role === 'user' && message.text === instruction));
      recordLog('error', '选题微调失败', {
        message: error?.message || String(error),
        stack: error?.stack,
        videoKey: state.result?.source?.key
      });
      console.error('[Tabbit Douyin Inspiration]', error);
      feedback = [cleanText(error?.message || error) || '选题微调失败', 'error'];
    } finally {
      state.refining = false;
      render();
      if (feedback) toast(...feedback);
    }
  }

  function duplicateIndex(result = state.result) {
    if (!result?.source) return -1;
    const stableUrl = /(?:\/video\/|[?&]aweme_id=)\d{8,}/.test(result.source.sourceUrl || '');
    return state.library.findIndex(item => item.sourceKey === result.source.key
      || (stableUrl && item.sourceUrl === result.source.sourceUrl));
  }

  function collectResult() {
    if (!state.result) return;
    const existing = duplicateIndex();
    if (existing >= 0) {
      state.activeTab = 'library';
      state.libraryDetailId = state.library[existing]?.id || '';
      render();
      toast('这条视频已经在灵感库中', 'warning');
      return;
    }
    const primary = state.result.angles[0];
    state.library.unshift({
      id: makeId('idea'),
      sourceKey: state.result.source.key,
      title: primary?.title || state.result.source.title,
      angleSummary: primary?.idea || state.result.classification.summary,
      author: state.result.source.author,
      sourceUrl: state.result.source.sourceUrl,
      cover: state.result.source.cover,
      tags: [...state.result.tags],
      status: 'todo',
      note: '',
      savedAt: new Date().toISOString(),
      result: JSON.parse(JSON.stringify(state.result))
    });
    saveLibrary();
    state.activeTab = 'library';
    state.libraryDetailId = '';
    render();
    toast('已收藏到灵感库', 'success');
  }

  function updateLibraryItem(id, patch) {
    const item = state.library.find(candidate => candidate.id === id);
    if (!item) return;
    Object.assign(item, patch);
    saveLibrary();
    renderLibraryOnly();
  }

  function removeLibraryItem(id) {
    const item = state.library.find(candidate => candidate.id === id);
    if (!item || !window.confirm(`从灵感库移除“${item.title}”？`)) return;
    state.library = state.library.filter(candidate => candidate.id !== id);
    if (state.libraryDetailId === id) state.libraryDetailId = '';
    saveLibrary();
    renderLibraryOnly();
    toast('已从灵感库移除', 'success');
  }

  function filteredLibrary() {
    const query = state.filters.query.toLowerCase();
    return state.library.filter(item => {
      const haystack = `${item.title} ${item.angleSummary} ${item.author} ${item.tags.join(' ')} ${item.note}`.toLowerCase();
      return (!query || haystack.includes(query))
        && (!state.filters.tag || item.tags.includes(state.filters.tag))
        && (!state.filters.status || item.status === state.filters.status);
    });
  }

  function weekStart(date = new Date()) {
    const result = new Date(date);
    const day = result.getDay() || 7;
    result.setHours(0, 0, 0, 0);
    result.setDate(result.getDate() - day + 1);
    return result;
  }

  function libraryStats() {
    const start = weekStart();
    const weekly = state.library.filter(item => new Date(item.savedAt) >= start);
    return {
      weekly: weekly.length,
      todo: state.library.filter(item => item.status === 'todo').length,
      done: state.library.filter(item => item.status === 'done').length,
      discarded: state.library.filter(item => item.status === 'discarded').length
    };
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function exportLibrary() {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`抖音灵感库-${stamp}.json`, JSON.stringify(state.library, null, 2), 'application/json;charset=utf-8');
  }

  function logsAsText() {
    return state.logs.map(item => [
      `[${new Date(item.at).toLocaleString('zh-CN')}] [${item.level.toUpperCase()}] ${item.message}`,
      item.detail
    ].filter(Boolean).join('\n')).join('\n\n');
  }

  async function copyLogs() {
    const content = logsAsText();
    if (!content) {
      toast('当前没有日志', 'warning');
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      toast('日志已复制', 'success');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = content;
      textarea.style.cssText = 'position:fixed;left:-9999px;top:0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (copied) toast('日志已复制', 'success');
      else {
        recordLog('error', '复制日志失败', error);
        toast('复制失败，请手动选择日志内容', 'error');
      }
    }
  }

  function clearLogs() {
    state.logs = [];
    try { localStorage.removeItem(LOG_KEY); } catch (error) { /* no-op */ }
    render();
    toast('日志已清空', 'success');
  }

  function aiRecordText(record) {
    return [
      `视频：${record.title}`,
      `视频 ID：${record.videoKey}`,
      `状态：${record.status} / ${record.mode || 'unknown'}`,
      `评论采集：${record.commentStatus || 'unknown'}${record.commentError ? `（${record.commentError}）` : ''}`,
      `提问：${record.question}`,
      `AI抖音回答：\n${record.response || record.error || '未获得回答'}`,
      record.transcript ? `页面字幕：\n${record.transcript}` : '',
      record.comments?.length ? `高赞评论：\n${record.comments.map(item => `${item.likes || 0}赞 · ${item.text}`).join('\n')}` : ''
    ].filter(Boolean).join('\n\n');
  }

  async function copyAiRecord(id) {
    const record = state.aiRecords.find(item => item.id === id);
    if (!record) return;
    try {
      await navigator.clipboard.writeText(aiRecordText(record));
      toast('AI对话记录已复制', 'success');
    } catch (error) {
      recordLog('error', '复制 AI 对话记录失败', error);
      toast('复制失败', 'error');
    }
  }

  function clearAiRecords() {
    state.aiRecords = [];
    try { localStorage.removeItem(AI_RECORD_KEY); } catch (error) { /* no-op */ }
    render();
    toast('AI对话记录已清空', 'success');
  }

  function selectedProfileFromForm() {
    const root = state.root;
    return normalizeProfile({
      id: root.querySelector('[data-profile-id]')?.value || activeProfile().id,
      name: root.querySelector('[data-profile-name]')?.value || activeProfile().name || '默认配置',
      track: root.querySelector('[data-profile-track]')?.value,
      audience: root.querySelector('[data-profile-audience]')?.value,
      dimensions: DIMENSIONS.filter(([key]) => root.querySelector(`[data-dimension="${key}"]`)?.checked).map(([key]) => key),
      extra: root.querySelector('[data-profile-extra]')?.value
    });
  }

  function saveProfileFromForm() {
    const profile = selectedProfileFromForm();
    const index = state.config.profiles.findIndex(item => item.id === profile.id);
    if (index >= 0) state.config.profiles[index] = profile;
    else state.config.profiles.push(profile);
    state.config.activeProfileId = profile.id;
    state.config.useNativeSummary = Boolean(state.root.querySelector('[data-native-summary]')?.checked);
    saveConfig();
    render();
    toast('配置已保存', 'success');
  }

  function statusLabel(value) {
    return { todo: '待拍', done: '已拍', discarded: '弃用' }[value] || '待拍';
  }

  function renderSource(source) {
    if (!source) return '';
    const aiLabel = source.douyinAiStatus === 'stream_success'
      ? ' · AI抖音完整拆解'
      : source.douyinAiText ? ' · AI抖音页面内容' : ' · 基础证据';
    const metrics = Object.entries(source.metrics || {}).filter(([, value]) => value)
      .map(([key, value]) => `<span>${escapeHtml({ likes: '赞', comments: '评', favorites: '藏', shares: '享' }[key])} ${escapeHtml(value)}</span>`).join('');
    return `<div class="source-card">${source.cover ? `<img class="source-cover" src="${escapeHtml(source.cover)}" alt="视频封面">` : ''}<div class="source-copy">
      <div class="source-kicker">当前素材${aiLabel}${state.cache[source.key] ? ' · 已缓存' : ''}</div>
      <div class="source-title">${escapeHtml(source.title)}</div>
      <div class="source-meta">${escapeHtml(source.author || '作者未识别')}${source.publishedAt ? ` · ${escapeHtml(source.publishedAt)}` : ''}</div>
      <div class="metrics">${metrics || '<span>页面暂无互动数据</span>'}</div></div>
    </div>`;
  }

  function renderCommentInsights(result) {
    const insights = result.commentInsights || {};
    const sourceComments = result.source?.topComments || [];
    if (!insights.consensus && !insights.controversy && !insights.questions?.length && !sourceComments.length) return '';
    return `<section><h3>高赞评论洞察 <span>${sourceComments.length}</span></h3><div class="insight-box">
      ${insights.consensus ? `<p><b>共识</b>${escapeHtml(insights.consensus)}</p>` : ''}
      ${insights.controversy ? `<p><b>争议</b>${escapeHtml(insights.controversy)}</p>` : ''}
      ${insights.questions?.length ? `<p><b>问题</b>${escapeHtml(insights.questions.join('；'))}</p>` : ''}
      ${insights.languageHooks?.length ? `<div class="tag-list small">${insights.languageHooks.map(text => `<span class="tag">${escapeHtml(text)}</span>`).join('')}</div>` : ''}
      ${sourceComments.length ? `<div class="comment-samples"><h4>实际读取的高赞评论</h4>${sourceComments.slice(0, 8).map(item => `<div><b>${escapeHtml(item.likes || 0)}赞</b><p>${escapeHtml(item.text)}</p></div>`).join('')}</div>` : ''}
    </div></section>`;
  }

  function renderReplication(result) {
    const replication = result.replication || {};
    if (!replication.formula && !replication.outline?.length && !replication.avoid?.length) return '';
    return `<section><h3>复刻执行方案</h3><div class="replication">
      ${replication.formula ? `<p class="formula">${escapeHtml(replication.formula)}</p>` : ''}
      ${replication.outline?.length ? `<ol>${replication.outline.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol>` : ''}
      ${replication.avoid?.length ? `<p class="avoid"><b>避坑：</b>${escapeHtml(replication.avoid.join('；'))}</p>` : ''}
    </div></section>`;
  }

  function renderTopicChat(result) {
    const messages = (result.chatHistory || []).map(message => `<div class="chat-message ${message.role === 'user' ? 'user' : 'assistant'}"><b>${message.role === 'user' ? '你' : '选题助手'}</b><p>${escapeHtml(message.text)}</p></div>`).join('');
    return `<section class="topic-chat"><h3>选题微调</h3><p class="muted">直接说你的限制或方向，例如“改成适合知识博主、预算 500 元以内”。</p>
      ${messages ? `<div class="chat-history">${messages}</div>` : ''}
      <textarea data-chat-input placeholder="输入微调要求…" ${state.refining ? 'disabled' : ''}></textarea>
      <button class="primary wide" data-action="refine" ${state.refining ? 'disabled' : ''}>${state.refining ? '正在调整…' : '发送并更新选题'}</button>
    </section>`;
  }

  function renderTimePosition(value, videoKey = '') {
    const ranges = parseTimeRanges(value);
    if (!ranges.length) return `<span class="raw-time">${escapeHtml(value)}</span>`;
    return `<div class="time-chips">${ranges.map(range => `<button data-action="seek-video" data-video-key="${escapeHtml(videoKey)}" data-seek-seconds="${range.start}" title="跳到 ${formatClock(range.start)}"><span>▶</span>${formatClock(range.start)}<i>—</i>${formatClock(range.end)}</button>`).join('')}</div>`;
  }

  function renderTimeline(result) {
    const timeline = result?.timeline || [];
    if (!timeline.length) return '';
    const items = timeline.map((item, index) => `<details class="timeline-item" ${index === 0 ? 'open' : ''}>
      <summary><button data-action="seek-video" data-video-key="${escapeHtml(result.source?.key || '')}" data-seek-seconds="${item.start}" title="从 ${formatClock(item.start)} 播放"><span>▶</span>${formatClock(item.start)}<i>—</i>${formatClock(item.end)}</button><div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.visual || item.copy || item.function)}</p></div></summary>
      <div class="timeline-detail">
        ${item.visual ? `<p><strong>画面</strong>${escapeHtml(item.visual)}</p>` : ''}
        ${item.copy ? `<blockquote>${escapeHtml(item.copy)}</blockquote>` : ''}
        <div class="timeline-tags">${item.rhythm ? `<span>节奏 · ${escapeHtml(item.rhythm)}</span>` : ''}${item.function && item.function !== item.title ? `<span>作用 · ${escapeHtml(item.function)}</span>` : ''}${item.evidence ? `<span>依据 · ${escapeHtml(item.evidence)}</span>` : ''}</div>
      </div>
    </details>`).join('');
    return `<section class="timeline-section"><div class="section-title"><h3>逐段内容与时间点 <span>${timeline.length}</span></h3><div><button class="detail-link" data-action="expand-timeline">展开全部</button><button class="detail-link" data-action="collapse-timeline">收起全部</button></div></div><p class="timeline-tip">点击时间可跳到原视频对应位置</p><div class="timeline-list">${items}</div></section>`;
  }

  function renderBreakdownSection(result) {
    const entries = Object.entries(result?.breakdown || {});
    if (!entries.length) return '';
    const keyEntries = ['hook', 'structure', 'rhythm', 'highlight']
      .map(key => [key, result.breakdown[key]]).filter(([, item]) => item);
    const findings = keyEntries.map(([key, item], index) => {
      const label = DIMENSIONS.find(([candidate]) => candidate === key)?.[1] || item.title;
      const confidence = ['高', '中', '低'].includes(item.confidence) ? item.confidence : '低';
      return `<button class="key-finding" data-action="focus-breakdown" data-breakdown-key="${escapeHtml(key)}">
        <em>${String(index + 1).padStart(2, '0')}</em>
        <span><b>${escapeHtml(label)}</b><p>${escapeHtml(item.summary || '未识别')}</p></span>
        <i class="confidence confidence-${escapeHtml(confidence)}">${escapeHtml(confidence)}可信</i><strong>›</strong>
      </button>`;
    }).join('');
    const aiStatus = result.source?.douyinAiStatus;
    const evidenceWarning = aiStatus && !['stream_success', 'page_success'].includes(aiStatus)
      ? `<div class="evidence-warning"><b>当前为降级分析</b><p>没有取得 AI抖音完整视频证据（${escapeHtml(aiRecordStatus(aiStatus))}）。低可信表示只有标题、封面或局部字幕支持，不会把推测冒充事实；可到“AI记录”查看完整失败原因。</p></div>`
      : '';
    const details = entries.map(([key, item]) => {
      const label = DIMENSIONS.find(([candidate]) => candidate === key)?.[1] || item.title || key;
      const basis = unique(item.basis).map(value => `<span>${escapeHtml(value)}</span>`).join('');
      const confidence = ['高', '中', '低'].includes(item.confidence) ? item.confidence : '低';
      return `<details class="breakdown-card" data-breakdown-detail="${escapeHtml(key)}">
        <summary><div class="breakdown-summary"><span class="dimension-name">${escapeHtml(label)}</span><b>${escapeHtml(item.summary || '未识别')}</b></div><i class="confidence confidence-${escapeHtml(confidence)}">${escapeHtml(confidence)}可信</i></summary>
        <div class="breakdown-detail">
          ${item.title && item.title !== label ? `<p><strong>类型</strong>${escapeHtml(item.title)}</p>` : ''}
          <p><strong>详细判断</strong>${escapeHtml(item.summary || '未识别')}</p>
          ${item.timestamp ? `<div class="breakdown-time"><strong>时间位置</strong>${renderTimePosition(item.timestamp, result.source?.key)}</div>` : ''}
          ${item.evidence ? `<blockquote>${escapeHtml(item.evidence)}</blockquote>` : '<p class="evidence-missing">暂无可引用的具体画面或话术</p>'}
          <div class="basis"><b>分析依据</b>${basis || '<span>未标明</span>'}</div>
        </div>
      </details>`;
    }).join('');
    return `<section class="breakdown-section">
      <div class="section-title"><h3>视频拆解</h3><div><button class="detail-link" data-action="expand-breakdown">展开全部</button><button class="detail-link" data-action="collapse-breakdown">收起全部</button></div></div>
      ${evidenceWarning}
      ${findings ? `<div class="key-findings"><div class="key-findings-head"><div><small>快速导航</small><h4>关键内容</h4></div><span>点击直接展开详情</span></div>${findings}</div>` : ''}
      <div class="breakdown-grid">${details}</div>
    </section>`;
  }

  function renderResult() {
    if (state.running) return `<div class="empty analyzing"><div class="loader"></div><h3 data-progress-title>准备分析…</h3><div class="progress"><i data-progress-bar></i></div><p>请保持当前视频页面可见</p></div>`;
    if (!state.result) return `<div class="empty"><div class="empty-icon">✦</div><h3>把好视频变成可拍选题</h3><p>打开一条抖音视频，点击下方按钮。脚本只分析当前视频，不批量扫博主。</p><button class="primary" data-action="analyze">拆解当前视频</button></div>`;
    const result = state.result;
    const angles = result.angles.map((angle, index) => `<div class="angle-card"><em>${index + 1}</em><div><b>${escapeHtml(angle.title)}</b><p>${escapeHtml(angle.idea)}</p>${angle.reason ? `<small>${escapeHtml(angle.reason)}</small>` : ''}</div></div>`).join('');
    const duplicate = duplicateIndex() >= 0;
    return `${renderSource(result.source)}
      <section><h3>内容定性</h3><div class="classification"><b>${escapeHtml(result.classification.type)}</b><p>${escapeHtml(result.classification.summary)}</p>${result.classification.sellingPoint ? `<small>核心卖点：${escapeHtml(result.classification.sellingPoint)}</small>` : ''}</div></section>
      ${result.transcriptSummary ? `<section><h3>内容摘要</h3><p class="body-copy">${escapeHtml(result.transcriptSummary)}</p></section>` : ''}
      ${renderTimeline(result)}
      ${renderBreakdownSection(result)}
      ${renderCommentInsights(result)}
      ${renderReplication(result)}
      <section><h3>选题角度 <span>${result.angles.length}</span></h3><div class="angle-list">${angles || '<p class="muted">未生成有效角度</p>'}</div></section>
      <section><h3>推荐标签</h3><div class="tag-list">${result.tags.map(tag => `<button class="tag"># ${escapeHtml(tag)}</button>`).join('')}</div></section>
      ${renderTopicChat(result)}
      <div class="source-link"><span>素材原文</span><a href="${escapeHtml(result.source.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(result.source.sourceUrl)}</a></div>
      <div class="sticky-action"><button class="secondary" data-action="reanalyze">重新分析</button><button class="primary" data-action="collect" ${duplicate ? 'disabled' : ''}>${duplicate ? '已在灵感库' : '收藏到灵感库'}</button></div>`;
  }

  function renderLibraryDetail(item) {
    const result = item.result;
    const source = result?.source || {};
    const angles = (result?.angles || []).map((angle, index) => `<div class="angle-card"><em>${index + 1}</em><div><b>${escapeHtml(angle.title || `角度 ${index + 1}`)}</b><p>${escapeHtml(angle.idea || '')}</p>${angle.reason ? `<small>${escapeHtml(angle.reason)}</small>` : ''}</div></div>`).join('');
    return `<article class="library-detail" data-item-id="${escapeHtml(item.id)}">
      <button class="back-button" data-action="library-back">← 返回灵感库</button>
      ${item.cover || source.cover ? `<img class="detail-cover" src="${escapeHtml(item.cover || source.cover)}" alt="视频封面">` : ''}
      <div class="detail-heading"><div><span class="eyebrow">已收藏选题</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.angleSummary || '')}</p></div><select data-item-status>${['todo', 'done', 'discarded'].map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div>
      ${result ? `<section><h3>内容定性</h3><div class="classification"><b>${escapeHtml(result.classification?.type || '内容案例')}</b><p>${escapeHtml(result.classification?.summary || item.angleSummary || '')}</p>${result.classification?.sellingPoint ? `<small>核心卖点：${escapeHtml(result.classification.sellingPoint)}</small>` : ''}</div></section>` : ''}
      ${result?.transcriptSummary ? `<section><h3>内容摘要</h3><p class="body-copy">${escapeHtml(result.transcriptSummary)}</p></section>` : ''}
      ${result ? renderTimeline(result) : ''}
      ${result ? renderBreakdownSection(result) : ''}
      ${result ? renderCommentInsights(result) : ''}
      ${result ? renderReplication(result) : ''}
      ${angles ? `<section><h3>选题角度 <span>${result.angles.length}</span></h3><div class="angle-list">${angles}</div></section>` : ''}
      <section><h3>标签</h3><div class="tag-list">${item.tags.map(tag => `<button class="tag" data-tag-filter="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join('')}</div></section>
      <section><h3>备注</h3><textarea class="detail-note" data-item-note placeholder="补充拍摄计划、改编想法或注意事项…">${escapeHtml(item.note)}</textarea></section>
      <div class="detail-source"><div><span>原视频</span><b>${escapeHtml(source.title || item.title)}</b><small>${escapeHtml(item.author || source.author || '未知作者')} · 收藏于 ${new Date(item.savedAt).toLocaleDateString('zh-CN')}</small></div><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">打开原视频 ↗</a></div>
      <div class="detail-actions"><button class="danger-link" data-action="remove-item">移除这条灵感</button></div>
    </article>`;
  }

  function renderLibrary() {
    const detailItem = state.library.find(item => item.id === state.libraryDetailId);
    if (detailItem) return renderLibraryDetail(detailItem);
    const stats = libraryStats();
    const tags = unique(state.library.flatMap(item => item.tags)).sort();
    const items = filteredLibrary();
    return `<div class="library-toolbar">
      <div class="stats"><button data-status-filter=""><b>${stats.weekly}</b><span>本周新增</span></button><button data-status-filter="todo"><b>${stats.todo}</b><span>待拍</span></button><button data-status-filter="done"><b>${stats.done}</b><span>已拍</span></button><button data-status-filter="discarded"><b>${stats.discarded}</b><span>弃用</span></button></div>
      <div class="filters"><input type="search" data-library-search value="${escapeHtml(state.filters.query)}" placeholder="搜索标题、角度、作者、备注"><select data-library-tag><option value="">全部标签</option>${tags.map(tag => `<option value="${escapeHtml(tag)}" ${state.filters.tag === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`).join('')}</select><button class="icon-button" data-action="export" title="导出 JSON">⇩</button></div>
    </div>
    <div class="library-list" data-library-list>${items.length ? items.map(item => `<article class="idea-card" data-item-id="${escapeHtml(item.id)}">
      <div class="idea-top">${item.cover ? `<button class="cover-button" data-action="view-item"><img class="idea-cover" src="${escapeHtml(item.cover)}" alt="视频封面"></button>` : '<div class="idea-cover placeholder">无封面</div>'}<button class="idea-summary" data-action="view-item"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.angleSummary || '')}</p></button><select data-item-status>${['todo', 'done', 'discarded'].map(status => `<option value="${status}" ${item.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div>
      <div class="tag-list small">${item.tags.map(tag => `<button class="tag" data-tag-filter="${escapeHtml(tag)}"># ${escapeHtml(tag)}</button>`).join('')}</div>
      <textarea data-item-note placeholder="补充备注…">${escapeHtml(item.note)}</textarea>
      <div class="idea-foot"><span>${escapeHtml(item.author || '未知作者')} · ${new Date(item.savedAt).toLocaleDateString('zh-CN')}</span><div><button class="detail-link" data-action="view-item">查看详情</button><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noopener">原视频</a><button class="danger-link" data-action="remove-item">移除</button></div></div>
    </article>`).join('') : '<div class="empty compact"><div class="empty-icon">⌁</div><h3>还没有匹配的灵感</h3><p>分析视频后收藏，或者调整筛选条件。</p></div>'}</div>`;
  }

  function renderSettings() {
    const profile = activeProfile();
    return `<div class="settings">
      <div class="settings-head"><div><h3>选题分析配置</h3><p>设置账号方向和拆解标准，之后分析每条视频时自动使用。</p></div></div>
      <input type="hidden" data-profile-id value="${escapeHtml(profile.id)}">
      <input type="hidden" data-profile-name value="${escapeHtml(profile.name)}">
      <label><span>账号赛道</span><input data-profile-track value="${escapeHtml(profile.track)}" placeholder="如：AI 工具推荐"></label>
      <label><span>粉丝画像</span><textarea data-profile-audience placeholder="如：25-35 岁新媒体人，希望提效">${escapeHtml(profile.audience)}</textarea></label>
      <fieldset><legend>拆解维度</legend><div class="check-grid">${DIMENSIONS.map(([key, label]) => `<label class="check"><input type="checkbox" data-dimension="${key}" ${profile.dimensions.includes(key) ? 'checked' : ''}><span>✓</span>${escapeHtml(label)}</label>`).join('')}</div></fieldset>
      <label><span>补充要求</span><textarea data-profile-extra placeholder="选填，如：还要分析封面标题">${escapeHtml(profile.extra)}</textarea></label>
      <label class="switch-row"><span><b>读取 AI抖音与高赞评论</b><small>优先“视频拆解”，回退“视频总结”；不可用时自动降级</small></span><input type="checkbox" data-native-summary ${state.config.useNativeSummary ? 'checked' : ''}></label>
      <div class="settings-actions end"><button class="primary" data-action="save-profile">保存配置</button></div>
    </div>`;
  }

  function aiRecordStatus(value) {
    return {
      requesting: '请求中', success: '已获取', page_success: '页面已获取', stream_failed: '流式失败', panel_unavailable: '面板未打开',
      cross_origin: '跨域受限', button_unavailable: '指令不可用', timeout: '超时', unknown: '未知'
    }[value] || value;
  }

  function commentStatusLabel(value) {
    return {
      requesting: '读取中', panel_success: '当前面板', panel_empty: '面板无结果',
      detail_success: '详情页成功', detail_empty: '详情页无结果', detail_failed: '详情页失败',
      invalid_url: '详情链接无效', mock: '验证数据'
    }[value] || value || '未读取';
  }

  function renderAiRecords() {
    const success = state.aiRecords.filter(item => ['success', 'page_success'].includes(item.status)).length;
    const records = state.aiRecords.map(record => {
      const metricText = Object.entries(record.metrics || {}).filter(([, value]) => value)
        .map(([key, value]) => `${{ likes: '赞', comments: '评', favorites: '藏', shares: '享' }[key] || key} ${value}`).join(' · ');
      return `<details class="ai-record" data-ai-record-id="${escapeHtml(record.id)}">
        <summary><div><span>${escapeHtml(new Date(record.startedAt).toLocaleString('zh-CN'))}</span><b>${escapeHtml(record.title)}</b></div><i class="ai-status ${['success', 'page_success'].includes(record.status) ? 'success' : record.status === 'requesting' ? 'running' : 'failed'}">${escapeHtml(aiRecordStatus(record.status))}</i></summary>
        <div class="ai-record-body">
          <div class="ai-meta"><span>视频 ID：${escapeHtml(record.videoKey || '未识别')}</span>${metricText ? `<span>${escapeHtml(metricText)}</span>` : ''}<span>评论：${escapeHtml(commentStatusLabel(record.commentStatus))} · ${record.comments?.length || 0}条</span>${record.hashtags?.length ? `<span>${escapeHtml(record.hashtags.join(' '))}</span>` : ''}</div>
          <section class="conversation-block user"><h4>发送给 AI抖音</h4><p>${escapeHtml(record.question || '未记录')}</p></section>
          <section class="conversation-block assistant"><h4>AI抖音完整回答</h4>${record.response ? `<pre>${escapeHtml(record.response)}</pre>` : `<p class="record-error">${escapeHtml(record.error || '没有获取到回答')}</p>`}</section>
          ${record.transcript ? `<details class="evidence-record"><summary>页面字幕 / 章节</summary><pre>${escapeHtml(record.transcript)}</pre></details>` : ''}
          ${record.visibleInfo ? `<details class="evidence-record"><summary>页面完整信息</summary><pre>${escapeHtml(record.visibleInfo)}</pre></details>` : ''}
          ${record.comments?.length ? `<details class="evidence-record"><summary>高赞评论 ${record.comments.length}</summary><ol>${record.comments.map(item => `<li><b>${escapeHtml(item.likes || 0)}赞</b>${escapeHtml(item.text)}</li>`).join('')}</ol></details>` : record.commentError ? `<p class="record-error">评论读取失败：${escapeHtml(record.commentError)}</p>` : ''}
          <div class="ai-record-actions"><a href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noopener">打开原视频 ↗</a><button class="secondary small-button" data-action="copy-ai-record">复制完整记录</button></div>
        </div>
      </details>`;
    }).join('');
    return `<div class="ai-record-toolbar"><div><h3>AI抖音对话与证据</h3><p>保存发送的问题、完整回答、页面字幕、高赞评论和请求状态。</p></div><button class="danger-link" data-action="clear-ai-records" ${state.aiRecords.length ? '' : 'disabled'}>清空</button></div>
      <div class="ai-record-summary"><b>${success}</b> 次成功 · ${state.aiRecords.length} 次请求</div>
      <div class="ai-record-list">${records || '<div class="empty compact"><div class="empty-icon">⌁</div><h3>还没有 AI抖音记录</h3><p>重新分析视频后，这里会显示请求和完整返回。</p></div>'}</div>`;
  }

  function renderLogs() {
    const errors = state.logs.filter(item => item.level === 'error').length;
    return `<div class="logs-toolbar"><div><h3>运行日志</h3><p>记录最近 100 条分析、解析和存储异常。复制后可直接用于排查。</p></div><div><button class="secondary small-button" data-action="copy-logs" ${state.logs.length ? '' : 'disabled'}>复制</button><button class="danger-link" data-action="clear-logs" ${state.logs.length ? '' : 'disabled'}>清空</button></div></div>
      <div class="log-summary"><b>${errors}</b> 个错误 · ${state.logs.length} 条记录 · 当前脚本 v${ANALYSIS_VERSION}</div>
      <div class="log-list">${state.logs.length ? state.logs.map(item => `<article class="log-item ${escapeHtml(item.level)}">
        <div class="log-head"><b>${escapeHtml({ error: '错误', warn: '警告', info: '信息' }[item.level] || item.level)} · ${item.version ? `v${item.version}` : '旧版'}</b><time>${escapeHtml(new Date(item.at).toLocaleString('zh-CN'))}</time></div>
        <p>${escapeHtml(item.message)}</p>${item.detail ? `<pre>${escapeHtml(item.detail)}</pre>` : ''}
      </article>`).join('') : '<div class="empty compact"><div class="empty-icon">✓</div><h3>暂无运行错误</h3><p>分析或解析发生异常时会自动记录在这里。</p></div>'}</div>`;
  }

  function renderBody() {
    if (state.activeTab === 'library') return renderLibrary();
    if (state.activeTab === 'settings') return renderSettings();
    if (state.activeTab === 'ai-records') return renderAiRecords();
    if (state.activeTab === 'logs') return renderLogs();
    return renderResult();
  }

  function render() {
    if (!state.root) return;
    state.root.innerHTML = `<button class="launcher" data-action="toggle" aria-label="打开选题分析"><span>✦</span><b>选题分析</b></button>
      <aside class="panel ${state.panelOpen ? 'open' : ''}" aria-label="抖音选题分析">
        <header><div><span class="eyebrow">TABBIT · DOUYIN</span><h2>${state.activeTab === 'library' ? '灵感库' : state.activeTab === 'settings' ? '配置' : state.activeTab === 'ai-records' ? 'AI记录' : state.activeTab === 'logs' ? '日志' : '视频拆解'}</h2></div><button class="close" data-action="close" aria-label="关闭">×</button></header>
        <nav>${[['analyze', '视频拆解'], ['library', `灵感库 ${state.library.length || ''}`], ['ai-records', `AI记录 ${state.aiRecords.length || ''}`], ['settings', '配置'], ['logs', `日志${state.logs.some(item => item.level === 'error') ? ` ${state.logs.filter(item => item.level === 'error').length}` : ''}`]].map(([key, label]) => `<button data-tab="${key}" class="${state.activeTab === key ? 'active' : ''}">${label}</button>`).join('')}</nav>
        <main>${renderBody()}</main>
        ${state.activeTab === 'analyze' && !state.running && !state.result ? '<footer><button class="primary wide" data-action="analyze">✦ 拆解当前视频</button><small>快捷键 Alt/⌥ + I</small></footer>' : ''}
        <div class="toast" data-toast></div>
      </aside>`;
    bindEvents();
  }

  function renderLibraryOnly() {
    if (state.activeTab !== 'library') return render();
    const main = state.root.querySelector('main');
    if (main) main.innerHTML = renderLibrary();
    bindEvents();
  }

  function bindEvents() {
    state.root.querySelectorAll('[data-action]').forEach(element => {
      element.onclick = event => {
        const action = element.dataset.action;
        if (action === 'toggle') {
          state.panelOpen = !state.panelOpen;
          state.root.querySelector('.panel')?.classList.toggle('open', state.panelOpen);
        }
        if (action === 'close') {
          state.panelOpen = false;
          state.root.querySelector('.panel')?.classList.remove('open');
        }
        if (action === 'analyze') analyzeCurrent();
        if (action === 'reanalyze') analyzeCurrent({ force: true });
        if (action === 'refine') refineTopics();
        if (action === 'collect') collectResult();
        if (action === 'export') exportLibrary();
        if (action === 'copy-logs') copyLogs();
        if (action === 'clear-logs') clearLogs();
        if (action === 'clear-ai-records') clearAiRecords();
        if (action === 'copy-ai-record') copyAiRecord(element.closest('[data-ai-record-id]')?.dataset.aiRecordId);
        if (action === 'expand-breakdown') state.root.querySelectorAll('.breakdown-card').forEach(card => { card.open = true; });
        if (action === 'collapse-breakdown') state.root.querySelectorAll('.breakdown-card').forEach(card => { card.open = false; });
        if (action === 'expand-timeline') state.root.querySelectorAll('.timeline-item').forEach(item => { item.open = true; });
        if (action === 'collapse-timeline') state.root.querySelectorAll('.timeline-item').forEach(item => { item.open = false; });
        if (action === 'seek-video') {
          event.stopPropagation();
          const expectedKey = element.dataset.videoKey;
          const video = getActiveVideo();
          if (!video || (expectedKey && detectCurrentVideoKey() !== expectedKey)) {
            toast('请先打开这条原视频，再点击时间跳转', 'warning');
          } else {
            video.currentTime = Number(element.dataset.seekSeconds) || 0;
            video.play?.().catch(() => {});
            toast(`已跳到 ${formatClock(video.currentTime)}`, 'success');
          }
        }
        if (action === 'focus-breakdown') {
          const key = element.dataset.breakdownKey;
          const detail = Array.from(state.root.querySelectorAll('[data-breakdown-detail]'))
            .find(card => card.dataset.breakdownDetail === key);
          if (detail) {
            detail.open = true;
            detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
        if (action === 'view-item') {
          state.libraryDetailId = element.closest('[data-item-id]')?.dataset.itemId || '';
          renderLibraryOnly();
        }
        if (action === 'library-back') {
          state.libraryDetailId = '';
          renderLibraryOnly();
        }
        if (action === 'save-profile') saveProfileFromForm();
        if (action === 'remove-item') removeLibraryItem(element.closest('[data-item-id]')?.dataset.itemId);
      };
    });
    state.root.querySelectorAll('[data-tab]').forEach(element => {
      element.onclick = () => { state.activeTab = element.dataset.tab; render(); };
    });
    state.root.querySelector('[data-library-search]')?.addEventListener('input', event => {
      state.filters.query = event.target.value;
      const caret = event.target.selectionStart;
      renderLibraryOnly();
      const next = state.root.querySelector('[data-library-search]');
      next?.focus();
      next?.setSelectionRange(caret, caret);
    });
    state.root.querySelector('[data-library-tag]')?.addEventListener('change', event => {
      state.filters.tag = event.target.value;
      renderLibraryOnly();
    });
    state.root.querySelectorAll('[data-status-filter]').forEach(element => {
      element.onclick = () => { state.filters.status = element.dataset.statusFilter; renderLibraryOnly(); };
    });
    state.root.querySelectorAll('[data-tag-filter]').forEach(element => {
      element.onclick = () => {
        state.filters.tag = element.dataset.tagFilter;
        state.libraryDetailId = '';
        renderLibraryOnly();
      };
    });
    state.root.querySelectorAll('[data-item-id]').forEach(card => {
      card.querySelector('[data-item-status]')?.addEventListener('change', event => updateLibraryItem(card.dataset.itemId, { status: event.target.value }));
      card.querySelector('[data-item-note]')?.addEventListener('change', event => updateLibraryItem(card.dataset.itemId, { note: cleanText(event.target.value) }));
    });
    state.root.querySelector('[data-chat-input]')?.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        refineTopics();
      }
    });
  }

  function setProgress(title, percent) {
    const titleNode = state.root?.querySelector('[data-progress-title]');
    const bar = state.root?.querySelector('[data-progress-bar]');
    if (titleNode) titleNode.textContent = title;
    if (bar) bar.style.width = `${percent}%`;
  }

  function toast(message, type = 'info') {
    const element = state.root?.querySelector('[data-toast]');
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 3200);
  }

  function onKeydown(event) {
    if (event.altKey && event.key.toLowerCase() === 'i') {
      event.preventDefault();
      state.panelOpen = true;
      state.root?.querySelector('.panel')?.classList.add('open');
      analyzeCurrent();
    }
  }

  function syncActiveVideo() {
    const hrefChanged = location.href !== state.lastHref;
    if (hrefChanged) state.lastHref = location.href;
    const nextKey = detectCurrentVideoKey();
    if (!state.activeVideoKey) {
      state.activeVideoKey = nextKey;
      return;
    }
    const videoChanged = Boolean(nextKey && nextKey !== state.activeVideoKey);
    if (!videoChanged && !(hrefChanged && !nextKey)) return;

    state.activeVideoKey = nextKey;
    const hadOldAnalysis = Boolean(state.result || state.source);
    const restored = restoreCachedResult(nextKey);
    if (state.activeTab !== 'analyze' || (!hadOldAnalysis && !restored)) return;
    if (state.running) {
      setProgress('检测到视频已切换，将忽略上一个分析…', 16);
      return;
    }
    render();
    toast(restored ? '已恢复这条视频之前的拆解' : '已切换到新视频，请拆解当前视频', restored ? 'success' : 'info');
  }

  function injectStyle() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${HOST_ID}{all:initial;position:fixed;z-index:2147483000;right:22px;bottom:22px;font-family:Inter,"PingFang SC","Microsoft YaHei",sans-serif;color:#20251e}
      #${HOST_ID} *{box-sizing:border-box} #${HOST_ID} button,#${HOST_ID} input,#${HOST_ID} textarea,#${HOST_ID} select{font:inherit}
      #${HOST_ID} .launcher{height:50px;padding:0 18px;border:0;border-radius:25px;background:#c8ff45;color:#18200e;display:flex;align-items:center;gap:8px;box-shadow:0 12px 34px #0005;cursor:pointer;font-size:14px}
      #${HOST_ID} .launcher span{font-size:20px} #${HOST_ID} .panel{position:fixed;top:0;right:0;bottom:0;width:min(440px,100vw);background:#f5f4ee;border-left:1px solid #d9d8d0;box-shadow:-18px 0 60px #0003;transform:translateX(104%);transition:transform .28s ease;display:flex;flex-direction:column;color:#20251e}
      #${HOST_ID} .panel.open{transform:translateX(0)} #${HOST_ID} header{padding:22px 22px 14px;display:flex;justify-content:space-between;align-items:flex-start} #${HOST_ID} h2{font-size:25px;line-height:1.1;margin:3px 0 0;letter-spacing:-.7px}
      #${HOST_ID} .eyebrow{font-size:10px;letter-spacing:1.4px;color:#72766b;font-weight:800} #${HOST_ID} .close{width:34px;height:34px;border:1px solid #d4d5cc;background:#fff8;border-radius:50%;font-size:24px;line-height:1;cursor:pointer}
      #${HOST_ID} nav{padding:0 22px 10px;display:flex;gap:6px;border-bottom:1px solid #deddd5;overflow-x:auto;scrollbar-width:none;flex:none} #${HOST_ID} nav::-webkit-scrollbar{display:none} #${HOST_ID} nav button{border:0;background:transparent;padding:9px 12px;color:#777b71;border-radius:10px;cursor:pointer;font-size:13px;font-weight:700;white-space:nowrap;flex:none} #${HOST_ID} nav button.active{background:#20251e;color:#fff}
      #${HOST_ID} main{flex:1;overflow:auto;padding:18px 22px 104px;scrollbar-width:thin} #${HOST_ID} section{margin:0 0 22px} #${HOST_ID} section>h3{font-size:15px;font-weight:850;margin:0 0 11px;padding-left:8px;border-left:3px solid #aee733;letter-spacing:.1px;color:#1d221b} #${HOST_ID} section>h3 span{color:#85897e;font-weight:600}
      #${HOST_ID} p{margin:0;line-height:1.55} #${HOST_ID} .muted,#${HOST_ID} .empty p{color:#74786e;font-size:13px} #${HOST_ID} .body-copy{font-size:13px;color:#4e5349;background:#fff;border:1px solid #e2e1da;border-radius:13px;padding:13px}
      #${HOST_ID} .primary,#${HOST_ID} .secondary{border:0;border-radius:12px;padding:11px 16px;font-weight:750;cursor:pointer} #${HOST_ID} .primary{background:#20251e;color:#fff} #${HOST_ID} .primary:hover{background:#090b08} #${HOST_ID} .primary:disabled{background:#aeb1a9;cursor:default} #${HOST_ID} .secondary{background:#fff;border:1px solid #d7d7cf;color:#30342d} #${HOST_ID} .wide{width:100%}
      #${HOST_ID} footer{position:absolute;left:0;right:0;bottom:0;padding:14px 22px 18px;background:linear-gradient(transparent,#f5f4ee 18%,#f5f4ee);text-align:center} #${HOST_ID} footer small{display:block;margin-top:7px;color:#878a82;font-size:10px}
      #${HOST_ID} .empty{min-height:58vh;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;gap:11px;padding:28px} #${HOST_ID} .empty.compact{min-height:300px} #${HOST_ID} .empty-icon{font-size:38px;color:#90b932} #${HOST_ID} .empty h3{margin:0;font-size:18px} #${HOST_ID} .analyzing h3{font-size:15px}
      #${HOST_ID} .loader{width:46px;height:46px;border:3px solid #dfe1d9;border-top-color:#20251e;border-radius:50%;animation:tabbit-spin .8s linear infinite} @keyframes tabbit-spin{to{transform:rotate(360deg)}} #${HOST_ID} .progress{width:220px;height:5px;background:#dedfd7;border-radius:5px;overflow:hidden} #${HOST_ID} .progress i{display:block;width:8%;height:100%;background:#aee733;transition:width .35s}
      #${HOST_ID} .source-card{background:#20251e;color:#fff;border-radius:16px;padding:10px;margin-bottom:20px;display:flex;gap:12px;align-items:stretch} #${HOST_ID} .source-cover{width:108px;aspect-ratio:3/4;object-fit:cover;border-radius:11px;background:#343930;flex:none} #${HOST_ID} .source-copy{padding:5px 3px;min-width:0;flex:1} #${HOST_ID} .source-kicker{font-size:9px;letter-spacing:1px;color:#b8bcaf;margin-bottom:6px} #${HOST_ID} .source-title{font-size:14px;font-weight:750;line-height:1.45;max-height:82px;overflow:hidden} #${HOST_ID} .source-meta{font-size:11px;color:#bfc2ba;margin-top:7px} #${HOST_ID} .metrics{display:flex;gap:10px;margin-top:9px;font-size:10px;color:#d6ff77;flex-wrap:wrap}
      #${HOST_ID} .classification{background:#e7ffc0;border:1px solid #c8e59c;border-radius:14px;padding:14px} #${HOST_ID} .classification b{font-size:11px;background:#20251e;color:#fff;border-radius:9px;padding:3px 7px} #${HOST_ID} .classification p{font-size:14px;font-weight:650;margin:8px 0 4px} #${HOST_ID} .classification small{color:#61675a}
      #${HOST_ID} .timeline-tip{font-size:9px;color:#81867c;margin:-4px 0 9px;padding-left:11px} #${HOST_ID} .timeline-list{display:grid;gap:7px;position:relative} #${HOST_ID} .timeline-list:before{content:'';position:absolute;top:20px;bottom:20px;left:47px;width:2px;background:#d9e9b9} #${HOST_ID} .timeline-item{position:relative;background:#fff;border:1px solid #deded6;border-radius:13px;overflow:hidden} #${HOST_ID} .timeline-item[open]{border-color:#b8d978;box-shadow:0 4px 14px #6c8b1f12} #${HOST_ID} .timeline-item>summary{list-style:none;display:grid;grid-template-columns:86px minmax(0,1fr);gap:9px;align-items:center;padding:10px;cursor:pointer} #${HOST_ID} .timeline-item>summary::-webkit-details-marker{display:none} #${HOST_ID} .timeline-item>summary>button,#${HOST_ID} .time-chips button{border:0;background:#20251e;color:#fff;border-radius:9px;padding:7px 8px;font-size:9px;font-weight:800;white-space:nowrap;cursor:pointer;position:relative;z-index:1} #${HOST_ID} .timeline-item>summary>button span,#${HOST_ID} .time-chips button span{color:#c8ff45;margin-right:4px} #${HOST_ID} .timeline-item>summary>button i,#${HOST_ID} .time-chips button i{font-style:normal;color:#8d9588;margin:0 2px} #${HOST_ID} .timeline-item>summary>div{min-width:0} #${HOST_ID} .timeline-item>summary b{display:block;font-size:12px;color:#293021;margin-bottom:3px} #${HOST_ID} .timeline-item>summary p{font-size:10px;color:#687063;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${HOST_ID} .timeline-detail{border-top:1px solid #ebeae3;background:#fdfdf9;padding:10px 11px 11px 105px} #${HOST_ID} .timeline-detail>p{font-size:11px;color:#4d5448;line-height:1.6} #${HOST_ID} .timeline-detail>p strong{display:block;font-size:9px;color:#658125;margin-bottom:2px} #${HOST_ID} .timeline-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px} #${HOST_ID} .timeline-tags span{font-size:8px;background:#eaebe5;color:#62685e;border-radius:7px;padding:4px 6px} #${HOST_ID} .breakdown-time{margin-top:10px} #${HOST_ID} .breakdown-time>strong{display:block;font-size:9px;color:#617e25;margin-bottom:6px;padding-left:6px;border-left:2px solid #b8eb4a} #${HOST_ID} .time-chips{display:flex;flex-wrap:wrap;gap:5px} #${HOST_ID} .time-chips button{background:#edf7dc;color:#486219;border:1px solid #d2e5ae;padding:5px 7px} #${HOST_ID} .time-chips button span{color:#729929} #${HOST_ID} .raw-time{font-size:11px;color:#4f574a}
      #${HOST_ID} .section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px} #${HOST_ID} .section-title h3{margin:0;font-size:16px} #${HOST_ID} .section-title>div{display:flex;gap:9px} #${HOST_ID} .evidence-warning{background:#fff4d4;border:1px solid #ead49b;border-left:4px solid #d09a2f;border-radius:12px;padding:10px 11px;margin-bottom:10px} #${HOST_ID} .evidence-warning b{font-size:11px;color:#73520f} #${HOST_ID} .evidence-warning p{font-size:10px;color:#74623b;margin-top:3px;line-height:1.55} #${HOST_ID} .key-findings{background:#fff;border:1px solid #d9d9d1;border-radius:16px;padding:12px;margin-bottom:12px;display:grid;gap:7px} #${HOST_ID} .key-findings-head{display:flex;align-items:end;justify-content:space-between;padding:1px 2px 6px;border-bottom:1px solid #ecece5} #${HOST_ID} .key-findings-head small{display:block;color:#789a2d;font-size:8px;font-weight:800;letter-spacing:1px} #${HOST_ID} .key-findings-head h4{margin:1px 0 0;font-size:16px;color:#20251e} #${HOST_ID} .key-findings-head>span{font-size:9px;color:#888d82} #${HOST_ID} .key-finding{width:100%;display:grid;grid-template-columns:29px minmax(0,1fr) auto 10px;gap:9px;align-items:center;text-align:left;background:#f7f7f1;border:1px solid #e5e5dd;border-radius:11px;padding:9px;color:#20251e;cursor:pointer} #${HOST_ID} .key-finding:hover{border-color:#b8dd67;background:#f2f9e5} #${HOST_ID} .key-finding>em{width:29px;height:29px;border-radius:9px;background:#20251e;color:#c8ff45;display:grid;place-items:center;font-size:9px;font-style:normal;font-weight:850} #${HOST_ID} .key-finding>span{min-width:0} #${HOST_ID} .key-finding>span b{display:block;font-size:11px;color:#536042;margin-bottom:2px} #${HOST_ID} .key-finding p{font-size:12px;font-weight:700;line-height:1.42;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden} #${HOST_ID} .key-finding>strong{font-size:18px;color:#8d9287} #${HOST_ID} .breakdown-grid{display:grid;gap:8px;scroll-margin-top:12px} #${HOST_ID} .breakdown-card{background:#fff;border:1px solid #dfded7;border-radius:13px;overflow:hidden;scroll-margin-top:12px} #${HOST_ID} .breakdown-card summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;cursor:pointer} #${HOST_ID} .breakdown-card summary::-webkit-details-marker{display:none} #${HOST_ID} .breakdown-card summary:after{content:'›';font-size:20px;color:#91958c;transition:transform .18s} #${HOST_ID} .breakdown-card[open]{border-color:#b9d77b;box-shadow:0 4px 16px #5f77140e} #${HOST_ID} .breakdown-card[open] summary:after{transform:rotate(90deg)} #${HOST_ID} .breakdown-summary{flex:1;min-width:0;display:grid;gap:5px} #${HOST_ID} .dimension-name{justify-self:start;font-size:9px;color:#41531b;background:#eaffc4;border-radius:6px;padding:2px 6px;font-weight:850;letter-spacing:.2px} #${HOST_ID} .breakdown-summary b{font-size:13px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#20251e} #${HOST_ID} .confidence{font-size:8px;font-style:normal;padding:3px 6px;border-radius:7px;white-space:nowrap} #${HOST_ID} .confidence-高{background:#e5ffc0;color:#476910} #${HOST_ID} .confidence-中{background:#fff2c7;color:#816211} #${HOST_ID} .confidence-低{background:#f4dfdc;color:#984b45} #${HOST_ID} .breakdown-detail{border-top:1px solid #ecebe4;padding:4px 12px 13px;background:#fdfdf9} #${HOST_ID} .breakdown-detail p{font-size:12px;color:#454b41;margin-top:10px;line-height:1.62} #${HOST_ID} .breakdown-detail p strong{display:block;font-size:9px;color:#617e25;margin-bottom:3px;padding-left:6px;border-left:2px solid #b8eb4a;letter-spacing:.2px} #${HOST_ID} .breakdown-detail .evidence-missing{color:#a16760} #${HOST_ID} blockquote{margin:10px 0 0;padding:9px 10px;border-left:3px solid #b5e84a;background:#f1f5e9;border-radius:0 8px 8px 0;color:#555d4e;font-size:11px;line-height:1.58} #${HOST_ID} .basis{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin-top:10px} #${HOST_ID} .basis b{font-size:9px;color:#777c72;margin-right:2px} #${HOST_ID} .basis span{font-size:8px;background:#e9eae3;border-radius:7px;padding:3px 6px;color:#5f6559}
      #${HOST_ID} .angle-list{display:grid;gap:8px} #${HOST_ID} .angle-card{display:flex;gap:10px;background:#fff;border:1px solid #dfded7;border-radius:13px;padding:12px} #${HOST_ID} .angle-card em{flex:0 0 24px;height:24px;border-radius:8px;background:#c8ff45;display:grid;place-items:center;font-size:11px;font-style:normal;font-weight:800} #${HOST_ID} .angle-card b{font-size:12px} #${HOST_ID} .angle-card p{font-size:12px;margin-top:3px;color:#4f544b} #${HOST_ID} .angle-card small{display:block;color:#92958d;margin-top:4px;line-height:1.4}
      #${HOST_ID} .insight-box,#${HOST_ID} .replication{background:#fff;border:1px solid #dfded7;border-radius:13px;padding:13px;display:grid;gap:9px} #${HOST_ID} .insight-box p{font-size:12px;color:#50554c} #${HOST_ID} .insight-box>p b{display:inline-block;margin-right:8px;padding:2px 6px;border-radius:7px;background:#e9ffc7;color:#405414;font-size:10px} #${HOST_ID} .comment-samples{border-top:1px solid #e9e9e2;padding-top:10px;display:grid;gap:7px} #${HOST_ID} .comment-samples h4{margin:0;font-size:10px;color:#52681f} #${HOST_ID} .comment-samples>div{display:flex;gap:8px;background:#f6f7f1;border-radius:9px;padding:8px} #${HOST_ID} .comment-samples>div>b{flex:none;font-size:9px;color:#6f9125;background:#e5ffc0;border-radius:7px;padding:3px 5px;align-self:flex-start} #${HOST_ID} .comment-samples>div>p{font-size:10px;line-height:1.5;color:#4b5147} #${HOST_ID} .replication .formula{font-size:13px;font-weight:750;color:#293021;background:#edffd0;border-radius:9px;padding:9px} #${HOST_ID} .replication ol{margin:0;padding-left:20px;color:#50554c;font-size:12px;line-height:1.65} #${HOST_ID} .replication .avoid{font-size:11px;color:#856046}
      #${HOST_ID} .topic-chat{background:#ecebe4;border:1px solid #d9d8d0;border-radius:15px;padding:13px} #${HOST_ID} .topic-chat textarea{min-height:76px;resize:vertical;margin:10px 0 8px;font-size:12px} #${HOST_ID} .chat-history{display:grid;gap:7px;margin-top:10px;max-height:230px;overflow:auto} #${HOST_ID} .chat-message{max-width:88%;border-radius:11px;padding:8px 10px;background:#fff} #${HOST_ID} .chat-message.user{justify-self:end;background:#dfff9d} #${HOST_ID} .chat-message b{font-size:9px;color:#74796d} #${HOST_ID} .chat-message p{font-size:11px;margin-top:2px}
      #${HOST_ID} .tag-list{display:flex;flex-wrap:wrap;gap:6px} #${HOST_ID} .tag{border:0;background:#e8e8e1;border-radius:10px;padding:5px 8px;font-size:10px;color:#595e54;cursor:pointer} #${HOST_ID} .tag-list.small{margin:9px 0} #${HOST_ID} .source-link{background:#fff;border:1px solid #dfded7;border-radius:12px;padding:11px;display:flex;gap:10px;align-items:center;font-size:10px;overflow:hidden} #${HOST_ID} .source-link span{flex:none;color:#777b72} #${HOST_ID} .source-link a{color:#6d8f1d;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      #${HOST_ID} .sticky-action{position:sticky;bottom:-94px;margin:18px -22px -94px;padding:14px 22px 20px;background:#f5f4eef2;backdrop-filter:blur(10px);display:flex;gap:8px} #${HOST_ID} .sticky-action button:last-child{flex:1}
      #${HOST_ID} .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:6px} #${HOST_ID} .stats button{border:1px solid #deddd6;background:#fff;border-radius:12px;padding:9px 4px;cursor:pointer} #${HOST_ID} .stats b,#${HOST_ID} .stats span{display:block} #${HOST_ID} .stats b{font-size:18px} #${HOST_ID} .stats span{font-size:9px;color:#7d8177;margin-top:2px} #${HOST_ID} .filters{display:grid;grid-template-columns:1fr 105px 34px;gap:6px;margin:10px 0 14px} #${HOST_ID} input,#${HOST_ID} textarea,#${HOST_ID} select{width:100%;border:1px solid #d7d7cf;border-radius:10px;background:#fff;padding:9px;color:#2a2e27;outline:none} #${HOST_ID} input:focus,#${HOST_ID} textarea:focus,#${HOST_ID} select:focus{border-color:#95bd39;box-shadow:0 0 0 3px #c8ff4535} #${HOST_ID} .filters input,#${HOST_ID} .filters select{font-size:11px} #${HOST_ID} .icon-button{border:1px solid #d7d7cf;border-radius:10px;background:#20251e;color:#fff;cursor:pointer}
      #${HOST_ID} .library-list{display:grid;gap:10px} #${HOST_ID} .idea-card{background:#fff;border:1px solid #ddddd5;border-radius:15px;padding:10px} #${HOST_ID} .idea-top{display:flex;align-items:flex-start;gap:10px} #${HOST_ID} .cover-button{border:0;background:none;padding:0;cursor:pointer;flex:none} #${HOST_ID} .idea-cover{width:68px;height:88px;object-fit:cover;border-radius:9px;background:#e5e5dd;display:grid;place-items:center;color:#8a8e84;font-size:9px;flex:none} #${HOST_ID} .idea-summary{flex:1;text-align:left;border:0;background:none;padding:0;color:inherit;cursor:pointer} #${HOST_ID} .idea-summary:hover h4{color:#668e0d} #${HOST_ID} .idea-top h4{font-size:14px;margin:0 0 4px} #${HOST_ID} .idea-top p{font-size:11px;color:#676c61} #${HOST_ID} .idea-top select{width:72px;padding:5px;font-size:10px;background:#efffd2;border-color:#cee99c} #${HOST_ID} .idea-card textarea{min-height:52px;resize:vertical;font-size:11px;margin-top:3px} #${HOST_ID} .idea-foot{display:flex;justify-content:space-between;gap:8px;margin-top:9px;font-size:9px;color:#898d84} #${HOST_ID} .idea-foot div{display:flex;gap:9px} #${HOST_ID} .detail-link{border:0;background:none;color:#527708;padding:0;cursor:pointer;font-size:10px;font-weight:750} #${HOST_ID} a{color:#6e921c;text-decoration:none} #${HOST_ID} .danger-link{border:0;background:none;color:#a14c47;padding:0;cursor:pointer;font-size:10px}
      #${HOST_ID} .library-detail{display:grid;gap:18px} #${HOST_ID} .back-button{justify-self:start;border:0;background:none;padding:0;color:#61710f;font-size:11px;font-weight:750;cursor:pointer} #${HOST_ID} .detail-cover{width:100%;max-height:280px;object-fit:cover;border-radius:15px;background:#e5e5dd} #${HOST_ID} .detail-heading{display:flex;align-items:flex-start;gap:12px;background:#fff;border:1px solid #ddddd5;border-radius:15px;padding:14px} #${HOST_ID} .detail-heading>div{flex:1} #${HOST_ID} .detail-heading h3{font-size:18px;line-height:1.35;margin:4px 0 6px} #${HOST_ID} .detail-heading p{font-size:12px;color:#63685d} #${HOST_ID} .detail-heading select{width:76px;padding:6px;font-size:10px;background:#efffd2;border-color:#cee99c} #${HOST_ID} .detail-note{min-height:92px;resize:vertical;font-size:12px} #${HOST_ID} .detail-source{display:flex;align-items:center;gap:12px;background:#20251e;color:#fff;border-radius:14px;padding:13px} #${HOST_ID} .detail-source>div{flex:1;min-width:0} #${HOST_ID} .detail-source span,#${HOST_ID} .detail-source small{display:block;color:#aeb3a8;font-size:9px} #${HOST_ID} .detail-source b{display:block;margin:4px 0;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${HOST_ID} .detail-source a{flex:none;font-size:10px;color:#c8ff45} #${HOST_ID} .detail-actions{text-align:right}
      #${HOST_ID} .settings{display:grid;gap:13px} #${HOST_ID} .settings-head{display:flex;justify-content:space-between;gap:12px;align-items:start} #${HOST_ID} .settings-head h3{margin:0 0 4px;font-size:17px} #${HOST_ID} .settings-head p{font-size:11px;color:#777b72} #${HOST_ID} .small-button{padding:7px 9px;font-size:10px;white-space:nowrap} #${HOST_ID} .settings label>span,#${HOST_ID} fieldset legend{display:block;font-size:11px;font-weight:700;margin-bottom:6px} #${HOST_ID} .settings textarea{min-height:68px;resize:vertical} #${HOST_ID} fieldset{border:0;padding:0;margin:0} #${HOST_ID} .check-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px} #${HOST_ID} .check{background:#fff;border:1px solid #d9d9d1;border-radius:10px;padding:9px;display:flex!important;gap:7px;align-items:center;font-size:11px;font-weight:600;cursor:pointer} #${HOST_ID} .check input{display:none} #${HOST_ID} .check span{width:18px;height:18px;margin:0!important;border:1px solid #c9cbc2;border-radius:6px;display:grid!important;place-items:center;color:transparent} #${HOST_ID} .check input:checked+span{background:#c8ff45;border-color:#9cc932;color:#20251e} #${HOST_ID} .switch-row{display:flex!important;justify-content:space-between;align-items:center;background:#fff;border:1px solid #dddcd5;border-radius:12px;padding:11px} #${HOST_ID} .switch-row span{margin:0!important} #${HOST_ID} .switch-row small{display:block;color:#858980;font-weight:400;margin-top:2px} #${HOST_ID} .switch-row input{width:18px;height:18px} #${HOST_ID} .settings-actions{display:flex;justify-content:space-between;align-items:center;margin-top:6px} #${HOST_ID} .settings-actions.end{justify-content:flex-end}
      #${HOST_ID} .ai-record-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px} #${HOST_ID} .ai-record-toolbar h3{font-size:17px;margin:0 0 4px} #${HOST_ID} .ai-record-toolbar p{font-size:10px;color:#777b72;line-height:1.5} #${HOST_ID} .ai-record-summary{background:#20251e;color:#cbd0c5;border-radius:11px;padding:9px 11px;font-size:10px;margin-bottom:10px} #${HOST_ID} .ai-record-summary b{color:#c8ff45;font-size:15px} #${HOST_ID} .ai-record-list{display:grid;gap:9px} #${HOST_ID} .ai-record{background:#fff;border:1px solid #deddd5;border-radius:13px;overflow:hidden} #${HOST_ID} .ai-record>summary{list-style:none;display:flex;align-items:center;gap:10px;padding:11px;cursor:pointer} #${HOST_ID} .ai-record>summary::-webkit-details-marker{display:none} #${HOST_ID} .ai-record>summary>div{display:grid;gap:3px;min-width:0;flex:1} #${HOST_ID} .ai-record>summary span{font-size:8px;color:#858a80} #${HOST_ID} .ai-record>summary b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} #${HOST_ID} .ai-status{font-size:8px;font-style:normal;padding:4px 7px;border-radius:8px;white-space:nowrap} #${HOST_ID} .ai-status.success{background:#e3ffb7;color:#486711} #${HOST_ID} .ai-status.running{background:#dfefff;color:#2e6189} #${HOST_ID} .ai-status.failed{background:#f4dfdc;color:#984b45} #${HOST_ID} .ai-record-body{border-top:1px solid #e8e8e1;padding:11px;background:#fafaf5;display:grid;gap:9px} #${HOST_ID} .ai-meta{display:flex;flex-wrap:wrap;gap:5px} #${HOST_ID} .ai-meta span{font-size:8px;background:#e9eae3;border-radius:7px;padding:3px 6px;color:#62675d} #${HOST_ID} .conversation-block{margin:0!important;border-radius:11px;padding:10px;border:1px solid #dedfd6} #${HOST_ID} .conversation-block h4{font-size:10px;margin:0 0 6px;color:#5d6556} #${HOST_ID} .conversation-block p,#${HOST_ID} .conversation-block pre{font-size:11px;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin:0} #${HOST_ID} .conversation-block.user{background:#edffd0;border-color:#d0e9a6} #${HOST_ID} .conversation-block.assistant{background:#fff} #${HOST_ID} .conversation-block.assistant pre{max-height:460px;overflow:auto;color:#30352d;font-family:inherit} #${HOST_ID} .record-error{color:#9b4b45!important} #${HOST_ID} .evidence-record{background:#fff;border:1px solid #e1e1d9;border-radius:10px;overflow:hidden} #${HOST_ID} .evidence-record>summary{padding:9px 10px;cursor:pointer;font-size:10px;font-weight:800;color:#405315} #${HOST_ID} .evidence-record pre{white-space:pre-wrap;word-break:break-word;max-height:260px;overflow:auto;border-top:1px solid #ededE7;padding:9px;margin:0;font:9px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#555a51} #${HOST_ID} .evidence-record ol{border-top:1px solid #edede7;margin:0;padding:8px 10px 8px 28px;font-size:10px;line-height:1.55} #${HOST_ID} .evidence-record li{margin:4px 0} #${HOST_ID} .evidence-record li b{margin-right:6px;color:#72952a} #${HOST_ID} .ai-record-actions{display:flex;justify-content:space-between;align-items:center;padding-top:2px} #${HOST_ID} .ai-record-actions a{font-size:10px;font-weight:750}
      #${HOST_ID} .logs-toolbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px} #${HOST_ID} .logs-toolbar h3{font-size:16px;margin:0 0 4px} #${HOST_ID} .logs-toolbar p{font-size:10px;color:#777b72;line-height:1.5} #${HOST_ID} .logs-toolbar>div:last-child{display:flex;align-items:center;gap:9px} #${HOST_ID} .log-summary{background:#20251e;color:#cbd0c5;border-radius:11px;padding:9px 11px;font-size:10px;margin-bottom:10px} #${HOST_ID} .log-summary b{color:#ff9e91;font-size:15px} #${HOST_ID} .log-list{display:grid;gap:8px} #${HOST_ID} .log-item{background:#fff;border:1px solid #deddd5;border-left:4px solid #979c91;border-radius:12px;padding:10px} #${HOST_ID} .log-item.error{border-left-color:#d95a4f} #${HOST_ID} .log-item.warn{border-left-color:#ca922b} #${HOST_ID} .log-item.info{border-left-color:#7ca62a} #${HOST_ID} .log-head{display:flex;justify-content:space-between;gap:10px;align-items:center} #${HOST_ID} .log-head b{font-size:10px} #${HOST_ID} .log-head time{font-size:9px;color:#8c9088} #${HOST_ID} .log-item p{font-size:12px;font-weight:700;margin:6px 0} #${HOST_ID} .log-item pre{white-space:pre-wrap;word-break:break-word;max-height:180px;overflow:auto;background:#f1f1eb;border-radius:8px;padding:8px;margin:0;font:9px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace;color:#555a51}
      #${HOST_ID} .toast{position:absolute;left:50%;bottom:24px;transform:translate(-50%,18px);opacity:0;pointer-events:none;background:#20251e;color:#fff;border-radius:11px;padding:10px 14px;font-size:11px;box-shadow:0 10px 30px #0004;transition:.2s;white-space:nowrap;z-index:5} #${HOST_ID} .toast.show{opacity:1;transform:translate(-50%,0)} #${HOST_ID} .toast[data-type="error"]{background:#9f3e39} #${HOST_ID} .toast[data-type="success"]{background:#416a14} #${HOST_ID} .toast[data-type="warning"]{background:#8a6519}
      @media(max-width:620px){#${HOST_ID}{right:12px;bottom:14px}#${HOST_ID} .launcher{height:46px;padding:0 14px}#${HOST_ID} .panel{width:100vw}#${HOST_ID} .breakdown-grid{grid-template-columns:1fr}#${HOST_ID} main{padding-left:16px;padding-right:16px}#${HOST_ID} header,#${HOST_ID} nav{padding-left:16px;padding-right:16px}}
    `;
    document.head.appendChild(style);
  }

  function cleanup() {
    clearInterval(state.routeTimer);
    state.observer?.disconnect();
    document.removeEventListener('keydown', onKeydown);
    document.getElementById(HOST_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
    delete window[CLEANUP_KEY];
    delete window[API_KEY];
  }

  function init() {
    if (!document.body) return;
    injectStyle();
    state.host = document.createElement('div');
    state.host.id = HOST_ID;
    state.root = state.host;
    document.body.appendChild(state.host);
    state.activeVideoKey = detectCurrentVideoKey();
    restoreCachedResult(state.activeVideoKey);
    render();
    document.addEventListener('keydown', onKeydown);
    state.routeTimer = setInterval(syncActiveVideo, 350);
    window[CLEANUP_KEY] = cleanup;
    window[API_KEY] = {
      open(tab = 'analyze') {
        if (['analyze', 'library', 'ai-records', 'settings', 'logs'].includes(tab)) state.activeTab = tab;
        state.panelOpen = true;
        render();
      },
      close() {
        state.panelOpen = false;
        state.root.querySelector('.panel')?.classList.remove('open');
      },
      analyze(force = false) { return analyzeCurrent({ force }); },
      collect: collectResult,
      getCurrentResult() { return state.result ? JSON.parse(JSON.stringify(state.result)) : null; },
      getLibrary() { return JSON.parse(JSON.stringify(state.library)); },
      openLibraryItem(id) {
        if (!state.library.some(item => item.id === id)) return false;
        state.activeTab = 'library';
        state.libraryDetailId = id;
        state.panelOpen = true;
        render();
        return true;
      },
      getConfig() { return JSON.parse(JSON.stringify(state.config)); },
      getLogs() { return JSON.parse(JSON.stringify(state.logs)); },
      getAiRecords() { return JSON.parse(JSON.stringify(state.aiRecords)); },
      getVisibleComments() { return JSON.parse(JSON.stringify(collectTopComments())); },
      exportLibrary,
      cleanup
    };
    console.log(`[Tabbit] 抖音选题分析 v${ANALYSIS_VERSION} 已启动：window.__tabbitDouyinInspirationApi.open()`);
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();