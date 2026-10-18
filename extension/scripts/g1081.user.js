(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 百度搜索页面优化脚本 v3
     * 功能：去掉右侧相关搜索和热搜，只保留搜索结果并居中显示
     * 适用页面：百度搜索结果页 (www.baidu.com/s?...)
     */
    
    function baiduCleanSearch(args) {
      'use strict';
    
      if (!/baidu\.com\/s\?/.test(location.href)) {
        return { ok: false, message: '非百度搜索结果页' };
      }
    
      // ========== 强力样式注入 ==========
      var styleId = 'baidu-clean-search-v3';
      if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.textContent = [
          /* 隐藏所有可能的右侧栏 */
          '#content_right { display: none !important; }',
          '#con-right { display: none !important; }',
          
          /* 隐藏包含特定关键词的容器 */
          '[id*="content_right"] { display: none !important; }',
          
          /* 主内容区居中 */
          '#content_left {',
          '  float: none !important;',
          '  margin-left: auto !important;',
          '  margin-right: auto !important;',
          '  width: 100% !important;',
          '  max-width: 800px !important;',
          '}',
          
          /* wrapper 居中 */
          '#wrapper_wrapper, #wrapper {',
          '  max-width: 900px !important;',
          '  margin: 0 auto !important;',
          '}',
        ].join('\n');
        document.head.appendChild(style);
      }
    
      // ========== 核心清理函数 ==========
      function cleanPage() {
        var count = 0;
    
        // 方法1: 通过ID/类名隐藏已知右侧栏
        var knownRightSelectors = [
          '#content_right', '#con-right', '.sidebar-right',
          '.search-list-right', '#sidebar_right'
        ];
        
        for (var i = 0; i < knownRightSelectors.length; i++) {
          try {
            var els = document.querySelectorAll(knownRightSelectors[i]);
            for (var j = 0; j < els.length; j++) {
              hideElement(els[j]); count++;
            }
          } catch(e) {}
        }
    
        // 方法2: 遍历所有表格，找到包含"热搜"/"相关搜索"的列并隐藏
        var tables = document.querySelectorAll('table');
        for (var t = 0; t < tables.length; t++) {
          var table = tables[t];
          var rows = table.querySelectorAll('tr');
          
          // 检查是否是多列表格（左右布局）
          var hasMultipleCols = false;
          for (var r = 0; r < rows.length; r++) {
            if (rows[r].querySelectorAll('td').length >= 2) {
              hasMultipleCols = true;
              break;
            }
          }
          
          if (!hasMultipleCols) continue;
          
          // 对每行的每个单元格检查内容
          for (var r2 = 0; r2 < rows.length; r2++) {
            var cells = rows[r2].querySelectorAll('td');
            
            for (var c = 0; c < cells.length; c++) {
              var cell = cells[c];
              var text = (cell.innerText || cell.textContent || '').trim();
              
              // 如果单元格包含右侧栏特征关键词 → 隐藏该单元格
              if (text.length > 20 && (
                text.indexOf('热搜') !== -1 ||
                text.indexOf('相关搜索') !== -1 ||
                text.indexOf('换一换') !== -1 ||
                text.indexOf('登录百度帐号') !== -1 ||
                text.indexOf('想在此推广') !== -1
              )) {
                hideElement(cell);
                count++;
              }
            }
          }
        }
    
        // 方法3: 直接搜索所有可见元素中包含"热搜榜"的节点
        var allElements = document.body.getElementsByTagName('*');
        for (var k = 0; k < allElements.length; k++) {
          var el = allElements[k];
          var tag = el.tagName.toLowerCase();
          
          // 只处理块级容器元素
          if (tag === 'div' || tag === 'aside' || tag === 'section' || 
              tag === 'td' || tag === 'table' || tag === 'ul') {
            var elText = (el.innerText || el.textContent || '').trim();
            
            // 如果元素同时包含"热搜"且不是整个body
            if (elText.length > 10 && elText.length < 5000 &&
                el !== document.body &&
                (elText.indexOf('热搜榜') !== -1 || 
                 (elText.indexOf('热搜') !== -1 && elText.indexOf('换一换') !== -1))) {
              
              // 向上找到最合适的容器级别隐藏
              var target = el;
              // 如果是td内的div，优先隐藏td
              if (tag === 'div' && el.parentElement && 
                  el.parentElement.tagName.toLowerCase() === 'td') {
                target = el.parentElement;
              }
              hideElement(target);
              count++;
            }
          }
        }
    
        // 方法4: 确保主内容区居中
        var contentLeft = document.querySelector('#content_left');
        if (contentLeft) {
          contentLeft.style.cssText += ';float:none!important;margin:0 auto!important;width:100%!important;max-width:800px!important;';
        }
    
        return count;
      }
    
      function hideElement(el) {
        if (!el) return;
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('width', '0', 'important');
        el.style.setProperty('overflow', 'hidden', 'important');
        el.style.setProperty('height', '0', 'important');
      }
    
      // 执行清理
      var cleaned = cleanPage();
    
      // 监听动态变化
      var observer = new MutationObserver(function() {
        setTimeout(cleanPage, 100);
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
    
      window.addEventListener('load', function() {
        setTimeout(cleanPage, 500);
      });
    
      return {
        ok: true,
        message: '百度优化完成：已隐藏右侧栏，搜索结果居中',
        cleanedCount: cleaned
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();