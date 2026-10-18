// 知乎优化脚本
const style = document.createElement('style');
style.textContent = `
  body { background-color: #f5fff0 !important; }
  .ContentItem, .AnswerItem { 
    background-color: #fafff5 !important;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 20px;
  }
  [class*="ad-"], .Pc-card, .Marketing { display: none !important; }
`;
document.head.appendChild(style);