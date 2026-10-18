(function() {
  'use strict';

  if (window.__visualPageEditorFullscreen) {
    console.log('已存在编辑器实例');
    return;
  }
  window.__visualPageEditorFullscreen = true;

  const state = {
    editMode: false,
    selectedElement: null,
    highlightedElement: null,
    highlightBox: null,
    infoLabel: null,
    isDragging: false,
    imageEditPanel: null,
    isRatioLocked: true,
    currentRatio: 1,
    theme: localStorage.getItem('__vpe_theme__') || 'dark'
  };

  const cleanupFunctions = [];

  const themes = {
    dark: {
      '--vpe-bg-primary': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      '--vpe-bg-secondary': 'rgba(20, 20, 35, 0.98)',
      '--vpe-bg-tertiary': 'rgba(99, 102, 241, 0.1)',
      '--vpe-bg-hover': 'rgba(99, 102, 241, 0.25)',
      '--vpe-bg-active': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      '--vpe-border': 'rgba(99, 102, 241, 0.3)',
      '--vpe-border-active': 'rgba(99, 102, 241, 0.5)',
      '--vpe-text-primary': '#ffffff',
      '--vpe-text-secondary': '#c7d2fe',
      '--vpe-text-tertiary': 'rgba(255,255,255,0.6)',
      '--vpe-highlight': '#6366f1',
      '--vpe-highlight-selected': '#22c55e',
      '--vpe-shadow': 'rgba(99, 102, 241, 0.2)',
      '--vpe-input-bg': 'rgba(255,255,255,0.08)',
      '--vpe-input-focus': 'rgba(255,255,255,0.12)',
      '--vpe-tag-color': '#f472b6',
      '--vpe-id-color': '#60a5fa',
      '--vpe-class-color': '#fbbf24'
    },
    light: {
      '--vpe-bg-primary': 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
      '--vpe-bg-secondary': 'rgba(255, 255, 255, 0.98)',
      '--vpe-bg-tertiary': 'rgba(99, 102, 241, 0.08)',
      '--vpe-bg-hover': 'rgba(99, 102, 241, 0.15)',
      '--vpe-bg-active': 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      '--vpe-border': 'rgba(99, 102, 241, 0.25)',
      '--vpe-border-active': 'rgba(99, 102, 241, 0.5)',
      '--vpe-text-primary': '#1e293b',
      '--vpe-text-secondary': '#334155',
      '--vpe-text-tertiary': '#64748b',
      '--vpe-highlight': '#6366f1',
      '--vpe-highlight-selected': '#22c55e',
      '--vpe-shadow': 'rgba(99, 102, 241, 0.15)',
      '--vpe-input-bg': 'rgba(99, 102, 241, 0.08)',
      '--vpe-input-focus': 'rgba(99, 102, 241, 0.15)',
      '--vpe-tag-color': '#db2777',
      '--vpe-id-color': '#2563eb',
      '--vpe-class-color': '#d97706'
    }
  };

  function applyTheme(themeName) {
    const theme = themes[themeName];
    const root = document.documentElement;
    
    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    
    state.theme = themeName;
    localStorage.setItem('__vpe_theme__', themeName);
    
    const themeBtn = document.querySelector('#__vpe_theme_toggle__');
    if (themeBtn) {
      themeBtn.innerHTML = themeName === 'dark' ? '🌙' : '☀️';
      themeBtn.title = themeName === 'dark' ? '切换到浅色模式' : '切换到深色模式';
    }
    
    const toolbar = document.querySelector('#__vpe_toolbar__');
    if (toolbar) {
      toolbar.setAttribute('data-theme', themeName);
    }
  }

  function constrainToViewport(left, top, width, height, margin = 10) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxX = viewportWidth - width - margin;
    const maxY = viewportHeight - height - margin;
    return {
      left: Math.max(margin, Math.min(maxX, left)),
      top: Math.max(margin, Math.min(maxY, top))
    };
  }

  function createToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = '__vpe_toolbar__';
    toolbar.setAttribute('contenteditable', 'false');
    toolbar.setAttribute('data-theme', state.theme);
    toolbar.innerHTML = `
      <style>
        :root {
          --vpe-bg-primary: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          --vpe-bg-secondary: rgba(20, 20, 35, 0.98);
          --vpe-bg-tertiary: rgba(99, 102, 241, 0.1);
          --vpe-bg-hover: rgba(99, 102, 241, 0.25);
          --vpe-bg-active: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          --vpe-border: rgba(99, 102, 241, 0.3);
          --vpe-border-active: rgba(99, 102, 241, 0.5);
          --vpe-text-primary: #ffffff;
          --vpe-text-secondary: #c7d2fe;
          --vpe-text-tertiary: rgba(255,255,255,0.6);
          --vpe-highlight: #6366f1;
          --vpe-highlight-selected: #22c55e;
          --vpe-shadow: rgba(99, 102, 241, 0.2);
          --vpe-input-bg: rgba(255,255,255,0.08);
          --vpe-input-focus: rgba(255,255,255,0.12);
          --vpe-tag-color: #f472b6;
          --vpe-id-color: #60a5fa;
          --vpe-class-color: #fbbf24;
        }
        
        #__vpe_toolbar__ {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 2147483646;
          background: var(--vpe-bg-primary);
          border: 1px solid var(--vpe-border);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 40px var(--vpe-shadow);
          font-family: 'Segoe UI', system-ui, sans-serif;
          min-width: 280px;
          max-width: min(360px, calc(100vw - 40px));
          cursor: move;
          user-select: none;
          transition: all 0.3s ease;
        }
        #__vpe_toolbar__.compact {
          min-width: 200px;
          max-width: min(300px, calc(100vw - 40px));
          padding: 15px;
        }
        #__vpe_toolbar__.compact .vpe-section { display: none; }
        #__vpe_toolbar__.compact .vpe-info { display: none; }
        #__vpe_toolbar__ * { box-sizing: border-box; }
        
        .vpe-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--vpe-border);
        }
        .vpe-title {
          color: var(--vpe-text-primary);
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vpe-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .vpe-theme-btn {
          background: var(--vpe-bg-tertiary);
          border: 1px solid var(--vpe-border);
          color: var(--vpe-text-primary);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        .vpe-theme-btn:hover {
          background: var(--vpe-bg-hover);
          transform: scale(1.05);
        }
        .vpe-close {
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.4);
          color: #ef4444;
          padding: 6px 12px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          transition: all 0.2s;
        }
        .vpe-close:hover {
          background: #ef4444;
          color: white;
          transform: scale(1.05);
          box-shadow: 0 4px 15px rgba(239, 68, 68, 0.4);
        }
        
        .vpe-btn {
          width: 100%;
          padding: 12px;
          margin: 6px 0;
          border: 1px solid var(--vpe-border);
          border-radius: 10px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .vpe-btn-primary {
          background: var(--vpe-bg-active);
          color: white;
        }
        .vpe-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(99, 102, 241, 0.4);
        }
        .vpe-btn-primary.active {
          background: linear-gradient(135deg, #ef4444 0%, #f97316 100%);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .vpe-btn-secondary {
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          border-color: var(--vpe-border);
        }
        .vpe-btn-secondary:hover:not(:disabled) {
          background: var(--vpe-bg-hover);
          border-color: var(--vpe-border-active);
        }
        .vpe-btn-secondary:disabled {
          opacity: 0.4;
          cursor: not-allowed !important;
        }
        .vpe-btn-secondary.active {
          background: var(--vpe-bg-active);
          color: white;
          border-color: var(--vpe-border-active);
        }
        
        .vpe-section {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
        }
        .vpe-section-title {
          color: var(--vpe-text-tertiary);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          margin-bottom: 10px;
        }
        .vpe-row {
          display: flex;
          gap: 8px;
          margin: 6px 0;
        }
        .vpe-row .vpe-btn { flex: 1; margin: 0; padding: 10px; font-size: 12px; }
        
        .vpe-color-input {
          flex: 1;
          height: 40px;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          cursor: pointer;
          background: var(--vpe-input-bg);
          padding: 4px;
        }
        .vpe-info {
          background: var(--vpe-bg-tertiary);
          border: 1px solid var(--vpe-border);
          border-radius: 10px;
          padding: 10px;
          margin-top: 12px;
          font-size: 12px;
          color: var(--vpe-text-secondary);
          line-height: 1.5;
        }
        
        #__vpe_toolbar__[data-theme="light"] .vpe-info {
          color: #1e293b;
          background: rgba(99, 102, 241, 0.08);
          border-color: rgba(99, 102, 241, 0.2);
        }
        
        .vpe-image-section { display: none; }
        .vpe-image-section.active { display: block; }
        .vpe-text-section { display: none; }
        .vpe-text-section.active { display: block; }
        
        .vpe-img-quick-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-bottom: 10px;
        }
        .vpe-img-quick-btn {
          padding: 8px;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
        }
        .vpe-img-quick-btn:hover {
          background: var(--vpe-bg-hover);
        }
        .vpe-img-quick-btn.active {
          background: var(--vpe-bg-active);
          color: white;
        }

        .vpe-size-quick-adjust {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
        }
        .vpe-size-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .vpe-size-label {
          color: var(--vpe-text-tertiary);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vpe-size-input {
          width: 100%;
          height: 32px;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          background: var(--vpe-input-bg);
          color: var(--vpe-text-primary);
          padding: 6px 10px;
          font-size: 13px;
          cursor: text;
          user-select: text;
          transition: all 0.2s;
        }
        .vpe-size-input:focus {
          outline: none;
          border-color: var(--vpe-border-active);
          background: var(--vpe-input-focus);
        }
        .vpe-size-input::placeholder {
          color: var(--vpe-text-tertiary);
        }
        .vpe-lock-btn {
          width: 32px;
          height: 32px;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          transition: all 0.2s;
          margin-top: 14px;
        }
        
         .vpe-lock-btn:hover {  
           background: var(--vpe-bg-hover);  
           box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1),             
                       0 2px 4px rgba(99, 102, 241, 0.2);   
           border-color: var(--vpe-border-active);
         }

        .vpe-lock-btn.active {
          background: var(--vpe-bg-hover);
          color: var(--vpe-text-primary);
          border-color: var(--vpe-border-active);
        }
        

        @media (max-width: 768px) {
          #__vpe_toolbar__ {
            top: 10px; right: 10px; left: 10px;
            max-width: none; min-width: auto; padding: 15px;
          }
          .vpe-title { font-size: 14px; }
          .vpe-btn { padding: 10px; font-size: 12px; }
        }

        #__vpe_highlight_box__ {
          position: fixed;
          pointer-events: none;
          z-index: 2147483645;
          border: 3px solid var(--vpe-highlight);
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.08);
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.5),
            0 0 20px rgba(99, 102, 241, 0.3),
            0 0 40px rgba(99, 102, 241, 0.15);
          transition: all 0.08s ease-out;
        }
        #__vpe_highlight_box__.selected {
          border-color: var(--vpe-highlight-selected);
          background: rgba(34, 197, 94, 0.12);
          box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.6),
            0 0 25px rgba(34, 197, 94, 0.4),
            0 0 50px rgba(34, 197, 94, 0.2);
        }
        
        .vpe-element-label {
          position: absolute;
          background: var(--vpe-bg-secondary);
          border: 1px solid var(--vpe-border-active);
          border-radius: 6px;
          padding: 6px 10px;
          font-family: 'SF Mono', 'Consolas', monospace;
          font-size: 11px;
          color: var(--vpe-text-secondary);
          white-space: nowrap;
          box-shadow: 0 4px 15px rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          gap: 8px;
          z-index: 10;
        }
        .vpe-element-label.selected {
          background: var(--vpe-bg-secondary) !important;
          background: linear-gradient(135deg, #14532d 0%, #166534 100%);
          border-color: rgba(34, 197, 94, 0.5);
          color: #86efac;
        }
        .vpe-tag-name { color: var(--vpe-tag-color); font-weight: 600; }
        .vpe-tag-name.selected { color: #4ade80; }
        .vpe-separator { color: var(--vpe-text-tertiary); }
        .vpe-dim-info { color: var(--vpe-text-tertiary); }
        .vpe-id-info { color: var(--vpe-id-color); }
        .vpe-class-info { color: var(--vpe-class-color); }

        .vpe-size-indicator {
          position: absolute;
          font-size: 10px;
          color: var(--vpe-highlight);
          background: var(--vpe-bg-secondary);
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'SF Mono', monospace;
        }
        .vpe-size-indicator.width { 
          left: 50%; 
          transform: translateX(-50%); 
        }

        #__vpe_toolbar__[data-theme="light"] .vpe-size-indicator {
          background: rgba(255, 255, 255, 0.95);
          color: var(--vpe-highlight);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .vpe-action-tip {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          background: var(--vpe-bg-secondary);
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          color: var(--vpe-text-secondary);
          white-space: nowrap;
          display: flex;
          gap: 12px;
          z-index: 10;
        }
        .vpe-action-tip kbd {
          background: var(--vpe-bg-tertiary);
          border: 1px solid var(--vpe-border);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: inherit;
          color: var(--vpe-text-secondary);
        }
        
        .vpe-dragging { opacity: 0.9; transition: none !important; }

        .vpe-fullscreen-editor {
          position: fixed;
          inset: 0;
          z-index: 2147483647;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%);
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          animation: vpe-fadeIn 0.3s ease;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] {
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #f1f5f9 100%);
        }
        
        @keyframes vpe-fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .vpe-fs-header {
          height: 56px;
          background: rgba(20, 20, 35, 0.95);
          border-bottom: 1px solid var(--vpe-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          backdrop-filter: blur(10px);
          flex-shrink: 0;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-header {
          background: rgba(255, 255, 255, 0.95);
          border-bottom: 1px solid rgba(99, 102, 241, 0.2);
        }
        
        .vpe-fs-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: var(--vpe-text-primary);
          font-size: 18px;
          font-weight: 600;
        }
        
        .vpe-fs-title-icon {
          width: 32px;
          height: 32px;
          background: var(--vpe-bg-hover);
          border: 1px solid var(--vpe-border-active);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        
        .vpe-fs-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .vpe-fs-btn {
          padding: 8px 16px;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .vpe-fs-btn:hover {
          background: var(--vpe-bg-hover);
          border-color: var(--vpe-border-active);
        }
        
        .vpe-fs-btn-primary {
          background: var(--vpe-bg-hover);
          color: var(--vpe-text-primary);
          border-color: var(--vpe-border-active);
        }
        
        .vpe-fs-btn-primary:hover {
          background: var(--vpe-bg-active);
          color: white;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
          transform: translateY(-1px);
        }

        
        .vpe-fs-btn-danger {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }
        
        .vpe-fs-btn-danger:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.5);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-btn {
          color: #334155;
          border-color: rgba(99, 102, 241, 0.25);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-btn-danger {
          color: #dc2626;
        }
        
        .vpe-fs-close {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: #f87171;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .vpe-fs-close:hover {
          background: #ef4444;
          color: white;
          transform: scale(1.05);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-close {
          color: #dc2626;
        }
        
        .vpe-fs-main {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        
        .vpe-fs-preview {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: radial-gradient(ellipse at center, rgba(30,30,50,0.3) 0%, transparent 70%);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-preview {
          background: radial-gradient(ellipse at center, rgba(99,102,241,0.05) 0%, transparent 70%);
        }
        
        .vpe-fs-blur-bg {
          position: absolute;
          inset: -50px;
          background-size: cover;
          background-position: center;
          filter: blur(40px) brightness(0.4) saturate(1.2);
          opacity: 0.7;
          transform: scale(1.3);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-blur-bg {
          filter: blur(40px) brightness(0.95) saturate(1.1);
          opacity: 0.5;
        }
        
        .vpe-fs-canvas-container {
          position: relative;
          max-width: calc(100% - 60px);
          max-height: calc(100% - 60px);
          z-index: 1;
        }
        
        .vpe-fs-canvas {
          display: block;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1);
          transition: transform 0.3s ease;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-canvas {
          box-shadow: 0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(99,102,241,0.2);
        }
        
        .vpe-fs-annotation-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 2;
          transform-origin: top left;
        }
        
        .vpe-arrow {
          position: absolute;
          pointer-events: auto;
          cursor: move;
          z-index: 10;
        }
        
        .vpe-arrow.selected {
          outline: 2px dashed rgba(255,255,255,0.5);
        }
        
        .vpe-arrow-delete {
          position: absolute;
          width: 20px;
          height: 20px;
          background: #ef4444;
          border-radius: 50%;
          color: white;
          font-size: 12px;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          top: -10px;
          right: -10px;
          z-index: 11;
        }
        
        .vpe-arrow.selected .vpe-arrow-delete {
          display: flex;
        }
        
        .vpe-emoji {
          position: absolute;
          font-size: 32px;
          cursor: move;
          pointer-events: auto;
          user-select: none;
          z-index: 10;
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        
        .vpe-emoji.selected {
          outline: 2px dashed rgba(255,255,255,0.5);
          border-radius: 4px;
        }
        
        .vpe-emoji-delete {
          position: absolute;
          width: 20px;
          height: 20px;
          background: #ef4444;
          border-radius: 50%;
          color: white;
          font-size: 12px;
          display: none;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          top: -10px;
          right: -10px;
          z-index: 11;
        }
        
        .vpe-emoji.selected .vpe-emoji-delete {
          display: flex;
        }
        
        .vpe-fs-zoom-controls {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(20, 20, 35, 0.95);
          border: 1px solid var(--vpe-border);
          border-radius: 12px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          backdrop-filter: blur(10px);
          z-index: 10;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-zoom-controls {
          background: rgba(255, 255, 255, 0.95);
          border-color: rgba(99, 102, 241, 0.2);
        }
        
        .vpe-fs-zoom-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          border: 1px solid var(--vpe-border);
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: bold;
          transition: all 0.2s;
        }
        
        .vpe-fs-zoom-btn:hover {
          background: var(--vpe-bg-hover);
          transform: scale(1.05);
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-zoom-btn {
          color: #334155;
        }
        
        .vpe-fs-zoom-value {
          color: white;
          font-size: 14px;
          font-weight: 500;
          min-width: 60px;
          text-align: center;
          font-family: 'SF Mono', monospace;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-zoom-value {
          color: #1e293b;
        }
        
        .vpe-fs-zoom-slider {
          width: 120px;
          height: 4px;
          border-radius: 2px;
          background: var(--vpe-bg-tertiary);
          -webkit-appearance: none;
          cursor: pointer;
        }
        
        .vpe-fs-zoom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--vpe-bg-active);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.5);
        }
        
        .vpe-fs-sidebar {
          width: 320px;
          background: var(--vpe-bg-secondary);
          border-left: 1px solid var(--vpe-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          flex-shrink: 0;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-sidebar {
          background: rgba(255, 255, 255, 0.98);
          border-left-color: rgba(99, 102, 241, 0.2);
        }
        
        .vpe-fs-sidebar-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .vpe-fs-sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        
        .vpe-fs-sidebar-scroll::-webkit-scrollbar-track {
          background: var(--vpe-bg-tertiary);
        }
        
        .vpe-fs-sidebar-scroll::-webkit-scrollbar-thumb {
          background: var(--vpe-border);
          border-radius: 3px;
        }
        
        .vpe-fs-tool-group {
          background: var(--vpe-bg-tertiary);
          border: 1px solid rgba(99, 102, 241, 0.15);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-tool-group {
          background: rgba(99, 102, 241, 0.05);
          border-color: rgba(99, 102, 241, 0.15);
        }
        
        .vpe-fs-tool-group-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--vpe-text-primary);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(99, 102, 241, 0.15);
        }
        
        .vpe-fs-tool-group-title span {
          font-size: 16px;
        }
        
        .vpe-fs-tools-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .vpe-fs-tool-btn {
          padding: 12px 10px;
          border: 1px solid var(--vpe-border);
          border-radius: 10px;
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          font-size: 12px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        
        .vpe-fs-tool-btn:hover {
          background: var(--vpe-bg-hover);
          border-color: var(--vpe-border-active);
          transform: translateY(-1px);
        }
        
        .vpe-fs-tool-btn.active {
          background: var(--vpe-bg-active);
          color: white;
          border-color: var(--vpe-border-active);
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
        }
        
        .vpe-fs-tool-btn-icon {
          font-size: 20px;
        }
        
        .vpe-fs-filters-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        
        .vpe-fs-filter-item {
          padding: 10px 12px;
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          color: var(--vpe-text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .vpe-fs-filter-item:hover {
          background: var(--vpe-bg-hover);
        }
        
        .vpe-fs-filter-item.active {
          background: var(--vpe-bg-hover);
          color: var(--vpe-text-secondary);
          border: 1px solid var(--vpe-border-active);
        }
        
        .vpe-fs-doodle-settings {
          display: none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
        }
        
        .vpe-fs-doodle-settings.show {
          display: block;
        }
        
        .vpe-fs-arrow-settings {
          display: none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
        }
        
        .vpe-fs-arrow-settings.show {
          display: block;
        }
        
        .vpe-fs-emoji-picker {
          display: none;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(99, 102, 241, 0.15);
        }
        
        .vpe-fs-emoji-picker.show {
          display: block;
        }
        
        .vpe-emoji-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 6px;
        }
        
        .vpe-emoji-btn {
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid var(--vpe-border);
          border-radius: 8px;
          background: var(--vpe-bg-tertiary);
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }
        
        .vpe-emoji-btn:hover {
          background: var(--vpe-bg-hover);
          transform: scale(1.1);
        }
        
        .vpe-fs-setting-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 10px 0;
        }
        
        .vpe-fs-setting-label {
          color: var(--vpe-text-tertiary);
          font-size: 11px;
          min-width: 40px;
        }
        
        .vpe-fs-color-picker {
          width: 36px;
          height: 28px;
          border-radius: 6px;
          border: 1px solid var(--vpe-border);
          cursor: pointer;
          padding: 0;
        }
        
        .vpe-fs-range-slider {
          flex: 1;
          height: 4px;
          border-radius: 2px;
          background: var(--vpe-bg-tertiary);
          -webkit-appearance: none;
        }
        
        .vpe-fs-range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: var(--vpe-bg-active);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.5);
        }
        
        .vpe-fs-range-value {
          color: white;
          font-size: 11px;
          font-family: 'SF Mono', monospace;
          min-width: 30px;
          text-align: right;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-range-value {
          color: #1e293b;
        }
        
        .vpe-fs-slider-setting {
          margin-bottom: 16px;
        }
        
        .vpe-fs-slider-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .vpe-fs-slider-title {
          color: var(--vpe-text-tertiary);
          font-size: 12px;
          font-weight: 500;
        }
        
        .vpe-fs-slider-val {
          color: #fff;
          font-size: 11px;
          font-family: 'SF Mono', monospace;
        }
        
        .vpe-fullscreen-editor[data-theme="light"] .vpe-fs-slider-val {
          color: #1e293b;
        }

        @media (max-width: 900px) {
          .vpe-fs-sidebar {
            width: 280px;
          }
        }
        
        @media (max-width: 700px) {
          .vpe-fs-main {
            flex-direction: column;
          }
          .vpe-fs-sidebar {
            width: 100%;
            max-height: 40vh;
          }
          .vpe-fs-header {
            padding: 0 12px;
          }
          .vpe-fs-title span:last-child {
            display: none;
          }
        }
      </style>
      <div class="vpe-header">
        <div class="vpe-title">🎨 编辑器</div>
        <div class="vpe-header-actions">
          <button class="vpe-theme-btn" id="__vpe_theme_toggle__" title="切换主题">🌙</button>
          <button class="vpe-close" id="__vpe_close__">✖ </button>
        </div>
      </div>
      <button class="vpe-btn vpe-btn-primary" id="__vpe_toggle__">
        <span>✏️</span><span>开启编辑</span>
      </button>
      <div class="vpe-section">
        <div class="vpe-section-title">元素操作</div>
        <div class="vpe-row">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_clear__">🗑️ 清空</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_copy__">📋 复制</button>
        </div>
        <div class="vpe-row">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_hide__">👁️‍🗨️隐藏</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_show__">👁️ 显示</button>
        </div>
        <div class="vpe-row">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_insert_img__" disabled title="请先开启编辑模式">🖼️ 插入图片</button>
        </div>
      </div>
      <div class="vpe-section vpe-text-section" id="__vpe_text_section__">
        <div class="vpe-section-title">文字样式</div>
        <div class="vpe-row">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_align_left__">⬅ 左</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_align_center__">🔘 中</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_align_right__">➡ 右</button>
        </div>
        <div class="vpe-row" style="margin-top: 8px;">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_fontup__">A+ 放大</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_fontdown__">A- 缩小</button>
        </div>
        <div class="vpe-row" style="margin-top: 8px;">
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_underline__"><u>U</u> 下划线</button>
          <button class="vpe-btn vpe-btn-secondary" id="__vpe_strikethrough__"><s>S</s> 删除线</button>
        </div>
        <div class="vpe-row" style="margin-top: 8px;">
          <input type="color" class="vpe-color-input" id="__vpe_bgcolor__" title="背景色" value="#6366f1">
          <input type="color" class="vpe-color-input" id="__vpe_textcolor__" title="文字色" value="#ffffff">
        </div>
      </div>
      <div class="vpe-section vpe-image-section" id="__vpe_image_section__">
        <div class="vpe-section-title">图片快速操作</div>
        <div class="vpe-size-quick-adjust">
          <div class="vpe-size-input-group">
            <span class="vpe-size-label">宽度</span>
            <input type="number" class="vpe-size-input" id="__vpe_quick_width__" placeholder="宽度" min="20" max="2000">
          </div>
          <button class="vpe-lock-btn active" id="__vpe_lock_ratio_quick__" title="解锁比例">🔒</button>
          <div class="vpe-size-input-group">
            <span class="vpe-size-label">高度</span>
            <input type="number" class="vpe-size-input" id="__vpe_quick_height__" placeholder="高度" min="20" max="2000">
          </div>
        </div>
        <div class="vpe-img-quick-actions">
          <button class="vpe-img-quick-btn" data-action="round">⭕ 圆角</button>
          <button class="vpe-img-quick-btn" data-action="shadow">🔲 阴影</button>
          <button class="vpe-img-quick-btn" data-action="center">⊕ 居中</button>
          <button class="vpe-img-quick-btn" data-action="cover">⬛ 填充</button>
          <button class="vpe-img-quick-btn" data-action="contain">🔲 适应</button>
          <button class="vpe-img-quick-btn" data-action="circle">🔵 圆形</button>
        </div>
        <button class="vpe-btn vpe-btn-secondary" id="__vpe_img_edit__">⚙️ 详细编辑</button>
      </div>
      <div class="vpe-info" id="__vpe_info__">💡 点击开启编辑模式</div>
      <input type="file" id="__vpe_img_file__" accept="image/*" style="display:none">
    `;

    document.body.appendChild(toolbar);
    
    applyTheme(state.theme);
    
    const themeToggleBtn = toolbar.querySelector('#__vpe_theme_toggle__');
    themeToggleBtn.addEventListener('click', () => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
    });
    
    const closeBtn = toolbar.querySelector('#__vpe_close__');
    closeBtn.addEventListener('click', () => {
        window.__vpe_close();
    });
    
    setupToolbarEvents(toolbar);
    cleanupFunctions.push(makeDraggable(toolbar));
    adjustToolbarSize(toolbar);
    
    const resizeHandler = () => adjustToolbarSize(toolbar);
    window.addEventListener('resize', resizeHandler);
    cleanupFunctions.push(() => window.removeEventListener('resize', resizeHandler));
    
    return toolbar;
  }

  function adjustToolbarSize(toolbar) {
    toolbar.classList.toggle('compact', window.innerWidth < 480);
  }

  function createHighlightBox() {
    const box = document.createElement('div');
    box.id = '__vpe_highlight_box__';
    
    const label = document.createElement('div');
    label.className = 'vpe-element-label';
    box.appendChild(label);
    
    const widthIndicator = document.createElement('div');
    widthIndicator.className = 'vpe-size-indicator width';
    box.appendChild(widthIndicator);
    
    const actionTip = document.createElement('div');
    actionTip.className = 'vpe-action-tip';
    actionTip.style.display = 'none';  
    actionTip.innerHTML = '<span><kbd>点击</kbd> 选择</span>';
    box.appendChild(actionTip);
    
    document.body.appendChild(box);
    state.highlightBox = box;
    state.infoLabel = label;
    return box;
  }

  function hasTextContent(element) {
    if (!element) return false;
    
    const text = element.textContent ? element.textContent.trim() : '';
    if (text.length > 0) {
      for (const node of element.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0) {
          return true;
        }
      }
      const textTags = ['P', 'SPAN', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'A', 'STRONG', 'EM', 'B', 'I', 'LABEL', 'BUTTON', 'INPUT', 'TEXTAREA'];
      const hasTextChildren = element.querySelectorAll(textTags.join(',')).length > 0;
      if (hasTextChildren) return true;
    }
    
    const tagName = element.tagName.toLowerCase();
    const textElements = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th', 'a', 'strong', 'em', 'b', 'i', 'label', 'button', 'input', 'textarea'];
    
    if (textElements.includes(tagName)) {
      if (tagName === 'input' || tagName === 'textarea') {
        return true;
      }
      return text.length > 0;
    }
    
    return false;
  }

  function updateTextSection(element) {
    const textSection = document.getElementById('__vpe_text_section__');
    if (textSection) {
      const shouldShow = element && hasTextContent(element);
      textSection.classList.toggle('active', shouldShow);
    }
  }

  function applyColorToElement(element, color, type) {
    if (type === 'color') {
      element.style.color = color;
      const links = element.querySelectorAll('a');
      links.forEach(link => { link.style.color = color; });
      if (element.tagName.toLowerCase() === 'a') {
        element.style.color = color;
      }
    } else if (type === 'background') {
      element.style.backgroundColor = color;
    }
  }

  function updateQuickSizeInputs(element) {
    const quickWidthInput = document.getElementById('__vpe_quick_width__');
    const quickHeightInput = document.getElementById('__vpe_quick_height__');
    
    if (!quickWidthInput || !quickHeightInput) return;
    
    if (element && element.tagName.toLowerCase() === 'img') {
      const displayWidth = element.offsetWidth;
      const displayHeight = element.offsetHeight;
      const naturalWidth = element.naturalWidth || element.width;
      const naturalHeight = element.naturalHeight || element.height;
      
      quickWidthInput.value = displayWidth;
      quickHeightInput.value = displayHeight;
      state.currentRatio = naturalWidth / naturalHeight;
    } else {
      quickWidthInput.value = '';
      quickHeightInput.value = '';
      state.currentRatio = 1;
    }
  }

  function showImageEditPanel(img) {
    if (state.imageEditPanel) {
      state.imageEditPanel.remove();
    }

    const panel = document.createElement('div');
    panel.className = 'vpe-fullscreen-editor';
    panel.id = '__vpe_fullscreen_editor__';
    panel.setAttribute('data-vpe-ignore', 'true');
    panel.setAttribute('contenteditable', 'false');
    panel.setAttribute('data-theme', state.theme);

    const naturalWidth = img.naturalWidth || img.width;
    const naturalHeight = img.naturalHeight || img.height;
    const displayWidth = img.offsetWidth;
    const displayHeight = img.offsetHeight;

    panel.innerHTML = `
      <div class="vpe-fs-header">
        <div class="vpe-fs-title">
          <div class="vpe-fs-title-icon">🖼️</div>
          <span>图片编辑器</span>
        </div>
        <div class="vpe-fs-header-actions">
          <button class="vpe-fs-btn" id="__vpe_fs_reset__">🔄 重置</button>
          <button class="vpe-fs-btn vpe-fs-btn-primary" id="__vpe_fs_apply__">✅ 应用更改</button>
          <button class="vpe-fs-close" id="__vpe_fs_close__">×</button>
        </div>
      </div>
      
      <div class="vpe-fs-main">
        <div class="vpe-fs-preview">
          <div class="vpe-fs-blur-bg"></div>
          <div class="vpe-fs-canvas-container">
            <canvas class="vpe-fs-canvas"></canvas>
            <div class="vpe-fs-annotation-overlay"></div>
          </div>
          
          <div class="vpe-fs-zoom-controls">
            <button class="vpe-fs-zoom-btn" data-zoom="out">−</button>
            <input type="range" class="vpe-fs-zoom-slider" min="25" max="200" value="100">
            <button class="vpe-fs-zoom-btn" data-zoom="in">+</button>
            <span class="vpe-fs-zoom-value">100%</span>
          </div>
        </div>
        
        <div class="vpe-fs-sidebar">
          <div class="vpe-fs-sidebar-scroll">
            <div class="vpe-fs-tool-group">
              <div class="vpe-fs-tool-group-title">
                <span>🎨</span> 编辑工具
              </div>
              <div class="vpe-fs-tools-grid">
                <button class="vpe-fs-tool-btn" data-tool="doodle">
                  <span class="vpe-fs-tool-btn-icon">✏️</span>
                  <span>涂鸦</span>
                </button>
                <button class="vpe-fs-tool-btn" data-tool="mosaic">
                  <span class="vpe-fs-tool-btn-icon">🔲</span>
                  <span>马赛克</span>
                </button>
                <button class="vpe-fs-tool-btn" data-tool="arrow">
                  <span class="vpe-fs-tool-btn-icon">➡️</span>
                  <span>箭头</span>
                </button>
                <button class="vpe-fs-tool-btn" data-tool="emoji">
                  <span class="vpe-fs-tool-btn-icon">😀</span>
                  <span>表情</span>
                </button>
              </div>
              
              <div class="vpe-fs-doodle-settings" id="__vpe_fs_doodle_settings__">
                <div class="vpe-fs-setting-row">
                  <span class="vpe-fs-setting-label">颜色</span>
                  <input type="color" class="vpe-fs-color-picker" id="__vpe_fs_doodle_color__" value="#ff6b6b">
                </div>
                <div class="vpe-fs-setting-row">
                  <span class="vpe-fs-setting-label">粗细</span>
                  <input type="range" class="vpe-fs-range-slider" id="__vpe_fs_doodle_size__" min="1" max="30" value="5">
                  <span class="vpe-fs-range-value" id="__vpe_fs_doodle_size_val__">5</span>
                </div>
                <button class="vpe-fs-tool-btn" style="margin-top:10px" data-action="clear-doodle">🗑️ 清除涂鸦</button>
              </div>
              
              <div class="vpe-fs-arrow-settings" id="__vpe_fs_arrow_settings__">
                <div class="vpe-fs-setting-row">
                  <span class="vpe-fs-setting-label">颜色</span>
                  <input type="color" class="vpe-fs-color-picker" id="__vpe_fs_arrow_color__" value="#f59e0b">
                </div>
                <div class="vpe-fs-setting-row">
                  <span class="vpe-fs-setting-label">粗细</span>
                  <input type="range" class="vpe-fs-range-slider" id="__vpe_fs_arrow_size__" min="2" max="10" value="4">
                  <span class="vpe-fs-range-value" id="__vpe_fs_arrow_size_val__">4</span>
                </div>
                <button class="vpe-fs-tool-btn" style="margin-top:10px" data-action="clear-arrows">🗑️ 清除箭头</button>
              </div>
              
              <div class="vpe-fs-emoji-picker" id="__vpe_fs_emoji_picker__">
                <div class="vpe-emoji-grid">
                  <button class="vpe-emoji-btn" data-emoji="😀">😀</button>
                  <button class="vpe-emoji-btn" data-emoji="😂">😂</button>
                  <button class="vpe-emoji-btn" data-emoji="😍">😍</button>
                  <button class="vpe-emoji-btn" data-emoji="🥰">🥰</button>
                  <button class="vpe-emoji-btn" data-emoji="😎">😎</button>
                  <button class="vpe-emoji-btn" data-emoji="🤔">🤔</button>
                  <button class="vpe-emoji-btn" data-emoji="👍">👍</button>
                  <button class="vpe-emoji-btn" data-emoji="👎">👎</button>
                  <button class="vpe-emoji-btn" data-emoji="❤️">❤️</button>
                  <button class="vpe-emoji-btn" data-emoji="🔥">🔥</button>
                  <button class="vpe-emoji-btn" data-emoji="⭐">⭐</button>
                  <button class="vpe-emoji-btn" data-emoji="💯">💯</button>
                  <button class="vpe-emoji-btn" data-emoji="🎉">🎉</button>
                  <button class="vpe-emoji-btn" data-emoji="👏">👏</button>
                  <button class="vpe-emoji-btn" data-emoji="🙏">🙏</button>
                  <button class="vpe-emoji-btn" data-emoji="💪">💪</button>
                  <button class="vpe-emoji-btn" data-emoji="😱">😱</button>
                  <button class="vpe-emoji-btn" data-emoji="🤣">🤣</button>
                </div>
                <button class="vpe-fs-tool-btn" style="margin-top:10px" data-action="clear-emojis">🗑️ 清除表情</button>
              </div>
            </div>
            
            <div class="vpe-fs-tool-group">
              <div class="vpe-fs-tool-group-title">
                <span>✨</span> 滤镜效果
              </div>
              <div class="vpe-fs-filters-grid">
                <div class="vpe-fs-filter-item active" data-filter="none">📷 原图</div>
                <div class="vpe-fs-filter-item" data-filter="grayscale">⚫ 黑白</div>
                <div class="vpe-fs-filter-item" data-filter="sepia">🎞️ 复古</div>
                <div class="vpe-fs-filter-item" data-filter="blur">🌫️ 模糊</div>
                <div class="vpe-fs-filter-item" data-filter="brightness">☀️ 明亮</div>
                <div class="vpe-fs-filter-item" data-filter="contrast">◐ 对比</div>
                <div class="vpe-fs-filter-item" data-filter="saturate">🌈 饱和</div>
                <div class="vpe-fs-filter-item" data-filter="invert">🔄 反转</div>
              </div>
            </div>
            
            <div class="vpe-fs-tool-group">
              <div class="vpe-fs-tool-group-title">
                <span>🎛️</span> 样式调整
              </div>
              
              <div class="vpe-fs-slider-setting">
                <div class="vpe-fs-slider-header">
                  <span class="vpe-fs-slider-title">透明度</span>
                  <span class="vpe-fs-slider-val" id="__vpe_fs_opacity_val__">100%</span>
                </div>
                <input type="range" class="vpe-fs-range-slider" id="__vpe_fs_opacity__" min="0" max="100" value="100">
              </div>
              
              <div class="vpe-fs-slider-setting">
                <div class="vpe-fs-slider-header">
                  <span class="vpe-fs-slider-title">圆角</span>
                  <span class="vpe-fs-slider-val" id="__vpe_fs_radius_val__">0px</span>
                </div>
                <input type="range" class="vpe-fs-range-slider" id="__vpe_fs_radius__" min="0" max="200" value="0">
              </div>
              
              <div class="vpe-fs-slider-setting">
                <div class="vpe-fs-slider-header">
                  <span class="vpe-fs-slider-title">模糊</span>
                  <span class="vpe-fs-slider-val" id="__vpe_fs_blur_val__">0px</span>
                </div>
                <input type="range" class="vpe-fs-range-slider" id="__vpe_fs_blur__" min="0" max="20" value="0">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(panel);
    state.imageEditPanel = panel;

    panel.addEventListener('mousedown', (e) => e.stopPropagation());
    panel.addEventListener('click', (e) => e.stopPropagation());

    const canvas = panel.querySelector('.vpe-fs-canvas');
    const ctx = canvas.getContext('2d');
    const blurBg = panel.querySelector('.vpe-fs-blur-bg');
    const annotationOverlay = panel.querySelector('.vpe-fs-annotation-overlay');
    const doodleSettings = panel.querySelector('#__vpe_fs_doodle_settings__');
    const arrowSettings = panel.querySelector('#__vpe_fs_arrow_settings__');
    const emojiPicker = panel.querySelector('#__vpe_fs_emoji_picker__');
    
    let currentZoom = 1;
    let originalImageData = null;
    let currentFilter = 'none';
    let currentTool = null;
    let isDoodling = false;
    let lastX = 0, lastY = 0;
    let isMosaicing = false;
    let arrows = [];
    let selectedArrow = null;
    let isDrawingArrow = false;
    let arrowStartPos = null;
    let tempArrowLine = null;
    let emojis = [];
    let selectedEmoji = null;
    let pendingEmoji = null;
    let isDraggingEmoji = false;
    let emojiDragOffset = { x: 0, y: 0 };
    
    const originalRatio = naturalWidth / naturalHeight;

    function initCanvas() {
      const maxPreviewSize = Math.min(window.innerWidth - 400, window.innerHeight - 200, 800);
      let displayW = naturalWidth;
      let displayH = naturalHeight;
      
      if (naturalWidth > maxPreviewSize || naturalHeight > maxPreviewSize) {
        if (naturalWidth > naturalHeight) {
          displayW = maxPreviewSize;
          displayH = Math.round(maxPreviewSize / originalRatio);
        } else {
          displayH = maxPreviewSize;
          displayW = Math.round(maxPreviewSize * originalRatio);
        }
      }
      
      canvas.width = displayW;
      canvas.height = displayH;
      
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = () => {
        ctx.drawImage(tempImg, 0, 0, displayW, displayH);
        originalImageData = ctx.getImageData(0, 0, displayW, displayH);
        blurBg.style.backgroundImage = `url(${img.src})`;
      };
      tempImg.src = img.src;
    }
    
    initCanvas();

    const canvasContainer = panel.querySelector('.vpe-fs-canvas-container');
    const opacitySlider = panel.querySelector('#__vpe_fs_opacity__');
    const opacityVal = panel.querySelector('#__vpe_fs_opacity_val__');
    const radiusSlider = panel.querySelector('#__vpe_fs_radius__');
    const radiusVal = panel.querySelector('#__vpe_fs_radius_val__');
    const blurSlider = panel.querySelector('#__vpe_fs_blur__');
    const blurVal = panel.querySelector('#__vpe_fs_blur_val__');
    
    opacitySlider.addEventListener('input', () => {
      canvasContainer.style.opacity = opacitySlider.value / 100;
      opacityVal.textContent = opacitySlider.value + '%';
    });
    
    radiusSlider.addEventListener('input', () => {
      canvas.style.borderRadius = radiusSlider.value + 'px';
      radiusVal.textContent = radiusSlider.value + 'px';
    });
    
    blurSlider.addEventListener('input', () => {
      const blurValue = blurSlider.value;
      canvas.style.filter = `blur(${blurValue}px)`;
      blurVal.textContent = blurValue + 'px';
    });

    const zoomSlider = panel.querySelector('.vpe-fs-zoom-slider');
    const zoomValue = panel.querySelector('.vpe-fs-zoom-value');
    
    function updateZoom(val) {
      currentZoom = val / 100;
      canvas.style.transform = `scale(${currentZoom})`;
      annotationOverlay.style.transform = `scale(${currentZoom})`;
      zoomSlider.value = val;
      zoomValue.textContent = val + '%';
      updateAnnotationPositions();
    }
    
    zoomSlider.addEventListener('input', () => updateZoom(parseInt(zoomSlider.value)));
    
    panel.querySelectorAll('.vpe-fs-zoom-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const current = parseInt(zoomSlider.value);
        const delta = btn.dataset.zoom === 'in' ? 10 : -10;
        updateZoom(Math.max(25, Math.min(200, current + delta)));
      });
    });

    const doodleColor = panel.querySelector('#__vpe_fs_doodle_color__');
    const doodleSize = panel.querySelector('#__vpe_fs_doodle_size__');
    const doodleSizeVal = panel.querySelector('#__vpe_fs_doodle_size_val__');
    
    doodleSize.addEventListener('input', () => {
      doodleSizeVal.textContent = doodleSize.value;
    });
    
    const arrowColor = panel.querySelector('#__vpe_fs_arrow_color__');
    const arrowSize = panel.querySelector('#__vpe_fs_arrow_size__');
    const arrowSizeVal = panel.querySelector('#__vpe_fs_arrow_size_val__');
    
    arrowSize.addEventListener('input', () => {
      arrowSizeVal.textContent = arrowSize.value;
    });

    function getCanvasCoords(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      return { x, y };
    }

    canvas.addEventListener('mousedown', (e) => {
      const coords = getCanvasCoords(e);
      const x = coords.x;
      const y = coords.y;
      
      if (currentTool === 'doodle') {
        isDoodling = true;
        lastX = x;
        lastY = y;
      } else if (currentTool === 'mosaic') {
        isMosaicing = true;
        applyMosaic(x, y);
      } else if (currentTool === 'arrow') {
        isDrawingArrow = true;
        arrowStartPos = { x, y };
      } else if (currentTool === 'emoji' && pendingEmoji) {
        createEmoji(x, y, pendingEmoji);
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const coords = getCanvasCoords(e);
      const x = coords.x;
      const y = coords.y;
      
      if (isDoodling && currentTool === 'doodle') {
        ctx.beginPath();
        ctx.strokeStyle = doodleColor.value;
        ctx.lineWidth = parseInt(doodleSize.value);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
      } else if (isMosaicing && currentTool === 'mosaic') {
        applyMosaic(x, y);
      } else if (isDrawingArrow && currentTool === 'arrow') {
        drawTempArrow(arrowStartPos.x, arrowStartPos.y, x, y);
      }
    });
    
    canvas.addEventListener('mouseup', (e) => {
      if (isDrawingArrow && currentTool === 'arrow') {
        const coords = getCanvasCoords(e);
        const endX = coords.x;
        const endY = coords.y;
        
        const dx = endX - arrowStartPos.x;
        const dy = endY - arrowStartPos.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length > 20) {
          createArrow(arrowStartPos.x, arrowStartPos.y, endX, endY);
        }
        
        clearTempArrow();
      }
      
      isDoodling = false;
      isMosaicing = false;
      isDrawingArrow = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
      isDoodling = false;
      isMosaicing = false;
      isDrawingArrow = false;
      clearTempArrow();
    });

    function applyMosaic(x, y) {
      const blockSize = 15;
      const halfBlock = blockSize / 2;
      
      for (let bx = x - blockSize; bx < x + blockSize; bx += blockSize) {
        for (let by = y - blockSize; by < y + blockSize; by += blockSize) {
          const sampleX = Math.max(0, Math.min(canvas.width - 1, Math.floor(bx + halfBlock)));
          const sampleY = Math.max(0, Math.min(canvas.height - 1, Math.floor(by + halfBlock)));
          
          const pixelData = ctx.getImageData(sampleX, sampleY, 1, 1).data;
          const r = pixelData[0];
          const g = pixelData[1];
          const b = pixelData[2];
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
          ctx.fillRect(
            Math.max(0, Math.floor(bx / blockSize) * blockSize),
            Math.max(0, Math.floor(by / blockSize) * blockSize),
            blockSize,
            blockSize
          );
        }
      }
    }

    function createArrow(startX, startY, endX, endY) {
      const arrow = {
        startX,
        startY,
        endX,
        endY,
        color: arrowColor.value,
        size: parseInt(arrowSize.value),
        element: null
      };
      
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const arrowHeadSize = Math.min(20, arrow.size * 3);
      
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('vpe-arrow');
      svg.setAttribute('data-vpe-ignore', 'true');
      svg.style.position = 'absolute';
      svg.style.overflow = 'visible';
      svg.style.pointerEvents = 'auto';
      svg.style.cursor = 'move';
      
      const svgWidth = length + arrowHeadSize + 10;
      const svgHeight = arrow.size * 2 + 20;
      
      svg.setAttribute('width', svgWidth);
      svg.setAttribute('height', svgHeight);
      
      svg.style.left = '0';
      svg.style.top = '0';
      
      const lineY = svgHeight / 2;
      const lineEndX = length;
      
      const markerId = 'arrowhead-' + Date.now() + Math.random().toString(36).substr(2, 9);
      
      svg.innerHTML = `
        <defs>
          <marker id="${markerId}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="${arrow.color}" />
          </marker>
        </defs>
        <line x1="0" y1="${lineY}" x2="${lineEndX}" y2="${lineY}" 
              stroke="${arrow.color}" stroke-width="${arrow.size}" stroke-linecap="round"
              marker-end="url(#${markerId})" />
      `;
      
      svg.style.transform = `translate(${startX}px, ${startY - lineY}px) rotate(${angle}deg)`;
      svg.style.transformOrigin = '0 50%';
      
      const deleteBtn = document.createElement('div');
      deleteBtn.className = 'vpe-arrow-delete';
      deleteBtn.textContent = '×';
      deleteBtn.style.display = 'none';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        svg.remove();
        const index = arrows.indexOf(arrow);
        if (index > -1) arrows.splice(index, 1);
      });
      svg.appendChild(deleteBtn);
      
      svg.addEventListener('click', (e) => {
        e.stopPropagation();
        arrows.forEach(a => a.element && a.element.classList.remove('selected'));
        svg.classList.add('selected');
        selectedArrow = arrow;
      });
      
      let isDragging = false;
      let dragStartX, dragStartY;
      let origStartX, origStartY;
      
      svg.addEventListener('mousedown', (e) => {
        if (e.target.tagName === 'line' || e.target.tagName === 'svg' || e.target.tagName === 'polygon') {
          isDragging = true;
          dragStartX = e.clientX;
          dragStartY = e.clientY;
          origStartX = arrow.startX;
          origStartY = arrow.startY;
          e.preventDefault();
          e.stopPropagation();
        }
      });
      
      const handleMouseMove = (e) => {
        if (!isDragging) return;
        
        const screenDx = e.clientX - dragStartX;
        const screenDy = e.clientY - dragStartY;
        
        const rect = canvas.getBoundingClientRect();
        const canvasDx = screenDx * (canvas.width / rect.width);
        const canvasDy = screenDy * (canvas.height / rect.height);
        
        arrow.startX = origStartX + canvasDx;
        arrow.startY = origStartY + canvasDy;
        arrow.endX = arrow.startX + dx;
        arrow.endY = arrow.startY + dy;
        
        svg.style.transform = `translate(${arrow.startX}px, ${arrow.startY - lineY}px) rotate(${angle}deg)`;
      };
      
      const handleMouseUp = () => {
        isDragging = false;
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      annotationOverlay.appendChild(svg);
      arrow.element = svg;
      arrow.lineY = lineY;
      arrows.push(arrow);
    }
    
    function drawTempArrow(startX, startY, endX, endY) {
      clearTempArrow();
      
      const dx = endX - startX;
      const dy = endY - startY;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const size = parseInt(arrowSize.value);
      
      tempArrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      tempArrowLine.setAttribute('data-vpe-ignore', 'true');
      tempArrowLine.style.position = 'absolute';
      tempArrowLine.style.overflow = 'visible';
      tempArrowLine.style.pointerEvents = 'none';
      tempArrowLine.style.opacity = '0.6';
      tempArrowLine.style.left = '0';
      tempArrowLine.style.top = '0';
      
      const svgHeight = size * 2 + 20;
      const lineY = svgHeight / 2;
      
      tempArrowLine.setAttribute('width', length + 10);
      tempArrowLine.setAttribute('height', svgHeight);
      
      tempArrowLine.style.transform = `translate(${startX}px, ${startY - lineY}px) rotate(${angle}deg)`;
      tempArrowLine.style.transformOrigin = '0 50%';
      
      tempArrowLine.innerHTML = `
        <line x1="0" y1="${lineY}" x2="${length}" y2="${lineY}" 
              stroke="${arrowColor.value}" stroke-width="${size}" stroke-linecap="round" />
      `;
      
      annotationOverlay.appendChild(tempArrowLine);
    }
    
    function clearTempArrow() {
      if (tempArrowLine) {
        tempArrowLine.remove();
        tempArrowLine = null;
      }
    }

    function createEmoji(x, y, emoji) {
      const emojiEl = document.createElement('div');
      emojiEl.className = 'vpe-emoji';
      emojiEl.setAttribute('data-vpe-ignore', 'true');
      emojiEl.textContent = emoji;
      emojiEl.style.left = (x - 16) + 'px';
      emojiEl.style.top = (y - 16) + 'px';
      
      const deleteBtn = document.createElement('div');
      deleteBtn.className = 'vpe-emoji-delete';
      deleteBtn.textContent = '×';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiEl.remove();
        const index = emojis.indexOf(emojiObj);
        if (index > -1) emojis.splice(index, 1);
      });
      emojiEl.appendChild(deleteBtn);
      
      const emojiObj = { emoji, x, y, element: emojiEl };
      
      emojiEl.addEventListener('click', (e) => {
        e.stopPropagation();
        emojis.forEach(em => em.element && em.element.classList.remove('selected'));
        emojiEl.classList.add('selected');
        selectedEmoji = emojiObj;
      });
      
      emojiEl.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        isDraggingEmoji = true;
        const rect = emojiEl.getBoundingClientRect();
        emojiDragOffset.x = e.clientX - rect.left;
        emojiDragOffset.y = e.clientY - rect.top;
        selectedEmoji = emojiObj;
      });
      
      const handleEmojiMove = (e) => {
        if (!isDraggingEmoji || selectedEmoji !== emojiObj) return;
        
        const rect = canvas.getBoundingClientRect();
        const canvasX = (e.clientX - rect.left - emojiDragOffset.x) * (canvas.width / rect.width);
        const canvasY = (e.clientY - rect.top - emojiDragOffset.y) * (canvas.height / rect.height);
        
        emojiEl.style.left = (canvasX - 16) + 'px';
        emojiEl.style.top = (canvasY - 16) + 'px';
        emojiObj.x = canvasX;
        emojiObj.y = canvasY;
      };
      
      const handleEmojiUp = () => {
        isDraggingEmoji = false;
      };
      
      document.addEventListener('mousemove', handleEmojiMove);
      document.addEventListener('mouseup', handleEmojiUp);
      
      annotationOverlay.appendChild(emojiEl);
      emojis.push(emojiObj);
    }
    
    function updateAnnotationPositions() {
      arrows.forEach(arrow => {
        if (arrow.element && arrow.lineY) {
          const dx = arrow.endX - arrow.startX;
          const dy = arrow.endY - arrow.startY;
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          arrow.element.style.transform = `translate(${arrow.startX}px, ${arrow.startY - arrow.lineY}px) rotate(${angle}deg)`;
        }
      });
      
      emojis.forEach(em => {
        if (em.element) {
          em.element.style.left = (em.x - 16) + 'px';
          em.element.style.top = (em.y - 16) + 'px';
        }
      });
    }

    const toolBtns = panel.querySelectorAll('.vpe-fs-tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        
        toolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.toggle('active');
        currentTool = btn.classList.contains('active') ? tool : null;
        
        doodleSettings.classList.toggle('show', currentTool === 'doodle');
        arrowSettings.classList.toggle('show', currentTool === 'arrow');
        emojiPicker.classList.toggle('show', currentTool === 'emoji');
        
        canvas.style.cursor = currentTool === 'doodle' ? 'crosshair' :
                              currentTool === 'mosaic' ? 'cell' :
                              currentTool === 'arrow' ? 'crosshair' :
                              currentTool === 'emoji' ? 'pointer' : 'default';
        
        if (currentTool !== 'emoji') {
          pendingEmoji = null;
          panel.querySelectorAll('.vpe-emoji-btn').forEach(b => b.classList.remove('active'));
        }
      });
    });

    panel.querySelectorAll('.vpe-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        panel.querySelectorAll('.vpe-emoji-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        pendingEmoji = btn.dataset.emoji;
      });
    });

    panel.querySelector('[data-action="clear-doodle"]').addEventListener('click', () => {
      if (originalImageData) {
        ctx.putImageData(originalImageData, 0, 0);
        applyFilter(currentFilter);
      }
    });
    
    panel.querySelector('[data-action="clear-arrows"]').addEventListener('click', () => {
      arrows.forEach(arrow => arrow.element && arrow.element.remove());
      arrows = [];
      selectedArrow = null;
    });
    
    panel.querySelector('[data-action="clear-emojis"]').addEventListener('click', () => {
      emojis.forEach(em => em.element && em.element.remove());
      emojis = [];
      selectedEmoji = null;
    });

    const filterItems = panel.querySelectorAll('.vpe-fs-filter-item');
    filterItems.forEach(item => {
      item.addEventListener('click', () => {
        filterItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        currentFilter = item.dataset.filter;
        applyFilter(currentFilter);
      });
    });
    
    function applyFilter(filter) {
      canvas.style.filter = '';
      if (filter === 'none') return;
      
      const filters = {
        grayscale: 'grayscale(100%)',
        sepia: 'sepia(100%)',
        blur: 'blur(3px)',
        brightness: 'brightness(1.3)',
        contrast: 'contrast(1.5)',
        saturate: 'saturate(2)',
        invert: 'invert(100%)'
      };
      
      if (filters[filter]) {
        canvas.style.filter = filters[filter];
      }
    }

    panel.querySelector('#__vpe_fs_close__').addEventListener('click', () => {
      panel.remove();
      state.imageEditPanel = null;
    });

    panel.querySelector('#__vpe_fs_reset__').addEventListener('click', () => {
      opacitySlider.value = 100;
      opacityVal.textContent = '100%';
      radiusSlider.value = 0;
      radiusVal.textContent = '0px';
      blurSlider.value = 0;
      blurVal.textContent = '0px';
      canvas.style.borderRadius = '0px';
      canvas.style.filter = '';
      canvasContainer.style.opacity = '1';
      currentZoom = 1;
      updateZoom(100);
      currentFilter = 'none';
      applyFilter('none');
      filterItems.forEach(i => i.classList.remove('active'));
      filterItems[0].classList.add('active');
      if (originalImageData) ctx.putImageData(originalImageData, 0, 0);
      
      arrows.forEach(arrow => arrow.element && arrow.element.remove());
      arrows = [];
      selectedArrow = null;
      emojis.forEach(em => em.element && em.element.remove());
      emojis = [];
      selectedEmoji = null;
      
      updateHighlightBox(img, true);
    });

    function applyChanges() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      
      tempCtx.filter = canvas.style.filter || 'none';
      tempCtx.drawImage(canvas, 0, 0);
      tempCtx.filter = 'none';
      
      arrows.forEach(arrow => {
        const dx = arrow.endX - arrow.startX;
        const dy = arrow.endY - arrow.startY;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);
        const headLen = Math.min(15, arrow.size * 3);
        
        tempCtx.save();
        tempCtx.strokeStyle = arrow.color;
        tempCtx.fillStyle = arrow.color;
        tempCtx.lineWidth = arrow.size;
        tempCtx.lineCap = 'round';
        
        tempCtx.beginPath();
        tempCtx.moveTo(arrow.startX, arrow.startY);
        tempCtx.lineTo(arrow.endX, arrow.endY);
        tempCtx.stroke();
        
        tempCtx.beginPath();
        tempCtx.moveTo(arrow.endX, arrow.endY);
        tempCtx.lineTo(
          arrow.endX - headLen * Math.cos(angle - Math.PI / 6),
          arrow.endY - headLen * Math.sin(angle - Math.PI / 6)
        );
        tempCtx.lineTo(
          arrow.endX - headLen * Math.cos(angle + Math.PI / 6),
          arrow.endY - headLen * Math.sin(angle + Math.PI / 6)
        );
        tempCtx.closePath();
        tempCtx.fill();
        
        tempCtx.restore();
      });
      
      tempCtx.font = '32px Arial';
      tempCtx.textAlign = 'center';
      tempCtx.textBaseline = 'middle';
      emojis.forEach(em => {
        tempCtx.fillText(em.emoji, em.x, em.y);
      });
      
      img.src = tempCanvas.toDataURL('image/png');
      img.style.width = displayWidth + 'px';
      img.style.height = displayHeight + 'px';
      img.style.opacity = opacitySlider.value / 100;
      img.style.borderRadius = radiusSlider.value + 'px';
      const blurValNum = parseInt(blurSlider.value);
      if (blurValNum > 0) {
        img.style.filter = `blur(${blurValNum}px)`;
      }
      
      panel.remove();
      state.imageEditPanel = null;
      const infoDiv = document.getElementById('__vpe_info__');
      if (infoDiv) infoDiv.innerHTML = '✅ 图片已更新';
    }

    panel.querySelector('#__vpe_fs_apply__').addEventListener('click', applyChanges);
  }

  function getElementInfo(el) {
    const tagName = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const classList = el.className && typeof el.className === 'string' 
      ? el.className.split(' ').filter(c => c && !c.startsWith('vpe-') && c !== '__vpe_highlight_box__').slice(0, 2).map(c => `.${c}`).join('')
      : '';
    return { tagName, id, classList };
  }

  function updateHighlightBox(element, isSelected = false) {
    if (!state.highlightBox) createHighlightBox();
    
    const box = state.highlightBox;
    const label = state.infoLabel;
    const widthInd = box.querySelector('.vpe-size-indicator.width');
    const actionTip = box.querySelector('.vpe-action-tip');
    
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    box.style.top = rect.top + 'px';
    box.style.left = rect.left + 'px';
    box.style.width = rect.width + 'px';
    box.style.height = rect.height + 'px';
    box.style.display = 'block';
    
    box.classList.toggle('selected', isSelected);
    label.classList.toggle('selected', isSelected);
    
    const info = getElementInfo(element);
    let labelHTML = `<span class="vpe-tag-name ${isSelected ? 'selected' : ''}">${info.tagName}</span>`;
    if (info.id) labelHTML += `<span class="vpe-separator">·</span><span class="vpe-id-info">${info.id}</span>`;
    if (info.classList) labelHTML += `<span class="vpe-separator">·</span><span class="vpe-class-info">${info.classList}</span>`;
    labelHTML += `<span class="vpe-separator"> | </span><span class="vpe-dim-info">${Math.round(rect.width)} × ${Math.round(rect.height)}</span>`;
    label.innerHTML = labelHTML;
    
    const labelHeight = 32;
    const labelWidth = label.offsetWidth || 200;
    
    if (rect.top < labelHeight + 10) {
      label.style.top = 'auto';
      label.style.bottom = `${-labelHeight - 5}px`;
      label.style.left = '0';
    } else {
      label.style.top = `${-labelHeight - 5}px`;
      label.style.bottom = 'auto';
      label.style.left = '0';
    }
    
    if (rect.left + labelWidth > viewportWidth - 10) {
      label.style.left = 'auto';
      label.style.right = '0';
    }
    
    if (widthInd) {
      widthInd.style.display = 'none';  
    }
    
    if (rect.bottom + 30 > viewportHeight) {
      widthInd.style.bottom = 'auto';
      widthInd.style.top = '-22px';
    } else {
      widthInd.style.bottom = '-22px';
      widthInd.style.top = 'auto';
    }
    
    const actionTipWidth = 200;
    const actionTipHeight = 35;
    
    if (rect.height < 60 || rect.bottom + actionTipHeight + 10 > viewportHeight) {
      actionTip.style.display = 'none';
    } else {
      actionTip.style.display = 'flex';
      actionTip.style.bottom = `${-actionTipHeight - 8}px`;
      actionTip.style.top = 'auto';
      
      if (rect.left + actionTipWidth / 2 > viewportWidth - 10) {
        actionTip.style.left = 'auto';
        actionTip.style.right = '0';
        actionTip.style.transform = 'none';
      } else if (rect.left < actionTipWidth / 2 - 10) {
        actionTip.style.left = '0';
        actionTip.style.right = 'auto';
        actionTip.style.transform = 'none';
      } else {
        actionTip.style.left = '50%';
        actionTip.style.right = 'auto';
        actionTip.style.transform = 'translateX(-50%)';
      }
    }
    
    actionTip.style.display = 'none';
  }

  function hideHighlightBox() {
    if (state.highlightBox) state.highlightBox.style.display = 'none';
  }

  function unlockElement() {
    if (state.selectedElement) {
      state.selectedElement = null;
    }
    state.highlightedElement = null;
    hideHighlightBox();
    updateImageSection(null);
    updateTextSection(null);
    updateQuickSizeInputs(null);
    if (state.imageEditPanel) { state.imageEditPanel.remove(); state.imageEditPanel = null; }
  }

  function updateImageSection(element) {
    const imageSection = document.getElementById('__vpe_image_section__');
    if (imageSection) {
      const isImage = element && element.tagName.toLowerCase() === 'img';
      imageSection.classList.toggle('active', isImage);
      if (isImage) {
        updateQuickSizeInputs(element);
      }
    }
  }

  function setupScrollHandler() {
    let ticking = false;
    
    const scrollHandler = () => {
      if (!ticking && state.editMode) {
        ticking = true;
        requestAnimationFrame(() => {
          if (state.selectedElement) updateHighlightBox(state.selectedElement, true);
          else if (state.highlightedElement) updateHighlightBox(state.highlightedElement, false);
          ticking = false;
        });
      }
    };
    
    const resizeHandler = () => {
      if (state.editMode && state.selectedElement) updateHighlightBox(state.selectedElement, true);
    };
    
    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', resizeHandler);
    };
  }

  function setupToolbarEvents(toolbar) {
    const toggleBtn = document.getElementById('__vpe_toggle__');
    const copyBtn = document.getElementById('__vpe_copy__');
    const hideBtn = document.getElementById('__vpe_hide__');
    const showBtn = document.getElementById('__vpe_show__');
    const clearBtn = document.getElementById('__vpe_clear__');
    const bgColorInput = document.getElementById('__vpe_bgcolor__');
    const textColorInput = document.getElementById('__vpe_textcolor__');
    const fontUpBtn = document.getElementById('__vpe_fontup__');
    const fontDownBtn = document.getElementById('__vpe_fontdown__');
    const alignLeftBtn = document.getElementById('__vpe_align_left__');
    const alignCenterBtn = document.getElementById('__vpe_align_center__');
    const alignRightBtn = document.getElementById('__vpe_align_right__');
    const underlineBtn = document.getElementById('__vpe_underline__');
    const strikethroughBtn = document.getElementById('__vpe_strikethrough__');
    const imgEditBtn = document.getElementById('__vpe_img_edit__');
    const insertImgBtn = document.getElementById('__vpe_insert_img__');
    const imgFileInput = document.getElementById('__vpe_img_file__');
    const quickBtns = toolbar.querySelectorAll('.vpe-img-quick-btn');
    const infoDiv = document.getElementById('__vpe_info__');
    
    const quickWidthInput = document.getElementById('__vpe_quick_width__');
    const quickHeightInput = document.getElementById('__vpe_quick_height__');
    const lockRatioQuickBtn = document.getElementById('__vpe_lock_ratio_quick__');

    const showMessage = (msg) => { if (infoDiv) infoDiv.innerHTML = msg; };
    const showWarning = (msg) => { if (infoDiv) infoDiv.innerHTML = `⚠️ ${msg}`; };

    toggleBtn.addEventListener('click', () => {
      state.editMode = !state.editMode;
      
      if (state.editMode) {
        document.body.contentEditable = 'true';
        document.designMode = 'on';
      } else {
        document.body.contentEditable = 'false';
        document.designMode = 'off';
        unlockElement();
      }
      
      toggleBtn.innerHTML = state.editMode ? '<span>🔒</span><span>关闭编辑</span>' : '<span>✏️</span><span>开启编辑</span>';
      toggleBtn.classList.toggle('active', state.editMode);
      
      insertImgBtn.disabled = !state.editMode;
      if (state.editMode) {
        insertImgBtn.removeAttribute('title');
      } else {
        insertImgBtn.setAttribute('title', '请先开启编辑模式');
      }
      
      showMessage(state.editMode ? '✅ 编辑模式已开启' : '💡 点击开启编辑模式');
      if (!state.editMode) unlockElement();
    });

    lockRatioQuickBtn.addEventListener('click', () => {
      state.isRatioLocked = !state.isRatioLocked;
      lockRatioQuickBtn.classList.toggle('active', state.isRatioLocked);
      lockRatioQuickBtn.innerHTML = state.isRatioLocked ? '🔒' : '🔓';
      lockRatioQuickBtn.title = state.isRatioLocked ? '解锁比例' : '锁定比例';
    });

    quickWidthInput.addEventListener('input', () => {
      if (!state.selectedElement || state.selectedElement.tagName.toLowerCase() !== 'img') return;
      const w = parseInt(quickWidthInput.value);
      if (w && w >= 20) {
        state.selectedElement.style.width = w + 'px';
        if (state.isRatioLocked && state.currentRatio) {
          const h = Math.round(w / state.currentRatio);
          quickHeightInput.value = h;
          state.selectedElement.style.height = h + 'px';
        }
        updateHighlightBox(state.selectedElement, true);
      }
    });

    quickHeightInput.addEventListener('input', () => {
      if (!state.selectedElement || state.selectedElement.tagName.toLowerCase() !== 'img') return;
      const h = parseInt(quickHeightInput.value);
      if (h && h >= 20) {
        state.selectedElement.style.height = h + 'px';
        if (state.isRatioLocked && state.currentRatio) {
          const w = Math.round(h * state.currentRatio);
          quickWidthInput.value = w;
          state.selectedElement.style.width = w + 'px';
        }
        updateHighlightBox(state.selectedElement, true);
      }
    });

    copyBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        const clone = state.selectedElement.cloneNode(true);
        state.selectedElement.parentNode.insertBefore(clone, state.selectedElement.nextSibling);
        showMessage('📋 已复制');
      } else {
        showWarning('请先选择元素');
      }
    });

    hideBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        state.selectedElement.style.visibility = 'hidden';
        hideHighlightBox();
        state.selectedElement = null;
        updateImageSection(null);
        updateTextSection(null);
        showMessage('👁️‍🗨️已隐藏');
      } else {
        showWarning('请先选择元素');
      }
    });

    showBtn.addEventListener('click', () => {
      let count = 0;
      document.querySelectorAll('*[style*="visibility: hidden"]').forEach(el => {
        if (!el.closest('#__vpe_toolbar__') && !el.closest('#__vpe_highlight_box__') && !el.closest('.vpe-fullscreen-editor')) {
          el.style.visibility = 'visible';
          count++;
        }
      });
      showMessage(count > 0 ? `👁️ 已显示 ${count} 个隐藏元素` : '💡 没有隐藏元素');
    });

    clearBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        if (state.selectedElement.tagName.toLowerCase() === 'img') {
          state.selectedElement.remove();
          hideHighlightBox();
          state.selectedElement = null;
          updateImageSection(null);
          updateTextSection(null);
          showMessage('🗑️ 已删除图片');
        } else {
          state.selectedElement.removeAttribute('style');
          state.selectedElement.removeAttribute('class');
          state.selectedElement.innerHTML = '';
          hideHighlightBox();
          state.selectedElement = null;
          updateImageSection(null);
          updateTextSection(null);
          showMessage('🗑️ 已清空');
        }
      } else {
        showWarning('请先选择元素');
      }
    });

    bgColorInput.addEventListener('input', (e) => {
      if (state.selectedElement) state.selectedElement.style.backgroundColor = e.target.value;
    });

    textColorInput.addEventListener('input', (e) => {
      if (state.selectedElement) {
        applyColorToElement(state.selectedElement, e.target.value, 'color');
      }
    });

    fontUpBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        const size = parseInt(window.getComputedStyle(state.selectedElement).fontSize);
        state.selectedElement.style.fontSize = (size + 2) + 'px';
        updateHighlightBox(state.selectedElement, true);
      } else {
        showWarning('请先选择元素');
      }
    });

    fontDownBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        const size = parseInt(window.getComputedStyle(state.selectedElement).fontSize);
        state.selectedElement.style.fontSize = Math.max(8, size - 2) + 'px';
        updateHighlightBox(state.selectedElement, true);
      } else {
        showWarning('请先选择元素');
      }
    });

    underlineBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        underlineBtn.classList.toggle('active');
        state.selectedElement.style.textDecoration = underlineBtn.classList.contains('active') ? 'underline' : '';
        showMessage(underlineBtn.classList.contains('active') ? '✅ 已添加下划线' : '✅ 已移除下划线');
      } else {
        showWarning('请先选择元素');
      }
    });

    strikethroughBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        strikethroughBtn.classList.toggle('active');
        state.selectedElement.style.textDecoration = strikethroughBtn.classList.contains('active') ? 'line-through' : '';
        showMessage(strikethroughBtn.classList.contains('active') ? '✅ 已添加删除线' : '✅ 已移除删除线');
      } else {
        showWarning('请先选择元素');
      }
    });

    const updateAlignBtnsState = (activeBtn) => {
      [alignLeftBtn, alignCenterBtn, alignRightBtn].forEach(b => b.classList.remove('active'));
      activeBtn.classList.add('active');
    };

    alignLeftBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        updateAlignBtnsState(alignLeftBtn);
        state.selectedElement.style.textAlign = 'left';
        showMessage('⬅ 左对齐');
      } else {
        showWarning('请先选择元素');
      }
    });

    alignCenterBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        updateAlignBtnsState(alignCenterBtn);
        state.selectedElement.style.textAlign = 'center';
        showMessage('🔘 居中对齐');
      } else {
        showWarning('请先选择元素');
      }
    });

    alignRightBtn.addEventListener('click', () => {
      if (state.selectedElement) {
        updateAlignBtnsState(alignRightBtn);
        state.selectedElement.style.textAlign = 'right';
        showMessage('➡ 右对齐');
      } else {
        showWarning('请先选择元素');
      }
    });

    insertImgBtn.addEventListener('click', () => {
      if (!state.editMode) {
        showWarning('请先开启编辑模式');
        return;
      }
      imgFileInput.click();
    });

    imgFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        insertImage(event.target.result);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    });

    function insertImage(src) {
      const img = document.createElement('img');
      img.src = src;
      img.style.maxWidth = '100%';
      img.alt = '插入的图片';
      
      if (state.selectedElement) {
        state.selectedElement.parentNode.insertBefore(img, state.selectedElement.nextSibling);
      } else {
        document.body.appendChild(img);
      }
      
      state.selectedElement = img;
      updateHighlightBox(img, true);
      updateImageSection(img);
      updateTextSection(null);
      showMessage('✅ 图片已插入');
    }

    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.selectedElement || state.selectedElement.tagName.toLowerCase() !== 'img') {
          showWarning('请先选择图片');
          return;
        }
        
        const action = btn.dataset.action;
        const img = state.selectedElement;
        
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');
        
        switch(action) {
          case 'round':
            img.style.borderRadius = isActive ? '12px' : '';
            break;
          case 'shadow':
            img.style.boxShadow = isActive ? '0 8px 24px rgba(0,0,0,0.3)' : '';
            break;
          case 'center':
            if (isActive) {
              img.style.display = 'block';
              img.style.margin = '0 auto';
            } else {
              img.style.display = '';
              img.style.margin = '';
            }
            break;
          case 'cover':
            img.style.objectFit = isActive ? 'cover' : '';
            break;
          case 'contain':
            img.style.objectFit = isActive ? 'contain' : '';
            break;
          case 'circle':
            img.style.borderRadius = isActive ? '50%' : '';
            break;
        }
        
        showMessage(isActive ? `✅ 已应用效果` : `✅ 已移除效果`);
      });
    });

    imgEditBtn.addEventListener('click', () => {
      if (state.selectedElement && state.selectedElement.tagName.toLowerCase() === 'img') {
        showImageEditPanel(state.selectedElement);
      } else {
        showWarning('请先选择图片');
      }
    });
  }

  function setupElementSelection() {
    const clickHandler = (e) => {
      if (e.target.closest('.vpe-fullscreen-editor') || 
          e.target.closest('.vpe-arrow') || 
          e.target.closest('.vpe-emoji') ||
          e.target.hasAttribute('data-vpe-ignore')) return;
      if (!state.editMode) return;
      if (e.target.closest('#__vpe_toolbar__') || e.target.closest('#__vpe_highlight_box__')) return;

      e.preventDefault();
      e.stopPropagation();

      if (state.selectedElement && e.target !== state.selectedElement) {
        unlockElement();
        const infoDiv = document.getElementById('__vpe_info__');
        if (infoDiv) infoDiv.innerHTML = '✅ 已解除锁定';
        return;
      }

      state.selectedElement = e.target;
      state.highlightedElement = e.target;
      
      updateHighlightBox(e.target, true);
      updateImageSection(e.target);
      updateTextSection(e.target);

      const info = getElementInfo(e.target);
      const infoDiv = document.getElementById('__vpe_info__');
      if (infoDiv) infoDiv.innerHTML = `✅ 已选中：<strong style="color:#4ade80">&lt;${info.tagName}&gt;</strong>`;
    };

    const mouseOverHandler = (e) => {
      if (e.target.closest('.vpe-fullscreen-editor') || 
          e.target.closest('.vpe-arrow') || 
          e.target.closest('.vpe-emoji') ||
          e.target.hasAttribute('data-vpe-ignore')) return;
      if (!state.editMode) return;
      if (e.target.closest('#__vpe_toolbar__') || e.target.closest('#__vpe_highlight_box__')) return;
      if (state.selectedElement) return;

      state.highlightedElement = e.target;
      updateHighlightBox(e.target, false);
    };

    const mouseOutHandler = (e) => {
      if (e.target.closest('.vpe-fullscreen-editor') || e.target.hasAttribute('data-vpe-ignore')) return;
      if (!state.editMode) return;
      if (e.target.closest('#__vpe_toolbar__')) return;
      
      if (state.selectedElement) updateHighlightBox(state.selectedElement, true);
      else if (e.target === state.highlightedElement) hideHighlightBox();
    };
    
    document.addEventListener('click', clickHandler, true);
    document.addEventListener('mouseover', mouseOverHandler, true);
    document.addEventListener('mouseout', mouseOutHandler, true);
    
    return () => {
      document.removeEventListener('click', clickHandler, true);
      document.removeEventListener('mouseover', mouseOverHandler, true);
      document.removeEventListener('mouseout', mouseOutHandler, true);
    };
  }

  function makeDraggable(element) {
    let isDragging = false, startX, startY, initialLeft, initialTop, rafId = null, currentX, currentY;

    function getPosition() {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }

    function constrainToBounds(left, top) {
      return constrainToViewport(left, top, element.offsetWidth, element.offsetHeight, 10);
    }

    function updatePosition() {
      if (!isDragging) return;
      const constrained = constrainToBounds(initialLeft + (currentX - startX), initialTop + (currentY - startY));
      element.style.left = constrained.left + 'px';
      element.style.top = constrained.top + 'px';
      element.style.right = 'auto';
      element.style.bottom = 'auto';
      rafId = requestAnimationFrame(updatePosition);
    }

    function handleStart(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || 
          e.target.closest('button') || e.target.closest('input') || 
          e.target.closest('.vpe-edit-input') || e.target.closest('textarea')) return;
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      state.isDragging = true;
      const pos = getPosition();
      initialLeft = pos.left;
      initialTop = pos.top;
      if (e.type === 'touchstart') { startX = e.touches[0].clientX; startY = e.touches[0].clientY; currentX = startX; currentY = startY; }
      else { startX = e.clientX; startY = e.clientY; currentX = startX; currentY = startY; }
      element.classList.add('vpe-dragging');
      element.style.cursor = 'grabbing';
      rafId = requestAnimationFrame(updatePosition);
    }

    function handleMove(e) {
      if (!isDragging) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === 'touchmove') { currentX = e.touches[0].clientX; currentY = e.touches[0].clientY; }
      else { currentX = e.clientX; currentY = e.clientY; }
    }

    function handleEnd() {
      if (!isDragging) return;
      isDragging = false;
      state.isDragging = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      element.classList.remove('vpe-dragging');
      element.style.cursor = 'move';
      try { localStorage.setItem('__vpe_toolbar_pos__', JSON.stringify({ left: element.style.left, top: element.style.top })); } catch (err) {}
    }

    element.addEventListener('mousedown', handleStart, { passive: false });
    document.addEventListener('mousemove', handleMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { passive: false });
    element.addEventListener('touchstart', handleStart, { passive: false });
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd, { passive: false });

    try {
      const savedPos = localStorage.getItem('__vpe_toolbar_pos__');
      if (savedPos) {
        const pos = JSON.parse(savedPos);
        if (pos.left && pos.top) {
          const constrained = constrainToBounds(parseInt(pos.left), parseInt(pos.top));
          element.style.left = constrained.left + 'px';
          element.style.top = constrained.top + 'px';
          element.style.right = 'auto';
        }
      }
    } catch (err) {}

    const resizeHandler = () => {
      if (!isDragging) {
        const rect = element.getBoundingClientRect();
        const constrained = constrainToBounds(rect.left, rect.top);
        element.style.left = constrained.left + 'px';
        element.style.top = constrained.top + 'px';
      }
    };
    
    window.addEventListener('resize', resizeHandler);
    
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      element.removeEventListener('mousedown', handleStart, { passive: false });
      document.removeEventListener('mousemove', handleMove, { passive: false });
      document.removeEventListener('mouseup', handleEnd, { passive: false });
      element.removeEventListener('touchstart', handleStart, { passive: false });
      document.removeEventListener('touchmove', handleMove, { passive: false });
      document.removeEventListener('touchend', handleEnd, { passive: false });
      window.removeEventListener('resize', resizeHandler);
    };
  }

  window.__vpe_close = function() {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;
    
    document.body.contentEditable = 'false';
    document.designMode = 'off';
    
    unlockElement();
    state.editMode = false;
    const toolbar = document.getElementById('__vpe_toolbar__');
    if (toolbar) toolbar.remove();
    const box = document.getElementById('__vpe_highlight_box__');
    if (box) box.remove();
    if (state.imageEditPanel) state.imageEditPanel.remove();
    
    const root = document.documentElement;
    Object.keys(themes.dark).forEach(key => {
      root.style.removeProperty(key);
    });
    
    delete window.__visualPageEditorFullscreen;
    delete window.__vpe_close;
  };

  function init() {
    console.log('🚀 可视化网页编辑器启动');
    createToolbar();
    createHighlightBox();
    cleanupFunctions.push(setupElementSelection());
    cleanupFunctions.push(setupScrollHandler());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();