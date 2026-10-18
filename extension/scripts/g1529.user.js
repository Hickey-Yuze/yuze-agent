(function() {
  if (window.__fireworks_installed) return;
  window.__fireworks_installed = true;

  const canvas = document.createElement('canvas');
  canvas.id = '__fireworks_canvas';
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:99999;pointer-events:none;';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  let particles = [];
  let animating = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function isBlankArea(el) {
    if (!el || el === document || el === document.body || el === document.documentElement || el === canvas) return true;
    if (el.closest('a, button, [role="button"], input, textarea, select, .video-card, .pic, .cover, .b-img, .up-avatar, .follow-btn, .toolbar-left-item-wrap, .video-toolbar-left-item, .header-upload-entry, .nav-search-btn, .nav-search-input, .bili-avatar, .right-entry__outside, .default-entry, .download-entry, .left-entry__title, .van-popover, .bili-dialog, .van-dialog, [class*="card"], [class*="btn"], [class*="button"], [onclick]')) return false;
    const tag = el.tagName;
    if (['A', 'BUTTON', 'INPUT', 'TEXTAREA', 'SELECT', 'IMG', 'VIDEO', 'IFRAME', 'SVG'].includes(tag)) return false;
    return true;
  }

  class Particle {
    constructor(x, y, color) {
      this.x = x;
      this.y = y;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.alpha = 1;
      this.decay = Math.random() * 0.015 + 0.01;
      this.color = color;
      this.size = Math.random() * 3 + 1.5;
      this.trail = [];
    }

    update() {
      this.trail.push({ x: this.x, y: this.y, alpha: this.alpha * 0.4 });
      if (this.trail.length > 5) this.trail.shift();
      this.vy += 0.04;
      this.vx *= 0.99;
      this.vy *= 0.99;
      this.x += this.vx;
      this.y += this.vy;
      this.alpha -= this.decay;
    }

    draw() {
      this.trail.forEach((p, i) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, this.size * (i / this.trail.length) * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = this.color.replace('1)', `${p.alpha * 0.3})`);
        ctx.fill();
      });
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color.replace('1)', `${this.alpha})`);
      ctx.fill();
    }
  }

  class RisingSpark {
    constructor(x, targetY) {
      this.x = x;
      this.y = window.innerHeight;
      this.targetY = targetY;
      this.vy = -(Math.random() * 4 + 8);
      this.alpha = 1;
      this.trail = [];
    }

    update() {
      this.trail.push({ x: this.x, y: this.y, alpha: this.alpha });
      if (this.trail.length > 12) this.trail.shift();
      this.y += this.vy;
      this.vy += 0.12;
      if (this.vy >= -0.5 || this.y <= this.targetY) {
        return true;
      }
      return false;
    }

    draw() {
      for (let i = 0; i < this.trail.length; i++) {
        const t = this.trail[i];
        const ratio = i / this.trail.length;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 2 * ratio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,220,150,${ratio * 0.6})`;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,220,0.9)';
      ctx.fill();
    }
  }

  const palettes = [
    ['rgba(255,80,80,1)', 'rgba(255,160,60,1)', 'rgba(255,255,100,1)'],
    ['rgba(100,200,255,1)', 'rgba(150,100,255,1)', 'rgba(200,150,255,1)'],
    ['rgba(100,255,150,1)', 'rgba(50,255,200,1)', 'rgba(150,255,100,1)'],
    ['rgba(255,100,200,1)', 'rgba(255,150,255,1)', 'rgba(200,100,255,1)'],
    ['rgba(255,200,50,1)', 'rgba(255,130,50,1)', 'rgba(255,80,80,1)'],
    ['rgba(50,200,255,1)', 'rgba(50,255,200,1)', 'rgba(200,255,100,1)'],
  ];

  function createFirework(x, y) {
    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    const count = Math.floor(Math.random() * 40) + 50;
    for (let i = 0; i < count; i++) {
      const color = palette[Math.floor(Math.random() * palette.length)];
      particles.push(new Particle(x, y, color));
    }
  }

  let risingSparks = [];

  function launchFirework(x, y) {
    risingSparks.push(new RisingSpark(x, y));
    if (!animating) {
      animating = true;
      animate();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = risingSparks.length - 1; i >= 0; i--) {
      const spark = risingSparks[i];
      const exploded = spark.update();
      spark.draw();
      if (exploded) {
        createFirework(spark.x, spark.y);
        risingSparks.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.update();
      p.draw();
      if (p.alpha <= 0) {
        particles.splice(i, 1);
      }
    }

    if (particles.length > 0 || risingSparks.length > 0) {
      requestAnimationFrame(animate);
    } else {
      animating = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  document.addEventListener('click', (e) => {
    if (!isBlankArea(e.target)) return;
    launchFirework(e.clientX, e.clientY);
  }, true);
})();