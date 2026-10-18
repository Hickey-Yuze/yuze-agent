(function () {
  if (window.__csdn2md_loaded) return;
  window.__csdn2md_loaded = true;

  const SCRIPT_ID = 'turndown-lib';
  const CDN_URL = 'https://unpkg.com/turndown@7.2.0/dist/turndown.js';
  const GFM_PLUGIN_URL = 'https://unpkg.com/turndown-plugin-gfw@1.0.2/dist/turndown-plugin-gfw.js';

  function loadScript(url, id) {
    return new Promise((resolve, reject) => {
      if (document.getElementById(id)) { resolve(); return; }
      const script = document.createElement('script');
      script.id = id;
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load: ${url}`));
      document.head.appendChild(script);
    });
  }

  function sanitizeFilename(name) {
    return name.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').substring(0, 120);
  }

  function extractMetadata() {
    const title =
      document.querySelector('#articleContentId')?.textContent?.trim() ||
      document.querySelector('.title-article')?.textContent?.trim() ||
      document.querySelector('h1')?.textContent?.trim() ||
      'untitled';

    const author =
      document.querySelector('.follow-nickName')?.textContent?.trim() ||
      document.querySelector('a.username')?.textContent?.trim() ||
      document.querySelector('#uid')?.textContent?.trim() ||
      document.querySelector('.user-name')?.textContent?.trim() ||
      '';

    const date =
      document.querySelector('.time')?.textContent?.trim() ||
      document.querySelector('span.date')?.textContent?.trim() ||
      document.querySelector('.article-bar-top .time')?.textContent?.trim() ||
      '';

    const tags = Array.from(
      document.querySelectorAll('.tag-link, .article-tag .tag, .blog-tags-box .tag-link')
    ).map(el => el.textContent?.trim()).filter(Boolean);

    const categories = Array.from(
      document.querySelectorAll('.article-type-link, .blog-categories-box a')
    ).map(el => el.textContent?.trim()).filter(Boolean);

    return { title, author, date, tags, categories };
  }

  function cleanArticleContent(container) {
    const clone = container.cloneNode(true);

    const removeSelectors = [
      '.hide-article-box',
      '.more-toolbox',
      '.person-messagebox',
      '.recommend-box',
      '.comment-box',
      '.comment-edit-box',
      '.csdn-hierarchical-nav',
      'script',
      'style',
      'svg[class*="icon"]',
      '.bdsharebuttonbox',
      '.article-copyright',
      '.reward-box',
      '.pay-area',
      '.readall-box',
      '.btn-readmore',
      '#treeSkill',
      '.skill-tree-box',
      '.template-box',
      '.insert-baidu-box',
    ];
    removeSelectors.forEach(sel => {
      clone.querySelectorAll(sel).forEach(el => el.remove());
    });

    clone.querySelectorAll('pre, code').forEach(el => {
      el.removeAttribute('style');
      el.removeAttribute('class');
    });

    clone.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('data-src') || img.getAttribute('src') || '';
      if (src) {
        img.setAttribute('src', src);
        img.removeAttribute('data-src');
        img.removeAttribute('loading');
        img.removeAttribute('class');
        img.removeAttribute('style');
      }
    });

    clone.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      const text = a.textContent?.trim() || '';
      if (text && href && !href.startsWith('javascript')) {
        a.setAttribute('href', href);
      }
      a.removeAttribute('class');
      a.removeAttribute('style');
    });

    return clone;
  }

  function buildMarkdownFrontMatter(meta) {
    let fm = '---\n';
    fm += `title: "${meta.title.replace(/"/g, '\\"')}"\n`;
    if (meta.author) fm += `author: "${meta.author}"\n`;
    if (meta.date) fm += `date: "${meta.date}"\n`;
    if (meta.tags.length > 0) fm += `tags: [${meta.tags.map(t => `"${t}"`).join(', ')}]\n`;
    if (meta.categories.length > 0) fm += `categories: [${meta.categories.map(c => `"${c}"`).join(', ')}]\n`;
    fm += `source: "${window.location.href}"\n`;
    fm += '---\n\n';
    return fm;
  }

  function downloadMarkdown(markdown, filename) {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function createFloatingButton() {
    const btn = document.createElement('div');
    btn.id = 'csdn2md-btn';
    btn.innerHTML = '📄 → MD';
    Object.assign(btn.style, {
      position: 'fixed',
      bottom: '80px',
      right: '24px',
      zIndex: '99999',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#fff',
      padding: '12px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: 'bold',
      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
      transition: 'transform 0.2s, box-shadow 0.2s',
      userSelect: 'none',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.08)';
      btn.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    });
    return btn;
  }

  function showStatus(message, type) {
    let toast = document.getElementById('csdn2md-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'csdn2md-toast';
      Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: '100000',
        padding: '12px 28px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'opacity 0.3s',
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
      });
      document.body.appendChild(toast);
    }
    const colors = {
      info: { bg: '#1a73e8', color: '#fff' },
      success: { bg: '#34a853', color: '#fff' },
      error: { bg: '#ea4335', color: '#fff' },
    };
    const c = colors[type] || colors.info;
    toast.style.background = c.bg;
    toast.style.color = c.color;
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.style.opacity = '0'; }, 3000);
  }

  async function handleConvert() {
    showStatus('⏳ 正在加载转换库...', 'info');

    try {
      await loadScript(CDN_URL, SCRIPT_ID);
      try { await loadScript(GFM_PLUGIN_URL, 'turndown-gfm-lib'); } catch (e) { /* GFM plugin is optional */ }

      showStatus('⏳ 正在提取文章内容...', 'info');

      const articleEl = document.querySelector('#article_content');
      if (!articleEl) {
        showStatus('❌ 未找到文章内容，请确认当前页面是CSDN博客详情页', 'error');
        return;
      }

      const meta = extractMetadata();
      const cleanedEl = cleanArticleContent(articleEl);

      // Expand "read more" if hidden content exists
      const hideBox = document.querySelector('.hide-article-box');
      if (hideBox) {
        const readMoreBtn = hideBox.querySelector('.btn-readmore') || hideBox.querySelector('a');
        if (readMoreBtn) readMoreBtn.click();
        await new Promise(r => setTimeout(r, 1000));
        const reExpanded = document.querySelector('#article_content');
        if (reExpanded) {
          const reCleaned = cleanArticleContent(reExpanded);
          cleanedEl.innerHTML = reCleaned.innerHTML;
        }
      }

      const TurndownService = window.TurndownService;
      const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-',
        emDelimiter: '*',
        strongDelimiter: '**',
        hr: '---',
      });

      if (window.turndownPluginGfm) {
        const gfm = window.turndownPluginGfm;
        turndownService.use(gfm.gfm);
        turndownService.use(gfm.tables);
        turndownService.use(gfm.strikethrough);
      }

      // Custom rule: handle CSDN code blocks (set-code-hide / pre > code)
      turndownService.addRule('csdnCodeBlock', {
        filter: function (node) {
          return (
            node.nodeName === 'PRE' &&
            node.querySelector('code')
          );
        },
        replacement: function (content, node) {
          const codeEl = node.querySelector('code');
          let lang = '';
          const classList = codeEl.className || '';
          const langMatch = classList.match(/language-(\S+)/) ||
            classList.match(/hljs\s+(\S+)/) ||
            codeEl.getAttribute('data-language')?.match(/(\S+)/);
          if (langMatch) lang = langMatch[1];
          const code = codeEl.textContent || '';
          return '\n\n```' + lang + '\n' + code.replace(/\n$/, '') + '\n```\n\n';
        },
      });

      // Custom rule: handle CSDN image captions
      turndownService.addRule('csdnImageCaption', {
        filter: function (node) {
          return node.classList && node.classList.contains('img-caption');
        },
        replacement: function (content) {
          return '\n*' + content.trim() + '*\n';
        },
      });

      // Custom rule: preserve line breaks in <br> tags
      turndownService.addRule('lineBreak', {
        filter: 'br',
        replacement: function () {
          return '  \n';
        },
      });

      const articleMd = turndownService.turndown(cleanedEl);

      const frontMatter = buildMarkdownFrontMatter(meta);
      const fullMarkdown = frontMatter + `# ${meta.title}\n\n` + articleMd;

      const filename = sanitizeFilename(meta.title) + '.md';
      downloadMarkdown(fullMarkdown, filename);

      showStatus(`✅ 已成功导出: ${filename}`, 'success');
    } catch (err) {
      console.error('[CSDN2MD] Error:', err);
      showStatus('❌ 转换失败: ' + err.message, 'error');
    }
  }

  function init() {
    const isCsdnArticle = window.location.hostname.includes('blog.csdn.net') &&
      /\/article\/details\//.test(window.location.pathname);

    if (!isCsdnArticle) {
      console.log('[CSDN2MD] Not a CSDN article page, skipping.');
      return;
    }

    const btn = createFloatingButton();
    btn.addEventListener('click', handleConvert);
    document.body.appendChild(btn);
    console.log('[CSDN2MD] Button injected. Click to export Markdown.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();