(function() {
  console.log('🚀 学城历史记录面板 v6.7 (UI优化 + 增强设置功能) 初始化...');
  
  if (document.getElementById('xuecheng-history-panel')) {
    console.log('⚠️ 历史记录面板已存在');
    return;
  }

  const XUECHENG_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICAgIDxwYXRoIGQ9Ik03IDE4aDR2Mkg3di0yeiIgZmlsbD0iIzBFQTVFOSIvPgogICAgPHBhdGggZD0iTTUgMTRoOHYySDV2LTJ6IiBmaWxsPSIjMEVBNUU5Ii8+CiAgICA8cGF0aCBkPSJNMyAxMGgxMnYySDN2LTJ6IiBmaWxsPSIjMEVBNUU5Ii8+CiAgICA8cGF0aCBkPSJNMSA2aDE2djJIMVY2eiIgZmlsbD0iIzBFQTVFOSIvPgo8L3N2Zz4=';

  // 设置存储 key
  const SETTINGS_KEY = 'xuecheng-panel-settings';

  // 获取用户设置（默认展开）
  function getSettings() {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? JSON.parse(stored) : { defaultState: 'expanded' };
    } catch (e) {
      console.error('❌ 读取设置失败:', e);
      return { defaultState: 'expanded' };
    }
  }

  // 保存用户设置
  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      console.log('✅ 设置已保存:', settings);
    } catch (e) {
      console.error('❌ 保存设置失败:', e);
    }
  }

  const appState = {
    currentMode: 'browse',
    browse: { currentPage: 1, pageSize: 30, total: 0, totalPages: 0, hasNext: false, pageCache: new Map(), isLoading: false },
    edit: { currentPage: 1, pageSize: 30, total: 0, totalPages: 0, hasNext: false, pageCache: new Map(), isLoading: false },
    comment: { currentPage: 1, pageSize: 30, total: 0, totalPages: 0, hasNext: false, pageCache: new Map(), isLoading: false },
    mentioned: { currentPage: 1, pageSize: 30, total: 0, totalPages: 0, hasNext: false, pageCache: new Map(), isLoading: false }
  };

  const API_CONFIG = {
    browse: {
      url: 'https://km.sankuai.com/api/operationHistory',
      getParams: (pageNo) => ({ pageNo: pageNo || 1, pageSize: 30, operationTypes: 3, creator: '' })
    },
    edit: {
      url: 'https://km.sankuai.com/api/pages/latestEdit',
      getParams: (pageNo) => ({ offSet: ((pageNo || 1) - 1) * 30, limit: 30, creator: '' })
    },
    comment: {
      url: 'https://km.sankuai.com/api/data/userRelated/commented',
      getParams: (pageNo) => ({ offset: ((pageNo || 1) - 1) * 30, limit: 30 })
    },
    mentioned: {
      url: 'https://km.sankuai.com/api/data/userRelated/mentioned',
      getParams: (pageNo) => ({ offset: ((pageNo || 1) - 1) * 30, limit: 30 })
    }
  };

  function getCurrentState() {
    return appState[appState.currentMode];
  }

  function createHistoryPanel() {
    const panel = document.createElement('div');
    panel.id = 'xuecheng-history-panel';
    
    // 优化后的 HTML 结构 - 所有元素在一行内展示
    panel.innerHTML = `<div class="xc-history-header"><div class="xc-header-left"><div class="xc-tab-switch"><button class="xc-tab-btn active" data-mode="browse"><span class="xc-tab-icon">📚</span><span class="xc-tab-text">浏览</span></button><button class="xc-tab-btn" data-mode="edit"><span class="xc-tab-icon">✏️</span><span class="xc-tab-text">编辑</span></button><button class="xc-tab-btn" data-mode="comment"><span class="xc-tab-icon">💬</span><span class="xc-tab-text">评论</span></button><button class="xc-tab-btn" data-mode="mentioned"><span class="xc-tab-icon">📢</span><span class="xc-tab-text">@我</span></button></div></div><div class="xc-header-right"><button class="xc-refresh-btn" title="刷新列表"><span class="xc-btn-icon">🔄</span><span class="xc-btn-text">刷新</span></button><div class="xc-divider"></div><button class="xc-settings-btn" title="打开设置面板"><span class="xc-btn-icon">⚙️</span><span class="xc-btn-text">设置</span></button><button class="xc-toggle-btn" title="折叠/展开面板"><span class="xc-btn-icon">−</span><span class="xc-btn-text">收起</span></button><button class="xc-close-btn" title="关闭面板">×</button></div></div><div class="xc-history-content"><div class="xc-loading"><div class="xc-spinner"></div><div>正在加载历史记录...</div></div></div><div class="xc-history-footer"><button class="xc-page-btn xc-prev-btn" disabled><span>◀</span></button><div class="xc-page-info"><span class="xc-page-text">第 <strong>1</strong> 页</span></div><button class="xc-page-btn xc-next-btn" disabled><span>▶</span></button><div class="xc-footer-meta"><span class="xc-record-count">共 0 条</span><span class="xc-update-time">--</span></div></div>`;

    // 创建设置模态框
    const settingsModal = document.createElement('div');
    settingsModal.id = 'xuecheng-settings-modal';
    settingsModal.className = 'xc-settings-modal';
    settingsModal.innerHTML = `<div class="xc-settings-overlay"></div><div class="xc-settings-panel"><div class="xc-settings-header"><h3>⚙️ 面板设置</h3><button class="xc-settings-close">×</button></div><div class="xc-settings-body"><div class="xc-settings-group"><label class="xc-settings-label">启动时默认状态:</label><div class="xc-settings-options"><label class="xc-radio-wrapper"><input type="radio" name="defaultState" value="expanded" class="xc-radio"> <span>展开面板</span></label><label class="xc-radio-wrapper"><input type="radio" name="defaultState" value="collapsed" class="xc-radio"> <span>折叠面板</span></label></div><div class="xc-settings-hint">💡 选择启动时面板的默认状态</div></div></div><div class="xc-settings-footer"><button class="xc-settings-save-btn">保存</button><button class="xc-settings-cancel-btn">取消</button></div></div>`;

    const style = document.createElement('style');
    style.textContent = `#xuecheng-history-panel{position:fixed;right:20px;top:80px;width:520px;max-height:650px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(14,165,233,.15),0 2px 8px rgba(0,0,0,.08);z-index:10000;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif;overflow:hidden;transition:all .3s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;border:1px solid rgba(14,165,233,.1)}#xuecheng-history-panel.collapsed .xc-history-content,#xuecheng-history-panel.collapsed .xc-history-footer{display:none}#xuecheng-history-panel.collapsed{max-height:42px}#xuecheng-history-panel.loading .xc-history-content{opacity:.5}.xc-history-header{background:linear-gradient(135deg,#0EA5E9 0%,#38BDF8 100%);color:#fff;padding:6px 12px;display:flex;justify-content:space-between;align-items:center;cursor:move;user-select:none;border-radius:12px 12px 0 0;height:auto;white-space:nowrap;overflow-x:auto}.xc-header-left{display:flex;align-items:center;gap:8px;flex:1;min-width:0}.xc-header-right{display:flex;align-items:center;gap:4px;flex-shrink:0}.xc-tab-switch{display:flex;gap:2px;background:rgba(255,255,255,.15);padding:3px;border-radius:6px;flex-shrink:0}.xc-tab-btn{background:transparent;border:none;color:rgba(255,255,255,.7);padding:4px 10px;border-radius:5px;cursor:pointer;font-size:11px;font-weight:500;transition:all .2s;white-space:nowrap;display:flex;align-items:center;gap:3px;line-height:1}.xc-tab-btn:hover{background:rgba(255,255,255,.15);color:rgba(255,255,255,.9)}.xc-tab-btn.active{background:rgba(255,255,255,.3);color:#fff;font-weight:600}.xc-tab-icon{font-size:13px}.xc-tab-text{font-size:11px}.xc-divider{width:1px;height:16px;background:rgba(255,255,255,.2);margin:0 2px;flex-shrink:0}.xc-refresh-btn,.xc-settings-btn,.xc-toggle-btn,.xc-close-btn{background:rgba(255,255,255,.15);border:none;color:#fff;min-height:28px;padding:4px 9px;border-radius:5px;cursor:pointer;font-size:12px;line-height:1;transition:all .2s;display:flex;align-items:center;gap:3px;white-space:nowrap;flex-shrink:0}.xc-refresh-btn:hover,.xc-settings-btn:hover,.xc-toggle-btn:hover,.xc-close-btn:hover{background:rgba(255,255,255,.25);transform:scale(1.02)}.xc-refresh-btn:active,.xc-settings-btn:active,.xc-toggle-btn:active,.xc-close-btn:active{transform:scale(.95)}.xc-settings-btn{background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.35));border:1px solid rgba(255,255,255,.3);min-width:auto}.xc-settings-btn:hover{background:linear-gradient(135deg,rgba(255,255,255,.35),rgba(255,255,255,.45));box-shadow:0 2px 8px rgba(14,165,233,.2);transform:scale(1.05)}.xc-settings-btn:active{transform:scale(.95)}.xc-toggle-btn{min-width:auto}.xc-close-btn{padding:4px 8px}.xc-btn-icon{font-size:13px}.xc-btn-text{font-size:12px;font-weight:500}.xc-history-content{flex:1;overflow-y:auto;padding:10px;background:#F8FAFC;min-height:200px;max-height:500px}.xc-history-content::-webkit-scrollbar{width:6px}.xc-history-content::-webkit-scrollbar-track{background:transparent}.xc-history-content::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px;transition:background .2s}.xc-history-content::-webkit-scrollbar-thumb:hover{background:#94A3B8}.xc-loading{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:60px 20px;color:#94A3B8;font-size:13px}.xc-spinner{width:36px;height:36px;border:3px solid #E0F2FE;border-top:3px solid #0EA5E9;border-radius:50%;animation:xc-spin .8s linear infinite;margin-bottom:16px}@keyframes xc-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}.xc-history-item{padding:10px 12px;margin-bottom:6px;background:#fff;border-radius:8px;cursor:pointer;transition:all .2s ease;border:1px solid #E2E8F0;position:relative;animation:xc-fade-in .3s ease}@keyframes xc-fade-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}.xc-history-item:hover{border-color:#0EA5E9;box-shadow:0 4px 12px rgba(14,165,233,.12);transform:translateY(-2px)}.xc-history-item.current{background:linear-gradient(135deg,#E0F2FE 0%,#BAE6FD 100%);border-color:#0EA5E9}.xc-history-item.edit-mode{border-left:3px solid #10B981}.xc-history-item.comment-mode{border-left:3px solid #F59E0B}.xc-history-item.mentioned-mode{border-left:3px solid #EF4444}.xc-item-row{display:flex;align-items:center;gap:10px}.xc-item-icon{width:20px;height:20px;flex-shrink:0;object-fit:contain}.xc-item-main{flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:12px}.xc-item-title{font-size:13px;color:#1E293B;font-weight:500;line-height:1.4;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.xc-item-meta{font-size:10px;color:#94A3B8;display:flex;align-items:center;gap:8px;flex-shrink:0;white-space:nowrap}.xc-item-creator{max-width:80px;overflow:hidden;text-overflow:ellipsis}.xc-item-time{color:#CBD5E1}.xc-history-footer{padding:10px 14px;background:#fff;border-top:1px solid #E2E8F0;display:flex;align-items:center;gap:10px;font-size:11px;border-radius:0 0 12px 12px}.xc-page-btn{width:32px;height:32px;background:linear-gradient(135deg,#0EA5E9 0%,#38BDF8 100%);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;transition:all .2s;display:flex;align-items:center;justify-content:center;flex-shrink:0}.xc-page-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 4px 12px rgba(14,165,233,.3)}.xc-page-btn:active:not(:disabled){transform:scale(.95)}.xc-page-btn:disabled{background:#E2E8F0;color:#94A3B8;cursor:not-allowed;opacity:.6}.xc-page-info{flex:1;text-align:center;color:#64748B;font-size:12px}.xc-page-text strong{color:#0EA5E9;font-weight:600}.xc-footer-meta{display:flex;align-items:center;gap:8px;color:#94A3B8;font-size:10px;flex-shrink:0}.xc-record-count{color:#0EA5E9;font-weight:600}.xc-update-time{color:#CBD5E1}.xc-empty{text-align:center;padding:60px 20px;color:#94A3B8}.xc-empty-icon{font-size:64px;margin-bottom:16px;opacity:.5}.xc-empty-text{font-size:14px;margin-bottom:8px;color:#64748B}.xc-empty-hint{font-size:12px;color:#CBD5E1}.xc-error{text-align:center;padding:40px 20px;color:#EF4444}.xc-error-icon{font-size:48px;margin-bottom:12px}.xc-error-text{font-size:13px;margin-bottom:12px;line-height:1.5;color:#64748B}.xc-retry-btn{background:#0EA5E9;color:#fff;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:12px;transition:all .2s}.xc-retry-btn:hover{background:#0284C7;transform:translateY(-1px)}.xc-settings-modal{display:none;position:fixed;top:0;left:0;width:100%;height:100%;z-index:10001}.xc-settings-modal.active{display:flex;align-items:center;justify-content:center}.xc-settings-overlay{position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.4);animation:xc-fade-in .2s ease}.xc-settings-panel{position:relative;background:#fff;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,.2);width:90%;max-width:420px;animation:xc-slide-up .3s cubic-bezier(.34,.69,.75,1.53)}.xc-settings-header{padding:20px;border-bottom:1px solid #E2E8F0;display:flex;justify-content:space-between;align-items:center}.xc-settings-header h3{margin:0;font-size:16px;color:#1E293B;font-weight:600}.xc-settings-close{background:none;border:none;color:#94A3B8;font-size:24px;cursor:pointer;transition:color .2s;padding:0;width:24px;height:24px}.xc-settings-close:hover{color:#0EA5E9}.xc-settings-body{padding:20px}.xc-settings-group{margin-bottom:20px}.xc-settings-label{display:block;font-size:14px;font-weight:600;color:#1E293B;margin-bottom:12px}.xc-settings-options{display:flex;flex-direction:column;gap:10px}.xc-radio-wrapper{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:#475569;transition:all .2s}.xc-radio-wrapper:hover{color:#0EA5E9}.xc-radio-wrapper input[type="radio"]{cursor:pointer;width:16px;height:16px;accent-color:#0EA5E9}.xc-settings-hint{font-size:12px;color:#94A3B8;margin-top:8px;line-height:1.5}.xc-settings-footer{padding:16px 20px;border-top:1px solid #E2E8F0;display:flex;gap:10px;justify-content:flex-end}.xc-settings-save-btn,.xc-settings-cancel-btn{border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:500;transition:all .2s}.xc-settings-save-btn{background:linear-gradient(135deg,#0EA5E9 0%,#38BDF8 100%);color:#fff}.xc-settings-save-btn:hover{box-shadow:0 4px 12px rgba(14,165,233,.3);transform:translateY(-1px)}.xc-settings-save-btn:active{transform:scale(.95)}.xc-settings-cancel-btn{background:#E2E8F0;color:#64748B}.xc-settings-cancel-btn:hover{background:#CBD5E1}.xc-settings-cancel-btn:active{transform:scale(.95)}@keyframes xc-slide-up{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}@media (max-width:768px){.xc-tab-text{display:none}.xc-btn-text{display:none}.xc-settings-btn .xc-btn-text,.xc-toggle-btn .xc-btn-text,.xc-refresh-btn .xc-btn-text{display:block}.xc-header-left{min-width:0}}@media (max-width:480px){.xc-tab-switch{padding:2px}.xc-tab-btn{padding:4px 8px}.xc-settings-btn .xc-btn-text,.xc-toggle-btn .xc-btn-text,.xc-refresh-btn .xc-btn-text{display:none}.xc-settings-btn,.xc-toggle-btn{min-width:36px}}`;

    document.head.appendChild(style);
    document.body.appendChild(panel);
    document.body.appendChild(settingsModal);
    return panel;
  }

  async function fetchHistory(pageNo=1){const mode=appState.currentMode;const state=appState[mode];if(state.pageCache.has(pageNo)){console.log(`✅ [${mode}] 缓存第${pageNo}页`);return state.pageCache.get(pageNo)}try{state.isLoading=true;const config=API_CONFIG[mode];const url=new URL(config.url);const params=config.getParams(pageNo);Object.entries(params).forEach(([k,v])=>url.searchParams.append(k,v));console.log(`🔍 [${mode}] ${url}`);const resp=await fetch(url.toString(),{method:'GET',headers:{'accept':'*/*','cache-control':'no-cache','x-requested-with':'XMLHttpRequest'},credentials:'include'});if(!resp.ok)throw new Error(`HTTP ${resp.status}`);const result=await resp.json();console.log(`📦 [${mode}]`,result);let pageData;if(result.status===0&&result.data&&Array.isArray(result.data.units)){pageData={success:true,records:result.data.units,total:result.data.total||0,hasNext:result.data.hasNext||false,pageNo}}else{throw new Error('数据格式异常')}state.pageCache.set(pageNo,pageData);if(state.pageCache.size>10){const k=state.pageCache.keys().next().value;state.pageCache.delete(k)}state.total=pageData.total;state.hasNext=pageData.hasNext;if(mode==='browse'||mode==='edit'){state.totalPages=Math.ceil(pageData.total/state.pageSize)}else{state.totalPages=0}return pageData}catch(e){console.error(`❌ [${mode}]`,e);return{success:false,error:e.message,records:[]}}finally{state.isLoading=false}}

  function formatTime(t){if(!t)return'--';const d=new Date(t);const n=new Date();const diff=n-d;if(diff<60000)return'刚刚';if(diff<3600000)return`${Math.floor(diff/60000)}分钟前`;if(d.toDateString()===n.toDateString())return d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});const y=new Date(n);y.setDate(y.getDate()-1);if(d.toDateString()===y.toDateString())return'昨天';return d.toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit'})}

  function updatePaginationUI(p){const s=getCurrentState();const m=appState.currentMode;const prev=p.querySelector('.xc-prev-btn');const next=p.querySelector('.xc-next-btn');const txt=p.querySelector('.xc-page-text');prev.disabled=s.currentPage===1||s.isLoading;next.disabled=!s.hasNext||s.isLoading;if(m==='comment'||m==='mentioned'){txt.innerHTML=`第 <strong>${s.currentPage}</strong> 页`}else{txt.innerHTML=`第 <strong>${s.currentPage}</strong> 页 / 共 <strong>${s.totalPages||'?'}</strong> 页`}s.isLoading?p.classList.add('loading'):p.classList.remove('loading')}

  function renderHistory(p,r){const c=p.querySelector('.xc-history-content');const f=p.querySelector('.xc-history-footer');const curl=window.location.href;const cpid=curl.match(/page\/(\d+)/)?.[1]||curl.match(/collabpage\/(\d+)/)?.[1];const mode=appState.currentMode;if(!r.success){c.innerHTML=`<div class="xc-error"><div class="xc-error-icon">⚠️</div><div class="xc-error-text">${r.error||'加载失败'}</div><button class="xc-retry-btn">重试</button></div>`;f.querySelector('.xc-record-count').textContent='加载失败';f.querySelector('.xc-update-time').textContent='--';c.querySelector('.xc-retry-btn').addEventListener('click',()=>goToPage(p,getCurrentState().currentPage));updatePaginationUI(p);return}const recs=r.records;if(recs.length===0){const et={browse:['暂无浏览记录','浏览文档后会在这里显示'],edit:['暂无编辑记录','编辑文档后会在这里显示'],comment:['暂无评论记录','评论文档后会在这里显示'],mentioned:['暂无@记录','被@后会在这里显示']};const[t1,t2]=et[mode];c.innerHTML=`<div class="xc-empty"><div class="xc-empty-icon">📭</div><div class="xc-empty-text">${t1}</div><div class="xc-empty-hint">${t2}</div></div>`;f.querySelector('.xc-record-count').textContent='共 0 条';f.querySelector('.xc-update-time').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});updatePaginationUI(p);return}const html=recs.map(i=>{let pid,title,creator,time,url;if(mode==='browse'){pid=i.pageId;title=i.title||'未命名文档';creator=i.creator||'未知';time=formatTime(i.operatorTime);url=`https://km.sankuai.com/collabpage/${pid}`}else if(mode==='edit'){pid=i.pageId;title=i.title||'未命名文档';creator=i.modifier||i.operator||'未知';time=formatTime(i.modifyTime||i.operatorTime);url=`https://km.sankuai.com/collabpage/${pid}`}else if(mode==='comment'){pid=i.contentId||i.pageId;title=i.title||'未命名文档';creator='我';time=formatTime(i.recentCommentTime||i.operatorTime);url=`https://km.sankuai.com/collabpage/${pid}`}else if(mode==='mentioned'){pid=i.contentId||i.pageId;title=i.title||'未命名文档';creator=i.operator||i.creator||'未知';time=formatTime(i.recentMentionTime||i.operatorTime);url=`https://km.sankuai.com/collabpage/${pid}`}const isCur=cpid&&String(pid)===String(cpid);const mc=mode==='edit'?'edit-mode':mode==='comment'?'comment-mode':mode==='mentioned'?'mentioned-mode':'';return`<div class="xc-history-item ${isCur?'current':''} ${mc}" data-url="${url}"><div class="xc-item-row"><img class="xc-item-icon" src="${XUECHENG_LOGO}" alt="学城"><div class="xc-item-main"><div class="xc-item-title" title="${title}">${title}</div><div class="xc-item-meta"><span class="xc-item-creator" title="${creator}">${creator}</span><span class="xc-item-time">${time}</span></div></div></div></div>`}).join('');c.innerHTML=html;c.scrollTop=0;const tt=r.total>1000?'1000+':r.total;f.querySelector('.xc-record-count').textContent=`共 ${tt} 条`;f.querySelector('.xc-update-time').textContent=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});c.querySelectorAll('.xc-history-item').forEach(itm=>{itm.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();const u=this.getAttribute('data-url');if(u)window.open(u,'_blank')})});updatePaginationUI(p)}

  async function goToPage(p,pn){const s=getCurrentState();if(s.isLoading)return;if(pn<1)return;s.currentPage=pn;const c=p.querySelector('.xc-history-content');c.style.opacity='0.5';updatePaginationUI(p);const r=await fetchHistory(pn);c.style.opacity='0';setTimeout(()=>{renderHistory(p,r);c.style.transition='opacity 0.3s ease';c.style.opacity='1'},150)}

  function switchMode(p,m){if(appState.currentMode===m)return;console.log(`🔄 ${appState.currentMode} -> ${m}`);appState.currentMode=m;p.querySelectorAll('.xc-tab-btn').forEach(b=>{b.classList.toggle('active',b.getAttribute('data-mode')===m)});goToPage(p,1)}

  function makeDraggable(p){const h=p.querySelector('.xc-history-header');let drag=false;let ix,iy;h.addEventListener('mousedown',function(e){if(e.target.closest('.xc-refresh-btn, .xc-settings-btn, .xc-toggle-btn, .xc-close-btn, .xc-tab-btn, .xc-divider'))return;drag=true;ix=e.clientX-p.offsetLeft;iy=e.clientY-p.offsetTop;p.style.transition='none';h.style.cursor='grabbing'});document.addEventListener('mousemove',function(e){if(!drag)return;e.preventDefault();let cx=e.clientX-ix;let cy=e.clientY-iy;const mx=window.innerWidth-p.offsetWidth;const my=window.innerHeight-p.offsetHeight;cx=Math.max(0,Math.min(cx,mx));cy=Math.max(0,Math.min(cy,my));p.style.left=cx+'px';p.style.top=cy+'px';p.style.right='auto'});document.addEventListener('mouseup',function(){if(drag){drag=false;p.style.transition='all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';h.style.cursor='move'}})}

  function openSettingsModal(p) {
    const modal = document.getElementById('xuecheng-settings-modal');
    const settings = getSettings();
    
    // 设置当前选中的单选按钮
    const radios = modal.querySelectorAll('input[name="defaultState"]');
    radios.forEach(radio => {
      radio.checked = radio.value === settings.defaultState;
    });
    
    modal.classList.add('active');
  }

  function closeSettingsModal() {
    const modal = document.getElementById('xuecheng-settings-modal');
    modal.classList.remove('active');
  }

  function saveSettingsModal() {
    const modal = document.getElementById('xuecheng-settings-modal');
    const selectedRadio = modal.querySelector('input[name="defaultState"]:checked');
    
    if (selectedRadio) {
      const settings = { defaultState: selectedRadio.value };
      saveSettings(settings);
      console.log('✅ 设置已更新:', settings);
      closeSettingsModal();
    }
  }

  // 更新折叠按钮的文字和图标
  function updateToggleButtonState(p) {
    const toggleBtn = p.querySelector('.xc-toggle-btn');
    const iconSpan = toggleBtn.querySelector('.xc-btn-icon');
    const textSpan = toggleBtn.querySelector('.xc-btn-text');
    const isCollapsed = p.classList.contains('collapsed');
    
    if (isCollapsed) {
      iconSpan.textContent = '+';
      textSpan.textContent = '展开';
      toggleBtn.title = '展开面板（显示完整内容）';
    } else {
      iconSpan.textContent = '−';
      textSpan.textContent = '收起';
      toggleBtn.title = '收起面板（只显示标题栏）';
    }
  }

  async function initPanel(){
    const p = createHistoryPanel();
    const settings = getSettings();
    
    // 根据设置应用初始状态
    if (settings.defaultState === 'collapsed') {
      p.classList.add('collapsed');
      updateToggleButtonState(p);
    }
    
    const r = await fetchHistory(1);
    renderHistory(p, r);
    makeDraggable(p);
    
    // 标签页切换
    p.querySelectorAll('.xc-tab-btn').forEach(b=>{
      b.addEventListener('click',function(){switchMode(p,this.getAttribute('data-mode'))})
    });
    
    // 刷新按钮
    p.querySelector('.xc-refresh-btn').addEventListener('click',async function(){
      this.style.transform='rotate(360deg)';
      getCurrentState().pageCache.delete(getCurrentState().currentPage);
      await goToPage(p,getCurrentState().currentPage);
      setTimeout(()=>{this.style.transform=''},600)
    });
    
    // 折叠/展开按钮
    p.querySelector('.xc-toggle-btn').addEventListener('click',function(){
      p.classList.toggle('collapsed');
      updateToggleButtonState(p);
    });
    
    // 关闭按钮
    p.querySelector('.xc-close-btn').addEventListener('click',function(){
      p.style.opacity='0';
      p.style.transform='translateX(100px)';
      setTimeout(()=>p.remove(),300)
    });
    
    // 设置按钮
    p.querySelector('.xc-settings-btn').addEventListener('click', function() {
      openSettingsModal(p);
    });
    
    // 设置模态框事件
    const modal = document.getElementById('xuecheng-settings-modal');
    modal.querySelector('.xc-settings-close').addEventListener('click', closeSettingsModal);
    modal.querySelector('.xc-settings-cancel-btn').addEventListener('click', closeSettingsModal);
    modal.querySelector('.xc-settings-save-btn').addEventListener('click', saveSettingsModal);
    modal.querySelector('.xc-settings-overlay').addEventListener('click', closeSettingsModal);
    
    // 分页按钮
    p.querySelector('.xc-prev-btn').addEventListener('click',function(){
      if(getCurrentState().currentPage>1)goToPage(p,getCurrentState().currentPage-1)
    });
    p.querySelector('.xc-next-btn').addEventListener('click',function(){
      if(getCurrentState().hasNext)goToPage(p,getCurrentState().currentPage+1)
    });
    
    // 键盘快捷键
    document.addEventListener('keydown',function(e){
      if(p.classList.contains('collapsed'))return;
      if(e.key==='PageUp'&&getCurrentState().currentPage>1){
        e.preventDefault();
        goToPage(p,getCurrentState().currentPage-1)
      }else if(e.key==='PageDown'&&getCurrentState().hasNext){
        e.preventDefault();
        goToPage(p,getCurrentState().currentPage+1)
      }
    });
    
    console.log('✅ 学城历史记录面板 v6.7 初始化完成')
  }

  initPanel();
})();