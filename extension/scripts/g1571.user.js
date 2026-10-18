(function() {
  'use strict';
  
  const SCRIPT_ID = 'april-fools-chaos-mode';
  
  if (document.getElementById(SCRIPT_ID)) {
    console.log('恶作剧已激活！');
    return;
  }

  const marker = document.createElement('div');
  marker.id = SCRIPT_ID;
  marker.style.display = 'none';
  document.body.appendChild(marker);

  // 霸气开屏劫持提示
  function showHijackScreen() {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      background-size: 400% 400%;
      z-index: 9999999;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: gradientWave 3s ease infinite;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    const message = document.createElement('div');
    message.style.cssText = `
      text-align: center;
      color: white;
      animation: scaleInBounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    `;

    message.innerHTML = `
      <div style="
        font-size: 80px;
        margin-bottom: 30px;
        animation: spin 2s linear infinite;
        display: inline-block;
      ">😈</div>
      <h1 style="
        font-size: 64px;
        font-weight: bold;
        text-shadow: 0 0 30px rgba(255,255,255,0.8), 0 0 60px rgba(255,100,100,0.6);
        margin: 0;
        letter-spacing: 3px;
        animation: glow 1.5s ease-in-out infinite;
      ">🎉 愚人节快乐！</h1>
      <p style="
        font-size: 48px;
        margin-top: 20px;
        font-weight: 600;
        text-shadow: 0 5px 15px rgba(0,0,0,0.3);
        animation: shake 0.5s infinite;
      ">页面已被劫持 😈</p>
      <div style="
        margin-top: 50px;
        font-size: 20px;
        opacity: 0.9;
        animation: pulse 2s infinite;
      ">
        <p>系统正在启动恶作剧模式...</p>
        <div style="
          width: 300px;
          height: 6px;
          background: rgba(255,255,255,0.3);
          border-radius: 10px;
          margin: 20px auto;
          overflow: hidden;
        ">
          <div style="
            width: 100%;
            height: 100%;
            background: white;
            border-radius: 10px;
            animation: loading 2s ease-in-out;
          "></div>
        </div>
      </div>
    `;

    overlay.appendChild(message);
    document.body.appendChild(overlay);

    // 2秒后自动消失，开始恶作剧
    setTimeout(() => {
      overlay.style.animation = 'fadeOutScale 0.5s ease-out';
      setTimeout(() => overlay.remove(), 500);
    }, 2500);
  }

  // 让所有元素随机倾斜
  function chaosMode() {
    const elements = document.querySelectorAll('div, p, h1, h2, h3, img, button, a');
    elements.forEach((el, index) => {
      if (index % 3 === 0) {
        const randomRotate = (Math.random() - 0.5) * 10;
        const randomScale = 0.95 + Math.random() * 0.1;
        el.style.transition = 'all 0.3s ease';
        el.style.transform = `rotate(${randomRotate}deg) scale(${randomScale})`;
      }
    });
  }

  // 彩虹模式
  function rainbowMode() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rainbow {
        0% { filter: hue-rotate(0deg); }
        100% { filter: hue-rotate(360deg); }
      }
      body * {
        animation: rainbow 5s linear infinite !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 自定义光标
  function customCursor() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">🤡</text></svg>'), auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  // 重力掉落效果
  function gravityDrop() {
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      setTimeout(() => {
        img.style.transition = 'all 2s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        img.style.transform = 'translateY(1000px) rotate(720deg)';
        img.style.opacity = '0';
        
        setTimeout(() => {
          img.style.transition = 'none';
          img.style.transform = '';
          img.style.opacity = '';
        }, 2000);
      }, index * 200);
    });
  }

  // 添加所有CSS动画
  const style = document.createElement('style');
  style.textContent = `
    @keyframes gradientWave {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes scaleInBounce {
      0% { transform: scale(0); opacity: 0; }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes glow {
      0%, 100% { 
        text-shadow: 0 0 30px rgba(255,255,255,0.8), 
                     0 0 60px rgba(255,100,100,0.6); 
      }
      50% { 
        text-shadow: 0 0 50px rgba(255,255,255,1), 
                     0 0 100px rgba(255,100,100,0.8),
                     0 0 150px rgba(255,50,50,0.6); 
      }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px) rotate(-1deg); }
      75% { transform: translateX(5px) rotate(1deg); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 0.8; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.02); }
    }
    @keyframes loading {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }
    @keyframes fadeOutScale {
      to { opacity: 0; transform: scale(1.2); }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes floatUp {
      to {
        transform: translateY(-100px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);

  // 执行恶作剧序列
  function executeAprilFools() {
    showHijackScreen();
    
    setTimeout(() => chaosMode(), 3000);
    setTimeout(() => customCursor(), 3500);
    setTimeout(() => rainbowMode(), 4000);
    setTimeout(() => gravityDrop(), 6000);
    
    // 添加点击特效
    document.addEventListener('click', (e) => {
      const emoji = document.createElement('div');
      emoji.textContent = ['🎉', '🎊', '🎈', '🎭', '🤡', '😜', '💥', '⭐'][Math.floor(Math.random() * 8)];
      emoji.style.cssText = `
        position: fixed;
        left: ${e.clientX}px;
        top: ${e.clientY}px;
        font-size: 30px;
        pointer-events: none;
        z-index: 999999;
        animation: floatUp 1s ease-out forwards;
      `;
      document.body.appendChild(emoji);
      
      setTimeout(() => emoji.remove(), 1000);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAprilFools);
  } else {
    executeAprilFools();
  }

  console.log('🎭 愚人节恶作剧模式已激活！刷新页面恢复正常~');
})();