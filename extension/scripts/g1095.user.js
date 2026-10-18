(function() {
  function exportChatToMarkdown() {
    console.log('开始导出聊天记录...');
    
    const chatTitle = document.querySelector('[data-testid="chat-title-button"]')?.textContent.trim() || '聊天记录';
    let markdown = `# ${chatTitle}\n\n`;
    
    const messageGroups = document.querySelectorAll('.group.relative');
    
    messageGroups.forEach((group) => {
      const userMessage = group.querySelector('[data-testid="user-message"]');
      const aiResponse = group.querySelector('.standard-markdown');
      
      if (userMessage) {
        const messageText = userMessage.textContent.trim();
        markdown += `# ${messageText}\n\n`;
      }
      
      if (aiResponse) {
        const clonedResponse = aiResponse.cloneNode(true);
        
        clonedResponse.querySelectorAll('button').forEach(btn => btn.remove());
        clonedResponse.querySelectorAll('[aria-hidden="true"]').forEach(el => el.remove());
        
        const processElement = (element) => {
          let result = '';
          
          element.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              result += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toLowerCase();
              
              switch(tag) {
                case 'h2':
                  result += `\n## ${node.textContent.trim()}\n\n`;
                  break;
                case 'h3':
                  result += `\n### ${node.textContent.trim()}\n\n`;
                  break;
                case 'p':
                  result += `${processElement(node)}\n\n`;
                  break;
                case 'strong':
                  result += `**​${node.textContent}​**`;
                  break;
                case 'code':
                  if (node.parentElement.tagName === 'PRE') {
                    result += `\`\`\`\n${node.textContent}\n\`\`\`\n\n`;
                  } else {
                    result += `\`${node.textContent}\``;
                  }
                  break;
                case 'pre':
                  const codeBlock = node.querySelector('code');
                  if (codeBlock) {
                    result += `\n\`\`\`\n${codeBlock.textContent}\n\`\`\`\n\n`;
                  }
                  break;
                case 'ul':
                  node.querySelectorAll('li').forEach(li => {
                    result += `- ${li.textContent.trim()}\n`;
                  });
                  result += '\n';
                  break;
                case 'ol':
                  node.querySelectorAll('li').forEach((li, idx) => {
                    result += `${idx + 1}. ${li.textContent.trim()}\n`;
                  });
                  result += '\n';
                  break;
                case 'table':
                  result += convertTableToMarkdown(node);
                  break;
                default:
                  result += processElement(node);
              }
            }
          });
          
          return result;
        };
        
        const convertTableToMarkdown = (table) => {
          let tableMarkdown = '\n';
          const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
          const rows = Array.from(table.querySelectorAll('tbody tr'));
          
          if (headers.length > 0) {
            tableMarkdown += '| ' + headers.join(' | ') + ' |\n';
            tableMarkdown += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
          }
          
          rows.forEach(row => {
            const cells = Array.from(row.querySelectorAll('td')).map(td => td.textContent.trim());
            tableMarkdown += '| ' + cells.join(' | ') + ' |\n';
          });
          
          return tableMarkdown + '\n';
        };
        
        const responseMarkdown = processElement(clonedResponse);
        markdown += responseMarkdown;
      }
    });
    
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${chatTitle.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('聊天记录已导出为 Markdown 文件');
    alert('聊天记录已成功导出！');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(exportChatToMarkdown, 1000);
    });
  } else {
    setTimeout(exportChatToMarkdown, 1000);
  }
})();