// ==UserScript==
// @name         UTags - Add Usertags to Links
// @name:zh-CN   UTags 链接备注标签
// @namespace    skill-create
// @match        *://*/*
// @description  为页面上 http(s) 外链追加标签，数据存 localStorage，悬停链接可显示标签文案。使用方法：每个外链右侧会出现「+」或「🏷」按钮，点击后在弹窗中输入/修改标签并确定；已加标签的链接带虚线描边。清除站点数据会丢失备注。
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'utags_data';
  const TOOLTIP_CLASS = 'utags-tooltip';
  const TAG_BTN_CLASS = 'utags-tag-btn';

  // ── 数据层 ────────────────────────────────────────────────────────────────
  function loadTags() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
  }
  function saveTags(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function getTag(url) { return loadTags()[url] || ''; }
  function setTag(url, tag) {
    const data = loadTags();
    if (tag) data[url] = tag; else delete data[url];
    saveTags(data);
  }

  // ── UI 层 ─────────────────────────────────────────────────────────────────
  const STYLE = `
    .${TOOLTIP_CLASS} {
      position: absolute; bottom: calc(100% + 4px); left: 0;
      background: #333; color: #fff; padding: 3px 7px;
      border-radius: 4px; font-size: 11px; white-space: nowrap;
      pointer-events: none; z-index: 99999;
    }
    .${TAG_BTN_CLASS} {
      display: inline-block; margin-left: 3px;
      font-size: 10px; padding: 1px 5px;
      background: #f0f0f0; border: 1px solid #ccc;
      border-radius: 10px; cursor: pointer;
      vertical-align: middle; color: #333;
      font-family: inherit;
    }
    .${TAG_BTN_CLASS}:hover { background: #e0e0e0; }
    .utags-labeled { outline: 1px dashed #f90 !important; }
  `;

  function injectStyle() {
    if (document.getElementById('utags-style')) return;
    const s = document.createElement('style');
    s.id = 'utags-style';
    s.textContent = STYLE;
    document.head.appendChild(s);
  }

  function showTooltip(anchor, tag) {
    let tip = anchor.querySelector('.' + TOOLTIP_CLASS);
    if (!tip) {
      tip = document.createElement('span');
      tip.className = TOOLTIP_CLASS;
      anchor.style.position = 'relative';
      anchor.appendChild(tip);
    }
    tip.textContent = tag;
  }
  function removeTooltip(anchor) {
    anchor.querySelector('.' + TOOLTIP_CLASS)?.remove();
  }

  function addTagButton(anchor) {
    if (anchor.dataset.utagsDone) return;
    anchor.dataset.utagsDone = '1';

    const url = anchor.href;
    const existingTag = getTag(url);

    // 如已有标签，显示标记
    if (existingTag) {
      anchor.classList.add('utags-labeled');
      anchor.addEventListener('mouseenter', () => showTooltip(anchor, existingTag));
      anchor.addEventListener('mouseleave', () => removeTooltip(anchor));
    }

    // 添加小标签按钮（右键点击）
    const btn = document.createElement('span');
    btn.className = TAG_BTN_CLASS;
    btn.textContent = existingTag ? '🏷' : '+';
    btn.title = existingTag ? `标签: ${existingTag}（点击修改）` : '添加标签';
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = getTag(url);
      const newTag = prompt(`为链接设置标签：\n${url}`, current);
      if (newTag === null) return;
      setTag(url, newTag.trim());
      btn.textContent = newTag.trim() ? '🏷' : '+';
      if (newTag.trim()) {
        anchor.classList.add('utags-labeled');
      } else {
        anchor.classList.remove('utags-labeled');
      }
    });
    anchor.insertAdjacentElement('afterend', btn);
  }

  function processLinks() {
    document.querySelectorAll('a[href^="http"]:not([data-utags-done])').forEach(a => {
      addTagButton(a);
    });
  }

  injectStyle();
  processLinks();

  const observer = new MutationObserver(() => processLinks());
  observer.observe(document.body, { childList: true, subtree: true });
})();
