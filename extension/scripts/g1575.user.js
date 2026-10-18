(function () {
  const existingOverlay = document.getElementById("godot-overlay");
  if (existingOverlay) {
    existingOverlay.remove();
    const oldStyle = document.getElementById("godot-overlay-style");
    if (oldStyle) oldStyle.remove();
    return;
  }

  const style = document.createElement("style");
  style.id = "godot-overlay-style";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&display=swap');
    * { box-sizing: border-box; }
    #godot-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      overflow: hidden;
      font-family: 'Noto Serif SC', 'PingFang SC', 'Microsoft YaHei', serif;
      background:
        radial-gradient(circle at 50% 22%, rgba(255, 214, 102, 0.12), transparent 28%),
        radial-gradient(circle at 20% 80%, rgba(120, 160, 255, 0.10), transparent 30%),
        radial-gradient(circle at 80% 15%, rgba(255, 255, 255, 0.06), transparent 20%),
        linear-gradient(145deg, #090909 0%, #111321 45%, #171d2f 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .godot-noise, .godot-stars, .godot-glow {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .godot-noise {
      opacity: 0.06;
      background-image:
        linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 4px 4px;
      mix-blend-mode: soft-light;
    }
    .godot-star {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.9);
      animation: twinkle 4s ease-in-out infinite;
      box-shadow: 0 0 8px rgba(255,255,255,0.35);
    }
    @keyframes twinkle {
      0%, 100% { opacity: 0.2; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.35); }
    }
    .godot-glow::before, .godot-glow::after {
      content: "";
      position: absolute;
      border-radius: 999px;
      filter: blur(90px);
      opacity: 0.32;
    }
    .godot-glow::before {
      width: 360px;
      height: 360px;
      left: 50%;
      top: 16%;
      transform: translateX(-50%);
      background: rgba(255, 217, 102, 0.24);
      animation: breathe 6s ease-in-out infinite;
    }
    .godot-glow::after {
      width: 300px;
      height: 300px;
      right: 10%;
      bottom: 8%;
      background: rgba(122, 162, 255, 0.14);
      animation: breathe 7s ease-in-out infinite reverse;
    }
    @keyframes breathe {
      0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.22; }
      50% { transform: translateX(-50%) scale(1.08); opacity: 0.38; }
    }
    .godot-card {
      position: relative;
      z-index: 2;
      width: min(860px, 92vw);
      padding: 60px 50px;
      border-radius: 30px;
      text-align: center;
      color: #f4f1ea;
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 24px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      animation: fadeUp 1.5s ease-out both;
    }
    .godot-card::before, .godot-card::after {
      content: "";
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 4px;
      height: 70%;
      background: linear-gradient(to bottom, rgba(255, 215, 106, 0.8), rgba(255, 215, 106, 0.4), rgba(255, 215, 106, 0.8));
      border-radius: 2px;
      box-shadow: 0 0 12px rgba(255, 215, 106, 0.3);
      z-index: 1;
    }
    .godot-card::before { left: 15px; }
    .godot-card::after { right: 15px; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .top-line {
      font-size: 12px;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.52);
      margin-bottom: 24px;
    }
    .main-text {
      font-size: clamp(24px, 3.8vw, 40px);
      line-height: 1.6;
      font-weight: 500;
      margin: 0 auto 28px;
      max-width: 680px;
      text-shadow: 0 0 20px rgba(255,255,255,0.08);
    }
    .highlight {
      color: #ffd76a;
      text-shadow: 0 0 18px rgba(255, 215, 106, 0.28), 0 0 32px rgba(255, 215, 106, 0.18);
    }
    .divider {
      width: 76px;
      height: 1px;
      margin: 0 auto 26px;
      background: linear-gradient(90deg, transparent, rgba(255,215,106,0.85), transparent);
    }
    .quote {
      font-size: clamp(18px, 2.6vw, 26px);
      line-height: 1.9;
      color: rgba(244, 241, 234, 0.92);
      margin: 0 auto;
      max-width: 540px;
      position: relative;
      padding: 8px 16px 0;
    }
    .quote::before, .quote::after {
      position: absolute;
      font-size: 36px;
      color: rgba(255, 215, 106, 0.35);
      line-height: 1;
    }
    .quote::before { content: "“"; left: -4px; top: -2px; }
    .quote::after { content: "”"; right: 2px; bottom: -14px; }
    .subtle {
      margin-top: 28px;
      font-size: 13px;
      color: rgba(255,255,255,0.42);
      letter-spacing: 0.08em;
    }
    .close-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 3;
      border: 1px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.82);
      padding: 10px 16px;
      border-radius: 999px;
      cursor: pointer;
      font-size: 13px;
      letter-spacing: 0.08em;
      transition: all 0.25s ease;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .close-btn:hover { background: rgba(255,255,255,0.14); transform: translateY(-1px); }
    @media (max-width: 768px) {
      .godot-card { padding: 40px 20px; border-radius: 24px; }
      .godot-card::before, .godot-card::after { width: 3px; height: 60%; }
      .godot-card::before { left: 10px; }
      .godot-card::after { right: 10px; }
      .top-line { margin-bottom: 18px; letter-spacing: 0.25em; font-size: 11px; }
      .main-text { font-size: clamp(20px, 3.2vw, 32px); line-height: 1.5; }
      .quote { font-size: clamp(16px, 2.2vw, 22px); line-height: 1.7; }
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.id = "godot-overlay";

  const noise = document.createElement("div");
  noise.className = "godot-noise";

  const stars = document.createElement("div");
  stars.className = "godot-stars";

  const glow = document.createElement("div");
  glow.className = "godot-glow";

  const card = document.createElement("div");
  card.className = "godot-card";

  const topLine = document.createElement("div");
  topLine.className = "top-line";
  topLine.textContent = "To everyone who stayed";

  const mainText = document.createElement("div");
  mainText.className = "main-text";
  // 修复：正确的 HTML 标签格式
  mainText.innerHTML = '我只希望我的生活<br>可以给你们带来一些<span class="highlight">能量</span><span class="highlight">✨</span>';

  const divider = document.createElement("div");
  divider.className = "divider";

  const quote = document.createElement("div");
  quote.className = "quote";
  quote.innerHTML = "此地皆戈多，<br>因你们在此，<br>群响已成光。";

  const subtle = document.createElement("div");
  subtle.className = "subtle";
  subtle.textContent = "感谢每一份停留与共鸣";

  const closeBtn = document.createElement("button");
  closeBtn.className = "close-btn";
  closeBtn.textContent = "关闭";

  function cleanup() {
    overlay.remove();
    style.remove();
    document.removeEventListener("keydown", handleEsc);
  }

  function handleEsc(e) {
    if (e.key === "Escape") cleanup();
  }

  closeBtn.onclick = cleanup;
  document.addEventListener("keydown", handleEsc);

  card.appendChild(topLine);
  card.appendChild(mainText);
  card.appendChild(divider);
  card.appendChild(quote);
  card.appendChild(subtle);

  overlay.appendChild(noise);
  overlay.appendChild(stars);
  overlay.appendChild(glow);
  overlay.appendChild(card);
  overlay.appendChild(closeBtn);

  document.body.appendChild(overlay);

  function createStars() {
    const starCount = 110;
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement("div");
      star.className = "godot-star";
      const size = Math.random() * 2.2 + 0.8;
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 4;
      const duration = 3 + Math.random() * 2;
      star.style.width = size + "px";
      star.style.height = size + "px";
      star.style.left = x + "%";
      star.style.top = y + "%";
      star.style.animationDelay = delay + "s";
      star.style.animationDuration = duration + "s";
      stars.appendChild(star);
    }
  }

  createStars();

  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) cleanup();
  });

  console.log("✨ 致谢页面已加载");
})();