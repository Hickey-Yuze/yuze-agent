(function() {
  const MARKER = 'data-wb-filtered';

  function hasFollowBtnInHeader(article) {
    const header = article.querySelector('header');
    if (!header) return false;

    // Strategy 1: partial class match — "followbtn" is the stable semantic part
    if (header.querySelector('button[class*="followbtn"]')) return true;

    // Strategy 2: text content + icon fallback
    const buttons = header.querySelectorAll('button');
    for (const btn of buttons) {
      const text = btn.textContent.trim();
      const hasAddIcon = btn.querySelector('[class*="add"]');
      if (text === '关注' && hasAddIcon) return true;
    }

    return false;
  }

  function hideFollowedPosts(root) {
    const scroller = root || document.querySelector('.vue-recycle-scroller');
    if (!scroller) return;

    const articles = scroller.querySelectorAll('article:not([data-wb-scanned])');
    articles.forEach(article => {
      article.setAttribute('data-wb-scanned', '1');
      if (hasFollowBtnInHeader(article)) {
        article.style.display = 'none';
        article.setAttribute(MARKER, '1');
      }
    });
  }

  function init() {
    hideFollowedPosts();

    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType !== 1) continue;

          // New article inserted directly
          if (node.localName === 'article') {
            if (hasFollowBtnInHeader(node)) {
              node.style.display = 'none';
              node.setAttribute(MARKER, '1');
            }
            node.setAttribute('data-wb-scanned', '1');
            return;
          }

          // New container with articles inside
          const scroller = node.querySelector?.('.vue-recycle-scroller');
          if (scroller || node.classList?.contains('vue-recycle-scroller')) {
            hideFollowedPosts(scroller || node);
            return;
          }

          // Generic: check for new articles within added node
          const articles = node.querySelectorAll?.('article:not([data-wb-scanned])');
          if (articles?.length) {
            articles.forEach(article => {
              article.setAttribute('data-wb-scanned', '1');
              if (hasFollowBtnInHeader(article)) {
                article.style.display = 'none';
                article.setAttribute(MARKER, '1');
              }
            });
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.log('[Weibo Filter] Initialized — hash-resilient follow-button filter active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();