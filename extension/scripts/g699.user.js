// ==UserScript==
// @name         长沙商贸旅游职院 · 学生评教自动满分（执行/停止）
// @namespace    com.cslymz.eval
// @version      3.1
// @description  自动识别页面（含 iframe），自动识别每个打分项的最高分并填满分（不打提交，不自动确认），提交与确认弹窗由你手动操作，确认返回列表后自动依次进入下一门。
// @author       WorkBuddy
// @match        *://jwzh.zhxy.hncpu.com:8008/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/*
 * 用法：
 *   1) 油猴 / Tampermonkey：安装后打开教务系统，右下角自动出现悬浮窗。
 *   2) 控制台：按 F12 → Console → 粘贴全文回车。
 *
 * 流程：
 *   手动登录 → 进入「学生评价」列表页 → 点【执行】
 *   → 脚本自动识别列表页并进入第一门课 → 每项自动填满分
 *   → 你手动点【提交】并确认 → 系统返回列表页
 *   → 脚本自动识别并进入下一门 → 循环直到全部完成。
 *
 * 说明：
 *   - 登录、提交、确认弹窗均需你手动操作，脚本只负责自动打满分 + 循环推进。
 *   - 页面识别全部自适应：递归进 iframe，靠表头文字定位列、靠「评价」链接判断待评、靠可见输入框判断评分页。
 *   - 若识别不对，点【诊断】看脚本“看到”了什么，或【导出结构】发我 HTML 校准。
 */
