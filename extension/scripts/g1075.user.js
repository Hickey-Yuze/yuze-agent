/*
 * Yuze Skill: AI 浏览护栏
 * Version: 0.9.3-privacy-details
 * Description: 在浏览网页时，同时守住你的注意力与隐私。
 * Runtime: Yuze Script Host / 任意浏览器页内执行
 */
(function () {
  const META = {
    name: 'AI 浏览护栏',
    subtitle: '在浏览网页时，同时守住你的注意力与隐私。',
    version: '0.9.3-privacy-details',
  };

  const PANEL_ID = 'abg_panel';
  const BUBBLE_ID = 'abg_bubble';
  const BUBBLE_MENU_ID = 'abg_bubble_menu';
  const DETAIL_ID = 'abg_detail';
  const STYLE_ID = 'abg_style';
  const HOST_PREFIX = '__abg__';
  const SNOOZE_KEY = 'snooze_until';
  const REMINDER_KEY = 'remind_at';
  const BUBBLE_HIDE_KEY = 'bubble_hide_until';
  const BUBBLE_POS_KEY = 'bubble_pos';
  const SCRIPT_VERSION_KEY = 'script_version';
  const BUBBLE_SIZE = 66;

  const TRACKERS = [
    { name: 'Google Analytics', re: /(google-analytics|googletagmanager|doubleclick)/i, meaning: '记录访问路径、停留时长和页面转化。' },
    { name: 'Meta Pixel', re: /(facebook\.net|connect\.facebook|facebook\.com\/tr|meta-pixel|metapixel)/i, meaning: '把浏览行为用于广告归因和后续再营销。' },
    { name: 'Hotjar', re: /hotjar/i, meaning: '分析你在页面里的停留、滚动和点击习惯。' },
    { name: 'Mixpanel', re: /mixpanel/i, meaning: '跟踪点击链路和行为路径。' },
    { name: 'Segment', re: /segment/i, meaning: '把页面行为分发给多个分析系统。' },
    { name: 'GrowingIO', re: /growingio/i, meaning: '用于用户行为分析和漏斗统计。' },
    { name: '广告网络', re: /(taboola|outbrain|criteo|adservice|adsystem|adnxs|amazon-adsystem)/i, meaning: '用于推荐分发、广告投放或营销跟踪。' },
  ];

  const HOST_RULES = [
    { host: /(youtube\.com|bilibili\.com|vimeo\.com)/i, category: 'video', label: '视频站点', score: 22 },
    { host: /(reddit\.com|weibo\.com|xiaohongshu\.com|instagram\.com|facebook\.com|x\.com|twitter\.com)/i, category: 'feed', label: '内容流站点', score: 26 },
    { host: /(amazon\.|ebay\.|jd\.com|taobao\.com|tmall\.com|pinduoduo\.com)/i, category: 'shopping', label: '购物站点', score: 24 },
    { host: /(bbc\.|cnn\.|nytimes\.|theguardian\.|medium\.com|36kr\.com|huxiu\.com)/i, category: 'news', label: '资讯站点', score: 12 },
    { host: /(github\.com|gitlab\.com|stackoverflow\.com)/i, category: 'dev', label: '开发站点', score: -10 },
    { host: /(notion\.so|feishu\.cn|yuque\.com|confluence|km\.sankuai\.com)/i, category: 'docs', label: '文档站点', score: -14 },
    { host: /(web\.Yuze\.com|skills\.Yuze\.com|console\.catpaw\.sankuai\.com|reactmind\.sankuai\.com|mlt\.sankuai\.com)/i, category: 'console', label: '控制台/配置页', score: -14 },
  ];

  const WORK_CONTEXT_RE = /(控制台|配置管理|配置页|设置页|工作台|管理台|dashboard|console|settings|workspace|studio|admin|runtimes|runtime|channel|agent|创建技炉|编辑技炉|我的技炉|my skills|skill editor|skill new|plaza\/skills|配置|发布|版本|渠道)/i;
  const SHOPPING_COPY_RE = /(购物|商品|促销|成交|加购|购物车|下单|买|优惠|限时抢购|推荐商品)/i;
  const FEED_COPY_RE = /(内容流|信息流|下一条|越刷越|热榜|热搜|刷下去|连续推荐)/i;

  const FOCUS_SELECTORS = [
    'aside',
    'iframe',
    '[class*="recommend"]',
    '[class*="related"]',
    '[class*="sidebar"]',
    '[class*="hot"]',
    '[class*="rank"]',
    '[class*="feed"] > :not(article):not(main)',
    '[class*="ad"]',
    '[id*="ad"]',
    '[class*="float"]',
    '[class*="sticky"]',
    '[class*="drawer"]',
    '[role="complementary"]',
    '[aria-label*="推荐"]',
    '[aria-label*="热榜"]',
    '[aria-label*="广告"]',
    '[data-testid*="recommend"]',
    '[data-testid*="sidebar"]'
  ];

  const OVERLAY_TEXT_RE = /(登录|注册|sign in|sign up|订阅|subscribe|继续浏览|允许通知|enable notifications|同意|accept|cookie|cookies|开启提醒|打开通知)/i;
  const QUESTION_TEXT_RE = /(question|answer|discussion|issue|问答|提问|回答|楼主|最佳答案|评论区|讨论区)/i;
  const TRACKER_URL_RE = /(google-analytics|googletagmanager|doubleclick|facebook\.net|connect\.facebook|mixpanel|segment|hotjar|growingio|criteo|taboola|outbrain|adservice|adsystem|adnxs|amazon-adsystem)/i;
  const TRACKING_QUERY_KEYS = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'utm_name', 'gclid', 'fbclid', 'msclkid', 'mc_cid', 'mc_eid', 'spm', 'scm', 'yclid', 'dclid', '_openstat', 'igshid']);
  const TRACKING_COOKIE_RULES = [
    { re: /^_ga($|_)/i, label: 'Google Analytics 标识', meaning: '把访问路径、会话和停留行为串起来。' },
    { re: /^_gid$/i, label: 'Google Analytics 会话标识', meaning: '区分短时访问会话与访问频次。' },
    { re: /^_gat/i, label: 'Google Analytics 采样控制', meaning: '配合统计请求的频率控制。' },
    { re: /^_gcl_/i, label: 'Google Ads 点击归因', meaning: '把广告点击和后续访问结果串起来。' },
    { re: /^_fbp$/i, label: 'Meta Pixel 浏览标识', meaning: '把浏览行为用于广告归因和再营销。' },
    { re: /^_fbc$/i, label: 'Meta 广告点击归因', meaning: '记录你是否从广告点击进入。' },
    { re: /^_hj/i, label: 'Hotjar 行为分析', meaning: '记录停留、滚动和点击习惯。' },
    { re: /^mp_/i, label: 'Mixpanel 行为分析', meaning: '记录事件链路和用户路径。' },
    { re: /^ajs_/i, label: 'Segment 行为分发', meaning: '把行为同步到多个分析系统。' },
    { re: /^(gio|gr_user_id|gr_session_id)/i, label: 'GrowingIO 行为分析', meaning: '记录用户行为和漏斗转化。' },
    { re: /^_clck$|^_clsk$/i, label: 'Clarity 回放分析', meaning: '记录点击和滚动轨迹。' },
    { re: /^AMP_/i, label: 'AMP 分析标识', meaning: '串联访问来源和会话链路。' },
    { re: /^__utm/i, label: '旧版 Google Analytics 标识', meaning: '记录来源、访问路径和停留。' },
  ];
  const IDENTITY_COOKIE_RE = /(session|sess|sid|auth|token|passport|login|ticket|jwt|csrf|xsrf|member|account|user(id)?|uid|bduss|ssid|remember)/i;
  const IDENTIFIER_COOKIE_RE = /(uuid|guid|device|visitor|distinct|fingerprint|clientid|deviceid|userid|user_id|uid|did|mid)/i;
  const TRACKING_STORAGE_RE = /(^|[:._-])(_ga|_gid|_gat|_fbp|_fbc|_gcl_|_hj|hotjar|mixpanel|segment|analytics|track|tracking|growingio|gio|clarity|_clck|_clsk|distinct_id|anonymous_id|visitor|fingerprint|deviceid|utm_|gclid|fbclid|last_source|campaign)([:._-]|$)/i;
  const PROTECTED_STORAGE_RE = /(token|auth|session|passport|login|ticket|jwt|csrf|xsrf|password|passwd|credential)/i;

  const state = {
    focus: false,
    panelOpen: false,
    report: null,
    narrative: null,
    toastTimer: null,
    bridgeInFlight: false,
    bridgeKey: '',
    bridgeActive: false,
    bridgeSource: '',
    lastBridgeError: '',
    lastBridgeRequest: null,
    lastBridgePayload: null,
    lastBridgeUsedAt: 0,
    bridgeGuardPlan: null,
    analyzeTimer: null,
    analyzeInFlight: false,
    pendingAnalyze: false,
    lastObservedUrl: '',
    lastPageSignature: '',
    lifecycleInstalled: false,
    domObserver: null,
    silentUrlMutation: false,
    lastAutoFocusedAt: 0,
    bubbleDrag: null,
    bubbleJustDragged: false,
    guardOutcome: null,
    privacyGuardActive: false,
    privacyHooks: null,
    outboundClickHandler: null,
    detailOpen: false,
    started: false,
    startTimer: null,
  };

  function getBridge() {
    const directBridge = (() => {
      try {
        return Function('try { return typeof LLMBridge !== "undefined" ? LLMBridge : null; } catch (e) { return null; }')();
      } catch {
        return null;
      }
    })();
    if (directBridge && typeof directBridge.chat === 'function') {
      state.bridgeSource = 'direct';
      return directBridge;
    }
    try {
      const candidates = [
        ['globalThis', globalThis.LLMBridge],
        ['window', window.LLMBridge],
        ['parent', window.parent?.LLMBridge],
        ['top', window.top?.LLMBridge],
      ];
      for (const [source, bridge] of candidates) {
        if (bridge && typeof bridge.chat === 'function') {
          state.bridgeSource = source;
          return bridge;
        }
      }
      state.bridgeSource = '';
      return null;
    } catch {
      const fallback = globalThis.LLMBridge || window.LLMBridge || null;
      if (fallback && typeof fallback.chat === 'function') {
        state.bridgeSource = 'fallback';
        return fallback;
      }
      state.bridgeSource = '';
      return null;
    }
  }

  function getBridgeStatus() {
    const bridge = getBridge();
    return {
      available: !!(bridge && typeof bridge.chat === 'function'),
      source: state.bridgeSource || '',
      hasWindow: !!window.LLMBridge,
      hasGlobalThis: !!globalThis.LLMBridge,
      hasParent: (() => { try { return !!window.parent?.LLMBridge; } catch { return false; } })(),
      hasTop: (() => { try { return !!window.top?.LLMBridge; } catch { return false; } })(),
      chatType: bridge ? typeof bridge.chat : 'undefined',
    };
  }

  function text(value) {
    return String(value || '');
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function uniq(list) {
    return [...new Set((list || []).filter(Boolean))];
  }

  function limitList(list, size = 6) {
    return (list || []).slice(0, size);
  }

  function hostKey(name) {
    return `${HOST_PREFIX}:${location.hostname}:${name}`;
  }

  function safeLength(storage) {
    try { return storage.length; } catch { return 0; }
  }

  function readStorage(storage, key) {
    try { return storage.getItem(key); } catch { return null; }
  }

  function writeStorage(storage, key, value) {
    try { storage.setItem(key, value); } catch {}
  }

  function removeStorage(storage, key) {
    try { storage.removeItem(key); } catch {}
  }

  function setSnooze(minutes) {
    writeStorage(localStorage, hostKey(SNOOZE_KEY), String(Date.now() + minutes * 60 * 1000));
  }

  function setBubbleHidden(minutes) {
    writeStorage(localStorage, hostKey(BUBBLE_HIDE_KEY), String(Date.now() + minutes * 60 * 1000));
  }

  function setBubbleHiddenUntil(timestamp) {
    writeStorage(localStorage, hostKey(BUBBLE_HIDE_KEY), String(timestamp));
  }

  function getEndOfTodayTimestamp() {
    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return end.getTime();
  }

  function isBubbleHidden() {
    const raw = Number(readStorage(localStorage, hostKey(BUBBLE_HIDE_KEY)) || 0);
    return Number.isFinite(raw) && raw > Date.now();
  }

  function clearBubbleHidden() {
    removeStorage(localStorage, hostKey(BUBBLE_HIDE_KEY));
  }

  function syncVersionState() {
    const key = hostKey(SCRIPT_VERSION_KEY);
    const prev = readStorage(localStorage, key);
    if (prev !== META.version) {
      clearBubbleHidden();
      writeStorage(localStorage, key, META.version);
    }
  }

  function restoreBubble() {
    clearBubbleHidden();
    syncBubbleVisibility();
    positionBubbleMenu();
  }

  function readBubblePosition() {
    const raw = readStorage(localStorage, hostKey(BUBBLE_POS_KEY));
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      if (!Number.isFinite(value?.left) || !Number.isFinite(value?.top)) return null;
      return value;
    } catch {
      return null;
    }
  }

  function saveBubblePosition(position) {
    if (!position) return;
    writeStorage(localStorage, hostKey(BUBBLE_POS_KEY), JSON.stringify(position));
  }

  function clampBubblePosition(left, top) {
    const margin = 12;
    return {
      left: clamp(left, margin, Math.max(margin, window.innerWidth - BUBBLE_SIZE - margin)),
      top: clamp(top, margin, Math.max(margin, window.innerHeight - BUBBLE_SIZE - margin)),
    };
  }

  function applyBubblePosition(position) {
    const bubble = document.getElementById(BUBBLE_ID);
    if (!bubble) return;
    if (!position) {
      bubble.style.left = '';
      bubble.style.top = '';
      bubble.style.right = '18px';
      bubble.style.bottom = '18px';
      return;
    }
    const safe = clampBubblePosition(position.left, position.top);
    bubble.style.left = `${safe.left}px`;
    bubble.style.top = `${safe.top}px`;
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
  }

  function syncBubbleVisibility() {
    const bubble = document.getElementById(BUBBLE_ID);
    if (!bubble) return;
    bubble.style.display = isBubbleHidden() ? 'none' : 'flex';
    if (isBubbleHidden()) hideBubbleMenu();
  }

  function positionBubbleMenu() {
    const bubble = document.getElementById(BUBBLE_ID);
    const menu = document.getElementById(BUBBLE_MENU_ID);
    if (!bubble || !menu || menu.getAttribute('data-open') !== 'true') return;
    const rect = bubble.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = 132;
    const margin = 12;
    let left = rect.left + rect.width - menuWidth;
    let top = rect.top - menuHeight - 10;
    if (left < margin) left = margin;
    if (left + menuWidth > window.innerWidth - margin) left = window.innerWidth - margin - menuWidth;
    if (top < margin) top = rect.bottom + 10;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function showBubbleMenu() {
    const menu = document.getElementById(BUBBLE_MENU_ID);
    if (!menu) return;
    menu.setAttribute('data-open', 'true');
    positionBubbleMenu();
  }

  function hideBubbleMenu() {
    const menu = document.getElementById(BUBBLE_MENU_ID);
    if (!menu) return;
    menu.setAttribute('data-open', 'false');
  }

  function toggleBubbleMenu() {
    const menu = document.getElementById(BUBBLE_MENU_ID);
    if (!menu) return;
    if (menu.getAttribute('data-open') === 'true') hideBubbleMenu();
    else showBubbleMenu();
  }

  function isSnoozed() {
    const raw = Number(readStorage(localStorage, hostKey(SNOOZE_KEY)) || 0);
    return Number.isFinite(raw) && raw > Date.now();
  }

  function scheduleReminder(minutes) {
    writeStorage(localStorage, hostKey(REMINDER_KEY), String(Date.now() + minutes * 60 * 1000));
  }

  function isVisible(node) {
    if (!(node instanceof Element)) return false;
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.width > 120 && rect.height > 40;
  }

  function tokenize(value) {
    return uniq((text(value).toLowerCase().match(/[a-z0-9]+|[\u4e00-\u9fa5]{1,6}/g) || []).filter((item) => item.length > 1));
  }

  function goalAlignment(goal, pageText) {
    const goalTokens = tokenize(goal);
    if (!goalTokens.length) return { score: 50, overlap: [] };
    const pageTokens = new Set(tokenize(pageText));
    const overlap = goalTokens.filter((token) => pageTokens.has(token));
    return { score: Math.round((overlap.length / goalTokens.length) * 100), overlap };
  }

  function inferTaskGoal(title, pageText) {
    const source = `${location.href} ${title} ${pageText}`.toLowerCase();
    if (/baidu\.com/i.test(location.hostname) && /[?&]wd=/.test(location.search)) {
      try {
        const url = new URL(location.href);
        const q = text(url.searchParams.get('wd')).trim();
        if (q) return `搜索并获取和“${q}”直接相关的结果`; 
      } catch {}
      return '搜索并获取直接相关的结果';
    }
    if (/km\.sankuai\.com/i.test(location.hostname)) return '阅读当前知识页或空间页的主要内容';
    if (/123\.sankuai\.com/i.test(location.hostname)) return '查看问题和答案主链路';
    if (/(price|参数|规格|商品|加购|购物车|buy now|add to cart|coupon|折扣|立减)/i.test(source)) return '比较商品信息与关键参数';
    if (/(article|blog|news|wiki|document|正文|文章|知识库)/i.test(source)) return '阅读当前页面的主要正文内容';
    if (/(workspace|dashboard|console|设置|配置|工作台|管理台)/i.test(source)) return '完成当前页面的主操作任务';
    return '';
  }

  function alignmentHint(alignment) {
    if (!alignment || !Number.isFinite(alignment.score)) return '';
    if (alignment.score >= 72) return '当前页面和你的任务基本一致，我会避免误伤主链路。';
    if (alignment.score <= 34) return '当前页面里有不少内容会把你从原任务上带偏。';
    return '这页里既有主任务内容，也混着容易分心的旁支入口。';
  }

  function summarizeDomSkeleton() {
    const nodes = [...document.querySelectorAll('main, article, section, aside, nav, div, header')]
      .filter((node) => node instanceof HTMLElement && !shouldProtectNode(node) && isVisible(node))
      .slice(0, 240)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const txt = text(node.innerText).trim();
        const cls = String(node.className || '').trim().replace(/\s+/g, '.').slice(0, 60);
        const id = String(node.id || '').trim().slice(0, 40);
        const selector = `${node.tagName.toLowerCase()}${id ? `#${id}` : ''}${cls ? `.${cls.split('.').filter(Boolean).slice(0,2).join('.')}` : ''}`;
        const area = Math.round(rect.width * rect.height);
        return {
          selector,
          textLen: txt.length,
          area,
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          sticky: ['fixed', 'sticky'].includes(getComputedStyle(node).position),
          score: txt.length * 1.1 + area / 1500,
        };
      })
      .filter((item) => item.textLen >= 40 || item.area >= 50000)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    return nodes.map((item) => `${item.selector}|text=${item.textLen}|area=${item.area}|top=${item.top}|sticky=${item.sticky ? '1' : '0'}`);
  }

  function getPageSignature() {
    const title = document.title || '';
    const path = `${location.hostname}${location.pathname}${location.search}`;
    const resultCount = document.querySelectorAll('#content_left .result, #content_left .c-container, article, main article').length;
    const actionCount = document.querySelectorAll('a, button').length;
    return `${path}|${title.slice(0, 60)}|r=${resultCount}|a=${actionCount}`;
  }

  function scheduleAnalyze(delay = 220) {
    clearTimeout(state.analyzeTimer);
    state.analyzeTimer = setTimeout(() => {
      analyze();
    }, delay);
  }

  function installLifecycleHooks() {
    if (state.lifecycleInstalled) return;
    state.lifecycleInstalled = true;
    state.lastObservedUrl = location.href;
    state.lastPageSignature = getPageSignature();

    const wrapHistory = (name) => {
      const original = history[name];
      if (typeof original !== 'function') return;
      history[name] = function (...args) {
        const result = original.apply(this, args);
        if (!state.silentUrlMutation) scheduleAnalyze(180);
        return result;
      };
    };
    wrapHistory('pushState');
    wrapHistory('replaceState');

    window.addEventListener('popstate', () => scheduleAnalyze(180), true);
    window.addEventListener('hashchange', () => scheduleAnalyze(180), true);
    window.addEventListener('pageshow', () => scheduleAnalyze(220), true);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') scheduleAnalyze(220);
    }, true);

    const observer = new MutationObserver(() => {
      const bubbleExists = !!document.getElementById(BUBBLE_ID);
      const currentUrl = location.href;
      const signature = getPageSignature();
      const baiduSearchReady = /baidu\.com/i.test(location.hostname) && /\/s(\?|$)/.test(location.pathname + location.search) && !!document.querySelector('#content_left');
      if (!bubbleExists || currentUrl !== state.lastObservedUrl || signature !== state.lastPageSignature || baiduSearchReady) {
        state.lastObservedUrl = currentUrl;
        state.lastPageSignature = signature;
        scheduleAnalyze(200);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    state.domObserver = observer;
  }

  function scoreContentNode(node) {
    const rect = node.getBoundingClientRect();
    const area = rect.width * rect.height;
    const textLen = text(node.innerText).trim().length;
    const mediaCount = node.querySelectorAll('p, img, video, h1, h2, h3').length;
    return textLen * 1.15 + area / 1400 + mediaCount * 14;
  }

  function findPrimaryContent() {
    const direct = [...document.querySelectorAll('main, article, [role="main"], #content, .content, .main')]
      .filter((node) => isVisible(node) && !node.closest(`#${PANEL_ID}`));
    if (direct.length) return direct.sort((a, b) => scoreContentNode(b) - scoreContentNode(a))[0];

    const candidates = [...document.querySelectorAll('article, section, div')]
      .filter((node) => isVisible(node) && !node.closest(`#${PANEL_ID}`) && !node.closest(`#${BUBBLE_ID}`))
      .slice(0, 200);

    return candidates.sort((a, b) => scoreContentNode(b) - scoreContentNode(a))[0] || document.body;
  }

  function getPageIntent(report) {
    const category = report?.pageSignals?.category || 'generic';
    if (category === 'challenge') return 'challenge';
    if (/baidu\.com/i.test(location.hostname) && /\/s(\?|$)/.test(location.pathname + location.search)) return 'search';
    if (/km\.sankuai\.com/i.test(location.hostname) && document.querySelector('.ProseMirror, .ct-editor-box, .ct-editor-content')) return 'doc';
    if (/123\.sankuai\.com/i.test(location.hostname) && document.querySelector('.q-question-page__main, .q-question-detail, .q-question-answer')) return 'qa';
    if (QUESTION_TEXT_RE.test(location.href + ' ' + document.title + ' ' + text(document.body?.innerText).slice(0, 1500))) return 'qa';
    if (category === 'shopping') return 'shopping';
    if (category === 'feed' || category === 'video') return 'feed';
    if (category === 'news') return 'article';
    if (category === 'docs') return 'doc';
    if (category === 'console' || category === 'dev' || category === 'work') return 'workspace';
    return 'generic';
  }

  function shouldProtectNode(node) {
    if (!(node instanceof HTMLElement)) return false;
    return Boolean(node.closest(`#${PANEL_ID}`) || node.closest(`#${BUBBLE_ID}`) || node.closest(`#${BUBBLE_MENU_ID}`));
  }

  function readableNodeScore(node) {
    if (!(node instanceof HTMLElement) || !isVisible(node)) return -1;
    const txt = text(node.innerText).trim();
    if (txt.length < 80) return -1;
    const rect = node.getBoundingClientRect();
    const textWeight = txt.length;
    const paragraphWeight = node.querySelectorAll('p, li, h1, h2, h3, pre, code').length * 22;
    const widthWeight = Math.min(rect.width, window.innerWidth) * 0.3;
    const areaWeight = Math.min(rect.width * rect.height, window.innerWidth * window.innerHeight * 1.5) / 7000;
    const penalty = node.querySelectorAll('nav, aside, [role="complementary"]').length * 80;
    return textWeight + paragraphWeight + widthWeight + areaWeight - penalty;
  }

  function findReadingTarget(report) {
    if (/baidu\.com/i.test(location.hostname) && /\/s(\?|$)/.test(location.pathname + location.search)) {
      const baiduMain = document.querySelector('#content_left, #content_left .result-op, #content_left .result, #content_left .c-container');
      if (baiduMain instanceof HTMLElement) return baiduMain;
    }
    if (/123\.sankuai\.com/i.test(location.hostname)) {
      const qaMain = document.querySelector('.q-question-page__main, .q-question-detail, .q-question-info, .q-question-answer__content');
      if (qaMain instanceof HTMLElement) return qaMain;
    }
    if (/km\.sankuai\.com/i.test(location.hostname)) {
      const kmMain = document.querySelector('.ProseMirror, .ct-editor-box, .ct-editor-content');
      if (kmMain instanceof HTMLElement) return kmMain;
    }
    const main = findPrimaryContent();
    const scored = [main, ...document.querySelectorAll('main, article, [role="main"], .markdown-body, .markdown-body.entry-content, .wiki-content, .ql-editor, .ProseMirror, .content, .article, .article-content, .question-content, .answer-content, .post, .post-content')]
      .filter((node, idx, arr) => node instanceof HTMLElement && arr.indexOf(node) === idx)
      .map((node) => ({ node, score: readableNodeScore(node) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score);
    return scored[0]?.node || main || document.body;
  }

  function domainMeaning(domain) {
    const tracker = TRACKERS.find((item) => item.re.test(domain));
    if (tracker) return tracker.meaning;
    return '把页面行为发往外部系统处理。';
  }

  function shortenDomain(domain) {
    return String(domain || '').replace(/^www\./, '');
  }

  function findOverlayCandidates() {
    const nodes = [...document.querySelectorAll('div,section,aside')];
    return uniq(nodes.filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.id === PANEL_ID || node.id === BUBBLE_ID || node.closest(`#${PANEL_ID}`) || node.closest(`#${BUBBLE_ID}`)) return false;
      if (!isVisible(node)) return false;
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const sticky = style.position === 'fixed' || style.position === 'sticky';
      const zIndex = Number.parseInt(style.zIndex || '0', 10);
      const textHit = OVERLAY_TEXT_RE.test(text(node.innerText).slice(0, 200));
      const bottomBar = sticky && rect.width > window.innerWidth * 0.35 && rect.height >= 48 && rect.height < window.innerHeight * 0.35;
      const modalLike = sticky && rect.width > 220 && rect.height > 120 && rect.top < window.innerHeight * 0.85 && rect.height < window.innerHeight * 0.8;
      const rootLike = ['BODY', 'HTML', 'MAIN'].includes(node.tagName) || node.children.length > 120 || (rect.width > window.innerWidth * 0.9 && rect.height > window.innerHeight * 0.9);
      const topLayer = sticky && (Number.isNaN(zIndex) || zIndex >= 20);
      return textHit && topLayer && !rootLike && (bottomBar || modalLike);
    }));
  }

  function collectDomains() {
    return uniq(
      [...document.querySelectorAll('script[src],img[src],iframe[src],link[href],video[src],audio[src]')]
        .map((node) => node.src || node.href || '')
        .filter(Boolean)
        .map((url) => {
          try { return new URL(url, location.href).hostname; } catch { return ''; }
        })
        .filter(Boolean)
    );
  }

  function detectTrackers(domains) {
    const hits = [];
    for (const domain of domains) {
      for (const tracker of TRACKERS) {
        if (tracker.re.test(domain)) {
          hits.push({ name: tracker.name, domain, meaning: tracker.meaning });
          break;
        }
      }
    }
    return hits;
  }

  function describeValueShape(value, kind) {
    const raw = text(value || '');
    if (!raw) return '空值';
    if (kind === 'identity' && raw.length >= 16) return '长串身份凭证';
    if (/@/.test(raw)) return '疑似账号或邮箱';
    if (/^\d{8,}$/.test(raw)) return '长数字标识';
    if (/^[A-Za-z0-9+/_=-]{24,}$/.test(raw)) return '长串标识';
    if (raw.length <= 12) return '短值';
    return '普通值';
  }

  function classifyCookie(name, value) {
    const rule = TRACKING_COOKIE_RULES.find((item) => item.re.test(name));
    if (rule) return { kind: 'tracking', label: rule.label, meaning: rule.meaning, removable: true, valueShape: describeValueShape(value, 'tracking') };
    if (IDENTITY_COOKIE_RE.test(name)) return { kind: 'identity', label: '登录/身份会话', meaning: '用于维持登录状态或身份识别，默认不自动清理，避免误伤。', removable: false, valueShape: describeValueShape(value, 'identity') };
    if (IDENTIFIER_COOKIE_RE.test(name)) return { kind: 'identifier', label: '设备/用户标识', meaning: '用于区分设备、浏览器或访问者。', removable: false, valueShape: describeValueShape(value, 'identifier') };
    if (/(consent|privacy|cookie)/i.test(name)) return { kind: 'consent', label: '隐私/同意记录', meaning: '记录你对隐私弹窗或授权提示的选择。', removable: false, valueShape: describeValueShape(value, 'consent') };
    return { kind: 'other', label: '站点业务 Cookie', meaning: '可能用于页面偏好、业务状态或站点功能。', removable: false, valueShape: describeValueShape(value, 'other') };
  }

  function collectCookieDetails() {
    const items = [];
    try {
      text(document.cookie)
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((item) => {
          const index = item.indexOf('=');
          const name = (index >= 0 ? item.slice(0, index) : item).trim();
          const value = index >= 0 ? item.slice(index + 1) : '';
          if (!name) return;
          items.push({ name, ...classifyCookie(name, value) });
        });
    } catch {}
    return {
      items,
      tracking: items.filter((item) => item.kind === 'tracking'),
      identity: items.filter((item) => item.kind === 'identity'),
      identifier: items.filter((item) => item.kind === 'identifier'),
      consent: items.filter((item) => item.kind === 'consent'),
    };
  }

  function classifyStorageKey(key, value) {
    const source = `${key} ${text(value)}`;
    if (PROTECTED_STORAGE_RE.test(key)) return { kind: 'identity', label: '登录/凭证存储', meaning: '看起来像登录态或凭证，不自动清理。', removable: false, valueShape: describeValueShape(value, 'identity') };
    if (TRACKING_STORAGE_RE.test(source)) return { kind: 'tracking', label: '追踪/归因存储', meaning: '用于记录来源、归因、设备标识或行为轨迹。', removable: true, valueShape: describeValueShape(value, 'tracking') };
    if (/(recent|history|search|keyword|query|last|seen|viewed|visited)/i.test(key)) return { kind: 'history', label: '浏览/搜索历史', meaning: '会保留你最近的浏览、搜索或查看轨迹。', removable: false, valueShape: describeValueShape(value, 'history') };
    return { kind: 'other', label: '站点业务存储', meaning: '用于站点功能、偏好或页面状态。', removable: false, valueShape: describeValueShape(value, 'other') };
  }

  function collectStorageDetails(storage, storageName) {
    const items = [];
    try {
      for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (!key) continue;
        const value = readStorage(storage, key);
        items.push({ storage: storageName, key, ...classifyStorageKey(key, value) });
      }
    } catch {}
    return {
      storage: storageName,
      total: items.length,
      items,
      tracking: items.filter((item) => item.kind === 'tracking'),
      identity: items.filter((item) => item.kind === 'identity'),
      history: items.filter((item) => item.kind === 'history'),
    };
  }

  function formatNamePreview(items, formatter, limit = 4) {
    const picked = limitList(items, limit).map(formatter).filter(Boolean);
    if (!picked.length) return '';
    return picked.join('、') + (items.length > limit ? ` 等 ${items.length} 项` : '');
  }

  function formatCookiePreview(item) {
    return `${item.name}（${item.label}，${item.valueShape}）`;
  }

  function formatStoragePreview(item) {
    return `${item.key}（${item.label}，${item.valueShape}）`;
  }

  function formatPermissionName(name) {
    const map = {
      notifications: '通知',
      geolocation: '定位',
      camera: '摄像头',
      microphone: '麦克风',
    };
    return map[name] || name;
  }

  function formatPermissionState(state) {
    const map = {
      granted: '已授权',
      prompt: '会弹授权',
      denied: '已拒绝',
      unknown: '未知',
    };
    return map[state] || state || '未知';
  }

  function detectTrackingParams(urlString = location.href) {
    try {
      const url = new URL(urlString, location.href);
      return uniq([...url.searchParams.keys()].filter((key) => TRACKING_QUERY_KEYS.has(String(key).toLowerCase())));
    } catch {
      return [];
    }
  }

  function removeTrackingCookies(cookieDetails) {
    const removed = [];
    (cookieDetails?.tracking || []).forEach((item) => {
      expireCookie(item.name);
      removed.push(item.name);
    });
    return uniq(removed);
  }

  function scrubTrackingStorage(storage, snapshot) {
    const removed = [];
    (snapshot?.tracking || []).forEach((item) => {
      try {
        storage.removeItem(item.key);
        removed.push(item.key);
      } catch {}
    });
    return uniq(removed);
  }

  function summarizeCookieDetails(details) {
    const items = details?.items || [];
    if (!items.length) return '当前页没有读到可见 Cookie；HttpOnly Cookie 不会出现在这里。';
    const sections = [];
    if (details.tracking?.length) sections.push(`追踪类：${formatNamePreview(details.tracking, formatCookiePreview)}`);
    if (details.identity?.length) sections.push(`身份类：${formatNamePreview(details.identity, formatCookiePreview)}`);
    if (details.identifier?.length) sections.push(`标识类：${formatNamePreview(details.identifier, formatCookiePreview)}`);
    if (!sections.length) sections.push(`可见项：${formatNamePreview(items, formatCookiePreview, 5)}`);
    return `当前页可见 Cookie 共 ${items.length} 项；${sections.join('；')}。`;
  }

  function summarizeStorageDetails(label, details) {
    const items = details?.items || [];
    if (!items.length) return `${label} 里没有读到可见键。`;
    const sections = [];
    if (details.tracking?.length) sections.push(`追踪类：${formatNamePreview(details.tracking, formatStoragePreview)}`);
    if (details.identity?.length) sections.push(`凭证类：${formatNamePreview(details.identity, formatStoragePreview)}`);
    if (details.history?.length) sections.push(`历史类：${formatNamePreview(details.history, formatStoragePreview)}`);
    if (!sections.length) sections.push(`可见项：${formatNamePreview(items, formatStoragePreview, 5)}`);
    return `${label} 当前可见 ${items.length} 项；${sections.join('；')}。`;
  }

  function summarizeTrackerDomains(report) {
    const trackerHits = report?.trackerHits || [];
    if (trackerHits.length) {
      return `页面加载了第三方追踪/分析域：${formatNamePreview(trackerHits, (item) => `${item.name}（${shortenDomain(item.domain)}）`, 4)}。`;
    }
    const domains = limitList((report?.domains || []).filter((domain) => domain !== location.hostname), 4).map((domain) => shortenDomain(domain));
    if (domains.length) return `页面还连到了这些第三方域：${domains.join('、')}。`;
    return '当前页没看到明显的第三方追踪或分析脚本域。';
  }

  function summarizePermissionDetails(permissions) {
    if (!permissions?.length) return '当前浏览器没有暴露可查询的权限状态。';
    return `权限面：${permissions.map((item) => `${formatPermissionName(item.name)}（${formatPermissionState(item.state)}）`).join('、')}。`;
  }

  function buildExposureCards() {
    const report = state.report || {};
    const cards = [];
    const cookieDetails = report.cookieDetails || { items: [], tracking: [], identity: [], identifier: [], consent: [] };
    const localDetails = report.localStorageDetails || { items: [], tracking: [], identity: [], history: [] };
    const sessionDetails = report.sessionStorageDetails || { items: [], tracking: [], identity: [], history: [] };
    const permissions = report.permissions || [];
    const permissionSignals = report.permissionSignals || [];
    const currentParams = report.urlTrackingParams || [];
    const trackerHits = report.trackerHits || [];
    const thirdPartyDomains = (report.domains || []).filter((domain) => domain !== location.hostname);

    cards.push({
      tone: currentParams.length ? 'warn' : 'neutral',
      title: '地址参数',
      summary: currentParams.length ? `当前地址带有 ${currentParams.length} 个追踪参数` : '当前地址未见常见追踪参数',
      chips: currentParams.length ? currentParams : ['无追踪参数'],
    });

    cards.push({
      tone: cookieDetails.items.length ? 'info' : 'neutral',
      title: 'Cookie',
      summary: `可见 ${cookieDetails.items.length} 项`,
      chips: [
        cookieDetails.tracking.length ? `追踪 ${cookieDetails.tracking.length}` : '',
        cookieDetails.identity.length ? `身份 ${cookieDetails.identity.length}` : '',
        cookieDetails.identifier.length ? `标识 ${cookieDetails.identifier.length}` : '',
        cookieDetails.consent.length ? `同意 ${cookieDetails.consent.length}` : '',
      ].filter(Boolean),
      detail: formatNamePreview(cookieDetails.items, formatCookiePreview, 3) || '无',
    });

    cards.push({
      tone: localDetails.items.length || sessionDetails.items.length ? 'info' : 'neutral',
      title: '本地存储',
      summary: `localStorage ${localDetails.items.length} 项 · sessionStorage ${sessionDetails.items.length} 项`,
      chips: [
        localDetails.history.length ? `历史 ${localDetails.history.length}` : '',
        localDetails.tracking.length + sessionDetails.tracking.length ? `追踪 ${localDetails.tracking.length + sessionDetails.tracking.length}` : '',
        localDetails.identity.length + sessionDetails.identity.length ? `凭证 ${localDetails.identity.length + sessionDetails.identity.length}` : '',
      ].filter(Boolean),
      detail: [
        localDetails.items.length ? `local：${formatNamePreview(localDetails.items, formatStoragePreview, 2)}` : '',
        sessionDetails.items.length ? `session：${formatNamePreview(sessionDetails.items, formatStoragePreview, 2)}` : '',
      ].filter(Boolean).join('；') || '无',
    });

    cards.push({
      tone: trackerHits.length || thirdPartyDomains.length ? 'warn' : 'neutral',
      title: '第三方连接',
      summary: trackerHits.length ? `命中 ${trackerHits.length} 个追踪/分析域` : `第三方域 ${thirdPartyDomains.length} 个`,
      chips: trackerHits.length
        ? limitList(trackerHits, 4).map((item) => item.name)
        : (limitList(thirdPartyDomains, 4).map((item) => shortenDomain(item)) || ['无明显第三方域']),
      detail: trackerHits.length
        ? formatNamePreview(trackerHits, (item) => `${item.name}（${shortenDomain(item.domain)}）`, 3)
        : (limitList(thirdPartyDomains, 4).map((item) => shortenDomain(item)).join('、') || '无'),
    });

    cards.push({
      tone: permissionSignals.length ? 'warn' : 'neutral',
      title: '权限能力',
      summary: permissions.length ? `${permissions.length} 类权限可查询` : '当前未读到权限状态',
      chips: permissions.length ? permissions.map((item) => `${formatPermissionName(item.name)}·${formatPermissionState(item.state)}`) : ['未知'],
      detail: permissionSignals.length ? `页面具备请求：${permissionSignals.map((item) => `${item.label}（${formatPermissionState(item.state)}）`).join('、')}` : '当前页面未明显命中权限请求文案。',
    });

    return cards;
  }

  function buildActionCards() {
    const report = state.report || {};
    const hooks = state.privacyHooks || {};
    const removedParams = Array.isArray(hooks.removedParams) ? hooks.removedParams : [];
    const cleanedLinks = Number(hooks.cleanedLinks || 0);
    const hiddenOverlays = Number(hooks.overlayCount || 0);
    const hiddenAds = Number(hooks.adCount || 0);
    const cards = [];

    if (removedParams.length) {
      cards.push({ tone: 'ok', title: '地址清理', summary: `已移除 ${removedParams.length} 个追踪参数`, chips: removedParams });
    }
    if (cleanedLinks > 0) {
      cards.push({ tone: 'ok', title: '外跳去追踪', summary: `已改写 ${cleanedLinks} 个外跳链接`, chips: [`链接 ${cleanedLinks}`] });
    }
    if (hooks.removedCookies?.length) {
      cards.push({ tone: 'ok', title: 'Cookie 清理', summary: `已清掉 ${hooks.removedCookies.length} 个追踪 Cookie`, chips: hooks.removedCookies.slice(0, 6) });
    }
    if (hooks.removedLocalStorage?.length || hooks.removedSessionStorage?.length) {
      cards.push({
        tone: 'ok',
        title: '本地追踪清理',
        summary: `local ${hooks.removedLocalStorage?.length || 0} 项 · session ${hooks.removedSessionStorage?.length || 0} 项`,
        chips: [...(hooks.removedLocalStorage || []), ...(hooks.removedSessionStorage || [])].slice(0, 6),
      });
    }
    if (hiddenAds > 0) {
      cards.push({ tone: 'ok', title: '广告位压低', summary: `已压掉 ${hiddenAds} 个广告/推广位`, chips: [`广告 ${hiddenAds}`] });
    }
    if (hiddenOverlays > 0) {
      cards.push({ tone: 'ok', title: '浮层隐藏', summary: `已隐藏 ${hiddenOverlays} 个浮层/侧块`, chips: [`浮层 ${hiddenOverlays}`] });
    }

    if (!cards.length) {
      cards.push({ tone: 'neutral', title: '当前没有额外收紧动作', summary: '这一页暂时没有命中需要自动收紧的明显项', chips: ['无动作'] });
    }

    return cards;
  }

  function renderDetailCards(container, cards) {
    if (!container) return;
    container.innerHTML = '';
    cards.forEach((card) => {
      const item = document.createElement('div');
      item.className = `detail-card ${card.tone || 'neutral'}`;

      const title = document.createElement('div');
      title.className = 'detail-card-title';
      title.textContent = card.title || '';
      item.appendChild(title);

      const summary = document.createElement('div');
      summary.className = 'detail-card-summary';
      summary.textContent = card.summary || '';
      item.appendChild(summary);

      if (card.detail) {
        const detail = document.createElement('div');
        detail.className = 'detail-card-detail';
        detail.textContent = card.detail;
        item.appendChild(detail);
      }

      if (Array.isArray(card.chips) && card.chips.length) {
        const chips = document.createElement('div');
        chips.className = 'detail-chip-row';
        card.chips.filter(Boolean).slice(0, 8).forEach((chipText) => {
          const chip = document.createElement('span');
          chip.className = 'detail-chip';
          chip.textContent = String(chipText);
          chips.appendChild(chip);
        });
        item.appendChild(chips);
      }

      container.appendChild(item);
    });
  }

  async function getPermissions() {
    const names = ['notifications', 'geolocation', 'camera', 'microphone'];
    const out = [];
    if (!navigator.permissions?.query) return out;
    for (const name of names) {
      try {
        const result = await navigator.permissions.query({ name });
        out.push({ name, state: result.state });
      } catch {}
    }
    return out;
  }

  function detectPageSignals(source) {
    const hostRule = HOST_RULES.find((rule) => rule.host.test(location.hostname));
    const rules = [
      { type: 'short-video', label: '短视频/强推荐页', re: /(douyin|tiktok|kuaishou|reels|shorts|短视频)/, score: 30 },
      { type: 'social-feed', label: '社交内容流', re: /(xiaohongshu|weibo|instagram|facebook|twitter|x\.com|reddit|关注|推荐关注)/, score: 24 },
      { type: 'shopping', label: '购物/营销页', re: /(taobao|tmall|jd\.com|amazon|pinduoduo|ebay|购物|商品|限时抢购|优惠券|同款|加入购物车|立即购买)/, score: 24 },
      { type: 'news', label: '资讯/文章页', re: /(news|资讯|headline|article|blog|推荐阅读|猜你喜欢|热榜)/, score: 12 },
      { type: 'docs', label: '文档/知识库', re: /(docs|notion|feishu|yuque|confluence|km\.|wiki|document)/, score: -14 },
      { type: 'dev', label: '开发工作页', re: /(github|gitlab|stack overflow|localhost|cursor|vscode|code)/, score: -10 },
      { type: 'console', label: '控制台/配置页', re: /(console|dashboard|workspace|studio|settings|配置|设置|工作台|管理台|创建技炉|编辑技炉|我的技炉|my skills|runtimes|runtime|channel|agent)/, score: -12 },
      { type: 'work', label: '办公协作页', re: /(jira|ones|slack|gmail|calendar|figma)/, score: -8 },
    ];

    let score = 10;
    let category = 'generic';
    let categoryLabel = '普通页面';
    const reasons = [];

    for (const rule of rules) {
      if (!rule.re.test(source)) continue;
      const conflictingPositive = hostRule && hostRule.score > 0 && rule.score > 0 && rule.type !== hostRule.category;
      const conflictingNegative = hostRule && hostRule.score < 0 && rule.score < 0 && rule.type !== hostRule.category;
      const hostPinned = hostRule && hostRule.score > 0 && rule.score > 0 && rule.type !== hostRule.category;
      if (conflictingPositive || conflictingNegative || hostPinned) continue;
      score += rule.score;
      reasons.push(rule.label);
      if (category === 'generic' && (rule.score > 0 || ['docs', 'dev', 'work', 'console'].includes(rule.type))) {
        category = rule.type;
        categoryLabel = rule.label;
      }
    }

    if (hostRule) {
      score += hostRule.score;
      reasons.push(hostRule.label);
      if (hostRule.score > 0 || category === 'generic' || hostRule.score < 0) {
        category = hostRule.category;
        categoryLabel = hostRule.label;
      }
      if (hostRule.score > 0) {
        const allowed = new Set([hostRule.label, '页面有连续推荐或侧边热榜', '页面有悬浮卡片或固定提示', '页面包含视频内容', '页面可点击入口很多', '页面由连续内容卡片组成', '页面有明显成交和促销信号', '页面以文章主体为主', '站点安全校验']);
        for (let i = reasons.length - 1; i >= 0; i -= 1) {
          if (!allowed.has(reasons[i])) reasons.splice(i, 1);
        }
      }
    }

    const recommendCount = document.querySelectorAll('[class*="recommend"],[class*="related"],[class*="hot"],[class*="rank"],aside,[role="complementary"]').length;
    const floatingCount = [...document.querySelectorAll('*')].filter((node) => {
      if (!(node instanceof HTMLElement)) return false;
      if (node.id === PANEL_ID || node.id === BUBBLE_ID || node.closest(`#${PANEL_ID}`) || node.closest(`#${BUBBLE_ID}`)) return false;
      const style = getComputedStyle(node);
      return (style.position === 'fixed' || style.position === 'sticky') && node.offsetWidth > 120 && node.offsetHeight > 40;
    }).length;
    const videoCount = document.querySelectorAll('video').length;
    const actionCount = document.querySelectorAll('a, button').length;
    const cardCount = document.querySelectorAll('article, [data-testid*="post"], [class*="card"], [class*="item"]').length;
    const priceHit = /(¥|￥|\$|加购|加入购物车|buy now|add to cart|coupon|折扣|立减)/i.test(source) && !/(algolia|wikipedia|github|gitlab|docs|wiki)/i.test(location.hostname + ' ' + source.slice(0, 300));
    const headlineHit = document.querySelector('h1, article h2, main h1');
    const workContextHit = WORK_CONTEXT_RE.test(source);

    if (workContextHit && !priceHit && videoCount === 0) {
      score -= 12;
      reasons.push('页面更像工作台或配置界面');
      if (category === 'generic' || category === 'docs' || category === 'dev' || category === 'work' || category === 'console') {
        category = 'console';
        categoryLabel = '控制台/配置页';
      }
    }

    if (category === 'console') {
      score = Math.max(0, score - 8);
    }

    if (recommendCount >= 1 && !/wikipedia\.org/i.test(location.hostname)) {
      score += Math.min(18, 8 + recommendCount * 2);
      reasons.push('页面有连续推荐或侧边热榜');
    }
    if (floatingCount >= 1) {
      score += Math.min(14, 6 + floatingCount * 2);
      reasons.push('页面有悬浮卡片或固定提示');
    }
    if (videoCount >= 1) {
      score += 10;
      reasons.push('页面包含视频内容');
    }
    if (actionCount >= 80 && !/wikipedia\.org/i.test(location.hostname)) {
      score += 8;
      reasons.push('页面可点击入口很多');
    }
    if (cardCount >= 12 && !/wikipedia\.org/i.test(location.hostname)) {
      score += 10;
      reasons.push('页面由连续内容卡片组成');
    }
    if (priceHit) {
      score += 8;
      reasons.push('页面有明显成交和促销信号');
    }
    if (headlineHit && /article|news|medium|bbc|theguardian|nytimes/i.test(location.hostname)) {
      reasons.push('页面以文章主体为主');
    }

    const challengePage = /(attention required|verify you are human|cloudflare|安全验证|robot check|captcha)/i.test(source);
    if (challengePage) {
      score = Math.min(score, 18);
      category = 'challenge';
      categoryLabel = '安全校验页';
      reasons.length = 0;
      reasons.push('站点安全校验');
    }

    return {
      score: clamp(score, 0, 100),
      reasons: uniq(reasons),
      category,
      categoryLabel,
      recommendCount,
      floatingCount,
      videoCount,
      actionCount,
      cardCount,
      priceHit,
      overlayCount: findOverlayCandidates().length,
    };
  }

  function bubbleState(level) {
    if (state.focus) return '已净化';
    if (level === 'high') return '留意';
    if (level === 'medium') return '观察';
    return '平稳';
  }

  function notice(message) {
    const toast = document.getElementById(`${PANEL_ID}_toast`);
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(state.toastTimer);
    state.toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function trackerSummary(hits) {
    const names = uniq(hits.map((item) => item.name));
    if (!names.length) return '';
    if (names.length === 1) return `我识别到 ${names[0]} 脚本，通常会${hits.find((item) => item.name === names[0])?.meaning || '记录浏览行为'}`;
    if (names.length === 2) return `我识别到 ${names[0]} 和 ${names[1]}，通常会记录访问路径，并把行为用于统计或营销`;
    return `我识别到 ${names.slice(0, 2).join('、')} 等脚本，通常会记录访问路径、停留和转化行为`;
  }

  function trackerActionSummary(hits) {
    if (!hits.length) return '';
    const top = hits.slice(0, 2).map((item) => `${item.name}（${shortenDomain(item.domain)}）`);
    if (top.length === 1) return `${top[0]} 会继续把浏览行为送去统计或营销系统。`;
    return `${top.join('、')} 会继续把浏览行为送去统计或营销系统。`;
  }

  function formatPrivacyCurrentExposure() {
    const report = state.report || {};
    const lines = [];
    const cookieDetails = report.cookieDetails || { items: [], tracking: [], identity: [], identifier: [], consent: [] };
    const localDetails = report.localStorageDetails || { items: [], tracking: [], identity: [], history: [] };
    const sessionDetails = report.sessionStorageDetails || { items: [], tracking: [], identity: [], history: [] };
    const permissions = report.permissions || [];
    const currentParams = report.urlTrackingParams || [];

    lines.push(currentParams.length ? `当前地址里带有这些常见追踪参数：${currentParams.join('、')}。` : '当前地址里没有可见的常见追踪参数。');
    lines.push(summarizeCookieDetails(cookieDetails));
    lines.push(summarizeStorageDetails('localStorage', localDetails));
    lines.push(summarizeStorageDetails('sessionStorage', sessionDetails));
    lines.push(summarizeTrackerDomains(report));
    lines.push(summarizePermissionDetails(permissions));
    if (report.permissionSignals?.length) {
      lines.push(`当前页具备请求这些权限的能力：${report.permissionSignals.map((item) => `${item.label}（${formatPermissionState(item.state)}）`).join('、')}。`);
    }
    return lines;
  }

  function formatPrivacyActions() {
    const report = state.report || {};
    const hooks = state.privacyHooks || {};
    const lines = [];
    const removedParams = Array.isArray(hooks.removedParams) ? hooks.removedParams : [];
    const cleanedLinks = Number(hooks.cleanedLinks || 0);
    const hiddenOverlays = Number(hooks.overlayCount || 0);
    const hiddenAds = Number(hooks.adCount || 0);
    const cookieDetails = report.cookieDetails || { tracking: [] };

    lines.push(removedParams.length ? `我已经从当前地址里去掉这些追踪参数：${removedParams.join('、')}。` : '这次没有在当前地址里命中可直接去掉的常见追踪参数。');
    lines.push(cleanedLinks > 0 ? `我已经把 ${cleanedLinks} 个外跳链接改成不再携带常见追踪参数。` : '我已经挂上外跳去追踪处理，但这页暂时没有命中需要改写的链接。');
    if (hooks.removedCookies?.length) lines.push(`我已经安全清掉这些追踪 Cookie：${hooks.removedCookies.join('、')}。`);
    else if (cookieDetails.tracking?.length) lines.push(`当前页识别到了追踪 Cookie，但为了避免误伤业务状态，只自动清理了可明确判定为追踪用途的项。`);
    else lines.push('这次没有命中需要自动清掉的追踪 Cookie。');
    lines.push(hooks.removedLocalStorage?.length ? `我已经清掉 localStorage 里的追踪项：${hooks.removedLocalStorage.join('、')}。` : '这次没有命中需要自动清掉的 localStorage 追踪项。');
    lines.push(hooks.removedSessionStorage?.length ? `我已经清掉 sessionStorage 里的追踪项：${hooks.removedSessionStorage.join('、')}。` : '这次没有命中需要自动清掉的 sessionStorage 追踪项。');
    lines.push(hiddenAds > 0 ? `我已经额外压掉 ${hiddenAds} 个广告或推广位。` : '这一步没有额外压掉广告位。');
    lines.push(hiddenOverlays > 0 ? `我已经额外隐藏 ${hiddenOverlays} 个打断式浮层或侧块。` : '这一步没有额外隐藏打断式浮层。');
    return lines;
  }

  function detectPermissionPromptSignals(source, permissions) {
    const rules = [
      { name: 'notifications', label: '通知', re: /(通知|notification|enable notifications|allow notifications|订阅提醒)/i },
      { name: 'geolocation', label: '定位', re: /(定位|位置|location|nearby|附近门店)/i },
      { name: 'camera', label: '摄像头', re: /(摄像头|camera|扫码|scan qr|take photo)/i },
      { name: 'microphone', label: '麦克风', re: /(麦克风|microphone|语音|voice search|speak)/i },
    ];
    const hits = [];
    for (const rule of rules) {
      const perm = permissions.find((item) => item.name === rule.name);
      const textHit = rule.re.test(source);
      const granted = perm?.state === 'granted';
      if (textHit || granted) hits.push({ name: rule.name, label: rule.label, state: perm?.state || 'unknown' });
    }
    return hits;
  }

  function permissionSummary(permissionSignals) {
    if (!permissionSignals.length) return '';
    return `这页看起来会用到${permissionSignals.map((item) => item.label).join('、')}；如果你现在只是浏览内容，通常没必要授权。`;
  }

  function permissionActionSummary(permissionSignals) {
    if (!permissionSignals.length) return '';
    const labels = permissionSignals.map((item) => item.label).join('、');
    return `这页具备请求${labels}的能力；你现在只是浏览时，先别急着给。`;
  }

  function isWorkLikeCategory(category) {
    return ['docs', 'dev', 'work', 'console'].includes(category);
  }

  function hasStrongFeedSignals(report) {
    return report.pageSignals.videoCount > 0 || report.pageSignals.recommendCount >= 2 || report.pageSignals.cardCount >= 16;
  }

  function hasStrongShoppingSignals(report) {
    return report.pageSignals.priceHit || /amazon\.|ebay\.|jd\.com|taobao\.com|tmall\.com|pinduoduo\.com/i.test(location.hostname);
  }

  function shouldUseBridge(report) {
    if (report.pageSignals.category === 'challenge') return false;
    if (isWorkLikeCategory(report.pageSignals.category) && report.combined < 46 && !report.trackerHits.length && !(report.permissionSignals || []).length) return false;
    if (report.combined >= 42) return true;
    if ((report.permissionSignals || []).length || report.trackerHits.length) return true;
    if (['docs', 'news', 'shopping', 'feed', 'video', 'console'].includes(report.pageSignals.category)) return true;
    return false;
  }

  function bridgeFacts(report) {
    const title = report.title;
    const bodyText = text(document.body?.innerText).slice(0, 5000);
    const taskGoal = inferTaskGoal(title, bodyText);
    const cookieNames = limitList((report.cookieDetails?.items || []).map((item) => `${item.name}:${item.kind}`), 8);
    const localStorageKeys = limitList((report.localStorageDetails?.items || []).map((item) => `${item.key}:${item.kind}`), 8);
    const sessionStorageKeys = limitList((report.sessionStorageDetails?.items || []).map((item) => `${item.key}:${item.kind}`), 8);
    return {
      title,
      url: location.href,
      host: location.hostname,
      category: report.pageSignals.category,
      categoryLabel: report.pageSignals.categoryLabel,
      level: report.level,
      attention: report.attention,
      privacy: report.privacy,
      combined: report.combined,
      workLike: isWorkLikeCategory(report.pageSignals.category),
      recommendCount: report.pageSignals.recommendCount,
      floatingCount: report.pageSignals.floatingCount,
      videoCount: report.pageSignals.videoCount,
      cardCount: report.pageSignals.cardCount,
      priceHit: report.pageSignals.priceHit,
      overlayCount: report.pageSignals.overlayCount,
      trackerNames: uniq(report.trackerHits.map((item) => item.name)),
      permissionNames: (report.permissionSignals || []).map((item) => item.name),
      urlTrackingParams: report.urlTrackingParams || [],
      cookieNames,
      localStorageKeys,
      sessionStorageKeys,
      reasons: report.pageSignals.reasons,
      taskGoal,
      alignmentScore: report.alignment?.score,
      alignmentOverlap: report.alignment?.overlap || [],
      domSkeleton: summarizeDomSkeleton(),
    };
  }

  function bridgePayloadText(payload) {
    return [payload?.headline, payload?.summary, ...(Array.isArray(payload?.points) ? payload.points : [])]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function normalizeSelectorList(input) {
    if (!Array.isArray(input)) return [];
    return input
      .map((item) => String(item || '').trim())
      .filter((item) => item && item.length <= 180 && !/[{}<>]/.test(item))
      .slice(0, 8);
  }

  function normalizeGuardPlan(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw.guardPlan && typeof raw.guardPlan === 'object' ? raw.guardPlan : raw;
    const plan = {
      primarySelector: String(payload.primarySelector || '').trim(),
      preserveSelectors: normalizeSelectorList(payload.preserveSelectors),
      dimSelectors: normalizeSelectorList(payload.dimSelectors),
      hideSelectors: normalizeSelectorList(payload.hideSelectors),
      pageMode: String(payload.pageMode || '').trim().slice(0, 40),
      userIntent: String(payload.userIntent || '').trim().slice(0, 100),
      confidence: Math.max(0, Math.min(100, Number(payload.confidence || payload.riskFocus?.confidence || 0) || 0)),
      rationale: String(payload.rationale || '').trim().slice(0, 120),
    };
    if (!plan.primarySelector && !plan.preserveSelectors.length && !plan.dimSelectors.length && !plan.hideSelectors.length) return null;
    return plan;
  }

  function safeQuerySelector(selector) {
    if (!selector) return null;
    try {
      const node = document.querySelector(selector);
      return node instanceof HTMLElement ? node : null;
    } catch {
      return null;
    }
  }

  function safeQuerySelectorAll(selectors) {
    const nodes = [];
    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((node) => {
          if (node instanceof HTMLElement) nodes.push(node);
        });
      } catch {}
    });
    return uniq(nodes);
  }

  function isBridgePayloadDrifting(payload, report) {
    const content = bridgePayloadText(payload);
    if (!content) return true;

    if (isWorkLikeCategory(report.pageSignals.category) && report.attention < 56 && !hasStrongFeedSignals(report) && !hasStrongShoppingSignals(report)) {
      if (SHOPPING_COPY_RE.test(content) || FEED_COPY_RE.test(content)) return true;
    }

    if (report.pageSignals.category === 'shopping' && /文档|工作内容|配置页|控制台|知识库/i.test(content) && hasStrongShoppingSignals(report)) return true;
    if ((report.pageSignals.category === 'docs' || report.pageSignals.category === 'news' || report.pageSignals.category === 'console') && SHOPPING_COPY_RE.test(content) && !hasStrongShoppingSignals(report)) return true;
    if (report.pageSignals.category === 'feed' && /工作台|配置页|控制台/i.test(content)) return true;

    return false;
  }

  function attentionSummary(report) {
    const intent = getPageIntent(report);
    if (report.pageSignals.categoryLabel === '安全校验页') return '这页主要是站点安全校验，不是内容消费页。';
    if (intent === 'search') return '这页核心应该是主搜索结果，不是广告结果、右栏热榜和相关搜索。';
    if (intent === 'doc') return '这页以正文为主，我会尽量保留正文阅读区，只压低侧边干扰。';
    if (intent === 'workspace') return '这页更像工作或开发页面，我不会把主操作区误伤成阅读模式。';
    if (intent === 'qa') return '这页核心是问题、回答和讨论，我会优先保留问答主链路。';
    if (report.pageSignals.categoryLabel === '资讯站点' && report.attention < 45 && report.privacy < 55) return '这页以正文阅读为主，我先不打断你。';
    const fragments = [];
    if (report.pageSignals.recommendCount > 0) fragments.push('连续推荐区');
    if (report.pageSignals.floatingCount > 0) fragments.push('悬浮提示');
    if (report.pageSignals.videoCount > 0) fragments.push('视频内容');
    if (report.pageSignals.cardCount >= 12) fragments.push('连续内容卡片');
    if (report.pageSignals.priceHit) fragments.push('促销成交信号');
    if (!fragments.length && report.pageSignals.categoryLabel !== '普通页面') fragments.push(report.pageSignals.categoryLabel);
    if (!fragments.length) return '这页本身没有太强的停留诱导。';
    return `这页有${fragments.join('、')}，很容易把你继续带去看下一个内容。`;
  }

  function taskSummary(report) {
    const taskGoal = inferTaskGoal(report.title, text(document.body?.innerText).slice(0, 2400));
    const hint = alignmentHint(report.alignment);
    if (!taskGoal) return hint;
    if (!hint) return `你现在更像是在${taskGoal}。`;
    return `你现在更像是在${taskGoal}。${hint}`;
  }

  function buildNarrative(report) {
    const privacyHigh = report.privacy >= 65;
    const attentionHigh = report.attention >= 60;
    const intent = getPageIntent(report);
    const modeLabel = state.focus ? '已净化' : report.level === 'high' ? '需要护栏' : report.level === 'medium' ? '观察' : '平稳';
    const focusRecommended = report.attention >= 50 || report.pageSignals.recommendCount > 0 || report.pageSignals.floatingCount > 0 || report.pageSignals.overlayCount > 0 || ['shopping', 'feed', 'video'].includes(report.pageSignals.category) || intent === 'search';

    let headline = '这页整体还算克制';
    if (state.focus && attentionHigh && privacyHigh) headline = '我已经同时收住分心入口，也减轻了继续留痕';
    else if (state.focus && attentionHigh) headline = '我已经先把最容易带偏你的入口压下去了';
    else if (state.focus && privacyHigh) headline = '我已经先帮你把容易继续留痕的动作收紧了';
    else if (attentionHigh && privacyHigh) headline = '这页一边拉你停留，一边继续记你的浏览痕迹';
    else if (attentionHigh) headline = '这页会继续把你往下带';
    else if (privacyHigh) headline = '这页会继续留下浏览痕迹';
    if (intent === 'search' && !state.focus) headline = '这页把广告、热榜和相关搜索混在了结果里';
    if (intent === 'search' && state.focus) headline = '我已经先把搜索页里最容易带偏你的入口压下去了';

    let summary = '我先轻量观察，没有急着动页面。';
    if (intent === 'doc') {
      summary = state.focus ? '我保留了正文阅读区，把边栏、悬浮提示和非正文入口压低了。' : privacyHigh ? '这页主要是正文，但也带着统计或权限信号。' : '这页以正文为主，我先尽量不打断你的阅读。';
    } else if (intent === 'qa') {
      summary = state.focus ? '我保留了问题、回答和讨论主线，把旁支入口压低了。' : '这页的核心应该是问答本身，不是周边推荐和无关入口。';
    } else if (intent === 'workspace') {
      summary = state.focus ? '我保留了主操作区，只把边栏、营销块和悬浮干扰压低，没有把整页做成阅读模式。' : privacyHigh ? '这页更像工作界面，但外部统计或权限信号不算少。' : '这页更像工作界面，我会避免误伤主操作区。';
    } else if (intent === 'search') {
      summary = state.focus ? '我已经把搜索结果页里的广告位、右栏热榜和相关搜索压低了，只优先留主结果区。' : '这页里混着广告结果、右栏热榜和相关搜索，很容易把你从真实结果带偏。';
    } else if (intent === 'shopping') {
      summary = state.focus ? '我已经先把推荐商品、营销位和悬浮成交入口压低了。' : '这页会不断把注意力拉向更多商品、推荐和成交入口。';
    } else if (intent === 'feed') {
      summary = state.focus ? '我已经先把连续推荐、悬浮卡片和继续下滑的入口压低了。' : '这页会不断把你引向下一条内容。';
    } else if (attentionHigh && privacyHigh) {
      summary = '这页同时存在明显的停留诱导和留痕信号。';
    } else if (attentionHigh) {
      summary = '这页的分心入口比你真正要看的内容更抢眼。';
    } else if (privacyHigh) {
      summary = '这页除了内容本身，还在把浏览信号送去更多地方。';
    }

    const points = [];
    points.push(attentionSummary(report));
    const taskLine = taskSummary(report);
    if (taskLine) points.push(taskLine);
    const trackerLine = trackerActionSummary(report.trackerHits) || trackerSummary(report.trackerHits);
    if (trackerLine) points.push(trackerLine);
    const permissionLine = permissionActionSummary(report.permissionSignals || []) || permissionSummary(report.permissionSignals || []);
    if (permissionLine) points.push(permissionLine);
    if (!trackerLine && !permissionLine && report.pageSignals.overlayCount > 0) points.push('这页还有会突然打断你的订阅、登录或同意类浮层。');
    if (state.privacyGuardActive) points.push('我已先收紧本页能直接带走你的外跳追踪参数，并压住常见打断式浮层。');
    if (!trackerLine && !permissionLine && report.pageSignals.overlayCount === 0 && !state.privacyGuardActive) points.push('我暂时没看到需要立刻出手收紧的留痕动作。');

    let actionLine = '我会继续在后台盯着这页，不需要你频繁操作。';
    if (state.focus) {
      if (intent === 'doc') actionLine = '我保留了正文主链路，弱化了目录、边栏、悬浮提示和非正文区。';
      else if (intent === 'qa') actionLine = '我保留了问题、回答与评论主链路，把旁支推荐和装饰区压低了。';
      else if (intent === 'workspace') actionLine = '我只压低了边栏、营销和悬浮干扰，主操作区保持可点可用。';
      else if (intent === 'search') actionLine = '我已经优先保留主搜索结果，把广告位、右栏推荐、相关搜索和热榜压低了。';
      else if (intent === 'shopping') actionLine = '我已经先压低推荐商品、广告位和浮层成交入口。';
      else if (intent === 'feed') actionLine = '我已经先收住连续推荐、热榜和会把你继续带走的入口。';
      else actionLine = '我已经先把最容易让你分心的区域压低了。';
      if (state.privacyGuardActive) actionLine += ' 同时也先收紧了本页最直接的留痕入口。';
    } else if (focusRecommended) {
      if (intent === 'workspace') actionLine = '如果你想更专注，我可以只压低边栏和悬浮干扰，不动主操作区。';
      else if (intent === 'doc') actionLine = '如果你想更安静，我可以优先保留正文主链路。';
      else if (intent === 'search') actionLine = '如果你想更干净，我可以优先只留主搜索结果。';
      else if (intent === 'qa') actionLine = '如果你想更干净，我可以只保留问答主链路。';
      else actionLine = '如果你想更专注，我可以立刻压低最容易把你带偏的区域。';
    }

    const primaryLabel = state.focus ? '恢复原页面' : '开启护栏';

    return {
      headline,
      summary,
      points: points.slice(0, 3),
      actionLine,
      primaryLabel,
      statusLabel: modeLabel,
      focusRecommended,
      contextLabel: report.pageSignals.categoryLabel,
      aiLabel: state.bridgeActive ? 'AI 总结' : '',
    };
  }

  function setBubble(level) {
    const bubble = document.getElementById(BUBBLE_ID);
    if (!bubble) return;
    bubble.className = level;
    const label = bubble.querySelector('.state');
    if (label) label.textContent = bubbleState(level);
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    if (!document.head && !document.documentElement) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${BUBBLE_ID}{position:fixed;right:18px;bottom:18px;z-index:2147483647;width:66px;height:66px;border-radius:999px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;cursor:pointer;background:rgba(15,23,42,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 20px 48px rgba(0,0,0,.34);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;transition:transform .16s ease,box-shadow .2s ease;pointer-events:auto;touch-action:none;user-select:none;position:fixed;overflow:visible}
      #${BUBBLE_ID}:hover{transform:translateY(-2px)}
      #${BUBBLE_ID}.low{box-shadow:0 0 0 6px rgba(34,197,94,.14),0 20px 48px rgba(0,0,0,.34)}
      #${BUBBLE_ID}.medium{box-shadow:0 0 0 6px rgba(245,158,11,.16),0 20px 48px rgba(0,0,0,.34)}
      #${BUBBLE_ID}.high{box-shadow:0 0 0 7px rgba(239,68,68,.18),0 20px 48px rgba(0,0,0,.34)}
      #${BUBBLE_ID} .inner{display:flex;flex-direction:column;align-items:center;line-height:1;gap:4px}
      #${BUBBLE_ID} .icon{font-size:22px}
      #${BUBBLE_ID} .label{font-size:11px;font-weight:800;letter-spacing:.02em}
      #${BUBBLE_ID} .state{font-size:10px;opacity:.8}
      #${BUBBLE_ID} .close{position:absolute;top:-4px;right:-4px;width:22px;height:22px;border-radius:999px;border:1px solid rgba(148,163,184,.24);background:#111827;color:#dbe7ff;font-size:12px;font-weight:900;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 8px 20px rgba(0,0,0,.24)}
      #${BUBBLE_MENU_ID}{position:fixed;z-index:2147483647;width:180px;padding:8px;background:rgba(15,23,42,.98);border:1px solid rgba(92,112,146,.32);border-radius:16px;box-shadow:0 20px 48px rgba(0,0,0,.36);display:none;pointer-events:auto}
      #${BUBBLE_MENU_ID}[data-open="true"]{display:block}
      #${BUBBLE_MENU_ID} .menu-title{padding:6px 8px 8px;color:#cbd5e1;font-size:12px;font-weight:700}
      #${BUBBLE_MENU_ID} button{width:100%;height:36px;border:0;background:transparent;color:#eef2ff;border-radius:10px;text-align:left;padding:0 10px;font-size:13px;cursor:pointer}
      #${BUBBLE_MENU_ID} button:hover{background:rgba(59,130,246,.12)}

      #${PANEL_ID}{position:fixed;right:18px;bottom:96px;width:396px;max-height:calc(100vh - 124px);overflow:auto;z-index:2147483647;background:rgba(15,23,42,.97);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(92,112,146,.32);border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.42);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#eef2ff;pointer-events:auto}
      #${PANEL_ID}[data-hidden="true"]{display:none}
      #${PANEL_ID} *{box-sizing:border-box}
      #${PANEL_ID} .wrap{padding:18px}
      #${PANEL_ID} .hd{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      #${PANEL_ID} .title{font-size:21px;font-weight:900;line-height:1.2}
      #${PANEL_ID} .sub{margin-top:6px;color:#9fb0cc;font-size:13px;line-height:1.65}
      #${PANEL_ID} .panel-close{width:28px;height:28px;flex:0 0 auto;border-radius:999px;border:1px solid rgba(148,163,184,.24);background:#111827;color:#dbe7ff;font-size:16px;font-weight:900;display:flex;align-items:center;justify-content:center;cursor:pointer}
      #${PANEL_ID} .hero{margin-top:14px;padding:16px;border-radius:18px;background:linear-gradient(180deg,rgba(11,18,32,.98),rgba(10,15,27,.95));border:1px solid rgba(92,112,146,.22)}
      #${PANEL_ID} .chipbar{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:nowrap}
      #${PANEL_ID} .chip{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:800;background:rgba(59,130,246,.12);color:#b8dcff;border:1px solid rgba(59,130,246,.18);white-space:nowrap;flex:0 0 auto}
      #${PANEL_ID} .chip.secondary{background:rgba(148,163,184,.12);color:#d0dae8;border:1px solid rgba(148,163,184,.18);white-space:nowrap}
      #${PANEL_ID} .status{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:900}
      #${PANEL_ID} .status.low{background:rgba(34,197,94,.15);color:#9ef0b1}
      #${PANEL_ID} .status.medium{background:rgba(245,158,11,.16);color:#ffd37c}
      #${PANEL_ID} .status.high{background:rgba(239,68,68,.15);color:#ffb0b0}
      #${PANEL_ID} .headline{margin-top:12px;font-size:19px;font-weight:900;line-height:1.45;color:#f8fbff}
      #${PANEL_ID} .summary{margin-top:8px;font-size:14px;line-height:1.8;color:#dbe7ff}
      #${PANEL_ID} .section{margin-top:14px;padding-top:14px;border-top:1px solid rgba(92,112,146,.16)}
      #${PANEL_ID} .section-title{font-size:12px;font-weight:900;color:#8fd3ff;letter-spacing:.04em;text-transform:uppercase}
      #${PANEL_ID} .section-text{margin-top:8px;color:#dbe7ff;font-size:13px;line-height:1.8}
      #${PANEL_ID} .list{margin:10px 0 0;padding-left:18px;color:#dbe7ff;font-size:13px;line-height:1.82}
      #${PANEL_ID} .list li+li{margin-top:8px}
      #${PANEL_ID} .actions{margin-top:16px}
      #${PANEL_ID} .primary{width:100%;height:44px;border:0;border-radius:14px;background:linear-gradient(90deg,#7c3aed,#2563eb);color:#fff;font-weight:900;cursor:pointer;transition:transform .15s ease,opacity .15s ease}
      #${PANEL_ID} .primary:hover{transform:translateY(-1px)}
      #${PANEL_ID} .primary.restore{background:linear-gradient(90deg,#0f766e,#0ea5a4);color:#f8fffe;border:1px solid rgba(45,212,191,.42);box-shadow:0 8px 24px rgba(13,148,136,.22)}
      #${PANEL_ID} .secondary{width:100%;height:40px;border-radius:12px;border:1px solid rgba(148,163,184,.24);background:rgba(15,23,42,.58);color:#d9e7ff;font-weight:800;cursor:pointer;margin-top:10px}
      #${PANEL_ID} .secondary.active{background:rgba(37,99,235,.18);border-color:rgba(96,165,250,.42);color:#eff6ff}
      #${PANEL_ID} .detail{display:none;margin-top:10px;padding:12px 14px;border-radius:14px;background:rgba(2,6,23,.45);border:1px solid rgba(92,112,146,.22)}
      #${PANEL_ID} .detail[data-open="true"]{display:block}
      #${PANEL_ID} .detail-title{font-size:12px;font-weight:900;color:#9fd4ff;margin-bottom:8px}
      #${PANEL_ID} .detail-block + .detail-block{margin-top:12px;padding-top:12px;border-top:1px solid rgba(92,112,146,.18)}
      #${PANEL_ID} .detail-subtitle{font-size:12px;font-weight:900;color:#dbeafe;margin-bottom:8px}
      #${PANEL_ID} .detail-list{margin:0;padding:0;color:#dbe7ff;font-size:12px;line-height:1.75;list-style:none}
      #${PANEL_ID} .detail-card{padding:12px;border-radius:12px;background:rgba(15,23,42,.58);border:1px solid rgba(92,112,146,.18)}
      #${PANEL_ID} .detail-card + .detail-card{margin-top:10px}
      #${PANEL_ID} .detail-card.ok{border-color:rgba(45,212,191,.26);background:rgba(13,148,136,.08)}
      #${PANEL_ID} .detail-card.warn{border-color:rgba(250,204,21,.28);background:rgba(161,98,7,.08)}
      #${PANEL_ID} .detail-card.neutral{border-color:rgba(148,163,184,.18)}
      #${PANEL_ID} .detail-card.info{border-color:rgba(96,165,250,.22);background:rgba(37,99,235,.08)}
      #${PANEL_ID} .detail-card-title{font-size:12px;font-weight:900;color:#f8fbff}
      #${PANEL_ID} .detail-card-summary{margin-top:4px;font-size:13px;line-height:1.65;color:#dbe7ff}
      #${PANEL_ID} .detail-card-detail{margin-top:6px;font-size:12px;line-height:1.7;color:#a9b8d3}
      #${PANEL_ID} .detail-chip-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      #${PANEL_ID} .detail-chip{display:inline-flex;align-items:center;max-width:100%;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(148,163,184,.16);font-size:11px;line-height:1.4;color:#e8f1ff;word-break:break-all}
      #${PANEL_ID} .utility{display:flex;justify-content:flex-end;gap:12px;margin-top:12px;font-size:12px}
      #${PANEL_ID} .utility a{color:#9fd4ff;text-decoration:none;cursor:pointer}
      #${PANEL_ID} .toast{position:sticky;bottom:0;margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(13,20,35,.96);border:1px solid rgba(92,112,146,.24);font-size:12px;color:#dbe7ff;opacity:0;transform:translateY(6px);transition:opacity .18s ease,transform .18s ease;pointer-events:none}
      #${PANEL_ID} .toast.show{opacity:1;transform:translateY(0)}
      .abg_dimmed{opacity:.22 !important;filter:saturate(.55) blur(.2px) !important;transition:opacity .16s ease,filter .16s ease}
      .abg_hidden{display:none !important}
      .abg_focus_main{position:relative !important;z-index:1 !important;outline:2px solid rgba(34,211,238,.32) !important;outline-offset:4px !important;border-radius:10px !important}
      .abg_guard_rail{opacity:.32 !important;filter:saturate(.6) !important;transition:opacity .16s ease,filter .16s ease}
      .abg_guard_hide{display:none !important}
      .abg_guard_main{position:relative !important;z-index:1 !important;box-shadow:0 0 0 1px rgba(56,189,248,.2) inset !important;border-radius:12px !important}
      .abg_guard_soft{scroll-margin-top:80px}
      html.abg_focus_html{scroll-behavior:smooth}
      @media (max-width:520px){#${PANEL_ID}{left:12px;right:12px;width:auto;bottom:86px}#${BUBBLE_ID}{right:14px;bottom:14px}}
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureUI() {
    if (!document.body) return false;
    ensureStyle();

    if (!document.getElementById(BUBBLE_ID)) {
      const bubble = document.createElement('button');
      bubble.id = BUBBLE_ID;
      bubble.type = 'button';
      bubble.className = 'medium';
      bubble.setAttribute('aria-label', `打开 ${META.name}`);
      bubble.innerHTML = '<span class="close" title="暂时关闭 30 分钟">×</span><div class="inner"><div class="icon">🛡</div><div class="label">护栏</div><div class="state">检测中</div></div>';
      bubble.addEventListener('pointerdown', (event) => {
        if (event.target.closest('.close')) return;
        const rect = bubble.getBoundingClientRect();
        state.bubbleDrag = {
          pointerId: event.pointerId,
          startX: event.clientX,
          startY: event.clientY,
          offsetX: event.clientX - rect.left,
          offsetY: event.clientY - rect.top,
          moved: false,
        };
        bubble.setPointerCapture?.(event.pointerId);
      });
      bubble.addEventListener('pointermove', (event) => {
        const drag = state.bubbleDrag;
        if (!drag || drag.pointerId !== event.pointerId) return;
        const dx = event.clientX - drag.startX;
        const dy = event.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) >= 6) drag.moved = true;
        if (!drag.moved) return;
        event.preventDefault();
        applyBubblePosition({ left: event.clientX - drag.offsetX, top: event.clientY - drag.offsetY });
        positionBubbleMenu();
      });
      const endDrag = (event) => {
        const drag = state.bubbleDrag;
        if (!drag || drag.pointerId !== event.pointerId) return;
        if (drag.moved) {
          const rect = bubble.getBoundingClientRect();
          saveBubblePosition({ left: rect.left, top: rect.top });
          positionBubbleMenu();
          state.bubbleJustDragged = true;
          setTimeout(() => { state.bubbleJustDragged = false; }, 80);
        }
        state.bubbleDrag = null;
        bubble.releasePointerCapture?.(event.pointerId);
      };
      bubble.addEventListener('pointerup', endDrag);
      bubble.addEventListener('pointercancel', endDrag);
      bubble.addEventListener('click', (event) => {
        if (event.target.closest('.close')) return;
        if (state.bubbleJustDragged) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        togglePanel(!state.panelOpen);
      });
      bubble.querySelector('.close')?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        togglePanel(false);
        toggleBubbleMenu();
      });
      document.body.appendChild(bubble);
      applyBubblePosition(readBubblePosition());
      syncBubbleVisibility();
      window.addEventListener('resize', () => {
        const position = readBubblePosition();
        if (position) applyBubblePosition(position);
        positionBubbleMenu();
      });
    }

    if (!document.getElementById(BUBBLE_MENU_ID)) {
      const menu = document.createElement('div');
      menu.id = BUBBLE_MENU_ID;
      menu.setAttribute('data-open', 'false');
      menu.innerHTML = `
        <div class="menu-title">护栏暂时隐藏多久？</div>
        <button type="button" data-hide-minutes="5">5 分钟不显示</button>
        <button type="button" data-hide-minutes="10">10 分钟不显示</button>
        <button type="button" data-hide-until="today">今天不再显示</button>
      `;
      menu.addEventListener('click', (event) => {
        const button = event.target.closest('button');
        if (!button) return;
        const minutes = Number(button.getAttribute('data-hide-minutes'));
        const until = button.getAttribute('data-hide-until');
        if (Number.isFinite(minutes) && minutes > 0) setBubbleHidden(minutes);
        else if (until === 'today') setBubbleHiddenUntil(getEndOfTodayTimestamp());
        togglePanel(false);
        hideBubbleMenu();
        syncBubbleVisibility();
      });
      document.body.appendChild(menu);
      document.addEventListener('pointerdown', (event) => {
        const bubble = document.getElementById(BUBBLE_ID);
        const menuEl = document.getElementById(BUBBLE_MENU_ID);
        if (!menuEl || menuEl.getAttribute('data-open') !== 'true') return;
        if (menuEl.contains(event.target) || bubble?.contains(event.target)) return;
        hideBubbleMenu();
      });
    }

    if (!document.getElementById(PANEL_ID)) {
      const panel = document.createElement('div');
      panel.id = PANEL_ID;
      panel.setAttribute('data-hidden', 'true');
      panel.innerHTML = `
        <div class="wrap">
          <div class="hd">
            <div>
              <div class="title">${META.name}</div>
              <div class="sub">${META.subtitle}</div>
            </div>
            <button id="${PANEL_ID}_close" class="panel-close" type="button" aria-label="关闭护栏面板">×</button>
          </div>
          <div class="hero">
            <div class="chipbar">
              <div id="${PANEL_ID}_context" class="chip">页面判断中</div>
              <div id="${PANEL_ID}_status" class="status medium">观察中</div>
            </div>
            <div id="${PANEL_ID}_headline" class="headline">正在判断这页会不会把你越带越远…</div>
            <div id="${PANEL_ID}_summary" class="summary"></div>
            <div class="section">
              <div class="section-title">我已经替你做了什么</div>
              <div id="${PANEL_ID}_action" class="section-text"></div>
            </div>
            <div class="section">
              <div class="section-title">我发现了什么</div>
              <ul id="${PANEL_ID}_points" class="list"></ul>
            </div>
            <div class="actions">
              <button id="${PANEL_ID}_primary" class="primary" type="button">处理中</button>
              <button id="${PANEL_ID}_privacy" class="secondary" type="button">查看隐私与收紧详情</button>
              <div id="${DETAIL_ID}" class="detail" data-open="false">
                <div class="detail-title">隐私与收紧详情</div>
                <div class="detail-block">
                  <div class="detail-subtitle">当前隐私面</div>
                  <ul id="${DETAIL_ID}_current" class="detail-list"></ul>
                </div>
                <div class="detail-block">
                  <div class="detail-subtitle">已收紧内容</div>
                  <ul id="${DETAIL_ID}_actioned" class="detail-list"></ul>
                </div>
              </div>
            </div>
            <div class="utility">
              <a id="${PANEL_ID}_snooze">20 分钟免打扰</a>
            </div>
          </div>
          <div id="${PANEL_ID}_toast" class="toast"></div>
        </div>`;
      document.body.appendChild(panel);
      document.getElementById(`${PANEL_ID}_close`).addEventListener('click', () => {
        togglePanel(false);
      });
      document.getElementById(`${PANEL_ID}_snooze`).addEventListener('click', () => {
        setSnooze(20);
        togglePanel(false);
        notice('好的，20 分钟内我不再主动打断你。');
      });
    }

    return true;
  }

  function togglePanel(open) {
    state.panelOpen = Boolean(open);
    const panel = document.getElementById(PANEL_ID);
    if (panel) panel.setAttribute('data-hidden', open ? 'false' : 'true');
  }

  function removeTrackingParamsFromUrl() {
    try {
      const url = new URL(location.href);
      let changed = false;
      const removed = [];
      [...url.searchParams.keys()].forEach((key) => {
        if (TRACKING_QUERY_KEYS.has(String(key).toLowerCase())) {
          removed.push(key);
          url.searchParams.delete(key);
          changed = true;
        }
      });
      if (changed) history.replaceState(history.state, '', url.toString());
      return { changed, removed };
    } catch {
      return { changed: false, removed: [] };
    }
  }

  function collectAdLikeNodes() {
    const selectors = [
      '[class*="ad-block"]',
      '[class*="tuiguang"]',
      '[class*="ad-widget"]',
      '[class*="ec-tuiguang"]',
      '[class*="EC_result"]',
      '[id^="3001"]',
      '[id^="4001"]',
      '[data-tuiguang]',
      '#content_right',
      '#rs_new',
      '#con-ar',
      '#con-ceiling-wrapper'
    ];
    const adNodes = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || !isVisible(node)) return;
        if (/baidu\.com/i.test(location.hostname) && /^(page|head)$/i.test(node.id || '')) return;
        const textSample = text(node.innerText).slice(0, 200);
        const cls = `${node.className} ${node.id}`;
        if (/广告|推广|热搜榜|相关搜索|登录百度帐号|交易更有保障/i.test(textSample + ' ' + cls)) adNodes.add(node);
      });
    });
    return [...adNodes];
  }

  function installPrivacyGuard(report) {
    if (state.privacyHooks) return state.privacyGuardActive;
    const overlays = findOverlayCandidates();
    overlays.forEach((node) => node.classList.add('abg_guard_hide'));
    const adNodes = collectAdLikeNodes();
    adNodes.forEach((node) => node.classList.add('abg_guard_hide'));
    let cleanedLinks = 0;
    const cookieDetails = report?.cookieDetails || collectCookieDetails();
    const localDetails = report?.localStorageDetails || collectStorageDetails(localStorage, 'localStorage');
    const sessionDetails = report?.sessionStorageDetails || collectStorageDetails(sessionStorage, 'sessionStorage');
    const removedCookies = removeTrackingCookies(cookieDetails);
    const removedLocalStorage = scrubTrackingStorage(localStorage, localDetails);
    const removedSessionStorage = scrubTrackingStorage(sessionStorage, sessionDetails);

    const handler = (event) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!anchor || shouldProtectNode(anchor)) return;
      try {
        const url = new URL(anchor.href, location.href);
        let changed = false;
        [...url.searchParams.keys()].forEach((key) => {
          if (TRACKING_QUERY_KEYS.has(String(key).toLowerCase())) {
            url.searchParams.delete(key);
            changed = true;
          }
        });
        if (changed) {
          cleanedLinks += 1;
          anchor.href = url.toString();
        }
      } catch {}
    };

    document.querySelectorAll('a[href]').forEach((anchor) => {
      if (!(anchor instanceof HTMLAnchorElement) || shouldProtectNode(anchor)) return;
      try {
        const url = new URL(anchor.href, location.href);
        let changed = false;
        [...url.searchParams.keys()].forEach((key) => {
          if (TRACKING_QUERY_KEYS.has(String(key).toLowerCase())) {
            url.searchParams.delete(key);
            changed = true;
          }
        });
        if (changed) {
          cleanedLinks += 1;
          anchor.href = url.toString();
        }
      } catch {}
    });

    document.addEventListener('click', handler, true);
    const urlResult = removeTrackingParamsFromUrl();
    state.outboundClickHandler = handler;
    state.privacyHooks = {
      changedUrl: urlResult.changed,
      removedParams: urlResult.removed,
      overlayCount: overlays.length,
      adCount: adNodes.length,
      cleanedLinks,
      removedCookies,
      removedLocalStorage,
      removedSessionStorage,
    };
    state.privacyGuardActive = true;
    return true;
  }

  function removePrivacyGuard() {
    document.querySelectorAll('.abg_guard_hide').forEach((node) => node.classList.remove('abg_guard_hide'));
    if (state.outboundClickHandler) document.removeEventListener('click', state.outboundClickHandler, true);
    state.outboundClickHandler = null;
    state.privacyHooks = null;
    state.privacyGuardActive = false;
  }

  function render(report) {
    ensureUI();
    state.report = report;
    const narrative = buildNarrative(report);
    state.narrative = narrative;
    window.__AI_BROWSER_GUARD_RESULT__ = report;
    window.__Yuze_SKILL_META__ = META;

    const status = document.getElementById(`${PANEL_ID}_status`);
    const headline = document.getElementById(`${PANEL_ID}_headline`);
    const summary = document.getElementById(`${PANEL_ID}_summary`);
    const action = document.getElementById(`${PANEL_ID}_action`);
    const list = document.getElementById(`${PANEL_ID}_points`);
    const primary = document.getElementById(`${PANEL_ID}_primary`);
    const privacy = document.getElementById(`${PANEL_ID}_privacy`);
    const detail = document.getElementById(DETAIL_ID);
    const detailCurrent = document.getElementById(`${DETAIL_ID}_current`);
    const detailActioned = document.getElementById(`${DETAIL_ID}_actioned`);
    const context = document.getElementById(`${PANEL_ID}_context`);

    if (status) {
      status.className = `status ${report.level}`;
      status.textContent = narrative.statusLabel;
    }
    if (headline) headline.textContent = narrative.headline;
    if (summary) summary.textContent = narrative.summary;
    if (action) action.textContent = narrative.actionLine;
    if (context) context.textContent = narrative.aiLabel ? `${narrative.contextLabel} · ${narrative.aiLabel}` : narrative.contextLabel;
    if (list) {
      list.innerHTML = '';
      narrative.points.forEach((item) => {
        const li = document.createElement('li');
        li.textContent = item;
        list.appendChild(li);
      });
    }

    if (primary) {
      primary.textContent = narrative.primaryLabel;
      primary.className = `primary${state.focus ? ' restore' : ''}`;
      primary.onclick = () => {
        if (state.focus) {
          removeFocusStyles();
          removePrivacyGuard();
          state.detailOpen = false;
          render(state.report);
          notice('已恢复原页面状态。');
          return;
        }
        enterGuardMode('manual');
      };
    }

    if (privacy) {
      const canShowPrivacyDetail = state.focus;
      if (!canShowPrivacyDetail && state.detailOpen) state.detailOpen = false;
      privacy.style.display = canShowPrivacyDetail ? 'block' : 'none';
      privacy.textContent = '查看隐私与收紧详情';
      privacy.disabled = !canShowPrivacyDetail;
      privacy.className = `secondary${state.detailOpen ? ' active' : ''}`;
      privacy.onclick = () => {
        if (!state.privacyGuardActive) installPrivacyGuard(state.report);
        state.detailOpen = !state.detailOpen;
        render(state.report);
        notice(state.detailOpen ? '已展开隐私与收紧详情。' : '已收起隐私与收紧详情。');
      };
    }

    if (detail && detailCurrent && detailActioned) {
      const shouldShowDetail = state.privacyGuardActive && state.detailOpen;
      detail.setAttribute('data-open', shouldShowDetail ? 'true' : 'false');
      if (state.privacyGuardActive) {
        renderDetailCards(detailCurrent, buildExposureCards());
        renderDetailCards(detailActioned, buildActionCards());
      } else {
        detailCurrent.innerHTML = '';
        detailActioned.innerHTML = '';
      }
    }

    setBubble(report.level);
    syncBubbleVisibility();
  }

  function collectGuardTargets(report, main) {
    const intent = getPageIntent(report);
    const selectors = uniq([
      ...FOCUS_SELECTORS,
      '[role="banner"]',
      'header',
      'nav',
      '[class*="promo"]',
      '[class*="banner"]',
      '[class*="drawer"]',
      '[class*="overlay"]',
      '[class*="tooltip"]',
      '[class*="sider"]',
      '[class*="rail"]'
    ]);
    const targets = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node)) return;
        if (node === main || main?.contains(node)) return;
        if (!isVisible(node)) return;
        const rect = node.getBoundingClientRect();
        const isTopNav = rect.top <= 120 && rect.height <= 120 && rect.width >= window.innerWidth * 0.65;
        const isSideRail = rect.height >= window.innerHeight * 0.28 && rect.width <= window.innerWidth * 0.36;
        const isFloating = ['fixed', 'sticky'].includes(getComputedStyle(node).position) && rect.width > 120 && rect.height > 32;
        const isAd = /ad|promo|banner|subscribe|cookie|hot|rank|recommend|related|sidebar|rail|drawer|float/i.test(`${node.className} ${node.id}`);
        const isFeedCard = intent === 'feed' && rect.height >= 160 && rect.width >= Math.min(520, window.innerWidth * 0.45);
        const isQuestionSide = intent === 'qa' && (isSideRail || isFloating || isAd);
        const shouldTake = isTopNav || isSideRail || isFloating || isAd || isFeedCard || isQuestionSide;
        if (shouldTake) targets.add(node);
      });
    });

    if (intent === 'doc' || intent === 'article' || intent === 'qa') {
      document.querySelectorAll('aside, nav, header, [role="complementary"], .toc, [class*="toc"], [class*="catalog"], [class*="recommend"], [class*="related"], [class*="sidebar"], [class*="comment"], [class*="answer-side"]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || node === main || main?.contains(node) || !isVisible(node)) return;
        targets.add(node);
      });
    }

    if (/baidu\.com/i.test(location.hostname) && intent === 'search') {
      document.querySelectorAll('#content_right, #rs_new, #con-ar, #con-ceiling-wrapper, #s_tab, [class*="ad-block"], [class*="tuiguang"], [class*="ad-widget"], [class*="ec-tuiguang"], [class*="EC_result"]').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || node === main || main?.contains(node) || !isVisible(node)) return;
        targets.add(node);
      });
      document.querySelectorAll('#content_left > div, #content_left .result, #content_left .c-container').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || node === main || !isVisible(node)) return;
        const sample = text(node.innerText).slice(0, 200);
        if (/广告|推广|百度营销|查看更多相关信息|最近\d+分钟前有人拨打电话咨询问题/i.test(sample)) targets.add(node);
      });
    }

    if (/123\.sankuai\.com/i.test(location.hostname) && intent === 'qa') {
      document.querySelectorAll('.q-question-page__sidebar, .q-question-page__header, .q-question-info__to-answer, .q-question-answer__sort-by').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || node === main || main?.contains(node)) return;
        targets.add(node);
      });
    }

    if (/km\.sankuai\.com/i.test(location.hostname) && (intent === 'doc' || intent === 'workspace')) {
      document.querySelectorAll('#ct-header, #sidebar-wrapper, .ct-sidebar, .catalog-tree-scroll, .ct-catalog-tree, .ct-comment, .sidebar-control, .ct-page-sidebar-control').forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        if (shouldProtectNode(node) || node === main || main?.contains(node)) return;
        targets.add(node);
      });
    }

    const aiPlan = state.bridgeGuardPlan;
    if (aiPlan) {
      safeQuerySelectorAll([...(aiPlan.dimSelectors || []), ...(aiPlan.hideSelectors || [])]).forEach((node) => {
        if (shouldProtectNode(node)) return;
        if (node === main || main?.contains(node) || node.contains(main)) return;
        if (!isVisible(node)) return;
        targets.add(node);
      });
    }

    return [...targets].filter((node) => !node.contains(main));
  }

  function applyFocusStyles(reportOverride) {
    const report = reportOverride || state.report;
    if (!report) return;
    removeFocusStyles();
    document.documentElement.classList.add('abg_focus_html');
    const intent = getPageIntent(report);
    const aiPlan = state.bridgeGuardPlan;
    const aiMain = safeQuerySelector(aiPlan?.primarySelector);
    const main = aiMain || ((intent === 'doc' || intent === 'article' || intent === 'qa' || intent === 'search') ? findReadingTarget(report) : findPrimaryContent());
    const dimmedNodes = collectGuardTargets(report, main);
    const overlays = findOverlayCandidates().filter((node) => !shouldProtectNode(node));

    if (aiPlan?.hideSelectors?.length) {
      safeQuerySelectorAll(aiPlan.hideSelectors).forEach((node) => {
        if (shouldProtectNode(node)) return;
        if (node === main || main?.contains(node) || node.contains(main)) return;
        if (!isVisible(node)) return;
        overlays.push(node);
      });
    }

    uniq(dimmedNodes).forEach((node) => node.classList.add('abg_guard_rail'));
    uniq(overlays).forEach((node) => node.classList.add('abg_guard_hide'));
    if (main && main !== document.body) {
      main.classList.add('abg_guard_main');
      main.classList.add('abg_guard_soft');
      if ((intent === 'doc' || intent === 'article' || intent === 'qa') && typeof main.scrollIntoView === 'function') {
        main.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    }

    state.guardOutcome = {
      intent,
      mainTag: main?.tagName || '',
      dimmedCount: uniq(dimmedNodes).length,
      hiddenOverlayCount: uniq(overlays).length,
      aiPlanned: !!aiPlan,
    };
    state.focus = true;
  }

  function removeFocusStyles() {
    document.documentElement.classList.remove('abg_focus_html');
    document.querySelectorAll('.abg_dimmed').forEach((node) => node.classList.remove('abg_dimmed'));
    document.querySelectorAll('.abg_hidden').forEach((node) => node.classList.remove('abg_hidden'));
    document.querySelectorAll('.abg_focus_main').forEach((node) => node.classList.remove('abg_focus_main'));
    document.querySelectorAll('.abg_guard_rail').forEach((node) => node.classList.remove('abg_guard_rail'));
    document.querySelectorAll('.abg_guard_hide').forEach((node) => node.classList.remove('abg_guard_hide'));
    document.querySelectorAll('.abg_guard_main').forEach((node) => node.classList.remove('abg_guard_main'));
    document.querySelectorAll('.abg_guard_soft').forEach((node) => node.classList.remove('abg_guard_soft'));
    state.guardOutcome = null;
    state.focus = false;
  }

  function enterGuardMode(mode, reportOverride) {
    if (reportOverride) state.report = reportOverride;
    if (!state.privacyGuardActive) installPrivacyGuard(reportOverride || state.report);
    applyFocusStyles(reportOverride || state.report);
    scheduleReminder(8);
    state.lastAutoFocusedAt = Date.now();
    notice('已切到更安静的护栏状态。');
    render(reportOverride || state.report);
  }

  function expireCookie(name) {
    const parts = location.hostname.split('.');
    const domains = new Set([location.hostname]);
    for (let i = 0; i < parts.length - 1; i += 1) domains.add(parts.slice(i).join('.'));
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  function clearPageStorage() {
    try {
      text(document.cookie).split(';').map((item) => item.trim()).filter(Boolean).forEach((item) => expireCookie(item.split('=')[0]));
    } catch {}
    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}
    removeTrackingParamsFromUrl();
    notice('已尝试清理当前页可见的本地痕迹。');
  }

  function normalizeBridgeText(raw) {
    if (!raw) return '';
    if (typeof raw === 'string') return raw;
    if (typeof raw.text === 'string') return raw.text;
    if (typeof raw.content === 'string') return raw.content;
    if (Array.isArray(raw.messages)) return raw.messages.map((item) => normalizeBridgeText(item)).join('\n');
    if (Array.isArray(raw.content)) return raw.content.map((item) => normalizeBridgeText(item)).join('\n');
    if (raw.message) return normalizeBridgeText(raw.message);
    return '';
  }

  function tryParseBridgeJson(raw) {
    const source = normalizeBridgeText(raw).trim();
    if (!source) return null;
    try { return JSON.parse(source); } catch {}
    const match = source.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try { return JSON.parse(match[0]); } catch { return null; }
  }

  function collectRelevantImages() {
    return [...document.images]
      .filter((img) => img instanceof HTMLImageElement && img.naturalWidth >= 120 && img.naturalHeight >= 120)
      .map((img) => img.currentSrc || img.src || '')
      .filter((src) => /^https?:\/\//.test(src) || /^data:image\//.test(src))
      .slice(0, 2);
  }

  async function maybeEnhanceWithBridge(report) {
    state.bridgeActive = false;
    state.lastBridgePayload = null;
    state.bridgeGuardPlan = null;
    const bridge = getBridge();
    if (!bridge || typeof bridge.chat !== 'function') {
      state.lastBridgeError = 'bridge-not-found';
      return;
    }
    if (!shouldUseBridge(report)) {
      state.bridgeSource = state.bridgeSource || '';
      state.lastBridgeError = 'bridge-skipped-local';
      return;
    }

    const key = JSON.stringify({
      host: location.hostname,
      attention: report.attention,
      privacy: report.privacy,
      trackers: uniq(report.trackerHits.map((item) => item.name)),
      reasons: report.pageSignals.reasons,
      focus: state.focus,
      privacyGuard: state.privacyGuardActive,
    });
    if (state.bridgeInFlight || state.bridgeKey === key) return;

    state.bridgeInFlight = true;
    state.bridgeKey = key;
    state.lastBridgeError = '';

    const facts = bridgeFacts(report);

    const prompt = [
      '你是浏览器插件“AI 浏览护栏”的结构化护栏决策器。',
      '请在“本地页面判断”的基础上润色，但不要自行改判页面大类。',
      '除了文案，你还要给出一个结构化 guardPlan，帮助脚本判断哪个区域是主内容、哪些区域适合压低、哪些区域可以隐藏。',
      'guardPlan 只能使用 CSS 选择器，不要返回解释文字，不要编造页面上不存在的节点。',
      '请优先识别当前用户在这页最可能的任务，而不是只看页面外观。',
      '如果拿不准，guardPlan 可以留空，但不要乱给。',
      '文案必须直接回答：这页正在怎么带偏用户，或者正在怎么留下痕迹。',
      '如果本地判断是工作台/控制台/配置页/文档页，严禁写成内容流、热榜、购物页。',
      '不要讲原理，不给统计数字，不要官话，不要教学语气，不要出现“根据检测”“本地判断”等字样。',
      '不要写模糊的“可能会影响你”“也许会怎样”，要像护栏已经做出判断。',
      '返回 JSON，且只能返回 JSON：{"headline":"...","summary":"...","points":["...","..."],"guardPlan":{"pageMode":"search|doc|workspace|shopping|feed|generic","userIntent":"...","primarySelector":"...","preserveSelectors":["..."],"dimSelectors":["..."],"hideSelectors":["..."],"confidence":0-100,"rationale":"..."}}',
      `本地页面判断：${facts.categoryLabel}`,
      `页面标题：${facts.title}`,
      `页面地址：${facts.url}`,
      `当前等级：${facts.level}`,
      `当前任务目标：${facts.taskGoal || '未显式提供'}`,
      `任务对齐分：${facts.alignmentScore}`,
      `任务对齐关键词：${(facts.alignmentOverlap || []).join('、') || '无'}`,
      `是否工作/配置类页面：${facts.workLike ? '是' : '否'}`,
      `是否已进入专注模式：${state.focus ? '是' : '否'}`,
      `是否已收紧留痕：${state.privacyGuardActive ? '是' : '否'}`,
      `页面信号：${facts.reasons.join('、') || '无'}`,
      `追踪器：${facts.trackerNames.join('、') || '无'}`,
      `权限：${facts.permissionNames.join('、') || '无'}`,
      `地址追踪参数：${facts.urlTrackingParams.join('、') || '无'}`,
      `Cookie：${facts.cookieNames.join('、') || '无'}`,
      `localStorage：${facts.localStorageKeys.join('、') || '无'}`,
      `sessionStorage：${facts.sessionStorageKeys.join('、') || '无'}`,
      `DOM骨架：${facts.domSkeleton.join(' || ') || '无'}`,
      `正文片段：${text(document.body?.innerText).slice(0, 500)}`,
    ].join('\n');
    state.lastBridgeRequest = {
      ...facts,
      prompt,
    };

    const images = collectRelevantImages();
    const attempts = [
      () => bridge.chat(prompt, 'json'),
      () => bridge.chat(prompt, { response_format: 'json' }),
      () => images.length ? bridge.chat(prompt, { response_format: 'json', images }) : null,
      () => images.length ? bridge.chat({ prompt, response_format: 'json', images }) : null,
    ].filter(Boolean);

    try {
      for (const run of attempts) {
        try {
          const result = await Promise.race([
            Promise.resolve().then(run),
            new Promise((_, reject) => setTimeout(() => reject(new Error('bridge-timeout')), 5000)),
          ]);
          const payload = tryParseBridgeJson(result);
          if (!payload) {
            state.lastBridgeError = 'bridge-response-unparseable';
            continue;
          }
          if (isBridgePayloadDrifting(payload, report)) {
            state.lastBridgeError = 'bridge-category-drift';
            continue;
          }
          const normalizedPlan = normalizeGuardPlan(payload);
          if (normalizedPlan && normalizedPlan.confidence > 0 && normalizedPlan.confidence < 42) {
            state.lastBridgeError = 'bridge-low-confidence';
            continue;
          }
          state.bridgeActive = true;
          state.lastBridgePayload = payload;
          state.bridgeGuardPlan = normalizedPlan;
          state.lastBridgeUsedAt = Date.now();
          const narrative = buildNarrative(report);
          if (payload.headline) narrative.headline = String(payload.headline).trim();
          if (payload.summary) narrative.summary = String(payload.summary).trim();
          if (Array.isArray(payload.points) && payload.points.length) {
            narrative.points = payload.points.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
          }
          state.narrative = narrative;
          const headline = document.getElementById(`${PANEL_ID}_headline`);
          const summary = document.getElementById(`${PANEL_ID}_summary`);
          const list = document.getElementById(`${PANEL_ID}_points`);
          if (headline) headline.textContent = narrative.headline;
          if (summary) summary.textContent = narrative.summary;
          if (list) {
            list.innerHTML = '';
            narrative.points.forEach((item) => {
              const li = document.createElement('li');
              li.textContent = item;
              list.appendChild(li);
            });
          }
          break;
        } catch (error) {
          state.lastBridgeError = error?.message || String(error);
        }
      }
    } finally {
      state.bridgeInFlight = false;
    }
  }

  async function testBridge() {
    const bridge = getBridge();
    if (!bridge || typeof bridge.chat !== 'function') {
      state.lastBridgeError = 'bridge-not-found';
      return { ok: false, reason: 'bridge-not-found', status: getBridgeStatus() };
    }
    try {
      const result = await bridge.chat('请只返回{"ok":true}', 'json');
      return { ok: true, source: state.bridgeSource || '', result };
    } catch (error) {
      state.lastBridgeError = error?.message || String(error);
      return { ok: false, source: state.bridgeSource || '', reason: state.lastBridgeError };
    }
  }

  function levelFromCombined(score) {
    if (score >= 72) return 'high';
    if (score >= 42) return 'medium';
    return 'low';
  }

  async function analyze() {
    if (state.analyzeInFlight) {
      state.pendingAnalyze = true;
      return;
    }
    state.analyzeInFlight = true;
    ensureUI();
    try {
      const title = document.title || '未命名页面';
      const bodyText = text(document.body?.innerText).slice(0, 5000);
      const source = `${location.href} ${title} ${bodyText}`.toLowerCase();
      const pageSignals = detectPageSignals(source);
      const dwellMinutes = Math.max(1, Math.round(performance.now() / 60000));
      const taskGoal = inferTaskGoal(title, bodyText);
      const alignment = goalAlignment(taskGoal, `${title} ${bodyText}`);

      const cookieDetails = collectCookieDetails();
      const localStorageDetails = collectStorageDetails(localStorage, 'localStorage');
      const sessionStorageDetails = collectStorageDetails(sessionStorage, 'sessionStorage');
      const cookieCount = cookieDetails.items.length;
      const localCount = localStorageDetails.total;
      const sessionCount = sessionStorageDetails.total;
      const urlTrackingParams = detectTrackingParams(location.href);
      const domains = collectDomains().filter((domain) => domain !== location.hostname);
      const trackerHits = detectTrackers(domains);
      const permissions = await getPermissions();
      const permissionSignals = detectPermissionPromptSignals(source, permissions);
      const permissionRisk = permissionSignals.length;

      let attention = pageSignals.score;
      if (alignment.score <= 34 && attention >= 36) attention += 8;
      if (alignment.score >= 72 && attention >= 30) attention -= 8;
      if (dwellMinutes >= 6 && attention >= 42) attention += 8;
      if (dwellMinutes >= 12 && attention >= 42) attention += 6;
      attention = clamp(attention, 0, 100);

      let privacy = 8;
      privacy += Math.min(cookieCount * 2, 18);
      privacy += Math.min(localCount * 2, 12);
      privacy += Math.min(sessionCount * 2, 8);
      privacy += Math.min(domains.length * 6, 24);
      privacy += trackerHits.length * 10;
      privacy += permissionRisk * 8;
      privacy += Math.min(urlTrackingParams.length * 8, 18);
      privacy += Math.min((cookieDetails.tracking.length + localStorageDetails.tracking.length + sessionStorageDetails.tracking.length) * 6, 24);
      if (pageSignals.overlayCount > 0) privacy += 6;
      privacy = clamp(privacy, 0, 100);

      const combined = clamp(Math.round(attention * 0.54 + privacy * 0.46), 0, 100);
      const report = {
        title,
        attention,
        privacy,
        combined,
        level: levelFromCombined(combined),
        dwellMinutes,
        alignment,
        taskGoal,
        cookieCount,
        cookieDetails,
        localCount,
        localStorageDetails,
        sessionCount,
        sessionStorageDetails,
        urlTrackingParams,
        domains,
        permissions,
        permissionSignals,
        trackerHits,
        pageSignals,
      };

      report.pageIntent = getPageIntent(report);

      const bubbleHidden = isBubbleHidden();
      if (bubbleHidden) {
        togglePanel(false);
      }
      render(report);

      maybeEnhanceWithBridge(report);
      state.lastObservedUrl = location.href;
      state.lastPageSignature = getPageSignature();
    } finally {
      state.analyzeInFlight = false;
      if (state.pendingAnalyze) {
        state.pendingAnalyze = false;
        scheduleAnalyze(180);
      }
    }
  }

  function checkReminder() {
    syncBubbleVisibility();
    const raw = Number(readStorage(localStorage, hostKey(REMINDER_KEY)) || 0);
    if (!Number.isFinite(raw) || !raw || raw > Date.now()) return;
    removeStorage(localStorage, hostKey(REMINDER_KEY));
    if (state.report) {
      notice('你已经看了一会儿了，我来帮你再看一眼这页。');
      render(state.report);
    }
  }

  function startGuard() {
    if (state.started) return;
    if (!ensureUI()) return false;
    syncVersionState();
    state.started = true;
    installLifecycleHooks();
    analyze();
    setInterval(checkReminder, 30000);
    return true;
  }

  function bootstrapGuard() {
    if (startGuard()) return;
    clearTimeout(state.startTimer);
    state.startTimer = setTimeout(() => startGuard(), 120);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapGuard, { once: true });
    window.addEventListener('load', bootstrapGuard, { once: true });
    bootstrapGuard();
  } else {
    bootstrapGuard();
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.panelOpen) {
      togglePanel(false);
      hideBubbleMenu();
      return;
    }
    const isKeyG = event.code === 'KeyG';
    const restoreCombo = (event.altKey && event.shiftKey && isKeyG) || (event.ctrlKey && event.shiftKey && isKeyG);
    if (restoreCombo) {
      restoreBubble();
      notice('护栏按钮已恢复显示。');
    }
  }, true);

  window.AIBrowserGuard = {
    analyze,
    enterGuardMode: () => enterGuardMode('manual'),
    restore: () => {
      removeFocusStyles();
      removePrivacyGuard();
      state.detailOpen = false;
      if (state.report) render(state.report);
    },
    showBubble: restoreBubble,
    checkBridge: getBridgeStatus,
    testBridge,
    clearPageStorage,
    debug: () => ({ ...state }),
    meta: META,
  };
})();