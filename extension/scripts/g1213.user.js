(function() {
  // 防止重复执行
  if (window.hasFireworkEffect) return;
  window.hasFireworkEffect = true;

  function createFireworkEffect() {
    console.log('🎆 创建六一儿童节烟花效果...');

    // 创建Canvas画布
    const canvas = document.createElement('canvas');
    canvas.id = 'firework-canvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 999998;
    `;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 烟花粒子类
    class Particle {
      constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.radius = Math.random() * 3 + 1;
        this.speedX = Math.random() * 6 - 3;
        this.speedY = Math.random() * 6 - 3;
        this.life = 100;
        this.decay = Math.random() * 0.05 + 0.02;
        this.gravity = 0.1;
      }

      update() {
        this.speedY += this.gravity;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= this.decay * 100;
        this.radius *= 0.97;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
      }
    }

    // 烟花类
    class Firework {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.colors = [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
          '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
          '#F8B500', '#FF69B4', '#20B2AA', '#FFD700',
          '#FF6347', '#9370DB', '#32CD32', '#FF8C00'
        ];
        this.explode();
      }

      explode() {
        const particleCount = 100;
        const color = this.colors[Math.floor(Math.random() * this.colors.length)];
        
        for (let i = 0; i < particleCount; i++) {
          this.particles.push(new Particle(this.x, this.y, color));
        }
      }

      update() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
          this.particles[i].update();
          if (this.particles[i].life <= 0 || this.particles[i].radius <= 0.5) {
            this.particles.splice(i, 1);
          }
        }
      }

      draw() {
        this.particles.forEach(particle => particle.draw());
      }

      isDone() {
        return this.particles.length === 0;
      }
    }

    // 烟花管理器
    const fireworks = [];
    let lastFireworkTime = 0;

    // 创建祝福弹窗
    function createGreetingPopup() {
      const popup = document.createElement('div');
      popup.id = 'children-day-greeting';
      popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 30px;
        padding: 40px 60px;
        box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
        z-index: 999999;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        color: white;
        animation: popupIn 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        pointer-events: auto;
        border: 4px solid #FFD700;
        min-width: 300px;
      `;

      popup.innerHTML = `
        <style>
          @keyframes popupIn {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            70% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
          }
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
          }
          @keyframes sparkle {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        </style>
        <div style="position: absolute; top: -20px; left: 50%; transform: translateX(-50%); font-size: 40px; animation: float 2s ease-in-out infinite;">🎈</div>
        <div style="position: absolute; top: 10px; right: 20px; font-size: 30px; animation: sparkle 1s ease-in-out infinite;">✨</div>
        <div style="position: absolute; top: 10px; left: 20px; font-size: 30px; animation: sparkle 1s ease-in-out infinite 0.5s;">⭐</div>
        
        <div style="font-size: 48px; font-weight: bold; margin-bottom: 20px; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);">
          🎉 六一儿童节快乐！ 🎉
        </div>
        
        <div style="font-size: 28px; margin-bottom: 30px; line-height: 1.4; background: linear-gradient(45deg, #FFD700, #FF6B6B);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          font-weight: bold;">
          资讯君祝你
        </div>
        
        <div style="font-size: 22px; margin-bottom: 30px; color: #FFD700; line-height: 1.5;">
          永远保持童心<br>
          快乐每一天！
        </div>
        
        <button id="close-greeting" style="
          background: linear-gradient(45deg, #FFD700, #FF8C00);
          color: #333;
          border: none;
          border-radius: 50px;
          padding: 12px 40px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          transition: all 0.3s;
          margin-top: 10px;
        " onmouseover="this.style.transform='scale(1.05)';this.style.boxShadow='0 12px 25px rgba(0,0,0,0.4)'" 
        onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 8px 20px rgba(0,0,0,0.3)'">
          关闭祝福 ✨
        </button>
      `;

      document.body.appendChild(popup);

      // 添加关闭功能
      document.getElementById('close-greeting').onclick = function() {
        popup.style.animation = 'popupIn 0.5s reverse forwards';
        setTimeout(() => {
          popup.remove();
          cleanupAll();
        }, 500);
      };
    }

    // 动画循环
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 更新画布尺寸
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }

      // 创建新烟花
      const currentTime = Date.now();
      if (currentTime - lastFireworkTime > 500) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height * 0.7;
        fireworks.push(new Firework(x, y));
        lastFireworkTime = currentTime;
      }

      // 更新和绘制烟花
      for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update();
        fireworks[i].draw();
        
        if (fireworks[i].isDone()) {
          fireworks.splice(i, 1);
        }
      }

      // 绘制背景星星
      if (Math.random() < 0.3) {
        ctx.beginPath();
        ctx.arc(
          Math.random() * canvas.width,
          Math.random() * canvas.height * 0.3,
          Math.random() * 2,
          0, Math.PI * 2
        );
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fill();
      }

      requestAnimationFrame(animate);
    }

    // 清理所有效果
    function cleanupAll() {
      const canvas = document.getElementById('firework-canvas');
      const popup = document.getElementById('children-day-greeting');
      
      if (canvas) canvas.remove();
      if (popup) popup.remove();
      
      window.hasFireworkEffect = false;
    }

    // 窗口大小变化时更新
    window.addEventListener('resize', function() {
      const canvas = document.getElementById('firework-canvas');
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    });

    // 开始动画
    animate();
    
    // 延迟显示祝福弹窗
    setTimeout(createGreetingPopup, 1500);

    return {
      success: true,
      message: '六一儿童节烟花效果已启动',
      cleanup: cleanupAll
    };
  }

  // 执行烟花效果
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createFireworkEffect);
  } else {
    createFireworkEffect();
  }
})();