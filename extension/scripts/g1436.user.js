(function () {
  'use strict';
  if (window.__Yuze_DISGUISE__) return;
  window.__Yuze_DISGUISE__ = true;

  /* ── 1. 构建伪装层（预渲染，切换时零延迟）── */
  const overlay = document.createElement('div');
  overlay.id = 'tbt-disguise';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:2147483647;display:none;
    background:#f3f3f3;overflow:hidden;
    font-family:'Segoe UI',Calibri,'Microsoft YaHei',sans-serif;font-size:13px;
  `;

  // 生成表格数据
  const depts = ['市场部','销售部','研发部','产品部','运营部','财务部','人事部','客服部'];
  const headers = ['部门','Q1营收','Q2营收','Q3营收','Q4营收','年度合计','同比增长','完成率'];
  let rows = '';
  for (let i = 0; i < depts.length; i++) {
    const q = [38000+Math.random()*30000, 42000+Math.random()*30000,
               45000+Math.random()*30000, 48000+Math.random()*30000];
    const total = q.reduce((a,b)=>a+b,0);
    const growth = (5 + Math.random()*25).toFixed(1);
    const rate = (80 + Math.random()*18).toFixed(1);
    const vals = [depts[i], ...q.map(v=>'¥'+v.toFixed(2)), '¥'+total.toFixed(2), growth+'%', rate+'%'];
    rows += `<tr><td style="width:36px;text-align:center;color:#888;background:#f3f3f3;border:1px solid #d0d0d0">${i+2}</td>`;
    vals.forEach((v,j) => {
      const bg = j===0 ? '#fff' : (j>=5 ? '#e8f5e9' : '#fff');
      rows += `<td style="border:1px solid #d0d0d0;padding:3px 8px;background:${bg}">${v}</td>`;
    });
    rows += '</tr>';
  }

  overlay.innerHTML = `
    <!-- 标题栏 -->
    <div style="height:36px;background:#217346;display:flex;align-items:center;padding:0 16px;color:#fff">
      <span style="font-weight:700">Excel</span>
      <span style="margin-left:20px;opacity:.85">2026年度部门财务报表.xlsx - Excel</span>
      <span style="margin-left:auto;opacity:.6;font-size:12px">已保存 · OneDrive</span>
    </div>
    <!-- 功能选项卡 -->
    <div style="height:30px;background:#f3f3f3;border-bottom:1px solid #d0d0d0;display:flex;align-items:center;padding:0 16px;gap:22px;font-size:12px;color:#444">
      <span style="border-bottom:2px solid #217346;padding-bottom:5px;font-weight:600;color:#217346">开始</span>
      <span>插入</span><span>页面布局</span><span>公式</span><span>数据</span><span>审阅</span><span>视图</span>
    </div>
    <!-- 公式栏 -->
    <div style="display:flex;align-items:center;padding:6px 16px;border-bottom:1px solid #d0d0d0;gap:8px">
      <div style="width:56px;border:1px solid #ccc;height:22px;text-align:center;line-height:22px;background:#fff;font-size:12px">B9</div>
      <span style="color:#888;font-size:12px">fx</span>
      <div style="flex:1;border:1px solid #ccc;height:22px;line-height:22px;background:#fff;padding:0 8px;color:#333">=SUM(B2:B8)</div>
    </div>
    <!-- 表格区 -->
    <div style="overflow:auto;height:calc(100% - 128px);background:#fff">
      <table style="border-collapse:collapse;font-size:12px;width:fit-content">
        <tr>
          <td style="width:36px;height:20px;background:#f3f3f3;border:1px solid #d0d0d0"></td>
          ${['A','B','C','D','E','F','G','H'].map(c=>
            `<td style="min-width:100px;text-align:center;color:#888;background:#f3f3f3;border:1px solid #d0d0d0;font-size:11px">${c}</td>`
          ).join('')}
        </tr>
        <tr>
          <td style="width:36px;text-align:center;color:#888;background:#f3f3f3;border:1px solid #d0d0d0">1</td>
          ${headers.map(h=>
            `<td style="border:1px solid #d0d0d0;padding:3px 8px;font-weight:600;background:#e8f5e9">${h}</td>`
          ).join('')}
        </tr>
        ${rows}
      </table>
    </div>
    <!-- 状态栏 -->
    <div style="position:absolute;bottom:0;left:0;right:0;height:26px;background:#217346;color:#fff;display:flex;align-items:center;padding:0 16px;font-size:11px;gap:24px">
      <span>就绪</span>
      <span style="margin-left:auto">平均值: ¥48,231.55</span>
      <span>计数: 8</span>
      <span>求和: ¥385,852.40</span>
    </div>
  `;
  document.body.appendChild(overlay);

  /* ── 2. 双击 Esc 切换 ── */
  let lastEsc = 0, hidden = false;
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    const now = Date.now();
    if (now - lastEsc < 400) {
      hidden = !hidden;
      overlay.style.display = hidden ? 'block' : 'none';
      lastEsc = 0; // 重置，避免连击误触
    } else {
      lastEsc = now;
    }
  });
})();