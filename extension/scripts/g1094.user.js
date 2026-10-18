(function() {
  console.log('开始导出聊天记录...');

  // 提取聊天标题作为文件名
  function getChatTitle() {
    const titleElement = document.querySelector('.chat-header-content h2');
    return titleElement ? titleElement.textContent.trim() : '聊天记录';
  }

  // 提取用户消息
  function extractUserMessages() {
    const userItems = document.querySelectorAll('.chat-content-item-user');
    return Array.from(userItems).map(item => {
      const contentElement = item.querySelector('.user-content');
      return contentElement ? contentElement.textContent.trim() : '';
    }).filter(text => text.length > 0);
  }

  // 提取 AI 回答的 Markdown 内容
  function extractAIResponses() {
    const aiItems = document.querySelectorAll('.chat-content-item-assistant');
    return Array.from(aiItems).map(item => {
      const markdownContainers = item.querySelectorAll('.markdown-container .markdown');
      let content = '';
      
      markdownContainers.forEach(container => {
        // 递归提取文本内容，保留结构
        content += extractMarkdownContent(container) + '\n\n';
      });
      
      return content.trim();
    }).filter(text => text.length > 0);
  }

  // 递归提取 Markdown 内容（保留格式）
  function extractMarkdownContent(element) {
    let result = '';
    
    element.childNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        result += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tag = node.tagName.toLowerCase();
        
        // 处理标题
        if (tag.match(/^h[1-6]$/)) {
          const level = tag.charAt(1);
          result += '\n' + '#'.repeat(level) + ' ' + node.textContent.trim() + '\n\n';
        }
        // 处理代码块
        else if (tag === 'pre' && node.querySelector('code')) {
          const codeElement = node.querySelector('code');
          const lang = codeElement.className.match(/language-(\w+)/)?.[1] || '';
          result += '\n```' + lang + '\n' + codeElement.textContent + '\n```\n\n';
        }
        // 处理行内代码
        else if (tag === 'code' && !node.closest('pre')) {
          result += '`' + node.textContent + '`';
        }
        // 处理列表
        else if (tag === 'ul' || tag === 'ol') {
          result += '\n' + extractListContent(node, tag === 'ol') + '\n';
        }
        // 处理表格
        else if (tag === 'table') {
          result += '\n' + extractTableContent(node) + '\n';
        }
        // 处理段落和其他元素
        else if (tag === 'p' || tag === 'div') {
          result += extractMarkdownContent(node) + '\n\n';
        }
        // 处理强调
        else if (tag === 'strong' || tag === 'b') {
          result += '**​' + node.textContent + '​**';
        }
        else if (tag === 'em' || tag === 'i') {
          result += '*' + node.textContent + '*';
        }
        // 处理链接
        else if (tag === 'a') {
          result += '[' + node.textContent + '](' + (node.href || '') + ')';
        }
        // 处理换行
        else if (tag === 'br') {
          result += '\n';
        }
        // 处理水平线
        else if (tag === 'hr') {
          result += '\n---\n\n';
        }
        // 其他元素递归处理
        else {
          result += extractMarkdownContent(node);
        }
      }
    });
    
    return result;
  }

  // 提取列表内容
  function extractListContent(listElement, isOrdered, indent = 0) {
    let result = '';
    const items = listElement.querySelectorAll(':scope > li');
    
    items.forEach((item, index) => {
      const prefix = '  '.repeat(indent) + (isOrdered ? `${index + 1}. ` : '- ');
      const textContent = Array.from(item.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE || (node.nodeType === Node.ELEMENT_NODE && !['ul', 'ol'].includes(node.tagName.toLowerCase())))
        .map(node => node.textContent)
        .join('')
        .trim();
      
      result += prefix + textContent + '\n';
      
      // 处理嵌套列表
      const nestedList = item.querySelector(':scope > ul, :scope > ol');
      if (nestedList) {
        result += extractListContent(nestedList, nestedList.tagName.toLowerCase() === 'ol', indent + 1);
      }
    });
    
    return result;
  }

  // 提取表格内容
  function extractTableContent(tableElement) {
    let result = '';
    const rows = tableElement.querySelectorAll('tr');
    
    if (rows.length === 0) return '';
    
    // 处理表头
    const headerCells = rows[0].querySelectorAll('th, td');
    if (headerCells.length > 0) {
      result += '| ' + Array.from(headerCells).map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
      result += '| ' + Array.from(headerCells).map(() => '---').join(' | ') + ' |\n';
    }
    
    // 处理表体
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].querySelectorAll('td');
      if (cells.length > 0) {
        result += '| ' + Array.from(cells).map(cell => cell.textContent.trim()).join(' | ') + ' |\n';
      }
    }
    
    return result;
  }

  // 生成 Markdown 文件
  function generateMarkdown() {
    const userMessages = extractUserMessages();
    const aiResponses = extractAIResponses();
    
    if (userMessages.length === 0 && aiResponses.length === 0) {
      console.warn('未找到聊天内容');
      alert('未找到聊天内容，请确保页面已完全加载');
      return null;
    }
    
    let markdown = '';
    const maxLength = Math.max(userMessages.length, aiResponses.length);
    
    for (let i = 0; i < maxLength; i++) {
      // 添加用户提问（一级标题）
      if (i < userMessages.length) {
        markdown += `# ${userMessages[i]}\n\n`;
      }
      
      // 添加 AI 回答
      if (i < aiResponses.length) {
        markdown += aiResponses[i] + '\n\n';
      }
    }
    
    return markdown;
  }

  // 下载文件
  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // 主执行函数
  function executeExport() {
    const chatTitle = getChatTitle();
    const markdown = generateMarkdown();
    
    if (!markdown) {
      return;
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const baseFilename = `${chatTitle}_${timestamp}`;
    
    try {
      // 尝试下载 Markdown 文件
      downloadFile(markdown, `${baseFilename}.md`, 'text/markdown;charset=utf-8');
      console.log('✅ Markdown 文件下载成功');
      alert('聊天记录已导出为 Markdown 文件！');
    } catch (error) {
      console.warn('Markdown 下载失败，尝试 TXT 格式', error);
      try {
        // 降级为 TXT 文件
        downloadFile(markdown, `${baseFilename}.txt`, 'text/plain;charset=utf-8');
        console.log('✅ TXT 文件下载成功');
        alert('聊天记录已导出为 TXT 文件！');
      } catch (txtError) {
        console.error('文件下载失败', txtError);
        alert('文件下载失败，请检查浏览器权限');
      }
    }
  }

  // 等待 DOM 加载完成后执行
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', executeExport);
  } else {
    executeExport();
  }
})();