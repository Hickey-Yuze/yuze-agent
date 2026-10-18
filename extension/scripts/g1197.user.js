/**
 * ✨ Web Brush - 网页画笔脚本
 * 可在任何网页上使用的精美动画画笔工具
 */
(function () {
  'use strict';

  // ==================== 配置 ====================
  const CONFIG = {
    maxParticles: 500,
    particleLife: { min: 0.5, max: 2.5 },
    trailLength: 20,
    defaultBrushSize: 4,
    defaultOpacity: 1,
    defaultFlow: 1,
    colors: {
      bg: '#1a1a2e',
      panel: '#16213e',
      panelBorder: '#0f3460',
      accent: '#e94560',
      neonBlue: '#00d2ff',
      neonGreen: '#0fff95',
      neonPink: '#ff00ff',
      neonYellow: '#fff200',
      text: '#e0e0e0',
      textDim: '#888',
    },
    brushTypes: [
      { id: 'pencil', name: '铅笔', icon: '✏️' },
      { id: 'calligraphy', name: '毛笔', icon: '🖌️' },
      { id: 'spray', name: '喷枪', icon: '💨' },
      { id: 'watercolor', name: '水彩', icon: '🎨' },
      { id: 'particle', name: '粒子', icon: '✨' },
      { id: 'flame', name: '火焰', icon: '🔥' },
      { id: 'glow', name: '流光', icon: '🌟' },
      { id: 'starry', name: '星空', icon: '⭐' },
      { id: 'ripple', name: '水波纹', icon: '💧' },
      { id: 'rainbow', name: '彩虹', icon: '🌈' },
      { id: 'neon', name: '霓虹', icon: '💡' },
      { id: 'mosaic', name: '马赛克', icon: '🔳' },
      { id: 'eraser', name: '橡皮擦', icon: '🧹' },
    ],
    palette: [
      '#ff0000', '#ff4500', '#ff8c00', '#ffd700', '#adff2f',
      '#00ff00', '#00fa9a', '#00ffff', '#1e90ff', '#0000ff',
      '#8a2be2', '#ff00ff', '#ff1493', '#ffffff', '#000000',
    ],
  };

  // ==================== 工具函数 ====================
  const Utils = {
    lerp(a, b, t) { return a + (b - a) * t; },
    rand(min, max) { return Math.random() * (max - min) + min; },
    randInt(min, max) { return Math.floor(this.rand(min, max + 1)); },
    dist(x1, y1, x2, y2) { return Math.hypot(x2 - x1, y2 - y1); },
    clamp(v, min, max) { return Math.min(Math.max(v, min), max); },
    hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    },
    rgbToHsl(r, g, b) {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;
      if (max === min) { h = s = 0; }
      else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      return { h: h * 360, s, l };
    },
    hslToHex(h, s, l) {
      s /= 100; l /= 100;
      const a = s * Math.min(l, 1 - l);
      const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
      };
      return `#${f(0)}${f(8)}${f(4)}`;
    },
  };

  // ==================== 对象池 ====================
  class ObjectPool {
    constructor(factory, reset, initialSize = 100) {
      this.factory = factory;
      this.reset = reset;
      this.pool = [];
      this.active = [];
      for (let i = 0; i < initialSize; i++) {
        this.pool.push(factory());
      }
    }
    get() {
      const obj = this.pool.length > 0 ? this.pool.pop() : this.factory();
      this.active.push(obj);
      return obj;
    }
    release(obj) {
      const idx = this.active.indexOf(obj);
      if (idx !== -1) this.active.splice(idx, 1);
      this.reset(obj);
      this.pool.push(obj);
    }
    releaseAll() {
      while (this.active.length > 0) {
        const obj = this.active.pop();
        this.reset(obj);
        this.pool.push(obj);
      }
    }
    getActive() { return this.active; }
  }

  // ==================== 粒子系统 ====================
  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
      this.life = 0; this.maxLife = 1; this.size = 1;
      this.color = '#fff'; this.alpha = 1; this.active = false;
      this.gravity = 0; this.friction = 1; this.rotation = 0;
      this.rotationSpeed = 0; this.type = 'circle';
    }
  }

  class ParticleSystem {
    constructor() {
      this.pool = new ObjectPool(
        () => new Particle(),
        (p) => p.reset(),
        CONFIG.maxParticles
      );
      this.attractors = [];
    }

    emit(x, y, count, options = {}) {
      const particles = [];
      for (let i = 0; i < count; i++) {
        if (this.pool.active.length >= CONFIG.maxParticles) break;
        const p = this.pool.get();
        const angle = options.angle ?? Utils.rand(0, Math.PI * 2);
        const speed = options.speed ?? Utils.rand(1, 5);
        p.x = x + (options.spread ?? 0) * Utils.rand(-1, 1);
        p.y = y + (options.spread ?? 0) * Utils.rand(-1, 1);
        p.vx = Math.cos(angle) * speed + (options.baseVx || 0);
        p.vy = Math.sin(angle) * speed + (options.baseVy || 0);
        p.life = 0;
        p.maxLife = options.life ?? Utils.rand(CONFIG.particleLife.min, CONFIG.particleLife.max);
        p.size = options.size ?? Utils.rand(1, 4);
        p.color = options.color || '#fff';
        p.alpha = options.alpha ?? 1;
        p.gravity = options.gravity ?? 0;
        p.friction = options.friction ?? 0.98;
        p.rotation = Utils.rand(0, Math.PI * 2);
        p.rotationSpeed = options.rotationSpeed ?? Utils.rand(-0.1, 0.1);
        p.type = options.type || 'circle';
        p.active = true;
        p.sizeEnd = options.sizeEnd ?? 0;
        p.alphaEnd = options.alphaEnd ?? 0;
        particles.push(p);
      }
      return particles;
    }

    update(dt) {
      const toRemove = [];
      for (const p of this.pool.getActive()) {
        if (!p.active) continue;
        p.life += dt;
        if (p.life >= p.maxLife) {
          p.active = false;
          toRemove.push(p);
          continue;
        }
        const t = p.life / p.maxLife;
        p.vx *= p.friction;
        p.vy *= p.friction;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.alpha = Utils.lerp(p.alpha, p.alphaEnd, t);
        p.size = Utils.lerp(p.size, p.sizeEnd, t);

        for (const a of this.attractors) {
          const dx = a.x - p.x, dy = a.y - p.y;
          const d = Math.max(Utils.dist(p.x, p.y, a.x, a.y), 10);
          const force = a.strength / (d * d);
          p.vx += (dx / d) * force;
          p.vy += (dy / d) * force;
        }
      }
      for (const p of toRemove) this.pool.release(p);
    }

    render(ctx) {
      for (const p of this.pool.getActive()) {
        if (!p.active || p.alpha <= 0 || p.size <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Utils.clamp(p.alpha, 0, 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        if (p.type === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(p.size, 0.1), 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        } else if (p.type === 'star') {
          this._drawStar(ctx, 0, 0, 5, p.size, p.size / 2, p.color);
        } else if (p.type === 'spark') {
          ctx.beginPath();
          ctx.moveTo(-p.size, 0);
          ctx.lineTo(p.size, 0);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(p.size / 3, 0.5);
          ctx.stroke();
        } else if (p.type === 'glow') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * 2);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }

        ctx.restore();
      }
    }

    _drawStar(ctx, cx, cy, spikes, outerR, innerR, color) {
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const r = i % 2 === 0 ? outerR : innerR;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    clear() { this.pool.releaseAll(); this.attractors = []; }
  }

  // ==================== 画笔引擎 ====================
  class BrushEngine {
    constructor(canvas, particleSystem) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = particleSystem;
      this.brushType = 'pencil';
      this.size = CONFIG.defaultBrushSize;
      this.opacity = CONFIG.defaultOpacity;
      this.flow = CONFIG.defaultFlow;
      this.color = '#00d2ff';
      this.isDrawing = false;
      this.lastX = 0;
      this.lastY = 0;
      this.lastTime = 0;
      this.velocity = 0;
      this.hueOffset = 0;
      this.pressure = 1;
      this.points = [];
    }

    startStroke(x, y, pressure = 1) {
      this.isDrawing = true;
      this.lastX = x;
      this.lastY = y;
      this.lastTime = performance.now();
      this.velocity = 0;
      this.pressure = pressure;
      this.points = [{ x, y, pressure, time: this.lastTime }];
    }

    continueStroke(x, y, pressure = 1) {
      if (!this.isDrawing) return;
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      const dist = Utils.dist(this.lastX, this.lastY, x, y);
      this.velocity = dt > 0 ? dist / dt : 0;
      this.pressure = pressure;

      this.points.push({ x, y, pressure, time: now });

      switch (this.brushType) {
        case 'pencil': this._drawPencil(x, y); break;
        case 'calligraphy': this._drawCalligraphy(x, y); break;
        case 'spray': this._drawSpray(x, y); break;
        case 'watercolor': this._drawWatercolor(x, y); break;
        case 'particle': this._drawParticle(x, y); break;
        case 'flame': this._drawFlame(x, y); break;
        case 'glow': this._drawGlow(x, y); break;
        case 'starry': this._drawStarry(x, y); break;
        case 'ripple': this._drawRipple(x, y); break;
        case 'rainbow': this._drawRainbow(x, y); break;
        case 'neon': this._drawNeon(x, y); break;
        case 'mosaic': this._drawMosaic(x, y); break;
        case 'eraser': this._drawEraser(x, y); break;
      }

      // 鼠标尾迹粒子
      if (this.brushType !== 'eraser') {
        this._emitTrailParticles(x, y);
      }

      this.lastX = x;
      this.lastY = y;
      this.lastTime = now;
    }

    endStroke() {
      this.isDrawing = false;
      this.hueOffset = 0;
      this.points = [];
    }

    // --- 铅笔 ---
    _drawPencil(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * this.pressure;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    // --- 毛笔 ---
    _drawCalligraphy(x, y) {
      const ctx = this.ctx;
      const speed = Math.min(this.velocity / 500, 1);
      const width = this.size * (1 - speed * 0.6) * this.pressure * 2;

      ctx.save();
      ctx.globalAlpha = this.opacity * (0.6 + 0.4 * (1 - speed));
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(width, 1);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (this.points.length >= 3) {
        const p = this.points;
        const p1 = p[p.length - 3];
        const p2 = p[p.length - 2];
        const p3 = p[p.length - 1];
        const cx1 = (p1.x + p2.x) / 2;
        const cy1 = (p1.y + p2.y) / 2;
        const cx2 = (p2.x + p3.x) / 2;
        const cy2 = (p2.y + p3.y) / 2;
        ctx.beginPath();
        ctx.moveTo(cx1, cy1);
        ctx.quadraticCurveTo(p2.x, p2.y, cx2, cy2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      ctx.restore();
    }

    // --- 喷枪 ---
    _drawSpray(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const density = Math.floor(this.size * 3 * this.flow);
      for (let i = 0; i < density; i++) {
        const angle = Utils.rand(0, Math.PI * 2);
        const radius = Utils.rand(0, this.size * 2 * this.pressure);
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        ctx.globalAlpha = this.opacity * Utils.rand(0.1, 0.5);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(px, py, Utils.rand(0.5, 1.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // --- 水彩 ---
    _drawWatercolor(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      for (let i = 0; i < 3; i++) {
        const offsetX = Utils.rand(-this.size, this.size) * 0.5;
        const offsetY = Utils.rand(-this.size, this.size) * 0.5;
        const r = this.size * Utils.rand(0.8, 1.5) * this.pressure;
        ctx.globalAlpha = this.opacity * 0.05 * this.flow;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, Math.max(r, 1), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // --- 粒子画笔 ---
    _drawParticle(x, y) {
      const ctx = this.ctx;
      const rgb = Utils.hexToRgb(this.color);
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const coreSize = this.size * this.pressure;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, coreSize);
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${this.opacity})`);
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, coreSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      const count = Math.floor(this.size * this.flow * 2);
      for (let i = 0; i < count; i++) {
        const c = `rgba(${rgb.r + Utils.randInt(-20, 20)},${rgb.g + Utils.randInt(-20, 20)},${rgb.b + Utils.randInt(-20, 20)},1)`;
        this.ps.emit(x, y, 1, {
          angle: Utils.rand(0, Math.PI * 2),
          speed: Utils.rand(0.5, 4),
          life: Utils.rand(0.5, 2),
          size: Utils.rand(1, this.size * 0.8),
          sizeEnd: 0,
          color: c,
          alpha: this.opacity,
          alphaEnd: 0,
          gravity: 0.02,
          friction: 0.97,
          type: 'glow',
        });
      }
    }

    // --- 火焰画笔 ---
    _drawFlame(x, y) {
      const ctx = this.ctx;
      const rgb = Utils.hexToRgb(this.color);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 绘制火焰核心
      const grad = ctx.createRadialGradient(x, y, 0, x, y, this.size * 2 * this.pressure);
      grad.addColorStop(0, `rgba(255,255,200,${this.opacity * 0.3})`);
      grad.addColorStop(0.4, `rgba(255,${Math.floor(rgb.g * 0.5)},0,${this.opacity * 0.2})`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, this.size * 2 * this.pressure, 0, Math.PI * 2);
      ctx.fill();

      // 发射火焰粒子
      for (let i = 0; i < Math.floor(this.size * 0.8 * this.flow); i++) {
        const life = Utils.rand(0.3, 1.2);
        const flameColors = [
          `rgba(255,${Utils.randInt(80, 200)},0,1)`,
          `rgba(255,${Utils.randInt(40, 100)},0,1)`,
          `rgba(255,255,${Utils.randInt(100, 200)},1)`,
        ];
        this.ps.emit(x + Utils.rand(-3, 3), y, 1, {
          angle: Utils.rand(-Math.PI * 0.8, -Math.PI * 0.2),
          speed: Utils.rand(1, 4),
          life,
          size: Utils.rand(2, this.size * 1.2),
          sizeEnd: 0,
          color: flameColors[Utils.randInt(0, 2)],
          alpha: this.opacity,
          alphaEnd: 0,
          gravity: -0.15,
          friction: 0.96,
          type: 'glow',
        });
      }
      ctx.restore();
    }

    // --- 流光画笔 ---
    _drawGlow(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const rgb = Utils.hexToRgb(this.color);
      const width = this.size * this.pressure * 2;

      // 外发光
      const outerGrad = ctx.createRadialGradient(x, y, 0, x, y, width * 3);
      outerGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${this.opacity * 0.4})`);
      outerGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGrad;
      ctx.beginPath();
      ctx.arc(x, y, width * 3, 0, Math.PI * 2);
      ctx.fill();

      // 核心线
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${this.opacity})`;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.shadowColor = this.color;
      ctx.shadowBlur = width * 2;
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // 发射光粒子
      if (Math.random() < 0.5) {
        this.ps.emit(x, y, 1, {
          angle: Utils.rand(0, Math.PI * 2),
          speed: Utils.rand(0.3, 2),
          life: Utils.rand(0.5, 1.5),
          size: Utils.rand(1, 3),
          sizeEnd: 0,
          color: this.color,
          alpha: 0.8,
          alphaEnd: 0,
          friction: 0.95,
          type: 'glow',
        });
      }
      ctx.restore();
    }

    // --- 星空画笔 ---
    _drawStarry(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 绘制连线
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = this.opacity * 0.3;
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();

      // 发射星星粒子
      if (Math.random() < 0.4) {
        const starColors = ['#fff', '#ffe4b5', '#b0c4de', '#ffd700', '#87ceeb', this.color];
        this.ps.emit(x + Utils.rand(-10, 10), y + Utils.rand(-10, 10), 1, {
          angle: Utils.rand(0, Math.PI * 2),
          speed: Utils.rand(0.1, 1),
          life: Utils.rand(0.8, 3),
          size: Utils.rand(1, this.size * 1.5),
          sizeEnd: 0,
          color: starColors[Utils.randInt(0, starColors.length - 1)],
          alpha: 1,
          alphaEnd: 0,
          friction: 0.99,
          type: 'star',
        });
      }
      ctx.restore();
    }

    // --- 水波纹画笔 ---
    _drawRipple(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      const rgb = Utils.hexToRgb(this.color);
      const dist = Utils.dist(this.lastX, this.lastY, x, y);

      if (dist > this.size * 2) {
        const r = this.size * 3 * this.pressure;
        ctx.globalAlpha = this.opacity * 0.3;
        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.stroke();

        // 涟漪扩展粒子（用大圆模拟）
        this.ps.emit(x, y, 1, {
          speed: 0,
          life: 1.5,
          size: r,
          sizeEnd: r * 3,
          color: `rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`,
          alpha: this.opacity * 0.5,
          alphaEnd: 0,
          friction: 1,
          type: 'ripple',
        });
      }
      ctx.restore();
    }

    // --- 彩虹画笔 ---
    _drawRainbow(x, y) {
      this.hueOffset = (this.hueOffset + 2) % 360;
      const color = Utils.hslToHex(this.hueOffset, 100, 50);
      const ctx = this.ctx;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.strokeStyle = color;
      ctx.lineWidth = this.size * this.pressure;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = this.size;
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    // --- 霓虹画笔 ---
    _drawNeon(x, y) {
      const ctx = this.ctx;
      const rgb = Utils.hexToRgb(this.color);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 多层辉光
      const layers = [
        { width: this.size * 4 * this.pressure, alpha: 0.05 },
        { width: this.size * 3 * this.pressure, alpha: 0.1 },
        { width: this.size * 2 * this.pressure, alpha: 0.2 },
        { width: this.size * this.pressure, alpha: 0.8 },
        { width: this.size * 0.3 * this.pressure, alpha: 1 },
      ];

      for (const layer of layers) {
        ctx.globalAlpha = this.opacity * layer.alpha;
        ctx.strokeStyle = layer.alpha > 0.5 ? '#fff' : this.color;
        ctx.lineWidth = layer.width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.lastX, this.lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // --- 马赛克 ---
    _drawMosaic(x, y) {
      const ctx = this.ctx;
      const blockSize = Math.max(Math.round(this.size * 1.5), 4);
      const radius = this.size * 3 * this.pressure;

      // 计算影响区域（对齐到方块网格）
      const startX = Math.floor((x - radius) / blockSize) * blockSize;
      const startY = Math.floor((y - radius) / blockSize) * blockSize;
      const endX = Math.ceil((x + radius) / blockSize) * blockSize;
      const endY = Math.ceil((y + radius) / blockSize) * blockSize;

      const rgb = Utils.hexToRgb(this.color);

      ctx.save();

      for (let bx = startX; bx < endX; bx += blockSize) {
        for (let by = startY; by < endY; by += blockSize) {
          const blockCenterX = bx + blockSize / 2;
          const blockCenterY = by + blockSize / 2;
          const dist = Utils.dist(blockCenterX, blockCenterY, x, y);
          if (dist > radius) continue;

          // 每个方块颜色略有随机偏移，更自然
          const fade = 1 - (dist / radius);
          const rOff = Utils.randInt(-15, 15);
          ctx.globalAlpha = this.opacity * fade;
          ctx.fillStyle = `rgb(${Utils.clamp(rgb.r + rOff, 0, 255)},${Utils.clamp(rgb.g + rOff, 0, 255)},${Utils.clamp(rgb.b + rOff, 0, 255)})`;
          ctx.fillRect(bx, by, blockSize, blockSize);

          // 方块边框
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(bx, by, blockSize, blockSize);

          // 偶尔发射粒子
          if (Math.random() < 0.04 * this.flow) {
            this.ps.emit(blockCenterX, blockCenterY, 1, {
              angle: Utils.rand(0, Math.PI * 2),
              speed: Utils.rand(0.2, 1),
              life: Utils.rand(0.2, 0.6),
              size: Utils.rand(1, blockSize * 0.3),
              sizeEnd: 0,
              color: this.color,
              alpha: 0.5,
              alphaEnd: 0,
              friction: 0.94,
              type: 'circle',
            });
          }
        }
      }

      ctx.restore();
    }

    // --- 橡皮擦 ---
    _drawEraser(x, y) {
      const ctx = this.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
      ctx.lineWidth = this.size * 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(this.lastX, this.lastY);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.restore();
    }

    // 鼠标尾迹粒子
    _emitTrailParticles(x, y) {
      if (this.brushType === 'particle' || this.brushType === 'flame' ||
          this.brushType === 'starry' || this.brushType === 'ripple' ||
          this.brushType === 'mosaic') return;
      if (Math.random() < 0.3) {
        this.ps.emit(x, y, 1, {
          angle: Utils.rand(0, Math.PI * 2),
          speed: Utils.rand(0.2, 1.5),
          life: Utils.rand(0.3, 1),
          size: Utils.rand(0.5, 2),
          sizeEnd: 0,
          color: this.color,
          alpha: 0.6,
          alphaEnd: 0,
          friction: 0.95,
          type: 'glow',
        });
      }
    }
  }

  // ==================== 动画管理器 ====================
  class AnimationManager {
    constructor(canvas, particleSystem, brushEngine) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.ps = particleSystem;
      this.brush = brushEngine;
      this.running = false;
      this.lastTime = 0;
      this.backgroundEffects = [];
      this.activeBackground = null;
      this.bgParticles = [];
      this.rippleEffects = [];
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this._loop();
    }

    stop() { this.running = false; }

    _loop() {
      if (!this.running) return;
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.05);
      this.lastTime = now;

      this.ps.update(dt);
      this._updateRipples(dt);
      this._updateBackground(dt);
      this._render();

      requestAnimationFrame(() => this._loop());
    }

    _render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // 渲染背景效果
      this._renderBackground();

      // 渲染涟漪效果
      this._renderRipples();

      // 渲染粒子
      ctx.save();
      this.ps.render(ctx);
      ctx.restore();
    }

    // 涟漪效果管理
    addRipple(x, y) {
      this.rippleEffects.push({
        x, y, radius: 0, maxRadius: 60, alpha: 0.6, speed: 120, active: true,
      });
    }

    _updateRipples(dt) {
      for (let i = this.rippleEffects.length - 1; i >= 0; i--) {
        const r = this.rippleEffects[i];
        r.radius += r.speed * dt;
        r.alpha -= dt * 0.8;
        if (r.alpha <= 0 || r.radius >= r.maxRadius) {
          this.rippleEffects.splice(i, 1);
        }
      }
    }

    _renderRipples() {
      const ctx = this.ctx;
      for (const r of this.rippleEffects) {
        ctx.save();
        ctx.globalAlpha = Utils.clamp(r.alpha, 0, 1);
        ctx.strokeStyle = CONFIG.colors.neonBlue;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // 背景效果
    setBackground(type) {
      this.activeBackground = type;
      this.bgParticles = [];
      if (type === 'stars') this._initStarsBg();
      else if (type === 'snow') this._initSnowBg();
      else if (type === 'rain') this._initRainBg();
    }

    _initStarsBg() {
      for (let i = 0; i < 150; i++) {
        this.bgParticles.push({
          x: Utils.rand(0, this.canvas.width),
          y: Utils.rand(0, this.canvas.height),
          size: Utils.rand(0.8, 3),
          alpha: Utils.rand(0.4, 1),
          twinkleSpeed: Utils.rand(0.5, 2),
          phase: Utils.rand(0, Math.PI * 2),
        });
      }
    }

    _initSnowBg() {
      for (let i = 0; i < 120; i++) {
        this.bgParticles.push({
          x: Utils.rand(0, this.canvas.width),
          y: Utils.rand(0, this.canvas.height),
          size: Utils.rand(1.5, 5),
          speed: Utils.rand(20, 60),
          drift: Utils.rand(-15, 15),
          alpha: Utils.rand(0.4, 0.9),
        });
      }
    }

    _initRainBg() {
      for (let i = 0; i < 200; i++) {
        this.bgParticles.push({
          x: Utils.rand(0, this.canvas.width),
          y: Utils.rand(0, this.canvas.height),
          length: Utils.rand(15, 35),
          speed: Utils.rand(300, 500),
          alpha: Utils.rand(0.2, 0.5),
        });
      }
    }

    _updateBackground(dt) {
      if (!this.activeBackground) return;
      const w = this.canvas.width, h = this.canvas.height;

      if (this.activeBackground === 'snow') {
        for (const p of this.bgParticles) {
          p.y += p.speed * dt;
          p.x += p.drift * dt;
          if (p.y > h) { p.y = -5; p.x = Utils.rand(0, w); }
          if (p.x < 0) p.x = w;
          if (p.x > w) p.x = 0;
        }
      } else if (this.activeBackground === 'rain') {
        for (const p of this.bgParticles) {
          p.y += p.speed * dt;
          if (p.y > h) { p.y = -p.length; p.x = Utils.rand(0, w); }
        }
      } else if (this.activeBackground === 'stars') {
        for (const p of this.bgParticles) {
          p.phase += p.twinkleSpeed * dt;
        }
      }
    }

    _renderBackground() {
      if (!this.activeBackground) return;
      const ctx = this.ctx;
      ctx.save();

      // 半透明深色底色，让背景效果更明显
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      if (this.activeBackground === 'stars') {
        for (const p of this.bgParticles) {
          const a = (Math.sin(p.phase) + 1) / 2 * p.alpha;
          // 星星光晕
          ctx.globalAlpha = a * 0.3;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fill();
          // 星星核心
          ctx.globalAlpha = a;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.activeBackground === 'snow') {
        for (const p of this.bgParticles) {
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          // 雪花光晕
          ctx.globalAlpha = p.alpha * 0.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (this.activeBackground === 'rain') {
        ctx.strokeStyle = '#8ab4f8';
        ctx.lineWidth = 1.5;
        for (const p of this.bgParticles) {
          ctx.globalAlpha = p.alpha;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - 1, p.y + p.length);
          ctx.stroke();
        }
      }

      ctx.restore();
    }
  }

  // ==================== 历史记录管理 ====================
  class HistoryManager {
    constructor(maxSteps = 30) {
      this.states = [];
      this.currentIndex = -1;
      this.maxSteps = maxSteps;
    }

    save(imageData) {
      this.currentIndex++;
      this.states = this.states.slice(0, this.currentIndex);
      this.states.push(imageData);
      if (this.states.length > this.maxSteps) {
        this.states.shift();
        this.currentIndex--;
      }
    }

    undo() {
      if (this.currentIndex <= 0) return null;
      this.currentIndex--;
      return this.states[this.currentIndex];
    }

    redo() {
      if (this.currentIndex >= this.states.length - 1) return null;
      this.currentIndex++;
      return this.states[this.currentIndex];
    }

    canUndo() { return this.currentIndex > 0; }
    canRedo() { return this.currentIndex < this.states.length - 1; }
  }

  // ==================== UI控制器 ====================
  class UIController {
    constructor(onBrushChange, onSizeChange, onOpacityChange, onFlowChange, onColorChange,
                onBgChange, onUndo, onRedo, onClear, onSave, onToggle, onLayerChange) {
      this.onBrushChange = onBrushChange;
      this.onSizeChange = onSizeChange;
      this.onOpacityChange = onOpacityChange;
      this.onFlowChange = onFlowChange;
      this.onColorChange = onColorChange;
      this.onBgChange = onBgChange;
      this.onUndo = onUndo;
      this.onRedo = onRedo;
      this.onClear = onClear;
      this.onSave = onSave;
      this.onToggle = onToggle;
      this.onLayerChange = onLayerChange;
      this.visible = true;
      this.currentBrush = 'pencil';
      this.panel = null;
      this._buildUI();
    }

    _buildUI() {
      // 注入样式
      const style = document.createElement('style');
      style.textContent = this._getStyles();
      document.head.appendChild(style);

      // 创建面板
      this.panel = document.createElement('div');
      this.panel.id = 'wb-panel';
      this.panel.innerHTML = this._getHTML();
      document.body.appendChild(this.panel);

      this._bindEvents();
    }

    _getStyles() {
      return `
        #wb-panel {
          position: fixed; top: 50%; right: 16px; transform: translateY(-50%);
          width: 260px; max-height: 90vh; overflow-y: auto;
          background: rgba(22, 33, 62, 0.95); border: 1px solid rgba(15, 52, 96, 0.8);
          border-radius: 16px; z-index: 999999; font-family: 'Segoe UI', system-ui, sans-serif;
          color: #e0e0e0; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
          scrollbar-width: thin; scrollbar-color: #0f3460 transparent;
        }
        #wb-panel.wb-hidden { transform: translateY(-50%) translateX(300px); opacity: 0; pointer-events: none; }
        #wb-panel::-webkit-scrollbar { width: 4px; }
        #wb-panel::-webkit-scrollbar-thumb { background: #0f3460; border-radius: 4px; }

        .wb-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.06);
          background: rgba(233, 69, 96, 0.08); border-radius: 16px 16px 0 0;
        }
        .wb-title {
          font-size: 14px; font-weight: 700; letter-spacing: 0.5px;
          background: linear-gradient(135deg, #e94560, #00d2ff);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .wb-close {
          width: 24px; height: 24px; border: none; background: rgba(255,255,255,0.08);
          border-radius: 6px; color: #888; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .wb-close:hover { background: rgba(233,69,96,0.3); color: #fff; }

        .wb-section { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.04); }
        .wb-section:last-child { border-bottom: none; }
        .wb-label {
          font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px;
          color: #666; margin-bottom: 8px; font-weight: 600;
        }

        .wb-brush-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
        }
        .wb-brush-btn {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 8px 4px; border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; background: rgba(255,255,255,0.03);
          color: #999; cursor: pointer; transition: all 0.2s; font-size: 10px;
        }
        .wb-brush-btn:hover { background: rgba(255,255,255,0.08); color: #fff; transform: translateY(-1px); }
        .wb-brush-btn.active {
          background: rgba(233,69,96,0.15); border-color: rgba(233,69,96,0.4);
          color: #e94560; box-shadow: 0 0 12px rgba(233,69,96,0.15);
        }
        .wb-brush-icon { font-size: 18px; line-height: 1; }

        .wb-slider-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .wb-slider-row:last-child { margin-bottom: 0; }
        .wb-slider-label { font-size: 11px; color: #888; min-width: 36px; }
        .wb-slider-value { font-size: 11px; color: #00d2ff; min-width: 28px; text-align: right; }
        .wb-slider {
          flex: 1; -webkit-appearance: none; appearance: none; height: 4px;
          background: rgba(255,255,255,0.1); border-radius: 2px; outline: none;
        }
        .wb-slider::-webkit-slider-thumb {
          -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%;
          background: #e94560; cursor: pointer; box-shadow: 0 0 8px rgba(233,69,96,0.4);
          transition: transform 0.15s;
        }
        .wb-slider::-webkit-slider-thumb:hover { transform: scale(1.2); }

        .wb-color-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .wb-color-swatch {
          width: 22px; height: 22px; border-radius: 6px; cursor: pointer;
          border: 2px solid transparent; transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .wb-color-swatch:hover { transform: scale(1.15); }
        .wb-color-swatch.active { border-color: #fff; box-shadow: 0 0 8px rgba(255,255,255,0.3); }

        .wb-custom-color {
          display: flex; align-items: center; gap: 8px;
        }
        .wb-color-input {
          width: 32px; height: 32px; border: none; border-radius: 8px;
          cursor: pointer; background: none; padding: 0;
        }
        .wb-color-input::-webkit-color-swatch-wrapper { padding: 0; }
        .wb-color-input::-webkit-color-swatch { border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; }
        .wb-hex-input {
          flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 6px 10px; color: #e0e0e0; font-size: 12px;
          font-family: 'Consolas', monospace; outline: none; transition: border-color 0.2s;
        }
        .wb-hex-input:focus { border-color: #e94560; }

        .wb-bg-btns { display: flex; gap: 6px; flex-wrap: wrap; }
        .wb-bg-btn {
          padding: 5px 12px; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; background: rgba(255,255,255,0.03);
          color: #888; cursor: pointer; font-size: 11px; transition: all 0.2s;
        }
        .wb-bg-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .wb-bg-btn.active { background: rgba(0,210,255,0.1); border-color: rgba(0,210,255,0.4); color: #00d2ff; }

        .wb-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .wb-action-btn {
          flex: 1; min-width: 50px; padding: 8px 6px;
          border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
          background: rgba(255,255,255,0.03); color: #aaa; cursor: pointer;
          font-size: 11px; transition: all 0.2s; text-align: center;
        }
        .wb-action-btn:hover { background: rgba(255,255,255,0.08); color: #fff; transform: translateY(-1px); }
        .wb-action-btn.wb-danger:hover { background: rgba(233,69,96,0.2); color: #e94560; }
        .wb-action-btn.wb-primary {
          background: rgba(233,69,96,0.15); border-color: rgba(233,69,96,0.3); color: #e94560;
        }

        .wb-toggle-btn {
          position: fixed; top: 50%; right: 16px; transform: translateY(-50%);
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(22,33,62,0.9); border: 1px solid rgba(15,52,96,0.6);
          color: #e94560; font-size: 18px; cursor: pointer; z-index: 999998;
          display: none; align-items: center; justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3); transition: all 0.2s;
          backdrop-filter: blur(10px);
        }
        .wb-toggle-btn:hover { background: rgba(233,69,96,0.2); transform: translateY(-50%) scale(1.1); }
        .wb-toggle-btn.visible { display: flex; }

        .wb-cursor-preview {
          position: fixed; pointer-events: none; z-index: 999990;
          border: 1.5px solid rgba(255,255,255,0.5); border-radius: 50%;
          transform: translate(-50%, -50%); transition: width 0.1s, height 0.1s;
          box-shadow: 0 0 0 1px rgba(0,0,0,0.3);
          mix-blend-mode: difference;
        }

        .wb-layer-btns { display: flex; gap: 6px; }
        .wb-layer-btn {
          flex: 1; padding: 6px; border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px; background: rgba(255,255,255,0.03);
          color: #888; cursor: pointer; font-size: 11px; text-align: center;
          transition: all 0.2s;
        }
        .wb-layer-btn:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .wb-layer-btn.active { background: rgba(0,210,255,0.1); border-color: rgba(0,210,255,0.4); color: #00d2ff; }

        /* 动画 */
        @keyframes wb-fadeIn { from { opacity: 0; transform: translateY(-50%) translateX(20px); } to { opacity: 1; transform: translateY(-50%) translateX(0); } }
        #wb-panel { animation: wb-fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1); }
      `;
    }

    _getHTML() {
      const brushBtns = CONFIG.brushTypes.map(b =>
        `<button class="wb-brush-btn ${b.id === 'pencil' ? 'active' : ''}" data-brush="${b.id}">
          <span class="wb-brush-icon">${b.icon}</span>
          <span>${b.name}</span>
        </button>`
      ).join('');

      const colorSwatches = CONFIG.palette.map(c =>
        `<div class="wb-color-swatch ${c === '#00d2ff' ? 'active' : ''}" data-color="${c}" style="background:${c}"></div>`
      ).join('');

      return `
        <div class="wb-header">
          <span class="wb-title">✨ Web Brush</span>
          <button class="wb-close" id="wb-close">✕</button>
        </div>

        <div class="wb-section">
          <div class="wb-label">画笔类型</div>
          <div class="wb-brush-grid">${brushBtns}</div>
        </div>

        <div class="wb-section">
          <div class="wb-label">参数调节</div>
          <div class="wb-slider-row">
            <span class="wb-slider-label">大小</span>
            <input type="range" class="wb-slider" id="wb-size" min="1" max="50" value="4">
            <span class="wb-slider-value" id="wb-size-val">4</span>
          </div>
          <div class="wb-slider-row">
            <span class="wb-slider-label">透明</span>
            <input type="range" class="wb-slider" id="wb-opacity" min="1" max="100" value="100">
            <span class="wb-slider-value" id="wb-opacity-val">100%</span>
          </div>
          <div class="wb-slider-row">
            <span class="wb-slider-label">流量</span>
            <input type="range" class="wb-slider" id="wb-flow" min="1" max="100" value="100">
            <span class="wb-slider-value" id="wb-flow-val">100%</span>
          </div>
        </div>

        <div class="wb-section">
          <div class="wb-label">颜色</div>
          <div class="wb-color-grid">${colorSwatches}</div>
          <div class="wb-custom-color">
            <input type="color" class="wb-color-input" id="wb-color-picker" value="#00d2ff">
            <input type="text" class="wb-hex-input" id="wb-hex-input" value="#00d2ff" maxlength="7">
          </div>
        </div>

        <div class="wb-section">
          <div class="wb-label">画布背景</div>
          <div class="wb-bg-btns">
            <button class="wb-bg-btn active" data-bg="none">无</button>
            <button class="wb-bg-btn" data-bg="stars">星空</button>
            <button class="wb-bg-btn" data-bg="snow">雪花</button>
            <button class="wb-bg-btn" data-bg="rain">雨滴</button>
          </div>
        </div>

        <div class="wb-section">
          <div class="wb-label">图层混合</div>
          <div class="wb-layer-btns">
            <button class="wb-layer-btn active" data-blend="source-over">正常</button>
            <button class="wb-layer-btn" data-blend="multiply">正片叠底</button>
            <button class="wb-layer-btn" data-blend="screen">滤色</button>
            <button class="wb-layer-btn" data-blend="overlay">叠加</button>
          </div>
        </div>

        <div class="wb-section">
          <div class="wb-label">操作</div>
          <div class="wb-actions">
            <button class="wb-action-btn" id="wb-undo" title="撤销 (Ctrl+Z)">↩ 撤销</button>
            <button class="wb-action-btn" id="wb-redo" title="重做 (Ctrl+Y)">↪ 重做</button>
            <button class="wb-action-btn wb-danger" id="wb-clear">🗑 清除</button>
            <button class="wb-action-btn wb-primary" id="wb-save" title="保存 (Ctrl+S)">💾 保存</button>
          </div>
          </div>
        </div>
      `;
    }

    _bindEvents() {
      // 关闭按钮
      document.getElementById('wb-close').addEventListener('click', () => this.toggle());

      // 画笔选择
      this.panel.querySelectorAll('.wb-brush-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.panel.querySelectorAll('.wb-brush-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentBrush = btn.dataset.brush;
          this.onBrushChange(btn.dataset.brush);
        });
      });

      // 滑块
      const sizeSlider = document.getElementById('wb-size');
      const opacitySlider = document.getElementById('wb-opacity');
      const flowSlider = document.getElementById('wb-flow');

      sizeSlider.addEventListener('input', () => {
        document.getElementById('wb-size-val').textContent = sizeSlider.value;
        this.onSizeChange(parseInt(sizeSlider.value));
      });
      opacitySlider.addEventListener('input', () => {
        document.getElementById('wb-opacity-val').textContent = opacitySlider.value + '%';
        this.onOpacityChange(parseInt(opacitySlider.value) / 100);
      });
      flowSlider.addEventListener('input', () => {
        document.getElementById('wb-flow-val').textContent = flowSlider.value + '%';
        this.onFlowChange(parseInt(flowSlider.value) / 100);
      });

      // 颜色色板
      this.panel.querySelectorAll('.wb-color-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
          this.panel.querySelectorAll('.wb-color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          const color = swatch.dataset.color;
          document.getElementById('wb-color-picker').value = color;
          document.getElementById('wb-hex-input').value = color;
          this.onColorChange(color);
        });
      });

      // 颜色选择器
      document.getElementById('wb-color-picker').addEventListener('input', (e) => {
        const color = e.target.value;
        document.getElementById('wb-hex-input').value = color;
        this.panel.querySelectorAll('.wb-color-swatch').forEach(s => s.classList.remove('active'));
        this.onColorChange(color);
      });

      // 十六进制输入
      document.getElementById('wb-hex-input').addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          document.getElementById('wb-color-picker').value = val;
          this.panel.querySelectorAll('.wb-color-swatch').forEach(s => s.classList.remove('active'));
          this.onColorChange(val);
        }
      });

      // 背景
      this.panel.querySelectorAll('.wb-bg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.panel.querySelectorAll('.wb-bg-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.onBgChange(btn.dataset.bg);
        });
      });

      // 混合模式
      this.panel.querySelectorAll('.wb-layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.panel.querySelectorAll('.wb-layer-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.onLayerChange(btn.dataset.blend);
        });
      });

      // 操作按钮
      document.getElementById('wb-undo').addEventListener('click', () => this.onUndo());
      document.getElementById('wb-redo').addEventListener('click', () => this.onRedo());
      document.getElementById('wb-clear').addEventListener('click', () => this.onClear());
      document.getElementById('wb-save').addEventListener('click', () => this.onSave());

      // 切换按钮
      this.toggleBtn = document.createElement('button');
      this.toggleBtn.className = 'wb-toggle-btn';
      this.toggleBtn.textContent = '🎨';
      this.toggleBtn.addEventListener('click', () => this.toggle());
      document.body.appendChild(this.toggleBtn);

      // 光标预览
      this.cursorPreview = document.createElement('div');
      this.cursorPreview.className = 'wb-cursor-preview';
      document.body.appendChild(this.cursorPreview);
    }

    toggle() {
      this.visible = !this.visible;
      this.panel.classList.toggle('wb-hidden', !this.visible);
      this.toggleBtn.classList.toggle('visible', !this.visible);
      this.onToggle(this.visible);
    }

    updateCursor(x, y, size) {
      const cp = this.cursorPreview;
      cp.style.left = x + 'px';
      cp.style.top = y + 'px';
      cp.style.width = size * 2 + 'px';
      cp.style.height = size * 2 + 'px';
    }

    showCursor() { this.cursorPreview.style.display = 'block'; }
    hideCursor() { this.cursorPreview.style.display = 'none'; }

    destroy() {
      this.panel?.remove();
      this.toggleBtn?.remove();
      this.cursorPreview?.remove();
    }
  }

  // ==================== 主应用 ====================
  class WebBrushApp {
    constructor() {
      this.active = false;
      this.drawCanvas = null;
      this.effectCanvas = null;
      this.drawCtx = null;
      this.effectCtx = null;
      this.particleSystem = null;
      this.brushEngine = null;
      this.animationManager = null;
      this.historyManager = null;
      this.ui = null;
      this.mouseX = 0;
      this.mouseY = 0;
      this.blendMode = 'source-over';
    }

    init() {
      if (this.active) return;
      this.active = true;

      // 创建效果Canvas（粒子、背景动画等）- 先创建，在下层
      this.effectCanvas = this._createCanvas('wb-effect-canvas', false);
      this.effectCtx = this.effectCanvas.getContext('2d');

      // 创建绘图Canvas（保留绘画内容）- 后创建，在上层，接收事件
      this.drawCanvas = this._createCanvas('wb-draw-canvas', true);
      this.drawCtx = this.drawCanvas.getContext('2d');

      // 初始化系统
      this.particleSystem = new ParticleSystem();
      this.brushEngine = new BrushEngine(this.drawCanvas, this.particleSystem);
      this.animationManager = new AnimationManager(this.effectCanvas, this.particleSystem, this.brushEngine);
      this.historyManager = new HistoryManager(30);

      // 初始化UI
      this.ui = new UIController(
        (type) => this._onBrushChange(type),
        (size) => this._onSizeChange(size),
        (opacity) => this._onOpacityChange(opacity),
        (flow) => this._onFlowChange(flow),
        (color) => this._onColorChange(color),
        (bg) => this._onBgChange(bg),
        () => this._onUndo(),
        () => this._onRedo(),
        () => this._onClear(),
        () => this._onSave(),
        (visible) => this._onToggle(visible),
        (blend) => this._onBlendChange(blend),
      );

      // 保存初始状态
      this._saveState();

      // 启动动画
      this.animationManager.start();

      // 绑定事件
      this._bindCanvasEvents();
      this._bindKeyboardEvents();

      // 监听窗口大小变化
      this._resizeHandler = () => this._resize();
      window.addEventListener('resize', this._resizeHandler);

      console.log('%c✨ Web Brush 已启动！', 'color: #e94560; font-size: 16px; font-weight: bold;');
    }

    _createCanvas(id, isDrawLayer) {
      const canvas = document.createElement('canvas');
      canvas.id = id;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (isDrawLayer) {
        // 绘图层：接收鼠标事件，在最上面
        canvas.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 999982; cursor: none;
        `;
      } else {
        // 效果层：不拦截鼠标事件，在绘图层下面
        canvas.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 999981; pointer-events: none;
        `;
      }
      document.body.appendChild(canvas);
      return canvas;
    }

    _bindCanvasEvents() {
      const canvas = this.drawCanvas;

      // 鼠标事件
      canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.brushEngine.startStroke(x, y, 1);
        this.animationManager.addRipple(x, y);
      });

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        this.ui.updateCursor(e.clientX, e.clientY, this.brushEngine.size);

        if (this.brushEngine.isDrawing) {
          this.brushEngine.continueStroke(this.mouseX, this.mouseY, 1);
        }
      });

      canvas.addEventListener('mouseup', () => {
        if (this.brushEngine.isDrawing) {
          this.brushEngine.endStroke();
          this._saveState();
        }
      });

      // 在 window 上监听 mouseup，防止鼠标在面板上释放时丢失事件
      window.addEventListener('mouseup', () => {
        if (this.brushEngine.isDrawing) {
          this.brushEngine.endStroke();
          this._saveState();
        }
      });

      canvas.addEventListener('mouseleave', () => {
        if (this.brushEngine.isDrawing) {
          this.brushEngine.endStroke();
          this._saveState();
        }
        this.ui.hideCursor();
      });

      canvas.addEventListener('mouseenter', () => {
        this.ui.showCursor();
      });

      // 触摸事件
      canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const pressure = touch.force || 1;
        this.brushEngine.startStroke(x, y, pressure);
        this.animationManager.addRipple(x, y);
      }, { passive: false });

      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const pressure = touch.force || 1;
        this.brushEngine.continueStroke(x, y, pressure);
      }, { passive: false });

      canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.brushEngine.endStroke();
        this._saveState();
      }, { passive: false });

      // 右键取色
      canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this._pickColor(e.clientX, e.clientY);
      });

      // 滚轮调节大小
      canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const newSize = Utils.clamp(this.brushEngine.size + delta, 1, 50);
        this.brushEngine.size = newSize;
        const slider = document.getElementById('wb-size');
        if (slider) slider.value = newSize;
        const val = document.getElementById('wb-size-val');
        if (val) val.textContent = newSize;
        this.ui.updateCursor(e.clientX, e.clientY, newSize);
      }, { passive: false });
    }

    _bindKeyboardEvents() {
      this._keyHandler = (e) => {
        if (!this.active) return;

        // Ctrl+Z 撤销
        if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          this._onUndo();
        }
        // Ctrl+Y / Ctrl+Shift+Z 重做
        if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'Z')) {
          e.preventDefault();
          this._onRedo();
        }
        // Ctrl+S 保存
        if (e.ctrlKey && e.key === 's') {
          e.preventDefault();
          this._onSave();
        }
        // [ ] 调节大小
        if (e.key === '[') {
          const newSize = Utils.clamp(this.brushEngine.size - 1, 1, 50);
          this._onSizeChange(newSize);
          const slider = document.getElementById('wb-size');
          if (slider) slider.value = newSize;
        }
        if (e.key === ']') {
          const newSize = Utils.clamp(this.brushEngine.size + 1, 1, 50);
          this._onSizeChange(newSize);
          const slider = document.getElementById('wb-size');
          if (slider) slider.value = newSize;
        }
        // Esc 关闭面板
        if (e.key === 'Escape') {
          this.ui.toggle();
        }
      };
      window.addEventListener('keydown', this._keyHandler);
    }

    _resize() {
      // 保存当前绘画内容
      const imageData = this.drawCtx.getImageData(0, 0, this.drawCanvas.width, this.drawCanvas.height);
      this.drawCanvas.width = window.innerWidth;
      this.drawCanvas.height = window.innerHeight;
      this.effectCanvas.width = window.innerWidth;
      this.effectCanvas.height = window.innerHeight;
      this.drawCtx.putImageData(imageData, 0, 0);
    }

    _saveState() {
      const imageData = this.drawCtx.getImageData(0, 0, this.drawCanvas.width, this.drawCanvas.height);
      this.historyManager.save(imageData);
    }

    _pickColor(clientX, clientY) {
      const pixel = this.drawCtx.getImageData(clientX, clientY, 1, 1).data;
      if (pixel[3] === 0) return;
      const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
      this._onColorChange(hex);
      const picker = document.getElementById('wb-color-picker');
      const hexInput = document.getElementById('wb-hex-input');
      if (picker) picker.value = hex;
      if (hexInput) hexInput.value = hex;
    }

    // --- 事件处理 ---
    _onBrushChange(type) { this.brushEngine.brushType = type; }
    _onSizeChange(size) {
      this.brushEngine.size = size;
      const val = document.getElementById('wb-size-val');
      if (val) val.textContent = size;
    }
    _onOpacityChange(opacity) { this.brushEngine.opacity = opacity; }
    _onFlowChange(flow) { this.brushEngine.flow = flow; }
    _onColorChange(color) { this.brushEngine.color = color; }
    _onBgChange(type) {
      this.animationManager.setBackground(type === 'none' ? null : type);
    }
    _onBlendChange(blend) { this.blendMode = blend; this.drawCtx.globalCompositeOperation = blend; }
    _onUndo() {
      const state = this.historyManager.undo();
      if (state) {
        this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        this.drawCtx.putImageData(state, 0, 0);
      }
    }
    _onRedo() {
      const state = this.historyManager.redo();
      if (state) {
        this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        this.drawCtx.putImageData(state, 0, 0);
      }
    }
    _onClear() {
      this.drawCtx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
      this.particleSystem.clear();
      this._saveState();
    }
    _onSave() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.drawCanvas.width;
      tempCanvas.height = this.drawCanvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      // 白色背景
      tempCtx.fillStyle = '#fff';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      // 绘画内容
      tempCtx.drawImage(this.drawCanvas, 0, 0);
      // 效果层
      tempCtx.drawImage(this.effectCanvas, 0, 0);

      const link = document.createElement('a');
      link.download = `web-brush-${Date.now()}.png`;
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }
    _onToggle(visible) {
      // 面板关闭时，画布穿透鼠标事件，可以正常点击网页
      // 面板打开时，画布拦截事件，可以绘画
      this.drawCanvas.style.pointerEvents = visible ? 'auto' : 'none';
      this.effectCanvas.style.pointerEvents = 'none';
    }

    destroy() {
      this.active = false;
      this.animationManager?.stop();
      this.drawCanvas?.remove();
      this.effectCanvas?.remove();
      this.ui?.destroy();
      window.removeEventListener('resize', this._resizeHandler);
      window.removeEventListener('keydown', this._keyHandler);
    }
  }

  // ==================== 启动 ====================
  if (window.__webBrushApp) {
    window.__webBrushApp.destroy();
  }
  window.__webBrushApp = new WebBrushApp();
  window.__webBrushApp.init();

})();