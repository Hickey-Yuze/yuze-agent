(function () {
  'use strict';

  if (window.__tbAcrylicThemeLoaded) return;
  window.__tbAcrylicThemeLoaded = true;

  var THEME_ID = 'Yuze-acrylic-bg';
  var STYLE_ID = 'Yuze-acrylic-theme-css';
  var BG_ID = 'Yuze-live-background';
  var PRESET_PANEL_ID = 'Yuze-acrylic-preset-panel';
  var STORAGE_KEY = 'Yuze.acrylic.background.v1';
  var NS = 'tbb-';

  var controlSelectors = [
    'button', '[role="button"]', '[role="combobox"]',
    '[role="switch"]', '[role="checkbox"]', '[role="radio"]', '[role="tab"]'
  ];
  var surfaceSelectors = [
    '[role="dialog"]', '[role="menu"]', '[role="listbox"]', '[role="tooltip"]',
    '[role="alertdialog"]', '[data-radix-tooltip-content-wrapper]',
    '[data-slot="tooltip-content"]', '[data-slot="popover-content"]',
    '[data-slot="dropdown-menu-content"]', '[data-slot="select-content"]',
    '[data-slot="dialog-content"]', '[data-slot="sheet-content"]',
    '[cmdk-root]', '[class*="popover-content" i]', '[class*="dropdown-menu" i]',
    '[class*="select-content" i]', '[class*="modal-content" i]',
    '[class*="dialog-content" i]', '[class*="drawer-content" i]',
    '[class*="sheet-content" i]', '[class*="tooltip-content" i]'
  ];
  var optionSelectors = [
    '[role="option"]', '[role="menuitem"]', '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]', '[role="treeitem"]', '[cmdk-item]',
    '[data-highlighted]', '[data-selected]'
  ];

  var presets = [
    { name: '极光', value: 'radial-gradient(circle at 18% 18%, rgba(255,214,102,.95), transparent 26%), radial-gradient(circle at 78% 22%, rgba(73,190,255,.78), transparent 30%), radial-gradient(circle at 68% 78%, rgba(166,91,255,.72), transparent 28%), linear-gradient(135deg, #f8fbff 0%, #d7eef6 46%, #e7defb 100%)' },
    { name: '森林', value: 'radial-gradient(circle at 12% 14%, rgba(151,221,173,.85), transparent 28%), radial-gradient(circle at 85% 28%, rgba(95,164,208,.75), transparent 28%), linear-gradient(135deg, #eef7f0 0%, #badcc7 42%, #7fb0bb 100%)' },
    { name: '晨曦', value: 'radial-gradient(circle at 20% 16%, rgba(255,190,118,.88), transparent 28%), radial-gradient(circle at 82% 30%, rgba(255,132,150,.65), transparent 26%), linear-gradient(135deg, #fff6e8 0%, #ffd7bf 43%, #cbd7ff 100%)' },
    { name: '墨夜', value: 'radial-gradient(circle at 16% 20%, rgba(89,160,255,.55), transparent 28%), radial-gradient(circle at 75% 72%, rgba(112,229,203,.38), transparent 30%), linear-gradient(135deg, #111827 0%, #243447 46%, #304e5f 100%)' }
  ];

  function loadSaved() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (_) { return null; }
  }

  function parseHexColor(hex) {
    var v = hex.replace('#', '').trim();
    if ([3, 6].indexOf(v.length) === -1) return null;
    var full = v.length === 3 ? v.split('').map(function (c) { return c + c; }).join('') : v;
    var n = parseInt(full, 16);
    if (isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function luminance(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }

  function estimateBackgroundTone(value) {
    var colors = [], re = /#[0-9a-f]{3,6}/gi, m;
    while ((m = re.exec(String(value))) !== null) { var c = parseHexColor(m[0]); if (c) colors.push(c); }
    if (!colors.length) return 'balanced';
    var avg = colors.reduce(function (s, c) { return s + luminance(c); }, 0) / colors.length;
    return avg >= 0.72 ? 'light' : avg <= 0.36 ? 'dark' : 'balanced';
  }

  function applyAcrylicTone(tone) {
    var root = document.documentElement;
    root.dataset.YuzeTone = tone;
    var themes = {
      light: {
        panelBg: 'linear-gradient(135deg, rgba(255,255,255,.38), rgba(255,255,255,.16)), linear-gradient(135deg, rgba(245,123,52,.06), rgba(49,150,170,.07))',
        panelBgColor: 'rgba(255,255,255,.20)', panelColor: 'rgba(24,33,45,.92)', panelMuted: 'rgba(24,33,45,.60)',
        panelBorder: 'rgba(255,255,255,.42)', panelShadow: '0 18px 46px rgba(67,47,32,.16), inset 0 1px 0 rgba(255,255,255,.34)',
        itemBg: 'transparent', itemActiveBg: 'rgba(255,255,255,.28)', itemBorder: 'transparent',
        itemFocusShadow: 'inset 0 0 0 1px rgba(255,255,255,.42), 0 6px 18px rgba(67,47,32,.08)',
        textShadow: '0 1px 1px rgba(255,255,255,.42)', toolbarBg: 'rgba(255,255,255,.26)',
        toolbarActiveBg: 'rgba(255,255,255,.42)', toolbarBorder: 'rgba(255,255,255,.42)',
        toolbarActiveBorder: 'rgba(255,255,255,.60)', toolbarShadow: 'inset 0 1px 0 rgba(255,255,255,.34)',
        toolbarActiveShadow: '0 8px 18px rgba(67,47,32,.10), inset 0 1px 0 rgba(255,255,255,.48)', toolbarColor: '#314451'
      },
      balanced: {
        panelBg: 'linear-gradient(135deg, rgba(255,255,255,.30), rgba(255,255,255,.12)), linear-gradient(135deg, rgba(18,26,36,.16), rgba(18,26,36,.08))',
        panelBgColor: 'rgba(255,255,255,.16)', panelColor: 'rgba(28,38,52,.92)', panelMuted: 'rgba(28,38,52,.64)',
        panelBorder: 'rgba(255,255,255,.40)', panelShadow: '0 18px 46px rgba(8,13,20,.20), inset 0 1px 0 rgba(255,255,255,.34)',
        itemBg: 'transparent', itemActiveBg: 'rgba(255,255,255,.22)', itemBorder: 'transparent',
        itemFocusShadow: 'inset 0 0 0 1px rgba(255,255,255,.34), 0 6px 18px rgba(8,13,20,.08)',
        textShadow: '0 1px 1px rgba(255,255,255,.30)', toolbarBg: 'rgba(255,255,255,.22)',
        toolbarActiveBg: 'rgba(255,255,255,.34)', toolbarBorder: 'rgba(255,255,255,.36)',
        toolbarActiveBorder: 'rgba(255,255,255,.54)', toolbarShadow: 'inset 0 1px 0 rgba(255,255,255,.28)',
        toolbarActiveShadow: '0 8px 18px rgba(8,13,20,.10), inset 0 1px 0 rgba(255,255,255,.38)', toolbarColor: '#263847'
      },
      dark: {
        panelBg: 'linear-gradient(135deg, rgba(255,255,255,.18), rgba(255,255,255,.07)), linear-gradient(135deg, rgba(10,16,24,.50), rgba(10,16,24,.34))',
        panelBgColor: 'rgba(16,23,32,.44)', panelColor: 'rgba(248,251,255,.94)', panelMuted: 'rgba(248,251,255,.68)',
        panelBorder: 'rgba(255,255,255,.28)', panelShadow: '0 18px 48px rgba(8,13,20,.30), inset 0 1px 0 rgba(255,255,255,.24)',
        itemBg: 'transparent', itemActiveBg: 'rgba(255,255,255,.16)', itemBorder: 'transparent',
        itemFocusShadow: 'inset 0 0 0 1px rgba(255,255,255,.22), 0 6px 18px rgba(8,13,20,.12)',
        textShadow: '0 1px 2px rgba(0,0,0,.32)', toolbarBg: 'rgba(255,255,255,.14)',
        toolbarActiveBg: 'rgba(255,255,255,.22)', toolbarBorder: 'rgba(255,255,255,.30)',
        toolbarActiveBorder: 'rgba(255,255,255,.44)', toolbarShadow: 'inset 0 1px 0 rgba(255,255,255,.22)',
        toolbarActiveShadow: '0 8px 18px rgba(8,13,20,.16), inset 0 1px 0 rgba(255,255,255,.30)', toolbarColor: 'rgba(248,251,255,.88)'
      }
    };
    var t = themes[tone] || themes.balanced;
    Object.keys(t).forEach(function (key) {
      var prop = '--Yuze-' + key.replace(/[A-Z]/g, function (l) { return '-' + l.toLowerCase(); });
      document.documentElement.style.setProperty(prop, t[key]);
    });
  }

  function getOrCreateBg() {
    var bg = document.getElementById(BG_ID);
    if (!bg) {
      bg = document.createElement('div');
      bg.id = BG_ID;
      document.documentElement.prepend(bg);
    }
    return bg;
  }

  function setBackground(value) {
    var bg = getOrCreateBg();
    bg.style.backgroundImage = value;
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ value: value })); } catch (_) {}
    applyAcrylicTone(estimateBackgroundTone(value));
    updatePresetPanelActive(value);
  }

  var P = 'html[data-Yuze-acrylic="true"] ';

  function buildCSS() {
    return [
      'html[data-Yuze-acrylic="true"],html[data-Yuze-acrylic="true"] body{min-height:100%;background:transparent !important;}',
      '#' + BG_ID + '{position:fixed;inset:0;z-index:-2147483647;pointer-events:none;transform:translateZ(0);transition:background-image .45s ease,filter .45s ease;}',
      '#' + BG_ID + '::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 50% 8%,rgba(255,255,255,.34),transparent 38%),linear-gradient(rgba(255,255,255,.18),rgba(255,255,255,.06));backdrop-filter:saturate(1.05);}',
      P + 'body>div:not([data-Yuze-acrylic-target="text-panel"]):not([data-Yuze-acrylic-target="search-panel"]):not([data-Yuze-acrylic-target="shortcut-modal"]):not([data-Yuze-acrylic-target="reference-panel"]),' + P + 'main,' + P + 'section,' + P + '[class*="container"],' + P + '[class*="layout"]{background:transparent !important;}',
      P + 'input,' + P + 'textarea,' + P + '[role="textbox"],' + P + '[contenteditable="true"],' + P + 'select,' + P + '[data-Yuze-acrylic-target="field"]{background:transparent !important;border:0 !important;box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;color:var(--Yuze-panel-color) !important;}',
      P + 'input::placeholder,' + P + 'textarea::placeholder{color:var(--Yuze-panel-muted) !important;}',
      P + '[data-Yuze-acrylic-target="composer"] [role="textbox"],' + P + '[data-Yuze-acrylic-target="composer"] [contenteditable="true"],' + P + '[data-Yuze-acrylic-target="composer"] [contenteditable="plaintext-only"],' + P + '[data-Yuze-acrylic-target="field"]{color:var(--Yuze-panel-color) !important;caret-color:#f57b34 !important;font-size:15px !important;font-weight:520 !important;line-height:1.55 !important;letter-spacing:0 !important;text-shadow:none !important;}',
      P + '[data-Yuze-acrylic-target="composer"] [role="textbox"]::selection,' + P + '[data-Yuze-acrylic-target="composer"] [contenteditable="true"]::selection,' + P + '[data-Yuze-acrylic-target="composer"] [contenteditable="plaintext-only"]::selection{background:rgba(245,123,52,.22) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="composer"] [class*="placeholder" i],' + P + '[data-Yuze-acrylic-target="composer"] [data-placeholder]{color:var(--Yuze-panel-muted) !important;font-weight:500 !important;}',
      P + '[data-Yuze-acrylic-target="control"],' + P + '[data-Yuze-acrylic-target="shortcut"]{backdrop-filter:blur(18px) saturate(1.45) !important;-webkit-backdrop-filter:blur(18px) saturate(1.45) !important;}',
      P + '[data-Yuze-acrylic-target="control"]{background:var(--Yuze-toolbar-bg) !important;border-color:var(--Yuze-toolbar-border) !important;box-shadow:var(--Yuze-toolbar-shadow) !important;color:var(--Yuze-toolbar-color) !important;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease !important;}',
      P + '[data-Yuze-acrylic-target="control"]:hover{background:var(--Yuze-toolbar-active-bg) !important;border-color:var(--Yuze-toolbar-active-border) !important;box-shadow:var(--Yuze-toolbar-active-shadow) !important;transform:none !important;}',
      P + '[data-Yuze-acrylic-target="shortcut"]{background:rgba(255,255,255,.24) !important;border:1px solid rgba(255,255,255,.42) !important;box-shadow:0 14px 34px rgba(20,29,45,.13),inset 0 1px 0 rgba(255,255,255,.38) !important;border-radius:14px !important;overflow:hidden !important;}',
      P + '[data-Yuze-acrylic-target="shortcut"]:hover{background:rgba(255,255,255,.34) !important;transform:translateY(-1px);}',
      P + '[data-Yuze-acrylic-target="shortcut"] button,' + P + '[data-Yuze-acrylic-target="shortcut"] [role="button"],' + P + '[data-Yuze-acrylic-target="shortcut"] [class*="bg-" i],' + P + '[data-Yuze-acrylic-target="shortcut"]>*{background:transparent !important;border-color:transparent !important;box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-action"]{width:24px !important;height:24px !important;min-width:24px !important;min-height:24px !important;padding:0 !important;border-radius:999px !important;background:rgba(255,255,255,.36) !important;border:1px solid rgba(255,255,255,.46) !important;box-shadow:0 8px 18px rgba(20,29,45,.16),inset 0 1px 0 rgba(255,255,255,.42) !important;backdrop-filter:blur(16px) saturate(1.45) !important;-webkit-backdrop-filter:blur(16px) saturate(1.45) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-action"]:hover{background:rgba(255,255,255,.50) !important;transform:translateY(-1px);}',
      P + '[data-Yuze-acrylic-target="modal-overlay"]{background:rgba(15,23,42,.12) !important;backdrop-filter:blur(3px) saturate(1.05) !important;-webkit-backdrop-filter:blur(3px) saturate(1.05) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-modal"]{background:var(--Yuze-panel-bg) !important;background-color:var(--Yuze-panel-bg-color) !important;border:1px solid var(--Yuze-panel-border) !important;box-shadow:var(--Yuze-panel-shadow) !important;backdrop-filter:blur(28px) saturate(1.65) !important;-webkit-backdrop-filter:blur(28px) saturate(1.65) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-modal"] input,' + P + '[data-Yuze-acrylic-target="shortcut-modal"] textarea{background:rgba(255,255,255,.26) !important;border:1px solid rgba(255,255,255,.42) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.34) !important;backdrop-filter:blur(14px) saturate(1.35) !important;-webkit-backdrop-filter:blur(14px) saturate(1.35) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-modal"] button{background:rgba(255,255,255,.28) !important;border:1px solid rgba(255,255,255,.42) !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.36) !important;backdrop-filter:blur(14px) saturate(1.35) !important;-webkit-backdrop-filter:blur(14px) saturate(1.35) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-modal"] button:hover{background:rgba(255,255,255,.42) !important;}',
      P + '[data-Yuze-acrylic-target="shortcut-modal"] [class*="bg-" i]:not(input):not(textarea):not(button),' + P + '[data-Yuze-acrylic-target="shortcut-modal"] [class*="card" i]:not(input):not(textarea):not(button),' + P + '[data-Yuze-acrylic-target="shortcut-modal"] [role="button"]{background-color:transparent !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"]{background:var(--Yuze-panel-bg) !important;background-color:var(--Yuze-panel-bg-color) !important;border:1px solid var(--Yuze-panel-border) !important;box-shadow:var(--Yuze-panel-shadow) !important;backdrop-filter:blur(26px) saturate(1.62) !important;-webkit-backdrop-filter:blur(26px) saturate(1.62) !important;color:var(--Yuze-panel-color) !important;border-radius:22px !important;overflow:hidden !important;max-height:min(560px,calc(100vh - 160px)) !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] input,' + P + '[data-Yuze-acrylic-target="reference-panel"] textarea{background:rgba(255,255,255,.10) !important;border:0 !important;box-shadow:none !important;backdrop-filter:blur(14px) saturate(1.35) !important;-webkit-backdrop-filter:blur(14px) saturate(1.35) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] *:not(input):not(textarea):not(button):not(svg):not(path):not(img){background:transparent !important;background-color:transparent !important;background-image:none !important;box-shadow:none !important;border-color:transparent !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] [role="button"],' + P + '[data-Yuze-acrylic-target="reference-panel"] button{background:transparent !important;border:0 !important;box-shadow:none !important;color:var(--Yuze-panel-color) !important;border-radius:12px !important;min-height:38px !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"]{background:transparent !important;background-color:transparent !important;background-image:none !important;border:0 !important;box-shadow:none !important;border-radius:12px !important;color:var(--Yuze-panel-color) !important;min-height:38px !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"]:hover,' + P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"][aria-selected="true"],' + P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"][data-selected],' + P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"][data-highlighted],' + P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"][data-active]{background:var(--Yuze-item-active-bg) !important;background-color:var(--Yuze-item-active-bg) !important;background-image:linear-gradient(var(--Yuze-item-active-bg),var(--Yuze-item-active-bg)) !important;box-shadow:var(--Yuze-item-focus-shadow) !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] [data-Yuze-reference-row="true"] *:not(svg):not(path):not(circle):not(line):not(polyline):not(img){background:transparent !important;background-color:transparent !important;background-image:none !important;border:0 !important;border-color:transparent !important;box-shadow:none !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] svg{color:var(--Yuze-panel-muted) !important;opacity:1 !important;filter:none !important;stroke:currentColor !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] img{opacity:1 !important;filter:none !important;background:transparent !important;box-shadow:none !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] ::-webkit-scrollbar,' + P + '[data-Yuze-acrylic-target="search-panel"] ::-webkit-scrollbar,' + P + '.theme-search-panel ::-webkit-scrollbar{width:8px !important;height:8px !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] ::-webkit-scrollbar-track,' + P + '[data-Yuze-acrylic-target="search-panel"] ::-webkit-scrollbar-track,' + P + '.theme-search-panel ::-webkit-scrollbar-track{background:transparent !important;}',
      P + '[data-Yuze-acrylic-target="reference-panel"] ::-webkit-scrollbar-thumb,' + P + '[data-Yuze-acrylic-target="search-panel"] ::-webkit-scrollbar-thumb,' + P + '.theme-search-panel ::-webkit-scrollbar-thumb{background:var(--Yuze-toolbar-active-bg) !important;border-radius:999px !important;border:2px solid transparent !important;background-clip:padding-box !important;}',
      P + '[data-Yuze-acrylic-target="tooltip"],' + P + '[role="tooltip"],' + P + '[data-radix-tooltip-content-wrapper],' + P + '[data-slot="tooltip-content"],' + P + '[data-state="delayed-open"],' + P + '[data-state="instant-open"],' + P + '[class*="tooltip-content" i]{background:var(--Yuze-panel-bg) !important;color:var(--Yuze-panel-color) !important;border:1px solid var(--Yuze-panel-border) !important;box-shadow:var(--Yuze-panel-shadow) !important;backdrop-filter:blur(18px) saturate(1.45) !important;-webkit-backdrop-filter:blur(18px) saturate(1.45) !important;border-radius:10px !important;}',
      P + '[data-Yuze-acrylic-target="tooltip"] *,' + P + '[role="tooltip"] *,' + P + '[data-slot="tooltip-content"] *,' + P + '[data-state="delayed-open"] *,' + P + '[data-state="instant-open"] *,' + P + '[class*="tooltip-content" i] *{background:transparent !important;color:inherit !important;border-color:transparent !important;box-shadow:none !important;}',
      P + '[data-radix-tooltip-arrow],' + P + '[data-slot="tooltip-arrow"],' + P + '[class*="tooltip-arrow" i]{display:none !important;opacity:0 !important;visibility:hidden !important;}',
      P + '[data-Yuze-acrylic-target="composer"],' + P + '[data-Yuze-acrylic-target="module"],' + P + '[data-Yuze-acrylic-target="surface"],' + P + '[data-Yuze-acrylic-target="menu"],' + P + '[role="dialog"],' + P + '[role="menu"],' + P + '[role="menubar"],' + P + '[role="listbox"],' + P + '[role="tooltip"],' + P + '[role="alertdialog"],' + P + '[data-slot="popover-content"],' + P + '[data-slot="dropdown-menu-content"],' + P + '[data-slot="select-content"],' + P + '[data-slot="dialog-content"],' + P + '[data-slot="sheet-content"],' + P + '[class*="popover-content" i],' + P + '[class*="dropdown-menu" i],' + P + '[class*="select-content" i],' + P + '[class*="modal-content" i],' + P + '[class*="dialog-content" i],' + P + '[class*="drawer-content" i],' + P + '[class*="sheet-content" i]{background:var(--Yuze-panel-bg) !important;background-color:var(--Yuze-panel-bg-color) !important;border:1px solid var(--Yuze-panel-border) !important;box-shadow:var(--Yuze-panel-shadow) !important;backdrop-filter:blur(24px) saturate(1.62) !important;-webkit-backdrop-filter:blur(24px) saturate(1.62) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="composer"]{border-radius:28px !important;overflow:hidden !important;}',
      P + '[data-Yuze-acrylic-target="toolbar"],' + P + '[data-Yuze-acrylic-target="field-row"]{background:transparent !important;border:0 !important;box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;}',
      P + '[data-Yuze-acrylic-target="toolbar"] button,' + P + '[data-Yuze-acrylic-target="toolbar"] [role="button"],' + P + '[data-Yuze-acrylic-target="toolbar"] [role="combobox"],' + P + '[data-Yuze-acrylic-target="toolbar"] [data-slot="tooltip-trigger"],' + P + '.theme-input-toolbar button,' + P + '.theme-input-toolbar [role="button"],' + P + '.theme-input-toolbar [role="combobox"],' + P + '.theme-input-toolbar [data-slot="tooltip-trigger"],' + P + '.theme-input-toolbar [data-slot="select-trigger"]{background:var(--Yuze-toolbar-bg) !important;background-color:var(--Yuze-toolbar-bg) !important;background-image:none !important;border:1px solid var(--Yuze-toolbar-border) !important;border-color:var(--Yuze-toolbar-border) !important;box-shadow:var(--Yuze-toolbar-shadow) !important;color:var(--Yuze-toolbar-color) !important;backdrop-filter:blur(16px) saturate(1.35) !important;-webkit-backdrop-filter:blur(16px) saturate(1.35) !important;transform:none !important;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease !important;}',
      P + '[data-Yuze-acrylic-target="toolbar"] button:hover,' + P + '[data-Yuze-acrylic-target="toolbar"] [role="button"]:hover,' + P + '[data-Yuze-acrylic-target="toolbar"] [role="combobox"]:hover,' + P + '[data-Yuze-acrylic-target="toolbar"] [data-slot="tooltip-trigger"]:hover,' + P + '.theme-input-toolbar button:hover,' + P + '.theme-input-toolbar [role="button"]:hover,' + P + '.theme-input-toolbar [role="combobox"]:hover,' + P + '.theme-input-toolbar [data-slot="tooltip-trigger"]:hover,' + P + '.theme-input-toolbar [data-slot="select-trigger"]:hover,' + P + '.theme-input-toolbar button[data-state="open"],' + P + '.theme-input-toolbar [aria-expanded="true"]{background:var(--Yuze-toolbar-active-bg) !important;background-color:var(--Yuze-toolbar-active-bg) !important;background-image:none !important;border-color:var(--Yuze-toolbar-active-border) !important;box-shadow:var(--Yuze-toolbar-active-shadow) !important;transform:none !important;}',
      P + '.theme-input-toolbar svg,' + P + '.theme-input-toolbar svg *,' + P + '[data-Yuze-acrylic-target="toolbar"] svg,' + P + '[data-Yuze-acrylic-target="toolbar"] svg *{color:var(--Yuze-toolbar-color) !important;opacity:1 !important;filter:none !important;}',
      P + '[data-Yuze-acrylic-target="search-panel"],' + P + '[data-Yuze-acrylic-target="text-panel"],' + P + '.theme-search-panel,' + P + '[data-slot="hover-card-content"],' + P + '[class*="hover-card-content" i]{background:var(--Yuze-panel-bg) !important;background-color:var(--Yuze-panel-bg-color) !important;border:1px solid var(--Yuze-panel-border) !important;border-top:1px solid var(--Yuze-panel-border) !important;box-shadow:var(--Yuze-panel-shadow) !important;backdrop-filter:blur(30px) saturate(1.75) contrast(1.06) brightness(1.04) !important;-webkit-backdrop-filter:blur(30px) saturate(1.75) contrast(1.06) brightness(1.04) !important;color:var(--Yuze-panel-color) !important;}',
      P + '[data-Yuze-acrylic-target="search-panel"],' + P + '.theme-search-panel{border-radius:24px !important;overflow:hidden !important;margin-top:10px !important;transform:translateY(0) !important;box-shadow:0 22px 44px rgba(8,13,20,.14),inset 0 1px 0 rgba(255,255,255,.18) !important;}',
      P + '[data-Yuze-acrylic-target="text-panel"]{border-radius:18px !important;overflow:hidden !important;z-index:2147483602 !important;}',
      P + '[data-Yuze-acrylic-target="search-panel"] [class*="bg-" i],' + P + '.theme-search-panel [class*="bg-" i]{background:transparent !important;background-color:transparent !important;background-image:none !important;}',
      P + '[data-Yuze-acrylic-target="search-suggestion"],' + P + '[data-Yuze-acrylic-target="text-item"],' + P + '.theme-search-panel [class*="group"][class*="items-center"]{background:var(--Yuze-item-bg) !important;background-color:var(--Yuze-item-bg) !important;background-image:none !important;border:1px solid var(--Yuze-item-border) !important;box-shadow:none !important;border-radius:12px !important;min-height:40px !important;padding-left:10px !important;padding-right:10px !important;color:var(--Yuze-panel-color) !important;font-weight:520 !important;transition:background .16s ease,color .16s ease !important;transform:none !important;}',
      P + '[data-Yuze-acrylic-target="search-suggestion"]:hover,' + P + '[data-Yuze-acrylic-target="search-suggestion"][aria-selected="true"],' + P + '[data-Yuze-acrylic-target="search-suggestion"][data-highlighted],' + P + '[data-Yuze-acrylic-target="search-suggestion"][data-Yuze-keyboard-active="true"],' + P + '[data-Yuze-acrylic-target="text-item"]:hover,' + P + '[data-Yuze-acrylic-target="text-item"][aria-selected="true"],' + P + '[data-Yuze-acrylic-target="text-item"][data-selected="true"],' + P + '.theme-search-panel [class*="group"][class*="items-center"]:hover{background:var(--Yuze-item-active-bg) !important;border-color:transparent !important;background-color:var(--Yuze-item-active-bg) !important;background-image:linear-gradient(var(--Yuze-item-active-bg),var(--Yuze-item-active-bg)) !important;box-shadow:var(--Yuze-item-focus-shadow) !important;color:var(--Yuze-panel-color) !important;transform:none !important;}',
      P + '[data-Yuze-acrylic-target="search-panel"] [role="button"],' + P + '.theme-search-panel [role="button"]{background:transparent !important;border-color:transparent !important;box-shadow:none !important;backdrop-filter:none !important;-webkit-backdrop-filter:none !important;color:var(--Yuze-panel-color) !important;transform:none !important;}',
      P + '[data-Yuze-acrylic-target="option"],' + P + '[role="option"],' + P + '[role="menuitem"],' + P + '[role="menuitemcheckbox"],' + P + '[role="menuitemradio"],' + P + '[role="treeitem"],' + P + '[cmdk-item]{background:transparent !important;border:0 !important;border-radius:10px !important;box-shadow:none !important;color:var(--Yuze-panel-color) !important;transition:background .16s ease,color .16s ease;}',
      P + '[data-Yuze-acrylic-target="option"]:hover,' + P + '[role="option"]:hover,' + P + '[role="menuitem"]:hover,' + P + '[role="menuitemcheckbox"]:hover,' + P + '[role="menuitemradio"]:hover,' + P + '[role="treeitem"]:hover,' + P + '[cmdk-item]:hover,' + P + '[data-highlighted],' + P + '[data-selected="true"],' + P + '[aria-selected="true"]{background:var(--Yuze-item-active-bg) !important;border-color:transparent !important;box-shadow:none !important;}',
      P + '[data-Yuze-acrylic-target="module"] *,' + P + '[data-Yuze-acrylic-target="composer"] *,' + P + '[data-Yuze-acrylic-target="surface"] *,' + P + '[data-Yuze-acrylic-target="menu"] *{text-shadow:none !important;}',
      P + 'img{filter:saturate(1.05) contrast(1.02);}'
    ].join('');
  }

  var acrylicObserver = null;

  function isInMasterUI(el) {
    if (!el) return false;
    var drawer = document.getElementById(NS + 'drawer');
    var entryBtn = document.getElementById(NS + 'entry-btn');
    var presetPanel = document.getElementById(PRESET_PANEL_ID);
    if (drawer && drawer.contains(el)) return true;
    if (entryBtn && (entryBtn === el || entryBtn.contains(el))) return true;
    if (presetPanel && presetPanel.contains(el)) return true;
    return false;
  }

  function isExternalFloatingBall(el) {
    if (!el) return false;
    var st = getComputedStyle(el);
    if (st.position !== 'fixed' && st.position !== 'absolute') return false;
    var rect = el.getBoundingClientRect();
    var isSmallRound = rect.width <= 72 && rect.height <= 72 && parseFloat(st.borderRadius) >= rect.width * 0.4;
    if (!isSmallRound) return false;
    var isCorner = (rect.right > window.innerWidth - 80 || rect.left < 80) && (rect.bottom > window.innerHeight - 80 || rect.top < 80);
    return isCorner;
  }

  function shouldSkipElement(el) {
    if (!el || el === document.documentElement || el === document.body) return true;
    if (el.id === BG_ID || el.id === STYLE_ID || el.id === PRESET_PANEL_ID) return true;
    if (isInMasterUI(el)) return true;
    if (isExternalFloatingBall(el)) return true;
    var parent = el.parentElement;
    while (parent && parent !== document.body) {
      if (isExternalFloatingBall(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function cssVar(name, fallback) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function getToolbarStyle(active) {
    return {
      background: cssVar(active ? '--Yuze-toolbar-active-bg' : '--Yuze-toolbar-bg', active ? 'rgba(255,255,255,.34)' : 'rgba(255,255,255,.22)'),
      borderColor: cssVar(active ? '--Yuze-toolbar-active-border' : '--Yuze-toolbar-border', active ? 'rgba(255,255,255,.54)' : 'rgba(255,255,255,.36)'),
      boxShadow: cssVar(active ? '--Yuze-toolbar-active-shadow' : '--Yuze-toolbar-shadow', 'inset 0 1px 0 rgba(255,255,255,.28)'),
      color: cssVar('--Yuze-toolbar-color', '#314451')
    };
  }

  function isCompactToolbarControl(el) {
    var rect = el.getBoundingClientRect();
    return rect.width <= 44 && rect.height <= 44 && (el.innerText || el.textContent || '').trim().length === 0;
  }

  function isShortTextToolbarControl(el) {
    var text = (el.innerText || el.textContent || '').trim();
    return text.length > 0 && text.length <= 6 && !/DeepSeek|Gemini|Claude|GPT|Kimi|GLM/i.test(text);
  }

  function setToolbarControlState(el, active) {
    var style = getToolbarStyle(active);
    var isCompact = isCompactToolbarControl(el);
    var isShortText = !isCompact && isShortTextToolbarControl(el);
    var text = (el.innerText || el.textContent || '').trim();
    el.style.setProperty('background', style.background, 'important');
    el.style.setProperty('background-color', style.background, 'important');
    el.style.setProperty('background-image', 'none', 'important');
    el.style.setProperty('border-color', style.borderColor, 'important');
    el.style.setProperty('box-shadow', style.boxShadow, 'important');
    el.style.setProperty('color', style.color, 'important');
    el.style.setProperty('border-radius', '999px', 'important');
    if (isCompact) {
      el.style.setProperty('width', '32px', 'important');
      el.style.setProperty('height', '32px', 'important');
      el.style.setProperty('min-width', '32px', 'important');
      el.style.setProperty('min-height', '32px', 'important');
      el.style.setProperty('padding', '0', 'important');
    } else if (isShortText) {
      var minWidth = Math.max(54, Math.min(86, text.length * 10 + 30));
      el.style.setProperty('width', 'auto', 'important');
      el.style.setProperty('min-width', minWidth + 'px', 'important');
      el.style.setProperty('height', '36px', 'important');
      el.style.setProperty('min-height', '36px', 'important');
      el.style.setProperty('padding', '0 13px', 'important');
      el.style.setProperty('white-space', 'nowrap', 'important');
      el.style.setProperty('flex-shrink', '0', 'important');
    } else {
      el.style.setProperty('width', 'auto', 'important');
      el.style.setProperty('min-height', '32px', 'important');
      el.style.setProperty('padding-left', '12px', 'important');
      el.style.setProperty('padding-right', '12px', 'important');
      el.style.setProperty('white-space', 'nowrap', 'important');
      el.style.setProperty('flex-shrink', '0', 'important');
    }
    el.style.setProperty('opacity', '1', 'important');
    el.style.setProperty('filter', 'none', 'important');
    el.style.setProperty('transform', 'none', 'important');
    el.style.setProperty('transition', 'border-color .14s ease, box-shadow .14s ease', 'important');
    el.querySelectorAll('svg, svg *').forEach(function (s) {
      s.style.setProperty('color', style.color, 'important');
      s.style.setProperty('opacity', '1', 'important');
      s.style.setProperty('filter', 'none', 'important');
      if (s.hasAttribute('stroke')) s.style.setProperty('stroke', 'currentColor', 'important');
    });
  }

  function findComposer(el) {
    var current = el.parentElement, depth = 0;
    while (current && depth < 8) {
      if (shouldSkipElement(current)) return null;
      var rect = current.getBoundingClientRect();
      if (!!current.querySelector('.theme-input-toolbar') && !!current.querySelector('[role="textbox"], textarea, [contenteditable="true"]') && rect.width >= 320 && rect.height >= 80 && rect.height <= 220) return current;
      current = current.parentElement; depth++;
    }
    return null;
  }

  function tagComposerParts() {
    document.querySelectorAll('[role="textbox"], textarea, [contenteditable="true"]').forEach(function (field) {
      if (shouldSkipElement(field)) return;
      var composer = findComposer(field);
      if (!composer) return;
      composer.setAttribute('data-Yuze-acrylic-target', 'composer');
      var fieldRow = field.closest('.flex-1, [class*="overflow-y-auto"]');
      if (fieldRow && composer.contains(fieldRow) && fieldRow !== composer && fieldRow !== field) fieldRow.setAttribute('data-Yuze-acrylic-target', 'field-row');
      var toolbar = composer.querySelector('.theme-input-toolbar');
      if (toolbar) toolbar.setAttribute('data-Yuze-acrylic-target', 'toolbar');
    });
  }

  function tagShortcutCards() {
    document.querySelectorAll('[class*="shortcut-gap"]').forEach(function (row) {
      if (shouldSkipElement(row)) return;
      row.removeAttribute('data-Yuze-acrylic-target');
      Array.from(row.children).forEach(function (card) {
        if (shouldSkipElement(card)) return;
        var rect = card.getBoundingClientRect();
        if (rect.width < 48 || rect.width > 128 || rect.height < 48 || rect.height > 128) return;
        card.setAttribute('data-Yuze-acrylic-target', 'shortcut');
        card.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) { c.removeAttribute('data-Yuze-acrylic-target'); });
        card.querySelectorAll('button').forEach(function (btn) { if (btn !== card) btn.setAttribute('data-Yuze-acrylic-target', 'shortcut-action'); });
      });
    });
  }

  function tagShortcutModal() {
    document.querySelectorAll("body > div, body [class*='fixed']").forEach(function (overlay) {
      if (shouldSkipElement(overlay)) return;
      var oRect = overlay.getBoundingClientRect();
      var oText = (overlay.innerText || overlay.textContent || '').trim();
      if (oRect.width < window.innerWidth * 0.8 || oRect.height < window.innerHeight * 0.8 || !/新增快捷方式|编辑快捷方式|名称|URL/i.test(oText)) return;
      overlay.setAttribute('data-Yuze-acrylic-target', 'modal-overlay');
      var panels = Array.from(overlay.querySelectorAll('div, form, section')).filter(function (p) {
        if (shouldSkipElement(p)) return false;
        var r = p.getBoundingClientRect(), t = (p.innerText || p.textContent || '').trim();
        return r.width >= 260 && r.width <= 520 && r.height >= 220 && r.height <= 720 && /新增快捷方式|编辑快捷方式|名称|URL/i.test(t);
      });
      panels.sort(function (a, b) { var ar = a.getBoundingClientRect(), br = b.getBoundingClientRect(); return br.width * br.height - ar.width * ar.height; });
      var panel = panels[0]; if (!panel) return;
      panel.setAttribute('data-Yuze-acrylic-target', 'shortcut-modal');
      panel.querySelectorAll('input, textarea').forEach(function (f) { f.setAttribute('data-Yuze-acrylic-target', 'modal-field'); });
    });
  }

  function tagReferencePanels() {
    var pat = /[所已打开标签页收藏上传本地文件标签页组查看全部搜索未找到相关结果]/;
    document.querySelectorAll('[role="dialog"], [role="menu"], [data-popper-placement], [data-radix-popper-content-wrapper]').forEach(function (panel) {
      if (shouldSkipElement(panel)) return;
      var rect = panel.getBoundingClientRect(), text = (panel.innerText || panel.textContent || '').trim();
      if (rect.width < 220 || rect.width > 520 || rect.height < 92 || rect.height > 520 || !pat.test(text) || !panel.querySelector("input, [role='button'], button")) return;
      var inner = panel.matches('[role="dialog"], [role="menu"]') ? panel : panel.querySelector('[role="dialog"], [role="menu"]');
      var target = inner || panel;
      target.setAttribute('data-Yuze-acrylic-target', 'reference-panel');
      target.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) { if (c !== target) c.removeAttribute('data-Yuze-acrylic-target'); });
      target.querySelectorAll('input, textarea').forEach(function (f) { f.setAttribute('data-Yuze-acrylic-target', 'reference-field'); });
    });
  }

  function tagSearchSuggestions() {
    document.querySelectorAll(".theme-search-panel, [class*='theme-search-panel']").forEach(function (panel) {
      if (shouldSkipElement(panel) || panel.closest('[data-Yuze-acrylic-target="reference-panel"]')) return;
      panel.setAttribute('data-Yuze-acrylic-target', 'search-panel');
      panel.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) { if (c !== panel) c.removeAttribute('data-Yuze-acrylic-target'); });
      Array.from(panel.querySelectorAll("div, button, [role='button']")).forEach(function (item) {
        if (shouldSkipElement(item) || item.closest('[data-Yuze-acrylic-target="search-suggestion"]')) return;
        var rect = item.getBoundingClientRect(), text = (item.innerText || item.textContent || '').trim();
        if (rect.width < 260 || rect.height < 24 || rect.height > 56 || !text || item.querySelector('.theme-search-panel')) return;
        item.setAttribute('data-Yuze-acrylic-target', 'search-suggestion');
        item.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) { c.removeAttribute('data-Yuze-acrylic-target'); });
      });
    });
  }

  function tagTooltips() {
    document.querySelectorAll('[role="tooltip"], [data-radix-tooltip-content-wrapper], [data-slot="tooltip-content"], [data-state="delayed-open"], [data-state="instant-open"], [class*="tooltip-content" i]').forEach(function (el) {
      if (!shouldSkipElement(el)) el.setAttribute('data-Yuze-acrylic-target', 'tooltip');
    });
  }

  function neutralizeNativeTooltips() {
    document.querySelectorAll('[title]').forEach(function (el) {
      if (shouldSkipElement(el)) return;
      var t = el.getAttribute('title'); if (!t) return;
      if (!el.getAttribute('data-Yuze-title')) el.setAttribute('data-Yuze-title', t);
      el.removeAttribute('title');
    });
  }

  function polishToolbarControls() {
    document.querySelectorAll(".theme-input-toolbar, [data-Yuze-acrylic-target='toolbar']").forEach(function (toolbar) {
      if (shouldSkipElement(toolbar)) return;
      toolbar.querySelectorAll("button, [role='button'], [role='combobox'], [data-slot='tooltip-trigger'], [data-slot='select-trigger']").forEach(function (ctrl) {
        if (shouldSkipElement(ctrl)) return;
        var active = ctrl.matches(':hover') || ctrl.getAttribute('data-state') === 'open' || ctrl.getAttribute('aria-expanded') === 'true';
        setToolbarControlState(ctrl, active);
        if (ctrl.dataset.YuzeToolbarBound === 'true') return;
        ctrl.dataset.YuzeToolbarBound = 'true';
        ctrl.addEventListener('mouseenter', function () { setToolbarControlState(ctrl, true); });
        ctrl.addEventListener('mouseleave', function () { setToolbarControlState(ctrl, false); });
        ctrl.addEventListener('focus', function () { setToolbarControlState(ctrl, true); });
        ctrl.addEventListener('blur', function () { setToolbarControlState(ctrl, false); });
        ctrl.addEventListener('click', function () { setToolbarControlState(ctrl, true); setTimeout(function () { setToolbarControlState(ctrl, ctrl.getAttribute('aria-expanded') === 'true'); }, 260); });
      });
    });
  }

  function isActiveReadableItem(item) {
    var cls = String(item.className || '');
    return item.matches(':hover') || item.getAttribute('data-state') === 'open' || item.getAttribute('aria-selected') === 'true' || item.getAttribute('aria-current') === 'true' || item.hasAttribute('data-selected') || item.hasAttribute('data-highlighted') || item.hasAttribute('data-active') || item.getAttribute('data-Yuze-keyboard-active') === 'true' || /\b(active|selected|highlighted?|focused?|current)\b/i.test(cls);
  }

  function setReadablePanelStyle(panel) {
    var panelBg = cssVar('--Yuze-panel-bg', 'linear-gradient(135deg, rgba(255,255,255,.36), rgba(255,255,255,.16))');
    var panelBgColor = cssVar('--Yuze-panel-bg-color', 'rgba(255,255,255,.20)');
    var panelColor = cssVar('--Yuze-panel-color', 'rgba(28,38,52,.92)');
    var panelMuted = cssVar('--Yuze-panel-muted', 'rgba(28,38,52,.64)');
    var panelBorder = cssVar('--Yuze-panel-border', 'rgba(255,255,255,.40)');
    var panelShadow = cssVar('--Yuze-panel-shadow', '0 18px 46px rgba(8,13,20,.20), inset 0 1px 0 rgba(255,255,255,.34)');
    panel.style.setProperty('background', panelBg, 'important');
    panel.style.setProperty('background-color', panelBgColor, 'important');
    panel.style.setProperty('background-image', panelBg, 'important');
    panel.style.setProperty('color', panelColor, 'important');
    panel.style.setProperty('border', '1px solid ' + panelBorder, 'important');
    panel.style.setProperty('border-color', panelBorder, 'important');
    panel.style.setProperty('box-shadow', panelShadow, 'important');
    panel.style.setProperty('backdrop-filter', 'blur(30px) saturate(1.75) contrast(1.06) brightness(1.04)', 'important');
    panel.style.setProperty('-webkit-backdrop-filter', 'blur(30px) saturate(1.75) contrast(1.06) brightness(1.04)', 'important');
    panel.querySelectorAll('svg').forEach(function (svg) { svg.style.setProperty('color', panelMuted, 'important'); svg.style.setProperty('stroke', 'currentColor', 'important'); });
    panel.querySelectorAll('*:not(svg):not(path):not(circle):not(line):not(polyline):not(img)').forEach(function (c) { c.style.setProperty('color', panelColor, 'important'); });
  }

  function setReadableItemStyle(item, active) {
    var panelColor = cssVar('--Yuze-panel-color', 'rgba(28,38,52,.92)');
    var itemBg = active ? cssVar('--Yuze-item-active-bg', 'rgba(255,255,255,.22)') : 'transparent';
    var shadow = active ? cssVar('--Yuze-item-focus-shadow', 'inset 0 0 0 1px rgba(255,255,255,.34)') : 'none';
    item.style.setProperty('background', itemBg, 'important');
    item.style.setProperty('background-color', itemBg, 'important');
    item.style.setProperty('background-image', active ? 'linear-gradient(' + itemBg + ',' + itemBg + ')' : 'none', 'important');
    item.style.setProperty('border-color', 'transparent', 'important');
    item.style.setProperty('box-shadow', shadow, 'important');
    item.style.setProperty('color', panelColor, 'important');
    item.style.setProperty('transform', 'none', 'important');
    item.querySelectorAll('*:not(svg):not(path):not(circle):not(line):not(polyline):not(img)').forEach(function (c) {
      c.style.setProperty('color', panelColor, 'important');
      c.style.setProperty('background', 'transparent', 'important');
      c.style.setProperty('background-color', 'transparent', 'important');
      c.style.setProperty('background-image', 'none', 'important');
      c.style.setProperty('border-color', 'transparent', 'important');
      c.style.setProperty('box-shadow', 'none', 'important');
    });
  }

  function polishReadablePanels() {
    document.querySelectorAll('[data-Yuze-acrylic-target="search-panel"], [data-Yuze-acrylic-target="text-panel"], .theme-search-panel').forEach(function (panel) {
      if (shouldSkipElement(panel) || panel.matches('[data-Yuze-acrylic-target="reference-panel"]') || panel.closest('[data-Yuze-acrylic-target="reference-panel"]')) return;
      var isSearchPanel = panel.matches('[data-Yuze-acrylic-target="search-panel"], .theme-search-panel, [class*="theme-search-panel"]');
      var panelText = (panel.innerText || panel.textContent || '').trim();
      if (isSearchPanel && !panelText) {
        panel.style.setProperty('display', 'none', 'important');
        panel.style.setProperty('height', '0', 'important');
        panel.style.setProperty('min-height', '0', 'important');
        panel.style.setProperty('padding', '0', 'important');
        panel.style.setProperty('border', '0', 'important');
        panel.style.setProperty('box-shadow', 'none', 'important');
        return;
      }
      if (isSearchPanel) {
        panel.style.removeProperty('display');
        panel.style.removeProperty('height');
        panel.style.removeProperty('min-height');
        panel.style.removeProperty('padding');
      }
      setReadablePanelStyle(panel);
      if (isSearchPanel) {
        panel.style.setProperty('border-radius', '24px', 'important');
        panel.style.setProperty('border-top-color', cssVar('--Yuze-panel-border', 'rgba(255,255,255,.40)'), 'important');
        panel.style.setProperty('margin-top', '10px', 'important');
        panel.style.setProperty('transform', 'translateY(0)', 'important');
        panel.style.setProperty('box-shadow', '0 22px 44px rgba(8,13,20,.14), inset 0 1px 0 rgba(255,255,255,.18)', 'important');
      }
      panel.querySelectorAll("[data-Yuze-acrylic-target='search-suggestion'], [data-Yuze-acrylic-target='text-item'], [role='button'], [role='option'], [role='menuitem'], li, button, [class*='group'][class*='items-center']").forEach(function (item) {
        var ns = item.closest('[data-Yuze-acrylic-target="search-suggestion"]');
        var nt = item.closest('[data-Yuze-acrylic-target="text-item"]');
        if ((ns && ns !== item) || (nt && nt !== item)) return;
        var rect = item.getBoundingClientRect(), text = (item.innerText || item.textContent || '').trim();
        if (rect.width < 120 || rect.height < 18 || rect.height > 72 || !text) return;
        setReadableItemStyle(item, isActiveReadableItem(item));
        if (item.dataset.YuzeReadableBound === 'true') return;
        item.dataset.YuzeReadableBound = 'true';
        item.addEventListener('mouseenter', function () { setReadableItemStyle(item, true); });
        item.addEventListener('mouseleave', function () { setReadableItemStyle(item, isActiveReadableItem(item)); });
        item.addEventListener('focus', function () { setReadableItemStyle(item, true); }, true);
        item.addEventListener('blur', function () { setTimeout(function () { setReadableItemStyle(item, isActiveReadableItem(item)); }, 0); }, true);
      });
    });
  }

  function setMenuItemStyle(item, active) {
    var panelColor = cssVar('--Yuze-panel-color', 'rgba(28,38,52,.92)');
    var itemActiveBg = cssVar('--Yuze-item-active-bg', 'rgba(255,255,255,.22)');
    item.style.setProperty('background', active ? itemActiveBg : 'transparent', 'important');
    item.style.setProperty('background-color', active ? itemActiveBg : 'transparent', 'important');
    item.style.setProperty('background-image', 'none', 'important');
    item.style.setProperty('border', '0', 'important');
    item.style.setProperty('box-shadow', 'none', 'important');
    item.style.setProperty('border-radius', '10px', 'important');
    item.style.setProperty('color', panelColor, 'important');
    item.style.setProperty('transition', 'background .14s ease, color .14s ease', 'important');
    item.querySelectorAll('*:not(svg):not(path):not(circle):not(line):not(polyline):not(img)').forEach(function (c) {
      c.style.setProperty('background-color', 'transparent', 'important');
      c.style.setProperty('box-shadow', 'none', 'important');
      c.style.setProperty('color', panelColor, 'important');
    });
  }

  function polishMenuPanels() {
    document.querySelectorAll('[data-Yuze-acrylic-target="menu"], [role="menu"], [role="listbox"], [data-slot="dropdown-menu-content"], [data-slot="select-content"], [class*="dropdown-menu" i], [class*="select-content" i]').forEach(function (panel) {
      if (shouldSkipElement(panel) || panel.closest('[data-Yuze-acrylic-target="reference-panel"]')) return;
      setReadablePanelStyle(panel);
      panel.style.setProperty('border-radius', '16px', 'important');
      panel.style.setProperty('overflow', 'hidden', 'important');
      panel.querySelectorAll('[role="option"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], button, [role="button"], li').forEach(function (item) {
        var rect = item.getBoundingClientRect(), text = (item.innerText || item.textContent || '').trim();
        if (rect.width < 80 || rect.height < 18 || rect.height > 76 || !text) return;
        var active = item.matches(':hover') || item.getAttribute('data-highlighted') === 'true' || item.getAttribute('data-state') === 'open' || item.getAttribute('aria-selected') === 'true' || item.getAttribute('data-selected') === 'true';
        setMenuItemStyle(item, active);
        if (item.dataset.YuzeMenuBound === 'true') return;
        item.dataset.YuzeMenuBound = 'true';
        item.addEventListener('mouseenter', function () { setMenuItemStyle(item, true); });
        item.addEventListener('mouseleave', function () { setMenuItemStyle(item, item.getAttribute('aria-selected') === 'true' || item.getAttribute('data-selected') === 'true'); });
      });
    });
  }

  function isReferenceRowActive(row) {
    return row.matches(':hover') || row.getAttribute('aria-selected') === 'true' || row.hasAttribute('data-selected') || row.hasAttribute('data-highlighted') || row.hasAttribute('data-active') || /active|selected|highlight/i.test(String(row.className || ''));
  }

  function getReferenceRows(panel) {
    var panelRect = panel.getBoundingClientRect();
    var candidates = Array.from(panel.querySelectorAll("button, [role='button'], li, [data-radix-collection-item], [cmdk-item], [class*='item' i], [class*='group' i]")).filter(function (item) {
      var rect = item.getBoundingClientRect(), text = (item.innerText || item.textContent || '').trim();
      return text && rect.width >= Math.min(120, panelRect.width * 0.5) && rect.height >= 20 && rect.height <= 88 && !item.matches('input, textarea');
    });
    return candidates.filter(function (item) {
      return !candidates.some(function (other) {
        if (other === item || !other.contains(item)) return false;
        var or = other.getBoundingClientRect(), ir = item.getBoundingClientRect();
        return or.width >= ir.width && or.height <= 96;
      });
    });
  }

  function setReferenceRowStyle(row, active) {
    row.removeAttribute('data-Yuze-acrylic-target');
    row.dataset.YuzeReferenceRow = 'true';
    if (row.getAnimations) row.getAnimations({ subtree: false }).forEach(function (a) { a.cancel(); });
    setMenuItemStyle(row, active);
    if (!active) {
      row.style.setProperty('background', 'transparent', 'important');
      row.style.setProperty('background-color', 'transparent', 'important');
      row.style.setProperty('background-image', 'none', 'important');
      row.style.setProperty('box-shadow', 'none', 'important');
    } else {
      var activeBg = cssVar('--Yuze-item-active-bg', 'rgba(255,255,255,.22)');
      row.style.setProperty('background', activeBg, 'important');
      row.style.setProperty('background-color', activeBg, 'important');
      row.style.setProperty('background-image', 'linear-gradient(' + activeBg + ',' + activeBg + ')', 'important');
      row.style.setProperty('box-shadow', cssVar('--Yuze-item-focus-shadow', 'inset 0 0 0 1px rgba(255,255,255,.34)'), 'important');
    }
    row.style.setProperty('min-height', '38px', 'important');
    row.style.setProperty('padding-left', '10px', 'important');
    row.style.setProperty('padding-right', '10px', 'important');
    row.style.setProperty('animation', 'none', 'important');
    row.querySelectorAll('*:not(svg):not(path):not(circle):not(line):not(polyline):not(img)').forEach(function (child) {
      child.removeAttribute('data-Yuze-reference-row');
      child.removeAttribute('data-Yuze-acrylic-target');
      if (child.getAnimations) child.getAnimations({ subtree: false }).forEach(function (a) { a.cancel(); });
      child.style.setProperty('background', 'transparent', 'important');
      child.style.setProperty('background-color', 'transparent', 'important');
      child.style.setProperty('background-image', 'none', 'important');
      child.style.setProperty('border', '0', 'important');
      child.style.setProperty('border-color', 'transparent', 'important');
      child.style.setProperty('box-shadow', 'none', 'important');
      child.style.setProperty('animation', 'none', 'important');
    });
  }

  var referencePolishQueued = false;

  function queueReferencePanelPolish() {
    if (referencePolishQueued) return;
    referencePolishQueued = true;
    requestAnimationFrame(function () { referencePolishQueued = false; polishReferencePanels(); });
  }

  function polishReferencePanels() {
    document.querySelectorAll('[data-Yuze-acrylic-target="reference-panel"]').forEach(function (panel) {
      if (shouldSkipElement(panel)) return;
      setReadablePanelStyle(panel);
      panel.style.setProperty('border-radius', '22px', 'important');
      panel.style.setProperty('overflow', 'hidden', 'important');
      panel.style.setProperty('max-height', 'min(560px, calc(100vh - 160px))', 'important');
      if (panel.dataset.YuzeReferencePanelBound !== 'true') {
        panel.dataset.YuzeReferencePanelBound = 'true';
        panel.addEventListener('pointerover', queueReferencePanelPolish, true);
        panel.addEventListener('pointerout', queueReferencePanelPolish, true);
        panel.addEventListener('focusin', queueReferencePanelPolish, true);
      }
      panel.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) {
        if (c !== panel && c.getAttribute('data-Yuze-acrylic-target') !== 'reference-field') c.removeAttribute('data-Yuze-acrylic-target');
      });
      panel.querySelectorAll('[data-Yuze-reference-row]').forEach(function (r) { r.removeAttribute('data-Yuze-reference-row'); });
      panel.querySelectorAll('input, textarea').forEach(function (f) {
        f.style.setProperty('background', 'rgba(255,255,255,.10)', 'important');
        f.style.setProperty('border', '0', 'important');
        f.style.setProperty('box-shadow', 'none', 'important');
        f.style.setProperty('color', cssVar('--Yuze-panel-color', 'rgba(28,38,52,.92)'), 'important');
      });
      panel.querySelectorAll('*:not(input):not(textarea):not(button):not(svg):not(path):not(circle):not(line):not(polyline):not(img)').forEach(function (c) {
        c.style.setProperty('background', 'transparent', 'important');
        c.style.setProperty('background-color', 'transparent', 'important');
        c.style.setProperty('background-image', 'none', 'important');
        c.style.setProperty('border', '0', 'important');
        c.style.setProperty('border-color', 'transparent', 'important');
        c.style.setProperty('box-shadow', 'none', 'important');
      });
      panel.querySelectorAll('svg, svg *').forEach(function (icon) {
        icon.style.setProperty('color', cssVar('--Yuze-panel-muted', 'rgba(28,38,52,.64)'), 'important');
        icon.style.setProperty('opacity', '1', 'important');
        icon.style.setProperty('filter', 'none', 'important');
        if (icon.hasAttribute('stroke')) icon.style.setProperty('stroke', 'currentColor', 'important');
        if (icon.hasAttribute('fill') && icon.getAttribute('fill') !== 'none') icon.style.setProperty('fill', 'currentColor', 'important');
      });
      panel.querySelectorAll('img').forEach(function (img) {
        img.style.setProperty('opacity', '1', 'important');
        img.style.setProperty('filter', 'none', 'important');
        img.style.setProperty('background', 'transparent', 'important');
        img.style.setProperty('box-shadow', 'none', 'important');
      });
      getReferenceRows(panel).forEach(function (row) {
        setReferenceRowStyle(row, isReferenceRowActive(row));
        if (row.dataset.YuzeReferenceBound === 'true') return;
        row.dataset.YuzeReferenceBound = 'true';
        row.addEventListener('mouseenter', function () { setReferenceRowStyle(row, true); });
        row.addEventListener('mouseleave', function () { setReferenceRowStyle(row, isReferenceRowActive(row)); });
      });
    });
  }

  function tagTextPanels() {
    Array.from(document.querySelectorAll('body div, body section, body aside')).filter(function (panel) {
      if (shouldSkipElement(panel)) return false;
      if (panel.closest('[data-Yuze-acrylic-target="composer"], [data-Yuze-acrylic-target="search-panel"], [data-Yuze-acrylic-target="shortcut-modal"], [data-Yuze-acrylic-target="reference-panel"]')) return false;
      var rect = panel.getBoundingClientRect(), text = (panel.innerText || panel.textContent || '').trim();
      var modelCount = ['Gemini', 'GPT', 'DeepSeek', 'Claude', 'Kimi', 'GLM'].filter(function (t) { return text.includes(t); }).length;
      if (modelCount >= 3 && panel.querySelector('[role="option"], [data-radix-collection-item], [cmdk-item], button')) return false;
      var st = getComputedStyle(panel), cls = String(panel.className || '').toLowerCase();
      var isFloating = st.position === 'fixed' || st.position === 'absolute' || cls.includes('fixed') || cls.includes('absolute') || cls.includes('popover') || cls.includes('dropdown') || cls.includes('tooltip');
      return rect.width >= 220 && rect.width <= 680 && rect.height >= 72 && rect.height <= 560 && text.length >= 18 && isFloating;
    }).forEach(function (panel) {
      panel.setAttribute('data-Yuze-acrylic-target', 'text-panel');
      Array.from(panel.querySelectorAll("div, button, [role='button'], [role='option'], [role='menuitem'], li")).forEach(function (item) {
        var rect = item.getBoundingClientRect(), text = (item.innerText || item.textContent || '').trim();
        var hasNestedLarge = Array.from(item.children).some(function (c) { var cr = c.getBoundingClientRect(); return cr.width >= rect.width * 0.85 && cr.height >= rect.height * 0.75; });
        if (rect.width < Math.min(150, panel.getBoundingClientRect().width * 0.45) || rect.height < 20 || rect.height > 72 || !text || hasNestedLarge) return;
        item.setAttribute('data-Yuze-acrylic-target', 'text-item');
        item.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (c) { c.removeAttribute('data-Yuze-acrylic-target'); });
      });
    });
  }

  function tagAndPolishTransientPanels() {
    tagReferencePanels();
    tagSearchSuggestions();
    polishReferencePanels();
    tagTextPanels();
    polishReadablePanels();
    polishMenuPanels();
    polishReferencePanels();
  }

  function tagAcrylicTargets() {
    document.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (el) { el.removeAttribute('data-Yuze-acrylic-target'); });
    document.querySelectorAll('input, textarea, [role="textbox"], [contenteditable="true"]').forEach(function (el) {
      if (!shouldSkipElement(el)) el.setAttribute('data-Yuze-acrylic-target', 'field');
    });
    tagComposerParts();
    tagShortcutCards();
    tagShortcutModal();
    tagTooltips();
    neutralizeNativeTooltips();
    tagAndPolishTransientPanels();
    polishToolbarControls();
    document.querySelectorAll(controlSelectors.join(',')).forEach(function (el) {
      if (shouldSkipElement(el)) return;
      if (el.closest('[data-Yuze-acrylic-target="shortcut"]') || el.closest('[data-Yuze-acrylic-target="search-panel"]') || el.closest('[data-Yuze-acrylic-target="text-panel"]') || el.closest('[data-Yuze-acrylic-target="shortcut-modal"]') || el.closest('[data-Yuze-acrylic-target="reference-panel"]') || el.closest('[data-Yuze-acrylic-target="control"]')) return;
      el.setAttribute('data-Yuze-acrylic-target', 'control');
    });
    document.querySelectorAll(surfaceSelectors.join(',')).forEach(function (el) {
      if (shouldSkipElement(el)) return;
      if (el.closest('[data-Yuze-acrylic-target="reference-panel"]') || el.querySelector('[role="dialog"], [role="menu"], [role="listbox"]') || el.closest('[data-Yuze-acrylic-target="menu"]')) return;
      var rect = el.getBoundingClientRect();
      el.setAttribute('data-Yuze-acrylic-target', (rect.width < window.innerWidth * 0.9 || rect.height < window.innerHeight * 0.9) ? 'menu' : 'surface');
    });
    document.querySelectorAll(optionSelectors.join(',')).forEach(function (el) {
      if (!shouldSkipElement(el) && !el.closest('[data-Yuze-acrylic-target="reference-panel"]')) el.setAttribute('data-Yuze-acrylic-target', 'option');
    });
  }

  function updatePresetPanelActive(currentValue) {
    var panel = document.getElementById(PRESET_PANEL_ID);
    if (!panel) return;
    panel.querySelectorAll('.' + NS + 'acrylic-preset-btn').forEach(function (btn) {
      var isActive = btn.dataset.presetValue === currentValue;
      btn.style.background = isActive ? 'rgba(59,130,246,0.14)' : 'rgba(0,0,0,0.04)';
      btn.style.borderColor = isActive ? '#3b82f6' : 'rgba(0,0,0,0.10)';
      btn.style.fontWeight = isActive ? '700' : '600';
    });
  }

  function injectPresetPanel() {
    if (document.getElementById(PRESET_PANEL_ID)) return;
    var restoreRow = document.getElementById(NS + 'restore-row');
    if (!restoreRow) return;
    var panel = document.createElement('div');
    panel.id = PRESET_PANEL_ID;
    panel.style.cssText = 'padding:0 14px 14px;flex-shrink:0;';
    var label = document.createElement('div');
    label.style.cssText = 'font-size:11px;font-weight:600;color:#94a3b8;letter-spacing:.8px;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:4px 2px 8px;';
    label.textContent = '壁纸选择';
    panel.appendChild(label);
    var grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,1fr);gap:6px;';
    var saved = loadSaved();
    var currentValue = saved ? saved.value : presets[0].value;
    presets.forEach(function (preset) {
      var btn = document.createElement('button');
      btn.className = NS + 'acrylic-preset-btn';
      btn.dataset.presetValue = preset.value;
      btn.textContent = preset.name;
      var isActive = preset.value === currentValue;
      btn.style.cssText = 'padding:7px 4px;border-radius:7px;border:1.5px solid ' + (isActive ? '#3b82f6' : 'rgba(0,0,0,0.10)') + ';background:' + (isActive ? 'rgba(59,130,246,0.14)' : 'rgba(0,0,0,0.04)') + ';font-size:11px;font-weight:' + (isActive ? '700' : '600') + ';cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:background .15s,border-color .15s;color:#334155;';
      btn.addEventListener('mouseenter', function () {
        var cur = loadSaved(); if (btn.dataset.presetValue !== (cur ? cur.value : presets[0].value)) { btn.style.background = 'rgba(59,130,246,0.08)'; btn.style.borderColor = 'rgba(59,130,246,0.28)'; }
      });
      btn.addEventListener('mouseleave', function () { var cur = loadSaved(); updatePresetPanelActive(cur ? cur.value : presets[0].value); });
      btn.addEventListener('click', function () { setBackground(preset.value); });
      grid.appendChild(btn);
    });
    panel.appendChild(grid);
    restoreRow.parentNode.insertBefore(panel, restoreRow);
  }

  function removePresetPanel() {
    var panel = document.getElementById(PRESET_PANEL_ID);
    if (panel) panel.remove();
  }

  function applyDrawerDarkPatch() {
    var styleId = 'Yuze-acrylic-drawer-patch';
    if (document.getElementById(styleId)) return;
    var s = document.createElement('style');
    s.id = styleId;
    s.textContent = '@media(prefers-color-scheme:dark){#' + PRESET_PANEL_ID + ' .' + NS + 'acrylic-preset-btn{color:#cbd5e1 !important;background:rgba(255,255,255,0.04) !important;border-color:rgba(255,255,255,0.08) !important;}#' + PRESET_PANEL_ID + ' .' + NS + 'acrylic-preset-btn:hover{background:rgba(59,130,246,0.12) !important;border-color:rgba(59,130,246,0.30) !important;}#' + PRESET_PANEL_ID + ' div{color:#475569 !important;}}';
    document.head.appendChild(s);
  }

  function applyTheme() {
    document.documentElement.dataset.YuzeAcrylic = 'true';
    getOrCreateBg();
    var old = document.getElementById(STYLE_ID);
    if (old) old.remove();
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = buildCSS();
    document.head.appendChild(s);
    var saved = loadSaved();
    setBackground(saved ? saved.value : presets[0].value);
    tagAcrylicTargets();
    if (acrylicObserver) acrylicObserver.disconnect();
    acrylicObserver = new MutationObserver(tagAcrylicTargets);
    acrylicObserver.observe(document.body, { childList: true, subtree: true });
    applyDrawerDarkPatch();
    var tries = 0;
    var tryInject = function () {
      if (document.getElementById(PRESET_PANEL_ID)) return;
      injectPresetPanel();
      if (!document.getElementById(PRESET_PANEL_ID) && tries++ < 20) setTimeout(tryInject, 300);
    };
    tryInject();
  }

  function removeTheme() {
    document.documentElement.removeAttribute('data-Yuze-acrylic');
    document.documentElement.removeAttribute('data-Yuze-tone');
    var s = document.getElementById(STYLE_ID);
    if (s) s.remove();
    var bg = document.getElementById(BG_ID);
    if (bg) bg.remove();
    if (acrylicObserver) { acrylicObserver.disconnect(); acrylicObserver = null; }
    document.querySelectorAll('[data-Yuze-acrylic-target]').forEach(function (el) { el.removeAttribute('data-Yuze-acrylic-target'); });
    ['--Yuze-panel-bg','--Yuze-panel-bg-color','--Yuze-panel-color','--Yuze-panel-muted','--Yuze-panel-border','--Yuze-panel-shadow',
     '--Yuze-item-bg','--Yuze-item-active-bg','--Yuze-item-border','--Yuze-item-focus-shadow','--Yuze-text-shadow',
     '--Yuze-toolbar-bg','--Yuze-toolbar-active-bg','--Yuze-toolbar-border','--Yuze-toolbar-active-border',
     '--Yuze-toolbar-shadow','--Yuze-toolbar-active-shadow','--Yuze-toolbar-color'].forEach(function (p) {
      document.documentElement.style.removeProperty(p);
    });
    removePresetPanel();
  }

  function register() {
    if (!window.__tbThemeRegistry) return;
    window.__tbThemeRegistry.add({
      id: THEME_ID,
      emoji: '🌅',
      label: '亚克力',
      desc: '毛玻璃背景效果',
      onApply: applyTheme,
      onRemove: removeTheme
    });
  }

  function tryRegister() {
    if (window.__tbThemeRegistry) { register(); return; }
    window.addEventListener('tb-skill:master-online', function h() {
      window.removeEventListener('tb-skill:master-online', h);
      if (window.__tbThemeRegistry) register();
    });
    var ob = new MutationObserver(function () {
      if (window.__tbThemeRegistry) { ob.disconnect(); register(); }
    });
    ob.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('tb-skill:destroy-all', function () {
    removeTheme();
    var patch = document.getElementById('Yuze-acrylic-drawer-patch');
    if (patch) patch.remove();
    window.__tbAcrylicThemeLoaded = false;
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryRegister);
  else tryRegister();
})();