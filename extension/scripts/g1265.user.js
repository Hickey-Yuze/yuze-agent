// ==UserScript==
// @name         iQiyi HTML5 Video Tools
// @name:zh-CN   爱奇艺视频增强工具
// @namespace    skill-create
// @match        *://www.iqiyi.com/*
// @match        *://iqiyi.com/*
// @description  爱奇艺 HTML5 视频增强：右下角悬浮面板提供倍速预设、快进/快退、音量、画中画、截图。键盘快捷键同样可用：←→ 快退/快进，↑↓ 音量，>/. 加速，<, 减速，Alt+P 画中画，Alt+S 截图。
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = { speedStep: 0.25, seekStep: 5, volumeStep: 0.1 };

  const STYLE = `
    #iqy-vt-toast {
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.78); color: #fff;
      padding: 7px 18px; border-radius: 6px;
      font-size: 15px; z-index: 2147483646;
      pointer-events: none; opacity: 0; transition: opacity 0.3s;
    }
    #iqy-vt-toggle {
      position: fixed; bottom: 16px; right: 16px;
      background: rgba(20,20,20,0.85); color: #fff;
      border: none; border-radius: 8px;
      padding: 6px 12px; font-size: 13px;
      cursor: pointer; z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: none;
    }
    #iqy-vt-toggle:hover { background: rgba(40,40,40,0.95); }
    #iqy-vt-panel {
      position: fixed; bottom: 52px; right: 16px;
      background: rgba(18,18,18,0.96); color: #fff;
      border-radius: 10px; padding: 10px;
      z-index: 2147483647; display: none; flex-direction: column; gap: 6px;
      min-width: 180px; font-family: sans-serif; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    #iqy-vt-panel .iqy-label {
      font-size: 11px; color: #888; margin-bottom: 2px;
    }
    #iqy-vt-panel .iqy-speeds {
      display: flex; flex-wrap: wrap; gap: 4px;
    }
    #iqy-vt-panel .iqy-speed-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 3px 0; font-size: 12px;
      cursor: pointer; width: 40px; text-align: center;
    }
    #iqy-vt-panel .iqy-speed-btn:hover,
    #iqy-vt-panel .iqy-speed-btn.active { background: #555; border-color: #999; }
    #iqy-vt-panel .iqy-row {
      display: flex; gap: 4px;
    }
    #iqy-vt-panel .iqy-btn {
      flex: 1; background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 5px 4px; font-size: 12px;
      cursor: pointer; text-align: center;
    }
    #iqy-vt-panel .iqy-btn:hover { background: #444; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const toastEl = document.createElement('div');
  toastEl.id = 'iqy-vt-toast';
  document.body.appendChild(toastEl);
  let toastTimer = null;

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.style.opacity = '0'; }, 1400);
  }

  function getVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;
    return videos.reduce((best, v) => {
      const r = v.getBoundingClientRect(), br = best.getBoundingClientRect();
      return r.width * r.height > br.width * br.height ? v : best;
    });
  }

  function screenshot(video) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const a = document.createElement('a');
    a.download = `iqiyi_${Date.now()}.png`;
    a.href = c.toDataURL('image/png'); a.click();
    toast('截图已保存');
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── 键盘快捷键 ─────────────────────────────────────────────────────────────
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const video = getVideo();
    if (!video) return;
    switch (e.key) {
      case 'ArrowRight': video.currentTime = Math.min(video.duration, video.currentTime + CONFIG.seekStep); toast(`快进 → ${formatTime(video.currentTime)}`); break;
      case 'ArrowLeft':  video.currentTime = Math.max(0, video.currentTime - CONFIG.seekStep); toast(`快退 ← ${formatTime(video.currentTime)}`); break;
      case 'ArrowUp':    video.volume = Math.min(1, +(video.volume + CONFIG.volumeStep).toFixed(1)); toast(`音量 ${Math.round(video.volume * 100)}%`); break;
      case 'ArrowDown':  video.volume = Math.max(0, +(video.volume - CONFIG.volumeStep).toFixed(1)); toast(`音量 ${Math.round(video.volume * 100)}%`); break;
      case '>': case '.': video.playbackRate = Math.min(16, +(video.playbackRate + CONFIG.speedStep).toFixed(2)); toast(`倍速 ×${video.playbackRate}`); break;
      case '<': case ',': video.playbackRate = Math.max(0.25, +(video.playbackRate - CONFIG.speedStep).toFixed(2)); toast(`倍速 ×${video.playbackRate}`); break;
      case 'p': case 'P':
        if (e.altKey) { e.preventDefault(); document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture?.(); toast('画中画切换'); }
        break;
      case 's': case 'S':
        if (e.altKey) { e.preventDefault(); screenshot(video); }
        break;
    }
  }, true);

  // ── 悬浮面板 ───────────────────────────────────────────────────────────────
  const toggle = document.createElement('button');
  toggle.id = 'iqy-vt-toggle';
  toggle.textContent = '▶ 视频工具';
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.id = 'iqy-vt-panel';

  // 倍速预设
  const speedLabel = document.createElement('div');
  speedLabel.className = 'iqy-label';
  speedLabel.textContent = '倍速';
  panel.appendChild(speedLabel);

  const speedsWrap = document.createElement('div');
  speedsWrap.className = 'iqy-speeds';
  [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].forEach(s => {
    const btn = document.createElement('button');
    btn.className = 'iqy-speed-btn';
    btn.textContent = `×${s}`;
    btn.addEventListener('click', () => {
      const v = getVideo(); if (!v) return;
      v.playbackRate = s; toast(`倍速 ×${s}`);
      speedsWrap.querySelectorAll('.iqy-speed-btn').forEach(b => b.classList.toggle('active', b.textContent === `×${s}`));
    });
    speedsWrap.appendChild(btn);
  });
  panel.appendChild(speedsWrap);

  // 快进/快退 & 音量行
  const seekLabel = document.createElement('div');
  seekLabel.className = 'iqy-label';
  seekLabel.textContent = '跳转 / 音量';
  panel.appendChild(seekLabel);

  const seekRow = document.createElement('div');
  seekRow.className = 'iqy-row';
  [['⏪ -5s', () => { const v = getVideo(); if (v) { v.currentTime = Math.max(0, v.currentTime - 5); toast(`← ${formatTime(v.currentTime)}`); } }],
   ['⏩ +5s', () => { const v = getVideo(); if (v) { v.currentTime = Math.min(v.duration, v.currentTime + 5); toast(`→ ${formatTime(v.currentTime)}`); } }],
   ['🔉 -',   () => { const v = getVideo(); if (v) { v.volume = Math.max(0, +(v.volume - 0.1).toFixed(1)); toast(`音量 ${Math.round(v.volume*100)}%`); } }],
   ['🔊 +',   () => { const v = getVideo(); if (v) { v.volume = Math.min(1, +(v.volume + 0.1).toFixed(1)); toast(`音量 ${Math.round(v.volume*100)}%`); } }],
  ].forEach(([label, fn]) => {
    const btn = document.createElement('button');
    btn.className = 'iqy-btn';
    btn.textContent = label;
    btn.addEventListener('click', fn);
    seekRow.appendChild(btn);
  });
  panel.appendChild(seekRow);

  // 功能行
  const funcRow = document.createElement('div');
  funcRow.className = 'iqy-row';
  [['⧉ 画中画', () => { const v = getVideo(); if (!v) return; document.pictureInPictureElement ? document.exitPictureInPicture() : v.requestPictureInPicture?.(); toast('画中画'); }],
   ['📷 截图',  () => { const v = getVideo(); if (v) screenshot(v); }],
  ].forEach(([label, fn]) => {
    const btn = document.createElement('button');
    btn.className = 'iqy-btn';
    btn.textContent = label;
    btn.addEventListener('click', fn);
    funcRow.appendChild(btn);
  });
  panel.appendChild(funcRow);

  document.body.appendChild(panel);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  });
  document.addEventListener('click', (e) => {
    if (e.target !== toggle && !panel.contains(e.target)) panel.style.display = 'none';
  });

  // 有 video 时才显示按钮
  function updateToggleVisibility() {
    toggle.style.display = !!document.querySelector('video') ? 'block' : 'none';
  }
  const obs = new MutationObserver(updateToggleVisibility);
  obs.observe(document.body, { childList: true, subtree: true });
  updateToggleVisibility();
})();