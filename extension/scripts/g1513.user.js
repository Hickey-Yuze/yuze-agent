(function () {
  'use strict';

  if (window.__tbx6b3Mounted) return;
  window.__tbx6b3Mounted = true;

  var THEME_ID = 'skin-theme-2026051801';
  var BASE = 'https://cdn.tab-browser.com/theme-skin/' + THEME_ID;
  var STYLE_ID = 'injected-skin-theme-rilakkuma-css';
  var CARD_STYLE_ID = 'tbb-skin-rilakkuma-card-style';

  function buildCSS() {
    return [
      '.theme-background{position:relative;overflow:hidden;padding-bottom:24px;}',
      '.theme-background::before{content:"";position:absolute;inset:0;',
      'background-image:radial-gradient(circle at 18px 18px,#9cd5f3 0 11px,transparent 11.5px),radial-gradient(circle at 54px 53px,#9cd5f3 0 11px,transparent 11.5px);',
      'background-color:#fff;background-repeat:repeat;background-position:-15px -11px;background-size:72px 70px;',
      'opacity:1;pointer-events:none;z-index:0;}',
      '@keyframes pet-sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
      '@keyframes pet-hop{0%,100%{transform:translateY(0) rotate(0deg)}35%{transform:translateY(-18px) rotate(-4deg)}70%{transform:translateY(4px) rotate(4deg)}}',
      '.theme-pet{position:fixed;bottom:80px;right:24px;left:auto;width:300px;height:280px;',
      'background-image:url("' + BASE + '/pet.png");background-repeat:no-repeat;',
      'background-position:top left;background-size:contain;z-index:2147483000;',
      '--theme-pet-drag-rotate:0deg;transform-origin:bottom center;',
      'animation:pet-sway 3s ease-in-out infinite;pointer-events:auto !important;',
      'cursor:grab;touch-action:none;user-select:none;-webkit-user-drag:none;will-change:transform,left,top;}',
      '.theme-pet.is-dragging{animation:none;cursor:grabbing;z-index:2147483001;transform:rotate(var(--theme-pet-drag-rotate,0deg));}',
      '.theme-pet.is-happy{animation:pet-hop 480ms cubic-bezier(0.2,1.3,0.32,1);}',
      '.theme-background-footer{content:"";position:absolute;background-image:url("' + BASE + '/footer.png");',
      'background-repeat:repeat-x;background-position:top center;background-size:auto 100%;',
      'left:0;right:0;bottom:0;height:32px;z-index:0;}',
      '.theme-header{background-image:url("' + BASE + '/header.png");background-repeat:repeat-x;',
      'background-position:top center;background-size:auto 56px;height:56px;border:none;z-index:10;}',
      '.theme-header-title-suffix{background-image:url("' + BASE + '/icon.png");transform:rotateY(180deg);',
      'background-repeat:no-repeat;background-size:contain;width:36px;height:36px;margin-right:-10px;}',
      '.theme-user-message{position:relative;background:transparent !important;padding:0 !important;border-radius:0 !important;}',
      '.svg-nine-slice-frame{background-color:transparent;border:none !important;border-radius:0;}',
      '.theme-search-panel{margin:-10px 12px 0 8px;background-color:#dff1fd;padding-top:10px !important;}',
      '.theme-input-content{margin:-30px -15px 0 -15px;}',
      '.theme-input-toolbar{width:auto !important;margin:-20px -10px -40px -20px;}',
      '.theme-input-container{border:none;box-shadow:none;background:transparent;}',
      '.theme-logo{background-image:url("' + BASE + '/logo.png") !important;background-repeat:no-repeat;',
      'background-position:center;background-size:contain;width:180px !important;height:180px !important;',
      'min-width:180px;min-height:180px;margin-left:-40px !important;margin-top:-70px !important;}',
      '.theme-thinking{padding-left:32px;}',
      '.theme-thinking::before{content:"";position:absolute;inset:0;top:-4px;width:28px;height:28px;',
      'background-image:url("' + BASE + '/thinking.png");background-repeat:no-repeat;background-size:28px 28px;',
      'animation:thinking-rotate 1.5s ease-in-out infinite;transform-origin:center center;z-index:1;}',
      '@keyframes thinking-rotate{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}',
      '.theme-thinking .thinking-loading-char{display:none;}'
    ].join('');
  }

  function setupPet() {
    var cleanupKey = '__skinThemePetCleanup__';
    if (window[cleanupKey]) window[cleanupKey]();
    var stateKey = THEME_ID + '-pet-state-v3';
    var cleanupFns = [];
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    var addL = function (t, type, fn, opts) {
      t.addEventListener(type, fn, opts);
      cleanupFns.push(function () { t.removeEventListener(type, fn, opts); });
    };
    var readState = function () {
      try { var p = JSON.parse(localStorage.getItem(stateKey) || 'null'); if (p && isFinite(p.x) && isFinite(p.y)) return p; } catch (e) {}
      return null;
    };
    var saveState = function (s) { try { localStorage.setItem(stateKey, JSON.stringify(s)); } catch (e) {} };
    var getDefault = function (pet) {
      return { x: Math.max(24, window.innerWidth - (pet.offsetWidth || 300) - 24), y: Math.max(0, window.innerHeight - (pet.offsetHeight || 280) - 80) };
    };
    var constrain = function (pet, s) {
      var mX = Math.max(0, window.innerWidth - (pet.offsetWidth || 300));
      var mY = Math.max(0, window.innerHeight - (pet.offsetHeight || 280));
      return { x: Math.round(clamp(+s.x || 0, 0, mX)), y: Math.round(clamp(+s.y || 0, 0, mY)) };
    };
    var applyPos = function (pet, s) {
      var n = constrain(pet, s);
      pet.style.left = n.x + 'px'; pet.style.top = n.y + 'px';
      pet.style.right = 'auto'; pet.style.bottom = 'auto';
      return n;
    };
    var pulse = function (pet, cls, dur) {
      pet.classList.remove(cls); void pet.offsetWidth; pet.classList.add(cls);
      setTimeout(function () { pet.classList.remove(cls); }, dur);
    };
    var bindPet = function (pet) {
      if (pet.__skinPetBound__) return;
      pet.__skinPetBound__ = true;
      var state = applyPos(pet, readState() || getDefault(pet));
      var gesture = null, moved = false;
      pet.setAttribute('draggable', 'false');
      if (!pet.hasAttribute('tabindex')) pet.tabIndex = 0;
      addL(pet, 'pointerdown', function (e) {
        if (e.button !== 0) return;
        gesture = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ss: Object.assign({}, state) };
        moved = false; pet.classList.add('is-dragging');
        try { pet.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      });
      addL(window, 'pointermove', function (e) {
        if (!gesture || e.pointerId !== gesture.id) return;
        var dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
        moved = moved || Math.abs(dx) + Math.abs(dy) > 4;
        state = applyPos(pet, { x: gesture.ss.x + dx, y: gesture.ss.y + dy });
        pet.style.setProperty('--theme-pet-drag-rotate', clamp(dx / 18, -8, 8).toFixed(2) + 'deg');
        e.preventDefault();
      }, { passive: false });
      var end = function (e) {
        if (!gesture || e.pointerId !== gesture.id) return;
        try { pet.releasePointerCapture(e.pointerId); } catch (_) {}
        pet.classList.remove('is-dragging');
        pet.style.setProperty('--theme-pet-drag-rotate', '0deg');
        saveState(state);
        var wasClick = !moved; gesture = null;
        if (wasClick) pulse(pet, 'is-happy', 520);
      };
      addL(window, 'pointerup', end);
      addL(window, 'pointercancel', end);
      addL(pet, 'dblclick', function (e) {
        e.preventDefault();
        state = applyPos(pet, getDefault(pet)); saveState(state); pulse(pet, 'is-happy', 520);
      });
      cleanupFns.push(function () { pet.__skinPetBound__ = false; pet.classList.remove('is-dragging', 'is-happy'); });
    };
    var bindAll = function () { document.querySelectorAll('.theme-pet').forEach(bindPet); };
    bindAll();
    var ob = new MutationObserver(bindAll);
    ob.observe(document.documentElement, { childList: true, subtree: true });
    cleanupFns.push(function () { ob.disconnect(); });
    addL(window, 'resize', function () {
      document.querySelectorAll('.theme-pet').forEach(function (pet) {
        saveState(applyPos(pet, readState() || getDefault(pet)));
      });
    });
    window[cleanupKey] = function () {
      while (cleanupFns.length) { try { cleanupFns.pop()(); } catch (_) {} }
      delete window[cleanupKey];
    };
  }

  function applyTheme() {
    var old = document.getElementById(STYLE_ID); if (old) old.remove();
    var s = document.createElement('style'); s.id = STYLE_ID; s.textContent = buildCSS();
    document.head.appendChild(s);
    window.__tbSkinCfg = {
      enabled: true,
      basePath: 'https://cdn.tab-browser.com/theme-skin',
      theme: THEME_ID,
      bubble: { imageUrl: BASE + '/bubble.png', imageWidth: 512, imageHeight: 448, sliceTop: 120, sliceRight: 130, sliceBottom: 100, sliceLeft: 140, scale: 0.35 },
      input: { imageUrl: BASE + '/input.png', imageWidth: 1600, imageHeight: 260, sliceTop: 120, sliceRight: 130, sliceBottom: 130, sliceLeft: 120, scale: 0.5 }
    };
    window.dispatchEvent(new CustomEvent('x-tb:skin-upd'));
    setupPet();
  }

  function removeTheme() {
    var s = document.getElementById(STYLE_ID); if (s) s.remove();
    if (window.__skinThemePetCleanup__) window.__skinThemePetCleanup__();
    if (window.__tbSkinCfg) { window.__tbSkinCfg = { enabled: false }; window.dispatchEvent(new CustomEvent('x-tb:skin-upd')); }
  }

  function injectCardStyle() {
    if (document.getElementById(CARD_STYLE_ID)) return;
    var s = document.createElement('style'); s.id = CARD_STYLE_ID;
    s.textContent =
      '.tbb-theme-card[data-id="' + THEME_ID + '"] .tbb-tc-emoji{' +
      'display:block;width:56px;height:40px;border-radius:5px;font-size:0;' +
      'background-image:url("' + BASE + '/pet.png");' +
      'background-repeat:no-repeat;background-size:contain;background-position:center bottom;' +
      'background-color:rgba(156,213,243,0.15);}' +
      '.tbb-theme-card[data-id="' + THEME_ID + '"].tbb-theme-active{border-color:#9cd5f3 !important;background:rgba(156,213,243,0.12) !important;}';
    document.head.appendChild(s);
  }

  function register() {
    if (!window.__tbReg0xT) return;
    injectCardStyle();
    window.__tbReg0xT.add({ id: THEME_ID, emoji: '🐻', label: '轻松熊', desc: '古早日系松弛感', onApply: applyTheme, onRemove: removeTheme });
  }

  function tryRegister() {
    if (window.__tbReg0xT) { register(); return; }
    window.addEventListener('x-tb:core-rdy', function h() { window.removeEventListener('x-tb:core-rdy', h); if (window.__tbReg0xT) register(); });
    var ob = new MutationObserver(function () { if (window.__tbReg0xT) { ob.disconnect(); register(); } });
    ob.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.addEventListener('x-tb:teardown', function () { removeTheme(); var s = document.getElementById(CARD_STYLE_ID); if (s) s.remove(); window.__tbx6b3Mounted = false; });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryRegister);
  else tryRegister();
})();