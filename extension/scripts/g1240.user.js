(function() {
    'use strict';

    const TARGET_SPEED = 1.5;
    const appliedVideos = new WeakSet();

    // 判断当前是否为B站直播间
    function isLiveRoom() {
        // 方式1：URL 判断（live.bilibili.com 或 bilibili.com 路径含 /live/）
        const url = location.href;
        if (/^https?:\/\/live\.bilibili\.com/.test(url)) return true;
        if (/^https?:\/\/www\.bilibili\.com\/live\//.test(url)) return true;

        // 方式2：DOM 元素判断（直播间特有播放器容器）
        if (document.querySelector('#live-player')) return true;
        if (document.querySelector('.live-player')) return true;
        if (document.querySelector('.player-area-ctnr')) return true;
        if (document.querySelector('#playerLive')) return true;

        // 方式3：meta 标签或页面特征判断
        const metaItem = document.querySelector('meta[itemprop="url"]');
        if (metaItem && /\/live\//.test(metaItem.content)) return true;

        return false;
    }

    function setPlaybackSpeed() {
        const video = document.querySelector('video');
        if (!video) return false;

        if (appliedVideos.has(video)) return true;

        video.playbackRate = TARGET_SPEED;
        appliedVideos.add(video);
        console.log('[1.5x助手] 已设置播放速度为 1.5x');
        showNotification('已自动设置为 1.5x 倍速');
        return true;
    }

    function setSpeedViaUI() {
        const speedBtn = document.querySelector('.bpx-player-ctrl-playbackrate');
        if (!speedBtn) return false;

        speedBtn.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
        speedBtn.click();

        setTimeout(() => {
            const items = document.querySelectorAll('.bpx-player-ctrl-playbackrate-menu-item');
            for (const item of items) {
                if (item.textContent.trim().includes('1.5')) {
                    item.click();
                    const video = document.querySelector('video');
                    if (video) appliedVideos.add(video);
                    console.log('[1.5x助手] 通过UI点击设置1.5x');
                    showNotification('已自动设置为 1.5x 倍速');
                    return;
                }
            }
            setPlaybackSpeed();
        }, 500);

        return true;
    }

    function showNotification(text) {
        let notification = document.getElementById('speed-helper-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'speed-helper-notification';
            notification.style.cssText = `
                position: fixed; top: 80px; right: 20px; z-index: 99999;
                background: rgba(0, 161, 214, 0.9); color: white;
                padding: 8px 16px; border-radius: 6px; font-size: 13px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                transition: opacity 0.5s; pointer-events: none;
            `;
            document.body.appendChild(notification);
        }
        notification.textContent = text;
        notification.style.opacity = '1';
        clearTimeout(notification._hideTimer);
        notification._hideTimer = setTimeout(() => {
            notification.style.opacity = '0';
        }, 2500);
    }

    function execute() {
        // 直播间检测：如果是直播间则跳过加速
        if (isLiveRoom()) {
            console.log('[1.5x助手] 检测到直播间，跳过加速');
            return;
        }

        const success = setPlaybackSpeed();
        if (!success) {
            setTimeout(() => setSpeedViaUI(), 1000);
        }
    }

    // SPA 路由变化检测
    const originalPushState = history.pushState;
    history.pushState = function() {
        originalPushState.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function() {
        originalReplaceState.apply(this, arguments);
        window.dispatchEvent(new Event('locationchange'));
    };

    window.addEventListener('popstate', () => setTimeout(execute, 800));
    window.addEventListener('locationchange', () => setTimeout(execute, 800));

    // 监听新 video 元素出现
    const domObserver = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === 1 && (
                    node.querySelector?.('video') ||
                    node.classList?.contains('bpx-player-container') ||
                    node.classList?.contains('bpx-player-video-wrap')
                )) {
                    setTimeout(execute, 500);
                    return;
                }
            }
        }
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    // 初始执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(execute, 1500));
    } else {
        setTimeout(execute, 1500);
    }
})();