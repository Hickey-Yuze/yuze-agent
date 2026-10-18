(function() {
  try {
    // Keep existing hammer cursor style
    const style = document.createElement('style');
    style.id = 'hammer-cursor-style';
    style.textContent = `
      body.hammer-hitting * {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><g transform="rotate(-45 32 32)"><text x="8" y="48" font-size="48">🔨</text></g></svg>') 32 32, auto !important;
        transition: none !important;
      }
      
      body:not(.hammer-hitting) * {
        cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><text x="8" y="48" font-size="48">🔨</text></svg>') 32 32, auto !important;
      }
      
      .spark-particle {
        position: fixed;
        pointer-events: none;
        z-index: 999999;
        font-size: 28px;
      }
      
      @keyframes sparkle {
        0% {
          transform: translate(0, 0) scale(1) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(var(--tx), var(--ty)) scale(0) rotate(360deg);
          opacity: 0;
        }
      }
      
      /* 核心修改：放大mole容器尺寸，从120px改为200px（可自行调整） */
      .mole-target {
        position: fixed;
        width: 200px;    /* 原120px → 改为200px，可根据需要调整更大（如250/300） */
        height: 200px;   /* 原120px → 改为200px，保持宽高比一致 */
        cursor: pointer;
        z-index: 999990;
        transition: transform 0.3s ease-out, opacity 0.3s ease-out;
      }
      
      .mole-target img {
        width: 100%;     /* 保持100%让图片充满容器 */
        height: 100%;    /* 保持100%让图片充满容器 */
        object-fit: contain; /* 保证图片完整显示，不拉伸变形 */
        pointer-events: none;
      }
      
      .mole-target.appearing {
        animation: moleAppear 0.4s ease-out;
      }
      
      @keyframes moleAppear {
        0% {
          transform: translateY(100px) scale(0.5);
          opacity: 0;
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }
      
      .mole-target.hit {
        animation: moleHit 0.3s ease-out forwards;
      }
      
      @keyframes moleHit {
        0% {
          transform: scale(1) rotateZ(0deg);
        }
        50% {
          transform: scale(1, 0.3) rotateZ(5deg);
        }
        100% {
          transform: scale(0) rotateZ(15deg);
          opacity: 0;
        }
      }
    `;
    
    const existingStyle = document.getElementById('hammer-cursor-style');
    if (existingStyle) {
      existingStyle.remove();
    }
    
    document.head.appendChild(style);
    
    // Create sparkles effect
    const createSparkles = (x, y) => {
      document.body.classList.add('hammer-hitting');
      
      setTimeout(() => {
        document.body.classList.remove('hammer-hitting');
      }, 150);
      
      const hammerHeadX = x - 15;
      const hammerHeadY = y - 20;
      
      const particles = ['✨', '⭐', '💥', '✦', '★', '☆', '◆', '◇', '💫', '🌟', '⚡', '🔥', '💢'];
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#FF69B4', '#FFFF00', '#FF4500', '#FFE4B5', '#FFF700', '#FF1493'];
      
      const particleCount = 25 + Math.floor(Math.random() * 10);
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'spark-particle';
        particle.textContent = particles[Math.floor(Math.random() * particles.length)];
        particle.style.left = hammerHeadX + 'px';
        particle.style.top = hammerHeadY + 'px';
        particle.style.color = colors[Math.floor(Math.random() * colors.length)];
        
        const baseAngle = -Math.PI / 2;
        const spreadAngle = Math.PI * 1.2;
        const angle = baseAngle - spreadAngle / 2 + (spreadAngle * i) / particleCount + (Math.random() - 0.5) * 0.4;
        const velocity = 80 + Math.random() * 140;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        particle.style.setProperty('--tx', tx + 'px');
        particle.style.setProperty('--ty', ty + 'px');
        particle.style.animation = `sparkle ${0.7 + Math.random() * 0.5}s ease-out forwards`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
          particle.remove();
        }, 1300);
      }
      
      const flash = document.createElement('div');
      flash.style.cssText = `
        position: fixed;
        left: ${hammerHeadX - 60}px;
        top: ${hammerHeadY - 60}px;
        width: 120px;
        height: 120px;
        background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,220,0,0.7) 30%, rgba(255,100,0,0.4) 60%, transparent 85%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 999998;
        animation: flashFade 0.5s ease-out forwards;
      `;
      
      const flashStyle = document.createElement('style');
      flashStyle.textContent = `
        @keyframes flashFade {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(3.5); opacity: 0; }
        }
      `;
      
      if (!document.getElementById('flash-animation-style')) {
        flashStyle.id = 'flash-animation-style';
        document.head.appendChild(flashStyle);
      }
      
      document.body.appendChild(flash);
      setTimeout(() => flash.remove(), 500);
      
      for (let i = 0; i < 2; i++) {
        setTimeout(() => {
          const ring = document.createElement('div');
          ring.style.cssText = `
            position: fixed;
            left: ${hammerHeadX - 40}px;
            top: ${hammerHeadY - 40}px;
            width: 80px;
            height: 80px;
            border: 3px solid rgba(255, 200, 0, 0.8);
            border-radius: 50%;
            pointer-events: none;
            z-index: 999997;
            animation: shockwave 0.6s ease-out forwards;
          `;
          
          const shockwaveStyle = document.createElement('style');
          shockwaveStyle.textContent = `
            @keyframes shockwave {
              0% { transform: scale(0.5); opacity: 1; }
              100% { transform: scale(3); opacity: 0; }
            }
          `;
          
          if (!document.getElementById('shockwave-animation-style')) {
            shockwaveStyle.id = 'shockwave-animation-style';
            document.head.appendChild(shockwaveStyle);
          }
          
          document.body.appendChild(ring);
          setTimeout(() => ring.remove(), 600);
        }, i * 100);
      }
    };
    
    // Whack-a-mole game logic
    let currentMole = null;
    
    const getRandomPosition = () => {
      const margin = 150; // 可适当调大margin，避免放大后的mole超出屏幕
      const maxX = window.innerWidth - margin;
      const maxY = window.innerHeight - margin;
      const x = margin + Math.random() * (maxX - margin);
      const y = margin + Math.random() * (maxY - margin);
      return { x, y };
    };
    
    const createMole = () => {
      // Remove existing mole if any
      if (currentMole && currentMole.parentNode) {
        currentMole.remove();
      }
      
      const mole = document.createElement('div');
      mole.className = 'mole-target appearing';
      
      const img = document.createElement('img');
      // 尝试加载你的 GIF，同时配置跨域
      img.src = "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHJjdm0wOTZ0OWR3YzNrNjZzMjZnOGVwaWdkbDE1Mnhkb21zOHV6diZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/D2psA529P4sXJP5Afw/giphy.gif";
      img.crossOrigin = "anonymous";
      img.referrerPolicy = "no-referrer";
      img.alt = "Target";

      mole.appendChild(img);
      
      const pos = getRandomPosition();
      mole.style.left = pos.x + 'px';
      mole.style.top = pos.y + 'px';
      
      document.body.appendChild(mole);
      currentMole = mole;
      
      // Handle mole click
      mole.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Get click position
        const rect = mole.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create sparkles at mole position
        createSparkles(centerX, centerY);
        
        // Hit animation
        mole.classList.add('hit');
        
        // Create new mole after hit animation
        setTimeout(() => {
          mole.remove();
          createMole();
        }, 300);
      });
    };
    
    // Remove existing click handler for regular clicks
    if (window.__hammerClickHandler) {
      document.removeEventListener('click', window.__hammerClickHandler);
    }
    
    // Add click handler only for non-mole clicks
    const clickHandler = (e) => {
      // Only trigger sparkles if not clicking on mole
      if (!e.target.closest('.mole-target')) {
        createSparkles(e.clientX, e.clientY);
      }
    };
    
    window.__hammerClickHandler = clickHandler;
    document.addEventListener('click', clickHandler);
    
    // Start the game
    createMole();
    
    // Store reference for cleanup
    window.__currentMole = currentMole;
    
    return {
      success: true,
      message: 'Whack-a-mole game started! Hit the target with your hammer! 🔨🎯',
      timestamp: Date.now()
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})();