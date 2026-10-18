// ==UserScript==
// @name         Youku VIP Parser
// @name:zh-CN   优酷 VIP 解析
// @namespace    skill-create
// @match        *://v.youku.com/*
// @match        *://youku.com/*
// @match        *://www.youku.com/*
// @description  优酷 VIP 视频解析：检测到视频页时右下角显示「🔓 VIP 解析」悬浮面板，列出多个免费解析接口，点击在新标签打开解析结果。
// ==/UserScript==

(function () {
  'use strict';

  const PARSE_APIS = [
    { label: '接口 1 · 虾米',    url: 'https://jx.xmflv.com/?url=' },
    { label: '接口 2 · 虾米备用', url: 'https://jx.xmflv.cc/?url=' },
    { label: '接口 3 · AiDouer', url: 'https://jx.aidouer.net/?url=' },
  ];

  const STYLE = `
    #youku-vip-toggle {
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
    #youku-vip-toggle:hover { background: rgba(40,40,40,0.95) !important; }
    #youku-vip-panel {
      position: fixed !important; bottom: 96px !important; right: 16px !important;
      top: auto !important; left: auto !important; transform: none !important;
      height: auto !important; min-height: 0 !important; width: auto !important;
      background: rgba(18,18,18,0.96) !important; color: #fff !important;
      border-radius: 10px !important; padding: 10px !important;
      z-index: 2147483647 !important; display: none; flex-direction: column; gap: 6px;
      min-width: 200px; font-family: sans-serif; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5) !important;
    }
    #youku-vip-panel .youku-vip-label {
      font-size: 11px; color: #888; margin-bottom: 2px;
    }
    #youku-vip-panel .youku-vip-api-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 6px 10px; font-size: 12px;
      cursor: pointer; text-align: left; width: 100%;
    }
    #youku-vip-panel .youku-vip-api-btn:hover { background: #444; border-color: #999; }
    #youku-vip-panel .youku-vip-url {
      font-size: 10px; color: #666; word-break: break-all;
      padding: 0 2px; margin-top: -2px;
    }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const toggle = document.createElement('button');
  toggle.id = 'youku-vip-toggle';
  toggle.textContent = '🔓 VIP 解析';
  document.body.appendChild(toggle);

  const panel = document.createElement('div');
  panel.id = 'youku-vip-panel';

  const label = document.createElement('div');
  label.className = 'youku-vip-label';
  label.textContent = '选择解析接口';
  panel.appendChild(label);

  PARSE_APIS.forEach(({ label: name, url }) => {
    const b = document.createElement('button');
    b.className = 'youku-vip-api-btn';
    b.textContent = name;
    b.addEventListener('click', () => {
      window.open(url + encodeURIComponent(location.href), '_blank');
      panel.style.display = 'none';
    });
    panel.appendChild(b);
  });

  const urlHint = document.createElement('div');
  urlHint.className = 'youku-vip-url';
  urlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
  panel.appendChild(urlHint);

  document.body.appendChild(panel);

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    urlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  });
  document.addEventListener('click', (e) => {
    if (e.target !== toggle && !panel.contains(e.target)) panel.style.display = 'none';
  });

  function detectVip() {
    const isVideoPage = /\/(v_|show\/id_)/.test(location.pathname) ||
      location.href.includes('youku.com/v_show');
    const vipEls = document.querySelectorAll('[class*="vip"],[class*="Vip"],[class*="member"]');
    return isVideoPage || vipEls.length > 0;
  }

  const obs = new MutationObserver(() => {
    toggle.style.display = detectVip() ? 'block' : 'none';
  });
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { toggle.style.display = detectVip() ? 'block' : 'none'; }, 1500);
})();