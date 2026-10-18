(function() {
  'use strict';
  
  const PET_ID = 'Yuze-desktop-pet';
  const PET_IMAGE = 'https://tab-web-prod-1300456063.cos.ap-beijing.myqcloud.com/skill_plaza/a3572d8142874bddb65304ab7846e3e5/a3572d8142874bddb65304ab7846e3e5.png';
  
  const PET_WIDTH = 300;
  const PET_HEIGHT = 300;
  
  if (document.getElementById(PET_ID)) {
    return;
  }

  const styles = `
    #${PET_ID} {
      position: fixed;
      width: ${PET_WIDTH}px;
      height: ${PET_HEIGHT}px;
      cursor: move;
      z-index: 999999;
      user-select: none;
      right: 20px;
      bottom: 20px;
      animation: YuzeDrop 2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      transform-origin: center center;
    }
    #${PET_ID}:active {
      transform: scale(0.95);
    }
    #${PET_ID} img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      pointer-events: none;
      display: block;
    }
    
    @keyframes YuzeDrop {
      0% {
        transform: translateY(-100vh) rotate(-15deg);
        opacity: 0;
      }
      60% {
        transform: translateY(0) rotate(5deg);
        opacity: 1;
      }
      75% {
        transform: translateY(-30px) rotate(-3deg);
      }
      85% {
        transform: translateY(0) rotate(2deg);
      }
      92% {
        transform: translateY(-10px) rotate(-1deg);
      }
      100% {
        transform: translateY(0) rotate(0deg);
        opacity: 1;
      }
    }
    
    .Yuze-confetti {
      position: fixed;
      width: 12px;
      height: 12px;
      pointer-events: none;
      z-index: 999998;
      border-radius: 3px;
    }
    
    @keyframes YuzeFirework {
      0% {
        transform: translate(0, 0) rotate(0deg);
        opacity: 1;
      }
      100% {
        transform: translate(var(--tx), var(--ty)) rotate(var(--rotate));
        opacity: 0;
      }
    }
    
    .Yuze-birthday-container {
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      font-size: 56px;
      font-weight: normal;
      font-family: 'Arial', sans-serif;
      white-space: nowrap;
      display: flex;
      gap: 1px;
      letter-spacing: -2px;
    }
    
    .Yuze-birthday-letter {
      display: inline-block;
      animation: YuzeLetterAnim 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      opacity: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }
    
    @keyframes YuzeLetterAnim {
      0% {
        transform: scale(0) translateY(50px);
        opacity: 0;
      }
      60% {
        transform: scale(1.15) translateY(-10px);
        opacity: 1;
      }
      100% {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
    }
  `;

  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);

  const pet = document.createElement('div');
  pet.id = PET_ID;
  pet.innerHTML = `<img src="${PET_IMAGE}" alt="桌宠">`;
  document.body.appendChild(pet);

  let isDragging = false;
  let startX, startY, initialLeft, initialTop;
  let clickCount = 0;
  let clickTimer = null;

  function createFirework(x, y) {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#FF69B4', '#00CED1', '#FFD700', '#FF1493', '#00FF7F'];
    const particleCount = 100;

    for (let i = 0; i < particleCount; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'Yuze-confetti';
      confetti.style.left = x + 'px';
      confetti.style.top = y + 'px';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.67);
      const velocity = 250 + Math.random() * 300;
      const tx = Math.cos(angle) * velocity;
      const ty = Math.sin(angle) * velocity;
      const rotate = Math.random() * 1080 - 540;
      
      confetti.style.setProperty('--tx', tx + 'px');
      confetti.style.setProperty('--ty', ty + 'px');
      confetti.style.setProperty('--rotate', rotate + 'deg');
      
      const duration = 2 + Math.random() * 0.8;
      confetti.style.animation = `YuzeFirework ${duration}s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`;
      
      document.body.appendChild(confetti);
      setTimeout(() => confetti.remove(), duration * 1000);
    }
  }

  function showBirthdayMessage(x, y) {
    const text = 'Happy Birthday!';
    const colors = ['#FF4757', '#FFA502', '#FFD700', '#1E90FF', '#9B59B6'];
    
    const container = document.createElement('div');
    container.className = 'Yuze-birthday-container';
    container.style.left = (x - 230) + 'px';
    container.style.top = (y - 250) + 'px';
    
    text.split('').forEach((char, index) => {
      const letter = document.createElement('span');
      letter.className = 'Yuze-birthday-letter';
      letter.textContent = char;
      letter.style.color = colors[index % colors.length];
      letter.style.animationDelay = (index * 0.05) + 's';
      container.appendChild(letter);
    });
    
    document.body.appendChild(container);
    
    setTimeout(() => {
      container.style.transition = 'opacity 0.6s ease';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 600);
    }, 3000);
  }

  function handleClick(e) {
    clickCount++;
    
    if (clickCount === 1) {
      clickTimer = setTimeout(() => {
        createFirework(e.clientX, e.clientY);
        clickCount = 0;
      }, 300);
    } else if (clickCount === 2) {
      clearTimeout(clickTimer);
      showBirthdayMessage(e.clientX, e.clientY);
      createFirework(e.clientX, e.clientY);
      setTimeout(() => createFirework(e.clientX + 80, e.clientY), 200);
      setTimeout(() => createFirework(e.clientX - 80, e.clientY), 400);
      clickCount = 0;
    }
  }

  pet.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    
    const rect = pet.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    pet.style.animation = 'none';
    pet.style.transition = 'none';
    pet.style.left = initialLeft + 'px';
    pet.style.top = initialTop + 'px';
    pet.style.right = 'auto';
    pet.style.bottom = 'auto';
    
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      pet.style.left = (initialLeft + dx) + 'px';
      pet.style.top = (initialTop + dy) + 'px';
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (isDragging) {
      isDragging = false;
      
      const moveDistance = Math.sqrt(
        Math.pow(e.clientX - startX, 2) + 
        Math.pow(e.clientY - startY, 2)
      );
      
      if (moveDistance < 5) {
        handleClick(e);
      }
    }
  });

  pet.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    
    const rect = pet.getBoundingClientRect();
    initialLeft = rect.left;
    initialTop = rect.top;
    
    pet.style.animation = 'none';
    pet.style.transition = 'none';
    pet.style.left = initialLeft + 'px';
    pet.style.top = initialTop + 'px';
    pet.style.right = 'auto';
    pet.style.bottom = 'auto';
    
    e.preventDefault();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      pet.style.left = (initialLeft + dx) + 'px';
      pet.style.top = (initialTop + dy) + 'px';
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (isDragging) {
      isDragging = false;
      
      const touch = e.changedTouches[0];
      const moveDistance = Math.sqrt(
        Math.pow(touch.clientX - startX, 2) + 
        Math.pow(touch.clientY - startY, 2)
      );
      
      if (moveDistance < 5) {
        handleClick({ clientX: touch.clientX, clientY: touch.clientY });
      }
    }
  });
})();