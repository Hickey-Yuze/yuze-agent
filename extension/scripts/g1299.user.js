(function() {
  const STORAGE_KEY = 'dark-mode-filter';
  const BUTTON_ID = 'universal-dark-mode-btn';
  const STYLE_ID = 'universal-dark-mode-style';
  
  if (document.getElementById(BUTTON_ID)) {
    console.log('Dark mode button already exists');
    return;
  }

  function createStyleSheet() {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.dark-mode-filter {
        filter: invert(1) hue-rotate(180deg);
        background-color: #fff;
      }
      
      html.dark-mode-filter img,
      html.dark-mode-filter video,
      html.dark-mode-filter iframe,
      html.dark-mode-filter [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg);
      }
      
      * {
        transition: filter 0.3s ease;
      }
    `;
    document.head.appendChild(style);
  }

  function createToggleButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.setAttribute('aria-label', '切换暗黑模式');
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      border: 2px solid rgba(128, 128, 128, 0.3);
      cursor: pointer;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
      font-size: 24px;
      backdrop-filter: blur(10px);
    `;
    
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.15) rotate(15deg)';
      button.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1) rotate(0deg)';
      button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
    });
    
    return button;
  }

  function updateButtonStyle(button, isDark) {
    button.innerHTML = isDark ? '🌙' : '☀️';
    button.style.background = isDark 
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      : 'linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%)';
    button.style.filter = 'none';
  }

  function isDarkModeEnabled() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }

  function applyDarkMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add('dark-mode-filter');
    } else {
      document.documentElement.classList.remove('dark-mode-filter');
    }
    localStorage.setItem(STORAGE_KEY, enabled);
  }

  function toggleDarkMode(button) {
    const currentState = isDarkModeEnabled();
    const newState = !currentState;
    
    applyDarkMode(newState);
    updateButtonStyle(button, newState);
    
    console.log(`Dark mode ${newState ? 'enabled' : 'disabled'}`);
  }

  function init() {
    createStyleSheet();
    
    const button = createToggleButton();
    const darkModeEnabled = isDarkModeEnabled();
    
    applyDarkMode(darkModeEnabled);
    updateButtonStyle(button, darkModeEnabled);
    
    button.style.filter = 'none';
    
    button.addEventListener('click', () => toggleDarkMode(button));
    
    document.body.appendChild(button);
    console.log('Universal dark mode initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();