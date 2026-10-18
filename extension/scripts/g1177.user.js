// 装置启动器 - 网页增强版 (完全重写)
(function() {
    // 防止重复执行
    if (window.deviceLauncher) return;
    window.deviceLauncher = true;
    
    // 所有装置配置
    const DEVICES = {
        '1982': {
            name: '网页启动装置',
            description: '选择打开常用网站（可多选）',
            action: function() {
                showWebsiteSelection();
            }
        },
        '0': {
            name: '查看所有装置',
            description: '显示所有装置的启动数值',
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
        { id: 'bilibili', name: 'B站', url: 'https://www.bilibili.com', icon: '📺', color: '#FB7299', description: '哔哩哔哩视频平台' },
        { id: 'iqiyi', name: '爱奇艺', url: 'https://www.iqiyi.com', icon: '🎬', color: '#00A1D6', description: '爱奇艺视频平台' },
        { id: 'poki', name: 'Poki', url: 'https://poki.com', icon: '🎮', color: '#4A6EE0', description: '在线游戏平台' },
        { id: 'baidu', name: '百度', url: 'https://www.baidu.com', icon: '🔍', color: '#2932E1', description: '百度搜索' },
        { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com', icon: '💭', color: '#0084FF', description: '知乎问答社区' },
        { id: 'taobao', name: '淘宝', url: 'https://www.taobao.com', icon: '🛍️', color: '#FF4400', description: '淘宝购物' },
        { id: 'jd', name: '京东', url: 'https://www.jd.com', icon: '📦', color: '#E33333', description: '京东商城' },
        { id: 'weibo', name: '微博', url: 'https://weibo.com', icon: '📱', color: '#E6162D', description: '微博社交' },
        { id: 'github', name: 'GitHub', url: 'https://github.com', icon: '💻', color: '#24292E', description: '代码托管平台' },
        { id: 'stackoverflow', name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '❓', color: '#F48024', description: '编程问答社区' }
    ];
    
    // 创建命令框
    function createCommandBox() {
        const box = document.createElement('div');
        box.id = 'device-launcher-box';
        box.innerHTML = `
            <div class="launcher-header">
                <span>🔢 装置启动器 v2.0</span>
                <button class="launcher-close">×</button>
            </div>
            <input type="text" class="launcher-input" placeholder="请输入装置代码 (如: 1982, 0, help)" />
            <div class="launcher-hint">按ESC关闭 | 输入"0"查看所有装置</div>
        `;
        
        // 样式
        const style = document.createElement('style');
        style.textContent = `
            #device-launcher-box {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 12px;
                box-shadow: 0 8px 30px rgba(0,0,0,0.3);
                z-index: 999999;
                width: 400px;
                overflow: hidden;
                font-family: 'Segoe UI', Arial, sans-serif;
                border: 2px solid #4a6ee0;
            }
            .launcher-header {
                background: linear-gradient(135deg, #4a6ee0, #3a5ed0);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
                font-size: 18px;
            }
            .launcher-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                font-size: 24px;
                cursor: pointer;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background 0.2s;
            }
            .launcher-close:hover {
                background: rgba(255,255,255,0.3);
            }
            .launcher-input {
                width: 100%;
                padding: 18px 20px;
                border: none;
                outline: none;
                font-size: 16px;
                box-sizing: border-box;
                border-bottom: 1px solid #eee;
                background: #f8f9fa;
                font-family: 'Courier New', monospace;
            }
            .launcher-input:focus {
                background: white;
            }
            .launcher-hint {
                padding: 12px 20px;
                background: #f8f9fa;
                color: #666;
                font-size: 13px;
                text-align: center;
                border-top: 1px solid #eee;
            }
            .launcher-hidden {
                display: none !important;
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(box);
        
        return box;
    }
    
    // 显示网站选择对话框
    function showWebsiteSelection() {
        const overlay = document.createElement('div');
        overlay.className = 'website-selection-overlay';
        
        // 生成网站选项
        let websitesHTML = '';
        WEBSITES.forEach(site => {
            websitesHTML += `
                <div class="website-item" data-id="${site.id}">
                    <input type="checkbox" class="website-checkbox" id="site-${site.id}">
                    <label for="site-${site.id}" class="website-label">
                        <div class="website-icon" style="background: ${site.color}">${site.icon}</div>
                        <div class="website-info">
                            <div class="website-name">${site.name}</div>
                            <div class="website-url">${site.url}</div>
                            <div class="website-desc">${site.description}</div>
                        </div>
                    </label>
                </div>
            `;
        });
        
        overlay.innerHTML = `
            <div class="website-selection-box">
                <h3>🔗 选择要打开的网站（可多选）</h3>
                <div class="websites-container">
                    <div class="websites-grid">
                        ${websitesHTML}
                    </div>
                </div>
                <div class="selection-actions">
                    <div class="selection-controls">
                        <button class="control-btn select-all-btn">全选</button>
                        <button class="control-btn clear-all-btn">清空</button>
                        <div class="selection-count">已选择: <span id="selected-count">0</span> 个网站</div>
                    </div>
                    <div class="selection-footer">
                        <button class="selection-cancel">取消</button>
                        <button class="selection-open" disabled>打开选中网站 (0)</button>
                    </div>
                </div>
            </div>
        `;
        
        // 样式
        const selectionStyle = document.createElement('style');
        selectionStyle.textContent = `
            .website-selection-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 1000001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            .website-selection-box {
                background: white;
                padding: 30px;
                border-radius: 16px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                min-width: 700px;
                max-width: 90vw;
                max-height: 85vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .website-selection-box h3 {
                margin: 0 0 25px 0;
                color: #333;
                text-align: center;
                font-size: 22px;
                font-weight: 600;
            }
            .websites-container {
                flex: 1;
                overflow: hidden;
                margin-bottom: 20px;
                border: 1px solid #e0e0e0;
                border-radius: 10px;
                background: #f9f9f9;
            }
            .websites-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                gap: 15px;
                max-height: 50vh;
                overflow-y: auto;
                padding: 20px;
            }
            .website-item {
                display: flex;
                align-items: center;
                padding: 15px;
                border: 2px solid #e0e0e0;
                border-radius: 10px;
                background: white;
                transition: all 0.3s;
                cursor: pointer;
            }
            .website-item:hover {
                border-color: #4a6ee0;
                background: #f0f4ff;
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(74, 110, 224, 0.2);
            }
            .website-item.selected {
                border-color: #4CAF50;
                background: #f1f8e9;
            }
            .website-checkbox {
                margin-right: 15px;
                width: 20px;
                height: 20px;
                cursor: pointer;
                accent-color: #4CAF50;
            }
            .website-label {
                display: flex;
                align-items: center;
                flex: 1;
                cursor: pointer;
            }
            .website-icon {
                width: 48px;
                height: 48px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                color: white;
                margin-right: 20px;
                flex-shrink: 0;
                box-shadow: 0 3px 8px rgba(0,0,0,0.2);
            }
            .website-info {
                flex: 1;
            }
            .website-name {
                font-weight: 600;
                color: #333;
                font-size: 17px;
                margin-bottom: 5px;
            }
            .website-url {
                color: #666;
                font-size: 13px;
                font-family: 'Courier New', monospace;
                margin-bottom: 3px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .website-desc {
                color: #888;
                font-size: 12px;
            }
            .selection-actions {
                margin-top: 10px;
            }
            .selection-controls {
                display: flex;
                gap: 15px;
                align-items: center;
                margin-bottom: 20px;
            }
            .control-btn {
                padding: 10px 20px;
                background: #f5f5f5;
                color: #666;
                border: 1px solid #ddd;
                border-radius: 6px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: all 0.2s;
            }
            .control-btn:hover {
                background: #e0e0e0;
            }
            .selection-count {
                margin-left: auto;
                color: #666;
                font-size: 14px;
            }
            #selected-count {
                font-weight: bold;
                color: #4CAF50;
            }
            .selection-footer {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .selection-cancel {
                padding: 14px 28px;
                background: #f5f5f5;
                color: #666;
                border: 1px solid #ddd;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .selection-cancel:hover {
                background: #e0e0e0;
            }
            .selection-open {
                padding: 14px 28px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .selection-open:hover:not(:disabled) {
                background: #388E3C;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(56, 142, 60, 0.3);
            }
            .selection-open:disabled {
                background: #cccccc;
                cursor: not-allowed;
                opacity: 0.6;
            }
        `;
        
        document.head.appendChild(selectionStyle);
        document.body.appendChild(overlay);
        
        // 获取元素
        const openBtn = overlay.querySelector('.selection-open');
        const selectAllBtn = overlay.querySelector('.select-all-btn');
        const clearAllBtn = overlay.querySelector('.clear-all-btn');
        const checkboxes = overlay.querySelectorAll('.website-checkbox');
        const websiteItems = overlay.querySelectorAll('.website-item');
        const selectedCountSpan = overlay.querySelector('#selected-count');
        
        // 更新选择计数和按钮状态
        function updateSelection() {
            const checkedCount = overlay.querySelectorAll('.website-checkbox:checked').length;
            selectedCountSpan.textContent = checkedCount;
            openBtn.disabled = checkedCount === 0;
            openBtn.textContent = checkedCount > 0 ? `打开选中网站 (${checkedCount})` : '打开选中网站 (0)';
            
            // 更新选中状态样式
            websiteItems.forEach(item => {
                const checkbox = item.querySelector('.website-checkbox');
                if (checkbox.checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
        
        // 网站项点击事件
        websiteItems.forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox' && !e.target.classList.contains('control-btn')) {
                    const checkbox = item.querySelector('.website-checkbox');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change'));
                }
            });
        });
        
        // 复选框变化事件
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelection);
        });
        
        // 全选按钮
        selectAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => {
                checkbox.checked = true;
            });
            updateSelection();
        });
        
        // 清空按钮
        clearAllBtn.addEventListener('click', () => {
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            updateSelection();
        });
        
        // 打开选中网站
        openBtn.addEventListener('click', () => {
            const checkedSites = overlay.querySelectorAll('.website-checkbox:checked');
            let openedCount = 0;
            
            checkedSites.forEach(checkbox => {
                const siteId = checkbox.closest('.website-item').dataset.id;
                const site = WEBSITES.find(s => s.id === siteId);
                if (site) {
                    window.open(site.url, '_blank');
                    openedCount++;
                }
            });
            
            showMessage(`✅ 已打开 ${openedCount} 个网站`);
            overlay.remove();
            selectionStyle.remove();
        });
        
        // 取消按钮
        overlay.querySelector('.selection-cancel').addEventListener('click', () => {
            overlay.remove();
            selectionStyle.remove();
        });
        
        // ESC键关闭
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                selectionStyle.remove();
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                selectionStyle.remove();
            }
        });
        
        // 初始状态
        updateSelection();
    }
    
    // 显示装置列表
    function showDeviceList() {
        const overlay = document.createElement('div');
        overlay.className = 'device-list-overlay';
        
        // 生成列表HTML
        let listHTML = '<div class="list-header">';
        listHTML += '<h3>📋 所有装置列表</h3>';
        listHTML += '<button class="list-close">×</button>';
        listHTML += '</div>';
        listHTML += '<div class="list-content">';
        
        // 按代码排序
        const sortedCodes = Object.keys(DEVICES).sort((a, b) => {
            if (a === '0') return 1;
            if (b === '0') return -1;
            if (a === 'help') return 1;
            if (b === 'help') return -1;
            return a.localeCompare(b);
        });
        
        sortedCodes.forEach(code => {
            const device = DEVICES[code];
            listHTML += `
                <div class="list-item" data-code="${code}">
                    <div class="item-code">${code}</div>
                    <div class="item-info">
                        <div class="item-name">${device.name}</div>
                        <div class="item-desc">${device.description}</div>
                    </div>
                    <button class="item-run" data-code="${code}">启动</button>
                </div>
            `;
        });
        
        listHTML += '</div>';
        listHTML += `<div class="list-footer">💡 共 ${sortedCodes.length} 个装置 | 点击"启动"或输入代码使用</div>`;
        
        overlay.innerHTML = listHTML;
        
        // 样式
        const listStyle = document.createElement('style');
        listStyle.textContent = `
            .device-list-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 1000001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            .device-list-overlay .list-header {
                background: linear-gradient(135deg, #4CAF50, #388E3C);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 12px 12px 0 0;
            }
            .device-list-overlay .list-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }
            .device-list-overlay .list-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .device-list-overlay .list-close:hover {
                background: rgba(255,255,255,0.3);
            }
            .device-list-overlay .list-content {
                max-height: 60vh;
                overflow-y: auto;
                padding: 10px 0;
                background: white;
            }
            .device-list-overlay .list-item {
                display: flex;
                align-items: center;
                padding: 16px 24px;
                border-bottom: 1px solid #eee;
                transition: background 0.2s;
                cursor: pointer;
            }
            .device-list-overlay .list-item:hover {
                background: #f8f9fa;
            }
            .device-list-overlay .list-item:last-child {
                border-bottom: none;
            }
            .device-list-overlay .item-code {
                background: #e3f2fd;
                color: #1976d2;
                padding: 8px 16px;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-weight: bold;
                font-size: 15px;
                min-width: 80px;
                text-align: center;
                margin-right: 20px;
                border: 1px solid #bbdefb;
            }
            .device-list-overlay .item-info {
                flex: 1;
            }
            .device-list-overlay .item-name {
                font-weight: 600;
                color: #333;
                font-size: 16px;
                margin-bottom: 5px;
            }
            .device-list-overlay .item-desc {
                color: #666;
                font-size: 14px;
            }
            .device-list-overlay .item-run {
                padding: 8px 16px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 600;
                transition: all 0.2s;
                min-width: 70px;
            }
            .device-list-overlay .item-run:hover {
                background: #388E3C;
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(56, 142, 60, 0.3);
            }
            .device-list-overlay .list-footer {
                padding: 15px 24px;
                background: #f8f9fa;
                color: #666;
                font-size: 13px;
                text-align: center;
                border-top: 1px solid #eee;
                border-radius: 0 0 12px 12px;
            }
        `;
        
        document.head.appendChild(listStyle);
        document.body.appendChild(overlay);
        
        // 事件监听
        overlay.querySelector('.list-close').addEventListener('click', () => {
            overlay.remove();
            listStyle.remove();
        });
        
        // 点击列表项
        overlay.querySelectorAll('.list-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('item-run')) {
                    const code = item.dataset.code;
                    executeCommand(code);
                    overlay.remove();
                    listStyle.remove();
                }
            });
        });
        
        // 点击启动按钮
        overlay.querySelectorAll('.item-run').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.dataset.code;
                executeCommand(code);
                overlay.remove();
                listStyle.remove();
            });
        });
        
        // ESC键关闭
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                listStyle.remove();
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                listStyle.remove();
            }
        });
    }
    
    // 显示帮助
    function showHelp() {
        const helpText = `🔧 装置启动器使用说明（网页版 v2.0）

📌 使用方法:
1. 按 / 键打开启动器
2. 输入装置代码后按回车
3. 按 ESC 键关闭启动器

📋 可用装置:
• 1982 - 网页启动装置（可多选打开常用网站）
• 0 - 查看所有装置列表
• help - 显示此帮助信息

🔗 网页启动装置功能:
1. 支持多选网站，可同时打开多个
2. 包含10个常用网站：
   - B站、爱奇艺、Poki
   - 百度、知乎、淘宝、京东、微博
   - GitHub、Stack Overflow
3. 提供全选/清空功能
4. 实时显示已选择数量
5. 美观的界面设计，带网站图标和颜色标识

💡 提示:
- 在任何页面按 / 键即可使用
- 输入"0"查看所有装置
- 输入"help"查看帮助
- 点击"启动"按钮或输入代码使用装置

🔄 版本: v2.0 | 完全重写，确保可用性`;
        
        // 创建帮助对话框
        const overlay = document.createElement('div');
        overlay.className = 'help-overlay';
        overlay.innerHTML = `
            <div class="help-box">
                <div class="help-header">
                    <h3>🔧 装置启动器帮助</h3>
                    <button class="help-close">×</button>
                </div>
                <div class="help-content">
                    <pre>${helpText}</pre>
                </div>
                <div class="help-footer">
                    <button class="help-ok">确定</button>
                </div>
            </div>
        `;
        
        // 样式
        const helpStyle = document.createElement('style');
        helpStyle.textContent = `
            .help-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                z-index: 1000001;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: fadeIn 0.3s ease;
            }
            .help-box {
                background: white;
                border-radius: 12px;
                box-shadow: 0 12px 40px rgba(0,0,0,0.4);
                width: 600px;
                max-width: 90vw;
                max-height: 80vh;
                overflow: hidden;
            }
            .help-header {
                background: linear-gradient(135deg, #4a6ee0, #3a5ed0);
                color: white;
                padding: 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .help-header h3 {
                margin: 0;
                font-size: 20px;
                font-weight: 600;
            }
            .help-close {
                background: rgba(255,255,255,0.2);
                border: none;
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 22px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s;
            }
            .help-close:hover {
                background: rgba(255,255,255,0.3);
            }
            .help-content {
                padding: 25px;
                max-height: 60vh;
                overflow-y: auto;
                background: #f8f9fa;
            }
            .help-content pre {
                margin: 0;
                white-space: pre-wrap;
                font-family: 'Consolas', 'Monaco', monospace;
                font-size: 14px;
                line-height: 1.6;
                color: #333;
            }
            .help-footer {
                padding: 20px;
                background: white;
                text-align: center;
                border-top: 1px solid #eee;
            }
            .help-ok {
                padding: 12px 30px;
                background: #4CAF50;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 15px;
                font-weight: 600;
                transition: all 0.2s;
            }
            .help-ok:hover {
                background: #388E3C;
                transform: translateY(-1px);
                box-shadow: 0 3px 8px rgba(56, 142, 60, 0.3);
            }
        `;
        
        document.head.appendChild(helpStyle);
        document.body.appendChild(overlay);
        
        // 关闭按钮
        overlay.querySelector('.help-close').addEventListener('click', () => {
            overlay.remove();
            helpStyle.remove();
        });
        
        // 确定按钮
        overlay.querySelector('.help-ok').addEventListener('click', () => {
            overlay.remove();
            helpStyle.remove();
        });
        
        // ESC键关闭
        overlay.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                overlay.remove();
                helpStyle.remove();
            }
        });
        
        // 点击遮罩层关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                helpStyle.remove();
            }
        });
    }
    
    // 显示消息
    function showMessage(msg) {
        const msgBox = document.createElement('div');
        msgBox.textContent = msg;
        msgBox.style.cssText = `
            position: fixed;
            top: 30px;
            right: 30px;
            background: linear-gradient(135deg, #4CAF50, #388E3C);
            color: white;
            padding: 15px 25px;
            border-radius: 10px;
            z-index: 999999;
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
            font-family: 'Segoe UI', Arial, sans-serif;
            white-space: pre-line;
            max-width: 400px;
            font-weight: 500;
            font-size: 15px;
            animation: slideIn 0.3s ease, fadeOut 0.5s ease 2.5s forwards;
            border-left: 5px solid #2E7D32;
        `;
        
        // 添加动画样式
        const animationStyle = document.createElement('style');
        animationStyle.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes fadeOut {
                from {
                    opacity: 1;
                }
                to {
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(animationStyle);
        
        document.body.appendChild(msgBox);
        
        setTimeout(() => {
            msgBox.remove();
            animationStyle.remove();
        }, 3000);
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
    
    // 主逻辑
    let cmdBox = null;
    
    // 初始化
    function init() {
        console.log('🔧 装置启动器 v2.0 开始初始化...');
        
        // 创建命令框（隐藏状态）
        cmdBox = createCommandBox();
        cmdBox.classList.add('launcher-hidden');
        console.log('✅ 命令框创建完成');
        
        // 关闭按钮
        cmdBox.querySelector('.launcher-close').addEventListener('click', () => {
            cmdBox.classList.add('launcher-hidden');
        });
        
        // 输入处理
        const input = cmdBox.querySelector('.launcher-input');
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const code = input.value.trim();
                console.log('🚀 尝试执行代码:', code);
                if (executeCommand(code)) {
                    cmdBox.classList.add('launcher-hidden');
                    input.value = '';
                }
            }
            
            if (e.key === 'Escape') {
                cmdBox.classList.add('launcher-hidden');
                input.value = '';
            }
        });
        
        // 监听 / 键
        document.addEventListener('keydown', function(e) {
            // 按 / 键打开命令框
            if (e.key === '/' && !e.ctrlKey && !e.altKey && !e.metaKey) {
                e.preventDefault();
                console.log('🔑 检测到 / 键按下');
                
                if (cmdBox.classList.contains('launcher-hidden')) {
                    cmdBox.classList.remove('launcher-hidden');
                    input.focus();
                    input.value = '';
                    console.log('📱 命令框已显示');
                } else {
                    cmdBox.classList.add('launcher-hidden');
                    console.log('📱 命令框已隐藏');
                }
            }
            
            // ESC键关闭
            if (e.key === 'Escape' && !cmdBox.classList.contains('launcher-hidden')) {
                cmdBox.classList.add('launcher-hidden');
                input.value = '';
            }
        });
        
        console.log('✅ 装置启动器 v2.0 初始化完成');
        showMessage(`🔢 装置启动器 v2.0 已加载成功！
按 / 键打开 | 输入"0"查看装置列表`);
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();