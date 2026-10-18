// ==UserScript==
// @name         悬浮球抽屉
// @description  收纳页面悬浮球到侧边抽屉
// @icon         https://api.iconify.design/noto/inbox-tray.svg
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==
(function () {
  if (document.getElementById('__fab-drawer__')) return;

  const DRAWER_W = 220;
  const EDGE_PEEK = 8;
  const HOVER_DELAY = 120;
  const OBSERVE_DURATION = 3000;
  const KEY_SIDE = '__fab_side__';
  const KEY_CAPTURE = '__fab_capture__';

  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const isGM = typeof GM_getValue === 'function' && typeof GM_setValue === 'function';
  const NativeMouseEvent = (typeof unsafeWindow !== 'undefined' && unsafeWindow.MouseEvent) || MouseEvent;
  const eventView = (typeof unsafeWindow !== 'undefined' && unsafeWindow) || window;

  const gmGet = (key, def) => {
    if (!isGM) return def;
    try { return GM_getValue(key, def); } catch (_) { return def; }
  };
  const gmSet = (key, val) => {
    if (!isGM) return;
    try { GM_setValue(key, val); } catch (_) {}
  };

  let side = gmGet(KEY_SIDE, 'left');
  if (side !== 'left' && side !== 'right') side = 'left';
  let captureMode = isGM ? gmGet(KEY_CAPTURE, 'once') : 'once';
  if (!['once', 'continuous', 'manual'].includes(captureMode)) captureMode = 'once';

  const style = document.createElement('style');
  style.textContent = `
    #__fab-drawer__ {
      position: fixed; top: 50%; width: ${DRAWER_W}px;
      max-height: 70vh;
      background: rgba(30,30,40,0.92);
      backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
      border: 1px solid rgba(255,255,255,0.12);
      z-index: 2147483646;
      transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
      display: flex; flex-direction: column;
      overflow: hidden; user-select: none;
    }
    #__fab-drawer-trigger__ {
      position: fixed; top: 0; height: 100vh; width: ${EDGE_PEEK}px;
      z-index: 2147483645; cursor: pointer;
    }
    #__fab-drawer-trigger__::after {
      content: ''; position: absolute; top: 50%; transform: translateY(-50%);
      width: 4px; height: 40px;
      background: rgba(255,255,255,0.35); border-radius: 2px;
      transition: background 0.2s;
    }
    #__fab-drawer-trigger__:hover::after { background: rgba(255,255,255,0.75); }
    #__fab-drawer__ .drawer-header {
      padding: 12px 14px 8px; font-size: 12px; font-weight: 600;
      color: rgba(255,255,255,0.55); letter-spacing: 0.06em;
      display: flex; align-items: center; justify-content: space-between;
      flex-shrink: 0; border-bottom: 1px solid rgba(255,255,255,0.08); gap: 6px;
    }
    #__fab-drawer__ .drawer-header span { flex: 1; }
    #__fab-drawer__ .hdr-btn {
      width: 24px; height: 24px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.08);
      color: #fff; font-size: 14px; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.18s; flex-shrink: 0;
    }
    #__fab-drawer__ .hdr-btn:hover { background: rgba(255,255,255,0.18); }
    #__fab-drawer__ .hdr-btn.active {
      background: rgba(99,179,237,0.35); border-color: rgba(99,179,237,0.7);
    }
    #__fab-settings-panel__ {
      flex-shrink: 0; overflow: hidden;
      max-height: 0; opacity: 0;
      transition: max-height 0.3s ease, opacity 0.22s ease;
      background: rgba(255,255,255,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    #__fab-settings-panel__.open { max-height: 200px; opacity: 1; }
    #__fab-settings-panel__ .sp-inner {
      padding: 10px 14px; display: flex; flex-direction: column; gap: 10px;
    }
    #__fab-settings-panel__ .sp-row {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
    }
    #__fab-settings-panel__ .sp-label {
      font-size: 11px; color: rgba(255,255,255,0.5); flex-shrink: 0;
    }
    #__fab-settings-panel__ .sp-divider {
      height: 1px; background: rgba(255,255,255,0.07); margin: 2px 0;
    }
    .fab-side-group { display: flex; gap: 4px; }
    .fab-side-group button {
      flex: 1; padding: 3px 0; border-radius: 5px; font-size: 11px;
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.5); cursor: pointer; transition: all 0.15s;
    }
    .fab-side-group button.active {
      background: rgba(99,179,237,0.35); border-color: rgba(99,179,237,0.7); color: #fff;
    }
    .fab-capture-group { display: flex; gap: 3px; }
    .fab-capture-group button {
      flex: 1; padding: 4px 2px; border-radius: 5px; font-size: 10px; line-height: 1.3;
      border: 1px solid rgba(255,255,255,0.18); background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.45); cursor: pointer; transition: all 0.15s;
      text-align: center; white-space: nowrap;
    }
    .fab-capture-group button:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
    .fab-capture-group button.active {
      background: rgba(99,179,237,0.35); border-color: rgba(99,179,237,0.7); color: #fff;
    }
    #__fab-drawer__ .drawer-list {
      flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px 0;
      scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.15) transparent;
    }
    #__fab-drawer__ .drawer-list::-webkit-scrollbar { width: 4px; }
    #__fab-drawer__ .drawer-list::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.15); border-radius: 2px;
    }
    #__fab-drawer__ .fab-drawer-item {
      display: flex; align-items: center; gap: 10px;
      padding: 8px 14px; cursor: pointer;
      transition: background 0.15s; position: relative;
    }
    #__fab-drawer__ .fab-drawer-item:hover { background: rgba(255,255,255,0.07); }
    #__fab-drawer__ .fab-thumb {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; flex-shrink: 0; overflow: hidden; color: #fff;
    }
    #__fab-drawer__ .fab-thumb img { width: 100%; height: 100%; object-fit: contain; }
    #__fab-drawer__ .fab-label {
      flex: 1; font-size: 13px; color: rgba(255,255,255,0.82);
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    #__fab-drawer__ .fab-remove {
      width: 20px; height: 20px; border-radius: 4px;
      border: none; background: transparent;
      color: rgba(255,255,255,0.3); font-size: 14px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
    }
    #__fab-drawer__ .fab-drawer-item:hover .fab-remove { opacity: 1; }
    #__fab-drawer__ .fab-remove:hover { color: #fc8181; background: rgba(252,129,129,0.12); }
    #__fab-drawer__ .drawer-empty {
      padding: 24px 14px; text-align: center;
      font-size: 12px; color: rgba(255,255,255,0.28); line-height: 1.7;
    }
    #__fab-drawer__ .drawer-footer {
      padding: 8px 14px; font-size: 11px;
      color: rgba(255,255,255,0.22); text-align: center;
      border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    }
    #__fab-pick-tip__ {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      background: rgba(99,179,237,0.95); color: #fff;
      font-size: 13px; padding: 8px 20px; border-radius: 24px;
      z-index: 2147483647; pointer-events: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3); white-space: nowrap;
    }
    .__fab-pick-hover__ {
      outline: 2px dashed rgba(99,179,237,0.9) !important;
      outline-offset: 2px !important; cursor: crosshair !important;
    }
  `;
  document.head.appendChild(style);

  const trigger = document.createElement('div');
  trigger.id = '__fab-drawer-trigger__';
  document.body.appendChild(trigger);

  const drawer = document.createElement('div');
  drawer.id = '__fab-drawer__';

  const drawerHeader = document.createElement('div');
  drawerHeader.className = 'drawer-header';

  const headerSpan = document.createElement('span');
  headerSpan.textContent = '悬浮球管理';

  const pickBtn = document.createElement('button');
  pickBtn.className = 'hdr-btn';
  pickBtn.id = '__fab-pick-btn__';
  pickBtn.title = '点击拾取页面悬浮球';
  pickBtn.textContent = '＋';

  if (isGM) {
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'hdr-btn';
    settingsBtn.id = '__fab-settings-btn__';
    settingsBtn.title = '设置';
    settingsBtn.textContent = '⚙';
    drawerHeader.append(headerSpan, settingsBtn, pickBtn);

    const settingsPanel = document.createElement('div');
    settingsPanel.id = '__fab-settings-panel__';

    const spInner = document.createElement('div');
    spInner.className = 'sp-inner';

    const rowSide = document.createElement('div');
    rowSide.className = 'sp-row';
    const labelSide = document.createElement('span');
    labelSide.className = 'sp-label';
    labelSide.textContent = '位置';
    const sideGroup = document.createElement('div');
    sideGroup.className = 'fab-side-group';
    const sideLeftBtn = document.createElement('button');
    sideLeftBtn.id = '__fab-side-left__';
    sideLeftBtn.textContent = '←左';
    const sideRightBtn = document.createElement('button');
    sideRightBtn.id = '__fab-side-right__';
    sideRightBtn.textContent = '右→';
    sideGroup.append(sideLeftBtn, sideRightBtn);
    rowSide.append(labelSide, sideGroup);

    const divider = document.createElement('div');
    divider.className = 'sp-divider';

    const rowCapture = document.createElement('div');
    rowCapture.className = 'sp-row';
    const labelCapture = document.createElement('span');
    labelCapture.className = 'sp-label';
    labelCapture.textContent = '捕获';
    const captureGroup = document.createElement('div');
    captureGroup.className = 'fab-capture-group';
    const capContinuousBtn = document.createElement('button');
    capContinuousBtn.id = '__fab-cap-continuous__';
    capContinuousBtn.textContent = '持续捕获';
    const capOnceBtn = document.createElement('button');
    capOnceBtn.id = '__fab-cap-once__';
    capOnceBtn.textContent = '启动捕获';
    const capManualBtn = document.createElement('button');
    capManualBtn.id = '__fab-cap-manual__';
    capManualBtn.textContent = '手动选取';
    captureGroup.append(capContinuousBtn, capOnceBtn, capManualBtn);
    rowCapture.append(labelCapture, captureGroup);

    spInner.append(rowSide, divider, rowCapture);
    settingsPanel.appendChild(spInner);
    drawer.appendChild(drawerHeader);
    drawer.appendChild(settingsPanel);

    syncSideButtons(sideLeftBtn, sideRightBtn);
    syncCaptureButtons(capContinuousBtn, capOnceBtn, capManualBtn);

    settingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      settingsOpen = !settingsOpen;
      settingsPanel.classList.toggle('open', settingsOpen);
      settingsBtn.classList.toggle('active', settingsOpen);
    });
    sideLeftBtn.addEventListener('click', () => setSide('left', sideLeftBtn, sideRightBtn));
    sideRightBtn.addEventListener('click', () => setSide('right', sideLeftBtn, sideRightBtn));
    capContinuousBtn.addEventListener('click', () => setCaptureMode('continuous', capContinuousBtn, capOnceBtn, capManualBtn));
    capOnceBtn.addEventListener('click', () => setCaptureMode('once', capContinuousBtn, capOnceBtn, capManualBtn));
    capManualBtn.addEventListener('click', () => setCaptureMode('manual', capContinuousBtn, capOnceBtn, capManualBtn));

  } else {
    const sideBtnSimple = document.createElement('button');
    sideBtnSimple.className = 'hdr-btn';
    sideBtnSimple.id = '__fab-side-btn__';
    sideBtnSimple.title = '切换左右';
    sideBtnSimple.textContent = '⇄';
    drawerHeader.append(headerSpan, sideBtnSimple, pickBtn);
    drawer.appendChild(drawerHeader);

    sideBtnSimple.addEventListener('click', (e) => {
      e.stopPropagation();
      side = side === 'right' ? 'left' : 'right';
      const wasOpen = isOpen;
      if (wasOpen) { isOpen = false; applyDrawerSide(); setTimeout(() => openDrawer(), 350); }
      else { applyDrawerSide(); }
    });
  }

  const list = document.createElement('div');
  list.className = 'drawer-list';
  list.id = '__fab-list__';

  const emptyTip = document.createElement('div');
  emptyTip.className = 'drawer-empty';
  emptyTip.textContent = '暂无收纳的悬浮球';
  const emptyTipBr = document.createElement('br');
  const emptyTipLine2 = document.createTextNode('点击右上角 ＋ 拾取');
  emptyTip.append(emptyTipBr, emptyTipLine2);
  list.appendChild(emptyTip);

  const drawerFooter = document.createElement('div');
  drawerFooter.className = 'drawer-footer';
  drawerFooter.textContent = '悬浮球抽屉 · 点击条目触发';

  drawer.append(list, drawerFooter);
  document.body.appendChild(drawer);

  let isOpen = false;
  let settingsOpen = false;
  let openTimer = null;
  let closeTimer = null;
  let pickMode = false;
  let lastHoverEl = null;
  const storedItems = [];
  let observer = null;

  function syncSideButtons(leftBtn, rightBtn) {
    leftBtn.classList.toggle('active', side === 'left');
    rightBtn.classList.toggle('active', side === 'right');
  }
  function syncCaptureButtons(btn1, btn2, btn3) {
    btn1.classList.toggle('active', captureMode === 'continuous');
    btn2.classList.toggle('active', captureMode === 'once');
    btn3.classList.toggle('active', captureMode === 'manual');
  }
  function setSide(newSide, leftBtn, rightBtn) {
    if (side === newSide) return;
    side = newSide;
    gmSet(KEY_SIDE, side);
    syncSideButtons(leftBtn, rightBtn);
    const wasOpen = isOpen;
    if (wasOpen) { isOpen = false; applyDrawerSide(); setTimeout(() => openDrawer(), 350); }
    else { applyDrawerSide(); }
  }
  function setCaptureMode(newMode, btn1, btn2, btn3) {
    if (captureMode === newMode) return;
    captureMode = newMode;
    gmSet(KEY_CAPTURE, captureMode);
    syncCaptureButtons(btn1, btn2, btn3);
    applyCaptureMode();
  }

  function applyDrawerSide() {
    const isRight = side === 'right';
    drawer.style.left = isRight ? 'auto' : '0';
    drawer.style.right = isRight ? '0' : 'auto';
    drawer.style.borderRadius = isRight ? '16px 0 0 16px' : '0 16px 16px 0';
    drawer.style.borderLeft = isRight ? '1px solid rgba(255,255,255,0.12)' : 'none';
    drawer.style.borderRight = isRight ? 'none' : '1px solid rgba(255,255,255,0.12)';
    drawer.style.boxShadow = isRight ? '-4px 0 32px rgba(0,0,0,0.35)' : '4px 0 32px rgba(0,0,0,0.35)';
    drawer.style.transform = isOpen
      ? 'translateY(-50%) translateX(0)'
      : `translateY(-50%) translateX(${isRight ? `calc(100% - ${EDGE_PEEK}px)` : `calc(-100% + ${EDGE_PEEK}px)`})`;
    trigger.style.left = isRight ? 'auto' : '0';
    trigger.style.right = isRight ? '0' : 'auto';
    let ind = document.getElementById('__fab-ind-style__');
    if (!ind) { ind = document.createElement('style'); ind.id = '__fab-ind-style__'; document.head.appendChild(ind); }
    ind.textContent = isRight
      ? `#__fab-drawer-trigger__::after { right: 0; left: auto; border-radius: 2px 0 0 2px; }`
      : `#__fab-drawer-trigger__::after { left: 0; right: auto; border-radius: 0 2px 2px 0; }`;
  }

  function openDrawer() {
    clearTimeout(closeTimer);
    if (!isOpen) {
      isOpen = true;
      drawer.style.transform = 'translateY(-50%) translateX(0)';
    }
  }

  function closeDrawer() {
    clearTimeout(openTimer);
    if (isOpen) {
      isOpen = false;
      const hiddenX = side === 'right'
        ? `calc(100% - ${EDGE_PEEK}px)`
        : `calc(-100% + ${EDGE_PEEK}px)`;
      drawer.style.transform = `translateY(-50%) translateX(${hiddenX})`;
    }
  }

  trigger.addEventListener('mouseenter', () => {
    clearTimeout(closeTimer);
    openTimer = setTimeout(openDrawer, HOVER_DELAY);
  });
  trigger.addEventListener('mouseleave', () => {
    clearTimeout(openTimer);
    closeTimer = setTimeout(closeDrawer, 400);
  });
  drawer.addEventListener('mouseenter', () => {
    clearTimeout(closeTimer);
    clearTimeout(openTimer);
    openDrawer();
  });
  drawer.addEventListener('mouseleave', () => {
    closeTimer = setTimeout(closeDrawer, 500);
  });

  function triggerFAB(el) {
    if (!el) return;

    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;

    const mouseOpts = (extra = {}) => ({
      bubbles: true, cancelable: true, view: eventView,
      clientX: cx, clientY: cy,
      screenX: cx + (window.screenX || 0),
      screenY: cy + (window.screenY || 0),
      button: 0, buttons: 1,
      ...extra,
    });

    const makeTouchOpts = (ended = false) => {
      try {
        const t = new Touch({
          identifier: Date.now(), target: el,
          clientX: cx, clientY: cy,
          screenX: cx, screenY: cy,
          pageX: cx + window.scrollX, pageY: cy + window.scrollY,
        });
        return {
          bubbles: true, cancelable: true,
          touches: ended ? [] : [t],
          changedTouches: [t],
          targetTouches: ended ? [] : [t],
        };
      } catch (_) { return null; }
    };

    try {
      el.dispatchEvent(new PointerEvent('pointerdown', {
        ...mouseOpts(), pointerId: 1, pointerType: 'mouse', isPrimary: true,
      }));
    } catch (_) {}

    const tDown = makeTouchOpts(false);
    if (tDown) { try { el.dispatchEvent(new TouchEvent('touchstart', tDown)); } catch (_) {} }

    el.dispatchEvent(new NativeMouseEvent('mousedown', mouseOpts()));

    requestAnimationFrame(() => {
      [el, document].forEach(target => {
        try {
          target.dispatchEvent(new PointerEvent('pointerup', {
            ...mouseOpts(), pointerId: 1, pointerType: 'mouse', isPrimary: true, buttons: 0,
          }));
        } catch (_) {}
        const tUp = makeTouchOpts(true);
        if (tUp) { try { target.dispatchEvent(new TouchEvent('touchend', tUp)); } catch (_) {} }
        target.dispatchEvent(new NativeMouseEvent('mouseup', mouseOpts({ buttons: 0 })));
      });

      requestAnimationFrame(() => {
        el.dispatchEvent(new NativeMouseEvent('click', mouseOpts({ buttons: 0 })));

        requestAnimationFrame(() => {
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        });
      });
    });
  }

  function getThumbContent(el) {
    const img = el.querySelector('img');
    if (img && img.src) {
      const clonedImg = document.createElement('img');
      clonedImg.src = img.src;
      clonedImg.alt = '';
      return clonedImg;
    }
    const text = (el.textContent || el.innerText || '').trim();
    return document.createTextNode(text ? text.slice(0, 2) : '●');
  }

  function getLabel(el) {
    return el.title
      || el.getAttribute('aria-label')
      || el.getAttribute('data-tooltip')
      || (el.textContent || '').trim().slice(0, 18)
      || '未命名悬浮球';
  }

  function renderList() {
    while (list.firstChild) list.removeChild(list.firstChild);

    if (storedItems.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'drawer-empty';
      empty.appendChild(document.createTextNode('暂无收纳的悬浮球'));
      empty.appendChild(document.createElement('br'));
      empty.appendChild(document.createTextNode('点击右上角 ＋ 拾取'));
      list.appendChild(empty);
      return;
    }

    storedItems.forEach((item, idx) => {
      const row = document.createElement('div');
      row.className = 'fab-drawer-item';

      const thumb = document.createElement('div');
      thumb.className = 'fab-thumb';
      thumb.appendChild(getThumbContent(item.el));

      const label = document.createElement('div');
      label.className = 'fab-label';
      label.textContent = item.label;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'fab-remove';
      removeBtn.title = '移除';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        releaseItem(idx);
      });

      row.append(thumb, label, removeBtn);
      row.addEventListener('click', () => triggerFAB(item.el));
      list.appendChild(row);
    });
  }

  function storeElement(el) {
    if (storedItems.find(i => i.el === el)) return;
    el._fabOrigVisibility = el.style.visibility;
    el._fabOrigPointerEvents = el.style.pointerEvents;
    el.style.setProperty('visibility', 'hidden', 'important');
    el.style.setProperty('pointer-events', 'none', 'important');
    storedItems.push({ el, label: getLabel(el) });
    renderList();
  }

  function releaseItem(idx) {
    const item = storedItems[idx];
    if (!item) return;
    item.el.style.visibility = item.el._fabOrigVisibility || '';
    item.el.style.pointerEvents = item.el._fabOrigPointerEvents || '';
    storedItems.splice(idx, 1);
    renderList();
  }

  let pickTip = null;

  function enterPickMode() {
    pickMode = true;
    pickBtn.classList.add('active');
    pickTip = document.createElement('div');
    pickTip.id = '__fab-pick-tip__';
    pickTip.textContent = '🎯 点击页面中的悬浮球以添加到抽屉，按 Esc 取消';
    document.body.appendChild(pickTip);
    document.addEventListener('mouseover', onPickHover, true);
    document.addEventListener('click', onPickClick, true);
    document.addEventListener('keydown', onPickEsc, true);
  }

  function exitPickMode() {
    pickMode = false;
    pickBtn.classList.remove('active');
    if (pickTip) { pickTip.remove(); pickTip = null; }
    if (lastHoverEl) { lastHoverEl.classList.remove('__fab-pick-hover__'); lastHoverEl = null; }
    document.removeEventListener('mouseover', onPickHover, true);
    document.removeEventListener('click', onPickClick, true);
    document.removeEventListener('keydown', onPickEsc, true);
  }

  function onPickHover(e) {
    const el = e.target;
    if (drawer.contains(el) || el === drawer) return;
    if (lastHoverEl && lastHoverEl !== el) lastHoverEl.classList.remove('__fab-pick-hover__');
    lastHoverEl = el;
    el.classList.add('__fab-pick-hover__');
  }

  function onPickClick(e) {
    const el = e.target;
    if (drawer.contains(el) || el === drawer || el === pickBtn) return;
    e.preventDefault();
    e.stopPropagation();
    storeElement(el);
    exitPickMode();
    openDrawer();
  }

  function onPickEsc(e) {
    if (e.key === 'Escape') exitPickMode();
  }

  pickBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    pickMode ? exitPickMode() : enterPickMode();
  });

  function looksLikeFloatingBall(el) {
    if (el === drawer || drawer.contains(el) || el === trigger) return false;
    const cs = window.getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
    const w = parseFloat(cs.width), h = parseFloat(cs.height);
    if (w < 20 || h < 20 || w > 200 || h > 200) return false;
    return parseFloat(cs.borderRadius) >= Math.min(w, h) * 0.4
      && (parseInt(cs.zIndex) || 0) > 100;
  }

  function scanForFABs() {
    $$('*').forEach(el => { if (looksLikeFloatingBall(el)) storeElement(el); });
  }

  function applyCaptureMode() {
    if (observer) { observer.disconnect(); observer = null; }
    if (captureMode === 'manual') return;

    const mutationCb = (mutations) => {
      for (const mut of mutations) {
        mut.addedNodes.forEach(node => {
          if (node.nodeType !== 1) return;
          if (looksLikeFloatingBall(node)) storeElement(node);
          node.querySelectorAll && node.querySelectorAll('*').forEach(child => {
            if (looksLikeFloatingBall(child)) storeElement(child);
          });
        });
      }
    };

    observer = new MutationObserver(mutationCb);
    observer.observe(document.body, { childList: true, subtree: true });

    setTimeout(scanForFABs, 800);

    if (captureMode === 'once') {
      setTimeout(() => {
        scanForFABs();
        if (observer) { observer.disconnect(); observer = null; }
      }, OBSERVE_DURATION);
    }
  }

  applyDrawerSide();
  applyCaptureMode();
})();