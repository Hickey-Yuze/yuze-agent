(function () {
  'use strict';

  // ===== 配置 =====
  const BASE_URL = 'https://oa.jlu.edu.cn/defaultroot/PortalInformation!jldxList.action';
  const CHANNEL_ID = '179577';
  const ONE_MONTH_AGO = new Date();
  ONE_MONTH_AGO.setMonth(ONE_MONTH_AGO.getMonth() - 1);
  ONE_MONTH_AGO.setHours(0, 0, 0, 0);

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function resolveNoticeUrl(href) {
    try {
      const url = new URL(href, BASE_URL);
      return /^https?:$/.test(url.protocol) ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ===== 1. 从HTML字符串中提取通知列表 =====
  function parseNoticesFromHtml(html) {
    const notices = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const links = doc.querySelectorAll('a[href*="getInformation.action"]');
    
    links.forEach(link => {
      const href = link.getAttribute('href') || '';
      if (!href.includes(`channelId=${CHANNEL_ID}`)) return;
      const noticeUrl = resolveNoticeUrl(href);
      if (!noticeUrl) return;
      const titleText = link.textContent.trim();
      if (!titleText) return;
      
      let container = link.parentElement;
      for (let i = 0; i < 8 && container; i++) {
        const text = container.textContent || '';
        if (text.match(/\d{4}-\d{2}-\d{2}/) || text.includes('今天') || text.includes('昨天')) break;
        container = container.parentElement;
      }
      
      const containerText = container ? container.textContent : '';
      
      let org = '';
      if (container) {
        const orgLinks = container.querySelectorAll('a[href*="orgname="]');
        if (orgLinks.length > 0) org = orgLinks[orgLinks.length - 1].textContent.trim();
      }
      
      let dateStr = '';
      const dateMatch = containerText.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) { dateStr = dateMatch[1]; }
      else if (containerText.includes('今天')) { dateStr = todayStr(); }
      else if (containerText.includes('昨天')) {
        const yd = new Date(); yd.setDate(yd.getDate()-1);
        dateStr = `${yd.getFullYear()}-${String(yd.getMonth()+1).padStart(2,'0')}-${String(yd.getDate()).padStart(2,'0')}`;
      }
      
      const displayTitle = titleText.replace(/^\[置顶\]/, '').trim();
      const isPinned = titleText.startsWith('[置顶]');
      
      notices.push({
        id: href.match(/id=(\d+)/)?.[1] || '',
        title: displayTitle,
        fullTitle: titleText,
        org: org,
        date: dateStr,
        url: noticeUrl,
        isPinned: isPinned
      });
    });
    
    return notices;
  }

  // ===== 2. 解析日期为标准格式 =====
  function normalizeDate(dateStr) {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}\s/.test(dateStr)) return dateStr.split(' ')[0];
    if (dateStr.includes('今天')) return todayStr();
    if (dateStr.includes('昨天')) {
      const d = new Date(); d.setDate(d.getDate()-1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    return null;
  }

  // ===== 3. 自动翻页爬取所有近一月数据 =====
  async function fetchAllNotices() {
    const allNotices = [];
    let page = 1;
    let reachedOldDate = false;
    const MAX_PAGES = 60;
    
    while (!reachedOldDate && page <= MAX_PAGES) {
      try {
        const url = `${BASE_URL}?1=1&channelId=${CHANNEL_ID}&startPage=${page}`;
        const resp = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!resp.ok) break;
        const html = await resp.text();
        const pageNotices = parseNoticesFromHtml(html);
        if (pageNotices.length === 0) break;
        
        for (const n of pageNotices) {
          const nd = normalizeDate(n.date);
          if (nd && new Date(nd) < ONE_MONTH_AGO) { reachedOldDate = true; break; }
          allNotices.push(n);
        }
        page++;
        await new Promise(r => setTimeout(r, 200));
      } catch(e) {
        console.warn(`[JLU] Page ${page} error:`, e.message); break;
      }
    }
    return allNotices;
  }

  // ===== 4. 渲染交互式日历（含筛选+搜索） =====
  function renderCalendar(notices) {
    const existing = document.getElementById('jlu-notice-calendar-full');
    if (existing) existing.remove();

    // 去重
    const seen = new Set();
    const uniqueNotices = notices.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; });

    // 按日期分组（原始数据）
    const rawByDate = {};
    uniqueNotices.forEach(n => {
      const d = normalizeDate(n.date);
      if (d) { if (!rawByDate[d]) rawByDate[d] = []; rawByDate[d].push(n); }
    });

    const dates = Object.keys(rawByDate).sort();
    if (dates.length === 0) { alert('未找到近一个月的校内通知数据'); return; }

    const latest = new Date(dates[dates.length - 1]);
    const showYear = latest.getFullYear();
    const showMonth = latest.getMonth();

    const firstDay = new Date(showYear, showMonth, 1);
    const lastDay = new Date(showYear, showMonth + 1, 0);
    const startDow = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const now = new Date();
    const todayKey = todayStr();

    // 收集所有部门标签（按出现次数排序）
    const orgCountMap = {};
    uniqueNotices.forEach(n => { if (n.org) orgCountMap[n.org] = (orgCountMap[n.org] || 0) + 1; });
    const sortedOrgs = Object.entries(orgCountMap).sort((a, b) => b[1] - a[1]);

    // 筛选状态
    const filterState = {
      searchText: '',
      selectedOrgs: new Set(),
      get filteredNotices() {
        return uniqueNotices.filter(n => {
          // 搜索过滤
          if (this.searchText) {
            const q = this.searchText.toLowerCase();
            const matchTitle = (n.title || '').toLowerCase().includes(q);
            const matchOrg = (n.org || '').toLowerCase().includes(q);
            if (!matchTitle && !matchOrg) return false;
          }
          // 标签过滤
          if (this.selectedOrgs.size > 0 && !this.selectedOrgs.has(n.org)) return false;
          return true;
        });
      },
      get filteredByDate() {
        const bd = {};
        this.filteredNotices.forEach(n => {
          const d = normalizeDate(n.date);
          if (d) { if (!bd[d]) bd[d] = []; bd[d].push(n); }
        });
        return bd;
      }
    };

    // 创建容器
    const container = document.createElement('div');
    container.id = 'jlu-notice-calendar-full';
    container.innerHTML = `
      <style>
        #jlu-notice-calendar-full {
          position: fixed; top: 12px; right: 12px; width: 560px; max-width: calc(100vw - 24px); max-height: calc(100vh - 24px);
          box-sizing: border-box; background: #f8fbff; border: 1px solid #bfdbfe;
          border-radius: 16px; box-shadow: 0 24px 64px rgba(30, 64, 175, 0.2), 0 4px 16px rgba(15, 23, 42, 0.1);
          z-index: 999999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
          overflow: hidden; animation: jluFullCalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex; flex-direction: column;
        }
        @keyframes jluFullCalIn { from { opacity: 0; transform: translateY(-20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }

        /* 头部 */
        .jf-header {
          padding: 20px 22px 16px; display: flex; align-items: center; justify-content: space-between;
          background: linear-gradient(135deg, #eff6ff, #dbeafe); border-bottom: 1px solid #bfdbfe;
          cursor: grab; user-select: none; flex-shrink: 0;
        }
        .jf-header:active { cursor: grabbing; }
        .jf-title-area h3 { color: #153e75; margin: 0; font-size: 19px; font-weight: 800; letter-spacing: 1px; }
        .jf-subtitle { color: #64748b; font-size: 12px; margin-top: 4px; }
        .jf-header-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .jf-show-all-btn {
          height: 34px; padding: 0 12px; border: 1px solid #93c5fd; border-radius: 8px;
          background: #fff; color: #1d4ed8; cursor: pointer; font-size: 12px; font-weight: 700;
          white-space: nowrap; transition: all 0.2s;
        }
        .jf-show-all-btn:hover { background: #eff6ff; border-color: #60a5fa; }
        .jf-show-all-btn.active { background: #2563eb; border-color: #2563eb; color: #fff; }
        .jf-close-btn {
          width: 34px; height: 34px; border: 1px solid #bfdbfe; border-radius: 50%; background: #fff;
          color: #52739b; cursor: pointer; font-size: 18px; transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .jf-close-btn:hover { background: #fef2f2; border-color: #fecaca; color: #dc2626; }

        /* 搜索栏 */
        .jf-search-bar {
          padding: 14px 18px 12px; display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .jf-search-input {
          box-sizing: border-box; width: 100%; height: 38px; border: 1px solid #bfdbfe; border-radius: 8px;
          background: #fff; color: #1e3a5f; font-size: 14px; padding: 0 13px 0 34px;
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
          font-family: inherit;
        }
        .jf-search-input::placeholder { color: #94a3b8; }
        .jf-search-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        .jf-search-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          color: #60a5fa; font-size: 14px; pointer-events: none;
        }
        .jf-search-wrap { position: relative; flex: 1; }
        .jf-clear-search {
          width: 28px; height: 28px; border: 1px solid #fecaca; border-radius: 50%;
          background: #fef2f2; color: #dc2626; cursor: pointer;
          font-size: 12px; display: none; align-items: center; justify-content: center;
          transition: background 0.15s; flex-shrink: 0;
        }
        .jf-clear-search:hover { background: #fee2e2; }
        .jf-clear-search.visible { display: flex; }

        /* 标签筛选栏 */
        .jf-filter-bar {
          padding: 0 18px 12px; flex-shrink: 0;
        }
        .jf-filter-label {
          color: #475569; font-size: 12px; font-weight: 700;
          margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;
        }
        .jf-filter-reset {
          color: #2563eb; background: none; border: none; cursor: pointer;
          font-size: 11px; padding: 3px 7px; border-radius: 6px; transition: all 0.15s;
        }
        .jf-filter-reset:hover { color: #1d4ed8; background: #dbeafe; }
        .jf-tags-wrap {
          display: flex; flex-wrap: wrap; gap: 6px; max-height: 105px; overflow-y: auto;
          padding-right: 4px;
        }
        .jf-tags-wrap::-webkit-scrollbar { width: 3px; }
        .jf-tags-wrap::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 2px; }
        .jf-tag-pill {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 10px; border-radius: 14px; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; border: 1px solid #dbeafe;
          white-space: nowrap; max-width: 180px;
          background: #eff6ff; color: #355879;
        }
        .jf-tag-pill:hover { background: #dbeafe; color: #1d4ed8; border-color: #93c5fd; }
        .jf-tag-pill.active {
          background: #2563eb; color: #fff; border-color: #2563eb;
          box-shadow: 0 2px 8px rgba(37,99,235,0.24);
        }
        .jf-tag-count {
          font-size: 9px; opacity: 0.75; background: rgba(37,99,235,0.1);
          padding: 0 5px; border-radius: 8px;
        }
        .jf-tag-pill.active .jf-tag-count { background: rgba(255,255,255,0.2); opacity: 1; }
        .jf-filter-hint {
          color: #94a3b8; font-size: 11px; text-align: center; padding: 7px 0;
        }

        /* 星期 */
        .jf-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); padding: 9px 14px 5px; gap: 3px; background: #eff6ff; border-top: 1px solid #dbeafe; flex-shrink: 0; }
        .jf-wd { text-align: center; color: #64748b; font-size: 12px; font-weight: 700; padding: 4px 0; }

        /* 日历网格 */
        .jf-grid { display: grid; grid-template-columns: repeat(7, 1fr); padding: 7px 12px 11px; gap: 5px; background: #fff; flex-shrink: 0; }
        .jf-day {
          height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center;
          border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.15s;
          position: relative; color: #294766; background: transparent; border: 1px solid transparent;
        }
        .jf-day:hover { background: #eff6ff; border-color: #bfdbfe; transform: translateY(-1px); }
        .jf-day.om { color: #cbd5e1; }
        .jf-day.today { background: #2563eb !important; color: #fff !important; font-weight: 800; box-shadow: 0 4px 12px rgba(37,99,235,0.28); }
        .jf-day.has-n::after {
          content: ''; position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%);
          width: 5px; height: 5px; background: #0ea5e9; border-radius: 50%; box-shadow: 0 0 5px rgba(14,165,233,0.35);
        }
        .jf-day.sel { background: #dbeafe !important; color: #1d4ed8 !important; box-shadow: inset 0 0 0 2px #3b82f6; }
        .jf-day.today.sel { background: #2563eb !important; color: #fff !important; }
        .jf-count-badge {
          position: absolute; top: 1px; right: 2px; font-size: 8px; font-weight: 800;
          background: #0284c7; color: #fff; border-radius: 6px; padding: 0 3px; min-width: 14px; text-align: center; line-height: 12px;
        }

        /* 详情区 */
        .jf-detail { max-height: 320px; overflow-y: auto; background: #f8fbff; border-top: 1px solid #dbeafe; flex-shrink: 1; min-height: 90px; }
        .jf-dh {
          padding: 12px 18px 8px; display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; background: rgba(248,251,255,0.97); border-bottom: 1px solid #e2e8f0; z-index: 2;
        }
        .jf-dt { color: #1d4ed8; font-size: 14px; font-weight: 800; }
        .jf-dc { color: #64748b; font-size: 12px; }
        .jf-list { padding: 8px 12px 14px; }
        .jf-item {
          background: #fff; border-radius: 8px; padding: 11px 13px; margin-bottom: 7px;
          transition: all 0.15s; border: 1px solid #e2e8f0; border-left: 3px solid transparent; animation: jluItemIn 0.25s ease both;
        }
        @keyframes jluItemIn { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        .jf-item:hover { background: #eff6ff; border-color: #bfdbfe; border-left-color: #2563eb; }
        .jf-ititle { display: block; color: #1e3a5f; font-size: 13px; line-height: 1.6; cursor: pointer; word-break: break-all; text-decoration: none; transition: color 0.15s; }
        .jf-ititle:hover { color: #2563eb; }
        .jf-imeta { display: flex; align-items: center; gap: 7px; margin-top: 6px; flex-wrap: wrap; }
        .jf-tag {
          display: inline-block; background: #dbeafe;
          color: #1d4ed8; font-size: 10px; padding: 2px 8px; border-radius: 8px; font-weight: 700;
          white-space: nowrap; max-width: 120px; overflow: hidden; text-overflow: ellipsis;
        }
        .jf-tag.pin { background: #fef3c7; color: #a16207; }
        .jf-time { color: #94a3b8; font-size: 10px; }
        .jf-empty { text-align: center; padding: 30px 14px; color: #94a3b8; font-size: 12px; }

        /* 统计 */
        .jf-stats { padding: 12px 16px; background: #eff6ff; display: flex; justify-content: space-around; border-top: 1px solid #dbeafe; flex-shrink: 0; }
        .jf-st { text-align: center; }
        .jf-stn { color: #1d4ed8; font-size: 18px; font-weight: 900; }
        .jf-stl { color: #64748b; font-size: 10px; margin-top: 2px; }
        .jf-progress { padding: 7px 18px 11px; background: #fff; border-top: 1px solid #dbeafe; flex-shrink: 0; }
        .jf-pbar { height: 4px; background: #dbeafe; border-radius: 2px; overflow: hidden; }
        .jf-pfill { height: 100%; background: linear-gradient(90deg, #2563eb, #38bdf8); border-radius: 2px; transition: width 0.4s; }
        .jf-ptext { color: #64748b; font-size: 10px; margin-top: 4px; text-align: center; }

        .jf-detail::-webkit-scrollbar { width: 4px; }
        .jf-detail::-webkit-scrollbar-track { background: transparent; }
        .jf-detail::-webkit-scrollbar-thumb { background: #bfdbfe; border-radius: 2px; }

        @media (max-width: 480px) {
          .jf-header { padding: 14px; }
          .jf-title-area h3 { font-size: 16px; }
          .jf-subtitle { display: none; }
          .jf-show-all-btn { width: 34px; padding: 0; font-size: 0; }
          .jf-show-all-btn::before { content: '☰'; font-size: 16px; }
          .jf-show-all-btn.active::before { content: '←'; }
        }
      </style>

      <!-- 头部 -->
      <div class="jf-header">
        <div class="jf-title-area">
          <h3>📅 校内通知日历</h3>
          <div class="jf-subtitle" id="jf-subtitle">正在加载数据...</div>
        </div>
        <div class="jf-header-actions">
          <button class="jf-show-all-btn" id="jf-show-all" type="button" title="查看当前筛选条件下的全部公告">☰ 查看全部公告</button>
          <button class="jf-close-btn" type="button" aria-label="关闭面板" onclick="document.getElementById('jlu-notice-calendar-full').remove()">×</button>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="jf-search-bar">
        <div class="jf-search-wrap">
          <span class="jf-search-icon">🔍</span>
          <input type="text" class="jf-search-input" id="jf-search" placeholder="搜索标题或部门..." />
        </div>
        <button class="jf-clear-search" id="jf-clear-search" title="清除搜索">✕</button>
      </div>

      <!-- 标签筛选栏 -->
      <div class="jf-filter-bar" id="jf-filter-bar">
        <div class="jf-filter-label">
          <span>🏷️ 部门筛选</span>
          <button class="jf-filter-reset" id="jf-reset-filters">重置全部</button>
        </div>
        <div class="jf-tags-wrap" id="jf-tags-wrap"></div>
        <div class="jf-filter-hint" id="jf-filter-hint" style="display:none;"></div>
      </div>

      <!-- 星期 -->
      <div class="jf-weekdays">
        <div class="jf-wd">日</div><div class="jf-wd">一</div><div class="jf-wd">二</div><div class="jf-wd">三</div><div class="jf-wd">四</div><div class="jf-wd">五</div><div class="jf-wd">六</div>
      </div>

      <!-- 日历网格 -->
      <div class="jf-grid" id="jf-days"></div>

      <!-- 详情 -->
      <div class="jf-detail" id="jf-detail"></div>

      <!-- 统计 -->
      <div class="jf-stats" id="jf-stats"></div>

      <!-- 进度条 -->
      <div class="jf-progress"><div class="jf-pbar"><div class="jf-pfill" id="jf-pfill" style="width:0%"></div></div><div class="jf-ptext" id="jf-ptext"></div></div>
    `;

    document.body.appendChild(container);

    // 更新副标题
    document.getElementById('jf-subtitle').textContent =
      `${showYear}年${showMonth+1}月 · ${dates[0]} ~ ${dates[dates.length-1]} · 支持搜索与标签筛选`;

    // ===== 渲染部门标签 =====
    function renderTags() {
      const wrap = document.querySelector('#jf-tags-wrap');
      const hint = document.querySelector('#jf-filter-hint');
      
      // 计算每个标签在当前搜索条件下的数量
      const searchFiltered = filterState.searchText ? uniqueNotices.filter(n => {
        const q = filterState.searchText.toLowerCase();
        return (n.title||'').toLowerCase().includes(q) || (n.org||'').toLowerCase().includes(q);
      }) : uniqueNotices;

      const currentOrgCounts = {};
      searchFiltered.forEach(n => { if (n.org) currentOrgCounts[n.org] = (currentOrgCounts[n.org]||0)+1; });
      
      // 只显示有匹配结果的标签
      const visibleOrgs = sortedOrgs.filter(([o]) => currentOrgCounts[o] > 0);

      if (visibleOrgs.length === 0) {
        wrap.innerHTML = '';
        hint.style.display = 'block';
        hint.textContent = filterState.searchText ? '无匹配的部门标签' : '';
        return;
      }
      hint.style.display = 'none';

      wrap.innerHTML = visibleOrgs.map(([org, totalCnt]) => {
        const cnt = currentOrgCounts[org] || 0;
        const isActive = filterState.selectedOrgs.has(org);
        return `<button class="jf-tag-pill ${isActive?'active':''}" data-org="${org}" title="${org} · ${cnt}条">
          <span style="overflow:hidden;text-overflow:ellipsis;max-width:110px;display:block;">${org}</span>
          <span class="jf-tag-count">${cnt}</span>
        </button>`;
      }).join('');

      // 绑定点击事件
      wrap.querySelectorAll('.jf-tag-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const org = pill.dataset.org;
          if (filterState.selectedOrgs.has(org)) {
            filterState.selectedOrgs.delete(org);
          } else {
            filterState.selectedOrgs.add(org);
          }
          refreshAll();
        });
      });
    }

    // ===== 渲染日历格子 =====
    function renderDays(fbd) {
      const daysGrid = document.querySelector('#jf-days');
      daysGrid.innerHTML = '';
      const todayNum = now.getDate();

      // 空白填充
      for (let i = 0; i < startDow; i++) {
        const b = document.createElement('button'); b.className = 'jf-day om'; b.disabled = true; b.textContent = '';
        daysGrid.appendChild(b);
      }

      // 日期按钮
      for (let d = 1; d <= daysInMonth; d++) {
        const dk = `${showYear}-${String(showMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const items = fbd[dk] || [];
        const b = document.createElement('button');
        b.className = 'jf-day';
        b.dataset.date = dk;
        b.innerHTML = `<span>${d}</span>`;

        if (d === todayNum && showMonth === now.getMonth()) b.classList.add('today');
        if (items.length > 0) {
          b.classList.add('has-n');
          if (items.length > 1) {
            const badge = document.createElement('span');
            badge.className = 'jf-count-badge';
            badge.textContent = items.length > 9 ? '9+' : items.length;
            b.appendChild(badge);
          }
        }

        b.addEventListener('click', () => {
          showingAll = false;
          updateViewButton();
          selectDate(dk, fbd);
        });
        daysGrid.appendChild(b);
      }
    }

    // ===== 渲染统计 =====
    function renderStats(filteredCount) {
      const pinnedCnt = filterState.filteredNotices.filter(n => n.isPinned).length;
      const orgSet = new Set(filterState.filteredNotices.map(n => n.org).filter(Boolean));
      const fDates = Object.keys(filterState.filteredByDate).length;

      document.getElementById('jf-stats').innerHTML = `
        <div class="jf-st"><div class="jf-stn">${filteredCount}</div><div class="jf-stl">筛选结果</div></div>
        <div class="jf-st"><div class="jf-stn">${fDates}</div><div class="jf-stl">有通知天数</div></div>
        <div class="jf-st"><div class="jf-stn">${pinnedCnt}</div><div class="jf-stl">置顶通知</div></div>
        <div class="jf-st"><div class="jf-stn">${orgSet.size}</div><div class="jf-stl">涉及部门</div></div>
      `;

      const pct = Math.round((fDates / daysInMonth) * 100);
      document.getElementById('jf-pfill').style.width = pct + '%';
      document.getElementById('jf-ptext').textContent =
        filterState.searchText || filterState.selectedOrgs.size > 0
          ? `筛选后 ${fDates}/${daysInMonth} 天有通知`
          : `本月 ${fDates}/${daysInMonth} 天有通知`;
    }

    function renderNoticeList(items, showDate) {
      return `
        <div class="jf-list">
          ${items.map((n, i) => `
            <div class="jf-item" style="animation-delay:${Math.min(i*0.04,0.3)}s">
              <a class="jf-ititle" href="${escapeHtml(n.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(n.fullTitle)}">
                ${n.isPinned ? '<span style="color:#d97706;margin-right:3px;">📌</span>' : ''}
                ${escapeHtml(n.title)}
              </a>
              <div class="jf-imeta">
                ${n.org ? `<span class="jf-tag ${n.isPinned?'pin':''}" title="${escapeHtml(n.org)}">${escapeHtml(n.org)}</span>` : ''}
                ${showDate && n.date ? `<span class="jf-time">${escapeHtml(normalizeDate(n.date) || n.date)}</span>` : ''}
                ${!showDate && n.date && n.date.includes(':') ? `<span class="jf-time">${escapeHtml(n.date.split(' ')[1] || '')}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // ===== 刷新全部视图 =====
    let currentSelectedDate = null;
    let showingAll = false;

    function updateViewButton() {
      const button = document.getElementById('jf-show-all');
      if (!button) return;
      button.classList.toggle('active', showingAll);
      button.textContent = showingAll ? '← 返回日历' : '☰ 查看全部公告';
      button.title = showingAll ? '返回按日期查看' : '查看当前筛选条件下的全部公告';
    }

    function refreshAll() {
      const fbd = filterState.filteredByDate;
      renderTags();
      renderDays(fbd);
      renderStats(filterState.filteredNotices.length);
      updateViewButton();

      if (showingAll) {
        renderAllNotices();
        return;
      }

      // 保持选中日期或选最新
      const sel = currentSelectedDate && fbd[currentSelectedDate] ? currentSelectedDate :
                   (fbd[todayKey] ? todayKey : (Object.keys(fbd).sort().pop() || ''));
      selectDate(sel, fbd);
    }

    // ===== 展示当前筛选条件下的全部公告 =====
    function renderAllNotices() {
      document.querySelectorAll('.jf-day').forEach(b => b.classList.remove('sel'));
      const detailEl = document.querySelector('#jf-detail');
      const items = filterState.filteredNotices.slice().sort((a, b) => {
        return String(normalizeDate(b.date) || '').localeCompare(String(normalizeDate(a.date) || ''));
      });

      if (!items.length) {
        detailEl.innerHTML = '<div class="jf-empty">📭 当前筛选条件下没有公告</div>';
        return;
      }

      detailEl.innerHTML = `
        <div class="jf-dh">
          <span class="jf-dt">☰ 全部公告</span>
          <span class="jf-dc">${items.length} 条公告</span>
        </div>
        ${renderNoticeList(items, true)}
      `;
    }

    // ===== 选中日期展示详情 =====
    function selectDate(dateKey, byDate) {
      currentSelectedDate = dateKey;
      document.querySelectorAll('.jf-day').forEach(b => {
        b.classList.toggle('sel', b.dataset.date === dateKey);
      });

      const detailEl = document.querySelector('#jf-detail');
      const items = byDate[dateKey] || [];

      if (!items.length) {
        detailEl.innerHTML = `<div class="jf-empty">📭 ${dateKey} 无匹配通知</div>`;
        return;
      }

      const dow = ['周日','周一','周二','周三','周四','周五','周六'];
      const dobj = new Date(dateKey.replace(/-/g, '/'));

      detailEl.innerHTML = `
        <div class="jf-dh">
          <span class="jf-dt">📋 ${dateKey} ${dow[dobj.getDay()]}</span>
          <span class="jf-dc">${items.length} 条通知</span>
        </div>
        ${renderNoticeList(items, false)}
      `;
    }

    // ===== 搜索事件绑定 =====
    const searchInput = document.getElementById('jf-search');
    const clearBtn = document.getElementById('jf-clear-search');
    const showAllBtn = document.getElementById('jf-show-all');

    showAllBtn.addEventListener('click', () => {
      showingAll = !showingAll;
      refreshAll();
    });

    searchInput.addEventListener('input', () => {
      filterState.searchText = searchInput.value.trim();
      clearBtn.classList.toggle('visible', !!filterState.searchText);
      refreshAll();
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      filterState.searchText = '';
      clearBtn.classList.remove('visible');
      refreshAll();
      searchInput.focus();
    });

    // 重置全部筛选
    document.getElementById('jf-reset-filters').addEventListener('click', () => {
      filterState.searchText = '';
      filterState.selectedOrgs.clear();
      searchInput.value = '';
      clearBtn.classList.remove('visible');
      refreshAll();
    });

    // ===== 拖拽移动 =====
    (function makeDraggable(el) {
      const header = el.querySelector('.jf-header');
      if (!header) return;
      let isDragging = false, startX = 0, startY = 0, origLeft = 0, origTop = 0;

      function onMouseDown(e) {
        if (e.target.closest('.jf-close-btn')) return;
        // 不拦截搜索框和标签的点击
        if (e.target.closest('.jf-search-bar') || e.target.closest('.jf-filter-bar')) return;
        isDragging = true;
        startX = e.clientX; startY = e.clientY;
        const rect = el.getBoundingClientRect();
        origLeft = rect.left; origTop = rect.top;
        el.style.position = 'fixed';
        el.style.left = origLeft + 'px'; el.style.top = origTop + 'px';
        el.style.right = 'auto'; el.style.margin = '0';
        el.style.transition = 'none';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
      }

      function onMouseMove(e) {
        if (!isDragging) return;
        const dx = e.clientX - startX, dy = e.clientY - startY;
        let nl = origLeft + dx, nt = origTop + dy;
        nl = Math.max(0, Math.min(nl, window.innerWidth - el.offsetWidth));
        nt = Math.max(0, Math.min(nt, window.innerHeight - el.offsetHeight));
        el.style.left = nl + 'px'; el.style.top = nt + 'px';
      }

      function onMouseUp() {
        isDragging = false; el.style.transition = '';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      }

      header.addEventListener('mousedown', onMouseDown);

      // 触摸支持
      let tSX=0, tSY=0, tOL=0, tOT=0;
      header.addEventListener('touchstart', function(e) {
        if (e.target.closest('.jf-close-btn') || e.target.closest('.jf-search-bar') || e.target.closest('.jf-filter-bar')) return;
        const t=e.touches[0]; isDragging=true; tSX=t.clientX; tSY=t.clientY;
        const r=el.getBoundingClientRect(); tOL=r.left; tOT=r.top;
        el.style.position='fixed'; el.style.left=tOL+'px'; el.style.top=tOT+'px';
        el.style.right='auto'; el.style.margin='0'; el.style.transition='none';
        e.preventDefault();
      }, {passive:false});

      document.addEventListener('touchmove', function(e) {
        if(!isDragging)return; const t=e.touches[0];
        let nl=tOL+t.clientX-tSX, nt=tOT+t.clientY-tSY;
        nl=Math.max(0,Math.min(nl,window.innerWidth-el.offsetWidth));
        nt=Math.max(0,Math.min(nt,window.innerHeight-el.offsetHeight));
        el.style.left=nl+'px';el.style.top=nt+'px';
      }, {passive:false});
      document.addEventListener('touchend', ()=>{isDragging=false;el.style.transition='';});
    })(container);

    // ===== 初始渲染 =====
    refreshAll();
  }

  // ===== 执行主流程 =====
  async function main() {
    try {
    const allNotices = [];

    // Loading提示
    const loadingDiv = document.createElement('div');
    loadingDiv.id = 'jlu-cal-loading';
    loadingDiv.style.cssText = `
      position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
      background:#fff;padding:30px 40px;border-radius:14px;
      color:#153e75;font-family:-apple-system,sans-serif;z-index:999998;
      text-align:center;box-shadow:0 24px 64px rgba(30,64,175,0.22);border:1px solid #bfdbfe;
    `;
    loadingDiv.innerHTML = '<div style="font-size:18px;font-weight:700;margin-bottom:9px;">⏳ 正在爬取近一个月全部通知...</div><div id="jlu-load-status" style="color:#64748b;font-size:12px;">正在获取第 1 页...</div>';
    document.body.appendChild(loadingDiv);

    // 始终从第 1 页抓取，使脚本可以在登录页及办公网其他页面运行。
    let page = 1;
    let fetchedPages = 0;
    let reachedOld = false;
    while (!reachedOld && page <= 60) {
      try {
        const url = `${BASE_URL}?1=1&channelId=${CHANNEL_ID}&startPage=${page}`;
        const resp = await fetch(url, { method: 'GET', credentials: 'include' });
        if (!resp.ok) break;
        const html = await resp.text();
        const pageItems = parseNoticesFromHtml(html);
        if (pageItems.length === 0) break;
        fetchedPages = page;
        let pageHasOld = false;
        for (const n of pageItems) {
          const nd = normalizeDate(n.date);
          if (nd && new Date(nd) < ONE_MONTH_AGO) { pageHasOld = true; break; }
          allNotices.push(n);
        }
        const statusEl = document.getElementById('jlu-load-status');
        if (statusEl) statusEl.textContent = `已获取前 ${page} 页，共 ${allNotices.length} 条...`;
        if (pageHasOld) { reachedOld = true; break; }
        page++;
        await new Promise(r => setTimeout(r, 220));
      } catch(e) { break; }
    }

    loadingDiv.remove();
    if (allNotices.length === 0) {
      throw new Error('未获取到校内通知，请确认当前页面可以访问吉林大学办公网');
    }
    renderCalendar(allNotices);

    return {
      ok: true,
      summary: `成功爬取 ${allNotices.length} 条通知并渲染含搜索+标签筛选的交互式日历`,
      data: {
        total_notices: allNotices.length,
        pages_fetched: fetchedPages,
        org_count: [...new Set(allNotices.map(n=>n.org).filter(Boolean))].length,
        features: ['拖拽移动','搜索标题/部门','部门标签筛选','多选标签','查看全部公告','一键重置']
      },
      warnings: []
    };
    } catch(err) {
      const loadingDiv = document.getElementById('jlu-cal-loading');
      if (loadingDiv) loadingDiv.remove();
      return { ok: false, summary: '执行出错: ' + err.message, warnings: [err.stack] };
    }
  }

  var initialization = main();
  return function () {
    return initialization;
  };
})();