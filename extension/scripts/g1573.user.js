(function() {
  // 防止重复执行
  if (window.muyuScriptLoaded) return;
  window.muyuScriptLoaded = true;

  // 木鱼样式
  const style = document.createElement('style');
  style.textContent = `
    .muyu-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .muyu-icon {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.1s ease;
      border: 3px solid #5D4037;
      user-select: none;
      position: relative;
      overflow: hidden;
    }
    
    .muyu-icon:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    }
    
    .muyu-icon:active {
      transform: scale(0.95);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }
    
    .muyu-icon.clicked {
      animation: muyuClick 0.2s ease;
      background: linear-gradient(135deg, #D2691E 0%, #CD853F 100%);
    }
    
    @keyframes muyuClick {
      0% { transform: scale(1); }
      50% { transform: scale(0.9); }
      100% { transform: scale(1); }
    }
    
    .muyu-stick {
      position: absolute;
      width: 4px;
      height: 30px;
      background: #654321;
      border-radius: 2px;
      top: -15px;
      left: 50%;
      transform: translateX(-50%) rotate(-15deg);
      transform-origin: bottom center;
      transition: transform 0.1s ease;
    }
    
    .muyu-icon.clicked .muyu-stick {
      transform: translateX(-50%) rotate(15deg);
    }
    
    .muyu-text {
      font-size: 24px;
      font-weight: bold;
      color: #F5DEB3;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
    }
    
    .muyu-count {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
      min-width: 60px;
      text-align: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    
    .muyu-pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%);
      animation: pulse 0.5s ease-out;
      pointer-events: none;
    }
    
    @keyframes pulse {
      0% { transform: scale(0.8); opacity: 1; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    
    .muyu-plus {
      position: absolute;
      top: -10px;
      right: -10px;
      background: #FF6B6B;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      animation: floatUp 0.8s ease-out forwards;
      pointer-events: none;
    }
    
    @keyframes floatUp {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-30px); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // 创建木鱼元素
  function createMuyu() {
    const container = document.createElement('div');
    container.className = 'muyu-container';
    
    const muyuIcon = document.createElement('div');
    muyuIcon.className = 'muyu-icon';
    muyuIcon.title = '点击敲木鱼 (功德+1)';
    
    const stick = document.createElement('div');
    stick.className = 'muyu-stick';
    
    const text = document.createElement('div');
    text.className = 'muyu-text';
    text.textContent = '木';
    
    const countDisplay = document.createElement('div');
    countDisplay.className = 'muyu-count';
    
    muyuIcon.appendChild(stick);
    muyuIcon.appendChild(text);
    container.appendChild(muyuIcon);
    container.appendChild(countDisplay);
    document.body.appendChild(container);
    
    return { container, muyuIcon, countDisplay };
  }

  // 初始化计数
  function getCount() {
    const saved = localStorage.getItem('muyuCount');
    return saved ? parseInt(saved) : 0;
  }

  function saveCount(count) {
    localStorage.setItem('muyuCount', count.toString());
  }

  // 创建点击效果
  function createClickEffect(x, y) {
    const plus = document.createElement('div');
    plus.className = 'muyu-plus';
    plus.textContent = '+1';
    plus.style.left = `${x}px`;
    plus.style.top = `${y}px`;
    
    const pulse = document.createElement('div');
    pulse.className = 'muyu-pulse';
    
    return { plus, pulse };
  }

  // 主逻辑
  function initMuyu() {
    const { muyuIcon, countDisplay } = createMuyu();
    let count = getCount();
    countDisplay.textContent = `功德: ${count}`;
    
    muyuIcon.addEventListener('click', function(e) {
      // 更新计数
      count++;
      saveCount(count);
      countDisplay.textContent = `功德: ${count}`;
      
      // 添加点击动画
      muyuIcon.classList.add('clicked');
      setTimeout(() => {
        muyuIcon.classList.remove('clicked');
      }, 200);
      
      // 创建视觉效果
      const rect = muyuIcon.getBoundingClientRect();
      const { plus, pulse } = createClickEffect(
        e.clientX - rect.left,
        e.clientY - rect.top
      );
      
      muyuIcon.appendChild(pulse);
      muyuIcon.appendChild(plus);
      
      setTimeout(() => {
        if (pulse.parentNode) pulse.remove();
        if (plus.parentNode) plus.remove();
      }, 800);
      
      // 尝试播放音效（如果浏览器支持）
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        // 音效失败不影响主要功能
        console.log('音效不可用，继续视觉反馈');
      }
    });
    
    // 添加拖拽功能（可选）
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };
    
    muyuIcon.addEventListener('mousedown', function(e) {
      if (e.shiftKey) { // 按住Shift键拖拽
        isDragging = true;
        const rect = muyuIcon.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        muyuIcon.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', function(e) {
      if (isDragging) {
        const container = muyuIcon.parentElement;
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        container.style.left = `${e.clientX - dragOffset.x}px`;
        container.style.top = `${e.clientY - dragOffset.y}px`;
      }
    });
    
    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        muyuIcon.style.cursor = 'pointer';
      }
    });
    
    // 添加键盘快捷键（空格键敲木鱼）
    document.addEventListener('keydown', function(e) {
      if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        muyuIcon.click();
      }
    });
    
    console.log('木鱼脚本已加载，点击右下角木鱼开始敲击！按住Shift键可拖拽位置。');
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMuyu);
  } else {
    initMuyu();
  }
})();