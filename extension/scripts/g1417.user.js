(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ============ 钓鱼大师 - Fishing Master Enhanced ============
      // Enhanced browser-injectable fishing game with premium visuals,
      // glass-morphism UI, fish AI behaviors, stamina system, combo multiplier,
      // weather effects, and timing-based difficulty mechanics.
    
      const CSS = `
        /* ===== Overlay & Scene ===== */
        .ft-overlay {
          position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
          z-index: 999999;
          font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
          user-select: none; -webkit-user-select: none;
          overflow: hidden;
        }
    
        /* Dynamic sky gradient based on time-of-day feel */
        .ft-sky {
          position: absolute; top: 0; left: 0; width: 100%; height: 42%;
          background: linear-gradient(180deg,
            #1a237e 0%, #4a148c 15%, #880e4f 30%,
            #e65100 50%, #ff6f00 65%, #ffb74d 80%, #ffe0b2 95%);
          transition: background 2s ease;
        }
    
        /* Stars layer */
        .ft-stars {
          position: absolute; top: 0; left: 0; width: 100%; height: 35%;
          pointer-events: none;
        }
        .ft-star {
          position: absolute; background: white; border-radius: 50%;
          animation: ft-twinkle var(--dur) ease-in-out infinite alternate;
        }
        @keyframes ft-twinkle {
          0% { opacity: 0.2; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
    
        /* Sun/Moon */
        .ft-celestial {
          position: absolute; top: 25px; right: 90px;
          width: 80px; height: 80px; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fff9c4 0%, #ffee58 30%, #ff9800 70%, #e65100 100%);
          box-shadow:
            0 0 40px rgba(255,193,7,0.5),
            0 0 80px rgba(255,152,0,0.3),
            0 0 120px rgba(244,67,54,0.15);
          animation: ft-celestialGlow 4s ease-in-out infinite alternate;
        }
        @keyframes ft-celestialGlow {
          0% { box-shadow: 0 0 40px rgba(255,193,7,0.5), 0 0 80px rgba(255,152,0,0.3), 0 0 120px rgba(244,67,54,0.15); }
          100% { box-shadow: 0 0 60px rgba(255,235,59,0.7), 0 0 110px rgba(255,152,0,0.45), 0 0 160px rgba(244,67,54,0.25); }
        }
    
        /* Clouds */
        .ft-cloud {
          position: absolute; background: rgba(255,255,255,0.12);
          border-radius: 50px;
          backdrop-filter: blur(2px);
          filter: blur(1px);
          animation: ft-cloudDrift var(--speed) linear infinite;
        }
        @keyframes ft-cloudDrift {
          from { transform: translateX(-300px); }
          to { transform: translateX(calc(100vw + 300px)); }
        }
    
        /* Water body with depth layers */
        .ft-water {
          position: absolute; top: 42%; left: 0; width: 100%; height: 58%;
          background: linear-gradient(180deg,
            #29b6f6 0%, #039be5 10%, #0277bd 25%,
            #01579b 50%, #002f6c 75%, #001a4d 100%);
          overflow: hidden;
        }
    
        /* Water caustics overlay */
        .ft-caustics {
          position: absolute; top: 0; left: 0; width: 200%; height: 100%;
          background:
            radial-gradient(ellipse 80px 20px at 10% 20%, rgba(255,255,255,0.12) 0%, transparent 70%),
            radial-gradient(ellipse 60px 15px at 30% 40%, rgba(255,255,255,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 100px 25px at 55% 15%, rgba(255,255,255,0.1) 0%, transparent 70%),
            radial-gradient(ellipse 70px 18px at 75% 35%, rgba(255,255,255,0.09) 0%, transparent 70%),
            radial-gradient(ellipse 90px 22px at 90% 25%, rgba(255,255,255,0.11) 0%, transparent 70%);
          animation: ft-causticMove 8s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes ft-causticMove {
          0%, 100% { transform: translateX(0) translateY(0); }
          33% { transform: translateX(-3%) translateY(2px); }
          66% { transform: translateX(2%) translateY(-1px); }
        }
    
        /* Water surface line with shimmer */
        .ft-surface-line {
          position: absolute; top: 0; left: 0; width: 100%; height: 3px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(255,255,255,0.5) 20%, rgba(179,229,252,0.8) 50%,
            rgba(255,255,255,0.5) 80%, transparent 100%);
          box-shadow: 0 0 15px rgba(129,212,250,0.5);
        }
        .ft-surface-shimmer {
          position: absolute; top: 0; left: 0; width: 200%; height: 2px;
          background: linear-gradient(90deg,
            transparent 0%, rgba(255,255,255,0.6) 25%,
            rgba(255,255,255,0.9) 50%, rgba(255,255,255,0.6) 75%, transparent 100%);
          animation: ft-shimmerSlide 3s linear infinite;
        }
        @keyframes ft-shimmerSlide {
          from { transform: translateX(-50%); }
          to { transform: translateX(0%); }
        }
    
        /* Underwater light rays */
        .ft-light-rays {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background:
            linear-gradient(170deg, rgba(255,255,255,0.06) 0%, transparent 30%),
            linear-gradient(175deg, rgba(255,255,255,0.04) 0%, transparent 40%),
            linear-gradient(165deg, rgba(255,255,255,0.05) 0%, transparent 35%);
          pointer-events: none;
          animation: ft-rayShift 6s ease-in-out infinite alternate;
        }
        @keyframes ft-rayShift {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
    
        /* Floating particles in water */
        .ft-particle {
          position: absolute; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,255,255,0.6), rgba(255,255,255,0.1));
          pointer-events: none;
          animation: ft-particleFloat var(--dur) ease-in-out infinite;
        }
        @keyframes ft-particleFloat {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.4; }
          50% { transform: translateY(-20px) translateX(5px); opacity: 0.8; }
        }
    
        /* Seaweed */
        .ft-seaweed {
          position: absolute; bottom: 0; width: 12px;
          background: linear-gradient(to top, #1b5e20, #388e3c, #66bb6a);
          border-radius: 6px 6px 0 0;
          transform-origin: bottom center;
          animation: ft-sway var(--sway) ease-in-out infinite alternate;
          opacity: 0.6;
        }
        @keyframes ft-sway {
          0% { transform: rotate(-8deg) skewX(-2deg); }
          100% { transform: rotate(8deg) skewX(2deg); }
        }
    
        /* Dock / Pier - enhanced */
        .ft-dock {
          position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
          width: 260px; height: 90px;
          background: linear-gradient(180deg, #a1887f 0%, #8d6e63 20%, #6d4c41 60%, #4e342e 100%);
          border-radius: 6px 6px 0 0;
          box-shadow:
            0 -4px 20px rgba(0,0,0,0.4),
            inset 0 2px 0 rgba(255,255,255,0.15);
        }
        .ft-dock::before {
          content: ''; position: absolute; top: -18px; left: -25px; width: 310px; height: 20px;
          background: repeating-linear-gradient(90deg, #bcaaa4 0px, #a1887f 30px, #bcaaa4 30px, #a1887f 60px);
          border-radius: 4px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .ft-dock-plank {
          position: absolute; top: 6px; height: 3px;
          background: rgba(62,39,35,0.3);
          border-radius: 1px;
        }
        .ft-dock-post {
          position: absolute; bottom: 85px; width: 14px; height: 160px;
          background: linear-gradient(90deg, #5d4037, #8d6e63, #6d4c41, #8d6e63, #5d4037);
          border-radius: 4px 4px 0 0;
          box-shadow: 2px 0 8px rgba(0,0,0,0.3);
        }
        .ft-dock-post.left { left: calc(50% - 110px); }
        .ft-dock-post.right { left: calc(50% + 96px); }
    
        /* Fisher person - refined */
        .ft-fisher {
          position: absolute; bottom: 82px; left: calc(50% - 32px);
          width: 64px; height: 100px;
          transition: transform 0.3s ease;
        }
        .ft-fisher-body {
          position: absolute; bottom: 0; width: 40px; height: 60px;
          left: 12px; border-radius: 20px 20px 10px 10px;
          background: linear-gradient(135deg, #ff8a65 0%, #e64a19 50%, #bf360c 100%);
          box-shadow: inset -6px 0 12px rgba(0,0,0,0.15);
        }
        .ft-fisher-head {
          position: absolute; bottom: 56px; left: 17px;
          width: 30px; height: 30px; border-radius: 50%;
          background: linear-gradient(135deg, #ffccbc, #ffab91);
          box-shadow: inset -3px -3px 8px rgba(0,0,0,0.1);
        }
        .ft-fisher-hat {
          position: absolute; bottom: 80px; left: 11px;
          width: 44px; height: 16px; border-radius: 22px 22px 4px 4px;
          background: linear-gradient(135deg, #6d4c41, #3e2723);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .ft-fisher-hat::after {
          content: ''; position: absolute; top: -4px; left: 50%; transform: translateX(-50%);
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #8d6e63, #5d4037);
        }
        .ft-fisher-arm {
          position: absolute; bottom: 40px; width: 30px; height: 11px;
          background: linear-gradient(180deg, #ffccbc, #ffab91);
          border-radius: 6px;
          transform-origin: left center;
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .ft-fisher-arm.right { right: -5px; }
    
        /* Fishing rod - detailed */
        .ft-rod-container {
          position: absolute; bottom: 145px; left: calc(50% + 12px);
          width: 220px; height: 220px; pointer-events: none;
          transform-origin: 0 0;
        }
        .ft-rod {
          position: absolute; bottom: 0; left: 0;
          width: 185px; height: 5px;
          background: linear-gradient(90deg,
            #3e2723 0%, #5d4037 20%, #8d6e63 50%,
            #a1887f 75%, #d7ccc8 90%, #efebe9 100%);
          border-radius: 3px;
          transform-origin: 0 50%;
          transform: rotate(-35deg);
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .ft-rod-handle {
          position: absolute; bottom: -6px; left: -18px;
          width: 22px; height: 16px; border-radius: 4px;
          background: linear-gradient(180deg, #1b5e20, #2e7d32, #43a047);
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .ft-rod-reel {
          position: absolute; bottom: 2px; left: 25px;
          width: 14px; height: 14px; border-radius: 50%;
          background: linear-gradient(135deg, #ffd54f, #ff8f00);
          border: 2px solid #5d4037;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .ft-rod-tip {
          position: absolute; top: -2px; right: 0;
          width: 24px; height: 3px;
          background: linear-gradient(90deg, #bcaaa4, #efebe9, #ffffff);
          border-radius: 2px;
        }
    
        /* Fishing line with glow */
        .ft-line {
          position: absolute; top: 0; left: 0;
          width: 2px; background: linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0.3));
          transform-origin: top center;
          pointer-events: none;
          box-shadow: 0 0 4px rgba(255,255,255,0.3);
        }
        .ft-hook {
          position: absolute; width: 14px; height: 18px;
          border: 2.5px solid #cfd8dc; border-top: none;
          border-radius: 0 0 12px 12px;
          transform-origin: center center;
          box-shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        .ft-bobber {
          position: absolute; width: 16px; height: 26px;
          border-radius: 8px;
          background: linear-gradient(180deg, #ef5350 42%, #ffffff 42%, #ffffff 58%, #212121 58%);
          box-shadow:
            0 3px 6px rgba(0,0,0,0.3),
            0 0 8px rgba(239,83,80,0.3);
          transition: transform 0.12s ease;
        }
    
        /* Fish - highly detailed */
        .ft-fish {
          position: absolute; pointer-events: none;
          transition: transform 0.08s linear;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        .ft-fish-body {
          position: relative; border-radius: 55% 45% 45% 55% / 60% 50% 50% 40%;
          overflow: hidden;
        }
        .ft-fish-body::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 45%;
          background: linear-gradient(180deg, rgba(255,255,255,0.25), transparent);
          border-radius: 55% 45% 0 0;
        }
        .ft-fish-tail {
          position: absolute; right: -10px; top: 50%; transform: translateY(-50%);
          width: 0; height: 0;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          border-left: 16px solid;
          animation: ft-tailWag 0.3s ease-in-out infinite alternate;
        }
        @keyframes ft-tailWag {
          0% { transform: translateY(-50%) rotate(-8deg); }
          100% { transform: translateY(-50%) rotate(8deg); }
        }
        .ft-fish-eye {
          position: absolute; left: 7px; top: 5px;
          width: 6px; height: 6px; border-radius: 50%; background: white;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.2);
        }
        .ft-fish-eye::after {
          content: ''; position: absolute; left: 1.5px; top: 1.5px;
          width: 2.5px; height: 2.5px; border-radius: 50%; background: #1a1a1a;
        }
        .ft-fish-fin-top {
          position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 13px solid;
          opacity: 0.55;
          animation: ft-finWave 0.4s ease-in-out infinite alternate;
        }
        .ft-fish-fin-side {
          position: absolute; left: 35%; top: 55%;
          width: 0; height: 0;
          border-top: 6px solid transparent;
          border-bottom: 6px solid transparent;
          border-right: 10px solid;
          opacity: 0.4;
        }
        @keyframes finWave {
          0% { transform: translateX(-50%) rotate(-5deg); }
          100% { transform: translateX(-50%) rotate(5deg); }
        }
        .ft-fish-scale-pattern {
          position: absolute; top: 8px; left: 12px; right: 12px; bottom: 4px;
          background-image:
            radial-gradient(ellipse 3px 2px at 10% 30%, rgba(0,0,0,0.06) 0%, transparent 100%),
            radial-gradient(ellipse 3px 2px at 25% 50%, rgba(0,0,0,0.06) 0%, transparent 100%),
            radial-gradient(ellipse 3px 2px at 40% 25%, rgba(0,0,0,0.06) 0%, transparent 100%),
            radial-gradient(ellipse 3px 2px at 55% 55%, rgba(0,0,0,0.06) 0%, transparent 100%),
            radial-gradient(ellipse 3px 2px at 70% 35%, rgba(0,0,0,0.06) 0%, transparent 100%);
          border-radius: inherit;
        }
    
        /* Splash effect - upgraded */
        .ft-splash {
          position: absolute; pointer-events: none;
          width: 50px; height: 50px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.8);
          box-shadow: 0 0 15px rgba(129,212,250,0.5), inset 0 0 15px rgba(255,255,255,0.2);
          animation: ft-splashAnim 0.7s ease-out forwards;
        }
        @keyframes ft-splashAnim {
          0% { transform: scale(0.2); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
        .ft-splash-drop {
          position: absolute; width: 5px; height: 8px;
          background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(129,212,250,0.6));
          border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%;
          animation: ft-dropFly 0.6s ease-out forwards;
          pointer-events: none;
        }
        @keyframes ft-dropFly {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-40px) scale(0.3); opacity: 0; }
        }
    
        /* Bubbles - refined */
        .ft-bubble {
          position: absolute; border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9), rgba(129,212,250,0.4));
          border: 1px solid rgba(255,255,255,0.3);
          animation: ft-bubbleRise var(--dur) ease-in forwards;
          pointer-events: none;
          box-shadow: 0 0 6px rgba(255,255,255,0.2);
        }
        @keyframes ft-bubbleRise {
          0% { transform: translateY(0) scale(1); opacity: 0.9; }
          50% { opacity: 0.7; }
          100% { transform: translateY(-100px) scale(0.2); opacity: 0; }
        }
    
        /* Sparkle for catches */
        .ft-sparkle {
          position: absolute; pointer-events: none;
          width: 8px; height: 8px;
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          background: linear-gradient(135deg #fff9c4, #ffee58, #ffca28);
          animation: ft-sparklePop 0.8s ease-out forwards;
        }
        @keyframes ft-sparklePop {
          0% { transform: scale(0) rotate(0deg); opacity: 1; }
          50% { transform: scale(1.5) rotate(180deg); opacity: 1; }
          100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
    
        /* ===== Glass-morphism UI Panels ===== */
        .ft-ui-panel {
          position: absolute;
          background: rgba(15, 20, 35, 0.72);
          backdrop-filter: blur(16px) saturate(1.4);
          -webkit-backdrop-filter: blur(16px) saturate(1.4);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 16px;
          color: #e8eaed;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.08);
          transition: all 0.3s ease;
        }
        .ft-ui-panel:hover {
          border-color: rgba(255,255,255,0.18);
          box-shadow:
            0 8px 36px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.12);
        }
    
        /* Score panel - top left */
        .ft-score-panel {
          top: 16px; left: 16px;
          padding: 14px 22px;
          min-width: 200px;
        }
        .ft-score-label {
          font-size: 11px; text-transform: uppercase;
          letter-spacing: 2px; color: rgba(255,255,255,0.5);
          margin-bottom: 4px;
        }
        .ft-score-value {
          font-size: 32px; font-weight: 700;
          background: linear-gradient(135deg, #fff59d, #ffb300, #ff8f00);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: none;
          line-height: 1;
        }
        .ft-combo-display {
          margin-top: 8px; padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.08);
          font-size: 13px; color: #80cbc4;
          display: flex; align-items: center; gap: 6px;
        }
        .ft-combo-count {
          font-size: 18px; font-weight: 700; color: #69f0ae;
        }
    
        /* Fish info panel - top right */
        .ft-info-panel {
          top: 16px; right: 16px;
          padding: 14px 18px;
          min-width: 180px;
        }
        .ft-info-title {
          font-size: 14px; font-weight: 600; color: #80deea;
          margin-bottom: 8px;
          display: flex; align-items: center; gap: 8px;
        }
        .ft-info-row {
          display: flex; justify-content: space-between;
          font-size: 12px; margin: 4px 0;
          color: rgba(255,255,255,0.65);
        }
        .ft-info-val {
          color: #e8eaed; font-weight: 500;
        }
    
        /* Weather indicator */
        .ft-weather-badge {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 20px;
          font-size: 11px; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.1);
          margin-top: 8px;
        }
    
        /* Tension meter - bottom area */
        .ft-tension-panel {
          bottom: 110px; left: 50%; transform: translateX(-50%);
          padding: 12px 24px; min-width: 320px;
          text-align: center;
          opacity: 0; pointer-events: none;
          transition: opacity 0.4s ease;
        }
        .ft-tension-panel.visible {
          opacity: 1; pointer-events: auto;
        }
        .ft-tension-bar-wrap {
          width: 100%; height: 10px;
          background: rgba(0,0,0,0.4);
          border-radius: 5px;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.4);
        }
        .ft-tension-bar {
          height: 100%; border-radius: 5px;
          background: linear-gradient(90deg, #4caf50, #ffeb3b, #ff5722, #f44336);
          transition: width 0.15s linear;
          box-shadow: 0 0 8px currentColor;
        }
        .ft-tension-label {
          font-size: 11px; letter-spacing: 1px;
          color: rgba(255,255,255,0.5); margin-top: 6px;
          text-transform: uppercase;
        }
    
        /* Stamina bars */
        .ft-stamina-container {
          display: flex; flex-direction: column; gap: 4px;
          margin-top: 6px;
        }
        .ft-stamina-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px;
        }
        .ft-stamina-name { width: 36px; color: rgba(255,255,255,0.5); }
        .ft-stamina-bar-wrap {
          flex: 1; height: 6px; background: rgba(0,0,0,0.35);
          border-radius: 3px; overflow: hidden;
        }
        .ft-stamina-bar {
          height: 100%; border-radius: 3px;
          transition: width 0.2s ease;
        }
        .ft-stamina-bar.player {
          background: linear-gradient(90deg, #42a5f5, #1e88e5);
        }
        .ft-stamina-bar.fish {
          background: linear-gradient(90deg, #ef5350, #e53935);
        }
    
        /* Center message area */
        .ft-message-area {
          position: absolute; top: 38%; left: 50%; transform: translateX(-50%);
          text-align: center; pointer-events: none;
          z-index: 10;
        }
        .ft-message-text {
          font-size: 18px; font-weight: 600;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.6), 0 0 20px rgba(0,0,0,0.3);
          animation: ft-msgPulse 1.5s ease-in-out infinite;
        }
        @keyframes ft-msgPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
    
        /* Action button */
        .ft-action-btn {
          position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
          padding: 14px 40px;
          font-size: 16px; font-weight: 600;
          font-family: inherit;
          color: white;
          background: linear-gradient(135deg, #1e88e5, #1565c0);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 30px;
          cursor: pointer;
          box-shadow:
            0 4px 20px rgba(30,136,229,0.4),
            inset 0 1px 0 rgba(255,255,255,0.15);
          transition: all 0.25s ease;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .ft-action-btn:hover {
          transform: translateX(-50%) translateY(-2px);
          box-shadow: 0 6px 28px rgba(30,136,229,0.55);
          background: linear-gradient(135deg, #2196f3, #1976d2);
        }
        .ft-action-btn:active {
          transform: translateX(-50%) translateY(0);
          box-shadow: 0 2px 12px rgba(30,136,229,0.35);
        }
        .ft-action-btn.reeling {
          background: linear-gradient(135deg, #e53935, #c62828);
          box-shadow: 0 4px 20px rgba(229,57,53,0.4);
          animation: ft-btnPulse 0.8s ease-in-out infinite;
        }
        @keyframes ft-btnPulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(229,57,53,0.4); }
          50% { box-shadow: 0 4px 30px rgba(229,57,53,0.65); }
        }
    
        /* Fish caught showcase — enhanced celebration */
        .ft-caught-showcase {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%) scale(0);
          padding: 36px 52px;
          text-align: center;
          z-index: 20;
          transition: transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
                      box-shadow 0.4s ease;
          min-width: 300px;
          border-radius: 24px;
        }
        .ft-caught-showcase.visible {
          transform: translate(-50%, -50%) scale(1);
          box-shadow:
            0 12px 48px rgba(0,0,0,0.45),
            0 0 80px rgba(255,193,7,0.15),
            inset 0 1px 0 rgba(255,255,255,0.12);
          animation: ft-showcasePulse 2s ease-in-out infinite alternate;
        }
        @keyframes ft-showcasePulse {
          0% { box-shadow: 0 12px 48px rgba(0,0,0,0.45), 0 0 60px rgba(255,193,7,0.12), inset 0 1px 0 rgba(255,255,255,0.12); }
          100% { box-shadow: 0 12px 56px rgba(0,0,0,0.5), 0 0 100px rgba(255,193,7,0.22), inset 0 1px 0 rgba(255,255,255,0.16); }
        }
    
        .ft-caught-label {
          font-size: 13px; text-transform: uppercase;
          letter-spacing: 4px; color: #80deea; margin-bottom: 10px;
          animation: ft-labelGlow 1.8s ease-in-out infinite alternate;
        }
        @keyframes ft-labelGlow {
          0% { opacity: 0.75; text-shadow: none; }
          100% { opacity: 1; text-shadow: 0 0 12px rgba(128,222,234,0.5); }
        }
    
        /* Fish preview inside showcase */
        .ft-caught-fish-preview {
          width: 90px; height: 54px;
          margin: 8px auto 14px;
          position: relative;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.35));
          animation: ft-fishBounce 1.2s ease-in-out infinite;
        }
        @keyframes ft-fishBounce {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-6px) rotate(-3deg); }
          75% { transform: translateY(-3px) rotate(2deg); }
        }
        .ft-caught-fish-preview .ft-fish-body {
          border-radius: 55% 45% 45% 55% / 58% 48% 48% 42%;
          position: relative;
          overflow: hidden;
        }
        .ft-caught-fish-preview .ft-fish-body::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 42%;
          background: linear-gradient(180deg, rgba(255,255,255,0.28), transparent);
          border-radius: inherit;
        }
        .ft-caught-fish-preview .ft-fish-tail {
          position: absolute; right: -11px; top: 50%; transform: translateY(-50%);
          width: 0; height: 0;
          border-top: 11px solid transparent;
          border-bottom: 11px solid transparent;
          border-left: 18px solid;
          animation: ft-tailWag 0.3s ease-in-out infinite alternate;
        }
        @keyframes ft-tailWag {
          0% { transform: translateY(-50%) rotate(-9deg); }
          100% { transform: translateY(-50%) rotate(9deg); }
        }
        .ft-caught-fish-preview .ft-fish-eye {
          position: absolute; left: 8px; top: 6px;
          width: 7px; height: 7px; border-radius: 50%; background: white;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.2);
        }
        .ft-caught-fish-preview .ft-fish-eye::after {
          content: ''; position: absolute; left: 2px; top: 2px;
          width: 3px; height: 3px; border-radius: 50%; background: #1a1a1a;
        }
        .ft-caught-fish-preview .ft-fish-fin-top {
          position: absolute; top: -8px; left: 50%; transform: translateX(-50%);
          width: 0; height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-bottom: 14px solid;
          opacity: 0.5;
        }
        .ft-caught-fish-preview .ft-fish-fin-side {
          position: absolute; left: 38%; top: 56%;
          width: 0; height: 0;
          border-top: 7px solid transparent;
          border-bottom: 7px solid transparent;
          border-right: 11px solid;
          opacity: 0.35;
        }
    
        .ft-caught-name {
          font-size: 30px; font-weight: 800;
          background: linear-gradient(135deg, #fff9c4, #ffb300, #ff8f00, #e65100);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 6px;
          letter-spacing: 1px;
          animation: ft-nameShimmer 2.5s linear infinite;
          background-size: 200% auto;
        }
        @keyframes ft-nameShimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
    
        .ft-caught-points {
          font-size: 22px; color: #69f0ae; font-weight: 700;
          letter-spacing: 0.5px;
          text-shadow: 0 0 10px rgba(105,240,174,0.35);
        }
    
        .ft-caught-combo {
          font-size: 13px; color: #ffd740; font-weight: 600;
          margin-top: 4px;
          animation: ft-comboPop 0.6s ease-out both;
        }
        @keyframes ft-comboPop {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }
    
        .ft-caught-rarity {
          display: inline-block; margin-top: 10px; padding: 5px 18px;
          border-radius: 20px; font-size: 12px; font-weight: 700;
          letter-spacing: 2px; text-transform: uppercase;
          transition: all 0.3s ease;
        }
    
        /* Showcase decorative elements */
        .ft-showcase-glow-ring {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 320px; height: 320px;
          border-radius: 50%;
          border: 2px solid rgba(255,215,0,0.2);
          pointer-events: none;
          animation: ft-ringExpand 2s ease-out infinite;
        }
        .ft-showcase-glow-ring:nth-child(2) {
          animation-delay: 0.7s;
          width: 380px; height: 380px;
        }
        @keyframes ft-ringExpand {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(1.3); opacity: 0; }
        }
    
        .ft-showcase-stars {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none; overflow: hidden; border-radius: 24px;
        }
        .ft-showcase-star-particle {
          position: absolute;
          clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);
          animation: ft-starFloat var(--dur) ease-in-out infinite;
        }
        @keyframes ft-starFloat {
          0%, 100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 0.9; }
          50% { transform: translateY(-15px) rotate(180deg) scale(1.3); opacity: 1; }
        }
    
        /* Fish detail info row (weight / length) */
        .ft-caught-details {
          display: flex; justify-content: center; gap: 20px;
          margin-top: 10px;
        }
        .ft-caught-detail-item {
          display: flex; align-items: baseline; gap: 5px;
          font-size: 13px;
        }
        .ft-caught-detail-icon {
          font-size: 14px;
        }
        .ft-caught-detail-val {
          font-weight: 700; color: #e8eaed;
          font-size: 15px;
        }
        .ft-caught-detail-unit {
          color: rgba(255,255,255,0.45);
          font-size: 11px;
        }
    
        /* Stats summary row in showcase */
        .ft-caught-stats {
          display: flex; justify-content: center; gap: 16px;
          margin-top: 12px; padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }
        .ft-caught-stat {
          text-align: center;
        }
        .ft-caught-stat-val {
          font-size: 16px; font-weight: 700; color: #e8eaed;
        }
        .ft-caught-stat-lbl {
          font-size: 10px; color: rgba(255,255,255,0.4);
          text-transform: uppercase; letter-spacing: 1px;
        }
    
        /* Collection / Log panel */
        .ft-collection-panel {
          top: 16px; left: 50%; transform: translateX(-50%);
          padding: 10px 20px;
          display: flex; gap: 12px;
          align-items: center;
        }
        .ft-collection-item {
          display: flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 12px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          font-size: 11px; color: rgba(255,255,255,0.6);
        }
        .ft-collection-item.caught {
          background: rgba(102,187,106,0.12);
          border-color: rgba(102,187,106,0.25);
          color: #a5d6a7;
        }
        .ft-collection-icon {
          width: 18px; height: 14px; border-radius: 40% 50% 50% 40% / 50% 45% 55% 50%;
        }
    
        /* Perfect catch indicator */
        .ft-perfect-indicator {
          position: absolute; top: 35%; left: 50%; transform: translateX(-50%);
          font-size: 22px; font-weight: 800;
          color: #ffd700;
          text-shadow: 0 0 20px rgba(255,215,0,0.8), 0 2px 8px rgba(0,0,0,0.5);
          opacity: 0;
          pointer-events: none;
          animation: none;
        }
        .ft-perfect-indicator.show {
          animation: ft-perfectShow 1.2s ease-out forwards;
        }
        @keyframes ft-perfectShow {
          0% { opacity: 0; transform: translateX(-50%) scale(0.3); }
          30% { opacity: 1; transform: translateX(-50%) scale(1.2); }
          100% { opacity: 0; transform: translateX(-50%) scale(1) translateY(-20px); }
        }
    
        /* Difficulty star rating for fish */
        .ft-difficulty-stars {
          display: inline-flex; gap: 2px; margin-left: 6px;
        }
        .ft-star-icon {
          font-size: 10px; color: #546e7a;
        }
        .ft-star-icon.filled { color: #ffc107; }
    
        /* Instructions tooltip */
        .ft-instructions {
          position: absolute; bottom: 105px; left: 50%;
          transform: translateX(-50%);
          font-size: 12px; color: rgba(255,255,255,0.45);
          text-align: center; pointer-events: none;
          transition: opacity 0.4s ease;
        }
      `;
    
      // ========== FISH DATA (Enhanced with AI behavior profiles) ==========
      const FISH_TYPES = [
        {
          id: 'crucian',
          name: '小鲫鱼',
          rarity: 'common',
          rarityLabel: '普通',
          rarityColor: '#b0bec5',
          points: 10,
          size: { w: 36, h: 20 },
          weightRange: [0.15, 0.45],       // kg
          lengthRange: [10, 22],           // cm
          colors: { body: '#cfd8dc', tail: '#cfd8dc', fin: '#90a4ae' },
          speed: 1.2,
          strength: 1,
          stamina: 60,
          pattern: 'calm',       // AI behavior pattern
          escapeChance: 0.08,
          stars: 1,
        },
        {
          id: 'carp',
          name: '鲤鱼',
          rarity: 'common',
          rarityLabel: '普通',
          rarityColor: '#b0bec5',
          points: 20,
          size: { w: 48, h: 26 },
          weightRange: [0.8, 3.5],
          lengthRange: [25, 50],
          colors: { body: '#ff7043', tail: '#ff7043', fin: '#bf360c' },
          speed: 1.5,
          strength: 2,
          stamina: 80,
          pattern: 'moderate',
          escapeChance: 0.12,
          stars: 2,
        },
        {
          id: 'bass',
          name: '鲈鱼',
          rarity: 'uncommon',
          rarityLabel: '稀有',
          rarityColor: '#80deea',
          points: 40,
          size: { w: 54, h: 30 },
          weightRange: [1.5, 6.0],
          lengthRange: [30, 55],
          colors: { body: '#5c6bc0', tail: '#5c6bc0', fin: '#283593' },
          speed: 1.8,
          strength: 3,
          stamina: 100,
          pattern: 'fighter',
          escapeChance: 0.18,
          stars: 2,
        },
        {
          id: 'tuna',
          name: '金枪鱼',
          rarity: 'rare',
          rarityLabel: '珍稀',
          rarityColor: '#ce93d8',
          points: 80,
          size: { w: 68, h: 36 },
          weightRange: [15, 65],
          lengthRange: [80, 160],
          colors: { body: '#546e7a', tail: '#37474f', fin: '#263238' },
          speed: 2.2,
          strength: 4,
          stamina: 130,
          pattern: 'strong',
          escapeChance: 0.25,
          stars: 3,
        },
        {
          id: 'arowana',
          name: '金龙鱼',
          rarity: 'epic',
          rarityLabel: '史诗',
          rarityColor: '#ffd54f',
          points: 150,
          size: { w: 64, h: 34 },
          weightRange: [3, 12],
          lengthRange: [40, 75],
          colors: { body: '#ffca28', tail: '#ff8f00', fin: '#ff6f00' },
          speed: 2.0,
          strength: 5,
          stamina: 160,
          pattern: 'elusive',
          escapeChance: 0.32,
          stars: 4,
        },
        {
          id: 'mystery',
          name: '神秘大鱼',
          rarity: 'legendary',
          rarityLabel: '传说',
          rarityColor: '#ab47bc',
          points: 280,
          size: { w: 78, h: 42 },
          weightRange: [50, 180],
          lengthRange: [120, 220],
          colors: { body: '#7e57c2', tail: '#512da8', fin: '#311b92' },
          speed: 2.5,
          strength: 6,
          stamina: 200,
          pattern: 'mystery',
          escapeChance: 0.40,
          stars: 5,
        },
        {
          id: 'koi',
          name: '传说锦鲤',
          rarity: 'mythic',
          rarityLabel: '神话',
          rarityColor: '#ff1744',
          points: 500,
          size: { w: 72, h: 38 },
          weightRange: [8, 35],
          lengthRange: [55, 105],
          colors: { body: '#ff5252', tail: '#d50000', fin: '#ffeb3b' },
          speed: 2.8,
          strength: 7,
          stamina: 250,
          pattern: 'mythic',
          escapeChance: 0.50,
          stars: 5,
        },
      ];
    
      // Weighted spawn rates (rarity-based)
      const SPAWN_WEIGHTS = [30, 25, 20, 12, 7, 4, 2];
    
      // Weather types affecting gameplay
      const WEATHER_TYPES = [
        { id: 'clear', label: '☀️ 晴朗', castMod: 1.0, biteSpeed: 1.0, fishMod: 1.0 },
        { id: 'cloudy', label: '⛅ 多云', castMod: 1.0, biteSpeed: 1.2, fishMod: 1.1 },
        { id: 'rainy', label: '🌧️ 小雨', castMod: 0.9, biteSpeed: 1.4, fishMod: 1.3 },
        { id: 'stormy', label: '⛈️ 暴风雨', castMod: 0.7, biteSpeed: 1.8, fishMod: 1.5 },
      ];
    
      // ========== GAME STATE ==========
      let state = {
        phase: 'idle',         // idle, casting, waiting, bitten, reeling, caught, escaped, showcase
        score: 0,
        combo: 0,
        maxCombo: 0,
        totalCasts: 0,
        totalBites: 0,
        totalCaught: 0,
        totalEscaped: 0,
        collection: {},        // fishId -> count
        currentFish: null,
        playerStamina: 100,
        fishStamina: 0,
        tension: 0,            // 0-100, affects escape chance
        rodAngle: -35,
        hookX: 0,
        hookY: 0,
        lineLength: 150,
        bobberDx: 0,
        bobberDy: 0,
        weather: WEATHER_TYPES[0],
        perfectWindowActive: false,
        perfectTimerStart: 0,
        reelDistance: 0,
        lastCatchTime: 0,
        fishPosX: 0,
        fishPosY: 0,
        fishVelX: 0,
        fishVelY: 0,
        fishDirection: 1,
        aiState: 'approach',   // approach, struggle, dash, rest, circle
        aiTimer: 0,

        baitsLeft: 20,      // 饵料剩余数量

        maxBaits: 20,       // 饵料最大数量

      };
    
      // DOM refs
      let overlay, container, rodEl, rodContainer, armRight;
      let lineEl, hookEl, bobberEl, fishEl, messageEl, msgText;
      let scoreValEl, comboCountEl, tensionPanel, tensionBar, tensionLabel;
      let playerStamBar, fishStamBar, actionBtn, instructionsEl;
      let infoPanel, infoName, infoRarity, infoPoints, infoStars;
      let showcaseEl, caughtName, caughtPoints, caughtRarity, caughtLabel, caughtCombo;
      let collectionPanel, perfectIndicator;
    
      // Animation frame ID
      let rafId = null;
    
      // ========== UTILITIES ==========
      function rand(min, max) { return Math.random() * (max - min) + min; }
      function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
      function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
      function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
      function weightedPick(items, weights) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < items.length; i++) {
          r -= weights[i];
          if (r <= 0) return items[i];
        }
        return items[items.length - 1];
      }
    
      function createEl(tag, cls, parent) {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (parent) parent.appendChild(el);
        return el;
      }
    
      // ========== SCENE BUILDING ==========
      function buildScene() {
        overlay = createEl('div', 'ft-overlay', document.body);
    
        // Sky
        const sky = createEl('div', 'ft-sky', overlay);

        // 饵料提示UI（参考图样式：黑色背景+白色文字+黄色圆形图标）
        const baitHint = document.createElement('div');
        baitHint.id = 'ftBaitHint';
        baitHint.style.cssText = `
          position: absolute;
          top: 800px;
          left: 20px;
          background: rgba(0, 0, 0, 0.75);
          color: #ffffff;
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          z-index: 150;
          display: flex;
          align-items: center;
          gap: 8px;
          pointer-events: none;
          user-select: none;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255, 215, 0, 0.3);
        `;
        baitHint.innerHTML = `<span style=\"display:inline-block;width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,#FFD700,#FFA500);border:2px solid #fff;flex-shrink:0;\"></span><span>空格：抛饵 (<span class=\"ft-bait-count\">${state.baitsLeft}/${state.maxBaits}</span>)</span>`;
        overlay.appendChild(baitHint);
    
        // Stars
        const starsWrap = createEl('div', 'ft-stars', overlay);
        for (let i = 0; i < 60; i++) {
          const star = createEl('div', 'ft-star', starsWrap);
          const sz = rand(1, 3);
          star.style.cssText = `left:${rand(0,100)}%;top:${rand(0,80)}%;width:${sz}px;height:${sz}px;--dur:${rand(2,5)}s;animation-delay:${rand(0,3)}s`;
        }
    
        // Celestial body
        createEl('div', 'ft-celestial', overlay);
    
        // Clouds
        for (let i = 0; i < 5; i++) {
          const cloud = createEl('div', 'ft-cloud', overlay);
          const w = rand(100, 220);
          const h = rand(30, 60);
          cloud.style.cssText = `top:${rand(3,18)}%;width:${w}px;height:${h}px;left:-300px;--speed:${rand(25,55)}s;animation-delay:${rand(0,-20)}s`;
        }
    
        // Water
        const water = createEl('div', 'ft-water', overlay);
        createEl('div', 'ft-caustics', water);
        createEl('div', 'ft-surface-line', water);
        createEl('div', 'ft-surface-shimmer', water);
        createEl('div', 'ft-light-rays', water);
    
        // Water particles
        for (let i = 0; i < 20; i++) {
          const p = createEl('div', 'ft-particle', water);
          const sz = rand(2, 5);
          p.style.cssText = `left:${rand(0,100)}%;top:${rand(10,90)}%;width:${sz}px;height:${sz}px;--dur:${rand(3,7)}s;animation-delay:${rand(0,4)}s`;
        }
    
        // Seaweed
        for (let i = 0; i < 8; i++) {
          const sw = createEl('div', 'ft-seaweed', overlay);
          const h = rand(40, 90);
          sw.style.cssText = `left:${rand(5,95)}%;height:${h}px;--sway:${rand(2,4)}s;animation-delay:${rand(0,2)}s`;
        }
    
        // Dock
        const dock = createEl('div', 'ft-dock', overlay);
        for (let i = 0; i < 5; i++) {
          const plank = createEl('div', 'ft-dock-plank', dock);
          plank.style.cssText = `left:10px;right:10px;top:${18 + i * 16}px`;
        }
        createEl('div', 'ft-dock-post left', overlay);
        createEl('div', 'ft-dock-post right', overlay);
    
        // Fisher
        const fisher = createEl('div', 'ft-fisher', overlay);
        createEl('div', 'ft-fisher-hat', fisher);
        createEl('div', 'ft-fisher-head', fisher);
        createEl('div', 'ft-fisher-body', fisher);
        const armLeft = createEl('div', 'ft-fisher-arm', fisher);
        armLeft.style.cssText = 'left:0';
        armRight = createEl('div', 'ft-fisher-arm right', fisher);
    
        // Rod
        rodContainer = createEl('div', 'ft-rod-container', overlay);
        rodEl = createEl('div', 'ft-rod', rodContainer);
        createEl('div', 'ft-rod-handle', rodContainer);
        createEl('div', 'ft-rod-reel', rodContainer);
        createEl('div', 'ft-rod-tip', rodContainer);
    
        // Line
        lineEl = createEl('div', 'ft-line', rodContainer);
        hookEl = createEl('div', 'ft-hook', rodContainer);
        bobberEl = createEl('div', 'ft-bobber', rodContainer);
    
        // Fish element
        fishEl = createEl('div', 'ft-fish', overlay);
        fishEl.innerHTML = '<div class="ft-fish-body"><div class="ft-fish-scale-pattern"></div><div class="ft-fish-fin-top"></div><div class="ft-fish-fin-side"></div><div class="ft-fish-eye"></div></div><div class="ft-fish-tail"></div>';
        fishEl.style.display = 'none';
    
        // Message area
        messageEl = createEl('div', 'ft-message-area', overlay);
        msgText = createEl('div', 'ft-message-text', messageEl);
        msgText.textContent = '🎣 点击下方按钮甩杆';
    
        // Score Panel
        const scorePanel = createEl('div', 'ft-ui-panel ft-score-panel', overlay);
        createEl('div', 'ft-score-label', scorePanel).textContent = '总分';
        scoreValEl = createEl('div', 'ft-score-value', scorePanel);
        scoreValEl.textContent = '0';
        const comboDisp = createEl('div', 'ft-combo-display', scorePanel);
        comboDisp.innerHTML = '<span>🔥 连击</span>';
        comboCountEl = createEl('span', 'ft-combo-count', comboDisp);
        comboCountEl.textContent = '×0';
    
        // Info Panel
        infoPanel = createEl('div', 'ft-ui-panel ft-info-panel', overlay);
        createEl('div', 'ft-info-title', infoPanel).innerHTML = '🐟 鱼类信息';
        infoName = createEl('div', 'ft-info-row', infoPanel);
        infoName.innerHTML = '<span>名称</span><span class="ft-info-val" id="ftInfoNameVal">--</span>';
        infoRarity = createEl('div', 'ft-info-row', infoPanel);
        infoRarity.innerHTML = '<span>稀有度</span><span class="ft-info-val" id="ftInfoRarityVal">--</span>';
        infoPoints = createEl('div', 'ft-info-row', infoPanel);
        infoPoints.innerHTML = '<span>分值</span><span class="ft-info-val" id="ftInfoPtsVal">--</span>';
    
        // Weather badge
        const weatherBadge = createEl('div', 'ft-weather-badge', infoPanel);
        weatherBadge.id = 'ftWeatherBadge';
        weatherBadge.textContent = WEATHER_TYPES[0].label;
    
        // Collection panel
        collectionPanel = createEl('div', 'ft-ui-panel ft-collection-panel', overlay);
        buildCollectionUI();
    
        // Tension panel
        tensionPanel = createEl('div', 'ft-ui-panel ft-tension-panel', overlay);
        tensionLabel = createEl('div', 'ft-tension-label', tensionPanel);
        tensionLabel.textContent = '⚡ 拉力强度';
        const tbarWrap = createEl('div', 'ft-tension-bar-wrap', tensionPanel);
        tensionBar = createEl('div', 'ft-tension-bar', tbarWrap);
        tensionBar.style.width = '0%';
    
        // Stamina container inside tension panel
        const stamCont = createEl('div', 'ft-stamina-container', tensionPanel);
        const psRow = createEl('div', 'ft-stamina-row', stamCont);
        createEl('span', 'ft-stamina-name', psRow).textContent = '钓手';
        const psWrap = createEl('div', 'ft-stamina-bar-wrap', psRow);
        playerStamBar = createEl('div', 'ft-stamina-bar player', psWrap);
        playerStamBar.style.width = '100%';
        const fsRow = createEl('div', 'ft-stamina-row', stamCont);
        createEl('span', 'ft-stamina-name', fsRow).textContent = '鱼';
        const fsWrap = createEl('div', 'ft-stamina-bar-wrap', fsRow);
        fishStamBar = createEl('div', 'ft-stamina-bar fish', fsWrap);
        fishStamBar.style.width = '100%';
    
        // Showcase — enhanced celebration panel
        showcaseEl = createEl('div', 'ft-ui-panel ft-caught-showcase', overlay);
    
        // Glow rings (decorative)
        createEl('div', 'ft-showcase-glow-ring', showcaseEl);
        createEl('div', 'ft-showcase-glow-ring', showcaseEl);
    
        // Star particles container
        const starsContainer = createEl('div', 'ft-showcase-stars', showcaseEl);
        for (let si = 0; si < 12; si++) {
          const sp = createEl('div', 'ft-showcase-star-particle', starsContainer);
          const spSz = rand(6, 12);
          const colors = ['#fff9c4', '#ffee58', '#ffca28', '#ffd54f', '#ffffff'];
          sp.style.cssText = `
            left:${rand(5,95)}%;top:${rand(5,90)}%;
            width:${spSz}px;height:${spSz}px;
            background:${pick(colors)};
            --dur:${rand(1.5,3)}s;
            animation-delay:${rand(0,1.5)}s;
          `;
        }
    
        caughtLabel = createEl('div', 'ft-caught-label', showcaseEl);
        caughtLabel.textContent = '🎉 钓到了！';
    
        // Fish preview element inside showcase
        const fishPreview = createEl('div', 'ft-caught-fish-preview', showcaseEl);
        fishPreview.innerHTML = '<div class="ft-fish-body"><div class="ft-fish-fin-top"></div><div class="ft-fish-fin-side"></div><div class="ft-fish-eye"></div></div><div class="ft-fish-tail"></div>';
    
        caughtName = createEl('div', 'ft-caught-name', showcaseEl);
        caughtPoints = createEl('div', 'ft-caught-points', showcaseEl);
        caughtCombo = createEl('div', 'ft-caught-combo', showcaseEl);
        caughtRarity = createEl('div', 'ft-caught-rarity', showcaseEl);
    
        // Stats summary row
        const statsRow = createEl('div', 'ft-caught-stats', showcaseEl);

        // 关闭按钮（展示面板仅能通过此按钮关闭）
        const closeBtn = document.createElement('button');
        closeBtn.id = 'ftShowcaseCloseBtn';
        closeBtn.style.cssText = `
          position: absolute;
          top: 12px;
          right: 12px;
          width: 32px;
          height: 32px;
          border: none;
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          font-size: 20px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          z-index: 100;
        `;
        closeBtn.innerHTML = '×';
        closeBtn.title = '关闭';
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.background = 'rgba(255,80,80,0.7)'; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.background = 'rgba(255,255,255,0.15)'; });
        closeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          hideShowcase();
          goIdle();
        });
        showcaseEl.appendChild(closeBtn);
        const statTotal = createEl('div', 'ft-caught-stat', statsRow);
        statTotal.innerHTML = '<div class="ft-caught-stat-val" id="ftStatTotal">0</div><div class="ft-caught-stat-lbl">总捕获</div>';
        const statComboBest = createEl('div', 'ft-caught-stat', statsRow);
        statComboBest.innerHTML = '<div class="ft-caught-stat-val" id="ftStatCombo">×0</div><div class="ft-caught-stat-lbl">最高连击</div>';
        const statScore = createEl('div', 'ft-caught-stat', statsRow);
        statScore.innerHTML = '<div class="ft-caught-stat-val" id="ftStatScore">0</div><div class="ft-caught-stat-lbl">总分</div>';
    
        // Perfect indicator
        perfectIndicator = createEl('div', 'ft-perfect-indicator', overlay);
        perfectIndicator.textContent = '✨ 完美时机！✨';
    
        // Action button
        actionBtn = createEl('button', 'ft-action-btn', overlay);
        actionBtn.textContent = '🎣 甩杆';
        actionBtn.addEventListener('click', onActionClick);
    
        // Instructions
        instructionsEl = createEl('div', 'ft-instructions', overlay);
        instructionsEl.textContent = '提示：上钩后快速点击按钮收杆，拉拽控制力度';
    
        // Inject CSS
        const styleEl = document.createElement('style');
        styleEl.textContent = CSS;
        document.head.appendChild(styleEl);
      }
    
      function buildCollectionUI() {
        collectionPanel.innerHTML = '';
        FISH_TYPES.forEach(ft => {
          const item = createEl('div', 'ft-collection-item', collectionPanel);
          const icon = createEl('div', 'ft-collection-icon', item);
          icon.style.background = ft.colors.body;
          item.innerHTML = '';
          item.appendChild(icon);
          item.appendChild(document.createTextNode(ft.name));
          item.dataset.fishId = ft.id;
        });
      }
    
      function updateCollectionUI() {
        const items = collectionPanel.querySelectorAll('.ft-collection-item');
        items.forEach(item => {
          const fid = item.dataset.fishId;
          if (state.collection[fid]) {
            item.classList.add('caught');
            item.childNodes[item.childNodes.length - 1].nodeValue = `${item.childNodes[item.childNodes.length - 1].nodeValue.split(' ')[0]} ×${state.collection[fid]}`;
          }
        });
      }
    
      // ========== FISH AI BEHAVIOR ==========
      function updateFishAI(dt) {
        if (!state.currentFish || state.phase !== 'reeling') return;
    
        const fish = state.currentFish;
        state.aiTimer -= dt;
    
        // State machine for fish AI
        if (state.aiTimer <= 0) {
          const pat = fish.pattern;
          switch (pat) {
            case 'calm':
              state.aiState = pick(['approach', 'rest']);
              break;
            case 'moderate':
              state.aiState = pick(['approach', 'struggle', 'rest']);
              break;
            case 'fighter':
              state.aiState = pick(['struggle', 'dash', 'circle']);
              break;
            case 'strong':
              state.aiState = pick(['dash', 'struggle', 'circle', 'rest']);
              break;
            case 'elusive':
            case 'mystery':
            case 'mythic':
              state.aiState = pick(['dash', 'circle', 'dash', 'struggle']);
              break;
            default:
              state.aiState = 'struggle';
          }
          state.aiTimer = rand(0.5, 2.0);
        }
    
        // Apply AI state behavior
        const baseSpeed = fish.speed * 15;
        let ax = 0, ay = 0;
    
        switch (state.aiState) {
          case 'approach':   // Move toward hook slowly
            ax = (state.hookX - state.fishPosX) * 0.02;
            ay = (state.hookY - state.fishPosY) * 0.02;
            break;
          case 'struggle':   // Random jitter + away from pull direction
            ax = rand(-1, 1) * baseSpeed * 0.5;
            ay = rand(-1, 1) * baseSpeed * 0.3;
            if (state.tension > 50) {
              ax += (state.fishPosX > window.innerWidth / 2 ? 1 : -1) * baseSpeed * 0.3;
            }
            break;
          case 'dash':       // Quick burst in random direction
            ax = state.fishDirection * baseSpeed * 1.5;
            ay = rand(-0.5, 0.5) * baseSpeed * 0.5;
            break;
          case 'circle':     // Circle around hook
            const angle = Date.now() * 0.003;
            const targetX = state.hookX + Math.cos(angle) * 60;
            const targetY = state.hookY + Math.sin(angle) * 30;
            ax = (targetX - state.fishPosX) * 0.04;
            ay = (targetY - state.fishPosY) * 0.04;
            break;
          case 'rest':       // Slow down briefly
            ax = -state.fishVelX * 0.1;
            ay = -state.fishVelY * 0.1;
            break;
        }
    
        // Apply physics
        state.fishVelX += ax * dt;
        state.fishVelY += ay * dt;
        state.fishVelX *= 0.92; // drag
        state.fishVelY *= 0.92;
    
        state.fishPosX += state.fishVelX * dt;
        state.fishPosY += state.fishVelY * dt;
    
        // Bounds (water area)
        const waterTop = window.innerHeight * 0.45;
        const waterBottom = window.innerHeight - 20;
        state.fishPosX = clamp(state.fishPosX, 30, window.innerWidth - 30);
        state.fishPosY = clamp(state.fishPosY, waterTop, waterBottom);
    
        // Update direction
        if (Math.abs(state.fishVelX) > 1) {
          state.fishDirection = state.fishVelX > 0 ? 1 : -1;
        }
      }
    
      // ========== VISUAL UPDATES ==========
      function updateRodAndLine() {
        const cx = window.innerWidth / 2;
        const rodBaseX = cx + 12;
        const rodBaseY = window.innerHeight - 145;
    
        // Rod angle from state
        rodEl.style.transform = `rotate(${state.rodAngle}deg)`;
    
        // Calculate tip position
        const tipAngle = (state.rodAngle - 90) * Math.PI / 180;
        const rodLen = 185;
        const tipX = Math.cos(tipAngle) * rodLen;
        const tipY = Math.sin(tipAngle) * rodLen;
    
        // Hook position
        state.hookX = rodBaseX + tipX + Math.cos(tipAngle) * state.lineLength;
        state.hookY = rodBaseY + tipY + Math.sin(tipAngle) * state.lineLength;
    
        // Line
        const ldX = tipX;
        const ldY = tipY;
        const lAngle = Math.atan2(state.lineLength * Math.sin(tipAngle), state.lineLength * Math.cos(tipAngle)) * 180 / Math.PI;
        const lineLen = Math.sqrt(ldX * ldX + ldY * ldY) + state.lineLength;
        lineEl.style.height = `${Math.max(0, lineLen)}px`;
        lineEl.style.transform = `rotate(${lAngle}deg)`;
    
        // Hook
        hookEl.style.left = `${tipX + Math.cos(tipAngle) * state.lineLength - 7}px`;
        hookEl.style.top = `${tipY + Math.sin(tipAngle) * state.lineLength}px`;
    
        // Bobber at water surface
        const surfaceY = window.innerHeight * 0.42;
        bobberEl.style.left = `${state.hookX - 8 + state.bobberDx}px`;
        bobberEl.style.top = `${surfaceY - 12 + state.bobberDy}px`;
    
        // Arm follows rod angle slightly
        if (armRight) {
          const armRot = clamp(state.rodAngle + 50, -20, 70);
          armRight.style.transform = `rotate(${armRot}deg)`;
        }
      }
    
      function updateFishVisual() {
        if (!state.currentFish || !fishEl) return;
    
        fishEl.style.display = 'block';
        fishEl.style.left = `${state.fishPosX - state.currentFish.size.w / 2}px`;
        fishEl.style.top = `${state.fishPosY - state.currentFish.size.h / 2}px`;
    
        // Flip based on direction
        const scaleX = state.fishDirection < 0 ? -1 : 1;
        fishEl.style.transform = `scaleX(${scaleX})`;
    
        // Apply fish colors
        const body = fishEl.querySelector('.ft-fish-body');
        const tail = fishEl.querySelector('.ft-fish-tail');
        const finTop = fishEl.querySelector('.ft-fish-fin-top');
        const finSide = fishEl.querySelector('.ft-fish-fin-side');
    
        if (body) {
          body.style.background = `linear-gradient(135deg, ${state.currentFish.colors.body}, ${adjustColor(state.currentFish.colors.body, -30)})`;
        }
        if (tail) {
          tail.style.borderLeftColor = state.currentFish.colors.tail;
        }
        if (finTop) {
          finTop.style.borderBottomColor = state.currentFish.colors.fin;
        }
        if (finSide) {
          finTop.style.borderRightColor = state.currentFish.colors.fin;
        }
      }
    
      function adjustColor(hex, amount) {
        const num = parseInt(hex.slice(1), 16);
        const r = clamp((num >> 16) + amount, 0, 255);
        const g = clamp(((num >> 8) & 0xff) + amount, 0, 255);
        const b = clamp((num & 0xff) + amount, 0, 255);
        return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
      }
    
      function updateUI() {
        // Score
        if (scoreValEl) scoreValEl.textContent = String(state.score);
        if (comboCountEl) comboCountEl.textContent = `×${state.combo}`;
    
        // Tension
        if (tensionBar) tensionBar.style.width = `${clamp(state.tension, 0, 100)}%`;
    
        // Stamina
        if (playerStamBar) playerStamBar.style.width = `${clamp(state.playerStamina, 0, 100)}%`;
        if (fishStamBar) fishStamBar.style.width = `${clamp(state.fishStamina, 0, 100)}%`;
    
        // Info panel
        if (state.currentFish) {
          const nameEl = document.getElementById('ftInfoNameVal');
          const rarEl = document.getElementById('ftInfoRarityVal');
          const ptsEl = document.getElementById('ftInfoPtsVal');
          if (nameEl) nameEl.textContent = state.currentFish.name;
          if (rarEl) { rarEl.textContent = state.currentFish.rarityLabel; rarEl.style.color = state.currentFish.rarityColor; }
          if (ptsEl) ptsEl.textContent = String(state.currentFish.points);
        }
      }
    
      // ========== EFFECTS ==========
      function createSplash(x, y) {
        const splash = createEl('div', 'ft-splash', overlay);
        splash.style.left = `${x - 25}px`;
        splash.style.top = `${y - 25}px`;
        setTimeout(() => splash.remove(), 700);
    
        // Droplets
        for (let i = 0; i < 6; i++) {
          const drop = createEl('div', 'ft-splash-drop', overlay);
          drop.style.left = `${x + rand(-15, 15)}px`;
          drop.style.top = `${y + rand(-5, 5)}px`;
          setTimeout(() => drop.remove(), 600);
        }
      }
    
      function createBubbles(x, y, count) {
        for (let i = 0; i < count; i++) {
          const b = createEl('div', 'ft-bubble', overlay);
          const sz = rand(3, 8);
          b.style.cssText = `left:${x + rand(-10, 10)}px;top:${y}px;width:${sz}px;height:${sz}px;--dur:${rand(1.5,3)}s`;
          setTimeout(() => b.remove(), 3000);
        }
      }
    
      function createSparkles(x, y, count) {
        for (let i = 0; i < count; i++) {
          const s = createEl('div', 'ft-sparkle', overlay);
          s.style.left = `${x + rand(-30, 30)}px`;
          s.style.top = `${y + rand(-30, 30)}px`;
          s.style.animationDelay = `${rand(0, 0.3)}s`;
          setTimeout(() => s.remove(), 1200);
        }
      }
    
      // ========== GAME PHASES ==========
      function onActionClick() {
        switch (state.phase) {
          case 'idle':
            startCast();
            break;
          case 'waiting':
            // Early click - small chance to scare fish
            if (Math.random() < 0.15) {
              showMessage('💨 鱼被吓跑了...');
              setTimeout(() => goIdle(), 1200);
            }
            break;
          case 'bitten':
            startReeling();
            break;
          case 'reeling':
            doReelAction();
            break;
          case 'showcase':
            // 展示画面只能通过关闭按钮关闭，不允许点击其他区域关闭
            break;
        }
      }
    
      
          function castBait() {
            if (state.baitsLeft <= 0) return;
            if (state.phase !== 'idle' && state.phase !== 'waiting') return;
            
            state.baitsLeft--;
            
            // 更新饵料UI显示
            updateBaitUI();
            
            // 创建饵料粒子动画效果（黄色圆形饵料从鱼钩位置散开）
            const overlay = document.querySelector('.ft-overlay');
            if (overlay) {
              const hookEl = document.querySelector('.ft-hook');
              const hookRect = hookEl ? hookEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight * 0.45 };
              const overlayRect = overlay.getBoundingClientRect();
              
              // 创建多个饵料粒子
              for (let i = 0; i < 8; i++) {
                const particle = document.createElement('div');
                particle.className = 'ft-bait-particle';
                particle.style.cssText = 
                  `position:absolute;left:${hookRect.left - overlayRect.left}px;top:${hookRect.top - overlayRect.top}px;width:12px;height:12px;border-radius:50%;background:#FFD700;border:2px solid #FFA500;z-index:200;pointer-events:none;opacity:1;`;
                
                const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.5;
                const distance = 40 + Math.random() * 60;
                const dx = Math.cos(angle) * distance;
                const dy = Math.sin(angle) * distance + 20; // 略微向下偏移模拟落入水中
                
                overlay.appendChild(particle);
                
                // 动画
                particle.animate([
                  { transform: 'translate(0,0) scale(1)', opacity: 1 },
                  { transform: `translate(${dx}px,${dy}px) scale(0.3)`, opacity: 0 }
                ], {
                  duration: 800 + Math.random() * 400,
                  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
                }).onfinish = () => particle.remove();
              }
              
              // 水面涟漪效果
              const ripple = document.createElement('div');
              ripple.style.cssText = 
                `position:absolute;left:${hookRect.left - overlayRect.left - 20}px;top:${hookRect.top - overlayRect.top + 30}px;width:40px;height:10px;border-radius:50%;background:rgba(255,215,0,0.4);z-index:199;pointer-events:none;`;
              overlay.appendChild(ripple);
              ripple.animate([
                { transform: 'scale(1)', opacity: 0.6 },
                { transform: 'scale(3)', opacity: 0 }
              ], { duration: 600, easing: 'ease-out' }).onfinish = () => ripple.remove();
            }
          }
    
          function updateBaitUI() {
            const baitHint = document.getElementById('ftBaitHint');
            if (baitHint) {
              baitHint.querySelector('.ft-bait-count').textContent = 
                `${state.baitsLeft}/${state.maxBaits}`;
              if (state.baitsLeft <= 0) {
                baitHint.style.opacity = '0.4';
              }
            }
          }
    
        function startCast() {
        state.phase = 'casting';
        state.totalCasts++;
        actionBtn.disabled = true;
    
        // Cast animation
        let castProg = 0;
        const castAnim = () => {
          castProg += 0.04;
          state.rodAngle = -35 - Math.sin(castProg * Math.PI) * 55;
          updateRodAndLine();
    
          if (castProg < 1) {
            requestAnimationFrame(castAnim);
          } else {
            state.rodAngle = -35;
            state.lineLength = 150 + rand(30, 120);
            state.phase = 'waiting';
            actionBtn.disabled = false;
            actionBtn.textContent = '🎣 等待...';
            showMessage('🌊 等待鱼儿上钩...');
    
            // Schedule bite based on weather
            const biteDelay = rand(1500, 4500) / state.weather.biteSpeed;
            scheduleBite(biteDelay);
          }
        };
        requestAnimationFrame(castAnim);
    
        createSplash(state.hookX, window.innerHeight * 0.42);
      }
    
      function scheduleBite(delay) {
        if (state.phase !== 'waiting') return;
        setTimeout(() => {
          if (state.phase !== 'waiting') return;
          triggerBite();
        }, delay);
      }
    
      function triggerBite() {
        if (state.phase !== 'waiting') return;
    
        // Pick a fish
        state.currentFish = weightedPick(FISH_TYPES, SPAWN_WEIGHTS);
        state.fishStamina = state.currentFish.stamina * state.weather.fishMod;
        state.playerStamina = 100;
        state.tension = 0;
        state.reelDistance = 0;
        state.perfectWindowActive = true;
        state.perfectTimerStart = Date.now();
        state.totalBites++;
    
        // Initialize fish position near hook
        state.fishPosX = state.hookX + rand(-80, 80);
        state.fishPosY = state.hookY + rand(30, 80);
        state.fishVelX = 0;
        state.fishVelY = 0;
        state.fishDirection = state.fishPosX > state.hookX ? -1 : 1;
        state.aiState = 'approach';
        state.aiTimer = 1.0;
    
        state.phase = 'bitten';
        actionBtn.textContent = '⚡ 收杆！';
    
        // Bobber animation
        let bobCount = 0;
        const bobInterval = setInterval(() => {
          if (state.phase !== 'bitten') { clearInterval(bobInterval); return; }
          state.bobberDx = rand(-4, 4);
          state.bobberDy = rand(-6, 2);
          bobCount++;
          if (bobCount > 8) clearInterval(bobInterval);
        }, 100);
    
        showMessage(`🐟 ${state.currentFish.name} 上钩了！快收杆！`);
        updateUI();
    
        // Auto-escape after timeout
        setTimeout(() => {
          if (state.phase === 'bitten') {
            fishEscaped('timeout');
          }
        }, 2500);
    
        createBubbles(state.hookX, window.innerHeight * 0.45, 5);
      }
    
      function startReeling() {
        state.phase = 'reeling';
        actionBtn.textContent = '🎣 拉拽！';
        actionBtn.classList.add('reeling');
        tensionPanel.classList.add('visible');
    
        // Check for perfect timing (< 600ms)
        const reactionTime = Date.now() - state.perfectTimerStart;
        if (reactionTime < 600) {
          showPerfectIndicator();
          state.combo++;
          state.tension = Math.max(0, state.tension - 15); // Bonus: lower starting tension
        } else {
          state.combo = 0;
        }
    
        showMessage('🎣 拖拽控制拉力，别让线断了！');
        updateUI();
      }
    
      function doReelAction() {
        if (state.phase !== 'reeling') return;
    
        // Simulate reel input: increase tension and progress
        state.reelDistance += rand(3, 8);
        state.tension += rand(2, 6);
        state.playerStamina -= rand(1, 3);
    
        // Fish resists
        const resistance = state.currentFish.strength * (1 + state.tension / 100);
        state.fishStamina -= rand(1, 3);
        state.tension -= rand(1, 4);
    
        // Clamp values
        state.tension = clamp(state.tension, 0, 100);
        state.playerStamina = clamp(state.playerStamina, 0, 100);
        state.fishStamina = clamp(state.fishStamina, 0, state.currentFish.stamina * state.weather.fishMod);
    
        // Check win/lose conditions
        if (state.reelDistance >= 100) {
          fishCaught();
        } else if (state.tension >= 100) {
          fishEscaped('line_break');
        } else if (state.playerStamina <= 0) {
          fishEscaped('exhausted');
        } else if (state.fishStamina <= 0) {
          // Fish exhausted - easier to catch
          state.tension = Math.max(0, state.tension - 10);
        }
    
        // Random escape chance based on fish type
        if (Math.random() < state.currentFish.escapeChance * (state.tension / 80)) {
          fishEscaped('escaped');
        }
    
        updateUI();
      }
    
      function fishCaught() {
        state.phase = 'caught';
        state.totalCaught++;
    
        // Generate random weight & length for this specific catch
        const f = state.currentFish;
        if (f.weightRange && f.lengthRange) {
          state.caughtWeight = rand(f.weightRange[0], f.weightRange[1]);
          state.caughtLength = rand(f.lengthRange[0], f.lengthRange[1]);
          // Bigger fish are rarer — slight bonus for heavy catches
          const sizeBonus = ((state.caughtWeight - f.weightRange[0]) / (f.weightRange[1] - f.weightRange[0])) * 0.3 + 1;
          state.caughtSizeBonus = sizeBonus;
        } else {
          state.caughtWeight = 0;
          state.caughtLength = 0;
          state.caughtSizeBonus = 1;
        }
    
        // Calculate points with combo multiplier
        const comboMult = 1 + state.combo * 0.5;
        const basePoints = state.currentFish.points;
        const finalPoints = Math.round(basePoints * comboMult * state.weather.fishMod * (state.caughtSizeBonus || 1));
        state.score += finalPoints;
        state.maxCombo = Math.max(state.maxCombo, state.combo);
        state.lastCatchTime = Date.now();
    
        // Update collection
        if (!state.collection[state.currentFish.id]) {
          state.collection[state.currentFish.id] = 0;
        }
        state.collection[state.currentFish.id]++;
    
        // Visual feedback
        actionBtn.classList.remove('reeling');
        actionBtn.textContent = '🎉 继续';
        tensionPanel.classList.remove('visible');
    
        createSparkles(state.fishPosX, state.fishPosY, 12);
        createBubbles(state.fishPosX, state.fishPosY, 8);
        createSplash(state.fishPosX, window.innerHeight * 0.42);
    
        // Show showcase with full celebration
        showShowcase(finalPoints);
    
        fishEl.style.display = 'none';
        updateCollectionUI();
        updateUI();
      }
    
      function fishEscaped(reason) {
        state.phase = 'escaped';
        state.totalEscaped++;
        state.combo = 0;
    
        const reasons = {
          timeout: '⏰ 反应太慢，鱼跑掉了！',
          line_break: '💥 线太紧了！鱼挣脱了！',
          exhausted: '😵 你太累了，让鱼跑了！',
          escaped: '🏃 鱼奋力挣扎逃走了！',
        };
    
        showMessage(reasons[reason] || '🐟 鱼逃走了...');
    
        actionBtn.classList.remove('reeling');
        actionBtn.textContent = '🎣 再试一次';
        tensionPanel.classList.remove('visible');
    
        fishEl.style.display = 'none';
        state.currentFish = null;
    
        setTimeout(() => goIdle(), 1800);
        updateUI();
      }
    
      function goIdle() {
        state.phase = 'idle';
        state.currentFish = null;
        state.lineLength = 150;
        state.rodAngle = -35;
        state.tension = 0;
        state.playerStamina = 100;
        state.fishStamina = 0;
        state.bobberDx = 0;
        state.bobberDy = 0;
        state.reelDistance = 0;
    
        actionBtn.disabled = false;
        actionBtn.textContent = '🎣 甩杆';
        actionBtn.classList.remove('reeling');
        tensionPanel.classList.remove('visible');
        fishEl.style.display = 'none';
    
        showMessage('🎣 点击下方按钮甩杆');
        updateUI();
      }
    
      function showMessage(text) {
        if (msgText) msgText.textContent = text;
      }
    
      function showShowcase(points) {
        state.phase = 'showcase';
        const f = state.currentFish;
    
        // --- Fish preview: color it like the actual fish ---
        const previewBody = showcaseEl.querySelector('.ft-fish-body');
        const previewTail = showcaseEl.querySelector('.ft-fish-tail');
        const previewFinTop = showcaseEl.querySelector('.ft-fish-fin-top');
        const previewFinSide = showcaseEl.querySelector('.ft-fish-fin-side');
        if (previewBody) {
          previewBody.style.background = `linear-gradient(135deg, ${f.colors.body}, ${adjustColor(f.colors.body, -30)})`;
        }
        if (previewTail) previewTail.style.borderLeftColor = f.colors.tail;
        if (previewFinTop) previewFinTop.style.borderBottomColor = f.colors.fin;
        if (previewFinSide) previewFinSide.style.borderRightColor = f.colors.fin;
    
        // Scale fish preview based on size
        const previewContainer = showcaseEl.querySelector('.ft-caught-fish-preview');
        if (previewContainer) {
          const scale = 0.7 + (f.size.w / 78) * 0.6; // scale between ~0.7x - 1.3x
          previewContainer.style.transform = `scale(${scale})`;
        }
    
        // --- Name ---
        caughtName.textContent = f.name;
    
        // --- Animated score count-up ---
        animateScore(caughtPoints, points, state.combo);
    
        // --- Combo bonus line ---
        if (state.combo > 0) {
          caughtCombo.innerHTML = `🔥 连击 ×${state.combo} — 加成 ${(1 + state.combo * 0.5).toFixed(1)}×`;
          caughtCombo.style.display = 'block';
          // Re-trigger animation
          caughtCombo.style.animation = 'none';
          void caughtCombo.offsetWidth;
          caughtCombo.style.animation = '';
        } else {
          caughtCombo.style.display = 'none';
        }
    
        // --- Rarity badge ---
        caughtRarity.textContent = f.rarityLabel;
        caughtRarity.style.background = `${f.rarityColor}22`;
        caughtRarity.style.color = f.rarityColor;
        caughtRarity.style.border = `1px solid ${f.rarityColor}44`;
    
        // --- Weight & Length detail row ---
        let detailsRow = showcaseEl.querySelector('.ft-caught-details');
        if (!detailsRow) {
          detailsRow = createEl('div', 'ft-caught-details', showcaseEl);
          // Insert before stats row
          const statsRow = showcaseEl.querySelector('.ft-caught-stats');
          if (statsRow) showcaseEl.insertBefore(detailsRow, statsRow);
        }
        detailsRow.innerHTML = `
          <div class="ft-caught-detail-item">
            <span class="ft-caught-detail-icon">⚖️</span>
            <span class="ft-caught-detail-val">${state.caughtWeight.toFixed(2)}</span>
            <span class="ft-caught-detail-unit">kg</span>
          </div>
          <div class="ft-caught-detail-item">
            <span class="ft-caught-detail-icon">📏</span>
            <span class="ft-caught-detail-val">${state.caughtLength.toFixed(0)}</span>
            <span class="ft-caught-detail-unit">cm</span>
          </div>
          <div class="ft-caught-detail-item">
            <span class="ft-caught-detail-icon">⭐</span>
            <span class="ft-caught-detail-val">${'★'.repeat(f.stars)}${'☆'.repeat(5 - f.stars)}</span>
          </div>
        `;
    
        // --- Stats summary ---
        const statTotalEl = document.getElementById('ftStatTotal');
        const statComboEl = document.getElementById('ftStatCombo');
        const statScoreEl = document.getElementById('ftStatScore');
        if (statTotalEl) statTotalEl.textContent = String(state.totalCaught);
        if (statComboEl) statComboEl.textContent = `×${state.maxCombo}`;
        if (statScoreEl) animateScore(statScoreEl, state.score, 0, false);
    
        showcaseEl.classList.add('visible');
        actionBtn.textContent = '🎣 继续钓鱼 →';
      }
    
      /** Animate a number element from 0 to target value */
      function animateScore(el, targetVal, combo, showPlus = true) {
        const duration = 800;
        const start = performance.now();
        const startVal = 0;
    
        function tick(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(startVal + (targetVal - startVal) * eased);
          el.textContent = `${showPlus ? '+' : ''}${current} 分`;
    
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }
    
      function hideShowcase() {
        showcaseEl.classList.remove('visible');
      }
    
      function showPerfectIndicator() {
        perfectIndicator.classList.remove('show');
        void perfectIndicator.offsetWidth; // force reflow
        perfectIndicator.classList.add('show');
      }
    
      // ========== WEATHER SYSTEM ==========
      function changeWeather() {
        const newWeather = pick(WEATHER_TYPES);
        state.weather = newWeather;
        const badge = document.getElementById('ftWeatherBadge');
        if (badge) badge.textContent = newWeather.label;
      }
    
      // Auto-change weather every 45 seconds
      function startWeatherCycle() {
        setInterval(() => {
          if (state.phase === 'idle' || state.phase === 'waiting') {
            changeWeather();
          }
        }, 45000);
      }
    
      // ========== MAIN LOOP ==========
      let lastTime = 0;
      function gameLoop(timestamp) {
        const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // cap delta
        lastTime = timestamp;
    
        // Update fish AI during reeling
        if (state.phase === 'reeling') {
          updateFishAI(dt);
    
          // Passive tension dynamics
          state.tension += rand(-1, 2) * dt * 10;
          state.tension = clamp(state.tension, 0, 100);
    
          // Passive stamina drain
          state.playerStamina -= dt * 2;
          state.playerStamina = clamp(state.playerStamina, 0, 100);
    
          // Bobber wiggle during fight
          state.bobberDx = rand(-3, 3);
          state.bobberDy = rand(-4, 1);
        }
    
        // Always update visuals
        updateRodAndLine();
        updateFishVisual();
        updateUI();
    
        // Decay bobber offset when not fighting
        if (state.phase !== 'reeling' && state.phase !== 'bitten') {
          state.bobberDx *= 0.9;
          state.bobberDy *= 0.9;
        }
    
        rafId = requestAnimationFrame(gameLoop);
      }
    
      // ========== DRAG TO REEL ==========
      function initDragReel() {
        let dragging = false;
        let lastY = 0;
    
        overlay.addEventListener('mousedown', (e) => {
          if (state.phase !== 'reeling') return;
          dragging = true;
          lastY = e.clientY;
          e.preventDefault();
        });
    
        overlay.addEventListener('mousemove', (e) => {
          if (!dragging || state.phase !== 'reeling') return;
          const dy = lastY - e.clientY; // up = reel in
          lastY = e.clientY;
    
          if (dy > 3) {
            // Reeling in
            state.reelDistance += dy * 0.15;
            state.tension += dy * 0.12;
            state.playerStamina -= dy * 0.08;
    
            // Fish fights back more when reeled fast
            const fightBack = dy * state.currentFish.strength * 0.04;
            state.fishStamina -= dy * 0.05;
            state.tension += fightBack * 0.1;
    
            // Create bubbles while reeling
            if (Math.random() < 0.15) {
              createBubbles(state.hookX, state.hookY, 2);
            }
          }
    
          state.tension = clamp(state.tension, 0, 100);
          state.playerStamina = clamp(state.playerStamina, 0, 100);
          state.fishStamina = clamp(state.fishStamina, 0, state.currentFish.stamina * state.weather.fishMod);
    
          // Check conditions
          if (state.reelDistance >= 100) {
            fishCaught();
          } else if (state.tension >= 100) {
            fishEscaped('line_break');
          } else if (state.playerStamina <= 0) {
            fishEscaped('exhausted');
          }
    
          updateUI();
        });
    
        overlay.addEventListener('mouseup', () => { dragging = false; });
        overlay.addEventListener('mouseleave', () => { dragging = false; });
    
        // Touch support
        overlay.addEventListener('touchstart', (e) => {
          if (state.phase !== 'reeling') return;
          dragging = true;
          lastY = e.touches[0].clientY;
          e.preventDefault();
        }, { passive: false });
    
        overlay.addEventListener('touchmove', (e) => {
          if (!dragging || state.phase !== 'reeling') return;
          const dy = lastY - e.touches[0].clientY;
          lastY = e.touches[0].clientY;
    
          if (dy > 2) {
            state.reelDistance += dy * 0.15;
            state.tension += dy * 0.12;
            state.playerStamina -= dy * 0.08;
            state.fishStamina -= dy * 0.05;
    
            if (Math.random() < 0.15) {
              createBubbles(state.hookX, state.hookY, 2);
            }
          }
    
          state.tension = clamp(state.tension, 0, 100);
          state.playerStamina = clamp(state.playerStamina, 0, 100);
          state.fishStamina = clamp(state.fishStamina, 0, state.currentFish.stamina * state.weather.fishMod);
    
          if (state.reelDistance >= 100) fishCaught();
          else if (state.tension >= 100) fishEscaped('line_break');
          else if (state.playerStamina <= 0) fishEscaped('exhausted');
    
          updateUI();
          e.preventDefault();
        }, { passive: false });
    
        overlay.addEventListener('touchend', () => { dragging = false; });
      }
    
      // ========== INITIALIZATION ==========
      function init() {
        buildScene();
        initDragReel();
        startWeatherCycle();
        updateRodAndLine();
        updateUI();
    
        // Start game loop
        lastTime = performance.now();
        rafId = requestAnimationFrame(gameLoop);
    
        // Keyboard support
        document.addEventListener('keydown', (e) => {
          if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            // 空格键：idle/waiting阶段撒饵料，其他阶段原有动作
            if ((state.phase === 'idle' || state.phase === 'waiting') && state.baitsLeft > 0) {
              castBait();
            } else if (state.phase !== 'showcase') {
              onActionClick();
            }
          }
        });
      }
    
      // Cleanup function
      function cleanup() {
        if (rafId) cancelAnimationFrame(rafId);
        if (overlay) overlay.remove();
      }
    
      // Run
      init();
    
      return {
        ok: true,
        summary: 'Fishing Master Enhanced game initialized with premium visuals, glass-morphism UI, fish AI behaviors, stamina system, combo multiplier, weather effects, and drag-to-reel mechanics.',
        data: {
          fishTypes: FISH_TYPES.map(f => ({ id: f.id, name: f.name, rarity: f.rarityLabel, points: f.points, stars: f.stars })),
          weatherTypes: WEATHER_TYPES.map(w => ({ id: w.id, label: w.label })),
          features: [
            'Dynamic sky with stars, celestial glow, animated clouds',
            'Multi-layer water with caustics, light rays, particles, seaweed',
            'Detailed fish rendering with scales, fins, wagging tails',
            'Glass-morphism UI panels with blur & transparency',
            'Fish AI behavior patterns: calm/fighter/elusive/mythic etc.',
            'Dual stamina system (player vs fish)',
            'Tension meter affecting escape chance',
            'Combo multiplier for consecutive catches',
            'Perfect timing bonus window (< 600ms)',
            'Weather system affecting bite rate & fish strength',
            'Drag/touch-to-reel mechanic with physics',
            'Particle effects: splashes, droplets, bubbles, sparkles',
            'Fish collection tracker with rarity indicators',
            'Keyboard (Space) and touch support',
          ],
        },
        warnings: [],
        cleanup,
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();