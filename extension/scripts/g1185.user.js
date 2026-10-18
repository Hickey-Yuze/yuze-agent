/**
 * 浏览器放大镜脚本
 * 功能：启动后，鼠标移动到哪里，对应元素就会被放大显示在圆形放大镜中
 *       默认 2× 倍率，可通过 Shift+滚轮 在 1.5× – 10× 之间调节
 *
 * 快捷键/操作：
 *   Esc          — 暂停/恢复放大镜
 *   Shift+滚轮    — 调节放大倍率（1.5× – 10×）
 *   Ctrl+Shift+Z — 彻底关闭放大镜
 *
 * 再次运行脚本会先移除已有实例，再重新启动。
 */

(function () {
  'use strict';

  // ==================== 配置 ====================
  let scale = 2;                 // 当前放大倍率（默认 2x，可通过 Shift+滚轮 调节）
  const BASE_SCALE = 2;          // 基准倍率
  const MIN_SCALE = 1.5;         // 最小倍率
  const MAX_SCALE = 10;          // 最大倍率
  const WHEEL_STEP = 0.5;        // 滚轮每格步进
  const LENS_SIZE = 180;         // 放大镜直径（px）
  const BORDER_WIDTH = 4;        // 镜框宽度
  const MIN_ELEM_SIZE = 12;      // 最小元素尺寸，小于此值向上找父元素
  const ID_LENS = '__magnifier_lens__';
  const ID_ZOOM = '__magnifier_zoom__';
  const ID_BADGE = '__magnifier_badge__';
  const FRAME_GRADIENT = 'linear-gradient(135deg, #0ea5e9, #3b82f6, #6366f1, #3b82f6)'; // 蓝色渐变镜框

  // ==================== 移除已有实例 ====================
  const oldLens = document.getElementById(ID_LENS);
  if (oldLens) {
    oldLens.remove();
    // 通过属性标记的方式清理事件
    if (oldLens._handlers) {
      document.removeEventListener('mousemove', oldLens._handlers.move, true);
      document.removeEventListener('keydown', oldLens._handlers.key, true);
      document.removeEventListener('scroll', oldLens._handlers.scroll, true);
      document.removeEventListener('wheel', oldLens._handlers.wheel, true);
    }
    console.log('🔍 已移除旧放大镜。再次运行脚本可重新启动。');
    // 恢复光标
    document.documentElement.style.cursor = '';
    return;
  }

  // ==================== 状态 ====================
  let active = true;
  let currentElement = null;
  let mouseX = 0;
  let mouseY = 0;
  let rafId = null;

  // ==================== 创建放大镜 DOM ====================
  const lens = document.createElement('div');
  lens.id = ID_LENS;
  Object.assign(lens.style, {
    position: 'fixed',
    width: LENS_SIZE + 'px',
    height: LENS_SIZE + 'px',
    borderRadius: '50%',
    // 蓝色渐变镜框：背景设为渐变 → 内圈用白色遮住中间 → 只露出边缘渐变环
    background: FRAME_GRADIENT,
    boxShadow:
      '0 6px 30px rgba(14,165,233,0.35), ' +
      '0 0 0 1px rgba(255,255,255,0.12) inset',
    overflow: 'hidden',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  // 内圈白色背景：遮住镜框渐变，只露出边缘蓝色渐变环（z-index 最低，不挡内容）
  const innerRing = document.createElement('div');
  Object.assign(innerRing.style, {
    position: 'absolute',
    inset: BORDER_WIDTH + 'px',
    borderRadius: '50%',
    background: '#fff',
    pointerEvents: 'none',
    zIndex: '1',
    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.15), inset 0 -1px 3px rgba(0,0,0,0.08)',
  });
  lens.appendChild(innerRing);

  // 中心十字准星
  const crosshair = document.createElement('div');
  Object.assign(crosshair.style, {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '14px',
    height: '14px',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    zIndex: '3',
    opacity: '0.6',
  });
  crosshair.innerHTML =
    '<svg width="14" height="14" viewBox="0 0 14 14">' +
    '<circle cx="7" cy="7" r="5" fill="none" stroke="red" stroke-width="1.2" />' +
    '<line x1="7" y1="2" x2="7" y2="5" stroke="red" stroke-width="1" />' +
    '<line x1="7" y1="9" x2="7" y2="12" stroke="red" stroke-width="1" />' +
    '<line x1="2" y1="7" x2="5" y2="7" stroke="red" stroke-width="1" />' +
    '<line x1="9" y1="7" x2="12" y2="7" stroke="red" stroke-width="1" />' +
    '</svg>';
  lens.appendChild(crosshair);

  // 缩放容器（z-index 需高于 innerRing 的 1，否则被白色背景遮挡）
  const zoomContainer = document.createElement('div');
  zoomContainer.id = ID_ZOOM;
  Object.assign(zoomContainer.style, {
    position: 'absolute',
    zIndex: '3',
    transformOrigin: '0 0',
    pointerEvents: 'none',
    willChange: 'left, top',
  });
  lens.appendChild(zoomContainer);

  // 倍率角标
  const scaleBadge = document.createElement('div');
  scaleBadge.id = ID_BADGE;
  Object.assign(scaleBadge.style, {
    position: 'absolute',
    right: '12px',
    bottom: '12px',
    background: 'rgba(0,0,0,0.7)',
    color: '#fff',
    padding: '3px 8px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    pointerEvents: 'none',
    zIndex: '4',
    lineHeight: '1.4',
    transition: 'background 0.15s',
  });
  scaleBadge.textContent = scale + '×';
  lens.appendChild(scaleBadge);

  document.body.appendChild(lens);

  // ==================== Toast 提示 ====================
  const toast = document.createElement('div');
  toast.innerHTML =
    '🔍 放大镜已启动！移动鼠标查看 2× 放大效果。<br>' +
    '<small style="opacity:0.7">按 <b>Esc</b> 暂停 | <b>Shift+滚轮</b> 调节倍率 | <b>Ctrl+Shift+Z</b> 关闭</small>';
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(30,30,30,0.92)',
    color: '#fff',
    padding: '12px 22px',
    borderRadius: '10px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    lineHeight: '1.6',
    textAlign: 'center',
    zIndex: '2147483647',
    pointerEvents: 'none',
    transition: 'opacity 0.6s ease',
    whiteSpace: 'nowrap',
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 600);
  }, 3500);

  // 隐藏页面光标，提升沉浸感
  document.documentElement.style.cursor = 'none';

  // ==================== 辅助函数 ====================
  /** 需要从原元素拷贝的计算样式属性 */
  const STYLES_TO_COPY = [
    // 文字
    'color', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant',
    'textAlign', 'lineHeight', 'letterSpacing', 'textTransform', 'textDecoration',
    'textDecorationColor', 'textDecorationLine', 'textShadow',
    'whiteSpace', 'wordBreak', 'wordSpacing', 'overflowWrap',
    // 背景
    'backgroundColor', 'backgroundImage', 'backgroundSize',
    'backgroundPosition', 'backgroundRepeat', 'backgroundOrigin', 'backgroundClip',
    // 盒模型
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    // 边框
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor',
    'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle',
    'borderTopLeftRadius', 'borderTopRightRadius',
    'borderBottomRightRadius', 'borderBottomLeftRadius',
    // 布局
    'boxShadow', 'opacity', 'display', 'flexDirection', 'flexWrap',
    'alignItems', 'alignContent', 'justifyContent', 'gap',
    'overflow', 'position',
  ];

  /**
   * 向上查找尺寸合适的元素
   * 太小（如单个字符的 <span>）就找更大的父元素
   */
  function findSuitableElement(el) {
    if (!el || el === document.documentElement || el === document.body) {
      return null;
    }
    let current = el;
    const maxDepth = 10;
    for (let i = 0; i < maxDepth; i++) {
      if (!current || current === document.body || current === document.documentElement) break;
      const r = current.getBoundingClientRect();
      if (r.width >= MIN_ELEM_SIZE && r.height >= MIN_ELEM_SIZE) {
        return current;
      }
      current = current.parentElement;
    }
    // 返回原始元素（即使它很小）
    return el.getBoundingClientRect().width > 0 ? el : null;
  }

  /**
   * 将原元素的计算样式拷贝到克隆元素的 style 上
   */
  function copyComputedStyles(source, target) {
    const computed = window.getComputedStyle(source);
    for (const prop of STYLES_TO_COPY) {
      const val = computed[prop];
      if (val && val !== 'none' && val !== 'normal' && val !== 'auto') {
        target.style[prop] = val;
      }
    }
    // 确保文字正常显示
    if (!target.style.fontFamily || target.style.fontFamily === '') {
      target.style.fontFamily = computed.fontFamily;
    }
  }

  /**
   * 更新克隆内容（仅在鼠标下方元素变化时调用）
   */
  function updateClone(el, cx, cy) {
    zoomContainer.innerHTML = '';

    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    // 深克隆元素（保留 className / id，全局 CSS 仍会生效）
    const clone = el.cloneNode(true);
    copyComputedStyles(el, clone);

    // 定死尺寸，避免内容撑开
    clone.style.width = rect.width + 'px';
    clone.style.height = rect.height + 'px';
    clone.style.minWidth = rect.width + 'px';
    clone.style.minHeight = rect.height + 'px';
    clone.style.maxWidth = rect.width + 'px';
    clone.style.maxHeight = rect.height + 'px';
    clone.style.overflow = 'hidden';
    clone.style.position = 'relative';
    clone.style.boxSizing = 'content-box';
    // 禁用交互
    clone.style.pointerEvents = 'none';
    clone.style.userSelect = 'none';

    zoomContainer.appendChild(clone);

    // 缩放容器设为原尺寸 × scale，然后用 transform: scale(scale) 放大
    zoomContainer.style.width = rect.width + 'px';
    zoomContainer.style.height = rect.height + 'px';
    zoomContainer.style.transform = `scale(${scale})`;
  }

  /**
   * 更新克隆的偏移量（每次鼠标移动都调用）
   * 使光标所指位置对齐到放大镜中心
   */
  function updatePosition(el, cx, cy) {
    const rect = el.getBoundingClientRect();
    const offsetX = cx - rect.left;   // 光标在元素内的 X 偏移
    const offsetY = cy - rect.top;    // 光标在元素内的 Y 偏移

    // 放大后，该偏移点的位置 = offsetX*scale, offsetY*scale
    // 要让这个点在放大镜中心，缩放容器应偏移
    zoomContainer.style.left = (LENS_SIZE / 2 - offsetX * scale) + 'px';
    zoomContainer.style.top = (LENS_SIZE / 2 - offsetY * scale) + 'px';
  }

  // ==================== 主循环（requestAnimationFrame） ====================
  function tick() {
    rafId = null;
    if (!active) return;

    // 暂时隐藏镜头，才能用 elementFromPoint 拿到下方的真实元素
    lens.style.visibility = 'hidden';
    const rawEl = document.elementFromPoint(mouseX, mouseY);
    lens.style.visibility = 'visible';

    if (!rawEl) return;

    const el = findSuitableElement(rawEl);
    if (!el) return;

    // 仅在元素切换时重新克隆
    if (el !== currentElement) {
      currentElement = el;
      updateClone(el, mouseX, mouseY);
    }

    updatePosition(el, mouseX, mouseY);

    // 定位放大镜（使其中心对准光标）
    lens.style.left = (mouseX - LENS_SIZE / 2) + 'px';
    lens.style.top = (mouseY - LENS_SIZE / 2) + 'px';
  }

  function scheduleTick() {
    if (rafId === null) {
      rafId = requestAnimationFrame(tick);
    }
  }

  // ==================== 事件处理 ====================
  function handleMouseMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    scheduleTick();
  }

  function handleScroll() {
    // 滚动后内容变了，强制下一次 tick 重新克隆
    currentElement = null;
    scheduleTick();
  }

  function handleWheel(e) {
    // Shift+滚轮 调节放大倍率
    if (!active || !e.shiftKey) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY < 0) {
      // 向上滚 → 放大
      scale = Math.min(MAX_SCALE, +(scale + WHEEL_STEP).toFixed(1));
    } else {
      // 向下滚 → 缩小
      scale = Math.max(MIN_SCALE, +(scale - WHEEL_STEP).toFixed(1));
    }

    // 更新角标
    scaleBadge.textContent = scale + '×';
    // 高亮角标提示变化
    scaleBadge.style.background = 'rgba(220,50,50,0.85)';
    clearTimeout(scaleBadge._timer);
    scaleBadge._timer = setTimeout(() => {
      scaleBadge.style.background = 'rgba(0,0,0,0.7)';
    }, 300);

    // 强制下次 tick 用新倍率重新克隆
    currentElement = null;
    scheduleTick();
  }

  function handleKeyDown(e) {
    // Esc：暂停 / 恢复
    if (e.key === 'Escape') {
      e.preventDefault();
      active = !active;
      lens.style.display = active ? 'block' : 'none';
      document.documentElement.style.cursor = active ? 'none' : '';
      if (!active) {
        zoomContainer.innerHTML = '';
        currentElement = null;
      } else {
        scheduleTick();
      }
    }
    // Ctrl+Shift+Z：彻底关闭
    if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
      e.preventDefault();
      destroy();
    }
  }

  function destroy() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lens.remove();
    toast.remove();
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('scroll', handleScroll, true);
    document.removeEventListener('wheel', handleWheel, true);
    document.documentElement.style.cursor = '';
    console.log('🔍 放大镜已关闭。');
  }

  // 保存 handler 引用以便再次运行脚本时清理
  lens._handlers = { move: handleMouseMove, key: handleKeyDown, scroll: handleScroll, wheel: handleWheel };

  // ==================== 绑定事件 ====================
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('scroll', handleScroll, true);
  document.addEventListener('wheel', handleWheel, true);

  // ==================== 启动 ====================
  console.log(
    '%c🔍 放大镜已启动！%c 移动鼠标查看 2× 放大效果。\n' +
    '%c  按 Esc 暂停/恢复 | Shift+滚轮 调节倍率 (%.1f× – %.0f×) | Ctrl+Shift+Z 关闭',
    'font-size:16px;', '', 'color:#888;',
    MIN_SCALE, MAX_SCALE
  );
})();