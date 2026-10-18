// 装置启动器 - 可用版
(function() {
    // 防止重复执行
    if (window.deviceLauncherActive) return;
    window.deviceLauncherActive = true;
    
    // 装置配置
    const DEVICES = {
        '1982': {
            name: '网页启动装置',
            description: '打开B站、爱奇艺、Poki等网站',
            action: function() {
                showWebsiteLauncher();
            }
        },
        '0': {
            name: '查看所有装置',
            description: '显示可用装置列表',
            action: function() {
                showDeviceList();
            }
        },
        'help': {
            name: '帮助',
            description: '显示使用说明',
            action: function() {
                showHelp();
            }
        }
    };
    
    // 网站配置
    const WEBSITES = [
        { id: 'bilibili', name: 'B站', url: 'https://www.bilibili.com', icon: '📺', color: '#FB7299' },
        { id: 'iqiyi', name: '爱奇艺', url: 'https://www.iqiyi.com', icon: '🎬', color: '#00A1D6' },
        { id: 'poki', name: 'Poki', url: 'https://poki.com', icon: '🎮', color: '#4A6EE0' }
    ];
    
    // 创建主界面
    function createLauncher() {
        const launcher = document.createElement('div');
        launcher.id = 'device-launcher';
        launcher.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            width: 400px;
            z-index: 1000000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: none;
        `;
        
        launcher.innerHTML = `
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px 12px 0 0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 600;">🔧 装置启动器</h3>
                <button id="launcher-close" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;">×</button>
            </div>
            <div style="padding: 20px;">
                <input type="text" id="launcher-input" placeholder="输入装置代码 (1982, 0, help)" 
                       style="width: 100%; padding: 12px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 16px; margin-bottom: 10px; box-sizing: border-box;">
                <div style="color: #666; font-size: 13px; text-align: center; margin-top: 10px;">
                    按ESC关闭 | 输入"0"查看所有装置
                </div>
            </div>
        `;
        
        document.body.appendChild(launcher);
        return launcher;
    }
    
    // 显示网站选择器
    function showWebsiteLauncher() {
        const overlay = document.createElement('div');
        overlay.id = 'website-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000001;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; border-radius: 16px; padding: 25px; width: 500px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
                <div style="text-align: center; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 8px 0; color: #333; font-size: 22px;">🌐 选择网站</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">点击网站卡片打开对应网站</p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px;">
                    ${WEBSITES.map(site => `
                        <div class="website-card" data-id="${site.id}" 
                             style="display: flex; align-items: center; padding: 18px; border: 2px solid #e8e8e8; border-radius: 12px; cursor: pointer; transition: all 0.3s;"
                             onmouseover="this.style.borderColor='${site.color}'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0,0,0,0.1)';"
                             onmouseout="this.style.borderColor='#e8e8e8'; this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                            <div style="width: 50px; height: 50px; border-radius: 10px; background: ${site.color}; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; margin-right: 18px;">
                                ${site.icon}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #333; font-size: 18px; margin-bottom: 4px;">${site.name}</div>
                                <div style="color: #666; font-size: 13px; font-family: monospace;">${site.url}</div>
                            </div>
                            <button class="open-btn" data-id="${site.id}" 
                                    style="padding: 10px 22px; background: ${site.color}; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                                打开
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div style="display: flex; justify-content: space-between; padding-top: 20px; border-top: 1px solid #eee;">
                    <button id="cancel-btn" style="padding: 12px 28px; background: #f5f5f5; color: #666; border: 1px solid #ddd; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        取消
                    </button>
                    <button id="open-all-btn" style="padding: 12px 28px; background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 14px;">
                        一键打开全部
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 事件监听
        overlay.querySelectorAll('.website-card').forEach(card => {
            card.addEventListener('click', function(e) {
                if (!e.target.classList.contains('open-btn')) {
                    const siteId = this.dataset.id;
                    openWebsite(siteId);
                }
            });
        });
        
        overlay.querySelectorAll('.open-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const siteId = this.dataset.id;
                openWebsite(siteId);
            });
        });
        
        overlay.querySelector('#open-all-btn').addEventListener('click', function() {
            WEBSITES.forEach(site => {
                window.open(site.url, '_blank');
            });
            showMessage('✅ 已打开全部网站');
            overlay.remove();
        });
        
        overlay.querySelector('#cancel-btn').addEventListener('click', function() {
            overlay.remove();
        });
        
        // ESC键关闭
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.remove();
            }
        });
    }
    
    // 打开网站
    function openWebsite(siteId) {
        const site = WEBSITES.find(s => s.id === siteId);
        if (site) {
            window.open(site.url, '_blank');
            showMessage(`✅ 已打开 ${site.name}`);
            
            // 关闭所有弹窗
            const overlay = document.getElementById('website-overlay');
            if (overlay) overlay.remove();
            
            const launcher = document.getElementById('device-launcher');
            if (launcher) launcher.style.display = 'none';
        }
    }
    
    // 显示装置列表
    function showDeviceList() {
        const overlay = document.createElement('div');
        overlay.id = 'device-list-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000001;
        `;
        
        overlay.innerHTML = `
            <div style="background: white; border-radius: 16px; width: 500px; max-width: 90vw; max-height: 70vh; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px;">
                    <h3 style="margin: 0; font-size: 20px; font-weight: 600; display: flex; align-items: center; justify-content: space-between;">
                        <span>📱 装置列表</span>
                        <button id="list-close" style="background: rgba(255,255,255,0.2); border: none; color: white; width: 30px; height: 30px; border-radius: 50%; font-size: 20px; cursor: pointer;">×</button>
                    </h3>
                </div>
                
                <div style="padding: 10px 0; max-height: 50vh; overflow-y: auto;">
                    ${Object.entries(DEVICES).map(([code, device]) => `
                        <div class="device-item" data-code="${code}" 
                             style="display: flex; align-items: center; padding: 18px 24px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s;"
                             onmouseover="this.style.background='#f9f9f9'"
                             onmouseout="this.style.background='white'">
                            <div style="background: #e3f2fd; color: #1976d2; padding: 8px 16px; border-radius: 8px; font-family: monospace; font-weight: bold; font-size: 16px; margin-right: 20px; min-width: 70px; text-align: center;">
                                ${code}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-weight: 600; color: #333; font-size: 16px; margin-bottom: 6px;">${device.name}</div>
                                <div style="color: #666; font-size: 14px;">${device.description}</div>
                            </div>
                            <button class="run-btn" data-code="${code}" 
                                    style="padding: 8px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
                                启动
                            </button>
                        </div>
                    `).join('')}
                </div>
                
                <div style="padding: 16px 24px; background: #f8f9fa; color: #666; font-size: 13px; border-top: 1px solid #eee;">
                    <div style="font-weight: 600; margin-bottom: 4px;">💡 共 ${Object.keys(DEVICES).length} 个可用装置</div>
                    <div>输入代码或点击"启动"使用装置</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 事件监听
        overlay.querySelector('#list-close').addEventListener('click', function() {
            overlay.remove();
        });
        
        overlay.querySelectorAll('.device-item').forEach(item => {
            item.addEventListener('click', function(e) {
                if (!e.target.classList.contains('run-btn')) {
                    const code = this.dataset.code;
                    executeCommand(code);
                    overlay.remove();
                }
            });
        });
        
        overlay.querySelectorAll('.run-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const code = this.dataset.code;
                executeCommand(code);
                overlay.remove();
            });
        });
        
        // ESC键关闭
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                this.remove();
            }
        });
    }
    
    // 显示帮助
    function showHelp() {
        const helpText = `🔧 装置启动器使用说明

📌 基本操作:
• 按 Ctrl+/ 键打开启动器
• 输入装置代码后按回车执行
• 按 ESC 键关闭启动器

📱 可用装置:
• 1982 - 网页启动装置
  打开B站、爱奇艺、Poki等网站
  支持单个打开或一键打开全部
  
• 0 - 查看所有装置
  显示当前所有可用装置及其功能

• help - 显示使用说明
  查看本帮助信息

💡 使用技巧:
- 在任何页面按 Ctrl+/ 即可快速启动
- 输入"0"可查看所有可用装置
- 网页启动装置支持单个或批量打开
- 所有操作都有明确的视觉反馈

🔒 安全性说明:
本启动器仅包含安全的网站打开功能，
不包含任何可能影响网页内容或安全的代码。`;
        
        alert(helpText);
    }
    
    // 显示消息
    function showMessage(msg) {
        const msgBox = document.createElement('div');
        msgBox.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 999999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 14px;
            animation: slideIn 0.3s ease;
        `;
        
        msgBox.textContent = msg;
        document.body.appendChild(msgBox);
        
        setTimeout(() => {
            msgBox.style.opacity = '0';
            msgBox.style.transition = 'opacity 0.5s';
            setTimeout(() => msgBox.remove(), 500);
        }, 2000);
    }
    
    // 执行命令
    function executeCommand(code) {
        if (DEVICES[code]) {
            DEVICES[code].action();
            return true;
        } else if (code) {
            showMessage(`❌ 未找到装置: ${code}`);
            return false;
        }
        return false;
    }
    
    // 初始化
    function init() {
        console.log('装置启动器开始初始化...');
        
        // 创建主界面
        const launcher = createLauncher();
        const input = launcher.querySelector('#launcher-input');
        const closeBtn = launcher.querySelector('#launcher-close');
        
        // 关闭按钮事件
        closeBtn.addEventListener('click', function() {
            launcher.style.display = 'none';
            input.value = '';
        });
        
        // 输入事件
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const code = input.value.trim().toLowerCase();
                if (executeCommand(code)) {
                    launcher.style.display = 'none';
                    input.value = '';
                }
            }
            
            if (e.key === 'Escape') {
                launcher.style.display = 'none';
                input.value = '';
            }
        });
        
        // 全局快捷键监听
        document.addEventListener('keydown', function(e) {
            // 按 Ctrl+/ 打开启动器
            if (e.key === '/' && e.ctrlKey) {
                e.preventDefault();
                
                if (launcher.style.display === 'none' || !launcher.style.display) {
                    launcher.style.display = 'block';
                    input.focus();
                    input.value = '';
                } else {
                    launcher.style.display = 'none';
                    input.value = '';
                }
            }
            
            // ESC键关闭
            if (e.key === 'Escape' && launcher.style.display === 'block') {
                launcher.style.display = 'none';
                input.value = '';
            }
        });
        
        console.log('装置启动器初始化完成');
        showMessage('🔧 装置启动器已加载 (按 Ctrl+/ 打开)');
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();