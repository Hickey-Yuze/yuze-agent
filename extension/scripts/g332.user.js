(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {"courses": [ "新能源技术和应用"], "teachers": [], "status": "all"};
  const __tabOriginalFunction = (
    async function run(args) {
      // ============================================
      // 厦大选课系统 - 校选课筛选脚本 v7
      // 改进：自动跨页展开 + 未满课程非侵入式通知
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
        lastAvailableSet: new Set(), // 上次未满的课程集合，用于检测变化
        notifiedThisSession: new Set() // 本次会话已通知过的课程（避免重复弹）
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
    
      // ---- 非侵入式通知系统 ----
      let _toastContainer = null;
    
      function ensureToastContainer() {
        if (_toastContainer && document.body.contains(_toastContainer)) return _toastContainer;
        const c = document.createElement('div');
        c.id = 'xcf-toast-container';
        c.innerHTML = `<style>
          #xcf-toast-container {
            position: fixed; bottom: 20px; left: 20px; z-index: 99998;
            display: flex; flex-direction: column-reverse; gap: 8px;
            pointer-events: none; max-width: 360px;
          }
          .xcf-toast {
            background: linear-gradient(135deg, #10b981, #059669);
            color: #fff; padding: 12px 16px; border-radius: 10px;
            font-size: 13px; line-height: 1.5;
            box-shadow: 0 4px 16px rgba(16,185,129,0.4);
            pointer-events: auto; cursor: pointer;
            animation: xcf-toastIn 0.3s ease-out;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
            transition: opacity 0.3s, transform 0.3s;
          }
          .xcf-toast:hover { opacity: 0.9; transform: translateY(-2px); }
          .xcf-toast .xcf-toast-title { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
          .xcf-toast .xcf-toast-course { color: #d1fae5; font-weight: 600; }
          .xcf-toast .xcf-toast-teacher { color: #a7f3d0; font-size: 12px; }
          .xcf-toast .xcf-toast-time { color: rgba(255,255,255,0.6); font-size: 11px; margin-top: 4px; }
          .xcf-toast.xcf-fading { animation: xcf-toastOut 0.4s ease-in forwards; }
          @keyframes xcf-toastIn {
            from { opacity: 0; transform: translateX(-30px) scale(0.95); }
            to { opacity: 1; transform: translateX(0) scale(1); }
          }
          @keyframes xcf-toastOut {
            from { opacity: 1; transform: translateX(0) scale(1); }
            to { opacity: 0; transform: translateX(-30px) scale(0.95); }
          }
        </style>`;
        document.body.appendChild(c);
        _toastContainer = c;
        return c;
      }
    
      function showAvailableToast(courseName, teacherName, capacity, enrolled) {
        const container = ensureToastContainer();
        const key = courseName + '|' + teacherName;
        
        // 同一节课本次会话只通知一次（除非关闭面板后重新运行）
        if (_cache.notifiedThisSession.has(key)) return;
        _cache.notifiedThisSession.add(key);
    
        const toast = document.createElement('div');
        toast.className = 'xcf-toast';
        toast.innerHTML = `
          <div class="xcf-toast-title">🎉 有名额了！快去抢！</div>
          <div>课程：<span class="xcf-toast-course">${courseName}</span></div>
          ${teacherName ? `<div>教师：<span class="xcf-toast-teacher">${teacherName}</span></div>` : ''}
          <div style="margin-top:4px;font-size:12px;color:#d1fae5;">容量 ${capacity} / 已选 ${enrolled} — 点击此条可关闭</div>
          <div class="xcf-toast-time">${new Date().toLocaleTimeString()}</div>
        `;
    
        // 点击关闭
        toast.addEventListener('click', () => {
          toast.classList.add('xcf-fading');
          setTimeout(() => toast.remove(), 400);
        });
    
        container.appendChild(toast);
    
        // 8秒后自动消失
        setTimeout(() => {
          if (toast.parentNode) {
            toast.classList.add('xcf-fading');
            setTimeout(() => toast.remove(), 400);
          }
        }, 8000);
      }
    
      // ---- 找到所有课程卡片 ----
      function findAllCourseCards() {
        const selectButtons = Array.from(document.querySelectorAll('button'));
        const selectBtns = selectButtons.filter(btn => btn.textContent.trim() === '选择');
        const cards = [];
        const seen = new Set();
        selectBtns.forEach(btn => {
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
              name: extractField(card, '课程名称'),
              teacher: extractField(card, '上课教师'),
              capacity: extractField(card, '课容量'),
              enrolled: extractField(card, '已选人数'),
              isFull: checkIsFull(card)
            });
          }
        });
        return cards;
      }
    
      function extractField(card, fieldName) {
        const children = card.querySelectorAll('*');
        for (let i = 0; i < children.length; i++) {
          const text = children[i].textContent.trim();
          if (text === fieldName || text.startsWith(fieldName)) {
            let next = children[i].nextElementSibling;
            if (next) {
              const val = next.textContent.trim();
              if (val && !val.includes(':') && val.length > 0 && val.length < 50) return val;
            }
          }
        }
        const regex = new RegExp(fieldName + '[:\\s]*([^\\n\\s]{1,30})');
        const match = card.textContent.match(regex);
        return match ? match[1].trim() : '';
      }
    
      function checkIsFull(card) {
        if (card.textContent.includes('已满')) {
          const cap = parseInt(extractField(card, '课容量'), 10);
          const enr = parseInt(extractField(card, '已选人数'), 10);
          if (!isNaN(cap) && !isNaN(enr) && enr >= cap) return true;
        }
        const cap = parseInt(extractField(card, '课容量'), 10);
        const enr = parseInt(extractField(card, '已选人数'), 10);
        if (!isNaN(cap) && !isNaN(enr) && enr >= cap) return true;
        return false;
      }
    
      function fuzzyMatch(text, keywords) {
        if (!keywords || keywords.length === 0) return true;
        if (!text) return false;
        return keywords.some(kw => text.includes(kw) || kw.includes(text));
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
        const currentKey = getFilterKey(wantedCourses, wantedTeachers, statusFilter);
        if (_cache.filterKey !== currentKey) { _cache.lastState.clear(); _cache.filterKey = currentKey; }
    
        let shown = 0, hidden = 0, changed = 0;
        const nowAvailable = []; // 刚变成未满的目标课程
    
        cards.forEach(card => {
          const shouldShow = isWanted(card, wantedCourses, wantedTeachers, statusFilter);
          const prevState = _cache.lastState.get(card.element);
    
          if (prevState !== shouldShow) {
            card.element.style.display = shouldShow ? '' : 'none';
            _cache.lastState.set(card.element, shouldShow);
            changed++;
          }
    
          // 检测从未满→有名额的变化（通知用）
          if (enableToast && shouldShow && !card.isFull) {
            const key = card.name + '|' + card.teacher;
            if (!_cache.lastAvailableSet.has(key)) {
              // 这个课程之前是满的或不在集合中，现在未满了
              // 排除首次运行（lastAvailableSet为空时不算变化）
              if (_cache.lastAvailableSet.size > 0) {
                nowAvailable.push(card);
              }
            }
          }
    
          if (shouldShow) shown++;
          else hidden++;
        });
    
        // 更新可用集合
        _cache.lastAvailableSet.clear();
        cards.forEach(card => {
          if (isWanted(card, wantedCourses, wantedTeachers, statusFilter) && !card.isFull) {
            _cache.lastAvailableSet.add(card.name + '|' + card.teacher);
          }
        });
    
        // 弹出通知
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
    
      // ---- 创建悬浮面板 v7 ----
      function createPanel() {
        const existing = document.getElementById('xmu-course-filter-panel');
        if (existing) existing.remove();
    
        const panel = document.createElement('div');
        panel.id = 'xmu-course-filter-panel';
        panel.innerHTML = `
          <style>
            #xmu-course-filter-panel {
              position: fixed; top: 60px; right: 20px; width: 340px;
              background: #fff; border-radius: 12px;
              box-shadow: 0 4px 24px rgba(0,0,0,0.25); z-index: 99999;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
              font-size: 14px; color: #333; overflow: hidden;
            }
            #xmu-course-filter-panel.collapsed { width: auto; }
            #xmu-course-filter-panel.collapsed .xcf-body { display: none; }
            #xmu-course-filter-panel .xcf-header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: #fff; padding: 12px 16px; cursor: move;
              display: flex; justify-content: space-between; align-items: center; user-select: none;
            }
            #xmu-course-filter-panel .xcf-header h3 { margin: 0; font-size: 15px; font-weight: 600; }
            #xmu-course-filter-panel .xcf-btn-mini {
              background: rgba(255,255,255,0.2); border: none; color: #fff;
              width: 26px; height: 26px; border-radius: 6px; cursor: pointer;
              font-size: 16px; display: flex; align-items: center; justify-content: center;
            }
            #xmu-course-filter-panel .xcf-btn-mini:hover { background: rgba(255,255,255,0.35); }
            #xmu-course-filter-panel .xcf-close-btn {
              background: rgba(255,255,255,0.2); border: none; color: #fff;
              width: 22px; height: 22px; border-radius: 50%; cursor: pointer;
              font-size: 14px; display: flex; align-items: center; justify-content: center;
            }
            #xmu-course-filter-panel .xcf-close-btn:hover { background: rgba(255,0,0,0.4); }
            #xmu-course-filter-panel .xcf-body { padding: 14px 16px; max-height: 70vh; overflow-y: auto; }
            #xmu-course-filter-panel .xcf-section { margin-bottom: 10px; }
            #xmu-course-filter-panel .xcf-label {
              display: block; margin-bottom: 4px; font-weight: 600; color: #444; font-size: 13px;
              display: flex; align-items: center; gap: 4px;
            }
            #xmu-course-filter-panel .xcf-textarea {
              width: 100%; height: 65px; border: 2px solid #e0e0e0; border-radius: 8px;
              padding: 9px; font-size: 13px; line-height: 1.5; resize: vertical;
              box-sizing: border-box; font-family: inherit; outline: none; transition: border-color 0.2s;
            }
            #xmu-course-filter-panel .xcf-textarea:focus { border-color: #667eea; }
            #xmu-course-filter-panel .xcf-textarea::placeholder { color: #bbb; }
            #xmu-course-filter-panel .xcf-hint { margin-top: 2px; font-size: 11px; color: #999; }
            
            /* 教师区域 */
            #xmu-course-filter-panel .xcf-teacher-area {
              background: #fef9f3; border: 1px solid #f0d9b5; border-radius: 8px; padding: 9px; margin-top: 3px;
            }
            #xmu-course-filter-panel .xcf-teacher-area .xcf-textarea { background: #fff; border-color: #e8dcc8; height: 50px; }
            
            /* 状态筛选 */
            #xmu-course-filter-panel .xcf-status-area {
              background: #f0f7ff; border: 1px solid #c5d9f0; border-radius: 8px; padding: 9px; margin-top: 3px;
            }
            #xmu-course-filter-panel .xcf-radio-group { display: flex; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
            #xmu-course-filter-panel .xcf-radio-item {
              display: flex; align-items: center; gap: 4px; cursor: pointer; font-size: 12px; color: #444;
            }
            #xmu-course-filter-panel .xcf-radio-item input[type="radio"] { accent-color: #667eea; }
            #xmu-course-filter-panel .xcf-tag-available { color: #16a34a; font-weight: 600; }
            #xmu-course-filter-panel .xcf-tag-full { color: #dc2626; font-weight: 600; }
    
            /* 按钮 */
            #xmu-course-filter-panel .xcf-btn-row { display: flex; gap: 8px; margin-top: 10px; }
            #xmu-course-filter-panel .xcf-btn {
              flex: 1; padding: 9px 12px; border: none; border-radius: 8px;
              font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; font-family: inherit;
            }
            #xmu-course-filter-panel .xcf-btn-primary {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff;
            }
            #xmu-course-filter-panel .xcf-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102,126,234,0.4); }
            #xmu-course-filter-panel .xcf-btn-secondary { background: #f5f5f5; color: #555; }
            #xmu-course-filter-panel .xcf-btn-secondary:hover { background: #eee; }
    
            /* 状态信息 */
            #xmu-course-filter-panel .xcf-status-box {
              margin-top: 8px; padding: 9px; background: #f8f9ff; border-radius: 8px;
              font-size: 12px; display: none; line-height: 1.5;
            }
            #xmu-course-filter-panel .xcf-status-box.visible { display: block; }
            #xmu-course-filter-panel .xcf-count { font-weight: 700; color: #667eea; }
            #xmu-course-filter-panel .xcf-changed { color: #059669; font-size: 11px; }
            #xmu-course-filter-panel .xcf-page-info { color: #f59e0b; font-size: 11px; font-weight: 600; }
    
            /* 自动刷新 */
            #xmu-course-filter-panel .xcf-auto-refresh {
              margin-top: 8px; display: flex; align-items: center; gap: 6px; font-size: 11px; color: #666;
            }
            #xmu-course-filter-panel .xcf-auto-refresh input[type="checkbox"] { accent-color: #667eea; width: 13px; height: 13px; }
            #xmu-course-filter-panel .xcf-divider { height: 1px; background: #eee; margin: 10px 0; }
            #xmu-course-filter-panel .xcf-logic-note { font-size: 10px; color: #aaa; text-align: center; margin-top: 6px; line-height: 1.5; }
            #xmu-course-filter-panel .xcf-badge-new {
              display: inline-block; background: linear-gradient(135deg,#10b981,#059669); color:#fff;
              font-size:10px; padding:1px 6px; border-radius:8px; vertical-align:middle; margin-left:4px;
            }
            /* 特性标签行 */
            #xmu-course-filter-panel .xcf-feature-tags {
              display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px;
            }
            #xmu-course-filter-panel .xcf-tag {
              font-size: 10px; padding: 2px 7px; border-radius: 10px; color: #fff; font-weight: 500;
            }
            #xmu-course-filter-panel .xcf-tag-expand { background: linear-gradient(135deg,#f59e0b,#d97706); }
            #xmu-course-filter-panel .xcf-tag-and { background: linear-gradient(135deg,#8b5cf6,#6d28d9); }
            #xmu-course-filter-panel .xcf-tag-cache { background: linear-gradient(135deg,#06b6d4,#0891b2); }
            #xmu-course-filter-panel .xcf-tag-toast { background: linear-gradient(135deg,#10b981,#059669); }
          </style>
          <div class="xcf-header">
            <h3>🎯 选课筛选器 <span class="xcf-badge-new">v7</span></h3>
            <div style="display:flex;gap:4px;">
              <button class="xcf-btn-mini" id="xcf-collapseBtn" title="折叠">−</button>
              <button class="xcf-close-btn" id="xcf-closeBtn" title="关闭面板">✕</button>
            </div>
          </div>
          <div class="xcf-body">
            <!-- 特性标签 -->
            <div class="xcf-feature-tags">
              <span class="xcf-tag xcf-tag-expand">🌐 多页合并</span>
              <span class="xcf-tag xcf-tag-and">🔗 AND逻辑</span>
              <span class="xcf-tag xcf-cache">⚡ 防闪烁</span>
              <span class="xcf-tag xcf-toast">🔔 空位提醒</span>
            </div>
    
            <!-- 课程名称 -->
            <div class="xcf-section">
              <label class="xcf-label">📚 课程名称（每行一个）</label>
              <textarea class="xcf-textarea" id="xcf-courseInput" placeholder="例如：&#10;西方古典神话&#10;爱情心理学">${userCourses.join('\n')}</textarea>
              <div class="xcf-hint">💡 模糊匹配，留空不限</div>
            </div>
    
            <!-- 教师名称 -->
            <div class="xcf-section">
              <label class="xcf-label">👨 🏫 教师名称（每行一个）</label>
              <div class="xcf-teacher-area">
                <textarea class="xcf-textarea" id="xcf-teacherInput" placeholder="例如：&#10;赖丹凤">${userTeachers.join('\n')}</textarea>
                <div class="xcf-hint" style="color:#c49a6c;">🔸 AND逻辑：同时满足课程名和教师名才保留</div>
              </div>
            </div>
    
            <!-- 已满/未满状态 -->
            <div class="xcf-section">
              <label class="xcf-label">📊 余量状态</label>
              <div class="xcf-status-area">
                <div class="xcf-radio-group">
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="all" ${userStatus==='all'?'checked':''} id="xcf-st-all" /> <label for="xcf-st-all">全部</label></span>
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="available" ${userStatus==='available'?'checked':''} id="xcf-st-avail" /> <label for="xcf-st-avail" class="xcf-tag-available">● 未满</label></span>
                  <span class="xcf-radio-item"><input type="radio" name="xcf-status" value="full" ${userStatus==='full'?'checked':''} id="xcf-st-full" /> <label for="xcf-st-full" class="xcf-tag-full">● 已满</label></span>
                </div>
                <div class="xcf-hint" style="color:#5a8bc7;margin-top:3px;">🔸 选"未满"时，有空位的课会在左下角弹出提醒</div>
              </div>
            </div>
    
            <div class="xcf-divider"></div>
    
            <div class="xcf-btn-row">
              <button class="xcf-btn xcf-btn-primary" id="xcf-filterBtn">✨ 执行筛选</button>
              <button class="xcf-btn xcf-btn-secondary" id="xcf-showAllBtn">显示全部</button>
            </div>
    
            <div class="xcf-auto-refresh">
              <input type="checkbox" id="xcf-autoCheck" checked />
              <label for="xcf-autoCheck">每2秒静默检测余量变化（无变化完全不闪）</label>
            </div>
    
            <div class="xcf-status-box" id="xcf-status"></div>
            <div class="xcf-logic-note">启动时自动加载全部课程 · AND逻辑 · 防闪烁 · 左下角空位提醒不遮挡操作</div>
          </div>
        `;
        document.body.appendChild(panel);
    
        // ===== 拖拽 =====
        const header = panel.querySelector('.xcf-header');
        let isDragging = false, dragOffsetX, dragOffsetY;
        header.addEventListener('mousedown', (e) => {
          if (e.target.tagName === 'BUTTON' || e.target.tagName === 'H3' || e.target.closest('.xcf-badge-new')) return;
          isDragging = true; dragOffsetX = e.clientX - panel.offsetLeft; dragOffsetY = e.clientY - panel.offsetTop;
          header.style.cursor = 'grabbing';
        });
        document.addEventListener('mousemove', (e) => {
          if (!isDragging) return;
          panel.style.left = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, e.clientX - dragOffsetX)) + 'px';
          panel.style.top = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, e.clientY - dragOffsetY)) + 'px';
          panel.style.right = 'auto';
        });
        document.addEventListener('mouseup', () => { isDragging = false; header.style.cursor = 'move'; });
    
        // ===== 折叠/关闭 =====
        panel.querySelector('#xcf-collapseBtn').addEventListener('click', () => {
          panel.classList.toggle('collapsed');
          panel.querySelector('#xcf-collapseBtn').textContent = panel.classList.contains('collapsed') ? '+' : '−';
        });
        panel.querySelector('#xcf-closeBtn').addEventListener('click', () => { panel.remove(); });
    
        // ===== 获取输入值 =====
        function getInputValues() {
          const courseText = panel.querySelector('#xcf-courseInput').value;
          const teacherText = panel.querySelector('#xcf-teacherInput').value;
          const courses = courseText.split(/[\n,，]/).map(s => s.trim()).filter(s => s.length > 0);
          const teachers = teacherText.split(/[\n,，]/).map(s => s.trim()).filter(s => s.length > 0);
          const statusRadio = panel.querySelector('input[name="xcf-status"]:checked');
          const statusFilter = statusRadio ? statusRadio.value : 'all';
          return { courses, teachers, statusFilter };
        }
    
        // ===== 更新状态显示 =====
        function updateStatus(result, courses, teachers, statusFilter) {
          const statusEl = panel.querySelector('#xcf-status');
          const statusText = statusFilter === 'available' ? '仅未满' : statusFilter === 'full' ? '仅已满' : '全部';
          let pageInfo = '';
          try {
            const vue = window.grablessonsVue;
            if (vue && vue.pubParam) pageInfo = ` | 总数:${vue.pubParam.totalNumber}`;
          } catch(e) {}
          
          let extraInfo = '';
          if (result.newAvailable > 0) extraInfo = `<br><span style="color:#10b981;font-weight:600;">🔔 新发现 ${result.newAvailable} 门有空位！（见左下角提示）</span>`;
          
          statusEl.innerHTML = `✅ 显示 <span class="xcf-count">${result.shown}</span> / 隐藏 <span class="xcf-count">${result.hidden}</span>（共${result.total}）<span class="xcf-changed"> 变更:${result.changed}</span>${pageInfo}${extraInfo}<br><small style="color:#888">${courses.length?courses.join(', '):'-'} | ${teachers.length?teachers.join(', '):'-'} | ${statusText}</small>`;
          statusEl.classList.add('visible');
        }
    
        // ===== 筛选按钮 =====
        panel.querySelector('#xcf-filterBtn').addEventListener('click', () => {
          const { courses, teachers, statusFilter } = getInputValues();
          const result = applyFilter(courses, teachers, statusFilter, true);
          updateStatus(result, courses, teachers, statusFilter);
        });
    
        // ===== 显示全部 =====
        panel.querySelector('#xcf-showAllBtn').addEventListener('click', () => {
          const count = showAll();
          const statusEl = panel.querySelector('#xcf-status');
          statusEl.innerHTML = `📋 已显示全部 <span class="xcf-count">${count}</span> 门`;
          statusEl.classList.add('visible');
        });
    
        // ===== 自动持续筛选（静默模式+通知）=====
        let autoInterval = null;
        let lastResultStr = '';
    
        function startAutoFilter() {
          stopAutoFilter();
          autoInterval = setInterval(() => {
            const checkbox = document.getElementById('xcf-autoCheck');
            const p = document.getElementById('xmu-course-filter-panel');
            if (!checkbox || !checkbox.checked || !p) { stopAutoFilter(); return; }
            const { courses, teachers, statusFilter } = getInputValues();
            const result = applyFilter(courses, teachers, statusFilter, true);
    
            const resultStr = `${result.shown}|${result.hidden}|${result.changed}|${result.newAvailable}`;
            if (resultStr !== lastResultStr) {
              lastResultStr = resultStr;
              const statusEl = p.querySelector('#xcf-status');
              if (statusEl && (result.changed > 0 || result.newAvailable > 0)) {
                updateStatus(result, courses, teachers, statusFilter);
              }
            }
          }, 2000);
        }
        function stopAutoFilter() { if (autoInterval) { clearInterval(autoInterval); autoInterval = null; } }
        panel.querySelector('#xcf-autoCheck').addEventListener('change', (e) => {
          if (e.target.checked) startAutoFilter(); else stopAutoFilter();
        });
    
        // ===== 初始执行 =====
        const initialResult = applyFilter(userCourses, userTeachers, userStatus, false);
        updateStatus(initialResult, userCourses, userTeachers, userStatus);
    
        startAutoFilter();
        return panel;
      }
    
      // ---- 主逻辑：先自动展开，再创建面板 ----
      const expandResult = await autoExpandAllPages();
      
      const panel = createPanel();
    
      // 更新面板中的展开状态显示
      if (expandResult && _cache.hasExpandedPages) {
        try {
          const vue = window.grablessonsVue;
          if (vue && vue.pubParam && vue.pubParam.pageSize > 10) {
            const total = vue.pubParam.totalNumber;
            const statusEl = panel.querySelector('#xcf-status');
            if (statusEl) {
              statusEl.innerHTML += `<br><span class="xcf-page-info">🌐 已自动加载全部 ${total} 门课程</span>`;
              statusEl.classList.add('visible');
            }
          }
        } catch(e) {}
      }
    
      const allCards = findAllCourseCards();
      const uniqueInfo = [];
      const seenKeys = new Set();
      allCards.forEach(c => {
        const key = c.name + '|' + c.teacher;
        if (!seenKeys.has(key)) { seenKeys.add(key); uniqueInfo.push({ name: c.name, teacher: c.teacher, capacity: c.capacity, enrolled: c.enrolled, isFull: c.isFull }); }
      });
    
      let pageInfo = {};
      try {
        const vue = window.grablessonsVue;
        if (vue && vue.pubParam) pageInfo = { pageSize: vue.pubParam.pageSize, pageNumber: vue.pubParam.pageNumber, totalNumber: vue.pubParam.totalNumber };
      } catch(e) {}
    
      return {
        ok: true,
        summary: '选课筛选器 v7 已启动！自动跨页展开 + 空位左下角提醒。',
        version: 7,
        auto_expand_result: expandResult,
        page_info: pageInfo,
        total_courses_on_page: allCards.length,
        unique_combinations: uniqueInfo,
        filtered_courses: userCourses,
        filtered_teachers: userTeachers,
        showing: allCards.filter(c => isWanted(c, userCourses, userTeachers, userStatus)).length,
        hiding: allCards.filter(c => !isWanted(c, userCourses, userTeachers, userStatus)).length,
        features: [
          '✅ 启动时自动跨页展开（无需手动点击）',
          '✅ 课程名/教师名AND逻辑筛选',
          '✅ 已满/未满状态筛选',
          '⚡ 防闪烁缓存',
          '🔔 空位提醒（左下角绿色toast，不遮挡选课按钮）',
          '✅ 每2秒静默检测',
          '✅ 选课操作不影响刷新'
        ],
        warnings: []
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();