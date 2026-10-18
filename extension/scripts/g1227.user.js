(function() {
  if (window.__bigmodelMdDlInjected) return;
  window.__bigmodelMdDlInjected = true;

  var NL = '\n';

  function escapeHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function sanitizeFilename(str) {
    return (str || 'document').replace(/[^\w\u4e00-\u9fff\-\.]/g, '_').substring(0, 80);
  }

  function isBigmodelDocs() {
    var h = location.hostname;
    return h.indexOf('docs.bigmodel.cn') !== -1 ||
           h.indexOf('open.bigmodel.cn') !== -1;
  }

  function isModelPage() {
    var p = location.pathname;
    return p.indexOf('/cn/guide/models/') !== -1 ||
           p.indexOf('/dev/howuse/') !== -1;
  }

  function getMdSourceUrl() {
    var pathname = location.pathname;
    // Remove trailing slash
    if (pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    // If already .md, use as-is
    if (pathname.endsWith('.md')) {
      return location.origin + pathname;
    }
    // Append .md
    return location.origin + pathname + '.md';
  }

  function getModelName() {
    var pathname = location.pathname;
    // Remove trailing slash
    if (pathname.endsWith('/')) pathname = pathname.slice(0, -1);
    // Extract last segment
    var segments = pathname.split('/');
    var last = segments[segments.length - 1] || segments[segments.length - 2] || 'document';
    // Remove .md extension if present
    if (last.endsWith('.md')) last = last.slice(0, -3);
    return last;
  }

  function getPageTitle() {
    // Try various title sources
    var title = '';
    var h1 = document.querySelector('h1');
    if (h1) title = h1.textContent.trim();
    if (!title) {
      var meta = document.querySelector('meta[property="og:title"]');
      if (meta && meta.content) title = meta.content;
    }
    if (!title) title = document.title;
    // Clean up title
    title = title.replace(/\s*[-–—]\s*智谱.*$/, '').replace(/\s*[-–—]\s*BigModel.*$/, '').trim();
    return title || getModelName();
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function() { URL.revokeObjectURL(url); a.remove(); }, 300);
  }

  function showToast(message, type) {
    var existing = document.getElementById('bmd-toast');
    if (existing) existing.remove();

    var colors = {
      success: { bg: '#10b981', border: '#059669' },
      error:   { bg: '#ef4444', border: '#dc2626' },
      warning: { bg: '#f59e0b', border: '#d97706' },
      info:    { bg: '#3b82f6', border: '#2563eb' }
    };
    var c = colors[type] || colors.info;

    var toast = document.createElement('div');
    toast.id = 'bmd-toast';
    toast.textContent = message;
    Object.assign(toast.style, {
      position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
      zIndex: '100000', padding: '12px 24px', backgroundColor: c.bg, color: '#fff',
      borderRadius: '8px', fontSize: '14px', fontWeight: '500',
      boxShadow: '0 4px 14px rgba(0,0,0,0.2)', border: '1px solid ' + c.border,
      transition: 'opacity 0.3s ease', fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif'
    });
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  // ─── Extract content from rendered page as fallback ───
  function extractPageContent() {
    var main = document.querySelector('main') ||
               document.querySelector('[class*="content"]') ||
               document.querySelector('article') ||
               document.querySelector('.md-content') ||
               document.body;

    var title = getPageTitle();
    var md = '# ' + title + NL + NL;

    // Walk the DOM and convert to markdown
    function walkNode(node, depth) {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        md += node.textContent;
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;

      var tag = node.tagName.toLowerCase();
      var style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') return;

      // Skip navigation, sidebar, footer, header
      var cls = (node.className || '').toString().toLowerCase();
      if (cls.indexOf('nav') !== -1 || cls.indexOf('sidebar') !== -1 ||
          cls.indexOf('footer') !== -1 || cls.indexOf('header') !== -1 ||
          cls.indexOf('menu') !== -1 || cls.indexOf('breadcrumb') !== -1) return;

      switch (tag) {
        case 'h1': md += NL + NL + '# ' + node.textContent.trim() + NL + NL; break;
        case 'h2': md += NL + NL + '## ' + node.textContent.trim() + NL + NL; break;
        case 'h3': md += NL + NL + '### ' + node.textContent.trim() + NL + NL; break;
        case 'h4': md += NL + NL + '#### ' + node.textContent.trim() + NL + NL; break;
        case 'h5': md += NL + NL + '##### ' + node.textContent.trim() + NL + NL; break;
        case 'h6': md += NL + NL + '###### ' + node.textContent.trim() + NL + NL; break;
        case 'p': md += NL + NL; node.childNodes.forEach(function(c) { walkNode(c, depth); }); md += NL; break;
        case 'strong': case 'b': md += '**​'; node.childNodes.forEach(function(c) { walkNode(c, depth); }); md += '​**'; break;
        case 'em': case 'i': md += '*'; node.childNodes.forEach(function(c) { walkNode(c, depth); }); md += '*'; break;
        case 'code':
          if (node.parentElement && node.parentElement.tagName.toLowerCase() === 'pre') {
            node.childNodes.forEach(function(c) { walkNode(c, depth); });
          } else {
            md += '`' + node.textContent + '`';
          }
          break;
        case 'pre':
          var lang = '';
          var codeEl = node.querySelector('code');
          if (codeEl) {
            var clsList = codeEl.className || '';
            var langMatch = clsList.match(/language-(\w+)/);
            if (langMatch) lang = langMatch[1];
          }
          md += NL + NL + '```' + lang + NL;
          md += (codeEl || node).textContent;
          md += NL + '```' + NL;
          break;
        case 'a':
          var href = node.getAttribute('href') || '';
          var linkText = node.textContent.trim();
          if (href && linkText) {
            md += '[' + linkText + '](' + href + ')';
          } else {
            node.childNodes.forEach(function(c) { walkNode(c, depth); });
          }
          break;
        case 'img':
          var src = node.getAttribute('src') || '';
          var alt = node.getAttribute('alt') || '';
          md += NL + NL + '![' + alt + '](' + src + ')' + NL + NL;
          break;
        case 'ul': case 'ol':
          md += NL;
          node.querySelectorAll(':scope > li').forEach(function(li, i) {
            var prefix = tag === 'ol' ? (i + 1) + '. ' : '- ';
            md += prefix;
            li.childNodes.forEach(function(c) { walkNode(c, depth + 1); });
            md += NL;
          });
          md += NL;
          break;
        case 'table':
          md += NL;
          var rows = node.querySelectorAll('tr');
          rows.forEach(function(row, ri) {
            var cells = row.querySelectorAll('th, td');
            var line = '| ';
            cells.forEach(function(cell) { line += cell.textContent.trim() + ' | '; });
            md += line + NL;
            if (ri === 0) {
              var sep = '| ';
              cells.forEach(function() { sep += '--- | '; });
              md += sep + NL;
            }
          });
          md += NL;
          break;
        case 'br': md += NL; break;
        case 'hr': md += NL + '---' + NL; break;
        case 'blockquote': md += NL + '> '; node.childNodes.forEach(function(c) { walkNode(c, depth); }); md += NL; break;
        default:
          node.childNodes.forEach(function(c) { walkNode(c, depth); });
          break;
      }
    }

    main.childNodes.forEach(function(c) { walkNode(c, 0); });

    // Clean up excessive blank lines
    md = md.replace(/\n{3,}/g, NL + NL).trim();

    return md;
  }

  // ─── Inject styles ───
  function injectStyles() {
    var css = '';
    css += '#bmd-trigger{position:fixed;bottom:24px;right:24px;z-index:99999;';
    css += 'padding:10px 18px;border-radius:24px;';
    css += 'background:linear-gradient(135deg,#1a56db 0%,#7c3aed 100%);';
    css += 'color:#fff;border:none;cursor:pointer;font-size:14px;font-weight:500;';
    css += 'box-shadow:0 4px 14px rgba(26,86,219,0.4);';
    css += 'transition:all 0.25s ease;display:flex;align-items:center;gap:6px;';
    css += 'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;}';
    css += '#bmd-trigger:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(26,86,219,0.5);}';
    css += '#bmd-trigger.loading{opacity:0.6;pointer-events:none;}';
    css += '#bmd-panel{position:fixed;bottom:72px;right:24px;z-index:99999;width:380px;';
    css += 'background:#fff;border-radius:16px;box-shadow:0 12px 48px rgba(0,0,0,0.15);';
    css += 'font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;';
    css += 'display:none;flex-direction:column;overflow:hidden;color:#1a1a2e;}';
    css += '#bmd-panel.open{display:flex;}';
    css += '.bmd-header{padding:16px 20px;background:linear-gradient(135deg,#1a56db,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:space-between;}';
    css += '.bmd-header-title{font-size:15px;font-weight:600;}';
    css += '.bmd-close{cursor:pointer;font-size:22px;color:#fff;background:none;border:none;opacity:0.8;padding:0;}';
    css += '.bmd-close:hover{opacity:1;}';
    css += '.bmd-body{padding:20px;}';
    css += '.bmd-info{font-size:13px;color:#666;margin-bottom:16px;line-height:1.6;}';
    css += '.bmd-model-name{font-weight:600;color:#1a56db;word-break:break-all;}';
    css += '.bmd-actions{display:flex;flex-direction:column;gap:8px;}';
    css += '.bmd-btn{padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;';
    css += 'border:1px solid #e0e0e0;background:#fff;color:#333;font-weight:500;transition:all 0.15s;';
    css += 'font-family:inherit;text-align:left;display:flex;align-items:center;gap:8px;}';
    css += '.bmd-btn:hover{border-color:#1a56db;background:#f0f4ff;color:#1a56db;}';
    css += '.bmd-btn.primary{background:linear-gradient(135deg,#1a56db,#7c3aed);border-color:transparent;color:#fff;}';
    css += '.bmd-btn.primary:hover{opacity:0.9;}';
    css += '.bmd-btn:disabled{opacity:0.5;pointer-events:none;}';
    css += '.bmd-url{font-size:11px;color:#999;word-break:break-all;margin-top:12px;padding:8px;background:#f7f8fa;border-radius:6px;font-family:monospace;line-height:1.4;}';

    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ─── Create UI ───
  function createUI() {
    var trigger = document.createElement('button');
    trigger.id = 'bmd-trigger';
    trigger.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> \u4E0B\u8F7D Markdown';
    document.body.appendChild(trigger);

    var panel = document.createElement('div');
    panel.id = 'bmd-panel';
    var modelName = getModelName();
    var modelNameEscaped = escapeHtml(modelName);
    var mdUrl = getMdSourceUrl();
    var mdUrlEscaped = escapeHtml(mdUrl);

    var html = '';
    html += '<div class="bmd-header">';
    html += '  <div class="bmd-header-title">\u{1F4D6} \u667A\u8C31AI\u6587\u6863\u4E0B\u8F7D</div>';
    html += '  <button class="bmd-close">&times;</button>';
    html += '</div>';
    html += '<div class="bmd-body">';
    html += '  <div class="bmd-info">\u5F53\u524D\u9875\u9762\uFF1A<span class="bmd-model-name">' + modelNameEscaped + '</span></div>';
    html += '  <div class="bmd-actions">';
    html += '    <button class="bmd-btn primary" data-action="source-md">📄 \u4E0B\u8F7D\u539F\u59CB Markdown \u6E90\u6587\u4EF6</button>';
    html += '    <button class="bmd-btn" data-action="extract-md">📝 \u4ECE\u9875\u9762\u63D0\u53D6\u5E76\u4E0B\u8F7D</button>';
    html += '    <button class="bmd-btn" data-action="copy-url">🔗 \u590D\u5236 .md \u6E90\u6587\u4EF6\u5730\u5740</button>';
    html += '  </div>';
    html += '  <div class="bmd-url">\u6E90\u6587\u4EF6\u5730\u5740\uFF1A' + mdUrlEscaped + '</div>';
    html += '</div>';

    panel.innerHTML = html;
    document.body.appendChild(panel);

    trigger.addEventListener('click', function() {
      panel.classList.toggle('open');
    });

    panel.querySelector('.bmd-close').addEventListener('click', function() {
      panel.classList.remove('open');
    });

    panel.querySelectorAll('.bmd-btn').forEach(function(btn) {
      btn.addEventListener('click', function() { handleAction(btn); });
    });
  }

  function handleAction(btn) {
    var action = btn.dataset.action;

    if (action === 'source-md') {
      btn.disabled = true;
      btn.textContent = '⏳ 正在获取源文件...';

      var mdUrl = getMdSourceUrl();
      fetch(mdUrl)
        .then(function(resp) {
          if (!resp.ok) throw new Error('HTTP ' + resp.status);
          return resp.text();
        })
        .then(function(md) {
          if (!md || md.trim().length < 10) throw new Error('内容为空');
          // Strip the documentation index header that Mintlify injects
          md = md.replace(/^>[\s\S]*?Use this file to discover all available pages[^\n]*\n*/m, '');
          var filename = sanitizeFilename(getModelName()) + '.md';
          var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
          downloadBlob(blob, filename);
          showToast('✅ 已下载 ' + filename, 'success');
          btn.textContent = '✅ 下载完成';
          setTimeout(function() { btn.innerHTML = '📄 \u4E0B\u8F7D\u539F\u59CB Markdown \u6E90\u6587\u4EF6'; btn.disabled = false; }, 1500);
        })
        .catch(function(e) {
          console.warn('[BigModel MD Downloader] Source fetch failed:', e);
          showToast('⚠️ 源文件获取失败: ' + e.message + '，请尝试"从页面提取"', 'warning');
          btn.innerHTML = '📄 \u4E0B\u8F7D\u539F\u59CB Markdown \u6E90\u6587\u4EF6';
          btn.disabled = false;
        });
    }

    else if (action === 'extract-md') {
      btn.disabled = true;
      btn.textContent = '⏳ 正在提取...';
      try {
        var md = extractPageContent();
        if (!md || md.trim().length < 10) throw new Error('页面内容提取为空');
        var filename = sanitizeFilename(getModelName()) + '_extracted.md';
        var blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        downloadBlob(blob, filename);
        showToast('✅ 已下载 ' + filename, 'success');
        btn.textContent = '✅ 提取完成';
      } catch (e) {
        showToast('❌ 提取失败: ' + e.message, 'error');
      }
      setTimeout(function() { btn.innerHTML = '📝 \u4ECE\u9875\u9762\u63D0\u53D6\u5E76\u4E0B\u8F7D'; btn.disabled = false; }, 1500);
    }

    else if (action === 'copy-url') {
      var mdUrl = getMdSourceUrl();
      navigator.clipboard.writeText(mdUrl).then(function() {
        showToast('✅ 已复制源文件地址', 'success');
      }).catch(function() {
        var ta = document.createElement('textarea');
        ta.value = mdUrl;
        ta.style.cssText = 'position:fixed;left:-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast('✅ 已复制源文件地址', 'success');
      });
    }
  }

  // ─── Init ───
  function init() {
    if (!isBigmodelDocs()) {
      showToast('⚠️ 此脚本仅适用于智谱AI开放文档 (docs.bigmodel.cn / open.bigmodel.cn)', 'warning');
      return;
    }
    injectStyles();
    createUI();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();