(function() {
    'use strict';

    if (window.biliSpeedControlInjected) return;
    window.biliSpeedControlInjected = true;

    let controlArea = null;
    let speedIndicator = null;
    let currentVideo = null;
    let isControlVisible = false;
    let hideTimeout = null;
    let speedUpdateInterval = null;
    let isFullscreen = false;

    // === 新增：开关状态 ===
    let toggleBtn = null;
    let isEnabled = localStorage.getItem('bili-speed-control-enabled') !== 'false'; // 默认开启

    const CONFIG = {
        MIN_SPEED: 0.5,
        MAX_SPEED: 3.0,
        STEP_SIZE: 0.1,
        BACKWARD_SECONDS: 5,
        FORWARD_SECONDS: 15,
        TRIGGER_HEIGHT: 100,
        FADE_DELAY: 2000,
        SPEED_UPDATE_INTERVAL: 100
    };

    function getMainVideo() {
        return document.querySelector('.bpx-player-video-wrap video, .bpx-player-video-wrap bwp-video') ||
               document.querySelector('video, bwp-video');
    }

    function checkFullscreenStatus() {
        return !!(document.fullscreenElement ||
                 document.webkitFullscreenElement ||
                 document.mozFullScreenElement ||
                 document.msFullscreenElement);
    }

    function getCurrentContainer() {
        return document.fullscreenElement ||
               document.webkitFullscreenElement ||
               document.mozFullScreenElement ||
               document.msFullscreenElement ||
               document.body;
    }

    // === 新增：创建开关按钮 ===
    function createToggleButton() {
        const container = getCurrentContainer();
        const oldBtn = container.querySelector('#bili-speed-toggle');
        if (oldBtn && oldBtn.parentElement) {
            oldBtn.parentElement.removeChild(oldBtn);
        }

        const btn = document.createElement('div');
        btn.id = 'bili-speed-toggle';
        btn.title = isEnabled ? '倍速控制已开启，点击关闭' : '倍速控制已关闭，点击开启';
        btn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: ;
            cursor: pointer;
            z-index: 2147483646;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            transition: all 0.25s ease;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            user-select: none;
        `;
        updateToggleAppearance(btn);
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            toggleEnabled();
        });
        container.appendChild(btn);
        toggleBtn = btn;
        return btn;
    }

    // === 新增：更新开关外观 ===
    function updateToggleAppearance(btn) {
        if (!btn) btn = toggleBtn;
        if (!btn) return;
        if (isEnabled) {
            btn.style.background = 'rgba(0, 200, 100, 0.85)';
            btn.textContent = '✓';
            btn.style.color = '#fff';
        } else {
            btn.style.background = 'rgba(120, 120, 120, 0.7)';
            btn.textContent = '✕';
            btn.style.color = 'rgba(255, 255, 255, 0.6)';
        }
    }

    // === 新增：切换开关 ===
    function toggleEnabled() {
        isEnabled = !isEnabled;
        localStorage.setItem('bili-speed-control-enabled', String(isEnabled));
        updateToggleAppearance();
        if (toggleBtn) {
            toggleBtn.style.transform = 'scale(1.2)';
            setTimeout(() => { if (toggleBtn) toggleBtn.style.transform = 'scale(1)'; }, 150);
        }
        if (!isEnabled) {
            hideControlArea();
        }
        updateSpeedIndicatorState();
    }

    // === 新增：更新倍速提示的显示状态 ===
    function updateSpeedIndicatorState() {
        const indicator = document.getElementById('bili-speed-indicator');
        if (indicator) {
            indicator.style.opacity = isEnabled ? '1' : '0.3';
        }
    }

    function cleanupAllElements() {
        if (controlArea && controlArea.parentElement) {
            controlArea.parentElement.removeChild(controlArea);
            controlArea = null;
        }
        if (speedIndicator && speedIndicator.parentElement) {
            speedIndicator.parentElement.removeChild(speedIndicator);
            speedIndicator = null;
        }
        if (toggleBtn && toggleBtn.parentElement) {
            toggleBtn.parentElement.removeChild(toggleBtn);
            toggleBtn = null;
        }
        const animationStyle = document.getElementById('bili-speed-animation');
        if (animationStyle && animationStyle.parentElement) {
            animationStyle.parentElement.removeChild(animationStyle);
        }
        const actionText = document.getElementById('bili-action-text');
        if (actionText && actionText.parentElement) {
            actionText.parentElement.removeChild(actionText);
        }
        const adjustArrow = document.getElementById('bili-adjust-arrow');
        if (adjustArrow && adjustArrow.parentElement) {
            adjustArrow.parentElement.removeChild(adjustArrow);
        }
        if (speedUpdateInterval) {
            clearInterval(speedUpdateInterval);
            speedUpdateInterval = null;
        }
        isControlVisible = false;
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    }

    function createSpeedIndicator() {
        const container = getCurrentContainer();
        const oldIndicator = container.querySelector('#bili-speed-indicator');
        if (oldIndicator && oldIndicator.parentElement) {
            oldIndicator.parentElement.removeChild(oldIndicator);
        }
        const indicator = document.createElement('div');
        indicator.id = 'bili-speed-indicator';
        indicator.style.cssText = `
            position: absolute;
            top: 20px;
            left: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            font-size: 16px;
            font-weight: bold;
            padding: 10px 20px;
            border-radius: 10px;
            z-index: 2147483646;
            pointer-events: none;
            transition: opacity 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            backdrop-filter: blur(6px);
            border: 1px solid rgba(255, 255, 255, 0.25);
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 100px;
            opacity: ;
        `;
        const speedText = document.createElement('div');
        speedText.id = 'bili-speed-text';
        speedText.textContent = '1.0x';
        speedText.style.fontSize = '18px';
        speedText.style.fontWeight = '600';
        speedText.style.letterSpacing = '1px';
        indicator.appendChild(speedText);
        container.appendChild(indicator);
        return indicator;
    }

    function updateSpeedDisplay() {
        if (!currentVideo) return;
        const speed = currentVideo.playbackRate;
        const roundedSpeed = Math.round(speed * 10) / 10;
        const speedText = document.getElementById('bili-speed-text');
        if (speedText) {
            speedText.textContent = roundedSpeed + 'x';
        }
    }

    function createControlArea() {
        const container = getCurrentContainer();
        const oldArea = container.querySelector('#bili-speed-control-area');
        if (oldArea && oldArea.parentElement) {
            oldArea.parentElement.removeChild(oldArea);
        }
        const area = document.createElement('div');
        area.id = 'bili-speed-control-area';
        area.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: px;
            z-index: 2147483645;
            display: flex;
            transition: opacity 0.3s ease;
            opacity: 0;
            pointer-events: none;
            cursor: pointer;
        `;
        const leftSection = document.createElement('div');
        leftSection.id = 'bili-control-left';
        leftSection.style.cssText = `
            flex: 1;
            height: 100%;
            background: linear-gradient(to top, rgba(0, 100, 200, 0.3), transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        `;
        const leftContent = document.createElement('div');
        leftContent.style.cssText = `
            background: rgba(0, 100, 200, 0.7);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0.9;
        `;
        const leftIcon = document.createElement('div');
        leftIcon.textContent = '↶';
        leftIcon.style.fontSize = '20px';
        const leftText = document.createElement('div');
        leftText.textContent = '倒退5秒';
        leftText.style.fontWeight = '500';
        leftContent.appendChild(leftIcon);
        leftContent.appendChild(leftText);
        leftSection.appendChild(leftContent);
        const rightSection = document.createElement('div');
        rightSection.id = 'bili-control-right';
        rightSection.style.cssText = `
            flex: 1;
            height: 100%;
            background: linear-gradient(to top, rgba(200, 100, 0, 0.3), transparent);
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        `;
        const rightContent = document.createElement('div');
        rightContent.style.cssText = `
            background: rgba(200, 100, 0, 0.7);
            color: white;
            padding: 12px 24px;
            border-radius: 10px;
            font-size: 14px;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            opacity: 0.9;
        `;
        const rightIcon = document.createElement('div');
        rightIcon.textContent = '↷';
        rightIcon.style.fontSize = '20px';
        const rightText = document.createElement('div');
        rightText.textContent = '前进15秒';
        rightText.style.fontWeight = '500';
        rightContent.appendChild(rightIcon);
        rightContent.appendChild(rightText);
        rightSection.appendChild(rightContent);

        leftSection.addEventListener('mouseenter', () => {
            leftSection.style.background = 'linear-gradient(to top, rgba(0, 100, 200, 0.5), transparent)';
            leftContent.style.transform = 'scale(1.05)';
            leftContent.style.opacity = '1';
        });
        leftSection.addEventListener('mouseleave', () => {
            leftSection.style.background = 'linear-gradient(to top, rgba(0, 100, 200, 0.3), transparent)';
            leftContent.style.transform = 'scale(1)';
            leftContent.style.opacity = '0.9';
        });
        rightSection.addEventListener('mouseenter', () => {
            rightSection.style.background = 'linear-gradient(to top, rgba(200, 100, 0, 0.5), transparent)';
            rightContent.style.transform = 'scale(1.05)';
            rightContent.style.opacity = '1';
        });
        rightSection.addEventListener('mouseleave', () => {
            rightSection.style.background = 'linear-gradient(to top, rgba(200, 100, 0, 0.3), transparent)';
            rightContent.style.transform = 'scale(1)';
            rightContent.style.opacity = '0.9';
        });
        leftSection.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            handleBackwardClick();
        });
        rightSection.addEventListener('click', (e) => {
            if (!isEnabled) return;
            e.stopPropagation();
            e.preventDefault();
            handleForwardClick();
        });

        area.appendChild(leftSection);
        area.appendChild(rightSection);
        container.appendChild(area);
        return area;
    }

    function handleBackwardClick() {
        currentVideo = getMainVideo();
        if (!currentVideo) return;
        const newTime = Math.max(0, currentVideo.currentTime - CONFIG.BACKWARD_SECONDS);
        currentVideo.currentTime = newTime;
        showActionIndicator('↶ 倒退5秒');
    }

    function handleForwardClick() {
        currentVideo = getMainVideo();
        if (!currentVideo) return;
        const newTime = Math.min(currentVideo.duration, currentVideo.currentTime + CONFIG.FORWARD_SECONDS);
        currentVideo.currentTime = newTime;
        showActionIndicator('↷ 前进15秒');
    }

    function showActionIndicator(text) {
        if (!speedIndicator) {
            speedIndicator = createSpeedIndicator();
        }
        const indicator = document.getElementById('bili-speed-indicator');
        if (!indicator) return;
        const actionText = document.createElement('div');
        actionText.id = 'bili-action-text';
        actionText.textContent = text;
        actionText.style.cssText = `
            margin-left: 12px;
            padding-left: 12px;
            border-left: 1px solid rgba(255, 255, 255, 0.3);
            font-size: 14px;
            opacity: 0.9;
            font-weight: 500;
        `;
        const oldAction = document.getElementById('bili-action-text');
        if (oldAction && oldAction.parentElement) {
            oldAction.parentElement.removeChild(oldAction);
        }
        indicator.appendChild(actionText);
        setTimeout(() => {
            const currentAction = document.getElementById('bili-action-text');
            if (currentAction && currentAction.parentElement) {
                currentAction.parentElement.removeChild(currentAction);
            }
        }, 2000);
    }

    function showControlArea() {
        if (!isFullscreen || !isEnabled) return;
        if (!controlArea) {
            controlArea = createControlArea();
        }
        controlArea.style.opacity = '1';
        controlArea.style.pointerEvents = 'auto';
        isControlVisible = true;
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            hideControlArea();
        }, CONFIG.FADE_DELAY);
    }

    function hideControlArea() {
        if (controlArea) {
            controlArea.style.opacity = '0';
            controlArea.style.pointerEvents = 'none';
            isControlVisible = false;
        }
    }

    function adjustPlaybackSpeed(delta) {
        currentVideo = getMainVideo();
        if (!currentVideo) return;
        let newSpeed = currentVideo.playbackRate + delta;
        newSpeed = Math.max(CONFIG.MIN_SPEED, Math.min(CONFIG.MAX_SPEED, newSpeed));
        newSpeed = Math.round(newSpeed * 10) / 10;
        currentVideo.playbackRate = newSpeed;
        return newSpeed;
    }

    function handleWheelEvent(e) {
        if (!isEnabled || !isControlVisible || !isFullscreen) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const delta = e.deltaY > 0 ? CONFIG.STEP_SIZE : -CONFIG.STEP_SIZE;
        const newSpeed = adjustPlaybackSpeed(delta);
        showAdjustIndicator(newSpeed);
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(() => {
            hideControlArea();
        }, CONFIG.FADE_DELAY);
    }

    function showAdjustIndicator(speed) {
        if (!speedIndicator) {
            speedIndicator = createSpeedIndicator();
        }
        const indicator = document.getElementById('bili-speed-indicator');
        if (!indicator) return;
        const adjustArrow = document.createElement('div');
        adjustArrow.id = 'bili-adjust-arrow';
        adjustArrow.textContent = speed > currentVideo.playbackRate ? '↑' : '↓';
        adjustArrow.style.cssText = `
            margin-left: 8px;
            font-size: 16px;
            opacity: 0.8;
            animation: pulse 0.5s ease;
        `;
        if (!document.getElementById('bili-speed-animation')) {
            const style = document.createElement('style');
            style.id = 'bili-speed-animation';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.3); opacity: 1; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `;
            document.head.appendChild(style);
        }
        const oldArrow = document.getElementById('bili-adjust-arrow');
        if (oldArrow && oldArrow.parentElement) {
            oldArrow.parentElement.removeChild(oldArrow);
        }
        indicator.appendChild(adjustArrow);
        setTimeout(() => {
            const currentArrow = document.getElementById('bili-adjust-arrow');
            if (currentArrow && currentArrow.parentElement) {
                currentArrow.parentElement.removeChild(currentArrow);
            }
        }, 1000);
    }

    function handleMouseMove(e) {
        if (!isFullscreen) return;
        const container = getCurrentContainer();
        const rect = container.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const containerHeight = rect.height;
        const isInTriggerZone = mouseY > containerHeight - CONFIG.TRIGGER_HEIGHT;
        if (isInTriggerZone) {
            showControlArea();
        } else if (isControlVisible && !controlArea.contains(e.target)) {
            if (hideTimeout) clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                hideControlArea();
            }, 500);
        }
    }

    function initSpeedUpdate() {
        if (speedUpdateInterval) clearInterval(speedUpdateInterval);
        speedUpdateInterval = setInterval(() => {
            updateSpeedDisplay();
        }, CONFIG.SPEED_UPDATE_INTERVAL);
    }

    function setupWheelInterceptor() {
        document.addEventListener('wheel', handleWheelEvent, { passive: false, capture: true });
    }

    function disableOriginalWheelControl() {
        const video = getMainVideo();
        if (video) {
            video.addEventListener('wheel', (e) => {
                if (isEnabled && isControlVisible && isFullscreen) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }, { passive: false, capture: true });
        }
        const playerContainer = document.querySelector('.bpx-player-video-wrap, .bpx-player-container');
        if (playerContainer) {
            playerContainer.addEventListener('wheel', (e) => {
                if (isEnabled && isControlVisible && isFullscreen) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                }
            }, { passive: false, capture: true });
        }
    }

    function initFullscreenControl() {
        isFullscreen = checkFullscreenStatus();
        if (isFullscreen) {
            currentVideo = getMainVideo();
            if (!currentVideo) {
                setTimeout(initFullscreenControl, 500);
                return;
            }
            speedIndicator = createSpeedIndicator();
            updateSpeedDisplay();
            createToggleButton();
            updateSpeedIndicatorState();
            initSpeedUpdate();
            disableOriginalWheelControl();
            setupEventListeners();
            console.log('🎬 全屏控制已激活');
        } else {
            cleanupAllElements();
            console.log('🎬 全屏控制已清理');
        }
    }

    function setupEventListeners() {
        const container = getCurrentContainer();
        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', () => {
            if (isControlVisible) {
                hideControlArea();
            }
        });
        if (controlArea) {
            controlArea.addEventListener('mouseenter', () => {
                if (hideTimeout) clearTimeout(hideTimeout);
            });
            controlArea.addEventListener('mouseleave', () => {
                hideTimeout = setTimeout(() => {
                    hideControlArea();
                }, 500);
            });
        }
        if (currentVideo) {
            currentVideo.addEventListener('ratechange', updateSpeedDisplay);
        }
    }

    function handleFullscreenChange() {
        setTimeout(() => {
            initFullscreenControl();
        }, 100);
    }

    function init() {
        setupWheelInterceptor();
        isFullscreen = checkFullscreenStatus();
        if (isFullscreen) {
            initFullscreenControl();
        }
        const fullscreenEvents = [
            'fullscreenchange',
            'webkitfullscreenchange',
            'mozfullscreenchange',
            'MSFullscreenChange'
        ];
        fullscreenEvents.forEach(event => {
            document.addEventListener(event, handleFullscreenChange);
        });
        console.log('🎬 B站全屏控制脚本已加载（开关：' + (isEnabled ? '开启' : '关闭') + '）');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();