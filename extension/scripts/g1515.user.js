(function () {
  'use strict';

  if (window.__tbSkinSpongeBobLoaded) return;
  window.__tbSkinSpongeBobLoaded = true;

  var THEME_ID = '20260127-leo-indigo';
  var BASE = 'https://cdn.tab-browser.com/theme-skin/' + THEME_ID;
  var STYLE_ID = 'injected-skin-theme-spongebob-css';
  var CARD_STYLE_ID = 'tbb-skin-spongebob-card-style';

  var bubble = { sliceTop: 100, sliceRight: 100, sliceBottom: 100, sliceLeft: 100, scale: 0.4 };
  var inp = { imageWidth: 1600, imageHeight: 260, sliceTop: 120, sliceRight: 120, sliceBottom: 120, sliceLeft: 120, scale: 0.5, contentMargin: '-30px -30px 0 -30px', toolbarMargin: '-20px -30px -36px -30px', searchMargin: '0 10px 0 10px' };

  function buildCSS() {
    return [
      '.theme-background{position:relative;overflow:hidden;padding-bottom:24px;}',
      '.theme-background::before{content:"";position:absolute;inset:0;',
      'background-image:url("' + BASE + '/background.png");',
      'background-repeat:no-repeat;background-position:top;background-size:100% 100%;',
      'opacity:0.8;pointer-events:none;z-index:0;}',
      '@keyframes pet-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
      '.theme-pet{position:fixed;bottom:10px;left:20px;width:200px;height:280px;',
      'background-image:url("' + BASE + '/pet.png");background-repeat:no-repeat;',
      'background-position:top left;background-size:contain;z-index:0;',
      'transform-origin:bottom center;animation:pet-sway 3s ease-in-out infinite;}',
      '.theme-background-footer{content:"";position:absolute;',
      'background-image:url("' + BASE + '/footer.png");',
      'background-repeat:repeat-x;background-position:top center;background-size:auto 100%;',
      'left:0;right:0;bottom:0;height:32px;z-index:0;}',
      '.theme-header{background-image:url("' + BASE + '/header.png");',
      'background-repeat:repeat-x;background-position:top center;background-size:auto 56px;',
      'height:56px;border:none;z-index:10;}',
      '.theme-header-title-suffix{background-image:url("' + BASE + '/icon.png");',
      'transform:rotateY(180deg);background-repeat:no-repeat;background-size:contain;',
      'width:36px;height:36px;margin-right:4px;}',
      '.theme-user-message{position:relative;background:transparent !important;padding:0 !important;border-radius:0 !important;}',
      '.svg-nine-slice-frame{background-color:transparent;border:none !important;border-radius:0;}',
      '.theme-search-panel{margin:' + inp.searchMargin + ';}',
      '.theme-input-content{margin:' + inp.contentMargin + ';}',
      '.theme-input-toolbar{width:auto !important;margin:' + inp.toolbarMargin + ';}',
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
      bubble: { imageUrl: BASE + '/bubble.png', imageWidth: 512, imageHeight: 448, sliceTop: bubble.sliceTop, sliceRight: bubble.sliceRight, sliceBottom: bubble.sliceBottom, sliceLeft: bubble.sliceLeft, scale: bubble.scale },
      input: { imageUrl: BASE + '/input.png', imageWidth: inp.imageWidth, imageHeight: inp.imageHeight, sliceTop: inp.sliceTop, sliceRight: inp.sliceRight, sliceBottom: inp.sliceBottom, sliceLeft: inp.sliceLeft, scale: inp.scale }
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
      'background-color:rgba(6,182,212,0.12);}' +
      '.tbb-theme-card[data-id="' + THEME_ID + '"].tbb-theme-active{border-color:#06b6d4 !important;background:rgba(6,182,212,0.10) !important;}';
    document.head.appendChild(s);
  }

  function register() {
    if (!window.__tbThemeRegistry) return;
    injectCardStyle();
    window.__tbThemeRegistry.add({ id: THEME_ID, emoji: '🌊', label: '海底世界', desc: '海绵宝宝主题', onApply: applyTheme, onRemove: removeTheme });
  }

  function tryRegister() {
    if (window.__tbThemeRegistry) { register(); return; }
    window.addEventListener('tb-skill:master-online', function h() { window.removeEventListener('tb-skill:master-online', h); if (window.__tbThemeRegistry) register(); });
    var ob = new MutationObserver(function () { if (window.__tbThemeRegistry) { ob.disconnect(); register(); } });
    ob.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('tb-skill:destroy-all', function () { removeTheme(); var s = document.getElementById(CARD_STYLE_ID); if (s) s.remove(); window.__tbSkinSpongeBobLoaded = false; });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryRegister);
  else tryRegister();
})();