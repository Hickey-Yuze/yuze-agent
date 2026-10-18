(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
        'use strict';
    
        // ========== 规则配置 ==========
        const RULES = {
            totalMinCredits: 18,
            creditToHour: 18,
            modules: {
                '博约经典': { minCredits: 4, minHours: 72 },
                '博约核心': {
                    minCredits: 12,
                    minHours: 216,
                    subModules: {
                        '公共艺术': { minCredits: 2 },
                        '创新创业': { minCredits: 2 },
                        '健康人生': { minCredits: 2 }
                    }
                },
                '博约百花': { minCredits: 2, minHours: 36 }
            }
        };
    
        // ========== 样式定义 ==========
        const STYLES = `
            .henu-panel {
                position: fixed;
                top: 20px;
                right: 20px;
                width: 420px;
                max-height: 80vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                z-index: 99999;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                overflow: hidden;
            }
    
            .henu-header {
                padding: 20px;
                color: white;
                text-align: center;
            }
    
            .henu-title {
                margin: 0;
                font-size: 18px;
                font-weight: 600;
            }
    
            .henu-subtitle {
                margin: 8px 0 0;
                font-size: 13px;
                opacity: 0.9;
            }
    
            .henu-body {
                background: white;
                max-height: 60vh;
                overflow-y: auto;
                padding: 0;
            }
    
            .henu-section {
                border-bottom: 1px solid #f0f0f0;
                padding: 16px 20px;
            }
    
            .henu-section:last-child {
                border-bottom: none;
            }
    
            .henu-section-title {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 12px;
                font-size: 15px;
                font-weight: 600;
                color: #333;
            }
    
            .henu-badge {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 500;
            }
    
            .henu-badge-success {
                background: #d4edda;
                color: #155724;
            }
    
            .henu-badge-warning {
                background: #fff3cd;
                color: #856404;
            }
    
            .henu-badge-danger {
                background: #f8d7da;
                color: #721c24;
            }
    
            .henu-progress-bar {
                height: 8px;
                background: #e9ecef;
                border-radius: 4px;
                overflow: hidden;
                margin-top: 8px;
            }
    
            .henu-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
                border-radius: 4px;
                transition: width 0.3s ease;
            }
    
            .henu-check-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 6px 0;
                font-size: 13px;
                color: #555;
            }
    
            .henu-check-status {
                width: 18px;
                height: 18px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 8px;
                font-size: 11px;
                flex-shrink: 0;
            }
    
            .henu-check-pass {
                background: #d4edda;
                color: #28a745;
            }
    
            .henu-check-fail {
                background: #f8d7da;
                color: #dc3545;
            }
    
            .henu-course-list {
                margin-top: 8px;
            }
    
            .henu-course-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                margin: 4px 0;
                background: #f8f9fa;
                border-radius: 8px;
                font-size: 13px;
                transition: all 0.2s;
            }
    
            .henu-course-item:hover {
                background: #e9ecef;
                transform: translateX(4px);
            }
    
            .henu-course-name {
                font-weight: 500;
                color: #333;
                flex: 1;
                margin-right: 8px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
    
            .henu-course-credits {
                color: #667eea;
                font-weight: 600;
                margin-left: 8px;
            }
    
            .henu-footer {
                padding: 16px 20px;
                background: #f8f9fa;
                text-align: center;
            }
    
            .henu-total-display {
                font-size: 28px;
                font-weight: 700;
                color: #333;
                margin: 4px 0;
            }
    
            .henu-total-label {
                font-size: 13px;
                color: #666;
            }
    
            .henu-close-btn {
                position: absolute;
                top: 12px;
                right: 12px;
                width: 28px;
                height: 28px;
                border: none;
                background: rgba(255,255,255,0.2);
                color: white;
                border-radius: 50%;
                cursor: pointer;
                font-size: 16px;
                line-height: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
    
            .henu-close-btn:hover {
                background: rgba(255,255,255,0.3);
                transform: rotate(90deg);
            }
    
            .henu-empty-state {
                text-align: center;
                padding: 40px 20px;
                color: #999;
            }
    
            .henu-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }
    
            @keyframes henuSlideIn {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
    
            .henu-panel {
                animation: henuSlideIn 0.3s ease-out;
            }
        `;
    
        // ========== 课程分类解析 ==========
        function parseCategory(categoryStr) {
            if (!categoryStr) return { module: null, subModule: null };
            const str = categoryStr.trim();
    
            if (str === '博约经典') {
                return { module: '博约经典', subModule: null };
            }
            if (str.startsWith('博约核心')) {
                const match = str.match(/博约核心[（(](.+?)[）)]/);
                const sub = match ? match[1].trim() : null;
                return { module: '博约核心', subModule: sub };
            }
            if (str.startsWith('博约百花')) {
                const match = str.match(/博约百花[（(](.+?)[）)]/);
                const sub = match ? match[1].trim() : null;
                return { module: '博约百花', subModule: sub };
            }
            return { module: null, subModule: null };
        }
    
        // ========== 抓取课程数据 ==========
        function scrapeCourses() {
            const courses = [];
            let targetDoc = null;
    
            // 递归搜索iframe中的表格
            function searchDoc(doc) {
                try {
                    const tables = doc.querySelectorAll('table.datagrid-btable');
                    for (const table of tables) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 10) {
                                const cat = cells[8] ? cells[8].textContent.trim() : '';
                                if (cat === '博约通识') return doc;
                            }
                        }
                    }
                    
                    // 搜索嵌套iframe
                    const iframes = doc.querySelectorAll('iframe');
                    for (const iframe of iframes) {
                        try {
                            const innerDoc = iframe.contentDocument || iframe.contentWindow.document;
                            const result = searchDoc(innerDoc);
                            if (result) return result;
                        } catch(e) {}
                    }
                } catch(e) {
                    console.error('搜索文档出错:', e);
                }
                return null;
            }
    
            targetDoc = searchDoc(document);
    
            if (!targetDoc) {
                // 回退：搜索所有table
                try {
                    const allTables = document.querySelectorAll('table');
                    for (const table of allTables) {
                        const rows = table.querySelectorAll('tr');
                        for (const row of rows) {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= 10) {
                                const cat = cells[8] ? cells[8].textContent.trim() : '';
                                if (cat === '博约通识') { 
                                    targetDoc = document; 
                                    break; 
                                }
                            }
                        }
                        if (targetDoc) break;
                    }
                } catch(e) {
                    console.error('回退搜索出错:', e);
                }
            }
    
            if (!targetDoc) return courses;
    
            // 提取所有博约通识课程
            try {
                const tables = targetDoc.querySelectorAll('table.datagrid-btable');
                for (const table of tables) {
                    const rows = table.querySelectorAll('tr');
                    for (const row of rows) {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 10) {
                            const courseName = cells[2] ? cells[2].textContent.trim() : '';
                            const department = cells[3] ? cells[3].textContent.trim() : '';
                            const creditsStr = cells[7] ? cells[7].textContent.trim() : '';
                            const category = cells[8] ? cells[8].textContent.trim() : '';
                            const classification = cells[9] ? cells[9].textContent.trim() : '';
    
                            if (category === '博约通识' && courseName) {
                                const credits = parseInt(creditsStr) || 0;
                                const parsed = parseCategory(classification);
    
                                courses.push({
                                    name: courseName,
                                    department: department,
                                    credits: credits,
                                    hours: credits * 18,
                                    category: classification,
                                    module: parsed.module,
                                    subModule: parsed.subModule,
                                    score: cells[4] ? cells[4].textContent.trim() : '',
                                    gpa: cells[5] ? cells[5].textContent.trim() : ''
                                });
                            }
                        }
                    }
                }
            } catch(e) {
                console.error('提取课程数据出错:', e);
            }
    
            return courses;
        }
    
        // ========== 分析学分 ==========
        function analyzeCredits(courses) {
            const result = {
                courses: courses,
                经典: { credits: 0, hours: 0, courses: [] },
                核心: {
                    credits: 0, hours: 0, courses: [],
                    subModules: {
                        '公共艺术': { credits: 0, courses: [] },
                        '创新创业': { credits: 0, courses: [] },
                        '健康人生': { credits: 0, courses: [] },
                        '其他方向': { credits: 0, courses: [] }
                    }
                },
                百花: { credits: 0, hours: 0, courses: [], departments: new Set() },
                totalCredits: 0,
                totalHours: 0
            };
    
            for (const course of courses) {
                result.totalCredits += course.credits;
                result.totalHours += course.hours;
    
                if (course.module === '博约经典') {
                    result.经典.credits += course.credits;
                    result.经典.hours += course.hours;
                    result.经典.courses.push(course);
                } else if (course.module === '博约核心') {
                    result.核心.credits += course.credits;
                    result.核心.hours += course.hours;
                    result.核心.courses.push(course);
    
                    const sub = course.subModule;
                    if (sub && result.核心.subModules[sub]) {
                        result.核心.subModules[sub].credits += course.credits;
                        result.核心.subModules[sub].courses.push(course);
                    } else {
                        result.核心.subModules['其他方向'].credits += course.credits;
                        result.核心.subModules['其他方向'].courses.push(course);
                    }
                } else if (course.module === '博约百花') {
                    result.百花.credits += course.credits;
                    result.百花.hours += course.hours;
                    result.百花.courses.push(course);
                    result.百花.departments.add(course.department);
                }
            }
    
            result.checks = [
                { name: '博约经典 ≥4 学分', pass: result.经典.credits >= 4, current: result.经典.credits, required: 4 },
                { name: '博约核心 ≥12 学分', pass: result.核心.credits >= 12, current: result.核心.credits, required: 12 },
                { name: '├ 公共艺术 ≥2 学分', pass: result.核心.subModules['公共艺术'].credits >= 2, current: result.核心.subModules['公共艺术'].credits, required: 2 },
                { name: '├ 创新创业 ≥2 学分', pass: result.核心.subModules['创新创业'].credits >= 2, current: result.核心.subModules['创新创业'].credits, required: 2 },
                { name: '├ 健康人生 ≥2 学分', pass: result.核心.subModules['健康人生'].credits >= 2, current: result.核心.subModules['健康人生'].credits, required: 2 },
                { name: '博约百花 ≥2 学分', pass: result.百花.credits >= 2, current: result.百花.credits, required: 2 },
                { name: '博约百花跨学科', pass: result.百花.departments.size >= 2, current: result.百花.departments.size, required: 2 },
                { name: '总学分 ≥18 学分', pass: result.totalCredits >= 18, current: result.totalCredits, required: 18 }
            ];
            
            result.allPass = result.checks.every(c => c.pass);
            return result;
        }
    
        // ========== 渲染面板 ==========
        function renderPanel(courses, result) {
            // 移除已存在的面板
            const existingPanel = document.getElementById('henu-course-panel');
            if (existingPanel) {
                existingPanel.remove();
            }
    
            // 移除已存在的样式
            const existingStyle = document.getElementById('henu-panel-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
    
            // 注入样式
            const styleEl = document.createElement('style');
            styleEl.id = 'henu-panel-styles';
            styleEl.textContent = STYLES;
            document.head.appendChild(styleEl);
    
            // 创建面板容器
            const panel = document.createElement('div');
            panel.id = 'henu-course-panel';
            panel.className = 'henu-panel';
    
            // 头部
            const header = document.createElement('div');
            header.className = 'henu-header';
            header.innerHTML = `
                <button class="henu-close-btn" onclick="document.getElementById('henu-course-panel').remove()">×</button>
                <h1 class="henu-title">🎓 河南师范大学 · 选课助手</h1>
                <p class="henu-subtitle">博约通识课学分分析 · 智能推荐</p>
            `;
    
            // 内容区域
            const body = document.createElement('div');
            body.className = 'henu-body';
    
            if (courses.length === 0) {
                body.innerHTML = `
                    <div class="henu-empty-state">
                        <div class="henu-empty-icon">📚</div>
                        <p>未检测到博约通识课程数据</p>
                        <p style="font-size: 12px; margin-top: 8px;">请先进入选课系统页面</p>
                    </div>
                `;
            } else {
                // 总览区域
                const overviewSection = document.createElement('div');
                overviewSection.className = 'henu-section';
                
                const totalPercent = Math.min((result.totalCredits / RULES.totalMinCredits) * 100, 100);
                overviewSection.innerHTML = `
                    <div class="henu-section-title">
                        <span>📊 总体进度</span>
                        <span class="henu-badge ${result.allPass ? 'henu-badge-success' : 'henu-badge-warning'}">
                            ${result.allPass ? '✓ 已达标' : '○ 未达标'}
                        </span>
                    </div>
                    <div class="henu-total-display">${result.totalCredits} <small style="font-size: 14px; color: #666;">/ ${RULES.totalMinCredits} 学分</small></div>
                    <div class="henu-total-label">已完成 ${totalPercent.toFixed(1)}%</div>
                    <div class="henu-progress-bar">
                        <div class="henu-progress-fill" style="width: ${totalPercent}%"></div>
                    </div>
                `;
                body.appendChild(overviewSection);
    
                // 博约经典
                const jingdianSection = document.createElement('div');
                jingdianSection.className = 'henu-section';
                const jingdianPercent = Math.min((result.经典.credits / RULES.modules['博约经典'].minCredits) * 100, 100);
                jingdianSection.innerHTML = `
                    <div class="henu-section-title">
                        <span>📖 博约经典</span>
                        <span class="henu-badge ${result.经典.credits >= 4 ? 'henu-badge-success' : 'henu-badge-danger'}">
                            ${result.经典.credits} / 4 学分
                        </span>
                    </div>
                    <div class="henu-progress-bar">
                        <div class="henu-progress-fill" style="width: ${jingdianPercent}%"></div>
                    </div>
                    ${renderCourseList(result.经典.courses)}
                `;
                body.appendChild(jingdianSection);
    
                // 博约核心
                const hexinSection = document.createElement('div');
                hexinSection.className = 'henu-section';
                const hexinPercent = Math.min((result.核心.credits / RULES.modules['博约核心'].minCredits) * 100, 100);
                hexinSection.innerHTML = `
                    <div class="henu-section-title">
                        <span>🎯 博约核心</span>
                        <span class="henu-badge ${result.核心.credits >= 12 ? 'henu-badge-success' : 'henu-badge-danger'}">
                            ${result.核心.credits} / 12 学分
                        </span>
                    </div>
                    <div class="henu-progress-bar">
                        <div class="henu-progress-fill" style="width: ${hexinPercent}%"></div>
                    </div>
                `;
                
                // 子模块检查项
                const subModuleChecks = ['公共艺术', '创新创业', '健康人生'];
                subModuleChecks.forEach(sub => {
                    const checkDiv = document.createElement('div');
                    checkDiv.className = 'henu-check-item';
                    const subData = result.核心.subModules[sub];
                    const isPass = subData.credits >= 2;
                    checkDiv.innerHTML = `
                        <span style="display: flex; align-items: center;">
                            <span class="henu-check-status ${isPass ? 'henu-check-pass' : 'henu-check-fail'}">${isPass ? '✓' : '✗'}</span>
                            ${sub}
                        </span>
                        <span>${subData.credits} / 2 学分</span>
                    `;
                    hexinSection.appendChild(checkDiv);
                });
                
                hexinSection.innerHTML += renderCourseList(result.核心.courses);
                body.appendChild(hexinSection);
    
                // 博约百花
                const baihuaSection = document.createElement('div');
                baihuaSection.className = 'henu-section';
                const baihuaPercent = Math.min((result.百花.credits / RULES.modules['博约百花'].minCredits) * 100, 100);
                const isCrossDept = result.百花.departments.size >= 2;
                baihuaSection.innerHTML = `
                    <div class="henu-section-title">
                        <span>🌸 博约百花</span>
                        <span class="henu-badge ${result.百花.credits >= 2 ? 'henu-badge-success' : 'henu-badge-danger'}">
                            ${result.百花.credits} / 2 学分
                        </span>
                    </div>
                    <div class="henu-progress-bar">
                        <div class="henu-progress-fill" style="width: ${baihuaPercent}%"></div>
                    </div>
                    <div class="henu-check-item">
                        <span style="display: flex; align-items: center;">
                            <span class="henu-check-status ${isCrossDept ? 'henu-check-pass' : 'henu-check-fail'}">${isCrossDept ? '✓' : '✗'}</span>
                            跨学科要求
                        </span>
                        <span>已选 ${result.百花.departments.size} 个学院课程</span>
                    </div>
                    ${renderCourseList(result.百花.courses)}
                `;
                body.appendChild(baihuaSection);
    
                // 详细检查列表
                const detailSection = document.createElement('div');
                detailSection.className = 'henu-section';
                let checksHTML = '<div class="henu-section-title"><span>✅ 达标检查清单</span></div>';
                result.checks.forEach(check => {
                    checksHTML += `
                        <div class="henu-check-item">
                            <span style="display: flex; align-items: center;">
                                <span class="henu-check-status ${check.pass ? 'henu-check-pass' : 'henu-check-fail'}">${check.pass ? '✓' : '✗'}</span>
                                ${check.name}
                            </span>
                            <span style="color: ${check.pass ? '#28a745' : '#dc3545'}; font-weight: 500;">
                                ${check.current} / ${check.required}
                            </span>
                        </div>
                    `;
                });
                detailSection.innerHTML = checksHTML;
                body.appendChild(detailSection);
            }
    
            // 底部统计
            const footer = document.createElement('div');
            footer.className = 'henu-footer';
            footer.innerHTML = `
                <div class="henu-total-label">共检测到 ${courses.length} 门博约通识课程</div>
            `;
    
            // 组装面板
            panel.appendChild(header);
            panel.appendChild(body);
            panel.appendChild(footer);
    
            // 添加到页面
            document.body.appendChild(panel);
    
            return panel;
        }
    
        // ========== 渲染课程列表 ==========
        function renderCourseList(courses) {
            if (!courses || courses.length === 0) {
                return '<p style="color: #999; font-size: 12px; padding: 8px 0;">暂无课程记录</p>';
            }
    
            let html = '<div class="henu-course-list">';
            courses.forEach(course => {
                html += `
                    <div class="henu-course-item">
                        <span class="henu-course-name" title="${course.name} (${course.department})">
                            📚 ${course.name}
                        </span>
                        <span class="henu-course-credits">${course.credits}学分</span>
                    </div>
                `;
            });
            html += '</div>';
            return html;
        }
    
        // ========== 主执行逻辑 ==========
        try {
            // 抓取课程数据
            const courses = scrapeCourses();
            
            // 分析学分
            const result = analyzeCredits(courses);
            
            // 渲染面板
            renderPanel(courses, result);
    
            return {
                ok: true,
                summary: `成功加载河南师范大学选课助手，检测到 ${courses.length} 门博约通识课程，总学分 ${result.totalCredits}/${RULES.totalMinCredits}`,
                data: {
                    courseCount: courses.length,
                    totalCredits: result.totalCredits,
                    requiredCredits: RULES.totalMinCredits,
                    allPassed: result.allPass,
                    modules: {
                        jingdian: { credits: result.经典.credits, required: 4 },
                        hexin: { credits: result.核心.credits, required: 12 },
                        baihua: { credits: result.百花.credits, required: 2 }
                    },
                    checks: result.checks
                },
                warnings: courses.length === 0 ? ['未检测到课程数据，请确认当前页面是否为选课系统'] : []
            };
    
        } catch(error) {
            console.error('河南师范大学选课助手执行错误:', error);
            return {
                ok: false,
                summary: '脚本执行出错: ' + error.message,
                error: error.toString(),
                data: {},
                warnings: ['执行过程中发生错误，请检查页面是否正确']
            };
        }
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();