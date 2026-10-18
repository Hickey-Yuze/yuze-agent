/**
 * ============================================================================
 * 网页转 MD — HTML to Markdown Converter  [v2.0 Modular Architecture]
 * ============================================================================
 *
 * 架构概览 | Architecture Overview
 * ─────────────────────────────────────────────────────────────────────────────
 *  Module 1: CONFIG          配置常量与全局状态
 *  Module 2: MdUtils         Markdown 工具函数集（转义/语言检测）
 *  Module 3: DomUtils        DOM 工具函数集（可见性/排除检测/文本提取）
 *  Module 4: NodeConverter   HTML 节点 → Markdown 片段转换器（核心引擎）
 *  Module 5: ContentExtractor 页面内容提取器（主内容区定位 + 元信息收集）
 *  Module 6: OutputCleaner   输出清洗器（空白行压缩/尾部清理）
 *  Module 7: UIManager       UI 管理器（面板/按钮/拖拽/事件绑定）
 *  Module 8: ExportHelper    导出助手（复制到剪贴板 / 下载 .md 文件）
 *  Entry:    run(args)       主入口：编排上述所有模块
 *
 * 函数索引 | Function Index
 * ─────────────────────────────────────────────────────────────────────────────
 *  函数名                    │ 行号  │ 用途                     │ 模块
 * ───────────────────────────┼───────┼─────────────────────────┼──────────
 *  escapeMd(text)            │  ~68  │ MD 特殊字符转义           │ MdUtils
 *  detectLanguage(codeEl)    │  ~86  │ 从代码元素 class 推断语言 │ MdUtils
 *  getLinkText(el)           │ ~120  │ 提取链接可读文本          │ DomUtils
 *  isExcluded(el)            │ ~133  │ 判断元素是否应被排除      │ DomUtils
 *  isVisible(el)             │ ~149  │ 判断元素是否可见          │ DomUtils
 *  getHeadingLevel(tag)      │ ~161  │ 标签→标题级别映射         │ DomUtils
 *  getTextContent(el)        │ ~170  │ 递归提取可见纯文本        │ DomUtils
 *  convertNode(node,d,p)     │ ~188  │ 单节点→MD（调度中心）     │ NodeConverter
 *  convertChildren(p,d)      │ ~275  │ 子节点批量转换            │ NodeConverter
 *  convertList(el,d,b)       │ ~286  │ 列表元素→MD              │ NodeConverter
 *  convertTable(el,d)        │ ~320  │ 表格元素→MD              │ NodeConverter
 *  findRootEl(selector)      │ ~362  │ 定位页面主内容根元素      │ ContentExtractor
 *  extractMetaInfo()         │ ~385  │ 收集页面元信息            │ ContentExtractor
 *  convertPageToMarkdown()   │ ~415  │ 完整页面→MD（编排入口）   │ ContentExtractor
 *  cleanOutput(md)           │ ~465  │ 清洗 MD 输出             │ OutputCleaner
 *  buildPanelHTML()          │ ~485  │ 构建 UI 面板 DOM         │ UIManager
 *  createPanel()             │ ~580  │ 创建并挂载面板           │ UIManager
 *  removePanel()             │ ~600  │ 移除面板和按钮           │ UIManager
 *  makeDraggable(panel,h)    │ ~612  │ 使面板可拖拽             │ UIManager
 *  showToast(panel,msg)      │ ~645  │ 显示 Toast 提示          │ UIManager
 *  bindEvents(panel)         │ ~658  │ 绑定面板内所有交互事件    │ UIManager
 *  createToggleButton()      │ ~785  │ 创建悬浮切换按钮         │ UIManager
 *  copyToClipboard(text)     │ ~830  │ 复制文本到剪贴板         │ ExportHelper
 *  downloadAsMD(text,name)   │ ~852  │ 下载为 .md 文件          │ ExportHelper
 *  run(args)                 │ ~885  │ 主入口函数               │ Entry
 * ============================================================================
 */

