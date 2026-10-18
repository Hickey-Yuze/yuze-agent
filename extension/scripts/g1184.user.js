// ==UserScript==
// @name         哔哩哔哩高级视频小窗
// @namespace    https://github.com/bilibili-mini-player
// @version      2.5.0
// @description  哔哩哔哩高级视频小窗 - 支持弹幕、倍速、尺寸调节、位置记忆等高级功能
// @author       MiniPlayer
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/bangumi/*
// @match        *://player.bilibili.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.bilibili.com
// @run-at       document-idle
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ==================== 兼容层：GM_* API 回退到 localStorage ====================
  // Tampermonkey 沙箱可能未正确注入 GM_* 函数，此处提供健壮的回退方案

  function safeGM_getValue(key, defaultValue) {
    try {
      if (typeof GM_getValue === 'function') {
        const val = GM_getValue(key, undefined);
        if (val !== undefined) return val;
      }
    } catch (e) {
      // GM_getValue 不可用，回退到 localStorage
    }
    try {
      const raw = localStorage.getItem('__bmp__' + key);
      if (raw !== null) return JSON.parse(raw);
    } catch (e) {
      // localStorage 也不可用
    }
    return defaultValue;
  }

  function safeGM_setValue(key, value) {
    try {
      if (typeof GM_setValue === 'function') {
        GM_setValue(key, value);
        return;
      }
    } catch (e) {
      // 回退到 localStorage
    }
    try {
      localStorage.setItem('__bmp__' + key, JSON.stringify(value));
    } catch (e) {
      // 静默失败
    }
  }

  function safeGM_addStyle(css) {
    try {
      if (typeof GM_addStyle === 'function') {
        GM_addStyle(css);
        return;
      }
    } catch (e) {
      // 回退到 DOM API
    }
    const style = document.createElement('style');
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function safeGM_registerMenuCommand(name, fn) {
    try {
      if (typeof GM_registerMenuCommand === 'function') {
        GM_registerMenuCommand(name, fn);
        return;
      }
    } catch (e) {
      // 无 Tampermonkey 菜单可用，静默
    }
  }

  // ==================== 配置管理 ====================
  const CONFIG_KEY = 'bili_mini_player_config';
  const DEFAULT_CONFIG = {
    // 窗口
    width: 480,
    height: 270,
    minWidth: 280,
    minHeight: 158,
    posX: -1, // -1 表示右下角
    posY: -1,
    borderRadius: 12,
    shadow: '0 8px 32px rgba(0,0,0,0.45)',
    opacity: 1,
    alwaysOnTop: true,
    // 弹幕
    danmakuEnabled: true,
    danmakuOpacity: 0.7,
    danmakuSpeed: 6, // 秒
    danmakuFontSize: 16,
    danmakuMaxCount: 50,
    danmakuBlockKeywords: [],
    danmakuBlockType: [], // 1=滚动 4=底部 5=顶部 6=逆向 7=高级
    // 播放
    autoEnterMini: false,
    syncVolume: true,
    syncProgress: true,
    defaultPlaybackRate: 1,
    // 缩放
    lockAspectRatio: true,
  };

  class ConfigManager {
    constructor() {
      this.config = this.load();
    }

    load() {
      try {
        const saved = safeGM_getValue(CONFIG_KEY, null);
        if (saved) {
          return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        }
      } catch (e) {
        console.warn('[MiniPlayer] 配置加载失败，使用默认配置', e);
      }
      return { ...DEFAULT_CONFIG };
    }

    save() {
      try {
        safeGM_setValue(CONFIG_KEY, JSON.stringify(this.config));
      } catch (e) {
        console.warn('[MiniPlayer] 配置保存失败', e);
      }
    }

    get(key) {
      return this.config[key] ?? DEFAULT_CONFIG[key];
    }

    set(key, value) {
      this.config[key] = value;
      this.save();
    }

    getAll() {
      return { ...this.config };
    }

    reset() {
      this.config = { ...DEFAULT_CONFIG };
      this.save();
    }
  }

  const configManager = new ConfigManager();

  // ==================== 样式注入 ====================
  const STYLES = `
    /* 小窗容器 */
    #bili-mini-player {
      position: fixed;
      z-index: 2147483647;
      border-radius: var(--bmp-radius, 12px);
      box-shadow: var(--bmp-shadow, 0 8px 32px rgba(0,0,0,0.45));
      overflow: hidden;
      background: #000;
      opacity: var(--bmp-opacity, 1);
      transition: opacity 0.2s, box-shadow 0.3s;
      user-select: none;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    }
    #bili-mini-player:hover {
      box-shadow: var(--bmp-shadow-hover, 0 12px 40px rgba(0,0,0,0.55));
    }
    #bili-mini-player.bmp-minimized {
      width: 60px !important;
      height: 60px !important;
      border-radius: 50%;
      cursor: pointer;
    }

    /* 视频容器 */
    .bmp-video-wrap {
      position: relative;
      width: 100%;
      height: 100%;
      background: #000;
    }
    .bmp-video-wrap video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
    }

    /* 弹幕层 */
    .bmp-danmaku-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    }
    .bmp-danmaku-item {
      position: absolute;
      white-space: nowrap;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
      pointer-events: none;
      will-change: transform;
      font-weight: bold;
      line-height: 1.2;
    }

    /* 控制栏 */
    .bmp-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(transparent, rgba(0,0,0,0.85));
      padding: 20px 10px 8px;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;
    }
    #bili-mini-player:hover .bmp-controls {
      opacity: 1;
      pointer-events: auto;
    }

    /* 进度条 */
    .bmp-progress-wrap {
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      cursor: pointer;
      position: relative;
      margin-bottom: 6px;
    }
    .bmp-progress-wrap:hover {
      height: 6px;
    }
    .bmp-progress-buffered {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: rgba(255,255,255,0.3);
      border-radius: 2px;
      transition: width 0.3s;
    }
    .bmp-progress-played {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      background: #00a1d6;
      border-radius: 2px;
    }
    .bmp-progress-thumb {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 12px;
      background: #00a1d6;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      opacity: 0;
      transition: opacity 0.15s;
    }
    .bmp-progress-wrap:hover .bmp-progress-thumb {
      opacity: 1;
    }
    .bmp-progress-tooltip {
      position: absolute;
      bottom: 12px;
      background: rgba(0,0,0,0.8);
      color: #fff;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      transform: translateX(-50%);
      pointer-events: none;
      display: none;
    }
    .bmp-progress-wrap:hover .bmp-progress-tooltip {
      display: block;
    }

    /* 控制按钮行 */
    .bmp-btn-row {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #fff;
      font-size: 12px;
    }
    .bmp-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: #fff;
      cursor: pointer;
      border-radius: 4px;
      padding: 0;
      transition: background 0.15s;
    }
    .bmp-btn:hover {
      background: rgba(255,255,255,0.15);
    }
    .bmp-btn svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .bmp-time {
      font-size: 11px;
      color: rgba(255,255,255,0.85);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .bmp-spacer { flex: 1; }

    /* 音量滑块 */
    .bmp-volume-wrap {
      display: flex;
      align-items: center;
      gap: 4px;
      position: relative;
    }
    .bmp-volume-slider {
      width: 0;
      overflow: hidden;
      transition: width 0.2s;
      -webkit-appearance: none;
      appearance: none;
      height: 3px;
      background: rgba(255,255,255,0.3);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    }
    .bmp-volume-wrap:hover .bmp-volume-slider {
      width: 60px;
    }
    .bmp-volume-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
      background: #00a1d6;
      border-radius: 50%;
      cursor: pointer;
    }

    /* 倍速菜单 */
    .bmp-speed-menu {
      position: absolute;
      bottom: 100%;
      right: 0;
      background: rgba(0,0,0,0.9);
      border-radius: 6px;
      padding: 4px 0;
      display: none;
      margin-bottom: 8px;
      min-width: 80px;
    }
    .bmp-speed-menu.bmp-show {
      display: block;
    }
    .bmp-speed-option {
      display: block;
      width: 100%;
      padding: 6px 12px;
      border: none;
      background: transparent;
      color: rgba(255,255,255,0.8);
      font-size: 12px;
      cursor: pointer;
      text-align: center;
      transition: background 0.15s;
    }
    .bmp-speed-option:hover {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .bmp-speed-option.bmp-active {
      color: #00a1d6;
      font-weight: bold;
    }

    /* 标题栏 */
    .bmp-title-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(rgba(0,0,0,0.6), transparent);
      padding: 8px 10px 20px;
      opacity: 0;
      transition: opacity 0.25s;
      pointer-events: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #bili-mini-player:hover .bmp-title-bar {
      opacity: 1;
      pointer-events: auto;
    }
    .bmp-title-text {
      color: #fff;
      font-size: 12px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      max-width: 70%;
    }
    .bmp-title-actions {
      display: flex;
      gap: 4px;
    }
    .bmp-title-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: rgba(255,255,255,0.15);
      color: #fff;
      cursor: pointer;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
      transition: background 0.15s;
    }
    .bmp-title-btn:hover {
      background: rgba(255,255,255,0.3);
    }

    /* Resize 手柄 */
    .bmp-resize-handle {
      position: absolute;
      z-index: 10;
    }
    .bmp-resize-se {
      right: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
    }
    .bmp-resize-sw {
      left: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: sw-resize;
    }
    .bmp-resize-ne {
      right: 0;
      top: 0;
      width: 16px;
      height: 16px;
      cursor: ne-resize;
    }
    .bmp-resize-nw {
      left: 0;
      top: 0;
      width: 16px;
      height: 16px;
      cursor: nw-resize;
    }
    .bmp-resize-e {
      right: -3px;
      top: 16px;
      bottom: 16px;
      width: 6px;
      cursor: e-resize;
    }
    .bmp-resize-w {
      left: -3px;
      top: 16px;
      bottom: 16px;
      width: 6px;
      cursor: w-resize;
    }
    .bmp-resize-s {
      bottom: -3px;
      left: 16px;
      right: 16px;
      height: 6px;
      cursor: s-resize;
    }
    .bmp-resize-n {
      top: -3px;
      left: 16px;
      right: 16px;
      height: 6px;
      cursor: n-resize;
    }

    /* 设置面板 */
    .bmp-settings-panel {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 260px;
      background: rgba(20,20,24,0.96);
      backdrop-filter: blur(10px);
      border-left: 1px solid rgba(255,255,255,0.08);
      color: #fff;
      font-size: 12px;
      overflow-y: auto;
      z-index: 20;
      transform: translateX(100%);
      transition: transform 0.25s;
      padding: 12px;
    }
    .bmp-settings-panel.bmp-show {
      transform: translateX(0);
    }
    .bmp-settings-panel::-webkit-scrollbar {
      width: 4px;
    }
    .bmp-settings-panel::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
    }
    .bmp-settings-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .bmp-settings-group {
      margin-bottom: 14px;
    }
    .bmp-settings-group-label {
      font-size: 11px;
      color: rgba(255,255,255,0.5);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }
    .bmp-setting-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 0;
    }
    .bmp-setting-label {
      color: rgba(255,255,255,0.85);
    }
    .bmp-toggle {
      position: relative;
      width: 36px;
      height: 20px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .bmp-toggle.bmp-on {
      background: #00a1d6;
    }
    .bmp-toggle::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 16px;
      height: 16px;
      background: #fff;
      border-radius: 50%;
      transition: transform 0.2s;
    }
    .bmp-toggle.bmp-on::after {
      transform: translateX(16px);
    }
    .bmp-range-input {
      width: 80px;
      -webkit-appearance: none;
      appearance: none;
      height: 3px;
      background: rgba(255,255,255,0.2);
      border-radius: 2px;
      outline: none;
    }
    .bmp-range-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 10px;
      height: 10px;
      background: #00a1d6;
      border-radius: 50%;
      cursor: pointer;
    }
    .bmp-range-value {
      font-size: 11px;
      color: #00a1d6;
      min-width: 24px;
      text-align: right;
    }
    .bmp-keyword-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
    }
    .bmp-keyword-tag {
      display: flex;
      align-items: center;
      gap: 2px;
      background: rgba(255,255,255,0.1);
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    .bmp-keyword-remove {
      cursor: pointer;
      margin-left: 2px;
      opacity: 0.6;
    }
    .bmp-keyword-remove:hover {
      opacity: 1;
    }
    .bmp-keyword-input {
      width: 100%;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      outline: none;
      margin-top: 4px;
    }
    .bmp-keyword-input:focus {
      border-color: #00a1d6;
    }

    /* 触发按钮 */
    .bmp-trigger-btn {
      position: fixed;
      z-index: 2147483646;
      bottom: 80px;
      right: 20px;
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #00a1d6, #00d4aa);
      border: none;
      border-radius: 50%;
      color: #fff;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,161,214,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .bmp-trigger-btn:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0,161,214,0.5);
    }
    .bmp-trigger-btn svg {
      width: 22px;
      height: 22px;
      fill: currentColor;
    }

    /* Loading 遮罩 */
    .bmp-loading {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
      z-index: 5;
    }
    .bmp-spinner {
      width: 30px;
      height: 30px;
      border: 3px solid rgba(255,255,255,0.2);
      border-top-color: #00a1d6;
      border-radius: 50%;
      animation: bmp-spin 0.8s linear infinite;
    }
    @keyframes bmp-spin {
      to { transform: rotate(360deg); }
    }

    /* 动画 */
    @keyframes bmp-fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .bmp-fade-in {
      animation: bmp-fadeIn 0.25s ease-out;
    }
  `;

  // 通过 safeGM_addStyle 注入样式（自动回退 DOM API）
  safeGM_addStyle(STYLES);

  // ==================== SVG 图标（CSP 安全：使用 DOM API 创建） ====================
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgIcon(pathD, opts = {}) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', opts.viewBox || '0 0 24 24');
    svg.setAttribute('fill', 'currentColor');
    if (opts.opacity) svg.setAttribute('opacity', String(opts.opacity));
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    return svg;
  }

  const ICONS = {
    play: () => svgIcon('M8 5v14l11-7z'),
    pause: () => svgIcon('M6 19h4V5H6v14zm8-14v14h4V5h-4z'),
    volume: () => svgIcon('M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z'),
    volumeMute: () => svgIcon('M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z'),
    miniPlayer: () => svgIcon('M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z'),
    close: () => svgIcon('M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'),
    settings: () => svgIcon('M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'),
    danmaku: () => svgIcon('M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z'),
    danmakuOff: () => svgIcon('M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2zM6 14v-2h12v2H6zm0-3V9h12v2H6zm0-3V6h12v2H6z', { opacity: 0.3 }),
    backToPage: () => svgIcon('M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM9 8h2v8H9zm4 0h2v8h-2z'),
    pin: () => svgIcon('M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z'),
    minimize: () => svgIcon('M6 19h12v2H6v-2z'),
    pip: () => svgIcon('M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z'),
  };

  // 将图标 DOM 插入到按钮中（CSP 安全方式）
  function setIcon(btn, iconFn) {
    btn.textContent = '';
    btn.appendChild(iconFn());
  }

  // ==================== 弹幕引擎 ====================
  class DanmakuEngine {
    constructor(container, config) {
      this.container = container;
      this.config = config;
      this.danmakuQueue = [];
      this.activeDanmaku = [];
      this.running = false;
      this.lastTime = 0;
      this.trackHeights = []; // 轨道高度
      this.rafId = null;
      this.cid = null;
      this.danmakuData = [];
      this.lastDanmakuIndex = 0;
    }

    updateConfig(config) {
      this.config = config;
    }

    setDanmakuData(data) {
      this.danmakuData = data.sort((a, b) => a.time - b.time);
      this.lastDanmakuIndex = 0;
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this._loop();
    }

    stop() {
      this.running = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.clear();
    }

    clear() {
      this.activeDanmaku = [];
      this.container.innerHTML = '';
    }

    seekTo(time) {
      this.clear();
      this.lastDanmakuIndex = 0;
      // 跳过之前的弹幕
      for (let i = 0; i < this.danmakuData.length; i++) {
        if (this.danmakuData[i].time >= time - 0.5) {
          this.lastDanmakuIndex = i;
          break;
        }
      }
    }

    addDanmaku(text, color = '#FFFFFF', type = 1, fontSize = null) {
      if (!this.config.danmakuEnabled) return;
      if (!text || typeof text !== 'string') return;

      // 关键词过滤
      const keywords = this.config.danmakuBlockKeywords || [];
      if (keywords.some(kw => text.includes(kw))) return;

      // 类型过滤
      if (this.config.danmakuBlockType?.includes(type)) return;

      const fs = fontSize || this.config.danmakuFontSize;
      const el = document.createElement('div');
      el.className = 'bmp-danmaku-item';
      el.textContent = text;
      el.style.color = color;
      el.style.fontSize = fs + 'px';
      el.style.opacity = this.config.danmakuOpacity;
      this.container.appendChild(el);

      const containerWidth = this.container.offsetWidth;
      const elWidth = el.offsetWidth;
      // 确保容器已渲染，否则用估算宽度
      const effectiveElWidth = (elWidth > 0 && elWidth < containerWidth)
        ? elWidth
        : Math.min(text.length * fs * 0.8 + 10, containerWidth * 0.9);
      const lineHeight = fs * 1.6; // 行高

      // 计算可用轨道数
      const containerHeight = this.container.offsetHeight;
      const trackCount = Math.max(2, Math.floor(containerHeight / lineHeight));

      // 分配轨道（使用实际位置检测）
      let track = this._findAvailableTrack(trackCount, lineHeight, effectiveElWidth, containerWidth);

      const speed = containerWidth / (this.config.danmakuSpeed * 1000); // px/ms

      // 初始位置在右侧屏幕外
      const startX = containerWidth + 4;

      const item = {
        el,
        x: startX,
        y: track * lineHeight,
        speed,
        width: effectiveElWidth,
        type,
        lineHeight,
      };

      el.style.top = item.y + 'px';
      el.style.left = startX + 'px';

      this.activeDanmaku.push(item);

      // 限制数量
      while (this.activeDanmaku.length > this.config.danmakuMaxCount) {
        const oldest = this.activeDanmaku.shift();
        oldest.el.remove();
      }
    }

    _findAvailableTrack(trackCount, lineHeight, newWidth, containerWidth) {
      // 使用当前弹幕的实际位置来判断轨道是否空闲
      const now = performance.now();

      // 收集每条轨道上最靠右的弹幕的尾部位置
      const trackRightEdge = new Array(trackCount).fill(-Infinity);

      for (const item of this.activeDanmaku) {
        const trackIdx = Math.round(item.y / lineHeight);
        if (trackIdx >= 0 && trackIdx < trackCount) {
          const rightEdge = item.x + item.width;
          // 只考虑还在屏幕内或即将进入屏幕内的弹幕
          if (rightEdge > -newWidth) {
            if (rightEdge > trackRightEdge[trackIdx]) {
              trackRightEdge[trackIdx] = rightEdge;
            }
          }
        }
      }

      // 找到最空闲的轨道（最右边边缘最小的）
      let bestTrack = -1;
      let minRight = Infinity;
      for (let t = 0; t < trackCount; t++) {
        // 轨道空闲条件：该轨道最右端弹幕已经完全移出屏幕左侧
        if (trackRightEdge[t] <= 0) return t;
        if (trackRightEdge[t] < minRight) {
          minRight = trackRightEdge[t];
          bestTrack = t;
        }
      }

      // 所有轨道都有弹幕时，返回最不拥挤的那个
      return bestTrack >= 0 ? bestTrack : 0;
    }

    _loop() {
      if (!this.running) return;
      const now = performance.now();
      const dt = now - this.lastTime;
      this.lastTime = now;

      // 更新弹幕位置
      for (let i = this.activeDanmaku.length - 1; i >= 0; i--) {
        const item = this.activeDanmaku[i];
        item.x -= item.speed * dt;
        item.el.style.left = item.x + 'px';

        if (item.x + item.width < 0) {
          item.el.remove();
          this.activeDanmaku.splice(i, 1);
        }
      }

      this.rafId = requestAnimationFrame(() => this._loop());
    }

    // 按时间推送弹幕（与视频时间同步）
    syncTime(currentTime) {
      if (!this.danmakuData.length) return;
      while (
        this.lastDanmakuIndex < this.danmakuData.length &&
        this.danmakuData[this.lastDanmakuIndex].time <= currentTime
      ) {
        const d = this.danmakuData[this.lastDanmakuIndex];
        this.addDanmaku(d.text, d.color, d.type, d.fontSize);
        this.lastDanmakuIndex++;
      }
    }
  }

  // ==================== 弹幕数据获取 ====================
  class DanmakuFetcher {
    constructor() {
      this.cache = new Map();
    }

    async fetchDanmaku(cid) {
      if (this.cache.has(cid)) {
        console.log('[MiniPlayer] 使用缓存弹幕数据');
        return this.cache.get(cid);
      }
      // 先尝试普通的 fetch
      const data = await this._tryFetch(cid);
      if (data && data.length) {
        this.cache.set(cid, data);
        return data;
      }
      // fetch 失败，用 GM_xmlhttpRequest（绕过 CORS）
      const gmData = await this._tryGMXHR(cid);
      if (gmData && gmData.length) {
        this.cache.set(cid, gmData);
        return gmData;
      }
      // 都失败，尝试从页面提取
      const pageData = this._getDanmakuFromPage();
      if (pageData && pageData.length) {
        this.cache.set(cid, pageData);
      }
      return pageData;
    }

    async _tryFetch(cid) {
      try {
        const resp = await fetch(
          `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`,
          { credentials: 'include' }
        );
        if (resp.ok) {
          const buffer = await resp.arrayBuffer();
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(buffer);
          const data = this._parseXMLDanmaku(text);
          if (data.length) return data;
        }
      } catch (e) {
        console.warn('[MiniPlayer] fetch 获取弹幕失败:', e.message);
      }
      return null;
    }

    async _tryGMXHR(cid) {
      return new Promise((resolve) => {
        if (typeof GM_xmlhttpRequest !== 'function') {
          resolve(null);
          return;
        }
        GM_xmlhttpRequest({
          method: 'GET',
          url: `https://api.bilibili.com/x/v1/dm/list.so?oid=${cid}`,
          responseType: 'arraybuffer',
          onload: (resp) => {
            try {
              const decoder = new TextDecoder('utf-8');
              const text = decoder.decode(new Uint8Array(resp.response));
              const data = this._parseXMLDanmaku(text);
              resolve(data);
            } catch (e) {
              resolve(null);
            }
          },
          onerror: () => resolve(null),
          ontimeout: () => resolve(null),
        });
      });
    }

    _getDanmakuFromPage() {
      // 尝试从页面 __INITIAL_STATE__ 等获取弹幕
      try {
        const ist = window.__INITIAL_STATE__;
        if (ist?.videoData?.dm) {
          return ist.videoData.dm;
        }
        if (ist?.danmakuInfo?.dm) {
          return ist.danmakuInfo.dm;
        }
      } catch (e) {}
      return [];
    }

    _parseXMLDanmaku(xmlText) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');
      const danmakus = [];
      const ds = doc.querySelectorAll('d');
      ds.forEach(d => {
        const p = d.getAttribute('p');
        if (!p) return;
        const parts = p.split(',');
        const text = d.textContent;
        if (!text) return;
        danmakus.push({
          time: parseFloat(parts[0]) || 0,
          type: parseInt(parts[1]) || 1,
          fontSize: parseInt(parts[2]) || 25,
          color: this._intToColor(parseInt(parts[3]) || 16777215),
          text: text.trim(),
        });
      });
      return danmakus.sort((a, b) => a.time - b.time);
    }

    _intToColor(num) {
      return '#' + num.toString(16).padStart(6, '0');
    }
  }

  // ==================== 小窗播放器核心 ====================
  class MiniPlayer {
    constructor() {
      this.el = null;
      this.videoEl = null;
      this.sourceVideo = null;
      this.danmakuEngine = null;
      this.danmakuFetcher = new DanmakuFetcher();
      this.config = configManager.getAll();
      this.isDragging = false;
      this.isResizing = false;
      this.resizeDir = '';
      this.dragOffset = { x: 0, y: 0 };
      this.resizeStart = { x: 0, y: 0, w: 0, h: 0, l: 0, t: 0 };
      this.isVisible = false;
      this.isMinimized = false;
      this.isSettingsOpen = false;
      this.isSpeedMenuOpen = false;
      this.isPlaying = false;
      this.currentCid = null;
      this.videoTitle = '';
      this.syncRafId = null;
      this.observer = null;
      this.sourcePlaybackTarget = null;
      this._onSourcePlaybackChange = () => this._updatePlayButton();
      this.playButtonState = null;

      this.init();
    }

    init() {
      this._createTriggerButton();
      this._waitForVideo();
      this._registerMenuCommands();

      // 自动小窗
      if (this.config.autoEnterMini) {
        this._autoEnterTimer = setTimeout(() => {
          this._tryAutoEnter();
        }, 3000);
      }
    }

    _findSourceVideo() {
      const videos = Array.from(document.querySelectorAll('video'));
      return videos.find(video => !video.closest('#bili-mini-player')) || null;
    }

    _bindSourcePlaybackEvents(source) {
      if (!source || this.sourcePlaybackTarget === source) return;

      if (this.sourcePlaybackTarget) {
        this.sourcePlaybackTarget.removeEventListener('play', this._onSourcePlaybackChange);
        this.sourcePlaybackTarget.removeEventListener('pause', this._onSourcePlaybackChange);
        this.sourcePlaybackTarget.removeEventListener('ended', this._onSourcePlaybackChange);
      }

      this.sourcePlaybackTarget = source;
      source.addEventListener('play', this._onSourcePlaybackChange);
      source.addEventListener('pause', this._onSourcePlaybackChange);
      source.addEventListener('ended', this._onSourcePlaybackChange);
    }

    _getPageWindow() {
      try {
        if (typeof unsafeWindow !== 'undefined') return unsafeWindow;
      } catch (e) {}
      return window;
    }

    _getBiliPlayer() {
      const pageWindow = this._getPageWindow();
      const candidates = [
        pageWindow.player,
        pageWindow.bilibiliPlayer,
        pageWindow.__player,
        pageWindow.__PLAYER__,
      ].filter(Boolean);

      return candidates.find(player =>
        typeof player.play === 'function' || typeof player.pause === 'function'
      ) || null;
    }

    _findPagePlayButton() {
      const selectors = [
        '.bpx-player-ctrl-play',
        '.bilibili-player-video-btn-start',
        '.bilibili-player-iconfont-start',
        '.squirtle-video-start',
        '[aria-label*="播放"]',
        '[aria-label*="暂停"]',
        '[title*="播放"]',
        '[title*="暂停"]',
      ];

      for (const selector of selectors) {
        const btn = Array.from(document.querySelectorAll(selector))
          .find(el => !el.closest('#bili-mini-player'));
        if (btn) return btn;
      }

      return null;
    }

    _clickPagePlayButton() {
      const btn = this._findPagePlayButton();
      if (!btn) return false;
      btn.dispatchEvent(new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      }));
      return true;
    }

    async _setSourcePlayback(shouldPlay) {
      const source = this._findSourceVideo() || this.sourceVideo;
      if (!source) return false;

      this.sourceVideo = source;
      this._bindSourcePlaybackEvents(source);

      const player = this._getBiliPlayer();

      if (shouldPlay) {
        source.muted = true;
        try {
          if (player && typeof player.play === 'function') {
            await Promise.resolve(player.play());
          }
          await source.play();
        } catch (err) {
          console.warn('[MiniPlayer] 源视频播放失败', err);
        }
      } else {
        try {
          if (player && typeof player.pause === 'function') {
            player.pause();
          }
          source.pause();
        } catch (err) {
          console.warn('[MiniPlayer] 源视频暂停失败', err);
        }
      }

      await new Promise(resolve => setTimeout(resolve, 80));

      const succeeded = shouldPlay ? !source.paused : source.paused;
      if (!succeeded) {
        this._clickPagePlayButton();
        await new Promise(resolve => setTimeout(resolve, 80));
      }

      if (this.videoEl) {
        if (source.paused) {
          this.videoEl.pause();
        } else {
          this.videoEl.play().catch(() => {});
        }
      }

      this._updatePlayButton();
      return shouldPlay ? !source.paused : source.paused;
    }

    _waitForVideo() {
      const check = () => {
        const video = this._findSourceVideo();
        if (video) {
          this.sourceVideo = video;
          this._bindSourcePlaybackEvents(video);
          this._observeVideo();
          return;
        }
        requestAnimationFrame(check);
      };
      check();
    }

    _observeVideo() {
      if (this.observer) this.observer.disconnect();

      this.observer = new MutationObserver(() => {
        const video = this._findSourceVideo();
        if (video !== this.sourceVideo) {
          this.sourceVideo = video;
          this._bindSourcePlaybackEvents(video);
          if (this.isVisible) {
            this._syncVideoSource();
            this._updatePlayButton();
          }
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }

    _tryAutoEnter() {
      if (this.sourceVideo && !this.isVisible) {
        this.enterMini();
      }
    }

    _createTriggerButton() {
      const btn = document.createElement('button');
      btn.className = 'bmp-trigger-btn';
      setIcon(btn, ICONS.miniPlayer);
      btn.title = '开启小窗播放';
      btn.addEventListener('click', () => this.toggle());
      document.body.appendChild(btn);
      this.triggerBtn = btn;
    }

    _registerMenuCommands() {
      safeGM_registerMenuCommand('进入小窗模式', () => this.enterMini());
      safeGM_registerMenuCommand('重置配置', () => {
        configManager.reset();
        this.config = configManager.getAll();
        this._applyConfig();
      });
    }

    toggle() {
      if (this.isVisible) {
        this.exitMini();
      } else {
        this.enterMini();
      }
    }

    enterMini() {
      if (this.isVisible) return;
      if (!this.sourceVideo) {
        this.sourceVideo = this._findSourceVideo();
      }
      if (!this.sourceVideo) {
        console.warn('[MiniPlayer] 未找到视频元素');
        return;
      }
      this._bindSourcePlaybackEvents(this.sourceVideo);

      this._buildUI();
      this._syncVideoSource();
      this._startSync();
      this._fetchDanmaku();
      this._getVideoTitle();
      this._applyConfig();

      this.isVisible = true;
      this.triggerBtn.style.display = 'none';

      // 原视频静音（避免双音轨），保持播放以维持流
      if (this.sourceVideo) {
        this.sourceVideo.muted = true;
      }

      // 小窗播放（与源视频同步状态）
      if (this.sourceVideo && !this.sourceVideo.paused) {
        this.videoEl.play().catch(() => {});
      }
    }

    exitMini() {
      if (!this.isVisible) return;

      this._stopSync();
      this.danmakuEngine?.stop();

      // 同步回原视频并恢复音频
      if (this.sourceVideo && this.videoEl) {
        const timeline = this._getTimelineVideo();
        if (timeline && isFinite(timeline.currentTime)) {
          this.sourceVideo.currentTime = timeline.currentTime;
        }
        this.sourceVideo.volume = this.videoEl.volume;
        this.sourceVideo.muted = false;
        this.sourceVideo.playbackRate = this.videoEl.playbackRate;
        if (!this.sourceVideo.paused) {
          this.sourceVideo.play().catch(() => {});
        }
      }

      this.el?.remove();
      this.el = null;
      this.videoEl = null;
      this.isVisible = false;
      this.isMinimized = false;
      this.playButtonState = null;
      this.triggerBtn.style.display = '';
    }

    _buildUI() {
      if (this.el) this.el.remove();

      const container = document.createElement('div');
      container.id = 'bili-mini-player';
      container.className = 'bmp-fade-in';

      // 使用 DOM API 构建 UI（CSP 安全，避免 innerHTML 中的 SVG 被拦截）
      const buildUI = () => {
        // 视频层
        const videoWrap = document.createElement('div');
        videoWrap.className = 'bmp-video-wrap';
        const video = document.createElement('video');
        video.className = 'bmp-video';
        video.setAttribute('playsinline', '');
        const danmakuLayer = document.createElement('div');
        danmakuLayer.className = 'bmp-danmaku-layer';
        const loading = document.createElement('div');
        loading.className = 'bmp-loading';
        loading.style.display = 'none';
        const spinner = document.createElement('div');
        spinner.className = 'bmp-spinner';
        loading.appendChild(spinner);
        videoWrap.append(video, danmakuLayer, loading);

        // 标题栏
        const titleBar = document.createElement('div');
        titleBar.className = 'bmp-title-bar';
        const titleText = document.createElement('span');
        titleText.className = 'bmp-title-text';
        titleText.textContent = '加载中...';
        const titleActions = document.createElement('div');
        titleActions.className = 'bmp-title-actions';
        const titleBtnConfigs = [
          { cls: 'bmp-btn-pin', title: '置顶', icon: ICONS.pin },
          { cls: 'bmp-btn-minimize', title: '最小化', icon: ICONS.minimize },
          { cls: 'bmp-btn-pip', title: '原生画中画', icon: ICONS.pip },
          { cls: 'bmp-btn-back', title: '回到页面', icon: ICONS.backToPage },
          { cls: 'bmp-btn-close', title: '关闭', icon: ICONS.close },
        ];
        titleBtnConfigs.forEach(cfg => {
          const btn = document.createElement('button');
          btn.className = 'bmp-title-btn ' + cfg.cls;
          btn.title = cfg.title;
          setIcon(btn, cfg.icon);
          titleActions.appendChild(btn);
        });
        titleBar.append(titleText, titleActions);

        // 控制栏
        const controls = document.createElement('div');
        controls.className = 'bmp-controls';

        // 进度条
        const progressWrap = document.createElement('div');
        progressWrap.className = 'bmp-progress-wrap';
        const progressBuffered = document.createElement('div');
        progressBuffered.className = 'bmp-progress-buffered';
        const progressPlayed = document.createElement('div');
        progressPlayed.className = 'bmp-progress-played';
        const progressThumb = document.createElement('div');
        progressThumb.className = 'bmp-progress-thumb';
        const progressTooltip = document.createElement('div');
        progressTooltip.className = 'bmp-progress-tooltip';
        progressTooltip.textContent = '0:00';
        progressWrap.append(progressBuffered, progressPlayed, progressThumb, progressTooltip);

        // 按钮行
        const btnRow = document.createElement('div');
        btnRow.className = 'bmp-btn-row';
        const btnPlay = document.createElement('button');
        btnPlay.className = 'bmp-btn bmp-btn-play';
        setIcon(btnPlay, ICONS.play);
        const timeSpan = document.createElement('span');
        timeSpan.className = 'bmp-time';
        const timeCurrent = document.createElement('span');
        timeCurrent.className = 'bmp-time-current';
        timeCurrent.textContent = '0:00';
        const timeSep = document.createTextNode('/');
        const timeTotal = document.createElement('span');
        timeTotal.className = 'bmp-time-total';
        timeTotal.textContent = '0:00';
        timeSpan.append(timeCurrent, timeSep, timeTotal);

        const volumeWrap = document.createElement('div');
        volumeWrap.className = 'bmp-volume-wrap';
        const btnVolume = document.createElement('button');
        btnVolume.className = 'bmp-btn bmp-btn-volume';
        setIcon(btnVolume, ICONS.volume);
        const volumeSlider = document.createElement('input');
        volumeSlider.type = 'range';
        volumeSlider.className = 'bmp-volume-slider';
        volumeSlider.min = '0';
        volumeSlider.max = '100';
        volumeSlider.value = '100';
        volumeWrap.append(btnVolume, volumeSlider);

        const btnDanmaku = document.createElement('button');
        btnDanmaku.className = 'bmp-btn bmp-btn-danmaku';
        btnDanmaku.title = '弹幕开关';
        setIcon(btnDanmaku, ICONS.danmaku);

        const spacer = document.createElement('span');
        spacer.className = 'bmp-spacer';

        const speedWrap = document.createElement('div');
        speedWrap.style.position = 'relative';
        const btnSpeed = document.createElement('button');
        btnSpeed.className = 'bmp-btn bmp-btn-speed';
        btnSpeed.title = '倍速';
        btnSpeed.style.cssText = 'font-size:11px;width:auto;padding:0 6px;font-weight:bold;';
        btnSpeed.textContent = '1x';
        const speedMenu = document.createElement('div');
        speedMenu.className = 'bmp-speed-menu';
        [0.5, 0.75, 1, 1.25, 1.5, 2, 3].forEach(s => {
          const opt = document.createElement('button');
          opt.className = 'bmp-speed-option';
          opt.dataset.speed = String(s);
          opt.textContent = s + 'x';
          speedMenu.appendChild(opt);
        });
        speedWrap.append(btnSpeed, speedMenu);

        const btnSettings = document.createElement('button');
        btnSettings.className = 'bmp-btn bmp-btn-settings';
        btnSettings.title = '设置';
        setIcon(btnSettings, ICONS.settings);

        btnRow.append(btnPlay, timeSpan, volumeWrap, btnDanmaku, spacer, speedWrap, btnSettings);
        controls.append(progressWrap, btnRow);

        // Resize 手柄
        const resizeDirs = ['se', 'sw', 'ne', 'nw', 'e', 'w', 's', 'n'];
        const resizeHandles = resizeDirs.map(dir => {
          const h = document.createElement('div');
          h.className = `bmp-resize-handle bmp-resize-${dir}`;
          return h;
        });

        // 设置面板
        const settingsPanel = document.createElement('div');
        settingsPanel.className = 'bmp-settings-panel';
        settingsPanel.innerHTML = `
          <div class="bmp-settings-title">
            <span>设置</span>
            <button class="bmp-title-btn bmp-btn-settings-close" style="width:20px;height:20px;font-size:12px;">✕</button>
          </div>
          <div class="bmp-settings-group">
            <div class="bmp-settings-group-label">窗口</div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">等比缩放</span>
              <div class="bmp-toggle ${this.config.lockAspectRatio ? 'bmp-on' : ''}" data-key="lockAspectRatio"></div>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">圆角大小</span>
              <input type="range" class="bmp-range-input" data-key="borderRadius" min="0" max="30" value="${this.config.borderRadius}">
              <span class="bmp-range-value" data-key="borderRadius">${this.config.borderRadius}</span>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">透明度</span>
              <input type="range" class="bmp-range-input" data-key="opacity" min="30" max="100" value="${Math.round(this.config.opacity * 100)}">
              <span class="bmp-range-value" data-key="opacity">${Math.round(this.config.opacity * 100)}%</span>
            </div>
          </div>
          <div class="bmp-settings-group">
            <div class="bmp-settings-group-label">弹幕</div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">显示弹幕</span>
              <div class="bmp-toggle ${this.config.danmakuEnabled ? 'bmp-on' : ''}" data-key="danmakuEnabled"></div>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">透明度</span>
              <input type="range" class="bmp-range-input" data-key="danmakuOpacity" min="10" max="100" value="${Math.round(this.config.danmakuOpacity * 100)}">
              <span class="bmp-range-value" data-key="danmakuOpacity">${Math.round(this.config.danmakuOpacity * 100)}%</span>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">滚动速度</span>
              <input type="range" class="bmp-range-input" data-key="danmakuSpeed" min="2" max="15" value="${this.config.danmakuSpeed}">
              <span class="bmp-range-value" data-key="danmakuSpeed">${this.config.danmakuSpeed}s</span>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">字体大小</span>
              <input type="range" class="bmp-range-input" data-key="danmakuFontSize" min="10" max="30" value="${this.config.danmakuFontSize}">
              <span class="bmp-range-value" data-key="danmakuFontSize">${this.config.danmakuFontSize}px</span>
            </div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">最大数量</span>
              <input type="range" class="bmp-range-input" data-key="danmakuMaxCount" min="10" max="100" value="${this.config.danmakuMaxCount}">
              <span class="bmp-range-value" data-key="danmakuMaxCount">${this.config.danmakuMaxCount}</span>
            </div>
            <div class="bmp-setting-row" style="flex-direction:column;align-items:flex-start;gap:4px">
              <span class="bmp-setting-label">屏蔽关键词</span>
              <div class="bmp-keyword-list"></div>
              <input type="text" class="bmp-keyword-input" placeholder="输入关键词后回车添加">
            </div>
          </div>
          <div class="bmp-settings-group">
            <div class="bmp-settings-group-label">播放</div>
            <div class="bmp-setting-row">
              <span class="bmp-setting-label">自动小窗</span>
              <div class="bmp-toggle ${this.config.autoEnterMini ? 'bmp-on' : ''}" data-key="autoEnterMini"></div>
            </div>
          </div>
        `;

        container.append(videoWrap, titleBar, controls, ...resizeHandles, settingsPanel);
      };

      buildUI();

      document.body.appendChild(container);
      this.el = container;
      this.videoEl = container.querySelector('.bmp-video');
      this.danmakuLayer = container.querySelector('.bmp-danmaku-layer');

      // 初始化弹幕引擎
      this.danmakuEngine = new DanmakuEngine(this.danmakuLayer, this.config);
      this.danmakuEngine.start();

      // 设置位置和大小
      this._applyPosition();

      // 绑定事件
      this._bindEvents();
    }

    _syncVideoSource() {
      if (!this.sourceVideo || !this.videoEl) return;
      try {
        if (this.sourceVideo.captureStream) {
          // captureStream 可以捕获 MSE 流（B站使用的方式）
          const stream = this.sourceVideo.captureStream();
          if (!stream.getAudioTracks().length && !stream.getVideoTracks().length) {
            console.warn('[MiniPlayer] captureStream 返回空流');
          }
          this.videoEl.srcObject = stream;
        } else {
          // 最终回退：尝试 src
          const src = this.sourceVideo.currentSrc || this.sourceVideo.src;
          if (src) {
            this.videoEl.src = src;
          }
        }
      } catch (e) {
        console.warn('[MiniPlayer] 视频源同步失败', e);
        const src = this.sourceVideo.currentSrc || this.sourceVideo.src;
        if (src) {
          this.videoEl.src = src;
        }
      }
      // 同步状态
      this.videoEl.currentTime = this.sourceVideo.currentTime;
      this.videoEl.volume = this.sourceVideo.volume;
      this.videoEl.muted = false;
      this.videoEl.playbackRate = this.sourceVideo.playbackRate;
      this.isPlaying = !this.sourceVideo.paused;
    }

    _retryVideoSource() {
      if (!this.isVisible || !this.sourceVideo || !this.videoEl) return;
      // 清除旧源
      this.videoEl.removeAttribute('src');
      this.videoEl.load();
      // 重新同步
      setTimeout(() => {
        if (this.sourceVideo && this.videoEl) {
          try {
            const stream = this.sourceVideo.captureStream?.();
            if (stream) {
              this.videoEl.srcObject = stream;
            } else {
              const src = this.sourceVideo.currentSrc || this.sourceVideo.src;
              if (src) this.videoEl.src = src;
            }
          } catch (e2) {
            console.warn('[MiniPlayer] 重试也失败', e2);
          }
        }
      }, 200);
    }

    _getTimelineVideo() {
      return this.sourceVideo || this.videoEl;
    }

    _seekTo(time) {
      const timeline = this._getTimelineVideo();
      if (!timeline) return;

      const duration = timeline.duration;
      if (!isFinite(duration) || duration <= 0) return;

      const nextTime = Math.max(0, Math.min(time, duration));

      if (this.sourceVideo) {
        this.sourceVideo.currentTime = nextTime;
      }

      // `captureStream()` 模式下小窗 video 不是可靠时间线，仅在直连 src 时主动 seek。
      if (this.videoEl && !this.videoEl.srcObject) {
        this.videoEl.currentTime = nextTime;
      }

      this.danmakuEngine?.seekTo(nextTime);
      this._updateProgressUI();
    }

    _startSync() {
      const sync = () => {
        if (!this.isVisible || !this.videoEl) return;

        if (this.sourceVideo) {
          if (this.sourceVideo.paused && !this.videoEl.paused) {
            this.videoEl.pause();
          } else if (!this.sourceVideo.paused && this.videoEl.paused) {
            this.videoEl.play().catch(() => {});
          }

          if (Math.abs(this.videoEl.playbackRate - this.sourceVideo.playbackRate) > 0.01) {
            this.videoEl.playbackRate = this.sourceVideo.playbackRate;
          }
        }

        // 同步弹幕
        const timeline = this._getTimelineVideo();
        if (this.config.danmakuEnabled && this.danmakuEngine && timeline) {
          this.danmakuEngine.syncTime(timeline.currentTime || 0);
        }

        // 更新 UI
        this._updateProgressUI();
        this._updatePlayButton();
        this._updateVolumeUI();

        this.syncRafId = requestAnimationFrame(sync);
      };
      this.syncRafId = requestAnimationFrame(sync);
    }

    _stopSync() {
      if (this.syncRafId) {
        cancelAnimationFrame(this.syncRafId);
        this.syncRafId = null;
      }
    }

    _applyPosition() {
      if (!this.el) return;
      const cfg = this.config;
      let x = cfg.posX;
      let y = cfg.posY;

      // 右下角默认
      if (x < 0 || y < 0) {
        x = window.innerWidth - cfg.width - 20;
        y = window.innerHeight - cfg.height - 20;
      }

      // 边界限制
      x = Math.max(0, Math.min(x, window.innerWidth - cfg.width));
      y = Math.max(0, Math.min(y, window.innerHeight - cfg.height));

      this.el.style.width = cfg.width + 'px';
      this.el.style.height = cfg.height + 'px';
      this.el.style.left = x + 'px';
      this.el.style.top = y + 'px';
    }

    _applyConfig() {
      if (!this.el) return;
      const cfg = this.config;

      this.el.style.setProperty('--bmp-radius', cfg.borderRadius + 'px');
      this.el.style.setProperty('--bmp-shadow', cfg.shadow);
      this.el.style.setProperty('--bmp-opacity', cfg.opacity);

      if (this.danmakuEngine) {
        this.danmakuEngine.updateConfig(cfg);
      }
    }

    _getVideoTitle() {
      try {
        const titleEl = document.querySelector('.video-info-container .video-title') ||
          document.querySelector('h1.video-title') ||
          document.querySelector('.bilibili-player-video-title') ||
          document.querySelector('h1');
        if (titleEl) {
          this.videoTitle = titleEl.textContent?.trim() || 'Bilibili 视频';
        } else {
          this.videoTitle = document.title.replace(/_哔哩哔哩_bilibili/, '').trim() || 'Bilibili 视频';
        }
      } catch (e) {
        this.videoTitle = 'Bilibili 视频';
      }
      if (this.el) {
        this.el.querySelector('.bmp-title-text').textContent = this.videoTitle;
      }
    }

    async _fetchDanmaku() {
      try {
        const cid = this._getCid();
        if (!cid) return;
        if (cid === this.currentCid) return;
        this.currentCid = cid;

        const data = await this.danmakuFetcher.fetchDanmaku(cid);
        if (data && data.length) {
          this.danmakuEngine?.setDanmakuData(data);
          console.log(`[MiniPlayer] 加载了 ${data.length} 条弹幕`);
        }
      } catch (e) {
        console.warn('[MiniPlayer] 弹幕加载失败', e);
      }
    }

    _getCid() {
      // 从页面获取 cid（多种方式尝试）
      try {
        // 方式1: B站页面 __INITIAL_STATE__
        if (window.__INITIAL_STATE__?.videoData?.cid) {
          const cid = window.__INITIAL_STATE__.videoData.cid;
          console.log('[MiniPlayer] CID from __INITIAL_STATE__:', cid);
          return cid;
        }
        // 方式2: __playinfo__
        if (window.__playinfo__?.data?.cid) {
          const cid = window.__playinfo__.data.cid;
          console.log('[MiniPlayer] CID from __playinfo__:', cid);
          return cid;
        }
        // 方式3: URL 参数
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('cid')) {
          const cid = parseInt(urlParams.get('cid'));
          console.log('[MiniPlayer] CID from URL:', cid);
          return cid;
        }
        // 方式4: aid 转换（通过页面脚本）
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const text = script.textContent || '';
          const match = text.match(/"cid"\s*:\s*(\d+)/);
          if (match) {
            const cid = parseInt(match[1]);
            console.log('[MiniPlayer] CID from script:', cid);
            return cid;
          }
        }
        // 方式5: 从 window.__NEXT_DATA__ 或其他
        const allKeys = Object.keys(window).filter(k => k.startsWith('__') && k.endsWith('__'));
        for (const key of allKeys) {
          try {
            const val = window[key];
            const cid = val?.videoData?.cid || val?.data?.cid || val?.cid;
            if (cid) {
              console.log(`[MiniPlayer] CID from ${key}:`, cid);
              return cid;
            }
          } catch (e) {}
        }
      } catch (e) {
        console.warn('[MiniPlayer] CID 获取异常', e);
      }
      console.warn('[MiniPlayer] 未能获取 CID');
      return null;
    }

    // ==================== UI 更新 ====================

    _updateProgressUI() {
      if (!this.el) return;
      const video = this._getTimelineVideo();
      if (!video) return;
      const duration = video.duration || 0;
      const current = video.currentTime || 0;
      const buffered = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;

      const playedPercent = duration ? (current / duration) * 100 : 0;
      const bufferedPercent = duration ? (buffered / duration) * 100 : 0;

      const playedEl = this.el.querySelector('.bmp-progress-played');
      const bufferedEl = this.el.querySelector('.bmp-progress-buffered');
      const thumbEl = this.el.querySelector('.bmp-progress-thumb');
      const currentEl = this.el.querySelector('.bmp-time-current');
      const totalEl = this.el.querySelector('.bmp-time-total');

      if (playedEl) playedEl.style.width = playedPercent + '%';
      if (bufferedEl) bufferedEl.style.width = bufferedPercent + '%';
      if (thumbEl) thumbEl.style.left = playedPercent + '%';
      if (currentEl) currentEl.textContent = this._formatTime(current);
      if (totalEl) totalEl.textContent = this._formatTime(duration);
    }

    _updatePlayButton() {
      if (!this.el) return;
      const btn = this.el.querySelector('.bmp-btn-play');
      const timeline = this._getTimelineVideo();
      if (!btn || !timeline) return;
      this.isPlaying = !timeline.paused;
      const nextState = this.isPlaying ? 'pause' : 'play';
      if (this.playButtonState === nextState) return;
      this.playButtonState = nextState;
      setIcon(btn, this.isPlaying ? ICONS.pause : ICONS.play);
    }

    _updateVolumeUI() {
      if (!this.el || !this.videoEl) return;
      const btn = this.el.querySelector('.bmp-btn-volume');
      const slider = this.el.querySelector('.bmp-volume-slider');
      if (!btn || !slider) return;

      const vol = this.videoEl.muted ? 0 : this.videoEl.volume;
      setIcon(btn, vol === 0 ? ICONS.volumeMute : ICONS.volume);
      slider.value = Math.round(vol * 100);
    }

    _formatTime(seconds) {
      if (!isFinite(seconds)) return '0:00';
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // ==================== 事件绑定 ====================

    _bindEvents() {
      if (!this.el) return;
      const el = this.el;

      // 拖拽移动
      el.addEventListener('mousedown', (e) => this._onMouseDown(e));

      // 播放/暂停
      const playBtn = el.querySelector('.bmp-btn-play');
      let suppressPlayClick = false;
      playBtn?.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        suppressPlayClick = true;
        this._togglePlay();
      });
      playBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (suppressPlayClick) {
          suppressPlayClick = false;
          return;
        }
        this._togglePlay();
      });

      // 视频区域双击全屏切换 / 单击暂停播放
      el.querySelector('.bmp-video-wrap')?.addEventListener('dblclick', (e) => {
        e.preventDefault();
        this._togglePlay();
      });

      // 进度条
      this._bindProgressEvents();

      // 音量
      this._bindVolumeEvents();

      // 倍速
      this._bindSpeedEvents();

      // 弹幕开关
      el.querySelector('.bmp-btn-danmaku')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.config.danmakuEnabled = !this.config.danmakuEnabled;
        configManager.set('danmakuEnabled', this.config.danmakuEnabled);
        this._updateDanmakuButton();
        if (!this.config.danmakuEnabled) {
          this.danmakuEngine?.clear();
        }
      });

      // 设置
      el.querySelector('.bmp-btn-settings')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleSettings();
      });

      el.querySelector('.bmp-btn-settings-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleSettings(false);
      });

      // 设置面板交互
      this._bindSettingsEvents();

      // 标题栏按钮
      el.querySelector('.bmp-btn-close')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitMini();
      });

      el.querySelector('.bmp-btn-back')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitMini();
        // 滚动到视频位置
        this.sourceVideo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      el.querySelector('.bmp-btn-minimize')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMinimize();
      });

      el.querySelector('.bmp-btn-pip')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this._requestNativePiP();
      });

      el.querySelector('.bmp-btn-pin')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.config.alwaysOnTop = !this.config.alwaysOnTop;
        configManager.set('alwaysOnTop', this.config.alwaysOnTop);
        this._updatePinButton();
      });

      // 全局鼠标事件
      document.addEventListener('mousemove', (e) => this._onMouseMove(e));
      document.addEventListener('mouseup', (e) => this._onMouseUp(e));

      // 视频事件
      const loading = el.querySelector('.bmp-loading');

      this.videoEl?.addEventListener('waiting', () => {
        loading?.style.setProperty('display', 'flex');
      });
      this.videoEl?.addEventListener('canplay', () => {
        loading?.style.setProperty('display', 'none');
      });
      this.videoEl?.addEventListener('loadeddata', () => {
        loading?.style.setProperty('display', 'none');
      });
      this.videoEl?.addEventListener('error', (e) => {
        console.warn('[MiniPlayer] 视频加载错误，尝试重新同步源', e);
        loading?.style.setProperty('display', 'none');
        // 延迟重试
        setTimeout(() => this._retryVideoSource(), 1000);
      });
      this.videoEl?.addEventListener('stalled', () => {
        console.warn('[MiniPlayer] 视频缓冲停滞');
        loading?.style.setProperty('display', 'flex');
      });
      this.videoEl?.addEventListener('ended', () => {
        this.isPlaying = false;
        this._updatePlayButton();
      });

      // 键盘快捷键
      el.setAttribute('tabindex', '0');
      el.addEventListener('keydown', (e) => this._onKeyDown(e));

      // 窗口大小变化
      window.addEventListener('resize', () => {
        this._ensureInBounds();
      });
    }

    _onMouseDown(e) {
      if (!this.el || this.isMinimized) return;

      const target = e.target;

      // Resize
      if (target.classList.contains('bmp-resize-handle')) {
        e.preventDefault();
        this.isResizing = true;
        this.resizeDir = [...target.classList]
          .find(c => c.startsWith('bmp-resize-') && c !== 'bmp-resize-handle')
          ?.replace('bmp-resize-', '') || 'se';
        this.resizeStart = {
          x: e.clientX,
          y: e.clientY,
          w: this.el.offsetWidth,
          h: this.el.offsetHeight,
          l: this.el.offsetLeft,
          t: this.el.offsetTop,
        };
        return;
      }

      // 标题栏拖拽
      const titleBar = target.closest('.bmp-title-bar');
      const isTitleBtn = target.closest('.bmp-title-btn');
      if (titleBar && !isTitleBtn) {
        e.preventDefault();
        this.isDragging = true;
        this.dragOffset = {
          x: e.clientX - this.el.offsetLeft,
          y: e.clientY - this.el.offsetTop,
        };
        this.el.style.transition = 'none';
        return;
      }

      // 控制栏和视频区域不拖拽
      if (target.closest('.bmp-controls') || target.closest('.bmp-settings-panel')) {
        return;
      }
    }

    _onMouseMove(e) {
      if (this.isDragging && this.el) {
        let x = e.clientX - this.dragOffset.x;
        let y = e.clientY - this.dragOffset.y;

        // 边界限制
        x = Math.max(0, Math.min(x, window.innerWidth - this.el.offsetWidth));
        y = Math.max(0, Math.min(y, window.innerHeight - this.el.offsetHeight));

        this.el.style.left = x + 'px';
        this.el.style.top = y + 'px';

        // 保存位置
        configManager.set('posX', x);
        configManager.set('posY', y);
        this.config.posX = x;
        this.config.posY = y;
      }

      if (this.isResizing && this.el) {
        e.preventDefault();
        const dx = e.clientX - this.resizeStart.x;
        const dy = e.clientY - this.resizeStart.y;
        const dir = this.resizeDir;
        const cfg = this.config;

        let newW = this.resizeStart.w;
        let newH = this.resizeStart.h;
        let newL = this.resizeStart.l;
        let newT = this.resizeStart.t;

        // 根据方向调整
        if (dir.includes('e')) newW = Math.max(cfg.minWidth, this.resizeStart.w + dx);
        if (dir.includes('s')) newH = Math.max(cfg.minHeight, this.resizeStart.h + dy);
        if (dir.includes('w')) {
          newW = Math.max(cfg.minWidth, this.resizeStart.w - dx);
          newL = this.resizeStart.l + (this.resizeStart.w - newW);
        }
        if (dir.includes('n')) {
          newH = Math.max(cfg.minHeight, this.resizeStart.h - dy);
          newT = this.resizeStart.t + (this.resizeStart.h - newH);
        }

        // 等比缩放
        if (cfg.lockAspectRatio && (dir === 'se' || dir === 'ne' || dir === 'sw' || dir === 'nw')) {
          const ratio = 16 / 9;
          if (Math.abs(dx) > Math.abs(dy)) {
            newH = newW / ratio;
          } else {
            newW = newH * ratio;
          }
          if (dir.includes('n')) {
            newT = this.resizeStart.t + this.resizeStart.h - newH;
          }
          if (dir.includes('w')) {
            newL = this.resizeStart.l + this.resizeStart.w - newW;
          }
        }

        this.el.style.width = newW + 'px';
        this.el.style.height = newH + 'px';
        this.el.style.left = newL + 'px';
        this.el.style.top = newT + 'px';

        // 保存尺寸
        configManager.set('width', Math.round(newW));
        configManager.set('height', Math.round(newH));
        this.config.width = Math.round(newW);
        this.config.height = Math.round(newH);
        configManager.set('posX', Math.round(newL));
        configManager.set('posY', Math.round(newT));
        this.config.posX = Math.round(newL);
        this.config.posY = Math.round(newT);
      }

      // 进度条提示
      if (this.el && e.target.closest('.bmp-progress-wrap')) {
        const wrap = this.el.querySelector('.bmp-progress-wrap');
        const tooltip = this.el.querySelector('.bmp-progress-tooltip');
        const rect = wrap.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const timeline = this._getTimelineVideo();
        if (timeline && tooltip) {
          tooltip.textContent = this._formatTime(percent * (timeline.duration || 0));
          tooltip.style.left = (percent * 100) + '%';
        }
      }
    }

    _onMouseUp(e) {
      if (this.isDragging && this.el) {
        this.isDragging = false;
        this.el.style.transition = '';
      }
      if (this.isResizing) {
        this.isResizing = false;
      }
    }

    _bindProgressEvents() {
      const wrap = this.el?.querySelector('.bmp-progress-wrap');
      if (!wrap) return;

      let isSeeking = false;

      const seek = (e) => {
        const timeline = this._getTimelineVideo();
        if (!timeline) return;
        const rect = wrap.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const duration = timeline.duration;
        if (!isFinite(duration) || duration <= 0) return;
        this._seekTo(percent * duration);
      };

      wrap.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        isSeeking = true;
        seek(e);
      });

      document.addEventListener('mousemove', (e) => {
        if (isSeeking) seek(e);
      });

      document.addEventListener('mouseup', () => {
        isSeeking = false;
      });
    }

    _bindVolumeEvents() {
      const slider = this.el?.querySelector('.bmp-volume-slider');
      const btn = this.el?.querySelector('.bmp-btn-volume');
      if (!slider || !btn) return;

      slider.addEventListener('input', (e) => {
        e.stopPropagation();
        const val = parseInt(e.target.value) / 100;
        if (this.videoEl) {
          this.videoEl.volume = val;
          this.videoEl.muted = val === 0;
        }
        if (this.config.syncVolume && this.sourceVideo) {
          this.sourceVideo.volume = val;
          this.sourceVideo.muted = val === 0;
        }
      });

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.videoEl) {
          this.videoEl.muted = !this.videoEl.muted;
          if (this.config.syncVolume && this.sourceVideo) {
            this.sourceVideo.muted = this.videoEl.muted;
          }
        }
      });
    }

    _bindSpeedEvents() {
      const btn = this.el?.querySelector('.bmp-btn-speed');
      const menu = this.el?.querySelector('.bmp-speed-menu');
      if (!btn || !menu) return;

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isSpeedMenuOpen = !this.isSpeedMenuOpen;
        menu.classList.toggle('bmp-show', this.isSpeedMenuOpen);
      });

      menu.querySelectorAll('.bmp-speed-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const speed = parseFloat(option.dataset.speed);
          if (this.sourceVideo) {
            this.sourceVideo.playbackRate = speed;
          }
          if (this.videoEl) {
            this.videoEl.playbackRate = speed;
          }
          btn.textContent = speed + 'x';
          menu.querySelectorAll('.bmp-speed-option').forEach(o => o.classList.remove('bmp-active'));
          option.classList.add('bmp-active');
          this.isSpeedMenuOpen = false;
          menu.classList.remove('bmp-show');

          configManager.set('defaultPlaybackRate', speed);
          this.config.defaultPlaybackRate = speed;
        });
      });

      // 初始化当前倍速
      const currentSpeed = this.videoEl?.playbackRate || 1;
      btn.textContent = currentSpeed + 'x';
      menu.querySelectorAll('.bmp-speed-option').forEach(o => {
        o.classList.toggle('bmp-active', parseFloat(o.dataset.speed) === currentSpeed);
      });

      // 点击外部关闭
      document.addEventListener('click', () => {
        if (this.isSpeedMenuOpen) {
          this.isSpeedMenuOpen = false;
          menu.classList.remove('bmp-show');
        }
      });
    }

    _bindSettingsEvents() {
      const panel = this.el?.querySelector('.bmp-settings-panel');
      if (!panel) return;

      // Toggle 开关
      panel.querySelectorAll('.bmp-toggle').forEach(toggle => {
        toggle.addEventListener('click', (e) => {
          e.stopPropagation();
          const key = toggle.dataset.key;
          const isOn = toggle.classList.toggle('bmp-on');
          this.config[key] = isOn;
          configManager.set(key, isOn);
          this._applyConfig();
        });
      });

      // 范围滑块
      panel.querySelectorAll('.bmp-range-input').forEach(input => {
        input.addEventListener('input', (e) => {
          e.stopPropagation();
          const key = input.dataset.key;
          let value = parseInt(input.value);
          const valueEl = panel.querySelector(`.bmp-range-value[data-key="${key}"]`);

          if (key === 'opacity') {
            this.config[key] = value / 100;
            if (valueEl) valueEl.textContent = value + '%';
          } else if (key === 'danmakuOpacity') {
            this.config[key] = value / 100;
            if (valueEl) valueEl.textContent = value + '%';
          } else if (key === 'danmakuSpeed') {
            this.config[key] = value;
            if (valueEl) valueEl.textContent = value + 's';
          } else if (key === 'danmakuFontSize') {
            this.config[key] = value;
            if (valueEl) valueEl.textContent = value + 'px';
          } else {
            this.config[key] = value;
            if (valueEl) valueEl.textContent = value;
          }

          configManager.set(key, this.config[key]);
          this._applyConfig();
        });
      });

      // 关键词屏蔽
      this._renderKeywordList();
      const kwInput = panel.querySelector('.bmp-keyword-input');
      if (kwInput) {
        kwInput.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter' && kwInput.value.trim()) {
            const keyword = kwInput.value.trim();
            if (!this.config.danmakuBlockKeywords.includes(keyword)) {
              this.config.danmakuBlockKeywords.push(keyword);
              configManager.set('danmakuBlockKeywords', this.config.danmakuBlockKeywords);
              kwInput.value = '';
              this._renderKeywordList();
            }
          }
        });
      }
    }

    _renderKeywordList() {
      const list = this.el?.querySelector('.bmp-keyword-list');
      if (!list) return;
      list.innerHTML = '';
      this.config.danmakuBlockKeywords.forEach((kw, i) => {
        const tag = document.createElement('span');
        tag.className = 'bmp-keyword-tag';
        tag.innerHTML = '';
        const kwText = document.createTextNode(kw);
        const removeSpan = document.createElement('span');
        removeSpan.className = 'bmp-keyword-remove';
        removeSpan.dataset.index = String(i);
        removeSpan.textContent = '×';
        tag.append(kwText, removeSpan);
        tag.querySelector('.bmp-keyword-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          this.config.danmakuBlockKeywords.splice(i, 1);
          configManager.set('danmakuBlockKeywords', this.config.danmakuBlockKeywords);
          this._renderKeywordList();
        });
        list.appendChild(tag);
      });
    }

    async _togglePlay() {
      const source = this._findSourceVideo() || this.sourceVideo;
      if (!this.videoEl || !source) return;

      this.sourceVideo = source;
      await this._setSourcePlayback(source.paused);
    }

    _toggleSettings(forceState) {
      const panel = this.el?.querySelector('.bmp-settings-panel');
      if (!panel) return;
      this.isSettingsOpen = forceState !== undefined ? forceState : !this.isSettingsOpen;
      panel.classList.toggle('bmp-show', this.isSettingsOpen);
    }

    _toggleMinimize() {
      if (!this.el) return;
      this.isMinimized = !this.isMinimized;
      this.el.classList.toggle('bmp-minimized', this.isMinimized);

      if (this.isMinimized) {
        this.el.style.transition = 'all 0.3s ease';
        // 暂停弹幕
        this.danmakuEngine?.stop();
      } else {
        this.el.style.transition = 'all 0.3s ease';
        // 恢复弹幕
        if (this.config.danmakuEnabled) {
          this.danmakuEngine?.start();
        }
        setTimeout(() => {
          this.el.style.transition = '';
        }, 300);
      }

      // 点击最小化圆圈恢复
      if (this.isMinimized) {
        this.el.onclick = () => {
          this._toggleMinimize();
          this.el.onclick = null;
        };
      }
    }

    _updateDanmakuButton() {
      const btn = this.el?.querySelector('.bmp-btn-danmaku');
      if (!btn) return;
      setIcon(btn, this.config.danmakuEnabled ? ICONS.danmaku : ICONS.danmakuOff);
      btn.style.opacity = this.config.danmakuEnabled ? 1 : 0.5;
    }

    _updatePinButton() {
      const btn = this.el?.querySelector('.bmp-btn-pin');
      if (!btn) return;
      btn.style.opacity = this.config.alwaysOnTop ? 1 : 0.5;
    }

    async _requestNativePiP() {
      if (!this.videoEl) return;
      try {
        if (document.pictureInPictureEnabled) {
          await this.videoEl.requestPictureInPicture();
        } else {
          console.warn('[MiniPlayer] 浏览器不支持原生画中画');
        }
      } catch (e) {
        console.warn('[MiniPlayer] 原生画中画请求失败', e);
      }
    }

    _onKeyDown(e) {
      const timeline = this._getTimelineVideo();
      if (!timeline) return;
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          this._togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this._seekTo(timeline.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this._seekTo(timeline.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.videoEl.volume = Math.min(1, this.videoEl.volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.videoEl.volume = Math.max(0, this.videoEl.volume - 0.1);
          break;
        case 'f':
          e.preventDefault();
          // 全屏模拟 - 最大化小窗
          this._maximizeWindow();
          break;
        case 'm':
          e.preventDefault();
          this.videoEl.muted = !this.videoEl.muted;
          break;
        case 'Escape':
          if (this.isSettingsOpen) this._toggleSettings(false);
          if (this.isSpeedMenuOpen) {
            this.isSpeedMenuOpen = false;
            this.el?.querySelector('.bmp-speed-menu')?.classList.remove('bmp-show');
          }
          break;
      }
    }

    _maximizeWindow() {
      if (!this.el) return;
      this.el.style.width = (window.innerWidth * 0.8) + 'px';
      this.el.style.height = (window.innerWidth * 0.8 / (16 / 9)) + 'px';
      this.el.style.left = (window.innerWidth * 0.1) + 'px';
      this.el.style.top = (window.innerHeight * 0.1) + 'px';
    }

    _ensureInBounds() {
      if (!this.el) return;
      const x = this.el.offsetLeft;
      const y = this.el.offsetTop;
      const w = this.el.offsetWidth;
      const h = this.el.offsetHeight;

      if (x + w > window.innerWidth) {
        this.el.style.left = Math.max(0, window.innerWidth - w) + 'px';
      }
      if (y + h > window.innerHeight) {
        this.el.style.top = Math.max(0, window.innerHeight - h) + 'px';
      }
    }
  }

  // ==================== 启动 ====================
  // 等待页面加载
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new MiniPlayer());
  } else {
    new MiniPlayer();
  }

})();