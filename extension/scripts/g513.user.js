(function() {
'use strict';
// 防止重复执行
if (window.autoStudyV2Enabled) return;
window.autoStudyV2Enabled = true;
console.log('自动学习插件V2已启动 - mooc.ctt.cn');

// 配置参数
const CONFIG = {
    checkInterval: 5000, // 检查间隔（毫秒）
    videoEndThreshold: 10, // 视频结束前多少秒开始检查
    waitAfterVideoEnd: 3000, // 视频结束后等待时间（确保学习时长记录）
    popupCheckInterval: 2000, // 弹窗检查间隔（毫秒）
    debug: true,
    autoStart: true, // 是否自动启动
    autoHandlePopups: true // 是否自动处理弹窗
};

// 状态管理
const STATE = {
    isRunning: false,
    currentSectionId: null,
    lastCheckTime: 0,
    intervalId: null,
    popupIntervalId: null,
    observer: null,
    lastPopupHandledTime: 0,
    popupHandledCount: 0
};

// 工具函数
function log(...args) {
    if (CONFIG.debug) {
        console.log('[AutoStudyV2]', ...args);
    }
}

// 弹窗处理函数
function handlePopup() {
    if (!CONFIG.autoHandlePopups || !STATE.isRunning) {
        return false;
    }
    
    const now = Date.now();
    // 防止频繁处理弹窗，至少间隔1秒
    if (now - STATE.lastPopupHandledTime < 1000) {
        return false;
    }
    
    log('开始检查弹窗...');
    
    // 1. 查找常见的弹窗元素
    const popupSelectors = [
        // 模态框类弹窗
        '.modal-dialog',
        '.modal-content',
        '.ant-modal-content',
        '.el-dialog',
        '.dialog',
        '.popup',
        '.popup-content',
        // 确认框类
        '.confirm-dialog',
        '.alert-dialog',
        '.message-box',
        // 特定按钮类
        'button:contains("继续")',
        'button:contains("确定")',
        'button:contains("确认")',
        'button:contains("下一步")',
        'button:contains("继续学习")',
        'a:contains("继续")',
        'a:contains("确定")',
        'span:contains("继续")',
        'div:contains("继续")'
    ];
    
    let popupFound = false;
    let continueButton = null;
    
    // 先尝试精确匹配
    for (const selector of popupSelectors) {
        try {
            // 使用更灵活的匹配方式
            if (selector.includes('contains')) {
                // 处理文本包含选择器
                const textMatch = selector.match(/contains$"([^"]+)"$/);
                if (textMatch) {
                    const text = textMatch[1];
                    const elements = document.querySelectorAll('*');
                    for (const el of elements) {
                        if (el.textContent && el.textContent.includes(text)) {
                            // 检查是否是按钮或可点击元素
                            const tagName = el.tagName.toLowerCase();
                            if (tagName === 'button' || tagName === 'a' || 
                                tagName === 'span' || tagName === 'div' || 
                                tagName === 'li' || el.onclick || 
                                el.getAttribute('onclick') || 
                                el.classList.contains('btn') ||
                                el.classList.contains('button')) {
                                
                                log(`找到弹窗按钮: ${tagName} 文本: "${text}"`);
                                continueButton = el;
                                popupFound = true;
                                break;
                            }
                        }
                    }
                }
            } else {
                // 常规CSS选择器
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    log(`找到弹窗元素: ${selector}, 数量: ${elements.length}`);
                    
                    // 查找弹窗内的"继续"按钮
                    for (const element of elements) {
                        // 在弹窗内查找按钮
                        const buttons = element.querySelectorAll('button, a, [role="button"], .btn');
                        for (const btn of buttons) {
                            const btnText = btn.textContent ? btn.textContent.trim() : '';
                            if (btnText.includes('继续') || btnText.includes('确定') || 
                                btnText.includes('确认') || btnText.includes('下一步')) {
                                continueButton = btn;
                                popupFound = true;
                                log(`在弹窗内找到按钮: ${btnText}`);
                                break;
                            }
                        }
                        
                        // 如果没找到，尝试查找整个文档
                        if (!popupFound) {
                            const allContinueButtons = document.querySelectorAll('button, a');
                            for (const btn of allContinueButtons) {
                                const btnText = btn.textContent ? btn.textContent.trim() : '';
                                if (btnText.includes('继续') && 
                                    !btnText.includes('暂停') && 
                                    !btnText.includes('停止')) {
                                    // 检查按钮是否可见且在视口内
                                    const rect = btn.getBoundingClientRect();
                                    if (rect.width > 0 && rect.height > 0 &&
                                        rect.top >= 0 && rect.left >= 0 &&
                                        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                                        rect.right <= (window.innerWidth || document.documentElement.clientWidth)) {
                                        
                                        continueButton = btn;
                                        popupFound = true;
                                        log(`找到可见的继续按钮: ${btnText}`);
                                        break;
                                    }
                                }
                            }
                        }
                        
                        if (popupFound) break;
                    }
                }
            }
            
            if (popupFound) break;
        } catch (error) {
            log(`检查选择器 ${selector} 时出错:`, error.message);
        }
    }
    
    // 2. 如果找到继续按钮，点击它
    if (continueButton && popupFound) {
        try {
            log(`尝试点击继续按钮:`, continueButton);
            
            // 先尝试标准点击
            continueButton.click();
            
            // 如果可能，也尝试触发其他事件
            setTimeout(() => {
                // 触发mousedown和mouseup事件
                const mouseDownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                const mouseUpEvent = new MouseEvent('mouseup', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                
                continueButton.dispatchEvent(mouseDownEvent);
                continueButton.dispatchEvent(mouseUpEvent);
                continueButton.dispatchEvent(clickEvent);
                
                // 对于表单按钮，尝试提交表单
                if (continueButton.form) {
                    continueButton.form.submit();
                }
            }, 100);
            
            STATE.lastPopupHandledTime = now;
            STATE.popupHandledCount++;
            
            // 更新控制面板信息
            updatePanelInfo(`已处理弹窗 #${STATE.popupHandledCount}`);
            
            log(`成功点击继续按钮，已处理弹窗数量: ${STATE.popupHandledCount}`);
            return true;
        } catch (error) {
            log(`点击继续按钮失败:`, error.message);
            return false;
        }
    }
    
    // 3. 检查是否有遮罩层需要关闭
    const overlaySelectors = ['.modal-backdrop', '.overlay', '.mask', '.v-modal'];
    for (const selector of overlaySelectors) {
        const overlay = document.querySelector(selector);
        if (overlay && overlay.style.display !== 'none') {
            log(`找到遮罩层: ${selector}`);
            // 尝试点击遮罩层关闭
            overlay.click();
            STATE.lastPopupHandledTime = now;
            return true;
        }
    }
    
    return false;
}

// 启动弹窗检查
function startPopupChecker() {
    if (STATE.popupIntervalId) {
        clearInterval(STATE.popupIntervalId);
    }
    
    STATE.popupIntervalId = setInterval(() => {
        if (STATE.isRunning && CONFIG.autoHandlePopups) {
            handlePopup();
        }
    }, CONFIG.popupCheckInterval);
    
    log('弹窗检查器已启动');
}

// 停止弹窗检查
function stopPopupChecker() {
    if (STATE.popupIntervalId) {
        clearInterval(STATE.popupIntervalId);
        STATE.popupIntervalId = null;
        log('弹窗检查器已停止');
    }
}

// 查找所有章节元素
function findAllSections() {
    const sections = document.querySelectorAll('.chapter-list-box');
    const result = [];

    sections.forEach(section => {
        const statusElement = section.querySelector('[id^="D395finishStatus-"]');
        const timeElement = section.querySelector('[id^="D395time-"]');
        const iconElement = section.querySelector('[id^="D395icon-"]');

        if (statusElement) {
            result.push({
                element: section,
                id: section.id,
                status: statusElement.textContent.trim(),
                time: timeElement ? timeElement.textContent.trim() : '',
                icon: iconElement ? iconElement.className : '',
                isFocus: section.classList.contains('focus')
            });
        }
    });

    return result;
}

// 查找当前正在学习的章节
function findCurrentSection() {
    const sections = findAllSections();

    // 1. 首先查找"学习中"状态的章节
    for (const section of sections) {
        if (section.status === '学习中' || section.status.includes('学习中')) {
            log('找到正在学习的章节:', section.id, '状态:', section.status);
            return section;
        }
    }

    // 2. 查找有focus类的章节
    for (const section of sections) {
        if (section.isFocus) {
            log('找到focus章节:', section.id, '状态:', section.status);
            return section;
        }
    }

    // 3. 查找第一个"开始学习"的章节
    for (const section of sections) {
        if (section.status === '开始学习' || section.status.includes('开始学习')) {
            log('找到可开始学习的章节:', section.id);
            return section;
        }
    }

    log('未找到可学习的章节');
    return null;
}

// 查找下一个章节
function findNextSection(currentSectionId) {
    const sections = findAllSections();
    let foundCurrent = false;

    for (const section of sections) {
        if (section.id === currentSectionId) {
            foundCurrent = true;
            continue;
        }

        if (foundCurrent) {
            if (section.status === '开始学习' || section.status.includes('开始学习')) {
                log('找到下一章节:', section.id);
                return section;
            }
        }
    }

    log('没有更多章节需要学习');
    return null;
}

// 获取视频播放器
function getVideoPlayer() {
    // 尝试多个可能的播放器ID
    const playerIds = ['#D555player', '#D480player', '.video-js', 'video'];

    for (const selector of playerIds) {
        const player = document.querySelector(selector);
        if (player) {
            log('找到视频播放器:', selector);
            return player;
        }
    }

    return null;
}

// 检查视频状态
function checkVideoStatus() {
    const player = getVideoPlayer();
    if (!player) {
        log('未找到视频播放器');
        return null;
    }

    // 尝试获取video.js实例
    const playerId = player.id;
    if (playerId && window.videojs) {
        try {
            const videojsPlayer = videojs.getPlayer(playerId);
            if (videojsPlayer) {
                return {
                    type: 'videojs',
                    player: videojsPlayer,
                    isPlaying: !videojsPlayer.paused(),
                    currentTime: videojsPlayer.currentTime(),
                    duration: videojsPlayer.duration(),
                    ended: videojsPlayer.ended(),
                    readyState: videojsPlayer.readyState()
                };
            }
        } catch (e) {
            log('获取video.js实例失败:', e.message);
        }
    }

    // 尝试获取原生video元素
    const videoElement = player.querySelector('video') || player;
    if (videoElement && videoElement.tagName === 'VIDEO') {
        return {
            type: 'native',
            player: videoElement,
            isPlaying: !videoElement.paused,
            currentTime: videoElement.currentTime,
            duration: videoElement.duration,
            ended: videoElement.ended,
            readyState: videoElement.readyState
        };
    }

    // 检查播放时间显示
    const timeDisplay = document.querySelector('.vjs-current-time-display');
    const durationDisplay = document.querySelector('.vjs-duration-display');

    if (timeDisplay && durationDisplay) {
        const currentTimeText = timeDisplay.textContent.replace('当前时间', '').trim();
        const durationText = durationDisplay.textContent.replace('时长', '').trim();

        return {
            type: 'display',
            currentTimeText: currentTimeText,
            durationText: durationText,
            isPlaying: document.querySelector('.vjs-playing') !== null
        };
    }

    return null;
}

// 点击开始学习
function startStudy(section) {
    if (!section || !section.element) {
        log('无效的章节元素');
        return false;
    }

    try {
        log('开始学习章节:', section.id, '状态:', section.status);

        // 模拟点击
        const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
        });

        section.element.dispatchEvent(clickEvent);

        // 如果点击后没有反应，尝试直接触发相关事件
        setTimeout(() => {
            const statusElement = section.element.querySelector('[id^="D395finishStatus-"]');
            if (statusElement && statusElement.textContent.includes('开始学习')) {
                log('点击后状态未改变，尝试其他方法');
                section.element.click(); // 再次点击
            }
        }, 1000);

        return true;
    } catch (error) {
        log('开始学习失败:', error);
        return false;
    }
}

