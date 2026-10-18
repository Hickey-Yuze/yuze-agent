(function () {
    if (document.getElementById('xhs-excel-disguise')) return;
  
    // ── 1. 隐藏小红书原有 UI ──────────────────────────────
    const hideStyle = document.createElement('style');
    hideStyle.id = 'xhs-excel-disguise';
    hideStyle.textContent = `
      header.mask-paper,
      .side-bar,
      .bottom-menu,
      .floating-btn-sets,
      .channel-container,
      .reds-alert,
      .ad-wrap,
      .dropdown-container,
      .app-info,
      .corp-info,
      .divider,
      #explore-guide-menu,
      .feeds-loading {
        display: none !important;
      }
  
      body, html {
        background: #f0f0f0 !important;
        font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif !important;
        margin: 0 !important;
        padding: 0 !important;
      }
  
      #app, .layout, .main-container, .with-side-bar, .main-content, #mfContainer, .feeds-page {
        all: unset !important;
        display: block !important;
        width: 100% !important;
        height: 100vh !important;
        overflow: hidden !important;
        background: #f0f0f0 !important;
      }
  
      .feeds-container, #exploreFeeds {
        all: unset !important;
        display: block !important;
      }
  
      section.note-item {
        display: none !important;
      }
    `;
    document.head.appendChild(hideStyle);
  
    // ── 2. 收集笔记数据（含封面图用于缩略图列）────────────────
    const notes = Array.from(document.querySelectorAll('section.note-item')).map((item, i) => {
      const title = item.querySelector('.title span')?.textContent?.trim() || '';
      const author = item.querySelector('.name')?.textContent?.trim() || '';
      const likes = item.querySelector('.count')?.textContent?.trim() || '0';
      const link = item.querySelector('a.cover')?.href || '#';
      const isVideo = !!item.querySelector('.play-icon');
      const src = item.querySelector('a.cover img')?.src || '';
      return { id: i + 1, title, author, likes, link, isVideo, src };
    });
  
    // ── 3. 构建 Excel UI ──────────────────────────────────
    const app = document.createElement('div');
    app.id = 'fake-excel-root';
    app.innerHTML = `
      <style>
        #fake-excel-root {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          background: #f0f0f0;
          font-family: "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
          font-size: 13px;
          color: #000;
        }
  
        /* 标题栏 */
        #fe-titlebar {
          background: #185abd;
          color: #fff;
          height: 32px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          gap: 16px;
          font-size: 12px;
          flex-shrink: 0;
        }
        #fe-titlebar .fe-filename {
          font-weight: 600;
          font-size: 13px;
          margin-left: 8px;
        }
        #fe-titlebar .fe-win-btns {
          margin-left: auto;
          display: flex;
          gap: 2px;
        }
        #fe-titlebar .fe-win-btns span {
          width: 46px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 11px;
        }
        #fe-titlebar .fe-win-btns span:hover { background: rgba(255,255,255,0.2); }
        #fe-titlebar .fe-win-btns .close:hover { background: #e81123; }
  
        /* Ribbon 菜单栏 */
        #fe-ribbon {
          background: #fff;
          border-bottom: 1px solid #d1d1d1;
          flex-shrink: 0;
        }
        #fe-ribbon-tabs {
          display: flex;
          padding: 0 8px;
          border-bottom: 1px solid #e0e0e0;
        }
        #fe-ribbon-tabs .tab {
          padding: 6px 14px;
          font-size: 12px;
          cursor: pointer;
          color: #444;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
        }
        #fe-ribbon-tabs .tab.active {
          color: #185abd;
          border-bottom: 2px solid #185abd;
          font-weight: 600;
        }
        #fe-ribbon-tabs .tab:hover { background: #f5f5f5; }
        #fe-ribbon-toolbar {
          display: flex;
          align-items: center;
          padding: 4px 12px;
          gap: 2px;
          flex-wrap: wrap;
        }
        .fe-tb-btn {
          padding: 4px 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          border-radius: 3px;
          font-size: 12px;
          color: #333;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 36px;
        }
        .fe-tb-btn:hover { background: #e8e8e8; }
        .fe-tb-btn .icon { font-size: 16px; line-height: 1; }
        .fe-tb-btn .label { font-size: 10px; color: #555; }
        .fe-tb-sep {
          width: 1px;
          height: 36px;
          background: #d1d1d1;
          margin: 0 4px;
        }
  
        /* 公式栏 */
        #fe-formulabar {
          display: flex;
          align-items: center;
          background: #fff;
          border-bottom: 1px solid #d1d1d1;
          height: 26px;
          padding: 0 8px;
          gap: 8px;
          flex-shrink: 0;
        }
        #fe-cellref {
          width: 60px;
          border: 1px solid #bbb;
          padding: 2px 4px;
          font-size: 12px;
          text-align: center;
          border-radius: 2px;
          outline: none;
          background: #fff;
        }
        #fe-formulabar .fx { color: #185abd; font-style: italic; font-weight: bold; font-size: 13px; }
        #fe-formulainput {
          flex: 1;
          border: 1px solid transparent;
          padding: 2px 4px;
          font-size: 12px;
          outline: none;
          background: transparent;
          color: #333;
        }
        #fe-formulainput:focus { border-color: #185abd; background: #fff; }
  
        /* 主体：行号 + 表格 */
        #fe-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }
  
        /* 行号列 */
        #fe-rownums {
          width: 40px;
          flex-shrink: 0;
          background: #f2f2f2;
          border-right: 1px solid #d1d1d1;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        #fe-rownums .rn-corner {
          height: 22px;
          border-bottom: 1px solid #d1d1d1;
          flex-shrink: 0;
          background: #f2f2f2;
        }
        #fe-rownums .rn-list {
          overflow: hidden;
          flex: 1;
        }
        .fe-rownum {
          height: 22px;
          line-height: 22px;
          text-align: center;
          font-size: 11px;
          color: #666;
          border-bottom: 1px solid #e8e8e8;
          cursor: pointer;
          background: #f2f2f2;
        }
        .fe-rownum:hover, .fe-rownum.active { background: #d0e4f5; color: #185abd; }
  
        /* 表格区域 */
        #fe-sheet-wrap {
          flex: 1;
          overflow: auto;
          background: #fff;
        }
  
        #fe-sheet {
          border-collapse: collapse;
          min-width: 100%;
          table-layout: fixed;
        }
  
        /* 列头 */
        #fe-sheet thead th {
          background: #f2f2f2;
          border: 1px solid #d1d1d1;
          height: 22px;
          text-align: center;
          font-size: 11px;
          font-weight: normal;
          color: #666;
          position: sticky;
          top: 0;
          z-index: 2;
          cursor: pointer;
          padding: 0 4px;
          white-space: nowrap;
        }
        #fe-sheet thead th:hover { background: #d0e4f5; }
        #fe-sheet thead th.active { background: #107c41; color: #fff; }
  
        /* 数据单元格 */
        #fe-sheet td {
          border: 1px solid #e0e0e0;
          height: 22px;
          padding: 0 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          cursor: cell;
          max-width: 0;
        }
        #fe-sheet td:focus,
        #fe-sheet td.selected {
          outline: 2px solid #185abd;
          outline-offset: -2px;
          background: #e8f0fe !important;
          z-index: 1;
          position: relative;
        }
        #fe-sheet tr:hover td { background: #f5f9ff; }
        #fe-sheet tr.row-selected td { background: #e3f0ff; }
  
        /* 列宽 */
        .col-id    { width: 45px; }
        .col-title { width: 340px; }
        .col-author{ width: 140px; }
        .col-likes { width: 90px; }
        .col-type  { width: 80px; }
        .col-date  { width: 120px; }
        .col-status{ width: 100px; }
        .col-dept  { width: 130px; }
        .col-empty { width: 200px; }
  
        /* 数字单元格右对齐 */
        .num-cell { text-align: right; color: #333; }
  
        /* 状态栏 */
        #fe-statusbar {
          background: #185abd;
          color: #fff;
          height: 22px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          font-size: 11px;
          gap: 20px;
          flex-shrink: 0;
        }
        #fe-statusbar .right { margin-left: auto; display: flex; gap: 16px; align-items: center; }
        #fe-zoom-slider { width: 80px; accent-color: #fff; }
  
        /* Sheet 标签 */
        #fe-sheettabs {
          background: #f0f0f0;
          border-top: 1px solid #d1d1d1;
          height: 24px;
          display: flex;
          align-items: flex-end;
          padding: 0 8px;
          gap: 2px;
          flex-shrink: 0;
        }
        .fe-sheet-tab {
          padding: 3px 14px;
          background: #d0d0d0;
          border: 1px solid #bbb;
          border-bottom: none;
          font-size: 11px;
          cursor: pointer;
          border-radius: 3px 3px 0 0;
          color: #444;
        }
        .fe-sheet-tab.active {
          background: #fff;
          color: #185abd;
          font-weight: 600;
          border-color: #d1d1d1;
        }
        .fe-sheet-tab:hover:not(.active) { background: #e0e0e0; }
      </style>
  
      <!-- 标题栏 -->
      <div id="fe-titlebar">
        <span>📊</span>
        <span class="fe-filename">Q1季度内容运营数据汇总表.xlsx - Excel</span>
        <div class="fe-win-btns">
          <span>─</span><span>□</span><span class="close">✕</span>
        </div>
      </div>
  
      <!-- Ribbon -->
      <div id="fe-ribbon">
        <div id="fe-ribbon-tabs">
          <div class="tab active">开始</div>
          <div class="tab">插入</div>
          <div class="tab">页面布局</div>
          <div class="tab">公式</div>
          <div class="tab">数据</div>
          <div class="tab">审阅</div>
          <div class="tab">视图</div>
        </div>
        <div id="fe-ribbon-toolbar">
          <button class="fe-tb-btn"><span class="icon">📋</span><span class="label">粘贴</span></button>
          <div class="fe-tb-sep"></div>
          <button class="fe-tb-btn"><span class="icon"><b>B</b></span><span class="label">加粗</span></button>
          <button class="fe-tb-btn"><span class="icon"><i>I</i></span><span class="label">斜体</span></button>
          <button class="fe-tb-btn"><span class="icon"><u>U</u></span><span class="label">下划线</span></button>
          <div class="fe-tb-sep"></div>
          <button class="fe-tb-btn"><span class="icon">≡</span><span class="label">左对齐</span></button>
          <button class="fe-tb-btn"><span class="icon">☰</span><span class="label">居中</span></button>
          <button class="fe-tb-btn"><span class="icon">≡</span><span class="label">右对齐</span></button>
          <div class="fe-tb-sep"></div>
          <button class="fe-tb-btn"><span class="icon">💰</span><span class="label">货币</span></button>
          <button class="fe-tb-btn"><span class="icon">%</span><span class="label">百分比</span></button>
          <button class="fe-tb-btn"><span class="icon">🔢</span><span class="label">数字</span></button>
          <div class="fe-tb-sep"></div>
          <button class="fe-tb-btn"><span class="icon">🎨</span><span class="label">填充色</span></button>
          <button class="fe-tb-btn"><span class="icon">🔍</span><span class="label">筛选</span></button>
          <button class="fe-tb-btn"><span class="icon">↕</span><span class="label">排序</span></button>
          <div class="fe-tb-sep"></div>
          <button class="fe-tb-btn"><span class="icon">Σ</span><span class="label">求和</span></button>
          <button class="fe-tb-btn"><span class="icon">📈</span><span class="label">图表</span></button>
        </div>
      </div>
  
      <!-- 公式栏 -->
      <div id="fe-formulabar">
        <input id="fe-cellref" value="A1" readonly />
        <span class="fx">fx</span>
        <input id="fe-formulainput" value="" placeholder="" />
      </div>
  
      <!-- 主体 -->
      <div id="fe-body">
        <div id="fe-rownums">
          <div class="rn-corner"></div>
          <div class="rn-list" id="fe-rownums-list"></div>
        </div>
        <div id="fe-sheet-wrap">
          <table id="fe-sheet">
            <thead>
              <tr>
                <th class="col-id">A</th>
                <th class="col-title">B</th>
                <th class="col-author">C</th>
                <th class="col-likes">D</th>
                <th class="col-type">E</th>
                <th class="col-date">F</th>
                <th class="col-status">G</th>
                <th class="col-dept">H</th>
                <th class="col-empty">I</th>
                <th class="col-empty">J</th>
              </tr>
            </thead>
            <tbody id="fe-tbody"></tbody>
          </table>
        </div>
      </div>
  
      <!-- Sheet 标签 -->
      <div id="fe-sheettabs">
        <div class="fe-sheet-tab active">Sheet1</div>
        <div class="fe-sheet-tab">Sheet2</div>
        <div class="fe-sheet-tab">汇总</div>
        <div class="fe-sheet-tab">+</div>
      </div>
  
      <!-- 状态栏 -->
      <div id="fe-statusbar">
        <span>就绪</span>
        <span>平均值: 1,842</span>
        <span>计数: ${notes.length}</span>
        <span>求和: ${notes.reduce((s, n) => s + (parseInt(n.likes.replace(/[^0-9]/g, '')) || 0), 0).toLocaleString()}</span>
        <div class="right">
          <span>普通视图</span>
          <span>🔲</span>
          <span>100%</span>
          <input type="range" id="fe-zoom-slider" min="50" max="200" value="100" />
        </div>
      </div>
    `;
  
    document.body.appendChild(app);
  
    // ── 4. 填充表格数据 ───────────────────────────────────
    const COLS = ['A','B','C','D','E','F','G','H','I','J'];
    const HEADERS = ['编号','内容标题','负责人','互动数据','内容类型','更新时间','审核状态','所属部门','备注','操作'];
    const STATUSES = ['已发布','待审核','已归档','优质内容','待优化'];
    const DEPTS    = ['内容运营部','市场部','品牌部','用户增长部','社区运营部'];
    const DATES    = ['2026/03/08','2026/03/09','2026/03/10','2026/03/07','2026/03/06'];
  
    const tbody = document.getElementById('fe-tbody');
    const rnList = document.getElementById('fe-rownums-list');
  
    // 表头行（第1行）
    const hrow = document.createElement('tr');
    hrow.className = 'row-selected';
    HEADERS.forEach((h, ci) => {
      const td = document.createElement('td');
      td.textContent = h;
      td.style.cssText = 'background:#107c41;color:#fff;font-weight:600;';
      td.dataset.cell = `${COLS[ci]}1`;
      hrow.appendChild(td);
    });
    tbody.appendChild(hrow);
  
    const rnCorner = document.createElement('div');
    rnCorner.className = 'fe-rownum';
    rnCorner.textContent = '1';
    rnList.appendChild(rnCorner);
  
    // 数据行
    notes.forEach((note, i) => {
      const rowNum = i + 2;
      const tr = document.createElement('tr');
  
      const cells = [
        { val: String(rowNum - 1).padStart(3, '0'), cls: 'num-cell' },
        { val: note.title, cls: '' },
        { val: note.author, cls: '' },
        { val: note.likes, cls: 'num-cell' },
        { val: note.isVideo ? '🎬 视频' : '🖼️ 图文', cls: '' },
        { val: DATES[i % DATES.length], cls: '' },
        { val: STATUSES[i % STATUSES.length], cls: '' },
        { val: DEPTS[i % DEPTS.length], cls: '' },
        { val: '', cls: '' },
        { val: '', cls: '' },
      ];
  
      cells.forEach((c, ci) => {
        const td = document.createElement('td');
        td.textContent = c.val;
        td.className = c.cls;
        td.tabIndex = 0;
        td.dataset.cell = `${COLS[ci]}${rowNum}`;
        td.dataset.row = rowNum;
        td.dataset.col = ci;
        tr.appendChild(td);
      });
  
      tbody.appendChild(tr);
  
      const rn = document.createElement('div');
      rn.className = 'fe-rownum';
      rn.textContent = rowNum;
      rnList.appendChild(rn);
    });
  
    // 添加若干空行撑满
    for (let e = notes.length + 2; e <= notes.length + 20; e++) {
      const tr = document.createElement('tr');
      for (let ci = 0; ci < 10; ci++) {
        const td = document.createElement('td');
        td.tabIndex = 0;
        td.dataset.cell = `${COLS[ci]}${e}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
      const rn = document.createElement('div');
      rn.className = 'fe-rownum';
      rn.textContent = e;
      rnList.appendChild(rn);
    }

    // ── 5. 封面预览列（K 列）──────────────────────────────
    const sheet = document.getElementById('fe-sheet');
    const stylePreview = document.createElement('style');
    stylePreview.id = 'fe-img-col-style';
    stylePreview.textContent = `
      #fe-sheet tbody tr { height: 56px !important; }
      #fe-sheet tbody tr:first-child { height: 22px !important; }
      .fe-rownum { height: 56px !important; line-height: 56px !important; }
      .fe-rownum:first-child { height: 22px !important; line-height: 22px !important; }
      .col-preview { width: 80px; }
      .td-preview {
        padding: 3px 4px !important;
        vertical-align: middle;
        text-align: center;
        background: #fafafa;
        position: relative;
        cursor: pointer;
      }
      .td-preview .thumb-wrap {
        position: relative;
        display: inline-block;
        width: 68px;
        height: 50px;
        border-radius: 3px;
        overflow: hidden;
        border: 1px solid #e0e0e0;
      }
      .td-preview img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        border-radius: 2px;
      }
      .td-preview .play-badge {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.32);
        font-size: 18px;
        color: #fff;
        pointer-events: none;
      }
      .td-preview .no-img {
        width: 68px;
        height: 50px;
        background: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        color: #aaa;
        border: 1px solid #e0e0e0;
        border-radius: 3px;
      }
      #fe-img-popup {
        position: fixed;
        z-index: 9999999;
        pointer-events: none;
        border-radius: 6px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.28);
        border: 2px solid #185abd;
        background: #000;
        display: none;
        transition: opacity 0.15s;
      }
      #fe-img-popup img {
        width: 200px;
        height: 266px;
        object-fit: cover;
        display: block;
      }
      #fe-img-popup .popup-play {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0,0,0,0.3);
        font-size: 48px;
        color: rgba(255,255,255,0.9);
      }
      #fe-img-popup .popup-label {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(24,90,189,0.88);
        color: #fff;
        font-size: 11px;
        padding: 4px 8px;
        font-family: "Microsoft YaHei", sans-serif;
      }
    `;
    document.head.appendChild(stylePreview);

    const theadRow = sheet.querySelector('thead tr');
    if (theadRow) {
      const th = document.createElement('th');
      th.className = 'col-preview';
      th.textContent = 'K';
      theadRow.appendChild(th);
    }

    const dataRows = Array.from(tbody.querySelectorAll('tr'));
    dataRows.forEach((tr, i) => {
      const td = document.createElement('td');
      td.className = 'td-preview';

      if (i === 0) {
        td.textContent = '封面预览';
        td.style.cssText = 'background:#107c41;color:#fff;font-weight:600;height:22px!important;font-size:12px;text-align:center;vertical-align:middle;';
        tr.appendChild(td);
        return;
      }

      const note = notes[i - 1];
      if (note && note.src) {
        const wrap = document.createElement('div');
        wrap.className = 'thumb-wrap';
        const img = document.createElement('img');
        img.src = note.src;
        img.alt = '封面';
        img.loading = 'lazy';
        wrap.appendChild(img);
        if (note.isVideo) {
          const badge = document.createElement('div');
          badge.className = 'play-badge';
          badge.textContent = '▶';
          wrap.appendChild(badge);
        }
        td.appendChild(wrap);
        td.dataset.imgSrc = note.src;
        td.dataset.isVideo = note.isVideo ? '1' : '0';
      } else {
        const empty = document.createElement('div');
        empty.className = 'no-img';
        empty.textContent = '无封面';
        td.appendChild(empty);
      }
      tr.appendChild(td);
    });

    const popup = document.createElement('div');
    popup.id = 'fe-img-popup';
    popup.innerHTML = `<img src="" alt="preview"/><div class="popup-label">双击可查看原帖 👆</div>`;
    document.body.appendChild(popup);
    const popupImg = popup.querySelector('img');
    let popupTimer = null;

    document.addEventListener('mouseover', e => {
      const td = e.target.closest('.td-preview');
      if (!td || !td.dataset.imgSrc) {
        clearTimeout(popupTimer);
        popup.style.display = 'none';
        return;
      }
      popupTimer = setTimeout(() => {
        popupImg.src = td.dataset.imgSrc;
        const old = popup.querySelector('.popup-play');
        if (old) old.remove();
        if (td.dataset.isVideo === '1') {
          const playDiv = document.createElement('div');
          playDiv.className = 'popup-play';
          playDiv.textContent = '▶';
          popup.insertBefore(playDiv, popup.querySelector('.popup-label'));
        }
        const x = Math.min(e.clientX + 16, window.innerWidth - 220);
        const y = Math.min(e.clientY - 40, window.innerHeight - 300);
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
        popup.style.display = 'block';
      }, 200);
    });

    document.addEventListener('mousemove', e => {
      const td = e.target.closest('.td-preview');
      if (td && td.dataset.imgSrc && popup.style.display === 'block') {
        const x = Math.min(e.clientX + 16, window.innerWidth - 220);
        const y = Math.min(e.clientY - 40, window.innerHeight - 300);
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
      }
    });

    document.addEventListener('mouseout', e => {
      const td = e.target.closest('.td-preview');
      if (td) {
        clearTimeout(popupTimer);
        popup.style.display = 'none';
      }
    });

    tbody.addEventListener('dblclick', e => {
      const td = e.target.closest('.td-preview');
      if (!td) return;
      const rowIdx = Array.from(tbody.querySelectorAll('tr')).indexOf(td.parentElement);
      const note = notes[rowIdx - 1];
      if (note?.link && note.link !== '#') {
        window.open(note.link, '_blank');
      }
    });

    // ── 6. 交互：点击单元格更新公式栏 & 行号高亮 ──────────
    const cellRef   = document.getElementById('fe-cellref');
    const formulaIn = document.getElementById('fe-formulainput');
    const rnListEl  = document.getElementById('fe-rownums-list');
    const sheetWrap = document.getElementById('fe-sheet-wrap');
  
    document.getElementById('fe-sheet').addEventListener('click', e => {
      const td = e.target.closest('td');
      if (!td || !td.dataset.cell) return;
  
      document.querySelectorAll('#fe-sheet td.selected').forEach(el => el.classList.remove('selected'));
      td.classList.add('selected');
      cellRef.value = td.dataset.cell;
      formulaIn.value = td.textContent;
  
      // 同步行号高亮
      const rowIdx = parseInt(td.dataset.row || 1);
      document.querySelectorAll('.fe-rownum.active').forEach(el => el.classList.remove('active'));
      const rnEls = rnListEl.querySelectorAll('.fe-rownum');
      if (rnEls[rowIdx - 1]) rnEls[rowIdx - 1].classList.add('active');
    });
  
    // 同步行号滚动
    sheetWrap.addEventListener('scroll', () => {
      rnListEl.scrollTop = sheetWrap.scrollTop;
    });
  
    // ── 7. 紧急撤离快捷键 Ctrl+Shift+X ───────────────────
    document.addEventListener('keydown', e => {
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        app.remove();
        document.getElementById('fe-img-popup')?.remove();
        document.getElementById('xhs-excel-disguise')?.remove();
        document.getElementById('fe-img-col-style')?.remove();
      }
    });
  })();