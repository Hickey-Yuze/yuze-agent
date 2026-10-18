(function() {
  'use strict';
  
  if (window.recruitmentCalendarInitialized) return;
  window.recruitmentCalendarInitialized = true;

  console.log('📅 招聘日历 - 终极稳定翻页版（网易+QQ）');

  // ========== 核心配置（可修改） ==========
  const COLLECT_MONTHS = 6;       // 收集最近6个月
  const MIN_EMAILS = 300;        // 至少收集300封
  const MAX_PAGES = 100;         // 最多翻100页（防死循环）
  const PAGE_DELAY = 1000;       // 翻页后等待时间（毫秒），邮箱慢就调大

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - COLLECT_MONTHS);
  cutoffDate.setHours(0, 0, 0, 0);
  
  console.log(`📅 截止日期: ${cutoffDate.toLocaleDateString()}`);
  console.log(`📄 目标: 至少 ${MIN_EMAILS} 封 / ${MAX_PAGES} 页`);

  let allEmails = [];
  let isCollecting = false;
  let currentPage = 1;
  let isQQMail = false;
  let isNetEaseMail = false;

  // ========== 1. 自动检测邮箱类型（更精准） ==========
  function detectMailBox() {
    isNetEaseMail = !!document.querySelector('.rF0') || !!document.querySelector('.nui-mlist');
    isQQMail = !!document.querySelector('.item_mail') || !!document.querySelector('#qqmail') || !!document.querySelector('.mail_list');
    console.log("检测邮箱：", isNetEaseMail ? "网易" : isQQMail ? "QQ" : "未知");
  }

  // ========== 2. 日期解析（不变） ==========
  function parseDateText(dateText, fullDate) {
    const now = new Date();
    if (fullDate) {
      const d = new Date(fullDate);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateText.includes('昨天')) {
      const d = new Date(now); d.setDate(d.getDate()-1); return d;
    }
    if (dateText.includes('今天')||dateText.includes('刚刚')||dateText.includes('分钟前')||dateText.includes('小时前')) {
      return now;
    }
    const m = dateText.match(/(\d{1,2})月(\d{1,2})日/);
    if (m) {
      const d = new Date(now.getFullYear(), parseInt(m[1])-1, parseInt(m[2]));
      if (d > now) d.setFullYear(now.getFullYear()-1);
      return d;
    }
    const d = new Date(dateText);
    return isNaN(d.getTime()) ? now : d;
  }

  // ========== 3. 提取当前页邮件（双邮箱全匹配） ==========
  function extractPageEmails() {
    const emails = [];
    let items = [];

    // 网易邮箱匹配
    if (isNetEaseMail) {
      items = document.querySelectorAll('.rF0[role="link"], .nui-mlist-item');
    }
    // QQ邮箱匹配（覆盖新版/旧版）
    if (isQQMail) {
      items = document.querySelectorAll('.item_mail, .mail_item, .mail_list .item');
    }

    console.log(`📄 第 ${currentPage} 页，共 ${items.length} 封`);

    items.forEach(el => {
      let subject = '', sender = '', dateText = '', fullDate = '';

      // 网易提取
      if (isNetEaseMail) {
        subject = el.querySelector('.da0, .subject')?.textContent.trim() || '';
        sender = el.querySelector('.nui-user, .sender')?.textContent.trim() || '';
        dateText = el.querySelector('.eO0, .date')?.textContent.trim() || '';
        fullDate = el.querySelector('.eO0, .date')?.getAttribute('title') || dateText;
      }
      // QQ提取
      if (isQQMail) {
        subject = el.querySelector('.tt, .subject, .title')?.textContent.trim() || '';
        sender = el.querySelector('.sender, .from')?.textContent.trim() || '';
        dateText = el.querySelector('.date, .time')?.textContent.trim() || '';
        fullDate = dateText;
      }

      // 招聘关键词
      const keywords = [
        '招聘','校招','社招','内推','录用','签约',
        '笔试','面试','测评','行测','在线测评','性格测试',
        '邀请','通知','反馈','结果','安排','确认',
        'offer','Offer','OFFER','意向','意向书',
        '宣讲','宣讲会','体检','入职','简历','复面','二面','三面'
      ];
      const isRecruit = keywords.some(k => subject.includes(k) || sender.includes(k));
      if (!isRecruit) return;

      // 优先级
      let priority = '低';
      if (subject.includes('笔试邀请')||subject.includes('面试邀请函')||subject.toLowerCase().includes('offer')) priority='高';
      else if (subject.includes('面试')||subject.includes('反馈')) priority='中';

      // 类型
      let type = '信息';
      if (subject.includes('笔试')) type='笔试';
      else if (subject.includes('面试')) type='面试';
      else if (subject.includes('宣讲')) type='宣讲';
      else if (subject.includes('反馈')) type='反馈';
      else if (subject.toLowerCase().includes('offer')) type='Offer';

      const parsedDate = parseDateText(dateText, fullDate);
      emails.push({ subject, sender, dateText, parsedDate, priority, type, page: currentPage });
    });

    console.log(`✅ 第 ${currentPage} 页找到 ${emails.length} 封招聘邮件`);
    return emails;
  }

  // ========== 4. 查找下一页按钮（全兼容） ==========
  function findNextButton() {
    let btn = null;
    // 网易下一页选择器
    if (isNetEaseMail) {
      const neteaseSelectors = [
        'a[title="下一页"]', 'div[title="下一页"]',
        '.nui-paging-next', '.paging-next', '#nextBtn'
      ];
      for (const sel of neteaseSelectors) {
        btn = document.querySelector(sel);
        if (btn && !btn.classList.contains('nui-txt-disabled') && !btn.hasAttribute('disabled')) break;
      }
    }
    // QQ下一页选择器
    if (isQQMail) {
      const qqSelectors = [
        '#nextpage', 'a[title="下一页"]', '.next-page', '.pager_next'
      ];
      for (const sel of qqSelectors) {
        btn = document.querySelector(sel);
        if (btn) break;
      }
    }
    return btn;
  }

  // ========== 5. 点击下一页（强制等待+重试） ==========
  async function clickNextPage() {
    return new Promise((resolve) => {
      const btn = findNextButton();
      if (!btn) {
        console.log('❌ 未找到下一页按钮');
        return resolve(false);
      }

      console.log('🔄 点击下一页...');
      // 记录当前页第一封邮件标题，判断是否翻页成功
      const oldFirstTitle = document.querySelector('.rF0 .da0, .item_mail .tt')?.textContent.trim() || '';
      btn.click();

      // 最长等待5秒，每200ms检查一次
      let attempts = 0;
      const maxAttempts = 25;
      const check = setInterval(() => {
        attempts++;
        const newFirstEl = document.querySelector('.rF0 .da0, .item_mail .tt');
        const newFirstTitle = newFirstEl?.textContent.trim() || '';

        // 翻页成功：新内容加载
        if (newFirstTitle && newFirstTitle !== oldFirstTitle) {
          clearInterval(check);
          console.log('✅ 翻页成功，等待DOM稳定');
          setTimeout(() => resolve(true), PAGE_DELAY);
        }
        // 超时
        if (attempts >= maxAttempts) {
          clearInterval(check);
          console.warn('⚠️ 翻页超时，停止翻页');
          resolve(false);
        }
      }, 200);
    });
  }

  // ========== 6. 核心收集逻辑（强制翻页、不满足不停） ==========
  async function collectAllPages() {
    if (isCollecting) return;
    isCollecting = true;

    // 【关键】每次收集都重置：清空数据、回到第1页
    allEmails = [];
    currentPage = 1;
    detectMailBox();
    updateProgress(`🔍 开始收集（第 ${currentPage} 页）`, 'collecting', 0);

    let hasReachedTimeLimit = false;

    while (true) {
      // 1. 提取当前页
      const pageEmails = extractPageEmails();

      // 2. 判断是否超出时间范围
      if (!hasReachedTimeLimit) {
        for (const e of pageEmails) {
          if (e.parsedDate < cutoffDate) {
            hasReachedTimeLimit = true;
            console.log(`⏰ 已到 ${cutoffDate.toLocaleDateString()} 之前`);
            break;
          }
        }
      }

      // 3. 只保留时间范围内的邮件
      const validEmails = hasReachedTimeLimit ? [] : pageEmails;
      allEmails.push(...validEmails);

      // 4. 更新进度
      const progressPercent = Math.min((allEmails.length / MIN_EMAILS) * 100, 100);
      updateProgress(
        `已翻 ${currentPage} 页 | 有效 ${allEmails.length}/${MIN_EMAILS} 封`,
        'collecting',
        progressPercent
      );

      // 5. 停止条件（满足任一就停）
      const stop = (
        !findNextButton() ||          // 无下一页
        currentPage >= MAX_PAGES ||    // 达到最大页数
        allEmails.length >= MIN_EMAILS || // 达到最少邮件数
        hasReachedTimeLimit            // 超出时间范围
      );
      if (stop) break;

      // 6. 翻下一页
      currentPage++;
      const success = await clickNextPage();
      if (!success) break;
    }

    isCollecting = false;
    console.log(`🎉 收集完成：共 ${currentPage} 页，有效 ${allEmails.length} 封`);
    renderCalendar();
  }

  // ========== 7. UI界面（完全不变） ==========
  function createCalendarPanel() {
    const panel = document.createElement('div');
    panel.id = 'recruitment-calendar-panel';
    panel.innerHTML = `
      <div class="rc-header">
        <div class="rc-drag-handle">
          <span class="rc-title">📅 招聘日程</span>
          <span class="rc-count"></span>
        </div>
        <div class="rc-controls">
          <button class="rc-btn rc-refresh" title="刷新">🔄</button>
          <button class="rc-btn rc-minimize" title="最小化">−</button>
          <button class="rc-btn rc-close" title="关闭">×</button>
        </div>
      </div>
      <div class="rc-body">
        <div class="rc-progress" style="display: none;">
          <div class="rc-progress-bar">
            <div class="rc-progress-fill"></div>
          </div>
          <div class="rc-progress-text">正在收集邮件...</div>
        </div>
        <div class="rc-filter">
          <button class="rc-filter-btn active" data-filter="all">全部</button>
          <button class="rc-filter-btn" data-filter="高">高优先级</button>
          <button class="rc-filter-btn" data-filter="中">中优先级</button>
          <button class="rc-filter-btn" data-filter="低">低优先级</button>
        </div>
        <div class="rc-date-filter">
          <label>时间段筛选：</label>
          <input type="date" class="rc-date-start" />
          <span>至</span>
          <input type="date" class="rc-date-end" />
          <button class="rc-apply-date">应用</button>
          <button class="rc-reset-date">重置</button>
        </div>
        <div class="rc-timeline"></div>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      #recruitment-calendar-panel {
        position: fixed; top: 100px; right: 30px; width: 420px; max-height: 650px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 999999; font-family: sans-serif; overflow: hidden; transition: all 0.3s;
      }
      #recruitment-calendar-panel.minimized { height: 50px !important; }
      #recruitment-calendar-panel.minimized .rc-body { display: none; }
      .rc-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); cursor: move; }
      .rc-title { font-size: 16px; font-weight: 600; color: white; }
      .rc-count { font-size: 12px; color: rgba(255,255,255,0.8); background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 10px; }
      .rc-controls { display: flex; gap: 8px; }
      .rc-btn { background: rgba(255,255,255,0.2); border: none; width: 28px; height: 28px; border-radius: 6px; color: white; cursor: pointer; }
      .rc-body { background: white; max-height: 590px; overflow-y: auto; }
      .rc-progress { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e0e0e0; }
      .rc-progress-bar { width: 100%; height: 6px; background: #e0e0e0; border-radius: 3px; }
      .rc-progress-fill { height: 100%; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); width: 0%; transition: width 0.5s; }
      .rc-filter { display: flex; gap: 8px; padding: 12px; background: #f8f9fa; border-bottom: 1px solid #eee; }
      .rc-filter-btn { padding: 6px 12px; border: none; border-radius: 20px; background: white; cursor: pointer; }
      .rc-filter-btn.active { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
      .rc-date-filter { display: flex; align-items: center; gap: 8px; padding: 12px; background: #fff; border-bottom: 1px solid #eee; }
      .rc-timeline { padding: 16px; }
      .rc-date-group { margin-bottom: 24px; }
      .rc-date-header { font-size: 14px; font-weight: 600; color: #333; padding-bottom: 8px; border-bottom: 2px solid #667eea; }
      .rc-item { padding: 12px; border-radius: 8px; background: white; border-left: 4px solid #ccc; margin-bottom: 8px; cursor: pointer; }
      .rc-item.priority-高 { border-left-color: #f44336; background: #fff5f5; }
      .rc-item.priority-中 { border-left-color: #ff9800; background: #fff8f0; }
      .rc-item.priority-低 { border-left-color: #4caf50; background: #f5fff5; }
      .rc-empty { text-align: center; padding: 40px; color: #999; }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(panel);
    return panel;
  }

  function updateProgress(text, status = 'collecting', percent = 0) {
    const p = document.querySelector('.rc-progress');
    const t = document.querySelector('.rc-progress-text');
    const f = document.querySelector('.rc-progress-fill');
    if (p && t) {
      p.style.display = 'block';
      t.textContent = text;
      f.style.width = percent + '%';
      if (status === 'done') setTimeout(() => p.style.display = 'none', 1000);
    }
  }

  function renderCalendar(filter = 'all', startDate = null, endDate = null) {
    const timeline = document.querySelector('.rc-timeline');
    const count = document.querySelector('.rc-count');
    if (!timeline) return;

    let list = allEmails;
    if (filter !== 'all') list = list.filter(e => e.priority === filter);
    if (startDate) list = list.filter(e => e.parsedDate >= startDate);
    if (endDate) list = list.filter(e => e.parsedDate <= endDate);

    const groups = {};
    list.forEach(e => {
      const k = e.dateText;
      if (!groups[k]) groups[k] = [];
      groups[k].push(e);
    });

    count.textContent = `${list.length}封`;

    if (Object.keys(groups).length === 0) {
      timeline.innerHTML = `<div class="rc-empty"><div>📭</div><div>暂无符合条件的招聘邮件</div></div>`;
      updateProgress('', 'done');
      return;
    }

    let html = '';
    Object.keys(groups).forEach(d => {
      html += `<div class="rc-date-group"><div class="rc-date-header">📆 ${d}（${groups[d].length}封）</div>`;
      groups[d].forEach(e => {
        html += `
          <div class="rc-item priority-${e.priority}">
            <div><span class="rc-tag priority-${e.priority}">${e.priority}</span> <span class="rc-tag type">${e.type}</span></div>
            <div style="margin-top:4px;">${e.subject}</div>
            <div style="font-size:12px; color:#666; margin-top:4px;">${e.sender}</div>
          </div>`;
      });
      html += `</div>`;
    });
    timeline.innerHTML = html;
    updateProgress('', 'done');
  }

  function makeDraggable(panel) {
    const h = panel.querySelector('.rc-drag-handle');
    let d = false, ix=0, iy=0;
    h.onmousedown = e => { d=true; ix=e.clientX-panel.offsetLeft; iy=e.clientY-panel.offsetTop; };
    document.onmousemove = e => { if(!d)return; panel.style.left = e.clientX-ix+'px'; panel.style.top = e.clientY-iy+'px'; panel.style.right='auto'; };
    document.onmouseup = () => d=false;
  }

  function init() {
    const panel = createCalendarPanel();
    makeDraggable(panel);
    collectAllPages();

    panel.querySelector('.rc-close').onclick = () => { panel.remove(); window.recruitmentCalendarInitialized=false; };
    panel.querySelector('.rc-minimize').onclick = () => panel.classList.toggle('minimized');
    panel.querySelector('.rc-refresh').onclick = () => { allEmails=[]; currentPage=1; collectAllPages(); };
    
    panel.querySelectorAll('.rc-filter-btn').forEach(b => {
      b.onclick = () => {
        panel.querySelectorAll('.rc-filter-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        const s = panel.querySelector('.rc-date-start').value;
        const e = panel.querySelector('.rc-date-end').value;
        renderCalendar(b.dataset.filter, s?new Date(s):null, e?new Date(e+' 23:59:59'):null);
      };
    });
    
    panel.querySelector('.rc-apply-date').onclick = () => {
      const s = panel.querySelector('.rc-date-start').value;
      const e = panel.querySelector('.rc-date-end').value;
      const f = panel.querySelector('.rc-filter-btn.active').dataset.filter;
      renderCalendar(f, s?new Date(s):null, e?new Date(e+' 23:59:59'):null);
    };
    
    panel.querySelector('.rc-reset-date').onclick = () => {
      panel.querySelector('.rc-date-start').value='';
      panel.querySelector('.rc-date-end').value='';
      renderCalendar(panel.querySelector('.rc-filter-btn.active').dataset.filter);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();