// ==UserScript==
// @name         SearchGuard - 搜索引擎仿冒网站识别与官方站点高亮
// @namespace    https://github.com/searchguard
// @version      1.0.0
// @description  在百度/Google/Bing 搜索结果中自动标记官方网站并识别疑似仿冒网站
// @author       Tabbit
// @license      MIT
// @match        *://www.baidu.com/*
// @match        *://www.baidu.com/s?*
// @match        *://www.google.com/search?*
// @match        *://www.google.com.hk/search?*
// @match        *://www.bing.com/search?*
// @match        *://cn.bing.com/search?*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_notification
// @run-at       document-end
// ==/UserScript==

(function () {
    'use strict';

    // =========================================================================
    // 模块一：配置管理器 (ConfigManager)
    // 负责白名单/黑名单/设置的加载、持久化和动态更新
    // =========================================================================
    const ConfigManager = (() => {
        const STORAGE_KEY_WHITELIST = 'sg_whitelist';
        const STORAGE_KEY_BLACKLIST = 'sg_blacklist';
        const STORAGE_KEY_SETTINGS = 'sg_settings';
        const STORAGE_KEY_VERSION  = 'sg_version';

        // 内置初始白名单 —— 覆盖政务、金融、电商、教育、医疗等核心领域
        const DEFAULT_WHITELIST = [
            // === 政务类 ===
            { domain: 'gov.cn',               name: '中国政府网',         category: '政务' },
            { domain: 'www.gov.cn',           name: '中国政府网',         category: '政务' },
            { domain: '12306.cn',             name: '铁路12306',          category: '政务' },
            { domain: 'www.12306.cn',         name: '铁路12306',          category: '政务' },
            { domain: 'moe.gov.cn',           name: '教育部',             category: '政务' },
            { domain: 'mfa.gov.cn',           name: '外交部',             category: '政务' },
            { domain: 'nhc.gov.cn',           name: '国家卫健委',         category: '政务' },
            { domain: 'sasac.gov.cn',         name: '国资委',             category: '政务' },
            { domain: 'customs.gov.cn',       name: '海关总署',           category: '政务' },
            { domain: 'chinatax.gov.cn',      name: '国家税务总局',       category: '政务' },

            // === 金融类 ===
            { domain: 'icbc.com.cn',          name: '中国工商银行',       category: '金融' },
            { domain: 'www.icbc.com.cn',      name: '中国工商银行',       category: '金融' },
            { domain: 'ccb.com',              name: '中国建设银行',       category: '金融' },
            { domain: 'www.ccb.com',          name: '中国建设银行',       category: '金融' },
            { domain: 'abchina.com',          name: '中国农业银行',       category: '金融' },
            { domain: 'www.abchina.com',      name: '中国农业银行',       category: '金融' },
            { domain: 'boc.cn',               name: '中国银行',           category: '金融' },
            { domain: 'www.boc.cn',           name: '中国银行',           category: '金融' },
            { domain: 'bankcomm.com',         name: '交通银行',           category: '金融' },
            { domain: 'cmbchina.com',         name: '招商银行',           category: '金融' },
            { domain: 'www.cmbchina.com',     name: '招商银行',           category: '金融' },
            { domain: 'psbc.com',             name: '中国邮政储蓄银行',   category: '金融' },
            { domain: 'alipay.com',           name: '支付宝',             category: '金融' },
            { domain: 'www.alipay.com',       name: '支付宝',             category: '金融' },
            { domain: 'pay.weixin.qq.com',    name: '微信支付',           category: '金融' },
            { domain: 'unionpay.com',         name: '银联',               category: '金融' },
            { domain: '95599.cn',             name: '中国农业银行',       category: '金融' },

            // === 电商类 ===
            { domain: 'taobao.com',           name: '淘宝',               category: '电商' },
            { domain: 'www.taobao.com',       name: '淘宝',               category: '电商' },
            { domain: 'tmall.com',            name: '天猫',               category: '电商' },
            { domain: 'www.tmall.com',        name: '天猫',               category: '电商' },
            { domain: 'jd.com',               name: '京东',               category: '电商' },
            { domain: 'www.jd.com',           name: '京东',               category: '电商' },
            { domain: 'pinduoduo.com',        name: '拼多多',             category: '电商' },
            { domain: 'www.pinduoduo.com',    name: '拼多多',             category: '电商' },
            { domain: 'suning.com',           name: '苏宁易购',           category: '电商' },
            { domain: 'vip.com',              name: '唯品会',             category: '电商' },
            { domain: 'meituan.com',          name: '美团',               category: '电商' },
            { domain: 'ele.me',               name: '饿了么',             category: '电商' },

            // === 社交媒体与内容平台 ===
            { domain: 'weibo.com',            name: '微博',               category: '社交' },
            { domain: 'zhihu.com',            name: '知乎',               category: '社交' },
            { domain: 'douban.com',           name: '豆瓣',               category: '社交' },
            { domain: 'bilibili.com',         name: '哔哩哔哩',           category: '社交' },
            { domain: 'toutiao.com',          name: '今日头条',           category: '资讯' },
            { domain: 'weixin.qq.com',        name: '微信',               category: '社交' },
            { domain: 'mp.weixin.qq.com',     name: '微信公众号',         category: '社交' },

            // === 教育类 ===
            { domain: 'edu.cn',               name: '中国教育和科研计算机网', category: '教育' },
            { domain: 'pku.edu.cn',           name: '北京大学',           category: '教育' },
            { domain: 'tsinghua.edu.cn',      name: '清华大学',           category: '教育' },
            { domain: 'fudan.edu.cn',         name: '复旦大学',           category: '教育' },
            { domain: 'zju.edu.cn',           name: '浙江大学',           category: '教育' },
            { domain: 'sjtu.edu.cn',          name: '上海交通大学',       category: '教育' },
            { domain: 'xmu.edu.cn',           name: '厦门大学',           category: '教育' },
            { domain: 'nju.edu.cn',           name: '南京大学',           category: '教育' },
            { domain: 'ustc.edu.cn',          name: '中国科学技术大学',   category: '教育' },
            { domain: 'hust.edu.cn',          name: '华中科技大学',       category: '教育' },

            // === 医疗类 ===
            { domain: 'pumch.cn',             name: '北京协和医院',       category: '医疗' },
            { domain: '301hospital.com.cn',   name: '解放军总医院',       category: '医疗' },
            { domain: 'mayoclinic.org',       name: 'Mayo Clinic',        category: '医疗' },

            // === 科技与工具 ===
            { domain: 'github.com',           name: 'GitHub',             category: '科技' },
            { domain: 'gitee.com',            name: 'Gitee码云',          category: '科技' },
            { domain: 'csdn.net',             name: 'CSDN',               category: '科技' },
            { domain: 'stackoverflow.com',    name: 'Stack Overflow',    category: '科技' },

            // === 其他高价值域名 ===
            { domain: 'qunar.com',            name: '去哪儿',             category: '旅游' },
            { domain: 'ctrip.com',            name: '携程',               category: '旅游' },
            { domain: 'zhaopin.com',          name: '智联招聘',           category: '招聘' },
            { domain: '51job.com',            name: '前程无忧',           category: '招聘' },
            { domain: 'fang.com',             name: '房天下',             category: '房产' },
            { domain: 'lianjia.com',          name: '链家',               category: '房产' },
            { domain: 'autohome.com.cn',      name: '汽车之家',           category: '汽车' },

            // === 国际常用 ===
            { domain: 'wikipedia.org',        name: 'Wikipedia',          category: '参考' },
            { domain: 'amazon.com',           name: 'Amazon',             category: '电商' },
            { domain: 'microsoft.com',        name: 'Microsoft',          category: '科技' },
            { domain: 'apple.com',            name: 'Apple',              category: '科技' },
            { domain: 'google.com',           name: 'Google',             category: '科技' },
            { domain: 'facebook.com',         name: 'Facebook',           category: '社交' },
            { domain: 'twitter.com',          name: 'X (Twitter)',        category: '社交' },
            { domain: 'paypal.com',           name: 'PayPal',             category: '金融' },
        ];

        // 内置仿冒域名黑名单模式（正则）
        const DEFAULT_BLACKLIST_PATTERNS = [
            // 通用仿冒模式
            /\b(offical|offlcial|0fficial|off1cial)\b/i,          // official 拼写变体
            /\b(down1oad|d0wnload|downl0ad)\b/i,                  // download 变体
            /\b(1ogin|l0gin|log1n|logni)\b/i,                     // login 变体
            /\b(secure|security|verify|verification)\b/i,          // 安全验证类诱导词
            /\b(update|upgrade|patch|fix)\b/i,                     // 更新升级类诱导词
            /\b(customer[\s-]*service|kefu|客服)\b/i,             // 虚假客服
            /\b(prize|lottery|winner|中奖|抽奖)\b/i,               // 中奖诈骗类
        ];

        const DEFAULT_SETTINGS = {
            enabled: true,
            highlightOfficial: true,    // 是否高亮官方网站
            detectFake: true,           // 是否检测仿冒网站
            pinOfficial: false,         // 是否将官方结果置顶（部分引擎支持）
            fakeOpacity: 0.45,          // 仿冒网站透明度
            similarityThreshold: 2,     // Levenshtein 距离阈值
            enableNotification: false,  // 是否弹出通知
            highValueCategories: ['金融', '政务', '支付'], // 触发编辑距离检测的类别
        };

        let whitelist = [];
        let blacklistPatterns = [];
        let settings = {};

        function load() {
            try {
                whitelist = JSON.parse(GM_getValue(STORAGE_KEY_WHITELIST, '[]'));
                if (whitelist.length === 0) {
                    whitelist = DEFAULT_WHITELIST;
                    saveWhitelist();
                }
                blacklistPatterns = GM_getValue(STORAGE_KEY_BLACKLIST, null);
                if (blacklistPatterns === null) {
                    blacklistPatterns = DEFAULT_BLACKLIST_PATTERNS.map(p => p.source);
                    saveBlacklist();
                } else {
                    // 还原为正则对象
                    blacklistPatterns = blacklistPatterns.map(s => new RegExp(s, 'i'));
                }
                settings = Object.assign({}, DEFAULT_SETTINGS, JSON.parse(GM_getValue(STORAGE_KEY_SETTINGS, '{}')));
            } catch (e) {
                console.error('[SearchGuard] 配置加载失败，使用默认配置:', e);
                whitelist = DEFAULT_WHITELIST;
                blacklistPatterns = DEFAULT_BLACKLIST_PATTERNS;
                settings = DEFAULT_SETTINGS;
            }
        }

        function saveWhitelist() {
            GM_setValue(STORAGE_KEY_WHITELIST, JSON.stringify(whitelist));
        }

        function saveBlacklist() {
            GM_setValue(STORAGE_KEY_BLACKLIST, JSON.stringify(blacklistPatterns.map(p =>
                typeof p === 'string' ? p : p.source
            )));
        }

        function saveSettings() {
            GM_setValue(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
        }

        function addToWhitelist(entry) {
            if (!whitelist.find(w => w.domain === entry.domain)) {
                whitelist.push(entry);
                saveWhitelist();
                return true;
            }
            return false;
        }

        function removeFromWhitelist(domain) {
            const idx = whitelist.findIndex(w => w.domain === domain);
            if (idx >= 0) {
                whitelist.splice(idx, 1);
                saveWhitelist();
                return true;
            }
            return false;
        }

        function addBlacklistPattern(patternStr) {
            blacklistPatterns.push(new RegExp(patternStr, 'i'));
            saveBlacklist();
        }

        function getWhitelist() { return whitelist; }
        function getSettings() { return settings; }
        function getBlacklistPatterns() { return blacklistPatterns; }

        // 导出高价值域名列表（触发编辑距离检测的类别）
        function getHighValueDomains() {
            return whitelist
                .filter(w => settings.highValueCategories.includes(w.category))
                .map(w => w.domain);
        }

        // Tampermonkey 菜单
        function registerMenus() {
            GM_registerMenuCommand('[SearchGuard] 切换启用/禁用', () => {
                settings.enabled = !settings.enabled;
                saveSettings();
                location.reload();
            });
            GM_registerMenuCommand('[SearchGuard] 导出白名单到控制台', () => {
                console.log(JSON.stringify(whitelist, null, 2));
                alert('白名单已输出到浏览器控制台 (F12 → Console)');
            });
            GM_registerMenuCommand('[SearchGuard] 重置为默认配置', () => {
                if (confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
                    GM_setValue(STORAGE_KEY_WHITELIST, '[]');
                    GM_setValue(STORAGE_KEY_BLACKLIST, null);
                    GM_setValue(STORAGE_KEY_SETTINGS, '{}');
                    location.reload();
                }
            });
        }

        load();
        registerMenus();

        return {
            getWhitelist,
            getBlacklistPatterns,
            getSettings,
            getHighValueDomains,
            addToWhitelist,
            removeFromWhitelist,
            addBlacklistPattern,
        };
    })();

    // =========================================================================
    // 模块二：域名分析器 (DomainAnalyzer)
    // 负责 URL 解析、域名正规化、相似度计算与仿冒特征识别
    // =========================================================================
    const DomainAnalyzer = (() => {

        /**
         * 从完整 URL 中提取域名（去除协议、路径、查询参数）
         * @param {string} url - 完整 URL
         * @returns {string|null} 提取的域名
         */
        function extractDomain(url) {
            try {
                const urlObj = new URL(url);
                return urlObj.hostname.toLowerCase();
            } catch (e) {
                // 尝试对不完整 URL 做修复
                const match = url.match(/^(?:https?:\/\/)?([^\/:\s?#]+)/i);
                return match ? match[1].toLowerCase() : null;
            }
        }

        /**
         * 剔除子域名，获取注册域名（简化版，适用于常见 TLD）
         * 例如：www.pku.edu.cn → pku.edu.cn
         *       login.icbc.com.cn → icbc.com.cn
         */
        function getBaseDomain(hostname) {
            // 常见二级 TLD 后缀（如 .com.cn, .gov.cn, .org.cn, .net.cn, .edu.cn 等）
            const knownSecondLevelTLDs = [
                '.com.cn', '.net.cn', '.org.cn', '.gov.cn', '.edu.cn',
                '.ac.cn', '.mil.cn', '.co.cn', '.ah.cn', '.bj.cn',
                '.cq.cn', '.fj.cn', '.gd.cn', '.gs.cn', '.gz.cn',
                '.gx.cn', '.ha.cn', '.hb.cn', '.he.cn', '.hi.cn',
                '.hl.cn', '.hn.cn', '.jl.cn', '.js.cn', '.jx.cn',
                '.ln.cn', '.nm.cn', '.nx.cn', '.qh.cn', '.sc.cn',
                '.sd.cn', '.sh.cn', '.sn.cn', '.sx.cn', '.tj.cn',
                '.tw.cn', '.xj.cn', '.xz.cn', '.yn.cn', '.zj.cn',
                '.co.uk', '.org.uk', '.ac.uk', '.gov.uk', '.me.uk',
                '.co.jp', '.or.jp', '.ne.jp', '.ac.jp', '.go.jp',
                '.com.au', '.net.au', '.org.au', '.gov.au', '.edu.au',
                '.co.kr', '.or.kr', '.ne.kr', '.go.kr',
                '.com.br', '.org.br', '.net.br', '.gov.br',
            ];

            for (const tld of knownSecondLevelTLDs) {
                if (hostname.endsWith(tld)) {
                    const prefix = hostname.slice(0, -tld.length);
                    const parts = prefix.split('.');
                    // 取最后一部分 + TLD
                    if (parts.length >= 1) {
                        return parts[parts.length - 1] + tld;
                    }
                }
            }

            // 常规 TLD（.com, .net, .org, .cn 等）：取最后两段
            const parts = hostname.split('.');
            if (parts.length <= 2) return hostname;
            return parts.slice(-2).join('.');
        }

        /**
         * 计算两个字符串之间的 Levenshtein（编辑）距离
         * 使用动态规划实现，O(m*n) 复杂度
         */
        function levenshteinDistance(s1, s2) {
            const m = s1.length;
            const n = s2.length;
            // 滚动数组优化空间
            let prev = new Array(n + 1);
            let curr = new Array(n + 1);

            for (let j = 0; j <= n; j++) prev[j] = j;

            for (let i = 1; i <= m; i++) {
                curr[0] = i;
                for (let j = 1; j <= n; j++) {
                    const cost = s1.charAt(i - 1) === s2.charAt(j - 1) ? 0 : 1;
                    curr[j] = Math.min(
                        prev[j] + 1,        // 删除
                        curr[j - 1] + 1,    // 插入
                        prev[j - 1] + cost  // 替换
                    );
                }
                [prev, curr] = [curr, prev];
            }
            return prev[n];
        }

        /**
         * 检查候选域名是否与白名单中某域名高度相似（编辑距离法）
         * @returns {{ matched: boolean, target?: string, distance?: number }}
         */
        function checkSimilarity(candidate, highValueDomains, threshold) {
            const candidateBase = getBaseDomain(candidate);
            for (const official of highValueDomains) {
                const officialBase = getBaseDomain(official);
                // 长度差异过大则跳过
                if (Math.abs(candidateBase.length - officialBase.length) > threshold + 1) continue;
                const distance = levenshteinDistance(candidateBase, officialBase);
                if (distance > 0 && distance <= threshold) {
                    return { matched: true, target: official, distance };
                }
            }
            return { matched: false };
        }

        /**
         * 检测仿冒域名模式：
         * - 知名域名作为子串出现（如 taobao-shop.com 包含 taobao）
         * - 字符替换（0↔o, 1↔l 等）
         */
        function checkImpersonationPatterns(domain, whitelist) {
            const domainStripped = domain.replace(/^www\./, '');

            // 检查是否包含知名域名作为子串但同时附加了额外内容
            for (const entry of whitelist) {
                const officialStripped = entry.domain.replace(/^www\./, '');
                if (officialStripped.length < 5) continue; // 太短的域名跳过

                // 知名域名出现在候选域名中，但不是完全匹配也不是标准子域名
                if (domainStripped.includes(officialStripped)) {
                    if (domainStripped !== officialStripped &&
                        !domainStripped.endsWith('.' + officialStripped)) {
                        return { matched: true, reason: `域名包含"${entry.name}"的域名但存在额外内容` };
                    }
                }

                // 检查常见字符替换后的变体
                const normalized = domainStripped
                    .replace(/0/g, 'o')
                    .replace(/1/g, 'l')
                    .replace(/8/g, 'b')
                    .replace(/5/g, 's');
                const officialNormalized = officialStripped
                    .replace(/0/g, 'o')
                    .replace(/1/g, 'l')
                    .replace(/8/g, 'b')
                    .replace(/5/g, 's');
                if (normalized === officialNormalized &&
                    domainStripped !== officialStripped) {
                    return { matched: true, reason: `域名疑似通过字符替换模仿"${entry.name}"` };
                }
            }

            return { matched: false };
        }

        /**
         * 检查标题/摘要中是否存在诱导性关键词堆砌
         */
        function checkKeywordStuffing(title, snippet) {
            const combined = (title + ' ' + snippet).toLowerCase();
            const indicators = [
                '官方', '官网', '正品', '旗舰店', '唯一', '授权',
                '免费下载', '下载安装', '最新版', '破解版',
                '24小时', '客服热线', '人工客服', '在线客服',
                '立即领取', '免费领取', '限时', '秒杀',
                'official', 'genuine', 'authorized', 'verified',
            ];

            let count = 0;
            for (const kw of indicators) {
                if (combined.includes(kw)) count++;
            }

            // 超过 3 个诱导词判定为关键词堆砌
            if (count >= 4) {
                return { matched: true, reason: `标题/摘要堆砌${count}个诱导性关键词` };
            }

            return { matched: false };
        }

        /**
         * 主分析方法：对一条搜索结果的 URL 做完整分析
         */
        function analyze(resultUrl, resultTitle, resultSnippet) {
            const domain = extractDomain(resultUrl);
            if (!domain) return { classification: 'unknown', reason: '无法解析域名' };

            const whitelist = ConfigManager.getWhitelist();
            const settings = ConfigManager.getSettings();

            // 第一层：精确白名单匹配
            for (const entry of whitelist) {
                if (domain === entry.domain ||
                    domain.endsWith('.' + entry.domain) ||
                    'www.' + domain === entry.domain) {
                    return {
                        classification: 'official',
                        entry,
                        domain,
                    };
                }
            }

            // 第二层：编辑距离检测（仅对高价值域名）
            if (settings.detectFake) {
                const highValueDomains = ConfigManager.getHighValueDomains();
                const simResult = checkSimilarity(domain, highValueDomains, settings.similarityThreshold);
                if (simResult.matched) {
                    return {
                        classification: 'suspicious',
                        reason: `域名与"${simResult.target}"编辑距离为${simResult.distance}，疑似仿冒`,
                        domain,
                    };
                }

                // 第三层：仿冒模式检测
                const impResult = checkImpersonationPatterns(domain, whitelist);
                if (impResult.matched) {
                    return {
                        classification: 'suspicious',
                        reason: impResult.reason,
                        domain,
                    };
                }

                // 第四层：黑名单正则匹配
                const blacklist = ConfigManager.getBlacklistPatterns();
                for (const pattern of blacklist) {
                    if (pattern.test(domain) || pattern.test(resultTitle) || pattern.test(resultSnippet)) {
                        return {
                            classification: 'suspicious',
                            reason: `匹配黑名单模式: ${pattern}`,
                            domain,
                        };
                    }
                }

                // 第五层：关键词堆砌检测
                const stuffingResult = checkKeywordStuffing(resultTitle, resultSnippet);
                if (stuffingResult.matched) {
                    return {
                        classification: 'suspicious',
                        reason: stuffingResult.reason,
                        domain,
                    };
                }
            }

            return { classification: 'normal', domain };
        }

        return {
            extractDomain,
            getBaseDomain,
            analyze,
        };
    })();

    // =========================================================================
    // 模块三：搜索引擎适配器 (SearchEngineAdapter)
    // 为各搜索引擎提供统一的 DOM 解析接口
    // =========================================================================
    const SearchEngineAdapter = (() => {
        /**
         * 每个引擎的定义：{ name, hostPatterns, resultSelector, extractors }
         * extractors 是一个函数，接收一个结果 DOM 元素，返回 { url, title, snippet, isAd }
         */
        const ENGINE_DEFINITIONS = [
            {
                name: 'baidu',
                hostPatterns: [/baidu\.com/],
                resultSelector: 'div.result, div.c-container, div[class*="result"]',
                // 排除百度自己的嵌套结果（如视频卡片）
                excludeSelector: '.c-result-nested, .c-result-card',
                extractors(el) {
                    // 跳过嵌套结果
                    if (el.closest('.c-result-nested, .c-result-card')) return null;
                    // 跳过右侧推荐
                    if (el.closest('#content_right')) return null;

                    const linkEl = el.querySelector('h3 a, .t a, a[class*="title"]');
                    if (!linkEl) return null;
                    const url = linkEl.href || '';

                    const title = (linkEl.textContent || '').trim();
                    const snippetEl = el.querySelector('.c-abstract, .c-span-last, .c-row, .content-right_8Zs40, span.content-right_8Zs40');
                    const snippet = (snippetEl ? snippetEl.textContent : '').trim();

                    // 百度广告标识
                    const isAd = !!(
                        el.querySelector('.c-tips-title') ||
                        el.querySelector('span[data-tuiguang]') ||
                        el.textContent.includes('广告')
                    );

                    return { url, title, snippet, isAd };
                },
            },
            {
                name: 'google',
                hostPatterns: [/google\.com/, /google\.[a-z]{2,}(\.[a-z]{2,})?/],
                resultSelector: 'div.g, div[data-hveid] div:has(> div > a > h3)',
                extractors(el) {
                    const linkEl = el.querySelector('h3')?.closest('a') || el.querySelector('a h3')?.parentElement;
                    if (!linkEl) {
                        // 备用选择器
                        const altLink = el.querySelector('a[href^="http"]:not([href*="google."])');
                        if (!altLink) return null;
                        const titleEl = altLink.querySelector('h3, [role="heading"]');
                        const title = (titleEl ? titleEl.textContent : altLink.textContent || '').trim();
                        const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe, div[style*="-webkit-line-clamp"]');
                        const snippet = (snippetEl ? snippetEl.textContent : '').trim();
                        const isAd = !!el.querySelector('span:has-text("Ad"), span:has-text("Sponsored"), [data-text-ad]');
                        return { url: altLink.href, title, snippet, isAd };
                    }
                    const url = linkEl.href || '';
                    const title = (linkEl.querySelector('h3')?.textContent || linkEl.textContent || '').trim();
                    const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, span.aCOpRe, div[style*="-webkit-line-clamp"]');
                    const snippet = (snippetEl ? snippetEl.textContent : '').trim();
                    const isAd = !!el.querySelector('span:has-text("Ad"), span:has-text("Sponsored")');
                    return { url, title, snippet, isAd };
                },
            },
            {
                name: 'bing',
                hostPatterns: [/bing\.com/],
                resultSelector: 'li.b_algo, ol#b_results > li.b_algo',
                extractors(el) {
                    const linkEl = el.querySelector('h2 a, .b_title a');
                    if (!linkEl) return null;
                    const url = linkEl.href || '';
                    const title = (linkEl.textContent || '').trim();
                    const snippetEl = el.querySelector('.b_caption p, .b_lineclamp2, .b_algoSlug');
                    const snippet = (snippetEl ? snippetEl.textContent : '').trim();
                    // Bing 广告
                    const isAd = !!(
                        el.querySelector('.b_ad, .b_adLast') ||
                        (el.querySelector('.b_supp')?.textContent?.includes('Ad'))
                    );
                    return { url, title, snippet, isAd };
                },
            },
        ];

        let currentEngine = null;

        function detectEngine() {
            const host = location.hostname;
            for (const def of ENGINE_DEFINITIONS) {
                for (const pattern of def.hostPatterns) {
                    if (pattern.test(host)) {
                        currentEngine = def;
                        return def;
                    }
                }
            }
            return null;
        }

        /**
         * 解析页面，返回标准化的搜索结果数组
         * @returns {Array<{url: string, title: string, snippet: string, isAd: boolean, element: HTMLElement}>}
         */
        function parseResults() {
            const engine = detectEngine();
            if (!engine) {
                console.warn('[SearchGuard] 不支持的搜索引擎:', location.hostname);
                return [];
            }

            const rawElements = document.querySelectorAll(engine.resultSelector);
            const results = [];

            for (const el of rawElements) {
                // 排除嵌套子结果
                if (engine.excludeSelector && el.closest(engine.excludeSelector)) continue;
                // 排除已被包裹在父结果中的元素
                if (el.parentElement?.closest(engine.resultSelector)) continue;

                const data = engine.extractors(el);
                if (!data || !data.url || data.url === '') continue;
                // 排除搜索引擎自身链接
                if (data.url.includes('baidu.com/link') || data.url.includes('google.com/url')) {
                    // 百度使用跳转链接，Google 使用 /url 重定向——仍需要处理
                }
                // 跳过明显的非结果链接（如导航链接）
                if (!data.title || data.title.length < 2) continue;

                results.push({
                    ...data,
                    element: el,
                });
            }

            console.log(`[SearchGuard] 从 ${engine.name} 解析到 ${results.length} 条搜索结果`);
            return results;
        }

        function getEngineName() {
            return currentEngine ? currentEngine.name : 'unknown';
        }

        return {
            parseResults,
            getEngineName,
            detectEngine,
        };
    })();

    // =========================================================================
    // 模块四：站点分类器 (SiteClassifier)
    // 综合白名单匹配和仿冒分析，输出最终分类结果
    // =========================================================================
    const SiteClassifier = (() => {
        function classify(result) {
            const analysis = DomainAnalyzer.analyze(
                result.url,
                result.title,
                result.snippet
            );

            // 广告 + 仿冒特征 = 增强可疑
            if (result.isAd && analysis.classification === 'suspicious') {
                return {
                    ...analysis,
                    classification: 'suspicious',
                    reason: `[广告] ${analysis.reason}`,
                    priority: 'high',
                };
            }

            // 单纯的广告标记
            if (result.isAd && analysis.classification === 'normal') {
                return {
                    ...analysis,
                    classification: 'suspicious',
                    reason: '包含广告标签但伪装为自然搜索结果',
                    priority: 'medium',
                };
            }

            return {
                ...analysis,
                priority: analysis.classification === 'suspicious' ? 'high' : 'normal',
            };
        }

        return { classify };
    })();

    // =========================================================================
    // 模块五：UI 渲染器 (UIRenderer)
    // 负责全局样式注入和每个搜索结果的视觉标记
    // =========================================================================
    const UIRenderer = (() => {
        const BADGE_ID_PREFIX = 'sg-badge-';
        let badgeCounter = 0;

        /**
         * 注入全局 CSS 样式
         */
        function injectGlobalStyles() {
            const css = `
                /* === SearchGuard 全局样式 === */

                /* 官方网站高亮 */
                .sg-official-result {
                    position: relative;
                    border-left: 4px solid #22c55e !important;
                    border-radius: 6px !important;
                    background: linear-gradient(90deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.01) 100%) !important;
                    padding-left: 12px !important;
                    margin-left: -16px !important;
                    transition: background 0.3s ease;
                }
                .sg-official-result:hover {
                    background: linear-gradient(90deg, rgba(34,197,94,0.10) 0%, rgba(34,197,94,0.03) 100%) !important;
                }

                /* 官方徽章 */
                .sg-official-badge {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    padding: 2px 8px !important;
                    margin-right: 6px !important;
                    background: #22c55e !important;
                    color: #fff !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    border-radius: 10px !important;
                    line-height: 1.4 !important;
                    white-space: nowrap !important;
                    vertical-align: middle !important;
                    user-select: none !important;
                    flex-shrink: 0 !important;
                }
                .sg-official-badge::before {
                    content: '✓' !important;
                    font-weight: bold !important;
                    font-size: 10px !important;
                }

                /* 仿冒网站降权 */
                .sg-suspicious-result {
                    opacity: 0.45 !important;
                    border: 1.8px dashed #ef4444 !important;
                    border-radius: 6px !important;
                    padding: 8px !important;
                    position: relative !important;
                    transition: opacity 0.25s ease, border-color 0.25s ease !important;
                }
                .sg-suspicious-result:hover {
                    opacity: 0.75 !important;
                    border-color: #dc2626 !important;
                }

                /* 仿冒标签 */
                .sg-suspicious-badge {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 3px !important;
                    padding: 2px 8px !important;
                    margin-right: 6px !important;
                    background: #ef4444 !important;
                    color: #fff !important;
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    border-radius: 10px !important;
                    line-height: 1.4 !important;
                    white-space: nowrap !important;
                    vertical-align: middle !important;
                    user-select: none !important;
                    flex-shrink: 0 !important;
                    animation: sg-pulse-warning 2s infinite !important;
                }
                .sg-suspicious-badge::before {
                    content: '⚠' !important;
                    font-size: 10px !important;
                }

                @keyframes sg-pulse-warning {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50%      { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
                }

                /* 官方站点名称标签 */
                .sg-official-label {
                    display: inline-flex !important;
                    align-items: center !important;
                    gap: 2px !important;
                    margin-left: 6px !important;
                    padding: 1px 6px !important;
                    background: #f0fdf4 !important;
                    color: #166534 !important;
                    font-size: 10px !important;
                    font-weight: 500 !important;
                    border: 1px solid #bbf7d0 !important;
                    border-radius: 4px !important;
                    white-space: nowrap !important;
                    vertical-align: middle !important;
                }

                /* 暗色模式适配 */
                @media (prefers-color-scheme: dark) {
                    .sg-official-badge {
                        background: #16a34a !important;
                    }
                    .sg-suspicious-badge {
                        background: #dc2626 !important;
                    }
                    .sg-suspicious-result:hover {
                        opacity: 0.85 !important;
                    }
                    .sg-official-label {
                        background: rgba(34,197,94,0.15) !important;
                        color: #86efac !important;
                        border-color: rgba(34,197,94,0.3) !important;
                    }
                }

                /* 仿冒原因提示 Tooltip */
                .sg-tooltip-container {
                    position: relative !important;
                    display: inline-flex !important;
                    cursor: help !important;
                }
                .sg-tooltip-text {
                    visibility: hidden !important;
                    opacity: 0 !important;
                    position: absolute !important;
                    bottom: 120% !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    background: #1e293b !important;
                    color: #f1f5f9 !important;
                    padding: 6px 12px !important;
                    border-radius: 6px !important;
                    font-size: 12px !important;
                    white-space: nowrap !important;
                    z-index: 99999 !important;
                    transition: opacity 0.2s !important;
                    pointer-events: none !important;
                }
                .sg-tooltip-container:hover .sg-tooltip-text {
                    visibility: visible !important;
                    opacity: 1 !important;
                }
            `;
            GM_addStyle(css);
        }

        /**
         * 为官方结果添加高亮样式和徽章
         */
        function markOfficial(resultEl, entry, titleEl) {
            // 结果容器高亮
            resultEl.classList.add('sg-official-result');

            // 标题前插入官方徽章
            if (titleEl) {
                const badge = document.createElement('span');
                badge.className = 'sg-official-badge';
                badge.textContent = '官方';
                badge.id = BADGE_ID_PREFIX + (badgeCounter++);
                titleEl.insertAdjacentElement('afterbegin', badge);

                // 机构名称标签
                if (entry.name) {
                    const label = document.createElement('span');
                    label.className = 'sg-official-label';
                    label.textContent = entry.name;
                    titleEl.insertBefore(label, titleEl.firstChild.nextSibling || titleEl.firstChild);
                }
            }
        }

        /**
         * 为仿冒结果添加警告样式
         */
        function markSuspicious(resultEl, reason, titleEl) {
            resultEl.classList.add('sg-suspicious-result');

            if (titleEl) {
                // 仿冒警告徽章
                const badge = document.createElement('span');
                badge.className = 'sg-suspicious-badge';
                badge.textContent = '疑似仿冒';
                badge.id = BADGE_ID_PREFIX + (badgeCounter++);
                titleEl.insertAdjacentElement('afterbegin', badge);

                // Tooltip 显示原因
                if (reason) {
                    const tooltip = document.createElement('span');
                    tooltip.className = 'sg-tooltip-container';
                    const tooltipText = document.createElement('span');
                    tooltipText.className = 'sg-tooltip-text';
                    tooltipText.textContent = reason;
                    tooltip.appendChild(tooltipText);
                    titleEl.insertBefore(tooltip, titleEl.firstChild.nextSibling || titleEl.firstChild);
                }
            }
        }

        /**
         * 对一条搜索结果执行视觉处理
         */
        function applyToResult(result, classification) {
            const el = result.element;
            if (!el) return;

            // 根据搜索引擎定位标题元素
            const engineName = SearchEngineAdapter.getEngineName();
            let titleEl;
            switch (engineName) {
                case 'baidu':
                    titleEl = el.querySelector('h3 a, .t a');
                    break;
                case 'google':
                    titleEl = el.querySelector('h3');
                    break;
                case 'bing':
                    titleEl = el.querySelector('h2 a, .b_title a');
                    break;
                default:
                    titleEl = el.querySelector('h2 a, h3 a, h3');
            }

            switch (classification.classification) {
                case 'official':
                    markOfficial(el, classification.entry, titleEl);
                    break;
                case 'suspicious':
                    markSuspicious(el, classification.reason, titleEl);
                    break;
                case 'normal':
                default:
                    // 不做处理
                    break;
            }
        }

        return {
            injectGlobalStyles,
            applyToResult,
        };
    })();

    // =========================================================================
    // 主控制器 (Main)
    // 编排各模块，执行完整流程
    // =========================================================================
    function run() {
        const settings = ConfigManager.getSettings();
        if (!settings.enabled) return;

        const results = SearchEngineAdapter.parseResults();
        if (results.length === 0) return;

        let officialCount = 0;
        let suspiciousCount = 0;

        for (const result of results) {
            // 跳过已处理的结果（避免重复处理）
            if (result.element.dataset.sgProcessed === 'true') continue;

            const classification = SiteClassifier.classify(result);
            UIRenderer.applyToResult(result, classification);

            result.element.dataset.sgProcessed = 'true';
            result.element.dataset.sgClass = classification.classification;

            if (classification.classification === 'official') officialCount++;
            if (classification.classification === 'suspicious') suspiciousCount++;
        }

        console.log(
            `[SearchGuard] 处理完成 | 引擎: ${SearchEngineAdapter.getEngineName()} | ` +
            `总计: ${results.length} | 官方: ${officialCount} | 可疑: ${suspiciousCount}`
        );

        if (settings.enableNotification && suspiciousCount > 0) {
            GM_notification({
                title: 'SearchGuard 检测到可疑结果',
                text: `当前页面发现 ${suspiciousCount} 个疑似仿冒网站，已自动降权标记。`,
                timeout: 4000,
            });
        }
    }

    // =========================================================================
    // 初始化
    // =========================================================================
    function init() {
        console.log('[SearchGuard] v1.0.0 初始化中...');

        // 注入全局样式（仅一次）
        UIRenderer.injectGlobalStyles();

        // 首轮执行
        // 等待 DOM 渲染（搜索引擎通常异步加载结果）
        setTimeout(run, 800);

        // 使用 MutationObserver 监听后续 DOM 变化（如翻页、无限滚动）
        const observer = new MutationObserver(() => {
            // 防抖：300ms 内多次变化只触发一次
            clearTimeout(observer._debounceTimer);
            observer._debounceTimer = setTimeout(run, 300);
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true,
        });

        console.log('[SearchGuard] 初始化完毕，MutationObserver 已就绪');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();