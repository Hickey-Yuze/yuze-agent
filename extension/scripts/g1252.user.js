// ==UserScript==
// @name         划词助手
// @namespace    quick-search-drawer
// @description  选中文本后弹出工具栏
// @icon         https://api.iconify.design/material-symbols:travel-explore.svg?color=%233B82F6&width=64&height=64
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      translate.googleapis.com
// @connect      translate.google.com
// @run-at       document-idle
// ==/UserScript==

!function () {
  "use strict";
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (document.getElementById("__qs_root__")) return;

  const HTTPS = "https://";
  const PANEL_H = 48;
  const OFFSET_BELOW = 12;
  const Z_INDEX = 2147483647; 
  const WHEEL_MIN = 80;
  const EASE = 0.2;

  const KEY_BUTTONS = "__quick_search_buttons__";
  const KEY_ICON = "__quick_search_icon_cache__";
  const KEY_BOOKMARK = "__quick_search_bookmarks__";
  const ICON_TTL = 30 * 24 * 60 * 60 * 1e3;

  const GM_OK =
    typeof GM_getValue === "function" && typeof GM_setValue === "function";

  const SITE_ICON =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjM0I4MkY2Ij48cGF0aCBkPSJNMyAxOXEtLjQyNSAwLS43MTItLjI4OFQyIDE4dC4yODgtLjcxMlQzIDE3aDhxLjQyNSAwIC43MTMuMjg4VDEyIDE4dC0uMjg4LjcxM1QxMSAxOXptMC01cS0uNDI1IDAtLjcxMi0uMjg4VDIgMTN0LjI4OC0uNzEyVDMgMTJoM3EuNDI1IDAgLjcxMy4yODhUNyAxM3QtLjI4OC43MTNUNiAxNHptMC01cS0uNDI1IDAtLjcxMi0uMjg4VDIgOHQuMjg4LS43MTJUMyA3aDNxLjQyNSAwIC43MTMuMjg4VDcgOHQtLjI4OC43MTNUNiA5em0xMSA3cS0yLjA3NSAwLTMuNTM3LTEuNDYzVDkgMTF0MS40NjMtMy41MzdUMTQgNnQzLjUzOCAxLjQ2M1QxOSAxMXEwIC43MjUtLjIxMyAxLjQzOHQtLjYzNyAxLjMxMmwzLjE1IDMuMTVxLjI3NS4yNzUuMjc1LjcgdC0uMjc1Ljd0LS43LjI3NXQtLjctLjI3NWwtMy4xNS0zLjE1cS0uNi40MjUtMS4zMTIuNjM4VDE0IDE2bTAtMnExLjI1IDAgMi4xMjUtLjg3NVQxNyAxMXQtLjg3NS0yLjEyNVQxNCA4dC0yLjEyNS44NzVUMTEgMTF0Ljg3NSAyLjEyNVQxNCAxNCIvPjwvc3ZnPg==";

  const DEFAULT_ENGINES = [
    { t: "Google", u: HTTPS + "www.google.com/search?q={q}" },
    { t: "百度", u: HTTPS + "www.baidu.com/s?wd={q}" },
    { t: "Bing", u: HTTPS + "www.bing.com/search?q={q}" },
    { t: "GitHub", u: HTTPS + "github.com/search?q={q}" },
    { t: "维基百科", u: HTTPS + "zh.wikipedia.org/wiki/{q}" },
    { t: "B 站", u: HTTPS + "search.bilibili.com/all?keyword={q}" },
    { t: "豆瓣", u: HTTPS + "www.douban.com/search?q={q}" },
    {
      t: "Google翻译",
      u: HTTPS + "translate.google.com/?hl=zh-cn&sl=auto&tl=zh-CN&text={q}",
    },
    {
      t: "站内搜索",
      u: HTTPS + "www.google.com/search?q={q}+site:{domain}",
      i: SITE_ICON,
    },
  ];

  const REGEX_PRESETS = [
    { t: "电话", r: "1[3-9]\\d{9}" },
    { t: "中文", r: "[\\u4e00-\\u9fff]+" },
    { t: "英文", r: "[a-zA-Z]+" },
    { t: "数字", r: "\\d+\\.?\\d*" },
    { t: "邮箱", r: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}" },
    {
      t: "身份证",
      r: "[1-9]\\d{5}(19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]",
    },
  ];

  const UNIT_GROUPS = [
    {
      t: "长度",
      u: ["m (米)", "km (千米)", "cm (厘米)", "mm (毫米)", "mi (英里)", "ft (英尺)", "in (英寸)", "yd (码)"],
      f: [1, 1e3, 0.01, 0.001, 1609.344, 0.3048, 0.0254, 0.9144],
    },
    {
      t: "重量",
      u: ["kg (千克)", "g (克)", "mg (毫克)", "lb (磅)", "oz (盎司)", "t (吨)"],
      f: [1, 0.001, 1e-6, 0.453592, 0.0283495, 1e3],
    },
    { t: "温度", u: ["℃ (摄氏度)", "℉ (华氏度)", "K (开尔文)"], special: true },
    {
      t: "面积",
      u: ["m² (平方米)", "km² (平方千米)", "cm² (平方厘米)", "ha (公顷)", "acre (英亩)", "ft² (平方英尺)"],
      f: [1, 1e6, 1e-4, 1e4, 4046.86, 0.092903],
    },
    {
      t: "体积",
      u: ["L (升)", "mL (毫升)", "m³ (立方米)", "gal (加仑)", "ft³ (立方英尺)"],
      f: [1, 0.001, 1e3, 3.78541, 28.3168],
    },
    {
      t: "速度",
      u: ["m/s (米每秒)", "km/h (千米每小时)", "mph (英里每小时)", "knot (节)"],
      f: [1, 0.277778, 0.44704, 0.514444],
    },
    {
      t: "数据",
      u: ["B (字节)", "KB (千字节)", "MB (兆字节)", "GB (吉字节)", "TB (太字节)", "PB (拍字节)"],
      f: [1, 1024, 1048576, 1073741824, 1099511627776, 1125899906842624],
    },
  ];

  function svgEl(tag, attrs) {
    const n = document.createElementNS("http://www.w3.org/2000/svg", tag);
    if (attrs) Object.keys(attrs).forEach((k) => n.setAttribute(k, attrs[k]));
    return n;
  }

  function icon(size, parts, extra) {
    const s = svgEl(
      "svg",
      Object.assign(
        {
          width: size,
          height: size,
          viewBox: "0 0 24 24",
          fill: "none",
          stroke: "currentColor",
          "stroke-width": "2",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
        },
        extra || {}
      )
    );
    s.style.pointerEvents = "none";
    parts.forEach((p) => s.appendChild(svgEl(p[0], p[1])));
    return s;
  }

  const icoClose = () =>
    icon(14, [["line", { x1: "18", y1: "6", x2: "6", y2: "18" }], ["line", { x1: "6", y1: "6", x2: "18", y2: "18" }]], { "stroke-width": "2.5" });
  const icoPlus = () =>
    icon(13, [["line", { x1: "12", y1: "5", x2: "12", y2: "19" }], ["line", { x1: "5", y1: "12", x2: "19", y2: "12" }]], { "stroke-width": "2.5" });
  const icoBookmark = () =>
    icon(18, [["path", { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }]]);
  const icoPencil = () =>
    icon(18, [
      ["path", { d: "M12 20h9" }],
      ["path", { d: "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" }],
    ]);
  const icoCode = () =>
    icon(16, [
      ["polyline", { points: "16 18 22 12 16 6" }],
      ["polyline", { points: "8 6 2 12 8 18" }],
    ]);
  const icoTranslate = () =>
    icon(18, [
      ["path", { d: "m5 8 6 6" }],
      ["path", { d: "m4 14 6-6 2-3" }],
      ["path", { d: "M2 5h12" }],
      ["path", { d: "M7 2h1" }],
      ["path", { d: "m22 22-5-5" }],
      ["circle", { cx: "17", cy: "17", r: "5" }],
    ]);
  const icoSpeaker = () =>
    icon(14, [
      ["polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }],
      ["path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }],
      ["path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }],
    ]);
  const icoCharCount = () =>
    icon(16, [
      ["line", { x1: "4", y1: "9", x2: "20", y2: "9" }],
      ["line", { x1: "4", y1: "15", x2: "20", y2: "15" }],
      ["line", { x1: "10", y1: "3", x2: "8", y2: "21" }],
      ["line", { x1: "16", y1: "3", x2: "14", y2: "21" }],
    ]);
  const icoRegex = () =>
    icon(16, [["polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" }]]);
  const icoBase = () =>
    icon(16, [
      ["path", { d: "M4 4h6v6H4z" }],
      ["path", { d: "M14 4h6v6h-6z" }],
      ["path", { d: "M4 14h6v6H4z" }],
      ["circle", { cx: "17", cy: "17", r: "3" }],
    ]);
  const icoUnit = () =>
    icon(16, [
      ["polyline", { points: "17 1 21 5 17 9" }],
      ["path", { d: "M3 11V9a4 4 0 0 1 4-4h14" }],
      ["polyline", { points: "7 23 3 19 7 15" }],
      ["path", { d: "M21 13v2a4 4 0 0 1-4 4H3" }],
    ]);
  const icoTextClean = () =>
    icon(16, [
      ["path", { d: "M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" }],
      ["polyline", { points: "14 2 14 8 20 8" }],
      ["line", { x1: "16", y1: "13", x2: "8", y2: "13" }],
      ["line", { x1: "16", y1: "17", x2: "8", y2: "17" }],
      ["line", { x1: "10", y1: "9", x2: "8", y2: "9" }],
    ]);
  const icoTools = () =>
    icon(18, [
      ["path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }],
    ]);
  const icoChevron = () =>
    icon(14, [["polyline", { points: "6 9 12 15 18 9" }]], { "stroke-width": "2.5" });
  const icoBmBig = () => {
    const s = svgEl("svg", { width: "48", height: "48", viewBox: "0 0 24 24", fill: "#3b82f6", stroke: "none" });
    s.style.pointerEvents = "none";
    s.appendChild(svgEl("path", { d: "M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" }));
    return s;
  };
  const icoRadio = (on) => {
    const s = svgEl("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "2" });
    s.style.pointerEvents = "none";
    s.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "10" }));
    if (on) s.appendChild(svgEl("circle", { cx: "12", cy: "12", r: "5", fill: "currentColor", stroke: "none" }));
    return s;
  };

  function el(tag, attrs, text) {
    const o = document.createElement(tag);
    if (attrs)
      Object.keys(attrs).forEach((k) => {
        const v = attrs[k];
        if (k === "style" && typeof v === "object") Object.assign(o.style, v);
        else if (k === "dataset" && typeof v === "object")
          Object.keys(v).forEach((d) => (o.dataset[d] = v[d]));
        else if (k in o) {
          try { o[k] = v; } catch (e) { o.setAttribute(k, v); }
        } else o.setAttribute(k, v);
      });
    if (typeof text === "string") o.textContent = text;
    return o;
  }
  const clear = (n) => n.replaceChildren();
  function bmLoad() {
    try {
      if (GM_OK) return JSON.parse(GM_getValue(KEY_BOOKMARK, "{}"));
      return JSON.parse(localStorage.getItem("__qs_bm__") || "{}");
    } catch (e) { return {}; }
  }
  function bmSave(o) {
    try {
      if (GM_OK) { GM_setValue(KEY_BOOKMARK, JSON.stringify(o)); return; }
      localStorage.setItem("__qs_bm__", JSON.stringify(o));
    } catch (e) {}
  }
  function curHref() { try { return location.href; } catch (e) { return ""; } }
  function bmHas() { return !!bmLoad()[curHref()]; }
  function bmAdd(text) {
    const o = bmLoad();
    o[curHref()] = { y: window.scrollY, text: (text || "").slice(0, 200) };
    bmSave(o); bmPop(); bmRefreshBtn();
  }
  function bmDel() {
    const o = bmLoad();
    delete o[curHref()];
    bmSave(o); bmPop(); bmRefreshBtn();
  }
  function bmRestore() {
    const it = bmLoad()[curHref()];
    if (!it) return;
    const y = typeof it === "number" ? it : it.y;
    const text = typeof it === "object" ? it.text : "";
    if (typeof y !== "number") return;
    let tries = 0;
    (function loop() {
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (y <= max || ++tries >= 20) {
        window.scrollTo(0, Math.min(y, max));
        if (text) setTimeout(() => bmFlash(text), 300);
        return;
      }
      requestAnimationFrame(loop);
    })();
  }
  function bmFlash(text) {
    if (!text) return;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let n;
    while ((n = w.nextNode())) {
      const i = n.textContent.indexOf(text);
      if (i >= 0) {
        try {
          const r = document.createRange();
          r.setStart(n, i); r.setEnd(n, i + text.length);
          const m = document.createElement("mark");
          m.className = "qs-bm-flash";
          r.surroundContents(m);
          m.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            const p = m.parentNode;
            if (p) { while (m.firstChild) p.insertBefore(m.firstChild, m); p.removeChild(m); }
          }, 3e3);
        } catch (e) {}
        return;
      }
    }
  }
  function bmPop() {
    const d = document.createElement("div");
    d.style.cssText =
      "position:fixed!important;left:20px!important;top:50%!important;transform:translateY(-50%)!important;z-index:2147483647!important;pointer-events:none!important;animation:qs-bm-pop .6s ease-out forwards!important";
    d.appendChild(icoBmBig());
    (document.body || document.documentElement).appendChild(d);
    setTimeout(() => d.parentNode && d.parentNode.removeChild(d), 900);
  }
  function bmRefreshBtn() {
    if (!body) return;
    body.querySelectorAll(".__qs_btn__").forEach((b) => {
      if (b.dataset.qsType === "bookmark") {
        const has = bmHas();
        b.title = has ? "清除书签" : "书签";
        b.dataset.qsBookmarked = has ? "1" : "0";
      }
    });
  }
  function highlight() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const r = sel.getRangeAt(0);
    if (r && !r.collapsed) { wrapMark(r); sel.removeAllRanges(); }
  }
  function wrapMark(r) {
    try {
      const m = document.createElement("mark");
      m.className = "qs-hl";
      r.surroundContents(m);
    } catch (e) {
      try {
        const frag = r.extractContents();
        const m = document.createElement("mark");
        m.className = "qs-hl";
        m.appendChild(frag);
        r.insertNode(m);
      } catch (e2) {}
    }
  }
  function ensureHlStyle() {
    const dark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const css = dark
      ? "mark.qs-hl{background:#06B6D4!important;color:#0F172A!important;border-radius:2px!important;padding:0 1px!important}"
      : "mark.qs-hl{background:#FDE68A!important;color:#1e293b!important;border-radius:2px!important;padding:0 1px!important}";
    let s = document.getElementById("__qs_hl_style__");
    if (!s) {
      s = document.createElement("style");
      s.id = "__qs_hl_style__";
      (document.head || document.documentElement).appendChild(s);
    }
    s.textContent = css;
  }
  function normBtn(o, idx) {
    const n = o || {};
    return {
      type: String(n.type || "urlSearch").trim(),
      t: String(n.t || n.title || n.n || n.name || "按钮" + (idx + 1)).trim(),
      u: String(n.u || n.url || "").trim(),
      code: String(n.code || "").trim(),
      i: String(n.i || n.icon || "").trim(),
    };
  }
  function normList(a) {
    return Array.isArray(a) && a.length
      ? a.map((x, i) => normBtn(x, i)).filter((x) => x && x.t)
      : [];
  }
  function loadButtons() {
    try {
      if (!GM_OK)
        return DEFAULT_ENGINES.filter((_, i) => i !== 1 && i !== 7).map((x, i) => normBtn(x, i));
      const s = GM_getValue(KEY_BUTTONS, "");
      return s ? normList(JSON.parse(s)) : [];
    } catch (e) {
      return GM_OK ? [] : DEFAULT_ENGINES.filter((_, i) => i !== 1 && i !== 7).map((x, i) => normBtn(x, i));
    }
  }
  function saveButtons(a) {
    try { if (GM_OK) GM_setValue(KEY_BUTTONS, JSON.stringify(normList(a))); } catch (e) {}
  }
  let iconCache = {};
  const memCache = {};
  function iconLoad() {
    try {
      if (!GM_OK) return;
      const s = GM_getValue(KEY_ICON, "");
      if (s) iconCache = JSON.parse(s);
    } catch (e) { iconCache = {}; }
  }
  function iconStore() {
    try { if (GM_OK) GM_setValue(KEY_ICON, JSON.stringify(iconCache)); } catch (e) {}
  }
  function iconGet(host) {
    const store = GM_OK ? iconCache : memCache;
    const c = store[host];
    if (!c) return null;
    if (Date.now() - c.ts > ICON_TTL) { delete store[host]; return null; }
    return c.url;
  }
  function iconPut(host, url) {
    (GM_OK ? iconCache : memCache)[host] = { url, ts: Date.now() };
    if (GM_OK) iconStore();
  }
  function hostOf(u) {
    try {
      let s = String(u || "").trim();
      if (!/^https?:\/\//i.test(s)) s = HTTPS + s;
      return new URL(s).hostname || "";
    } catch (e) { return ""; }
  }
  function fetchFavicon(host, cb) {
    const srcs = [
      "https://www.google.com/s2/favicons?domain=" + encodeURIComponent(host) + "&sz=64",
      "https://icons.duckduckgo.com/ip3/" + host + ".ico",
      "https://icon.horse/icon/" + host,
    ];
    let i = 0;
    (function tryNext() {
      if (i >= srcs.length) { iconPut(host, ""); cb(null); return; }
      const url = srcs[i++], img = new Image();
      let done = false;
      const to = setTimeout(() => { if (!done) { done = true; img.src = ""; tryNext(); } }, 4e3);
      img.onload = () => { if (!done) { done = true; clearTimeout(to); iconPut(host, url); cb(url); } };
      img.onerror = () => { if (!done) { done = true; clearTimeout(to); tryNext(); } };
      img.src = url;
    })();
  }
  function resolveIcon(host, cb) {
    if (!host) { cb(null); return; }
    const c = iconGet(host);
    if (c !== null) { cb(c || null); return; }
    const run = () =>
      typeof requestIdleCallback === "function"
        ? requestIdleCallback(() => fetchFavicon(host, cb), { timeout: 3e3 })
        : setTimeout(() => fetchFavicon(host, cb), 100);
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run, { once: true });
  }
  function paintIcon(box, fallbackTxt, url, cls) {
    Array.from(box.children).forEach((c) => {
      if (c.tagName === "IMG" || c.classList.contains("__qs_cico_fallback__")) c.remove();
    });
    if (!url) {
      if (!box.querySelector(".__qs_cico_fallback__"))
        box.appendChild(el("span", { className: "__qs_cico_fallback__" }, fallbackTxt));
      return;
    }
    const img = document.createElement("img");
    if (cls) img.className = cls;
    img.alt = fallbackTxt;
    img.onerror = () => {
      img.remove();
      if (!box.querySelector(".__qs_cico_fallback__"))
        box.appendChild(el("span", { className: "__qs_cico_fallback__" }, fallbackTxt));
    };
    img.src = url;
    box.appendChild(img);
  }
  function setButtonIcon(box, btn, cls) {
    const fb = (btn.t || "?").slice(0, 2);
    if (btn.i) { paintIcon(box, fb, btn.i, cls); return; }
    const host = hostOf(btn.u);
    if (!host) { paintIcon(box, fb, null, cls); return; }
    const c = iconGet(host);
    if (c !== null) { paintIcon(box, fb, c || null, cls); return; }
    paintIcon(box, fb, null, cls);
    resolveIcon(host, (u) => box.isConnected && paintIcon(box, fb, u, cls));
  }

  let panelVisible = false, hideTimer = null;
  let editMode = false, longPressTimer = null, longPressed = false, dragging = false;
  let dragIdx = -1, dragSilent = false;
  let scrollTarget = 0, scrollRAF = 0;
  let menuDir = "below";
  let audio = null;

  let root, panel, body, toggleBtn;
  let editModal = null, toolMenu = null, transPanel = null, genericPanel = null;
  const STATE = { buttons: [] };

  function selText() {
    try { return String(window.getSelection && window.getSelection().toString() || "").trim(); }
    catch (e) { return ""; }
  }
  function buildUrl(btn, q) {
    const tmpl = String(btn.u || "");
    const eq = encodeURIComponent(q || "");
    const eu = encodeURIComponent(location.href || "");
    let ed = "";
    try { ed = encodeURIComponent(new URL(location.href).hostname); } catch (e) {}
    return tmpl.replace(/\{q\}/g, eq).replace(/\{url\}/g, eu).replace(/\{domain\}/g, ed);
  }

  function dispatch(btn, ev) {
    ev.preventDefault();
    ev.stopPropagation();
    switch (btn.type) {
      case "highlight": return highlight();
      case "bookmark": return bmHas() ? bmDel() : bmAdd(selText());
      case "customJS":
        try { new Function(btn.code || "")(); }
        catch (e) { alert("JS执行错误：" + e.message); }
        return;
      case "translate": return doTranslate();
      case "charCount": return doCharCount();
      case "regexFilter": return doRegex();
      case "baseConvert": return doBase();
      case "unitConvert": return doUnit();
      case "textClean": return doTextClean();
    }
    const q = selText();
    if (!q) return;
    const url = buildUrl(btn, q);
    if (!url || url === btn.u) { alert("URL模板无效，请在编辑中检查。"); return; }
    window.open(url, "_blank", "noopener");
  }

  function makeButton(btn, idx) {
    const b = el("button", {
      className: "__qs_btn__",
      type: "button",
      title: btn.t,
      dataset: { qsType: btn.type, qsIdx: String(idx) },
    });
    if (btn.type === "highlight") b.appendChild(icoPencil());
    else if (btn.type === "bookmark") {
      const has = bmHas();
      b.title = has ? "清除书签" : "书签";
      b.dataset.qsBookmarked = has ? "1" : "0";
      b.appendChild(icoBookmark());
    } else if (btn.type === "customJS")
      btn.i ? setButtonIcon(b, btn, "__qs_icon__") : b.appendChild(icoCode());
    else if (btn.type === "translate") b.appendChild(icoTranslate());
    else if (btn.type === "charCount") b.appendChild(icoCharCount());
    else if (btn.type === "regexFilter") b.appendChild(icoRegex());
    else if (btn.type === "baseConvert") b.appendChild(icoBase());
    else if (btn.type === "unitConvert") b.appendChild(icoUnit());
    else if (btn.type === "textClean") b.appendChild(icoTextClean());
    else setButtonIcon(b, btn, "__qs_icon__");

    b.addEventListener("mousedown", (e) => {
      e.preventDefault(); e.stopPropagation();
      if (GM_OK && !editMode) {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        longPressTimer = setTimeout(() => {
          longPressTimer = null; longPressed = true; enterEdit();
        }, 600);
      }
    });
    const clearLP = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    b.addEventListener("mouseup", clearLP);
    b.addEventListener("mouseleave", clearLP);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (dragging) return;
      if (longPressed) { longPressed = false; return; }
      if (editMode) { openEditor(idx); return; }
      clearLP();
      dispatch(btn, e);
    });
    return b;
  }

  function renderButtons() {
    if (!body) return;
    clear(body);
    if (!GM_OK) addToolsEntry();
    STATE.buttons.forEach((btn, i) => body.appendChild(makeButton(btn, i)));
    if (GM_OK) addPlusBtn();
    updateToggle();
  }

  function addPlusBtn() {
    if (!body) return;
    const old = body.querySelector(".__qs_btn__[data-qs-plus]");
    if (old) old.remove();
    const b = el("button", {
      className: "__qs_btn__",
      type: "button",
      title: "添加按钮",
      dataset: { qsPlus: "1" },
    });
    b.style.background = "rgba(59,130,246,.08)";
    b.style.color = "#3b82f6";
    b.appendChild(icoPlus());
    b.addEventListener("mousedown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); if (!editMode) openEditor(-1); });
    body.appendChild(b);
  }
  function addToolsEntry() {
    if (!body) return;
    const old = body.querySelector(".__qs_btn__[data-qs-tools]");
    if (old) old.remove();
    const b = el("button", {
      className: "__qs_btn__",
      type: "button",
      title: "工具",
      dataset: { qsTools: "1" },
    });
    b.appendChild(icoTools());
    b.addEventListener("mousedown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); openToolMenu(e); });
    body.appendChild(b);
  }

  function buildPanel() {
    root = el("div", { id: "__qs_root__" });
    panel = el("div", { id: "__qs_panel__" });
    body = el("div", { id: "__qs_body__" });
    panel.appendChild(body);

    toggleBtn = el("button", { className: "__qs_toggle_btn__", type: "button", title: "展开" });
    toggleBtn.appendChild(icoChevron());
    toggleBtn.addEventListener("mousedown", (e) => { e.preventDefault(); e.stopPropagation(); });
    toggleBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleExpand(); });
    panel.appendChild(toggleBtn);

    root.appendChild(panel);
    (document.body || document.documentElement).appendChild(root);
    renderButtons();

    panel.addEventListener("wheel", (e) => {
      if (panel.classList.contains("qs-expanded")) return;
      const dy = Math.abs(e.deltaY);
      if (dy > Math.abs(e.deltaX)) {
        e.preventDefault();
        scrollPanelX((e.deltaY > 0 ? 1 : -1) * Math.max(WHEEL_MIN, dy));
      }
    }, { passive: false });
  }

  function toggleExpand() {
    if (!panel || !body || !toggleBtn) return;
    const exp = panel.classList.toggle("qs-expanded");
    toggleBtn.title = exp ? "收起" : "展开";
    updateToggle();
  }
  function updateToggle() {
    if (!toggleBtn || !body || !panel) return;
    void body.offsetHeight;
    if (panel.classList.contains("qs-expanded")) {
      toggleBtn.style.setProperty("display", "flex", "important");
      body.classList.toggle("qs-overflow", body.scrollHeight > body.clientHeight + 2);
    } else {
      const kids = body.children;
      let w = 0;
      for (let i = 0; i < kids.length; i++) w += kids[i].offsetWidth;
      if (kids.length > 1) w += (kids.length - 1) * 2;
      w += 10;
      const maxW = parseInt(getComputedStyle(body).maxWidth) || 320;
      toggleBtn.style.setProperty("display", w >= maxW ? "flex" : "none", "important");
      body.classList.remove("qs-overflow");
    }
  }

  function showPanel(x, y) {
    if (!panel || panelVisible) return;
    clearTimeout(hideTimer);
    panel.style.visibility = "hidden";
    panel.classList.add("qs-visible");
    const w = panel.offsetWidth || 400;
    panel.style.visibility = "";
    const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const left = Math.max(8, Math.min(x - w / 2, docW - w - 8));
    panel.style.left = left + "px";
    panel.style.top = Math.max(8, y + OFFSET_BELOW) + "px";
    panel.style.setProperty("pointer-events", "auto", "important");
    panelVisible = true;
    requestAnimationFrame(() => requestAnimationFrame(updateToggle));
  }
  function hidePanel(now) {
    if (!panel) return;
    panelVisible = false;
    panel.style.setProperty("pointer-events", "none", "important");
    if (now) { panel.classList.remove("qs-visible"); return; }
    hideTimer = setTimeout(() => panel && panel.classList.remove("qs-visible"), 120);
  }

  function scrollPanelX(delta) {
    if (!body) return;
    const max = Math.max(0, body.scrollWidth - body.clientWidth);
    scrollTarget = Math.max(0, Math.min(body.scrollLeft + delta, max));
    if (scrollRAF) return;
    const step = () => {
      if (!body) { scrollRAF = 0; return; }
      const m = Math.max(0, body.scrollWidth - body.clientWidth);
      scrollTarget = Math.max(0, Math.min(scrollTarget, m));
      const diff = scrollTarget - body.scrollLeft;
      if (Math.abs(diff) < 0.5) { body.scrollLeft = scrollTarget; scrollRAF = 0; return; }
      body.scrollLeft += diff * EASE;
      scrollRAF = requestAnimationFrame(step);
    };
    scrollRAF = requestAnimationFrame(step);
  }

  let editState = { mode: "add", idx: -1, selType: "urlSearch" };

  const TOOL_TILES = [
    ["highlight", "高亮文字", icoPencil, "高亮文本，用背景色标记重点内容"],
    ["bookmark", "标记书签", icoBookmark, "将当前选中文本和滚动位置保存为书签，下次访问时自动滚动并闪烁提示"],
    ["translate", "翻译文字", icoTranslate, "谷歌翻译选中文本，支持中英互译和朗读"],
    ["charCount", "字符数", icoCharCount, "统计选中文本的字符数、单词/汉字数、数字数"],
    ["regexFilter", "正则筛选", icoRegex, "用正则表达式筛选选中文本，内置电话/邮箱/身份证等预设"],
    ["baseConvert", "进制转换", icoBase, "2/8/10/16 进制互相转换"],
    ["unitConvert", "单位", icoUnit, "长度/重量/温度/面积/体积/速度/数据单位转换"],
    ["textClean", "文本处理", icoTextClean, "去空行/空格、段落去重/词语去重、编解码，并附时间戳转换"],
    ["customJS", "JS", icoCode, "自定义 JS 代码按钮，点击执行任意 JavaScript"],
  ];
  const SINGLE_TYPES = ["highlight", "bookmark", "translate", "charCount", "regexFilter", "baseConvert", "unitConvert", "textClean"];

  function buildEditor() {
    if (editModal) return;
    editModal = el("div", { id: "__qs_ep_mask__" });
    const modal = el("div", { id: "__qs_ep_modal__" });

    const head = el("div", { id: "__qs_ep_head__" });
    const title = el("div", { id: "__qs_ep_title__" }, "编辑按钮");
    const close = el("button", { id: "__qs_ep_close__", type: "button", title: "关闭" });
    close.appendChild(icoClose());
    head.appendChild(title); head.appendChild(close);

    const bodyEl = el("div", { id: "__qs_ep_body__" });

    const secUrl = el("div", { id: "__qs_ep_sec_url__" });
    const rowUrl = el("div", { id: "__qs_ep_row_url__" });
    const radioUrl = el("button", { className: "__qs_ep_radio__", type: "button", dataset: { qsType: "urlSearch" } });
    radioUrl.appendChild(icoRadio(true));
    radioUrl.appendChild(document.createTextNode("URL"));
    const inpName = el("input", { className: "__qs_ep_inp__", type: "text", placeholder: "名称" });
    const inpUrl = el("input", { className: "__qs_ep_inp__", type: "text", placeholder: "URL" });
    rowUrl.appendChild(radioUrl); rowUrl.appendChild(inpName); rowUrl.appendChild(inpUrl);
    const hint = el("div", { className: "__qs_ep_hint__" }, "可用变量：{q}=选中文字  {url}=当前页面URL  {domain}=当前域名");
    secUrl.appendChild(rowUrl); secUrl.appendChild(hint);

    const secTool = el("div", { id: "__qs_ep_sec_tool__" });
    secTool.appendChild(el("div", { className: "__qs_ep_lbl__" }, "工具预设"));
    const grid = el("div", { className: "__qs_ep_tile_grid__" });
    const tileMap = {};
    TOOL_TILES.forEach(([type, label, ic, tip]) => {
      const tile = el("button", { className: "__qs_ep_tile__", type: "button", title: tip || label, dataset: { qsType: type } });
      if (ic) tile.appendChild(ic());
      tile.appendChild(el("span", { className: "__qs_ep_tile_lbl__" }, label));
      grid.appendChild(tile);
      tileMap[type] = tile;
      attachTip(tile);
      tile.addEventListener("click", () => { editState.selType = type; refreshEditor(); });
    });
    secTool.appendChild(grid);

    const jsFields = el("div", { id: "__qs_ep_js_fields__", style: { display: "none", flexDirection: "column", gap: "6px", paddingLeft: "28px" } });
    const inpJsName = el("input", { className: "__qs_ep_inp__", type: "text", placeholder: "按钮名称" });
    const inpJsIcon = el("input", { className: "__qs_ep_inp__", type: "text", placeholder: "图标 URL（可选）" });
    const inpJsCode = el("textarea", { id: "__qs_ep_textarea__", placeholder: "输入要执行的 JS 代码..." });
    jsFields.appendChild(inpJsName); jsFields.appendChild(inpJsIcon); jsFields.appendChild(inpJsCode);
    secTool.appendChild(jsFields);

    bodyEl.appendChild(secUrl); bodyEl.appendChild(secTool);

    const foot = el("div", { id: "__qs_ep_foot__" });
    const cancel = el("button", { className: "__qs_ep_cancel__", type: "button" }, "取消");
    const save = el("button", { className: "__qs_ep_save__", type: "button" }, "保存");
    foot.appendChild(cancel); foot.appendChild(save);

    modal.appendChild(head); modal.appendChild(bodyEl); modal.appendChild(foot);
    editModal.appendChild(modal);
    (document.body || document.documentElement).appendChild(editModal);

    editModal._refs = { radioUrl, tileMap, inpName, inpUrl, inpJsName, inpJsIcon, inpJsCode, jsFields };

    radioUrl.addEventListener("click", () => { editState.selType = "urlSearch"; refreshEditor(); });
    close.addEventListener("click", closeEditor);
    cancel.addEventListener("click", closeEditor);
    editModal.addEventListener("click", (e) => { if (e.target === editModal) closeEditor(); });
    editModal.addEventListener("mousedown", (e) => e.stopPropagation());

    save.addEventListener("click", () => {
      const type = editState.selType;
      let btn;
      if (type === "urlSearch") {
        const t = String(inpName.value || "").trim();
        const u = String(inpUrl.value || "").trim();
        if (!t || !u) return alert("请填写名称和URL模板");
        btn = normBtn({ type, t, u }, 0);
      } else if (type === "customJS") {
        const t = String(inpJsName.value || "").trim();
        const code = String(inpJsCode.value || "").trim();
        const i = String(inpJsIcon.value || "").trim();
        if (!t || !code) return alert("请填写按钮名称和JS代码");
        btn = normBtn({ type, t, code, i }, 0);
      } else {
        const labels = {
          highlight: "高亮", bookmark: "标记书签", translate: "翻译",
          charCount: "字符数", regexFilter: "正则筛选", baseConvert: "进制转换",
          unitConvert: "单位转换", textClean: "文本处理",
        };
        btn = normBtn({ type, t: labels[type] || type }, 0);
      }
      if (!btn) return;
      if (editState.mode === "add" || editState.idx < 0) STATE.buttons.push(btn);
      else STATE.buttons[editState.idx] = btn;
      saveButtons(STATE.buttons);
      renderButtons();
      closeEditor();
    });
  }

  function refreshEditor() {
    const r = editModal._refs, type = editState.selType;
    const others = STATE.buttons.filter((_, i) => i !== editState.idx);
    const old = r.radioUrl.querySelector("svg");
    if (old) { r.radioUrl.removeChild(old); r.radioUrl.insertBefore(icoRadio(type === "urlSearch"), r.radioUrl.firstChild); }
    Object.keys(r.tileMap).forEach((tp) => {
      const tile = r.tileMap[tp];
      tile.classList.toggle("qs-tile-active", type === tp);
      const used = SINGLE_TYPES.indexOf(tp) >= 0 && others.some((b) => b.type === tp);
      tile.style.opacity = used ? ".35" : "1";
      tile.style.pointerEvents = used ? "none" : "auto";
      tile.title = used ? "已被其他按钮使用" : "";
    });
    r.jsFields.style.display = type === "customJS" ? "flex" : "none";
  }

  function openEditor(idx) {
    if (!editModal) buildEditor();
    if (!editModal) return;
    exitEdit();
    const r = editModal._refs;
    if (idx >= 0 && idx < STATE.buttons.length) {
      editState = { mode: "edit", idx, selType: STATE.buttons[idx].type };
      const b = STATE.buttons[idx];
      r.inpName.value = b.type === "urlSearch" ? b.t : "";
      r.inpUrl.value = b.type === "urlSearch" ? b.u : "";
      r.inpJsName.value = b.type === "customJS" ? b.t : "";
      r.inpJsIcon.value = (b.type === "customJS" && b.i) || "";
      r.inpJsCode.value = b.type === "customJS" ? b.code : "";
    } else {
      editState = { mode: "add", idx: -1, selType: "urlSearch" };
      r.inpName.value = r.inpUrl.value = r.inpJsName.value = r.inpJsIcon.value = r.inpJsCode.value = "";
    }
    refreshEditor();
    editModal.style.setProperty("display", "flex", "important");
  }
  function closeEditor() {
    if (editModal) editModal.style.setProperty("display", "none", "important");
  }

  function attachTip(tile) {
    let tip = null;
    tile.addEventListener("mouseenter", () => {
      const txt = tile.title;
      if (!txt) return;
      const exist = document.querySelector(".__qs_tile_tip__");
      if (exist) exist.remove();
      tip = document.createElement("div");
      tip.className = "__qs_tile_tip__";
      tip.textContent = txt;
      document.body.appendChild(tip);
      const r = tile.getBoundingClientRect(), tr = tip.getBoundingClientRect();
      tip.style.left = Math.max(4, Math.min(r.left + r.width / 2 - tr.width / 2, innerWidth - tr.width - 4)) + "px";
      tip.style.top = Math.max(4, r.top - tr.height - 8) + "px";
      requestAnimationFrame(() => tip && tip.classList.add("qs-tip-show"));
    });
    tile.addEventListener("mouseleave", () => { if (tip) { tip.remove(); tip = null; } });
  }

  function buildToolMenu() {
    if (toolMenu) return;
    toolMenu = el("div", { id: "__qs_tool_menu__" });
    const add = (ic, txt, fn) => {
      const b = el("button", { className: "qs-tool-item", type: "button" });
      b.appendChild(ic());
      b.appendChild(document.createTextNode(txt));
      b.dataset.qsToolFn = txt;
      b.addEventListener("mousedown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); closeToolMenu(); });
      toolMenu.appendChild(b);
    };
    add(icoPencil, "高亮文字", highlight);
    add(icoBookmark, "标记书签", () => (bmHas() ? bmDel() : bmAdd(selText())));
    add(icoTranslate, "翻译文字", doTranslate);
    add(icoTextClean, "文本处理", doTextClean);
    add(icoCharCount, "字符数", doCharCount);
    add(icoRegex, "正则筛选", doRegex);
    add(icoBase, "进制转换", doBase);
    add(icoUnit, "单位换算", doUnit);
    (document.body || document.documentElement).appendChild(toolMenu);
    toolMenu.addEventListener("mousedown", (e) => e.stopPropagation());
  }
  function openToolMenu(ev) {
    if (!toolMenu) buildToolMenu();
    if (!toolMenu) return;
    if (toolMenu.style.display === "flex") { closeToolMenu(); return; }
    toolMenu.querySelectorAll(".qs-tool-item").forEach((b) => {
      if (b.dataset.qsToolFn === "标记书签" || b.dataset.qsToolFn === "清除书签") {
        const has = bmHas();
        const node = b.childNodes[b.childNodes.length - 1];
        if (node) node.textContent = has ? "清除书签" : "标记书签";
        b.dataset.qsToolFn = has ? "清除书签" : "标记书签";
      }
    });
    const r = ev && ev.target ? ev.target.getBoundingClientRect() : { left: 0, top: 0, bottom: 0 };
    const sx = window.scrollX || 0, sy = window.scrollY || 0, vw = window.innerWidth;
    toolMenu.style.visibility = "hidden";
    toolMenu.style.display = "flex";
    const mr = toolMenu.getBoundingClientRect();
    const below = r.bottom + sy + 6;
    const above = r.top + sy - mr.height - 6;
    const openAbove = !(below + mr.height + 8 < window.innerHeight + sy);
    menuDir = openAbove ? "above" : "below";
    toolMenu.style.left = Math.max(8, Math.min(r.left + sx, vw - mr.width - 8)) + "px";
    toolMenu.style.top = (openAbove ? Math.max(8, above) : below) + "px";
    toolMenu.style.visibility = "";
  }
  function closeToolMenu() { if (toolMenu) toolMenu.style.display = "none"; }

  function speak(text, lang, btn) {
    if (!text) return;
    if (audio) { audio.pause(); audio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (btn) btn.style.color = "#3b82f6";
    let fell = false;
    const reset = () => { if (btn) btn.style.color = ""; };
    const fallback = () => {
      if (fell) return;
      fell = true; audio = null;
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = lang; u.onend = reset; u.onerror = reset;
        window.speechSynthesis.speak(u);
      } else reset();
    };
    const url = "https://translate.google.com/translate_tts?ie=UTF-8&client=gtx&tl=" + encodeURIComponent(lang) + "&q=" + encodeURIComponent(text.slice(0, 200));
    try {
      const a = new Audio(url);
      audio = a;
      a.onended = reset; a.onerror = fallback;
      a.play().catch(fallback);
    } catch (e) { reset(); }
  }

  function buildTransPanel() {
    if (transPanel) return;
    transPanel = el("div", { id: "__qs_tp__", tabIndex: "-1" });
    const head = el("div", { id: "__qs_tp_head__" });
    head.appendChild(el("span", { id: "__qs_tp_title__" }, "翻译"));
    const actions = el("div", { id: "__qs_tp_actions__" });
    const close = el("button", { id: "__qs_tp_close__", type: "button" });
    close.appendChild(icoClose());
    actions.appendChild(close); head.appendChild(actions);

    const bodyEl = el("div", { id: "__qs_tp_body__" });
    const mkRow = (label) => {
      const row = el("div", { className: "__qs_tp_row__" });
      const info = el("div", { className: "__qs_tp_info__" });
      info.appendChild(el("div", { className: "__qs_tp_label__" }, label));
      const spk = el("button", { className: "__qs_tp_speak__", type: "button", title: "朗读" });
      spk.appendChild(icoSpeaker());
      info.appendChild(spk);
      const txt = el("div", { className: "__qs_tp_text__" });
      row.appendChild(info); row.appendChild(txt);
      return { row, spk, txt };
    };
    const src = mkRow("原文"), tgt = mkRow("译文");
    const loading = el("div", { className: "__qs_tp_loading__", style: { display: "none" } }, "翻译中...");
    bodyEl.appendChild(src.row); bodyEl.appendChild(tgt.row); bodyEl.appendChild(loading);

    transPanel.appendChild(head); transPanel.appendChild(bodyEl);
    (document.body || document.documentElement).appendChild(transPanel);

    close.addEventListener("click", (e) => { e.stopPropagation(); closeTrans(); });
    transPanel.addEventListener("mousedown", (e) => e.stopPropagation());
    transPanel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeTrans(); } });

    const bindSpeak = (spk, txtEl) => spk.addEventListener("click", (e) => {
      e.stopPropagation();
      if (audio) { audio.pause(); audio = null; spk.style.color = ""; return; }
      if (window.speechSynthesis && window.speechSynthesis.speaking) { window.speechSynthesis.cancel(); spk.style.color = ""; return; }
      const t = txtEl.textContent;
      if (t) speak(t, /[\u4e00-\u9fff\u3400-\u4dbf]/.test(t) ? "zh-CN" : "en", spk);
    });
    bindSpeak(src.spk, src.txt);
    bindSpeak(tgt.spk, tgt.txt);

    transPanel._srcSpeak = src.spk; transPanel._tgtSpeak = tgt.spk;
    transPanel._srcText = src.txt; transPanel._tgtText = tgt.txt;
    transPanel._loadingEl = loading;
  }

  function doTranslate() {
    const s = selText();
    if (!s) return;
    if (!transPanel) buildTransPanel();
    if (!transPanel) return;
    transPanel._srcText.textContent = s;
    transPanel._tgtText.textContent = "";
    transPanel._loadingEl.style.display = "block";
    transPanel._srcSpeak.style.color = "";
    transPanel._tgtSpeak.style.color = "";
    transPanel.style.setProperty("display", "flex", "important");
    transPanel.classList.add("qs-tp-visible");
    dragPanel(transPanel);
    placeNearPanel(transPanel);
    const isZh = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(s);
    const tl = isZh ? "en" : "zh-CN";
    const url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=" + encodeURIComponent(tl) + "&dt=t&q=" + encodeURIComponent(s);
    try {
      httpGet(url).then((data) => {
        try {
          const out = [];
          if (Array.isArray(data) && Array.isArray(data[0]))
            data[0].forEach((seg) => { if (Array.isArray(seg) && seg[0]) out.push(seg[0]); });
          transPanel._tgtText.textContent = out.join("") || "无翻译结果";
        } catch (e) { transPanel._tgtText.textContent = "解析翻译结果失败"; }
      }).catch((e) => { transPanel._tgtText.textContent = "翻译失败：" + (e.message || ""); })
        .then(() => { transPanel._loadingEl.style.display = "none"; });
    } catch (e) { transPanel._tgtText.textContent = "请求发起失败"; transPanel._loadingEl.style.display = "none"; }
    setTimeout(() => { try { transPanel.focus(); } catch (e) {} }, 50);
  }
  function closeTrans() {
    if (transPanel) {
      transPanel.classList.remove("qs-tp-visible");
      transPanel.style.setProperty("display", "none", "important");
      if (transPanel._srcSpeak) transPanel._srcSpeak.style.color = "";
      if (transPanel._tgtSpeak) transPanel._tgtSpeak.style.color = "";
    }
    if (audio) { audio.pause(); audio = null; }
    if (window.speechSynthesis && window.speechSynthesis.speaking) window.speechSynthesis.cancel();
  }

  function placeNearPanel(node) {
    if (!panel) return;
    const r = panel.getBoundingClientRect();
    const sx = window.scrollX || 0, sy = window.scrollY || 0;
    const w = node.offsetWidth || 300, h = node.offsetHeight || 120;
    const docW = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    let left = r.left + sx + r.width / 2 - w / 2;
    if (left + w > docW - 8) left = docW - w - 8;
    if (left < 8) left = 8;
    node.style.left = Math.max(8, left) + "px";
    const top = menuDir === "above" ? r.top + sy - h - 8 : r.bottom + sy + 8;
    node.style.top = Math.max(8, top) + "px";
  }

  function httpGet(url, opt) {
    opt = opt || {};
    if (typeof GM_xmlhttpRequest === "function")
      return new Promise((res, rej) => {
        GM_xmlhttpRequest({
          method: opt.method || "GET",
          url,
          responseType: opt.responseType || "json",
          onload: (r) => (r.status >= 200 && r.status < 300 ? res(r.response) : rej(new Error("HTTP " + r.status))),
          onerror: (r) => rej(new Error(r.error || "Network error")),
          ontimeout: () => rej(new Error("Timeout")),
        });
      });
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return opt.responseType === "arraybuffer" ? r.arrayBuffer() : r.json();
    });
  }

  function dragPanel(node) {
    const handle = node.querySelector("#__qs_tp_head__") || node.querySelector("#__qs_gp_head__") || node.firstChild;
    if (!handle) return;
    handle.style.cursor = "move";
    handle.onmousedown = (e) => {
      const ox = e.clientX - node.offsetLeft, oy = e.clientY - node.offsetTop;
      const move = (ev) => { node.style.left = ev.clientX - ox + "px"; node.style.top = ev.clientY - oy + "px"; };
      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", up);
    };
  }

  function buildGenericPanel() {
    if (genericPanel) return;
    genericPanel = el("div", { id: "__qs_gp__", tabIndex: "-1" });
    const head = el("div", { id: "__qs_gp_head__" });
    const titleEl = el("span", { id: "__qs_gp_title__" });
    const close = el("button", { id: "__qs_gp_close__", type: "button" });
    close.appendChild(icoClose());
    head.appendChild(titleEl); head.appendChild(close);

    const bodyEl = el("div", { id: "__qs_gp_body__" });
    const origLbl = el("div", { className: "__qs_gp_label__" });
    const origInput = el("textarea", { className: "__qs_gp_input__", placeholder: "输入文本..." });
    const resContent = el("div", { className: "__qs_gp_content__" });
    const loading = el("div", { className: "__qs_gp_loading__", style: { display: "none" } });
    bodyEl.appendChild(origLbl); bodyEl.appendChild(origInput);
    bodyEl.appendChild(resContent); bodyEl.appendChild(loading);

    genericPanel.appendChild(head); genericPanel.appendChild(bodyEl);
    (document.body || document.documentElement).appendChild(genericPanel);

    close.addEventListener("click", (e) => { e.stopPropagation(); closeGeneric(); });
    genericPanel.addEventListener("mousedown", (e) => e.stopPropagation());
    genericPanel.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closeGeneric(); } });

    genericPanel._titleEl = titleEl;
    genericPanel._origLbl = origLbl;
    genericPanel._origInput = origInput;
    genericPanel._resContent = resContent;
    genericPanel._loadingEl = loading;
  }
  function openGeneric(title, opt) {
    if (!genericPanel) buildGenericPanel();
    if (!genericPanel) return null;
    closeTrans();
    const g = genericPanel;
    g._titleEl.textContent = title;
    g._origLbl.textContent = opt.origLabel || "";
    g._origLbl.style.display = opt.hideInput ? "none" : "";
    g._origInput.style.display = opt.hideInput ? "none" : "block";
    g._origInput.value = opt.origText || "";
    clear(g._resContent);
    g._loadingEl.style.display = "none";
    g.style.setProperty("display", "flex", "important");
    g.classList.add("qs-gp-visible");
    dragPanel(g);
    placeNearPanel(g);
    setTimeout(() => { try { g.focus(); } catch (e) {} }, 50);
    return { titleEl: g._titleEl, input: g._origInput, resContent: g._resContent, loadingEl: g._loadingEl };
  }
  function closeGeneric() {
    if (genericPanel) {
      genericPanel.classList.remove("qs-gp-visible");
      genericPanel.style.setProperty("display", "none", "important");
    }
  }

  function doCharCount() {
    let p = "";
    try { p = String(window.getSelection && window.getSelection().toString() || ""); } catch (e) {}
    if (!p) return;
    const g = openGeneric("字符数", { hideInput: true });
    if (!g) return;
    const cell = (num, lbl) => {
      const c = el("div", { className: "__qs_cc_cell__" });
      c.appendChild(el("div", { className: "__qs_cc_num__" }, String(num)));
      c.appendChild(el("div", { className: "__qs_cc_lbl__" }, lbl));
      return c;
    };
    const total = p.length;
    const noSpace = p.replace(/\s/g, "").length;
    const words = (p.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\ud840-\ud86f][\udc00-\udfff]?/g) || []).length + (p.match(/[a-zA-Z]+/g) || []).length;
    const nums = (p.match(/\d/g) || []).length;
    const grid = el("div", { className: "__qs_cc_grid__" });
    grid.appendChild(cell(total, "总字符（含空格）"));
    grid.appendChild(cell(noSpace, "总字符（不含空格）"));
    grid.appendChild(cell(words, "单词 / 汉字"));
    grid.appendChild(cell(nums, "数字"));
    g.resContent.appendChild(grid);
  }

  function doRegex() {
    const s = selText();
    if (!s) return;
    const g = openGeneric("正则筛选", { origLabel: "选中文本", origText: s });
    if (!g) return;
    const run = (pattern) => {
      const text = g.input.value || "";
      if (!pattern) { result.textContent = ""; return; }
      try {
        const re = new RegExp(pattern, "g");
        const m = text.match(re);
        result.textContent = !m || !m.length ? "无匹配" : m.join("\n");
      } catch (e) { result.textContent = "正则错误：" + e.message; }
    };
    const wrap = el("div", { className: "__qs_rf_wrap__" });
    const presets = el("div", { className: "__qs_rf_presets__" });
    const customRow = el("div", { className: "__qs_rf_custom__" });
    const inp = el("input", { className: "__qs_rf_inp__", type: "text", placeholder: "输入自定义正则..." });
    const btn = el("button", { className: "__qs_rf_btn__", type: "button" }, "筛选");
    customRow.appendChild(inp); customRow.appendChild(btn);
    const result = el("div", { className: "__qs_rf_result__" });
    REGEX_PRESETS.forEach((pr) => {
      const b = el("button", { className: "__qs_rf_preset__", type: "button" }, pr.t);
      b.addEventListener("click", () => { inp.value = pr.r; run(pr.r); });
      presets.appendChild(b);
    });
    btn.addEventListener("click", () => run(inp.value));
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); run(inp.value); } });
    wrap.appendChild(presets); wrap.appendChild(customRow); wrap.appendChild(result);
    g.resContent.appendChild(wrap);
  }

  function doBase() {
    const s = selText();
    if (!s) return;
    const g = openGeneric("进制转换", { origLabel: "输入", origText: s });
    if (!g) return;
    const wrap = el("div", { className: "__qs_rf_wrap__" });
    const render = () => {
      clear(wrap);
      const n = parseInt((g.input.value || "").trim(), 10);
      [["二进制 (2)", 2], ["八进制 (8)", 8], ["十进制 (10)", 10], ["十六进制 (16)", 16]].forEach(([lbl, base]) => {
        const row = el("div");
        row.style.cssText = "display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(15,23,42,.06)";
        const k = el("span", null, lbl); k.style.cssText = "font-size:12px;color:#64748b";
        const v = el("span", null, isNaN(n) ? "-" : n.toString(base).toUpperCase());
        v.style.cssText = "font-size:13px;font-weight:600;color:#3b82f6;font-family:monospace;word-break:break-all";
        row.appendChild(k); row.appendChild(v); wrap.appendChild(row);
      });
    };
    g.input.addEventListener("input", render);
    render();
    g.resContent.appendChild(wrap);
  }

  function doUnit() {
    const s = selText();
    if (!s) return;
    const g = openGeneric("单位转换", { hideInput: true });
    if (!g) return;
    const wrap = el("div", { className: "__qs_rf_wrap__" });
    const presets = el("div", { className: "__qs_rf_presets__" });
    const row = el("div", { className: "__qs_rf_custom__" });
    const selFrom = el("select", { className: "__qs_rf_sel__" });
    const selTo = el("select", { className: "__qs_rf_sel__" });
    const inp = el("input", { className: "__qs_rf_inp__", type: "text", placeholder: "数值" });
    const v0 = parseFloat(s); if (!isNaN(v0)) inp.value = v0;
    const result = el("div", { className: "__qs_rf_result__" });
    let group = null;

    const convert = (val, from, to, gr) => {
      if (gr.special && gr.t === "温度") {
        let c = from === "℃ (摄氏度)" ? val : from === "℉ (华氏度)" ? (5 * (val - 32)) / 9 : val - 273.15;
        return to === "℃ (摄氏度)" ? c : to === "℉ (华氏度)" ? (9 * c) / 5 + 32 : c + 273.15;
      }
      return (val * gr.f[gr.u.indexOf(from)]) / gr.f[gr.u.indexOf(to)];
    };
    const fillUnits = () => {
      selFrom.innerHTML = ""; selTo.innerHTML = "";
      if (!group) return;
      group.u.forEach((u) => {
        selFrom.appendChild(el("option", { value: u }, u));
        selTo.appendChild(el("option", { value: u }, u));
      });
      if (group.u.length > 1) selTo.selectedIndex = 1;
    };
    const calc = () => {
      if (!group) { result.textContent = "请先选择类别"; return; }
      const val = parseFloat(inp.value);
      if (isNaN(val)) { result.textContent = "请输入数值"; return; }
      const out = convert(val, selFrom.value, selTo.value, group);
      result.textContent = val + " " + selFrom.value + " = " + Math.round(out * 1e8) / 1e8 + " " + selTo.value;
    };
    UNIT_GROUPS.forEach((gr) => {
      const b = el("button", { className: "__qs_rf_preset__", type: "button" }, gr.t);
      b.addEventListener("click", () => { group = gr; fillUnits(); calc(); });
      presets.appendChild(b);
    });
    row.appendChild(selFrom); row.appendChild(inp); row.appendChild(selTo);
    selFrom.addEventListener("change", calc);
    selTo.addEventListener("change", calc);
    inp.addEventListener("input", calc);
    group = UNIT_GROUPS[0]; fillUnits(); calc();
    wrap.appendChild(presets); wrap.appendChild(row); wrap.appendChild(result);
    g.resContent.appendChild(wrap);
  }

  function doTextClean() {
    const s = selText();
    if (!s) return;
    const g = openGeneric("文本处理", { origLabel: "原文", origText: s });
    if (!g) return;
    const wrap = el("div", { className: "__qs_rf_wrap__" });
    const ops = [
      { t: "URL编码", fn: (t) => encodeURIComponent(t) },
      { t: "URL解码", fn: (t) => { try { return decodeURIComponent(t); } catch (e) { return "解码失败：" + e.message; } } },
      { t: "大写", fn: (t) => t.toUpperCase() },
      { t: "小写", fn: (t) => t.toLowerCase() },
      { t: "Unicode转义", fn: (t) => Array.from(t).map((c) => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")).join("") },
      { t: "Unicode反转义", fn: (t) => t.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16))) },
      { t: "Base64编码", fn: (t) => { try { return btoa(unescape(encodeURIComponent(t))); } catch (e) { return "编码失败：" + e.message; } } },
      { t: "Base64解码", fn: (t) => { try { return decodeURIComponent(Array.prototype.map.call(atob(t), (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join("")); } catch (e) { return "解码失败：" + e.message; } } },
      { t: "去空行", fn: (t) => t.split("\n").filter((x) => x.trim() !== "").join("\n") },
      { t: "去空格", fn: (t) => t.replace(/\s+/g, "") },
      { t: "去空行+空格", fn: (t) => t.split("\n").filter((x) => x.trim() !== "").join("\n").replace(/\s+/g, " ") },
      { t: "去首尾空格", fn: (t) => t.split("\n").map((x) => x.trim()).join("\n") },
      { t: "段落去重", fn: (t) => {
          const seen = {}, out = [];
          t.split("\n").forEach((line) => { if (!seen[line]) { seen[line] = 1; out.push(line); } });
          return out.join("\n");
        } },
      { t: "词语去重", fn: (t) => {
          const seen = {}, out = [];
          (t.match(/[\u4e00-\u9fff]|[a-zA-Z0-9]+/g) || []).forEach((w) => {
            if (!seen[w]) { seen[w] = 1; out.push(w); }
          });
          return out.join(" ");
        } },
      { t: "词语去重", fn: (t) => {
          const seen = {}, out = [];
          (t.match(/[\u4e00-\u9fff]|[a-zA-Z0-9]+/g) || []).forEach((w) => {
            if (!seen[w]) { seen[w] = 1; out.push(w); }
          });
          return out.join(" ");
        } },
      { t: "时间戳转换", fn: (t) => tsConvert(t) },
    ];
    const presets = el("div", { className: "__qs_rf_presets__" });
    const result = el("div", { className: "__qs_rf_result__" });
    ops.forEach((op) => {
      const b = el("button", { className: "__qs_rf_preset__", type: "button" }, op.t);
      b.addEventListener("click", () => { result.textContent = op.fn(g.input.value || ""); });
      presets.appendChild(b);
    });
    wrap.appendChild(presets); wrap.appendChild(result);
    g.resContent.appendChild(wrap);
  }
  function tsConvert(raw) {
    const str = (raw || "").trim();
    const num = parseInt(str, 10);
    const d = !isNaN(num) && num > 946684800 ? new Date(num < 1e12 ? num * 1e3 : num) : new Date(str);
    if (isNaN(d.getTime())) return "（无法解析为时间）";
    const sec = Math.floor(d.getTime() / 1e3);
    return [
      "时间戳 (s)：" + sec,
      "时间戳 (ms)：" + d.getTime(),
      "本地时间：" + d.toLocaleString(),
      "ISO 8601：" + d.toISOString(),
      "UTC：" + d.toUTCString(),
    ].join("\n");
  }
  function enterEdit() {
    if (!GM_OK) return;
    if (editMode) exitEdit();
    editMode = true;
    dragIdx = -1;
    const plus = body.querySelector(".__qs_btn__[data-qs-plus]");
    if (plus) plus.style.display = "none";
    body.querySelectorAll(".__qs_btn__").forEach((b) => {
      if (b.dataset.qsPlus === "1") return;
      b.classList.add("qs-shaking", "qs-edit-active");
      b.draggable = true;
      b.addEventListener("dragstart", onDragStart);
      b.addEventListener("dragover", onDragOver);
      b.addEventListener("dragleave", onDragLeave);
      b.addEventListener("drop", onDrop);
      b.addEventListener("dragend", onDragEnd);
      if (!b.querySelector(".__qs_edit_del__")) {
        const del = el("button", { className: "__qs_edit_del__", type: "button" }, "×");
        del.addEventListener("mousedown", (e) => { e.stopPropagation(); e.preventDefault(); });
        del.addEventListener("click", (e) => {
          e.stopPropagation(); e.preventDefault();
          const idx = parseInt(b.dataset.qsIdx);
          if (!isNaN(idx) && idx >= 0 && idx < STATE.buttons.length) {
            STATE.buttons.splice(idx, 1);
            saveButtons(STATE.buttons);
            renderButtons();
            if (STATE.buttons.length === 0) { editMode = false; return; }
            setTimeout(() => enterEdit(), 80);
          }
        });
        b.appendChild(del);
      }
    });
  }
  function exitEdit() {
    editMode = false; dragIdx = -1; dragSilent = false; longPressed = false;
    if (!body) return;
    body.querySelectorAll(".__qs_btn__").forEach((b) => {
      b.classList.remove("qs-shaking", "qs-edit-active", "qs-drag-over", "qs-drag-src");
      b.style.transform = "";
      b.draggable = false;
      b.removeEventListener("dragstart", onDragStart);
      b.removeEventListener("dragover", onDragOver);
      b.removeEventListener("dragleave", onDragLeave);
      b.removeEventListener("drop", onDrop);
      b.removeEventListener("dragend", onDragEnd);
      const del = b.querySelector(".__qs_edit_del__");
      if (del) del.remove();
    });
    const plus = body.querySelector(".__qs_btn__[data-qs-plus]");
    if (plus) plus.style.display = "";
  }
  function idxFromEvent(e) {
    let n = e.target;
    while (n && n !== body) {
      if (n.classList.contains("__qs_btn__") && n.dataset.qsIdx !== undefined) return parseInt(n.dataset.qsIdx);
      n = n.parentNode;
    }
    return -1;
  }
  function sortableBtns() {
    return body ? Array.from(body.querySelectorAll(".__qs_btn__:not([data-qs-plus]):not([data-qs-tools])")) : [];
  }
  function clearDragVisual() {
    if (!body) return;
    body.querySelectorAll(".__qs_btn__").forEach((b) => { b.style.transform = ""; b.classList.remove("qs-drag-over", "qs-drag-src"); });
  }
  function previewShift(from, to) {
    if (!body || from < 0 || to < 0 || from === to) return;
    const list = sortableBtns();
    if (from >= list.length || to >= list.length) return;
    const SHIFT = 38;
    list.forEach((b, i) => {
      if (i === from) return;
      b.style.transform = "";
      if (from < to && i > from && i <= to) b.style.transform = "translateX(-" + SHIFT + "px)";
      else if (from > to && i >= to && i < from) b.style.transform = "translateX(" + SHIFT + "px)";
    });
  }
  function onDragStart(e) {
    if (!editMode) return;
    if (longPressed) { e.preventDefault(); longPressed = false; return; }
    dragIdx = idxFromEvent(e);
    if (dragIdx < 0) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(dragIdx));
    const list = sortableBtns();
    if (list[dragIdx]) list[dragIdx].classList.add("qs-drag-src");
  }
  function onDragOver(e) {
    if (!editMode || dragIdx < 0) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const over = idxFromEvent(e);
    if (over >= 0 && over !== dragIdx) { e.currentTarget.classList.add("qs-drag-over"); previewShift(dragIdx, over); }
  }
  function onDragLeave(e) { e.currentTarget.classList.remove("qs-drag-over"); }
  function onDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove("qs-drag-over");
    if (!editMode || dragIdx < 0) return;
    const to = idxFromEvent(e);
    if (to < 0 || to === dragIdx) { clearDragVisual(); return; }
    const moved = STATE.buttons.splice(dragIdx, 1)[0];
    STATE.buttons.splice(to, 0, moved);
    saveButtons(STATE.buttons);
    dragSilent = true;
    clearDragVisual();
    renderButtons();
    setTimeout(() => { dragSilent = false; enterEdit(); }, 80);
  }
  function onDragEnd(e) { e.currentTarget.classList.remove("qs-drag-over"); clearDragVisual(); dragIdx = -1; }
  function injectStyle() {
    if (document.getElementById("__qs_style__")) return;
    const css = `
#__qs_root__{position:absolute!important;z-index:${Z_INDEX}!important;pointer-events:none!important;top:0!important;left:0!important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}
#__qs_panel__{position:absolute!important;z-index:${Z_INDEX}!important;display:inline-flex!important;flex-direction:row!important;align-items:center!important;height:${PANEL_H}px!important;padding:0 5px!important;gap:0!important;border-radius:999px!important;background:rgba(255,255,255,.92)!important;overflow:hidden!important;box-shadow:0 4px 16px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.08)!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important;opacity:0!important;transform:scale(.92) translateY(6px)!important;transition:opacity .2s ease,transform .2s ease!important;transform-origin:top center!important;pointer-events:none!important}
#__qs_panel__.qs-visible{opacity:1!important;transform:scale(1) translateY(0)!important}
#__qs_panel__.qs-expanded{border-radius:16px!important;flex-wrap:wrap!important;height:auto!important;overflow:visible!important;padding:0!important;gap:0!important}
#__qs_panel__.qs-expanded #__qs_body__{max-width:none!important;width:252px!important;flex-wrap:wrap!important;overflow-y:hidden!important;overflow-x:hidden!important;max-height:212px!important;height:auto!important;padding:6px 4px 2px 8px!important;gap:4px!important}
#__qs_panel__.qs-expanded #__qs_body__.qs-overflow{overflow-y:auto!important}
#__qs_panel__.qs-expanded #__qs_body__::-webkit-scrollbar{display:none!important}
#__qs_panel__.qs-expanded .__qs_toggle_btn__{width:100%!important;min-width:100%!important;border-radius:0 0 16px 16px!important;border-left:none!important;border-top:1px solid rgba(15,23,42,.06)!important}
@media(prefers-color-scheme:dark){#__qs_panel__{background:rgba(28,30,38,.92)!important;box-shadow:0 4px 16px rgba(0,0,0,.4),0 1px 4px rgba(0,0,0,.2)!important}}
#__qs_body__{border-radius:inherit!important;display:inline-flex!important;flex-direction:row!important;align-items:center!important;gap:2px!important;padding:0 5px!important;height:100%!important;overflow-x:auto!important;overflow-y:hidden!important;max-width:320px!important;scrollbar-width:none!important}
#__qs_body__::-webkit-scrollbar{display:none!important}
.__qs_btn__{width:36px!important;height:36px!important;min-width:36px!important;border-radius:50%!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:none!important;background:transparent!important;cursor:pointer!important;padding:0!important;transition:background .15s,transform .15s!important;flex-shrink:0!important;position:relative!important}
.__qs_btn__:hover{background:rgba(15,23,42,.08)!important;transform:scale(1.14)!important}
@media(prefers-color-scheme:dark){.__qs_btn__:hover{background:rgba(255,255,255,.12)!important}}
.__qs_toggle_btn__{width:28px!important;height:36px!important;min-width:28px!important;border-radius:0 999px 999px 0!important;border:none!important;border-left:1px solid rgba(15,23,42,.08)!important;background:transparent!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#94a3b8!important;padding:0!important;flex-shrink:0!important;transition:color .15s,background .15s!important}
.__qs_toggle_btn__:hover{color:#3b82f6!important;background:rgba(59,130,246,.06)!important}
.__qs_toggle_btn__ svg{transition:transform .2s ease!important;pointer-events:none!important}
#__qs_panel__.qs-expanded .__qs_toggle_btn__ svg{transform:rotate(180deg)!important}
@media(prefers-color-scheme:dark){.__qs_toggle_btn__{border-left-color:rgba(255,255,255,.1)!important;color:#64748b!important}.__qs_toggle_btn__:hover{color:#60a5fa!important;background:rgba(59,130,246,.1)!important}#__qs_panel__.qs-expanded .__qs_toggle_btn__{border-top-color:rgba(255,255,255,.08)!important}}
.__qs_icon__{width:22px!important;height:22px!important;object-fit:contain!important;border-radius:4px!important;display:block!important;pointer-events:none!important}
.__qs_cico_fallback__{font-size:10px!important;font-weight:700!important;color:#334155!important;line-height:1!important;pointer-events:none!important;user-select:none!important}
@media(prefers-color-scheme:dark){.__qs_cico_fallback__{color:#cbd5e1!important}}
@keyframes qs-bm-pop{0%{opacity:0;transform:translateY(-50%) scale(0)}40%{opacity:1;transform:translateY(-50%) scale(1.25)}60%{opacity:1;transform:translateY(-50%) scale(1)}100%{opacity:0;transform:translateY(-50%) scale(1)}}
@keyframes qs-bm-flash{0%{background:#FDE68A}50%{background:transparent}100%{background:#FDE68A}}
@media(prefers-color-scheme:dark){@keyframes qs-bm-flash{0%{background:#06B6D4}50%{background:transparent}100%{background:#06B6D4}}}
mark.qs-bm-flash{animation:qs-bm-flash 1s ease-in-out 3!important;border-radius:2px!important;padding:0 1px!important}
@keyframes qs-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-2px)}40%{transform:translateX(2px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
.__qs_btn__.qs-shaking{animation:qs-shake .3s ease-in-out infinite!important}
.__qs_btn__.qs-shaking:hover{animation:none!important;transform:scale(1.14)!important}
.__qs_btn__.qs-edit-active{transition:transform .15s ease!important}
.__qs_btn__.qs-drag-over{background:rgba(59,130,246,.16)!important}
.__qs_btn__.qs-drag-src{opacity:.4!important;transform:scale(.9)!important}
.__qs_edit_del__{position:absolute!important;top:-4px!important;right:-4px!important;width:16px!important;height:16px!important;min-width:16px!important;border-radius:50%!important;border:none!important;background:#ef4444!important;color:#fff!important;font-size:10px!important;line-height:1!important;cursor:pointer!important;z-index:10!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;font-family:Arial,sans-serif!important}
#__qs_tool_menu__{position:absolute!important;z-index:${Z_INDEX}!important;background:rgba(255,255,255,.96)!important;border-radius:12px!important;box-shadow:0 8px 24px rgba(0,0,0,.14)!important;padding:6px!important;display:none;flex-direction:column!important;gap:2px!important;min-width:140px!important;max-height:30vh!important;overflow-y:auto!important;backdrop-filter:blur(12px)!important;-webkit-backdrop-filter:blur(12px)!important}
@media(prefers-color-scheme:dark){#__qs_tool_menu__{background:rgba(28,30,38,.96)!important;box-shadow:0 8px 24px rgba(0,0,0,.4)!important}}
#__qs_tool_menu__ .qs-tool-item{display:flex!important;align-items:center!important;gap:8px!important;padding:8px 12px!important;border-radius:8px!important;border:none!important;background:transparent!important;color:#334155!important;font-size:13px!important;cursor:pointer!important;white-space:nowrap!important;width:100%!important;text-align:left!important;transition:background .1s!important}
#__qs_tool_menu__ .qs-tool-item:hover{background:rgba(15,23,42,.06)!important}
@media(prefers-color-scheme:dark){#__qs_tool_menu__ .qs-tool-item{color:#e2e8f0!important}#__qs_tool_menu__ .qs-tool-item:hover{background:rgba(255,255,255,.08)!important}}
#__qs_tool_menu__{scrollbar-width:thin!important;scrollbar-color:rgba(15,23,42,.15) transparent!important}
#__qs_tool_menu__::-webkit-scrollbar{width:4px!important}
#__qs_tool_menu__::-webkit-scrollbar-thumb{background:rgba(15,23,42,.15)!important;border-radius:4px!important}
#__qs_ep_mask__{position:fixed!important;inset:0!important;z-index:${Z_INDEX}!important;background:rgba(10,15,28,.5)!important;display:none!important;align-items:center!important;justify-content:center!important}
#__qs_ep_modal__{width:min(420px,94vw)!important;max-height:86vh!important;display:flex!important;flex-direction:column!important;border-radius:20px!important;background:#fff!important;color:#0f172a!important;box-shadow:0 20px 60px rgba(0,0,0,.2)!important;overflow:hidden!important}
@media(prefers-color-scheme:dark){#__qs_ep_modal__{background:#16181f!important;color:#e2e8f0!important}}
#__qs_ep_head__{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:16px 20px 12px!important;border-bottom:1px solid rgba(15,23,42,.08)!important}
#__qs_ep_title__{font-size:15px!important;font-weight:700!important}
#__qs_ep_close__{width:32px!important;height:32px!important;border-radius:50%!important;border:none!important;background:rgba(15,23,42,.06)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#64748b!important}
#__qs_ep_close__:hover{background:rgba(15,23,42,.12)!important}
@media(prefers-color-scheme:dark){#__qs_ep_close__{background:rgba(255,255,255,.08)!important;color:#94a3b8!important}}
#__qs_ep_body__{flex:1!important;overflow-y:auto!important;padding:16px 20px!important;display:flex!important;flex-direction:column!important;gap:18px!important}
#__qs_ep_body__::-webkit-scrollbar{width:4px!important}
#__qs_ep_body__::-webkit-scrollbar-thumb{background:rgba(15,23,42,.15)!important;border-radius:4px!important}
#__qs_ep_sec_url__{display:flex!important;flex-direction:column!important;gap:8px!important}
#__qs_ep_sec_tool__{display:flex!important;flex-direction:column!important;gap:6px!important}
.__qs_ep_lbl__{font-size:12px!important;font-weight:600!important;color:#64748b!important;text-transform:uppercase!important;letter-spacing:.04em!important;margin-bottom:2px!important}
#__qs_ep_row_url__{display:flex!important;gap:6px!important;align-items:center!important}
.__qs_ep_radio__{display:inline-flex!important;align-items:center!important;gap:6px!important;border:none!important;background:transparent!important;color:inherit!important;font-size:13px!important;cursor:pointer!important;padding:4px 0!important;text-align:left!important;transition:opacity .12s!important}
.__qs_ep_radio__:hover{opacity:.8!important}
.__qs_ep_inp__{width:100%!important;min-width:0!important;box-sizing:border-box!important;border:1.5px solid rgba(15,23,42,.1)!important;border-radius:8px!important;padding:5px 9px!important;font-size:12.5px!important;background:transparent!important;color:inherit!important;outline:none!important}
.__qs_ep_inp__:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important}
#__qs_ep_textarea__{width:100%!important;box-sizing:border-box!important;border:1.5px solid rgba(15,23,42,.1)!important;border-radius:8px!important;padding:6px 9px!important;font-size:11.5px!important;font-family:ui-monospace,'SFMono-Regular','Cascadia Mono',monospace!important;background:transparent!important;color:inherit!important;outline:none!important;resize:vertical!important;min-height:56px!important}
#__qs_ep_textarea__:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important}
#__qs_ep_foot__{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:8px!important;padding:12px 16px!important;border-top:1px solid rgba(15,23,42,.06)!important}
@media(prefers-color-scheme:dark){#__qs_ep_foot__{border-top-color:rgba(255,255,255,.06)!important}}
.__qs_ep_cancel__{height:36px!important;padding:0 16px!important;border-radius:10px!important;border:1.5px solid rgba(15,23,42,.12)!important;background:transparent!important;color:#64748b!important;font-size:13px!important;font-weight:500!important;cursor:pointer!important}
.__qs_ep_cancel__:hover{background:rgba(15,23,42,.05)!important;color:#334155!important}
@media(prefers-color-scheme:dark){.__qs_ep_cancel__{border-color:rgba(255,255,255,.12)!important;color:#94a3b8!important}}
.__qs_ep_save__{height:36px!important;padding:0 20px!important;border-radius:10px!important;border:none!important;background:#3b82f6!important;color:#fff!important;font-size:13px!important;font-weight:600!important;cursor:pointer!important}
.__qs_ep_save__:hover{background:#2563eb!important;transform:translateY(-1px)!important}
.__qs_ep_hint__{font-size:11px!important;color:#94a3b8!important;margin-top:2px!important;line-height:1.4!important}
.__qs_ep_tile_grid__{display:flex!important;flex-wrap:wrap!important;gap:6px!important}
.__qs_ep_tile__{display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:4px!important;width:64px!important;height:58px!important;border-radius:8px!important;border:1.5px solid rgba(15,23,42,.1)!important;background:transparent!important;color:#475569!important;font-size:11px!important;cursor:pointer!important;transition:border-color .12s,background .12s,color .12s!important;padding:0!important}
.__qs_ep_tile__:hover{border-color:#3b82f6!important;color:#3b82f6!important;background:rgba(59,130,246,.04)!important}
.__qs_ep_tile__.qs-tile-active{border-color:#3b82f6!important;background:rgba(59,130,246,.1)!important;color:#3b82f6!important}
.__qs_ep_tile__ svg{width:18px!important;height:18px!important;pointer-events:none!important}
.__qs_ep_tile_lbl__{font-size:9.5px!important;font-weight:500!important;line-height:1!important;pointer-events:none!important;white-space:nowrap!important}
@media(prefers-color-scheme:dark){.__qs_ep_tile__{border-color:rgba(255,255,255,.12)!important;color:#cbd5e1!important}.__qs_ep_tile__:hover{border-color:#3b82f6!important;color:#60a5fa!important;background:rgba(59,130,246,.08)!important}.__qs_ep_tile__.qs-tile-active{border-color:#3b82f6!important;background:rgba(59,130,246,.16)!important;color:#60a5fa!important}}
.__qs_tile_tip__{position:fixed!important;z-index:${Z_INDEX}!important;background:rgba(15,23,42,.92)!important;color:#fff!important;font-size:11.5px!important;line-height:1.5!important;padding:6px 10px!important;border-radius:6px!important;pointer-events:none!important;max-width:220px!important;white-space:normal!important;word-break:break-word!important;box-shadow:0 4px 12px rgba(0,0,0,.18)!important;opacity:0;transition:opacity .12s ease!important}.__qs_tile_tip__.qs-tip-show{opacity:1!important}
#__qs_tp__{position:absolute!important;z-index:${Z_INDEX}!important;width:min(380px,92vw)!important;max-height:60vh!important;display:none!important;flex-direction:column!important;border-radius:14px!important;background:#fff!important;color:#0f172a!important;box-shadow:0 12px 40px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08)!important;overflow:hidden!important;opacity:0!important;transform:translateY(6px)!important;transition:opacity .18s ease,transform .18s ease!important;outline:none!important}
#__qs_tp__.qs-tp-visible{opacity:1!important;transform:translateY(0)!important}
@media(prefers-color-scheme:dark){#__qs_tp__{background:#16181f!important;color:#e2e8f0!important;box-shadow:0 12px 40px rgba(0,0,0,.4),0 2px 8px rgba(0,0,0,.2)!important}}
#__qs_tp_head__{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:12px 16px!important;border-bottom:1px solid rgba(15,23,42,.08)!important;flex-shrink:0!important}
@media(prefers-color-scheme:dark){#__qs_tp_head__{border-bottom-color:rgba(255,255,255,.08)!important}}
#__qs_tp_title__{font-size:13px!important;font-weight:700!important}
#__qs_tp_actions__{display:flex!important;align-items:center!important;gap:4px!important}
#__qs_tp_close__{width:28px!important;height:28px!important;border-radius:50%!important;border:none!important;background:rgba(15,23,42,.06)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#64748b!important;padding:0!important}
#__qs_tp_close__:hover{background:rgba(15,23,42,.12)!important}
@media(prefers-color-scheme:dark){#__qs_tp_close__{background:rgba(255,255,255,.08)!important;color:#94a3b8!important}}
#__qs_tp_body__{flex:1!important;overflow-y:auto!important;padding:12px 16px!important;display:flex!important;flex-direction:column!important;gap:12px!important}
#__qs_tp_body__::-webkit-scrollbar{width:4px!important}
#__qs_tp_body__::-webkit-scrollbar-thumb{background:rgba(15,23,42,.12)!important;border-radius:4px!important}
.__qs_tp_row__{display:flex!important;gap:8px!important;align-items:flex-start!important}
.__qs_tp_info__{display:flex!important;align-items:center!important;gap:4px!important;flex-shrink:0!important;padding-top:2px!important}
.__qs_tp_label__{font-size:10.5px!important;font-weight:600!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:.05em!important}
.__qs_tp_speak__{width:24px!important;height:24px!important;border-radius:50%!important;border:none!important;background:rgba(15,23,42,.06)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#64748b!important;padding:0!important;transition:color .15s!important;flex-shrink:0!important}
.__qs_tp_speak__:hover{background:rgba(15,23,42,.12)!important}
@media(prefers-color-scheme:dark){.__qs_tp_speak__{background:rgba(255,255,255,.08)!important;color:#94a3b8!important}}
.__qs_tp_text__{flex:1!important;font-size:13px!important;line-height:1.6!important;word-break:break-word!important;min-width:0!important}
.__qs_tp_loading__{font-size:12px!important;color:#94a3b8!important;text-align:center!important;padding:8px 0!important}
#__qs_gp__{position:absolute!important;z-index:${Z_INDEX}!important;width:min(380px,92vw)!important;max-height:60vh!important;display:none!important;flex-direction:column!important;border-radius:14px!important;background:#fff!important;color:#0f172a!important;box-shadow:0 12px 40px rgba(0,0,0,.15),0 2px 8px rgba(0,0,0,.08)!important;overflow:hidden!important;opacity:0!important;transform:translateY(6px)!important;transition:opacity .18s ease,transform .18s ease!important;outline:none!important}
#__qs_gp__.qs-gp-visible{opacity:1!important;transform:translateY(0)!important}
@media(prefers-color-scheme:dark){#__qs_gp__{background:#16181f!important;color:#e2e8f0!important;box-shadow:0 12px 40px rgba(0,0,0,.4),0 2px 8px rgba(0,0,0,.2)!important}}
#__qs_gp_head__{display:flex!important;align-items:center!important;justify-content:space-between!important;padding:12px 16px!important;border-bottom:1px solid rgba(15,23,42,.08)!important;flex-shrink:0!important}
@media(prefers-color-scheme:dark){#__qs_gp_head__{border-bottom-color:rgba(255,255,255,.08)!important}}
#__qs_gp_title__{font-size:13px!important;font-weight:700!important}
#__qs_gp_close__{width:28px!important;height:28px!important;border-radius:50%!important;border:none!important;background:rgba(15,23,42,.06)!important;cursor:pointer!important;display:flex!important;align-items:center!important;justify-content:center!important;color:#64748b!important;padding:0!important}
#__qs_gp_close__:hover{background:rgba(15,23,42,.12)!important}
@media(prefers-color-scheme:dark){#__qs_gp_close__{background:rgba(255,255,255,.08)!important;color:#94a3b8!important}}
#__qs_gp_body__{flex:1!important;overflow-y:auto!important;padding:12px 16px!important;display:flex!important;flex-direction:column!important;gap:8px!important}
#__qs_gp_body__::-webkit-scrollbar{width:4px!important}
#__qs_gp_body__::-webkit-scrollbar-thumb{background:rgba(15,23,42,.12)!important;border-radius:4px!important}
.__qs_gp_label__{font-size:10.5px!important;font-weight:600!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:.05em!important}
.__qs_gp_input__{width:100%!important;box-sizing:border-box!important;border:1.5px solid rgba(15,23,42,.1)!important;border-radius:8px!important;padding:6px 9px!important;font-size:12.5px!important;line-height:1.5!important;background:transparent!important;color:inherit!important;outline:none!important;resize:vertical!important;min-height:48px!important;max-height:120px!important;font-family:inherit!important}
.__qs_gp_input__:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important}
.__qs_gp_content__{font-size:14px!important;line-height:1.6!important;word-break:break-word!important}
.__qs_gp_loading__{font-size:12px!important;color:#94a3b8!important;text-align:center!important;padding:8px 0!important}
.__qs_cc_grid__{display:grid!important;grid-template-columns:1fr 1fr!important;gap:1px!important;background:rgba(15,23,42,.08)!important;border-radius:8px!important;overflow:hidden!important;margin-top:4px!important}
@media(prefers-color-scheme:dark){.__qs_cc_grid__{background:rgba(255,255,255,.08)!important}}
.__qs_cc_cell__{background:#fff!important;padding:12px 8px!important;text-align:center!important;display:flex!important;flex-direction:column!important;align-items:center!important;gap:4px!important}
@media(prefers-color-scheme:dark){.__qs_cc_cell__{background:#1e2030!important}}
.__qs_cc_num__{font-size:20px!important;font-weight:700!important;color:#3b82f6!important;line-height:1.2!important}
.__qs_cc_lbl__{font-size:11px!important;color:#64748b!important;line-height:1.3!important}
@media(prefers-color-scheme:dark){.__qs_cc_lbl__{color:#94a3b8!important}}
.__qs_rf_wrap__{display:flex!important;flex-direction:column!important;gap:8px!important;margin-top:4px!important}
.__qs_rf_presets__{display:flex!important;flex-wrap:wrap!important;gap:4px!important}
.__qs_rf_preset__{padding:4px 10px!important;border-radius:6px!important;border:1px solid rgba(15,23,42,.12)!important;background:transparent!important;color:#334155!important;font-size:12px!important;cursor:pointer!important;transition:background .1s!important}
.__qs_rf_preset__:hover{background:rgba(59,130,246,.08)!important;border-color:#3b82f6!important;color:#3b82f6!important}
@media(prefers-color-scheme:dark){.__qs_rf_preset__{border-color:rgba(255,255,255,.12)!important;color:#e2e8f0!important}.__qs_rf_preset__:hover{background:rgba(59,130,246,.16)!important}}
.__qs_rf_custom__{display:flex!important;flex-wrap:nowrap!important;gap:6px!important;align-items:center!important}
.__qs_rf_inp__{flex:1!important;min-width:0!important;box-sizing:border-box!important;border:1.5px solid rgba(15,23,42,.1)!important;border-radius:8px!important;padding:6px 10px!important;font-size:12px!important;font-family:ui-monospace,'SFMono-Regular','Cascadia Mono',monospace!important;background:transparent!important;color:inherit!important;outline:none!important}
.__qs_rf_inp__:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important}
.__qs_rf_btn__{padding:6px 14px!important;border-radius:8px!important;border:none!important;background:#3b82f6!important;color:#fff!important;font-size:12px!important;font-weight:600!important;cursor:pointer!important;flex-shrink:0!important;white-space:nowrap!important}
.__qs_rf_btn__:hover{background:#2563eb!important}
.__qs_rf_sel__{padding:6px 8px!important;border:1.5px solid rgba(15,23,42,.1)!important;border-radius:8px!important;font-size:12px!important;background:transparent!important;color:inherit!important;outline:none!important;cursor:pointer!important;min-width:60px!important}
.__qs_rf_sel__:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.12)!important}
.__qs_rf_result__{max-height:200px!important;overflow-y:auto!important;white-space:pre-wrap!important;word-break:break-all!important;font-size:12.5px!important;line-height:1.6!important;color:#475569!important;padding:8px!important;border-radius:6px!important;background:rgba(15,23,42,.03)!important}
@media(prefers-color-scheme:dark){.__qs_rf_result__{color:#94a3b8!important;background:rgba(255,255,255,.04)!important}}
`;
    const s = document.createElement("style");
    s.id = "__qs_style__";
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }
  function init() {
    if (document.getElementById("__qs_root__")) return;
    iconLoad();
    STATE.buttons = loadButtons();
    injectStyle();
    buildPanel();
    bmRestore();
    ensureHlStyle();
    if (window.matchMedia)
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", ensureHlStyle);
  }

  document.addEventListener("mouseup", (e) => {
    if (
      (panel && panel.contains(e.target)) ||
      (editModal && editModal.contains(e.target)) ||
      (toolMenu && toolMenu.contains(e.target)) ||
      (transPanel && transPanel.contains(e.target)) ||
      (genericPanel && genericPanel.contains(e.target))
    ) return;
    setTimeout(() => { if (selText()) showPanel(e.pageX, e.pageY); else hidePanel(false); }, 10);
  });

  document.addEventListener("mousedown", (e) => {
    if (editMode && !(body && body.contains(e.target))) exitEdit();
    if (
      (panel && panel.contains(e.target)) ||
      (editModal && editModal.contains(e.target)) ||
      (toolMenu && toolMenu.contains(e.target)) ||
      (transPanel && transPanel.contains(e.target)) ||
      (genericPanel && genericPanel.contains(e.target))
    ) return;
    hidePanel(false);
    closeToolMenu();
    closeTrans();
    closeGeneric();
  });

  document.addEventListener("selectionchange", () => { if (!selText()) hidePanel(false); });

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
}();