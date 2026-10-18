(function () {
  // 移除旧实例
  const old = document.getElementById('Yuze-magnifier');
  const oldStyle = document.getElementById('Yuze-magnifier-style');
  if (old) old.remove();
  if (oldStyle) oldStyle.remove();
  if (window.__removeMagnifier) window.__removeMagnifier();

  const SIZE = 200;       // 放大镜直径 px
  const ZOOM = 2.5;       // 放大倍率
  const HALF = SIZE / 2;

  // ── 样式注入 ──────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'Yuze-magnifier-style';
  style.textContent = `
    body { cursor: crosshair !important; }
    #Yuze-magnifier {
      position: fixed;
      width: ${SIZE}px;
      height: ${SIZE}px;
      border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.9);
      box-shadow: 0 4px 24px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(0,0,0,0.15);
      overflow: hidden;
      pointer-events: none;
      z-index: 2147483647;
      display: none;
      background: #fff;
    }
    #Yuze-magnifier-canvas {
      position: absolute;
      top: 0; left: 0;
      width: ${SIZE}px;
      height: ${SIZE}px;
      pointer-events: none;
    }
    #Yuze-magnifier::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12) 0%, transparent 60%);
      pointer-events: none;
      z-index: 1;
    }
  `;
  document.head.appendChild(style);

  // ── 放大镜容器 ────────────────────────────────────────
  const lens = document.createElement('div');
  lens.id = 'Yuze-magnifier';

  // 用一个 div 作为"视口层"，通过 transform 映射真实页面坐标
  const viewport = document.createElement('div');
  Object.assign(viewport.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: `${window.innerWidth}px`,
    height: `${window.innerHeight}px`,
    transformOrigin: '0 0',
    willChange: 'transform',
    pointerEvents: 'none',
  });

  // 克隆整个 #app 或 body 内容作为镜像层
  // 关键：每次 mousemove 只更新 transform，不重新克隆
  let mirrorEl = null;

  function buildMirror() {
    viewport.innerHTML = '';
    // 克隆 body 的直接子节点（排除放大镜本身）
    const frag = document.createDocumentFragment();
    Array.from(document.body.children).forEach(child => {
      if (child.id === 'Yuze-magnifier') return;
      frag.appendChild(child.cloneNode(true));
    });
    viewport.appendChild(frag);
    mirrorEl = viewport;
  }

  buildMirror();
  lens.appendChild(viewport);
  document.body.appendChild(lens);

  // ── 鼠标移动：核心坐标映射 ───────────────────────────
  function onMouseMove(e) {
    const mx = e.clientX;  // 鼠标在视口中的 X（fixed 坐标系）
    const my = e.clientY;  // 鼠标在视口中的 Y

    // 放大镜跟随鼠标，圆心对准鼠标
    lens.style.display = 'block';
    lens.style.left = `${mx - HALF}px`;
    lens.style.top  = `${my - HALF}px`;

    // 计算 viewport 的 translate：
    // 目标：让 (mx, my) 这个视口坐标，在放大后映射到放大镜圆心 (HALF, HALF)
    // 公式：translate = HALF - mx * ZOOM,  HALF - my * ZOOM
    // 但 viewport 内部是对 clientX/Y 的镜像，需要加上滚动偏移
    const sx = window.scrollX;
    const sy = window.scrollY;

    // 页面坐标 = clientXY + scroll
    // 放大镜圆心要对准 pageXY，所以：
    // translateX = HALF - (mx + sx) * ZOOM + sx  （保持 fixed 元素位置修正）
    // 简化：对于 fixed 定位的放大镜，内部镜像是 document 坐标系
    // 直接用：translateX = HALF - mx * ZOOM
    //         translateY = HALF - my * ZOOM
    // （viewport 内容从 body 克隆，其坐标已是文档流，不含 scroll）
    // 所以需要把 scroll 也算进去：
    const tx = HALF - (mx + sx) * ZOOM;
    const ty = HALF - (my + sy) * ZOOM;

    viewport.style.transform = `scale(${ZOOM}) translate(${tx / ZOOM}px, ${ty / ZOOM}px)`;
  }

  // ── 离开页面隐藏 ──────────────────────────────────────
  function onMouseLeave() {
    lens.style.display = 'none';
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseleave', onMouseLeave);

  // 滚动时无需重建，因为坐标公式已包含 scrollX/Y
  // resize 时重建镜像
  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildMirror, 400);
  }
  window.addEventListener('resize', onResize);

  // ── 销毁接口 ──────────────────────────────────────────
  window.__removeMagnifier = function () {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseleave', onMouseLeave);
    window.removeEventListener('resize', onResize);
    lens.remove();
    style.remove();
    delete window.__removeMagnifier;
    console.log('🔍 放大镜已移除');
  };

  console.log('🔍 放大镜 v2 已启动 | window.__removeMagnifier() 可关闭');
})();