(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 桌面宠物 · 小橘猫（浏览器版）
     * 基于 DOM + CSS + SVG 渲染，可在任意网页上运行
     * 功能：眨眼 / 摇尾巴 / 随机散步 / 拖拽 / 双击互动 / 右键菜单
     */
    async function run(args) {
      // ============ 配置 ============
      const CFG = {
        width: 160,
        height: 200,
        fps: 33,
        blinkMin: 80,
        blinkMax: 180,
        blinkDuration: 130,
        walkChance: 0.006,
        walkMinSteps: 50,
        walkMaxSteps: 140,
        walkSpeed: 2,
        tailSpeed: 0.10,
        tailMaxSwing: 1.3,
        interactDuration: 220,
        napDuration: 2200,
      };
    
      const MESSAGES = ['喵~', '摸摸我！', '咕噜咕噜~', '喵呜~', '想吃小鱼干！'];
    
      // ============ 颜色常量 ============
      const C = {
        orange: '#FFA94D',
        dark: '#E68A2E',
        belly: '#FFE8C7',
        innerEar: '#FFC4A0',
        blush: '#FFB0B0',
        nose: '#FF8C8C',
        mouth: '#7A4A1E',
        whisker: '#9a9a9a',
        eye: '#3A3A3A',
        eyeHl: '#fff',
      };
    
      // ============ 创建容器 ============
      let container = document.getElementById('desktop-pet-container');
      if (container) {
        container.remove();
      }
    
      container = document.createElement('div');
      container.id = 'desktop-pet-container';
      container.style.cssText = `
        position: fixed;
        top: 0; left: 0;
        width: ${CFG.width}px;
        height: ${CFG.height}px;
        z-index: 2147483647;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
        cursor: grab;
        filter: drop-shadow(2px 4px 8px rgba(0,0,0,0.25));
      `;
    
      // 随机初始位置
      const initX = Math.random() * (window.innerWidth - CFG.width - 100) + 50;
      const initY = Math.random() * (window.innerHeight - CFG.height - 100) + 50;
      container.style.left = initX + 'px';
      container.style.top = initY + 'px';
    
      // ============ SVG 绘制猫 ============
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('width', CFG.width);
      svg.setAttribute('height', CFG.height);
      svg.setAttribute('viewBox', '0 0 160 200');
      svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible;';
      container.appendChild(svg);
    
      // 角色中心坐标 (cx=80, cy=118)
      const CX = 80, CY = 118;
    
      // ---- 辅助函数 ----
      function createEl(tag, attrs) {
        const el = document.createElementNS(NS, tag);
        for (const [k, v] of Object.entries(attrs)) {
          el.setAttribute(k, v);
        }
        return el;
      }
    
      // ---- 静态部分 ----
      const staticGroup = createEl('g', { id: 'pet-static' });
    
      // 身体
      staticGroup.appendChild(createEl('ellipse', { cx: CX, cy: CY+47.5, rx: 38, ry: 32.5, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
      // 肚子
      staticGroup.appendChild(createEl('ellipse', { cx: CX, cy: CY+55, rx: 22, ry: 19, fill: C.belly }));
      // 爪子左
      staticGroup.appendChild(createEl('ellipse', { cx: CX-19, cy: CY+75, rx: 11, ry: 9, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
      // 爪子右
      staticGroup.appendChild(createEl('ellipse', { cx: CX+19, cy: CY+75, rx: 11, ry: 9, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
      // 头
      staticGroup.appendChild(createEl('ellipse', { cx: CX, cy: CY-5, rx: 42, ry: 37, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
    
      // 耳朵
      staticGroup.appendChild(createEl('polygon', { points: `${CX-42},${CY-26} ${CX-34},${CY-58} ${CX-12},${CY-38}`, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
      staticGroup.appendChild(createEl('polygon', { points: `${CX+42},${CY-26} ${CX+34},${CY-58} ${CX+12},${CY-38}`, fill: C.orange, stroke: C.dark, 'stroke-width': 2 }));
      // 内耳
      staticGroup.appendChild(createEl('polygon', { points: `${CX-34},${CY-30} ${CX-29},${CY-48} ${CX-20},${CY-36}`, fill: C.innerEar }));
      staticGroup.appendChild(createEl('polygon', { points: `${CX+34},${CY-30} ${CX+29},${CY-48} ${CX+20},${CY-36}`, fill: C.innerEar }));
    
      // 额头花纹
      for (const dx of [-12, 0, 12]) {
        staticGroup.appendChild(createEl('line', { x1: CX+dx, y1: CY-38, x2: CX+dx*0.6, y2: CY-28, stroke: C.dark, 'stroke-width': 2 }));
      }
    
      // 腮红
      staticGroup.appendChild(createEl('ellipse', { cx: CX-27, cy: CY+12.5, rx: 6, ry: 4.5, fill: C.blush }));
      staticGroup.appendChild(createEl('ellipse', { cx: CX+27, cy: CY+12.5, rx: 6, ry: 4.5, fill: C.blush }));
    
      // 鼻子
      staticGroup.appendChild(createEl('polygon', { points: `${CX-4},${CY+4} ${CX+4},${CY+4} ${CX},${CY+9}`, fill: C.nose }));
    
      // 嘴
      staticGroup.appendChild(createEl('path', { d: `M${CX-9},${CY+8} A9,10 0 0,0 ${CX},${CY+18}`, fill: 'none', stroke: C.mouth, 'stroke-width': 1.8 }));
      staticGroup.appendChild(createEl('path', { d: `M${CX},${CY+18} A9,10 0 0,0 ${CX+9},${CY+8}`, fill: 'none', stroke: C.mouth, 'stroke-width': 1.8 }));
    
      // 胡须
      const whiskerData = [
        [CX-20, CY+5, CX-42, CY+1], [CX-20, CY+10, CX-42, CY+11],
        [CX+20, CY+5, CX+42, CY+1], [CX+20, CY+10, CX+42, CY+11],
      ];
      for (const [x1, y1, x2, y2] of whiskerData) {
        staticGroup.appendChild(createEl('line', { x1, y1, x2, y2, stroke: C.whisker, 'stroke-width': 1 }));
      }
    
      svg.appendChild(staticGroup);
    
      // ---- 动态部分 ----
      const dynamicGroup = createEl('g', { id: 'pet-dynamic' });
    
      // 尾巴
      const tail = createEl('path', {
        d: `M${CX+34},${CY+42} Q${CX+56},${CY+30} ${CX+60},${CY+6}`,
        fill: 'none', stroke: C.dark, 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
      });
      dynamicGroup.appendChild(tail);
    
      // 眼睛（睁眼）
      const eyeLOpen = createEl('ellipse', { cx: CX-15, cy: CY-6.5, rx: 6, ry: 5.5, fill: C.eye, class: 'eye-open' });
      const eyeROpen = createEl('ellipse', { cx: CX+15, cy: CY-6.5, rx: 6, ry: 5.5, fill: C.eye, class: 'eye-open' });
      const hlL = createEl('ellipse', { cx: CX-12.5, cy: CY-8, rx: 2.5, ry: 3, fill: C.eyeHl, class: 'eye-open' });
      const hlR = createEl('ellipse', { cx: CX+12.5, cy: CY-8, rx: 2.5, ry: 3, fill: C.eyeHl, class: 'eye-open' });
      dynamicGroup.appendChild(eyeLOpen);
      dynamicGroup.appendChild(eyeROpen);
      dynamicGroup.appendChild(hlL);
      dynamicGroup.appendChild(hlR);
    
      // 闭眼线（默认隐藏）
      const eyeLClose = createEl('line', { x1: CX-21, y1: CY-6, x2: CX-9, y2: CY-6, stroke: C.eye, 'stroke-width': 2.4, class: 'eye-close', style: 'opacity:0' });
      const eyeRClose = createEl('line', { x1: CX+9, y1: CY-6, x2: CX+21, y2: CY-6, stroke: C.eye, 'stroke-width': 2.4, class: 'eye-close', style: 'opacity:0' });
      dynamicGroup.appendChild(eyeLClose);
      dynamicGroup.appendChild(eyeRClose);
    
      svg.appendChild(dynamicGroup);
    
      // ============ 气泡 ============
      let bubbleEl = null;
      let bubbleTimeout = null;
    
      function showBubble(text, duration = 1800) {
        if (bubbleEl) {
          clearTimeout(bubbleTimeout);
          bubbleEl.remove();
        }
        bubbleEl = document.createElement('div');
        bubbleEl.className = 'pet-bubble';
        bubbleEl.textContent = text;
        bubbleEl.style.cssText = `
          position: absolute;
          top: -40px;
          left: 50%;
          transform: translateX(-50%);
          background: white;
          border-radius: 12px;
          padding: 6px 14px;
          font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
          font-size: 14px;
          color: #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          white-space: nowrap;
          animation: petBubbleIn 0.25s ease-out;
          pointer-events: none;
          z-index: 2147483648;
        `;
        container.appendChild(bubbleEl);
        if (duration > 0) {
          bubbleTimeout = setTimeout(() => {
            if (bubbleEl) {
              bubbleEl.style.animation = 'petBubbleOut 0.2s ease-in forwards';
              setTimeout(() => { if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; } }, 200);
            }
          }, duration);
        }
      }
    
      // 气泡动画样式
      if (!document.getElementById('pet-bubble-styles')) {
        const styleSheet = document.createElement('style');
        styleSheet.id = 'pet-bubble-styles';
        styleSheet.textContent = `
          @keyframes petBubbleIn {
            from { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.85); }
            to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
          }
          @keyframes petBubbleOut {
            from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
            to   { opacity: 0; transform: translateX(-50%) translateY(-6px) scale(0.85); }
          }
        `;
        document.head.appendChild(styleSheet);
      }
    
      // ============ 状态变量 ============
      let eyesOpen = true;
      let blinkCounter = 0;
      let nextBlink = randInt(CFG.blinkMin, CFG.blinkMax);
      let tailSwing = 0;
      let tailDir = 1;
      let walkState = 'idle'; // idle | walk
      let walkDir = 1;
      let walkRemaining = 0;
      let petX = initX;
      let petY = initY;
      let dragOffset = null;
    
      function randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
    
      // ============ 动画控制 ============
      function setEyes(opened) {
        eyesOpen = opened;
        const openEls = container.querySelectorAll('.eye-open');
        const closeEls = container.querySelectorAll('.eye-close');
        openEls.forEach(el => { el.style.opacity = opened ? '1' : '0'; });
        closeEls.forEach(el => { el.style.opacity = opened ? '0' : '1'; });
      }
    
      function updateTail() {
        tailSwing += tailDir * CFG.tailSpeed;
        if (tailSwing > CFG.tailMaxSwing) tailDir = -1;
        else if (tailSwing < -CFG.tailMaxSwing) tailDir = 1;
        const s = tailSwing;
        const pathD = `M${CX+34},${CY+42} Q${CX+56 + s*16},${CY+30 + Math.abs(s)*3} ${CX+60 + s*30},${CY+6 + s*12}`;
        tail.setAttribute('d', pathD);
      }
    
      function updateWalk() {
        if (walkState === 'idle') {
          if (Math.random() < CFG.walkChance) {
            walkState = 'walk';
            walkDir = Math.random() < 0.5 ? -1 : 1;
            walkRemaining = randInt(CFG.walkMinSteps, CFG.walkMaxSteps);
          }
        } else {
          petX += walkDir * CFG.walkSpeed;
          // 边界检测
          const sw = window.innerWidth, sh = window.innerHeight;
          if (petX < 0) { petX = 0; walkDir = 1; }
          else if (petX > sw - CFG.width) { petX = sw - CFG.width; walkDir = -1; }
          if (petY < 0) petY = 0;
          else if (petY > sh - CFG.height) petY = sh - CFG.height;
          container.style.left = petX + 'px';
          container.style.top = petY + 'px';
          walkRemaining--;
          if (walkRemaining <= 0) {
            walkState = 'idle';
          }
        }
      }
    
      function tick() {
        blinkCounter++;
        if (blinkCounter >= nextBlink) {
          setEyes(false);
          setTimeout(() => setEyes(true), CFG.blinkDuration);
          blinkCounter = 0;
          nextBlink = randInt(CFG.blinkMin, CFG.blinkMax);
        }
        updateTail();
        updateWalk();
      }
    
      // ============ 交互事件 ============
      container.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // 左键
          dragOffset = { dx: e.clientX - petX, dy: e.clientY - petY };
          walkState = 'idle';
          container.style.cursor = 'grabbing';
          e.preventDefault();
        } else if (e.button === 2) { // 右键
          showContextMenu(e.clientX, e.clientY);
          e.preventDefault();
        }
      });
    
      document.addEventListener('mousemove', (e) => {
        if (dragOffset !== null) {
          petX = e.clientX - dragOffset.dx;
          petY = e.clientY - dragOffset.dy;
          // 边界限制
          const sw = window.innerWidth, sh = window.innerHeight;
          petX = Math.max(0, Math.min(sw - CFG.width, petX));
          petY = Math.max(0, Math.min(sh - CFG.height, petY));
          container.style.left = petX + 'px';
          container.style.top = petY + 'px';
        }
      });
    
      document.addEventListener('mouseup', () => {
        dragOffset = null;
        container.style.cursor = 'grab';
      });
    
      // 双击互动
      container.addEventListener('dblclick', (e) => {
        showBubble(MESSAGES[randInt(0, MESSAGES.length - 1)]);
        setEyes(false);
        setTimeout(() => setEyes(true), CFG.interactDuration);
      });
    
      // 禁用右键菜单（用自定义菜单替代）
      container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e.clientX, e.clientY);
      });
    
      // ============ 右键自定义菜单 ============
      let ctxMenu = null;
    
      function showContextMenu(x, y) {
        removeCtxMenu();
        ctxMenu = document.createElement('div');
        ctxMenu.className = 'pet-context-menu';
        ctxMenu.style.cssText = `
          position: fixed;
          left: ${x}px;
          top: ${y}px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          padding: 4px 0;
          font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
          font-size: 13px;
          z-index: 2147483649;
          min-width: 120px;
          animation: petCtxIn 0.15s ease-out;
        `;
    
        const items = [
          { label: '喵一声', action: () => showBubble('喵~') },
          { label: '打个盹', action: () => nap() },
          { type: 'separator' },
          { label: '退出桌宠', action: () => destroyPet() },
        ];
    
        for (const item of items) {
          if (item.type === 'separator') {
            const sep = document.createElement('div');
            sep.style.cssText = 'height:1px;background:#eee;margin:4px 10px;';
            ctxMenu.appendChild(sep);
          } else {
            const div = document.createElement('div');
            div.textContent = item.label;
            div.style.cssText = `
              padding: 8px 16px;
              cursor: pointer;
              color: #333;
              transition: background 0.1s;
            `;
            div.onmouseenter = () => { div.style.background = '#f0f0f0'; };
            div.onmouseleave = () => { div.style.background = ''; };
            div.onclick = () => { removeCtxMenu(); item.action(); };
            ctxMenu.appendChild(div);
          }
        }
    
        document.body.appendChild(ctxMenu);
    
        // 确保不超出屏幕
        const rect = ctxMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
          ctxMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
          ctxMenu.style.top = (y - rect.height) + 'px';
        }
      }
    
      function removeCtxMenu() {
        if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
      }
    
      // 点击其他地方关闭菜单
      document.addEventListener('click', () => removeCtxMenu());
    
      // 菜单动画样式
      if (!document.getElementById('pet-ctx-styles')) {
        const ctxStyle = document.createElement('style');
        ctxStyle.id = 'pet-ctx-styles';
        ctxStyle.textContent = `
          @keyframes petCtxIn {
            from { opacity: 0; transform: scale(0.92); }
            to   { opacity: 1; transform: scale(1); }
          }
        `;
        document.head.appendChild(ctxStyle);
      }
    
      // ============ 打盹功能 ============
      function nap() {
        setEyes(false);
        showBubble('Zzz...', CFG.napDuration);
        setTimeout(() => setEyes(true), CFG.napDuration);
      }
    
      // ============ 销毁 ============
      function destroyPet() {
        removeCtxMenu();
        if (bubbleEl) { bubbleEl.remove(); bubbleEl = null; }
        clearInterval(intervalId);
        if (container.parentNode) container.remove();
      }
    
      // ============ 启动 ============
      document.body.appendChild(container);
      const intervalId = setInterval(tick, CFG.fps);
    
      return {
        ok: true,
        summary: '桌面宠物「小橘猫」已启动！支持拖拽移动、双击互动、右键菜单。刷新页面后消失。',
        features: [
          'SVG 渲染的可爱橘猫形象',
          '自动眨眼动画',
          '尾巴摇摆动画',
          '随机散步行为',
          '鼠标左键拖拽移动',
          '双击显示随机气泡文字',
          '右键自定义菜单（喵一声/打盹/退出）',
        ],
        tip: '拖拽可移动位置，双击互动，右键打开菜单，选择"退出桌宠"可关闭。',
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();