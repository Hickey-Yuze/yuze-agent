const enableBtn = document.createElement('div');
enableBtn.innerText = '启用选中';
enableBtn.style.cssText = `
  position: fixed;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  padding: 9px 13px;
  background: #ff7d00;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  cursor: pointer;
  z-index: 999999;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  user-select: none;
  transition: all 0.2s ease;
`;
enableBtn.onmouseenter = () => enableBtn.style.opacity = '0.85';
enableBtn.onmouseleave = () => enableBtn.style.opacity = '1';

function enableTextSelect() {
  document.querySelectorAll('*').forEach(el => {
    el.style.cssText += 'user-select:text !important; -webkit-user-select:text !important;';
  });
  document.body.onselectstart = null;
  document.body.oncontextmenu = null;
  document.body.onmousedown = null;

  enableBtn.innerText = '已启用';
  enableBtn.style.background = '#07c160';
  setTimeout(() => {
    enableBtn.innerText = '启用选中';
    enableBtn.style.background = '#ff7d00';
  }, 2000);
}

enableBtn.onclick = enableTextSelect;
document.body.appendChild(enableBtn);