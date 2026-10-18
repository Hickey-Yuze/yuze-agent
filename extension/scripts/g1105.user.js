(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      'use strict';
    
      // ═══════════════════════════════════════════════════════════
      // 🎨 网页美化大师 - Web Beautify Master v2
      // 📌 主题 | 字体 | 布局 | 护眼 | 一键美化所有网页
      // ═══════════════════════════════════════════════════════════
    
      const CONFIG = {
        position: { top: '20px', right: '20px' },
        panelWidth: 320,
        animationDuration: 300
      };
    
      // ─── 20+ 精美主题库 ───
      const THEMES = {
        dark:           { name: '🌙 暗黑模式',     bg: '#0d1117', surface: '#161b22', text: '#e6edf3', accent: '#58a6ff', border: '#30363d' },
        darkBlue:       { name: '🌊 暗夜蓝调',     bg: '#0f172a', surface: '#1e293b', text: '#e2e8f0', accent: '#38bdf8', border: '#334155' },
        eyeCare:        { name: '🍃 护眼绿',       bg: '#c7edcc', surface: '#d4edd8', text: '#2d5a3d', accent: '#4caf50', border: '#a8d5a2' },
        eyeCareWarm:    { name: '🌅 护眼暖色',     bg: '#fce4ec', surface: '#f8bbd9', text: '#4a3728', accent: '#ec407a', border: '#f48fb1' },
        sepia:          { name: '📜 复古羊皮纸',   bg: '#f4ecd8', surface: '#faf3e0', text: '#5b4636', accent: '#b8860b', border: '#dcc89e' },
        minimal:        { name: '⬜ 极简白',       bg: '#ffffff', surface: '#f8f9fa', text: '#212529', accent: '#007bff', border: '#dee2e6' },
        minimalDark:    { name: '⬛ 极简暗灰',     bg: '#212529', surface: '#343a40', text: '#f8f9fa', accent: '#6c757d', border: '#495057' },
        vintage:        { name: '🎞️ 怀旧复古',     bg: '#f5f5dc', surface: '#ffffe0', text: '#3e3529', accent: '#cc8800', border: '#daa520' },
        cyberpunk:      { name: '🤖 赛博朋克',     bg: '#0a0a0f', surface: '#1a1a2e', text: '#00ff88', accent: '#ff00ff', border: '#16213e' },
        nord:           { name: '❄️ Nord 冷色',    bg: '#2e3440', surface: '#3b4252', text: '#eceff4', accent: '#88c0d0', border: '#4c566a' },
        dracula:        { name: '🧛 Dracula',      bg: '#282a36', surface: '#44475a', text: '#f8f8f2', accent: '#bd93f9', border: '#6272a4' },
        solarizedDark:  { name: '☀️ Solarized Dark',bg: '#002b36', surface: '#073642', text: '#839496', accent: '#268bd2', border: '#586e75' },
        gruvboxDark:    { name: '📦 Gruvbox Dark', bg: '#282828', surface: '#3c3836', text: '#ebdbb2', accent: '#fe8019', border: '#504945' },
        rosePine:       { name: '🌹 Rosé Pine',    bg: '#191724', surface: '#1f1d2e', text: '#e0def4', accent: '#ebbcba', border: '#26233a' },
        catppuccin:     { name: '🐱 Catppuccin',  bg: '#1e1e2e', surface: '#313244', text: '#cdd6f4', accent: '#cba6f7', border: '#45475a' },
        tokyoNight:     { name: '🏙️ Tokyo Night',  bg: '#1a1b26', surface: '#24283b', text: '#a9b1d6', accent: '#7aa2f7', border: '#292e42' },
        ocean:          { name: '🐋 深海幽蓝',     bg: '#0c1821', surface: '#1b2838', text: '#bdcdd4', accent: '#41b5c6', border: '#245163' },
        forest:         { name: '🌲 森林秘境',     bg: '#1a2e1a', surface: '#2d472d', text: '#d4e5d4', accent: '#7cb77c', border: '#3d5c3d' },
        lavender:       { name: '💜 薰衣紫',       bg: '#2d2d44', surface: '#3d3d5c', text: '#e0d8f0', accent: '#a78bfa', border: '#4d4d6c' },
        coffee:         { name: '☕ 摩卡咖啡',     bg: '#3e2723', surface: '#4e342e', text: '#efebe9', accent: '#a1887f', border: '#5d4037' }
      };
    
      const themeKeys = Object.keys(THEMES);
      let currentThemeKey = null;
      let isEyeCareMode = false;
      let isCleanMode = false;
    
      // ─── 工具函数 ───
      function $(selector, ctx = document) { return ctx.querySelector(selector); }
      function $$(selector, ctx = document) { return [...ctx.querySelectorAll(selector)]; }
    
      function createEl(tag, attrs = {}, children = '') {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'style') Object.assign(el.style, v);
          else if (k === 'className') el.className = v;
          else if (k.startsWith('on')) el[k] = v;
          else el.setAttribute(k, v);
        });
        if (children) el.innerHTML = children;
        return el;
      }
    
      function showNotification(message, duration = 2500) {
        removeExisting('.beautify-notification');
        const notif = createEl('div', {
          className: 'beautify-notification',
          style: {
            position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff', padding: '12px 28px', borderRadius: '25px',
            fontSize: '14px', fontWeight: '500', zIndex: '2147483647',
            boxShadow: '0 4px 20px rgba(102,126,234,0.4)',
            transition: 'all 0.3s ease', opacity: '0'
          }
        }, message);
        document.body.appendChild(notif);
        requestAnimationFrame(() => {
          notif.style.opacity = '1';
        });
        setTimeout(() => {
          notif.style.opacity = '0';
          setTimeout(() => notif.remove(), 300);
        }, duration);
      }
    
      function removeExisting(selector) {
        $$(selector).forEach(el => el.remove());
      }
    
      // ─── CSS 样式注入（面板 UI） ───
      function injectGlobalCSS() {
        if ($('#beautify-master-css')) return;
        const css = createEl('style', { id: 'beautify-master-css' });
        css.textContent = `
          #beautify-master-panel * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
          #beautify-master-panel { font-size: 13px !important; line-height: 1.5 !important; color: inherit !important; }
          .bm-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 12px 12px 0 0; }
          .bm-header h3 { font-size: 15px; font-weight: 600; letter-spacing: 0.5px; }
          .bm-close-btn { width: 24px; height: 24px; border-radius: 50%; background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background 0.2s; }
          .bm-close-btn:hover { background: rgba(255,255,255,0.35); }
          .bm-body { padding: 14px 16px; max-height: 70vh; overflow-y: auto; }
          .bm-section { margin-bottom: 16px; }
          .bm-section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; font-weight: 600; }
          .bm-theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
          .bm-theme-item { padding: 8px 6px; border-radius: 8px; text-align: center; cursor: pointer; transition: all 0.2s ease; border: 2px solid transparent; font-size: 11px; min-height: 48px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; }
          .bm-theme-item:hover { transform: scale(1.05); box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
          .bm-theme-item.active { border-color: var(--bm-accent, #667eea); box-shadow: 0 0 0 2px rgba(102,126,234,0.3); }
          .bm-theme-preview { width: 24px; height: 16px; border-radius: 3px; border: 1px solid rgba(0,0,0,0.1); }
          .bm-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .bm-row label { min-width: 60px; font-size: 12px; color: #555; flex-shrink: 0; }
          .bm-row input[type="range"] { flex: 1; accent-color: #667eea; height: 4px; }
          .bm-row input[type="color"] { width: 36px; height: 28px; border: none; border-radius: 6px; cursor: pointer; background: none; }
          .bm-row select { flex: 1; padding: 6px 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; background: white; }
          .bm-row .bm-value { min-width: 36px; text-align: right; font-size: 12px; color: #888; font-variant-numeric: tabular-nums; }
          .bm-btn { width: 100%; padding: 10px; border: none; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px; }
          .bm-btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
          .bm-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.35); }
          .bm-btn-success { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #0a5d40; }
          .bm-btn-warning { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; }
          .bm-btn-outline { background: transparent; border: 1.5px solid #ddd; color: #555; }
          .bm-btn-outline:hover { border-color: #667eea; color: #667eea; }
          .bm-toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
          .bm-toggle-row:last-child { border-bottom: none; }
          .bm-switch { position: relative; width: 44px; height: 24px; }
          .bm-switch input { opacity: 0; width: 0; height: 0; }
          .bm-slider { position: absolute; cursor: pointer; inset: 0; background: #ccc; border-radius: 24px; transition: 0.3s; }
          .bm-slider:before { content: ""; position: absolute; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
          .bm-switch input:checked + .bm-slider { background: linear-gradient(135deg, #667eea, #764ba2); }
          .bm-switch input:checked + .bm-slider:before { transform: translateX(20px); }
          .bm-fab { position: fixed; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; cursor: pointer; z-index: 2147483646; display: flex; align-items: center; justify-content: center; font-size: 22px; box-shadow: 0 4px 20px rgba(102,126,234,0.4); transition: all 0.3s ease; }
          .bm-fab:hover { transform: scale(1.1) rotate(90deg); box-shadow: 0 6px 25px rgba(102,126,234,0.5); }
          .bm-textarea { width: 100%; min-height: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 12px; font-family: "Monaco", "Menlo", monospace; resize: vertical; background: #fafafa; }
          .bm-textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102,126,234,0.1); }
          .bm-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .bm-stat-card { background: #f8f9fa; padding: 10px; border-radius: 8px; text-align: center; }
          .bm-stat-value { font-size: 20px; font-weight: 700; color: #667eea; }
          .bm-stat-label { font-size: 10px; color: #888; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
          @keyframes bmSlideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }
          .bm-panel-enter { animation: bmSlideIn 0.3s ease forwards; }
          #beautify-master-panel ::-webkit-scrollbar { width: 5px; }
          #beautify-master-panel ::-webkit-scrollbar-track { background: transparent; }
          #beautify-master-panel ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }
    
          /* 净化专用类 - 通过 Style 标签控制，不修改元素内联样式 */
          .bm-clean-hidden { display: none !important; }
          .bm-clean-layout { max-width: 800px !important; margin: 0 auto !important; padding: 20px 30px !important; line-height: 1.85 !important; }
        `;
        document.head.appendChild(css);
      }
    
      // ─── 应用主题（Style 标签注入，可逆） ───
      function applyTheme(themeKey) {
        const theme = THEMES[themeKey];
        if (!theme) return;
        currentThemeKey = themeKey;
        removeExisting('#beautify-applied-theme');
    
        const styleEl = createEl('style', { id: 'beautify-applied-theme' });
        document.documentElement.style.setProperty('--bm-accent', theme.accent);
    
        styleEl.textContent = `
          html { background: ${theme.bg} !important; }
          body { background-color: ${theme.bg} !important; color: ${theme.text} !important; transition: background-color 0.4s ease, color 0.4s ease !important; }
          p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, input, textarea, select,
          blockquote, pre, code, dt, dd, figcaption, caption, summary, details { color: ${theme.text} !important; }
          a { color: ${theme.accent} !important; } a:hover { filter: brightness(1.2) !important; }
          div, section, article, aside, header, footer, nav, main, figure, fieldset,
          form, dialog, [role="navigation"], [role="main"], [role="contentinfo"],
          [role="complementary"], [role="article"], [role="region"] { background-color: ${theme.surface} !important; border-color: ${theme.border} !important; }
          pre, code, kbd, samp { background-color: ${theme.bg} !important; border: 1px solid ${theme.border} !important; }
          table { border-color: ${theme.border} !important; }
          table thead th { background-color: ${theme.bg} !important; color: ${theme.accent} !important; }
          table tr:nth-child(even) { background-color: ${theme.surface} !important; }
          input, textarea, select { background-color: ${theme.surface} !important; color: ${theme.text} !important; border-color: ${theme.border} !important; }
          button, [role="button"], .btn, [type="button"], [type="submit"], [type="reset"] { background-color: ${theme.accent} !important; color: ${theme.bg} !important; }
          hr { border-color: ${theme.border} !important; }
          ::selection { background-color: ${theme.accent} !important; color: ${theme.bg} !important; }
          ::-webkit-scrollbar-track { background: ${theme.bg} !important; }
          ::-webkit-scrollbar-thumb { background: ${theme.border} !important; }
          ::-webkit-scrollbar-corner { background: ${theme.bg} !important; }
        `;
        document.head.appendChild(styleEl);
        showNotification(`✨ 已应用 ${theme.name}`);
        savePrefs();
      }
    
      // ─── 移除主题（删除 Style 标签即可，100% 还原） ───
      function removeTheme() {
        currentThemeKey = null;
        removeExisting('#beautify-applied-theme');
        document.documentElement.style.removeProperty('--bm-accent');
        showNotification('🔄 已恢复原始样式');
        savePrefs();
      }
    
      // ─── 护眼模式（Style 标签注入，可逆） ───
      function toggleEyeCare() {
        isEyeCareMode = !isEyeCareMode;
        removeExisting('#beautify-eye-care');
        if (isEyeCareMode) {
          const ec = createEl('style', { id: 'beautify-eye-care' });
          ec.textContent = `body { filter: brightness(0.92) sepia(0.08) !important; transition: filter 0.4s ease !important; }`;
          document.head.appendChild(ec);
          showNotification('👁️ 护眼模式已开启');
        } else {
          showNotification('👁️ 护眼模式已关闭');
        }
        savePrefs();
      }
    
      // ═══════════════════════════════════════════════════════════
      // 🔧 页面净化 —— 全新方案：CSS类名 + Style标签注入
      // 核心：不修改任何元素的 inline style！
      //   隐藏 → 添加 .bm-clean-hidden 类（由全局 CSS 规则控制 display:none）
      //   布局 → 添加 .bm-clean-layout 类（由全局 CSS 规则控制布局）
      //   还原 → 删除所有添加的类即可，100% 可靠还原！
      // ═══════════════════════════════════════════════════════════
      function cleanPage() {
        if (isCleanMode) {
          // ═══ 还原：移除所有添加的类名，不碰 inline style ═══
    
          // 1. 移除所有隐藏标记
          $$('.bm-clean-hidden').forEach(el => {
            el.classList.remove('bm-clean-hidden');
          });
    
          // 2. 移除所有布局优化标记
          $$('.bm-clean-layout').forEach(el => {
            el.classList.remove('bm-clean-layout');
          });
    
          isCleanMode = false;
          showNotification('🧹 已完全还原页面（所有净化效果已清除）');
          savePrefs();
    
          // 更新面板统计显示
          updateStatsDisplay();
          return;
        }
    
        // ═══ 执行净化：只添加类名，不修改 inline style ═══
    
        const HIDE_SELECTORS = [
          '[class*="ad-"]', '[class*="_ad"]', '[id*="ad-"]', '[id*="_ad"]',
          '[class*="advert"]', '[id*="advert"]',
          '[class*="banner-ad"]', '[id*="banner-ad"]',
          '[class*="google-ad"]', '[id*="google-ad"]',
          '[class*="sponsor"]', '[id*="sponsor"]',
          '[class*="popup"]', '[id*="popup"]',
          '[class*="floating"]', '[class*="float-banner"]',
          '[class*="sidebar"]', 'aside.sidebar',
          '[class*="recommend"]', '[class*="related-posts"]',
          '[class*="comment-list"]', '[id*="comments"]',
          '[class*="social-share"]', '[class*="share-bar"]',
          '[class*="newsletter"]', '[class*="subscribe-box"]',
          '[class*="cookie-notice"]', '[class*="cookie-banner"]',
          '[class*="notification-bar"]', '[class*="promo"]',
          'iframe[src*="ads"]', 'iframe[src*="doubleclick"]',
          'div[class][style*="position: fixed"][style*="bottom"]'
        ];
    
        let hiddenCount = 0;
    
        // 给匹配到的干扰元素添加隐藏类（不修改 inline style）
        HIDE_SELECTORS.forEach(sel => {
          try {
            $$(sel).forEach(el => {
              // 排除美化大师自己的面板和按钮
              if (el.closest?.('#beautify-master-panel') || el.closest?.('#beautify-master-fab')) return;
              if (el.id && el.id.startsWith('beautify-')) return;
              if (el.offsetHeight > 0 || el.offsetWidth > 0) {
                el.classList.add('bm-clean-hidden');
                hiddenCount++;
              }
            });
          } catch(e) {}
        });
    
        // 给内容区元素添加布局优化类（不修改 inline style）
        const LAYOUT_SELECTORS = [
          'article', '.article', '.content', '.post', '.post-content',
          'main', '[role="main"]', '.entry-content', '.article-content'
        ];
        let layoutCount = 0;
    
        LAYOUT_SELECTORS.forEach(sel => {
          try {
            $$(sel).forEach(el => {
              if (el.closest?.('#beautify-master-panel')) return;
              el.classList.add('bm-clean-layout');
              layoutCount++;
            });
          } catch(e) {}
        });
    
        isCleanMode = true;
        showNotification(`🧹 已净化：隐藏 ${hiddenCount} 个干扰 + 优化 ${layoutCount} 个内容区`);
        savePrefs();
    
        // 更新面板统计显示
        updateStatsDisplay();
      }
    
      // ─── 更新面板中的统计数字 ───
      function updateStatsDisplay() {
        const hiddenStat = $('#bm-stat-hidden');
        if (hiddenStat) hiddenStat.textContent = String($$('.bm-clean-hidden').length);
      }
    
      // ─── 创建主面板 ───
      function createPanel() {
        removeExisting('#beautify-master-panel');
    
        const panel = createEl('div', {
          id: 'beautify-master-panel',
          className: 'bm-panel-enter',
          style: {
            position: 'fixed', top: CONFIG.position.top, right: CONFIG.position.right,
            width: CONFIG.panelWidth + 'px',
            background: '#fff', borderRadius: '14px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
            zIndex: '2147483646', fontFamily: '-apple-system, sans-serif',
            overflow: 'hidden', direction: 'ltr'
          }
        });
    
        // Header
        const header = createEl('div', { className: 'bm-header' }, `
          <h3>🎨 网页美化大师</h3>
          <button class="bm-close-btn" id="bm-close">✕</button>
        `);
    
        // Body
        const body = createEl('div', { className: 'bm-body' });
    
        // ── 主题选择区 ──
        const themeSection = createSection('🎨 主题切换');
        const themeGrid = createEl('div', { className: 'bm-theme-grid' });
        themeKeys.forEach(key => {
          const t = THEMES[key];
          const item = createEl('div', {
            className: 'bm-theme-item' + (currentThemeKey === key ? ' active' : ''),
            'data-theme': key,
            style: { background: t.surface + '22', color: t.text }
          }, `<div class="bm-theme-preview" style="background:${t.bg};border-color:${t.border}"></div>${t.name.split(' ').slice(1).join(' ')}`);
          item.onclick = () => applyTheme(key);
          themeGrid.appendChild(item);
        });
        themeSection.appendChild(themeGrid);
        body.appendChild(themeSection);
    
        // ── 字体设置区 ──
        const fontSection = createSection('📝 字体设置');
        fontSection.appendChild(createSliderRow('字号', 'bm-font-size', 12, 26, 16, 'px'));
        fontSection.appendChild(createSliderRow('行距', 'bm-line-height', 1.2, 2.8, 1.65, '', 0.05));
        fontSection.appendChild(createSliderRow('字间距', 'bm-letter-spacing', -1, 4, 0, 'px', 0.5));
        fontSection.appendChild(createFontFamilyRow());
        body.appendChild(fontSection);
    
        // ── 功能开关区 ──
        const toggleSection = createSection('⚡ 快捷功能');
        toggleSection.appendChild(createToggleRow('👁️ 护眼模式', isEyeCareMode, toggleEyeCare));
        toggleSection.appendChild(createToggleRow('🧹 净化页面', isCleanMode, cleanPage));
        body.appendChild(toggleSection);
    
        // ── 自定义样式区 ──
        const cssSection = createSection('🎨 自定义 CSS');
        const ta = createEl('textarea', {
          className: 'bm-textarea',
          id: 'bm-custom-css',
          placeholder: '输入自定义 CSS，例如：\nbody { font-family: "楷体" !important; }\nh1 { text-shadow: 1px 1px 2px #ccc; }'
        });
        cssSection.appendChild(ta);
        cssSection.appendChild(createEl('button', {
          className: 'bm-btn bm-btn-primary',
          style: { marginTop: '10px' },
          onclick: () => applyCustomCSS(ta.value)
        }, '✨ 应用自定义样式'));
        body.appendChild(cssSection);
    
        // ── 操作按钮区 ──
        const actionSection = createSection('🔧 操作');
        actionSection.appendChild(createEl('button', {
          className: 'bm-btn bm-btn-outline',
          onclick: resetAllSettings
        }, '🔄 重置全部设置'));
        actionSection.appendChild(createEl('button', {
          className: 'bm-btn bm-btn-warning',
          style: { marginTop: '8px' },
          onclick: exportConfig
        }, '📋 导出配置'));
        body.appendChild(actionSection);
    
        // ── 统计信息区 ──
        const statsSection = createSection('📊 当前状态');
        const statsGrid = createEl('div', { className: 'bm-stats' });
        statsGrid.appendChild(createStatCard('当前主题', currentThemeKey ? THEMES[currentThemeKey].name.split(' ')[1] : '默认'));
        statsGrid.appendChild(createStatCard('隐藏元素', String($$('.bm-clean-hidden').length), 'bm-stat-hidden'));
        statsSection.appendChild(statsGrid);
        body.appendChild(statsSection);
    
        // Assemble
        panel.appendChild(header);
        panel.appendChild(body);
    
        // Close handler
        $('#bm-close', panel).onclick = () => {
          panel.style.animation = 'none';
          panel.style.opacity = '0';
          panel.style.transform = 'translateX(20px)';
          setTimeout(() => panel.remove(), 200);
        };
    
        document.body.appendChild(panel);
        return panel;
      }
    
      function createSection(title) {
        return createEl('div', { className: 'bm-section' },
          `<div class="bm-section-title">${title}</div>`
        );
      }
    
      function createSliderRow(label, id, min, max, defaultVal, unit = '', step = 1) {
        const row = createEl('div', { className: 'bm-row' });
        row.innerHTML = `<label>${label}</label>
          <input type="range" id="${id}" min="${min}" max="${max}" value="${defaultVal}" step="${step}">
          <span class="bm-value" id="${id}-val">${defaultVal}${unit}</span>`;
        $('input', row).oninput = function() {
          $('#' + id + '-val').textContent = this.value + unit;
          applyFontSettings();
        };
        return row;
      }
    
      function createFontFamilyRow() {
        const fonts = [
          { val: '', label: '默认字体' },
          { val: '"Songti SC", "SimSun", serif', label: '宋体' },
          { val: '"Kaiti SC", "KaiTi", serif', label: '楷体' },
          { val: '"Heiti SC", "SimHei", sans-serif', label: '黑体' },
          { val: '"Microsoft YaHei", sans-serif', label: '微软雅黑' },
          { val: '"PingFang SC", sans-serif', label: '苹方' },
          { val: 'system-ui, sans-serif', label: '系统字体' },
          { val: 'Georgia, serif', label: 'Georgia' },
          { val: '"Courier New", monospace', label: '等宽' }
        ];
        const row = createEl('div', { className: 'bm-row' });
        row.innerHTML = `<label>字体</label><select id="bm-font-family">${fonts.map(f => `<option value="${f.val}">${f.label}</option>`).join('')}</select>`;
        $('select', row).onchange = applyFontSettings;
        return row;
      }
    
      function createToggleRow(label, checked, onchange) {
        const row = createEl('div', { className: 'bm-toggle-row' });
        row.innerHTML = `<span>${label}</span><label class="bm-switch"><input type="checkbox" ${checked ? 'checked' : ''}><span class="bm-slider"></span></label>`;
        $('input', row).onchange = onchange;
        return row;
      }
    
      function createStatCard(label, value, id) {
        return createEl('div', { className: 'bm-stat-card' },
          `<div class="bm-stat-value"${id ? ` id="${id}"` : ''}>${value}</div><div class="bm-stat-label">${label}</div>`
        );
      }
    
      // ─── 字体设置应用（Style 标签注入，可逆） ───
      function applyFontSettings() {
        removeExisting('#beautify-font-settings');
        const fs = $('#bm-font-size')?.value || 16;
        const lh = $('#bm-line-height')?.value || 1.65;
        const ls = $('#bm-letter-spacing')?.value || 0;
        const ff = $('#bm-font-family')?.value || '';
    
        const styleEl = createEl('style', { id: 'beautify-font-settings' });
        styleEl.textContent = `
          body {
            font-size: ${fs}px !important;
            line-height: ${lh} !important;
            letter-spacing: ${ls}px !important;
            ${ff ? `font-family: ${ff} !important;` : ''}
          }
        `;
        document.head.appendChild(styleEl);
      }
    
      // ─── 自定义 CSS（Style 标签注入，可逆） ───
      function applyCustomCSS(cssText) {
        if (!cssText.trim()) {
          showNotification('⚠️ 请输入 CSS 内容');
          return;
        }
        removeExisting('#beautify-custom-css');
        const customStyleEl = createEl('style', { id: 'beautify-custom-css' });
        customStyleEl.textContent = cssText;
        document.head.appendChild(customStyleEl);
        showNotification('✅ 自定义样式已应用');
      }
    
      // ─── 重置设置（全部通过删除 Style 标签实现 100% 还原） ───
      function resetAllSettings() {
        // 删除主题 Style 标签
        removeExisting('#beautify-applied-theme');
        currentThemeKey = null;
        document.documentElement.style.removeProperty('--bm-accent');
    
        // 关闭护眼模式（删除 Style 标签）
        if (isEyeCareMode) {
          removeExisting('#beautify-eye-care');
          isEyeCareMode = false;
        }
    
        // 还原净化效果（移除类名）
        if (isCleanMode) {
          $$('.bm-clean-hidden').forEach(el => el.classList.remove('bm-clean-hidden'));
          $$('.bm-clean-layout').forEach(el => el.classList.remove('bm-clean-layout'));
          isCleanMode = false;
        }
    
        // 删除字体设置 Style 标签
        removeExisting('#beautify-font-settings');
    
        // 删除自定义 CSS Style 标签
        removeExisting('#beautify-custom-css');
    
        // 清除 localStorage
        try { localStorage.removeItem('beautify-master-prefs'); } catch(e) {}
    
        showNotification('🔄 已重置所有设置（页面已完全还原）');
    
        // 刷新面板以反映最新状态
        createPanel();
      }
    
      // ─── 导出配置 ───
      function exportConfig() {
        const config = {
          theme: currentThemeKey,
          eyeCare: isEyeCareMode,
          clean: isCleanMode,
          fontSize: $('#bm-font-size')?.value || 16,
          lineHeight: $('#bm-line-height')?.value || 1.65,
          letterSpacing: $('#bm-letter-spacing')?.value || 0,
          fontFamily: $('#bm-font-family')?.value || ''
        };
        navigator.clipboard.writeText(JSON.stringify(config, null, 2)).then(() => {
          showNotification('📋 配置已复制到剪贴板');
        }).catch(() => {
          showNotification('⚠️ 复制失败，请手动保存配置');
        });
      }
    
      // ─── 持久化 ───
      function savePrefs() {
        const prefs = {
          theme: currentThemeKey,
          eyeCare: isEyeCareMode,
          clean: isCleanMode
        };
        try {
          localStorage.setItem('beautify-master-prefs', JSON.stringify(prefs));
        } catch(e) {}
      }
    
      function loadPrefs() {
        try {
          const raw = localStorage.getItem('beautify-master-prefs');
          if (!raw) return;
          const prefs = JSON.parse(raw);
          if (prefs.theme && THEMES[prefs.theme]) applyTheme(prefs.theme);
          if (prefs.eyeCare && !isEyeCareMode) toggleEyeCare();
          // 注意：clean mode 不自动加载，需要用户手动触发
        } catch(e) {}
      }
    
      // ─── 创建悬浮按钮 ───
      function createFab() {
        removeExisting('#beautify-master-fab');
        const fab = createEl('button', {
          id: 'beautify-master-fab',
          className: 'bm-fab',
          style: { bottom: '30px', right: '30px' },
          title: '网页美化大师'
        }, '🎨');
        fab.onclick = () => createPanel();
        document.body.appendChild(fab);
      }
    
      // ═══════════════════════════════════════════════════════════
      // 初始化
      // ═══════════════════════════════════════════════════════════
      injectGlobalCSS();
      createFab();
    
      // 自动加载已保存的偏好
      if (args?.autoLoad !== false) {
        loadPrefs();
      }
    
      return {
        ok: true,
        summary: '🎨 网页美化大师 v2 已启动！点击右下角悬浮按钮打开控制面板。',
        features: {
          themes: `${themeKeys.length} 个精美主题`,
          settings: '字体/行距/字间距/字体族',
          functions: '护眼模式 / 页面净化（CSS类名方案，100%可还原）/ 自定义CSS',
          persistence: '自动保存偏好到 localStorage',
          architecture: '全新架构：所有效果均通过 Style 标签注入 + CSS 类名实现，删除即还原'
        },
        themeCount: themeKeys.length,
        currentTheme: currentThemeKey || '未设置',
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();