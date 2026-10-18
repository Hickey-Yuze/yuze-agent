(function(){
  'use strict';

  /* ============================================================
   * 四六级语料库 · 背诵复习面板 v2.1
   * - 新学习 / 复习 / 语料库管理 / 统计 四个标签页
   * - 数据保存在当前网站的 localStorage（刷新页面不丢失）
   * - 不修改原网页内容，关闭或刷新页面即可移除面板
   * ============================================================ */

  // ---------- 0. 防止重复注入 ----------
  if (document.getElementById('__cet_flashcard_root__')) return;

  // ---------- 1. 数据层 ----------
  const STORAGE_KEY   = '__cet_flashcard_v2__';
  const AUTOSPEAK_KEY = '__cet_flashcard_autospeak__';

  function loadData(){
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw){
        const d = JSON.parse(raw);
        if (!Array.isArray(d.cards)) d.cards = [];
        return d;
      }
    } catch(e){}
    return { cards: [] };
  }

  function saveData(){
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
    catch(e){ toast('保存失败：浏览器存储空间不足'); }
  }

  let data = loadData();

  function genId(){
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function isDup(chinese, english){
    return data.cards.some(c => c.chinese === chinese && c.english === english);
  }

  /** 添加卡片；返回 true=成功，false=为空或重复 */
  function addCard(chinese, english, type, category){
    chinese = String(chinese || '').trim();
    english = String(english || '').trim();
    if (!chinese || !english) return false;
    if (isDup(chinese, english)) return false;
    data.cards.push({
      id: genId(),
      chinese: chinese,
      english: english,
      type: type || '单词',
      category: String(category || '').trim() || '未分类',
      status: 'new',          // new=未学习  review=复习中  mastered=已掌握
      createdAt: Date.now()
    });
    saveData();
    return true;
  }

  function deleteCard(id){
    data.cards = data.cards.filter(c => c.id !== id);
    saveData();
  }

  function setStatus(id, status){
    const c = data.cards.find(x => x.id === id);
    if (c){ c.status = status; saveData(); }
  }
  const markMastered = id => setStatus(id, 'mastered');
  const markReview   = id => setStatus(id, 'review');

  const getNewCards    = () => data.cards.filter(c => c.status === 'new');
  const getReviewCards = () => data.cards.filter(c => c.status === 'review');

  function getStats(){
    const stats = { total: data.cards.length, mastered: 0, review: 0, newCount: 0, catStats: {} };
    data.cards.forEach(c => {
      const cat = c.category || '未分类';
      if (!stats.catStats[cat]) stats.catStats[cat] = { total:0, mastered:0, review:0, new:0 };
      stats.catStats[cat].total++;
      if (c.status === 'mastered'){ stats.mastered++; stats.catStats[cat].mastered++; }
      else if (c.status === 'review'){ stats.review++; stats.catStats[cat].review++; }
      else { stats.newCount++; stats.catStats[cat].new++; }
    });
    return stats;
  }

  // ---------- 2. 工具函数 ----------
  function esc(s){
    return String(s == null ? '' : s)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  let toastTimer = null;
  function toast(msg){
    let el = document.getElementById('__cet_toast__');
    if (!el){
      el = document.createElement('div');
      el.id = '__cet_toast__';
      el.style.cssText = 'position:fixed;left:50%;bottom:56px;transform:translateX(-50%);'
        + 'background:rgba(30,30,46,.96);color:#e8e8f0;padding:10px 20px;border-radius:24px;'
        + 'font-size:13px;z-index:1000001;pointer-events:none;opacity:0;transition:opacity .25s;'
        + 'box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:system-ui,sans-serif;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.style.opacity = '0'; }, 2200);
  }

  /** 调用浏览器内置语音合成朗读（不发送任何网络请求） */
  function speak(text, lang){
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang || 'en-US';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    } catch(e){}
  }

  function autoSpeakOn(){
    try { return localStorage.getItem(AUTOSPEAK_KEY) === '1'; } catch(e){ return false; }
  }

  // ---------- 3. UI 容器与样式 ----------
  const root = document.createElement('div');
  root.id = '__cet_flashcard_root__';
  Object.assign(root.style, {
    position:'fixed', top:'0', left:'0', width:'100vw', height:'100vh',
    zIndex:'999999', pointerEvents:'none', fontFamily:'system-ui, sans-serif'
  });
  document.body.appendChild(root);

  const style = document.createElement('style');
  style.textContent = `
    #__cet_flashcard_root__ * { box-sizing:border-box; margin:0; padding:0; }
    #__cet_flashcard_root__ button { cursor:pointer; border:none; outline:none; font-family:inherit; }
    #__cet_flashcard_panel__{
      pointer-events:auto; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);
      width:480px; max-width:94vw; max-height:90vh; background:#1e1e2e; border-radius:16px;
      box-shadow:0 20px 60px rgba(0,0,0,.5); display:flex; flex-direction:column; overflow:hidden;
      color:#e0e0e0; font-size:14px;
    }
    #__cet_flashcard_panel__.minimized { height:46px !important; overflow:hidden !important; }
    #__cet_flashcard_panel__.minimized .__cet_body__,
    #__cet_flashcard_panel__.minimized .__cet_tabs__ { display:none; }
    .__cet_header__{
      display:flex; align-items:center; justify-content:space-between; padding:8px 14px;
      background:#2a2a3c; border-bottom:1px solid #3a3a50; user-select:none; cursor:move; flex-shrink:0;
    }
    .__cet_header__ .title{ font-weight:700; font-size:15px; color:#c4b5fd; }
    .__cet_header__ .btns{ display:flex; gap:6px; }
    .__cet_header__ .btns button{
      width:28px; height:28px; border-radius:8px; background:#3a3a50; color:#ccc; font-size:14px;
      display:flex; align-items:center; justify-content:center; transition:background .2s;
    }
    .__cet_header__ .btns button:hover{ background:#5a5a78; }
    .__cet_tabs__{ display:flex; border-bottom:1px solid #3a3a50; flex-shrink:0; background:#1e1e2e; }
    .__cet_tabs__ button{
      flex:1; padding:10px 4px; background:transparent; color:#aaa; font-size:12px;
      border-bottom:2px solid transparent; transition:all .2s; white-space:nowrap;
    }
    .__cet_tabs__ button.active{ color:#c4b5fd; border-bottom-color:#c4b5fd; background:#2a2a3c; }
    .__cet_tabs__ button:hover{ color:#ddd; }
    .__cet_body__{ flex:1; overflow-y:auto; padding:14px; min-height:0; }
    .__cet_card__{ perspective:800px; width:100%; height:220px; margin-bottom:12px; cursor:pointer; }
    .__cet_card_inner__{
      position:relative; width:100%; height:100%; transition:transform .5s; transform-style:preserve-3d;
    }
    .__cet_card_inner__.flipped{ transform:rotateY(180deg); }
    .__cet_card_face__{
      position:absolute; inset:0; border-radius:16px; display:flex; flex-direction:column;
      align-items:center; justify-content:center; backface-visibility:hidden;
      padding:20px; text-align:center; font-size:22px; font-weight:700;
    }
    .__cet_card_front__{ background:linear-gradient(135deg,#3b3b5c,#2d2d4a); color:#f0e6ff; }
    .__cet_card_back__{ background:linear-gradient(135deg,#2d4a3b,#1e3a2d); color:#e0ffe0; transform:rotateY(180deg); }
    .__cet_card_face__ .type-tag{
      font-size:12px; font-weight:400; margin-top:8px; padding:3px 10px; border-radius:20px;
      background:rgba(255,255,255,.12);
    }
    .__cet_card_face__ .cat-tag{ font-size:11px; font-weight:400; margin-top:4px; color:rgba(255,255,255,.6); }
    .__cet_speak__{
      position:absolute; top:10px; right:10px; width:34px; height:34px; border-radius:50%;
      background:rgba(255,255,255,.14); color:#fff; font-size:15px;
      display:flex; align-items:center; justify-content:center; transition:background .2s;
    }
    .__cet_speak__:hover{ background:rgba(255,255,255,.32); }
    .__cet_actions__{ display:flex; gap:10px; justify-content:center; margin-top:6px; flex-wrap:wrap; }
    .__cet_actions__ button{ padding:10px 22px; border-radius:24px; font-size:14px; font-weight:600; transition:all .2s; }
    .btn-master{ background:#4ade80; color:#1a2e1a; }
    .btn-master:hover{ background:#6aee9a; }
    .btn-again{ background:#f59e0b; color:#2e1a00; }
    .btn-again:hover{ background:#fbbf24; }
    .__cet_hint__{ text-align:center; font-size:12px; color:#777; margin-top:10px; line-height:1.7; }
    .__cet_hint__ kbd{ background:#3a3a50; border-radius:4px; padding:1px 6px; font-size:11px; font-family:inherit; }
    .__cet_autosay__{
      display:flex; align-items:center; gap:5px; justify-content:center;
      margin-top:8px; font-size:12px; color:#999; cursor:pointer; user-select:none;
    }
    .__cet_autosay__ input{ accent-color:#c4b5fd; cursor:pointer; }
    .__cet_empty__{ text-align:center; color:#888; padding:40px 20px; font-size:15px; line-height:2; }
    .__cet_table__{ width:100%; border-collapse:collapse; font-size:12px; }
    .__cet_table__ th,.__cet_table__ td{ padding:8px 6px; border-bottom:1px solid #3a3a50; text-align:left; }
    .__cet_table__ th{ color:#c4b5fd; font-weight:600; position:sticky; top:0; background:#1e1e2e; }
    .__cet_table__ .row-btn{ padding:3px 9px; border-radius:6px; font-size:11px; margin-right:4px; }
    .__cet_table__ .del-btn{ background:#e74c3c; color:#fff; }
    .__cet_table__ .del-btn:hover{ background:#f06050; }
    .__cet_table__ .reset-btn{ background:#3a3a50; color:#ccc; }
    .__cet_table__ .reset-btn:hover{ background:#5a5a78; }
    .__cet_form__{ display:flex; flex-direction:column; gap:8px; margin-bottom:14px; }
    .__cet_form__ input,.__cet_form__ select{
      padding:9px 12px; border-radius:10px; border:1px solid #4a4a60; background:#2a2a3c;
      color:#e0e0e0; font-size:13px; outline:none;
    }
    .__cet_form__ input:focus,.__cet_form__ select:focus{ border-color:#c4b5fd; }
    .__cet_form__ button{ padding:10px; border-radius:10px; background:#7c3aed; color:#fff; font-weight:600; font-size:13px; }
    .__cet_form__ button:hover{ background:#8b5cf6; }
    .__cet_form_row__{ display:flex; gap:8px; }
    .__cet_form_row__ input,.__cet_form_row__ select{ flex:1; }
    .__cet_dropzone__{
      border:2px dashed #5a5a78; border-radius:12px; padding:22px 16px; text-align:center;
      color:#888; margin-top:4px; transition:all .3s; cursor:pointer; font-size:13px; line-height:1.8;
    }
    .__cet_dropzone__:hover,.__cet_dropzone__.dragover{ border-color:#c4b5fd; color:#c4b5fd; background:#2a2a3c; }
    .__cet_toolbar__{ display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 10px; }
    .__cet_toolbar__ button{
      padding:7px 12px; border-radius:8px; background:#3a3a50; color:#ccc; font-size:12px; transition:background .2s;
    }
    .__cet_toolbar__ button:hover{ background:#5a5a78; }
    .__cet_toolbar__ .danger{ background:#5c2b2b; color:#ffb3b3; }
    .__cet_toolbar__ .danger:hover{ background:#7a3838; }
    .__cet_search__{
      width:100%; padding:8px 12px; border-radius:10px; border:1px solid #4a4a60;
      background:#2a2a3c; color:#e0e0e0; font-size:13px; outline:none; margin-bottom:8px;
    }
    .__cet_search__:focus{ border-color:#c4b5fd; }
    .__cet_stat_card__{ background:#2a2a3c; border-radius:12px; padding:14px; }
    .__cet_stat_card__ .num{ font-size:28px; font-weight:800; color:#c4b5fd; }
    .__cet_stat_card__ .lbl{ font-size:12px; color:#888; margin-top:2px; }
    .__cet_stat_grid__{ display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
    .__cet_cat_row__{
      display:flex; justify-content:space-between; align-items:center; padding:8px 0;
      border-bottom:1px solid #3a3a50; font-size:13px;
    }
    .__cet_cat_row__ .bar-wrap{ flex:1; margin:0 12px; height:6px; background:#3a3a50; border-radius:3px; overflow:hidden; }
    .__cet_cat_row__ .bar-fill{ height:100%; background:#4ade80; border-radius:3px; transition:width .3s; }
    .__cet_cat_row__ .pct{ font-size:12px; color:#aaa; min-width:76px; text-align:right; }
    @media(max-width:500px){
      #__cet_flashcard_panel__{ max-width:100vw; max-height:100vh; border-radius:0; top:0; left:0; transform:none; width:100vw; height:100vh; }
      .__cet_card__{ height:180px; }
      .__cet_card_face__{ font-size:18px; }
    }
  `;
  document.head.appendChild(style);

  const panel = document.createElement('div');
  panel.id = '__cet_flashcard_panel__';
  root.appendChild(panel);

  // ---------- 4. 拖拽（仅标题栏可拖，避免影响输入框和按钮） ----------
  let dragging = false, ox = 0, oy = 0;

  function dragStart(x, y){
    const r = panel.getBoundingClientRect();
    ox = x - r.left; oy = y - r.top;
    dragging = true;
    panel.style.transition = 'none';
  }
  function dragMove(x, y){
    if (!dragging) return;
    panel.style.left = (x - ox) + 'px';
    panel.style.top  = (y - oy) + 'px';
    panel.style.transform = 'none';
  }
  function dragEnd(){
    dragging = false;
    panel.style.transition = '';
  }
  function onMouseMove(e){ dragMove(e.clientX, e.clientY); }
  function onTouchMove(e){
    if (!dragging) return;
    const t = e.touches[0];
    dragMove(t.clientX, t.clientY);
    e.preventDefault();
  }

  // ---------- 5. 头部 ----------
  const header = document.createElement('div');
  header.className = '__cet_header__';
  header.innerHTML = '<span class="title">📖 四六级语料库 · 背诵复习</span>'
    + '<div class="btns">'
    + '<button id="__cet_min__" title="最小化">─</button>'
    + '<button id="__cet_close__" title="关闭">✕</button>'
    + '</div>';
  panel.appendChild(header);

  header.addEventListener('mousedown', function(e){
    if (e.target.tagName === 'BUTTON') return;
    dragStart(e.clientX, e.clientY);
    e.preventDefault();
  });
  header.addEventListener('touchstart', function(e){
    if (e.target.tagName === 'BUTTON') return;
    const t = e.touches[0];
    dragStart(t.clientX, t.clientY);
  }, { passive: true });

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', dragEnd);
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', dragEnd);

  let minimized = false;
  const minBtn = header.querySelector('#__cet_min__');
  minBtn.addEventListener('click', function(e){
    e.stopPropagation();
    minimized = !minimized;
    panel.classList.toggle('minimized', minimized);
    minBtn.textContent = minimized ? '□' : '─';
  });
  header.querySelector('#__cet_close__').addEventListener('click', function(e){
    e.stopPropagation();
    destroy();
  });

  /** 关闭面板：移除 DOM 并解绑全部事件，避免监听器残留 */
  function destroy(){
    try { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); } catch(err){}
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', dragEnd);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', dragEnd);
    document.removeEventListener('keydown', onKey);
    const t = document.getElementById('__cet_toast__');
    if (t) t.remove();
    root.remove();
    style.remove();
  }

  // ---------- 6. 标签栏 ----------
  const tabs = document.createElement('div');
  tabs.className = '__cet_tabs__';
  const tabDefs = [
    { key:'learn',  label:'🌙 新学习' },
    { key:'review', label:'🔄 复习' },
    { key:'manage', label:'📋 语料库管理' },
    { key:'stats',  label:'📊 统计' }
  ];
  const tabBtns = {};
  tabDefs.forEach(function(t){
    const btn = document.createElement('button');
    btn.textContent = t.label;
    tabBtns[t.key] = btn;
    btn.addEventListener('click', function(){ switchTab(t.key); });
    tabs.appendChild(btn);
  });
  panel.appendChild(tabs);

  const body = document.createElement('div');
  body.className = '__cet_body__';
  panel.appendChild(body);

  let currentTab = 'learn';

  function refreshTabCounts(){
    tabBtns.learn.textContent  = '🌙 新学习 (' + getNewCards().length + ')';
    tabBtns.review.textContent = '🔄 复习 (' + getReviewCards().length + ')';
    tabBtns.manage.textContent = '📋 语料库管理';
    tabBtns.stats.textContent  = '📊 统计';
  }

  function switchTab(key){
    currentTab = key;
    Object.keys(tabBtns).forEach(function(k){ tabBtns[k].classList.remove('active'); });
    tabBtns[key].classList.add('active');
    renderBody();
  }

  function renderBody(){
    data = loadData();
    refreshTabCounts();
    body.innerHTML = '';
    currentInner = null;
    if (currentTab === 'learn') renderStudy('learn');
    else if (currentTab === 'review') renderStudy('review');
    else if (currentTab === 'manage') renderManage();
    else if (currentTab === 'stats') renderStats();
  }

  // ---------- 7. 学习 / 复习视图 ----------
  let currentInner = null;
  let lastCardId = null;

  /** 随机抽卡，尽量避免与上一张重复 */
  function pickRandom(cards){
    if (cards.length === 1) return cards[0];
    let c;
    do { c = cards[Math.floor(Math.random() * cards.length)]; }
    while (c.id === lastCardId);
    return c;
  }

  function renderStudy(mode){
    const cards = mode === 'learn' ? getNewCards() : getReviewCards();
    if (cards.length === 0){
      body.innerHTML = mode === 'learn'
        ? '<div class="__cet_empty__">🎉 没有新卡片了！<br>去「语料库管理」添加或导入更多语料吧</div>'
        : '<div class="__cet_empty__">📭 复习队列为空<br>在新学习中点击「再复习」的卡片会出现在这里</div>';
      return;
    }

    const card = pickRandom(cards);
    lastCardId = card.id;

    const cardEl = document.createElement('div');
    cardEl.className = '__cet_card__';
    cardEl.innerHTML =
      '<div class="__cet_card_inner__">'
      + '<div class="__cet_card_face__ __cet_card_front__"><div>' + esc(card.chinese) + '</div></div>'
      + '<div class="__cet_card_face__ __cet_card_back__">'
      +   '<button class="__cet_speak__" title="朗读英文">🔊</button>'
      +   '<div>' + esc(card.english) + '</div>'
      +   '<div class="type-tag">' + esc(card.type) + '</div>'
      +   '<div class="cat-tag">' + esc(card.category) + '</div>'
      + '</div>'
      + '</div>';

    const inner = cardEl.querySelector('.__cet_card_inner__');
    currentInner = inner;

    cardEl.addEventListener('click', function(){
      inner.classList.toggle('flipped');
      if (inner.classList.contains('flipped') && autoSpeakOn()) speak(card.english, 'en-US');
    });
    cardEl.querySelector('.__cet_speak__').addEventListener('click', function(e){
      e.stopPropagation();
      speak(card.english, 'en-US');
    });

    const actions = document.createElement('div');
    actions.className = '__cet_actions__';
    actions.innerHTML =
      '<button class="btn-master">✅ 已掌握</button>'
      + '<button class="btn-again">🔄 再复习</button>';
    actions.querySelector('.btn-master').addEventListener('click', function(e){
      e.stopPropagation();
      markMastered(card.id);
      renderBody();
    });
    actions.querySelector('.btn-again').addEventListener('click', function(e){
      e.stopPropagation();
      // 学习页：移入复习队列；复习页：保持复习状态即可
      if (mode === 'learn') markReview(card.id);
      renderBody();
    });

    const hint = document.createElement('div');
    hint.className = '__cet_hint__';
    hint.innerHTML = '本组还剩 <b style="color:#c4b5fd;">' + cards.length + '</b> 张'
      + '<br><kbd>空格</kbd> 翻转卡片 &nbsp; <kbd>1</kbd> 已掌握 &nbsp; <kbd>2</kbd> 再复习';

    const autoWrap = document.createElement('label');
    autoWrap.className = '__cet_autosay__';
    autoWrap.innerHTML = '<input type="checkbox"' + (autoSpeakOn() ? ' checked' : '') + '> 翻到背面时自动朗读英文';
    autoWrap.querySelector('input').addEventListener('change', function(e){
      try { localStorage.setItem(AUTOSPEAK_KEY, e.target.checked ? '1' : '0'); } catch(err){}
    });

    body.appendChild(cardEl);
    body.appendChild(actions);
    body.appendChild(hint);
    body.appendChild(autoWrap);
  }

  // ---------- 8. 键盘快捷键 ----------
  function onKey(e){
    if (minimized) return;
    if (currentTab !== 'learn' && currentTab !== 'review') return;
    const t = e.target;
    // 输入框、下拉框内不响应快捷键
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.code === 'Space'){
      if (t && t.tagName === 'BUTTON') return; // 焦点在按钮上时交给按钮自己处理
      e.preventDefault();
      if (currentInner) currentInner.click();
    } else if (e.key === '1'){
      const b = body.querySelector('.btn-master');
      if (b) b.click();
    } else if (e.key === '2'){
      const b = body.querySelector('.btn-again');
      if (b) b.click();
    }
  }
  document.addEventListener('keydown', onKey);

  // ---------- 9. 语料库管理视图 ----------
  function renderManage(){
    const wrapper = document.createElement('div');

    // --- 添加表单 ---
    const form = document.createElement('div');
    form.className = '__cet_form__';
    form.innerHTML =
      '<div style="font-weight:700;color:#c4b5fd;margin-bottom:2px;">➕ 添加语料</div>'
      + '<input id="__cet_f_chinese__" placeholder="中文（必填）" />'
      + '<input id="__cet_f_english__" placeholder="英文（必填）" />'
      + '<div class="__cet_form_row__">'
      + '<select id="__cet_f_type__">'
      + '<option value="单词">单词</option>'
      + '<option value="词组">词组</option>'
      + '<option value="句式模板">句式模板</option>'
      + '</select>'
      + '<input id="__cet_f_category__" placeholder="分类（默认：未分类）" />'
      + '</div>'
      + '<button id="__cet_f_add__">保存</button>';
    wrapper.appendChild(form);

    form.querySelector('#__cet_f_add__').addEventListener('click', function(){
      const ch = form.querySelector('#__cet_f_chinese__').value;
      const en = form.querySelector('#__cet_f_english__').value;
      if (!ch.trim() || !en.trim()){ toast('中文和英文不能为空'); return; }
      const ok = addCard(ch, en,
        form.querySelector('#__cet_f_type__').value,
        form.querySelector('#__cet_f_category__').value
      );
      if (!ok){ toast('该语料已存在（中英文完全相同的条目）'); return; }
      toast('已保存：' + ch.trim());
      renderBody();
    });
    // 表单内回车快捷保存
    form.querySelectorAll('input').forEach(function(inp){
      inp.addEventListener('keydown', function(e){
        if (e.key === 'Enter'){ e.preventDefault(); form.querySelector('#__cet_f_add__').click(); }
      });
    });

    // --- 导入区域 ---
    const dz = document.createElement('div');
    dz.className = '__cet_dropzone__';
    dz.innerHTML = '📂 拖拽 JSON / CSV / TXT 文件到此处导入（或点击选择）'
      + '<br><small style="color:#666;">每行格式：中文 | 英文 | 类型 | 分类（也兼容 Tab、逗号分隔）</small>';
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json,.csv,.txt';
    fileInput.style.display = 'none';
    dz.appendChild(fileInput);

    dz.addEventListener('click', function(){ fileInput.click(); });
    dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('dragover'); });
    dz.addEventListener('dragleave', function(){ dz.classList.remove('dragover'); });
    dz.addEventListener('drop', function(e){
      e.preventDefault();
      dz.classList.remove('dragover');
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) processFile(f);
    });
    fileInput.addEventListener('change', function(){
      const f = fileInput.files && fileInput.files[0];
      if (f) processFile(f);
      fileInput.value = '';
    });
    wrapper.appendChild(dz);

    /** 解析一行文本，依次尝试 | → Tab → 逗号 作为分隔符 */
    function parseLine(line){
      let parts = null;
      if (line.indexOf('|') !== -1) parts = line.split('|');
      else if (line.indexOf('\t') !== -1) parts = line.split('\t');
      else if (line.indexOf(',') !== -1) parts = line.split(',');
      if (!parts) return null;
      parts = parts.map(function(s){ return s.trim().replace(/^["']+|["']+$/g, ''); });
      if (parts.length >= 2 && parts[0] && parts[1]){
        return { chinese: parts[0], english: parts[1], type: parts[2] || '单词', category: parts[3] || '未分类' };
      }
      return null;
    }

    function processFile(file){
      const reader = new FileReader();
      reader.onload = function(e){
        const text = String(e.target.result || '');
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        let imported = 0, skipped = 0;
        try {
          if (ext === 'json'){
            const arr = JSON.parse(text);
            if (!Array.isArray(arr)){ toast('JSON 文件应为数组格式'); return; }
            arr.forEach(function(item){
              if (item && item.chinese && item.english){
                if (addCard(item.chinese, item.english, item.type, item.category)){
                  // 保留导出文件中的学习状态，支持备份回导
                  if (['new','review','mastered'].indexOf(item.status) !== -1){
                    data.cards[data.cards.length - 1].status = item.status;
                  }
                  imported++;
                } else skipped++;
              }
            });
            saveData();
          } else {
            text.split(/\r?\n/).forEach(function(line){
              line = line.trim();
              if (!line) return;
              const item = parseLine(line);
              if (!item) return;
              if (addCard(item.chinese, item.english, item.type, item.category)) imported++;
              else skipped++;
            });
          }
        } catch(err){
          toast('文件解析失败：' + err.message);
          return;
        }
        toast('导入完成：新增 ' + imported + ' 条' + (skipped ? '，跳过重复 ' + skipped + ' 条' : ''));
        renderBody();
      };
      reader.onerror = function(){ toast('文件读取失败'); };
      reader.readAsText(file);
    }

    // --- 工具栏：导出 / 重置 / 清空 ---
    const toolbar = document.createElement('div');
    toolbar.className = '__cet_toolbar__';
    toolbar.innerHTML =
      '<button id="__cet_t_export__">⬇️ 导出 JSON</button>'
      + '<button id="__cet_t_reset__">♻️ 全部重置为未学习</button>'
      + '<button id="__cet_t_clear__" class="danger">🗑️ 清空语料库</button>';
    wrapper.appendChild(toolbar);

    toolbar.querySelector('#__cet_t_export__').addEventListener('click', function(){
      if (data.cards.length === 0){ toast('暂无可导出的语料'); return; }
      const payload = data.cards.map(function(c){
        return { chinese: c.chinese, english: c.english, type: c.type, category: c.category, status: c.status };
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const d = new Date();
      const pad = function(n){ return String(n).padStart(2, '0'); };
      a.href = URL.createObjectURL(blob);
      a.download = 'cet_flashcards_' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function(){ URL.revokeObjectURL(a.href); }, 3000);
      toast('已导出 ' + payload.length + ' 条语料');
    });

    toolbar.querySelector('#__cet_t_reset__').addEventListener('click', function(){
      if (data.cards.length === 0){ toast('暂无语料'); return; }
      if (!confirm('确定将全部 ' + data.cards.length + ' 条语料重置为「未学习」状态吗？')) return;
      data.cards.forEach(function(c){ c.status = 'new'; });
      saveData();
      toast('已全部重置为未学习');
      renderBody();
    });

    toolbar.querySelector('#__cet_t_clear__').addEventListener('click', function(){
      if (data.cards.length === 0){ toast('暂无语料'); return; }
      if (!confirm('⚠️ 确定清空全部 ' + data.cards.length + ' 条语料吗？此操作不可恢复，建议先导出备份。')) return;
      data.cards = [];
      saveData();
      toast('语料库已清空');
      renderBody();
    });

    // --- 搜索 + 语料表格 ---
    const total = data.cards.length;
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'font-weight:700;color:#c4b5fd;margin:12px 0 8px;';
    titleRow.textContent = '📋 全部语料（共 ' + total + ' 条）';
    wrapper.appendChild(titleRow);

    if (total === 0){
      const empty = document.createElement('div');
      empty.className = '__cet_empty__';
      empty.textContent = '暂无语料，请添加或导入';
      wrapper.appendChild(empty);
    } else {
      const search = document.createElement('input');
      search.className = '__cet_search__';
      search.placeholder = '🔍 搜索语料（中文 / 英文 / 分类）';
      wrapper.appendChild(search);

      const table = document.createElement('table');
      table.className = '__cet_table__';
      table.innerHTML = '<thead><tr>'
        + '<th>中文</th><th>英文</th><th>类型</th><th>分类</th><th>状态</th><th>操作</th>'
        + '</tr></thead><tbody></tbody>';
      const tbody = table.querySelector('tbody');
      const statusMap = { new:'🆕新', review:'🔄复习', mastered:'✅掌握' };

      data.cards.slice().reverse().forEach(function(c){
        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + esc(c.chinese) + '</td>'
          + '<td>' + esc(c.english) + '</td>'
          + '<td>' + esc(c.type) + '</td>'
          + '<td>' + esc(c.category) + '</td>'
          + '<td>' + (statusMap[c.status] || esc(c.status)) + '</td>'
          + '<td>'
          + '<button class="row-btn reset-btn" title="重置为未学习">重置</button>'
          + '<button class="row-btn del-btn">删除</button>'
          + '</td>';
        tr.querySelector('.reset-btn').addEventListener('click', function(){
          setStatus(c.id, 'new');
          toast('已重置：' + c.chinese);
          renderBody();
        });
        tr.querySelector('.del-btn').addEventListener('click', function(){
          if (confirm('确定删除「' + c.chinese + '」？')){
            deleteCard(c.id);
            toast('已删除：' + c.chinese);
            renderBody();
          }
        });
        tbody.appendChild(tr);
      });
      wrapper.appendChild(table);

      search.addEventListener('input', function(){
        const kw = search.value.trim().toLowerCase();
        tbody.querySelectorAll('tr').forEach(function(tr){
          const text = tr.textContent.toLowerCase();
          tr.style.display = (!kw || text.indexOf(kw) !== -1) ? '' : 'none';
        });
      });
    }

    body.appendChild(wrapper);
  }

  // ---------- 10. 统计视图 ----------
  function renderStats(){
    const stats = getStats();
    const wrapper = document.createElement('div');

    const grid = document.createElement('div');
    grid.className = '__cet_stat_grid__';
    [
      { num: stats.total,    lbl: '总语料' },
      { num: stats.newCount, lbl: '🆕 未学习' },
      { num: stats.review,   lbl: '🔄 复习中' },
      { num: stats.mastered, lbl: '✅ 已掌握' }
    ].forEach(function(it){
      const card = document.createElement('div');
      card.className = '__cet_stat_card__';
      card.innerHTML = '<div class="num">' + it.num + '</div><div class="lbl">' + it.lbl + '</div>';
      grid.appendChild(card);
    });
    wrapper.appendChild(grid);

    const catTitle = document.createElement('div');
    catTitle.style.cssText = 'font-weight:700;color:#c4b5fd;margin-bottom:8px;';
    catTitle.textContent = '📈 分类掌握明细';
    wrapper.appendChild(catTitle);

    const cats = Object.keys(stats.catStats);
    if (cats.length === 0){
      const empty = document.createElement('div');
      empty.className = '__cet_empty__';
      empty.textContent = '暂无数据';
      wrapper.appendChild(empty);
    } else {
      cats.forEach(function(cat){
        const s = stats.catStats[cat];
        const pct = s.total > 0 ? Math.round(s.mastered / s.total * 100) : 0;
        const row = document.createElement('div');
        row.className = '__cet_cat_row__';
        row.innerHTML =
          '<span style="min-width:60px;">' + esc(cat) + '</span>'
          + '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%"></div></div>'
          + '<span class="pct">' + s.mastered + '/' + s.total + ' · ' + pct + '%</span>';
        wrapper.appendChild(row);
      });
    }

    const tip = document.createElement('div');
    tip.style.cssText = 'margin-top:16px;padding:12px;background:#2a2a3c;border-radius:10px;font-size:12px;color:#999;line-height:1.8;';
    tip.innerHTML =
      '<strong style="color:#c4b5fd;">📌 使用说明</strong><br>'
      + '<b>新学习：</b>随机抽取未学卡片，正面中文、点击翻面看英文。<br>'
      + '<b>复习：</b>「再复习」的卡片进入随机复习队列，掌握后移出。<br>'
      + '<b>快捷键：</b>空格=翻面，1=已掌握，2=再复习。<br>'
      + '<b>朗读：</b>卡片背面 🔊 按钮朗读英文，可开启翻面自动朗读。<br>'
      + '<b>数据：</b>保存在当前网站的浏览器存储中，建议定期在「语料库管理」导出 JSON 备份。';
    wrapper.appendChild(tip);

    body.appendChild(wrapper);
  }

  // ---------- 11. 初始渲染 ----------
  switchTab('learn');
})();