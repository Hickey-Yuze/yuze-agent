(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 🪵 敲木鱼特效脚本 v3 - Wooden Fish Knocking Effect (Updated Outline)
     *
     * 改进内容：
     * - 使用用户指定的新木鱼轮廓SVG路径（更逼真的鱼形）
     * - 保留原有高光、纹理、配色设计
     * - 莲花座、鱼鳞纹理、高光、宝珠等视觉特效完整保留
     * - 支持随意拖动（鼠标+触摸）
     * - 鼠标悬停显示棒槌（无放大效果）
     * - 点击时棒槌抬起落下的敲击动画
     * - 功德计数器 + 飘字 + 粒子特效 + 音效
     *
     * 本次修复：
     * - 修复快速连击导致木鱼位置漂移的问题。
     *   原因：mousedown/touchstart 无条件用 getBoundingClientRect() 重锚定 left/top，
     *   而该测量会被敲击动画的 scale/rotate transform 污染，连点时误差逐次累积。
     *   方案：引入拖拽位移阈值，纯点击不再改动容器定位，超过阈值才进入拖拽。
     */

    async function run(args = {}) {
      const config = {
        size: args.size || 60,
        soundEnabled: args.soundEnabled !== false,
        particleCount: args.particleCount || 10,
        position: args.position || 'bottom-right',
      };

      // 检查是否已存在
      if (document.getElementById('muyu-container-v3')) {
        return { ok: false, summary: '木鱼已存在，请先移除旧实例', error: 'duplicate_instance' };
      }

      // ========== 样式注入 ==========
      const styleId = 'muyu-style-v3';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          #muyu-container-v3 {
            position: fixed;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            user-select: none;
            -webkit-user-select: none;
            cursor: grab;
          }
          #muyu-container-v3.dragging { cursor: grabbing; }
          #muyu-container-v3 * { pointer-events: none; }
          #muyu-container-v3 > .muyu-fish-wrap > *,
          #muyu-container-v3 .muyu-counter,
          #muyu-container-v3 .muyu-auto-btn,
          #muyu-container-v3 > .muyu-hint { pointer-events: auto; }

          /* ====== 顶部工具栏（居中、等距）====== */
          .muyu-topbar {
            position: absolute;
            top: -56px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            align-items: stretch;
            gap: 8px;
            pointer-events: none; /* 子元素各自开启 */
            transition: opacity 0.35s ease, transform 0.35s ease;
          }
          /* 敲击时淡出隐藏工具栏 */
          #muyu-container-v3.muyu-knocking .muyu-topbar {
            opacity: 0;
            transform: translateX(-50%) translateY(-6px);
          }
          /* 悬停工具栏区域时才临时显现（手动敲击鼠标在木鱼上，不会触发）*/
          #muyu-container-v3.muyu-knocking .muyu-topbar:hover {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          /* ====== 通用胶囊基底 ====== */
          .muyu-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 30px;
            box-sizing: border-box;
            padding: 0 14px;
            border-radius: 15px;
            font-size: 13px;
            font-weight: bold;
            white-space: nowrap;
            letter-spacing: 1px;
            background: linear-gradient(145deg, #8B4513, #A0522D);
            color: #FFF8DC;
            box-shadow: 0 3px 10px rgba(100, 50, 15, 0.45), inset 0 1px 0 rgba(255,255,255,0.22);
          }

          /* ====== 自动敲击按钮 ====== */
          .muyu-auto-btn {
            cursor: pointer;
            gap: 6px;
            transition: transform 0.12s, filter 0.2s, box-shadow 0.2s;
          }
          .muyu-auto-btn:hover { filter: brightness(1.12); }
          .muyu-auto-btn:active { transform: scale(0.94); }
          .muyu-auto-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #FFD700;
            box-shadow: 0 0 5px rgba(255,215,0,0.8);
            flex: 0 0 auto;
          }
          .muyu-auto-btn.active {
            background: linear-gradient(145deg, #B8860B, #D4A84A);
            color: #4A2A0A;
            animation: muyuAutoPulse 1s ease-in-out infinite;
          }
          .muyu-auto-btn.active .muyu-auto-dot {
            background: #4A2A0A;
            box-shadow: 0 0 5px rgba(74,42,10,0.5);
            animation: muyuDotBlink 0.6s ease-in-out infinite;
          }
          @keyframes muyuAutoPulse {
            0%, 100% { box-shadow: 0 0 8px rgba(255, 215, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.3); }
            50%      { box-shadow: 0 0 16px rgba(255, 215, 0, 0.9), inset 0 1px 0 rgba(255,255,255,0.3); }
          }
          @keyframes muyuDotBlink {
            0%, 100% { opacity: 1; }
            50%      { opacity: 0.3; }
          }

          /* 木鱼外层包裹 */
          .muyu-fish-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: filter 0.2s;
          }

          /* 木鱼主体 — 无悬停放大 */
          .muyu-fish {
            width: ${config.size * 2}px;
            height: ${config.size * 1.5}px;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center;
            filter: drop-shadow(0 6px 16px rgba(90, 50, 20, 0.5));
          }
          .muyu-fish.knocking { animation: muyuKnockV3 0.15s ease-out; }

          @keyframes muyuKnockV3 {
            0%   { transform: scale(1) rotate(0deg); }
            15%  { transform: scale(0.92) rotate(-4deg); }
            30%  { transform: scale(1.08) rotate(2deg); }
            50%  { transform: scale(0.96) rotate(-1deg); }
            75%  { transform: scale(1.03) rotate(0.5deg); }
            100% { transform: scale(1) rotate(0deg); }
          }

          .muyu-svg { width: 100%; height: 100%; }

          /* ====== 棒槌样式 ====== */
          .muyu-mallet-wrapper {
            position: absolute;
            top: -12px;
            right: -18px;
            width: 44px;
            height: 70px;
            transform-origin: 18px 58px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.25s ease;
            z-index: 10;
            filter: drop-shadow(2px 4px 6px rgba(60, 30, 10, 0.45));
          }
          .muyu-fish-wrap:hover .muyu-mallet-wrapper { opacity: 1; }
          /* 自动敲击时强制显示棒槌（即使鼠标未悬停） */
          #muyu-container-v3.muyu-auto-on .muyu-mallet-wrapper { opacity: 1; }

          /* 棒槌敲击动画：抬起 → 落下 → 回弹 */
          .muyu-mallet-wrapper.striking { animation: malletStrikeV3 0.18s ease-in-out; }

          @keyframes malletStrikeV3 {
            0%   { transform: rotate(0deg); }
            25%  { transform: rotate(-50deg); }  /* 抬起 */
            55%  { transform: rotate(5deg); }    /* 落下敲击 */
            80%  { transform: rotate(-3deg); }   /* 回弹 */
            100% { transform: rotate(0deg); }
          }

          .muyu-mallet-svg { width: 100%; height: 100%; }

          /* 功德计数面板 */
          .muyu-counter {
            gap: 4px;
          }
          .muyu-counter-number {
            color: #FFD700;
            font-size: 16px;
            text-shadow: 0 0 7px rgba(255, 215, 0, 0.85);
          }

          /* 飘字效果 */
          .muyu-floating-text {
            position: fixed;
            pointer-events: none;
            font-size: 22px;
            font-weight: bold;
            color: #FFD700;
            text-shadow: 0 0 8px rgba(255, 215, 0, 0.95), 0 0 18px rgba(255, 165, 0, 0.65), 0 2px 4px rgba(0,0,0,0.35);
            z-index: 2147483647;
            animation: muyuFloatUpV3 1.3s ease-out forwards;
            will-change: transform, opacity;
          }
          @keyframes muyuFloatUpV3 {
            0%   { opacity: 1; transform: translateY(0) scale(0.5); }
            18%  { opacity: 1; transform: translateY(-24px) scale(1.25); }
            100% { opacity: 0; transform: translateY(-110px) scale(0.75); }
          }

          /* 金色粒子 */
          .muyu-particle {
            position: fixed;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483646;
            will-change: transform, opacity;
          }

          /* 波纹效果 */
          .muyu-ripple {
            position: absolute;
            border-radius: 50%;
            border: 2.5px solid rgba(255, 215, 0, 0.55);
            pointer-events: none;
            animation: muyuRippleV3 0.65s ease-out forwards;
            will-change: transform, opacity;
          }
          @keyframes muyuRippleV3 {
            0%   { width: 30px; height: 30px; opacity: 1; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(0.4); }
            100% { width: ${config.size}px; height: ${config.size}px; opacity: 0; top: 50%; left: 50%; transform: translate(-50%, -50%) scale(1.1); }
          }

          /* 底部提示 */
          .muyu-hint {
            position: absolute;
            bottom: -56px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 11px;
            color: #8B4513;
            white-space: nowrap;
            opacity: 0.6;
            pointer-events: auto;
          }
        `;
        document.head.appendChild(style);
      }

      // ========== 创建 DOM 结构 ==========
      const container = document.createElement('div');
      container.id = 'muyu-container-v3';

      const positions = {
        'bottom-right': { right: '28px', bottom: '28px' },
        'bottom-left':  { left: '28px', bottom: '28px' },
        'top-right':    { right: '28px', top: '28px' },
        'top-left':     { left: '28px', top: '28px' },
      };
      const pos = positions[config.position] || positions['bottom-right'];
      Object.assign(container.style, pos);

      // ====== 新木鱼轮廓SVG（用户指定的路径）+ 保留的高光/纹理/配色 ======
      container.innerHTML = `
        <div class="muyu-topbar">
          <div class="muyu-counter muyu-pill">功德 <span class="muyu-counter-number">0</span></div>
          <div class="muyu-auto-btn muyu-pill" id="muyu-auto-btn"><span class="muyu-auto-dot"></span><span class="muyu-auto-label">自动</span></div>
        </div>
        <div class="muyu-fish-wrap">
          <!-- 棒槌 -->
          <div class="muyu-mallet-wrapper" id="muyu-mallet">
            <svg class="muyu-mallet-svg" viewBox="0 0 44 70" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <!-- 棒槌配色与木鱼一致（加深版暖棕色调） -->
                <linearGradient id="malletHandle" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stop-color="#905028"/>
                  <stop offset="35%" stop-color="#B06838"/>
                  <stop offset="70%" stop-color="#C48250"/>
                  <stop offset="100%" stop-color="#905028"/>
                </linearGradient>
                <linearGradient id="malletHead" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#D4956A"/>
                  <stop offset="50%" stop-color="#B06838"/>
                  <stop offset="100%" stop-color="#905028"/>
                </linearGradient>
                <radialGradient id="malletHeadShine" cx="35%" cy="30%" r="60%">
                  <stop offset="0%" stop-color="rgba(255,220,180,0.6)"/>
                  <stop offset="100%" stop-color="rgba(160,82,45,0)"/>
                </radialGradient>
              </defs>
              <!-- 柄 -->
              <rect x="17" y="26" width="10" height="42" rx="3" fill="url(#malletHandle)"/>
              <line x1="19.5" y1="28" x2="19.5" y2="66" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
              <!-- 槌头 -->
              <ellipse cx="22" cy="14" rx="16" ry="13" fill="url(#malletHead)"/>
              <ellipse cx="22" cy="14" rx="16" ry="13" fill="url(#malletHeadShine)"/>
              <ellipse cx="17" cy="10" rx="5" ry="4" fill="rgba(255,235,200,0.35)"/>
            </svg>
          </div>

          <!-- 木鱼主体 SVG -->
          <div class="muyu-fish" id="muyu-fish">
            <svg class="muyu-svg" viewBox="0 0 1365 1024" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <!-- 木鱼主体渐变填充（深棕色调） -->
                <linearGradient id="fishBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#D4956A"/>
                  <stop offset="30%" stop-color="#C48250"/>
                  <stop offset="65%" stop-color="#B06838"/>
                  <stop offset="100%" stop-color="#905028"/>
                </linearGradient>

                <!-- 高光渐变 -->
                <linearGradient id="fishHighlight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="rgba(255,245,230,0.7)"/>
                  <stop offset="50%" stop-color="rgba(255,225,185,0.3)"/>
                  <stop offset="100%" stop-color="rgba(230,180,130,0)"/>
                </linearGradient>

                <!-- 纹理叠加渐变 -->
                <radialGradient id="fishTexture" cx="45%" cy="40%" r="55%">
                  <stop offset="0%" stop-color="rgba(255,235,200,0.12)"/>
                  <stop offset="40%" stop-color="rgba(200,160,110,0.06)"/>
                  <stop offset="70%" stop-color="rgba(180,140,90,0.08)"/>
                  <stop offset="100%" stop-color="rgba(180,140,90,0.05)"/>
                </radialGradient>

                <!-- 鱼鳞纹理pattern -->
                <pattern id="scalePattern" patternUnits="userSpaceOnUse" width="36" height="32" patternTransform="rotate(15)">
                  <ellipse cx="18" cy="16" rx="14" ry="11" fill="none" stroke="rgba(160,100,50,0.18)" stroke-width="1.2"/>
                  <ellipse cx="18" cy="16" rx="9" ry="7" fill="none" stroke="rgba(180,130,80,0.1)" stroke-width="0.7"/>
                </pattern>

                <!-- 莲花座渐变 -->
                <linearGradient id="lotusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#E6C87A"/>
                  <stop offset="40%" stop-color="#D4A84A"/>
                  <stop offset="100%" stop-color="#B8860B"/>
                </linearGradient>
                <linearGradient id="lotusPetal" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#F0D890"/>
                  <stop offset="100%" stop-color="#C9A030"/>
                </linearGradient>

                <!-- 敲击点发光滤镜 -->
                <filter id="knockGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur"/>
                  <feMerge>
                    <feMergeNode in="blur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              <!-- ========== 莲花座 ========== -->
              <g id="lotus-base">
                <ellipse cx="682" cy="900" rx="140" ry="35" fill="url(#lotusGrad)" opacity="0.7"/>
                <path d="M542 895 Q550 850 600 840 Q650 835 682 845 Q714 835 764 840 Q814 850 822 895 Q780 880 682 880 Q584 880 542 895Z" fill="url(#lotusPetal)" opacity="0.85"/>
                <path d="M572 888 Q580 855 620 848 Q660 843 682 850 Q704 843 744 848 Q784 855 792 888 Q760 878 682 878 Q604 878 572 888Z" fill="url(#lotusPetal)" opacity="0.7"/>
                <path d="M602 882 Q610 858 645 852 Q680 848 682 855 Q684 848 719 852 Q754 858 762 882 Q730 875 682 875 Q634 875 602 882Z" fill="url(#lotusPetal)" opacity="0.9"/>
                <rect x="620" y="890" width="124" ry="12" rx="12" height="22" fill="url(#lotusGrad)" opacity="0.9"/>
              </g>

              <!-- ========== 木鱼主体（新轮廓路径）========== -->
              <g id="fish-body-group">
                <!-- 底层：主轮廓（用户指定的新路径）-->
                <path id="fish-body-outline"
                  d="M91.32030124 733.15227204c-8.38468735 52.94481646 29.68917462 83.35468707 49.13039905 92.583117 19.44122361 9.21085125 52.13622959 0 64.95056241 0 96.02839627 9.21085125 302.20029162 108.12203311 559.15491467 108.12203311 0 0 415.80664866 6.13470849 447.67549072-297.03237149 7.57610047-78.71410574 4.02535327-228.61895032-58.53460748-235.79075858-52.69872491-6.94329456-84.14569528 3.35739002-151.04741227 16.94515403-44.41950549 8.99991541-155.74072715 24.69703381-175.44562097 37.05434005-215.04876499 97.82134853-332.3289158 168.39685849-364.44384859 178.90847892-24.25758508 0-45.29840378-6.06439627-51.16944287-57.6557092 0-21.18144232 80.82346097-71.71807763 115.46962069-79.89182913C652.61972683 463.27784906 746.31025418 448.82876626 757.31405772 448.82876626c15.87289774 0 363.77588618-83.70624655 374.44570805-91.61632863 10.6698219-7.91008208 21.93729401-15.64438486 21.93729483-43.29451649 0-12.65613135-27.86106665-40.92149102-59.58928508-75.3567149-37.63441241-40.83360178-82.35274384-88.24135996-115.85633589-99.52641073C916.5176428 107.39446713 795.51096545 81.13299475 689.79711267 93.06842929 458.38326602 119.18927804 313.98032322 372.4701073 301.41208194 390.04806723c-53.43699875 74.74148684-96.02839627 169.39880255-118.38756198 211.18161401C161.4387846 641.58867777 99.7753 695.8694191 91.32030124 733.15227204z"
                  fill="url(#fishBodyGrad)"
                  stroke="#A06835"
                  stroke-width="3"
                />

                <!-- 纹理层：鱼鳞图案叠加 -->
                <path d="M91.32030124 733.15227204c-8.38468735 52.94481646 29.68917462 83.35468707 49.13039905 92.583117 19.44122361 9.21085125 52.13622959 0 64.95056241 0 96.02839627 9.21085125 302.20029162 108.12203311 559.15491467 108.12203311 0 0 415.80664866 6.13470849 447.67549072-297.03237149 7.57610047-78.71410574 4.02535327-228.61895032-58.53460748-235.79075858-52.69872491-6.94329456-84.14569528 3.35739002-151.04741227 16.94515403-44.41950549 8.99991541-155.74072715 24.69703381-175.44562097 37.05434005-215.04876499 97.82134853-332.3289158 168.39685849-364.44384859 178.90847892-24.25758508 0-45.29840378-6.06439627-51.16944287-57.6557092 0-21.18144232 80.82346097-71.71807763 115.46962069-79.89182913C652.61972683 463.27784906 746.31025418 448.82876626 757.31405772 448.82876626c15.87289774 0 363.77588618-83.70624655 374.44570805-91.61632863 10.6698219-7.91008208 21.93729401-15.64438486 21.93729483-43.29451649 0-12.65613135-27.86106665-40.92149102-59.58928508-75.3567149-37.63441241-40.83360178-82.35274384-88.24135996-115.85633589-99.52641073C916.5176428 107.39446713 795.51096545 81.13299475 689.79711267 93.06842929 458.38326602 119.18927804 313.98032322 372.4701073 301.41208194 390.04806723c-53.43699875 74.74148684-96.02839627 169.39880255-118.38756198 211.18161401C161.4387846 641.58867777 99.7753 695.8694191 91.32030124 733.15227204z"
                  fill="url(#fishTexture)"
                />

                <!-- 高光层：左上角高光 -->
                <path d="M301 390 C340 330 450 150 620 110 C700 90 800 100 880 140 C820 120 720 105 640 125 C500 170 380 310 320 400 Z"
                  fill="url(#fishHighlight)"
                  opacity="0.6"
                />

                <!-- 次级高光：中部弧形反光 -->
                <path d="M370 480 C420 400 520 280 680 220 C750 200 830 210 900 260 C840 230 760 220 690 245 C560 300 440 400 390 490 Z"
                  fill="rgba(255,240,210,0.2)"
                />
              </g>

              <!-- 敲击区域（已移除红色宝珠，保留简洁造型） -->
            </svg>
          </div>
        </div>
        <div class="muyu-hint">轻敲木鱼 · 积攒功德</div>
      `;

      document.body.appendChild(container);

      // ========== 状态变量 ==========
      let merit = 0;
      let isDragging = false;          // 是否真正处于拖拽中
      let pendingDrag = false;         // 已按下、等待判定是否为拖拽
      let dragMoved = false;           // 本次按下是否产生了拖拽位移（用于抑制误触发的点击）
      let dragOffset = { x: 0, y: 0 };
      let startPos = { x: 0, y: 0 };   // 按下时的指针坐标
      let anchored = false;            // 容器是否已切换为 left/top 锚定
      const DRAG_THRESHOLD = 4;        // 位移阈值（px），超过才算拖拽

      const fishEl = container.querySelector('#muyu-fish');
      const counterEl = container.querySelector('.muyu-counter-number');
      const malletEl = container.querySelector('#muyu-mallet');
      const fishWrap = container.querySelector('.muyu-fish-wrap');
      const autoBtn = container.querySelector('#muyu-auto-btn');
      const autoLabel = container.querySelector('.muyu-auto-label');
      let autoTimer = null;            // 自动敲击定时器
      let topbarTimer = null;          // 工具栏淡回计时器
      const TOPBAR_REVEAL_DELAY = 700; // 停手多久后工具栏淡回（ms）
      const AUTO_INTERVAL = 600;       // 自动敲击间隔（ms），可自行调整

      // 将容器从 right/bottom 锚定切换为 left/top 锚定（仅在真正开始拖拽时调用一次）
      function anchorToLeftTop() {
        if (anchored) return;
        const rect = container.getBoundingClientRect();
        container.style.right = 'auto';
        container.style.bottom = 'auto';
        container.style.left = rect.left + 'px';
        container.style.top = rect.top + 'px';
        anchored = true;
      }

      // ========== 音效（更细腻清亮版）==========
      let audioCtx = null;
      function playKnockSound() {
        if (!config.soundEnabled) return;
        try {
          if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const now = audioCtx.currentTime;

          // 主音：中低频清脆木鱼声（正弦波，更细腻）
          const osc1 = audioCtx.createOscillator();
          const gain1 = audioCtx.createGain();
          osc1.type = 'sine';
          osc1.frequency.setValueAtTime(420, now);
          osc1.frequency.exponentialRampToValueAtTime(240, now + 0.05);
          osc1.frequency.exponentialRampToValueAtTime(140, now + 0.18);
          gain1.gain.setValueAtTime(0.5, now);
          gain1.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
          osc1.connect(gain1);

          // 泛音层：三角波增加清亮感
          const osc2 = audioCtx.createOscillator();
          const gain2 = audioCtx.createGain();
          osc2.type = 'triangle';
          osc2.frequency.setValueAtTime(680, now);
          osc2.frequency.exponentialRampToValueAtTime(340, now + 0.04);
          gain2.gain.setValueAtTime(0.12, now);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc2.connect(gain2);

          // 低通滤波器：保留更多中高频细节
          const filter = audioCtx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2800, now);
          filter.frequency.exponentialRampToValueAtTime(900, now + 0.15);
          filter.Q.value = 0.8;

          // 冲击噪声
          const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.04, audioCtx.sampleRate);
          const noiseData = noiseBuf.getChannelData(0);
          for (let i = 0; i < noiseData.length; i++) noiseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (noiseData.length * 0.15));
          const noiseSrc = audioCtx.createBufferSource();
          noiseSrc.buffer = noiseBuf;
          const noiseGain = audioCtx.createGain();
          noiseGain.gain.setValueAtTime(0.35, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
          noiseSrc.connect(noiseGain);

          gain1.connect(filter);
          gain2.connect(filter);
          noiseGain.connect(filter);
          filter.connect(audioCtx.destination);

          osc1.start(now); osc1.stop(now + 0.3);
          osc2.start(now); osc2.stop(now + 0.1);
          noiseSrc.start(now); noiseSrc.stop(now + 0.05);
        } catch(e) { /* silent */ }
      }

      // ========== 功德文案池 ==========
      const meritTexts = [
        '功德 +1', '善缘 +1', '福报 +1', '慈悲 +1',
        '智慧 +1', '吉祥 +1', '如意 +1', '圆满 +1',
        '清净 +1', '禅意 +1', '般若 +1', '喜舍 +1',
      ];

      // ========== 飘字效果 ==========
      function showFloatingText(x, y) {
        const text = document.createElement('div');
        text.className = 'muyu-floating-text';
        text.textContent = meritTexts[Math.floor(Math.random() * meritTexts.length)];
        text.style.left = x + (Math.random() - 0.5) * 40 + 'px';
        text.style.top = y + 'px';
        document.body.appendChild(text);
        setTimeout(() => text.remove(), 1400);
      }

      // ========== 粒子特效 ==========
      function spawnParticles(x, y) {
        const count = config.particleCount;
        for (let i = 0; i < count; i++) {
          const p = document.createElement('div');
          p.className = 'muyu-particle';
          const angle = (Math.PI * 2 * i) / count + Math.random() * 0.8;
          const velocity = 40 + Math.random() * 60;
          const size = 4 + Math.random() * 6;
          const colors = ['#FFD700', '#FFA500', '#FF6347', '#FFEC8B', '#FFE4B5'];
          const color = colors[Math.floor(Math.random() * colors.length)];

          p.style.width = size + 'px';
          p.style.height = size + 'px';
          p.style.backgroundColor = color;
          p.style.boxShadow = `0 0 ${size}px ${color}`;
          p.style.left = x + 'px';
          p.style.top = y + 'px';

          document.body.appendChild(p);

          const startTime = performance.now();
          const duration = 600 + Math.random() * 500;

          function animateParticle(now) {
            const elapsed = now - startTime;
            const progress = elapsed / duration;
            if (progress >= 1) { p.remove(); return; }

            const eased = 1 - Math.pow(1 - progress, 2.5);
            const dx = Math.cos(angle) * velocity * eased;
            const dy = Math.sin(angle) * velocity * eased - progress * progress * 80;

            p.style.transform = `translate(${dx}px, ${dy}px)`;
            p.style.opacity = String(1 - progress);
            requestAnimationFrame(animateParticle);
          }
          requestAnimationFrame(animateParticle);
        }
      }

      // ========== 波纹效果 ==========
      function spawnRipple(targetEl) {
        const ripple = document.createElement('div');
        ripple.className = 'muyu-ripple';
        targetEl.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      }

      // ========== 核心敲击逻辑（Web Animations API — 极速连击无卡顿+位置稳定）==========
      function knock(event) {
        // 拖拽中、或本次按下产生了拖拽位移，则不计为敲击
        if (isDragging || dragMoved) return;

        // 每次点击立即响应
        merit++;
        counterEl.textContent = merit;

        // 敲击时隐藏顶部工具栏，停手后自动淡回
        container.classList.add('muyu-knocking');
        if (topbarTimer) clearTimeout(topbarTimer);
        topbarTimer = setTimeout(() => {
          container.classList.remove('muyu-knocking');
          topbarTimer = null;
        }, TOPBAR_REVEAL_DELAY);

        const rect = fishEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height * 0.45;

        // ====== 关键：先取消旧动画，防止叠加导致位置漂移 ======
        fishEl.getAnimations().forEach(a => a.cancel());
        malletEl.getAnimations().forEach(a => a.cancel());

        // 鱼身敲击压缩回弹 — 动画结束后清除内联样式防止位置漂移
        const fishAnim = fishEl.animate([
          { transform: 'scale(1) rotate(0deg)', offset: 0 },
          { transform: 'scale(0.92) rotate(-4deg)', offset: 0.2 },
          { transform: 'scale(1.08) rotate(2deg)', offset: 0.4 },
          { transform: 'scale(0.96) rotate(-1deg)', offset: 0.65 },
          { transform: 'scale(1.03) rotate(0.5deg)', offset: 0.85 },
          { transform: 'scale(1) rotate(0deg)', offset: 1 },
        ], {
          duration: 150,
          easing: 'ease-out',
          fill: 'forwards',
        });
        fishAnim.onfinish = () => { fishEl.style.transform = ''; };

        // 棒槌抬起→落下→回弹 — 动画结束后清除内联样式
        const malletAnim = malletEl.animate([
          { transform: 'rotate(0deg)', offset: 0 },
          { transform: 'rotate(-50deg)', offset: 0.25 },
          { transform: 'rotate(5deg)', offset: 0.55 },
          { transform: 'rotate(-3deg)', offset: 0.8 },
          { transform: 'rotate(0deg)', offset: 1 },
        ], {
          duration: 180,
          easing: 'ease-in-out',
          fill: 'forwards',
        });
        malletAnim.onfinish = () => { malletEl.style.transform = ''; };

        showFloatingText(centerX, centerY - 20);
        spawnParticles(centerX, centerY);
        spawnRipple(fishWrap);
        playKnockSound();
      }

      // ========== 点击事件 ==========
      fishEl.addEventListener('click', knock);
      fishEl.addEventListener('touchend', (e) => {
        e.preventDefault();
        knock(e);
      });

      // ========== 拖拽功能（带位移阈值，纯点击不再改动容器定位）==========
      // ---- 鼠标 ----
      container.addEventListener('mousedown', (e) => {
        if (e.target.closest('.muyu-counter') || e.target.closest('.muyu-hint') || e.target.closest('.muyu-auto-btn')) return;
        pendingDrag = true;
        dragMoved = false;
        startPos.x = e.clientX;
        startPos.y = e.clientY;
        const rect = container.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        // 注意：此处不修改 left/top，避免被敲击动画 transform 污染包围盒导致漂移
      });

      document.addEventListener('mousemove', (e) => {
        if (!pendingDrag && !isDragging) return;

        if (pendingDrag && !isDragging) {
          // 未超过阈值则视为静止点击，不进入拖拽
          if (Math.abs(e.clientX - startPos.x) < DRAG_THRESHOLD &&
              Math.abs(e.clientY - startPos.y) < DRAG_THRESHOLD) return;
          // 正式进入拖拽
          isDragging = true;
          dragMoved = true;
          container.classList.add('dragging');
          anchorToLeftTop();
        }

        if (isDragging) {
          container.style.left = (e.clientX - dragOffset.x) + 'px';
          container.style.top = (e.clientY - dragOffset.y) + 'px';
        }
      });

      document.addEventListener('mouseup', () => {
        pendingDrag = false;
        if (isDragging) {
          isDragging = false;
          container.classList.remove('dragging');
        }
        // 下一帧再清除 dragMoved，确保紧随其后的 click 能被正确抑制
        setTimeout(() => { dragMoved = false; }, 0);
      });

      // ---- 触摸 ----
      container.addEventListener('touchstart', (e) => {
        if (e.target.closest('.muyu-counter') || e.target.closest('.muyu-hint') || e.target.closest('.muyu-auto-btn')) return;
        const touch = e.touches[0];
        pendingDrag = true;
        dragMoved = false;
        startPos.x = touch.clientX;
        startPos.y = touch.clientY;
        const rect = container.getBoundingClientRect();
        dragOffset.x = touch.clientX - rect.left;
        dragOffset.y = touch.clientY - rect.top;
      }, { passive: true });

      document.addEventListener('touchmove', (e) => {
        if (!pendingDrag && !isDragging) return;
        const touch = e.touches[0];

        if (pendingDrag && !isDragging) {
          if (Math.abs(touch.clientX - startPos.x) < DRAG_THRESHOLD &&
              Math.abs(touch.clientY - startPos.y) < DRAG_THRESHOLD) return;
          isDragging = true;
          dragMoved = true;
          container.classList.add('dragging');
          anchorToLeftTop();
        }

        if (isDragging) {
          container.style.left = (touch.clientX - dragOffset.x) + 'px';
          container.style.top = (touch.clientY - dragOffset.y) + 'px';
        }
      }, { passive: true });

      document.addEventListener('touchend', () => {
        pendingDrag = false;
        if (isDragging) {
          isDragging = false;
          container.classList.remove('dragging');
        }
        setTimeout(() => { dragMoved = false; }, 0);
      });

      // ========== 自动敲击开关 ==========
      function startAuto() {
        if (autoTimer) return;
        autoBtn.classList.add('active');
        container.classList.add('muyu-auto-on');
        autoLabel.textContent = '停止';
        // 立即敲一次，随后按间隔循环
        knock();
        autoTimer = setInterval(() => { knock(); }, AUTO_INTERVAL);
      }
      function stopAuto() {
        if (!autoTimer) return;
        clearInterval(autoTimer);
        autoTimer = null;
        autoBtn.classList.remove('active');
        container.classList.remove('muyu-auto-on');
        autoLabel.textContent = '自动';
      }
      function toggleAuto() {
        if (autoTimer) stopAuto(); else startAuto();
      }
      autoBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleAuto(); });
      autoBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAuto();
      });

      // 说明：已移除原 dblclick 复位逻辑。
      // 原因：敲击木鱼本身就是 click，连敲两下会触发 dblclick，
      // 导致木鱼被强制拉回初始角落（右下角）。
      // 如需复位功能，请改用不与敲击冲突的手势（见下方可选示例）。

      // ====== 可选：右键复位到初始角落（不与敲击冲突）======
      // 如不需要，可整段删除。
      container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        Object.assign(container.style, { left: 'auto', top: 'auto', right: 'auto', bottom: 'auto' });
        Object.assign(container.style, positions[config.position] || positions['bottom-right']);
        anchored = false;
      });

      return {
        ok: true,
        summary: `🪵 木鱼v3 已部署（修复连击漂移 + 自动敲击开关）！点击敲击积攒功德。当前功德: 0`,
        data: { merit, size: config.size, position: config.position },
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();