(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {};
  const __tabOriginalFunction = (
    /**
     * 🪵 敲木鱼特效脚本 v2.0 - 优化版
     *
     * 新增功能：
     * - ✅ 鼠标拖拽木鱼到任意位置
     * - ✅ localStorage 持久化功德值，刷新不丢失
     * - ✅ 连击系统（Combo）：连续敲击功德倍率递增
     * - ✅ 长按蓄力重击：按住越久敲得越重，特效越华丽
     * - ✅ 里程碑成就提示（10/50/100/500/1000）
     * - ✅ 分层音效：普通敲击 vs 蓄力重击不同音效
     * - ✅ Canvas 粒子系统：高性能，零 DOM 泄漏
     * - ✅ 自动敲击速度滑块（200ms ~ 1000ms）
     * - ✅ DOM 引用缓存，减少查询
     * - ✅ 暗色模式适配
     * - ✅ 结构化 cleanup，返回完整控制接口
     */

    async function run(args = {}) {
      // ========== 配置参数 ==========
      const config = {
        size: args.size || 80,
        autoMode: args.autoMode || false,
        autoInterval: args.autoInterval || 500,
        soundEnabled: args.soundEnabled !== false,
        particleCount: args.particleCount || 12,    // 默认粒子数提升
        comboTimeout: args.comboTimeout || 1200,    // 连击超时(ms)
        maxComboMultiplier: args.maxComboMultiplier || 10, // 最大连击倍率
        chargeThreshold: args.chargeThreshold || 300, // 长按判定阈值(ms)
        maxChargeTime: args.maxChargeTime || 2000,   // 最大蓄力时间(ms)
        storageKey: args.storageKey || 'muyu_v2_gongde',
      };

      // ========== 防重复实例 ==========
      if (document.getElementById('muyu-v2-container')) {
        return { ok: false, summary: '木鱼已存在，请先移除旧实例', error: 'duplicate_instance' };
      }

      // ========== 暗色模式检测 ==========
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

      // ========== 样式注入 ==========
      const styleId = 'muyu-v2-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          :root {
            --muyu-bg: linear-gradient(135deg, #8B4513, #D2691E);
            --muyu-text: #FFF8DC;
            --muyu-gold: #FFD700;
            --muyu-hint: #8B4513;
            --muyu-shadow: rgba(139, 69, 19, 0.5);
            --muyu-btn-bg: linear-gradient(135deg, #8B4513, #A0522D);
            --muyu-btn-hover: linear-gradient(135deg, #A0522D, #CD853F);
            --muyu-btn-border: #CD853F;
            --muyu-achievement-bg: linear-gradient(135deg, #1a0a00, #3d2000);
            --muyu-achievement-border: #DAA520;
            --muyu-slider-track: #CD853F;
            --muyu-slider-fill: #FFD700;
          }

          @media (prefers-color-scheme: dark) {
            :root {
              --muyu-bg: linear-gradient(135deg, #654321, #8B4513);
              --muyu-text: #FFE4B5;
              --muyu-hint: #CD853F;
              --muyu-shadow: rgba(0, 0, 0, 0.6);
              --muyu-btn-bg: linear-gradient(135deg, #5D3A1A, #8B4513);
              --muyu-btn-hover: linear-gradient(135deg, #8B4513, #A0522D);
              --muyu-btn-border: #A0522D;
              --muyu-achievement-bg: linear-gradient(135deg, #0a0500, #2a1500);
              --muyu-achievement-border: #B8860B;
            }
          }

          #muyu-v2-container {
            position: fixed;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            user-select: none;
            -webkit-user-select: none;
            transition: left 0s, top 0s, right 0s, bottom 0s;
          }
          #muyu-v2-container.dragging { cursor: grabbing; }

          .muyu-v2-fish {
            width: ${config.size}px;
            height: ${config.size}px;
            cursor: grab;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.06s ease-out, filter 0.1s;
            filter: drop-shadow(0 4px 12px var(--muyu-shadow));
          }
          .muyu-v2-fish:active { cursor: grabbing; }
          .muyu-v2-fish:hover { transform: scale(1.08); }
          .muyu-v2-fish.knocking { animation: muyuV2Knock 0.15s ease-out; }
          .muyu-v2-fish.heavy-knocking {
            animation: muyuV2HeavyKnock 0.25s ease-out;
            filter: drop-shadow(0 6px 20px rgba(255, 215, 0, 0.8));
          }

          @keyframes muyuV2Knock {
            0%   { transform: scale(1) rotate(0deg); }
            25%  { transform: scale(0.88) rotate(-5deg); }
            50%  { transform: scale(1.12) rotate(3deg); }
            75%  { transform: scale(0.95) rotate(-2deg); }
            100% { transform: scale(1) rotate(0deg); }
          }

          @keyframes muyuV2HeavyKnock {
            0%   { transform: scale(1) rotate(0deg); }
            20%  { transform: scale(0.80) rotate(-8deg); }
            45%  { transform: scale(1.20) rotate(6deg); }
            70%  { transform: scale(0.90) rotate(-3deg); }
            100% { transform: scale(1) rotate(0deg); }
          }

          .muyu-v2-svg { width: 100%; height: 100%; }

          .muyu-v2-counter {
            position: absolute;
            top: -52px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--muyu-bg);
            color: var(--muyu-text);
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 10px var(--muyu-shadow), inset 0 1px 0 rgba(255,255,255,0.15);
            letter-spacing: 1px;
            pointer-events: none;
          }
          .muyu-v2-counter-number {
            color: var(--muyu-gold);
            font-size: 17px;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.8);
            transition: transform 0.1s ease-out;
          }
          .muyu-v2-counter-number.bump { transform: scale(1.3); }

          /* 连击指示器 */
          .muyu-v2-combo-indicator {
            position: absolute;
            top: -78px;
            left: 50%;
            transform: translateX(-50%);
            color: var(--muyu-gold);
            font-size: 14px;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.9), 0 2px 4px rgba(0,0,0,0.4);
            white-space: nowrap;
            pointer-events: none;
            animation: muyuV2ComboPulse 0.3s ease-out;
            opacity: 0;
            transition: opacity 0.2s;
          }
          .muyu-v2-combo-indicator.visible { opacity: 1; }

          @keyframes muyuV2ComboPulse {
            0% { transform: translateX(-50%) scale(0.5); }
            60% { transform: translateX(-50%) scale(1.3); }
            100% { transform: translateX(-50%) scale(1); }
          }

          /* 飘字 */
          .muyu-v2-floating-text {
            position: fixed;
            pointer-events: none;
            font-size: 22px;
            font-weight: bold;
            color: var(--muyu-gold);
            text-shadow:
              0 0 8px rgba(255, 215, 0, 0.9),
              0 0 16px rgba(255, 165, 0, 0.6),
              0 2px 4px rgba(0,0,0,0.3);
            z-index: 2147483647;
            animation: muyuV2FloatUp 1.2s ease-out forwards;
            will-change: transform, opacity;
          }
          .muyu-v2-floating-text.heavy {
            font-size: 30px;
            color: #FFA500;
            text-shadow:
              0 0 12px rgba(255, 165, 0, 1),
              0 0 24px rgba(255, 69, 0, 0.8),
              0 4px 6px rgba(0,0,0,0.4);
          }

          @keyframes muyuV2FloatUp {
            0%   { opacity: 1; transform: translateY(0) scale(0.5); }
            20%  { opacity: 1; transform: translateY(-20px) scale(1.2); }
            100% { opacity: 0; transform: translateY(-120px) scale(0.8); }
          }

          /* Canvas 粒子层 */
          #muyu-v2-particle-canvas {
            position: fixed;
            top: 0; left: 0;
            width: 100vw; height: 100vh;
            pointer-events: none;
            z-index: 2147483646;
          }

          /* 成就弹窗 */
          .muyu-v2-achievement {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-120px);
            background: var(--muyu-achievement-bg);
            border: 2px solid var(--muyu-achievement-border);
            border-radius: 16px;
            padding: 12px 28px;
            z-index: 2147483648;
            pointer-events: none;
            text-align: center;
            box-shadow: 0 4px 24px rgba(218, 165, 32, 0.4);
            animation: muyuV2AchieveIn 2.5s ease-out forwards;
          }
          .muyu-v2-achievement-icon { font-size: 32px; }
          .muyu-v2-achievement-title {
            color: var(--muyu-gold);
            font-weight: bold;
            font-size: 16px;
            margin-top: 4px;
          }
          .muyu-v2-achievement-subtitle {
            color: var(--muyu-text);
            font-size: 12px;
            margin-top: 2px;
            opacity: 0.8;
          }

          @keyframes muyuV2AchieveIn {
            0%   { transform: translateX(-50%) translateY(-120px); opacity: 0; }
            15%  { transform: translateX(-50%) translateY(0); opacity: 1; }
            75%  { transform: translateX(-50%) translateY(0); opacity: 1; }
            100% { transform: translateX(-50%) translateY(-120px); opacity: 0; }
          }

          /* 控制面板 */
          .muyu-v2-controls {
            position: absolute;
            bottom: -68px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .muyu-v2-btn-row {
            display: flex;
            gap: 6px;
            align-items: center;
          }
          .muyu-v2-btn {
            background: var(--muyu-btn-bg);
            color: var(--muyu-text);
            border: 1px solid var(--muyu-btn-border);
            padding: 3px 10px;
            border-radius: 10px;
            font-size: 11px;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            box-shadow: 0 1px 4px var(--muyu-shadow);
          }
          .muyu-v2-btn:hover {
            background: var(--muyu-btn-hover);
            transform: translateY(-1px);
          }
          .muyu-v2-btn.active {
            background: linear-gradient(135deg, #DAA520, #FF8C00);
            box-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
          }

          /* 速度滑块 */
          .muyu-v2-speed-row {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            color: var(--muyu-hint);
          }
          .muyu-v2-slider {
            -webkit-appearance: none;
            width: 60px;
            height: 4px;
            border-radius: 2px;
            background: var(--muyu-slider-track);
            outline: none;
            cursor: pointer;
          }
          .muyu-v2-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--muyu-slider-fill);
            border: 2px solid var(--muyu-btn-border);
            cursor: pointer;
          }
          .muyu-v2-speed-label { min-width: 28px; text-align: center; }

          /* 提示 */
          .muyu-v2-hint {
            position: absolute;
            bottom: -92px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            color: var(--muyu-hint);
            white-space: nowrap;
            opacity: 0.7;
            pointer-events: none;
          }
        `;
        document.head.appendChild(style);
      }

      // ========== localStorage 持久化 ==========
      function loadGongde() {
        try {
          const stored = localStorage.getItem(config.storageKey);
          return stored ? Math.max(0, parseInt(stored, 10) || 0) : 0;
        } catch { return 0; }
      }
      function saveGongde(value) {
        try { localStorage.setItem(config.storageKey, String(value)); } catch {}
      }

      // ========== 创建 DOM ==========
      const container = document.createElement('div');
      container.id = 'muyu-v2-container';
      container.style.right = '24px';
      container.style.bottom = '24px';

      container.innerHTML = `
        <div class="muyu-v2-combo-indicator" id="muyu-v2-combo-indicator"></div>
        <div class="muyu-v2-counter">
          功德 <span class="muyu-v2-counter-number" id="muyu-v2-counter-num">0</span>
        </div>
        <div class="muyu-v2-fish" id="muyu-v2-fish" title="点击敲木鱼 | 长按蓄力重击 | 拖拽移动">
          <svg class="muyu-v2-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="muyuV2Body" cx="35%" cy="30%" r="70%">
                <stop offset="0%" stop-color="#DEB887"/>
                <stop offset="50%" stop-color="#8B4513"/>
                <stop offset="100%" stop-color="#654321"/>
              </radialGradient>
              <radialGradient id="muyuV2Highlight" cx="40%" cy="25%" r="50%">
                <stop offset="0%" stop-color="rgba(255,235,205,0.6)"/>
                <stop offset="100%" stop-color="rgba(255,235,205,0)"/>
              </radialGradient>
              <filter id="muyuV2Shadow">
                <feDropShadow dx="1" dy="2" stdDeviation="2" flood-color="#3d2000" flood-opacity="0.4"/>
              </filter>
            </defs>
            <ellipse cx="50" cy="55" rx="42" ry="36" fill="url(#muyuV2Body)" filter="url(#muyuV2Shadow)" stroke="#5D3A1A" stroke-width="1.5"/>
            <ellipse cx="38" cy="42" rx="18" ry="14" fill="url(#muyuV2Highlight)"/>
            <path d="M 34 52 Q 50 62 66 52 Q 58 56 50 57 Q 42 56 34 52Z" fill="#5D3A1A" opacity="0.6"/>
            <g stroke="#6B4423" stroke-width="0.8" fill="none" opacity="0.4">
              <path d="M 22 45 Q 28 40 34 45"/><path d="M 32 38 Q 40 33 48 38"/>
              <path d="M 46 35 Q 54 31 62 36"/><path d="M 60 40 Q 68 37 74 43"/>
              <path d="M 26 56 Q 34 51 42 56"/><path d="M 40 52 Q 50 47 58 53"/>
              <path d="M 56 51 Q 66 48 74 54"/><path d="M 30 67 Q 40 63 48 68"/>
              <path d="M 48 65 Q 58 61 66 67"/>
            </g>
            <circle cx="50" cy="55" r="8" fill="#CD853F" stroke="#8B4513" stroke-width="1"/>
            <circle cx="50" cy="55" r="5" fill="#DAA520" opacity="0.7"/>
            <text x="50" y="59" text-anchor="middle" font-size="9" fill="#5D3A1A" font-weight="bold">福</text>
          </svg>
        </div>
        <div class="muyu-v2-controls">
          <div class="muyu-v2-btn-row">
            <button class="muyu-v2-btn" id="muyu-v2-auto-btn">自动</button>
            <button class="muyu-v2-btn" id="muyu-v2-sound-btn">🔊</button>
            <button class="muyu-v2-btn" id="muyu-v2-reset-btn">重置</button>
          </div>
          <div class="muyu-v2-speed-row" id="muyu-v2-speed-row" style="display:none">
            <span>慢</span>
            <input type="range" class="muyu-v2-slider" id="muyu-v2-speed-slider" min="200" max="1000" value="${config.autoInterval}" step="50"/>
            <span>快</span>
            <span class="muyu-v2-speed-label" id="muyu-v2-speed-label">${config.autoInterval}ms</span>
          </div>
        </div>
        <div class="muyu-v2-hint">敲木鱼 · 积功德｜长按蓄力｜拖拽移动｜空格键敲击</div>
      `;
      document.body.appendChild(container);

      // ========== Canvas 粒子层 ==========
      const canvas = document.createElement('canvas');
      canvas.id = 'muyu-v2-particle-canvas';
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      document.body.appendChild(canvas);
      const ctx = canvas.getContext('2d');

      const particles = [];
      const PARTICLE_COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#FFE4B5', '#FFFF00', '#FFEC8B', '#FF4500'];

      function spawnParticles(x, y, count, heavy) {
        for (let i = 0; i < count; i++) {
          const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 1.0;
          const speed = heavy ? 80 + Math.random() * 120 : 40 + Math.random() * 60;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (heavy ? 50 : 20),
            life: 1,
            decay: heavy ? 0.012 + Math.random() * 0.008 : 0.016 + Math.random() * 0.01,
            size: heavy ? 5 + Math.random() * 5 : 3 + Math.random() * 4,
            color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
            heavy,
          });
        }
      }

      function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx * 0.016;
          p.y += p.vy * 0.016;
          p.vy += (p.heavy ? 60 : 40) * 0.016; // 重力
          p.life -= p.decay;
          if (p.life <= 0) { particles.splice(i, 1); continue; }
          ctx.globalAlpha = p.life;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = p.heavy ? 8 : 4;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        particleRafId = requestAnimationFrame(animateParticles);
      }
      let particleRafId = requestAnimationFrame(animateParticles);

      // Canvas resize
      const resizeHandler = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', resizeHandler);

      // ========== DOM 引用缓存 ==========
      const dom = {
        fish: document.getElementById('muyu-v2-fish'),
        counterNum: document.getElementById('muyu-v2-counter-num'),
        comboIndicator: document.getElementById('muyu-v2-combo-indicator'),
        autoBtn: document.getElementById('muyu-v2-auto-btn'),
        soundBtn: document.getElementById('muyu-v2-sound-btn'),
        resetBtn: document.getElementById('muyu-v2-reset-btn'),
        speedRow: document.getElementById('muyu-v2-speed-row'),
        speedSlider: document.getElementById('muyu-v2-speed-slider'),
        speedLabel: document.getElementById('muyu-v2-speed-label'),
      };

      // ========== 状态 ==========
      let gongde = loadGongde();
      let isAutoMode = config.autoMode;
      let soundEnabled = config.soundEnabled;
      let autoTimer = null;
      let autoInterval = config.autoInterval;
      let comboCount = 0;
      let comboTimer = null;
      let chargeStartTime = 0;
      let isCharging = false;
      let chargeTimer = null;
      const achievedMilestones = new Set();

      // 初始化计数器显示
      dom.counterNum.textContent = gongde;

      // ========== 音频系统 ==========
      let audioCtx = null;

      function getAudioContext() {
        if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
        if (audioCtx.state === 'suspended') { audioCtx.resume(); }
        return audioCtx;
      }

      function playKnockSound(heavy) {
        if (!soundEnabled) return;
        try {
          const ctx = getAudioContext();
          const t = ctx.currentTime;

          if (heavy) {
            // 重击音效 - 更低沉更有力
            for (let i = 0; i < 3; i++) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(600 - i * 80, t);
              osc.frequency.exponentialRampToValueAtTime(80 + i * 30, t + 0.25);
              gain.gain.setValueAtTime(0.6 - i * 0.15, t);
              gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
              osc.connect(gain); gain.connect(ctx.destination);
              osc.start(t); osc.stop(t + 0.5);
            }
            // 金属泛音
            const oscM = ctx.createOscillator();
            const gainM = ctx.createGain();
            oscM.type = 'triangle';
            oscM.frequency.setValueAtTime(2000, t);
            oscM.frequency.exponentialRampToValueAtTime(600, t + 0.3);
            gainM.gain.setValueAtTime(0.3, t);
            gainM.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
            oscM.connect(gainM); gainM.connect(ctx.destination);
            oscM.start(t); oscM.stop(t + 0.5);
          } else {
            // 普通音效
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(800, t);
            osc1.frequency.exponentialRampToValueAtTime(300, t + 0.08);
            gain1.gain.setValueAtTime(0.5, t);
            gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc1.connect(gain1); gain1.connect(ctx.destination);
            osc1.start(t); osc1.stop(t + 0.2);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(1600, t);
            osc2.frequency.exponentialRampToValueAtTime(800, t + 0.15);
            gain2.gain.setValueAtTime(0.2, t);
            gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
            osc2.connect(gain2); gain2.connect(ctx.destination);
            osc2.start(t); osc2.stop(t + 0.3);

            const osc3 = ctx.createOscillator();
            const gain3 = ctx.createGain();
            osc3.type = 'sine';
            osc3.frequency.setValueAtTime(150, t);
            gain3.gain.setValueAtTime(0.3, t);
            gain3.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc3.connect(gain3); gain3.connect(ctx.destination);
            osc3.start(t); osc3.stop(t + 0.4);
          }
        } catch {}
      }

      // ========== 飘字 ==========
      function createFloatingText(x, y, heavy, multiplier) {
        let text;
        if (heavy && multiplier >= 10) {
          text = `+大功德 x${multiplier}`;
        } else if (multiplier > 1) {
          text = `+功德 x${multiplier}`;
        } else {
          const texts = ['+功德', '+善缘', '+福报', '+清净', '+智慧'];
          text = texts[Math.floor(Math.random() * texts.length)];
        }

        const el = document.createElement('div');
        el.className = `muyu-v2-floating-text${heavy ? ' heavy' : ''}`;
        el.textContent = text;
        el.style.left = (x + (Math.random() - 0.5) * 50) + 'px';
        el.style.top = (y - 10) + 'px';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1200);
      }

      // ========== 成就系统 ==========
      const MILESTONES = [
        { value: 10, icon: '🌱', title: '初入佛门', subtitle: '功德 +10' },
        { value: 50, icon: '🌿', title: '小有成就', subtitle: '功德 +50' },
        { value: 100, icon: '🌳', title: '功德无量', subtitle: '功德破百' },
        { value: 500, icon: '🏯', title: '得道高僧', subtitle: '功德 +500' },
        { value: 1000, icon: '🌟', title: '立地成佛', subtitle: '功德破千' },
        { value: 5000, icon: '👑', title: '佛光普照', subtitle: '功德 +5000' },
      ];

      function checkMilestone() {
        for (const m of MILESTONES) {
          if (gongde >= m.value && !achievedMilestones.has(m.value)) {
            achievedMilestones.add(m.value);
            showAchievement(m);
          }
        }
      }

      function showAchievement(milestone) {
        const el = document.createElement('div');
        el.className = 'muyu-v2-achievement';
        el.innerHTML = `
          <div class="muyu-v2-achievement-icon">${milestone.icon}</div>
          <div class="muyu-v2-achievement-title">${milestone.title}</div>
          <div class="muyu-v2-achievement-subtitle">${milestone.subtitle}</div>
        `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 2600);
      }

      // ========== 连击系统 ==========
      function getMultiplier() {
        if (comboCount < 3) return 1;          // 1-2次: x1
        if (comboCount < 7) return 2;           // 3-6次: x2
        if (comboCount < 15) return 3;          // 7-14次: x3
        if (comboCount < 30) return 5;          // 15-29次: x5
        return Math.min(config.maxComboMultiplier, Math.floor(comboCount / 5)); // 30+: 逐步递增
      }

      function updateCombo() {
        clearTimeout(comboTimer);
        comboCount++;
        comboTimer = setTimeout(() => { comboCount = 0; dom.comboIndicator.classList.remove('visible'); }, config.comboTimeout);

        const mult = getMultiplier();
        if (mult >= 3) {
          dom.comboIndicator.textContent = `${comboCount}连击 x${mult}`;
          dom.comboIndicator.classList.add('visible');
          // 重新触发动画
          dom.comboIndicator.style.animation = 'none';
          void dom.comboIndicator.offsetWidth;
          dom.comboIndicator.style.animation = 'muyuV2ComboPulse 0.3s ease-out';
        } else if (comboCount >= 5) {
          dom.comboIndicator.textContent = `${comboCount}连击`;
          dom.comboIndicator.classList.add('visible');
        }
      }

      // ========== 获取木鱼中心坐标 ==========
      function getFishCenter() {
        const rect = dom.fish.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }

      // ========== 核心敲击 ==========
      function knock(heavy = false) {
        // 连击
        updateCombo();
        const multiplier = getMultiplier();
        const earned = heavy ? multiplier * 3 : multiplier;

        // 更新功德
        gongde += earned;
        saveGongde(gongde);
        dom.counterNum.textContent = gongde;

        // 计数器弹跳
        dom.counterNum.classList.add('bump');
        setTimeout(() => dom.counterNum.classList.remove('bump'), 150);

        // 动画
        const animClass = heavy ? 'heavy-knocking' : 'knocking';
        dom.fish.classList.remove('knocking', 'heavy-knocking');
        void dom.fish.offsetWidth;
        dom.fish.classList.add(animClass);

        // 特效
        const pos = getFishCenter();
        createFloatingText(pos.x, pos.y, heavy, multiplier);
        spawnParticles(pos.x, pos.y, heavy ? config.particleCount * 2 : config.particleCount, heavy);

        // 音效
        playKnockSound(heavy);

        // 成就检查
        checkMilestone();

        // 移除动画
        setTimeout(() => dom.fish.classList.remove(animClass), heavy ? 250 : 150);
      }

      // ========== 拖拽 ==========
      let isDragging = false;
      let dragStartX, dragStartY, containerStartLeft, containerStartTop;

      function getContainerPos() {
        const rect = container.getBoundingClientRect();
        // 清除 right/bottom，改用 left/top
        container.style.right = '';
        container.style.bottom = '';
        container.style.left = rect.left + 'px';
        container.style.top = rect.top + 'px';
      }

      dom.fish.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // 仅左键
        isDragging = false;
        chargeStartTime = Date.now();
        isCharging = true;

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        // 先转 left/top 定位
        const rect = container.getBoundingClientRect();
        containerStartLeft = rect.left;
        containerStartTop = rect.top;
        container.style.right = '';
        container.style.bottom = '';
        container.style.left = containerStartLeft + 'px';
        container.style.top = containerStartTop + 'px';

        // 蓄力视觉反馈定时器
        chargeTimer = setInterval(() => {
          const elapsed = Date.now() - chargeStartTime;
          if (elapsed > config.chargeThreshold) {
            const ratio = Math.min(1, (elapsed - config.chargeThreshold) / (config.maxChargeTime - config.chargeThreshold));
            const glowSize = 12 + ratio * 30;
            dom.fish.style.filter = `drop-shadow(0 4px ${glowSize}px rgba(255, 215, 0, ${0.4 + ratio * 0.6}))`;
          }
        }, 50);
      });

      const onMouseMove = (e) => {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
          isDragging = true;
          isCharging = false;
          clearInterval(chargeTimer);
          dom.fish.style.filter = '';
          container.classList.add('dragging');
          container.style.left = (containerStartLeft + dx) + 'px';
          container.style.top = (containerStartTop + dy) + 'px';
        }
      };

      const onMouseUp = (e) => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        container.classList.remove('dragging');

        clearInterval(chargeTimer);
        dom.fish.style.filter = '';

        const chargeDuration = Date.now() - chargeStartTime;

        if (isDragging) {
          // 拖拽结束，吸附到边缘
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          if (cx < window.innerWidth / 2) {
            container.style.right = '';
            container.style.left = Math.max(0, rect.left) + 'px';
          } else {
            container.style.left = '';
            container.style.right = Math.max(0, window.innerWidth - rect.right) + 'px';
          }
          container.style.top = Math.max(0, Math.min(window.innerHeight - rect.height - 20, rect.top)) + 'px';
        } else {
          // 点击触发敲击
          const heavy = chargeDuration > config.chargeThreshold;
          knock(heavy);
        }

        isDragging = false;
        isCharging = false;
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      // 触摸拖拽支持
      dom.fish.addEventListener('touchstart', (e) => {
        isDragging = false;
        chargeStartTime = Date.now();
        isCharging = true;

        const touch = e.touches[0];
        dragStartX = touch.clientX;
        dragStartY = touch.clientY;

        const rect = container.getBoundingClientRect();
        containerStartLeft = rect.left;
        containerStartTop = rect.top;
        container.style.right = '';
        container.style.bottom = '';
        container.style.left = containerStartLeft + 'px';
        container.style.top = containerStartTop + 'px';

        chargeTimer = setInterval(() => {
          const elapsed = Date.now() - chargeStartTime;
          if (elapsed > config.chargeThreshold) {
            const ratio = Math.min(1, (elapsed - config.chargeThreshold) / (config.maxChargeTime - config.chargeThreshold));
            const glowSize = 12 + ratio * 30;
            dom.fish.style.filter = `drop-shadow(0 4px ${glowSize}px rgba(255, 215, 0, ${0.4 + ratio * 0.6}))`;
          }
        }, 50);
      }, { passive: false });

      const onTouchMove = (e) => {
        const touch = e.touches[0];
        const dx = touch.clientX - dragStartX;
        const dy = touch.clientY - dragStartY;
        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
          isDragging = true;
          isCharging = false;
          clearInterval(chargeTimer);
          dom.fish.style.filter = '';
          container.classList.add('dragging');
          container.style.left = (containerStartLeft + dx) + 'px';
          container.style.top = (containerStartTop + dy) + 'px';
        }
      };

      const onTouchEnd = (e) => {
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        container.classList.remove('dragging');

        clearInterval(chargeTimer);
        dom.fish.style.filter = '';

        const chargeDuration = Date.now() - chargeStartTime;

        if (isDragging) {
          const rect = container.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          if (cx < window.innerWidth / 2) {
            container.style.right = '';
            container.style.left = Math.max(0, rect.left) + 'px';
          } else {
            container.style.left = '';
            container.style.right = Math.max(0, window.innerWidth - rect.right) + 'px';
          }
          container.style.top = Math.max(0, Math.min(window.innerHeight - rect.height - 20, rect.top)) + 'px';
        } else {
          const heavy = chargeDuration > config.chargeThreshold;
          knock(heavy);
        }

        isDragging = false;
        isCharging = false;
      };

      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);

      // ========== 控制按钮 ==========
      dom.autoBtn.addEventListener('click', () => {
        isAutoMode = !isAutoMode;
        dom.autoBtn.classList.toggle('active', isAutoMode);
        dom.autoBtn.textContent = isAutoMode ? '停止' : '自动';
        dom.speedRow.style.display = isAutoMode ? 'flex' : 'none';

        if (isAutoMode) {
          autoTimer = setInterval(() => knock(false), autoInterval);
        } else {
          clearInterval(autoTimer);
          autoTimer = null;
        }
      });

      dom.speedSlider.addEventListener('input', () => {
        autoInterval = parseInt(dom.speedSlider.value, 10);
        dom.speedLabel.textContent = autoInterval + 'ms';
        if (isAutoMode) {
          clearInterval(autoTimer);
          autoTimer = setInterval(() => knock(false), autoInterval);
        }
      });

      dom.soundBtn.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        dom.soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
      });

      dom.resetBtn.addEventListener('click', () => {
        gongde = 0;
        comboCount = 0;
        dom.counterNum.textContent = '0';
        dom.comboIndicator.classList.remove('visible');
        saveGongde(0);
      });

      // ========== 键盘快捷键 ==========
      const keyHandler = (e) => {
        if (e.code === 'Space' && e.target === document.body) {
          e.preventDefault();
          knock(false);
        }
      };
      document.addEventListener('keydown', keyHandler);

      // ========== 初始状态恢复 ==========
      if (isAutoMode) {
        dom.autoBtn.classList.add('active');
        dom.autoBtn.textContent = '停止';
        dom.speedRow.style.display = 'flex';
        autoTimer = setInterval(() => knock(false), autoInterval);
      }

      // ========== 清理句柄 ==========
      container._cleanup = () => {
        if (autoTimer) clearInterval(autoTimer);
        if (comboTimer) clearTimeout(comboTimer);
        if (chargeTimer) clearInterval(chargeTimer);
        cancelAnimationFrame(particleRafId);
        document.removeEventListener('keydown', keyHandler);
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('resize', resizeHandler);
        if (audioCtx && audioCtx.state !== 'closed') {
          audioCtx.close().catch(() => {});
        }
        // 移除 DOM
        if (container.parentNode) container.parentNode.removeChild(container);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };

      // 初始轻敲一下
      setTimeout(() => knock(false), 600);

      return {
        ok: true,
        summary: '🪵 敲木鱼 v2.0 已激活！支持拖拽、连击、蓄力重击、成就系统',
        data: {
          gongde,
          config,
          shortcuts: ['点击木鱼', '长按蓄力重击', '拖拽木鱼移动', '空格键敲击'],
          features: [
            '鼠标/触摸拖拽木鱼到任意位置',
            '连击系统（Combo）：连续敲击倍率递增 x1 ~ x' + config.maxComboMultiplier,
            '长按蓄力重击：按住 >300ms 释放 = 3倍功德 + 华丽特效',
            '里程碑成就（10/50/100/500/1000）',
            'Canvas 高性能粒子系统',
            '自动敲击 + 速度滑块（200-1000ms）',
            'localStorage 持久化，刷新不丢失功德',
            '暗色模式自适应',
          ],
        },
        warnings: [],
        cleanup: container._cleanup,
      };
    }
  );

  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();