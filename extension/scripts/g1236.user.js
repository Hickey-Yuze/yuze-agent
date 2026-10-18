// ==UserScript==
// @name         图片悬停预览
// @description  鼠标悬停图片时显示高清预览，Ctrl+滚轮缩放，Shift+Alt+A 开关
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHJlY3QgeD0iMSIgeT0iMTEiIHdpZHRoPSIxMSIgaGVpZ2h0PSI5IiByeD0iMiIgZmlsbD0iIzFlM2E1ZiIvPjxwb2x5Z29uIHBvaW50cz0iMSAxOCA0IDE1IDYuNSAxNyAxMCAxMyAxMiAxNSAxMiAyMCAxIDIwIiBmaWxsPSIjMmQ1YThlIi8+PHJlY3QgeD0iNiIgeT0iMiIgd2lkdGg9IjE3IiBoZWlnaHQ9IjEzIiByeD0iMi41IiBmaWxsPSIjNGE5ZWZmIi8+PHBvbHlnb24gcG9pbnRzPSI2IDEyIDEwIDcuNSAxMy41IDEwLjUgMTcgNi41IDIzIDExIDIzIDE1IDYgMTUiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4yNSkiLz48Y2lyY2xlIGN4PSIxMCIgY3k9IjYuNSIgcj0iMiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjkpIi8+PHBvbHlnb24gcG9pbnRzPSI4IDE1IDExIDE1IDkuNSAxOCIgZmlsbD0iIzRhOWVmZiIvPjwvc3ZnPg==
// @match        *://*/*
// @grant        GM_addStyle
// @grant        unsafeWindow
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  const _win = (typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
  const doc = _win.document;

  if (doc.getElementById('_img_preview_root')) return;

  const GAP = 16;
  const SCALE_STEP = 0.15;
  const SCALE_MIN = 0.2;
  const SCALE_MAX = 3;
  const MIN_DISPLAY_SIZE = 50;

  let enabled = true;
  let rafId = null;
  let currentSrc = null;
  let naturalW = 0;
  let naturalH = 0;
  let scaleOverride = null;
  let lastMX = 0, lastMY = 0;

  const sizeCache = new Map();

  const CSS = `
    #_img_preview_root {
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      top: 0;
      left: 0;
      filter: drop-shadow(0 4px 24px rgba(0,0,0,0.45));
      transition: opacity 0.12s ease;
      opacity: 0;
    }
    #_img_preview_root img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      border-radius: 6px;
      border: 1.5px solid rgba(255,255,255,0.18);
      object-fit: contain;
      background: transparent;
    }
    #_img_preview_infobar {
      font-size: 11px;
      color: #fff;
      background: rgba(0,0,0,0.62);
      border-radius: 4px;
      padding: 2px 8px;
      letter-spacing: 0.3px;
      white-space: nowrap;
      backdrop-filter: blur(4px);
    }
    #_img_preview_toast {
      position: fixed;
      bottom: 28px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.72);
      color: #fff;
      padding: 7px 18px;
      border-radius: 20px;
      font-size: 13px;
      z-index: 2147483647;
      pointer-events: none;
      transition: opacity 0.3s;
      backdrop-filter: blur(6px);
    }
  `;

  if (typeof GM_addStyle === 'function') {
    GM_addStyle(CSS);
  } else {
    const style = doc.createElement('style');
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  const root = doc.createElement('div');
  root.id = '_img_preview_root';
  root.style.display = 'none';

  const previewImg = doc.createElement('img');

  const infoBar = doc.createElement('div');
  infoBar.id = '_img_preview_infobar';

  root.appendChild(previewImg);
  root.appendChild(infoBar);
  doc.documentElement.appendChild(root);

  previewImg.onload = () => {
    const src = previewImg.src;
    if (src !== currentSrc) return;
    const nw = previewImg.naturalWidth;
    const nh = previewImg.naturalHeight;
    if (nw < 10 || nh < 10) { hidePreview(); return; }
    naturalW = nw;
    naturalH = nh;
    sizeCache.set(src, { w: nw, h: nh });
    infoBar.textContent = `${nw} × ${nh}`;
    updatePos(lastMX, lastMY);
    root.style.opacity = '1';
  };

  previewImg.onerror = () => {
    if (previewImg.src === currentSrc) hidePreview();
  };

  function extractSrc(el) {
    if (!el || el.nodeType !== 1) return null;
    const tag = el.tagName;
    if (tag === 'IMG') {
      return el.dataset.src || el.dataset.original
        || el.dataset.lazySrc || el.dataset.lazyLoad
        || (el.src && !el.src.endsWith('/') ? el.src : null)
        || null;
    }
    if (tag === 'VIDEO') return el.poster || null;
    return null;
  }

  function shouldTrigger(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName !== 'IMG' && el.tagName !== 'VIDEO') return false;
    const rect = el.getBoundingClientRect();
    return rect.width >= MIN_DISPLAY_SIZE && rect.height >= MIN_DISPLAY_SIZE;
  }

  function cleanSrc(src) {
    if (!src || src.startsWith('data:')) return src;
    try {
      const host = location.hostname;
      if (/weibo\.com/.test(host))
        src = src.replace(/\/orj\d+\//i, '/mw2000/');
      if (/(taobao|tmall)\.com/.test(host))
        src = src.replace(/_\d+x\d+(q\d+)?(s50)?\.jpg_.*$/i, '');
      if (/bilibili\.com/.test(host))
        src = src.replace(/(\.(?:jpg|jpeg|png|gif|webp))@.*/i, '$1');
      src = src.replace(/(\.(?:jpe?g|png|gif|webp|bmp|svg|tiff?|ico|avif))[?_].*/i, '$1');
      return src;
    } catch { return src; }
  }

  function isPreviewable(src) {
    if (!src || src.length < 10) return false;
    if (src.startsWith('data:image/svg')) return false;
    if (src.startsWith('data:image') && src.length < 200) return false;
    if (/favicon|\/icon[s]?\/|sprite|\.ico$/i.test(src)) return false;
    return true;
  }

  function calcSize(nw, nh) {
    const vw = _win.innerWidth - GAP * 2;
    const vh = _win.innerHeight - GAP * 2 - 36;
    if (scaleOverride !== null)
      return [Math.round(nw * scaleOverride), Math.round(nh * scaleOverride)];
    if (nw <= vw && nh <= vh) return [nw, nh];
    const ratio = Math.min(vw / nw, vh / nh);
    return [Math.round(nw * ratio), Math.round(nh * ratio)];
  }

  function calcPos(mx, my, pw, ph) {
    const vw = _win.innerWidth, vh = _win.innerHeight;
    const totalH = ph + 36 + GAP;
    let x = mx + GAP, y = my + GAP;
    if (x + pw + GAP > vw) x = mx - pw - GAP;
    if (x < GAP) x = GAP;
    if (y + totalH > vh) y = my - totalH;
    if (y < GAP) y = GAP;
    return [x, y];
  }

  function updatePos(mx, my) {
    if (!naturalW) return;
    const [pw, ph] = calcSize(naturalW, naturalH);
    const [x, y] = calcPos(mx, my, pw, ph);
    previewImg.style.width = pw + 'px';
    previewImg.style.height = ph + 'px';
    root.style.left = x + 'px';
    root.style.top = y + 'px';
  }

  function showPreview(src, mx, my) {
    const cleaned = cleanSrc(src);
    if (!isPreviewable(cleaned)) return;

    if (sizeCache.has(cleaned)) {
      const cached = sizeCache.get(cleaned);
      if (cached.w < 10 || cached.h < 10) return;
      currentSrc = cleaned;
      naturalW = cached.w;
      naturalH = cached.h;
      scaleOverride = null;
      previewImg.src = cleaned;
      infoBar.textContent = `${cached.w} × ${cached.h}`;
      root.style.display = 'flex';
      root.style.opacity = '1';
      updatePos(mx, my);
      return;
    }

    if (cleaned === currentSrc) {
      root.style.display = 'flex';
      updatePos(mx, my);
      return;
    }

    currentSrc = cleaned;
    naturalW = 0;
    naturalH = 0;
    scaleOverride = null;
    previewImg.src = cleaned;
    infoBar.textContent = '加载中…';
    root.style.display = 'flex';
    root.style.opacity = '0.35';
  }

  function hidePreview() {
    root.style.opacity = '0';
    setTimeout(() => {
      if (root.style.opacity === '0') {
        root.style.display = 'none';
        currentSrc = null;
      }
    }, 120);
  }

  function showToast(msg) {
    const t = doc.createElement('div');
    t.id = '_img_preview_toast';
    t.textContent = msg;
    doc.documentElement.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; }, 1800);
    setTimeout(() => { t.remove(); }, 2200);
  }

  doc.addEventListener('mouseover', (e) => {
    if (!enabled) return;
    const el = e.target;
    if (!shouldTrigger(el)) { hidePreview(); return; }
    const src = extractSrc(el);
    if (src) showPreview(src, e.clientX, e.clientY);
    else hidePreview();
  }, { passive: true });

  doc.addEventListener('mousemove', (e) => {
    if (!enabled) return;
    lastMX = e.clientX;
    lastMY = e.clientY;
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (root.style.display !== 'none') updatePos(lastMX, lastMY);
    });
  }, { passive: true });

  doc.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget || e.relatedTarget === doc.documentElement) hidePreview();
  }, { passive: true });

  doc.addEventListener('wheel', (e) => {
    if (!enabled || !e.ctrlKey || root.style.display === 'none' || !naturalW) return;
    e.preventDefault();
    const autoRatio = Math.min(
      (_win.innerWidth - GAP * 2) / naturalW,
      (_win.innerHeight - GAP * 2 - 36) / naturalH,
      1
    );
    if (scaleOverride === null) scaleOverride = autoRatio;
    scaleOverride += e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP;
    scaleOverride = Math.max(SCALE_MIN, Math.min(SCALE_MAX, scaleOverride));
    updatePos(lastMX, lastMY);
  }, { passive: false });

  _win.addEventListener('keydown', (e) => {
    const isAltA = e.shiftKey && e.altKey && (e.key === 'a' || e.key === 'A' || e.keyCode === 65);
    if (!isAltA) return;
    e.preventDefault();
    e.stopPropagation();
    enabled = !enabled;
    if (!enabled) hidePreview();
    showToast(enabled ? '🟢 图片预览 已启用' : '🔴 图片预览 已禁用');
  }, true);

})();