// ==UserScript==
// @name         Bilibili Open Search
// @name:zh-CN   哔哩哔哩划词搜索
// @namespace    skill-create
// @match        *://www.bilibili.com/*
// @match        *://bilibili.com/*
// @description  Bilibili 划词搜索：选中文字后弹出搜索按钮，点击在 B 站搜索。使用方法：在 bilibili.com 任意页面用鼠标选中一段文字，稍等会出现「🔍 B站搜索」浮动按钮，点击即可在新标签打开 B 站全站搜索；未选词或点击页面其他区域后按钮会隐藏。
// ==/UserScript==

(function () {
  'use strict';

  const STYLE = `
    #bili-opensearch-btn {
      position: fixed;
      background: #00aeec; color: #fff;
      border: none; border-radius: 4px;
      padding: 4px 10px; font-size: 12px;
      cursor: pointer; z-index: 999999;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      display: none;
      white-space: nowrap;
    }
    #bili-opensearch-btn:hover { background: #0099cc; }
  `;

  const style = document.createElement('style');
  style.textContent = STYLE;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'bili-opensearch-btn';
  btn.textContent = '🔍 B站搜索';
  document.body.appendChild(btn);

  let hideTimer = null;

  document.addEventListener('mouseup', (e) => {
    if (e.target === btn) return;
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (!text || text.length < 1) {
      btn.style.display = 'none';
      return;
    }

    btn.style.display = 'block';
    btn.style.left = `${Math.min(e.clientX + 8, window.innerWidth - 130)}px`;
    btn.style.top = `${e.clientY - 36}px`;

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { btn.style.display = 'none'; }, 4000);
  });

  btn.addEventListener('click', () => {
    const text = window.getSelection()?.toString().trim();
    if (text) {
      const url = `https://search.bilibili.com/all?keyword=${encodeURIComponent(text)}`;
      window.open(url, '_blank');
    }
    btn.style.display = 'none';
  });

  document.addEventListener('mousedown', (e) => {
    if (e.target !== btn) btn.style.display = 'none';
  });
})();