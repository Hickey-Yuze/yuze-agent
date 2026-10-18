(function() {
  function blockAds() {
    console.log('正在屏蔽广告...');
    
    // 广告选择器列表
    const adSelectors = [
      '.ad-report.strip-ad.left-banner',
      '.video-card-ad-small',
      '.ad-report.ad-floor-exp.right-bottom-banner',
      '.ad-report'
    ];
    
    // 遍历并移除广告元素
    adSelectors.forEach(selector => {
      const ads = document.querySelectorAll(selector);
      ads.forEach(ad => {
        if (ad) {
          ad.style.display = 'none';
          console.log('已屏蔽广告:', selector);
        }
      });
    });
    
    // 额外屏蔽：移除包含"广告"标识的元素
    const badgeAds = document.querySelectorAll('.badge-text');
    badgeAds.forEach(badge => {
      if (badge.textContent === '广告') {
        const parentAd = badge.closest('.video-card-ad-small, .ad-report');
        if (parentAd) {
          parentAd.style.display = 'none';
        }
      }
    });
  }
  
  // 立即执行
  blockAds();
  
  // 监听DOM变化，处理动态加载的广告
  const observer = new MutationObserver(() => {
    blockAds();
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('广告屏蔽脚本已启动');
})();