(function() {
  // 防止重复运行
  if (document.getElementById('tab-breathing-popup')) {
    console.log('Box Breathing popup is already active.');
    return;
  }

  // 配置
  const CONFIG = {
    cycleCount: 3,     // 呼吸循环次数
    stepDuration: 4000 // 每步时长 (ms)
  };

  // --- UI 构建 ---
  const host = document.createElement('div');
  host.id = 'tab-breathing-popup';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // 样式
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }
    
    .overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.4); 
      z-index: 2147483647;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transition: opacity 0.3s ease;
      backdrop-filter: blur(2px);
    }
    .overlay.visible { opacity: 1; }
    
    .popup-card {
      position: relative;
      width: 320px;
      padding: 30px 20px 20px 20px;
      background: #1a1a1a;
      border: 1px solid #333;
      border-radius: 16px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
      display: flex; flex-direction: column; align-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #fff;
      transform: scale(0.9); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
    .overlay.visible .popup-card { transform: scale(1); }

    .visual-container { 
      position: relative; width: 180px; height: 180px; 
      margin: 20px 0;
      display: flex; align-items: center; justify-content: center; 
    }
    
    .box-path {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      border: 3px solid #333; box-sizing: border-box; border-radius: 12px;
    }
    
    .active-edge {
      position: absolute; background: #60A5FA; box-shadow: 0 0 15px #60A5FA;
      border-radius: 4px; transition: all 4s linear; opacity: 0;
    }

    /* 动画状态 */
    .state-0 .active-edge { top: -1.5px; left: 0; width: 0%; height: 3px; opacity: 1; }
    .state-0.animate .active-edge { width: 100%; }
    .state-1 .active-edge { top: 0; right: -1.5px; width: 3px; height: 0%; opacity: 1; }
    .state-1.animate .active-edge { height: 100%; }
    .state-2 .active-edge { bottom: -1.5px; right: 0; width: 0%; height: 3px; opacity: 1; }
    .state-2.animate .active-edge { width: 100%; }
    .state-3 .active-edge { bottom: 0; left: -1.5px; width: 3px; height: 0%; opacity: 1; }
    .state-3.animate .active-edge { height: 100%; }

    .instruction-text {
      font-size: 20px; font-weight: 600; color: #E5E7EB;
      margin-top: 10px; min-height: 1.5em; text-align: center;
    }
    .cycle-text { font-size: 13px; color: #6B7280; margin-top: 5px; }
    .timer-center { font-size: 28px; font-weight: bold; color: #fff; }

    .header {
      width: 100%; display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 10px;
    }
    .title { font-size: 14px; font-weight: 500; color: #888; text-transform: uppercase; letter-spacing: 1px; }
    
    .footer-credit {
      margin-top: 25px; font-size: 10px; color: #444; 
      text-transform: uppercase; letter-spacing: 0.5px;
    }

    .close-btn {
      background: none; border: none; color: #666; cursor: pointer;
      font-size: 20px; padding: 0 5px; line-height: 1;
      transition: color 0.2s;
    }
    .close-btn:hover { color: #fff; }
  `;
  shadow.appendChild(style);

  // HTML 结构更新
  const wrapper = document.createElement('div');
  wrapper.className = 'overlay';
  wrapper.innerHTML = `
    <div class="popup-card">
      <div class="header">
        <span class="title">Box Breathing</span>
        <button class="close-btn" title="关闭 (Esc)">×</button>
      </div>
      
      <div class="visual-container" id="box-visual">
        <div class="box-path"></div>
        <div class="active-edge"></div>
        <div class="timer-center" id="timer-display">Ready</div>
      </div>
      
      <div class="instruction-text" id="instruction-text">准备开始</div>
      <div class="cycle-text" id="cycle-text">Cycle 1/${CONFIG.cycleCount}</div>
      
      <div class="footer-credit">Design By OliverPsy</div>
    </div>
  `;
  shadow.appendChild(wrapper);

  // --- 逻辑控制 ---
  const visualBox = wrapper.querySelector('#box-visual');
  const instructionText = wrapper.querySelector('#instruction-text');
  const timerDisplay = wrapper.querySelector('#timer-display');
  const cycleText = wrapper.querySelector('#cycle-text');
  let currentCycle = 1;
  let isRunning = true;
  let stageTimer = null;
  let countdownInterval = null;

  const stages = [
    { text: "吸气 (Inhale)", action: "expand" },
    { text: "屏息 (Hold)", action: "hold" },
    { text: "呼气 (Exhale)", action: "contract" },
    { text: "屏息 (Hold)", action: "hold" }
  ];

  function runStage(stageIndex) {
    if (!isRunning) return;

    visualBox.className = `visual-container state-${stageIndex}`;
    requestAnimationFrame(() => {
        visualBox.classList.add('animate');
    });

    instructionText.textContent = stages[stageIndex].text;
    
    let timeLeft = CONFIG.stepDuration / 1000;
    timerDisplay.textContent = timeLeft;
    
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(() => {
        if (!isRunning) return;
        timeLeft--;
        if (timeLeft > 0) {
            timerDisplay.textContent = timeLeft;
        } else {
            clearInterval(countdownInterval);
        }
    }, 1000);

    stageTimer = setTimeout(() => {
        if (!isRunning) return;
        const nextStage = (stageIndex + 1) % 4;
        if (nextStage === 0) {
            currentCycle++;
            if (currentCycle > CONFIG.cycleCount) {
                finishSession();
                return;
            }
            cycleText.textContent = `Cycle ${currentCycle}/${CONFIG.cycleCount}`;
        }
        runStage(nextStage);
    }, CONFIG.stepDuration);
  }

  function finishSession() {
    instructionText.textContent = "已完成 (Done)";
    timerDisplay.textContent = "✓";
    cycleText.textContent = "Great job.";
    visualBox.className = 'visual-container';
    setTimeout(closeOverlay, 2500);
  }

  function closeOverlay() {
    isRunning = false;
    clearTimeout(stageTimer);
    clearInterval(countdownInterval);
    wrapper.classList.remove('visible');
    setTimeout(() => {
        if (host.parentNode) host.parentNode.removeChild(host);
    }, 300);
  }

  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) closeOverlay();
  });
  wrapper.querySelector('.close-btn').onclick = closeOverlay;
  
  setTimeout(() => wrapper.classList.add('visible'), 10);
  setTimeout(() => runStage(0), 800);

  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeOverlay();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
})();