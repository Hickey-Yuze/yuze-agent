// ==UserScript==
// @name         B站免登录解锁高画质
// @namespace    https://www.bilibili.com/*
// @version      1.0
// @description  解除B站未登录时的画质限制、评论限制和登录弹窗
// @author       Tabbit妙招助手
// @match        https://www.bilibili.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 1. 解除画质限制
    function unlockQuality() {
        // 监听视频播放器初始化
        const observer = new MutationObserver((mutations) => {
            // 查找画质选择器
            const qualitySelectors = document.querySelectorAll('.bpx-player-ctrl-quality, .bilibili-player-video-btn-quality');
            qualitySelectors.forEach(selector => {
                if (selector) {
                    // 模拟点击展开画质列表
                    selector.click();
                    
                    // 查找并选择最高画质（如4K、1080P60等）
                    setTimeout(() => {
                        const qualityItems = document.querySelectorAll('.bpx-player-ctrl-quality-item, .bilibili-player-video-quality-item');
                        qualityItems.forEach(item => {
                            const text = item.textContent || '';
                            if (text.includes('4K') || text.includes('1080P60') || text.includes('1080P') || text.includes('720P')) {
                                item.click();
                                console.log('已自动选择画质:', text);
                            }
                        });
                    }, 500);
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 2. 解除评论限制
    function unlockComments() {
        // 移除评论区域的登录提示
        const removeLoginPrompts = () => {
            const loginPrompts = document.querySelectorAll('.comment-login, .login-tip, [class*="login"], .bili-comment-login');
            loginPrompts.forEach(prompt => {
                prompt.style.display = 'none';
                prompt.remove();
            });
            
            // 解锁评论列表
            const commentLists = document.querySelectorAll('.comment-list, .bili-comment-list');
            commentLists.forEach(list => {
                list.style.maxHeight = 'none';
                list.style.overflow = 'auto';
            });
        };

        // 初始执行
        removeLoginPrompts();
        
        // 监听评论区域变化
        const commentObserver = new MutationObserver(removeLoginPrompts);
        const commentContainer = document.querySelector('.comment-container, .bili-comment');
        if (commentContainer) {
            commentObserver.observe(commentContainer, { childList: true, subtree: true });
        }
    }

    // 3. 移除登录弹窗
    function removeLoginPopups() {
        const removePopups = () => {
            // 移除登录弹窗
            const loginModals = document.querySelectorAll('.login-modal, .bili-mini-login, .bili-login-popup, [class*="login-modal"]');
            loginModals.forEach(modal => {
                modal.style.display = 'none';
                modal.remove();
            });
            
            // 移除遮罩层
            const masks = document.querySelectorAll('.mask, .modal-mask, .bili-modal-mask');
            masks.forEach(mask => {
                mask.style.display = 'none';
                mask.remove();
            });
            
            // 阻止登录弹窗出现
            document.body.style.overflow = 'auto';
        };

        // 初始执行
        removePopups();
        
        // 监听弹窗出现
        const popupObserver = new MutationObserver(removePopups);
        popupObserver.observe(document.body, { childList: true, subtree: true });
        
        // 拦截登录相关事件
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (target.closest('.login-btn, .header-login, .bili-header-login')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('已阻止登录按钮点击');
            }
        }, true);
    }

    // 4. 主执行函数
    function main() {
        console.log('B站免登录解锁脚本已启动');
        
        // 延迟执行以确保页面加载完成
        setTimeout(() => {
            unlockQuality();
            unlockComments();
            removeLoginPopups();
        }, 2000);
        
        // 页面切换时重新执行
        window.addEventListener('popstate', () => {
            setTimeout(() => {
                unlockQuality();
                unlockComments();
                removeLoginPopups();
            }, 1000);
        });
    }

    // 等待页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

})();