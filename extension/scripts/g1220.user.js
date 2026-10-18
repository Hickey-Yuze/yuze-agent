(function() {
    'use strict';
    var SID = 'bilibili-ad-blocker-v21';
    if (document.getElementById(SID)) return;
    var mk = document.createElement('div'); mk.id = SID; mk.style.display = 'none'; document.body.appendChild(mk);

    // 清理旧版
    document.querySelectorAll('.bilidblkr-card,.bilidblkr-carousel-overlay,.bilidblkr-popup-bar,.bilidblkr-vpad-bar,.bilidblkr-stats-panel,.bilidblkr-stats-btn--top,.bilidblkr-stats-overlay').forEach(function(el) {
        var uid = el.dataset.bilidblkrUid;
        if (uid && window.__bilidblkr_map) { var d = window.__bilidblkr_map.get(uid); if (d && d.originalEl) { d.originalEl.style.display = ''; d.originalEl.classList.remove('bilidblkr-blocked'); delete d.originalEl.dataset.bilidblkrWrap; delete d.originalEl.dataset.bilidblkrChecked; } }
        el.remove();
    });
    document.querySelectorAll('.bilidblkr-blocked').forEach(function(e) { e.style.display = ''; e.classList.remove('bilidblkr-blocked'); });
    document.querySelectorAll('[data-bilidblkr-checked]').forEach(function(e) { delete e.dataset.bilidblkrChecked; delete e.dataset.bilidblkrWrap; });
    for (var vv = 6; vv <= 21; vv++) { var os = document.getElementById('bilidblkr-styles-v' + vv); if (os) os.remove(); }
    if (window.__bilidblkr_topInterval) clearInterval(window.__bilidblkr_topInterval);

    var AD_D = ['cm.bilibili.com'], AD_L = ['广告', '推广'];
    var idMap = new Map(); window.__bilidblkr_map = idMap;
    var idC = 0; function nid() { return 'b21-' + (++idC) + '-' + Date.now(); }
    function isVP() { return /^\/video\//.test(location.pathname) || /^\/bangumi\//.test(location.pathname); }

    // localStorage
    var SK = 'bilidblkr_stats_v21';
    function ls() { try { var r = JSON.parse(localStorage.getItem(SK)); if (r && typeof r.feedCard === 'number') return r; } catch(e) {} return { feedCard:0, carousel:0, topBanner:0, loginPopup:0, videoPageAd:0, advertiserCounts:{} }; }
    var st = ls();
    function ss() { try { localStorage.setItem(SK, JSON.stringify(st)); } catch(e) {} }
    function gt() { return st.feedCard + st.carousel + st.topBanner + st.loginPopup + st.videoPageAd; }
    function rs(type, name) {
        st[type]++;
        if (name) st.advertiserCounts[name] = (st.advertiserCounts[name] || 0) + 1;
        ss(); upPanel();
        var btn = document.querySelector('.bilidblkr-stats-btn--top');
        if (btn) btn.title = '广告屏蔽统计 (累计: ' + gt() + '个)';
    }

    // SVG
    var BS = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
    var SS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>';
    var IS = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>';

    // 广告商库
    var AM = {
        '微粒贷':'贷款广告','千问AI':'AI 产品推广','千问':'AI 产品推广',
        '网易逆水寒':'游戏推广','诡秘之主游戏':'游戏推广','硬核游戏福利':'游戏推广','游戏福利官':'游戏推广',
        'PC热门页游':'页游推广','龙之战歌':'页游推广',
        '穿毛裤的小拉泽':'食品推广','MrBeast官方账号':'海外内容引进','内裤研究所':'商品推广',
        '点击查看':'广告占位符','点击参与':'广告占位符','完整版现正二五折':'广告占位符','点击领取':'商业推广',
        '汤圆圆圆周':'商业推广','高中物理老何':'商业推广','-鹿鹿不是鹿':'商业推广',
        '沛沛瑶呀爱吃糖呀':'商业推广','爱笑的小羽_':'商业推广','太阳星sunstar':'商业推广',
        '不是猫mer':'商业推广','骚拳超人':'商业推广','咩栗':'商业推广','开心猪猫':'商业推广',
        'すりぃ_THREEE':'商业推广','超能搞机':'商业推广','神奇阿宇Ayu':'商业推广',
        '高途高中':'商业推广','渤海小吏':'商业推广','小is咩':'商业推广',
        'AI还能这么玩':'AI 产品推广','AI生图还能这么玩？':'AI 产品推广','打工人提效神器':'AI 产品推广',
        '未绫V0Rei':'商业推广','食贫道':'商业推广','丸子酥酥-susu':'商业推广',
        '众擎机器人':'商业推广','雪眠yuki':'商业推广','鱼块Yukai_Official':'商业推广'
    };

    function gAC(card) {
        var a = card.querySelector('.bili-video-card__info--author');
        if (!a) return null; var n = (a.getAttribute('title') || a.textContent || '').trim(); if (!n) return null;
        for (var k in AM) { if (n.indexOf(k) !== -1) return { name: n, category: AM[k] }; }
        return { name: n, category: '广告/推广视频' };
    }

    // 广告检测
    function iAL(el) { if (!el) return false; var h = el.getAttribute('href') || ''; return AD_D.some(function(d) { return h.indexOf(d) !== -1; }); }
    function hAL(r) { var ls = r.querySelectorAll('a[href]'); for (var i=0;i<ls.length;i++){if(iAL(ls[i]))return true;} return false; }
    function hLB(r) { var els = r.querySelectorAll('span,div,p'); for (var i=0;i<els.length;i++){var t=(els[i].textContent||'').trim(); if(t.length<=4 && AD_L.some(function(k){return t===k;}))return true;} return false; }

    // 首页双层卡片
    function bFC(fc) {
        if (fc.dataset.bilidblkrWrap) return; fc.dataset.bilidblkrWrap = '1';
        var uid = nid(), w = document.createElement('div'); w.className = 'bilidblkr-card'; w.dataset.bilidblkrUid = uid;
        var b = document.createElement('div'); b.className = 'bilidblkr-card-back';
        var f = document.createElement('div'); f.className = 'bilidblkr-card-front';
        var ai = gAC(fc), lt = ai ? ai.category + '已屏蔽' : '广告/推广视频已屏蔽', hn = ai ? ai.name : '';
        f.innerHTML = '<div class="bilidblkr-card-icon">' + BS + '</div><span class="bilidblkr-card-label">' + lt + '</span>' + (hn ? '<span class="bilidblkr-card-name">「' + hn + '」</span>' : '') + '<span class="bilidblkr-card-hint">鼠标悬停查看</span>';
        w.appendChild(b); w.appendChild(f); fc.parentNode.insertBefore(w, fc); b.appendChild(fc);
        idMap.set(uid, { wrapper: w, originalEl: fc, back: b, front: f }); rs('feedCard', hn);
    }

    // 播放页广告条
    function bVP(card) {
        if (card.dataset.bilidblkrWrap) return; card.dataset.bilidblkrWrap = '1';
        var uid = nid(), bar = document.createElement('div'); bar.className = 'bilidblkr-vpad-bar'; bar.dataset.bilidblkrUid = uid;
        var ai = gAC(card), hn = ai ? ai.name : '';
        bar.innerHTML = SS + '<span>播放页广告已屏蔽</span>' + (hn ? '<span class="bilidblkr-vpad-name">「' + hn + '」</span>' : '');
        card.style.display = 'none'; card.classList.add('bilidblkr-blocked');
        card.parentNode.insertBefore(bar, card);
        idMap.set(uid, { wrapper: bar, originalEl: card }); rs('videoPageAd', hn);
    }

    // 各模块
    function cCarousel() {
        document.querySelectorAll('.vui_carousel__slide').forEach(function(s) {
            if (s.dataset.bilidblkrChecked) return; s.dataset.bilidblkrChecked = '1';
            var l = s.querySelector('a.carousel-item, a[href]'); if (!l || !iAL(l)) return;
            var uid = nid(), o = document.createElement('div'); o.className = 'bilidblkr-carousel-overlay'; o.dataset.bilidblkrUid = uid;
            o.innerHTML = '<div class="bilidblkr-co-icon">' + BS + '</div><span class="bilidblkr-co-label">广告已屏蔽</span><span class="bilidblkr-co-hint">鼠标悬停查看</span>';
            s.style.position = 'relative'; s.appendChild(o);
            idMap.set(uid, { wrapper: o, originalEl: s }); rs('carousel');
        });
    }
    function cLogin() {
        document.querySelectorAll('.login-tip, .login-panel-popover').forEach(function(t) {
            if (t.dataset.bilidblkrChecked) return; t.dataset.bilidblkrChecked = '1';
            t.style.display = 'none'; t.classList.add('bilidblkr-blocked'); rs('loginPopup');
        }); document.body.style.overflow = '';
    }
    function cBanner() {
        document.querySelectorAll('.bili-video-card__wrap.__scale-wrap').forEach(function(w) {
            if (w.dataset.bilidblkrChecked) return; w.dataset.bilidblkrChecked = '1';
            var l = w.querySelector('a[href]'); if (!l || !iAL(l)) return;
            var card = w.closest('.bili-video-card') || w; card.style.display = 'none'; card.classList.add('bilidblkr-blocked');
            var bar = document.createElement('div'); bar.className = 'bilidblkr-popup-bar bilidblkr-popup-bar--banner';
            var uid = nid(); bar.dataset.bilidblkrUid = uid; bar.innerHTML = SS + '<span>顶部广告已屏蔽</span>';
            card.parentNode.insertBefore(bar, card); idMap.set(uid, { wrapper: bar, originalEl: card }); rs('topBanner');
        });
    }
    function cFeed() {
        document.querySelectorAll('.feed-card, .bili-video-card.is-rcmd').forEach(function(card) {
            if (card.dataset.bilidblkrChecked || card.dataset.bilidblkrWrap) return; card.dataset.bilidblkrChecked = '1';
            var isAd = hAL(card) || hLB(card);
            if (!isAd) { var b = card.querySelector('.bili-video-card__ad,.bili-video-card__info--ad,[class*="ad-mark"],[class*="ad_tag"]'); if (b) isAd = true; }
            if (!isAd) { var vl = card.querySelector('.bili-video-card__image--link'); if (vl && iAL(vl)) isAd = true; }
            if (isAd) bFC(card.closest('.feed-card') || card);
        });
    }
    // ★ 播放页 5 层检测
    function cVideo() {
        if (!isVP()) return;
        // 层1: 右侧推荐卡片
        document.querySelectorAll('.video-card-common,.recommend-list-v1 .rec-list>*,.right-container-inner .video-card-common,.recommend-list__item').forEach(function(c) {
            if (c.dataset.bilidblkrChecked || c.dataset.bilidblkrWrap) return; c.dataset.bilidblkrChecked = '1';
            if (hAL(c) || hLB(c)) { bVP(c); return; }
            if (c.querySelector('.ad-report,.ad-floor,.ad-floor-exp')) { bVP(c); return; }
        });
        // 层2: 推荐区 bili-video-card
        document.querySelectorAll('.bili-video-card.is-rcmd').forEach(function(card) {
            if (card.dataset.bilidblkrChecked || card.dataset.bilidblkrWrap) return; card.dataset.bilidblkrChecked = '1';
            if (card.closest('.bilidblkr-card')) return;
            if (hAL(card) || hLB(card)) { bVP(card); }
        });
        // 层3: 广告楼层
        document.querySelectorAll('.ad-floor,.ad-floor-exp,.bili-ad,[class*="adcard"],[class*="ad-card"]').forEach(function(e) {
            if (e.dataset.bilidblkrChecked) return; e.dataset.bilidblkrChecked = '1';
            e.style.display = 'none'; e.classList.add('bilidblkr-blocked'); rs('videoPageAd');
        });
        // 层4: 播放器内
        document.querySelectorAll('.bpx-player-ad,.bpx-ad,.bpx-player-adv-dm-wrap,[class*="player-ad"]').forEach(function(e) {
            if (e.dataset.bilidblkrChecked) return; e.dataset.bilidblkrChecked = '1';
            e.style.display = 'none'; e.classList.add('bilidblkr-blocked'); rs('videoPageAd');
        });
        // 层5: 兜底
        var rl = document.querySelector('.recommend-list-v1 .rec-list') || document.querySelector('.right-container-inner');
        if (rl) rl.querySelectorAll(':scope > *').forEach(function(item) {
            if (item.dataset.bilidblkrChecked || item.dataset.bilidblkrWrap) return; item.dataset.bilidblkrChecked = '1';
            var sps = item.querySelectorAll('span');
            for (var i = 0; i < sps.length; i++) { if ((sps[i].textContent || '').trim() === '广告') { bVP(item); return; } }
            if (hAL(item)) { bVP(item); }
        });
    }

    function cleanAll() { cCarousel(); cLogin(); cBanner(); cFeed(); cVideo(); }

    // Chart.js
    var cL = false, cI = null;
    function ldChart(cb) {
        if (window.Chart) { cL = true; cb(); return; }
        if (document.getElementById('bilidblkr-chartjs')) return;
        var s = document.createElement('script'); s.id = 'bilidblkr-chartjs';
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
        s.onload = function() { cL = true; cb(); }; document.head.appendChild(s);
    }
    function gCC() {
        var dk = window.matchMedia('(prefers-color-scheme:dark)').matches;
        return { t: dk?'rgba(255,255,255,.7)':'rgba(0,0,0,.7)', g: dk?'rgba(255,255,255,.08)':'rgba(0,0,0,.08)', b: ['#F17C67','#FFB11B','#58B2DC','#00AA90','#B481BB'] };
    }

    // 统计面板
    function bHTML() {
        var t = gt(), ae = Object.entries(st.advertiserCounts).sort(function(a,b){return b[1]-a[1];}), ar = '';
        if (ae.length) {
            var cs = ['#F17C67','#FFB11B','#58B2DC','#00AA90','#B481BB','#8B7EC8','#E87C5A','#5DA87D'];
            ae.forEach(function(e,i) {
                var cat = '商业推广'; for (var k in AM) { if (e[0].indexOf(k)!==-1) { cat = AM[k]; break; } }
                ar += '<div class="blkr-ar"><span class="blkr-ad" style="background:'+cs[i%8]+'"></span><span class="blkr-an">'+e[0]+'</span><span class="blkr-ac">'+cat+'</span><span class="blkr-a2">'+e[1]+'次</span></div>';
            });
        }
        return '<div class="blkr-h"><span class="blkr-tt">🛡️ 广告屏蔽统计</span><button class="blkr-cls">✕</button></div>'+
            '<div class="blkr-bd"><div class="blkr-ss">'+
            '<div class="blkr-sc"><div class="blkr-sl">总屏蔽数</div><div class="blkr-sv">'+t+'<span class="blkr-su">个</span></div></div>'+
            '<div class="blkr-sc"><div class="blkr-sl">广告商数</div><div class="blkr-sv">'+ae.length+'<span class="blkr-su">个</span></div></div>'+
            '<div class="blkr-sc"><div class="blkr-sl">信息流占比</div><div class="blkr-sv">'+(t>0?Math.round(st.feedCard/t*100):0)+'<span class="blkr-su">%</span></div></div>'+
            '</div><div class="blkr-cw"><canvas id="bilidblkr-chart"></canvas></div>'+
            '<div class="blkr-tg">'+
            '<div class="blkr-ti"><div class="blkr-tl">信息流</div><div class="blkr-tv" style="color:#F17C67">'+st.feedCard+'</div></div>'+
            '<div class="blkr-ti"><div class="blkr-tl">轮播图</div><div class="blkr-tv" style="color:#FFB11B">'+st.carousel+'</div></div>'+
            '<div class="blkr-ti"><div class="blkr-tl">横幅</div><div class="blkr-tv" style="color:#58B2DC">'+st.topBanner+'</div></div>'+
            '<div class="blkr-ti"><div class="blkr-tl">播放页</div><div class="blkr-tv" style="color:#00AA90">'+st.videoPageAd+'</div></div>'+
            '<div class="blkr-ti"><div class="blkr-tl">弹窗</div><div class="blkr-tv" style="color:#B481BB">'+st.loginPopup+'</div></div>'+
            '</div>'+
            (ar?'<div class="blkr-s2"><div class="blkr-s2t">广告商排行</div><div class="blkr-al">'+ar+'</div></div>':'')+
            (t===0?'<div class="blkr-em">页面干净，暂未检测到广告 🛡️</div>':'')+'</div>';
    }
    function iChart() {
        if (!cL || !window.Chart) return;
        var c = document.getElementById('bilidblkr-chart'); if (!c) return;
        if (cI) cI.destroy();
        var cc = gCC(), m = Math.max(gt()||1,5);
        cI = new window.Chart(c, {
            type:'bar', data:{labels:['信息流','轮播图','横幅','播放页','弹窗'],datasets:[{data:[st.feedCard,st.carousel,st.topBanner,st.videoPageAd,st.loginPopup],backgroundColor:cc.b,borderRadius:8,barThickness:24}]},
            options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(ctx){return '屏蔽: '+ctx.raw+' 个';}}}},scales:{x:{grid:{color:cc.g},ticks:{color:cc.t,font:{size:11}},max:m},y:{grid:{display:false},ticks:{color:cc.t,font:{size:12,weight:'500'}}}}}
        });
    }
    function upPanel() {
        var p = document.querySelector('.bilidblkr-stats-panel');
        if (!p || !p.classList.contains('blkr-vis')) return;
        p.innerHTML = bHTML(); p.querySelector('.blkr-cls').addEventListener('click', hidePanel);
        if (cL) setTimeout(iChart, 50);
    }
    function mkPanel() {
        if (document.querySelector('.bilidblkr-stats-panel')) return;
        var ov = document.createElement('div'); ov.className = 'bilidblkr-stats-overlay'; ov.addEventListener('click', hidePanel);
        var p = document.createElement('div'); p.className = 'bilidblkr-stats-panel'; p.innerHTML = bHTML();
        document.body.appendChild(ov); document.body.appendChild(p);
        p.querySelector('.blkr-cls').addEventListener('click', hidePanel);
    }
    function showPanel() {
        var p = document.querySelector('.bilidblkr-stats-panel'), ov = document.querySelector('.bilidblkr-stats-overlay');
        if (!p) { mkPanel(); p = document.querySelector('.bilidblkr-stats-panel'); ov = document.querySelector('.bilidblkr-stats-overlay'); }
        upPanel(); p.classList.add('blkr-vis'); ov.classList.add('blkr-vis');
        if (cL) setTimeout(iChart, 100);
    }
    function hidePanel() {
        var p = document.querySelector('.bilidblkr-stats-panel'), ov = document.querySelector('.bilidblkr-stats-overlay');
        if (p) p.classList.remove('blkr-vis'); if (ov) ov.classList.remove('blkr-vis');
    }
    function tglPanel() {
        var p = document.querySelector('.bilidblkr-stats-panel');
        (p && p.classList.contains('blkr-vis')) ? hidePanel() : showPanel();
    }

    // 浮动按钮
    function mkBtn() {
        if (document.querySelector('.bilidblkr-stats-btn--top')) return;
        var btn = document.createElement('div'); btn.className = 'bilidblkr-stats-btn--top';
        btn.innerHTML = IS + '<span>统计</span>'; btn.title = '广告屏蔽统计 (累计: ' + gt() + '个)';
        btn.addEventListener('click', function(e) { e.preventDefault(); e.stopPropagation(); tglPanel(); });
        document.body.appendChild(btn);
    }

    // 样式
    function injCSS() {
        var s = document.createElement('style'); s.id = 'bilidblkr-styles-v21';
        s.textContent =
'.bilidblkr-blocked{display:none!important}'+
'.bilidblkr-card{width:100%;height:254px;position:relative;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 4px 12px rgba(0,0,0,.08)}'+
'.bilidblkr-card-back{position:absolute;inset:0;z-index:1;border-radius:8px;overflow:hidden}'+
'.bilidblkr-card-back>*{width:100%;height:100%}'+
'.bilidblkr-card-front{position:absolute;inset:0;z-index:10;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(245,247,250,.78);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border-radius:8px;transition:transform .4s cubic-bezier(.4,0,.2,1),opacity .3s}'+
'.bilidblkr-card-icon{display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.75);box-shadow:0 2px 8px rgba(0,0,0,.1)}'+
'.bilidblkr-card-icon svg{color:#9499a0}'+
'.bilidblkr-card-label{font-size:13px;color:#61666d;font-weight:500;text-align:center}'+
'.bilidblkr-card-name{font-size:11px;color:#9499a0;text-align:center;max-width:80%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'.bilidblkr-card-hint{font-size:11px;color:#9499a0;opacity:.7}'+
'.bilidblkr-card:hover .bilidblkr-card-front{transform:translateY(-100%);opacity:0;pointer-events:none}'+

'.bilidblkr-carousel-overlay{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;background:rgba(245,247,250,.75);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:100;border-radius:6px;transition:opacity .3s}'+
'.bilidblkr-co-icon{display:flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:rgba(255,255,255,.7);box-shadow:0 2px 8px rgba(0,0,0,.1)}'+
'.bilidblkr-co-icon svg{color:#9499a0}'+
'.bilidblkr-co-label{font-size:13px;color:#61666d;font-weight:500}'+
'.bilidblkr-co-hint{font-size:11px;color:#9499a0;opacity:.7}'+
'.bilidblkr-carousel-overlay:hover{opacity:0;pointer-events:none}'+

'.bilidblkr-popup-bar{display:flex;align-items:center;justify-content:center;gap:6px;padding:6px 14px;font-size:12px;color:#9499a0;background:#fafbfc;border:1px dashed #e0e3e8;border-radius:6px;margin:4px 0}'+
'.bilidblkr-popup-bar svg{color:#c9ccd0;flex-shrink:0}'+
'.bilidblkr-popup-bar--banner{padding:8px 18px}'+

'.bilidblkr-vpad-bar{display:flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;padding:6px 10px!important;font-size:12px!important;color:#9499a0!important;background:#fafbfc!important;border:1px dashed #e0e3e8!important;border-radius:6px!important;margin:2px 0!important}'+
'.bilidblkr-vpad-bar svg{color:#c9ccd0;flex-shrink:0}'+
'.bilidblkr-vpad-name{color:#9499a0!important;opacity:.7!important;font-size:11px!important}'+

'.bilidblkr-stats-btn--top{position:fixed!important;bottom:96px!important;right:16px!important;z-index:99990!important;display:inline-flex!important;align-items:center!important;gap:5px!important;padding:8px 14px!important;font-size:13px!important;color:#61666d!important;cursor:pointer!important;border-radius:16px!important;background:#FEFDFC!important;box-shadow:0 2px 8px rgba(0,0,0,.12)!important;transition:color .2s,box-shadow .2s!important;user-select:none!important;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif!important;line-height:1!important;border:none!important;margin:0!important;width:auto!important;height:auto!important}'+
'.bilidblkr-stats-btn--top:hover{color:#E58522!important;box-shadow:0 4px 16px rgba(0,0,0,.18)!important}'+
'.bilidblkr-stats-btn--top svg{flex-shrink:0;width:16px;height:16px}'+
'.bilidblkr-stats-btn--top span{display:inline}'+

'.bilidblkr-stats-overlay{position:fixed!important;inset:0!important;z-index:99998!important;background:rgba(0,0,0,.3)!important;opacity:0!important;pointer-events:none!important;transition:opacity .25s!important;margin:0!important;padding:0!important;border:none!important}'+
'.bilidblkr-stats-overlay.blkr-vis{opacity:1!important;pointer-events:auto!important}'+

'.bilidblkr-stats-panel{--c1:rgba(0,0,0,.8);--c2:rgba(0,0,0,.5);--c3:rgba(0,0,0,.35);--c4:rgba(0,0,0,.04);--c8:rgba(0,0,0,.08);--bg:#FEFDFC;position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-50%) scale(.92)!important;z-index:99999!important;width:460px!important;max-height:88vh!important;overflow-y:auto!important;background:var(--bg)!important;border-radius:14px!important;box-shadow:0 8px 40px rgba(0,0,0,.16),0 0 0 1px rgba(0,0,0,.04)!important;opacity:0!important;pointer-events:none!important;transition:opacity .25s,transform .25s!important;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif!important;margin:0!important;padding:0!important;border:none!important}'+
'@media(prefers-color-scheme:dark){.bilidblkr-stats-panel{--c1:rgba(255,255,255,.8);--c2:rgba(255,255,255,.5);--c3:rgba(255,255,255,.35);--c4:rgba(255,255,255,.04);--c8:rgba(255,255,255,.08);--bg:#332D28}}'+
'.bilidblkr-stats-panel.blkr-vis{opacity:1!important;pointer-events:auto!important;transform:translate(-50%,-50%) scale(1)!important}'+

'.blkr-h{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid var(--c8);position:sticky;top:0;background:var(--bg);border-radius:14px 14px 0 0;z-index:2}'+
'.blkr-tt{font-size:16px;font-weight:600;color:var(--c1)}'+
'.blkr-cls{width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:none;background:none;font-size:16px;color:var(--c2);cursor:pointer;border-radius:6px}'+
'.blkr-cls:hover{background:var(--c8);color:var(--c1)}'+
'.blkr-bd{padding:16px 20px 20px}'+
'.blkr-em{text-align:center;padding:20px;color:var(--c2);font-size:14px}'+
'.blkr-ss{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px}'+
'.blkr-sc{background:var(--c4);border-radius:10px;padding:12px 10px;text-align:center}'+
'.blkr-sl{font-size:11px;color:var(--c2);margin-bottom:2px}'+
'.blkr-sv{font-size:22px;line-height:1;font-weight:500;color:var(--c1)}'+
'.blkr-su{font-size:13px;font-weight:400;color:var(--c2)}'+
'.blkr-cw{position:relative;width:100%;height:200px;margin-bottom:12px}'+
'.blkr-tg{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:4px}'+
'.blkr-ti{text-align:center}'+
'.blkr-tl{font-size:11px;color:var(--c2)}'+
'.blkr-tv{font-size:14px;font-weight:500}'+
'.blkr-s2{margin-top:14px}'+
'.blkr-s2t{font-size:13px;font-weight:600;color:var(--c1);margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--c8)}'+
'.blkr-al{display:flex;flex-direction:column;gap:4px}'+
'.blkr-ar{display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--c4);border-radius:6px;font-size:12px}'+
'.blkr-ar:hover{background:var(--c8)}'+
'.blkr-ad{width:8px;height:8px;border-radius:50%;flex-shrink:0}'+
'.blkr-an{flex:1;color:var(--c1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
'.blkr-ac{color:var(--c3);font-size:11px;flex-shrink:0}'+
'.blkr-a2{color:#F3A04C;font-weight:600;flex-shrink:0}';

        document.head.appendChild(s);
    }

    // 初始化
    injCSS();
    ldChart(function() { console.log('[B站广告屏蔽 v21] Chart.js 就绪'); });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', cleanAll);
    else cleanAll();

    [500,1000,2000,3000,5000,8000].forEach(function(d) { setTimeout(cleanAll, d); });

    mkBtn();
    window.__bilidblkr_topInterval = setInterval(mkBtn, 1000);

    var dbT;
    var obs = new MutationObserver(function(ms) {
        for (var i = 0; i < ms.length; i++) {
            if (ms[i].addedNodes.length > 0) {
                clearTimeout(dbT); dbT = setTimeout(cleanAll, 400); break;
            }
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });

    console.log('[B站广告屏蔽 v21] 已就绪 - 浮动按钮 | 播放页5层检测 | localStorage | ' + Object.keys(AM).length + ' 广告商');
})();