// ==UserScript==
// @name         Weibo HTML5 Video Tools
// @name:zh-CN   微博 HTML5 视频工具
// @namespace    skill-create
// @match        *://weibo.com/*
// @match        *://www.weibo.com/*
// @description  微博内 HTML5 视频：方向键与倍速快捷键、右下角「倍速」菜单、Alt+S 截图。使用方法：登录后打开含视频的博文，焦点离开输入框；←→ 快退/快进 5s，↑↓ 音量，>/. 加速、<, 减速，Alt+S 保存截图；也可点右下角「倍速」选预设倍率。
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = { speedStep: 0.25, seekStep: 5, volumeStep: 0.1 };

  const STYLE = `
    #wb-vt-toast {
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.75); color: #fff;
      padding: 6px 16px; border-radius: 6px;
      font-size: 14px; z-index: 999999;
      pointer-events: none; opacity: 0; transition: opacity 0.3s;
    }
    #wb-speed-menu {
      position: fixed; bottom: 100px; right: 20px;
      background: rgba(20,20,20,0.9); color: #fff;
      border-radius: 8px; padding: 8px;
      z-index: 999999; display: none; flex-direction: column; gap: 4px;
    }
    #wb-speed-menu button {
      background: #333; color: #fff; border: none; border-radius: 4px;
      padding: 4px 12px; cursor: pointer; font-size: 12px;
    }
    #wb-speed-menu button:hover { background: #555; }
    #wb-speed-toggle {
      position: fixed; bottom: 60px; right: 20px;
      background: #e6162d; color: #fff;
      border: none; border-radius: 6px;
      padding: 5px 10px; font-size: 12px;
      cursor: pointer; z-index: 999999;
    }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.id = 'wb-vt-toast';
  document.body.appendChild(toast);

  let toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 1200);
  }

  function getVideo() {
    const videos = Array.from(document.querySelectorAll('video'));
    if (!videos.length) return null;
    return videos.reduce((best, v) => {
      const a = v.getBoundingClientRect();
      const b = best.getBoundingClientRect();
      return a.width * a.height > b.width * b.height ? v : best;
    });
  }

  function screenshot(video) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const a = document.createElement('a');
    a.download = `weibo_${Date.now()}.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    showToast('截图已保存');
  }

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const video = getVideo();
    if (!video) return;

    switch (e.key) {
      case 'ArrowRight':
        video.currentTime = Math.min(video.duration, video.currentTime + CONFIG.seekStep);
        showToast(`快进 → ${Math.floor(video.currentTime)}s`);
        break;
      case 'ArrowLeft':
        video.currentTime = Math.max(0, video.currentTime - CONFIG.seekStep);
        showToast(`快退 ← ${Math.floor(video.currentTime)}s`);
        break;
      case 'ArrowUp':
        video.volume = Math.min(1, +(video.volume + CONFIG.volumeStep).toFixed(1));
        showToast(`音量 ${Math.round(video.volume * 100)}%`);
        break;
      case 'ArrowDown':
        video.volume = Math.max(0, +(video.volume - CONFIG.volumeStep).toFixed(1));
        showToast(`音量 ${Math.round(video.volume * 100)}%`);
        break;
      case '>': case '.':
        video.playbackRate = Math.min(16, +(video.playbackRate + CONFIG.speedStep).toFixed(2));
        showToast(`倍速 ×${video.playbackRate}`);
        break;
      case '<': case ',':
        video.playbackRate = Math.max(0.25, +(video.playbackRate - CONFIG.speedStep).toFixed(2));
        showToast(`倍速 ×${video.playbackRate}`);
        break;
      case 's': case 'S':
        if (e.altKey) { e.preventDefault(); screenshot(video); }
        break;
    }
  }, true);

  // 倍速面板
  const toggle = document.createElement('button');
  toggle.id = 'wb-speed-toggle';
  toggle.textContent = '倍速';
  document.body.appendChild(toggle);

  const menu = document.createElement('div');
  menu.id = 'wb-speed-menu';
  [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].forEach(s => {
    const btn = document.createElement('button');
    btn.textContent = `×${s}`;
    btn.addEventListener('click', () => {
      const v = getVideo();
      if (v) { v.playbackRate = s; showToast(`倍速 ×${s}`); }
      menu.style.display = 'none';
      toggle.style.display = '';
    });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);

  toggle.addEventListener('click', () => {
    menu.style.display = 'flex';
    toggle.style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    if (e.target !== toggle && !menu.contains(e.target)) {
      menu.style.display = 'none';
      toggle.style.display = '';
    }
  });

  // 等视频出现再显示控件
  const obs = new MutationObserver(() => {
    const hasVideo = !!document.querySelector('video');
    toggle.style.display = hasVideo ? '' : 'none';
  });
  obs.observe(document.body, { childList: true, subtree: true });
  toggle.style.display = 'none';
})();