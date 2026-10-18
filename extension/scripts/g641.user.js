(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // 防止重复注入
      if (document.getElementById('polaroid-wall-app')) {
        document.getElementById('polaroid-wall-app').remove();
      }
      const oldStyle = document.getElementById('polaroid-wall-styles');
      if (oldStyle) oldStyle.remove();
    
      // ── 全局样式 ──────────────────────────────────────────────────────────────
      const style = document.createElement('style');
      style.id = 'polaroid-wall-styles';
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600&family=Inter:wght@400;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
    
        #polaroid-wall-app {
          position: fixed; inset: 0; z-index: 999999;
          background: #1a1a2e; overflow: hidden;
          font-family: 'Inter', sans-serif;
          display: flex; flex-direction: column;
        }
    
        /* ── 顶栏 ── */
        #pw-header {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 24px;
          background: rgba(10,10,30,0.85); backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0;
        }
        #pw-header h1 { font-size: 20px; font-weight: 600; color: #fff; letter-spacing: 1px; }
        #pw-header h1 span { color: #f9c74f; }
        #pw-close-btn {
          background: rgba(255,255,255,0.1); border: none; color: #fff;
          width: 36px; height: 36px; border-radius: 50%; font-size: 18px;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: background .2s;
        }
        #pw-close-btn:hover { background: rgba(255,80,80,0.5); }
    
        /* ── 主区域 ── */
        #pw-main { flex: 1; display: flex; overflow: hidden; }
    
        /* ── 相机面板 ── */
        #pw-camera-panel {
          width: 340px; flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center;
          padding: 20px 20px; background: rgba(255,255,255,0.03);
          border-right: 1px solid rgba(255,255,255,0.07);
          gap: 12px; overflow-y: auto;
        }
    
        /* ── 预览区 ── */
        #pw-video-wrap {
          position: relative; width: 100%; border-radius: 16px;
          overflow: hidden; background: #000; aspect-ratio: 4/3;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        }
        #pw-video {
          width: 100%; height: 100%; object-fit: cover;
          display: block; transform: scaleX(-1);
        }
        #pw-fallback-preview {
          width: 100%; height: 100%; display: flex;
          flex-direction: column; align-items: center; justify-content: center;
          gap: 10px; background: #111; cursor: pointer;
          transition: background .2s; position: relative; overflow: hidden;
        }
        #pw-fallback-preview:hover { background: #1a1a1a; }
        #pw-fallback-preview img {
          position: absolute; inset: 0; width: 100%; height: 100%;
          object-fit: cover; opacity: 0.85;
        }
        #pw-fallback-overlay {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center; gap: 8px;
          background: rgba(0,0,0,0.55); border-radius: 12px;
          padding: 12px 16px; backdrop-filter: blur(4px);
        }
        #pw-fallback-overlay svg { opacity: .8; }
        #pw-fallback-overlay span {
          font-size: 12px; color: rgba(255,255,255,0.8);
          text-align: center; line-height: 1.5;
        }
        #pw-upload-input { display: none; }
    
        /* ── 状态条 ── */
        #pw-status-bar {
          width: 100%; padding: 8px 12px; border-radius: 10px;
          font-size: 12px; text-align: center; line-height: 1.5;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        #pw-status-bar.status-live  { background: rgba(45,198,83,0.15); color: #2dc653; border: 1px solid rgba(45,198,83,0.3); }
        #pw-status-bar.status-warn  { background: rgba(249,199,79,0.15); color: #f9c74f; border: 1px solid rgba(249,199,79,0.3); }
        #pw-status-bar.status-off   { background: rgba(255,107,107,0.12); color: #ff6b6b; border: 1px solid rgba(255,107,107,0.25); }
        #pw-status-bar.status-image { background: rgba(67,97,238,0.15); color: #7b9dff; border: 1px solid rgba(67,97,238,0.3); }
    
        /* ── 按钮组 ── */
        #pw-btn-row {
          width: 100%; display: flex; gap: 8px; align-items: center; justify-content: center;
        }
        #pw-start-btn {
          flex: 1; padding: 10px; border-radius: 12px;
          background: linear-gradient(135deg, #4361ee, #7209b7);
          color: #fff; border: none; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: opacity .2s, transform .15s;
          white-space: nowrap;
        }
        #pw-start-btn:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        #pw-start-btn:disabled { opacity: .45; cursor: not-allowed; }
    
        #pw-upload-btn {
          flex: 1; padding: 10px; border-radius: 12px;
          background: linear-gradient(135deg, #2d6a4f, #40916c);
          color: #fff; border: none; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: opacity .2s, transform .15s;
          white-space: nowrap;
        }
        #pw-upload-btn:hover { opacity: .9; transform: translateY(-1px); }
    
        /* ── 快门 ── */
        #pw-shutter-btn {
          width: 68px; height: 68px; border-radius: 50%;
          background: linear-gradient(135deg, #f9c74f, #f3722c);
          border: 4px solid rgba(255,255,255,0.3); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(249,199,79,0.4);
          transition: transform .15s, box-shadow .15s;
        }
        #pw-shutter-btn:hover:not(:disabled) { transform: scale(1.08); box-shadow: 0 6px 28px rgba(249,199,79,0.6); }
        #pw-shutter-btn:active:not(:disabled) { transform: scale(0.94); }
        #pw-shutter-btn:disabled { opacity: .4; cursor: not-allowed; }
        #pw-shutter-btn svg { pointer-events: none; }
    
        #pw-count-badge { font-size: 13px; color: rgba(255,255,255,0.5); }
        #pw-count-badge span { color: #f9c74f; font-weight: 600; }
        #pw-hint { font-size: 11.5px; color: rgba(255,255,255,0.28); text-align: center; line-height: 1.65; }
    
        /* ── 颜色选择器（无相机时画图） ── */
        #pw-draw-tools {
          width: 100%; display: none; flex-direction: column; gap: 8px;
        }
        #pw-draw-tools.visible { display: flex; }
        #pw-draw-label { font-size: 11px; color: rgba(255,255,255,0.4); text-align: center; }
        #pw-color-row { display: flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap; }
        .pw-color-dot {
          width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
          border: 2px solid transparent; transition: transform .15s, border-color .15s;
        }
        .pw-color-dot:hover { transform: scale(1.2); }
        .pw-color-dot.active { border-color: #fff; transform: scale(1.15); }
        #pw-canvas-wrap {
          position: relative; width: 100%; border-radius: 16px;
          overflow: hidden; aspect-ratio: 4/3; background: #111;
          box-shadow: 0 4px 16px rgba(0,0,0,0.4); display: none;
        }
        #pw-canvas-wrap.visible { display: block; }
        #pw-draw-canvas { width: 100%; height: 100%; display: block; touch-action: none; }
        #pw-clear-draw {
          position: absolute; top: 6px; right: 6px;
          background: rgba(0,0,0,0.6); border: none; color: #fff;
          font-size: 11px; padding: 3px 8px; border-radius: 6px;
          cursor: pointer; backdrop-filter: blur(4px);
        }
    
        /* ── 照片墙 ── */
        #pw-wall {
          flex: 1; overflow-y: auto; overflow-x: hidden;
          padding: 32px; position: relative;
        }
        #pw-wall::-webkit-scrollbar { width: 6px; }
        #pw-wall::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
        #pw-empty-hint {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 16px; color: rgba(255,255,255,0.2); font-size: 15px;
          pointer-events: none; user-select: none;
        }
    
        /* ── 拍立得 ── */
        .pw-polaroid {
          position: absolute; background: #fefefe;
          padding: 10px 10px 38px 10px;
          box-shadow: 4px 6px 20px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.2);
          cursor: grab; user-select: none; will-change: transform; touch-action: none;
        }
        .pw-polaroid:hover { box-shadow: 6px 10px 30px rgba(0,0,0,0.55); z-index: 100 !important; }
        .pw-polaroid:active { cursor: grabbing; }
        .pw-polaroid img { display: block; width: 200px; height: 160px; object-fit: cover; pointer-events: none; }
        .pw-polaroid-caption {
          font-family: 'Caveat', cursive; font-size: 17px; font-weight: 600;
          color: #222; text-align: center; padding: 7px 4px 0;
          line-height: 1.3; pointer-events: none;
        }
        .pw-polaroid-tape {
          position: absolute; width: 56px; height: 22px;
          background: rgba(255,240,120,0.6); border-radius: 2px;
          top: -10px; left: 50%; transform: translateX(-50%); pointer-events: none;
        }
    
        /* ── 闪光 ── */
        #pw-flash {
          position: fixed; inset: 0; background: #fff; opacity: 0;
          pointer-events: none; z-index: 1000000; transition: opacity 0.05s;
        }
        #pw-flash.flash-on { opacity: 0.85; }
    
        /* ── 入场动画 ── */
        @keyframes pw-drop-in {
          from { opacity:0; transform: var(--base-transform) translateY(-60px) scale(.7); }
          to   { opacity:1; transform: var(--base-transform); }
        }
        .pw-polaroid.animate-in { animation: pw-drop-in 0.55s cubic-bezier(.22,1.2,.36,1) forwards; }
    
        #pw-hidden-canvas { display: none; }
      `;
      document.head.appendChild(style);
    
      // ── HTML 结构 ─────────────────────────────────────────────────────────────
      const app = document.createElement('div');
      app.id = 'polaroid-wall-app';
      app.innerHTML = `
        <div id="pw-header">
          <h1>📷 <span>拍立得</span> 照片墙</h1>
          <button id="pw-close-btn" title="关闭">✕</button>
        </div>
        <div id="pw-main">
          <div id="pw-camera-panel">
    
            <!-- 实时预览（有相机时显示） -->
            <div id="pw-video-wrap" style="display:none">
              <video id="pw-video" autoplay playsinline muted></video>
            </div>
    
            <!-- 无相机时：点击区域（上传图片 or 画图） -->
            <div id="pw-fallback-preview">
              <img id="pw-fallback-img" src="" alt="" style="display:none">
              <div id="pw-fallback-overlay">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span id="pw-fallback-text">点击选择图片<br>或使用下方画板拍照</span>
              </div>
            </div>
            <input type="file" id="pw-upload-input" accept="image/*">
    
            <!-- 状态条 -->
            <div id="pw-status-bar" class="status-warn">
              ⏳ 点击「开启相机」尝试授权
            </div>
    
            <!-- 按钮行 -->
            <div id="pw-btn-row">
              <button id="pw-start-btn">🎥 开启相机</button>
              <button id="pw-upload-btn">🖼 上传图片</button>
            </div>
    
            <!-- 快门 -->
            <button id="pw-shutter-btn" title="拍照">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4" fill="white"/>
              </svg>
            </button>
    
            <div id="pw-count-badge">已拍 <span id="pw-count">0</span> 张照片</div>
    
            <!-- 画板工具（无相机备用） -->
            <div id="pw-draw-tools">
              <div id="pw-draw-label">🎨 在下方画板上涂鸦，再点快门拍照</div>
              <div id="pw-color-row"></div>
            </div>
            <div id="pw-canvas-wrap">
              <canvas id="pw-draw-canvas"></canvas>
              <button id="pw-clear-draw">清空</button>
            </div>
    
            <p id="pw-hint">• 有相机权限：实时预览拍照<br>• 无权限：上传图片 / 涂鸦后拍照<br>• 双击照片可删除，可拖拽摆放</p>
          </div>
    
          <!-- 照片墙 -->
          <div id="pw-wall">
            <div id="pw-empty-hint">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1" opacity=".15">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
              </svg>
              <span>照片墙空空如也<br>快去拍第一张照片吧！</span>
            </div>
          </div>
        </div>
        <div id="pw-flash"></div>
        <canvas id="pw-hidden-canvas"></canvas>
      `;
      document.body.appendChild(app);
    
      // ── 元素引用 ──────────────────────────────────────────────────────────────
      const videoWrap      = app.querySelector('#pw-video-wrap');
      const videoEl        = app.querySelector('#pw-video');
      const fallbackPrev   = app.querySelector('#pw-fallback-preview');
      const fallbackImg    = app.querySelector('#pw-fallback-img');
      const fallbackText   = app.querySelector('#pw-fallback-text');
      const uploadInput    = app.querySelector('#pw-upload-input');
      const statusBar      = app.querySelector('#pw-status-bar');
      const startBtn       = app.querySelector('#pw-start-btn');
      const uploadBtn      = app.querySelector('#pw-upload-btn');
      const shutterBtn     = app.querySelector('#pw-shutter-btn');
      const countEl        = app.querySelector('#pw-count');
      const wall           = app.querySelector('#pw-wall');
      const emptyHint      = app.querySelector('#pw-empty-hint');
      const flash          = app.querySelector('#pw-flash');
      const hiddenCanvas   = app.querySelector('#pw-hidden-canvas');
      const closeBtn       = app.querySelector('#pw-close-btn');
      const drawTools      = app.querySelector('#pw-draw-tools');
      const colorRow       = app.querySelector('#pw-color-row');
      const canvasWrap     = app.querySelector('#pw-canvas-wrap');
      const drawCanvas     = app.querySelector('#pw-draw-canvas');
      const clearDrawBtn   = app.querySelector('#pw-clear-draw');
    
      // ── 状态变量 ──────────────────────────────────────────────────────────────
      let stream       = null;   // 相机流
      let cameraReady  = false;  // 相机是否就绪
      let uploadedSrc  = null;   // 上传的图片 dataURL
      let photoCount   = 0;
      let zCounter     = 1;
    
      // ── 前7张预设文字 ─────────────────────────────────────────────────────────
      const presetLabels = ['妙招广场', '搜索', '上传文', '件', '测试', '今', '日运势'];
    
      // ── 画板初始化 ────────────────────────────────────────────────────────────
      const PALETTE = ['#ffffff','#f9c74f','#f3722c','#f94144','#90be6d','#43aa8b','#4361ee','#7209b7','#000000'];
      let drawColor = '#ffffff';
      let drawing   = false;
    
      PALETTE.forEach(c => {
        const dot = document.createElement('div');
        dot.className = 'pw-color-dot' + (c === drawColor ? ' active' : '');
        dot.style.background = c;
        dot.style.borderColor = c === '#000000' ? '#555' : 'transparent';
        dot.addEventListener('click', () => {
          document.querySelectorAll('.pw-color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
          drawColor = c;
        });
        colorRow.appendChild(dot);
      });
    
      function initDrawCanvas() {
        const rect = canvasWrap.getBoundingClientRect();
        drawCanvas.width  = rect.width  || 300;
        drawCanvas.height = rect.height || 225;
        const dctx = drawCanvas.getContext('2d');
        dctx.fillStyle = '#1a1a2e';
        dctx.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
      }
      setTimeout(initDrawCanvas, 50);
    
      function getDrawPos(e) {
        const r = drawCanvas.getBoundingClientRect();
        const src = e.touches ? e.touches[0] : e;
        return { x: (src.clientX - r.left) * (drawCanvas.width / r.width),
                 y: (src.clientY - r.top)  * (drawCanvas.height / r.height) };
      }
      drawCanvas.addEventListener('pointerdown', e => {
        drawing = true; drawCanvas.setPointerCapture(e.pointerId);
        const dctx = drawCanvas.getContext('2d');
        const p = getDrawPos(e);
        dctx.beginPath(); dctx.moveTo(p.x, p.y);
        dctx.strokeStyle = drawColor; dctx.lineWidth = 4;
        dctx.lineCap = 'round'; dctx.lineJoin = 'round';
      });
      drawCanvas.addEventListener('pointermove', e => {
        if (!drawing) return;
        const dctx = drawCanvas.getContext('2d');
        const p = getDrawPos(e);
        dctx.lineTo(p.x, p.y); dctx.stroke(); dctx.moveTo(p.x, p.y);
      });
      drawCanvas.addEventListener('pointerup', () => { drawing = false; });
      drawCanvas.addEventListener('pointercancel', () => { drawing = false; });
      clearDrawBtn.addEventListener('click', initDrawCanvas);
    
      // ── 切换到无相机模式 ──────────────────────────────────────────────────────
      function enterFallbackMode(reason) {
        cameraReady = false;
        videoWrap.style.display = 'none';
        fallbackPrev.style.display = 'flex';
        drawTools.classList.add('visible');
        canvasWrap.classList.add('visible');
        initDrawCanvas();
        statusBar.className = 'status-off';
        statusBar.textContent = reason || '📵 无相机权限，已切换备用模式';
        startBtn.textContent  = '🔄 重试相机';
        startBtn.disabled     = false;
        shutterBtn.disabled   = false; // 无相机也可拍
      }
    
      // ── 切换到有相机模式 ──────────────────────────────────────────────────────
      function enterCameraMode() {
        cameraReady = true;
        videoWrap.style.display = 'block';
        fallbackPrev.style.display = 'none';
        drawTools.classList.remove('visible');
        canvasWrap.classList.remove('visible');
        statusBar.className = 'status-live';
        statusBar.textContent = '🟢 相机已开启，可实时拍照';
        startBtn.textContent  = '✅ 相机已开启';
        startBtn.disabled     = true;
        shutterBtn.disabled   = false;
      }
    
      // ── 关闭 ──────────────────────────────────────────────────────────────────
      closeBtn.addEventListener('click', () => {
        if (stream) stream.getTracks().forEach(t => t.stop());
        app.remove();
        document.getElementById('polaroid-wall-styles')?.remove();
      });
    
      // ── 尝试开启相机 ──────────────────────────────────────────────────────────
      async function tryCamera() {
        startBtn.disabled = true;
        startBtn.textContent = '🔄 请求权限中…';
        statusBar.className  = 'status-warn';
        statusBar.textContent = '⏳ 正在请求相机权限…';
    
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
            audio: false
          });
          videoEl.srcObject = stream;
          enterCameraMode();
        } catch (err) {
          const msg = err.name === 'NotAllowedError'
            ? '❌ 相机权限被拒绝'
            : err.name === 'NotFoundError'
            ? '❌ 未找到相机设备'
            : `❌ 相机错误：${err.name}`;
          enterFallbackMode(msg + '，已切换备用模式');
        }
      }
    
      startBtn.addEventListener('click', tryCamera);
    
      // ── 自动尝试开启相机 ─────────────────────────────────────────────────────
      // 立即尝试，失败则进入备用模式
      (async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          enterFallbackMode('❌ 浏览器不支持相机 API，已切换备用模式');
          return;
        }
        await tryCamera();
      })();
    
      // ── 上传图片 ──────────────────────────────────────────────────────────────
      uploadBtn.addEventListener('click', () => uploadInput.click());
      fallbackPrev.addEventListener('click', () => { if (!cameraReady) uploadInput.click(); });
    
      uploadInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          uploadedSrc = ev.target.result;
          fallbackImg.src = uploadedSrc;
          fallbackImg.style.display = 'block';
          fallbackText.innerHTML = '已选择图片<br>点击快门生成拍立得';
          statusBar.className   = 'status-image';
          statusBar.textContent = '🖼 图片已选择，点快门生成拍立得';
          shutterBtn.disabled   = false;
        };
        reader.readAsDataURL(file);
        uploadInput.value = '';
      });
    
      // ── 拍照逻辑 ──────────────────────────────────────────────────────────────
      shutterBtn.addEventListener('click', () => {
        flash.classList.add('flash-on');
        setTimeout(() => flash.classList.remove('flash-on'), 120);
    
        let dataURL;
    
        if (cameraReady && stream) {
          // ① 有相机：截取视频帧
          const W = videoEl.videoWidth  || 640;
          const H = videoEl.videoHeight || 480;
          hiddenCanvas.width = W; hiddenCanvas.height = H;
          const ctx = hiddenCanvas.getContext('2d');
          ctx.save(); ctx.translate(W, 0); ctx.scale(-1, 1);
          ctx.drawImage(videoEl, 0, 0, W, H); ctx.restore();
          dataURL = hiddenCanvas.toDataURL('image/jpeg', 0.92);
    
        } else if (uploadedSrc) {
          // ② 无相机但有上传图片
          dataURL = uploadedSrc;
          // 用完即重置，下一张需要重新上传或用画板
          uploadedSrc = null;
          fallbackImg.style.display = 'none';
          fallbackText.innerHTML = '点击选择图片<br>或使用下方画板拍照';
          statusBar.className   = 'status-off';
          statusBar.textContent = '📵 无相机权限，已切换备用模式';
    
        } else {
          // ③ 使用画板内容
          dataURL = drawCanvas.toDataURL('image/png');
          // 清空画板准备下一张
          initDrawCanvas();
        }
    
        photoCount++;
        countEl.textContent = photoCount;
        emptyHint.style.display = 'none';
        spawnPolaroid(dataURL);
      });
    
      // ── 生成拍立得相纸 ────────────────────────────────────────────────────────
      function spawnPolaroid(src) {
        const wallW = wall.clientWidth;
        const wallH = Math.max(wall.scrollHeight, wall.clientHeight);
        const polaroidW = 220, polaroidH = 230, margin = 20;
        const posX = margin + Math.random() * Math.max(wallW - polaroidW - margin, margin);
        const posY = margin + Math.random() * Math.max(wallH - polaroidH - margin, margin);
        const rot  = (Math.random() * 24 - 12).toFixed(2);
    
        let label;
        if (photoCount <= presetLabels.length) {
          label = presetLabels[photoCount - 1];
        } else {
          const now = new Date();
          label = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')}  ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        }
    
        const card = document.createElement('div');
        card.className = 'pw-polaroid animate-in';
        card.style.cssText = `left:${posX}px;top:${posY}px;z-index:${++zCounter};--base-transform:rotate(${rot}deg);transform:rotate(${rot}deg);`;
        card.dataset.rot = rot;
    
        const tapeOff = (Math.random()*20-10).toFixed(1);
        const tapeRot = (Math.random()*6-3).toFixed(1);
        card.innerHTML = `
          <div class="pw-polaroid-tape" style="left:calc(50% + ${tapeOff}px);transform:translateX(-50%) rotate(${tapeRot}deg)"></div>
          <img src="${src}" alt="photo ${photoCount}" draggable="false">
          <div class="pw-polaroid-caption">${label}</div>
        `;
        wall.appendChild(card);
        card.addEventListener('animationend', () => card.classList.remove('animate-in'), { once: true });
    
        // 拖拽
        let dragging = false, startX, startY, origLeft, origTop;
        card.addEventListener('pointerdown', e => {
          if (e.button && e.button !== 0) return;
          dragging = true; card.setPointerCapture(e.pointerId);
          card.style.zIndex = ++zCounter; card.style.transition = 'none';
          origLeft = parseFloat(card.style.left); origTop = parseFloat(card.style.top);
          startX = e.clientX; startY = e.clientY;
        });
        card.addEventListener('pointermove', e => {
          if (!dragging) return;
          card.style.left = (origLeft + e.clientX - startX) + 'px';
          card.style.top  = (origTop  + e.clientY - startY) + 'px';
        });
        card.addEventListener('pointerup',     () => { dragging = false; });
        card.addEventListener('pointercancel', () => { dragging = false; });
        card.addEventListener('dblclick', () => {
          card.style.transition = 'opacity .3s, transform .3s';
          card.style.opacity = '0';
          card.style.transform = `rotate(${rot}deg) scale(.7)`;
          setTimeout(() => {
            card.remove(); photoCount--; countEl.textContent = photoCount;
            if (!wall.querySelector('.pw-polaroid')) emptyHint.style.display = 'flex';
          }, 300);
        });
    
        if (posY + polaroidH + 60 > wall.scrollHeight) {
          wall.style.minHeight = (posY + polaroidH + 60) + 'px';
        }
      }
    
      return {
        ok: true,
        summary: '拍立得照片墙注入成功！自动尝试相机权限，无权限时支持上传图片或画板涂鸦拍照。'
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();