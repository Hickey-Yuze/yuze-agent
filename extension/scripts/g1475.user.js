(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 安居客智能筛选技炉 V2 — 基于真实DOM结构完整重写
     * 
     * 功能：
     *   Phase 1: 筛选弹窗 — 用户填写区域/价格/面积/房型/标签
     *   Phase 2: 结果页整理器 — 用正确选择器(.property)抓取全部11个字段，渲染为网页overlay
     *   Phase 3: 交互功能 — ⭐收藏(星标) / 🗑️删除 / 🖍️高亮 / 📝批注 / 📤导出HTML
     *
     * DOM选择器来源：2026年安居客深圳站实际页面探针分析
     */
    
    async function run(args = {}) {
      // ==================== 配置 ====================
      const CONFIG = {
        city: args.city || 'shenzhen',
        mode: args.mode || 'auto', // 'filter' | 'result' | 'auto'
        title: '安居客智能筛选',
        regions: [
          { value: '', label: '不限' },
          { value: 'nanshan', label: '南山' }, { value: 'baoan', label: '宝安' },
          { value: 'longhua', label: '龙华' }, { value: 'futian', label: '福田' },
          { value: 'longgang', label: '龙岗' }, { value: 'luohu', label: '罗湖' },
          { value: 'yantian', label: '盐田' }, { value: 'pingshan', label: '坪山' },
          { value: 'guangming', label: '光明' }, { value: 'meilin', label: '梅林' },
          { value: 'dapeng', label: '大鹏新区' }
        ],
        priceRanges: [
          { value: '', label: '不限' }, { value: 'm0-100', label: '100万以下' },
          { value: 'm13505', label: '100-150万' }, { value: 'm150-200', label: '150-200万' },
          { value: 'm200-250', label: '200-250万' }, { value: 'm250-300', label: '250-300万' },
          { value: 'm300-400', label: '300-400万' }, { value: 'm400-500', label: '400-500万' },
          { value: 'm500-800', label: '500-800万' }, { value: 'm800-1200', label: '800-1200万' },
          { value: 'm1200-1900', label: '1200-1900万' }, { value: 'm1900-', label: '1900万以上' }
        ],
        areaRanges: [
          { value: '', label: '不限' }, { value: 'a0-50', label: '50㎡以下' },
          { value: 'a50-60', label: '50-60㎡' }, { value: 'a60-80', label: '60-80㎡' },
          { value: 'a80-90', label: '80-90㎡' }, { value: 'a90-110', label: '90-110㎡' },
          { value: 'a110-130', label: '110-130㎡' }, { value: 'a130-150', label: '130-150㎡' },
          { value: 'a150-200', label: '150-200㎡' }, { value: 'a200-', label: '200㎡以上' }
        ],
        roomTypes: [
          { value: '', label: '不限' }, { value: 'l1', label: '一室' },
          { value: 'l2', label: '二室' }, { value: 'l3', label: '三室' },
          { value: 'l4', label: '四室' }, { value: 'l5', label: '五室及以上' }
        ],
        tagOptions: ['近地铁','满五年','满二','随时看房','精装修','南北通透','电梯房','学区房','低总价','急售']
      };
    
      // ==================== localStorage 持久化 ====================
      const STORAGE_KEY = 'ajk_smart_filter_data_v2';
      function loadState() {
        try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : { annotations:{}, starred:{}, deleted:{} }; }
        catch(e) { return { annotations:{}, starred:{}, deleted:{} }; }
      }
      function saveState(s) { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); }
    
      let appState = loadState();
    
      // ==================== 完整样式表 ====================
      const CSS = `
        /* ====== 弹窗基础 ====== */
        .ajk-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:999998;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;animation:ajkFi .3s ease-out}
        @keyframes ajkFi{from{opacity:0}to{opacity:1}}
        @keyframes ajkSu{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
        .ajk-dlg{background:#fff;border-radius:16px;width:540px;max-width:95vw;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:ajkSu .4s ease-out}
        @media(max-width:600px){.ajk-dlg{width:96vw;border-radius:12px}}
        .ajk-dlg-hd{padding:22px 26px 14px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center}
        .ajk-dlg-tit{font-size:19px;font-weight:700;color:#1a1a1a;margin:0}
        .ajk-close{width:32px;height:32px;border:none;background:#f5f5f5;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:17px;color:#666;transition:all .2s}
        .ajk-close:hover{background:#e0e0e0;color:#333}
        .ajk-dlg-bd{padding:18px 26px 24px}
        .ajk-fg{margin-bottom:16px}
        .ajk-lbl{display:block;font-size:13px;font-weight:600;color:#333;margin-bottom:6px}
        .ajk-lbl .req{color:#ff4d4f;margin-left:2px}
        .ajk-sel,.ajk-inp{width:100%;height:38px;border:1px solid #d9d9d9;border-radius:8px;padding:0 11px;font-size:13px;color:#333;outline:none;transition:all .2s;box-sizing:border-box;background:#fff}
        .ajk-sel:focus,.ajk-inp:focus{border-color:#1890ff;box-shadow:0 0 0 3px rgba(24,144,255,.1)}
        .ajk-tags{display:flex;flex-wrap:wrap;gap:7px;padding:3px 0}
        .ajk-tag{display:inline-flex;align-items:center;padding:5px 12px;border:1px solid #d9d9d9;border-radius:18px;font-size:12px;color:#555;cursor:pointer;user-select:none;transition:all .2s;background:#fafafa}
        .ajk-tag:hover{border-color:#1890ff;color:#1890ff}
        .ajk-tag.active{background:linear-gradient(135deg,#1890ff,#096dd9);color:#fff;border-color:transparent}
        .ajk-tag.active::before{content:'✓ ';font-weight:bold}
        .ajk-custom-row{display:flex;gap:7px;margin-top:8px}
        .ajk-custom-inp{flex:1;height:34px;border:1px dashed #d9d9d9;border-radius:17px;padding:0 12px;font-size:12px;outline:none;transition:all .2s}
        .ajk-custom-inp:focus{border-color:#1890ff;border-style:solid}
        .ajk-add-btn{height:34px;padding:0 14px;border:1px dashed #d9d9d9;border-radius:17px;background:#fff;cursor:pointer;font-size:12px;color:#999;transition:all .2s}
        .ajk-add-btn:hover{border-color:#1890ff;color:#1890ff}
        .ajk-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
        .ajk-chip{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;background:#fff7e6;border:1px solid #ffd591;border-radius:13px;font-size:11px;color:#ad6800}
        .ajk-rm{cursor:pointer;font-weight:bold;color:#ad6800;opacity:.7}.ajk-rm:hover{opacity:1}
        .ajk-btns{display:flex;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid #f0f0f0}
        .ajk-btn{flex:1;height:42px;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;transition:all .25s;letter-spacing:.4px}
        .ajk-btn-cancel{background:#f5f5f5;color:#666}.ajk-btn-cancel:hover{background:#e8e8e8}
        .ajk-btn-submit{background:linear-gradient(135deg,#1890ff,#096dd9);color:#fff;box-shadow:0 4px 15px rgba(24,144,255,.35)}
        .ajk-btn-submit:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(24,144,255,.45)}
        .ajk-spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-radius:50%;border-top-color:#fff;animation:ajkSp .8s linear infinite;margin-right:6px;vertical-align:middle}
        @keyframes ajkSp{to{transform:rotate(360deg)}}
    
        /* ====== 结果面板 ====== */
        .ajk-panel{position:fixed;top:0;left:0;width:100%;height:100%;z-index:999997;background:#f5f6fa;display:flex;flex-direction:column;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
        .ajk-tb{height:56px;background:linear-gradient(135deg,#1a73e8,#0d47a1);color:#fff;display:flex;align-items:center;padding:0 20px;gap:12px;flex-shrink:0;box-shadow:0 2px 12px rgba(0,0,0,.15)}
        .ajk-tb-tit{font-size:16px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ajk-tb-sub{font-size:11px;opacity:.75;margin-left:8px}
        .ajk-tb-acts{margin-left:auto;display:flex;gap:8px;align-items:center}
        .ajk-tb-bt{padding:6px 14px;border:1px solid rgba(255,255,255,.35);border-radius:8px;background:rgba(255,255,255,.1);color:#fff;cursor:pointer;font-size:12px;transition:all .2s;white-space:nowrap}
        .ajk-tb-bt:hover{background:rgba(255,255,255,.25)}
        .ajk-tb-bt.danger{border-color:rgba(255,77,77,.5);background:rgba(255,77,77,.15)}
        .ajk-tb-bt.success{border-color:rgba(76,175,80,.5);background:rgba(76,175,80,.2)}
        .ajk-body{flex:1;overflow-y:auto;padding:16px 20px}
    
        /* ====== 房源卡片 —— 信息完整展示 ====== */
        .ajk-card{background:#fff;border-radius:14px;padding:20px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:5px solid transparent;transition:all .25s;position:relative}
        .ajk-card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1);transform:translateY(-2px)}
        .ajk-card.starred{border-left-color:#faad14}
        .ajk-card.highlighted{border-left-color:#52c41a;background:linear-gradient(135deg,#f6ffed,#fcffe6)}
        .ajk-card.deleted{opacity:.3;pointer-events:none;border-left-color:#ff4d4f}
    
        /* 卡片头部：标题+价格 */
        .ajk-card-hd{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
        .ajk-card-title{font-size:17px;font-weight:700;color:#1a1a1a;line-height:1.45;flex:1}
        .ajk-card-title a{color:inherit;text-decoration:none;display:block}
        .ajk-card-title a:hover{text-decoration:underline;color:#1890ff}
        .ajk-card-price-area{text-align:right;flex-shrink:0}
        .ajk-card-price{font-size:24px;font-weight:900;color:#ff4d4f;line-height:1.1}
        .ajk-card-uprice{font-size:12px;color:#999;margin-top:2px}
    
        /* 核心信息网格 */
        .ajk-info-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px 16px;margin-bottom:14px}
        .ajk-info-item{display:flex;align-items:center;gap:6px;font-size:13px;color:#555;padding:5px 8px;background:#fafafa;border-radius:8px}
        .ajk-info-icon{font-size:14px;flex-shrink:0}
        .ajk-info-val{font-weight:500;color:#333}
    
        /* 小区+地址 */
        .ajk-loc{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;padding:10px 12px;background:#f0f5ff;border-radius:10px;border:1px solid #d6e4ff}
        .ajk-loc-icon{font-size:16px;flex-shrink:0;margin-top:1px}
        .ajk-loc-info{flex:1;min-width:0}
        .ajk-loc-comm{font-size:14px;font-weight:700;color:#1a73e8;margin-bottom:3px}
        .ajk-loc-addr{font-size:12px;color:#888;line-height:1.4}
    
        /* 标签 */
        .ajk-tags-row{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
        .ajk-badge{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#e6f7ff;color:#1890ff;border:1px solid #bae7ff}
        .ajk-badge.green{background:#f6ffed;color:#52c41a;border-color:#b7eb8f}
        .ajk-badge.orange{background:#fff7e6;color:#fa8c16;border-color:#ffd591}
        .ajk-badge.red{background:#fff2f0;color:#ff4d4f;border-color:#ffccc7}
        .ajk-badge.gray{background:#f5f5f5;color:#888;border-color:#e8e8e8}
    
        /* 已有批注 */
        .ajk-note-show{padding:10px 14px;background:#e6f7ff;border-radius:10px;font-size:13px;color:#0050b3;line-height:1.7;margin-bottom:12px;border:1px solid #bae7ff;word-break:break-word}
    
        /* 操作按钮栏 */
        .ajk-ops{display:flex;gap:6px;padding-top:14px;border-top:1px solid #f0f0f0;flex-wrap:wrap}
        .ajk-op{padding:6px 14px;border:1px solid #d9d9d9;border-radius:18px;background:#fff;cursor:pointer;font-size:12px;color:#555;transition:all .2s;font-weight:500}
        .ajk-op:hover{border-color:#1890ff;color:#1890ff;background:#e6f7ff}
        .ajk-op.star-on{border-color:#faad14;color:#ad6800;background:#fffbe6}
        .ajk-op.del-on{border-color:#ff4d4f;color:#ff4d4f;background:#fff2f0}
        .ajk-op-link{text-decoration:none}
    
        /* 批注编辑区 */
        .ajk-note-edit{display:none;margin-top:12px;padding:14px;background:#fafafa;border-radius:10px;border:1px solid #e8e8e8;animation:ajkFi .2s ease-out}
        .ajk-note-edit.show{display:block}
        .ajk-note-lbl{font-size:12px;font-weight:700;color:#666;margin-bottom:6px}
        .ajk-note-ta{width:100%;min-height:60px;border:1px solid #d9d9d9;border-radius:8px;padding:10px;font-size:13px;resize:vertical;outline:none;box-sizing:border-box;font-family:inherit;line-height:1.6}
        .ajk-note-ta:focus{border-color:#1890ff;box-shadow:0 0 0 3px rgba(24,144,255,.1)}
        .ajk-note-sv{padding:5px 18px;border:none;border-radius:8px;background:#1890ff;color:#fff;cursor:pointer;font-size:12px;font-weight:600}
        .ajk-note-ok{font-size:11px;color:#52c41a;margin-left:8px;display:none}
        .ajk-note-ok.show{display:inline}
    
        /* 统计栏 */
        .ajk-stats{display:flex;gap:14px;padding:14px 18px;background:#fff;border-radius:12px;margin-bottom:18px;box-shadow:0 1px 6px rgba(0,0,0,.05);flex-wrap:wrap}
        .ajk-stat{text-align:center;min-width:70px}
        .ajk-stat-n{font-size:24px;font-weight:900;color:#1890ff}
        .ajk-stat-l{font-size:11px;color:#888;margin-top:3px}
    
        /* 空状态 */
        .ajk-empty{text-align:center;padding:60px 20px;color:#bbb}
        .ajk-empty-ic{font-size:52px;margin-bottom:14px}
        .ajk-empty-txt{font-size:15px;color:#aaa;line-height:1.6}
    
        /* 关闭按钮 */
        .ajk-exit{position:fixed;top:12px;right:12px;z-index:999998;width:38px;height:38px;border:none;background:rgba(0,0,0,.45);border-radius:50%;color:#fff;font-size:19px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s}
        .ajk-exit:hover{background:rgba(0,0,0,.65);transform:rotate(90deg)}
    
        /* 筛选条件信息条 */
        .ajk-filter-bar{padding:12px 16px;background:linear-gradient(135deg,#e6f7ff,#f0f5ff);border-radius:10px;margin-bottom:16px;font-size:13px;color:#444;border:1px solid #bae7ff;line-height:1.8}
      `;
    
      // ==================== 工具函数 ====================
      function buildURL(f){
        let u=`https://${CONFIG.city}.com/sale/`;
        if(f.region)u+=f.region+'/';else u+='/';
        let p=[];if(f.price)p.push(f.price);if(f.area)p.push(f.area);if(f.roomType)p.push(f.roomType);
        if(p.length>0)u+=p.join('/')+'/';
        return u;
      }
      function getFilterDesc(f){
        const r=CONFIG.regions.find(x=>x.value===f.region)?.label||'全部';
        const pr=CONFIG.priceRanges.find(x=>x.value===f.price)?.label||'不限';
        const ar=CONFIG.areaRanges.find(x=>x.value===f.area)?.label||'不限';
        const rt=CONFIG.roomTypes.find(x=>x.value===f.roomType)?.label||'不限';
        return `<strong>📍 区域：</strong>${r}&nbsp;&nbsp;<strong>💰 价格：</strong>${pr}&nbsp;&nbsp;<strong>📐 面积：</strong>${ar}&nbsp;&nbsp;<strong>🏠 房型：</strong>${rt}${f.tags.length?'<br><strong>🏷️ 标签：</strong>'+f.tags.join('、'):''}`;
      }
    
      /**
       * ★★★ 核心：基于真实DOM结构的房源数据提取 ★★★
       * 选择器来源：安居客深圳站 2026 探针分析
       */
      function scrapeListings(){
        const cards=document.querySelectorAll('.property');
        const listings=[];
        
        cards.forEach((card,idx)=>{
          try{
            // === 基本信息 ===
            const linkEl=card.querySelector('a.property-ex');
            const href=linkEl?.href||'';
            
            // 标题
            const titleEl=card.querySelector('h3.property-content-title-name');
            const title=titleEl?.getAttribute('title')||titleEl?.textContent?.trim()||'(无标题)';
            
            // 户型：p.property-content-info-attribute 内的 span
            const attrP=card.querySelector('p.property-content-info-attribute');
            const roomSpans=attrP?attrP.querySelectorAll('span'):[];
            let rooms='';
            let ri=0;
            roomSpans.forEach(s=>{
              const t=s.textContent?.trim()||'';
              if(t.match(/^[一二三四五六七八九十\d]+$/)){rooms+=t;ri++;}
              else if(['室','厅','卫'].includes(t))rooms+=t;
            });
            
            // 详情行：面积、朝向、楼层、年份 —— 各自独立的 <p>
            const infoTexts=card.querySelectorAll('div.property-content-info > p.property-content-info-text');
            let area='',orient='',floor='',yearBuilt='';
            infoTexts.forEach(p=>{
              const t=p.textContent?.trim()||'';
              if(/㎡/.test(t))area=t.replace(/\s+/g,' ');
              else if(/^(东|南|西|北|东南|东北|西南|西北|南北|东西)$/.test(t))orient=t;
              else if(/层\(共/.test(t))floor=t.replace(/\s+/g,' ');
              else if(/年建造/.test(t))yearBuilt=t.replace(/\s+/g,' ');
            });
            
            // 小区名
            const commNameEl=card.querySelector('p.property-content-info-comm-name');
            const community=commNameEl?.textContent?.trim()||'';
            
            // 地址
            const addrEl=card.querySelector('p.property-content-info-comm-address');
            const addrParts=addrEl?Array.from(addrEl.querySelectorAll('span')).map(s=>s.textContent?.trim()).filter(Boolean):[];
            const address=addrParts.join(' ')||(addrEl?.textContent?.trim()||'');
            
            // 标签
            const tagEls=card.querySelectorAll('span.property-content-info-tag');
            const tags=Array.from(tagEls).map(s=>s.textContent?.trim()).filter(Boolean);
            
            // 价格 —— 从卡片底部查找（可能在 property-content 的最后一个子元素或兄弟节点）
            let totalPrice='',unitPrice='';
            // 方法1：找包含"万"的强文本
            const priceMatch=card.innerText?.match(/([\d.]+)\s*万/);
            if(priceMatch)totalPrice=priceMatch[1]+'万';
            // 单价
            const upriceMatch=card.innerText?.match(/([\d.]+)\s*元\/㎡/);
            if(upriceMatch)unitPrice=upriceMatch[1]+'元/㎡';
            // 方法2：尝试更精准的选择器
            const priceDiv=card.querySelector('.property-content-detail .property-content-price, .property-price, [class*="price"]');
            if(priceDiv){
              const pt=priceDiv.textContent?.match(/[\d.]+万/);
              if(pt)totalPrice=pt[0];
              const ut=priceDiv.textContent?.match(/[\d.]+元\/㎡/);
              if(ut)unitPrice=ut[0];
            }
            
            // 图片
            const imgEl=card.querySelector('img.cover, img.lazy-img');
            const image=imgEl?.src||imgEl?.dataset?.src||imgEl?.getAttribute('data-src')||'';
    
            listings.push({
              id:`ajk_${idx}_${Date.now()}`,
              title,url:href,
              price:totalPrice||'待询',
              unitPrice,
              rooms:rooms||'未知',
              area:area||'未知',
              orientation:orient||'未知',
              floor:floor||'未知',
              yearBuilt:yearBuilt||'未知',
              community,address,tags,image
            });
          }catch(err){
            console.warn('[安居客技炉] 解析第'+idx+'条房源出错:',err.message);
          }
        });
        
        return listings;
      }
    
      // ==================== Phase 1: 筛选弹窗 ====================
      function showFilter(){
        const oldOv=document.getElementById('ajkFov');if(oldOv)oldOv.remove();
        const oldSt=document.getElementById('ajkFst');if(oldSt)oldSt.remove();
        
        const st=document.createElement('style');st.id='ajkFst';st.textContent=CSS;document.head.appendChild(st);
        
        const c=document.createElement('div');
        c.innerHTML=`<div class="ajk-overlay" id="ajkFov"><div class="ajk-dlg">
          <div class="ajk-dlg-hd"><h2 class="ajk-dlg-tit">🏠 ${CONFIG.title}</h2><button class="ajk-close" id="ajkCls">✕</button></div>
          <div class="ajk-dlg-bd">
            <div class="ajk-fg"><label class="ajk-lbl">所在区域<span class="req">*</span></label><select class="ajk-sel" id="ajkR">${CONFIG.regions.map(r=>`<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
            <div class="ajk-fg"><label class="ajk-lbl">价格区间<span class="req">*</span></label><select class="ajk-sel" id="ajkP">${CONFIG.priceRanges.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}</select></div>
            <div class="ajk-fg"><label class="ajk-lbl">建筑面积</label><select class="ajk-sel" id="ajkA">${CONFIG.areaRanges.map(a=>`<option value="${a.value}">${a.label}</option>`).join('')}</select></div>
            <div class="ajk-fg"><label class="ajk-lbl">房型</label><select class="ajk-sel" id="ajkRT">${CONFIG.roomTypes.map(r=>`<option value="${r.value}">${r.label}</option>`).join('')}</select></div>
            <div class="ajk-fg"><label class="ajk-lbl">特色标签（可多选）</label><div class="ajk-tags" id="ajkTC">${CONFIG.tagOptions.map(t=>`<span class="ajk-tag" data-t="${t}">${t}</span>`).join('')}</div>
              <div class="ajk-custom-row"><input type="text" class="ajk-custom-inp" id="ajkCI" placeholder="输入自定义标签..." maxlength="20"><button class="ajk-add-btn" id="ajkCB">+ 添加</button></div>
              <div class="ajk-chips" id="ajkCL"></div></div>
            <div class="ajk-btns"><button class="ajk-btn ajk-btn-cancel" id="ajkCan">取消</button><button class="ajk-btn ajk-btn-submit" id="ajkGo">开始筛选 🔍</button></div>
          </div></div></div>`;
        document.body.appendChild(c);
    
        const ov=document.getElementById('ajkFov'),cls=document.getElementById('ajkCls'),can=document.getElementById('ajkCan'),go=document.getElementById('ajkGo');
        const tc=document.getElementById('ajkTC'),ci=document.getElementById('ajkCI'),cb=document.getElementById('ajkCB'),cl=document.getElementById('ajkCL');
        const stTags=[],cuTags=[];
        const closeF=()=>{ov.style.animation='ajkFi .2s reverse';setTimeout(()=>{ov.remove();st.remove();},200)};
        cls.onclick=closeF;can.onclick=closeF;ov.onclick=e=>{if(e.target===ov)closeF()};
        document.addEventListener('keydown',e=>{if(e.key==='Escape')closeF()},{once:true});
    
        tc.onclick=e=>{
          const t=e.target.closest('.ajk-tag');if(!t)return;
          const tg=t.dataset.t;t.classList.toggle('active');
          if(stTags.includes(tg))stTags.splice(stTags.indexOf(tg),1);else stTags.push(tg);
        };
        const addC=()=>{
          const v=ci.value.trim();if(!v)return;
          if(cuTags.includes(v)){ci.value='';return;}
          cuTags.push(v);
          const chip=document.createElement('span');chip.className='ajk-chip';chip.innerHTML=`${v} <span class="ajk-rm" data-v="${v}">×</span>`;
          cl.appendChild(chip);ci.value='';
        };
        cb.onclick=addC;ci.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();addC()}};
        cl.onclick=e=>{if(e.target.classList.contains('ajk-rm')){const v=e.target.dataset.v;cuTags.splice(cuTags.indexOf(v),1);e.target.parentElement.remove()}};
    
        go.onclick=async()=>{
          const f={region:document.getElementById('ajkR').value,price:document.getElementById('ajkP').value,area:document.getElementById('ajkA').value,roomType:document.getElementById('ajkRT').value,tags:[...stTags,...cuTags]};
          if(!f.region&&!f.price){alert('⚠️ 请至少选择一个区域或价格！');return;}
          go.disabled=true;go.innerHTML='<span class="ajk-spin"></span>正在筛选...';
          await new Promise(r=>setTimeout(r,700));
          sessionStorage.setItem('ajk_fc',JSON.stringify(f));
          window.location.href=buildURL(f);
        };
        return true;
      }
    
      // ==================== Phase 2+3: 结果整理面板（完整信息 + 交互）====================
      function showPanel(listings,filterInfo){
        // 清理旧面板
        const oldP=document.getElementById('ajkRP');if(oldP)oldP.remove();
        const oldS=document.getElementById('ajkRS');if(oldS)oldS.remove();
        
        const styleEl=document.createElement('style');styleEl.id='ajkRS';styleEl.textContent=CSS;document.head.appendChild(styleEl);
        
        const panel=document.createElement('div');panel.id='ajkRP';panel.className='ajk-panel';
        const vCount=listings.filter(l=>!appState.deleted[l.id]).length;
        const sCount=listings.filter(l=>appState.starred[l.id]).length;
    
        panel.innerHTML=`
          <div class="ajk-tb">
            <span class="ajk-tb-tit">📋 安居客筛选结果 · 完整信息版</span>
            <span class="ajk-tb-sub">${listings.length}套房源 · ${vCount}套可见 · ${sCount}套已收藏</span>
            <div class="ajk-tb-acts">
              <button class="ajk-tb-bt success" id="ajkExp">📤 导出HTML</button>
              <button class="ajk-tb-bt" id="ajkTogDel">🗑️ 显示已删</button>
              <button class="ajk-tb-bt danger" id="ajkClrAll">清空标注</button>
            </div>
          </div>
          <div class="ajk-body" id="ajkBd"></div>
          <button class="ajk-exit" id="ajkExit" title="退出整理模式">✕</button>`;
        document.body.appendChild(panel);
    
        const bd=document.getElementById('ajkBd');
        let showDeleted=false;
    
        function render(){
          bd.innerHTML='';
          const vc=listings.filter(l=>!appState.deleted[l.id]||showDeleted).length;
          const sc=listings.filter(l=>appState.starred[l.id]).length;
          const dc=Object.keys(appState.deleted).length;
          const nc=Object.keys(appState.annotations).length;
    
          // 统计栏
          bd.innerHTML+=`
            <div class="ajk-stats">
              <div class="ajk-stat"><div class="ajk-stat-n">${vc}</div><div class="ajk-stat-l">有效房源</div></div>
              <div class="ajk-stat"><div class="ajk-stat-n">${sc}</div><div class="ajk-stat-l">⭐ 已收藏</div></div>
              <div class="ajk-stat"><div class="ajk-stat-n">${dc}</div><div class="ajk-stat-l">已删除</div></div>
              <div class="ajk-stat"><div class="ajk-stat-n">${nc}</div><div class="ajk-stat-l">📝 有批注</div></div>
              <div class="ajk-stat"><div class="ajk-stat-n">${listings.length}</div><div class="ajk-stat-l">总抓取</div></div>
            </div>
            ${filterInfo?`<div class="ajk-filter-bar">${filterInfo}</div>`:''}
            <div id="ajkCList"></div>`;
    
          const listContainer=document.getElementById('ajkCList');
    
          if(vc===0){
            listContainer.innerHTML=`<div class="ajk-empty"><div class="ajk-empty-ic">🏠</div><div class="ajk-empty-txt">没有可显示的房源了<br><small style="color:#ddd">试试切换"显示已删"或重新筛选</small></div></div>`;
            return;
          }
    
          listings.forEach(item=>{
            if(!showDeleted&&appState.deleted[item.id])return;
            const isStar=!!appState.starred[item.id];
            const isDel=!!appState.deleted[item.id];
            const note=appState.annotations[item.id]||'';
    
            const card=document.createElement('div');
            card.className=`ajk-card${isStar?' starred':''}${isDel?' deleted':''}`;
            card.dataset.id=item.id;
    
            card.innerHTML=`
              <!-- 头部：标题 + 价格 -->
              <div class="ajk-card-hd">
                <div class="ajk-card-title"><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></div>
                <div class="ajk-card-price-area">
                  <div class="ajk-card-price">${item.price}</div>
                  ${item.unitPrice?`<div class="ajk-card-uprice">${item.unitPrice}</div>`:''}
                </div>
              </div>
    
              <!-- 核心信息网格 -->
              <div class="ajk-info-grid">
                <div class="ajk-info-item"><span class="ajk-info-icon">🛏️</span><span class="ajk-info-val">${item.rooms}</span></div>
                <div class="ajk-info-item"><span class="ajk-info-icon">📐</span><span class="ajk-info-val">${item.area}</span></div>
                <div class="ajk-info-item"><span class="ajk-info-icon">🧭</span><span class="ajk-info-val">${item.orientation}</span></div>
                <div class="ajk-info-item"><span class="ajk-info-icon">🏢</span><span class="ajk-info-val">${item.floor}</span></div>
                <div class="ajk-info-item"><span class="ajk-info-icon">📅</span><span class="ajk-info-val">${item.yearBuilt}</span></div>
              </div>
    
              <!-- 小区 + 地址 -->
              ${item.community||item.address?`
              <div class="ajk-loc">
                <span class="ajk-loc-icon">📍</span>
                <div class="ajk-loc-info">
                  ${item.community?`<div class="ajk-loc-comm">${item.community}</div>`:''}
                  ${item.address?`<div class="ajk-loc-addr">${item.address}</div>`:''}
                </div>
              </div>`:''}
    
              <!-- 特色标签 -->
              ${item.tags&&item.tags.length?`
              <div class="ajk-tags-row">
                ${item.tags.map(t=>`<span class="ajk-badge gray">${t}</span>`).join('')}
                ${isStar?'<span class="ajk-badge orange">⭐ 已收藏</span>': ''}
                ${note?'<span class="ajk-badge green">📝 有批注</span>': ''}
                ${isDel?'<span class="ajk-badge red">已删除</span>': ''}
              </div>`:(isStar||note||isDel)?`
              <div class="ajk-tags-row">
                ${isStar?'<span class="ajk-badge orange">⭐ 已收藏</span>': ''}
                ${note?'<span class="ajk-badge green">📝 有批注</span>': ''}
                ${isDel?'<span class="ajk-badge red">已删除</span>': ''}
              </div>`:''}
    
              <!-- 已有批注内容 -->
              ${note?`<div class="ajk-note-show">📝 <strong>我的批注：</strong>${note.replace(/\n/g,'<br>')}</div>`:''}
    
              <!-- 批注编辑区 -->
              <div class="ajk-note-edit" id="ajkNE_${item.id}">
                <div class="ajk-note-lbl">✏️ 编辑批注（记录看房感受、优缺点等）</div>
                <textarea class="ajk-note-ta" id="ajkNT_${item.id}" placeholder="例如：户型方正采光好，但楼层偏低噪音大...">${note}</textarea>
                <button class="ajk-note-sv" data-id="${item.id}">保存批注</button>
                <span class="ajk-note-ok" id="ajkNO_${item.id}">✅ 已保存</span>
              </div>
    
              <!-- 操作按钮 -->
              <div class="ajk-ops">
                <button class="ajk-op ${isStar?'star-on':''}" data-action="star" data-id="${item.id}">${isStar?'★ 取消收藏':'☆ 收藏此房'}</button>
                <button class="ajk-op" data-action="hl" data-id="${item.id}">🖍️ 高亮标记</button>
                <button class="ajk-op" data-action="note" data-id="${item.id}">📝 写批注</button>
                <button class="ajk-op ${isDel?'del-on':''}" data-action="del" data-id="${item.id}">${isDel?'↩️ 恢复':'🗑️ 删除此房'}</button>
                <a href="${item.url}" target="_blank" rel="noopener" class="ajk-op ajk-op-link">🔗 查看详情</a>
              </div>`;
    
            listContainer.appendChild(card);
          });
    
          // ====== 绑定事件（关键修复：使用事件委托确保动态绑定）======
          bindEvents(listContainer);
        }
    
        /**
         * ★★★ 事件委托绑定 —— 确保收藏/删除/批注/高亮功能真正可用 ★★★
         */
        function bindEvents(container){
          container.addEventListener('click', e=>{
            const btn=e.target.closest('.ajk-op[data-action]');
            if(!btn)return;
            
            e.stopPropagation();
            const action=btn.dataset.action;
            const id=btn.dataset.id;
            const card=container.querySelector(`.ajk-card[data-id="${id}"]`);
            if(!card)return;
    
            switch(action){
              case 'star':
                if(appState.starred[id]){delete appState.starred[id];}
                else{appState.starred[id]=true;}
                saveState(appState);
                render(); // 重新渲染以更新UI
                break;
    
              case 'hl':
                card.classList.toggle('highlighted');
                break;
    
              case 'del':
                if(appState.deleted[id]){delete appState.deleted[id];}
                else{appState.deleted[id]=true;}
                saveState(appState);
                render();
                break;
    
              case 'note':
                const ne=document.getElementById(`ajkNE_${id}`);
                if(ne){ne.classList.toggle('show');}
                break;
            }
          });
    
          // 批注保存
          container.addEventListener('click', e=>{
            if(!e.target.classList.contains('ajk-note-sv'))return;
            const id=e.target.dataset.id;
            const ta=document.getElementById(`ajkNT_${id}`);
            const okMsg=document.getElementById(`ajkNO_${id}`);
            if(!ta)return;
            
            const text=ta.value.trim();
            if(text){appState.annotations[id]=text;}else{delete appState.annotations[id];}
            saveState(appState);
            
            okMsg.classList.add('show');
            setTimeout(()=>okMsg.classList.remove('show'),2000);
            render(); // 刷新显示已有批注
          });
        }
    
        // 工具栏事件
        document.getElementById('ajkExit').onclick=()=>{panel.remove();styleEl.remove();};
        document.getElementById('ajkTogDel').onclick=function(){
          showDeleted=!showDeleted;
          this.textContent=showDeleted?'🔒 隐藏已删':'🗑️ 显示已删';
          render();
        };
        document.getElementById('ajkClrAll').onclick=()=>{
          if(confirm('确定清空所有收藏/删除/批注数据吗？')){
            appState={annotations:{},starred:{},deleted:{}};
            saveState(appState);
            render();
          }
        };
    
        // 导出独立HTML
        document.getElementById('ajkExp').onclick=exportHTML;
    
        function exportHTML(){
          const now=new Date().toLocaleString('zh-CN');
          const active=listings.filter(l=>!appState.deleted[l.id]);
          
          let html=`<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>安居客筛选结果报告 - ${now}</title>
    <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:960px;margin:0 auto;padding:24px 20px;background:#f5f6fa;color:#333}
    h1{color:#1a73e8;text-align:center;font-size:23px;margin-bottom:4px}
    .sub{text-align:center;color:#999;font-size:12px;margin-bottom:28px}
    .stats{display:flex;gap:14px;justify-content:center;margin-bottom:24px;flex-wrap:wrap}
    .st{background:#fff;padding:16px 24px;border-radius:12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .stn{font-size:26px;font-weight:900;color:#1890ff}
    .stl{font-size:11px;color:#999;margin-top:4px}
    .fbar{padding:14px 18px;background:linear-gradient(135deg,#e6f7ff,#f0f5ff);border-radius:10px;margin-bottom:20px;font-size:13px;color:#444;border:1px solid #bae7ff;line-height:1.9}
    .card{background:#fff;border-radius:14px;padding:22px;margin-bottom:16px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:5px solid transparent;transition:all .2s}
    .card:hover{box-shadow:0 6px 24px rgba(0,0,0,.1)}
    .card.star{border-left-color:#faad14}
    .card.hl{border-left-color:#52c41a;background:linear-gradient(135deg,#f6ffed,#fcffe6)}
    .ch{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:16px}
    .ctitle{font-size:17px;font-weight:700;color:#1a1a1a;line-height:1.45;flex:1}
    .ctitle a{color:inherit;text-decoration:none}
    .ctitle a:hover{text-decoration:underline;color:#1890ff}
    .cpr{text-align:right;flex-shrink:0}
    .cp{font-size:24px;font-weight:900;color:#ff4d4f}
    .cup{font-size:12px;color:#999;margin-top:2px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px 14px;margin-bottom:14px}
    .gi{display:flex;align-items:center;gap:6px;font-size:13px;color:#555;padding:5px 8px;background:#fafafa;border-radius:8px}
    .loc{display:flex;align-items:flex-start;gap:8px;margin-bottom:12px;padding:10px 14px;background:#f0f5ff;border-radius:10px;border:1px solid #d6e4ff}
    .lcomm{font-size:14px;font-weight:700;color:#1a73e8;margin-bottom:3px}
    .laddr{font-size:12px;color:#888;line-height:1.4}
    .tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .badge{padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:#e6f7ff;color:#1890ff;border:1px solid #bae7ff}
    .badge.o{background:#fff7e6;color:#fa8c16;border-color:#ffd591}
    .badge.g{background:#f6ffed;color:#52c41a;border-color:#b7eb8f}
    .note{padding:10px 14px;background:#e6f7ff;border-radius:10px;font-size:13px;color:#0050b3;line-height:1.7;margin-bottom:10px;border:1px solid #bae7ff;word-break:break-word}
    .footer{text-align:center;color:#bbb;font-size:11px;margin-top:36px;padding:20px 0;border-top:1px solid #eee}
    </style></head><body>
    <h1>🏠 安居客筛选结果报告</h1>
    <div class="sub">导出时间：${now} | 数据来源：安居客(${CONFIG.city})</div>
    <div class="stats">
      <div class="st"><div class="stn">${active.length}</div><div class="stl">有效房源</div></div>
      <div class="st"><div class="stn">${Object.keys(appState.starred).length}</div><div class="stl">⭐ 已收藏</div></div>
      <div class="st"><div class="stn">${Object.keys(appState.annotations).length}</div><div class="stl">📝 有批注</div></div>
    </div>
    ${filterInfo?`<div class="fbar">${filterInfo}</div>`:''}`;
    
          active.forEach(item=>{
            const isStar=!!appState.starred[item.id];
            const note=appState.annotations[item.id]||'';
            html+=`
    <div class="card${isStar?' star':''}">
      <div class="ch">
        <div class="ctitle"><a href="${item.url}" target="_blank" rel="noopener">${item.title}</a></div>
        <div class="cpr"><div class="cp">${item.price}</div>${item.unitPrice?`<div class="cup">${item.unitPrice}</div>`:''}</div>
      </div>
      <div class="grid">
        <div class="gi">🛏️ ${item.rooms}</div>
        <div class="gi">📐 ${item.area}</div>
        <div class="gi">🧭 ${item.orientation}</div>
        <div class="gi">🏢 ${item.floor}</div>
        <div class="gi">📅 ${item.yearBuilt}</div>
      </div>
      ${item.community||item.address?`<div class="loc">📍 <div>${item.community?`<div class="lcomm">${item.community}</div>`:''}${item.address?`<div class="laddr">${item.address}</div>`:''}</div></div>`:''}
      ${item.tags&&item.tags.length?`<div class="tags">${item.tags.map(t=>`<span class="badge">${t}</span>`).join('')}${isStar?'<span class="badge o">⭐ 已收藏</span>':''}${note?'<span class="badge g">📝 有批注</span>':''}</div>`:''}
      ${note?`<div class="note">📝 <strong>批注：</strong>${note.replace(/\n/g,'<br>')}</div>`:''}
    </div>`;
          });
    
          html+=`<div class="footer">由「安居客智能筛选技炉」自动生成 · 仅供个人参考</div></body></html>`;
    
          const blob=new Blob([html],{type:'text/html;charset=utf-8'});
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a');a.href=url;
          a.download=`安居客筛选报告_${new Date().toISOString().slice(0,10)}.html`;
          document.body.appendChild(a);a.click();
          setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},100);
        }
    
        // 首次渲染
        render();
        return true;
      }
    
      // ==================== 主入口 ====================
      const url=location.href;
      const isResultPage=/\/sale\/[^/]+/.test(url)&&/(m?\d|l\d)/.test(url);
    
      if(CONFIG.mode==='filter'||(CONFIG.mode==='auto'&&!isResultPage)){
        showFilter();
        return{ok:true,summary:'Phase 1 筛选弹窗已弹出',data:{mode:'filter'}};
      }else{
        let fi='';
        try{
          const fc=sessionStorage.getItem('ajk_fc');
          if(fc){fi=getFilterDesc(JSON.parse(fc));sessionStorage.removeItem('ajk_fc');}
        }catch(e){}
        
        const listings=scrapeListings();
        
        if(listings.length===0){
          console.warn('[安居客技炉] 未检测到房源列表，回退到筛选模式');
          showFilter();
          return{ok:true,summary:'未检测到房源列表，回退到筛选模式',data:{mode:'fallback',count:0}};
        }
    
        showPanel(listings,fi);
        return{
          ok:true,
          summary:`结果整理面板已加载！共抓取 ${listings.length} 条房源完整信息`,
          data:{
            mode:'result',
            count:listings.length,
            fields_per_listing:['title','url','price','unitPrice','rooms','area','orientation','floor','yearBuilt','community','address','tags'],
            features:['⭐收藏(持久化)','🗑️删除(持久化)','🖍️高亮','📝文字批注(持久化)','📤导出独立HTML','统计面板','localStorage持久化']
          }
        };
      }
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();