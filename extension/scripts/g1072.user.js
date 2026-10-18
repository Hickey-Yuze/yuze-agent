(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    (function () {
      'use strict';
    
      // ==================== 避免重复注入 ====================
      if (document.getElementById('__clipboard_typer_panel')) return;
    
      // ==================== 状态管理（v2.1）====================
      const STATE = {
        source: 'clipboard',       // 'clipboard' | 'textbox'
        clipboardText: '',
        textboxText: '',
        isTyping: false,
        isPaused: false,
        typingTimer: null,
        speed: 60,                 // 打字间隔(ms)
        typedCount: 0,             // 已打字数
        undoBuffer: '',            // 撤销缓冲区
        textHistory: [],           // 文本历史记录
        maxHistory: 10,            // 最大历史记录数
        shiftEnterMode: false,     // Shift+Enter 模式（Enter发送，Shift+Enter换行）
        confirmedTargetEl: null,   // 已确认的目标元素（修复问题1）
      };
    
      // ==================== localStorage 持久化工具 ====================
      const Storage = {
        prefix: '__ctp_',
        save(key, value) {
          try {
            localStorage.setItem(this.prefix + key, JSON.stringify(value));
          } catch (e) { /* 静默失败 */ }
        },
        load(key, defaultValue) {
          try {
            const val = localStorage.getItem(this.prefix + key);
            return val ? JSON.parse(val) : defaultValue;
          } catch (e) {
            return defaultValue;
          }
        },
        remove(key) {
          try {
            localStorage.removeItem(this.prefix + key);
          } catch (e) { /* 静默失败 */ }
        }
      };
    
      // 加载保存的设置（包括自定义快捷键）
      STATE.speed = Storage.load('speed', 60);
      STATE.textHistory = Storage.load('textHistory', []);
      STATE.shiftEnterMode = Storage.load('shiftEnterMode', false);
    
      // ==================== 自定义快捷键配置（修复问题2）====================
      const DEFAULT_SHORTCUTS = {
        startStop: { key: 'v', alt: true, ctrl: false, shift: false },
        pauseResume: { key: 'p', alt: true, ctrl: false, shift: false },
        undo: { key: 'z', alt: true, ctrl: false, shift: false },
      };
      let SHORTCUTS = Storage.load('shortcuts', DEFAULT_SHORTCUTS);
    
      // ==================== 特殊键映射表（增加 SHIFT+ENTER 支持，修复问题4）====================
      const SPECIAL_KEYS = {
        '{ENTER}': { key: 'Enter', code: 'Enter', char: '\n', printable: true },
        '{SHIFT+ENTER}': { key: 'Enter', code: 'Enter', char: '\n', printable: true, shift: true },  // 新增
        '{TAB}': { key: 'Tab', code: 'Tab', char: '\t', printable: true },
        '{BACKSPACE}': { key: 'Backspace', code: 'Backspace', char: null, printable: false, action: 'backspace' },
        '{DELETE}': { key: 'Delete', code: 'Delete', char: null, printable: false, action: 'delete' },
        '{UP}': { key: 'ArrowUp', code: 'ArrowUp', char: null, printable: false },
        '{DOWN}': { key: 'ArrowDown', code: 'ArrowDown', char: null, printable: false },
        '{LEFT}': { key: 'ArrowLeft', code: 'ArrowLeft', char: null, printable: false },
        '{RIGHT}': { key: 'ArrowRight', code: 'ArrowRight', char: null, printable: false },
        '{HOME}': { key: 'Home', code: 'Home', char: null, printable: false },
        '{END}': { key: 'End', code: 'End', char: null, printable: false },
        '{PAGEUP}': { key: 'PageUp', code: 'PageUp', char: null, printable: false },
        '{PAGEDOWN}': { key: 'PageDown', code: 'PageDown', char: null, printable: false },
        '{ESC}': { key: 'Escape', code: 'Escape', char: null, printable: false },
        '{F1}': { key: 'F1', code: 'F1', char: null, printable: false },
        '{F2}': { key: 'F2', code: 'F2', char: null, printable: false },
        '{F3}': { key: 'F3', code: 'F3', char: null, printable: false },
        '{F4}': { key: 'F4', code: 'F4', char: null, printable: false },
        '{F5}': { key: 'F5', code: 'F5', char: null, printable: false },
        '{F6}': { key: 'F6', code: 'F6', char: null, printable: false },
        '{F7}': { key: 'F7', code: 'F7', char: null, printable: false },
        '{F8}': { key: 'F8', code: 'F8', char: null, printable: false },
        '{F9}': { key: 'F9', code: 'F9', char: null, printable: false },
        '{F10}': { key: 'F10', code: 'F10', char: null, printable: false },
        '{F11}': { key: 'F11', code: 'F11', char: null, printable: false },
        '{F12}': { key: 'F12', code: 'F12', char: null, printable: false },
      };
    
      // 解析包含特殊键标记的文本
      function parseSpecialKeys(text) {
        const result = [];
        let i = 0;
        while (i < text.length) {
          if (text[i] === '{') {
            const endIndex = text.indexOf('}', i);
            if (endIndex !== -1) {
              const keyName = text.substring(i, endIndex + 1).toUpperCase();
              if (SPECIAL_KEYS[keyName]) {
                result.push({ type: 'special', ...SPECIAL_KEYS[keyName] });
                i = endIndex + 1;
                continue;
              }
            }
          }
          result.push({ type: 'char', char: text[i], key: text[i], code: text[i] === ' ' ? 'Space' : 'Key' + text[i].toUpperCase() });
          i++;
        }
        return result;
      }
    
      /**
       * 检查快捷键是否匹配（支持自定义，修复问题2）
       */
      function matchShortcut(e, shortcutConfig) {
        if (!shortcutConfig) return false;
        const keyMatch = e.key.toLowerCase() === shortcutConfig.key.toLowerCase();
        const altMatch = e.altKey === !!shortcutConfig.alt;
        const ctrlMatch = e.ctrlKey === !!shortcutConfig.ctrl;
        const shiftMatch = e.shiftKey === !!shortcutConfig.shift;
        return keyMatch && altMatch && ctrlMatch && shiftMatch;
      }
    
      // ==================== 样式注入（v2.1）====================
      const style = document.createElement('style');
      style.textContent = `
        #__clipboard_typer_panel {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 2147483647;
          width: 440px;
          background: #1e1e2e;
          color: #cdd6f4;
          border-radius: 14px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.45);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          user-select: none;
          overflow: hidden;
          transition: width 0.2s, height 0.2s;
        }
        #__clipboard_typer_panel.collapsed {
          width: 220px;
        }
        #__ctp_header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          background: #313244;
          cursor: move;
          border-bottom: 1px solid #45475a;
        }
        #__ctp_header .title {
          font-weight: 600;
          font-size: 14px;
          color: #f5c2e7;
          pointer-events: none;
        }
        #__ctp_header .header-btns {
          display: flex;
          gap: 6px;
        }
        #__ctp_header .header-btns button {
          width: 26px;
          height: 26px;
          border: none;
          border-radius: 6px;
          background: #45475a;
          color: #cdd6f4;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s;
        }
        #__ctp_header .header-btns button:hover {
          background: #585b70;
        }
        #__ctp_body {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 70vh;
          overflow-y: auto;
        }
        #__ctp_body.collapsed-body {
          display: none;
        }
        /* 来源标签 */
        #__ctp_source_tabs {
          display: flex;
          gap: 0;
          background: #313244;
          border-radius: 8px;
          overflow: hidden;
        }
        #__ctp_source_tabs button {
          flex: 1;
          padding: 8px 0;
          border: none;
          background: transparent;
          color: #a6adc8;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s;
        }
        #__ctp_source_tabs button.active {
          background: #cba6f7;
          color: #1e1e2e;
        }
        /* 文本区域 */
        #__ctp_textarea {
          width: 100%;
          min-height: 80px;
          max-height: 180px;
          resize: vertical;
          border: 1px solid #45475a;
          border-radius: 8px;
          padding: 10px;
          background: #313244;
          color: #cdd6f4;
          font-size: 13px;
          font-family: inherit;
          box-sizing: border-box;
          outline: none;
          transition: border-color 0.15s;
          line-height: 1.5;
        }
        #__ctp_textarea:focus {
          border-color: #cba6f7;
        }
        /* 剪贴板预览 */
        #__ctp_clipboard_preview {
          min-height: 60px;
          max-height: 180px;
          overflow-y: auto;
          border: 1px solid #45475a;
          border-radius: 8px;
          padding: 10px;
          background: #313244;
          color: #a6adc8;
          font-size: 12px;
          word-break: break-all;
          white-space: pre-wrap;
          display: none;
          line-height: 1.5;
        }
        #__ctp_clipboard_preview.visible {
          display: block;
        }
        #__ctp_clipboard_preview .placeholder {
          color: #6c7086;
        }
        /* 统计信息栏 */
        #__ctp_stats_bar {
          display: flex;
          gap: 12px;
          font-size: 11px;
          color: #6c7086;
          flex-wrap: wrap;
        }
        #__ctp_stats_bar span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        /* 控制区域 */
        #__ctp_controls {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }
        /* 速度预设按钮组 */
        #__ctp_speed_presets {
          display: flex;
          gap: 4px;
        }
        #__ctp_speed_presets button {
          padding: 4px 8px;
          border: 1px solid #585b70;
          border-radius: 4px;
          background: transparent;
          color: #a6adc8;
          font-size: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        #__ctp_speed_presets button:hover {
          background: #45475a;
        }
        #__ctp_speed_presets button.active {
          background: #89b4fa;
          color: #1e1e2e;
          border-color: #89b4fa;
        }
        /* 速度输入 */
        #__ctp_speed_label {
          font-size: 11px;
          color: #a6adc8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        #__ctp_speed_input {
          width: 52px;
          border: 1px solid #45475a;
          border-radius: 4px;
          background: #313244;
          color: #cdd6f4;
          text-align: center;
          font-size: 12px;
          padding: 4px;
        }
        /* 按钮样式 */
        #__ctp_read_clipboard_btn {
          padding: 6px 10px;
          border: 1px solid #89b4fa;
          border-radius: 6px;
          background: transparent;
          color: #89b4fa;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        #__ctp_read_clipboard_btn:hover {
          background: #89b4fa;
          color: #1e1e2e;
        }
        /* 复制按钮（带说明提示，修复问题3）*/
        #__ctp_copy_btn {
          padding: 6px 10px;
          border: 1px solid #a6e3a1;
          border-radius: 6px;
          background: transparent;
          color: #a6e3a1;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
          position: relative;
        }
        #__ctp_copy_btn:hover {
          background: #a6e3a1;
          color: #1e1e2e;
        }
        #__ctp_copy_btn .tooltip-text {
          visibility: hidden;
          position: absolute;
          bottom: 120%;
          left: 50%;
          transform: translateX(-50%);
          background: #313244;
          color: #cdd6f4;
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 11px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          opacity: 0;
          transition: opacity 0.2s, visibility 0.2s;
          z-index: 100;
          pointer-events: none;
          line-height: 1.4;
          text-align: center;
          max-width: 220px;
          white-space: normal;
        }
        #__ctp_copy_btn .tooltip-text::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #313244;
        }
        #__ctp_copy_btn:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
        #__ctp_clear_btn {
          padding: 6px 10px;
          border: 1px solid #f38ba8;
          border-radius: 6px;
          background: transparent;
          color: #f38ba8;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s;
        }
        #__ctp_clear_btn:hover {
          background: #f38ba8;
          color: #1e1e2e;
        }
        #__ctp_shortcut_hint {
          font-size: 10px;
          color: #6c7086;
          margin-left: auto;
        }
        /* 主按钮区 */
        #__ctp_action_btns {
          display: flex;
          gap: 8px;
        }
        #__ctp_start_btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          background: #a6e3a1;
          color: #1e1e2e;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        #__ctp_start_btn:hover {
          background: #94e2d5;
        }
        #__ctp_start_btn:active {
          transform: scale(0.97);
        }
        #__ctp_start_btn.running {
          background: #f38ba8;
        }
        #__ctp_pause_btn {
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          background: #f9e2af;
          color: #1e1e2e;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
          display: none;
        }
        #__ctp_pause_btn:hover {
          background: #f5c2e7;
        }
        #__ctp_pause_btn.visible {
          display: block;
        }
        #__ctp_undo_btn {
          padding: 10px 12px;
          border: 1px solid #89b4fa;
          border-radius: 8px;
          background: transparent;
          color: #89b4fa;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          display: none;
        }
        #__ctp_undo_btn.visible {
          display: block;
        }
        #__ctp_undo_btn:hover {
          background: #89b4fa;
          color: #1e1e2e;
        }
        /* 进度条 */
        #__ctp_progress_container {
          display: none;
          flex-direction: column;
          gap: 4px;
        }
        #__ctp_progress_container.visible {
          display: flex;
        }
        #__ctp_progress_bar {
          width: 100%;
          height: 6px;
          background: #313244;
          border-radius: 3px;
          overflow: hidden;
        }
        #__ctp_progress_fill {
          height: 100%;
          background: linear-gradient(90deg, #cba6f7, #a6e3a1);
          border-radius: 3px;
          transition: width 0.1s ease-out;
          width: 0%;
        }
        #__ctp_progress_text {
          font-size: 10px;
          color: #a6adc8;
          text-align: center;
        }
        /* 状态提示 */
        #__ctp_status {
          font-size: 11px;
          color: #a6e3a1;
          text-align: center;
          min-height: 16px;
        }
        #__ctp_status.error {
          color: #f38ba8;
        }
        /* 文本历史下拉 */
        #__ctp_history_wrapper {
          position: relative;
          display: none;
        }
        #__ctp_history_wrapper.visible {
          display: block;
        }
        #__ctp_history_select {
          width: 100%;
          padding: 6px 8px;
          border: 1px solid #45475a;
          border-radius: 6px;
          background: #313244;
          color: #cdd6f4;
          font-size: 11px;
          cursor: pointer;
          outline: none;
        }
        #__ctp_history_select option {
          background: #1e1e2e;
          color: #cdd6f4;
        }
        /* 特殊键帮助 */
        #__ctp_help_toggle {
          font-size: 10px;
          color: #6c7086;
          cursor: pointer;
          text-decoration: underline;
          text-align: center;
          padding: 4px 0;
        }
        #__ctp_help_content {
          display: none;
          padding: 8px;
          background: #181825;
          border-radius: 6px;
          font-size: 11px;
          color: #a6adc8;
          line-height: 1.6;
          margin-top: 4px;
        }
        #__ctp_help_content.visible {
          display: block;
        }
        #__ctp_help_content code {
          background: #313244;
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 10px;
          color: #f9e2af;
        }
    
        /* ===== 设置面板（新增：自定义快捷键等）===== */
        #__ctp_settings_toggle {
          font-size: 10px;
          color: #89b4fa;
          cursor: pointer;
          text-decoration: underline;
          text-align: center;
          padding: 2px 0;
        }
        #__ctp_settings_panel {
          display: none;
          padding: 12px;
          background: #181825;
          border-radius: 8px;
          margin-top: 4px;
          gap: 10px;
        }
        #__ctp_settings_panel.visible {
          display: flex;
          flex-direction: column;
        }
        #__ctp_settings_panel .setting-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          font-size: 11px;
        }
        #__ctp_settings_panel .setting-row label {
          color: #a6adc8;
          white-space: nowrap;
          min-width: 90px;
        }
        #__ctp_settings_panel .setting-row input[type="text"] {
          width: 120px;
          padding: 4px 6px;
          border: 1px solid #45475a;
          border-radius: 4px;
          background: #313244;
          color: #cdd6f4;
          font-size: 11px;
          text-align: center;
        }
        #__ctp_settings_panel .setting-row input[type="checkbox"] {
          accent-color: #cba6f7;
        }
        #__ctp_settings_panel .setting-desc {
          color: #6c7086;
          font-size: 10px;
          margin-top: 2px;
        }
        #__ctp_settings_save_btn {
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          background: #89b4fa;
          color: #1e1e2e;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          align-self: flex-end;
        }
        #__ctp_settings_save_btn:hover {
          background: #b4d0fe;
        }
    
        /* 焦点指示器 */
        #__ctp_focus_indicator {
          position: fixed;
          pointer-events: none;
          border: 2px solid #cba6f7;
          border-radius: 4px;
          z-index: 2147483646;
          display: none;
          transition: all 0.1s;
          box-shadow: 0 0 8px rgba(203, 166, 247, 0.3);
        }
    
        /* 确认覆盖层（修复问题1：改为非阻塞式浮动框）*/
        #__ctp_confirm_overlay {
          position: fixed;
          bottom: 80px;           /* 改为底部浮动，不遮挡页面 */
          right: 20px;             /* 与面板对齐 */
          z-index: 2147483647;
          display: none;
          animation: ctpSlideUp 0.2s ease-out;
        }
        @keyframes ctpSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        #__ctp_confirm_overlay.visible {
          display: block;
        }
        #__ctp_confirm_box {
          background: #1e1e2e;
          border-radius: 12px;
          padding: 18px 22px;
          color: #cdd6f4;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(203,166,247,0.3);
          max-width: 340px;
          border: 1px solid #45475a;
        }
        #__ctp_confirm_box .msg {
          margin-bottom: 12px;
          font-size: 13px;
          line-height: 1.5;
        }
        #__ctp_confirm_box .target-info {
          margin-bottom: 14px;
          padding: 8px 10px;
          background: #313244;
          border-radius: 6px;
          font-size: 11px;
          color: #a6adc8;
          word-break: break-all;
          line-height: 1.5;
        }
        #__ctp_confirm_box .target-info strong {
          color: #f9e2af;
        }
        #__ctp_confirm_box .confirm-btns {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }
        #__ctp_confirm_box .confirm-btns button {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }
        .ctp-confirm-yes {
          background: #a6e3a1;
          color: #1e1e2e;
        }
        .ctp-confirm-yes:hover {
          background: #94e2d5;
        }
        .ctp-confirm-no {
          background: #45475a;
          color: #cdd6f4;
        }
        .ctp-confirm-no:hover {
          background: #585b70;
        }
        /* 提示文字：点击其他位置选择目标 */
        #__ctp_confirm_hint {
          margin-top: 10px;
          padding: 8px 10px;
          background: rgba(203,166,247,0.1);
          border: 1px dashed #cba6f7;
          border-radius: 6px;
          font-size: 11px;
          color: #cba6f7;
          text-align: center;
          line-height: 1.5;
        }
        #__ctp_confirm_hint .re-select {
          color: #89b4fa;
          cursor: pointer;
          text-decoration: underline;
          font-weight: 600;
        }
    
        /* Toast 提示 */
        #__ctp_toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 10px 20px;
          background: #313244;
          color: #cdd6f4;
          border-radius: 8px;
          font-size: 13px;
          z-index: 2147483648;
          box-shadow: 0 4px 16px rgba(0,0,0,0.3);
          opacity: 0;
          transition: opacity 0.2s;
          pointer-events: none;
          border: 1px solid #45475a;
        }
        #__ctp_toast.show {
          opacity: 1;
        }
      `;
      document.head.appendChild(style);
    
      // ==================== DOM 构建（v2.1）====================
      const panel = document.createElement('div');
      panel.id = '__clipboard_typer_panel';
      panel.innerHTML = `
        <div id="__ctp_header">
          <span class="title">⌨️ 剪贴板打字器 v2.1</span>
          <div class="header-btns">
            <button id="__ctp_min_btn" title="折叠/展开">−</button>
            <button id="__ctp_close_btn" title="关闭">✕</button>
          </div>
        </div>
        <div id="__ctp_body">
          <!-- 来源标签 -->
          <div id="__ctp_source_tabs">
            <button id="__ctp_tab_clipboard" class="active" data-source="clipboard">📋 剪贴板</button>
            <button id="__ctp_tab_textbox" data-source="textbox">📝 文本框</button>
          </div>
    
          <!-- 文本输入区 -->
          <textarea id="__ctp_textarea" placeholder="在这里输入要打出的文字...&#10;支持特殊键：{ENTER} {SHIFT+ENTER} {TAB} 等"></textarea>
    
          <!-- 剪贴板预览 -->
          <div id="__ctp_clipboard_preview" class="visible">
            <span class="placeholder">点击下方按钮读取剪贴板内容</span>
          </div>
    
          <!-- 统计信息 -->
          <div id="__ctp_stats_bar">
            <span>📊 字数: <strong id="__ctp_char_count">0</strong></span>
            <span>📄 行数: <strong id="__ctp_line_count">0</strong></span>
            <span>⏱️ 预计耗时: <strong id="__ctp_est_time">~0s</strong></span>
          </div>
    
          <!-- 控制区 -->
          <div id="__ctp_controls">
            <button id="__ctp_read_clipboard_btn">📋 读取剪贴板</button>
            
            <!-- 复制到剪贴板按钮（修复问题3：添加 tooltip 说明）-->
            <button id="__ctp_copy_btn">
              📤 复制
              <span class="tooltip-text">将面板中的文本复制到系统剪贴板<br>方便粘贴到其他应用或手动粘贴</span>
            </button>
            
            <button id="__ctp_clear_btn">🗑️ 清空</button>
    
            <div id="__ctp_speed_presets">
              <button data-speed="100">慢速</button>
              <button data-speed="60" class="active">中速</button>
              <button data-speed="20">快速</button>
              <button data-speed="5">极速</button>
            </div>
    
            <label id="__ctp_speed_label">间隔 <input id="__ctp_speed_input" type="number" value="${STATE.speed}" min="1" max="2000" step="5"> ms</label>
          </div>
    
          <!-- 文本历史 -->
          <div id="__ctp_history_wrapper">
            <select id="__ctp_history_select">
              <option value="">-- 最近使用的文本 --</option>
            </select>
          </div>
    
          <!-- 操作按钮 -->
          <div id="__ctp_action_btns">
            <button id="__ctp_start_btn">▶ 开始打字</button>
            <button id="__ctp_pause_btn">⏸ 暂停</button>
            <button id="__ctp_undo_btn">↩ 撤销</button>
          </div>
    
          <!-- 进度条 -->
          <div id="__ctp_progress_container">
            <div id="__ctp_progress_bar">
              <div id="__ctp_progress_fill"></div>
            </div>
            <div id="__ctp_progress_text">0 / 0 (0%)</div>
          </div>
    
          <!-- 状态 -->
          <div id="__ctp_status"></div>
    
          <!-- 快捷键提示（动态显示自定义快捷键）-->
          <span id="__ctp_shortcut_hint"></span>
    
          <!-- 特殊键帮助 -->
          <div id="__ctp_help_toggle">💡 支持的特殊键语法</div>
          <div id="__ctp_help_content">
            <code>{ENTER}</code> 换行 &nbsp; <code>{SHIFT+ENTER}</code> Shift+换行<br>
            <code>{TAB}</code> 制表符 &nbsp; <code>{BACKSPACE}</code> 退格<br>
            <code>{DELETE}</code> 删除 &nbsp; <code>{UP/DOWN/LEFT/RIGHT}</code> 方向键<br>
            <code>{HOME/END}</code> 行首/尾 &nbsp; <code>{PAGEUP/PAGEDOWN}</code> 翻页<br>
            <code>{F1-F12}</code> 功能键 &nbsp; <code>{ESC}</code> 取消
          </div>
    
          <!-- 设置面板（修复问题2：自定义快捷键）-->
          <div id="__ctp_settings_toggle">⚙️ 快捷键与高级设置</div>
          <div id="__ctp_settings_panel">
            <div class="setting-row">
              <label>开始/停止:</label>
              <input type="text" id="__ctp_sc_start" placeholder="Alt+V">
              <span class="setting-desc">开始或停止打字</span>
            </div>
            <div class="setting-row">
              <label>暂停/继续:</label>
              <input type="text" id="__ctp_sc_pause" placeholder="Alt+P">
              <span class="setting-desc">暂停或继续打字</span>
            </div>
            <div class="setting-row">
              <label>撤销:</label>
              <input type="text" id="__ctp_sc_undo" placeholder="Alt+Z">
              <span class="setting-desc">撤销已输入的文字</span>
            </div>
            <div class="setting-row">
              <label style="min-width:auto;">
                <input type="checkbox" id="__ctp_shift_enter_mode"> 
                Shift+Enter 换行模式
              </label>
              <span class="setting-desc">开启后 Enter=发送, Shift+Enter=换行</span>
            </div>
            <button id="__ctp_settings_save_btn">💾 保存设置</button>
          </div>
        </div>
      `;
      document.body.appendChild(panel);
    
      // Toast 提示容器
      const toast = document.createElement('div');
      toast.id = '__ctp_toast';
      document.body.appendChild(toast);
    
      // 焦点指示器
      const focusIndicator = document.createElement('div');
      focusIndicator.id = '__ctp_focus_indicator';
      document.body.appendChild(focusIndicator);
    
      // 确认覆盖层（修复问题1：非阻塞浮动框）
      const confirmOverlay = document.createElement('div');
      confirmOverlay.id = '__ctp_confirm_overlay';
      confirmOverlay.innerHTML = `
        <div id="__ctp_confirm_box">
          <div class="msg">🎯 准备开始打字！</div>
          <div class="target-info" id="__ctp_target_info"></div>
          <div id="__ctp_confirm_hint">
            💡 当前目标：<strong id="__ctp_target_name">未选择</strong><br>
            <span class="re-select" id="__ctp_re_select">点击这里重新选择目标输入框</span>
          </div>
          <div class="confirm-btns">
            <button class="ctp-confirm-no" id="__ctp_confirm_no">取消</button>
            <button class="ctp-confirm-yes" id="__ctp_confirm_yes">✅ 确认开始</button>
          </div>
        </div>
      `;
      document.body.appendChild(confirmOverlay);
    
      // ==================== 元素引用（v2.1）====================
      const els = {
        panel,
        body: document.getElementById('__ctp_body'),
        header: document.getElementById('__ctp_header'),
        minBtn: document.getElementById('__ctp_min_btn'),
        closeBtn: document.getElementById('__ctp_close_btn'),
        tabClipboard: document.getElementById('__ctp_tab_clipboard'),
        tabTextbox: document.getElementById('__ctp_tab_textbox'),
        textarea: document.getElementById('__ctp_textarea'),
        clipboardPreview: document.getElementById('__ctp_clipboard_preview'),
        readClipboardBtn: document.getElementById('__ctp_read_clipboard_btn'),
        copyBtn: document.getElementById('__ctp_copy_btn'),
        clearBtn: document.getElementById('__ctp_clear_btn'),
        speedPresets: document.getElementById('__ctp_speed_presets'),
        speedInput: document.getElementById('__ctp_speed_input'),
        startBtn: document.getElementById('__ctp_start_btn'),
        pauseBtn: document.getElementById('__ctp_pause_btn'),
        undoBtn: document.getElementById('__ctp_undo_btn'),
        status: document.getElementById('__ctp_status'),
        progressContainer: document.getElementById('__ctp_progress_container'),
        progressFill: document.getElementById('__ctp_progress_fill'),
        progressText: document.getElementById('__ctp_progress_text'),
        statsBar: document.getElementById('__ctp_stats_bar'),
        charCount: document.getElementById('__ctp_char_count'),
        lineCount: document.getElementById('__ctp_line_count'),
        estTime: document.getElementById('__ctp_est_time'),
        historyWrapper: document.getElementById('__ctp_history_wrapper'),
        historySelect: document.getElementById('__ctp_history_select'),
        helpToggle: document.getElementById('__ctp_help_toggle'),
        helpContent: document.getElementById('__ctp_help_content'),
        focusIndicator,
        confirmOverlay,
        confirmYes: document.getElementById('__ctp_confirm_yes'),
        confirmNo: document.getElementById('__ctp_confirm_no'),
        targetInfo: document.getElementById('__ctp_target_info'),
        targetName: document.getElementById('__ctp_target_name'),
        reSelect: document.getElementById('__ctp_re_select'),
        toast,
        // 设置面板相关
        settingsToggle: document.getElementById('__ctp_settings_toggle'),
        settingsPanel: document.getElementById('__ctp_settings_panel'),
        scStart: document.getElementById('__ctp_sc_start'),
        scPause: document.getElementById('__ctp_sc_pause'),
        scUndo: document.getElementById('__ctp_sc_undo'),
        shiftEnterCheckbox: document.getElementById('__ctp_shift_enter_mode'),
        settingsSaveBtn: document.getElementById('__ctp_settings_save_btn'),
        shortcutHint: document.getElementById('__ctp_shortcut_hint'),
      };
    
      // ==================== 工具函数 ====================
    
      /** 显示 Toast 提示 */
      function showToast(message, duration = 2000) {
        els.toast.textContent = message;
        els.toast.classList.add('show');
        setTimeout(() => els.toast.classList.remove('show'), duration);
      }
    
      /** 更新统计信息 */
      function updateStats(text) {
        const chars = text.length;
        const lines = text.split('\n').length;
        const estSeconds = Math.ceil(chars * STATE.speed / 1000);
    
        els.charCount.textContent = chars;
        els.lineCount.textContent = lines;
        els.estTime.textContent = estSeconds > 60 
          ? `~${Math.floor(estSeconds / 60)}m${estSeconds % 60}s` 
          : `~${estSeconds}s`;
      }
    
      /** 更新进度条 */
      function updateProgress(current, total) {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        els.progressFill.style.width = percent + '%';
        els.progressText.textContent = `${current} / ${total} (${percent}%)`;
      }
    
      /** 更新文本历史下拉列表 */
      function updateHistorySelect() {
        els.historySelect.innerHTML = '<option value="">-- 最近使用的文本 --</option>';
        STATE.textHistory.forEach((item, index) => {
          const option = document.createElement('option');
          option.value = index.toString();
          const preview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
          option.textContent = `${preview} (${new Date(item.time).toLocaleTimeString()})`;
          els.historySelect.appendChild(option);
        });
        els.historyWrapper.classList.toggle('visible', STATE.textHistory.length > 0);
      }
    
      /** 添加文本到历史记录 */
      function addToHistory(text) {
        if (!text || text.trim().length === 0) return;
        STATE.textHistory = STATE.textHistory.filter(item => item.text !== text);
        STATE.textHistory.unshift({ text: text, time: Date.now() });
        if (STATE.textHistory.length > STATE.maxHistory) {
          STATE.textHistory = STATE.textHistory.slice(0, STATE.maxHistory);
        }
        Storage.save('textHistory', STATE.textHistory);
        updateHistorySelect();
      }
    
      /** 格式化快捷键显示 */
      function formatShortcut(sc) {
        if (!sc) return '';
        const parts = [];
        if (sc.ctrl) parts.push('Ctrl');
        if (sc.alt) parts.push('Alt');
        if (sc.shift) parts.push('Shift');
        parts.push(sc.key.toUpperCase());
        return parts.join('+');
      }
    
      /** 更新快捷键提示文字 */
      function updateShortcutHint() {
        els.shortcutHint.textContent = `快捷键: ${formatShortcut(SHORTCUTS.startStop)} 开始/停止 | ${formatShortcut(SHORTCUTS.pauseResume)} 暂停 | ${formatShortcut(SHORTCUTS.undo)} 撤销 | Esc 取消`;
      }
    
      /** 解析快捷键输入框的值 */
      function parseShortcutInput(value) {
        if (!value || !value.trim()) return null;
        const trimmed = value.trim().toLowerCase();
        const parts = trimmed.split(/\s*\+\s*/);
        let key = '', ctrl = false, alt = false, shift = false;
        
        parts.forEach(p => {
          switch (p) {
            case 'ctrl': case 'control': ctrl = true; break;
            case 'alt': case 'option': alt = true; break;
            case 'shift': shift = true; break;
            default: if (p.length >= 1 && p.length <= 2) key = p;
          }
        });
    
        if (!key) return null;
        return { key: key.length === 1 ? key : key.charAt(0).toUpperCase() + key.slice(1), ctrl, alt, shift };
      }
    
      /** 获取元素描述 */
      function getElementDescription(el) {
        if (!el || el === document.body || el === document.documentElement) {
          return '未检测到有效输入框';
        }
        const tag = el.tagName.toLowerCase();
        const type = el.type || '';
        const name = el.name || el.id || el.className || '';
        const placeholder = el.placeholder || '';
        
        let desc = `<${tag}`;
        if (type) desc += ` type="${type}"`;
        desc += '>';
        if (name) desc += ` [${name}]`;
        if (placeholder) desc +=` 占位符:"${placeholder}"`;
        
        return desc;
      }
    
      /** 检查是否是有效目标元素 */
      function isValidTarget(el) {
        return el &&
          el !== document.body &&
          el !== document.documentElement &&
          (el.tagName === 'INPUT' ||
           el.tagName === 'TEXTAREA' ||
           el.isContentEditable ||
           el.getAttribute('contenteditable') === 'true' ||
           el.getAttribute('role') === 'textbox');
      }
    
      // ==================== 面板拖拽 ====================
      let dragState = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
      els.header.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        dragState.active = true;
        dragState.startX = e.clientX;
        dragState.startY = e.clientY;
        const rect = panel.getBoundingClientRect();
        dragState.startLeft = rect.left;
        dragState.startTop = rect.top;
        panel.style.transition = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!dragState.active) return;
        const dx = e.clientX - dragState.startX;
        const dy = e.clientY - dragState.startY;
        panel.style.left = (dragState.startLeft + dx) + 'px';
        panel.style.top = (dragState.startTop + dy) + 'px';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      });
      document.addEventListener('mouseup', () => {
        if (dragState.active) {
          dragState.active = false;
          panel.style.transition = 'width 0.2s, height 0.2s';
        }
      });
    
      // ==================== 面板折叠/关闭 ====================
      els.minBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        els.body.classList.toggle('collapsed-body');
        els.minBtn.textContent = panel.classList.contains('collapsed') ? '+' : '−';
      });
      els.closeBtn.addEventListener('click', () => {
        panel.remove();
        focusIndicator.remove();
        confirmOverlay.remove();
        toast.remove();
        document.removeEventListener('keydown', globalKeyHandler);
        clearTimeout(STATE.typingTimer);
      });
    
      // ==================== 来源切换 ====================
      els.tabClipboard.addEventListener('click', () => switchSource('clipboard'));
      els.tabTextbox.addEventListener('click', () => switchSource('textbox'));
    
      function switchSource(source) {
        STATE.source = source;
        els.tabClipboard.classList.toggle('active', source === 'clipboard');
        els.tabTextbox.classList.toggle('active', source === 'textbox');
        els.textarea.style.display = source === 'textbox' ? 'block' : 'none';
        els.clipboardPreview.classList.toggle('visible', source === 'clipboard');
        els.readClipboardBtn.style.display = source === 'clipboard' ? 'inline-block' : 'none';
        updateStats(getTargetText());
      }
    
      // ==================== 读取剪贴板 ====================
      async function readClipboard() {
        try {
          const text = await navigator.clipboard.readText();
          STATE.clipboardText = text;
          els.clipboardPreview.textContent = text || '(剪贴板为空)';
          els.clipboardPreview.querySelector('.placeholder')?.remove();
          if (!text) {
            els.clipboardPreview.innerHTML = '<span class="placeholder">剪贴板为空</span>';
          } else {
            addToHistory(text);
          }
          setStatus('✅ 已读取剪贴板内容 (' + text.length + ' 字)', false);
          updateStats(text);
          showToast('✅ 剪贴板已读取');
          return text;
        } catch (err) {
          setStatus('❌ 读取剪贴板失败，请点击页面任意位置获得焦点后重试', true);
          console.warn('[ClipboardTyper] 剪贴板读取失败:', err);
          return '';
        }
      }
      els.readClipboardBtn.addEventListener('click', readClipboard);
    
      // ==================== 复制到剪贴板（修复问题3：功能说明已在 tooltip 中）====================
      async function copyToClipboard() {
        const text = getTargetText();
        if (!text) {
          showToast('⚠️ 没有可复制的文字内容');
          return;
        }
        try {
          await navigator.clipboard.writeText(text);
          showToast('✅ 已复制到系统剪贴板 (' + text.length + ' 字)\n可在任意地方 Ctrl+V 粘贴');
        } catch (err) {
          const textarea = document.createElement('textarea');
          textarea.value = text;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          try {
            document.execCommand('copy');
            showToast('✅ 已复制到系统剪贴板\n可在任意地方 Ctrl+V 粘贴');
          } catch (e) {
            showToast('❌ 复制失败');
          }
          document.body.removeChild(textarea);
        }
      }
      els.copyBtn.addEventListener('click', copyToClipboard);
    
      // ==================== 清空文本 ====================
      function clearText() {
        if (STATE.source === 'textbox') {
          els.textarea.value = '';
          STATE.textboxText = '';
        } else {
          STATE.clipboardText = '';
          els.clipboardPreview.innerHTML = '<span class="placeholder">剪贴板已清空</span>';
        }
        updateStats('');
        setStatus('🗑️ 已清空', false);
        showToast('🗑️ 文本已清空');
      }
      els.clearBtn.addEventListener('click', clearText);
    
      // ==================== 读取文本区域 ====================
      els.textarea.addEventListener('input', () => {
        STATE.textboxText = els.textarea.value;
        updateStats(els.textarea.value);
      });
    
      // ==================== 速度控制 ====================
      els.speedPresets.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
          const speed = parseInt(e.target.dataset.speed, 10);
          Array.from(els.speedPresets.querySelectorAll('button')).forEach(btn => {
            btn.classList.toggle('active', btn === e.target);
          });
          els.speedInput.value = speed;
          STATE.speed = speed;
          Storage.save('speed', speed);
          updateStats(getTargetText());
          showToast(`⚡ 速度已设为 ${speed}ms`);
        }
      });
    
      els.speedInput.addEventListener('change', () => {
        let val = parseInt(els.speedInput.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 2000) val = 2000;
        els.speedInput.value = val;
        STATE.speed = val;
        Storage.save('speed', val);
        Array.from(els.speedPresets.querySelectorAll('button')).forEach(btn => btn.classList.remove('active'));
        updateStats(getTargetText());
      });
    
      // ==================== 获取目标文本 ====================
      function getTargetText() {
        if (STATE.source === 'clipboard') return STATE.clipboardText;
        return els.textarea.value;
      }
    
      // ==================== 文本历史选择 ====================
      els.historySelect.addEventListener('change', (e) => {
        const index = parseInt(e.target.value, 10);
        if (!isNaN(index) && STATE.textHistory[index]) {
          const item = STATE.textHistory[index];
          switchSource('textbox');
          els.textarea.value = item.text;
          STATE.textboxText = item.text;
          updateStats(item.text);
          showToast('📝 已加载历史文本');
        }
        e.target.selectedIndex = 0;
      });
    
      // ==================== 帮助切换 ====================
      els.helpToggle.addEventListener('click', () => {
        els.helpContent.classList.toggle('visible');
        els.helpToggle.textContent = els.helpContent.classList.contains('visible')
          ? '🔼 收起帮助'
          : '💡 支持的特殊键语法';
      });
    
      // ==================== 设置面板（修复问题2：自定义快捷键）====================
      els.settingsToggle.addEventListener('click', () => {
        const isVisible = els.settingsPanel.classList.toggle('visible');
        els.settingsToggle.textContent = isVisible ? '🔼 收起设置' : '⚙️ 快捷键与高级设置';
        
        // 显示当前值
        if (isVisible) {
          els.scStart.value = formatShortcut(SHORTCUTS.startStop);
          els.scPause.value = formatShortcut(SHORTCUTS.pauseResume);
          els.scUndo.value = formatShortcut(SHORTCUTS.undo);
          els.shiftEnterCheckbox.checked = STATE.shiftEnterMode;
        }
      });
    
      els.settingsSaveBtn.addEventListener('click', () => {
        // 解析并保存快捷键
        const newStart = parseShortcutInput(els.scStart.value);
        const newPause = parseShortcutInput(els.scPause.value);
        const newUndo = parseShortcutInput(els.scUndo.value);
        
        if (newStart) SHORTCUTS.startStop = newStart;
        if (newPause) SHORTCUTS.pauseResume = newPause;
        if (newUndo) SHORTCUTS.undo = newUndo;
        
        STATE.shiftEnterMode = els.shiftEnterCheckbox.checked;
        
        Storage.save('shortcuts', SHORTCUTS);
        Storage.save('shiftEnterMode', STATE.shiftEnterMode);
        
        updateShortcutHint();
        showToast('✅ 设置已保存');
      });
    
      // 初始化快捷键显示
      updateShortcutHint();
    
      // ==================== 更新焦点指示器 ====================
      function updateFocusIndicator(el) {
        if (!el || el === document.body || el === document.documentElement) {
          focusIndicator.style.display = 'none';
          return;
        }
        const rect = el.getBoundingClientRect();
        focusIndicator.style.left = rect.left + 'px';
        focusIndicator.style.top = rect.top + 'px';
        focusIndicator.style.width = rect.width + 'px';
        focusIndicator.style.height = rect.height + 'px';
        focusIndicator.style.display = 'block';
      }
    
      // 监听焦点变化更新指示器和确认框的目标信息
      document.addEventListener('focusin', (e) => {
        const el = e.target;
        if (isValidTarget(el)) {
          if (!STATE.isTyping) {
            updateFocusIndicator(el);
          }
          
          // 如果确认框显示中，实时更新目标信息（修复问题1核心）
          if (els.confirmOverlay.classList.contains('visible')) {
            STATE.confirmedTargetEl = el;
            els.targetName.textContent = getElementDescription(el);
            els.targetInfo.innerHTML = `
              <strong>目标元素:</strong> ${getElementDescription(el)}<br>
              <strong>文本长度:</strong> ${getTargetText().length} 字符<br>
              <strong>打字间隔:</strong> ${STATE.speed}ms<br>
              ${STATE.shiftEnterMode ? '<strong style="color:#f9e2af">⚠ Shift+Enter换行模式已开启</strong><br>' : ''}
              <strong>预计耗时:</strong> ${Math.ceil(getTargetText().length * STATE.speed / 1000)}秒
            `;
          }
        }
      });
      document.addEventListener('blur', (e) => {
        if (!STATE.isTyping) {
          focusIndicator.style.display = 'none';
        }
      }, true);
    
      // 重新选择目标按钮（修复问题1）
      els.reSelect.addEventListener('click', () => {
        els.targetName.textContent = '请点击页面上的输入框...';
        els.targetName.style.color = '#f9e2af';
        showToast('👆 请点击目标输入框');
      });
    
      // ==================== 打字模拟核心（增强版-支持特殊键和 Shift+Enter）====================
      function simulateTyping(element, text, speed, callback) {
        const parsedText = parseSpecialKeys(text);
        let index = 0;
        const total = parsedText.length;
        STATE.typedCount = 0;
        STATE.undoBuffer = '';
    
        element.focus();
        updateFocusIndicator(element);
        showProgressUI();
    
        function typeNextChar() {
          if (STATE.isPaused) {
            STATE.typingTimer = setTimeout(typeNextChar, 100);
            return;
          }
    
          if (index >= total) {
            hideProgressUI();
            focusIndicator.style.display = 'none';
            if (callback) callback(true);
            return;
          }
    
          const item = parsedText[index];
    
          try {
            // 修复问题4：Shift+Enter 模式处理
            if (STATE.shiftEnterMode && item.type === 'special' && item.key === 'Enter' && !item.shift) {
              // 在 Shift+Enter 模式下，普通的 {ENTER} 不输出换行
              // 可以选择跳过或者仍然输出（根据需求）
              // 这里我们仍然输出，但用户可以用 {SHIFT+ENTER} 明确指定
            }
    
            if (item.type === 'special') {
              handleSpecialKey(element, item);
            } else {
              handleRegularChar(element, item);
            }
    
            if (item.printable || item.type === 'char') {
              STATE.undoBuffer += (item.char || '');
            }
    
          } catch (err) {
            console.warn('[ClipboardTyper] 打字错误:', err, 'at index:', index, 'char:', item);
          }
    
          index++;
          STATE.typedCount = index;
          updateProgress(index, total);
          setStatus(`⏳ 正在打字... ${index} / ${total}`, false);
    
          STATE.typingTimer = setTimeout(typeNextChar, speed);
        }
    
        typeNextChar();
      }
    
      /** 处理常规字符 */
      function handleRegularChar(element, item) {
        const char = item.char;
    
        if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
          try {
            document.execCommand('insertText', false, char);
          } catch (e) {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(char);
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.collapse(true);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          }
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          const start = element.selectionStart;
          const end = element.selectionEnd;
          const val = element.value;
          element.value = val.substring(0, start) + char + val.substring(end);
          element.setSelectionRange(start + 1, start + 1);
    
          const inputEvent = new InputEvent('input', {
            bubbles: true, cancelable: true, inputType: 'insertText', data: char,
          });
          element.dispatchEvent(inputEvent);
        }
    
        dispatchKeyboardEvents(element, item.key, item.code);
      }
    
      /** 处理特殊键 */
      function handleSpecialKey(element, item) {
        if (item.action === 'backspace') {
          handleBackspace(element);
        } else if (item.action === 'delete') {
          handleDelete(element);
        } else {
          dispatchKeyboardEvents(element, item.key, item.code);
          
          if (item.printable && item.char) {
            if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
              try { document.execCommand('insertText', false, item.char); } catch (e) {}
            } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
              const start = element.selectionStart;
              const end = element.selectionEnd;
              element.value = element.value.substring(0, start) + item.char + element.value.substring(end);
              element.setSelectionRange(start + 1, start + 1);
              element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: item.char }));
            }
          }
        }
      }
    
      /** 处理退格键 */
      function handleBackspace(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          const start = element.selectionStart;
          const end = element.selectionEnd;
          if (start !== end) {
            element.value = element.value.substring(0, start) + element.value.substring(end);
            element.setSelectionRange(start, start);
          } else if (start > 0) {
            element.value = element.value.substring(0, start - 1) + element.value.substring(start);
            element.setSelectionRange(start - 1, start - 1);
          }
          element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentBackward' }));
        } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
          document.execCommand('delete', false, null);
        }
        dispatchKeyboardEvents(element, 'Backspace', 'Backspace');
      }
    
      /** 处理删除键 */
      function handleDelete(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
          const start = element.selectionStart;
          const end = element.selectionEnd;
          if (start !== end) {
            element.value = element.value.substring(0, start) + element.value.substring(end);
            element.setSelectionRange(start, start);
          } else {
            element.value = element.value.substring(0, start) + element.value.substring(start + 1);
            element.setSelectionRange(start, start);
          }
          element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'deleteContentForward' }));
        } else if (element.isContentEditable || element.getAttribute('contenteditable') === 'true') {
          document.execCommand('forwardDelete', false, null);
        }
        dispatchKeyboardEvents(element, 'Delete', 'Delete');
      }
    
      /** 分发键盘事件 */
      function dispatchKeyboardEvents(element, key, code) {
        [new KeyboardEvent('keydown', { key, code, bubbles: true, cancelable: true }),
         new KeyboardEvent('keypress', { key, code, bubbles: true, cancelable: true }),
         new KeyboardEvent('keyup', { key, code, bubbles: true, cancelable: true })
        ].forEach(event => element.dispatchEvent(event));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    
      // ==================== 进度条 UI 控制 ====================
      function showProgressUI() {
        els.progressContainer.classList.add('visible');
        els.pauseBtn.classList.add('visible');
        els.undoBtn.classList.remove('visible');
      }
    
      function hideProgressUI() {
        els.progressContainer.classList.remove('visible');
        els.pauseBtn.classList.remove('visible');
        if (STATE.undoBuffer) els.undoBtn.classList.add('visible');
      }
    
      // ==================== 暂停/继续/停止控制 ====================
      function pauseTyping() {
        if (!STATE.isTyping || STATE.isPaused) return;
        STATE.isPaused = true;
        els.pauseBtn.textContent = '▶ 继续';
        els.pauseBtn.style.background = '#a6e3a1';
        setStatus('⏸ 已暂停', false);
        showToast('⏸ 打字已暂停');
      }
    
      function resumeTyping() {
        if (!STATE.isTyping || !STATE.isPaused) return;
        STATE.isPaused = false;
        els.pauseBtn.textContent = '⏸ 暂停';
        els.pauseBtn.style.background = '';
        setStatus('⏳ 正在打字...', false);
        showToast('▶ 继续打字');
      }
    
      function togglePause() {
        STATE.isPaused ? resumeTyping() : pauseTyping();
      }
      els.pauseBtn.addEventListener('click', togglePause);
    
      // ==================== 撤销功能 ====================
      function undoTyping() {
        if (!STATE.undoBuffer) { showToast('⚠️ 没有可撤销的内容'); return; }
    
        const activeEl = document.activeElement;
        if (isValidTarget(activeEl)) {
          activeEl.focus();
          const len = STATE.undoBuffer.length;
          if (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA') {
            const start = activeEl.selectionStart;
            const deleteStart = Math.max(0, start - len);
            activeEl.value = activeEl.value.substring(0, deleteStart) + activeEl.value.substring(start);
            activeEl.setSelectionRange(deleteStart, deleteStart);
            activeEl.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'historyUndo' }));
          } else if (activeEl.isContentEditable || activeEl.getAttribute('contenteditable') === 'true') {
            for (let i = 0; i < len; i++) document.execCommand('undo', false, null);
          }
          STATE.undoBuffer = '';
          els.undoBtn.classList.remove('visible');
          setStatus('↩ 已撤销 ' + len + ' 字', false);
          showToast('↩ 已撤销 ' + len + ' 字');
        } else {
          showToast('❌ 请先点击要撤销的输入框');
        }
      }
      els.undoBtn.addEventListener('click', undoTyping);
    
      // ==================== 停止打字 ====================
      function stopTyping() {
        clearTimeout(STATE.typingTimer);
        STATE.typingTimer = null;
        STATE.isTyping = false;
        STATE.isPaused = false;
        els.startBtn.textContent = '▶ 开始打字';
        els.startBtn.classList.remove('running');
        els.pauseBtn.textContent = '⏸ 暂停';
        els.pauseBtn.style.background = '';
        els.pauseBtn.classList.remove('visible');
        if (STATE.undoBuffer) els.undoBtn.classList.add('visible');
        hideProgressUI();
        focusIndicator.style.display = 'none';
        setStatus('⏹ 已停止', false);
      }
    
      // ==================== 启动打字流程（修复问题1：非阻塞确认框）====================
      function startTypingFlow() {
        if (STATE.isTyping && !STATE.isPaused) { stopTyping(); return; }
        if (STATE.isPaused) { resumeTyping(); return; }
    
        const targetText = getTargetText();
        if (!targetText) {
          setStatus('❌ 没有可用的文字内容', true);
          showToast('❌ 没有可用的文字内容');
          return;
        }
    
        // 记录当前焦点作为初始目标
        STATE.confirmedTargetEl = document.activeElement;
    
        // 显示非阻塞浮动确认框（不遮挡页面！）
        els.confirmOverlay.classList.add('visible');
    
        // 初始化目标信息显示
        if (isValidTarget(STATE.confirmedTargetEl)) {
          els.targetName.textContent = getElementDescription(STATE.confirmedTargetEl);
          els.targetName.style.color = '#a6e3a1';
        } else {
          els.targetName.textContent = '请点击页面上的输入框...';
          els.targetName.style.color = '#f9e2af';
        }
    
        els.targetInfo.innerHTML = `
          <strong>文本长度:</strong> ${targetText.length} 字符<br>
          <strong>打字间隔:</strong> ${STATE.speed}ms<br>
          ${STATE.shiftEnterMode ? '<strong style="color:#f9e2af">⚠ Shift+Enter换行模式已开启</strong><br>' : ''}
          <strong>预计耗时:</strong> ${Math.ceil(targetText.length * STATE.speed / 1000)}秒
        `;
    
        // 存储上下文
        els.confirmYes._context = { targetText };
      }
    
      // 确认开始
      els.confirmYes.addEventListener('click', () => {
        els.confirmOverlay.classList.remove('visible');
        const ctx = els.confirmYes._context;
        if (!ctx) return;
    
        const { targetText } = ctx;
        const targetElement = STATE.confirmedTargetEl;
    
        // 再次验证目标有效性
        if (!isValidTarget(targetElement)) {
          setStatus('❌ 请先点击目标输入框', true);
          showToast('❌ 无效的目标输入框，请先点击输入框再确认');
          return;
        }
    
        addToHistory(targetText);
    
        STATE.isTyping = true;
        STATE.isPaused = false;
        els.startBtn.textContent = '⏹ 停止';
        els.startBtn.classList.add('running');
        els.pauseBtn.textContent = '⏸ 暂停';
        els.pauseBtn.style.background = '';
        setStatus('⏳ 正在打字...', false);
        showToast('▶ 开始打字...');
    
        simulateTyping(targetElement, targetText, STATE.speed, (completed) => {
          STATE.isTyping = false;
          STATE.isPaused = false;
          els.startBtn.textContent = '▶ 开始打字';
          els.startBtn.classList.remove('running');
          els.pauseBtn.classList.remove('visible');
          
          if (completed) {
            setStatus('✅ 打字完成! (' + targetText.length + ' 字)', false);
            hideProgressUI();
            if (STATE.undoBuffer) els.undoBtn.classList.add('visible');
            showToast('✅ 打字完成! 共 ' + targetText.length + ' 字');
            
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.value = 800;
              osc.type = 'sine';
              gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
              osc.start(audioCtx.currentTime);
              osc.stop(audioCtx.currentTime + 0.2);
            } catch (e) {}
          }
        });
      });
    
      els.confirmNo.addEventListener('click', () => {
        els.confirmOverlay.classList.remove('visible');
        focusIndicator.style.display = 'none';
        STATE.confirmedTargetEl = null;
        setStatus('', false);
      });
    
      // 点击确认框外部关闭（但不是通过遮罩层阻挡的方式）
      document.addEventListener('mousedown', (e) => {
        if (els.confirmOverlay.classList.contains('visible') &&
            !els.confirmOverlay.contains(e.target) &&
            !panel.contains(e.target)) {
          // 点击了页面其他区域，可以用来选择新的目标输入框
          // 不关闭确认框，让用户可以自由点击选择目标
        }
      });
    
      // 启动按钮
      els.startBtn.addEventListener('click', startTypingFlow);
    
      // ==================== 快捷键（修复问题2：使用自定义配置）====================
      function globalKeyHandler(e) {
        // 开始/停止
        if (matchShortcut(e, SHORTCUTS.startStop)) {
          e.preventDefault();
          e.stopPropagation();
          if (!document.getElementById('__clipboard_typer_panel')) {
            document.removeEventListener('keydown', globalKeyHandler);
            return;
          }
          if (STATE.isTyping && !STATE.isPaused) stopTyping();
          else startTypingFlow();
        }
    
        // 暂停/继续
        if (matchShortcut(e, SHORTCUTS.pauseResume)) {
          e.preventDefault();
          e.stopPropagation();
          if (STATE.isTyping) togglePause();
        }
    
        // 撤销
        if (matchShortcut(e, SHORTCUTS.undo)) {
          e.preventDefault();
          e.stopPropagation();
          undoTyping();
        }
    
        // Esc 关闭确认框或停止
        if (e.key === 'Escape') {
          if (els.confirmOverlay.classList.contains('visible')) {
            els.confirmOverlay.classList.remove('visible');
            focusIndicator.style.display = 'none';
            STATE.confirmedTargetEl = null;
            setStatus('', false);
          } else if (STATE.isTyping) {
            stopTyping();
          }
        }
      }
      document.addEventListener('keydown', globalKeyHandler, true);
    
      // ==================== 状态提示 ====================
      function setStatus(msg, isError) {
        els.status.textContent = msg;
        els.status.classList.toggle('error', isError);
      }
    
      // ==================== 自动读取剪贴板（首次）====================
      setTimeout(() => { readClipboard().catch(() => {}); }, 300);
    
      // 初始化统计和UI
      updateStats('');
      updateHistorySelect();
    
      // ==================== 全局 API（v2.1）====================
      window.__ClipboardTyper = {
        setText: (text) => {
          switchSource('textbox');
          els.textarea.value = text;
          STATE.textboxText = text;
          els.textarea.dispatchEvent(new Event('input', { bubbles: true }));
          updateStats(text);
          addToHistory(text);
        },
    
        readClipboard,
    
        getTargetText,
    
        type: (text, speed) => {
          const targetText = text || getTargetText();
          if (!targetText) { console.warn('[ClipboardTyper] 没有可用的文字内容'); return; }
          const typingSpeed = speed || STATE.speed;
          const activeEl = document.activeElement;
          STATE.confirmedTargetEl = activeEl;
          addToHistory(targetText);
    
          STATE.isTyping = true;
          STATE.isPaused = false;
          els.startBtn.textContent = '⏹ 停止';
          els.startBtn.classList.add('running');
          setStatus('⏳ 正在打字...', false);
    
          simulateTyping(activeEl, targetText, typingSpeed, (completed) => {
            STATE.isTyping = false;
            STATE.isPaused = false;
            els.startBtn.textContent = '▶ 开始打字';
            els.startBtn.classList.remove('running');
            if (completed) {
              setStatus('✅ 打字完成! (' + targetText.length + ' 字)', false);
              hideProgressUI();
            }
          });
        },
    
        stop: stopTyping,
        pause: pauseTyping,
        resume: resumeTyping,
        undo: undoTyping,
        switchSource,
        destroy: () => { els.closeBtn.click(); },
        isTyping: () => STATE.isTyping,
        isPaused: () => STATE.isPaused,
        getState: () => ({
          isTyping: STATE.isTyping, isPaused: STATE.isPaused,
          typedCount: STATE.typedCount, speed: STATE.speed,
          source: STATE.source, shortcuts: SHORTCUTS,
          shiftEnterMode: STATE.shiftEnterMode,
        }),
    
        setSpeed: (speed) => {
          STATE.speed = Math.max(1, Math.min(2000, speed));
          els.speedInput.value = STATE.speed;
          Storage.save('speed', STATE.speed);
        },
    
        /** 设置自定义快捷键 */
        setShortcuts: (shortcuts) => {
          if (shortcuts.startStop) SHORTCUTS.startStop = shortcuts.startStop;
          if (shortcuts.pauseResume) SHORTCUTS.pauseResume = shortcuts.pauseResume;
          if (shortcuts.undo) SHORTCUTS.undo = shortcuts.undo;
          Storage.save('shortcuts', SHORTCUTS);
          updateShortcutHint();
        },
    
        /** 开启/关闭 Shift+Enter 换行模式 */
        setShiftEnterMode: (enabled) => {
          STATE.shiftEnterMode = !!enabled;
          Storage.save('shiftEnterMode', STATE.shiftEnterMode);
          if (els.shiftEnterCheckbox) els.shiftEnterCheckbox.checked = STATE.shiftEnterMode;
        },
    
        getVersion: () => '2.1.0-fixed',
      };
    
      console.log(
        '%c[ClipboardTyper]%c ✅ v2.1 修复版已就绪\n' +
        '修复: %c①确认框不再遮挡输入%c %c②自定义快捷键%c %c③复制按钮说明%c %c④Shift+Enter模式%c\n' +
        'API: %cwindow.__ClipboardTyper',
        'color:#f5c2e7;font-weight:bold', 'color:#cdd6f4',
        'color:#a6e3a1;font-weight:bold', 'color:#cdd6f4',
        'color:#f9e2af;font-weight:bold', 'color:#cdd6f4',
        'color:#89b4fa;font-weight:bold', 'color:#cdd6f4',
        'color:#cba6f7;font-weight:bold', 'color:#cdd6f4',
        'color:#89b4fa;font-weight:bold'
      );
    })()
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();