(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 公众号内容转换器 - 将网页内容转换为可直接粘贴到公众号编辑器的格式
     * 适用范围：所有网页（*）
     * 自动运行：true
     */
    async function run(args) {
      // ========== 配置 ==========
      const CONFIG = {
        maxImageWidth: 900,        // 公众号推荐图片最大宽度
        fontSize: '16px',          // 正文字号
        lineHeight: '1.75',        // 行高
        titleSize: '22px',         // 标题字号
        heading2Size: '20px',      // 二级标题字号
        heading3Size: '18px',      // 三级标题字号
        color: '#333333',          // 正文颜色
        titleColor: '#000000',     // 标题颜色
        bgColor: '#ffffff',        // 背景色
        padding: '20px',           // 内容区内边距
      };
    
      // ========== 工具函数 ==========
      
      /**
       * 判断元素是否可见
       */
      function isVisible(el) {
        if (!el) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) return false;
        return true;
      }
    
      /**
       * 判断是否为广告或无关元素
       */
      function isAdOrNoise(el) {
        if (!el) return true;
        const tag = el.tagName.toLowerCase();
        const cls = (el.className || '').toString().toLowerCase();
        const id = (el.id || '').toString().toLowerCase();
        
        // 广告关键词
        const adKeywords = ['ad', 'ads', 'advert', 'banner', 'sponsor', 'promotion', 'popup',
          'modal', 'dialog', 'overlay', 'sidebar', 'widget', 'share', 'comment', 'related',
          'recommend', 'footer', 'header', 'nav', 'menu', 'toolbar', 'breadcrumb',
          'cookie', 'subscribe', 'newsletter', 'social', 'follow', 'like', 'donate'];
        
        for (const kw of adKeywords) {
          if (cls.includes(kw) || id.includes(kw)) return true;
        }
        
        // 特定标签排除
        if (['script', 'style', 'noscript', 'svg', 'canvas', 'iframe', 'video', 'audio'].includes(tag)) return true;
        
        // 太小的元素可能是装饰性元素
        const rect = el.getBoundingClientRect();
        if (rect.width < 50 && rect.height < 30 && !['img', 'br', 'hr'].includes(tag)) return true;
        
        return false;
      }
    
      /**
       * 查找主要内容区域
       */
      function findMainContent() {
        // 策略1：查找常见的文章容器选择器
        const contentSelectors = [
          'article', '[role="article"]', '.article-content', '.post-content',
          '.entry-content', '.content-body', '.rich_media_content', '#js_content',
          '.markdown-body', '.post-body', '.article__body', '.text-content',
          '.news_content', '.detail-content', '.main-content', '#content',
          '.article-content-inner', '.post-text', '.entry-body'
        ];
        
        for (const sel of contentSelectors) {
          const el = document.querySelector(sel);
          if (el && isVisible(el) && el.textContent.trim().length > 100) {
            return el;
          }
        }
        
        // 策略2：找文本密度最高的区域
        const candidates = [];
        const containers = document.querySelectorAll('div, section, main, td');
        
        for (const container of containers) {
          if (!isVisible(container) || isAdOrNoise(container)) continue;
          const text = container.textContent || '';
          const plainText = text.replace(/\s+/g, '');
          if (plainText.length < 200) continue;
          
          const links = container.querySelectorAll('a').length;
          const paragraphs = container.querySelectorAll('p').length;
          const images = container.querySelectorAll('img').length;
          
          // 计算内容质量分数
          let score = plainText.length;
          score += paragraphs * 50;
          score += images * 30;
          score -= links * 10; // 链接太多可能是导航
          
          candidates.push({ el: container, score, textLen: plainText.length });
        }
        
        candidates.sort((a, b) => b.score - a.score);
        
        if (candidates.length > 0 && candidates[0].textLen > 200) {
          return candidates[0].el;
        }
        
        // 策略3：回退到 body
        return document.body;
      }
    
      /**
       * 清理并转换单个节点为公众号兼容HTML
       */
      function convertNode(node, depth = 0) {
        if (depth > 50) return ''; // 防止无限递归
        
        const tag = node.nodeType;
        
        // 文本节点
        if (tag === 3) {
          let text = node.textContent || '';
          // 合并空白字符，但保留换行结构
          text = text.replace(/[ \t]+/g, ' ');
          return text;
        }
        
        // 非元素节点跳过
        if (tag !== 1) return '';
        
        const el = node;
        const tagName = el.tagName.toLowerCase();
        
        // 跳过不可见和噪音元素
        if (!isVisible(el) || isAdOrNoise(el)) return '';
        
        // 根据标签类型处理
        switch (tagName) {
          case 'h1':
          case 'h2':
          case 'h3':
          case 'h4':
          case 'h5':
          case 'h6': {
            const inner = processChildren(el, depth);
            const sizeMap = { h1: CONFIG.titleSize, h2: CONFIG.heading2Size, h3: CONFIG.heading3Size };
            const size = sizeMap[tagName] || CONFIG.heading3Size;
            const level = parseInt(tagName[1]);
            const marginTop = level === 1 ? '30px' : '24px';
            const marginBottom = '16px';
            return `<section style="margin:${marginTop} 0 ${marginBottom};padding:0;font-size:${size};font-weight:bold;color:${CONFIG.titleColor};line-height:${CONFIG.lineHeight};">${inner}</section>`;
          }
          
          case 'p': {
            const inner = processChildren(el, depth);
            if (!inner.trim()) return '<br/>';
            return `<section style="margin:0 0 14px;padding:0;font-size:${CONFIG.fontSize};color:${CONFIG.color};line-height:${CONFIG.lineHeight};text-align:justify;">${inner}</section>`;
          }
          
          case 'br':
            return '<br/>';
          
          case 'hr':
            return '<section style="border:none;border-top:1px solid #eeeeee;margin:20px 0;"></section>';
          
          case 'img': {
            const src = el.getAttribute('src') || el.getAttribute('data-src') || '';
            const alt = el.getAttribute('alt') || '';
            const width = el.getAttribute('width');
            
            if (!src || src.startsWith('data:') && src.length > 100) return '';
            
            // 处理相对URL
            let fullSrc = src;
            if (src.startsWith('//')) fullSrc = 'https:' + src;
            else if (src.startsWith('/')) fullSrc = location.origin + src;
            
            const imgStyle = `max-width:100%;height:auto;display:block;margin:15px auto;${width ? '' : ''}`;
            return `<img src="${escapeAttr(fullSrc)}" alt="${escapeAttr(alt)}" style="${imgStyle}"/>`;
          }
          
          case 'figure':
          case 'picture': {
            const img = el.querySelector('img');
            const caption = el.querySelector('figcaption, .caption');
            let result = img ? convertNode(img, depth + 1) : '';
            if (caption) {
              result += `<section style="text-align:center;font-size:14px;color:#888;margin:5px 0 15px;">${processChildren(caption, depth + 1)}</section>`;
            }
            return result;
          }
          
          case 'strong':
          case 'b': {
            return `<strong>${processChildren(el, depth)}</strong>`;
          }
          
          case 'em':
          case 'i': {
            return `<em>${processChildren(el, depth)}</em>`;
          }
          
          case 'a': {
            const href = el.getAttribute('href') || '';
            const inner = processChildren(el, depth);
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return inner;
            let fullHref = href;
            if (href.startsWith('//')) fullHref = 'https:' + href;
            else if (href.startsWith('/')) fullHref = location.origin + href;
            return `<a href="${escapeAttr(fullHref)}" style="color:#576b95;text-decoration:none;">${inner}</a>`;
          }
          
          case 'ul':
          case 'ol': {
            const items = el.querySelectorAll(':scope > li');
            const listItems = Array.from(items).map(li => {
              const inner = processChildren(li, depth + 1);
              return `<section style="margin:6px 0;padding-left:12px;font-size:${CONFIG.fontSize};color:${CONFIG.color};line-height:${CONFIG.lineHeight};">• ${inner}</section>`;
            }).join('');
            return `<section style="margin:10px 0;padding:8px 15px;background:#fafafa;border-radius:4px;">${listItems}</section>`;
          }
          
          case 'li': {
            return processChildren(el, depth); // 由 ul/ol 统一处理
          }
          
          case 'blockquote': {
            const inner = processChildren(el, depth + 1);
            return `<section style="margin:15px 0;padding:12px 18px;border-left:4px solid #576b95;background:#f7f7f7;color:#666;font-style:normal;">${inner}</section>`;
          }
          
          case 'pre':
          case 'code': {
            const text = el.textContent || '';
            const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            return `<section style="margin:12px 0;padding:12px 15px;background:#f5f5f5;border-radius:4px;font-family:Consolas,Monaco,monospace;font-size:14px;color:#333;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${escaped}</section>`;
          }
          
          case 'table': {
            return convertTable(el, depth);
          }
          
          case 'div':
          case 'section':
          case 'article':
          case 'main':
          case 'header':
          case 'footer':
          case 'nav':
          case 'aside':
          case 'span': {
            // 容器类标签：检查是否有特殊样式需要保留
            const style = getComputedStyle(el);
            const hasImportantStyle = (
              style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
              style.backgroundColor !== 'rgb(255, 255, 255)' &&
              el.tagName.toLowerCase() !== 'body'
            ) || style.borderLeftWidth !== '0px';
            
            if (hasImportantStyle) {
              const bg = style.backgroundColor;
              const borderLeft = style.borderLeftWidth !== '0px' ? `border-left:${style.borderLeftWidth} ${style.borderLeftStyle} ${style.borderLeftColor};` : '';
              const padding = `${style.paddingTop} ${style.paddingRight} ${style.paddingBottom} ${style.paddingLeft}`;
              const margin = `${style.marginTop} ${style.marginRight} ${style.marginBottom} ${style.marginLeft}`;
              const inner = processChildren(el, depth + 1);
              return `<section style="background:${bg};${borderLeft}padding:${padding};margin:${margin};">${inner}</section>`;
            }
            
            // 普通容器：直接处理子节点
            return processChildren(el, depth + 1);
          }
          
          default:
            // 其他标签：尝试提取文本内容
            return processChildren(el, depth + 1);
        }
      }
    
      /**
       * 处理所有子节点
       */
      function processChildren(el, depth) {
        let html = '';
        for (const child of el.childNodes) {
          html += convertNode(child, depth + 1);
        }
        return html;
      }
    
      /**
       * 转换表格
       */
      function convertTable(tableEl, depth) {
        const rows = tableEl.querySelectorAll(':scope > tbody > tr, :scope > tr');
        if (rows.length === 0) return '';
        
        let tableHtml = '<table style="width:100%;border-collapse:collapse;margin:15px 0;font-size:14px;">';
        
        rows.forEach((row, idx) => {
          const cells = row.querySelectorAll(':scope > td, :scope > th');
          const isHeader = idx === 0;
          tableHtml += '<tr>';
          cells.forEach(cell => {
            const tag = isHeader && cell.tagName.toLowerCase() === 'th' ? 'th' : 'td';
            const inner = processChildren(cell, depth + 1);
            const border = '1px solid #ddd';
            const pad = '8px 10px';
            const bg = isHeader ? '#f5f5f5' : '#fff';
            const weight = isHeader ? 'bold' : 'normal';
            tableHtml += `<${tag} style="border:${border};padding:${pad};background:${bg};font-weight:${weight};">${inner}</${tag}>`;
          });
          tableHtml += '</tr>';
        });
        
        tableHtml += '</table>';
        return tableHtml;
      }
    
      /**
       * HTML属性转义
       */
      function escapeAttr(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    
      // ========== 主逻辑 ==========
      
      try {
        // 1. 提取页面信息
        const pageTitle = document.title || '未命名文章';
        
        // 尝试获取文章标题
        let articleTitle = pageTitle;
        const titleSelectors = ['h1.article_title', 'h1.post-title', 'h1.entry-title',
          '.rich_media_title', '#activity-name', 'h1', '.title', '[itemprop="headline"]'];
        for (const sel of titleSelectors) {
          const t = document.querySelector(sel);
          if (t && t.textContent.trim()) {
            articleTitle = t.textContent.trim();
            break;
          }
        }
        
        // 2. 找到主内容区域
        const contentEl = findMainContent();
        
        // 3. 转换内容
        const convertedContent = convertNode(contentEl);
        
        // 4. 构建完整的公众号格式HTML
        const fullHtml = `
    <section style="max-width:${CONFIG.maxImageWidth}px;margin:0 auto;background:${CONFIG.bgColor};padding:${CONFIG.padding};box-sizing:border-box;">
      <section style="text-align:center;margin-bottom:25px;">
        <h1 style="font-size:${CONFIG.titleSize};font-weight:bold;color:${CONFIG.titleColor};line-height:1.4;margin:0;">${escapeAttr(articleTitle)}</h1>
      </section>
      ${convertedContent}
    </section>`.trim();
    
        // 5. 创建悬浮UI面板
        createFloatingPanel(articleTitle, fullHtml, convertedContent);
    
        return {
          ok: true,
          summary: `成功将「${articleTitle}」转换为公众号编辑器兼容格式`,
          data: {
            title: articleTitle,
            originalUrl: location.href,
            contentLength: convertedContent.length,
            htmlLength: fullHtml.length
          },
          warnings: []
        };
    
      } catch (err) {
        return {
          ok: false,
          summary: '转换失败: ' + err.message,
          data: {},
          warnings: [err.stack]
        };
      }
    
      // ========== UI面板创建 ==========
      
      function createFloatingPanel(title, fullHtml, contentOnly) {
        // 移除已存在的面板
        const existing = document.getElementById('__wechat_converter_panel');
        if (existing) existing.remove();
    
        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = '__wechat_converter_overlay';
        Object.assign(overlay.style, {
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: '999998', display: 'flex',
          alignItems: 'center', justifyContent: 'center'
        });
    
        // 创建面板
        const panel = document.createElement('div');
        panel.id = '__wechat_converter_panel';
        Object.assign(panel.style, {
          position: 'relative',
          width: '90%',
          maxWidth: '700px',
          maxHeight: '85vh',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: '999999',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
        });
    
        // 头部
        const header = document.createElement('div');
        Object.assign(header.style, {
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #eee', flexShrink: '0'
        });
        header.innerHTML = `
          <span style="font-size:16px;font-weight:600;color:#333;">
            📝 公众号格式转换器
          </span>
          <button id="__wc_close_btn" style="
            border:none;background:none;font-size:22px;cursor:pointer;color:#999;
            padding:4px 8px;line-height:1;border-radius:4px;
          ">✕</button>
        `;
    
        // Tab栏
        const tabBar = document.createElement('div');
        Object.assign(tabBar.style, {
          display: 'flex', borderBottom: '1px solid #eee', flexShrink: '0', background: '#fafafa'
        });
        tabBar.innerHTML = `
          <button id="__wc_tab_preview" class="__wc_tab active" style="
            flex:1;padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:14px;color:#07c160;font-weight:500;border-bottom:2px solid #07c60;
          ">📖 预览效果</button>
          <button id="__wc_tab_html" class="__wc_tab" style="
            flex:1;padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:14px;color:#666;font-weight:500;border-bottom:2px solid transparent;
         ">&lt;/&gt; HTML源码</button>
          <button id="__wc_tab_clean" class="__wc_tab" style="
            flex:1;padding:10px 16px;border:none;background:none;cursor:pointer;
            font-size:14px;color:#666;font-weight:500;border-bottom:2px solid transparent;
          ">📋 纯内容</button>
        `;
    
        // 内容区
        const body = document.createElement('div');
        Object.assign(body.style, {
          flex: '1', overflow: 'auto', position: 'relative'
        });
    
        // 预览视图
        const previewView = document.createElement('div');
        previewView.id = '__wc_preview_view';
        Object.assign(previewView.style, {
          padding: '20px', minHeight: '200px', overflow: 'auto'
        });
        previewView.innerHTML = fullHtml;
    
        // HTML源码视图
        const htmlView = document.createElement('div');
        htmlView.id = '__wc_html_view';
        Object.assign(htmlView.style, {
          padding: '0', minHeight: '200px', display: 'none'
        });
        const textarea = document.createElement('textarea');
        Object.assign(textarea.style, {
          width: '100%', height: '100%', minHeight: '350px', border: 'none', outline: 'none',
          padding: '16px', fontFamily: 'Consolas, Monaco, monospace', fontSize: '13px',
          lineHeight: '1.6', resize: 'vertical', color: '#333', background: '#fff',
          boxSizing: 'border-box', whiteSpace: 'pre', wrap: 'off'
        });
        textarea.value = fullHtml;
        textarea.readOnly = true;
        htmlView.appendChild(textarea);
    
        // 纯内容视图（仅正文部分）
        const cleanView = document.createElement('div');
        cleanView.id = '__wc_clean_view';
        Object.assign(cleanView.style, {
          padding: '20px', minHeight: '200px', display: 'none', overflow: 'auto'
        });
        cleanView.innerHTML = contentOnly;
    
        body.appendChild(previewView);
        body.appendChild(htmlView);
        body.appendChild(cleanView);
    
        // 底部操作栏
        const footer = document.createElement('div');
        Object.assign(footer.style, {
          display: 'flex', gap: '10px', padding: '14px 20px',
          borderTop: '1px solid #eee', flexShrink: '0', justifyContent: 'flex-end'
        });
        footer.innerHTML = `
          <button id="__wc_copy_html" style="
            padding:8px 18px;border:1px solid #ddd;border-radius:6px;background:#fff;
            cursor:pointer;font-size:13px;color:#333;
          ">📋 复制HTML</button>
          <button id="__wc_copy_clean" style="
            padding:8px 18px;border:1px solid #ddd;border-radius:6px;background:#fff;
            cursor:pointer;font-size:13px;color:#333;
          ">📄 复制纯内容</button>
          <button id="__wc_copy_all" style="
            padding:8px 22px;border:none;border-radius:6px;background:#07c160;
            cursor:pointer;font-size:13px;color:#fff;font-weight:500;
          ">✨ 一键复制（含样式）</button>
        `;
    
        // 组装面板
        panel.appendChild(header);
        panel.appendChild(tabBar);
        panel.appendChild(body);
        panel.appendChild(footer);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
    
        // ========== 事件绑定 ==========
        
        // 关闭
        document.getElementById('__wc_close_btn').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    
        // Tab切换
        const tabs = ['preview', 'html', 'clean'];
        tabs.forEach(t => {
          document.getElementById(`__wc_tab_${t}`).onclick = () => {
            tabs.forEach(tt => {
              document.getElementById(`__wc_tab_${tt}`).style.color = tt === t ? '#07c160' : '#666';
              document.getElementById(`__wc_tab_${tt}`).style.borderBottomColor = tt === t ? '#07c160' : 'transparent';
              document.getElementById(`__wc_${tt}_view`).style.display = tt === t ? 'block' : 'none';
            });
          };
        });
    
        // 复制功能
        async function copyToClipboard(text, btnId) {
          try {
            await navigator.clipboard.writeText(text);
            const btn = document.getElementById(btnId);
            const origText = btn.textContent;
            btn.textContent = '✅ 已复制！';
            btn.style.background = '#52c41a';
            btn.style.color = '#fff';
            btn.style.borderColor = '#52c41a';
            setTimeout(() => {
              btn.textContent = origText;
              btn.style.background = btnId === '__wc_copy_all' ? '#07c160' : '#fff';
              btn.style.color = btnId === '__wc_copy_all' ? '#fff' : '#333';
              btn.style.borderColor = btnId === '__wc_copy_all' ? '#07c160' : '#ddd';
            }, 2000);
          } catch (err) {
            alert('复制失败，请手动复制：\n' + err.message);
          }
        }
    
        document.getElementById('__wc_copy_html').onclick = () => copyToClipboard(fullHtml, '__wc_copy_html');
        document.getElementById('__wc_copy_clean').onclick = () => copyToClipboard(contentOnly, '__wc_copy_clean');
        document.getElementById('__wc_copy_all').onclick = () => copyToClipboard(fullHtml, '__wc_copy_all');
    
        // ESC关闭
        const escHandler = (e) => {
          if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', escHandler);
          }
        };
        document.addEventListener('keydown', escHandler);
      }
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();