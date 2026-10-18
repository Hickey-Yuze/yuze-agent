// ==UserScript==
// @name         网页浮动计时器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在网页右上角显示浮动计时窗口，支持倒计时、最小化、拖动和缩放
// @author       YourName
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    
    // 创建浮动窗口容器
    const createFloatingWindow = () => {
        // 检查是否已存在浮动窗口
        if (document.getElementById('floating-timer-window')) {
            return;
        }
        
        // 创建主容器
        const container = document.createElement('div');
        container.id = 'floating-timer-window';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            min-height: 200px;
            background-color: #ffffff;
            border: 2px solid #4a90e2;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            z-index: 999999;
            font-family: 'Microsoft YaHei', 'Segoe UI', sans-serif;
            overflow: hidden;
            resize: both;
            min-width: 250px;
            min-height: 180px;
        `;
        
        // 创建标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            background-color: #4a90e2;
            color: white;
            padding: 10px 15px;
            cursor: move;
            display: flex;
            justify-content: space-between;
            align-items: center;
            user-select: none;
        `;
        
        const titleText = document.createElement('span');
        titleText.textContent = '网页计时器';
        titleText.style.fontWeight = 'bold';
        
        const controlButtons = document.createElement('div');
        controlButtons.style.display = 'flex';
        controlButtons.style.gap = '10px';
        
        // 最小化按钮
        const minimizeBtn = document.createElement('button');
        minimizeBtn.textContent = '_';
        minimizeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 18px;
            padding: 0 5px;
        `;
        
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            font-size: 20px;
            padding: 0 5px;
        `;
        
        controlButtons.appendChild(minimizeBtn);
        controlButtons.appendChild(closeBtn);
        titleBar.appendChild(titleText);
        titleBar.appendChild(controlButtons);
        
        // 创建内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'timer-content';
        contentArea.style.cssText = `
            padding: 20px;
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;
        
        // 初始询问界面
        const createInitialUI = () => {
            contentArea.innerHTML = '';
            
            const question = document.createElement('div');
            question.textContent = '是否需要计时？';
            question.style.cssText = `
                font-size: 16px;
                font-weight: bold;
                text-align: center;
                margin-bottom: 10px;
            `;
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.cssText = `
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 10px;
            `;
            
            const yesBtn = document.createElement('button');
            yesBtn.textContent = '需要';
            yesBtn.style.cssText = `
                padding: 8px 20px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            `;
            
            const noBtn = document.createElement('button');
            noBtn.textContent = '不用';
            noBtn.style.cssText = `
                padding: 8px 20px;
                background-color: #f44336;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            `;
            
            yesBtn.addEventListener('click', () => {
                createTimerSetupUI();
            });
            
            noBtn.addEventListener('click', () => {
                container.remove();
            });
            
            buttonContainer.appendChild(yesBtn);
            buttonContainer.appendChild(noBtn);
            contentArea.appendChild(question);
            contentArea.appendChild(buttonContainer);
        };
        
        // 创建计时器设置界面
        const createTimerSetupUI = () => {
            contentArea.innerHTML = '';
            
            const prompt = document.createElement('div');
            prompt.textContent = '请输入倒计时时间（分钟）：';
            prompt.style.cssText = `
                font-size: 14px;
                margin-bottom: 10px;
            `;
            
            const inputContainer = document.createElement('div');
            inputContainer.style.cssText = `
                display: flex;
                gap: 10px;
                align-items: center;
            `;
            
            const timeInput = document.createElement('input');
            timeInput.type = 'number';
            timeInput.min = '1';
            timeInput.max = '1440';
            timeInput.value = '5';
            timeInput.style.cssText = `
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                flex: 1;
                font-size: 14px;
            `;
            
            const unitLabel = document.createElement('span');
            unitLabel.textContent = '分钟';
            unitLabel.style.fontSize = '14px';
            
            const startBtn = document.createElement('button');
            startBtn.textContent = '开始计时';
            startBtn.style.cssText = `
                margin-top: 15px;
                padding: 10px 20px;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                align-self: center;
            `;
            
            startBtn.addEventListener('click', () => {
                const minutes = parseInt(timeInput.value);
                if (minutes > 0) {
                    startTimer(minutes * 60); // 转换为秒
                } else {
                    alert('请输入有效的分钟数！');
                }
            });
            
            inputContainer.appendChild(timeInput);
            inputContainer.appendChild(unitLabel);
            contentArea.appendChild(prompt);
            contentArea.appendChild(inputContainer);
            contentArea.appendChild(startBtn);
        };
        
        // 开始计时器
        let timerInterval = null;
        let remainingTime = 0;
        
        const startTimer = (seconds) => {
            remainingTime = seconds;
            updateTimerDisplay();
            
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            timerInterval = setInterval(() => {
                remainingTime--;
                updateTimerDisplay();
                
                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                    showTimerComplete();
                }
            }, 1000);
        };
        
        // 更新计时器显示
        const updateTimerDisplay = () => {
            contentArea.innerHTML = '';
            
            const timerTitle = document.createElement('div');
            timerTitle.textContent = '倒计时剩余：';
            timerTitle.style.cssText = `
                font-size: 14px;
                color: #666;
                margin-bottom: 5px;
            `;
            
            const timerDisplay = document.createElement('div');
            timerDisplay.id = 'timer-display';
            
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            const secs = remainingTime % 60;
            
            const formatTime = (time) => time.toString().padStart(2, '0');
            
            timerDisplay.textContent = `${formatTime(hours)}:${formatTime(minutes)}:${formatTime(secs)}`;
            timerDisplay.style.cssText = `
                font-size: 32px;
                font-weight: bold;
                color: #2196F3;
                text-align: center;
                margin: 10px 0;
                font-family: monospace;
            `;
            
            const progressBar = document.createElement('div');
            progressBar.style.cssText = `
                width: 100%;
                height: 8px;
                background-color: #e0e0e0;
                border-radius: 4px;
                margin: 15px 0;
                overflow: hidden;
            `;
            
            const progressFill = document.createElement('div');
            const initialTime = remainingTime + (remainingTime === 0 ? 1 : 0); // 避免除零
            const progressPercent = ((initialTime - remainingTime) / initialTime) * 100;
            progressFill.style.cssText = `
                width: ${progressPercent}%;
                height: 100%;
                background-color: #4CAF50;
                transition: width 1s linear;
            `;
            
            progressBar.appendChild(progressFill);
            
            const stopBtn = document.createElement('button');
            stopBtn.textContent = '停止计时';
            stopBtn.style.cssText = `
                padding: 8px 20px;
                background-color: #f44336;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                align-self: center;
                margin-top: 10px;
            `;
            
            stopBtn.addEventListener('click', () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                createInitialUI();
            });
            
            contentArea.appendChild(timerTitle);
            contentArea.appendChild(timerDisplay);
            contentArea.appendChild(progressBar);
            contentArea.appendChild(stopBtn);
        };
        
        // 计时完成显示
        const showTimerComplete = () => {
            contentArea.innerHTML = '';
            
            const completeMessage = document.createElement('div');
            completeMessage.textContent = '⏰ 时间到！';
            completeMessage.style.cssText = `
                font-size: 24px;
                font-weight: bold;
                color: #FF9800;
                text-align: center;
                margin: 20px 0;
            `;
            
            const restartBtn = document.createElement('button');
            restartBtn.textContent = '重新开始计时';
            restartBtn.style.cssText = `
                padding: 10px 20px;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
                align-self: center;
            `;
            
            restartBtn.addEventListener('click', () => {
                createTimerSetupUI();
            });
            
            contentArea.appendChild(completeMessage);
            contentArea.appendChild(restartBtn);
        };
        
        // 组装窗口
        container.appendChild(titleBar);
        container.appendChild(contentArea);
        document.body.appendChild(container);
        
        // 初始化UI
        createInitialUI();
        
        // 拖动功能
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        titleBar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            
            isDragging = true;
            const rect = container.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            container.style.cursor = 'move';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            container.style.left = (e.clientX - dragOffsetX) + 'px';
            container.style.top = (e.clientY - dragOffsetY) + 'px';
            container.style.right = 'auto';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            container.style.cursor = 'default';
        });
        
        // 最小化功能
        let isMinimized = false;
        let originalHeight = container.offsetHeight;
        
        minimizeBtn.addEventListener('click', () => {
            if (!isMinimized) {
                contentArea.style.display = 'none';
                container.style.height = '40px';
                minimizeBtn.textContent = '□';
                isMinimized = true;
            } else {
                contentArea.style.display = 'flex';
                container.style.height = originalHeight + 'px';
                minimizeBtn.textContent = '_';
                isMinimized = false;
            }
        });
        
        // 关闭功能
        closeBtn.addEventListener('click', () => {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            container.remove();
        });
        
        // 记录原始高度用于恢复
        originalHeight = container.offsetHeight;
    };
    
    // 延迟执行，确保页面加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createFloatingWindow);
    } else {
        createFloatingWindow();
    }
})();