// 主学习逻辑
function studyLogic() {
    if (!STATE.isRunning) {
        log('自动学习已停止');
        return;
    }

    const now = Date.now();
    if (now - STATE.lastCheckTime < CONFIG.checkInterval) {
        return;
    }

    STATE.lastCheckTime = now;
    log('执行学习检查...');

    // 在每次学习检查时也检查弹窗
    if (CONFIG.autoHandlePopups) {
        handlePopup();
    }

    // 1. 查找当前章节
    const currentSection = findCurrentSection();

    if (!currentSection) {
        log('未找到当前章节');
        return;
    }

    // 更新状态
    if (currentSection.id !== STATE.currentSectionId) {
        STATE.currentSectionId = currentSection.id;
        log('切换到新章节:', currentSection.id);
    }

    // 2. 根据章节状态处理
    if (currentSection.status === '学习中' || currentSection.status.includes('学习中')) {
        handleLearningSection(currentSection);
    } else if (currentSection.status === '开始学习' || currentSection.status.includes('开始学习')) {
        handleReadySection(currentSection);
    } else if (currentSection.status === '复习') {
        handleReviewSection(currentSection);
    }
}

// 处理"学习中"章节
function handleLearningSection(section) {
    log('处理学习中章节:', section.id);

    const videoStatus = checkVideoStatus();

    if (videoStatus) {
        log('视频状态:', {
            type: videoStatus.type,
            isPlaying: videoStatus.isPlaying,
            currentTime: videoStatus.currentTime,
            duration: videoStatus.duration,
            ended: videoStatus.ended
        });

        // 检查视频是否结束或接近结束
        let shouldSwitch = false;

        if (videoStatus.ended) {
            log('视频已结束');
            shouldSwitch = true;
        } else if (videoStatus.duration && videoStatus.currentTime) {
            const timeLeft = videoStatus.duration - videoStatus.currentTime;
            if (timeLeft <= CONFIG.videoEndThreshold) {
                log(`视频即将结束，剩余${timeLeft.toFixed(1)}秒`);
                shouldSwitch = true;
            }
        }

        if (shouldSwitch) {
            log('准备切换到下一章节');
            setTimeout(() => {
                const nextSection = findNextSection(section.id);
                if (nextSection) {
                    log('切换到下一章节:', nextSection.id);
                    startStudy(nextSection);
                }
            }, CONFIG.waitAfterVideoEnd);
        }
    } else {
        log('无法获取视频状态，检查章节时间');

        // 检查剩余时间
        if (section.time && section.time.includes('剩余')) {
            const timeMatch = section.time.match(/剩余(\d+):(\d+)/);
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                const totalSeconds = minutes * 60 + seconds;

                if (totalSeconds <= CONFIG.videoEndThreshold) {
                    log(`章节剩余时间${totalSeconds}秒，准备切换`);
                    setTimeout(() => {
                        const nextSection = findNextSection(section.id);
                        if (nextSection) {
                            startStudy(nextSection);
                        }
                    }, CONFIG.waitAfterVideoEnd);
                }
            }
        }
    }
}

