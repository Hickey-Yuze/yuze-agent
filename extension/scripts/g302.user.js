(function() {
  if (window.__csdnCleanLoaded) return;
  window.__csdnCleanLoaded = true;

  const SELECTORS_TO_REMOVE = [
    // 登录弹窗 & 遮罩
    '.passport-login-container',
    '.passport-login-mask',
    '#passportbox',
    '.login-mark',
    '.weixin-shadowbox',
    '.feed-Sign-span',
    '.no-login-box',

    // VIP 会员提示
    '.vip-expert-box',
    '.vip-card',
    '.vip-join',
    '.vip_article',
    '.hide-article-box',
    '.hide-article-bg',
    '.more-toolbox',
    '.person-messagebox',

    // 侧边栏
    '#asideNewNps',
    '#asideProfile',
    '#asideNewComments',
    '#asideRecentArticle',
    '#asideSearchArticle',
    '#asideHotArticle',
    '#asideFooter',
    '.aside-box',
    '#rightAside',
    '.blog_container_aside',
    '#csdn-right-sidebar',

    // 广告位
    '.adsense',
    '[class*="advert"]',
    '[id*="advert"]',
    '.fourth_column',
    '#footer-right-menu',
    '.csdn-common-identify',
    '.recommend-ad-box',
    '.recommend-box',
    '.recommend-right',
    '[class*="recommend-item"]',
    '.feed-fix-box',
    '.tool-box',
    '.cafe',
    '.csdn-hierarchical-nav',

    // 底部固定栏 / 工具栏
    '.bottom-pub-footer',
    '#csdn-toolbar',
    '.csdn-hierarchical-nav',
    '.option-box',
    '#toolBarBox',
    '.left-toolbox',

    // 文章下方推荐
    '.recommend-box',
    '#recommend',
    '.comment-box',
    '#comment',
    '#pcCommentSide',
    '.comment-list-box',

    // 右侧浮动按钮
    '.csdn-side-toolbar',
    '.side-question-box',
    '#csdn-drag-verify',
    '.drag-verify-wrap',

    // 其他干扰
    '.phone-login-box',
    '.signin-guide',
    '.article-bar-bottom',
    '.more-toolbox-more',
    '#toolBarBox',
    '.hide-article-hide',
    '.article-info-box .follow-nickName',
    '.more-toolbox-new',
    '.unlogin-comment-tips'
  ];

  function cleanAds() {
    SELECTORS_TO_REMOVE.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(el => {
          el.remove();
        });
      } catch (e) {}
    });
  }

  function expandArticle() {
    const hideBox = document.querySelector('.hide-article-box');
    if (hideBox) {
      hideBox.remove();
    }
    const articleContent = document.querySelector('#article_content') ||
                          document.querySelector('.article_content');
    if (articleContent) {
      articleContent.style.height = 'auto';
      articleContent.style.overflow = 'visible';
      articleContent.style.maxHeight = 'none';
    }
    const hideContent = document.querySelector('.hide-article-hide');
    if (hideContent) {
      hideContent.classList.remove('hide-article-hide');
      hideContent.style.height = 'auto';
      hideContent.style.overflow = 'visible';
    }
  }

  function widenLayout() {
    const style = document.createElement('style');
    style.textContent = `
      /* 主内容区撑满 */
      #mainBox {
        width: 100% !important;
      }
      main {
        width: 100% !important;
      }
      #article_content,
      .article_content {
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
        max-height: none !important;
      }
      /* 文章宽度居中，留合理边距 */
      #content_views,
      .markdown_views {
        max-width: 820px !important;
        margin: 0 auto !important;
        padding: 20px 40px !important;
      }
      /* 隐藏已知的广告和干扰 */
      .hide-article-box,
      .passport-login-container,
      .passport-login-mask,
      .vip-expert-box,
      .csdn-side-toolbar,
      .bottom-pub-footer,
      .recommend-box,
      .adsense,
      .recommend-ad-box,
      .tool-box,
      .left-toolbox,
      .more-toolbox,
      .option-box,
      .comment-box,
      .signin-guide,
      .unlogin-comment-tips {
        display: none !important;
      }
      /* 去除底部登录引导 */
      .phone-login-box,
      .feed-Sign-span {
        display: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function removeOverlays() {
    document.querySelectorAll('div').forEach(el => {
      const style = getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'absolute') {
        if (el.className && (
          el.className.includes('login') ||
          el.className.includes('passport') ||
          el.className.includes('vip') ||
          el.className.includes('mask') ||
          el.className.includes('modal') ||
          el.className.includes('popup') ||
          el.className.includes('overlay')
        )) {
          el.remove();
        }
      }
    });
    document.body.style.overflow = 'auto';
  }

  function observeDOM() {
    const observer = new MutationObserver(() => {
      cleanAds();
      expandArticle();
      removeOverlays();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function interceptPopups() {
    const origSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      if (typeof fn === 'string' && (
        fn.includes('passport') ||
        fn.includes('login') ||
        fn.includes('vip') ||
        fn.includes('advert')
      )) {
        return;
      }
      return origSetTimeout.call(window, fn, delay, ...args);
    };
  }

  function execute() {
    cleanAds();
    expandArticle();
    widenLayout();
    removeOverlays();
    interceptPopups();
    observeDOM();
    console.log('[CSDNClean] CSDN 广告已清除，沉浸阅读模式已开启 📖');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', execute);
  } else {
    execute();
  }
})();