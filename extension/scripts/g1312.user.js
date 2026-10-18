(function() {
    try {
        const removedElements = [];

        // ===== 百度搜索广告选择器 =====
        const baiduAdSelectors = [
            '.EC_result',
            '.ec-tuiguang',
            '.ecfc-tuiguang',
            '[id*="m6004051171"]',
            '.ad-block',
            '.ad-widget',
            '.ec_d20_recomm_link',
            '.c-recomm-wrap',
            'div:has(.ec-tuiguang)',
            'div:has(.ecfc-tuiguang)',
            '#3001',
            '#5001',
            '#5002'
        ];

        // ===== Bing搜索广告选择器 =====
        const bingAdSelectors = [
            'li.b_algo.b_ad',
            'li.b_ad',
            '.sb_adTA',
            '.sb_tween_favicon.ad',
            '.b_adlabel',
            '[data-ad="true"]',
            '.b_sponsored',
            '#b_pole',
            '.b_adBottom'
        ];

        // ===== 搜狗搜索广告选择器 =====
        const sogouAdSelectors = [
            '.sponsored-ams',
            '#promotion_adv_container',
            '.ad-results',
            '.ad_result',
            '[id^="ad_result_page"]',
            '.pc-style-rb',
            '.pc-style-upgrade-huichuan',
            '#leftbottomleadContainer',
            '.ad-bottom-buttons',
            '.pc-ad-tag',
            '.ad_ext_query',
            '.r-sech.ad_ext_query'
        ];

        // ===== 360搜索广告选择器 =====
        const so360AdSelectors = [
            // 广告容器和结果项
            '.e-buss',                          // 主要广告容器
            '#e_idea_pp',                       // 广告列表容器
            '.e_result',                        // 广告结果项
            '.e-pc-li-131-1',                   // 广告列表项
            '#m-spread-left',                   // 左侧推广区域
            '.m-spread-middle',                 // 中部推广区域
            '#so_kw-ad',                        // 关键词广告
            '#right_show',                      // 右侧广告展示
            '#rightbox',                        // 右侧广告盒子
            '.spread',                          // 推广容器
            '.e-newsl-box',                     // 新闻列表广告
            '#lm-rightbottom',                  // 右下角联盟广告
            '.lianmeng-ad',                     // 联盟广告
            '.res-mediav-right',                // 右侧媒体广告
            // 广告标识元素
            '.fw_ext',                          // 广告扩展标识
            '.e-tag',                           // 广告标签
            '.e-exp-weak-cl',                   // 广告弱分类
            // 特定广告组件
            '[id^="e_idea_pp"]',                // 广告ID前缀
            '[id^="e_haosou"]',                 // 好搜广告前缀
            '.e_haosou_fw_bg_title',            // 广告标题
            '.e_haosou_fw_picture',             // 广告图片
            '.e_haosou_fw_sm',                  // 广告摘要
            '.e_haoso_fengwu_extend',           // 广告扩展
            // 推广链接和反馈
            '.e-css-pc-fwfk-img-wrapper',       // 广告反馈图标包装
            '.e-css-pc-fwfk-popup',             // 广告反馈弹窗
            // 底部广告
            '.e-css-right-tg-new',              // 右侧新推广
            '#e_idea_form_0',                   // 广告表单
            // 联盟和iframe广告
            'li.li_88',                         // 特定广告列表项
            // 广告链接特征
            'a[href*="e.so.com/search/eclk"]',  // 广告点击链接
            'a[href*="e.360.cn"]'               // 360推广链接
        ];

        // 合并所有选择器
        const allAdSelectors = [
            ...baiduAdSelectors, 
            ...bingAdSelectors, 
            ...sogouAdSelectors,
            ...so360AdSelectors
        ];

        // 1. 执行移除操作
        allAdSelectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.parentNode && !el.hasAttribute('data-removed')) {
                        el.setAttribute('data-removed', 'true');
                        removedElements.push({
                            selector: selector,
                            tag: el.tagName,
                            id: el.id || 'no-id'
                        });
                        el.parentNode.removeChild(el);
                    }
                });
            } catch (e) {
                console.warn(`Failed to remove selector: ${selector}`, e);
            }
        });

        // 2. 移除包含"广告"或"Ad"文字的元素
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
            const text = el.textContent || '';
            const isAdText = (text.includes('广告') || 
                            text.includes('推广') || 
                            text.includes('Ad') || 
                            text.includes('Sponsored'));
            
            if (isAdText && 
                el.children.length < 5 && 
                text.length < 50 &&
                !el.hasAttribute('data-removed')) {
                
                // 百度容器
                const baiduContainer = el.closest('.result-op, .c-container, .gp2k11k');
                if (baiduContainer && baiduContainer.parentNode) {
                    baiduContainer.setAttribute('data-removed', 'true');
                    removedElements.push({
                        selector: 'text-based-baidu',
                        tag: baiduContainer.tagName,
                        text: text.substring(0, 30)
                    });
                    baiduContainer.parentNode.removeChild(baiduContainer);
                    return;
                }

                // Bing容器
                const bingContainer = el.closest('li.b_algo, .b_ad, .sb_adTA');
                if (bingContainer && bingContainer.parentNode) {
                    bingContainer.setAttribute('data-removed', 'true');
                    removedElements.push({
                        selector: 'text-based-bing',
                        tag: bingContainer.tagName,
                        text: text.substring(0, 30)
                    });
                    bingContainer.parentNode.removeChild(bingContainer);
                    return;
                }

                // 搜狗容器
                const sogouContainer = el.closest('.ad_result, .sponsored-ams, [id^="ad_result_page"]');
                if (sogouContainer && sogouContainer.parentNode) {
                    sogouContainer.setAttribute('data-removed', 'true');
                    removedElements.push({
                        selector: 'text-based-sogou',
                        tag: sogouContainer.tagName,
                        text: text.substring(0, 30)
                    });
                    sogouContainer.parentNode.removeChild(sogouContainer);
                    return;
                }

                // 360容器
                const so360Container = el.closest('.e-buss, .e_result, .e-pc-li-131-1, li[class*="li_"]');
                if (so360Container && so360Container.parentNode && !so360Container.hasAttribute('data-removed')) {
                    so360Container.setAttribute('data-removed', 'true');
                    removedElements.push({
                        selector: 'text-based-360',
                        tag: so360Container.tagName,
                        text: text.substring(0, 30)
                    });
                    so360Container.parentNode.removeChild(so360Container);
                }
            }
        });

        // 3. Bing特殊处理
        const bingAdFavicons = document.querySelectorAll('.sb_tween_favicon.ad');
        bingAdFavicons.forEach(favicon => {
            const resultItem = favicon.closest('li.b_algo');
            if (resultItem && resultItem.parentNode && !resultItem.hasAttribute('data-removed')) {
                resultItem.setAttribute('data-removed', 'true');
                removedElements.push({
                    selector: 'bing-favicon-ad',
                    tag: resultItem.tagName,
                    id: resultItem.getAttribute('data-id') || 'no-id'
                });
                resultItem.parentNode.removeChild(resultItem);
            }
        });

        // 4. 搜狗特殊处理
        const sogouAdDates = document.querySelectorAll('.pc-ad-date');
        sogouAdDates.forEach(dateEl => {
            const adContainer = dateEl.closest('.ad_result, [id^="ad_result_page"]');
            if (adContainer && adContainer.parentNode && !adContainer.hasAttribute('data-removed')) {
                adContainer.setAttribute('data-removed', 'true');
                removedElements.push({
                    selector: 'sogou-ad-date',
                    tag: adContainer.tagName,
                    id: adContainer.id || 'no-id'
                });
                adContainer.parentNode.removeChild(adContainer);
            }
        });

        // 5. 360特殊处理：移除带有广告反馈按钮的容器
        const so360FeedbackIcons = document.querySelectorAll('.e-css-pc-fwfk-icon, .e-js-callback-icon');
        so360FeedbackIcons.forEach(icon => {
            const adContainer = icon.closest('.e-buss, .e_result, li[class*="e-pc-li"]');
            if (adContainer && adContainer.parentNode && !adContainer.hasAttribute('data-removed')) {
                adContainer.setAttribute('data-removed', 'true');
                removedElements.push({
                    selector: '360-feedback-icon',
                    tag: adContainer.tagName,
                    id: adContainer.id || 'no-id'
                });
                adContainer.parentNode.removeChild(adContainer);
            }
        });

        // 6. 检测平台
        const hostname = window.location.hostname;
        let platform = 'unknown';
        if (hostname.includes('bing')) platform = 'bing';
        else if (hostname.includes('baidu')) platform = 'baidu';
        else if (hostname.includes('sogou')) platform = 'sogou';
        else if (hostname.includes('so.com') || hostname.includes('360')) platform = '360';

        // 7. 返回结果
        return {
            success: true,
            action: 'remove_ads',
            platform: platform,
            removedCount: removedElements.length,
            removedElements: removedElements.slice(0, 10),
            timestamp: Date.now(),
            message: `成功移除 ${removedElements.length} 个广告元素 (平台: ${platform})`
        };

    } catch (error) {
        return {
            success: false,
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        };
    }
})();