async function run(args) {
  // =========================================================================
  // Module 1: CONFIG — 配置常量与全局状态
  // =========================================================================
  /**
   * 全局配置对象。
   * 用途：集中管理所有 UI ID、转换参数、排除选择器等常量，避免魔法值散落各处。
   * 行为：返回冻结的配置字面量；运行时不应修改。
   * 输入：无（模块级常量）。
   * 输出：{Object} 不可变配置。
   * 已知限制：excludeSelectors 中无效 CSS 选择器会被 try-catch 吞掉。
   * 验证方法：CONFIG.panelId / CONFIG.buttonId 在 DOM 中唯一存在。
   */
  const CONFIG = Object.freeze({
    panelId: 'html2md-panel',
    buttonId: 'html2md-toggle-btn',
    maxDepth: 50,
    /** @type {string[]} 应从转换中排除的 CSS 选择器列表（导航栏/广告/侧边栏等噪音） */
    excludeSelectors: [
      'script', 'style', 'noscript', 'svg', 'canvas',
      '[role="navigation"]', 'nav', 'header', 'footer',
      '.sidebar', '.nav', '.menu', '.toolbar', '.ad', '.ads',
      '#comment', '#comments', '.comment', '.comments',
      '.related', '.recommend', '.share', '.social'
    ],
    /** 自动检测主内容区域的候选选择器（按优先级降序排列） */
    contentSelectors: [
      '[role="main"]', 'main', 'article',
      '#content', '#main',
      '.content', '.main-content', '.article',
      '.post-content', '.entry-content', '.markdown-body'
    ],
    /** 代码语言检测映射表：class 关键词 → 语言标识 */
    languageMap: [
      { pattern: /(?:language|lang)-(\w+)/, group: 1 },
      { pattern: /javascript|js/, result: 'javascript' },
      { pattern: /typescript|ts/, result: 'typescript' },
      { pattern: /python|py/, result: 'python' },
      { pattern: /java/, result: 'java' },
      { pattern: /css/, result: 'css' },
      { pattern: /html/, result: 'html' },
      { pattern: /json/, result: 'json' },
      { pattern: /bash|sh|shell|zsh/, result: 'bash' },
      { pattern: /sql/, result: 'sql' },
      { pattern: /go|golang/, result: 'go' },
      { pattern: /rust|rs/, result: 'rust' },
      { pattern: /cpp|c\+\+/, result: 'cpp' },
      { pattern: /c#|csharp/, result: 'csharp' },
      { pattern: /php/, result: 'php' },
      { pattern: /ruby|rb/, result: 'ruby' },
      { pattern: /swift/, result: 'swift' },
      { pattern: /kotlin|kt/, result: 'kotlin' },
      { pattern: /yaml|yml/, result: 'yaml' },
      { pattern: /xml/, result: 'xml' },
      { pattern: /markdown|md/, result: 'markdown' }
    ]
  });

  /**
   * 内联标签集合：这些标签不产生块级结构，仅透传子节点内容。
   * 用途：在 convertNode 的 default 分支中快速判断是否应直接递归子节点。
   */
  const INLINE_TAGS = new Set([
    'A','STRONG','B','EM','I','MARK','DEL','S','U',
    'SUB','SUP','SMALL','Q','ABBR','CITE','DFN','TIME',
    'VAR','CODE','SPAN','FONT'
  ]);

  // =========================================================================
  // Module 2: MdUtils — Markdown 工具函数集
  // =========================================================================

  /**
   * 对字符串进行 Markdown 特殊字符转义。
   * 用途：在行内代码、链接文本等需要原样显示的场景中防止 MD 语意污染。
   * 行为：依次转义 \ ` * _ [ ] # 共 7 种字符；空输入返回空串。
   * 输入：text {string} 原始文本。
   * 输出：{string} 转义后安全文本。
   * 已知限制：不在代码块内的文本均会被转义，可能导致部分合法 MD 格式丢失；
   *         调用方需确保仅在"需要纯文本"的位置调用此函数。
   * 验证方法：escapeMd('hello*world') → 'hello\\*world'
   * 最近变更：v2.0 初版建立
   */
  function escapeMd(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/]/g, '\\]')
      .replace(/#/g, '\\#');
  }

  /**
   * 从 <code> 元素的 class 属性推断编程语言标识。
   * 用途：为 ``` 代码块生成正确的语言标注（语法高亮提示）。
   * 行为：先匹配 "language-xxx" / "lang-xxx" 规范格式；再回退到关键词模糊匹配；
   *         均未命中则返回空串。
   * 输入：codeEl {HTMLElement} <code> DOM 元素。
   * 输出：{string} 小写语言标识符，如 'javascript'、'python'；无匹配返回 ''。
   * 已知限制：依赖站点约定的 class 命名规范，非标准命名可能无法识别；
   *         不检查实际代码内容，纯靠 class 推断。
   * 验证方法：<code class="language-python"> → 'python'
   *          <code class="js-highlight"> → 'javascript'
   * 最近变更：v2.0 重构为数据驱动（CONFIG.languageMap），消除 if-else 链
   */
  function detectLanguage(codeEl) {
    const cls = (codeEl.className || '').toLowerCase();
    for (const entry of CONFIG.languageMap) {
      if (entry.group !== undefined) {
        const m = cls.match(entry.pattern);
        if (m) return m[entry.group].toLowerCase();
      } else if (entry.pattern.test(cls)) {
        return entry.result;
      }
    }
    return '';
  }

  // =========================================================================
  // Module 3: DomUtils — DOM 工具函数集
  // =========================================================================

  /**
   * 提取 <a> 元素的可读链接文本。
   * 用途：当链接内部只有图片而无文字时，使用图片 alt/title 作为 fallback 文本。
   * 行为：若 el.textContent 为空且包含 <img>，则取 img.alt > img.title > 'image'；
   *         否则返回 el.textContent.trim()。
   * 输入：el {HTMLElement} <a> 元素。
   * 输出：{string} 可读链接文本。
   * 已知限制：多图链接只取第一张 img 属性。
   * 验证方法：<a><img alt="logo"></a> → 'logo'
   * 最近变更：v2.0 初版建立
   */
  function getLinkText(el) {
    const img = el.querySelector('img');
    if (img && !el.textContent.trim()) {
      return (img.getAttribute('alt') || img.getAttribute('title') || 'image').trim();
    }
    return el.textContent.trim();
  }

  /**
   * 判断元素是否属于"应排除"的噪音区域。
   * 用途：在遍历 DOM 时跳过导航栏、广告、评论区等非正文内容。
   * 行为：逐一测试 CONFIG.excludeSelectors 中的每个选择器；
   *         无效选择器通过 try-catch 静默跳过。
   * 输入：el {Element|null} 待检测元素。
   * 输出：{boolean} true=应排除/false=保留。
   * 已知限制：非 Element 节点（如 TextNode）直接返回 false；
   *         matches() 在部分旧浏览器不支持伪类选择器。
   * 验证方法：isExcluded(document.querySelector('nav')) → true
   * 最近变更：v2.0 初版建立
   */
  function isExcluded(el) {
    if (!el || el.nodeType !== 1) return false;
    for (const sel of CONFIG.excludeSelectors) {
      try {
        if (el.matches && el.matches(sel)) return true;
      } catch (_e) { /* 忽略无效选择器 */ }
    }
    return false;
  }

  /**
   * 通过计算样式判断元素是否可见。
   * 用途：过滤 display:none / visibility:hidden / opacity:0 等隐藏元素。
   * 行为：读取 getComputedStyle 检查 4 项可见性指标；offsetParent 为 null 时判定不可见。
   * 输入：el {Element|null} 待检测元素。
   * 输出：{boolean} true=可见/false=隐藏。
   * 已知限制：position:fixed 且脱离文档流的元素 offsetParent 为 null 但实际可见，
   *         此场景会产生误判；当前版本暂不做特殊处理。
   * 验证方法：isVisible(document.body) → true
   * 最近变更：v2.0 初版建立
   */
  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    return s.display !== 'none' &&
           s.visibility !== 'hidden' &&
           s.opacity !== '0' &&
           el.offsetParent !== null;
  }

  /**
   * HTML 标签名 → Markdown 标题级别（1-6）映射。
   * 用途：将 H1~H6 标签转换为对应数量的 # 前缀。
   * 行为：查表返回数字；未知标签返回 0。
   * 输入：tag {string} 大写标签名，如 'H2'。
   * 输出：{number} 1-6 的整数，或 0 表示非标题标签。
   * 已知限制：仅支持标准 H1-H6。
   * 验证方法：getHeadingLevel('H3') → 3
   * 最近变更：v2.0 初版建立
   */
  function getHeadingLevel(tag) {
    const map = { H1:1, H2:2, H3:3, H4:4, H5:5, H6:6 };
    return map[tag] || 0;
  }

  /**
   * 递归提取元素的可见纯文本（跳过被排除的子树）。
   * 用途：获取标题/链接等场景下的纯文字内容，不含嵌套标签噪声。
   * 行为：深度优先遍历子节点；TextNode 直接拼接；Element 递归进入（排除项跳过）。
   * 输入：el {Element} 根元素。
   * 输出：{string} 拼接后的纯文本（保留原始空白）。
   * 已知限制：不折叠空白——调用方需自行 trim。
   * 验证方法：getTextContent(<p>Hello <b>World</b></p>) → 'Hello World'
   * 最近变更：v2.0 初版建立
   */
  function getTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        text += node.textContent;
      } else if (node.nodeType === 1 && !isExcluded(node)) {
        text += getTextContent(node);
      }
    }
    return text;
  }

  // =========================================================================
  // Module 4: NodeConverter — HTML 节点 → Markdown 片段转换器（核心引擎）
  // =========================================================================

  /**
   * 将单个 DOM 节点转换为对应的 Markdown 字符串片段。
   * 用途：核心递归转换函数，是整个 HTML→MD 引擎的调度中心。
   * 行为：
   *   1. 超过最大深度 → 返回空串（防止无限递归）。
   *   2. TextNode → 折叠空白后返回（<pre> 内除外）。
   *   3. 非 Element → 返回空串。
   *   4. 排除元素 → 返回空串。
   *   5. 按 tag 名分派到具体转换逻辑（heading/p/list/table/code/img/a/inline...）。
   * 输入：
   *   node   {Node}    当前待转换节点
   *   depth  {number}  当前递归深度（默认 0）
   *   inPre  {boolean} 是否处于 <pre> 上下文（默认 false）
   * 输出：{string} 该节点及其后代产生的 Markdown 片段。
   * 已知限制：
   *   - 不处理 Shadow DOM / iframe 内容；
   *   - <video>/<audio>/<iframe> 等富媒体标签会被当作未知标签透传子节点；
   *   - 表格嵌套（table 内含 table）仅转换最外层结构。
   * 验证方法：对已知 HTML 片段执行转换，人工校验输出 MD 格式正确性。
   * 最近变更：v2.0 将 switch-case 分支逻辑保持不变，增加 JSDoc 文档化
   */
  function convertNode(node, depth = 0, inPre = false) {
    if (depth > CONFIG.maxDepth) return '';
    if (!node) return '';

    // --- Text Node ---
    if (node.nodeType === 3) {
      let text = node.textContent || '';
      if (inPre) return text;
      return text.replace(/[ \t\r\n]+/g, ' ');
    }

    // --- Non-Element ---
    if (node.nodeType !== 1) return '';

    const tag = (node.tagName || '').toUpperCase();
    const el = node;

    // --- Skip excluded ---
    if (isExcluded(el)) return '';

    // ---- Block-level dispatch ----
    switch (tag) {

      case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': {
        const level = getHeadingLevel(tag);
        const text = getTextContent(el).trim();
        if (!text) return '';
        return '\n\n' + '#'.repeat(level) + ' ' + text + '\n\n';
      }

      case 'P': {
        const inner = convertChildren(el, depth + 1).trim();
        if (!inner) return '';
        return '\n\n' + inner + '\n\n';
      }

      case 'BR':
        return '\n';

      case 'HR':
        return '\n\n---\n\n';

      case 'BLOCKQUOTE': {
        const inner = convertChildren(el, depth + 1).trim();
        if (!inner) return '';
        const lines = inner.split('\n');
        return '\n\n' + lines.map(l => '> ' + l).join('\n') + '\n\n';
      }

      case 'PRE': {
        const codeEl = el.querySelector('code');
        const rawText = codeEl ? codeEl.textContent : el.textContent;
        const lang = codeEl ? detectLanguage(codeEl) : '';
        const body = rawText.replace(/^\n+/, '').replace(/\n+$/, '');
        return '\n\n```' + lang + '\n' + body + '\n```\n\n';
      }

      case 'CODE': {
        if (el.closest('pre')) return el.textContent; // 块级代码由 PRE 处理
        return '`' + escapeMd(el.textContent) + '`';
      }

      case 'UL':
        return convertList(el, depth, '- ');

      case 'OL':
        return convertList(el, depth, null); // null → 编号列表

      case 'LI':
        return convertChildren(el, depth + 1).trim();

      case 'IMG': {
        const src = el.getAttribute('src') || '';
        if (!src) return '';
        const alt  = el.getAttribute('alt')  || 'image';
        const title = el.getAttribute('title') ? ' "' + el.getAttribute('title') + '"' : '';
        return '![' + escapeMd(alt) + '](' + src + title + ')';
      }

      case 'A': {
        const href = el.getAttribute('href') || '';
        const linkText = getLinkText(el);
        if (!href) return linkText;
        return '[' + escapeMd(linkText) + '](' + href + ')';
      }

      case 'STRONG': case 'B':
        return '**' + convertChildren(el, depth + 1).trim() + '**';

      case 'EM': case 'I':
        return '*' + convertChildren(el, depth + 1).trim() + '*';

      case 'DEL': case 'S':
        return '~~' + convertChildren(el, depth + 1).trim() + '~~';

      case 'TABLE':
        return convertTable(el, depth);

      // --- Structural containers: transparently recurse children ---
      case 'DIV': case 'SECTION': case 'ARTICLE': case 'MAIN':
      case 'ASIDE': case 'FIGURE': case 'DETAILS': case 'SUMMARY':
        return convertChildren(el, depth + 1);

      default:
        // Inline or unknown tags → just process children
        return convertChildren(el, depth + 1);
    }
  }

  /**
   * 批量转换父元素的所有子节点。
   * 用途：供 convertNode 和各类容器处理器调用的通用子节点遍历器。
   * 行为：按 DOM 顺序拼接每个子节点的 convertNode 结果。
   * 输入：parent {Element} 父元素；depth {number} 传递给 convertNode 的深度。
   * 输出：{string} 所有子节点转换结果的拼接。
   * 已知限制：无。
   * 验证方法：convertChildren(<p>A<b>B</b>C</p>, 0) → 'A**B**C'
   * 最近变更：v2.0 初版建立
   */
  function convertChildren(parent, depth) {
    let result = '';
    for (const child of parent.childNodes) {
      result += convertNode(child, depth);
    }
    return result;
  }

  /**
   * 将 <ul> 或 <ol> 列表元素转换为 Markdown 格式。
   * 用途：处理有序/无序列表，包括嵌套列表的正确缩进。
   * 行为：
   *   1. 获取直接子 <li> 元素。
   *   2. 无序列表使用 '-' 前缀；有序列表使用 '1. ' '2. ' ... 编号前缀。
   *   3. 每个 li 的多行内容：首行带前缀，续行缩进 2 空格。
   *   4. 嵌套列表行自动识别并额外缩进。
   * 输入：listEl {Element} <ul> 或 <ol>；depth {number}；bullet {string|null} 前缀。
   * 输出：{string} Markdown 列表文本。
   * 已知限制：
   *   - 深层嵌套（>3 级）缩进可能视觉上不够清晰；
   *   - <li> 内混排多个子列表时缩进计算基于简单启发式。
   * 验证方法：<ul><li>a</li><li>b<ul><li>c</li></ul></li></ul> → 正确嵌套
   * 最近变更：v2.0 初版建立
   */
  function convertList(listEl, depth, bullet) {
    const items = listEl.querySelectorAll(':scope > li');
    if (!items.length) return '';

    let md = '\n\n';
    let num = 1;

    items.forEach((li) => {
      const prefix = bullet ? bullet : (num++ + '. ');
      const inner = convertChildren(li, depth + 1).trim();
      const lines = inner.split('\n');

      md += prefix + lines[0] + '\n';
      for (let j = 1; j < lines.length; j++) {
        const line = lines[j].trim();
        if (!line) { md += '\n'; continue; }
        // 嵌套列表行或普通续行统一缩进
        md += '  ' + line + '\n';
      }
    });

    return md + '\n';
  }

  /**
   * 将 <table> 元素转换为 GFM（GitHub Flavored Markdown）表格。
   * 用途：将 HTML 表格转为管道符分隔的 Markdown 表格。
   * 行为：
   *   1. 解析所有 <tr> 行，每行提取 <td>/<th> 单元格文本。
   *   2. 第一行作为表头，生成分隔行（|---|---|）。
   *   3. 后续行作为数据行；短行补空单元格以对齐列数。
   * 输入：tableEl {Element} <table> 元素；depth {number}。
   * 输出：{string} Markdown 表格文本；空表格返回 ''。
   * 已知限制：
   *   - 不支持 colspan / rowspan（合并单元格会重复出现）；
   *   - 不支持 <thead>/<tbody>/<tfoot> 区分，全部扁平处理；
   *   - 单元格内嵌套表格不会被递归转换。
   * 验证方法：标准 2x3 表格 → 正确的 | header | 分隔 | data | 格式
   * 最近变更：v2.0 初版建立
   */
  function convertTable(tableEl, depth) {
    const rows = tableEl.querySelectorAll(':scope > tbody > tr, :scope > tr');
    if (!rows.length) return '';

    const parseRow = (tr) => {
      const cells = tr.querySelectorAll(':scope > td, :scope > th');
      return Array.from(cells).map(cell =>
        convertChildren(cell, depth + 1).trim().replace(/\n/g, ' ')
      );
    };

    const allRows = Array.from(rows).map(parseRow);
    if (!allRows.length) return '';

    const headers = allRows[0];
    const dataRows = allRows.slice(1);

    let md = '\n\n';
    md += '| ' + headers.join(' | ') + ' |\n';
    md += '| ' + headers.map(() => '---').join(' | ') + ' |\n';

    for (const row of dataRows) {
      while (row.length < headers.length) row.push('');
      md += '| ' + row.slice(0, headers.length).join(' | ') + ' |\n';
    }

    return md + '\n';
  }

  // =========================================================================
  // Module 5: ContentExtractor — 页面内容提取器
  // =========================================================================

  /**
   * 定位页面的主内容根元素。
   * 用途：根据用户指定的选择器或内置候选列表找到最适合转换的内容区域。
   * 行为：
   *   1. 若传入 selector 非空 → querySelector 查找。
   *   2. 否则按 CONFIG.contentSelectors 优先级逐个尝试。
   *   3. 全部未命中 → 回退到 document.body。
   * 输入：selector {string|null} 用户自定义 CSS 选择器。
   * 输出：{Element|null} 找到的根元素。
   * 已知限制：
   *   - 自定义选择器无效时返回 null（调用方需处理）；
   *   - 多个匹配时只取第一个（querySelector 语义）。
   * 验证方法：findRootEl(null) 在典型文章页应返回 <article> 或 main
   * 最近变更：v2.0 将候选列表抽取到 CONFIG.contentSelectors
   */
  function findRootEl(selector) {
    if (selector) {
      return document.querySelector(selector);
    }
    for (const sel of CONFIG.contentSelectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return document.body;
  }

  /**
   * 从页面 <meta> 标签和语义化元素中提取文章元信息。
   * 用途：生成 MD 头部的引用式元数据块（描述/标题/日期/作者）。
   * 行为：依次查询 description meta、og:title meta、<time datetime>、author 元素；
   *         收集所有命中项并以 '> **key**: value' 格式返回数组。
   * 输入：无（读取 document）。
   * 输出：{string[]} 元信息行数组（不含前缀换行）；无命中返回空数组。
   * 已知限制：
   *   - 仅覆盖最常见的 4 种元信息字段；
   *   - 不同站点的 author 选择器差异大，可能漏检。
   * 验证方法：有 meta[name="description"] 的页面 → 至少返回 1 条
   * 最近变更：v2.0 初版建立
   */
  function extractMetaInfo() {
    const lines = [];

    const desc = document.querySelector('meta[name="description"]');
    if (desc && desc.content) lines.push('> **描述**: ' + desc.content);

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && ogTitle.content) lines.push('> **标题**: ' + ogTitle.content);

    const time = document.querySelector('time[datetime]');
    if (time) lines.push('> **日期**: ' + (time.getAttribute('datetime') || time.textContent.trim()));

    const author = document.querySelector('[rel="author"], .author, .byline');
    if (author) lines.push('> **作者**: ' + author.textContent.trim());

    return lines;
  }

  /**
   * 完整页面 → Markdown 的编排入口。
   * 用途：串联 findRootEl + extractMetaInfo + convertNode + cleanOutput，
   *         是外部调用的主转换 API。
   * 行为：
   *   1. 定位根元素（找不到 → 返回错误提示）。
   *   2. 可选：追加页面标题作为 H1。
   *   3. 可选：追加元信息引用块。
   *   4. 对根元素执行递归转换。
   *   5. 可选：清洗输出（去多余空行/尾部空白）。
   * 输入：options {Object}
   *   - selector    {string|null}  自定义根选择器
   *   - includeTitle {boolean}     是否包含页面标题（默认 true）
   *   - includeMeta  {boolean}     是否包含元信息（默认 true）
   *   - cleanUp      {boolean}     是否清洗输出（默认 true）
   * 输出：{string} 完整 Markdown 文档文本。
   * 已知限制：大型页面（DOM 节点 >10000）可能导致栈深度接近 CONFIG.maxDepth 上限。
   * 验证方法：run 后检查 output textarea 内容格式正确性
   * 最近变更：v2.0 拆分为 findRootEl / extractMetaInfo / cleanOutput 子函数
   */
  function convertPageToMarkdown(options = {}) {
    const {
      selector = null,
      includeTitle = true,
      includeMeta = true,
      cleanUp = true
    } = options;

    const rootEl = findRootEl(selector);
    if (!rootEl) return '// No content found';

    let md = '';

    // --- Title ---
    if (includeTitle) {
      const title = (document.title || '').trim();
      if (title) md += '# ' + title + '\n\n';
    }

    // --- Meta info ---
    if (includeMeta) {
      const metaLines = extractMetaInfo();
      if (metaLines.length > 0) {
        md += metaLines.join('\n') + '\n\n';
      }
    }

    // --- Main content conversion ---
    md += convertNode(rootEl, 0);

    // --- Post-processing cleanup ---
    if (cleanUp) {
      md = cleanOutput(md);
    }

    return md;
  }

  // =========================================================================
  // Module 6: OutputCleaner — 输出清洗器
  // =========================================================================

  /**
   * 清洗原始 Markdown 输出，使其更整洁。
   * 用途：去除递归转换过程中产生的多余空行和尾部空白。
   * 行为：
   *   1. 将连续 3 个及以上换行压缩为 2 个（即最多一个空行间隔）。
   *   2. 去除每行末尾空白字符。
   *   3. 去除首尾空白。
   * 输入：md {string} 原始 Markdown 文本。
   * 输出：{string} 清洗后的 Markdown 文本。
   * 已知限制：
   *   - 不修复缩进不一致问题；
   *   - 不处理首尾多余的 # 标题层级。
   * 验证方法：cleanOutput('a\n\n\n\nb') → 'a\n\nb'
   * 最近变更：v2.0 从 convertPageToMarkdown 内联逻辑中提取为独立函数
   */
  function cleanOutput(md) {
    // 压缩多余空行（>2 个连续换行 → 2 个）
    md = md.replace(/\n{3,}/g, '\n\n');
    // 去除每行尾部空白
    md = md.split('\n').map(line => line.trimEnd()).join('\n');
    // 整体 trim
    return md.trim();
  }

  // =========================================================================
  // Module 7: UIManager — UI 管理器（面板 / 按钮 / 拖拽 / 事件）
  // =========================================================================

  /**
   * 构建浮动面板的完整 HTML 字符串（含内联样式）。
   * 用途：一次性生成面板 DOM 结构，避免运行时多次字符串拼接。
   * 行为：返回包含 <style> + 面板布局（头部/主体/底部）的 HTML 模板字符串。
   * 输入：无（读取 CONFIG.panelId）。
   * 输出：{string} 完整 innerHTML 字符串。
   * 已知限制：样式硬编码在 JS 中，后续主题化需修改此处。
   * 验证方法：innerHTML 赋值后面板正确渲染
   * 最近变更：v2.0 从 createPanel 中提取为独立函数，便于阅读和维护
   */
  function buildPanelHTML() {
    const pid = CONFIG.panelId;
    return `
      <style>
        #${pid} {
          position: fixed; top: 60px; right: 20px;
          width: 420px; max-height: 70vh;
          background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.08);
          z-index: 2147483647;
          font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
          display: flex; flex-direction: column; overflow: hidden;
          transition: transform .25s ease, opacity .25s ease;
          transform-origin: top right;
        }
        #${pid}.collapsed { width: auto; max-height: none; }
        #${pid}.collapsed .h2md-body,
        #${pid}.collapsed .h2md-footer { display: none; }
        #${pid}-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color: #fff; cursor: move; user-select: none; flex-shrink: 0;
        }
        #${pid}-header h3 { margin: 0; font-size: 15px; font-weight: 600;
          display: flex; align-items: center; gap: 8px; }
        #${pid}-header h3 span.icon { font-size: 18px; }
        #${pid}-close {
          background: rgba(255,255,255,.2); border: none; color: #fff;
          width: 28px; height: 28px; border-radius: 6px; cursor: pointer;
          font-size: 16px; display: flex; align-items: center; justify-content: center;
          transition: background .15s;
        }
        #${pid}-close:hover { background: rgba(255,255,255,.35); }
        .h2md-body { padding: 14px 16px; overflow-y: auto; flex: 1; min-height: 0; }
        .h2md-options { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
        .h2md-option-row { display: flex; align-items: center; justify-content: space-between;
          font-size: 13px; color: #475569; }
        .h2md-option-row label { cursor: pointer; display: flex; align-items: center; gap: 6px; }
        .h2md-selector-input {
          width: 100%; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 8px;
          font-size: 13px; outline: none; transition: border-color .15s;
          box-sizing: border-box; font-family: inherit;
        }
        .h2md-selector-input:focus { border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,.15); }
        .h2md-btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
        .h2md-btn {
          padding: 9px 16px; border: none; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all .15s; display: flex; align-items: center; gap: 5px;
          font-family: inherit;
        }
        .h2md-btn-primary {
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); color: #fff;
          flex: 1; min-width: 0; justify-content: center;
        }
        .h2md-btn-primary:hover { transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102,126,234,.35); }
        .h2md-btn-primary:active { transform: translateY(0); }
        .h2md-btn-secondary { background: #f1f5f9; color: #475569; }
        .h2md-btn-secondary:hover { background: #e2e8f0; }
        .h2md-output-area { margin-top: 12px; }
        .h2md-output-label { font-size: 12px; font-weight: 600; color: #64748b;
          margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
        .h2md-output-stats { font-weight: 400; font-size: 11px; color: #94a3b8; }
        .h2md-textarea {
          width: 100%; height: 200px; padding: 10px 12px;
          border: 1px solid #e2e8f0; border-radius: 8px;
          font-size: 12.5px; line-height: 1.6; resize: vertical;
          font-family: "SF Mono","Fira Code","Cascadia Code",Consolas,monospace;
          outline: none; box-sizing: border-box; background: #fafbfc; color: #334155;
          tab-size: 2;
        }
        .h2md-textarea:focus { border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102,126,234,.1); background: #fff; }
        .h2md-footer {
          padding: 12px 16px; border-top: 1px solid #f1f5f9;
          display: flex; gap: 8px; flex-shrink: 0; background: #fafbfc;
        }
        .h2md-footer .h2md-btn { flex: 1; justify-content: center;
          padding: 8px 12px; font-size: 12px; }
        .h2md-toast {
          position: absolute; top: 12px; left: 50%;
          transform: translateX(-50%) translateY(-20px);
          background: #10b981; color: #fff; padding: 6px 16px; border-radius: 20px;
          font-size: 12px; font-weight: 500; opacity: 0; transition: all .3s ease;
          pointer-events: none; white-space: nowrap; z-index: 10;
        }
        .h2md-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .h2md-batch-info {
          background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px;
          padding: 10px 12px; margin-top: 10px; font-size: 12px; color: #166534;
          display: none;
        }
        .h2md-batch-info.show { display: block; }
      </style>
      <div class="h2md-toast" id="${pid}-toast"></div>
      <div id="${pid}-header">
        <h3><span class="icon">📝</span> 网页转 MD</h3>
        <button id="${pid}-close" title="关闭面板">✕</button>
      </div>
      <div class="h2md-body">
        <div class="h2md-options">
          <div class="h2md-option-row">
            <label><input type="checkbox" id="h2md-opt-title" checked> 包含页面标题</label>
            <label><input type="checkbox" id="h2md-opt-meta" checked> 包含元信息</label>
          </div>
          <input type="text" class="h2md-selector-input" id="h2md-selector"
                 placeholder="自定义内容选择器（可选，留空自动检测）" value="">
        </div>
        <div class="h2md-btn-group">
          <button class="h2md-btn h2md-btn-primary" id="h2md-convert">🔄 转换为 Markdown</button>
          <button class="h2md-btn h2md-btn-secondary" id="h2md-batch">📦 批量转换</button>
        </div>
        <div class="h2md-output-area">
          <div class="h2md-output-label">
            <span>📄 Markdown 输出</span>
            <span class="h2md-output-stats" id="h2md-stats"></span>
          </div>
          <textarea class="h2md-textarea" id="h2md-output"
                    placeholder="点击「转换为 Markdown」按钮开始转换..."
                    spellcheck="false"></textarea>
          <div class="h2md-batch-info" id="h2md-batch-info"></div>
        </div>
      </div>
      <div class="h2md-footer">
        <button class="h2md-btn h2md-btn-primary" id="h2md-copy">📋 复制</button>
        <button class="h2md-btn h2md-btn-secondary" id="h2md-download">💾 下载 .md</button>
      </div>
    `;
  }

  /**
   * 创建并挂载浮动操作面板到 document.body。
   * 用途：构建完整的用户交互界面（选项/按钮/输出区/操作栏）。
   * 行为：
   *   1. 先移除已有面板（防重复）。
   *   2. 创建 <div> 并注入 buildPanelHTML() 生成的结构。
   *   3. 挂载到 body。
   *   4. 绑定拖拽、事件监听。
   *   5. 入场动画（scale+opacity）。
   * 输入：无。
   * 输出：{HTMLElement} 面板 DOM 元素引用。
   * 已知限制：每次调用都会重建完整面板（含事件重绑），不适合高频调用。
   * 验证方法：createPanel() 后 document.getElementById(CONFIG.panelId) 存在
   * 最近变更：v2.0 HTML 模板抽离至 buildPanelHTML()
   */
  function createPanel() {
    removePanel();

    const panel = document.createElement('div');
    panel.id = CONFIG.panelId;
    panel.innerHTML = buildPanelHTML();
    document.body.appendChild(panel);

    makeDraggable(panel, panel.querySelector('#' + CONFIG.panelId + '-header'));
    bindEvents(panel);

    requestAnimationFrame(() => {
      panel.style.transform = 'scale(1)';
      panel.style.opacity = '1';
    });
    return panel;
  }

  /**
   * 移除面板 DOM 和悬浮按钮 DOM。
   * 用途：清理注入的 UI 元素，避免残留。
   * 行为：分别 querySelector 并 remove 两个 ID 对应的元素。
   * 输入：无。
   * 输出：void（副作用：DOM 变更）。
   * 已知限制：无。
   * 验证方法：removePanel() 后两元素均不存在于 DOM
   * 最近变更：v2.0 初版建立
   */
  function removePanel() {
    const existing = document.getElementById(CONFIG.panelId);
    if (existing) existing.remove();
    const btn = document.getElementById(CONFIG.buttonId);
    if (btn) btn.remove();
  }

  /**
   * 使面板可通过标题栏拖拽移动。
   * 用途：提升 UX，允许用户将面板拖到不妨碍阅读的位置。
   * 行为：
   *   mousedown 记录偏移量 → mousemove 更新 left/top（约束在视口内）→ mouseup 结束。
   *   点击按钮时不触发拖拽（e.target.closest('button') 守卫）。
   * 输入：panel {HTMLElement} 面板元素；handle {HTMLElement} 拖拽手柄元素。
   * 输出：void（副作用：注册 3 个事件监听器）。
   * 已知限制：
   *   - 不支持触摸屏 touch 事件；
   *   - 拖拽期间若面板尺寸变化（如 textarea 展开），坐标可能短暂越界。
   * 验证方法：拖拽后面板 left/top 值在视口范围内
   * 最近变更：v2.0 初版建立
   */
  function makeDraggable(panel, handle) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      const rect = panel.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      let x = e.clientX - offsetX;
      let y = e.clientY - offsetY;
      x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
      y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
      panel.style.left = x + 'px';
      panel.style.top = y + 'px';
      panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  /**
   * 在面板顶部显示 Toast 提示消息（2秒后自动消失）。
   * 用途：向用户提供操作结果反馈（成功/失败/警告）。
   * 行为：设置文本 → addClass('show') → 2秒后 removeClass('show')。
   * 输入：panel {HTMLElement} 面板元素；msg {string} 显示文本。
   * 输出：void（副作用：DOM class 变更）。
   * 已知限制：连续快速调用会覆盖前一条消息（单 toast 实例）。
   * 验证方法：showToast(panel,'ok') → 2秒内可见绿色提示条
   * 最近变更：v2.0 初版建立
   */
  function showToast(panel, msg) {
    const toast = panel.querySelector('#' + CONFIG.panelId + '-toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }

  /**
   * 绑定面板内所有交互事件（关闭/转换/批量/复制/下载）。
   * 用途：集中管理面板的用户交互逻辑，与 UI 构建解耦。
   * 行为：为 5 个按钮/输入组件分别添加 click/input 监听器：
   *   1. 关闭 → 缩小动画 + removePanel()
   *   2. 转换 → 读选项 → convertPageToMarkdown() → 写入 textarea + 统计
   *   3. 批量 → 校验选择器 → queryAll → 逐个 convertNode → 合并输出
   *   4. 复制 → copyToClipboard()
   *   5. 下载 → downloadAsMD()
   * 输入：panel {HTMLElement} 面板元素。
   * 输出：void（副作用：注册事件监听器）。
   * 已知限制：
   *   - 依赖面板内部特定 ID（h2md-output/h2md-stats 等），与 buildPanelHTML 强耦合；
   *   - 重复调用会叠加监听器（但 createPanel 每次重建面板故不会触发）。
   * 验证方法：点击各按钮触发预期行为
   * 最近变更：v2.0 将事件逻辑从 createPanel 内联代码中提取
   */
  function bindEvents(panel) {
    const $ = (sel) => panel.querySelector(sel);
    const output   = $('#h2md-output');
    const stats    = $('#h2md-stats');
    const batchInfo = $('#h2md-batch-info');

    // --- Close ---
    $('#' + CONFIG.panelId + '-close').addEventListener('click', () => {
      panel.style.transform = 'scale(0.9)';
      panel.style.opacity = '0';
      setTimeout(removePanel, 200);
    });

    // --- Convert (single page) ---
    $('#h2md-convert').addEventListener('click', () => {
      const selector    = $('#h2md-selector').value.trim() || null;
      const includeTitle = $('#h2md-opt-title').checked;
      const includeMeta  = $('#h2md-opt-meta').checked;

      try {
        const md = convertPageToMarkdown({ selector, includeTitle, includeMeta });
        output.value = md;
        const chars = md.length;
        const lines = md.split('\n').length;
        stats.textContent = `${chars} 字符 / ${lines} 行`;
        showToast(panel, '✅ 转换完成！');
      } catch (err) {
        output.value = '// 转换错误: ' + err.message;
        stats.textContent = '';
        showToast(panel, '❌ 转换失败');
      }
    });

    // --- Batch convert ---
    $('#h2md-batch').addEventListener('click', () => {
      const selector = $('#h2md-selector').value.trim();
      if (!selector) {
        showToast(panel, '⚠️ 请先输入选择器以批量匹配多个元素');
        return;
      }

      try {
        const elements = document.querySelectorAll(selector);
        if (!elements.length) {
          showToast(panel, `⚠️ 未找到匹配 "${selector}" 的元素`);
          return;
        }

        let batchMd = '';
        elements.forEach((el, idx) => {
          const subMd = convertNode(el, 0);
          if (subMd.trim()) {
            batchMd += `\n\n## 📌 片段 ${idx + 1}\n\n${subMd.trim()}`;
          }
        });

        output.value = batchMd.trim();
        const chars = batchMd.length;
        const lines = batchMd.split('\n').length;
        stats.textContent = `${chars} 字符 / ${lines} 行 / ${elements.length} 个片段`;

        batchInfo.innerHTML =
          `📦 批量转换完成：选择器 <code>${selector}</code> 匹配到 <strong>${elements.length}</strong> 个元素`;
        batchInfo.classList.add('show');

        showToast(panel, `✅ 批量转换 ${elements.length} 个元素`);
      } catch (err) {
        output.value = '// 批量转换错误: ' + err.message;
        showToast(panel, '❌ 批量转换失败');
      }
    });

    // --- Copy ---
    $('#h2md-copy').addEventListener('click', async () => {
      const text = output.value;
      if (!text || text.startsWith('//')) {
        showToast(panel, '⚠️ 没有可复制的内容');
        return;
      }
      await copyToClipboard(text);
      showToast(panel, '📋 已复制到剪贴板！');
    });

    // --- Download ---
    $('#h2md-download').addEventListener('click', () => {
      const text = output.value;
      if (!text || text.startsWith('//')) {
        showToast(panel, '⚠️ 没有可下载的内容');
        return;
      }
      const filename = (document.title || 'page').replace(/[\\/:*?"<>|]/g, '_').trim() + '.md';
      downloadAsMD(text, filename);
      showToast(panel, '💾 已下载 ' + filename);
    });
  }

  /**
   * 创建右下角悬浮圆形切换按钮。
   * 用途：提供常驻入口，用户随时打开/关闭转换面板。
   * 行为：
   *   1. 创建固定定位的圆形 div（渐变背景 + 📝 图标）。
   *   2. click 事件：面板已存在 → 切换显示/销毁；不存在 → createPanel()。
   *   3. 挂载到 body。
   * 输入：无。
   * 输出：{HTMLElement} 按钮 DOM 元素。
   * 已知限制：
   *   - 固定位置可能与页面原有悬浮元素重叠；
   *   - 不支持自定义按钮位置。
   * 验证方法：点击按钮 → 面板出现；再点 → 面板消失
   * 最近变更：v2.0 初版建立
   */
  function createToggleButton() {
    const btn = document.createElement('div');
    btn.id = CONFIG.buttonId;
    btn.innerHTML = `
      <style>
        #${CONFIG.buttonId} {
          position: fixed; bottom: 30px; right: 30px;
          width: 52px; height: 52px;
          background: linear-gradient(135deg,#667eea 0%,#764ba2 100%);
          color: #fff; border: none; border-radius: 50%;
          cursor: pointer; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px;
          box-shadow: 0 4px 16px rgba(102,126,234,.4);
          transition: transform .2s, box-shadow .2s;
          user-select: none;
          font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
        }
        #${CONFIG.buttonId}:hover { transform: scale(1.1);
          box-shadow: 0 6px 24px rgba(102,126,234,.5); }
        #${CONFIG.buttonId}:active { transform: scale(.95); }
      </style>
      📝
    `;
    btn.title = '网页转 MD';

    btn.addEventListener('click', () => {
      const existingPanel = document.getElementById(CONFIG.panelId);
      if (existingPanel) {
        if (existingPanel.style.display === 'none') {
          existingPanel.style.display = '';
          existingPanel.style.transform = 'scale(1)';
          existingPanel.style.opacity = '1';
        } else {
          removePanel();
        }
      } else {
        createPanel();
      }
    });

    document.body.appendChild(btn);
    return btn;
  }

  // =========================================================================
  // Module 8: ExportHelper — 导出助手（复制 / 下载）
  // =========================================================================

  /**
   * 将文本复制到系统剪贴板。
   * 用途：复制按钮的核心实现，优先使用现代 Clipboard API。
   * 行为：
   *   1. 尝试 navigator.clipboard.writeText()（需 HTTPS 或 localhost）。
   *   2. 若失败 → execCommand('copy') 兜底（选中 textarea → copy 命令）。
   * 输入：text {string} 要复制的文本。
   * 输出：{Promise<void>} 异步完成。
   * 已知限制：
   *   - Clipboard API 在非安全上下文（HTTP）下不可用，会静默走兜底路径；
   *   - 兜底方案依赖页面中有聚焦的 textarea（当前架构满足）。
   * 验证方法：复制后 Ctrl+V 粘贴内容一致
   * 最近变更：v2.0 从 bindEvents 内联代码中提取为独立 async 函数
   */
  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_err) {
      // Fallback for non-secure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
  }

  /**
   * 将文本作为 .md 文件触发浏览器下载。
   * 用途：下载按钮的核心实现，使用 Blob + Object URL 方案。
   * 行为：
   *   1. 创建 Blob（text/markdown;charset=utf-8）。
   *   2. 生成临时 Object URL。
   *   3. 创建隐藏 <a> 并 programmatic click 触发下载。
   *   4. 100ms 后清理 URL 和 <a> 元素（释放内存）。
   * 输入：text {string} Markdown 文件内容；filename {string} 文件名（含 .md 后缀）。
   * 输出：void（副作用：触发文件下载）。
   * 已知限制：
   *   - 文件名中的非法字符需调用方预先清理；
   *   - 某些浏览器设置可能阻止自动下载。
   * 验证方法：下载文件内容与传入 text 一致
   * 最近变更：v2.0 从 bindEvents 内联代码中提取为独立函数
   */
  function downloadAsMD(text, filename) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  }

  // =========================================================================
  // Entry: run(args) — 主入口编排
  // =========================================================================
  /**
   * 脚本主入口函数。由 evaluate_script 调用。
   * 用途：初始化「网页转 MD」工具——创建悬浮按钮，准备就绪等待用户交互。
   * 行为：
   *   1. 清理已有实例（防重复注入）。
   *   2. 创建悬浮切换按钮。
   *   3. 返回结构化结果报告。
   * 输入：args {Object} 外部参数（预留扩展，当前未使用）。
   * 输出：{Object} { ok, summary, features[], usage, warnings[] }
   * 已知限制：每次执行会重建全部 UI（幂等但不保留状态）。
   * 验证方法：evaluate_script 返回 ok:true + 截图确认悬浮按钮可见
   * 最近变更：v2.0 全面模块化重构
   */

  // 清理旧实例 + 注入新 UI
  removePanel();
  createToggleButton();

  return {
    ok: true,
    summary: '网页转 MD v2.0 [Modular] — 已启动。右下角 📝 按钮打开转换面板。',
    features: [
      'HTML → Markdown 智能转换（标题/段落/列表/表格/代码块/链接/图片/引用）',
      '自动检测主内容区域，支持自定义 CSS 选择器精确指定范围',
      '批量模式：选择器匹配多元素合并为一份 MD 文档',
      '一键复制到剪贴板 / 下载为 .md 文件',
      '面板可拖拽移动，8 模块清晰架构'
    ],
    usage: '点击右下角 📝 → 打开面板 → 「转换为 Markdown」→ 复制 / 下载',
    warnings: [],
    architecture: {
      modules: ['CONFIG','MdUtils','DomUtils','NodeConverter','ContentExtractor','OutputCleaner','UIManager','ExportHelper'],
      totalFunctions: 26,
      version: '2.0'
    }
  };
}