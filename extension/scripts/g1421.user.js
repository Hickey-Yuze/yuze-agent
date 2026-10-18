(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // 注入完整的HTML/CSS/JS到页面中
      const style = document.createElement('style');
      style.textContent = `
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          background: rgba(0,0,0,0.4);
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
          overflow: hidden;
        }
    
        .popup-window {
          position: relative;
          width: 480px;
          height: 620px;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
          overflow: hidden;
          cursor: default;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
    
        .ad-layer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FF4444 100%);
          z-index: 10;
          transition: opacity 0.4s ease, transform 0.4s ease;
          display: flex;
          flex-direction: column;
        }
    
        .popup-window:hover .ad-layer {
          opacity: 0;
          transform: scale(1.05);
          pointer-events: none;
        }
    
        .ad-titlebar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: rgba(0,0,0,0.15);
        }
    
        .ad-titlebar-left { display: flex; align-items: center; gap: 8px; }
    
        .sogou-logo {
          width: 24px; height: 24px;
          background: #fff; border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: bold; color: #FF6B35;
        }
    
        .ad-titlebar-text { color: rgba(255,255,255,0.9); font-size: 13px; }
        .ad-titlebar-btns { display: flex; gap: 6px; }
    
        .titlebar-btn {
          width: 14px; height: 14px; border-radius: 50%;
          border: none; cursor: pointer; opacity: 0.7; transition: opacity 0.2s;
        }
        .titlebar-btn:hover { opacity: 1; }
        .btn-minimize { background: #FFBD2E; }
        .btn-close { background: #FF5F57; }
    
        .ad-content {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 30px; text-align: center; color: #fff;
        }
    
        .ad-badge {
          background: rgba(255,255,255,0.25); padding: 4px 16px;
          border-radius: 20px; font-size: 12px; margin-bottom: 16px; letter-spacing: 2px;
        }
    
        .ad-main-icon {
          width: 120px; height: 120px;
          background: rgba(255,255,255,0.2); border-radius: 28px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 24px;
          animation: float 3s ease-in-out infinite;
        }
    
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
    
        .ad-main-icon-inner { font-size: 56px; }
        .ad-headline { font-size: 28px; font-weight: bold; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .ad-subheadline { font-size: 15px; opacity: 0.9; margin-bottom: 28px; line-height: 1.6; }
    
        .ad-features { display: flex; gap: 16px; margin-bottom: 28px; }
    
        .ad-feature-item {
          background: rgba(255,255,255,0.18); padding: 12px 18px;
          border-radius: 12px; text-align: center; min-width: 90px;
        }
        .ad-feature-icon { font-size: 24px; margin-bottom: 4px; }
        .ad-feature-text { font-size: 11px; opacity: 0.9; }
    
        .ad-cta-btn {
          background: #fff; color: #FF6B35; border: none;
          padding: 12px 48px; border-radius: 25px; font-size: 16px;
          font-weight: bold; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }
        .ad-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
    
        .ad-footer {
          padding: 10px; text-align: center; font-size: 11px;
          color: rgba(255,255,255,0.5); background: rgba(0,0,0,0.1);
        }
        .ad-footer a { color: rgba(255,255,255,0.6); text-decoration: none; }
    
        .game-layer {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, #1a0a2e 0%, #16213e 50%, #0f3460 100%);
          z-index: 5; display: flex; flex-direction: column;
        }
    
        .game-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; background: rgba(0,0,0,0.3); color: #fff;
        }
    
        .game-score-area { display: flex; align-items: center; gap: 12px; }
        .game-score-label { font-size: 13px; opacity: 0.8; }
        .game-score-value {
          font-size: 22px; font-weight: bold; color: #FFD700;
          text-shadow: 0 0 10px rgba(255,215,0,0.5);
        }
    
        .game-lives { display: flex; gap: 4px; }
        .life-icon { font-size: 18px; transition: opacity 0.3s; }
        .life-icon.lost { opacity: 0.2; }
    
        .game-canvas-wrap { flex: 1; position: relative; overflow: hidden; }
        #gameCanvas { display: block; width: 100%; height: 100%; touch-action: none; }
    
        .game-overlay-msg {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%); color: #fff; font-size: 32px;
          font-weight: bold; text-align: center;
          text-shadow: 0 2px 10px rgba(0,0,0,0.8);
          pointer-events: none; opacity: 0; transition: opacity 0.3s; z-index: 20;
        }
        .game-overlay-msg.visible { opacity: 1; }
    
        .game-hint {
          position: absolute; bottom: 10px; left: 50%;
          transform: translateX(-50%); color: rgba(255,255,255,0.4);
          font-size: 11px; white-space: nowrap;
        }
    
        .score-popup {
          position: absolute; pointer-events: none; font-weight: bold;
          font-size: 22px; color: #FFD700;
          text-shadow: 0 0 6px rgba(255,215,0,0.8), 0 2px 4px rgba(0,0,0,0.5);
          z-index: 18; animation: scoreFloat 0.8s ease-out forwards;
        }
    
        @keyframes scoreFloat {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.3); }
        }
    
        .combo-display {
          position: absolute; top: 60px; left: 50%;
          transform: translateX(-50%); color: #FF6B35; font-size: 18px;
          font-weight: bold; text-shadow: 0 0 10px rgba(255,107,53,0.8);
          opacity: 0; transition: opacity 0.3s; z-index: 19; pointer-events: none;
        }
        .combo-display.visible { opacity: 1; }
      `;
      document.head.appendChild(style);
    
      const container = document.createElement('div');
      container.innerHTML = `
    <div class="popup-window" id="popupWindow">
      <div class="ad-layer" id="adLayer">
        <div class="ad-titlebar">
          <div class="ad-titlebar-left">
            <div class="sogou-logo">搜</div>
            <span class="ad-titlebar-text">搜狗输入法推广</span>
          </div>
          <div class="ad-titlebar-btns">
            <button class="titlebar-btn btn-minimize" title="最小化"></button>
            <button class="titlebar-btn btn-close" title="关闭"></button>
          </div>
        </div>
        <div class="ad-content">
          <div class="ad-badge">🔥 全新版本 · 免费下载</div>
          <div class="ad-main-icon"><span class="ad-main-icon-inner">🍉</span></div>
          <div class="ad-headline">搜狗输入法</div>
          <div class="ad-subheadline">智能输入 · 更懂你<br>AI联想 · 秒速打字</div>
          <div class="ad-features">
            <div class="ad-feature-item"><div class="ad-feature-icon">🧠</div><div class="ad-feature-text">AI智能<br>联想</div></div>
            <div class="ad-feature-item"><div class="ad-feature-icon">⚡</div><div class="ad-feature-text">秒速<br>出字</div></div>
            <div class="ad-feature-item"><div class="ad-feature-icon">🎨</div><div class="ad-feature-text">海量<br>皮肤</div></div>
          </div>
          <button class="ad-cta-btn" id="adCtaBtn">立即下载</button>
        </div>
        <div class="ad-footer"><a href="#">广告政策</a> · <a href="#">隐私条款</a> · 搜狗公司 ©2026</div>
      </div>
    
      <div class="game-layer" id="gameLayer">
        <div class="game-header">
          <div class="game-score-area">
            <span class="game-score-label">得分</span>
            <span class="game-score-value" id="scoreDisplay">0</span>
          </div>
          <div class="game-lives" id="livesDisplay">
            <span class="life-icon">❤️</span><span class="life-icon">❤️</span><span class="life-icon">❤️</span>
          </div>
        </div>
        <div class="game-canvas-wrap" id="canvasWrap">
          <canvas id="gameCanvas"></canvas>
          <div class="game-overlay-msg" id="overlayMsg"></div>
          <div class="combo-display" id="comboDisplay"></div>
          <div class="game-hint">💡 鼠标移开回到广告 | 切水果得分，漏掉或切到炸弹扣命</div>
        </div>
      </div>
    </div>`;
      document.body.appendChild(container);
    
      // 绑定关闭按钮
      container.querySelector('.btn-close').addEventListener('click', () => {
        document.getElementById('popupWindow').style.display = 'none';
      });
      container.querySelector('#adCtaBtn').addEventListener('click', () => {
        alert('感谢关注！把鼠标放上来试试 👀');
      });
    
      // ========== 游戏核心逻辑 ==========
      const canvas = document.getElementById('gameCanvas');
      const ctx = canvas.getContext('2d');
      const wrap = document.getElementById('canvasWrap');
      const scoreEl = document.getElementById('scoreDisplay');
      const livesEl = document.getElementById('livesDisplay');
      const overlayMsg = document.getElementById('overlayMsg');
      const comboEl = document.getElementById('comboDisplay');
    
      let W, H, score = 0, lives = 3, gameOver = false, gameStarted = false;
      let fruits = [], slicedPieces = [], particles = [], slashPoints = [];
      let isSlashing = false, combo = 0, comboTimer = null, lastSliceTime = 0;
      let spawnTimer = null, animFrameId = null;
    
      const FRUIT_TYPES = [
        { emoji: '🍉', name: 'watermelon', radius: 42, points: 10, color: '#FF6B6B' },
        { emoji: '🍊', name: 'orange', radius: 36, points: 15, color: '#FFA500' },
        { emoji: '🍋', name: 'lemon', radius: 32, points: 15, color: '#FFE135' },
        { emoji: '🍎', name: 'apple', radius: 34, points: 10, color: '#FF4444' },
        { emoji: '🥝', name: 'kiwi', radius: 30, points: 20, color: '#8BC34A' },
        { emoji: '🍇', name: 'grape', radius: 28, points: 20, color: '#9C27B0' },
        { emoji: '🍑', name: 'peach', radius: 36, points: 15, color: '#FFB6C1' },
        { emoji: '🥭', name: 'mango', radius: 38, points: 15, color: '#FF8C00' },
      ];
      const BOMB_TYPE = { emoji: '💣', name: 'bomb', radius: 34, points: -50, isBomb: true, color: '#333' };
    
      function resize() {
        const rect = wrap.getBoundingClientRect();
        W = canvas.width = rect.width * devicePixelRatio;
        H = canvas.height = rect.height * devicePixelRatio;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      }
    
      function spawnFruit() {
        if (gameOver) return;
        const sw = wrap.clientWidth, sh = wrap.clientHeight;
        const isBomb = Math.random() < 0.15;
        const type = isBomb ? BOMB_TYPE : FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
        const startX = Math.random() * (sw - type.radius * 2) + type.radius;
        const destX = startX + (Math.random() - 0.5) * 150;
        const vx = (destX - startX) / 60;
        const vy = -(Math.random() * 6 + 10);
        fruits.push({ x: startX, y: sh + type.radius, vx, vy, gravity: 0.28, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.15, type, sliced: false, scale: 1, alpha: 1 });
      }
    
      function drawFruit(f) {
        ctx.save();
        ctx.globalAlpha = f.alpha;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rotation);
        ctx.scale(f.scale, f.scale);
        ctx.font = `${f.type.radius * 1.6}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.type.emoji, 0, 2);
        ctx.restore();
      }
    
      function drawSlicedPiece(p) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(p.scale, p.scale);
        ctx.fillStyle = p.type.color;
        ctx.beginPath();
        ctx.arc(p.sliceDir === 'left' ? -4 : 4, 2, p.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.font = `${p.radius * 1.4}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type.emoji, p.sliceDir === 'left' ? -6 : 6, 2);
        ctx.restore();
      }
    
      function drawParticle(p) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    
      function drawSlashTrail() {
        if (slashPoints.length < 2) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = 'rgba(255,200,100,0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(slashPoints[0].x, slashPoints[0].y);
        for (let i = 1; i < slashPoints.length; i++) ctx.lineTo(slashPoints[i].x, slashPoints[i].y);
        ctx.stroke();
        for (let i = 0; i < slashPoints.length; i++) {
          ctx.fillStyle = `rgba(255,240,200,${i / slashPoints.length * 0.5})`;
          ctx.beginPath();
          ctx.arc(slashPoints[i].x, slashPoints[i].y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    
      function createSlicedPieces(fruit) {
        const t = fruit.type;
        slicedPieces.push({ x: fruit.x - 8, y: fruit.y, vx: fruit.vx - 3, vy: fruit.vy - 2, rotation: fruit.rotation, rotationSpeed: -0.15, radius: t.radius, type: t, sliceDir: 'left', scale: 1, alpha: 1 });
        slicedPieces.push({ x: fruit.x + 8, y: fruit.y, vx: fruit.vx + 3, vy: fruit.vy - 2, rotation: fruit.rotation, rotationSpeed: 0.15, radius: t.radius, type: t, sliceDir: 'right', scale: 1, alpha: 1 });
      }
    
      function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 2;
          particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2, size: Math.random() * 5 + 2, color, alpha: 1, decay: Math.random() * 0.03 + 0.02 });
        }
      }
    
      function showScorePopup(x, y, pts) {
        const el = document.createElement('div');
        el.className = 'score-popup';
        el.textContent = pts > 0 ? `+${pts}` : String(pts);
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        if (pts < 0) el.style.color = '#FF4444';
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 800);
      }
    
      function updateCombo() {
        combo++;
        if (combo >= 2) { comboEl.textContent = `${combo}连击! 🔥`; comboEl.classList.add('visible'); }
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => { combo = 0; comboEl.classList.remove('visible'); }, 1200);
      }
    
      function loseLife() {
        lives--;
        updateLivesDisplay();
        if (lives <= 0) endGame();
      }
    
      function updateLivesDisplay() {
        const hearts = livesEl.querySelectorAll('.life-icon');
        hearts.forEach((h, i) => h.classList.toggle('lost', i >= lives));
      }
    
      function pointInCircle(px, py, cx, cy, r) {
        return (px - cx) ** 2 + (py - cy) ** 2 <= r ** 2;
      }
    
      function lineIntersectsCircle(x1, y1, x2, y2, cx, cy, r) {
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return pointInCircle(x1, y1, cx, cy, r);
        let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return pointInCircle(x1 + t * dx, y1 + t * dy, cx, cy, r);
      }
    
      function processSlash() {
        if (slashPoints.length < 2) return;
        const now = Date.now();
        fruits.forEach((f) => {
          if (f.sliced) return;
          let hit = false;
          for (let i = 1; i < slashPoints.length && !hit; i++) {
            hit = lineIntersectsCircle(slashPoints[i - 1].x, slashPoints[i - 1].y, slashPoints[i].x, slashPoints[i].y, f.x, f.y, f.type.radius);
          }
          if (hit) {
            f.sliced = true; f.alpha = 0;
            if (f.type.isBomb) {
              createParticles(f.x, f.y, '#FF4444', 20);
              createParticles(f.x, f.y, '#FFD700', 15);
              showScorePopup(f.x, f.y, f.type.points);
              score = Math.max(0, score + f.type.points);
              scoreEl.textContent = score;
              loseLife(); combo = 0; comboEl.classList.remove('visible');
              wrap.animate([ {transform:'translateX(5px)'}, {transform:'translateX(-5px)'}, {transform:'translateX(3px)'}, {transform:'translateX(-2px)'}, {transform:''} ], {duration:250});
            } else {
              createSlicedPieces(f);
              createParticles(f.x, f.y, f.type.color, 12);
              const comboBonus = Math.floor(combo * 0.5);
              const totalPts = f.type.points + comboBonus;
              showScorePopup(f.x, f.y, totalPts);
              score += totalPts;
              scoreEl.textContent = score;
              if (now - lastSliceTime < 600) updateCombo();
              else combo = 1;
              lastSliceTime = now;
            }
          }
        });
        fruits = fruits.filter(f => !f.sliced);
      }
    
      function update() {
        const sw = wrap.clientWidth, sh = wrap.clientHeight;
        fruits.forEach(f => { f.x += f.vx; f.vy += f.gravity; f.y += f.vy; f.rotation += f.rotationSpeed; });
        const escaped = fruits.filter(f => f.y > sh + f.type.radius * 2 && !f.type.isBomb);
        escaped.forEach(f => { if (!f.sliced) { loseLife(); f.sliced = true; } });
        fruits = fruits.filter(f => f.y <= sh + f.type.radius * 2 + 20);
        slicedPieces.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.35; p.rotation += p.rotationSpeed; p.alpha -= 0.018; p.scale *= 0.98; });
        slicedPieces = slicedPieces.filter(p => p.alpha > 0);
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.alpha -= p.decay; p.size *= 0.96; });
        particles = particles.filter(p => p.alpha > 0);
        if (!isSlashing && slashPoints.length > 0) slashPoints.shift();
      }
    
      function render() {
        const sw = wrap.clientWidth, sh = wrap.clientHeight;
        ctx.clearRect(0, 0, sw, sh);
        const grad = ctx.createLinearGradient(0, sh - 80, 0, sh);
        grad.addColorStop(0, 'rgba(139,90,43,0)');
        grad.addColorStop(1, 'rgba(139,90,43,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, sh - 80, sw, 80);
        fruits.forEach(drawFruit);
        slicedPieces.forEach(drawSlicedPiece);
        particles.forEach(drawParticle);
        drawSlashTrail();
      }
    
      function gameLoop() {
        if (gameOver) return;
        update();
        render();
        animFrameId = requestAnimationFrame(gameLoop);
      }
    
      function startGame() {
        if (gameStarted && !gameOver) return;
        score = 0; lives = 3; gameOver = false; gameStarted = true;
        fruits = []; slicedPieces = []; particles = []; slashPoints = []; combo = 0;
        scoreEl.textContent = '0'; updateLivesDisplay();
        overlayMsg.classList.remove('visible'); overlayMsg.textContent = '';
        clearInterval(spawnTimer);
        spawnTimer = setInterval(() => {
          if (!gameOver) { spawnFruit(); if (Math.random() > 0.5) setTimeout(spawnFruit, 150); }
        }, 1100);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        gameLoop();
      }
    
      function endGame() {
        gameOver = true;
        clearInterval(spawnTimer);
        overlayMsg.textContent = `游戏结束!\n最终得分: ${score}`;
        overlayMsg.classList.add('visible');
        setTimeout(() => { if (gameOver) overlayMsg.textContent = '点击任意处重新开始'; }, 2000);
      }
    
      function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX ?? (e.touches?.[0]?.clientX ?? 0);
        const cy = e.clientY ?? (e.touches?.[0]?.clientY ?? 0);
        return { x: cx - rect.left, y: cy - rect.top };
      }
    
      canvas.addEventListener('mousedown', (e) => { if (gameOver) { startGame(); return; } isSlashing = true; slashPoints = [getPos(e)]; });
      canvas.addEventListener('mousemove', (e) => { if (!isSlashing || gameOver) return; const pos = getPos(e); slashPoints.push(pos); if (slashPoints.length > 15) slashPoints.shift(); processSlash(); });
      canvas.addEventListener('mouseup', () => { isSlashing = false; processSlash(); });
      canvas.addEventListener('mouseleave', () => { isSlashing = false; });
      canvas.addEventListener('touchstart', (e) => { e.preventDefault(); if (gameOver) { startGame(); return; } isSlashing = true; slashPoints = [getPos(e)]; }, { passive: false });
      canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!isSlashing || gameOver) return; const pos = getPos(e); slashPoints.push(pos); if (slashPoints.length > 15) slashPoints.shift(); processSlash(); }, { passive: false });
      canvas.addEventListener('touchend', () => { isSlashing = false; processSlash(); });
      canvas.addEventListener('click', () => { if (gameOver) startGame(); });
    
      window.addEventListener('resize', resize);
      resize();
    
      overlayMsg.textContent = '🍉 切水果\n点击开始游戏';
      overlayMsg.classList.add('visible');
    
      let enteredGame = false;
      document.getElementById('gameLayer').addEventListener('mouseenter', () => {
        if (!enteredGame && !gameStarted) { enteredGame = true; setTimeout(startGame, 400); }
      });
    
      return { ok: true, summary: '切水果小游戏已成功注入页面！表面是搜狗输入法广告弹窗，鼠标悬停后显示游戏。', data: { features: ['广告伪装层（搜狗输入法风格）', '鼠标悬停切换到游戏层', '8种水果+炸弹', '刀光轨迹效果', '果汁粒子特效', '连击系统', '生命值系统'] } };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();