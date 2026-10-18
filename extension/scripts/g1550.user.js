(function() {
  function createSwingingImage() {
    console.log('Creating draggable swinging image animation...');
    
    if (document.getElementById('swinging-image-container')) {
      console.warn('Swinging image already exists');
      return;
    }

    const container = document.createElement('div');
    container.id = 'swinging-image-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 999999;
      pointer-events: auto;
      cursor: move;
    `;

    const rope = document.createElement('div');
    rope.style.cssText = `
      width: 2px;
      height: 100px;
      background: linear-gradient(to bottom, #8B4513, #654321);
      margin: 0 auto;
      box-shadow: 1px 0 2px rgba(0,0,0,0.3);
    `;

    const imageWrapper = document.createElement('div');
    imageWrapper.style.cssText = `
      transform-origin: top center;
      animation: swing 3s ease-in-out infinite;
    `;

    const img = document.createElement('img');
    img.src = 'https://raw.githubusercontent.com/Leslie-sudo/hello-world/refs/heads/master/%E6%8A%A0%E5%9B%BE%E4%B8%BB%E4%BD%93%E9%83%A8%E5%88%86%201.png';
    img.alt = 'Swinging Image';
    img.style.cssText = `
      width: 200px;
      height: auto;
      display: block;
      border-radius: 8px;
      user-select: none;
    `;

    img.onerror = function() {
      console.error('Failed to load image from GitHub');
      img.style.background = '#f0f0f0';
      img.style.minHeight = '200px';
      img.style.display = 'flex';
      img.style.alignItems = 'center';
      img.style.justifyContent = 'center';
    };

    const style = document.createElement('style');
    style.textContent = `
      @keyframes swing {
        0%, 100% {
          transform: rotate(-15deg);
        }
        50% {
          transform: rotate(15deg);
        }
      }
    `;

    // Drag functionality
    let isDragging = false;
    let startX;
    let currentLeft;

    container.addEventListener('mousedown', function(e) {
      isDragging = true;
      startX = e.clientX;
      const rect = container.getBoundingClientRect();
      currentLeft = rect.left + rect.width / 2;
      container.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const newLeft = currentLeft + deltaX;
      const leftPercent = (newLeft / window.innerWidth) * 100;
      
      container.style.left = leftPercent + '%';
    });

    document.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        container.style.cursor = 'move';
      }
    });

    imageWrapper.appendChild(img);
    container.appendChild(rope);
    container.appendChild(imageWrapper);
    document.head.appendChild(style);
    document.body.appendChild(container);

    console.log('Draggable swinging image animation created successfully');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSwingingImage);
  } else {
    createSwingingImage();
  }
})();