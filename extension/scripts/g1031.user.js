(function() {
    const table = document.querySelector('.file-view-table') ||
  document.querySelector('.file-view-wrapper');
    if (!table) return;
    if (getComputedStyle(table).position === 'static') table.style.position = 'relative';

    document.querySelectorAll('.ide-icon, .ide-ellipsis, .ide-guide').forEach(n => n.remove());
    document.querySelectorAll('.ide-bg').forEach(n => n.classList.remove('ide-bg'));

    const oldStyle = document.getElementById('ide-v9');
    if (oldStyle) oldStyle.remove();
    const s = document.createElement('style');
    s.id = 'ide-v9';
    s.innerHTML = [
      '.ide-bg { background: rgba(128, 128, 128, 0.08) !important; }',
      '.ide-guide { position: absolute; width: 1px; background: rgba(140, 140, 140, 0.6);pointer-events: none; z-index: 50; }',
      '.ide-icon { position: absolute; cursor: pointer; width: 14px; height: 14px;top: 50%;transform: translateY(-50%); display: flex; align-items: center; justify-content: center; color:#888; opacity: 0; z-index: 60; font-size: 10px; line-height: 1; transition: transform 0.2s; }',
      '.ide-icon:hover { color: #333; }',
      '.content:hover .ide-icon, .ide-icon.is-folded { opacity: 1; }',
      '.ide-icon.is-folded { transform: translateY(-50%) rotate(-90deg); }',
      '.ide-ellipsis { display: none; background: rgba(0, 122, 204, 0.15); color: #007acc;border-radius: 3px; padding: 0 4px; margin-left: 6px; font-size: 12px; cursor: pointer;vertical-align: middle; }'
    ].join('\n');
    document.head.appendChild(s);

    let activeGuide = null;
    let activeRows = [];
    function clearScope() {
      if (activeGuide) activeGuide.remove();
      activeGuide = null;
      activeRows.forEach(el => el.classList.remove('ide-bg'));
      activeRows = [];
    }

    const rows = Array.from(document.querySelectorAll('.content'));
    const firstNum = rows[0] && rows[0].querySelector('.line-number');
    const iconLeft = firstNum ? (firstNum.offsetLeft + firstNum.offsetWidth + 2) : 35;

     function parseSyntax(text) {
      const clean = text.replace(/'(?:\\'|[^'])*'|"(?:\\"|[^"])*"|\/\*[\s\S]*?\*\/|\/\/.*/g, '');

      let brace = 0, paren = 0;
      for (let i = 0; i < clean.length; i++) {
        const c = clean[i];
        if (c === '{') brace++;
        else if (c === '}') brace--;
        else if (c === '(') paren++;
        else if (c === ')') paren--;
      }

      const opens  = (clean.match(/<[A-Za-z][A-Za-z0-9_.]*(?=[\s/>]|$)/g) || []).length;
      const closes = (clean.match(/<\/[A-Za-z][A-Za-z0-9_.]*>/g)           || []).length;
      const selfs  = (clean.match(/\/>/g)                                  || []).length;
      const tag = opens - closes - selfs;

      return { brace: brace, paren: paren, tag: tag };
    }

    function findClosingRow(startIdx, type, startCount) {
      let count = startCount;
      for (let i = startIdx + 1; i < rows.length; i++) {
        const line = rows[i];
        const pre = line.querySelector('.line-content');
        const content = pre ? pre.textContent : (line.textContent || '');
        const tokens = parseSyntax(content);
        count += tokens[type];
        if (count <= 0) return { row: line, index: i };
      }
      return null;
    }

    function getCharX(el) {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
      let n;
      while ((n = w.nextNode())) {
        const m = n.nodeValue.match(/\S/);
        if (m) {
          const r = document.createRange();
          r.setStart(n, m.index);
          r.setEnd(n, m.index + 1);
          return r.getBoundingClientRect().left;
        }
      }
      return el.getBoundingClientRect().left;
    }

    rows.forEach(function(row, idx) {
      const pre = row.querySelector('.line-content');
      if (!pre) return;
      const tokens = parseSyntax(pre.textContent || '');

      let type, count;
      if (tokens.tag > 0) { type = 'tag'; count = tokens.tag; }
      else if (tokens.brace > 0) { type = 'brace'; count = tokens.brace; }
      else if (tokens.paren > 0) { type = 'paren'; count = tokens.paren; }
      else return;

      const res = findClosingRow(idx, type, count);
      if (!res || res.index <= idx + 1) return;

      row.style.position = 'relative';
      const icon = document.createElement('div');
      icon.className = 'ide-icon';
      icon.style.left = iconLeft + 'px';
      icon.textContent = '\u25BE';

      const ell = document.createElement('span');
      ell.className = 'ide-ellipsis';
      ell.textContent = '...';
      pre.appendChild(ell);

      let folded = false;
      const toggle = function(e) {
        e.stopPropagation();
        folded = !folded;
        if (folded) icon.classList.add('is-folded'); else icon.classList.remove('is-folded');
        ell.style.display = folded ? 'inline-block' : 'none';
        for (let i = idx + 1; i < res.index; i++) {
          const tr = rows[i];
          tr._h = tr._h || new Set();
          if (folded) tr._h.add(row); else tr._h.delete(row);
          tr.style.display = tr._h.size > 0 ? 'none' : '';
        }
        clearScope();
      };
      icon.addEventListener('click', toggle);
      ell.addEventListener('click', toggle);
      row.appendChild(icon);
    });

    table.addEventListener('click', function(e) {
      const row = e.target.closest('.content');
      if (!row || e.target.closest('.ide-icon') || e.target.closest('.ide-ellipsis')) return;

      clearScope();
      if (row.querySelector('.ide-icon.is-folded')) return;

      const pre = row.querySelector('.line-content');
      if (!pre) return;
      const tokens = parseSyntax(pre.textContent || '');

      let type, count;
      if (tokens.tag > 0) { type = 'tag'; count = tokens.tag; }
      else if (tokens.brace > 0) { type = 'brace'; count = tokens.brace; }
      else if (tokens.paren > 0) { type = 'paren'; count = tokens.paren; }
      else return;

      const startIdx = rows.indexOf(row);
      const res = findClosingRow(startIdx, type, count);
      if (!res || res.row.style.display === 'none') return;

      const tRect = table.getBoundingClientRect();
      const sRect = row.getBoundingClientRect();
      const eRect = res.row.getBoundingClientRect();

      const rx = getCharX(pre) - tRect.left + table.scrollLeft - 2;
      const ry = sRect.bottom - tRect.top + table.scrollTop;
      const h = eRect.top - sRect.bottom;

      if (h > 0) {
        activeGuide = document.createElement('div');
        activeGuide.className = 'ide-guide';
        activeGuide.style.left = rx + 'px';
        activeGuide.style.top = ry + 'px';
        activeGuide.style.height = h + 'px';
        table.appendChild(activeGuide);
      }

      for (let i = startIdx; i <= res.index; i++) {
        const r = rows[i];
        if (r.style.display === 'none') continue;
        r.classList.add('ide-bg');
        activeRows.push(r);
      }
    });
  })();