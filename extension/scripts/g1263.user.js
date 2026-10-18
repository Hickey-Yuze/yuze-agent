// ==UserScript==
// @name         Tencent Video HTML5 Tools + VIP Parser
// @name:zh-CN   腾讯视频增强工具 + VIP 解析
// @namespace    skill-create
// @match        *://v.qq.com/*
// @match        *://film.qq.com/*
// @description  腾讯视频 HTML5 增强：键盘快捷键（快进/快退/音量/倍速/画中画/截图）+ VIP 解析浮窗。使用方法：打开视频页，焦点离开输入框后使用快捷键；VIP 视频时右下角出现「🔓 VIP 解析」悬浮按钮，点击展开接口面板选择解析。
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = { speedStep: 0.25, seekStep: 5, volumeStep: 0.1 };

  const PARSE_APIS = [
    { label: '接口 1 · 虾米',    url: 'https://jx.xmflv.com/?url=' },
    { label: '接口 2 · 虾米备用', url: 'https://jx.xmflv.cc/?url=' },
    { label: '接口 3 · AiDouer', url: 'https://jx.aidouer.net/?url=' },
  ];

  const STYLE = `
    #vqq-vt-toast {
      position: fixed; bottom: 60px; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.78); color: #fff;
      padding: 6px 18px; border-radius: 6px;
      font-size: 15px; z-index: 999999;
      pointer-events: none; opacity: 0; transition: opacity 0.3s;
    }
    #vqq-speed-toggle {
      position: fixed; bottom: 60px; right: 20px;
      background: #e8321c; color: #fff;
      border: none; border-radius: 6px;
      padding: 5px 10px; font-size: 12px;
      cursor: pointer; z-index: 999999; display: none;
    }
    #vqq-speed-menu {
      position: fixed; bottom: 100px; right: 20px;
      background: rgba(20,20,20,0.92); color: #fff;
      border-radius: 8px; padding: 8px;
      z-index: 999999; display: none; flex-direction: column; gap: 4px;
    }
    #vqq-speed-menu button {
      background: #333; color: #fff; border: none; border-radius: 4px;
      padding: 4px 10px; cursor: pointer; font-size: 12px;
    }
    #vqq-speed-menu button:hover { background: #555; }
    #vqq-vip-btn {
      position: fixed !important; bottom: 56px !important; right: 16px !important;
      top: auto !important; left: auto !important; transform: none !important;
      height: auto !important; min-height: 0 !important; width: auto !important;
      line-height: normal !important;
      background: rgba(20,20,20,0.85) !important; color: #fff !important;
      border: none !important; border-radius: 8px !important;
      padding: 6px 12px !important; font-size: 13px !important;
      cursor: pointer !important; z-index: 2147483647 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
      display: none;
    }
    #vqq-vip-btn:hover { background: rgba(40,40,40,0.95) !important; }
    #vqq-vip-menu {
      position: fixed !important; bottom: 96px !important; right: 16px !important;
      top: auto !important; left: auto !important; transform: none !important;
      height: auto !important; min-height: 0 !important; width: auto !important;
      background: rgba(18,18,18,0.96) !important; color: #fff !important;
      border-radius: 10px !important; padding: 10px !important;
      z-index: 2147483647 !important; display: none; flex-direction: column; gap: 6px;
      min-width: 200px; font-family: sans-serif; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
    }
    #vqq-vip-menu .vqq-vip-label {
      font-size: 11px; color: #888; margin-bottom: 2px;
    }
    #vqq-vip-menu .vqq-vip-api-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 6px 10px; font-size: 12px;
      cursor: pointer; text-align: left; width: 100%;
    }
    #vqq-vip-menu .vqq-vip-api-btn:hover { background: #444; border-color: #999; }
    #vqq-vip-menu .vqq-vip-url {
      font-size: 10px; color: #666; word-break: break-all;
      padding: 0 2px; margin-top: -2px;
    }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.id = 'vqq-vt-toast';
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
    return videos.reduce((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.width * ra.height >= rb.width * rb.height ? a : b;
    });
  }

  function screenshot(video) {
    const c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    const a = document.createElement('a');
    a.download = `tencentvideo_${Date.now()}.png`;
    a.href = c.toDataURL('image/png'); a.click();
    showToast('截图已保存');
  }

  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
    const video = getVideo();
    if (!video) return;
    switch (e.key) {
      case 'ArrowRight': video.currentTime = Math.min(video.duration, video.currentTime + CONFIG.seekStep); showToast(`快进 → ${Math.floor(video.currentTime)}s`); break;
      case 'ArrowLeft': video.currentTime = Math.max(0, video.currentTime - CONFIG.seekStep); showToast(`快退 ← ${Math.floor(video.currentTime)}s`); break;
      case 'ArrowUp': video.volume = Math.min(1, +(video.volume + CONFIG.volumeStep).toFixed(1)); showToast(`音量 ${Math.round(video.volume * 100)}%`); break;
      case 'ArrowDown': video.volume = Math.max(0, +(video.volume - CONFIG.volumeStep).toFixed(1)); showToast(`音量 ${Math.round(video.volume * 100)}%`); break;
      case '>': case '.': video.playbackRate = Math.min(16, +(video.playbackRate + CONFIG.speedStep).toFixed(2)); showToast(`倍速 ×${video.playbackRate}`); break;
      case '<': case ',': video.playbackRate = Math.max(0.25, +(video.playbackRate - CONFIG.speedStep).toFixed(2)); showToast(`倍速 ×${video.playbackRate}`); break;
      case 'p': case 'P':
        if (e.altKey) { e.preventDefault(); document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture?.(); showToast('画中画切换'); } break;
      case 's': case 'S':
        if (e.altKey) { e.preventDefault(); screenshot(video); } break;
    }
  }, true);

  // 倍速菜单
  const toggle = document.createElement('button');
  toggle.id = 'vqq-speed-toggle';
  toggle.textContent = '倍速';
  document.body.appendChild(toggle);

  const speedMenu = document.createElement('div');
  speedMenu.id = 'vqq-speed-menu';
  [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].forEach(s => {
    const b = document.createElement('button');
    b.textContent = `×${s}`;
    b.addEventListener('click', () => {
      const v = getVideo(); if (v) { v.playbackRate = s; showToast(`倍速 ×${s}`); }
      speedMenu.style.display = 'none'; toggle.style.display = '';
    });
    speedMenu.appendChild(b);
  });
  document.body.appendChild(speedMenu);

  toggle.addEventListener('click', () => { speedMenu.style.display = 'flex'; toggle.style.display = 'none'; });
  document.addEventListener('click', (e) => {
    if (e.target !== toggle && !speedMenu.contains(e.target)) { speedMenu.style.display = 'none'; toggle.style.display = ''; }
  });

  // VIP 解析
  const vipBtn = document.createElement('button');
  vipBtn.id = 'vqq-vip-btn';
  vipBtn.textContent = '🔓 VIP 解析';
  document.body.appendChild(vipBtn);

  const vipMenu = document.createElement('div');
  vipMenu.id = 'vqq-vip-menu';

  const vipLabel = document.createElement('div');
  vipLabel.className = 'vqq-vip-label';
  vipLabel.textContent = '选择解析接口';
  vipMenu.appendChild(vipLabel);

  PARSE_APIS.forEach(({ label, url }) => {
    const b = document.createElement('button');
    b.className = 'vqq-vip-api-btn';
    b.textContent = label;
    b.addEventListener('click', () => {
      window.open(url + encodeURIComponent(location.href), '_blank');
      vipMenu.style.display = 'none';
    });
    vipMenu.appendChild(b);
  });

  const vipUrlHint = document.createElement('div');
  vipUrlHint.className = 'vqq-vip-url';
  vipUrlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
  vipMenu.appendChild(vipUrlHint);

  document.body.appendChild(vipMenu);

  vipBtn.addEventListener('click', () => {
    vipUrlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
    vipMenu.style.display = vipMenu.style.display === 'flex' ? 'none' : 'flex';
  });
  document.addEventListener('click', (e) => { if (e.target !== vipBtn && !vipMenu.contains(e.target)) vipMenu.style.display = 'none'; });

  const obs = new MutationObserver(() => {
    const hasVideo = !!document.querySelector('video');
    toggle.style.display = hasVideo ? '' : 'none';
    vipBtn.style.display = /\/x\/cover\/|\/x\/page\//.test(location.pathname) || hasVideo ? '' : 'none';
  });
  obs.observe(document.body, { childList: true, subtree: true });
  toggle.style.display = 'none';
  setTimeout(() => {
    vipBtn.style.display = !!document.querySelector('video') ? '' : 'none';
  }, 1500);
})();