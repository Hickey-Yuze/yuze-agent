/**
 * 网页内容转 Markdown 脚本
 * 解析当前页面 DOM，生成结构化的 Markdown 文本，支持一键复制和下载
 * 适用范围：所有网页 (*)
 * 自动运行：false
 */
async function run(args) {
  const options = args || {};
  const includeLinks = options.includeLinks !== false;
  const includeImages = options.includeImages !== false;
  const includeTables = options.includeTables !== false;
  const maxDepth = options.maxDepth || 15;
  const baseUrl = window.location.href;

  // ========== 工具函数 ==========

  function isHidden(el) {
    if (!el) return true;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return true;
    if (el.offsetParent === null && el.offsetWidth === 0 && el.offsetHeight === 0) {
      // 特殊处理 body 和 fixed/absolute 定位元素
      if (el.tagName === 'BODY' || el.tagName === 'HTML') return false;
      if (style.position === 'fixed' || style.position === 'absolute') return false;
      return true;
    }
    return false;
  }

  function isVisibleText(text) {
    return text && text.trim().length > 0;
  }

  function getDirectTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent || '';
      }
    }
    return text;
  }

  function escapeMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/]/g, '\\]')
      .replace(/#/g, '\\#')
      .replace(/-/g, '\\-')
      .replace(/\+/g, '\\+')
      .replace(/!/g, '\\!')
      .replace(/>/g, '\\>')
      .replace(/\|/g, '\\|')
      .replace(/~/g, '\\~');
  }

  function resolveUrl(href) {
    if (!href) return '';
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }

  function getTagWeight(tag) {
    const weights = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 };
    return weights[tag] || 7;
  }

  function trimTrailingBlankLines(lines) {
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    return lines;
  }

  // ========== 核心转换引擎 ==========

  function convertNode(node, depth, parentTag) {
    if (depth > maxDepth) return '';

    // 跳过隐藏元素、脚本、样式、非文本节点
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
      return '';
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (!isVisibleText(text)) return '';
      return text.replace(/\s+/g, ' ').trim();
    }

    const tag = node.tagName.toUpperCase();
    const el = node;

    // 跳过隐藏元素和非内容标签
    if (isHidden(el)) return '';
    if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'CANVAS', 'IFRAME', 'VIDEO', 'AUDIO', 'INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'FORM', 'META', 'LINK'].includes(tag)) {
      return '';
    }

    // 跳过导航栏、侧边栏、页脚等非正文区域（启发式）
    const role = el.getAttribute('role') || '';
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const className = (el.className || '').toString().toLowerCase();
    const id = (el.id || '').toLowerCase();

    const skipPatterns = ['nav', 'sidebar', 'footer', 'header', 'menu', 'toolbar', 'breadcrumb', 'comment-', 'related', 'recommend', 'advertisement', 'ad-', 'popup', 'modal', 'dialog', 'cookie', 'consent', 'banner'];
    const combinedIdClass = id + ' ' + className + ' ' + ariaLabel;
    const shouldSkip = skipPatterns.some(p => combinedIdClass.includes(p));
    
    // 只在顶层或近顶层跳过，避免误删正文中的内容
    if (shouldSkip && depth <= 3 && 
        !['ARTICLE', 'MAIN', 'SECTION', 'DIV', 'BODY'].includes(tag) &&
        el.children.length > 5) {
      return '';
    }

    let result = '';

    switch (tag) {
      case 'H1':
      case 'H2':
      case 'H3':
      case 'H4':
      case 'H5':
      case 'H6': {
        const level = parseInt(tag[1]);
        const prefix = '#'.repeat(level);
        const inner = convertChildren(el, depth);
        const text = inner.trim();
        if (text) result = `\n\n${prefix} ${text}\n\n`;
        break;
      }

      case 'P': {
        const inner = convertChildren(el, depth).trim();
        if (inner) result = `\n${inner}\n\n`;
        break;
      }

      case 'BR':
        result = '\n';
        break;

      case 'HR':
        result = '\n\n---\n\n';
        break;

      case 'A': {
        const href = el.getAttribute('href');
        const text = convertChildren(el, depth).trim();
        if (includeLinks && href && text) {
          result = `[${text}](${resolveUrl(href)})`;
        } else if (text) {
          result = text;
        }
        break;
      }

      case 'STRONG':
      case 'B': {
        const inner = convertChildren(el, depth).trim();
        if (inner) result = `**${inner}**`;
        break;
      }

      case 'EM':
      case 'I': {
        const inner = convertChildren(el, depth).trim();
        if (inner) result = `*${inner}*`;
        break;
      }

      case 'DEL':
      case 'S': {
        const inner = convertChildren(el, depth).trim();
        if (inner) result = `~~${inner}~~`;
        break;
      }

      case 'CODE': {
        // 判断是行内代码还是代码块
        const isInline = el.parentNode ? !['PRE'].includes(el.parentNode.tagName.toUpperCase()) : true;
        const codeText = (el.textContent || '').replace(/\n/g, ' ').trim();
        if (codeText) {
          result = isInline ? `\`${escapeMarkdown(codeText)}\`` : codeText;
        }
        break;
      }

      case 'PRE': {
        const codeEl = el.querySelector('code');
        const lang = codeEl ? (codeEl.className.match(/language-(\w+)/) || [])[1] || '' : '';
        const rawText = (codeEl ? codeEl.textContent : el.textContent) || '';
        if (rawText.trim()) {
          result = `\n\`\`\`${lang}\n${rawText.trim()}\n\`\`\`\n\n`;
        }
        break;
      }

      case 'BLOCKQUOTE': {
        const lines = convertChildren(el, depth).trim().split('\n');
        const quoted = lines.map(line => `> ${line}`).join('\n');
        result = `\n${quoted}\n\n`;
        break;
      }

      case 'UL':
      case 'OL': {
        const items = Array.from(el.children).filter(child => child.tagName.toUpperCase() === 'LI');
        const listItems = items.map((li, i) => {
          const liContent = convertChildren(li, depth).trim();
          if (tag === 'UL') {
            return `- ${liContent}`;
          } else {
            return `${i + 1}. ${liContent}`;
          }
        });
        if (listItems.length > 0) {
          result = '\n' + listItems.join('\n') + '\n\n';
        }
        break;
      }

      case 'LI': {
        // LI 内容由父级 UL/OL 处理
        result = convertChildren(el, depth);
        break;
      }

      case 'IMG': {
        if (includeImages) {
          const alt = el.getAttribute('alt') || '';
          const src = el.getAttribute('src') || '';
          if (src) result = `![${alt}](${resolveUrl(src)})`;
        }
        break;
      }

      case 'TABLE': {
        if (includeTables) {
          result = convertTable(el, depth);
        } else {
          result = convertChildren(el, depth);
        }
        break;
      }

      case 'DIV':
      case 'SECTION':
      case 'ARTICLE':
      case 'MAIN':
      case 'HEADER':
      case 'FOOTER':
      case 'NAV':
      case 'ASIDE':
      case 'FIGURE':
      case 'FIGCAPTION':
      case 'SPAN':
      case 'TIME':
      case 'MARK':
      case 'ABBR':
      case 'CITE':
      case 'Q':
      case 'SMALL':
      case 'SUB':
      case 'SUP':
      case 'DETAILS':
      case 'SUMMARY':
      case 'DD':
      case 'DT':
      default:
        result = convertChildren(el, depth);
        break;
    }

    return result;
  }

  function convertChildren(el, depth) {
    let results = [];
    for (const child of el.childNodes) {
      const converted = convertNode(child, depth + 1, el.tagName);
      if (converted) results.push(converted);
    }
    return results.join('');
  }

  function convertTable(tableEl, depth) {
    const rows = tableEl.querySelectorAll('tr');
    if (rows.length === 0) return '';

    let mdRows = [];
    let isFirstRow = true;

    rows.forEach((row, idx) => {
      const cells = row.querySelectorAll('th, td');
      const cellTexts = Array.from(cells).map(cell => {
        return (convertChildren(cell, depth + 1) || '').trim().replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });

      if (cellTexts.length > 0) {
        mdRows.push('| ' + cellTexts.join(' | ') + ' |');

        // 如果第一行全是 th 或第一行就是表头行，添加分隔线
        if (isFirstRow) {
          const headerCells = row.querySelectorAll('th');
          if (headerCells.length > 0 || idx === 0) {
            mdRows.push('| ' + cellTexts.map(() => '---').join(' | ') + ' |');
            isFirstRow = false;
          }
        }
      }
    });

    return '\n' + mdRows.join('\n') + '\n\n';
  }

  // ========== 主流程 ==========

  // 尝试找到主要内容区域
  let rootEl = document.body;

  const mainSelectors = [
    'article',
    '[role="main"]',
    'main',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content-body',
    '#content',
    '.markdown-body',
    '.article',
    '.story-body'
  ];

  for (const sel of mainSelectors) {
    const found = document.querySelector(sel);
    if (found && found.innerText && found.innerText.trim().length > 100) {
      rootEl = found;
      break;
    }
  }

  // 执行转换
  const markdownRaw = convertNode(rootEl, 0, null);

  // 后处理：清理多余空行
  let markdown = markdownRaw
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '');

  // 提取标题作为文件名建议
  const title = document.title || 'untitled';
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_').substring(0, 50);

  // 统计信息
  const charCount = markdown.length;
  const lineCount = markdown.split('\n').length;
  const wordCount = markdown.replace(/\s+/g, ' ').trim().split(' ').filter(w => w.length > 0).length;

  // ========== 创建 UI 浮层 ==========

  // 移除已存在的浮层
  const existingPanel = document.getElementById('__md_converter_panel__');
  if (existingPanel) existingPanel.remove();

  const panel = document.createElement('div');
  panel.id = '__md_converter_panel__';
  panel.innerHTML = `
    <style>
      #__md_converter_panel__ {
        position: fixed;
        top: 0; left: 0; right: 0; bottom: 0;
        z-index: 2147483647;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: __md_fade_in__ 0.2s ease-out;
      }
      @keyframes __md_fade_in__ {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      #__md_converter_panel__ .__md_modal__ {
        background: #fff;
        border-radius: 12px;
        width: 85vw;
        max-width: 900px;
        height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        overflow: hidden;
      }
      #__md_converter_panel__ .__md_header__ {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e8e8e8;
        background: #fafafa;
        flex-shrink: 0;
      }
      #__md_converter_panel__ .__md_title__ {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      #__md_converter_panel__ .__md_stats__ {
        font-size: 12px;
        color: #888;
        margin-left: 12px;
        font-weight: 400;
      }
      #__md_converter_panel__ .__md_actions__ {
        display: flex;
        gap: 8px;
      }
      #__md_converter_panel__ .__md_btn__ {
        padding: 8px 16px;
        border-radius: 6px;
        border: none;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.15s;
        display: inline-flex;
        align-items: center;
        gap: 5px;
      }
      #__md_converter_panel__ .__md_btn_primary__ {
        background: #2563eb;
        color: #fff;
      }
      #__md_converter_panel__ .__md_btn_primary__:hover {
        background: #1d4ed8;
      }
      #__md_converter_panel__ .__md_btn_secondary__ {
        background: #f1f5f9;
        color: #475569;
      }
      #__md_converter_panel__ .__md_btn_secondary__:hover {
        background: #e2e8f0;
      }
      #__md_converter_panel__ .__md_body__ {
        flex: 1;
        overflow: auto;
        padding: 0;
      }
      #__md_converter_panel__ .__md_textarea__ {
        width: 100%;
        height: 100%;
        border: none;
        outline: none;
        resize: none;
        padding: 20px;
        font-family: "SF Mono", "Fira Code", "Cascadia Code", Consolas, monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #1a1a2e;
        background: #fafbfc;
        tab-size: 2;
        white-space: pre-wrap;
        word-break: break-word;
        box-sizing: border-box;
      }
      #__md_converter_panel__ .__md_toast__ {
        position: absolute;
        top: 50px;
        left: 50%;
        transform: translateX(-50%);
        background: #16a34a;
        color: #fff;
        padding: 10px 20px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s;
        z-index: 10;
      }
      #__md_converter_panel__ .__md_toast__.show {
        opacity: 1;
      }
    </style>
    <div class="__md_modal__">
      <div class="__md_header__">
        <div class="__md_title__">
          📄 Markdown 预览
          <span class="__md_stats__">${charCount} 字符 · ${lineCount} 行 · ${wordCount} 词</span>
        </div>
        <div class="__md_actions__">
          <button class="__md_btn__ __md_btn_secondary__" id="__md_btn_copy__">📋 复制</button>
          <button class="__md_btn__ __md_btn_secondary__" id="__md_btn_download__">💾 下载</button>
          <button class="__md_btn__ __md_btn_primary__" id="__md_btn_close__">✕ 关闭</button>
        </div>
      </div>
      <div class="__md_body__">
        <textarea class="__md_textarea__" id="__md_output__" spellcheck="false">${markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
      </div>
      <div class="__md_toast__" id="__md_toast__">已复制到剪贴板！</div>
    </div>
  `;

  document.body.appendChild(panel);

  // 绑定事件
  const copyBtn = panel.querySelector('#__md_btn_copy__');
  const downloadBtn = panel.querySelector('#__md_btn_download__');
  const closeBtn = panel.querySelector('#__md_btn_close__');
  const toast = panel.querySelector('#__md_toast__');
  const textarea = panel.querySelector('#__md_output__');

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(textarea.value);
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    } catch (err) {
      // fallback
      textarea.select();
      document.execCommand('copy');
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 2000);
    }
  });

  downloadBtn.addEventListener('click', () => {
    const blob = new Blob([textarea.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeTitle}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });

  closeBtn.addEventListener('click', () => {
    panel.remove();
  });

  // 点击遮罩关闭
  panel.addEventListener('click', (e) => {
    if (e.target === panel) panel.remove();
  });

  // ESC 关闭
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      panel.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  return {
    ok: true,
    summary: `成功将网页 "${title}" 转换为 Markdown 格式`,
    data: {
      title,
      filename: `${safeTitle}.md`,
      charCount,
      lineCount,
      wordCount,
      markdownPreview: markdown.substring(0, 500)
    },
    warnings: []
  };
}