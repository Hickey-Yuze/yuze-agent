(function(){
    // 防止重复加载
    if(window.__downloadAcceleratorLoaded) return;
    window.__downloadAcceleratorLoaded = true;
    
    const STORAGE_PREFIX = 'da_';
    const DEFAULT_CONFIG = {
        maxThreads: 8,
        speedMultiplier: 4,
        minFileSize: 1048576,
        maxFileSize: 5368709120,
        chunkSize: 524288,
        autoSave: true,
        showNotifications: true,
        autoSaveMode: 'always',
        autoSaveCount: 1
    };
    
    // 状态变量
    let currentDownload = null, 
        currentFileInfo = null, 
        isAccelerating = false, 
        modalEl = null, 
        activeToasts = new Set(), 
        toastQueue = [], 
        userConfig = null, 
        autoSaveCounter = 0;
    
    // ========== 核心修复：配置保存功能 ==========
    
    function loadUserConfig() {
        try {
            // 检查 localStorage 是否可用
            if(!isLocalStorageAvailable()) {
                console.warn('[DownloadAccelerator] localStorage 不可用');
                userConfig = { ...DEFAULT_CONFIG };
                return userConfig;
            }
            
            const saved = localStorage.getItem(STORAGE_PREFIX + 'user_config');
            if(saved) {
                userConfig = JSON.parse(saved);
                // 确保配置完整性
                userConfig = { ...DEFAULT_CONFIG, ...userConfig };
                if(!userConfig.autoSaveMode) userConfig.autoSaveMode = 'always';
                if(userConfig.autoSaveCount === undefined) userConfig.autoSaveCount = 1;
            }
        } catch(e) {
            console.warn('[DownloadAccelerator] 加载配置失败:', e);
        }
        userConfig = userConfig || { ...DEFAULT_CONFIG };
        
        try {
            const counter = localStorage.getItem(STORAGE_PREFIX + 'auto_save_counter');
            autoSaveCounter = counter ? parseInt(counter) : 0;
        } catch(e) {
            autoSaveCounter = 0;
        }
        return userConfig;
    }
    
    // 修复的保存函数 - 添加更好的错误处理和反馈
    function saveUserConfig(config) {
        try {
            if(!isLocalStorageAvailable()) {
                showSaveStatus('❌ 无法保存：浏览器存储不可用', 'error', 3000);
                return false;
            }
            
            userConfig = { ...config };
            localStorage.setItem(STORAGE_PREFIX + 'user_config', JSON.stringify(userConfig));
            
            // 显示吸引人的保存成功提示
            showSaveStatus('💾 配置已保存！', 'success', 2000);
            console.log('[DownloadAccelerator] 配置保存成功:', config);
            return true;
        } catch(e) {
            console.warn('[DownloadAccelerator] 保存配置失败:', e);
            showSaveStatus('❌ 保存失败，请检查存储权限', 'error', 3000);
            return false;
        }
    }
    
    // 新增：检查 localStorage 是否可用
    function isLocalStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }
    
    // ========== 新增：吸引人的保存状态显示 ==========
    
    function showSaveStatus(message, type = 'info', duration = 2000) {
        // 创建或获取保存状态元素
        let statusEl = document.getElementById('da-save-status');
        if(!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'da-save-status';
            statusEl.className = 'da-save-status';
            document.body.appendChild(statusEl);
        }
        
        // 设置内容和样式
        statusEl.textContent = message;
        statusEl.className = `da-save-status da-save-${type}`;
        statusEl.style.display = 'block';
        
        // 添加动画效果
        statusEl.style.animation = 'none';
        setTimeout(() => {
            statusEl.style.animation = 'daStatusSlideIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        }, 10);
        
        // 自动隐藏
        clearTimeout(statusEl._hideTimeout);
        statusEl._hideTimeout = setTimeout(() => {
            statusEl.style.display = 'none';
        }, duration);
    }
    
    function getCurrentConfig() {
        if(!userConfig) loadUserConfig();
        return { ...DEFAULT_CONFIG, ...userConfig };
    }
    
    // ========== 通知系统 ==========
    
    function showToast(message, type = 'info', duration = 3000) {
        if(!getCurrentConfig().showNotifications) return;
        
        const toastId = Date.now() + Math.random();
        toastQueue.push({ id: toastId, message, type, duration });
        processToastQueue();
    }
    
    function processToastQueue() {
        if(toastQueue.length === 0 || activeToasts.size >= 3) return;
        const toast = toastQueue.shift();
        createToast(toast);
    }
    
    function createToast({ id, message, type, duration }) {
        const toast = document.createElement('div');
        toast.className = 'da-toast';
        toast.dataset.id = id;
        toast.innerHTML = `
            <div class="da-toast-icon ${type}">${getToastIcon(type)}</div>
            <div class="da-toast-message">${message}</div>
        `;
        toast.style.top = (24 + activeToasts.size * 70) + 'px';
        document.body.appendChild(toast);
        activeToasts.add(id);
        
        setTimeout(() => removeToast(id, toast), duration);
        toast.addEventListener('click', () => removeToast(id, toast));
        return toast;
    }
    
    function getToastIcon(type) {
        const icons = {
            success: '✅',
            info: '⚡',
            warn: '⚠️',
            error: '❌'
        };
        return icons[type] || '⚡';
    }
    
    function removeToast(id, toast) {
        if(toast && toast.parentNode) {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if(toast.parentNode) toast.remove();
                activeToasts.delete(id);
                processToastQueue();
            }, 300);
        }
    }
    
    function clearAllToasts() {
        document.querySelectorAll('.da-toast').forEach(toast => toast.remove());
        activeToasts.clear();
        toastQueue = [];
    }
    
    // ========== 修复：优化的 CSS 样式，解决字体问题 ==========
    
    function createStyles() {
        if(document.getElementById('da-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'da-styles';
        style.textContent = `
            /* 基础字体设置 - 解决字体不均匀问题 */
            * {
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            
            /* 使用支持中文的字体栈 */
            .da-overlay, .da-modal, .da-toast, .da-save-status {
                font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-weight: 400;
            }
            
            /* 标题使用稍重的字体 */
            .da-header h2, .da-default-info h3, .da-auto-save-title {
                font-weight: 600 !important;
            }
            
            /* 按钮和重要文本 */
            .da-btn, .da-tab, .da-settings-label {
                font-weight: 500 !important;
            }
            
            /* 保存状态显示 - 新增的吸引人样式 */
            .da-save-status {
                position: fixed;
                top: 20px;
                left: 50%;
                transform: translateX(-50%);
                padding: 14px 28px;
                border-radius: 16px;
                font-weight: 600;
                font-size: 15px;
                z-index: 2147483647;
                display: none;
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
                backdrop-filter: blur(20px);
                border: 2px solid;
                text-align: center;
                min-width: 280px;
                max-width: 500px;
                pointer-events: none;
            }
            
            @keyframes daStatusSlideIn {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-30px);
                }
                70% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(5px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            .da-save-success {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(16, 185, 129, 0.9));
                color: white;
                border-color: rgba(34, 197, 94, 0.6);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .da-save-error {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.95), rgba(220, 38, 38, 0.9));
                color: white;
                border-color: rgba(239, 68, 68, 0.6);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            .da-save-info {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.95), rgba(139, 92, 246, 0.9));
                color: white;
                border-color: rgba(99, 102, 241, 0.6);
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* 配置行的动态效果 */
            .da-config-row {
                display: flex;
                justify-content: space-between;
                padding: 12px 0;
                font-size: 15px;
                color: #bbb;
                transition: all 0.3s ease;
                border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            }
            
            .da-config-row:last-child {
                border-bottom: none;
            }
            
            .da-config-row:hover {
                background: rgba(99, 102, 241, 0.05);
                border-radius: 8px;
                padding: 12px 16px;
                margin: 0 -16px;
            }
            
            .da-config-row span:last-child {
                color: #e0e0e0;
                font-weight: 500;
                position: relative;
            }
            
            .da-config-row span:last-child::after {
                content: '';
                position: absolute;
                bottom: -2px;
                left: 0;
                width: 100%;
                height: 2px;
                background: linear-gradient(90deg, #6366f1, #8b5cf6);
                transform: scaleX(0);
                transition: transform 0.3s ease;
            }
            
            .da-config-row:hover span:last-child::after {
                transform: scaleX(1);
            }
            
            /* 原有的模态框样式（保持原有设计） */
            .da-overlay {
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.7);
                z-index: 2147483647;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: daFadeIn 0.2s ease;
            }
            
            @keyframes daFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes daSlideIn {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            
            .da-modal {
                background: #1a1b2e;
                border-radius: 20px;
                width: 90vw;
                max-width: 1200px;
                height: 85vh;
                box-shadow: 0 32px 120px rgba(0, 0, 0, 0.6);
                color: #e0e0e0;
                animation: daSlideIn 0.3s ease;
                overflow: hidden;
                border: 1px solid rgba(99, 102, 241, 0.4);
                display: flex;
                flex-direction: column;
            }
            
            .da-header {
                padding: 24px 32px 20px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                flex-shrink: 0;
            }
            
            .da-header h2 {
                margin: 0;
                font-size: 28px;
                background: linear-gradient(135deg, #818cf8, #6366f1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -0.5px;
            }
            
            .da-close {
                width: 40px; height: 40px;
                border: none;
                background: rgba(255, 255, 255, 0.08);
                border-radius: 10px;
                color: #999;
                font-size: 22px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .da-close:hover {
                background: rgba(255, 255, 255, 0.15);
                color: #fff;
            }
            
            .da-tabs {
                display: flex;
                padding: 20px 32px 0;
                gap: 12px;
                flex-shrink: 0;
            }
            
            .da-tab {
                flex: 1;
                padding: 14px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                border-radius: 12px;
                background: transparent;
                color: #aaa;
                cursor: pointer;
                font-size: 16px;
                transition: all 0.25s;
                text-align: center;
            }
            
            .da-tab.active {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(139, 92, 246, 0.2));
                border-color: rgba(99, 102, 241, 0.6);
                color: #a5b4fc;
            }
            
            .da-tab:hover:not(.active) {
                background: rgba(255, 255, 255, 0.06);
                color: #ccc;
            }
            
            .da-body {
                padding: 24px 32px;
                flex: 1;
                overflow-y: auto;
                max-height: calc(85vh - 220px);
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 32px;
            }
            
            .da-body::-webkit-scrollbar {
                width: 8px;
            }
            
            .da-body::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.06);
                border-radius: 4px;
            }
            
            .da-body::-webkit-scrollbar-thumb {
                background: rgba(99, 102, 241, 0.6);
                border-radius: 4px;
            }
            
            .da-body::-webkit-scrollbar-thumb:hover {
                background: rgba(99, 102, 241, 0.8);
            }
            
            .da-left-panel, .da-right-panel {
                display: flex;
                flex-direction: column;
                gap: 24px;
            }
            
            .da-default-info {
                background: rgba(99, 102, 241, 0.1);
                border-radius: 16px;
                padding: 28px;
                border: 1px solid rgba(99, 102, 241, 0.2);
            }
            
            .da-default-info h3 {
                margin: 0 0 16px;
                font-size: 20px;
                color: #a5b4fc;
            }
            
            .da-form {
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            
            .da-field label {
                display: block;
                font-size: 15px;
                color: #aaa;
                margin-bottom: 8px;
            }
            
            .da-field input, .da-field select {
                width: 100%;
                padding: 14px 18px;
                border-radius: 12px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                background: rgba(255, 255, 255, 0.06);
                color: #e0e0e0;
                font-size: 16px;
                outline: none;
                transition: border-color 0.2s;
                box-sizing: border-box;
            }
            
            .da-field input:focus, .da-field select:focus {
                border-color: rgba(99, 102, 241, 0.7);
            }
            
            .da-field .da-hint {
                font-size: 13px;
                color: #777;
                margin-top: 6px;
            }
            
            .da-footer {
                padding: 20px 32px 28px;
                display: flex;
                gap: 16px;
                border-top: 1px solid rgba(255, 255, 255, 0.08);
                flex-shrink: 0;
            }
            
            .da-btn {
                flex: 1;
                padding: 16px;
                border-radius: 12px;
                border: none;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.25s;
            }
            
            .da-btn-cancel {
                background: rgba(255, 255, 255, 0.08);
                color: #aaa;
            }
            
            .da-btn-cancel:hover {
                background: rgba(255, 255, 255, 0.12);
                color: #ccc;
            }
            
            .da-btn-accel {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: #fff;
                box-shadow: 0 6px 24px rgba(99, 102, 241, 0.4);
            }
            
            .da-btn-accel:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 32px rgba(99, 102, 241, 0.5);
            }
            
            .da-btn-accel:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            
            /* Toast通知 */
            .da-toast {
                position: fixed;
                right: 32px;
                z-index: 2147483646;
                background: #1a1b2e;
                border: 1px solid rgba(99, 102, 241, 0.4);
                padding: 18px 24px;
                border-radius: 14px;
                color: #e0e0e0;
                font-size: 15px;
                box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5);
                animation: daSlideIn 0.3s ease;
                display: flex;
                align-items: center;
                gap: 12px;
                cursor: pointer;
                max-width: 500px;
                min-width: 350px;
                transition: all 0.3s ease;
            }
            
            .da-toast:hover {
                transform: translateX(-8px);
                border-color: rgba(99, 102, 241, 0.6);
            }
            
            .da-toast-icon {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
            }
            
            .da-toast-icon.success {
                background: rgba(34, 197, 94, 0.25);
                color: #22c55e;
            }
            
            .da-toast-icon.info {
                background: rgba(99, 102, 241, 0.25);
                color: #818cf8;
            }
            
            .da-toast-icon.warn {
                background: rgba(245, 158, 11, 0.25);
                color: #f59e0b;
            }
            
            .da-toast-icon.error {
                background: rgba(239, 68, 68, 0.25);
                color: #ef4444;
            }
            
            .da-toast-message {
                flex: 1;
                word-break: break-word;
                line-height: 1.5;
            }
            
            /* 自动保存相关样式 */
            .da-auto-save-toggle {
                display: flex;
                align-items: center;
                background: rgba(99, 102, 241, 0.1);
                border-radius: 16px;
                padding: 20px;
                border: 1px solid rgba(99, 102, 241, 0.25);
                transition: all 0.3s ease;
                cursor: pointer;
            }
            
            .da-auto-save-toggle:hover {
                background: rgba(99, 102, 241, 0.15);
                border-color: rgba(99, 102, 241, 0.35);
            }
            
            .da-auto-save-toggle.active {
                background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.15));
                border-color: rgba(99, 102, 241, 0.5);
                box-shadow: 0 6px 28px rgba(99, 102, 241, 0.25);
            }
            
            .da-auto-save-icon {
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .da-auto-save-icon.always {
                background: linear-gradient(135deg, rgba(34, 197, 94, 0.25), rgba(16, 185, 129, 0.2));
                color: #22c55e;
            }
            
            .da-auto-save-icon.limited {
                background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.2));
                color: #f59e0b;
            }
            
            .da-auto-save-icon.never {
                background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.2));
                color: #ef4444;
            }
            
            .da-auto-save-content {
                flex: 1;
                padding: 0 20px;
                min-width: 0;
            }
            
            .da-auto-save-title {
                color: #e0e0e0;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 18px;
            }
            
            .da-auto-save-description {
                font-size: 14px;
                color: #999;
                line-height: 1.5;
            }
            
            .da-auto-save-count-input {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-top: 12px;
            }
            
            .da-auto-save-count-input input {
                flex: 1;
                padding: 10px 14px;
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(255, 255, 255, 0.06);
                color: #e0e0e0;
                font-size: 14px;
                outline: none;
                min-width: 80px;
            }
            
            .da-auto-save-count-input input:focus {
                border-color: rgba(245, 158, 11, 0.6);
            }
            
            .da-auto-save-count-label {
                font-size: 13px;
                color: #f59e0b;
            }
            
            .da-auto-save-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                margin-right: 10px;
            }
            
            .da-auto-save-indicator.always {
                background: #22c55e;
                box-shadow: 0 0 12px rgba(34, 197, 94, 0.6);
            }
            
            .da-auto-save-indicator.limited {
                background: #f59e0b;
                box-shadow: 0 0 12px rgba(245, 158, 11, 0.6);
            }
            
            .da-auto-save-indicator.never {
                background: #ef4444;
                box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
            }
            
            /* 其他样式保持不变... */
        `;
        
        document.head.appendChild(style);
        return style;
    }
    
    // ========== 工具函数 ==========
    
    function formatSize(bytes) {
        if(bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + ' ' + units[i];
    }
    
    function formatSpeed(bytesPerSec) {
        return formatSize(bytesPerSec) + '/s';
    }
    
    // ========== 修复的配置获取函数 ==========
    
    function getCustomConfig() {
        if(!modalEl) return { ...DEFAULT_CONFIG };
        
        // 修复：正确获取当前配置
        const config = {
            maxThreads: parseInt(modalEl.querySelector('#da-threads')?.value) || DEFAULT_CONFIG.maxThreads,
            speedMultiplier: parseFloat(modalEl.querySelector('#da-speed')?.value) || DEFAULT_CONFIG.speedMultiplier,
            minFileSize: parseSizeInput(modalEl.querySelector('#da-min-size')?.value) || DEFAULT_CONFIG.minFileSize,
            maxFileSize: parseSizeInput(modalEl.querySelector('#da-max-size')?.value) || DEFAULT_CONFIG.maxFileSize,
            chunkSize: parseSizeInput(modalEl.querySelector('#da-chunk-size')?.value) || DEFAULT_CONFIG.chunkSize,
            autoSave: modalEl.querySelector('#da-auto-save')?.checked ?? true,
            showNotifications: modalEl.querySelector('#da-show-notifications')?.checked ?? true,
            autoSaveMode: 'always',
            autoSaveCount: 1
        };
        
        // 获取自动保存模式
        const activeToggle = modalEl.querySelector('.da-auto-save-toggle.active');
        if(activeToggle) {
            const mode = activeToggle.dataset.mode;
            config.autoSaveMode = mode;
            
            if(mode === 'limited') {
                const countInput = modalEl.querySelector('#da-auto-save-count');
                if(countInput) {
                    const count = parseInt(countInput.value) || 1;
                    config.autoSaveCount = Math.max(1, Math.min(999, count));
                    autoSaveCounter = count;
                    try {
                        localStorage.setItem(STORAGE_PREFIX + 'auto_save_counter', count.toString());
                    } catch(e) {
                        console.warn('[DownloadAccelerator] 保存自动保存计数器失败:', e);
                    }
                }
            } else if(mode === 'always') {
                autoSaveCounter = 0;
                try {
                    localStorage.removeItem(STORAGE_PREFIX + 'auto_save_counter');
                } catch(e) {
                    console.warn('[DownloadAccelerator] 清除自动保存计数器失败:', e);
                }
            } else if(mode === 'never') {
                autoSaveCounter = 0;
                try {
                    localStorage.removeItem(STORAGE_PREFIX + 'auto_save_counter');
                } catch(e) {
                    console.warn('[DownloadAccelerator] 清除自动保存计数器失败:', e);
                }
            }
            
            // 修复：立即保存配置，而不是等到点击"确定加速"
            if(mode !== 'never') {
                saveUserConfig(config);
            }
        }
        
        return config;
    }
    
    function parseSizeInput(val) {
        if(!val) return null;
        val = val.trim();
        const match = val.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)?$/i);
        if(!match) return null;
        const num = parseFloat(match[1]);
        const unit = (match[2] || 'MB').toUpperCase();
        const multipliers = {
            B: 1,
            KB: 1024,
            MB: 1048576,
            GB: 1073741824,
            TB: 1099511627776
        };
        return num * (multipliers[unit] || 1048576);
    }
    
    // ========== 文件信息获取 ==========
    
    async function getFileInfo(url) {
        try {
            const headResp = await fetch(url, { 
                method: 'HEAD', 
                mode: 'cors', 
                cache: 'no-cache' 
            }).catch(e => {
                console.warn('[DownloadAccelerator] 网络请求失败:', e);
                return null;
            });
            
            if(!headResp || !headResp.ok) return null;
            
            const contentLength = parseInt(headResp.headers.get('Content-Length') || '0');
            const contentType = headResp.headers.get('Content-Type') || 'application/octet-stream';
            const acceptRanges = headResp.headers.get('Accept-Ranges');
            const lastModified = headResp.headers.get('Last-Modified');
            const contentDisposition = headResp.headers.get('Content-Disposition');
            
            let filename = '未知文件';
            if(contentDisposition) {
                try {
                    const match = contentDisposition.match(/filename[^;=]*=(['"]?)(.*?)\1(;|$)/);
                    if(match && match[2]) {
                        filename = decodeURIComponent(match[2].replace(/['"]/g, ''));
                    }
                } catch(e) {
                    console.warn('[DownloadAccelerator] 解析文件名失败:', e);
                }
            }
            
            if(filename === '未知文件') {
                try {
                    const urlObj = new URL(url);
                    const pathname = urlObj.pathname;
                    const parts = pathname.split('/');
                    filename = parts[parts.length - 1] || 'download';
                } catch(e) {
                    filename = 'download';
                }
            }
            
            return {
                filename,
                size: contentLength,
                formattedSize: formatSize(contentLength),
                type: contentType,
                supportsRange: !!(acceptRanges && acceptRanges.includes('bytes')),
                lastModified: lastModified || '未知',
                url: url
            };
        } catch(error) {
            console.warn('[DownloadAccelerator] 获取文件信息失败:', error);
            return null;
        }
    }
    
    // ========== 模态框创建 ==========
    
    function createModal() {
        if(modalEl) {
            modalEl.remove();
            modalEl = null;
        }
        
        const config = getCurrentConfig();
        const overlay = document.createElement('div');
        overlay.className = 'da-overlay';
        overlay.id = 'da-overlay';
        
        const fileInfoHtml = currentFileInfo ? `
            <div class="da-file-info">
                <div class="da-file-info-title">
                    <span>📄 文件信息</span>
                </div>
                <div class="da-file-info-row">
                    <span>文件名:</span>
                    <span>${currentFileInfo.filename}</span>
                </div>
                <div class="da-file-info-row">
                    <span>文件大小:</span>
                    <span>${currentFileInfo.formattedSize}</span>
                </div>
                <div class="da-file-info-row">
                    <span>文件类型:</span>
                    <span>${currentFileInfo.type}</span>
                </div>
                <div class="da-file-info-row">
                    <span>分片支持:</span>
                    <span>${currentFileInfo.supportsRange ? '✅ 支持' : '❌ 不支持'}</span>
                </div>
                <div class="da-file-info-row">
                    <span>最后修改:</span>
                    <span>${currentFileInfo.lastModified}</span>
                </div>
            </div>
        ` : '';
        
        overlay.innerHTML = `
            <div class="da-modal">
                <div class="da-header">
                    <h2>⚡ 下载加速器 v2.1</h2>
                    <button class="da-close" id="da-close-btn">✕</button>
                </div>
                
                <div class="da-tabs">
                    <button class="da-tab active" data-tab="default">🚀 默认加速</button>
                    <button class="da-tab" data-tab="custom">⚙️ 自定义加速</button>
                    <button class="da-tab" data-tab="settings">⚙️ 设置</button>
                </div>
                
                <div class="da-body">
                    <div class="da-url-input-area">
                        <label>下载链接</label>
                        <input type="text" id="da-url-input" placeholder="输入或粘贴下载链接..." value="${currentDownload || ''}" />
                    </div>
                    
                    <div id="da-tab-content">
                        <div class="da-left-panel">
                            <div class="da-default-info" id="da-default-panel">
                                <h3>默认加速配置</h3>
                                <div class="da-config-row">
                                    <span>最大线程数</span>
                                    <span>${config.maxThreads}</span>
                                </div>
                                <div class="da-config-row">
                                    <span>加速倍速</span>
                                    <span>${config.speedMultiplier}x</span>
                                </div>
                                <div class="da-config-row">
                                    <span>最小文件大小</span>
                                    <span>${formatSize(config.minFileSize)}</span>
                                </div>
                                <div class="da-config-row">
                                    <span>最大文件大小</span>
                                    <span>${formatSize(config.maxFileSize)}</span>
                                </div>
                                <div class="da-config-row">
                                    <span>分片大小</span>
                                    <span>${formatSize(config.chunkSize)}</span>
                                </div>
                                <div class="da-config-row">
                                    <span>自动保存模式</span>
                                    <span>${config.autoSaveMode === 'always' ? '始终自动保存' : config.autoSaveMode === 'limited' ? '限时自动保存' : '不自动保存'}</span>
                                </div>
                                <div class="da-config-row">
                                    <span>自动保存状态</span>
                                    <span>${autoSaveCounter > 0 ? `剩余 ${autoSaveCounter} 次` : '-'}</span>
                                </div>
                            </div>
                            ${fileInfoHtml}
                        </div>
                        
                        <div class="da-right-panel">
                            <div class="da-form" id="da-custom-panel" style="display:none">
                                <div class="da-field">
                                    <label>最大线程数</label>
                                    <input type="number" id="da-threads" value="${config.maxThreads}" min="1" max="64" />
                                    <div class="da-hint">建议 4-32，过高可能导致服务器拒绝</div>
                                </div>
                                
                                <div class="da-field">
                                    <label>加速倍速</label>
                                    <input type="number" id="da-speed" value="${config.speedMultiplier}" min="1" max="100" step="0.5" />
                                    <div class="da-hint">通过多线程并行实现，实际效果取决于服务器和带宽</div>
                                </div>
                                
                                <div class="da-field">
                                    <label>最小加速文件大小</label>
                                    <input type="text" id="da-min-size" value="${formatSize(config.minFileSize).replace(' ', '')}" placeholder="例如: 1MB" />
                                    <div class="da-hint">低于此大小的文件不启用加速（支持 B/KB/MB/GB/TB）</div>
                                </div>
                                
                                <div class="da-field">
                                    <label>最大加速文件大小</label>
                                    <input type="text" id="da-max-size" value="${formatSize(config.maxFileSize).replace(' ', '')}" placeholder="例如: 5GB" />
                                    <div class="da-hint">超过此大小的文件不启用加速</div>
                                </div>
                                
                                <div class="da-field">
                                    <label>每个分片大小</label>
                                    <input type="text" id="da-chunk-size" value="${formatSize(config.chunkSize).replace(' ', '')}" placeholder="例如: 512KB" />
                                    <div class="da-hint">每个线程下载的分片大小，影响线程数分配</div>
                                </div>
                                
                                <div class="da-auto-save-container">
                                    <div class="da-auto-save-toggle ${config.autoSaveMode === 'always' ? 'active' : ''}" data-mode="always">
                                        <div class="da-auto-save-icon always">💾</div>
                                        <div class="da-auto-save-content">
                                            <div class="da-auto-save-title">
                                                <span class="da-auto-save-indicator always"></span>
                                                始终自动保存
                                            </div>
                                            <div class="da-auto-save-description">
                                                每次修改配置后都会自动保存
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="da-auto-save-toggle ${config.autoSaveMode === 'limited' ? 'active' : ''}" data-mode="limited">
                                        <div class="da-auto-save-icon limited">⏳</div>
                                        <div class="da-auto-save-content">
                                            <div class="da-auto-save-title">
                                                <span class="da-auto-save-indicator limited"></span>
                                                限时自动保存
                                            </div>
                                            <div class="da-auto-save-description">
                                                仅保存接下来的指定次数配置修改
                                            </div>
                                            <div class="da-auto-save-count-input">
                                                <input type="number" id="da-auto-save-count" value="${config.autoSaveCount}" min="1" max="999" placeholder="输入次数" />
                                                <span class="da-auto-save-count-label">次</span>
                                            </div>
                                            <div class="da-auto-save-status">
                                                ${autoSaveCounter > 0 ? `<span class="da-auto-save-badge">剩余 ${autoSaveCounter} 次</span>` : '未设置'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="da-auto-save-toggle ${config.autoSaveMode === 'never' ? 'active' : ''}" data-mode="never">
                                        <div class="da-auto-save-icon never">🚫</div>
                                        <div class="da-auto-save-content">
                                            <div class="da-auto-save-title">
                                                <span class="da-auto-save-indicator never"></span>
                                                不自动保存
                                            </div>
                                            <div class="da-auto-save-description">
                                                配置修改不会被自动保存
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="da-form" id="da-settings-panel" style="display:none">
                                <div class="da-settings-row">
                                    <span class="da-settings-label">显示通知消息</span>
                                    <label class="da-switch">
                                        <input type="checkbox" id="da-show-notifications" ${config.showNotifications ? 'checked' : ''} />
                                        <span class="da-slider"></span>
                                    </label>
                                </div>
                                
                                <div class="da-settings-row">
                                    <span class="da-settings-label">版本信息</span>
                                    <span style="font-size:14px;color:#888;">v2.1 | 修复版 | 跨网页自动保存</span>
                                </div>
                                
                                <div class="da-settings-row">
                                    <span class="da-settings-label">存储状态</span>
                                    <span style="font-size:14px;color:#888;">${isLocalStorageAvailable() ? '✅ 已启用' : '❌ 未启用'}</span>
                                </div>
                                
                                <div class="da-settings-row">
                                    <span class="da-settings-label">自动保存模式</span>
                                    <span style="font-size:14px;color:#888;">
                                        ${config.autoSaveMode === 'always' ? '始终自动保存' : 
                                          config.autoSaveMode === 'limited' ? '限时自动保存' : 
                                          '不自动保存'}
                                    </span>
                                </div>
                                
                                <div class="da-settings-row">
                                    <span class="da-settings-label">自动保存状态</span>
                                    <span style="font-size:14px;color:#888;">
                                        ${autoSaveCounter > 0 ? `剩余 ${autoSaveCounter} 次` : '-'}
                                    </span>
                                </div>
                                
                                <button class="da-btn da-btn-cancel" id="da-clear-history" style="margin-top:24px;">
                                    清空下载历史
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="da-footer">
                    <button class="da-btn da-btn-cancel" id="da-cancel-btn">取消</button>
                    <button class="da-btn da-btn-accel" id="da-accel-btn">🚀 确定加速</button>
                </div>
                
                <div class="da-shortcut-hint">
                    <kbd>Ctrl+Z</kbd> 打开面板 &nbsp; <kbd>Ctrl+M</kbd> 快速默认加速
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        modalEl = overlay;
        
        // 事件监听器
        setupModalEvents();
        
        // 聚焦输入框
        const urlInput = document.getElementById('da-url-input');
        urlInput.focus();
        urlInput.select();
    }
    
    function setupModalEvents() {
        // 关闭按钮
        modalEl.querySelector('#da-close-btn').addEventListener('click', closeModal);
        modalEl.querySelector('#da-cancel-btn').addEventListener('click', closeModal);
        
        // 点击遮罩层关闭
        modalEl.addEventListener('click', (e) => {
            if(e.target === modalEl) closeModal();
        });
        
        // 标签页切换
        modalEl.querySelectorAll('.da-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modalEl.querySelectorAll('.da-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const tabName = tab.dataset.tab;
                document.getElementById('da-default-panel').style.display = tabName === 'default' ? 'block' : 'none';
                document.getElementById('da-custom-panel').style.display = tabName === 'custom' ? 'flex' : 'none';
                document.getElementById('da-settings-panel').style.display = tabName === 'settings' ? 'block' : 'none';
                
                // 修复：切换标签页时实时保存配置
                if(tabName === 'custom') {
                    const config = getCustomConfig();
                    saveUserConfig(config);
                }
            });
        });
        
        // 自动保存模式切换
        modalEl.querySelectorAll('.da-auto-save-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                modalEl.querySelectorAll('.da-auto-save-toggle').forEach(t => {
                    t.classList.remove('active');
                });
                toggle.classList.add('active');
                
                // 修复：切换模式时立即保存
                const config = getCustomConfig();
                saveUserConfig(config);
                
                // 显示模式切换提示
                const mode = toggle.dataset.mode;
                if(mode === 'always') {
                    showSaveStatus('💾 已启用始终自动保存', 'success', 2000);
                } else if(mode === 'limited') {
                    showSaveStatus('⏳ 限时自动保存已启用', 'info', 2000);
                } else if(mode === 'never') {
                    showSaveStatus('🚫 已禁用自动保存', 'info', 2000);
                }
            });
        });
        
        // 加速按钮
        modalEl.querySelector('#da-accel-btn').addEventListener('click', () => {
            const url = document.getElementById('da-url-input').value.trim();
            if(!url) {
                showToast('请输入下载链接', 'warn');
                return;
            }
            
            const tabName = modalEl.querySelector('.da-tab.active').dataset.tab;
            let config;
            
            if(tabName === 'default') {
                config = getCurrentConfig(); // 修复：使用当前配置而不是未定义的变量
            } else if(tabName === 'custom') {
                config = getCustomConfig();
            } else {
                config = getCurrentConfig();
            }
            
            accelerateDownload(url, config);
        });
        
        // 清空历史按钮
        const clearHistoryBtn = modalEl.querySelector('#da-clear-history');
        if(clearHistoryBtn) {
            clearHistoryBtn.addEventListener('click', () => {
                try {
                    localStorage.removeItem(STORAGE_PREFIX + 'history');
                    showToast('下载历史已清空', 'success');
                } catch(e) {
                    showToast('清空历史失败', 'error');
                }
            });
        }
        
        // 输入框实时保存（可选）
        const inputs = modalEl.querySelectorAll('#da-custom-panel input, #da-custom-panel select');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                const config = getCustomConfig();
                saveUserConfig(config);
            });
        });
    }
    
    function closeModal() {
        if(modalEl) {
            modalEl.remove();
            modalEl = null;
        }
        clearAllToasts();
    }
    
    // ========== 下载加速核心功能 ==========
    
    async function accelerateDownload(url, config) {
        if(isAccelerating) {
            showToast('已有下载任务正在加速中', 'warn');
            return;
        }
        
        isAccelerating = true;
        updateAccelButton(true);
        clearAllToasts();
        
        try {
            showToast('正在获取文件信息...', 'info');
            
            const headResp = await fetch(url, {
                method: 'HEAD',
                mode: 'cors',
                cache: 'no-cache'
            }).catch(e => {
                throw new Error(`网络请求失败: ${e.message}`);
            });
            
            if(!headResp.ok) {
                throw new Error(`无法访问该资源 (HTTP ${headResp.status})`);
            }
            
            const contentLength = parseInt(headResp.headers.get('Content-Length') || '0');
            const contentType = headResp.headers.get('Content-Type') || 'application/octet-stream';
            const acceptRanges = headResp.headers.get('Accept-Ranges');
            
            if(!contentLength || contentLength === 0) {
                throw new Error('无法获取文件大小，不支持加速下载');
            }
            
            if(contentLength < config.minFileSize) {
                throw new Error(`文件大小 ${formatSize(contentLength)} 小于最小加速限制 ${formatSize(config.minFileSize)}`);
            }
            
            if(contentLength > config.maxFileSize) {
                throw new Error(`文件大小 ${formatSize(contentLength)} 超过最大加速限制 ${formatSize(config.maxFileSize)}`);
            }
            
            const supportsRange = !!(acceptRanges && acceptRanges.includes('bytes'));
            const effectiveThreads = supportsRange ? 
                Math.min(config.maxThreads, Math.max(1, Math.ceil(contentLength / config.chunkSize))) : 1;
            const effectiveChunkSize = supportsRange ? 
                Math.ceil(contentLength / effectiveThreads) : contentLength;
            
            if(!supportsRange) {
                showToast('服务器不支持分片下载，将使用单线程加速', 'warn');
            }
            
            // 获取文件名
            const filename = getFilenameFromUrl(url, headResp);
            
            // 显示进度UI
            showProgressUI(effectiveThreads);
            
            const startTime = Date.now();
            let completedBytes = 0;
            const threadStates = new Array(effectiveThreads).fill('idle');
            const chunks = [];
            const promises = [];
            const abortController = new AbortController();
            
            // 多线程下载
            for(let i = 0; i < effectiveThreads; i++) {
                const start = i * effectiveChunkSize;
                const end = Math.min(start + effectiveChunkSize - 1, contentLength - 1);
                threadStates[i] = 'active';
                updateThreadDots(threadStates);
                
                const promise = fetchRange(url, start, end, abortController.signal)
                    .then(async (response) => {
                        if(!response.ok) {
                            throw new Error(`分片下载失败 (HTTP ${response.status})`);
                        }
                        
                        const reader = response.body.getReader();
                        const chunks_local = [];
                        let chunkCompleted = 0;
                        
                        while(true) {
                            const { done, value } = await reader.read();
                            if(done) break;
                            
                            chunks_local.push(value);
                            chunkCompleted += value.length;
                            completedBytes += value.length;
                            
                            if(chunkCompleted % (1024 * 100) === 0) {
                                updateProgress(completedBytes, contentLength, startTime, effectiveThreads);
                            }
                        }
                        
                        threadStates[i] = 'done';
                        updateThreadDots(threadStates);
                        return concatUint8Arrays(chunks_local);
                    })
                    .catch(error => {
                        threadStates[i] = 'error';
                        updateThreadDots(threadStates);
                        abortController.abort();
                        throw error;
                    });
                
                promises.push(promise);
            }
            
            // 等待所有线程完成
            const results = await Promise.all(promises);
            const blob = new Blob(results, { type: contentType });
            
            // 更新最终进度
            updateProgress(contentLength, contentLength, startTime, effectiveThreads);
            
            // 触发下载
            const downloadUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 10000);
            
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const avgSpeed = formatSpeed(contentLength / (Date.now() - startTime) * 1000);
            
            showToast(`✅ 加速下载完成！用时 ${elapsed}s，平均速度 ${avgSpeed}`, 'success', 5000);
            saveDownloadHistory(url, filename, contentLength, elapsed);
            
            // 修复：更新自动保存计数器
            if(config.autoSaveMode === 'limited' && autoSaveCounter > 0) {
                autoSaveCounter--;
                try {
                    localStorage.setItem(STORAGE_PREFIX + 'auto_save_counter', autoSaveCounter.toString());
                    if(autoSaveCounter === 0) {
                        showToast('⏳ 自动保存次数已用完，配置将不再自动保存', 'info');
                        config.autoSaveMode = 'never';
                        saveUserConfig(config);
                    }
                } catch(e) {
                    console.warn('[DownloadAccelerator] 更新自动保存计数器失败:', e);
                }
            }
            
        } catch(err) {
            console.error('[DownloadAccelerator] 加速失败:', err);
            showToast(`❌ 加速失败: ${err.message}`, 'error', 5000);
            fallbackDownload(url);
        } finally {
            isAccelerating = false;
            updateAccelButton(false);
        }
    }
    
    // ========== 辅助函数 ==========
    
    async function fetchRange(url, start, end, signal) {
        const headers = { Range: `bytes=${start}-${end}` };
        return fetch(url, { headers, mode: 'cors', signal, cache: 'no-cache' });
    }
    
    function concatUint8Arrays(arrays) {
        const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for(const arr of arrays) {
            result.set(arr, offset);
            offset += arr.length;
        }
        return result;
    }
    
    function getFilenameFromUrl(url, resp) {
        try {
            const disposition = resp.headers.get('Content-Disposition');
            if(disposition) {
                const match = disposition.match(/filename[^;=]*=(['"]?)(.*?)\1(;|$)/);
                if(match && match[2]) {
                    return decodeURIComponent(match[2].replace(/['"]/g, ''));
                }
            }
        } catch(e) {
            console.warn('[DownloadAccelerator] 解析文件名失败:', e);
        }
        
        try {
            const urlObj = new URL(url);
            const pathname = urlObj.pathname;
            const parts = pathname.split('/');
            return parts[parts.length - 1] || 'download';
        } catch(e) {
            return 'download';
        }
    }
    
    function fallbackDownload(url) {
        showToast('⏬ 回退到普通下载方式', 'info');
        const a = document.createElement('a');
        a.href = url;
        a.download = '';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
    
    function saveDownloadHistory(url, filename, size, time) {
        try {
            const history = JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'history') || '[]');
            history.unshift({
                url,
                filename,
                size: formatSize(size),
                time,
                timestamp: Date.now()
            });
            if(history.length > 50) history.length = 50;
            localStorage.setItem(STORAGE_PREFIX + 'history', JSON.stringify(history));
        } catch(e) {
            console.warn('[DownloadAccelerator] 保存历史记录失败:', e);
        }
    }
    
    function showProgressUI(threads) {
        let area = modalEl.querySelector('.da-progress-area');
        if(!area) {
            area = document.createElement('div');
            area.className = 'da-progress-area';
            const body = modalEl.querySelector('.da-body');
            body.appendChild(area);
        }
        
        area.innerHTML = `
            <div class="da-progress-bar-bg">
                <div class="da-progress-bar-fill" id="da-progress-fill"></div>
            </div>
            <div class="da-progress-stats">
                <span id="da-progress-pct">0%</span>
                <span id="da-progress-speed">0 B/s</span>
                <span id="da-progress-size">0 B / 0 B</span>
            </div>
            <div class="da-thread-grid" id="da-thread-grid">
                ${Array(threads).fill('<div class="da-thread-dot active"></div>').join('')}
            </div>
        `;
    }
    
    function updateProgress(completed, total, startTime, threads) {
        const pct = Math.min((completed / total) * 100, 100);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = elapsed > 0 ? completed / elapsed : 0;
        
        const fill = modalEl.querySelector('#da-progress-fill');
        const pctEl = modalEl.querySelector('#da-progress-pct');
        const speedEl = modalEl.querySelector('#da-progress-speed');
        const sizeEl = modalEl.querySelector('#da-progress-size');
        
        if(fill) fill.style.width = pct.toFixed(1) + '%';
        if(pctEl) pctEl.textContent = pct.toFixed(1) + '%';
        if(speedEl) speedEl.textContent = formatSpeed(speed);
        if(sizeEl) sizeEl.textContent = `${formatSize(completed)} / ${formatSize(total)}`;
    }
    
    function updateThreadDots(states) {
        const dots = modalEl.querySelectorAll('.da-thread-dot');
        states.forEach((state, i) => {
            if(dots[i]) {
                dots[i].className = 'da-thread-dot';
                if(state === 'active') dots[i].classList.add('active');
                else if(state === 'done') dots[i].classList.add('done');
                else if(state === 'error') dots[i].classList.add('error');
            }
        });
    }
    
    function updateAccelButton(disabled) {
        const btn = modalEl.querySelector('.da-btn-accel');
        if(btn) {
            btn.disabled = disabled;
            btn.innerHTML = disabled ? '⏳ 加速中...' : '🚀 确定加速';
        }
    }
    
    // ========== 下载链接拦截 ==========
    
    async function interceptDownloads() {
        document.addEventListener('click', async (e) => {
            const link = e.target.closest('a[href]');
            if(!link) return;
            
            const href = link.getAttribute('href');
            if(!href) return;
            
            // 判断是否为可下载文件
            const isDownloadable = link.hasAttribute('download') || 
                /\.(zip|rar|7z|tar|gz|bz2|xz|iso|dmg|exe|msi|deb|rpm|apk|pdf|mp4|mkv|avi|mov|mp3|flac|wav|ogg|doc|docx|xls|xlsx|ppt|pptx|img|bin|dat|torrent)$/i.test(href) ||
                link.classList.contains('download') ||
                link.textContent.toLowerCase().includes('download');
            
            if(isDownloadable) {
                try {
                    const absoluteUrl = new URL(href, window.location.href).href;
                    currentDownload = absoluteUrl;
                    currentFileInfo = await getFileInfo(absoluteUrl);
                    
                    if(getCurrentConfig().showNotifications && currentFileInfo) {
                        showToast(`检测到下载链接: ${currentFileInfo.filename} (${currentFileInfo.formattedSize})，按 Ctrl+Z 打开加速面板`, 'info', 5000);
                    } else if(getCurrentConfig().showNotifications) {
                        showToast('检测到下载链接，按 Ctrl+Z 打开加速面板', 'info', 5000);
                    }
                } catch(e) {
                    currentDownload = href;
                    currentFileInfo = null;
                    console.warn('[DownloadAccelerator] 解析链接失败:', e);
                }
            }
        });
    }
    
    // ========== 键盘快捷键 ==========
    
    function initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z 打开面板
            if(e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                e.stopPropagation();
                if(modalEl) {
                    closeModal();
                } else {
                    createStyles();
                    createModal();
                }
            }
            
            // Ctrl+M 快速默认加速
            if(e.ctrlKey && e.key === 'm') {
                e.preventDefault();
                e.stopPropagation();
                const url = currentDownload || (modalEl && document.getElementById('da-url-input')?.value.trim());
                if(!url) {
                    showToast('未检测到下载链接，请先点击下载按钮或手动输入', 'warn');
                    return;
                }
                closeModal();
                createStyles();
                accelerateDownload(url, getCurrentConfig());
            }
            
            // Esc 关闭面板
            if(e.key === 'Escape' && modalEl) {
                closeModal();
            }
        });
    }
    
    // ========== 初始化 ==========
    
    function init() {
        try {
            // 加载用户配置
            loadUserConfig();
            
            // 设置下载拦截
            interceptDownloads();
            
            // 设置键盘快捷键
            initKeyboardShortcuts();
            
            // 创建样式
            createStyles();
            
            console.log('[DownloadAccelerator v2.1] 脚本已加载 | 修复版 | 跨网页自动保存已启用');
            console.log('[DownloadAccelerator] 快捷键: Ctrl+Z 打开面板 | Ctrl+M 快速默认加速 | Esc 关闭面板');
            
            // 显示就绪通知
            if(getCurrentConfig().showNotifications) {
                setTimeout(() => {
                    showToast('⚡ 下载加速器已就绪 | Ctrl+Z 打开面板 | Ctrl+M 快速加速', 'info', 5000);
                }, 1500);
            }
        } catch(error) {
            console.error('[DownloadAccelerator] 初始化失败:', error);
            // 即使初始化失败，也尝试显示错误提示
            try {
                showToast('下载加速器初始化失败，请刷新页面重试', 'error', 5000);
            } catch(e) {
                console.error('[DownloadAccelerator] 无法显示错误提示:', e);
            }
        }
    }
    
    // 在 DOM 加载完成后初始化
    if(document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();