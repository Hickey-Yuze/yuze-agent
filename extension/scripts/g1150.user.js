// 装置启动器 - 完整优化版
(function() {
    // 防止重复执行
    if (window.deviceLauncher) return;
    window.deviceLauncher = true;
    
    // 装置配置
    const DEVICES = [
        {
            id: 'website_launcher',
            name: '网页启动装置',
            description: '快速打开常用网站',
            detailedDesc: '点击打开B站、爱奇艺、百度、知乎、淘宝、京东等常用网站',
            icon: '🌐',
            color: '#4a6ee0',
            action: showWebsiteLauncher
        },
        {
            id: 'video_speed',
            name: '视频播放速度控制器',
            description: '控制视频播放速度',
            detailedDesc: '在B站/爱奇艺显示速度控制器，可以调节速度（0.01-16倍）',
            icon: '🎬',
            color: '#ff6b6b',
            action: showVideoSpeedSettings
        },
        {
            id: 'bilibili_helper',
            name: 'B站辅助器',
            description: 'B站免登录解锁功能',
            detailedDesc: '解除B站画质限制、评论限制和登录弹窗，无需登录即可使用完整功能',
            icon: '🔓',
            color: '#FB7299',
            action: showBilibiliHelper
        },
        {
            id: 'help',
            name: '使用帮助',
            description: '查看装置使用说明',
            detailedDesc: '查看详细的使用说明和功能介绍',
            icon: '❓',
            color: '#00b894',
            action: showHelp
        }
    ];
    
    // 网站配置
    const WEBSITES = [
        { name: 'B站', url: 'https://www.bilibili.com', icon: '📺', color: '#FB7299' },
        { name: '爱奇艺', url: 'https://www.iqiyi.com', icon: '🎬', color: '#00A1D6' },
        { name: '百度', url: 'https://www.baidu.com', icon: '🔍', color: '#2932E1' },
        { name: '知乎', url: 'https://www.zhihu.com', icon: '💭', color: '#0084FF' },
        { name: '淘宝', url: 'https://www.taobao.com', icon: '🛍️', color: '#FF4400' },
        { name: '京东', url: 'https://www.jd.com', icon: '📦', color: '#E33333' }
    ];
    
    // 全局状态
    let isLauncherVisible = false;
    let currentLauncher = null;
    let speedControllerVisible = false;
    let currentSpeedController = null;
    let speedControllerMinimized = false;
    let speedControllerBall = null;
    let lastAppliedSpeed = 1.0;
    let currentSpeed = 1.0;
    let isSpeedApplied = false;
    let autoApplySpeed = true;
    
    // === 主启动器界面 ===
    function createMainLauncher() {
        // 移除已存在的启动器
        const existing = document.getElementById('device-launcher');
        if (existing) existing.remove();
        
        const launcher = document.createElement('div');
        launcher.id = 'device-launcher';
        launcher.innerHTML = `
            <div class="launcher-overlay"></div>
            <div class="launcher-container">
                <div class="launcher-header">
                    <div class="header-title">
                        <span class="launcher-icon">🚀</span>
                        <span class="launcher-name">装置启动器 v2.0</span>
                        <button class="back-btn" title="返回">↩️</button>
                    </div>
                    <button class="close-btn" title="关闭">×</button>
                </div>
                <div class="launcher-body">
                    <div class="devices-grid"></div>
                </div>
                <div class="launcher-footer">
                    <div class="footer-hint">按 / 键打开 | ESC 键关闭 | ↩️ 返回上一页</div>
                </div>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #device-launcher {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 999998;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .launcher-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(4px);
                animation: fadeIn 0.2s ease;
            }
            
            .launcher-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 700px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            
            .launcher-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .header-title {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .launcher-icon {
                font-size: 24px;
            }
            
            .launcher-name {
                font-size: 20px;
                font-weight: 600;
            }
            
            .back-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                margin-left: 10px;
            }
            
            .back-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .close-btn {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .launcher-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .devices-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 20px;
            }
            
            .device-item {
                padding: 24px;
                border-radius: 12px;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                text-align: left;
                position: relative;
            }
            
            .device-item:hover {
                transform: translateY(-2px);
                border-color: #667eea;
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.15);
            }
            
            .device-header {
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 12px;
                width: 100%;
            }
            
            .device-icon {
                font-size: 28px;
                width: 56px;
                height: 56px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                flex-shrink: 0;
            }
            
            .device-title {
                flex: 1;
            }
            
            .device-name {
                font-size: 18px;
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            
            .device-desc {
                font-size: 14px;
                color: #666;
                line-height: 1.4;
            }
            
            .device-details {
                font-size: 13px;
                color: #888;
                line-height: 1.5;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid #eee;
                width: 100%;
            }
            
            .launcher-footer {
                padding: 14px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                text-align: center;
            }
            
            .footer-hint {
                font-size: 12px;
                color: #666;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translate(-50%, -40%);
                }
                to {
                    opacity: 1;
                    transform: translate(-50%, -50%);
                }
            }
            
            .hidden {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(launcher);
        
        return launcher;
    }
    
    function generateDeviceItems() {
        const grid = document.querySelector('.devices-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        DEVICES.forEach(device => {
            const item = document.createElement('div');
            item.className = 'device-item';
            item.innerHTML = `
                <div class="device-header">
                    <div class="device-icon" style="background: ${device.color}">
                        ${device.icon}
                    </div>
                    <div class="device-title">
                        <div class="device-name">${device.name}</div>
                        <div class="device-desc">${device.description}</div>
                    </div>
                </div>
                <div class="device-details">${device.detailedDesc}</div>
            `;
            
            item.addEventListener('click', () => {
                device.action();
                hideLauncher();
            });
            
            grid.appendChild(item);
        });
    }
    
    // === 网页启动装置 ===
    function showWebsiteLauncher() {
        const overlay = document.createElement('div');
        overlay.className = 'website-launcher-overlay';
        
        overlay.innerHTML = `
            <div class="website-launcher-container">
                <div class="website-header">
                    <div class="website-title-container">
                        <button class="back-btn" title="返回装置列表">↩️</button>
                        <span class="website-title">🌐 网页启动装置</span>
                    </div>
                    <button class="website-close">×</button>
                </div>
                <div class="website-body">
                    <div class="websites-grid"></div>
                </div>
                <div class="website-footer">
                    <div class="website-hint">点击网站图标在新标签页打开</div>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .website-launcher-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            
            .website-launcher-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 800px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            
            .website-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #4a6ee0 0%, #6c5ce7 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .website-title-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .website-title {
                font-size: 18px;
                font-weight: 600;
            }
            
            .website-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .website-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .website-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .websites-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
                gap: 20px;
            }
            
            .website-item {
                padding: 20px;
                border-radius: 12px;
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
            }
            
            .website-item:hover {
                transform: translateY(-2px);
                border-color: #4a6ee0;
                box-shadow: 0 8px 20px rgba(74, 110, 224, 0.15);
            }
            
            .website-item-icon {
                font-size: 28px;
                margin-bottom: 12px;
                width: 56px;
                height: 56px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
            }
            
            .website-item-name {
                font-size: 16px;
                font-weight: 600;
                color: #333;
                margin-bottom: 6px;
            }
            
            .website-item-url {
                font-size: 12px;
                color: #666;
                font-family: monospace;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
            }
            
            .website-footer {
                padding: 14px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
                text-align: center;
            }
            
            .website-hint {
                font-size: 12px;
                color: #666;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        const grid = overlay.querySelector('.websites-grid');
        WEBSITES.forEach(site => {
            const item = document.createElement('div');
            item.className = 'website-item';
            item.innerHTML = `
                <div class="website-item-icon" style="background: ${site.color}">
                    ${site.icon}
                </div>
                <div class="website-item-name">${site.name}</div>
                <div class="website-item-url">${site.url}</div>
            `;
            
            item.addEventListener('click', () => {
                window.open(site.url, '_blank');
                showMessage(`✅ 已打开 ${site.name}`);
                overlay.remove();
                style.remove();
            });
            
            grid.appendChild(item);
        });
        
        overlay.querySelector('.back-btn').addEventListener('click', () => {
            overlay.remove();
            style.remove();
            showLauncher();
        });
        
        overlay.querySelector('.website-close').addEventListener('click', () => {
            overlay.remove();
            style.remove();
        });
        
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                style.remove();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
            }
        });
    }
    
    // === 视频速度控制器设置界面 ===
    function showVideoSpeedSettings() {
        const settings = loadSpeedSettings();
        
        const overlay = document.createElement('div');
        overlay.className = 'speed-settings-overlay';
        
        overlay.innerHTML = `
            <div class="speed-settings-container">
                <div class="speed-header">
                    <div class="speed-title-container">
                        <button class="back-btn" title="返回装置列表">↩️</button>
                        <span class="speed-title">🎬 视频播放速度控制器设置</span>
                    </div>
                    <button class="speed-close">×</button>
                </div>
                <div class="speed-body">
                    <div class="speed-description">
                        <strong>✨ 优化说明：</strong><br>
                        1. 在指定网站调节速度时<strong>自动应用</strong>，无需点击"应用"按钮<br>
                        2. 设置自动保存，跨网站同步生效<br>
                        3. 支持所有原功能
                    </div>
                    
                    <div class="site-selection">
                        <div class="section-title">选择要显示控制器的网站</div>
                        <div class="site-options">
                            <label class="site-option">
                                <input type="checkbox" class="site-checkbox" id="bilibili-enable" ${settings.bilibili.enabled ? 'checked' : ''}>
                                <span class="site-icon" style="background: #FB7299">📺</span>
                                <span class="site-name">B站</span>
                            </label>
                            <label class="site-option">
                                <input type="checkbox" class="site-checkbox" id="iqiyi-enable" ${settings.iqiyi.enabled ? 'checked' : ''}>
                                <span class="site-icon" style="background: #00A1D6">🎬</span>
                                <span class="site-name">爱奇艺</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="speed-info">
                        <div class="info-item">
                            <span class="info-label">当前速度：</span>
                            <span class="info-value"><span class="current-speed-display">x${currentSpeed.toFixed(2)}</span></span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">状态：</span>
                            <span class="info-value status-value">${isSpeedApplied ? '已应用' : '未应用'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">自动应用：</span>
                            <span class="info-value auto-apply-value">${autoApplySpeed ? '已开启' : '已关闭'}</span>
                        </div>
                    </div>
                    
                    <div class="auto-apply-section">
                        <div class="section-title">自动应用设置</div>
                        <label class="auto-apply-toggle">
                            <input type="checkbox" id="auto-apply-toggle" ${autoApplySpeed ? 'checked' : ''}>
                            <span class="toggle-slider"></span>
                            <span class="toggle-label">在指定网站自动应用速度调节</span>
                        </label>
                        <div class="auto-apply-note">
                            💡 开启后：在B站/爱奇艺调节速度时自动生效，无需点击"应用"按钮
                        </div>
                    </div>
                    
                    <div class="speed-actions">
                        <button class="apply-btn" id="apply-speed-btn" ${isSpeedApplied ? 'disabled' : ''}>
                            ${isSpeedApplied ? '已应用' : '立即应用'}
                        </button>
                        <button class="cancel-btn" id="cancel-speed-btn" ${!isSpeedApplied ? 'disabled' : ''}>
                            ${isSpeedApplied ? '取消应用' : '未应用'}
                        </button>
                    </div>
                    
                    <div class="speed-note">
                        💡 <strong>使用说明：</strong><br>
                        1. 在B站/爱奇艺页面右下角显示速度控制器<br>
                        2. 调节速度滑块时自动生效（如开启自动应用）<br>
                        3. 控制器可最小化为小球，点击重新显示<br>
                        4. 所有设置自动保存，跨网站同步
                    </div>
                </div>
                <div class="speed-footer">
                    <div class="speed-hint">设置自动保存并同步，访问网站时自动显示控制器</div>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .speed-settings-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            
            .speed-settings-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            
            .speed-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .speed-title-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .speed-title {
                font-size: 18px;
                font-weight: 600;
            }
            
            .speed-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .speed-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .speed-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .speed-description {
                background: #e8f5e9;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 13px;
                color: #333;
                border-left: 4px solid #4CAF50;
            }
            
            .speed-description strong {
                color: #ff6b6b;
            }
            
            .section-title {
                font-size: 15px;
                font-weight: 600;
                color: #333;
                margin-bottom: 12px;
            }
            
            .site-selection {
                margin-bottom: 24px;
            }
            
            .site-options {
                display: flex;
                gap: 16px;
            }
            
            .site-option {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 12px 16px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
                flex: 1;
            }
            
            .site-option:hover {
                border-color: #ff6b6b;
                background: #fff5f5;
            }
            
            .site-option input:checked + .site-icon {
                border: 2px solid #ff6b6b;
            }
            
            .site-icon {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                color: white;
            }
            
            .site-name {
                font-weight: 500;
                color: #333;
                font-size: 15px;
            }
            
            .speed-info {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .info-item:last-child {
                margin-bottom: 0;
            }
            
            .info-label {
                font-size: 14px;
                color: #333;
            }
            
            .info-value {
                font-size: 14px;
                color: #666;
            }
            
            .current-speed-display {
                font-weight: 600;
                color: #ff6b6b;
                font-size: 16px;
            }
            
            .auto-apply-value {
                font-weight: 600;
                color: ${autoApplySpeed ? '#4CAF50' : '#ff6b6b'};
            }
            
            .status-value {
                font-weight: 600;
                color: ${isSpeedApplied ? '#4CAF50' : '#ff6b6b'};
            }
            
            .auto-apply-section {
                margin-bottom: 20px;
            }
            
            .auto-apply-toggle {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 10px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .auto-apply-toggle:hover {
                background: #f0f0f0;
            }
            
            .auto-apply-toggle input {
                display: none;
            }
            
            .toggle-slider {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 26px;
                background-color: #ccc;
                border-radius: 34px;
                transition: .4s;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            .auto-apply-toggle input:checked + .toggle-slider {
                background-color: #4CAF50;
            }
            
            .auto-apply-toggle input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }
            
            .toggle-label {
                font-size: 14px;
                font-weight: 500;
                color: #333;
            }
            
            .auto-apply-note {
                font-size: 12px;
                color: #666;
                margin-top: 8px;
                padding-left: 62px;
            }
            
            .speed-actions {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .apply-btn {
                flex: 1;
                padding: 14px;
                background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: transform 0.2s;
            }
            
            .apply-btn:hover:not(:disabled) {
                transform: translateY(-1px);
            }
            
            .apply-btn:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .cancel-btn {
                flex: 1;
                padding: 14px;
                background: white;
                color: #666;
                border: 2px solid #ddd;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .cancel-btn:hover:not(:disabled) {
                border-color: #ff6b6b;
                color: #ff6b6b;
            }
            
            .cancel-btn:disabled {
                border-color: #cccccc;
                color: #cccccc;
                cursor: not-allowed;
            }
            
            .speed-note {
                background: #f0f7ff;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 13px;
                color: #666;
                border-left: 4px solid #4a6ee0;
            }
            
            .speed-note strong {
                color: #333;
            }
            
            .speed-footer {
                padding: 16px 24px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
            }
            
            .speed-hint {
                font-size: 12px;
                color: #666;
                text-align: center;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        const applyBtn = overlay.querySelector('#apply-speed-btn');
        const cancelBtn = overlay.querySelector('#cancel-speed-btn');
        const currentSpeedDisplay = overlay.querySelector('.current-speed-display');
        const statusValue = overlay.querySelector('.status-value');
        const autoApplyValue = overlay.querySelector('.auto-apply-value');
        const bilibiliCheckbox = overlay.querySelector('#bilibili-enable');
        const iqiyiCheckbox = overlay.querySelector('#iqiyi-enable');
        const autoApplyToggle = overlay.querySelector('#auto-apply-toggle');
        
        function updateDisplay() {
            currentSpeedDisplay.textContent = `x${currentSpeed.toFixed(2)}`;
            autoApplyValue.textContent = autoApplySpeed ? '已开启' : '已关闭';
            autoApplyValue.style.color = autoApplySpeed ? '#4CAF50' : '#ff6b6b';
            
            if (isSpeedApplied) {
                statusValue.textContent = '已应用';
                statusValue.style.color = '#4CAF50';
                applyBtn.disabled = true;
                applyBtn.textContent = '已应用';
                cancelBtn.disabled = false;
                cancelBtn.textContent = '取消应用';
            } else {
                statusValue.textContent = '未应用';
                statusValue.style.color = '#ff6b6b';
                applyBtn.disabled = false;
                applyBtn.textContent = '立即应用';
                cancelBtn.disabled = true;
                cancelBtn.textContent = '未应用';
            }
        }
        
        function applySpeed() {
            if (!isSpeedApplied) {
                isSpeedApplied = true;
                lastAppliedSpeed = currentSpeed;
                applyVideoSpeed(currentSpeed);
                updateDisplay();
                showMessage(`✅ 已应用速度 x${currentSpeed.toFixed(2)}`);
                saveSpeedSettings();
            }
        }
        
        function cancelSpeed() {
            if (isSpeedApplied) {
                isSpeedApplied = false;
                applyVideoSpeed(1.0);
                statusValue.textContent = '已取消';
                statusValue.style.color = '#ff6b6b';
                applyBtn.disabled = false;
                applyBtn.textContent = '立即应用';
                cancelBtn.disabled = true;
                cancelBtn.textContent = '已取消';
                showMessage('🔄 已取消速度应用，恢复默认速度');
                saveSpeedSettings();
            }
        }
        
        function saveSettings() {
            const bilibiliEnabled = bilibiliCheckbox.checked;
            const iqiyiEnabled = iqiyiCheckbox.checked;
            autoApplySpeed = autoApplyToggle.checked;
            
            const settings = {
                bilibili: { enabled: bilibiliEnabled },
                iqiyi: { enabled: iqiyiEnabled },
                currentSpeed: currentSpeed,
                isApplied: isSpeedApplied,
                lastAppliedSpeed: lastAppliedSpeed,
                autoApply: autoApplySpeed,
                timestamp: Date.now()
            };
            
            localStorage.setItem('video_speed_controller_settings', JSON.stringify(settings));
            showMessage('✅ 视频速度控制器设置已保存并同步');
            checkAndShowSpeedController();
        }
        
        applyBtn.addEventListener('click', applySpeed);
        cancelBtn.addEventListener('click', cancelSpeed);
        
        autoApplyToggle.addEventListener('change', () => {
            autoApplySpeed = autoApplyToggle.checked;
            autoApplyValue.textContent = autoApplySpeed ? '已开启' : '已关闭';
            autoApplyValue.style.color = autoApplySpeed ? '#4CAF50' : '#ff6b6b';
            showMessage(`✅ 自动应用${autoApplySpeed ? '已开启' : '已关闭'}`);
        });
        
        overlay.querySelector('.back-btn').addEventListener('click', () => {
            saveSettings();
            overlay.remove();
            style.remove();
            showLauncher();
        });
        
        overlay.querySelector('.speed-close').addEventListener('click', () => {
            saveSettings();
            overlay.remove();
            style.remove();
        });
        
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                saveSettings();
                overlay.remove();
                style.remove();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                saveSettings();
                overlay.remove();
                style.remove();
            }
        });
        
        updateDisplay();
    }
    
    // === 视频速度控制器（在B站/爱奇艺页面显示）===
    function createSpeedController() {
        if (currentSpeedController) {
            currentSpeedController.remove();
        }
        
        if (speedControllerBall) {
            speedControllerBall.remove();
            speedControllerBall = null;
        }
        
        const controller = document.createElement('div');
        controller.id = 'video-speed-controller';
        controller.innerHTML = `
            <div class="controller-header">
                <span class="controller-title">🎬 视频速度控制</span>
                <button class="controller-minimize" title="最小化">➖</button>
                <button class="controller-close" title="关闭">×</button>
            </div>
            <div class="controller-body">
                <div class="speed-control-section">
                    <div class="speed-display">
                        <span class="speed-label">当前速度：</span>
                        <span class="speed-value">x${currentSpeed.toFixed(2)}</span>
                    </div>
                    
                    <div class="speed-slider-container">
                        <div class="speed-labels">
                            <span>0.01x</span>
                            <span>1x</span>
                            <span>16x</span>
                        </div>
                        <input type="range" class="speed-slider" min="1" max="1600" value="${Math.round(currentSpeed * 100)}" />
                        <div class="speed-slider-value">x${currentSpeed.toFixed(2)}</div>
                    </div>
                    
                    <div class="preset-buttons">
                        <button class="preset-btn ${Math.abs(currentSpeed - 0.5) < 0.01 ? 'active' : ''}" data-speed="0.5">0.5x</button>
                        <button class="preset-btn ${Math.abs(currentSpeed - 1.0) < 0.01 ? 'active' : ''}" data-speed="1.0">1.0x</button>
                        <button class="preset-btn ${Math.abs(currentSpeed - 1.5) < 0.01 ? 'active' : ''}" data-speed="1.5">1.5x</button>
                        <button class="preset-btn ${Math.abs(currentSpeed - 2.0) < 0.01 ? 'active' : ''}" data-speed="2.0">2.0x</button>
                        <button class="preset-btn ${Math.abs(currentSpeed - 4.0) < 0.01 ? 'active' : ''}" data-speed="4.0">4.0x</button>
                    </div>
                </div>
                
                <div class="auto-apply-indicator" style="background: ${autoApplySpeed ? '#e8f5e9' : '#fff8e1'}; border-left: 4px solid ${autoApplySpeed ? '#4CAF50' : '#ffc107'};">
                    <div class="indicator-icon" style="color: ${autoApplySpeed ? '#4CAF50' : '#ffc107'};">⚡</div>
                    <div class="indicator-text">自动应用已${autoApplySpeed ? '开启' : '关闭'}</div>
                </div>
                
                <div class="speed-actions">
                    <button class="apply-btn" id="controller-apply-btn" ${isSpeedApplied ? 'disabled' : ''}>
                        ${isSpeedApplied ? '已应用' : '应用速度'}
                    </button>
                    <button class="cancel-btn" id="controller-cancel-btn" ${!isSpeedApplied ? 'disabled' : ''}>
                        ${isSpeedApplied ? '取消应用' : '未应用'}
                    </button>
                </div>
                
                <div class="controller-note">
                    💡 控制器隐藏后会变成小球，点击小球可重新显示<br>
                    ${autoApplySpeed ? '⚡ 自动应用已开启：调节速度时自动生效' : '⚠️ 自动应用已关闭：需要点击"应用速度"按钮'}
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            #video-speed-controller {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
                width: 320px;
                z-index: 999997;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                border: 2px solid #ff6b6b;
                animation: slideInRight 0.3s ease;
            }
            
            .controller-header {
                padding: 16px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
                color: white;
                border-radius: 10px 10px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .controller-title {
                font-size: 16px;
                font-weight: 600;
                flex: 1;
            }
            
            .controller-minimize {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                font-size: 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
                margin-right: 8px;
            }
            
            .controller-minimize:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .controller-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .controller-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .controller-body {
                padding: 20px;
            }
            
            .speed-control-section {
                margin-bottom: 20px;
            }
            
            .speed-display {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .speed-label {
                font-size: 14px;
                color: #333;
            }
            
            .speed-value {
                font-size: 20px;
                font-weight: 600;
                color: #ff6b6b;
            }
            
            .speed-slider-container {
                margin-bottom: 15px;
            }
            
            .speed-labels {
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
                font-size: 12px;
                color: #666;
            }
            
            .speed-slider {
                width: 100%;
                height: 6px;
                -webkit-appearance: none;
                appearance: none;
                background: #e0e0e0;
                border-radius: 3px;
                outline: none;
                margin-bottom: 8px;
            }
            
            .speed-slider::-webkit-slider-thumb {
                -webkit-appearance: none;
                appearance: none;
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ff6b6b;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .speed-slider::-moz-range-thumb {
                width: 20px;
                height: 20px;
                border-radius: 50%;
                background: #ff6b6b;
                cursor: pointer;
                border: 2px solid white;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            
            .speed-slider-value {
                text-align: center;
                font-size: 14px;
                font-weight: 600;
                color: #ff6b6b;
                margin-top: 5px;
            }
            
            .preset-buttons {
                display: flex;
                gap: 8px;
                flex-wrap: wrap;
                margin-top: 15px;
            }
            
            .preset-btn {
                flex: 1;
                padding: 8px 12px;
                background: white;
                color: #666;
                border: 2px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
                min-width: 50px;
            }
            
            .preset-btn:hover {
                border-color: #ff6b6b;
                color: #ff6b6b;
                background: #fff5f5;
            }
            
            .preset-btn.active {
                background: #ff6b6b;
                color: white;
                border-color: #ff6b6b;
            }
            
            .auto-apply-indicator {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 10px 14px;
                border-radius: 8px;
                margin-bottom: 16px;
            }
            
            .indicator-icon {
                font-size: 18px;
            }
            
            .indicator-text {
                font-size: 13px;
                font-weight: 500;
                color: #333;
            }
            
            .speed-actions {
                display: flex;
                gap: 10px;
                margin-bottom: 16px;
            }
            
            .apply-btn {
                flex: 1;
                padding: 12px;
                background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: transform 0.2s;
            }
            
            .apply-btn:hover:not(:disabled) {
                transform: translateY(-1px);
            }
            
            .apply-btn:disabled {
                background: #cccccc;
                cursor: not-allowed;
                transform: none;
            }
            
            .cancel-btn {
                flex: 1;
                padding: 12px;
                background: white;
                color: #666;
                border: 2px solid #ddd;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .cancel-btn:hover:not(:disabled) {
                border-color: #ff6b6b;
                color: #ff6b6b;
            }
            
            .cancel-btn:disabled {
                border-color: #cccccc;
                color: #cccccc;
                cursor: not-allowed;
            }
            
            .controller-note {
                background: #f0f7ff;
                padding: 10px 14px;
                border-radius: 8px;
                font-size: 12px;
                color: #666;
                border-left: 4px solid #4a6ee0;
            }
            
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            /* 小球样式 */
            .speed-controller-ball {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 50px;
                height: 50px;
                background: linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%);
                border-radius: 50%;
                box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
                z-index: 999997;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                color: white;
                animation: ballBounce 0.5s ease;
                transition: transform 0.3s;
            }
            
            .speed-controller-ball:hover {
                transform: scale(1.1);
            }
            
            @keyframes ballBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(controller);
        
        const speedSlider = controller.querySelector('.speed-slider');
        const speedSliderValue = controller.querySelector('.speed-slider-value');
        const speedValue = controller.querySelector('.speed-value');
        const applyBtn = controller.querySelector('#controller-apply-btn');
        const cancelBtn = controller.querySelector('#controller-cancel-btn');
        const minimizeBtn = controller.querySelector('.controller-minimize');
        const closeBtn = controller.querySelector('.controller-close');
        const presetBtns = controller.querySelectorAll('.preset-btn');
        
        function updateControllerDisplay() {
            const sliderValue = parseInt(speedSlider.value) / 100;
            speedSliderValue.textContent = `x${sliderValue.toFixed(2)}`;
            speedValue.textContent = `x${sliderValue.toFixed(2)}`;
            
            if (isSpeedApplied) {
                applyBtn.disabled = true;
                applyBtn.textContent = '已应用';
                cancelBtn.disabled = false;
                cancelBtn.textContent = '取消应用';
            } else {
                applyBtn.disabled = false;
                applyBtn.textContent = '应用速度';
                cancelBtn.disabled = true;
                cancelBtn.textContent = '未应用';
            }
            
            presetBtns.forEach(btn => {
                const btnSpeed = parseFloat(btn.dataset.speed);
                btn.classList.toggle('active', Math.abs(btnSpeed - sliderValue) < 0.01);
            });
        }
        
        function applyControllerSpeed() {
            if (!isSpeedApplied) {
                isSpeedApplied = true;
                currentSpeed = parseFloat(speedSliderValue.textContent.replace('x', ''));
                lastAppliedSpeed = currentSpeed;
                applyVideoSpeed(currentSpeed);
                updateControllerDisplay();
                showMessage(`✅ 已应用速度 x${currentSpeed.toFixed(2)}`);
                saveSpeedSettings();
            }
        }
        
        function cancelControllerSpeed() {
            if (isSpeedApplied) {
                isSpeedApplied = false;
                applyVideoSpeed(1.0);
                updateControllerDisplay();
                showMessage('🔄 已取消速度应用，恢复默认速度');
                saveSpeedSettings();
            }
        }
        
        function minimizeController() {
            controller.style.display = 'none';
            speedControllerVisible = false;
            speedControllerMinimized = true;
            
            speedControllerBall = document.createElement('div');
            speedControllerBall.className = 'speed-controller-ball';
            speedControllerBall.innerHTML = '🎬';
            speedControllerBall.title = '点击显示速度控制器';
            
            document.body.appendChild(speedControllerBall);
            
            speedControllerBall.addEventListener('click', () => {
                speedControllerBall.remove();
                speedControllerBall = null;
                speedControllerMinimized = false;
                controller.style.display = 'block';
                speedControllerVisible = true;
            });
        }
        
        function closeController() {
            controller.style.display = 'none';
            speedControllerVisible = false;
            
            if (speedControllerBall) {
                speedControllerBall.remove();
                speedControllerBall = null;
            }
        }
        
        speedSlider.addEventListener('input', () => {
            const sliderValue = parseInt(speedSlider.value) / 100;
            speedSliderValue.textContent = `x${sliderValue.toFixed(2)}`;
            speedValue.textContent = `x${sliderValue.toFixed(2)}`;
            currentSpeed = sliderValue;
            
            presetBtns.forEach(btn => {
                const btnSpeed = parseFloat(btn.dataset.speed);
                btn.classList.toggle('active', Math.abs(btnSpeed - sliderValue) < 0.01);
            });
            
            // 自动应用速度（如果开启）
            if (autoApplySpeed) {
                applyVideoSpeed(currentSpeed);
                isSpeedApplied = true;
                updateControllerDisplay();
                saveSpeedSettings();
            }
        });
        
        presetBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const speed = parseFloat(btn.dataset.speed);
                const sliderValue = Math.round(speed * 100);
                speedSlider.value = sliderValue;
                speedSlider.dispatchEvent(new Event('input'));
                
                // 自动应用速度（如果开启）
                if (autoApplySpeed) {
                    applyVideoSpeed(speed);
                    isSpeedApplied = true;
                    updateControllerDisplay();
                    saveSpeedSettings();
                }
            });
        });
        
        applyBtn.addEventListener('click', applyControllerSpeed);
        cancelBtn.addEventListener('click', cancelControllerSpeed);
        minimizeBtn.addEventListener('click', minimizeController);
        closeBtn.addEventListener('click', closeController);
        
        document.addEventListener('keydown', function closeOnEsc(e) {
            if (e.key === 'Escape' && speedControllerVisible) {
                closeController();
                document.removeEventListener('keydown', closeOnEsc);
            }
        });
        
        currentSpeedController = controller;
        speedControllerVisible = true;
        updateControllerDisplay();
    }
    
    // === B站辅助器（增强版）===
    function showBilibiliHelper() {
        const settings = loadBilibiliHelperSettings();
        
        const overlay = document.createElement('div');
        overlay.className = 'bilibili-helper-overlay';
        
        overlay.innerHTML = `
            <div class="bilibili-helper-container">
                <div class="bilibili-header">
                    <div class="bilibili-title-container">
                        <button class="back-btn" title="返回装置列表">↩️</button>
                        <span class="bilibili-title">🔓 B站辅助器（增强版）</span>
                    </div>
                    <button class="bilibili-close">×</button>
                </div>
                <div class="bilibili-body">
                    <div class="bilibili-description">
                        <strong>✨ 增强功能：</strong><br>
                        1. 优化选择器，提高功能稳定性<br>
                        2. 增加实时监控，确保功能生效<br>
                        3. 修复已知问题，提升使用体验
                    </div>
                    
                    <div class="feature-list">
                        <div class="feature-item">
                            <div class="feature-icon">🎬</div>
                            <div class="feature-content">
                                <div class="feature-title">解除画质限制</div>
                                <div class="feature-desc">自动选择最高可用画质（4K/1080P/720P）</div>
                            </div>
                            <label class="feature-toggle">
                                <input type="checkbox" id="unlock-quality" ${settings.unlockQuality ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="feature-item">
                            <div class="feature-icon">💬</div>
                            <div class="feature-content">
                                <div class="feature-title">解除评论限制</div>
                                <div class="feature-desc">移除登录提示，完整显示评论</div>
                            </div>
                            <label class="feature-toggle">
                                <input type="checkbox" id="unlock-comments" ${settings.unlockComments ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="feature-item">
                            <div class="feature-icon">🚫</div>
                            <div class="feature-content">
                                <div class="feature-title">移除登录弹窗</div>
                                <div class="feature-desc">阻止登录弹窗出现，无干扰观看</div>
                            </div>
                            <label class="feature-toggle">
                                <input type="checkbox" id="remove-popups" ${settings.removePopups ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        
                        <div class="feature-item">
                            <div class="feature-icon">🔍</div>
                            <div class="feature-content">
                                <div class="feature-title">实时监控</div>
                                <div class="feature-desc">持续监控页面变化，确保功能生效</div>
                            </div>
                            <label class="feature-toggle">
                                <input type="checkbox" id="real-time-monitor" ${settings.realTimeMonitor ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="bilibili-status">
                        <div class="status-item">
                            <span class="status-label">当前状态：</span>
                            <span class="status-value ${settings.enabled ? 'enabled' : 'disabled'}">${settings.enabled ? '已启用' : '已禁用'}</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">最后更新：</span>
                            <span class="status-time">${new Date(settings.timestamp || Date.now()).toLocaleString()}</span>
                        </div>
                    </div>
                    
                    <div class="bilibili-actions">
                        <button class="enable-btn" id="enable-bilibili-helper">
                            ${settings.enabled ? '更新设置' : '启用B站辅助器'}
                        </button>
                        <button class="disable-btn" id="disable-bilibili-helper" ${!settings.enabled ? 'disabled' : ''}>
                            禁用B站辅助器
                        </button>
                    </div>
                    
                    <div class="bilibili-note">
                        💡 <strong>使用说明：</strong><br>
                        1. 启用后访问B站时自动生效<br>
                        2. 增强版提高功能稳定性<br>
                        3. 设置自动保存并同步<br>
                        4. 如遇问题可尝试禁用后重新启用
                    </div>
                </div>
                <div class="bilibili-footer">
                    <div class="bilibili-hint">增强版脚本，更稳定可靠</div>
                </div>
            </div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .bilibili-helper-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.2s ease;
            }
            
            .bilibili-helper-container {
                background: white;
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                width: 500px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
                animation: slideUp 0.3s ease;
            }
            
            .bilibili-header {
                padding: 20px 24px;
                background: linear-gradient(135deg, #FB7299 0%, #ff4d7a 100%);
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .bilibili-title-container {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .bilibili-title {
                font-size: 18px;
                font-weight: 600;
            }
            
            .bilibili-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                font-size: 20px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            
            .bilibili-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .bilibili-body {
                padding: 24px;
                max-height: 60vh;
                overflow-y: auto;
            }
            
            .bilibili-description {
                background: #fff0f5;
                padding: 12px 16px;
                border-radius: 8px;
                margin-bottom: 20px;
                font-size: 13px;
                color: #333;
                border-left: 4px solid #FB7299;
            }
            
            .feature-list {
                margin-bottom: 24px;
            }
            
            .feature-item {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 16px;
                border: 2px solid #f0f0f0;
                border-radius: 10px;
                margin-bottom: 12px;
                transition: all 0.2s;
            }
            
            .feature-item:hover {
                border-color: #FB7299;
                background: #fff5f7;
            }
            
            .feature-item:last-child {
                margin-bottom: 0;
            }
            
            .feature-icon {
                font-size: 24px;
                width: 48px;
                height: 48px;
                border-radius: 10px;
                background: #fff0f5;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FB7299;
                flex-shrink: 0;
            }
            
            .feature-content {
                flex: 1;
            }
            
            .feature-title {
                font-size: 15px;
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            
            .feature-desc {
                font-size: 13px;
                color: #666;
                line-height: 1.4;
            }
            
            .feature-toggle {
                position: relative;
                display: inline-block;
                width: 50px;
                height: 26px;
                flex-shrink: 0;
            }
            
            .feature-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
            }
            
            .toggle-slider {
                position: absolute;
                cursor: pointer;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: #ccc;
                transition: .4s;
                border-radius: 34px;
            }
            
            .toggle-slider:before {
                position: absolute;
                content: "";
                height: 18px;
                width: 18px;
                left: 4px;
                bottom: 4px;
                background-color: white;
                transition: .4s;
                border-radius: 50%;
            }
            
            input:checked + .toggle-slider {
                background-color: #FB7299;
            }
            
            input:checked + .toggle-slider:before {
                transform: translateX(24px);
            }
            
            .bilibili-status {
                background: #f8f9fa;
                padding: 16px;
                border-radius: 8px;
                margin-bottom: 20px;
            }
            
            .status-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
            }
            
            .status-item:last-child {
                margin-bottom: 0;
            }
            
            .status-label {
                font-size: 14px;
                color: #333;
            }
            
            .status-value {
                font-size: 14px;
                font-weight: 600;
            }
            
            .status-value.enabled {
                color: #4CAF50;
            }
            
            .status-value.disabled {
                color: #ff6b6b;
            }
            
            .status-time {
                font-size: 14px;
                color: #666;
            }
            
            .bilibili-actions {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .enable-btn {
                flex: 1;
                padding: 14px;
                background: linear-gradient(135deg, #FB7299 0%, #ff4d7a 100%);
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: transform 0.2s;
            }
            
            .enable-btn:hover {
                transform: translateY(-1px);
            }
            
            .disable-btn {
                flex: 1;
                padding: 14px;
                background: white;
                color: #666;
                border: 2px solid #ddd;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            }
            
            .disable-btn:hover:not(:disabled) {
                border-color: #FB7299;
                color: #FB7299;
            }
            
            .disable-btn:disabled {
                border-color: #cccccc;
                color: #cccccc;
                cursor: not-allowed;
            }
            
            .bilibili-note {
                background: #fff9e6;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 13px;
                color: #666;
                border-left: 4px solid #ffc107;
            }
            
            .bilibili-footer {
                padding: 16px 24px;
                background: #f8f9fa;
                border-top: 1px solid #e9ecef;
            }
            
            .bilibili-hint {
                font-size: 12px;
                color: #666;
                text-align: center;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(overlay);
        
        function enableBilibiliHelper() {
            const unlockQuality = overlay.querySelector('#unlock-quality').checked;
            const unlockComments = overlay.querySelector('#unlock-comments').checked;
            const removePopups = overlay.querySelector('#remove-popups').checked;
            const realTimeMonitor = overlay.querySelector('#real-time-monitor').checked;
            
            const settings = {
                enabled: true,
                unlockQuality: unlockQuality,
                unlockComments: unlockComments,
                removePopups: removePopups,
                realTimeMonitor: realTimeMonitor,
                timestamp: Date.now()
            };
            
            localStorage.setItem('bilibili_helper_settings', JSON.stringify(settings));
            showMessage('✅ B站辅助器（增强版）已启用');
            
            overlay.querySelector('#disable-bilibili-helper').disabled = false;
            overlay.querySelector('#enable-bilibili-helper').textContent = '更新设置';
            overlay.querySelector('.status-value').textContent = '已启用';
            overlay.querySelector('.status-value').className = 'status-value enabled';
            
            if (window.location.href.includes('bilibili.com')) {
                applyBilibiliHelper();
            }
        }
        
        function disableBilibiliHelper() {
            const settings = {
                enabled: false,
                timestamp: Date.now()
            };
            
            localStorage.setItem('bilibili_helper_settings', JSON.stringify(settings));
            showMessage('🔴 B站辅助器已禁用');
            
            overlay.querySelector('#disable-bilibili-helper').disabled = true;
            overlay.querySelector('#enable-bilibili-helper').textContent = '启用B站辅助器';
            overlay.querySelector('.status-value').textContent = '已禁用';
            overlay.querySelector('.status-value').className = 'status-value disabled';
        }
        
        overlay.querySelector('#enable-bilibili-helper').addEventListener('click', enableBilibiliHelper);
        overlay.querySelector('#disable-bilibili-helper').addEventListener('click', disableBilibiliHelper);
        
        overlay.querySelector('.back-btn').addEventListener('click', () => {
            overlay.remove();
            style.remove();
            showLauncher();
        });
        
        overlay.querySelector('.bilibili-close').addEventListener('click', () => {
            overlay.remove();
            style.remove();
        });
        
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                style.remove();
            }
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                style.remove();
            }
        });
    }
    
    // === 帮助功能 ===
    function showHelp() {
        const helpText = `🚀 装置启动器使用帮助（优化版）

📌 主要功能：
1. 🌐 网页启动装置 - 快速打开常用网站
2. 🎬 视频播放速度控制器 - 在B站/爱奇艺控制视频速度
3. 🔓 B站辅助器 - B站免登录解锁功能
4. ❓ 使用帮助 - 查看本说明

✨ 优化更新：
• 视频速度控制器支持自动应用，无需点击"应用"按钮
• B站辅助器增强版，提高功能稳定性
• 所有设置自动保存并跨网站同步
• 保留所有原功能，优化使用体验

🎬 视频速度控制器特点：
• 在指定网站调节速度时自动生效（可设置）
• 支持预设按钮：0.5x、1.0x、1.5x、2.0x、4.0x
• 控制器隐藏后变成小球，点击小球可重新显示
• 最高速度支持电脑极限（16倍）
• 设置自动保存，跨网站同步

🔓 B站辅助器特点（增强版）：
• 解除画质限制（自动选择最高画质）
• 解除评论限制（完整显示评论）
• 移除登录弹窗（无干扰观看）
• 实时监控页面变化，确保功能生效
• 增强版提高功能稳定性

🔄 使用方法：
1. 在任何网站按 / 键打开装置启动器
2. 选择要使用的装置
3. 配置相关设置
4. 所有设置自动保存并同步

💡 快捷操作：
• / 键 - 打开/关闭装置启动器
• ESC 键 - 关闭当前对话框
• ↩️ 按钮 - 返回上一页
• 小球 - 隐藏的速度控制器，点击可重新显示

📱 兼容性：
• 支持所有现代浏览器
• 在任何网站都能使用
• 设置保存在浏览器本地并同步`;
        
        alert(helpText);
    }
    
    // === 数据管理函数 ===
    function loadSpeedSettings() {
        try {
            const saved = localStorage.getItem('video_speed_controller_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.currentSpeed) currentSpeed = settings.currentSpeed;
                if (settings.isApplied !== undefined) isSpeedApplied = settings.isApplied;
                if (settings.lastAppliedSpeed) lastAppliedSpeed = settings.lastAppliedSpeed;
                if (settings.autoApply !== undefined) autoApplySpeed = settings.autoApply;
                
                if (!settings.bilibili) settings.bilibili = { enabled: true };
                if (!settings.iqiyi) settings.iqiyi = { enabled: true };
                
                return settings;
            }
        } catch (e) {
            console.log('加载速度设置失败:', e);
        }
        
        return {
            bilibili: { enabled: true },
            iqiyi: { enabled: true },
            currentSpeed: 1.0,
            isApplied: false,
            lastAppliedSpeed: 1.0,
            autoApply: true,
            timestamp: Date.now()
        };
    }
    
    function saveSpeedSettings() {
        const settings = {
            bilibili: { enabled: true },
            iqiyi: { enabled: true },
            currentSpeed: currentSpeed,
            isApplied: isSpeedApplied,
            lastAppliedSpeed: lastAppliedSpeed,
            autoApply: autoApplySpeed,
            timestamp: Date.now()
        };
        
        localStorage.setItem('video_speed_controller_settings', JSON.stringify(settings));
    }
    
    function loadBilibiliHelperSettings() {
        try {
            const saved = localStorage.getItem('bilibili_helper_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                if (settings.realTimeMonitor === undefined) settings.realTimeMonitor = true;
                return settings;
            }
        } catch (e) {
            console.log('加载B站辅助器设置失败:', e);
        }
        
        return {
            enabled: false,
            unlockQuality: true,
            unlockComments: true,
            removePopups: true,
            realTimeMonitor: true,
            timestamp: Date.now()
        };
    }
    
    // === 视频速度功能 ===
    function applyVideoSpeed(speed) {
        const videos = document.querySelectorAll('video');
        
        if (videos.length > 0) {
            let appliedCount = 0;
            videos.forEach(video => {
                try {
                    const safeSpeed = Math.min(Math.max(speed, 0.01), 16.0);
                    video.playbackRate = safeSpeed;
                    appliedCount++;
                } catch (e) {
                    console.log('设置视频速度失败:', e);
                }
            });
            
            if (appliedCount > 0) {
                console.log(`已设置${appliedCount}个视频的播放速度为x${speed.toFixed(2)}`);
            }
        }
    }
    
    // === B站辅助器功能（增强版）===
    function applyBilibiliHelper() {
        const settings = loadBilibiliHelperSettings();
        
        if (settings.enabled) {
            console.log('应用B站辅助器功能（增强版）...');
            
            // 解除画质限制（增强版）
            if (settings.unlockQuality) {
                const unlockBilibiliQuality = () => {
                    const qualitySelectors = [
                        '.bpx-player-ctrl-quality',
                        '.bilibili-player-video-btn-quality',
                        '.bilibili-player-quality-selector',
                                                '.bpx-player-quality-selector',
                        '[class*="quality"]',
                        '[class*="Quality"]'
                    ].map(selector => document.querySelector(selector)).filter(el => el);
                    
                    qualitySelectors.forEach(selector => {
                        if (selector) {
                            selector.click();
                            setTimeout(() => {
                                const qualityItems = document.querySelectorAll(
                                    '.bpx-player-ctrl-quality-item, ' +
                                    '.bilibili-player-video-quality-item, ' +
                                    '[class*="quality-item"], ' +
                                    '[class*="QualityItem"]'
                                );
                                
                                qualityItems.forEach(item => {
                                    const text = item.textContent || '';
                                    if (text.includes('4K') || text.includes('1080P') || text.includes('720P') || 
                                        text.includes('超清') || text.includes('高清') || text.includes('蓝光')) {
                                        item.click();
                                        console.log('已自动选择画质:', text);
                                    }
                                });
                            }, 500);
                        }
                    });
                };
                
                setTimeout(unlockBilibiliQuality, 2000);
                setInterval(unlockBilibiliQuality, 5000);
            }
            
            // 解除评论限制（增强版）
            if (settings.unlockComments) {
                const removeCommentRestrictions = () => {
                    const loginPrompts = document.querySelectorAll(
                        '.comment-login, .login-tip, .bili-comment-login, ' +
                        '[class*="login-tip"], [class*="comment-login"], ' +
                        '.bili-comment-login-wrap, .bili-comment-login-mask'
                    );
                    
                    loginPrompts.forEach(prompt => {
                        prompt.style.display = 'none';
                        prompt.remove();
                    });
                    
                    const commentLists = document.querySelectorAll(
                        '.comment-list, .bili-comment-list, ' +
                        '[class*="comment-list"], [class*="CommentList"]'
                    );
                    
                    commentLists.forEach(list => {
                        list.style.maxHeight = 'none';
                        list.style.overflow = 'auto';
                        list.style.opacity = '1';
                    });
                    
                    // 移除评论限制提示
                    const restrictionTexts = document.querySelectorAll(
                        '*:not(script):not(style):not(iframe):not(noscript)'
                    );
                    
                    restrictionTexts.forEach(element => {
                        if (element.textContent && (
                            element.textContent.includes('登录后才可以评论') ||
                            element.textContent.includes('登录后发表评论') ||
                            element.textContent.includes('请先登录') ||
                            element.textContent.includes('登录查看评论')
                        )) {
                            element.style.display = 'none';
                            element.remove();
                        }
                    });
                };
                
                removeCommentRestrictions();
                setInterval(removeCommentRestrictions, 2000);
            }
            
            // 移除登录弹窗（增强版）
            if (settings.removePopups) {
                const removePopups = () => {
                    const loginModals = document.querySelectorAll(
                        '.login-modal, .bili-mini-login, .bili-login-popup, ' +
                        '[class*="login-modal"], [class*="LoginModal"], ' +
                        '.bili-login-dialog, .bili-login-layer, ' +
                        '.bili-login-wrap, .bili-login-container'
                    );
                    
                    loginModals.forEach(modal => {
                        modal.style.display = 'none';
                        modal.remove();
                    });
                    
                    const masks = document.querySelectorAll(
                        '.mask, .modal-mask, .bili-modal-mask, ' +
                        '[class*="mask"], [class*="Mask"], ' +
                        '.bili-dialog-mask, .bili-layer-mask'
                    );
                    
                    masks.forEach(mask => {
                        mask.style.display = 'none';
                        mask.remove();
                    });
                    
                    // 阻止登录弹窗事件
                    document.body.style.overflow = 'auto';
                    
                    // 移除登录按钮的点击事件
                    const loginButtons = document.querySelectorAll(
                        '.bili-header-login, .bili-header-login-btn, ' +
                        '[class*="login-btn"], [class*="LoginBtn"], ' +
                        'button:contains("登录"), a:contains("登录")'
                    );
                    
                    loginButtons.forEach(button => {
                        button.onclick = null;
                        button.removeAttribute('onclick');
                        button.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            return false;
                        });
                    });
                };
                
                removePopups();
                setInterval(removePopups, 1000);
            }
            
            // 实时监控（增强版）
            if (settings.realTimeMonitor) {
                const realTimeMonitor = () => {
                    // 监控页面变化
                    const observer = new MutationObserver((mutations) => {
                        mutations.forEach((mutation) => {
                            if (mutation.addedNodes.length > 0) {
                                // 重新应用功能
                                setTimeout(() => {
                                    if (settings.unlockQuality) {
                                        const qualitySelectors = document.querySelectorAll(
                                            '.bpx-player-ctrl-quality, .bilibili-player-video-btn-quality'
                                        );
                                        if (qualitySelectors.length > 0) {
                                            qualitySelectors[0].click();
                                        }
                                    }
                                    
                                    if (settings.unlockComments) {
                                        const loginPrompts = document.querySelectorAll(
                                            '.comment-login, .login-tip'
                                        );
                                        loginPrompts.forEach(prompt => {
                                            prompt.style.display = 'none';
                                        });
                                    }
                                    
                                    if (settings.removePopups) {
                                        const loginModals = document.querySelectorAll(
                                            '.login-modal, .bili-mini-login'
                                        );
                                        loginModals.forEach(modal => {
                                            modal.style.display = 'none';
                                        });
                                    }
                                }, 100);
                            }
                        });
                    });
                    
                    observer.observe(document.body, {
                        childList: true,
                        subtree: true
                    });
                };
                
                realTimeMonitor();
            }
        }
    }
    
    // === 检查并显示速度控制器 ===
    function checkAndShowSpeedController() {
        const settings = loadSpeedSettings();
        const currentUrl = window.location.href.toLowerCase();
        
        if (settings.bilibili && settings.bilibili.enabled && currentUrl.includes('bilibili.com')) {
            if (!speedControllerVisible && !speedControllerMinimized) {
                setTimeout(createSpeedController, 1000);
            }
            return true;
        }
        
        if (settings.iqiyi && settings.iqiyi.enabled && currentUrl.includes('iqiyi.com')) {
            if (!speedControllerVisible && !speedControllerMinimized) {
                setTimeout(createSpeedController, 1000);
            }
            return true;
        }
        
        return false;
    }
    
    // === 检查并应用B站辅助器 ===
    function checkAndApplyBilibiliHelper() {
        const settings = loadBilibiliHelperSettings();
        const currentUrl = window.location.href.toLowerCase();
        
        if (settings.enabled && currentUrl.includes('bilibili.com')) {
            setTimeout(applyBilibiliHelper, 2000);
        }
    }
    
    // === 消息提示 ===
    function showMessage(msg) {
        const existing = document.querySelector('.device-message');
        if (existing) existing.remove();
        
        const msgBox = document.createElement('div');
        msgBox.className = 'device-message';
        msgBox.textContent = msg;
        msgBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            z-index: 999999;
            box-shadow: 0 8px 30px rgba(102, 126, 234, 0.3);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-weight: 500;
            font-size: 14px;
            animation: messageSlideIn 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            @keyframes messageSlideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes messageFadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(msgBox);
        
        setTimeout(() => {
            msgBox.style.animation = 'messageFadeOut 0.5s ease';
            setTimeout(() => {
                msgBox.remove();
                style.remove();
            }, 500);
        }, 3000);
    }
    
    // === 主界面控制 ===
    function showLauncher() {
        if (isLauncherVisible) return;
        
        if (!currentLauncher) {
            currentLauncher = createMainLauncher();
            generateDeviceItems();
        }
        
        currentLauncher.classList.remove('hidden');
        isLauncherVisible = true;
        
        currentLauncher.querySelector('.launcher-overlay').addEventListener('click', hideLauncher);
        currentLauncher.querySelector('.close-btn').addEventListener('click', hideLauncher);
        currentLauncher.querySelector('.back-btn').addEventListener('click', () => {
            window.history.back();
            hideLauncher();
        });
    }
    
    function hideLauncher() {
        if (currentLauncher && isLauncherVisible) {
            currentLauncher.classList.add('hidden');
            isLauncherVisible = false;
        }
    }
    
    // === 初始化 ===
    function init() {
        console.log('装置启动器（优化版）开始初始化...');
        
        // 加载设置
        loadSpeedSettings();
        loadBilibiliHelperSettings();
        
        // 监听 / 键
        document.addEventListener('keydown', function(e) {
            if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                const activeElement = document.activeElement;
                const isInput = activeElement && (
                    activeElement.tagName === 'INPUT' ||
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                
                if (!isInput) {
                    e.preventDefault();
                    
                    if (isLauncherVisible) {
                        hideLauncher();
                    } else {
                        showLauncher();
                    }
                }
            }
            
            if (e.key === 'Escape' && isLauncherVisible) {
                hideLauncher();
            }
        });
        
        // 检查当前页面
        checkAndShowSpeedController();
        checkAndApplyBilibiliHelper();
        
        // 监听页面变化
        let lastUrl = window.location.href;
        const observer = new MutationObserver(() => {
            if (window.location.href !== lastUrl) {
                lastUrl = window.location.href;
                setTimeout(() => {
                    checkAndShowSpeedController();
                    checkAndApplyBilibiliHelper();
                }, 500);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // 显示初始化消息
        setTimeout(() => {
            showMessage('🚀 装置启动器（优化版）已加载\n按 / 键打开启动器');
        }, 500);
        
        console.log('装置启动器（优化版）初始化完成');
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();