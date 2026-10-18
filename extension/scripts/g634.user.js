(function() {
  const STYLE_ID = 'Yuze-beautify';
  const FONT_ID = 'Yuze-beautify-fonts';
  const ALL_IDS = [STYLE_ID, FONT_ID];

  // === 切换：已存在则移除（关闭美化） ===
  if (document.getElementById(STYLE_ID)) {
    ALL_IDS.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.remove();
    });
    if (window._YuzeThemeObserver) {
      window._YuzeThemeObserver.disconnect();
      window._YuzeThemeObserver = null;
    }
    if (window._YuzePollTimer) {
      clearInterval(window._YuzePollTimer);
      window._YuzePollTimer = null;
    }
    document.documentElement.removeAttribute('data-Yuze-theme');
    // 清理 CSS 变量
    var constants = ['--accent-blue','--accent-purple','--accent-cyan','--accent-green','--accent-orange','--accent-pink','--accent-red','--radius-sm','--radius-md','--radius-lg'];
    var paletteKeys = ['--bg-primary','--bg-secondary','--bg-card','--bg-hover','--text-primary','--text-secondary','--text-muted','--border-color','--shadow-sm','--shadow-md','--shadow-lg','--code-bg','--nav-bg','--nav-blur','--mobile-bg','--footer-bg','--inline-code-bg','--inline-code-border','--tag-book-bg','--tag-book-border','--tag-watch-bg','--tag-watch-border','--tag-mem-bg','--tag-mem-border','--h2-color','--sidebar-header-bg','--highlight-bg','--highlight-border','--focus-ring','--scrollbar-thumb','--scrollbar-hover','--selection-bg','--toolbar-bg','--loader-track','--dropdown-shadow','--btn-shadow','--btn-shadow-hover','--drop-item-bg','--tab-border','--editor-bg'];
    constants.concat(paletteKeys).forEach(function(k) {
      document.documentElement.style.removeProperty(k);
    });
    console.log('🔄 Beautification removed (toggle off)');
    return;
  }

  // 清理旧版本残留
  ['Yuze-beautify-style','Yuze-beautify-light','Yuze-nav-height-boost',
   'Yuze-overflow-fix','Yuze-nav-height-fix'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  });

  // === 主题检测 ===
  function detectTheme() {
    var htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme) return htmlTheme.includes('dark') ? 'dark' : 'light';
    var bgColor = getComputedStyle(document.documentElement).backgroundColor;
    if (bgColor) {
      var match = bgColor.match(/\d+/g);
      if (match && match.length >= 3) {
        return (0.299 * parseInt(match[0]) + 0.587 * parseInt(match[1]) + 0.114 * parseInt(match[2])) / 255 < 0.5 ? 'dark' : 'light';
      }
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // === 配色方案 ===
  var palettes = {
    light: {
      '--bg-primary': '#f5f7fb',
      '--bg-secondary': '#eef1f8',
      '--bg-card': '#ffffff',
      '--bg-hover': '#f0f3fa',
      '--text-primary': '#1e293b',
      '--text-secondary': '#475569',
      '--text-muted': '#94a3b8',
      '--border-color': 'rgba(0,0,0,0.07)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.06)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.08)',
      '--shadow-lg': '0 8px 32px rgba(0,0,0,0.10)',
      '--code-bg': '#f8fafc',
      '--nav-bg': 'rgba(255,255,255,0.82)',
      '--nav-blur': 'blur(20px) saturate(1.8)',
      '--mobile-bg': 'rgba(255,255,255,0.9)',
      '--footer-bg': 'var(--bg-secondary)',
      '--inline-code-bg': 'rgba(59,130,246,0.06)',
      '--inline-code-border': 'rgba(59,130,246,0.1)',
      '--tag-book-bg': 'rgba(59,130,246,0.08)',
      '--tag-book-border': 'rgba(59,130,246,0.15)',
      '--tag-watch-bg': 'rgba(249,115,22,0.08)',
      '--tag-watch-border': 'rgba(249,115,22,0.15)',
      '--tag-mem-bg': 'rgba(139,92,246,0.08)',
      '--tag-mem-border': 'rgba(139,92,246,0.15)',
      '--h2-color': '#0e7490',
      '--sidebar-header-bg': 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))',
      '--highlight-bg': 'rgba(59,130,246,0.08)',
      '--highlight-border': 'rgba(59,130,246,0.12)',
      '--focus-ring': 'rgba(59,130,246,0.1)',
      '--scrollbar-thumb': 'rgba(0,0,0,0.12)',
      '--scrollbar-hover': 'rgba(0,0,0,0.2)',
      '--selection-bg': 'rgba(59,130,246,0.2)',
      '--toolbar-bg': 'var(--bg-secondary)',
      '--loader-track': 'rgba(0,0,0,0.08)',
      '--dropdown-shadow': 'var(--shadow-lg)',
      '--btn-shadow': '0 2px 8px rgba(59,130,246,0.25)',
      '--btn-shadow-hover': '0 4px 14px rgba(59,130,246,0.35)',
      '--drop-item-bg': 'rgba(59,130,246,0.06)',
      '--tab-border': 'rgba(0,0,0,0.02)',
      '--editor-bg': 'var(--bg-card)'
    },
    dark: {
      '--bg-primary': '#0f1117',
      '--bg-secondary': '#1a1d27',
      '--bg-card': '#1e2230',
      '--bg-hover': '#262b3d',
      '--text-primary': '#e2e8f0',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--border-color': 'rgba(255,255,255,0.06)',
      '--shadow-sm': '0 1px 3px rgba(0,0,0,0.3)',
      '--shadow-md': '0 4px 16px rgba(0,0,0,0.4)',
      '--shadow-lg': '0 8px 32px rgba(0,0,0,0.5)',
      '--code-bg': '#111320',
      '--nav-bg': 'rgba(15,17,23,0.85)',
      '--nav-blur': 'blur(20px)',
      '--mobile-bg': 'rgba(15,17,23,0.9)',
      '--footer-bg': 'var(--bg-secondary)',
      '--inline-code-bg': 'rgba(96,165,250,0.1)',
      '--inline-code-border': 'rgba(96,165,250,0.15)',
      '--tag-book-bg': 'rgba(96,165,250,0.12)',
      '--tag-book-border': 'rgba(96,165,250,0.25)',
      '--tag-watch-bg': 'rgba(251,146,60,0.12)',
      '--tag-watch-border': 'rgba(251,146,60,0.25)',
      '--tag-mem-bg': 'rgba(167,139,250,0.12)',
      '--tag-mem-border': 'rgba(167,139,250,0.25)',
      '--h2-color': '#22d3ee',
      '--sidebar-header-bg': 'linear-gradient(135deg, rgba(96,165,250,0.08), rgba(167,139,250,0.08))',
      '--highlight-bg': 'linear-gradient(135deg, rgba(96,165,250,0.15), rgba(167,139,250,0.15))',
      '--highlight-border': 'rgba(96,165,250,0.2)',
      '--focus-ring': 'rgba(96,165,250,0.15)',
      '--scrollbar-thumb': 'rgba(255,255,255,0.1)',
      '--scrollbar-hover': 'rgba(255,255,255,0.2)',
      '--selection-bg': 'rgba(96,165,250,0.3)',
      '--toolbar-bg': 'var(--bg-secondary)',
      '--loader-track': 'rgba(255,255,255,0.1)',
      '--dropdown-shadow': 'var(--shadow-lg)',
      '--btn-shadow': '0 2px 8px rgba(96,165,250,0.2)',
      '--btn-shadow-hover': '0 4px 14px rgba(96,165,250,0.3)',
      '--drop-item-bg': 'rgba(96,165,250,0.08)',
      '--tab-border': 'rgba(255,255,255,0.03)',
      '--editor-bg': 'var(--bg-card)'
    }
  };

  // === 注入字体 ===
  if (!document.getElementById(FONT_ID)) {
    var fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';
    fontLink.id = FONT_ID;
    document.head.appendChild(fontLink);
  }

  // === 注入样式 ===
  var style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    /* 全局 */
    'body { background: var(--bg-primary) !important; color: var(--text-primary) !important; font-family: "Inter","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important; }',
    '.main { background: transparent !important; }',

    /* 导航栏 */
    'nav.nav.slideout-menu.slideout-menu-right { height: auto !important; min-height: 50px !important; padding-top: 4px !important; padding-bottom: 4px !important; background: var(--nav-bg) !important; backdrop-filter: var(--nav-blur) !important; -webkit-backdrop-filter: var(--nav-blur) !important; border-bottom: 1px solid var(--border-color) !important; box-shadow: var(--shadow-sm) !important; }',
    '.nav .row { max-width: 100% !important; }',
    '.nav__list--main { display: flex !important; flex-wrap: nowrap !important; align-items: center !important; overflow: hidden !important; }',
    '.nav__list-item { display: flex !important; align-items: center !important; }',
    '.nav .nav__item { color: var(--text-secondary) !important; font-weight: 500 !important; transition: all 0.25s ease !important; border-radius: 6px !important; padding: 4px 8px !important; white-space: nowrap !important; flex-shrink: 0 !important; }',
    '.nav .nav__item:hover { color: var(--accent-blue) !important; background: var(--drop-item-bg) !important; }',
    '.nav--active .nav__item, .nav__item.nav--active { color: var(--accent-blue) !important; background: var(--drop-item-bg) !important; }',
    '.nav__list-item:first-child { flex-shrink: 0 !important; }',
    '.nav__list-item.nav_more { flex-shrink: 0 !important; }',
    '.nav__list--secondary { flex-shrink: 0 !important; flex-wrap: nowrap !important; align-items: center !important; }',
    '.nav__logo { max-height: 28px !important; vertical-align: middle !important; }',
    '.user-profile-avatar { max-height: 24px !important; border-radius: 50% !important; border: 2px solid var(--border-color) !important; }',
    '.nav--shadow { background: transparent !important; box-shadow: none !important; }',
    '.nav__list--secondary .nav__item { color: var(--text-secondary) !important; }',

    /* 标题 */
    '.section__header .section__title { color: var(--text-primary) !important; font-weight: 700 !important; font-size: 26px !important; letter-spacing: -0.02em !important; }',
    'h1.section__title { background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important; -webkit-background-clip: text !important; -webkit-text-fill-color: transparent !important; background-clip: text !important; font-size: 28px !important; font-weight: 800 !important; }',
    'h2 { color: var(--h2-color) !important; font-weight: 600 !important; font-size: 18px !important; border-left: 3px solid var(--h2-color) !important; padding-left: 12px !important; margin-top: 28px !important; margin-bottom: 14px !important; }',
    'h3 { color: var(--text-primary) !important; font-weight: 600 !important; }',

    /* 标签 */
    '.problem__tags { display: flex !important; gap: 8px !important; margin: 12px 0 !important; }',
    '.bp5-tag.problem__tag-item { border-radius: 20px !important; padding: 4px 16px !important; font-size: 13px !important; font-weight: 600 !important; border: 1px solid transparent !important; transition: all 0.2s ease !important; }',
    '.bp5-tag.problem__tag-item.icon-book { background: var(--tag-book-bg) !important; color: var(--accent-blue) !important; border-color: var(--tag-book-border) !important; }',
    '.bp5-tag.problem__tag-item.icon-stopwatch { background: var(--tag-watch-bg) !important; color: var(--accent-orange) !important; border-color: var(--tag-watch-border) !important; }',
    '.bp5-tag.problem__tag-item.icon-comparison { background: var(--tag-mem-bg) !important; color: var(--accent-purple) !important; border-color: var(--tag-mem-border) !important; }',

    /* 题目内容 */
    '.problem-content-container { background: var(--bg-card) !important; border-radius: var(--radius-lg) !important; border: 1px solid var(--border-color) !important; box-shadow: var(--shadow-md) !important; padding: 4px !important; overflow: hidden !important; }',
    '.problem-content { padding: 28px 32px !important; }',
    '.typo, .typo p { color: var(--text-secondary) !important; line-height: 1.8 !important; font-size: 15px !important; }',
    '.typo code { background: var(--inline-code-bg) !important; color: var(--accent-blue) !important; padding: 2px 8px !important; border-radius: 6px !important; font-size: 13.5px !important; font-family: "JetBrains Mono","Fira Code","SF Mono",monospace !important; border: 1px solid var(--inline-code-border) !important; }',
    '.katex { color: var(--accent-pink) !important; }',

    /* 代码块 */
    '.code-toolbar { border-radius: var(--radius-md) !important; overflow: hidden !important; margin: 16px 0 !important; border: 1px solid var(--border-color) !important; box-shadow: var(--shadow-sm) !important; }',
    '.code-toolbar pre { background: var(--code-bg) !important; padding: 20px 24px !important; margin: 0 !important; }',
    '.code-toolbar code { font-family: "JetBrains Mono","Fira Code","SF Mono",monospace !important; font-size: 14px !important; line-height: 1.7 !important; color: var(--text-primary) !important; }',
    '.code-toolbar .toolbar { background: var(--tab-border) !important; border-bottom: 1px solid var(--border-color) !important; padding: 6px 12px !important; }',
    '.code-toolbar .toolbar a { color: var(--text-muted) !important; font-size: 12px !important; transition: color 0.2s !important; }',
    '.code-toolbar .toolbar a:hover { color: var(--accent-blue) !important; }',

    /* 侧边栏 */
    '.section.side { background: var(--bg-card) !important; border-radius: var(--radius-lg) !important; border: 1px solid var(--border-color) !important; box-shadow: var(--shadow-md) !important; overflow: hidden !important; margin-bottom: 16px !important; }',
    '.contest-sidebar__bg { background: var(--sidebar-header-bg) !important; border-bottom: 1px solid var(--border-color) !important; padding: 20px !important; }',
    '.contest-sidebar__bg h1 { color: var(--text-primary) !important; font-size: 18px !important; font-weight: 700 !important; background: none !important; -webkit-text-fill-color: unset !important; border: none !important; padding: 0 !important; margin: 0 0 8px !important; }',
    '.contest-sidebar__status { color: var(--accent-green) !important; font-weight: 500 !important; font-size: 13px !important; }',
    '.contest-sidebar__status .icon { margin-right: 4px !important; }',
    '.menu { padding: 8px !important; }',
    '.menu__item { border-radius: var(--radius-sm) !important; margin: 2px 0 !important; }',
    '.menu__link { color: var(--text-secondary) !important; padding: 10px 14px !important; border-radius: var(--radius-sm) !important; transition: all 0.2s ease !important; font-weight: 500 !important; font-size: 14px !important; }',
    '.menu__link:hover { background: var(--bg-hover) !important; color: var(--accent-blue) !important; }',
    '.menu__link .icon { margin-right: 10px !important; opacity: 0.7 !important; }',
    '.menu__link.highlight { background: var(--highlight-bg) !important; color: var(--accent-blue) !important; border: 1px solid var(--highlight-border) !important; }',
    '.menu__seperator { border-top: 1px solid var(--border-color) !important; margin: 8px 12px !important; }',
    '.section.side .section__body.typo { padding: 16px 20px !important; }',
    'dl.horizontal dt { color: var(--text-muted) !important; font-size: 12px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; font-weight: 600 !important; }',
    'dl.horizontal dd { color: var(--text-secondary) !important; font-size: 14px !important; }',
    '.time { color: var(--accent-cyan) !important; font-variant-numeric: tabular-nums !important; }',
    '.section.visible { background: transparent !important; border: none !important; }',
    '.section__header { border-bottom: 1px solid var(--border-color) !important; padding-bottom: 12px !important; }',
    '.section__body { color: var(--text-secondary) !important; }',

    /* Scratchpad */
    '.scratchpad-container { background: var(--bg-card) !important; border-radius: var(--radius-lg) !important; border: 1px solid var(--border-color) !important; }',
    '.scratchpad__toolbar { background: var(--toolbar-bg) !important; border-bottom: 1px solid var(--border-color) !important; flex-wrap: nowrap !important; overflow: hidden !important; }',
    '.scratchpad__toolbar__item, .scratchpad__toolbar__button { flex-shrink: 0 !important; white-space: nowrap !important; }',
    '.scratchpad__toolbar__item select { max-width: 120px !important; }',
    '.scratchpad__toolbar__button { color: var(--text-secondary) !important; transition: all 0.2s ease !important; }',
    '.scratchpad__toolbar__button:hover { color: var(--accent-blue) !important; background: var(--drop-item-bg) !important; }',
    '.scratchpad__toolbar__button.activated { color: var(--accent-blue) !important; background: var(--drop-item-bg) !important; }',
    '.scratchpad__panel-title { background: var(--toolbar-bg) !important; border-bottom: 1px solid var(--border-color) !important; color: var(--text-secondary) !important; font-weight: 600 !important; padding: 8px 14px !important; font-size: 13px !important; }',
    '.scratchpad__data-input { background: var(--bg-card) !important; color: var(--text-primary) !important; }',
    'textarea.scratchpad__data-input { background: var(--bg-card) !important; color: var(--text-primary) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-sm) !important; }',
    'textarea.scratchpad__data-input:focus { border-color: var(--accent-blue) !important; box-shadow: 0 0 0 3px var(--focus-ring) !important; }',
    '.scratchpad__tablist { background: var(--toolbar-bg) !important; border-bottom: 1px solid var(--border-color) !important; }',

    /* 表格 */
    '.data-table { border-radius: var(--radius-sm) !important; overflow: hidden !important; }',
    '.data-table td { border-bottom: 1px solid var(--border-color) !important; color: var(--text-secondary) !important; }',
    '.record-status--text.pass { color: var(--accent-green) !important; }',
    '.record-status--text.fail { color: var(--accent-red) !important; }',

    /* 表单 */
    '.select { background: var(--bg-card) !important; color: var(--text-primary) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-sm) !important; padding: 4px 10px !important; }',
    '.select:focus { border-color: var(--accent-blue) !important; box-shadow: 0 0 0 3px var(--focus-ring) !important; }',
    '.textbox { background: var(--bg-card) !important; color: var(--text-primary) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-sm) !important; }',
    '.textbox:focus { border-color: var(--accent-blue) !important; box-shadow: 0 0 0 3px var(--focus-ring) !important; }',

    /* 按钮 */
    '.button.primary { background: linear-gradient(135deg, var(--accent-blue), var(--accent-purple)) !important; border: none !important; border-radius: var(--radius-sm) !important; color: #fff !important; font-weight: 600 !important; transition: all 0.2s ease !important; box-shadow: var(--btn-shadow) !important; }',
    '.button.primary:hover { box-shadow: var(--btn-shadow-hover) !important; transform: translateY(-1px) !important; }',

    /* 页脚 */
    '.footer { background: var(--footer-bg) !important; border-top: 1px solid var(--border-color) !important; padding: 24px 0 !important; }',
    '.footer__extra-link-item a, .footer__extra-link-item { color: var(--text-muted) !important; font-size: 13px !important; transition: color 0.2s ease !important; }',
    '.footer__extra-link-item a:hover { color: var(--accent-blue) !important; }',

    /* 下拉菜单 */
    '.drop-content { background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; border-radius: var(--radius-md) !important; box-shadow: var(--dropdown-shadow) !important; }',
    '.drop-content .menu__link { color: var(--text-secondary) !important; }',
    '.drop-content .menu__link:hover { background: var(--bg-hover) !important; color: var(--accent-blue) !important; }',

    /* 滚动条 */
    '::-webkit-scrollbar { width: 8px !important; height: 8px !important; }',
    '::-webkit-scrollbar-track { background: var(--bg-primary) !important; }',
    '::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb) !important; border-radius: 4px !important; }',
    '::-webkit-scrollbar-thumb:hover { background: var(--scrollbar-hover) !important; }',

    /* 动画 */
    '@keyframes Yuze-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }',
    '.problem-content-container, .section.side { animation: Yuze-fadein 0.5s ease forwards !important; }',
    '.section.side { animation-delay: 0.1s !important; }',

    /* 杂项 */
    '::selection { background: var(--selection-bg) !important; color: var(--text-primary) !important; }',
    '.header--mobile { background: var(--mobile-bg) !important; backdrop-filter: blur(20px) !important; border-bottom: 1px solid var(--border-color) !important; }',
    '.omnibar input { background: var(--bg-card) !important; border: 1px solid var(--border-color) !important; color: var(--text-primary) !important; border-radius: var(--radius-sm) !important; }',
    '.omnibar input:focus { border-color: var(--accent-blue) !important; box-shadow: 0 0 0 3px var(--focus-ring) !important; }',
    '.page-loader .loader { border-color: var(--loader-track) !important; border-top-color: var(--accent-blue) !important; }',
    '.outer-loader-container .loader, .loader-container .loader { border-color: var(--loader-track) !important; border-top-color: var(--accent-blue) !important; }',
    '.ScratchpadMonacoEditor .monaco-editor.vs { background: var(--editor-bg) !important; }',
    '.bp5-toast-container { color: var(--text-primary) !important; }',
    '.sash-module_sash__K-9lB { background: var(--border-color) !important; }',
    '.sash-module_sash__K-9lB:hover { background: var(--accent-blue) !important; }',
    'label { color: var(--text-secondary) !important; font-weight: 500 !important; font-size: 13px !important; }',
    '.icol--stat { font-size: 12px !important; padding: 2px 6px !important; border-radius: 4px !important; }',
    '.icol--pretest { opacity: 0.6 !important; }'
  ].join('\n');

  document.head.appendChild(style);

  // === 应用配色变量 ===
  function applyPalette(theme) {
    var palette = palettes[theme] || palettes.light;
    var root = document.documentElement;
    var constants = {
      '--accent-blue': '#3b82f6',
      '--accent-purple': '#8b5cf6',
      '--accent-cyan': '#06b6d4',
      '--accent-green': '#22c55e',
      '--accent-orange': '#f97316',
      '--accent-pink': '#ec4899',
      '--accent-red': '#ef4444',
      '--radius-sm': '8px',
      '--radius-md': '12px',
      '--radius-lg': '16px'
    };
    Object.keys(constants).forEach(function(k) {
      root.style.setProperty(k, constants[k]);
    });
    Object.keys(palette).forEach(function(k) {
      root.style.setProperty(k, palette[k]);
    });
    root.setAttribute('data-Yuze-theme', theme);
    console.log('🎨 Applied ' + theme + ' palette');
  }

  var currentTheme = detectTheme();
  applyPalette(currentTheme);

  // === 监听主题变化 ===
  var observer = new MutationObserver(function() {
    var newTheme = detectTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      applyPalette(currentTheme);
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class', 'style']
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class', 'style']
  });
  window._YuzeThemeObserver = observer;

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function() {
    var newTheme = detectTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      applyPalette(currentTheme);
    }
  });

  window._YuzePollTimer = setInterval(function() {
    if (!document.getElementById(STYLE_ID)) {
      clearInterval(window._YuzePollTimer);
      return;
    }
    var newTheme = detectTheme();
    if (newTheme !== currentTheme) {
      currentTheme = newTheme;
      applyPalette(currentTheme);
    }
  }, 3000);

  console.log('Beautification applied (' + currentTheme + '), run again to toggle off');
})();