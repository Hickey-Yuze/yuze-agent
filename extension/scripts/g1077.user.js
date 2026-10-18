/**
 * 广告屏蔽大师 v3.0 - 精准版
 *
 * 改进点：
 * 1. ✅ 精准识别广告：不再误伤百度百科、正常搜索结果
 * 2. ✅ 白名单机制：保护已知正常内容类型
 * 3. ✅ 严格文本特征匹配：要求关键词出现在广告标签上下文中，而非容器任意位置
 * 4. ✅ 移除过宽选择器：删除 .result-op 等易误伤的选择器
 * 5. ✅ 多重验证：结合选择器 + 文本上下文 + 结构特征三重判断
 * 6. ✅ MutationObserver + URL监听 + 定时扫描 三保险
 *
 * 适用搜索引擎：百度、Bing、搜狗、360搜索
 */

(function() {
    'use strict';

    // ===== 防止重复注入 =====
    if (window.__adBlockMasterV3__) {
        console.log('[广告屏蔽大师V3] 已运行，跳过重复注入');
        return;
    }
    window.__adBlockMasterV3__ = true;

    // ===== 配置 =====
    const CONFIG = {
        observerDebounce: 150,
        scanInterval: 3000,
        urlCheckInterval: 500,
        maxScanCount: Infinity,
        debug: false
    };

    // ===== 状态管理 =====
    const state = {
        lastUrl: location.href,
        removedCount: 0,
        scanCount: 0,
        observer: null,
        timers: [],
        isRunning: false
    };

    function log(...args) {
        if (CONFIG.debug) {
            console.log('[广告屏蔽大师V3]', ...args);
        }
    }

    function safeRemove(element, reason) {
        if (!element || !element.parentNode || element.hasAttribute('data-abm-removed')) {
            return false;
        }
        try {
            element.setAttribute('data-abm-removed', 'true');
            element.setAttribute('data-abm-reason', reason);
            element.style.display = 'none';
            setTimeout(() => {
                if (element.parentNode) {
                    element.parentNode.removeChild(element);
                }
            }, 50);
            state.removedCount++;
            return true;
        } catch (e) {
            log('移除失败:', reason, e.message);
            return false;
        }
    }

    function debounce(fn, delay) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                fn.apply(this, args);
                timer = null;
            }, delay);
        };
    }

    // ========== 白名单系统 ==========

    /**
     * 判断元素是否为受保护的正常内容（不应被移除）
     * 保护：百度百科、百度知道、百度文库、正常搜索结果等
     */
    function isProtectedContent(element) {
        if (!element) return false;

        // 检查元素本身及其父级链
        let el = element;
        let depth = 0;
        const maxDepth = 8;

        while (el && el !== document.body && depth < maxDepth) {
            const cls = el.className || '';
            const id = el.id || '';
            const dataAttrs = JSON.stringify({
                click: el.getAttribute('data-click') || '',
                tuiguang: el.getAttribute('data-tuiguang') || '',
                type: el.getAttribute('data-type') || '',
            });

            // === 百度百科保护 ===
            if (el.querySelector && el.querySelector('.src-info, .c-font-normal, .wiki-inited, [data-module="bk"]')) {
                log('白名单命中: 百度百科结构特征');
                return true;
            }
            // 百度百科链接特征
            if (el.innerHTML && el.innerHTML.includes('baike.baidu.com')) {
                log('白名单命中: 百度百科链接');
                return true;
            }

            // === 百度知道/文库保护 ===
            if (typeof cls === 'string' && (
                cls.includes('know-fd') ||
                cls.includes('wenku-res') ||
                cls.includes('zhidao')
            )) {
                log('白名单命中: 百度知道/文库');
                return true;
            }

            // === 正常搜索结果保护（百度） ===
            // 正常的 c-container 不含广告标记
            if (typeof cls === 'string' && cls.includes('c-container')) {
                // 检查是否有明确的广告标记
                const hasAdMark =
                    dataAttrs.includes('tuiguang') ||
                    (el.getAttribute('data-click') || '').includes('tuiguang') ||
                    el.querySelector('[class*="ec_tuiguang"], [class*="ec-tuiguang"], .ad-block, .ad-widget');

                // 如果没有广告标记，且包含正常的搜索结果特征，则保护
                if (!hasAdMark) {
                    // 有正常的结果结构（标题+摘要+链接）
                    const hasNormalStructure =
                        el.querySelector('h3, .t, a[href*=".baidu.com/link"]') &&
                        el.querySelector('.c-abstract, .c-span-last, src');

                    if (hasNormalStructure) {
                        // 进一步检查：正常结果通常有排名/序号或标准布局
                        const html = el.innerHTML || '';
                        // 排除含有明确广告标签的
                        if (!html.includes('广告') && !html.includes('推广') && !html.includes('Sponsored')) {
                            log('白名单命中: 正常搜索结果(无广告标记)');
                            return true;
                        }
                    }
                }
            }

            // === Bing 正常结果保护 ===
            if (typeof cls === 'string' && (
                cls.includes('b_algo') && !cls.includes('b_ad')
            )) {
                // b_algo 但不是 b_ad 的，检查是否真的有广告标签
                if (!el.querySelector('.b_adlabel, .sb_adTA, [data-ad="true"]')) {
                    log('白名单命中: Bing正常结果');
                    return true;
                }
            }

            el = el.parentElement;
            depth++;
        }

        return false;
    }

    // ========== 精准广告选择器（仅保留高置信度的）==========

    const SELECTORS = {
        baidu: [
            // 高置信度广告选择器（仅匹配明确标注的广告）
            '.EC_result',           // 商业推广外层
            '.ec-tuiguang',         // 推广标识
            '.ecfc-tuiguang',       // 推广标识变体
            '[id*="m6004051171"]',  // 广告ID模式
            '.ad-block',            // 广告块
            '.ad-widget',           // 广告组件
            '.ec_d20_recomm_link',  // 推荐广告链接
            '#3001', '#5001', '#5002', // 固定广告位ID
            '.ec_wise_ad',          // 知识广告
            '[data-tuiguang]',      // 明确的推广属性
            '[data-tuiguang*="1"]', // 推广值为1
            // 移除了 .result-op 和宽泛的 c-container[data-click] 选择器
        ],
        bing: [
            'li.b_algo.b_ad',       // 明确标记的广告结果
            'li.b_ad',              // 广告列表项
            '.sb_adTA',             // 广告文本广告
            '.sb_tween_favicon.ad', // 带广告图标的favicon
            '.b_adlabel',           // 广告标签
            '[data-ad="true"]',     // 广告数据属性
            '.b_sponsored',         // 赞助内容
            '#b_pole',              // 广告位
            '.b_adBottom',          // 底部广告
            '.b_adMain',            // 主广告区
        ],
        sogou: [
            '.sponsored-ams',       // 赞助广告
            '#promotion_adv_container', // 推广容器
            '.ad-results',          // 广告结果
            '.ad_result',           // 广告结果项
            '[id^="ad_result_page"]', // 广告页ID
            '.pc-style-rb',         // 右侧广告样式
            '.pc-style-upgrade-huichuan', // 升级广告
            '#leftbottomleadContainer',   // 左下角广告
            '.ad-bottom-buttons',   // 底部广告按钮
            '.pc-ad-tag',           // PC广告标签
            '.ad_ext_query',        // 扩展查询广告
        ],
        so360: [
            '.e-buss',              // 商业广告
            '#e_idea_pp',           // 广告创意
            '.e_result',            // 广告结果
            '.e-pc-li-131-1',       // 特定广告样式
            '#m-spread-left',       // 左侧推广
            '.m-spread-middle',     // 中间推广
            '#so_kw-ad',            // 关键词广告
            '#right_show',          // 右侧展示
            '#rightbox',            // 右侧框
            '.spread',              // 推广
            '.e-newsl-box',         // 新闻广告框
            '#lm-rightbottom',      // 右下角广告
            '.lianmeng-ad',         // 联盟广告
            '.res-mediav-right',    // 右侧mediav广告
            '.fw_ext',              // 扩展广告
            '.e-tag',               // 广告标签
            '.e-exp-weak-cl',       // 弱化广告
            '[id^="e_idea_pp"]',    // 广告ID前缀
            '[id^="e_haosou"]',     // 好搜广告
            '.e_haosou_fw_bg_title',// 好搜广告标题
            '.e_haosou_fw_picture', // 好搜广告图片
            '.e_haosou_fw_sm',      // 好搜广告小图
            '.e_haoso_fengwu_extend', // 好搜凤巢扩展
            '.e-css-pc-fwfk-img-wrapper', // 广告包装器
            '.e-css-pc-fwfk-popup', // 广告弹窗
            '.e-css-right-tg-new',  // 右侧新推广
            '#e_idea_form_0',       // 表单广告
            'li.li_88',             // 特定广告列表项
            'a[href*="e.so.com/search/eclk"]', // 广告点击链接
            'a[href*="e.360.cn"]',  // 360广告链接
        ]
    };

    function detectSite() {
        const host = location.hostname.toLowerCase();
        if (host.includes('baidu.com')) return 'baidu';
        if (host.includes('bing.com')) return 'bing';
        if (host.includes('sogou.com')) return 'sogou';
        if (host.includes('so.com') || host.includes('360.cn') || host.includes('haosou.com')) return 'so360';
        return null;
    }

    function getCurrentSelectors() {
        const site = detectSite();
        if (!site) return [];
        let selectors = [...(SELECTORS[site] || [])];
        // 仅添加高置信度的通用广告选择器
        selectors.push(
            'iframe[src*="ad"][src*="doubleclick"]',
            'iframe[src*="ads"][src*="googleads"]',
            'iframe[name*="google_ads_frame"]',
            '[class*="ad-placeholder"]',
            '[id^="div-gpt-ad"]'  // Google Publisher Tag
        );
        return selectors;
    }

    // ========== 核心清理逻辑（带白名单检查）==========

    function removeBySelectors() {
        const selectors = getCurrentSelectors();
        if (selectors.length === 0) return 0;
        let count = 0;
        selectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    // 白名单检查：受保护的内容不删除
                    if (isProtectedContent(el)) {
                        log(`跳过受保护元素: ${selector}`);
                        return;
                    }
                    if (safeRemove(el, `selector:${selector}`)) count++;
                });
            } catch (e) {}
        });
        if (count > 0) log(`选择器匹配移除: ${count} 个`);
        return count;
    }

    /**
     * 精准文本特征匹配（v3改进版）
     *
     * 改进：
     * - 要求广告关键词必须出现在"类标签"性质的元素中（小文本、特定位置）
     * - 而非容器内任意位置出现就判定为广告
     * - 结合多个特征综合判断
     */
    function removeByTextFeature() {
        const site = detectSite();
        if (!site) return 0;

        // 各平台的广告标签特征（更严格的匹配规则）
        const adLabelPatterns = {
            baidu: {
                // 广告标签的选择器和文本模式
                labelSelectors: [
                    '.ec_tuiguang_pplite',
                    '.ec_beauty_official',
                    'span[class*="tuiguang"]',
                    'i[class*="ad"]',
                    '.c-color-red:contains("广告")',
                    '.c-color-gray:contains("广告")',
                    '.c-font-normal:contains("推广")',
                ],
                // 需要同时满足的条件组合
                combinedChecks: function(container) {
                    // 必须找到类似"广告"的小标签元素
                    const smallLabels = container.querySelectorAll(
                        'span, i, em, small, .c-color-red, .c-color-gray, [class*="tag"], [class*="label"]'
                    );

                    for (const label of smallLabels) {
                        const text = (label.textContent || '').trim();

                        // 标签文本必须是纯广告关键词（短文本）
                        const isAdLabel = ['广告', '推广', 'Sponsored', '品牌推广', '商业推广']
                            .some(kw => text === kw || text === kw + ' ▼' || text === kw + ' >');

                        if (isAdLabel && label.children.length <= 2) {
                            // 额外确认：这个标签不在正常内容区域
                            const parentClass = label.parentElement?.className || '';
                            const parentHTML = label.parentElement?.innerHTML || '';

                            // 排除：标签在摘要、正文等正常内容中
                            const isInNormalContent =
                                parentClass.includes('c-abstract') ||
                                parentClass.includes('c-span') ||
                                parentClass.includes('content') ||
                                parentHTML.length > 500; // 父元素内容很长，可能是正文

                            if (!isInNormalContent) {
                                return { isAd: true, reason: `标签文本: "${text}"` };
                            }
                        }
                    }

                    // 检查 data 属性中的广告标记
                    const dataClick = container.getAttribute('data-click') || '';
                    const dataTuiguang = container.getAttribute('data-tuiguang') || '';

                    if (dataClick.includes('tuiguang') || dataTuiguang) {
                        // 再次确认不是受保护内容
                        if (!isProtectedContent(container)) {
                            return { isAd: true, reason: 'data属性含tuiguang' };
                        }
                    }

                    return { isAd: false };
                }
            },
            bing: {
                combinedChecks: function(container) {
                    // Bing: 检查 .b_adlabel 或 "Ad" 文本标签
                    const adLabel = container.querySelector('.b_adlabel, .sb_adTA');
                    if (adLabel) {
                        return { isAd: true, reason: 'bing-ad-label' };
                    }

                    // 检查是否有广告favicon但无正常结果特征
                    const hasAdFavicon = container.querySelector('.sb_tween_favicon.ad');
                    const hasNormalFavicon = container.querySelector('.sb_tween_favicon:not(.ad)');

                    if (hasAdFavicon && !hasNormalFavicon) {
                        return { isAd: true, reason: 'bing-ad-favicon' };
                    }

                    return { isAd: false };
                }
            },
            sogou: {
                combinedChecks: function(container) {
                    // 搜狗: 检查赞助标识
                    const sponsoredMark = container.querySelector(
                        '.sponsored-ams, .pc-ad-tag, [class*="sponsored"]'
                    );
                    if (sponsoredMark) {
                        return { isAd: true, reason: 'sogou-sponsored' };
                    }

                    // 检查文本
                    const text = (container.textContent || '');
                    if ((text.includes('广告') || text.includes('推广')) &&
                        !container.querySelector('h3 a[href*="sogou.com/link"]')) {
                        // 没有正常搜索结果链接的可能是广告
                        return { isAd: true, reason: 'sogou-text-ad' };
                    }

                    return { isAd: false };
                }
            },
            so360: {
                combinedChecks: function(container) {
                    // 360: 检查特定广告class
                    const adClasses = ['.e-buss', '.e_result', '.spread', '.lianmeng-ad'];
                    for (const cls of adClasses) {
                        if (container.querySelector(cls)) {
                            return { isAd: true, reason: `360-${cls}` };
                        }
                    }

                    return { isAd: false };
                }
            }
        };

        // 待检查的容器选择器（缩小范围，只检查可疑容器）
        const suspiciousContainers = {
            baidu: ['.result-op', '.c-container'],
            bing: ['li.b_algo'],
            sogou: ['.vrwrap', '.rb', '.results'],
            so360: ['.res-list', 'li']
        };

        const containers = suspiciousContainers[site] || [];
        let count = 0;

        containers.forEach(containerSelector => {
            try {
                document.querySelectorAll(containerSelector).forEach(container => {
                    if (container.hasAttribute('data-abm-removed')) return;

                    // 先检查白名单
                    if (isProtectedContent(container)) return;

                    // 使用该平台特定的复合检查
                    const checker = adLabelPatterns[site];
                    if (checker && checker.combinedChecks) {
                        const result = checker.combinedChecks(container);
                        if (result.isAd) {
                            if (safeRemove(container, result.reason)) count++;
                        }
                    }
                });
            } catch (e) {}
        });

        if (count > 0) log(`精准文本特征移除: ${count} 个`);
        return count;
    }

    function handleBingSpecial() {
        if (detectSite() !== 'bing') return 0;
        let count = 0;
        try {
            document.querySelectorAll('.sb_tween_favicon.ad').forEach(favicon => {
                const resultItem = favicon.closest('li.b_algo');
                if (resultItem && !isProtectedContent(resultItem)) {
                    if (safeRemove(resultItem, 'bing-favicon')) count++;
                }
            });
        } catch (e) {}
        return count;
    }

    function cleanAds() {
        state.scanCount++;
        if (state.scanCount > CONFIG.maxScanCount) { stop(); return 0; }

        const start = performance.now();
        const c1 = removeBySelectors();
        const c2 = removeByTextFeature();
        const c3 = handleBingSpecial();
        const total = c1 + c2 + c3;

        if (total > 0) {
            log(`第${state.scanCount}次清理: 移除 ${total} 个广告 (${Math.round(performance.now()-start)}ms) | 累计: ${state.removedCount}`);
        }

        return total;
    }

    // ========== 持久化机制 ==========

    function setupObserver() {
        if (state.observer) state.observer.disconnect();

        const debouncedClean = debounce(cleanAds, CONFIG.observerDebounce);

        state.observer = new MutationObserver((mutations) => {
            // 只在有新增节点时触发
            const hasAddedNodes = mutations.some(m =>
                m.addedNodes.length > 0 &&
                ![...m.addedNodes].every(n => n.nodeType === Node.TEXT_NODE || n.nodeName === '#text')
            );

            if (hasAddedNodes) {
                debouncedClean();
            }
        });

        state.observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });

        log('MutationObserver 已启动');
    }

    function setupUrlWatcher() {
        const urlTimer = setInterval(() => {
            if (location.href !== state.lastUrl) {
                log('URL变化 detected:', location.href);
                state.lastUrl = location.href;
                // URL变化时延迟执行清理，等待页面渲染
                setTimeout(cleanAds, 500);
            }
        }, CONFIG.urlCheckInterval);
        state.timers.push(urlTimer);
    }

    function setupIntervalScan() {
        const scanTimer = setInterval(() => {
            cleanAds();
        }, CONFIG.scanInterval);
        state.timers.push(scanTimer);
    }

    // ========== 启动/停止 ==========

    function start() {
        if (state.isRunning) return;
        state.isRunning = true;

        log('启动广告屏蔽大师 V3.0');
        log('当前站点:', detectSite() || '未知');

        // 首次执行
        cleanAds();

        // 设置持久化机制
        setupObserver();
        setupUrlWatcher();
        setupIntervalScan();

        // 页面加载完成后再次执行
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(cleanAds, 1000);
            });
        } else {
            setTimeout(cleanAds, 1000);
        }
    }

    function stop() {
        state.isRunning = false;
        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }
        state.timers.forEach(t => clearInterval(t));
        state.timers = [];
        log('已停止');
    }

    // ===== 启动 =====
    start();

    // 暴露控制接口（方便调试）
    window.__adBlockMasterV3Control = {
        start,
        stop,
        cleanAds,
        getState: () => ({ ...state }),
        getStats: () => ({
            removedCount: state.removedCount,
            scanCount: state.scanCount,
            isRunning: state.isRunning,
            currentSite: detectSite()
        })
    };

})();