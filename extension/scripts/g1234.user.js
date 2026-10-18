// ==UserScript==
// @name         B站视频键盘倍速控制脚本（终极稳定版）
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  彻底修复倍速加减不精确、多标签页冲突、快速按键失效的问题
// @author       Gemini
// @match        *://www.bilibili.com/video/*
// @match        *://www.bilibili.com/list/*
// @match        *://www.bilibili.com/bangumi/play/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
    'use strict';

    // 1. 终极防多实例注入（绑定在更深层的 document 节点上）
    if (document.documentElement.dataset.biliSpeedFixed === "true") {
        return;
    }
    document.documentElement.dataset.biliSpeedFixed = "true";

    // 2. 独立状态管理（核心修复点）
    // 不再从 video 元素读取当前倍速，而是自己维护一个变量
    let currentTargetSpeed = null;

    // 智能获取B站【正在播放】的主视频
    function getMainVideo() {
        // B站的播放器容器内的视频优先级最高
        const primaryVideo = document.querySelector('.bpx-player-video-wrap video, .bpx-player-video-wrap bwp-video');
        if (primaryVideo) return primaryVideo;

        // 兜底策略：找面积最大的 video（过滤掉隐藏的预加载视频）
        const videos = Array.from(document.querySelectorAll('video, bwp-video'));
        if (videos.length === 0) return null;
        
        return videos.reduce((prev, current) => {
            return (prev.clientWidth * prev.clientHeight > current.clientWidth * current.clientHeight) ? prev : current;
        });
    }

    function getContainer() {
        return document.fullscreenElement || 
               document.webkitFullscreenElement || 
               document.mozFullScreenElement ||
               document.msFullscreenElement || 
               document.body;
    }

    // 防抖显示的计时器
    let tipTimeout = null;

    function showSpeedTip(speed) {
        let tip = document.getElementById('bili-custom-speed-tip');
        const container = getContainer();

        // 如果提示框不存在则创建
        if (!tip) {
            tip = document.createElement('div');
            tip.id = 'bili-custom-speed-tip';
            tip.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.75);
                color: #fff;
                font-size: 48px;
                font-weight: bold;
                padding: 16px 36px;
                border-radius: 12px;
                z-index: 2147483647;
                pointer-events: none;
                transition: opacity 0.15s ease-out;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                backdrop-filter: blur(4px);
            `;
            container.appendChild(tip);
        }

        // 适配全屏定位
        tip.style.position = (container === document.body) ? 'fixed' : 'absolute';
        
        // 更新内容和透明度
        tip.textContent = Number(speed).toFixed(1) + 'x';
        tip.style.opacity = '1';

        // 重置消失计时器
        if (tipTimeout) clearTimeout(tipTimeout);
        tipTimeout = setTimeout(() => {
            tip.style.opacity = '0';
        }, 800);
    }

    function updateSpeed(newSpeed) {
        const video = getMainVideo();
        if (!video) return;

        // 严格限制范围并处理浮点数（保留1位小数）
        newSpeed = Math.max(0.1, Math.min(16, newSpeed));
        newSpeed = Math.round(newSpeed * 10) / 10;
        
        currentTargetSpeed = newSpeed; // 更新独立状态
        video.playbackRate = newSpeed; // 应用于视频
        
        showSpeedTip(newSpeed);
    }

    // 3. 监听B站原生倍速变化（防止鼠标点B站菜单和我们的脚本脱节）
    document.addEventListener('ratechange', function(e) {
        const target = e.target;
        if (target.tagName === 'VIDEO' || target.tagName === 'BWP-VIDEO') {
            const realSpeed = Math.round(target.playbackRate * 10) / 10;
            // 如果变化是由B站播放器引起的，同步我们的状态变量
            if (currentTargetSpeed !== realSpeed) {
                currentTargetSpeed = realSpeed;
            }
        }
    }, true);

    // 4. 键盘事件监听
    document.addEventListener('keydown', function(e) {
        const tag = e.target.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

        const key = e.key;
        
        // 如果从未设置过倍速，先从当前视频读取一次初始化
        if (currentTargetSpeed === null) {
            const video = getMainVideo();
            currentTargetSpeed = video ? (Math.round(video.playbackRate * 10) / 10) : 1.0;
        }

        // --- 加减速处理 ---
        if (key === '+' || key === '=' || key === 'Add') {
            e.preventDefault();
            e.stopImmediatePropagation();
            // 直接基于我们的独立状态 +0.1，无视视频真实的延迟状态
            updateSpeed(currentTargetSpeed + 0.1);
        } 
        else if (key === '-' || key === 'Subtract') {
            e.preventDefault();
            e.stopImmediatePropagation();
            updateSpeed(currentTargetSpeed - 0.1);
        }
        // --- 指定数字倍速 (仅限主键盘) ---
        else if (/^[0-9]$/.test(key) && e.location === 0) {
            e.preventDefault();
            e.stopImmediatePropagation();
            updateSpeed(key === '0' ? 10 : parseInt(key));
        }
    }, true);

    // 全屏容器切换时自动清理旧提示
    const fullScreenEvents = ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'];
    fullScreenEvents.forEach(evt => {
        document.addEventListener(evt, () => {
            const tip = document.getElementById('bili-custom-speed-tip');
            if (tip) tip.remove();
        });
    });

    console.log('🚀 B站倍速控制脚本（状态机版）已启动，彻底告别跳频');
})();