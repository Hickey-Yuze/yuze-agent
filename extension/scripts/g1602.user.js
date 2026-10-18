(function() {
  // 防止重复执行
  if (window.crtEffectActive) return;
  window.crtEffectActive = true;

  // 创建CRT效果容器
  const crtContainer = document.createElement('div');
  crtContainer.id = 'crt-effect-container';
  
  // CRT屏幕样式
  crtContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #001100;
    z-index: 99999;
    overflow: hidden;
    font-family: 'Courier New', monospace;
    color: #00ff00;
    cursor: pointer;
  `;

  // 扫描线效果
  const scanlines = document.createElement('div');
  scanlines.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      transparent 50%,
      rgba(0, 255, 0, 0.03) 50%
    );
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 2;
    animation: flicker 0.15s infinite;
  `;

  // 闪烁电波效果
  const staticOverlay = document.createElement('div');
  staticOverlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      ellipse at center,
      rgba(0, 255, 0, 0.2) 0%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    animation: staticPulse 0.8s ease-in-out 3;
  `;

  // 命令行显示区域
  const terminal = document.createElement('div');
  terminal.style.cssText = `
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 80%;
    max-width: 800px;
    font-size: 1.2rem;
    line-height: 1.5;
    text-shadow: 0 0 5px #00ff00;
    filter: blur(0.3px);
    opacity: 0;
    z-index: 3;
  `;

  // 添加所有元素
  crtContainer.appendChild(staticOverlay);
  crtContainer.appendChild(scanlines);
  crtContainer.appendChild(terminal);
  document.body.appendChild(crtContainer);

  // 添加CSS动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes flicker {
      0%, 100% { opacity: 0.97; }
      50% { opacity: 1; }
    }
    
    @keyframes staticPulse {
      0%, 100% { opacity: 0; transform: scale(1); }
      20% { opacity: 0.8; transform: scale(1.05); }
      40% { opacity: 0.3; transform: scale(0.95); }
      60% { opacity: 0.6; transform: scale(1.02); }
      80% { opacity: 0.1; transform: scale(0.98); }
    }
    
    @keyframes typewriter {
      from { width: 0; }
      to { width: 100%; }
    }
    
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    
    .crt-line {
      overflow: hidden;
      white-space: nowrap;
      margin: 0;
      padding: 0.5rem 0;
      animation: typewriter 3s steps(40, end);
    }
    
    .cursor {
      display: inline-block;
      width: 8px;
      height: 1.2em;
      background: #00ff00;
      margin-left: 2px;
      animation: blink 1s infinite;
      vertical-align: middle;
    }
  `;
  document.head.appendChild(style);

  // 您的寄语文本
  const messageLines = [
    "> SYSTEM BOOT SEQUENCE INITIATED...",
    "> MEMORY CHECK: 64KB OK",
    "> CRT DISPLAY: ONLINE",
    "> TERMINAL READY",
    "",
    "> MESSAGE DECODING...",
    "",
    "验证通过。",
    "在被算法包围的世界里，",
    "很高兴看到你还保留着手动输入的探索欲。",
    "别让平庸的工具限制了你的想象力。",
    "科技老男孩，带你看见数据的另一面。",
    "",
    "> END OF TRANSMISSION",
    "> PRESS ANY KEY TO CONTINUE..."
  ];

  // 逐行显示文本
  function displayMessage() {
    terminal.style.opacity = '1';
    
    messageLines.forEach((line, index) => {
      setTimeout(() => {
        const lineElement = document.createElement('div');
        lineElement.className = 'crt-line';
        lineElement.textContent = line;
        
        if (line === '') {
          lineElement.style.height = '1.5rem';
        }
        
        terminal.appendChild(lineElement);
        
        // 添加光标到最后一行
        if (index === messageLines.length - 1) {
          setTimeout(() => {
            const cursor = document.createElement('span');
            cursor.className = 'cursor';
            lineElement.appendChild(cursor);
          }, 3000);
        }
      }, index * 800);
    });
  }

  // 初始闪烁后开始显示
  setTimeout(() => {
    displayMessage();
  }, 2500);

  // 点击关闭效果
  crtContainer.addEventListener('click', function() {
    crtContainer.style.opacity = '0';
    crtContainer.style.transition = 'opacity 0.5s ease';
    
    setTimeout(() => {
      document.body.removeChild(crtContainer);
      document.head.removeChild(style);
      window.crtEffectActive = false;
    }, 500);
  });

  // 键盘事件也可以关闭
  document.addEventListener('keydown', function closeOnKey(e) {
    if (crtContainer.parentNode) {
      crtContainer.click();
      document.removeEventListener('keydown', closeOnKey);
    }
  });

  console.log('CRT效果已启动，点击屏幕或按任意键关闭');
})();