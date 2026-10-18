// ==UserScript==
// @name         Bilibili Speed Player
// @name:zh-CN   B站高速倍速播放器
// @namespace    skill-create
// @match        *://www.bilibili.com/*
// @match        *://bilibili.com/*
// @description  B 站视频倍速增强：突破官方最高 2x，最高 16x，倍速记忆到 localStorage。使用方法：打开播放页，右下角出现倍速面板，点击预设倍速或用 +/- 按钮微调；页面底部短暂显示当前倍速。
// ==/UserScript==

(function () {
  'use strict';

  const MAX_SPEED = 16;
  const MIN_SPEED = 0.1;
  const STORAGE_KEY = 'bili_speed';
  const PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0, 4.0, 6.0, 8.0, 16.0];

  const STYLE = `
    #bili-speed-indicator {
      position: fixed; bottom: 80px; left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.75); color: #fff;
      padding: 6px 16px; border-radius: 6px;
      font-size: 15px; z-index: 999999;
      pointer-events: none;
      opacity: 0; transition: opacity 0.3s;
    }
    #bili-speed-panel {
      position: fixed; bottom: 60px; right: 16px;
      background: rgba(18,18,18,0.95); color: #fff;
      border-radius: 10px; padding: 10px 8px;
      z-index: 999999; display: flex; flex-direction: column; gap: 4px;
      min-width: 90px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      font-family: sans-serif;
    }
    #bili-speed-panel .bili-sp-label {
      font-size: 11px; color: #aaa; text-align: center; margin-bottom: 2px;
    }
    #bili-speed-panel .bili-sp-presets {
      display: flex; flex-wrap: wrap; gap: 4px; justify-content: center;
    }
    #bili-speed-panel .bili-sp-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 4px 0; font-size: 12px;
      cursor: pointer; width: 38px; text-align: center;
      transition: background 0.15s;
    }
    #bili-speed-panel .bili-sp-btn:hover { background: #3a3a3a; }
    #bili-speed-panel .bili-sp-btn.active { background: #00aeec; border-color: #00aeec; font-weight: bold; }
    #bili-speed-panel .bili-sp-adjust {
      display: flex; gap: 4px; justify-content: center; margin-top: 2px;
    }
    #bili-speed-panel .bili-sp-adj-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 4px 10px; font-size: 14px;
      cursor: pointer; flex: 1; text-align: center;
    }
    #bili-speed-panel .bili-sp-adj-btn:hover { background: #3a3a3a; }
    #bili-speed-panel .bili-sp-current {
      font-size: 13px; text-align: center; color: #00aeec; font-weight: bold;
    }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const indicator = document.createElement('div');
  indicator.id = 'bili-speed-indicator';
  document.body.appendChild(indicator);

  let toastTimer = null;
  function showToast(msg) {
    indicator.textContent = msg;
    indicator.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { indicator.style.opacity = '0'; }, 1200);
  }

  function getVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;
    return videos.find(v => v.duration > 0) || videos[0];
  }

  function setSpeed(speed) {
    const video = getVideo();
    if (!video) return;
    speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, +speed.toFixed(2)));
    video.playbackRate = speed;
    localStorage.setItem(STORAGE_KEY, speed);
    showToast(`倍速 ×${speed}`);
    updatePanel(speed);
  }

  // ── 倍速面板 ──────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'bili-speed-panel';

  const label = document.createElement('div');
  label.className = 'bili-sp-label';
  label.textContent = '倍速';
  panel.appendChild(label);

  const currentEl = document.createElement('div');
  currentEl.className = 'bili-sp-current';
  currentEl.textContent = '×1';
  panel.appendChild(currentEl);

  // 预设按钮
  const presetsWrap = document.createElement('div');
  presetsWrap.className = 'bili-sp-presets';
  const presetBtns = PRESETS.map(s => {
    const btn = document.createElement('button');
    btn.className = 'bili-sp-btn';
    btn.textContent = `×${s}`;
    btn.dataset.speed = s;
    btn.addEventListener('click', () => setSpeed(s));
    presetsWrap.appendChild(btn);
    return btn;
  });
  panel.appendChild(presetsWrap);

  // +/- 微调按钮（步长 0.25）
  const adjustWrap = document.createElement('div');
  adjustWrap.className = 'bili-sp-adjust';

  const minusBtn = document.createElement('button');
  minusBtn.className = 'bili-sp-adj-btn';
  minusBtn.textContent = '−';
  minusBtn.title = '减速 0.25x';
  minusBtn.addEventListener('click', () => {
    const v = getVideo();
    if (v) setSpeed(v.playbackRate - 0.25);
  });

  const plusBtn = document.createElement('button');
  plusBtn.className = 'bili-sp-adj-btn';
  plusBtn.textContent = '+';
  plusBtn.title = '加速 0.25x';
  plusBtn.addEventListener('click', () => {
    const v = getVideo();
    if (v) setSpeed(v.playbackRate + 0.25);
  });

  adjustWrap.appendChild(minusBtn);
  adjustWrap.appendChild(plusBtn);
  panel.appendChild(adjustWrap);

  document.body.appendChild(panel);

  function updatePanel(speed) {
    currentEl.textContent = `×${speed}`;
    presetBtns.forEach(btn => {
      btn.classList.toggle('active', parseFloat(btn.dataset.speed) === speed);
    });
  }

  // 恢复上次倍速
  function restoreSpeed() {
    const saved = parseFloat(localStorage.getItem(STORAGE_KEY));
    if (saved && saved !== 1.0) {
      const video = getVideo();
      if (video) {
        video.playbackRate = saved;
        showToast(`已恢复倍速 ×${saved}`);
        updatePanel(saved);
      }
    } else {
      updatePanel(1.0);
    }
  }

  // 监视 video 元素出现（B站是 SPA）
  const observer = new MutationObserver(() => {
    const video = getVideo();
    if (video && !video._biliSpeedPatched) {
      video._biliSpeedPatched = true;
      restoreSpeed();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(restoreSpeed, 2000);
})();