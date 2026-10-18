/*!
 * Yuze 脚本技炉：智能阅读助手 (Smart Reading Assistant)
 * =====================================================
 * 为任意网页（中文/英文/日文/韩文等）提供智能阅读辅助：
 *
 * 【外文网页】段落级双语对照 + 悬停译文 + 全文翻译 + 文章摘要 + 术语悬浮解释
 * 【中文网页】文章摘要 + 术语/梗/流行语悬浮解释
 *
 * 核心能力：
 *   1. detectLang()     — 本地识别页面语言（零 AI 成本）
 *   2. read()           — 提取正文段落（过滤导航/广告/页脚，支持动态内容）
 *   3. run()            — 分块合并调用 LLMBridge.chat() 翻译（视口优先，严禁循环调用）
 *   4. summarize()      — 生成文章摘要 + 提取术语/梗/流行语（中英文通用）
 *   5. write()          — 将译文/摘要写回网页（对照/悬停两种模式 + 术语高亮弹窗）
 *
 * 遵循 LLMBridge 指南约束：
 *   - 相关段落合并为一次调用，不在循环中逐段调用
 *   - 仅在需要 JSON 输出时使用 response_format: "json"
 *   - 失败重试有上限，避免限流风险
 *
 * 安全与隐私：
 *   - 只读取页面可见正文文本，不收集用户浏览记录
 *   - 译文与摘要缓存仅存于本机 localStorage（可一键清除）
 *   - 不修改原文内容，译文以独立节点插入，随时可一键恢复原页面
 */

