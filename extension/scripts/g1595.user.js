(function() {
  const existing = document.getElementById('rubiks-container');
  if (existing) existing.remove();

  const style = document.createElement('style');
  style.textContent = `
    #rubiks-container {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 700px;
      height: 750px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    #rubiks-container.dragging {
      cursor: grabbing;
      user-select: none;
    }
    .rubiks-header {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
      cursor: grab;
      z-index: 1000001;
      backdrop-filter: blur(10px);
    }
    .rubiks-header:active {
      cursor: grabbing;
    }
    .rubiks-title {
      color: white;
      font-size: 16px;
      font-weight: 600;
      user-select: none;
    }
    .header-buttons {
      display: flex;
      gap: 8px;
    }
    .header-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      transition: all 0.2s;
      background: rgba(255,255,255,0.2);
      color: white;
    }
    .header-btn:hover {
      background: rgba(255,255,255,0.3);
      transform: scale(1.1);
    }
    .header-btn.close:hover {
      background: #f44336;
    }
    #rubiks-canvas {
      display: block;
      width: 100%;
      height: 100%;
      cursor: grab;
    }
    #rubiks-canvas:active {
      cursor: grabbing;
    }
    .rubiks-controls {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 8px;
      z-index: 1000000;
      background: rgba(0,0,0,0.4);
      padding: 12px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }
    .rubiks-btn {
      padding: 8px 16px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 13px;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .rubiks-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(76,175,80,0.4);
      background: #45a049;
    }
    .rubiks-btn:active {
      transform: translateY(0);
    }
    .rubiks-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }
    .rubiks-views {
      position: absolute;
      top: 60px;
      right: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      z-index: 1000000;
    }
    .view-btn {
      padding: 8px 12px;
      background: #4CAF50;
      color: white;
      border: 2px solid transparent;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: all 0.2s;
      white-space: nowrap;
    }
    .view-btn.active {
      border-color: white;
      background: #45a049;
      box-shadow: 0 0 15px rgba(76,175,80,0.5);
    }
    .view-btn:hover {
      background: #45a049;
    }
    .rubiks-info {
      position: absolute;
      top: 60px;
      left: 12px;
      background: #4CAF50;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(76,175,80,0.3);
      backdrop-filter: blur(10px);
    }
    .zoom-hint {
      position: absolute;
      bottom: 90px;
      right: 12px;
      background: rgba(0,0,0,0.7);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 11px;
      z-index: 1000000;
      backdrop-filter: blur(10px);
    }
    .manual-controls {
      position: absolute;
      bottom: 90px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.4);
      padding: 16px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
      z-index: 1000000;
    }
    .manual-title {
      color: white;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
      text-align: center;
    }
    .manual-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
    }
    .manual-btn {
      width: 44px;
      height: 44px;
      background: #4CAF50;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 700;
      font-size: 14px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .manual-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 4px 12px rgba(76,175,80,0.4);
      background: #45a049;
    }
    .manual-btn:active {
      transform: scale(0.95);
    }
    .manual-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none !important;
    }
    .manual-btn .prime {
      position: absolute;
      top: 2px;
      right: 4px;
      font-size: 10px;
      opacity: 0.9;
    }
    .loading-msg {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 16px;
      font-weight: 600;
      z-index: 1000000;
    }
  `;
  document.head.appendChild(style);

  const container = document.createElement('div');
  container.id = 'rubiks-container';
  container.innerHTML = `
    <div class="rubiks-header" id="rubiks-header">
      <div class="rubiks-title">🎮 三阶魔方 Premium</div>
      <div class="header-buttons">
        <button class="header-btn minimize" id="minimize-btn" title="最小化">−</button>
        <button class="header-btn close" id="close-rubiks" title="关闭">×</button>
      </div>
    </div>
    <div class="loading-msg" id="loading-msg">正在加载高级渲染...</div>
    <div class="manual-controls" style="display:none;" id="manual-controls">
      <div class="manual-title">手动操作</div>
      <div class="manual-grid">
        <button class="manual-btn" data-move="R">R</button>
        <button class="manual-btn" data-move="R'">R<span class="prime">'</span></button>
        <button class="manual-btn" data-move="L">L</button>
        <button class="manual-btn" data-move="L'">L<span class="prime">'</span></button>
        <button class="manual-btn" data-move="U">U</button>
        <button class="manual-btn" data-move="U'">U<span class="prime">'</span></button>
        <button class="manual-btn" data-move="D">D</button>
        <button class="manual-btn" data-move="D'">D<span class="prime">'</span></button>
        <button class="manual-btn" data-move="F">F</button>
        <button class="manual-btn" data-move="F'">F<span class="prime">'</span></button>
        <button class="manual-btn" data-move="B">B</button>
        <button class="manual-btn" data-move="B'">B<span class="prime">'</span></button>
      </div>
    </div>
    <div class="rubiks-controls" style="display:none;" id="controls">
      <button class="rubiks-btn" id="scramble-btn">🎲 打乱</button>
      <button class="rubiks-btn" id="undo-btn">↶ 撤销</button>
      <button class="rubiks-btn" id="redo-btn">↷ 重做</button>
      <button class="rubiks-btn" id="reset-btn">🔄 重置</button>
    </div>
    <div class="rubiks-views" style="display:none;" id="views">
      <button class="view-btn active" data-view="default">立体</button>
      <button class="view-btn" data-view="front">正面</button>
      <button class="view-btn" data-view="top">顶面</button>
      <button class="view-btn" data-view="side">侧面</button>
    </div>
    <div class="rubiks-info" style="display:none;" id="info">
      移动: <span id="move-count">0</span><br>
      <span id="cube-status">已还原</span>
    </div>
    <div class="zoom-hint" style="display:none;">🖱️ 滚轮缩放</div>
    <canvas id="rubiks-canvas"></canvas>
  `;
  document.body.appendChild(container);

  let isDraggingWindow = false;
  let windowOffset = { x: 0, y: 0 };
  
  const header = document.getElementById('rubiks-header');
  header.addEventListener('mousedown', (e) => {
    isDraggingWindow = true;
    container.classList.add('dragging');
    const rect = container.getBoundingClientRect();
    windowOffset.x = e.clientX - rect.left;
    windowOffset.y = e.clientY - rect.top;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDraggingWindow) {
      container.style.left = (e.clientX - windowOffset.x) + 'px';
      container.style.top = (e.clientY - windowOffset.y) + 'px';
      container.style.transform = 'none';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDraggingWindow = false;
    container.classList.remove('dragging');
  });

  let isMinimized = false;
  document.getElementById('minimize-btn').addEventListener('click', () => {
    container.style.height = isMinimized ? '750px' : '50px';
    isMinimized = !isMinimized;
  });

  document.getElementById('close-rubiks').addEventListener('click', () => {
    container.remove();
  });

  function loadThreeJS(callback) {
    if (window.THREE) {
      callback();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js';
    script.onload = callback;
    script.onerror = () => {
      document.getElementById('loading-msg').textContent = '加载失败';
    };
    document.head.appendChild(script);
  }

  loadThreeJS(function() {
    document.getElementById('loading-msg').style.display = 'none';
    document.getElementById('controls').style.display = 'flex';
    document.getElementById('views').style.display = 'flex';
    document.getElementById('info').style.display = 'block';
    document.getElementById('manual-controls').style.display = 'block';
    document.querySelector('.zoom-hint').style.display = 'block';
    
    const THREE = window.THREE;
    const canvas = document.getElementById('rubiks-canvas');
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f0f1e);
    
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(700, 700);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const cubeSize = 1, gap = 0.08;
    let cubies = [], moveHistory = [], historyIndex = -1, moveCount = 0, isAnimating = false;
    let cameraDistance = 6.5;

    const colors = {
      white: 0xFFFFFF, yellow: 0xFFD700, red: 0xFF1744,
      orange: 0xFF6D00, blue: 0x2979FF, green: 0x00E676, black: 0x0d0d0d
    };

    function createCubie(x, y, z) {
      const geo = new THREE.BoxGeometry(cubeSize - gap, cubeSize - gap, cubeSize - gap);
      const black = new THREE.MeshStandardMaterial({
        color: colors.black, metalness: 0.2, roughness: 0.4
      });
      const sticker = (c) => new THREE.MeshStandardMaterial({
        color: c, metalness: 0.1, roughness: 0.3, emissive: c, emissiveIntensity: 0.25
      });
      const mats = [
        x === 1 ? sticker(colors.red) : black,
        x === -1 ? sticker(colors.orange) : black,
        y === 1 ? sticker(colors.white) : black,
        y === -1 ? sticker(colors.yellow) : black,
        z === 1 ? sticker(colors.blue) : black,
        z === -1 ? sticker(colors.green) : black
      ];
      const cube = new THREE.Mesh(geo, mats);
      cube.position.set(x * cubeSize, y * cubeSize, z * cubeSize);
      cube.castShadow = cube.receiveShadow = true;
      cube.userData.logicalPos = { x, y, z };
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      cube.add(edges);
      return cube;
    }

    function initCube() {
      cubies.forEach(c => cubeGroup.remove(c));
      cubies = [];
      for (let x = -1; x <= 1; x++)
        for (let y = -1; y <= 1; y++)
          for (let z = -1; z <= 1; z++) {
            const c = createCubie(x, y, z);
            cubies.push(c);
            cubeGroup.add(c);
          }
      moveHistory = [];
      historyIndex = -1;
      moveCount = 0;
      document.getElementById('move-count').textContent = '0';
      document.getElementById('cube-status').textContent = '已还原';
      updateButtons();
    }

    initCube();

    camera.position.set(4.6, 4.6, 4.6);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const main = new THREE.DirectionalLight(0xffffff, 1.5);
    main.position.set(8, 12, 8);
    main.castShadow = true;
    scene.add(main);
    scene.add(new THREE.DirectionalLight(0xadd8e6, 0.6).position.set(-6, 4, -6));
    scene.add(new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.6));
    scene.add(new THREE.PointLight(0xffffff, 1.2, 20).position.set(5, 5, 5));

    let isDragging = false, prevMouse = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', e => {
      if (!isDraggingWindow) {
        isDragging = true;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mousemove', e => {
      if (isDragging && !isAnimating && !isDraggingWindow) {
        cubeGroup.rotation.y += (e.clientX - prevMouse.x) * 0.005;
        cubeGroup.rotation.x += (e.clientY - prevMouse.y) * 0.005;
        prevMouse = { x: e.clientX, y: e.clientY };
      }
    });

    canvas.addEventListener('mouseup', () => isDragging = false);
    canvas.addEventListener('mouseleave', () => isDragging = false);

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      cameraDistance = Math.max(4, Math.min(12, cameraDistance + e.deltaY * 0.01));
      const a = Math.sqrt(2) / 2;
      camera.position.set(cameraDistance * a, cameraDistance * a, cameraDistance * a);
      camera.lookAt(0, 0, 0);
    }, { passive: false });

    function rotateFace(axis, layer, dir, addHist = true) {
      if (isAnimating) return Promise.resolve();
      return new Promise(resolve => {
        isAnimating = true;
        document.querySelectorAll('.manual-btn').forEach(b => b.disabled = true);
        const pivot = new THREE.Group();
        cubeGroup.add(pivot);
        const affected = cubies.filter(c => c.userData.logicalPos[axis] === layer);
        const saved = affected.map(c => ({
          cube: c, pos: c.position.clone(), quat: c.quaternion.clone()
        }));
        saved.forEach(({ cube, pos, quat }) => {
          cubeGroup.remove(cube);
          pivot.add(cube);
          cube.position.copy(pos);
          cube.quaternion.copy(quat);
        });
        const angle = dir * Math.PI / 2, dur = 300, start = Date.now();
        function anim() {
          const prog = Math.min((Date.now() - start) / dur, 1);
          const eased = prog < 0.5 ? 2 * prog * prog : -1 + (4 - 2 * prog) * prog;
          pivot.rotation.set(0, 0, 0);
          pivot.rotation[axis] = angle * eased;
          if (prog < 1) {
            requestAnimationFrame(anim);
          } else {
            saved.forEach(({ cube }) => {
              const fp = cube.position.clone().applyQuaternion(pivot.quaternion);
              const fq = cube.quaternion.clone().premultiply(pivot.quaternion);
              pivot.remove(cube);
              cubeGroup.add(cube);
              cube.position.copy(fp);
              cube.quaternion.copy(fq);
              const old = cube.userData.logicalPos, n = { ...old };
              if (axis === 'x') {
                const t = n.y;
                n.y = dir > 0 ? -n.z : n.z;
                n.z = dir > 0 ? t : -t;
              } else if (axis === 'y') {
                const t = n.x;
                n.x = dir > 0 ? n.z : -n.z;
                n.z = dir > 0 ? -t : t;
              } else {
                const t = n.x;
                n.x = dir > 0 ? -n.y : n.y;
                n.y = dir > 0 ? t : -t;
              }
              cube.userData.logicalPos = n;
            });
            cubeGroup.remove(pivot);
            isAnimating = false;
            document.querySelectorAll('.manual-btn').forEach(b => b.disabled = false);
            if (addHist) {
              if (historyIndex < moveHistory.length - 1) moveHistory.splice(historyIndex + 1);
              moveHistory.push({ axis, layer, direction: dir });
              historyIndex++;
              moveCount++;
              document.getElementById('move-count').textContent = moveCount;
              document.getElementById('cube-status').textContent = '进行中';
              updateButtons();
            }
            resolve();
          }
        }
        anim();
      });
    }

    function execMove(notation) {
      const isPrime = notation.includes("'");
      const face = notation.replace("'", "");
      const moves = {
        R: { axis: 'x', layer: 1, direction: 1 },
        L: { axis: 'x', layer: -1, direction: -1 },
        U: { axis: 'y', layer: 1, direction: 1 },
        D: { axis: 'y', layer: -1, direction: -1 },
        F: { axis: 'z', layer: 1, direction: 1 },
        B: { axis: 'z', layer: -1, direction: -1 }
      };
      const m = moves[face];
      if (m) return rotateFace(m.axis, m.layer, isPrime ? -m.direction : m.direction);
    }

    function updateButtons() {
      document.getElementById('undo-btn').disabled = historyIndex < 0 || isAnimating;
      document.getElementById('redo-btn').disabled = historyIndex >= moveHistory.length - 1 || isAnimating;
      document.getElementById('reset-btn').disabled = isAnimating || moveHistory.length === 0;
    }

    document.querySelectorAll('.manual-btn').forEach(b => {
      b.addEventListener('click', () => execMove(b.dataset.move));
    });

    document.getElementById('scramble-btn').addEventListener('click', async () => {
      if (isAnimating) return;
      const axes = ['x', 'y', 'z'], layers = [-1, 0, 1], dirs = [1, -1];
      for (let i = 0; i < 20; i++) {
        await rotateFace(
          axes[Math.floor(Math.random() * 3)],
          layers[Math.floor(Math.random() * 3)],
          dirs[Math.floor(Math.random() * 2)]
        );
      }
    });

    document.getElementById('undo-btn').addEventListener('click', async () => {
      if (isAnimating || historyIndex < 0) return;
      const m = moveHistory[historyIndex];
      historyIndex--;
      moveCount--;
      await rotateFace(m.axis, m.layer, -m.direction, false);
      document.getElementById('move-count').textContent = moveCount;
      updateButtons();
    });

    document.getElementById('redo-btn').addEventListener('click', async () => {
      if (isAnimating || historyIndex >= moveHistory.length - 1) return;
      historyIndex++;
      const m = moveHistory[historyIndex];
      moveCount++;
      await rotateFace(m.axis, m.layer, m.direction, false);
      document.getElementById('move-count').textContent = moveCount;
      updateButtons();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (!isAnimating) initCube();
    });

    document.querySelectorAll('.view-btn').forEach(b => {
      b.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        cameraDistance = 6.5;
        cubeGroup.rotation.set(0, 0, 0);
        const v = b.dataset.view;
        if (v === 'default') camera.position.set(4.6, 4.6, 4.6);
        else if (v === 'front') camera.position.set(0, 0, cameraDistance);
        else if (v === 'top') camera.position.set(0, cameraDistance, 0);
        else camera.position.set(cameraDistance, 0, 0);
        camera.lookAt(0, 0, 0);
      });
    });

    function render() {
      requestAnimationFrame(render);
      renderer.render(scene, camera);
    }
    render();
    updateButtons();
  });
})();