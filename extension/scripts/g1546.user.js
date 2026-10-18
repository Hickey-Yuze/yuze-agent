// ==UserScript==
// @name         iQiyi VIP Parser
// @name:zh-CN   爱奇艺 VIP 解析
// @namespace    skill-create
// @match        *://www.iqiyi.com/*
// @match        *://iqiyi.com/*
// @description  爱奇艺 VIP 视频解析：检测到视频页时右下角显示「🔓 VIP 解析」悬浮面板，列出多个免费解析接口，点击在新标签打开解析结果。
// ==/UserScript==

(function () {
  'use strict';

  const PARSE_APIS = [
    { label: '接口 1 · 虾米',       url: 'https://jx.xmflv.com/?url=' },
    { label: '接口 2 · 虾米备用',    url: 'https://jx.xmflv.cc/?url=' },
    { label: '接口 3 · AiDouer',    url: 'https://jx.aidouer.net/?url=' },
  ];

  const STYLE = `
    #iqy-vip-toggle {
      position: fixed; bottom: 56px; right: 16px;
      background: rgba(20,20,20,0.85); color: #fff;
      border: none; border-radius: 8px;
      padding: 6px 12px; font-size: 13px;
      cursor: pointer; z-index: 2147483647;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      display: none;
    }
    #iqy-vip-toggle:hover { background: rgba(40,40,40,0.95); }
    #iqy-vip-panel {
      position: fixed; bottom: 96px; right: 16px;
      background: rgba(18,18,18,0.96); color: #fff;
      border-radius: 10px; padding: 10px;
      z-index: 2147483647; display: none; flex-direction: column; gap: 6px;
      min-width: 200px; font-family: sans-serif; font-size: 13px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
    }
    #iqy-vip-panel .iqy-vip-label {
      font-size: 11px; color: #888; margin-bottom: 2px;
    }
    #iqy-vip-panel .iqy-vip-api-btn {
      background: #2a2a2a; color: #fff; border: 1px solid #444;
      border-radius: 5px; padding: 6px 10px; font-size: 12px;
      cursor: pointer; text-align: left; width: 100%;
    }
    #iqy-vip-panel .iqy-vip-api-btn:hover { background: #444; border-color: #999; }
    #iqy-vip-panel .iqy-vip-url {
      font-size: 10px; color: #666; word-break: break-all;
      padding: 0 2px; margin-top: -2px;
    }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = STYLE;
  document.head.appendChild(styleEl);

  // ── 浮窗 toggle 按钮 ───────────────────────────────────────────────────────
  const toggle = document.createElement('button');
  toggle.id = 'iqy-vip-toggle';
  toggle.textContent = '🔓 VIP 解析';
  document.body.appendChild(toggle);

  // ── 面板 ───────────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'iqy-vip-panel';

  const label = document.createElement('div');
  label.className = 'iqy-vip-label';
  label.textContent = '选择解析接口';
  panel.appendChild(label);

  PARSE_APIS.forEach(({ label: name, url }) => {
    const btn = document.createElement('button');
    btn.className = 'iqy-vip-api-btn';
    btn.textContent = name;
    btn.addEventListener('click', () => {
      window.open(url + encodeURIComponent(location.href), '_blank');
      panel.style.display = 'none';
    });
    panel.appendChild(btn);
  });

  // 当前页面 URL 提示
  const urlHint = document.createElement('div');
  urlHint.className = 'iqy-vip-url';
  urlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
  panel.appendChild(urlHint);

  document.body.appendChild(panel);

  // ── 交互 ───────────────────────────────────────────────────────────────────
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    // 每次展开时刷新 URL 提示
    urlHint.textContent = location.href.slice(0, 60) + (location.href.length > 60 ? '…' : '');
    panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
  });
  document.addEventListener('click', (e) => {
    if (e.target !== toggle && !panel.contains(e.target)) panel.style.display = 'none';
  });

  // ── 显示条件：视频页才出现 ─────────────────────────────────────────────────
  function isVideoPage() {
    const vipIndicators = [
      '.iqy-vip-tips', '[class*="vip-lock"]', '[class*="vipLock"]',
      '[class*="vip_lock"]', '.vip-paywall', '[class*="paywall"]',
    ];
    const onVideoPath = /iqiyi\.com\/v_/.test(location.href);
    const hasVipEl = vipIndicators.some(s => document.querySelector(s));
    return onVideoPath || hasVipEl;
  }

  function updateVisibility() {
    toggle.style.display = isVideoPage() ? 'block' : 'none';
  }

  const obs = new MutationObserver(updateVisibility);
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(updateVisibility, 1500);
})();