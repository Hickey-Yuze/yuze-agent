(function() {
  if (document.getElementById('whack-a-mole-game')) return;

  const style = document.createElement('style');
  style.textContent = `
    #whack-a-mole-game * {
      margin: 0; padding: 0; box-sizing: border-box;
      user-select: none; -webkit-user-select: none;
    }
    #whack-a-mole-game {
      position: fixed; inset: 0; z-index: 999999;
      background: linear-gradient(180deg, #87CEEB 0%, #98D8C8 40%, #7EC850 40%, #5DAA3A 100%);
      display: flex; flex-direction: column; align-items: center;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      overflow: hidden;
    }
    .wam-close {
      position: absolute; top: 16px; right: 16px;
      width: 40px; height: 40px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.6); background: rgba(0,0,0,0.2);
      color: #fff; font-size: 20px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s; z-index: 10;
    }
    .wam-close:hover { background: rgba(0,0,0,0.4); transform: scale(1.1); }

    .wam-header {
      text-align: center; padding: 24px 20px 12px; color: #fff;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .wam-title {
      font-size: 42px; font-weight: 900; letter-spacing: 2px;
      background: linear-gradient(135deg, #FFD700, #FF8C00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; filter: drop-shadow(2px 3px 2px rgba(0,0,0,0.3));
    }
    .wam-stats {
      display: flex; gap: 24px; justify-content: center;
      margin-top: 12px; flex-wrap: wrap;
    }
    .wam-stat {
      background: rgba(0,0,0,0.25); border-radius: 16px;
      padding: 8px 20px; min-width: 100px; text-align: center;
      border: 2px solid rgba(255,255,255,0.2);
      backdrop-filter: blur(8px);
    }
    .wam-stat-label { font-size: 12px; opacity: 0.8; margin-bottom: 2px; }
    .wam-stat-value { font-size: 28px; font-weight: 800; }
    .wam-stat-value.time { color: #FF6B6B; }
    .wam-stat-value.score { color: #FFD700; }
    .wam-stat-value.combo { color: #7BFFB5; }

    .wam-board {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 16px; padding: 20px; margin-top: 16px;
      max-width: 460px; width: 90vw;
    }
    .wam-hole {
      position: relative; width: 100%; aspect-ratio: 1;
      cursor: pointer; display: flex; align-items: flex-end;
      justify-content: center;
    }
    .wam-hole-ground {
      position: absolute; bottom: 0; left: 5%; right: 5%;
      height: 42%; background: radial-gradient(ellipse at center, #5D3A1A 0%, #3E2510 100%);
      border-radius: 50%; z-index: 2;
      box-shadow: inset 0 -4px 8px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.3);
    }
    .wam-hole-inner {
      position: absolute; bottom: 12%; left: 15%; right: 15%;
      height: 30%; background: radial-gradient(ellipse, #1a0a00 0%, #2d1500 100%);
      border-radius: 50%; z-index: 1;
    }
    .wam-mole-container {
      position: absolute; bottom: 12%; left: 10%; right: 10%;
      height: 65%; overflow: hidden; z-index: 1;
    }
    .wam-mole {
      position: absolute; bottom: -100%; left: 50%;
      transform: translateX(-50%);
      width: 80%; height: 80%;
      transition: bottom 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
      display: flex; align-items: center; justify-content: center;
      font-size: 52px; line-height: 1;
    }
    .wam-mole.active { bottom: 10%; }
    .wam-mole.hit {
      bottom: 10%;
      animation: wam-hit 0.3s ease-out;
    }

    @keyframes wam-hit {
      0% { transform: translateX(-50%) scale(1); }
      25% { transform: translateX(-50%) scale(1.3) rotate(-15deg); }
      50% { transform: translateX(-50%) scale(0.8) rotate(10deg); }
      100% { transform: translateX(-50%) scale(0) translateY(30px); opacity: 0; }
    }

    .wam-score-popup {
      position: absolute; z-index: 20; font-size: 24px; font-weight: 900;
      color: #FFD700; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
      pointer-events: none;
      animation: wam-popup 0.8s ease-out forwards;
    }
    @keyframes wam-popup {
      0% { opacity: 1; transform: translateY(0) scale(1); }
      100% { opacity: 0; transform: translateY(-60px) scale(1.5); }
    }

    .wam-hammer {
      position: fixed; z-index: 9999999; pointer-events: none;
      font-size: 48px; transform-origin: bottom right;
      transition: transform 0.08s ease;
      display: none;
    }
    .wam-hammer.smash { transform: rotate(-40deg) scale(1.2); }

    .wam-overlay {
      position: absolute; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #fff; text-align: center;
    }
    .wam-overlay.hidden { display: none; }
    .wam-overlay h2 {
      font-size: 48px; font-weight: 900; margin-bottom: 8px;
      background: linear-gradient(135deg, #FFD700, #FF8C00);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .wam-overlay p { font-size: 18px; opacity: 0.8; margin-bottom: 4px; }
    .wam-final-score { font-size: 64px; font-weight: 900; color: #FFD700; margin: 12px 0; }
    .wam-btn {
      margin-top: 20px; padding: 14px 48px;
      font-size: 20px; font-weight: 700; border: none;
      border-radius: 50px; cursor: pointer;
      background: linear-gradient(135deg, #FF8C00, #FF6347);
      color: #fff; box-shadow: 0 6px 20px rgba(255,99,71,0.5);
      transition: all 0.2s; letter-spacing: 1px;
    }
    .wam-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(255,99,71,0.6); }
    .wam-btn:active { transform: translateY(0); }

    .wam-clouds {
      position: absolute; top: 0; left: 0; right: 0; height: 38%;
      pointer-events: none; overflow: hidden; z-index: 0;
    }
    .wam-cloud {
      position: absolute; background: rgba(255,255,255,0.7);
      border-radius: 50px; filter: blur(1px);
    }
    .wam-grass {
      position: absolute; bottom: 0; left: 0; right: 0;
      height: 65%; pointer-events: none; z-index: 0;
      background: linear-gradient(180deg, transparent 0%, rgba(93,170,58,0.3) 100%);
    }

    .wam-difficulty {
      font-size: 14px; opacity: 0.7; margin-top: 6px; color: #fff;
    }

    .wam-star { display: inline-block; animation: wam-star 0.5s ease-out; }
    @keyframes wam-star {
      0% { transform: scale(0) rotate(0deg); }
      50% { transform: scale(1.3) rotate(180deg); }
      100% { transform: scale(1) rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  const game = document.createElement('div');
  game.id = 'whack-a-mole-game';
  game.innerHTML = `
    <div class="wam-clouds">
      <div class="wam-cloud" style="width:120px;height:40px;top:15%;left:10%;"></div>
      <div class="wam-cloud" style="width:80px;height:30px;top:8%;left:50%;"></div>
      <div class="wam-cloud" style="width:100px;height:35px;top:22%;left:75%;"></div>
      <div class="wam-cloud" style="width:60px;height:22px;top:5%;left:30%;"></div>
    </div>
    <div class="wam-grass"></div>
    <button class="wam-close" title="关闭游戏">✕</button>
    <div class="wam-header">
      <div class="wam-title">🔨 打地鼠</div>
      <div class="wam-stats">
        <div class="wam-stat">
          <div class="wam-stat-label">⏱️ 时间</div>
          <div class="wam-stat-value time" id="wam-time">30</div>
        </div>
        <div class="wam-stat">
          <div class="wam-stat-label">⭐ 得分</div>
          <div class="wam-stat-value score" id="wam-score">0</div>
        </div>
        <div class="wam-stat">
          <div class="wam-stat-label">🔥 连击</div>
          <div class="wam-stat-value combo" id="wam-combo">0</div>
        </div>
      </div>
      <div class="wam-difficulty" id="wam-difficulty">难度: ⭐</div>
    </div>
    <div class="wam-board" id="wam-board"></div>
    <div class="wam-overlay" id="wam-start-overlay">
      <h2>🔨 打地鼠</h2>
      <p>在30秒内尽可能多地击打地鼠！</p>
      <p style="font-size:14px;opacity:0.6;margin-top:8px;">连击越多分数越高</p>
      <button class="wam-btn" id="wam-start-btn">开始游戏</button>
    </div>
    <div class="wam-overlay hidden" id="wam-end-overlay">
      <h2>游戏结束！</h2>
      <p>最终得分</p>
      <div class="wam-final-score" id="wam-final-score">0</div>
      <p id="wam-stars"></p>
      <p id="wam-result-text"></p>
      <button class="wam-btn" id="wam-restart-btn">再来一局</button>
    </div>
    <div class="wam-hammer" id="wam-hammer">🔨</div>
  `;
  document.body.appendChild(game);

  // Game state
  let score = 0, combo = 0, maxCombo = 0, timeLeft = 30;
  let gameRunning = false, gameTimer = null, moleTimers = [];
  let difficulty = 1, hitCount = 0, missCount = 0;

  const board = document.getElementById('wam-board');
  const timeEl = document.getElementById('wam-time');
  const scoreEl = document.getElementById('wam-score');
  const comboEl = document.getElementById('wam-combo');
  const diffEl = document.getElementById('wam-difficulty');
  const startOverlay = document.getElementById('wam-start-overlay');
  const endOverlay = document.getElementById('wam-end-overlay');
  const finalScoreEl = document.getElementById('wam-final-score');
  const starsEl = document.getElementById('wam-stars');
  const resultTextEl = document.getElementById('wam-result-text');
  const hammerEl = document.getElementById('wam-hammer');

  const moles = ['🐹', '🐭', '🐿️', '🐰'];
  const goldenMole = '👑';

  // Create holes
  for (let i = 0; i < 9; i++) {
    const hole = document.createElement('div');
    hole.className = 'wam-hole';
    hole.dataset.index = i;
    hole.innerHTML = `
      <div class="wam-hole-inner"></div>
      <div class="wam-mole-container">
        <div class="wam-mole" data-index="${i}">${moles[0]}</div>
      </div>
      <div class="wam-hole-ground"></div>
    `;
    hole.addEventListener('click', (e) => whackMole(i, e));
    hole.addEventListener('touchstart', (e) => { e.preventDefault(); whackMole(i, e); }, { passive: false });
    board.appendChild(hole);
  }

  // Hammer cursor
  document.addEventListener('mousemove', (e) => {
    if (!gameRunning) return;
    hammerEl.style.display = 'block';
    hammerEl.style.left = e.clientX - 10 + 'px';
    hammerEl.style.top = e.clientY - 30 + 'px';
  });
  document.addEventListener('mousedown', () => {
    if (!gameRunning) return;
    hammerEl.classList.add('smash');
  });
  document.addEventListener('mouseup', () => {
    hammerEl.classList.remove('smash');
  });

  // Close button
  game.querySelector('.wam-close').addEventListener('click', () => {
    cleanup();
    game.remove();
    style.remove();
  });

  // Start button
  document.getElementById('wam-start-btn').addEventListener('click', startGame);
  document.getElementById('wam-restart-btn').addEventListener('click', startGame);

  function startGame() {
    score = 0; combo = 0; maxCombo = 0; timeLeft = 30;
    difficulty = 1; hitCount = 0; missCount = 0;
    gameRunning = true;
    updateUI();
    startOverlay.classList.add('hidden');
    endOverlay.classList.add('hidden');

    gameTimer = setInterval(() => {
      timeLeft--;
      timeEl.textContent = timeLeft;
      if (timeLeft <= 5) timeEl.style.animation = 'wam-popup 0.5s ease-out';
      if (timeLeft <= 0) endGame();
      // Increase difficulty
      if (timeLeft <= 20) difficulty = 2;
      if (timeLeft <= 12) difficulty = 3;
      if (timeLeft <= 6) difficulty = 4;
      diffEl.textContent = '难度: ' + '⭐'.repeat(difficulty);
    }, 1000);

    spawnMoles();
  }

  function spawnMoles() {
    if (!gameRunning) return;
    clearMoleTimers();

    const baseInterval = Math.max(400, 1200 - difficulty * 180);
    const showTime = Math.max(500, 1500 - difficulty * 200);
    const maxActive = Math.min(1 + Math.floor(difficulty / 2), 4);

    const spawn = () => {
      if (!gameRunning) return;
      const activeMoles = board.querySelectorAll('.wam-mole.active');
      if (activeMoles.length < maxActive) {
        const inactiveIndices = [];
        for (let i = 0; i < 9; i++) {
          const mole = board.querySelector(`.wam-mole[data-index="${i}"]`);
          if (!mole.classList.contains('active') && !mole.classList.contains('hit')) {
            inactiveIndices.push(i);
          }
        }
        if (inactiveIndices.length > 0) {
          const idx = inactiveIndices[Math.floor(Math.random() * inactiveIndices.length)];
          const mole = board.querySelector(`.wam-mole[data-index="${idx}"]`);
          const isGolden = Math.random() < 0.08;
          mole.textContent = isGolden ? goldenMole : moles[Math.floor(Math.random() * moles.length)];
          mole.dataset.golden = isGolden ? '1' : '0';
          mole.classList.add('active');
          mole.classList.remove('hit');
          mole.style.opacity = '1';

          const hideTimer = setTimeout(() => {
            if (mole.classList.contains('active') && !mole.classList.contains('hit')) {
              mole.classList.remove('active');
              if (gameRunning) {
                combo = 0;
                missCount++;
                updateUI();
              }
            }
          }, showTime + Math.random() * 400);
          moleTimers.push(hideTimer);
        }
      }
      const nextSpawn = setTimeout(spawn, baseInterval + Math.random() * 500);
      moleTimers.push(nextSpawn);
    };

    const startDelay = setTimeout(spawn, 300);
    moleTimers.push(startDelay);
  }

  function whackMole(index, e) {
    if (!gameRunning) return;
    const mole = board.querySelector(`.wam-mole[data-index="${index}"]`);
    if (!mole || !mole.classList.contains('active') || mole.classList.contains('hit')) return;

    mole.classList.add('hit');
    mole.classList.remove('active');

    const isGolden = mole.dataset.golden === '1';
    combo++;
    hitCount++;
    if (combo > maxCombo) maxCombo = combo;

    const comboBonus = Math.floor(combo / 3);
    const basePoints = isGolden ? 5 : 1;
    const points = basePoints + comboBonus;
    score += points;
    updateUI();

    // Score popup
    const hole = mole.closest('.wam-hole');
    const popup = document.createElement('div');
    popup.className = 'wam-score-popup';
    popup.textContent = `+${points}` + (isGolden ? ' 👑' : '') + (comboBonus > 0 ? ` 🔥x${combo}` : '');
    popup.style.left = '50%';
    popup.style.top = '20%';
    popup.style.transform = 'translateX(-50%)';
    if (isGolden) { popup.style.fontSize = '32px'; popup.style.color = '#FF6B6B'; }
    hole.appendChild(popup);
    setTimeout(() => popup.remove(), 800);
  }

  function updateUI() {
    scoreEl.textContent = score;
    comboEl.textContent = combo;
    comboEl.style.color = combo >= 5 ? '#FF6B6B' : combo >= 3 ? '#FFD700' : '#7BFFB5';
  }

  function endGame() {
    gameRunning = false;
    clearInterval(gameTimer);
    clearMoleTimers();
    hammerEl.style.display = 'none';

    board.querySelectorAll('.wam-mole').forEach(m => {
      m.classList.remove('active', 'hit');
    });

    finalScoreEl.textContent = score;

    const starCount = score >= 50 ? 5 : score >= 35 ? 4 : score >= 20 ? 3 : score >= 10 ? 2 : 1;
    starsEl.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const span = document.createElement('span');
      span.className = 'wam-star';
      span.textContent = i < starCount ? '⭐' : '☆';
      span.style.animationDelay = i * 0.1 + 's';
      starsEl.appendChild(span);
    }

    const texts = ['还需努力！', '初出茅庐！', '身手不错！', '地鼠克星！', '打鼠大师！', '传说级别！'];
    resultTextEl.textContent = texts[starCount] + ` 最高连击: ${maxCombo}`;

    endOverlay.classList.remove('hidden');
  }

  function clearMoleTimers() {
    moleTimers.forEach(t => clearTimeout(t));
    moleTimers = [];
  }

  function cleanup() {
    gameRunning = false;
    clearInterval(gameTimer);
    clearMoleTimers();
  }
})();