(function () {
  'use strict';

  if (window.__CSLY_EVAL__) return;
  window.__CSLY_EVAL__ = true;

  const CFG = { fallbackMax: 10.0, waitAfterFill: 500 };

  const $ = (s, d) => (d || document).querySelector(s);
  const $$ = (s, d) => Array.from((d || document).querySelectorAll(s));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ===== 悬浮控制面板 =====
  function initPanel() {
    if ($('#csly-panel')) return;
    const css = [
      '#csly-panel{position:fixed;right:12px;bottom:12px;width:360px;background:#fff;',
      'border:2px solid #1677ff;box-shadow:0 6px 24px rgba(0,0,0,.3);border-radius:8px;',
      'font:13px/1.45 "Microsoft YaHei";z-index:2147483647;color:#222;overflow:hidden}',
      '#csly-panel h3{margin:0;padding:8px 10px;background:#1677ff;color:#fff;font-size:14px;',
      'display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none}',
      '#csly-panel .bd{padding:10px}',
      '#csly-panel .st{color:#095;min-height:40px;word-break:break-all;margin-bottom:8px;',
      'background:#f6ffed;border:1px solid #b7eb8f;border-radius:4px;padding:6px}',
      '#csly-panel button{margin:4px 6px 4px 0;padding:7px 12px;cursor:pointer;border:1px solid #1677ff;',
      'background:#e6f4ff;border-radius:4px;font-weight:600}',
      '#csly-panel #csly-run{background:#1677ff;color:#fff;width:100%;margin:6px 0 0}',
      '#csly-panel #csly-stop{background:#fff;color:#d4380d;border-color:#d4380d;width:100%;margin:6px 0 0}',
      '#csly-panel .log{height:180px;overflow:auto;background:#fafafa;border:1px solid #eee;',
      'border-radius:4px;padding:6px;font-size:12px;line-height:1.6;white-space:pre-wrap;margin-top:8px}'
    ].join('');
    const st = document.createElement('style');
    st.textContent = css;
    (document.head || document.documentElement).appendChild(st);

    const p = document.createElement('div');
    p.id = 'csly-panel';
    p.innerHTML =
      '<h3>评教自动助手<span id="csly-x" style="cursor:pointer;font-size:18px;line-height:1">×</span></h3>' +
      '<div class="bd">' +
      '<div class="st" id="csly-st">步骤：① 在本页手动登录 → 进入「学生评价」列表页；② 点【执行】开始自动评教（每项自动打满分，提交与确认需你手动操作）。</div>' +
      '<button id="csly-run">执行</button>' +
      '<button id="csly-diag">诊断</button>' +
      '<button id="csly-stop">停止</button>' +
      '<button id="csly-export">导出结构</button>' +
      '<button id="csly-close">收起</button>' +
      '<div class="log" id="csly-log"></div>' +
      '</div>';
    (document.body || document.documentElement).appendChild(p);

    const h3 = p.querySelector('h3');
    let dragging = false, ox = 0, oy = 0;
    h3.addEventListener('mousedown', (e) => {
      if (e.target.id === 'csly-x') return;
      dragging = true;
      const rect = p.getBoundingClientRect();
      ox = e.clientX - rect.left; oy = e.clientY - rect.top;
      p.style.right = 'auto'; p.style.bottom = 'auto';
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      let x = Math.max(0, Math.min(e.clientX - ox, window.innerWidth - p.offsetWidth));
      let y = Math.max(0, Math.min(e.clientY - oy, window.innerHeight - p.offsetHeight));
      p.style.left = x + 'px'; p.style.top = y + 'px';
    });
    document.addEventListener('mouseup', () => { dragging = false; });

    $('#csly-x').onclick = () => { p.style.display = 'none'; };
    $('#csly-close').onclick = () => { p.style.display = 'none'; };
    $('#csly-run').onclick = startAutoEval;
    $('#csly-diag').onclick = diagnose;
    $('#csly-stop').onclick = stopAutoEval;
    $('#csly-export').onclick = exportHtml;
  }

  function log(msg) {
    const box = $('#csly-log');
    if (!box) return;
    const d = document.createElement('div');
    d.textContent = '[' + new Date().toLocaleTimeString() + '] ' + msg;
    box.appendChild(d); box.scrollTop = box.scrollHeight;
  }
  function status(msg) { const e = $('#csly-st'); if (e) e.textContent = msg; log(msg); }

  // ===== 运行状态：只以 sessionStorage 为准 =====
  function isRunning() { try { return sessionStorage.getItem('CSLY_EVAL_RUNNING') === '1'; } catch (e) { return false; } }
  function setRunning(v) { try { if (v) sessionStorage.setItem('CSLY_EVAL_RUNNING', '1'); else sessionStorage.removeItem('CSLY_EVAL_RUNNING'); } catch (e) {} }
  function startAutoEval() {
    setRunning(true);
    status('▶ 已启动。脚本会自动识别当前页面并处理。');
    processCurrentPage();
  }
  function stopAutoEval() { setRunning(false); status('⏹ 已停止。后续返回列表页不会再自动进入下一门。'); }

  // ===== 框架递归扫描（同时支持 <iframe> 与 <frame>，兼容老式 frameset）=====
  function allFrames(root) {
    // <frame> 在 frameset 中、<iframe> 在普通文档中，二者都要查
    return Array.from(root.querySelectorAll('iframe, frame'));
  }
  function scanFrames(root, depth) {
    root = root || document;
    depth = depth || 0;
    if (depth > 8) return [];
    const docs = [root];
    for (const f of allFrames(root)) {
      try {
        const d = f.contentDocument || (f.contentWindow && f.contentWindow.document);
        if (d && d !== root && d !== document) docs.push(...scanFrames(d, depth + 1));
      } catch (e) {}
    }
    // 兜底：浏览器 window.frames 集合（某些 frameset 结构 querySelectorAll 取不全）
    try {
      const w = root.defaultView || (root === document ? window : null);
      if (w) {
        for (let i = 0; i < w.frames.length; i++) {
          try {
            const d = w.frames[i].document;
            if (d && d !== root && d !== document && docs.indexOf(d) < 0) {
              docs.push(...scanFrames(d, depth + 1));
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
    return docs;
  }
  function getWinForDoc(targetDoc) {
    function search(root) {
      for (const f of allFrames(root)) {
        try {
          if (f.contentDocument === targetDoc) return f.contentWindow;
          const r = search(f.contentDocument);
          if (r) return r;
        } catch (e) {}
      }
      try {
        const w = root.defaultView || (root === document ? window : null);
        if (w) {
          for (let i = 0; i < w.frames.length; i++) {
            try {
              const r = search(w.frames[i].document);
              if (r) return r;
            } catch (e) {}
          }
        }
      } catch (e) {}
      return null;
    }
    const fromFrame = search(document);
    return fromFrame || targetDoc.defaultView || window;
  }

  // ===== 页面类型自适应识别（跨 iframe） =====
  function tableHeaders(t) { return $$('th', t).map((th) => (th.innerText || '').trim()); }

  function findListTable() {
    for (const d of scanFrames()) {
      const byId = $('#dataList', d);
      if (byId) {
        const h = tableHeaders(byId);
        if (h.some((x) => /课程名称/.test(x)) && /评价|查看/.test(byId.innerText)) return { doc: d, table: byId };
      }
      for (const t of $$('table', d)) {
        const h = tableHeaders(t);
        if (h.some((x) => /课程名称/.test(x)) && /评价|查看/.test(t.innerText)) return { doc: d, table: t };
      }
    }
    return null;
  }
  function isListPage() { return !!findListTable(); }

  function isScoreDoc(d) {
    // 评教编辑页 URL 是最强的判据
    try {
      const url = d.defaultView.location.href;
      if (/xspj_edit\.do|xspj[_-]?edit|评教.*编辑|评价.*填写/i.test(url)) return true;
    } catch (e) {}
    // 列表页不算评分页
    const tables = $$('table', d);
    for (const t of tables) {
      const h = tableHeaders(t);
      if (h.some((x) => /课程名称/.test(x)) && /评价|查看/.test(t.innerText)) return false;
    }
    // 真正的评分页通常有多个可输入评分项（文本框/下拉/单选）
    const inputs = $$('input[type="text"], input[type="number"], select, input[type="radio"], input:not([type])', d);
    let count = 0;
    for (const el of inputs) {
      if (el.type === 'hidden') continue;
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 100, height: 20 };
      if (r.width >= 1 && r.width < 320 && r.height >= 1 && r.height < 90) count++;
    }
    return count >= 3; // 至少 3 个评分项才认为是评分页，避免把只有搜索框的列表页误判
  }
  function findScoreDoc() {
    for (const d of scanFrames()) {
      if (isScoreDoc(d)) return d;
    }
    return null;
  }
  function isScorePage() { return !!findScoreDoc(); }

  // 相对/绝对 href 转成可导航的绝对 URL
  function makeAbs(href, base) {
    base = base || location.href;
    if (!href || href.charAt(0) === '#' || /^javascript:/i.test(href)) return null;
    try {
      return new URL(href, base).href;
    } catch (e) {
      if (/^https?:\/\//i.test(href)) return href;
      if (href.charAt(0) === '/') return location.origin + href;
      return base.replace(/\/[^/]*$/, '/') + href;
    }
  }

  // ===== 课程列表自适应抓取 =====
  function getCourses() {
    const found = findListTable();
    if (!found) return [];
    const { doc, table } = found;
    const headers = tableHeaders(table);
    const idx = (re, def) => { const i = headers.findIndex((h) => re.test(h)); return i >= 0 ? i : def; };
    const nameIdx = idx(/课程名称/, 2);
    const teacherIdx = idx(/授课教师|教师/, 3);
    const courses = [];
    const base = doc.defaultView ? doc.defaultView.location.href : location.href;
    for (const row of $$('tr', table)) {
      if (row.querySelector('th') && !row.querySelector('td')) continue;
      const cells = $$('td', row);
      if (cells.length < 2) continue;
      const link = row.querySelector('a');
      if (!link) continue;
      const text = (link.innerText || '').trim();
      if (text !== '评价') continue;
      const name = (cells[nameIdx] && cells[nameIdx].innerText || '').trim();
      const teacher = (cells[teacherIdx] && cells[teacherIdx].innerText || '').trim();
      if (!name) continue;
      courses.push({ name, teacher, btn: link, href: makeAbs(link.getAttribute('href'), base), doc });
    }
    return courses;
  }

  // ===== 评分项满分自适应识别 =====
  function findLabel(el, doc) {
    doc = doc || el.ownerDocument;
    if (el.id) { const l = $('label[for="' + el.id + '"]', doc); if (l) return l.innerText || ''; }
    let p = el.parentElement;
    for (let i = 0; i < 5 && p; i++, p = p.parentElement) {
      const txt = (p.innerText || '').replace(/\s+/g, ' ');
      if (/\d+\s*分/.test(txt) || txt.length > 3) return txt;
    }
    return '';
  }
  function scoreFromRow(el) {
    const tr = el.closest && el.closest('tr');
    if (!tr) return null;
    const tds = $$('td', tr);
    let inputTdIndex = -1;
    for (let i = 0; i < tds.length; i++) if (tds[i].contains && tds[i].contains(el)) { inputTdIndex = i; break; }
    const numInText = (txt) => {
      if (!txt) return null;
      const m = txt.match(/(\d+\.?\d*)\s*(?![%％])/);
      return m ? parseFloat(m[1]) : null;
    };
    const ownTd = inputTdIndex >= 0 ? tds[inputTdIndex] : null;
    if (ownTd) {
      const clone = ownTd.cloneNode(true);
      $$('input,select,textarea', clone).forEach((e) => e.remove());
      const n = numInText(clone.innerText);
      if (n !== null) return n;
    }
    for (let i = inputTdIndex + 1; i < tds.length; i++) {
      const n = numInText(tds[i].innerText);
      if (n !== null) return n;
    }
    const rowTxt = tr.innerText || '';
    let best = null;
    const re = /(\d+\.?\d*)\s*(?![%％])/g;
    let mm;
    while ((mm = re.exec(rowTxt)) !== null) {
      const v = parseFloat(mm[1]);
      if (best === null || v > best) best = v;
    }
    return best;
  }
  function detectMaxFromContext(el, doc) {
    const rowScore = scoreFromRow(el);
    if (rowScore !== null) return rowScore;
    const parts = [];
    const lab = findLabel(el, doc);
    if (lab) parts.push(lab);
    let p = el.parentElement;
    for (let i = 0; i < 6 && p; i++, p = p.parentElement) {
      parts.push((p.innerText || '').replace(/\s+/g, ' '));
      if (p.tagName === 'TR' || p.tagName === 'TABLE') break;
    }
    const ctx = parts.join(' ').replace(/\s+/g, ' ');
    let m = ctx.match(/满分\s*[:：]?\s*(\d+\.?\d*)/);
    if (!m) m = ctx.match(/(\d+\.?\d*)\s*分?\s*[（(]?\s*满分/);
    if (!m) m = ctx.match(/最高\s*[:：]?\s*(\d+\.?\d*)/);
    if (!m) m = ctx.match(/(\d+\.?\d*)\s*分/);
    return m ? parseFloat(m[1]) : null;
  }
  function guessMax(el, doc) {
    doc = doc || el.ownerDocument;
    if (el.tagName !== 'SELECT' && el.type !== 'radio') {
      const maxAttr = el.getAttribute && el.getAttribute('max');
      if (maxAttr !== null && maxAttr !== '' && !isNaN(parseFloat(maxAttr))) return parseFloat(maxAttr);
    }
    const ctxMax = detectMaxFromContext(el, doc);
    if (ctxMax !== null) return ctxMax;
    if (el.tagName === 'SELECT') {
      const opts = Array.from(el.options || []);
      const nums = [];
      for (const o of opts) {
        const t = (o.text || o.textContent || o.value || '');
        const mm = t.match(/(\d+\.?\d*)/);
        if (mm) nums.push(parseFloat(mm[1]));
      }
      if (nums.length) return Math.max.apply(null, nums);
      if (opts.length) return opts.length - 1;
    }
    const ph = (el.getAttribute && el.getAttribute('placeholder')) || '';
    const m2 = ph.match(/(\d+\.?\d*)/);
    if (m2) return parseFloat(m2[1]);
    if (el.type === 'radio') return 1;
    return CFG.fallbackMax;
  }
  function getScoreItems(doc) {
    const raw = $$('input[type="text"], input[type="number"], select, input[type="radio"]', doc);
    const seen = {};
    return raw.filter((el) => {
      if (el.type === 'hidden') return false;
      if (el.type === 'radio') { if (seen[el.name]) return false; seen[el.name] = true; }
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { width: 100, height: 20 };
      return r.width >= 1 && r.width < 320 && r.height >= 1 && r.height < 90;
    }).map((el) => ({ el, max: guessMax(el, doc) }));
  }
  function pickSelectMax(el) {
    const opts = Array.from(el.options || []);
    if (!opts.length) return -1;
    let best = -1, bestVal = -Infinity;
    opts.forEach((o, i) => {
      const t = (o.text || o.textContent || o.value || '');
      const m = t.match(/(\d+\.?\d*)/);
      if (m && parseFloat(m[1]) > bestVal) { bestVal = parseFloat(m[1]); best = i; }
    });
    if (best >= 0) return best;
    return 0;
  }
  function dispatch(el, type) {
    try {
      const win = (el.ownerDocument && el.ownerDocument.defaultView) || window;
      el.dispatchEvent(new win.Event(type, { bubbles: true }));
    } catch (e) {}
  }
  async function fillScores(items) {
    for (const { el, max } of items) {
      try {
        if (el.tagName === 'SELECT') {
          const idx = pickSelectMax(el);
          if (idx >= 0) { el.selectedIndex = idx; dispatch(el, 'change'); }
        } else if (el.type === 'radio') {
          const g = el.ownerDocument.querySelectorAll('input[type="radio"][name="' + el.name + '"]');
          if (g.length) { const last = g[g.length - 1]; last.checked = true; dispatch(last, 'change'); }
        } else {
          el.value = String(max);
          dispatch(el, 'focus');
          dispatch(el, 'input');
          dispatch(el, 'change');
          dispatch(el, 'blur');
        }
      } catch (e) {}
    }
  }

  // ===== 页面动作 =====
  async function openNextCourse() {
    const courses = getCourses();
    if (!courses.length) { setRunning(false); status('✅ 没有待评课程了，全部完成！'); return; }
    const c = courses[0];
    status('准备进入：' + c.name + ' ' + (c.teacher || ''));
    const win = getWinForDoc(c.doc);
    if (c.href) { try { win.location.href = c.href; return; } catch (e) {} }
    try { c.btn.click(); } catch (e) {}
  }

  async function autoFillScorePage() {
    const doc = findScoreDoc();
    if (!doc) {
      status('⚠ 当前页像是评分页，但未识别到评分项。请点【诊断】/【导出结构】发我分析。');
      return;
    }
    const items = getScoreItems(doc);
    if (!items.length) {
      status('⚠ 当前页像是评分页，但未识别到评分项。请点【诊断】/【导出结构】发我分析。');
      return;
    }
    log('识别 ' + items.length + ' 项，满分 [' + items.map((x) => x.max).join(',') + ']');
    items.forEach((it) => {
      const label = (it.el.closest && it.el.closest('tr') && it.el.closest('tr').innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      log('  → ' + (label || '评分项') + ' : ' + it.max);
    });
    await fillScores(items);
    await sleep(CFG.waitAfterFill);
    status('✅ 已自动打满分。请手动点击【提交】并确认；确认返回列表后脚本会自动进入下一门。');
  }

  // ===== 核心：根据当前页面做单步处理 =====
  async function processCurrentPage() {
    if (!isRunning()) { status('⏸ 当前未启动。进入「学生评价」列表页后点【执行】开始。'); return; }
    if (isScorePage()) { await autoFillScorePage(); return; }
    if (isListPage()) { await openNextCourse(); return; }
    status('⏸ 当前既不是列表页也不是评分页。请进入「学生评价」列表页后点【执行】。');
  }

  // ===== 诊断 =====
  function frameTree(indent, root) {
    const out = [];
    for (const f of allFrames(root)) {
      let label = f.tagName.toLowerCase();
      if (f.id) label += '#' + f.id;
      if (f.name) label += '[name=' + f.name + ']';
      const src = f.getAttribute && f.getAttribute('src');
      let loc = '';
      try { loc = (f.contentWindow && f.contentWindow.location && f.contentWindow.location.href) || ''; } catch (e) {}
      const where = loc ? loc.split('/').slice(-1)[0] : (src || '(空)');
      out.push(indent + '- ' + label + ' → ' + where);
      try {
        const d = f.contentDocument || (f.contentWindow && f.contentWindow.document);
        if (d && d !== root && d !== document) out.push(...frameTree(indent + '    ', d));
      } catch (e) { out.push(indent + '    (跨域，访问不到)'); }
    }
    return out;
  }
  function diagnose() {
    const lines = [];
    lines.push('地址: ' + location.href);
    lines.push('== 框架结构 ==');
    lines.push('顶层文档标题: ' + (document.title || '(无)'));
    const tree = frameTree('', document);
    if (tree.length) lines.push(...tree);
    else lines.push('  （无 iframe/frame，或访问被跨域限制）');
    lines.push('== 页面识别 ==');
    const scoreDoc = findScoreDoc();
    const list = findListTable();
    if (scoreDoc) {
      const items = getScoreItems(scoreDoc);
      lines.push('页面类型: 评分页 (在 ' + (scoreDoc === document ? '顶层' : '某框架') + ')');
      lines.push('识别评分项: ' + items.length + ' 个');
      items.forEach((it, i) => {
        const label = (it.el.closest && it.el.closest('tr') && it.el.closest('tr').innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        lines.push('  ' + (i + 1) + '. ' + (label || '评分项') + ' → 满分 ' + it.max);
      });
    } else if (list) {
      const courses = getCourses();
      lines.push('页面类型: 列表页 (在 ' + (list.doc === document ? '顶层' : '某框架') + ')');
      lines.push('识别待评课程(链接文字=评价): ' + courses.length + ' 门');
      courses.forEach((c, i) => lines.push('  ' + (i + 1) + '. ' + c.name + ' ' + (c.teacher || '') + (c.href ? '  [' + c.href + ']' : '')));
      if (!courses.length) lines.push('  （若实际还有未评课程，说明「评价」链接文字判断需校准，请导出结构发我）');
    } else {
      lines.push('页面类型: 其他（既非列表也非评分页）');
      let totalTables = 0;
      for (const d of scanFrames()) totalTables += $$('table', d).length;
      lines.push('递归扫描到的文档数: ' + scanFrames().length);
      lines.push('各文档表格总数: ' + totalTables);
    }
    log('—— 诊断 ——');
    lines.forEach((l) => log(l));
    log('—— 诊断结束 ——');
  }

  function exportHtml() {
    try {
      const html = document.documentElement.outerHTML;
      const blob = new Blob([html], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'csly_eval_dump.html';
      a.click();
      URL.revokeObjectURL(a.href);
      log('已导出页面结构：csly_eval_dump.html');
    } catch (e) { log('导出失败：' + e.message); }
  }

  // ===== 启动 =====
  function boot() {
    initPanel();
    log('面板已加载。当前地址：' + location.href);
    if (isRunning()) {
      status('🔄 评教运行中，自动处理当前页面…');
      processCurrentPage();
    } else {
      status('步骤：① 在本页手动登录 → 进入「学生评价」列表页；② 点【执行】开始自动评教。可先点【诊断】确认页面识别正确。');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();