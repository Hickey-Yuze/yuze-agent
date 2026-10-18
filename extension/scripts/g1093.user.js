(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * CSDN 阅读全文脚本
     * 功能：移除 CSDN 文章页面的"关注博主即可阅读全文"遮罩，显示完整文章内容
     * 适用：blog.csdn.net 文章页面（未登录状态下的内容限制）
     */
    
    async function run(args) {
      const results = {
        ok: false,
        summary: '',
        removed_elements: [],
        style_changes: [],
        warnings: []
      };
    
      try {
        // 1. 移除"关注博主即可阅读全文"链接及其父容器
        const fullTextLinks = document.querySelectorAll('a[href*="article_details"], a');
        let removedCount = 0;
    
        for (const link of Array.from(document.querySelectorAll('a'))) {
          if (link.textContent.includes('关注博主即可阅读全文') || 
              link.textContent.includes('阅读全文')) {
            // 向上查找并移除整个遮罩容器
            let parent = link.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
              const tag = parent.tagName.toLowerCase();
              if (tag === 'div' || tag === 'section' || tag === 'article') {
                // 检查是否是遮罩层（通常有特定样式或类名）
                const style = window.getComputedStyle(parent);
                const className = parent.className || '';
                
                if (className.includes('hide') || 
                    className.includes('mask') ||
                    className.includes('overlay') ||
                    className.includes('unlogin') ||
                    className.includes('article') ||
                    style.position === 'absolute' ||
                    style.position === 'fixed' ||
                    style.zIndex > 100) {
                  parent.remove();
                  removedCount++;
                  results.removed_elements.push({
                    type: 'overlay_container',
                    class: className,
                    tag: tag
                  });
                  break;
                }
              }
              parent = parent.parentElement;
            }
            
            // 如果没找到合适的父容器，直接移除链接本身
            if (link.parentNode) {
              link.remove();
              removedCount++;
              results.removed_elements.push({ type: 'link', text: '阅读全文链接' });
            }
          }
        }
    
        // 2. 移除文章内容区域的高度限制和溢出隐藏
        const articleContentSelectors = [
          '#article_content',
          '.article-content',
          '.blog-content-box',
          'article',
          '[class*="article"]',
          '[id*="content"]'
        ];
    
        articleContentSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const computedStyle = window.getComputedStyle(el);
            
            // 检查是否有高度限制
            if (computedStyle.maxHeight !== 'none' || 
                computedStyle.height !== 'auto' ||
                computedStyle.overflow === 'hidden') {
              
              el.style.maxHeight = 'none';
              el.style.height = 'auto';
              el.style.overflow = 'visible';
              
              results.style_changes.push({
                selector: selector,
                changes: ['maxHeight:none', 'height:auto', 'overflow:visible']
              });
            }
          });
        });
    
        // 3. 移除模糊效果（如果存在）
        const allElements = document.querySelectorAll('*');
        allElements.forEach(el => {
          const style = window.getComputedStyle(el);
          if (style.filter && style.filter.includes('blur')) {
            el.style.filter = 'none';
            results.style_changes.push({
              element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              changes: ['filter:none']
            });
          }
          
          // 检查 backdrop-filter
          if (style.backdropFilter && style.backdropFilter.includes('blur')) {
            el.style.backdropFilter = 'none';
            results.style_changes.push({
              element: el.tagName + (el.className ? '.' + el.className.split(' ')[0] : ''),
              changes: ['backdropFilter:none']
            });
          }
        });
    
        // 4. 移除可能存在的半透明遮罩层
        const overlaySelectors = [
          '[class*="mask"]',
          '[class*="overlay"]',
          '[class*="shadow"]',
          '[class*="unlogin"]',
          '[class*="hide-article"]'
        ];
    
        overlaySelectors.forEach(selector => {
          const overlays = document.querySelectorAll(selector);
          overlays.forEach(overlay => {
            const style = window.getComputedStyle(overlay);
            if ((style.position === 'absolute' || style.position === 'fixed') &&
                (style.zIndex > 100 || style.zIndex === 'auto')) {
              overlay.remove();
              results.removed_elements.push({
                type: 'overlay',
                class: overlay.className,
                tag: overlay.tagName
              });
            }
          });
        });
    
        // 5. 确保文章主体可见
        const mainContent = document.querySelector('#content_views') || 
                           document.querySelector('.htmledit_views') ||
                           document.querySelector('[class*="content"]');
        
        if (mainContent) {
          mainContent.style.display = 'block';
          mainContent.style.visibility = 'visible';
          mainContent.style.opacity = '1';
          mainContent.style.maxHeight = 'none';
          mainContent.style.height = 'auto';
          mainContent.style.overflow = 'visible';
          
          results.style_changes.push({
            element: 'main-content',
            changes: ['display:block', 'visibility:visible', 'opacity:1', 'maxHeight:none', 'height:auto', 'overflow:visible']
          });
        }
    
        // 统计结果
        results.ok = true;
        results.summary = `成功移除 ${removedCount} 个遮挡元素，修改了 ${results.style_changes.length} 处样式`;
        
        if (results.removed_elements.length === 0 && results.style_changes.length === 0) {
          results.warnings.push('未检测到明显的阅读限制，文章可能已经完整显示');
        }
    
      } catch (error) {
        results.ok = false;
        results.summary = `执行出错: ${error.message}`;
        results.errors = [error.stack];
      }
    
      return results;
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();