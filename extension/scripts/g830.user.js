// 番茄闹钟 - 全局容器完全修复版
(function() {
  // 清理旧版本
  const oldContainer = document.getElementById('global-pomodoro-container');
  if (oldContainer) oldContainer.remove();
  
  // 创建全局容器
  const container = document.createElement('div');
  container.id = 'global-pomodoro-container';
  container.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    width: 300px !important;
    height: auto !important;
    z-index: 2147483647 !important;
    background: #1a1a2e !important;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    user-select: none !important;
    border-radius: 20px !important;
    overflow: hidden !important;
    box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06) !important;
    display: flex !important;
    flex-direction: column !important;
  `;
  
  // 创建拖拽条
  const dragBar = document.createElement('div');
  dragBar.style.cssText = `
    height: 40px !important;
    background: rgba(26, 26, 46, 0.95) !important;
    color: rgba(255,255,255,0.7) !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 0 16px !important;
    cursor: move !important;
    border-bottom: 1px solid rgba(255,255,255,0.1) !important;
    flex-shrink: 0 !important;
  `;
  
  dragBar.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;">
      <span>🍅</span>
      <span>番茄闹钟</span>
    </div>
    <div style="display: flex; gap: 4px;">
      <button id="pomo-global-minimize" style="
        width: 28px; height: 28px;
        border: none; background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.5);
        border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        transition: all 0.2s;
      " title="最小化">−</button>
      <button id="pomo-global-close" style="
        width: 28px; height: 28px;
        border: none; background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.5);
        border-radius: 8px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px;
        transition: all 0.2s;
      " title="关闭">✕</button>
    </div>
  `;
  
  // 创建内容区域
  const contentArea = document.createElement('div');
  contentArea.id = 'pomo-content-area';
  contentArea.style.cssText = `
    flex: 1 !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    #pomo-content-area * { box-sizing: border-box; margin: 0; padding: 0; }
    
    .pomo-panel {
      width: 100%;
      background: #1a1a2e;
      display: flex;
      flex-direction: column;
      flex: 1;
      padding-bottom: 0 !important;
    }
    
    .pomo-modes {
      display: flex;
      padding: 16px 16px 0;
      gap: 4px;
    }
    .pomo-mode {
      flex: 1;
      padding: 7px 0;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.4);
      font-size: 11px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.25s;
    }
    .pomo-mode.active { background: rgba(255,255,255,0.1); color: #fff; }
    
    .pomo-timer-area {
      display: flex;
      justify-content: center;
      padding: 20px 0 6px;
      position: relative;
    }
    .pomo-ring-container { position: relative; width: 180px; height: 180px; }
    .pomo-ring-svg { width: 180px; height: 180px; transform: rotate(-90deg); }
    .pomo-ring-bg { fill: none; stroke: rgba(255,255,255,0.05); stroke-width: 6; }
    .pomo-ring-progress { fill: none; stroke-width: 6; stroke-linecap: round; transition: stroke-dashoffset 0.5s linear, stroke 0.4s; }
    .pomo-ring-glow { fill: none; stroke-width: 12; stroke-linecap: round; opacity: 0.15; filter: blur(4px); transition: stroke-dashoffset 0.5s linear, stroke 0.4s; }
    .pomo-time-display { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
    .pomo-time { font-size: 42px; font-weight: 200; color: #fff; letter-spacing: 2px; font-variant-numeric: tabular-nums; line-height: 1; }
    .pomo-label { font-size: 11px; color: rgba(255,255,255,0.35); margin-top: 6px; letter-spacing: 1px; text-transform: uppercase; }
    
    .pomo-controls {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 8px 0 16px;
    }
    .pomo-btn { border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.25s; }
    .pomo-btn-main { width: 52px; height: 52px; background: linear-gradient(135deg, #e74c3c, #c0392b); box-shadow: 0 4px 20px rgba(231,76,60,0.4); }
    .pomo-btn-main.running { background: linear-gradient(135deg, #f39c12, #e67e22); box-shadow: 0 4px 20px rgba(243,156,18,0.4); }
    .pomo-btn-main:hover { transform: scale(1.08); }
    .pomo-btn-main svg { fill: #fff; }
    .pomo-btn-sec { width: 40px; height: 40px; background: rgba(255,255,255,0.06); }
    .pomo-btn-sec:hover { background: rgba(255,255,255,0.12); transform: scale(1.08); }
    .pomo-btn-sec svg { fill: rgba(255,255,255,0.5); }
    
    .pomo-stats {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 0 16px;
    }
    .pomo-stat { text-align: center; }
    .pomo-stat-val { font-size: 18px; font-weight: 600; color: #fff; line-height: 1; }
    .pomo-stat-label { font-size: 9px; color: rgba(255,255,255,0.3); margin-top: 3px; letter-spacing: 0.5px; text-transform: uppercase; }
    
    .pomo-tomatoes {
      display: flex;
      justify-content: center;
      gap: 6px;
      padding: 16px 16px 20px;
    }
    .pomo-tomato { width: 16px; height: 16px; border-radius: 50%; background: rgba(255,255,255,0.06); transition: all 0.3s; }
    .pomo-tomato.done { background: #e74c3c; box-shadow: 0 0 8px rgba(231,76,60,0.4); }
    .pomo-tomato.current { background: rgba(231,76,60,0.25); border: 1.5px solid #e74c3c; }
    
    .pomo-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(8px);
      z-index: 10000;
      justify-content: center;
      align-items: center;
    }
    .pomo-overlay.show { display: flex; }
    .pomo-alert-box {
      background: #1a1a2e;
      border-radius: 24px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      animation: pomo-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    @keyframes pomo-pop { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .pomo-alert-emoji { font-size: 56px; margin-bottom: 12px; }
    .pomo-alert-text { font-size: 20px; color: #fff; font-weight: 600; margin-bottom: 8px; }
    .pomo-alert-sub { font-size: 13px; color: rgba(255,255,255,0.5); margin-bottom: 20px; }
    .pomo-alert-btn {
      padding: 10px 32px;
      border: none;
      border-radius: 12px;
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s;
    }
  `;
  
  // 番茄闹钟HTML
  const pomodoroHTML = `
    <div class="pomo-panel" id="pomo-panel">
      <div class="pomo-modes" id="pomo-modes">
        <button class="pomo-mode active" data-idx="0">专注</button>
        <button class="pomo-mode" data-idx="1">短休</button>
        <button class="pomo-mode" data-idx="2">长休</button>
      </div>
      <div class="pomo-timer-area">
        <div class="pomo-ring-container">
          <svg class="pomo-ring-svg" viewBox="0 0 180 180">
            <circle class="pomo-ring-bg" cx="90" cy="90" r="80"/>
            <circle class="pomo-ring-glow" id="pomo-glow" cx="90" cy="90" r="80" stroke="#e74c3c" stroke-dasharray="502.6548245743669" stroke-dashoffset="0"/>
            <circle class="pomo-ring-progress" id="pomo-progress" cx="90" cy="90" r="80" stroke="#e74c3c" stroke-dasharray="502.6548245743669" stroke-dashoffset="0"/>
          </svg>
          <div class="pomo-time-display">
            <div class="pomo-time" id="pomo-time">25:00</div>
            <div class="pomo-label" id="pomo-label">专注时间</div>
          </div>
        </div>
      </div>
      <div class="pomo-controls">
        <button class="pomo-btn pomo-btn-sec" id="pomo-reset" title="重置">
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M17.65 6.35A7.96 7.96 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
        </button>
        <button class="pomo-btn pomo-btn-main" id="pomo-toggle">
          <svg width="22" height="22" viewBox="0 0 24 24" id="pomo-play-icon"><polygon points="6,3 20,12 6,21"/></svg>
        </button>
        <button class="pomo-btn pomo-btn-sec" id="pomo-skip" title="跳过">
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM14 6v12l8.5-6L14 6z"/></svg>
        </button>
      </div>
      <div class="pomo-tomatoes" id="pomo-tomatoes">
        <div class="pomo-tomato"></div><div class="pomo-tomato"></div><div class="pomo-tomato"></div><div class="pomo-tomato"></div>
      </div>
      <div class="pomo-stats">
        <div class="pomo-stat"><div class="pomo-stat-val" id="pomo-count">0</div><div class="pomo-stat-label">番茄数</div></div>
        <div class="pomo-stat"><div class="pomo-stat-val" id="pomo-focus">0</div><div class="pomo-stat-label">专注分钟</div></div>
      </div>
      <div class="pomo-overlay" id="pomo-overlay">
        <div class="pomo-alert-box">
          <div class="pomo-alert-emoji" id="pomo-alert-emoji">🍅</div>
          <div class="pomo-alert-text" id="pomo-alert-text">专注时间结束！</div>
          <div class="pomo-alert-sub" id="pomo-alert-sub">休息一下吧</div>
          <button class="pomo-alert-btn" id="pomo-alert-ok">好的</button>
        </div>
      </div>
    </div>
  `;
  
  // 组装DOM
  container.appendChild(style);
  container.appendChild(dragBar);
  contentArea.innerHTML = pomodoroHTML;
  container.appendChild(contentArea);
  document.body.appendChild(container);
  
  // ========== 番茄闹钟逻辑 ==========
  const MODES = [
    { name: '专注', key: 'work', duration: 25 * 60, color: '#e74c3c' },
    { name: '短休', key: 'short', duration: 5 * 60, color: '#27ae60' },
    { name: '长休', key: 'long', duration: 15 * 60, color: '#3498db' }
  ];
  
  let currentMode = 0;
  let timeLeft = MODES[0].duration;
  let totalTime = MODES[0].duration;
  let isRunning = false;
  let interval = null;
  let pomodoroCount = 0;
  let totalFocusMin = 0;
  const CIRCUMFERENCE = 2 * Math.PI * 80;
  
  // DOM元素获取
  const $ = id => contentArea.querySelector('#' + id);
  const timeEl = $('pomo-time');
  const labelEl = $('pomo-label');
  const progressEl = $('pomo-progress');
  const glowEl = $('pomo-glow');
  const toggleBtn = $('pomo-toggle');
  const playIcon = $('pomo-play-icon');
  const countEl = $('pomo-count');
  const focusEl = $('pomo-focus');
  const overlay = $('pomo-overlay');
  
  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return (m < 10 ? '0' + m : m) + ':' + (sec < 10 ? '0' + sec : sec);
  }
  
  function updateDisplay() {
    timeEl.textContent = formatTime(timeLeft);
    const offset = CIRCUMFERENCE * (1 - timeLeft / totalTime);
    progressEl.style.strokeDashoffset = offset;
    glowEl.style.strokeDashoffset = offset;
  }
  
  function setMode(idx) {
    if (isRunning) stopTimer();
    currentMode = idx;
    totalTime = MODES[idx].duration;
    timeLeft = totalTime;
    labelEl.textContent = MODES[idx].name + '时间';
    progressEl.style.stroke = MODES[idx].color;
    glowEl.style.stroke = MODES[idx].color;
    toggleBtn.classList.remove('running');
    playIcon.innerHTML = '<polygon points="6,3 20,12 6,21"/>';
    
    contentArea.querySelectorAll('.pomo-mode').forEach((b, i) => {
      b.classList.toggle('active', i === idx);
    });
    updateDisplay();
  }
  
  function updateTomatoes() {
    const cycle = pomodoroCount % 4;
    contentArea.querySelectorAll('.pomo-tomato').forEach((el, i) => {
      el.classList.remove('done', 'current');
      if (i < cycle) el.classList.add('done');
      else if (i === cycle && isRunning && currentMode === 0) el.classList.add('current');
    });
  }
  
  function playSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.5);
      });
    } catch(e) {}
  }
  
  function showNotification(modeIdx) {
    const isWork = modeIdx === 0;
    $('pomo-alert-emoji').textContent = isWork ? '🎉' : '🍅';
    $('pomo-alert-text').textContent = isWork ? '休息时间到！' : '专注时间开始！';
    $('pomo-alert-sub').textContent = isWork ? '辛苦了，休息一下吧' : '准备好了吗？开始专注！';
    overlay.classList.add('show');
  }
  
  function tick() {
    if (timeLeft <= 0) {
      stopTimer();
      playSound();
      if (currentMode === 0) {
        pomodoroCount++;
        totalFocusMin += MODES[0].duration / 60;
        countEl.textContent = pomodoroCount;
        focusEl.textContent = totalFocusMin;
        updateTomatoes();
        const nextMode = (pomodoroCount % 4 === 0) ? 2 : 1;
        showNotification(0);
        setMode(nextMode);
      } else {
        showNotification(currentMode);
        setMode(0);
      }
      return;
    }
    timeLeft--;
    updateDisplay();
  }
  
  function startTimer() {
    isRunning = true;
    toggleBtn.classList.add('running');
    playIcon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    interval = setInterval(tick, 1000);
    updateTomatoes();
    updateDisplay();
  }
  
  function stopTimer() {
    isRunning = false;
    toggleBtn.classList.remove('running');
    playIcon.innerHTML = '<polygon points="6,3 20,12 6,21"/>';
    clearInterval(interval);
    interval = null;
    updateDisplay();
  }
  
  // ========== 事件绑定 ==========
  // 番茄闹钟功能按钮
  toggleBtn.addEventListener('click', () => isRunning ? stopTimer() : startTimer());
  $('pomo-reset').addEventListener('click', () => { stopTimer(); timeLeft = totalTime; updateDisplay(); });
  $('pomo-skip').addEventListener('click', () => {
    if (currentMode === 0) {
      pomodoroCount++;
      totalFocusMin += Math.round((totalTime - timeLeft) / 60);
      countEl.textContent = pomodoroCount;
      focusEl.textContent = totalFocusMin;
      setMode((pomodoroCount % 4 === 0) ? 2 : 1);
    } else {
      setMode(0);
    }
    updateTomatoes();
  });
  $('pomo-modes').addEventListener('click', e => {
    const btn = e.target.closest('.pomo-mode');
    if (btn) setMode(parseInt(btn.dataset.idx));
  });
  $('pomo-alert-ok').addEventListener('click', () => overlay.classList.remove('show'));
  
  // ========== 全局控制按钮（修复点击无效） ==========
  const minimizeBtn = document.getElementById('pomo-global-minimize');
  const closeBtn = document.getElementById('pomo-global-close');
  
  // 修复最小化按钮
  minimizeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (contentArea.style.display === 'none') {
      contentArea.style.display = 'flex';
      this.textContent = '−';
      container.style.height = 'auto';
    } else {
      contentArea.style.display = 'none';
      this.textContent = '+';
      container.style.height = '40px';
    }
  });
  
  // 修复关闭按钮
  closeBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    stopTimer();
    container.remove();
  });
  
  // ========== 拖拽功能 ==========
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  dragBar.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'BUTTON') return;
    isDragging = true;
    const rect = container.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    dragBar.style.cursor = 'grabbing';
  });
  
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    container.style.left = (startLeft + dx) + 'px';
    container.style.top = (startTop + dy) + 'px';
    container.style.right = 'auto';
    container.style.bottom = 'auto';
  });
  
  document.addEventListener('mouseup', function() {
    isDragging = false;
    dragBar.style.cursor = 'move';
  });
  
  // 初始化
  progressEl.style.strokeDasharray = CIRCUMFERENCE;
  glowEl.style.strokeDasharray = CIRCUMFERENCE;
  updateDisplay();
  updateTomatoes();
  
  console.log('🍅 全局番茄闹钟已启动（按钮和空白修复版）');
})();