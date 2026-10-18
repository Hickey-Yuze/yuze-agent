// ==UserScript==
// @name         🦋 逃脱信息茧房 - B站多样性推荐器
// @namespace    https://github.com/tabbit/bilibili-cocoon-escape
// @version      9.1
// @description  从B站首页提取视频，按分区多样性推荐，帮你跳出推荐算法茧房
// @author       Tabbit
// @match        https://www.bilibili.com/
// @icon         https://www.bilibili.com/favicon.ico
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    var CATS = [
        {id:'douga',name:'动画',icon:'🎬',color:'#FF6B6B'},
        {id:'game',name:'游戏',icon:'🎮',color:'#4ECDC4'},
        {id:'kichiku',name:'鬼畜',icon:'👻',color:'#FFE66D'},
        {id:'music',name:'音乐',icon:'🎵',color:'#A06CD5'},
        {id:'dance',name:'舞蹈',icon:'💃',color:'#FF9F43'},
        {id:'cinephile',name:'影视',icon:'🎥',color:'#54A0FF'},
        {id:'ent',name:'娱乐',icon:'🎤',color:'#FF78C4'},
        {id:'knowledge',name:'知识',icon:'📚',color:'#5F27CD'},
        {id:'tech',name:'科技',icon:'💻',color:'#00D2D3'},
        {id:'food',name:'美食',icon:'🍜',color:'#FF6B35'},
        {id:'information',name:'资讯',icon:'📰',color:'#48DBFB'},
        {id:'life',name:'生活',icon:'🏠',color:'#1DD1A1'}
    ];
    var REC_COUNT = 6;
    var STORAGE_KEY = 'bilibili_cocoon_escape_data';

    /* ===== utils ===== */
    function loadSaved() {
        try {
            var r = localStorage.getItem(STORAGE_KEY);
            if (r) {
                var d = JSON.parse(r);
                if (!d.exploredBvids || !Array.isArray(d.exploredBvids)) {
                    d.exploredBvids = [];
                }
                delete d.exploredCategories;
                delete d.clickCount;
                delete d.totalSessions;
                save(d);
                return d;
            }
        } catch(e) {}
        return {exploredBvids:[]};
    }

    function save(d) {
        try { d.lastVisit = new Date().toISOString(); localStorage.setItem(STORAGE_KEY,JSON.stringify(d)); } catch(e) {}
    }

    function shuffle(a) {
        var b = a.slice();
        for (var i=b.length-1;i>0;i--) {
            var j=Math.floor(Math.random()*(i+1));
            var t=b[i];b[i]=b[j];b[j]=t;
        }
        return b;
    }

    function fmt(n) {
        if (!n||isNaN(n)) return '--';
        n=+n;
        if (n>=10000) return (n/10000).toFixed(1)+'万';
        if (n>=1000) return (n/1000).toFixed(1)+'k';
        return String(Math.round(n));
    }

    function parsePlay(t) {
        if (!t) return 0;
        t=String(t).trim();
        var m=t.match(/([\d.]+)/);
        if (!m) return 0;
        var n=parseFloat(m[1]);
        if (t.indexOf('万')>=0) n*=10000;
        return Math.round(n);
    }

    /* ===== styles ===== */
    function injectCSS() {
        if (document.getElementById('cocoon-css-v9')) return;
        var css =
            '.cocoon-panel{position:fixed;top:70px;right:16px;width:calc((100vw - 32px) / 3);min-width:320px;max-width:480px;' +
            'background:#FFFFFF;border-radius:14px;' +
            'box-shadow:0 2px 12px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.04),0 0 1px rgba(0,0,0,0.08);' +
            'z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Helvetica Neue",sans-serif;' +
            'display:flex;flex-direction:column;overflow:hidden;' +
            'animation:cocoonFadeIn 0.4s cubic-bezier(.25,.46,.45,.94);' +
            'transition:opacity 0.25s,transform 0.3s cubic-bezier(.25,.46,.45,.94);' +
            'max-height:calc(100vh - 90px);}' +
            '@keyframes cocoonFadeIn{from{opacity:0;transform:translateX(30px)scale(0.96)}to{opacity:1;transform:none}}' +
            '@keyframes cocoonPulse{0%,100%{box-shadow:0 2px 12px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.04)}50%{box-shadow:0 4px 24px rgba(0,122,255,0.15),0 8px 32px rgba(0,122,255,0.08)}}' +
            '.cocoin-hd{display:flex;align-items:center;padding:16px 18px 12px;gap:12px;border-bottom:0.5px solid #E5E5EA;flex-shrink:0;background:#FFFFFF;}' +
            '.cocoon-logo{width:38px;height:38px;background:linear-gradient(135deg,#007AFF,#5856D6);border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;box-shadow:0 2px 8px rgba(0,122,255,0.25);animation:cocoonPulse 3s infinite;}' +
            '.cocoon-title{font-size:16px;font-weight:700;color:#1D1D1F;line-height:1.2;letter-spacing:-0.3px;}' +
            '.cocoon-sub{font-size:12px;color:#86868B;margin-top:3px;letter-spacing:0.2px;}' +
            '.cocoon-btns{display:flex;gap:6px;margin-left:auto;flex-shrink:0;}' +
            '.cocoon-bn{width:28px;height:28px;border:none;border-radius:8px;background:#F2F2F7;color:#86868B;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all 0.2s cubic-bezier(.25,.46,.45,.94);}' +
            '.cocoon-bn:hover{background:#E5E5EA;color:#1D1D1F;}' +
            '.cocoon-bn:active{transform:scale(0.88);background:#D1D1D6;}' +
            '.cocoon-prog{padding:12px 18px 14px;flex-shrink:0;}' +
            '.cocoon-prog-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}' +
            '.cocoon-prog-lbl{font-size:13px;color:#86868B;font-weight:600;}' +
            '.cocoon-prog-pct{font-size:22px;font-weight:800;color:#007AFF;letter-spacing:-0.5px;}' +
            '.cocoon-hint{font-size:12px;color:#86868B;margin-top:8px;line-height:1.5;}' +
            '.cocoon-hint b{color:#1D1D1F;font-weight:700;}' +
            '.cocoon-actions{padding:0 18px 14px;display:flex;gap:10px;flex-shrink:0;}' +
            '.cocoon-act{flex:1;padding:11px 14px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all 0.2s cubic-bezier(.25,.46,.45,.94);-webkit-tap-highlight-color:transparent;user-select:none;}' +
            '.cocoon-act-surp{background:#007AFF;color:#FFF;box-shadow:0 2px 10px rgba(0,122,255,0.3),0 1px 3px rgba(0,0,0,0.06);}' +
            '.cocoon-act-surp:hover{background:#0066D6;transform:translateY(-1px);box-shadow:0 4px 16px rgba(0,122,255,0.35),0 2px 4px rgba(0,0,0,0.08);}' +
            '.cocoon-act-surp:active{transform:scale(0.95)!important;box-shadow:0 1px 4px rgba(0,122,255,0.25);}' +
            '.cocoon-act-refr{background:#F2F2F7;color:#1D1D1F;border:0.5px solid #E5E5EA;}' +
            '.cocoon-act-refr:hover{background:#E5E5EA;transform:translateY(-1px);}' +
            '.cocoon-act-refr:active{transform:scale(0.95)!important;background:#D1D1D6;}' +
            '.cocoon-body{flex:1;overflow-y:auto;overflow-x:hidden;padding:0 14px 14px;}' +
            '.cocoon-body::-webkit-scrollbar{width:4px;}' +
            '.cocoon-body::-webkit-scrollbar-thumb{background:#C7C7CC;border-radius:2px;}' +
            '.cocoon-body::-webkit-scrollbar-track{background:transparent;}' +
            '.cocoon-sect{font-size:11px;font-weight:700;color:#C7C7CC;letter-spacing:1.5px;padding:14px 4px 10px;text-transform:uppercase;}' +
            '.cocoon-card{display:flex;gap:13px;padding:13px;border-radius:13px;background:#F9F9FB;border:0.5px solid #E5E5EA;margin-bottom:8px;cursor:pointer;text-decoration:none;transition:all 0.25s cubic-bezier(.25,.46,.45,.94);-webkit-tap-highlight-color:transparent;}' +
            '.cocoon-card:hover{background:#FFFFFF;box-shadow:0 4px 16px rgba(0,0,0,0.06),0 1px 4px rgba(0,0,0,0.03);border-color:#D1D1D6;transform:translateY(-2px);}' +
            '.cocoon-card:active{transform:scale(0.97) translateY(0);}' +
            '.cocoon-thumb{width:116px;height:70px;border-radius:10px;overflow:hidden;flex-shrink:0;background:#E5E5EA;position:relative;}' +
            '.cocoon-thumb img{width:100%;height:100%;object-fit:cover;display:block;border-radius:10px;transition:transform 0.3s ease;}' +
            '.cocoon-card:hover .cocoon-thumb img{transform:scale(1.04);}' +
            '.cocoon-dur{position:absolute;right:5px;bottom:5px;font-size:10px;padding:0 5px;border-radius:4px;background:rgba(0,0,0,0.55);color:#FFF;font-weight:600;backdrop-filter:blur(4px);}' +
            '.cocoon-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:space-between;}' +
            '.cocoon-card-tit{font-size:13px;font-weight:600;color:#1D1D1F;line-height:1.38;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
            '.cocoon-meta{display:flex;align-items:center;gap:8px;font-size:11px;color:#86868B;}' +
            '.cocoon-badge{font-size:10px;padding:2px 8px;border-radius:6px;font-weight:600;white-space:nowrap;}' +
            '.cocoon-empty{text-align:center;padding:32px 20px;color:#C7C7CC;}' +
            '.cocoon-empty .big{font-size:36px;margin-bottom:10px;}' +
            '.cocoon-empty .sm{font-size:13px;line-height:1.5;}' +
            '.cocoon-toast{position:fixed;top:20px;left:50%;transform:translateX(-50%) translateY(-16px);padding:10px 24px;background:rgba(29,29,31,0.85);color:#FFF;border-radius:12px;font-size:13px;font-weight:600;z-index:2147483647;opacity:0;pointer-events:none;transition:all 0.35s cubic-bezier(.25,.46,.45,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);box-shadow:0 4px 20px rgba(0,0,0,0.15),0 0 1px rgba(255,255,255,0.1);}' +
            '.cocoon-toast.show{opacity:1;transform:translateX(-50%) translateY(0);}' +
            '.cocoon-side-tab{position:fixed;top:70px;right:16px;width:46px;height:auto;padding:10px 5px;background:linear-gradient(180deg,#007AFF,#5856D6);border-radius:12px;z-index:2147483647;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;box-shadow:0 4px 16px rgba(0,122,255,0.3),0 2px 6px rgba(0,0,0,0.08);transition:all 0.25s cubic-bezier(.25,.46,.45,.94);animation:cocoonTabIn 0.4s cubic-bezier(.34,1.56,.64,1);}' +
            '.cocoon-side-tab:hover{transform:scale(1.06);box-shadow:0 6px 24px rgba(0,122,255,0.4),0 3px 10px rgba(0,0,0,0.1);}' +
            '.cocoon-side-tab:active{transform:scale(0.93);}' +
            '@keyframes cocoonTabIn{from{opacity:0;transform:translateX(30px)scale(0.85)}to{opacity:1;transform:none}}' +
            '.cocoon-tab-icon{font-size:19px;}' +
            '.cocoon-tab-text{font-size:9px;color:rgba(255,255,255,0.9);font-weight:700;writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:1.5px;line-height:1.3;}' +
            '.cocoon-panel.celebrating{box-shadow:0 2px 12px rgba(0,0,0,0.08),0 4px 20px rgba(0,0,0,0.04),0 0 60px rgba(255,170,0,0.2),0 0 120px rgba(255,100,80,0.1);animation:cocoonCelebrate 0.8s ease-in-out infinite alternate;border:2px solid transparent;background-image:linear-gradient(#FFFFFF,#FFFFFF),linear-gradient(90deg,#FF9500,#FFCC00,#FF6B6B,#007AFF,#5856D6,#FF9500);background-origin:border-box;background-clip:padding-box,border-box;border-radius:16px;}' +
            '@keyframes cocoonCelebrate{from{transform:none}to{transform:translateY(-2px)scale(1.003)}}' +
            '@keyframes cocoonRainbow{0%{filter:hue-rotate(0deg)}100%{filter:hue-rotate(360deg)}}' +
            '.cocoon-prog-pct.full{color:#FF9500;text-shadow:0 0 12px rgba(255,149,0,0.4);}' +
            '@keyframes cocoonConfetti{0%{opacity:1;transform:translateY(0) rotate(0deg)}100%{opacity:0;transform:translateY(-90px) rotate(720deg)}}' +
            '.cocoon-confetti{position:absolute;width:8px;height:8px;border-radius:50%;pointer-events:none;z-index:10;animation:cocoonConfetti 1.5s ease-out forwards;}' +
            '.cocoon-badge-full{display:inline-block;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:800;background:linear-gradient(135deg,#FF9500,#FF6B6B);color:#FFF;letter-spacing:1px;box-shadow:0 2px 8px rgba(255,149,0,0.3);animation:cocoonPulse 1.5s ease infinite;margin-left:8px;vertical-align:middle;}' +
            '.cocoon-card-done{border-color:rgba(52,199,89,0.35)!important;background:rgba(52,199,89,0.05)!important;}' +
            '.cocoon-card-done .cocoon-card-tit{color:#8E8E93;}' +
            '.cocoon-check{position:absolute;top:5px;left:5px;width:20px;height:20px;border-radius:50%;background:rgba(34,197,94,0.9);color:#FFF;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;z-index:2;box-shadow:0 2px 6px rgba(34,197,94,0.3);}';
        var s = document.createElement('style');
        s.id = 'cocoon-css-v9';
        s.textContent = css;
        document.head.appendChild(s);
    }

    /* ===== DOM extract ===== */
    function extractVideos() {
        var vids = [];
        var seen = {};
        document.querySelectorAll('.bili-video-card').forEach(function(card) {
            if (vids.length >= 30) return;
            var wrap = card.querySelector('.bili-video-card__wrap a[href*="/video/BV"]');
            if (!wrap) return;
            var href = wrap.getAttribute('href') || '';
            var m = href.match(/\/video\/(BV[\w]+)/);
            if (!m || seen[m[1]]) return;
            seen[m[1]] = 1;
            var cover = '';
            var img = wrap.querySelector('img');
            if (img) { cover = img.src || img.currentSrc || ''; if (cover.indexOf('//') === 0) cover = 'https:' + cover; }
            var title = '';
            var h3 = card.querySelector('h3');
            if (h3) title = h3.getAttribute('title') || (h3.textContent || '').trim() || '';
            var play = 0;
            var st = card.querySelector('.bili-video-card__stats--text');
            if (st) { var sp = st.querySelector('span:first-child') || st; play = parsePlay(sp.textContent); }
            var dur = '';
            var de = card.querySelector('[class*="duration"]');
            if (de) dur = de.textContent.trim();
            var owner = '';
            var oe = card.querySelector('[class*="owner"],[class*="author"]');
            if (oe) owner = oe.textContent.trim();
            vids.push({bvid:m[1], title:title||'(视频)', cover:cover, play:play, dur:dur, owner:owner});
        });
        if (vids.length < 6) {
            document.querySelectorAll('a[href*="/video/BV"]').forEach(function(a) {
                if (vids.length >= 20) return;
                var h = a.getAttribute('href') || '';
                var bv = h.match(/\/video\/(BV[\w]+)/);
                if (!bv || seen[bv[1]]) return;
                var im = a.querySelector('img');
                if (!im) return;
                seen[bv[1]] = 1;
                var c = im.src || im.currentSrc || '';
                if (c.indexOf('//') === 0) c = 'https:' + c;
                var t = '';
                var pc = a.closest('[class*="video-card"]');
                if (pc) { var h3 = pc.querySelector('h3'); t = h3 ? (h3.getAttribute('title') || (h3.textContent||'').trim()) : ''; }
                vids.push({bvid:bv[1], title:t||'(视频)', cover:c, play:0, dur:'', owner:''});
            });
        }
        return vids;
    }

    /* ===== render ===== */
    var panel = null;
    var data = null;

    function toast(msg) {
        var t = document.querySelector('.cocoon-toast');
        if (!t) { t = document.createElement('div'); t.className = 'cocoon-toast'; document.body.appendChild(t); }
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(function(){ t.classList.remove('show'); }, 2200);
    }

    function render(recs) {
        var expSet = {};
        data.exploredBvids.forEach(function(b){ expSet[b] = 1; });
        var expCount = Object.keys(expSet).length;
        var uCats = {};
        recs.forEach(function(r){ uCats[r.cat.id] = 1; });

        var cardsHtml = '';
        recs.forEach(function(item){
            var isExplored = !!expSet[item.bvid];
            cardsHtml += '<a class="cocoon-card'+(isExplored?' cocoon-card-done':'')+'" href="https://www.bilibili.com/video/'+item.bview+'/" target="_blank" data-bvid="'+item.bvid+'">';
            cardsHtml += '<div class="cocoon-thumb"><img src="'+item.cover+'" alt="" referrerpolicy="no-referrer" crossorigin="anonymous" loading="lazy"/>';
            if (item.dur) cardsHtml += '<span class="cocoon-dur">'+item.dur+'</span>';
            if (isExplored) cardsHtml += '<span class="cocoon-check">✓</span>';
            cardsHtml += '</div><div class="cocoon-info"><div class="cocoon-card-tit">'+item.title+'</div>';
            cardsHtml += '<div class="cocoon-meta"><span class="cocoon-badge" style="background:'+item.cat.color+'15;color:'+item.cat.color+';border:1px solid '+item.cat.color+'25">'+item.cat.icon+item.cat.name+'</span>';
            cardsHtml += '<span>▶'+fmt(item.play)+'</span></div></div></a>';
        });

        var bodyHtml = '';
        if (recs.length > 0) {
            bodyHtml = '<div class="cocoon-sect">✨ 跨'+Object.keys(uCats).length+'个领域 · 来自当前页面</div>' + cardsHtml;
        } else {
            bodyHtml = '<div class="cocoon-empty"><div class="big">🔍</div><div>未检测到视频内容</div><div class="sm">请确保在B站首页使用本脚本</div></div>';
        }

        var isFull = (expCount >= 30);
        var hintHtml = '';
        if (isFull) {
            // ✅ 修复：去掉嵌套的 <b> 标签
            hintHtml = '🎉 <b>太棒了！你已探索 '+expCount+' 个视频！</b><span class="cocoon-badge-full">🏆 破茧成功</span>';
        } else {
            hintHtml = '已探索 <b>'+expCount+'</b> 个视频，继续发现新内容！';
        }

        var panelClass = 'cocoon-panel' + (isFull ? ' celebrating' : '');
        panel.innerHTML = '<div class="cocoon-inner">'+
            '<div class="cocoin-hd"><div class="cocoon-logo">🦋</div><div><div class="cocoon-title">逃脱信息茧房</div><div class="cocoon-sub">发现不一样的世界</div></div>'+
            '<div class="cocoon-btns"><button class="cocoon-bn" id="co_min" title="最小化到侧边">−</button></div></div>'+
            '<div class="cocoon-prog"><div class="cocoon-prog-row"><span class="cocoon-prog-lbl">📺 已探索视频</span><span class="cocoon-prog-pct'+(isFull?' full':'')+'">'+expCount+' 个</span></div>'+
            '<div class="cocoon-hint">'+hintHtml+'</div></div>'+
            '<div class="cocoon-actions"><button class="cocoon-act cocoon-act-surp" id="co_surp">🎲 随机跳转</button><button class="cocoon-act cocoon-act-refr" id="co_refr">🔄 换一批</button></div>'+
            '<div class="cocoon-body">'+bodyHtml+'</div></div>';

        bindEvents();
    }

    function bindEvents() {
        var minBtn = document.getElementById('co_min');
        if (minBtn) minBtn.addEventListener('click',function(){
            if(panel && panel.parentNode) panel.parentNode.removeChild(panel);
            panel = null;
            var tab = document.createElement('div');
            tab.className = 'cocoon-side-tab';
            tab.id = 'cocoon-side-tab';
            tab.innerHTML = '<span class="cocoon-tab-icon">📺</span><span class="cocoon-tab-text">小破站</span>';
            document.body.appendChild(tab);
            tab.addEventListener('click',function(){
                if(tab.parentNode) tab.parentNode.removeChild(tab);
                initPanel();
            });
            toast('📺 已最小化到侧边 · 点击「小破站」可恢复');
        });

        var surpBtn = document.getElementById('co_surp');
        if (surpBtn) surpBtn.addEventListener('click',function(){
            var pick = CATS[Math.floor(Math.random() * CATS.length)];
            toast('🎲 跳转到：' + pick.name + '区热门榜');
            window.open('https://www.bilibili.com/v/popular/rank/' + pick.id,'_blank');
            save(data);
            setTimeout(refresh,400);
        });

        var refrBtn = document.getElementById('co_refr');
        if (refrBtn) refrBtn.addEventListener('click',refresh);

        panel.querySelectorAll('.cocoon-card').forEach(function(c){
            c.addEventListener('click',function(){
                var bvid = this.getAttribute('data-bvid');
                if (bvid && data.exploredBvids.indexOf(bvid) < 0) {
                    data.exploredBvids.push(bvid);
                    save(data);
                    this.classList.add('cocoon-card-done');
                    var checkEl = this.querySelector('.cocoon-check');
                    if (!checkEl) {
                        var thumb = this.querySelector('.cocoon-thumb');
                        if (thumb) {
                            var ck = document.createElement('span');
                            ck.className = 'cocoon-check';
                            ck.textContent = '✓';
                            thumb.appendChild(ck);
                        }
                    }
                }
                toast('✨ 已探索此视频！');
            });
        });
    }

    /* ===== recommend logic ===== */
    var domVids = [];

    function genRecs() {
        if (!domVids.length) return [];
        var assigned = domVids.map(function(v,i){ return Object.assign({},v,{cat:CATS[i%CATS.length]}); });
        var expS = {};
        (data.exploredBvids||[]).forEach(function(b){ expS[b]=1; });
        // ✅ 修复：用 bvid 而不是 cat.id 来排序，让已探索的视频排到后面
        var sorted = assigned.slice().sort(function(a,b){
            return (expS[a.bvid]?1:0)-(expS[b.bvid]?1:0);
        });
        var sel = [];
        var used = {};
        for (var i=0;i<sorted.length;i++){
            if(sel.length>=REC_COUNT)break;
            var item=sorted[i];
            if(!used[item.cat.id]){sel.push(item);used[item.cat.id]=1;}
        }
        for (var j=0;j<shuffle(sorted).length;j++){
            if(sel.length>=REC_COUNT)break;
            var it=sorted[j];
            if(!sel.find(function(s){return s.bvid===it.bvid;}))sel.push(it);
        }
        return shuffle(sel).slice(0,REC_COUNT);
    }

    function refresh() {
        if (!panel) return;
        domVids = extractVideos();
        domVids.forEach(function(v){ v.bview = v.bvid; });
        render(genRecs());
    }

    function initPanel() {
        injectCSS();
        panel = document.createElement('div');
        panel.className = 'cocoon-panel';
        document.body.appendChild(panel);
        refresh();
    }

    /* ===== init ===== */
    function init() {
        var old = document.querySelector('.cocoon-panel');
        if (old) old.remove();
        var oldTab = document.getElementById('cocoon-side-tab');
        if (oldTab && oldTab.parentNode) oldTab.parentNode.removeChild(oldTab);
        data = loadSaved();
        initPanel();
        save(data);
    }

    init();

})();