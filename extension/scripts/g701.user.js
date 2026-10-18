// ==UserScript==
// @name         悬浮目录面板 Floating TOC
// @namespace    https://Yuze-ai.com
// @version      1.9.9
// @description  任意网页悬浮目录：设置独立滚动与滚轮隔离/完全贴边隐藏/AI长页面防崩/目录滚轮双保险/位置模式/贴边间距微调/层级编号/缩放防遮盖/圆钮双模/字体控制/三色主题/流光动画/翻译插件免疫
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (!document.body) return;
  if (typeof window.__ftoc_destroy === 'function') {
    try { window.__ftoc_destroy(); } catch (e) {}
  }
  if (window.__ftoc_running) return;
  window.__ftoc_running = true;

  /* ---------- 工具函数 ---------- */
  function safe(fn) { try { fn(); } catch (e) { console.warn('[FloatingTOC]', e); } }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function debounce(fn, wait) {
    var t = null;
    return function () {
      var self = this, args = arguments;
      if (t) clearTimeout(t);
      t = setTimeout(function () { t = null; fn.apply(self, args); }, wait);
    };
  }
  function hexToRgba(hex, alpha) {
    var m = String(hex || '').replace('#', '');
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    var n = parseInt(m, 16);
    if (isNaN(n) || m.length !== 6) return 'rgba(30,30,34,' + alpha + ')';
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }
  function relLuminance(hex) {
    var m = String(hex || '').replace('#', '');
    if (m.length === 3) m = m[0] + m[0] + m[1] + m[1] + m[2] + m[2];
    var n = parseInt(m, 16);
    if (isNaN(n) || m.length !== 6) return 0;
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
  function parseCssColor(str) {
    if (!str) return null;
    var m = String(str).match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?\s*\)/i);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  function reduceMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  /* ---------- 偏好存取 ---------- */
  var STORE_KEY = 'ftoc_prefs_v1';
  var DEFAULTS = { x: -1, y: -1, w: 300, h: 420, collapsed: false, closed: false,
                   theme: 'dark', customBg: '#2b2d42', opacity: 0.88, blurOn: true, blur: 14,
                   anchor: 0.25, rx: -1, ry: -1,
                   fontMode: 'auto', fontSize: 13,
                   rbMode: 'auto', rbSize: 36, rbColor: '#4f8cff',
                   posMode: 'edge', edgeGap: 12,
                   fullEdge: false, peek: 30, sens: 3 };
  function loadPrefs() {
    var out = {}, k;
    for (k in DEFAULTS) out[k] = DEFAULTS[k];
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        for (k in DEFAULTS) if (p[k] !== undefined) out[k] = p[k];
        if (typeof p.bg === 'string' && p.bg) { out.customBg = p.bg; out.theme = 'custom'; }
      }
    } catch (e) {}
    return out;
  }
  var prefs = loadPrefs();
  function savePrefs() { safe(function () { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); }); }

  /* ---------- 全局状态 ---------- */
  var MAX_HEADINGS = 500;
  var SENS = [50, 100, 200, 350, 500]; // 灵敏度档位延迟表
  var state = {
    headings: [], host: null, shadow: null, panel: null, header: null,
    titleEl: null, counter: null,
    btnSettings: null, btnRestart: null, btnCollapse: null, btnClose: null,
    settings: null, body: null, grip: null, progress: null, reopen: null,
    uiBlurOn: null, uiBlur: null, uiBlurVal: null, uiOpacity: null, uiOpacityVal: null,
    uiColor: null, uiThemeDark: null, uiThemeLight: null, uiThemeCustom: null, uiBgRow: null,
    uiAnchor: null, uiAnchorVal: null,
    uiFontAuto: null, uiFontCustom: null, uiFontRow: null, uiFontSlider: null, uiFontVal: null,
    uiRbAuto: null, uiRbCustom: null, uiRbRow: null, uiRbSize: null, uiRbSizeVal: null, uiRbColor: null,
    uiPosFree: null, uiPosEdge: null, uiGapRow: null, uiGapMinus: null, uiGapPlus: null,
    uiGapSlider: null, uiGapVal: null,
    uiFullEdgeRow: null, uiFullEdgeCb: null, uiPeekWrap: null,
    uiPeekMinus: null, uiPeekPlus: null, uiPeekSlider: null, uiPeekVal: null,
    uiSensRow: null, uiSensBtns: null,
    panelHover: false, settingsOpen: false, tocManualScrollUntil: 0, rbTimer: null,
    observer: null, cleanupFns: [], initTimers: [], scrollSources: [], followTimer: null,
    headingSignature: '', historyOriginals: null, historyRefresh: null,
    refreshCount: 0, refreshWindowStart: 0,
    // v1.9.5：完全贴边状态机
    lastMX: -1, lastMY: -1, lastDX: 0, lastDY: 0, pointerHitPanel: null,
    peekHidden: false, peekShowLocked: false, peekExitSide: '', adjusting: false,
    peekInTimer: null, peekOutTimer: null, adjustTimer: null, peekPollTimer: null
  };

  /* ---------- 样式 ---------- */
  var CSS_TEXT = `
:host{all:initial;}
*{box-sizing:border-box;margin:0;padding:0;}
.ft-panel{--ft-fg:#e8e8ea;--ft-sub:rgba(255,255,255,.55);--ft-hover:rgba(255,255,255,.08);
--ft-active-bg:rgba(110,160,255,.22);--ft-active-fg:#8db8ff;
border-radius:12px;overflow:hidden;box-shadow:0 10px 32px rgba(0,0,0,.32);
font:1em/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;}
.ft-panel.ft-collapsed{min-width:0 !important;min-height:0 !important;border-radius:10px;}
.ft-anim{transition:left .38s cubic-bezier(.4,0,.2,1),top .38s cubic-bezier(.4,0,.2,1),
width .38s cubic-bezier(.4,0,.2,1),height .38s cubic-bezier(.4,0,.2,1);}
.ft-peekmove{transition:left .25s ease !important;}
@keyframes ftFlash{
0%{box-shadow:0 0 0 2px rgba(79,140,255,.95),0 0 24px 6px rgba(79,140,255,.6);}
30%{box-shadow:0 0 0 3px rgba(186,132,255,.95),0 0 28px 8px rgba(186,132,255,.55);}
60%{box-shadow:0 0 0 2px rgba(96,220,180,.95),0 0 24px 6px rgba(96,220,180,.6);}
100%{box-shadow:0 10px 32px rgba(0,0,0,.32);}
}
.ft-flash{animation:ftFlash .75s ease-in-out 2;}
.ft-ghost{position:fixed;width:40px;height:40px;border-radius:12px;pointer-events:none;
background:linear-gradient(135deg,#4f8cff,#ba84ff);box-shadow:0 0 22px 5px rgba(110,150,255,.8);opacity:.95;}
.ft-header{flex:0 0 auto;border-bottom:1px solid rgba(128,128,128,.18);overflow:visible;}
.ft-collapsed .ft-header{border-bottom:none;justify-content:center;padding:.538em 0;}
.ft-title{flex:1 1 auto;min-width:0;font-weight:600;font-size:.962em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ft-fg);}
.ft-counter{flex:0 0 auto;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
font-size:.846em;color:var(--ft-sub);padding:0 3px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}
.ft-btn{flex:0 0 auto;width:1.692em;height:1.692em;min-width:1.692em;display:inline-flex;align-items:center;justify-content:center;
border:none;background:transparent;color:var(--ft-fg);border-radius:.462em;cursor:pointer;font-size:1em;line-height:1;padding:0;}
.ft-btn:hover{background:var(--ft-hover);}
.ft-body{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden;padding:.462em .308em .615em;
scrollbar-width:thin;scrollbar-color:rgba(128,128,128,.45) transparent;}
.ft-body::-webkit-scrollbar{width:.615em;}
.ft-body::-webkit-scrollbar-track{background:transparent;}
.ft-body::-webkit-scrollbar-thumb{background:rgba(128,128,128,.45);border-radius:.308em;}
.ft-empty{padding:1.385em .769em;text-align:center;color:var(--ft-sub);font-size:.962em;}
.ft-item{display:block;padding:.308em .615em;margin:.077em .154em;border-radius:.462em;cursor:pointer;
white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--ft-fg);font-size:.962em;}
.ft-item:hover{background:var(--ft-hover);}
.ft-item.ft-active{background:var(--ft-active-bg);color:var(--ft-active-fg);font-weight:600;}
.ft-num{color:var(--ft-sub);font-size:.846em;margin-right:.385em;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}
.ft-item.ft-active .ft-num{color:var(--ft-active-fg);}
.ft-grip{position:absolute;right:.231em;bottom:.231em;width:1.077em;height:1.077em;cursor:nwse-resize;opacity:.5;}
.ft-grip:hover{opacity:1;}
.ft-grip::before{content:"";position:absolute;right:.154em;bottom:.154em;width:.615em;height:.615em;
border-right:2px solid var(--ft-fg);border-bottom:2px solid var(--ft-fg);}
 .ft-settings{flex:1 1 auto;min-height:0;height:auto;max-height:none;align-content:flex-start;border-bottom:1px solid rgba(128,128,128,.18);padding:.615em .769em 1.2em;
display:none;flex-direction:column;gap:.615em;font-size:.923em;color:var(--ft-fg);overflow-y:auto;overflow-x:hidden;
overscroll-behavior:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(128,128,128,.48) transparent;}
.ft-settings::-webkit-scrollbar{width:.615em;}
.ft-settings::-webkit-scrollbar-track{background:transparent;}
.ft-settings::-webkit-scrollbar-thumb{background:rgba(128,128,128,.48);border-radius:.308em;}
.ft-doc{display:none;padding:.692em .769em;border:1px solid rgba(128,128,128,.24);border-radius:.462em;
background:rgba(128,128,128,.08);color:var(--ft-fg);font-size:.846em;line-height:1.6;}
.ft-doc-group{padding:.385em 0;border-bottom:1px solid rgba(128,128,128,.14);}
.ft-doc-group:last-child{border-bottom:none;padding-bottom:0;}
.ft-doc-h{font-weight:700;color:var(--ft-fg);margin-bottom:.154em;}
.ft-doc-p{color:var(--ft-sub);}
.ft-row{display:flex;align-items:center;gap:.615em;flex-wrap:wrap;}
.ft-row label{color:var(--ft-sub);white-space:nowrap;font-size:.846em;}
.ft-row input[type="range"]{flex:1 1 5.385em;accent-color:#5b9dff;}
.ft-row input[type="color"]{width:2em;height:1.538em;border:none;background:none;padding:0;cursor:pointer;}
.ft-swatch{width:1.385em;height:1.385em;border-radius:50%;cursor:pointer;border:2px solid transparent;flex:0 0 auto;}
.ft-swatch.ft-sel{border-color:#5b9dff;}
.ft-theme-btn{padding:.154em .769em;border-radius:.462em;border:1px solid rgba(128,128,128,.4);
background:transparent;color:var(--ft-fg);cursor:pointer;font-size:.846em;}
.ft-theme-btn.ft-sel{background:var(--ft-active-bg);border-color:transparent;}
.ft-step-btn{width:1.85em;height:1.85em;flex:0 0 auto;display:inline-flex;align-items:center;justify-content:center;
border-radius:.462em;border:1px solid rgba(128,128,128,.4);background:transparent;color:var(--ft-fg);
cursor:pointer;font-size:.92em;line-height:1;padding:0;}
.ft-step-btn:hover{background:var(--ft-hover);}
.ft-gap-val{min-width:3.4em;text-align:center;color:var(--ft-fg);font-size:.846em;
font-family:ui-monospace,SFMono-Regular,Consolas,monospace;}
.ft-progress{position:fixed;top:0;left:0;height:3px;width:0%;pointer-events:none;
background:linear-gradient(90deg,#4f8cff,#8db8ff);transition:width .12s linear;border-radius:0 2px 2px 0;}
.ft-reopen{position:fixed;left:0;top:0;width:34px;height:34px;border-radius:50%;
display:none;align-items:center;justify-content:center;cursor:pointer;font-size:16px;line-height:1;
box-shadow:0 6px 18px rgba(0,0,0,.3);user-select:none;-webkit-user-select:none;touch-action:none;}
`;

  /* ---------- 视觉引导 ---------- */
  function flashEl(nd) {
    safe(function () {
      if (!nd || nd.style.display === 'none') return;
      nd.classList.remove('ft-flash');
      void nd.offsetWidth;
      nd.classList.add('ft-flash');
      setTimeout(function () { safe(function () { nd.classList.remove('ft-flash'); }); }, 1700);
    });
  }

  function flyGhost(fromRect, toRect, done) {
    var finished = false, g = null;
    function finish() {
      if (finished) return;
      finished = true;
      safe(function () { if (g && g.parentNode) g.parentNode.removeChild(g); });
      if (done) safe(done);
    }
    safe(function () {
      if (!state.shadow) return;
      g = el('div', 'ft-ghost');
      g.style.left = Math.round(fromRect.left + fromRect.width / 2 - 20) + 'px';
      g.style.top = Math.round(fromRect.top + fromRect.height / 2 - 20) + 'px';
      state.shadow.appendChild(g);
      setTimeout(finish, 800);
      if (!g.animate) { finish(); return; }
      var dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
      var dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
      var anim = g.animate([
        { transform: 'translate(0px,0px) scale(1)', opacity: 0.95 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(0.4)', opacity: 0.55 }
      ], { duration: 430, easing: 'cubic-bezier(.4,0,.2,1)' });
      if (anim) anim.onfinish = finish;
    });
    if (!g) finish();
  }

  function visibleRect() {
    var vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      return { left: vv.offsetLeft || 0, top: vv.offsetTop || 0,
               right: (vv.offsetLeft || 0) + vv.width, bottom: (vv.offsetTop || 0) + vv.height };
    }
    return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
  }

  function getPageScale() {
    var scale = 1;
    try {
      if (window.visualViewport && window.visualViewport.scale) scale = window.visualViewport.scale;
      else if (window.devicePixelRatio) scale = window.devicePixelRatio;
    } catch (e) {}
    return clamp(scale, 0.25, 5);
  }

  function getReopenSize() {
    if (prefs.rbMode === 'custom') return clamp(prefs.rbSize || 36, 20, 80);
    return Math.round(clamp(30 * getPageScale(), 24, 64));
  }

  function placeReopen() {
    safe(function () {
      var b = state.reopen;
      if (!b) return;
      var size = getReopenSize();
      var rect = visibleRect();
      var tx, ty;
      if (prefs.rx >= 0 && prefs.ry >= 0) {
        tx = clamp(prefs.rx, rect.left, Math.max(rect.left, rect.right - size));
        ty = clamp(prefs.ry, rect.top, Math.max(rect.top, rect.bottom - size));
      } else {
        tx = rect.right - size - 18;
        ty = rect.bottom - size - 18;
      }
      b.style.left = Math.round(tx) + 'px';
      b.style.top = Math.round(ty) + 'px';
      b.style.right = 'auto';
      b.style.bottom = 'auto';
    });
  }

  function reopenTargetRect() {
    var size = getReopenSize();
    var rect = visibleRect();
    var tx, ty;
    if (prefs.rx >= 0 && prefs.ry >= 0) {
      tx = clamp(prefs.rx, rect.left, Math.max(rect.left, rect.right - size));
      ty = clamp(prefs.ry, rect.top, Math.max(rect.top, rect.bottom - size));
    } else {
      tx = rect.right - size - 18;
      ty = rect.bottom - size - 18;
    }
    return { left: tx, top: ty, width: size, height: size };
  }

  function samplePageBg() {
    var c = null;
    try {
      var els = [document.body, document.documentElement];
      for (var i = 0; i < els.length; i++) {
        var cs = window.getComputedStyle(els[i]);
        var col = parseCssColor(cs.backgroundColor);
        if (col && col.a > 0.05) { c = col; break; }
      }
    } catch (e) {}
    if (!c) c = { r: 255, g: 255, b: 255, a: 1 };
    return c;
  }

  function applyReopenStyle() {
    safe(function () {
      var b = state.reopen;
      if (!b) return;
      var size = getReopenSize();
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.fontSize = Math.round(size * 0.48) + 'px';
      var bgHex, fgHex, borderCol;
      if (prefs.rbMode === 'custom') {
        bgHex = prefs.rbColor || '#4f8cff';
        var lightBg = relLuminance(bgHex) > 0.55;
        fgHex = lightBg ? '#20242e' : '#f5f6f8';
        borderCol = lightBg ? 'rgba(0,0,0,.15)' : 'rgba(255,255,255,.25)';
      } else {
        var c = samplePageBg();
        var lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
        if (lum > 0.55) { bgHex = '#20242e'; fgHex = '#eef0f4'; borderCol = 'rgba(255,255,255,.18)'; }
        else { bgHex = '#f5f6f8'; fgHex = '#20242e'; borderCol = 'rgba(0,0,0,.12)'; }
      }
      var bf = prefs.blurOn ? 'blur(' + prefs.blur + 'px) saturate(1.3)' : 'none';
      b.style.background = hexToRgba(bgHex, 0.92);
      b.style.color = fgHex;
      b.style.border = '1px solid ' + borderCol;
      b.style.backdropFilter = bf;
      b.style.webkitBackdropFilter = bf;
    });
  }

  /* ---------- 标题收集 ---------- */
  function isVisible(nd) {
    try {
      if (nd.hidden || nd.getAttribute('aria-hidden') === 'true' || nd.closest('template,[hidden],[aria-hidden="true"]')) return false;
      if (state.host && state.host.contains(nd)) return false;
      var r = nd.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      var cs = window.getComputedStyle(nd);
      return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.opacity !== '0';
    } catch (e) { return true; }
  }

  function headingSignature(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      out.push(list[i].level + ':' + list[i].text + ':' + (list[i].el.id || ''));
    }
    return out.join('\n');
  }

  function unbindScrollSources() {
    var sources = state.scrollSources || [];
    for (var i = 0; i < sources.length; i++) {
      try { sources[i].target.removeEventListener('scroll', onScroll, sources[i].capture); } catch (e) {}
    }
    state.scrollSources = [];
  }

  function bindScrollSources() {
    safe(function () {
      unbindScrollSources();
      var sources = [], seen = [];
      function add(target, capture) {
        if (!target || seen.indexOf(target) >= 0) return;
        seen.push(target);
        target.addEventListener('scroll', onScroll, { passive: true, capture: !!capture });
        sources.push({ target: target, capture: !!capture });
      }
      add(window, false);
      add(document, true);
      if (window.visualViewport) add(window.visualViewport, false);
      for (var i = 0; i < state.headings.length; i++) {
        var parent = state.headings[i].el.parentElement;
        while (parent && parent !== document.body && parent !== document.documentElement) {
          var cs = null;
          try { cs = window.getComputedStyle(parent); } catch (e) {}
          if (cs && /(auto|scroll|overlay)/i.test(cs.overflowY + ' ' + cs.overflowX)) add(parent, false);
          parent = parent.parentElement;
        }
      }
      state.scrollSources = sources;
    });
  }

  function collectHeadings() {
    var list = [];
    safe(function () {
      var nodes = document.querySelectorAll('h1,h2,h3,h4,h5,h6');
      var visible = [], minLv = 7, i, nd, lv;
      var limit = Math.min(nodes.length, MAX_HEADINGS * 3);
      for (i = 0; i < limit && visible.length < MAX_HEADINGS; i++) {
        nd = nodes[i];
        if (!isVisible(nd)) continue;
        lv = parseInt(nd.tagName.charAt(1), 10);
        if (lv < minLv) minLv = lv;
        visible.push(nd);
      }
      if (minLv === 7) minLv = 1;
      var counters = [0, 0, 0, 0, 0, 0];
      for (i = 0; i < visible.length; i++) {
        nd = visible[i];
        lv = parseInt(nd.tagName.charAt(1), 10);
        counters[lv - 1]++;
        for (var j = lv; j < 6; j++) counters[j] = 0;
        var numParts = [];
        for (var k = 0; k < lv; k++) numParts.push(counters[k]);
        while (numParts.length > 1 && numParts[0] === 0) numParts.shift();
        var num = numParts.join('.');
        var text = '';
        safe(function () { text = (nd.textContent || '').replace(/\s+/g, ' ').trim(); });
        if (!text) text = nd.tagName + ' · ' + (i + 1);
        if (text.length > 80) text = text.slice(0, 80) + '…';
        list.push({ el: nd, level: lv, indent: lv - minLv, text: text, num: num, idx: list.length });
      }
    });
    state.headings = list;
    state.headingSignature = headingSignature(list);
  }

  function scrollToHeading(nd) {
    safe(function () {
      if (!nd || !nd.isConnected) return;
      var vr = visibleRect();
      var off = Math.round((vr.bottom - vr.top) * clamp(prefs.anchor, 0.05, 0.45));
      nd.style.scrollMarginTop = off + 'px';
      nd.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function renderTOC() {
    safe(function () {
      var body = state.body;
      if (!body) return;
      body.innerHTML = '';
      var list = state.headings;
      if (!list.length) {
        var empty = document.createElement('div');
        empty.className = 'ft-empty';
        empty.textContent = '未检测到标题';
        body.appendChild(empty);
        return;
      }
      var frag = document.createDocumentFragment();
      for (var i = 0; i < list.length; i++) {
        (function (item) {
          var a = document.createElement('div');
          a.className = 'ft-item';
          a.style.paddingLeft = (8 + item.indent * 14) + 'px';
          a.title = item.num + '  ' + item.text;
          var numSpan = document.createElement('span');
          numSpan.className = 'ft-num';
          numSpan.textContent = item.num;
          var textSpan = document.createElement('span');
          textSpan.textContent = item.text;
          a.appendChild(numSpan);
          a.appendChild(textSpan);
          a.addEventListener('click', function (e) {
            e.stopPropagation();
            scrollToHeading(item.el);
          });
          frag.appendChild(a);
        })(list[i]);
      }
      body.appendChild(frag);
      updateActive();
    });
  }

  function refreshIfChanged() {
    safe(function () {
      if (!state.host) return;
      var prevSignature = state.headingSignature;
      collectHeadings();
      var list = state.headings;
      bindScrollSources();
      if (state.headingSignature !== prevSignature) {
        renderTOC();
      } else {
        updateActive();
      }
    });
  }

  function scheduleInitialScans() {
    var delays = [500, 1200, 2500, 4000];
    for (var i = 0; i < delays.length; i++) {
      (function (ms) {
        var t = setTimeout(function () { refreshIfChanged(); }, ms);
        state.initTimers.push(t);
      })(delays[i]);
    }
    if (document.readyState !== 'complete') {
      var onLoad = function () { refreshIfChanged(); };
      window.addEventListener('load', onLoad, { once: true });
      state.cleanupFns.push(function () { window.removeEventListener('load', onLoad); });
    }
  }

  /* ---------- 实时定位 ---------- */
  function updateActive() {
    safe(function () {
      var list = state.headings;
      if (!state.body) return;
       var current = -1, visibleCandidate = -1, bestTop = -Infinity, visibleTop = Infinity, i;
       var vr = visibleRect();
       var viewportHeight = Math.max(1, vr.bottom - vr.top);
       var threshold = vr.top + Math.round(viewportHeight * clamp(prefs.anchor, 0.05, 0.45)) + 8;
       for (i = 0; i < list.length; i++) {
         var nd = list[i].el;
         if (!nd.isConnected) continue;
         var nr = nd.getBoundingClientRect();
         if (nr.top <= threshold && nr.top > bestTop) { current = i; bestTop = nr.top; }
         if (nr.top >= vr.top && nr.top <= vr.top + viewportHeight * 0.85 && nr.top < visibleTop) {
           visibleCandidate = i; visibleTop = nr.top;
         }
       }
       // 页面使用内部滚动容器时，上一标题可能已完全离开视口；优先切换到当前可见标题。
       if (visibleCandidate > current && current >= 0) {
         var currentRect = list[current].el.getBoundingClientRect();
         if (currentRect.bottom < vr.top) current = visibleCandidate;
       } else if (current < 0 && visibleCandidate >= 0) current = visibleCandidate;
      var items = state.body.querySelectorAll('.ft-item');
      for (i = 0; i < items.length; i++) items[i].classList.toggle('ft-active', i === current);

      if (state.counter) {
        if (!list.length) {
          state.counter.textContent = '';
        } else if (current < 0) {
          state.counter.textContent = '0/' + list.length;
          state.counter.title = '';
        } else {
          state.counter.textContent = '§' + list[current].num + ' · ' + (current + 1) + '/' + list.length;
          state.counter.title = list[current].text;
        }
      }

      if (current >= 0 && items[current] && state.body.style.display !== 'none' &&
          Date.now() >= (state.tocManualScrollUntil || 0)) {
        var it = items[current], b = state.body;
        var ir = it.getBoundingClientRect(), br = b.getBoundingClientRect();
        if (ir.top < br.top + 4) b.scrollTop -= (br.top + 4 - ir.top);
        else if (ir.bottom > br.bottom - 4) b.scrollTop += (ir.bottom - (br.bottom - 4));
      }

      if (state.progress) {
        var y = window.scrollY || window.pageYOffset || 0;
        var doc = document.documentElement;
        var total = Math.max(1, (doc.scrollHeight || 1) - (window.innerHeight || 1));
        state.progress.style.width = clamp((y / total) * 100, 0, 100) + '%';
      }
    });
  }
  var scrollTicking = false;
  function onScroll() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(function () { scrollTicking = false; updateActive(); });
  }

  function startFollowTimer() {
    if (state.followTimer) clearInterval(state.followTimer);
    state.followTimer = setInterval(function () {
      safe(function () {
        if (state.panel && state.headings.length && !document.hidden) updateActive();
      });
    }, 500);
  }

  /* ---------- 目录体高度双保险 ---------- */
  function refreshBodyHeight() {
    safe(function () {
      if (!state.panel || !state.body || prefs.collapsed || prefs.closed) return;
      if (state.settingsOpen) {
        state.body.style.flex = '0 0 auto';
        state.body.style.height = '';
        state.body.style.maxHeight = '';
        return;
      }
      var pr = state.panel.getBoundingClientRect();
      var hh = state.header ? state.header.offsetHeight : 0;
      var sh = 0;
      var avail = Math.floor(pr.height - hh - sh);
      if (avail < 60) avail = 60;
      var b = state.body;
      b.style.flex = '0 0 auto';
      b.style.height = avail + 'px';
      b.style.maxHeight = avail + 'px';
    });
  }
  function refreshBodyHeightDeferred() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { refreshBodyHeight(); });
    });
  }

  /* ---------- 滚轮接管 ---------- */
  function bindWheel(panel, body) {
    panel.addEventListener('wheel', function (e) {
      if (prefs.collapsed) return;
      var t = e.target;
      var settings = t && t.closest ? t.closest('.ft-settings') : null;
      if (settings && state.settingsOpen) {
        safe(function () {
          var sd = e.deltaY;
          if (e.deltaMode === 1) sd = sd * 16;
          else if (e.deltaMode === 2) sd = sd * settings.clientHeight;
          var settingsMax = settings.scrollHeight - settings.clientHeight;
          if (settingsMax > 2) settings.scrollTop = clamp(settings.scrollTop + sd, 0, settingsMax);
          e.preventDefault();
          e.stopPropagation();
        });
        return;
      }
      state.tocManualScrollUntil = Date.now() + 900;
      safe(function () {
        var d = e.deltaY;
        if (e.deltaMode === 1) d = d * 16;
        else if (e.deltaMode === 2) d = d * body.clientHeight;
        var maxTop = body.scrollHeight - body.clientHeight;
        if (maxTop <= 2) return;
        var before = body.scrollTop;
        var next = clamp(before + d, 0, maxTop);
        if (next === before) return;
        body.scrollTop = next;
        e.preventDefault();
        e.stopPropagation();
      });
    }, { passive: false });
  }

  /* ---------- v1.9.5：完全贴边隐藏（重写版：定时器防重置 + 坐标轮询） ---------- */
  function getEdgeGap() { return clamp(prefs.edgeGap || 0, 0, 200); }
  function getPeek() { return clamp(prefs.peek || 30, 30, 200); }
  function getSensDelay() { return SENS[clamp(prefs.sens || 3, 1, 5) - 1]; }

  function panelIsLeftSide() {
    var r = state.panel.getBoundingClientRect();
    var vr = visibleRect();
    return (r.left + r.width / 2) < (vr.left + vr.right) / 2;
  }

  function expandedLeftX() {
    var w = state.panel.getBoundingClientRect().width;
    var vr = visibleRect(), gap = getEdgeGap();
    return panelIsLeftSide() ? vr.left + gap : Math.max(vr.left + gap, vr.right - w - gap);
  }

  function hiddenLeftX() {
    var w = state.panel.getBoundingClientRect().width;
    var peek = getPeek(), vr = visibleRect();
    var x;
    if (panelIsLeftSide()) x = vr.left - (w - peek);
    else x = vr.right - peek;
    if (x < vr.left - (w - 30)) x = vr.left - (w - 30); // 安全下限：最少露出 30px
    return x;
  }

  function clearPeekTimers() {
    if (state.peekInTimer) { clearTimeout(state.peekInTimer); state.peekInTimer = null; }
    if (state.peekOutTimer) { clearTimeout(state.peekOutTimer); state.peekOutTimer = null; }
  }

  // v1.9.9：离开方向锁。贴边目录展开后，朝侧标签/侧栏方向离开时，
  // 面板收回产生的几何位移不能把同一个指针重新判定成“进入目录”。
  function clearPeekShowLock() {
    state.peekShowLocked = false;
    state.peekExitSide = '';
  }
  function pointerMovesInward(dx, side) {
    if (Math.abs(dx) < 0.5) return false;
    side = side || state.peekExitSide || (panelIsLeftSide() ? 'left' : 'right');
    return side === 'left' ? dx > 0.5 : dx < -0.5;
  }
  function pointerMovesOutward(dx, side) {
    if (Math.abs(dx) < 0.5) return false;
    side = side || (panelIsLeftSide() ? 'left' : 'right');
    return side === 'left' ? dx < -0.5 : dx > 0.5;
  }

  function pointerEventHitsPanel(e, x, y) {
    if (!pointInPanel(x, y)) return false;
    var host = state.host;
    if (!host) return false;
    try {
      var path = e && typeof e.composedPath === 'function' ? e.composedPath() : [];
      if (path && path.length) return path.indexOf(host) >= 0;
      return e && e.target && (e.target === host || host.contains(e.target));
    } catch (err) { return false; }
  }
  function pointerInsidePanelNow() {
    if (!pointInPanel(state.lastMX, state.lastMY)) return false;
    return state.pointerHitPanel !== false;
  }

  function movePanelToLeft(nx, done) {
    var p = state.panel;
    var r = p.getBoundingClientRect();
    var vr = visibleRect();
    var ny = clamp(r.top, vr.top, Math.max(vr.top, vr.bottom - r.height));
    p.classList.remove('ft-anim');
    p.classList.add('ft-peekmove');
    p.style.left = Math.round(nx) + 'px';
    p.style.top = Math.round(ny) + 'px';
    p.style.right = 'auto';
    prefs.x = Math.round(nx); prefs.y = Math.round(ny);
    savePrefs();
    var t = setTimeout(function () {
      safe(function () { p.classList.remove('ft-peekmove'); });
      if (done) safe(done);
    }, 280);
    state.initTimers.push(t);
  }

  // 【关键修复①】同方向定时器已存在时不再重置——
  // v1.9.4 的死因：每次检测都 clearTimeout 重新倒计时，鼠标的微米级颤动让 200ms 永远等不到头
  function schedulePeekShow() {
    if (!prefs.fullEdge || prefs.collapsed || prefs.closed || state.adjusting) return;
    if (!state.peekHidden) return;                    // 已经是展开态，无需唤出
    if (state.peekShowLocked) return;                 // 从面板向侧栏离开，等指针向内容区返回
    if (state.peekOutTimer) { clearTimeout(state.peekOutTimer); state.peekOutTimer = null; } // 只取消反方向
    if (state.peekInTimer) return;                    // 唤出倒计时进行中，别动它
    var delay = getSensDelay();
    state.peekInTimer = setTimeout(function () {
      state.peekInTimer = null;
      if (!state.panel || prefs.collapsed || prefs.closed || state.adjusting) return;
      if (!pointerInsidePanelNow()) return; // 到期再验一次坐标和实际命中目标
      state.peekHidden = false;
      movePanelToLeft(expandedLeftX());
    }, delay);
  }

  function schedulePeekHide() {
    if (!prefs.fullEdge || prefs.collapsed || prefs.closed || state.adjusting) return;
    if (state.peekHidden) return;                     // 已经是隐藏态，无需收回
    if (state.peekInTimer) { clearTimeout(state.peekInTimer); state.peekInTimer = null; }
    if (state.peekOutTimer) return;
    var delay = getSensDelay();
    state.peekOutTimer = setTimeout(function () {
      state.peekOutTimer = null;
      if (!state.panel || prefs.collapsed || prefs.closed || state.adjusting) return;
      if (pointerInsidePanelNow()) return; // 鼠标还在就不收
      state.peekHidden = true;
      movePanelToLeft(hiddenLeftX());
    }, delay);
  }

  function pointInPanel(x, y) {
    try {
      if (x < 0 || y < 0) return false; // 从未捕获过坐标
      if (!state.panel || state.panel.style.display === 'none') return false;
      var r = state.panel.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    } catch (e) { return false; }
  }

  function hoverCheck() {
    if (!prefs.fullEdge || prefs.collapsed || prefs.closed || state.adjusting) return;
    if (pointerInsidePanelNow()) schedulePeekShow();
    else schedulePeekHide();
  }

  // 【关键修复②】多路事件采集坐标 + 200ms 定时轮询
  // 就算某个事件通道被页面/插件劫持，轮询照样每 200ms 查一次岗
  function capturePointer(e) {
    var x = Number(e.clientX), y = Number(e.clientY);
    if (!isFinite(x) || !isFinite(y)) return;
    var px = state.lastMX, py = state.lastMY;
    var dx = (px >= 0) ? x - px : 0;
    var wasInside = (px >= 0 && py >= 0) ?
      (state.pointerHitPanel === true && pointInPanel(px, py)) : false;
    var isInside = pointerEventHitsPanel(e, x, y);
    if (state.peekShowLocked && pointerMovesInward(dx)) clearPeekShowLock();
    if (!state.peekShowLocked && !state.peekHidden && wasInside && !isInside &&
        pointerMovesOutward(dx)) {
      state.peekShowLocked = true;
      state.peekExitSide = panelIsLeftSide() ? 'left' : 'right';
      if (state.peekInTimer) { clearTimeout(state.peekInTimer); state.peekInTimer = null; }
    }
    state.lastDX = dx;
    state.lastDY = (py >= 0) ? y - py : 0;
    state.lastMX = x;
    state.lastMY = y;
    state.pointerHitPanel = isInside;
  }
  function startPeekWatcher() {
    var events = ['pointermove', 'mousemove', 'pointerover', 'pointerdown', 'pointerout', 'mouseout'];
    for (var i = 0; i < events.length; i++) {
      (function (ev) {
        document.addEventListener(ev, capturePointer, true);
        state.cleanupFns.push(function () { document.removeEventListener(ev, capturePointer, true); });
      })(events[i]);
    }
    state.peekPollTimer = setInterval(function () {
      safe(function () {
        if (!prefs.fullEdge || prefs.collapsed || prefs.closed || !state.panel) return;
        hoverCheck();
      });
    }, 200);
    state.cleanupFns.push(function () {
      if (state.peekPollTimer) { clearInterval(state.peekPollTimer); state.peekPollTimer = null; }
    });
  }

  // 调整锁：拖滑块/拖面板时暂停唤出收回，600ms 无操作解锁
  function lockAdjust() {
    state.adjusting = true;
    if (state.adjustTimer) clearTimeout(state.adjustTimer);
    state.adjustTimer = setTimeout(function () {
      state.adjustTimer = null;
      state.adjusting = false;
      hoverCheck();
    }, 600);
  }

  // 【关键修复③】状态评估：开启时立即隐藏（即时反馈），preferVisible 时先亮相
  function evaluateFullEdge(preferVisible) {
    safe(function () {
      if (!state.panel || prefs.closed || prefs.collapsed) return;
      clearPeekTimers();
      clearPeekShowLock();
      if (prefs.posMode === 'edge' && prefs.fullEdge) {
        if (preferVisible) {
          state.peekHidden = false;
          movePanelToLeft(expandedLeftX());
        } else {
          state.peekHidden = true;
          movePanelToLeft(hiddenLeftX());
        }
      } else {
        state.peekHidden = false;
        if (prefs.posMode === 'edge') snapToEdge(true);
      }
    });
  }

  /* ---------- 贴边吸附 ---------- */
  function snapToEdge(animated) {
    safe(function () {
      var p = state.panel;
      if (!p || prefs.closed) return;
      var vr = visibleRect();
      var r = p.getBoundingClientRect();
      var gap = getEdgeGap();
      var centerX = r.left + r.width / 2;
      var toLeft = centerX < (vr.left + vr.right) / 2;
      var nx;
      if (prefs.fullEdge && !prefs.collapsed && state.peekHidden) nx = hiddenLeftX();
      else nx = toLeft ? vr.left + gap : Math.max(vr.left + gap, vr.right - r.width - gap);
      var ny = clamp(r.top, vr.top, Math.max(vr.top, vr.bottom - r.height));
      if (animated && !reduceMotion()) {
        p.classList.add('ft-anim');
        setTimeout(function () { safe(function () { p.classList.remove('ft-anim'); }); }, 450);
      }
      p.style.left = Math.round(nx) + 'px';
      p.style.top = Math.round(ny) + 'px';
      p.style.right = 'auto';
      prefs.x = Math.round(nx); prefs.y = Math.round(ny);
      savePrefs();
    });
  }

  /* ---------- 视口约束 ---------- */
  function constrainPanel() {
    safe(function () {
      var p = state.panel;
      if (!p || prefs.closed) return;
      var vr = visibleRect();
      var vw = Math.max(1, vr.right - vr.left), vh = Math.max(1, vr.bottom - vr.top);
      var r = p.getBoundingClientRect();
      var w, h;
      if (!prefs.collapsed) {
        w = clamp(r.width, 200, Math.floor(vw * 0.8));
        h = clamp(r.height, 150, Math.floor(vh * 0.85));
      } else {
        w = r.width; h = r.height;
      }
      p.style.width = w + 'px';
      p.style.height = h + 'px';

      if (prefs.posMode === 'edge') {
        if (prefs.fullEdge && !prefs.collapsed) {
          // 完全贴边：保持当前显隐状态，只按新视口重算横坐标
          var nx = state.peekHidden ? hiddenLeftX() : expandedLeftX();
          var ny = clamp(r.top, vr.top, Math.max(vr.top, vr.bottom - h));
          p.style.left = Math.round(nx) + 'px';
          p.style.top = Math.round(ny) + 'px';
          p.style.right = 'auto';
          prefs.x = Math.round(nx); prefs.y = Math.round(ny);
          savePrefs();
        } else {
          snapToEdge(false);
        }
      } else {
        var nx2 = clamp(r.left, vr.left, Math.max(vr.left, vr.right - w));
        var ny2 = clamp(r.top, vr.top, Math.max(vr.top, vr.bottom - h));
        p.style.left = Math.round(nx2) + 'px';
        p.style.top = Math.round(ny2) + 'px';
        p.style.right = 'auto';
        prefs.x = Math.round(nx2); prefs.y = Math.round(ny2);
        savePrefs();
      }
      refreshBodyHeight();
    });
  }
  var onViewportChange = debounce(function () {
    constrainPanel();
    placeReopen();
  }, 200);

  var vvFastPending = false;
  function onVisualFast() {
    if (vvFastPending) return;
    vvFastPending = true;
    requestAnimationFrame(function () {
      vvFastPending = false;
      applyReopenStyle();
      placeReopen();
      constrainPanel();
    });
  }

  /* ---------- 拖拽 / 缩放 ---------- */
  function bindDrag(handleEl, onlyWhenCollapsed) {
    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      if (!moved) lockAdjust(); // 开始拖拽瞬间上锁，防面板被收回
      moved = true;
      safe(function () {
        var p = state.panel;
        var r = p.getBoundingClientRect();
        var vr = visibleRect();
        var nx = clamp(ox + dx, vr.left, Math.max(vr.left, vr.right - r.width));
        var ny = clamp(oy + dy, vr.top, Math.max(vr.top, vr.bottom - r.height));
        p.style.left = nx + 'px';
        p.style.top = ny + 'px';
        p.style.right = 'auto';
      });
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (moved) {
        state.panel.__ftocDragged = Date.now();
        safe(function () {
          var r = state.panel.getBoundingClientRect();
          prefs.x = Math.round(r.left); prefs.y = Math.round(r.top);
          savePrefs();
          if (prefs.posMode === 'edge') {
            state.peekHidden = false; // 拖拽后面板处于展开位
            snapToEdge(true);         // 完全贴边时先吸到展开位，600ms 解锁后由 hoverCheck 仲裁显隐
          }
        });
      }
    }
    handleEl.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (onlyWhenCollapsed && !prefs.collapsed) return;
      if (e.target && e.target.closest && e.target.closest('.ft-btn')) return;
      state.panel.classList.remove('ft-anim');
      dragging = true;
      moved = false;
      sx = e.clientX; sy = e.clientY;
      var r = state.panel.getBoundingClientRect();
      ox = r.left; oy = r.top;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
      if (e.cancelable) e.preventDefault();
    });
  }

  function bindResize(grip) {
    var resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
    function onMove(e) {
      if (!resizing) return;
      safe(function () {
        var pr = state.panel.getBoundingClientRect();
        var vr = visibleRect();
        var maxW = Math.min(Math.floor((vr.right - vr.left) * 0.8), Math.max(200, vr.right - pr.left - 8));
        var maxH = Math.min(Math.floor((vr.bottom - vr.top) * 0.85), Math.max(150, vr.bottom - pr.top - 8));
        var nw = clamp(sw + (e.clientX - sx), 200, maxW);
        var nh = clamp(sh + (e.clientY - sy), 150, maxH);
        state.panel.style.width = nw + 'px';
        state.panel.style.height = nh + 'px';
        refreshBodyHeight();
      });
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!resizing) return;
      resizing = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      safe(function () {
        var r = state.panel.getBoundingClientRect();
        prefs.w = Math.round(r.width); prefs.h = Math.round(r.height);
        savePrefs();
        refreshBodyHeight();
      });
    }
    grip.addEventListener('mousedown', function (e) {
      if (e.button !== 0 || prefs.collapsed) return;
      lockAdjust();
      state.panel.classList.remove('ft-anim');
      resizing = true;
      sx = e.clientX; sy = e.clientY;
      var r = state.panel.getBoundingClientRect();
      sw = r.width; sh = r.height;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    });
  }

  function bindReopenDrag(btn) {
    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    function onMove(e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) < 5) return;
      moved = true;
      safe(function () {
        var r = btn.getBoundingClientRect();
        var rect = visibleRect();
        var nx = clamp(ox + dx, rect.left, Math.max(rect.left, rect.right - r.width));
        var ny = clamp(oy + dy, rect.top, Math.max(rect.top, rect.bottom - r.height));
        btn.style.left = nx + 'px';
        btn.style.top = ny + 'px';
        btn.style.right = 'auto';
        btn.style.bottom = 'auto';
      });
      if (e.cancelable) e.preventDefault();
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener('mousemove', onMove, true);
      document.removeEventListener('mouseup', onUp, true);
      if (moved) {
        btn.__ftocDragged = Date.now();
        safe(function () {
          var r = btn.getBoundingClientRect();
          prefs.rx = Math.round(r.left); prefs.ry = Math.round(r.top);
          savePrefs();
        });
      }
    }
    btn.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      sx = e.clientX; sy = e.clientY;
      var r = btn.getBoundingClientRect();
      ox = r.left; oy = r.top;
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mouseup', onUp, true);
      if (e.cancelable) e.preventDefault();
    });
  }

  /* ---------- 折叠 / 关闭 / 外观 ---------- */
  function setSettingsOpen(open) {
    safe(function () {
      if (!state.settings || !state.body || prefs.collapsed || prefs.closed) return;
      state.settingsOpen = !!open;
      state.settings.style.display = state.settingsOpen ? 'flex' : 'none';
      state.body.style.display = state.settingsOpen ? 'none' : '';
      if (state.settingsOpen) {
        constrainPanel();
        syncSettingsUI();
        state.settings.scrollTop = 0;
        try { state.settings.focus({ preventScroll: true }); } catch (e) { state.settings.focus(); }
        requestAnimationFrame(function () {
          safe(function () {
            if (state.settings && state.settingsOpen) {
              state.settings.scrollTop = clamp(state.settings.scrollTop, 0,
                Math.max(0, state.settings.scrollHeight - state.settings.clientHeight));
            }
          });
        });
      } else {
        refreshBodyHeightDeferred();
        requestAnimationFrame(updateActive);
      }
    });
  }

  function setPanelChrome(visible) {
    safe(function () {
      if (!visible) state.settingsOpen = false;
      state.body.style.display = visible && !state.settingsOpen ? '' : 'none';
      state.grip.style.display = visible ? '' : 'none';
      state.titleEl.style.display = visible ? '' : 'none';
      state.counter.style.display = visible ? '' : 'none';
      state.btnSettings.style.display = visible ? '' : 'none';
      state.btnRestart.style.display = visible ? '' : 'none';
      state.btnClose.style.display = visible ? '' : 'none';
      state.settings.style.display = visible && state.settingsOpen ? 'flex' : 'none';
      if (visible) requestAnimationFrame(updateActive);
    });
  }

  function applyCollapsed(collapsed, silent) {
    safe(function () {
      prefs.collapsed = collapsed;
      var p = state.panel;
      var vr = visibleRect();
      var vw = Math.max(1, vr.right - vr.left), vh = Math.max(1, vr.bottom - vr.top);
      var animated = !silent && !reduceMotion();
      clearPeekTimers();

      p.classList.remove('ft-anim');
      var r0 = p.getBoundingClientRect();
      if (animated) {
        p.style.width = Math.round(r0.width) + 'px';
        p.style.height = Math.round(r0.height) + 'px';
        void p.offsetWidth;
        p.classList.add('ft-anim');
      }

      if (collapsed) {
        if (r0.width > 60) { prefs.w = Math.round(r0.width); prefs.h = Math.round(r0.height); }
        var centerX = r0.left + r0.width / 2;
        var anchorRight = centerX > vw / 2;
         var cLeft = clamp(anchorRight ? (r0.left + r0.width - 44) : r0.left, vr.left, Math.max(vr.left, vr.right - 44));
         var cTop = clamp(r0.top, vr.top, Math.max(vr.top, vr.bottom - 44));
        var hh = state.header ? state.header.offsetHeight : 38;

        p.classList.add('ft-collapsed');
        p.style.left = Math.round(cLeft) + 'px';
        p.style.top = Math.round(cTop) + 'px';
        p.style.right = 'auto';
        state.btnCollapse.textContent = '▶';
        state.btnCollapse.title = '展开目录';
        prefs.x = Math.round(cLeft); prefs.y = Math.round(cTop);

        if (animated) {
          p.style.width = '44px';
          p.style.height = hh + 'px';
          setTimeout(function () {
            safe(function () {
              setPanelChrome(false);
              p.style.height = 'auto';
              p.classList.remove('ft-anim');
              constrainPanel();
            });
          }, 460);
          flashEl(p);
        } else {
          p.style.width = '44px';
          p.style.height = 'auto';
          setPanelChrome(false);
        }
      } else {
        var w2 = clamp(prefs.w, 200, Math.floor(vw * 0.8));
        var h2 = clamp(prefs.h, 150, Math.floor(vh * 0.85));
        var centerX2 = r0.left + r0.width / 2;
        var anchorRight2 = centerX2 > vw / 2;
         var eLeft = clamp(anchorRight2 ? (r0.left + r0.width - w2) : r0.left, vr.left, Math.max(vr.left, vr.right - w2));
         var eTop = clamp(r0.top, vr.top, Math.max(vr.top, vr.bottom - h2));

        p.classList.remove('ft-collapsed');
        setPanelChrome(true);
        state.btnCollapse.textContent = '◀';
        state.btnCollapse.title = '收起目录';
        p.style.left = Math.round(eLeft) + 'px';
        p.style.top = Math.round(eTop) + 'px';
        p.style.right = 'auto';
        p.style.width = w2 + 'px';
        p.style.height = h2 + 'px';
        prefs.x = Math.round(eLeft); prefs.y = Math.round(eTop);

        if (animated) {
          setTimeout(function () {
            safe(function () {
              p.classList.remove('ft-anim');
              constrainPanel();
              refreshBodyHeight();
              evaluateFullEdge(true); // 恢复完全贴边逻辑（先亮相，再由轮询决定去留）
            });
          }, 460);
        } else {
          refreshBodyHeightDeferred();
          evaluateFullEdge(true);
        }
      }
      savePrefs();
      if (!animated) { constrainPanel(); }
    });
  }

  function applyClosed(closed) {
    safe(function () {
      prefs.closed = closed;
      savePrefs();
      clearPeekTimers();
      clearPeekShowLock();
      if (closed) {
        state.settingsOpen = false;
        if (state.settings) state.settings.style.display = 'none';
        if (state.body) state.body.style.display = '';
      }
      state.panel.style.display = closed ? 'none' : '';
      state.progress.style.display = closed ? 'none' : '';
      state.reopen.style.display = closed ? 'flex' : 'none';
      if (closed) { applyReopenStyle(); placeReopen(); }
      else { refreshBodyHeightDeferred(); evaluateFullEdge(true); }
    });
  }

  function closeWithAnim() {
    safe(function () {
      var fromRect = null;
      safe(function () { fromRect = state.btnClose.getBoundingClientRect(); });
      if (!fromRect || (fromRect.width === 0 && fromRect.height === 0)) {
        safe(function () { fromRect = state.panel.getBoundingClientRect(); });
      }
      var toRect = reopenTargetRect();
      applyClosed(true);
      if (!fromRect || reduceMotion()) { flashEl(state.reopen); return; }
      flyGhost(fromRect, toRect, function () { flashEl(state.reopen); });
    });
  }

  function openWithAnim() {
    safe(function () {
      clearPeekShowLock();
      var fromRect = null;
      safe(function () { fromRect = state.reopen.getBoundingClientRect(); });
      applyClosed(false);
      var toRect = null;
      safe(function () { toRect = state.header.getBoundingClientRect(); });
      if (!fromRect || fromRect.width === 0 || !toRect || reduceMotion()) {
        flashEl(state.panel);
        return;
      }
      flyGhost(fromRect, toRect, function () { flashEl(state.panel); });
    });
  }

  /* ---------- 字体控制 ---------- */
  function applyFontSize() {
    safe(function () {
      var p = state.panel;
      if (!p) return;
      var size;
      if (prefs.fontMode === 'auto') size = Math.round(13 * getPageScale());
      else size = clamp(prefs.fontSize, 11, 24);
      p.style.fontSize = size + 'px';
      if (state.uiFontSlider) {
        state.uiFontSlider.value = prefs.fontSize;
        state.uiFontVal.textContent = prefs.fontSize + 'px';
      }
      refreshBodyHeight();
    });
  }

  /* ---------- 主题 ---------- */
  function getPalette() {
    if (prefs.theme === 'custom') {
      var bg = prefs.customBg || '#2b2d42';
      var darkText = relLuminance(bg) > 0.55;
      return {
        bg: bg,
        fg: darkText ? '#1f2430' : '#e8e8ea',
        sub: darkText ? 'rgba(0,0,0,.5)' : 'rgba(255,255,255,.55)',
        hover: darkText ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.08)',
        activeBg: darkText ? 'rgba(50,110,255,.14)' : 'rgba(110,160,255,.22)',
        activeFg: darkText ? '#1d5fd6' : '#8db8ff',
        border: darkText ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.14)'
      };
    }
    if (prefs.theme === 'light') {
      return { bg: '#ffffff', fg: '#1f2430', sub: 'rgba(0,0,0,.5)',
               hover: 'rgba(0,0,0,.06)', activeBg: 'rgba(50,110,255,.14)',
               activeFg: '#1d5fd6', border: 'rgba(0,0,0,.1)' };
    }
    return { bg: '#1e1e22', fg: '#e8e8ea', sub: 'rgba(255,255,255,.55)',
             hover: 'rgba(255,255,255,.08)', activeBg: 'rgba(110,160,255,.22)',
             activeFg: '#8db8ff', border: 'rgba(255,255,255,.14)' };
  }

  function applyAppearance() {
    safe(function () {
      var p = state.panel;
      if (!p) return;
      var pal = getPalette();
      p.style.setProperty('--ft-fg', pal.fg);
      p.style.setProperty('--ft-sub', pal.sub);
      p.style.setProperty('--ft-hover', pal.hover);
      p.style.setProperty('--ft-active-bg', pal.activeBg);
      p.style.setProperty('--ft-active-fg', pal.activeFg);
      p.style.background = hexToRgba(pal.bg, prefs.opacity);
      var bf = prefs.blurOn ? 'blur(' + prefs.blur + 'px) saturate(1.3)' : 'none';
      p.style.backdropFilter = bf;
      p.style.webkitBackdropFilter = bf;
      p.style.border = '1px solid ' + pal.border;
      applyFontSize();
      applyReopenStyle();
      syncSettingsUI();
    });
  }

  function syncSettingsUI() {
    safe(function () {
      if (!state.settings || !state.uiBlurOn) return;
      state.uiBlurOn.checked = !!prefs.blurOn;
      state.uiBlur.value = prefs.blur;
      state.uiBlurVal.textContent = prefs.blur + 'px';
      state.uiOpacity.value = Math.round(prefs.opacity * 100);
      state.uiOpacityVal.textContent = Math.round(prefs.opacity * 100) + '%';
      if (state.uiAnchor) {
        state.uiAnchor.value = Math.round(prefs.anchor * 100);
        state.uiAnchorVal.textContent = Math.round(prefs.anchor * 100) + '%';
      }
      if (state.uiBgRow) state.uiBgRow.style.display = (prefs.theme === 'custom') ? '' : 'none';
      if (state.uiColor) state.uiColor.value = prefs.customBg || '#2b2d42';
      var sw = state.settings.querySelectorAll('.ft-swatch'), i;
      for (i = 0; i < sw.length; i++) {
        sw[i].classList.toggle('ft-sel', sw[i].getAttribute('data-color') === prefs.customBg);
      }
      state.uiThemeDark.classList.toggle('ft-sel', prefs.theme === 'dark');
      state.uiThemeLight.classList.toggle('ft-sel', prefs.theme === 'light');
      state.uiThemeCustom.classList.toggle('ft-sel', prefs.theme === 'custom');

      if (state.uiFontAuto && state.uiFontCustom) {
        state.uiFontAuto.classList.toggle('ft-sel', prefs.fontMode === 'auto');
        state.uiFontCustom.classList.toggle('ft-sel', prefs.fontMode === 'custom');
        if (state.uiFontRow) state.uiFontRow.style.display = (prefs.fontMode === 'custom') ? '' : 'none';
        if (state.uiFontSlider && state.uiFontVal) {
          state.uiFontSlider.value = prefs.fontSize;
          state.uiFontVal.textContent = prefs.fontSize + 'px';
        }
      }

      if (state.uiRbAuto && state.uiRbCustom) {
        state.uiRbAuto.classList.toggle('ft-sel', prefs.rbMode === 'auto');
        state.uiRbCustom.classList.toggle('ft-sel', prefs.rbMode === 'custom');
        if (state.uiRbRow) state.uiRbRow.style.display = (prefs.rbMode === 'custom') ? '' : 'none';
        if (state.uiRbSize && state.uiRbSizeVal) {
          state.uiRbSize.value = prefs.rbSize;
          state.uiRbSizeVal.textContent = prefs.rbSize + 'px';
        }
        if (state.uiRbColor) state.uiRbColor.value = prefs.rbColor || '#4f8cff';
      }

      if (state.uiPosFree && state.uiPosEdge) {
        state.uiPosFree.classList.toggle('ft-sel', prefs.posMode === 'free');
        state.uiPosEdge.classList.toggle('ft-sel', prefs.posMode === 'edge');
      }
      // 位置区块层级显示：间距行+隐藏开关 → 仅贴边；露出+灵敏度 → 仅贴边且开启隐藏
      if (state.uiGapRow) state.uiGapRow.style.display = (prefs.posMode === 'edge') ? '' : 'none';
      if (state.uiFullEdgeRow) state.uiFullEdgeRow.style.display = (prefs.posMode === 'edge') ? '' : 'none';
      var showPeek = (prefs.posMode === 'edge' && prefs.fullEdge);
      if (state.uiPeekWrap) state.uiPeekWrap.style.display = showPeek ? '' : 'none';
      if (state.uiGapSlider && state.uiGapVal) {
        state.uiGapSlider.value = getEdgeGap();
        state.uiGapVal.textContent = getEdgeGap() + 'px';
      }
      if (state.uiFullEdgeCb) state.uiFullEdgeCb.checked = !!prefs.fullEdge;
      if (state.uiPeekSlider && state.uiPeekVal) {
        state.uiPeekSlider.value = getPeek();
        state.uiPeekVal.textContent = getPeek() + 'px';
      }
      if (state.uiSensBtns) {
        for (i = 0; i < state.uiSensBtns.length; i++) {
          state.uiSensBtns[i].classList.toggle('ft-sel', (i + 1) === clamp(prefs.sens || 3, 1, 5));
        }
      }
    });
  }

  /* ---------- 构建 UI ---------- */
  function mkBtn(txt, tip) {
    var b = document.createElement('button');
    b.className = 'ft-btn';
    b.type = 'button';
    b.textContent = txt;
    b.title = tip || '';
    return b;
  }
  function el(tag, cls, cssText) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (cssText) d.style.cssText = cssText;
    return d;
  }

  var PRESETS = [
    { c: '#1e1e22', label: '墨黑' },
    { c: '#2b2d42', label: '藏蓝' },
    { c: '#0f3460', label: '深海' },
    { c: '#3a5a40', label: '松绿' },
    { c: '#5c2e2e', label: '酒红' },
    { c: '#ffffff', label: '纯白' },
    { c: '#f5f0e6', label: '米白' }
  ];

  function buildSettings() {
    var box = el('div', 'ft-settings');
    box.style.display = 'none';
    box.tabIndex = 0;
    box.setAttribute('role', 'region');
    box.setAttribute('aria-label', '目录设置');

    var rowDoc = el('div', 'ft-row');
    var docLabel = el('label'); docLabel.textContent = '说明';
    var docBtn = document.createElement('button');
    docBtn.className = 'ft-theme-btn'; docBtn.type = 'button'; docBtn.textContent = '参数说明';
    docBtn.setAttribute('aria-expanded', 'false');
    var doc = el('div', 'ft-doc');
    function addDocGroup(title, text) {
      var group = el('div', 'ft-doc-group');
      var heading = el('div', 'ft-doc-h'); heading.textContent = title;
      var body = el('div', 'ft-doc-p'); body.textContent = text;
      group.appendChild(heading); group.appendChild(body); doc.appendChild(group);
    }
    addDocGroup('目录与实时跟随', '目录读取页面中可见的 H1-H6 标题。页面滚动时当前章节会实时高亮，并自动保持在目录滚动区域内；面板隐藏或收起后再次展开，目录仍会恢复到当前位置。');
    addDocGroup('毛玻璃与透明度', '模糊控制面板后方页面内容的柔化程度；透明度决定面板本体的不透明程度。网页复杂或设备性能较弱时，可降低模糊以减少渲染开销。');
    addDocGroup('背景与主题', '预设背景用于快速切换；深色、浅色用于保持文字对比；自定义允许选择背景色，并依据亮度自动适配文字颜色。');
    addDocGroup('定位', '定位比例决定点击目录后标题停在视口顶部下方的位置，用于避开网页固定导航，也保留阅读上下文。');
    addDocGroup('字体', '默认模式跟随网页缩放，适合大多数阅读页面；自定义模式使用固定字号，适合网站字号不一致的页面。');
    addDocGroup('圆钮', '关闭面板后显示的重新打开按钮。默认模式自动适应网页背景，自定义模式可固定圆钮大小和颜色。');
    addDocGroup('位置与间距', '自由模式不主动吸附；贴边模式会靠近左右边缘，并在窗口变化时保持贴边。间距用于避开网页侧栏、滚动条或其他固定控件。');
    addDocGroup('完全贴边隐藏', '开启后面板平时只保留露出部分，鼠标靠近时滑出，离开后收回。露出控制隐藏时可见的“耳朵”宽度；灵敏度控制唤出和收回的等待时间。');
    addDocGroup('交互与维护', '标题栏可拖动面板，右下角可调整尺寸；目录内滚轮只滚动目录。设置区域可以独立上下滚动，修改会即时保存并应用。');
    rowDoc.appendChild(docLabel); rowDoc.appendChild(docBtn);
    docBtn.addEventListener('click', function () {
      var show = doc.style.display === 'none';
      doc.style.display = show ? 'block' : 'none';
      docBtn.textContent = show ? '收起说明' : '参数说明';
      docBtn.setAttribute('aria-expanded', show ? 'true' : 'false');
      if (show) box.scrollTop = 0;
    });

    var row1 = el('div', 'ft-row');
    var lb1 = el('label'); lb1.textContent = '毛玻璃';
    var cb = document.createElement('input'); cb.type = 'checkbox';
    var lb1b = el('label'); lb1b.textContent = '模糊';
    var rgBlur = document.createElement('input');
    rgBlur.type = 'range'; rgBlur.min = '4'; rgBlur.max = '24'; rgBlur.step = '1';
    var blurVal = el('label'); blurVal.textContent = '';
    row1.appendChild(lb1); row1.appendChild(cb); row1.appendChild(lb1b);
    row1.appendChild(rgBlur); row1.appendChild(blurVal);

    var row2 = el('div', 'ft-row');
    var lb2 = el('label'); lb2.textContent = '透明度';
    var rgOp = document.createElement('input');
    rgOp.type = 'range'; rgOp.min = '60'; rgOp.max = '95'; rgOp.step = '1';
    var opVal = el('label'); opVal.textContent = '';
    row2.appendChild(lb2); row2.appendChild(rgOp); row2.appendChild(opVal);

    var row3 = el('div', 'ft-row');
    var lb3 = el('label'); lb3.textContent = '背景';
    row3.appendChild(lb3);
    for (var i = 0; i < PRESETS.length; i++) {
      (function (preset) {
        var sw = el('div', 'ft-swatch');
        sw.setAttribute('data-color', preset.c);
        sw.title = preset.label;
        sw.style.background = preset.c;
        sw.addEventListener('click', function () {
          prefs.customBg = preset.c; savePrefs(); applyAppearance();
        });
        row3.appendChild(sw);
      })(PRESETS[i]);
    }
    var colorIn = document.createElement('input');
    colorIn.type = 'color'; colorIn.title = '自定义颜色';
    colorIn.addEventListener('input', function () {
      prefs.customBg = colorIn.value; savePrefs(); applyAppearance();
    });
    row3.appendChild(colorIn);

    var row4 = el('div', 'ft-row');
    var lb4 = el('label'); lb4.textContent = '主题';
    var btnDark = document.createElement('button');
    btnDark.className = 'ft-theme-btn'; btnDark.type = 'button'; btnDark.textContent = '深色';
    btnDark.title = '官方深色配色包（墨底白字）';
    var btnLight = document.createElement('button');
    btnLight.className = 'ft-theme-btn'; btnLight.type = 'button'; btnLight.textContent = '浅色';
    btnLight.title = '官方浅色配色包（白底黑字）';
    var btnCustom = document.createElement('button');
    btnCustom.className = 'ft-theme-btn'; btnCustom.type = 'button'; btnCustom.textContent = '自定义';
    btnCustom.title = '自由选背景色，文字颜色自动适配';
    btnDark.addEventListener('click', function () { prefs.theme = 'dark'; savePrefs(); applyAppearance(); });
    btnLight.addEventListener('click', function () { prefs.theme = 'light'; savePrefs(); applyAppearance(); });
    btnCustom.addEventListener('click', function () { prefs.theme = 'custom'; savePrefs(); applyAppearance(); });
    row4.appendChild(lb4); row4.appendChild(btnDark); row4.appendChild(btnLight); row4.appendChild(btnCustom);

    var row5 = el('div', 'ft-row');
    var lb5 = el('label'); lb5.textContent = '定位';
    var rgAnchor = document.createElement('input');
    rgAnchor.type = 'range'; rgAnchor.min = '5'; rgAnchor.max = '45'; rgAnchor.step = '1';
    rgAnchor.title = '点击目录后，标题停在距屏幕顶部百分之几的位置';
    var anchorVal = el('label'); anchorVal.textContent = '';
    var lb5b = el('label'); lb5b.textContent = '距顶';
    row5.appendChild(lb5); row5.appendChild(rgAnchor); row5.appendChild(anchorVal); row5.appendChild(lb5b);

    var row6 = el('div', 'ft-row');
    var lb6 = el('label'); lb6.textContent = '字体';
    var btnFontAuto = document.createElement('button');
    btnFontAuto.className = 'ft-theme-btn'; btnFontAuto.type = 'button'; btnFontAuto.textContent = '默认';
    btnFontAuto.title = '跟随网页缩放自动调整字号';
    var btnFontCustom = document.createElement('button');
    btnFontCustom.className = 'ft-theme-btn'; btnFontCustom.type = 'button'; btnFontCustom.textContent = '自定义';
    btnFontCustom.title = '固定字号，不随网页缩放变化';
    row6.appendChild(lb6); row6.appendChild(btnFontAuto); row6.appendChild(btnFontCustom);
    var rowFont = el('div', 'ft-row');
    var rgFont = document.createElement('input');
    rgFont.type = 'range'; rgFont.min = '11'; rgFont.max = '24'; rgFont.step = '1';
    var fontVal = el('label'); fontVal.textContent = '';
    rowFont.appendChild(rgFont); rowFont.appendChild(fontVal);

    var row7 = el('div', 'ft-row');
    var lb7 = el('label'); lb7.textContent = '圆钮';
    lb7.title = '点 ✕ 关闭面板后出现的圆形按钮';
    var btnRbAuto = document.createElement('button');
    btnRbAuto.className = 'ft-theme-btn'; btnRbAuto.type = 'button'; btnRbAuto.textContent = '默认';
    btnRbAuto.title = '颜色跟随页面背景自动适配，大小随网页缩放';
    var btnRbCustom = document.createElement('button');
    btnRbCustom.className = 'ft-theme-btn'; btnRbCustom.type = 'button'; btnRbCustom.textContent = '自定义';
    btnRbCustom.title = '自由设置圆钮的大小与颜色';
    row7.appendChild(lb7); row7.appendChild(btnRbAuto); row7.appendChild(btnRbCustom);

    var rowRb = el('div', 'ft-row');
    var lbR1 = el('label'); lbR1.textContent = '大小';
    var rgRbSize = document.createElement('input');
    rgRbSize.type = 'range'; rgRbSize.min = '20'; rgRbSize.max = '80'; rgRbSize.step = '1';
    var rbSizeVal = el('label'); rbSizeVal.textContent = '';
    var lbR2 = el('label'); lbR2.textContent = '颜色';
    var rbColorIn = document.createElement('input');
    rbColorIn.type = 'color'; rbColorIn.title = '圆钮背景色（图标颜色自动适配）';
    rowRb.appendChild(lbR1); rowRb.appendChild(rgRbSize); rowRb.appendChild(rbSizeVal);
    rowRb.appendChild(lbR2); rowRb.appendChild(rbColorIn);

    // 位置模式
    var row8 = el('div', 'ft-row');
    var lb8 = el('label'); lb8.textContent = '位置';
    var btnPosFree = document.createElement('button');
    btnPosFree.className = 'ft-theme-btn'; btnPosFree.type = 'button'; btnPosFree.textContent = '自由';
    btnPosFree.title = '面板自由停放，缩放时仅保证不被遮盖';
    var btnPosEdge = document.createElement('button');
    btnPosEdge.className = 'ft-theme-btn'; btnPosEdge.type = 'button'; btnPosEdge.textContent = '贴边';
    btnPosEdge.title = '松手后自动吸附到较近的一侧边缘，缩放时保持贴边';
    btnPosFree.addEventListener('click', function () {
      prefs.posMode = 'free'; savePrefs(); syncSettingsUI(); refreshBodyHeight();
      evaluateFullEdge(); // 离开贴边 → 完全贴边逻辑退场，面板自由停放
    });
    btnPosEdge.addEventListener('click', function () {
      prefs.posMode = 'edge'; savePrefs(); syncSettingsUI(); refreshBodyHeight();
      evaluateFullEdge(true);
    });
    row8.appendChild(lb8); row8.appendChild(btnPosFree); row8.appendChild(btnPosEdge);

    // 间距微调行（仅贴边模式显示）
    var rowGap = el('div', 'ft-row');
    var lbG = el('label'); lbG.textContent = '间距';
    lbG.title = '贴边时与屏幕边缘的距离，用于避开网页侧边的竖条/滚动条';
    var btnMinus = document.createElement('button');
    btnMinus.className = 'ft-step-btn'; btnMinus.type = 'button'; btnMinus.textContent = '◀';
    btnMinus.title = '细调：间距 −1px';
    var rgGap = document.createElement('input');
    rgGap.type = 'range'; rgGap.min = '0'; rgGap.max = '200'; rgGap.step = '1';
    rgGap.title = '粗调：拖动快速调整间距';
    var gapVal = el('span', 'ft-gap-val'); gapVal.textContent = '';
    var btnPlus = document.createElement('button');
    btnPlus.className = 'ft-step-btn'; btnPlus.type = 'button'; btnPlus.textContent = '▶';
    btnPlus.title = '细调：间距 +1px';

    function setGap(v) {
      prefs.edgeGap = clamp(Math.round(v), 0, 200);
      savePrefs();
      rgGap.value = prefs.edgeGap;
      gapVal.textContent = prefs.edgeGap + 'px';
      if (prefs.posMode === 'edge') snapToEdge(true);
    }
    btnMinus.addEventListener('click', function () { lockAdjust(); setGap(getEdgeGap() - 1); });
    btnPlus.addEventListener('click', function () { lockAdjust(); setGap(getEdgeGap() + 1); });
    rgGap.addEventListener('input', function () { lockAdjust(); setGap(parseInt(rgGap.value, 10) || 0); });
    rowGap.appendChild(lbG); rowGap.appendChild(btnMinus);
    rowGap.appendChild(rgGap); rowGap.appendChild(gapVal); rowGap.appendChild(btnPlus);

    // 完全贴边隐藏开关行（仅贴边模式显示）
    var rowFull = el('div', 'ft-row');
    var lbF = el('label'); lbF.textContent = '隐藏';
    lbF.title = '完全贴边隐藏：面板平时只露出一条"耳朵"，鼠标移入时自动滑出，移出后自动收回';
    var cbFull = document.createElement('input'); cbFull.type = 'checkbox';
    cbFull.title = '开启后，面板将缩到屏幕边缘只露出一条，鼠标靠近时滑出';
    var lbF2 = el('label'); lbF2.textContent = '完全贴边隐藏';
    rowFull.appendChild(lbF); rowFull.appendChild(cbFull); rowFull.appendChild(lbF2);
    cbFull.addEventListener('change', function () {
      prefs.fullEdge = !!cbFull.checked;
      savePrefs();
      syncSettingsUI();
      refreshBodyHeight();
      evaluateFullEdge(false); // 开启：立即藏到边缘；关闭：拉回展开位
      flashEl(state.panel);    // 闪光提示新位置/状态，一眼确认生效
    });

    // 露出量 + 灵敏度（仅贴边且完全贴边开启时显示）
    var peekWrap = el('div', '', 'display:none;flex-direction:column;gap:.615em;');

    var rowPeek = el('div', 'ft-row');
    var lbP = el('label'); lbP.textContent = '露出';
    lbP.title = '隐藏时露出屏幕的宽度（"耳朵"大小），至少 30px 防止找不到';
    var btnPkMinus = document.createElement('button');
    btnPkMinus.className = 'ft-step-btn'; btnPkMinus.type = 'button'; btnPkMinus.textContent = '◀';
    btnPkMinus.title = '细调：露出 −1px';
    var rgPeek = document.createElement('input');
    rgPeek.type = 'range'; rgPeek.min = '30'; rgPeek.max = '200'; rgPeek.step = '1';
    rgPeek.title = '粗调：拖动快速调整露出宽度';
    var peekVal = el('span', 'ft-gap-val'); peekVal.textContent = '';
    var btnPkPlus = document.createElement('button');
    btnPkPlus.className = 'ft-step-btn'; btnPkPlus.type = 'button'; btnPkPlus.textContent = '▶';
    btnPkPlus.title = '细调：露出 +1px';

    function setPeek(v) {
      prefs.peek = clamp(Math.round(v), 30, 200);
      savePrefs();
      rgPeek.value = prefs.peek;
      peekVal.textContent = prefs.peek + 'px';
      if (prefs.posMode === 'edge' && prefs.fullEdge) evaluateFullEdge(state.peekHidden ? false : true);
    }
    btnPkMinus.addEventListener('click', function () { lockAdjust(); setPeek(getPeek() - 1); });
    btnPkPlus.addEventListener('click', function () { lockAdjust(); setPeek(getPeek() + 1); });
    rgPeek.addEventListener('input', function () { lockAdjust(); setPeek(parseInt(rgPeek.value, 10) || 30); });
    rowPeek.appendChild(lbP); rowPeek.appendChild(btnPkMinus);
    rowPeek.appendChild(rgPeek); rowPeek.appendChild(peekVal); rowPeek.appendChild(btnPkPlus);

    var rowSens = el('div', 'ft-row');
    var lbS = el('label'); lbS.textContent = '灵敏度';
    lbS.title = '鼠标移入/移出后，延迟多久才唤出/收回面板（1 极灵敏 ~ 5 极迟钝）';
    rowSens.appendChild(lbS);
    var sensBtns = [];
    var SENS_TIPS = ['1 · 50ms 碰到就弹', '2 · 100ms 较灵敏', '3 · 200ms 平衡', '4 · 350ms 较迟钝', '5 · 500ms 要停一下才弹'];
    for (var si = 0; si < 5; si++) {
      (function (level) {
        var b = document.createElement('button');
        b.className = 'ft-theme-btn'; b.type = 'button';
        b.textContent = String(level);
        b.title = SENS_TIPS[level - 1];
        b.addEventListener('click', function () {
          prefs.sens = level; savePrefs(); syncSettingsUI();
        });
        sensBtns.push(b);
        rowSens.appendChild(b);
      })(si + 1);
    }

    peekWrap.appendChild(rowPeek);
    peekWrap.appendChild(rowSens);

    box.appendChild(rowDoc); box.appendChild(doc);
    box.appendChild(row1); box.appendChild(row2); box.appendChild(row3);
    box.appendChild(row4); box.appendChild(row5); box.appendChild(row6);
    box.appendChild(rowFont); box.appendChild(row7); box.appendChild(rowRb);
    box.appendChild(row8); box.appendChild(rowGap); box.appendChild(rowFull);
    box.appendChild(peekWrap);

    cb.addEventListener('change', function () { prefs.blurOn = cb.checked; savePrefs(); applyAppearance(); });
    rgBlur.addEventListener('input', function () { prefs.blur = parseInt(rgBlur.value, 10) || 14; savePrefs(); applyAppearance(); });
    rgOp.addEventListener('input', function () { prefs.opacity = clamp(parseInt(rgOp.value, 10) || 88, 60, 95) / 100; savePrefs(); applyAppearance(); });
    rgAnchor.addEventListener('input', function () {
      prefs.anchor = clamp(parseInt(rgAnchor.value, 10) || 25, 5, 45) / 100;
      savePrefs();
      anchorVal.textContent = Math.round(prefs.anchor * 100) + '%';
      updateActive();
    });
    btnFontAuto.addEventListener('click', function () { prefs.fontMode = 'auto'; savePrefs(); applyAppearance(); });
    btnFontCustom.addEventListener('click', function () { prefs.fontMode = 'custom'; savePrefs(); applyAppearance(); });
    rgFont.addEventListener('input', function () {
      prefs.fontSize = clamp(parseInt(rgFont.value, 10) || 13, 11, 24);
      savePrefs();
      applyAppearance();
    });
    btnRbAuto.addEventListener('click', function () {
      prefs.rbMode = 'auto'; savePrefs();
      applyReopenStyle(); placeReopen(); syncSettingsUI();
    });
    btnRbCustom.addEventListener('click', function () {
      prefs.rbMode = 'custom'; savePrefs();
      applyReopenStyle(); placeReopen(); syncSettingsUI();
    });
    rgRbSize.addEventListener('input', function () {
      prefs.rbSize = clamp(parseInt(rgRbSize.value, 10) || 36, 20, 80);
      savePrefs();
      rbSizeVal.textContent = prefs.rbSize + 'px';
      applyReopenStyle(); placeReopen();
    });
    rbColorIn.addEventListener('input', function () {
      prefs.rbColor = rbColorIn.value;
      savePrefs();
      applyReopenStyle();
    });

    state.uiBlurOn = cb; state.uiBlur = rgBlur; state.uiBlurVal = blurVal;
    state.uiOpacity = rgOp; state.uiOpacityVal = opVal; state.uiColor = colorIn;
    state.uiThemeDark = btnDark; state.uiThemeLight = btnLight; state.uiThemeCustom = btnCustom;
    state.uiBgRow = row3;
    state.uiAnchor = rgAnchor; state.uiAnchorVal = anchorVal;
    state.uiFontAuto = btnFontAuto; state.uiFontCustom = btnFontCustom;
    state.uiFontSlider = rgFont; state.uiFontVal = fontVal; state.uiFontRow = rowFont;
    state.uiRbAuto = btnRbAuto; state.uiRbCustom = btnRbCustom; state.uiRbRow = rowRb;
    state.uiRbSize = rgRbSize; state.uiRbSizeVal = rbSizeVal; state.uiRbColor = rbColorIn;
    state.uiPosFree = btnPosFree; state.uiPosEdge = btnPosEdge;
    state.uiGapRow = rowGap; state.uiGapMinus = btnMinus; state.uiGapPlus = btnPlus;
    state.uiGapSlider = rgGap; state.uiGapVal = gapVal;
    state.uiFullEdgeRow = rowFull; state.uiFullEdgeCb = cbFull;
    state.uiPeekWrap = peekWrap;
    state.uiPeekMinus = btnPkMinus; state.uiPeekPlus = btnPkPlus;
    state.uiPeekSlider = rgPeek; state.uiPeekVal = peekVal;
    state.uiSensRow = rowSens; state.uiSensBtns = sensBtns;
    return box;
  }

  function buildUI() {
    var vr = visibleRect();
    var vw = Math.max(1, vr.right - vr.left), vh = Math.max(1, vr.bottom - vr.top);

    var host = el('div', '', 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483646;');
    host.id = 'ftoc-host';
    var shadow = host.attachShadow({ mode: 'open' });
    state.host = host; state.shadow = shadow;

    var style = document.createElement('style');
    style.textContent = CSS_TEXT;
    shadow.appendChild(style);

    var panel = el('div', 'ft-panel',
      'position:fixed;display:flex;flex-direction:column;min-width:200px;min-height:150px;');
    var w = clamp(prefs.w, 200, Math.floor(vw * 0.8));
    var h = clamp(prefs.h, 150, Math.floor(vh * 0.85));
    panel.style.width = w + 'px';
    panel.style.height = h + 'px';
    if (prefs.x < 0 || prefs.y < 0) {
      panel.style.left = Math.max(vr.left + 8, vr.right - w - 16) + 'px';
      panel.style.top = Math.max(vr.top + 8, vr.top + 72) + 'px';
    } else {
      panel.style.left = prefs.x + 'px';
      panel.style.top = prefs.y + 'px';
    }
    state.panel = panel;

    var header = el('div', 'ft-header',
      'flex:0 0 auto;display:flex;align-items:center;gap:4px;padding:7px 8px;cursor:move;' +
      'user-select:none;-webkit-user-select:none;overflow:visible;');
    var title = el('div', 'ft-title'); title.textContent = '📑 目录';
    var counter = el('div', 'ft-counter'); counter.textContent = '';
    var btnSettings = mkBtn('⚙️', '外观设置');
    var btnRestart = mkBtn('🔄', '重新加载脚本（不刷新网页）');
    var btnCollapse = mkBtn('◀', '收起目录');
    var btnClose = mkBtn('✕', '关闭（圆钮 📑 可重新打开）');
    header.appendChild(title); header.appendChild(counter);
    header.appendChild(btnSettings); header.appendChild(btnRestart);
    header.appendChild(btnClose); header.appendChild(btnCollapse); // ✕ 与 ◀ 换位，收起按钮坐 C 位
    state.header = header; state.titleEl = title; state.counter = counter;
    state.btnSettings = btnSettings; state.btnRestart = btnRestart;
    state.btnCollapse = btnCollapse; state.btnClose = btnClose;

    var settings = buildSettings();
    state.settings = settings;

    var body = el('div', 'ft-body');
    state.body = body;

    var grip = el('div', 'ft-grip');
    grip.title = '拖拽调节大小';
    state.grip = grip;

    panel.appendChild(header); panel.appendChild(settings);
    panel.appendChild(body); panel.appendChild(grip);

    var progress = el('div', 'ft-progress');
    state.progress = progress;
    var reopen = el('div', 'ft-reopen'); reopen.textContent = '📑'; reopen.title = '打开目录面板';
    state.reopen = reopen;

    shadow.appendChild(panel); shadow.appendChild(progress); shadow.appendChild(reopen);
    document.body.appendChild(host);
    applyReopenStyle();
    placeReopen();

    /* --- 事件绑定 --- */
    bindDrag(header, false);
    bindDrag(panel, true);
    bindResize(grip);
    bindWheel(panel, body);
    bindReopenDrag(reopen);
    startPeekWatcher(); // v1.9.5：多路坐标采集 + 200ms 轮询

    panel.addEventListener('mouseenter', function () { state.panelHover = true; });
    panel.addEventListener('mouseleave', function () { state.panelHover = false; });

    btnCollapse.addEventListener('click', function (e) { e.stopPropagation(); applyCollapsed(!prefs.collapsed, false); });
    btnClose.addEventListener('click', function (e) { e.stopPropagation(); closeWithAnim(); });
    btnRestart.addEventListener('click', function (e) { e.stopPropagation(); restart(); });
    btnSettings.addEventListener('click', function (e) {
      e.stopPropagation();
      setSettingsOpen(!state.settingsOpen);
    });
    reopen.addEventListener('click', function () {
      if (Date.now() - (state.reopen.__ftocDragged || 0) < 200) return;
      openWithAnim();
    });

    panel.addEventListener('click', function (e) {
      if (!prefs.collapsed) return;
      if (Date.now() - (state.panel.__ftocDragged || 0) < 200) return;
      if (e.target && e.target.closest && e.target.closest('.ft-btn')) return;
      applyCollapsed(false, false);
    });

    window.addEventListener('resize', onViewportChange);
    state.cleanupFns.push(function () { window.removeEventListener('resize', onViewportChange); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onViewportChange);
      state.cleanupFns.push(function () { window.visualViewport.removeEventListener('resize', onViewportChange); });
    }

    var fontDebounce = debounce(applyFontSize, 200);
    window.addEventListener('resize', fontDebounce);
    state.cleanupFns.push(function () { window.removeEventListener('resize', fontDebounce); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', fontDebounce);
      state.cleanupFns.push(function () { window.visualViewport.removeEventListener('resize', fontDebounce); });
    }

    window.addEventListener('resize', onVisualFast);
    state.cleanupFns.push(function () { window.removeEventListener('resize', onVisualFast); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', onVisualFast);
      state.cleanupFns.push(function () { window.visualViewport.removeEventListener('resize', onVisualFast); });
      window.visualViewport.addEventListener('scroll', onVisualFast);
      state.cleanupFns.push(function () { window.visualViewport.removeEventListener('scroll', onVisualFast); });
    }

    state.rbTimer = setInterval(function () {
      safe(function () {
        if (prefs.closed && prefs.rbMode === 'auto') applyReopenStyle();
      });
    }, 2000);
    state.cleanupFns.push(function () { if (state.rbTimer) clearInterval(state.rbTimer); });
  }

  /* ---------- 轻量 MutationObserver ---------- */
  function startObserver() {
    safe(function () {
      if (state.observer) state.observer.disconnect();
      var dirty = false;

      var doRefresh = debounce(function () {
        if (!dirty) return;
        dirty = false;
        safe(function () {
          var now = Date.now();
          if (now - state.refreshWindowStart > 10000) { state.refreshWindowStart = now; state.refreshCount = 0; }
          state.refreshCount++;
          if (state.refreshCount > 6) return;
          refreshIfChanged();
        });
      }, 1000);

      state.observer = new MutationObserver(function (muts) {
        try {
          for (var i = 0; i < muts.length; i++) {
            var t = muts[i].target;
            if (t && state.host && (t === state.host || (t.nodeType === 1 && state.host.contains(t)))) continue;
            dirty = true;
            break;
          }
        } catch (e) { dirty = true; }
        if (dirty) doRefresh();
      });
      state.observer.observe(document.body, { childList: true, subtree: true });
    });
  }

  /* ---------- SPA 路由兼容 ---------- */
  function hookHistory() {
    safe(function () {
      var refresh = function () {
        setTimeout(function () { refreshIfChanged(); }, 600);
      };
      var originals = {};
      ['pushState', 'replaceState'].forEach(function (m) {
        var orig = history[m];
        if (typeof orig !== 'function') return;
        originals[m] = orig;
        history[m] = function () {
          var ret = orig.apply(this, arguments);
          refresh();
          return ret;
        };
      });
      state.historyOriginals = originals;
      state.historyRefresh = refresh;
      window.addEventListener('popstate', refresh);
      window.addEventListener('hashchange', refresh);
      state.cleanupFns.push(function () {
        window.removeEventListener('popstate', refresh);
        window.removeEventListener('hashchange', refresh);
        for (var m in originals) {
          if (history[m] && history[m].toString().indexOf('refresh();') >= 0) history[m] = originals[m];
        }
        if (state.historyOriginals === originals) {
          state.historyOriginals = null;
          state.historyRefresh = null;
        }
      });
    });
  }

  /* ---------- 销毁 / 重启 ---------- */
  function destroy() {
    safe(function () {
      if (state.observer) { state.observer.disconnect(); state.observer = null; }
      clearPeekTimers();
      if (state.adjustTimer) { clearTimeout(state.adjustTimer); state.adjustTimer = null; }
      if (state.peekPollTimer) { clearInterval(state.peekPollTimer); state.peekPollTimer = null; }
      for (var i = 0; i < state.initTimers.length; i++) clearTimeout(state.initTimers[i]);
      state.initTimers = [];
      for (i = 0; i < state.cleanupFns.length; i++) safe(state.cleanupFns[i]);
      state.cleanupFns = [];
      state.rbTimer = null;
      if (state.host && state.host.parentNode) state.host.parentNode.removeChild(state.host);
      state.host = null; state.shadow = null; state.panel = null; state.header = null;
      state.titleEl = null; state.counter = null;
      state.btnSettings = null; state.btnRestart = null;
      state.btnCollapse = null; state.btnClose = null; state.settings = null;
      state.body = null; state.grip = null; state.progress = null; state.reopen = null;
      state.uiBlurOn = null; state.uiBlur = null; state.uiBlurVal = null;
      state.uiOpacity = null; state.uiOpacityVal = null; state.uiColor = null;
      state.uiThemeDark = null; state.uiThemeLight = null; state.uiThemeCustom = null;
      state.uiBgRow = null; state.uiAnchor = null; state.uiAnchorVal = null;
      state.uiFontAuto = null; state.uiFontCustom = null; state.uiFontSlider = null;
      state.uiFontVal = null; state.uiFontRow = null;
      state.uiRbAuto = null; state.uiRbCustom = null; state.uiRbRow = null;
      state.uiRbSize = null; state.uiRbSizeVal = null; state.uiRbColor = null;
      state.uiPosFree = null; state.uiPosEdge = null;
      state.uiGapRow = null; state.uiGapMinus = null; state.uiGapPlus = null;
      state.uiGapSlider = null; state.uiGapVal = null;
      state.uiFullEdgeRow = null; state.uiFullEdgeCb = null; state.uiPeekWrap = null;
      state.uiPeekMinus = null; state.uiPeekPlus = null; state.uiPeekSlider = null;
      state.uiPeekVal = null; state.uiSensRow = null; state.uiSensBtns = null;
      state.headings = [];
      unbindScrollSources();
      if (state.followTimer) { clearInterval(state.followTimer); state.followTimer = null; }
      state.headingSignature = '';
      state.peekHidden = false; state.peekShowLocked = false; state.peekExitSide = '';
      state.adjusting = false; state.settingsOpen = false; state.tocManualScrollUntil = 0;
      state.lastMX = -1; state.lastMY = -1; state.lastDX = 0; state.lastDY = 0;
    });
    if (window.__ftoc_destroy === destroy) delete window.__ftoc_destroy;
    window.__ftoc_running = false;
  }
  function restart() {
    destroy();
    setTimeout(function () { safe(init); }, 60);
  }

  /* ---------- 初始化 ---------- */
  function init() {
    safe(function () {
      window.__ftoc_running = true;
      window.__ftoc_destroy = destroy;
      buildUI();
      collectHeadings();
      bindScrollSources();
      startFollowTimer();
      renderTOC();
      applyAppearance();
      applyCollapsed(prefs.collapsed, true);
      applyClosed(prefs.closed);
      startObserver();
      hookHistory();
      constrainPanel();
      refreshBodyHeight();
      refreshBodyHeightDeferred();
      var t = setTimeout(function () { refreshBodyHeight(); }, 350);
      state.initTimers.push(t);
      updateActive();
      scheduleInitialScans();
      // 恢复完全贴边：刷新后悄悄藏好（闪光照常，提示耳朵位置）
      if (prefs.posMode === 'edge' && prefs.fullEdge && !prefs.collapsed && !prefs.closed) {
        state.peekHidden = true;
        var hx = hiddenLeftX();
        state.panel.style.left = Math.round(hx) + 'px';
        prefs.x = Math.round(hx);
        savePrefs();
      }
      setTimeout(function () {
        safe(function () {
          if (prefs.closed) flashEl(state.reopen);
          else flashEl(state.panel);
        });
      }, 150);
    });
  }

  init();
})();