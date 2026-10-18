(function() {
  // 防止重复执行
  if (window.timeTrackerScriptLoaded) return;
  window.timeTrackerScriptLoaded = true;

  // 状态变量
  let isRunning = true; // 计时器运行状态
  let entryTime = new Date(); // 页面进入时间
  let pausedTime = 0; // 累计暂停时间（毫秒）
  let lastPauseTime = null; // 上次暂停的时间点
  let totalPausedTime = 0; // 总暂停时间（用于显示）

  // 创建悬浮窗口
  function createFloatingWindow() {
    const floatingDiv = document.createElement('div');
    floatingDiv.id = 'time-tracker-floating-window';
    
    // 样式设置
    Object.assign(floatingDiv.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '9999',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      color: '#fff',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      minWidth: '220px',
      cursor: 'move',
      userSelect: 'none',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    });

    // 标题栏
    const header = document.createElement('div');
    header.textContent = '⏱️ 时间统计';
    Object.assign(header.style, {
      fontWeight: 'bold',
      marginBottom: '8px',
      fontSize: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });

    // 状态指示器
    const statusIndicator = document.createElement('span');
    statusIndicator.id = 'time-tracker-status';
    statusIndicator.textContent = '运行中';
    statusIndicator.style.cssText = `
      font-size: 12px;
      background-color: #10b981;
      color: white;
      padding: 2px 6px;
      border-radius: 10px;
      margin-left: 8px;
    `;
    header.appendChild(statusIndicator);

    // 关闭按钮
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      padding: 0 4px;
      opacity: 0.7;
      margin-left: 8px;
    `;
    closeBtn.addEventListener('click', () => {
      document.body.removeChild(floatingDiv);
      clearInterval(window.timeTrackerUpdateInterval);
    });
    header.appendChild(closeBtn);

    // 内容区域
    const content = document.createElement('div');
    content.id = 'time-tracker-content';
    content.style.lineHeight = '1.5';

    // 快捷键提示
    const shortcutHint = document.createElement('div');
    shortcutHint.id = 'time-tracker-shortcut';
    shortcutHint.style.cssText = `
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      font-size: 12px;
      opacity: 0.7;
    `;
    shortcutHint.textContent = '快捷键：空格键 启动/暂停';

    // 组装元素
    floatingDiv.appendChild(header);
    floatingDiv.appendChild(content);
    floatingDiv.appendChild(shortcutHint);
    document.body.appendChild(floatingDiv);

    // 拖拽功能
    let isDragging = false;
    let offsetX, offsetY;

    floatingDiv.addEventListener('mousedown', (e) => {
      if (e.target === closeBtn) return;
      
      isDragging = true;
      offsetX = e.clientX - floatingDiv.getBoundingClientRect().left;
      offsetY = e.clientY - floatingDiv.getBoundingClientRect().top;
      
      floatingDiv.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      floatingDiv.style.left = (e.clientX - offsetX) + 'px';
      floatingDiv.style.top = (e.clientY - offsetY) + 'px';
      floatingDiv.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      floatingDiv.style.cursor = 'move';
    });

    return floatingDiv;
  }

  // 格式化时间
  function formatTime(date) {
    return date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  // 计算有效持续时间（排除暂停时间）
  function calculateEffectiveDuration() {
    const now = new Date();
    
    // 计算实际运行时间
    let effectiveDiffMs = now - entryTime - pausedTime;
    
    // 如果当前处于暂停状态，减去当前暂停的时间
    if (lastPauseTime && !isRunning) {
      effectiveDiffMs -= (now - lastPauseTime);
    }
    
    const totalSeconds = Math.floor(effectiveDiffMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return {
      minutes: minutes.toString().padStart(2, '0'),
      seconds: seconds.toString().padStart(2, '0'),
      totalSeconds: totalSeconds
    };
  }

  // 更新状态显示
  function updateStatusDisplay() {
    const statusElement = document.getElementById('time-tracker-status');
    if (!statusElement) return;
    
    if (isRunning) {
      statusElement.textContent = '运行中';
      statusElement.style.backgroundColor = '#10b981';
    } else {
      statusElement.textContent = '已暂停';
      statusElement.style.backgroundColor = '#ef4444';
    }
  }

  // 更新显示内容
  function updateDisplay() {
    const content = document.getElementById('time-tracker-content');
    if (!content) return;
    
    const duration = calculateEffectiveDuration();
    const currentTime = formatTime(new Date());
    
    content.innerHTML = `
      <div style="margin-bottom: 4px;">
        <span style="opacity: 0.8;">进入时间：</span>
        <span style="font-weight: 500;">${formatTime(entryTime)}</span>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="opacity: 0.8;">当前时间：</span>
        <span style="font-weight: 500;">${currentTime}</span>
      </div>
      <div style="margin-bottom: 4px;">
        <span style="opacity: 0.8;">运行状态：</span>
        <span style="font-weight: 500; color: ${isRunning ? '#10b981' : '#ef4444'}">
          ${isRunning ? '运行中' : '已暂停'}
        </span>
      </div>
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.2);">
        <span style="opacity: 0.8;">有效时间：</span>
        <span style="font-size: 18px; font-weight: bold; color: #4ade80;">
          ${duration.minutes}:${duration.seconds}
        </span>
        <span style="font-size: 12px; opacity: 0.7; margin-left: 4px;">
          (${duration.totalSeconds}秒)
        </span>
      </div>
      ${totalPausedTime > 0 ? `
        <div style="margin-top: 4px; font-size: 12px; opacity: 0.7;">
          累计暂停：${Math.floor(totalPausedTime / 1000)}秒
        </div>
      ` : ''}
    `;
  }

  // 切换计时器状态
  function toggleTimer() {
    const now = new Date();
    
    if (isRunning) {
      // 暂停计时器
      isRunning = false;
      lastPauseTime = now;
    } else {
      // 恢复计时器
      isRunning = true;
      
      // 计算暂停时间并累加
      if (lastPauseTime) {
        const pauseDuration = now - lastPauseTime;
        pausedTime += pauseDuration;
        totalPausedTime += pauseDuration;
        lastPauseTime = null;
      }
    }
    
    updateStatusDisplay();
    updateDisplay();
    
    // 播放提示音
    playToggleSound();
  }

  // 播放状态切换提示音
  function playToggleSound() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = isRunning ? 800 : 400;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      // 音频API不可用，静默失败
    }
  }

  // 处理页面可见性变化
  function handleVisibilityChange() {
    if (document.hidden) {
      // 页面隐藏（切换到其他标签页/最小化）
      if (isRunning && !lastPauseTime) {
        lastPauseTime = new Date();
        isRunning = false;
        updateStatusDisplay();
      }
    } else {
      // 页面恢复显示
      if (!isRunning && lastPauseTime) {
        const now = new Date();
        const pauseDuration = now - lastPauseTime;
        pausedTime += pauseDuration;
        totalPausedTime += pauseDuration;
        lastPauseTime = null;
        isRunning = true;
        updateStatusDisplay();
      }
    }
  }

  // 主执行函数
  function executeTimeTracker() {
    console.log('⏱️ 增强版时间统计脚本启动...');
    
    // 创建悬浮窗口
    createFloatingWindow();
    
    // 初始更新
    updateStatusDisplay();
    updateDisplay();
    
    // 设置定时更新
    const updateInterval = setInterval(() => {
      if (isRunning) {
        updateDisplay();
      }
    }, 1000);
    
    // 保存计时器引用
    window.timeTrackerUpdateInterval = updateInterval;
    
    // 添加键盘事件监听
    document.addEventListener('keydown', (event) => {
      // 检查是否在输入框中，避免冲突
      const activeElement = document.activeElement;
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );
      
      // 空格键切换计时器状态
      if (event.code === 'Space' && !isInputFocused) {
        event.preventDefault(); // 防止页面滚动
        toggleTimer();
      }
    });
    
    // 添加页面可见性变化监听
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 添加页面卸载前的清理
    window.addEventListener('beforeunload', () => {
      clearInterval(updateInterval);
      document.removeEventListener('keydown', toggleTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    });
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeTimeTracker);
  } else {
    executeTimeTracker();
  }
})();