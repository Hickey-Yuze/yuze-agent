// ==UserScript==
// @name         网页光效 · 飘落粒子
// @namespace    https://tabbit.com/userscripts/
// @version      1.0.0
// @license      MIT
// @description  网页飘落粒子光效：雪花、花瓣、树叶、星光、星星等素材从页面顶部飘落（仿鸣潮风格），右下角按钮可一键开启/关闭，也可设置定时自动停止。适合在任意网页营造氛围光效。
// @author       Tabbit
// @match        *://*/*
// @exclude      *://*.github.com/*
// @exclude      *://github.com/*
// @exclude      *://*.google.com/*
// @exclude      *://*.x.com/*
// @exclude      *://twitter.com/*
// @exclude      *://*.bing.com/*
// @exclude      *://*.yandex.com/*
// @exclude      *://*.qq.com/*
// @exclude      *://*.v.qq.com/*
// @exclude      *://*.sohu.com/*
// @exclude      *://*.mgtv.com/*
// @exclude      *://*.baidu.com/*
// @grant        none
// @run-at       document-idle
// @noframes
// ==/UserScript==

(function () {
  'use strict';

  // ---------- 配置（可自行修改） ----------
  var CFG = {
    type: 'mixed',        // mixed | snow | petal | leaf | sparkle | star | bubble
    density: 60,          // 粒子数量
    speed: 1,             // 下落速度倍率
    size: 1,              // 尺寸倍率
    autoStart: true,      // 是否自动开启
    showToggleButton: true,
    buttonPos: 'br'       // br | bl | tr | tl
  };

  var NS = '__ParticleGlow';
  if (window[NS] && window[NS].destroy) { window[NS].destroy(); }

  var canvas, ctx;
  var running = false;
  var rafId = null;
  var particles = [];
  var lastTs = 0;
  var timerHandle = null;
  var toggle = null;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function initCanvas() {
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:2147483000;display:block;';
    document.documentElement.appendChild(canvas);
    resize();
  }

  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  function makeParticle(initial) {
    var t = CFG.type === 'mixed' ? pick(['snow', 'petal', 'leaf', 'sparkle', 'star']) : CFG.type;
    var W = window.innerWidth, H = window.innerHeight;
    return {
      type: t,
      x: rand(-20, W + 20),
      y: initial ? rand(-H, H) : rand(-H * 0.4, -20),
      baseSize: rand(7, 18) * CFG.size,
      size: rand(4, 10) * CFG.size,
      vy: rand(0.5, 1.5) * CFG.speed,
      vx: rand(-0.3, 0.3) * CFG.speed,
      angle: rand(0, Math.PI * 2),
      va: rand(-0.02, 0.02),
      swayFreq: rand(0.4, 1.3),
      phase: rand(0, Math.PI * 2),
      opacity: rand(0.55, 1)
    };
  }

  function spawnAll() {
    particles = [];
    var n = Math.max(10, Math.floor(CFG.density));
    for (var i = 0; i < n; i++) particles.push(makeParticle(true));
  }

  function drawParticle(p) {
    var t = p.type;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (t === 'snow') {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = p.opacity * 0.25;
      ctx.beginPath(); ctx.arc(0, 0, p.size * 1.8, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'petal') {
      ctx.globalAlpha = p.opacity;
      var g = ctx.createLinearGradient(-p.size, 0, p.size, 0);
      g.addColorStop(0, 'rgba(255,182,203,0.95)');
      g.addColorStop(1, 'rgba(255,214,229,0.85)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2); ctx.fill();
    } else if (t === 'leaf') {
      ctx.globalAlpha = p.opacity;
      ctx.fillStyle = 'rgba(120,200,140,0.85)';
      ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      var tw = 0.55 + 0.45 * Math.sin(p.phase * 6 + performance.now() * 0.002);
      ctx.globalAlpha = p.opacity * tw;
      ctx.fillStyle = t === 'star' ? 'rgba(255,230,160,0.95)' : 'rgba(255,250,200,0.9)';
      var r = p.size, spikes = t === 'star' ? 5 : 4;
      ctx.beginPath();
      for (var i = 0; i < spikes * 2; i++) {
        var ang = i * Math.PI / spikes;
        var rad = i % 2 === 0 ? r : r * 0.4;
        ctx.lineTo(Math.cos(ang) * rad, Math.sin(ang) * rad);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  function frame(ts) {
    if (!running) return;
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 16.7, 3);
    lastTs = ts;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    var W = window.innerWidth, H = window.innerHeight;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += dt * 0.05;
      p.y += p.vy * dt;
      p.x += p.vx * dt + Math.sin(p.phase * p.swayFreq) * 0.25 * dt;
      p.angle += p.va * dt;
      p.size = p.baseSize * (0.72 + 0.28 * Math.sin(p.phase));
      if (p.y > H + 40) { particles[i] = makeParticle(false); continue; }
      if (p.x < -40) p.x = W + 30;
      if (p.x > W + 40) p.x = -30;
      drawParticle(p);
    }
    rafId = requestAnimationFrame(frame);
  }

  function syncToggle() {
    if (!toggle) return;
    var lab = toggle.querySelector('.label');
    if (lab) lab.textContent = running ? '光效开启' : '光效关闭';
    toggle.style.opacity = running ? '1' : '0.65';
  }

  function start() {
    if (running) return;
    running = true;
    if (!canvas) initCanvas();
    if (particles.length === 0) spawnAll();
    lastTs = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(frame);
    syncToggle();
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    if (canvas) { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); canvas.style.display = 'none'; }
    syncToggle();
  }

  function setTimer(minutes) {
    if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; }
    if (minutes && minutes > 0) {
      timerHandle = setTimeout(function () { stop(); }, minutes * 60 * 1000);
    }
  }

  function destroy() {
    running = false;
    cancelAnimationFrame(rafId);
    rafId = null;
    if (canvas && canvas.isConnected) canvas.remove();
    if (toggle && toggle.isConnected) toggle.remove();
    if (timerHandle) { clearTimeout(timerHandle); timerHandle = null; }
    window.removeEventListener('resize', resize);
    delete window[NS];
  }

  function buildToggle() {
    toggle = document.createElement('div');
    toggle.style.cssText =
      'position:fixed;right:20px;bottom:20px;z-index:2147483001;pointer-events:auto;cursor:pointer;' +
      'user-select:none;font:12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif;' +
      'color:#fff;background:rgba(20,20,30,0.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'padding:8px 12px;border-radius:999px;box-shadow:0 4px 14px rgba(0,0,0,0.25);' +
      'display:flex;align-items:center;gap:6px;transition:opacity .3s;opacity:0.65;';
    toggle.innerHTML =
      '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#7ee8c0;"></span>' +
      '<span class="label">光效关闭</span>';
    toggle.addEventListener('click', function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      if (running) stop(); else start();
    });
    document.documentElement.appendChild(toggle);
  }

  window.addEventListener('resize', resize);
  if (CFG.showToggleButton) buildToggle();
  if (CFG.autoStart) start();

  window[NS] = {
    start: start,
    stop: stop,
    destroy: destroy,
    setTimer: setTimer,
    config: CFG,
    isRunning: function () { return running; }
  };
})();