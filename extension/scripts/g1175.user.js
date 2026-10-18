// ==UserScript==
// @namespace    https://Yuze-ai.com
// @version      3.0
// @description  全方位隐藏各大平台推广广告，覆盖 B站/小红书/知乎/微博/豆瓣/CSDN/贴吧/头条及搜索/电商/视频/新闻等 50+ 站点
// @author       Yuze
// @match        *://*/*
// @grant        none
// @run-at       document-end
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // ==================== 关键词 ====================
  const AD_TEXT_KEYWORDS = [
    '广告', '推广', '热门推荐', '为您推荐', '猜你喜欢',
    '赞助', '合作推广', '品牌推广', '商业推广',
    'sponsored', 'promoted', 'advertisement', 'ad',
    'プロモーション', '広告',
  ];

  // ==================== 全平台 CSS 选择器 ====================

  // --- 通用兜底 ---
  const generic = [
    '[aria-label*="广告"]', '[aria-label*="推广"]', '[aria-label*="sponsored"]',
    '[data-advertisement]', '[data-ad]', '[data-adv]', '[data-advert]',
    '[id*="ad-"]', '[id*="_ad_"]', '[id*="ad_"]',
    '[class*="ad-"]', '[class*="_ad_"]', '[class*="ad_"]',
    '.advertisement', '.sponsored', '.promoted', '.advert',
    '[data-spm*="ad"]',
  ];

  // --- 搜索引擎 ---
  const searchEngines = [
    // 百度
    '.c-result[data-click*="广告"]', '.result-op[tpl="ad"]',
    '.EC_result', '.ec-tuiguang', '.result-op[tpl="ec_tuiguang"]',
    '.c-container[data-block="true"] .c-gap-top-small:has(.c-color-gray)',
    // Google
    '#tads', '#tadsb', '#tvcap', '.commercial-unit-desktop-top',
    '.commercial-unit-desktop-rhs', 'g-inner-card[data-text-ad]',
    '.uEierd', '.mnr-c.pla-unit',
    // Bing
    '.b_ad .b_adLastChild', 'li.b_ad', '.sb_add', '#b_results .b_ad',
    // 搜狗
    '.rb[data-adv]', '.vrwrap[data-ad]', '.ad_result',
    // 360
    '.e_result[data-ad]', '.res-list[data-adv]', '.g-ad',
    // DuckDuckGo
    '.result--ad',
    // Yandex
    '.serp-item[data-type="ad"]',
  ];

  // --- 哔哩哔哩 ---
  const bilibili = [
    '.bili-video-card .ad-mark',
    '.video-page-card-small .ad-tag',
    '.recommend-list .ad-item',
    '.feed-card .ad-marker',
    '.homepage-ad', '.bilibili-player .ad-mark',
    '.video-list-item .ad-badge',
    '[class*="bili-ad"]', '[class*="promoted-card"]',
    '.search-all-list .video-list-item:has(.ad)',
    '.popular-video-card:has(.ad-mark)',
  ];

  // --- 小红书 ---
  const xiaohongshu = [
    '.note-item:has(.sponsor)',
    '.note-item:has(.ad-tag)',
    '.note-item:has([class*="sponsor"])',
    '.feeds-page .ad-card',
    '.search-result .ad-item',
    '.note-item[data-ad]',
    '[class*="ad-container"]',
  ];

  // --- 知乎 ---
  const zhihu = [
    '.Pc-card[data-ad]',
    '.TopstoryItem-advertCard',
    '.Card.AdvertCard',
    '.econ-ad-item',
    '.RichContent-ads',
    '.AdvertImg',
    '.Pc-feedAd',
    '.css-14dbet0',        // 信息流广告容器
    '[data-advert="true"]',
  ];

  // --- 微博 ---
  const weibo = [
    '.WB_cardwrap.S_bg2[ad-mark]',
    '.WB_feed_type[ad-mark]',
    '.feed-card[data-is-ad]',
    '.card[action-type="feed_list_ad"]',
    '.ad-wrap', '.PCD_ad',
    '[ad-mark]',
  ];

  // --- 豆瓣 ---
  const douban = [
    '.ad-cards', '.ad-card', '.ad_cards',
    '.commercial',
    '.promoted-item',
  ];

  // --- CSDN ---
  const csdn = [
    '.pulllog-box',          // 底部弹窗
    '.recommend-ad-box',
    '.advertise-box',
    '.ad-wrap',
    '.csdn-side-toolbar-ad',
    '#adBox', '.ad_class',
    '.adsbygoogle',
    '.programmer1Box',       // 右侧广告位
    '.aside-ad',
  ];

  // --- 简书 ---
  const jianshu = [
    '.ad-wrap', '.ad-container', '.note-ad',
    '.recommend-ad',
  ];

  // --- 百度贴吧 ---
  const tieba = [
    '.ad_list', '.ad-link',
    '.threadlist_ad',
    '.thread-ad',
  ];

  // --- 今日头条 ---
  const toutiao = [
    '.feed-card[data-ad]',
    '.article-card[ad-label]',
    '.ad-item', '.ad-label',
    '.wcommon_ad_feed',
    '[class*="ad_feed"]',
  ];

  // --- 电商 ---
  const ecommerce = [
    // 淘宝 / 天猫
    '.J_Sponsored', '.item[data-ad]',
    '.tmall-ad', '.taobao-ad',
    '[data-spm*="ad"]',
    // 京东
    '.J_promotion', '.ad-spot',
    '[class*="sponsored"]',
    // 拼多多
    '[data-type="ad"]',
    '.ad-tag',
  ];

  // --- 视频平台 ---
  const videoPlatforms = [
    // 爱奇艺
    '.ad-banner', '.qy-ad',
    // 优酷
    '.yk-ad', '.youku-ad',
    // 腾讯视频
    '.txv-ad', '.ad-poster',
    // 芒果TV
    '.mgtv-ad',
    // 抖音网页版
    '[data-e2e="feed-ad"]',
    '.ad-card',
    // 快手网页版
    '.ad-item',
  ];

  // --- 新闻资讯 ---
  const newsPlatforms = [
    // 网易
    '.ad_ntes', '.gg_300',
    // 新浪
    '.ad-list', '.ad-blk',
    // 搜狐
    '.ad-box', '.ad-location',
    // 凤凰
    '.ad-banner', '.adList',
    // 腾讯新闻
    '.ad-item', '.ad-area',
  ];

  // --- 掘金 / SegmentFault ---
  const tech = [
    '.sidebar-ad', '.ad-banner',
    '.promotion-card',
  ];

  // --- 聚合所有选择器 ---
  const ALL_AD_SELECTORS = [
    ...generic,
    ...searchEngines,
    ...bilibili,
    ...xiaohongshu,
    ...zhihu,
    ...weibo,
    ...douban,
    ...csdn,
    ...jianshu,
    ...tieba,
    ...toutiao,
    ...ecommerce,
    ...videoPlatforms,
    ...newsPlatforms,
    ...tech,
  ];

  // ==================== 工具函数 ====================
  const HIDDEN_ATTR = 'data-Yuze-ad-hidden';

  function isHidden(el) {
    return el && el.hasAttribute && el.hasAttribute(HIDDEN_ATTR);
  }

  function hideElement(el) {
    if (!el || !el.style) return;
    if (el.style.display === 'none') return;
    el.style.display = 'none';
    el.setAttribute(HIDDEN_ATTR, 'true');
  }

  function hasAdText(text) {
    const t = text.toLowerCase();
    return AD_TEXT_KEYWORDS.some(kw => t.includes(kw.toLowerCase()));
  }

  // ==================== 选择器批量隐藏 ====================
  function hideBySelectors(root = document) {
    for (const sel of ALL_AD_SELECTORS) {
      try {
        root.querySelectorAll(sel).forEach(el => {
          if (!isHidden(el)) hideElement(el);
        });
      } catch (_) { /* 忽略无效选择器 */ }
    }
  }

  // ==================== 文本深度扫描 ====================
  function hideByTextScan(root = document.body) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = (node.textContent || '').trim();
          if (!text || text.length > 150) return NodeFilter.FILTER_REJECT;
          if (node.parentElement?.closest(`[${HIDDEN_ATTR}]`))
            return NodeFilter.FILTER_REJECT;
          return hasAdText(text)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      }
    );

    // 常见的搜索结果 / 内容卡片容器标签
    const CARD_TAGS = new Set([
      'LI', 'DIV', 'SECTION', 'ARTICLE', 'TR', 'DD',
    ]);

    let node;
    while ((node = walker.nextNode())) {
      let candidate = node.parentElement;
      for (let i = 0; i < 10 && candidate; i++) {
        if (isHidden(candidate)) break;
        if (CARD_TAGS.has(candidate.tagName)) {
          // 再往上找一层典型卡片（搜索结果项、帖子卡片等）
          const card = candidate.closest(
            'li, .result, .g, .result-item, [data-result], .c-container, ' +
            '.resitem, .vrwrap, .rb, .e_result, .res-list, ' +
            '.note-item, .feed-card, .WB_cardwrap, .Pc-card, ' +
            '.ContentItem, .video-card, .thread, .bili-video-card'
          );
          hideElement(card || candidate);
          break;
        }
        candidate = candidate.parentElement;
      }
    }
  }

  // ==================== iframe 递归扫描 ====================
  function scanIframes() {
    try {
      document.querySelectorAll('iframe').forEach(iframe => {
        try {
          const doc = iframe.contentDocument;
          if (doc) {
            hideBySelectors(doc);
            hideByTextScan(doc.body);
          }
        } catch (_) { /* 跨域 iframe 跳过 */ }
      });
    } catch (_) {}
  }

  // ==================== MutationObserver 动态监控 ====================
  let pending = false;
  function scheduleScan() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      hideBySelectors(document);
      hideByTextScan(document.body);
      scanIframes();
      pending = false;
    });
  }

  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      // 快速通道：新节点直接判断是否为已知广告容器
      for (const added of m.addedNodes) {
        if (added.nodeType === 1) {
          // 先跑选择器看看能不能直接命中
          for (const sel of ALL_AD_SELECTORS) {
            try {
              if (added.matches?.(sel) && !isHidden(added)) {
                hideElement(added);
                return;
              }
              if (added.querySelectorAll?.(sel).length > 0) {
                scheduleScan();
                return;
              }
            } catch (_) {}
          }
          // 再跑文本扫描看是否含广告关键词
          const text = (added.textContent || '').trim();
          if (text.length <= 200 && hasAdText(text)) {
            scheduleScan();
            return;
          }
        }
      }
    }
  });

  // ==================== 启动 ====================
  function init() {
    hideBySelectors(document);
    hideByTextScan(document.body);
    scanIframes();

    observer.observe(document.body, { childList: true, subtree: true });

    // 多层兜底
    window.addEventListener('load', () => {
      setTimeout(scheduleScan, 300);
      setTimeout(scheduleScan, 1500);
      setTimeout(scheduleScan, 4000);
    });

    // 监听 URL 变化（SPA 路由切换）
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(scheduleScan, 500);
        setTimeout(scheduleScan, 2000);
      }
    });
    // 部分 SPA 通过 title 变化体现路由切换
    const titleEl = document.querySelector('title');
    if (titleEl) {
      urlObserver.observe(titleEl, { childList: true });
    }

    console.log(
      '%c[全平台广告排雷·至尊版] %c已启动 ' +
      '%c覆盖 50+ 站点 · 搜索引擎/B站/小红书/知乎/微博/豆瓣/CSDN/贴吧/头条/电商/视频/新闻',
      'color:#00c853;font-weight:bold;',
      'color:#fff;',
      'color:#aaa;'
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();