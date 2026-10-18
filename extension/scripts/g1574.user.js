(function () {
  const SCRIPT_ID = 'typing-duck-pet-script-v3';
  const ROOT_ID = 'typing-duck-pet-root';

  if (window[SCRIPT_ID] || document.getElementById(ROOT_ID)) {
    console.warn('Duck pet script already initialized.');
    return;
  }
  window[SCRIPT_ID] = true;

  const CONFIG = {
    laneHeight: 88,
    duckWidth: 118,
    duckHeight: 84,
    sidePadding: 18,
    walkSpeed: 84,
    typingIdleDelay: 1200,
    bobAmp: 2.8,
    bodyTiltAmp: 2.6,
    sproutAmp: 10,
    wingAmp: 7,
    tailAmp: 9,
    footAmp: 18,
    headAmp: 2.2,
    statusGap: 10,
    statusTopOffset: -6
  };

  let root = null;
  let lane = null;
  let duck = null;

  let destroyed = false;
  let direction = 1;
  let x = 20;
  let lastTypingAt = 0;
  let rafId = 0;
  let lastTs = 0;
  let resizeRaf = 0;
  let activeEditor = null;
  let typedCount = 0;

  function isEditableTarget(target) {
    if (!target || !(target instanceof Element)) return false;
    return !!target.closest('input, textarea, [contenteditable="true"], [role="textbox"], .ProseMirror');
  }

  function getEditorElement(target) {
    if (!target || !(target instanceof Element)) return null;
    return target.closest('input, textarea, [contenteditable="true"], [role="textbox"], .ProseMirror');
  }

  function markTyping() {
    lastTypingAt = performance.now();
  }

  function isTypingNow(now) {
    return now - lastTypingAt < CONFIG.typingIdleDelay;
  }

  function clampX() {
    if (!lane) return;
    const laneWidth = lane.clientWidth || window.innerWidth;
    const maxX = Math.max(CONFIG.sidePadding, laneWidth - CONFIG.duckWidth - CONFIG.sidePadding);
    x = Math.max(CONFIG.sidePadding, Math.min(x, maxX));
  }

  function getTextLengthFromEditor(editor) {
    if (!editor) return 0;

    const tagName = editor.tagName ? editor.tagName.toLowerCase() : '';

    if (tagName === 'input' || tagName === 'textarea') {
      return (editor.value || '').length;
    }

    const text = (editor.innerText || editor.textContent || '')
      .replace(/\u200B/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim();

    return text.length;
  }

  function updateTypedCount(target) {
    const editor = getEditorElement(target) || activeEditor;
    if (!editor) return;

    activeEditor = editor;
    typedCount = getTextLengthFromEditor(editor);

    const status = document.getElementById('typing-duck-status');
    if (status) {
      status.textContent = `已输入 ${typedCount} 字`;
    }
  }

  function createStyles() {
    const style = document.createElement('style');
    style.id = 'typing-duck-pet-style';
    style.textContent = `
      #typing-duck-pet-root {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: ${CONFIG.laneHeight}px;
        pointer-events: none;
        z-index: 2147483000;
      }

      #typing-duck-pet-root * {
        box-sizing: border-box;
      }

      #typing-duck-pet-lane {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        pointer-events: none;
      }

      #typing-duck-pet-shadow {
        position: absolute;
        width: 58px;
        height: 12px;
        left: 28px;
        bottom: 7px;
        border-radius: 50%;
        background: radial-gradient(ellipse at center, rgba(181, 135, 42, 0.28) 0%, rgba(181, 135, 42, 0.18) 55%, rgba(181, 135, 42, 0.04) 100%);
        filter: blur(1px);
        transform-origin: center center;
      }

      #typing-duck-pet {
        position: absolute;
        left: 0;
        top: 4px;
        width: ${CONFIG.duckWidth}px;
        height: ${CONFIG.duckHeight}px;
        transform: translate3d(0, 0, 0);
        will-change: transform;
        filter: drop-shadow(0 6px 12px rgba(0,0,0,0.08));
      }

      #typing-duck-pet svg {
        width: 100%;
        height: 100%;
        overflow: visible;
        display: block;
      }

      #typing-duck-status {
        position: absolute;
        top: 0;
        left: 0;
        font: 12px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: rgba(80, 80, 80, 0.92);
        user-select: none;
        white-space: nowrap;
        opacity: 1;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.88);
        border: 1px solid rgba(0, 0, 0, 0.06);
        box-shadow: 0 6px 16px rgba(0,0,0,0.08);
        backdrop-filter: blur(6px);
        will-change: transform;
      }
    `;
    document.documentElement.appendChild(style);
  }

  function createDuckSVG() {
    return `
      <svg viewBox="0 0 140 100" aria-hidden="true">
        <defs>
          <linearGradient id="duckBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFF4A8"/>
            <stop offset="55%" stop-color="#FFE27A"/>
            <stop offset="100%" stop-color="#F6C94F"/>
          </linearGradient>
          <linearGradient id="duckBellyGrad" x1="0" y1="0" x2="0.8" y2="1">
            <stop offset="0%" stop-color="#FFF7C8"/>
            <stop offset="100%" stop-color="#FFEAA0"/>
          </linearGradient>
          <linearGradient id="beakGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FFB661"/>
            <stop offset="100%" stop-color="#F08B34"/>
          </linearGradient>
          <linearGradient id="sproutStemGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#9BE36C"/>
            <stop offset="100%" stop-color="#5FBE46"/>
          </linearGradient>
          <linearGradient id="sproutLeafGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#C6F59A"/>
            <stop offset="100%" stop-color="#69C955"/>
          </linearGradient>
        </defs>

        <g id="duck-whole">
          <g id="duck-sprout">
            <path d="M62 19 C61 13, 62 9, 66 6 C69 8, 69 12, 68 18" fill="none" stroke="url(#sproutStemGrad)" stroke-width="4.2" stroke-linecap="round"/>
            <path d="M64 7 C54 2, 48 7, 49 14 C57 16, 64 13, 64 7 Z" fill="url(#sproutLeafGrad)"/>
            <path d="M67 8 C74 2, 82 5, 84 12 C78 16, 70 15, 67 8 Z" fill="url(#sproutLeafGrad)"/>
          </g>

          <g id="duck-tail">
            <path d="M100 56 C109 50, 117 52, 121 60 C114 66, 106 67, 98 63 Z" fill="#F5D05E"/>
          </g>

          <ellipse cx="74" cy="62" rx="34" ry="24" fill="url(#duckBodyGrad)"/>
          <ellipse cx="66" cy="64" rx="19" ry="13" fill="url(#duckBellyGrad)" opacity="0.95"/>

          <g id="duck-wing">
            <path d="M72 58 C83 50, 95 54, 96 64 C94 74, 82 76, 74 70 C70 66, 69 61, 72 58 Z" fill="#F8D55F"/>
          </g>

          <g id="duck-head">
            <circle cx="58" cy="36" r="24" fill="url(#duckBodyGrad)"/>
            <path d="M34 41 C26 40, 20 39, 15 38 C20 34, 26 31, 34 31 L39 31 C41 31, 42 32, 42 34 L42 38 C42 40, 41 41, 39 41 Z" fill="url(#beakGrad)"/>
            <ellipse cx="56" cy="36" rx="3.8" ry="5.2" fill="#2F2A26"/>
            <circle cx="57.4" cy="34.3" r="1.2" fill="#ffffff"/>
          </g>

          <g id="duck-feet">
            <g id="foot-left">
              <path d="M52 84 C50 87, 49 89, 47 92 C52 91, 57 91, 62 92 C60 89, 58 87, 57 84 Z" fill="#F29B3E"/>
            </g>
            <g id="foot-right">
              <path d="M74 84 C72 87, 71 89, 69 92 C74 91, 79 91, 84 92 C82 89, 80 87, 79 84 Z" fill="#F29B3E"/>
            </g>
          </g>
        </g>
      </svg>
    `;
  }

  function createUI() {
    root = document.createElement('div');
    root.id = ROOT_ID;

    lane = document.createElement('div');
    lane.id = 'typing-duck-pet-lane';

    const shadow = document.createElement('div');
    shadow.id = 'typing-duck-pet-shadow';

    duck = document.createElement('div');
    duck.id = 'typing-duck-pet';
    duck.innerHTML = createDuckSVG();

    const status = document.createElement('div');
    status.id = 'typing-duck-status';
    status.textContent = '已输入 0 字';

    lane.appendChild(shadow);
    lane.appendChild(duck);
    lane.appendChild(status);
    root.appendChild(lane);
    document.body.appendChild(root);
  }

  function updateStatusPosition(bob) {
    const status = document.getElementById('typing-duck-status');
    if (!status || !lane) return;

    const laneWidth = lane.clientWidth || window.innerWidth;
    const statusWidth = status.offsetWidth || 80;

    let statusX;
    if (direction === 1) {
      statusX = x + CONFIG.duckWidth + CONFIG.statusGap;
    } else {
      statusX = x - statusWidth - CONFIG.statusGap;
    }

    const minX = 6;
    const maxX = Math.max(6, laneWidth - statusWidth - 6);
    statusX = Math.max(minX, Math.min(statusX, maxX));

    const statusY = 8 + bob + CONFIG.statusTopOffset;
    status.style.transform = `translate3d(${statusX}px, ${statusY}px, 0)`;
  }

  function animate(ts) {
    if (destroyed || !duck) return;
    if (!lastTs) lastTs = ts;
    const dt = Math.min(32, ts - lastTs) / 1000;
    lastTs = ts;

    const typing = isTypingNow(ts);
    const laneWidth = lane ? lane.clientWidth : window.innerWidth;
    const maxX = Math.max(CONFIG.sidePadding, laneWidth - CONFIG.duckWidth - CONFIG.sidePadding);

    if (typing) {
      x += direction * CONFIG.walkSpeed * dt;
      if (x >= maxX) {
        x = maxX;
        direction = -1;
      } else if (x <= CONFIG.sidePadding) {
        x = CONFIG.sidePadding;
        direction = 1;
      }
    }

    const t = ts / 1000;
    const phase = typing ? t * 9.5 : t * 2.2;

    const bob = typing ? Math.sin(phase * 2) * CONFIG.bobAmp : Math.sin(phase) * 1.4;
    const bodyTilt = typing ? Math.sin(phase) * CONFIG.bodyTiltAmp : Math.sin(phase) * 1.2;
    const sproutRot = typing ? Math.sin(phase * 1.8 + 0.8) * CONFIG.sproutAmp : Math.sin(phase + 0.8) * 5;
    const wingRot = typing ? Math.sin(phase * 2.2) * CONFIG.wingAmp : Math.sin(phase * 1.2) * 2.5;
    const tailRot = typing ? Math.sin(phase * 2 + 1.1) * CONFIG.tailAmp : Math.sin(phase + 1.1) * 3;
    const footLeftRot = typing ? Math.sin(phase) * CONFIG.footAmp : Math.sin(phase) * 3;
    const footRightRot = typing ? Math.sin(phase + Math.PI) * CONFIG.footAmp : Math.sin(phase + Math.PI) * 3;
    const headY = typing ? Math.sin(phase * 2 + 0.6) * CONFIG.headAmp : Math.sin(phase + 0.4) * 1.2;

    const facingScaleX = direction === 1 ? -1 : 1;

    duck.style.transform = `translate3d(${x}px, ${bob}px, 0) scaleX(${facingScaleX}) rotate(${bodyTilt}deg)`;

    const shadow = document.getElementById('typing-duck-pet-shadow');
    if (shadow) {
      const shadowScale = typing ? 1 - Math.abs(bob) * 0.03 : 1 - Math.abs(bob) * 0.02;
      shadow.style.transform = `translateX(${x}px) scale(${shadowScale})`;
      shadow.style.opacity = typing ? '0.9' : '0.72';
    }

    updateStatusPosition(bob);

    const sprout = duck.querySelector('#duck-sprout');
    const wing = duck.querySelector('#duck-wing');
    const tail = duck.querySelector('#duck-tail');
    const head = duck.querySelector('#duck-head');
    const footLeft = duck.querySelector('#foot-left');
    const footRight = duck.querySelector('#foot-right');

    if (sprout) sprout.setAttribute('transform', `rotate(${sproutRot} 66 18)`);
    if (wing) wing.setAttribute('transform', `rotate(${wingRot} 82 63)`);
    if (tail) tail.setAttribute('transform', `rotate(${tailRot} 108 60)`);
    if (head) head.setAttribute('transform', `translate(0 ${headY})`);
    if (footLeft) footLeft.setAttribute('transform', `rotate(${footLeftRot} 54 84)`);
    if (footRight) footRight.setAttribute('transform', `rotate(${footRightRot} 76 84)`);

    rafId = requestAnimationFrame(animate);
  }

  function onKeydown(e) {
    if (e.isComposing) return;
    if (!isEditableTarget(e.target)) return;
    activeEditor = getEditorElement(e.target);
    markTyping();
  }

  function onInput(e) {
    if (!isEditableTarget(e.target)) return;
    activeEditor = getEditorElement(e.target);
    markTyping();
    updateTypedCount(e.target);
  }

  function onPaste(e) {
    if (!isEditableTarget(e.target)) return;
    activeEditor = getEditorElement(e.target);
    markTyping();
    requestAnimationFrame(() => updateTypedCount(e.target));
  }

  function onFocusIn(e) {
    if (!isEditableTarget(e.target)) return;
    activeEditor = getEditorElement(e.target);
    markTyping();
    requestAnimationFrame(() => updateTypedCount(e.target));
  }

  function handleResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      clampX();
      updateStatusPosition(0);
    });
  }

  function observeBodyReady(cb) {
    if (document.body) {
      cb();
      return;
    }
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        cb();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function executeAutomation() {
    console.log('Executing duck pet automation...');
    observeBodyReady(() => {
      if (destroyed || document.getElementById(ROOT_ID)) return;

      createStyles();
      createUI();
      clampX();
      updateStatusPosition(0);

      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('input', onInput, true);
      document.addEventListener('paste', onPaste, true);
      document.addEventListener('focusin', onFocusIn, true);
      window.addEventListener('resize', handleResize, { passive: true });

      rafId = requestAnimationFrame(animate);
    });
  }

  function cleanup() {
    destroyed = true;
    cancelAnimationFrame(rafId);
    cancelAnimationFrame(resizeRaf);

    document.removeEventListener('keydown', onKeydown, true);
    document.removeEventListener('input', onInput, true);
    document.removeEventListener('paste', onPaste, true);
    document.removeEventListener('focusin', onFocusIn, true);
    window.removeEventListener('resize', handleResize);

    const style = document.getElementById('typing-duck-pet-style');
    if (style) style.remove();
    if (root) root.remove();

    delete window[SCRIPT_ID];
    delete window.typingDuckPet;
  }

  window.typingDuckPet = {
    cleanup,
    nudge() {
      markTyping();
    },
    getCount() {
      return typedCount;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeAutomation, { once: true });
  } else {
    executeAutomation();
  }
})();