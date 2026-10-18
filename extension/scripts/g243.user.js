(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"courses": ["新能源技术和应用"], "status": "all", "teachers": []};
  const __tabOriginalFunction = (
    async function run(args) {
      // ============================================
      // 厦大选课系统 - 校选课筛选脚本 v8 (修复版)
      // 核心修复: findAllCourseCards 兼容 el-table 表格结构
      // ============================================
    
      const DEFAULT_COURSES = ['西方古典神话', '爱情心理学', '新能源技术和应用'];
      const DEFAULT_TEACHERS = [];
      const DEFAULT_STATUS = 'all';
      const userCourses = args && args.courses ? args.courses : DEFAULT_COURSES;
      const userTeachers = args && args.teachers ? args.teachers : DEFAULT_TEACHERS;
      const userStatus = args && args.status ? args.status : DEFAULT_STATUS;
    
      // ====== 全局状态缓存 ======
      const _cache = {
        lastState: new Map(),
        filterKey: '',
        originalPageSize: null,
        hasExpandedPages: false,
        lastAvailableSet: new Set(),
        notifiedThisSession: new Set()
      };
    
      function getFilterKey(courses, teachers, status) {
        return JSON.stringify({ c: courses || [], t: teachers || [], s: status || 'all' });
      }
    
      // ---- 自动跨页展开 ----
      async function autoExpandAllPages() {
        const vue = window.grablessonsVue;
        if (!vue || !vue.pubParam) return false;
        try {
          if (_cache.originalPageSize === null) _cache.originalPageSize = vue.pubParam.pageSize;
          const totalNum = vue.pubParam.totalNumber || 0;
          if (totalNum <= vue.pubParam.pageSize) { _cache.hasExpandedPages = true; return true; }
          vue.pubParam.pageSize = Math.max(totalNum + 10, 200);
          vue.pubParam.pageNumber = 1;
          if (typeof vue.searchCourse === 'function') await vue.searchCourse();
          else if (typeof vue.initOperation === 'function') await vue.initOperation();
          else if (typeof vue.handleCurrentChange === 'function') vue.handleCurrentChange(1);
          _cache.hasExpandedPages = true;
          await new Promise(r => setTimeout(r, 800));
          return true;
        } catch(e) { console.error('[选课筛选器] 跨页展开失败:', e); return false; }
      }
    
      // ---- Toast 通知系统（保持不变）----
      let _toastContainer = null;
    
      function ensureToastContainer() {
        if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
        const c = document.createElement('div');
        c.id = 'xcf-toast-container';
        c.innerHTML = `<style>
          #xcf-toast-container{position:fixed;bottom:20px;left:20px;z-index:99998;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:360px}
          .xcf-toast{background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:12px 16px;border-radius:10px;font-size:13px;line-height:1.5;box-shadow:0 4px 16px rgba(16,185,129,.4);pointer-events:auto;cursor:pointer;animation:xcfIn .3s ease-out;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
          .xcf-toast:hover{opacity:.9;transform:translateY(-2px)}
          .xcf-toast .xcf-tt-title{font-weight:700;font-size:14px;margin-bottom:2px}
          .xcf-toast .xcf-tt-course{color:#d1fae5;font-weight:600}
          .xcf-toast .xcf-tt-teacher{color:#a7f3d0;font-size:12px}
          .xcf-toast .xcf-tt-time{color:rgba(255,255,255,.6);font-size:11px;margin-top:4px}
          .xcf-toast.xcf-fading{animation:xcfOut .4s ease-in forwards}
          @keyframes xcfIn{from{opacity:0;transform:translateX(-30px) scale(.95)}to{opacity:1;transform:translateX(0) scale(1)}}
          @keyframes xcfOut{from{opacity:1;transform:translateX(0) scale(1)}to{opacity:0;transform:translateX(-30px) scale(.95)}}
        </style>`;
        document.body.appendChild(c);
        _toastContainer = c;
        return c;
      }
    
      function showAvailableToast(courseName, teacherName, capacity, enrolled) {
        const container = ensureToastContainer();
        const key = courseName + '|' + teacherName;
        if (_cache.notifiedThisSession.has(key)) return;
        _cache.notifiedThisSession.add(key);
        const toast = document.createElement('div');
        toast.className = 'xcf-toast';
        toast.innerHTML = '<div class="xcf-tt-title">🎉 有名额了！快去抢！</div><div>课程：<span class="xcf-tt-course">' + courseName + '</span></div>' +
          (teacherName ? '<div>教师：<span class="xcf-tt-teacher">' + teacherName + '</span></div>' : '') +
          '<div style="margin-top:4px;font-size:12px;color:#d1fae5;">容量 ' + capacity + ' / 已选 ' + enrolled + ' — 点击关闭</div>' +
          '<div class="xcf-tt-time">' + new Date().toLocaleTimeString() + '</div>';
        toast.addEventListener('click', () => { toast.classList.add('xcf-fading'); setTimeout(() => toast.remove(), 400); });
        container.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) { toast.classList.add('xcf-fading'); setTimeout(() => toast.remove(), 400); } }, 8000);
      }
    
      // ==================== 核心修复：兼容 el-table 的课程查找 ====================
    
      // 检测页面是否为 el-table 结构
      function isElTablePage() {
        return !!document.querySelector('.el-table__body, .el-table');
      }
    
      // 【修复】从 el-table 行中提取字段 - 使用表头列映射
      function extractFromTableRow(rowEl, fieldName) {
        // 方法1: 在行内搜索包含目标文字的子元素
        const cells = rowEl.querySelectorAll('td');
        for (const cell of cells) {
          const text = cell.textContent.trim();
          // 检查是否是我们要找的字段值（排除太长或太短的文本）
          if (text && text.length > 1 && text.length < 60 && !text.includes('选择') && !text.includes('详情')) {
            // 对于课程名和教师名等关键字段，做更精确的匹配
            if (fieldName === '课程名称' && (
              /^[^\d\s][\u4e00-\u9fa5a-zA-Z0-9·\-\/]+$/.test(text) ||
              text.length >= 3
            )) return text;
            if (fieldName === '上课教师' && (
              /^[\u4e00-\u9fa5]{2,4}$/.test(text) ||
              (text.length >= 2 && text.length <= 6 && /^[\u4e00-\u9fa5]/.test(text))
            )) return text;
            if (fieldName === '课容量' && /^\d+$/.test(text)) return text;
            if (fieldName === '已选人数' && /^\d+$/.test(text)) return text;
          }
        }
        
        // 方法2: 正则从整行文本提取
        const rowText = rowEl.textContent;
        if (fieldName === '课程名称') {
          // 课程名通常在第一个或第二个非空单元格
          const m = rowText.match(/([^\s\d][\u4e00-\u9fa5a-zA-Z·\-\/]{3,30})/);
          return m ? m[1].trim() : '';
        }
        if (fieldName === '上课教师') {
          const m = rowText.match(/(?:教师|老师|授课)[\s:：]*([\u4e00-\u9fa5]{2,6})/);
          if (m) return m[1];
          // 尝试找2-4个汉字的名字
          const names = rowText.match(/(?<![课程号周次节次])([\u4e00-\u9fa5]{2,4})(?=[\s\d]|$)/g);
          if (names && names.length > 0) return names[names.length > 1 ? 1 : 0];
        }
        if (fieldName === '课容量') {
          const m = rowText.match(/容量[\s:：]*(\d+)/);
          if (m) return m[1];
          const caps = rowText.match(/(\d+)\s*[\/／]\s*(\d+)/);
          if (caps) return caps[1]; // 容量通常是第一个数字
        }
        if (fieldName === '已选人数') {
          const m = rowText.match(/(?:已选|选课|人数)[\s:：]*(\d+)/);
          if (m) return m[1];
          const caps = rowText.match(/(\d+)\s*[\/／]\s*(\d+)/);
          if (caps) return caps[2]; // 已选通常是第二个数字
        }
        return '';
      }
    
      // 【修复】查找所有课程 - 同时支持 el-table 和卡片两种布局
      function findAllCourseCards() {
        const cards = [];
        const seen = new Set();
    
        if (isElTablePage()) {
          // ====== el-table 模式 ======
          // 找所有包含"选择"按钮的表格行
          const selectBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === '选择');
    
          for (const btn of selectBtns) {
            // 从按钮向上找到最近的 tr
            let el = btn;
            let rowEl = null;
            for (let i = 0; i < 8; i++) {
              el = el.parentElement;
              if (!el) break;
              if (el.tagName === 'TR' || el.tagName === 'tr') { rowEl = el; break; }
            }
    
            if (!rowEl) continue;
    
            // 用行的唯一标识去重
            const rowKey = rowEl.querySelector('td:first-child') ? rowEl.querySelector('td:first-child').textContent.trim().slice(0, 20) : '';
            if (seen.has(rowEl) || seen.has(rowKey)) continue;
            seen.add(rowEl);
    
            const name = extractFromTableRow(rowEl, '课程名称');
            const teacher = extractFromTableRow(rowEl, '上课教师');
            const capacity = extractFromTableRow(rowEl, '课容量');
            const enrolled = extractFromTableRow(rowEl, '已选人数');
    
            cards.push({
              element: rowEl,
              name: name,
              teacher: teacher,
              capacity: capacity,
              enrolled: enrolled,
              isFull: checkIsFullRow(rowEl, capacity, enrolled)
            });
          }
    
          // 如果通过按钮没找到足够的行，尝试直接遍历所有数据行
          if (cards.length === 0) {
            const tbody = document.querySelector('.el-table__body tbody, .el-table__body');
            if (tbody) {
              const rows = tbody.querySelectorAll('tr');
              for (const row of rows) {
                if (seen.has(row)) continue;
                seen.add(row);
                const btnInRow = row.querySelector('button');
                if (!btnInRow) continue; // 跳过没有操作按钮的行（如空行）
    
                const name = extractFromTableRow(row, '课程名称');
                const teacher = extractFromTableRow(row, '上课教师');
                const capacity = extractFromTableRow(row, '课容量');
                const enrolled = extractFromTableRow(row, '已选人数');
    
                cards.push({
                  element: row,
                  name: name,
                  teacher: teacher,
                  capacity: capacity,
                  enrolled: enrolled,
                  isFull: checkIsFullRow(row, capacity, enrolled)
                });
              }
            }
          }
        } else {
          // ====== 原始卡片模式（兼容旧版页面）======
          const selectBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.trim() === '选择');
          for (const btn of selectBtns) {
            let el = btn, card = null;
            for (let i = 0; i < 15; i++) {
              el = el.parentElement;
              if (!el) break;
              if (el.textContent.includes('课程名称') && el.textContent.includes('课程号')) { card = el; break; }
            }
            if (card && !seen.has(card)) {
              seen.add(card);
              cards.push({
                element: card,
                name: extractFieldLegacy(card, '课程名称'),
                teacher: extractFieldLegacy(card, '上课教师'),
                capacity: extractFieldLegacy(card, '课容量'),
                enrolled: extractFieldLegacy(card, '已选人数'),
                isFull: checkIsFullLegacy(card)
              });
            }
          }
        }
    
        return cards;
      }
    
      // el-table 模式的满员检测
      function checkIsFullRow(rowEl, capStr, enrStr) {
        // 先检查文本中的"已满"标记
        if (rowEl.textContent.includes('已满')) return true;
        // 再用数字比较
        const cap = parseInt(capStr, 10);
        const enr = parseInt(enrStr, 10);
        if (!isNaN(cap) && !isNaN(enr) && enr >= cap) return true;
        // 检查是否有红色标记（Element UI 中已满通常标红）
        const redCells = rowEl.querySelectorAll('.cell[style*="red"], [class*="danger"], [style*="color:red"]');
        if (redCells.length > 0) return true;
        return false;
      }
    
      // 卡片模式的字段提取（保留原逻辑）
      function extractFieldLegacy(card, fieldName) {
        const children = card.querySelectorAll('*');
        for (let i = 0; i < children.length; i++) {
          const text = children[i].textContent.trim();
          if (text === fieldName || text.startsWith(fieldName)) {
            const next = children[i].nextElementSibling;
            if (next) {
              const val = next.textContent.trim();
              if (val && !val.includes(':') && val.length > 0 && val.length < 50) return val;
            }
          }
        }
        const regex = new RegExp(fieldName + '[\\s:\\uFF1A]*([^\\s\\n\\r]{1,40})');
        const match = card.textContent.match(regex);
        return match ? match[1].trim() : '';
      }
    
      // 卡片模式的满员检测
      function checkIsFullLegacy(card) {
        if (card.textContent.includes('已满')) {
          const cap = parseInt(extractFieldLegacy(card, '课容量'), 10);
          const enr = parseInt(extractFieldLegacy(card, '已选人数'), 10);
          if (!isNaN(cap) && !isNaN(enr) && enr >= cap) return true;
        }
        const cap = parseInt(extractFieldLegacy(card, '课容量'), 10);
        const enr = parseInt(extractFieldLegacy(card, '已选人数'), 10);
        if (!isNaN(cap) && !isNaN(enr) && enr >= cap) return true;
        return false;
      }
    
      function fuzzyMatch(text, keywords) {
        if (!keywords || keywords.length === 0) return true;
        if (!text) return false;
        const lowerText = text.toLowerCase().replace(/\s+/g, '');
        return keywords.some(kw => {
          if (!kw) return false;
          const lowerKw = kw.toLowerCase().replace(/\s+/g, '');
          return lowerText.includes(lowerKw) || lowerKw.includes(lowerText);
        });
      }
    
      function isWanted(card, wantedCourses, wantedTeachers, statusFilter) {
        const courseOK = !wantedCourses || wantedCourses.length === 0 || fuzzyMatch(card.name, wantedCourses);
        const teacherOK = !wantedTeachers || wantedTeachers.length === 0 || fuzzyMatch(card.teacher, wantedTeachers);
        let statusOK = true;
        if (statusFilter === 'available') statusOK = !card.isFull;
        else if (statusFilter === 'full') statusOK = card.isFull;
        return courseOK && teacherOK && statusOK;
      }
    
      // ---- 应用筛选（带缓存+通知）----
      function applyFilter(wantedCourses, wantedTeachers, statusFilter, enableToast) {
        const cards = findAllCourseCards();
        console.log('[选课筛选器] findAllCourseCards 找到 ' + cards.length + ' 门课程');
    
        const currentKey = getFilterKey(wantedCourses, wantedTeachers, statusFilter);
        if (_cache.filterKey !== currentKey) { _cache.lastState.clear(); _cache.filterKey = currentKey; }
    
        let shown = 0, hidden = 0, changed = 0;
        const nowAvailable = [];
    
        cards.forEach(card => {
          const shouldShow = isWanted(card, wantedCourses, wantedTeachers, statusFilter);
          const prevState = _cache.lastState.get(card.element);
    
          if (prevState !== shouldShow) {
            card.element.style.display = shouldShow ? '' : 'none';
            _cache.lastState.set(card.element, shouldShow);
            changed++;
          }
    
          if (enableToast && shouldShow && !card.isFull) {
            const key = card.name + '|' + card.teacher;
            if (!_cache.lastAvailableSet.has(key)) {
              if (_cache.lastAvailableSet.size > 0) nowAvailable.push(card);
            }
          }
    
          if (shouldShow) shown++; else hidden++;
        });
    
        _cache.lastAvailableSet.clear();
        cards.forEach(card => {
          if (isWanted(card, wantedCourses, wantedTeachers, statusFilter) && !card.isFull) {
            _cache.lastAvailableSet.add(card.name + '|' + card.teacher);
          }
        });
    
        if (enableToast && nowAvailable.length > 0) {
          nowAvailable.forEach(c => showAvailableToast(c.name, c.teacher, c.capacity, c.enrolled));
        }
    
        return { shown, hidden, total: cards.length, changed, newAvailable: nowAvailable.length };
      }
    
      function showAll() {
        const cards = findAllCourseCards();
        cards.forEach(card => { card.element.style.display = ''; _cache.lastState.set(card.element, true); });
        _cache.filterKey = '';
        return cards.length;
      }
    
      // ---- 创建悬浮面板 v8 ----
      function createPanel() {
        const existing = document.getElementById('xmu-course-filter-panel');
        if (existing) existing.remove();
    
        const panel = document.createElement('div');
        panel.id = 'xmu-course-filter-panel';
        const courseInitVal = userCourses.join('\n');
        const teacherInitVal = userTeachers.join('\n');
    
        panel.innerHTML = `
          <style>
            #xmu-course-filter-panel{position:fixed;top:60px;right:20px;width:340px;background:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.25);z-index:99999;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;color:#333;overflow:hidden}
            #xmu-course-filter-panel.collapsed{width:auto}#xmu-course-filter-panel.collapsed .xcf-body{display:none}
            #xmu-course-filter-panel .xcf-header{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:12px 16px;cursor:move;display:flex;justify-content:space-between;align-items:center;user-select:none}
            #xmu-course-filter-panel .xcf-header h3{margin:0;font-size:15px;font-weight:600}
            #xmu-course-filter-panel .xcf-btn-mini{background:rgba(255,255,255,.2);border:none;color:#fff;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center}
            #xmu-course-filter-panel .xcf-btn-mini:hover{background:rgba(255,255,255,.35)}
            #xmu-course-filter-panel .xcf-close-btn{background:rgba(255,255,255,.2);border:none;color:#fff;width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center}
            #xmu-course-filter-panel .xcf-close-btn:hover{background:rgba(255,0,0,.4)}
            #xmu-course-filter-panel .xcf-body{padding:14px 16px;max-height:70vh;overflow-y:auto}
            #xmu-course-filter-panel .xcf-section{margin-bottom:10px}
            #xmu-course-filter-panel .xcf-label{display:block;margin-bottom:4px;font-weight:600;color:#444;font-size:13px;display:flex;align-items:center;gap:4px}
            #xmu-course-filter-panel .xcf-textarea{width:100%;height:65px;border:2px solid #e0e0e0;border-radius:8px;padding:9px;font-size:13px;line-height:1.5;resize:vertical;box-sizing:border-box;font-family:inherit;outline:none;transition:border-color .2s}
            #xmu-course-filter-panel .xcf-textarea:focus{border-color:#667eea}
            #xmu-course-filter-panel .xcf-textarea::placeholder{color:#bbb}
            #xmu-course-filter-panel .xcf-hint{margin-top:2px;font-size:11px;color:#999}
            #xmu-course-filter-panel .xcf-teacher-area{background:#fef9f3;border:1px solid #f0d9b5;border-radius:8px;padding:9px;margin-top:3px}
            #xmu-course-filter-panel .xcf-teacher-area .xcf-textarea{background:#fff;border-color:#e8dcc8;height:50px}
            #xmu-course-filter-panel .xcf-status-area{background:#f0f7ff;border:1px solid #c5d9f0;border-radius:8px;padding:9px;margin-top:3px}
            #xmu-course-filter-panel .xcf-radio-group{display:flex;gap:8px;margin-top:5px;flex-wrap:wrap}
            #xmu-course-filter-panel .xcf-radio-item{display:flex;align-items:center;gap:4px;cursor:pointer;font-size:12px;color:#444}
            #xmu-course-filter-panel .xcf-radio-item input[type="radio"]{accent-color:#667eea}
            #xmu-course-filter-panel .xcf-tag-available{color:#16a34a;font-weight:600}
            #xmu-course-filter-panel .xcf-tag-full{color:#dc2626;font-weight:600}
            #xmu-course-filter-panel .xcf-btn-row{display:flex;gap:8px;margin-top:10px}
            #xmu-course-filter-panel .xcf-btn{flex:1;padding:9px 12px;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;font-family:inherit}
            #xmu-course-filter-panel .xcf-btn-primary{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff}
            #xmu-course-filter-panel .xcf-btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(102,126,234,.4)}
            #xmu-course-filter-panel .xcf-btn-secondary{background:#f5f5f5;color:#555}
            #xmu-course-filter-panel .xcf-btn-secondary:hover{background:#eee}
            #xmu-course-filter-panel .xcf-status-box{margin-top:8px;padding:9px;background:#f8f9ff;border-radius:8px;font-size:12px;display:none;line-height:1.5}
            #xmu-course-filter-panel .xcf-status-box.visible{display:block}
            #xmu-course-filter-panel .xcf-count{font-weight:700;color:#667eea}
            #xmu-course-filter-panel .xcf-changed{color:#059669;font-size:11px}
            #xmu-course-filter-panel .xcf-page-info{color:#f59e0b;font-size:11px;font-weight:600}
            #xmu-course-filter-panel .xcf-auto-refresh{margin-top:8px;display:flex;align-items:center;gap:6px;font-size:11px;color:#666}
            #xmu-course-filter-panel .xcf-auto-refresh input[type="checkbox"]{accent-color:#667eea;width:13px;height:13px}
            #xmu-course-filter-panel .xcf-divider{height:1px;background:#eee;margin:10px 0}
            #xmu-course-filter-panel .xcf-logic-note{font-size:10px;color:#aaa;text-align:center;margin-top:6px;line-height:1.5}
            #xmu-course-filter-panel .xcf-badge-new{display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;font-size:10px;padding:1px 6px;border-radius:8px;vertical-align:middle;margin-left:4px}
            #xmu-course-filter-panel .xcf-feature-tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
            #xmu-course-filter-panel .xcf-tag{font-size:10px;padding:2px 7px;border-radius:10px;color:#fff;font-weight:500}
            #xmu-course-filter-panel .xcf-tag-expand{background:linear-gradient(135deg,#f59e0b,#d97706)}
            #xmu-course-filter-panel .xcf-tag-and{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
            #xmu-course-filter-panel .xcf-tag-cache{background:linear-gradient(135deg,#06b6d4,#0891b2)}
            #xmu-course-filter-panel .xcf-tag-toast{background:linear-gradient(135deg,#10b981,#059669)}
          </style>
          <div class="xcf-header">
            <h3>🎯 选课筛选器 <span class="xcf-badge-new">v8</span></h3>
            <div style="display:flex;gap:4px">
              <button class="xcf-btn-mini" id="xcf-collapseBtn" title="折叠">−</button>
              <button class="xcf-close-btn" id="xcf-closeBtn" title="关闭面板">✕</button>
            </div>
          </div>
          <div class="xcf-body">
            <div class="xcf-feature-tags">
              <span class="xcf-tag xcf-tag-expand">🌐 多页合并</span>
              <span class="xcf-tag xcf-tag-and">🔗 AND 逻辑</span>
              <span class="xcf-tag xcf-tag-cache">⚡ 防闪烁</span>
              <span class="xcf-tag xcf-tag-toast">🔔 空位提醒</span>
            </div>
            <div class="xcf-section">
              <label class="xcf-label">📚 课程名称（每行一个）</label>
              <textarea class="xcf-textarea" id="xcf-courseInput" placeholder="例如：西方古典神话\n爱情心理学">${courseInitVal}</textarea>
              <div class="xcf-hint">💡 模糊匹配，留空不限</div>
            </div>
            <div class="xcf-section">
              <label class="xcf-label">👨 🏫 教师名称（每行一个）</label>
              <div class="xcf-teacher-area">
                <textarea class="xcf-textarea" id="xcf-teacherInput" placeholder="例如：赖丹凤">${teacherInitVal}</textarea>
                <div class="xcf-hint" style="color:#c49a6c">🔸 AND 逻辑：同时满足课程名和教师名才保留</div>
              </div>
            </div>
            <div class="xcf-section">
              <label class="xcf-label">📊 余量状态</label>
              <div class="xcf-status-area">
                <div class="xcf-radio-group">
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="all" ${userStatus==='all'?'checked':''} id="xcf-st-all"/> <label for="xcf-st-all">全部</label></span>
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="available" ${userStatus==='available'?'checked':''} id="xcf-st-avail"/> <label for="xcf-st-avail" class="xcf-tag-available">● 未满</label></span>
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="full" ${userStatus==='full'?'checked':''} id="xcf-st-full"/> <label for="xcf-st-full" class="xcf-tag-full">● 已满</label></span>
                </div>
                <div class="xcf-hint" style="color:#5a8bc7;margin-top:3px">🔸 选"未满"时，有空位的课会在左下角弹出提醒</div>
              </div>
            </div>
            <div class="xcf-divider"></div>
            <div class="xcf-btn-row">
              <button class="xcf-btn xcf-btn-primary" id="xcf-filterBtn">✨ 执行筛选</button>
              <button class="xcf-btn xcf-btn-secondary" id="xcf-showAllBtn">显示全部</button>
            </div>
            <div class="xcf-auto-refresh">
              <input type="checkbox" id="xcf-autoCheck" checked/>
              <label for="xcf-autoCheck">每 2 秒静默检测余量变化（无变化完全不闪）</label>
            </div>
            <div class="xcf-status-box" id="xcf-status"></div>
            <div class="xcf-logic-note">启动时自动加载全部课程 · AND 逻辑 · 防闪烁 · 左下角空位提醒不遮挡操作</div>
          </div>`;
        document.body.appendChild(panel);
    
        // 拖拽
        const hdr = panel.querySelector('.xcf-header');
        let dragging=false,dx,dy;
        hdr.addEventListener('mousedown', e => {
          if (['BUTTON','H3'].includes(e.target.tagName)||e.target.closest('.xcf-badge-new')) return;
          dragging=true; dx=e.clientX-panel.offsetLeft; dy=e.clientY-panel.offsetTop; hdr.style.cursor='grabbing';
        });
        document.addEventListener('mousemove', e => {
          if(!dragging)return;
          panel.style.left=Math.max(0,Math.min(window.innerWidth-panel.offsetWidth,e.clientX-dx))+'px';
          panel.style.top=Math.max(0,Math.min(window.innerHeight-panel.offsetHeight,e.clientY-dy))+'px';
          panel.style.right='auto';
        });
        document.addEventListener('mouseup',()=>{dragging=false;hdr.style.cursor='move';});
    
        // 折叠/关闭
        panel.querySelector('#xcf-collapseBtn').addEventListener('click',()=>{
          panel.classList.toggle('collapsed');
          panel.querySelector('#xcf-collapseBtn').textContent=panel.classList.contains('collapsed')?'+':'−';
        });
        panel.querySelector('#xcf-closeBtn').addEventListener('click',()=>{panel.remove();});
    
        function getInputValues(){
          const ct=panel.querySelector('#xcf-courseInput').value;
          const tt=panel.querySelector('#xcf-teacherInput').value;
          const courses=ct.split(/[\n,，]/).map(s=>s.trim()).filter(s=>s.length>0);
          const teachers=tt.split(/[\n,，]/).map(s=>s.trim()).filter(s=>s.length>0);
          const sr=panel.querySelector('input[name="xcf-status"]:checked');
          return{courses,teachers,statusFilter:sr?sr.value:'all'};
        }
    
        function updateStatus(result,courses,teachers,statusFilter){
          const se=panel.querySelector('#xcf-status');
          const st=statusFilter==='available'?'仅未满':statusFilter==='full'?'仅已满':'全部';
          let pi='';
          try{const v=window.grablessonsVue;if(v&&v.pubParam)pi=' | 总数:'+v.pubParam.totalNumber;}catch(e){}
          let ei='';
          if(result.newAvailable>0) ei='<br><span style="color:#10b981;font-weight:600;">🔔 新发现 '+result.newAvailable+' 门有空位！</span>';
          se.innerHTML='✅ 显示 <span class="xcf-count">'+result.shown+'</span> / 隐藏 <span class="xcf-count">'+result.hidden+'</span>（共'+result.total+'）<span class="xcf-changed"> 变化:'+result.changed+'</span>'+pi+ei+'<br><small style="color:#888">'+(courses.length?courses.join(', '):'-')+' | '+(teachers.length?teachers.join(', '):'-')+' | '+st+'</small>';
          se.classList.add('visible');
        }
    
        panel.querySelector('#xcf-filterBtn').addEventListener('click',()=>{
          const v=getInputValues();
          const r=applyFilter(v.courses,v.teachers,v.statusFilter,true);
          updateStatus(r,v.courses,v.teachers,v.statusFilter);
        });
    
        panel.querySelector('#xcf-showAllBtn').addEventListener('click',()=>{
          const c=showAll();
          const se=panel.querySelector('#xcf-status');
          se.innerHTML='📋 已显示全部 <span class="xcf-count">'+c+'</span> 门';
          se.classList.add('visible');
        });
    
        let autoInt=null,lastRS='';
        function startAuto(){stopAuto();autoInt=setInterval(()=>{
          const cb=document.getElementById('xcf-autoCheck');const p=document.getElementById('xmu-course-filter-panel');
          if(!cb||!cb.checked||!p){stopAuto();return;}
          const v=getInputValues();
          const r=applyFilter(v.courses,v.teachers,v.statusFilter,true);
          const rs=r.shown+'|'+r.hidden+'|'+r.changed+'|'+r.newAvailable;
          if(rs!==lastRS){lastRS=rs;const se=p.querySelector('#xcf-status');if(se&&(r.changed>0||r.newAvailable>0))updateStatus(r,v.courses,v.teaches,v.statusFilter);}
        },2000);}
        function stopAuto(){if(autoInt){clearInterval(autoInt);autoInt=null;}}
    
        panel.querySelector('#xcf-autoCheck').addEventListener('change',e=>{if(e.target.checked)startAuto();else stopAuto();});
    
        // 初始执行
        const initR=applyFilter(userCourses,userTeachers,userStatus,false);
        updateStatus(initR,userCourses,userTeachers,userStatus);
        startAuto();
    
        return panel;
      }
    
      // ---- 主入口 ----
      console.log('[选课筛选器] v8 启动... 页面类型:', isElTablePage() ? 'el-table' : '卡片');
    
      const expandResult = await autoExpandAllPages();
      const panel = createPanel();
    
      if(expandResult && _cache.hasExpandedPages){
        try{
          const v=window.grablessonsVue;
          if(v&&v.pubParam&&v.pubParam.pageSize>10){
            const t=v.pubParam.totalNumber;
            const se=panel.querySelector('#xcf-status');
            if(se){se.innerHTML+='<br><span class="xcf-page-info">🌐 已自动加载全部 '+t+' 门课程</span>';se.classList.add('visible');}
          }
        }catch(e){}
      }
    
      const allCards=findAllCourseCards();
      const uniqueInfo=[];
      const sk=new Set();
      allCards.forEach(c=>{
        const k=c.name+'|'+c.teacher;
        if(!sk.has(k)){sk.add(k);uniqueInfo.push({name:c.name,teacher:c.teacher,capacity:c.capacity,enrolled:c.enrolled,isFull:c.isFull});}
      });
    
      let pageInfo={};
      try{const v=window.grablessonsVue;if(v&&v.pubParam)pageInfo={pageSize:v.pubParam.pageSize,pageNumber:v.pubParam.pageNumber,totalNumber:v.pubParam.totalNumber};}catch(e){}
    
      return{
        ok:true,
        summary:'选课筛选器 v8 已启动！（修复版：兼容 el-table 表格结构）',
        version:8,
        pageType:isElTablePage()?'el-table':'card',
        auto_expand_result:expandResult,
        page_info:pageInfo,
        total_courses_on_page:allCards.length,
        unique_combinations:uniqueInfo,
        filtered_courses:userCourses,
        filtered_teachers:userTeachers,
        showing:allCards.filter(c=>isWanted(c,userCourses,userTeachers,userStatus)).length,
        hiding:allCards.filter(c=>!isWanted(c,userCourses,userTeachers,userStatus)).length,
        features:[
          '✅ 自动跨页展开',
          '✅ 兼容 Element UI 表格(el-table)结构',
          '✅ 兼容传统卡片结构',
          '✅ 课程名/教师名 AND 逻辑筛选',
          '✅ 已满/未满状态筛选',
          '⚡ 防闪烁缓存',
          '🔔 空位提醒（左下角绿色toast）',
          '✅ 每 2 秒静默检测'
        ],
        warnings:[]
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();