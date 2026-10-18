/**
 * 输入助手悬浮窗 - 核心注入脚本
 * 支持书签脚本、控制台注入、油猴脚本、浏览器扩展
 */
(function() {
    'use strict';

    // 防止重复注入
    if (window.__inputAssistantInjected) {
        // 如果已存在，则切换显示/隐藏
        const container = document.getElementById('__inputAssistantContainer');
        if (container) {
            container.style.display = container.style.display === 'none' ? 'block' : 'none';
        }
        return;
    }
    window.__inputAssistantInjected = true;

    // 创建容器
    const container = document.createElement('div');
    container.id = '__inputAssistantContainer';
    
    // 注入样式
    const style = document.createElement('style');
    style.textContent = `
        #__inputAssistantContainer {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            color: #333;
        }
        #__inputAssistantContainer * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        /* 悬浮按钮 */
        .__ia-floating-btn {
            position: fixed;
            right: 20px;
            bottom: 20px;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            cursor: grab;
            box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: box-shadow 0.3s ease;
            user-select: none;
            z-index: 2147483647;
        }
        .__ia-floating-btn:hover {
            box-shadow: 0 6px 30px rgba(102, 126, 234, 0.5);
        }
        .__ia-floating-btn:active {
            cursor: grabbing;
        }
        .__ia-floating-btn svg {
            width: 24px;
            height: 24px;
            fill: white;
            transition: transform 0.3s ease;
        }
        .__ia-floating-btn.__ia-active svg {
            transform: rotate(45deg);
        }
        
        /* 面板 */
        .__ia-panel {
            position: fixed;
            width: 360px;
            max-height: 500px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            opacity: 0;
            visibility: hidden;
            transform: translateY(20px) scale(0.95);
            transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        visibility 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            z-index: 2147483646;
        }
        .__ia-panel.__ia-show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0) scale(1);
        }
        
        /* 面板头部 */
        .__ia-panel-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: grab;
        }
        .__ia-panel-header:active {
            cursor: grabbing;
        }
        .__ia-panel-header h3 {
            font-size: 16px;
            font-weight: 600;
        }
        .__ia-panel-actions {
            display: flex;
            gap: 8px;
        }
        .__ia-panel-actions button {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        }
        .__ia-panel-actions button:hover {
            background: rgba(255,255,255,0.3);
        }
        
        /* Tab栏 */
        .__ia-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .__ia-tab {
            flex: 1;
            padding: 12px;
            border: none;
            background: transparent;
            cursor: pointer;
            font-size: 13px;
            color: #666;
            transition: all 0.2s;
            position: relative;
        }
        .__ia-tab:hover {
            color: #667eea;
            background: rgba(102, 126, 234, 0.05);
        }
        .__ia-tab.__ia-active {
            color: #667eea;
            font-weight: 600;
        }
        .__ia-tab.__ia-active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 20%;
            right: 20%;
            height: 2px;
            background: #667eea;
            border-radius: 2px;
        }
        
        /* Tab内容 */
        .__ia-tab-content {
            display: none;
            padding: 16px;
            max-height: 350px;
            overflow-y: auto;
        }
        .__ia-tab-content.__ia-active {
            display: block;
        }
        
        /* 统计栏 */
        .__ia-stats {
            display: flex;
            justify-content: space-around;
            padding: 12px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
        }
        .__ia-stat-item {
            text-align: center;
        }
        .__ia-stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #667eea;
        }
        .__ia-stat-label {
            font-size: 11px;
            color: #868e96;
            margin-top: 2px;
        }
        
        /* 搜索框 */
        .__ia-search {
            padding: 12px 16px;
            border-bottom: 1px solid #e9ecef;
        }
        .__ia-search input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
        }
        .__ia-search input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        /* 预设项 */
        .__ia-preset-item {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 12px;
            border: 1px solid #e9ecef;
        }
        .__ia-preset-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        .__ia-preset-key {
            font-weight: 600;
            color: #333;
            font-size: 14px;
        }
        .__ia-preset-actions {
            display: flex;
            gap: 4px;
        }
        .__ia-preset-actions button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            transition: background 0.2s;
        }
        .__ia-preset-actions button:hover {
            background: #e9ecef;
        }
        .__ia-preset-values {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }
        .__ia-preset-value {
            padding: 6px 12px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 20px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            color: #495057;
        }
        .__ia-preset-value:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        
        /* 添加表单 */
        .__ia-add-form {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .__ia-add-form input {
            width: 100%;
            padding: 10px 14px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
            margin-bottom: 10px;
        }
        .__ia-add-form input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        /* 按钮 */
        .__ia-btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: opacity 0.2s;
        }
        .__ia-btn-primary:hover {
            opacity: 0.9;
        }
        .__ia-btn-secondary {
            background: #e9ecef;
            color: #495057;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        .__ia-btn-secondary:hover {
            background: #dee2e6;
        }
        
        /* 历史记录项 */
        .__ia-history-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 8px;
            border: 1px solid #e9ecef;
        }
        .__ia-history-text {
            flex: 1;
            font-size: 13px;
            color: #333;
            word-break: break-all;
            margin-right: 10px;
        }
        .__ia-history-time {
            font-size: 11px;
            color: #868e96;
            margin-top: 4px;
        }
        .__ia-history-actions {
            display: flex;
            gap: 6px;
        }
        .__ia-history-actions button {
            background: none;
            border: none;
            cursor: pointer;
            padding: 6px;
            border-radius: 6px;
            transition: background 0.2s;
        }
        .__ia-history-actions button:hover {
            background: #e9ecef;
        }
        
        /* 重复警告 */
        .__ia-warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 12px;
            margin-bottom: 12px;
            display: none;
        }
        .__ia-warning.__ia-show {
            display: block;
        }
        
        /* 空状态 */
        .__ia-empty {
            text-align: center;
            padding: 40px 20px;
            color: #868e96;
        }
        .__ia-empty svg {
            width: 48px;
            height: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
        }
        .__ia-empty p {
            font-size: 13px;
        }
        
        /* 设置项 */
        .__ia-settings-section {
            margin-bottom: 20px;
        }
        .__ia-settings-section h4 {
            font-size: 13px;
            color: #333;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .__ia-settings-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #e9ecef;
        }
        .__ia-settings-item:last-child {
            border-bottom: none;
        }
        .__ia-settings-label {
            font-size: 13px;
            color: #495057;
        }
        .__ia-settings-desc {
            font-size: 11px;
            color: #868e96;
            margin-top: 2px;
        }
        
        /* 开关 */
        .__ia-toggle {
            position: relative;
            width: 44px;
            height: 24px;
        }
        .__ia-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .__ia-toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #dee2e6;
            border-radius: 24px;
            transition: 0.3s;
        }
        .__ia-toggle-slider::before {
            content: '';
            position: absolute;
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background: white;
            border-radius: 50%;
            transition: 0.3s;
        }
        .__ia-toggle input:checked + .__ia-toggle-slider {
            background: #667eea;
        }
        .__ia-toggle input:checked + .__ia-toggle-slider::before {
            transform: translateX(20px);
        }
        
        /* 导入导出按钮 */
        .__ia-import-export {
            display: flex;
            gap: 10px;
        }
        .__ia-import-export button {
            flex: 1;
            padding: 12px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
        }
        .__ia-import-export button:hover {
            background: #f8f9fa;
            border-color: #667eea;
            color: #667eea;
        }
        
        /* Toast提示 */
        .__ia-toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(-100px);
            background: #333;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 13px;
            z-index: 2147483647;
            opacity: 0;
            transition: all 0.3s ease;
        }
        .__ia-toast.__ia-show {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        .__ia-toast.__ia-success {
            background: #28a745;
        }
        .__ia-toast.__ia-error {
            background: #dc3545;
        }

        /* 画笔功能 */
        .__ia-draw-canvas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 2147483645;
            pointer-events: none;
            display: none;
            cursor: crosshair;
        }
        .__ia-draw-canvas.__ia-draw-active {
            pointer-events: auto;
            display: block;
        }
        .__ia-draw-toolbar {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
            margin-bottom: 10px;
        }
        .__ia-draw-tool-group {
            display: flex;
            gap: 3px;
            padding: 3px;
            background: #f1f3f5;
            border-radius: 6px;
        }
        .__ia-draw-tool-btn {
            width: 32px;
            height: 32px;
            border: 2px solid transparent;
            border-radius: 5px;
            background: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: all 0.15s;
        }
        .__ia-draw-tool-btn:hover {
            background: #e9ecef;
        }
        .__ia-draw-tool-btn.__ia-draw-active {
            border-color: #667eea;
            background: #eef0ff;
        }
        .__ia-draw-color-group {
            display: flex;
            gap: 4px;
            align-items: center;
            padding: 3px 6px;
            background: #f1f3f5;
            border-radius: 6px;
        }
        .__ia-draw-color-btn {
            width: 22px;
            height: 22px;
            border-radius: 50%;
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.15s;
        }
        .__ia-draw-color-btn:hover {
            transform: scale(1.15);
        }
        .__ia-draw-color-btn.__ia-draw-active {
            border-color: #333;
            box-shadow: 0 0 0 2px white, 0 0 0 3px #333;
        }
        .__ia-draw-width-group {
            display: flex;
            gap: 3px;
            align-items: center;
            padding: 3px 6px;
            background: #f1f3f5;
            border-radius: 6px;
        }
        .__ia-draw-width-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: 2px solid transparent;
            border-radius: 5px;
            background: white;
            cursor: pointer;
            transition: all 0.15s;
        }
        .__ia-draw-width-btn:hover {
            background: #e9ecef;
        }
        .__ia-draw-width-btn.__ia-draw-active {
            border-color: #667eea;
            background: #eef0ff;
        }
        .__ia-draw-width-line {
            border-radius: 2px;
            background: #333;
        }
        .__ia-draw-action-group {
            display: flex;
            gap: 3px;
            padding: 3px;
            background: #f1f3f5;
            border-radius: 6px;
        }
        .__ia-draw-action-btn {
            height: 32px;
            padding: 0 10px;
            border: none;
            border-radius: 5px;
            background: white;
            cursor: pointer;
            font-size: 12px;
            color: #495057;
            transition: all 0.15s;
            white-space: nowrap;
        }
        .__ia-draw-action-btn:hover {
            background: #e9ecef;
        }
        .__ia-draw-action-btn.__ia-draw-close-btn {
            background: #dc3545;
            color: white;
        }
        .__ia-draw-action-btn.__ia-draw-close-btn:hover {
            background: #c82333;
        }
        .__ia-draw-hint {
            font-size: 11px;
            color: #868e96;
            text-align: center;
            margin-top: 6px;
        }

        /* 加解密功能 */
        .__ia-crypto-container {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .__ia-crypto-select-row {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .__ia-crypto-select {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
            background: white;
            cursor: pointer;
        }
        .__ia-crypto-select:focus {
            outline: none;
            border-color: #667eea;
        }
        .__ia-crypto-key-input {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
            display: none;
        }
        .__ia-crypto-key-input.__ia-show {
            display: block;
        }
        .__ia-crypto-textarea {
            width: 100%;
            min-height: 80px;
            padding: 10px 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
            font-family: inherit;
            resize: vertical;
        }
        .__ia-crypto-textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        .__ia-crypto-output {
            width: 100%;
            min-height: 80px;
            padding: 10px 12px;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            font-size: 13px;
            font-family: inherit;
            background: #f8f9fa;
            resize: vertical;
        }
        .__ia-crypto-btn-row {
            display: flex;
            gap: 8px;
        }
        .__ia-crypto-btn {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .__ia-crypto-btn:hover {
            opacity: 0.9;
        }
        .__ia-crypto-btn-encrypt {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .__ia-crypto-btn-decrypt {
            background: #e9ecef;
            color: #495057;
        }
        .__ia-crypto-file-row {
            display: flex;
            gap: 8px;
        }
        .__ia-crypto-file-btn {
            flex: 1;
            padding: 8px 12px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        .__ia-crypto-file-btn:hover {
            background: #f8f9fa;
            border-color: #667eea;
            color: #667eea;
        }
        .__ia-crypto-output-row {
            position: relative;
        }
        .__ia-crypto-copy-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 4px 10px;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .__ia-crypto-copy-btn:hover {
            background: #667eea;
            color: white;
            border-color: #667eea;
        }
        .__ia-crypto-swap-btn {
            padding: 6px 12px;
            border: 1px solid #dee2e6;
            background: white;
            border-radius: 8px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        .__ia-crypto-swap-btn:hover {
            background: #f8f9fa;
            border-color: #667eea;
            color: #667eea;
        }
        .__ia-crypto-file-input {
            display: none;
        }
    `;
    container.appendChild(style);

    // 状态管理
    const Storage = {
        prefix: '__ia_',
        get(key, defaultValue = null) {
            try {
                const data = localStorage.getItem(this.prefix + key);
                return data ? JSON.parse(data) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(this.prefix + key, JSON.stringify(value));
            } catch (e) {
                console.error('Storage error:', e);
            }
        }
    };

    const State = {
        presets: Storage.get('presets', []),
        history: Storage.get('history', []),
        settings: Storage.get('settings', {
            autoRecord: true,
            duplicateCheck: true,
            historyLimit: 100
        }),
        isPanelOpen: false,
        activeTab: 'presets',
        lastFocusedInput: null,
        panelPositioned: false
    };

    // 创建UI
    const floatingBtn = document.createElement('button');
    floatingBtn.className = '__ia-floating-btn';
    floatingBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12zM7 9h10v2H7zm0-3h10v2H7z"/></svg>`;
    floatingBtn.title = '输入助手 (拖拽移动，点击展开)';
    container.appendChild(floatingBtn);

    const panel = document.createElement('div');
    panel.className = '__ia-panel';
    panel.innerHTML = `
        <div class="__ia-panel-header">
            <h3>📝 输入助手</h3>
            <div class="__ia-panel-actions">
                <button class="__ia-close-btn" title="关闭">×</button>
            </div>
        </div>
        <div class="__ia-tabs">
            <button class="__ia-tab __ia-active" data-tab="presets">预设内容</button>
            <button class="__ia-tab" data-tab="history">历史记录</button>
            <button class="__ia-tab" data-tab="draw">画笔</button>
            <button class="__ia-tab" data-tab="crypto">加解密</button>
            <button class="__ia-tab" data-tab="settings">设置</button>
        </div>
        <div class="__ia-tab-content __ia-active" data-content="presets">
            <div class="__ia-stats">
                <div class="__ia-stat-item">
                    <div class="__ia-stat-value" id="__ia_presetCount">0</div>
                    <div class="__ia-stat-label">预设项</div>
                </div>
                <div class="__ia-stat-item">
                    <div class="__ia-stat-value" id="__ia_valueCount">0</div>
                    <div class="__ia-stat-label">选项值</div>
                </div>
            </div>
            <div class="__ia-search">
                <input type="text" id="__ia_presetSearch" placeholder="搜索预设...">
            </div>
            <div class="__ia-warning" id="__ia_duplicateWarning">⚠️ 该内容已输入过</div>
            <div class="__ia-add-form" id="__ia_addForm" style="display:none;">
                <input type="text" id="__ia_newKey" placeholder="输入Key名称">
                <input type="text" id="__ia_newValues" placeholder="输入Values，用逗号分隔">
                <div style="display:flex;gap:8px;">
                    <button class="__ia-btn-primary" id="__ia_addBtn">添加</button>
                    <button class="__ia-btn-secondary" id="__ia_cancelAddBtn">取消</button>
                </div>
            </div>
            <button class="__ia-btn-primary" style="width:100%;margin-bottom:16px;" id="__ia_showAddBtn">+ 添加预设</button>
            <div id="__ia_presetsList"></div>
        </div>
        <div class="__ia-tab-content" data-content="history">
            <div class="__ia-stats">
                <div class="__ia-stat-item">
                    <div class="__ia-stat-value" id="__ia_historyCount">0</div>
                    <div class="__ia-stat-label">记录数</div>
                </div>
                <div class="__ia-stat-item">
                    <div class="__ia-stat-value" id="__ia_uniqueCount">0</div>
                    <div class="__ia-stat-label">唯一值</div>
                </div>
            </div>
            <div class="__ia-search">
                <input type="text" id="__ia_historySearch" placeholder="搜索历史记录...">
            </div>
            <div id="__ia_historyList"></div>
        </div>
        <div class="__ia-tab-content" data-content="draw">
            <div class="__ia-draw-toolbar" id="__ia_drawToolbar">
                <div class="__ia-draw-tool-group">
                    <button class="__ia-draw-tool-btn __ia-draw-active" data-tool="pen" title="画笔">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
                    </button>
                    <button class="__ia-draw-tool-btn" data-tool="line" title="直线">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/></svg>
                    </button>
                    <button class="__ia-draw-tool-btn" data-tool="rect" title="矩形">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </button>
                    <button class="__ia-draw-tool-btn" data-tool="circle" title="圆形">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>
                    </button>
                    <button class="__ia-draw-tool-btn" data-tool="arrow" title="箭头">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="12 5 19 5 19 12"/></svg>
                    </button>
                </div>
                <div class="__ia-draw-color-group" id="__ia_drawColorGroup">
                    <button class="__ia-draw-color-btn __ia-draw-active" data-color="#e03131" style="background:#e03131;" title="红色"></button>
                    <button class="__ia-draw-color-btn" data-color="#1971c2" style="background:#1971c2;" title="蓝色"></button>
                    <button class="__ia-draw-color-btn" data-color="#2f9e44" style="background:#2f9e44;" title="绿色"></button>
                    <button class="__ia-draw-color-btn" data-color="#333333" style="background:#333333;" title="黑色"></button>
                    <button class="__ia-draw-color-btn" data-color="#f08c00" style="background:#f08c00;" title="黄色"></button>
                    <button class="__ia-draw-color-btn" data-color="#ffffff" style="background:#ffffff;border:1px solid #ccc;" title="白色"></button>
                </div>
                <div class="__ia-draw-width-group" id="__ia_drawWidthGroup">
                    <button class="__ia-draw-width-btn" data-width="2" title="2px"><div class="__ia-draw-width-line" style="width:14px;height:2px;"></div></button>
                    <button class="__ia-draw-width-btn __ia-draw-active" data-width="4" title="4px"><div class="__ia-draw-width-line" style="width:14px;height:4px;"></div></button>
                    <button class="__ia-draw-width-btn" data-width="6" title="6px"><div class="__ia-draw-width-line" style="width:14px;height:6px;"></div></button>
                    <button class="__ia-draw-width-btn" data-width="8" title="8px"><div class="__ia-draw-width-line" style="width:14px;height:8px;"></div></button>
                </div>
                <div class="__ia-draw-action-group">
                    <button class="__ia-draw-action-btn" id="__ia_drawUndoBtn" title="撤销">撤销</button>
                    <button class="__ia-draw-action-btn" id="__ia_drawClearBtn" title="清除全部">清除</button>
                    <button class="__ia-draw-action-btn __ia-draw-close-btn" id="__ia_drawCloseBtn" title="关闭画布">关闭</button>
                </div>
            </div>
            <div class="__ia-draw-hint">选择工具后在页面上拖拽绘制，点击「关闭」退出画笔模式</div>
        </div>
        <div class="__ia-tab-content" data-content="crypto">
            <div class="__ia-crypto-container">
                <div class="__ia-crypto-select-row">
                    <select id="__ia_cryptoAlgorithm" class="__ia-crypto-select">
                        <option value="base64">Base64</option>
                        <option value="rot13">ROT13</option>
                        <option value="xor">XOR</option>
                        <option value="url">URL编码</option>
                        <option value="hex">Hex</option>
                    </select>
                    <input type="text" id="__ia_cryptoKey" class="__ia-crypto-key-input" placeholder="输入密钥...">
                    <button id="__ia_cryptoSwapBtn" class="__ia-crypto-swap-btn" title="交换输入输出">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4M7 4L3 8M7 4l4 4M17 8v12m0-12l4 4m-4-4l-4 4"/></svg>
                        交换
                    </button>
                </div>
                <textarea id="__ia_cryptoInput" class="__ia-crypto-textarea" placeholder="输入要加密/解密的文本..."></textarea>
                <div class="__ia-crypto-file-row">
                    <button id="__ia_cryptoImportBtn" class="__ia-crypto-file-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                        导入文件
                    </button>
                    <button id="__ia_cryptoExportBtn" class="__ia-crypto-file-btn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                        导出结果
                    </button>
                    <input type="file" id="__ia_cryptoFileInput" class="__ia-crypto-file-input" accept=".txt">
                </div>
                <div class="__ia-crypto-btn-row">
                    <button id="__ia_cryptoEncryptBtn" class="__ia-crypto-btn __ia-crypto-btn-encrypt">加密</button>
                    <button id="__ia_cryptoDecryptBtn" class="__ia-crypto-btn __ia-crypto-btn-decrypt">解密</button>
                </div>
                <div class="__ia-crypto-output-row">
                    <textarea id="__ia_cryptoOutput" class="__ia-crypto-output" placeholder="结果将显示在这里..." readonly></textarea>
                    <button id="__ia_cryptoCopyBtn" class="__ia-crypto-copy-btn">复制结果</button>
                </div>
            </div>
        </div>
        <div class="__ia-tab-content" data-content="settings">
            <div class="__ia-settings-section">
                <h4>功能设置</h4>
                <div class="__ia-settings-item">
                    <div>
                        <div class="__ia-settings-label">自动记录输入</div>
                        <div class="__ia-settings-desc">输入框失去焦点时自动记录</div>
                    </div>
                    <label class="__ia-toggle">
                        <input type="checkbox" id="__ia_autoRecord" checked>
                        <span class="__ia-toggle-slider"></span>
                    </label>
                </div>
                <div class="__ia-settings-item">
                    <div>
                        <div class="__ia-settings-label">重复内容提醒</div>
                        <div class="__ia-settings-desc">输入已存在内容时显示警告</div>
                    </div>
                    <label class="__ia-toggle">
                        <input type="checkbox" id="__ia_duplicateCheck" checked>
                        <span class="__ia-toggle-slider"></span>
                    </label>
                </div>
                <div class="__ia-settings-item">
                    <div>
                        <div class="__ia-settings-label">历史记录上限</div>
                        <div class="__ia-settings-desc">最多保留多少条记录</div>
                    </div>
                    <select id="__ia_historyLimit" style="padding:6px 12px;border:1px solid #dee2e6;border-radius:6px;font-size:13px;">
                        <option value="50">50条</option>
                        <option value="100" selected>100条</option>
                        <option value="200">200条</option>
                        <option value="500">500条</option>
                    </select>
                </div>
            </div>
            <div class="__ia-settings-section">
                <h4>数据管理</h4>
                <div class="__ia-import-export">
                    <button id="__ia_exportBtn">📤 导出配置</button>
                    <button id="__ia_importBtn">📥 导入配置</button>
                </div>
                <input type="file" id="__ia_importFile" accept=".json" style="display:none;">
            </div>
            <div class="__ia-settings-section">
                <h4>退出</h4>
                <button class="__ia-btn-secondary" id="__ia_unloadBtn" style="width:100%;color:#dc3545;">移除悬浮窗</button>
            </div>
        </div>
    `;
    container.appendChild(panel);

    const toast = document.createElement('div');
    toast.className = '__ia-toast';
    container.appendChild(toast);

    document.body.appendChild(container);

    // 工具函数
    function showToast(message, type = 'success') {
        toast.textContent = message;
        toast.className = `__ia-toast __ia-${type} __ia-show`;
        setTimeout(() => toast.classList.remove('__ia-show'), 2000);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function updateStats() {
        document.getElementById('__ia_presetCount').textContent = State.presets.length;
        document.getElementById('__ia_valueCount').textContent = State.presets.reduce((sum, p) => sum + p.values.length, 0);
        document.getElementById('__ia_historyCount').textContent = State.history.length;
        document.getElementById('__ia_uniqueCount').textContent = new Set(State.history.map(h => h.value)).size;
    }

    // 面板控制
    function togglePanel() {
        State.isPanelOpen = !State.isPanelOpen;
        panel.classList.toggle('__ia-show', State.isPanelOpen);
        floatingBtn.classList.toggle('__ia-active', State.isPanelOpen);
        if (State.isPanelOpen && !State.panelPositioned) {
            positionPanelNearButton();
            State.panelPositioned = true;
        }
    }

    function positionPanelNearButton() {
        const btnRect = floatingBtn.getBoundingClientRect();
        const panelW = 360, panelH = 500, gap = 12;
        let left = btnRect.left - panelW - gap;
        let top = btnRect.top + btnRect.height - panelH;
        if (left < 10) left = btnRect.right + gap;
        if (left + panelW > window.innerWidth - 10) left = Math.max(10, (window.innerWidth - panelW) / 2);
        if (top < 10) top = btnRect.bottom + gap;
        if (top + panelH > window.innerHeight - 10) top = Math.max(10, (window.innerHeight - panelH) / 2);
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
    }

    function switchTab(tabName) {
        State.activeTab = tabName;
        panel.querySelectorAll('.__ia-tab').forEach(t => t.classList.toggle('__ia-active', t.dataset.tab === tabName));
        panel.querySelectorAll('.__ia-tab-content').forEach(c => c.classList.toggle('__ia-active', c.dataset.content === tabName));
        // 画笔Tab激活/停用Canvas
        if (tabName === 'draw') {
            Draw.activate();
        } else {
            Draw.deactivate();
        }
    }

    // 预设管理
    function renderPresets() {
        const search = document.getElementById('__ia_presetSearch').value.toLowerCase();
        const filtered = State.presets.filter(p => 
            p.key.toLowerCase().includes(search) || p.values.some(v => v.toLowerCase().includes(search))
        );
        const list = document.getElementById('__ia_presetsList');
        if (filtered.length === 0) {
            list.innerHTML = `<div class="__ia-empty"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg><p>${search ? '未找到匹配的预设' : '暂无预设内容<br>点击上方按钮添加'}</p></div>`;
            return;
        }
        list.innerHTML = filtered.map(p => `
            <div class="__ia-preset-item" data-id="${p.id}">
                <div class="__ia-preset-header">
                    <span class="__ia-preset-key">${escapeHtml(p.key)}</span>
                    <div class="__ia-preset-actions">
                        <button class="__ia-edit-preset" title="编辑"><svg width="14" height="14" viewBox="0 0 24 24" fill="#666"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg></button>
                        <button class="__ia-delete-preset" title="删除"><svg width="14" height="14" viewBox="0 0 24 24" fill="#dc3545"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>
                    </div>
                </div>
                <div class="__ia-preset-values">
                    ${p.values.map(v => `<button class="__ia-preset-value">${escapeHtml(v)}</button>`).join('')}
                </div>
            </div>
        `).join('');
    }

    function addPreset() {
        const key = document.getElementById('__ia_newKey').value.trim();
        const valuesText = document.getElementById('__ia_newValues').value.trim();
        if (!key || !valuesText) {
            showToast('请填写完整信息', 'error');
            return;
        }
        const values = valuesText.split(/[,，]/).map(v => v.trim()).filter(v => v);
        if (values.length === 0) {
            showToast('请至少输入一个值', 'error');
            return;
        }
        const existing = State.presets.findIndex(p => p.key === key);
        if (existing >= 0) {
            const set = new Set(State.presets[existing].values);
            values.forEach(v => set.add(v));
            State.presets[existing].values = Array.from(set);
            showToast('已合并到现有预设');
        } else {
            State.presets.push({ id: Date.now(), key, values, createdAt: new Date().toISOString() });
            showToast('添加成功');
        }
        Storage.set('presets', State.presets);
        document.getElementById('__ia_newKey').value = '';
        document.getElementById('__ia_newValues').value = '';
        toggleAddForm();
        renderPresets();
        updateStats();
    }

    function toggleAddForm() {
        const form = document.getElementById('__ia_addForm');
        const btn = document.getElementById('__ia_showAddBtn');
        const isHidden = form.style.display === 'none';
        form.style.display = isHidden ? 'block' : 'none';
        btn.style.display = isHidden ? 'none' : 'block';
        if (isHidden) document.getElementById('__ia_newKey').focus();
    }

    // 历史记录
    function renderHistory() {
        const search = document.getElementById('__ia_historySearch').value.toLowerCase();
        const filtered = State.history.filter(h => h.value.toLowerCase().includes(search));
        const list = document.getElementById('__ia_historyList');
        if (filtered.length === 0) {
            list.innerHTML = `<div class="__ia-empty"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg><p>${search ? '未找到匹配的记录' : '暂无历史记录'}</p></div>`;
            return;
        }
        list.innerHTML = filtered.map(h => {
            const d = new Date(h.timestamp);
            const time = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
            return `
                <div class="__ia-history-item" data-id="${h.id}">
                    <div style="flex:1;">
                        <div class="__ia-history-text">${escapeHtml(h.value)}</div>
                        <div class="__ia-history-time">${time}</div>
                    </div>
                    <div class="__ia-history-actions">
                        <button class="__ia-use-history" title="使用"><svg width="16" height="16" viewBox="0 0 24 24" fill="#667eea"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></button>
                        <button class="__ia-delete-history" title="删除"><svg width="16" height="16" viewBox="0 0 24 24" fill="#dc3545"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z"/></svg></button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function addToHistory(value) {
        if (!value.trim()) return;
        State.history = State.history.filter(h => h.value !== value);
        State.history.unshift({ id: Date.now(), value: value.trim(), timestamp: new Date().toISOString() });
        const limit = parseInt(State.settings.historyLimit);
        if (State.history.length > limit) State.history = State.history.slice(0, limit);
        Storage.set('history', State.history);
        renderHistory();
        updateStats();
    }

    function isDuplicate(value) {
        return State.history.some(h => h.value === value.trim());
    }

    // 输入功能
    function isInputElement(el) {
        return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true');
    }

    function insertValue(value) {
        const target = State.lastFocusedInput || document.activeElement;
        if (!target || !isInputElement(target)) {
            const first = document.querySelector('input[type="text"], textarea');
            if (first) return insertToInput(first, value);
            return copyToClipboard(value);
        }
        insertToInput(target, value);
    }

    function insertToInput(input, value) {
        if (State.settings.duplicateCheck && isDuplicate(value)) {
            const warning = document.getElementById('__ia_duplicateWarning');
            warning.classList.add('__ia-show');
            setTimeout(() => warning.classList.remove('__ia-show'), 3000);
        }
        if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA') {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            input.value = input.value.substring(0, start) + value + input.value.substring(end);
            input.selectionStart = input.selectionEnd = start + value.length;
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        addToHistory(value);
        showToast('已输入');
    }

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
            addToHistory(text);
        }).catch(() => showToast('复制失败', 'error'));
    }

    // 拖拽
    function setupDraggable({ trigger, target, useLeftTop }) {
        let isDragging = false, startX, startY, startPos;
        trigger.addEventListener('mousedown', (e) => {
            if (e.target.closest('.__ia-panel-actions')) return;
            e.preventDefault();
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = target.getBoundingClientRect();
            startPos = useLeftTop ? { left: rect.left, top: rect.top } : { right: window.innerWidth - rect.right, bottom: window.innerHeight - rect.bottom };
        });
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const dx = e.clientX - startX, dy = e.clientY - startY;
            if (useLeftTop) {
                target.style.left = (startPos.left + dx) + 'px';
                target.style.top = (startPos.top + dy) + 'px';
                target.style.right = 'auto';
                target.style.bottom = 'auto';
            } else {
                target.style.right = (startPos.right - dx) + 'px';
                target.style.bottom = (startPos.bottom - dy) + 'px';
                target.style.left = 'auto';
                target.style.top = 'auto';
            }
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
    }

    // 导入导出
    function exportConfig() {
        const config = { version: '1.0', exportTime: new Date().toISOString(), presets: State.presets, history: State.history, settings: State.settings };
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `input-assistant-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        showToast('配置已导出');
    }

    function importConfig(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                if (config.presets) { State.presets = config.presets; Storage.set('presets', State.presets); }
                if (config.history) { State.history = config.history; Storage.set('history', State.history); }
                if (config.settings) { State.settings = config.settings; Storage.set('settings', State.settings); loadSettings(); }
                renderPresets(); renderHistory(); updateStats();
                showToast('配置导入成功');
            } catch (err) { showToast('配置文件格式错误', 'error'); }
        };
        reader.readAsText(file);
    }

    function loadSettings() {
        document.getElementById('__ia_autoRecord').checked = State.settings.autoRecord;
        document.getElementById('__ia_duplicateCheck').checked = State.settings.duplicateCheck;
        document.getElementById('__ia_historyLimit').value = State.settings.historyLimit;
    }

    // 卸载
    function unload() {
        container.remove();
        window.__inputAssistantInjected = false;
        showToast('悬浮窗已移除');
    }

    // ========== 加解密功能 ==========
    const Crypto = {
        algorithms: {
            base64: {
                encrypt(text) {
                    try {
                        return btoa(unescape(encodeURIComponent(text)));
                    } catch (e) {
                        throw new Error('Base64编码失败');
                    }
                },
                decrypt(text) {
                    try {
                        return decodeURIComponent(escape(atob(text)));
                    } catch (e) {
                        throw new Error('Base64解码失败');
                    }
                }
            },
            rot13: {
                encrypt(text) {
                    return text.replace(/[a-zA-Z]/g, function(char) {
                        const base = char <= 'Z' ? 65 : 97;
                        return String.fromCharCode((char.charCodeAt(0) - base + 13) % 26 + base);
                    });
                },
                decrypt(text) {
                    return this.encrypt(text);
                }
            },
            xor: {
                encrypt(text, key) {
                    if (!key) throw new Error('XOR算法需要密钥');
                    let result = '';
                    for (let i = 0; i < text.length; i++) {
                        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                    }
                    return btoa(unescape(encodeURIComponent(result)));
                },
                decrypt(text, key) {
                    if (!key) throw new Error('XOR算法需要密钥');
                    const decoded = decodeURIComponent(escape(atob(text)));
                    let result = '';
                    for (let i = 0; i < decoded.length; i++) {
                        result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
                    }
                    return result;
                }
            },
            url: {
                encrypt(text) {
                    try {
                        return encodeURIComponent(text);
                    } catch (e) {
                        throw new Error('URL编码失败');
                    }
                },
                decrypt(text) {
                    try {
                        return decodeURIComponent(text);
                    } catch (e) {
                        throw new Error('URL解码失败');
                    }
                }
            },
            hex: {
                encrypt(text) {
                    let result = '';
                    for (let i = 0; i < text.length; i++) {
                        result += text.charCodeAt(i).toString(16).padStart(2, '0');
                    }
                    return result;
                },
                decrypt(text) {
                    if (text.length % 2 !== 0) throw new Error('Hex字符串长度必须为偶数');
                    let result = '';
                    for (let i = 0; i < text.length; i += 2) {
                        const byte = parseInt(text.substr(i, 2), 16);
                        if (isNaN(byte)) throw new Error('无效的Hex字符串');
                        result += String.fromCharCode(byte);
                    }
                    return result;
                }
            }
        },

        init() {
            const algorithmSelect = document.getElementById('__ia_cryptoAlgorithm');
            const keyInput = document.getElementById('__ia_cryptoKey');
            const inputArea = document.getElementById('__ia_cryptoInput');
            const outputArea = document.getElementById('__ia_cryptoOutput');
            const encryptBtn = document.getElementById('__ia_cryptoEncryptBtn');
            const decryptBtn = document.getElementById('__ia_cryptoDecryptBtn');
            const copyBtn = document.getElementById('__ia_cryptoCopyBtn');
            const swapBtn = document.getElementById('__ia_cryptoSwapBtn');
            const importBtn = document.getElementById('__ia_cryptoImportBtn');
            const exportBtn = document.getElementById('__ia_cryptoExportBtn');
            const fileInput = document.getElementById('__ia_cryptoFileInput');

            // 算法切换时显示/隐藏密钥输入框
            algorithmSelect.addEventListener('change', () => {
                const showKey = algorithmSelect.value === 'xor';
                keyInput.classList.toggle('__ia-show', showKey);
            });

            // 加密按钮
            encryptBtn.addEventListener('click', () => {
                try {
                    const text = inputArea.value;
                    if (!text) {
                        showToast('请输入要加密的文本', 'error');
                        return;
                    }
                    const algorithm = algorithmSelect.value;
                    const key = keyInput.value;
                    const result = this.algorithms[algorithm].encrypt(text, key);
                    outputArea.value = result;
                    showToast('加密成功');
                } catch (e) {
                    showToast(e.message || '加密失败', 'error');
                }
            });

            // 解密按钮
            decryptBtn.addEventListener('click', () => {
                try {
                    const text = inputArea.value;
                    if (!text) {
                        showToast('请输入要解密的文本', 'error');
                        return;
                    }
                    const algorithm = algorithmSelect.value;
                    const key = keyInput.value;
                    const result = this.algorithms[algorithm].decrypt(text, key);
                    outputArea.value = result;
                    showToast('解密成功');
                } catch (e) {
                    showToast(e.message || '解密失败', 'error');
                }
            });

            // 复制结果按钮
            copyBtn.addEventListener('click', () => {
                const result = outputArea.value;
                if (!result) {
                    showToast('没有可复制的内容', 'error');
                    return;
                }
                navigator.clipboard.writeText(result).then(() => {
                    showToast('已复制到剪贴板');
                }).catch(() => {
                    showToast('复制失败', 'error');
                });
            });

            // 交换按钮
            swapBtn.addEventListener('click', () => {
                const input = inputArea.value;
                const output = outputArea.value;
                inputArea.value = output;
                outputArea.value = input;
                showToast('已交换输入输出');
            });

            // 导入文件按钮
            importBtn.addEventListener('click', () => {
                fileInput.click();
            });

            // 文件选择处理
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    inputArea.value = event.target.result;
                    showToast('文件导入成功');
                };
                reader.onerror = () => {
                    showToast('文件读取失败', 'error');
                };
                reader.readAsText(file);
                e.target.value = '';
            });

            // 导出结果按钮
            exportBtn.addEventListener('click', () => {
                const result = outputArea.value;
                if (!result) {
                    showToast('没有可导出的内容', 'error');
                    return;
                }
                const blob = new Blob([result], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `crypto-result-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('文件已导出');
            });
        }
    };

    // ========== 画笔功能 ==========
    const Draw = {
        canvas: null,
        ctx: null,
        isActive: false,
        currentTool: 'pen',
        currentColor: '#e03131',
        currentWidth: 4,
        isDrawing: false,
        startX: 0,
        startY: 0,
        snapshotBeforeDraw: null, // 用于形状工具的预览恢复
        history: [],             // 保存每步的 dataURL 快照

        init() {
            // 创建全屏Canvas覆盖层
            this.canvas = document.createElement('canvas');
            this.canvas.id = '__ia_drawCanvas';
            this.canvas.className = '__ia-draw-canvas';
            document.body.appendChild(this.canvas);

            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());

            // 绑定Canvas绘图事件
            this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
            this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
            this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
            this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

            // 工具选择
            document.getElementById('__ia_drawToolbar').addEventListener('click', (e) => {
                const toolBtn = e.target.closest('.__ia-draw-tool-btn');
                if (toolBtn) {
                    this.setTool(toolBtn.dataset.tool);
                    return;
                }
                const colorBtn = e.target.closest('.__ia-draw-color-btn');
                if (colorBtn) {
                    this.setColor(colorBtn.dataset.color);
                    return;
                }
                const widthBtn = e.target.closest('.__ia-draw-width-btn');
                if (widthBtn) {
                    this.setWidth(parseInt(widthBtn.dataset.width));
                    return;
                }
            });

            // 操作按钮
            document.getElementById('__ia_drawUndoBtn').addEventListener('click', () => this.undo());
            document.getElementById('__ia_drawClearBtn').addEventListener('click', () => this.clearAll());
            document.getElementById('__ia_drawCloseBtn').addEventListener('click', () => this.close());
        },

        resizeCanvas() {
            // 保存当前内容
            let imageData = null;
            if (this.canvas.width > 0 && this.canvas.height > 0) {
                try { imageData = this.canvas.toDataURL(); } catch(e) {}
            }
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            // 恢复内容
            if (imageData) {
                const img = new Image();
                img.onload = () => { this.ctx.drawImage(img, 0, 0); };
                img.src = imageData;
            }
        },

        activate() {
            this.isActive = true;
            this.canvas.classList.add('__ia-draw-active');
        },

        deactivate() {
            this.isActive = false;
            this.isDrawing = false;
            this.canvas.classList.remove('__ia-draw-active');
        },

        close() {
            this.deactivate();
            // 切换回预设Tab
            switchTab('presets');
        },

        setTool(tool) {
            this.currentTool = tool;
            document.querySelectorAll('.__ia-draw-tool-btn').forEach(b => {
                b.classList.toggle('__ia-draw-active', b.dataset.tool === tool);
            });
        },

        setColor(color) {
            this.currentColor = color;
            document.querySelectorAll('.__ia-draw-color-btn').forEach(b => {
                b.classList.toggle('__ia-draw-active', b.dataset.color === color);
            });
        },

        setWidth(width) {
            this.currentWidth = width;
            document.querySelectorAll('.__ia-draw-width-btn').forEach(b => {
                b.classList.toggle('__ia-draw-active', parseInt(b.dataset.width) === width);
            });
        },

        getPos(e) {
            const rect = this.canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        },

        onMouseDown(e) {
            if (!this.isActive) return;
            this.isDrawing = true;
            const pos = this.getPos(e);
            this.startX = pos.x;
            this.startY = pos.y;

            // 保存当前状态用于形状预览恢复
            if (this.canvas.width > 0 && this.canvas.height > 0) {
                this.snapshotBeforeDraw = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
            }

            if (this.currentTool === 'pen') {
                this.ctx.beginPath();
                this.ctx.moveTo(pos.x, pos.y);
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineWidth = this.currentWidth;
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            }
        },

        onMouseMove(e) {
            if (!this.isActive || !this.isDrawing) return;
            const pos = this.getPos(e);

            if (this.currentTool === 'pen') {
                this.ctx.lineTo(pos.x, pos.y);
                this.ctx.stroke();
            } else {
                // 形状工具：恢复快照后重绘预览
                if (this.snapshotBeforeDraw) {
                    this.ctx.putImageData(this.snapshotBeforeDraw, 0, 0);
                }
                this.drawShape(this.startX, this.startY, pos.x, pos.y);
            }
        },

        onMouseUp(e) {
            if (!this.isActive || !this.isDrawing) return;
            this.isDrawing = false;

            if (this.currentTool === 'pen') {
                this.ctx.closePath();
            }

            // 保存快照到历史
            this.saveSnapshot();
            this.snapshotBeforeDraw = null;
        },

        drawShape(x1, y1, x2, y2) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.currentColor;
            this.ctx.lineWidth = this.currentWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            switch (this.currentTool) {
                case 'line':
                    this.ctx.moveTo(x1, y1);
                    this.ctx.lineTo(x2, y2);
                    this.ctx.stroke();
                    break;
                case 'rect':
                    this.ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                    break;
                case 'circle': {
                    const rx = Math.abs(x2 - x1) / 2;
                    const ry = Math.abs(y2 - y1) / 2;
                    const cx = (x1 + x2) / 2;
                    const cy = (y1 + y2) / 2;
                    this.ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
                    this.ctx.stroke();
                    break;
                }
                case 'arrow':
                    this.drawArrow(x1, y1, x2, y2);
                    break;
            }
            this.ctx.closePath();
        },

        drawArrow(x1, y1, x2, y2) {
            const headLen = Math.max(12, this.currentWidth * 4);
            const angle = Math.atan2(y2 - y1, x2 - x1);

            // 画线
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();

            // 画箭头三角形
            this.ctx.beginPath();
            this.ctx.moveTo(x2, y2);
            this.ctx.lineTo(
                x2 - headLen * Math.cos(angle - Math.PI / 6),
                y2 - headLen * Math.sin(angle - Math.PI / 6)
            );
            this.ctx.lineTo(
                x2 - headLen * Math.cos(angle + Math.PI / 6),
                y2 - headLen * Math.sin(angle + Math.PI / 6)
            );
            this.ctx.closePath();
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fill();
        },

        saveSnapshot() {
            if (this.canvas.width > 0 && this.canvas.height > 0) {
                this.history.push(this.canvas.toDataURL());
                // 限制历史记录数量
                if (this.history.length > 50) {
                    this.history.shift();
                }
            }
        },

        undo() {
            if (this.history.length === 0) {
                showToast('没有可撤销的操作', 'error');
                return;
            }
            this.history.pop(); // 移除当前状态
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.history.length > 0) {
                const img = new Image();
                img.onload = () => {
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = this.history[this.history.length - 1];
            }
            showToast('已撤销');
        },

        clearAll() {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.history = [];
            showToast('画布已清除');
        }
    };

    // 事件绑定
    floatingBtn.addEventListener('click', togglePanel);
    panel.querySelector('.__ia-close-btn').addEventListener('click', togglePanel);
    panel.querySelectorAll('.__ia-tab').forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    
    document.getElementById('__ia_showAddBtn').addEventListener('click', toggleAddForm);
    document.getElementById('__ia_addBtn').addEventListener('click', addPreset);
    document.getElementById('__ia_cancelAddBtn').addEventListener('click', toggleAddForm);
    document.getElementById('__ia_presetSearch').addEventListener('input', debounce(renderPresets, 300));
    document.getElementById('__ia_historySearch').addEventListener('input', debounce(renderHistory, 300));
    
    document.getElementById('__ia_autoRecord').addEventListener('change', (e) => { State.settings.autoRecord = e.target.checked; Storage.set('settings', State.settings); });
    document.getElementById('__ia_duplicateCheck').addEventListener('change', (e) => { State.settings.duplicateCheck = e.target.checked; Storage.set('settings', State.settings); });
    document.getElementById('__ia_historyLimit').addEventListener('change', (e) => { State.settings.historyLimit = e.target.value; Storage.set('settings', State.settings); });
    
    document.getElementById('__ia_exportBtn').addEventListener('click', exportConfig);
    document.getElementById('__ia_importBtn').addEventListener('click', () => document.getElementById('__ia_importFile').click());
    document.getElementById('__ia_importFile').addEventListener('change', (e) => { if (e.target.files[0]) importConfig(e.target.files[0]); e.target.value = ''; });
    document.getElementById('__ia_unloadBtn').addEventListener('click', unload);

    // 预设列表事件委托
    document.getElementById('__ia_presetsList').addEventListener('click', (e) => {
        const presetItem = e.target.closest('.__ia-preset-item');
        if (!presetItem) return;
        const id = parseInt(presetItem.dataset.id);
        const preset = State.presets.find(p => p.id === id);
        
        if (e.target.closest('.__ia-preset-value')) {
            insertValue(e.target.textContent);
        } else if (e.target.closest('.__ia-edit-preset')) {
            const newKey = prompt('修改Key:', preset.key);
            if (newKey === null) return;
            const newValues = prompt('修改Values:', preset.values.join(', '));
            if (newValues === null) return;
            preset.key = newKey.trim() || preset.key;
            preset.values = newValues.split(/[,，]/).map(v => v.trim()).filter(v => v);
            Storage.set('presets', State.presets);
            renderPresets();
            showToast('修改成功');
        } else if (e.target.closest('.__ia-delete-preset')) {
            if (!confirm('确定删除?')) return;
            State.presets = State.presets.filter(p => p.id !== id);
            Storage.set('presets', State.presets);
            renderPresets();
            updateStats();
            showToast('已删除');
        }
    });

    // 历史记录事件委托
    document.getElementById('__ia_historyList').addEventListener('click', (e) => {
        const item = e.target.closest('.__ia-history-item');
        if (!item) return;
        const id = parseInt(item.dataset.id);
        const historyItem = State.history.find(h => h.id === id);
        
        if (e.target.closest('.__ia-use-history')) {
            insertValue(historyItem.value);
        } else if (e.target.closest('.__ia-delete-history')) {
            State.history = State.history.filter(h => h.id !== id);
            Storage.set('history', State.history);
            renderHistory();
            updateStats();
        }
    });

    // 输入追踪
    document.addEventListener('focusin', (e) => { if (isInputElement(e.target)) State.lastFocusedInput = e.target; });
    document.addEventListener('focusout', (e) => {
        if (State.settings.autoRecord && isInputElement(e.target)) {
            const value = e.target.value?.trim();
            if (value) addToHistory(value);
        }
    });

    // 初始化拖拽
    setupDraggable({ trigger: floatingBtn, target: floatingBtn, useLeftTop: false });
    setupDraggable({ trigger: panel.querySelector('.__ia-panel-header'), target: panel, useLeftTop: true });

    // 初始化渲染
    loadSettings();
    renderPresets();
    renderHistory();
    updateStats();
    Draw.init();
    Crypto.init();

    console.log('✅ 输入助手悬浮窗已加载');
})();