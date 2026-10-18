// ==UserScript==
// @name         智能强制暗色模式（带自动切换）
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  智能检测页面颜色模式并自动切换，支持暗色/亮色双向转换
// @author       Tabbit
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // 全局模式标志：false=应用暗色模式，true=应用亮色模式
    let reverseMode = false;

    // ========== 1. 颜色工具函数 ==========

    function isLightColor(color) {
        let r, g, b;
        if (color.startsWith('#')) {
            const hex = color.slice(1);
            if (hex.length === 3) {
                r = parseInt(hex[0] + hex[0], 16);
                g = parseInt(hex[1] + hex[1], 16);
                b = parseInt(hex[2] + hex[2], 16);
            } else if (hex.length === 6) {
                r = parseInt(hex.slice(0, 2), 16);
                g = parseInt(hex.slice(2, 4), 16);
                b = parseInt(hex.slice(4, 6), 16);
            } else {
                return false;
            }
        } else if (color.startsWith('rgb')) {
            const match = color.match(/\d+/g);
            if (!match || match.length < 3) return false;
            // 如果 alpha 通道接近于 0，视为透明，不算浅色也不算深色
            if (match.length >= 4 && parseFloat(match[3]) < 0.1) return null;
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
        } else {
            return true; // 无法解析，保守按浅色处理
        }
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return luminance > 0.5;
    }

    function invertColor(color) {
        if (reverseMode) {
            // 亮色模式：深色背景→白色，浅色文字→黑色
            if (isLightColor(color)) {
                return '#000000';
            } else {
                return '#ffffff';
            }
        } else {
            // 暗色模式：浅色背景→深灰色，深色文字→浅灰色
            if (isLightColor(color)) {
                return '#121212';
            } else {
                return '#e0e0e0';
            }
        }
    }

    // ========== 2. 智能检测页面颜色模式 ==========

    function detectDarkMode() {
        const html = document.documentElement;

        // 策略 A：检查 HTML 元素上的常见暗色模式标记
        const dataTheme = html.getAttribute('data-theme') || html.getAttribute('data-color-mode');
        if (dataTheme) {
            const lower = dataTheme.toLowerCase();
            if (lower === 'dark' || lower.includes('dark')) return true;
            if (lower === 'light' || lower.includes('light')) return false;
        }

        // 策略 B：检查 HTML 上的 class（Tailwind dark:、dark mode 等）
        if (html.classList.contains('dark') || html.classList.contains('dark-mode')) {
            return true;
        }

        // 策略 C：检查 color-scheme meta 标签或 CSS 属性
        const metaColorScheme = document.querySelector('meta[name="color-scheme"]');
        const metaContent = metaColorScheme ? metaColorScheme.getAttribute('content') : '';
        const cssColorScheme = window.getComputedStyle(html).colorScheme;
        if (metaContent.includes('dark') || cssColorScheme.includes('dark')) return true;
        if (metaContent.includes('light') && !metaContent.includes('dark')) return false;

        // 策略 D：收集页面中多个样本元素的背景色，综合判断
        const samples = collectColorSamples();
        
        if (samples.bgColors.length > 0) {
            let darkCount = 0;
            let lightCount = 0;
            for (const bg of samples.bgColors) {
                const result = isLightColor(bg);
                if (result === null) continue; // 跳过透明
                if (result) lightCount++;
                else darkCount++;
            }
            // 如果深色背景占多数，判定为暗色模式
            if (darkCount + lightCount > 0 && darkCount > lightCount) {
                return true;
            }
            if (darkCount + lightCount > 0 && lightCount >= darkCount) {
                return false;
            }
        }

        // 策略 E：检查 prefers-color-scheme（最后手段）
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return true;
        }

        return false;
    }

    function collectColorSamples() {
        const bgColors = [];
        
        // 收集 body 的背景色（如果非透明）
        if (document.body) {
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') {
                bgColors.push(bodyBg);
            }
        }

        // 收集 body 直接子元素中可见的大块元素
        if (document.body) {
            const directChildren = document.body.children;
            for (let i = 0; i < Math.min(directChildren.length, 10); i++) {
                const el = directChildren[i];
                const rect = el.getBoundingClientRect();
                // 只取占据一定面积的可见元素
                if (rect.width > 200 && rect.height > 100) {
                    const bg = window.getComputedStyle(el).backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                        bgColors.push(bg);
                    }
                }
            }
        }

        // 收集常见的容器元素
        const selectors = ['main', 'article', '.container', '.content', '.main-content', 
                          '#content', '#main', '[role="main"]', '.wrapper', '.page'];
        for (const sel of selectors) {
            try {
                const el = document.querySelector(sel);
                if (el) {
                    const bg = window.getComputedStyle(el).backgroundColor;
                    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                        bgColors.push(bg);
                    }
                }
            } catch (e) { /* 无效选择器，跳过 */ }
        }

        return { bgColors };
    }

    // ========== 3. 排除规则 ==========

    const MEDIA_TAGS = ['IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG', 'IFRAME', 'OBJECT', 'EMBED',
                        'PICTURE', 'SOURCE', 'INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'];
    const EXCLUDED_CLASSES = ['dark-mode-exclude', 'no-dark-mode'];

    // ========== 4. 主遍历函数 ==========

    function applyColorMode(element) {
        // 避免处理不可见的元素或脚本/样式标签
        if (!element || !element.tagName) return;
        const tag = element.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || 
            tag === 'LINK' || tag === 'META' || tag === 'HEAD') {
            return;
        }

        if (MEDIA_TAGS.includes(tag)) return;
        if (EXCLUDED_CLASSES.some(cls => {
            try { return element.classList.contains(cls); } catch (e) { return false; }
        })) {
            return;
        }

        const computedStyle = window.getComputedStyle(element);

        // 处理背景色
        const bgColor = computedStyle.backgroundColor;
        if (bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)') {
            const lightResult = isLightColor(bgColor);
            if (lightResult !== null) {
                const shouldConvertBg = reverseMode ? !lightResult : lightResult;
                if (shouldConvertBg) {
                    element.style.backgroundColor = invertColor(bgColor);
                }
            }
        }

        // 处理文字颜色
        const textColor = computedStyle.color;
        if (textColor && textColor !== 'transparent' && textColor !== 'rgba(0, 0, 0, 0)') {
            const lightResult = isLightColor(textColor);
            if (lightResult !== null) {
                const shouldConvertText = reverseMode ? lightResult : !lightResult;
                if (shouldConvertText) {
                    element.style.color = invertColor(textColor);
                }
            }
        }

        // 处理边框颜色
        const borderTop = computedStyle.borderTopColor;
        const borderRight = computedStyle.borderRightColor;
        const borderBottom = computedStyle.borderBottomColor;
        const borderLeft = computedStyle.borderLeftColor;
        
        const uniqueColors = [...new Set([borderTop, borderRight, borderBottom, borderLeft])];
        uniqueColors.forEach(borderColor => {
            if (borderColor && borderColor !== 'transparent' && borderColor !== 'rgba(0, 0, 0, 0)') {
                const lightResult = isLightColor(borderColor);
                if (lightResult !== null) {
                    const shouldConvertBorder = reverseMode ? !lightResult : lightResult;
                    if (shouldConvertBorder) {
                        // 单独设置每条边的颜色以保证精确
                        if (borderTop === borderColor) element.style.borderTopColor = invertColor(borderColor);
                        if (borderRight === borderColor) element.style.borderRightColor = invertColor(borderColor);
                        if (borderBottom === borderColor) element.style.borderBottomColor = invertColor(borderColor);
                        if (borderLeft === borderColor) element.style.borderLeftColor = invertColor(borderColor);
                    }
                }
            }
        });

        // 递归处理子元素
        if (element.children && element.children.length > 0) {
            for (let child of element.children) {
                applyColorMode(child);
            }
        }
    }

    // ========== 5. 初始化 ==========

    function initColorMode() {
        const isAlreadyDark = detectDarkMode();
        reverseMode = isAlreadyDark;

        console.log(`[智能颜色模式] 检测结果：${isAlreadyDark ? '暗色 → 反转' : '亮色 → 保持'}`);
        console.log(`[智能颜色模式] 应用目标：${reverseMode ? '白底黑字（亮色）' : '黑底白字（暗色）'}`);

        // 设置根元素基本颜色
        if (reverseMode) {
            document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
            document.documentElement.style.setProperty('color', '#000000', 'important');
        } else {
            document.documentElement.style.setProperty('background-color', '#121212', 'important');
            document.documentElement.style.setProperty('color', '#e0e0e0', 'important');
        }

        // 遍历 body
        if (document.body) {
            applyColorMode(document.body);
        }

        // 监听 DOM 变化
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === 1) {
                            applyColorMode(node);
                        }
                    }
                }
            }
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }

        console.log('[智能颜色模式] 已启用');
    }

    // ========== 6. 启动 ==========

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initColorMode);
    } else {
        initColorMode();
    }

    // ========== 7. 手动控制 API（在控制台调用） ==========

    window.toggleColorMode = function() {
        reverseMode = !reverseMode;
        console.log(`[智能颜色模式] 手动切换为：${reverseMode ? '亮色' : '暗色'}`);
        window.reapplyColorMode();
    };

    window.reapplyColorMode = function() {
        if (reverseMode) {
            document.documentElement.style.setProperty('background-color', '#ffffff', 'important');
            document.documentElement.style.setProperty('color', '#000000', 'important');
        } else {
            document.documentElement.style.setProperty('background-color', '#121212', 'important');
            document.documentElement.style.setProperty('color', '#e0e0e0', 'important');
        }
        if (document.body) {
            applyColorMode(document.body);
        }
        console.log('[智能颜色模式] 已重新应用');
    };

    window.getCurrentColorMode = function() {
        return reverseMode ? 'light' : 'dark';
    };

})();