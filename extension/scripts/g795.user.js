(function() {
  const STORAGE_KEY = 'tabbit_calendar_reminders';
  const CONTAINER_ID = 'tabbit-calendar-widget';

  if (document.getElementById(CONTAINER_ID)) return;

  function getReminders() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  }

  function saveReminders(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function dateKey(y, m, d) {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  function renderCalendar(year, month) {
    const today = new Date();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const reminders = getReminders();
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const weekDays = ['日','一','二','三','四','五','六'];

    let html = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <button data-action="prev-month" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">◀</button>
        <span style="font-size:15px;font-weight:600;color:#fff;">${year}年 ${monthNames[month]}</span>
        <button data-action="next-month" style="background:rgba(255,255,255,0.1);border:none;color:#fff;width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;">▶</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;margin-bottom:4px;">
        ${weekDays.map(d => `<div style="color:rgba(255,255,255,0.5);font-size:11px;padding:4px 0;">${d}</div>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;">
    `;

    for (let i = 0; i < firstDay; i++) {
      html += `<div style="padding:6px 0;"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const key = dateKey(year, month, d);
      const hasReminder = reminders[key] && reminders[key].length > 0;
      const isToday = year === today.getFullYear() && month === today.getMonth() && d === today.getDate();

      const bg = isToday
        ? 'background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:700;'
        : hasReminder
          ? 'background:rgba(99,102,241,0.2);color:#c7d2fe;'
          : 'color:rgba(255,255,255,0.8);';
      const dot = hasReminder ? `<div style="width:4px;height:4px;border-radius:50%;background:#f59e0b;margin:2px auto 0;"></div>` : '';

      html += `<div data-action="select-date" data-date="${key}" style="padding:6px 0;border-radius:8px;cursor:pointer;font-size:13px;${bg}transition:background 0.15s;">${d}${dot}</div>`;
    }

    html += `</div>`;

    const allReminders = Object.entries(reminders).filter(([, v]) => v.length > 0).sort(([a], [b]) => a.localeCompare(b));
    if (allReminders.length > 0) {
      html += `
        <div style="margin-top:12px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:6px;">📋 所有提醒</div>
          ${allReminders.map(([date, items]) => `
            <div data-action="select-date" data-date="${date}" style="padding:4px 8px;margin-bottom:4px;border-radius:6px;background:rgba(255,255,255,0.05);cursor:pointer;">
              <div style="font-size:11px;color:rgba(255,255,255,0.4);">${date}</div>
              ${items.map(item => `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px;">• ${item}</div>`).join('')}
            </div>
          `).join('')}
        </div>
      `;
    }

    return html;
  }

  function renderDayDetail(dateStr) {
    const reminders = getReminders();
    const items = reminders[dateStr] || [];
    return `
      <div style="margin-bottom:12px;">
        <button data-action="back-to-calendar" style="background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:12px;padding:0;">← 返回日历</button>
      </div>
      <div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:12px;">${dateStr}</div>
      <div style="margin-bottom:12px;">
        ${items.length === 0
          ? '<div style="color:rgba(255,255,255,0.4);font-size:13px;text-align:center;padding:16px 0;">暂无提醒事项</div>'
          : items.map((item, i) => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,0.06);border-radius:8px;margin-bottom:6px;">
              <span style="flex:1;font-size:13px;color:rgba(255,255,255,0.9);word-break:break-all;">${item}</span>
              <button data-action="delete-reminder" data-date="${dateStr}" data-index="${i}" style="background:none;border:none;color:rgba(255,255,255,0.3);cursor:pointer;font-size:14px;padding:2px 4px;flex-shrink:0;" title="删除">✕</button>
            </div>
          `).join('')}
      </div>
      <div style="display:flex;gap:6px;">
        <input id="tabbit-reminder-input" type="text" placeholder="输入提醒事项…" style="flex:1;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 12px;color:#fff;font-size:13px;outline:none;" />
        <button data-action="add-reminder" data-date="${dateStr}" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;border-radius:8px;padding:8px 14px;cursor:pointer;font-size:13px;font-weight:500;white-space:nowrap;">添加</button>
      </div>
    `;
  }

  let currentYear, currentMonth, selectedDate = null;
  const now = new Date();
  currentYear = now.getFullYear();
  currentMonth = now.getMonth();

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  container.style.cssText = 'position:fixed;top:20px;right:20px;width:300px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  const shadow = container.attachShadow({ mode: 'closed' });
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    background:rgba(15,15,30,0.95);
    backdrop-filter:blur(20px);
    border-radius:16px;
    padding:16px;
    box-shadow:0 20px 60px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08);
    position:relative;
  `;

  const closeBtn = document.createElement('div');
  closeBtn.style.cssText = 'position:absolute;top:10px;right:12px;cursor:pointer;color:rgba(255,255,255,0.3);font-size:16px;line-height:1;';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => container.remove());

  const content = document.createElement('div');

  function update() {
    if (selectedDate) {
      content.innerHTML = renderDayDetail(selectedDate);
    } else {
      content.innerHTML = renderCalendar(currentYear, currentMonth);
    }
  }

  content.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]');
    if (!target) return;

    const action = target.dataset.action;

    if (action === 'prev-month') {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      update();
    } else if (action === 'next-month') {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      update();
    } else if (action === 'select-date') {
      selectedDate = target.dataset.date;
      update();
    } else if (action === 'back-to-calendar') {
      selectedDate = null;
      update();
    } else if (action === 'add-reminder') {
      const input = wrapper.querySelector('#tabbit-reminder-input');
      if (input && input.value.trim()) {
        const reminders = getReminders();
        const date = target.dataset.date;
        if (!reminders[date]) reminders[date] = [];
        reminders[date].push(input.value.trim());
        saveReminders(reminders);
        update();
      }
    } else if (action === 'delete-reminder') {
      const reminders = getReminders();
      const date = target.dataset.date;
      const index = parseInt(target.dataset.index);
      if (reminders[date]) {
        reminders[date].splice(index, 1);
        if (reminders[date].length === 0) delete reminders[date];
        saveReminders(reminders);
        update();
      }
    }
  });

  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const input = wrapper.querySelector('#tabbit-reminder-input');
      if (input && input.value.trim()) {
        const addBtn = wrapper.querySelector('[data-action="add-reminder"]');
        if (addBtn) addBtn.click();
      }
    }
  });

  wrapper.appendChild(closeBtn);
  wrapper.appendChild(content);
  shadow.appendChild(wrapper);
  document.body.appendChild(container);
  update();

  let isDragging = false, dragStartX, dragStartY, startPosX, startPosY;
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('[data-action]') || e.target.tagName === 'INPUT') return;
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    startPosX = container.offsetLeft;
    startPosY = container.offsetTop;
    e.preventDefault();
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    container.style.left = (startPosX + e.clientX - dragStartX) + 'px';
    container.style.top = (startPosY + e.clientY - dragStartY) + 'px';
    container.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => { isDragging = false; });
})();