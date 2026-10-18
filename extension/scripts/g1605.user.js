(function () {
  'use strict';

  const SCRIPT_ID = 'tabbit-douyin-competitor-account-analyzer';
  const HOST_ID = `${SCRIPT_ID}-host`;
  const CLEANUP_KEY = '__tabbitDouyinCompetitorAnalyzerCleanup';
  const API_KEY = '__tabbitDouyinCompetitorAnalyzerApi';
  const STORAGE_PREFIX = 'tabbit:douyin-competitor:v2:';
  const COVER_ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '21:9'];

  if (typeof window[CLEANUP_KEY] === 'function') window[CLEANUP_KEY]();

  const defaults = {
    maxItems: 60,
    maxScrollRounds: 160,
    stableRoundsToStop: 5,
    scrollStepRatio: 0.84,
    scrollDelayMs: 620,
    deepSample: 5,
    commentsPerWork: 12,
    detailTimeoutMs: 12000,
    llmTimeoutMs: 120000,
    analysisBatchSize: 18,
    analysisConcurrency: 2,
    imageTimeoutMs: 180000,
    imagePollMs: 1800,
    metricConcurrency: 2,
    douyinAiTimeoutMs: 90000,
    preferDouyinAi: true,
    preferDirectVideo: false,
    testMode: false
  };
  const overrides = window.__tabbitDouyinCompetitorAnalyzerConfig || {};
  const config = {
    ...defaults,
    ...overrides,
    maxItems: clampInt(overrides.maxItems, 1, 500, defaults.maxItems),
    maxScrollRounds: clampInt(overrides.maxScrollRounds, 5, 500, defaults.maxScrollRounds),
    stableRoundsToStop: clampInt(overrides.stableRoundsToStop, 2, 12, defaults.stableRoundsToStop),
    scrollDelayMs: clampInt(overrides.scrollDelayMs, 20, 5000, defaults.scrollDelayMs),
    deepSample: clampInt(overrides.deepSample, 0, 20, defaults.deepSample),
    commentsPerWork: clampInt(overrides.commentsPerWork, 1, 50, defaults.commentsPerWork),
    detailTimeoutMs: clampInt(overrides.detailTimeoutMs, 2000, 60000, defaults.detailTimeoutMs),
    llmTimeoutMs: clampInt(overrides.llmTimeoutMs, 5000, 300000, defaults.llmTimeoutMs),
    analysisBatchSize: clampInt(overrides.analysisBatchSize, 5, 30, defaults.analysisBatchSize),
    analysisConcurrency: clampInt(overrides.analysisConcurrency, 1, 4, defaults.analysisConcurrency),
    imageTimeoutMs: clampInt(overrides.imageTimeoutMs, 10000, 600000, defaults.imageTimeoutMs),
    imagePollMs: clampInt(overrides.imagePollMs, 100, 10000, defaults.imagePollMs),
    metricConcurrency: clampInt(overrides.metricConcurrency, 1, 4, defaults.metricConcurrency),
    douyinAiTimeoutMs: clampInt(overrides.douyinAiTimeoutMs, 5000, 180000, defaults.douyinAiTimeoutMs),
    preferDouyinAi: overrides.preferDouyinAi !== false,
    preferDirectVideo: overrides.preferDirectVideo === true,
    testMode: overrides.testMode === true
  };

  const state = {
    shadow: null,
    ui: null,
    observer: null,
    running: false,
    cancelled: false,
    phase: 'idle',
    progress: 0,
    message: '',
    requirement: '拆解爆款逻辑、用户痛点和赛道空位，并给出下一步选题建议',
    maxItems: config.maxItems,
    deepSample: config.deepSample,
    profile: null,
    works: [],
    report: null,
    activeSection: 'summary',
    activeCoverId: '',
    coverTasks: [],
    coverImageModelTier: 'lite',
    coverAspectRatio: 'auto',
    coverEditBaseByWork: {},
    detailAnalyses: new Map(),
    replicationChat: [],
    accountChat: [],
    chatSelectedWorkIds: new Set(),
    chatBusy: false,
    chatStatus: '',
    chatWorkQuery: '',
    notes: [],
    notesOpen: false,
    activeWorkId: '',
    metricQueue: { running: false, completed: 0, total: 0, errors: 0 },
    lastError: ''
  };

  function clampInt(value, min, max, fallback) {
    const number = Math.floor(Number(value));
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function cleanText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function storageKey() {
    const scope = state.profile?.douyinId || state.profile?.url || location.pathname || 'unknown';
    return `${STORAGE_PREFIX}${scope}`;
  }

  function serializableSource(source) {
    const value = String(source || '');
    return value && (!value.startsWith('data:') || value.length < 220000) ? value : '';
  }

  function saveWorkspace() {
    if (!state.profile) return;
    try {
      const payload = {
        notes: state.notes,
        coverTasks: state.coverTasks.slice(-40).map(task => ({ ...task, source: serializableSource(task.source) || task.persistentSource || '' })),
        coverImageModelTier: state.coverImageModelTier,
        coverAspectRatio: state.coverAspectRatio,
        coverEditBaseByWork: state.coverEditBaseByWork,
        detailAnalyses: Array.from(state.detailAnalyses.entries()).slice(-30),
        replicationChat: state.replicationChat.slice(-20),
        accountChat: state.accountChat.slice(-40),
        chatSelectedWorkIds: Array.from(state.chatSelectedWorkIds).slice(0, 12),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(storageKey(), JSON.stringify(payload));
    } catch (error) {
      console.warn('[Tabbit Competitor Analyzer] 工作区持久化失败', error);
    }
  }

  function loadWorkspace() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey()) || '{}');
      state.notes = Array.isArray(parsed.notes) ? parsed.notes : [];
      state.coverTasks = Array.isArray(parsed.coverTasks) ? parsed.coverTasks.map(task => {
        const restored = { ...task, source: task.source || task.persistentSource || '' };
        return restored.status === 'running' || restored.status === 'queued' ? { ...restored, status: 'interrupted', error: '页面刷新后任务状态需重新生成' } : restored;
      }) : [];
      state.coverImageModelTier = parsed.coverImageModelTier === 'pro' ? 'pro' : 'lite';
      state.coverAspectRatio = parsed.coverAspectRatio === 'auto' || COVER_ASPECT_RATIOS.includes(parsed.coverAspectRatio) ? parsed.coverAspectRatio : 'auto';
      state.coverEditBaseByWork = parsed.coverEditBaseByWork && typeof parsed.coverEditBaseByWork === 'object' ? parsed.coverEditBaseByWork : {};
      state.detailAnalyses = new Map(Array.isArray(parsed.detailAnalyses) ? parsed.detailAnalyses : []);
      state.replicationChat = Array.isArray(parsed.replicationChat) ? parsed.replicationChat : [];
      state.accountChat = Array.isArray(parsed.accountChat) ? parsed.accountChat : [];
      state.chatSelectedWorkIds = new Set(Array.isArray(parsed.chatSelectedWorkIds) ? parsed.chatSelectedWorkIds.map(String) : []);
    } catch (error) {
      console.warn('[Tabbit Competitor Analyzer] 工作区恢复失败', error);
    }
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function withTimeout(promise, timeoutMs, label) {
    let timer;
    return Promise.race([
      Promise.resolve(promise),
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error(label || '操作超时')), timeoutMs);
      })
    ]).finally(() => clearTimeout(timer));
  }

  function parseJson(value) {
    if (value && typeof value === 'object') return value;
    const text = String(value || '').trim();
    if (!text) throw new Error('LLMBridge 返回为空');
    try {
      return JSON.parse(text);
    } catch (error) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
      if (fenced) return JSON.parse(fenced);
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
      throw error;
    }
  }

  function parseMetric(value) {
    const text = cleanText(value).replace(/,/g, '');
    const match = text.match(/(-?\d+(?:\.\d+)?)\s*([万亿wWkK]?)/);
    if (!match) return 0;
    const unit = match[2].toLowerCase();
    const multiplier = unit === '亿' ? 100000000 : unit === '万' || unit === 'w' ? 10000 : unit === 'k' ? 1000 : 1;
    return Math.max(0, Math.round(Number(match[1]) * multiplier));
  }

  function parseOptionalMetric(value) {
    const text = cleanText(value);
    return text ? parseMetric(text) : null;
  }

  function formatMetric(value) {
    const number = Math.max(0, Number(value) || 0);
    if (number >= 100000000) return `${(number / 100000000).toFixed(number >= 1000000000 ? 0 : 1)}亿`;
    if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}万`;
    return String(Math.round(number));
  }

  function formatOptionalMetric(value) {
    return Number.isFinite(Number(value)) && value !== null ? formatMetric(value) : '未获取';
  }

  function average(values) {
    const valid = values.filter(value => value !== null && value !== undefined && value !== '').map(Number).filter(Number.isFinite);
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  }

  function safeList(value, fallback = [], limit = 6) {
    const list = Array.isArray(value) ? value : [];
    const normalized = list.map(item => cleanText(typeof item === 'string' ? item : item?.text || item?.title)).filter(Boolean);
    return (normalized.length ? normalized : fallback).slice(0, limit);
  }

  function isDouyinProfilePage() {
    return /(^|\.)douyin\.com$/i.test(location.hostname) && /\/user\//.test(location.pathname);
  }

  function extractWorkId(href) {
    return String(href || '').match(/\/(?:video|note)\/(\d{8,})/)?.[1] || '';
  }

  function findProfileHeaderRoot() {
    const heading = Array.from(document.querySelectorAll('h1')).find(element => cleanText(element.textContent));
    if (!heading) return document.body;
    let node = heading;
    while (node?.parentElement && node !== document.body) {
      const text = cleanText(node.textContent);
      if (/粉丝/.test(text) && /获赞/.test(text) && text.length < 2600) return node;
      node = node.parentElement;
    }
    return heading.parentElement || document.body;
  }

  function extractProfile() {
    const header = findProfileHeaderRoot();
    const text = cleanText(header?.textContent || document.body.textContent);
    const nickname = cleanText(header?.querySelector('h1')?.textContent || document.querySelector('h1')?.textContent || '未知账号');
    const avatar = header?.querySelector(`img[alt*="${CSS.escape(nickname)}"], img[alt*="头像"]`)?.currentSrc
      || header?.querySelector('img')?.currentSrc
      || '';
    const worksText = Array.from(document.querySelectorAll('[role="tab"], h2')).map(element => cleanText(element.textContent)).find(value => /^作品\s*\d+/.test(value)) || '';
    const idText = text.match(/抖音号[：:]\s*([^\s]+)/)?.[1] || '';
    const ip = text.match(/IP属地[：:]\s*([^\s]+)/)?.[1] || '';
    let bio = '';
    const fragments = Array.from(header?.querySelectorAll('p, [class]') || [])
      .map(element => cleanText(element.textContent))
      .filter(value => value.length >= 8 && value.length <= 420 && !/^(关注|粉丝|获赞|抖音号|IP属地)/.test(value));
    bio = fragments.sort((left, right) => right.length - left.length)[0] || '';
    return {
      nickname,
      avatar,
      douyinId: idText,
      ip,
      bio: bio.slice(0, 500),
      following: parseMetric(text.match(/关注\s*([\d.万亿]+)/)?.[1]),
      followers: parseMetric(text.match(/粉丝\s*([\d.万亿]+)/)?.[1]),
      totalLikes: parseMetric(text.match(/获赞\s*([\d.万亿]+)/)?.[1]),
      declaredWorks: parseMetric(worksText),
      url: location.href.split('?')[0],
      capturedAt: new Date().toISOString()
    };
  }

  function findWorksRoot() {
    return document.querySelector('[data-e2e="user-post-list"] [data-e2e="scroll-list"]')
      || Array.from(document.querySelectorAll('[data-e2e="scroll-list"], ul, main')).find(root => root.querySelector('a[href*="/video/"], a[href*="/note/"]'))
      || document.querySelector('[data-e2e="user-post-list"]')
      || document.body;
  }

  function findScrollContainer(root) {
    let node = root?.parentElement;
    while (node && node !== document.body && node !== document.documentElement) {
      const style = getComputedStyle(node);
      if (/(auto|scroll|overlay)/i.test(style.overflowY) && node.scrollHeight > node.clientHeight + 80) return node;
      node = node.parentElement;
    }
    return Array.from(document.querySelectorAll('.route-scroll-container, [class*="scroll-container"], [class*="scrollContainer"]'))
      .filter(element => {
        const style = getComputedStyle(element);
        return /(auto|scroll|overlay)/i.test(style.overflowY) && element.scrollHeight > element.clientHeight + 80;
      })
      .sort((left, right) => right.scrollHeight - left.scrollHeight)[0]
      || document.scrollingElement
      || document.documentElement;
  }

  function isDocumentScroller(element) {
    return element === document.scrollingElement || element === document.documentElement || element === document.body;
  }

  function scrollTopOf(element) {
    return isDocumentScroller(element) ? window.scrollY : element.scrollTop;
  }

  function viewportHeightOf(element) {
    return isDocumentScroller(element) ? window.innerHeight : element.clientHeight;
  }

  function setScrollTop(element, top) {
    if (isDocumentScroller(element)) window.scrollTo({ top, behavior: 'auto' });
    else element.scrollTo({ top, behavior: 'auto' });
  }

  function extractCardMetric(anchor) {
    const candidates = [
      ...String(anchor.innerText || anchor.textContent || '').split(/\n+/),
      ...Array.from(anchor.querySelectorAll('span, div')).filter(element => element.children.length === 0).map(element => element.textContent)
    ].map(cleanText).filter(Boolean);
    const metric = candidates.find(value => /^\d+(?:\.\d+)?(?:万|亿|w|k)?$/i.test(value));
    return parseMetric(metric || '0');
  }

  function extractWork(anchor, index) {
    const href = anchor?.href || anchor?.getAttribute?.('href') || '';
    const id = extractWorkId(href);
    if (!id) return null;
    const image = anchor.querySelector('img');
    const alt = cleanText(image?.alt);
    const rawText = cleanText(anchor.innerText || anchor.textContent);
    const titleFromAlt = alt.includes('：') ? cleanText(alt.slice(alt.indexOf('：') + 1)) : alt;
    const title = (titleFromAlt || rawText.replace(/^(置顶\s*)?[\d.万亿wWkK]+\s*/, '') || `作品 ${id}`).slice(0, 1200);
    const hashtags = Array.from(new Set((title.match(/#[^#\s，。！？,.!?]{1,30}/g) || []).map(cleanText))).slice(0, 20);
    return {
      id,
      index,
      kind: /\/note\//.test(href) ? '图文' : '视频',
      href: new URL(href, location.origin).href.split('?')[0],
      title,
      cover: image?.currentSrc || image?.src || '',
      coverWidth: Number(image?.naturalWidth) || 0,
      coverHeight: Number(image?.naturalHeight) || 0,
      likeCount: extractCardMetric(anchor),
      hashtags,
      pinned: /置顶/.test(rawText),
      publishTime: '',
      duration: '',
      commentCount: null,
      collectCount: null,
      shareCount: null,
      comments: [],
      chapters: [],
      deepScanned: false,
      analysis: null
    };
  }

  async function scanProfileWorks() {
    const root = findWorksRoot();
    if (!root) throw new Error('没有找到账号作品列表，请打开抖音博主主页并切换到“作品”。');
    const scroller = findScrollContainer(root);
    const originalTop = scrollTopOf(scroller);
    const seen = new Map();
    let stable = 0;
    let observer;

    const scan = node => {
      const anchors = [];
      if (node?.matches?.('a[href*="/video/"], a[href*="/note/"]')) anchors.push(node);
      anchors.push(...Array.from(node?.querySelectorAll?.('a[href*="/video/"], a[href*="/note/"]') || []));
      for (const anchor of anchors) {
        const item = extractWork(anchor, seen.size);
        if (!item || seen.has(item.id)) continue;
        seen.set(item.id, item);
      }
    };

    try {
      scan(root);
      observer = new MutationObserver(mutations => mutations.forEach(mutation => mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) scan(node);
      })));
      observer.observe(root, { childList: true, subtree: true });
      setScrollTop(scroller, Math.max(0, originalTop));
      for (let round = 0; round < config.maxScrollRounds && seen.size < state.maxItems; round += 1) {
        if (state.cancelled) throw new Error('已停止扫描');
        scan(root);
        const beforeCount = seen.size;
        const beforeHeight = scroller.scrollHeight;
        const viewport = viewportHeightOf(scroller);
        const maxTop = Math.max(0, scroller.scrollHeight - viewport);
        setScrollTop(scroller, Math.min(maxTop, scrollTopOf(scroller) + Math.max(480, Math.floor(viewport * config.scrollStepRatio))));
        await sleep(config.scrollDelayMs);
        scan(root);
        const nearBottom = scrollTopOf(scroller) + viewport >= scroller.scrollHeight - 180;
        stable = nearBottom && beforeCount === seen.size && beforeHeight === scroller.scrollHeight ? stable + 1 : 0;
        setProgress(8 + Math.min(30, Math.round(seen.size / Math.max(1, state.maxItems) * 30)), `正在扫描作品：已读取 ${Math.min(seen.size, state.maxItems)} 条`);
        if (stable >= config.stableRoundsToStop) break;
      }
      return Array.from(seen.values()).slice(0, state.maxItems).map((item, index) => ({ ...item, index }));
    } finally {
      observer?.disconnect();
      setScrollTop(scroller, originalTop);
    }
  }

  function leafTextCandidates(root) {
    return Array.from(root?.querySelectorAll?.('span, div, p') || [])
      .filter(element => element.children.length === 0)
      .map(element => cleanText(element.textContent))
      .filter(text => text.length >= 2 && text.length <= 500);
  }

  function parseCommentItem(item) {
    const author = cleanText(item.querySelector('a[href*="/user/"]')?.textContent);
    const meta = leafTextCandidates(item).find(text => /(?:分钟前|小时前|天前|月前|年|\d{2}[-/.]\d{2}).*(?:·|IP|省|市|北京|上海|广东|浙江|江苏|四川|山东|河南|河北|湖北|湖南|安徽|福建|美国|海外)?/.test(text)) || '';
    const excluded = /^(分享|回复|展开\d*条回复|\.\.\.|\d+(?:\.\d+)?[万亿]?)$/;
    const content = leafTextCandidates(item)
      .filter(text => text !== author && text !== meta && !excluded.test(text))
      .sort((left, right) => right.length - left.length)[0] || '';
    const likeText = Array.from(item.querySelectorAll('p span')).map(element => cleanText(element.textContent)).find(text => /^\d+(?:\.\d+)?[万亿]?$/.test(text)) || '';
    return content ? { author, content, meta, likes: parseMetric(likeText) } : null;
  }

  function parseDetailDocument(doc, work, mode = 'full') {
    const textOf = selector => cleanText(doc.querySelector(selector)?.textContent);
    const publishText = textOf('[data-e2e="detail-video-publish-time"]');
    const detailText = textOf('[data-e2e="detail-video-info"]');
    const durationCandidates = leafTextCandidates(doc.querySelector('[data-e2e="video-detail"]')).filter(text => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(text));
    const comments = mode === 'full' ? Array.from(doc.querySelectorAll('[data-e2e="comment-item"]')).slice(0, config.commentsPerWork).map(parseCommentItem).filter(Boolean) : work.comments;
    const chapterPairs = [];
    const chapterRoot = Array.from(doc.querySelectorAll('*')).find(element => cleanText(element.textContent) === '章节要点')?.parentElement;
    if (chapterRoot) {
      const leaves = leafTextCandidates(chapterRoot);
      leaves.forEach((value, index) => {
        if (/^\d{1,2}:\d{2}$/.test(value) && leaves[index + 1] && !/^\d/.test(leaves[index + 1])) chapterPairs.push(`${value} ${leaves[index + 1]}`);
      });
    }
    return {
      ...work,
      title: detailText || work.title,
      likeCount: parseOptionalMetric(textOf('[data-e2e="video-player-digg"]')) ?? work.likeCount,
      commentCount: parseOptionalMetric(textOf('[data-e2e="feed-comment-icon"]')) ?? work.commentCount,
      collectCount: parseOptionalMetric(textOf('[data-e2e="video-player-collect"]')) ?? work.collectCount,
      shareCount: parseOptionalMetric(textOf('[data-e2e="video-player-share"]')) ?? work.shareCount,
      publishTime: publishText.replace(/^发布时间[：:]\s*/, ''),
      duration: durationCandidates.at(-1) || work.duration,
      comments,
      chapters: chapterPairs.slice(0, 20),
      metricsFetched: Boolean(doc.querySelector('[data-e2e="feed-comment-icon"], [data-e2e="video-player-collect"], [data-e2e="video-player-share"]')) || work.metricsFetched,
      deepScanned: mode === 'full' || work.deepScanned
    };
  }

  function captureVideoFrame(video, maxEdge = 720) {
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return '';
    const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    try {
      const context = canvas.getContext('2d', { alpha: false });
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.68);
    } catch (error) {
      return '';
    } finally {
      canvas.width = canvas.height = 1;
    }
  }

  function extractDetailTranscript(doc, video) {
    const parts = [];
    for (const track of Array.from(video?.textTracks || [])) {
      for (const cue of Array.from(track.cues || [])) {
        const text = cleanText(cue.text);
        if (text) parts.push(text);
      }
    }
    Array.from(doc.querySelectorAll([
      '[data-e2e="chapter-container"]', '[data-e2e*="subtitle"]', '[data-e2e*="caption"]',
      '[class*="subtitle"]', '[class*="Subtitle"]', '[class*="caption"]', '[class*="Caption"]'
    ].join(','))).forEach(element => {
      const text = cleanText(element.innerText || element.textContent || element.getAttribute('aria-label'));
      if (text.length >= 2 && text.length <= 3000) parts.push(text);
    });
    return Array.from(new Set(parts)).join('\n').slice(0, 8000);
  }

  async function prepareDetailVideo(doc) {
    const startedAt = Date.now();
    let video = doc.querySelector('video');
    let requestedPlay = false;
    while ((!video || video.readyState < 2 || !video.videoWidth) && Date.now() - startedAt < Math.min(5000, config.detailTimeoutMs)) {
      video = doc.querySelector('video');
      if (video && !requestedPlay) {
        requestedPlay = true;
        video.muted = true;
        try { video.play()?.catch(() => {}); } catch (error) { /* muted autoplay can still be blocked */ }
      }
      await sleep(180);
    }
    return video;
  }

  async function deepScanWork(work, mode = 'full', captureMedia = false) {
    const mock = window.__tabbitDouyinCompetitorAnalyzerTestDetails?.[work.id];
    if (mock) return { ...work, ...mock, metricsFetched: true, deepScanned: mode === 'full' || work.deepScanned, mediaUrl: captureMedia ? mock.mediaUrl || '' : work.mediaUrl };
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = captureMedia
      ? 'position:fixed;width:720px;height:960px;left:-12000px;top:0;opacity:0.01;pointer-events:none;border:0;'
      : 'position:fixed;width:2px;height:2px;left:-9999px;top:-9999px;opacity:0;pointer-events:none;border:0;';
    document.body.appendChild(iframe);
    try {
      await withTimeout(new Promise((resolve, reject) => {
        iframe.onload = resolve;
        iframe.onerror = () => reject(new Error('详情页加载失败'));
        iframe.src = work.href;
      }), config.detailTimeoutMs, '详情页加载超时');
      const doc = iframe.contentDocument;
      if (!doc) throw new Error('无法读取作品详情页');
      const startedAt = Date.now();
      while (!doc.querySelector('[data-e2e="detail-video-info"]') && Date.now() - startedAt < config.detailTimeoutMs) await sleep(220);
      const video = captureMedia ? await prepareDetailVideo(doc) : doc.querySelector('video');
      await sleep(config.testMode ? 20 : 260);
      const parsed = parseDetailDocument(doc, work, mode);
      if (captureMedia) {
        parsed.mediaUrl = extractMediaUrl(iframe, doc);
        parsed.frameImage = captureVideoFrame(video);
        parsed.transcript = extractDetailTranscript(doc, video);
        parsed.nativeAiText = extractNativeAiText(doc);
        try { parsed.detailPageUrl = iframe.contentWindow?.location?.href || iframe.src; } catch (error) { parsed.detailPageUrl = iframe.src; }
      }
      Array.from(doc.querySelectorAll('video, audio')).forEach(media => {
        try { media.pause(); } catch (error) { /* no-op */ }
      });
      return parsed;
    } finally {
      iframe.src = 'about:blank';
      iframe.remove();
    }
  }

  async function deepScanTopWorks(works) {
    const count = Math.min(state.deepSample, works.length);
    if (!count) return works;
    const selected = [...works].sort((left, right) => right.likeCount - left.likeCount).slice(0, count);
    const updated = new Map(works.map(work => [work.id, work]));
    for (let index = 0; index < selected.length; index += 1) {
      if (state.cancelled) throw new Error('已停止深度扫描');
      setProgress(40 + Math.round(index / Math.max(1, selected.length) * 16), `深读爆款 ${index + 1}/${selected.length}：互动数据与热门评论`);
      try {
        updated.set(selected[index].id, await deepScanWork(selected[index]));
      } catch (error) {
        console.warn('[Tabbit Competitor Analyzer] 深度扫描失败', selected[index].href, error);
        updated.set(selected[index].id, { ...selected[index], deepError: cleanText(error?.message || error) });
      }
    }
    return works.map(work => updated.get(work.id));
  }

  function extractNativeAiText(doc) {
    if (!doc) return '';
    const roots = [doc];
    Array.from(doc.querySelectorAll('iframe')).forEach(frame => {
      try { if (frame.contentDocument) roots.push(frame.contentDocument); } catch (error) { /* cross-origin frame */ }
    });
    const candidates = roots.flatMap(root => Array.from(root.querySelectorAll('aside, [role="tabpanel"], [class*="ai" i], [class*="assistant" i]')))
      .map(element => cleanText(element.innerText || element.textContent))
      .filter(text => text.length >= 120 && text.length <= 16000 && /AI\s*总结|视频架构|核心叙事|内容模块|高光片段|时间脉络/.test(text))
      .sort((left, right) => right.length - left.length);
    return candidates[0] || '';
  }

  function extractMediaUrl(frame, doc) {
    const media = doc.querySelector('video');
    const direct = [media?.currentSrc, media?.src, doc.querySelector('video source')?.src].find(value => /^https?:/i.test(value || ''));
    if (direct) return direct;
    try {
      const resources = frame.contentWindow.performance.getEntriesByType('resource');
      const candidate = resources.find(entry => {
        if (!/^https?:/i.test(entry?.name || '')) return false;
        if (/^(?:video|media)$/i.test(entry.initiatorType || '')) return true;
        try {
          const url = new URL(entry.name);
          return /\.(?:mp4|mov|m4v)(?:$|[?#])/i.test(url.pathname)
            || (/douyinvod\.com$/i.test(url.hostname) && /(?:^|\/)video(?:\/|$)/i.test(url.pathname));
        } catch (error) {
          return false;
        }
      });
      return candidate?.name || '';
    } catch (error) {
      return '';
    }
  }

  function isRetryableVideoBridgeError(error) {
    const message = cleanText(error?.message || error);
    return /抖音 Chat API 请求失败\s*:\s*HTTP\s*(?:400|413|415|422)\b/i.test(message)
      || /(?:video_url|视频).*(?:invalid|unsupported|format|download|fetch|size|too large|无法|不支持|格式|下载|过大)/i.test(message);
  }

  function randomText(length, alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
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
      const bytes = Uint8Array.from(Array.from(value, char => {
        const code = char.charCodeAt(0);
        if (code <= 255) return code;
        if (windows1252.has(char)) return windows1252.get(char);
        throw new Error('not windows-1252');
      }));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return (decoded.match(/[\u4e00-\u9fff]/g) || []).length > (value.match(/[\u4e00-\u9fff]/g) || []).length ? decoded : value;
    } catch (error) {
      return value;
    }
  }

  function cleanDouyinAiText(text) {
    return repairMojibake(String(text || ''))
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?(?:span|div|p)[^>]*>/gi, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  function douyinAiQuestion() {
    return [
      '请只基于当前视频做详细拆解，不要泛泛讲同类题材。',
      '请用 Markdown 输出以下部分：',
      '1. 核心叙事与开场钩子；',
      '2. 带时间点证据的内容结构；',
      '3. 带时间点的节奏递进、转折和高光；',
      '4. 封面构图、文字、色彩与视觉焦点；',
      '5. 评论/收藏/分享诱因与 CTA；',
      '6. 可复刻的传播机制和不可照搬的表达。',
      '看不到或无法确认的内容请明确写“无法确认”，不要补造。'
    ].join('\n');
  }

  function buildDouyinAiStreamUrl(work) {
    if (!/^\d{8,}$/.test(work.id || '')) throw new Error('当前视频 ID 未识别，无法请求抖音 AI');
    const frameUrl = new URL(work.detailPageUrl || work.href || location.href, location.href);
    const params = new URLSearchParams({
      conversation_id: window.crypto?.randomUUID?.() || `${randomText(8)}-${randomText(4)}-${randomText(4)}-${randomText(4)}-${randomText(12)}`,
      pre_search_id: randomText(34),
      conversation_rank: '2',
      count: '5',
      cursor: '0',
      token: randomText(6, 'abcdefghijklmnopqrstuvwxyz'),
      ai_page_type: 'ai_chat',
      ai_search_enter_from_group_id: work.id,
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

  function consumeDouyinAiEvent(payload, cards) {
    if (Number(payload?.status_code || 200) !== 200) throw new Error(`抖音 AI 返回异常：${payload?.status_message || payload.status_code}`);
    for (const item of Array.isArray(payload?.data) ? payload.data : [payload?.data].filter(Boolean)) {
      const cardId = cleanText(item?.args?.id || item?.key) || `ai-card-${cards.size + 1}`;
      const spans = item?.display?.display?.generation_spans;
      if (!cards.has(cardId)) cards.set(cardId, '');
      if (Array.isArray(spans)) {
        for (const span of spans) {
          if (typeof span?.text?.content === 'string') cards.set(cardId, `${cards.get(cardId)}${span.text.content}`);
        }
      }
    }
  }

  async function readDouyinAiSse(response) {
    if (!response.ok || !response.body) throw new Error(`抖音 AI 请求失败：HTTP ${response.status}`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const cards = new Map();
    let buffer = '';
    let receivedBytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > 3500000) throw new Error('抖音 AI 返回内容过大，已停止读取');
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        try { consumeDouyinAiEvent(JSON.parse(line.slice(5)), cards); } catch (error) {
          if (/抖音 AI 返回异常/.test(error?.message || '')) throw error;
        }
      }
    }
    buffer += decoder.decode();
    if (buffer.startsWith('data:')) {
      try { consumeDouyinAiEvent(JSON.parse(buffer.slice(5)), cards); } catch (error) { /* incomplete tail */ }
    }
    const sections = Array.from(cards.values()).map(cleanDouyinAiText).filter(text => text.length >= 60);
    const answer = Array.from(new Set(sections)).join('\n\n').slice(0, 24000);
    if (!answer) throw new Error('抖音 AI 没有返回可用的视频拆解文本');
    return answer;
  }

  async function requestDouyinVideoAi(work) {
    if (!config.preferDouyinAi || work.kind !== '视频') return '';
    const mockSse = window.__tabbitDouyinCompetitorAnalyzerTestDouyinAiSse;
    if (config.testMode && mockSse) return readDouyinAiSse(new Response(typeof mockSse === 'function' ? await mockSse(work) : String(mockSse), { status: 200, headers: { 'content-type': 'text/event-stream' } }));
    const mock = window.__tabbitDouyinCompetitorAnalyzerTestDouyinAi;
    if (config.testMode && mock) return typeof mock === 'function' ? mock(work) : String(mock);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.douyinAiTimeoutMs);
    try {
      const response = await window.fetch(buildDouyinAiStreamUrl(work), { method: 'GET', credentials: 'include', headers: { Accept: 'text/event-stream' }, signal: controller.signal });
      return await readDouyinAiSse(response);
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('抖音 AI 请求超时');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  function replaceWork(updatedWork) {
    state.works = state.works.map(work => work.id === updatedWork.id ? updatedWork : work);
  }

  function refreshDerivedMetrics() {
    const detailed = new Map(state.works.map(work => [work.id, state.detailAnalyses.get(work.id)]));
    state.works = applyLocalAnalysis(state.works).map(work => {
      const detail = detailed.get(work.id);
      if (!detail?.result) return work;
      return { ...work, analysis: { ...work.analysis, coverStyle: detail.result.coverStyle || work.analysis.coverStyle, contentStructure: detail.result.contentStructure || work.analysis.contentStructure, videoPace: detail.result.videoPace || work.analysis.videoPace, interactionFeature: detail.result.interactionFeature || work.analysis.interactionFeature } };
    });
    const local = buildLocalReport(state.profile, state.works);
    if (state.report) state.report = { ...state.report, metrics: local.metrics };
  }

  async function fillAllMetrics() {
    if (state.metricQueue.running) return;
    const pending = state.works.filter(work => !work.metricsFetched);
    if (!pending.length) return;
    state.metricQueue = { running: true, completed: 0, total: pending.length, errors: 0 };
    updateReportStatus();
    renderActiveSection();
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const work = pending[cursor++];
        try {
          replaceWork(await deepScanWork(work, 'metrics'));
        } catch (error) {
          state.metricQueue.errors += 1;
          replaceWork({ ...work, metricError: cleanText(error?.message || error) });
        } finally {
          state.metricQueue.completed += 1;
          refreshDerivedMetrics();
          updateReportStatus();
          if (state.activeSection === 'works') renderActiveSection();
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(config.metricConcurrency, pending.length) }, worker));
    state.metricQueue.running = false;
    state.message = `互动数据补齐完成：${state.metricQueue.completed - state.metricQueue.errors}/${state.metricQueue.total} 条成功`;
    saveWorkspace();
    updateReportStatus();
    renderActiveSection();
  }

  async function fillOneMetric(workId) {
    const work = state.works.find(item => item.id === workId);
    if (!work || work.metricsFetched) return;
    replaceWork({ ...work, metricLoading: true });
    renderActiveSection();
    try {
      replaceWork(await deepScanWork(work, 'metrics'));
      refreshDerivedMetrics();
      saveWorkspace();
    } catch (error) {
      replaceWork({ ...work, metricLoading: false, metricError: cleanText(error?.message || error) });
    }
    renderActiveSection();
    updateReportStatus();
  }

  function deepAnalysisPrompt(work, nativeAiText, mediaNote = '') {
    return [
      '你是短视频内容导演与数据分析师。仅依据输入的视频画面/封面、标题、字幕、互动数据、热评以及抖音原生 AI 摘要做一次完整拆解，不得补造看不见的镜头或时间点。',
      '输出应足够详细，内容结构和节奏必须引用画面/字幕/时间点证据；没有证据就明确标注。互动特征应结合真实评论、收藏、分享数据，缺失值不可当作0。',
      '仅返回 JSON：{"summary":"","content_structure":"Markdown长文，含开场/展开/转折/结尾及证据","video_pace":"Markdown时间轴，含节奏变化和钩子","cover_style":"构图、文字、色彩、主体、可复刻规则","interaction_feature":"互动机制、评论需求、CTA","highlights":[""],"replication_advice":[""]}',
      `作品资料：${JSON.stringify({ id: work.id, title: work.title, likes: work.likeCount, comments: work.commentCount, collects: work.collectCount, shares: work.shareCount, duration: work.duration, chapters: work.chapters, hotComments: work.comments.slice(0, 10).map(item => item.content) })}`,
      work.transcript ? `详情页字幕/章节文本：\n${work.transcript.slice(0, 8000)}` : '',
      nativeAiText ? `抖音原生 AI 侧栏可读内容（仅作一份证据，需与其他可用证据互证）：\n${nativeAiText.slice(0, 12000)}` : '本次未读取到抖音原生 AI 侧栏内容，请直接基于已提供媒体分析。',
      mediaNote
    ].filter(Boolean).join('\n');
  }

  async function requestDeepAnalysis(enriched) {
    const baseOptions = { response_format: 'json' };
    const images = Array.from(new Set([enriched.frameImage, enriched.cover]
      .filter(value => /^(https?:|data:image\/)/i.test(value || '')))).slice(0, 2);
    if (images.length) baseOptions.images = images;
    const mediaUrl = config.preferDirectVideo && /^https?:/i.test(enriched.mediaUrl || '') ? enriched.mediaUrl : '';
    const mediaNote = enriched.frameImage
      ? '已提供从详情页当前视频元素截取的实际画面帧；它只能证明该帧可见内容，完整时间线仍以抖音原生 AI 或字幕/章节为准。'
      : '';
    if (!mediaUrl) {
      return {
        raw: await withTimeout(window.LLMBridge.chat(deepAnalysisPrompt(enriched, enriched.nativeAiText, mediaNote), baseOptions), config.llmTimeoutMs, '单视频详细分析超时'),
        videoFallbackError: '',
        mediaMode: enriched.frameImage ? 'frame' : images.length ? 'cover' : 'text'
      };
    }
    try {
      return {
        raw: await withTimeout(window.LLMBridge.chat(deepAnalysisPrompt(enriched, enriched.nativeAiText, mediaNote), { ...baseOptions, videos: [{ url: mediaUrl, fps: 0.5 }] }), config.llmTimeoutMs, '单视频详细分析超时'),
        videoFallbackError: '',
        mediaMode: 'video'
      };
    } catch (error) {
      if (!isRetryableVideoBridgeError(error)) throw error;
      const videoFallbackError = cleanText(error?.message || error);
      console.warn('[Tabbit Competitor Analyzer] 视频直传理解失败，移除视频后使用抖音 AI/封面/页面证据重试', { error: videoFallbackError });
      state.detailAnalyses.set(enriched.id, {
        status: 'running',
        stage: '视频源无法被模型读取，正在使用抖音 AI、封面与页面证据重试',
        videoFallbackError,
        startedAt: state.detailAnalyses.get(enriched.id)?.startedAt || new Date().toISOString()
      });
      renderDetailDrawer();
      const fallbackPrompt = deepAnalysisPrompt(enriched, enriched.nativeAiText, `${mediaNote}\n注意：视频 URL 直传失败，本次没有完整视频输入。时间点与镜头事实只能引用抖音原生 AI、页面章节、详情页画面帧或封面中明确可见的证据；其余必须标注“无法确认”。`);
      return {
        raw: await withTimeout(window.LLMBridge.chat(fallbackPrompt, baseOptions), config.llmTimeoutMs, '视频降级分析超时'),
        videoFallbackError,
        mediaMode: enriched.frameImage ? 'frame_fallback' : images.length ? 'cover_fallback' : 'text_fallback'
      };
    }
  }

  function normalizeDeepAnalysis(parsed) {
    return {
      summary: cleanText(parsed?.summary),
      contentStructure: String(parsed?.content_structure || '').trim(),
      videoPace: String(parsed?.video_pace || '').trim(),
      coverStyle: String(parsed?.cover_style || '').trim(),
      interactionFeature: String(parsed?.interaction_feature || '').trim(),
      highlights: safeList(parsed?.highlights, [], 12),
      replicationAdvice: safeList(parsed?.replication_advice, [], 10)
    };
  }

  async function analyzeWorkDeep(workId) {
    const existing = state.detailAnalyses.get(workId);
    if (existing?.status === 'running') return;
    const work = state.works.find(item => item.id === workId);
    if (!work) return;
    state.activeWorkId = workId;
    state.detailAnalyses.set(workId, { status: 'running', stage: '正在加载作品详情与媒体', startedAt: new Date().toISOString() });
    renderDetailDrawer();
    try {
      let enriched = await deepScanWork(work, 'full', true);
      const currentNative = extractWorkId(location.href) === workId ? extractNativeAiText(document) : '';
      const sidebarText = currentNative || enriched.nativeAiText || '';
      let douyinAiText = '';
      let douyinAiError = '';
      state.detailAnalyses.set(workId, { status: 'running', stage: '正在调用抖音原生 AI 理解当前视频', startedAt: existing?.startedAt || new Date().toISOString() });
      renderDetailDrawer();
      try {
        douyinAiText = await requestDouyinVideoAi(enriched);
      } catch (error) {
        douyinAiError = cleanText(error?.message || error);
        console.warn('[Tabbit Competitor Analyzer] 抖音 AI 不可用，使用侧栏或多模态回退', error);
      }
      enriched.nativeAiText = douyinAiText || sidebarText;
      enriched.douyinAiSource = douyinAiText ? 'api' : sidebarText ? 'sidebar' : '';
      replaceWork(enriched);
      refreshDerivedMetrics();
      const visualEvidence = enriched.frameImage ? '详情页视频帧' : '封面';
      state.detailAnalyses.set(workId, { status: 'running', stage: enriched.douyinAiSource === 'api' ? `已获得抖音 AI 视频理解，正在与${visualEvidence}/页面数据互证` : enriched.douyinAiSource === 'sidebar' ? `已读取抖音 AI 侧栏，正在与${visualEvidence}/页面数据互证` : `正在使用${visualEvidence}与页面数据进行多模态理解`, douyinAiError, startedAt: existing?.startedAt || new Date().toISOString() });
      renderDetailDrawer();
      if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') throw new Error('当前环境没有 LLMBridge.chat，无法进行视频理解');
      const { raw, videoFallbackError, mediaMode } = await requestDeepAnalysis(enriched);
      const result = normalizeDeepAnalysis(parseJson(raw));
      if (!result.contentStructure && !result.videoPace && !result.coverStyle) throw new Error('详细分析没有返回有效结构');
      const completed = { status: 'done', result, nativeAiUsed: Boolean(enriched.nativeAiText), douyinAiSource: enriched.douyinAiSource, douyinAiError, videoFallbackError, mediaMode, douyinAiText: String(enriched.nativeAiText || '').slice(0, 40000), completedAt: new Date().toISOString() };
      state.detailAnalyses.set(workId, completed);
      replaceWork({ ...enriched, analysis: { ...enriched.analysis, coverStyle: result.coverStyle || enriched.analysis.coverStyle, contentStructure: result.contentStructure || enriched.analysis.contentStructure, videoPace: result.videoPace || enriched.analysis.videoPace, interactionFeature: result.interactionFeature || enriched.analysis.interactionFeature } });
      saveWorkspace();
    } catch (error) {
      state.detailAnalyses.set(workId, { status: 'error', error: cleanText(error?.message || error), completedAt: new Date().toISOString() });
    }
    renderDetailDrawer();
    if (state.activeSection === 'works') renderActiveSection();
    updateReportStatus();
  }

  function classifyAngle(title) {
    if (/教程|步骤|学会|怎么|如何|方法|指南|攻略/.test(title)) return '教程/方法';
    if (/测评|对比|值不值|体验|开箱/.test(title)) return '测评/对比';
    if (/避坑|别再|千万|警惕|真相|陷阱/.test(title)) return '避坑/真相';
    if (/为什么|是不是|到底|？|\?/.test(title)) return '问题/解释';
    if (/故事|经历|我/.test(title)) return '经验/故事';
    return '观点/资讯';
  }

  function titleFormula(title) {
    const hooks = [];
    if (/\d/.test(title)) hooks.push('数字');
    if (/为什么|怎么|如何|到底|？|\?/.test(title)) hooks.push('疑问');
    if (/不|却|反而|真相|误解|陷阱|秘密/.test(title)) hooks.push('反差');
    if (/必须|千万|别|致命|终极|深度|硬核/.test(title)) hooks.push('强情绪');
    return `${title.length}字 · ${hooks.join('+') || '直述'} · 关键词前置`;
  }

  function localWorkAnalysis(work, averageLikes) {
    const topics = work.hashtags.length ? work.hashtags.slice(0, 4).join('、') : cleanText(work.title).split(/[，。！？,.!?：:#]/).filter(Boolean).slice(0, 2).join('、');
    const ratio = averageLikes ? work.likeCount / averageLikes : 0;
    const comments = work.comments.map(item => item.content);
    const questions = comments.filter(text => /[？?]|怎么|为什么|求|哪里|多少|能不能/.test(text));
    return {
      topicAngle: `${classifyAngle(work.title)}；主题：${topics || '待识别'}`,
      titlePattern: titleFormula(work.title),
      coverStyle: work.cover ? '已获取封面 · 点击“详细分析”进行视觉理解' : '未读取到封面',
      contentStructure: work.chapters.length ? `页面章节证据：${work.chapters.slice(0, 4).join(' → ')}` : '未深读视频 · 点击后分析内容结构',
      videoPace: work.chapters.length ? `${work.duration || '时长未知'}；${work.chapters.length} 个页面章节节点` : '未深读视频 · 点击后分析节奏与时间轴',
      dataPerformance: `${formatMetric(work.likeCount)}赞 / ${formatOptionalMetric(work.commentCount)}评 / ${formatOptionalMetric(work.collectCount)}藏 / ${formatOptionalMetric(work.shareCount)}分享；为账号均值 ${ratio ? `${ratio.toFixed(1)}×` : '—'}`,
      commentInsight: comments.length ? `${comments.length} 条热评；${questions.length} 条问题型需求${questions[0] ? `，例如“${questions[0].slice(0, 42)}”` : ''}` : '未深读评论，暂以标题与互动数据判断',
      interactionFeature: work.commentCount !== null ? `评论/点赞 ${(work.commentCount / Math.max(1, work.likeCount) * 100).toFixed(2)}%；热评样本 ${comments.length} 条` : '互动数据未补齐 · 点击后获取',
      isViral: averageLikes > 0 && work.likeCount >= averageLikes * 3,
      viralMultiple: ratio
    };
  }

  function applyLocalAnalysis(works) {
    const meanLikes = average(works.filter(work => !work.pinned).map(work => work.likeCount)) || average(works.map(work => work.likeCount));
    return works.map(work => ({ ...work, analysis: localWorkAnalysis(work, meanLikes) }));
  }

  function analysisPrompt(batch) {
    const rows = batch.map(work => ({
      id: work.id,
      kind: work.kind,
      title: work.title.slice(0, 700),
      hashtags: work.hashtags,
      likes: work.likeCount,
      comments: work.commentCount,
      collects: work.collectCount,
      shares: work.shareCount,
      duration: work.duration,
      chapters: work.chapters,
      hot_comments: work.comments.slice(0, 8).map(item => item.content)
    }));
    return [
      '你是短视频对标账号研究员。逐条拆解抖音作品，只依据输入证据，不得捏造画面、剪辑点或评论。',
      '为每条作品只输出可由文本与互动证据支撑的字段：选题角度、标题套路、数据表现、评论洞察、互动特征。',
      '不要输出或猜测封面风格、内容结构、视频节奏；这些维度必须由用户点击后通过多模态视频分析获得。',
      '评论洞察必须优先提取问题、反对意见、未满足需求和潜在选题；数据表现要引用真实数字。',
      '仅返回 JSON：{"items":[{"id":"作品ID","topic_angle":"","title_pattern":"","data_performance":"","comment_insight":"","interaction_feature":""}]}',
      `作品数据：${JSON.stringify(rows)}`
    ].join('\n');
  }

  async function enrichWorksWithAi(works) {
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') return works;
    const batches = [];
    for (let index = 0; index < works.length; index += config.analysisBatchSize) batches.push(works.slice(index, index + config.analysisBatchSize));
    const results = new Map();
    let cursor = 0;
    const worker = async () => {
      while (cursor < batches.length) {
        const batchIndex = cursor++;
        const batch = batches[batchIndex];
        if (state.cancelled) return;
        setProgress(58 + Math.round(batchIndex / Math.max(1, batches.length) * 16), `AI 逐条拆解 ${batchIndex + 1}/${batches.length} 批`);
        try {
          const raw = await withTimeout(window.LLMBridge.chat(analysisPrompt(batch), { response_format: 'json' }), config.llmTimeoutMs, '逐条拆解超时');
          const parsed = parseJson(raw);
          (Array.isArray(parsed.items) ? parsed.items : []).forEach(item => results.set(String(item.id), item));
        } catch (error) {
          console.warn('[Tabbit Competitor Analyzer] 逐条 AI 拆解失败，保留本地结果', error);
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(config.analysisConcurrency, batches.length) }, worker));
    return works.map(work => {
      const ai = results.get(work.id);
      if (!ai) return work;
      const fallback = work.analysis;
      return {
        ...work,
        analysis: {
          ...fallback,
          topicAngle: cleanText(ai.topic_angle) || fallback.topicAngle,
          titlePattern: cleanText(ai.title_pattern) || fallback.titlePattern,
          dataPerformance: cleanText(ai.data_performance) || fallback.dataPerformance,
          commentInsight: cleanText(ai.comment_insight) || fallback.commentInsight,
          interactionFeature: cleanText(ai.interaction_feature) || fallback.interactionFeature
        }
      };
    });
  }

  function buildLocalReport(profile, works) {
    const meanLikes = average(works.map(work => work.likeCount));
    const meanComments = average(works.map(work => work.commentCount));
    const meanCollects = average(works.map(work => work.collectCount));
    const metricsCoverage = works.length ? works.filter(work => work.metricsFetched).length / works.length : 0;
    const viralWorks = works.filter(work => work.analysis?.isViral).sort((left, right) => right.likeCount - left.likeCount);
    const topWorks = [...works].sort((left, right) => right.likeCount - left.likeCount).slice(0, 5);
    const tags = new Map();
    works.flatMap(work => work.hashtags).forEach(tag => tags.set(tag, (tags.get(tag) || 0) + 1));
    const topTags = Array.from(tags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([tag, count]) => `${tag} ${count}条`);
    const allComments = works.flatMap(work => work.comments.map(comment => ({ ...comment, workId: work.id, workTitle: work.title })));
    const questions = allComments.filter(comment => /[？?]|怎么|为什么|求|哪里|多少|能不能/.test(comment.content)).sort((a, b) => b.likes - a.likes);
    const score = Math.max(20, Math.min(96, Math.round(52 + Math.log10(Math.max(1, meanLikes)) * 7 + Math.min(12, viralWorks.length * 3))));
    return {
      accountSummary: {
        positioning: profile.bio || `围绕${topTags.slice(0, 3).join('、') || '核心垂类'}持续创作`,
        contentDirections: topTags.length ? topTags : ['内容方向待 AI 聚合'],
        mainFormat: works.filter(work => work.kind === '视频').length >= works.length / 2 ? '视频为主' : '图文为主',
        growthSummary: '主页作品默认按新到旧排序；深读样本含发布时间时，可在趋势模块复核阶段性变化。'
      },
      metrics: { meanLikes, meanComments, meanCollects, metricsCoverage, viralCount: viralWorks.length, viralRate: works.length ? viralWorks.length / works.length : 0 },
      viralRules: [
        `高表现作品集中在：${topWorks.slice(0, 3).map(work => work.hashtags[0] || classifyAngle(work.title)).join('、') || '核心垂类'}`,
        `标题常用：${topWorks.slice(0, 3).map(work => titleFormula(work.title).split(' · ')[1]).join('、') || '明确主题'}，快速制造点击理由`,
        `爆款阈值按账号作品平均点赞的 3 倍计算，本次识别 ${viralWorks.length} 条`
      ],
      gaps: questions.slice(0, 5).map(comment => ({ title: comment.content.slice(0, 34), pain: `用户在“${comment.workTitle.slice(0, 28)}”评论中主动追问`, signal: `${formatMetric(comment.likes)} 个赞同信号`, action: `围绕该问题制作一条直接回答型内容，并在开头复述评论原问题` })),
      templates: {
        titles: ['【深度】{对象}：{反常识结论}', '为什么{常见现象}，真正原因是{底层机制}？', '{对象}的{秘密/陷阱/权力游戏}：一口气看懂'],
        structures: ['3秒抛出反常识结论 → 背景冲突 → 3个证据 → 回扣结论 → 评论提问', '典型案例开场 → 拆底层机制 → 横向对比 → 给观众行动建议'],
        covers: ['一个核心主体＋4～8字强结论＋高对比色块', '人物/对象近景＋问题句＋单一视觉隐喻']
      },
      commentInsights: {
        summary: allComments.length ? `已抽样 ${allComments.length} 条热门评论，其中问题型需求 ${questions.length} 条。` : '当前未深读评论；可提高“深读爆款数”后重新分析。',
        questions: questions.slice(0, 8).map(comment => comment.content),
        unmetNeeds: questions.slice(0, 5).map(comment => `直接回答：${comment.content.slice(0, 50)}`)
      },
      scores: { contentQuality: score, viralPower: Math.min(100, Math.round(35 + viralWorks.length * 12)), stickiness: Math.min(100, Math.round(35 + Math.log10(Math.max(1, meanComments)) * 14)), growth: Math.min(92, score - 4), commercial: Math.min(90, Math.round(42 + topTags.length * 6)) },
      tags: topTags.slice(0, 5).map(value => value.split(' ')[0]),
      conclusion: `账号的确定性优势是${topTags.slice(0, 3).join('、') || '稳定垂类输出'}。下一步优先复刻高表现标题结构，并用评论区高赞问题验证新选题。`,
      source: 'local'
    };
  }

  function aggregatePrompt(profile, works, fallback) {
    const compactWorks = works.map(work => ({ id: work.id, title: work.title.slice(0, 500), likes: work.likeCount, comments: work.commentCount, collects: work.collectCount, shares: work.shareCount, publish_time: work.publishTime, viral: work.analysis.isViral, topic: work.analysis.topicAngle, title_pattern: work.analysis.titlePattern, comment_insight: work.analysis.commentInsight, hot_comments: work.comments.slice(0, 5).map(item => item.content) }));
    return [
      '你是资深短视频增长策略师。基于抖音对标账号的真实扫描数据，输出能直接指导下一步创作的账号分析报告。',
      '禁止空泛夸奖和补造数据；所有规律必须可回指作品标题、互动数字或评论。赛道空位必须同时包含用户痛点、热度信号、可执行建议。',
      '爆款定义固定为点赞数大于账号样本平均值3倍。评分必须保守，并说明是本次样本评分。',
      `用户特别关注：${state.requirement}`,
      '仅返回 JSON，结构：{"account_summary":{"positioning":"一句定位","content_directions":[""],"main_format":"","growth_summary":""},"viral_rules":[{"rule":"规律","evidence":["作品或数字"]}],"gaps":[{"title":"方向","pain":"用户痛点","signal":"真实热度信号","action":"可执行建议"}],"templates":{"titles":[""],"structures":[""],"covers":[""]},"comment_insights":{"summary":"","questions":[""],"unmet_needs":[""]},"scores":{"content_quality":0,"viral_power":0,"stickiness":0,"growth":0,"commercial":0},"tags":["#标签"],"conclusion":"明确写下一步做什么"}',
      `账号：${JSON.stringify(profile)}`,
      `作品：${JSON.stringify(compactWorks)}`,
      `本地统计基线：${JSON.stringify(fallback)}`
    ].join('\n');
  }

  function normalizeReport(parsed, fallback) {
    const summary = parsed?.account_summary || {};
    const templates = parsed?.templates || {};
    const comments = parsed?.comment_insights || {};
    const scores = parsed?.scores || {};
    const viralRules = (Array.isArray(parsed?.viral_rules) ? parsed.viral_rules : []).map(item => typeof item === 'string' ? item : `${cleanText(item.rule)}${Array.isArray(item.evidence) && item.evidence.length ? `（证据：${item.evidence.map(cleanText).join('；')}）` : ''}`).filter(Boolean).slice(0, 5);
    const gaps = (Array.isArray(parsed?.gaps) ? parsed.gaps : []).map(item => ({ title: cleanText(item.title), pain: cleanText(item.pain), signal: cleanText(item.signal), action: cleanText(item.action) })).filter(item => item.title && item.action).slice(0, 5);
    const score = (key, fallbackValue) => Math.max(0, Math.min(100, Math.round(Number(scores[key]) || fallbackValue)));
    return {
      ...fallback,
      accountSummary: {
        positioning: cleanText(summary.positioning) || fallback.accountSummary.positioning,
        contentDirections: safeList(summary.content_directions, fallback.accountSummary.contentDirections, 6),
        mainFormat: cleanText(summary.main_format) || fallback.accountSummary.mainFormat,
        growthSummary: cleanText(summary.growth_summary) || fallback.accountSummary.growthSummary
      },
      viralRules: viralRules.length >= 3 ? viralRules : fallback.viralRules,
      gaps: gaps.length >= 3 ? gaps : fallback.gaps,
      templates: {
        titles: safeList(templates.titles, fallback.templates.titles, 6),
        structures: safeList(templates.structures, fallback.templates.structures, 5),
        covers: safeList(templates.covers, fallback.templates.covers, 5)
      },
      commentInsights: {
        summary: cleanText(comments.summary) || fallback.commentInsights.summary,
        questions: safeList(comments.questions, fallback.commentInsights.questions, 10),
        unmetNeeds: safeList(comments.unmet_needs, fallback.commentInsights.unmetNeeds, 8)
      },
      scores: {
        contentQuality: score('content_quality', fallback.scores.contentQuality),
        viralPower: score('viral_power', fallback.scores.viralPower),
        stickiness: score('stickiness', fallback.scores.stickiness),
        growth: score('growth', fallback.scores.growth),
        commercial: score('commercial', fallback.scores.commercial)
      },
      tags: safeList(parsed?.tags, fallback.tags, 8),
      conclusion: cleanText(parsed?.conclusion) || fallback.conclusion,
      source: 'ai'
    };
  }

  async function buildReport(profile, works) {
    const fallback = buildLocalReport(profile, works);
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') return fallback;
    try {
      setProgress(78, 'AI 正在横向归纳爆款逻辑、赛道空位与复刻模板');
      const raw = await withTimeout(window.LLMBridge.chat(aggregatePrompt(profile, works, fallback), { response_format: 'json' }), config.llmTimeoutMs, '账号聚合分析超时');
      return normalizeReport(parseJson(raw), fallback);
    } catch (error) {
      console.warn('[Tabbit Competitor Analyzer] 聚合分析失败，使用本地报告', error);
      return fallback;
    }
  }

  function overallScore(report) {
    const values = Object.values(report?.scores || {}).map(Number).filter(Number.isFinite);
    return values.length ? Math.round(average(values)) : 0;
  }

  function setProgress(percent, message) {
    state.progress = Math.max(0, Math.min(100, Math.round(percent)));
    state.message = message;
    if (!state.ui?.progress) return;
    state.ui.progress.style.width = `${state.progress}%`;
    state.ui.progressValue.textContent = `${state.progress}%`;
    state.ui.progressMessage.textContent = message;
  }

  async function runAnalysis(options = {}) {
    if (state.running) return;
    if (!isDouyinProfilePage() && !config.testMode) {
      openSheet('error', '请先打开任意抖音博主主页（网址包含 /user/），再启动对标账号分析。');
      return;
    }
    state.running = true;
    state.cancelled = false;
    state.lastError = '';
    state.phase = 'scanning';
    state.requirement = cleanText(options.requirement ?? state.ui?.requirement?.value ?? state.requirement) || state.requirement;
    state.maxItems = clampInt(options.maxItems ?? state.ui?.maxItems?.value, 1, 500, config.maxItems);
    state.deepSample = clampInt(options.deepSample ?? state.ui?.deepSample?.value, 0, 20, config.deepSample);
    renderProgressScreen();
    try {
      setProgress(3, '正在识别对标账号资料');
      state.profile = extractProfile();
      loadWorkspace();
      state.works = await scanProfileWorks();
      if (!state.works.length) throw new Error('没有读取到作品，请确认账号作品对登录用户可见。');
      state.phase = 'deep-scan';
      state.works = await deepScanTopWorks(state.works);
      state.phase = 'analysis';
      state.works = applyLocalAnalysis(state.works);
      state.works = await enrichWorksWithAi(state.works);
      state.report = await buildReport(state.profile, state.works);
      state.phase = 'done';
      setProgress(100, `完成：扫描 ${state.works.length} 条，深读 ${state.works.filter(work => work.deepScanned).length} 条`);
      await sleep(240);
      renderReport();
    } catch (error) {
      state.lastError = cleanText(error?.message || error);
      state.phase = 'error';
      openSheet('error', state.lastError || '对标账号分析失败');
    } finally {
      state.running = false;
    }
  }

  function requestStop() {
    state.cancelled = true;
    setProgress(state.progress, '正在停止并保留已读取数据…');
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function filename(extension) {
    const name = cleanText(state.profile?.nickname || '抖音对标账号').replace(/[\\/:*?"<>|]/g, '').slice(0, 36);
    return `${name}-对标账号分析-${new Date().toISOString().slice(0, 10)}.${extension}`;
  }

  function markdownReport() {
    const report = state.report;
    const profile = state.profile;
    if (!report || !profile) return '';
    const lines = [
      `# ${profile.nickname}｜抖音对标账号分析`, '',
      `> 样本：${state.works.length} 条作品；深读 ${state.works.filter(work => work.deepScanned).length} 条；生成于 ${new Date().toLocaleString()}`, '',
      '## 首页摘要', '',
      `- 定位：${report.accountSummary.positioning}`,
      `- 主推形式：${report.accountSummary.mainFormat}`,
      `- 爆款率：${report.metrics.viralCount}/${state.works.length}（${(report.metrics.viralRate * 100).toFixed(1)}%）`,
      `- 平均点赞：${formatMetric(report.metrics.meanLikes)}`,
      `- 结论：${report.conclusion}`, '',
      '## 爆款逻辑', '', ...report.viralRules.map((item, index) => `${index + 1}. ${item}`), '',
      '## 赛道空位', ''
    ];
    report.gaps.forEach((gap, index) => lines.push(`${index + 1}. **${gap.title}**`, `   - 痛点：${gap.pain}`, `   - 信号：${gap.signal}`, `   - 建议：${gap.action}`));
    lines.push('', '## 复刻模板', '', '### 标题模板', ...report.templates.titles.map(item => `- ${item}`), '', '### 结构模板', ...report.templates.structures.map(item => `- ${item}`), '', '## 评论洞察', '', report.commentInsights.summary, ...report.commentInsights.unmetNeeds.map(item => `- ${item}`), '', '## 作品全表', '', '| 作品 | 点赞 | 选题角度 | 标题套路 | 数据表现 | 评论洞察 |', '|---|---:|---|---|---|---|');
    state.works.forEach(work => lines.push(`| [${work.title.replace(/\|/g, '\\|').slice(0, 80)}](${work.href}) | ${work.likeCount} | ${work.analysis.topicAngle.replace(/\|/g, '\\|')} | ${work.analysis.titlePattern.replace(/\|/g, '\\|')} | ${work.analysis.dataPerformance.replace(/\|/g, '\\|')} | ${work.analysis.commentInsight.replace(/\|/g, '\\|')} |`));
    if (state.notes.length) lines.push('', '## 我的笔记', '', ...state.notes.map(note => `- [${note.sectionLabel}] ${note.text}`));
    return lines.join('\n');
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function csvReport() {
    const header = ['序号', '作品ID', '标题', '链接', '点赞', '评论', '收藏', '分享', '发布时间', '爆款', '选题角度', '标题套路', '封面风格', '内容结构', '视频节奏', '数据表现', '评论洞察', '互动特征'];
    const rows = state.works.map((work, index) => [index + 1, work.id, work.title, work.href, work.likeCount, work.commentCount, work.collectCount, work.shareCount, work.publishTime, work.analysis.isViral ? '是' : '否', work.analysis.topicAngle, work.analysis.titlePattern, work.analysis.coverStyle, work.analysis.contentStructure, work.analysis.videoPace, work.analysis.dataPerformance, work.analysis.commentInsight, work.analysis.interactionFeature]);
    return '\ufeff' + [header, ...rows].map(row => row.map(csvCell).join(',')).join('\n');
  }

  function trendSvg() {
    const items = state.works.filter(work => !work.pinned).slice().reverse();
    if (!items.length) return '<div class="empty">暂无趋势数据</div>';
    const width = 900;
    const height = 320;
    const margin = { top: 22, right: 28, bottom: 58, left: 78 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const rawMax = Math.max(...items.map(work => work.likeCount), 1);
    const magnitude = 10 ** Math.floor(Math.log10(rawMax));
    const normalized = rawMax / magnitude;
    const niceFactor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    const max = niceFactor * magnitude;
    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, index) => {
      const value = max * index / yTickCount;
      const y = margin.top + plotHeight - value / max * plotHeight;
      return { value, y };
    });
    const points = items.map((work, index) => {
      const x = margin.left + index / Math.max(1, items.length - 1) * plotWidth;
      const y = margin.top + plotHeight - work.likeCount / max * plotHeight;
      return { x, y, work, index };
    });
    const xTickIndexes = Array.from(new Set(Array.from({ length: Math.min(6, items.length) }, (_, index) => Math.round(index * (items.length - 1) / Math.max(1, Math.min(6, items.length) - 1)))));
    const xLabel = point => {
      const date = cleanText(point.work.publishTime).match(/(?:\d{4}[-/.年])?(\d{1,2})[-/.月](\d{1,2})/) ;
      return date ? `${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}` : `作品${point.index + 1}`;
    };
    const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const grid = yTicks.map(tick => `<g class="trend-grid"><line x1="${margin.left}" y1="${tick.y}" x2="${width - margin.right}" y2="${tick.y}"/><text x="${margin.left - 12}" y="${tick.y + 4}" text-anchor="end">${escapeHtml(formatMetric(tick.value))}</text></g>`).join('');
    const xTicks = xTickIndexes.map(index => {
      const point = points[index];
      return `<g class="trend-x-tick"><line x1="${point.x}" y1="${height - margin.bottom}" x2="${point.x}" y2="${height - margin.bottom + 6}"/><text x="${point.x}" y="${height - margin.bottom + 22}" text-anchor="middle">${escapeHtml(xLabel(point))}</text></g>`;
    }).join('');
    return `<svg class="trend" viewBox="0 0 ${width} ${height}" role="img" aria-label="作品点赞趋势，纵轴为点赞数，横轴为发布时间或作品顺序"><defs><linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6c5ce7" stop-opacity=".35"/><stop offset="1" stop-color="#6c5ce7" stop-opacity="0"/></linearGradient></defs>${grid}<line class="trend-axis" x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}"/><line class="trend-axis" x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}"/>${xTicks}<text class="trend-axis-title" x="18" y="${margin.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 18 ${margin.top + plotHeight / 2})">点赞数</text><text class="trend-axis-title" x="${margin.left + plotWidth / 2}" y="${height - 8}" text-anchor="middle">发布时间 / 作品顺序</text><path d="${path} L${points.at(-1).x},${height - margin.bottom} L${points[0].x},${height - margin.bottom} Z" fill="url(#trend-fill)"/><path d="${path}" fill="none" stroke="#6c5ce7" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${points.map(point => `<g data-open-work="${point.work.id}" class="trend-point"><circle cx="${point.x}" cy="${point.y}" r="10" fill="transparent"/><circle cx="${point.x}" cy="${point.y}" r="5" fill="white" stroke="#6c5ce7" stroke-width="3"/><title>${escapeHtml(point.work.publishTime ? `${point.work.publishTime} · ` : '')}${escapeHtml(point.work.title.slice(0, 60))}：${formatMetric(point.work.likeCount)}赞（点击查看）</title></g>`).join('')}</svg>`;
  }

  function scoreBars() {
    const labels = { contentQuality: '内容质量', viralPower: '爆款能力', stickiness: '用户粘性', growth: '成长性', commercial: '商业潜力' };
    return Object.entries(state.report.scores).map(([key, value]) => `<div class="score-row"><span>${labels[key] || key}</span><div><i style="width:${value}%"></i></div><b>${value}</b></div>`).join('');
  }

  function sectionHeader(kicker, title, text = '') {
    return `<div class="section-head"><span>${escapeHtml(kicker)}</span><h2>${escapeHtml(title)}</h2>${text ? `<p>${escapeHtml(text)}</p>` : ''}</div>`;
  }

  function compactAnalysis(value, fallback, limit = 92) {
    const text = cleanText(value) || fallback;
    return escapeHtml(text.length > limit ? `${text.slice(0, limit)}…` : text);
  }

  function statusPill(work) {
    if (work.metricLoading) return '<span class="status-pill running">获取中</span>';
    if (work.metricError) return `<span class="status-pill error" title="${escapeHtml(work.metricError)}">失败</span>`;
    return work.metricsFetched ? '<span class="status-pill done">已补齐</span>' : '<span class="status-pill pending">未获取</span>';
  }

  function percentile(values, ratio) {
    const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!sorted.length) return 0;
    return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))];
  }

  function renderSummarySection() {
    const profile = state.profile;
    const report = state.report;
    return `${sectionHeader('ACCOUNT OVERVIEW', '首页摘要', '先看结论，再进入逐条证据。')}
      <div class="hero-card">
        <div class="account-id">${profile.avatar ? `<img src="${escapeHtml(profile.avatar)}" alt="">` : '<span>DY</span>'}<div><small>对标账号</small><h3>${escapeHtml(profile.nickname)}</h3><p>${escapeHtml(report.accountSummary.positioning)}</p></div></div>
        <div class="overall"><b>${overallScore(report)}</b><span>账号评分 / 100</span></div>
      </div>
      <div class="metric-grid"><div><span>样本作品</span><b>${state.works.length}</b></div><div><span>爆款率</span><b>${(report.metrics.viralRate * 100).toFixed(1)}%</b></div><div><span>平均点赞</span><b>${formatMetric(report.metrics.meanLikes)}</b></div><div><span>平均收藏（已获取样本）</span><b>${formatMetric(report.metrics.meanCollects)}</b></div><div><span>互动数据覆盖</span><b>${state.works.filter(work => work.metricsFetched).length}/${state.works.length}</b></div></div>
      <div class="two-col"><article class="card"><h3>AI 结论：下一步做什么</h3><p class="lead">${escapeHtml(report.conclusion)}</p><div class="chips">${report.tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div></article><article class="card"><h3>五维评分</h3>${scoreBars()}</article></div>
      <article class="card"><h3>内容方向</h3><div class="chips large">${report.accountSummary.contentDirections.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div><p class="muted">${escapeHtml(report.accountSummary.growthSummary)}</p></article>`;
  }

  function renderWorksSection() {
    const queue = state.metricQueue;
    const rows = state.works.map((work, index) => {
      const detail = state.detailAnalyses.get(work.id);
      const detailLabel = detail?.status === 'running' ? '分析中…' : detail?.status === 'done' ? '查看详细分析' : '详细分析';
      return `<tr data-work-id="${work.id}" data-viral="${work.analysis.isViral ? '1' : '0'}"><td>${index + 1}</td><td class="work-cell">${work.cover ? `<img src="${escapeHtml(work.cover)}" data-cover-id="${work.id}" alt="">` : '<span class="cover-empty">DY</span>'}<div><button type="button" class="text-link" data-open-work="${work.id}">${escapeHtml(work.title.slice(0, 110))}</button><small>${work.publishTime ? escapeHtml(work.publishTime) : work.kind}${work.pinned ? ' · 置顶' : ''}</small><div class="row-actions"><a href="${escapeHtml(work.href)}" target="_blank" rel="noopener">打开原作</a><button type="button" data-analyze-work="${work.id}">${detailLabel}</button>${work.metricsFetched ? '' : `<button type="button" data-fill-metric="${work.id}" ${work.metricLoading ? 'disabled' : ''}>补互动</button>`}</div></div></td><td>${formatMetric(work.likeCount)}</td><td>${formatOptionalMetric(work.commentCount)}</td><td>${formatOptionalMetric(work.collectCount)}</td><td>${formatOptionalMetric(work.shareCount)}<small class="metric-state">${statusPill(work)}</small></td><td>${compactAnalysis(work.analysis.topicAngle, '待分析')}</td><td>${compactAnalysis(work.analysis.titlePattern, '待分析')}</td><td>${compactAnalysis(work.analysis.coverStyle, '点击详细分析')}</td><td>${compactAnalysis(work.analysis.contentStructure, '点击详细分析')}</td><td>${compactAnalysis(work.analysis.videoPace, '点击详细分析')}</td><td>${compactAnalysis(work.analysis.commentInsight, '暂无评论样本')}</td><td>${compactAnalysis(work.analysis.interactionFeature, '互动数据未补齐')}</td></tr>`;
    }).join('');
    const coverage = state.works.filter(work => work.metricsFetched).length;
    const progress = queue.running ? `正在补齐 ${queue.completed}/${queue.total}` : `已获取 ${coverage}/${state.works.length}`;
    return `${sectionHeader('CONTENT MATRIX', '作品全表', '缺失互动显示“未获取”，不会再伪装成 0；结构、节奏和封面由单条按钮按需深读。')}<div class="toolbar"><input class="work-search" placeholder="筛选标题、主题或洞察"><select class="viral-filter"><option value="all">全部作品</option><option value="viral">只看爆款</option><option value="normal">只看普通</option></select><button type="button" class="secondary fill-all-metrics" ${queue.running || coverage === state.works.length ? 'disabled' : ''}>${progress}</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>作品 / 操作</th><th>点赞</th><th>评论</th><th>收藏</th><th>分享 / 状态</th><th>选题角度</th><th>标题套路</th><th>封面风格</th><th>内容结构</th><th>视频节奏</th><th>评论洞察</th><th>互动特征</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderViralSection() {
    const likes = state.works.map(work => Number(work.likeCount) || 0);
    const ranked = [...state.works].sort((a, b) => b.likeCount - a.likeCount);
    const total = likes.reduce((sum, value) => sum + value, 0);
    const headShare = total ? ranked.slice(0, 3).reduce((sum, work) => sum + work.likeCount, 0) / total : 0;
    const threshold = state.report.metrics.meanLikes * 3;
    return `${sectionHeader('VIRAL PATTERNS', '爆款逻辑', `本模块同时展示阈值、分位数、头部集中度与逐条证据；点击作品可进入深度分析。`)}<div class="metric-grid"><div><span>爆款阈值</span><b>${formatMetric(threshold)}</b></div><div><span>点赞中位数</span><b>${formatMetric(percentile(likes, .5))}</b></div><div><span>P90 点赞</span><b>${formatMetric(percentile(likes, .9))}</b></div><div><span>Top3 点赞占比</span><b>${(headShare * 100).toFixed(1)}%</b></div><div><span>识别爆款</span><b>${state.report.metrics.viralCount} 条</b></div></div><div class="stack">${state.report.viralRules.map((rule, index) => `<article class="rule card"><b>${String(index + 1).padStart(2, '0')}</b><div><h3>${escapeHtml(rule.split('（证据：')[0])}</h3><p>${escapeHtml(rule)}</p></div></article>`).join('')}</div><div class="viral-grid">${ranked.slice(0, 8).map((work, index) => `<article class="viral-card card">${work.cover ? `<img src="${escapeHtml(work.cover)}" alt="">` : ''}<div><small>#${index + 1} · ${formatMetric(work.likeCount)}赞 · ${formatOptionalMetric(work.collectCount)}藏</small><h3>${escapeHtml(work.title.slice(0, 76))}</h3><p>${compactAnalysis(work.analysis.titlePattern, '待分析', 120)}</p><div class="row-actions"><button type="button" data-open-work="${work.id}">查看证据</button><button type="button" data-analyze-work="${work.id}">${state.detailAnalyses.get(work.id)?.status === 'done' ? '查看深析' : '单条深析'}</button></div></div></article>`).join('')}</div>`;
  }

  function renderGapsSection() {
    return `${sectionHeader('NEXT MOVES', '赛道空位', '把评论里的追问和内容矩阵的缺口，转成下一批可执行选题。')}<div class="gap-grid">${state.report.gaps.map((gap, index) => `<article class="gap card"><span>机会 ${index + 1}</span><h3>${escapeHtml(gap.title)}</h3><dl><dt>用户痛点</dt><dd>${escapeHtml(gap.pain)}</dd><dt>热度信号</dt><dd>${escapeHtml(gap.signal)}</dd><dt>可执行建议</dt><dd class="action">${escapeHtml(gap.action)}</dd></dl></article>`).join('') || '<div class="empty">深读评论样本不足，建议提高深读爆款数后重新分析。</div>'}</div>`;
  }

  function renderTemplatesSection() {
    const group = (title, items) => `<article class="card template"><h3>${title}</h3>${items.map((item, index) => `<div><b>${index + 1}</b><p>${escapeHtml(item)}</p><button type="button" data-copy="${escapeHtml(item)}">复制</button></div>`).join('')}</article>`;
    const history = state.replicationChat.map(item => `<article class="chat-item"><div><b>${escapeHtml(item.brief)}</b><small>${new Date(item.createdAt).toLocaleString()}</small></div><h4>标题</h4><ol>${item.titles.map(title => `<li>${escapeHtml(title)} <button type="button" data-copy="${escapeHtml(title)}">复制</button></li>`).join('')}</ol><h4>选题</h4><ol>${item.topics.map(topic => `<li>${escapeHtml(topic)} <button type="button" data-copy="${escapeHtml(topic)}">复制</button></li>`).join('')}</ol>${item.rationale ? `<p>${escapeHtml(item.rationale)}</p>` : ''}</article>`).join('');
    return `${sectionHeader('REPLICATION KIT', '复刻模板 + AI 共创', '先复用信息结构，再让 AI 结合你的目标受众生成原创标题和选题。')}<div class="template-grid">${group('标题模板', state.report.templates.titles)}${group('内容结构模板', state.report.templates.structures)}${group('封面模板', state.report.templates.covers)}</div><article class="card co-create"><h3>和 AI 一起做标题与选题</h3><label>创作目标 / 受众 / 约束<textarea class="replication-brief" placeholder="例如：面向 10 人以内创业团队，做一条 90 秒视频，讲清第一个 AI 工作流怎么落地"></textarea></label><div class="chips quick-briefs"><button type="button" data-brief="把当前最高赞选题改成适合普通人的90秒版本">普通人版</button><button type="button" data-brief="从评论区未满足需求生成下一期选题">评论驱动</button><button type="button" data-brief="保留传播机制但避开原作者表达，生成3个差异化方向">差异化复刻</button></div><button type="button" class="primary run-replication-ai">生成标题 + 选题</button><p class="muted replication-status"></p><div class="chat-history">${history || '<div class="empty">共创记录会保存在当前账号工作区。</div>'}</div></article>`;
  }

  function coverModelLabel(tier = state.coverImageModelTier) {
    return tier === 'pro' ? 'Seedream 5.0 Pro' : 'Seedream 5.0 Lite';
  }

  function closestCoverAspectRatio(width, height) {
    const value = Number(width) / Math.max(1, Number(height));
    if (!Number.isFinite(value) || value <= 0) return '9:16';
    return COVER_ASPECT_RATIOS.map(ratio => {
      const [w, h] = ratio.split(':').map(Number);
      return [ratio, Math.abs(w / h - value)];
    }).sort((left, right) => left[1] - right[1])[0][0];
  }

  function selectedCoverReferenceTask(work) {
    const taskId = work ? state.coverEditBaseByWork[work.id] : '';
    return state.coverTasks.find(task => task.id === taskId && task.workId === work?.id && task.status === 'done' && task.source) || null;
  }

  function resolvedCoverAspectRatio(work, referenceTask = selectedCoverReferenceTask(work)) {
    if (COVER_ASPECT_RATIOS.includes(state.coverAspectRatio)) return state.coverAspectRatio;
    if (COVER_ASPECT_RATIOS.includes(referenceTask?.aspectRatio)) return referenceTask.aspectRatio;
    return closestCoverAspectRatio(work?.coverWidth, work?.coverHeight);
  }

  function renderCoverSection() {
    const selected = state.works.find(work => work.id === state.activeCoverId) || [...state.works].sort((a, b) => b.likeCount - a.likeCount)[0];
    if (selected) state.activeCoverId = selected.id;
    const chronological = selected ? state.coverTasks.filter(task => task.workId === selected.id) : [];
    const tasks = chronological.slice().reverse();
    const latest = tasks.find(task => task.status === 'done' && task.source);
    const referenceTask = selectedCoverReferenceTask(selected);
    const resolvedRatio = selected ? resolvedCoverAspectRatio(selected, referenceTask) : '9:16';
    const history = tasks.map((task, reverseIndex) => {
      const version = task.version || Math.max(1, chronological.length - reverseIndex);
      const active = referenceTask?.id === task.id;
      return `<article class="cover-history-item ${escapeHtml(task.status)}${active ? ' active-reference' : ''}">${task.source ? `<img src="${escapeHtml(task.source)}" alt="生成历史">` : '<div class="history-placeholder">处理中</div>'}<div><div class="cover-history-title"><b>V${version} · ${task.status === 'done' ? '已完成' : task.status === 'error' ? '失败' : task.status === 'interrupted' ? '已中断' : '生成中'}</b>${active ? '<span>当前微调基准</span>' : ''}</div><small>${new Date(task.createdAt).toLocaleString()} · ${escapeHtml(task.modelLabel || coverModelLabel(task.modelTier))} · ${escapeHtml(task.aspectRatio || '比例未知')}</small><p>${escapeHtml(task.instruction)}</p>${task.error ? `<em>${escapeHtml(task.error)}</em>` : ''}<div class="row-actions">${task.source ? `<button type="button" data-download-task="${task.id}">保存</button><button type="button" data-refine-cover-task="${task.id}">${active ? '正在基于此图' : '以此图微调'}</button>` : ''}<button type="button" data-reuse-prompt="${task.id}">复用指令</button></div></div></article>`;
    }).join('');
    const ratioOptions = [`<option value="auto" ${state.coverAspectRatio === 'auto' ? 'selected' : ''}>跟随参考图（${resolvedRatio}）</option>`, ...COVER_ASPECT_RATIOS.map(ratio => `<option value="${ratio}" ${state.coverAspectRatio === ratio ? 'selected' : ''}>${ratio}</option>`)].join('');
    const sourceHint = referenceTask ? `当前以 V${referenceTask.version || '?'} 作为微调基准；下一次只修改指令指定内容。` : `默认读取原封面尺寸并适配到最接近的支持比例 ${resolvedRatio}。`;
    return `${sectionHeader('COVER STUDIO', '封面工坊', '支持模型与比例控制；生成后可任选历史版本继续微调，所有版本按账号持久保存。')}<div class="cover-workshop"><div class="cover-gallery">${[...state.works].filter(work => work.cover).sort((a, b) => b.likeCount - a.likeCount).slice(0, 12).map(work => `<button type="button" class="cover-choice${work.id === state.activeCoverId ? ' active' : ''}" data-cover-choice="${work.id}"><img src="${escapeHtml(work.cover)}" alt=""><span>${formatMetric(work.likeCount)}赞</span></button>`).join('')}</div><article class="card editor">${selected ? `<div class="compare"><figure><img src="${escapeHtml(selected.cover)}" alt="原封面"><figcaption>原始封面</figcaption></figure><figure class="generated">${latest ? `<img src="${escapeHtml(latest.source)}" alt="修改后封面">` : '<div>暂无完成结果</div>'}<figcaption>最近生成${latest?.version ? ` · V${latest.version}` : ''}</figcaption></figure></div><div class="cover-generation-controls"><fieldset><legend>生图模型</legend><div class="cover-model-switch"><button type="button" data-cover-model="lite" class="${state.coverImageModelTier === 'lite' ? 'active' : ''}"><b>Lite</b><small>速度优先</small></button><button type="button" data-cover-model="pro" class="${state.coverImageModelTier === 'pro' ? 'active' : ''}"><b>Pro</b><small>质量优先</small></button></div></fieldset><label>生图比例<select class="cover-aspect-ratio">${ratioOptions}</select><small>${state.coverAspectRatio === 'auto' && selected.coverWidth && selected.coverHeight ? `原图 ${selected.coverWidth}×${selected.coverHeight} → ${resolvedRatio}` : `本次输出 ${resolvedRatio}`}</small></label></div><div class="cover-edit-source"><div><b>${referenceTask ? '二次编辑模式' : '原图创作模式'}</b><span>${escapeHtml(sourceHint)}</span></div>${referenceTask ? '<button type="button" class="use-original-cover">改回基于原图</button>' : ''}</div><label>修改指令<textarea class="cover-prompt" placeholder="${referenceTask ? '例如：只把右下角标题放大 15%，其余构图、人物和配色保持不变' : '例如：保留信息层级，换成科技感蓝紫配色，把标题改成“AI Agent 的 3 个真相”'}"></textarea></label><div class="editor-actions"><button type="button" class="primary generate-cover">${referenceTask ? '基于当前版本继续微调' : '异步生成新封面'}</button>${latest ? `<button type="button" class="secondary" data-download-task="${latest.id}">保存最近结果</button>` : ''}</div><p class="muted cover-status">${tasks.some(task => task.status === 'running' || task.status === 'queued') ? '当前作品有生图任务正在后台执行。' : `${coverModelLabel()} · ${resolvedRatio} · 不会修改抖音原作品`}</p>` : '<div class="empty">未读取到可用封面</div>'}</article></div><article class="card cover-history"><h3>生图历史 · ${selected ? escapeHtml(selected.title.slice(0, 42)) : ''}</h3>${history || '<div class="empty">还没有生成记录</div>'}</article>`;
  }

  function renderCommentsSection() {
    const comments = state.works.flatMap(work => work.comments.map(comment => ({ ...comment, work }))).sort((a, b) => b.likes - a.likes).slice(0, 20);
    return `${sectionHeader('AUDIENCE VOICE', '评论洞察', state.report.commentInsights.summary)}<div class="two-col"><article class="card"><h3>高频问题</h3><ol>${state.report.commentInsights.questions.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>暂无问题型评论样本</li>'}</ol></article><article class="card"><h3>未满足需求 → 潜在选题</h3><ol>${state.report.commentInsights.unmetNeeds.map(item => `<li>${escapeHtml(item)}</li>`).join('') || '<li>提高深读样本后重新分析</li>'}</ol></article></div><article class="card"><h3>高赞评论证据</h3><div class="comment-list">${comments.map(comment => `<blockquote><p>${escapeHtml(comment.content)}</p><footer>${escapeHtml(comment.author || '抖音用户')} · ${formatMetric(comment.likes)}赞 · <a href="${escapeHtml(comment.work.href)}" target="_blank" rel="noopener">查看作品</a></footer></blockquote>`).join('') || '<div class="empty">本次未读取到评论</div>'}</div></article>`;
  }

  function renderTrendSection() {
    return `${sectionHeader('TIMELINE', '数据趋势', '按主页作品顺序还原发布节奏；鼠标悬停节点查看作品。')}<article class="card chart-card">${trendSvg()}<p>${escapeHtml(state.report.accountSummary.growthSummary)}</p></article><div class="metric-grid"><div><span>最高点赞</span><b>${formatMetric(Math.max(...state.works.map(work => work.likeCount)))}</b></div><div><span>点赞中位数</span><b>${formatMetric([...state.works].sort((a, b) => a.likeCount - b.likeCount)[Math.floor(state.works.length / 2)]?.likeCount || 0)}</b></div><div><span>深读作品</span><b>${state.works.filter(work => work.deepScanned).length}</b></div><div><span>评论样本</span><b>${state.works.reduce((sum, work) => sum + work.comments.length, 0)}</b></div><div><span>报告来源</span><b>${state.report.source === 'ai' ? 'AI+统计' : '本地统计'}</b></div></div>`;
  }

  function richInline(value) {
    return escapeHtml(value)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function markdownTableCells(line) {
    return String(line || '').trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
  }

  function isMarkdownTableDivider(line) {
    const cells = markdownTableCells(line);
    return cells.length >= 2 && cells.every(cell => /^:?-{3,}:?$/.test(cell));
  }

  function renderRichTable(header, rows) {
    const isTimeline = header.length >= 3 && /时间|区间/.test(header[0]) && /节奏/.test(header[1]) && /内容|钩子/.test(header[2]);
    if (isTimeline) {
      return `<div class="rich-timeline">${rows.map((cells, index) => `<div class="rich-timeline-item"><div class="rich-timeline-meta"><span>${richInline(cells[0] || `阶段 ${index + 1}`)}</span><i></i></div><div class="rich-timeline-card"><b>${richInline(cells[1] || '')}</b><p>${richInline(cells.slice(2).join(' · '))}</p></div></div>`).join('')}</div>`;
    }
    return `<div class="rich-table-wrap"><table class="rich-table"><thead><tr>${header.map(cell => `<th>${richInline(cell)}</th>`).join('')}</tr></thead><tbody>${rows.map(cells => `<tr>${header.map((_, index) => `<td>${richInline(cells[index] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function richText(value) {
    let source = String(value || '');
    if (/<\/?(?:p|div|li|h[1-6]|br|section|article)\b/i.test(source)) {
      const withBreaks = source.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|li|h[1-6]|section|article)>/gi, '\n');
      source = new DOMParser().parseFromString(withBreaks, 'text/html').body.textContent || '';
    }
    const lines = source.split(/\r?\n/);
    const output = [];
    for (let index = 0; index < lines.length;) {
      const line = lines[index];
      if (/^\s*\|.*\|\s*$/.test(line) && isMarkdownTableDivider(lines[index + 1] || '')) {
        const header = markdownTableCells(line);
        const rows = [];
        index += 2;
        while (index < lines.length && /^\s*\|.*\|\s*$/.test(lines[index])) {
          rows.push(markdownTableCells(lines[index]));
          index += 1;
        }
        output.push(renderRichTable(header, rows));
        continue;
      }
      if (/^###\s+/.test(line)) output.push(`<h5>${richInline(line.replace(/^###\s+/, ''))}</h5>`);
      else if (/^##\s+/.test(line)) output.push(`<h4>${richInline(line.replace(/^##\s+/, ''))}</h4>`);
      else if (/^#\s+/.test(line)) output.push(`<h3>${richInline(line.replace(/^#\s+/, ''))}</h3>`);
      else if (/^[-*]\s+/.test(line)) output.push(`<div class="rich-bullet">• ${richInline(line.replace(/^[-*]\s+/, ''))}</div>`);
      else if (/^\d+[.)]\s+/.test(line)) output.push(`<div class="rich-bullet">${richInline(line)}</div>`);
      else output.push(line.trim() ? `<p>${richInline(line)}</p>` : '<br>');
      index += 1;
    }
    return output.join('');
  }

  function renderDetailDrawer() {
    const drawer = state.shadow?.querySelector('.detail-drawer');
    if (!drawer) return;
    const work = state.works.find(item => item.id === state.activeWorkId);
    if (!work) {
      drawer.classList.remove('open');
      return;
    }
    const detail = state.detailAnalyses.get(work.id);
    const result = detail?.result;
    const evidenceLabel = detail?.videoFallbackError
      ? detail.douyinAiSource === 'api'
        ? detail.mediaMode === 'frame_fallback'
          ? '抖音原生 AI 对话已完成；视频直传不可用，已用详情页视频帧与页面数据完成结构化'
          : '抖音原生 AI 对话已完成；视频直传不可用，已用封面与页面数据完成结构化'
        : detail.douyinAiSource === 'sidebar'
          ? detail.mediaMode === 'frame_fallback'
            ? '已读取抖音 AI 侧栏；视频直传不可用，已用详情页视频帧与页面数据完成结构化'
            : '已读取抖音 AI 侧栏；视频直传不可用，已用封面与页面数据完成结构化'
          : detail.mediaMode === 'frame_fallback'
            ? '视频直传不可用，已按详情页视频帧、封面与页面数据降级分析'
            : '视频直传不可用，已仅按封面与页面数据降级分析'
      : detail?.douyinAiSource === 'api'
        ? detail.mediaMode === 'video'
          ? '抖音原生 AI 对话已完成，并与完整视频输入/页面数据互证'
          : detail.mediaMode === 'frame'
            ? '抖音原生 AI 对话已完成，并与详情页视频帧/页面数据互证'
            : '抖音原生 AI 对话已完成，并与封面/页面数据互证'
        : detail?.douyinAiSource === 'sidebar'
          ? detail.mediaMode === 'frame'
            ? '已读取抖音 AI 侧栏，并与详情页视频帧/页面数据互证'
            : '已适配页面中现有的抖音 AI 侧栏内容，再与封面/页面数据互证'
          : detail?.mediaMode === 'frame'
            ? '抖音 AI 不可用，已基于详情页视频帧、封面与页面数据降级分析'
            : '抖音 AI 不可用，已基于封面与页面数据降级分析';
    drawer.classList.add('open');
    drawer.innerHTML = `<header><div><small>单视频按需深度分析</small><h3>${escapeHtml(work.title.slice(0, 90))}</h3></div><button type="button" class="close-detail">×</button></header><div class="detail-body"><div class="detail-metrics"><span>${formatMetric(work.likeCount)}赞</span><span>${formatOptionalMetric(work.commentCount)}评</span><span>${formatOptionalMetric(work.collectCount)}藏</span><span>${formatOptionalMetric(work.shareCount)}分享</span></div>${!detail ? `<div class="empty"><p>这一步会读取抖音原生 AI、隐藏详情页视频帧/字幕、封面和互动数据，再一次性分析结构、节奏、视觉与互动机制。</p><button type="button" class="primary" data-analyze-work="${work.id}">开始详细分析</button></div>` : detail.status === 'running' ? `<div class="analysis-running"><i></i><h3>${escapeHtml(detail.stage || '正在分析')}</h3><p>可以切换到其他报告栏目，任务完成后结果仍会保留。</p></div>` : detail.status === 'error' ? `<div class="notice error">${escapeHtml(detail.error)}</div><button type="button" class="primary" data-analyze-work="${work.id}">重新分析</button>` : `<div class="native-ai-badge">${evidenceLabel}${detail.douyinAiError ? `<small title="${escapeHtml(detail.douyinAiError)}">原生 AI 回退原因可悬停查看</small>` : ''}${detail.videoFallbackError ? `<small title="${escapeHtml(detail.videoFallbackError)}">视频直传降级原因可悬停查看</small>` : ''}</div><button type="button" class="detail-reanalyze" data-analyze-work="${work.id}">重新分析本条</button>${detail.douyinAiText ? `<details class="native-raw"><summary>查看抖音 AI 原始拆解</summary><div class="rich-text">${richText(detail.douyinAiText)}</div></details>` : ''}<article><h3>核心总结</h3><p>${escapeHtml(result.summary)}</p></article><article><h3>内容结构</h3><div class="rich-text">${richText(result.contentStructure)}</div></article><article><h3>视频节奏与时间轴</h3><div class="rich-text">${richText(result.videoPace)}</div></article><article><h3>封面视觉</h3><div class="rich-text">${richText(result.coverStyle)}</div></article><article><h3>互动特征</h3><div class="rich-text">${richText(result.interactionFeature)}</div></article><article><h3>高光与复刻建议</h3><ul>${[...result.highlights, ...result.replicationAdvice].map(item => `<li>${escapeHtml(item)}</li>`).join('')}</ul></article>`}</div>`;
    drawer.querySelector('.close-detail')?.addEventListener('click', () => drawer.classList.remove('open'));
    drawer.querySelector('[data-analyze-work]')?.addEventListener('click', button => void analyzeWorkDeep(button.currentTarget.dataset.analyzeWork));
  }

  function notesMarkup() {
    const notes = state.notes.slice().reverse();
    return `<header><div><small>账号工作区</small><h3>我的笔记 <span>${notes.length}</span></h3></div><button type="button" class="close-notes">×</button></header><div class="note-compose"><textarea class="note-draft" placeholder="记录判断、选题、待验证假设；会标记当前栏目。"></textarea><button type="button" class="primary add-note">添加笔记</button></div><div class="note-list">${notes.map(note => `<article data-note-id="${note.id}"><small>${escapeHtml(note.sectionLabel)} · ${new Date(note.createdAt).toLocaleString()}</small><textarea data-note-edit="${note.id}">${escapeHtml(note.text)}</textarea><div class="row-actions"><button type="button" data-save-note="${note.id}">保存</button><button type="button" data-delete-note="${note.id}">删除</button></div></article>`).join('') || '<div class="empty">还没有笔记。它们会随当前账号持久保存。</div>'}</div>`;
  }

  function renderNotesDrawer() {
    const drawer = state.shadow?.querySelector('.notes-drawer');
    if (!drawer) return;
    drawer.classList.toggle('open', state.notesOpen);
    drawer.innerHTML = notesMarkup();
    drawer.querySelector('.close-notes')?.addEventListener('click', () => { state.notesOpen = false; renderNotesDrawer(); });
    drawer.querySelector('.add-note')?.addEventListener('click', () => {
      const text = cleanText(drawer.querySelector('.note-draft')?.value);
      if (!text) return;
      const label = reportNavItems().find(item => item[0] === state.activeSection)?.[1] || state.activeSection;
      state.notes.push({ id: `note-${Date.now()}`, text, section: state.activeSection, sectionLabel: label, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      saveWorkspace();
      renderNotesDrawer();
      updateReportStatus();
    });
    drawer.querySelectorAll('[data-save-note]').forEach(button => button.addEventListener('click', () => {
      const note = state.notes.find(item => item.id === button.dataset.saveNote);
      const text = cleanText(drawer.querySelector(`[data-note-edit="${CSS.escape(button.dataset.saveNote)}"]`)?.value);
      if (note && text) { note.text = text; note.updatedAt = new Date().toISOString(); saveWorkspace(); button.textContent = '已保存'; }
    }));
    drawer.querySelectorAll('[data-delete-note]').forEach(button => button.addEventListener('click', () => {
      state.notes = state.notes.filter(note => note.id !== button.dataset.deleteNote);
      saveWorkspace(); renderNotesDrawer(); updateReportStatus();
    }));
  }

  async function runReplicationAi() {
    const briefInput = state.shadow.querySelector('.replication-brief');
    const status = state.shadow.querySelector('.replication-status');
    const brief = cleanText(briefInput?.value);
    if (!brief) { if (status) status.textContent = '请先写清目标受众、时长或创作约束。'; return; }
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') { if (status) status.textContent = '当前环境没有 LLMBridge.chat。'; return; }
    const button = state.shadow.querySelector('.run-replication-ai');
    if (button) button.disabled = true;
    if (status) status.textContent = 'AI 正在结合爆款证据和评论需求生成…';
    try {
      const prompt = ['你是短视频选题策划。基于对标账号报告的真实证据，为用户的创作目标生成原创内容，不得照搬原作者标题。', '仅返回 JSON：{"titles":["5个可拍标题"],"topics":["5个差异化选题"],"rationale":"为何与对标账号受众匹配且有差异","next_questions":[""]}', `用户创作目标：${brief}`, `对标账号爆款规律：${JSON.stringify(state.report.viralRules)}`, `赛道空位：${JSON.stringify(state.report.gaps)}`, `模板：${JSON.stringify(state.report.templates)}`, `评论需求：${JSON.stringify(state.report.commentInsights.unmetNeeds)}`].join('\n');
      const parsed = parseJson(await withTimeout(window.LLMBridge.chat(prompt, { response_format: 'json' }), config.llmTimeoutMs, 'AI 共创超时'));
      const item = { id: `chat-${Date.now()}`, brief, titles: safeList(parsed.titles, [], 8), topics: safeList(parsed.topics, [], 8), rationale: cleanText(parsed.rationale), nextQuestions: safeList(parsed.next_questions, [], 5), createdAt: new Date().toISOString() };
      if (!item.titles.length && !item.topics.length) throw new Error('AI 未返回可用标题或选题');
      state.replicationChat.push(item);
      saveWorkspace();
      renderActiveSection();
    } catch (error) {
      if (status) status.textContent = `生成失败：${cleanText(error?.message || error)}`;
      if (button) button.disabled = false;
    }
  }

  function chatReferenceAnalysisPrompt(works) {
    let coverImageIndex = 0;
    const rows = works.map((work, index) => ({
      id: work.id,
      cover_image_index: /^(https?:|data:image\/)/i.test(work.cover || '') && coverImageIndex < 8 ? ++coverImageIndex : null,
      title: work.title.slice(0, 700),
      likes: work.likeCount,
      comments: work.commentCount,
      collects: work.collectCount,
      shares: work.shareCount,
      publish_time: work.publishTime,
      duration: work.duration,
      chapters: work.chapters,
      transcript: String(work.transcript || '').slice(0, 5000),
      douyin_ai: String(work.nativeAiText || '').slice(0, 8000),
      hot_comments: work.comments.slice(0, 10).map(item => ({ content: item.content, likes: item.likes }))
    }));
    return [
      '你是短视频资料整理员。一次性补齐下列被用户引用作品的分析详情，只能使用提供的标题、互动数字、评论、字幕/章节、抖音 AI 文本和封面图片，不得补造镜头、时间点或缺失数据。',
      '如果证据不足，对应字段明确写“无法确认”；数据字段中的 null 表示未公开，不得当作 0。封面图片按作品数组中 cover_image_index 与附件顺序对应。',
      '仅返回 JSON：{"items":[{"id":"","summary":"","content_structure":"Markdown，可引用章节证据","video_pace":"Markdown，可引用时间点；无证据则无法确认","cover_style":"构图/文字/色彩；无图则无法确认","interaction_feature":"结合赞评藏分享和热评","highlights":[""],"replication_advice":[""]}]}',
      `引用作品：${JSON.stringify(rows)}`
    ].join('\n');
  }

  function chatReferencePayload(work, index) {
    const detail = state.detailAnalyses.get(work.id);
    return {
      citation: `【${index + 1}】`,
      id: work.id,
      title: work.title,
      href: work.href,
      kind: work.kind,
      publishTime: work.publishTime || null,
      metrics: {
        likes: work.likeCount,
        comments: work.commentCount,
        collects: work.collectCount,
        shares: work.shareCount
      },
      hotComments: work.comments.slice(0, 8).map(item => ({ content: item.content, likes: item.likes })),
      workAnalysis: work.analysis,
      detailAnalysis: detail?.status === 'done' ? detail.result : null
    };
  }

  async function hydrateChatReferences(workIds) {
    const selected = workIds.map(id => state.works.find(work => work.id === id)).filter(Boolean);
    if (!selected.length) return [];
    state.chatStatus = `正在补齐 ${selected.length} 条引用作品的互动与评论数据…`;
    renderActiveSection();
    const pending = selected.filter(work => !work.metricsFetched || !work.deepScanned);
    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const work = pending[cursor++];
        try {
          replaceWork(await deepScanWork(work, 'full', false));
        } catch (error) {
          replaceWork({ ...work, metricError: cleanText(error?.message || error) });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(config.metricConcurrency, pending.length) }, worker));
    refreshDerivedMetrics();
    const hydrated = workIds.map(id => state.works.find(work => work.id === id)).filter(Boolean);
    const missingDetail = hydrated.filter(work => state.detailAnalyses.get(work.id)?.status !== 'done');
    if (missingDetail.length) {
      state.chatStatus = `互动数据已补齐，正在批量生成 ${missingDetail.length} 条作品分析详情…`;
      renderActiveSection();
      const images = missingDetail.map(work => work.cover).filter(value => /^(https?:|data:image\/)/i.test(value || '')).slice(0, 8);
      const raw = await withTimeout(window.LLMBridge.chat(chatReferenceAnalysisPrompt(missingDetail), { response_format: 'json', ...(images.length ? { images } : {}) }), config.llmTimeoutMs, '引用作品分析补全超时');
      const parsed = parseJson(raw);
      (Array.isArray(parsed.items) ? parsed.items : []).forEach(item => {
        const workId = String(item.id || '');
        const work = state.works.find(candidate => candidate.id === workId);
        if (!work) return;
        const result = normalizeDeepAnalysis(item);
        if (!result.summary && !result.contentStructure && !result.interactionFeature) return;
        state.detailAnalyses.set(workId, { status: 'done', result, mediaMode: images.length ? 'reference_batch_images' : 'reference_batch_text', nativeAiUsed: Boolean(work.nativeAiText), douyinAiSource: work.nativeAiText ? 'sidebar' : '', origin: 'account_chat_reference', completedAt: new Date().toISOString() });
        replaceWork({ ...work, analysis: { ...work.analysis, coverStyle: result.coverStyle || work.analysis.coverStyle, contentStructure: result.contentStructure || work.analysis.contentStructure, videoPace: result.videoPace || work.analysis.videoPace, interactionFeature: result.interactionFeature || work.analysis.interactionFeature } });
      });
      refreshDerivedMetrics();
    }
    saveWorkspace();
    return workIds.map(id => state.works.find(work => work.id === id)).filter(Boolean);
  }

  function accountChatPrompt(question, referencedWorks) {
    const history = state.accountChat.slice(0, -1).slice(-10).map(item => ({ role: item.role, content: item.content }));
    const references = referencedWorks.map(chatReferencePayload);
    return [
      '你是“账号资料分析助手”，帮助用户基于当前抖音博主及其真实作品做研究、选题、对比和复盘。回答应直接、具体、可执行。',
      '只能使用给定账号报告与引用作品证据。引用具体作品时必须使用【1】【2】格式；不得猜测未公开的赞评藏分享，null 必须表述为“未获取/未公开”。如果用户的问题超出证据范围，明确指出还缺什么。',
      `账号资料：${JSON.stringify({ profile: state.profile, summary: state.report.accountSummary, viralRules: state.report.viralRules, gaps: state.report.gaps, conclusion: state.report.conclusion })}`,
      `本轮引用作品：${JSON.stringify(references)}`,
      `最近对话：${JSON.stringify(history)}`,
      `用户问题：${question}`,
      '请用 Markdown 回答；先给结论，再给作品证据和建议。'
    ].join('\n');
  }

  function chatReferenceChips(workIds) {
    return workIds.map((id, index) => {
      const work = state.works.find(item => item.id === id);
      return work ? `<button type="button" data-remove-chat-work="${work.id}" title="移除引用">【${index + 1}】${escapeHtml(work.title.slice(0, 28))}<i>×</i></button>` : '';
    }).join('');
  }

  function renderAccountChatSection() {
    const selectedIds = Array.from(state.chatSelectedWorkIds).filter(id => state.works.some(work => work.id === id));
    const messages = state.accountChat.map(item => `<article class="account-message ${item.role}"><div class="message-avatar">${item.role === 'assistant' ? 'AI' : '我'}</div><div class="message-body"><small>${item.role === 'assistant' ? `${escapeHtml(state.profile.nickname)} · 资料助手` : '你的问题'} · ${new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small>${item.workIds?.length ? `<div class="message-sources">${item.workIds.map((id, index) => { const work = state.works.find(candidate => candidate.id === id); return work ? `<button type="button" data-open-work="${work.id}">【${index + 1}】${escapeHtml(work.title.slice(0, 24))}</button>` : ''; }).join('')}</div>` : ''}<div class="rich-text">${richText(item.content)}</div></div></article>`).join('');
    const works = state.works.map(work => {
      const selected = state.chatSelectedWorkIds.has(work.id);
      const detailDone = state.detailAnalyses.get(work.id)?.status === 'done';
      return `<label class="chat-work-item${selected ? ' selected' : ''}" data-chat-work-row="${work.id}" data-search-text="${escapeHtml(`${work.title} ${work.publishTime} ${work.kind}`.toLowerCase())}"><input type="checkbox" data-chat-work="${work.id}" ${selected ? 'checked' : ''}><span class="chat-check" aria-hidden="true">✓</span>${work.cover ? `<img src="${escapeHtml(work.cover)}" alt="">` : '<span class="chat-cover-empty">DY</span>'}<span class="chat-work-copy"><b>${escapeHtml(work.title.slice(0, 72))}</b><small>${work.publishTime ? escapeHtml(work.publishTime) : escapeHtml(work.kind)} · ${formatMetric(work.likeCount)}赞 · ${formatOptionalMetric(work.collectCount)}藏 · ${formatOptionalMetric(work.commentCount)}评</small><em class="${work.metricsFetched && detailDone ? 'ready' : 'pending'}">${work.metricsFetched ? '互动已获取' : '互动待补'} · ${detailDone ? '深析已就绪' : '发送时补深析'}</em></span><button type="button" data-open-work="${work.id}" title="查看作品详情">›</button></label>`;
    }).join('');
    return `${sectionHeader('ACCOUNT COPILOT', '和博主作品对话', '从右侧勾选作品作为证据；发送时自动补齐赞、评、藏、分享、评论样本与分析详情。')}<div class="account-chat-layout"><section class="account-chat-panel"><div class="chat-account-head">${state.profile.avatar ? `<img src="${escapeHtml(state.profile.avatar)}" alt="">` : '<span>DY</span>'}<div><small>正在研究</small><b>${escapeHtml(state.profile.nickname)}</b></div><i>${selectedIds.length ? `已引用 ${selectedIds.length} 条` : '可直接询问账号'}</i></div><div class="account-messages">${messages || `<div class="chat-welcome"><span>✦</span><h3>从作品证据出发提问</h3><p>可以比较选题、拆解爆款、寻找评论需求，或让 AI 基于所选作品生成下一步行动建议。</p></div>`}${state.chatBusy ? '<article class="account-message assistant"><div class="message-avatar">AI</div><div class="message-body"><div class="chat-thinking"><i></i><span>正在整理账号与引用作品证据…</span></div></div></article>' : ''}</div><div class="chat-suggestions"><button type="button" data-chat-question="比较所选作品为什么表现不同，给出证据链">比较表现差异</button><button type="button" data-chat-question="从所选作品的评论需求中，找出最值得做的下一期选题">找下一期选题</button><button type="button" data-chat-question="总结这个账号最可复制和最不可复制的部分">判断可复制性</button></div><div class="chat-composer"><div class="chat-reference-bar"><span>${selectedIds.length ? `引用 ${selectedIds.length} 条作品` : '未引用作品，将基于账号报告回答'}</span><div>${chatReferenceChips(selectedIds)}</div></div><textarea class="account-chat-input" placeholder="例如：这几条作品的爆点有什么共同点？我该如何做差异化？" ${state.chatBusy ? 'disabled' : ''}></textarea><div class="chat-compose-foot"><small class="chat-status">${escapeHtml(state.chatStatus || '引用作品会在发送时自动补齐资料')}</small><button type="button" class="send-account-chat" ${state.chatBusy ? 'disabled' : ''}>${state.chatBusy ? '分析中…' : '发送'} <span>↗</span></button></div></div></section><aside class="chat-work-library"><header><div><b>全部作品</b><small>${state.works.length} 条 · 最多引用 8 条</small></div>${selectedIds.length ? '<button type="button" class="clear-chat-works">清空</button>' : ''}</header><div class="chat-work-search"><span>⌕</span><input type="search" value="${escapeHtml(state.chatWorkQuery)}" placeholder="搜索标题或发布时间"></div><div class="chat-work-list">${works}</div></aside></div>`;
  }

  async function runAccountChat() {
    const input = state.shadow.querySelector('.account-chat-input');
    const question = cleanText(input?.value);
    if (!question || state.chatBusy) return;
    if (!window.LLMBridge || typeof window.LLMBridge.chat !== 'function') {
      state.chatStatus = '当前环境没有 LLMBridge.chat，无法发起对话。';
      renderActiveSection();
      return;
    }
    const workIds = Array.from(state.chatSelectedWorkIds).slice(0, 8);
    state.accountChat.push({ id: `account-user-${Date.now()}`, role: 'user', content: question, workIds, createdAt: new Date().toISOString() });
    state.chatBusy = true;
    state.chatStatus = workIds.length ? '准备引用作品资料…' : '正在结合账号报告思考…';
    renderActiveSection();
    try {
      const referencedWorks = await hydrateChatReferences(workIds);
      state.chatStatus = '资料已就绪，正在生成回答…';
      renderActiveSection();
      const answer = await withTimeout(window.LLMBridge.chat(accountChatPrompt(question, referencedWorks)), config.llmTimeoutMs, '账号对话超时');
      const content = String(answer?.content || answer?.text || answer || '').trim();
      if (!content) throw new Error('AI 未返回有效回答');
      state.accountChat.push({ id: `account-ai-${Date.now()}`, role: 'assistant', content, workIds, createdAt: new Date().toISOString() });
      state.chatStatus = workIds.length ? `已基于 ${workIds.length} 条引用作品回答` : '已基于账号报告回答';
    } catch (error) {
      state.accountChat.push({ id: `account-error-${Date.now()}`, role: 'assistant', content: `本次对话失败：${cleanText(error?.message || error)}。你可以保留引用后重新发送。`, workIds, createdAt: new Date().toISOString() });
      state.chatStatus = '对话失败，请重试';
    } finally {
      state.chatBusy = false;
      saveWorkspace();
      renderActiveSection();
    }
  }

  const sectionRenderers = { summary: renderSummarySection, chat: renderAccountChatSection, works: renderWorksSection, viral: renderViralSection, gaps: renderGapsSection, templates: renderTemplatesSection, covers: renderCoverSection, comments: renderCommentsSection, trend: renderTrendSection };

  function reportNavItems() {
    return [['summary', '首页摘要'], ['chat', '账号对话'], ['works', '作品全表'], ['viral', '爆款逻辑'], ['gaps', '赛道空位'], ['templates', '复刻模板'], ['covers', '封面工坊'], ['comments', '评论洞察'], ['trend', '数据趋势']];
  }

  function reportNav() {
    return reportNavItems().map(([id, label], index) => `<button type="button" data-section="${id}" class="${state.activeSection === id ? 'active' : ''}"><b>${String(index + 1).padStart(2, '0')}</b><span>${label}</span></button>`).join('');
  }

  function renderActiveSection() {
    const content = state.shadow.querySelector('.report-content');
    if (!content) return;
    const renderer = sectionRenderers[state.activeSection] || renderSummarySection;
    content.innerHTML = renderer();
    bindSectionEvents();
    if (state.activeSection === 'chat') requestAnimationFrame(() => {
      const messages = state.shadow.querySelector('.account-messages');
      if (messages) messages.scrollTop = messages.scrollHeight;
    });
  }

  function bindSectionEvents() {
    const root = state.shadow.querySelector('.report-content');
    root?.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
      await navigator.clipboard?.writeText(button.dataset.copy).catch(() => {});
      button.textContent = '已复制';
      setTimeout(() => { button.textContent = '复制'; }, 1200);
    }));
    const applyFilters = () => {
      const query = cleanText(root.querySelector('.work-search')?.value).toLowerCase();
      const filter = root.querySelector('.viral-filter')?.value || 'all';
      root.querySelectorAll('tbody tr').forEach(row => {
        const text = cleanText(row.textContent).toLowerCase();
        const viral = row.dataset.viral === '1';
        row.hidden = Boolean(query && !text.includes(query)) || (filter === 'viral' && !viral) || (filter === 'normal' && viral);
      });
    };
    root?.querySelector('.work-search')?.addEventListener('input', applyFilters);
    root?.querySelector('.viral-filter')?.addEventListener('change', applyFilters);
    root?.querySelectorAll('[data-cover-id]').forEach(image => image.addEventListener('contextmenu', event => {
      event.preventDefault();
      state.activeCoverId = image.dataset.coverId;
      state.activeSection = 'covers';
      updateReportNav();
      renderActiveSection();
    }));
    root?.querySelectorAll('[data-cover-choice]').forEach(button => button.addEventListener('click', () => {
      state.activeCoverId = button.dataset.coverChoice;
      renderActiveSection();
    }));
    root?.querySelectorAll('[data-cover-model]').forEach(button => button.addEventListener('click', () => {
      state.coverImageModelTier = button.dataset.coverModel === 'pro' ? 'pro' : 'lite';
      saveWorkspace();
      renderActiveSection();
    }));
    root?.querySelector('.cover-aspect-ratio')?.addEventListener('change', event => {
      state.coverAspectRatio = event.currentTarget.value === 'auto' || COVER_ASPECT_RATIOS.includes(event.currentTarget.value) ? event.currentTarget.value : 'auto';
      saveWorkspace();
      renderActiveSection();
    });
    root?.querySelectorAll('[data-refine-cover-task]').forEach(button => button.addEventListener('click', () => {
      const task = state.coverTasks.find(item => item.id === button.dataset.refineCoverTask && item.status === 'done' && item.source);
      if (!task) return;
      state.activeCoverId = task.workId;
      state.coverEditBaseByWork[task.workId] = task.id;
      saveWorkspace();
      renderActiveSection();
      state.shadow.querySelector('.cover-prompt')?.focus();
    }));
    root?.querySelector('.use-original-cover')?.addEventListener('click', () => {
      delete state.coverEditBaseByWork[state.activeCoverId];
      saveWorkspace();
      renderActiveSection();
    });
    root?.querySelector('.generate-cover')?.addEventListener('click', generateCover);
    root?.querySelectorAll('[data-download-task]').forEach(button => button.addEventListener('click', () => downloadGeneratedCover(button.dataset.downloadTask)));
    root?.querySelectorAll('[data-reuse-prompt]').forEach(button => button.addEventListener('click', () => {
      const task = state.coverTasks.find(item => item.id === button.dataset.reusePrompt);
      const input = root.querySelector('.cover-prompt');
      if (task && input) { input.value = task.instruction; input.focus(); }
    }));
    root?.querySelector('.fill-all-metrics')?.addEventListener('click', () => void fillAllMetrics());
    root?.querySelectorAll('[data-fill-metric]').forEach(button => button.addEventListener('click', () => void fillOneMetric(button.dataset.fillMetric)));
    root?.querySelectorAll('[data-open-work]').forEach(button => button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      state.activeWorkId = button.dataset.openWork;
      renderDetailDrawer();
    }));
    root?.querySelectorAll('[data-analyze-work]').forEach(button => button.addEventListener('click', () => {
      state.activeWorkId = button.dataset.analyzeWork;
      renderDetailDrawer();
      if (state.detailAnalyses.get(button.dataset.analyzeWork)?.status !== 'done') void analyzeWorkDeep(button.dataset.analyzeWork);
    }));
    root?.querySelectorAll('[data-brief]').forEach(button => button.addEventListener('click', () => {
      const input = root.querySelector('.replication-brief');
      if (input) { input.value = button.dataset.brief; input.focus(); }
    }));
    root?.querySelector('.run-replication-ai')?.addEventListener('click', () => void runReplicationAi());
    root?.querySelectorAll('[data-chat-work]').forEach(input => input.addEventListener('change', () => {
      const workId = input.dataset.chatWork;
      if (input.checked && state.chatSelectedWorkIds.size >= 8 && !state.chatSelectedWorkIds.has(workId)) {
        input.checked = false;
        state.chatStatus = '单次最多引用 8 条作品，请先移除一条。';
      } else if (input.checked) {
        state.chatSelectedWorkIds.add(workId);
        state.chatStatus = '已加入引用；发送时自动补齐互动与分析详情。';
      } else {
        state.chatSelectedWorkIds.delete(workId);
        state.chatStatus = '';
      }
      saveWorkspace();
      renderActiveSection();
    }));
    root?.querySelectorAll('[data-remove-chat-work]').forEach(button => button.addEventListener('click', () => {
      state.chatSelectedWorkIds.delete(button.dataset.removeChatWork);
      saveWorkspace();
      renderActiveSection();
    }));
    root?.querySelector('.clear-chat-works')?.addEventListener('click', () => {
      state.chatSelectedWorkIds.clear();
      state.chatStatus = '';
      saveWorkspace();
      renderActiveSection();
    });
    const chatSearch = root?.querySelector('.chat-work-search input');
    const applyChatSearch = () => {
      const query = cleanText(chatSearch?.value).toLowerCase();
      state.chatWorkQuery = chatSearch?.value || '';
      root?.querySelectorAll('[data-chat-work-row]').forEach(row => { row.hidden = Boolean(query && !String(row.dataset.searchText || '').includes(query)); });
    };
    chatSearch?.addEventListener('input', applyChatSearch);
    applyChatSearch();
    root?.querySelectorAll('[data-chat-question]').forEach(button => button.addEventListener('click', () => {
      const input = root.querySelector('.account-chat-input');
      if (input) { input.value = button.dataset.chatQuestion; input.focus(); }
    }));
    root?.querySelector('.send-account-chat')?.addEventListener('click', () => void runAccountChat());
    root?.querySelector('.account-chat-input')?.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        void runAccountChat();
      }
    });
  }

  function normalizeGeneratedImage(result) {
    const base64 = result?.b64_json || result?.b64_jsons?.[0] || result?.data?.[0]?.b64_json || result?.images?.[0]?.base64;
    if (base64) return String(base64).startsWith('data:image/') ? base64 : `data:image/png;base64,${base64}`;
    return result?.image_url || result?.image_urls?.[0] || result?.data?.[0]?.url || result?.images?.[0]?.url || '';
  }

  function imageTaskStatus(result) {
    const status = cleanText(result?.status || result?.state || result?.task_status).toLowerCase();
    if (/success|succeeded|complete|completed|done/.test(status)) return 'done';
    if (/fail|error|cancel/.test(status)) return 'error';
    return 'running';
  }

  function updateCoverTask(id, patch) {
    state.coverTasks = state.coverTasks.map(task => task.id === id ? { ...task, ...patch } : task);
    saveWorkspace();
    updateReportStatus();
    if (state.activeSection === 'covers') renderActiveSection();
  }

  async function runCoverTask(task, work, prompt, options) {
    try {
      let result;
      if (typeof window.LLMBridge?.createImageTask === 'function' && typeof window.LLMBridge?.getImageTask === 'function') {
        const created = await window.LLMBridge.createImageTask(prompt, options);
        const taskId = created?.task_id || created?.taskId || created?.id;
        if (!taskId) throw new Error(created?.error_message || '异步生图没有返回任务 ID');
        updateCoverTask(task.id, { status: 'running', remoteTaskId: String(taskId) });
        const startedAt = Date.now();
        while (Date.now() - startedAt < config.imageTimeoutMs) {
          await sleep(config.imagePollMs);
          result = await window.LLMBridge.getImageTask(taskId);
          const status = imageTaskStatus(result);
          if (status === 'done') break;
          if (status === 'error') throw new Error(result?.error_message || result?.message || '异步生图失败');
        }
        if (imageTaskStatus(result) !== 'done') throw new Error('异步生图超时');
      } else if (typeof window.LLMBridge?.generateImage === 'function') {
        result = await withTimeout(window.LLMBridge.generateImage(prompt, options), config.imageTimeoutMs, '封面生成超时');
      } else {
        throw new Error('当前环境没有可用的 LLMBridge 生图接口');
      }
      const image = normalizeGeneratedImage(result);
      if (!image) throw new Error(result?.error_message || '生图结果没有返回图片');
      const persistentSource = result?.image_url || result?.image_urls?.[0] || result?.data?.[0]?.url || result?.images?.[0]?.url || '';
      state.coverEditBaseByWork[work.id] = task.id;
      updateCoverTask(task.id, { status: 'done', source: image, persistentSource, completedAt: new Date().toISOString() });
    } catch (error) {
      updateCoverTask(task.id, { status: 'error', error: cleanText(error?.message || error), completedAt: new Date().toISOString() });
    }
  }

  function coverReferenceOptions(source) {
    if (!source) return {};
    if (/^data:image\//i.test(source)) return { reference_image_base64: source };
    return { reference_image_url: source };
  }

  function readImageDimensions(source) {
    return new Promise(resolve => {
      if (!source) return resolve({ width: 0, height: 0 });
      const image = new Image();
      const done = () => resolve({ width: Number(image.naturalWidth) || 0, height: Number(image.naturalHeight) || 0 });
      image.onload = done;
      image.onerror = () => resolve({ width: 0, height: 0 });
      image.src = source;
      if (image.complete) done();
    });
  }

  async function generateCover() {
    const work = state.works.find(item => item.id === state.activeCoverId);
    const promptInput = state.shadow.querySelector('.cover-prompt');
    const status = state.shadow.querySelector('.cover-status');
    const instruction = cleanText(promptInput?.value);
    if (!work || !instruction) {
      if (status) status.textContent = '请先输入具体修改指令。';
      return;
    }
    if (!window.LLMBridge || (typeof window.LLMBridge.generateImage !== 'function' && typeof window.LLMBridge.createImageTask !== 'function')) {
      if (status) status.textContent = '当前环境没有可用的 LLMBridge 生图接口。';
      return;
    }
    const referenceTask = selectedCoverReferenceTask(work);
    const referenceSource = referenceTask?.source || work.cover;
    if (!referenceSource) {
      if (status) status.textContent = '当前作品没有可用的封面参考图。';
      return;
    }
    if (state.coverAspectRatio === 'auto' && !referenceTask?.aspectRatio && (!work.coverWidth || !work.coverHeight)) {
      if (status) status.textContent = '正在读取原图尺寸并匹配生图比例…';
      const dimensions = await readImageDimensions(referenceSource);
      if (dimensions.width && dimensions.height) replaceWork({ ...work, coverWidth: dimensions.width, coverHeight: dimensions.height });
    }
    const currentWork = state.works.find(item => item.id === work.id) || work;
    const aspectRatio = resolvedCoverAspectRatio(currentWork, referenceTask);
    const isRefinement = Boolean(referenceTask);
    const prompt = isRefinement ? [
      '你正在对输入的已生成抖音封面做精确二次编辑。输入图片是唯一编辑目标。',
      `本次修改要求：${instruction}`,
      `作品主题：${work.title.slice(0, 500)}`,
      '只修改用户明确指定的部分；严格保留原图中未提及的构图、裁切、人物/主体身份、文字内容、配色、光影和视觉层级。',
      `输出完整的 ${aspectRatio} 封面，不要增加平台 Logo、边框或水印。`
    ].join('\n') : [
      '基于输入参考图重新设计一张原创抖音封面。参考图决定主体、核心构图与信息层级。',
      `修改要求：${instruction}`,
      `参考作品主题：${work.title.slice(0, 500)}`,
      '保留有效的视觉焦点与主体辨识度，同时完成用户要求的原创调整；不要增加平台 Logo、边框或水印。',
      `输出完整的 ${aspectRatio} 封面，高对比、移动端缩略图清晰；当比例与原图不同时优先自然延展背景，不要裁掉核心内容。`
    ].join('\n');
    const version = state.coverTasks.filter(item => item.workId === work.id).length + 1;
    const options = {
      optimize_prompt_mode: state.coverImageModelTier === 'pro' ? 'pro' : 'lite',
      ...coverReferenceOptions(referenceSource),
      aspect_ratio: aspectRatio,
      output_format: 'png',
      response_format: 'b64_json',
      watermark: false,
      sequential_image_generation: 'disabled'
    };
    const task = { id: `cover-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, workId: work.id, version, instruction, prompt, status: 'queued', source: '', referenceTaskId: referenceTask?.id || '', referenceKind: isRefinement ? 'generated' : 'original', modelTier: state.coverImageModelTier, modelLabel: coverModelLabel(), aspectRatio, createdAt: new Date().toISOString() };
    state.coverTasks.push(task);
    saveWorkspace();
    renderActiveSection();
    updateReportStatus();
    void runCoverTask(task, work, prompt, options);
  }

  function downloadGeneratedCover(taskId) {
    const source = state.coverTasks.find(task => task.id === taskId)?.source;
    if (!source) return;
    if (source.startsWith('data:')) {
      const [head, data] = source.split(',');
      const mime = head.match(/data:([^;]+)/)?.[1] || 'image/png';
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
      downloadBlob(new Blob([bytes], { type: mime }), filename('png'));
    } else {
      const anchor = document.createElement('a');
      anchor.href = source;
      anchor.target = '_blank';
      anchor.rel = 'noopener';
      anchor.click();
    }
  }

  function updateReportNav() {
    state.shadow.querySelectorAll('[data-section]').forEach(button => button.classList.toggle('active', button.dataset.section === state.activeSection));
  }

  function backgroundStatusText() {
    const coverRunning = state.coverTasks.filter(task => task.status === 'queued' || task.status === 'running').length;
    const detailRunning = Array.from(state.detailAnalyses.values()).filter(item => item.status === 'running').length;
    if (state.metricQueue.running) return `正在补齐互动 ${state.metricQueue.completed}/${state.metricQueue.total}`;
    if (coverRunning || detailRunning) return `后台任务：生图 ${coverRunning} · 视频分析 ${detailRunning}`;
    return state.message;
  }

  function updateReportStatus() {
    const status = state.shadow?.querySelector('.report-status');
    if (status) status.textContent = backgroundStatusText();
    const meta = state.shadow?.querySelector('.report-meta');
    if (meta) meta.textContent = `${state.works.length} 条作品 · ${state.works.filter(work => work.deepScanned).length} 条深读 · 互动覆盖 ${state.works.filter(work => work.metricsFetched).length}/${state.works.length}`;
    const notesButton = state.shadow?.querySelector('.toggle-notes');
    if (notesButton) notesButton.textContent = `笔记 ${state.notes.length}`;
  }

  function renderReport() {
    if (!state.report) return;
    const shell = state.shadow.querySelector('.shell');
    shell.className = 'shell open report-mode';
    shell.innerHTML = `<div class="report-layout"><aside><div class="brand"><span>TB</span><div><b>对标账号分析</b><small>${escapeHtml(state.profile.nickname)}</small></div></div><nav>${reportNav()}</nav><div class="aside-foot"><button type="button" class="back-sheet">重新分析</button><button type="button" class="close-shell">关闭</button></div></aside><main><header class="report-top"><div><span class="report-meta">${state.works.length} 条作品 · ${state.works.filter(work => work.deepScanned).length} 条深读 · 互动覆盖 ${state.works.filter(work => work.metricsFetched).length}/${state.works.length}</span><b class="report-status">${escapeHtml(backgroundStatusText())}</b></div><div class="exports"><button type="button" class="toggle-notes">笔记 ${state.notes.length}</button><button type="button" data-export="md">Markdown</button><button type="button" data-export="csv">CSV / Excel</button><button type="button" data-export="json">JSON</button></div></header><div class="report-content"></div><aside class="notes-drawer"></aside><aside class="detail-drawer"></aside></main></div>`;
    state.shadow.querySelectorAll('[data-section]').forEach(button => button.addEventListener('click', () => {
      state.activeSection = button.dataset.section;
      updateReportNav();
      renderActiveSection();
      const main = state.shadow.querySelector('.report-layout>main');
      if (main) main.scrollTop = 0;
    }));
    state.shadow.querySelector('.back-sheet').addEventListener('click', () => openSheet());
    state.shadow.querySelector('.close-shell').addEventListener('click', closeShell);
    state.shadow.querySelector('.toggle-notes').addEventListener('click', () => { state.notesOpen = !state.notesOpen; renderNotesDrawer(); });
    state.shadow.querySelectorAll('[data-export]').forEach(button => button.addEventListener('click', () => {
      const type = button.dataset.export;
      if (type === 'md') downloadBlob(new Blob([markdownReport()], { type: 'text/markdown;charset=utf-8' }), filename('md'));
      if (type === 'csv') downloadBlob(new Blob([csvReport()], { type: 'text/csv;charset=utf-8' }), filename('csv'));
      if (type === 'json') downloadBlob(new Blob([JSON.stringify({ profile: state.profile, works: state.works, report: state.report, notes: state.notes, coverTasks: state.coverTasks, detailAnalyses: Array.from(state.detailAnalyses.entries()), replicationChat: state.replicationChat, accountChat: state.accountChat }, null, 2)], { type: 'application/json;charset=utf-8' }), filename('json'));
    }));
    renderActiveSection();
    renderNotesDrawer();
    if (state.activeWorkId) renderDetailDrawer();
  }

  function renderProgressScreen() {
    const shell = state.shadow.querySelector('.shell');
    shell.className = 'shell open';
    shell.innerHTML = `<div class="sheet progress-screen"><button type="button" class="x close-shell" aria-label="关闭">×</button><span class="eyebrow">BENCHMARK SCAN</span><h2>正在拆解 ${escapeHtml(extractProfile().nickname)}</h2><p class="progress-message">准备扫描账号作品…</p><div class="progress-track"><i class="progress-fill"></i></div><div class="progress-meta"><b class="progress-value">0%</b><span>扫描只读取公开页面数据，不执行关注、点赞、评论或收藏。</span></div><button type="button" class="secondary stop-run">停止</button></div>`;
    state.ui = { progress: state.shadow.querySelector('.progress-fill'), progressValue: state.shadow.querySelector('.progress-value'), progressMessage: state.shadow.querySelector('.progress-message') };
    state.shadow.querySelector('.close-shell').addEventListener('click', closeShell);
    state.shadow.querySelector('.stop-run').addEventListener('click', requestStop);
  }

  function openSheet(kind = '', message = '') {
    const shell = state.shadow.querySelector('.shell');
    shell.className = 'shell open';
    const profile = extractProfile();
    shell.innerHTML = `<div class="sheet"><button type="button" class="x close-shell" aria-label="关闭">×</button><span class="eyebrow">DOUYIN BENCHMARK INTELLIGENCE</span><h2>对标账号分析</h2><p class="intro">扫描当前对标账号作品，逐条做 8 维拆解，并生成爆款逻辑、赛道空位和复刻模板。</p>${message ? `<div class="notice ${kind}">${escapeHtml(message)}</div>` : ''}<div class="profile-preview">${profile.avatar ? `<img src="${escapeHtml(profile.avatar)}" alt="">` : '<span>DY</span>'}<div><b>${escapeHtml(profile.nickname)}</b><small>${profile.declaredWorks ? `${profile.declaredWorks} 条作品 · ` : ''}${formatMetric(profile.followers)}粉丝</small></div></div><label>本次重点分析什么<textarea class="requirement" maxlength="500">${escapeHtml(state.requirement)}</textarea></label><div class="form-grid"><label>扫描作品数<select class="max-items"><option value="30">30 条</option><option value="60">60 条</option><option value="100">100 条</option><option value="200">200 条</option><option value="500">尽量全部（最多500）</option></select></label><label>深读爆款与评论<select class="deep-sample"><option value="0">不深读</option><option value="3">3 条</option><option value="5">5 条</option><option value="8">8 条</option><option value="12">12 条</option></select></label></div><div class="feature-list"><span>✓ 懒加载全页扫描</span><span>✓ 8 维作品矩阵</span><span>✓ 引用作品进行账号对话</span><span>✓ Markdown / Excel 导出</span></div><button type="button" class="primary start-run">开始扫描与分析</button><p class="fineprint">深读会依次加载高点赞作品详情，用于补齐发布时间、点赞/评论/收藏/分享和热门评论。页面未公开的数据不会被猜测。</p></div>`;
    const maxSelect = state.shadow.querySelector('.max-items');
    maxSelect.value = String([30, 60, 100, 200, 500].includes(state.maxItems) ? state.maxItems : 60);
    const deepSelect = state.shadow.querySelector('.deep-sample');
    deepSelect.value = String([0, 3, 5, 8, 12].includes(state.deepSample) ? state.deepSample : 5);
    state.ui = { requirement: state.shadow.querySelector('.requirement'), maxItems: maxSelect, deepSample: deepSelect };
    state.shadow.querySelector('.close-shell').addEventListener('click', closeShell);
    state.shadow.querySelector('.start-run').addEventListener('click', () => runAnalysis());
  }

  function closeShell() {
    state.shadow.querySelector('.shell')?.classList.remove('open');
  }

  function createUi() {
    const host = document.createElement('div');
    host.id = HOST_ID;
    host.style.cssText = 'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;';
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<style>
      :host{--ink:#16161a;--muted:#696972;--paper:#f7f7f9;--card:#fff;--line:#e5e5ea;--purple:#6c5ce7;--purple2:#8b7cf6;--green:#00a884;--red:#e5484d;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Microsoft YaHei",sans-serif;color:var(--ink)}*{box-sizing:border-box}button,input,select,textarea{font:inherit}.launcher{pointer-events:auto;position:fixed;right:22px;bottom:92px;width:138px;height:52px;display:flex;align-items:center;gap:10px;padding:6px 12px 6px 7px;border:1px solid rgba(255,255,255,.78);border-radius:17px;color:#24232c;background:rgba(255,255,255,.92);box-shadow:0 14px 34px rgba(25,22,55,.18),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(18px) saturate(1.3);-webkit-backdrop-filter:blur(18px) saturate(1.3);cursor:pointer;text-align:left;transition:transform .18s,box-shadow .18s,border-color .18s}.launcher:hover{transform:translateY(-2px);border-color:#dcd7ff;box-shadow:0 18px 42px rgba(55,39,175,.22),inset 0 1px 0 #fff}.launcher-icon{width:38px;height:38px;flex:none;display:grid;place-items:center;border-radius:12px;color:#fff;background:linear-gradient(145deg,#8173f3,#5948da);box-shadow:0 7px 16px rgba(83,66,203,.28)}.launcher-icon svg{width:20px;height:20px}.launcher-copy{display:grid;gap:2px;min-width:0}.launcher-copy b{font-size:12px;line-height:1.15;white-space:nowrap}.launcher-copy small{color:#85838e;font-size:9px;line-height:1.1;white-space:nowrap}.shell{pointer-events:none;position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(10,10,14,.58);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}.shell.open{pointer-events:auto;display:flex}.sheet{position:relative;width:min(640px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;padding:34px;border-radius:28px;background:var(--paper);box-shadow:0 32px 100px rgba(0,0,0,.32)}.x{position:absolute;right:20px;top:18px;width:36px;height:36px;border:0;border-radius:50%;background:#eaeaef;color:#555;cursor:pointer;font-size:24px}.eyebrow{color:var(--purple);font-size:11px;font-weight:800;letter-spacing:.18em}.sheet h2{margin:10px 0 9px;font-size:30px;letter-spacing:-.04em}.intro{margin:0 0 22px;color:var(--muted);line-height:1.65}.profile-preview{display:flex;align-items:center;gap:13px;padding:13px;margin:0 0 18px;border:1px solid var(--line);border-radius:16px;background:#fff}.profile-preview img,.profile-preview>span{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#111;color:#fff;display:grid;place-items:center;font-weight:800}.profile-preview b,.profile-preview small{display:block}.profile-preview small{margin-top:4px;color:var(--muted)}label{display:block;color:#404047;font-size:13px;font-weight:700}textarea,select,input{width:100%;margin-top:8px;border:1px solid #dcdce3;border-radius:13px;background:#fff;color:var(--ink);outline:none}textarea:focus,select:focus,input:focus{border-color:var(--purple);box-shadow:0 0 0 3px rgba(108,92,231,.12)}.sheet textarea{min-height:94px;padding:13px;resize:vertical;line-height:1.55}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}.form-grid select{height:46px;padding:0 12px}.feature-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0;color:#484852;font-size:13px}.feature-list span{padding:10px 12px;border-radius:11px;background:#eeeef3}.primary,.secondary{height:48px;border:0;border-radius:14px;cursor:pointer;font-weight:800}.primary{width:100%;color:#fff;background:linear-gradient(135deg,var(--purple),#5140d7);box-shadow:0 12px 28px rgba(108,92,231,.25)}.secondary{padding:0 18px;background:#eaeaef;color:#333}.fineprint,.muted{color:var(--muted);font-size:12px;line-height:1.6}.notice{padding:12px 14px;margin-bottom:16px;border-radius:12px;background:#fff2f2;color:#a72e32;font-size:13px}.progress-screen{text-align:center}.progress-screen h2{margin-top:20px}.progress-message{min-height:26px;color:var(--muted)}.progress-track{height:10px;margin:25px 0 12px;overflow:hidden;border-radius:99px;background:#e2e2e8}.progress-fill{display:block;width:0;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--purple),#00c2a8);transition:width .25s}.progress-meta{display:flex;justify-content:space-between;gap:20px;text-align:left;color:var(--muted);font-size:12px}.progress-meta b{color:var(--purple);font-size:24px}.progress-screen .secondary{margin-top:24px}.shell.report-mode{background:#efeff3;align-items:stretch}.report-layout{width:100%;height:100%;display:grid;grid-template-columns:228px 1fr;background:var(--paper)}.report-layout>aside{display:flex;flex-direction:column;padding:22px 14px;background:#17171c;color:#fff}.brand{display:flex;align-items:center;gap:11px;padding:5px 8px 24px}.brand>span{width:38px;height:38px;display:grid;place-items:center;border-radius:12px;background:linear-gradient(145deg,var(--purple2),var(--purple));font-weight:900}.brand b,.brand small{display:block}.brand small{margin-top:4px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#9b9ba6;font-size:11px}.report-layout nav{display:grid;gap:5px}.report-layout nav button{display:flex;align-items:center;gap:12px;height:45px;padding:0 12px;border:0;border-radius:11px;background:transparent;color:#a9a9b3;cursor:pointer;text-align:left}.report-layout nav button b{font-size:10px;color:#666672}.report-layout nav button.active{background:#2a2934;color:#fff}.report-layout nav button.active b{color:#a99fff}.aside-foot{display:grid;gap:8px;margin-top:auto}.aside-foot button{height:38px;border:1px solid #383840;border-radius:10px;background:transparent;color:#a9a9b3;cursor:pointer}.report-layout>main{position:relative;min-width:0;overflow:auto;padding-top:72px}.report-top{position:fixed;left:228px;right:0;top:0;z-index:5;height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 26px;border-bottom:1px solid var(--line);background:rgba(247,247,249,.9);backdrop-filter:blur(18px)}.report-top span,.report-top b{display:block}.report-top span{color:var(--muted);font-size:11px}.report-top b{margin-top:5px;font-size:13px}.exports{display:flex;gap:7px}.exports button,.toolbar select,.toolbar input,.template button{height:36px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:#fff;color:#444;cursor:pointer}.report-content{max-width:1320px;margin:0 auto;padding:38px 42px 120px}.section-head{margin-bottom:24px}.section-head>span{color:var(--purple);font-size:10px;font-weight:900;letter-spacing:.18em}.section-head h2{margin:7px 0 6px;font-size:34px;letter-spacing:-.04em}.section-head p{margin:0;color:var(--muted)}.hero-card{display:flex;align-items:center;justify-content:space-between;padding:28px;border-radius:24px;color:#fff;background:linear-gradient(135deg,#1d1b2c,#35305c 62%,#6c5ce7);box-shadow:0 20px 50px rgba(39,31,92,.16)}.account-id{display:flex;align-items:center;gap:16px}.account-id img,.account-id>span{width:72px;height:72px;border-radius:22px;object-fit:cover;display:grid;place-items:center;background:#fff;color:#222;font-weight:900}.account-id small,.account-id h3,.account-id p{display:block;margin:0}.account-id small{color:#bbb7da}.account-id h3{margin:5px 0;font-size:25px}.account-id p{max-width:680px;color:#dedcf0;line-height:1.55}.overall{text-align:center}.overall b{display:block;font-size:54px;line-height:1}.overall span{color:#d8d5ee;font-size:11px}.metric-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:16px 0}.metric-grid>div{padding:18px;border:1px solid var(--line);border-radius:16px;background:#fff}.metric-grid span,.metric-grid b{display:block}.metric-grid span{color:var(--muted);font-size:11px}.metric-grid b{margin-top:8px;font-size:23px}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 0}.card{padding:22px;border:1px solid var(--line);border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(35,35,55,.035)}.card h3{margin:0 0 14px;font-size:17px}.lead{font-size:17px;line-height:1.75}.chips{display:flex;flex-wrap:wrap;gap:7px}.chips span{padding:6px 10px;border-radius:99px;color:#5144b7;background:#eeecff;font-size:12px}.chips.large span{font-size:13px}.score-row{display:grid;grid-template-columns:72px 1fr 30px;align-items:center;gap:10px;margin:11px 0;font-size:12px}.score-row>div{height:7px;overflow:hidden;border-radius:99px;background:#eeeef2}.score-row i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--purple),#00b894)}.score-row b{text-align:right}.toolbar{display:flex;gap:10px;margin-bottom:13px}.toolbar input{flex:1;padding:0 12px}.table-wrap{overflow:auto;max-height:calc(100vh - 220px);border:1px solid var(--line);border-radius:16px;background:#fff}.table-wrap table{border-collapse:separate;border-spacing:0;min-width:2200px;width:100%;font-size:12px}.table-wrap th{position:sticky;top:0;z-index:2;padding:13px;text-align:left;background:#f0f0f5;border-bottom:1px solid var(--line);white-space:nowrap}.table-wrap td{max-width:270px;padding:13px;vertical-align:top;border-bottom:1px solid #eeeeF2;line-height:1.55}.work-cell{display:flex;gap:10px;min-width:360px}.work-cell img,.cover-empty{width:54px;height:72px;flex:none;border-radius:8px;object-fit:cover;background:#222;color:#fff;display:grid;place-items:center;cursor:context-menu}.work-cell a{display:block;color:#24232c;font-weight:700;text-decoration:none}.work-cell small{display:block;margin-top:6px;color:var(--muted)}.stack{display:grid;gap:12px}.rule{display:flex;gap:18px}.rule>b{font-size:28px;color:#cbc7f8}.rule h3{margin-bottom:5px}.rule p{margin:0;color:var(--muted);line-height:1.6}.cover-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:20px}.cover-strip a{position:relative;aspect-ratio:3/4;overflow:hidden;border-radius:14px;background:#222}.cover-strip img{width:100%;height:100%;object-fit:cover}.cover-strip span{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:8px;background:rgba(0,0,0,.68);color:#fff;font-size:11px}.gap-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.gap>span{color:var(--purple);font-size:11px;font-weight:800}.gap h3{margin:7px 0 16px;font-size:20px}.gap dl{margin:0}.gap dt{margin-top:11px;color:var(--muted);font-size:11px}.gap dd{margin:4px 0;line-height:1.55}.gap dd.action{padding:12px;border-radius:12px;color:#075f50;background:#e8faf5}.template-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.template>div{display:grid;grid-template-columns:24px 1fr auto;gap:10px;align-items:start;padding:12px 0;border-top:1px solid #eee}.template>div>b{color:var(--purple)}.template p{margin:0;line-height:1.6}.template button{height:28px;font-size:11px}.cover-workshop{display:grid;grid-template-columns:430px 1fr;gap:16px}.cover-gallery{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;align-content:start}.cover-choice{position:relative;aspect-ratio:3/4;padding:0;overflow:hidden;border:3px solid transparent;border-radius:12px;background:#222;cursor:pointer}.cover-choice.active{border-color:var(--purple)}.cover-choice img{width:100%;height:100%;object-fit:cover}.cover-choice span{position:absolute;left:4px;bottom:4px;padding:3px 5px;border-radius:6px;background:rgba(0,0,0,.65);color:#fff;font-size:9px}.compare{display:grid;grid-template-columns:1fr 1fr;gap:12px}.compare figure{margin:0}.compare img,.compare .generated>div{width:100%;aspect-ratio:9/16;border-radius:13px;object-fit:cover;background:#eeeef3;display:grid;place-items:center;color:#999}.compare figcaption{margin-top:6px;text-align:center;color:var(--muted);font-size:11px}.editor label{margin-top:16px}.editor textarea{min-height:88px;padding:12px;resize:vertical}.editor-actions{display:flex;gap:8px;margin-top:10px}.editor-actions .primary{width:auto;padding:0 18px}.comment-list{display:grid;grid-template-columns:1fr 1fr;gap:10px}.comment-list blockquote{margin:0;padding:15px;border-radius:13px;background:#f4f4f7}.comment-list p{margin:0;line-height:1.55}.comment-list footer{margin-top:8px;color:var(--muted);font-size:11px}.comment-list a{color:var(--purple)}ol{padding-left:20px}ol li{margin:9px 0;line-height:1.6}.chart-card{overflow:hidden}.trend{width:100%;height:auto}.trend-grid line{stroke:#e6e6ed;stroke-width:1;stroke-dasharray:4 5}.trend-grid text,.trend-x-tick text{fill:#777783;font-size:11px}.trend-x-tick line,.trend-axis{stroke:#a8a8b3;stroke-width:1.2}.trend-axis-title{fill:#555562;font-size:11px;font-weight:700}.empty{padding:30px;text-align:center;color:var(--muted);border:1px dashed #ccc;border-radius:14px}.notes{position:fixed;right:18px;bottom:18px;width:250px!important;padding:0!important;background:transparent!important;color:var(--ink)!important;filter:drop-shadow(0 12px 25px rgba(0,0,0,.13))}.notes label{padding:12px;border:1px solid var(--line);border-radius:14px;background:#fff}.notes textarea{height:66px;min-height:66px;padding:8px;resize:vertical}
      .text-link{padding:0;border:0;background:transparent;color:#24232c;font-weight:700;text-align:left;cursor:pointer}.row-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.row-actions button,.row-actions a,.chips button{height:28px;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:#fff;color:#5548bf;text-decoration:none;cursor:pointer;font-size:11px;line-height:26px}.metric-state{margin-top:7px!important}.status-pill{display:inline-block;padding:2px 7px;border-radius:99px;font-size:10px}.status-pill.done{color:#08735f;background:#e5f8f3}.status-pill.pending{color:#765d16;background:#fff5cf}.status-pill.running{color:#5144b7;background:#eeecff}.status-pill.error{color:#a72e32;background:#fff0f0}.viral-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;margin-top:16px}.viral-card{display:grid;grid-template-columns:92px 1fr;gap:14px}.viral-card>img{width:92px;height:124px;border-radius:12px;object-fit:cover}.viral-card small{color:var(--muted)}.viral-card h3{margin:6px 0}.viral-card p{margin:0;color:var(--muted);line-height:1.55}.co-create{margin-top:16px}.co-create textarea{min-height:92px;padding:12px;resize:vertical}.co-create>.primary{width:auto;margin-top:12px;padding:0 20px}.quick-briefs{margin-top:10px}.chat-history{display:grid;gap:12px;margin-top:18px}.chat-item{padding:16px;border-radius:14px;background:#f4f4f8}.chat-item>div{display:flex;justify-content:space-between;gap:10px}.chat-item small{color:var(--muted)}.chat-item h4{margin:14px 0 4px}.chat-item li button{float:right}.cover-history{margin-top:16px}.cover-history-item{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:12px 0;border-top:1px solid var(--line)}.cover-history-item img,.history-placeholder{width:90px;height:120px;border-radius:10px;object-fit:cover;background:#eee;display:grid;place-items:center;color:#888}.cover-history-item b,.cover-history-item small{display:block}.cover-history-item small{margin-top:3px;color:var(--muted)}.cover-history-item p{margin:8px 0;line-height:1.5}.cover-history-item em{color:var(--red);font-size:11px}.notes-drawer,.detail-drawer{position:fixed;z-index:30;right:0;top:0;bottom:0;width:min(430px,94vw);padding:0!important;background:#fff!important;color:var(--ink)!important;box-shadow:-18px 0 50px rgba(20,20,35,.16);transform:translateX(105%);transition:transform .22s;overflow:auto}.detail-drawer{width:min(620px,96vw);z-index:31}.notes-drawer.open,.detail-drawer.open{transform:translateX(0)}.notes-drawer header,.detail-drawer header{position:sticky;top:0;z-index:2;display:flex;align-items:start;justify-content:space-between;padding:20px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.94);backdrop-filter:blur(16px)}.notes-drawer h3,.detail-drawer h3{margin:4px 0 0}.notes-drawer header small,.detail-drawer header small{color:var(--purple)}.close-notes,.close-detail{width:34px;height:34px;border:0;border-radius:50%;background:#eee;cursor:pointer;font-size:23px}.note-compose,.note-list,.detail-body{padding:18px}.note-compose textarea,.note-list textarea{min-height:82px;padding:10px;resize:vertical}.note-compose .primary{margin-top:8px}.note-list{display:grid;gap:10px;padding-top:0}.note-list article{padding:13px;border:1px solid var(--line);border-radius:12px}.note-list article>small{color:var(--muted)}.detail-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.detail-metrics span{padding:9px;border-radius:9px;background:#f1f1f5;text-align:center;font-size:11px}.detail-body article{margin-top:14px;padding:18px;border:1px solid var(--line);border-radius:14px}.detail-body article>h3{margin:0 0 10px}.rich-text p{margin:7px 0;line-height:1.7}.rich-text code{padding:1px 5px;border-radius:6px;background:#f0eff8;color:#5144b7;font-size:.92em}.rich-bullet{padding:4px 0 4px 10px;line-height:1.65}.rich-timeline{display:grid;margin:12px 0 4px}.rich-timeline-item{display:grid;grid-template-columns:92px minmax(0,1fr);gap:12px;min-width:0}.rich-timeline-meta{position:relative;padding-top:11px;text-align:right}.rich-timeline-meta span{display:inline-flex;padding:4px 7px;border-radius:8px;color:#5144b7;background:#eeecff;font-size:10px;font-weight:800;white-space:nowrap}.rich-timeline-meta i{position:absolute;right:-8px;top:18px;width:7px;height:7px;border:2px solid #fff;border-radius:50%;background:var(--purple);box-shadow:0 0 0 2px #dcd7ff}.rich-timeline-item:not(:last-child) .rich-timeline-meta:after{content:"";position:absolute;right:-5px;top:25px;bottom:-12px;width:1px;background:#ddd9f7}.rich-timeline-card{min-width:0;margin-bottom:10px;padding:11px 12px;border:1px solid #ecebf2;border-radius:11px;background:#fafafd}.rich-timeline-card b{display:block;margin-bottom:5px;color:#292832;font-size:12px}.rich-timeline-card p{margin:0;color:#5f5f69;font-size:12px;line-height:1.65}.rich-table-wrap{max-width:100%;margin:10px 0;overflow:auto;border:1px solid var(--line);border-radius:10px}.rich-table{width:100%;border-collapse:collapse;font-size:11px}.rich-table th,.rich-table td{padding:9px 10px;border-bottom:1px solid #eeeeF2;text-align:left;vertical-align:top;line-height:1.55}.rich-table th{background:#f4f4f8;color:#4c4b55;white-space:nowrap}.rich-table tr:last-child td{border-bottom:0}.native-ai-badge{margin-top:14px;padding:10px 12px;border-radius:10px;color:#075f50;background:#e8faf5;font-size:12px}.native-ai-badge small{display:block;margin-top:4px;color:#5b756f}.detail-reanalyze{display:block;height:28px;margin:7px 0 0 auto;padding:0 9px;border:1px solid var(--line);border-radius:8px;background:#f7f7f9;color:#666672;cursor:pointer;font-size:11px;font-weight:650}.detail-reanalyze:hover{border-color:#d8d5ee;background:#f0eff8;color:#5548bf}.native-raw{margin-top:12px;padding:12px 14px;border:1px solid #cdece4;border-radius:12px;background:#f7fffc}.native-raw summary{cursor:pointer;color:#075f50;font-weight:700}.native-raw .rich-text{margin-top:12px}.analysis-running{text-align:center;padding:70px 20px}.analysis-running i{display:block;width:40px;height:40px;margin:0 auto 18px;border:4px solid #ddd;border-top-color:var(--purple);border-radius:50%;animation:spin .9s linear infinite}.trend-point{cursor:pointer}.exports .toggle-notes{color:#5749c5}.primary:disabled,.secondary:disabled,button:disabled{cursor:not-allowed;opacity:.55}@keyframes spin{to{transform:rotate(360deg)}}
      .cover-generation-controls{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px}.cover-generation-controls fieldset,.cover-generation-controls>label{min-width:0;margin:0;padding:11px;border:1px solid var(--line);border-radius:13px;background:#fafafd}.cover-generation-controls legend{padding:0 5px;color:#404047;font-size:11px;font-weight:800}.cover-generation-controls>label{font-size:11px}.cover-generation-controls select{height:39px;margin-top:7px;padding:0 10px;border-radius:9px}.cover-generation-controls label>small{display:block;margin-top:6px;color:var(--muted);font-size:9px}.cover-model-switch{display:grid;grid-template-columns:1fr 1fr;gap:6px}.cover-model-switch button{height:45px;border:1px solid #dddde5;border-radius:9px;background:#fff;color:#4e4d57;cursor:pointer}.cover-model-switch button b,.cover-model-switch button small{display:block}.cover-model-switch button small{margin-top:2px;color:var(--muted);font-size:8px}.cover-model-switch button.active{border-color:#7668e8;color:#5144b7;background:#eeecff;box-shadow:inset 0 0 0 1px #7668e8}.cover-edit-source{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:11px;padding:10px 12px;border:1px solid #e1defb;border-radius:11px;background:#f7f5ff}.cover-edit-source b,.cover-edit-source span{display:block}.cover-edit-source b{color:#5144b7;font-size:11px}.cover-edit-source span{margin-top:3px;color:var(--muted);font-size:9px;line-height:1.45}.cover-edit-source button{flex:none;height:30px;padding:0 9px;border:1px solid #d9d4ff;border-radius:8px;color:#5548bf;background:#fff;cursor:pointer;font-size:9px}.cover-history-item.active-reference{margin:0 -10px;padding:12px 10px;border-radius:12px;background:#f5f3ff}.cover-history-title{display:flex;align-items:center;gap:8px}.cover-history-title span{padding:3px 6px;border-radius:99px;color:#08735f;background:#e5f8f3;font-size:9px}.compare img,.compare .generated>div{height:min(48vh,430px);aspect-ratio:auto;object-fit:contain}
      .account-chat-layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;min-height:620px;height:calc(100vh - 232px)}.account-chat-panel,.chat-work-library{min-width:0;overflow:hidden;border:1px solid var(--line);border-radius:20px;background:#fff;box-shadow:0 12px 34px rgba(35,35,55,.045)}.account-chat-panel{display:flex;flex-direction:column}.chat-account-head{height:70px;display:flex;align-items:center;gap:11px;padding:12px 18px;border-bottom:1px solid var(--line);background:linear-gradient(120deg,#fbfaff,#f7f7fb)}.chat-account-head img,.chat-account-head>span{width:42px;height:42px;flex:none;border-radius:14px;object-fit:cover;background:#23222c;color:#fff;display:grid;place-items:center;font-weight:900}.chat-account-head b,.chat-account-head small{display:block}.chat-account-head small{margin-bottom:3px;color:var(--muted);font-size:10px}.chat-account-head>i{margin-left:auto;padding:5px 9px;border-radius:99px;color:#5749c5;background:#eeecff;font-size:10px;font-style:normal}.account-messages{flex:1;min-height:0;overflow:auto;padding:22px;background:linear-gradient(#fafafd,#f7f7fa)}.chat-welcome{max-width:460px;margin:80px auto;text-align:center;color:var(--muted)}.chat-welcome>span{width:48px;height:48px;margin:auto;display:grid;place-items:center;border-radius:16px;color:#fff;background:linear-gradient(135deg,var(--purple),#4d3fd1);box-shadow:0 10px 28px rgba(108,92,231,.22)}.chat-welcome h3{margin:15px 0 6px;color:var(--ink)}.chat-welcome p{margin:0;line-height:1.65}.account-message{display:grid;grid-template-columns:32px minmax(0,1fr);gap:10px;margin:0 0 18px}.account-message.user{margin-left:13%}.message-avatar{width:32px;height:32px;display:grid;place-items:center;border-radius:10px;color:#fff;background:#23222c;font-size:10px;font-weight:800}.account-message.user .message-avatar{background:var(--purple)}.message-body{min-width:0;padding:13px 15px;border:1px solid #e8e8ef;border-radius:4px 15px 15px 15px;background:#fff;box-shadow:0 6px 18px rgba(35,35,55,.035)}.account-message.user .message-body{background:#f0eeff;border-color:#dfdafd}.message-body>small{color:var(--muted);font-size:10px}.message-body .rich-text{margin-top:7px}.message-body .rich-text p:last-child{margin-bottom:0}.message-sources{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.message-sources button{max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 7px;border:0;border-radius:7px;color:#5548bf;background:#eeecff;cursor:pointer;font-size:10px}.chat-thinking{display:flex;align-items:center;gap:9px;color:var(--muted);font-size:12px}.chat-thinking i{width:15px;height:15px;border:2px solid #d6d3ef;border-top-color:var(--purple);border-radius:50%;animation:spin .8s linear infinite}.chat-suggestions{display:flex;gap:7px;padding:9px 16px 0;overflow-x:auto;border-top:1px solid var(--line)}.chat-suggestions button{flex:none;height:29px;padding:0 10px;border:1px solid #e0def1;border-radius:9px;color:#5548bf;background:#faf9ff;cursor:pointer;font-size:10px}.chat-composer{padding:10px 16px 14px;background:#fff}.chat-reference-bar{display:flex;align-items:start;gap:10px;min-height:24px;margin-bottom:7px;color:var(--muted);font-size:10px}.chat-reference-bar>span{flex:none;padding-top:4px}.chat-reference-bar>div{display:flex;flex-wrap:wrap;gap:5px}.chat-reference-bar button{height:24px;max-width:180px;padding:0 7px;overflow:hidden;border:0;border-radius:7px;color:#5548bf;background:#eeecff;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;font-size:9px}.chat-reference-bar button i{margin-left:4px;font-style:normal}.account-chat-input{min-height:72px;max-height:150px;margin:0;padding:11px 13px;resize:vertical;line-height:1.55}.chat-compose-foot{display:flex;align-items:center;gap:12px;margin-top:8px}.chat-compose-foot small{flex:1}.send-account-chat{height:38px;padding:0 16px;border:0;border-radius:11px;color:#fff;background:linear-gradient(135deg,var(--purple),#5140d7);cursor:pointer;font-weight:800}.send-account-chat span{margin-left:7px}.chat-work-library{display:flex;flex-direction:column}.chat-work-library>header{height:70px;display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid var(--line)}.chat-work-library header b,.chat-work-library header small{display:block}.chat-work-library header small{margin-top:3px;color:var(--muted);font-size:10px}.chat-work-library header button{padding:5px 8px;border:0;border-radius:7px;color:#6a5bd5;background:#f1efff;cursor:pointer;font-size:10px}.chat-work-search{position:relative;margin:11px 12px}.chat-work-search>span{position:absolute;left:11px;top:18px;color:#8a8994}.chat-work-search input{height:38px;margin:0;padding:0 11px 0 31px;border-radius:10px;background:#f7f7f9;font-size:11px}.chat-work-list{flex:1;min-height:0;overflow:auto;padding:0 8px 10px}.chat-work-item{position:relative;display:grid;grid-template-columns:20px 48px minmax(0,1fr) 22px;gap:9px;align-items:center;margin:3px 0;padding:9px;border:1px solid transparent;border-radius:13px;cursor:pointer}.chat-work-item:hover{background:#f7f7fa}.chat-work-item.selected{border-color:#dcd7ff;background:#f5f3ff}.chat-work-item>input{position:absolute;opacity:0;pointer-events:none}.chat-check{width:18px;height:18px;display:grid;place-items:center;border:1.5px solid #c9c8d0;border-radius:6px;color:transparent;background:#fff;font-size:10px;font-weight:900}.chat-work-item.selected .chat-check{border-color:var(--purple);color:#fff;background:var(--purple)}.chat-work-item>img,.chat-cover-empty{width:48px;height:62px;display:grid;place-items:center;border-radius:9px;object-fit:cover;color:#fff;background:#292832;font-size:10px;font-weight:800}.chat-work-copy{min-width:0}.chat-work-copy b,.chat-work-copy small,.chat-work-copy em{display:block}.chat-work-copy b{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;font-size:11px;line-height:1.45}.chat-work-copy small{margin-top:5px;overflow:hidden;color:var(--muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.chat-work-copy em{margin-top:5px;font-size:9px;font-style:normal}.chat-work-copy em.ready{color:#08735f}.chat-work-copy em.pending{color:#8b6a13}.chat-work-item>button{width:22px;height:30px;padding:0;border:0;border-radius:7px;color:#777382;background:transparent;cursor:pointer;font-size:20px}.chat-work-item>button:hover{color:#5548bf;background:#e9e6ff}
      @media(max-width:980px){.report-layout{grid-template-columns:76px 1fr}.brand div,.report-layout nav span{display:none}.report-layout nav button{justify-content:center}.report-top{left:76px}.report-content{padding:28px 20px 110px}.metric-grid{grid-template-columns:repeat(2,1fr)}.two-col,.gap-grid,.template-grid,.cover-workshop,.viral-grid{grid-template-columns:1fr}.cover-gallery{grid-template-columns:repeat(6,1fr)}.cover-strip{grid-template-columns:repeat(3,1fr)}.account-chat-layout{grid-template-columns:1fr;height:auto}.account-chat-panel{height:680px}.chat-work-library{height:520px}}@media(max-width:640px){.form-grid,.feature-list,.cover-generation-controls{grid-template-columns:1fr}.sheet{padding:26px 20px}.report-layout{display:block}.report-layout>aside{position:fixed;left:0;right:0;bottom:0;z-index:10;height:62px;display:block;padding:7px;overflow-x:auto}.brand,.aside-foot{display:none!important}.report-layout nav{display:flex;min-width:760px}.report-layout nav button{width:80px;height:46px;display:block;text-align:center}.report-layout nav span{display:block!important;font-size:10px}.report-layout nav b{display:none}.report-top{left:0;height:112px;display:block;padding:12px 14px}.exports{margin-top:8px;overflow-x:auto}.report-layout>main{padding-top:112px}.report-content{padding:24px 14px 100px}.section-head h2{font-size:28px}.hero-card{display:block}.overall{margin-top:20px;text-align:left}.two-col,.gap-grid,.template-grid,.comment-list,.viral-grid{grid-template-columns:1fr}.cover-gallery{grid-template-columns:repeat(4,1fr)}.viral-card{grid-template-columns:72px 1fr}.viral-card>img{width:72px;height:98px}.account-chat-panel{height:630px}.account-messages{padding:14px}.account-message.user{margin-left:0}.chat-account-head>i{display:none}.chat-suggestions{padding-left:10px}.chat-composer{padding:10px}.chat-reference-bar{display:block}.cover-edit-source{align-items:flex-start;flex-direction:column}.launcher{width:52px;padding:6px 7px}.launcher-copy{display:none}}
    </style><button type="button" class="launcher" title="对标账号分析"><span class="launcher-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><circle cx="10" cy="10" r="5.5" stroke="currentColor" stroke-width="1.8"/><path d="M14.2 14.2 20 20M10 6.8v6.4M6.8 10h6.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></span><span class="launcher-copy"><b>对标分析</b><small>账号洞察</small></span></button><div class="shell"></div>`;
    document.documentElement.appendChild(host);
    state.shadow = shadow;
    shadow.querySelector('.launcher').addEventListener('click', () => state.report ? renderReport() : openSheet());
  }

  function cleanup() {
    state.cancelled = true;
    state.observer?.disconnect();
    document.getElementById(HOST_ID)?.remove();
    delete window[CLEANUP_KEY];
    delete window[API_KEY];
  }

  function init() {
    if (!document.body || document.getElementById(HOST_ID)) return;
    createUi();
    window[CLEANUP_KEY] = cleanup;
    window[API_KEY] = {
      start(options = {}) {
        if (typeof options === 'number') options = { maxItems: options };
        return runAnalysis(options);
      },
      open: () => state.report ? renderReport() : openSheet(),
      close: closeShell,
      stop: requestStop,
      showReport: renderReport,
      getState: () => ({ running: state.running, phase: state.phase, progress: state.progress, message: state.message, profile: state.profile ? { ...state.profile } : null, scanned: state.works.length, deepScanned: state.works.filter(work => work.deepScanned).length, metricsFetched: state.works.filter(work => work.metricsFetched).length, coverTasksRunning: state.coverTasks.filter(task => task.status === 'queued' || task.status === 'running').length, detailTasksRunning: Array.from(state.detailAnalyses.values()).filter(item => item.status === 'running').length, notes: state.notes.length, reportReady: Boolean(state.report), lastError: state.lastError }),
      getReport: () => state.report ? JSON.parse(JSON.stringify({ profile: state.profile, works: state.works, report: state.report, notes: state.notes, coverTasks: state.coverTasks, detailAnalyses: Array.from(state.detailAnalyses.entries()), replicationChat: state.replicationChat, accountChat: state.accountChat })) : null,
      downloadMarkdown: () => downloadBlob(new Blob([markdownReport()], { type: 'text/markdown;charset=utf-8' }), filename('md')),
      downloadCsv: () => downloadBlob(new Blob([csvReport()], { type: 'text/csv;charset=utf-8' }), filename('csv')),
      cleanup
    };
    console.log('[Tabbit] 抖音对标账号分析已启动。使用 window.__tabbitDouyinCompetitorAnalyzerApi.start() 开始。');
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();