(function() {
  if (document.getElementById('zizhou-engine')) return;

  const existingStyle = document.getElementById('zizhou-engine-style');
  if (existingStyle) existingStyle.remove();
  const existingRoot = document.getElementById('zizhou-engine');
  if (existingRoot) existingRoot.remove();

  const style = document.createElement('style');
  style.id = 'zizhou-engine-style';
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    #zizhou-engine {
      position: fixed;
      inset: 0;
      z-index: 999999;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
    }

    #zizhou-engine * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .zizhou-bg {
      position: absolute;
      inset: 0;
      transition: background 0.5s ease;
    }

    .zizhou-bg.light {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    }

    .zizhou-bg.dark {
      background: linear-gradient(135deg, #0c0c1d 0%, #1a1a3e 50%, #2d1b69 100%);
    }

    .zizhou-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }

    .zizhou-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }

    .zizhou-logo {
      margin-bottom: 48px;
      text-align: center;
      animation: zizhou-fadeIn 1s ease-out;
    }

    @keyframes zizhou-fadeIn {
      from { opacity: 0; transform: translateY(-30px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .zizhou-logo-text {
      font-size: 72px;
      font-weight: 800;
      letter-spacing: -2px;
      background: linear-gradient(135deg, #fff 0%, #e0e0ff 50%, #c0c0ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: none;
      position: relative;
      display: inline-block;
    }

    .zizhou-bg.dark .zizhou-logo-text {
      background: linear-gradient(135deg, #a78bfa 0%, #c4b5fd 30%, #e9d5ff 60%, #f0abfc 100%);
      -webkit-background-clip: text;
      background-clip: text;
    }

    .zizhou-logo-sub {
      font-size: 14px;
      font-weight: 300;
      letter-spacing: 8px;
      text-transform: uppercase;
      color: rgba(255,255,255,0.6);
      margin-top: 4px;
    }

    .zizhou-search-wrapper {
      width: 100%;
      max-width: 680px;
      animation: zizhou-fadeIn 1s ease-out 0.3s both;
    }

    .zizhou-search-box {
      position: relative;
      width: 100%;
    }

    .zizhou-search-input {
      width: 100%;
      height: 64px;
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 32px;
      padding: 0 64px 0 24px;
      font-size: 18px;
      font-family: 'Inter', sans-serif;
      color: #fff;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      outline: none;
      transition: all 0.3s ease;
    }

    .zizhou-search-input::placeholder {
      color: rgba(255,255,255,0.4);
    }

    .zizhou-search-input:focus {
      border-color: rgba(255,255,255,0.5);
      background: rgba(255,255,255,0.15);
      box-shadow: 0 0 40px rgba(139,92,246,0.3);
    }

    .zizhou-search-btn {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      border-radius: 50%;
      border: none;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(139,92,246,0.4);
    }

    .zizhou-search-btn:hover {
      transform: translateY(-50%) scale(1.1);
      box-shadow: 0 6px 25px rgba(139,92,246,0.6);
    }

    .zizhou-search-btn:active {
      transform: translateY(-50%) scale(0.95);
    }

    .zizhou-search-btn svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: #fff;
      stroke-width: 2.5;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .zizhou-shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
      margin-top: 32px;
      animation: zizhou-fadeIn 1s ease-out 0.6s both;
    }

    .zizhou-shortcut {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 20px;
      background: rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      color: rgba(255,255,255,0.8);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
    }

    .zizhou-shortcut:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.25);
      color: #fff;
      transform: translateY(-2px);
    }

    .zizhou-shortcut-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .zizhou-theme-toggle {
      position: fixed;
      top: 24px;
      right: 24px;
      z-index: 10;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      color: rgba(255,255,255,0.7);
      font-size: 18px;
    }

    .zizhou-theme-toggle:hover {
      background: rgba(255,255,255,0.2);
      color: #fff;
      transform: scale(1.1);
    }

    .zizhou-footer {
      position: fixed;
      bottom: 24px;
      left: 0;
      right: 0;
      text-align: center;
      color: rgba(255,255,255,0.3);
      font-size: 12px;
      font-family: 'Inter', sans-serif;
      animation: zizhou-fadeIn 1s ease-out 0.9s both;
    }

    .zizhou-footer a {
      color: rgba(255,255,255,0.5);
      text-decoration: none;
      transition: color 0.3s;
    }

    .zizhou-footer a:hover {
      color: rgba(255,255,255,0.8);
    }

    .zizhou-close {
      position: fixed;
      top: 24px;
      left: 24px;
      z-index: 10;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.2);
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      color: rgba(255,255,255,0.7);
      font-size: 18px;
    }

    .zizhou-close:hover {
      background: rgba(255,82,82,0.3);
      border-color: rgba(255,82,82,0.5);
      color: #ff5252;
      transform: scale(1.1);
    }

    .zizhou-suggestions {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      background: rgba(30,30,60,0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255,255,255,0.1);
      overflow: hidden;
      display: none;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .zizhou-suggestions.active {
      display: block;
      animation: zizhou-slideDown 0.2s ease-out;
    }

    @keyframes zizhou-slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .zizhou-suggestion-item {
      padding: 14px 24px;
      color: rgba(255,255,255,0.8);
      font-size: 15px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .zizhou-suggestion-item:hover,
    .zizhou-suggestion-item.active {
      background: rgba(139,92,246,0.2);
      color: #fff;
    }

    .zizhou-suggestion-item svg {
      width: 16px;
      height: 16px;
      stroke: rgba(255,255,255,0.4);
      fill: none;
      stroke-width: 2;
      flex-shrink: 0;
    }

    .zizhou-time {
      position: fixed;
      top: 24px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      font-family: 'Inter', sans-serif;
      font-weight: 300;
      letter-spacing: 2px;
    }
  `;

  document.head.appendChild(style);

  const root = document.createElement('div');
  root.id = 'zizhou-engine';

  let isDark = true;

  root.innerHTML = `
    <div class="zizhou-bg dark"></div>
    <canvas class="zizhou-particles"></canvas>
    <div class="zizhou-time" id="zizhou-time"></div>
    <button class="zizhou-close" id="zizhou-close" title="关闭">✕</button>
    <button class="zizhou-theme-toggle" id="zizhou-theme" title="切换主题">☀️</button>
    <div class="zizhou-container">
      <div class="zizhou-logo">
        <div class="zizhou-logo-text">Zizhou</div>
        <div class="zizhou-logo-sub">Search Engine</div>
      </div>
      <div class="zizhou-search-wrapper">
        <div class="zizhou-search-box">
          <input type="text" class="zizhou-search-input" id="zizhou-input" placeholder="搜索任何内容..." autocomplete="off" />
          <button class="zizhou-search-btn" id="zizhou-search-btn">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
          <div class="zizhou-suggestions" id="zizhou-suggestions"></div>
        </div>
      </div>
      <div class="zizhou-shortcuts">
        <a class="zizhou-shortcut" data-query="今日新闻">
          <span class="zizhou-shortcut-icon">📰</span>今日新闻
        </a>
        <a class="zizhou-shortcut" data-query="AI 人工智能">
          <span class="zizhou-shortcut-icon">🤖</span>AI 资讯
        </a>
        <a class="zizhou-shortcut" data-query="GitHub 热门项目">
          <span class="zizhou-shortcut-icon">💻</span>开源项目
        </a>
        <a class="zizhou-shortcut" data-query="科技前沿">
          <span class="zizhou-shortcut-icon">🚀</span>科技前沿
        </a>
        <a class="zizhou-shortcut" data-query="音乐推荐">
          <span class="zizhou-shortcut-icon">🎵</span>音乐
        </a>
      </div>
    </div>
    <div class="zizhou-footer">
      <p>© 2026 Zizhou Search — 搜索由必应提供 · <a href="javascript:void(0)">关于</a> · <a href="javascript:void(0)">隐私</a></p>
    </div>
  `;

  document.body.appendChild(root);

  // Time display
  function updateTime() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const y = now.getFullYear();
    const mo = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const el = document.getElementById('zizhou-time');
    if (el) el.textContent = y + '.' + mo + '.' + d + '  ' + h + ':' + m + ':' + s;
  }
  updateTime();
  setInterval(updateTime, 1000);

  // Canvas particles
  const canvas = root.querySelector('.zizhou-particles');
  const ctx = canvas.getContext('2d');
  let particles = [];

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.5;
      this.speedY = (Math.random() - 0.5) * 0.5;
      this.opacity = Math.random() * 0.5 + 0.1;
    }
    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
      if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(167, 139, 250, ' + this.opacity + ')';
      ctx.fill();
    }
  }

  for (let i = 0; i < 80; i++) {
    particles.push(new Particle());
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p) {
      p.update();
      p.draw();
    });
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const lineOpacity = (1 - dist / 120) * 0.3;
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = 'rgba(167, 139, 250, ' + lineOpacity + ')';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    requestAnimationFrame(animateParticles);
  }
  animateParticles();

  // Theme toggle
  const themeBtn = document.getElementById('zizhou-theme');
  const bgEl = root.querySelector('.zizhou-bg');

  themeBtn.addEventListener('click', function() {
    isDark = !isDark;
    if (isDark) {
      bgEl.className = 'zizhou-bg dark';
      themeBtn.textContent = '☀️';
    } else {
      bgEl.className = 'zizhou-bg light';
      themeBtn.textContent = '🌙';
    }
  });

  // Close
  document.getElementById('zizhou-close').addEventListener('click', function() {
    root.remove();
    style.remove();
  });

  // Search — 使用 Bing
  const input = document.getElementById('zizhou-input');
  const suggestionsEl = document.getElementById('zizhou-suggestions');

  function doSearch(query) {
    if (!query.trim()) return;
    const url = 'https://www.bing.com/search?q=' + encodeURIComponent(query.trim());
    window.open(url, '_blank');
    suggestionsEl.classList.remove('active');
  }

  document.getElementById('zizhou-search-btn').addEventListener('click', function() {
    doSearch(input.value);
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
      doSearch(input.value);
    }
    if (e.key === 'Escape') {
      suggestionsEl.classList.remove('active');
      input.blur();
    }
  });

  // Suggestions
  const suggestionData = [
    'Zizhou 搜索引擎是什么',
    '最新科技新闻',
    'JavaScript 教程',
    'Python 机器学习',
    'Web 开发最佳实践',
    '人工智能发展现状',
    'CSS 动画效果',
    'React vs Vue',
    '深度学习入门',
    '开源软件推荐',
    '如何学习编程',
    'ChatGPT 最新消息',
    '区块链技术解析',
    '数据结构与算法',
    'Linux 常用命令',
  ];

  input.addEventListener('input', function() {
    const val = input.value.trim().toLowerCase();
    if (!val) {
      suggestionsEl.classList.remove('active');
      return;
    }
    const matches = suggestionData.filter(function(s) {
      return s.toLowerCase().includes(val);
    }).slice(0, 6);
    if (matches.length === 0) {
      suggestionsEl.classList.remove('active');
      return;
    }
    suggestionsEl.innerHTML = matches.map(function(m) {
      return '<div class="zizhou-suggestion-item" data-query="' + m + '">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        m +
        '</div>';
    }).join('');
    suggestionsEl.classList.add('active');

    suggestionsEl.querySelectorAll('.zizhou-suggestion-item').forEach(function(item) {
      item.addEventListener('click', function() {
        input.value = item.dataset.query;
        doSearch(item.dataset.query);
      });
    });
  });

  input.addEventListener('focus', function() {
    if (input.value.trim()) {
      input.dispatchEvent(new Event('input'));
    }
  });

  document.addEventListener('click', function(e) {
    if (!root.contains(e.target)) {
      suggestionsEl.classList.remove('active');
    }
  });

  // Shortcuts
  root.querySelectorAll('.zizhou-shortcut').forEach(function(sc) {
    sc.addEventListener('click', function(e) {
      e.preventDefault();
      const query = sc.dataset.query;
      input.value = query;
      doSearch(query);
    });
  });

  // Auto-focus
  setTimeout(function() { input.focus(); }, 500);
})();