(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    () => {
      // ── ChatGPT 聊天记录导出为 Markdown ──────────────────────────────────────
      // 支持 chatgpt.com 新旧两种 DOM 结构
      // 格式: # 问题一 / # 回答一 / # 问题二 / # 回答二 ...
    
      const CHINESE_NUMS = [
        '一','二','三','四','五','六','七','八','九','十',
        '十一','十二','十三','十四','十五','十六','十七','十八','十九','二十',
        '二十一','二十二','二十三','二十四','二十五','二十六','二十七','二十八','二十九','三十',
      ];
      function chNum(n) {
        return CHINESE_NUMS[n - 1] || String(n);
      }
    
      // ── 1. 收集所有带 role 的消息节点 ───────────────────────────────────────
      let msgNodes = Array.from(document.querySelectorAll('[data-message-author-role]'));
    
      // 若找不到，尝试备用结构 (旧版 article 标签)
      if (msgNodes.length === 0) {
        msgNodes = Array.from(document.querySelectorAll('article'));
      }
    
      if (msgNodes.length === 0) {
        return { ok: false, error: '未找到聊天消息节点，请确认已在 ChatGPT 对话页面运行此脚本。' };
      }
    
      // ── 2. 解析每条消息 ──────────────────────────────────────────────────────
      function extractText(node) {
        // 优先取 markdown 渲染后的内容，但做结构化还原
        let text = '';
    
        // 代码块：保留 ``` 包裹
        const cloned = node.cloneNode(true);
    
        // 处理 <code> 单行代码（inline）
        cloned.querySelectorAll('code:not(pre code)').forEach(c => {
          c.replaceWith('`' + c.textContent + '`');
        });
    
        // 处理 <pre><code> 代码块
        cloned.querySelectorAll('pre').forEach(pre => {
          const langEl = pre.querySelector('[class*="language-"], .lang, code');
          const lang = (() => {
            if (!langEl) return '';
            const cls = langEl.className || '';
            const m = cls.match(/language-(\w+)/);
            return m ? m[1] : '';
          })();
          const codeText = pre.textContent || '';
          pre.replaceWith('\n```' + lang + '\n' + codeText.trimEnd() + '\n```\n');
        });
    
        // 处理标题 h1-h6
        for (let i = 6; i >= 1; i--) {
          cloned.querySelectorAll('h' + i).forEach(h => {
            h.replaceWith('\n' + '#'.repeat(i) + ' ' + h.textContent + '\n');
          });
        }
    
        // 处理有序列表
        cloned.querySelectorAll('ol').forEach(ol => {
          let items = '';
          let idx = 1;
          ol.querySelectorAll(':scope > li').forEach(li => {
            items += idx++ + '. ' + li.textContent.trim() + '\n';
          });
          ol.replaceWith('\n' + items);
        });
    
        // 处理无序列表
        cloned.querySelectorAll('ul').forEach(ul => {
          let items = '';
          ul.querySelectorAll(':scope > li').forEach(li => {
            items += '- ' + li.textContent.trim() + '\n';
          });
          ul.replaceWith('\n' + items);
        });
    
        // 处理 <strong> <b> → **
        cloned.querySelectorAll('strong, b').forEach(el => {
          el.replaceWith('**' + el.textContent + '**');
        });
    
        // 处理 <em> <i> → *
        cloned.querySelectorAll('em, i').forEach(el => {
          el.replaceWith('*' + el.textContent + '*');
        });
    
        // 处理换行 / 段落
        cloned.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
        cloned.querySelectorAll('p').forEach(p => {
          p.insertAdjacentText('afterend', '\n');
        });
    
        text = cloned.textContent || cloned.innerText || '';
        // 规范化多余空行（最多保留 2 个连续换行）
        text = text.replace(/\n{3,}/g, '\n\n').trim();
        return text;
      }
    
      const messages = [];
      msgNodes.forEach(node => {
        const role = node.getAttribute('data-message-author-role')
          || (node.tagName === 'ARTICLE'
              ? (node.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role') || 'unknown')
              : 'unknown');
    
        // 找到实际文本内容容器（跳过工具栏、按钮等）
        const contentEl =
          node.querySelector('.markdown, [class*="markdown"], .prose, [class*="prose"]')
          || node.querySelector('div > p, div > ol, div > ul, div > pre, div > h1, div > h2')?.parentElement
          || node;
    
        const text = extractText(contentEl);
        if (text.length > 0) {
          messages.push({ role, text });
        }
      });
    
      if (messages.length === 0) {
        return { ok: false, error: '消息节点找到但文本为空，DOM 结构可能已更新。' };
      }
    
      // ── 3. 生成 Markdown ──────────────────────────────────────────────────────
      let qCount = 0;
      let aCount = 0;
      const lines = [];
    
      // 获取对话标题
      const titleEl = document.querySelector('title');
      const pageTitle = titleEl ? titleEl.textContent.replace(' - ChatGPT', '').trim() : '聊天记录';
      lines.push('# ' + pageTitle);
      lines.push('');
      lines.push('> 导出时间：' + new Date().toLocaleString('zh-CN'));
      lines.push('');
      lines.push('---');
      lines.push('');
    
      for (const msg of messages) {
        if (msg.role === 'user') {
          qCount++;
          lines.push('# 问题' + chNum(qCount));
          lines.push('');
          lines.push(msg.text);
          lines.push('');
        } else if (msg.role === 'assistant' || msg.role === 'tool') {
          aCount++;
          lines.push('# 回答' + chNum(aCount));
          lines.push('');
          lines.push(msg.text);
          lines.push('');
        }
      }
    
      const markdown = lines.join('\n');
    
      // ── 4. 触发下载 ───────────────────────────────────────────────────────────
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
    
      // 文件名：对话标题_日期
      const dateStr = new Date().toISOString().slice(0, 10);
      const safeTitle = pageTitle.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
      a.download = safeTitle + '_' + dateStr + '.md';
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    
      return {
        ok: true,
        title: pageTitle,
        total_messages: messages.length,
        questions: qCount,
        answers: aCount,
        markdown_length: markdown.length,
        filename: a.download,
        preview: markdown.slice(0, 400) + (markdown.length > 400 ? '\n...' : '')
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();