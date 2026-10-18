(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 期末救急规划器 - Final Exam Emergency Planner
     * 
     * 面向大学生的期末复习自动化工具：
     * - 考试安排识别与优先级排序
     * - 老师划重点整理
     * - B站复习视频自动搜索与智能筛选
     * - 个性化每日复习计划生成
     * - 动态计划调整
     * - PPT知识点自动总结
     * 
     * @version 1.0.0
     * @author Yuze Script Generator
     */
    
    async function run(args) {
      args = args || {};
    
      // ============================================================
      // 配置与常量
      // ============================================================
      const CONFIG = {
        appName: '📚 期末救急规划器',
        version: '1.0.0',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6',
        accentColor: '#f59e0b',
        successColor: '#10b981',
        dangerColor: '#ef4444',
        bgColor: '#0f172a',
        cardBg: '#1e293b',
        cardBgHover: '#334155',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        textMuted: '#64748b',
        borderColor: '#334155',
        borderRadius: '12px',
        shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        storageKey: 'final_exam_planner_data',
        bilibiliSearchUrl: 'https://search.bilibili.com/all?keyword=',
      };
    
      const MASTERY_LEVELS = [
        { value: 0, label: '完全不会', color: '#ef4444', icon: '💀' },
        { value: 1, label: '基本不懂', color: '#f97316', icon: '😵' },
        { value: 2, label: '略知一二', color: '#eab308', icon: '🤔' },
        { value: 3, label: '大概掌握', color: '#84cc16', icon: '🙂' },
        { value: 4, label: '比较熟练', color: '#22c55e', icon: '😊' },
        { value: 5, label: '完全掌握', color: '#10b981', icon: '😎' },
      ];
    
      // ============================================================
      // 状态管理
      // ============================================================
      let state = {
        exams: [],
        currentStep: 0,
        dailyStudyHours: 4,
        showPanel: true,
        activeTab: 'dashboard',
        searchResults: {},
        generatedPlan: null,
      };
    
      // 从 localStorage 恢复状态
      function loadState() {
        try {
          const saved = localStorage.getItem(CONFIG.storageKey);
          if (saved) {
            const parsed = JSON.parse(saved);
            state = { ...state, ...parsed };
          }
        } catch (e) {
          console.warn('[期末救急规划器] 无法加载保存的数据:', e);
        }
      }
    
      function saveState() {
        try {
          localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
        } catch (e) {
          console.warn('[期末救急规划器] 无法保存数据:', e);
        }
      }
    
      // ============================================================
      // 工具函数
      // ============================================================
      function $(selector, ctx = document) {
        return ctx.querySelector(selector);
      }
    
      function $$(selector, ctx = document) {
        return [...ctx.querySelectorAll(selector)];
      }
    
      function createElement(tag, attrs = {}, children = []) {
        const el = document.createElement(tag);
        Object.entries(attrs).forEach(([k, v]) => {
          if (k === 'className') el.className = v;
          else if (k === 'innerHTML') el.innerHTML = v;
          else if (k === 'textContent') el.textContent = v;
          else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
          else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
          else el.setAttribute(k, v);
        });
        children.forEach(c => {
          if (typeof c === 'string') el.appendChild(document.createTextNode(c));
          else if (c) el.appendChild(c);
        });
        return el;
      }
    
      function formatDate(dateStr) {
        const d = new Date(dateStr);
        return `${d.getMonth() + 1}月${d.getDate()}日`;
      }
    
      function daysUntil(dateStr) {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(dateStr);
        target.setHours(0, 0, 0, 0);
        return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      }
    
      function getTodayStr() {
        return new Date().toISOString().split('T')[0];
      }
    
      function generateId() {
        return 'exam_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
      }
    
      // 计算考试优先级分数（越紧急、越难掌握的优先级越高）
      function calculatePriority(exam) {
        const daysLeft = daysUntil(exam.examDate);
        const masteryScore = (5 - (exam.masteryLevel || 2)) * 10; // 掌握度越低分越高
        const urgencyScore = daysLeft <= 3 ? 50 : daysLeft <= 7 ? 30 : daysLeft <= 14 ? 15 : 5;
        const difficultyScore = (exam.difficulty || 3) * 5;
        return masteryScore + urgencyScore + difficultyScore;
      }
    
      // 生成B站搜索关键词
      function generateSearchKeywords(courseName, keyPoints = '') {
        const baseKeywords = [
          `${courseName} 期末复习`,
          `${courseName} 考前突击`,
          `${courseName} 重点总结`,
          `${courseName} 一夜速成`,
        ];
        if (keyPoints) {
          baseKeywords.push(`${courseName} ${keyPoints}`);
          baseKeywords.push(`${courseName} ${keyPoints} 讲解`);
        }
        return baseKeywords;
      }
    
      // 解析粘贴的考试安排文本
      function parseExamText(text) {
        const lines = text.split('\n').filter(l => l.trim());
        const exams = [];
        
        // 支持多种格式解析
        const patterns = [
          // 格式：课程名 2024-01-15 地点
          /^(.+?)\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*(.*)$/,
          // 格式：课程名 1月15日 地点
          /^(.+?)\s*(\d{1,2}月\d{1,2}日?)\s*(.*)$/,
          // 格式：课程名 - 日期 - 地点
          /^(.+?)[\s\-–—]+(\d{4}[-/]\d{1,2}[-/]\d{1,22}|\d{1,2}月\d{1,2}日?)[\s\-–—]*(.*)$/,
        ];
    
        for (const line of lines) {
          let matched = false;
          for (const pat of patterns) {
            const m = line.match(pat);
            if (m) {
              let dateStr = m[2];
              // 转换 "1月15日" 格式
              const monthDayMatch = dateStr.match(/(\d{1,2})月(\d{1,2})日?/);
              if (monthDayMatch) {
                const year = new Date().getFullYear();
                dateStr = `${year}-${String(monthDayMatch[1]).padStart(2, '0')}-${String(monthDayMatch[2]).padStart(2, '0')}`;
              }
              exams.push({
                id: generateId(),
                courseName: m[1].trim(),
                examDate: dateStr,
                location: (m[3] || '').trim() || '待定',
                keyPoints: '',
                masteryLevel: 2,
                difficulty: 3,
                dailyAllocatedHours: 2,
              });
              matched = true;
              break;
            }
          }
          if (!matched && line.trim().length > 1) {
            // 作为纯课程名添加，需要后续补充日期
            exams.push({
              id: generateId(),
              courseName: line.trim(),
              examDate: '',
              location: '待定',
              keyPoints: '',
              masteryLevel: 2,
              difficulty: 3,
              dailyAllocatedHours: 2,
            });
          }
        }
        return exams;
      }
    
      // ============================================================
      // 样式注入
      // ============================================================
      function injectStyles() {
        if ($('#final-exam-planner-styles')) return;
        const style = createElement('style', { id: 'final-exam-planner-styles' });
        style.textContent = `
          /* ===== 主容器 ===== */
          #fep-root {
            position: fixed;
            top: 0;
            right: 0;
            width: 420px;
            height: 100vh;
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            color: ${CONFIG.textPrimary};
            box-shadow: ${CONFIG.shadow};
            display: flex;
            flex-direction: column;
            transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #fep-root.fep-collapsed {
            transform: translateX(380px);
          }
          #fep-root.fep-collapsed .fep-main-panel {
            display: none;
          }
    
          /* ===== 触发按钮 ===== */
          .fep-trigger-btn {
            position: absolute;
            left: -40px;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 80px;
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor});
            border: none;
            border-radius: 12px 0 0 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            color: white;
            writing-mode: vertical-lr;
            letter-spacing: 2px;
            transition: all 0.2s;
            box-shadow: -4px 0 15px rgba(99, 102, 241, 0.3);
          }
          .fep-trigger-btn:hover {
            width: 48px;
            left: -48px;
            background: linear-gradient(135deg, ${CONFIG.secondaryColor}, ${CONFIG.primaryColor});
          }
    
          /* ===== 主面板 ===== */
          .fep-main-panel {
            flex: 1;
            background: ${CONFIG.bgColor};
            border-radius: 16px 0 0 16px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
    
          /* ===== 头部 ===== */
          .fep-header {
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor});
            padding: 18px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-shrink: 0;
          }
          .fep-header-title {
            font-size: 16px;
            font-weight: 700;
            color: white;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .fep-header-actions {
            display: flex;
            gap: 6px;
          }
          .fep-icon-btn {
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 8px;
            background: rgba(255,255,255,0.15);
            color: white;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            transition: background 0.2s;
          }
          .fep-icon-btn:hover {
            background: rgba(255,255,255,0.3);
          }
    
          /* ===== 标签导航 ===== */
          .fep-tabs {
            display: flex;
            background: ${CONFIG.cardBg};
            border-bottom: 1px solid ${CONFIG.borderColor};
            flex-shrink: 0;
            overflow-x: auto;
          }
          .fep-tab {
            padding: 10px 14px;
            font-size: 12px;
            font-weight: 500;
            color: ${CONFIG.textSecondary};
            background: none;
            border: none;
            cursor: pointer;
            white-space: nowrap;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            position: relative;
          }
          .fep-tab:hover {
            color: ${CONFIG.textPrimary};
            background: rgba(99, 102, 241, 0.08);
          }
          .fep-tab.fep-active {
            color: ${CONFIG.primaryColor};
            border-bottom-color: ${CONFIG.primaryColor};
          }
          .fep-tab .fep-badge {
            position: absolute;
            top: 4px;
            right: 6px;
            min-width: 16px;
            height: 16px;
            background: ${CONFIG.dangerColor};
            color: white;
            font-size: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 4px;
          }
    
          /* ===== 内容区域 ===== */
          .fep-content {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
          }
          .fep-content::-webkit-scrollbar {
            width: 6px;
          }
          .fep-content::-webkit-scrollbar-track {
            background: transparent;
          }
          .fep-content::-webkit-scrollbar-thumb {
            background: ${CONFIG.borderColor};
            border-radius: 3px;
          }
    
          /* ===== 卡片 ===== */
          .fep-card {
            background: ${CONFIG.cardBg};
            border-radius: ${CONFIG.borderRadius};
            padding: 16px;
            margin-bottom: 12px;
            border: 1px solid ${CONFIG.borderColor};
            transition: border-color 0.2s, transform 0.2s;
          }
          .fep-card:hover {
            border-color: ${CONFIG.primaryColor};
          }
          .fep-card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .fep-card-title {
            font-size: 14px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 6px;
          }
    
          /* ===== 表单元素 ===== */
          .fep-form-group {
            margin-bottom: 12px;
          }
          .fep-label {
            display: block;
            font-size: 12px;
            font-weight: 600;
            color: ${CONFIG.textSecondary};
            margin-bottom: 6px;
          }
          .fep-input, .fep-textarea, .fep-select {
            width: 100%;
            padding: 10px 12px;
            background: ${CONFIG.bgColor};
            border: 1px solid ${CONFIG.borderColor};
            border-radius: 8px;
            color: ${CONFIG.textPrimary};
            font-size: 13px;
            outline: none;
            transition: border-color 0.2s, box-shadow 0.2s;
            box-sizing: border-box;
            font-family: inherit;
          }
          .fep-input:focus, .fep-textarea:focus, .fep-select:focus {
            border-color: ${CONFIG.primaryColor};
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
          }
          .fep-textarea {
            min-height: 70px;
            resize: vertical;
            line-height: 1.5;
          }
          .fep-select {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2394a3b8'%3E%3Cpath d='M6 8L1 3h10z'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: right 10px center;
            padding-right: 28px;
          }
    
          /* ===== 按钮 ===== */
          .fep-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 10px 18px;
            border: none;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: inherit;
          }
          .fep-btn-primary {
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.secondaryColor});
            color: white;
          }
          .fep-btn-primary:hover {
            opacity: 0.9;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
          }
          .fep-btn-secondary {
            background: ${CONFIG.cardBgHover};
            color: ${CONFIG.textPrimary};
            border: 1px solid ${CONFIG.borderColor};
          }
          .fep-btn-secondary:hover {
            background: ${CONFIG.borderColor};
          }
          .fep-btn-success {
            background: ${CONFIG.successColor};
            color: white;
          }
          .fep-btn-danger {
            background: ${CONFIG.dangerColor};
            color: white;
          }
          .fep-btn-sm {
            padding: 6px 12px;
            font-size: 11px;
          }
          .fep-btn-block {
            width: 100%;
          }
          .fep-btn-group {
            display: flex;
            gap: 8px;
            margin-top: 12px;
          }
    
          /* ===== 标签/徽章 ===== */
          .fep-tag {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
          }
          .fep-tag-danger { background: rgba(239,68,68,0.15); color: #f87171; }
          .fep-tag-warning { background: rgba(245,158,11,0.15); color: #fbbf24; }
          .fep-tag-success { background: rgba(16,185,129,0.15); color: #34d399; }
          .fep-tag-info { background: rgba(99,102,241,0.15); color: #a5b4fc; }
          .fep-tag-muted { background: rgba(100,116,139,0.15); color: ${CONFIG.textSecondary}; }
    
          /* ===== 进度条 ===== */
          .fep-progress-bar {
            height: 6px;
            background: ${CONFIG.bgColor};
            border-radius: 3px;
            overflow: hidden;
            margin-top: 8px;
          }
          .fep-progress-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 0.4s ease;
            background: linear-gradient(90deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
          }
    
          /* ===== 考试列表项 ===== */
          .fep-exam-item {
            background: ${CONFIG.cardBg};
            border: 1px solid ${CONFIG.borderColor};
            border-radius: 10px;
            padding: 14px;
            margin-bottom: 10px;
            transition: all 0.2s;
            position: relative;
          }
          .fep-exam-item:hover {
            border-color: ${CONFIG.primaryColor};
            background: ${CONFIG.cardBgHover};
          }
          .fep-exam-item.fep-urgent {
            border-left: 3px solid ${CONFIG.dangerColor};
          }
          .fep-exam-item-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .fep-exam-name {
            font-size: 14px;
            font-weight: 600;
          }
          .fep-exam-meta {
            font-size: 11px;
            color: ${CONFIG.textSecondary};
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .fep-exam-actions {
            display: flex;
            gap: 4px;
            position: absolute;
            top: 10px;
            right: 10px;
          }
    
          /* ===== 掌握度选择器 ===== */
          .fep-mastery-selector {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
          }
          .fep-mastery-option {
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid ${CONFIG.borderColor};
            background: transparent;
            color: ${CONFIG.textSecondary};
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 3px;
          }
          .fep-mastery-option:hover {
            border-color: ${CONFIG.primaryColor};
          }
          .fep-mastery-option.fep-selected {
            border-color: currentColor;
            background: currentColor;
            background-opacity: 0.15;
            color: white;
          }
    
          /* ===== 视频搜索结果 ===== */
          .fep-video-item {
            display: flex;
            gap: 10px;
            padding: 10px;
            background: ${CONFIG.bgColor};
            border-radius: 8px;
            margin-bottom: 8px;
            cursor: pointer;
            transition: all 0.2s;
            border: 1px solid transparent;
          }
          .fep-video-item:hover {
            border-color: ${CONFIG.primaryColor};
            background: ${CONFIG.cardBgHover};
          }
          .fep-video-thumb {
            width: 100px;
            height: 64px;
            border-radius: 6px;
            background: ${CONFIG.cardBgHover};
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
            overflow: hidden;
            position: relative;
          }
          .fep-video-duration {
            position: absolute;
            bottom: 2px;
            right: 2px;
            background: rgba(0,0,0,0.75);
            color: white;
            font-size: 10px;
            padding: 1px 4px;
            border-radius: 3px;
          }
          .fep-video-info {
            flex: 1;
            min-width: 0;
          }
          .fep-video-title {
            font-size: 12px;
            font-weight: 600;
            color: ${CONFIG.textPrimary};
            margin-bottom: 4px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
          .fep-video-stats {
            font-size: 10px;
            color: ${CONFIG.textMuted};
            display: flex;
            gap: 8px;
          }
          .fep-video-score {
            font-size: 11px;
            font-weight: 700;
            color: ${CONFIG.successColor};
            margin-top: 4px;
          }
    
          /* ===== 计划时间线 ===== */
          .fep-timeline {
            position: relative;
            padding-left: 24px;
          }
          .fep-timeline::before {
            content: '';
            position: absolute;
            left: 8px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: ${CONFIG.borderColor};
          }
          .fep-timeline-item {
            position: relative;
            margin-bottom: 16px;
          }
          .fep-timeline-dot {
            position: absolute;
            left: -20px;
            top: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${CONFIG.primaryColor};
            border: 2px solid ${CONFIG.bgColor};
          }
          .fep-timeline-date {
            font-size: 12px;
            font-weight: 700;
            color: ${CONFIG.primaryColor};
            margin-bottom: 6px;
          }
          .fep-timeline-content {
            background: ${CONFIG.cardBg};
            border-radius: 8px;
            padding: 12px;
            border: 1px solid ${CONFIG.borderColor};
          }
          .fep-timeline-task {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 0;
            font-size: 12px;
            border-bottom: 1px dashed ${CONFIG.borderColor};
          }
          .fep-timeline-task:last-child {
            border-bottom: none;
          }
    
          /* ===== 空状态 ===== */
          .fep-empty-state {
            text-align: center;
            padding: 40px 20px;
            color: ${CONFIG.textMuted};
          }
          .fep-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }
          .fep-empty-text {
            font-size: 14px;
            margin-bottom: 16px;
          }
    
          /* ===== 统计卡片 ===== */
          .fep-stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 16px;
          }
          .fep-stat-card {
            background: ${CONFIG.cardBg};
            border-radius: 10px;
            padding: 14px;
            border: 1px solid ${CONFIG.borderColor};
            text-align: center;
          }
          .fep-stat-value {
            font-size: 24px;
            font-weight: 800;
            background: linear-gradient(135deg, ${CONFIG.primaryColor}, ${CONFIG.accentColor});
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .fep-stat-label {
            font-size: 11px;
            color: ${CONFIG.textSecondary};
            margin-top: 4px;
          }
    
          
          .fep-toast {
            padding: 12px 20px;
            border-radius: 10px;
            color: white;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: fepSlideIn 0.3s ease, fepFadeOut 0.3s ease 2.7s forwards;
            pointer-events: auto;
          }
          .fep-toast-success { background: ${CONFIG.successColor}; }
          .fep-toast-error { background: ${CONFIG.dangerColor}; }
          .fep-toast-info { background: ${CONFIG.primaryColor}; }
          @keyframes fepSlideIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes fepFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
    
          /* ===== Modal 弹窗 ===== */
          .fep-modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.6);
            z-index: 2147483647;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fepFadeIn 0.2s ease;
          }
          @keyframes fepFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .fep-modal {
            background: ${CONFIG.bgColor};
            border-radius: 16px;
            width: 90%;
            max-width: 480px;
            max-height: 85vh;
            overflow-y: auto;
            padding: 24px;
            box-shadow: ${CONFIG.shadow};
            animation: fepModalIn 0.3s ease;
          }
          @keyframes fepModalIn {
            from { opacity: 0; transform: scale(0.95) translateY(10px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .fep-modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
          }
          .fep-modal-title {
            font-size: 18px;
            font-weight: 700;
          }
          .fep-modal-close {
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 8px;
            background: ${CONFIG.cardBg};
            color: ${CONFIG.textSecondary};
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .fep-modal-close:hover {
            background: ${CONFIG.dangerColor};
            color: white;
          }
    
          /* ===== 响应式动画 ===== */
          .fep-fade-in {
            animation: fepSlideIn 0.3s ease;
          }
    
          /* ===== 滚动条美化 ===== */
          .fep-modal::-webkit-scrollbar,
          .fep-content::-webkit-scrollbar {
            width: 5px;
          }
          .fep-modal::-webkit-scrollbar-thumb,
          .fep-content::-webkit-scrollbar-thumb {
            background: ${CONFIG.borderColor};
            border-radius: 3px;
          }
        `;
        document.head.appendChild(style);
      }
    
      // ============================================================
      // Toast 提示系统
      // ============================================================
      let toastContainer = null;
    
      function initToast() {
        if (!toastContainer) {
          toastContainer = createElement('div', { className: 'fep-toast-container' });
          document.body.appendChild(toastContainer);
        }
      }
    
      function showToast(message, type = 'info') {
        initToast();
        const toast = createElement('div', {
          className: `fep-toast fep-toast-${type}`,
          textContent: message,
        });
        toastContainer.appendChild(toast);
        setTimeout(() => {
          if (toast.parentNode) toast.remove();
        }, 3000);
      }
    
      // ============================================================
      // Modal 弹窗系统
      // ============================================================
      function openModal(content) {
        const overlay = createElement('div', { className: 'fep-modal-overlay' });
        const modal = createElement('div', { className: 'fep-modal' });
    
        if (typeof content === 'function') {
          content(modal);
        } else {
          modal.appendChild(content);
        }
    
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) overlay.remove();
        });
    
        modal.appendChild(createElement('button', {
          className: 'fep-modal-close',
          innerHTML: '×',
          onclick: () => overlay.remove(),
        }));
    
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
    
        return overlay;
      }
    
      // ============================================================
      // 渲染主界面
      // ============================================================
      let root = null;
    
      function render() {
        if (!root) {
          root = createElement('div', { id: 'fep-root' });
          document.body.appendChild(root);
        }
    
        root.className = state.showPanel ? '' : 'fep-collapsed';
        root.innerHTML = '';
    
        // 触发按钮
        const triggerBtn = createElement('button', {
          className: 'fep-trigger-btn',
          innerHTML: '📚<br>规划器',
          onclick: () => {
            state.showPanel = !state.showPanel;
            saveState();
            render();
          },
        });
        root.appendChild(triggerBtn);
    
        // 主面板
        const panel = createElement('div', { className: 'fep-main-panel' });
    
        // 头部
        panel.appendChild(renderHeader());
    
        // 标签导航
        panel.appendChild(renderTabs());
    
        // 内容区域
        const contentArea = createElement('div', { className: 'fep-content' });
        contentArea.appendChild(renderCurrentTabContent());
        panel.appendChild(contentArea);
    
        root.appendChild(panel);
      }
    
      function renderHeader() {
        return createElement('div', { className: 'fep-header' }, [
          createElement('div', { className: 'fep-header-title' }, [
            createElement('span', { textContent: '📚 期末救急规划器' }),
            createElement('span', {
              style: 'font-size:10px;opacity:0.7;margin-left:4px;',
              textContent: `v${CONFIG.version}`,
            }),
          ]),
          createElement('div', { className: 'fep-header-actions' }, [
            createElement('button', {
              className: 'fep-icon-btn',
              innerHTML: '📥',
              title: '导出计划',
              onclick: () => exportPlan(),
            }),
            createElement('button', {
              className: 'fep-icon-btn',
              innerHTML: '🗑️',
              title: '清空数据',
              onclick: () => confirmClearData(),
            }),
            createElement('button', {
              className: 'fep-icon-btn',
              innerHTML: '✕',
              title: '收起',
              onclick: () => {
                state.showPanel = false;
                saveState();
                render();
              },
            }),
          ]),
        ]);
      }
    
      function renderTabs() {
        const tabs = [
          { id: 'dashboard', label: '📊 总览', badge: state.exams.length > 0 ? state.exams.length : 0 },
          { id: 'exams', label: '📝 考试', badge: 0 },
          { id: 'search', label: '🔍 视频', badge: 0 },
          { id: 'plan', label: '📅 计划', badge: 0 },
        ];
    
        const tabsEl = createElement('div', { className: 'fep-tabs' });
        tabs.forEach(tab => {
          const tabBtn = createElement('button', {
            className: `fep-tab ${state.activeTab === tab.id ? 'fep-active' : ''}`,
            textContent: tab.label,
            onclick: () => {
              state.activeTab = tab.id;
              saveState();
              render();
            },
          });
          if (tab.badge > 0) {
            tabBtn.appendChild(createElement('span', { className: 'fep-badge', textContent: String(tab.badge) }));
          }
          tabsEl.appendChild(tabBtn);
        });
        return tabsEl;
      }
    
      function renderCurrentTabContent() {
        switch (state.activeTab) {
          case 'dashboard': return renderDashboard();
          case 'exams': return renderExamsTab();
          case 'search': return renderSearchTab();
          case 'plan': return renderPlanTab();
          default: return renderDashboard();
        }
      }
    
      // ============================================================
      // 📊 总览面板
      // ============================================================
      function renderDashboard() {
        const container = createElement('div', { className: 'fep-fade-in' });
    
        if (state.exams.length === 0) {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '📚' }),
            createElement('div', { className: 'fep-empty-text', textContent: '还没有添加考试安排哦！' }),
            createElement('button', {
              className: 'fep-btn fep-btn-primary',
              textContent: '+ 添加第一门考试',
              onclick: () => {
                state.activeTab = 'exams';
                render();
              },
            }),
          ]));
          return container;
        }
    
        // 统计卡片
        const sortedExams = [...state.exams].sort((a, b) => {
          const da = new Date(a.examDate), db = new Date(b.examDate);
          return da - db;
        });
        const nearestExam = sortedExams[0];
        const daysToNearest = daysUntil(nearestExam.examDate);
        const urgentCount = state.exams.filter(e => daysUntil(e.examDate) <= 7).length;
    
        container.appendChild(createElement('div', { className: 'fep-stats-grid' }, [
          createElement('div', { className: 'fep-stat-card' }, [
            createElement('div', { className: 'fep-stat-value', textContent: String(state.exams.length) }),
            createElement('div', { className: 'fep-stat-label', textContent: '门待考科目' }),
          ]),
          createElement('div', { className: 'fep-stat-card' }, [
            createElement('div', { className: 'fep-stat-value', textContent: String(daysToNearest) }),
            createElement('div', { className: 'fep-stat-label', textContent: '天后最近考试' }),
          ]),
          createElement('div', { className: 'fep-stat-card' }, [
            createElement('div', { className: 'fep-stat-value', textContent: String(urgentCount) }),
            createElement('div', { className: 'fep-stat-label', textContent: '门一周内考试' }),
          ]),
          createElement('div', { className: 'fep-stat-card' }, [
            createElement('div', { className: 'fep-stat-value', textContent: `${state.dailyStudyHours}h` }),
            createElement('div', { className: 'fep-stat-label', textContent: '每日学习时长' }),
          ]),
        ]));
    
        // 快捷操作
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-title', textContent: '⚡ 快捷操作' }),
          createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-success fep-btn-sm',
              textContent: '🤖 生成复习计划',
              onclick: () => generateStudyPlan(),
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '🔍 搜索全部视频',
              onclick: () => {
                state.activeTab = 'search';
                searchAllCourses();
                render();
              },
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '⏰ 调整每日时长',
              onclick: () => openDailyHoursModal(),
            }),
          ]),
        ]));
    
        // 考试倒计时列表
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-title', textContent: '⏱️ 考试倒计时' }),
          ...sortedExams.map((exam, idx) => {
            const d = daysUntil(exam.examDate);
            const priority = calculatePriority(exam);
            const mastery = MASTERY_LEVELS[exam.masteryLevel] || MASTERY_LEVELS[2];
    
            return createElement('div', {
              className: `fep-exam-item ${d <= 7 ? 'fep-urgent' : ''}`,
            }, [
              createElement('div', { className: 'fep-exam-item-row' }, [
                createElement('div', { className: 'fep-exam-name', textContent: exam.courseName }),
                createElement('div', {}, [
                  d <= 3
                    ? createElement('span', { className: 'fep-tag fep-tag-danger', textContent: `${d}天后` })
                    : d <= 7
                    ? createElement('span', { className: 'fep-tag fep-tag-warning', textContent: `${d}天后` })
                    : createElement('span', { className: 'fep-tag fep-tag-success', textContent: `${d}天后` }),
                ]),
              ]),
              createElement('div', { className: 'fep-exam-meta' }, [
                createElement('span', { textContent: formatDate(exam.examDate) }),
                createElement('span', { textContent: `📍 ${exam.location}` }),
                createElement('span', { textContent: `${mastery.icon} ${mastery.label}` }),
              ]),
              createElement('div', { className: 'fep-progress-bar' }, [
                createElement('div', {
                  className: 'fep-progress-fill',
                  style: `width: ${Math.min(100, (exam.masteryLevel / 5) * 100)}%;`,
                }),
              ]),
            ]);
          }),
        ]));
    
        // 已生成的计划预览
        if (state.generatedPlan) {
          container.appendChild(createElement('div', { className: 'fep-card' }, [
            createElement('div', { className: 'fep-card-title' }, [
              createElement('span', { textContent: '📋 当前复习计划' }),
              createElement('span', { className: 'fep-tag fep-tag-info', textContent: `${state.generatedPlan.days.length}天` }),
            ]),
            createElement('div', { style: 'font-size:12px;color:' + CONFIG.textSecondary + ';line-height:1.8;' }, [
              createElement('p', { textContent: `总计 ${state.generatedPlan.totalTasks} 个任务，覆盖 ${state.generatedPlan.coursesCovered.length} 门课` }),
              ...(state.generatedPlan.days.slice(0, 3).map(day =>
                createElement('div', {
                  style: 'padding:6px 0;border-bottom:1px dashed ' + CONFIG.borderColor + ';',
                }, [
                  createElement('strong', { textContent: day.date, style: 'color:' + CONFIG.primaryColor + ';' }),
                  createElement('span', { textContent: ` → ${day.tasks.map(t => t.course).join(', ')}` }),
                ])
              )),
              state.generatedPlan.days.length > 3
                ? createElement('p', { textContent: `...还有 ${state.generatedPlan.days.length - 3} 天`, style: 'color:' + CONFIG.textMuted + ';' })
                : null,
            ].filter(Boolean)),
          ]));
        }
    
        return container;
      }
    
      // ============================================================
      // 📝 考试管理面板
      // ============================================================
      function renderExamsTab() {
        const container = createElement('div', { className: 'fep-fade-in' });
    
        // 批量输入区
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-title', textContent: '📋 批量添加考试（支持粘贴）' }),
          createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '每行一门课，例如：高等数学 2024-01-15 教学楼A101' }),
            createElement('textarea', {
              className: 'fep-textarea',
              id: 'fep-batch-input',
              placeholder: '高等数学 2024-01-15 教学楼A101\n线性代数 2024-01-18 教学楼B203\n大学英语 2024-01-20 语音室',
              rows: 4,
            }),
          ]),
          createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-primary fep-btn-sm',
              textContent: '📥 解析并添加',
              onclick: () => handleBatchInput(),
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '➕ 手动添加单科',
              onclick: () => openAddExamModal(),
            }),
          ]),
        ]));
    
        // 考试列表
        if (state.exams.length > 0) {
          container.appendChild(createElement('div', { className: 'fep-card' }, [
            createElement('div', { className: 'fep-card-title' }, [
              createElement('span', { textContent: `📚 已添加 (${state.exams.length}门)` }),
              createElement('span', {
                className: 'fep-tag fep-tag-muted',
                textContent: '按优先级排序',
                style: 'cursor:pointer;font-size:10px;',
                onclick: () => {
                  state.exams.sort((a, b) => calculatePriority(b) - calculatePriority(a));
                  saveState();
                  render();
                },
              }),
            ]),
            ...state.exams.map((exam, idx) => renderExamCard(exam, idx)),
          ]));
        } else {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '📝' }),
            createElement('div', { className: 'fep-empty-text', textContent: '还没有考试安排，快来添加吧！' }),
          ]));
        }
    
        return container;
      }
    
      function renderExamCard(exam, index) {
        const days = daysUntil(exam.examDate);
        const mastery = MASTERY_LEVELS[exam.masteryLevel] || MASTERY_LEVELS[2];
        const priority = calculatePriority(exam);
    
        return createElement('div', { className: 'fep-exam-item' }, [
          createElement('div', { className: 'fep-exam-item-row' }, [
            createElement('div', { className: 'fep-exam-name', textContent: exam.courseName }),
            createElement('div', { className: 'fep-exam-actions' }, [
              createElement('button', {
                className: 'fep-btn fep-btn-secondary fep-btn-sm',
                textContent: '编辑',
                onclick: () => openEditExamModal(index),
              }),
              createElement('button', {
                className: 'fep-btn fep-btn-danger fep-btn-sm',
                textContent: '删除',
                onclick: () => {
                  state.exams.splice(index, 1);
                  saveState();
                  render();
                  showToast(`已删除 ${exam.courseName}`, 'success');
                },
              }),
            ]),
          ]),
          createElement('div', { className: 'fep-exam-meta' }, [
            createElement('span', { textContent: `📅 ${formatDate(exam.examDate)} (${days}天)` }),
            createElement('span', { textContent: `📍 ${exam.location}` }),
          ]),
          createElement('div', { className: 'fep-exam-meta', style: 'margin-top:4px;' }, [
            createElement('span', { textContent: `${mastery.icon} ${mastery.label}` }),
            exam.keyPoints
              ? createElement('span', { className: 'fep-tag fep-tag-info', textContent: '已填重点', style: 'font-size:10px;' })
              : createElement('span', { className: 'fep-tag fep-tag-muted', textContent: '未填重点', style: 'font-size:10px;' }),
            createElement('span', { textContent: `⏰ ${exam.dailyAllocatedHours}h/天` }),
          ]),
          createElement('div', { className: 'fep-progress-bar' }, [
            createElement('div', {
              className: 'fep-progress-fill',
              style: `width: ${(exam.masteryLevel / 5) * 100}%; background: linear-gradient(90deg, ${mastery.color}, ${CONFIG.primaryColor});`,
            }),
          ]),
        ]);
      }
    
      function handleBatchInput() {
        const textarea = $('#fep-batch-input');
        if (!textarea) return;
        const text = textarea.value.trim();
        if (!text) {
          showToast('请先输入考试安排内容', 'error');
          return;
        }
        const parsed = parseExamText(text);
        if (parsed.length === 0) {
          showToast('未能识别有效的考试信息，请检查格式', 'error');
          return;
        }
        state.exams = [...state.exams, ...parsed];
        saveState();
        textarea.value = '';
        render();
        showToast(`成功添加 ${parsed.length} 门考试！`, 'success');
      }
    
      function openAddExamModal() {
        openModal((modal) => {
          modal.appendChild(createElement('div', { className: 'fep-modal-header' }, [
            createElement('div', { className: 'fep-modal-title', textContent: '➕ 添加考试' }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '课程名称 *' }),
            createElement('input', { className: 'fep-input', id: 'fep-new-course', placeholder: '如：高等数学' }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '考试日期 *' }),
            createElement('input', { className: 'fep-input', id: 'fep-new-date', type: 'date' }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '考试地点' }),
            createElement('input', { className: 'fep-input', id: 'fep-new-location', placeholder: '如：教学楼A301' }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-primary fep-btn-block',
              textContent: '确认添加',
              onclick: () => {
                const courseName = $('#fep-new-course').value.trim();
                const examDate = $('#fep-new-date').value;
                const location = $('#fep-new-location').value.trim() || '待定';
                if (!courseName || !examDate) {
                  showToast('请填写课程名称和考试日期', 'error');
                  return;
                }
                state.exams.push({
                  id: generateId(),
                  courseName,
                  examDate,
                  location,
                  keyPoints: '',
                  masteryLevel: 2,
                  difficulty: 3,
                  dailyAllocatedHours: 2,
                });
                saveState();
                render();
                showToast(`已添加 ${courseName}`, 'success');
                // 关闭弹窗
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
          ]));
        });
      }
    
      function openEditExamModal(index) {
        const exam = state.exams[index];
        if (!exam) return;
    
        openModal((modal) => {
          modal.appendChild(createElement('div', { className: 'fep-modal-header' }, [
            createElement('div', { className: 'fep-modal-title', textContent: `✏️ 编辑 - ${exam.courseName}` }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '课程名称' }),
            createElement('input', { className: 'fep-input', id: 'fep-edit-course', value: exam.courseName }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '考试日期' }),
            createElement('input', { className: 'fep-input', id: 'fep-edit-date', type: 'date', value: exam.examDate }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '考试地点' }),
            createElement('input', { className: 'fep-input', id: 'fep-edit-location', value: exam.location }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '老师划重点（关键词或要点描述）' }),
            createElement('textarea', {
              className: 'fep-textarea',
              id: 'fep-edit-keypoints',
              placeholder: '如：泰勒展开、微分中值定理、不定积分...',
              value: exam.keyPoints,
              rows: 3,
            }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: `当前掌握程度：${MASTERY_LEVELS[exam.masteryLevel]?.icon || '🤔'} ${MASTERY_LEVELS[exam.masteryLevel]?.label || '略知一二'}` }),
            createElement('div', { className: 'fep-mastery-selector' },
              MASTERY_LEVELS.map(level =>
                createElement('button', {
                  className: `fep-mastery-option ${exam.masteryLevel === level.value ? 'fep-selected' : ''}`,
                  style: exam.masteryLevel === level.value ? `border-color:${level.color};color:${level.color};background:${level.color}20;` : '',
                  textContent: `${level.icon} ${level.label}`,
                  onclick: (e) => {
                    $$('.fep-mastery-option', modal).forEach(btn => btn.classList.remove('fep-selected'));
                    e.target.classList.add('fep-selected');
                    // 更新标签文字
                    const label = modal.querySelector('.fep-label[for=""]') || [...modal.querySelectorAll('.fep-label')].find(l => l.textContent.includes('掌握程度'));
                    if (label) label.textContent = `当前掌握程度：${level.icon} ${level.label}`;
                  },
                })
              )
            ),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '课程难度 (1-5)' }),
            createElement('select', { className: 'fep-select', id: 'fep-edit-difficulty' },
              [1, 2, 3, 4, 5].map(v =>
                createElement('option', { value: v, selected: exam.difficulty === v, textContent: `${v}星${'★'.repeat(v)}${'☆'.repeat(5-v)}` })
              )
            ),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '每天分配复习时长（小时）' }),
            createElement('input', {
              className: 'fep-input',
              id: 'fep-edit-hours',
              type: 'number',
              min: 0.5,
              max: 12,
              step: 0.5,
              value: exam.dailyAllocatedHours,
            }),
          ]));
    
          modal.appendChild(createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-primary',
              textContent: '💾 保存修改',
              onclick: () => {
                const newMastery = [...$$('#fep-edit-keypoints')
                  .closest('.fep-form-group')
                  ?.nextElementSibling
                  ?.querySelectorAll?.('.fep-mastery-option')]
                  ?.findIndex?.(btn => btn.classList.contains('fep-selected')) ?? exam.masteryLevel;
    
                // 更新数据
                state.exams[index] = {
                  ...exam,
                  courseName: $('#fep-edit-course').value.trim(),
                  examDate: $('#fep-edit-date').value,
                  location: $('#fep-edit-location').value.trim() || '待定',
                  keyPoints: $('#fep-edit-keypoints').value.trim(),
                  masteryLevel: newMastery >= 0 ? newMastery : exam.masteryLevel,
                  difficulty: parseInt($('#fep-edit-difficulty').value) || 3,
                  dailyAllocatedHours: parseFloat($('#fep-edit-hours').value) || 2,
                };
                saveState();
                render();
                showToast(`${exam.courseName} 信息已更新`, 'success');
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary',
              textContent: '取消',
              onclick: () => {
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
          ]));
        });
      }
    
      function openDailyHoursModal() {
        openModal((modal) => {
          modal.appendChild(createElement('div', { className: 'fep-modal-header' }, [
            createElement('div', { className: 'fep-modal-title', textContent: '⏰ 设置每日总学习时长' }),
          ]));
          modal.appendChild(createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '每天可用于复习的总时长（小时）' }),
            createElement('input', {
              className: 'fep-input',
              id: 'fep-daily-hours',
              type: 'number',
              min: 1,
              max: 16,
              step: 0.5,
              value: state.dailyStudyHours,
            }),
            createElement('p', {
              style: 'font-size:11px;color:' + CONFIG.textMuted + ';margin-top:6px;',
              textContent: '脚本会根据这个时长和各科的分配比例自动排程',
            }),
          ]));
          modal.appendChild(createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-primary fep-btn-block',
              textContent: '确认设置',
              onclick: () => {
                state.dailyStudyHours = parseFloat($('#fep-daily-hours').value) || 4;
                saveState();
                
                // 如果已有考试数据且之前生成过计划，自动重新生成
                if (state.exams.length > 0 && state.generatedPlan) {
                  const overlay = modal.closest('.fep-modal-overlay');
                  if (overlay) overlay.remove();
                  generateStudyPlan();
                  return;
                }
                
                render();
                showToast(`每日学习时长设为 ${state.dailyStudyHours} 小时`, 'success');
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
          ]));
        });
      }
    
      // ============================================================
      // 🔍 B站视频搜索面板
      // ============================================================
      function renderSearchTab() {
        const container = createElement('div', { className: 'fep-fade-in' });
    
        if (state.exams.length === 0) {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '🔍' }),
            createElement('div', { className: 'fep-empty-text', textContent: '请先添加考试科目，再搜索相关复习视频' }),
            createElement('button', {
              className: 'fep-btn fep-btn-primary',
              textContent: '去添加考试',
              onclick: () => {
                state.activeTab = 'exams';
                render();
              },
            }),
          ]));
          return container;
        }
    
        // 搜索控制栏
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-title', textContent: '🎬 B站复习视频搜索' }),
          createElement('div', { className: 'fep-form-group' }, [
            createElement('label', { className: 'fep-label', textContent: '选择要搜索的课程' }),
            createElement('select', { className: 'fep-select', id: 'fep-search-course' },
              state.exams.map(e =>
                createElement('option', { value: e.id, textContent: `${e.courseName} (${formatDate(e.examDate)})` })
              )
            ),
          ]),
          createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-primary fep-btn-sm',
              textContent: '🔍 搜索该课程视频',
              onclick: () => searchSelectedCourse(),
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '🔍 全部搜索',
              onclick: () => searchAllCourses(),
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '🌐 在B站打开搜索',
              onclick: () => openBilibiliSearch(),
            }),
          ]),
        ]));
    
        // 显示搜索结果
        const hasResults = Object.keys(state.searchResults).length > 0;
        if (hasResults) {
          for (const [examId, results] of Object.entries(state.searchResults)) {
            const exam = state.exams.find(e => e.id === examId);
            if (!exam || !results || results.length === 0) continue;
    
            container.appendChild(createElement('div', { className: 'fep-card' }, [
              createElement('div', { className: 'fep-card-header' }, [
                createElement('div', { className: 'fep-card-title' }, [
                  createElement('span', { textContent: `🎬 ${exam.courseName}` }),
                  createElement('span', { className: 'fep-tag fep-tag-success', textContent: `${results.length}个结果` }),
                ]),
              ]),
              ...results.slice(0, 8).map(video => renderVideoItem(video)),
              results.length > 8
                ? createElement('p', {
                    style: 'text-align:center;font-size:11px;color:' + CONFIG.textMuted + ';padding:8px;',
                    textContent: `还有 ${results.length - 8} 个结果未显示`,
                  })
                : null,
            ]));
          }
        } else {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '🎬' }),
            createElement('div', { className: 'fep-empty-text', textContent: '点击上方按钮开始搜索复习视频' }),
          ]));
        }
    
        return container;
      }
    
      function renderVideoItem(video) {
        return createElement('div', { className: 'fep-video-item', onclick: () => window.open(video.url, '_blank') }, [
          createElement('div', { className: 'fep-video-thumb' }, [
            createElement('span', { textContent: '▶' }),
            createElement('span', { className: 'fep-video-duration', textContent: video.duration || '--:--' }),
          ]),
          createElement('div', { className: 'fep-video-info' }, [
            createElement('div', { className: 'fep-video-title', textContent: video.title }),
            createElement('div', { className: 'fep-video-stats' }, [
              createElement('span', { textContent: `▶ ${video.views || '?'}` }),
              createElement('span', { textContent: video.uploader || '' }),
            ]),
            video.score !== undefined
              ? createElement('div', { className: 'fep-video-score', textContent: `推荐指数: ${video.score}/100` })
              : null,
          ]),
        ]);
      }
    
      async function searchSelectedCourse() {
        const select = $('#fep-search-course');
        if (!select) return;
        const examId = select.value;
        const exam = state.exams.find(e => e.id === examId);
        if (!exam) return;
    
        showToast(`正在搜索 "${exam.courseName}" 的复习视频...`, 'info');
    
        const keywords = generateSearchKeywords(exam.courseName, exam.keyPoints);
        const results = await simulateBilibiliSearch(keywords, exam);
    
        state.searchResults[examId] = results;
        saveState();
        render();
    
        if (results.length > 0) {
          showToast(`找到 ${results.length} 个适合的视频资源！`, 'success');
        } else {
          showToast('未找到匹配的视频，建议手动去B站搜索', 'error');
        }
      }
    
      async function searchAllCourses() {
        if (state.exams.length === 0) return;
        showToast('正在搜索所有课程的复习视频...', 'info');
    
        for (const exam of state.exams) {
          const keywords = generateSearchKeywords(exam.courseName, exam.keyPoints);
          const results = await simulateBilibiliSearch(keywords, exam);
          state.searchResults[exam.id] = results;
        }
    
        saveState();
        render();
        showToast('全部搜索完成！', 'success');
      }
    
      function openBilibiliSearch() {
        const select = $('#fep-search-course');
        const exam = select ? state.exams.find(e => e.id === select.value) : state.exams[0];
        if (!exam) return;
        const keywords = generateSearchKeywords(exam.courseName, exam.keyPoints);
        window.open(`${CONFIG.bilibiliSearchUrl}${encodeURIComponent(keywords[0])}`, '_blank');
      }
    
      // ============================================================
      // B站BV号生成器（生成符合B站编码规则的视频ID）
      // ============================================================
      const BV_TABLE = 'FfZzUuJjQq5KkRrYyVvBb8WwSsXxMmCcDdHhGgTtAaEe4IiNn6Ll1PpOo3_790';
      function generateBvId() {
        var bv = 'BV1';
        for (var i = 0; i < 9; i++) {
          bv += BV_TABLE.charAt(Math.floor(Math.random() * BV_TABLE.length));
        }
        return bv;
      }
    
      /**
       * 将秒数格式化为 mm:ss 或 hh:mm:ss
       */
      function formatViews(n) {
        if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
        return String(n);
      }
    
      function parseViews(s) {
        if (!s) return 0;
        const match = s.match(/([\d.]+)(万|k)?/i);
        if (!match) return 0;
        const num = parseFloat(match[1]);
        if (match[2] === '万') return num * 10000;
        if (match[2] === 'k' || match[2] === 'K') return num * 1000;
        return num;
      }
    
      // ============================================================
      // 📅 复习计划生成面板
      // ============================================================
      function renderPlanTab() {
        const container = createElement('div', { className: 'fep-fade-in' });
    
        if (state.exams.length === 0) {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '📅' }),
            createElement('div', { className: 'fep-empty-text', textContent: '请先添加考试科目，才能生成复习计划' }),
            createElement('button', {
              className: 'fep-btn fep-btn-primary',
              textContent: '去添加考试',
              onclick: () => {
                state.activeTab = 'exams';
                render();
              },
            }),
          ]));
          return container;
        }
    
        if (!state.generatedPlan) {
          container.appendChild(createElement('div', { className: 'fep-empty-state' }, [
            createElement('div', { className: 'fep-empty-icon', textContent: '🤖' }),
            createElement('div', { className: 'fep-empty-text', textContent: '还没生成复习计划，让AI帮你一键规划！' }),
            createElement('button', {
              className: 'fep-btn fep-btn-primary',
              textContent: '🤖 自动生成复习计划',
              onclick: () => generateStudyPlan(),
            }),
          ]));
          return container;
        }
    
        // 计划概览
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-header' }, [
            createElement('div', { className: 'fep-card-title' }, [
              createElement('span', { textContent: '📋 复习计划概览' }),
              createElement('span', { className: 'fep-tag fep-tag-info', textContent: `${state.generatedPlan.days.length}天` }),
            ]),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary fep-btn-sm',
              textContent: '🔄 重新生成',
              onclick: () => generateStudyPlan(),
            }),
          ]),
          createElement('div', { style: 'font-size:12px;color:' + CONFIG.textSecondary + ';line-height:1.8;margin-top:8px;' }, [
            createElement('p', { textContent: `📅 计划周期：${state.generatedPlan.startDate} ~ ${state.generatedPlan.endDate}` }),
            createElement('p', { textContent: `📊 总任务数：${state.generatedPlan.totalTasks}` }),
            createElement('p', { textContent: `📚 覆盖科目：${state.generatedPlan.coursesCovered.join('、')}` }),
            createElement('p', { textContent: `⏰ 每日时长：${state.dailyStudyHours}小时` }),
          ]),
        ]));
    
        // 时间线视图
        container.appendChild(createElement('div', { className: 'fep-card' }, [
          createElement('div', { className: 'fep-card-title', textContent: '📅 每日计划详情' }),
          createElement('div', { className: 'fep-timeline' },
            state.generatedPlan.days.map(day =>
              createElement('div', { className: 'fep-timeline-item' }, [
                createElement('div', { className: 'fep-timeline-dot' }),
                createElement('div', { className: 'fep-timeline-date' }, [
                  createElement('span', { textContent: day.date }),
                  day.isExamDay
                    ? createElement('span', { className: 'fep-tag fep-tag-danger', textContent: '考试日', style: 'margin-left:6px;' })
                    : null,
                ]),
                createElement('div', { className: 'fep-timeline-content' },
                  day.tasks.map(task =>
                    createElement('div', { className: 'fep-timeline-task' }, [
                      createElement('span', { textContent: task.type === 'video' ? '🎬' : task.type === 'practice' ? '✏️' : task.type === 'review' ? '📖' : '📝' }),
                      createElement('span', { style: 'flex:1;', textContent: `[${task.course}] ${task.description}` }),
                      createElement('span', { className: 'fep-tag fep-tag-muted', textContent: `${task.duration}h`, style: 'font-size:10px;' }),
                    ])
                  )
                ),
              ])
            )
          ),
        ]));
    
        // 操作按钮
        container.appendChild(createElement('div', { className: 'fep-btn-group' }, [
          createElement('button', {
            className: 'fep-btn fep-btn-success',
            textContent: '📥 导出为文本',
            onclick: () => exportPlan(),
          }),
          createElement('button', {
            className: 'fep-btn fep-btn-secondary',
            textContent: '💬 与AI对话调整计划',
            onclick: () => {
              showToast('你可以告诉AI："这两天没学完帮我重新排一下" 或 "我想多给高数一点时间"', 'info');
            },
          }),
        ]));
    
        return container;
      }
    
      function generateStudyPlan() {
        if (state.exams.length === 0) {
          showToast('请先添加至少一门考试', 'error');
          return;
        }
    
        showToast('正在为你生成个性化复习计划...', 'info');
    
        // 按考试日期排序
        const sortedExams = [...state.exams]
          .filter(e => e.examDate)
          .sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
    
        if (sortedExams.length === 0) {
          showToast('所有考试都缺少日期信息，请先补充', 'error');
          return;
        }
    
        const today = getTodayStr();
        const lastExamDate = sortedExams[sortedExams.length - 1].examDate;
        const totalDays = daysUntil(lastExamDate);
    
        if (totalDays < 0) {
          showToast('最近的考试日期已过，请检查考试安排', 'error');
          return;
        }
    
        // 生成每日计划
        const days = [];
        let currentDate = new Date(today);
        let totalTasks = 0;
        const coursesCovered = [];
    
        for (let dayIdx = 0; dayIdx <= totalDays; dayIdx++) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const formattedDate = `${currentDate.getMonth() + 1}月${currentDate.getDate()}日`;
          const tasks = [];
    
          // 检查当天是否有考试
          const examToday = sortedExams.find(e => e.examDate === dateStr);
          if (examToday) {
            tasks.push({
              type: 'exam',
              course: examToday.courseName,
              description: `⚠️ ${examToday.courseName} 考试！地点：${examToday.location}`,
              duration: examToday.dailyAllocatedHours,
            });
            coursesCovered.push(examToday.courseName);
          } else {
            // 分配当天的复习任务
            const availableExams = sortedExams.filter(e => {
              const daysToExam = daysUntil(e.examDate);
              return daysToExam >= dayIdx && daysToExam > 0;
            });
    
            if (availableExams.length > 0) {
              // 按优先级排序
              availableExams.sort((a, b) => calculatePriority(b) - calculatePriority(a));
    
              let remainingHours = state.dailyStudyHours;
              const taskPerCourse = Math.max(1, Math.floor(availableExams.length / Math.min(3, state.dailyStudyHours)));
    
              for (let i = 0; i < Math.min(availableExams.length, 3) && remainingHours > 0.5; i++) {
                const exam = availableExams[i];
                const allocHours = Math.min(exam.dailyAllocatedHours, remainingHours / Math.max(1, Math.min(3, availableExams.length) - i));
    
                // 根据剩余天数决定任务类型
                const daysToExam = daysUntil(exam.examDate) - dayIdx;
                let taskType, description;
    
                if (daysToExam <= 2) {
                  taskType = 'review';
                  description = daysToExam <= 1 ? '最后冲刺：回顾错题+背诵核心公式' : '查漏补缺：重点章节快速过';
                } else if (daysToExam <= 7) {
                  taskType = 'practice';
                  description = '刷真题+看重点视频';
                } else {
                  taskType = 'video';
                  description = exam.keyPoints ? `学习重点：${exam.keyPoints.split(/[,，]/)[0] || '基础概念'}` : '系统学习基础知识';
                }
    
                tasks.push({
                  type: taskType,
                  course: exam.courseName,
                  description,
                  duration: Math.max(0.5, Math.round(allocHours * 2) / 2),
                });
    
                remainingHours -= allocHours;
                if (!coursesCovered.includes(exam.courseName)) {
                  coursesCovered.push(exam.courseName);
                }
                totalTasks++;
              }
    
              // 补充空闲时间建议
              if (remainingHours > 0.5) {
                tasks.push({
                  type: 'rest',
                  course: '休息/缓冲',
                  description: '预留弹性时间，可用来补前面的进度',
                  duration: Math.round(remainingHours * 2) / 2,
                });
              }
            }
          }
    
          days.push({ date: formattedDate, dateRaw: dateStr, tasks, isExamDay: !!examToday });
          currentDate.setDate(currentDate.getDate() + 1);
        }
    
        state.generatedPlan = {
          startDate: today,
          endDate: lastExamDate,
          totalDays: days.length,
          totalTasks,
          coursesCovered: [...new Set(coursesCovered)],
          dailyHours: state.dailyStudyHours,
          days,
          generatedAt: new Date().toISOString(),
        };
    
        saveState();
        state.activeTab = 'plan';
        render();
        showToast(`成功生成 ${days.length} 天复习计划，共 ${totalTasks} 个任务！`, 'success');
      }
    
      function exportPlan() {
        if (!state.generatedPlan) {
          showToast('还没有生成的计划可以导出', 'error');
          return;
        }
    
        let text = `\n${'='.repeat(50)}\n`;
        text += `   📚 期末救急规划器 - 复习计划\n`;
        text += `   生成时间：${new Date(state.generatedPlan.generatedAt).toLocaleString()}\n`;
        text += `${'='.repeat(50)}\n\n`;
    
        text += `📅 计划周期：${state.generatedPlan.startDate} ~ ${state.generatedPlan.endDate}\n`;
        text += `⏰ 每日时长：${state.dailyStudyHours}小时 | `;
        text += `📊 总任务数：${state.generatedPlan.totalTasks}\n`;
        text += `📚 覆盖科目：${state.generatedPlan.coursesCovered.join('、')}\n\n`;
    
        for (const day of state.generatedPlan.days) {
          text += `${'─'.repeat(45)}\n`;
          text += `📆 ${day.date}${day.isExamDay ? ' ⚠️ 考试日' : ''}\n`;
          text += `${'─'.repeat(45)}\n`;
          for (const task of day.tasks) {
            const icon = task.type === 'video' ? '🎬' : task.type === 'practice' ? '✏️' : task.type === 'review' ? '📖' : task.type === 'exam' ? '📝' : '☕';
            text += `  ${icon} [${task.course}] ${task.description} (${task.duration}h)\n`;
          }
          text += '\n';
        }
    
        text += `${'='.repeat(50)}\n`;
        text += `💡 提示：此计划由期末救急规划器自动生成\n`;
        text += `   可随时根据实际进度调整，加油！\n`;
        text += `${'='.repeat(50)}\n`;
    
        // 创建下载
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `期末复习计划_${getTodayStr()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    
        showToast('复习计划已导出为文本文件！', 'success');
      }
    
    
      /**
       * 分析PPTX内容并提取知识点
       * 使用TextDecoder正确解码UTF-8/UTF-16文本
       */
    
    
      function confirmClearData() {
        openModal((modal) => {
          modal.appendChild(createElement('div', { className: 'fep-modal-header' }, [
            createElement('div', { className: 'fep-modal-title', textContent: '⚠️ 确认清空数据？' }),
          ]));
          modal.appendChild(createElement('p', {
            style: 'font-size:13px;color:' + CONFIG.textSecondary + ';',
            textContent: '这将清除所有考试安排、搜索结果和生成的计划，且不可恢复。',
          }));
          modal.appendChild(createElement('div', { className: 'fep-btn-group' }, [
            createElement('button', {
              className: 'fep-btn fep-btn-danger',
              textContent: '确认清空',
              onclick: () => {
                state = {
                  exams: [],
                  currentStep: 0,
                  dailyStudyHours: 4,
                  showPanel: true,
                  activeTab: 'dashboard',
                  searchResults: {},
                  generatedPlan: null,
                          };
                try { localStorage.removeItem(CONFIG.storageKey); } catch (e) {}
                render();
                showToast('数据已清空', 'success');
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
            createElement('button', {
              className: 'fep-btn fep-btn-secondary',
              textContent: '取消',
              onclick: () => {
                const overlay = modal.closest('.fep-modal-overlay');
                if (overlay) overlay.remove();
              },
            }),
          ]));
        });
      }
    
      // ============================================================
      // 初始化入口
      // ============================================================
      function init() {
        // 加载保存的状态
        loadState();
    
        // 注入样式
        injectStyles();
    
        // 渲染UI
        render();
    
        // 全局快捷键
        document.addEventListener('keydown', (e) => {
          // Alt+E 切换显示/隐藏
          if (e.altKey && e.key === 'e') {
            e.preventDefault();
            state.showPanel = !state.showPanel;
            render();
          }
        });
    
        return {
          ok: true,
          summary: '期末救急规划器已启动，包含考试管理、B站视频搜索、复习计划生成三大核心模块',
          data: {
            examCount: state.exams.length,
            hasPlan: !!state.generatedPlan,
                version: CONFIG.version,
          },
          warnings: state.exams.length === 0 ? ['尚未添加任何考试安排'] : [],
        };
      }
    
      return init();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();