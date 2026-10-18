(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      'use strict';
    
      // ============================================================
      // 0. 去重：如果已初始化过，直接返回
      // ============================================================
      if (window.__BILI_FEED_ROLLBACK_INITIALIZED__) {
        return {
          ok: true,
          summary: 'Feed rollback 已初始化过，跳过重复注入。',
          warnings: ['duplicate execution blocked']
        };
      }
      window.__BILI_FEED_ROLLBACK_INITIALIZED__ = true;
    
      // 清理可能残留的旧按钮（防止之前多次执行留下的重复元素）
      const oldBack = document.getElementById('feed-roll-back-btn');
      const oldNext = document.getElementById('feed-roll-next-btn');
      if (oldBack) oldBack.remove();
      if (oldNext) oldNext.remove();
    
      // ============================================================
      // 1. CSS 样式注入（同样去重）
      // ============================================================
      if (!document.getElementById('bili-feed-rollback-style')) {
        const style = document.createElement('style');
        style.id = 'bili-feed-rollback-style';
        style.textContent = `
          /* 通用禁用样式 */
          .biliplus-disabled {
            opacity: 0.5;
            cursor: not-allowed;
            pointer-events: none;
          }
    
          /* 后退按钮 */
          .feed-roll-back-btn {
            flex-direction: column;
            margin-left: 0 !important;
            height: 40px !important;
            width: 40px;
            padding: 9px;
            margin-top: 6px;
          }
          .feed-roll-back-btn svg {
            margin-right: 0;
            margin-bottom: 0px;
          }
    
          /* 前进按钮 */
          .feed-roll-next-btn {
            flex-direction: column;
            margin-left: 0 !important;
            height: 40px !important;
            width: 40px;
            padding: 9px;
            margin-top: 6px;
          }
          .feed-roll-next-btn svg {
            margin-right: 0;
            margin-bottom: 0px;
          }
        `;
        document.head.appendChild(style);
      }
    
      // ============================================================
      // 2. 工具函数
      // ============================================================
    
      /** 包装 MutationObserver，返回 disconnect 函数 */
      function observe(node, callback, options) {
        const observer = new MutationObserver((mutations, ob) => {
          callback(mutations, ob);
        });
        observer.observe(
          node,
          Object.assign({ childList: true, subtree: true }, options)
        );
        return () => observer.disconnect();
      }
    
      /** 切换按钮禁用状态 */
      function disableElementById(id, bool) {
        const el = document.getElementById(id);
        if (!el) return;
        if (bool) {
          el.classList.add('biliplus-disabled');
        } else {
          el.classList.remove('biliplus-disabled');
        }
      }
    
      /** 提取所有 feed-card 的 innerHTML 为数组 */
      function listInnerHTMLOfFeedCard(feedCardElements) {
        const feedCardInnerHTMLs = [];
        for (let fc of feedCardElements) {
          feedCardInnerHTMLs.push(fc.innerHTML);
        }
        return feedCardInnerHTMLs;
      }
    
      /** 清理所有重复注入的按钮（保留第一个） */
      function cleanupDuplicateButtons() {
        const container = document.querySelector('.recommended-container_floor-aside');
        if (!container) return;
        const backBtns = container.querySelectorAll('#feed-roll-back-btn');
        const nextBtns = container.querySelectorAll('#feed-roll-next-btn');
        for (let i = 1; i < backBtns.length; i++) backBtns[i].remove();
        for (let i = 1; i < nextBtns.length; i++) nextBtns[i].remove();
      }
    
      // ============================================================
      // 3. 核心：回溯功能
      // ============================================================
      const feedHistory = [];        // 二维数组，存储每页 feed 卡片的 innerHTML
      let feedHistoryIndex = 0;     // 当前历史位置指针
    
      /** 后退按钮 HTML */
      const feedRollBackBtn = `
        <button id="feed-roll-back-btn" class="primary-btn feed-roll-back-btn biliplus-disabled">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.82843 6.99955L8.36396 9.53509L6.94975 10.9493L2 5.99955L6.94975 1.0498L8.36396 2.46402L5.82843 4.99955H13C17.4183 4.99955 21 8.58127 21 12.9996C21 17.4178 17.4183 20.9996 13 20.9996H4V18.9996H13C16.3137 18.9996 19 16.3133 19 12.9996C19 9.68584 16.3137 6.99955 13 6.99955H5.82843Z"/>
          </svg>
        </button>
      `;
    
      /** 前进按钮 HTML */
      const feedRollNextBtn = `
        <button id="feed-roll-next-btn" class="primary-btn feed-roll-next-btn biliplus-disabled">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.1716 6.99955H11C7.68629 6.99955 5 9.68584 5 12.9996C5 16.3133 7.68629 18.9996 11 18.9996H20V20.9996H11C6.58172 20.9996 3 17.4178 3 12.9996C3 8.58127 6.58172 4.99955 11 4.99955H18.1716L15.636 2.46402L17.0503 1.0498L22 5.99955L17.0503 10.9493L15.636 9.53509L18.1716 6.99955Z"/>
          </svg>
        </button>
      `;
    
      /**
       * 初始化回溯按钮
       * 等待 .recommended-container_floor-aside 容器和 .roll-btn 出现后注入按钮
       */
      function init() {
        // 二次去重检查
        if (document.getElementById('feed-roll-back-btn')) {
          cleanupDuplicateButtons();
          return;
        }
    
        const targetNode = document.querySelector('.recommended-container_floor-aside');
        if (!targetNode) {
          setTimeout(init, 500);
          return;
        }
    
        let injected = false; // 防止 observer 回调多次触发
    
        const disconnect = observe(targetNode, () => {
          if (injected) return; // 已注入过，跳过
    
          const feedRollBtn = targetNode.querySelector('.roll-btn');
          if (!feedRollBtn) return;
    
          // 如果已经存在我们的按钮，不再注入
          if (document.getElementById('feed-roll-back-btn')) {
            disconnect();
            return;
          }
    
          injected = true;
    
          // --- 注入后退按钮 ---
          const backBtn = document.createElement('button');
          feedRollBtn.parentNode.appendChild(backBtn);
          backBtn.outerHTML = feedRollBackBtn;
    
          document.getElementById('feed-roll-back-btn').addEventListener('click', () => {
            const feedCards = document.getElementsByClassName('feed-card');
            if (feedHistoryIndex === feedHistory.length) {
              feedHistory.push(listInnerHTMLOfFeedCard(feedCards));
            }
            for (let i = 0; i < feedCards.length; i++) {
              feedCards[i].innerHTML = feedHistory[feedHistoryIndex - 1][i];
            }
            feedHistoryIndex -= 1;
            if (feedHistoryIndex === 0) {
              disableElementById('feed-roll-back-btn', true);
            }
            disableElementById('feed-roll-next-btn', false);
          });
    
          // --- 注入前进按钮 ---
          const nextBtn = document.createElement('div');
          feedRollBtn.parentNode.appendChild(nextBtn);
          nextBtn.outerHTML = feedRollNextBtn;
    
          document.getElementById('feed-roll-next-btn').addEventListener('click', () => {
            const feedCards = document.getElementsByClassName('feed-card');
            for (let i = 0; i < feedCards.length; i++) {
              feedCards[i].innerHTML = feedHistory[feedHistoryIndex + 1][i];
            }
            feedHistoryIndex += 1;
            if (feedHistoryIndex === feedHistory.length - 1) {
              disableElementById('feed-roll-next-btn', true);
            }
            disableElementById('feed-roll-back-btn', false);
          });
    
          // --- 监听原生"换一换"按钮（去重绑定）---
          if (!feedRollBtn.id) {
            feedRollBtn.id = 'feed-roll-btn';
            feedRollBtn.addEventListener('click', () => {
              setTimeout(() => {
                if (feedHistoryIndex === feedHistory.length) {
                  const feedCards = listInnerHTMLOfFeedCard(
                    document.getElementsByClassName('feed-card')
                  );
                  feedHistory.push(feedCards);
                }
                feedHistoryIndex = feedHistory.length;
                disableElementById('feed-roll-back-btn', false);
                disableElementById('feed-roll-next-btn', true);
              });
            });
          }
    
          // 按钮已注入，断开观察器
          disconnect();
        });
      }
    
      // ============================================================
      // 4. 启动
      // ============================================================
      init();
    
      return {
        ok: true,
        summary: 'Bilibili feed rollback script initialized (with dedup guards). Back/Next buttons will be injected once next to the native "换一换" roll button.',
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();