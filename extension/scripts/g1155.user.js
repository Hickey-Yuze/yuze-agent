// ==UserScript==
// @name         强制自然暗色模式
// @namespace    https://tabbit.ai/
// @version      1.1
// @description  遍历 DOM 智能替换白底黑字为黑灰底浅字，保留图片/视频/SVG/iframe 原样，已暗黑页面不重复处理
// @author       Tabbit
// @match        *://*/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // ========== 配置 ==========
    const CONFIG = {
        // 深色背景色阶梯（非纯黑，灰黑结合更自然）
        bgBase:       '#1c1c1c',  // 主背景
        bgSlightly:   '#242424',  // 卡片/区块
        bgLighter:    '#2e2e2e',  // 悬浮/高亮区域
        bgLightest:   '#3a3a3a',  // 更深一级（表头等）

        // 浅色文字阶梯（非纯白）
        textPrimary:  '#e0e0e0',  // 主文字
        textSecondary:'#b0b0b0',  // 次要文字
        textMuted:    '#808080',  // 辅助/禁用文字

        // 边框
        borderColor:  '#444444',  // 边框
        borderLight:  '#3a3a3a',  // 浅边框

        // 链接
        linkColor:    '#7eb8ff',  // 链接
        linkVisited:  '#b393d3',  // 已访问链接

        // 输入框
        inputBg:      '#2a2a2a',  // 输入框背景
        inputBorder:  '#555555',  // 输入框边框

        // 阈值：低于此亮度视为"亮色"，需要转换
        luminanceThreshold: 180,
    };

    // 需要跳过处理的标签（保持原样）
    const SKIP_TAGS = new Set([
        'IMG', 'VIDEO', 'AUDIO', 'CANVAS', 'SVG',
        'IFRAME', 'OBJECT', 'EMBED', 'PICTURE',
        'CODE', 'PRE', 'KBD', 'SAMP',  // 代码块保留原样
        'INPUT[type="range"]',          // 滑块
        'INPUT[type="color"]',          // 颜色选择器
    ]);

    // 需要跳过处理的特殊元素选择器
    const SKIP_SELECTORS = [
        '[data-dark-mode-skip]',        // 手动标记跳过
        '[role="img"]',
        'svg', 'svg *',
        'img', 'video', 'canvas',
        'iframe',
        'picture', 'picture *',
        '[style*="background-image"]',  // 有背景图的元素（谨慎处理）
    ];

    // ========== 工具函数 ==========

    /** 解析颜色值为 {r, g, b, a} */
    function parseColor(color) {
        if (!color || color === 'transparent' || color === 'inherit' || color === 'initial') {
            return null;
        }
        color = color.trim().toLowerCase();
        if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
            const m = color.match(/[\d.]+/g);
            if (!m || m.length < 3) return null;
            return { r: +m[0], g: +m[1], b: +m[2], a: m[3] ? +m[3] : 1 };
        }
        // 命名颜色和 hex 需要上下文，这里用临时 canvas 解析
        try {
            const ctx = document.createElement('canvas').getContext('2d');
            if (!ctx) return null;
            ctx.fillStyle = color;
            const c = ctx.fillStyle;
            if (c.startsWith('#')) {
                const num = parseInt(c.slice(1), 16);
                return {
                    r: (num >> 16) & 0xff,
                    g: (num >> 8) & 0xff,
                    b: num & 0xff,
                    a: 1,
                };
            }
            return parseColor(c); // 递归解析 canvas 标准化后的颜色
        } catch (_) {
            return null;
        }
    }

    /** 计算相对亮度 (0-255) 参考 WCAG 公式近似 */
    function relativeLuminance(r, g, b) {
        const srgb = [r, g, b].map(c => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return (0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2]) * 255;
    }

    /** 检查背景色是否接近白色（需要转换） */
    function isLightColor(color) {
        const parsed = parseColor(color);
        if (!parsed || parsed.a < 0.3) return false; // 透明/半透明不处理
        return relativeLuminance(parsed.r, parsed.g, parsed.b) > CONFIG.luminanceThreshold;
    }

    /** 检查文字色是否接近黑色（需要转换） */
    function isDarkColor(color) {
        const parsed = parseColor(color);
        if (!parsed || parsed.a < 0.3) return false;
        return relativeLuminance(parsed.r, parsed.g, parsed.b) < (255 - CONFIG.luminanceThreshold);
    }

    /** 检查元素是否在跳过列表中 */
    function shouldSkip(el) {
        if (!el || !el.tagName) return true;
        const tag = el.tagName.toUpperCase();

        // 检查精确标签匹配
        if (SKIP_TAGS.has(tag)) return true;

        // 检查复合选择器
        const tagLower = tag.toLowerCase();
        for (const sel of SKIP_TAGS) {
            if (sel.includes('[') && el.matches && el.matches(sel)) return true;
        }

        // 检查选择器列表
        if (el.matches) {
            for (const sel of SKIP_SELECTORS) {
                try { if (el.matches(sel)) return true; } catch (_) { /* ignore */ }
            }
        }

        return false;
    }

    /** 检查元素或其祖先是否已被标记跳过 */
    function hasSkipAncestor(el) {
        let curr = el;
        while (curr && curr !== document.documentElement) {
            if (curr.hasAttribute && curr.hasAttribute('data-dark-mode-skip')) return true;
            if (curr.dataset && curr.dataset.darkModeSkip !== undefined) return true;
            curr = curr.parentElement;
        }
        return false;
    }

    // ========== 暗黑模式检测 ==========

    /** 检测页面是否已经是暗色模式 */
    function isAlreadyDark() {
        // 方法1：检测 prefers-color-scheme 对应的系统主题 + 页面背景
        const bodyBg = getComputedStyle(document.body).backgroundColor;
        const parsed = parseColor(bodyBg);
        if (parsed && parsed.a > 0.3) {
            const lum = relativeLuminance(parsed.r, parsed.g, parsed.b);
            if (lum < 80) return true; // 背景已经很暗
        }

        // 方法2：检测常见暗色模式 meta / class
        const html = document.documentElement;
        if (html.classList.contains('dark') ||
            html.classList.contains('dark-mode') ||
            html.getAttribute('data-theme') === 'dark' ||
            html.getAttribute('data-color-mode') === 'dark' ||
            document.querySelector('meta[name="color-scheme"][content*="dark"]')) {
            return true;
        }

        // 方法3：采样多个主要区域
        let darkCount = 0, totalCount = 0;
        const samples = document.querySelectorAll('body, .main, .content, article, main, [role="main"]');
        samples.forEach(el => {
            const bg = getComputedStyle(el).backgroundColor;
            const p = parseColor(bg);
            if (p && p.a > 0.3) {
                totalCount++;
                if (relativeLuminance(p.r, p.g, p.b) < 80) darkCount++;
            }
        });
        if (totalCount > 0 && darkCount / totalCount > 0.5) return true;

        return false;
    }

    // ========== 颜色映射 ==========

    /** 将浅色背景映射为深色背景 */
    function darkenBg(color) {
        const parsed = parseColor(color);
        if (!parsed || parsed.a < 0.3) return null;

        const lum = relativeLuminance(parsed.r, parsed.g, parsed.b);

        if (lum > 240)  return CONFIG.bgBase;      // 纯白/极浅 → 最深背景
        if (lum > 220)  return CONFIG.bgSlightly;  // 很浅 → 略深
        if (lum > 200)  return CONFIG.bgLighter;   // 浅色 → 中等深色
        if (lum > 160)  return CONFIG.bgLightest;  // 偏浅 → 较深
        return null; // 已经不浅了，无需转换
    }

    /** 将深色文字映射为浅色文字 */
    function lightenText(color) {
        const parsed = parseColor(color);
        if (!parsed || parsed.a < 0.5) return null;

        const lum = relativeLuminance(parsed.r, parsed.g, parsed.b);

        if (lum < 20)  return CONFIG.textPrimary;   // 纯黑/极深 → 主文字色
        if (lum < 60)  return CONFIG.textSecondary; // 深色 → 次要文字
        if (lum < 100) return CONFIG.textMuted;     // 偏深 → 辅助文字
        return null; // 已经不深了，无需转换
    }

    /** 处理边框颜色 */
    function darkenBorder(color) {
        const parsed = parseColor(color);
        if (!parsed || parsed.a < 0.3) return null;

        const lum = relativeLuminance(parsed.r, parsed.g, parsed.b);
        if (lum > 150) return CONFIG.borderColor;
        if (lum < 30)  return CONFIG.borderLight;
        return null;
    }

    // ========== 核心处理逻辑 ==========

    /** 处理单个元素 */
    function processElement(el) {
        if (shouldSkip(el)) return;
        if (hasSkipAncestor(el)) return;

        const style = getComputedStyle(el);
        let changed = false;

        // 1. 处理背景色
        const bg = style.backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && isLightColor(bg)) {
            const newBg = darkenBg(bg);
            if (newBg) {
                el.style.setProperty('background-color', newBg, 'important');
                changed = true;
            }
        }

        // 2. 处理文字颜色
        const color = style.color;
        if (color && isDarkColor(color)) {
            const newColor = lightenText(color);
            if (newColor) {
                el.style.setProperty('color', newColor, 'important');
                changed = true;
            }
        }

        // 3. 处理边框颜色
        const borderColor = style.borderColor;
        if (borderColor && borderColor !== 'rgba(0, 0, 0, 0)') {
            const newBorder = darkenBorder(borderColor);
            if (newBorder) {
                el.style.setProperty('border-color', newBorder, 'important');
                changed = true;
            }
        }

        // 单独处理四边边框
        ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'].forEach(prop => {
            const val = style.getPropertyValue(prop);
            if (val && val !== 'rgba(0, 0, 0, 0)') {
                const newVal = darkenBorder(val);
                if (newVal) {
                    el.style.setProperty(prop, newVal, 'important');
                    changed = true;
                }
            }
        });

        // 4. 处理 outline
        const outlineColor = style.outlineColor;
        if (outlineColor && outlineColor !== 'rgba(0, 0, 0, 0)') {
            const newOutline = darkenBorder(outlineColor);
            if (newOutline) {
                el.style.setProperty('outline-color', newOutline, 'important');
                changed = true;
            }
        }

        // 5. 处理 box-shadow（谨慎：只处理浅色阴影）
        const boxShadow = style.boxShadow;
        if (boxShadow && boxShadow !== 'none') {
            // 如果阴影中有浅色成分，替换为深色阴影
            const hasLightShadow = /rgba?$\s*2[0-4]\d\s*,\s*2[0-4]\d\s*,\s*2[0-4]\d/i.test(boxShadow) ||
                                   /rgba?\(\s*25[0-5]\s*,\s*25[0-5]\s*,\s*25[0-5]/i.test(boxShadow);
            if (hasLightShadow) {
                // 简单替换：将阴影改为深色半透明
                const newShadow = boxShadow.replace(
                    /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*$/g,
                    (match, r, g, b, a) => {
                        const lum = relativeLuminance(+r, +g, +b);
                        if (lum > 150) {
                            const alpha = a !== undefined ? parseFloat(a) : 1;
                            return `rgba(0, 0, 0, ${Math.min(alpha + 0.15, 0.8)})`;
                        }
                        return match;
                    }
                );
                el.style.setProperty('box-shadow', newShadow, 'important');
                changed = true;
            }
        }

        // 6. 特殊处理：输入框/文本框
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
            const inputBg = style.backgroundColor;
            if (!inputBg || inputBg === 'rgba(0, 0, 0, 0)' || isLightColor(inputBg)) {
                el.style.setProperty('background-color', CONFIG.inputBg, 'important');
                el.style.setProperty('color', CONFIG.textPrimary, 'important');
                el.style.setProperty('border-color', CONFIG.inputBorder, 'important');
                changed = true;
            }
        }

        // 7. 特殊处理：按钮
        if (el.tagName === 'BUTTON' || (el.tagName === 'INPUT' && ['button', 'submit', 'reset'].includes(el.type))) {
            const btnBg = style.backgroundColor;
            if (isLightColor(btnBg)) {
                el.style.setProperty('background-color', CONFIG.bgLighter, 'important');
                el.style.setProperty('color', CONFIG.textPrimary, 'important');
                el.style.setProperty('border-color', CONFIG.borderColor, 'important');
                changed = true;
            }
        }

        // 8. 特殊处理：链接
        if (el.tagName === 'A') {
            const linkColor = style.color;
            if (linkColor && (isDarkColor(linkColor) || /blue|navy/i.test(linkColor))) {
                el.style.setProperty('color', CONFIG.linkColor, 'important');
                changed = true;
            }
        }

        // 9. 特殊处理：表格
        if (el.tagName === 'TH' || el.tagName === 'TD') {
            const cellBg = style.backgroundColor;
            if (!cellBg || cellBg === 'rgba(0, 0, 0, 0)' || isLightColor(cellBg)) {
                el.style.setProperty('background-color', CONFIG.bgSlightly, 'important');
                changed = true;
            }
        }
        if (el.tagName === 'TH') {
            el.style.setProperty('background-color', CONFIG.bgLightest, 'important');
            changed = true;
        }
        if (el.tagName === 'TABLE') {
            const tableBg = style.backgroundColor;
            if (!tableBg || tableBg === 'rgba(0, 0, 0, 0)' || isLightColor(tableBg)) {
                el.style.setProperty('background-color', CONFIG.bgBase, 'important');
                changed = true;
            }
        }

        // 10. 特殊处理：hr 分隔线
        if (el.tagName === 'HR') {
            el.style.setProperty('border-color', CONFIG.borderColor, 'important');
            el.style.setProperty('background-color', CONFIG.borderColor, 'important');
            changed = true;
        }

        return changed;
    }

    /** 遍历并处理整个 DOM */
    function processAll() {
        const allElements = document.querySelectorAll('body *');
        let processed = 0;

        allElements.forEach(el => {
            try {
                if (processElement(el)) processed++;
            } catch (_) { /* 忽略无法处理的元素 */ }
        });

        // 同时处理 body 和 html
        try {
            processElement(document.body);
            processElement(document.documentElement);
        } catch (_) { /* ignore */ }

        console.log(`[强制暗色模式] 已处理 ${processed} 个元素`);
    }

    // ========== 动态内容监听 ==========

    let observer = null;
    let processingQueue = new Set();
    let processTimer = null;

    function scheduleProcess(nodes) {
        nodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                processingQueue.add(node);
                // 同时加入所有后代
                node.querySelectorAll('*').forEach(child => processingQueue.add(child));
            }
        });

        clearTimeout(processTimer);
        processTimer = setTimeout(() => {
            processingQueue.forEach(el => {
                try {
                    if (document.contains(el)) processElement(el);
                } catch (_) { /* ignore */ }
            });
            processingQueue.clear();
        }, 150); // 防抖 150ms
    }

    function startObserver() {
        if (observer) return;

        observer = new MutationObserver(mutations => {
            const newNodes = [];
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        newNodes.push(node);
                    }
                });
                // 属性变化也可能改变样式
                if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
                    const attr = mutation.attributeName;
                    if (attr === 'class' || attr === 'style' || attr === 'data-theme') {
                        newNodes.push(mutation.target);
                    }
                }
            });
            if (newNodes.length > 0) {
                scheduleProcess(newNodes);
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class', 'style', 'data-theme', 'data-color-mode', 'bgcolor'],
        });
    }

    // ========== 初始化 ==========

    function init() {
        // 检查是否需要跳过
        if (isAlreadyDark()) {
            console.log('[强制暗色模式] 检测到页面已是暗色模式，跳过处理');
            return;
        }

        // DOM 就绪后处理
        if (document.readyState === 'loading') {
            // 先尽快设置一个基础样式，减少白闪
            const baseStyle = document.createElement('style');
            baseStyle.id = 'force-dark-base';
            baseStyle.textContent = `
                html, body {
                    background-color: ${CONFIG.bgBase} !important;
                    color: ${CONFIG.textPrimary} !important;
                }
                a { color: ${CONFIG.linkColor} !important; }
                a:visited { color: ${CONFIG.linkVisited} !important; }
                input, textarea, select {
                    background-color: ${CONFIG.inputBg} !important;
                    color: ${CONFIG.textPrimary} !important;
                    border-color: ${CONFIG.inputBorder} !important;
                }
                ::-webkit-scrollbar { background-color: ${CONFIG.bgBase}; }
                ::-webkit-scrollbar-thumb { background-color: ${CONFIG.borderColor}; border-radius: 4px; }
                ::placeholder { color: ${CONFIG.textMuted} !important; }
                ::selection {
                    background-color: #3a6fb5 !important;
                    color: #ffffff !important;
                }
            `;
            document.documentElement.appendChild(baseStyle);

            document.addEventListener('DOMContentLoaded', () => {
                // 延迟执行，等页面基本渲染完成
                setTimeout(() => {
                    processAll();
                    startObserver();
                }, 100);
            });
        } else {
            processAll();
            startObserver();
        }
    }

    // 启动
    init();

})();