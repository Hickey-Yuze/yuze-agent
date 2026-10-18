(function() {
  var NL = String.fromCharCode(10);
  var oldIds = ['__flashcard_btn_group__', '__flashcard_style__', '__flashcard_host__', '__flashcard_md_panel__', '__flashcard_fc_panel__'];
  for (var oi = 0; oi < oldIds.length; oi++) {
    var oldEl = document.getElementById(oldIds[oi]);
    if (oldEl && oldEl.parentNode) oldEl.parentNode.removeChild(oldEl);
  }

  // 去重逻辑：移除旧实例后重建（而非直接 return）
  var existingHost = document.getElementById('__flashcard_host__');
  if (existingHost && existingHost.parentNode) {
    existingHost.parentNode.removeChild(existingHost);
  }

  var currentMode = 'read';
  var MD_PANEL_ID = '__flashcard_md_panel__';
  var STYLE_ID = '__flashcard_style__';
  var FC_PANEL_ID = '__flashcard_fc_panel__';

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function inlineParse(str) {
    var htmlTags = [];
    str = str.replace(/<(\/?[a-zA-Z][a-zA-Z0-9]*)(\s[^>]*)?\/?>/g, function(match) {
      htmlTags.push(match);
      return '\x00HTML' + (htmlTags.length - 1) + '\x00';
    });
    str = escapeHtml(str);
    str = str.replace(/`([^`]+)`/g, '<code>$1</code>');
    str = str.replace(/==(.+?)==/g, '<mark>$1</mark>');
    str = str.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    str = str.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    str = str.replace(/__(.+?)__/g, '<strong>$1</strong>');
    str = str.replace(/\*(.+?)\*/g, '<em>$1</em>');
    str = str.replace(/~~(.+?)~~/g, '<del>$1</del>');
    str = str.replace(/$$([^$$]+)\]$([^)]+)$/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    str = str.replace(/!$$([^$$]*)\]$([^)]+)$/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;">');
    str = str.replace(/\x00HTML(\d+)\x00/g, function(_, idx) { return htmlTags[parseInt(idx)]; });
    return str;
  }

  function parseMarkdown(text) {
    var lines = text.split(NL);
    var html = '';
    var i = 0;

    function isFenced(line) {
      var m = line.match(/^(`{3,})(\w*)/);
      return m ? { fence: m[1], lang: m[2] } : null;
    }

    function tryParseTable(si) {
      var j = si, tLines = [];
      while (j < lines.length && /^\s*\|/.test(lines[j])) { tLines.push(lines[j]); j++; }
      if (tLines.length < 2) return null;
      var sep = tLines[1].trim();
      if (!/^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?\s*$/.test(sep)) return null;
      var sCells = sep.replace(/^\|/, '').replace(/\|$/, '').split('|');
      var aligns = [];
      for (var si2 = 0; si2 < sCells.length; si2++) {
        var c = sCells[si2].trim();
        if (/^:-+:$/.test(c)) aligns.push('center');
        else if (/^-+:$/.test(c)) aligns.push('right');
        else if (/^:-+$/.test(c)) aligns.push('left');
        else aligns.push('');
      }
      var hCells = tLines[0].replace(/^\|/, '').replace(/\|$/, '').split('|');
      var t = '<table><thead><tr>';
      for (var hi = 0; hi < hCells.length; hi++) {
        var a = aligns[hi] ? ' style="text-align:' + aligns[hi] + '"' : '';
        t += '<th' + a + '>' + inlineParse(hCells[hi].trim()) + '</th>';
      }
      t += '</tr></thead><tbody>';
      for (var ri = 2; ri < tLines.length; ri++) {
        var rCells = tLines[ri].replace(/^\|/, '').replace(/\|$/, '').split('|');
        t += '<tr>';
        for (var ci = 0; ci < rCells.length; ci++) {
          var ca = aligns[ci] ? ' style="text-align:' + aligns[ci] + '"' : '';
          t += '<td' + ca + '>' + inlineParse(rCells[ci].trim()) + '</td>';
        }
        t += '</tr>';
      }
      t += '</tbody></table>';
      return { html: t, next: j };
    }

    function parseList(type, startIdx) {
      var items = [], idx = startIdx;
      var listRe = type === 'ul' ? /^(\s*)[-*+]\s+(.*)/ : /^(\s*)\d+\.\s+(.*)/;
      while (idx < lines.length && listRe.test(lines[idx])) {
        var m = lines[idx].match(listRe);
        var indent = m[1].length, content = m[2];
        idx++;
        var childLines = [];
        while (idx < lines.length) {
          var nm = lines[idx].match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
          if (nm && nm[1].length > indent) { childLines.push(lines[idx]); idx++; }
          else break;
        }
        var childHtml = '';
        if (childLines.length > 0) {
          var cType = /^(\s*)[-*+]\s+/.test(childLines[0]) ? 'ul' : 'ol';
          var saved = [lines, i];
          lines = childLines; i = 0;
          childHtml = parseList(cType, 0);
          lines = saved[0]; i = saved[1];
        }
        items.push('<li>' + inlineParse(content) + childHtml + '</li>');
      }
      i = idx;
      return '<' + type + '>' + items.join('') + '</' + type + '>';
    }

    while (i < lines.length) {
      var line = lines[i];
      var fs = isFenced(line);
      if (fs) {
        var cl = []; i++;
        while (i < lines.length && lines[i].indexOf(fs.fence) !== 0) { cl.push(lines[i]); i++; }
        i++;
        var la = fs.lang ? ' class="language-' + fs.lang + '"' : '';
        html += '<pre><code' + la + '>' + cl.map(function(l) { return escapeHtml(l); }).join(NL) + '</code></pre>';
        continue;
      }
      var hm = line.match(/^(#{1,6})\s+(.+)/);
      if (hm) { var lv = hm[1].length; html += '<h' + lv + '>' + inlineParse(hm[2]) + '</h' + lv + '>'; i++; continue; }
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { html += '<hr>'; i++; continue; }
      if (/^\s*\|/.test(line)) { var tr = tryParseTable(i); if (tr) { html += tr.html; i = tr.next; continue; } }
      if (/^>\s?/.test(line)) {
        var ql = [];
        while (i < lines.length && /^>(>*)\s?/.test(lines[i])) { ql.push(lines[i]); i++; }
        var inner = ql.map(function(l) { return l.replace(/^>\s?/, ''); }).join(NL);
        html += '<blockquote>' + parseMarkdown(inner) + '</blockquote>';
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line)) { html += parseList('ul', i); continue; }
      if (/^\s*\d+\.\s+/.test(line)) { html += parseList('ol', i); continue; }
      if (/^(    |	)/.test(line)) {
        var ic = [];
        while (i < lines.length && /^(    |	)/.test(lines[i])) { ic.push(lines[i].replace(/^(    |	)/, '')); i++; }
        html += '<pre><code>' + ic.map(function(l) { return escapeHtml(l); }).join(NL) + '</code></pre>';
        continue;
      }
      if (line.trim() === '') { i++; continue; }
      var pl = [];
      while (i < lines.length && lines[i].trim() !== '' && !/^#{1,6}\s/.test(lines[i]) && !/^>\s?/.test(lines[i]) && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !isFenced(lines[i]) && !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i]) && !/^(    |	)/.test(lines[i]) && !/^\s*\|/.test(lines[i])) {
        pl.push(lines[i]); i++;
      }
      if (pl.length > 0) html += '<p>' + inlineParse(pl.join(' ')) + '</p>';
    }
    return html;
  }

  function isMarkdownContent(text) {
    if (!text || text.trim().length < 10) return false;
    var score = 0, md = text.split(NL);
    for (var k = 0; k < md.length; k++) {
      var ln = md[k];
      if (/^#{1,6}\s+/.test(ln)) score += 3;
      if (/^[-*+]\s+/.test(ln)) score += 2;
      if (/^\d+\.\s+/.test(ln)) score += 2;
      if (/^>\s?/.test(ln)) score += 2;
      if (/\*\*.+?\*\*/.test(ln)) score += 2;
      if (/`[^`]+`/.test(ln)) score += 1;
      if (/```/.test(ln)) score += 3;
      if (/^\|/.test(ln)) score += 2;
      if (/==.+==/.test(ln)) score += 1;
    }
    return score >= 4;
  }

  function getContentRoot() {
    var sels = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '.content', '#content', '#main'];
    for (var si = 0; si < sels.length; si++) {
      var el = document.querySelector(sels[si]);
      if (el && el.children.length > 0) return el;
    }
    return document.body;
  }

  function getDirectTextContent(el) {
    var text = '';
    for (var n = 0; n < el.childNodes.length; n++) {
      var node = el.childNodes[n];
      if (node.nodeType === Node.TEXT_NODE) { text += node.textContent; }
      else if (node.nodeType === Node.ELEMENT_NODE) {
        var tag = node.tagName;
        if (tag === 'BR') text += NL;
        else if (['P','DIV','H1','H2','H3','H4','H5','H6','LI','BLOCKQUOTE','PRE','TR','TABLE'].indexOf(tag) !== -1) text += NL + getDirectTextContent(node) + NL;
        else if (tag === 'UL' || tag === 'OL') { text += NL; for (var li = 0; li < node.children.length; li++) { if (node.children[li].tagName === 'LI') text += getDirectTextContent(node.children[li]) + NL; } }
        else text += getDirectTextContent(node);
      }
    }
    return text;
  }

  // === UI: Shadow Buttons (增强版 — 三层保护确保始终显示) ===
  function createShadowButtons() {
    var host = document.createElement('div');
    host.id = '__flashcard_host__';
    // 第一层保护：inline style 兜底，确保即使 Shadow CSS 被干扰也能显示
    host.style.cssText = 'position:fixed!important;right:20px!important;top:50%!important;transform:translateY(-50%)!important;z-index:2147483647!important;pointer-events:auto!important;';
    document.body.appendChild(host);
    var shadow = host.attachShadow({ mode: 'open' });
    // 第二层保护：Shadow DOM 内部 CSS 用 !important 确保不被外部覆盖
    shadow.innerHTML = '<style>:host{position:fixed!important;right:20px!important;top:50%!important;transform:translateY(-50%)!important;z-index:2147483647!important;pointer-events:auto!important;isolation:isolate}.g{display:flex;flex-direction:column;gap:10px;font-family:-apple-system,sans-serif}button{width:52px;height:52px;border:none;border-radius:14px;cursor:pointer;font-size:13px;font-weight:600;color:#fff;display:flex;align-items:center;justify-content:center;transition:all .2s;box-shadow:0 2px 12px rgba(0,0,0,.12)}.b:hover{transform:scale(1.08)}.f{background:linear-gradient(135deg,#6366f1,#8b5cf6)}.r{background:linear-gradient(135deg,#10b981,#34d399)}.a{box-shadow:0 0 0 2px rgba(255,255,255,.5);transform:scale(1.05)}</style><div class="g"><button class="f b" title="闪卡模式">&#21345;</button><button class="r b a" title="阅读模式">&#38405;</button></div>';
    shadow.querySelectorAll('button')[0].addEventListener('click', function() { switchMode('flashcard'); });
    shadow.querySelectorAll('button')[1].addEventListener('click', function() { switchMode('read'); });
    updateButtonState();

    // === 第三层保护：MutationObserver 自动监控恢复 ===
    var observer = new MutationObserver(function() {
      if (!document.getElementById('__flashcard_host__')) {
        observer.disconnect();
        createShadowButtons();
      }
    });
    observer.observe(document.body, { childList: true });
  }

  function updateButtonState() {
    var host = document.getElementById('__flashcard_host__');
    if (!host) return;
    var shadow = host.shadowRoot;
    var btns = shadow.querySelectorAll('button');
    btns[0].classList.remove('a');
    btns[1].classList.remove('a');
    if (currentMode === 'flashcard') btns[0].classList.add('a');
    else btns[1].classList.add('a');
  }

  // === CSS ===
  var mdCSS = '.__md-rendered__{font-family:-apple-system,sans-serif;font-size:15px;line-height:1.75;color:#1f2937;max-width:800px;margin:0 auto}.__md-rendered__ h1{font-size:2em;border-bottom:2px solid #e5e7eb;padding-bottom:10px}.__md-rendered__ h2{font-size:1.5em;border-left:4px solid #6366f1;padding-left:14px}.__md-rendered__ h3{font-size:1.25em}.__md-rendered__ p{margin:10px 0}.__md-rendered__ strong{font-weight:700}.__md-rendered__ em{font-style:italic}.__md-rendered__ a{color:#6366f1;text-decoration:none}.__md-rendered__ pre{background:#1e1e2e;color:#cdd6f4;padding:18px;border-radius:12px;overflow-x:auto}.__md-rendered__ pre code{background:none;padding:0;color:#cdd6f4}.__md-rendered__ code{font-family:monospace;background:rgba(225,29,72,.08);padding:2px 6px;border-radius:4px;color:#e11d48}.__md-rendered__ blockquote{border-left:4px solid #f59e0b;background:rgba(245,158,11,.06);padding:12px 18px;margin:14px 0;border-radius:0 10px 10px 0;color:#92400e}.__md-rendered__ blockquote blockquote{border-left-color:#6366f1;background:rgba(99,102,241,.04);color:#4338ca}.__md-rendered__ ul,.__md-rendered__ ol{margin:8px 0;padding-left:28px}.__md-rendered__ li{margin:5px 0}.__md-rendered__ hr{border:none;height:2px;background:linear-gradient(to right,transparent,#d1d5db,transparent);margin:24px 0}.__md-rendered__ img{max-width:100%;border-radius:10px}.__md-rendered__ table{border-collapse:collapse;width:100%;margin:16px 0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.__md-rendered__ th,.__md-rendered__ td{border:1px solid #e5e7eb;padding:10px 16px;text-align:left}.__md-rendered__ th{background:#f9fafb;font-weight:600;color:#374151}.__md-rendered__ tr:nth-child(even){background:#f9fafb}.__md-rendered__ mark{background:linear-gradient(120deg,rgba(250,204,21,.35),rgba(250,204,21,.15));padding:1px 4px;border-radius:3px}';

  var panelCSS = ':host{position:fixed;inset:0;z-index:2147483646;background:rgba(15,15,20,.55);backdrop-filter:blur(8px);display:flex;justify-content:center;align-items:flex-start;padding:50px 20px;overflow-y:auto}.md-container{max-width:780px;width:100%;background:#fff;border-radius:16px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.15);color:#1f2937;font-family:-apple-system,sans-serif;font-size:15px;line-height:1.75}.md-container h1{font-size:2em;border-bottom:2px solid #e5e7eb;padding-bottom:10px}.md-container h2{font-size:1.5em;border-left:4px solid #6366f1;padding-left:14px}.md-container h3{font-size:1.25em}.md-container p{margin:10px 0}.md-container pre{background:#1e1e2e;color:#cdd6f4;padding:18px;border-radius:12px;overflow-x:auto}.md-container code{font-family:monospace;background:rgba(225,29,72,.08);padding:2px 6px;border-radius:4px;color:#e11d48}.md-container pre code{background:none;color:#cdd6f4;padding:0}.md-container blockquote{border-left:4px solid #f59e0b;background:rgba(245,158,11,.06);padding:12px 18px;margin:14px 0;border-radius:0 10px 10px 0}.md-container blockquote blockquote{border-left-color:#6366f1;background:rgba(99,102,241,.04)}.md-container ul,.md-container ol{margin:8px 0;padding-left:28px}.md-container li{margin:5px 0}.md-container hr{border:none;height:2px;background:linear-gradient(to right,transparent,#d1d5db,transparent);margin:24px 0}.md-container img{max-width:100%;border-radius:10px}.md-container table{border-collapse:collapse;width:100%;margin:16px 0;border-radius:10px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)}.md-container th,.md-container td{border:1px solid #e5e7eb;padding:10px 16px}.md-container th{background:#f9fafb;font-weight:600}.md-container tr:nth-child(even){background:#f9fafb}.md-container mark{background:linear-gradient(120deg,rgba(250,204,21,.35),rgba(250,204,21,.15));padding:1px 4px;border-radius:3px}.close-btn{position:fixed;top:16px;right:16px;width:36px;height:36px;border:none;border-radius:50%;background:rgba(0,0,0,.2);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:2147483647}.close-btn:hover{background:rgba(0,0,0,.35)}';

  var fcCSS = ':host{position:fixed;inset:0;z-index:2147483646;background:rgba(15,15,20,.6);backdrop-filter:blur(10px);display:flex;justify-content:center;align-items:center}.cw{width:600px;max-width:90vw;background:#fff;border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,.2);overflow:hidden;position:relative}.ch{padding:20px 24px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}.cb{display:inline-block;padding:2px 10px;border-radius:20px;font-size:12px;font-weight:600;color:#fff}.bh1{background:#6366f1}.bh2{background:#8b5cf6}.bh3{background:#ec4899}.bh4{background:#10b981}.bli{background:#f59e0b}.bq{background:#f97316}.bt{background:#64748b}.bta{background:#0ea5e9}.cc{font-size:13px;color:#9ca3af}.cbd{padding:24px;font-size:15px;line-height:1.75;color:#1f2937;min-height:120px;display:flex;align-items:center;justify-content:center;text-align:center}.tc{font-size:13px;white-space:pre;font-family:monospace;text-align:left;background:#f9fafb;padding:12px 16px;border-radius:10px;width:100%}.cf{padding:16px 24px;border-top:1px solid #e5e7eb;display:flex;justify-content:center;gap:12px}.cf button{padding:8px 20px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;cursor:pointer;font-size:14px;transition:all .2s;color:#374151}.cf button:hover{background:#f3f4f6}.cf button:disabled{opacity:.4;cursor:not-allowed}.xfc{position:absolute;top:12px;right:12px;width:30px;height:30px;border:none;border-radius:50%;background:rgba(0,0,0,.1);color:#666;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center}.xfc:hover{background:rgba(0,0,0,.2)}';

  // === Inline Render ===
  var originalContents = [];

  function collectMdElements() {
    var root = getContentRoot(), candidates = [];
    function walk(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
      if (el.id && (el.id.indexOf('__flashcard') === 0 || el.id === MD_PANEL_ID || el.id === FC_PANEL_ID || el.id === '__TAB_APP_MOUNTED_GUARD__')) return;
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'NOSCRIPT') return;
      var dt = getDirectTextContent(el);
      if (dt.length > 20 && isMarkdownContent(dt)) { candidates.push({ element: el, text: dt }); return; }
      for (var ci = 0; ci < el.children.length; ci++) walk(el.children[ci]);
    }
    walk(root);
    return candidates;
  }

  function renderMarkdownInline() {
    if (originalContents.length > 0) return;
    var s = document.getElementById(STYLE_ID);
    if (!s) { s = document.createElement('style'); s.id = STYLE_ID; s.textContent = mdCSS; document.head.appendChild(s); }
    var cands = collectMdElements();
    for (var ci = 0; ci < cands.length; ci++) {
      var item = cands[ci];
      originalContents.push({ element: item.element, html: item.element.innerHTML });
      item.element.innerHTML = '<div class="__md-rendered__">' + parseMarkdown(item.text) + '</div>';
    }
  }

  function restoreMarkdownInline() {
    for (var ri = 0; ri < originalContents.length; ri++) originalContents[ri].element.innerHTML = originalContents[ri].html;
    originalContents = [];
    var s = document.getElementById(STYLE_ID);
    if (s && s.parentNode) s.parentNode.removeChild(s);
  }

  // === MD Panel ===
  function createMdPanel() {
    removeMdPanel();
    var root = getContentRoot();
    var text = getDirectTextContent(root);
    if (!text || text.trim().length < 5) return;
    var rendered = parseMarkdown(text);
    if (!rendered.trim()) return;
    var panel = document.createElement('div');
    panel.id = MD_PANEL_ID;
    var shadow = panel.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<style>' + panelCSS + '</style><button class="close-btn">&#10005;</button><div class="md-container">' + rendered + '</div>';
    shadow.querySelector('.close-btn').addEventListener('click', function() { switchMode('read'); });
    panel.addEventListener('click', function(e) { if (e.target === panel) switchMode('read'); });
    document.body.appendChild(panel);
  }

  function removeMdPanel() {
    var p = document.getElementById(MD_PANEL_ID);
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }

  // === Flashcard ===
  function extractMdContent(root) {
    var items = [];
    function walk(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;
      if (el.id === '__flashcard_host__' || el.id === MD_PANEL_ID || el.id === FC_PANEL_ID || el.id === '__TAB_APP_MOUNTED_GUARD__') return;
      var tag = el.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'META') return;
      if (tag === 'H1') items.push({ type: 'h1', text: el.textContent.trim() });
      else if (tag === 'H2') items.push({ type: 'h2', text: el.textContent.trim() });
      else if (tag === 'H3') items.push({ type: 'h3', text: el.textContent.trim() });
      else if (tag === 'H4' || tag === 'H5' || tag === 'H6') items.push({ type: 'h4', text: el.textContent.trim() });
      else if (tag === 'LI') items.push({ type: 'li', text: el.textContent.trim() });
      else if (tag === 'BLOCKQUOTE') items.push({ type: 'quote', text: el.textContent.trim() });
      else if (tag === 'P') { var pt = el.textContent.trim(); if (pt.length > 5) items.push({ type: 'text', text: pt }); }
      else if (tag === 'TABLE') {
        var rows = el.querySelectorAll('tr'), tt = '';
        for (var ri = 0; ri < rows.length; ri++) {
          var cells = rows[ri].querySelectorAll('th, td'), rt = [];
          for (var ci = 0; ci < cells.length; ci++) rt.push(cells[ci].textContent.trim());
          tt += rt.join(' | ') + NL;
        }
        if (tt.trim()) items.push({ type: 'table', text: tt.trim() });
      }
      else { for (var wi = 0; wi < el.children.length; wi++) walk(el.children[wi]); }
    }
    walk(root);
    if (items.length < 3) {
      items = [];
      var rawText = root.textContent || '';
      var lines = rawText.split(NL);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
var hm = line.match(/^#{1,6}\s+(.+)/);
        if (hm) {
          var lv = hm[1].length;
          items.push({ type: 'h' + lv, text: hm[2].trim() });
        } else if (/^[-*+]\s+/.test(line)) {
          items.push({ type: 'li', text: line.replace(/^[-*+]\s+/, '').trim() });
        } else if (/^\d+\.\s+/.test(line)) {
          items.push({ type: 'li', text: line.replace(/^\d+\.\s+/, '').trim() });
        } else if (/^>\s?/.test(line)) {
          items.push({ type: 'quote', text: line.replace(/^>\s?/, '').trim() });
        }
      }
    }
    return items;
  }

  var flashcardData = [], flashcardIndex = 0;

  function createFlashcardPanel() {
    removeFlashcardPanel();
    var root = getContentRoot();
    flashcardData = extractMdContent(root);
    if (flashcardData.length === 0) return;
    flashcardIndex = 0;
    var panel = document.createElement('div');
    panel.id = FC_PANEL_ID;
    var shadow = panel.attachShadow({ mode: 'open' });
    renderFlashcard(shadow);
    document.body.appendChild(panel);
  }

  function renderFlashcard(shadow) {
    if (!flashcardData[flashcardIndex]) return;
    var item = flashcardData[flashcardIndex];
    var badgeMap = { h1: 'bh1', h2: 'bh2', h3: 'bh3', h4: 'bh4', li: 'bli', quote: 'bq', text: 'bt', table: 'bta' };
    var labelMap = { h1: 'H1', h2: 'H2', h3: 'H3', h4: 'H4', li: 'LIST', quote: 'QUOTE', text: 'TEXT', table: 'TABLE' };
    var badge = badgeMap[item.type] || 'bt';
    var label = labelMap[item.type] || item.type.toUpperCase();
    var body = item.type === 'table' ? '<div class="tc">' + escapeHtml(item.text) + '</div>' : item.text;
    var prevDis = flashcardIndex === 0 ? ' disabled' : '';
    var nextDis = flashcardIndex === flashcardData.length - 1 ? ' disabled' : '';

    shadow.innerHTML = '<style>' + fcCSS + '</style>' +
      '<div class="cw">' +
      '<button class="xfc">&#10005;</button>' +
      '<div class="ch"><span class="cb ' + badge + '">' + label + '</span><span class="cc">' + (flashcardIndex + 1) + ' / ' + flashcardData.length + '</span></div>' +
      '<div class="cbd">' + body + '</div>' +
      '<div class="cf">' +
      '<button id="prev-card"' + prevDis + '>&#9664; 上一张</button>' +
      '<button id="next-card"' + nextDis + '>下一张 &#9654;</button>' +
      '</div></div>';

    shadow.querySelector('.xfc').addEventListener('click', function() { switchMode('read'); });
    shadow.getElementById('prev-card').addEventListener('click', function() {
      if (flashcardIndex > 0) { flashcardIndex--; renderFlashcard(shadow); }
    });
    shadow.getElementById('next-card').addEventListener('click', function() {
      if (flashcardIndex < flashcardData.length - 1) { flashcardIndex++; renderFlashcard(shadow); }
    });
  }

  function removeFlashcardPanel() {
    var p = document.getElementById(FC_PANEL_ID);
    if (p && p.parentNode) p.parentNode.removeChild(p);
  }

  // === Mode Switch ===
  function switchMode(mode) {
    currentMode = mode;
    updateButtonState();

    var root = getContentRoot();
    var mdContainer = root.querySelector('.__md-rendered__');
    if (mode === 'read') {
      removeMdPanel();
      removeFlashcardPanel();
      root.style.visibility = 'visible';
      if (mdContainer) {
        var allElements = mdContainer.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
          allElements[i].style.visibility = '';
          allElements[i].style.display = '';
          allElements[i].style.color = '';
        }
      }
    } else if (mode === 'flashcard') {
      removeMdPanel();
      removeFlashcardPanel();
      root.style.visibility = 'visible';
      if (mdContainer) {
        var titleAndBold = mdContainer.querySelectorAll('h1,h2,h3,h4,h5,h6,strong,b');
        var originalColors = [];
        for (var j = 0; j < titleAndBold.length; j++) {
          originalColors[j] = getComputedStyle(titleAndBold[j]).color;
        }
        var allElements = mdContainer.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {
          allElements[i].style.color = '#fff';
        }
        for (var k = 0; k < titleAndBold.length; k++) {
          titleAndBold[k].style.color = originalColors[k];
        }
      }
    }
  }

  createShadowButtons();
  renderMarkdownInline();
  switchMode('read');
})();