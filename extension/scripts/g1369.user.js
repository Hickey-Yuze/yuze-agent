// ==UserScript==
// @name         小游戏大全 - C+D 组合键版
// @namespace    https://github.com/example/games-collection
// @version      2.0
// @description  一键访问 12 个免登录国外小游戏网站，C+D 组合键打开（完全重写版）
// @author       Games Collection Creator
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';
    
    // 防止重复加载
    if (window.__games_collection_v2) return;
    window.__games_collection_v2 = true;
    
    console.log('🎮 小游戏大全 v2.0 已加载！同时按 C+D 打开');
    
    // 游戏网站数据
    const GAMES_DATA = [
        {
            name: 'Poki',
            url: 'https://poki.com',
            icon: '🎮',
            description: '全球最大免登录小游戏平台，拥有 2 万 + 游戏',
            features: ['无需注册', '支持中文', '手机电脑都能玩', '每日更新'],
            categories: ['动作', '冒险', '益智', '体育', '多人游戏'],
            rating: 4.8,
            color: '#4285f4'
        },
        {
            name: 'CrazyGames',
            url: 'https://www.crazygames.com',
            icon: '🤪',
            description: '高质量 HTML5 游戏集合，4500+ 精品游戏',
            features: ['即开即玩', '无需下载', '支持多人联机', '智能搜索'],
            categories: ['射击', '策略', '竞速', '解谜', '休闲'],
            rating: 4.7,
            color: '#ff6b6b'
        },
        {
            name: 'Kongregate',
            url: 'https://www.kongregate.com',
            icon: '🎲',
            description: '独立游戏社区，创意独特的小游戏',
            features: ['独立开发者', '成就系统', '排行榜', '社区互动'],
            categories: ['RPG', '塔防', '模拟', '街机', '创意游戏'],
            rating: 4.6,
            color: '#4ecdc4'
        },
        {
            name: 'Miniclip',
            url: 'https://www.miniclip.com',
            icon: '🏓',
            description: '经典体育游戏平台，全球知名',
            features: ['体育游戏', '多人对战', '适合各年龄段', '经典游戏'],
            categories: ['台球', '足球', '篮球', '射击', '冒险'],
            rating: 4.5,
            color: '#45b7d1'
        },
        {
            name: 'Coolmath Games',
            url: 'https://www.coolmathgames.com',
            icon: '🧮',
            description: '数学和逻辑游戏，锻炼大脑',
            features: ['教育性', '逻辑思维', '适合学习', '无暴力内容'],
            categories: ['数学', '逻辑', '策略', '解谜', '教育'],
            rating: 4.4,
            color: '#96ceb4'
        },
        {
            name: 'Y8 Games',
            url: 'https://www.y8.com',
            icon: '🎯',
            description: '海量 HTML5 游戏，老牌游戏网站',
            features: ['HTML5 技术', '无需 Flash', '经典街机', '怀旧游戏'],
            categories: ['街机', '动作', '女孩游戏', '驾驶', '射击'],
            rating: 4.3,
            color: '#ffeaa7'
        },
        {
            name: 'Armor Games',
            url: 'https://armorgames.com',
            icon: '🛡️',
            description: '策略和塔防游戏专家',
            features: ['策略游戏', '塔防经典', '角色扮演', '深度玩法'],
            categories: ['塔防', '策略', 'RPG', '冒险', '战争'],
            rating: 4.5,
            color: '#a29bfe'
        },
        {
            name: 'Agame',
            url: 'https://www.agame.com',
            icon: '♟️',
            description: '棋类和益智游戏集合',
            features: ['棋类游戏', '益智挑战', '休闲放松', '简单易玩'],
            categories: ['棋类', '益智', '纸牌', '麻将', '桌面游戏'],
            rating: 4.2,
            color: '#fd79a8'
        },
        {
            name: 'Addicting Games',
            url: 'https://www.addictinggames.com',
            icon: '🎪',
            description: '上瘾性强的小游戏，消磨时间必备',
            features: ['容易上瘾', '简单操作', '快速游戏', '放松解压'],
            categories: ['休闲', '益智', '动作', '街机', '快速游戏'],
            rating: 4.3,
            color: '#fdcb6e'
        },
        {
            name: 'Gameflare',
            url: 'https://www.gameflare.com',
            icon: '🔥',
            description: '热门小游戏集合，每日更新',
            features: ['热门游戏', '每日更新', '趋势游戏', '社区推荐'],
            categories: ['热门', '新游戏', '多人', '竞技', '休闲'],
            rating: 4.1,
            color: '#e17055'
        },
        {
            name: 'Kizi',
            url: 'https://www.kizi.com',
            icon: '🎨',
            description: '儿童友好型益智游戏',
            features: ['儿童安全', '教育内容', '简单操作', '色彩丰富'],
            categories: ['儿童', '益智', '教育', '创意', '简单游戏'],
            rating: 4.0,
            color: '#00b894'
        },
        {
            name: 'FreeOnlineGames',
            url: 'https://www.freeonlinegames.com',
            icon: '🕹️',
            description: '免费在线游戏大全',
            features: ['完全免费', '无需下载', '即点即玩', '游戏种类多'],
            categories: ['免费游戏', '在线游戏', '网页游戏', '小游戏'],
            rating: 4.2,
            color: '#6c5ce7'
        }
    ];
    
    // 状态管理
    let isOpen = false;
    let overlay = null;
    let container = null;
    let keysPressed = {};
    
    // 创建遮罩层
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 99990;
            display: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        overlay.onclick = closeGamesPage;
        document.body.appendChild(overlay);
    }
    
    // 创建主容器
    function createContainer() {
        container = document.createElement('div');
        container.id = 'games-collection-container';
        container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.95);
            width: 95%;
            max-width: 1200px;
            max-height: 90vh;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            z-index: 99991;
            display: none;
            opacity: 0;
            transition: all 0.3s ease;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        `;
        
        // 添加内容
        container.innerHTML = createPageHTML();
        document.body.appendChild(container);
        
        // 绑定事件
        bindEvents();
    }
    
    // 创建页面 HTML
    function createPageHTML() {
        const avgRating = (GAMES_DATA.reduce((sum, game) => sum + game.rating, 0) / GAMES_DATA.length).toFixed(1);
        
        return `
            <div style="display: flex; flex-direction: column; height: 100%;">
                <!-- 头部 -->
                <div style="padding: 24px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; flex-shrink: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h1 style="margin: 0; font-size: 32px; font-weight: 700; color: white;">🎮 小游戏大全</h1>
                        <button id="games-close-btn" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 28px; width: 48px; height: 48px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">×</button>
                    </div>
                    <p style="margin: 0; font-size: 16px; opacity: 0.9; line-height: 1.5;">一键访问 12 个免登录国外小游戏网站，每个网站都有详细介绍</p>
                </div>
                
                <!-- 主体内容（可滚动） -->
                <div id="games-main-content" style="flex: 1; overflow-y: auto; padding: 24px; background: #f8f9fa; max-height: calc(90vh - 140px);">
                    <!-- 快捷键提示 -->
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px; border-radius: 8px; border-left: 4px solid rgba(255,255,255,0.3); font-size: 14px; font-weight: 500; margin-bottom: 20px;">
                        🔑 快捷键：同时按下 <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-family: monospace; margin: 0 4px; border: 1px solid rgba(255,255,255,0.3);">C</span> + <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 4px; font-family: monospace; margin: 0 4px; border: 1px solid rgba(255,255,255,0.3);">D</span> 打开此页面
                    </div>
                    
                    <!-- 统计信息 -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="font-size: 32px; width: 60px; height: 60px; background: #667eea15; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #667eea;">🌐</div>
                            <div>
                                <div style="font-size: 28px; font-weight: 700; color: #333; line-height: 1;">${GAMES_DATA.length}</div>
                                <div style="font-size: 14px; color: #666; margin-top: 4px;">网站总数</div>
                            </div>
                        </div>
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="font-size: 32px; width: 60px; height: 60px; background: #ffd70015; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffd700;">⭐</div>
                            <div>
                                <div style="font-size: 28px; font-weight: 700; color: #333; line-height: 1;">${avgRating}</div>
                                <div style="font-size: 14px; color: #666; margin-top: 4px;">平均评分</div>
                            </div>
                        </div>
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="font-size: 32px; width: 60px; height: 60px; background: #4ecdc415; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #4ecdc4;">🎯</div>
                            <div>
                                <div style="font-size: 28px; font-weight: 700; color: #333; line-height: 1;">30+</div>
                                <div style="font-size: 14px; color: #666; margin-top: 4px;">游戏类型</div>
                            </div>
                        </div>
                        <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 16px;">
                            <div style="font-size: 32px; width: 60px; height: 60px; background: #00b89415; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #00b894;">🔓</div>
                            <div>
                                <div style="font-size: 28px; font-weight: 700; color: #333; line-height: 1;">100%</div>
                                <div style="font-size: 14px; color: #666; margin-top: 4px;">免登录</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 游戏网格 -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 24px; margin-bottom: 32px;">
                        ${GAMES_DATA.map(game => createGameCardHTML(game)).join('')}
                    </div>
                    
                    <!-- 使用说明 -->
                    <div style="background: white; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); margin-top: 24px;">
                        <h3 style="margin: 0 0 16px 0; font-size: 20px; color: #333;">📋 使用说明</h3>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 20px;">
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="font-size: 24px; flex-shrink: 0;">⌨️</div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">组合键打开</div>
                                    <div style="font-size: 14px; color: #666; line-height: 1.4;">同时按下 C + D 键打开此页面</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="font-size: 24px; flex-shrink: 0;">🖱️</div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">点击访问</div>
                                    <div style="font-size: 14px; color: #666; line-height: 1.4;">点击任意卡片即可打开游戏网站</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="font-size: 24px; flex-shrink: 0;">📱</div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">设备兼容</div>
                                    <div style="font-size: 14px; color: #666; line-height: 1.4;">所有网站支持手机和电脑访问</div>
                                </div>
                            </div>
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                <div style="font-size: 24px; flex-shrink: 0;">🔒</div>
                                <div>
                                    <div style="font-weight: 600; color: #333; margin-bottom: 4px;">完全免费</div>
                                    <div style="font-size: 14px; color: #666; line-height: 1.4;">无需注册登录，所有游戏免费</div>
                                </div>
                            </div>
                        </div>
                        <div style="margin-top: 20px; padding: 12px; background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffc107; font-size: 14px; color: #666;">
                            💡 提示：所有游戏网站均为国外网站，访问速度可能受网络环境影响。建议使用稳定网络连接。
                        </div>
                    </div>
                    
                    <!-- 滚动提示 -->
                    <div style="text-align: center; margin-top: 20px; color: #666; font-size: 14px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
                        🔽 使用鼠标滚轮或拖动滚动条查看更多内容
                    </div>
                </div>
            </div>
        `;
    }
    
    // 创建游戏卡片 HTML
    function createGameCardHTML(game) {
        const stars = '⭐'.repeat(Math.floor(game.rating));
        const halfStar = game.rating % 1 >= 0.5 ? '⭐' : '';
        
        return `
            <div class="game-card-${game.name.replace(/\s+/g, '').toLowerCase()}" style="background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08); transition: all 0.3s ease; cursor: pointer;" data-url="${game.url}" data-name="${game.name}">
                <div style="padding: 24px; background: linear-gradient(135deg, ${game.color} 0%, ${game.color}99 100%); color: white; display: flex; align-items: center; gap: 16px;">
                    <div style="font-size: 40px; width: 70px; height: 70px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${game.icon}</div>
                    <div>
                        <h3 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: white;">${game.name}</h3>
                        <div style="display: flex; align-items: center; gap: 4px; font-size: 14px; opacity: 0.9;">${stars}${halfStar} ${game.rating}</div>
                    </div>
                </div>
                <div style="padding: 24px;">
                    <p style="margin: 0 0 16px 0; color: #555; line-height: 1.6; font-size: 15px;">${game.description}</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px;">
                        ${game.features.map(f => `<span style="background: ${game.color}15; color: ${game.color}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 500;">${f}</span>`).join('')}
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px;">
                        ${game.categories.map(c => `<span style="background: #f0f0f0; color: #666; padding: 3px 8px; border-radius: 12px; font-size: 11px;">${c}</span>`).join('')}
                    </div>
                    <button class="visit-game-btn" data-url="${game.url}" data-name="${game.name}" style="width: 100%; padding: 12px; background: ${game.color}; color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        立即访问 <span>→</span>
                    </button>
                </div>
            </div>
        `;
    }
    
    // 绑定事件
    function bindEvents() {
        // 关闭按钮
        const closeBtn = document.getElementById('games-close-btn');
        if (closeBtn) {
            closeBtn.onclick = closeGamesPage;
            closeBtn.onmouseover = () => {
                closeBtn.style.background = 'rgba(255,255,255,0.3)';
                closeBtn.style.transform = 'scale(1.1)';
            };
            closeBtn.onmouseout = () => {
                closeBtn.style.background = 'rgba(255,255,255,0.2)';
                closeBtn.style.transform = 'scale(1)';
            };
        }
        
        // 卡片点击事件
        document.querySelectorAll('[data-url]').forEach(el => {
            el.onclick = function(e) {
                e.stopPropagation();
                const url = this.getAttribute('data-url');
                const name = this.getAttribute('data-name');
                openGameSite(name, url);
            };
        });
        
        // 访问按钮点击事件
        document.querySelectorAll('.visit-game-btn').forEach(btn => {
            btn.onmouseover = () => {
                btn.style.transform = 'scale(1.02)';
                btn.style.opacity = '0.9';
            };
            btn.onmouseout = () => {
                btn.style.transform = 'scale(1)';
                btn.style.opacity = '1';
            };
        });
        
        // 卡片悬停效果
        document.querySelectorAll('[class^="game-card-"]').forEach(card => {
            card.onmouseover = () => {
                card.style.transform = 'translateY(-8px)';
                card.style.boxShadow = '0 16px 32px rgba(0,0,0,0.12)';
            };
            card.onmouseout = () => {
                card.style.transform = 'translateY(0)';
                card.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)';
            };
        });
    }
    
    // 打开游戏网站
    function openGameSite(name, url) {
        try {
            window.open(url, '_blank');
            showNotification(`正在打开 ${name}...`);
        } catch (e) {
            console.warn('打开游戏网站失败:', e);
            showNotification(`无法打开 ${name}，请检查网络连接`);
        }
    }
    
    // 显示通知
    function showNotification(message) {
        try {
            // 移除旧通知
            const oldNote = document.querySelector('.games-notification');
            if (oldNote) oldNote.remove();
            
            const note = document.createElement('div');
            note.className = 'games-notification';
            note.textContent = message;
            note.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 14px 24px;
                border-radius: 10px;
                box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
                z-index: 99999;
                font-size: 14px;
                font-weight: 500;
                animation: gamesSlideIn 0.3s ease, gamesFadeOut 0.3s ease 2.7s;
                border-left: 4px solid rgba(255,255,255,0.3);
            `;
            
            // 添加动画样式
            if (!document.querySelector('#games-notification-style')) {
                const style = document.createElement('style');
                style.id = 'games-notification-style';
                style.textContent = `
                    @keyframes gamesSlideIn {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @keyframes gamesFadeOut {
                        from { opacity: 1; }
                        to { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(note);
            
            setTimeout(() => {
                if (note.parentNode) note.remove();
            }, 3000);
        } catch (e) {
            console.warn('显示通知失败:', e);
        }
    }
    
    // 打开游戏页面
    function openGamesPage() {
        try {
            if (isOpen) return;
            
            // 创建元素（如果不存在）
            if (!overlay) createOverlay();
            if (!container) createContainer();
            
            // 显示页面
            overlay.style.display = 'block';
            container.style.display = 'block';
            
            // 触发动画
            setTimeout(() => {
                overlay.style.opacity = '1';
                container.style.opacity = '1';
                container.style.transform = 'translate(-50%, -50%) scale(1)';
            }, 10);
            
            // 防止页面滚动
            document.body.style.overflow = 'hidden';
            
            isOpen = true;
        } catch (e) {
            console.warn('打开游戏页面失败:', e);
        }
    }
    
    // 关闭游戏页面
    function closeGamesPage() {
        try {
            if (!isOpen) return;
            
            // 隐藏动画
            overlay.style.opacity = '0';
            container.style.opacity = '0';
            container.style.transform = 'translate(-50%, -50%) scale(0.95)';
            
            // 延迟隐藏元素
            setTimeout(() => {
                overlay.style.display = 'none';
                container.style.display = 'none';
                document.body.style.overflow = '';
                isOpen = false;
            }, 300);
        } catch (e) {
            console.warn('关闭游戏页面失败:', e);
        }
    }
    
    // 键盘事件处理
    function setupKeyboardListeners() {
        try {
            // 键盘按下事件
            document.addEventListener('keydown', function(e) {
                try {
                    // 忽略输入框中的按键
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
                    
                    const key = e.key.toLowerCase();
                    
                    // 更新按键状态
                    if (key === 'c') {
                        keysPressed.c = true;
                    } else if (key === 'd') {
                        keysPressed.d = true;
                    }
                    
                    // 检查组合键 C+D
                    if (keysPressed.c && keysPressed.d) {
                        e.preventDefault();
                        openGamesPage();
                    }
                    
                    // Esc 键关闭
                    if (e.key === 'Escape' && isOpen) {
                        e.preventDefault();
                        closeGamesPage();
                    }
                    
                } catch (e) {
                    console.warn('键盘按下事件处理失败:', e);
                }
            });
            
            // 键盘释放事件
            document.addEventListener('keyup', function(e) {
                try {
                    const key = e.key.toLowerCase();
                    
                    // 更新按键状态
                    if (key === 'c') {
                        keysPressed.c = false;
                    } else if (key === 'd') {
                        keysPressed.d = false;
                    }
                    
                } catch (e) {
                    console.warn('键盘释放事件处理失败:', e);
                }
            });
            
        } catch (e) {
            console.warn('设置键盘监听器失败:', e);
        }
    }
    
    // 初始化
    function init() {
        try {
            console.log('🎮 小游戏大全 v2.0 已加载！同时按 C+D 打开');
            
            // 设置键盘监听器
            setupKeyboardListeners();
            
            // 显示加载完成通知
            setTimeout(() => {
                showNotification('小游戏大全已加载完成！同时按 C+D 打开');
            }, 1000);
            
        } catch (e) {
            console.warn('初始化失败:', e);
        }
    }
    
    // 页面加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();