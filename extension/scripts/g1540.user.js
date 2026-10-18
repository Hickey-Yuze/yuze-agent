(function() {
  const marker = '__grayscale_applied__';
  if (document.documentElement.dataset[marker]) return;
  document.documentElement.dataset[marker] = '1';

  const style = document.createElement('style');
  style.textContent = `
    html {
      filter: grayscale(100%) !important;
      -webkit-filter: grayscale(100%) !important;
    }
  `;
  document.head.appendChild(style);
})();