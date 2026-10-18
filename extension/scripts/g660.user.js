(function () {
  'use strict';

  if (window.__tbMasterLoaded) return;
  window.__tbMasterLoaded = true;

  const NS = 'tb-';

  function cssIn(css, id) {
    const old = document.getElementById(id);
    if (old) old.remove();
    const s = document.createElement('style');
    s.id = id;
    s.textContent = css;
    document.head.appendChild(s);
  }
  function cssOut(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  const Runtime = {
    _registry: new Map(),
    _active: new Map(),
    _readyResolve: null,
    ready: null,

    init() {
      this.ready = new Promise(resolve => { this._readyResolve = resolve; });
    },

    register(name, definition) {
      this._registry.set(name, definition);
    },

    toggle(name) {
      if (this._active.has(name)) {
        this._active.get(name).destroy();
        this._active.delete(name);
      } else {
        const def = this._registry.get(name);
        if (!def) return;
        const instance = def.mount();
        if (instance) this._active.set(name, instance);
      }
      updateIndicators();
    },

    isActive(name) {
      return this._active.has(name);
    },

    destroyAll() {
      this._active.forEach(inst => inst.destroy());
      this._active.clear();
    },

    createCanvas(id, zIndex) {
      const dpr = () => window.devicePixelRatio || 1;
      const cv = document.createElement('canvas');
      cv.id = id;
      cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:' + zIndex + ';';
      let ctx;
      const resize = () => {
        cv.width  = window.innerWidth  * dpr();
        cv.height = window.innerHeight * dpr();
        ctx = cv.getContext('2d');
        ctx.scale(dpr(), dpr());
        cv._ctx = ctx;
      };
      resize();
      window.addEventListener('resize', resize);
      cv._resizeFn = resize;
      document.body.appendChild(cv);
      return {
        canvas: cv,
        get ctx() { return cv._ctx; },
        destroy() {
          window.removeEventListener('resize', cv._resizeFn);
          cv.remove();
        }
      };
    }
  };

  Runtime.init();
  window.__tbRuntime = Runtime;

  let fab, menuRoot, menuVisible = false;
  let dofSettingsOpen = false, dofSettingsEl;
  let particleThemeOpen = false, particleThemeEl;
  let inkSettingsOpen = false, inkSettingsEl;
  let dofBlur = 5.5, dofRadius = 150;
  let particleTheme = 'stars';
  let inkColorMode = 'black';

  function getSettingsHeight() {
    let h = 0;
    if (dofSettingsOpen && dofSettingsEl) h += dofSettingsEl.scrollHeight + 10;
    if (particleThemeOpen && particleThemeEl) h += particleThemeEl.scrollHeight + 10;
    if (inkSettingsOpen && inkSettingsEl) h += inkSettingsEl.scrollHeight + 10;
    return h;
  }

  function repositionMenu() {
    const fabRect = fab.getBoundingClientRect();
    const panelW = 248, gap = 8, margin = 8, titleH = 38;
    const listEl = menuRoot.querySelector('#' + NS + 'list');
    const listH = Math.min(listEl.scrollHeight, 280) + 16;
    const settingsH = getSettingsHeight();
    const totalH = titleH + listH + settingsH + 8;
    let left = fabRect.left + fabRect.width / 2 - panelW / 2;
    if (left < margin) left = margin;
    if (left + panelW > window.innerWidth - margin) left = window.innerWidth - panelW - margin;
    menuRoot.style.left = left + 'px';
    menuRoot.style.right = 'auto';
    const spaceAbove = fabRect.top - gap - margin;
    const spaceBelow = window.innerHeight - fabRect.bottom - gap - margin;
    if (spaceAbove >= totalH || spaceAbove >= spaceBelow) {
      menuRoot.style.top = 'auto';
      menuRoot.style.bottom = (window.innerHeight - fabRect.top + gap) + 'px';
      menuRoot.style.transformOrigin = 'center bottom';
      const rect = menuRoot.getBoundingClientRect();
      if (rect.top < margin) { menuRoot.style.top = margin + 'px'; menuRoot.style.bottom = 'auto'; }
    } else {
      menuRoot.style.top = (fabRect.bottom + gap) + 'px';
      menuRoot.style.bottom = 'auto';
      menuRoot.style.transformOrigin = 'center top';
      const rect = menuRoot.getBoundingClientRect();
      if (rect.bottom > window.innerHeight - margin) menuRoot.style.top = (window.innerHeight - totalH - margin) + 'px';
    }
  }

  function showFeatureDesc(label, desc, anchorEl) {
    const existing = document.getElementById(NS + 'desc-popup');
    if (existing) existing.remove();
    const popup = document.createElement('div');
    popup.id = NS + 'desc-popup';
    popup.innerHTML = '<div class="' + NS + 'desc-title">' + label + '</div><div class="' + NS + 'desc-text">' + desc + '</div>';
    document.body.appendChild(popup);
    const rect = anchorEl.getBoundingClientRect();
    const popupW = 228, popupGap = 10;
    let pLeft = rect.right + popupGap;
    if (pLeft + popupW > window.innerWidth - 8) pLeft = rect.left - popupW - popupGap;
    if (pLeft < 8) pLeft = 8;
    let pTop = rect.top;
    if (pTop < 8) pTop = 8;
    popup.style.left = pLeft + 'px';
    popup.style.top = pTop + 'px';
    function onLeave(e) {
      const related = e.relatedTarget;
      if (related && (related === popup || popup.contains(related))) return;
      cleanup();
    }
    function onPopupLeave(e) {
      const related = e.relatedTarget;
      if (related && related === anchorEl) return;
      cleanup();
    }
    function cleanup() {
      if (popup.parentNode) popup.remove();
      anchorEl.removeEventListener('mouseleave', onLeave);
      popup.removeEventListener('mouseleave', onPopupLeave);
    }
    anchorEl.addEventListener('mouseleave', onLeave);
    popup.addEventListener('mouseleave', onPopupLeave);
  }

  function buildDOFSettingsPanel() {
    dofSettingsEl = document.createElement('div');
    dofSettingsEl.id = NS + 'dof-settings';
    dofSettingsEl.style.display = 'none';
    dofSettingsEl.innerHTML =
      '<div class="' + NS + 'setting-row"><span>虚化强度</span><span class="' + NS + 'val">' + dofBlur + 'px</span></div>' +
      '<input class="' + NS + 'slider" type="range" min="2" max="20" value="' + dofBlur + '" step="0.5" data-key="blur">' +
      '<div class="' + NS + 'setting-row"><span>清晰范围</span><span class="' + NS + 'val">' + dofRadius + 'px</span></div>' +
      '<input class="' + NS + 'slider" type="range" min="60" max="350" value="' + dofRadius + '" step="5" data-key="radius">';
    dofSettingsEl.addEventListener('input', function (e) {
      const t = e.target;
      if (!t.classList.contains(NS + 'slider')) return;
      const key = t.dataset.key;
      const val = parseFloat(t.value);
      const row = t.previousElementSibling;
      const span = row.querySelector('.' + NS + 'val');
      if (key === 'blur') { dofBlur = val; span.textContent = val + 'px'; }
      if (key === 'radius') { dofRadius = val; span.textContent = val + 'px'; }
      if (Runtime.isActive('dof')) {
        const inst = Runtime._active.get('dof');
        if (inst && inst.updateSettings) inst.updateSettings(dofBlur, dofRadius);
      }
    });
  }

  function buildParticleThemePanel() {
    particleThemeEl = document.createElement('div');
    particleThemeEl.id = NS + 'particle-theme';
    particleThemeEl.style.display = 'none';
    particleThemeEl.innerHTML =
      '<div class="' + NS + 'theme-row" data-theme="stars"><span class="' + NS + 'theme-option ' + NS + 'theme-active">✦ 星星</span></div>' +
      '<div class="' + NS + 'theme-row" data-theme="sparks"><span class="' + NS + 'theme-option">◆ 火花</span></div>' +
      '<div class="' + NS + 'theme-row" data-theme="bubbles"><span class="' + NS + 'theme-option">○ 泡泡</span></div>';
    particleThemeEl.addEventListener('click', function (e) {
      const row = e.target.closest('.' + NS + 'theme-row');
      if (!row) return;
      particleTheme = row.dataset.theme;
      particleThemeEl.querySelectorAll('.' + NS + 'theme-option').forEach(s => s.classList.remove(NS + 'theme-active'));
      row.querySelector('.' + NS + 'theme-option').classList.add(NS + 'theme-active');
    });
  }

  function buildInkSettingsPanel() {
    inkSettingsEl = document.createElement('div');
    inkSettingsEl.id = NS + 'ink-settings';
    inkSettingsEl.style.display = 'none';
    inkSettingsEl.innerHTML =
      '<div class="' + NS + 'theme-row" data-mode="black"><span class="' + NS + 'theme-option ' + NS + 'theme-active">黑墨</span></div>' +
      '<div class="' + NS + 'theme-row" data-mode="rainbow"><span class="' + NS + 'theme-option">彩虹</span></div>';
    inkSettingsEl.addEventListener('click', function (e) {
      const row = e.target.closest('.' + NS + 'theme-row');
      if (!row) return;
      inkColorMode = row.dataset.mode;
      inkSettingsEl.querySelectorAll('.' + NS + 'theme-option').forEach(s => s.classList.remove(NS + 'theme-active'));
      row.querySelector('.' + NS + 'theme-option').classList.add(NS + 'theme-active');
    });
  }

  function toggleDOFSettings() {
    dofSettingsOpen = !dofSettingsOpen;
    dofSettingsEl.style.display = dofSettingsOpen ? 'block' : 'none';
    repositionMenu();
  }
  function toggleParticleTheme() {
    particleThemeOpen = !particleThemeOpen;
    particleThemeEl.style.display = particleThemeOpen ? 'block' : 'none';
    repositionMenu();
  }
  function toggleInkSettings() {
    inkSettingsOpen = !inkSettingsOpen;
    inkSettingsEl.style.display = inkSettingsOpen ? 'block' : 'none';
    repositionMenu();
  }

  function buildMenu() {
    fab = document.createElement('div');
    fab.id = NS + 'fab';
    fab.innerHTML = '✦';
    fab.title = '视觉效果菜单';
    fab.style.left = (window.innerWidth - 52) + 'px';
    fab.style.top = (window.innerHeight - 52) + 'px';

    menuRoot = document.createElement('div');
    menuRoot.id = NS + 'menu';
    menuRoot.innerHTML =
      '<div id="' + NS + 'panel">' +
        '<div id="' + NS + 'title">视觉效果</div>' +
        '<div id="' + NS + 'list">' +
          '<div class="' + NS + 'item ' + NS + 'item-dof">' +
            '<span class="' + NS + 'label">🔍 景深效果</span>' +
            '<span class="' + NS + 'gear" title="设置">⚙</span>' +
          '</div>' +
          '<div class="' + NS + 'item ' + NS + 'item-particle-trail">' +
            '<span class="' + NS + 'label">✦ 粒子拖尾</span>' +
            '<span class="' + NS + 'gear" title="主题">⚙</span>' +
          '</div>' +
          '<div class="' + NS + 'item ' + NS + 'item-ink-splash">' +
            '<span class="' + NS + 'label">🖋 墨水点击</span>' +
            '<span class="' + NS + 'gear" title="设置">⚙</span>' +
          '</div>' +
          '<div class="' + NS + 'item ' + NS + 'item-canvas-draw">' +
            '<span class="' + NS + 'label">🎨 画布效果</span>' +
            '<span class="' + NS + 'gear" title="工具">⚙</span>' +
          '</div>' +
          '<div class="' + NS + 'sep"></div>' +
          '<div class="' + NS + 'item ' + NS + 'item-destroy">' +
            '<span class="' + NS + 'label">结束脚本</span>' +
          '</div>' +
        '</div>' +
      '</div>';

    buildDOFSettingsPanel();
    const dofItem = menuRoot.querySelector('.' + NS + 'item-dof');
    dofItem.insertAdjacentElement('afterend', dofSettingsEl);

    buildParticleThemePanel();
    const particleItem = menuRoot.querySelector('.' + NS + 'item-particle-trail');
    particleItem.insertAdjacentElement('afterend', particleThemeEl);

    buildInkSettingsPanel();
    const inkItem = menuRoot.querySelector('.' + NS + 'item-ink-splash');
    inkItem.insertAdjacentElement('afterend', inkSettingsEl);

    const dofLabel = dofItem.querySelector('.' + NS + 'label');
    const particleLabel = particleItem.querySelector('.' + NS + 'label');
    const inkLabel = inkItem.querySelector('.' + NS + 'label');
    const canvasItem = menuRoot.querySelector('.' + NS + 'item-canvas-draw');
    const canvasLabel = canvasItem.querySelector('.' + NS + 'label');

    dofLabel.addEventListener('click', e => { e.stopPropagation(); Runtime.toggle('dof'); });
    dofItem.querySelector('.' + NS + 'gear').addEventListener('click', e => { e.stopPropagation(); toggleDOFSettings(); });
    particleLabel.addEventListener('click', e => { e.stopPropagation(); Runtime.toggle('particle-trail'); });
    particleItem.querySelector('.' + NS + 'gear').addEventListener('click', e => { e.stopPropagation(); toggleParticleTheme(); });
    inkLabel.addEventListener('click', e => { e.stopPropagation(); Runtime.toggle('ink-splash'); });
    inkItem.querySelector('.' + NS + 'gear').addEventListener('click', e => { e.stopPropagation(); toggleInkSettings(); });
    canvasLabel.addEventListener('click', e => { e.stopPropagation(); Runtime.toggle('canvas-draw'); });
    canvasItem.querySelector('.' + NS + 'gear').addEventListener('click', e => {
      e.stopPropagation();
      if (!Runtime.isActive('canvas-draw')) Runtime.toggle('canvas-draw');
      const inst = Runtime._active.get('canvas-draw');
      if (inst && inst.toggleToolbar) inst.toggleToolbar();
    });

    dofLabel.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showFeatureDesc('🔍 景深效果', '鼠标周围以及选中区域保持清晰，其余区域模糊，模拟相机景深。可在⚙设置虚化强度与清晰范围。', dofLabel); });
    particleLabel.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showFeatureDesc('✦ 粒子拖尾', '鼠标移动时产生粒子尾迹。可在⚙选择星星/火花/泡泡主题。', particleLabel); });
    inkLabel.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showFeatureDesc('🖋 墨水点击', '每次点击产生不规则墨渍与飞溅液滴。可在⚙切换黑墨/彩虹模式。', inkLabel); });
    canvasLabel.addEventListener('contextmenu', e => { e.preventDefault(); e.stopPropagation(); showFeatureDesc('🎨 画布效果', '在当前页面叠加透明画布，点击⚙打开工具浮窗：画笔/橡皮/形状/箭头与颜色粗细。', canvasLabel); });

    menuRoot.querySelector('.' + NS + 'item-destroy').addEventListener('click', destroyEverything);
    menuRoot.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', e => {
      if (menuVisible && !menuRoot.contains(e.target) && e.target !== fab) dismissMenu();
    });

    document.body.appendChild(fab);
    document.body.appendChild(menuRoot);

    updateIndicators();
    initFABDrag();
  }

  function updateIndicators() {
    if (!menuRoot) return;
    const dofItem = menuRoot.querySelector('.' + NS + 'item-dof');
    const particleItem = menuRoot.querySelector('.' + NS + 'item-particle-trail');
    const inkItem = menuRoot.querySelector('.' + NS + 'item-ink-splash');
    const canvasItem = menuRoot.querySelector('.' + NS + 'item-canvas-draw');
    dofItem.classList.toggle(NS + 'active', Runtime.isActive('dof'));
    particleItem.classList.toggle(NS + 'active', Runtime.isActive('particle-trail'));
    inkItem.classList.toggle(NS + 'active', Runtime.isActive('ink-splash'));
    if (canvasItem) canvasItem.classList.toggle(NS + 'active', Runtime.isActive('canvas-draw'));
    dofItem.querySelector('.' + NS + 'label').title = Runtime.isActive('dof') ? '再次点击关闭效果' : '右键查看功能说明';
    particleItem.querySelector('.' + NS + 'label').title = Runtime.isActive('particle-trail') ? '再次点击关闭效果' : '右键查看功能说明';
    inkItem.querySelector('.' + NS + 'label').title = Runtime.isActive('ink-splash') ? '再次点击关闭效果' : '右键查看功能说明';
    if (canvasItem) canvasItem.querySelector('.' + NS + 'label').title = Runtime.isActive('canvas-draw') ? '再次点击关闭效果' : '右键查看功能说明';
  }

  function showMenu() {
    menuVisible = true;
    repositionMenu();
    menuRoot.classList.add(NS + 'visible');
    fab.classList.add(NS + 'active');
  }
  function dismissMenu() {
    menuVisible = false;
    menuRoot.classList.remove(NS + 'visible');
    fab.classList.remove(NS + 'active');
  }

  function destroyEverything() {
    dismissMenu();
    Runtime.destroyAll();
    window.dispatchEvent(new CustomEvent('tb-skill:destroy-all'));
    if (fab) { fab.remove(); fab = null; }
    if (menuRoot) { menuRoot.remove(); menuRoot = null; }
    if (obs) { obs.disconnect(); obs = null; }
    cssOut(NS + 'menu');
    cssOut(NS + 'dof-vars');
    cssOut(NS + 'dof-styles');
    document.documentElement.style.removeProperty('--' + NS + 'dof-blur');
    document.documentElement.style.removeProperty('--' + NS + 'dof-radius');
    window.__tbMasterLoaded = false;
  }

  let dragStartX, dragStartY, dragStartLeft, dragStartTop, dragged;

  function initFABDrag() {
    fab.addEventListener('mousedown', onDragStart);
    fab.addEventListener('touchstart', onDragStart, { passive: false });
    fab.addEventListener('contextmenu', e => e.preventDefault());
  }
  function onDragStart(e) {
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    dragStartX = pt.clientX; dragStartY = pt.clientY;
    dragStartLeft = fab.offsetLeft; dragStartTop = fab.offsetTop;
    dragged = false;
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  }
  function onDragMove(e) {
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragStartX, dy = pt.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragged = true;
    if (!dragged) return;
    fab.style.left = Math.max(0, Math.min(window.innerWidth - 36, dragStartLeft + dx)) + 'px';
    fab.style.top  = Math.max(0, Math.min(window.innerHeight - 36, dragStartTop + dy)) + 'px';
    fab.style.right = 'auto'; fab.style.bottom = 'auto';
    if (menuVisible) repositionMenu();
  }
  function onDragEnd(e) {
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    if (e && e.button !== undefined && e.button !== 0) return;
    if (!dragged) { menuVisible ? dismissMenu() : showMenu(); }
  }

  Runtime.register('dof', {
    mount() {
      cssIn(':root { --' + NS + 'dof-blur:' + dofBlur + 'px; --' + NS + 'dof-radius:' + dofRadius + 'px; }', NS + 'dof-vars');
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      svg.id = NS + 'dof-svg';
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
      svg.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483639;';
      const defs = document.createElementNS(svgNS, 'defs');
      const mask = document.createElementNS(svgNS, 'mask');
      mask.id = NS + 'dof-mask';
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      const base = document.createElementNS(svgNS, 'rect');
      base.setAttribute('width', '100%'); base.setAttribute('height', '100%'); base.setAttribute('fill', 'white');
      mask.appendChild(base);
      const cursorEl = document.createElementNS(svgNS, 'circle');
      cursorEl.id = NS + 'dof-cursor';
      cursorEl.setAttribute('cx', window.innerWidth / 2); cursorEl.setAttribute('cy', window.innerHeight / 2);
      cursorEl.setAttribute('r', dofRadius); cursorEl.setAttribute('fill', 'black');
      mask.appendChild(cursorEl);
      const selEl = document.createElementNS(svgNS, 'rect');
      selEl.id = NS + 'dof-selection';
      selEl.setAttribute('x', 0); selEl.setAttribute('y', 0);
      selEl.setAttribute('width', 0); selEl.setAttribute('height', 0);
      selEl.setAttribute('fill', 'black'); selEl.setAttribute('rx', '6');
      mask.appendChild(selEl);
      defs.appendChild(mask); svg.appendChild(defs);
      document.body.appendChild(svg);
      const overlay = document.createElement('div');
      overlay.id = NS + 'dof-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483640;pointer-events:none;' +
        'backdrop-filter:blur(' + dofBlur + 'px);-webkit-backdrop-filter:blur(' + dofBlur + 'px);' +
        'mask:url(#' + NS + 'dof-mask);-webkit-mask:url(#' + NS + 'dof-mask);will-change:backdrop-filter;';
      document.body.appendChild(overlay);
      let tick = false;
      const mouseFn = e => {
        if (tick) return;
        requestAnimationFrame(() => {
          cursorEl.setAttribute('cx', e.clientX);
          cursorEl.setAttribute('cy', e.clientY);
          tick = false;
        });
        tick = true;
      };
      document.addEventListener('mousemove', mouseFn, { passive: true });
      let selRaf;
      function selectionLoop() {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          selEl.setAttribute('width', '0'); selEl.setAttribute('height', '0');
        } else {
          try {
            const r = sel.getRangeAt(0).getBoundingClientRect();
            selEl.setAttribute('x', r.left); selEl.setAttribute('y', r.top);
            selEl.setAttribute('width', r.width); selEl.setAttribute('height', r.height);
          } catch (_) { selEl.setAttribute('width', '0'); selEl.setAttribute('height', '0'); }
        }
        selRaf = requestAnimationFrame(selectionLoop);
      }
      selRaf = requestAnimationFrame(selectionLoop);
      return {
        updateSettings(blur, radius) {
          dofBlur = blur; dofRadius = radius;
          cssIn(':root { --' + NS + 'dof-blur:' + blur + 'px; --' + NS + 'dof-radius:' + radius + 'px; }', NS + 'dof-vars');
          overlay.style.backdropFilter = 'blur(' + blur + 'px)';
          overlay.style.webkitBackdropFilter = 'blur(' + blur + 'px)';
          cursorEl.setAttribute('r', radius);
        },
        destroy() {
          document.removeEventListener('mousemove', mouseFn);
          cancelAnimationFrame(selRaf);
          [NS + 'dof-overlay', NS + 'dof-svg'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
          cssOut(NS + 'dof-vars');
          document.documentElement.style.removeProperty('--' + NS + 'dof-blur');
          document.documentElement.style.removeProperty('--' + NS + 'dof-radius');
        }
      };
    }
  });

  Runtime.register('particle-trail', {
    mount() {
      const particles = [];
      let rafId;
      function getColor() {
        if (particleTheme === 'stars') return 'hsl(45, 95%, ' + (55 + Math.random() * 20) + '%)';
        if (particleTheme === 'sparks') return 'hsl(' + (10 + Math.random() * 20) + ', 95%, ' + (45 + Math.random() * 25) + '%)';
        return 'hsl(200, 80%, ' + (65 + Math.random() * 20) + '%)';
      }
      function getShape() {
        if (particleTheme === 'stars') return '50% 50% 50% 50% / 50% 50% 50% 50%';
        if (particleTheme === 'sparks') return '40% 60% 55% 45% / 45% 55% 40% 60%';
        return '50%';
      }
      function loop() {
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.life -= 16; p.vx *= 0.96; p.vy += 0.15; p.vy *= 0.99;
          p.x += p.vx; p.y += p.vy;
          p.alpha = Math.max(0, p.life / p.maxLife);
          p.el.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)';
          p.el.style.opacity = p.alpha;
          if (p.life <= 0) { p.el.remove(); particles.splice(i, 1); }
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      let spawnCount = 0;
      const mouseFn = e => {
        spawnCount++;
        if (spawnCount % 2 !== 0) return;
        if (particles.length >= 120) { const oldest = particles.shift(); oldest.el.remove(); }
        const count = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
          const el = document.createElement('div');
          const size = 4 + Math.random() * 6;
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.5 + Math.random() * 2.5;
          const maxLife = 600 + Math.random() * 600;
          const color = getColor();
          el.style.cssText =
            'position:fixed;pointer-events:none;z-index:2147483640;' +
            'width:' + size + 'px;height:' + size + 'px;' +
            'border-radius:' + getShape() + ';background:' + color + ';' +
            'box-shadow:0 0 ' + (size * 1.5) + 'px ' + color + ';' +
            'left:0;top:0;transform:translate(' + e.clientX + 'px,' + e.clientY + 'px);';
          document.body.appendChild(el);
          particles.push({ el, x: e.clientX, y: e.clientY, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1, life: maxLife, maxLife, alpha: 1 });
        }
      };
      document.addEventListener('mousemove', mouseFn, { passive: true });
      return {
        destroy() {
          document.removeEventListener('mousemove', mouseFn);
          cancelAnimationFrame(rafId);
          particles.forEach(p => p.el.remove());
          particles.length = 0;
        }
      };
    }
  });

  Runtime.register('ink-splash', {
    mount() {
      function getInkColor() {
        if (inkColorMode === 'rainbow') return 'hsl(' + Math.floor(Math.random() * 360) + ', 80%, 45%)';
        const shades = ['#0f172a', '#1e293b', '#334155', '#1a1a2e', '#16213e'];
        return shades[Math.floor(Math.random() * shades.length)];
      }
      function spawnInkDrop(x, y, size, parentSvg) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = parentSvg || document.createElementNS(svgNS, 'svg');
        if (!parentSvg) {
          svg.setAttribute('width', size * 4); svg.setAttribute('height', size * 4);
          svg.style.cssText = 'position:fixed;left:' + (x - size * 2) + 'px;top:' + (y - size * 2) + 'px;z-index:2147483640;pointer-events:none;overflow:visible;';
        }
        const defs = svg.querySelector('defs') || (() => { const d = document.createElementNS(svgNS, 'defs'); svg.appendChild(d); return d; })();
        const filterId = NS + 'ink-filter-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
        const filter = document.createElementNS(svgNS, 'filter');
        filter.id = filterId;
        const turb = document.createElementNS(svgNS, 'feTurbulence');
        turb.setAttribute('type', 'fractalNoise');
        turb.setAttribute('baseFrequency', (0.015 + Math.random() * 0.025).toString());
        turb.setAttribute('numOctaves', (2 + Math.floor(Math.random() * 3)).toString());
        turb.setAttribute('seed', Math.floor(Math.random() * 100).toString());
        turb.setAttribute('result', 'turb');
        const dm = document.createElementNS(svgNS, 'feDisplacementMap');
        dm.setAttribute('in', 'SourceGraphic'); dm.setAttribute('in2', 'turb');
        dm.setAttribute('scale', (18 + Math.random() * 20).toString());
        dm.setAttribute('xChannelSelector', 'R'); dm.setAttribute('yChannelSelector', 'G');
        filter.appendChild(turb); filter.appendChild(dm); defs.appendChild(filter);
        const cx = parentSvg ? x : size * 2, cy = parentSvg ? y : size * 2;
        const r = size * (0.7 + Math.random() * 0.6);
        const color = getInkColor();
        const blob = document.createElementNS(svgNS, 'circle');
        blob.setAttribute('cx', cx); blob.setAttribute('cy', cy); blob.setAttribute('r', r);
        blob.setAttribute('fill', color); blob.setAttribute('filter', 'url(#' + filterId + ')');
        const blob2 = document.createElementNS(svgNS, 'circle');
        const ox = (Math.random() - 0.5) * r * 0.8, oy = (Math.random() - 0.5) * r * 0.6;
        blob2.setAttribute('cx', cx + ox); blob2.setAttribute('cy', cy + oy);
        blob2.setAttribute('r', r * (0.4 + Math.random() * 0.4)); blob2.setAttribute('fill', color); blob2.setAttribute('opacity', '0.7');
        svg.appendChild(blob2); svg.appendChild(blob);
        for (let i = 0; i < Math.floor(3 + Math.random() * 7); i++) {
          const a = Math.random() * Math.PI * 2, d = r * (0.7 + Math.random() * 1.0);
          const dot = document.createElementNS(svgNS, 'circle');
          dot.setAttribute('cx', cx + Math.cos(a) * d); dot.setAttribute('cy', cy + Math.sin(a) * d);
          dot.setAttribute('r', 1.5 + Math.random() * 4); dot.setAttribute('fill', color);
          dot.setAttribute('opacity', (0.3 + Math.random() * 0.5).toString()); svg.appendChild(dot);
        }
        for (let j = 0; j < Math.floor(4 + Math.random() * 8); j++) {
          const a = Math.random() * Math.PI * 2, d = r * (1.0 + Math.random() * 1.3);
          const tdot = document.createElementNS(svgNS, 'circle');
          tdot.setAttribute('cx', cx + Math.cos(a) * d); tdot.setAttribute('cy', cy + Math.sin(a) * d);
          tdot.setAttribute('r', 0.8 + Math.random() * 2); tdot.setAttribute('fill', color);
          tdot.setAttribute('opacity', (0.2 + Math.random() * 0.3).toString()); svg.appendChild(tdot);
        }
        if (!parentSvg) document.body.appendChild(svg);
        return { el: svg, start: performance.now(), duration: 600 + Math.random() * 500, scale: 0.7 + Math.random() * 0.6 };
      }
      const splashes = [];
      let rafId;
      const clickFn = e => {
        if (fab && fab.contains(e.target)) return;
        if (menuRoot && menuRoot.contains(e.target)) return;
        if (splashes.length >= 25) { const old = splashes.shift(); old.el.remove(); }
        const mainSize = 18 + Math.random() * 32;
        splashes.push(spawnInkDrop(e.clientX, e.clientY, mainSize));
        if (Math.random() < 0.5) {
          const sx = e.clientX + (Math.random() - 0.5) * mainSize * 2;
          const sy = e.clientY + (Math.random() - 0.5) * mainSize * 2;
          splashes.push(spawnInkDrop(sx, sy, mainSize * (0.3 + Math.random() * 0.4)));
        }
      };
      function loop(ts) {
        for (let i = splashes.length - 1; i >= 0; i--) {
          const s = splashes[i];
          const progress = Math.min(1, (ts - s.start) / s.duration);
          const eased = 1 - Math.pow(1 - progress, 4);
          s.el.style.transform = 'scale(' + (0.05 + eased * s.scale) + ')';
          s.el.style.opacity = 0.85 * (1 - Math.pow(progress, 1.5));
          if (progress >= 1) { s.el.remove(); splashes.splice(i, 1); }
        }
        rafId = requestAnimationFrame(loop);
      }
      rafId = requestAnimationFrame(loop);
      document.addEventListener('click', clickFn);
      return {
        destroy() {
          document.removeEventListener('click', clickFn);
          cancelAnimationFrame(rafId);
          splashes.forEach(s => s.el.remove());
          splashes.length = 0;
        }
      };
    }
  });

  Runtime.register('canvas-draw', {
    mount() {
      const dpr = () => window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.id = NS + 'draw-canvas';
      canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483641;cursor:crosshair;pointer-events:auto;background:transparent;';
      let ctx;
      const state = {
        tool: 'pen', color: '#ef4444', size: 4, eraserSize: 20, icon: 'star',
        drawing: false, startX: 0, startY: 0, lastX: 0, lastY: 0
      };
      let previewSnap = null;

      function capturePreview() {
        try { previewSnap = ctx.getImageData(0, 0, canvas.width, canvas.height); } catch (_) { previewSnap = null; }
      }
      function restorePreview() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        if (previewSnap) ctx.putImageData(previewSnap, 0, 0);
      }
      function makeEraserCursor(size) {
        const px = Math.max(4, Math.round(size));
        const half = Math.round(px / 2);
        const s = '<svg xmlns="http://www.w3.org/2000/svg" width="' + (px + 2) + '" height="' + (px + 2) + '"><rect x="1" y="1" width="' + px + '" height="' + px + '" fill="rgba(255,255,255,0.85)" stroke="#333" stroke-width="1.5"/></svg>';
        return 'url("data:image/svg+xml;base64,' + btoa(s) + '") ' + (half + 1) + ' ' + (half + 1) + ', crosshair';
      }
      function applyEraserCursor() { canvas.style.cursor = makeEraserCursor(state.eraserSize); }

      function drawIconShape(c, icon, s, lw) {
        if (icon === 'star') {
          c.beginPath();
          for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? s : s / 2.4;
            const a = (Math.PI / 5) * i - Math.PI / 2;
            i === 0 ? c.moveTo(Math.cos(a) * r, Math.sin(a) * r) : c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          }
          c.closePath(); c.fill();
        } else if (icon === 'heart') {
          c.beginPath();
          c.moveTo(0, s * 0.35);
          c.bezierCurveTo(s, -s * 0.4, s * 0.6, -s, 0, -s * 0.2);
          c.bezierCurveTo(-s * 0.6, -s, -s, -s * 0.4, 0, s * 0.35);
          c.closePath(); c.fill();
        } else if (icon === 'check') {
          c.lineWidth = Math.max(2, lw);
          c.beginPath();
          c.moveTo(-s * 0.6, 0); c.lineTo(-s * 0.15, s * 0.5); c.lineTo(s * 0.7, -s * 0.55);
          c.stroke();
        } else if (icon === 'cross') {
          c.lineWidth = Math.max(2, lw);
          c.beginPath();
          c.moveTo(-s * 0.6, -s * 0.6); c.lineTo(s * 0.6, s * 0.6);
          c.moveTo(s * 0.6, -s * 0.6); c.lineTo(-s * 0.6, s * 0.6);
          c.stroke();
        }
      }

      function previewShape(ax, ay, rx, ry) {
        restorePreview();
        ctx.save();
        ctx.strokeStyle = state.color; ctx.fillStyle = state.color;
        ctx.lineWidth = state.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        const t = state.tool;
        if (t === 'rect') {
          ctx.strokeRect(ax - Math.abs(rx), ay - Math.abs(ry), Math.abs(rx) * 2, Math.abs(ry) * 2);
        } else if (t === 'circle') {
          ctx.beginPath();
          ctx.ellipse(ax, ay, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
          ctx.stroke();
        } else if (t === 'line') {
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + rx, ay + ry); ctx.stroke();
        } else if (t === 'arrow') {
          const x2 = ax + rx, y2 = ay + ry;
          const ang = Math.atan2(ry, rx);
          const hl = Math.max(10, state.size * 3);
          ctx.beginPath();
          ctx.moveTo(ax, ay); ctx.lineTo(x2, y2);
          ctx.lineTo(x2 - hl * Math.cos(ang - Math.PI / 6), y2 - hl * Math.sin(ang - Math.PI / 6));
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - hl * Math.cos(ang + Math.PI / 6), y2 - hl * Math.sin(ang + Math.PI / 6));
          ctx.stroke();
        } else if (t === 'icon') {
          const s = Math.max(Math.min(Math.abs(rx), Math.abs(ry)), 5);
          ctx.translate(ax, ay);
          drawIconShape(ctx, state.icon, s, state.size);
        }
        ctx.restore();
      }

      function eraseStroke(x0, y0, x1, y1) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = state.eraserSize;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.restore();
      }

      function onDown(e) {
        if (toolbar && toolbar.contains(e.target)) return;
        e.preventDefault();
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        state.drawing = true;
        state.startX = state.lastX = mx;
        state.startY = state.lastY = my;
        if (state.tool === 'pen') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = state.color; ctx.lineWidth = state.size;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + 0.01, my + 0.01); ctx.stroke();
          ctx.restore();
        } else if (state.tool === 'eraser') {
          eraseStroke(mx, my, mx + 0.01, my + 0.01);
        } else {
          capturePreview();
        }
      }

      function onMove(e) {
        const r = canvas.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        if (!state.drawing) return;
        if (state.tool === 'pen') {
          ctx.save();
          ctx.globalCompositeOperation = 'source-over';
          ctx.strokeStyle = state.color;
          ctx.lineWidth = state.size;
          ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(state.lastX, state.lastY); ctx.lineTo(mx, my); ctx.stroke();
          ctx.restore();
          state.lastX = mx; state.lastY = my;
        } else if (state.tool === 'eraser') {
          eraseStroke(state.lastX, state.lastY, mx, my);
          state.lastX = mx; state.lastY = my;
        } else {
          previewShape(state.startX, state.startY, mx - state.startX, my - state.startY);
        }
      }

      function onUp() {
        if (!state.drawing) return;
        state.drawing = false;
        if (state.tool === 'pen' || state.tool === 'eraser') return;
        previewSnap = null;
      }

      function resize() {
        const w = window.innerWidth, h = window.innerHeight;
        let snapshot = null;
        if (ctx) { try { snapshot = canvas.toDataURL(); } catch (_) {} }
        canvas.width = w * dpr(); canvas.height = h * dpr();
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx = canvas.getContext('2d');
        ctx.scale(dpr(), dpr());
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (snapshot) {
          const img = new Image();
          img.onload = () => { ctx.drawImage(img, 0, 0, w, h); };
          img.src = snapshot;
        }
      }

      document.body.appendChild(canvas);
      canvas.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);

      let toolbar = null, toolbarVisible = false;
      let eraserSizeRow = null;

      function buildToolbar() {
        toolbar = document.createElement('div');
        toolbar.id = NS + 'draw-toolbar';
        toolbar.innerHTML =
          '<div class="' + NS + 'tb-head"><span>🎨 画布工具</span><span class="' + NS + 'tb-close" title="关闭面板">✕</span></div>' +
          '<div class="' + NS + 'tb-sec-title">画笔</div>' +
          '<div class="' + NS + 'tb-row">' +
            '<button class="' + NS + 'tb-btn ' + NS + 'tb-on" data-tool="pen" title="画笔">✏️</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="eraser" title="橡皮擦">🩹</button>' +
          '</div>' +
          '<div class="' + NS + 'tb-eraser-size" style="display:none;">' +
            '<div class="' + NS + 'tb-sec-title">橡皮大小 <span class="' + NS + 'tb-eraser-size-val">20</span>px</div>' +
            '<input type="range" class="' + NS + 'tb-eraser-sz" min="4" max="80" value="20" step="2">' +
          '</div>' +
          '<div class="' + NS + 'tb-sec-title">形状</div>' +
          '<div class="' + NS + 'tb-row">' +
            '<button class="' + NS + 'tb-btn" data-tool="rect" title="矩形">▭</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="circle" title="椭圆">◯</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="line" title="直线">／</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="arrow" title="箭头">➤</button>' +
          '</div>' +
          '<div class="' + NS + 'tb-row">' +
            '<button class="' + NS + 'tb-btn" data-tool="icon" data-icon="star" title="星星">★</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="icon" data-icon="heart" title="爱心">♥</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="icon" data-icon="check" title="对勾">✓</button>' +
            '<button class="' + NS + 'tb-btn" data-tool="icon" data-icon="cross" title="叉">✕</button>' +
          '</div>' +
          '<div class="' + NS + 'tb-sec-title">颜色</div>' +
          '<div class="' + NS + 'tb-row ' + NS + 'tb-colors">' +
            ['#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7','#0f172a','#ffffff'].map((c, i) =>
              '<span class="' + NS + 'tb-color' + (i === 0 ? ' ' + NS + 'tb-on' : '') + '" data-color="' + c + '" style="background:' + c + '"></span>'
            ).join('') +
            '<input type="color" class="' + NS + 'tb-color-pick" value="#ef4444" title="自定义颜色">' +
          '</div>' +
          '<div class="' + NS + 'tb-sec-title">粗细 <span class="' + NS + 'tb-size-val">4</span>px</div>' +
          '<input type="range" class="' + NS + 'tb-size" min="1" max="40" value="4" step="1">' +
          '<div class="' + NS + 'tb-row">' +
            '<button class="' + NS + 'tb-btn ' + NS + 'tb-wide" data-act="clear">🗑 清空</button>' +
          '</div>';

        document.body.appendChild(toolbar);
        eraserSizeRow = toolbar.querySelector('.' + NS + 'tb-eraser-size');
        toolbar.style.left = '20px';
        toolbar.style.top = '80px';

        toolbar.querySelector('.' + NS + 'tb-close').addEventListener('click', () => {
          toolbar.style.display = 'none'; toolbarVisible = false;
        });

        toolbar.querySelectorAll('[data-tool]').forEach(b => {
          b.addEventListener('click', () => {
            state.tool = b.dataset.tool;
            if (b.dataset.icon) state.icon = b.dataset.icon;
            toolbar.querySelectorAll('[data-tool]').forEach(x => x.classList.remove(NS + 'tb-on'));
            b.classList.add(NS + 'tb-on');
            if (state.tool === 'eraser') {
              applyEraserCursor();
              eraserSizeRow.style.display = 'block';
            } else {
              canvas.style.cursor = 'crosshair';
              eraserSizeRow.style.display = 'none';
            }
          });
        });

        toolbar.querySelectorAll('.' + NS + 'tb-color').forEach(s => {
          s.addEventListener('click', () => {
            state.color = s.dataset.color;
            toolbar.querySelectorAll('.' + NS + 'tb-color').forEach(x => x.classList.remove(NS + 'tb-on'));
            s.classList.add(NS + 'tb-on');
            toolbar.querySelector('.' + NS + 'tb-color-pick').value = state.color;
          });
        });
        toolbar.querySelector('.' + NS + 'tb-color-pick').addEventListener('input', e => {
          state.color = e.target.value;
          toolbar.querySelectorAll('.' + NS + 'tb-color').forEach(x => x.classList.remove(NS + 'tb-on'));
        });

        const sizeInput = toolbar.querySelector('.' + NS + 'tb-size');
        const sizeVal = toolbar.querySelector('.' + NS + 'tb-size-val');
        sizeInput.addEventListener('input', () => {
          state.size = parseInt(sizeInput.value, 10);
          sizeVal.textContent = state.size;
        });

        const eraserSzInput = toolbar.querySelector('.' + NS + 'tb-eraser-sz');
        const eraserSzVal = toolbar.querySelector('.' + NS + 'tb-eraser-size-val');
        eraserSzInput.addEventListener('input', () => {
          state.eraserSize = parseInt(eraserSzInput.value, 10);
          eraserSzVal.textContent = state.eraserSize;
          if (state.tool === 'eraser') applyEraserCursor();
        });

        toolbar.querySelector('[data-act="clear"]').addEventListener('click', () => {
          ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.restore();
          previewSnap = null;
        });

        const head = toolbar.querySelector('.' + NS + 'tb-head');
        let tdx = 0, tdy = 0, tdrag = false;
        head.addEventListener('mousedown', e => {
          if (e.target.classList.contains(NS + 'tb-close')) return;
          tdrag = true; tdx = e.clientX - toolbar.offsetLeft; tdy = e.clientY - toolbar.offsetTop;
          e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
          if (!tdrag) return;
          toolbar.style.left = Math.max(0, Math.min(window.innerWidth - 220, e.clientX - tdx)) + 'px';
          toolbar.style.top = Math.max(0, Math.min(window.innerHeight - 80, e.clientY - tdy)) + 'px';
        });
        document.addEventListener('mouseup', () => { tdrag = false; });
      }

      resize();
      window.addEventListener('resize', resize);
      buildToolbar();
      toolbar.style.display = 'block';
      toolbarVisible = true;

      return {
        toggleToolbar() {
          if (!toolbar) return;
          toolbarVisible = !toolbarVisible;
          toolbar.style.display = toolbarVisible ? 'block' : 'none';
        },
        destroy() {
          window.removeEventListener('resize', resize);
          canvas.removeEventListener('mousedown', onDown);
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (canvas.parentNode) canvas.remove();
          if (toolbar && toolbar.parentNode) toolbar.remove();
        }
      };
    }
  });

  function injectMenuCSS() {
    cssIn(
      '#' + NS + 'fab{position:fixed;z-index:2147483646;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%);color:#fff;font-size:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 12px rgba(59,130,246,0.45);transition:transform 0.25s ease,box-shadow 0.25s ease,background 0.25s ease;user-select:none;border:none;outline:none;will-change:transform;pointer-events:auto;}' +
      '#' + NS + 'fab:hover{transform:scale(1.12);box-shadow:0 5px 18px rgba(59,130,246,0.6);}' +
      '#' + NS + 'fab:active{transform:scale(0.95);}' +
      '#' + NS + 'fab.' + NS + 'active{transform:rotate(45deg);background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);box-shadow:0 4px 16px rgba(245,158,11,0.5);}' +
      '#' + NS + 'menu{position:fixed;z-index:2147483645;pointer-events:none;opacity:0;transform:scale(0.92) translateY(-6px);transition:opacity 0.22s ease,transform 0.22s ease;}' +
      '#' + NS + 'menu.' + NS + 'visible{pointer-events:auto;opacity:1;transform:scale(1) translateY(0);}' +
      '#' + NS + 'panel{width:240px;border-radius:14px;background:rgba(255,255,255,0.9);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);box-shadow:0 8px 32px rgba(0,0,0,0.12),0 1px 3px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.06);overflow:hidden;}' +
      '#' + NS + 'title{padding:14px 18px 10px;font-size:13px;font-weight:600;color:#1e293b;letter-spacing:0.3px;border-bottom:1px solid rgba(0,0,0,0.06);}' +
      '#' + NS + 'list{max-height:280px;overflow-y:auto;padding:4px 8px;}' +
      '#' + NS + 'list::-webkit-scrollbar{width:4px;}' +
      '#' + NS + 'list::-webkit-scrollbar-track{background:transparent;}' +
      '#' + NS + 'list::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.12);border-radius:2px;}' +
      '.' + NS + 'item{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;font-size:14px;color:#334155;cursor:pointer;transition:background 0.15s ease,color 0.15s ease;user-select:none;margin-bottom:1px;}' +
      '.' + NS + 'item:hover{background:rgba(59,130,246,0.08);color:#2563eb;}' +
      '.' + NS + 'item.' + NS + 'active{background:rgba(59,130,246,0.12);color:#2563eb;font-weight:600;}' +
      '.' + NS + 'label{flex:1;}' +
      '.' + NS + 'sep{height:1px;margin:6px 12px;background:rgba(0,0,0,0.06);}' +
      '.' + NS + 'item-destroy{color:#94a3b8;font-weight:500;}' +
      '.' + NS + 'item-destroy:hover{color:#ef4444;background:rgba(239,68,68,0.07);}' +
      '.' + NS + 'gear{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-size:13px;cursor:pointer;opacity:0.45;transition:opacity 0.15s,background 0.15s;}' +
      '.' + NS + 'gear:hover{opacity:1;background:rgba(0,0,0,0.06);}' +
      '#' + NS + 'dof-settings{padding:4px 12px 10px;margin-bottom:4px;background:rgba(59,130,246,0.04);border-radius:10px;}' +
      '.' + NS + 'setting-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:rgba(0,0,0,0.45);padding:6px 0 2px;}' +
      '.' + NS + 'val{color:#2563eb;font-weight:600;}' +
      '.' + NS + 'slider{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(59,130,246,0.15);outline:none;margin:4px 0;}' +
      '.' + NS + 'slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#3b82f6;cursor:pointer;box-shadow:0 1px 4px rgba(59,130,246,0.35);}' +
      '#' + NS + 'particle-theme,#' + NS + 'ink-settings{padding:4px 12px 10px;margin-bottom:4px;background:rgba(59,130,246,0.04);border-radius:10px;}' +
      '.' + NS + 'theme-row{padding:6px 0;cursor:pointer;user-select:none;}' +
      '.' + NS + 'theme-option{display:block;padding:6px 10px;border-radius:8px;font-size:12px;color:#64748b;transition:background 0.15s,color 0.15s;}' +
      '.' + NS + 'theme-option:hover{background:rgba(59,130,246,0.08);color:#2563eb;}' +
      '.' + NS + 'theme-option.' + NS + 'theme-active{background:rgba(59,130,246,0.14);color:#2563eb;font-weight:600;}' +
      '.' + NS + 'item-ext-night-vision.' + NS + 'active{background:rgba(34,197,94,0.14);color:#22c55e;font-weight:600;}' +
      '.' + NS + 'item-ext-vhs.' + NS + 'active{background:rgba(245,158,11,0.14);color:#f59e0b;font-weight:600;}' +
      '.' + NS + 'item-ext-aging.' + NS + 'active{background:rgba(59,130,246,0.12);color:#2563eb;font-weight:600;}' +
      '#' + NS + 'desc-popup{position:fixed;z-index:2147483647;max-width:220px;padding:12px 16px;border-radius:12px;background:rgba(255,255,255,0.94);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:0 6px 24px rgba(0,0,0,0.14),0 1px 3px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.06);font-size:12px;color:#334155;line-height:1.55;pointer-events:auto;animation:' + NS + 'desc-in 0.18s ease;}' +
      '.' + NS + 'desc-title{font-weight:600;color:#1e293b;margin-bottom:4px;font-size:13px;}' +
      '.' + NS + 'desc-text{color:#475569;}' +
      '@keyframes ' + NS + 'desc-in{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}' +
      '#' + NS + 'draw-toolbar{position:fixed;z-index:2147483646;width:220px;border-radius:14px;background:rgba(255,255,255,0.95);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);box-shadow:0 8px 32px rgba(0,0,0,0.18),0 1px 3px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.06);padding:10px 12px 12px;font-family:system-ui,-apple-system,sans-serif;color:#1e293b;user-select:none;}' +
      '.' + NS + 'tb-head{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:600;color:#1e293b;padding-bottom:8px;border-bottom:1px solid rgba(0,0,0,0.06);margin-bottom:8px;cursor:move;}' +
      '.' + NS + 'tb-close{cursor:pointer;color:#94a3b8;font-size:14px;padding:2px 6px;border-radius:6px;}' +
      '.' + NS + 'tb-close:hover{background:rgba(239,68,68,0.1);color:#ef4444;}' +
      '.' + NS + 'tb-sec-title{font-size:11px;color:#64748b;font-weight:600;margin:6px 0 4px;letter-spacing:0.3px;}' +
      '.' + NS + 'tb-row{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;}' +
      '.' + NS + 'tb-btn{flex:1;min-width:36px;padding:6px 8px;border:1px solid rgba(0,0,0,0.08);border-radius:8px;background:#fff;color:#334155;font-size:14px;cursor:pointer;transition:all 0.15s;}' +
      '.' + NS + 'tb-btn:hover{background:rgba(59,130,246,0.08);border-color:#3b82f6;color:#2563eb;}' +
      '.' + NS + 'tb-btn.' + NS + 'tb-on{background:#3b82f6;border-color:#3b82f6;color:#fff;}' +
      '.' + NS + 'tb-wide{flex:1 1 100%;}' +
      '.' + NS + 'tb-colors{align-items:center;}' +
      '.' + NS + 'tb-color{width:22px;height:22px;border-radius:50%;cursor:pointer;border:2px solid rgba(0,0,0,0.08);box-sizing:border-box;transition:transform 0.15s;}' +
      '.' + NS + 'tb-color:hover{transform:scale(1.15);}' +
      '.' + NS + 'tb-color.' + NS + 'tb-on{border-color:#1e293b;transform:scale(1.18);}' +
      '.' + NS + 'tb-color-pick{width:24px;height:24px;border:none;background:transparent;cursor:pointer;padding:0;}' +
      '.' + NS + 'tb-size{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(59,130,246,0.15);outline:none;margin:4px 0 8px;}' +
      '.' + NS + 'tb-size::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:50%;background:#3b82f6;cursor:pointer;box-shadow:0 1px 4px rgba(59,130,246,0.35);}' +
      '.' + NS + 'tb-eraser-sz{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;background:rgba(100,116,139,0.25);outline:none;margin:4px 0 8px;}' +
      '.' + NS + 'tb-eraser-sz::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;border-radius:0;background:#64748b;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.2);}' +
      '@media (prefers-color-scheme:dark){' +
        '#' + NS + 'panel{background:rgba(30,41,59,0.92);border:1px solid rgba(255,255,255,0.08);box-shadow:0 8px 32px rgba(0,0,0,0.4),0 1px 3px rgba(0,0,0,0.3);}' +
        '#' + NS + 'title{color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.08);}' +
        '#' + NS + 'list::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.15);}' +
        '.' + NS + 'item{color:#cbd5e1;}' +
        '.' + NS + 'item:hover{background:rgba(59,130,246,0.14);color:#60a5fa;}' +
        '.' + NS + 'item.' + NS + 'active{background:rgba(59,130,246,0.2);color:#60a5fa;}' +
        '.' + NS + 'sep{background:rgba(255,255,255,0.08);}' +
        '.' + NS + 'item-destroy{color:#64748b;}' +
        '.' + NS + 'item-destroy:hover{color:#f87171;background:rgba(239,68,68,0.1);}' +
        '.' + NS + 'gear:hover{background:rgba(255,255,255,0.08);}' +
        '#' + NS + 'dof-settings{background:rgba(59,130,246,0.08);}' +
        '#' + NS + 'particle-theme,#' + NS + 'ink-settings{background:rgba(59,130,246,0.08);}' +
        '.' + NS + 'setting-row{color:rgba(255,255,255,0.4);}' +
        '.' + NS + 'val{color:#60a5fa;}' +
        '.' + NS + 'slider{background:rgba(59,130,246,0.2);}' +
        '.' + NS + 'slider::-webkit-slider-thumb{background:#60a5fa;box-shadow:0 1px 4px rgba(96,165,250,0.35);}' +
        '.' + NS + 'theme-option{color:#94a3b8;}' +
        '.' + NS + 'theme-option:hover{background:rgba(59,130,246,0.14);color:#60a5fa;}' +
        '.' + NS + 'theme-option.' + NS + 'theme-active{background:rgba(59,130,246,0.2);color:#60a5fa;}' +
        '.' + NS + 'item-ext-night-vision.' + NS + 'active{background:rgba(34,197,94,0.22);color:#4ade80;}' +
        '.' + NS + 'item-ext-vhs.' + NS + 'active{background:rgba(245,158,11,0.22);color:#fbbf24;}' +
        '.' + NS + 'item-ext-aging.' + NS + 'active{background:rgba(59,130,246,0.2);color:#60a5fa;}' +
        '#' + NS + 'desc-popup{background:rgba(30,41,59,0.95);border:1px solid rgba(255,255,255,0.08);box-shadow:0 6px 24px rgba(0,0,0,0.5),0 1px 3px rgba(0,0,0,0.4);}' +
        '.' + NS + 'desc-title{color:#e2e8f0;}' +
        '.' + NS + 'desc-text{color:#94a3b8;}' +
        '#' + NS + 'draw-toolbar{background:rgba(30,41,59,0.95);border:1px solid rgba(255,255,255,0.08);color:#e2e8f0;}' +
        '.' + NS + 'tb-head{color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.08);}' +
        '.' + NS + 'tb-sec-title{color:#94a3b8;}' +
        '.' + NS + 'tb-btn{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#cbd5e1;}' +
        '.' + NS + 'tb-btn:hover{background:rgba(59,130,246,0.18);border-color:#60a5fa;color:#60a5fa;}' +
        '.' + NS + 'tb-btn.' + NS + 'tb-on{background:#3b82f6;border-color:#3b82f6;color:#fff;}' +
        '.' + NS + 'tb-color{border-color:rgba(255,255,255,0.15);}' +
        '.' + NS + 'tb-color.' + NS + 'tb-on{border-color:#e2e8f0;}' +
        '.' + NS + 'tb-size{background:rgba(59,130,246,0.2);}' +
        '.' + NS + 'tb-size::-webkit-slider-thumb{background:#60a5fa;}' +
        '.' + NS + 'tb-eraser-sz{background:rgba(100,116,139,0.3);}' +
        '.' + NS + 'tb-eraser-sz::-webkit-slider-thumb{background:#94a3b8;}' +
      '}',
      NS + 'menu'
    );
  }

  let obs = new MutationObserver(() => {
    if (fab && !document.body.contains(fab)) document.body.appendChild(fab);
    if (menuRoot && !document.body.contains(menuRoot)) document.body.appendChild(menuRoot);
  });
  obs.observe(document.documentElement, { childList: true });

  injectMenuCSS();
  buildMenu();

  window.dispatchEvent(new CustomEvent('tb-skill:master-online'));
  Runtime._readyResolve();

})();