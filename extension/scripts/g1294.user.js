(function() {
  'use strict';

  function removeAds() {
    const selectors = [
      // 登录弹窗遮罩
      '.passport-login-tip-container',
      '.mask-dark',
      // VIP限时优惠弹窗
      '#vip-limited-time-offer-box-new',
      // 广告 iframe（kunpeng-sc）
      'iframe[src*="kunpeng-sc.csdnimg.cn"]',
      // 侧边栏广告位
      '#kp_box_56',
      '#kp_box_57',
      '#kp_box_58',
      '#kp_box_479',
      '#kp_box_530',
      '#dmp_ad_58',
      '#footerRightAds',
      // 万维广告联盟
      '.wwads-cn',
      // 右侧推荐广告
      '#recommendAdBox',
      // 图片预览中的广告
      '.csdn-side-toolbar .sidecolumn-deepseek'
    ];

    let removedCount = 0;

    selectors.forEach(function(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(function(el) {
          el.style.display = 'none';
          el.remove();
          removedCount++;
        });
      } catch (e) {
        // ignore
      }
    });

    if (removedCount > 0) {
      console.log('[AdBlocker] 已移除 ' + removedCount + ' 个广告元素');
    }
  }

  // 立即执行一次
  removeAds();

  // 使用 MutationObserver 监听动态加载的广告
  const observer = new MutationObserver(function(mutations) {
    let shouldClean = false;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) {
          const tag = node.tagName.toLowerCase();
          const cls = node.className || '';
          const src = node.src || '';
          // 检测新增的广告元素
          if (
            tag === 'iframe' && (src.includes('kunpeng') || src.includes('ads')) ||
            cls.toString().includes('wwads') ||
            cls.toString().includes('passport-login') ||
            cls.toString().includes('vip-limited') ||
            (tag === 'div' && (cls.includes('kp_box') || cls.includes('recommendAd')))
          ) {
            shouldClean = true;
            break;
          }
        }
      }
      if (shouldClean) break;
    }
    if (shouldClean) {
      removeAds();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 定时清理（防止遗漏）
  setInterval(removeAds, 3000);
})();