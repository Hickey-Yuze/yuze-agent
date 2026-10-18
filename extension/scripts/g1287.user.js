// ==UserScript==
// @name         新标签页打开链接
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  点击链接时默认在新标签页中打开
// @author       You
// @match        *://*/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
  'use strict';

  function setLinksNewTab() {
    const links = document.querySelectorAll('a[target="_self"], a:not([target])');
    links.forEach(link => {
      // 排除 JavaScript 链接和锚点链接
      if (link.href && !link.href.startsWith('javascript:') && !link.href.startsWith('#')) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    });
  }

  // 初始执行
  setLinksNewTab();

  // 监听动态加载的内容
  const observer = new MutationObserver(mutations => {
    let shouldProcess = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        shouldProcess = true;
      }
    });
    if (shouldProcess) {
      setLinksNewTab();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();