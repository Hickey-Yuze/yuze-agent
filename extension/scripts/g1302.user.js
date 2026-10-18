(function() {
  function addMagnetColumn() {
    console.log('开始添加磁力下载列...');
    
    const table = document.querySelector('#listTable');
    if (!table) {
      console.warn('未找到目标表格');
      return;
    }
    
    // 添加表头
    const headerRow = table.querySelector('thead.tcat tr');
    if (headerRow) {
      const th = document.createElement('th');
      th.className = 'l2 tableHeaderOver';
      th.textContent = '磁力下载';
      headerRow.appendChild(th);
      console.log('表头已添加');
    }
    
    // 处理每一行数据
    const dataRows = table.querySelectorAll('tbody.tbody tr');
    console.log(`找到 ${dataRows.length} 行数据`);
    
    dataRows.forEach((row, index) => {
      const titleLink = row.querySelector('td:nth-child(3) a[href^="show-"]');
      
      if (titleLink) {
        const href = titleLink.getAttribute('href');
        const match = href.match(/show-([a-f0-9]+)\.html/);
        
        if (match && match[1]) {
          const hash = match[1];
          const magnetLink = `magnet:?xt=urn:btih:${hash}&tr=http://open.acgtracker.com:1096/announce`;
          
          // 创建新单元格
          const td = document.createElement('td');
          const link = document.createElement('a');
          link.href = magnetLink;
          link.textContent = '磁力链接';
          link.style.color = '#0066cc';
          link.title = `magnet:?xt=urn:btih:${hash}`;
          
          td.appendChild(link);
          row.appendChild(td);
        } else {
          // 如果没有匹配到 ID，添加空单元格
          const td = document.createElement('td');
          td.textContent = '-';
          row.appendChild(td);
        }
      } else {
        // 如果没有找到链接，添加空单元格
        const td = document.createElement('td');
        td.textContent = '-';
        row.appendChild(td);
      }
    });
    
    console.log('磁力下载列添加完成');
  }
  
  // 执行脚本
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addMagnetColumn);
  } else {
    addMagnetColumn();
  }
})();