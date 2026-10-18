// ==UserScript==
// @name         全能助手 - 页面增强与用户分析脚本
// @namespace    https://tabbit-ai.com/
// @version      1.0.0
// @description  提供页面颜色切换、B站视频控制、用户意图分析和系统风格切换功能
// @author       雾起
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    // ========== 配置模块 ==========
    const CONFIG = {
        // 颜色主题配置
        themes: {
            default: {
                name: '默认',
                background: '#ffffff',
                text: '#333333',
                primary: '#007bff'
            },
            dark: {
                name: '暗色',
                background: '#1a1a1a',
                text: '#e6e6e6',
                primary: '#4dabf7'
            },
            warm: {
                name: '暖色',
                background: '#fff8e1',
                text: '#5d4037',
                primary: '#ff9800'
            },
            cool: {
                name: '冷色',
                background: '#e3f2fd',
                text: '#0d47a1',
                primary: '#2196f3'
            }
        },

        // 系统风格配置
        personalities: {
            lively: {
                name: '活泼模式',
                greeting: '嗨~ 今天过得怎么样呀？😊',
                feedback: '操作成功！太棒了！🎉',
                error: '哎呀，出错了呢，再试一次吧~',
                color: '#ff4081'
            },
            cold: {
                name: '高冷模式',
                greeting: '嗯。',
                feedback: '完成。',
                error: '失败。',
                color: '#607d8b'
            }
        },

        // 快捷键配置
        shortcuts: {
            toggleTheme: 'F1',
            togglePersonality: 'F2',
            deepAnalyze: 'F3'
        }
    };

    // ========== 状态管理 ==========
    let currentState = {
        themeIndex: 0,
        personality: 'lively',
        isFullscreen: false,
        themeOrder: ['default', 'dark', 'warm', 'cool']
    };

    // ========== 工具函数 ==========
    const Utils = {
        // 保存状态到本地存储
        saveState() {
            GM_setValue('user_script_state', JSON.stringify(currentState));
        },

        // 从本地存储加载状态
        loadState() {
            const saved = GM_getValue('user_script_state');
            if (saved) {
                currentState = JSON.parse(saved);
            }
        },

        // 显示通知
        showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${type === 'error' ? '#f44336' : '#4CAF50'};
                color: white;
                border-radius: 8px;
                z-index: 99999;
                font-family: 'Microsoft YaHei', sans-serif;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                animation: slideIn 0.3s ease;
            `;
            
            notification.textContent = message;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        },

        // 添加CSS动画
        addAnimations() {
            const style = document.createElement('style');
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                }
            `;
            document.head.appendChild(style);
        }
    };

    // ========== 主题切换模块 ==========
    const ThemeManager = {
        currentThemeId: 'default',
        styleElement: null,

        init() {
            this.loadSavedTheme();
            this.createStyleElement();
            this.applyTheme();
        },

        createStyleElement() {
            this.styleElement = document.createElement('style');
            this.styleElement.id = 'theme-switcher-styles';
            document.head.appendChild(this.styleElement);
        },

        applyTheme() {
            const theme = CONFIG.themes[this.currentThemeId];
            
            const css = `
                body {
                    background-color: ${theme.background} !important;
                    color: ${theme.text} !important;
                    transition: background-color 0.3s ease, color 0.3s ease;
                }
                
                a, button, .primary {
                    color: ${theme.primary} !important;
                }
                
                .theme-highlight {
                    background-color: ${theme.primary}20 !important;
                    border-color: ${theme.primary} !important;
                }
            `;
            
            this.styleElement.textContent = css;
            Utils.saveState();
        },

        nextTheme() {
            const themes = Object.keys(CONFIG.themes);
            const currentIndex = themes.indexOf(this.currentThemeId);
            const nextIndex = (currentIndex + 1) % themes.length;
            this.currentThemeId = themes[nextIndex];
            this.applyTheme();
            
            const themeName = CONFIG.themes[this.currentThemeId].name;
            const message = currentState.personality === 'lively' 
                ? `已切换到${themeName}主题！✨` 
                : `主题：${themeName}`;
            
            Utils.showNotification(message);
        },

        loadSavedTheme() {
            const saved = GM_getValue('current_theme');
            if (saved && CONFIG.themes[saved]) {
                this.currentThemeId = saved;
            }
        }
    };

    // ========== B站视频控制模块 ==========
    const BilibiliController = {
        isBilibiliPage() {
            return window.location.hostname.includes('bilibili.com');
        },

        init() {
            if (!this.isBilibiliPage()) return;
            
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.target.matches('input, textarea, [contenteditable]')) {
                    this.toggleFullscreen();
                    e.preventDefault();
                }
            });
            
            console.log('B站视频控制已启用 - 按Enter键切换全屏');
        },

        toggleFullscreen() {
            const video = document.querySelector('video');
            if (!video) return;
            
            if (!document.fullscreenElement) {
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                } else if (video.webkitRequestFullscreen) {
                    video.webkitRequestFullscreen();
                }
                currentState.isFullscreen = true;
                Utils.showNotification('已进入全屏模式 🎬');
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
                currentState.isFullscreen = false;
                Utils.showNotification('已退出全屏模式');
            }
        }
    };

    // ========== 用户分析模块 ==========
    const UserAnalyzer = {
        analyze() {
            const analysis = {
                pageInfo: this.getPageInfo(),
                userBehavior: this.analyzeBehavior(),
                suggestions: this.generateSuggestions(),
                timestamp: new Date().toLocaleString()
            };
            
            this.displayAnalysis(analysis);
            return analysis;
        },

        getPageInfo() {
            return {
                title: document.title,
                url: window.location.href,
                domain: window.location.hostname,
                pageType: this.detectPageType(),
                wordCount: document.body.innerText.length,
                images: document.images.length
            };
        },

        detectPageType() {
            const url = window.location.href;
            if (url.includes('bilibili.com')) return '视频平台';
            if (url.includes('zhihu.com')) return '知识社区';
            if (url.includes('taobao.com') || url.includes('jd.com')) return '电商平台';
            if (url.includes('github.com')) return '技术社区';
            return '普通网页';
        },

        analyzeBehavior() {
            // 这里可以扩展为更复杂的用户行为分析
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            
            return {
                scrollProgress: Math.min(scrollPercent, 100).toFixed(1) + '%',
                timeOnPage: this.getTimeOnPage(),
                activeElements: document.querySelectorAll(':hover').length,
                pageComplexity: this.calculatePageComplexity()
            };
        },

        getTimeOnPage() {
            const startTime = performance.timing.navigationStart;
            const currentTime = Date.now();
            const seconds = Math.floor((currentTime - startTime) / 1000);
            
            if (seconds < 60) return `${seconds}秒`;
            if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟`;
            return `${Math.floor(seconds / 3600)}小时${Math.floor((seconds % 3600) / 60)}分钟`;
        },

        calculatePageComplexity() {
            const elements = document.querySelectorAll('*').length;
            if (elements < 100) return '简单';
            if (elements < 500) return '中等';
            if (elements < 2000) return '复杂';
            return '非常复杂';
        },

        generateSuggestions() {
            const suggestions = [];
            const pageType = this.detectPageType();
            
            if (pageType === '视频平台') {
                suggestions.push('建议使用全屏模式获得更好观看体验');
                suggestions.push('可以调整播放速度以适应学习节奏');
            }
            
            if (pageType === '知识社区') {
                suggestions.push('可以收藏有价值的内容方便后续查阅');
                suggestions.push('建议关注相关领域的优质创作者');
            }
            
            if (document.body.innerText.length > 5000) {
                suggestions.push('内容较长，建议分段阅读');
            }
            
            return suggestions.length > 0 ? suggestions : ['当前页面无需特别建议'];
        },

        displayAnalysis(analysis) {
            const modal = this.createAnalysisModal(analysis);
            document.body.appendChild(modal);
            
            // 添加关闭功能
            modal.querySelector('.close-btn').addEventListener('click', () => {
                modal.remove();
            });
            
            // 点击背景关闭
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        },

        createAnalysisModal(analysis) {
            const modal = document.createElement('div');
            modal.className = 'analysis-modal';
            
            const personality = CONFIG.personalities[currentState.personality];
            const title = personality.name === '活泼模式' 
                ? '📊 页面分析报告 - 让我看看你在干嘛~' 
                : '分析报告';
            
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="close-btn">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="section">
                            <h3>📄 页面信息</h3>
                            <p><strong>标题：</strong>${analysis.pageInfo.title}</p>
                            <p><strong>类型：</strong>${analysis.pageInfo.pageType}</p>
                            <p><strong>字数：</strong>${analysis.pageInfo.wordCount.toLocaleString()}字</p>
                            <p><strong>图片：</strong>${analysis.pageInfo.images}张</p>
                        </div>
                        
                        <div class="section">
                            <h3>👤 行为分析</h3>
                            <p><strong>滚动进度：</strong>${analysis.userBehavior.scrollProgress}</p>
                            <p><strong>停留时间：</strong>${analysis.userBehavior.timeOnPage}</p>
                            <p><strong>页面复杂度：</strong>${analysis.userBehavior.pageComplexity}</p>
                        </div>
                        
                        <div class="section">
                            <h3>💡 建议</h3>
                            <ul>
                                ${analysis.suggestions.map(s => `<li>${s}</li>`).join('')}
                            </ul>
                        </div>
                        
                        <div class="timestamp">
                            分析时间：${analysis.timestamp}
                        </div>
                    </div>
                </div>
            `;
            
            // 添加样式
            const style = document.createElement('style');
            style.textContent = this.getModalStyles();
            modal.appendChild(style);
            
            return modal;
        },

        getModalStyles() {
            return `
                .analysis-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 100000;
                    animation: fadeIn 0.3s ease;
                }
                
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 600px;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                
                .modal-header {
                    padding: 20px;
                    border-bottom: 1px solid #eee;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                    color: white;
                    border-radius: 12px 12px 0 0;
                }
                
                .modal-header h2 {
                    margin: 0;
                    font-size: 1.5em;
                }
                
                .close-btn {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 2em;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0 10px;
                }
                
                .modal-body {
                    padding: 20px;
                }
                
                .section {
                    margin-bottom: 25px;
                    padding: 15px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    border-left: 4px solid #6a11cb;
                }
                
                .section h3 {
                    margin-top: 0;
                    color: #333;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .timestamp {
                    text-align: center;
                    color: #666;
                    font-size: 0.9em;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `;
        }
    };

    // ========== 系统风格模块 ==========
    const PersonalityManager = {
        init() {
            this.loadPersonality();
            this.applyPersonality();
        },

        togglePersonality() {
            currentState.personality = currentState.personality === 'lively' ? 'cold' : 'lively';
            this.applyPersonality();
            Utils.saveState();
            
            const personality = CONFIG.personalities[currentState.personality];
            Utils.showNotification(`已切换到${personality.name} 🤖`);
        },

        applyPersonality() {
            const personality = CONFIG.personalities[currentState.personality];
            
            // 这里可以扩展更多个性化样式
            const styleId = 'personality-styles';
            let styleElement = document.getElementById(styleId);
            
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = styleId;
                document.head.appendChild(styleElement);
            }
            
            // 根据风格调整一些元素样式
            styleElement.textContent = `
                .personality-element {
                    color: ${personality.color} !important;
                }
                
                .notification {
                    font-family: ${personality.name === '活泼模式' ? "'Comic Sans MS', sans-serif" : "'Arial', sans-serif"};
                }
            `;
        },

        loadPersonality() {
            const saved = GM_getValue('current_personality');
            if (saved && CONFIG.personalities[saved]) {
                currentState.personality = saved;
            }
        },

        getFeedback(messageType) {
            const personality = CONFIG.personalities[currentState.personality];
            return personality[messageType] || '操作完成';
        }
    };

    // ========== 控制面板模块 ==========
    const ControlPanel = {
        panel: null,
        isVisible: false,

        init() {
            this.createPanel();
            this.setupKeyboardShortcuts();
            this.addGlobalStyles();
        },

        createPanel() {
            this.panel = document.createElement('div');
            this.panel.id = 'enhancement-control-panel';
            this.panel.style.cssText = `
                position: fixed;
                top: 50%;
                right: 0;
                transform: translateY(-50%) translateX(100%);
                background: white;
                border-radius: 12px 0 0 12px;
                box-shadow: -4px 0 20px rgba(0,0,0,0.15);
                z-index: 99998;
                transition: transform 0.3s ease;
                padding: 15px;
                min-width: 200px;
                border: 1px solid #e0e0e0;
                border-right: none;
            `;
            
            this.panel.innerHTML = this.getPanelHTML();
            document.body.appendChild(this.panel);
            
            // 添加拖拽按钮
            this.addToggleButton();
            
            // 绑定事件
            this.bindEvents();
        },

        getPanelHTML() {
            const currentTheme = CONFIG.themes[ThemeManager.currentThemeId];
            const currentPersonality = CONFIG.personalities[currentState.personality];
            
            return `
                <div class="panel-header">
                    <h3 style="margin: 0 0 15px 0; color: #333; display: flex; align-items: center; gap: 8px;">
                        🎮 控制面板
                    </h3>
                </div>
                
                <div class="panel-section">
                    <h4 style="margin: 0 0 10px 0; color: #666;">主题控制</h4>
                    <button class="panel-btn theme-btn" style="background: ${currentTheme.primary}">
                        🎨 切换主题 (${currentTheme.name})
                    </button>
                    <div class="theme-preview" style="margin-top: 10px; padding: 8px; background: ${currentTheme.background}; color: ${currentTheme.text}; border-radius: 6px;">
                        当前主题预览
                    </div>
                </div>
                
                <div class="panel-section">
                    <h4 style="margin: 15px 0 10px 0; color: #666;">系统风格</h4>
                    <button class="panel-btn personality-btn" style="background: ${currentPersonality.color}">
                        🤖 ${currentPersonality.name}
                    </button>
                </div>
                
                <div class="panel-section">
                    <h4 style="margin: 15px 0 10px 0; color: #666;">分析功能</h4>
                    <button class="panel-btn analyze-btn" style="background: #9c27b0">
                        🔍 深入分析
                    </button>
                </div>
                
                <div class="panel-section">
                    <h4 style="margin: 15px 0 10px 0; color: #666;">快捷键</h4>
                    <div style="font-size: 0.9em; color: #777;">
                        <div>F1: 切换主题</div>
                        <div>F2: 切换风格</div>
                        <div>F3: 页面分析</div>
                        <div>Enter: 全屏切换(B站)</div>
                    </div>
                </div>
                
                <div class="panel-footer" style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee; font-size: 0.8em; color: #999;">
                    全能助手 v1.0.0
                </div>
            `;
        },

        addToggleButton() {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'panel-toggle-btn';
            toggleBtn.innerHTML = '🎮';
            toggleBtn.style.cssText = `
                position: fixed;
                top: 50%;
                right: 0;
                transform: translateY(-50%);
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
                color: white;
                border: none;
                border-radius: 20px 0 0 20px;
                cursor: pointer;
                z-index: 99997;
                font-size: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                transition: transform 0.3s ease;
            `;
            
            toggleBtn.addEventListener('click', () => this.togglePanel());
            document.body.appendChild(toggleBtn);
        },

        togglePanel() {
            this.isVisible = !this.isVisible;
            const panel = document.getElementById('enhancement-control-panel');
            const toggleBtn = document.getElementById('panel-toggle-btn');
            
            if (this.isVisible) {
                panel.style.transform = 'translateY(-50%) translateX(0)';
                toggleBtn.style.transform = 'translateY(-50%) translateX(-200px)';
                toggleBtn.innerHTML = '❌';
            } else {
                panel.style.transform = 'translateY(-50%) translateX(100%)';
                toggleBtn.style.transform = 'translateY(-50%)';
                toggleBtn.innerHTML = '🎮';
            }
        },

        bindEvents() {
            // 主题切换按钮
            this.panel.querySelector('.theme-btn').addEventListener('click', () => {
                ThemeManager.nextTheme();
                this.updatePanel();
                Utils.showNotification(PersonalityManager.getFeedback('feedback'));
            });
            
            // 风格切换按钮
            this.panel.querySelector('.personality-btn').addEventListener('click', () => {
                PersonalityManager.togglePersonality();
                this.updatePanel();
            });
            
            // 分析按钮
            this.panel.querySelector('.analyze-btn').addEventListener('click', () => {
                UserAnalyzer.analyze();
                this.togglePanel();
                Utils.showNotification(PersonalityManager.getFeedback('feedback'));
            });
        },

        updatePanel() {
            this.panel.innerHTML = this.getPanelHTML();
            this.bindEvents();
        },

        setupKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // 防止在输入框中触发
                if (e.target.matches('input, textarea, [contenteditable]')) return;
                
                switch(e.key) {
                    case 'F1':
                        ThemeManager.nextTheme();
                        this.updatePanel();
                        e.preventDefault();
                        break;
                    case 'F2':
                        PersonalityManager.togglePersonality();
                        this.updatePanel();
                        e.preventDefault();
                        break;
                    case 'F3':
                        UserAnalyzer.analyze();
                        e.preventDefault();
                        break;
                }
            });
        },

        addGlobalStyles() {
            const styles = `
                .panel-btn {
                    width: 100%;
                    padding: 10px;
                    border: none;
                    border-radius: 6px;
                    color: white;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: 500;
                    transition: transform 0.2s, opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .panel-btn:hover {
                    transform: translateY(-2px);
                    opacity: 0.9;
                }
                
                .panel-btn:active {
                    transform: translateY(0);
                }
                
                .panel-section {
                    margin-bottom: 15px;
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.textContent = styles;
            document.head.appendChild(styleElement);
        }
    };

    // ========== 初始化 ==========
    function init() {
        console.log('全能助手脚本正在初始化...');
        
        // 加载保存的状态
        Utils.loadState();
        
        // 初始化各个模块
        Utils.addAnimations();
        ThemeManager.init();
        PersonalityManager.init();
        BilibiliController.init();
        ControlPanel.init();
        
        // 显示欢迎消息
        setTimeout(() => {
            const personality = CONFIG.personalities[currentState.personality];
            const message = currentState.personality === 'lively'
                ? `全能助手已启动！${personality.greeting} 试试侧边栏的控制面板吧~ ✨`
                : `已启动。${personality.greeting}`;
            
            Utils.showNotification(message);
        }, 1000);
        
        console.log('全能助手脚本初始化完成！');
    }

    // 等待页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();