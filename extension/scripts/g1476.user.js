(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * CS2 战队人员数据分析脚本
     * 功能：输入战队名称和成员名称，输出各成员的数据水平可视化图表
     * 包含雷达图（六维能力）和柱状图对比
     */
    
    async function run(args) {
      // ============ 配置与样式 ============
      const COLORS = {
        primary: '#ff6b35',
        secondary: '#00d4aa',
        accent: '#6c5ce7',
        bg: 'rgba(15, 15, 25, 0.95)',
        cardBg: 'rgba(30, 30, 50, 0.9)',
        border: 'rgba(255, 255, 255, 0.1)',
        text: '#e8e8f0',
        textMuted: '#8888a0',
        gridLine: 'rgba(255, 255, 255, 0.08)',
        playerColors: [
          '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4',
          '#ffeaa7', '#dfe6e9', '#fd79a8', '#a29bfe',
          '#74b9ff', '#55efc4', '#fab1a0', '#81ecec'
        ]
      };
    
      // ============ CS2职业选手数据库（含战队信息，用于自动提示）============
      // 格式: name -> { stats..., team: '战队名' }
      // 实际使用时可替换为API数据源
      const SAMPLE_PLAYER_DB = {
        // === Team Spirit ===
        'donk':      { rating: 1.33, kd: 1.41, hsPct: 55.8, entrySuccess: 0.65, clutchWin: 0.60, utilDamage: 0.50, impact: 1.45, team: 'Team Spirit' },
        'sh1ro':     { rating: 1.26, kd: 1.35, hsPct: 53.5, entrySuccess: 0.48, clutchWin: 0.50, utilDamage: 0.38, impact: 1.22, team: 'Team Spirit' },
        'ax1le':     { rating: 1.18, kd: 1.22, hsPct: 50.1, entrySuccess: 0.52, clutchWin: 0.51, utilDamage: 0.44, impact: 1.18, team: 'Team Spirit' },
        'magix':     { rating: 1.08, kd: 1.10, hsPct: 46.5, entrySuccess: 0.45, clutchWin: 0.40, utilDamage: 0.35, impact: 1.05, team: 'Team Spirit' },
        'chopper':   { rating: 1.06, kd: 1.08, hsPct: 45.8, entrySuccess: 0.43, clutchWin: 0.38, utilDamage: 0.34, impact: 1.02, team: 'Team Spirit' },
        // === NAVI ===
        's1mple':    { rating: 1.29, kd: 1.34, hsPct: 54.3, entrySuccess: 0.62, clutchWin: 0.58, utilDamage: 0.48, impact: 1.38, team: 'NAVI' },
        'b1t':       { rating: 1.16, kd: 1.19, hsPct: 49.3, entrySuccess: 0.53, clutchWin: 0.48, utilDamage: 0.42, impact: 1.15, team: 'NAVI' },
        'jL':        { rating: 1.12, kd: 1.15, hsPct: 47.5, entrySuccess: 0.56, clutchWin: 0.45, utilDamage: 0.44, impact: 1.12, team: 'NAVI' },
        'iM':        { rating: 1.10, kd: 1.13, hsPct: 46.8, entrySuccess: 0.50, clutchWin: 0.43, utilDamage: 0.40, impact: 1.09, team: 'NAVI' },
        'Aleksib':   { rating: 1.04, kd: 1.02, hsPct: 44.2, entrySuccess: 0.42, clutchWin: 0.36, utilDamage: 0.32, impact: 0.98, team: 'NAVI' },
        'Mpl':       { rating: 1.07, kd: 1.09, hsPct: 46.0, entrySuccess: 0.47, clutchWin: 0.41, utilDamage: 0.36, impact: 1.05, team: 'NAVI' },
        // === Vitality ===
        'ZywOo':     { rating: 1.27, kd: 1.31, hsPct: 52.8, entrySuccess: 0.58, clutchWin: 0.55, utilDamage: 0.45, impact: 1.32, team: 'Vitality' },
        'Spinx':     { rating: 1.14, kd: 1.17, hsPct: 48.6, entrySuccess: 0.54, clutchWin: 0.47, utilDamage: 0.43, impact: 1.14, team: 'Vitality' },
        'apEX':      { rating: 0.98, kd: 0.96, hsPct: 42.5, entrySuccess: 0.40, clutchWin: 0.34, utilDamage: 0.30, impact: 0.92, team: 'Vitality' },
        'flameZ':    { rating: 1.06, kd: 1.08, hsPct: 46.2, entrySuccess: 0.48, clutchWin: 0.40, utilDamage: 0.36, impact: 1.03, team: 'Vitality' },
        'Mezii':     { rating: 1.07, kd: 1.10, hsPct: 47.0, entrySuccess: 0.49, clutchWin: 0.42, utilDamage: 0.38, impact: 1.06, team: 'Vitality' },
        // === FaZe ===
        'ropz':      { rating: 1.17, kd: 1.20, hsPct: 48.9, entrySuccess: 0.54, clutchWin: 0.47, utilDamage: 0.43, impact: 1.15, team: 'FaZe' },
        'broky':     { rating: 1.13, kd: 1.16, hsPct: 48.5, entrySuccess: 0.50, clutchWin: 0.44, utilDamage: 0.39, impact: 1.12, team: 'FaZe' },
        'rain':      { rating: 1.12, kd: 1.14, hsPct: 47.9, entrySuccess: 0.51, clutchWin: 0.43, utilDamage: 0.40, impact: 1.10, team: 'FaZe' },
        'frozen':    { rating: 1.16, kd: 1.18, hsPct: 49.2, entrySuccess: 0.51, clutchWin: 0.46, utilDamage: 0.41, impact: 1.14, team: 'FaZe' },
        'karrigan':  { rating: 0.95, kd: 0.93, hsPct: 41.8, entrySuccess: 0.38, clutchWin: 0.32, utilDamage: 0.28, impact: 0.88, team: 'FaZe' },
        // === G2 ===
        'NiKo':      { rating: 1.24, kd: 1.28, hsPct: 51.2, entrySuccess: 0.55, clutchWin: 0.52, utilDamage: 0.42, impact: 1.28, team: 'G2' },
        'huNter-':   { rating: 1.10, kd: 1.13, hsPct: 47.2, entrySuccess: 0.50, clutchWin: 0.44, utilDamage: 0.39, impact: 1.08, team: 'G2' },
        'nexa':      { rating: 1.01, kd: 0.99, hsPct: 43.5, entrySuccess: 0.41, clutchWin: 0.35, utilDamage: 0.31, impact: 0.95, team: 'G2' },
        'malbsMd':   { rating: 1.09, kd: 1.11, hsPct: 46.8, entrySuccess: 0.49, clutchWin: 0.42, utilDamage: 0.37, impact: 1.06, team: 'G2' },
        'Snax':      { rating: 1.00, kd: 0.97, hsPct: 42.8, entrySuccess: 0.39, clutchWin: 0.33, utilDamage: 0.29, impact: 0.92, team: 'G2' },
        // === MOUZ ===
        'Torzsi':    { rating: 1.06, kd: 1.08, hsPct: 45.5, entrySuccess: 0.46, clutchWin: 0.39, utilDamage: 0.35, impact: 1.02, team: 'MOUZ' },
        'Brollan':   { rating: 1.13, kd: 1.16, hsPct: 48.8, entrySuccess: 0.52, clutchWin: 0.45, utilDamage: 0.40, impact: 1.11, team: 'MOUZ' },
        'frozen2':   { rating: 1.11, kd: 1.13, hsPct: 47.4, entrySuccess: 0.50, clutchWin: 0.43, utilDamage: 0.38, impact: 1.08, team: 'MOUZ' },
        'Siuhy':     { rating: 1.04, kd: 1.02, hsPct: 44.0, entrySuccess: 0.43, clutchWin: 0.37, utilDamage: 0.33, impact: 0.99, team: 'MOUZ' },
        'dexter':    { rating: 0.96, kd: 0.94, hsPct: 42.0, entrySuccess: 0.38, clutchWin: 0.32, utilDamage: 0.28, impact: 0.90, team: 'MOUZ' },
        // === Heroic ===
        'cadiaN':    { rating: 1.03, kd: 1.01, hsPct: 43.2, entrySuccess: 0.40, clutchWin: 0.35, utilDamage: 0.30, impact: 0.96, team: 'Heroic' },
        'stavn':     { rating: 1.15, kd: 1.18, hsPct: 49.0, entrySuccess: 0.53, clutchWin: 0.46, utilDamage: 0.41, impact: 1.13, team: 'Heroic' },
        'TeSeS':     { rating: 1.08, kd: 1.10, hsPct: 46.5, entrySuccess: 0.48, clutchWin: 0.41, utilDamage: 0.37, impact: 1.05, team: 'Heroic' },
        'sjuush':    { rating: 1.02, kd: 1.00, hsPct: 43.8, entrySuccess: 0.42, clutchWin: 0.36, utilDamage: 0.32, impact: 0.97, team: 'Heroic' },
        'gizmy':     { rating: 1.09, kd: 1.11, hsPct: 47.0, entrySuccess: 0.49, clutchWin: 0.42, utilDamage: 0.37, impact: 1.06, team: 'Heroic' },
        // === 其他知名选手 ===
        'm0NESY':    { rating: 1.22, kd: 1.25, hsPct: 51.8, entrySuccess: 0.53, clutchWin: 0.54, utilDamage: 0.40, impact: 1.24, team: 'Falcons' },
        'Twistzz':   { rating: 1.15, kd: 1.19, hsPct: 49.5, entrySuccess: 0.56, clutchWin: 0.49, utilDamage: 0.46, impact: 1.16, team: 'Liquid' },
        'YEKINDAR':  { rating: 1.11, kd: 1.14, hsPct: 48.0, entrySuccess: 0.55, clutchWin: 0.44, utilDamage: 0.42, impact: 1.09, team: 'Liquid' },
        'naf':       { rating: 1.08, kd: 1.10, hsPct: 46.5, entrySuccess: 0.50, clutchWin: 0.42, utilDamage: 0.38, impact: 1.05, team: 'Liquid' },
        'EliGE':     { rating: 1.09, kd: 1.12, hsPct: 47.2, entrySuccess: 0.51, clutchWin: 0.43, utilDamage: 0.39, impact: 1.07, team: 'Complexity' },
        'jks':       { rating: 1.07, kd: 1.09, hsPct: 46.0, entrySuccess: 0.48, clutchWin: 0.41, utilDamage: 0.36, impact: 1.04, team: 'G2' },
        'rainwaker': { rating: 1.11, kd: 1.14, hsPct: 47.8, entrySuccess: 0.49, clutchWin: 0.43, utilDamage: 0.37, impact: 1.10, team: 'Aurora' },
        'WoroMakr':  { rating: 1.05, kd: 1.07, hsPct: 45.2, entrySuccess: 0.46, clutchWin: 0.39, utilDamage: 0.34, impact: 1.01, team: 'Aurora' },
        'Biguzera':  { rating: 1.04, kd: 1.03, hsPct: 44.5, entrySuccess: 0.44, clutchWin: 0.37, utilDamage: 0.33, impact: 0.99, team: 'FURIA' },
        'yuurih':    { rating: 1.10, kd: 1.12, hsPct: 47.5, entrySuccess: 0.51, clutchWin: 0.44, utilDamage: 0.39, impact: 1.08, team: 'FURIA' },
        'KSCERATO':  { rating: 1.12, kd: 1.15, hsPct: 48.2, entrySuccess: 0.52, clutchWin: 0.45, utilDamage: 0.40, impact: 1.10, team: 'FURIA' },
        'degster':   { rating: 1.08, kd: 1.10, hsPct: 46.8, entrySuccess: 0.47, clutchWin: 0.41, utilDamage: 0.36, impact: 1.05, team: 'Apeks' },
        'device':    { rating: 1.14, kd: 1.17, hsPct: 49.0, entrySuccess: 0.52, clutchWin: 0.47, utilDamage: 0.41, impact: 1.13, team: 'Astralis' },
        'Staehr':    { rating: 1.06, kd: 1.08, hsPct: 45.8, entrySuccess: 0.47, clutchWin: 0.40, utilDamage: 0.35, impact: 1.02, team: 'Astralis' },
        'jabbi':     { rating: 1.18, kd: 1.21, hsPct: 50.5, entrySuccess: 0.54, clutchWin: 0.49, utilDamage: 0.42, impact: 1.17, team: 'Astralis' },
        'stavn2':    { rating: 1.13, kd: 1.16, hsPct: 48.5, entrySuccess: 0.52, clutchWin: 0.45, utilDamage: 0.40, impact: 1.11, team: 'Astralis' }
      };
    
      // ============ 工具函数 ============
      function clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      }
    
      function lerp(a, b, t) {
        return a + (b - a) * t;
      }
    
      // 归一化到0-100范围
      function normalizeStat(value, minVal, maxVal) {
        return clamp(((value - minVal) / (maxVal - minVal)) * 100, 0, 100);
      }
    
      // 获取或生成选手数据
      function getPlayerData(name) {
        const key = Object.keys(SAMPLE_PLAYER_DB).find(
          k => k.toLowerCase() === name.toLowerCase().trim()
        );
        if (key) return { ...SAMPLE_PLAYER_DB[key], source: 'database' };
        
        // 为未知选手生成模拟数据
        const seed = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const rng = (s) => ((s * 9301 + 49297) % 233280) / 233280;
        const base = 0.95 + rng(seed) * 0.40;
        return {
          rating: clamp(base + (rng(seed + 1) - 0.5) * 0.15, 0.85, 1.45),
          kd: clamp(base + (rng(seed + 2) - 0.5) * 0.20, 0.80, 1.50),
          hsPct: clamp(42 + rng(seed + 3) * 22, 38, 62),
          entrySuccess: clamp(0.40 + rng(seed + 4) * 0.32, 0.35, 0.75),
          clutchWin: clamp(0.35 + rng(seed + 5) * 0.32, 0.30, 0.70),
          utilDamage: clamp(0.32 + rng(seed + 6) * 0.24, 0.28, 0.58),
          impact: clamp(base + (rng(seed + 7) - 0.5) * 0.22, 0.90, 1.50),
          source: 'simulated'
        };
      }
    
      // ============ UI 创建 ============
      let container = null;
      let canvas = null;
      let ctx = null;
    
      function createUI() {
        // 移除已存在的实例
        const existing = document.getElementById('cs2-team-analyzer-root');
        if (existing) existing.remove();
    
        container = document.createElement('div');
        container.id = 'cs2-team-analyzer-root';
        container.innerHTML = `
          <style>
            #cs2-team-analyzer-root {
              all: initial;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              position: fixed;
              top: 0; left: 0; right: 0; bottom: 0;
              z-index: 2147483647;
              display: flex;
              align-items: center;
              justify-content: center;
              background: rgba(0,0,0,0.6);
              backdrop-filter: blur(8px);
            }
            #cs2-analyzer-panel {
              width: min(920px, 94vw);
              max-height: 92vh;
              background: ${COLORS.bg};
              border-radius: 16px;
              border: 1px solid ${COLORS.border};
              box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1);
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }
            .cs2-header {
              padding: 20px 24px 16px;
              border-bottom: 1px solid ${COLORS.border};
              display: flex;
              align-items: center;
              justify-content: space-between;
            }
            .cs2-title {
              color: ${COLORS.text};
              font-size: 18px;
              font-weight: 700;
              letter-spacing: -0.3px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .cs2-title-icon { font-size: 22px; }
            .cs2-close-btn {
              width: 32px; height: 32px;
              border-radius: 8px;
              border: none;
              background: rgba(255,255,255,0.06);
              color: ${COLORS.textMuted};
              cursor: pointer;
              font-size: 18px;
              display: flex; align-items: center; justify-content: center;
              transition: all 0.2s;
            }
            .cs2-close-btn:hover {
              background: rgba(255,80,80,0.2); color: #ff6b6b;
            }
            .cs2-body { padding: 20px 24px; overflow-y: auto; flex: 1; }
            .cs2-input-group { margin-bottom: 16px; }
            .cs2-label {
              display: block;
              color: ${COLORS.textMuted};
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              margin-bottom: 6px;
            }
            .cs2-input {
              width: 100%;
              padding: 10px 14px;
              border-radius: 10px;
              border: 1px solid ${COLORS.border};
              background: rgba(255,255,255,0.04);
              color: ${COLORS.text};
              font-size: 14px;
              outline: none;
              transition: border-color 0.2s;
              box-sizing: border-box;
            }
            .cs2-input:focus { border-color: ${COLORS.primary}; }
            .cs2-input::placeholder { color: rgba(255,255,255,0.2); }
            textarea.cs2-input { resize: vertical; min-height: 72px; font-family: inherit; }
            .cs2-hint {
              color: ${COLORS.textMuted}; font-size: 12px; margin-top: 4px; opacity: 0.7;
            }
            .cs2-actions {
              display: flex; gap: 10px; margin-top: 18px;
            }
            .cs2-btn {
              padding: 10px 22px;
              border-radius: 10px;
              border: none;
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              transition: all 0.2s;
            }
            .cs2-btn-primary {
              background: linear-gradient(135deg, ${COLORS.primary}, #ff8c42);
              color: white;
            }
            .cs2-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(255,107,53,0.35); }
            .cs2-btn-secondary {
              background: rgba(255,255,255,0.06);
              color: ${COLORS.textMuted};
              border: 1px solid ${COLORS.border};
            }
            .cs2-btn-secondary:hover { background: rgba(255,255,255,0.1); color: ${COLORS.text}; }
            
            /* 结果区域 */
            .cs2-results { margin-top: 20px; display: none; }
            .cs2-results.visible { display: block; }
            .cs2-section-title {
              color: ${COLORS.text};
              font-size: 15px;
              font-weight: 700;
              margin-bottom: 14px;
              display: flex; align-items: center; gap: 8px;
            }
            .cs2-chart-row {
              display: flex; gap: 20px; margin-bottom: 24px;
              flex-wrap: wrap;
            }
            .cs2-chart-card {
              flex: 1; min-width: 300px;
              background: ${COLORS.cardBg};
              border-radius: 12px;
              border: 1px solid ${COLORS.border};
              padding: 18px;
            }
            .cs2-canvas-wrap {
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .cs2-canvas-wrap canvas { max-width: 100%; }
            
            /* 数据表格 */
            .cs2-table-wrap {
              overflow-x: auto;
              border-radius: 10px;
              border: 1px solid ${COLORS.border};
            }
            .cs2-table {
              width: 100%; border-collapse: collapse; font-size: 13px;
            }
            .cs2-table th {
              background: rgba(255,255,255,0.04);
              color: ${COLORS.textMuted};
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-size: 11px;
              padding: 10px 12px;
              text-align: left;
              border-bottom: 1px solid ${COLORS.border};
              white-space: nowrap;
            }
            .cs2-table td {
              padding: 9px 12px;
              border-bottom: 1px solid ${COLORS.border};
              color: ${COLORS.text};
              white-space: nowrap;
            }
            .cs2-table tr:last-child td { border-bottom: none; }
            .cs2-table tr:hover td { background: rgba(255,255,255,0.02); }
            .cs2-stat-bar {
              height: 6px; border-radius: 3px;
              background: rgba(255,255,255,0.06);
              overflow: hidden; min-width: 60px;
            }
            .cs2-stat-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
            .cs2-tag {
              display: inline-block; padding: 2px 8px; border-radius: 4px;
              font-size: 11px; font-weight: 600;
            }
            .cs2-tag-db { background: rgba(78,205,196,0.15); color: #4ecdc4; }
            .cs2-tag-sim { background: rgba(255,167,122,0.15); color: #ffa77a; }
    
            /* 切换标签 */
            .cs2-tabs {
              display: flex; gap: 4px;
              background: rgba(255,255,255,0.03);
              border-radius: 10px; padding: 4px;
              margin-bottom: 16px;
            }
            .cs2-tab {
              flex: 1; padding: 8px 14px;
              border: none; border-radius: 8px;
              background: transparent;
              color: ${COLORS.textMuted};
              cursor: pointer; font-size: 13px; font-weight: 600;
              transition: all 0.2s;
            }
            .cs2-tab.active {
              background: ${COLORS.primary}; color: white;
            }
    
            /* 自动提示下拉框 */
            .cs2-autocomplete-wrap { position: relative; }
            .cs2-autocomplete-dropdown {
              position: absolute;
              top: 100%; left: 0; right: 0;
              max-height: 220px; overflow-y: auto;
              background: rgba(20, 20, 35, 0.98);
              border: 1px solid ${COLORS.border};
              border-radius: 10px;
              box-shadow: 0 8px 32px rgba(0,0,0,0.5);
              z-index: 100;
              display: none;
              margin-top: 4px;
            }
            .cs2-autocomplete-dropdown.visible { display: block; }
            .cs2-ac-item {
              padding: 9px 14px;
              cursor: pointer;
              display: flex; align-items: center; justify-content: space-between;
              font-size: 13px; color: ${COLORS.text};
              transition: background 0.15s;
              border-bottom: 1px solid rgba(255,255,255,0.04);
            }
            .cs2-ac-item:last-child { border-bottom: none; }
            .cs2-ac-item:hover, .cs2-ac-item.active {
              background: rgba(255,107,53,0.12);
            }
            .cs2-ac-item-name { font-weight: 600; }
            .cs2-ac-item-team {
              font-size: 11px; color: ${COLORS.textMuted}; opacity: 0.7;
            }
            .cs2-ac-item-db-tag {
              font-size: 10px; padding: 1px 6px; border-radius: 3px;
              background: rgba(78,205,196,0.15); color: #4ecdc4;
              font-weight: 600;
            }
    
            @keyframes cs2FadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .cs2-animate-in { animation: cs2FadeIn 0.4s ease forwards; }
          </style>
          
          <div id="cs2-analyzer-panel">
            <div class="cs2-header">
              <div class="cs2-title">
                <span class="cs2-title-icon">🎯</span>
                CS2 战队数据分析面板
              </div>
              <button class="cs2-close-btn" id="cs2-close" title="关闭">✕</button>
            </div>
            <div class="cs2-body">
              <!-- 输入区域 -->
              <div class="cs2-input-group">
                <label class="cs2-label">战队名称</label>
                <input class="cs2-input" id="cs2-team-name" placeholder="例如：NAVI、FaZe、Vitality、Spirit..." />
              </div>
              <div class="cs2-input-group">
                <label class="cs2-label">成员列表</label>
                <div class="cs2-autocomplete-wrap" id="cs2-ac-wrap">
                  <textarea class="cs2-input" id="cs2-members" placeholder="输入成员名称，每行一个&#10;&#10;示例：&#10;s1mple&#10;b1t&#10;jL&#10;iM&#10;Aleksib" spellcheck="false"></textarea>
                  <div class="cs2-autocomplete-dropdown" id="cs2-ac-dropdown"></div>
                </div>
                <div class="cs2-hint">💡 输入时自动提示已知职业选手（50+位），支持模糊搜索；未知选手将使用模拟数据</div>
              </div>
              <div class="cs2-actions">
                <button class="cs2-btn cs2-btn-primary" id="cs2-analyze">开始分析</button>
                <button class="cs2-btn cs2-btn-secondary" id="cs2-demo">加载示例数据</button>
              </div>
    
              <!-- 结果区域 -->
              <div class="cs2-results" id="cs2-results">
                <div class="cs2-tabs">
                  <button class="cs2-tab active" data-tab="radar">能力雷达图</button>
                  <button class="cs2-tab" data-tab="bar">综合柱状图</button>
                  <button class="cs2-tab" data-tab="table">详细数据表</button>
                </div>
                
                <div id="cs2-radar-view">
                  <div class="cs2-chart-row">
                    <div class="cs2-chart-card cs2-animate-in">
                      <div class="cs2-section-title">📊 六维能力雷达图</div>
                      <div class="cs2-canvas-wrap"><canvas id="cs2-radar-canvas" width="420" height="420"></canvas></div>
                    </div>
                  </div>
                  <div id="cs2-individual-radars"></div>
                </div>
                
                <div id="cs2-bar-view" style="display:none;">
                  <div class="cs2-chart-card cs2-animate-in">
                    <div class="cs2-section-title">📈 Rating 综合对比</div>
                    <div class="cs2-canvas-wrap"><canvas id="cs2-bar-canvas" width="800" height="380"></canvas></div>
                  </div>
                  <div id="cs2-extra-bars" style="margin-top:16px;"></div>
                </div>
                
                <div id="cs2-table-view" style="display:none;">
                  <div class="cs2-chart-card cs2-animate-in">
                    <div class="cs2-section-title">📋 详细数据总览</div>
                    <div class="cs2-table-wrap" id="cs2-data-table"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
    
        document.body.appendChild(container);
    
        // 绑定事件
        document.getElementById('cs2-close').onclick = () => container.remove();
        document.getElementById('cs2-analyze').onclick = handleAnalyze;
        document.getElementById('cs2-demo').onclick = loadDemo;
    
        // Tab切换
        container.querySelectorAll('.cs2-tab').forEach(tab => {
          tab.onclick = () => switchTab(tab.dataset.tab);
        });
    
        // ============ 自动提示功能 ============
        initAutocomplete();
      }
    
      // ---- Autocomplete 状态 ----
      let acActiveIndex = -1;
      let acFilteredPlayers = [];
    
      function initAutocomplete() {
        const textarea = document.getElementById('cs2-members');
        const dropdown = document.getElementById('cs2-ac-dropdown');
    
        // 输入时触发搜索
        textarea.addEventListener('input', () => {
          handleAcInput(textarea, dropdown);
        });
    
        // 键盘导航
        textarea.addEventListener('keydown', (e) => {
          if (!dropdown.classList.contains('visible')) return;
          const items = dropdown.querySelectorAll('.cs2-ac-item');
          if (items.length === 0) return;
    
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            acActiveIndex = Math.min(acActiveIndex + 1, items.length - 1);
            updateAcHighlight(items);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            acActiveIndex = Math.max(acActiveIndex - 1, 0);
            updateAcHighlight(items);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (acActiveIndex >= 0 && items[acActiveIndex]) {
              e.preventDefault();
              selectAcItem(textarea, dropdown, acFilteredPlayers[acActiveIndex]);
            }
          } else if (e.key === 'Escape') {
            hideAcDropdown(dropdown);
          }
        });
    
        // 点击外部关闭
        document.addEventListener('click', (e) => {
          if (!e.target.closest('#cs2-ac-wrap')) {
            hideAcDropdown(dropdown);
          }
        });
    
        // 失焦时延迟关闭（允许点击选项）
        textarea.addEventListener('blur', () => {
          setTimeout(() => hideAcDropdown(dropdown), 150);
        });
      }
    
      function handleAcInput(textarea, dropdown) {
        const text = textarea.value;
        const lines = text.split('\n');
        const currentLine = lines[lines.length - 1].trim();
        
        // 当前行无内容或已包含换行完成的行，不显示提示
        if (currentLine.length === 0 || (lines.length > 1 && currentLine === '')) {
          hideAcDropdown(dropdown);
          return;
        }
    
        // 模糊搜索：匹配选手名（忽略大小写）
        const query = currentLine.toLowerCase();
        acFilteredPlayers = Object.keys(SAMPLE_PLAYER_DB)
          .filter(name => name.toLowerCase().includes(query))
          .sort((a, b) => {
            // 前缀匹配优先
            const aStarts = a.toLowerCase().startsWith(query);
            const bStarts = b.toLowerCase().startsWith(query);
            if (aStarts && !bStarts) return -1;
            if (!aStarts && bStarts) return 1;
            return a.localeCompare(b);
          })
          .slice(0, 10); // 最多显示10条
    
        if (acFilteredPlayers.length === 0) {
          hideAcDropdown(dropdown);
          return;
        }
    
        acActiveIndex = -1;
    
        // 渲染下拉列表
        dropdown.innerHTML = acFilteredPlayers.map(name => {
          const info = SAMPLE_PLAYER_DB[name];
          return `<div class="cs2-ac-item" data-name="${name}">
            <span>
              <span class="cs2-ac-item-name">${highlightMatch(name, query)}</span>
              <span class="cs2-ac-item-team">${info.team || ''}</span>
            </span>
            <span class="cs2-ac-item-db-tag">DB</span>
          </div>`;
        }).join('');
    
        // 绑定点击事件
        dropdown.querySelectorAll('.cs2-ac-item').forEach((item, idx) => {
          item.onclick = () => selectAcItem(textarea, dropdown, acFilteredPlayers[idx]);
          item.onmouseenter = () => { acActiveIndex = idx; updateAcHighlight(dropdown.querySelectorAll('.cs2-ac-item')); };
        });
    
        dropdown.classList.add('visible');
      }
    
      function highlightMatch(name, query) {
        if (!query) return name;
        const idx = name.toLowerCase().indexOf(query);
        if (idx === -1) return name;
        return name.slice(0, idx) + '<strong style="color:' + COLORS.primary + '">' + name.slice(idx, idx + query.length) + '</strong>' + name.slice(idx + query.length);
      }
    
      function updateAcHighlight(items) {
        items.forEach((item, i) => item.classList.toggle('active', i === acActiveIndex));
        if (acActiveIndex >= 0 && items[acActiveIndex]) {
          items[acActiveIndex].scrollIntoView({ block: 'nearest' });
        }
      }
    
      function selectAcItem(textarea, dropdown, playerName) {
        const text = textarea.value;
        const lines = text.split('\n');
        // 替换最后一行为选中的选手名
        lines[lines.length - 1] = playerName;
        textarea.value = lines.join('\n') + '\n';
        textarea.focus();
        hideAcDropdown(dropdown);
    
        // 替换后重新触发输入以继续提示下一行
        textarea.dispatchEvent(new Event('input'));
      }
    
      function hideAcDropdown(dropdown) {
        dropdown.classList.remove('visible');
        dropdown.innerHTML = '';
        acActiveIndex = -1;
        acFilteredPlayers = [];
      }
    
      // ============ 数据处理 ============
      let currentData = { teamName: '', players: [] };
    
      function parseMembers(text) {
        return text.split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    
      function loadDemo() {
        document.getElementById('cs2-team-name').value = 'Team Spirit';
        document.getElementById('cs2-members').value = `donk\nsh1ro\nax1le\nmagix\nchopper`;
        handleAnalyze();
      }
    
      function handleAnalyze() {
        const teamName = document.getElementById('cs2-team-name').value.trim() || '未命名战队';
        const memberText = document.getElementById('cs2-members').value;
        const names = parseMembers(memberText);
    
        if (names.length === 0) {
          alert('请至少输入一名成员！');
          return;
        }
    
        currentData.teamName = teamName;
        currentData.players = names.map((name, i) => ({
          name,
          data: getPlayerData(name),
          color: COLORS.playerColors[i % COLORS.playerColors.length]
        }));
    
        renderResults();
      }
    
      // ============ 渲染结果 ============
      function renderResults() {
        const resultsEl = document.getElementById('cs2-results');
        resultsEl.classList.add('visible');
    
        drawRadarChart();
        drawBarChart();
        renderTable();
    
        // 显示个人雷达图
        renderIndividualRadars();
      }
    
      function switchTab(tabId) {
        container.querySelectorAll('.cs2-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
        document.getElementById('cs2-radar-view').style.display = tabId === 'radar' ? '' : 'none';
        document.getElementById('cs2-bar-view').style.display = tabId === 'bar' ? '' : 'none';
        document.getElementById('cs2-table-view').style.display = tabId === 'table' ? '' : 'none';
      }
    
      // ============ 雷达图绘制 ============
      function drawRadarChart() {
        canvas = document.getElementById('cs2-radar-canvas');
        ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const radius = Math.min(W, H) / 2 - 50;
    
        ctx.clearRect(0, 0, W, H);
    
        const labels = ['Rating', 'K/D', '爆头率%', '首杀成功率', '残局胜率', '道具伤害'];
        const keys = ['rating', 'kd', 'hsPct', 'entrySuccess', 'clutchWin', 'utilDamage'];
        const maxVals = [1.50, 1.50, 65, 0.80, 0.75, 0.60];
        const minVals = [0.80, 0.80, 35, 0.30, 0.25, 0.25];
        const sides = labels.length;
        const angleStep = (Math.PI * 2) / sides;
        const startAngle = -Math.PI / 2;
    
        // 绘制背景网格
        for (let level = 5; level >= 1; level--) {
          const r = (radius * level) / 5;
          ctx.beginPath();
          for (let i = 0; i <= sides; i++) {
            const angle = startAngle + i * angleStep;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.strokeStyle = COLORS.gridLine;
          ctx.lineWidth = 1;
          ctx.stroke();
          if (level === 5) {
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fill();
          }
        }
    
        // 绘制轴线和标签
        for (let i = 0; i < sides; i++) {
          const angle = startAngle + i * angleStep;
          const ex = cx + Math.cos(angle) * radius;
          const ey = cy + Math.sin(angle) * radius;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = COLORS.gridLine;
          ctx.lineWidth = 1;
          ctx.stroke();
    
          // 标签
          const lx = cx + Math.cos(angle) * (radius + 24);
          const ly = cy + Math.sin(angle) * (radius + 24);
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '12px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labels[i], lx, ly);
        }
    
        // 绘制每个选手的多边形
        currentData.players.forEach(player => {
          const d = player.data;
          ctx.beginPath();
          for (let i = 0; i <= sides; i++) {
            const idx = i % sides;
            const val = normalizeStat(d[keys[idx]], minVals[idx], maxVals[idx]);
            const r = (val / 100) * radius;
            const angle = startAngle + idx * angleStep;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fillStyle = player.color + '20';
          ctx.fill();
          ctx.strokeStyle = player.color;
          ctx.lineWidth = 2;
          ctx.stroke();
        });
    
        // 图例
        const legendX = 20, legendY = H - 20;
        currentData.players.forEach((p, i) => {
          const x = legendX + i * 90;
          ctx.fillStyle = p.color;
          ctx.fillRect(x, legendY - 8, 12, 12);
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'left';
          ctx.fillText(p.name, x + 16, legendY + 2);
        });
      }
    
      // 个人雷达图
      function renderIndividualRadars() {
        const wrap = document.getElementById('cs2-individual-radars');
        wrap.innerHTML = '';
    
        if (currentData.players.length <= 1) return;
    
        const labels = ['Rating', 'K/D', '爆头率%', '首杀成功', '残局胜率', '道具伤害'];
        const keys = ['rating', 'kd', 'hsPct', 'entrySuccess', 'clutchWin', 'utilDamage'];
        const maxVals = [1.50, 1.50, 65, 0.80, 0.75, 0.60];
        const minVals = [0.80, 0.80, 35, 0.30, 0.25, 0.25];
    
        currentData.players.forEach(player => {
          const card = document.createElement('div');
          card.className = 'cs2-chart-card cs2-animate-in';
          card.style.cssText = 'margin-top:16px;';
          card.innerHTML = `
            <div class="cs2-section-title" style="color:${player.color}">${player.name} — 个人能力图</div>
            <div class="cs2-canvas-wrap"><canvas width="320" height="320" data-player="${player.name}"></canvas></div>
          `;
          wrap.appendChild(card);
    
          const pCanvas = card.querySelector('canvas');
          const pCtx = pCanvas.getContext('2d');
          const pw = pCanvas.width, ph = pCanvas.height;
          const pcx = pw / 2, pcy = ph / 2;
          const pr = Math.min(pw, ph) / 2 - 40;
          const sides = 6;
          const aStep = (Math.PI * 2) / sides;
          const sAng = -Math.PI / 2;
    
          pCtx.clearRect(0, 0, pw, ph);
    
          // 网格
          for (let lv = 5; lv >= 1; lv--) {
            const rr = (pr * lv) / 5;
            pCtx.beginPath();
            for (let j = 0; j <= sides; j++) {
              const ang = sAng + j * aStep;
              const px = pcx + Math.cos(ang) * rr;
              const py = pcy + Math.sin(ang) * rr;
              j === 0 ? pCtx.moveTo(px, py) : pCtx.lineTo(px, py);
            }
            pCtx.closePath();
            pCtx.strokeStyle = COLORS.gridLine;
            pCtx.stroke();
          }
    
          // 轴线+标签
          for (let j = 0; j < sides; j++) {
            const ang = sAng + j * aStep;
            pCtx.beginPath(); pCtx.moveTo(pcx, pcy);
            pCtx.lineTo(pcx + Math.cos(ang) * pr, pcy + Math.sin(ang) * pr);
            pCtx.strokeStyle = COLORS.gridLine; pCtx.stroke();
            const lx = pcx + Math.cos(ang) * (pr + 20);
            const ly = pcy + Math.sin(ang) * (pr + 20);
            pCtx.fillStyle = COLORS.textMuted;
            pCtx.font = '10px -apple-system, sans-serif';
            pCtx.textAlign = 'center'; pCtx.textBaseline = 'middle';
            pCtx.fillText(labels[j], lx, ly);
          }
    
          // 数据区
          const d = player.data;
          pCtx.beginPath();
          for (let j = 0; j <= sides; j++) {
            const idx = j % sides;
            const v = normalizeStat(d[keys[idx]], minVals[idx], maxVals[idx]);
            const rr = (v / 100) * pr;
            const ang = sAng + idx * aStep;
            const px = pcx + Math.cos(ang) * rr;
            const py = pcy + Math.sin(ang) * rr;
            j === 0 ? pCtx.moveTo(px, py) : pCtx.lineTo(px, py);
          }
          pCtx.closePath();
          pCtx.fillStyle = player.color + '30';
          pCtx.fill();
          pCtx.strokeStyle = player.color;
          pCtx.lineWidth = 2.5;
          pCtx.stroke();
    
          // 数值标注
          for (let j = 0; j < sides; j++) {
            const v = normalizeStat(d[keys[j]], minVals[j], maxVals[j]);
            const rr = (v / 100) * pr;
            const ang = sAng + j * aStep;
            const px = pcx + Math.cos(ang) * rr;
            const py = pcy + Math.sin(ang) * rr;
            pCtx.fillStyle = '#fff';
            pCtx.font = 'bold 10px -apple-system, sans-serif';
            pCtx.textAlign = 'center'; pCtx.textBaseline = 'middle';
            const rawVal = keys[j] === 'hsPct' ? d[keys[j]].toFixed(1) + '%' : d[keys[j]].toFixed(2);
            pCtx.fillText(rawVal, px, py - 10);
          }
        });
      }
    
      // ============ 柱状图绘制 ============
      function drawBarChart() {
        canvas = document.getElementById('cs2-bar-canvas');
        ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
    
        const players = currentData.players;
        const barWidth = Math.min(60, (W - 120) / players.length - 16);
        const gap = (W - 100 - barWidth * players.length) / (players.length + 1);
        const maxRating = 1.50;
        const chartH = H - 70;
        const baseY = H - 40;
    
        // Y轴网格
        for (let v = 0; v <= 1.50; v += 0.25) {
          const y = baseY - (v / maxRating) * chartH;
          ctx.beginPath();
          ctx.moveTo(50, y);
          ctx.lineTo(W - 20, y);
          ctx.strokeStyle = COLORS.gridLine;
          ctx.stroke();
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '11px -apple-system, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(v.toFixed(2), 44, y + 4);
        }
    
        // 柱子
        players.forEach((p, i) => {
          const x = 60 + i * (barWidth + gap);
          const h = (p.data.rating / maxRating) * chartH;
          const y = baseY - h;
    
          // 渐变柱子
          const grad = ctx.createLinearGradient(x, y, x, baseY);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, p.color + '40');
          ctx.fillStyle = grad;
          roundRect(ctx, x, y, barWidth, h, 6);
          ctx.fill();
    
          // 数值
          ctx.fillStyle = COLORS.text;
          ctx.font = 'bold 13px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(p.data.rating.toFixed(2), x + barWidth / 2, y - 8);
    
          // 名称
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = '12px -apple-system, sans-serif';
          ctx.fillText(p.name, x + barWidth / 2, baseY + 18);
        });
    
        // Y轴标题
        ctx.save();
        ctx.translate(16, H / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '11px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Rating', 0, 0);
        ctx.restore();
    
        // 额外指标柱状图
        renderExtraBars();
      }
    
      function roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      }
    
      function renderExtraBars() {
        const wrap = document.getElementById('cs2-extra-bars');
        const metrics = [
          { key: 'kd', label: 'K/D Ratio', max: 1.50, fmt: v => v.toFixed(2) },
          { key: 'hsPct', label: '爆头率 (%)', max: 65, fmt: v => v.toFixed(1) + '%' },
          { key: 'impact', label: 'Impact', max: 1.50, fmt: v => v.toFixed(2) },
          { key: 'clutchWin', label: '残局胜率', max: 0.75, fmt: v => (v * 100).toFixed(0) + '%' }
        ];
    
        wrap.innerHTML = '<div class="cs2-chart-row">' +
          metrics.map(m => `
            <div class="cs2-chart-card cs2-animate-in">
              <div class="cs2-section-title">${m.label}</div>
              <div class="cs2-canvas-wrap"><canvas data-metric="${m.key}" width="340" height="${40 + currentData.players.length * 36}"></canvas></div>
            </div>
          `).join('') +
        '</div>';
    
        metrics.forEach(m => {
          const cv = wrap.querySelector(`[data-metric="${m.key}"]`);
          const c = cv.getContext('2d');
          const w = cv.width, h = cv.height;
          c.clearRect(0, 0, w, h);
          const bw = w - 100;
          const rowH = 36;
    
          currentData.players.forEach((p, i) => {
            const y = 12 + i * rowH;
            const val = p.data[m.key];
            const pct = clamp((val / m.max) * 100, 0, 100);
    
            // 背景
            c.fillStyle = 'rgba(255,255,255,0.05)';
            roundRect(c, 80, y, bw, 20, 4);
            c.fill();
    
            // 填充
            const grad = c.createLinearGradient(80, y, 80 + (bw * pct / 100), y);
            grad.addColorStop(0, p.color);
            grad.addColorStop(1, p.color + '60');
            c.fillStyle = grad;
            roundRect(c, 80, y, bw * pct / 100, 20, 4);
            c.fill();
    
            // 名称
            c.fillStyle = COLORS.text;
            c.font = 'bold 12px -apple-system, sans-serif';
            c.textAlign = 'right';
            c.fillText(p.name, 72, y + 14);
    
            // 值
            c.fillStyle = COLORS.text;
            c.font = '11px -apple-system, sans-serif';
            c.textAlign = 'left';
            c.fillText(m.fmt(val), 86 + bw, y + 14);
          });
        });
      }
    
      // ============ 数据表格 ============
      function renderTable() {
        const wrap = document.getElementById('cs2-data-table');
        const players = currentData.players;
    
        let html = `<table class="cs2-table">
          <thead><tr>
            <th>选手</th><th>来源</th><th>Rating</th><th>K/D</th><th>爆头%</th>
            <th>首杀成功</th><th>残局胜率</th><th>道具伤害</th><th>Impact</th>
          </tr></thead><tbody>`;
    
        players.forEach(p => {
          const d = p.data;
          const tagClass = d.source === 'database' ? 'cs2-tag-db' : 'cs2-tag-sim';
          const tagText = d.source === 'database' ? '数据库' : '模拟';
          html += `<tr>
            <td style="font-weight:700;color:${p.color}">${p.name}</td>
            <td><span class="cs2-tag ${tagClass}">${tagText}</span></td>
            <td>${d.rating.toFixed(2)}</td>
            <td>${d.kd.toFixed(2)}</td>
            <td>${d.hsPct.toFixed(1)}%</td>
            <td>${(d.entrySuccess * 100).toFixed(0)}%</td>
            <td>${(d.clutchWin * 100).toFixed(0)}%</td>
            <td>${d.utilDamage.toFixed(2)}</td>
            <td>${d.impact.toFixed(2)}</td>
          </tr>`;
        });
    
        html += '</tbody></table>';
        wrap.innerHTML = html;
      }
    
      // ============ 执行 ============
      createUI();
    
      return {
        ok: true,
        summary: 'CS2 战队数据分析面板已创建。可输入战队名称和成员列表进行数据分析。',
        changed_count: 1,
        data: { uiElement: 'cs2-team-analyzer-root' },
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();