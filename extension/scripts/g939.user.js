(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    // ============================================================
    // DevNav v2.5.1 — 悬浮球快捷导航（面板初始化修复版）
    //
    // 修复内容：打开新网页时面板默认为关闭状态（不再默认展开）
    // 修复位置：面板 DOM 创建后立即设置 display:none
    // 其他功能：与 v2.5 完全一致（24站点、展开/折叠列表、编辑/删除、搜索实时匹配）
    // ============================================================
    
    async function run(args) {
      const NS = '__devnav_v2';
      const CFG_KEY = `${NS}_cfg`;
    
      // ---- 内置站点数据 ----
      const BUILTIN_SITES = [
        { id: 'postman', name: 'Postman', icon: '📮', color: '#ff6c37', category: 'API 工具', baseUrl: 'https://www.postman.com', functions: [{ name: '首页', url: 'https://www.postman.com' }, { name: 'Workspace', url: 'https://go.postman.co/home' }] },
        { id: 'github', name: 'GitHub', icon: '💻', color: '#238636', category: '代码托管', baseUrl: 'https://github.com', functions: [{ name: '首页', url: 'https://github.com' }, { name: 'Pull Requests', url: 'https://github.com/pulls' }, { name: 'Issues', url: 'https://github.com/issues' }, { name: 'Explore', url: 'https://github.com/explore' }, { name: 'Notifications', url: 'https://github.com/notifications' }, { name: '新建 Repo', url: 'https://github.com/new' }] },
        { id: 'gitlab', name: 'GitLab', icon: '🦊', color: '#fc6d26', category: '代码托管', baseUrl: 'https://gitlab.com', functions: [{ name: '首页', url: 'https://gitlab.com/explore' }, { name: 'Projects', url: 'https://gitlab.com/dashboard/projects' }, { name: 'Merge Requests', url: 'https://gitlab.com/dashboard/merge_requests' }] },
        { id: 'npm', name: 'npm', icon: '📦', color: '#cb3837', category: '包管理', baseUrl: 'https://www.npmjs.com', functions: [{ name: '首页', url: 'https://www.npmjs.com' }, { name: 'Packages', url: 'https://www.npmjs.com/packages' }, { name: 'Publish', url: 'https://www.npmjs.com/publish' }] },
        { id: 'codepen', name: 'CodePen', icon: '✏️', color: '#000000', category: '在线 IDE', baseUrl: 'https://codepen.io', functions: [{ name: '首页', url: 'https://codepen.io/' }, { name: 'Editor', url: 'https://codepen.io/pen/editor/' }, { name: 'Trending', url: 'https://codepen.io/trending' }] },
        { id: 'codesandbox', name: 'CodeSandbox', icon: '🛠️', color: '#000000', category: '在线 IDE', baseUrl: 'https://codesandbox.io', functions: [{ name: '首页', url: 'https://codesandbox.io' }, { name: 'Dashboard', url: 'https://codesandbox.io/dashboard/recent' }, { name: 'New Sandbox', url: 'https://codesandbox.io/s' }] },
        { id: 'dockerhub', name: 'Docker Hub', icon: '🐳', color: '#2496ed', category: '容器', baseUrl: 'https://hub.docker.com', functions: [{ name: '首页', url: 'https://hub.docker.com' }, { name: 'Repositories', url: 'https://hub.docker.com/repositories' }, { name: 'Explore', url: 'https://hub.docker.com/explore' }] },
        { id: 'regex101', name: 'Regex101', icon: '🔤', color: '#a855f7', category: '工具', baseUrl: 'https://regex101.com', functions: [{ name: '首页', url: 'https://regex101.com' }, { name: 'PCRE2', url: 'https://regex101.com/?flavor=pcre2' }, { name: 'JavaScript', url: 'https://regex101.com/?flavor=javascript' }] },
        { id: 'jsonlint', name: 'JSONLint', icon: '📋', color: '#22c55e', category: '工具', baseUrl: 'https://jsonlint.com', functions: [{ name: '首页', url: 'https://jsonlint.com' }] },
        { id: 'v2ex', name: 'V2EX', icon: '💬', color: '#333333', category: '技术社区', baseUrl: 'https://www.v2ex.com', functions: [{ name: '首页', url: 'https://www.v2ex.com' }, { name: '最新', url: 'https://www.v2ex.com/?tab=hot' }, { name: '节点', url: 'https://www.v2ex.com/go' }] },
        { id: 'juejin', name: '掘金', icon: '💎', color: '#1e80ff', category: '技术社区', baseUrl: 'https://juejin.cn', functions: [{ name: '首页', url: 'https://juejin.cn' }, { name: '推荐', url: 'https://juejin.cn/recommended' }, { name: '沸点', url: 'https://juejin.cn/hot' }] },
        { id: 'confluence', name: 'Confluence', icon: '📄', color: '#0052cc', category: '文档协作', baseUrl: '', functions: [] },
        { id: 'mdn', name: 'MDN', icon: '📖', color: '#000000', category: '文档参考', baseUrl: 'https://developer.mozilla.org', functions: [{ name: '首页', url: 'https://developer.mozilla.org/zh-CN/' }, { name: 'Web API', url: 'https://developer.mozilla.org/zh-CN/docs/Web/API' }, { name: 'CSS', url: 'https://developer.mozilla.org/zh-CN/docs/Web/CSS' }, { name: 'JavaScript', url: 'https://developer.mozilla.org/zh-CN/docs/Web/JavaScript' }] },
        { id: 'typescript', name: 'TypeScript', icon: '🔷', color: '#3178c6', category: '语言参考', baseUrl: 'https://www.typescriptlang.org', functions: [{ name: '首页', url: 'https://www.typescriptlang.org' }, { name: 'Docs', url: 'https://www.typescriptlang.org/docs/' }, { name: 'Playground', url: 'https://www.typescriptlang.org/play' }] },
        { id: 'rust', name: 'Rust', icon: '🦀', color: '#dea584', category: '语言参考', baseUrl: 'https://www.rust-lang.org', functions: [{ name: '首页', url: 'https://www.rust-lang.org' }, { name: 'Docs', url: 'https://doc.rust-lang.org/book/' }, { name: 'Playground', url: 'https://play.rust-lang.org' }] },
        { id: 'golang', name: 'Go', icon: '🐹', color: '#00add8', category: '语言参考', baseUrl: 'https://go.dev', functions: [{ name: '首页', url: 'https://go.dev' }, { name: 'Docs', url: 'https://go.dev/doc/' }, { name: 'Playground', url: 'https://go.dev/play/' }] },
        { id: 'python', name: 'Python', icon: '🐍', color: '#3776ab', category: '语言参考', baseUrl: 'https://www.python.org', functions: [{ name: '首页', url: 'https://www.python.org' }, { name: 'Docs', url: 'https://docs.python.org/3/' }, { name: 'PyPI', url: 'https://pypi.org' }] },
        { id: 'slack', name: 'Slack', icon: '💬', color: '#4a154b', category: '团队协作', baseUrl: '', functions: [] },
        { id: 'notion', name: 'Notion', icon: '📝', color: '#000000', category: '团队协作', baseUrl: 'https://notion.so', functions: [{ name: '首页', url: 'https://notion.so' }] },
        { id: 'figma', name: 'Figma', icon: '🎨', color: '#a259ff', category: '设计', baseUrl: 'https://figma.com', functions: [{ name: '首页', url: 'https://figma.com' }, { name: 'Community', url: 'https://community.figma.com' }] },
        { id: 'vercel', name: 'Vercel', icon: '▲', color: '#000000', category: '部署', baseUrl: 'https://vercel.com', functions: [{ name: '首页', url: 'https://vercel.com' }, { name: 'Dashboard', url: 'https://vercel.com/dashboard' }, { name: 'Deploy', url: 'https://vercel.com/new' }] },
        { id: 'stackoverflow', name: 'Stack Overflow', icon: '📚', color: '#f48024', category: '技术问答', baseUrl: 'https://stackoverflow.com', functions: [{ name: '首页', url: 'https://stackoverflow.com' }, { name: 'Questions', url: 'https://stackoverflow.com/questions' }, { name: 'Tags', url: 'https://stackoverflow.com/tags' }] },
        { id: 'zhihu', name: '知乎', icon: '💡', color: '#0084ff', category: '技术社区', baseUrl: 'https://www.zhihu.com', functions: [{ name: '首页', url: 'https://www.zhihu.com' }, { name: '热榜', url: 'https://www.zhihu.com/hot' }] },
        { id: 'jira', name: 'Jira', icon: '📋', color: '#0052cc', category: '项目管理', baseUrl: '', functions: [] }
      ];
    
      // ---- 配置管理 ----
      function loadCfg() {
        try {
          const raw = localStorage.getItem(CFG_KEY);
          return raw ? JSON.parse(raw) : {};
        } catch (e) {
          return {};
        }
      }
      function saveCfg(cfg) {
        try {
          localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
        } catch (e) {}
      }
    
      // ---- 初始化配置 ----
      let cfg = loadCfg();
      cfg.ballPosition = cfg.ballPosition || { right: 20, bottom: 80 };
      cfg.pinnedFunctionIds = cfg.pinnedFunctionIds || [];
      cfg.customSites = cfg.customSites || [];
      cfg.learnedSites = cfg.learnedSites || [];
      cfg.deletedSiteIds = cfg.deletedSiteIds || [];
      cfg.editedSites = cfg.editedSites || {};
      cfg.expandedSites = cfg.expandedSites || {};
      cfg.recentSearches = cfg.recentSearches || [];
      cfg.maxRecentSearches = cfg.maxRecentSearches || 10;
    
      // ---- 获取所有站点（合并内置+自定义+学习）----
      function getAllSites() {
        const sites = [];
        for (const s of BUILTIN_SITES) {
          if (!cfg.deletedSiteIds.includes(s.id)) {
            const edited = cfg.editedSites[s.id];
            sites.push(edited ? Object.assign({}, s, edited) : s);
          }
        }
        for (const s of cfg.customSites) sites.push(s);
        for (const s of cfg.learnedSites) sites.push(s);
        return sites;
      }
    
      // ---- 清理旧实例 ----
      document.querySelectorAll(`.${NS}-ball, .${NS}-panel, .${NS}-style`).forEach(el => el.remove());
    
      // ---- 注入样式 ----
      const styleEl = document.createElement('style');
      styleEl.className = `${NS}-style`;
      styleEl.textContent = `
        .${NS}-ball{position:fixed;z-index:2147483647;width:48px;height:48px;border-radius:50%;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;user-select:none;box-shadow:0 4px 16px rgba(102,126,234,.35);transition:transform .15s ease;}.${NS}-ball:hover{transform:scale(1.08);}
        /* ★★★ v2.5.1 FIX: 面板初始状态改为 display:none（默认关闭）★★★ */
        .${NS}-panel{position:fixed;z-index:2147483647;width:420px;max-height:70vh;background:#fff;border-radius:16px;box-shadow:0 8px 40px rgba(0,0,0,.18);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;right:20px;bottom:140px;}
        .${NS}-panel--open{display:flex!important;}
        .${NS}-panel-header{display:flex;align-items:center;padding:14px 16px;border-bottom:1px solid #eee;gap:12px;}
        .${NS}-panel-title{font-size:16px;font-weight:700;color:#333;flex:1;}
        .${NS}-panel-close{width:28px;height:28px;border:none;background:#f0f0f0;border-radius:50%;cursor:pointer;font-size:14px;color:#666;display:flex;align-items:center;justify-content:center;}
        .${NS}-panel-close:hover{background:#e0e0e0;}
        .${NS}-panel-body{flex:1;overflow-y:auto;padding:12px 16px;}
        .${NS}-tabs{display:flex;gap:0;border-bottom:2px solid #eee;margin-bottom:14px;}
        .${NS}-tab{padding:10px 18px;font-size:14px;font-weight:600;color:#888;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;transition:color .15s,border-color .15s;}
        .${NS}-tab.active{color:#667eea;border-bottom-color:#667eea;}
        .${NS}-site-row{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:10px;cursor:pointer;transition:background .12s;margin-bottom:4px;}
        .${NS}-site-row:hover{background:#f6f7fb;}
        .${NS}-site-left{display:flex;align-items:center;gap:10px;}
        .${NS}-site-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;color:#fff;flex-shrink:0;}
        .${NS}-site-name{font-size:14px;font-weight:600;color:#222;}
        .${NS}-site-arrow{font-size:11px;color:#999;transition:transform .2s;width:16px;text-align:center;}
        .${NS}-site-actions{display:flex;gap:6px;}
        .${NS}-btn-xs{padding:4px 10px;font-size:12px;border-radius:6px;border:1px solid #ddd;background:#fff;cursor:pointer;color:#555;}
        .${NS}-btn-xs:hover{border-color:#667eea;color:#667eea;}
        .${NS}-func-list{margin-left:20px;margin-top:6px;margin-bottom:8px;}
        .${NS}-func-item{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:#444;transition:background .12s;margin-bottom:2px;}
        .${NS}-func-item:hover{background:#f0eff4;}
        .${NS}-pin-btn{font-size:13px;cursor:pointer;color:#ccc;transition:color .12s;}
        .${NS}-pin-btn:hover,.${NS}-pin-btn.pinned{color:#f59e0b;}
        .${NS}-modal-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;}
        .${NS}-modal{background:#fff;border-radius:16px;padding:24px;width:340px;max-width:90vw;box-shadow:0 12px 48px rgba(0,0,0,.2);}
        .${NS}-modal-title{font-size:17px;font-weight:700;margin-bottom:16px;}
        .${NS}-form-group{margin-bottom:14px;}
        .${NS}-form-label{display:block;font-size:13px;font-weight:600;color:#555;margin-bottom:5px;}
        .${NS}-form-input{width:100%;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:14px;outline:none;transition:border-color .15s;}
        .${NS}-form-input:focus{border-color:#667eea;}
        .${NS}-modal-footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;gap:10px;}
        .${NS}-btn{padding:9px 18px;border-radius:8px;border:none;font-size:14px;font-weight:600;cursor:pointer;}
        .${NS}-btn-primary{background:#667eea;color:#fff;}
        .${NS}-btn-danger{background:#ef4444;color:#fff;}
        .${NS}-btn-secondary{background:#f3f4f6;color:#555;}
        .${NS}-search-input{width:100%;padding:12px 16px;border:2px solid #eee;border-radius:12px;font-size:15px;outline:none;transition:border-color .15s;box-sizing:border-box;}
        .${NS}-search-input:focus{border-color:#667eea;}
        .${NS}-search-results{margin-top:12px;}
        .${NS}-search-item{padding:10px 14px;border-radius:10px;cursor:pointer;margin-bottom:6px;transition:background .12s;}
        .${NS}-search-item:hover{background:#f6f7fb;}
        .${NS}-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 22px;border-radius:10px;font-size:14px;font-weight:600;color:#fff;pointer-events:none;animation:fadeInOut 2.5s ease forwards;}
        @keyframes fadeInOut{0%{opacity:0;transform:translateX(-50%) translateY(-10px);}15%{opacity:1;transform:translateX(-50%) translateY(0);}85%{opacity:1;transform:translateX(-50%) translateY(0);}100%{opacity:0;transform:translateX(-50%) translateY(-10px);}}
        .${NS}-status-bar{text-align:center;font-size:12px;color:#aaa;padding:8px 0;border-top:1px solid #eee;margin-top:8px;}
      `;
      document.head.appendChild(styleEl);
    
      // ---- 创建悬浮球 ----
      const ball = document.createElement('div');
      ball.className = `${NS}-ball`;
      ball.innerHTML = '⌅';
      ball.style.right = cfg.ballPosition.right + 'px';
      ball.style.bottom = cfg.ballPosition.bottom + 'px';
      document.body.appendChild(ball);
    
      // ---- 创建面板 ----
      const panel = document.createElement('div');
      panel.className = `${NS}-panel`;
    
      // ★★★ v2.5.1 FIX: 面板创建后立即设置为隐藏状态 ★★★
      panel.style.display = 'none';
    
      panel.innerHTML = `
        <div class="${NS}-panel-header">
          <span class="${NS}-panel-title">DevNav v2.5.1</span>
          <button class="${NS}-panel-close">✕</button>
        </div>
        <div class="${NS}-tabs">
          <div class="${NS}-tab active" data-tab="search">⚡ 快捷搜索</div>
          <div class="${NS}-tab" data-tab="library">📚 网站库</div>
          <div class="${NS}-tab" data-tab="settings">⚙ 设置</div>
        </div>
        <div class="${NS}-panel-body"></div>
        <div class="${NS}-status-bar">DevNav v2.5.1 · Alt+D / ⌘+D</div>
      `;
      document.body.appendChild(panel);
    
      const bodyEl = panel.querySelector(`.${NS}-panel-body`);
      const tabs = panel.querySelectorAll(`.${NS}-tab`);
      let currentTab = 'search';
      let isPanelOpen = false;
    
      // ---- 面板开关控制 ----
      function openPanel() {
        panel.classList.add(`${NS}-panel--open`);
        panel.style.display = '';
        isPanelOpen = true;
      }
      function closePanel() {
        panel.classList.remove(`${NS}-panel--open`);
        panel.style.display = 'none';
        isPanelOpen = false;
      }
      function togglePanel() {
        if (isPanelOpen) closePanel(); else openPanel();
      }
    
      ball.addEventListener('click', togglePanel);
      panel.querySelector(`.${NS}-panel-close`).addEventListener('click', closePanel);
    
      // ---- Tab 切换 ----
      function switchTab(tabName) {
        currentTab = tabName;
        tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
        renderBody();
      }
      tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));
    
      // ---- Toast 提示 ----
      function showToast(msg) {
        const toast = document.createElement('div');
        toast.className = `${NS}-toast`;
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
      }
    
      // ---- 渲染函数 ----
      function renderBody() {
        if (currentTab === 'search') renderSearch();
        else if (currentTab === 'library') renderLibrary();
        else if (currentTab === 'settings') renderSettings();
      }
    
      // ---- 快捷搜索 ----
      function renderSearch() {
        bodyEl.innerHTML = `<input class="${NS}-search-input" placeholder="搜索站点或功能..." autocomplete="off"><div class="${NS}-search-results"></div>`;
        const input = bodyEl.querySelector(`.${NS}-search-input`);
        const resultsEl = bodyEl.querySelector(`.${NS}-search-results`);
    
        input.addEventListener('input', () => {
          const q = input.value.trim().toLowerCase();
          if (!q) { resultsEl.innerHTML = ''; return; }
          const sites = getAllSites();
          const matches = [];
          for (const site of sites) {
            if (site.name.toLowerCase().includes(q)) matches.push({ type: 'site', site });
            for (let i = 0; i < (site.functions||[]).length; i++) {
              const fn = site.functions[i];
              if (fn.name.toLowerCase().includes(q)) matches.push({ type: 'func', site, fn, idx: i });
            }
          }
          resultsEl.innerHTML = matches.slice(0, 20).map(m =>
            m.type === 'site'
              ? `<div class="${NS}-search-item" data-url="${m.site.baseUrl}"><strong>${m.site.icon} ${m.site.name}</strong><br><small>${m.site.category}</small></div>`
              : `<div class="${NS}-search-item" data-url="${m.fn.url}">${m.site.icon} ${m.site.name} → ${m.fn.name}</div>`
          ).join('') || '<p style="text-align:center;color:#aaa;padding:20px;">无匹配结果</p>';
    
          resultsEl.querySelectorAll(`.${NS}-search-item`).forEach(item => {
            item.addEventListener('click', () => {
              window.open(item.dataset.url, '_blank');
              if (input.value.trim()) {
                cfg.recentSearches.unshift(input.value.trim());
                cfg.recentSearches = [...new Set(cfg.recentSearches)].slice(0, cfg.maxRecentSearches);
                saveCfg(cfg);
              }
            });
          });
        });
    
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') {
            const first = resultsEl.querySelector(`.${NS}-search-item`);
            if (first) first.click();
          }
        });
    
        // 显示最近搜索
        if (cfg.recentSearches.length > 0) {
          resultsEl.innerHTML = '<p style="font-size:12px;color:#aaa;margin-bottom:8px;">最近搜索：</p>' +
            cfg.recentSearches.map(s => `<span style="display:inline-block;padding:4px 10px;background:#f0f0f0;border-radius:12px;font-size:12px;margin:2px;cursor:pointer;" class="recent-search">${s}</span>`).join('');
          resultsEl.querySelectorAll('.recent-search').forEach(el => {
            el.addEventListener('click', () => { input.value = el.textContent; input.dispatchEvent(new Event('input')); });
          });
        }
    
        input.focus();
      }
    
      // ---- 网站库 ----
      function renderLibrary() {
        const sites = getAllSites();
        bodyEl.innerHTML = sites.map(site => {
          const expanded = !!cfg.expandedSites[site.id];
          const arrowChar = expanded ? '▲' : '▼';
          const funcListHtml = expanded && site.functions && site.functions.length > 0
            ? `<div class="${NS}-func-list">${site.functions.map((fn, i) => {
                const pinId = `${site.id}::${i}`;
                const isPinned = cfg.pinnedFunctionIds.includes(pinId);
                return `<div class="${NS}-func-item" data-url="${fn.url}">
                  <span>${fn.name}</span>
                  <span class="${NS}-pin-btn ${isPinned ? 'pinned' : ''}" data-pin-id="${pinId}">${isPinned ? '★' : '☆'}</span>
                </div>`;
              }).join('')}</div>`
            : '';
    
          return `<div class="${NS}-site-row" data-site-id="${site.id}">
            <div class="${NS}-site-left">
              <div class="${NS}-site-icon" style="background:${site.color}">${site.icon}</div>
              <span class="${NS}-site-name">${site.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="${NS}-site-arrow">${arrowChar}</span>
              <div class="${NS}-site-actions">
                <button class="${NS}-btn-xs edit-btn" data-site-id="${site.id}">编辑</button>
              </div>
            </div>
          </div>${funcListHtml}`;
        }).join('');
    
        // 展开/折叠
        bodyEl.querySelectorAll(`.${NS}-site-row`).forEach(row => {
          row.addEventListener('click', e => {
            if (e.target.closest('.edit-btn')) return;
            const sid = row.dataset.siteId;
            cfg.expandedSites[sid] = !cfg.expandedSites[sid];
            saveCfg(cfg);
            renderLibrary();
          });
        });
    
        // 收藏按钮
        bodyEl.querySelectorAll(`.${NS}-pin-btn`).forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const pinId = btn.dataset.pinId;
            if (cfg.pinnedFunctionIds.includes(pinId)) {
              cfg.pinnedFunctionIds = cfg.pinnedFunctionIds.filter(id => id !== pinId);
            } else {
              cfg.pinnedFunctionIds.push(pinId);
            }
            saveCfg(cfg);
            renderLibrary();
          });
        });
    
        // 功能项点击
        bodyEl.querySelectorAll(`.${NS}-func-item`).forEach(item => {
          item.addEventListener('click', () => window.open(item.dataset.url, '_blank'));
        });
    
        // 编辑按钮
        bodyEl.querySelectorAll('.edit-btn').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            openEditModal(btn.dataset.siteId);
          });
        });
    
        // 更新状态栏
        updateStatusBar(sites.length);
      }
    
      function updateStatusBar(count) {
        const sb = panel.querySelector(`.${NS}-status-bar`);
        if (sb) sb.textContent = `DevNav v2.5.1 · ${count} 个站点 · Alt+D / ⌘+D`;
      }
    
      // ---- 设置页 ----
      function renderSettings() {
        bodyEl.innerHTML = `
          <h4 style="margin:0 0 12px;">自定义站点</h4>
          <div class="${NS}-form-group">
            <label class="${NS}-form-label">名称</label>
            <input class="${NS}-form-input cs-name" placeholder="如：内部 Wiki">
          </div>
          <div class="${NS}-form-group">
            <label class="${NS}-form-label">URL</label>
            <input class="${NS}-form-input cs-url" placeholder="https://...">
          </div>
          <button class="${NS}-btn ${NS}-btn-primary" style="width:100%;margin-top:8px;">➕ 添加自定义站点</button>
    
          <h4 style="margin:20px 0 12px;">配置管理</h4>
          <div style="display:flex;gap:10px;">
            <button class="${NS}-btn ${NS}-btn-secondary export-btn" style="flex:1;">💾 导出配置</button>
            <button class="${NS}-btn ${NS}-btn-secondary import-btn" style="flex:1;">📥 导入配置</button>
          </div>
    
          <h4 style="margin:20px 0 12px;">页面学习</h4>
          <button class="${NS}-btn ${NS}-btn-secondary learn-btn" style="width:100%;">📖 学习当前页面链接</button>
    
          <h4 style="margin:20px 0 12px;">已删除的内置站点</h4>
          <div class="deleted-list"></div>
        `;
    
        // 添加自定义站点
        bodyEl.querySelector(`.${NS}-btn-primary`).addEventListener('click', () => {
          const name = bodyEl.querySelector('.cs-name').value.trim();
          const url = bodyEl.querySelector('.cs-url').value.trim();
          if (!name || !url) { showToast('❌ 名称和 URL 不能为空'); return; }
          const newSite = {
            id: 'custom_' + Date.now(),
            name, icon: '🔗', color: '#6366f1',
            category: '自定义', baseUrl: url,
            functions: [{ name: '首页', url }]
          };
          cfg.customSites.push(newSite);
          saveCfg(cfg);
          showToast('✅ 已添加自定义站点：' + name);
          bodyEl.querySelector('.cs-name').value = '';
          bodyEl.querySelector('.cs-url').value = '';
        });
    
        // 导出
        bodyEl.querySelector('.export-btn').addEventListener('click', () => {
          const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'devnav-config.json';
          a.click();
          URL.revokeObjectURL(a.href);
          showToast('✅ 配置已导出');
        });
    
        // 导入
        bodyEl.querySelector('.import-btn').addEventListener('click', () => {
          const input = document.createElement('input');
          input.type = 'file'; input.accept = '.json';
          input.onchange = e => {
            const f = e.target.files[0]; if (!f) return;
            const reader = new FileReader();
            reader.onload = ev => {
              try {
                const imported = JSON.parse(ev.target.result);
                cfg = Object.assign(cfg, imported);
                saveCfg(cfg);
                showToast('✅ 配置已导入');
                renderSettings();
              } catch(err) { showToast('❌ 导入失败：无效的 JSON 文件'); }
            };
            reader.readAsText(f);
          };
          input.click();
        });
    
        // 页面学习
        bodyEl.querySelector('.learn-btn').addEventListener('click', () => {
          const links = Array.from(document.querySelectorAll('a[href]')).map(a => ({
            href: a.href, text: (a.textContent || '').trim().substring(0, 60)
          })).filter(l => l.href.startsWith('http')).slice(0, 30);
    
          if (links.length === 0) { showToast('⚠️ 未找到任何链接'); return; }
    
          const learned = links.slice(0, 30).map((l, i) => ({
            id: `learned_${Date.now()}_${i}`,
            name: l.text || new URL(l.href).hostname,
            icon: '🔗', color: '#8b5cf6',
            category: '学习', baseUrl: l.href,
            functions: [{ name: '访问', url: l.href }]
          }));
    
          cfg.learnedSites = [...cfg.learnedSites, ...learned];
          saveCfg(cfg);
          showToast(`✅ 已学习 ${learned.length} 个链接`);
          renderSettings();
        });
    
        // 已删除列表
        const delList = bodyEl.querySelector('.deleted-list');
        if (cfg.deletedSiteIds.length > 0) {
          delList.innerHTML = cfg.deletedSiteIds.map(id => {
            const site = BUILTIN_SITES.find(s => s.id === id);
            return site ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid #f0f0f0;">
              <span>${site.icon} ${site.name}</span>
              <button class="${NS}-btn-xs restore-btn" data-id="${id}" style="color:#22c55e;border-color:#22c55e;">恢复</button>
            </div>` : '';
          }).join('');
          delList.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              cfg.deletedSiteIds = cfg.deletedSiteIds.filter(id => id !== btn.dataset.id);
              saveCfg(cfg);
              showToast('✅ 已恢复站点');
              renderSettings();
            });
          });
        } else {
          delList.innerHTML = '<p style="color:#aaa;font-size:13px;">无</p>';
        }
      }
    
      // ---- 编辑弹窗 ----
      function openEditModal(siteId) {
        const allSites = getAllSites();
        const site = allSites.find(s => s.id === siteId);
        if (!site) return;
    
        const isCustomOrLearned = !BUILTIN_SITES.find(s => s.id === siteId) ||
          cfg.customSites.some(s => s.id === siteId) ||
          cfg.learnedSites.some(s => s.id === siteId);
    
        const overlay = document.createElement('div');
        overlay.className = `${NS}-modal-overlay`;
        overlay.innerHTML = `
          <div class="${NS}-modal">
            <div class="${NS}-modal-title">✏️ 编辑站点：${site.name}</div>
            <div class="${NS}-form-group">
              <label class="${NS}-form-label">名称</label>
              <input class="${NS}-form-input edit-name" value="${site.name}">
            </div>
            <div class="${NS}-form-group">
              <label class="${NS}-form-label">Base URL</label>
              <input class="${NS}-form-input edit-url" value="${site.baseUrl}">
            </div>
            <div class="${NS}-form-group">
              <label class="${NS}-form-label">图标 Emoji / URL</label>
              <input class="${NS}-form-input edit-icon" value="${site.icon}">
            </div>
            <div class="${NS}-form-group">
              <label class="${NS}-form-label">颜色</label>
              <input class="${NS}-form-input edit-color" value="${site.color}" type="color">
            </div>
            <div class="${NS}-form-group">
              <label class="${NS}-form-label">分类</label>
              <input class="${NS}-form-input edit-category" value="${site.category}">
            </div>
            <div class="${NS}-modal-footer">
              ${isCustomOrLearned ? `<button class="${NS}-btn ${NS}-btn-danger delete-btn">🗑️ 删除此站点</button>` : ''}
              <div style="display:flex;gap:8px;">
                <button class="${NS}-btn ${NS}-btn-secondary cancel-btn">取消</button>
                <button class="${NS}-btn ${NS}-btn-primary save-btn">保存</button>
              </div>
            </div>
          </div>
        `;
    
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
        document.body.appendChild(overlay);
    
        overlay.querySelector('.cancel-btn').addEventListener('click', () => overlay.remove());
        overlay.querySelector('.save-btn').addEventListener('click', () => {
          const updates = {
            name: overlay.querySelector('.edit-name').value.trim(),
            baseUrl: overlay.querySelector('.edit-url').value.trim(),
            icon: overlay.querySelector('.edit-icon').value.trim(),
            color: overlay.querySelector('.edit-color').value,
            category: overlay.querySelector('.edit-category').value.trim()
          };
          if (!updates.name || !updates.baseUrl) { showToast('❌ 名称和 URL 不能为空'); return; }
    
          if (isCustomOrLearned) {
            // 直接修改自定义/学习站点
            const arr = cfg.customSites.some(s => s.id === siteId) ? cfg.customSites : cfg.learnedSites;
            const target = arr.find(s => s.id === siteId);
            if (target) Object.assign(target, updates);
          } else {
            // 内置站点用覆盖方式
            cfg.editedSites[siteId] = updates;
          }
          saveCfg(cfg);
          showToast('✅ 站点已更新');
          overlay.remove();
          if (currentTab === 'library') renderLibrary();
        });
    
        if (isCustomOrLearned) {
          overlay.querySelector('.delete-btn').addEventListener('click', () => {
            cfg.customSites = cfg.customSites.filter(s => s.id !== siteId);
            cfg.learnedSites = cfg.learnedSites.filter(s => s.id !== siteId);
            cfg.pinnedFunctionIds = cfg.pinnedFunctionIds.filter(id => !id.startsWith(siteId + '::'));
            delete cfg.expandedSites[siteId];
            saveCfg(cfg);
            showToast(`🗑️「${site.name}」已删除`);
            overlay.remove();
            if (currentTab === 'library') renderLibrary();
          });
        }
      }
    
      // ---- 悬浮球拖拽 ----
      let dragging = false, dragStart = { x: 0, y: 0 }, dragOrig = { right: 0, bottom: 0 };
      ball.addEventListener('mousedown', e => {
        dragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
        dragOrig = { right: parseInt(ball.style.right), bottom: parseInt(ball.style.bottom) };
        e.preventDefault();
      });
      document.addEventListener('mousemove', e => {
        if (!dragging) return;
        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;
        ball.style.right = Math.max(0, dragOrig.right - dx) + 'px';
        ball.style.bottom = Math.max(0, dragOrig.bottom + dy) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        cfg.ballPosition = { right: parseInt(ball.style.right), bottom: parseInt(ball.style.bottom) };
        saveCfg(cfg);
      });
    
      // ---- 键盘快捷键 ----
      document.addEventListener('keydown', e => {
        if ((e.altKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
          e.preventDefault();
          togglePanel();
        }
        if (e.key === 'Escape' && isPanelOpen) {
          closePanel();
        }
      });
    
      // ---- 初始渲染 ----
      renderBody();
    
      return {
        ok: true,
        summary: 'DevNav v2.5.1 已启动（面板初始化修复版）',
        siteCount: getAllSites().length,
        fixes: ['panel-init-hidden: 面板创建后立即 display:none', 'css-default-none: CSS 默认值改为 display:none'],
        newFeatures: ['restore-expand-collapse-list', 'delete-in-edit-modal', 'search-realtime', 'panel-default-closed']
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();