// 处理"开始学习"章节
function handleReadySection(section) {
    log('处理可开始学习章节:', section.id);
    startStudy(section);
}

// 处理"复习"章节
function handleReviewSection(section) {
    log('处理复习章节:', section.id);

    // 如果是复习状态，直接跳到下一个章节
    const nextSection = findNextSection(section.id);
    if (nextSection) {
        log('复习章节，跳过到下一章节:', nextSection.id);
        startStudy(nextSection);
    }
}

// 初始化自动学习
function initAutoStudy() {
    log('初始化自动学习系统V2');

    // 启动定期检查
    STATE.intervalId = setInterval(studyLogic, CONFIG.checkInterval);

    // 启动弹窗检查
    if (CONFIG.autoHandlePopups) {
        startPopupChecker();
    }

    // 监听页面变化
    STATE.observer = new MutationObserver((mutations) => {
        let shouldCheck = false;

        for (const mutation of mutations) {
            if (mutation.type === 'childList' || mutation.type === 'attributes') {
                shouldCheck = true;
                break;
            }
        }

        if (shouldCheck) {
            log('页面DOM发生变化，重新检查');
            setTimeout(studyLogic, 1000);
            
            // DOM变化时也检查弹窗
            if (CONFIG.autoHandlePopups) {
                setTimeout(handlePopup, 500);
            }
        }
    });

    STATE.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'id', 'style']
    });

    // 监听视频事件
    const player = getVideoPlayer();
    if (player) {
        player.addEventListener('ended', () => {
            log('视频播放结束事件触发');
            setTimeout(studyLogic, 1000);
        });

        player.addEventListener('play', () => {
            log('视频开始播放');
        });

        player.addEventListener('pause', () => {
            log('视频暂停');
        });
    }

    // 监听hashchange（SPA导航）
    window.addEventListener('hashchange', () => {
        log('页面hash变化，重新初始化');
        setTimeout(() => {
            STATE.currentSectionId = null;
            studyLogic();
        }, 2000);
    });

    // 设置状态为运行中
    STATE.isRunning = CONFIG.autoStart;

    // 立即执行一次检查
    setTimeout(studyLogic, 2000);

    // 添加清理函数
    window.cleanupAutoStudyV2 = () => {
        if (STATE.intervalId) {
            clearInterval(STATE.intervalId);
            STATE.intervalId = null;
        }

        if (STATE.popupIntervalId) {
            clearInterval(STATE.popupIntervalId);
            STATE.popupIntervalId = null;
        }

        if (STATE.observer) {
            STATE.observer.disconnect();
            STATE.observer = null;
        }

        STATE.isRunning = false;
        window.autoStudyV2Enabled = false;
        log('自动学习V2已停止');
    };
}

