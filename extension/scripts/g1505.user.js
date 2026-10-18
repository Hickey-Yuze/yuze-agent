(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args){
      var styleId='bpa-style-v5';
      if(document.getElementById(styleId))document.getElementById(styleId).remove();
      var mountHead=document.head||document.documentElement;
      var mountBody=document.body||document.documentElement;
      if(!mountHead||!mountBody)throw new Error('页面还没有可注入的 DOM 节点，请稍后再试');
      var st=document.createElement('style');st.id=styleId;
      var loadingDelay=1200;
      st.textContent=[
        ':root{--pk:#ff7fa6;--co:#8a70d6;--yw:#ffe6a6;--sk:#cfdcff;--pe:#ffd9e9;--lv:#ddd2ff;--tx:#3f334d;--tl:#81728e;--line:rgba(255,255,255,.62);--paper:#fff8ee;--surface:rgba(255,255,255,.68);--soft:rgba(255,246,212,.58);--glass:linear-gradient(135deg,rgba(255,255,255,.56),rgba(255,244,251,.36),rgba(246,241,255,.32));--glass-warm:linear-gradient(135deg,rgba(255,255,255,.56),rgba(255,249,226,.34),rgba(255,241,248,.3));--glass-lav:linear-gradient(135deg,rgba(255,255,255,.56),rgba(246,241,255,.42),rgba(255,244,251,.28));--glass-line:linear-gradient(90deg,rgba(255,127,166,.08),rgba(191,174,255,.56),rgba(255,217,133,.34));--hd:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}',
        '.bpa-float-btn{position:fixed;right:24px;bottom:80px;width:56px;height:56px;border-radius:18px;background:linear-gradient(135deg,rgba(255,127,166,.88),rgba(210,195,255,.9),rgba(255,230,166,.92));border:1px solid rgba(255,255,255,.74);box-shadow:0 16px 42px rgba(167,132,216,.28),0 8px 24px rgba(255,127,166,.18);cursor:pointer;z-index:2147483647;display:flex;align-items:center;justify-content:center;transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;animation:bpa-breathe 4s ease-in-out infinite;backdrop-filter:blur(14px) saturate(150%)}',
        '.bpa-float-btn:hover{transform:translateY(-2px);filter:saturate(1.08);box-shadow:0 20px 48px rgba(167,132,216,.34),0 10px 28px rgba(255,127,166,.22)}',
        '.bpa-float-btn svg{width:26px;height:26px;fill:#fffdfb;filter:drop-shadow(0 2px 5px rgba(94,61,126,.18))}','@keyframes bpa-breathe{0%,100%{box-shadow:0 16px 42px rgba(167,132,216,.25),0 8px 24px rgba(255,127,166,.16)}50%{box-shadow:0 20px 54px rgba(255,230,166,.36),0 12px 34px rgba(255,127,166,.24)}}',
        '.bpa-overlay{position:fixed;inset:0;background:radial-gradient(ellipse at 18% 18%,rgba(255,217,233,.72),transparent 46%),radial-gradient(ellipse at 84% 20%,rgba(221,210,255,.7),transparent 48%),radial-gradient(ellipse at 50% 92%,rgba(255,230,166,.66),transparent 50%),rgba(255,250,247,.5);backdrop-filter:blur(16px) saturate(145%);z-index:2147483646;display:flex;align-items:center;justify-content:center}',
        '.bpa-card{background:var(--surface);border-radius:24px;width:440px;max-width:94vw;max-height:90vh;overflow-y:auto;border:1px solid rgba(255,255,255,.72);box-shadow:0 30px 80px rgba(127,95,162,.22),0 12px 34px rgba(255,127,166,.14),inset 0 1px 0 rgba(255,255,255,.9);animation:bpa-pop .28s cubic-bezier(.16,1,.3,1);font-family:var(--hd);position:relative;color:var(--tx);backdrop-filter:blur(24px) saturate(155%)}',
        '@keyframes bpa-pop{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}',
        '.bpa-header{padding:28px 24px 20px;text-align:center;position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(255,230,166,.42),rgba(255,217,233,.38),rgba(221,210,255,.42));border-radius:24px 24px 0 0;border-bottom:1px solid rgba(255,255,255,.58)}',
        '.bpa-header::before{content:"";position:absolute;inset:0;background:linear-gradient(115deg,rgba(255,255,255,.62),rgba(255,255,255,.08) 38%,rgba(255,255,255,.38));opacity:.8}',
        '.bpa-header::after{content:"";position:absolute;bottom:14px;left:24px;right:24px;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.9),transparent);opacity:.75}',
        '.bpa-header-inner{position:relative;z-index:1}',
        '.bpa-avatar-wrap{width:70px;height:70px;margin:0 auto 14px;border-radius:20px;background:rgba(255,255,255,.54);display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.78);box-shadow:0 12px 28px rgba(167,132,216,.16),inset 0 1px 0 rgba(255,255,255,.9);backdrop-filter:blur(14px) saturate(150%)}',
        '.bpa-avatar-text{font-size:32px}',
        '.bpa-type-label{font-size:11px;color:#8f74d9;letter-spacing:.8px;margin-bottom:7px;font-weight:650}',
        '.bpa-type-name{font-family:var(--hd);font-size:26px;font-weight:600;color:var(--tx);line-height:1.25;letter-spacing:0;text-shadow:0 1px 0 rgba(255,255,255,.65)}',
        '.bpa-subtitle{margin-top:7px;font-size:13px;color:var(--tl);line-height:1.55}',
        '.bpa-stats{padding:14px 18px;background:rgba(255,255,255,.28);border-bottom:1px solid rgba(255,255,255,.52);backdrop-filter:blur(12px)}',
        '.bpa-stat-sentence{text-align:center;font-size:13px;line-height:1.9;color:var(--tl);background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.72);border-radius:16px;padding:9px 12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.72)}',
        '.bpa-stat-flower{display:inline-block;margin:0 3px;font-family:var(--hd);font-size:28px;font-weight:760;line-height:1;color:transparent;background:linear-gradient(135deg,#ff6f9c,#bfaeff,#ffd985);-webkit-background-clip:text;background-clip:text;text-shadow:0 8px 22px rgba(255,127,166,.18)}',
        '.bpa-body{padding:17px 20px 22px}',
        '.bpa-section-title{font-family:var(--hd);font-size:16px;font-weight:600;color:var(--tx);margin-bottom:11px;display:flex;align-items:center;gap:7px}',
        '.bpa-dim-list{display:flex;flex-direction:column;gap:8px;margin-bottom:4px}','.bpa-dim-row{display:flex;align-items:center;gap:7px}',
        '.bpa-dim-label{width:72px;font-size:11.5px;color:var(--tx);flex-shrink:0;font-weight:650}',
        '.bpa-bar-wrap{flex:1;height:20px;background:rgba(255,255,255,.38);border-radius:999px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.72);box-shadow:inset 0 1px 6px rgba(137,105,166,.08)}',
        '.bpa-bar-fill{height:100%;border-radius:999px;transition:width .75s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;justify-content:flex-end;padding-right:7px;font-size:10px;font-weight:750;color:#fff;min-width:28px;box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}',
        '.bpa-bar-fill.high{background:linear-gradient(90deg,#ff7fa6,#d9c8ff)}','.bpa-bar-fill.mid{background:linear-gradient(90deg,#ffd584,#ff9fbf)}','.bpa-bar-fill.low{background:linear-gradient(90deg,#ddd2ff,#f7d8ec);color:#6b5b78}',
        '.bpa-dim-pct{width:44px;text-align:right;font-size:11.5px;font-weight:700;color:var(--tx);flex-shrink:0}',
        '.bpa-dim-hint{font-size:10px;color:var(--tl);margin-top:-4px;margin-bottom:11px;font-style:italic}',
        '.bpa-dim-card{padding:10px 0 11px;border-bottom:1px solid rgba(255,255,255,.56)}',
        '.bpa-dim-card:last-child{border-bottom:none}',
        '.bpa-dim-main{display:flex;align-items:center;gap:7px}',
        '.bpa-dim-desc{margin:5px 48px 6px 79px;font-size:10.8px;line-height:1.55;color:var(--tl)}',
        '.bpa-dim-examples{margin-left:79px;display:flex;flex-direction:column;gap:4px}',
        '.bpa-dim-example{font-size:10.6px;line-height:1.45;color:var(--tx);background:rgba(255,255,255,.42);border:1px solid rgba(255,255,255,.66);border-radius:10px;padding:4px 7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(10px)}',
        '.bpa-tags{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:13px}',
        '.bpa-tag{padding:4px 12px;border-radius:999px;font-size:11px;font-weight:500;background:rgba(255,255,255,.4);color:var(--tx);border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(10px)}',
        '.bpa-tag.highlight{background:rgba(255,217,233,.58);color:#f05f90;border-color:rgba(255,255,255,.78);font-weight:650}',
        /* ====== v5: 多种便签卡片样式 ====== */
        '.bpa-insights{margin-top:15px}',
        '.bpa-insight-item{background:var(--glass);border:1px solid rgba(255,255,255,.74);border-radius:16px;padding:12px 14px;margin-bottom:9px;position:relative;box-shadow:0 10px 24px rgba(143,116,217,.08),inset 0 1px 0 rgba(255,255,255,.62);backdrop-filter:blur(16px) saturate(150%)}',
        '.bpa-insight-item::before{content:"";position:absolute;top:12px;right:14px;width:36px;height:1px;background:var(--glass-line);opacity:.66}',
        '.bpa-insight-head{display:flex;align-items:center;gap:6px;margin-bottom:5px}',
        '.bpa-insight-icon{font-size:16px}',
        '.bpa-insight-title{font-family:var(--hd);font-size:13.6px;font-weight:650;color:var(--co)}',
        '.bpa-insight-desc{font-size:12px;line-height:1.72;color:var(--tx)}',
        /* 蓝色：数据型洞察 */
        '.bpa-insight-blue{background:var(--glass-lav);border:1px solid rgba(255,255,255,.74);border-radius:16px;padding:12px 14px;margin-bottom:9px;position:relative;box-shadow:0 10px 24px rgba(143,116,217,.08),inset 0 1px 0 rgba(255,255,255,.62);backdrop-filter:blur(16px) saturate(150%)}',
        '.bpa-insight-blue::before{content:"";position:absolute;top:12px;right:14px;width:36px;height:1px;background:var(--glass-line);opacity:.58}',
        '.bpa-insight-blue .bpa-insight-title{color:var(--co)}','.bpa-insight-blue .bpa-insight-desc{color:var(--tx)}',
        /* 绿色：趣味型洞察 */
        '.bpa-insight-green{background:var(--glass);border:1px solid rgba(255,255,255,.74);border-radius:16px;padding:12px 14px;margin-bottom:9px;position:relative;box-shadow:0 10px 24px rgba(143,116,217,.08),inset 0 1px 0 rgba(255,255,255,.62);backdrop-filter:blur(16px) saturate(150%)}',
        '.bpa-insight-green::before{content:"";position:absolute;top:12px;right:14px;width:36px;height:1px;background:var(--glass-line);opacity:.58}',
        '.bpa-insight-green .bpa-insight-title{color:var(--co)}','.bpa-insight-green .bpa-insight-desc{color:var(--tx)}',
        /* 紫色：深度洞察 */
        '.bpa-insight-purple{background:var(--glass-lav);border:1px solid rgba(255,255,255,.76);border-radius:16px;padding:12px 14px;margin-bottom:9px;position:relative;box-shadow:0 10px 24px rgba(143,116,217,.1),inset 0 1px 0 rgba(255,255,255,.64);backdrop-filter:blur(16px) saturate(150%)}',
        '.bpa-insight-purple::before{content:"";position:absolute;top:12px;right:14px;width:36px;height:1px;background:var(--glass-line);opacity:.68}',
        '.bpa-insight-purple .bpa-insight-title{color:var(--co)}','.bpa-insight-purple .bpa-insight-desc{color:var(--tx)}',
        /* 人格解读 */
        '.bpa-desc{background:var(--glass-warm);border:1px solid rgba(255,255,255,.76);border-radius:16px;padding:14px 15px;font-size:12.5px;line-height:1.82;color:var(--tx);margin-top:4px;position:relative;box-shadow:0 10px 24px rgba(143,116,217,.08),inset 0 1px 0 rgba(255,255,255,.62);backdrop-filter:blur(16px) saturate(150%)}',
        '.bpa-desc::before{content:"";position:absolute;top:12px;right:14px;width:36px;height:1px;background:var(--glass-line);opacity:.66}',
        '.bpa-hidden-insight{background:linear-gradient(135deg,rgba(255,255,255,.6),rgba(255,217,233,.45),rgba(221,210,255,.45),rgba(255,246,214,.28));color:var(--tx);border:1px solid rgba(255,255,255,.78);border-radius:18px;padding:15px 16px;margin-top:9px;position:relative;box-shadow:0 16px 36px rgba(143,116,217,.14),inset 0 1px 0 rgba(255,255,255,.68);backdrop-filter:blur(18px) saturate(150%)}',
        '.bpa-hidden-insight::before{content:"";position:absolute;top:12px;right:14px;width:40px;height:1px;background:var(--glass-line);opacity:.7}',
        '.bpa-hidden-line{display:flex;align-items:center;gap:8px;font-size:11px;color:#756686;margin-bottom:9px;flex-wrap:wrap}',
        '.bpa-hidden-desc{font-family:var(--hd);font-size:12.5px;line-height:1.82;color:var(--tx)}',
        '.bpa-footer{padding:13px 18px 18px;display:flex;gap:10px}',
        '.bpa-btn{flex:1;padding:10px 0;border-radius:14px;border:1px solid rgba(255,255,255,.7);font-size:13px;font-weight:650;cursor:pointer;transition:transform .18s ease,box-shadow .18s ease,filter .18s ease;font-family:inherit;backdrop-filter:blur(12px) saturate(145%)}',
        '.bpa-btn-primary{background:linear-gradient(135deg,#ff7fa6,#bfaeff,#ffd985);color:#fff;box-shadow:0 12px 26px rgba(255,127,166,.22);border-color:rgba(255,255,255,.74);text-shadow:0 1px 2px rgba(88,52,120,.18)}',
        '.bpa-btn-primary:hover{transform:translateY(-1px);filter:saturate(1.07);box-shadow:0 14px 30px rgba(255,127,166,.26)}',
        '.bpa-btn-secondary{background:rgba(255,255,255,.5);color:var(--tl);border-color:rgba(255,255,255,.72)}','.bpa-btn-secondary:hover{background:rgba(255,255,255,.64);transform:translateY(-1px)}',
        '.bpa-loading-wrap{text-align:center;padding:42px 20px}',
        '.bpa-spinner{width:40px;height:40px;border:4px solid rgba(255,255,255,.58);border-top-color:var(--pk);border-right-color:#d6c7ff;border-radius:50%;animation:bpa-sp .75s linear infinite;margin:0 auto 13px;box-shadow:0 8px 24px rgba(255,127,166,.16)}','@keyframes bpa-sp{to{transform:rotate(360deg)}}',
        '.bpa-loading-text{font-family:var(--hd);font-size:14.5px;color:#7f63c9;line-height:1.65}',
        '.bpa-tip-panel{padding:22px;text-align:center}','.bpa-tip-icon{font-size:46px;margin-bottom:11px}',
        '.bpa-tip-title{font-family:var(--hd);font-size:18px;font-weight:600;color:var(--tx);margin-bottom:9px}',
        '.bpa-tip-desc{font-size:12px;color:var(--tl);line-height:1.68;margin-bottom:15px;text-align:left}',
        '.bpa-textarea{width:100%;min-height:105px;border:1px solid rgba(255,255,255,.72);border-radius:14px;padding:12px;font-size:12px;font-family:inherit;resize:vertical;outline:none;transition:all .2s;box-sizing:border-box;margin-bottom:13px;color:var(--tx);background:rgba(255,255,255,.48);backdrop-filter:blur(12px)}',
        '.bpa-textarea:focus{border-color:rgba(255,127,166,.55);background:rgba(255,255,255,.62);box-shadow:0 0 0 4px rgba(255,127,166,.12)}',
        '.bpa-close{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:12px;border:1px solid rgba(255,255,255,.72);background:rgba(255,255,255,.5);color:var(--tl);font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .18s;z-index:10;backdrop-filter:blur(12px);box-shadow:0 8px 20px rgba(167,132,216,.12)}',
        '.bpa-close:hover{background:rgba(255,255,255,.68);color:var(--tx)}',
        '.bpa-bookmark-preview{max-height:120px;overflow-y:auto;background:rgba(255,255,255,.4);border-radius:13px;padding:8px 12px;margin-bottom:11px;border:1px solid rgba(255,255,255,.7);backdrop-filter:blur(12px)}',
        '.bpa-bm-item{font-size:11px;color:var(--tx);padding:3px 0;border-bottom:1px solid rgba(255,255,255,.54);display:flex;align-items:center;gap:6px}','.bpa-bm-item:last-child{border-bottom:none}',
        '.bpa-bm-dot{width:5px;height:5px;border-radius:50%;background:var(--pk);flex-shrink:0}'
      ].join('\n');
      mountHead.appendChild(st);
    
      ['bpa-float-btn-v5','bpa-overlay-v5'].forEach(function(id){var el=document.getElementById(id);if(el)el.remove()});
      var btn=document.createElement('button');btn.id='bpa-float-btn-v5';btn.className='bpa-float-btn';
      btn.innerHTML='<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
      mountBody.appendChild(btn);
    
      // ==================== 分析引擎 v5 ====================
      function analyzePersonality(bookmarks){
        var totalItems=bookmarks.length;if(totalItems===0)return null;
        var items=bookmarks.map(function(b){
          var title=(b.title||'').trim();
          return{title:title,langTitle:b.langTitle!=null?String(b.langTitle).trim():title,url:(b.url||''),fullText:((b.title||'')+' '+(b.url||'')).toLowerCase()};
        });
    
        // ---- 5类内容占比：每条收藏只归入一个主维度，百分比总和严格等于100 ----
        var dimDefs=[
          {key:'deepRead',icon:'📖',label:'深度阅读',desc:'长文、报告、书单——需要时间消化的',kws:['article','blog','post','report','whitepaper','paper','research','study','book','books','reading','essay','longform','newsletter','substack','medium','arxiv','scholar','wiki','wikipedia','course','lecture','tutorial','guide','docs','documentation','manual','pdf','epub','长文','文章','报告','白皮书','论文','研究','书单','读书','阅读','课程','教程','指南','文档','手册','资料','知识','学习','笔记','得到','微信读书','kindle','豆瓣读书','知乎专栏']},
          {key:'quickTool',icon:'⚡',label:'即用工具',desc:'网站、App、插件——马上能用的',kws:['tool','tools','generator','converter','calculator','editor','plugin','extension','chrome extension','download','template','templates','api','sdk','github','npm','vercel','supabase','notion','figma','canva','chatgpt','claude','gemini','cursor','copilot','huggingface','runway','suno','工具','插件','扩展','应用','网站','生成器','转换器','编辑器','下载','模板','接口','开源','代码','开发','部署','调试','提示词','ai工具','大模型']},
          {key:'visualTaste',icon:'🎨',label:'视觉审美',desc:'图片、设计、视频——感官导向的',kws:['image','photo','photos','video','movie','design','art','dribbble','behance','pinterest','unsplash','pixabay','youtube','bilibili','vimeo','instagram','tiktok','douyin','canva','figma','sketch','adobe','photoshop','illustrator','iconfont','font','palette','color','logo','poster','banner','ui','ux','图片','照片','摄影','视频','电影','设计','艺术','审美','视觉','灵感','素材','插画','配色','字体','图标','排版','海报','封面','小红书','穿搭','家居','装修','美妆']},
          {key:'opinionTalk',icon:'💬',label:'观点碰撞',desc:'评论、讨论、社交内容——思想导向的',kws:['comment','comments','discussion','forum','community','reddit','twitter','x.com','weibo','zhihu','douban','v2ex','hacker news','news.ycombinator','discord','telegram','slack','thread','threads','social','podcast','interview','opinion','review','问答','评论','讨论','论坛','社区','社交','观点','访谈','播客','微博','知乎','豆瓣','贴吧','小组','争议','吐槽','测评','对谈']},
          {key:'todoList',icon:'📦',label:'待办清单',desc:'想买、想看、想去——计划导向的',kws:['wishlist','watchlist','todo','to-do','bucket list','travel','trip','hotel','flight','booking','airbnb','map','maps','restaurant','recipe','shop','shopping','buy','cart','deal','coupon','discount','taobao','jd.com','tmall','amazon','pinduoduo','steam','netflix','playlist','想买','想看','想去','待办','清单','计划','攻略','旅游','旅行','酒店','机票','地图','餐厅','美食','菜谱','购物','淘宝','京东','天猫','拼多多','优惠','比价','好物','收藏备用','以后','改天','下次','周末','假期']}
        ];
        var dimResults={},dimIndex={};
        for(var di=0;di<dimDefs.length;di++){
          var dim=dimDefs[di];dimIndex[dim.key]=di;
          dimResults[dim.key]={icon:dim.icon,label:dim.label,desc:dim.desc,key:dim.key,rawHits:0,percentage:0,matched:[]};
        }
        function hostOf(url){try{if(!url)return'';return(url.indexOf('http')===0?new URL(url):new URL('https://'+url)).hostname.replace('www.','').toLowerCase()}catch(e){return''}}
        function addScore(scores,key,n){scores[key]=(scores[key]||0)+n}
        var hostCache={};
        function fastHost(url){if(!url)return'';if(hostCache[url])return hostCache[url];var h='';try{var m=String(url).match(/^(?:https?:\/\/)?(?:www\.)?([^\/?#]+)/i);h=m?m[1].toLowerCase():''}catch(e){}hostCache[url]=h;return h}
        function titleForLanguage(item){
          var t=(item.langTitle!=null?item.langTitle:item.title||'').trim();
          if(!t)return'';
          t=t.replace(/https?:\/\/\S+/gi,' ').trim();
          if(!t)return'';
          var host=fastHost(item.url).replace(/^www\./,'');
          var plain=t.replace(/^https?:\/\//i,'').replace(/^www\./i,'').replace(/[\/?#].*$/,'').trim();
          if(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(plain))return'';
          if(host&&plain.toLowerCase()===host.toLowerCase())return'';
          return t;
        }
        function matchScore(text,kws){var s=0;for(var ki=0;ki<kws.length;ki++){if(text.indexOf(kws[ki])!==-1)s+=1}return s}
        for(var i=0;i<items.length;i++){
          var item=items[i],text=item.fullText,url=(item.url||'').toLowerCase(),title=(item.title||''),host=fastHost(item.url);
          var scores={deepRead:0,quickTool:0,visualTaste:0,opinionTalk:0,todoList:0};
          for(var si=0;si<dimDefs.length;si++)scores[dimDefs[si].key]+=matchScore(text,dimDefs[si].kws);
          if(title.length>=28)addScore(scores,'deepRead',1);
          if(/\/(article|post|blog|news|report|paper|book|read|learn|guide|tutorial|docs?|manual)(\/|$|\?|#)/.test(url))addScore(scores,'deepRead',2);
          if(/\.(pdf|epub|mobi)(\?|#|$)/.test(url))addScore(scores,'deepRead',3);
          if(/(github\.com|npmjs\.com|vercel\.app|supabase\.com|figma\.com|notion\.so|chrome\.google\.com|chromewebstore\.google\.com|marketplace\.visualstudio\.com)/.test(host))addScore(scores,'quickTool',2);
          if(/(tool|tools|plugin|extension|generator|converter|editor|calculator|download|template|api|sdk)/.test(url))addScore(scores,'quickTool',2);
          if(/\.(png|jpe?g|gif|webp|svg|mp4|mov|webm)(\?|#|$)/.test(url))addScore(scores,'visualTaste',3);
          if(/(youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|xiaohongshu\.com|instagram\.com|tiktok\.com|douyin\.com|behance\.net|dribbble\.com|pinterest\.)/.test(host))addScore(scores,'visualTaste',2);
          if(/(zhihu\.com|douban\.com|reddit\.com|twitter\.com|x\.com|weibo\.com|v2ex\.com|news\.ycombinator\.com)/.test(host))addScore(scores,'opinionTalk',2);
          if(/(comment|discussion|forum|thread|topic|community|question|answer|review)/.test(url))addScore(scores,'opinionTalk',2);
          if(/(taobao\.com|jd\.com|tmall\.com|amazon\.|pinduoduo\.com|booking\.com|airbnb\.|ctrip\.com|trip\.com|amap\.com|maps\.google|steam|netflix)/.test(host))addScore(scores,'todoList',2);
          if(/(wishlist|watchlist|cart|buy|deal|coupon|discount|travel|trip|hotel|flight|recipe|攻略|清单|想买|想看|想去|待办|以后|下次)/.test(text))addScore(scores,'todoList',2);
          var bestKey=dimDefs[0].key,bestScore=-1;
          for(var bi=0;bi<dimDefs.length;bi++){var dk=dimDefs[bi].key;if(scores[dk]>bestScore){bestScore=scores[dk];bestKey=dk}}
          if(bestScore<=0){
            if(title.length>=22)bestKey='deepRead';
            else if(/(search|list|category|map|shop|travel|buy)/.test(url))bestKey='todoList';
            else if(item.url)bestKey='quickTool';
            else bestKey='deepRead';
          }
          dimResults[bestKey].rawHits++;
          if(dimResults[bestKey].matched.length<3){
            var exTitle=title||host||'(空标题)';
            dimResults[bestKey].matched.push(exTitle.substring(0,46)+(host?'（'+host+'）':''));
          }
        }
        var pctParts=[],floorSum=0;
        for(var pi=0;pi<dimDefs.length;pi++){
          var pd=dimResults[dimDefs[pi].key],raw=totalItems>0?(pd.rawHits/totalItems)*100:0,base=Math.floor(raw);
          pd.percentage=base;floorSum+=base;pctParts.push({key:pd.key,rem:raw-base,count:pd.rawHits});
        }
        pctParts.sort(function(a,b){return b.rem-a.rem||b.count-a.count||dimIndex[a.key]-dimIndex[b.key]});
        for(var ri=0;ri<100-floorSum;ri++)dimResults[pctParts[ri%pctParts.length].key].percentage++;
        for(var li=0;li<dimDefs.length;li++){var ld=dimResults[dimDefs[li].key];ld.level=ld.percentage>=25?'high':(ld.percentage>=8?'mid':'low');}
        var sortedDims=Object.values(dimResults).sort(function(a,b){return b.percentage-a.percentage});
        var primary=sortedDims[0];var secondary=sortedDims[1];
    
        // ---- 域名统计 ----
        var domainCounts={};var httpCount=0;var httpsCount=0;
        for(var mi=0;mi<items.length;mi++){
          var u=items[mi].url;if(!u)continue;
          if(u.indexOf('http://')===0)httpCount++;
          else if(u.indexOf('https://')===0)httpsCount++;
          try{
            var h=u.indexOf('http')===0?new URL(u):new URL('https://'+u);
            var hn=h.hostname.replace('www.','');
            domainCounts[hn]=(domainCounts[hn]||0)+1;
          }catch(e){}
        }
        var topDomains=Object.entries(domainCounts).sort(function(a,b){return b[1]-a[1]}).slice(0,5);
        var allDomains=Object.entries(domainCounts);
    
        // ---- v5 保留：4个行为洞察 ----
    
        // 1. 🌍 语言偏好：按收藏标题的主表达统计，避免英文产品名按字母长度放大
        var chineseCharCount=0;var englishCharCount=0,chineseTitleCount=0,englishTitleCount=0;
        for(var ei=0;ei<items.length;ei++){
          var et=titleForLanguage(items[ei]);
          var titleCn=0,titleEn=0;
          for(var eci=0;eci<et.length;eci++){
            var ec=et.charCodeAt(eci);
            if((ec>=0x4E00&&ec<=0x9FFF)||(ec>=0x3400&&ec<=0x4DBF)||(ec>=0xF900&&ec<=0xFAFF)||(ec>=0x2F800&&ec<=0x2FA1F)){chineseCharCount++;titleCn++;}
            else if((ec>=65&&ec<=90)||(ec>=97&&ec<=122)){englishCharCount++;titleEn++;}
          }
          if(titleCn>0)chineseTitleCount++;
          else if(titleEn>0)englishTitleCount++;
        }
        var totalAlpha=chineseCharCount+englishCharCount;
        var rawChineseRate=totalAlpha>0?Math.round((chineseCharCount/totalAlpha)*100):50;
        var totalLangTitles=chineseTitleCount+englishTitleCount;
        var chineseRate=totalLangTitles>0?Math.round((chineseTitleCount/totalLangTitles)*100):rawChineseRate;
        var langLabel,chinaLangDesc;
        if(chineseRate>=75){langLabel='中文主场型';chinaLangDesc='按标题来看，'+chineseRate+'% 的收藏带中文表达。你的信息入口明显更偏中文语境，也更擅长在熟悉的语言环境里筛出真正有用的东西。'}
        else if(chineseRate>=45){langLabel='中西合璧型';chinaLangDesc='按标题来看，'+chineseRate+'% 带中文表达、'+(100-chineseRate)+'% 是纯英文标题。你的信息来源很均衡，像自带双语雷达。'}
        else{langLabel='英文雷达型';chinaLangDesc='按标题来看，'+(100-chineseRate)+'% 是纯英文标题。你的信息入口更偏英文语境，习惯直接接触更广阔的信息源。'}
    
        // 3. 📊 域名忠诚度（HHI简化版）
        var hhi=0;
        for(var hi=0;hi<allDomains.length;hi++){
          var share=allDomains[hi][1]/totalItems;
          hhi+=share*share;
        }
        var loyaltyScore=Math.round(hhi*10000)/100; // 0~10000
        var loyLabel,loyDesc;
        if(loyaltyScore>=2500){loyLabel='死忠粉';loyDesc='域名集中度高达 '+loyaltyScore+'/10000！你对少数几个网站有着近乎偏执的热爱。如果这些网站倒闭了，你的收藏夹会塌掉半边天。'}
        else if(loyaltyScore>=1000){loyLabel='稳定型收藏家';loyDesc='集中度 '+loyaltyScore+'/10000，你有几个核心阵地，但也不排斥探索新网站。属于「有根据地也有探险」的类型。'}
        else{loyLabel='花花公子型';loyDesc='集中度仅 '+loyaltyScore+'/10000！你的收藏遍布各大网站，没有特别固定的阵营。今天逛这个明天刷那个，非常随性。'}
    
        // 4. 🔗 链接年代感（http vs https）
        var securePct=httpCount+httpsCount>0?Math.round((httpsCount/(httpCount+httpsCount))*100):100;
        var eraLabel,eraDesc;
        if(httpCount===0){eraLabel='现代收藏家';eraDesc='100% 都是 HTTPS 安全链接！你的收藏习惯很现代，要么是最近才开始系统收藏，要么早就淘汰了不安全的旧链接。'}
        else if(securePct>=85){eraLabel='与时俱进型';eraDesc=securePct+'% HTTPS，少量 HTTP 遗留。你大概率是在近几年开始认真管理收藏夹的，整体很健康。'}
        else if(securePct>=50){eraLabel='资深网龄型';eraDesc='HTTPS 占 '+securePct+'%，还有不少 HTTP 老链接。你的收藏跨度可能有好几年了，见证过互联网的安全升级史。'}
        else{eraLabel='活化石级';eraDesc='HTTPS 只有 '+securePct+'%！你的收藏夹里躺着大量 HTTP 时代的古董链接。你不是一般的资深网民，你是互联网考古学家。';}

        // 5. 🔁 行动转化倾向
        var drPct=dimResults.deepRead.percentage,qtPct=dimResults.quickTool.percentage,tdPct=dimResults.todoList.percentage,vtPct=dimResults.visualTaste.percentage,opPct=dimResults.opinionTalk.percentage;
        var actionLabel,actionDesc;
        if(qtPct>=35&&tdPct<15){actionLabel='马上开工型';actionDesc='即用工具占比很高，待办清单却不重。你收藏东西不是为了供起来，是为了现在就打开试试。';}
        else if(drPct>=35&&qtPct<20){actionLabel='思考蓄力型';actionDesc='深度阅读明显领先，即用工具偏少。你更习惯先把问题想透，行动通常发生在理解之后。';}
        else if(tdPct>=30&&qtPct<25){actionLabel='准备过载型';actionDesc='待办清单压过即用工具，说明很多收藏停在“以后再说”。你的收藏夹像一张排得很满的未来行程表。';}
        else if(qtPct>=25&&drPct>=25){actionLabel='边读边造型';actionDesc='深度阅读和即用工具都不低，你既有理解力，也有落地意识。你会一边想清楚，一边找能做出来的方法。';}
        else if(vtPct>=25&&opPct<12){actionLabel='直觉取样型';actionDesc='视觉审美更重，观点碰撞偏低。你更相信第一眼的判断，先被画面和气质打动，再决定要不要继续看。';}
        else{actionLabel='随缘流动型';actionDesc='行动、阅读、审美和计划没有明显单点爆发，你的收藏更像顺手留下的兴趣轨迹。';}
    
        // ---- 收藏习惯 ----
        var habitType,habitEmoji,habitDesc;
        if(totalItems<20){habitType='精简收藏家';habitEmoji='✨';habitDesc='只收精品，'+totalItems+' 个收藏个个都是心头好。你的收藏夹像一间精心布置的精品店——少而精，每一条都有存在的理由。'}
        else if(totalItems<80){habitType='有条理的收集者';habitEmoji='📋';habitDesc=totalItems+' 个收藏，量级适中。你属于「有目标地收藏」派——看到真正有用的才下手，偶尔也会冲动收藏但总体可控。'}
        else if(totalItems<200){habitType='数字松鼠';habitEmoji='🐿️';habitDesc=totalItems+' 个收藏！你是一只快乐的数字松鼠，看到坚果（链接）就往窝里搬。收藏的那一刻多爽啊……至于看不看，那是另一回事。'}
        else{habitType='收藏夹大亨';habitEmoji='🏰';habitDesc=totalItems+' 个收藏！！你的收藏夹已经是一座小型互联网档案馆了。你收藏的不是链接，是对这个世界的野心。建议定期整理哦～';}
    
        var activeDims=sortedDims.filter(function(d){return d.percentage>0}).length;
        function pickArchetype(){
          var dr=dimResults.deepRead.percentage,qt=dimResults.quickTool.percentage,vt=dimResults.visualTaste.percentage,op=dimResults.opinionTalk.percentage,td=dimResults.todoList.percentage;
          var maxPct=sortedDims[0].percentage,minPct=sortedDims[sortedDims.length-1].percentage;
          if(maxPct-minPct<=18&&activeDims>=5)return{key:'omnivore',type:'🌈 杂食大脑',emoji:'🌈',subtitle:'好奇心广阔 · 连接力很强',pattern:'你是那种走进任何房间都能找到聊天话题的人。科技、艺术、效率、生活——你什么都懂一点，而且懂得真诚。你的好奇心没有边界，这让你的世界比大多数人都宽。别人专注一个赛道，你在收集整个世界。这不是分散，这是你在悄悄构建一张别人看不见的连接网。',role:''};
          if(dr>=35&&op>=12&&qt<28)return{key:'surfer',type:'🌊 知识冲浪者',emoji:'🌊',subtitle:'永远在读 · 永远多想一层',pattern:'你对世界保持着一种罕见的热情——永远想搞懂下一件事，永远在读，永远在想。你是朋友圈里第一个把一件复杂的事说清楚的人。你的脑子里装着大量别人没时间去了解的东西，这让你看问题的角度总是比别人多一层。知识在你这里不是负担，是真正的乐趣。',role:''};
          if(qt>=38&&td<=15)return{key:'action',type:'🔥 行动派信徒',emoji:'🔥',subtitle:'说做就做 · 第一版已经在路上',pattern:'你是那种让人又羡慕又佩服的人——别人还在讨论要不要做，你已经做完第一版了。你不焦虑，不囤积，不拖延，看到能做的事就直接动手。你的收藏夹干净利落，因为你不需要靠收藏来给自己安全感。你的安全感来自已经做成的事，而那个清单，一直在变长。',role:''};
          if(qt>=30&&td>=15)return{key:'machine',type:'⚙️ 效率机器',emoji:'⚙️',subtitle:'系统思维 · 聪明努力',pattern:'你是天生的系统思维者。你不只是努力，你努力得很聪明——知道用什么工具，知道怎么规划，知道把精力放在最值得的地方。你的收藏夹是一套精心维护的作战系统，每一个收藏都有它的位置和用途。跟你合作过的人都知道：把事情交给你，会比预期做得更好。',role:''};
          if(vt>=32&&op<15)return{key:'taste',type:'🎭 品味收藏家',emoji:'🎭',subtitle:'眼光精准 · 审美自成体系',pattern:'你有一套只有你自己说得清的审美系统，而且那套系统相当准。你能一眼看出什么是好的，什么是对的，什么是差了一点点的——这种直觉是很多人花钱也买不到的能力。你的收藏夹是一块精心策展的情绪板，每一个收藏都是你对美的一次投票。你的眼光，就是你最稀缺的天赋。',role:''};
          if(td>=38&&qt<25)return{key:'preparing',type:'📋 永远准备中',emoji:'📋',subtitle:'计划清晰 · 从容开场',pattern:'你做事之前喜欢想清楚，这是一种很多人不具备的谨慎。你的计划永远比别人详细，你的目标永远比别人清晰。你知道自己要去哪里，也知道路上可能遇到什么。这种提前量让你在真正开始的时候，比任何人都从容。你不是慢，你是在用准备换确定性。',role:''};
          if(td>=45)return{key:'queue',type:'📦 囤积焦虑型',emoji:'📦',subtitle:'对世界开放 · 不错过可能性',pattern:'你对这个世界充满好奇，而且舍不得错过任何一个可能有用的东西。你的收藏夹是一个充满可能性的宝库——每一个收藏背后，都是一个「也许有一天」的美好期待。你比大多数人都敏感，更容易发现值得关注的东西。这种对世界保持开放的姿态，本身就是一种很珍贵的特质。',role:''};
          if(dr>=35&&qt<20)return{key:'architect',type:'🏛️ 图书馆建筑师',emoji:'🏛️',subtitle:'深度理解 · 耐心稀缺',pattern:'你是真正意义上的深度思考者。你不满足于表面，你要把一件事彻底搞明白才安心。你的收藏夹是一座私人图书馆，每一本书都是你对世界某个角落的认真凝视。这种对知识的尊重和耐心，在这个什么都讲求快的时代，反而是一种稀缺的能力。你的理解，比大多数人都深一层。',role:''};
          if(dr>=28&&qt>=25)return{key:'builder',type:'🛠️ 边读边造的人',emoji:'🛠️',subtitle:'想得深 · 做得实',pattern:'你是少见的「既想搞懂又想做出来」的人。你不满足于理解，你要把理解变成真实的东西——这个驱动力让你比纯思考者更落地，比纯执行者更有深度。你的收藏夹是一个思考和行动之间的桥梁。你做出来的东西，背后总是有扎实的逻辑在撑着，这让它经得起时间检验。',role:''};
          return{key:'collector',type:primary.icon+' '+primary.label+'收藏家',emoji:primary.icon,subtitle:'优势清晰 · 有自己的频道',pattern:'你的收藏夹有一个很清楚的主频道：「'+primary.label+'」。这说明你不是被信息推着走的人，你知道什么东西值得留下，也知道自己真正会被什么吸引。你的兴趣不是随机堆出来的，而是在慢慢形成一种稳定的判断力。越往后看，这种清晰的偏好越会变成你的个人优势。',role:''};
        }
        var archetype=pickArchetype();
        var pKey=archetype.key,pType=archetype;
    
        function genDesc(){
          return archetype.pattern;
        }
        function pickHiddenInsight(){
          function dim(key){return dimResults[key]}
          var pairTemplates=[
            {high:'deepRead',low:'quickTool',copy:'你收藏的都是「理解世界」的钥匙，但还没开始找门在哪里。\n\n书单越来越长，工具收藏几乎是空的——你擅长把世界看透，但还没决定要对它做什么。不是能力问题，是时机问题。或者说，是你一直在等一个「想清楚了再动」的信号，而那个信号从来不会自己出现。'},
            {high:'deepRead',low:'visualTaste',copy:'你相信文字多过图像，用逻辑感受世界。\n\n你的收藏几乎都是可以读的东西——文章、报告、长文、书。图片和视觉几乎不在你的清单里。这说明你需要「弄懂」才能安心，光看到不够，你要知道它为什么美、为什么对。感性对你来说是奢侈品，理解才是刚需。'},
            {high:'deepRead',low:'opinionTalk',copy:'你喜欢一个人消化世界，不太需要别人来验证你的想法。\n\n你收藏的都是输入，很少是讨论和争论。你更喜欢独自把一件事想透，而不是在来回碰撞里慢慢逼近答案。这让你的思考很扎实，但有时候也会在自己的逻辑里转太久——一个好的对手，有时候比一百篇文章更有用。'},
            {high:'deepRead',low:'todoList',copy:'你收藏的不是「想做的事」，而是「想成为的人」。\n\n你的收藏夹里几乎没有具体的计划和清单，全是知识和洞见。你在积累一种状态，而不是推进一个目标。这本身没有问题——只是有时候，成为那个人的最快方式，是先假装自己已经是了，然后开始做他会做的事。'},
            {high:'quickTool',low:'deepRead',copy:'你是执行机器——但偶尔停下来想想「为什么做」，可能比「怎么做」更重要。\n\n你的收藏夹干净利落，全是能马上用上的东西。没有废话，没有「以后再看」。但几乎没有深度阅读——你知道怎么跑，但跑道是谁铺的、跑向哪里，你可能没细想过。效率是工具，方向才是答案。'},
            {high:'quickTool',low:'visualTaste',copy:'你的收藏夹是一个兵器库，实用至上，不留废物。\n\n你收藏东西只有一个标准：有没有用。美不美、有不有趣、别人推不推荐——这些对你来说都是噪音。你的收藏夹非常干净，没有灵感存档，没有情绪收集，只有随时可以上阵的工具。这是一种罕见的清醒，代价是少了一些让自己意外的东西。'},
            {high:'quickTool',low:'todoList',copy:'你不囤积计划，你直接动手——别人还在收藏的东西，你可能已经用完扔掉了。\n\n你的收藏夹里几乎没有「以后要做」的清单，因为你不太需要它。想到要做的事，你就去做了，不需要先收藏再提醒自己。这是一种行动力很强的人的特征——只是偶尔，慢一步想清楚再动，也不是坏事。'},
            {high:'visualTaste',low:'quickTool',copy:'你知道自己想要什么，但还没找到怎么实现它的方法。\n\n你收藏了大量美的东西——设计、图片、创意案例——但工具类几乎是空的。你有很强的审美判断力，知道好的东西长什么样，但「怎么做出来」这一步还是个谜。你站在山顶看过风景，但登山的路还没找到。'},
            {high:'visualTaste',low:'deepRead',copy:'你用眼睛思考，直觉先于逻辑——有时候感觉对了就够了。\n\n你的收藏以视觉内容为主，深度文字内容很少。你对世界的理解方式更像是「看到就懂了」，而不是「读完才明白」。这是一种很快的感知方式，但也意味着有些东西，你是凭直觉接受的，没有经过太多质疑。偶尔读一篇让你不舒服的长文，也许会有意外收获。'},
            {high:'visualTaste',low:'opinionTalk',copy:'你不需要说服别人，你只需要美的东西说服自己。\n\n你的收藏里几乎没有争论和观点交锋，全是你自己觉得好的东西。你有很强的内在标准，不太需要外部验证——看到好的就收，不好的不看，不用跟人解释为什么。这种自洽很珍贵，只是美的标准有时候也需要被挑战一下，才能变得更立体。'},
            {high:'opinionTalk',low:'visualTaste',copy:'你活在观点的世界里，美感对你来说是甜点，不是主食。\n\n你的收藏几乎都是有立场的东西——评论、分析、争论、不同声音。视觉审美类几乎没有。你感兴趣的不是一件事长什么样，而是它意味着什么、为什么对、有没有人反驳过。你是靠思想活着的人，只是偶尔，让眼睛休息一下，让美的东西直接进来，不用过脑子。'},
            {high:'opinionTalk',low:'quickTool',copy:'你喜欢思辨，但结论不一定要落地——享受过程本身。\n\n你收藏了很多观点和讨论，但几乎没有工具类内容。你对「想清楚」的兴趣远大于「做出来」。这不是缺点，思考本身就有价值——只是有时候，一个工具用下去的反馈，比十篇分析文章更能帮你想清楚一件事。'},
            {high:'opinionTalk',low:'deepRead',copy:'你更爱交锋而不是独自沉浸，别人的反应是你思考的燃料。\n\n你收藏的大多是带有互动属性的内容——评论区、讨论帖、多方观点的文章——而不是一个人静静读完的长文。你需要摩擦才能产生热量。一个人闷头看书对你来说太慢了，你在来回碰撞里想得更快、更清楚。'},
            {high:'todoList',low:'quickTool',copy:'你收藏的是「未来的自己」，但他还没出现。\n\n你的收藏夹里装满了「以后要做」的东西——想去的地方、想试的东西、想学的技能——但工具类几乎没有。你非常擅长构想一个更好的未来版本的自己，只是那个版本一直停在收藏夹里，还没被激活。也许他需要的不是更多计划，而是一个小到不能拒绝的第一步。'},
            {high:'todoList',low:'deepRead',copy:'你知道自己想要什么，但还没想清楚为什么想要。\n\n你的清单很长，但深度阅读很少。你在不断扩展「想做的事」的边界，但很少停下来追问这些事情背后的动机。有时候清单长是因为没想清楚，而不是因为真的都想要。花时间读一读「为什么」，可能会帮你删掉一半清单，同时让剩下的那半更坚定。'},
            {high:'todoList',low:'visualTaste',copy:'你的人生是一张清单，不是一幅画。\n\n你非常擅长把生活组织成可执行的项目——要做的事、要去的地方、要拥有的东西。但几乎没有纯粹因为「美」或「感觉好」而收藏的东西。你的收藏夹很高效，但有点硬。偶尔收一些没有用处、只是让你舒服的东西，也是一种能力。'}
          ];
          var dualTemplates=[
            {keys:['deepRead','visualTaste'],copy:'你是个感知力极强的人，用文字和图像双重理解世界——但这些理解还没有找到出口。\n\n你既能沉进去读一篇很长的文章，也能被一张图片击中。你对世界有很细腻的感受力，收藏夹像一个私人博物馆。但博物馆是给人看的——你的这些积累，有没有想过让别人也看到？你可能比自己意识到的更适合创作。'},
            {keys:['deepRead','opinionTalk'],copy:'你是真正意义上的思考者——既能独自钻研，也能在争论里磨刀。\n\n你既收藏深度长文，也收藏观点交锋。你不满足于「知道」，你要「想透」——一个人想不够，就找人来辩。这是一种少见的智识驱动力。唯一的风险是：想了很多，做了很少。你脑子里的结论，也许值得被更多人看到。'},
            {keys:['visualTaste','opinionTalk'],copy:'你是创意型的批评家——有品味，也有立场，两者都不妥协。\n\n你又收美的东西，又收有观点的东西。你不是那种「什么都好」的人，你有很强的判断力，对审美和思想都有自己的标准。这种组合不多见——大多数人要么感性要么理性，你两边都走。代价是你可能对很多东西都不太满意，因为你知道它可以更好。'},
            {keys:['quickTool','todoList'],copy:'你是个计划执行型的人——知道要做什么，也知道用什么做，就差开始了。\n\n你既收工具，也收计划，说明你对「怎么实现目标」有很强的意识。但如果两者都高而产出不明显，那可能是准备动作做得太充分了——工具选了一遍又一遍，计划改了一版又一版。你其实已经准备好了，只是还在等一个不存在的完美时机。'},
            {keys:['deepRead','quickTool'],copy:'你是少见的「既能想又能做」的人——理论和实践都在你的射程里。\n\n你收深度内容，也收即用工具，说明你既不满足于光想不做，也不甘心只是执行。你想理解背后的逻辑，同时也想把它变成现实。这种组合在人群里不多，真正的障碍往往不是能力，而是选择——方向太多，反而容易原地转圈。'}
          ];
          var bestPair=null;
          for(var pi=0;pi<pairTemplates.length;pi++){
            var p=pairTemplates[pi],hi=dim(p.high),lo=dim(p.low);
            var gap=(hi?hi.percentage:0)-(lo?lo.percentage:0);
            if(hi&&lo&&hi.percentage>=18&&gap>0&&(!bestPair||gap>bestPair.gap)){
              bestPair={high:hi,low:lo,gap:gap,copy:p.copy,title:hi.icon+' '+hi.label+' 高 × '+lo.icon+' '+lo.label};
            }
          }
          var bestDual=null;
          for(var dui=0;dui<dualTemplates.length;dui++){
            var dt=dualTemplates[dui],da=dim(dt.keys[0]),db=dim(dt.keys[1]);
            var score=Math.min(da.percentage,db.percentage);
            if(da.percentage>=22&&db.percentage>=22&&(!bestDual||score>bestDual.score)){
              bestDual={keys:dt.keys,high:da,low:db,gap:Math.abs(da.percentage-db.percentage),score:score,copy:dt.copy,title:da.icon+' '+da.label+' + '+db.icon+' '+db.label+' 同时高',dual:true};
            }
          }
          if(bestPair&&bestPair.gap>=18)return bestPair;
          if(bestDual)return bestDual;
          if(bestPair&&bestPair.gap>=10)return bestPair;
          if(!bestPair){
            return{high:primary,low:sortedDims[sortedDims.length-1],gap:Math.max(0,primary.percentage-sortedDims[sortedDims.length-1].percentage),title:primary.icon+' '+primary.label+' 的主频道',copy:'你的收藏夹没有特别尖锐的缺口，更像一个彼此牵制的小生态：想法、行动、审美和计划都在场，只是音量不同。',soft:true};
          }
          return bestPair;
        }
        function estimateBeatPct(n){
          var anchors=[
            [0,5],[10,10],[30,20],[60,30],[100,40],
            [200,60],[500,85],[1000,95],[2000,98]
          ];
          for(var ai=1;ai<anchors.length;ai++){
            var prev=anchors[ai-1],next=anchors[ai];
            if(n<=next[0]){
              var ratio=(n-prev[0])/(next[0]-prev[0]);
              return Math.round(prev[1]+ratio*(next[1]-prev[1]));
            }
          }
          return 99;
        }
    
        var tags=[];
        for(var tgi=0;tgi<Math.min(6,sortedDims.length);tgi++){var d=sortedDims[tgi];if(d.percentage>=2)tags.push({name:d.label,val:d.percentage+'%',highlight:d.key===primary.key});}
        if(tags.length===0)tags.push({name:'神秘',val:'?',highlight:false});
        var hiddenInsight=pickHiddenInsight();
    
        return{
          type:pType.type,emoji:pType.emoji,subtitle:pType.subtitle,
          description:genDesc(),
          hiddenInsight:hiddenInsight,
          dimensions:dimResults,sortedDimensions:sortedDims,
          primaryDimension:primary,secondaryDimension:secondary||null,
          tags:tags,totalBookmarks:totalItems,
          stats:{total:totalItems,beatPct:estimateBeatPct(totalItems)},
          insights:{
            habitType:habitType,habitEmoji:habitEmoji,habitDesc:habitDesc,
            topDomains:topDomains,
            mostCollected:{label:primary.label,count:primary.rawHits,pct:primary.percentage},
            language:{rate:chineseRate,label:langLabel,desc:chinaLangDesc},
            action:{label:actionLabel,desc:actionDesc},
            loyalty:{score:loyaltyScore,label:loyLabel,desc:loyDesc},
            era:{securePct:securePct,httpCount:httpCount,httpsCount:httpsCount,label:eraLabel,desc:eraDesc}
          }
        };
      }
    
      function safelyAnalyze(bookmarks){
        try{return analyzePersonality(bookmarks)}
        catch(e){console.error('[BPA] analyze failed',e);alert('分析时遇到了一条异常收藏，已经停止。本次不会一直卡在 loading 了。');return null}
      }
    
      async function extractBookmarks(){
        var results=[];
        if(typeof chrome!=='undefined'&&chrome.bookmarks){
          try{var tree=await new Promise(function(r){chrome.bookmarks.getTree(r)});
            function flatten(nodes){for(var ni=0;ni<nodes.length;ni++){var n=nodes[ni];if(n.url)results.push({title:n.title,url:n.url});if(n.children)flatten(n.children)}}flatten(tree);
          }catch(e){}
        }
        if(!results.length)document.querySelectorAll('a[href]').forEach(function(a){var t=(a.textContent||'').trim(),u=a.href||'';if(t&&u&&u!=='#'&&!u.startsWith('javascript:')&&u.length<500)results.push({title:t,url:u})});
        return results;
      }
    
      function parseInput(input){
        var r=[];
        var doc=new DOMParser().parseFromString(input,'text/html');
        var links=doc.querySelectorAll('a[href]');
        for(var li=0;li<links.length;li++){
          var href=links[li].getAttribute('href')||'';
          var text=(links[li].textContent||'').trim();
          if(text&&href&&href!=='#'&&!href.startsWith('javascript:')&&href.length<1000)r.push({title:text.trim(),url:href.trim()});
        }
        if(r.length>0)return r;
        var lines=input.split('\n');
        for(var li2=0;li2<lines.length;li2++){
          var line=lines[li2].trim();
          if(!line||line.length<2)continue;
          var t=line;
          var prefixes=['- ','* ','• ','· ','— ','– '];
          for(var pi=0;pi<prefixes.length;pi++){if(t.indexOf(prefixes[pi])===0)t=t.substring(prefixes[pi].length);}
          var separators=[': ',':',' | ',' - ',' — ',' – '];
          var foundSep=false;
          for(var si=0;si<separators.length;si++){
            var sepIdx=t.indexOf(separators[si]);
            if(sepIdx>0&&sepIdx<t.length-10){
              var afterSep=t.substring(sepIdx+separators[si].length);
              if(afterSep.indexOf('http://')===0||afterSep.indexOf('https://')===0){r.push({title:t.substring(0,sepIdx).trim(),url:afterSep.trim()});foundSep=true;break;}
            }
          }
          if(foundSep)continue;
          var httpIdx=t.indexOf('http://');
          var httpsIdx=t.indexOf('https://');
          var urlStart=-1;
          if(httpIdx>=0&&httpsIdx>=0)urlStart=Math.min(httpIdx,httpsIdx);
          else if(httpIdx>=0)urlStart=httpIdx;
          else if(httpsIdx>=0)urlStart=httpsIdx;
          if(urlStart>=0){
            var endIdx=t.length;var spaceIdx=t.indexOf(' ',urlStart+8);
            if(spaceIdx>0)endIdx=spaceIdx;
            var url=t.substring(urlStart,endIdx);
            var titlePart=t.substring(0,urlStart).replace(/[:：|\-\—\s]+$/,'').trim();
            var langTitle=titlePart;
            if(!titlePart)titlePart=url.replace(/https?:\/\/(www\.)?/,'').split('/')[0];
            r.push({title:titlePart,langTitle:langTitle,url:url});continue;
          }
          r.push({title:t,url:''});
        }
        return r;
      }
    
      // ==================== 渲染卡片 v5 ====================
      function renderResultCard(analysis,bookmarks){
        var overlay=document.createElement('div');overlay.id='bpa-overlay-v5';overlay.className='bpa-overlay';
        var ins=analysis.insights;
        function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
        function nl2br(s){return esc(s).replace(/\n\n/g,'<br/><br/>').replace(/\n/g,'<br/>')}
    
        var topDomHtml='';
        if(ins.topDomains.length>0){var parts=[];for(var di=0;di<ins.topDomains.length;di++)parts.push(' \u00B7 <strong>'+ins.topDomains[di][0]+'</strong> ('+ins.topDomains[di][1]+')');topDomHtml=parts.join('  ');}
    
        var dimHtml='';
        for(var i=0;i<analysis.sortedDimensions.length;i++){
          var d=analysis.sortedDimensions[i];var w=Math.max(d.percentage,d.percentage>=2?d.percentage:1);var innerTxt=d.percentage>5?d.percentage+'%':'';
          var exHtml='';
          if(d.matched&&d.matched.length){for(var exi=0;exi<d.matched.length;exi++)exHtml+='<div class="bpa-dim-example">· '+esc(d.matched[exi])+'</div>';}
          else exHtml='<div class="bpa-dim-example">· 暂时没有明显归到这一类的收藏</div>';
          dimHtml+='<div class="bpa-dim-card"><div class="bpa-dim-main"><span class="bpa-dim-label">'+d.icon+' '+d.label+'</span><div class="bpa-bar-wrap"><div class="bpa-bar-fill '+d.level+'" style="width:'+w+'%">'+innerTxt+'</div></div><span class="bpa-dim-pct">'+d.percentage+'%</span></div><div class="bpa-dim-desc">'+esc(d.desc)+'</div><div class="bpa-dim-examples">'+exHtml+'</div></div>';
        }
    
        // v5: 构建所有洞察卡片HTML
        var insightCards='';

        // 1. 收藏最多（粉色）
        insightCards+='<div class="bpa-insight-item"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83C\uDFC6</span><span class="bpa-insight-title">收藏最多的是？</span></div>';
        insightCards+='<div class="bpa-insight-desc">\u00AB<strong>'+ins.mostCollected.label+'</strong>\u00BB——共 <strong>'+ins.mostCollected.count+'</strong> 条，占全部收藏的 <strong>'+ins.mostCollected.pct+'%</strong>。这是你的收藏夹绝对 C 位。</div></div>';
    
        // 2. 收藏习惯（粉色）
        insightCards+='<div class="bpa-insight-item"><div class="bpa-insight-head"><span class="bpa-insight-icon">'+ins.habitEmoji+'</span><span class="bpa-insight-title">收藏习惯类型：'+ins.habitType+'</span></div>';
        insightCards+='<div class="bpa-insight-desc">'+ins.habitDesc+'</div></div>';
    
        // 3. 常逛网站（粉色）
        if(topDomHtml){
          insightCards+='<div class="bpa-insight-item"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83C\uDF10</span><span class="bpa-insight-title">你最常收藏这些网站</span></div><div class="bpa-insight-desc">'+topDomHtml+'</div></div>';
        }
    
        // === v5 行为洞察 ===
    
        // 5. 🌍 语言偏好（绿色）
        var lg=ins.language;
        insightCards+='<div class="bpa-insight-green"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83C\uDF0D</span><span class="bpa-insight-title">语言偏好：'+lg.label+'</span></div>';
        insightCards+='<div class="bpa-insight-desc">'+lg.desc+'</div></div>';
    
        // 7. 🔁 行动转化（紫色）
        var ac=ins.action;
        insightCards+='<div class="bpa-insight-purple"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83D\uDD01</span><span class="bpa-insight-title">行动转化：'+ac.label+'</span></div>';
        insightCards+='<div class="bpa-insight-desc">'+ac.desc+'</div></div>';
    
        // 8. 📊 域名忠诚度（蓝色）
        var ly=ins.loyalty;
        insightCards+='<div class="bpa-insight-blue"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83D\uDD25</span><span class="bpa-insight-title">域名忠诚度：'+ly.label+'</span></div>';
        insightCards+='<div class="bpa-insight-desc">'+ly.desc+'</div></div>';
    
        // 9. 🔗 链接年代感（绿色）
        var er=ins.era;
        insightCards+='<div class="bpa-insight-green"><div class="bpa-insight-head"><span class="bpa-insight-icon">\uD83D\uDD17</span><span class="bpa-insight-title">链接年代：'+er.label+'</span></div>';
        insightCards+='<div class="bpa-insight-desc">'+er.desc+'</div></div>';

        var hidden=analysis.hiddenInsight||{};
        var hiddenHigh=hidden.high||analysis.primaryDimension;
        var hiddenLow=hidden.low||analysis.sortedDimensions[analysis.sortedDimensions.length-1];
        var hiddenHtml='<div class="bpa-hidden-insight">';
        hiddenHtml+='<div class="bpa-hidden-line">'+esc(hidden.title||(hiddenHigh.icon+' '+hiddenHigh.label+' × '+hiddenLow.icon+' '+hiddenLow.label))+'</div>';
        hiddenHtml+='<div class="bpa-hidden-desc">'+nl2br(hidden.copy||'你的收藏夹里有一种还没完全说出口的张力。')+'</div>';
        hiddenHtml+='</div>';

        function createShareImageBlob(){
          return new Promise(function(resolve,reject){
            try{
              var scale=2,W=900,H=5600,pad=56;
              var canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
              canvas.width=W*scale;canvas.height=H*scale;ctx.scale(scale,scale);
              function font(size,weight){return (weight||400)+' '+size+'px -apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif'}
              function rr(x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath()}
              function fillRound(x,y,w,h,r,fill,stroke){rr(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke()}}
              function grad(x1,y1,x2,y2,stops){var g=ctx.createLinearGradient(x1,y1,x2,y2);for(var gi=0;gi<stops.length;gi++)g.addColorStop(stops[gi][0],stops[gi][1]);return g}
              function lines(text,maxW,fontStr){
                ctx.font=fontStr;var out=[];String(text||'').split('\n').forEach(function(p){
                  if(!p){out.push('');return}
                  var line='';Array.from(p).forEach(function(ch){
                    var test=line+ch;
                    if(ctx.measureText(test).width>maxW&&line){out.push(line);line=ch}else line=test;
                  });
                  if(line)out.push(line);
                });return out;
              }
              function drawSectionTitle(title,y){ctx.font=font(24,700);ctx.fillStyle='#3f334d';ctx.textBaseline='top';ctx.fillText(title,pad,y);return y+42}
              function drawCard(title,body,y,tone){
                var x=pad,w=W-pad*2,inner=24,titleF=font(22,700),bodyF=font(18,400);
                var titleLines=lines(title,w-inner*2,titleF),bodyLines=lines(body,w-inner*2,bodyF);
                var h=22+titleLines.length*30+8+bodyLines.length*28+24;
                var fill=tone==='warm'?grad(x,y,x+w,y+h,[[0,'rgba(255,255,255,.78)'],[.55,'rgba(255,249,226,.64)'],[1,'rgba(255,241,248,.58)']]):tone==='lav'?grad(x,y,x+w,y+h,[[0,'rgba(255,255,255,.78)'],[.55,'rgba(246,241,255,.68)'],[1,'rgba(255,244,251,.58)']]):grad(x,y,x+w,y+h,[[0,'rgba(255,255,255,.78)'],[.55,'rgba(255,244,251,.62)'],[1,'rgba(246,241,255,.58)']]);
                fillRound(x,y,w,h,24,fill,'rgba(255,255,255,.9)');
                ctx.fillStyle=grad(x+w-110,y+16,x+w-24,y+16,[[0,'rgba(255,127,166,.08)'],[.55,'rgba(191,174,255,.55)'],[1,'rgba(255,217,133,.35)']]);fillRound(x+w-112,y+16,86,2,1,ctx.fillStyle);
                var ty=y+22;ctx.font=titleF;ctx.fillStyle='#8a70d6';ctx.textBaseline='top';
                titleLines.forEach(function(l){ctx.fillText(l,x+inner,ty);ty+=30});
                ty+=8;ctx.font=bodyF;ctx.fillStyle='#3f334d';
                bodyLines.forEach(function(l){if(l)ctx.fillText(l,x+inner,ty);ty+=28});
                return y+h+18;
              }
              function drawFlowerText(text,x,y,size){
                ctx.font=font(size,800);ctx.textAlign='center';ctx.textBaseline='top';
                var tw=ctx.measureText(text).width;
                ctx.fillStyle=grad(x-tw/2,y,x+tw/2,y+size,[[0,'#ff6f9c'],[.55,'#bfaeff'],[1,'#ffd985']]);
                ctx.fillText(text,x,y);
              }
              ctx.fillStyle=grad(0,0,W,H,[[0,'#fff8fb'],[.45,'#f7f1ff'],[1,'#fff8e6']]);ctx.fillRect(0,0,W,H);
              ctx.globalAlpha=.85;ctx.fillStyle='rgba(255,217,233,.74)';ctx.beginPath();ctx.arc(120,120,150,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(221,210,255,.72)';ctx.beginPath();ctx.arc(770,170,180,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,230,166,.62)';ctx.beginPath();ctx.arc(480,560,220,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
              var y=48,cardX=pad,cardW=W-pad*2;
              fillRound(cardX,y,cardW,286,34,grad(cardX,y,cardX+cardW,y+286,[[0,'rgba(255,255,255,.78)'],[.45,'rgba(255,217,233,.56)'],[1,'rgba(221,210,255,.52)']]),'rgba(255,255,255,.92)');
              ctx.textAlign='center';ctx.textBaseline='top';ctx.font=font(22,700);ctx.fillStyle='#8a70d6';ctx.fillText('收藏夹人格鉴定',W/2,y+34);
              ctx.font=font(48,800);ctx.fillStyle='#3f334d';ctx.fillText(analysis.type,W/2,y+78);
              ctx.font=font(19,500);ctx.fillStyle='#81728e';ctx.fillText(analysis.subtitle,W/2,y+142);
              ctx.font=font(20,600);ctx.fillStyle='#81728e';ctx.textAlign='center';ctx.textBaseline='top';
              ctx.fillText('你收藏的总数是',W/2-190,y+206);
              ctx.fillText('超过了这些用户',W/2+190,y+206);
              drawFlowerText(String(analysis.stats.total),W/2-190,y+234,48);
              drawFlowerText(analysis.stats.beatPct+'%',W/2+190,y+234,48);
              ctx.textAlign='left';y+=330;
              y=drawSectionTitle('内容占比分布',y);
              for(var di=0;di<analysis.sortedDimensions.length;di++){
                var d=analysis.sortedDimensions[di],x=pad,w=cardW,rowH=76;
                fillRound(x,y,w,rowH,20,'rgba(255,255,255,.54)','rgba(255,255,255,.78)');
                ctx.font=font(18,700);ctx.fillStyle='#3f334d';ctx.textBaseline='top';ctx.fillText(d.icon+' '+d.label,x+20,y+16);
                ctx.font=font(18,800);ctx.fillStyle='#8a70d6';ctx.fillText(d.percentage+'%',x+w-74,y+16);
                fillRound(x+142,y+18,w-236,18,99,'rgba(255,255,255,.55)','rgba(255,255,255,.76)');
                fillRound(x+142,y+18,Math.max(12,(w-236)*d.percentage/100),18,99,grad(x+142,y+18,x+w-94,y+18,[[0,'#ff7fa6'],[.62,'#d9c8ff'],[1,'#ffd985']]));
                ctx.font=font(15,400);ctx.fillStyle='#81728e';ctx.fillText(d.desc,x+20,y+46);
                y+=rowH+12;
              }
              y+=10;y=drawSectionTitle('人格解读',y);
              y=drawCard(analysis.type,analysis.description,y,'warm');
              y=drawSectionTitle('隐藏洞察',y);
              y=drawCard(hidden.title||'收藏夹里的隐藏张力',hidden.copy||'你的收藏夹里有一种还没完全说出口的张力。',y,'lav');
              y=drawSectionTitle('收藏洞察',y);
              y=drawCard('🏆 收藏最多的是？','「'+ins.mostCollected.label+'」共 '+ins.mostCollected.count+' 条，占全部收藏的 '+ins.mostCollected.pct+'%。这是你的收藏夹绝对 C 位。',y,'lav');
              y=drawCard(ins.habitEmoji+' 收藏习惯类型：'+ins.habitType,ins.habitDesc,y,'base');
              if(ins.topDomains.length){
                var doms=ins.topDomains.slice(0,4).map(function(it){return it[0]+'（'+it[1]+'）'}).join(' · ');
                y=drawCard('🌐 你最常收藏这些网站',doms,y,'base');
              }
              y=drawCard('🌍 语言偏好：'+lg.label,lg.desc,y,'base');
              y=drawCard('🔁 行动转化：'+ac.label,ac.desc,y,'lav');
              y=drawCard('🔥 域名忠诚度：'+ly.label,ly.desc,y,'base');
              y=drawCard('🔗 链接年代：'+er.label,er.desc,y,'base');
              var ctaH=180;fillRound(pad,y,cardW,ctaH,30,grad(pad,y,pad+cardW,y+ctaH,[[0,'rgba(255,127,166,.82)'],[.55,'rgba(191,174,255,.82)'],[1,'rgba(255,217,133,.82)']]),'rgba(255,255,255,.9)');
              ctx.textAlign='center';ctx.textBaseline='top';ctx.font=font(30,800);ctx.fillStyle='#fff';ctx.fillText('来 Tabbit 玩这个测试',W/2,y+34);
              ctx.font=font(19,600);ctx.fillStyle='rgba(255,255,255,.94)';ctx.fillText('看看你的收藏夹人格，发现自己最好的一面',W/2,y+82);
              ctx.font=font(15,500);ctx.fillStyle='rgba(255,255,255,.86)';ctx.fillText('Tabbit · 让收藏夹变成你的第二大脑',W/2,y+124);
              y+=ctaH+pad;ctx.textAlign='left';
              var out=document.createElement('canvas'),outCtx=out.getContext('2d');
              out.width=canvas.width;out.height=Math.ceil(y*scale);
              outCtx.drawImage(canvas,0,0,out.width,out.height,0,0,out.width,out.height);
              out.toBlob(function(blob){if(blob)resolve(blob);else reject(new Error('生成图片失败'))},'image/png');
            }catch(e){reject(e)}
          });
        }
        async function copyShareImage(btn){
          try{
            btn.textContent='生成长图中...';
            var blob=await createShareImageBlob();
            if(!navigator.clipboard||!window.ClipboardItem)throw new Error('当前浏览器不支持直接复制图片');
            await navigator.clipboard.write([new window.ClipboardItem({'image/png':blob})]);
            btn.textContent='图片已复制 ✓';
            setTimeout(function(){btn.textContent='复制图片'},2000);
          }catch(e){
            console.error('[BPA] copy image failed',e);
            btn.textContent='复制图片';
            alert('复制图片失败：'+(e&&e.message?e.message:String(e)));
          }
        }
    
        var cardHtml='<div class="bpa-card">';
        cardHtml+='<button class="bpa-close" id="bpa-close">\u00D7</button>';
        cardHtml+='<div class="bpa-header"><div class="bpa-header-inner">';
        cardHtml+='<div class="bpa-avatar-wrap"><span class="bpa-avatar-text">'+analysis.emoji+'</span></div>';
        cardHtml+='<div class="bpa-type-label">收藏夹人格鉴定</div>';
        cardHtml+='<div class="bpa-type-name">'+analysis.type+'</div>';
        cardHtml+='<div class="bpa-subtitle">'+analysis.subtitle+'</div></div></div>';
        cardHtml+='<div class="bpa-stats">';
        cardHtml+='<div class="bpa-stat-sentence">你收藏的总数是 <span class="bpa-stat-flower">'+analysis.stats.total+'</span>，超过了 <span class="bpa-stat-flower">'+analysis.stats.beatPct+'%</span> 的用户</div></div>';
        cardHtml+='<div class="bpa-body">';
        cardHtml+='<div class="bpa-section-title">内容占比分布</div>';
        cardHtml+='<div class="bpa-dim-list">'+dimHtml+'</div>';
        cardHtml+='<div class="bpa-section-title" style="margin-top:16px">\uD83D\uDCDD 人格解读</div>';
        cardHtml+='<div class="bpa-desc">'+analysis.description+'</div>';
        cardHtml+='<div class="bpa-section-title" style="margin-top:16px">\uD83D\uDD6F\uFE0F 隐藏洞察</div>';
        cardHtml+=hiddenHtml;
        cardHtml+='<div class="bpa-insights"><div class="bpa-section-title">\uD83D\uDD0D 收藏洞察</div>';
        cardHtml+=insightCards;
        cardHtml+='</div></div>';
        cardHtml+='<div class="bpa-footer"><button class="bpa-btn bpa-btn-secondary" id="bpa-copy">复制文字</button><button class="bpa-btn bpa-btn-primary" id="bpa-copy-image">复制图片</button></div></div>';
    
        overlay.innerHTML=cardHtml;mountBody.appendChild(overlay);
    
        document.getElementById('bpa-close').onclick=function(){overlay.remove()};
        overlay.onclick=function(e){if(e.target===overlay)overlay.remove()};
        document.getElementById('bpa-copy').onclick=function(){
          var txt='\uD83E\uDDE0 收藏夹人格鉴定结果 v5\n\n'+analysis.emoji+' '+analysis.type+'\n'+analysis.subtitle+'\n\n收藏总数：'+analysis.stats.total+'，超过了 '+analysis.stats.beatPct+'% 的用户\n\n\uD83D\uDCDD '+analysis.description+'\n\n\uD83D\uDD6F\uFE0F 隐藏洞察：'+(hidden.title||'收藏夹里的隐藏张力')+'\n'+(hidden.copy||'你的收藏夹里有一种还没完全说出口的张力。')+'\n\n\uD83D\uDCCA 内容占比（合计100%）:\n';
          for(var si=0;si<analysis.sortedDimensions.length;si++){
            var cd=analysis.sortedDimensions[si];
            txt+=cd.icon+' '+cd.label+': '+cd.percentage+'%｜'+cd.desc+'\n';
            if(cd.matched&&cd.matched.length)txt+='  例子：'+cd.matched.join('；')+'\n';
          }
          txt+='\n\uD83D\uDD0D 收藏洞察\n\uD83C\uDFC6 最爱收藏: '+ins.mostCollected.label+' ('+ins.mostCollected.pct+'%)\n\uD83D\uDCBE 收藏习惯: '+ins.habitType+'\n\uD83C\uDF0D 语言偏好: '+lg.label+' ('+lg.rate+'%中文)\n\uD83D\uDD01 行动转化: '+ins.action.label+'\n\uD83D\uDD25 域名忠诚: '+ly.label+' ('+ly.score+')\n\uD83D\uDD17 链接年代: '+er.label+' ('+er.securePct+'%HTTPS)';
          navigator.clipboard.writeText(txt).then(function(){var b=document.getElementById('bpa-copy');b.textContent='已复制 \u2713';setTimeout(function(){b.textContent='复制文字'},2000)});
        };
        document.getElementById('bpa-copy-image').onclick=function(){copyShareImage(this)};
      }
    
      function showInputPanel(){
        var o=document.createElement('div');o.id='bpa-overlay-v5';o.className='bpa-overlay';
        o.innerHTML='<div class="bpa-card"><button class="bpa-close" id="bpa-close">\u00D7</button><div class="bpa-tip-panel"><div class="bpa-tip-icon">\uD83D\uDD16</div><div class="bpa-tip-title">收藏夹人格分析器 v5</div><div class="bpa-tip-desc">浏览器安全限制无法直接读取收藏夹，请用以下方式输入：<br/><br/>\u2460 在 Chrome 地址栏输入 <code style="background:rgba(255,217,233,.58);padding:2px 6px;border-radius:6px;font-size:11px;font-family:inherit;color:#7f63c9;border:1px solid rgba(255,255,255,.72);">chrome://bookmarks</code> 打开后点击按钮<br/>\u2461 导出收藏夹 HTML 后粘贴下方<br/>\u2462 直接粘贴书签标题/网址列表<br/><br/><strong>v5 内容占比：</strong>\uD83D\uDCD6深度阅读 \u26A1即用工具 \uD83C\uDFA8视觉审美 \uD83D\uDCAC观点碰撞 \uD83D\uDCE6待办清单，合计固定为100%</div><textarea class="bpa-textarea" id="bpa-input" placeholder="在此粘贴收藏夹内容...\n\n支持格式示例：\n- GitHub: https://github.com\n- Dribbble 设计灵感\n- 如何学好Python"></textarea><div class="bpa-footer"><button class="bpa-btn bpa-btn-secondary" id="bpa-cancel">取消</button><button class="bpa-btn bpa-btn-primary" id="bpa-analyze">开始分析</button></div></div></div>';
        mountBody.appendChild(o);
        document.getElementById('bpa-close').onclick=function(){o.remove()};o.onclick=function(e){if(e.target===o)o.remove()};
        document.getElementById('bpa-cancel').onclick=function(){o.remove()};
        document.getElementById('bpa-analyze').onclick=async function(){
          var i=document.getElementById('bpa-input').value.trim();if(!i){alert('请先输入内容哦~');return}
          var p=parseInput(i);
          o.querySelector('.bpa-tip-panel').innerHTML='<div class="bpa-loading-wrap"><div class="bpa-spinner"></div><div class="bpa-loading-text">正在分析你的收藏夹人格<br/>读到了 '+p.length+' 条内容，你的收藏夹人格正在生成中...</div></div>';
          await new Promise(function(r){setTimeout(r,loadingDelay)});
          if(!p.length){alert('未能提取到有效书签');o.remove();showInputPanel();return}
          var a=safelyAnalyze(p);if(!a){o.remove();showInputPanel();return}
          o.remove();renderResultCard(a,p);
        };
      }
    
      btn.onclick=async function(){
        var bm=await extractBookmarks();
        if(bm.length>=3){
          var o=document.createElement('div');o.id='bpa-overlay-v5';o.className='bpa-overlay';
          o.innerHTML='<div class="bpa-card"><div class="bpa-loading-wrap"><div class="bpa-spinner"></div><div class="bpa-loading-text">正在分析你的收藏夹人格<br/>读到了 '+bm.length+' 条内容，你的收藏夹人格正在生成中...</div></div></div>';
          mountBody.appendChild(o);await new Promise(function(r){setTimeout(r,loadingDelay)});
          var a=safelyAnalyze(bm);o.remove();if(a)renderResultCard(a,bm);else showInputPanel();
        }else showInputPanel();
      };
    
      return{ok:true,summary:'v5 已启动！内容占比改为5类且合计100%，旧洞察已精简',changed_count:1,data:{buttonId:'bpa-float-btn-v5',version:5},warnings:[]};
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  try {
    return await __tabOriginalFunction();
  } catch (e) {
    console.error('[BPA] init failed', e);
    return {
      ok: false,
      summary: '收藏夹人格分析器初始化失败：' + (e && e.message ? e.message : String(e)),
      changed_count: 0,
      data: null,
      warnings: [String(e && e.stack ? e.stack : e)]
    };
  }
})();