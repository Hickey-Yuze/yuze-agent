(function() {
  // 防止重复执行
  if (window.japaneseAnimationRunning) return;
  window.japaneseAnimationRunning = true;

  function createJapaneseAnimation() {
    console.log('Executing Japanese animation...');
    
    // 1. 创建全屏覆盖层
    const overlay = document.createElement('div');
    overlay.id = 'japanese-animation-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9999;
      pointer-events: none;
      background: transparent;
      overflow: hidden;
    `;
    
    // 2. 创建樱花花瓣容器
    const petalsContainer = document.createElement('div');
    petalsContainer.style.cssText = `
      position: absolute;
      width: 100%;
      height: 100%;
    `;
    
    // 3. 创建书法文字
    const calligraphyText = document.createElement('div');
    calligraphyText.textContent = 'お疲れ様でした';
    calligraphyText.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0);
      font-family: 'Hiragino Mincho Pro', 'MS Mincho', serif;
      font-size: 4rem;
      font-weight: bold;
      color: #e9546b;
      opacity: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      transition: all 2s ease-out;
      z-index: 10;
    `;
    
    // 添加元素到页面
    overlay.appendChild(petalsContainer);
    overlay.appendChild(calligraphyText);
    document.body.appendChild(overlay);
    
    // 4. 添加动画关键帧
    if (!document.querySelector('#petal-animation-style')) {
      const style = document.createElement('style');
      style.id = 'petal-animation-style';
      style.textContent = `
        @keyframes petalFall {
          0% {
            transform: translateY(0) rotate(0deg) translateX(0);
            opacity: 0.8;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg) translateX(100px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    // 5. 生成樱花花瓣
    function createPetals(count = 100) {
      for (let i = 0; i < count; i++) {
        const petal = document.createElement('div');
        
        // 随机参数
        const rotation = Math.random() * 360;
        const leftPosition = Math.random() * 100;
        const fallDuration = 5 + Math.random() * 5;
        const delay = Math.random() * 3;
        const size = 15 + Math.random() * 15;
        
        petal.style.cssText = `
          position: absolute;
          width: ${size}px;
          height: ${size}px;
          background: radial-gradient(circle at 30% 30%, #ffb7c5, #ff6b9d);
          border-radius: 50% 50% 50% 0;
          transform: rotate(${rotation}deg);
          opacity: 0.8;
          top: -30px;
          left: ${leftPosition}%;
          animation: petalFall ${fallDuration}s linear infinite;
          animation-delay: ${delay}s;
        `;
        
        petalsContainer.appendChild(petal);
      }
    }
    
    // 6. 播放音效（可选）
    function playSound() {
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.volume = 0.3;
        audio.play().catch(e => console.log('音频播放需要用户交互:', e));
      } catch (e) {
        console.log('音频加载失败');
      }
    }
    
    // 7. 执行动画序列
    setTimeout(() => {
      createPetals(150);
      playSound();
      
      // 文字浮现动画
      setTimeout(() => {
        calligraphyText.style.opacity = '1';
        calligraphyText.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 1000);
      
      // 自动移除特效
      setTimeout(() => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 1s ease-out';
        setTimeout(() => {
          if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
            window.japaneseAnimationRunning = false;
          }
        }, 1000);
      }, 8000);
    }, 100);
  }
  
  // 立即执行动画
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createJapaneseAnimation);
  } else {
    createJapaneseAnimation();
  }
})();