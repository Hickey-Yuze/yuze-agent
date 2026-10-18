// ==UserScript==
// @name         Kuaishou Video Download
// @name:zh-CN   快手视频下载
// @namespace    skill-create
// @match        *://www.kuaishou.com/*
// @match        *://kuaishou.com/*
// @description  在视频页检测 HTML5 video 的 mp4 地址并显示悬浮下载按钮。使用方法：打开可播放的快手视频页，出现下载按钮后点击即可在新标签打开直链或触发浏览器下载；无视频元素或未返回有效 src 时按钮不会出现。
// ==/UserScript==

(function () {
  'use strict';

  const STYLE = `
    .ks-dl-btn {
      display: inline-block;
      margin-left: 8px;
      padding: 4px 12px;
      background: #fe2c55; color: #fff;
      border: none; border-radius: 4px;
      font-size: 12px; cursor: pointer;
      vertical-align: middle;
    }
    .ks-dl-btn:hover { background: #d9203e; }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  function getVideoSrc() {
    const video = document.querySelector('video');
    return video?.src || video?.currentSrc || null;
  }

  function injectButton(container) {
    if (container.querySelector('.ks-dl-btn')) return;
    const btn = document.createElement('button');
    btn.className = 'ks-dl-btn';
    btn.textContent = '下载视频';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const src = getVideoSrc();
      if (!src) {
        alert('未找到视频源，请等待视频加载完成后再试');
        return;
      }
      const a = document.createElement('a');
      a.href = src;
      a.download = `kuaishou_${Date.now()}.mp4`;
      a.target = '_blank';
      a.click();
    });
    container.appendChild(btn);
  }

  // 注入到操作栏
  function tryInject() {
    // 快手视频操作栏选择器
    const actionSelectors = [
      '.action-bar',
      '.video-info',
      '.photo-info',
      '[class*="videoInfo"]',
      '[class*="actionBar"]',
    ];
    for (const sel of actionSelectors) {
      const el = document.querySelector(sel);
      if (el) {
        injectButton(el);
        return;
      }
    }
    // fallback：悬浮按钮
    if (!document.getElementById('ks-dl-float')) {
      const video = document.querySelector('video');
      if (!video) return;
      const floatBtn = document.createElement('button');
      floatBtn.id = 'ks-dl-float';
      floatBtn.className = 'ks-dl-btn';
      floatBtn.style.cssText = 'position:fixed;bottom:80px;right:20px;z-index:99999;';
      floatBtn.textContent = '下载视频';
      floatBtn.addEventListener('click', () => {
        const src = getVideoSrc();
        if (!src) { alert('未找到视频源'); return; }
        const a = document.createElement('a');
        a.href = src; a.download = `kuaishou_${Date.now()}.mp4`; a.click();
      });
      document.body.appendChild(floatBtn);
    }
  }

  const obs = new MutationObserver(() => tryInject());
  obs.observe(document.body, { childList: true, subtree: true });
  setTimeout(tryInject, 2000);
})();