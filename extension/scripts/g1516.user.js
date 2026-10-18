(function () {
  'use strict';

  if (window.__tbSkinChiikawaLoaded) return;
  window.__tbSkinChiikawaLoaded = true;

  var THEME_ID = '20260122-chiikawa-pink';
  var BASE = 'https://cdn.tab-browser.com/theme-skin/' + THEME_ID;
  var STYLE_ID = 'injected-skin-theme-chiikawa-css';
  var CARD_STYLE_ID = 'tbb-skin-chiikawa-card-style';

  function buildCSS() {
    return [
      '.theme-background{position:relative;overflow:hidden;padding-bottom:24px;}',
      '.theme-background::before{content:"";position:absolute;inset:0;',
      'background-image:url("' + BASE + '/background.png");background-repeat:repeat;',
      'background-position:top left;background-size:240px 240px;opacity:0.3;pointer-events:none;z-index:0;}',
      '@keyframes pet-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
      '.theme-pet{position:fixed;bottom:10px;left:20px;width:200px;height:280px;',
      'background-image:url("' + BASE + '/pet.png");background-repeat:no-repeat;',
      'background-position:top left;background-size:contain;z-index:0;',
      'transform-origin:bottom center;animation:pet-sway 3s ease-in-out infinite;}',
      '.theme-background-footer{content:"";position:absolute;background-image:url("' + BASE + '/footer.png");',
      'background-repeat:repeat-x;background-position:top center;background-size:auto 100%;',
      'left:0;right:0;bottom:0;height:32px;z-index:0;}',
      '.theme-header{background-image:url("' + BASE + '/header.png");background-repeat:repeat-x;',
      'background-position:top center;background-size:auto 56px;height:56px;border:none;z-index:10;}',
      '.theme-header-title-suffix{background-image:url("' + BASE + '/icon.png");transform:rotateY(180deg);',
      'background-repeat:no-repeat;background-size:contain;width:36px;height:36px;margin-right:4px;}',
      '.theme-user-message{position:relative;background:transparent !important;padding:0 !important;border-radius:0 !important;}',
      '.svg-nine-slice-frame{background-color:transparent;border:none !important;border-radius:0;}',
      '.theme-search-panel{margin:5px 15px 0 15px;}',
      '.theme-input-content{margin:-30px -15px 0 -15px;}',
      '.theme-input-toolbar{width:auto !important;margin:-20px -15px -40px -15px;}',
      '.theme-input-container{border:none;box-shadow:none;background:transparent;}',
      '.theme-logo{background-image:url("' + BASE + '/logo.png") !important;background-repeat:no-repeat;}',
      '.theme-thinking{padding-left:32px;}',
      '.theme-thinking::before{content:"";position:absolute;inset:0;top:-4px;width:28px;height:28px;',
      'background-image:url("' + BASE + '/thinking.png");background-repeat:no-repeat;background-size:28px 28px;',
      'animation:thinking-rotate 1.5s ease-in-out infinite;transform-origin:center center;z-index:1;}',
      '@keyframes thinking-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
      '.theme-thinking .thinking-loading-char{display:none;}'
    ].join('');
  }

  function applyTheme() {
    var old = document.getElementById(STYLE_ID); if (old) old.remove();
    var s = document.createElement('style'); s.id = STYLE_ID; s.textContent = buildCSS();
    document.head.appendChild(s);
    window.__SKIN_THEME_CONFIG__ = {
      enabled: true,
      basePath: 'https://cdn.tab-browser.com/theme-skin',
      theme: THEME_ID,
      bubble: { imageUrl: BASE + '/bubble.png', imageWidth: 512, imageHeight: 448, sliceTop: 120, sliceRight: 130, sliceBottom: 130, sliceLeft: 120, scale: 0.35 },
      input: { imageUrl: BASE + '/input.png', imageWidth: 1600, imageHeight: 260, sliceTop: 120, sliceRight: 130, sliceBottom: 130, sliceLeft: 120, scale: 0.5 }
    };
    window.dispatchEvent(new CustomEvent('skin-theme-change'));
  }

  function removeTheme() {
    var s = document.getElementById(STYLE_ID); if (s) s.remove();
    if (window.__SKIN_THEME_CONFIG__) { window.__SKIN_THEME_CONFIG__ = { enabled: false }; window.dispatchEvent(new CustomEvent('skin-theme-change')); }
  }

  function injectCardStyle() {
    if (document.getElementById(CARD_STYLE_ID)) return;
    var s = document.createElement('style'); s.id = CARD_STYLE_ID;
    s.textContent =
      '.tbb-theme-card[data-id="' + THEME_ID + '"] .tbb-tc-emoji{' +
      'display:block;width:56px;height:40px;border-radius:5px;font-size:0;' +
      'background-image:url("' + BASE + '/pet.png");' +
      'background-repeat:no-repeat;background-size:contain;background-position:center bottom;' +
      'background-color:rgba(244,143,177,0.12);}' +
      '.tbb-theme-card[data-id="' + THEME_ID + '"].tbb-theme-active{border-color:#f48fb1 !important;background:rgba(244,143,177,0.10) !important;}';
    document.head.appendChild(s);
  }

  function register() {
    if (!window.__tbThemeRegistry) return;
    injectCardStyle();
    window.__tbThemeRegistry.add({ id: THEME_ID, emoji: '🌸', label: 'Chiikawa', desc: '萌萌的三小只', onApply: applyTheme, onRemove: removeTheme });
  }

  function tryRegister() {
    if (window.__tbThemeRegistry) { register(); return; }
    window.addEventListener('tb-skill:master-online', function h() { window.removeEventListener('tb-skill:master-online', h); if (window.__tbThemeRegistry) register(); });
    var ob = new MutationObserver(function () { if (window.__tbThemeRegistry) { ob.disconnect(); register(); } });
    ob.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('tb-skill:destroy-all', function () { removeTheme(); var s = document.getElementById(CARD_STYLE_ID); if (s) s.remove(); window.__tbSkinChiikawaLoaded = false; });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryRegister);
  else tryRegister();
})();