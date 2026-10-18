//重选快捷键：Ctrl+z
//复制快捷键：Ctrl+x
(function() {
  if (document.getElementById('element-picker-tool')) {
    document.getElementById('element-picker-tool').remove();
  }
  if (document.getElementById('element-picker-styles')) {
    document.getElementById('element-picker-styles').remove();
  }
  let rafId = null;
  let lastProcessedElement = null;
  const ThemeManager = {
    STORAGE_KEY: 'element-picker-theme',
    POSITION_KEY: 'element-picker-position',
    MINIMIZE_KEY: 'element-picker-minimized',
    themes: {
      dark: {
        name: 'dark',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>`,
        label: '深色'
      },
      light: {
        name: 'light',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>`,
        label: '浅色'
      },
      auto: {
        name: 'auto',
        icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2"/>
          <path d="M8 21h8M12 17v4"/>
        </svg>`,
        label: '跟随系统'
      }
    },
    init() {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && this.themes[saved]) {
        return saved;
      }
      return 'auto';
    },
    getCurrent() {
      const setting = this.init();
      if (setting === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return setting;
    },
    set(theme) {
      localStorage.setItem(this.STORAGE_KEY, theme);
      this.apply(theme === 'auto' ? 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 
        theme
      );
    },
    apply(theme) {
      const panel = document.getElementById('element-picker-info');
      if (panel) {
        panel.setAttribute('data-theme', theme);
      }
    },
    isMinimized() {
      return localStorage.getItem(this.MINIMIZE_KEY) === 'true';
    },
    setMinimized(minimized) {
      localStorage.setItem(this.MINIMIZE_KEY, minimized ? 'true' : 'false');
    }
  };
  const styles = `
    #element-picker-highlight {
      position: absolute !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      border: 2px solid #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
      transition: all 0.08s ease-out !important;
      box-sizing: border-box !important;
      will-change: transform, width, height !important;
      transform: translateZ(0); /* 提升性能 */
    }
    #element-picker-info {
      position: fixed !important;
      z-index: 2147483647 !important;
      border-radius: 12px !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      max-width: 320px !important;
      min-width: 340px !important;
      overflow: hidden !important;
      transition: opacity 0.15s ease !important;
      user-select: none !important;
    }
    #element-picker-info.minimized {
      min-width: 340px !important;
      max-width: 300px !important;
    }
    #element-picker-info.minimized .picker-body,
    #element-picker-info.minimized .picker-footer {
      display: none !important;
    }
    /* 深色主题 (默认) */
    #element-picker-info,
    #element-picker-info[data-theme="dark"] {
      background: rgba(20, 20, 30, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2) !important;
    }
    #element-picker-info[data-theme="dark"] .picker-header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2)) !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    #element-picker-info[data-theme="dark"].minimized .picker-header {
      border-bottom: none !important;
    }
    #element-picker-info[data-theme="dark"] .picker-title,
    #element-picker-info[data-theme="dark"] .picker-element-tag,
    #element-picker-info[data-theme="dark"] .selector-text,
    #element-picker-info[data-theme="dark"] .detail-value,
    #element-picker-info[data-theme="dark"] .attr-value {
      color: #e5e7eb !important;
    }
    #element-picker-info[data-theme="dark"] .picker-label,
    #element-picker-info[data-theme="dark"] .detail-label,
    #element-picker-info[data-theme="dark"] .attr-name {
      color: #9ca3af !important;
    }
    #element-picker-info[data-theme="dark"] .picker-close,
    #element-picker-info[data-theme="dark"] .picker-minimize {
      color: #9ca3af !important;
      border-color: rgba(255, 255, 255, 0.1) !important;
      background: rgba(255, 255, 255, 0.05) !important;
    }
    #element-picker-info[data-theme="dark"] .picker-element-tag,
    #element-picker-info[data-theme="dark"] .picker-selectors,
    #element-picker-info[data-theme="dark"] .picker-details,
    #element-picker-info[data-theme="dark"] .picker-attributes {
      background: rgba(0, 0, 0, 0.3) !important;
    }
    #element-picker-info[data-theme="dark"] .selector-item {
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
    #element-picker-info[data-theme="dark"] .picker-btn-secondary {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      color: #e5e7eb !important;
    }
    #element-picker-info[data-theme="dark"] .picker-status {
      color: #9ca3af !important;
    }
    #element-picker-info[data-theme="dark"] .attr-item {
      border-color: rgba(255, 255, 255, 0.05) !important;
    }
    #element-picker-info[data-theme="dark"] .attr-item:hover {
      background: rgba(59, 130, 246, 0.1) !important;
    }
    /* 浅色主题 */
    #element-picker-info[data-theme="light"] {
      background: rgba(255, 255, 255, 0.98) !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(0, 0, 0, 0.1) !important;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(59, 130, 246, 0.15) !important;
    }
    #element-picker-info[data-theme="light"] .picker-header {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.08)) !important;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08) !important;
    }
    #element-picker-info[data-theme="light"].minimized .picker-header {
      border-bottom: none !important;
    }
    #element-picker-info[data-theme="light"] .picker-title,
    #element-picker-info[data-theme="light"] .picker-element-tag,
    #element-picker-info[data-theme="light"] .selector-text,
    #element-picker-info[data-theme="light"] .detail-value,
    #element-picker-info[data-theme="light"] .attr-value {
      color: #1f2937 !important;
    }
    #element-picker-info[data-theme="light"] .picker-label,
    #element-picker-info[data-theme="light"] .detail-label,
    #element-picker-info[data-theme="light"] .attr-name {
      color: #6b7280 !important;
    }
    #element-picker-info[data-theme="light"] .picker-close,
    #element-picker-info[data-theme="light"] .picker-minimize {
      color: #6b7280 !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
      background: rgba(0, 0, 0, 0.03) !important;
    }
    #element-picker-info[data-theme="light"] .picker-close:hover {
      background: rgba(239, 68, 68, 0.1) !important;
      color: #ef4444 !important;
    }
    #element-picker-info[data-theme="light"] .picker-minimize:hover {
      background: rgba(59, 130, 246, 0.1) !important;
      color: #3b82f6 !important;
    }
    #element-picker-info[data-theme="light"] .picker-element-tag,
    #element-picker-info[data-theme="light"] .picker-selectors,
    #element-picker-info[data-theme="light"] .picker-details,
    #element-picker-info[data-theme="light"] .picker-attributes {
      background: rgba(0, 0, 0, 0.03) !important;
    }
    #element-picker-info[data-theme="light"] .selector-item {
      border-color: rgba(0, 0, 0, 0.05) !important;
    }
    #element-picker-info[data-theme="light"] .selector-item:hover {
      background: rgba(59, 130, 246, 0.08) !important;
    }
    #element-picker-info[data-theme="light"] .picker-btn-secondary {
      background: rgba(0, 0, 0, 0.03) !important;
      border: 1px solid rgba(0, 0, 0, 0.1) !important;
      color: #1f2937 !important;
    }
    #element-picker-info[data-theme="light"] .picker-btn-secondary:hover {
      background: rgba(0, 0, 0, 0.06) !important;
    }
    #element-picker-info[data-theme="light"] .picker-status {
      color: #6b7280 !important;
    }
    #element-picker-info[data-theme="light"] .picker-body::-webkit-scrollbar {
      width: 8px;
    }
    #element-picker-info[data-theme="light"] .picker-body::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.05);
    }
    #element-picker-info[data-theme="light"] .picker-body::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 4px;
    }
    #element-picker-info[data-theme="light"] .picker-footer {
      background: rgba(0, 0, 0, 0.02) !important;
      border-top: 1px solid rgba(0, 0, 0, 0.08) !important;
    }
    #element-picker-info[data-theme="light"] .attr-item {
      border-color: rgba(0, 0, 0, 0.05) !important;
    }
    #element-picker-info[data-theme="light"] .attr-item:hover {
      background: rgba(59, 130, 246, 0.08) !important;
    }
    /* 公共样式 */
    .picker-header {
      padding: 12px 16px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      cursor: move !important;
    }
    .picker-header.dragging {
      cursor: grabbing !important;
    }
    .picker-title {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
    }
    .picker-icon {
      width: 16px !important;
      height: 16px !important;
    }
    .picker-header-controls {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .picker-minimize {
      background: transparent !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 4px !important;
      cursor: pointer !important;
      color: #9ca3af !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s !important;
    }
    #element-picker-info[data-theme="dark"] .picker-minimize {
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
    #element-picker-info[data-theme="light"] .picker-minimize {
      border-color: rgba(0, 0, 0, 0.1) !important;
      color: #6b7280 !important;
    }
    .picker-minimize:hover {
      background: rgba(59, 130, 246, 0.15) !important;
      color: #3b82f6 !important;
    }
    .picker-theme-toggle {
      background: transparent !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 4px !important;
      cursor: pointer !important;
      color: #9ca3af !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s !important;
    }
    #element-picker-info[data-theme="dark"] .picker-theme-toggle {
      border-color: rgba(255, 255, 255, 0.1) !important;
    }
    #element-picker-info[data-theme="light"] .picker-theme-toggle {
      border-color: rgba(0, 0, 0, 0.1) !important;
      color: #6b7280 !important;
    }
    .picker-theme-toggle:hover {
      background: rgba(59, 130, 246, 0.15) !important;
      color: #3b82f6 !important;
    }
    .picker-theme-menu {
      position: absolute !important;
      top: 100% !important;
      right: 0 !important;
      margin-top: 8px !important;
      background: rgba(30, 30, 40, 0.98) !important;
      backdrop-filter: blur(10px) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 8px !important;
      padding: 4px !important;
      min-width: 140px !important;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3) !important;
      z-index: 100 !important;
      display: none !important;
    }
    #element-picker-info[data-theme="light"] .picker-theme-menu {
      background: rgba(255, 255, 255, 0.98) !important;
      border-color: rgba(0, 0, 0, 0.1) !important;
    }
    .picker-theme-menu.show {
      display: block !important;
    }
    .picker-theme-option {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      transition: all 0.15s !important;
      color: #e5e7eb !important;
    }
    #element-picker-info[data-theme="light"] .picker-theme-option {
      color: #1f2937 !important;
    }
    .picker-theme-option:hover {
      background: rgba(59, 130, 246, 0.15) !important;
    }
    .picker-theme-option.active {
      background: rgba(59, 130, 246, 0.2) !important;
      color: #3b82f6 !important;
    }
    .picker-close {
      background: rgba(255, 255, 255, 0.05) !important;
      border: 1px solid rgba(255, 255, 255, 0.1) !important;
      border-radius: 6px !important;
      padding: 4px !important;
      cursor: pointer !important;
      color: #9ca3af !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s !important;
    }
    .picker-close:hover {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ef4444 !important;
    }
    .picker-body {
      padding: 16px !important;
      max-height: 500px !important;
      overflow-y: auto !important;
    }
    .picker-body::-webkit-scrollbar {
      width: 8px;
    }
    .picker-body::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
    }
    .picker-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .picker-section {
      margin-bottom: 14px !important;
    }
    .picker-section:last-child {
      margin-bottom: 0 !important;
    }
    .picker-label {
      font-size: 11px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      margin-bottom: 6px !important;
      font-weight: 500 !important;
    }
    .picker-element-tag {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
      font-size: 14px !important;
      font-family: 'SF Mono', Monaco, monospace !important;
      padding: 10px 12px !important;
      border-radius: 8px !important;
      margin-bottom: 12px !important;
    }
    .tag-name {
      color: #f472b6 !important;
      font-weight: 600 !important;
    }
    .class-name {
      color: #60a5fa !important;
    }
    .id-name {
      color: #a78bfa !important;
    }
    .picker-selectors {
      border-radius: 8px !important;
      overflow: hidden !important;
    }
    .selector-item {
      padding: 10px 12px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
    }
    .selector-item:last-child {
      border-bottom: none !important;
    }
    .selector-item:hover {
      background: rgba(59, 130, 246, 0.15) !important;
    }
    .selector-item.selected {
      background: rgba(59, 130, 246, 0.25) !important;
      border-left: 3px solid #3b82f6 !important;
    }
    .selector-content {
      flex: 1 !important;
      min-width: 0 !important;
    }
    .selector-text {
      font-family: 'SF Mono', Monaco, monospace !important;
      font-size: 12px !important;
      word-break: break-all !important;
      display: block !important;
    }
    .selector-meta {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
      margin-top: 4px !important;
    }
    .selector-type {
      font-size: 10px !important;
      padding: 2px 6px !important;
      background: rgba(59, 130, 246, 0.2) !important;
      color: #60a5fa !important;
      border-radius: 4px !important;
      font-weight: 500 !important;
    }
    .selector-count {
      font-size: 10px !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      font-weight: 500 !important;
    }
    .selector-count.unique {
      background: rgba(16, 185, 129, 0.2) !important;
      color: #10b981 !important;
    }
    .selector-count.multiple {
      background: rgba(234, 179, 8, 0.2) !important;
      color: #fbbf24 !important;
    }
    .selector-count.many {
      background: rgba(239, 68, 68, 0.2) !important;
      color: #ef4444 !important;
    }
    .selector-badge {
      font-size: 10px !important;
      padding: 3px 8px !important;
      background: rgba(59, 130, 246, 0.2) !important;
      color: #60a5fa !important;
      border-radius: 4px !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
    }
    .selector-badge.best {
      background: rgba(16, 185, 129, 0.2) !important;
      color: #10b981 !important;
    }
    .picker-details {
      display: grid !important;
      grid-template-columns: auto 1fr !important;
      gap: 8px 12px !important;
      font-size: 12px !important;
      padding: 10px 12px !important;
      border-radius: 8px !important;
    }
    .detail-value {
      word-break: break-all !important;
    }
    .picker-attributes {
      border-radius: 8px !important;
      overflow: hidden !important;
      max-height: 180px !important;
      overflow-y: auto !important;
    }
    .picker-attributes::-webkit-scrollbar {
      width: 6px;
    }
    .picker-attributes::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
    .attr-item {
      padding: 8px 12px !important;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
      display: grid !important;
      grid-template-columns: 100px 1fr !important;
      gap: 8px !important;
      font-size: 12px !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
    }
    .attr-item:last-child {
      border-bottom: none !important;
    }
    .attr-name {
      font-family: 'SF Mono', Monaco, monospace !important;
      font-weight: 500 !important;
    }
    .attr-value {
      font-family: 'SF Mono', Monaco, monospace !important;
      word-break: break-all !important;
      color: #60a5fa !important;
    }
    .attr-item.copied {
      background: rgba(16, 185, 129, 0.15) !important;
    }
    .attr-badge {
      font-size: 9px !important;
      padding: 2px 5px !important;
      border-radius: 3px !important;
      font-weight: 500 !important;
      margin-left: 6px !important;
    }
    .attr-badge.id {
      background: rgba(167, 139, 250, 0.2) !important;
      color: #a78bfa !important;
    }
    .attr-badge.class {
      background: rgba(96, 165, 250, 0.2) !important;
      color: #60a5fa !important;
    }
    .attr-badge.style {
      background: rgba(244, 114, 182, 0.2) !important;
      color: #f472b6 !important;
    }
    .picker-footer {
      display: flex !important;
      gap: 8px !important;
      padding: 12px 16px !important;
      background: rgba(0, 0, 0, 0.2) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
    .picker-btn {
      flex: 1 !important;
      padding: 8px 16px !important;
      border-radius: 8px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 6px !important;
    }
    .picker-btn-primary {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6) !important;
      border: none !important;
      color: white !important;
    }
    .picker-btn-primary:hover {
      transform: translateY(-1px) !important;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4) !important;
    }
    .picker-btn.copied {
      background: rgba(16, 185, 129, 0.2) !important;
      color: #10b981 !important;
    }
    .picker-status {
      text-align: center !important;
      padding: 20px !important;
      font-size: 13px !important;
    }
    .picker-status-active {
      color: #3b82f6 !important;
    }
    .attr-count {
      font-size: 10px !important;
      color: #9ca3af !important;
      margin-left: 8px !important;
    }
  `;
  const styleElement = document.createElement('style');
  styleElement.id = 'element-picker-styles';
  styleElement.textContent = styles;
  document.head.appendChild(styleElement);
  const highlightBox = document.createElement('div');
  highlightBox.id = 'element-picker-highlight';
  highlightBox.style.display = 'none';
  document.body.appendChild(highlightBox);
  const infoPanel = document.createElement('div');
  infoPanel.id = 'element-picker-info';
  infoPanel.innerHTML = `
    <div class="picker-header" id="picker-header">
      <div class="picker-title">
        <svg class="picker-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16v16H4z"/>
          <circle cx="12" cy="12" r="2"/>
        </svg>
        <span>元素选择器</span>
      </div>
      <div class="picker-header-controls">
        <button class="picker-minimize" id="picker-minimize-btn" title="最小化">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
          </svg>
        </button>
        <div style="position: relative;">
          <button class="picker-theme-toggle" id="picker-theme-btn" title="切换主题">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="4"/>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
            </svg>
          </button>
          <div class="picker-theme-menu" id="picker-theme-menu">
            <div class="picker-theme-option" data-theme="dark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
              <span>深色模式</span>
            </div>
            <div class="picker-theme-option" data-theme="light">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
              <span>浅色模式</span>
            </div>
            <div class="picker-theme-option" data-theme="auto">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
              <span>跟随系统</span>
            </div>
          </div>
        </div>
        <button class="picker-close" id="picker-close-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="picker-body" id="picker-body">
      <div class="picker-status picker-status-active">
        🎯 悬停鼠标选择元素，点击确认
      </div>
    </div>
    <div class="picker-footer" id="picker-footer" style="display: none;">
      <button class="picker-btn picker-btn-secondary" id="picker-restart-btn"title="Ctrl+Z">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 4v6h6M23 20v-6h-6"/>
          <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
        </svg>
        <span>重新选择</span>
      </button>
      <button class="picker-btn picker-btn-primary" id="picker-copy-btn"title="Ctrl+X">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
        </svg>
        <span>复制选择器</span>
      </button>
    </div>
  `;
  document.body.appendChild(infoPanel);
  let isActive = true;
  let currentElement = null;
  let selectedSelector = '';
  let selectedSelectorType = 'css';
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let panelStartX = 0;
  let panelStartY = 0;
  let isMinimized = false;
  const minimizeIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3"/>
  </svg>`;
  const expandIcon = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
  </svg>`;
  function initPanelPosition() {
    const savedPos = localStorage.getItem(ThemeManager.POSITION_KEY);
    if (savedPos) {
      try {
        const pos = JSON.parse(savedPos);
        infoPanel.style.left = pos.x + 'px';
        infoPanel.style.top = pos.y + 'px';
        return;
      } catch (e) {}
    }
    const panelWidth = 420;
    infoPanel.style.left = (window.innerWidth - panelWidth - 20) + 'px';
    infoPanel.style.top = '20px';
  }
  function savePanelPosition() {
    const rect = infoPanel.getBoundingClientRect();
    localStorage.setItem(ThemeManager.POSITION_KEY, JSON.stringify({
      x: rect.left,
      y: rect.top
    }));
  }
  function initTheme() {
    const savedTheme = ThemeManager.init();
    ThemeManager.apply(ThemeManager.getCurrent());
    updateThemeMenu(savedTheme);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const currentSetting = localStorage.getItem(ThemeManager.STORAGE_KEY) || 'auto';
      if (currentSetting === 'auto') {
        ThemeManager.apply(e.matches ? 'dark' : 'light');
      }
    });
  }
  function initMinimize() {
    isMinimized = ThemeManager.isMinimized();
    if (isMinimized) {
      infoPanel.classList.add('minimized');
      const minimizeBtn = document.getElementById('picker-minimize-btn');
      if (minimizeBtn) {
        minimizeBtn.innerHTML = expandIcon;
        minimizeBtn.title = '展开';
      }
    }
  }
  function toggleMinimize() {
    isMinimized = !isMinimized;
    ThemeManager.setMinimized(isMinimized);
    const minimizeBtn = document.getElementById('picker-minimize-btn');
    if (isMinimized) {
      infoPanel.classList.add('minimized');
      if (minimizeBtn) {
        minimizeBtn.innerHTML = expandIcon;
        minimizeBtn.title = '展开';
      }
    } else {
      infoPanel.classList.remove('minimized');
      if (minimizeBtn) {
        minimizeBtn.innerHTML = minimizeIcon;
        minimizeBtn.title = '最小化';
      }
    }
  }
  function updateThemeMenu(theme) {
    document.querySelectorAll('.picker-theme-option').forEach(option => {
      option.classList.toggle('active', option.dataset.theme === theme);
    });
  }
  function toggleThemeMenu() {
    const menu = document.getElementById('picker-theme-menu');
    if (menu) {
      menu.classList.toggle('show');
    }
  }
  function closeThemeMenu(e) {
    const menu = document.getElementById('picker-theme-menu');
    const btn = document.getElementById('picker-theme-btn');
    if (menu && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('show');
    }
  }
  function initDrag(e) {
    if (e.target.closest('.picker-header') && 
        !e.target.closest('.picker-close') && 
        !e.target.closest('.picker-theme-toggle') &&
        !e.target.closest('.picker-minimize')) {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      const rect = infoPanel.getBoundingClientRect();
      panelStartX = rect.left;
      panelStartY = rect.top;
      document.getElementById('picker-header').classList.add('dragging');
      e.preventDefault();
    }
  }
  function doDrag(e) {
    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      let newX = panelStartX + deltaX;
      let newY = panelStartY + deltaY;
      const panelWidth = infoPanel.offsetWidth;
      const panelHeight = infoPanel.offsetHeight;
      newX = Math.max(0, Math.min(newX, window.innerWidth - panelWidth));
      newY = Math.max(0, Math.min(newY, window.innerHeight - panelHeight));
      infoPanel.style.left = newX + 'px';
      infoPanel.style.top = newY + 'px';
    }
  }
  function endDrag() {
    if (isDragging) {
      isDragging = false;
      const header = document.getElementById('picker-header');
      if (header) {
        header.classList.remove('dragging');
      }
      savePanelPosition();
    }
  }
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  const selectorMatchCache = new Map();
  function countCSSMatches(selector) {
    if (selectorMatchCache.has(selector)) {
      return selectorMatchCache.get(selector);
    }
    try {
      const count = document.querySelectorAll(selector).length;
      selectorMatchCache.set(selector, count);
      return count;
    } catch (e) {
      return 0;
    }
  }
  const xpathMatchCache = new Map();
  function countXPathMatches(xpath) {
    if (xpathMatchCache.has(xpath)) {
      return xpathMatchCache.get(xpath);
    }
    try {
      const result = document.evaluate(
        xpath,
        document,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
        null
      );
      const count = result.snapshotLength;
      xpathMatchCache.set(xpath, count);
      return count;
    } catch (e) {
      return 0;
    }
  }
  function generateXPath(element) {
    if (!element || !element.tagName) return null;
    if (element.id) {
      const xpath = `//*[@id="${escapeHtml(element.id)}"]`;
      if (countXPathMatches(xpath) === 1) {
        return { xpath, type: 'ID', priority: 1, isUnique: true };
      }
    }
    const attrs = ['name', 'data-testid', 'data-id', 'aria-label', 'title', 'placeholder', 'type', 'role'];
    for (const attr of attrs) {
      if (element.hasAttribute(attr)) {
        const value = element.getAttribute(attr);
        if (value && value.length < 50) {
          const xpath = `//*[@${attr}="${escapeHtml(value)}"]`;
          const count = countXPathMatches(xpath);
          if (count === 1) {
            return { xpath, type: '属性', priority: 2, isUnique: true };
          } else if (count > 1 && count <= 5) {
            return { xpath, type: '属性', priority: 2, isUnique: false, count };
          }
        }
      }
    }
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.includes(':'));
      if (classes.length > 0) {
        const firstClass = classes[0];
        const xpath = `//*[contains(@class, "${escapeHtml(firstClass)}")]`;
        const count = countXPathMatches(xpath);
        if (count === 1) {
          return { xpath, type: 'Class', priority: 3, isUnique: true };
        } else if (count > 1 && count <= 10) {
          return { xpath, type: 'Class', priority: 3, isUnique: false, count };
        }
      }
    }
    const parts = [];
    let current = element;
    while (current && current !== document.body && parts.length < 6) {
      let part = current.tagName.toLowerCase();
      if (current.id) {
        part = `//*[@id="${escapeHtml(current.id)}"]`;
        parts.unshift(part);
        break;
      }
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          part += `[${index}]`;
        }
      }
      parts.unshift(part);
      current = parent;
    }
    if (parts.length > 0) {
      const xpath = '//' + parts.join('/');
      const count = countXPathMatches(xpath);
      return { 
        xpath, 
        type: '路径', 
        priority: 5, 
        isUnique: count === 1, 
        count 
      };
    }
    return null;
  }
  function generateSelectors(element) {
    if (!element || !element.tagName) return [];
    const selectors = [];
    const tag = element.tagName.toLowerCase();
    if (element.id) {
      const selector = `#${element.id}`;
      const count = countCSSMatches(selector);
      selectors.push({
        selector,
        type: 'ID',
        priority: 1,
        isUnique: count === 1,
        count
      });
    }
    const attrs = ['name', 'type', 'role', 'aria-label', 'data-testid', 'placeholder'];
    attrs.forEach(attr => {
      if (element.hasAttribute(attr)) {
        const value = element.getAttribute(attr);
        if (value && value.length < 50) {
          const selector = `[${attr}="${escapeHtml(value)}"]`;
          const count = countCSSMatches(selector);
          if (count <= 10) {
            selectors.push({
              selector,
              type: '属性',
              priority: 2,
              isUnique: count === 1,
              count
            });
          }
        }
      }
    });
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.includes(':'));
      if (classes.length > 0) {
        const classSelector = classes.slice(0, 3).map(c => `.${c}`).join('');
        const count = countCSSMatches(classSelector);
        if (count <= 10) {
          selectors.push({
            selector: classSelector,
            type: '组合类',
            priority: 3,
            isUnique: count === 1,
            count
          });
        }
        classes.forEach(cls => {
          const selector = `.${cls}`;
          const count = countCSSMatches(selector);
          if (count <= 20 && count > 0) {
            selectors.push({
              selector,
              type: 'Class',
              priority: 4,
              isUnique: count === 1,
              count
            });
          }
        });
        const tagClassSelector = `${tag}${classes.slice(0, 2).map(c => `.${c}`).join('')}`;
        const tagClassCount = countCSSMatches(tagClassSelector);
        if (tagClassCount <= 10) {
          selectors.push({
            selector: tagClassSelector,
            type: '标签+类',
            priority: 3,
            isUnique: tagClassCount === 1,
            count: tagClassCount
          });
        }
      }
    }
    let parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(c => c.tagName === element.tagName);
      const index = siblings.indexOf(element) + 1;
      if (siblings.length > 1) {
        const selector = `${tag}:nth-child(${index})`;
        const count = countCSSMatches(selector);
        selectors.push({
          selector,
          type: '序号',
          priority: 6,
          isUnique: count === 1,
          count
        });
      }
    }
    const tagCount = countCSSMatches(tag);
    selectors.push({
      selector: tag,
      type: '标签',
      priority: 7,
      isUnique: tagCount === 1,
      count: tagCount
    });
    selectors.sort((a, b) => {
      if (a.isUnique !== b.isUnique) {
        return a.isUnique ? -1 : 1;
      }
      return a.priority - b.priority;
    });
    if (selectors.length > 0) {
      selectors[0].isBest = true;
    }
    return selectors;
  }
  function getElementAttributes(element) {
    if (!element || !element.attributes) return [];
    const attrs = [];
    const importantAttrs = ['id', 'class', 'name', 'type', 'href', 'src', 'data-testid', 'aria-label', 'role', 'title', 'placeholder', 'value', 'style'];
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      const name = attr.name;
      const value = attr.value;
      const importance = importantAttrs.indexOf(name);
      const isImportant = importance !== -1;
      const displayValue = value.length > 100 ? value.substring(0, 100) + '...' : value;
      attrs.push({
        name,
        value: displayValue,
        fullValue: value,
        isImportant,
        importance: isImportant ? importance : 100 + i
      });
    }
    attrs.sort((a, b) => a.importance - b.importance);
    return attrs;
  }
  function getElementTagDisplay(element) {
    if (!element) return '';
    const tag = element.tagName.toLowerCase();
    let display = `<span class="tag-name">${escapeHtml(tag)}</span>`;
    if (element.id) {
      display += `<span class="id-name">#${escapeHtml(element.id)}</span>`;
    }
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c && !c.includes(':')).slice(0, 3);
      if (classes.length > 0) {
        display += classes.map(c => `<span class="class-name">.${escapeHtml(c)}</span>`).join('');
      }
    }
    return display;
  }
  function getTextPreview(element) {
    const text = element.textContent?.trim() || '';
    if (text.length === 0) return '(无文本)';
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  }
  function getElementPath(element) {
    if (!element) return '';
    const path = [];
    let current = element;
    let depth = 0;
    while (current && current !== document.body && depth < 5) {
      const tag = current.tagName.toLowerCase();
      let selector = tag;
      if (current.id) {
        selector = `#${current.id}`;
      } else if (current.className && typeof current.className === 'string') {
        const firstClass = current.className.split(' ').filter(c => c && !c.includes(':'))[0];
        if (firstClass) {
          selector = `.${firstClass}`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
      depth++;
    }
    return path.join(' > ');
  }
  function updateHighlightFast(element) {
    if (!element || isMinimized) {
      highlightBox.style.display = 'none';
      return;
    }
  function getAbsolutePosition(element) {
    let left = 0;
    let top = 0;
    let current = element;
    while (current && current !== document.body) {
      left += current.offsetLeft;
      top += current.offsetTop;
      current = current.offsetParent;
    }
    return { left, top };
  }
  const rect = element.getBoundingClientRect();
  const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollY = window.pageYOffset || document.documentElement.scrollTop;
  highlightBox.style.left = (rect.left + scrollX) + 'px';
  highlightBox.style.top = (rect.top + scrollY) + 'px';
  highlightBox.style.width = rect.width + 'px';
  highlightBox.style.height = rect.height + 'px';
  highlightBox.style.display = 'block';
  }
  const elementDataCache = new WeakMap();
  function getElementData(element) {
    if (elementDataCache.has(element)) {
      return elementDataCache.get(element);
    }
    const data = {
      selectors: generateSelectors(element),
      xpathInfo: generateXPath(element),
      attributes: getElementAttributes(element),
      tagDisplay: getElementTagDisplay(element),
      textPreview: getTextPreview(element),
      path: getElementPath(element)
    };
    elementDataCache.set(element, data);
    return data;
  }
  function updateInfoPanel(element) {
    if (!isActive || !element) return;
    updateHighlightFast(element);
    if (isMinimized) return;
    if (element === lastProcessedElement) {
      return;
    }
    lastProcessedElement = element;
    const data = getElementData(element);
    const rect_info = element.getBoundingClientRect();
    let selectorsHtml = data.selectors.slice(0, 5).map((s, i) => {
      const countClass = s.isUnique ? 'unique' : (s.count <= 5 ? 'multiple' : 'many');
      const countText = s.isUnique ? '唯一' : `${s.count}个`;
      const badgeHtml = s.isBest ? '<span class="selector-badge best">最佳</span>' : '';
      const selectedClass = s.isBest ? 'selected' : '';
      return `
        <div class="selector-item ${selectedClass}" data-selector="${escapeHtml(s.selector)}" data-type="css">
          <div class="selector-content">
            <span class="selector-text">${escapeHtml(s.selector)}</span>
            <div class="selector-meta">
              <span class="selector-type">${s.type}</span>
              <span class="selector-count ${countClass}">${countText}</span>
            </div>
          </div>
          ${badgeHtml}
        </div>
      `;
    }).join('');
    let xpathHtml = '';
    if (data.xpathInfo) {
      const countClass = data.xpathInfo.isUnique ? 'unique' : (data.xpathInfo.count <= 5 ? 'multiple' : 'many');
      const countText = data.xpathInfo.isUnique ? '唯一' : `${data.xpathInfo.count}个`;
      xpathHtml = `
        <div class="selector-item" data-selector="${escapeHtml(data.xpathInfo.xpath)}" data-type="xpath">
          <div class="selector-content">
            <span class="selector-text">${escapeHtml(data.xpathInfo.xpath)}</span>
            <div class="selector-meta">
              <span class="selector-type">XPath</span>
              <span class="selector-count ${countClass}">${countText}</span>
            </div>
          </div>
        </div>
      `;
    }
    let attrsHtml = '';
    if (data.attributes.length > 0) {
      const displayAttrs = data.attributes.slice(0, 15);
      attrsHtml = displayAttrs.map(attr => {
        let badgeHtml = '';
        if (attr.name === 'id') badgeHtml = '<span class="attr-badge id">ID</span>';
        else if (attr.name === 'class') badgeHtml = '<span class="attr-badge class">Class</span>';
        else if (attr.name === 'style') badgeHtml = '<span class="attr-badge style">Style</span>';
        return `
          <div class="attr-item" data-attr-name="${escapeHtml(attr.name)}" data-attr-value="${escapeHtml(attr.fullValue)}">
            <span class="attr-name">${escapeHtml(attr.name)}${badgeHtml}</span>
            <span class="attr-value">${escapeHtml(attr.value)}</span>
          </div>
        `;
      }).join('');
    }
    const bodyEl = document.getElementById('picker-body');
    bodyEl.innerHTML = `
      <div class="picker-section">
        <div class="picker-label">当前元素</div>
        <div class="picker-element-tag">${data.tagDisplay}</div>
      </div>
      <div class="picker-section">
        <div class="picker-label">推荐选择器 <span style="font-size:9px;color:#9ca3af;">(点击选择)</span></div>
        <div class="picker-selectors" id="selector-list">
          ${selectorsHtml}
          ${xpathHtml}
        </div>
      </div>
      ${data.attributes.length > 0 ? `
      <div class="picker-section">
        <div class="picker-label">属性列表 <span class="attr-count">${data.attributes.length}个</span></div>
        <div class="picker-attributes">
          ${attrsHtml}
        </div>
      </div>
      ` : ''}
      <div class="picker-section">
        <div class="picker-label">元素详情</div>
        <div class="picker-details">
          <span class="detail-label">尺寸:</span>
          <span class="detail-value">${Math.round(rect_info.width)} × ${Math.round(rect_info.height)} px</span>
          <span class="detail-label">位置:</span>
          <span class="detail-value">(${Math.round(rect_info.left)}, ${Math.round(rect_info.top)})</span>
          <span class="detail-label">路径:</span>
          <span class="detail-value">${escapeHtml(data.path)}</span>
          <span class="detail-label">文本:</span>
          <span class="detail-value">${escapeHtml(data.textPreview)}</span>
        </div>
      </div>
    `;
    if (data.selectors.length > 0) {
      selectedSelector = data.selectors[0].selector;
      selectedSelectorType = 'css';
    }
    bodyEl.querySelectorAll('.selector-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        bodyEl.querySelectorAll('.selector-item').forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
        selectedSelector = item.dataset.selector;
        selectedSelectorType = item.dataset.type;
      });
    });
    bodyEl.querySelectorAll('.attr-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const attrValue = item.dataset.attrValue;
        navigator.clipboard.writeText(attrValue).then(() => {
          item.classList.add('copied');
          setTimeout(() => item.classList.remove('copied'), 1500);
        });
      });
    });
    currentElement = element;
  }
  let pendingUpdate = null;
  function onMouseMove(e) {
    if (!isActive) return;
    const target = e.target;
    if (target.closest('#element-picker-info') || 
        target.closest('#element-picker-highlight') ||
        target.id === 'element-picker-info' ||
        target.id === 'element-picker-highlight') {
      return;
    }
    pendingUpdate = { element: target };
    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (pendingUpdate) {
          updateInfoPanel(pendingUpdate.element);
          pendingUpdate = null;
        }
      });
    }
  }
  function onClick(e) {
    if (!isActive) return;
    if (e.target.closest('#element-picker-info') || 
        e.target.closest('.selector-item') ||
        e.target.closest('.attr-item')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if (currentElement && selectedSelector) {
      isActive = false;
      highlightBox.style.border = '3px solid #10b981'; 
      highlightBox.style.background = 'rgba(16, 185, 129, 0.2)'; 
      highlightBox.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.3), 0 0 20px rgba(16, 185, 129, 0.2)';
      document.getElementById('picker-footer').style.display = 'flex';
      const statusEl = document.querySelector('.picker-status');
      if (statusEl) {
        statusEl.textContent = '✅ 元素已选择';
        statusEl.classList.remove('picker-status-active');
      }
    }
  }
  function copySelector() {
    if (selectedSelector) {
      navigator.clipboard.writeText(selectedSelector).then(() => {
        const copyBtn = document.getElementById('picker-copy-btn');
        copyBtn.classList.add('copied');
        const typeText = selectedSelectorType === 'xpath' ? 'XPath' : '选择器';
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          <span>已复制${typeText}!</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span>复制选择器</span>
          `;
        }, 2000);
      });
    }
  }
  function restartPicking() {
    isActive = true;
    currentElement = null;
    selectedSelector = '';
    lastProcessedElement = null;
    selectorMatchCache.clear();
    xpathMatchCache.clear();
    highlightBox.style.border = '2px solid #3b82f6';
    highlightBox.style.background = 'rgba(59, 130, 246, 0.1)';
    highlightBox.style.boxShadow = 'none';
    document.getElementById('picker-footer').style.display = 'none';
    const bodyEl = document.getElementById('picker-body');
    bodyEl.innerHTML = `
      <div class="picker-status picker-status-active">
        🎯 悬停鼠标选择元素，点击确认
      </div>
    `;
  }
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      if (!isActive) {
        restartPicking();
    }
  }
    if ((e.ctrlKey || e.metaKey) && e.key === 'x' && !e.shiftKey) {
    e.preventDefault();
    e.stopPropagation();
    if (!isActive && currentElement && selectedSelector) {
      copySelector();
    }
   }  
  }
  function handleClick(e) {
    if (isCtrlPressed && e.button === 0) { 
      e.preventDefault();
      e.stopPropagation();
      if (!isActive) {
        restartPicking();
        return false;
      }
    }
  }
  function closeTool() {
    isActive = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('click', onClick, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('mousedown', initDrag);
    document.removeEventListener('mousemove', doDrag);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('click', closeThemeMenu);
    document.removeEventListener('keydown', handleKeyDown);
    highlightBox.remove();
    infoPanel.remove();
    styleElement.remove();
  }
  function initThemeEvents() {
    const themeBtn = document.getElementById('picker-theme-btn');
    const themeMenu = document.getElementById('picker-theme-menu');
    if (themeBtn && themeMenu) {
      themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleThemeMenu();
      });
      themeMenu.querySelectorAll('.picker-theme-option').forEach(option => {
        option.addEventListener('click', (e) => {
          e.stopPropagation();
          const theme = option.dataset.theme;
          localStorage.setItem(ThemeManager.STORAGE_KEY, theme);
          ThemeManager.apply(ThemeManager.getCurrent());
          updateThemeMenu(theme);
          themeMenu.classList.remove('show');
          const currentTheme = ThemeManager.getCurrent();
          themeBtn.innerHTML = ThemeManager.themes[currentTheme].icon;
        });
      });
    }
    document.addEventListener('click', closeThemeMenu);
  }
  document.addEventListener('mousemove', onMouseMove, { passive: true });
  document.addEventListener('click', onClick, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mousedown', initDrag);
  document.addEventListener('mousemove', doDrag);
  document.addEventListener('mouseup', endDrag);
  document.addEventListener('keydown', handleKeyDown);
  document.getElementById('picker-close-btn').addEventListener('click', closeTool);
  document.getElementById('picker-copy-btn').addEventListener('click', copySelector);
  document.getElementById('picker-restart-btn').addEventListener('click', restartPicking);
  document.getElementById('picker-minimize-btn').addEventListener('click', toggleMinimize);
  initTheme();
  initThemeEvents();
  initPanelPosition();
  initMinimize();
  initScrollTracking();
  console.log('元素选择器工具已启动');
})();