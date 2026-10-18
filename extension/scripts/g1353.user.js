(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    function diamondSwordCursor(args) {
      var swordSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 16 16">'
        + '<defs>'
        + '<linearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">'
        + '<stop offset="0%" style="stop-color:#4AEDD9;stop-opacity:1" />'
        + '<stop offset="50%" style="stop-color:#5FFBF1;stop-opacity:1" />'
        + '<stop offset="100%" style="stop-color:#4AEDD9;stop-opacity:1" />'
        + '</linearGradient>'
        + '<linearGradient id="guard" x1="0%" y1="0%" x2="100%" y2="0%">'
        + '<stop offset="0%" style="stop-color:#1E90FF;stop-opacity:1" />'
        + '<stop offset="50%" style="stop-color:#4169E1;stop-opacity:1" />'
        + '<stop offset="100%" style="stop-color:#1E90FF;stop-opacity:1" />'
        + '</linearGradient>'
        + '</defs>'
        + '<rect x="7" y="0" width="2" height="9" fill="url(#blade)" stroke="#2F8F8F" stroke-width="0.3"/>'
        + '<rect x="4" y="8.5" width="8" height="2" fill="url(#guard)" stroke="#00008B" stroke-width="0.3"/>'
        + '<rect x="7.5" y="10.5" width="1" height="4" fill="#8B4513" stroke="#654321" stroke-width="0.3"/>'
        + '<rect x="6.5" y="14" width="3" height="1.5" fill="#B8860B" stroke="#8B6914" stroke-width="0.3"/>'
        + '<line x1="7.3" y1="1" x2="7.3" y2="7" stroke="#FFFFFF" stroke-width="0.3" opacity="0.6"/>'
        + '</svg>';
    
      var svgBase64 = btoa(swordSVG);
      var dataURI = 'data:image/svg+xml;base64,' + svgBase64;
    
      // Hide system cursor globally
      var hideCursorStyle = document.getElementById('diamond-sword-hide-cursor');
      if (!hideCursorStyle) {
        hideCursorStyle = document.createElement('style');
        hideCursorStyle.id = 'diamond-sword-hide-cursor';
        hideCursorStyle.textContent = '* { cursor: none !important; }';
        document.head.appendChild(hideCursorStyle);
      }
    
      var cursorEl = document.getElementById('minecraft-diamond-sword-cursor');
    
      if (!cursorEl) {
        cursorEl = document.createElement('div');
        cursorEl.id = 'minecraft-diamond-sword-cursor';
        cursorEl.style.cssText = [
          'position:fixed',
          'top:0;left:0',
          'width:32px;height:32px',
          'pointer-events:none',
          'z-index:2147483647',
          'background-image:url(' + dataURI + ')',
          'background-size:contain',
          'background-repeat:no-repeat',
          'transform:translate(-8px,-8px) rotate(-45deg)',
          'transition:transform 0.1s ease-out',
          'will-change:transform,top,left',
          'image-rendering:pixelated',
          'image-rendering:-moz-crisp-edges',
          'image-rendering:crisp-edges'
        ].join(';');
        document.body.appendChild(cursorEl);
    
        var mouseX = 0, mouseY = 0;
        var currentX = 0, currentY = 0;
    
        document.addEventListener('mousemove', function(e) {
          mouseX = e.clientX;
          mouseY = e.clientY;
        }, { passive: true });
    
        function animate() {
          currentX += (mouseX - currentX) * 0.15;
          currentY += (mouseY - currentY) * 0.15;
    
          if (cursorEl && cursorEl.parentNode) {
            cursorEl.style.left = currentX + 'px';
            cursorEl.style.top = currentY + 'px';
          }
          requestAnimationFrame(animate);
        }
    
        requestAnimationFrame(animate);
    
        document.addEventListener('mousedown', function() {
          if (cursorEl) cursorEl.style.transform = 'translate(-8px,-8px) rotate(-45deg) scale(0.9)';
        }, { passive: true });
    
        document.addEventListener('mouseup', function() {
          if (cursorEl) cursorEl.style.transform = 'translate(-8px,-8px) rotate(-45deg) scale(1)';
        }, { passive: true });
    
        return {
          ok: true,
          summary: 'Minecraft diamond sword cursor activated (single mode)',
          details: {
            method: 'custom div element only, system cursor hidden via CSS',
            performance: 'requestAnimationFrame 60fps smooth tracking with interpolation',
            features: ['smooth interpolation', 'click animation', '-45deg rotation', 'pixelated rendering']
          }
        };
      }
    
      return { ok: true, summary: 'Diamond sword cursor already active' };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();