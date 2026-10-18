// ==UserScript==
// @name         Notion Font Customizer
// @name:zh-CN   Notion 字体自定义
// @namespace    skill-create
// @match        *://www.notion.so/*
// @match        *://notion.so/*
// @description  自定义 Notion 正文字体族、字号、行高，设置保存在 localStorage。使用方法：页面加载约 1.5s 后右上角出现「Aa」按钮，点击展开面板，选好字体与数值后点「应用」；仅影响本机浏览器，不同工作区页面共用同一套配置。
// ==/UserScript==

(function () {
  'use strict';

  const STORAGE_KEY = 'notion_font_config';

  const DEFAULT_CONFIG = {
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
    fontSize: '16px',
    lineHeight: '1.75',
    fontWeight: '400',
  };

  function loadConfig() {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; }
    catch { return DEFAULT_CONFIG; }
  }
  function saveConfig(cfg) { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); }

  function applyFont(cfg) {
    let styleEl = document.getElementById('notion-font-custom');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'notion-font-custom';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      .notion-page-content,
      .notion-text-block,
      div[contenteditable="true"],
      [data-block-id] {
        font-family: ${cfg.fontFamily} !important;
        font-size: ${cfg.fontSize} !important;
        line-height: ${cfg.lineHeight} !important;
        font-weight: ${cfg.fontWeight} !important;
      }
    `;
  }

  // ── 控制面板 ──────────────────────────────────────────────────────────────
  const PANEL_STYLE = `
    #notion-font-panel {
      position: fixed; top: 70px; right: 16px;
      background: #fff; border: 1px solid #e0e0e0;
      border-radius: 10px; padding: 14px 16px;
      z-index: 99999; min-width: 260px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      font-family: sans-serif; font-size: 13px;
      display: none; flex-direction: column; gap: 10px;
    }
    #notion-font-panel label { display: flex; flex-direction: column; gap: 3px; color: #333; }
    #notion-font-panel select, #notion-font-panel input {
      padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px;
      font-size: 13px;
    }
    #notion-font-panel-toggle {
      position: fixed; top: 70px; right: 16px;
      background: #000; color: #fff;
      border: none; border-radius: 6px;
      padding: 6px 12px; font-size: 12px;
      cursor: pointer; z-index: 100000;
    }
    #notion-font-apply {
      padding: 6px; background: #000; color: #fff;
      border: none; border-radius: 6px; cursor: pointer; font-size: 13px;
    }
  `;

  function createPanel() {
    if (document.getElementById('notion-font-panel')) return;

    const s = document.createElement('style');
    s.textContent = PANEL_STYLE;
    document.head.appendChild(s);

    const cfg = loadConfig();

    // 切换按钮
    const toggle = document.createElement('button');
    toggle.id = 'notion-font-panel-toggle';
    toggle.textContent = 'Aa';
    toggle.title = '字体设置';
    document.body.appendChild(toggle);

    // 面板
    const panel = document.createElement('div');
    panel.id = 'notion-font-panel';
    panel.innerHTML = `
      <strong style="font-size:14px">字体自定义</strong>
      <label>字体族
        <select id="nfc-family">
          <option value="ui-sans-serif, system-ui, sans-serif">系统无衬线</option>
          <option value="Georgia, 'Times New Roman', serif">衬线（Georgia）</option>
          <option value="'JetBrains Mono', 'Fira Code', monospace">等宽（代码）</option>
          <option value="'Noto Serif SC', STSong, serif">思源宋体</option>
        </select>
      </label>
      <label>字号
        <input id="nfc-size" type="text" value="${cfg.fontSize}" placeholder="16px" />
      </label>
      <label>行高
        <input id="nfc-lh" type="text" value="${cfg.lineHeight}" placeholder="1.75" />
      </label>
      <button id="notion-font-apply">应用</button>
    `;
    document.body.appendChild(panel);

    toggle.addEventListener('click', () => {
      panel.style.display = panel.style.display === 'flex' ? 'none' : 'flex';
      toggle.style.display = panel.style.display === 'flex' ? 'none' : '';
    });

    document.getElementById('notion-font-apply').addEventListener('click', () => {
      const newCfg = {
        fontFamily: document.getElementById('nfc-family').value,
        fontSize: document.getElementById('nfc-size').value,
        lineHeight: document.getElementById('nfc-lh').value,
        fontWeight: cfg.fontWeight,
      };
      saveConfig(newCfg);
      applyFont(newCfg);
      panel.style.display = 'none';
      toggle.style.display = '';
    });
  }

  function init() {
    const cfg = loadConfig();
    applyFont(cfg);
    createPanel();
  }

  setTimeout(init, 1500);
})();