// 增强版控制面板
function addEnhancedControlPanel() {
    // 移除旧的控制面板
    const oldPanel = document.getElementById('auto-study-control');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('div');
    panel.id = 'auto-study-control-v2';
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 12px 15px;
        border-radius: 8px;
        z-index: 10000;
        font-size: 12px;
        font-family: Arial, sans-serif;
        min-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        border: 1px solid rgba(255,255,255,0.1);
        user-select: none;
    `;

    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="font-weight: bold; font-size: 14px;">📚 自动学习插件 V2</div>
            <div id="auto-study-drag" style="cursor: move; opacity: 0.7;">≡</div>
        </div>
        <div style="margin-bottom: 8px; padding: 6px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div>状态: <span id="auto-study-status-v2" style="color: ${CONFIG.autoStart ? '#4CAF50' : '#ff9800'}; font-weight: bold;">${CONFIG.autoStart ? '运行中' : '已停止'}</span></div>
            <div id="auto-study-info" style="font-size: 11px; opacity: 0.8; margin-top: 4px;">正在检测...</div>
            <div id="auto-study-popup-info" style="font-size: 10px; opacity: 0.6; margin-top: 2px;">弹窗处理: <span id="popup-count">0</span></div>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <button id="auto-study-toggle" style="padding: 6px; background: ${CONFIG.autoStart ? '#ff4444' : '#4CAF50'}; border: none; color: white; border-radius: 4px; cursor: pointer; font-weight: bold;">
                ${CONFIG.autoStart ? '⏸️ 暂停' : '▶️ 开始'}
            </button>
            <button id="auto-study-next" style="padding: 6px; background: #2196F3; border: none; color: white; border-radius: 4px; cursor: pointer;">
                ⏭️ 下一节
            </button>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 8px;">
            <button id="auto-study-popup-toggle" style="padding: 6px; background: ${CONFIG.autoHandlePopups ? '#4CAF50' : '#666'}; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">
                ${CONFIG.autoHandlePopups ? '✅ 弹窗处理' : '❌ 弹窗处理'}
            </button>
            <button id="auto-study-test-popup" style="padding: 6px; background: #9C27B0; border: none; color: white; border-radius: 4px; cursor: pointer; font-size: 11px;">
                🧪 测试弹窗
            </button>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 11px; opacity: 0.7;">
            <button id="auto-study-settings" style="background: none; border: none; color: white; cursor: pointer;">设置</button>
            <button id="auto-study-help" style="background: none; border: none; color: white; cursor: pointer;">帮助</button>
        </div>
    `;

    document.body.appendChild(panel);

    // 拖拽功能
    let isDragging = false;
    let offsetX, offsetY;

    panel.querySelector('#auto-study-drag').addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.offsetLeft;
        offsetY = e.clientY - panel.offsetTop;
        panel.style.opacity = '0.7';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            const x = e.clientX - offsetX;
            const y = e.clientY - offsetY;

            // 限制在窗口内
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            panel.style.left = Math.max(0, Math.min(x, maxX)) + 'px';
            panel.style.top = Math.max(0, Math.min(y, maxY)) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        panel.style.opacity = '1';
    });

    // 控制按钮事件
    panel.querySelector('#auto-study-toggle').addEventListener('click', () => {
        STATE.isRunning = !STATE.isRunning;
        const statusElement = panel.querySelector('#auto-study-status-v2');
        const toggleButton = panel.querySelector('#auto-study-toggle');

        if (STATE.isRunning) {
            statusElement.textContent = '运行中';
            statusElement.style.color = '#4CAF50';
            toggleButton.textContent = '⏸️ 暂停';
            toggleButton.style.background = '#ff4444';
            log('自动学习已启动');
            
            // 启动弹窗检查
            if (CONFIG.autoHandlePopups) {
                startPopupChecker();
            }
        } else {
            statusElement.textContent = '已暂停';
            statusElement.style.color = '#ff9800';
            toggleButton.textContent = '▶️ 开始';
            toggleButton.style.background = '#4CAF50';
            log('自动学习已暂停');
            
            // 停止弹窗检查
            stopPopupChecker();
        }
    });

    // 弹窗处理开关
    panel.querySelector('#auto-study-popup-toggle').addEventListener('click', () => {
        CONFIG.autoHandlePopups = !CONFIG.autoHandlePopups;
        const popupToggleButton = panel.querySelector('#auto-study-popup-toggle');
        
        if (CONFIG.autoHandlePopups) {
            popupToggleButton.textContent = '✅ 弹窗处理';
            popupToggleButton.style.background = '#4CAF50';
            log('弹窗处理已开启');
            
            if (STATE.isRunning) {
                startPopupChecker();
            }
        } else {
            popupToggleButton.textContent = '❌ 弹窗处理';
            popupToggleButton.style.background = '#666';
            log('弹窗处理已关闭');
            
            stopPopupChecker();
        }
    });

    // 测试弹窗按钮
    panel.querySelector('#auto-study-test-popup').addEventListener('click', () => {
        log('手动测试弹窗处理');
        const result = handlePopup();
        if (result) {
            updatePanelInfo('测试: 找到并处理了弹窗');
        } else {
            updatePanelInfo('测试: 未找到弹窗');
        }
    });

    // 下一节按钮
    panel.querySelector('#auto-study-next').addEventListener('click', () => {
        const currentSection = findCurrentSection();
        if (currentSection) {
            const nextSection = findNextSection(currentSection.id);
            if (nextSection) {
                log('手动切换到下一节:', nextSection.id);
                startStudy(nextSection);
                updatePanelInfo(`正在切换到: ${nextSection.id}`);
            } else {
                updatePanelInfo('没有更多章节');
            }
        }
    });

    // 更新面板信息
    function updatePanelInfo(text) {
        const infoElement = panel.querySelector('#auto-study-info');
        infoElement.textContent = text;
        infoElement.style.color = '#4CAF50';

        // 3秒后恢复
        setTimeout(() => {
            const currentSection = findCurrentSection();
            if (currentSection) {
                infoElement.textContent = `当前: ${currentSection.status}`;
                infoElement.style.color = '';
            }
        }, 3000);
    }

    // 更新弹窗计数
    function updatePopupCount() {
        const popupCountElement = panel.querySelector('#popup-count');
        if (popupCountElement) {
            popupCountElement.textContent = STATE.popupHandledCount;
        }
    }

    // 定期更新面板信息
    setInterval(() => {
        if (STATE.isRunning) {
            const currentSection = findCurrentSection();
            const infoElement = panel.querySelector('#auto-study-info');

            if (currentSection) {
                let infoText = `${currentSection.status}`;
                if (currentSection.time) {
                    infoText += ` | ${currentSection.time}`;
                }
                infoElement.textContent = infoText;
            }
            
            // 更新弹窗计数
            updatePopupCount();
        }
    }, 5000);

    // 设置按钮
    panel.querySelector('#auto-study-settings').addEventListener('click', () => {
        const settings = prompt('设置检查间隔（毫秒）:', CONFIG.checkInterval);
        if (settings && !isNaN(settings)) {
            CONFIG.checkInterval = parseInt(settings);
            if (STATE.intervalId) {
                clearInterval(STATE.intervalId);
                STATE.intervalId = setInterval(studyLogic, CONFIG.checkInterval);
            }
            updatePanelInfo(`间隔设置为: ${CONFIG.checkInterval}ms`);
        }
    });

    // 帮助按钮
    panel.querySelector('#auto-study-help').addEventListener('click', () => {
        alert(`自动学习插件 V2 - 弹窗优化版

功能：
1. 自动检测视频播放状态
2. 视频结束后自动切换到下一章节
3. 自动处理弹窗（点击"继续"按钮）
4. 支持跨页面学习
5. 可手动控制

弹窗处理：
- 自动检测常见弹窗类型
- 自动点击"继续"、"确定"等按钮
- 可手动开关弹窗处理功能
- 显示已处理弹窗数量

当前配置：
- 检查间隔: ${CONFIG.checkInterval}ms
- 视频结束阈值: ${CONFIG.videoEndThreshold}秒
- 弹窗检查间隔: ${CONFIG.popupCheckInterval}ms
- 弹窗处理: ${CONFIG.autoHandlePopups ? '开启' : '关闭'}
- 调试模式: ${CONFIG.debug ? '开启' : '关闭'}

已处理弹窗: ${STATE.popupHandledCount}个`);
    });
}

// 页面加载完成后启动
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initAutoStudy();
        setTimeout(addEnhancedControlPanel, 1000);
    });
} else {
    initAutoStudy();
    setTimeout(addEnhancedControlPanel, 1000);
}
})();