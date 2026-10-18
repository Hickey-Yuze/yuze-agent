(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    // 沉浸式鼠标光感效果 - Immersive Mouse Glow Effect
    (function() {
      // 防止重复注入
      if (window.__mouseGlowEffect) return;
      window.__mouseGlowEffect = true;
    
      const config = {
        layers: [
          { size: 640, color: 'rgba(200, 160, 255, 0.06)', transition: '1.2s', blur: '0px' },
          { size: 380, color: 'rgba(255, 190, 80, 0.13)', transition: '0.7s', blur: '0px' },
          { size: 200, color: 'rgba(255, 220, 140, 0.35)', transition: '0.3s', blur: '0px' },
          { size: 70, color: 'rgba(255, 245, 220, 0.9)', transition: '0.08s', blur: '30px' },
          { size: 16, color: 'rgba(255, 255, 250, 0.95)', transition: '0.03s', blur: '8px' }
        ],
        particleCount: 150,
        particleColors: ['#FFD700', '#FFA500', '#FF8C00', '#FFE4B5'],
        rippleColor: 'rgba(255, 210, 140, 0.35)',
        smoothingFactor: 0.35
      };
    
      let mouseX = -999;
      let mouseY = -999;
      let targetX = -999;
      let targetY = -999;
      let prevX = -999;
      let prevY = -999;
      let isOnScreen = false;
    
      // 创建光晕层
      function createGlowLayers() {
        const container = document.createElement('div');
        container.id = 'mouse-glow-container';
        container.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2147483647;
          overflow: hidden;
        `;
    
        config.layers.forEach((layer, index) => {
          const glow = document.createElement('div');
          glow.id = `glow-layer-${index}`;
          glow.style.cssText = `
            position: absolute;
            width: ${layer.size}px;
            height: ${layer.size}px;
            border-radius: 50%;
            background: radial-gradient(circle,
              ${layer.color} 0%,
              transparent 70%
            );
            filter: blur(${layer.blur});
            transform: translate(-50%, -50%);
            left: ${mouseX}px;
            top: ${mouseY}px;
            opacity: 0;
            transition: left ${layer.transition} cubic-bezier(0.16, 1, 0.3, 1),
                        top ${layer.transition} cubic-bezier(0.16, 1, 0.3, 1),
                        opacity 0.5s ease-out;
            will-change: transform, opacity;
          `;
          
          // 为最内层添加额外发光
          if (index === 3) {
            glow.style.boxShadow = `
              0 0 30px rgba(255, 220, 150, 0.5),
              0 0 80px rgba(255, 180, 80, 0.25),
              0 0 140px rgba(255, 150, 40, 0.12)
            `;
          }
          if (index === 4) {
            glow.style.boxShadow = `
              0 0 8px rgba(255, 255, 240, 0.7),
              0 0 20px rgba(255, 220, 150, 0.4)
            `;
          }
          
          container.appendChild(glow);
        });
    
        document.body.appendChild(container);
        return container.querySelectorAll('[id^="glow-layer-"]');
      }
    
      // 创建粒子画布
      function createParticleCanvas() {
        const canvas = document.createElement('canvas');
        canvas.id = 'particle-canvas';
        canvas.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2147483646;
        `;
        document.body.appendChild(canvas);
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth * (window.devicePixelRatio || 1);
        canvas.height = window.innerHeight * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        
        return { canvas, ctx };
      }
    
      // 粒子系统
      class ParticleSystem {
        constructor(ctx, canvas) {
          this.ctx = ctx;
          this.canvas = canvas;
          this.particles = [];
          this.maxParticles = config.particleCount;
        }
    
        spawn(x, y, speed) {
          if (this.particles.length >= this.maxParticles) return;
          
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * speed * 2 + 15;
          const colorIndex = Math.floor(Math.random() * config.particleColors.length);
          
          this.particles.push({
            x,
            y,
            vx: Math.cos(angle) * dist,
            vy: Math.sin(angle) * dist,
            life: 0.5 + Math.random() * 0.9,
            maxLife: 0.5 + Math.random() * 0.9,
            size: Math.random() * 3 + 1.2,
            color: config.particleColors[colorIndex]
          });
        }
    
        update(dt) {
          for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
            
            if (p.life <= 0) {
              this.particles.splice(i, 1);
            }
          }
        }
    
        draw() {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
          
          for (const p of this.particles) {
            const alpha = Math.max(0, p.life / p.maxLife);
            const size = p.size * (0.4 + 0.6 * alpha);
            
            // 主粒子
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color.replace(')', `, ${alpha * 0.7})`).replace('rgb', 'rgba');
            if (!this.ctx.fillStyle.includes('rgba')) {
              this.ctx.fillStyle = `rgba(${this.hexToRgb(p.color)}, ${alpha * 0.7})`;
            }
            this.ctx.fill();
    
            // 光晕
            if (size > 1.5) {
              this.ctx.beginPath();
              this.ctx.arc(p.x, p.y, size * 2.5, 0, Math.PI * 2);
              this.ctx.fillStyle = `rgba(255, 180, 80, ${alpha * 0.15})`;
              this.ctx.fill();
            }
          }
        }
    
        hexToRgb(hex) {
          const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
          return result ? 
            `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
            '255, 200, 100';
        }
      }
    
      // 波纹系统
      class RippleSystem {
        constructor(ctx) {
          this.ctx = ctx;
          this.ripples = [];
        }
    
        spawn(x, y) {
          this.ripples.push({
            x,
            y,
            radius: 0,
            maxRadius: 180,
            life: 0.9,
            maxLife: 0.9
          });
        }
    
        update(dt) {
          for (let i = this.ripples.length - 1; i >= 0; i--) {
            const r = this.ripples[i];
            r.radius += 320 * dt;
            r.life -= dt;
            
            if (r.life <= 0) {
              this.ripples.splice(i, 1);
            }
          }
        }
    
        draw() {
          for (const r of this.ripples) {
            const alpha = Math.max(0, r.life / r.maxLife);
            const progress = r.radius / r.maxRadius;
            
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = config.rippleColor.replace(/[\d.]+\)$/, `${alpha * 0.35 * (1 - progress)})`);
            this.ctx.lineWidth = 1.5 * (1 - progress);
            this.ctx.stroke();
          }
        }
      }
    
      // 初始化系统
      const glowLayers = createGlowLayers();
      const { canvas: particleCanvas, ctx: particleCtx } = createParticleCanvas();
      const particleSystem = new ParticleSystem(particleCtx, particleCanvas);
      const rippleSystem = new RippleSystem(particleCtx);
    
      // 鼠标事件处理
      function onMouseMove(e) {
        targetX = e.clientX;
        targetY = e.clientY;
        
        if (!isOnScreen) {
          mouseX = targetX;
          mouseY = targetY;
          prevX = targetX;
          prevY = targetY;
          isOnScreen = true;
          showGlows();
        }
      }
    
      function onMouseLeave() {
        isOnScreen = false;
        hideGlows();
      }
    
      function onMouseEnter(e) {
        targetX = e.clientX;
        targetY = e.clientY;
        mouseX = targetX;
        mouseY = targetY;
        prevX = targetX;
        prevY = targetY;
        isOnScreen = true;
        showGlows();
      }
    
      function onClick(e) {
        rippleSystem.spawn(e.clientX, e.clientY);
      }
    
      function onTouchMove(e) {
        if (e.touches.length > 0) {
          targetX = e.touches[0].clientX;
          targetY = e.touches[0].clientY;
          
          if (!isOnScreen) {
            mouseX = targetX;
            mouseY = targetY;
            prevX = targetX;
            prevY = targetY;
            isOnScreen = true;
            showGlows();
          }
        }
      }
    
      function onTouchEnd() {
        isOnScreen = false;
        hideGlows();
      }
    
      function showGlows() {
        glowLayers.forEach(glow => {
          glow.style.opacity = '1';
        });
      }
    
      function hideGlows() {
        glowLayers.forEach(glow => {
          glow.style.opacity = '0';
        });
      }
    
      // 动画循环
      let lastTime = performance.now();
      let spawnTimer = 0;
    
      function animate(currentTime) {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;
    
        // 平滑鼠标位置
        mouseX += (targetX - mouseX) * config.smoothingFactor;
        mouseY += (targetY - mouseY) * config.smoothingFactor;
    
        // 计算速度
        const dx = mouseX - prevX;
        const dy = mouseY - prevY;
        const speed = Math.sqrt(dx * dx + dy * dy);
        prevX = mouseX;
        prevY = mouseY;
    
        // 更新光晕位置
        if (isOnScreen) {
          glowLayers.forEach((glow, index) => {
            glow.style.left = `${mouseX}px`;
            glow.style.top = `${mouseY}px`;
          });
    
          // 生成粒子
          spawnTimer += dt;
          const spawnRate = Math.max(3, speed * 0.35);
          const spawnInterval = 1 / spawnRate;
          
          while (spawnTimer >= spawnInterval) {
            spawnTimer -= spawnInterval;
            particleSystem.spawn(mouseX, mouseY, speed);
          }
        }
    
        // 更新和绘制粒子与波纹
        particleSystem.update(dt);
        particleSystem.draw();
        rippleSystem.update(dt);
        rippleSystem.draw();
    
        requestAnimationFrame(animate);
      }
    
      // 绑定事件
      document.addEventListener('mousemove', onMouseMove, { passive: true });
      document.addEventListener('mouseleave', onMouseLeave);
      document.addEventListener('mouseenter', onMouseEnter);
      document.addEventListener('click', onClick);
      window.addEventListener('touchmove', onTouchMove, { passive: true });
      window.addEventListener('touchend', onTouchEnd);
    
      // 窗口大小变化时调整画布
      window.addEventListener('resize', () => {
        particleCanvas.width = window.innerWidth * (window.devicePixelRatio || 1);
        particleCanvas.height = window.innerHeight * (window.devicePixelRatio || 1);
        particleCtx.setTransform(1, 0, 0, 1, 0, 0);
        particleCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      });
    
      // 启动动画
      requestAnimationFrame(animate);
    
      // 返回控制接口
      return {
        destroy: () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseleave', onMouseLeave);
          document.removeEventListener('mouseenter', onMouseEnter);
          document.removeEventListener('click', onClick);
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          
          const container = document.getElementById('mouse-glow-container');
          if (container) container.remove();
          if (particleCanvas) particleCanvas.remove();
          
          delete window.__mouseGlowEffect;
        },
        getConfig: () => config,
        updateConfig: (newConfig) => Object.assign(config, newConfig)
      };
    })()
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();