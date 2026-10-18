// ==UserScript==
// @name         网页护眼助手
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  网页护眼助手，支持字体调整、护眼模式、颜色自定义和拖拽功能
// @author       Tabbit
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 等待页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    function init() {
        // 配置常量
        const CONFIG = {
            ROOT_ID: 'page-helper-floating-ball',
            STYLE_ID: 'page-helper-floating-style',
            EYE_STYLE_ID: 'page-helper-eye-style',
            STORAGE_KEYS: {
                COLOR: 'page_helper_color',
                POSITION: 'page_helper_position',
                FONT_SCALE: 'page_helper_font_scale',
                EYE_CARE: 'page_helper_eye_care'
            },
            DEFAULT: {
                COLOR: '#1677ff',
                POSITION: { left: '24px', bottom: '96px' },
                FONT_SCALE: 1,
                EYE_CARE: false
            }
        };
        
        // 状态变量
        let state = {
            fontScale: parseFloat(localStorage.getItem(CONFIG.STORAGE_KEYS.FONT_SCALE)) || CONFIG.DEFAULT.FONT_SCALE,
            customColor: localStorage.getItem(CONFIG.STORAGE_KEYS.COLOR) || CONFIG.DEFAULT.COLOR,
            position: JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.POSITION) || JSON.stringify(CONFIG.DEFAULT.POSITION)),
            isEyeCareEnabled: localStorage.getItem(CONFIG.STORAGE_KEYS.EYE_CARE) === 'true' || CONFIG.DEFAULT.EYE_CARE,
            isDragging: false,
            dragStart: { x: 0, y: 0 },
            elementStart: { x: 0, y: 0 }
        };
        
        // 清理旧元素
        cleanupOldElements();
        
        // 创建样式
        createStyles();
        
        // 创建UI元素
        createUI();
        
        // 初始化UI状态
        initializeUI();
        
        // 绑定事件
        bindEvents();
        
        // 应用初始设置
        applyInitialSettings();
        
        console.log('网页护眼助手已成功加载！');
        
        // ========== 工具函数 ==========
        
        function cleanupOldElements() {
            const oldElements = [
                CONFIG.ROOT_ID,
                CONFIG.STYLE_ID,
                CONFIG.EYE_STYLE_ID
            ];
            
            oldElements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.remove();
            });
        }
        
        function createStyles() {
            // 主样式
            const mainStyle = document.createElement('style');
            mainStyle.id = CONFIG.STYLE_ID;
            mainStyle.textContent = `
                #${CONFIG.ROOT_ID} {
                    position: fixed;
                    z-index: 2147483647;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    transition: all 0.3s ease;
                    user-select: none;
                }
                
                #${CONFIG.ROOT_ID} .helper-ball {
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    border: none;
                    background: ${state.customColor};
                    color: #ffffff;
                    font-size: 24px;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.24);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                }
                
                #${CONFIG.ROOT_ID} .helper-ball:hover {
                    transform: scale(1.05);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
                }
                
                #${CONFIG.ROOT_ID} .helper-ball.dragging {
                    opacity: 0.8;
                    cursor: grabbing;
                    box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
                }
                
                #${CONFIG.ROOT_ID} .helper-menu {
                    display: none;
                    position: absolute;
                    left: 0;
                    bottom: 66px;
                    width: 160px;
                    padding: 12px;
                    background: #ffffff;
                    border: 1px solid #e1e4e8;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
                    border-radius: 12px;
                    z-index: 2147483647;
                }
                
                #${CONFIG.ROOT_ID}.open .helper-menu {
                    display: grid;
                    gap: 8px;
                }
                
                #${CONFIG.ROOT_ID} .helper-menu button {
                    width: 100%;
                    padding: 10px 12px;
                    border: 1px solid #d0d7de;
                    border-radius: 8px;
                    background: #f6f8fa;
                    color: #24292f;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                #${CONFIG.ROOT_ID} .helper-menu button:hover {
                    background: #eef2f6;
                    border-color: #afb8c1;
                }
                
                #${CONFIG.ROOT_ID} .helper-menu button.active {
                    background: #1677ff;
                    color: white;
                    border-color: #1677ff;
                }
                
                #${CONFIG.ROOT_ID} .info-section {
                    margin-top: 12px;
                    padding: 10px;
                    background: #f8f9fa;
                    border-radius: 8px;
                    font-size: 12px;
                    border: 1px dashed #d0d7de;
                }
                
                #${CONFIG.ROOT_ID} .info-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 6px;
                }
                
                #${CONFIG.ROOT_ID} .info-label {
                    color: #6c757d;
                    font-weight: 500;
                }
                
                #${CONFIG.ROOT_ID} .info-value {
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-weight: bold;
                    font-size: 11px;
                }
                
                #${CONFIG.ROOT_ID} .status-info {
                    margin-top: 8px;
                    padding: 6px;
                    background: #e9ecef;
                    border-radius: 6px;
                    font-size: 11px;
                    text-align: center;
                    color: #495057;
                    font-weight: 500;
                }
            `;
            document.head.appendChild(mainStyle);
            
            // 护眼模式样式（初始不添加）
            if (state.isEyeCareEnabled) {
                createEyeCareStyle();
            }
        }
        
        function createEyeCareStyle() {
            const eyeStyle = document.createElement('style');
            eyeStyle.id = CONFIG.EYE_STYLE_ID;
            eyeStyle.textContent = `
                html, body {
                    background: #cce8cf !important;
                    color: #1f3b24 !important;
                }
                
                body *:not(img):not(video):not(canvas):not(svg):not(path):not(iframe) {
                    background-color: transparent !important;
                    color: #1f3b24 !important;
                    border-color: #7faf83 !important;
                }
                
                input, textarea, select, button {
                    background-color: #e4f3e6 !important;
                    color: #1f3b24 !important;
                    border-color: #7faf83 !important;
                }
                
                a {
                    color: #145f2a !important;
                }
                
                a:visited {
                    color: #0d401d !important;
                }
                
                a:hover {
                    color: #1c7a3a !important;
                }
            `;
            document.head.appendChild(eyeStyle);
        }
        
        function createUI() {
            // 创建根容器
            const root = document.createElement('div');
            root.id = CONFIG.ROOT_ID;
            
            // 设置初始位置
            Object.keys(state.position).forEach(key => {
                root.style[key] = state.position[key];
            });
            
            // 创建HTML结构
            root.innerHTML = `
                <div class="helper-menu">
                    <button type="button" data-action="increase" class="font-btn">
                        <span>🔍</span> 增大字体
                    </button>
                    <button type="button" data-action="decrease" class="font-btn">
                        <span>🔍</span> 减小字体
                    </button>
                    <button type="button" data-action="eye" class="eye-btn ${state.isEyeCareEnabled ? 'active' : ''}">
                        <span>👁️</span> ${state.isEyeCareEnabled ? '关闭护眼' : '护眼模式'}
                    </button>
                    <button type="button" data-action="color" class="color-btn">
                        <span>🎨</span> 自定义颜色
                    </button>
                    <button type="button" data-action="restore" class="restore-btn">
                        <span>🔄</span> 恢复默认
                    </button>
                    
                    <div class="info-section">
                        <div class="info-row">
                            <span class="info-label">颜色:</span>
                            <span class="info-value color-code-display">${state.customColor}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">字体大小:</span>
                            <span class="info-value font-scale-display">${Math.round(state.fontScale * 100)}%</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">护眼模式:</span>
                            <span class="info-value eye-status-display">${state.isEyeCareEnabled ? '开启' : '关闭'}</span>
                        </div>
                        <div class="status-info">
                            💡 拖拽图标可移动位置
                        </div>
                    </div>
                </div>
                
                <button type="button" class="helper-ball" title="网页护眼助手 - 点击打开菜单">
                    <span style="font-size: 20px;">👁️</span>
                </button>
            `;
            
            document.body.appendChild(root);
        }
        
        function initializeUI() {
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (!root) return;
            
            // 更新颜色显示
            const ball = root.querySelector('.helper-ball');
            if (ball) {
                ball.style.backgroundColor = state.customColor;
            }
            
            // 更新颜色代码显示颜色
            const colorDisplay = root.querySelector('.color-code-display');
            if (colorDisplay) {
                colorDisplay.style.color = state.customColor;
            }
        }
        
        function bindEvents() {
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (!root) return;
            
            const ball = root.querySelector('.helper-ball');
            const menu = root.querySelector('.helper-menu');
            
            // 小球点击事件（打开/关闭菜单）
            ball.addEventListener('click', function(e) {
                if (state.isDragging) {
                    state.isDragging = false;
                    return;
                }
                e.stopPropagation();
                root.classList.toggle('open');
            });
            
            // 菜单按钮点击事件
            menu.addEventListener('click', function(e) {
                const button = e.target.closest('button[data-action]');
                if (!button) return;
                
                e.stopPropagation();
                const action = button.getAttribute('data-action');
                
                handleAction(action, button);
            });
            
            // 拖拽功能
            ball.addEventListener('mousedown', startDrag);
            ball.addEventListener('touchstart', startDrag, { passive: false });
            
            // 点击页面其他区域关闭菜单
            document.addEventListener('click', function(e) {
                if (root && !root.contains(e.target)) {
                    root.classList.remove('open');
                }
            });
            
            // 阻止菜单内的点击事件冒泡
            menu.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
        
        function handleAction(action, button) {
            const root = document.getElementById(CONFIG.ROOT_ID);
            
            switch(action) {
                case 'increase':
                    increaseFontSize();
                    break;
                    
                case 'decrease':
                    decreaseFontSize();
                    break;
                    
                case 'eye':
                    toggleEyeCare(button);
                    break;
                    
                case 'color':
                    changeColor();
                    break;
                    
                case 'restore':
                    restoreDefaults();
                    break;
            }
            
            // 更新UI显示
            updateUIDisplay();
            
            // 关闭菜单
            if (root) {
                root.classList.remove('open');
            }
        }
        
        function increaseFontSize() {
            state.fontScale = Math.min(state.fontScale + 0.1, 2.0);
            applyFontScale();
            saveToStorage(CONFIG.STORAGE_KEYS.FONT_SCALE, state.fontScale);
        }
        
        function decreaseFontSize() {
            state.fontScale = Math.max(state.fontScale - 0.1, 0.6);
            applyFontScale();
            saveToStorage(CONFIG.STORAGE_KEYS.FONT_SCALE, state.fontScale);
        }
        
        function applyFontScale() {
            document.documentElement.style.fontSize = (state.fontScale * 100) + '%';
        }
        
        function toggleEyeCare(button) {
            state.isEyeCareEnabled = !state.isEyeCareEnabled;
            
            if (state.isEyeCareEnabled) {
                createEyeCareStyle();
                if (button) {
                    button.innerHTML = '<span>👁️</span> 关闭护眼';
                    button.classList.add('active');
                }
            } else {
                const eyeStyle = document.getElementById(CONFIG.EYE_STYLE_ID);
                if (eyeStyle) eyeStyle.remove();
                if (button) {
                    button.innerHTML = '<span>👁️</span> 护眼模式';
                    button.classList.remove('active');
                }
            }
            
            saveToStorage(CONFIG.STORAGE_KEYS.EYE_CARE, state.isEyeCareEnabled);
        }
        
        function changeColor() {
            const color = prompt('请输入颜色代码（例如：#FF5733、blue、rgb(255, 0, 0)）：', state.customColor);
            if (color && color.trim() !== '') {
                state.customColor = color.trim();
                saveToStorage(CONFIG.STORAGE_KEYS.COLOR, state.customColor);
                
                // 更新小球颜色
                const ball = document.querySelector(`#${CONFIG.ROOT_ID} .helper-ball`);
                if (ball) {
                    ball.style.backgroundColor = state.customColor;
                }
            }
        }
        
        function restoreDefaults() {
            // 恢复默认值
            state.fontScale = CONFIG.DEFAULT.FONT_SCALE;
            state.customColor = CONFIG.DEFAULT.COLOR;
            state.position = CONFIG.DEFAULT.POSITION;
            state.isEyeCareEnabled = CONFIG.DEFAULT.EYE_CARE;
            
            // 应用默认设置
            applyFontScale();
            
            // 移除护眼样式
            const eyeStyle = document.getElementById(CONFIG.EYE_STYLE_ID);
            if (eyeStyle) eyeStyle.remove();
            
            // 恢复默认位置
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (root) {
                Object.keys(CONFIG.DEFAULT.POSITION).forEach(key => {
                    root.style[key] = CONFIG.DEFAULT.POSITION[key];
                });
            }
            
            // 保存到存储
            saveToStorage(CONFIG.STORAGE_KEYS.FONT_SCALE, state.fontScale);
            saveToStorage(CONFIG.STORAGE_KEYS.COLOR, state.customColor);
            saveToStorage(CONFIG.STORAGE_KEYS.POSITION, state.position);
            saveToStorage(CONFIG.STORAGE_KEYS.EYE_CARE, state.isEyeCareEnabled);
            
            // 显示提示
            showMessage('已恢复所有默认设置！');
        }
        
        function updateUIDisplay() {
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (!root) return;
            
            // 更新字体大小显示
            const fontDisplay = root.querySelector('.font-scale-display');
            if (fontDisplay) {
                fontDisplay.textContent = Math.round(state.fontScale * 100) + '%';
            }
            
            // 更新颜色显示
            const colorDisplay = root.querySelector('.color-code-display');
            if (colorDisplay) {
                colorDisplay.textContent = state.customColor;
                colorDisplay.style.color = state.customColor;
            }
            
            // 更新护眼状态显示
            const eyeStatus = root.querySelector('.eye-status-display');
            if (eyeStatus) {
                eyeStatus.textContent = state.isEyeCareEnabled ? '开启' : '关闭';
            }
            
            // 更新护眼按钮
            const eyeButton = root.querySelector('[data-action="eye"]');
            if (eyeButton) {
                if (state.isEyeCareEnabled) {
                    eyeButton.innerHTML = '<span>👁️</span> 关闭护眼';
                    eyeButton.classList.add('active');
                } else {
                    eyeButton.innerHTML = '<span>👁️</span> 护眼模式';
                    eyeButton.classList.remove('active');
                }
            }
        }
        
        function startDrag(e) {
            e.preventDefault();
            e.stopPropagation();
            
            state.isDragging = true;
            const ball = document.querySelector(`#${CONFIG.ROOT_ID} .helper-ball`);
            if (ball) ball.classList.add('dragging');
            
            // 获取起始位置
            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            
            state.dragStart.x = clientX;
            state.dragStart.y = clientY;
            
            // 获取元素当前位置
            const root = document.getElementById(CONFIG.ROOT_ID);
            const rect = root.getBoundingClientRect();
            state.elementStart.x = rect.left;
            state.elementStart.y = rect.top;
            
            // 添加事件监听
            if (e.type === 'mousedown') {
                document.addEventListener('mousemove', onDrag);
                document.addEventListener('mouseup', stopDrag);
            } else {
                document.addEventListener('touchmove', onDrag, { passive: false });
                document.addEventListener('touchend', stopDrag);
            }
        }
        
        function onDrag(e) {
            if (!state.isDragging) return;
            
            e.preventDefault();
            
            // 获取当前位置
            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            
            // 计算移动距离
            const deltaX = clientX - state.dragStart.x;
            const deltaY = clientY - state.dragStart.y;
            
            // 计算新位置
            const newX = state.elementStart.x + deltaX;
            const newY = state.elementStart.y + deltaY;
            
            // 应用新位置
            const root = document.getElementById(CONFIG.ROOT_ID);
            root.style.left = newX + 'px';
            root.style.top = newY + 'px';
            root.style.right = 'auto';
            root.style.bottom = 'auto';
            
            // 更新状态信息
            updatePositionStatus(newX, newY);
        }
        
        function stopDrag() {
            if (!state.isDragging) return;
            
            state.isDragging = false;
            const ball = document.querySelector(`#${CONFIG.ROOT_ID} .helper-ball`);
            if (ball) ball.classList.remove('dragging');
            
            // 移除事件监听
            document.removeEventListener('mousemove', onDrag);
            document.removeEventListener('touchmove', onDrag);
            document.removeEventListener('mouseup', stopDrag);
            document.removeEventListener('touchend', stopDrag);
            
            // 保存新位置
            const root = document.getElementById(CONFIG.ROOT_ID);
            const rect = root.getBoundingClientRect();
            
            state.position = {
                left: rect.left + 'px',
                top: rect.top + 'px',
                right: '',
                bottom: ''
            };
            
            saveToStorage(CONFIG.STORAGE_KEYS.POSITION, state.position);
            
            // 显示保存提示
            showMessage('位置已保存！');
        }
        
        function updatePositionStatus(x, y) {
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (!root) return;
            
            const statusInfo = root.querySelector('.status-info');
            if (statusInfo) {
                statusInfo.innerHTML = `📍 位置: X=<strong>${Math.round(x)}</strong>, Y=<strong>${Math.round(y)}</strong>`;
            }
        }
        
        function applyInitialSettings() {
            // 应用字体缩放
            applyFontScale();
            
            // 应用护眼模式
            if (state.isEyeCareEnabled) {
                createEyeCareStyle();
            }
            
            // 更新UI显示
            updateUIDisplay();
        }
        
        function saveToStorage(key, value) {
            try {
                const stringValue = typeof value === 'object' ? JSON.stringify(value) : value.toString();
                localStorage.setItem(key, stringValue);
            } catch (e) {
                console.error('保存到localStorage失败:', e);
            }
        }
        
        function showMessage(message) {
            const root = document.getElementById(CONFIG.ROOT_ID);
            if (!root) return;
            
            const statusInfo = root.querySelector('.status-info');
            if (statusInfo) {
                const originalText = statusInfo.innerHTML;
                statusInfo.innerHTML = `✅ ${message}`;
                statusInfo.style.color = '#28a745';
                statusInfo.style.fontWeight = 'bold';
                
                setTimeout(() => {
                    statusInfo.innerHTML = originalText;
                    statusInfo.style.color = '';
                    statusInfo.style.fontWeight = '';
                }, 2000);
            }
        }
    }
})();