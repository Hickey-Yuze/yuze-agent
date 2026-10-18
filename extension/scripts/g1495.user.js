(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ── Full-screen hacker terminal overlay with binary rain + typewriter ──
    
      // Remove any previous instance
      const prev = document.getElementById('__hacker_overlay__');
      if (prev) prev.remove();
    
      // ── Styles ──
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap');
    
        #__hacker_overlay__ {
          position: fixed;
          inset: 0;
          background: #000;
          z-index: 2147483647;
          font-family: 'Share Tech Mono', 'Courier New', monospace;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
    
        #__hacker_canvas__ {
          position: absolute;
          inset: 0;
          opacity: 0.18;
        }
    
        #__hacker_terminal__ {
          position: relative;
          z-index: 2;
          width: min(820px, 94vw);
          max-height: 88vh;
          background: rgba(0,0,0,0.72);
          border: 1.5px solid #00ff41;
          border-radius: 6px;
          box-shadow: 0 0 32px #00ff4155, 0 0 80px #00ff4122, inset 0 0 18px #00ff4108;
          padding: 28px 34px 28px 34px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: #00ff41 #000;
        }
    
        #__hacker_terminal__::-webkit-scrollbar { width: 5px; }
        #__hacker_terminal__::-webkit-scrollbar-track { background: #000; }
        #__hacker_terminal__::-webkit-scrollbar-thumb { background: #00ff41; border-radius: 4px; }
    
        .hk-titlebar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          border-bottom: 1px solid #00ff4140;
          padding-bottom: 10px;
        }
        .hk-dot { width:12px; height:12px; border-radius:50%; }
        .hk-dot.r { background:#ff5f57; box-shadow:0 0 6px #ff5f57; }
        .hk-dot.y { background:#ffbd2e; box-shadow:0 0 6px #ffbd2e; }
        .hk-dot.g { background:#28c840; box-shadow:0 0 6px #28c840; }
        .hk-title {
          margin-left: 8px;
          color: #00ff41;
          font-size: 13px;
          letter-spacing: 3px;
          text-transform: uppercase;
          opacity: 0.85;
        }
    
        #__hacker_output__ {
          color: #00ff41;
          font-size: 15.5px;
          line-height: 1.85;
          white-space: pre-wrap;
          word-break: break-all;
          text-shadow: 0 0 8px #00ff41cc;
          min-height: 2em;
        }
    
        .hk-cursor {
          display: inline-block;
          width: 9px;
          height: 1.1em;
          background: #00ff41;
          vertical-align: text-bottom;
          margin-left: 1px;
          animation: hk-blink 0.75s step-end infinite;
          box-shadow: 0 0 6px #00ff41;
        }
        @keyframes hk-blink { 0%,100%{opacity:1} 50%{opacity:0} }
    
        .hk-warn  { color: #ffff00; text-shadow: 0 0 10px #ffff00cc; }
        .hk-err   { color: #ff4444; text-shadow: 0 0 10px #ff4444cc; }
        .hk-dim   { color: #007720; }
        .hk-white { color: #e8ffe8; text-shadow: 0 0 6px #00ff4188; }
        .hk-glitch {
          animation: hk-glitch 0.25s steps(1) infinite;
        }
        @keyframes hk-glitch {
          0%   { text-shadow: 2px 0 #ff0040, -2px 0 #00ffff; clip-path: inset(10% 0 80% 0); }
          20%  { text-shadow: -2px 0 #ff0040,  2px 0 #00ffff; clip-path: inset(70% 0 10% 0); }
          40%  { text-shadow: 1px 0 #ff0040, -1px 0 #00ffff; clip-path: inset(40% 0 40% 0); }
          60%  { text-shadow: 0 0 #ff0040, 0 0 #00ffff; clip-path: none; }
          80%  { text-shadow: -1px 0 #ff0040, 1px 0 #00ffff; clip-path: inset(20% 0 65% 0); }
          100% { text-shadow: 2px 0 #ff0040, -2px 0 #00ffff; clip-path: none; }
        }
    
        .hk-shake {
          display: inline-block;
          animation: hk-shake 0.4s ease infinite;
        }
        @keyframes hk-shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-3px) rotate(-1deg); }
          40%     { transform: translateX(3px)  rotate(1deg); }
          60%     { transform: translateX(-2px); }
          80%     { transform: translateX(2px); }
        }
    
        .hk-scanline {
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            to bottom,
            transparent 0px,
            transparent 3px,
            rgba(0,255,65,0.022) 3px,
            rgba(0,255,65,0.022) 4px
          );
          pointer-events: none;
          z-index: 3;
        }
    
        .hk-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.72) 100%);
          pointer-events: none;
          z-index: 3;
        }
    
        .hk-progress-bar {
          height: 4px;
          background: linear-gradient(90deg, #00ff41, #00ccff);
          border-radius: 2px;
          margin-top: 10px;
          box-shadow: 0 0 8px #00ff41;
          transition: width 0.3s linear;
        }
    
        #hk-close-btn {
          position: absolute;
          top: 14px;
          right: 18px;
          color: #00ff4188;
          font-size: 18px;
          cursor: pointer;
          z-index: 10;
          background: none;
          border: none;
          font-family: inherit;
          transition: color 0.2s;
        }
        #hk-close-btn:hover { color: #ff4444; }
      `;
      document.head.appendChild(style);
    
      // ── Overlay ──
      const overlay = document.createElement('div');
      overlay.id = '__hacker_overlay__';
      overlay.innerHTML = `
        <canvas id="__hacker_canvas__"></canvas>
        <div class="hk-scanline"></div>
        <div class="hk-vignette"></div>
        <div id="__hacker_terminal__">
          <button id="hk-close-btn" title="关闭">✕</button>
          <div class="hk-titlebar">
            <div class="hk-dot r"></div>
            <div class="hk-dot y"></div>
            <div class="hk-dot g"></div>
            <span class="hk-title">SYSTEM_BREACH v2.6 — root@localhost</span>
          </div>
          <div id="__hacker_output__"><span class="hk-cursor"></span></div>
        </div>
      `;
      document.body.appendChild(overlay);
    
      // Close button
      document.getElementById('hk-close-btn').onclick = () => overlay.remove();
    
      // ── Binary Rain Canvas ──
      const canvas = document.getElementById('__hacker_canvas__');
      const ctx = canvas.getContext('2d');
      function resizeCanvas() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
    
      const cols = Math.floor(window.innerWidth / 16);
      const drops = Array.from({length: cols}, () => Math.random() * -50);
      const chars  = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ'.split('');
    
      function drawMatrix() {
        ctx.fillStyle = 'rgba(0,0,0,0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = '14px monospace';
        for (let i = 0; i < drops.length; i++) {
          const ch = chars[Math.floor(Math.random() * chars.length)];
          ctx.fillText(ch, i * 16, drops[i] * 16);
          if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
          drops[i] += Math.random() * 0.6 + 0.3;
        }
      }
      const matrixInterval = setInterval(drawMatrix, 50);
    
      // ── Typewriter engine ──
      const outputEl = document.getElementById('__hacker_output__');
    
      // Segments: { text, cls, delay (ms per char), pauseAfter (ms), pauseBefore (ms) }
      const segments = [
        // boot lines
        { text: '> Initializing breach protocol...\n', cls: 'hk-dim', cpc: 28, pauseAfter: 120 },
        { text: '> Loading payload... [████████████████] 100%\n', cls: 'hk-dim', cpc: 18, pauseAfter: 180 },
        { text: '> root access granted.\n\n', cls: 'hk-dim', cpc: 22, pauseAfter: 300 },
    
        // WARNING line — shake + yellow
        { text: '⚠️  警告, 当前页面已被', cls: 'hk-warn hk-shake', cpc: 55, pauseAfter: 0 },
        { text: '#(?==&', cls: 'hk-err hk-glitch', cpc: 80, pauseAfter: 0 },
        { text: '入侵\n', cls: 'hk-warn', cpc: 60, pauseAfter: 400 },
    
        { text: '恭喜你...\n', cls: 'hk-white', cpc: 65, pauseAfter: 260 },
    
        { text: '发现了一个', cls: 'hk-white', cpc: 60, pauseAfter: 0 },
        { text: '*#', cls: 'hk-err hk-glitch', cpc: 90, pauseAfter: 0 },
        { text: '解谜彩蛋', cls: 'hk-white', cpc: 60, pauseAfter: 0 },
        { text: '还有4个', cls: 'hk-warn', cpc: 80, pauseAfter: 0 },
        { text: '^v!', cls: 'hk-err hk-glitch', cpc: 80, pauseAfter: 0 },
        { text: '4个...\n', cls: 'hk-white', cpc: 60, pauseAfter: 300 },
    
        { text: '等待你找到', cls: 'hk-white', cpc: 58, pauseAfter: 0 },
        { text: "/'\"", cls: 'hk-err', cpc: 70, pauseAfter: 0 },
        { text: '%^&', cls: 'hk-err hk-glitch', cpc: 70, pauseAfter: 0 },
        { text: '请按照提示', cls: 'hk-white', cpc: 58, pauseAfter: 0 },
        { text: '寻找', cls: 'hk-warn', cpc: 55, pauseAfter: 0 },
        { text: '埋藏在技炉guang场里的', cls: 'hk-white', cpc: 58, pauseAfter: 0 },
        { text: '4', cls: 'hk-err', cpc: 90, pauseAfter: 0 },
        { text: '个宝藏...\n', cls: 'hk-white', cpc: 58, pauseAfter: 300 },
    
        { text: '线索', cls: 'hk-white', cpc: 58, pauseAfter: 0 },
        { text: '??', cls: 'hk-err hk-glitch', cpc: 80, pauseAfter: 0 },
        { text: '就藏在', cls: 'hk-white', cpc: 58, pauseAfter: 0 },
        { text: ':)', cls: 'hk-warn', cpc: 70, pauseAfter: 0 },
        { text: '技炉生效后的界面里...\n', cls: 'hk-white', cpc: 56, pauseAfter: 350 },
    
        { text: 'error', cls: 'hk-err hk-glitch', cpc: 85, pauseAfter: 0 },
        { text: '祝你找到最后的彩蛋...\n', cls: 'hk-white', cpc: 58, pauseAfter: 400 },
    
        // slow dramatic lines
        { text: '玩\n', cls: 'hk-warn', cpc: 220, pauseAfter: 120 },
        { text: '得\n', cls: 'hk-warn', cpc: 220, pauseAfter: 120 },
        { text: '开\n', cls: 'hk-warn', cpc: 220, pauseAfter: 120 },
        { text: '心心心心心心心心\n', cls: 'hk-warn', cpc: 180, pauseAfter: 120 },
        { text: '❤️\n', cls: 'hk-warn', cpc: 220, pauseAfter: 120 },
    
        // big warning block
        { text: '警告!\n\n', cls: 'hk-err hk-glitch', cpc: 120, pauseAfter: 350 },
    
        { text: '[页面即将崩溃]\n\n', cls: 'hk-err hk-shake', cpc: 90, pauseAfter: 500 },
    
        { text: 'all\n', cls: 'hk-warn', cpc: 140, pauseAfter: 160 },
        { text: '仅供娱乐', cls: 'hk-white', cpc: 130, pauseAfter: 0 },
        { text: '//', cls: 'hk-err hk-glitch', cpc: 100, pauseAfter: 0 },
        { text: '请勿\n', cls: 'hk-white', cpc: 130, pauseAfter: 260 },
        { text: '....\n', cls: 'hk-warn', cpc: 130, pauseAfter: 200 },
        { text: '???????\n', cls: 'hk-err hk-glitch', cpc: 110, pauseAfter: 300 },
        // new hint line
        { text: '\n', cls: 'hk-dim', cpc: 80, pauseAfter: 200 },
        { text: '第', cls: 'hk-warn hk-shake', cpc: 160, pauseAfter: 0 },
        { text: '&*^#', cls: 'hk-err hk-glitch', cpc: 90, pauseAfter: 0 },
        { text: '个提示：\n', cls: 'hk-warn hk-shake', cpc: 120, pauseAfter: 300 },
        { text: '熟悉的', cls: 'hk-white', cpc: 110, pauseAfter: 0 },
        { text: '!%**#$', cls: 'hk-err hk-glitch', cpc: 80, pauseAfter: 0 },
        { text: '...风格', cls: 'hk-white', cpc: 100, pauseAfter: 0 },
        { text: '???', cls: 'hk-err hk-shake', cpc: 140, pauseAfter: 400 },
        { text: '\n', cls: 'hk-dim', cpc: 80, pauseAfter: 0 },
    
        // final cursor rest
        { text: '\n> _', cls: 'hk-dim', cpc: 120, pauseAfter: 0 },
      ];
    
      function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
    
      // Render a typed segment
      async function typeSegment(seg) {
        if (seg.pauseBefore) await sleep(seg.pauseBefore);
        const span = document.createElement('span');
        if (seg.cls) span.className = seg.cls;
        // Insert before the static cursor block
        const cursor = outputEl.querySelector('.hk-cursor');
        outputEl.insertBefore(span, cursor);
    
        for (const ch of seg.text) {
          span.textContent += ch;
          // auto-scroll
          const term = document.getElementById('__hacker_terminal__');
          if (term) term.scrollTop = term.scrollHeight;
          await sleep(seg.cpc + Math.random() * seg.cpc * 0.35);
        }
        if (seg.pauseAfter) await sleep(seg.pauseAfter);
      }
    
      // Run all segments
      (async () => {
        for (const seg of segments) {
          await typeSegment(seg);
        }
        // Remove blinking cursor at end, replace with static underscore
        const c = outputEl.querySelector('.hk-cursor');
        if (c) c.remove();
      })();
    
      return {
        ok: true,
        summary: 'Hacker binary page overlay injected — typewriter animation running'
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();