(() => {
  'use strict';

  // ------------------------------------------------------------------
  // 配置
  // ------------------------------------------------------------------
  const CONFIG = {
    CHUNK_SIZE: 10,              // 每次 LLM 调用合并的段落数上限
    MIN_PARA_LENGTH: 30,         // 段落最短字符数（过滤碎片）
    MAX_PARA_LENGTH: 3000,       // 段落最长字符数（超长截断保护）
    MAX_TOTAL_CHARS: 60000,      // 单页最多处理的正文总字符数
    LLM_TIMEOUT: 60000,          // 单次 LLM 调用超时（ms）
    RETRY_LIMIT: 1,              // JSON 解析失败重试次数
    CHUNK_INTERVAL: 800,         // 相邻批次之间的间隔（ms），尊重限流
    CACHE_PREFIX: 'tbit-bi-',
    ID_ATTR: 'data-tbit-bi-id',  // 段落编号标记
  };

  const STATE = {
    paras: [],                   // 提取的段落列表 [{id, el, text, translated}]
    terms: [],                   // 汇总的术语表 [{term, explain}]
    mode: 'inline',              // 'inline' 对照 | 'hover' 悬停
    running: false,              // 是否正在翻译
    activated: false,            // 是否已激活（写入 UI）
    observer: null,              // MutationObserver
    cache: {},                   // 译文缓存 {paragraphHash: translation}
  };

  // ------------------------------------------------------------------
  // 网站适配器：针对特定域名定制提取/过滤策略，方便后续扩展
  // ------------------------------------------------------------------
  const ADAPTERS = {
    github: {
      hostname: ['github.com', 'www.github.com', 'gist.github.com'],
      // 这些区域内的元素及其子元素不提取、不翻译
      ignoreSelectors: [
        // 文件列表区域（新旧版 GitHub）
        'table.files',
        'table[aria-labelledby="files"]',
        'tbody.js-navigation-container',
        '[data-testid="repos-file-tree"]',
        '.react-directory-row',
        'td.react-directory-row-name-cell-large-screen',
        'td.react-directory-row-name-cell-small-screen',
        '.react-directory-filename-cell',
        '.react-directory-commit-message',
        '.Box-row',                    // GitHub 通用列表行
        '.TreeTable-row',              // 新版树状表格行
        '.PRIVATE_TreeView-item',      // 新版树状视图项
        '[role="gridcell"]',           // 表格单元格（文件列表）
        // 代码浏览区域
        '.blob-wrapper',
        '.file-header',
        '[data-testid="file-viewer"]',
        '.blob-code',                  // 代码行
        '.highlight',                  // 语法高亮块
        // PR / diff 区域
        '.file-diff',
        '.js-diff-progressive-container',
        '.diff-table',
        // 仓库头部统计与操作按钮（Star/Fork/Watch）
        '.pagehead-actions',
        '.starred',
        '.social-count',
        '[aria-label*="star" i]',
        '[aria-label*="fork" i]',
        '[aria-label*="watch" i]',
        '.Counter',                    // GitHub 计数器徽章
        // 导航与元数据
        '.repohead',
        '.Header',
        '.repository-content-header',
        '.Layout-sidebar',             // 侧边栏
        // 评论与交互
        '.timeline-comment',
        '.comment-body',
        '.review-comment',
        // 提示条 / 通知 / Merge 消息（仓库首页顶部的合并提示等）
        '.flash',
        '.flash-warn',
        '.flash-error',
        '.flash-success',
        '.flash-message',
        '.Banner',
        '.js-notification-shelf',
        '.merge-message',
        '.branch-infobar',
        '.topic-tag',            // 话题标签
        '.Label',                // GitHub 标签（如 Public/Private）
        '.State',                // PR/Issue 状态标签
        // 仓库首页顶部 commit 提示条（最新提交信息横幅）
        '.Box-header',
        '.commit-tease',
        '.commit-tease-cont',
        '.js-details-container', // GitHub 旧版 commit 详情容器
        '[data-testid="latest-commit"]',      // 新版 React UI commit 区域外层容器
        '.Box.Box--condensed',   // 仓库首页 commit 区域外层 Box
      ],
      // 后代方向检查：当元素内部包含这些标记时，该元素也视为 ignorable
      ignoreDescendants: [
        '[data-testid="latest-commit-html"]', // commit 提示条内部文本
        '[data-testid="repos-file-tree"]',    // 文件树内部
        '.react-directory-filename-cell',     // 文件列表文件名
        '.blob-code',                         // 代码行
      ],
      // 文本过滤：返回 false 表示不翻译该文本
      textFilter(text) {
        const t = text.trim();
        // 纯路径（无空格、含斜杠或反斜杠）
        if (!/\s/.test(t) && /[\/\\]/.test(t)) return false;
        // 纯代码标识符链（无空格，由字母数字下划线点横线组成）
        if (!/\s/.test(t) && /^[\w.\-~\/]+$/.test(t) && t.length < 120) return false;
        // commit SHA（7-40 位十六进制）
        if (/^[a-f0-9]{7,40}$/i.test(t)) return false;
        // 版本号/tag（如 v1.2.3）
        if (/^v?\d+\.\d+(\.\d+)?[\w.\-]*$/.test(t)) return false;
        // 短数字（如 34.8k, 3.9k, 593）
        if (/^[\d,.]+[km]?$/.test(t)) return false;
        // 纯符号/表情
        if (/^[\s\W]+$/.test(t)) return false;
        return true;
      },
    },
  };

  /** 获取当前页面匹配的适配器 */
  function getActiveAdapter() {
    const host = location.hostname;
    for (const key of Object.keys(ADAPTERS)) {
      const a = ADAPTERS[key];
      if (a.hostname && a.hostname.some(h => host === h || host.endsWith('.' + h))) {
        return a;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------
  // STEP 1 · match() — 识别网页：本地语言检测，零 AI 成本
  // ------------------------------------------------------------------

  /** 检测正文采样文本中拉丁/日文/韩文字符占比 */
  function detectLang() {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    if (/^(zh|cn)/.test(htmlLang)) return 'zh';
    if (/^(en|ja|ko|fr|de|es|ru|it|pt)/.test(htmlLang)) return htmlLang.split('-')[0];

    // 无 lang 标签时，采样正文做启发式判断
    const sample = document.body ? document.body.innerText.slice(0, 4000) : '';
    if (!sample) return 'zh';
    const cjk = (sample.match(/[\u4e00-\u9fff\u3400-\u4dbf]/g) || []).length;
    const latin = (sample.match(/[A-Za-z]/g) || []).length;
    const kana = (sample.match(/[\u3040-\u30ff]/g) || []).length;
    const hangul = (sample.match(/[\uac00-\ud7af]/g) || []).length;

    if (kana > sample.length * 0.05) return 'ja';
    if (hangul > sample.length * 0.05) return 'ko';
    // 中文汉字占比高且拉丁字母很少 → 判定为中文页面
    if (cjk > latin * 1.5 && cjk > sample.length * 0.15) return 'zh';
    if (latin > sample.length * 0.2) return 'en';
    return 'zh'; // 无法判断时不激活，宁可漏过不可打扰
  }

  /** 是否值得在当前页面运行（有正文即可，中英文都支持） */
  function hasContent() {
    return !!document.body && document.body.innerText.trim().length > 200;
  }

  /** 判断当前页面类型：article（文章页）或 list（列表/首页） */
  function detectPageType() {
    const url = location.pathname;

    // 1. URL 模式：明确的单篇文章路径（优先判定，避免 DOM 启发式误判）
    const articlePatterns = /\/(post|article|p|blog|news|story|detail|item|doc|docs|wiki|note|column|book|chapter|read)\b/i;
    if (articlePatterns.test(url)) return 'article';

    // 2. URL 模式：典型的列表/首页路径
    if (url === '/' || url === '' || url === '/home' || url === '/index.html') return 'list';
    const listPatterns = /\/(feed|explore|search|trending|topic|list|tag|category|channel|hot|recommend|follow|questions|videos|courses|index|home)\b/i;
    if (listPatterns.test(url)) return 'list';

    // 3. 有明确的 article/main 正文区域 → 文章页（在 DOM 启发式之前判定）
    const article = document.querySelector('article');
    if (article && article.innerText.trim().length > 500) return 'article';

    const main = document.querySelector('main, [role="main"]');
    if (main && main.innerText.trim().length > 600) return 'article';

    // 4. DOM 结构：列表项数量远多于段落（更保守的阈值）
    const listItems = document.querySelectorAll('article, .post, .article-item, .item, .card, .feed-item, .question-item');
    const paragraphs = document.querySelectorAll('p');
    if (listItems.length > 10 && listItems.length > paragraphs.length * 0.3) return 'list';

    // 5. 标题极多但正文极少（排除正常文章的多级标题结构）
    const headings = document.querySelectorAll('h2, h3');
    if (headings.length > 20 && paragraphs.length < headings.length * 1.2) return 'list';

    // 6. 链接密度过高（导航/目录型页面特征）
    const links = document.querySelectorAll('a');
    const allText = document.body.innerText.trim().length || 1;
    const linkText = Array.from(links).slice(0, 120).reduce((sum, a) => sum + (a.innerText || '').length, 0);
    if (links.length > 80 && linkText / allText > 0.6) return 'list';

    return 'article';
  }

  // ------------------------------------------------------------------
  // STEP 2 · read() — 读取上下文：提取正文段落
  // ------------------------------------------------------------------

  /** 判断元素是否属于应忽略的区块（导航/广告/页脚等） */
  function isIgnorable(el) {
    if (!el || el.nodeType !== 1) return true;
    const IGNORE_SELECTOR = 'nav, aside, footer, header, script, style, noscript, ' +
      '[role="navigation"], [role="banner"], ' +
      '.ad, .ads, .advert, .sidebar, .comment, .share, ' +
      '.cookie, .newsletter, ' +
      'pre, .highlight, .codehilite, [class*="language-"]';
    try {
      if (el.closest(IGNORE_SELECTOR)) return true;
    } catch (e) { /* closest 选择器兼容性保护 */ }
    // 已插入的译文块自身也忽略
    if (el.hasAttribute(CONFIG.ID_ATTR) || el.classList.contains('tbit-translation')) return true;
    // 忽略摘要卡片及其内部元素，防止摘要文本被二次翻译
    if (el.closest('.tbit-page-summary')) return true;

    // 适配器额外忽略规则（祖先方向 closest）
    const adapter = getActiveAdapter();
    if (adapter && adapter.ignoreSelectors) {
      for (const sel of adapter.ignoreSelectors) {
        try {
          if (el.closest(sel)) return true;
        } catch (e) { /* 选择器语法容错 */ }
      }
    }
    // 适配器后代方向检查：元素内部包含特定标记也视为 ignorable
    if (adapter && adapter.ignoreDescendants) {
      for (const sel of adapter.ignoreDescendants) {
        try {
          if (el.querySelector(sel)) return true;
        } catch (e) { /* 选择器语法容错 */ }
      }
    }
    return false;
  }

  /** 提取正文段落，返回 [{id, el, text}] */
  function read(root) {
    // 清理已从 DOM 中移除的孤儿段落，防止 ID 冲突和内存泄漏
    STATE.paras = STATE.paras.filter(p => p.el && p.el.isConnected);

    // 优先从语义化主体区域提取，避免导航/侧边栏干扰
    if (!root) {
      root = document.querySelector('main, article, [role="main"]') || document.body;
    }
    if (!root) return [];

    // 基础候选标签 + 包含纯长文本的 div（避免布局 div）
    const basic = Array.from(root.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, figcaption, td, th, ' +
      'caption, summary, details, address, abbr[title]'
    ));

    // 额外收集：不含子段落的 div/span/section/article，且文本量足够
    const textBlocks = Array.from(root.querySelectorAll('div, section, article, aside, span'));
    const extra = textBlocks.filter(el => {
      // 排除脚本自身创建的任何元素（术语高亮、译文块、悬浮球等），防止二次提取
      if (el.closest('.tbit-translation, .tbit-term-inline, .tbit-table-trans, .tbit-ball, .tbit-panel, .tbit-page-summary, .tbit-tooltip')) return false;
      if (isIgnorable(el)) return false;
      // 不包含已有候选子元素（避免重复提取）
      if (el.querySelector('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, div, section, article')) return false;
      // 已包含译文块或已标记段落的区域不再提取（防止父容器被重复翻译）
      if (el.querySelector('.tbit-translation, [data-tbit-bi-id]')) return false;
      // 排除摘要卡片区域，防止 AI 摘要被当作正文翻译
      if (el.closest('.tbit-page-summary')) return false;
      const text = (el.innerText || '').trim();
      // 只取较长的纯文本块，过滤短碎片和布局 div
      if (text.length < CONFIG.MIN_PARA_LENGTH) return false;
      // 子元素过多说明是复杂布局，跳过
      if (el.children.length > 4) return false;
      return true;
    });

    const candidates = [...basic, ...extra];
    // 过滤祖先节点：如果元素包含其他候选元素，则跳过（由子元素负责翻译）
    // 避免 td 和内部的 p 同时被提取导致同一内容翻译两次
    const leafNodes = candidates.filter(el => {
      return !candidates.some(other => other !== el && el.contains(other));
    });

    const result = [];
    let nextId = STATE.paras.length ? Math.max(...STATE.paras.map(p => p.id)) + 1 : 1;

    for (const el of leafNodes) {
      if (isIgnorable(el)) continue;
      // 可见性检查：display:none / 隐藏元素跳过
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;

      const text = (el.innerText || '').trim();
      if (!text) continue;

      // 适配器文本过滤（如 GitHub 路径/代码/文件名不翻译）
      const adapter = getActiveAdapter();
      if (adapter && adapter.textFilter && !adapter.textFilter(text)) continue;

      // 短标题/列表项允许略短，普通段落要求最短长度
      const isHeading = /^(h[1-6]|figcaption|caption|summary)$/.test(el.tagName);
      const isListItem = el.tagName === 'LI';
      const isSmall = el.tagName === 'ABBR';
      const minLen = (isHeading || isListItem || isSmall) ? 10 : CONFIG.MIN_PARA_LENGTH;
      if (text.length < minLen) continue;

      // 跳过纯数字/代码/URL 段
      if (/^[\d\s.,:;%$¥€£()-]+$/.test(text)) continue;
      if (/^(https?:\/\/|www\.)/i.test(text) && text.length < 100) continue;

      // 该元素内部还包含候选元素时（如 li 嵌套 p），只取最外层
      if (el.querySelector('p, li, blockquote')) continue;

      // 幂等：已有编号的元素，如果已在 STATE.paras 中则跳过；
      // 如果不在（如早期不完整扫描遗留），重新评估并纳入
      const existingId = el.getAttribute(CONFIG.ID_ATTR);
      if (existingId) {
        const existing = STATE.paras.find(p => p.id === parseInt(existingId, 10));
        if (existing) continue;
        // 早期不完整扫描遗留：重新纳入
      }

      el.setAttribute(CONFIG.ID_ATTR, String(nextId));
      result.push({ id: nextId, el, text: text.slice(0, CONFIG.MAX_PARA_LENGTH), translated: false });
      nextId++;
    }
    return result;
  }

  /** 收集页面主要内容文本（用于摘要），限制长度避免超出 LLM 上下文 */
  function collectContent(maxLen = 5000) {
    const root = document.querySelector('main, article, [role="main"]') || document.body;
    if (!root) return '';

    const basic = Array.from(root.querySelectorAll(
      'p, h1, h2, h3, h4, h5, h6, li, blockquote, dd, dt, figcaption, td, th, ' +
      'caption, summary, details, address, abbr[title]'
    ));

    const chunks = [];
    for (const el of basic) {
      if (isIgnorable(el)) continue;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const text = (el.innerText || '').trim();
      if (!text || text.length < 10) continue;
      // 适配器文本过滤
      const adapter = getActiveAdapter();
      if (adapter && adapter.textFilter && !adapter.textFilter(text)) continue;
      chunks.push(text);
      if (chunks.join('\n\n').length > maxLen) break;
    }
    return chunks.join('\n\n').slice(0, maxLen);
  }

  /** 视口内的段落优先（惰性翻译核心） */
  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    return rect.bottom > -vh * 0.5 && rect.top < vh * 1.5;
  }

  // ------------------------------------------------------------------
  // STEP 3 · run() — 执行处理：分块合并调用 LLMBridge
  // ------------------------------------------------------------------

  /** 带超时的 chat 包装 */
  function chat(prompt, opts) {
    return Promise.race([
      LLMBridge.chat(prompt, opts),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('LLM_TIMEOUT')), CONFIG.LLM_TIMEOUT)),
    ]);
  }

  /** 容错 JSON 解析：剥离 markdown 包裹、修复常见格式问题 */
  function tolerantParse(raw) {
    if (raw == null) throw new Error('EMPTY_RESPONSE');
    let s = String(raw).trim();
    // 剥离 ```json ... ``` 包裹
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
    // 直接找最外层的 JSON 数组/对象
    try { return JSON.parse(s); } catch (e) { /* 继续 */ }
    const arrStart = s.indexOf('[');
    const arrEnd = s.lastIndexOf(']');
    if (arrStart !== -1 && arrEnd > arrStart) {
      try { return JSON.parse(s.slice(arrStart, arrEnd + 1)); } catch (e) { /* 继续 */ }
    }
    const objStart = s.indexOf('{');
    const objEnd = s.lastIndexOf('}');
    if (objStart !== -1 && objEnd > objStart) {
      try { return JSON.parse(s.slice(objStart, objEnd + 1)); } catch (e) { /* 继续 */ }
    }
    throw new Error('JSON_PARSE_FAILED');
  }

  // ------------------------------------------------------------------
  // 摘要与术语提取（中英文通用）
  // ------------------------------------------------------------------

  /** 构造摘要提示词 */
  function buildSummaryPrompt(content, lang) {
    const isZh = lang === 'zh';
    return [
      isZh
        ? '你是一位资深编辑。请阅读以下内容，给出：'
        : '你是一位资深双语编辑。请阅读以下英文内容，给出：',
      isZh ? '1. 一段 200 字以内的中文摘要，提炼核心观点与关键信息；' : '1. 一段 200 字以内的中文摘要，提炼核心观点与关键信息；',
      '2. 提取 3-10 个重要术语、专业名词、网络梗或流行语（如有），给出简短解释；',
      '3. 只返回 JSON，不要任何多余文字。',
      '',
      '返回 JSON 格式：',
      '{"summary": "摘要内容", "terms": [{"term": "术语", "explain": "解释"}]}',
      '',
      '【正文】',
      content,
    ].join('\n');
  }

  /** 生成文章摘要 + 全局术语（中英文通用） */
  async function summarize() {
    const cacheKey = 'tbit-summary-' + location.href;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        renderSummary(data.summary);
        if (data.terms && data.terms.length) {
          for (const t of data.terms) {
            if (!STATE.terms.some(x => x.term === t.term)) STATE.terms.push(t);
          }
          renderTermsPanel();
        }
        insertSummaryToPage(data.summary);
        highlightTermsInDocument();
        setProgress('摘要已加载（来自缓存）', 'ready');
        return;
      }
    } catch (e) { /* 忽略缓存错误 */ }

    const content = collectContent(5000);
    if (!content || content.length < 100) {
      setProgress('内容太短，无法生成摘要', 'error');
      return;
    }

    const lang = detectLang();
    setProgress('正在生成摘要…', 'running');
    try {
      const prompt = buildSummaryPrompt(content, lang);
      const raw = await chat(prompt);
      const data = tolerantParse(raw);
      if (!data || typeof data.summary !== 'string') throw new Error('INVALID_SUMMARY');

      renderSummary(data.summary);
      if (data.terms && Array.isArray(data.terms)) {
        for (const t of data.terms) {
          if (t && t.term && t.explain && !STATE.terms.some(x => x.term === t.term)) {
            STATE.terms.push({ term: t.term, explain: t.explain });
          }
        }
        renderTermsPanel();
      }

      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) { /* 隐私模式 */ }
      insertSummaryToPage(data.summary);
      highlightTermsInDocument();
      setProgress('摘要生成完毕', 'ready');
    } catch (e) {
      setProgress('摘要生成失败：' + (e.message || '未知错误'), 'error');
    }
  }

  function renderSummary(text) {
    const el = document.getElementById('tbit-summary-text');
    if (!el) return;
    el.textContent = text;
    el.style.display = '';
    const empty = document.getElementById('tbit-summary-empty');
    if (empty) empty.style.display = 'none';
  }

  /** 将摘要卡片插入到页面主要内容区域开头（可折叠） */
  function insertSummaryToPage(text) {
    if (document.getElementById('tbit-page-summary')) return; // 已插入则跳过

    // 智能定位正文容器：优先 article > main > 常见内容区 > body 内第一个宽块
    let root = document.querySelector('article');
    if (!root) {
      root = document.querySelector('main, [role="main"]');
      // 若 root 包含 aside/nav 作为首个子元素，可能是布局容器，找里面的正文子容器
      if (root) {
        const inner = root.querySelector('article, section[class*="content"], div[class*="content"], div[class*="article"]');
        if (inner) root = inner;
      }
    }
    if (!root) root = document.querySelector('.content, #content, .main-content, #main-content, .article, .post, .entry');
    if (!root) {
      // 回退：找 body 内第一个宽度足够且不是导航/侧边栏的块级元素
      for (const el of document.body.children) {
        const tag = el.tagName.toLowerCase();
        if (['nav', 'aside', 'header', 'script', 'style', 'noscript', 'footer'].includes(tag)) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width >= 300) { root = el; break; }
      }
    }
    // 最终回退：直接挂到 body 开头
    if (!root) root = document.body;
    if (!root) return;

    const card = document.createElement('div');
    card.id = 'tbit-page-summary';
    card.className = 'tbit-page-summary';
    card.innerHTML = `
      <div class="tbit-page-summary-header" id="tbit-page-summary-header">
        <div class="tbit-page-summary-meta">
          <span class="tbit-page-summary-icon">✦</span>
          <span class="tbit-page-summary-title">AI 摘要</span>
        </div>
        <button class="tbit-page-summary-toggle" id="tbit-page-summary-toggle">收起</button>
      </div>
      <div class="tbit-page-summary-body" id="tbit-page-summary-body">${escapeHtml(text)}</div>
    `;

    // 用 wrapper 包裹卡片，确保在 flex 容器中宽度始终占满 100%，不受 flex-basis 影响
    const wrapper = document.createElement('div');
    wrapper.style.width = '100%';
    wrapper.style.display = 'block';
    wrapper.style.boxSizing = 'border-box';
    wrapper.appendChild(card);

    // 在 root 内第一个正文子元素之前插入，避免跑到侧边栏前面
    const children = Array.from(root.children);
    const firstContent = children.find(c => {
      const tag = c.tagName.toLowerCase();
      return !['nav', 'aside', 'header', 'footer', 'script', 'style', 'noscript'].includes(tag)
        && !c.classList.contains('tbit-page-summary');
    });
    // 优先插到第一个正文子元素之前；找不到则插到 root 最开头，绝不能在末尾
    root.insertBefore(wrapper, firstContent || root.firstChild);

    // 折叠/展开事件（header 整体可点击 + 按钮可点击）
    const header = document.getElementById('tbit-page-summary-header');
    const toggle = document.getElementById('tbit-page-summary-toggle');
    const body = document.getElementById('tbit-page-summary-body');
    const doToggle = () => {
      const isCollapsed = body.style.display === 'none';
      body.style.display = isCollapsed ? '' : 'none';
      toggle.textContent = isCollapsed ? '收起' : '展开';
      card.classList.toggle('tbit-collapsed', !isCollapsed);
    };
    if (header) header.addEventListener('click', (e) => { if (e.target !== toggle) doToggle(); });
    if (toggle && body) toggle.addEventListener('click', doToggle);
    // 默认展开
    if (body) body.style.display = '';
  }

  /** 对整个文档正文区域进行术语高亮（中英文通用） */
  function highlightTermsInDocument() {
    if (!STATE.terms.length) return;
    const root = document.querySelector('main, article, [role="main"]') || document.body;
    if (!root) return;

    // 1. 标准语义标签
    const semantic = Array.from(root.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, blockquote, figcaption, summary, dd, dt, address'));
    // 2. 文本容器（div/span）：必须是叶子文本节点，不含复杂子元素
    const containers = Array.from(root.querySelectorAll('div, span')).filter(el => {
      if (el.closest('pre, .tbit-page-summary, .tbit-ball, .tbit-panel, nav, aside, footer, header, script, style, noscript, .tbit-term-inline')) return false;
      if (el.dataset.termsHighlighted) return false;
      // 排除包含块级/复杂子元素的容器（只处理叶子文本元素）
      if (el.querySelector('div, section, article, p, h1, h2, h3, h4, h5, h6, li, ul, ol, blockquote, pre, table, img, form, input, button, nav, aside, header, footer, iframe')) return false;
      const text = el.textContent.trim();
      return text.length >= 10 && text.length <= 3000;
    });

    const targets = [...semantic, ...containers];
    for (const el of targets) {
      if (el.closest('pre, .tbit-page-summary, .tbit-ball, .tbit-panel, nav, aside, footer, header, script, style, noscript, .tbit-term-inline')) continue;
      if (el.dataset.termsHighlighted) continue;
      if (el.textContent.trim().length < 5) continue;
      highlightTermsInElement(el);
    }
    root.dataset.termsHighlighted = '1';
  }

  /** 构造翻译提示词：一次调用完成 翻译 + 术语提取 */
  function buildPrompt(paras) {
    const lines = paras.map(p => `[${p.id}] ${p.text}`).join('\n\n');
    return [
      '你是一位专业译者。请把下面带编号的段落翻译成简体中文，要求：',
      '1. 忠实原意、表达自然，符合中文技术/新闻文体；',
      '2. 专有名词、行业术语首次出现时保留原文并在术语表中解释；',
      '3. 只返回 JSON，不要任何多余文字。',
      '',
      '返回 JSON 数组，每项格式：',
      '{"id": 段落编号(整数), "translation": "中文翻译", "terms": [{"term": "术语", "explain": "中文解释"}]}',
      '没有术语时 terms 返回空数组。',
      '',
      '段落列表：',
      lines,
    ].join('\n');
  }

  /**
   * 翻译一批段落（一次 LLM 调用）。
   * 返回 {results: [{id, translation}], terms: []}
   */
  async function translateChunk(paras) {
    const prompt = buildPrompt(paras);

    let data = null;
    for (let attempt = 0; attempt <= CONFIG.RETRY_LIMIT; attempt++) {
      try {
        const raw = await chat(prompt, { response_format: 'json' });
        data = tolerantParse(raw);
        break;
      } catch (err) {
        if (attempt === CONFIG.RETRY_LIMIT) {
          console.warn('[双语阅读助手] 批次翻译失败：', err.message, '涉及段落 id:', paras.map(p => p.id).join(','));
          return { results: [], terms: [], error: err.message };
        }
        await new Promise(r => setTimeout(r, 1000)); // 重试前等待
      }
    }

    // 规范化输出
    const arr = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
    const results = [];
    const terms = [];
    for (const item of arr) {
      if (item && typeof item.id === 'number' && typeof item.translation === 'string' && item.translation.trim()) {
        results.push({ id: item.id, translation: item.translation.trim() });
      }
      if (item && Array.isArray(item.terms)) {
        for (const t of item.terms) {
          if (t && t.term && t.explain && !terms.some(x => x.term === t.term)) {
            terms.push({ term: t.term, explain: t.explain });
          }
        }
      }
    }
    return { results, terms };
  }

  /**
   * 主流程：视口优先 + 分批合并翻译（遵守"严禁循环逐段调用"规则）
   * @param {boolean} all 是否全文翻译（false = 只翻译视口附近）
   */
  async function run(all = false) {
    if (STATE.running) return;
    STATE.running = true;
      setProgress('正在分析页面…', 'running');

    try {
      // 读取（含动态新增内容），按 DOM 引用去重防止同一元素重复入库
      const fresh = read();
      const newParas = fresh.filter(p => !STATE.paras.some(ep => ep.el === p.el));
      if (newParas.length) STATE.paras.push(...newParas);

      // 排序候选：优先视口内、其次按文档顺序；跳过已翻译和已缓存
      const pending = STATE.paras.filter(p => !p.translated && !getCached(p.text));
      if (!pending.length) {
        if (STATE.paras.length === 0) {
          setProgress('未检测到可翻译的正文内容', 'error');
        } else {
          // 全部命中缓存：直接写回
          for (const p of STATE.paras) {
            if (!p.translated && getCached(p.text)) applyTranslation(p, getCached(p.text));
          }
          setProgress('已完成（全部命中缓存）', 'ready');
        }
        STATE.running = false;
        return;
      }

      pending.sort((a, b) => {
        const av = isInViewport(a.el) ? 0 : 1;
        const bv = isInViewport(b.el) ? 0 : 1;
        return av - bv || a.id - b.id;
      });

      // 分块
      const targets = all ? pending : pending.filter(p => isInViewport(p.el));
      const list = targets.length ? targets : pending.slice(0, CONFIG.CHUNK_SIZE);
      const chunks = [];
      for (let i = 0; i < list.length; i += CONFIG.CHUNK_SIZE) {
        chunks.push(list.slice(i, i + CONFIG.CHUNK_SIZE));
      }

      // 总字符预算保护
      let budget = CONFIG.MAX_TOTAL_CHARS;

      for (let ci = 0; ci < chunks.length; ci++) {
        setProgress(`翻译中 ${ci + 1}/${chunks.length}…`, 'running');
        const chunk = chunks[ci].filter(p => {
          if (p.text.length > budget) return false;
          budget -= p.text.length;
          return true;
        });
        if (!chunk.length) break;

        const { results, terms } = await translateChunk(chunk);

        // 先汇总术语
        const newTerms = terms.filter(t => !STATE.terms.some(x => x.term === t.term));
        STATE.terms.push(...newTerms);
        renderTermsPanel();

        // 写回结果
        const byId = new Map(results.map(r => [r.id, r]));
        for (const p of chunk) {
          const r = byId.get(p.id);
          if (r) {
            setCached(p.text, r.translation);
            applyTranslation(p, r.translation);
          }
        }

        if (ci < chunks.length - 1) {
          await new Promise(r => setTimeout(r, CONFIG.CHUNK_INTERVAL));
        }
      }

      // 处理有缓存但未翻译的段落（混合场景：部分命中缓存、部分未命中）
      for (const p of STATE.paras) {
        if (!p.translated && getCached(p.text)) {
          applyTranslation(p, getCached(p.text));
        }
      }

      const done = STATE.paras.filter(p => p.translated).length;
      setProgress(`完成：${done}/${STATE.paras.length} 段`, 'ready');
    } catch (err) {
      console.error('[双语阅读助手] 运行异常：', err);
      setProgress('出错了，请稍后重试', 'error');
    } finally {
      STATE.running = false;
    }
  }

  // ------------------------------------------------------------------
  // STEP 4 · write() — 写回结果：可见、可控、可恢复
  // ------------------------------------------------------------------

  /** 把译文应用到段落（按当前模式呈现） */
  function applyTranslation(p, translation) {
    if (p.translated || !p.el.isConnected) return;
    p.translated = true;

    if (STATE.mode === 'inline') {
      const tag = p.el.tagName;
      if (tag === 'TD' || tag === 'TH') {
        insertTableCellTranslation(p.el, translation);
      } else {
        insertInline(p.el, translation);
      }
    } else {
      attachHover(p.el, translation);
    }
  }

  /** 模式一：段落后插入灰底译文块（对照阅读） */
  function insertInline(el, translation) {
    // 防御：移除该元素后面所有连续的译文块（防止中间插入其他元素导致防御失效）
    let sibling = el.nextElementSibling;
    while (sibling && sibling.classList.contains('tbit-translation')) {
      const next = sibling.nextElementSibling;
      sibling.remove();
      sibling = next;
    }
    const block = document.createElement('div');
    block.className = 'tbit-translation';
    block.textContent = translation;
    block.setAttribute('data-source-id', el.getAttribute(CONFIG.ID_ATTR));
    el.insertAdjacentElement('afterend', block);
    revealAnimation(block);
    highlightTermsInElement(block);
    highlightTermsInElement(el);
  }

  /** 表格单元格内追加翻译（小字分隔线，不破坏表格布局） */
  function insertTableCellTranslation(el, translation) {
    // 防御：如果单元格内已有表格译文，先移除
    const existing = el.querySelector('.tbit-table-trans');
    if (existing) existing.remove();

    const block = document.createElement('span');
    block.className = 'tbit-table-trans';
    block.textContent = translation;
    block.setAttribute('data-source-id', el.getAttribute(CONFIG.ID_ATTR));
    el.appendChild(block);
    revealAnimation(block);
    highlightTermsInElement(block);
    highlightTermsInElement(el);
  }

  /** 模式二：悬停浮层显示译文（不打扰原排版） */
  function attachHover(el, translation) {
    // 防御：如果已有 tooltip 且仍在 DOM 中，更新内容
    if (el._tbitTooltip && el._tbitTooltip.isConnected) {
      el._tbitTooltip.textContent = translation;
      return;
    }
    // 清理旧引用（tooltip 已被移除的情况）
    if (el._tbitTooltip) {
      delete el._tbitTooltip;
    }
    el.classList.add('tbit-hoverable');
    const tip = document.createElement('div');
    tip.className = 'tbit-tooltip';
    tip.textContent = translation;
    tip.setAttribute('data-source-id', el.getAttribute(CONFIG.ID_ATTR));
    document.body.appendChild(tip);
    el._tbitTooltip = tip;

    el.addEventListener('mouseenter', () => positionTip(el, tip, true));
    el.addEventListener('mouseleave', () => { tip.classList.remove('tbit-show'); });
    highlightTermsInElement(el);
  }

  function positionTip(el, tip, show) {
    const rect = el.getBoundingClientRect();
    tip.style.left = Math.max(12, Math.min(rect.left, window.innerWidth - 420)) + 'px';
    tip.style.top = Math.min(rect.bottom + 8, window.innerHeight - 60) + 'px';
    if (show) tip.classList.add('tbit-show');
  }

  /** 切换模式：清除译文并用缓存按新模式重建 */
  function rebuildInlineFromCache() {
    removeTranslations();
    for (const p of STATE.paras) {
      if (p.translated) {
        p.translated = false;
        const c = getCached(p.text);
        if (c) applyTranslation(p, c);
      }
    }
  }

  /** 移除所有译文痕迹（一键恢复原页面） */
  // ------------------------------------------------------------------
  // 术语高亮（在译文和原文中标记已收集术语）
  // ------------------------------------------------------------------

  let termPopup = null;
  let termPopupEnterTimer = null;  // 进入术语的延迟计时器（防抖）
  let termPopupLeaveTimer = null;  // 离开的延迟计时器

  function highlightTermsInElement(el) {
    if (!STATE.terms.length || el.dataset.termsHighlighted) return;
    const sorted = [...STATE.terms].sort((a, b) => b.term.length - a.term.length);
    const termsMap = {};
    for (const t of sorted) termsMap[t.term.toLowerCase()] = t.explain;

    const pattern = sorted.map(t => escapeRegExp(t.term)).join('|');
    if (!pattern) return;

    // 方案 A：元素只含内联子元素（span/b/i/a 等），直接对 innerHTML 做字符串替换
    // 可处理 React/Vue 把文本拆成多个 span 导致的跨节点术语匹配失败
    const inlineTags = new Set(['SPAN', 'B', 'I', 'EM', 'STRONG', 'A', 'CODE', 'SMALL', 'SUB', 'SUP', 'BR', 'FONT', 'LABEL', 'MARK']);
    const onlyInline = el.children.length === 0 || Array.from(el.children).every(c => inlineTags.has(c.tagName));
    if (onlyInline && el.textContent.trim().length >= 3) {
      const htmlRegex = new RegExp(`(${pattern})(?![^<]*>)`, 'gi');
      const originalHtml = el.innerHTML;
      const newHtml = originalHtml.replace(htmlRegex, (match) => {
        const explain = termsMap[match.toLowerCase()] || '';
        return `<span class="tbit-term-inline" data-term="${escapeHtml(match)}" data-explain="${escapeHtml(explain)}">${match}</span>`;
      });
      if (newHtml !== originalHtml) {
        el.innerHTML = newHtml;
        el.dataset.termsHighlighted = '1';
      }
      return;
    }

    // 方案 B：逐文本节点替换（原有逻辑，适用于含块级子元素的复杂结构）
    const regex = new RegExp(`(${pattern})`, 'gi');
    walkTextNodes(el, (node) => {
      const text = node.textContent;
      if (!regex.test(text)) return;
      regex.lastIndex = 0; // reset

      const frag = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(regex, (match, _, offset) => {
        if (offset > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        }
        const span = document.createElement('span');
        span.className = 'tbit-term-inline';
        span.textContent = match;
        span.dataset.term = match;
        span.dataset.explain = termsMap[match.toLowerCase()] || '';
        frag.appendChild(span);
        lastIndex = offset + match.length;
      });
      if (lastIndex < text.length) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex)));
      }
      node.parentNode.replaceChild(frag, node);
    });
    el.dataset.termsHighlighted = '1';
  }

  function walkTextNodes(el, callback) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    for (const node of nodes) callback(node);
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function showTermPopup(termEl) {
    clearTimeout(termPopupLeaveTimer);
    const term = termEl.dataset.term;
    const explain = termEl.dataset.explain;
    if (!term || !explain) return;

    // 如果已经显示的是同一个术语，不重复创建
    if (termPopup && termPopup.dataset.currentTerm === term) return;

    hideTermPopup();
    termPopup = document.createElement('div');
    termPopup.className = 'tbit-term-popup';
    termPopup.dataset.currentTerm = term;
    termPopup.innerHTML = `
      <h4>${escapeHtml(term)} <span>术语</span></h4>
      <p>${escapeHtml(explain)}</p>
    `;

    // 弹窗自身的 hover 管理：鼠标进入时取消隐藏计时，离开时启动隐藏
    termPopup.addEventListener('mouseenter', () => {
      clearTimeout(termPopupLeaveTimer);
    });
    termPopup.addEventListener('mouseleave', () => {
      termPopupLeaveTimer = setTimeout(hideTermPopup, 200);
    });

    document.body.appendChild(termPopup);

    const r = termEl.getBoundingClientRect();
    const pw = termPopup.offsetWidth || 340;
    const ph = termPopup.offsetHeight || 180;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = r.left + r.width / 2 - pw / 2;
    let top = r.bottom + 10;
    if (left < 10) left = 10;
    if (left + pw > vw - 10) left = vw - pw - 10;
    if (top + ph > vh - 10) top = r.top - ph - 10;
    if (top < 10) top = 10;
    termPopup.style.left = left + 'px';
    termPopup.style.top = top + 'px';
  }

  function hideTermPopup() {
    clearTimeout(termPopupEnterTimer);
    clearTimeout(termPopupLeaveTimer);
    if (termPopup) { termPopup.remove(); termPopup = null; }
  }

  function setupTermPopup() {
    // hover 支持：mouseenter 延迟显示，mouseleave 延迟隐藏
    // 使用 mouseover/mouseout 做全局委托，但通过 relatedTarget 判断真实意图
    document.addEventListener('mouseover', (e) => {
      const termEl = e.target.closest('.tbit-term-inline');
      if (termEl) {
        clearTimeout(termPopupLeaveTimer);
        // 80ms 防抖：快速滑过时不弹，停留才弹
        termPopupEnterTimer = setTimeout(() => showTermPopup(termEl), 80);
      }
    });

    document.addEventListener('mouseout', (e) => {
      const fromTerm = e.target.closest('.tbit-term-inline');
      const fromPopup = e.target.closest('.tbit-term-popup');
      if (!fromTerm && !fromPopup) return;

      // 判断鼠标是否移动到了另一个术语或弹窗内
      const toTerm = e.relatedTarget && e.relatedTarget.closest('.tbit-term-inline');
      const toPopup = e.relatedTarget && e.relatedTarget.closest('.tbit-term-popup');

      if (!toTerm && !toPopup) {
        clearTimeout(termPopupEnterTimer);
        termPopupLeaveTimer = setTimeout(hideTermPopup, 200);
      }
    });

    // click 支持：点击术语弹出，点击页面其他地方关闭
    document.addEventListener('click', (e) => {
      const termEl = e.target.closest('.tbit-term-inline');
      if (termEl) {
        e.stopPropagation();
        clearTimeout(termPopupEnterTimer);
        clearTimeout(termPopupLeaveTimer);
        showTermPopup(termEl);
        return;
      }
      // 点击弹窗外区域关闭
      if (!e.target.closest('.tbit-term-popup')) {
        hideTermPopup();
      }
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function removeTranslations() {
    document.querySelectorAll('.tbit-translation, .tbit-table-trans, .tbit-tooltip, #tbit-page-summary').forEach(n => n.remove());
    document.querySelectorAll('.tbit-hoverable').forEach(n => {
      n.classList.remove('tbit-hoverable');
      if (n._tbitTooltip) delete n._tbitTooltip;
    });
    // 移除术语高亮标记（还原为纯文本）
    document.querySelectorAll('.tbit-term-inline').forEach(span => {
      const text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    });
    // 清理术语高亮标记，允许重新高亮
    document.querySelectorAll('[data-terms-highlighted]').forEach(el => {
      delete el.dataset.termsHighlighted;
    });
    // 清除原文上的段落标记，防止 restore 后 read() 跳过或重复
    document.querySelectorAll('[' + CONFIG.ID_ATTR + ']').forEach(el => {
      el.removeAttribute(CONFIG.ID_ATTR);
    });
    hideTermPopup();
  }

  /** 恢复原页面：清除译文 + 状态（不删缓存） */
  function restorePage() {
    removeTranslations();
    STATE.paras = [];
    STATE.terms = [];
    setProgress('已恢复原页面', 'ready');
  }

  function revealAnimation(node) {
    node.style.opacity = '0';
    node.style.transform = 'translateY(4px)';
    requestAnimationFrame(() => {
      node.style.transition = 'opacity .35s ease, transform .35s ease';
      node.style.opacity = '1';
      node.style.transform = 'none';
    });
  }

  // ------------------------------------------------------------------
  // 术语面板
  // ------------------------------------------------------------------

  function renderTermsPanel() {
    const list = document.getElementById('tbit-terms-list');
    if (!list) return;
    list.innerHTML = '';
    if (!STATE.terms.length) {
      list.innerHTML = '<div class="tbit-terms-empty">暂未提取到术语，翻译后将自动汇总到这里。</div>';
      return;
    }
    for (const t of STATE.terms) {
      const item = document.createElement('div');
      item.className = 'tbit-term';
      const term = document.createElement('b');
      term.textContent = t.term;
      const ex = document.createElement('span');
      ex.textContent = ' — ' + t.explain;
      item.append(term, ex);
      list.appendChild(item);
    }
    const badge = document.getElementById('tbit-terms-badge');
    if (badge) {
      badge.textContent = String(STATE.terms.length);
      badge.style.display = 'inline-block';
    }
  }

  // ------------------------------------------------------------------
  // 缓存（localStorage，仅存译文本身，不含任何用户信息）
  // ------------------------------------------------------------------

  function hashText(text) {
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function cacheKey(text) {
    return CONFIG.CACHE_PREFIX + detectLang() + '-' + hashText(text);
  }

  function getCached(text) {
    const mem = STATE.cache[hashText(text)];
    if (mem) return mem;
    try { return localStorage.getItem(cacheKey(text)); } catch (e) { return null; }
  }

  function setCached(text, translation) {
    STATE.cache[hashText(text)] = translation;
    try { localStorage.setItem(cacheKey(text), translation); } catch (e) { /* 隐私模式等场景静默降级 */ }
  }

  function clearCache() {
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CONFIG.CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
    } catch (e) { /* 忽略 */ }
    STATE.cache = {};
    setProgress('本地缓存已清除', 'ready');
  }

  // ------------------------------------------------------------------
  // 控制球与面板 UI
  // ------------------------------------------------------------------

  function setProgress(text, type = '') {
    const el = document.getElementById('tbit-status');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('tbit-ready', 'tbit-running', 'tbit-error');
    if (type) el.classList.add('tbit-' + type);
  }

  function injectStyles() {
    if (document.getElementById('tbit-styles')) return;
    const css = `
      /* ===== 控制球 ===== */
      .tbit-ball{position:fixed;z-index:2147483000;width:56px;height:56px;
        right:20px;bottom:24px;left:auto;top:auto;
        border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;display:flex;
        align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 24px rgba(99,102,241,.45),0 0 0 1px rgba(255,255,255,.12) inset;
        user-select:none;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s;
        font-family:system-ui,-apple-system,sans-serif;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
      .tbit-ball:hover{transform:scale(1.1);box-shadow:0 8px 28px rgba(99,102,241,.55)}
      .tbit-ball:active{transform:scale(.95)}
      .tbit-ball svg{width:26px;height:26px;pointer-events:none}
      /* 呼吸脉冲 */
      @keyframes tbit-pulse{0%{box-shadow:0 0 0 0 rgba(99,102,241,.5)}70%{box-shadow:0 0 0 12px rgba(99,102,241,0)}100%{box-shadow:0 0 0 0 rgba(99,102,241,0)}}
      .tbit-ball.tbit-pulse{animation:tbit-pulse 2.5s ease-in-out infinite}

      /* ===== 面板 ===== */
      .tbit-panel{position:fixed;z-index:2147483001;width:340px;right:0;top:0;
        height:100vh;background:rgba(255,255,255,.96);
        border-radius:0;box-shadow:0 16px 48px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.04);
        display:none;font-family:system-ui,-apple-system,"PingFang SC",sans-serif;
        color:#1e1e2e;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);
        flex-direction:column;overflow:hidden}
      .tbit-panel.tbit-open{display:flex;animation:tbit-panelSlide .28s cubic-bezier(.34,1.56,.64,1)}
      @keyframes tbit-panelSlide{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}

      /* 面板头部 */
      .tbit-panel-header{display:flex;align-items:center;justify-content:space-between;gap:8px;
        padding:14px 20px;border-bottom:1px solid rgba(0,0,0,.06);
        background:linear-gradient(180deg,rgba(99,102,241,.04),transparent);
        flex-shrink:0}
      .tbit-panel-header .tbit-title{display:flex;align-items:center;gap:8px;font-size:17px;font-weight:700;color:#2d2d44}

      /* 面板内容区：整体不滚动，由内部卡片各自管理 */
      .tbit-panel-body{flex:1;display:flex;flex-direction:column;padding:16px 20px 20px;overflow:hidden;gap:10px}
      .tbit-panel-body>.tbit-status{flex-shrink:0}
      .tbit-panel-body>.tbit-card{margin-bottom:0;flex-shrink:0}
      .tbit-panel-body>.tbit-card:last-of-type{flex:1;display:flex;flex-direction:column;min-height:120px;overflow:hidden}
      .tbit-panel-body>.tbit-card:last-of-type .tbit-terms{flex:1;overflow-y:auto;max-height:none;min-height:100px}
      /* 底部提示始终贴底 */
      .tbit-panel-body>div:last-child{flex-shrink:0;margin-top:auto}
      .tbit-close{width:28px;height:28px;border-radius:8px;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#9a9ab0;transition:all .15s;flex-shrink:0}
      .tbit-close:hover{background:#f0f0f5;color:#ef4444;transform:rotate(90deg)}
      .tbit-panel .tbit-status{font-size:12.5px;color:#8b8ba7;margin-bottom:16px;min-height:18px;display:flex;align-items:center;gap:6px}
      .tbit-panel .tbit-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#c4c4d4;display:inline-block;flex-shrink:0}
      .tbit-panel .tbit-status.tbit-ready::before{background:#10b981}
      .tbit-panel .tbit-status.tbit-running::before{background:#f59e0b;animation:tbit-dotPulse 1s infinite}
      .tbit-panel .tbit-status.tbit-error::before{background:#ef4444}
      @keyframes tbit-dotPulse{0%,100%{opacity:1}50%{opacity:.4}}

      /* 统一卡片区域 */
      .tbit-card{background:#f8f9fb;border-radius:14px;padding:12px;margin-bottom:10px}
      .tbit-card-title{font-size:12px;font-weight:600;color:#8b8ba7;text-transform:uppercase;letter-spacing:.3px;margin:0 0 10px;display:flex;align-items:center;gap:6px}

      /* ===== 按钮 ===== */
      .tbit-btn-row{display:flex;gap:8px;flex-wrap:wrap}
      .tbit-btn{border:none;background:#fff;border-radius:10px;padding:8px 14px;font-size:13px;
        cursor:pointer;color:#4b4b6a;font-weight:600;transition:all .15s;display:inline-flex;align-items:center;gap:5px;
        box-shadow:0 1px 3px rgba(0,0,0,.06)}
      .tbit-btn, .tbit-seg, .tbit-terms, .tbit-card{cursor:default}
      .tbit-btn:hover{background:#f3f4f6;color:#2d2d44;transform:translateY(-1px);box-shadow:0 2px 6px rgba(0,0,0,.1)}
      .tbit-btn:active{transform:translateY(0)}
      .tbit-btn.tbit-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 2px 10px rgba(99,102,241,.35)}
      .tbit-btn.tbit-primary:hover{box-shadow:0 4px 14px rgba(99,102,241,.45);transform:translateY(-1px)}
      .tbit-btn.tbit-ghost{background:transparent;box-shadow:none;color:#8b8ba7;font-weight:500}
      .tbit-btn.tbit-ghost:hover{background:#f3f4f6;color:#6b6b8a}

      /* ===== 模式切换 ===== */
      .tbit-seg{display:flex;background:#eef0f4;border-radius:12px;padding:4px}
      .tbit-seg button{flex:1;border:none;background:transparent;padding:8px 0;font-size:13px;cursor:pointer;
        color:#6b6b8a;border-radius:10px;transition:all .15s;font-weight:600}
      .tbit-seg button.tbit-active{background:#fff;color:#6366f1;box-shadow:0 1px 4px rgba(0,0,0,.08)}

      /* ===== 术语表 ===== */
      .tbit-terms{max-height:200px;overflow:auto}
      .tbit-terms::-webkit-scrollbar{width:4px}
      .tbit-terms::-webkit-scrollbar-thumb{background:#dddde8;border-radius:4px}
      .tbit-terms-badge{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:10px;font-size:11px;padding:2px 8px;font-weight:600}
      .tbit-term{font-size:13px;line-height:1.75;color:#4b4b6a;padding:8px 10px;margin:4px 0;border-radius:10px;background:#fff;transition:all .15s;box-shadow:0 1px 2px rgba(0,0,0,.04)}
      .tbit-term:hover{background:#f3f4f6;transform:translateX(2px)}
      .tbit-term b{color:#6366f1;font-weight:600}
      .tbit-terms-empty{font-size:12.5px;color:#a0a0b8;padding:8px 0}

      /* ===== 摘要卡片 ===== */
      .tbit-summary{font-size:13px;line-height:1.75;color:#2d2d44;padding:8px 10px;background:#fff;border-radius:10px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
      .tbit-summary-empty{font-size:12.5px;color:#a0a0b8;padding:8px 0}

      /* ===== 页面内嵌摘要卡片 ===== */
      .tbit-page-summary{margin:16px 0 24px;border-radius:14px;background:linear-gradient(135deg,rgba(248,249,255,.98),rgba(244,246,255,.98));
        box-shadow:0 4px 24px rgba(99,102,241,.1),0 0 0 1px rgba(99,102,241,.12);overflow:hidden;
        font-family:system-ui,-apple-system,"PingFang SC",sans-serif;animation:tbit-summaryIn .45s cubic-bezier(.34,1.56,.64,1);
        display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;border-left:3px solid #6366f1}
      @keyframes tbit-summaryIn{from{opacity:0;transform:translateY(-10px) scale(.99)}to{opacity:1;transform:translateY(0) scale(1)}}
      .tbit-page-summary-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;
        cursor:pointer;user-select:none;transition:background .15s;width:100%;box-sizing:border-box}
      .tbit-page-summary-header:hover{background:rgba(99,102,241,.04)}
      .tbit-page-summary-meta{display:flex;align-items:center;gap:8px;min-width:0}
      .tbit-page-summary-icon{font-size:15px;color:#6366f1;line-height:1;flex-shrink:0}
      .tbit-page-summary-title{font-size:14px;font-weight:700;color:#4338ca;letter-spacing:.2px;white-space:nowrap}
      .tbit-page-summary-toggle{border:none;background:rgba(99,102,241,.1);color:#6366f1;border-radius:8px;padding:4px 12px;
        font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;flex-shrink:0}
      .tbit-page-summary-toggle:hover{background:rgba(99,102,241,.2);transform:translateY(-1px)}
      .tbit-page-summary-body{padding:12px 16px 16px;font-size:14.5px;line-height:1.85;color:#374151;
        border-top:1px solid rgba(99,102,241,.08);background:rgba(255,255,255,.5);
        word-break:break-word;overflow-wrap:break-word;min-width:0;flex-shrink:0}
      .tbit-page-summary.tbit-collapsed .tbit-page-summary-body{display:none}
      .tbit-page-summary.tbit-collapsed{border-radius:14px}
      .tbit-page-summary.tbit-collapsed .tbit-page-summary-header:hover{border-radius:14px}

      /* ===== 术语内联高亮 ===== */
      .tbit-term-inline{border-bottom:1px dashed #6366f1;color:#4f46e5;cursor:pointer;transition:all .15s;position:relative}
      .tbit-term-inline:hover{border-bottom-style:solid;background:rgba(99,102,241,.08);border-radius:2px}
      .tbit-term-popup{position:fixed;z-index:2147483005;max-width:360px;background:#fff;border-radius:14px;padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.04);font-family:system-ui,-apple-system,"PingFang SC",sans-serif;animation:tbit-popIn .2s cubic-bezier(.34,1.56,.64,1);line-height:1.75}
      @keyframes tbit-popIn{from{opacity:0;transform:translateY(6px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      .tbit-term-popup h4{margin:0 0 6px;font-size:15px;font-weight:700;color:#1e1e2e;display:flex;align-items:center;gap:6px}
      .tbit-term-popup h4 span{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e;font-size:11px;font-weight:600;padding:2px 8px;border-radius:6px}
      .tbit-term-popup p{margin:0;font-size:13.5px;color:#4b4b6a;max-height:200px;overflow:auto}
      /* 底部小三角已移除（用户反馈不美观） */

      /* ===== 译文块 ===== */
.tbit-translation{background:linear-gradient(135deg,#f5f7ff,#f0f3ff);border-left:3px solid #6366f1;margin:8px 0;padding:12px 16px;
border-radius:0 12px 12px 0;font-size:15px;line-height:1.8;color:#2d2d44;max-width:100%;box-shadow:0 1px 4px rgba(99,102,241,.06)}
.tbit-table-trans{display:block;margin-top:6px;padding-top:4px;border-top:1px dashed rgba(99,102,241,.25);
font-size:0.85em;line-height:1.55;color:#6366f1;opacity:.9;word-break:break-word}
      .tbit-hoverable{position:relative;transition:background .15s}
      .tbit-hoverable:hover{background:rgba(99,102,241,.05);border-radius:6px}
      .tbit-tooltip{position:fixed;z-index:2147483002;max-width:420px;background:rgba(30,30,46,.96);color:#fff;
        padding:14px 18px;border-radius:14px;font-size:14px;line-height:1.8;box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.06) inset;
        opacity:0;pointer-events:none;transition:opacity .2s;max-height:300px;overflow:auto;
        font-family:system-ui,-apple-system,"PingFang SC",sans-serif;backdrop-filter:blur(8px)}
      .tbit-tooltip.tbit-show{opacity:1}

      /* ===== 划词翻译工具条 ===== */
      .tbit-sel-bar{position:fixed;z-index:2147483003;display:flex;align-items:center;gap:6px;
        background:rgba(255,255,255,.98);border-radius:10px;padding:4px 6px;box-shadow:0 4px 16px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);
        animation:tbit-selIn .18s cubic-bezier(.34,1.56,.64,1);font-family:system-ui,-apple-system,"PingFang SC",sans-serif}
      @keyframes tbit-selIn{from{opacity:0;transform:translateY(6px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}
      .tbit-sel-btn{border:none;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:8px;
        padding:6px 14px;font-size:13px;font-weight:600;cursor:pointer;box-shadow:0 2px 8px rgba(99,102,241,.35);transition:all .15s}
      .tbit-sel-btn:hover{box-shadow:0 4px 12px rgba(99,102,241,.45);transform:translateY(-1px)}
      .tbit-sel-btn:disabled{opacity:.6;cursor:default;transform:none}
      .tbit-sel-close{width:22px;height:22px;border-radius:6px;border:none;background:transparent;cursor:pointer;
        display:flex;align-items:center;justify-content:center;color:#9a9ab0;transition:all .15s}
      .tbit-sel-close:hover{background:#f0f0f5;color:#ef4444}
      .tbit-sel-result{position:fixed;z-index:2147483004;max-width:360px;background:rgba(255,255,255,.98);
        border-radius:14px;padding:14px 16px;box-shadow:0 8px 32px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04);
        font-size:13.5px;line-height:1.75;color:#2d2d44;animation:tbit-selIn .2s cubic-bezier(.34,1.56,.64,1);
        font-family:system-ui,-apple-system,"PingFang SC",sans-serif;backdrop-filter:blur(12px)}
      .tbit-sel-result b{color:#6366f1;font-weight:600}
      .tbit-sel-result .tbit-sel-actions{display:flex;gap:8px;margin-top:10px;justify-content:flex-end}
      .tbit-sel-result .tbit-sel-actions button{border:none;background:#f3f4f6;color:#4b4b6a;border-radius:8px;
        padding:5px 10px;font-size:12px;cursor:pointer;font-weight:600;transition:all .15s}
      .tbit-sel-result .tbit-sel-actions button:hover{background:#e8e8f0}
      .tbit-sel-result .tbit-sel-actions button.tbit-primary{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff}
      .tbit-sel-result .tbit-sel-actions button.tbit-primary:hover{box-shadow:0 2px 8px rgba(99,102,241,.35)}

      @media (prefers-reduced-motion: reduce){.tbit-translation,.tbit-ball,.tbit-sel-bar,.tbit-sel-result{transition:none}}
    `;
    const style = document.createElement('style');
    style.id = 'tbit-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ------------------------------------------------------------------
  // 控制球 + 面板交互（球固定右下，面板固定右侧）
  // ------------------------------------------------------------------
  function setupToggle(ball, panel) {
    ball.addEventListener('click', () => {
      panel.classList.toggle('tbit-open');
    });
  }

  function injectUI(isZh, pageType) {
    if (document.getElementById('tbit-ball')) return;
    const isList = pageType === 'list';

    // 控制球
    const ball = document.createElement('div');
    ball.id = 'tbit-ball';
    ball.className = 'tbit-ball tbit-pulse';
    ball.title = '智能阅读助手';
    ball.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
    `;

    // 面板
    const panel = document.createElement('div');
    panel.id = 'tbit-panel';
    panel.className = 'tbit-panel';
    panel.innerHTML = `
      <div class="tbit-panel-header">
        <span class="tbit-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          阅读助手
          <span class="tbit-terms-badge" id="tbit-terms-badge" style="display:none"></span>
        </span>
        <button class="tbit-close" id="tbit-btn-close" title="关闭面板">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="tbit-panel-body">
        <div class="tbit-status tbit-ready" id="tbit-status">就绪</div>

        <!-- 摘要卡片 -->
        <div class="tbit-card">
          <div class="tbit-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b8ba7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            文章摘要
          </div>
          <div class="tbit-summary" id="tbit-summary-text" style="display:none"></div>
          ${isList ? `
          <div class="tbit-summary-empty" id="tbit-summary-empty">当前为列表/首页，AI 摘要主要针对文章页。</div>
          <div class="tbit-btn-row" style="margin-top:8px">
            <button class="tbit-btn tbit-primary" id="tbit-btn-analyze">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
              分析此页
            </button>
          </div>
          ` : `<div class="tbit-summary-empty" id="tbit-summary-empty">正在生成摘要，请稍候…</div>`}
        </div>

        ${isZh ? '' : `
        <div class="tbit-card">
          <div class="tbit-btn-row">
            <button class="tbit-btn tbit-primary" id="tbit-btn-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8l6 6"/><path d="M4 14l6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="M22 22l-5-10-5 10"/><path d="M14 18h6"/></svg>
              翻译全部
            </button>
            <button class="tbit-btn" id="tbit-btn-restore">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              恢复原页
            </button>
          </div>
          <div class="tbit-seg" style="margin-top:10px">
            <button id="tbit-mode-inline" class="tbit-active">对照模式</button>
            <button id="tbit-mode-hover">悬停模式</button>
          </div>
        </div>
        `}

        <div class="tbit-card">
          <div class="tbit-card-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8b8ba7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            术语表
          </div>
          <div class="tbit-terms" id="tbit-terms-list"><div class="tbit-terms-empty">${isList ? '列表页暂不自动提取术语，点击「分析此页」后生成。' : '暂未提取到术语，生成摘要后将自动汇总到这里。'}</div></div>
        </div>

        <div style="text-align:center;margin-top:6px;font-size:11px;color:#a0a0b8;flex-shrink:0">
          ${isList ? '点击「分析此页」可手动生成摘要与术语' : (isZh ? '摘要与术语自动缓存，刷新后可直接读取' : '译文与摘要自动缓存，刷新后可直接读取')}
        </div>
      </div>
    `;

    document.body.appendChild(ball);
    document.body.appendChild(panel);

    // 点击交互
    setupToggle(ball, panel);

    if (!isZh && !isList) {
      document.getElementById('tbit-btn-all').addEventListener('click', () => run(true));
      document.getElementById('tbit-btn-restore').addEventListener('click', restorePage);

      const inlineBtn = document.getElementById('tbit-mode-inline');
      const hoverBtn = document.getElementById('tbit-mode-hover');
      inlineBtn.addEventListener('click', () => switchMode('inline', inlineBtn, hoverBtn));
      hoverBtn.addEventListener('click', () => switchMode('hover', hoverBtn, inlineBtn));
    }

    // 列表页手动分析按钮
    if (isList) {
      const analyzeBtn = document.getElementById('tbit-btn-analyze');
      if (analyzeBtn) {
        analyzeBtn.addEventListener('click', () => {
          setProgress('正在分析…', 'ready');
          summarize();
        });
      }
    }

    // 关闭按钮
    const closeBtn = document.getElementById('tbit-btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.remove('tbit-open');
      });
    }

    // 点击面板外部关闭面板（排除球和面板自身）
    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('tbit-open')) return;
      if (panel.contains(e.target)) return;
      if (e.target === ball || ball.contains(e.target)) return;
      panel.classList.remove('tbit-open');
    });

    // ESC 键关闭面板
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('tbit-open')) {
        panel.classList.remove('tbit-open');
      }
    });

    STATE.activated = true;

  }

  function switchMode(mode, activeBtn, otherBtn) {
    if (STATE.mode === mode) return;
    STATE.mode = mode;
    activeBtn.classList.add('tbit-active');
    otherBtn.classList.remove('tbit-active');
    rebuildInlineFromCache();
    setProgress(mode === 'inline' ? '已切换为对照模式' : '已切换为悬停模式', 'ready');
  }

  // ------------------------------------------------------------------
  // 滚动惰性翻译：滚到新区域自动翻译（节流）
  // ------------------------------------------------------------------

  let scrollTimer = null;
  function setupScrollLazy() {
    window.addEventListener('scroll', () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        if (!STATE.running && STATE.activated) run(false);
      }, 800);
    }, { passive: true });
  }

  // ------------------------------------------------------------------
  // 动态内容监听：SPA 页面新增段落自动纳入
  // ------------------------------------------------------------------

  function setupObserver() {
    if (STATE.observer) STATE.observer.disconnect();
    let debounce = null;
    STATE.observer = new MutationObserver(() => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        if (!STATE.running) {
          const fresh = read();
          const newParas = fresh.filter(p => !STATE.paras.some(ep => ep.el === p.el));
          if (newParas.length) STATE.paras.push(...newParas);
        }
      }, 1500);
    });
    STATE.observer.observe(document.body, { childList: true, subtree: true });
  }

  // ------------------------------------------------------------------
  // 划词翻译
  // ------------------------------------------------------------------

  let selBar = null, selResult = null;

  function setupSelectionTranslate() {
    document.addEventListener('mouseup', onSelMouseUp);
    document.addEventListener('selectionchange', () => {
      // 选区清空时自动隐藏工具条
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) hideSelUI();
    });
    // 滚动/resize 时隐藏
    window.addEventListener('scroll', hideSelUI, { passive: true });
    window.addEventListener('resize', hideSelUI);
  }

  function onSelMouseUp(e) {
    // 避免在面板/球/工具条自身内触发
    if (e.target && (e.target.closest && e.target.closest('.tbit-sel-bar, .tbit-sel-result'))) return;

    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { hideSelUI(); return; }

    const text = sel.toString().trim();
    if (text.length < 2) { hideSelUI(); return; }

    // 检查选区是否完全位于球或面板内部
    const anchor = sel.anchorNode;
    const focus = sel.focusNode;
    if (anchor && anchor.parentElement) {
      const el = anchor.parentElement.closest('#tbit-ball, #tbit-panel, .tbit-sel-bar, .tbit-sel-result');
      if (el) { hideSelUI(); return; }
    }
    if (focus && focus.parentElement && focus !== anchor) {
      const el = focus.parentElement.closest('#tbit-ball, #tbit-panel, .tbit-sel-bar, .tbit-sel-result');
      if (el) { hideSelUI(); return; }
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) { hideSelUI(); return; }

    showSelToolbar(text, rect);
  }

  function showSelToolbar(text, rect) {
    hideSelResult();
    if (selBar) selBar.remove();

    selBar = document.createElement('div');
    selBar.className = 'tbit-sel-bar';
    selBar.innerHTML = `
      <button class="tbit-sel-btn" id="tbit-sel-translate">译</button>
      <button class="tbit-sel-close" id="tbit-sel-close" title="关闭">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
      </button>
    `;
    document.body.appendChild(selBar);

    // 定位：选区上方居中，边界保护
    const barRect = selBar.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - barRect.width / 2;
    let top = rect.top - barRect.height - 8;
    const vw = window.innerWidth;
    if (left < 6) left = 6;
    if (left + barRect.width > vw - 6) left = vw - barRect.width - 6;
    if (top < 6) top = rect.bottom + 8;
    selBar.style.left = left + 'px';
    selBar.style.top = top + 'px';

    document.getElementById('tbit-sel-translate').addEventListener('click', () => doSelTranslate(text, rect));
    document.getElementById('tbit-sel-close').addEventListener('click', hideSelUI);
  }

  function hideSelUI() {
    hideSelToolbar();
    hideSelResult();
  }
  function hideSelToolbar() {
    if (selBar) { selBar.remove(); selBar = null; }
  }
  function hideSelResult() {
    if (selResult) { selResult.remove(); selResult = null; }
  }

  async function doSelTranslate(text, rect) {
    const btn = document.getElementById('tbit-sel-translate');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    try {
      const prompt = `将以下文本翻译成中文，只返回译文，不要解释：\n\n${text}`;
      const translation = await LLMBridge.chat(prompt);
      showSelResult(text, translation, rect);
    } catch (e) {
      showSelResult(text, '翻译失败，请重试', rect);
    } finally {
      hideSelToolbar();
    }
  }

  function showSelResult(original, translation, rect) {
    hideSelResult();
    selResult = document.createElement('div');
    selResult.className = 'tbit-sel-result';
    // 截断过长原文用于展示
    const displayOriginal = original.length > 120 ? original.slice(0, 120) + '…' : original;
    selResult.innerHTML = `
      <div style="color:#8b8ba7;font-size:12px;margin-bottom:6px">原文</div>
      <div style="margin-bottom:10px">${escapeHtml(displayOriginal)}</div>
      <div style="color:#8b8ba7;font-size:12px;margin-bottom:6px">译文</div>
      <div style="color:#1e1e2e;font-weight:500">${escapeHtml(translation)}</div>
      <div class="tbit-sel-actions">
        <button id="tbit-sel-copy">复制译文</button>
        <button class="tbit-primary" id="tbit-sel-addterm">加入术语表</button>
        <button id="tbit-sel-dismiss">关闭</button>
      </div>
    `;
    document.body.appendChild(selResult);

    // 定位：选区下方居中
    const resRect = selResult.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - resRect.width / 2;
    let top = rect.bottom + 10;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left < 6) left = 6;
    if (left + resRect.width > vw - 6) left = vw - resRect.width - 6;
    if (top + resRect.height > vh - 6) top = rect.top - resRect.height - 10;
    if (top < 6) top = 6;
    selResult.style.left = left + 'px';
    selResult.style.top = top + 'px';

    document.getElementById('tbit-sel-dismiss').addEventListener('click', hideSelResult);
    document.getElementById('tbit-sel-copy').addEventListener('click', () => {
      navigator.clipboard.writeText(translation).catch(() => {});
      document.getElementById('tbit-sel-copy').textContent = '已复制';
      setTimeout(() => { const b = document.getElementById('tbit-sel-copy'); if (b) b.textContent = '复制译文'; }, 1200);
    });
    document.getElementById('tbit-sel-addterm').addEventListener('click', () => {
      const term = original.slice(0, 60);
      const explain = translation.slice(0, 200);
      STATE.terms.push({ term, explain });
      renderTermsPanel();
      document.getElementById('tbit-sel-addterm').textContent = '已加入';
      setTimeout(() => { const b = document.getElementById('tbit-sel-addterm'); if (b) b.textContent = '加入术语表'; }, 1200);
    });
  }

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ------------------------------------------------------------------
  // 入口
  // ------------------------------------------------------------------

  function main() {
    if (!hasContent()) return; // 正文太少时静默退出
    const lang = detectLang();
    const isZh = lang === 'zh';
    const pageType = detectPageType();
    const isList = pageType === 'list';

    const start = () => {
      injectStyles();
      injectUI(isZh, pageType); // 中文页面隐藏翻译按钮
      renderTermsPanel();
      setupTermPopup(); // 术语悬浮弹窗：中英文通用

      if (isList) {
        // 列表页：不自动执行，等用户手动点击「分析此页」
        setProgress('当前为列表页，点击「分析此页」可手动生成摘要', 'ready');
        return;
      }

      summarize(); // 文章页：中英文都生成摘要 + 术语

      if (!isZh) {
        // 英文页面：额外开启翻译、滚动懒加载、Observer、划词
        setupScrollLazy();
        setupObserver();
        setupSelectionTranslate();
        setProgress('检测到外文页面，正在生成摘要…', 'ready');
        // 延迟自动翻译视口
        setTimeout(() => { if (!STATE.running) run(false); }, 1200);
      } else {
        setProgress('已生成摘要与术语', 'ready');
      }
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }

  // 对外暴露（便于调试与评委测试）
  window.__tbitBilingualReader = {
    run,
    read,
    summarize,
    hasContent,
    detectLang,
    restorePage,
    clearCache,
    state: STATE,
  };

  main();
})();