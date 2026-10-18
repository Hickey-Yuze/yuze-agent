(function() {
  if (document.getElementById('argb-converter-overlay')) {
    document.getElementById('argb-converter-overlay').remove();
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = 'argb-converter-overlay';
  overlay.innerHTML = `
    <style>
      #argb-converter-overlay {
        position: fixed; top: 20px; right: 20px; z-index: 2147483647;
        width: 320px; background: #1e1e2e; border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        color: #cdd6f4; overflow: hidden; cursor: move; user-select: none;
      }
      #argb-converter-overlay * { box-sizing: border-box; }
      .argb-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 14px; background: #181825; font-size: 13px; font-weight: 600;
      }
      .argb-close { cursor: pointer; color: #f38ba8; font-size: 16px; line-height: 1; user-select: none; }
      .argb-close:hover { color: #eba0ac; }
      .argb-body { padding: 14px; }
      .argb-row { display: flex; gap: 8px; margin-bottom: 10px; }
      .argb-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .argb-field label { font-size: 11px; color: #a6adc8; text-transform: uppercase; letter-spacing: 0.5px; }
      .argb-field input {
        width: 100%; padding: 6px 8px; border: 1px solid #45475a; border-radius: 6px;
        background: #313244; color: #cdd6f4; font-size: 14px; text-align: center;
        outline: none; font-family: 'SF Mono', 'Menlo', monospace;
      }
      .argb-field input:focus { border-color: #89b4fa; }
      .argb-preview {
        display: flex; align-items: center; gap: 10px; margin-top: 4px; margin-bottom: 10px;
      }
      .argb-swatch {
        width: 36px; height: 36px; border-radius: 8px; border: 2px solid #45475a;
        background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
          linear-gradient(-45deg, #ccc 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #ccc 75%),
          linear-gradient(-45deg, transparent 75%, #ccc 75%);
        background-size: 8px 8px;
        background-position: 0 0, 0 4px, 4px -4px, -4px 0px;
        position: relative; overflow: hidden;
      }
      .argb-swatch-inner {
        position: absolute; inset: 0; border-radius: 6px;
      }
      .argb-result {
        flex: 1; display: flex; flex-direction: column; gap: 2px;
      }
      .argb-result-label { font-size: 11px; color: #a6adc8; }
      .argb-result-value {
        font-family: 'SF Mono', 'Menlo', monospace; font-size: 15px; font-weight: 600;
        color: #a6e3a1; cursor: pointer; padding: 4px 8px; background: #313244;
        border-radius: 6px; text-align: center; transition: background 0.15s;
      }
      .argb-result-value:hover { background: #45475a; }
      .argb-result-value.copied { color: #89b4fa; }
      .argb-hex { font-size: 12px; color: #a6adc8; text-align: center; font-family: monospace; margin-top: 4px; }
    </style>
    <div class="argb-header">
      <span>ARGB → Int 转换器</span>
      <span class="argb-close" id="argb-close-btn">✕</span>
    </div>
    <div class="argb-body">
      <div class="argb-row">
        <div class="argb-field"><label>A (Alpha)</label><input type="number" id="argb-a" min="0" max="255" value="255"></div>
        <div class="argb-field"><label>R (Red)</label><input type="number" id="argb-r" min="0" max="255" value="66"></div>
        <div class="argb-field"><label>G (Green)</label><input type="number" id="argb-g" min="0" max="255" value="133"></div>
        <div class="argb-field"><label>B (Blue)</label><input type="number" id="argb-b" min="0" max="255" value="244"></div>
      </div>
      <div class="argb-preview">
        <div class="argb-swatch"><div class="argb-swatch-inner" id="argb-swatch"></div></div>
        <div class="argb-result">
          <span class="argb-result-label">Int 值（点击复制）</span>
          <div class="argb-result-value" id="argb-int-result">—</div>
        </div>
      </div>
      <div class="argb-hex" id="argb-hex-result"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const $ = id => document.getElementById(id);
  const clamp = v => Math.max(0, Math.min(255, parseInt(v) || 0));

  function compute() {
    const a = clamp($('argb-a').value);
    const r = clamp($('argb-r').value);
    const g = clamp($('argb-g').value);
    const b = clamp($('argb-b').value);
    const intVal = ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
    const signed = intVal > 0x7FFFFFFF ? intVal - 0x100000000 : intVal;
    $('argb-int-result').textContent = signed;
    $('argb-hex-result').textContent =
      'unsigned: ' + intVal + '  |  hex: 0x' + intVal.toString(16).toUpperCase().padStart(8, '0');
    $('argb-swatch').style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + (a / 255).toFixed(3) + ')';
  }

  ['argb-a','argb-r','argb-g','argb-b'].forEach(id => {
    $(id).addEventListener('input', compute);
    $(id).addEventListener('focus', function() { this.select(); });
  });

  $('argb-int-result').addEventListener('click', function() {
    navigator.clipboard.writeText(this.textContent).then(() => {
      this.classList.add('copied');
      const orig = this.textContent;
      this.textContent = '已复制!';
      setTimeout(() => { this.textContent = orig; this.classList.remove('copied'); }, 800);
    });
  });

  $('argb-close-btn').addEventListener('click', () => overlay.remove());

  // 拖拽
  let dx = 0, dy = 0, dragging = false;
  overlay.addEventListener('mousedown', e => {
    if (e.target.tagName === 'INPUT' || e.target.classList.contains('argb-close') ||
        e.target.classList.contains('argb-result-value')) return;
    dragging = true;
    dx = e.clientX - overlay.getBoundingClientRect().left;
    dy = e.clientY - overlay.getBoundingClientRect().top;
  });
  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    overlay.style.left = (e.clientX - dx) + 'px';
    overlay.style.top = (e.clientY - dy) + 'px';
    overlay.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => dragging = false);

  compute();
})();