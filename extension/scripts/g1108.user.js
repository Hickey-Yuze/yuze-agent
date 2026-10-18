(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"gain": 6};
  const __tabOriginalFunction = (
    /**
     * Bilibili Video Volume Booster v2 - Fixed for pre-connected audio
     * 
     * Uses captureStream() approach to bypass "already connected" error.
     * Works even when B站 player has already claimed the <video> element.
     */
    
    async function run(args) {
      const defaultGain = args && args.gain ? args.gain : 6;
      
      if (window.__bvbActive) {
        return { ok: true, summary: 'Already running', gain: window.__bvbGain.gain.value };
      }
    
      const video = document.querySelector('video');
      if (!video) return { ok: false, summary: 'No video found' };
    
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // KEY FIX: Use captureStream() instead of createMediaElementSource()
        // This works even when the video is already connected to another AudioContext
        let source;
        
        if (video.captureStream) {
          const stream = video.captureStream();
          // Get only the audio tracks
          const audioTracks = stream.getAudioTracks();
          if (audioTracks.length === 0) {
            // No audio tracks yet - wait briefly and retry, or create empty stream
            // Try creating with fallback
            source = ctx.createMediaStreamSource(stream);
          } else {
            source = ctx.createMediaStreamSource(stream);
          }
        } else if (video.mozCaptureStream) {
          const stream = video.mozCaptureStream();
          source = ctx.createMediaStreamSource(stream);
        } else {
          return { ok: false, summary: 'Browser does not support captureStream(). Please use Chrome/Edge/Firefox.' };
        }
        
        const gain = ctx.createGain();
        gain.gain.value = Math.max(1, Math.min(10, defaultGain));
        
        source.connect(gain);
        gain.connect(ctx.destination);
        
        window.__bvbActive = true;
        window.__bvbGain = gain;
        window.__bvbCtx = ctx;
        window.__bvbSource = source;
    
        // UI Panel
        const panel = document.createElement('div');
        panel.id = 'bvb-panel';
        panel.innerHTML = '<style>#bvb-panel{position:fixed;bottom:80px;right:20px;z-index:999999;background:linear-gradient(135deg,#00a1d6,#00c0ff);color:#fff;padding:14px 18px;border-radius:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;box-shadow:0 4px 20px rgba(0,161,214,.4),0 2px 8px rgba(0,0,0,.15);min-width:230px;user-select:none;backdrop-filter:blur(10px);animation:bvbIn .3s ease-out}@keyframes bvbIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}#bvb-panel .h{display:flex;justify-content:space-between;font-weight:600;margin-bottom:8px;font-size:13px}#bvb-panel .row{display:flex;align-items:center;gap:8px}#bvb-panel input[type=range]{flex:1;height:6px;-webkit-appearance:none;background:rgba(255,255,255,.3);border-radius:3px;outline:none;cursor:pointer}#bvb-panel input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,.2);transition:transform .15s}#bvb-panel input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.15)}#bvb-panel .val{font-weight:700;font-size:16px;min-width:42px;text-align:right;text-shadow:0 1px 3px rgba(0,0,0,.2)}#bvb-panel .lbl{display:flex;justify-content:space-between;font-size:11px;opacity:.85;margin-top:4px}#bvb-panel .st{text-align:center;font-size:11px;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.25);opacity:.9}#bvb-panel .cls{cursor:pointer;background:rgba(255,255,255,.2);border:none;color:#fff;width:22px;height:22px;border-radius:50%;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;transition:background .2s}#bvb-panel .cls:hover{background:rgba(255,255,255,.35)}</style><div class="h"><span>🔊 音量放大器 v2</span><button class="cls" id="bvbx">×</button></div><div class="row"><input type="range" id="bvbs" min="1" max="10" step="0.5" value="' + gain.gain.value + '"><span class="val" id="bvbv">' + gain.gain.value.toFixed(1) + 'x</span></div><div class="lbl"><span>1x 正常</span><span>10x 最大</span></div><div class="st">✓ 已启用(captureStream模式) · 拖动滑块调节</div>';
        
        document.body.appendChild(panel);
        
        const slider = document.getElementById('bvbs');
        const display = document.getElementById('bvbv');
        slider.oninput = function() {
          const v = parseFloat(this.value);
          gain.gain.value = v;
          display.textContent = v.toFixed(1) + 'x';
        };
        document.getElementById('bvbx').onclick = function() {
          try { ctx.close(); } catch(e) {}
          delete window.__bvbActive;
          panel.remove();
        };
        
        // Drag support
        let dg = false, ox, oy;
        const hdr = panel.querySelector('.h');
        hdr.style.cursor = 'grab';
        hdr.onmousedown = function(e) {
          if (e.target.classList.contains('cls')) return;
          dg = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
          hdr.style.cursor = 'grabbing'; e.preventDefault();
        };
        document.onmousemove = function(e) {
          if (!dg) return;
          panel.style.left = (e.clientX - ox) + 'px';
          panel.style.top = (e.clientY - oy) + 'px';
          panel.style.right = 'auto'; panel.style.bottom = 'auto';
        };
        document.onmouseup = function() { dg = false; hdr.style.cursor = 'grab'; };
    
        return {
          ok: true,
          summary: 'Volume booster v2 activated via captureStream! Gain: ' + gain.gain.value + 'x',
          method: 'captureStream',
          gain: gain.gain.value
        };
      } catch(e) {
        return { ok: false, summary: e.message, error: String(e), stack: e.stack };
      }
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();