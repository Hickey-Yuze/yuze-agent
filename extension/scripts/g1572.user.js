(function() {
  'use strict';

  // 防止重复执行
  if (window.wordStyleApplied) return;
  window.wordStyleApplied = true;

  function applyWordStyle() {
    console.log('正在应用Word样式...');

    // 创建Word样式
    const style = document.createElement('style');
    style.id = 'word-style-override';
    style.textContent = `
      /* 基础Word样式 */
      body {
        background: #ffffff !important;
        font-family: "Calibri", "Segoe UI", "Microsoft YaHei", sans-serif !important;
        color: #000000 !important;
        line-height: 1.5 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 隐藏所有广告、推广、图片和工具栏 */
      #right-container,
      #r-menu,
      .tooltip-wrapper,
      .app-guide-wrapper,
      ._rewardList_jisem_222,
      .chapter-end-qrcode,
      .page-ops,
      #r-recommends,
      ._wrapper_jisem_193,
      ._moreComment_1yd9u_193,
      #left-container,
      #navbar,
      #r-breadcrumbs,
      #r-titlePage,
      #r-authorSay,
      .chapter-wrapper .absolute,
      img:not([alt*="完美人生"]),
      [class*="ad-"],
      [class*="Ad-"],
      [class*="promo"],
      [class*="推广"],
      [class*="qrcode"],
      [id*="ad-"],
      [id*="Ad-"],
      iframe,
      .qd-icon,
      .icon-*,
      .side-button,
      .old-version-button,
      .feedback {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* 特别隐藏图片中显示的右侧工具栏 */
      #right-container,
      #r-menu,
      .tooltip-wrapper[class*="relative flex"] {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        left: -9999px !important;
      }

      /* 核心内容区域样式 */
      #reader-content {
        max-width: 800px !important;
        margin: 40px auto !important;
        padding: 60px 80px !important;
        background: #ffffff !important;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.1) !important;
        min-height: calc(100vh - 80px) !important;
        width: 100% !important;
        position: relative !important;
        z-index: 1 !important;
      }

      /* 标题样式 */
      .title {
        font-size: 28px !important;
        font-weight: bold !important;
        text-align: center !important;
        margin: 40px 0 20px 0 !important;
        color: #000000 !important;
        border-bottom: 2px solid #2E74B5 !important;
        padding-bottom: 10px !important;
      }

      /* 章节信息样式 */
      .text-s-gray-500.mt-4px {
        font-size: 14px !important;
        color: #666666 !important;
        text-align: center !important;
        margin: 10px 0 40px 0 !important;
        border-bottom: 1px solid #e0e0e0 !important;
        padding-bottom: 20px !important;
      }

      /* 正文内容样式 */
      #c-876633645,
      .content {
        font-size: 16px !important;
        line-height: 1.8 !important;
        color: #000000 !important;
        text-align: justify !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      /* 段落样式 */
      .content p {
        margin: 0 0 1.5em 0 !important;
        text-indent: 2em !important;
        page-break-inside: avoid !important;
      }

      /* 引用样式 */
      .content p:first-child,
      .content p:nth-child(2) {
        text-align: center !important;
        font-style: italic !important;
        color: #666666 !important;
        text-indent: 0 !important;
        margin: 30px 0 !important;
        border-left: 4px solid #2E74B5 !important;
        padding-left: 20px !important;
      }

      /* 隐藏评论计数 */
      .review,
      .review-icon,
      .review-count {
        display: none !important;
      }

      /* 页眉页脚模拟 */
      #reader-content::before {
        content: "完美人生，从改变时间线开始 - 第1章 老千";
        position: fixed;
        top: 20px;
        left: 0;
        right: 0;
        text-align: center;
        font-size: 12px;
        color: #666666;
        z-index: 1000;
      }

      #reader-content::after {
        content: "页码 1";
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-size: 12px;
        color: #666666;
        z-index: 1000;
      }

      /* 滚动条样式 */
      ::-webkit-scrollbar {
        width: 8px;
      }

      ::-webkit-scrollbar-track {
        background: #f1f1f1;
      }

      ::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }

      ::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }

      /* 打印优化 */
      @media print {
        #reader-content {
          box-shadow: none !important;
          margin: 0 !important;
          padding: 20mm !important;
        }

        #reader-content::before,
        #reader-content::after {
          display: none !important;
        }
      }
    `;

    // 应用样式
    document.head.appendChild(style);

    // 清理DOM中的干扰元素
    function cleanupDOM() {
      // 移除右侧工具栏
      const rightContainer = document.getElementById('right-container');
      if (rightContainer) rightContainer.remove();
      
      const rMenu = document.getElementById('r-menu');
      if (rMenu) rMenu.remove();
      
      // 移除左侧工具栏
      const leftContainer = document.getElementById('left-container');
      if (leftContainer) leftContainer.remove();
      
      // 移除导航栏
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.remove();
      
      // 移除面包屑
      const breadcrumbs = document.getElementById('r-breadcrumbs');
      if (breadcrumbs) breadcrumbs.remove();
      
      // 移除标题页
      const titlePage = document.getElementById('r-titlePage');
      if (titlePage) titlePage.remove();
      
      // 移除作者说
      const authorSay = document.getElementById('r-authorSay');
      if (authorSay) authorSay.remove();
      
      // 移除推荐
      const recommends = document.getElementById('r-recommends');
      if (recommends) recommends.remove();
      
      // 移除iframe
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => iframe.remove());

      // 移除验证码相关元素
      const captchaElements = document.querySelectorAll('[id*="captcha"], [class*="captcha"]');
      captchaElements.forEach(el => el.remove());

      // 移除所有非小说图片
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!img.alt || !img.alt.includes('完美人生')) {
          img.remove();
        }
      });

      // 移除脚本注入的元素
      const injectedElements = document.querySelectorAll('script[src*="captcha"], script[src*="ad"]');
      injectedElements.forEach(el => el.remove());

      // 移除所有工具栏按钮
      const toolButtons = document.querySelectorAll('.side-button, .old-version-button, .feedback, .tooltip-wrapper');
      toolButtons.forEach(button => button.remove());

      console.log('DOM清理完成');
    }

    // 执行清理
    setTimeout(cleanupDOM, 500);

    // 添加页面标题
    document.title = '完美人生，从改变时间线开始 - 第1章 老千 - Word阅读模式';

    console.log('Word样式应用完成');
  }

  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyWordStyle);
  } else {
    applyWordStyle();
  }

  // 监听DOM变化，防止动态加载的内容破坏样式
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // 检查是否有新的工具栏元素被添加
        const newRightContainer = document.getElementById('right-container');
        const newRMenu = document.getElementById('r-menu');
        
        if (newRightContainer || newRMenu) {
          // 重新应用样式以防动态内容
          const style = document.getElementById('word-style-override');
          if (!style) {
            applyWordStyle();
          } else {
            // 立即隐藏新添加的工具栏
            if (newRightContainer) newRightContainer.style.display = 'none';
            if (newRMenu) newRMenu.style.display = 'none';
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();