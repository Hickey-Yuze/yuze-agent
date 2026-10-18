// 优化版工作统计框 - 自定义时间 + 精确字数统计
(function() {
  'use strict';

  console.log('🎨 开始创建优化版工作统计框...');

  // 清理旧面板
  const oldPanel = document.getElementById('optimized-work-timer');
  if (oldPanel) oldPanel.remove();

  // 创建面板
  const panel = document.createElement('div');
  panel.id = 'optimized-work-timer';

  // 默认工作时间（从 localStorage 加载或使用默认值）
  const savedConfig = JSON.parse(localStorage.getItem('workTimerConfig') || '{}');
  const defaultStart = savedConfig.workStart || '09:30';
  const defaultEnd = savedConfig.workEnd || '18:30';

  panel.innerHTML = `
    <style>
      #optimized-work-timer {
        position: fixed;
        top: 15px;
        left: 15px;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 12px 16px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 11px;
        color: #000;
        z-index: 999999;
        cursor: move;
        user-select: none;
        min-width: 180px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        transition: all 0.2s ease;
        transform: scale(0.9);
        opacity: 0.92;
      }

      #optimized-work-timer:hover {
        transform: scale(0.95);
        opacity: 0.98;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      #optimized-work-timer.dragging {
        transform: scale(1);
        opacity: 0.85;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
        transition: none;
      }

      #optimized-work-timer .header {
        font-size: 12px;
        font-weight: 600;
        margin-bottom: 10px;
        text-align: center;
        color: #000;
        opacity: 0.9;
      }

      #optimized-work-timer .time-config {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 8px;
        padding: 6px;
        background: rgba(0, 0, 0, 0.03);
        border-radius: 6px;
      }

      #optimized-work-timer .time-config label {
        font-size: 9px;
        color: #666;
        margin-bottom: 2px;
      }

      #optimized-work-timer .time-config input[type="time"] {
        width: 100%;
        padding: 3px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 3px;
        font-size: 10px;
        background: rgba(255, 255, 255, 0.1);
      }

      #optimized-work-timer .divider {
        height: 1px;
        background: rgba(0, 0, 0, 0.08);
        margin: 6px 0;
        border-radius: 1px;
      }

      #optimized-work-timer .item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 6px 0;
        padding: 2px 0;
      }

      #optimized-work-timer .label {
        font-size: 10px;
        font-weight: 500;
        color: #000;
        opacity: 0.8;
      }

      #optimized-work-timer .value {
        font-size: 14px;
        font-weight: 700;
        color: #000;
        opacity: 0.95;
      }

      #optimized-work-timer .earnings {
        color: #4ade80;
        font-size: 15px;
        font-weight: 700;
      }

      #optimized-work-timer input[type="number"] {
        width: 50px;
        padding: 2px 6px;
        border: 1px solid rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        font-size: 10px;
        font-weight: 600;
        background: rgba(255, 255, 255, 0.05);
        color: #000;
        margin: 0 3px;
        transition: all 0.2s;
      }

      #optimized-work-timer input[type="number"]:focus {
        outline: none;
        border-color: rgba(0, 0, 0, 0.3);
        background: rgba(255, 255, 255, 0.1);
      }

      #optimized-work-timer .countdown-normal {
        color: #000;
      }

      #optimized-work-timer .countdown-overtime {
        color: #ff6b6b;
        font-size: 12px;
      }
    </style>

    <div class="header">📊 工作统计</div>

    <div class="time-config">
      <div>
        <label>开始时间</label>
        <input type="time" id="work-start" value="${defaultStart}">
      </div>
      <div>
        <label>结束时间</label>
        <input type="time" id="work-end" value="${defaultEnd}">
      </div>
    </div>

    <div class="divider"></div>

    <div class="item">
      <span class="label">日薪</span>
      <input type="number" id="salary-input" placeholder="金额" value="500">
      <span id="earnings" class="value earnings">¥0.00</span>
    </div>

    <div class="divider"></div>

    <div class="item">
      <span class="label">字数</span>
      <span id="word-count" class="value">0</span>
    </div>

    <div class="divider"></div>

    <div class="item">
      <span class="label">下班倒计时</span>
      <span id="countdown" class="value countdown-normal">--:--:--</span>
    </div>
  `;

  document.body.appendChild(panel);

  // 拖拽功能
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  panel.addEventListener('mousedown', function(e) {
    if (e.target.tagName === 'INPUT') return;
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(panel.style.left) || 15;
    startTop = parseInt(panel.style.top) || 15;
    panel.classList.add('dragging');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = (startLeft + dx) + 'px';
    panel.style.top = (startTop + dy) + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      panel.classList.remove('dragging');
      // 保存位置
      localStorage.setItem('workTimerPosition', JSON.stringify({
        left: panel.style.left,
        top: panel.style.top
      }));
    }
  });

  // 加载保存的位置
  const savedPosition = JSON.parse(localStorage.getItem('workTimerPosition') || '{}');
  if (savedPosition.left && savedPosition.top) {
    panel.style.left = savedPosition.left;
    panel.style.top = savedPosition.top;
  }

  // 变量初始化
  let dailySalary = 500;
  let wordCount = parseInt(localStorage.getItem('workTimerWordCount') || '0');
  let salary = 0;
  let workStartTime = defaultStart;
  let workEndTime = defaultEnd;

  // 工作时间配置
  const workStartInput = panel.querySelector('#work-start');
  const workEndInput = panel.querySelector('#work-end');

  function saveConfig() {
    localStorage.setItem('workTimerConfig', JSON.stringify({
      workStart: workStartTime,
      workEnd: workEndTime
    }));
  }

  workStartInput.addEventListener('change', function() {
    workStartTime = this.value;
    saveConfig();
  });

  workEndInput.addEventListener('change', function() {
    workEndTime = this.value;
    saveConfig();
  });

  // 薪资输入
  const salaryInput = panel.querySelector('#salary-input');
  salaryInput.addEventListener('input', function() {
    dailySalary = parseFloat(this.value) || 0;
  });

  // 精确的字数统计功能
  const inputElements = new Set();
  const inputStates = new Map(); // 跟踪每个输入框的状态

  function bindInput(element) {
    if (inputElements.has(element)) return;

    // 初始化输入状态
    inputStates.set(element, {
      lastText: element.value || element.textContent || '',
      lastCommittedText: element.value || element.textContent || '',
      isComposing: false
    });

    const state = inputStates.get(element);

    // 处理输入法开始
    element.addEventListener('compositionstart', function() {
      state.isComposing = true;
    });

    // 处理输入法结束
    element.addEventListener('compositionend', function() {
      state.isComposing = false;
      // 输入法结束后立即统计
      const currentText = element.value || element.textContent || '';
      if (currentText !== state.lastCommittedText) {
        updateWordCount(currentText, state.lastCommittedText);
        state.lastCommittedText = currentText;
      }
    });

    // 处理普通输入（只有非输入法状态才统计）
    const updateCount = () => {
      if (state.isComposing) return; // 输入法进行中不统计

      const currentText = element.value || element.textContent || '';
      if (currentText !== state.lastCommittedText) {
        updateWordCount(currentText, state.lastCommittedText);
        state.lastCommittedText = currentText;
      }
      state.lastText = currentText;
    };

    element.addEventListener('input', updateCount);
    element.addEventListener('paste', () => setTimeout(updateCount, 0));
    element.addEventListener('blur', updateCount); // 失去焦点时确保统计

    inputElements.add(element);
  }

  // 精确字数统计
  function updateWordCount(currentText, previousText) {
    const currentWords = countWords(currentText);
    const previousWords = countWords(previousText);
    const diff = currentWords - previousWords;

    if (diff > 0) {
      wordCount += diff;
      localStorage.setItem('workTimerWordCount', wordCount.toString());
      updateDisplay();
    }
  }

  function countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    text = text.trim();
    if (!text) return 0;

    // 更精确的中文字符统计（包含更多中文标点符号）
    const chinese = text.match(/[\u4e00-\u9fa5]/g) || [];
    
    // 英文字母和数字序列（按空格和标点分隔）
    const english = text.replace(/[\u4e00-\u9fa5]/g, ' ')
      .split(/[\s\W]+/)
      .filter(word => /^[a-zA-Z0-9]+$/.test(word))
      .length;

    return chinese.length + english;
  }

  // 绑定现有输入框
  document.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(bindInput);

  // 监听新输入框
  new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches('input, textarea, [contenteditable="true"]')) {
            bindInput(node);
          }
          node.querySelectorAll('input, textarea, [contenteditable="true"]').forEach(bindInput);
        }
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  // 更新显示
  function updateDisplay() {
    const wordCountElement = panel.querySelector('#word-count');
    if (wordCountElement) {
      wordCountElement.textContent = wordCount.toLocaleString();
    }
  }

  // 倒计时和薪资计算
  function updateTimer() {
    const now = new Date();
    
    // 解析工作时间
    const [startHour, startMin] = workStartTime.split(':').map(Number);
    const [endHour, endMin] = workEndTime.split(':').map(Number);
    
    const workStart = new Date();
    workStart.setHours(startHour, startMin, 0, 0);
    
    const workEnd = new Date();
    workEnd.setHours(endHour, endMin, 0, 0);

    // 计算薪资
    if (now >= workStart && now <= workEnd && dailySalary > 0) {
      const workedMs = now - workStart;
      const totalMs = workEnd - workStart;
      salary = dailySalary * Math.min(workedMs / totalMs, 1);
    } else if (now > workEnd) {
      salary = dailySalary;
    } else {
      salary = 0;
    }

    const earningsElement = panel.querySelector('#earnings');
    if (earningsElement) {
      earningsElement.textContent = '¥' + salary.toFixed(2);
    }

    // 计算倒计时
    const countdownElement = panel.querySelector('#countdown');
    if (countdownElement) {
      if (now < workEnd) {
        const diff = workEnd - now;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        countdownElement.textContent = 
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        countdownElement.className = 'value countdown-normal';
      } else {
        const overtime = now - workEnd;
        const hours = Math.floor(overtime / (1000 * 60 * 60));
        const minutes = Math.floor((overtime % (1000 * 60 * 60)) / (1000 * 60));
        countdownElement.textContent = `已下班 ${hours}h ${minutes}m`;
        countdownElement.className = 'value countdown-overtime';
      }
    }
  }

  // 启动定时器
  setInterval(updateTimer, 1000);
  updateTimer();

  // 初始化显示
  updateDisplay();

  console.log('✅ 优化版工作统计框创建完成！');

})();
(function() {
  // 防重复注入
  if (window.__workTimerScaleInjected) return;
  window.__workTimerScaleInjected = true;

  // 主面板
  function setupScaleFeature() {
    const panel = document.getElementById('optimized-work-timer');
    if (!panel) {
      setTimeout(setupScaleFeature, 500);
      return;
    }

    // 读取并应用缩放比例
    let scale = parseFloat(localStorage.getItem('workTimerScale') || '1');
    applyScale(panel, scale);

    // 添加缩放手柄
    let handle = panel.querySelector('.scale-handle');
    if (!handle) {
      handle = document.createElement('div');
      handle.className = 'scale-handle';
      handle.style.position = 'absolute';
      handle.style.right = '2px';
      handle.style.bottom = '2px';
      handle.style.width = '18px';
      handle.style.height = '18px';
      handle.style.background = 'rgba(0,0,0,0.08)';
      handle.style.cursor = 'nwse-resize';
      handle.style.borderRadius = '50%';
      handle.style.zIndex = '1000001';
      handle.style.display = 'flex';
      handle.style.alignItems = 'center';
      handle.style.justifyContent = 'center';
      handle.innerHTML = '<svg width="12" height="12"><polyline points="2,10 10,10 10,2" style="fill:none;stroke:#888;stroke-width:2"/></svg>';
      panel.appendChild(handle);
    }

    // 缩放逻辑
    let isScaling = false, startX = 0, startY = 0, startScale = scale;
    handle.addEventListener('mousedown', function(e) {
      isScaling = true;
      startX = e.clientX;
      startY = e.clientY;
      startScale = scale;
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isScaling) return;
      // 以面板宽度为基准，横向移动距离决定缩放
      const panelRect = panel.getBoundingClientRect();
      const base = Math.max(panelRect.width, panelRect.height, 180);
      const dx = e.clientX - startX;
      // 计算新的 scale，限制在0.5~2之间
      let newScale = Math.min(2, Math.max(0.5, startScale + dx / base));
      scale = newScale;
      applyScale(panel, scale);
    });

    document.addEventListener('mouseup', function() {
      if (isScaling) {
        isScaling = false;
        document.body.style.userSelect = '';
        // 保存缩放比例
        localStorage.setItem('workTimerScale', scale);
      }
    });
  }

  // 应用缩放 transform
  function applyScale(panel, scale) {
    panel.style.transform = `scale(${scale})`;
    panel.style.transformOrigin = 'bottom right';
    // 可选：调整面板的z-index或阴影效果
  }

  // 启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupScaleFeature);
  } else {
    setupScaleFeature();
  }
})();