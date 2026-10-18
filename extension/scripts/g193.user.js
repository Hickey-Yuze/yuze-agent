(function () {
  'use strict';

  /* ============================================================
   *  SuiyeNote 随页摘录 — 代码基线
   *  ----------------------------------------------------------
   *  TABBIT 适配版（inject_tabbit.js）：
   *  - 目标环境：Tabbit AI 浏览器「脚本妙招」/ DevTools 控制台
   *    （evaluate_script 不可用时的替代注入通道）
   *  - 与 inject_v1.8.6.js 完全同源，仅增量：
   *      a. 注入后页面右下角提示条「随页摘录已注入 ✓」（可见反馈，
   *         因为 Tabbit 执行环境无返回值通道）
   *      b. init 失败同样以提示条 + console.error 呈现
   *      c. IIFE 返回值保留但不再依赖（语义上无宿主消费）
   *  - 使用方式：整段复制 → Tabbit 脚本妙招或控制台执行；
   *    刷新页面后重新执行一次即可（数据在 localStorage，不丢）
   *  ----------------------------------------------------------
   *  五层架构：
   *    注入层   IIFE + 防重入 + Shadow DOM 宿主（样式全部进 shadowRoot）
   *    采集层   SelectionBridge：mouseup→选区浮钮→结构化引用（主文档选区采集）
   *    编辑层   工具栏插入器 + 快捷键 + 语法高亮 overlay
   *    语义核心 DataPipe（唯一数据源）/ DirtyGuard（唯一脏状态）
   *             Lifecycle（唯一生命周期，三钩子落盘）/ scheduleSave（唯一持久化调度）
   *    可靠性   四级状态栏 + 容量监控 + 备份提醒 + 数据迁移（nb_notes → tabbit_nb_v2）
   *  ----------------------------------------------------------
   *  版本史流水账已外移：docm/随页摘录-V1.8-问题清单与排期.md
   *  ============================================================ */

  // ---------- 防重入 ----------
  if (window.__NB_INJECTED__) return;
  window.__NB_INJECTED__ = true;

  // ---------- Tabbit 适配：可见反馈（执行环境无返回值通道） ----------
  function notify(msg, ms) {
    try {
      if (typeof console !== 'undefined') console.log('[SuiyeNote]', msg);
      var t = document.createElement('div');
      t.textContent = msg;
      t.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;' +
        'background:#1f2937;color:#fff;font:12px/1.6 system-ui,sans-serif;' +
        'padding:8px 14px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.25);' +
        'opacity:0;transition:opacity .25s;pointer-events:none;max-width:70vw';
      (document.body || document.documentElement).appendChild(t);
      requestAnimationFrame(function () { t.style.opacity = '1'; });
      setTimeout(function () {
        t.style.opacity = '0';
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
      }, ms || 2600);
    } catch (e) { /* 反馈失败不影响注入 */ }
  }

  var VER = (function () {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
        var mv = chrome.runtime.getManifest().version;
        if (mv) return mv;
      }
    } catch (err) { }
    return '1.8.8.01';  // V1.8.8.01 用户拍板：与 manifest 同步（P2-34 单源纪律）
  })();
  var STORAGE_KEY = 'tabbit_nb_v2';          // 决策 D：v2 key
  // FB_ENDPOINT：反馈直接投递端点（2026-08-11 渠道拍板=嵌入浏览器直投，推荐 Formspree 免费档
  // https://formspree.io/f/xxxx，注册后取 form id 填此常量，反馈落作者邮箱）。留空=发送按钮降级为复制（未配置态）。
  var FB_ENDPOINT = '';
  var CUR_KEY = 'tabbit_nb_v2_cur';
  var BACKUP_KEY = 'tabbit_nb_backup_at';    // 上次导出时间戳
  var DISK_KEY = 'tabbit_nb_disk_v1';        // P0.5 自动落盘开关记忆（'1'=开）
  var IDB_NAME = 'tabbit_nb_idb';            // P1-29 方案 A：IndexedDB 句柄持久化库名（FileSystemFileHandle 结构化可克隆）
  var IDB_STORE = 'handles';                 // P1-29 方案 A：objectStore（key='disk' 存磁盘句柄）
  var STATS_KEY = 'tabbit_nb_stats_v2';      // V1.8.6.4 埋点（本机无痕计数，不上报）
  var OLD_KEYS = [['nb_notes', 'nb_cur'], ['tabbit_nb_v1', null]]; // 兼容旧数据源
  var SAVE_DEBOUNCE = 700;                   // 防抖 ms
  var CAP_LIMIT = 5 * 1024 * 1024;           // 容量基准 5MB
  var CAP_WARN = CAP_LIMIT * 0.8;            // 80% 预警阈值
  var BACKUP_DAYS = 7;                       // 导出提醒天数
  var PANEL_MIN_W = 320, PANEL_MAX_W = 560;  // 宽度拖拽范围（默认 360px 见 CSS .nb-panel）
  var FAB_KEY = 'tabbit_nb_fab_pos';         // V1.8.6.6 mini FAB 拖拽位置持久化
  var TRANS_KEY = 'tabbit_nb_trans_v2';      // V1.8.6.14 面板透明度档位持久化（0=不透明 1=50% 2=18%）
  var FONT_KEY = 'tabbit_nb_font_v2';        // V1.8.6.20 编辑器字号档位持久化（0=12px 1=14px 2=16px）
  var W_KEY = 'tabbit_nb_dock_w_v1';         // V1.8.7.6 P0-1 停靠态左缘拖拽宽度持久化（px，320~560）
  var H_KEY = 'tabbit_nb_h_v1';              // V1.8.7.1 P2-30 悬浮态高度持久化（px，240~视口钳制）
  var PANEL_RECT_KEY = 'tabbit_nb_rect_v1';  // V1.8.7.1 P2-30 悬浮态位置/尺寸持久化（拉伸与移动共用）
  var EDGE_DIRS = ['N', 'S', 'E', 'W', 'NW', 'NE', 'SW', 'SE'];  // V1.8.7.1 P2-30 八方向拉伸（模块级，buildUI 外引用）
  var EDGE_TIPS = { N: '拖拽调整上边', S: '拖拽调整高度', E: '拖拽调整右边', W: '拖拽调整左边', NW: '拖拽对角拉伸', NE: '拖拽对角拉伸', SW: '拖拽对角拉伸', SE: '拖拽对角拉伸' };

  // ---------- 全局状态 ----------
  var NOTES = [];
  var cur = -1;
  var storageOK = true;   // 隐私模式降级检测
  var floating = false;
  var folded = false;
  var hlEnabled = false;
  var fullscreen = false;   // V1.8.7.1 P2-29 全屏模式
  var mode = 'edit';      // edit | preview | split
  var selCache = '';      // 选区浮钮缓存文本
  var _noSelHintAt = 0;   // P2-9：web component 选区降级提示节流时间戳
  var NO_SEL_HINT_MS = 10000;   // P2-9：同类提示 10s 内不重复（防连续 mouseup 刷屏）
  var fabTimer = null;    // V1.8.6.6 mini FAB 长按新建计时器
  var askBar = null;      // V1.8.6.4 摘录归属询问条
  var pendingQuote = '';  // V1.8.6.4 待归属摘录快照
  var diskHandle = null;   // P0.5 自动落盘 FileSystemFileHandle（会话内持有，跨刷新失效）
  var diskOn = false;      // P0.5 会话内生效开关
  var diskFailShownAt = 0; // P0.5 写盘失败提示节流时间戳
  var diskPendingHandle = null;  // P1-29 方案 A（2026-08-09）：IDB 持久句柄待授权（queryPermission='prompt'，点击菜单项 requestPermission 恢复，免重选文件）
  var delqEl = null;       // P2-35 删除确认条（自定义层，替代 window.confirm）
  var delPendingIdx = -1;  // P2-35 待删索引
  var dgEl = null;         // P2-13 未保存离开确认条（自定义层，替代 DirtyGuard 内的 window.confirm）
  var dgAction = null;     // P2-13 待确认动作（确认后执行）

  // P2-17 内联 SVG 图标集（跨平台渲染一致；emoji 在 Linux 黑白方块=像坏了）
  var NB_ICONS = {
    nb: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="14" y2="12"/><path d="M17 14.5l3.5 3.5-1.6 1.6-3.5-3.5z" fill="currentColor" stroke="none"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2c3 0 5 2.5 5 5.5 0 2.4-1.4 4.4-3.5 5.7V19l-1.5 3-1.5-3v-5.8C8.4 11.9 7 9.9 7 7.5 7 4.5 9 2 12 2z"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z"/></svg>',
    trans: '<svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 3a7 7 0 0 0 0 14z"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5"/></svg>',
    scissors: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="8.5" y1="8" x2="21" y2="19"/><line x1="8.5" y1="16" x2="21" y2="5"/></svg>',
    copy: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    disk: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/></svg>',
    fs: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M20 15v5h-5M9 20H4v-5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/></svg>',  // #27 反馈图标（气泡=留言）
    fold: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'  // P4-27：折叠按钮图标（向下箭头=收起面板），替换原 '—' 文本（16px 等宽横线在 13px 按钮里易被误读为文字）
  };
  function iconSvg(name) {
    return '<span class="nb-ic">' + (NB_ICONS[name] || '') + '</span>';
  }

  // ---------- DOM 引用（shadow 内）----------
  var host, root, panel, header, titleInput;
  var capsuleBtn, capsuleTxt, capSearch, noteList, listSz, capFilter = '';
  var _kbSel = -1, _kbResults = [];  // V1.8.7.4 P2-22② 迷你版：搜索框 ↑/↓ 键盘选中（_kbSel=过滤结果位置，_kbResults=结果 data-idx 集）
  var listsec;  // V1.8.7.1 P2-31：模块级（setListOpen 在 buildUI 外引用）
  var splitTab, viewToggleBtn, editWrap, previewWrap, splitBody, ta, preview, hlLayer;
  var outlineEl;   // P1-9#2 大纲树（V1.8.8 检索 P0：预览模式标题导航）
  var pinBtn, foldBtn, closeBtn, moreBtn, moreMenu, hlItem, transItem, fsItem, delItem, introItem, introMenu;
  var fbItem, fbMenu;   // #27 反馈通道（2026-08-11 三合一：⋮ 菜单「💬 反馈」→ 反馈浮层，四问画像 + 复制反馈文本）
  var copyBtn, dlBtn, dlMenu;
  var aboutMenu, brandBtn;  // P2-21 品牌触点：关于浮层 + 品牌按钮
  var countEl, statusText, statusDot, addBtn;
  var floatBtn, miniFab, resizeBar, resizeHandles;
  var toolbar;
  var fontBtn;    // V1.8.6.20 编辑器字号三档切换（底部状态栏右区）
  var focusCapSearch;  // 2026-08-08 九轮运行时验证：buildUI 局部函数被 startFabDrag（模块级）引用 → ReferenceError → 提升模块级

  // ---------- 动态页面信息（C 模块）----------
  var pageUrl = '';
  var pageTitle = '';
  var pageHost = '';
  try {
    pageUrl = window.location.href || '';
    pageTitle = document.title || '';
    pageHost = window.location.host || '';
  } catch (e) { /* 跨域等异常静默 */ }

  /* ============================================================
   *  工具函数
   * ============================================================ */
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  var ttPolicy = null;
  var ttBlocked = false;
  function setHTML(el, html) {
    try {
      if (typeof window !== 'undefined' && window.trustedTypes && window.trustedTypes.createPolicy) {
        if (!ttPolicy) {
          ttPolicy = window.trustedTypes.createPolicy('suiye-note', { createHTML: function (s) { return s; } });
        }
        el.innerHTML = ttPolicy.createHTML(html);
        return;
      }
    } catch (e) { /* 页面 trusted-types 白名单拒绝 → 落到下方 raw 赋值再试 */ }
    try {
      el.innerHTML = html; // 回退：无 trustedTypes / 策略创建被拒 → 直接赋值（隔离世界不被强制，主世界可能再抛）
    } catch (e) {
      ttBlocked = true; // 主世界 CSP 白名单不含 suiye-note：raw 赋值也被拦 → 置位供 init 降级提示
    }
  }
  function genId() {
    return 'nb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  /* V1.8.6.4 行为埋点：本机无痕计数，不上报任何数据；
   * 北极星 = 周活跃摘录数（wQuote，7 天滚动窗口） */
  function track(ev) {
    try {
      var s = JSON.parse(localStorage.getItem(STATS_KEY) || 'null') || {};
      var now = Date.now();
      if (!s.wAt || now - s.wAt > 7 * 24 * 3600 * 1000) { s.wAt = now; s.wQuote = 0; }
      if (ev === 'quote') { s.quote = (s.quote || 0) + 1; s.wQuote = (s.wQuote || 0) + 1; }
      else if (ev === 'export') { s.export = (s.export || 0) + 1; }
      else if (ev === 'search') { s.search = (s.search || 0) + 1; }
      localStorage.setItem(STATS_KEY, JSON.stringify(s));
    } catch (e) { /* 静默 */ }
  }
  function chCount(s) {
    var c = 0, i = 0, ch;
    for (; i < s.length; i++) { ch = s.charCodeAt(i); if (ch > 32 || ch === 10 || ch === 13) c++; }
    return c;
  }
  function todayStr() {
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function nowStamp() { // 秒级时间戳（快照唯一命名，防同日导出覆盖）
    var d = new Date();
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  }
  function fmtDate(ts) {
    var d = new Date(ts);
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    return (d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // 导出用：清洗 Markdown 语法标记（V1.6 toText 规格）
  function toPlainText(md) {
    var lines = String(md || '').split('\n'), out = [], i, l, parts, j, lb, rb, rp;
    for (i = 0; i < lines.length; i++) {
      l = lines[i];
      // 标题 # 前缀
      var hc = 0;
      while (l.charAt(hc) === '#') hc++;
      if (hc > 0 && l.charAt(hc) === ' ') l = l.slice(hc + 1);
      // 行内代码 / 加粗 / 斜体（奇偶剥离）
      var keep;
      parts = l.split('`'); keep = [];
      for (j = 0; j < parts.length; j++) { if (j % 2 === 0) keep.push(parts[j]); }
      l = keep.join('');
      parts = l.split('**'); keep = [];
      for (j = 0; j < parts.length; j++) { if (j % 2 === 0) keep.push(parts[j]); }
      l = keep.join('');
      parts = l.split('*'); keep = [];
      for (j = 0; j < parts.length; j++) { if (j % 2 === 0) keep.push(parts[j]); }
      l = keep.join('');
      // 引用前缀
      if (l.charAt(0) === '>' && l.charAt(1) === ' ') l = l.slice(2);
      // 待办/列表/有序前缀（含嵌套缩进保留为空格；待办须先于无序列表剥离）
      l = l.replace(/^(\s*)- \[\s*\]\s+/, '$1');
      l = l.replace(/^(\s*)[-*+]\s+/, '$1');
      l = l.replace(/^(\s*)\d+\.\s+/, '$1');
      // 链接 [text](url) → text (url)
      lb = l.indexOf('['); rb = lb >= 0 ? l.indexOf('](', lb + 1) : -1; rp = rb > 0 ? l.indexOf(')', rb + 2) : -1;
      if (lb === 0 && rb > lb && rp > rb) l = l.slice(lb + 1, rb) + ' (' + l.slice(rb + 2, rp) + ')';
      out.push(l);
    }
    return out.join('\n');
  }

  /* ============================================================
   *  Markdown 渲染（预览区）
   * ============================================================ */
  // V1.8.6.5 协议白名单（P0.5-20）：拦截 javascript:/data: 等可执行协议
  function safeUrl(u) {
    var s = String(u || '').trim();
    return /^(https?:\/\/|mailto:)/i.test(s) ? s : '';
  }
  function inlineFmt(s) {
    var out = '', i = 0, c, cEnd, cb, cp, bEnd, iEnd;
    while (i < s.length) {
      c = s[i];
      if (c === '`') {
        cEnd = s.indexOf('`', i + 1);
        if (cEnd !== -1) {
          out += '<code class="nb-inline-code">' + escHtml(s.slice(i + 1, cEnd)) + '</code>';
          i = cEnd + 1; continue;
        }
      }
      if (c === '[') {
        cb = s.indexOf(']', i);
        if (cb !== -1 && s[cb + 1] === '(') {
          cp = s.indexOf(')', cb + 2);
          if (cp !== -1) {
            var u = safeUrl(s.slice(cb + 2, cp));
            if (u) {
              out += '<a href="' + escHtml(u) + '" target="_blank" rel="noopener" class="nb-link">' +
                     escHtml(s.slice(i + 1, cb)) + '</a>';
            } else {
              out += escHtml(s.slice(i, cp + 1));
            }
            i = cp + 1; continue;
          }
        }
      }
      if (c === '*' && s[i + 1] === '*') {
        bEnd = s.indexOf('**', i + 2);
        if (bEnd !== -1) { out += '<strong>' + inlineFmt(s.slice(i + 2, bEnd)) + '</strong>'; i = bEnd + 2; continue; }
      }
      if (c === '*' && s[i + 1] !== '*') {
        iEnd = s.indexOf('*', i + 1);
        if (iEnd !== -1) { out += '<em>' + inlineFmt(s.slice(i + 1, iEnd)) + '</em>'; i = iEnd + 1; continue; }
      }
      out += escHtml(c);
      i++;
    }
    return out;
  }

  function renderMd(src) {
    var lines = String(src || '').split('\n');
    var html = '', inCode = false, codeBuf = [], i, line, hm;
    var olSeq = 0, olNest = -1; // 有序列表序号：连续同层递增、嵌套重计、其他行重置（主流预览行为）
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (/^\s*```/.test(line)) {
        if (inCode) { html += '<pre class="nb-code"><code>' + escHtml(codeBuf.join('\n')) + '</code></pre>'; codeBuf = []; inCode = false; }
        else { inCode = true; }
        continue;
      }
      if (inCode) { codeBuf.push(line); continue; }
      // 非有序行重置序号（任意块类型打断递增，与主流预览一致）
      if (!/^\s*\d+\.\s+/.test(line)) { olSeq = 0; olNest = -1; }
      if (/^\s*- \[( |x|X)\] /.test(line)) {
        var checked = line.trim()[3] !== ' ';
        var nestT = 0;
        var mT = line.match(/^(\s+)/);
        if (mT) nestT = Math.min(3, Math.floor(mT[1].length / 2));
        var stT = nestT > 0 ? ' style="margin-left:' + (nestT * 16) + 'px"' : '';
        html += '<label class="nb-todo"' + stT + '><input type="checkbox" data-line="' + i + '"' + (checked ? ' checked' : '') + '>' +
          '<span' + (checked ? ' class="nb-todo-done"' : '') + '>' + inlineFmt(line.replace(/^\s*- \[[ xX]\] /, '')) + '</span></label>';
        continue;
      }
      if (/^>\s?/.test(line)) {
        html += '<blockquote class="nb-quote">' + inlineFmt(line.replace(/^>\s?/, '')) + '</blockquote>';
        continue;
      }
      if (/^---+$/.test(line.trim())) { html += '<hr>'; continue; }
      hm = line.match(/^(#{1,4})\s+(.*)/);
      if (hm) {
        var lv = hm[1].length;
        html += '<h' + lv + ' class="nb-h' + lv + '">' + inlineFmt(hm[2]) + '</h' + lv + '>';
        continue;
      }
      if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        // 嵌套层级：行首 2 空格缩进（主流笔记：子列表）
        var nest = 0;
        var m2 = line.match(/^(\s+)/);
        if (m2) nest = Math.min(3, Math.floor(m2[1].length / 2));
        var ol = /^\s*\d+\.\s+/.test(line);
        // 序号：嵌套层级变化/打断后新列表 → 从源码 marker 数字继续（与编辑态文本一致，如被打断的 2. 仍渲染 2.）；
        // 连续同层 → 递增（主流行为）
        if (ol) {
          var marker = parseInt(line.match(/^\s*(\d+)\.\s+/)[1], 10) || 1;
          if (nest !== olNest) { olSeq = marker; } else { olSeq++; }
          olNest = nest;
        }
        var body = ol ? line.replace(/^\s*\d+\.\s+/, '') : line.replace(/^\s*[-*+]\s+/, '');
        var bullet = ol ? (olSeq + '.') : '•';
        var lsStyle = nest > 0 ? ' style="margin-left:' + (nest * 16) + 'px"' : '';
        html += '<div class="nb-li"' + lsStyle + '>' + bullet + ' ' + inlineFmt(body) + '</div>';
        continue;
      }
      if (!line.trim()) { html += '<div style="height:8px"></div>'; continue; }
      html += '<p>' + inlineFmt(line) + '</p>';
    }
    if (inCode && codeBuf.length) html += '<pre class="nb-code"><code>' + escHtml(codeBuf.join('\n')) + '</code></pre>';
    return html;
  }

  /* ============================================================
   *  语法高亮渲染（编辑态 overlay，hl-layer 方案）
   *  只包裹 token（span），绝不改变字符内容，保证与 textarea
   *  逐字符对齐；末行不追加换行，避免多出一个空行高度
   * ============================================================ */
  // 剥符号修的只是观感症状，却引入行内错位：**加粗** 6 字符渲染成「加粗」2 字符宽，
  // 破坏「字符零改动」对齐不变量。恢复 V1.8.6.2 包符号（token 含标记符号整体包裹，
  // 输出字符与原文逐字符相等），保留 V1.8.7.1 新增的嵌套递归（**粗 *斜* 体** 内层再包裹）
  function hlInline(s) {
    var out = '', i = 0, c, ce, cb, cp, be, ie;
    while (i < s.length) {
      c = s[i];
      if (c === '`') {
        ce = s.indexOf('`', i + 1);
        if (ce !== -1) { out += '<span class="hl-code">' + escHtml(s.slice(i, ce + 1)) + '</span>'; i = ce + 1; continue; }
      }
      if (c === '[') {
        cb = s.indexOf(']', i);
        if (cb !== -1 && s[cb + 1] === '(') {
          cp = s.indexOf(')', cb + 2);
          if (cp !== -1) { out += '<span class="hl-link">' + escHtml(s.slice(i, cp + 1)) + '</span>'; i = cp + 1; continue; }
        }
      }
      if (c === '*' && s[i + 1] === '*') {
        be = s.indexOf('**', i + 2);
        if (be !== -1) { out += '**<span class="hl-b">' + hlInline(s.slice(i + 2, be)) + '</span>**'; i = be + 2; continue; }
      }
      if (c === '*' && s[i + 1] !== '*') {
        ie = s.indexOf('*', i + 1);
        if (ie !== -1) { out += '*<span class="hl-i">' + hlInline(s.slice(i + 1, ie)) + '</span>*'; i = ie + 1; continue; }
      }
      out += escHtml(c);
      i++;
    }
    return out;
  }

  var _hlTimer = null;
  function scheduleHL() {
    if (!hlEnabled) return;
    clearTimeout(_hlTimer);
    _hlTimer = setTimeout(syncHL, 60);
  }

  function renderHL(src) {
    var lines = String(src || '').split('\n');
    var parts = [], i, line, inCode = false;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (/^```/.test(line)) { inCode = !inCode; parts.push('<span class="hl-code">' + escHtml(line) + '</span>'); continue; }
      if (inCode) { parts.push('<span class="hl-code">' + escHtml(line) + '</span>'); continue; }
      if (/^(#{1,4})\s+/.test(line)) {
        var lv = line.match(/^(#{1,4})\s+/)[1].length;
        parts.push('<span class="hl-h' + lv + '">' + hlInline(line) + '</span>');
        continue;
      }
      if (/^>\s?/.test(line)) { parts.push('<span class="hl-quote">' + hlInline(line) + '</span>'); continue; }
      if (/^\s*- \[( |x|X)\] /.test(line)) { parts.push('<span class="hl-todo' + (line.trim()[3] === ' ' ? '-pending' : '-done') + '">' + hlInline(line) + '</span>'); continue; }
      if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) { parts.push('<span class="hl-list">' + hlInline(line) + '</span>'); continue; }
      parts.push(line.trim() ? hlInline(line) : '');
    }
    return parts.join('\n');
  }

  /* ============================================================
   *  CSS（全部注入 shadowRoot，与宿主页零冲突）
   * ============================================================ */
  var CSS_TEXT = [
    ':host{all:initial;',
    '--panel-bg:#FAFAFA;--card-bg:#fff;--accent:#1E6BE4;--primary:#8BB4F8;',
    '--success:#2E8B57;--warning:#B07A00;--destructive:#E65C53;',
    '--text-danger:#B3261E;--text-warning:#8a6d00;',  // P2-8 修复（2026-08-11）：警告/危险文字专用深色（#EBA400 在浅底对比度仅 1.6:1；#8a6d00 约 5.4:1）
    '--text-primary:#1a1a1a;--text-secondary:#555;--text-tertiary:#757575;',  // P4-24：tertiary #999→#757575（#999 on #FAFAFA 2.5:1 不达 3:1；#757575 约 4.6:1）
    '--intensity-4:rgba(0,0,0,.04);--intensity-6:rgba(0,0,0,.06);--intensity-8:rgba(0,0,0,.08);',
    '--intensity-10:rgba(0,0,0,.10);--intensity-12:rgba(0,0,0,.12);--shadow:rgba(0,0,0,.12);',
    'font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--text-primary)}',
    '*{box-sizing:border-box}',
    /* V1.8.6.18 :root 在 shadow 内不匹配任何元素（文档树根选择器）→ 变量从未生效、面板背景恒为透明；
       改 :host 定义（宿主元素，shadow 后代可继承）——此缺陷被 6 组静态断言全部漏检（盲区：断言不覆盖 CSS 生效性） */
    '@media(prefers-color-scheme:dark){:host{',
    '--panel-bg:#2b2b2d;--card-bg:#333;--accent:#4C8DF6;--primary:#7FA8F5;--text-primary:rgba(255,255,255,.85);--text-secondary:rgba(255,255,255,.55);',
    '--text-tertiary:rgba(255,255,255,.45);--text-danger:#E8776F;--text-warning:#E5B94F;--intensity-4:rgba(255,255,255,.05);--intensity-6:rgba(255,255,255,.07);',  // P4-24：暗色 tertiary alpha .35→.45（#2b2b2d 底上 .35 ≈2.6:1 不达 3:1；.45 ≈3.4:1）
    '--intensity-8:rgba(255,255,255,.09);--intensity-10:rgba(255,255,255,.12);--intensity-12:rgba(255,255,255,.15);',
    '--shadow:rgba(0,0,0,.4)}}',
    /* 根容器 */
    '.nb-root{position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;pointer-events:none}',
    ':host > *{pointer-events:auto}',
    '.nb-panel{position:absolute;top:0;right:0;bottom:0;width:360px;min-width:320px;max-width:560px;',
    'background:var(--panel-bg);border-left:1px solid var(--intensity-12);',
    'box-shadow:-4px 0 16px var(--shadow);display:flex;flex-direction:column;overflow:hidden;',
    'pointer-events:auto;font-size:12px}',
    /* V1.8.6.15 展开=激活态：左缘 3px accent 高亮条强化边界感知（resizeBar 在其上层，拖动不受影响） */
    '.nb-panel::after{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--accent);opacity:.85}',
    /* V1.8.6.14 条件透明度：color-mix 基于当前主题色实时混合，自动适配亮/暗；档位 1=半透明 50%、2=高透明 18% */
    '.nb-panel.nb-trans-1{--panel-bg:color-mix(in srgb,var(--panel-bg) 50%,transparent);--card-bg:color-mix(in srgb,var(--card-bg) 45%,transparent)}',
    '.nb-panel.nb-trans-2{--panel-bg:color-mix(in srgb,var(--panel-bg) 18%,transparent);--card-bg:color-mix(in srgb,var(--card-bg) 16%,transparent)}',
    /* V1.8.6.15 高透明档可读性防护：双层投影同时兜底亮/暗主题文字（深色文字白晕垫底、浅色文字黑影勾勒） */
    '.nb-panel.nb-trans-2, .nb-panel.nb-trans-2 *{text-shadow:0 1px 2px rgba(0,0,0,.35),0 0 2px rgba(255,255,255,.5)}',
    '.nb-resize{position:absolute;left:0;top:0;bottom:0;width:8px;cursor:col-resize;z-index:5}',
    '.nb-resize:hover{background:var(--intensity-8)}',
    '.nb-resize.active{background:var(--intensity-12);box-shadow:inset 0 0 0 1px var(--intensity-16)}',
    /* 通用按钮 */
    '.tbtn{height:26px;min-width:26px;padding:0 8px;border:1px solid var(--intensity-10);border-radius:7px;',
    'background:var(--card-bg);color:var(--text-primary);font-size:11px;cursor:pointer;',
    'display:inline-flex;align-items:center;justify-content:center;gap:3px;font-family:inherit;',
    'box-shadow:0 1px 2px var(--shadow);transition:background .15s;flex-shrink:0}',
    '.tbtn:hover{background:var(--intensity-6)}',
    '.nb-ic{display:inline-flex;line-height:0}',
    '.tbtn.on{background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent);border-color:color-mix(in srgb,var(--accent) 30%,transparent)}',
    '.tbtn.primary{background:var(--accent);color:#fff;border-color:transparent;box-shadow:0 2px 6px color-mix(in srgb,var(--accent) 35%,transparent)}',
    /* Header */
    '.nb-header{display:flex;align-items:center;gap:5px;padding:8px 10px 4px;cursor:grab;user-select:none}',
    '.nb-header:active{cursor:grabbing}',
    '.nb-brand{font-size:10px;font-weight:600;color:var(--text-secondary);white-space:nowrap;flex-shrink:0;letter-spacing:.5px;background:none;border:0;padding:0;cursor:pointer;font-family:inherit;transition:color .15s}',
    '.nb-brand:hover{color:var(--accent)}',
    /* P2-21 品牌触点：关于浮层（版本/数据/定位，点击品牌打开） */
    '#aboutMenu{display:none;position:absolute;top:36px;left:10px;width:190px;background:var(--card-bg);',
    'border:1px solid var(--intensity-10);border-radius:10px;box-shadow:0 8px 20px var(--shadow);padding:10px 12px;z-index:41}',
    '.nb-about-name{font-size:13px;font-weight:700;color:var(--text-primary)}',
    '.nb-about-ver{font-size:10px;color:var(--text-tertiary);margin-top:2px}',
    '.nb-about-data{font-size:11px;color:var(--text-secondary);margin-top:8px}',
    '.nb-about-tag{font-size:10px;color:var(--text-tertiary);margin-top:6px;line-height:1.5}',
    /* P2-19 ⋮ 更多菜单（收纳低频设置；与 dlMenu 同风格，定位 header 下方右对齐） */
    '#moreMenu{display:none;position:absolute;top:36px;right:10px;width:180px;background:var(--card-bg);',
    'border:1px solid var(--intensity-10);border-radius:10px;box-shadow:0 8px 20px var(--shadow);padding:4px;z-index:41}',
    /* V1.8.14 产品说明浮层（⋮ 更多设置 → 产品说明；精炼自 docm/随页摘录-产品介绍.md） */
    '#introMenu{display:none;position:absolute;top:36px;right:10px;width:280px;max-height:56vh;overflow-y:auto;background:var(--card-bg);',
    'border:1px solid var(--intensity-10);border-radius:10px;box-shadow:0 8px 20px var(--shadow);padding:12px 14px;z-index:41}',
    '.nb-intro-name{font-size:13px;font-weight:700;color:var(--text-primary)}',
    '.nb-intro-slogan{font-size:11px;color:var(--text-secondary);margin-top:4px;line-height:1.6}',
    '.nb-intro-sec{font-size:10px;font-weight:700;color:var(--accent);margin-top:8px}',
    '.nb-intro-line{font-size:11px;color:var(--text-secondary);margin-top:3px;line-height:1.6}',
    '.nb-intro-foot{font-size:10px;color:var(--text-tertiary);margin-top:8px;line-height:1.5;border-top:1px solid var(--intensity-10);padding-top:6px}',
    /* #27 反馈浮层（2026-08-11）：与 introMenu 同构 + 四问输入 + 复制按钮 */
    '#fbMenu{display:none;position:absolute;top:36px;right:10px;width:280px;max-height:56vh;overflow-y:auto;background:var(--card-bg);',
    'border:1px solid var(--intensity-10);border-radius:10px;box-shadow:0 8px 20px var(--shadow);padding:12px 14px;z-index:41}',
    '.nb-fbin{width:100%;box-sizing:border-box;margin-top:2px;padding:2px 6px;font-size:11px;border:1px solid var(--intensity-12);border-radius:5px;background:var(--panel-bg);color:var(--text-primary)}',
    '.nb-fbrow{margin-top:8px;text-align:right}',
    '.nb-fbbtn{padding:4px 14px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid var(--accent);background:var(--accent);color:#fff}',
    '.nb-fbbtn.nb-fbghost{background:transparent;color:var(--accent)}',
    '.more-txt{font-size:11px}',
    '.drag-handle{font-size:15px;color:var(--text-tertiary);cursor:grab;padding:0 2px;line-height:1}',
    '.nb-capsule{border-radius:999px;background:color-mix(in srgb,var(--accent) 12%,transparent);',
    'border:1px solid color-mix(in srgb,var(--accent) 25%,transparent);color:var(--accent);',
    'font-weight:600;font-size:11px;height:24px;padding:0 8px;gap:2px;white-space:nowrap}',
    '.nb-capsule{flex:1.5 1 0;min-width:88px;overflow:hidden;text-overflow:ellipsis}',
    '.nb-title{flex:2.5 1 40px;min-width:40px;height:24px;border:1px solid var(--intensity-8);border-radius:7px;',
    'background:var(--card-bg);color:var(--text-primary);padding:0 8px;font-size:12px;font-weight:600;outline:none;font-family:inherit}',
    '.nb-title:focus-visible,.nb-editor:focus-visible,.nb-capsearch:focus-visible{outline:2px solid var(--accent);outline-offset:1px}',
    /* 模式 Tab */
    '.nb-tab{display:flex;gap:4px;padding:4px 10px}',
    /* V1.8.7.1 P2-44 ③ 高频优先：显示⇄编辑 1.4 > 分屏 1 > 新建 0.8（不再等宽） */
    '.nb-tab .tbtn{flex:1 1 0}',
    '.nb-tab .nb-vt{flex:1.4 1 0;white-space:nowrap}',
    /* 工具栏（V1.8.6.8：flex-wrap + 内容自适应，防窄窗口挤压变形） */
    '.nb-toolbar{display:flex;flex-wrap:wrap;gap:4px;padding:0 10px 2px}',
    '.nb-toolbar .row{display:flex;flex-wrap:wrap;gap:4px;width:100%}',
    '.nb-toolbar .row + .row{margin-top:4px}',
    '.nb-toolbar .tbtn{flex:1 1 auto;min-width:34px;padding:0 6px}',
    '.nb-toolbar .row .tbtn:first-child:nth-last-child(7){flex:1 1 auto}',
    '.nb-toolbar .row .tbtn.off{opacity:.35;filter:grayscale(.7)}',
    /* 编辑/预览区 */
    '.hl-wrap{position:relative;flex:1;min-height:120px;margin:6px 10px;border:1px solid var(--intensity-12);',
    'border-radius:9px;background:var(--card-bg);overflow:hidden}',
    '.hl-layer{position:absolute;top:0;left:0;right:0;bottom:0;padding:10px 12px;overflow:hidden;',
    'font-size:12px;line-height:1.75;font-family:ui-monospace,Menlo,Consolas,monospace;',
    'white-space:pre-wrap;word-wrap:break-word;color:var(--text-primary);display:none;pointer-events:none}',
    '.nb-editor{width:100%;height:100%;border:0;outline:none;resize:none;background:transparent;',
    'padding:10px 12px;font-size:12px;line-height:1.75;font-family:ui-monospace,Menlo,Consolas,monospace;',
    'white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;',
    'color:var(--text-primary);caret-color:var(--accent)}',
    '.nb-preview{display:none;flex:1;min-height:120px;margin:6px 10px;padding:10px 12px;overflow-y:auto;position:relative;',
    'border:1px solid var(--intensity-12);border-radius:9px;background:var(--card-bg);line-height:1.75}',
    /* P1-9#2 大纲树（V1.8 原型 #outline 规格：预览态右上角浮层，150×170 卡片，lv1-4 递进缩进） */
    '#outline{display:none;position:absolute;top:8px;right:10px;width:150px;max-height:170px;overflow-y:auto;',
    'background:var(--card-bg);border:1px solid var(--intensity-10);border-radius:10px;padding:6px 8px;',
    'font-size:11px;box-shadow:0 8px 20px var(--shadow);z-index:20}',
    '#outline b{display:block;color:var(--text-tertiary);font-size:10px;margin-bottom:4px}',
    '#outline div{cursor:pointer;color:var(--text-secondary);padding:2px 4px;border-radius:4px;',
    'white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '#outline div:hover{background:var(--intensity-8);color:var(--text-primary)}',
    '#outline div[data-lv="1"]{padding-left:2px}#outline div[data-lv="2"]{padding-left:11px}',
    '#outline div[data-lv="3"]{padding-left:20px}#outline div[data-lv="4"]{padding-left:29px}',
    /* V1.8.7.1 P2-28 分屏容器（编辑 | 预览 左右 50%） */
    '.nb-splitbody{position:relative;flex:1;min-height:120px;display:flex;gap:6px;padding:6px 10px;min-width:0}',
    '.nb-splitbody .hl-wrap{flex:1 1 50%;margin:0;min-width:0}',
    '.nb-splitbody .nb-preview{flex:1 1 50%;margin:0;min-width:0}',
    /* V1.8.7.1 P2-30 悬浮态八方向拉伸手柄（停靠/全屏态隐藏；边 12px 命中区 + 角 18px 45° 对角）
     * 定位约定：边手柄避开四角（留 14px），角手柄 18px 直角覆盖角部 */
    '.nb-edge{position:absolute;z-index:5;display:none;touch-action:none;background:transparent}',
    '.nb-edge:hover{background:var(--intensity-8)}',
    '.nb-edge.active{background:var(--intensity-12)}',
    '.nb-edge-N{top:0;left:14px;right:14px;height:12px;cursor:ns-resize}',
    '.nb-edge-S{bottom:0;left:14px;right:14px;height:12px;cursor:ns-resize}',
    '.nb-edge-E{right:0;top:14px;bottom:14px;width:12px;cursor:ew-resize}',
    '.nb-edge-W{left:0;top:14px;bottom:14px;width:12px;cursor:ew-resize}',
    '.nb-edge-NW{left:0;top:0;width:18px;height:18px;cursor:nwse-resize}',
    '.nb-edge-NE{right:0;top:0;width:18px;height:18px;cursor:nesw-resize}',
    '.nb-edge-SW{left:0;bottom:0;width:18px;height:18px;cursor:nesw-resize}',
    '.nb-edge-SE{right:0;bottom:0;width:18px;height:18px;cursor:nwse-resize}',
    '.nb-edge-S::before{content:"";position:absolute;left:50%;top:4px;transform:translateX(-50%);width:44px;height:4px;border-radius:2px;background:var(--intensity-10)}',
    '.nb-edge-S:hover::before{background:var(--accent)}',
    /* V1.8.7.1 P2-29 全屏态：覆盖 inline 尺寸接管整个视口 */
    '.nb-panel.nb-fs{top:0!important;left:0!important;right:0!important;bottom:0!important;',
    'width:100vw!important;max-width:none!important;height:100vh!important;border-radius:0!important;border-left:0!important}',
    '.nb-panel.nb-fs .nb-resize,.nb-panel.nb-fs .nb-edge{display:none}',
    '.nb-kbd{font-size:10px;color:var(--text-tertiary);text-align:center;padding:0 10px 4px}',
    /* P2-32 方案 A：actions 行已删除（复制全文并入导出菜单），导出 ▾ 单入口收 footer */
    '#dlMenu{display:none;position:absolute;bottom:44px;right:10px;width:210px;max-height:calc(100% - 80px);overflow-y:auto;background:var(--card-bg);',
    'border:1px solid var(--intensity-10);border-radius:10px;box-shadow:0 8px 20px var(--shadow);padding:4px;z-index:41}',
    '.nb-dlbtn{flex-shrink:0;height:24px;padding:0 10px;font-size:11px;font-weight:600;border-radius:7px;background:var(--accent);border-color:var(--accent);color:#fff;cursor:pointer}',
    '.dl-item{padding:8px 12px;border-radius:6px;font-size:12px;cursor:pointer;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.dl-item:hover{background:var(--intensity-6)}',
    '.dl-item.on{color:var(--accent)}',
    '.dl-item .ext{font-size:10px;color:var(--text-tertiary)}',
    '.dl-sep{height:1px;background:var(--intensity-8);margin:4px 6px}',
    /* 笔记列表区（V1.8.7.1 P2-31 合并：搜索框常驻顶部 + 列表 + 高度拖拽条；胶囊点击收起/展开） */
    '.nb-listsec{padding:4px 10px;display:flex;flex-direction:column;min-height:0;flex:0 0 auto}',
    '.nb-list{flex:0 1 120px;min-height:60px;overflow-y:auto;border:1px solid var(--intensity-8);border-radius:8px;padding:2px;background:var(--card-bg)}',
    '.nb-item{padding:5px 8px;border-radius:6px;font-size:11px;cursor:pointer;color:var(--text-secondary)}',
    '.nb-item:hover{background:var(--intensity-6)}',
    '.nb-item.on{background:var(--intensity-10);color:var(--text-primary);font-weight:600}',
    '.nb-item.kbsel{box-shadow:inset 0 0 0 1px var(--accent);background:var(--intensity-6)}',  // V1.8.7.4 P2-22② 搜索框 ↑/↓ 键盘选中
    '.nb-item .t{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nb-item .m{font-size:9px;color:var(--text-tertiary);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',  // V1.8.7.6 P1-3 host 短显 ellipsis 防溢出
    '.nb-capsearch{width:100%;box-sizing:border-box;height:26px;margin-bottom:4px;padding:0 8px;font-size:11px;',
    'border:.5px solid var(--intensity-10);border-radius:7px;background:var(--card-bg);',
    'color:var(--text-primary);outline:none;flex-shrink:0}',
    /* V1.8.7.1 P2-31 列表高度拖拽条（120px~45vh） */
    '.nb-listsz{height:6px;margin-top:2px;cursor:ns-resize;border-radius:3px;flex-shrink:0}',
    '.nb-listsz:hover{background:var(--intensity-8)}',
    '.nb-listsz.active{background:color-mix(in srgb,var(--accent) 30%,transparent)}',
    /* 底部状态栏 */
    '.nb-footer{display:flex;align-items:center;gap:6px;padding:6px 10px 8px;border-top:1px solid var(--intensity-8);font-size:11px}',
    '.nb-toast{position:absolute;right:10px;bottom:58px;max-width:72%;background:rgba(30,60,120,.92);color:#fff;font:12px/1.5 system-ui,sans-serif;padding:6px 10px;border-radius:8px;box-shadow:0 3px 12px rgba(0,0,0,.18);opacity:0;transform:translateY(4px);transition:opacity .2s,transform .2s;pointer-events:none;z-index:6}',  // V1.8.7.6 P1-5 bottom 40→58px 避开 dlMenu/delq bottom:44px 同位
    '.nb-toast.show{opacity:1;transform:translateY(0);animation:nbToastIn .15s ease-out}',  // P2-21（2026-08-11）：最小 fade-in 动画闭环
    '.nb-delq{position:absolute;left:10px;right:10px;bottom:44px;background:var(--card-bg);color:var(--text-primary);font:12px/1.6 system-ui,sans-serif;border:1px solid var(--intensity-12);border-radius:8px;box-shadow:0 4px 14px var(--shadow);padding:10px 12px;z-index:7;display:none}',  // P4-25：硬编码色→CSS 变量（原 #fff/#222/#e4d5c9 暗色主题下不跟随）
    '.nb-delq .q{color:var(--text-danger);font-weight:600}',  // P4-25：#9c3a1f→var(--text-danger)
    '.nb-delq-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:8px}',
    '.nb-delq-btns button{padding:3px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--intensity-12);background:var(--card-bg);color:var(--text-primary)}',  // P4-25：硬编码→变量
    '.nb-delq-btns .go{padding:3px 12px;border-radius:6px;font-size:12px;cursor:pointer;border:1px solid var(--text-danger);background:var(--text-danger);color:#fff}',
    '.nb-delitem{color:var(--text-danger)}',  // P4-25：#b3261e→var(--text-danger)（亮暗双主题自适应）
    /* P1-8 AI 摘录占位：灰置保叙事（保留可点击 → 点击给期待反馈） */
    '.tbtn.ai-soon{opacity:.5;filter:grayscale(.6)}',
    '.tbtn.ai-soon:hover{opacity:.85;filter:none}',
    '.nb-status{display:flex;align-items:center;gap:5px;flex:1;min-width:0;color:var(--text-secondary)}',
    '.nb-status .dot{width:7px;height:7px;border-radius:50%;background:var(--success);flex-shrink:0}',
    '.nb-status .st{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nb-status .st.wrap{white-space:normal;line-height:1.5;text-overflow:clip}',  // P2-8 修复（2026-08-11）：警告/危险文案允许两行换行，不再被 ellipsis 截断（警告原文比常态长一倍）
    '.nb-foot-right{display:flex;align-items:center;gap:6px;color:var(--text-tertiary);white-space:nowrap}',
    /* V1.8.6.20 字号档位按钮（轻按钮风格） */
    '.nb-fontbtn{border:0;background:none;color:var(--text-tertiary);cursor:pointer;font-size:11px;padding:0 2px;white-space:nowrap}',
    '.nb-fontbtn:hover{color:var(--accent)}',
    /* 选区浮钮（shadow 内，fixed 定位跟随选区） */
    '.nb-float{position:fixed;z-index:100000;display:none;align-items:center;gap:4px;background:var(--accent);',
    'color:#fff;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;border:0;',  // P4-23：border:0 消除 div→button 后默认边框
    'box-shadow:0 4px 12px var(--shadow)}',
    '.nb-float:hover{filter:brightness(1.08)}',
    /* mini FAB（折叠态） */
    '.nb-fab{position:fixed;right:12px;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:999px;',
    'background:var(--accent);color:#fff;display:none;align-items:center;justify-content:center;font-size:18px;',
    'cursor:pointer;box-shadow:0 6px 16px var(--shadow);z-index:100000;border:0;pointer-events:auto}',
    '.nb-fab:hover{filter:brightness(1.08)}',
    /* 摘录归属询问条（V1.8.6.4） */
    '.nb-askbar{position:fixed;top:14px;right:24px;z-index:100001;display:none;align-items:center;gap:8px;',
    'background:var(--card-bg);border:.5px solid var(--intensity-12);border-radius:10px;padding:8px 12px;',
    'font-size:12px;color:var(--text-secondary);box-shadow:0 8px 20px var(--shadow);max-width:300px}',
    '.nb-askbar b{color:var(--text-primary);font-weight:600;white-space:nowrap}',
    '.nb-askbar span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.nb-askbar button{border:.5px solid var(--intensity-12);border-radius:6px;padding:3px 9px;font-size:11px;',
    'cursor:pointer;background:transparent;color:var(--text-primary);white-space:nowrap}',
    '.nb-askbar button.primary{background:var(--accent);border-color:var(--accent);color:#fff}',
    '.nb-askbar button:hover{filter:brightness(1.1)}',
    /* 渲染样式 */
    '.nb-h1{font-size:20px;font-weight:700;margin:10px 0 6px}.nb-h2{font-size:17px;font-weight:600;margin:8px 0 4px}',
    '.nb-h3{font-size:15px;font-weight:600;margin:6px 0 3px}.nb-h4{font-size:14px;font-weight:600;margin:4px 0 2px}',
    '.nb-preview p{margin:3px 0}.nb-link{color:var(--accent);text-decoration:underline}',
    '.nb-code{background:var(--intensity-6);border-radius:6px;padding:10px;font-family:monospace;font-size:11px;overflow-x:auto;white-space:pre;margin:6px 0}',
    '.nb-inline-code{background:var(--intensity-8);padding:1px 4px;border-radius:3px;font-size:.9em;font-family:monospace;color:var(--accent)}',
    '.nb-quote{border-left:2px solid var(--accent);background:var(--intensity-4);border-radius:0 6px 6px 0;padding:5px 10px;margin:5px 0;color:var(--text-secondary)}',
    '.nb-todo{display:flex;align-items:flex-start;gap:7px;margin:3px 0;cursor:pointer}',
    '.nb-todo input{margin-top:3px;cursor:pointer}',
    '.nb-todo-done{text-decoration:line-through;opacity:.6}',
    '.nb-li{margin:2px 0}',
    'hr{border:0;border-top:1px solid var(--intensity-12);margin:7px 0}',
    /* 高亮色 */
    '.hl-h1{color:var(--accent);font-weight:700}.hl-h2{color:var(--accent);font-weight:600}',
    '.hl-h3{font-weight:600}.hl-h4{font-weight:600}',
    '.hl-quote{color:var(--text-secondary)}.hl-code{color:#E06C52}.hl-list{color:var(--text-secondary)}',
    '.hl-todo-pending{color:var(--warning)}.hl-todo-done{color:var(--text-tertiary);text-decoration:line-through}',
    '.hl-b{font-weight:700}.hl-i{font-style:italic}.hl-link{color:var(--accent);text-decoration:underline}',
    /* P2-21（2026-08-11）：toast 最小 fade-in 动画（随 .show 触发一次，与基础态 transition 互补） */
    '@keyframes nbToastIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}'
  ].join('\n');

  /* ============================================================
   *  事件绑定辅助（统一管理，cleanup 可全量卸载）
   * ============================================================ */
  var _listeners = [];
  function on(el, ev, fn, opts) {
    if (!el) return;
    el.addEventListener(ev, fn, opts || false);
    _listeners.push({ el: el, ev: ev, fn: fn, opts: opts || false });
  }
  function cleanup() {
    for (var i = 0; i < _listeners.length; i++) {
      var l = _listeners[i];
      l.el.removeEventListener(l.ev, l.fn, l.opts);
    }
    _listeners = [];
  }

  /* ============================================================
   *  语义核心 1：DirtyGuard — 唯一脏状态守卫
   * ============================================================ */
  var DirtyGuard = {
    _dirty: false,
    arm: function () { this._dirty = true; },
    disarm: function () { this._dirty = false; },
    isDirty: function () { return this._dirty; },
    confirm: function (action) {
      if (!this._dirty) {
        if (typeof action === 'function') action();
        return true;
      }
      dgAction = typeof action === 'function' ? action : null;
      if (dgEl) dgEl.style.display = 'block';
      return false;
    }
  };

  /* ============================================================
   *  语义核心 2：scheduleSave — 唯一持久化调度
   * ============================================================ */
  var _saveTimer = null;
  function scheduleSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(flushSave, SAVE_DEBOUNCE);
  }
  function flushSave() {
    clearTimeout(_saveTimer);
    _saveTimer = null;
    if (_pendingIncoming) {
      var inc = _pendingIncoming;
      _pendingIncoming = null;
      mergeIncoming(inc);
    }
    if (!storageOK) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(NOTES));
        localStorage.setItem(CUR_KEY, String(cur));
        storageOK = true;
        DirtyGuard.disarm();
        diskWrite();
        showNormalStatus();
      } catch (e) {
        // 隐私模式：仅内存 + 磁盘落盘兜底（P2-2：此前 !storageOK 直接 return，落盘停更）
        DirtyGuard.disarm();
        diskWrite();
      }
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(NOTES));
      localStorage.setItem(CUR_KEY, String(cur));
      DirtyGuard.disarm();
      diskWrite();   // P0.5 自动落盘：复用 700ms 保存节奏，落盘失败不影响本机保存
      showNormalStatus();
    } catch (e) {
      storageOK = false;
      DirtyGuard.disarm();
      diskWrite();
      setStatus('存储不可用（隐私模式）· 刷新后丢失', 'danger');
    }
  }

  /* ============================================================
   *  语义核心 3：DataPipe — 唯一数据管道
   *  NOTES[cur] 是唯一真相源，ta.value / titleInput 是其投影
   * ============================================================ */
  var DataPipe = {
    write: function (source, patch) {
      var note = NOTES[cur];
      if (!note) return;
      for (var k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) note[k] = patch[k];
      }
      note.updated = Date.now();
      if (source !== 'ta' && patch.content !== undefined) {
        var cps = ta.selectionStart, cpe = ta.selectionEnd;
        ta.value = note.content;
        try { ta.setSelectionRange(Math.min(cps, ta.value.length), Math.min(cpe, ta.value.length)); } catch (err) { /* 预览态 display:none 时选区 API 受限 */ }
      }
      if (source !== 'title' && patch.title !== undefined) titleInput.value = note.title;
      DirtyGuard.arm();
      scheduleSave();
    },
    read: function () { return NOTES[cur]; },
    syncAll: function (source) {
      var note = NOTES[cur];
      if (!note) { ta.value = ''; titleInput.value = ''; renderPreview(); updateCount(); renderList(); return; }
      if (source !== 'ta') ta.value = note.content;
      if (source !== 'title') titleInput.value = note.title;
      // 切换/刷新后重置编辑区滚动，避免长笔记残留滚动位置
      ta.scrollTop = 0;
      hlLayer.scrollTop = 0;
      renderPreview();
      // V1.8.7.1 P2-28 分屏模式同样需要同步高亮层
      if ((mode === 'edit' || mode === 'split') && hlEnabled) syncHL();
      updateCount();
      renderList();
    }
  };

  /* ============================================================
   *  状态栏 — 四级（绿常态 < 蓝同步 3s < 黄备份提醒 < 红容量/存储）
   * ============================================================ */
  var _statusTimer = null;
  var _statusHoldUntil = 0;   // V1.8.7-P1-6 修复：提示窗口内禁止 flushSave 常态刷新覆盖（实机无提示根因）
  function setStatus(msg, tone, dur) {
    statusText.textContent = msg;
    statusText.className = 'st' + (tone === 'danger' || tone === 'warn' ? ' wrap' : '');   // P2-8：警告可换行两行显示（原单行 ellipsis 截断长文案，如「已 N 天未备份 · 数据仅存本机浏览器 · 立即导出」）
    statusDot.style.background =
      tone === 'danger' ? 'var(--destructive)' :
      tone === 'warn' ? 'var(--warning)' :
      tone === 'blue' ? 'var(--accent)' : 'var(--success)';
    // V1.8.6.8 风险文本同步着色，避免「提示灰字 vs 按钮红字」权重倒置
    // P2-8：danger/warn 改专色变量（原共用 --warning #EBA400 在浅底对比度仅 1.6:1，不达 WCAG 4.5:1）
    statusText.style.color =
      tone === 'danger' ? 'var(--text-danger)' :
      tone === 'warn' ? 'var(--text-warning)' : '';
    clearTimeout(_statusTimer);
    if (tone === 'blue' && dur) {
      _statusHoldUntil = Date.now() + dur;
      _statusTimer = setTimeout(function () { _statusHoldUntil = 0; showNormalStatus(); }, dur);
    } else {
      _statusHoldUntil = 0;
    }
  }
  var _toastEl = null;
  var _toastTimer = null;
  function showToast(msg, tone) {
    var t = _toastEl;
    if (!t) {
      t = document.createElement('div');
      t.className = 'nb-toast';
      var holder = (typeof panel !== 'undefined' && panel) ? panel : root;
      holder.appendChild(t);
      _toastEl = t;
    }
    t.textContent = msg;
    t.style.background = tone === 'warn' ? 'rgba(150,100,20,.95)' : 'rgba(30,60,120,.92)';
    void t.offsetWidth; // 强制重排，保证过渡动画从头播放
    t.classList.add('show');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }
  function showNormalStatus() {
    if (Date.now() < _statusHoldUntil) return; // 提示窗口内不覆盖（flushSave 每 700ms 调用，会吞掉蓝点提示）
    if (Lifecycle.state() !== 'mounted') return;
    clearTimeout(_statusTimer);
    // 优先级：红（容量）> 黄（备份）> 绿（常态）
    if (estimateStorage() > CAP_WARN) {
      setStatus('🔴 存储空间紧张 · 建议立即导出', 'danger');
      return;
    }
    var last = 0;
    try { last = parseInt(localStorage.getItem(BACKUP_KEY) || '0', 10); } catch (e) { last = 0; }
    if (last === 0 || (Date.now() - last) > BACKUP_DAYS * 24 * 3600 * 1000) {
      var days = last === 0 ? '尚未备份' : ('已 ' + Math.floor((Date.now() - last) / (24 * 3600 * 1000)) + ' 天未备份');
      // V1.8.6.7 首次未备份时文案强化（反馈 #3：数据安全提示存在感薄弱）
      setStatus('⚠️ ' + days + ' · 数据仅存本机浏览器 · 立即导出', 'warn');
      return;
    }
      setStatus(diskOn ? '🟢 已自动保存 · 自动落盘已开启' : '🟢 已自动保存 · 仅存本机不上云', 'ok');
  }

  /* ============================================================
   *  容量监控（估算 localStorage 占用，UTF-16 字节）
   * ============================================================ */
  function estimateStorage() {
    try {
      var total = 0, i, k;
      for (i = 0; i < localStorage.length; i++) {
        k = localStorage.key(i);
        total += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
      return total;
    } catch (e) { return 0; }
  }

  /* ============================================================
   *  P0.5 自动落盘（FS Access，默认关）：开关 → 选文件 → 每次 flushSave 后整库 JSON 写盘
   *  信任 > 检索：数据存续是产品级信任矛盾（localStorage 清除即丢），落盘 = 结构性保险
   *  明确不做：多文件/双向同步/云同步（超出最小版）；导入恢复已做=V1.8.14 落盘恢复（见下方 diskRestore）
   * ============================================================ */
  function diskSupported() {
    return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
  }
  // P1-29 方案 A：IndexedDB 句柄持久化（2026-08-09）——句柄可结构化克隆，跨刷新保留；
  // 权限本身为 session 级：queryPermission() 无需手势，granted → 自动恢复；prompt → 菜单项 requestPermission 授权（仍需手势，浏览器硬约束）
  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (typeof window === 'undefined' || !window.indexedDB) { reject(new Error('no-idb')); return; }
      var req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = function () { var db = req.result; if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbSaveHandle(fh) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(fh, 'disk');
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    }).catch(function () {
      if (typeof showToast === 'function') { try { showToast('落盘持久化失败 · 本会话仍可用', 'warn'); } catch (e) { } }
    });
  }
  function idbLoadHandle() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readonly');
        var r = tx.objectStore(IDB_STORE).get('disk');
        r.onsuccess = function () { db.close(); resolve(r.result || null); };
        r.onerror = function () { db.close(); reject(r.error); };
      });
    }).catch(function () { return null; });
  }
  function idbClearHandle() {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete('disk');
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    }).catch(function () { });
  }
  function clearDiskPersistence() {
    idbClearHandle();
    try { localStorage.setItem(DISK_KEY, ''); } catch (err) { }
  }
  function diskWrite() {
    if (!diskOn || !diskHandle) return;
    if (diskWrite._busy) { diskWrite._queued = true; return; }
    diskWrite._busy = true;
    diskWrite._queued = false;
    var payload = JSON.stringify({ app: 'SuiyeNote', ver: VER, savedAt: Date.now(), notes: NOTES, cur: cur }, null, 1);
    diskHandle.createWritable().then(function (w) {
      return w.write(payload).then(function () { return w.close(); });
    }).then(function () {
      diskWrite._busy = false;
      try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (e) { }
      if (diskFailShownAt) { diskFailShownAt = 0; setStatus('自动落盘已恢复 ✓', 'blue', 3000); }
      if (diskWrite._queued) { diskWrite._queued = false; diskWrite(); }
    }).catch(function (err) {
      diskWrite._busy = false;
      diskWrite._queued = false;
      var now = Date.now();
      if (!diskFailShownAt || now - diskFailShownAt > 10000) {   // 首次必提示，此后 10 秒节流防刷屏
        diskFailShownAt = now;
        setStatus('自动落盘失败：' + (err && err.message ? err.message : '写入错误') + ' · 导出菜单重新选择', 'warn');
      }
    });
  }
  function diskToggle() {
    if (!diskSupported()) { showToast('当前环境不支持自动落盘', 'warn'); return; }
    if (diskOn) {
      diskOn = false;
      diskHandle = null;
      diskPendingHandle = null;
      try { localStorage.setItem(DISK_KEY, ''); } catch (e) { }
      idbClearHandle();   // P1-29：关闭时清 IDB 持久句柄
      updateDiskItem();
      showToast('自动落盘已关闭', 'ok');
      return;
    }
    // P1-29 方案 A：持持久句柄但权限待授权（重启后 prompt 态）→ 免重选文件，请求权限即恢复
    if (diskPendingHandle) {
      diskPendingHandle.requestPermission({ mode: 'readwrite' }).then(function (st) {
        if (st === 'granted') {
          diskHandle = diskPendingHandle;
          diskPendingHandle = null;
          diskOn = true;
          try { localStorage.setItem(DISK_KEY, '1'); } catch (e) { }
          updateDiskItem();
          showToast('自动落盘已恢复 ✓ 保存自动写入原文件', 'ok');
          diskWrite();
        } else {
          diskPendingHandle = null;
          clearDiskPersistence();
          updateDiskItem();
          showToast('未获得授权 · 可重新选择文件', 'warn');
        }
      }).catch(function () {
        diskPendingHandle = null;
        clearDiskPersistence();
        updateDiskItem();
        showToast('授权失败 · 可重新选择文件', 'warn');
      });
      return;
    }
    window.showSaveFilePicker({
      suggestedName: '随页摘录-全库.json',   // 镜像语义：固定名，重开落盘时一眼认出同一文件，持续覆盖为最新
      types: [{ description: 'JSON 数据', accept: { 'application/json': ['.json'] } }]
    }).then(function (fh) {
      diskHandle = fh;
      diskOn = true;
      try { localStorage.setItem(DISK_KEY, '1'); } catch (e) { }
      updateDiskItem();
      showToast('自动落盘已开启 · 保存自动写入并实时覆盖该文件', 'ok');
      diskWrite();
      idbSaveHandle(fh);   // P1-29：持久化句柄，刷新/重启后可恢复（权限 prompt 时菜单项一键授权）
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;  // 用户取消选择，静默
      showToast('落盘开启失败：' + (err && err.message ? err.message : '未知错误'), 'warn');
    });
  }
  function updateDiskItem() {
    var item = root && root.querySelector ? root.querySelector('.dl-item[data-act="diskpick"]') : null;
    if (item) {
      // P1-29：待授权态（重启后 prompt）显式回显，点击 = requestPermission 恢复原文件
      setHTML(item, diskOn ? iconSvg('disk') + ' 自动落盘已开启 ✓ <span class="ext">保存即写入文件</span>'
        : diskPendingHandle ? iconSvg('disk') + ' 自动落盘待授权 ✓ <span class="ext">点击恢复原文件</span>'
                            : iconSvg('disk') + ' 自动落盘 <span class="ext">防数据丢失 · 保存即写入</span>');
    }
  }

  /* ============================================================
   *  跨浏览器/跨进程数据反向合并：读取落盘 JSON → 校验 → 按 id 去重合并
   *  （冲突取 updated 新者）→ 回写镜像；幂等，可重复导入
   *  防御矩阵：JSON 损坏 / 误选文件 / 缺 id / 脏字段 / cur 越界 / 空库 /
   *  重复导入（幂等）/ AbortError 静默 / 不支持 FS Access 提示
   * ============================================================ */
  function normalizeDiskNote(n, now) {
    // 防御 #5 脏字段：白名单键 + 类型强制，防手改文件注入未知键/异常类型
    return {
      id: typeof n.id === 'string' && n.id ? n.id : genId(),  // 防御 #4 缺 id 补生成
      title: typeof n.title === 'string' ? n.title : (n.title == null ? '未命名笔记' : String(n.title)),
      content: typeof n.content === 'string' ? n.content : (n.content == null ? '' : String(n.content)),
      url: typeof n.url === 'string' ? n.url : '',
      host: typeof n.host === 'string' ? n.host : '',
      created: typeof n.created === 'number' && isFinite(n.created) ? n.created : now,
      updated: typeof n.updated === 'number' && isFinite(n.updated) ? n.updated : now
    };
  }
  function diskRestore() {
    if (!diskSupported()) { showToast('当前环境不支持从文件恢复（需 Chromium 内核）', 'warn'); return; }
    // P2-13：未保存确认改自定义条（回调式）；dirty 时弹条暂存动作，确认后执行合并
    DirtyGuard.confirm(function () {
      var restoredFh = null;   // V1.8.14 补丁 P2-3：保留恢复源句柄，合并成功后接续为自动落盘目标（跨浏览器场景 diskOn=false）
      window.showOpenFilePicker({
      multiple: false,
      types: [{ description: '随页摘录落盘文件', accept: { 'application/json': ['.json'] } }]
    }).then(function (fhs) {
      var fh = fhs && fhs[0];
      if (!fh) throw new Error('no-file');
      restoredFh = fh;   // P2-3：句柄跨 then 保留（原读完后即弃，无法接续落盘）
      return fh.getFile().then(function (f) { return f.text(); });
    }).then(function (text) {
      // 防御 #1 JSON 损坏：parse 抛错 → 明确提示
      var data = JSON.parse(text);
      // 防御 #2 误选文件：app 标识 + notes 数组双校验
      if (!data || data.app !== 'SuiyeNote' || !Array.isArray(data.notes)) {
        showToast('不是有效的随页摘录落盘文件', 'warn');
        return;
      }
      // 防御 #10 空库：明确提示不产生变更
      if (data.notes.length === 0) { showToast('落盘文件中没有笔记', 'warn'); return; }
      var now = Date.now();
      var byId = {};   // id → 本地笔记引用
      var i;
      for (i = 0; i < NOTES.length; i++) { if (NOTES[i] && NOTES[i].id) byId[NOTES[i].id] = NOTES[i]; }
      var added = 0, merged = 0;
      for (i = 0; i < data.notes.length; i++) {
        var n = normalizeDiskNote(data.notes[i] || {}, now);
        var exist = byId[n.id];
        if (!exist) {
          // 防御 #3 同 id 冲突（本地无）：直接并入
          NOTES.push(n);
          byId[n.id] = n;
          added++;
        } else {
          // 冲突取 updated 新者；防御 #6 同 updated 时文件侧优先（文件为外部输入源）
          var localT = typeof exist.updated === 'number' ? exist.updated : 0;
          var fileT = n.updated;
          // 防御 #11 重复导入幂等：同 updated 且内容全等 → 不算变更（可安全重复导入）
          if (fileT > localT || (fileT === localT && (exist.title !== n.title || exist.content !== n.content || exist.url !== n.url || exist.host !== n.host))) {
            exist.title = n.title;
            exist.content = n.content;
            exist.url = n.url;
            exist.host = n.host;
            exist.updated = n.updated;
            merged++;
          }
        }
      }
      if (added === 0 && merged === 0) { showToast('已是最新，无需合并', 'ok'); return; }
      // 防御 #8 异步基线：合并基于读取完成时的 NOTES（本次读取期间写入的笔记已含在 byId）
      // 防御 #6 cur 越界：clamp（复用 init 规则）
      if (cur < 0 || cur >= NOTES.length) cur = NOTES.length ? 0 : -1;
      flushSave();   // 本地保存 + 防御 #7 diskOn 时自动回写镜像
      DataPipe.syncAll('restore');
      var diskTurnedOn = false;
      if (!diskOn && restoredFh) {
        diskHandle = restoredFh;
        diskOn = true;
        try { localStorage.setItem(DISK_KEY, '1'); } catch (e) { }
        idbSaveHandle(restoredFh);
        updateDiskItem();
        diskWrite();   // 立即写一次：合并结果当场落盘，闭环即刻可验证
        diskTurnedOn = true;
      }
      showToast('已合并 ' + added + ' 条新笔记' + (merged ? ' · 更新 ' + merged + ' 条' : '') + (diskTurnedOn ? ' · 自动落盘已开启 ✓ 继续写入该文件' : ''), 'ok');
    }).catch(function (err) {
      // 防御 #9 用户取消：静默（与 diskToggle 同模式）
      if (err && err.name === 'AbortError') return;
      if (err && err.message === 'no-file') return;
      if (err instanceof SyntaxError) { showToast('落盘文件损坏：不是有效 JSON', 'warn'); return; }
      showToast('恢复失败：' + (err && err.message ? err.message : '未知错误'), 'warn');
    });
    }); // P2-13：confirm 回调闭合
  }

  /* ============================================================
   *  跨标签同步（storage 事件 → 字段级 Diff → 蓝条提示）
   * ============================================================ */
  var _pendingIncoming = null;  // V1.8.8.03：dirty 期间暂存另一标签页数据（原直接丢弃→本地旧库整体覆盖远端修改）
  function mergeIncoming(incoming) {
    // 字段级合并：以 incoming 为骨架，按 id 对齐；同 id 冲突时 updated 新者胜（dirty 时本地输入
    // 未保存但 updated 已实时更新，取大者安全）；incoming 新建保留，本地新增 append 尾部
    var curId = (cur >= 0 && NOTES[cur]) ? NOTES[cur].id : null;
    var byId = {}, i;
    for (i = 0; i < NOTES.length; i++) { if (NOTES[i]) byId[NOTES[i].id] = NOTES[i]; }
    var out = [];
    for (i = 0; i < incoming.length; i++) {
      var inc = incoming[i];
      if (!inc || !inc.id) continue;
      var local = byId[inc.id];
      if (local && (local.updated > inc.updated || DirtyGuard.isDirty())) out.push(local);
      else out.push(inc);
      delete byId[inc.id];
    }
    for (var k in byId) { if (Object.prototype.hasOwnProperty.call(byId, k)) out.push(byId[k]); }
    if (!out.length) return;
    NOTES = out;
    var found = -1;
    if (curId) { for (i = 0; i < NOTES.length; i++) { if (NOTES[i].id === curId) { found = i; break; } } }
    cur = found >= 0 ? found : (NOTES.length ? 0 : -1);
    undoStack.length = 0;   // V1.8.8.03：合并替换内容后旧撤销栈快照失配（与 onStorage 采纳同款处理）
  }
  function adoptIncoming(incoming) {
    var changed = incoming.length !== NOTES.length;
    if (!changed) {
      for (var i = 0; i < incoming.length; i++) {
        var a = NOTES[i], b = incoming[i];
        if (!a || !b || a.title !== b.title || a.content !== b.content) { changed = true; break; }
      }
    }
    if (changed) {
      NOTES = incoming;
      if (cur >= NOTES.length) cur = NOTES.length ? 0 : -1;
      undoStack.length = 0;   // V1.8.8.03 F5 修复：采纳跨标签数据后清撤销栈（原栈顶 cur 与内容失配）
      DataPipe.syncAll('storage');
      flushSave(); // V1.8.14 补丁 P1-1：采纳后落盘——自动落盘镜像同步另一标签页数据（顺序同 doDeleteNote：先 flushSave 后 setStatus，blue+hold 不被吞）
      setStatus('🔄 来自另一标签页的更新已同步', 'blue', 3000);
    }
  }
  function onStorage(e) {
    if (e.key !== STORAGE_KEY) return;
    if (Lifecycle.state() !== 'mounted') return;
    try {
      var incoming = JSON.parse(e.newValue);
      if (!Array.isArray(incoming)) return;
      if (DirtyGuard.isDirty()) { _pendingIncoming = incoming; return; }   // V1.8.8.03：暂存不丢弃，flushSave 时合并
      adoptIncoming(incoming);
    } catch (err) { /* 解析失败忽略 */ }
  }

  /* ============================================================
   *  语义核心 4：Lifecycle — 唯一生命周期（三钩子强制落盘）
   * ============================================================ */
  var Lifecycle = {
    _state: 'idle', // idle | mounted | suspended | unmounted
    state: function () { return this._state; },
    mount: function () {
      this._state = 'mounted';
      // 三钩子：beforeunload / pagehide / visibilitychange
      on(window, 'beforeunload', function (e) {
        flushSave();
        if (DirtyGuard.isDirty()) { e.preventDefault(); e.returnValue = ''; }
      });
      on(window, 'pagehide', flushSave);
      on(document, 'visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushSave();
      });
      on(window, 'storage', onStorage);
    },
    suspend: function () {
      this._state = 'suspended';
      flushSave();
    },
    resume: function () {
      this._state = 'mounted';
      DataPipe.syncAll('storage');
    },
    unmount: function () {
      this._state = 'unmounted';
      flushSave();
      DirtyGuard.disarm();
      cleanup();
    }
  };

  /* ============================================================
   *  数据迁移（决策 D：nb_notes/nb_cur(+tabbit_nb_v1) → tabbit_nb_v2）
   * ============================================================ */
  function migrate() {
    var raw = null;
    try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { storageOK = false; return []; }
    if (raw) {
      try {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
        try { localStorage.setItem(STORAGE_KEY + '.corrupt', raw); } catch (e) { }
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { }
      } catch (e) { /* 损坏则重建 */ }
    }
    // 读旧数据源
    var oldNotes = null, oldCur = null, i;
    for (i = 0; i < OLD_KEYS.length && !oldNotes; i++) {
      try {
        var n = localStorage.getItem(OLD_KEYS[i][0]);
        if (n) oldNotes = JSON.parse(n);
        if (OLD_KEYS[i][1]) oldCur = localStorage.getItem(OLD_KEYS[i][1]);
      } catch (e) { oldNotes = null; }
    }
    if (Array.isArray(oldNotes) && oldNotes.length) {
      var now = Date.now();
      var notes = [];
      for (i = 0; i < oldNotes.length; i++) {
        var n = oldNotes[i] || {};
        notes.push({
          id: n.id || genId(),
          title: n.title || '未命名笔记',
          content: n.content || '',
          url: n.url || '',
          host: n.host || '',
          created: n.created || now,
          updated: n.updated || now
        });
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
        localStorage.setItem(CUR_KEY, String(oldCur || 0));
        localStorage.removeItem('nb_notes');
        localStorage.removeItem('nb_cur');
        localStorage.removeItem('tabbit_nb_v1');
      } catch (e) { storageOK = false; }
      return notes;
    }
    return [];
  }

  /* ============================================================
   *  DOM 构建（Shadow DOM 宿主）
   * ============================================================ */
  // P2-21 关于浮层内容刷新（打开时调用；buildUI 外定义，bindEvents 可用）
  function refreshAbout() {
    if (!aboutVerEl) return;
    aboutVerEl.textContent = '版本 v' + VER;
    var note = DataPipe.read();
    aboutDataEl.textContent = '已存 ' + realNoteCount() + ' 条笔记 · 当前 ' + (note ? chCount(note.content) : 0) + ' 字';  // V1.8.14 欢迎笔记计入计数
  }
  var aboutVerEl = null, aboutDataEl = null;

  // P3-15（2026-08-11）：宿主 transform 时 fixed 补偿（定义在 buildUI 前，buildUI 末尾 watchHostPin() 启动）
  // 原理：祖先 transform 会把 fixed 子元素的包含块改成 transform 祖先（CSS 规范），getBoundingClientRect
  // 返回的是变换后视口坐标 → 测出偏移 (left, top) 后以负 margin 反向拉回。零成本常态（无 transform 时
  // 偏移恒 0，margin 不动）；仅滚动/缩放/样式变更时重测。
  function watchHostPin() {
    if (!host || typeof MutationObserver === 'undefined') return;
    var rafId = 0;
    function repin() {
      rafId = 0;
      if (!host) return;
      var r = host.getBoundingClientRect();
      var dx = Math.round(r.left), dy = Math.round(r.top);
      if (dx === 0 && dy === 0) { host.style.marginLeft = ''; host.style.marginTop = ''; return; }
      host.style.marginLeft = (-dx) + 'px';
      host.style.marginTop = (-dy) + 'px';
      if (floatBtn) { floatBtn.style.marginLeft = (-dx) + 'px'; floatBtn.style.marginTop = (-dy) + 'px'; }
      if (miniFab) { miniFab.style.marginLeft = (-dx) + 'px'; miniFab.style.marginTop = (-dy) + 'px'; }
    }
    function schedule() { if (!rafId) rafId = requestAnimationFrame(repin); }
    on(window, 'scroll', schedule, true);
    on(window, 'resize', schedule);
    try {
      var mo = new MutationObserver(schedule);
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['style', 'class', 'transform'] });
    } catch (err) { /* 观察器不可用则退化为 scroll/resize 补偿 */ }
  }

  function buildUI() {
    host = document.createElement('div');
    host.id = 'tabbit-nb-host';
    // .nb-root 同理；此处直接内联 fixed，面板 absolute 以 host 为定位祖先，滚动时贴合视口
    host.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;z-index:99999;pointer-events:none';
    root = host.attachShadow({ mode: 'open' });

    var style = document.createElement('style');
    style.textContent = CSS_TEXT;
    root.appendChild(style);

    // ---- 面板 ----
    panel = document.createElement('div');
    panel.className = 'nb-panel';

    // 左缘宽度拖拽条
    resizeBar = document.createElement('div');
    resizeBar.className = 'nb-resize';
    resizeBar.title = '拖拽调整宽度';

    // V1.8.7.1 P2-30 悬浮态八方向拉伸手柄（N/S/E/W 边 + NW/NE/SW/SE 对角 45°；停靠/全屏态隐藏；EDGE_DIRS/TIPS 为模块级）
    resizeHandles = {};
    for (var ei = 0; ei < EDGE_DIRS.length; ei++) {
      var ed = document.createElement('div');
      ed.className = 'nb-edge nb-edge-' + EDGE_DIRS[ei];
      ed.title = EDGE_TIPS[EDGE_DIRS[ei]];
      resizeHandles[EDGE_DIRS[ei]] = ed;
    }

    // ---- Header ----
    header = document.createElement('div');
    header.className = 'nb-header';

    var handle = document.createElement('span');
    handle.className = 'drag-handle';
    handle.textContent = '⠿';

    // P2-21 品牌触点：header 小字产品名（可点开「版本与关于」浮层，替代 P2-20 纯展示）
    brandBtn = document.createElement('button');
    brandBtn.className = 'nb-brand';
    brandBtn.type = 'button';
    brandBtn.title = '随页摘录 · 版本与关于';
    // P2-44④ 品牌压缩为图标（省 60px 给胶囊/标题；名称保留在关于浮层）
    setHTML(brandBtn, iconSvg('nb'));

    // P2-21 关于浮层：产品名 + 版本 + 数据量 + 一句定位（实时填充，打开时刷新）
    aboutMenu = document.createElement('div');
    aboutMenu.id = 'aboutMenu';
    var aboutName = document.createElement('div');
    aboutName.className = 'nb-about-name';
    aboutName.textContent = '随页摘录';
    var aboutVer = document.createElement('div');
    aboutVer.className = 'nb-about-ver';
    var aboutData = document.createElement('div');
    aboutData.className = 'nb-about-data';
    var aboutTag = document.createElement('div');
    aboutTag.className = 'nb-about-tag';
    aboutTag.textContent = '网页边读边摘 · 笔记仅存本机不上云';
    aboutMenu.appendChild(aboutName);
    aboutMenu.appendChild(aboutVer);
    aboutMenu.appendChild(aboutData);
    aboutMenu.appendChild(aboutTag);
    aboutVerEl = aboutVer;
    aboutDataEl = aboutData;
    // 打开时刷新版本与数据量（NOTES 增删/编辑后保持准确）
    aboutVer.textContent = '版本 v' + VER;
    aboutData.textContent = '已存 ' + realNoteCount() + ' 条笔记 · 当前 ' + (DataPipe.read() ? chCount(DataPipe.read().content) : 0) + ' 字';  // V1.8.14 欢迎笔记计入计数

    capsuleBtn = document.createElement('button');
    capsuleBtn.className = 'nb-capsule';
    capsuleBtn.type = 'button';
    // 列表收起→展开同帧 focus 无效 + 焦点锁双因素 → 场景 B 聚焦全灭。tabindex=-1 让按钮不可聚焦，
    // 杜绝 mousedown 抢占焦点（不影响 click 派发；L75 吞 click 教训属 mousedown preventDefault，非同机制）
    capsuleBtn.tabIndex = -1;
    capsuleBtn.title = '搜索笔记（快捷键 ./）· 点击展开列表';
    capsuleTxt = document.createElement('span');
    capsuleTxt.className = 'nb-capsule-txt';
    setHTML(capsuleTxt, iconSvg('search') + '搜索笔记 0/0');
    capsuleBtn.appendChild(capsuleTxt);
    capsuleBtn.appendChild(document.createTextNode(' ▾'));

    titleInput = document.createElement('input');
    titleInput.className = 'nb-title';
    titleInput.placeholder = '标题';

    pinBtn = document.createElement('button');
    pinBtn.className = 'tbtn';
    pinBtn.title = '悬浮/停靠';
    pinBtn.setAttribute('aria-label', '悬浮/停靠');  // P4-22：图标按钮读屏可发现
    setHTML(pinBtn, iconSvg('pin'));

    foldBtn = document.createElement('button');
    foldBtn.className = 'tbtn';
    foldBtn.title = '折叠（Alt+N）';
    foldBtn.setAttribute('aria-label', '折叠面板');  // P4-22
    setHTML(foldBtn, iconSvg('fold'));  // P4-27：'—'→fold 图标（原文本横线在小按钮上视觉像装饰线）

    // V1.8.6.17 透明度入口：footer ◐ 小图标可发现性差 → 移至 header 显性文字按钮
    // P2-19 低频按钮收纳：✨高亮/◐透明 移入 ⋮ 更多菜单（header 只留高频操作）

    // P2-19 ⋮ 更多菜单入口（收纳低频设置：语法高亮/面板透明）
    moreBtn = document.createElement('button');
    moreBtn.className = 'tbtn';
    moreBtn.title = '更多设置';
    moreBtn.setAttribute('aria-label', '更多设置');  // P4-22
    setHTML(moreBtn, '⋮');
    moreMenu = document.createElement('div');
    moreMenu.id = 'moreMenu';
    hlItem = document.createElement('div');
    hlItem.className = 'dl-item';
    hlItem.setAttribute('data-act', 'hl');
    setHTML(hlItem, iconSvg('sparkle') + ' <span class="more-txt">语法高亮：关</span>');
    moreMenu.appendChild(hlItem);
    transItem = document.createElement('div');
    transItem.className = 'dl-item';
    transItem.setAttribute('data-act', 'trans');
    setHTML(transItem, iconSvg('trans') + ' <span class="more-txt">面板透明：关</span>');
    moreMenu.appendChild(transItem);
    // P2-29 方案 A 补充：⋮ 菜单加「全屏（Alt+F）」鼠标路径（键位被浏览器劫持时按钮兜底；开关态回显）
    fsItem = document.createElement('div');
    fsItem.className = 'dl-item';
    fsItem.setAttribute('data-act', 'fs');
    setHTML(fsItem, iconSvg('fs') + ' <span class="more-txt">全屏（Alt+F）</span>');
    moreMenu.appendChild(fsItem);
    // P2-35 删除入口显性化：⋮ 菜单加「删除当前笔记」（原仅右键，可发现性差；自定义确认条防误触）
    var delSep = document.createElement('div');
    delSep.className = 'dl-sep';
    moreMenu.appendChild(delSep);
    delItem = document.createElement('div');
    delItem.className = 'dl-item nb-delitem';
    delItem.setAttribute('data-act', 'del');
    setHTML(delItem, iconSvg('trash') + ' <span class="more-txt">删除当前笔记</span>');
    moreMenu.appendChild(delItem);
    introItem = document.createElement('div');
    introItem.className = 'dl-item';
    introItem.setAttribute('data-act', 'intro');
    setHTML(introItem, iconSvg('nb') + ' <span class="more-txt">产品介绍</span>');
    moreMenu.appendChild(introItem);
    // #27 反馈通道（2026-08-11，用户拍板微信群渠道）：⋮ 菜单「💬 反馈」→ 反馈浮层。
    // 隐私矛盾正面处理：反馈=用户主动明示单向，浮层首行写明「反馈会离开浏览器」，
    // 与「数据不上报」卖点不冲突（#14 叙事保护）；四问画像（#28）随表单顺带填写
    fbItem = document.createElement('div');
    fbItem.className = 'dl-item';
    fbItem.setAttribute('data-act', 'feedback');
    setHTML(fbItem, iconSvg('chat') + ' <span class="more-txt">反馈</span>');
    moreMenu.appendChild(fbItem);
    // 反馈浮层（与 introMenu 同构）：隐私明示 + 四问 + 发送/复制双按钮
    fbMenu = document.createElement('div');
    fbMenu.id = 'fbMenu';
    setHTML(fbMenu,
      '<div class="nb-intro-name">反馈</div>' +
      '<div class="nb-intro-line">注意：点「发送」即让以上内容离开浏览器、直送作者，仅用于改进产品，可匿名。</div>' +
      '<div class="nb-intro-sec">反馈内容（四问，可留空）</div>' +
      '<div class="nb-intro-line">1. 你的身份：<input id="fbQ1" class="nb-fbin" placeholder="学生/上班族/研究者/其他" /></div>' +
      '<div class="nb-intro-line">2. 使用场景：<input id="fbQ2" class="nb-fbin" placeholder="论文/工作/读书/随手记" /></div>' +
      '<div class="nb-intro-line">3. 使用频率：<input id="fbQ3" class="nb-fbin" placeholder="每天/每周几次/偶尔" /></div>' +
      '<div class="nb-intro-line">4. 想说的话（问题/建议/卡点）：<input id="fbQ4" class="nb-fbin" placeholder="哪里不顺手、想要什么" /></div>' +
      '<div class="nb-fbrow"><button type="button" id="fbSend" class="nb-fbbtn nb-fbprimary">发送反馈</button>' +
      '<button type="button" id="fbCopy" class="nb-fbbtn nb-fbghost">复制反馈内容（备用）</button></div>' +
      '<div class="nb-intro-foot">发送失败或未配置送达通道时，会自动复制内容，粘贴到任意渠道（邮箱/飞书等）即可送达。</div>');
    panel.appendChild(fbMenu);
    introMenu = document.createElement('div');
    introMenu.id = 'introMenu';
    setHTML(introMenu,
      '<div class="nb-intro-name">随页摘录 SuiyeNote</div>' +
      '<div class="nb-intro-slogan">网页上记笔记用的小工具。</div>' +
      '<div class="nb-intro-line">看到好句子，选中点一下，自动带上网址和标题；有想法，在网页边上随手写，保存不用你管。</div>' +
      '<div class="nb-intro-line">笔记只存在你这台电脑的浏览器里，不联网——清缓存会丢，所以隔段时间导出一次，或开「自动落盘」。</div>' +
      '<div class="nb-intro-sec">快捷键</div>' +
      '<div class="nb-intro-line">写作与编辑：Enter 续行 · Tab/Shift+Tab 缩进 · Ctrl+B/I · Ctrl+Z 撤销 · Ctrl+Enter 待办勾选 · Ctrl+Shift+1-3 标题</div>' +
      '<div class="nb-intro-line">面板与视图：Alt+N 折叠 · Alt+P 切换 · Alt+F 全屏 · Alt+S 分屏</div>' +
      '<div class="nb-intro-line">笔记与搜索：./ 搜索 · Alt+Shift+N 新建 · Ctrl+Alt+E 导出 · Ctrl+Alt+X 删除 · Esc 关闭</div>' +
      '<div class="nb-intro-foot">版本 v' + VER + ' · 完整用法见同目录《使用说明.md》</div>');
    panel.appendChild(introMenu);

    closeBtn = document.createElement('button');
    closeBtn.className = 'tbtn';
    closeBtn.title = '关闭';
    closeBtn.setAttribute('aria-label', '关闭面板');  // P4-22
    closeBtn.textContent = '✕';

    header.appendChild(handle);
    header.appendChild(brandBtn);
    header.appendChild(capsuleBtn);
    header.appendChild(titleInput);
    header.appendChild(pinBtn);
    header.appendChild(foldBtn);
    header.appendChild(closeBtn);
    header.appendChild(moreBtn);

    // ---- 模式切换（V1.8.7.1 反馈改版：去掉「编辑」Tab——编辑即默认态，无需入口；tab 行 = 分屏 + 显示⇄编辑一键切换）----
    var tab = document.createElement('div');
    tab.className = 'nb-tab';
    viewToggleBtn = document.createElement('button');
    viewToggleBtn.className = 'tbtn nb-vt on';
    viewToggleBtn.title = '一键切换：显示 ⇄ 编辑（Alt+P）';
    viewToggleBtn.setAttribute('aria-label', '切换显示与编辑');  // P4-22
    viewToggleBtn.textContent = '👁 显示';
    // V1.8.7.1 P2-28 分屏 Tab（左编辑右预览实时渲染）
    splitTab = document.createElement('button');
    splitTab.className = 'tbtn';
    splitTab.title = '分屏：左编辑右预览实时渲染';
    splitTab.textContent = '分屏';
    tab.appendChild(viewToggleBtn);
    tab.appendChild(splitTab);
    addBtn = document.createElement('button');
    addBtn.className = 'tbtn primary';
    addBtn.textContent = '＋ 新建';
    tab.appendChild(addBtn);

    // ---- 工具栏（V1.6 规格 7 按钮 + 链接/引用）----
    toolbar = document.createElement('div');
    toolbar.className = 'nb-toolbar';
    var row1 = document.createElement('div');
    row1.className = 'row';
    var row2 = document.createElement('div');
    row2.className = 'row';
    var defs = [
      ['b', 'B', '加粗'],
      ['i', 'I', '斜体'],
      ['h', 'H2', '标题（点击循环 H1/H2/H3）'],
      ['ol', '列表', '列表（点击切换 有序/无序）'],
      ['todo', '☑ 待办', '待办'],
      ['quote', '❝ 引用', '引用'],
      ['cb', '{} 代码块', '代码块']
    ];
    for (var d = 0; d < defs.length; d++) {
      var b = document.createElement('button');
      b.className = 'tbtn';
      b.setAttribute('data-ins', defs[d][0]);
      b.title = defs[d][2];
      setHTML(b, defs[d][1]);
      if (defs[d][0] === 'b') b.style.fontWeight = '700';
      if (defs[d][0] === 'i') b.style.fontStyle = 'italic';
      row1.appendChild(b);
    }
    var linkBtn = document.createElement('button');
    linkBtn.className = 'tbtn';
    linkBtn.id = 'btnInsLink';
    linkBtn.title = '追加来源引用：[页面标题](URL)';
    setHTML(linkBtn, iconSvg('link') + ' 页面链接');
    var selBtn = document.createElement('button');
    selBtn.className = 'tbtn primary';
    selBtn.id = 'btnInsSel';
    selBtn.title = '将选中的文字追加为摘录（自动带来源）';
    selBtn.setAttribute('aria-label', '追加选中文字为摘录');  // P4-22
    setHTML(selBtn, iconSvg('scissors') + ' 摘录选中');  // P2-36 术语统一：引用选中 → 摘录选中（核心动词对齐）
    // P1-8 AI 摘录占位（保平台叙事，灰置不砍）：API 公开即接线
    var aiBtn = document.createElement('button');
    aiBtn.className = 'tbtn ai-soon';
    aiBtn.id = 'btnAiSoon';
    aiBtn.title = '✨ AI 摘录 · 自动摘要/提炼（即将上线，平台 API 公开即接线）';
    setHTML(aiBtn, iconSvg('sparkle') + ' AI 摘录');
    row2.appendChild(linkBtn);
    row2.appendChild(selBtn);
    row2.appendChild(aiBtn);
    toolbar.appendChild(row1);
    toolbar.appendChild(row2);

    // ---- 编辑区（hl-layer + textarea）----
    editWrap = document.createElement('div');
    editWrap.className = 'hl-wrap';
    hlLayer = document.createElement('div');
    hlLayer.className = 'hl-layer';
    ta = document.createElement('textarea');
    ta.className = 'nb-editor';
    ta.spellcheck = false;
    ta.placeholder = '开始书写…';
    editWrap.appendChild(hlLayer);
    editWrap.appendChild(ta);

    // ---- 预览区 ----
    previewWrap = document.createElement('div');
    previewWrap.className = 'nb-preview';
    preview = document.createElement('div');
    previewWrap.appendChild(preview);
    // P1-9#2 大纲树（V1.8.8 检索 P0 最小切片，对齐方案 3.7 规格与 V1.8 原型 #outline）：
    // 预览可见时解析 #~#### 标题树，点击锚点滚动定位；无标题时隐藏
    outlineEl = document.createElement('div');
    outlineEl.id = 'outline';
    setHTML(outlineEl, '<b>大纲</b>');
    previewWrap.appendChild(outlineEl);

    // V1.8.7.1 P2-28 分屏容器：编辑 | 预览 并排（split 模式各 50%）
    splitBody = document.createElement('div');
    splitBody.className = 'nb-splitbody';
    splitBody.appendChild(editWrap);
    splitBody.appendChild(previewWrap);

    var kbd = document.createElement('div');
    kbd.className = 'nb-kbd';
    kbd.textContent = 'Tab 缩进 · Enter 续列表 · Ctrl+B/I 格式化 · Alt+N 折叠 · Alt+P 显示/编辑 · ./ 搜索 · Alt+F 全屏';

    dlMenu = document.createElement('div');
    dlMenu.id = 'dlMenu';
    // 复制引用流（首位，高频动作 P1-6）
    var qi = document.createElement('div');
    qi.className = 'dl-item';
    qi.setAttribute('data-act', 'copyquotes');
    setHTML(qi, iconSvg('copy') + ' 复制引用流 <span class="ext">全部摘录为 Markdown</span>');
    dlMenu.appendChild(qi);
    // 复制全文（原 copyBtn 能力保留，入口并入菜单不丢失）
    var ca = document.createElement('div');
    ca.className = 'dl-item';
    ca.setAttribute('data-act', 'copyall');
    setHTML(ca, iconSvg('copy') + ' 复制全文 <span class="ext">当前笔记为 Markdown</span>');
    dlMenu.appendChild(ca);
    // P2-17 菜单分组：格式（分隔线）
    var dlSep = document.createElement('div');
    dlSep.className = 'dl-sep';
    dlMenu.appendChild(dlSep);
    var fmts = [['md', 'Markdown', '.md · 知识库归档'], ['txt', '纯文本', '.txt · 已清洗语法'], ['html', '网页文件', '.html · 自带排版']];
    for (var f = 0; f < fmts.length; f++) {
      var item = document.createElement('div');
      item.className = 'dl-item';
      item.setAttribute('data-fmt', fmts[f][0]);
      setHTML(item, fmts[f][1] + ' <span class="ext">' + fmts[f][2] + '</span>');
      dlMenu.appendChild(item);
    }
    // P0.5 自动落盘（FS Access，默认关）：防数据丢失 · 保存即写入本地文件（镜像语义，独立一组末位）
    var di = document.createElement('div');
    di.className = 'dl-item';
    di.setAttribute('data-act', 'diskpick');
    setHTML(di, iconSvg('disk') + ' 自动落盘 <span class="ext">镜像·防数据丢失</span>');
    dlMenu.appendChild(di);
    var ri = document.createElement('div');
    ri.className = 'dl-item';
    ri.setAttribute('data-act', 'diskrestore');
    setHTML(ri, iconSvg('disk') + ' 从落盘文件恢复 <span class="ext">跨浏览器/进程合并笔记</span>');
    dlMenu.appendChild(ri);

    // ---- 笔记列表区（V1.8.7.1 P2-31 合并：搜索框常驻列表区顶部，浮层 capDrop 已删除=单列表）----
    listsec = document.createElement('div');
    listsec.className = 'nb-listsec';
    capSearch = document.createElement('input');
    capSearch.className = 'nb-capsearch';
    capSearch.type = 'text';
    capSearch.autofocus = true;
    capSearch.placeholder = '搜索笔记（标题+内容）· ESC 收起';
    listsec.appendChild(capSearch);
    noteList = document.createElement('div');
    noteList.className = 'nb-list';
    listsec.appendChild(noteList);
    listSz = document.createElement('div');
    listSz.className = 'nb-listsz';
    listSz.title = '拖拽调整列表高度';
    listsec.appendChild(listSz);

    // ---- 底部状态栏 ----
    var footer = document.createElement('div');
    footer.className = 'nb-footer';
    var statusWrap = document.createElement('div');
    statusWrap.className = 'nb-status';
    statusDot = document.createElement('span');
    statusDot.className = 'dot';
    statusText = document.createElement('span');
    statusText.className = 'st';
    statusText.setAttribute('aria-live', 'polite');   // P4-26：状态文本变更对读屏播报（保存/警告/容量等关键状态）
    statusText.setAttribute('role', 'status');
    statusWrap.appendChild(statusDot);
    statusWrap.appendChild(statusText);
    var footRight = document.createElement('div');
    footRight.className = 'nb-foot-right';
    countEl = document.createElement('span');
    countEl.textContent = '共 0 字';
    footRight.appendChild(countEl);
    // V1.8.6.20 字号三档切换（A- 12px / A 14px / A+ 16px）
    fontBtn = document.createElement('button');
    fontBtn.className = 'nb-fontbtn';
    fontBtn.textContent = 'A';
    fontBtn.title = '编辑器字号：12px（点击切换）';
    footRight.appendChild(fontBtn);
    dlBtn = document.createElement('button');
    dlBtn.className = 'tbtn primary nb-dlbtn';
    dlBtn.textContent = '导出 ▾';
    footRight.appendChild(dlBtn);
    footer.appendChild(statusWrap);
    footer.appendChild(footRight);

    // ---- 组装 ----
    panel.appendChild(resizeBar);
    panel.appendChild(header);
    panel.appendChild(tab);
    panel.appendChild(toolbar);
    panel.appendChild(splitBody);
    for (var eh = 0; eh < EDGE_DIRS.length; eh++) panel.appendChild(resizeHandles[EDGE_DIRS[eh]]);
    panel.appendChild(kbd);
    panel.appendChild(dlMenu);
    panel.appendChild(aboutMenu);
    panel.appendChild(moreMenu);
    panel.appendChild(listsec);
    panel.appendChild(footer);
    // P2-35 删除确认条（自定义层：面板内底部浮条，替代原生 window.confirm）
    delqEl = document.createElement('div');
    delqEl.className = 'nb-delq';
    setHTML(delqEl, '<div class="q">删除当前笔记？</div><div class="nb-delq-btns"><button type="button" data-act="delno">取消</button><button type="button" class="go" data-act="delyes">删除</button></div>');
    // 内部助推翻：确认后关闭更多菜单并执行删除
    on(delqEl, 'click', function (e) {
      var b = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
      if (b === 'delno') { hideDelq(); }
      // if(idx<0) 拦截 → 删除从未执行（CDP 实证：delq 消失但列表不变）。改为先取 idx 执行删除再 hide。
      else if (b === 'delyes') { doDeleteNote(delPendingIdx); hideDelq(); }
    });
    panel.appendChild(delqEl);
    // P2-13 未保存离开确认条（自定义层，替代 DirtyGuard 内 window.confirm；与 delqEl 同构）
    dgEl = document.createElement('div');
    dgEl.className = 'nb-delq';
    setHTML(dgEl, '<div class="q">当前笔记有未保存的修改，确定要离开吗？</div><div class="nb-delq-btns"><button type="button" data-act="dgno">取消</button><button type="button" class="go" data-act="dgyes">离开</button></div>');
    on(dgEl, 'click', function (e) {
      var b = e.target && e.target.getAttribute && e.target.getAttribute('data-act');
      if (b === 'dgno') { hideDg(); }
      else if (b === 'dgyes') {
        // 先取动作再隐藏（防 dgAction 被 hideDg 清空；delqEl 同款时序教训）
        var a = dgAction;
        hideDg();
        if (a) a();
      }
    });
    panel.appendChild(dgEl);
    root.appendChild(panel);

    // ---- 选区浮钮 / mini FAB（shadow 内）----
    floatBtn = document.createElement('button');
    floatBtn.type = 'button';
    floatBtn.className = 'nb-float';
    floatBtn.setAttribute('role', 'button');
    floatBtn.setAttribute('tabindex', '0');  // P4-23：浮钮 div→button（原生键盘可达 + 读屏语义），tab 可聚焦
    floatBtn.setAttribute('aria-label', '摘录选中文字');
    setHTML(floatBtn, iconSvg('scissors') + ' 摘录');  // P2-36 术语统一：记入笔记 → 摘录（核心动词对齐）
    root.appendChild(floatBtn);

    miniFab = document.createElement('button');
    miniFab.className = 'nb-fab';
    setHTML(miniFab, iconSvg('nb'));
    miniFab.title = '展开笔记（Alt+N）· 长按新建';  // P2-41 长按新建提示入 title
    root.appendChild(miniFab);
    // V1.8.6.6 恢复上次拖拽位置（无持久化时默认 CSS right:12px/top:50% 兜底）
    try {
      var fabPos = JSON.parse(localStorage.getItem(FAB_KEY) || 'null');
      if (fabPos && typeof fabPos[0] === 'number' && typeof fabPos[1] === 'number') {
        miniFab.style.left = fabPos[0] + 'px';
        miniFab.style.top = fabPos[1] + 'px';
        miniFab.style.right = 'auto';
        miniFab.style.transform = 'none';
      }
    } catch (e) { /* 持久化位置损坏则忽略 */ }

    // ---- 摘录归属询问条（V1.8.6.4，跨站摘录时出现）----
    askBar = document.createElement('div');
    askBar.className = 'nb-askbar';
    var askTxt = document.createElement('span');
    askTxt.textContent = '页面与当前笔记来源不同，本次摘录？';
    var askNew = document.createElement('button');
    askNew.className = 'primary';
    askNew.textContent = '摘录到新笔记';  // P2-36 术语统一
    var askCur = document.createElement('button');
    askCur.textContent = '继续摘录';  // P2-36 术语统一
    askBar.appendChild(askTxt);
    askBar.appendChild(askNew);
    askBar.appendChild(askCur);
    on(askNew, 'click', function (e) { e.stopPropagation(); askToNew(); });
    on(askCur, 'click', function (e) { e.stopPropagation(); askToCur(); });
    root.appendChild(askBar);

    document.body.appendChild(host);
  }

  /* ============================================================
   *  渲染
   * ============================================================ */
  function renderPreview() {
    var note = DataPipe.read();
    setHTML(preview, note ? renderMd(note.content) : '<p style="color:var(--text-tertiary)">暂无内容</p>');
    buildOutline();
  }

  // P1-9#2 大纲树（V1.8.8 检索 P0 最小切片）：渲染后解析预览区 h1-h4 标题树。
  // 无标题隐藏 #outline；标题点击定位 = offsetTop（相对 .nb-preview，position:relative 含块）
  // 手动算 scrollTop 而非 scrollIntoView（后者会连带滚动宿主页面，面板内导航不应惊动页面）
  function buildOutline() {
    var hs = preview.querySelectorAll('h1,h2,h3,h4');
    var html = '<b>大纲</b>';
    for (var i = 0; i < hs.length; i++) {
      var lv = parseInt(hs[i].tagName.charAt(1), 10);
      var txt = (hs[i].textContent || '').trim() || '（空标题）';
      html += '<div data-lv="' + lv + '" data-off="' + hs[i].offsetTop + '" title="' + escHtml(txt) + '">' +
        escHtml(txt) + '</div>';
    }
    setHTML(outlineEl, html);
    outlineEl.style.display = hs.length ? 'block' : 'none';
  }

  function syncHL() {
    setHTML(hlLayer, renderHL(ta.value));
    hlLayer.scrollTop = ta.scrollTop;
    hlLayer.scrollLeft = ta.scrollLeft;
  }

  function renderList() {
    noteList.replaceChildren(); // V1.8.9 空串清空改 replaceChildren（Trusted Types 下空串同样被拦）
    // V1.8.7 #5：updated 降序（最近编辑优先）；NOTES 存储顺序不变，data-idx 始终为真实索引
    // V1.8.7.1 P2-31 合并：单列表渲染（capFilter 过滤 + 无匹配空态 + 当前笔记 on 高亮）
    var order = [];
    for (var i0 = 0; i0 < NOTES.length; i0++) order.push(i0);
    order.sort(function (a, b) { return NOTES[b].updated - NOTES[a].updated; });
    var q = (capFilter || '').toLowerCase();
    var hit = 0;
    _kbResults = [];   // V1.8.7.4 P2-22②：每次渲染重建结果集（过滤/输入变化后 _kbSel 由钳制逻辑校正）
    for (var k = 0; k < order.length; k++) {
      var idx = order[k];
      var n = NOTES[idx];
      if (q && (n.title || '').toLowerCase().indexOf(q) === -1 &&
          (n.content || '').toLowerCase().indexOf(q) === -1) continue;
      _kbResults.push(idx);
      hit++;
      var on = idx === cur;
      var kb = _kbSel === (hit - 1);
      var html = '<span class="t">' + escHtml(n.title || '（无标题）') + '</span>' +
        // V1.8.7.6 P1-3 来源 host 短显（摘录语境前置；host 为空则不占位，ellipsis 兜底溢出）
        '<span class="m">' + (n.host ? escHtml(n.host) + ' · ' : '') + fmtDate(n.updated) + ' · ' + chCount(n.content) + ' 字</span>';
      var div = document.createElement('div');
      div.className = 'nb-item' + (on ? ' on' : '') + (kb ? ' kbsel' : '');
      div.setAttribute('data-idx', idx);
      setHTML(div, html);
      noteList.appendChild(div);
    }
    // 仅作越界保险丝（-1 保持「无选中」语义，不升 0；渲染不变，下一次键盘操作自会校正）
    if (_kbResults.length === 0) _kbSel = -1;
    else if (_kbSel >= _kbResults.length) _kbSel = _kbResults.length - 1;
    if (q && !hit) {
      _kbResults = [];
      _kbSel = -1;
      var empty = document.createElement('div');
      empty.className = 'nb-item';
      setHTML(empty, '<span class="t" style="color:var(--text-tertiary)">无匹配笔记</span>');
      noteList.appendChild(empty);
    }
    setHTML(capsuleTxt, iconSvg('search') + '搜索笔记 ' + (realNoteCount() ? realCurIndex(cur) + '/' + realNoteCount() : '0/0'));  // V1.8.14 欢迎笔记计入计数
  }

  // P3-18（2026-08-11）：键盘选中高亮局部更新——只挪 kbsel class，不重建整列表
  //（原 ↑/↓ 每次全量 renderList 重建 DOM，列表大时每键都重排；滚动位置/焦点也随之丢失）
  function applyKbSel() {
    var items = noteList.querySelectorAll('.nb-item');
    for (var i = 0; i < items.length; i++) {
      var isKb = (_kbSel >= 0 && items[i].getAttribute('data-idx') !== null &&
        String(_kbResults[_kbSel]) === items[i].getAttribute('data-idx'));
      if (isKb && items[i].className.indexOf('kbsel') === -1) items[i].className += ' kbsel';
      else if (!isKb && items[i].className.indexOf('kbsel') !== -1) items[i].className = items[i].className.replace(' kbsel', '');
    }
  }

  // V1.8.7.1 P2-31 合并：列表区展开/收起（胶囊点击 toggle；/ 与折叠态展开用）
  function setListOpen(open) {
    if (!listsec) return;
    listsec.style.display = open ? 'flex' : 'none';
  }

  function openSearch() {
    if (folded) toggleFold();
    // V1.8.7.1 P2-31 合并：打开时清空过滤 + 展开列表区 + 聚焦常驻搜索框
    setListOpen(true);
    capFilter = '';
    capSearch.value = '';
    _kbSel = -1; _kbResults = [];   // V1.8.7.4 P2-22②：打开重置键盘选中
    renderList();
    try { capSearch.focus(); } catch (err) { }
    try { capSearch.select(); } catch (err) { }
  }

  // P2-39 摘录条数统计（`> 原文摘录自` 行计数；含 [同页] 降噪行）
  function countQuotes(text) {
    return (text.match(/^> 原文摘录自/gm) || []).length;
  }
  function realNoteCount() {
    return NOTES.length;
  }
  // V1.8.14 索引序号从 1 开始：直接 i+1（原 Math.max(1,c) 钳制为 P2-40 排除逻辑的补偿，已无需要）
  function realCurIndex(i) {
    return i + 1;
  }

  function updateCount() {
    var note = DataPipe.read();
    countEl.textContent = '共 ' + (note ? chCount(note.content) : 0) + ' 字';
  }

  // V1.8.7.1 P2-28 三态模式：edit | preview | split（分屏实时渲染；编辑=默认态无按钮）
  function showTab(m) {
    mode = m;
    splitTab.classList.toggle('on', m === 'split');
    // V1.8.7.1 显示⇄编辑按钮回显：preview 态 → 「✎ 编辑」，其余 → 「👁 显示」
    viewToggleBtn.textContent = (m === 'preview') ? '✎ 编辑' : '👁 显示';
    viewToggleBtn.classList.toggle('on', m !== 'preview');
    if (m === 'split') {
      editWrap.style.display = '';
      previewWrap.style.display = 'block';
      renderPreview();
    } else if (m === 'preview') {
      editWrap.style.display = 'none';
      previewWrap.style.display = 'block';
      renderPreview();
    } else {
      editWrap.style.display = '';
      previewWrap.style.display = 'none';
    }
  }

  /* ============================================================
   *  采集层：选区浮钮 + 结构化引用（JTBD 核心）
   * ============================================================ */
  function hideFloat() {
    floatBtn.style.display = 'none';
    selCache = '';
    syncSelBtn();
  }

  // V1.8.6.8 引用选中按钮灰化（无选区时 off 态；点击仍有「请先选中文字」提示兜底）
  function syncSelBtn() {
    var b = root.querySelector('#btnInsSel');
    if (!b) return;
    b.classList.toggle('off', !(selCache && selCache.trim()));
  }

  function showFloat(rect) {
    var w = floatBtn.offsetWidth || 120;
    var left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8));
    var top = rect.top - 40;
    if (top < 8) top = rect.bottom + 8;
    var h = floatBtn.offsetHeight || 40;
    top = Math.min(top, window.innerHeight - h - 8);
    if (top < 8) top = 8;
    floatBtn.style.left = left + 'px';
    floatBtn.style.top = top + 'px';
    floatBtn.style.display = 'flex';
  }

  // 结构化引用块（V1.3.1 §3.5 格式 + 设计稿 3.5；多行续行补 '> ' 前缀）
  // V1.8.7 同页摘录降噪（方案 A，2026-08-07）：isRepeat=true 时来源行降为 [同页](url)，
  // 省标题留 URL（追溯性与复制引用流正则「> 原文摘录自」前缀零损失）
  function buildQuoteBlock(txt, isRepeat) {
    var quoted = String(txt == null ? '' : txt).trim().replace(/\n/g, '\n> ');
    if (isRepeat) {
      return '> 原文摘录自 [同页](' + pageUrl + ')\n\n> ' + quoted + '\n';
    }
    return '> 原文摘录自 [' + pageTitle + '](' + pageUrl + ')\n\n> ' + quoted + '\n';
  }

  function appendQuote(txt) {
    var note = DataPipe.read();
    if (!note) return;
    // V1.8.6.10 折叠态下摘录 = 进入记录态 → 自动展开面板（浏览态让位）
    if (folded) toggleFold();
    // 摘录不打断（V1.8.6.4）：在写入前判定光标是否位于文末（写入后 value 变长，判定会失真）
    var atEnd = (ta.selectionStart || 0) === ta.value.length;
    var content = note.content || '';
    var sep = content.trim() ? '\n\n---\n\n' : '';
    // V1.8.7 同页摘录降噪（方案 A）：笔记内已含当前页完整来源行 → 本次摘录用 [同页] 短格式
    var fullSrcLine = '> 原文摘录自 [' + pageTitle + '](' + pageUrl + ')';
    var isRepeat = content.indexOf(fullSrcLine) !== -1;
    var block = buildQuoteBlock(txt, isRepeat);
    var prevContent = content;
    DataPipe.write('quote', { content: content + sep + block });
    undoStack.push({ prev: prevContent, caret: ta.selectionStart, cur: note.content });
    if (undoStack.length > 20) undoStack.shift();
    track('quote');
    // 仅当光标位于文末（或预览态无编辑位置）时才滚动/聚焦，否则保留编辑位置
    // V1.8.7.1 P2-28 分屏模式保留分屏并实时刷新预览
    if (mode === 'preview') { showTab('edit'); ta.scrollTop = ta.scrollHeight; ta.focus(); }
    else if (mode === 'split') { renderPreview(); if (atEnd) { ta.scrollTop = ta.scrollHeight; ta.focus(); } }
    else if (atEnd) { ta.scrollTop = ta.scrollHeight; ta.focus(); }
    // P2-39 首次摘录进度语义（北极星 onboarding）：当前笔记第 1 条摘录 → 带进度 toast，后续保持简洁
    var quoteCount = countQuotes(content + sep + block);
    setStatus(quoteCount === 1 ? '已摘录 ✓（第 1 条，含来源）' : '已摘录 ✓', 'blue', 3000);
    // 归属提示（V1.8.6.4）：页面 host 与当前笔记 host 不一致时询问
    if (pageHost && note.host && note.host !== pageHost) {
      pendingQuote = txt;
      showAskBar();
    }
  }

  function showAskBar() {
    if (!askBar) return;
    askBar.style.display = 'flex';
    setStatus('🔄 已记入当前笔记 · 可归入新笔记', 'blue', 4000);
  }
  function hideAskBar() {
    if (askBar) askBar.style.display = 'none';
  }
  function askToCur() {
    hideAskBar();
    pendingQuote = '';
    setStatus('已记入当前笔记 ✓', 'blue', 2500);
  }
  function askToNew() {
    hideAskBar();
    var txt = pendingQuote;
    pendingQuote = '';
    if (!txt) return;
    var note = DataPipe.read();
    var sep = note && note.content && note.content.trim() ? '\n\n---\n\n' : '';
    var block = buildQuoteBlock(txt);
    var full = sep + block;
    // 校验后回滚已追加到当前笔记的内容（防并发/编辑导致的不匹配损坏）
    if (note && full && note.content && note.content.endsWith(full)) {
      DataPipe.write('quote-rollback', { content: note.content.slice(0, -full.length) });
    }
    var nn = {
      id: genId(),
      title: pageTitle || '新笔记',
      content: '',
      url: pageUrl,
      host: pageHost,
      created: Date.now(),
      updated: Date.now()
    };
    NOTES.unshift(nn);
    cur = 0;
    DataPipe.write('new-quote', { content: block });
    flushSave();
    DataPipe.syncAll('switch');
    setStatus('已归入新笔记（' + pageHost + '）✓', 'blue', 3000);
  }

  function appendSource() {
    var note = DataPipe.read();
    if (!note) return;
    var content = note.content || '';
    var sep = content.trim() ? '\n\n' : '';
    var prevContent = content;
    DataPipe.write('link', { content: content + sep + '> 来源：[' + pageTitle + '](' + pageUrl + ')\n' });
    undoStack.push({ prev: prevContent, caret: ta.selectionStart, cur: note.content });
    if (undoStack.length > 20) undoStack.shift();
    if (mode === 'preview') showTab('edit');
    else if (mode === 'split') renderPreview();
    setStatus('已插入页面链接');
  }

  // 全局 mouseup：判定选区并定位浮钮（composedPath 区分面板内外）
  function onGlobalMouseUp(e) {
    var path = e.composedPath ? e.composedPath() : [];
    // 点击在浮钮自身 → 交给 click 处理
    if (path.indexOf(floatBtn) !== -1) return;
    // 点击在面板内 → 仅隐藏浮钮，保留 selCache（供「✂️ 引用选中」使用）
    if (path.indexOf(root) !== -1) { floatBtn.style.display = 'none'; syncSelBtn(); return; }
    var sel = window.getSelection();
    var txt = (sel && sel.rangeCount > 0 && String(sel)) || '';
    if (txt && txt.trim()) {
      selCache = txt;
      syncSelBtn();
      try {
        var rect = sel.getRangeAt(0).getBoundingClientRect();
        if (rect && rect.width > 2 && rect.height > 2) showFloat(rect);
        else hideFloat();
      } catch (err) { hideFloat(); }
    } else if (sel && sel.rangeCount > 0) {
      hideFloat();
      if (Date.now() - _noSelHintAt > NO_SEL_HINT_MS) {
        _noSelHintAt = Date.now();
        showToast('该选区在网页组件内部 · 可用「引用选中」粘贴', 'warn');
      }
    } else {
      hideFloat();
    }
  }

  // V1.8.6.8 键盘选区兜底（Shift+方向键）：有选区时同步缓存并点亮「✂️ 引用选中」
  var _selDebounce = null;
  function onSelChange() {
    if (_selDebounce) clearTimeout(_selDebounce);
    _selDebounce = setTimeout(function () {
      var sel = window.getSelection();
      var txt = (sel && sel.rangeCount > 0 && String(sel)) || '';
      if (txt && txt.trim()) {
        selCache = txt;
        syncSelBtn();
      } else {
        syncSelBtn();
      }
    }, 80);
  }

  /* ============================================================
   *  编辑层：工具栏插入（点击即插入，选中文本则包裹）
   * ============================================================ */
  var INS = {
    b: ['**', '**', '加粗文字'],
    i: ['*', '*', '斜体文字'],
    ul: ['- ', '', '列表项'],
    ol: ['1. ', '', '列表项'],
    todo: ['- [ ] ', '', '待办事项'],
    quote: ['> ', '', '引用内容'],
    cb: ['\n```\n', '\n```\n', 'code']
  };
  // 标题档位循环（主流对齐：H1/H2/H3 三档，按钮文字显示当前档）
  var HEAD_LEVELS = ['# ', '## ', '### '];
  var hLevel = 1; // 默认 H2（对应 HEAD_LEVELS[1]）

  function insertToolbar(kind, level) {
    if (mode === 'preview') showTab('edit');
    var prevVal = ta.value, prevCaret = ta.selectionStart;
    var pushUndo = function () { undoStack.push({ prev: prevVal, caret: prevCaret, cur: ta.value }); if (undoStack.length > 20) undoStack.shift(); };
    if (kind === 'h') kind = 'head';
    var m = INS[kind];
    if (!m && kind !== 'head') return;
    var hl = kind === 'head' ? (level !== undefined ? level : hLevel) : 0;
    var s = ta.selectionStart || 0, e = ta.selectionEnd || 0;
    var sel = ta.value.slice(s, e);
    // 标题行首插入（主流行为：光标所在行前加 #；已有标记 → 替换/互替，同类重复点击 = toggle 移除，防叠加）
    if (kind === 'head' || kind === 'ul' || kind === 'ol' || kind === 'todo' || kind === 'quote') {
      var lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
      var lineEnd = ta.value.indexOf('\n', s);
      if (lineEnd === -1) lineEnd = ta.value.length;
      var lineText = ta.value.slice(lineStart, lineEnd);
      var prefix = kind === 'head' ? HEAD_LEVELS[hl] : m[0];
      // V1.8.7.2 列表类型循环切换（朋友反馈 #7）：点「列表」按钮 有序↔无序 循环切换
      // 有序行 → 换无序前缀；无序行（非待办）→ 换有序前缀；待办/引用/无标记走原互替逻辑
      if (kind === 'ol' || kind === 'ul') {
        if (/^\s*\d+\.\s+/.test(lineText)) prefix = '- ';
        else if (/^\s*[-*+]\s+/.test(lineText) && !/^\s*- \[[ xX]\]\s+/.test(lineText)) prefix = '1. ';
      }
      var strip = 0, preInd = '', preM = null;
      var preRe = kind === 'head' ? /^(\s*)(#{1,6})\s+/
        : kind === 'quote' ? /^(\s*)(>\s?)/
        : /^(\s*)((?:- \[[ xX]\]\s+|[-*+]\s+|\d+\.\s+))/;
      preM = lineText.match(preRe);
      if (preM) { strip = preM[0].length; preInd = preM[1]; }
      // 同类标记重复点击 = toggle（移除回普通行）；异类 = 剥离旧标记换新（保留缩进层级）
      // 比较用归一化（去空白 + 勾选态 x/X 视为同类：`> ` vs `>`、`- [ ] ` vs `- [x] `）
      var toggleOff = kind !== 'head' && preM && preM[2].replace(/[\sxX]/g, '') === prefix.replace(/[\sxX]/g, '');
      content = ta.value.slice(0, lineStart) +
        (toggleOff ? '' : preInd + prefix) +
        ta.value.slice(lineStart + strip);
      DataPipe.write('toolbar', { content: content });
      pushUndo();
      var after = lineStart + (toggleOff ? 0 : preInd.length + prefix.length) + (sel ? sel.length : 0);
      ta.focus();
      try { ta.setSelectionRange(after, after); } catch (err) { }
      if (hlEnabled) syncHL();
      if (mode === 'split') renderPreview();
      // V1.8.7.7 标题插入完成后循环到下一档并同步按钮文字（插入后循环，按钮=将插入的档位）
      // V1.8.13 B6：显式档位（level 指定）不推进循环——快捷键固定档位与按钮循环档位独立
      if (kind === 'head' && level === undefined) {
        hLevel = (hLevel + 1) % HEAD_LEVELS.length;
        var hBtn = toolbar.querySelector('[data-ins="h"]');
        if (hBtn) hBtn.textContent = 'H' + (hLevel + 1);
      }
      return;
    }
    // 代码块：选中包裹 / 空选区插入占位（光标置代码区内）
    if (kind === 'cb') {
      content = ta.value.slice(0, s) + m[0] + (sel || 'code') + m[1] + ta.value.slice(e);
      DataPipe.write('toolbar', { content: content });
      pushUndo();
      var inside = s + m[0].length + (sel ? sel.length : 4);
      ta.focus();
      try { ta.setSelectionRange(inside, inside); } catch (err) { }
      if (hlEnabled) syncHL();
      if (mode === 'split') renderPreview();
      return;
    }
    var content;
    if (sel) {
      content = ta.value.slice(0, s) + m[0] + sel + m[1] + ta.value.slice(e);
    } else {
      content = ta.value.slice(0, s) + m[0] + m[2] + m[1] + ta.value.slice(e);
    }
    DataPipe.write('toolbar', { content: content });
    pushUndo();
    var pos = s + m[0].length + (sel ? sel.length : m[2].length) + m[1].length;
    ta.focus();
    try { ta.setSelectionRange(pos, pos); } catch (err) { }
    if (hlEnabled) syncHL();
    if (mode === 'split') renderPreview();
  }

  /* ============================================================
   *  编辑层：快捷键（Tab/Enter 续列表/Ctrl+B/I/Alt+N）
   * ============================================================ */
  // 键盘手动改内容统一提交：NOTES + 回写编辑区 + 光标 + 高亮/字数/列表同步
  // V1.8.12 A2：程序化修改撤销栈（Tab 缩进/Enter 续行/Ctrl+B/I 等 commitContent 路径）。
  // 分层语义：打字撤销归浏览器原生（input 监听 L2824 已把原生撤销同步回 NOTES）；
  // 程序化修改走自实现栈——commitContent 程序化赋值会替换浏览器 undo 栈（原生撤销不可靠），
  // 由本栈接管。Ctrl+Z 仅在「栈顶 cur === 当前内容」（无后续打字）时回退程序化修改，
  // 否则放行原生（先撤销打字）。上限 20 步防长文本快照内存膨胀。
  var undoStack = [];
  function commitContent(newVal, caret, noTrack) {
    if (!noTrack) {
      undoStack.push({ prev: ta.value, caret: ta.selectionStart, cur: newVal });
      if (undoStack.length > 20) undoStack.shift();
    }
    DataPipe.write('kb', { content: newVal });
    ta.value = newVal;
    try { ta.setSelectionRange(caret, caret); } catch (err) { }
    if (hlEnabled) syncHL();
    if (mode === 'split') renderPreview();
    updateCount();
    renderList();
  }

  function onTaKeydown(e) {
    // IME 组合输入（中文输入法选词）期间不拦截：候选词确认的 Enter/Tab 必须放行（V1.8.7 修复）
    if (e.isComposing) return;
    if (e.key === 'Enter' && delqEl && delqEl.style.display === 'block') {
      e.preventDefault();
      doDeleteNote(delPendingIdx);
      hideDelq();
      return;
    }
    if ((e.key === '/' || e.key === '／') && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if ((_lastKey === '.' || _lastKey === '。') && Date.now() - _lastKeyAt < 800) {
        e.preventDefault();
        var pos = ta.selectionStart;
        if (pos > 0 && ta.value.charAt(pos - 1) === '.') {
          var v = ta.value;
          var cut = pos - 1;
          commitContent(v.slice(0, cut) + v.slice(pos), cut, true);
        }
        openSearch();
      }
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
      if (undoStack.length && undoStack[undoStack.length - 1].cur === ta.value) {
        e.preventDefault();
        var op = undoStack.pop();
        commitContent(op.prev, op.caret, true);
      }
      return;
    }
    // V1.8.13 B3 Ctrl+Enter：待办行切换 [ ]↔[x]（Obsidian 惯例；非待办行无操作防歧义。
    // 须置于 Enter 续行分支之前——原 Enter 分支无 !e.ctrlKey，不拦截则被当续行吞掉）
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key === 'Enter') {
      e.preventDefault();
      var ts = ta.selectionStart, tval = ta.value;
      var tFence = tval.slice(0, ts).match(/```/g);
      if (tFence && tFence.length % 2 === 1) return;
      var tLineStart = tval.lastIndexOf('\n', ts - 1) + 1;
      var tLineEnd = tval.indexOf('\n', ts);
      if (tLineEnd === -1) tLineEnd = tval.length;
      var mTodo = tval.slice(tLineStart, tLineEnd).match(/^(\s*)- \[([ xX])\] /);
      if (mTodo) {
        // [x] 与 [ ] 等长，光标原位复用
        var tNewPrefix = '- [' + (mTodo[2] === ' ' ? 'x' : ' ') + '] ';
        commitContent(tval.slice(0, tLineStart + mTodo[1].length) + tNewPrefix + tval.slice(tLineStart + mTodo[0].length), ts);
      }
      return;
    }
    // V1.8.13 B4+B6 Ctrl+Shift+数字：标题 1/2/3 显式档位 + 列表 8=无序 7=有序（Obsidian 惯例）。
    // 用 e.code 判物理键（Ctrl+Shift+1 的 e.key 可能是 '!'/'@'/'#'，布局相关不可靠）
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey) {
      if (e.code === 'Digit1' || e.code === 'Digit2' || e.code === 'Digit3') {
        e.preventDefault();
        insertToolbar('head', parseInt(e.code.slice(5), 10) - 1);
        return;
      }
      if (e.code === 'Digit8') { e.preventDefault(); insertToolbar('ul'); return; }
      if (e.code === 'Digit7') { e.preventDefault(); insertToolbar('ol'); return; }
    }
    // Shift+Tab 减缩进：列表/待办行首移除 2 空格（Tab 的逆操作，主流笔记嵌套退出）
    if (e.shiftKey && e.key === 'Tab') {
      e.preventDefault();
      var s = ta.selectionStart, val = ta.value;
      var lineStart = val.lastIndexOf('\n', s - 1) + 1;
      var lineTxt = val.slice(lineStart, s);
      if (/^(\s*- |\s*\d+\. |\s*- \[[ xX]\] )/.test(lineTxt) && /^ {2}/.test(lineTxt)) {
        commitContent(val.slice(0, lineStart) + val.slice(lineStart + 2), Math.max(s - 2, lineStart));
        return;
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      var s = ta.selectionStart, val = ta.value;
      // 列表/待办行内 Tab：行首追加 2 空格缩进（主流笔记：嵌套层级快捷方式）
      var lineStart = val.lastIndexOf('\n', s - 1) + 1;
      var lineTxt = val.slice(lineStart, s);
      if (/^(\s*- |\s*\d+\. |\s*- \[[ xX]\] )/.test(lineTxt)) {
        commitContent(val.slice(0, lineStart) + '  ' + val.slice(lineStart), s + 2);
        return;
      }
      commitContent(val.slice(0, s) + '  ' + val.slice(ta.selectionEnd), s + 2);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      var pos = ta.selectionStart;
      var before = ta.value.slice(0, pos);
      // 代码块内 Enter：不续列表/待办，走默认换行（检测光标前 ``` 是否未闭合）
      var fence = before.match(/```/g);
      if (fence && fence.length % 2 === 1) return;
      var ls = before.lastIndexOf('\n') + 1;
      var line = before.slice(ls);
      // 嵌套缩进列表：行首空白 + 标记（主流笔记：Enter 续行保留缩进层级）
      var ind = '';
      var mInd = line.match(/^\s*/);
      if (mInd) ind = mInd[0];
      var rest = line.slice(ind.length);
      var isList = rest.indexOf('- ') === 0;
      var isTodo = rest.indexOf('- [ ] ') === 0 || rest.indexOf('- [x] ') === 0 || rest.indexOf('- [X] ') === 0;
      // 有序列表续行：`1. ` 前缀 → 递增序号（主流笔记行为）
      var olMatch = rest.match(/^(\d+)\.\s/);
      if (olMatch) {
        e.preventDefault();
        var olRest = rest.slice(olMatch[0].length);
        if (!olRest.trim()) {
          commitContent(ta.value.slice(0, ls) + ta.value.slice(ta.selectionEnd), ls);
        } else {
          commitContent(ta.value.slice(0, pos) + '\n' + ind + (parseInt(olMatch[1], 10) + 1) + '. ' + ta.value.slice(ta.selectionEnd), pos + ind.length + (parseInt(olMatch[1], 10) + 1).toString().length + 3);
        }
        return;
      }
      if (isList || isTodo) {
        e.preventDefault();
        var rst = rest.slice(isTodo ? 6 : 2);
        var prefix = ind + (isTodo ? '- [ ] ' : '- ');
        if (!rst.trim()) {
          // 空行退出列表：删除当前行（含缩进）前缀
          commitContent(ta.value.slice(0, ls) + ta.value.slice(ta.selectionEnd), ls);
        } else {
          commitContent(ta.value.slice(0, pos) + '\n' + prefix + ta.value.slice(ta.selectionEnd), pos + prefix.length + 1);
        }
        return;
      }
    }
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      var k = e.key.toLowerCase();
      if (k === 'b') { e.preventDefault(); wrapSelect('**', '**'); }
      else if (k === 'i') { e.preventDefault(); wrapSelect('*', '*'); }
    }
  }

  function wrapSelect(a, b) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    var sel = ta.value.slice(s, e) || '文字';
    commitContent(ta.value.slice(0, s) + a + sel + b + ta.value.slice(e), s + a.length + sel.length);
  }

  function inEditableField(e) {
    var t = e.composedPath ? e.composedPath()[0] : document.activeElement;
    return !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable));
  }

  // V1.8.14 ./ 双键触发搜索：记录上一键（onGlobalKeydown 冒泡级，编辑区内按键也经过）
  var _lastKey = '', _lastKeyAt = 0;
  // V1.8.14 中文输入法兜底：记录「。」上屏时间（keydown 被输入法吞时走 input 事件检测）
  var _lastDotInputAt = 0;

  // 全局 Alt+N 折叠 / `./` 搜索 / Alt+F 全屏（焦点不在输入框/富文本编辑区时生效）
  function onGlobalKeydown(e) {
    var prevKey = _lastKey, prevKeyAt = _lastKeyAt;
    _lastKey = e.key; _lastKeyAt = Date.now();
    if (e.altKey && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      if (folded) toggleFold();
      addNote();
    } else if (e.altKey && !e.shiftKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      toggleFold();
    } else if (e.altKey && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      if (folded) toggleFold();
      toggleFullscreen();
    } else if (e.key === '/' || e.key === '／') {
      if (inEditableField(e)) return;
      if ((prevKey === '.' || prevKey === '。') && Date.now() - prevKeyAt < 800) {
        e.preventDefault();
        openSearch();
      }
    } else if (e.altKey && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      // V1.8.7.1 显示⇄编辑一键切换（Alt+P）
      // V1.8.13 F4：补 !e.shiftKey——Alt+Shift+P 不再误触切换（与 Alt+N 分支同款区分）
      e.preventDefault();
      showTab(mode === 'preview' ? 'edit' : 'preview');
    } else if (e.altKey && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (folded) toggleFold();
      if (mode !== 'split' && panel.offsetWidth < 480) {
        showToast('分屏需要更宽的面板（≥480px），请先拉宽再分屏', 'warn');
        return;
      }
      showTab(mode === 'split' ? 'edit' : 'split');
    } else if (e.ctrlKey && e.altKey && !e.shiftKey && (e.key === 'e' || e.key === 'E')) {
      e.preventDefault();
      e.stopPropagation();
      aboutMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      dlMenu.style.display = dlMenu.style.display === 'block' ? 'none' : 'block';
    } else if (e.ctrlKey && e.altKey && !e.shiftKey && (e.key === 'x' || e.key === 'X')) {
      e.preventDefault();
      doDeleteNote(cur);
    } else if (e.key === 'Enter' && delqEl && delqEl.style.display === 'block') {
      // V1.8.14 删除确认条 Enter 确认（非编辑区场景；编辑区内由 onTaKeydown 先处理并已隐藏确认条，
      // 此处 display 已非 block 不会重复执行）
      e.preventDefault();
      doDeleteNote(delPendingIdx);
      hideDelq();
    } else if (e.key === 'Escape') {
      // P2-35/P2-38 配套：Esc 统一关闭浮层（导出菜单 / 更多菜单 / 关于浮层 / 产品说明 / 反馈浮层 / 删除确认条=取消）
      dlMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      aboutMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层（2026-08-11）
      if (delqEl && delqEl.style.display === 'block') hideDelq();
      if (dgEl && dgEl.style.display === 'block') hideDg();   // P2-13：未保存确认条 Esc=取消
      setListOpen(false);
    }
  }

  // V1.8.7.1 P2-29 全屏切换：面板接管整个视口；还原回到全屏前状态（悬浮 or 停靠）
  function toggleFullscreen() {
    fullscreen = !fullscreen;
    panel.classList.toggle('nb-fs', fullscreen);
    if (fullscreen) {
      if (floating) { panel.style.position = 'fixed'; panel.style.top = '60px'; panel.style.right = '20px'; panel.style.height = '70vh'; }
      panel.style.zIndex = '100002';
    } else {
      panel.style.zIndex = '';
      if (floating) { setFloating(true); } else { setFloating(false); }
    }
    syncEdges();
    // P2-29 方案 A：⋮ 菜单全屏项开关态回显（on 高亮 + 文案切换）
    fsItem.classList.toggle('on', fullscreen);
    fsItem.querySelector('.more-txt').textContent = fullscreen ? '全屏中（Alt+F 还原）' : '全屏（Alt+F）';
    setStatus(fullscreen ? '全屏模式（Alt+F 还原）' : '已还原面板尺寸', 'ok');
  }

  // V1.8.6.14 条件透明度档位：0=不透明 1=半透明 2=高透明（持久化 TRANS_KEY）
  var transLevel = 0;
  var TRANS_TIPS = ['面板背景透明度：不透明（点击切换）', '面板背景透明度：半透明 50%（点击切换）', '面板背景透明度：高透明 18%（点击切换）'];

  /* ============================================================
   *  折叠态（mini FAB）
   * ============================================================ */
  function toggleFold() {
    folded = !folded;
    if (folded) {
      setListOpen(false);
      dlMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      aboutMenu.style.display = 'none';
      introMenu.style.display = 'none';
      hideDelq();  // P2-35 折叠时同步收起删除确认条
      hideDg();    // P2-13 折叠时同步收起未保存确认条
      panel.style.display = 'none';
      miniFab.style.display = 'flex';
    } else {
      panel.style.display = '';
      miniFab.style.display = 'none';
      setStatus('面板已展开', 'ok');
    }
  }

  // V1.8.6.14 条件透明度：应用档位到 panel class，并持久化
  function applyTransparency() {
    panel.classList.remove('nb-trans-1', 'nb-trans-2');
    if (transLevel === 1) panel.classList.add('nb-trans-1');
    else if (transLevel === 2) panel.classList.add('nb-trans-2');
    transItem.classList.toggle('on', transLevel > 0);
    transItem.querySelector('.more-txt').textContent = '面板透明：' + (transLevel === 0 ? '关' : transLevel === 1 ? '半透明' : '高透明');
    transItem.title = TRANS_TIPS[transLevel];
    try { localStorage.setItem(TRANS_KEY, String(transLevel)); } catch (e) { /* 隐私模式静默 */ }
  }

  var fontLevel = 0;
  var FONT_LEVELS = [12, 14, 16];
  var FONT_TIPS = ['编辑器字号：12px（点击切换）', '编辑器字号：14px（点击切换）', '编辑器字号：16px（点击切换）'];

  function applyFontLevel() {
    var px = FONT_LEVELS[fontLevel];
    ta.style.fontSize = px + 'px';
    if (hlLayer) hlLayer.style.fontSize = px + 'px';
    fontBtn.textContent = fontLevel === 0 ? 'A' : fontLevel === 1 ? 'A+' : 'A++';  // V1.8.7.6 P1-4 默认档 12px 不再显示负号 A-（档位指示 A/A+/A++）
    fontBtn.title = FONT_TIPS[fontLevel];
    fontBtn.classList.toggle('on', fontLevel > 0);
    try { localStorage.setItem(FONT_KEY, String(fontLevel)); } catch (e) { /* 隐私模式静默 */ }
  }

  function cycleFontLevel() {
    fontLevel = (fontLevel + 1) % FONT_LEVELS.length;
    applyFontLevel();
    setStatus('编辑器字号：' + FONT_LEVELS[fontLevel] + 'px', 'ok');
  }
  function cycleTransparency() {
    transLevel = (transLevel + 1) % 3;
    applyTransparency();
    // V1.8.6.15 高透明档可读性风险提示
    setStatus(transLevel === 0 ? '面板已恢复不透明' : transLevel === 1 ? '面板已切换为半透明' : '高透明已开启：复杂背景上可读性可能下降', 'ok');
  }

  /* ============================================================
   *  悬浮 / 停靠 / 拖拽 / 宽度调整
   * ============================================================ */
  // V1.8.6.6 mini FAB 拖拽（折叠态小图标可移动，位置持久化；长按 600ms 直接新建）
  function startFabDrag(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    var longPressed = false;
    var rect = miniFab.getBoundingClientRect();
    var oLeft = rect.left, oTop = rect.top;
    var startX = e.clientX, startY = e.clientY;
    var moved = false;
    fabTimer = setTimeout(function () {
      fabTimer = null;
      longPressed = true;
      addNote();
      if (folded) toggleFold();
      setStatus('已新建笔记', 'ok');
    }, 600);
    function move(ev) {
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 4) return;
      moved = true;
      ev.preventDefault(); // 拖拽中阻止文本选中（不再作用于 mousedown，避免吞 click）
      if (fabTimer) { clearTimeout(fabTimer); fabTimer = null; }
      var l = Math.max(4, Math.min(window.innerWidth - 48, oLeft + dx));
      var t = Math.max(4, Math.min(window.innerHeight - 48, oTop + dy));
      miniFab.style.left = l + 'px';
      miniFab.style.top = t + 'px';
      miniFab.style.right = 'auto';
      miniFab.style.transform = 'none';
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (fabTimer) { clearTimeout(fabTimer); fabTimer = null; }
      if (moved || longPressed) {
        try {
          var p = miniFab.getBoundingClientRect();
          localStorage.setItem(FAB_KEY, JSON.stringify([p.left, p.top]));
        } catch (err) { /* 隐私模式静默 */ }
      } else {
        toggleFold();
        if (!folded) {
          setListOpen(true);
          capFilter = '';
          capSearch.value = '';
          renderList();
          focusCapSearch();
          // V1.8.7.6 P0-2 隐藏手势可发现性：长按 600ms 新建只在 title 里，展开时 toast 点破
          showToast('长按 FAB 可快速新建笔记', 'ok');
        }
      }
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  function startEdgeResize(e, dir) {
    e.preventDefault();
    e.stopPropagation();
    var startX = e.clientX, startY = e.clientY;
    var r = panel.getBoundingClientRect();
    var origLeft = r.left, origTop = r.top, origW = r.width, origH = r.height;
    var hd = e.currentTarget;
    hd.classList.add('active');
    var hMax = Math.max(240, Math.round(window.innerHeight - 60 - 12));
    function move(ev) {
      var dx = ev.clientX - startX, dy = ev.clientY - startY;
      var nl = origLeft, nt = origTop, nw = origW, nh = origH;
      if (dir.indexOf('W') !== -1) { nl = origLeft + dx; nw = origW - dx; }
      if (dir.indexOf('E') !== -1) nw = origW + dx;
      if (dir.indexOf('N') !== -1) { nt = origTop + dy; nh = origH - dy; }
      if (dir.indexOf('S') !== -1) nh = origH + dy;
      nw = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, nw));
      nh = Math.max(240, Math.min(hMax, nh));
      // 反向拉伸钳制：W/N 边不得超过对边（最小尺寸处停）
      nl = Math.min(nl, origLeft + origW - PANEL_MIN_W);
      nt = Math.min(nt, origTop + origH - 240);
      nl = Math.max(4, nl);
      nt = Math.max(4, nt);
      nw = Math.min(nw, Math.max(PANEL_MIN_W, window.innerWidth - 4 - nl));
      nh = Math.min(nh, Math.max(240, window.innerHeight - 4 - nt));
      if (mode === 'split' && nw < 480) { showTab('edit'); showToast('面板过窄，已退出分屏', 'warn'); }
      panel.style.position = 'fixed';
      panel.style.left = nl + 'px';
      panel.style.top = nt + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.width = nw + 'px';
      panel.style.height = nh + 'px';
    }
    function up() {
      hd.classList.remove('active');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      // V1.8.7.1 拉伸尺寸持久化（W/H 复用 H_KEY；位置随拖拽手写 left/top）
      try { localStorage.setItem(H_KEY, String(panel.offsetHeight)); } catch (err) { /* 隐私模式静默 */ }
      var pr = panel.getBoundingClientRect();
      try { localStorage.setItem(PANEL_RECT_KEY, JSON.stringify({ left: pr.left, top: pr.top, width: pr.width, height: pr.height })); } catch (err) { /* 隐私模式静默 */ }
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  // V1.8.7.1 P2-30 八方向手柄显隐：仅悬浮态可见（停靠态全高不拉伸走左缘 resizeBar、全屏态隐藏）
  function syncEdges() {
    if (!resizeHandles) return;
    var show = (!folded && !fullscreen && floating);
    for (var k = 0; k < EDGE_DIRS.length; k++) resizeHandles[EDGE_DIRS[k]].style.display = show ? 'block' : 'none';
  }

  function setFloating(on_) {
    floating = on_;
    if (floating) {
      panel.style.position = 'fixed';
      panel.style.top = '60px';
      panel.style.right = '20px';
      panel.style.bottom = 'auto';
      // V1.8.7.1 P2-30 高度优先持久化值（240px ~ 视口上限），无则默认 70vh
      var savedH = 0;
      try { savedH = parseInt(localStorage.getItem(H_KEY), 10) || 0; } catch (err) { /* 隐私模式静默 */ }
      var hMax = Math.max(240, Math.round(window.innerHeight - 70));
      panel.style.height = (savedH >= 240 ? Math.min(savedH, hMax) : Math.round(window.innerHeight * 0.7)) + 'px';
      // V1.8.7.1 反馈：恢复上次拉伸后的位置与尺寸（PANEL_RECT_KEY），无则保持默认位
      var savedRect = null;
      try { savedRect = JSON.parse(localStorage.getItem(PANEL_RECT_KEY) || 'null'); } catch (err) { /* 隐私模式静默 */ }
      if (savedRect && typeof savedRect.width === 'number') {
        panel.style.left = Math.max(4, Math.min(savedRect.left, window.innerWidth - PANEL_MIN_W - 8)) + 'px';
        panel.style.top = Math.max(4, Math.min(savedRect.top, window.innerHeight - 248)) + 'px';
        panel.style.right = 'auto';
        panel.style.width = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, savedRect.width)) + 'px';
        panel.style.height = Math.max(240, Math.min(hMax, savedRect.height)) + 'px';
      }
      panel.style.borderRadius = '14px';
      panel.style.boxShadow = '0 12px 32px var(--shadow)';
      pinBtn.classList.add('on');
    } else {
      panel.style.position = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.left = '';
      panel.style.height = '';
      panel.style.borderRadius = '';
      panel.style.boxShadow = '';
      pinBtn.classList.remove('on');
    }
    syncEdges();
  }

  function startDrag(e) {
    if (!floating) return;   // P2-1 修复：仅悬浮态可拖——停靠态拖动会让面板变 position:fixed 伪悬浮
    // （move 无条件置 fixed，up() 仅 floating 时持久化，toggleFold 也不回收 → 面板从此悬浮，用户无法还原停靠）
    if (e.target.closest('button') || e.target.closest('input')) return;
    var startX = e.clientX, startY = e.clientY;
    var rect = panel.getBoundingClientRect();
    var origLeft = rect.left, origTop = rect.top;
    var moved = false;
    function move(ev) {
      moved = true;
      panel.style.position = 'fixed';
      panel.style.left = (origLeft + ev.clientX - startX) + 'px';
      panel.style.top = (origTop + ev.clientY - startY) + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.height = rect.height + 'px';
    }
    function up() {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      _listeners = _listeners.filter(function (l) {
        return !(l.ev === 'mousemove' && l.fn === move) && !(l.ev === 'mouseup' && l.fn === up);
      });
      // V1.8.7.1 移动结束持久化面板位置（悬浮态恢复用）
      if (floating) {
        var pr = panel.getBoundingClientRect();
        try { localStorage.setItem(PANEL_RECT_KEY, JSON.stringify({ left: pr.left, top: pr.top, width: pr.width, height: pr.height })); } catch (err) { /* 隐私模式静默 */ }
      }
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    e.preventDefault();
  }

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    var startX = e.clientX;
    var startW = panel.offsetWidth;
    resizeBar.classList.add('active');
    function move(ev) {
      var w = startW - (ev.clientX - startX);
      w = Math.max(PANEL_MIN_W, Math.min(PANEL_MAX_W, w));
      panel.style.width = w + 'px';
      panel.style.minWidth = 'auto';
      if (mode === 'split' && w < 480) { showTab('edit'); showToast('面板过窄，已退出分屏', 'warn'); }
    }
    function up() {
      resizeBar.classList.remove('active');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      // V1.8.7.6 P0-1 停靠态宽度持久化（init 恢复；悬浮态宽度由 PANEL_RECT_KEY 管理，互不覆盖）
      try { localStorage.setItem(W_KEY, String(panel.offsetWidth)); } catch (err) { /* 隐私模式静默 */ }
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  // V1.8.7.1 P2-31：列表区高度拖拽（120px~45vh，复用 ns-resize 模式）
  function startListResize(e) {
    e.preventDefault();
    e.stopPropagation();
    var startY = e.clientY;
    var startH = noteList.offsetHeight;
    var hMax = Math.round(window.innerHeight * 0.45);
    listSz.classList.add('active');
    function move(ev) {
      var h = startH + (ev.clientY - startY);
      h = Math.max(120, Math.min(hMax, h));
      noteList.style.flex = '0 0 ' + h + 'px';
      noteList.style.minHeight = h + 'px';
    }
    function up() {
      listSz.classList.remove('active');
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    }
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  }

  /* ============================================================
   *  导出 / 复制
   * ============================================================ */
  function toHtmlDoc(title, bodyHtml) {
    return '<!DOCTYPE html>\n<html lang="zh-CN">\n<head>\n<meta charset="UTF-8">\n<title>' +
      escHtml(title || '未命名') + '</title>\n' +
      '<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:720px;margin:40px auto;padding:0 20px;color:#222;line-height:1.8}</style>\n' +
      '</head>\n<body>\n' + bodyHtml + '\n</body>\n</html>';
  }

  function downloadFile(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // V1.8.7-P1-6 复制引用流：提取当前笔记全部「> 原文摘录自」引用块 → 剪贴板 Markdown
  // 块结构：> 原文摘录自 [标题](url) \n 空行 \n > 内容行…；块间以 \n\n---\n\n 分隔
  function copyQuoteStream() {
    var note = DataPipe.read();
    var content = (note && note.content) || '';
    var blocks = [];
    var re = /^> 原文摘录自 [^\n]*\n(?:> [^\n]*\n|[ \t]*\n(?=> ))*[ \t]*\n*/gm;
    var mm;
    while ((mm = re.exec(String(content) + '\n')) !== null) blocks.push(mm[0].trim());
    if (!blocks.length) { showToast('当前笔记还没有摘录引用', 'warn'); setStatus('当前笔记还没有摘录引用', 'warn'); return; }
    var md = blocks.join('\n\n---\n\n');
    var done = false;
    function finish(okFlag) {
      if (done) return;
      done = true;
      if (okFlag) { showToast('已复制 ' + blocks.length + ' 条摘录引用 ✓', 'ok'); setStatus('已复制 ' + blocks.length + ' 条摘录引用 ✓', 'blue', 3000); }
      else { showToast('复制失败：环境不支持剪贴板', 'warn'); setStatus('复制失败：环境不支持剪贴板', 'warn'); }
    }
    function fb() {
      var t = document.createElement('textarea');
      t.value = md;
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(t);
      t.select();
      var okFlag = false;
      try { okFlag = document.execCommand('copy'); } catch (e) { okFlag = false; }
      document.body.removeChild(t);
      finish(okFlag);
    }
    var p = null;
    try { p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(md) : null; }
    catch (e) { p = null; } // 沙箱/权限策略下 writeText 可能同步抛异常 → 降级 fallback
    if (p && typeof p.then === 'function') {
      // P1-6 兜底：writeText promise 可能永不 settle（沙箱权限挂起）→ 2.5s 超时走同步降级，保证必有提示
      var timer = setTimeout(fb, 2500);
      p.then(function () { clearTimeout(timer); finish(true); },
             function () { clearTimeout(timer); fb(); });
    } else fb();
  }

  // #27 反馈文本复制（2026-08-11）：与 copyQuoteStream 同款 P1-6 双兜底——
  // writeText promise 沙箱挂起时 2.5s 超时走 execCommand 同步降级，保证必有结果提示
  function copyTextWithFallback(text, cb) {
    var done = false;
    function finish(okFlag) { if (done) return; done = true; cb(okFlag); }
    function fb() {
      var t = document.createElement('textarea');
      t.value = text;
      t.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
      document.body.appendChild(t);
      t.select();
      var okFlag = false;
      try { okFlag = document.execCommand('copy'); } catch (e) { okFlag = false; }
      document.body.removeChild(t);
      finish(okFlag);
    }
    var p = null;
    try { p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : null; }
    catch (e) { p = null; }
    if (p && typeof p.then === 'function') {
      var timer = setTimeout(fb, 2500);
      p.then(function () { clearTimeout(timer); finish(true); },
             function () { clearTimeout(timer); fb(); });
    } else fb();
  }

  function exportAs(fmt) {
    var note = DataPipe.read();
    if (!note) return;
    var title = (note.title || '未命名').replace(/[\\/:*?"<>|]/g, '_');
    var base = title + '_' + todayStr() + '_' + nowStamp(); // 秒级时间戳：快照语义，同日多次导出不覆盖
    if (fmt === 'md') {
      downloadFile(base + '.md', note.content, 'text/markdown;charset=utf-8');
    } else if (fmt === 'html') {
      downloadFile(base + '.html', toHtmlDoc(note.title, renderMd(note.content)), 'text/html;charset=utf-8');
    } else if (fmt === 'txt') {
      downloadFile(base + '.txt', toPlainText(note.content), 'text/plain;charset=utf-8');
    }
    // 记录导出时间（备份提醒）+ V1.8.6.4 导出埋点
    try { localStorage.setItem(BACKUP_KEY, String(Date.now())); } catch (e) { }
    track('export');
    dlMenu.style.display = 'none';
    setStatus('已导出 ' + fmt.toUpperCase(), 'blue', 3000);
  }

  function copyAll() {
    var note = DataPipe.read();
    if (!note) return;
    var text = note.content;
    var done = false;
    function finish(okFlag) {
      if (done) return;
      done = true;
      dlMenu.style.display = 'none';
      if (okFlag) setStatus('已复制全文 ✓', 'blue', 3000);
      else setStatus('已复制全文 ✓', 'blue', 3000);
    }
    function fb() {
      fallbackCopy(text);
      finish(true);
    }
    var p = null;
    try { p = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(text) : null; }
    catch (e) { p = null; }
    if (p && typeof p.then === 'function') {
      var timer = setTimeout(fb, 2500);
      p.then(function () { clearTimeout(timer); finish(true); },
             function () { clearTimeout(timer); fb(); });
    } else fb();
  }
  function fallbackCopy(text) {
    var tmp = document.createElement('textarea');
    tmp.value = text;
    tmp.style.position = 'fixed';
    tmp.style.opacity = '0';
    document.body.appendChild(tmp);
    tmp.select();
    try { document.execCommand('copy'); } catch (e) { }
    document.body.removeChild(tmp);
  }

  /* ============================================================
   *  笔记操作（全部走 DataPipe）
   * ============================================================ */
  function switchNote(idx) {
    if (idx === cur || idx < 0 || idx >= NOTES.length) return;
    // P2-13：未保存确认改自定义条（回调式）；dirty 时弹条暂存动作，确认后执行
    DirtyGuard.confirm(function () {
      cur = idx;
      undoStack.length = 0;   // V1.8.12 A2：切笔记清撤销栈（prev 属旧笔记，防污染）
      DataPipe.syncAll('switch');
      capFilter = '';
      capSearch.value = '';
      _kbSel = -1; _kbResults = [];   // V1.8.7.4 P2-22②：切换后重置键盘选中
      setListOpen(false);
      showNormalStatus();
    });
  }

  function addNote() {
    // P2-13：未保存确认改自定义条（回调式）
    DirtyGuard.confirm(function () {
      undoStack.length = 0;   // V1.8.12 A2：新建清撤销栈
      var note = {
        id: genId(),
        title: '',
        content: '# ' + pageTitle + '\n\n',
        url: pageUrl,
        host: pageHost,
        created: Date.now(),
        updated: Date.now()
      };
      NOTES.unshift(note);
      cur = 0;
      DataPipe.syncAll('new');
      flushSave();
      titleInput.focus();
      titleInput.select();
      setStatus('已新建笔记', 'ok');
    });
  }

  // P2-35 删除入口显性化：askDelete 弹自定义确认条；确认后 doDeleteNote 真正执行（原 window.confirm 移除）
  function deleteNote(idx) {
    if (idx < 0 || idx >= NOTES.length) return;
    delPendingIdx = idx;
    if (delqEl) delqEl.style.display = 'block';
  }
  function hideDelq() {
    delPendingIdx = -1;
    if (delqEl) delqEl.style.display = 'none';
  }
  function hideDg() {
    dgAction = null;
    if (dgEl) dgEl.style.display = 'none';
  }
  function doDeleteNote(idx) {
    if (idx < 0 || idx >= NOTES.length) return;
    var curId = (cur >= 0 && NOTES[cur]) ? NOTES[cur].id : null;
    NOTES.splice(idx, 1);
    var found = -1;
    if (curId) { for (var i = 0; i < NOTES.length; i++) { if (NOTES[i].id === curId) { found = i; break; } } }
    cur = found >= 0 ? found : Math.min(idx, NOTES.length - 1);
    if (cur < 0) cur = -1;
    undoStack.length = 0;   // V1.8.12 A2：删除清撤销栈（prev 属已删笔记）
    DataPipe.syncAll('delete');
    flushSave();
    // v14 修复：原 setStatus(ok)+showNormalStatus() 被 flushSave 内部常态状态立即覆盖（删除无反馈）；
    // 改 blue+hold —— 提示窗口内 flushSave/showNormalStatus 不覆盖（_statusHoldUntil 机制）
    setStatus('已删除笔记', 'blue', 1800);
  }

  function handleTodoToggle(lineIdx) {
    var note = DataPipe.read();
    if (!note) return;
    var lines = note.content.split('\n');
    if (!lines[lineIdx]) return;
    lines[lineIdx] = lines[lineIdx].trim()[3] === ' '
      ? lines[lineIdx].replace('- [ ]', '- [x]')
      : lines[lineIdx].replace('- [x]', '- [ ]').replace('- [X]', '- [ ]');
    var prevContent = note.content;
    DataPipe.write('todo', { content: lines.join('\n') });
    undoStack.push({ prev: prevContent, caret: ta.selectionStart, cur: note.content });
    if (undoStack.length > 20) undoStack.shift();
    if (hlEnabled) syncHL();   // V1.8.7.1 P2-28 勾选回写后高亮层同步（split/edit 均需）
    renderPreview();
  }

  /* ============================================================
   *  事件绑定
   * ============================================================ */
  function bindEvents() {
    // 编辑输入 → DataPipe
    on(ta, 'input', function (ev) {
      if (ev && ev.data) {
        if (ev.data === '。') _lastDotInputAt = Date.now();
        else if ((ev.data === '/' || ev.data === '／') && _lastDotInputAt && Date.now() - _lastDotInputAt < 800) {
          var iv = ta.value, is = ta.selectionStart;
          var cut = is - 2;
          if (cut >= 0 && (iv.slice(cut, is) === '。/')) {
            _lastDotInputAt = 0;
            ta.value = iv.slice(0, cut) + iv.slice(is);
            DataPipe.write('ta', { content: ta.value });
            ta.setSelectionRange(cut, cut);
            openSearch();
            updateCount();
            if (mode === 'split') renderPreview();
            return; // 跳过常态处理（不 setStatus 编辑中）
          }
        }
      }
      DataPipe.write('ta', { content: ta.value });
      scheduleHL(); // 60ms 防抖合并高亮渲染
      updateCount();
      renderList(); // V1.8.6.8 列表条目字数随编辑实时刷新（修复「共0字 vs 110字」矛盾）
      // V1.8.7.1 P2-28 分屏模式实时渲染
      if (mode === 'split') renderPreview();
      if (Date.now() >= _statusHoldUntil) setStatus('编辑中…', 'ok');
    });
    // 高亮态 IME 组合输入保护：组合期临时还原原文，避免中文输入不可见
    on(ta, 'compositionstart', function () {
      if (!hlEnabled) return;
      ta.style.color = '';
      hlLayer.style.display = 'none';
    });
    on(ta, 'compositionend', function () {
      if (!hlEnabled) return;
      ta.style.color = 'transparent';
      hlLayer.style.display = 'block';
      syncHL();
    });
    // 滚动同步高亮层
    on(ta, 'scroll', function () {
      if (hlEnabled) { hlLayer.scrollTop = ta.scrollTop; hlLayer.scrollLeft = ta.scrollLeft; }
    });
    // 标题输入
    on(titleInput, 'input', function () {
      DataPipe.write('title', { title: titleInput.value });
      renderList();
    });
    on(splitTab, 'click', function () {
      if (mode !== 'split' && panel.offsetWidth < 480) {
        showToast('分屏需要更宽的面板（≥480px），请先拉宽再分屏', 'warn');
        return;
      }
      showTab(mode === 'split' ? 'edit' : 'split');
    });
    on(viewToggleBtn, 'click', function () { showTab(mode === 'preview' ? 'edit' : 'preview'); });
    // V1.8.7.1 P2-30 八方向自由拉伸（悬浮态手柄）
    for (var hk = 0; hk < EDGE_DIRS.length; hk++) {
      (function (d) {
        on(resizeHandles[d], 'mousedown', function (e) { startEdgeResize(e, d); });
      })(EDGE_DIRS[hk]);
    }
    // 工具栏（插入 / 页面链接 / 引用选中）
    on(toolbar, 'click', function (e) {
      if (e.target.closest('#btnInsLink')) { appendSource(); return; }
      // P1-8 AI 摘录占位：灰置保叙事，点击给出明确期待
      if (e.target.closest('#btnAiSoon')) {
        showToast('✨ AI 摘录即将上线 · 平台 API 公开即接线', 'warn');
        return;
      }
      if (e.target.closest('#btnInsSel')) {
        if (selCache && selCache.trim()) appendQuote(selCache);
        else setStatus('请先在页面中选中文字', 'warn');
        return;
      }
      var btn = e.target.closest('[data-ins]');
      if (btn) insertToolbar(btn.getAttribute('data-ins'));
    });
    // 快捷键
    on(ta, 'keydown', onTaKeydown);
    on(document, 'keydown', onGlobalKeydown);
    // 语法高亮开关（P2-19 移入 ⋮ 更多菜单）
    on(hlItem, 'click', function () {
      hlEnabled = !hlEnabled;
      hlItem.classList.toggle('on', hlEnabled);
      hlItem.querySelector('.more-txt').textContent = '语法高亮：' + (hlEnabled ? '开' : '关');
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      if (hlEnabled) {
        ta.style.color = 'transparent';
        hlLayer.style.display = 'block';
        syncHL();
        setStatus('已开启语法高亮', 'ok');
      } else {
        ta.style.color = '';
        hlLayer.style.display = 'none';
        setStatus('已关闭语法高亮', 'ok');
      }
    });
    // Todo 回写
    on(preview, 'change', function (e) {
      var t = e.target;
      if (t.tagName === 'INPUT' && t.type === 'checkbox' && t.hasAttribute('data-line')) {
        handleTodoToggle(parseInt(t.getAttribute('data-line'), 10));
      }
    });
    // 笔记列表（单击切换 / 右键删除）
    on(noteList, 'click', function (e) {
      var item = e.target.closest('.nb-item');
      if (item) switchNote(parseInt(item.getAttribute('data-idx'), 10));
    });
    on(noteList, 'contextmenu', function (e) {
      var item = e.target.closest('.nb-item');
      if (!item) return;
      e.preventDefault();
      deleteNote(parseInt(item.getAttribute('data-idx'), 10));
    });
    focusCapSearch = function () {
      var f = function () { try { capSearch.focus(); } catch (err) { } };
      f();
      setTimeout(f, 0);
      setTimeout(f, 60);
      setTimeout(f, 120);
      setTimeout(f, 240);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          f();
          requestAnimationFrame(f);
        });
      }
      var guard = 0;
      var guardTimer = setInterval(function () {
        guard++;
        if (guard > 20) { clearInterval(guardTimer); return; }
        // v6 实锤：document.activeElement 对 shadow 内聚焦元素返回 host，须用 root.activeElement 检测
        if (root.activeElement === capSearch) { clearInterval(guardTimer); return; }  // P3-16 收紧：聚焦成功即停，防持续抢焦
        if (folded || panel.style.display === 'none') { clearInterval(guardTimer); return; }  // P3-16 收紧：面板已折叠/隐藏则停止强拉
        try { capSearch.focus(); } catch (err) { }
      }, 50);
    };
    on(capsuleBtn, 'click', function (e) {
      e.stopPropagation();
      if (folded) toggleFold();
      var closed = listsec.style.display === 'none';
      // closed=true（已收起）→ 保持收起（聚焦失败因 capSearch 不可见）。修正为 setListOpen(closed) 真翻转。
      setListOpen(closed);
      // = 用户「FAB 展开后面板列表已开，再点胶囊」场景永不聚焦 → 8 轮「点击+ / 两个动作」全部解释。
      // 修复：无条件聚焦（openSearch 同款语义），点胶囊 = 清空过滤 + 展开列表 + 聚焦搜索框
      capFilter = '';
      capSearch.value = '';
      renderList();
      focusCapSearch();
    });
    // （委托捕获阶段先 setListOpen(!closed) 收起 → button handler 读到已收起又展开 → 净零变化，
    // CDP STEP3 实证 disp 恒 flex）。v7 的「click 未冒泡到 capsuleBtn」系误判（focus 失败被误读），
    // 胶囊 click handler 实际始终收到事件 → 删除委托，单入口防双 toggle。
    var _lastSearchTrack = 0;
    // V1.8.7.1 修复（P2-27）：IME 组合期跳过过滤，避免拼音半成品把列表闪空
    var _searchComposing = false;
    on(capSearch, 'compositionstart', function () { _searchComposing = true; });
    on(capSearch, 'compositionend', function () {
      _searchComposing = false;
      capFilter = capSearch.value;
      renderList();
    });
    on(capSearch, 'input', function () {
      if (_searchComposing) return;
      capFilter = capSearch.value;
      _kbSel = -1;   // V1.8.7.4 P2-22②：新输入重置键盘选中
      // search 埋点（500ms 节流，防每键计数；空查询不记）
      if (capFilter && Date.now() - _lastSearchTrack > 500) { _lastSearchTrack = Date.now(); track('search'); }
      renderList();
    });
    on(capSearch, 'keydown', function (e) {
      if (e.isComposing || _searchComposing) return;
      if (e.key === 'Escape') {
        capSearch.value = ''; capFilter = ''; _kbSel = -1; _kbResults = [];
        renderList();
        setListOpen(false);
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // V1.8.7.4 P2-22② 迷你版：搜索框聚焦态 ↑/↓ 切换列表选中（textarea 聚焦不劫持，无冲突；组合期已在函数首行放行）
        e.preventDefault();
        var n = _kbResults.length;
        if (!n) return;
        var dir = e.key === 'ArrowDown' ? 1 : -1;
        _kbSel = (_kbSel < 0 ? (dir > 0 ? -1 : 0) : _kbSel) + dir;
        if (_kbSel < 0) _kbSel = 0;
        if (_kbSel >= n) _kbSel = n - 1;
        applyKbSel();   // P3-18：局部高亮更新替代全量 renderList
        var kbEl = noteList.querySelector('.nb-item.kbsel');
        if (kbEl) { try { kbEl.scrollIntoView({ block: 'nearest' }); } catch (err) { } }
      } else if (e.key === 'Enter') {
        var idx = (_kbSel >= 0 && _kbResults[_kbSel] !== undefined) ? _kbResults[_kbSel] : -1;
        if (idx < 0) {
          var first = noteList.querySelector('.nb-item[data-idx]');
          if (first) idx = parseInt(first.getAttribute('data-idx'), 10);
        }
        if (idx >= 0) switchNote(idx);
      }
    });
    // 新建
    on(addBtn, 'click', addNote);
    // 复制 / 导出（P2-32 方案 A：复制全文并入导出菜单，copyBtn 按钮已删）
    on(dlBtn, 'click', function (e) {
      e.stopPropagation();
      aboutMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      dlMenu.style.display = dlMenu.style.display === 'block' ? 'none' : 'block';
    });
    on(dlMenu, 'click', function (e) {
      var item = e.target.closest('.dl-item');
      if (!item) return;
      // V1.8.7-P1-6 复制引用流（非导出，走剪贴板）
      if (item.getAttribute('data-act') === 'copyquotes') {
        try { copyQuoteStream(); } catch (err) { setStatus('复制引用流失败：' + (err && err.message), 'warn'); }
        dlMenu.style.display = 'none';
        return;
      }
      // P2-32 复制全文（原 copyBtn 能力并入菜单）
      if (item.getAttribute('data-act') === 'copyall') {
        copyAll();
        return;
      }
      // P0.5 自动落盘开关（FS Access，选文件后保存即写入）
      if (item.getAttribute('data-act') === 'diskpick') {
        diskToggle();
        dlMenu.style.display = 'none';
        return;
      }
      // V1.8.14 落盘恢复：跨浏览器/跨进程数据反向合并（showOpenFilePicker 读取）
      if (item.getAttribute('data-act') === 'diskrestore') {
        diskRestore();
        dlMenu.style.display = 'none';
        return;
      }
      exportAs(item.getAttribute('data-fmt'));
    });
    function setUpMenuKeys(menuEl) {
      var items = menuEl.querySelectorAll('.dl-item');
      for (var mi = 0; mi < items.length; mi++) {
        items[mi].setAttribute('tabindex', '0');
        items[mi].setAttribute('role', 'menuitem');
      }
    }
    setUpMenuKeys(dlMenu);
    setUpMenuKeys(moreMenu);
    on(dlMenu, 'keydown', menuKeyNav);
    on(moreMenu, 'keydown', menuKeyNav);
    function menuKeyNav(e) {
      var items = Array.prototype.slice.call(e.currentTarget.querySelectorAll('.dl-item'));
      if (!items.length) return;
      var idx = items.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        var ni = (e.key === 'ArrowDown' ? idx + 1 : idx - 1);
        if (ni < 0) ni = items.length - 1;
        if (ni >= items.length) ni = 0;
        try { items[ni].focus(); } catch (err) { }
      } else if (e.key === 'Enter' || e.key === ' ') {
        // 复用 click 委托（closest('.dl-item') 命中焦点项）
        if (idx >= 0) {
          e.preventDefault();
          var ev = document.createEvent ? document.createEvent('MouseEvents') : null;
          if (ev) { ev.initEvent('click', true, true); items[idx].dispatchEvent(ev); }
          else items[idx].click();
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        try { items[0].focus(); } catch (err) { }
      } else if (e.key === 'End') {
        e.preventDefault();
        try { items[items.length - 1].focus(); } catch (err) { }
      }
    }
    on(document, 'click', function (e) {
      var path = e.composedPath ? e.composedPath() : [];
      if (path.indexOf(root) === -1) { dlMenu.style.display = 'none'; moreMenu.style.display = 'none'; aboutMenu.style.display = 'none'; introMenu.style.display = 'none'; fbMenu.style.display = 'none'; }
      else {
        if (!dlMenu.contains(e.target) && e.target !== dlBtn) dlMenu.style.display = 'none';
        if (!moreMenu.contains(e.target) && e.target !== moreBtn) moreMenu.style.display = 'none';
        if (!aboutMenu.contains(e.target) && e.target !== brandBtn) aboutMenu.style.display = 'none';
        if (!introMenu.contains(e.target)) introMenu.style.display = 'none';
        if (!fbMenu.contains(e.target)) fbMenu.style.display = 'none';   // #27 反馈浮层点击内部不关闭（可继续填写）
      }
    });
    // P1-9#2 大纲树：点击标题项滚动定位（锚点滚动，不加 scrollIntoView 防惊动宿主页面滚动）
    on(outlineEl, 'click', function (e) {
      var d = e.target.closest('[data-lv]');
      if (!d) return;
      previewWrap.scrollTop = parseInt(d.getAttribute('data-off'), 10) - 8;
    });
    // 📌 停靠/悬浮
    on(pinBtn, 'click', function () { setFloating(!floating); });
    // P2-21 品牌触点：打开/关闭关于浮层（互斥关闭其他菜单；打开时刷新版本与数据量）
    on(brandBtn, 'click', function (e) {
      e.stopPropagation();
      dlMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      var willShow = aboutMenu.style.display !== 'block';
      if (willShow) refreshAbout();
      aboutMenu.style.display = willShow ? 'block' : 'none';
    });
    // P2-19 ⋮ 更多菜单：开关 + 面板透明三档切换
    on(moreBtn, 'click', function (e) {
      e.stopPropagation();
      aboutMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      moreMenu.style.display = moreMenu.style.display === 'block' ? 'none' : 'block';
    });
    on(transItem, 'click', function () {
      cycleTransparency();
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
    });
    // P2-29 方案 A：全屏菜单项（收起菜单 + 切换全屏；Alt+F 键位被劫持时按钮兜底）
    on(fsItem, 'click', function () {
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      toggleFullscreen();
    });
    // P2-35 删除当前笔记（⋮ 菜单显性入口；点击后收起其他浮层并弹确认条）
    on(delItem, 'click', function () {
      dlMenu.style.display = 'none';
      aboutMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      if (cur >= 0) deleteNote(cur);
    });
    on(introItem, 'click', function (e) {
      e.stopPropagation();
      dlMenu.style.display = 'none';
      aboutMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      fbMenu.style.display = 'none';   // #27 反馈浮层
      introMenu.style.display = introMenu.style.display === 'block' ? 'none' : 'block';
    });
    // #27 反馈入口（⋮ 菜单 → toggle 反馈浮层；互斥关闭其他浮层；文案复制后不自动收起，便于回看）
    on(fbItem, 'click', function (e) {
      e.stopPropagation();
      dlMenu.style.display = 'none';
      aboutMenu.style.display = 'none';
      moreMenu.style.display = 'none';
      introMenu.style.display = 'none';
      fbMenu.style.display = fbMenu.style.display === 'block' ? 'none' : 'block';
    });
    // #27 反馈：四问 + 版本 + 页面信息 → 结构化文本；发送（FB_ENDPOINT 直投）为主，复制（P1-6 双兜底）为降级
    // 注意：fbMenu 在 shadow DOM 内，须用 fbMenu.querySelector 而非 document.getElementById
    on(fbMenu, 'click', function (e) {
      var btn = e.target && (e.target.id === 'fbCopy' || e.target.id === 'fbSend') ? e.target : null;
      if (!btn) return;
      e.stopPropagation();
      function qv(id) { var el = fbMenu.querySelector('#' + id); return (el && el.value || '').trim(); }
      function collect() {
        return {
          q1: qv('fbQ1'), q2: qv('fbQ2'), q3: qv('fbQ3'), q4: qv('fbQ4'),
          md: '【随页摘录反馈】\n' +
            '版本：v' + VER + '\n' +
            '时间：' + todayStr() + ' ' + nowStamp() + '\n' +
            '页面：' + (pageTitle || '') + '\n' +
            '地址：' + (pageUrl || '') + '\n' +
            '身份：' + (qv('fbQ1') || '未填') + '\n' +
            '场景：' + (qv('fbQ2') || '未填') + '\n' +
            '频率：' + (qv('fbQ3') || '未填') + '\n' +
            '想说的话：' + (qv('fbQ4') || '未填')
        };
      }
      function fallback(md) {
        copyTextWithFallback(md, function (okFlag) {
          if (okFlag) { showToast('发送失败，已复制内容，粘贴到任意渠道即可送达', 'warn'); setStatus('已复制反馈内容', 'blue', 3000); }
          else { showToast('发送/复制均失败：环境不支持剪贴板', 'warn'); setStatus('反馈发送失败', 'warn', 3000); }
        });
      }
      if (btn.id === 'fbCopy') {
        var md = collect().md;
        copyTextWithFallback(md, function (okFlag) {
          if (okFlag) { showToast('已复制反馈内容，粘贴到任意渠道即可送达 ✓', 'ok'); setStatus('已复制反馈内容 ✓', 'blue', 3000); }
          else { showToast('复制失败：环境不支持剪贴板', 'warn'); setStatus('复制失败：环境不支持剪贴板', 'warn'); }
        });
        return;
      }
      // fbSend：直投（2026-08-11 渠道拍板嵌入提交；FB_ENDPOINT 未配置=降级复制引导）
      var fb = collect();
      if (!FB_ENDPOINT) { fallback(fb.md); return; }
      try {
        fetch(FB_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            '身份': fb.q1 || '未填', '场景': fb.q2 || '未填', '频率': fb.q3 || '未填',
            '想说的话': fb.q4 || '未填', '版本': 'v' + VER,
            '页面': pageTitle || '', '地址': pageUrl || '', '时间': todayStr() + ' ' + nowStamp()
          })
        }).then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          showToast('反馈已发送 ✓ 感谢你的反馈！', 'ok');
          setStatus('反馈已发送 ✓', 'blue', 3000);
          fbMenu.style.display = 'none';
        }).catch(function () { fallback(fb.md); });
      } catch (err) { fallback(fb.md); }
    });
    // V1.8.6.20 字号三档切换
    on(fontBtn, 'click', cycleFontLevel);
    // 折叠 / FAB
    on(foldBtn, 'click', toggleFold);
    on(miniFab, 'mousedown', startFabDrag); // 展开判定在 mouseup（V1.8.6.11），无 click 绑定避免双触发
    // 关闭
    on(closeBtn, 'click', function () {
      // P2-13：未保存确认改自定义条（回调式）；确认后卸载
      DirtyGuard.confirm(function () {
        Lifecycle.unmount();
        if (host && host.parentNode) host.parentNode.removeChild(host);
        window.__NB_INJECTED__ = false;
      });
    });
    // 拖拽移动 / 宽度调整
    on(header, 'mousedown', startDrag);
    on(resizeBar, 'mousedown', startResize);
    // V1.8.7.1 P2-31 列表高度拖拽
    on(listSz, 'mousedown', startListResize);
    // 采集层：全局 mouseup + 滚动隐藏 + 浮钮点击
    on(document, 'mouseup', onGlobalMouseUp);
    on(document, 'selectionchange', onSelChange); // V1.8.6.8 键盘选区兜底
    on(window, 'scroll', hideFloat, true);
    on(floatBtn, 'mousedown', function (e) { e.preventDefault(); }); // 防止点击清除选区
    on(floatBtn, 'click', function () {
      var txt = selCache;
      hideFloat();
      appendQuote(txt);
    });
    watchHostPin();
  }

  /* ============================================================
   *  初始化
   * ============================================================ */
  function init() {
    try {
      NOTES = migrate();
      if (!Array.isArray(NOTES)) NOTES = [];
      // 恢复 cur
      try { cur = parseInt(localStorage.getItem(CUR_KEY) || '0', 10); } catch (e) { cur = 0; }
      if (cur < 0 || cur >= NOTES.length) cur = NOTES.length ? 0 : -1;
      // 首次使用：创建默认笔记（含页面来源 + 操作路径引导）
      if (NOTES.length === 0) {
        var now = Date.now();
        NOTES.push({
          id: genId(),
          title: pageTitle || '欢迎',
          content: '# 欢迎使用随页摘录\n\n**3 步上手：**\n\n1. **调出面板**：本面板已在页面右侧打开，点标题「—」或按 `Alt+N` 折叠/展开\n2. **摘录**：选中网页文字 → 点浮钮「✂️ 摘录」→ 自动追加来源引用\n3. **搜索**：按 `./` 或点顶部 🔍 快速找历史笔记\n\n**快捷键**：`Alt+N` 折叠 · `Ctrl+Enter` 待办勾选 · `Alt+P` 显示⇄编辑 · `./` 搜索（编辑键 `Tab`/`Enter`/`Ctrl+B/I`/`Ctrl+Shift+1-3` 标题，完整列表见使用说明 §3）\n\n**数据提醒**：笔记仅存本机浏览器，清除缓存会丢失——建议点底部「导出 ▾」定期备份\n\n> 本笔记为引导说明，熟悉后可在列表右键或 ⋮ 菜单「删除当前笔记」移除\n\n> 来源：[' + pageTitle + '](' + pageUrl + ')\n',
          url: pageUrl,
          host: pageHost,
          created: now,
          updated: now
        });
        cur = 0;
        flushSave();
      }
      buildUI();
      // V1.8.10 主世界 Trusted Types 阻断早检：buildUI 内 setHTML 已置位 ttBlocked
      // → 面板无法渲染，立即失败退出并呈现明确降级提示（不静默、不半死）
      if (ttBlocked) {
        throw new Error('Trusted Types CSP 阻断');
      }
      // V1.8.7.6 P0-1 停靠态宽度恢复（无记录/非法值 → CSS 默认 360px；悬浮态宽度由 setFloating 的 PANEL_RECT_KEY 覆盖，互不干扰）
      try {
        var dockW = parseInt(localStorage.getItem(W_KEY), 10) || 0;
        if (dockW >= PANEL_MIN_W && dockW <= PANEL_MAX_W) panel.style.width = dockW + 'px';
      } catch (err) { /* 隐私模式静默 */ }
      bindEvents();
      DataPipe.syncAll('init');
      Lifecycle.mount();
      // V1.8.6.14 恢复透明度档位（须在 buildUI 后）
      try { transLevel = Math.min(2, Math.max(0, parseInt(localStorage.getItem(TRANS_KEY) || '0', 10) || 0)); } catch (err) { transLevel = 0; }
      applyTransparency();
      // V1.8.6.20 恢复字号档位（ta 已构建；hlLayer 同步字号防错位）
      try { fontLevel = Math.min(2, Math.max(0, parseInt(localStorage.getItem(FONT_KEY) || '0', 10) || 0)); } catch (err) { fontLevel = 0; }
      applyFontLevel();
      toggleFold(); // V1.8.6.10 默认折叠：不遮挡网页（真实反馈：面板盖住百度搜索/热搜等核心交互）
      showNormalStatus();
      // V1.8.6.7 首次使用强引导（反馈 #3）：从未备份时提示追加导出建议
      var _lastBack = 0;
      try { _lastBack = parseInt(localStorage.getItem(BACKUP_KEY) || '0', 10); } catch (err) { _lastBack = 0; }
      // P1-29 方案 A（2026-08-09）：IDB 句柄持久化恢复——granted 无感自动恢复（浏览中刷新/跳转）；
      // prompt（浏览器重启后）→ 菜单项「自动落盘」点一下 requestPermission 授权即恢复（免重选文件）；denied → 清句柄引导重选
      if (diskSupported()) {
        idbLoadHandle().then(function (fh) {
          if (!fh) {
            if (localStorage.getItem(DISK_KEY) === '1') {
              try { localStorage.setItem(DISK_KEY, ''); } catch (err) { }
              showToast('自动落盘已因刷新关闭 · 可重新开启', 'warn');
            }
            return;
          }
          if (typeof fh.queryPermission !== 'function') {
            clearDiskPersistence();
            showToast('自动落盘已因刷新关闭 · 可重新开启', 'warn');
            return;
          }
          fh.queryPermission({ mode: 'readwrite' }).then(function (st) {
            if (st === 'granted') {
              diskHandle = fh; diskOn = true;
              try { localStorage.setItem(DISK_KEY, '1'); } catch (err) { }
              updateDiskItem();
              diskWrite();
              showToast('自动落盘已恢复 ✓ 写入原文件', 'ok');
            } else if (st === 'prompt') {
              diskPendingHandle = fh;
              updateDiskItem();
              showToast('自动落盘待授权 · 导出菜单点「自动落盘」即恢复原文件', 'warn');
            } else {
              diskPendingHandle = null;
              clearDiskPersistence();
              showToast('自动落盘授权已失效 · 请重新选择文件', 'warn');
            }
          }).catch(function () {
            clearDiskPersistence();
            showToast('自动落盘已因刷新关闭 · 可重新开启', 'warn');
          });
        });
      } else if (localStorage.getItem(DISK_KEY) === '1') {
        try { localStorage.setItem(DISK_KEY, ''); } catch (err) { }
        showToast('自动落盘已因刷新关闭 · 可重新开启', 'warn');
      }
      notify('随页摘录已注入 ✓ 已载入 ' + NOTES.length + ' 条笔记 · 点右缘图标展开' + (_lastBack === 0 ? ' · 数据仅存本机建议备份' : ''));
    } catch (err) {
      // 错误边界：初始化失败清理已建 DOM 并复位标记
      if (host && host.parentNode) host.parentNode.removeChild(host);
      window.__NB_INJECTED__ = false;
      // V1.8.10：主世界 CSP trusted-types 白名单不含 suiye-note 时 createPolicy 被拒且 raw 赋值也被拦
      // → ttBlocked 置位，明确提示安全策略阻断而非静默失败（隔离世界不受强制，不影响扩展场景）
      if (ttBlocked) {
        notify('随页摘录注入失败：此页面安全策略（Trusted Types）禁止注入，请改用浏览器扩展安装使用', 8000);
      } else {
        notify('随页摘录注入失败：' + (err && err.message ? err.message : err));
      }
      if (typeof console !== 'undefined') console.error('[SuiyeNote V' + VER + '] init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ============================================================
   *  输出契约（对齐 SKILL.md Output contract）
   * ============================================================ */
  return {
    status: 'ok',
    version: VER,
    storageMode: storageOK ? 'localStorage' : 'memory',
    pageUrl: pageUrl,
    pageTitle: pageTitle,
    cleanup: function () {
      if (Lifecycle.state() !== 'unmounted') Lifecycle.unmount();
      if (host && host.parentNode) host.parentNode.removeChild(host);
      window.__NB_INJECTED__ = false;
    }
  };
})();