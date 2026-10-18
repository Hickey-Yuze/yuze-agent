(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"observeDynamic": true, "mode": "remove", "showStats": true, "logLevel": "summary"};
  const __tabOriginalFunction = (
    /**
     * 网页去广告脚本 - Ad Remover
     * 自动识别并移除网页上的各类垃圾广告元素
     * 支持静态移除 + MutationObserver 动态拦截
     */
    async function run(args) {
      const stats = { removed: 0, hidden: 0, observerStarted: false };
    
      // ========== 配置 ==========
      const config = {
        // 是否启用动态观察（持续拦截新加载的广告）
        observeDynamic: args?.observeDynamic !== false,
        // 移除方式: 'remove' 直接删除DOM | 'display:none' 隐藏
        mode: args?.mode || 'remove',
        // 是否在页面上显示统计浮窗
        showStats: args?.showStats !== false,
        // 日志级别: 'none' | 'summary' | 'verbose'
        logLevel: args?.logLevel || 'summary',
      };
    
      // ========== 广告选择器规则 ==========
      const AD_SELECTORS = [
        /* ---- 通用广告容器 ID/Class 关键词 ---- */
        '[id*="ad"]', '[id*="Ad"]', '[id*="AD"]',
        '[id*="advert"]', '[id*="banner-ad"]', '[id*="ad-banner"]',
        '[id*="ad-wrap"]', '[id*="adbox"]', '[id*="ad-container"]',
        '[id*="ad-slot"]', '[id*="adunit"]', '[id*="adsense"]',
        '[id*="google_ad"]', '[id*="gpt-ad"]', '[id*="dfp-ad"]',
        '[class*="ad-banner"]', '[class*="ad-box"]', '[class*="ad-container"]',
        '[class*="ad-wrapper"]', '[class*="ad-slot"]', '[class*="ad-unit"]',
        '[class*="adsbygoogle"]', '[class*="ad-placement"]',
        '[class*="advertisement"]', '[class*="ad-content"]',
        '[class*="popad"]', '[class*="popup-ad"]', '[class*="float-ad"]',
        '[class*="fixed-ad"]', '[class*="sticky-ad"]', '[class*="sponsored"]',
        '[class*="ad-overlay"]', '[class*="ad-modal"]', '[class*="interstitial"]',
    
        /* ---- 常见广告平台选择器 ---- */
        'ins.adsbygoogle',
        '[data-ad-client]', '[data-ad-slot]', '[data-ad-format]',
        '[data-google-query-id]',
        'iframe[src*="doubleclick"]', 'iframe[src*="googlesyndication"]',
        'iframe[src*="adsystem"]', 'iframe[src*="amazon-adsystem"]',
        'iframe[src*="adnxs"]', 'iframe[src*="adbrite"]',
        'iframe[src*="adform"]', 'iframe[src*="adserver"]',
        'iframe[src*="tracking"]', 'iframe[src*="analytics"]',
        'div[id^="google_ads"]', 'div[id^="div-gpt-ad"]',
        '.ad-slogan', '.ad-link', '.ad-image', '.ad-text', '.ad-title',
        '[aria-label*="advertisement"]', '[role="complementary"][class*="ad"]',
    
        /* ---- 弹窗/悬浮广告 ---- */
        '[class*="popup"]', '[class*="pop-up"]', '[class*="modal"][class*="ad"]',
        '[class*="overlay"][class*="ad"]', '[class*="lightbox"][class*="ad"]',
        '[style*="position: fixed"][class*="ad"]',
        '[style*="position:fixed"][class*="ad"]',
        'div[id*="popup"]', 'div[id*="pop-up"]',
        '[class*="float-"]', '[class*="fixed-bottom"]', '[class*="fixed-top"]',
    
        /* ---- 常见中文网站广告 ---- */
        '[id*="jia"], [class*="jia"]',
        '[id*="guanggao"]', '[class*="guanggao"]',
        '[id*="gg_"]', '[class*="gg_"]',
        '[id*="tonglan"]', '[class*="tonglan"]',
        '[id*="duilian"]', '[class*="duilian"]',
        '[class*="tb-ad"]', '[id*="tb-ad"]',
    
        /* ---- 社交媒体/视频广告 ---- */
        '[data-testid*="ad"]', '[data-e2e*="ad"]',
        '[class*="feed-ad"]', '[class*="info-stream-ad"]',
        '[class*="promoted"]', '[class*="suggested-post"]',
        '[class*="related-ad"]', '[class*="recommend-ad"]',
      ];
    
      // 排除列表：误杀白名单（包含这些关键词的元素不处理）
      const EXCLUDE_KEYWORDS = [
        'address', 'admin', 'advance', 'adapters', 'adapter',
        'badge', 'breadcrumb', 'heading', 'header', 'read',
        'load', 'road', 'dead', 'head', 'lead', 'ready',
        'shade', 'spread', 'thread', 'bread',
      ];
    
      // ========== 工具函数 ==========
      function shouldExclude(el) {
        const id = (el.id || '').toLowerCase();
        const cls = (el.className || '').toLowerCase();
        const tag = el.tagName.toLowerCase();
        const combined = `${id} ${cls} ${tag}`;
        return EXCLUDE_KEYWORDS.some(kw => combined.includes(kw));
      }
    
      function isLikelyAd(el) {
        if (!el || !(el instanceof Element)) return false;
        // 排除 <body>, <html>, <main> 等关键结构元素
        const tag = el.tagName.toLowerCase();
        if (['body', 'html', 'main', 'article', 'header', 'footer', 'nav', 'aside'].includes(tag)) {
          // aside 只有明确含 ad 才处理
          if (tag === 'aside') {
            const cls = (el.className || '').toLowerCase();
            const id = (el.id || '').toLowerCase;
            return !!(cls.includes('ad') || id.includes('ad') || cls.includes('sponsor'));
          }
          return false;
        }
        if (shouldExclude(el)) return false;
    
        // 检查尺寸：过小或不可见的元素跳过
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) return false;
        } catch (e) {}
    
        // 检查 data 属性
        if (el.dataset && (el.dataset.adClient || el.dataset.adSlot || el.dataset.adservice)) {
          return true;
        }
        return true;
      }
    
      function removeElement(el) {
        if (!el || !el.parentNode) return false;
        try {
          if (config.mode === 'remove') {
            el.parentNode.removeChild(el);
            stats.removed++;
          } else {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('height', '0', 'important');
            el.style.setProperty('overflow', 'hidden', 'important');
            stats.hidden++;
          }
          return true;
        } catch (e) {
          return false;
        }
      }
    
      // ========== 核心移除逻辑 ==========
      function scanAndRemove() {
        const processed = new Set();
    
        for (const selector of AD_SELECTORS) {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (processed.has(el)) return;
              processed.add(el);
              if (isLikelyAd(el)) {
                removeElement(el);
              }
            });
          } catch (err) {
            // 忽略无效选择器
          }
        }
    
        // 额外：处理 iframe 内的广告
        try {
          document.querySelectorAll('iframe').forEach(iframe => {
            if (processed.has(iframe)) return;
            const src = (iframe.src || '').toLowerCase();
            const adKeywords = ['ad', 'ads', 'advert', 'doubleclick', 'googlesyndication',
              'adsystem', 'adserver', 'tracking', 'delivery', 'popunder', 'popcash'];
            if (adKeywords.some(k => src.includes(k))) {
              processed.add(iframe);
              removeElement(iframe);
            }
          });
        } catch (e) {}
      }
    
      // ========== 执行初始扫描 ==========
      scanAndRemove();
    
      // ========== MutationObserver 动态拦截 ==========
      let observer = null;
      if (config.observeDynamic) {
        try {
          observer = new MutationObserver((mutations) => {
            let foundNew = false;
            for (const mutation of mutations) {
              for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.ELEMENT_NODE) {
                  // 检查新节点本身是否是广告
                  AD_SELECTORS.forEach(sel => {
                    try {
                      if (node.matches && node.matches(sel) && isLikelyAd(node)) {
                        removeElement(node);
                        foundNew = true;
                      }
                    } catch (e) {}
                  });
                  // 检查新节点的子元素
                  try {
                    node.querySelectorAll && node.querySelectorAll(AD_SELECTORS.join(',')).forEach(child => {
                      if (isLikelyAd(child)) {
                        removeElement(child);
                        foundNew = true;
                      }
                    });
                  } catch (e) {}
                }
              }
            }
          });
    
          observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
          });
          stats.observerStarted = true;
        } catch (e) {
          stats.observerStarted = false;
        }
      }
    
      // ========== 统计浮窗 ==========
      let statsEl = null;
      if (config.showStats) {
        try {
          statsEl = document.createElement('div');
          statsEl.id = 'ad-remover-stats';
          statsEl.innerHTML = `
            <div style="
              position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
              background: rgba(0,0,0,0.82); color: #4ade80; padding: 10px 14px;
              border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              font-size: 13px; line-height: 1.6; cursor: pointer; user-select: none;
              box-shadow: 0 4px 20px rgba(0,0,0,0.35); min-width: 180px;
              border: 1px solid rgba(74,222,128,0.25);
            " title="点击关闭">
              🧹 <b>去广告脚本</b><br>
              已移除: <span id="ar-count">${stats.removed + stats.hidden}</span> 个<br>
              <span style="color:#9ca3af;font-size:11px">
                ${stats.observerStarted ? '🔍 动态拦截已开启' : '⚠️ 仅静态扫描'}
              </span><br>
              <span style="color:#666;font-size:10px">点击关闭此浮窗</span>
            </div>
          `;
          document.body.appendChild(statsEl);
          statsEl.addEventListener('click', () => {
            if (statsEl && statsEl.parentNode) {
              statsEl.parentNode.removeChild(statsEl);
              statsEl = null;
            }
          });
        } catch (e) {}
      }
    
      // ========== 返回结果 ==========
      return {
        ok: true,
        summary: `网页去广告完成。共移除/隐藏 ${stats.removed + stats.hidden} 个广告元素。${stats.observerStarted ? '动态拦截已开启，将持续清理新加载的广告。' : ''}`,
        removed_count: stats.removed,
        hidden_count: stats.hidden,
        total_removed: stats.removed + stats.hidden,
        observer_active: stats.observerStarted,
        mode: config.mode,
        data: {
          selectors_used: AD_SELECTORS.length,
          exclude_keywords: EXCLUDE_KEYWORDS.length,
        },
        warnings: [],
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();