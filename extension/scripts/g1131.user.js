(function() {
    // ================ 配置 ================
    const CONFIG = {
        STORAGE_KEY: 'tabbit_safe_mode_state',
        INDICATOR_ID: 'safe-mode-indicator',
        NOTICE_ID: 'safe-mode-notice',
        STYLE_ID: 'safe-mode-styles'
    };
    
    // ================ 状态管理 ================
    let isActive = false;
    let hasInitialized = false;
    
    // 检查上次执行状态
    function getLastState() {
        try {
            return localStorage.getItem(CONFIG.STORAGE_KEY) === 'active';
        } catch (e) {
            return false;
        }
    }
    
    // 保存状态
    function saveState(active) {
        try {
            if (active) {
                localStorage.setItem(CONFIG.STORAGE_KEY, 'active');
            } else {
                localStorage.removeItem(CONFIG.STORAGE_KEY);
            }
        } catch (e) {
            console.warn('保存状态失败:', e);
        }
    }
    
    // ================ 核心屏蔽功能 ================
    
    function hideImages() {
        const images = document.querySelectorAll('img, picture, svg image');
        images.forEach(img => {
            if (img.dataset.safeMode === 'processed') return;
            
            const width = Math.max(img.width || img.offsetWidth || 100, 50);
            const height = Math.max(img.height || img.offsetHeight || 100, 50);
            const alt = img.alt || '图片';
            
            const placeholder = document.createElement('div');
            placeholder.className = 'safe-mode-img-placeholder';
            placeholder.dataset.safeMode = 'processed';
            
            // 设置样式
            placeholder.style.cssText = `
                display: inline-block;
                width: ${width}px;
                height: ${height}px;
                background: #f5f5f5;
                border: 2px solid #e8e8e8;
                border-radius: 4px;
                position: relative;
                box-sizing: border-box;
                vertical-align: middle;
                margin: 0;
                overflow: hidden;
            `;
            
            // 创建内容
            let contentHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 90%; text-align: center;">
                    <div style="font-size: 20px; margin-bottom: 4px; color: #bfbfbf;">🖼️</div>
                    <div style="font-size: 11px; color: #8c8c8c; font-weight: 500;">图片已屏蔽</div>
            `;
            
            if (alt && alt.length > 0) {
                contentHTML += `<div style="font-size: 10px; color: #bfbfbf; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${alt}</div>`;
            }
            
            contentHTML += '</div>';
            placeholder.innerHTML = contentHTML;
            
            try {
                img.parentNode.replaceChild(placeholder, img);
            } catch (e) {
                console.warn('替换图片失败:', e);
            }
        });
    }
    
    function hideVideos() {
        const videos = document.querySelectorAll('video, [data-video]');
        videos.forEach(video => {
            if (video.dataset.safeMode === 'processed') return;
            
            const width = Math.max(video.width || video.offsetWidth || 300, 100);
            const height = Math.max(video.height || video.offsetHeight || 200, 80);
            
            const placeholder = document.createElement('div');
            placeholder.className = 'safe-mode-video-placeholder';
            placeholder.dataset.safeMode = 'processed';
            
            placeholder.style.cssText = `
                display: inline-block;
                width: ${width}px;
                height: ${height}px;
                background: #1f1f1f;
                border: 2px solid #434343;
                border-radius: 4px;
                position: relative;
                box-sizing: border-box;
                vertical-align: middle;
                margin: 0;
            `;
            
            placeholder.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #d9d9d9;">
                    <div style="font-size: 24px; margin-bottom: 6px;">🎬</div>
                    <div style="font-size: 12px; font-weight: 500;">视频已屏蔽</div>
                    <div style="font-size: 10px; margin-top: 2px; opacity: 0.7;">专注工作模式</div>
                </div>
            `;
            
            try {
                video.parentNode.replaceChild(placeholder, video);
            } catch (e) {
                console.warn('替换视频失败:', e);
            }
        });
    }
    
    function hideIframes() {
        const iframes = document.querySelectorAll('iframe, embed, object');
        iframes.forEach(iframe => {
            if (iframe.dataset.safeMode === 'processed') return;
            
            const width = Math.max(iframe.width || iframe.offsetWidth || 400, 100);
            const height = Math.max(iframe.height || iframe.offsetHeight || 300, 80);
            
            const placeholder = document.createElement('div');
            placeholder.className = 'safe-mode-iframe-placeholder';
            placeholder.dataset.safeMode = 'processed';
            
            placeholder.style.cssText = `
                display: inline-block;
                width: ${width}px;
                height: ${height}px;
                background: #f0f9ff;
                border: 2px solid #91d5ff;
                border-radius: 4px;
                position: relative;
                box-sizing: border-box;
                vertical-align: middle;
                margin: 0;
            `;
            
            placeholder.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #1890ff;">
                    <div style="font-size: 24px; margin-bottom: 6px;">🔗</div>
                    <div style="font-size: 12px; font-weight: 500;">嵌入内容已屏蔽</div>
                </div>
            `;
            
            try {
                iframe.parentNode.replaceChild(placeholder, iframe);
            } catch (e) {
                console.warn('替换iframe失败:', e);
            }
        });
    }
    
    function hideBackgrounds() {
        // 简单处理关键元素
        document.querySelectorAll('div, section, article, header, footer').forEach(el => {
            const bg = window.getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none' && bg !== 'initial') {
                el.style.backgroundImage = 'none';
                if (!el.style.backgroundColor) {
                    el.style.backgroundColor = '#fafafa';
                }
            }
        });
    }
    
    function hideCanvas() {
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            if (canvas.dataset.safeMode === 'processed') return;
            
            const width = Math.max(canvas.width || canvas.offsetWidth || 200, 80);
            const height = Math.max(canvas.height || canvas.offsetHeight || 150, 60);
            
            const placeholder = document.createElement('div');
            placeholder.className = 'safe-mode-canvas-placeholder';
            placeholder.dataset.safeMode = 'processed';
            
            placeholder.style.cssText = `
                display: inline-block;
                width: ${width}px;
                height: ${height}px;
                background: #fffbe6;
                border: 2px solid #ffe58f;
                border-radius: 4px;
                position: relative;
                box-sizing: border-box;
                vertical-align: middle;
                margin: 0;
            `;
            
            placeholder.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; color: #d48806;">
                    <div style="font-size: 20px; margin-bottom: 4px;">🎨</div>
                    <div style="font-size: 11px; font-weight: 500;">动画已屏蔽</div>
                </div>
            `;
            
            try {
                canvas.parentNode.replaceChild(placeholder, canvas);
            } catch (e) {
                console.warn('替换canvas失败:', e);
            }
        });
    }
    
    // ================ UI组件 ================
    
    function addGlobalStyles() {
        if (document.getElementById(CONFIG.STYLE_ID)) return;
        
        const style = document.createElement('style');
        style.id = CONFIG.STYLE_ID;
        style.textContent = `
            /* 状态指示器 */
            .safe-mode-indicator {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
                color: white;
                padding: 10px 18px;
                border-radius: 20px;
                font-size: 13px;
                font-weight: 600;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(82, 196, 26, 0.25);
                display: flex;
                align-items: center;
                gap: 8px;
                cursor: pointer;
                user-select: none;
                transition: all 0.2s ease;
                border: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            .safe-mode-indicator:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(82, 196, 26, 0.35);
            }
            
            .safe-mode-indicator:active {
                transform: translateY(0);
            }
            
            .safe-mode-indicator.disabled {
                background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
                box-shadow: 0 4px 12px rgba(255, 77, 79, 0.25);
            }
            
            .safe-mode-indicator.disabled:hover {
                box-shadow: 0 6px 16px rgba(255, 77, 79, 0.35);
            }
            
            /* 操作提示 */
            .safe-mode-notice {
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%);
                color: white;
                padding: 14px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                z-index: 10000;
                box-shadow: 0 6px 16px rgba(24, 144, 255, 0.25);
                animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                max-width: 320px;
                line-height: 1.5;
                border: none;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-20px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            /* 占位符悬停效果 */
            .safe-mode-img-placeholder:hover,
            .safe-mode-video-placeholder:hover,
            .safe-mode-iframe-placeholder:hover,
            .safe-mode-canvas-placeholder:hover {
                opacity: 0.95;
                transition: opacity 0.2s ease;
            }
            
            /* 页面整体优化 */
            body.safe-mode-active {
                scroll-behavior: smooth;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    function addIndicator(active) {
        // 移除旧的
        const old = document.getElementById(CONFIG.INDICATOR_ID);
        if (old) old.remove();
        
        const indicator = document.createElement('button');
        indicator.id = CONFIG.INDICATOR_ID;
        indicator.className = active ? 'safe-mode-indicator' : 'safe-mode-indicator disabled';
        indicator.innerHTML = active ? 
            '<span style="font-size: 16px;">🔒</span> 安全模式已开启' : 
            '<span style="font-size: 16px;">🔓</span> 安全模式已关闭';
        indicator.title = active ? 
            '点击关闭安全模式（刷新页面恢复原始内容）' : 
            '点击开启安全模式（屏蔽图片视频）';
        
        indicator.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            if (active) {
                if (confirm('确定要关闭安全专注模式吗？\n\n⚠️ 注意：关闭后需要手动刷新页面（按F5）才能恢复原始内容。\n\n是否继续关闭？')) {
                    disableSafeMode();
                    showNotice('安全模式已关闭\n\n请手动刷新页面（按F5）恢复原始内容', 5000);
                }
            } else {
                enableSafeMode();
                showNotice('安全专注模式已开启\n\n✅ 所有图片、视频、动图已屏蔽\n✅ 专注文字阅读模式', 4000);
            }
        });
        
        document.body.appendChild(indicator);
    }
    
    function showNotice(message, duration = 4000) {
        // 移除旧的
        const old = document.getElementById(CONFIG.NOTICE_ID);
        if (old) old.remove();
        
        const notice = document.createElement('div');
        notice.id = CONFIG.NOTICE_ID;
        notice.className = 'safe-mode-notice';
        notice.textContent = message;
        
        document.body.appendChild(notice);
        
        // 自动消失
        setTimeout(() => {
            notice.style.opacity = '0';
            notice.style.transform = 'translateY(-10px) scale(0.95)';
            setTimeout(() => {
                if (notice.parentNode) {
                    notice.parentNode.removeChild(notice);
                }
            }, 300);
        }, duration);
    }
    
    // ================ 主功能 ================
    
    function enableSafeMode() {
        if (isActive) return true;
        
        console.log('🔄 开启安全专注模式...');
        isActive = true;
        
        // 保存状态记录
        saveState(true);
        
        // 添加样式
        addGlobalStyles();
        
        // 执行屏蔽
        hideImages();
        hideVideos();
        hideIframes();
        hideBackgrounds();
        hideCanvas();
        
        // 添加指示器
        addIndicator(true);
        
        // 设置动态监听
        setupMutationObserver();
        
        // 添加body标记
        document.body.classList.add('safe-mode-active');
        
        console.log('✅ 安全模式开启完成');
        return true;
    }
    
    function disableSafeMode() {
        if (!isActive) return true;
        
        console.log('🔄 关闭安全专注模式...');
        isActive = false;
        
        // 保存状态记录
        saveState(false);
        
        // 更新指示器
        addIndicator(false);
        
        // 移除body标记
        document.body.classList.remove('safe-mode-active');
        
        console.log('✅ 安全模式关闭完成');
        return true;
    }
    
    function setupMutationObserver() {
        if (window.safeModeObserver) {
            window.safeModeObserver.disconnect();
        }
        
        window.safeModeObserver = new MutationObserver(function(mutations) {
            let needsUpdate = false;
            
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    needsUpdate = true;
                    break;
                }
            }
            
            if (needsUpdate && isActive) {
                setTimeout(() => {
                    hideImages();
                    hideVideos();
                    hideIframes();
                    hideCanvas();
                }, 150);
            }
        });
        
        window.safeModeObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // ================ 初始化检查 ================
    
    function checkAndShowStatus() {
        const wasActive = getLastState();
        
        if (wasActive) {
            // 显示恢复提示
            showNotice('⏸️ 安全模式已暂停\n\n上一页面曾开启安全模式\n点击右下角按钮重新开启\n或执行妙招恢复专注模式', 5000);
            
            // 添加关闭状态的指示器
            addIndicator(false);
        } else {
            // 显示欢迎提示
            showNotice('👋 欢迎使用安全专注模式\n\n点击右下角按钮开启\n或执行妙招屏蔽干扰内容', 4000);
            
            // 添加关闭状态的指示器
            addIndicator(false);
        }
    }
    
    // ================ 初始化 ================
    
    function initialize() {
        if (hasInitialized) return;
        hasInitialized = true;
        
        console.log('🔧 初始化安全模式系统...');
        
        // 添加基础样式
        addGlobalStyles();
        
        // 检查并显示状态
        checkAndShowStatus();
        
        // 导出API
        window.tabbitSafeMode = {
            enable: enableSafeMode,
            disable: disableSafeMode,
            isActive: () => isActive
        };
        
        console.log('✅ 安全模式系统初始化完成');
    }
    
    // 延迟初始化，确保DOM可用
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initialize, 100);
        });
    } else {
        setTimeout(initialize, 100);
    }
    
    // ================ 妙招执行入口 ================
    
    function executeSkill() {
        console.log('🎯 执行安全模式妙招...');
        
        // 确保已初始化
        if (!hasInitialized) {
            initialize();
        }
        
        if (isActive) {
            // 当前已开启，询问是否关闭
            const result = disableSafeMode();
            if (result) {
                return '🔓 安全专注模式已关闭\n\n⚠️ 请手动刷新页面（按F5）恢复原始内容\n\n下次需要时请重新执行此妙招';
            }
        } else {
            // 当前未开启，开启它
            const result = enableSafeMode();
            if (result) {
                return '🔒 安全专注模式已开启\n\n✅ 已屏蔽所有图片、视频、动图\n✅ 专注文字阅读模式生效\n✅ 动态内容自动处理\n\n💡 提示：\n• 右下角可随时切换状态\n• 刷新页面后需要重新执行\n• 跳转新页面需要重新执行';
            }
        }
        
        return '操作失败，请重试';
    }
    
    // 执行并返回结果
    try {
        const result = executeSkill();
        console.log('📋 妙招执行结果:', result);
        
        // 显示结果提示
        showNotice(result.split('\n')[0], 5000);
        
        return result;
    } catch (error) {
        console.error('❌ 妙招执行错误:', error);
        showNotice('执行出错: ' + error.message, 4000);
        return '执行出错: ' + error.message;
    }
})();