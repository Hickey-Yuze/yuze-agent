(function() {
  const GUARD_ID = '__beach_cheers_animation__';
  if (document.getElementById(GUARD_ID)) return;

  const overlay = document.createElement('div');
  overlay.id = GUARD_ID;
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0', zIndex: '999999',
    pointerEvents: 'none', overflow: 'hidden', opacity: '0',
    transition: 'opacity 0.6s ease'
  });
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, { width: '100%', height: '100%' });
  overlay.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  function drawSky(ctx, w, h, t) {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    skyGrad.addColorStop(0, '#1a0533');
    skyGrad.addColorStop(0.3, '#4a1942');
    skyGrad.addColorStop(0.55, '#c84b31');
    skyGrad.addColorStop(0.75, '#ecb365');
    skyGrad.addColorStop(1, '#f8e8a0');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h * 0.55);
  }

  function drawSun(ctx, w, h, t) {
    const sx = w * 0.65;
    const sy = h * 0.32 + Math.sin(t * 0.0003) * 5;
    const sr = Math.min(w, h) * 0.08;

    const glow1 = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4);
    glow1.addColorStop(0, 'rgba(255,200,80,0.4)');
    glow1.addColorStop(0.5, 'rgba(255,140,50,0.1)');
    glow1.addColorStop(1, 'rgba(255,100,30,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, w, h * 0.55);

    const sunGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    sunGrad.addColorStop(0, '#FFF8E1');
    sunGrad.addColorStop(0.4, '#FFE082');
    sunGrad.addColorStop(0.8, '#FFB74D');
    sunGrad.addColorStop(1, '#FF8F00');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 / 12) * i + t * 0.0005;
      const rayLen = sr * (1.5 + Math.sin(t * 0.002 + i) * 0.5);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.15 + Math.sin(t * 0.003 + i * 0.5) * 0.1;
      ctx.fillStyle = '#FFE082';
      ctx.beginPath();
      ctx.moveTo(-sr * 0.04, -sr);
      ctx.lineTo(sr * 0.04, -sr);
      ctx.lineTo(sr * 0.02, -rayLen);
      ctx.lineTo(-sr * 0.02, -rayLen);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawOcean(ctx, w, h, t) {
    const oceanTop = h * 0.5;
    const oceanGrad = ctx.createLinearGradient(0, oceanTop, 0, h * 0.78);
    oceanGrad.addColorStop(0, '#1a6b8a');
    oceanGrad.addColorStop(0.3, '#1b8aaa');
    oceanGrad.addColorStop(0.6, '#2eaadc');
    oceanGrad.addColorStop(1, '#5cc8ee');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, oceanTop, w, h * 0.28);

    for (let layer = 0; layer < 3; layer++) {
      const waveY = oceanTop + layer * 25 + 10;
      const amplitude = 8 - layer * 2;
      const freq = 0.008 + layer * 0.003;
      const speed = 0.001 + layer * 0.0005;
      const alpha = 0.2 - layer * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, waveY);
      for (let x = 0; x <= w; x += 4) {
        const y = waveY + Math.sin(x * freq + t * speed) * amplitude
                  + Math.sin(x * freq * 1.5 + t * speed * 0.7) * amplitude * 0.5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h * 0.78);
      ctx.lineTo(0, h * 0.78);
      ctx.closePath();
      // ✅ FIX: interpolate alpha into rgba()
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    }

    const sparkleCount = 15;
    for (let i = 0; i < sparkleCount; i++) {
      const px = (i / sparkleCount) * w + Math.sin(t * 0.001 + i * 1.7) * 30;
      const py = oceanTop + 20 + Math.sin(t * 0.0015 + i * 2.3) * 15 + i * 4;
      const sparkAlpha = (Math.sin(t * 0.004 + i * 2) + 1) * 0.25;
      // ✅ FIX: interpolate sparkAlpha into rgba()
      ctx.fillStyle = `rgba(255,230,150,${sparkAlpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 1.5 + Math.sin(t * 0.005 + i) * 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBeach(ctx, w, h) {
    const sandTop = h * 0.76;
    const sandGrad = ctx.createLinearGradient(0, sandTop, 0, h);
    sandGrad.addColorStop(0, '#f0d9a0');
    sandGrad.addColorStop(0.3, '#e8cc8a');
    sandGrad.addColorStop(1, '#d4b06a');
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(0, sandTop + 5);
    for (let x = 0; x <= w; x += 10) {
      ctx.lineTo(x, sandTop + Math.sin(x * 0.015) * 4);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    const foamGrad = ctx.createLinearGradient(0, sandTop - 5, 0, sandTop + 15);
    foamGrad.addColorStop(0, 'rgba(255,255,255,0)');
    foamGrad.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    foamGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = foamGrad;
    ctx.fillRect(0, sandTop - 5, w, 20);
  }

  function drawSeagulls(ctx, w, h, t) {
    const gulls = [
      { x: w * 0.2, y: h * 0.15, s: 12 },
      { x: w * 0.35, y: h * 0.1, s: 8 },
      { x: w * 0.8, y: h * 0.18, s: 10 },
    ];
    ctx.strokeStyle = 'rgba(60,30,20,0.4)';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    gulls.forEach((g, i) => {
      const gx = g.x + Math.sin(t * 0.0008 + i * 2) * 20;
      const gy = g.y + Math.sin(t * 0.001 + i * 3) * 5;
      const wingY = Math.sin(t * 0.005 + i * 2) * 3;
      ctx.beginPath();
      ctx.moveTo(gx - g.s, gy + wingY);
      ctx.quadraticCurveTo(gx - g.s * 0.3, gy - g.s * 0.4 + wingY, gx, gy);
      ctx.quadraticCurveTo(gx + g.s * 0.3, gy - g.s * 0.4 + wingY, gx + g.s, gy + wingY);
      ctx.stroke();
    });
  }

  function drawBeerMug(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    const w = size;
    const h = size * 1.3;

    const grad = ctx.createLinearGradient(-w/2, 0, w/2, 0);
    grad.addColorStop(0, '#F9A825');
    grad.addColorStop(0.3, '#FFD54F');
    grad.addColorStop(0.7, '#FFD54F');
    grad.addColorStop(1, '#F9A825');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-w/2, -h*0.1);
    ctx.lineTo(-w/2*0.87, h);
    ctx.lineTo(w/2*0.87, h);
    ctx.lineTo(w/2, -h*0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(-w/2*0.55, -h*0.1);
    ctx.lineTo(-w/2*0.45, h*0.88);
    ctx.lineTo(-w/2*0.1, h*0.88);
    ctx.lineTo(-w/2*0.2, -h*0.1);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#D4920A';
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w/2, h*0.2);
    ctx.quadraticCurveTo(w/2+size*0.35, h*0.2, w/2+size*0.35, h*0.55);
    ctx.quadraticCurveTo(w/2+size*0.35, h*0.82, w/2, h*0.78);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    const foamBumps = [
      { dx: -0.3, r: 0.16 }, { dx: -0.1, r: 0.19 },
      { dx: 0.1, r: 0.17 }, { dx: 0.3, r: 0.15 }, { dx: 0.0, r: 0.13 }
    ];
    foamBumps.forEach(b => {
      ctx.beginPath();
      ctx.arc(w * b.dx, -h * 0.12, size * b.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  const GOLD_COLORS = ['#FFD700', '#FFC107', '#FFB300', '#FF8F00', '#F9A825'];
  const FOAM_COLORS = ['#FFFDE7', '#FFF9C4', '#FFF59D', '#FFECB3', '#FFFFFF'];
  const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4FC3F7', '#81C784', '#FFB74D', '#E040FB', '#FF8A65', '#7C4DFF'];

  class Particle {
    constructor(x, y, type) {
      this.x = x; this.y = y; this.type = type;
      this.size = type === 'foam' ? (3 + Math.random() * 7) : type === 'confetti' ? (4 + Math.random() * 5) : (2 + Math.random() * 4);
      this.color = type === 'foam' ? FOAM_COLORS[~~(Math.random()*FOAM_COLORS.length)]
        : type === 'confetti' ? CONFETTI_COLORS[~~(Math.random()*CONFETTI_COLORS.length)]
        : GOLD_COLORS[~~(Math.random()*GOLD_COLORS.length)];
      this.alpha = 0.7 + Math.random() * 0.3;
      this.vx = type === 'confetti' ? (Math.random()-0.5)*12 : (Math.random()-0.5)*(type==='splash'?8:2);
      this.vy = type === 'splash' ? -(4+Math.random()*9) : type === 'confetti' ? -(3+Math.random()*7) : -(0.5+Math.random()*2);
      this.gravity = type === 'splash' ? 0.14 : type === 'confetti' ? 0.07 : -0.01;
      this.life = 1;
      this.decay = type === 'splash' ? 0.012 : type === 'confetti' ? 0.004 : 0.004;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 0.03 + Math.random() * 0.04;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.12;
      this.shape = type === 'confetti' ? (Math.random() > 0.5 ? 'rect' : 'circle') : 'circle';
    }
    update() {
      this.wobble += this.wobbleSpeed;
      this.x += this.vx + Math.sin(this.wobble) * 0.4;
      this.vy += this.gravity;
      this.y += this.vy;
      this.vx *= 0.985;
      this.rotation += this.rotSpeed;
      this.life -= this.decay;
    }
    draw(ctx) {
      if (this.life <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.alpha * this.life;
      ctx.fillStyle = this.color;
      if (this.shape === 'rect') {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillRect(-this.size/2, -this.size/4, this.size, this.size/2);
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * Math.max(0.3, this.life), 0, Math.PI * 2);
        ctx.fill();
        if (this.size > 3 && this.type === 'gold') {
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.beginPath();
          ctx.arc(this.x - this.size*0.15, this.y - this.size*0.15, this.size*0.2*this.life, 0, Math.PI*2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  let particles = [];
  let animFrame;
  const startTime = performance.now();
  const SLIDE_DURATION = 900;
  const CLINK_TIME = SLIDE_DURATION;
  const glassSize = Math.min(W(), H()) * 0.1;
  let leftGlass = { x: -glassSize*2, y: H()*0.52, angle: 0 };
  let rightGlass = { x: W()+glassSize*2, y: H()*0.52, angle: 0 };
  let clinked = false;
  let clinkShake = 0;
  const TEXT_APPEAR_AT = 2000;
  const BUBBLE_END = 4500;
  const FADE_START = 7000;
  const FADE_DURATION = 1200;

  const textWrap = document.createElement('div');
  Object.assign(textWrap.style, {
    position: 'absolute', inset: '0',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    opacity: '0', transform: 'scale(0.3)',
    transition: 'opacity 1s cubic-bezier(0.34,1.56,0.64,1), transform 1s cubic-bezier(0.34,1.56,0.64,1)'
  });
  overlay.appendChild(textWrap);

  const glow = document.createElement('div');
  Object.assign(glow.style, {
    position: 'absolute',
    width: '800px', height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(255,193,7,0.35) 0%, rgba(255,140,50,0.12) 40%, rgba(255,100,30,0) 70%)',
    filter: 'blur(35px)',
    opacity: '0',
    transition: 'opacity 1.4s ease'
  });
  textWrap.appendChild(glow);

  const mainText = document.createElement('div');
  mainText.textContent = '人生海海，祝你尽兴开怀';
  Object.assign(mainText.style, {
    position: 'relative',
    fontSize: 'clamp(22px, 5vw, 50px)',
    fontWeight: '900',
    background: 'linear-gradient(135deg, #FFE082, #FFB74D, #FF8F00, #FFD54F, #FFE082)',
    backgroundSize: '300% 300%',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    filter: 'drop-shadow(0 2px 20px rgba(255,193,7,0.7)) drop-shadow(0 0 40px rgba(255,152,0,0.4))',
    letterSpacing: '0.06em',
    animation: 'none',
    textAlign: 'center',
    padding: '0 20px',
    lineHeight: '1.5'
  });
  textWrap.appendChild(mainText);

  const subText = document.createElement('div');
  subText.textContent = '🏖️ 🍻 🌊';
  Object.assign(subText.style, {
    position: 'relative',
    fontSize: 'clamp(22px, 3.5vw, 38px)',
    marginTop: '18px',
    opacity: '0',
    transition: 'opacity 0.8s ease 0.4s'
  });
  textWrap.appendChild(subText);

  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes __beachShimmer__ {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes __beachFloat__ {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `;
  overlay.appendChild(styleEl);

  let textShown = false;
  let shimmerStarted = false;

  function easeOutBack(t) {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  function animate(now) {
    const elapsed = now - startTime;
    const w = W(), h = H();
    ctx.clearRect(0, 0, w, h);

    drawSky(ctx, w, h, now);
    drawSun(ctx, w, h, now);
    drawOcean(ctx, w, h, now);
    drawBeach(ctx, w, h);
    drawSeagulls(ctx, w, h, now);

    const cx = w / 2, cy = h * 0.52;

    if (elapsed < CLINK_TIME) {
      const progress = Math.min(elapsed / SLIDE_DURATION, 1);
      const eased = easeOutBack(progress);
      leftGlass.x = -glassSize * 1.5 + (cx - glassSize * 0.9) * eased;
      leftGlass.angle = -0.25 * (1 - progress);
      rightGlass.x = w + glassSize * 1.5 - (w - cx + glassSize * 0.9) * eased;
      rightGlass.angle = 0.25 * (1 - progress);
    } else {
      const postClink = (elapsed - CLINK_TIME) / 300;
      const bounce = postClink < 1 ? Math.sin(postClink * Math.PI) * 8 : 0;
      leftGlass.x = cx - glassSize * 0.9 - bounce;
      leftGlass.angle = 0.04 * Math.sin(postClink * Math.PI * 2) * Math.max(0, 1 - postClink);
      rightGlass.x = cx + glassSize * 0.9 + bounce;
      rightGlass.angle = -0.04 * Math.sin(postClink * Math.PI * 2) * Math.max(0, 1 - postClink);
    }

    if (elapsed >= CLINK_TIME && !clinked) {
      clinked = true;
      clinkShake = 6;
      for (let i = 0; i < 35; i++) particles.push(new Particle(cx, cy - glassSize * 0.4, 'splash'));
      for (let i = 0; i < 20; i++) particles.push(new Particle(cx + (Math.random()-0.5)*glassSize, cy - glassSize*0.6, 'foam'));
      for (let i = 0; i < 55; i++) particles.push(new Particle(cx, cy - glassSize*0.4, 'confetti'));
    }

    if (clinkShake > 0.1) {
      clinkShake *= 0.88;
      ctx.save();
      ctx.translate((Math.random()-0.5)*clinkShake, (Math.random()-0.5)*clinkShake);
    }

    const glassAlpha = elapsed < CLINK_TIME + 3000 ? 1 : Math.max(0, 1 - (elapsed - CLINK_TIME - 3000) / 1200);
    if (glassAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = glassAlpha;
      drawBeerMug(ctx, leftGlass.x, leftGlass.y, glassSize, leftGlass.angle);
      drawBeerMug(ctx, rightGlass.x, rightGlass.y, glassSize, rightGlass.angle);
      ctx.restore();
    }

    if (clinkShake > 0.1) ctx.restore();

    if (elapsed >= CLINK_TIME && elapsed < BUBBLE_END && Math.random() < 0.35) {
      const bx = w * 0.15 + Math.random() * w * 0.7;
      const by = h * 0.8 + Math.random() * h * 0.08;
      particles.push(new Particle(bx, by, 'gold'));
    }

    particles = particles.filter(p => p.life > 0);
    for (const p of particles) { p.update(); p.draw(ctx); }

    if (elapsed >= TEXT_APPEAR_AT && !textShown) {
      textShown = true;
      requestAnimationFrame(() => {
        textWrap.style.opacity = '1';
        textWrap.style.transform = 'scale(1)';
        glow.style.opacity = '1';
        subText.style.opacity = '1';
      });
    }

    if (textShown && elapsed >= TEXT_APPEAR_AT + 900 && !shimmerStarted) {
      shimmerStarted = true;
      mainText.style.animation = '__beachShimmer__ 3s ease infinite';
      subText.style.animation = '__beachFloat__ 2s ease-in-out infinite';
    }

    if (elapsed >= FADE_START) {
      const fadeProgress = Math.min((elapsed - FADE_START) / FADE_DURATION, 1);
      overlay.style.opacity = String(1 - fadeProgress);
      if (fadeProgress >= 1) {
        overlay.remove();
        styleEl.remove();
        cancelAnimationFrame(animFrame);
        return;
      }
    }
    animFrame = requestAnimationFrame(animate);
  }
  animFrame = requestAnimationFrame(animate);
})();