/**
 * 🎨 网页配色提取器 - Tabbit 妙招大赛参赛作品
 * 
 * 功能：
 * 1. 提取当前页面所有可见颜色，按使用频率排序
 * 2. 生成完整色板（含 HEX / RGB / HSL）
 * 3. 输出 CSS 变量代码（可直接复制使用）
 * 4. WCAG 对比度检测报告
 * 5. 一键复制/导出功能
 * 
 * 作者：Tabbit 妙招大赛参赛作品
 * 赛道：脚本妙招
 */

async function run(args) {
  // ============ 配置 ============
  const CONFIG = {
    maxColors: 20,
    minUsage: 2,
    showCssVars: true,
    checkContrast: true,
    groupSimilar: true,
    similarityThreshold: 15
  };

  // ============ 颜色工具函数 ============
  
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function colorDistance(c1, c2) {
    return Math.sqrt(
      Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
    );
  }

  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
    const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  function isLightColor(r, g, b) {
    return (r * 299 + g * 587 + b * 114) / 1000 > 128;
  }

  // ============ DOM 颜色提取 ============
  
  function extractColorsFromPage() {
    const colorMap = new Map();
    const allElements = document.querySelectorAll('body *');
    
    allElements.forEach(el => {
      try {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return;
        
        const color = style.color.match(/\d+/g);
        if (color && color.length >= 3) {
          const r = parseInt(color[0]), g = parseInt(color[1]), b = parseInt(color[2]);
          if (!(r < 10 && g < 10 && b < 10) && !(r > 245 && g > 245 && b > 245)) {
            colorMap.set(rgbToHex(r, g, b), (colorMap.get(rgbToHex(r, g, b)) || 0) + 1);
          }
        }
        
        const bgColor = style.backgroundColor.match(/\d+/g);
        if (bgColor && bgColor.length >= 3) {
          const r = parseInt(bgColor[0]), g = parseInt(bgColor[1]), b = parseInt(bgColor[2]);
          if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' && !(r < 10 && g < 10 && b < 10)) {
            colorMap.set(rgbToHex(r, g, b), (colorMap.get(rgbToHex(r, g, b)) || 0) + 1);
          }
        }
        
        const borderColor = style.borderColor.match(/\d+/g);
        if (borderColor && borderColor.length >= 3) {
          const r = parseInt(borderColor[0]), g = parseInt(borderColor[1]), b = parseInt(borderColor[2]);
          if (style.borderColor !== 'rgba(0, 0, 0, 0)') {
            colorMap.set(rgbToHex(r, g, b), (colorMap.get(rgbToHex(r, g, b)) || 0) + 1);
          }
        }
      } catch(e) {}
    });

    let colors = Array.from(colorMap.entries())
      .map(([hex, count]) => ({ hex, count, ...hexToRgb(hex) }))
      .filter(c => c.count >= CONFIG.minUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, CONFIG.maxColors);

    if (CONFIG.groupSimilar) {
      const merged = [];
      for (const c of colors) {
        const similar = merged.find(m => colorDistance(c, m) < CONFIG.similarityThreshold);
        if (similar) { similar.count += c.count; }
        else { merged.push({ ...c }); }
      }
      colors = merged.sort((a, b) => b.count - a.count).slice(0, CONFIG.maxColors);
    }

    colors.forEach(c => {
      c.hsl = rgbToHsl(c.r, c.g, c.b);
      c.isLight = isLightColor(c.r, c.g, c.b);
    });

    return colors;
  }

  // ============ UI 渲染 ============
  
  function renderPalette(colors) {
    const container = document.createElement('div');
    container.id = 'tabbit-color-palette';
    Object.assign(container.style, {
      position: 'fixed', top: '10px', right: '10px',
      width: '380px', maxHeight: '90vh', overflowY: 'auto',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      borderRadius: '16px', padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      color: '#eee', zIndex: '2147483647',
      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      fontSize: '13px', lineHeight: '1.5'
    });

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:22px;">🎨</span>
          <span style="font-size:16px;font-weight:700;background:linear-gradient(90deg,#f093fb,#f5576c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">网页配色方案</span>
        </div>
        <button id="tp-close" style="background:none;border:none;color:#888;font-size:24px;cursor:pointer;padding:0;">&times;</button>
      </div>
      <div style="display:flex;gap:12px;margin-bottom:16px;">
        <div style="background:rgba(255,255,255,0.06);padding:8px 14px;border-radius:10px;text-align:center;">
          <div style="font-size:18px;font-weight:700;color:#f5576c;">${colors.length}</div>
          <div style="font-size:11px;color:#888;">种颜色</div>
        </div>
        <div style="background:rgba(255,255,255,0.06);padding:8px 14px;border-radius:10px;text-align:center;">
          <div style="font-size:18px;font-weight:700;color:#4facfe;">${colors.reduce((s,c)=>s+c.count,0)}</div>
          <div style="font-size:11px;color:#888;">处使用</div>
        </div>
      </div>
      <div id="tp-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px;"></div>
      <div id="tp-css" style="margin-bottom:14px;"></div>
      <div id="tp-contrast" style="margin-bottom:14px;"></div>
      <div style="display:flex;gap:8px;margin-top:12px;">
        <button id="tp-export" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#ddd;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;">📤 导出 JSON</button>
        <button id="tp-close-btn" style="flex:1;background:rgba(245,87,108,0.15);border:1px solid rgba(245,87,108,0.3);color:#f5576c;padding:8px;border-radius:8px;font-size:12px;cursor:pointer;">关闭面板</button>
      </div>`;

    // 渲染色卡
    const grid = container.querySelector('#tp-grid');
    colors.forEach((c, i) => {
      const card = document.createElement('div');
      card.style.cssText = `background:rgba(255,255,255,0.05);border-radius:12px;padding:12px;cursor:pointer;transition:transform 0.2s;border:1px solid transparent;`;
      card.onmouseenter = () => { card.style.transform = 'scale(1.03)'; card.style.borderColor = c.hex; };
      card.onmouseleave = () => { card.style.transform = ''; card.style.borderColor = ''; };
      card.onclick = () => navigator.clipboard.writeText(c.hex);
      const textColor = c.isLight ? '#333' : '#fff';
      card.innerHTML = `
        <div style="width:100%;height:50px;border-radius:8px;background:${c.hex};margin-bottom:8px;display:flex;align-items:flex-end;justify-content:flex-end;padding:4px;">
          <span style="font-size:10px;background:${textColor};color:${c.hex};padding:2px 6px;border-radius:4px;font-weight:600;">#${i+1}</span>
        </div>
        <div style="font-weight:600;font-size:13px;">${c.hex.toUpperCase()}</div>
        <div style="font-size:11px;color:#888;">rgb(${c.r}, ${c.g}, ${c.b})</div>
        <div style="font-size:11px;color:#666;">hsl(${c.hsl.h}, ${c.hsl.s}%, ${c.hsl.l}%)</div>
        <div style="font-size:10px;color:#f5576c;margin-top:4px;">${c.count} 处使用 ↑</div>`;
      grid.appendChild(card);
    });

    // CSS 变量
    if (CONFIG.showCssVars && colors.length > 0) {
      const cssSec = container.querySelector('#tp-css');
      const cssCode = colors.map((c, i) => `  --color-${i+1}: ${c.hex};`).join('\n');
      cssSec.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <span style="font-weight:600;font-size:13px;">📋 CSS 变量</span>
          <button id="tp-copy-css" style="background:linear-gradient(90deg,#4facfe,#00f2fe);border:none;color:#fff;padding:4px 12px;border-radius:6px;font-size:11px;cursor:pointer;">复制全部</button>
        </div>
        <pre style="background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;margin:0;color:#4facfe;">:root {\n${cssCode}\n}</pre>`;
    }

    // 对比度检测
    if (CONFIG.checkContrast && colors.length >= 2) {
      const conSec = container.querySelector('#tp-contrast');
      const sortedByLightness = [...colors].sort((a, b) => (0.299*b.r+0.587*b.g+0.114*b.b) - (0.299*a.r+0.587*a.g+0.114*a.b));
      const lightest = sortedByLightness[0], darkest = sortedByLightness[sortedByLightness.length - 1];
      const ratio = getContrastRatio(lightest, darkest);
      conSec.innerHTML = `
        <div style="font-weight:600;font-size:13px;margin-bottom:8px;">⚠️ WCAG 对比度检测</div>
        <div style="background:rgba(255,255,255,0.05);border-radius:10px;padding:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:28px;height:28px;border-radius:6px;background:${lightest.hex};"></div>
            <span style="color:#888;">vs</span>
            <div style="width:28px;height:28px;border-radius:6px;background:${darkest.hex};"></div>
            <span style="font-weight:700;color:#f5576c;margin-left:auto;">${ratio.toFixed(2)}:1</span>
          </div>
          <div style="display:flex;gap:12px;font-size:11px;">
            <span>${ratio>=4.5?'✅ AA':'❌ 不通过'}</span>
            <span>${ratio>=3?'✅ AA大字':'❌'}</span>
            <span>${ratio>=7?'✅ AAA':'❌'}</span>
          </div>
        </div>`;
    }

    document.body.appendChild(container);

    // 绑定事件
    container.querySelector('#tp-close').onclick = () => container.remove();
    container.querySelector('#tp-close-btn').onclick = () => container.remove();
    
    const copyBtn = container.querySelector('#tp-copy-css');
    if (copyBtn) copyBtn.onclick = () => {
      navigator.clipboard.writeText(':root {\n' + colors.map((c,i)=>`  --color-${i+1}: ${c.hex};`).join('\n') + '\n}');
      copyBtn.textContent = '已复制 ✓'; setTimeout(() => copyBtn.textContent='复制全部', 2000);
    };

    container.querySelector('#tp-export').onclick = () => {
      const data = { url: location.href, extractedAt: new Date().toISOString(), totalColors: colors.length,
        colors: colors.map(c => ({ hex: c.hex, rgb: [c.r,c.g,c.b], hsl: [c.hsl.h,c.hsl.s,c.hsl.l], usageCount: c.count })) };
      const blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`palette-${Date.now()}.json`; a.click();
    };

    return container;
  }

  // ============ 主逻辑 ============
  
  const existing = document.getElementById('tabbit-color-palette');
  if (existing) existing.remove();

  const colors = extractColorsFromPage();

  if (colors.length === 0) {
    return { ok: false, summary: '未能从页面中提取到有效颜色', data: {}, warnings: ['页面可能没有明显的颜色样式'] };
  }

  renderPalette(colors);

  return {
    ok: true,
    summary: `成功提取 ${colors.length} 种页面颜色，已渲染色板面板`,
    changed_count: 1,
    data: { totalColors: colors.length, totalUsage: colors.reduce((s,c)=>s+c.count,0),
      topColors: colors.slice(0,5).map(c=>({hex:c.hex,count:c.count})) },
    warnings: []
  };
}