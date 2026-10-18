// 极简版：🐱 仅跟随鼠标
(function() {
  // ===================== 固定配置 =====================
  const petConfig = {
    content: '🐱',
    size: 24, // 小号猫咪（可自行调整数值）
    offsetX: 8,
    offsetY: 8
  };

  // ===================== 核心变量 =====================
  let petElement = null;
  let currentX = window.innerWidth / 2;
  let currentY = window.innerHeight / 2;

  // ===================== 创建🐱元素 =====================
  function createCat() {
    if (petElement) return;

    petElement = document.createElement('div');
    petElement.textContent = petConfig.content;
    petElement.style.cssText = `
      position: fixed;
      font-size: ${petConfig.size}px;
      pointer-events: auto;
      z-index: 999999;
      user-select: none;
    `;

    document.body.appendChild(petElement);
    bindFollowMouse();
  }

  // ===================== 基础鼠标跟随 =====================
  function bindFollowMouse() {
    document.addEventListener('mousemove', (e) => {
      currentX = e.clientX + petConfig.offsetX;
      currentY = e.clientY + petConfig.offsetY;
      
      // 边界检测：防止小猫超出窗口
      const maxX = window.innerWidth - petConfig.size;
      const maxY = window.innerHeight - petConfig.size;
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      
      petElement.style.left = `${currentX}px`;
      petElement.style.top = `${currentY}px`;
    });
  }

  // ===================== 启动 =====================
  createCat();
  // 初始化位置
  petElement.style.left = `${currentX}px`;
  petElement.style.top = `${currentY}px`;
  
  console.log('🎉 极简版🐱已上线！');
  console.log('👉 🐱会跟着你的鼠标移动～');
})();