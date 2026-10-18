(() => {
  const APP_ID = 'princess-atelier-game';
  const STYLE_ID = APP_ID + '-style';

  document.getElementById(APP_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const THEMES = [
    { id: 'royal', name: '王室晚宴', desc: '优雅、华丽、正式', weights: { elegant: 3, glam: 3, sweet: 1, fantasy: 1 } },
    { id: 'garden', name: '花园茶会', desc: '甜美、清新、浪漫', weights: { sweet: 3, elegant: 2, glam: 1, fantasy: 1 } },
    { id: 'moon', name: '月夜舞会', desc: '神秘、梦幻、华丽', weights: { fantasy: 3, glam: 2, elegant: 2, sweet: 0 } },
    { id: 'snow', name: '冬日庆典', desc: '纯净、典雅、梦幻', weights: { elegant: 2, fantasy: 2, sweet: 1, glam: 1 } }
  ];

  const ITEMS = {
    hair: [
      { id:'hair-1', name:'香槟卷发', icon:'〰', tags:{elegant:2,glam:1,sweet:1}, color:'#6a4835', svg:`<path d="M102 88c-8 31-6 77 5 115 4 14 17 24 34 24h78c18 0 31-10 36-25 12-40 14-84 6-115-10-37-39-58-81-58-40 0-68 21-78 59z" fill="#6a4835"/><path d="M113 89c8-33 31-49 67-49 38 0 62 18 71 52-21-15-43-21-69-18-24 3-46 10-69 15z" fill="#8d6248"/>` },
      { id:'hair-2', name:'银月长发', icon:'☾', tags:{fantasy:3,elegant:1}, color:'#d9e0f5', svg:`<path d="M103 90c-11 36-8 95 1 142 3 17 18 28 38 28h76c20 0 35-12 38-29 9-50 12-105 1-142-11-37-38-59-77-59-38 0-66 22-77 60z" fill="#d9e0f5"/><path d="M118 82c15-30 37-42 64-42 29 0 51 12 65 41-22-7-43-9-65-5-20 4-40 8-64 6z" fill="#f0f3ff"/>` },
      { id:'hair-3', name:'玫瑰双辫', icon:'❀', tags:{sweet:3,elegant:1}, color:'#7f4e4c', svg:`<circle cx="118" cy="135" r="31" fill="#7f4e4c"/><circle cx="243" cy="135" r="31" fill="#7f4e4c"/><path d="M111 89c5-37 29-58 69-58 39 0 64 21 70 58-20-13-43-19-69-16-26 2-48 9-70 16z" fill="#915f5b"/><path d="M112 126c-20 33-18 74-3 108" stroke="#7f4e4c" stroke-width="18" stroke-linecap="round"/><path d="M248 126c20 33 18 74 3 108" stroke="#7f4e4c" stroke-width="18" stroke-linecap="round"/>` },
      { id:'hair-4', name:'夜色高马尾', icon:'✦', tags:{glam:1,elegant:1,fantasy:2}, color:'#2d2a3f', svg:`<path d="M112 91c8-38 31-60 68-60 37 0 60 22 68 60-19-12-42-17-68-14-24 2-46 7-68 14z" fill="#2d2a3f"/><path d="M227 73c31 10 51 35 49 69-1 26-18 50-43 61 10-25 9-49-3-73-9-19-10-37-3-57z" fill="#3b3653"/>` }
    ],
    dress: [
      { id:'dress-1', name:'晨曦公主裙', icon:'♕', tags:{elegant:3,glam:2,sweet:1}, svg:`<path d="M138 223c16-14 68-14 84 0l11 62c8 43 26 84 44 124H84c18-40 36-81 44-124l10-62z" fill="url(#dressGold)"/><path d="M141 227c12 11 24 17 39 17 16 0 29-6 40-17l8 40c-27 15-67 15-95 0l8-40z" fill="#fff2d2" opacity=".95"/><path d="M102 409h156" stroke="#d6b16e" stroke-width="5"/>` },
      { id:'dress-2', name:'星河礼服', icon:'✧', tags:{fantasy:3,glam:3,elegant:1}, svg:`<path d="M138 222c17-13 68-13 85 0l10 58c8 47 25 87 48 130H78c23-43 40-83 48-130l12-58z" fill="url(#dressNight)"/><g fill="#d9e4ff" opacity=".9"><circle cx="117" cy="330" r="3"/><circle cx="145" cy="294" r="2.5"/><circle cx="215" cy="310" r="3"/><circle cx="241" cy="354" r="2"/><circle cx="175" cy="369" r="2.5"/></g>` },
      { id:'dress-3', name:'樱桃奶霜裙', icon:'♡', tags:{sweet:3,elegant:1,glam:1}, svg:`<path d="M139 223c16-13 67-13 83 0l10 55c8 46 29 87 49 131H78c21-44 41-85 49-131l12-55z" fill="url(#dressPink)"/><path d="M104 349c47 20 103 20 153 0" fill="none" stroke="#fff" stroke-width="6" opacity=".7"/><path d="M119 390c41 13 83 13 123 0" fill="none" stroke="#fff" stroke-width="4" opacity=".65"/>` },
      { id:'dress-4', name:'雪境白纱', icon:'❄', tags:{elegant:2,fantasy:2,sweet:1}, svg:`<path d="M138 223c15-12 69-12 84 0l9 54c10 49 27 91 48 133H80c21-42 38-84 48-133l10-54z" fill="url(#dressIce)"/><path d="M99 404c54-13 108-13 162 0" stroke="#b8d9f4" stroke-width="3" fill="none"/><circle cx="137" cy="320" r="3" fill="#b7d9ff"/><circle cx="215" cy="341" r="3" fill="#b7d9ff"/>` }
    ],
    head: [
      { id:'head-0', name:'不佩戴', icon:'×', tags:{}, svg:'' },
      { id:'head-1', name:'珍珠王冠', icon:'♔', tags:{elegant:2,glam:2}, svg:`<path d="M139 69l14-26 20 21 18-31 19 31 20-21 13 26z" fill="#f3d99c" stroke="#cba85e" stroke-width="3"/><circle cx="191" cy="37" r="5" fill="#fff5cb"/>` },
      { id:'head-2', name:'蝴蝶结', icon:'୨୧', tags:{sweet:3}, svg:`<path d="M171 65c-19-17-32-15-42 1 11 16 25 18 42 3zM189 65c18-17 31-15 42 1-11 16-25 18-42 3z" fill="#f3a9c7"/><circle cx="180" cy="67" r="9" fill="#ffd4e4"/>` },
      { id:'head-3', name:'月桂星环', icon:'☼', tags:{fantasy:3,elegant:1}, svg:`<ellipse cx="180" cy="58" rx="48" ry="17" fill="none" stroke="#a9c7ff" stroke-width="5"/><circle cx="139" cy="49" r="4" fill="#fff"/><circle cx="222" cy="64" r="4" fill="#fff"/>` }
    ],
    necklace: [
      { id:'neck-0', name:'不佩戴', icon:'×', tags:{}, svg:'' },
      { id:'neck-1', name:'蓝宝石项链', icon:'◆', tags:{elegant:2,glam:2}, svg:`<path d="M157 205c8 18 39 18 47 0" fill="none" stroke="#d9c895" stroke-width="4"/><path d="M180 218l10 14-10 14-10-14z" fill="#6398dd" stroke="#d9c895" stroke-width="2"/>` },
      { id:'neck-2', name:'玫瑰丝带', icon:'❦', tags:{sweet:2,elegant:1}, svg:`<path d="M154 207c12 10 39 10 52 0" fill="none" stroke="#df8caf" stroke-width="5"/><circle cx="180" cy="220" r="7" fill="#f7b1ca"/>` }
    ],
    hand: [
      { id:'hand-0', name:'不携带', icon:'×', tags:{}, svg:'' },
      { id:'hand-1', name:'星光手杖', icon:'✦', tags:{fantasy:2,glam:2}, svg:`<path d="M263 256l37 112" stroke="#d8c27f" stroke-width="6" stroke-linecap="round"/><path d="M259 245l8-17 8 17 17 8-17 8-8 17-8-17-17-8z" fill="#f7e3a1"/>` },
      { id:'hand-2', name:'玫瑰花束', icon:'❀', tags:{sweet:2,elegant:1}, svg:`<path d="M259 282l32 80" stroke="#6d9f71" stroke-width="5"/><circle cx="253" cy="267" r="12" fill="#e78cac"/><circle cx="272" cy="264" r="11" fill="#f0a8be"/><circle cx="262" cy="250" r="10" fill="#d97597"/>` },
      { id:'hand-3', name:'羽毛折扇', icon:'⌁', tags:{elegant:2,glam:1}, svg:`<path d="M256 284c18-25 43-29 59-20-5 24-21 43-50 49z" fill="#f6efe5" stroke="#c7b49b" stroke-width="3"/><path d="M265 313l30-47" stroke="#b49b7e" stroke-width="3"/>` }
    ],
    wing: [
      { id:'wing-0', name:'不佩戴', icon:'×', tags:{}, svg:'' },
      { id:'wing-1', name:'月光羽翼', icon:'𓆩♡𓆪', tags:{fantasy:3,glam:1}, svg:`<path d="M129 241C72 211 42 238 58 291c12 38 44 56 76 59-25-25-30-58-5-109z" fill="#dfe9ff" opacity=".82" stroke="#aac5f2" stroke-width="3"/><path d="M231 241c57-30 87-3 71 50-12 38-44 56-76 59 25-25 30-58 5-109z" fill="#dfe9ff" opacity=".82" stroke="#aac5f2" stroke-width="3"/>` },
      { id:'wing-2', name:'蝶梦薄翼', icon:'🦋', tags:{sweet:2,fantasy:2}, svg:`<path d="M132 250c-55-35-78 7-57 47 15 29 37 38 62 36-17-23-18-51-5-83z" fill="#e8b8ff" opacity=".72" stroke="#bb8fe1" stroke-width="3"/><path d="M228 250c55-35 78 7 57 47-15 29-37 38-62 36 17-23 18-51 5-83z" fill="#a7dfff" opacity=".72" stroke="#87bde0" stroke-width="3"/>` }
    ],
    scene: [
      { id:'scene-palace', name:'鎏金宫廷', icon:'♛', tags:{elegant:2,glam:2}, colors:['#f6ead8','#cab083'], svg:`<rect width="420" height="560" fill="url(#scenePalace)"/><path d="M0 420h420v140H0z" fill="#decaa6"/><path d="M43 119h57v301H43zM319 119h57v301h-57z" fill="#eadcc5"/><path d="M52 97h39l14 22H38zM328 97h39l14 22h-67z" fill="#cdb78d"/><path d="M109 117c31-61 171-61 202 0" fill="none" stroke="#d4bc8e" stroke-width="12"/>` },
      { id:'scene-garden', name:'蔷薇花园', icon:'❀', tags:{sweet:2,elegant:1}, colors:['#eaf3df','#a9d3b1'], svg:`<rect width="420" height="560" fill="url(#sceneGarden)"/><circle cx="60" cy="92" r="78" fill="#d7edcb"/><circle cx="360" cy="140" r="100" fill="#d1e9cf"/><path d="M0 400c89-36 149-27 218 11 69-41 127-43 202-7v156H0z" fill="#9fca9f"/><g fill="#ef9dbc"><circle cx="58" cy="415" r="10"/><circle cx="82" cy="438" r="8"/><circle cx="338" cy="429" r="11"/><circle cx="368" cy="406" r="8"/></g>` },
      { id:'scene-moon', name:'月夜星河', icon:'☾', tags:{fantasy:3,glam:1}, colors:['#20274d','#6b66a7'], svg:`<rect width="420" height="560" fill="url(#sceneMoon)"/><circle cx="330" cy="105" r="48" fill="#f3f0cf"/><path d="M0 405c93-61 174-56 236-8 77-66 134-55 184-7v170H0z" fill="#1b2445"/><g fill="#fff" opacity=".85"><circle cx="70" cy="91" r="2"/><circle cx="132" cy="56" r="3"/><circle cx="217" cy="109" r="2"/><circle cx="279" cy="51" r="2"/></g>` },
      { id:'scene-snow', name:'雪境城堡', icon:'❄', tags:{elegant:1,fantasy:2}, colors:['#e8f4ff','#b8d6ef'], svg:`<rect width="420" height="560" fill="url(#sceneSnow)"/><path d="M0 440c104-38 180-33 242 4 74-44 120-42 178-12v128H0z" fill="#d7ecf8"/><path d="M66 165h62v261H66zM291 165h62v261h-62z" fill="#d4e6f2"/><path d="M61 164l36-46 36 46zM286 164l36-46 36 46z" fill="#aecbe2"/><g fill="#fff"><circle cx="56" cy="82" r="4"/><circle cx="173" cy="135" r="5"/><circle cx="375" cy="95" r="4"/></g>` }
    ]
  };

  const CATEGORIES = [
    ['hair','发型','✦'], ['dress','礼服','♕'], ['head','头饰','♔'], ['necklace','项链','◇'], ['hand','手持','❀'], ['wing','背饰','𓆩𓆪'], ['scene','场景','◫']
  ];

  const state = {
    category: 'dress', theme: THEMES[0],
    selected: { hair:'hair-1', dress:'dress-1', head:'head-1', necklace:'neck-1', hand:'hand-0', wing:'wing-0', scene:'scene-palace' }
  };

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    :root{--pa-ink:#23263a;--pa-muted:rgba(35,38,58,.54);--pa-pink:#e79ab8;--pa-purple:#8e7ae8;--pa-gold:#d7b56b}
    *{box-sizing:border-box}html,body{margin:0;width:100%;min-height:100%}body{overflow-x:hidden}
    #${APP_ID}{min-height:100vh;width:100%;padding:22px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC","Helvetica Neue",Arial,sans-serif;color:var(--pa-ink);background:radial-gradient(circle at 12% 10%,rgba(255,209,227,.58),transparent 30%),radial-gradient(circle at 87% 12%,rgba(180,205,255,.62),transparent 32%),radial-gradient(circle at 72% 92%,rgba(204,181,255,.42),transparent 35%),linear-gradient(145deg,#fffafc,#f1f5ff 50%,#f8f2ff)}
    #${APP_ID} .orb{position:absolute;border-radius:999px;filter:blur(10px);pointer-events:none;opacity:.6;animation:paFloat 9s ease-in-out infinite alternate}#${APP_ID} .o1{width:220px;height:220px;left:-60px;top:18%;background:radial-gradient(circle,#fff,rgba(248,173,203,.58) 38%,transparent 72%)}#${APP_ID} .o2{width:260px;height:260px;right:-70px;top:10%;background:radial-gradient(circle,#fff,rgba(146,175,255,.5) 38%,transparent 72%);animation-delay:-3s}
    #${APP_ID} .shell{width:min(1280px,100%);height:min(820px,calc(100vh - 44px));min-height:690px;display:grid;grid-template-columns:220px minmax(430px,1fr) 365px;gap:18px;padding:18px;border-radius:40px;position:relative;z-index:2;background:linear-gradient(135deg,rgba(255,255,255,.75),rgba(255,255,255,.38));border:1px solid rgba(255,255,255,.9);box-shadow:0 40px 100px rgba(70,76,130,.16),inset 0 1px rgba(255,255,255,.95);backdrop-filter:blur(34px) saturate(145%)}
    #${APP_ID} .glass{background:linear-gradient(145deg,rgba(255,255,255,.65),rgba(255,255,255,.34));border:1px solid rgba(255,255,255,.82);box-shadow:0 15px 42px rgba(70,74,130,.09),inset 0 1px rgba(255,255,255,.92);backdrop-filter:blur(22px)}
    #${APP_ID} .left,#${APP_ID} .wardrobe{border-radius:28px;padding:18px;min-width:0;overflow:hidden}#${APP_ID} .left{display:flex;flex-direction:column}#${APP_ID} .eyebrow{font-size:10px;font-weight:800;letter-spacing:.16em;color:#9b77a7;text-transform:uppercase}#${APP_ID} h1{margin:12px 0 7px;font-size:35px;letter-spacing:-.055em}#${APP_ID} .intro{font-size:12px;line-height:1.6;color:var(--pa-muted);margin:0}
    #${APP_ID} .theme-card{margin-top:20px;padding:15px;border-radius:20px;background:linear-gradient(145deg,rgba(250,222,233,.7),rgba(224,228,255,.7));border:1px solid rgba(255,255,255,.86)}#${APP_ID} .theme-kicker{font-size:9px;font-weight:800;letter-spacing:.12em;color:#a86b87}#${APP_ID} .theme-name{font-size:20px;font-weight:780;margin-top:6px}#${APP_ID} .theme-desc{font-size:11px;color:var(--pa-muted);margin-top:4px;line-height:1.5}
    #${APP_ID} .score{margin-top:14px;padding:13px 14px;border-radius:18px;background:rgba(255,255,255,.48);border:1px solid rgba(255,255,255,.7)}#${APP_ID} .score-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--pa-muted)}#${APP_ID} .score-num{font-size:26px;color:#7b67d9;font-weight:800}.score-bar{height:6px;border-radius:99px;background:rgba(87,93,130,.08);margin-top:8px;overflow:hidden}.score-fill{height:100%;background:linear-gradient(90deg,#f09dbb,#8f7ee8,#7db6f1);border-radius:99px;transition:width .35s ease}
    #${APP_ID} .left-actions{margin-top:auto;display:grid;gap:8px}#${APP_ID} button{font:inherit}.btn{height:44px;border:0;border-radius:15px;cursor:pointer;font-size:12px;font-weight:740;transition:transform .18s ease,box-shadow .18s ease}.btn:hover{transform:translateY(-2px)}.btn.primary{color:white;background:linear-gradient(135deg,#d987ac,#8f78df);box-shadow:0 12px 26px rgba(139,104,196,.21)}.btn.secondary{color:#514a68;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.88)}
    #${APP_ID} .stage-wrap{position:relative;border-radius:30px;overflow:hidden;background:linear-gradient(180deg,rgba(255,255,255,.26),rgba(255,255,255,.08));border:1px solid rgba(255,255,255,.58)}#${APP_ID} .stage{position:absolute;inset:0;display:grid;place-items:center}#${APP_ID} .doll-svg{height:90%;max-width:90%;filter:drop-shadow(0 24px 30px rgba(53,56,102,.14))}#${APP_ID} .stage-label{position:absolute;left:20px;top:18px;padding:8px 12px;border-radius:999px;font-size:10px;font-weight:760;color:#695e7e;background:rgba(255,255,255,.58);border:1px solid rgba(255,255,255,.82);backdrop-filter:blur(15px)}#${APP_ID} .sparkles{position:absolute;inset:0;pointer-events:none}#${APP_ID} .spark{position:absolute;width:6px;height:6px;border-radius:50%;background:white;box-shadow:0 0 14px rgba(255,255,255,.9);animation:twinkle 2.8s infinite ease-in-out}
    #${APP_ID} .wardrobe{display:flex;flex-direction:column}#${APP_ID} .wardrobe-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}#${APP_ID} .wardrobe-title{font-size:19px;font-weight:780}.wardrobe-sub{font-size:10px;color:var(--pa-muted);margin-top:3px}.tabs{display:flex;gap:6px;overflow:auto;margin:16px -2px 12px;padding:2px 2px 5px;scrollbar-width:none}.tab{flex:0 0 auto;padding:8px 10px;border-radius:13px;border:1px solid rgba(255,255,255,.82);background:rgba(255,255,255,.45);font-size:11px;font-weight:700;color:#666075;cursor:pointer}.tab.active{color:white;background:linear-gradient(135deg,#d98bac,#8976dc);box-shadow:0 8px 18px rgba(137,100,190,.18)}
    #${APP_ID} .items{display:grid;grid-template-columns:1fr 1fr;gap:10px;overflow:auto;padding-right:2px}.item{position:relative;min-height:103px;padding:11px;border-radius:18px;cursor:pointer;background:rgba(255,255,255,.49);border:1px solid rgba(255,255,255,.82);transition:transform .18s ease,box-shadow .18s ease,border-color .18s}.item:hover{transform:translateY(-2px);box-shadow:0 12px 22px rgba(70,75,120,.10)}.item.selected{border-color:rgba(142,122,232,.55);box-shadow:0 0 0 2px rgba(142,122,232,.12),0 12px 24px rgba(100,83,173,.12)}.item-icon{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;font-size:21px;background:linear-gradient(145deg,#fff,#eeeaff);border:1px solid white}.item-name{margin-top:8px;font-size:12px;font-weight:730}.item-tags{margin-top:3px;font-size:9px;color:var(--pa-muted)}.check{position:absolute;right:8px;top:8px;width:20px;height:20px;border-radius:50%;display:none;place-items:center;color:#fff;background:#8c79e3;font-size:11px}.selected .check{display:grid}
    @keyframes paFloat{to{transform:translate(18px,-20px) scale(1.06)}}@keyframes twinkle{50%{opacity:.25;transform:scale(.55)}}
    @media(max-width:1050px){#${APP_ID} .shell{grid-template-columns:190px 1fr 310px}}@media(max-width:820px){#${APP_ID}{padding:10px}.shell{height:auto;min-height:900px!important;grid-template-columns:1fr!important;padding:10px!important;border-radius:28px!important}.left{display:none!important}.stage-wrap{min-height:540px}.wardrobe{min-height:360px}.items{grid-template-columns:repeat(3,1fr)!important}}
    @media(max-width:560px){.items{grid-template-columns:1fr 1fr!important}.stage-wrap{min-height:500px}.doll-svg{height:84%!important}}
  `;
  document.head.appendChild(style);

  const root = document.createElement('main');
  root.id = APP_ID;
  root.innerHTML = `
    <div class="orb o1"></div><div class="orb o2"></div>
    <section class="shell">
      <aside class="left glass">
        <div class="eyebrow">PRINCESS ATELIER</div>
        <h1>公主换装馆</h1>
        <p class="intro">原创公主娃娃换装小游戏。自由切换礼服、发型、头饰、项链、手持和背饰，还能一键更换场景。</p>
        <div class="theme-card"><div class="theme-kicker">TODAY'S THEME</div><div class="theme-name" id="pa-theme-name"></div><div class="theme-desc" id="pa-theme-desc"></div></div>
        <div class="score"><div class="score-row"><span>搭配评分</span><span class="score-num" id="pa-score">0</span></div><div class="score-bar"><div class="score-fill" id="pa-score-fill"></div></div></div>
        <div class="left-actions"><button class="btn primary" id="pa-random">✨ 随机搭配</button><button class="btn secondary" id="pa-theme">换一个主题</button><button class="btn secondary" id="pa-reset">恢复初始</button></div>
      </aside>
      <section class="stage-wrap">
        <div class="stage-label" id="pa-stage-label"></div>
        <div class="stage" id="pa-stage"></div>
        <div class="sparkles"><i class="spark" style="left:10%;top:18%;animation-delay:-1s"></i><i class="spark" style="left:88%;top:24%;animation-delay:-.3s"></i><i class="spark" style="left:80%;top:72%;animation-delay:-2s"></i><i class="spark" style="left:17%;top:68%;animation-delay:-1.5s"></i></div>
      </section>
      <aside class="wardrobe glass">
        <div class="wardrobe-top"><div><div class="wardrobe-title">梦幻衣橱</div><div class="wardrobe-sub">点击单品即可立即试穿</div></div></div>
        <div class="tabs" id="pa-tabs"></div><div class="items" id="pa-items"></div>
      </aside>
    </section>`;
  document.body.innerHTML=''; document.body.appendChild(root);

  const $ = s => root.querySelector(s);
  const els = {stage:$('#pa-stage'),tabs:$('#pa-tabs'),items:$('#pa-items'),themeName:$('#pa-theme-name'),themeDesc:$('#pa-theme-desc'),score:$('#pa-score'),scoreFill:$('#pa-score-fill'),stageLabel:$('#pa-stage-label')};

  const face = `<ellipse cx="180" cy="135" rx="52" ry="61" fill="#ffe8dc"/><circle cx="162" cy="137" r="4" fill="#3a3141"/><circle cx="198" cy="137" r="4" fill="#3a3141"/><path d="M171 157c7 6 11 6 18 0" fill="none" stroke="#d68c8f" stroke-width="3" stroke-linecap="round"/><ellipse cx="148" cy="151" rx="9" ry="5" fill="#f8b4ba" opacity=".35"/><ellipse cx="212" cy="151" rx="9" ry="5" fill="#f8b4ba" opacity=".35"/>`;
  const body = `<path d="M157 188c8 10 37 10 45 0v35h-45z" fill="#ffe8dc"/><path d="M144 225c-12 24-20 54-23 84" stroke="#ffe8dc" stroke-width="17" stroke-linecap="round"/><path d="M216 225c12 24 20 54 23 84" stroke="#ffe8dc" stroke-width="17" stroke-linecap="round"/><path d="M155 405l-9 68" stroke="#ffe8dc" stroke-width="18" stroke-linecap="round"/><path d="M205 405l9 68" stroke="#ffe8dc" stroke-width="18" stroke-linecap="round"/><ellipse cx="143" cy="479" rx="23" ry="9" fill="#e9c3b8"/><ellipse cx="217" cy="479" rx="23" ry="9" fill="#e9c3b8"/>`;

  function getItem(cat,id){return ITEMS[cat].find(x=>x.id===id)}
  function scoreLook(){
    let total=0, max=0; const tags={};
    Object.entries(state.selected).forEach(([cat,id])=>{const it=getItem(cat,id); if(!it)return; Object.entries(it.tags||{}).forEach(([k,v])=>tags[k]=(tags[k]||0)+v)});
    Object.entries(state.theme.weights).forEach(([k,w])=>{total+=(tags[k]||0)*w; max+=3*w});
    return Math.max(0,Math.min(100,Math.round((total/Math.max(1,max))*100)));
  }

  function renderStage(){
    const scene=getItem('scene',state.selected.scene), hair=getItem('hair',state.selected.hair), dress=getItem('dress',state.selected.dress), head=getItem('head',state.selected.head), neck=getItem('necklace',state.selected.necklace), hand=getItem('hand',state.selected.hand), wing=getItem('wing',state.selected.wing);
    els.stageLabel.textContent=scene.name;
    els.stage.innerHTML=`<svg class="doll-svg" viewBox="0 0 420 560" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="scenePalace" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8f2e8"/><stop offset="1" stop-color="#d7c3a1"/></linearGradient>
        <linearGradient id="sceneGarden" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2f8ed"/><stop offset="1" stop-color="#b9dfc0"/></linearGradient>
        <linearGradient id="sceneMoon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#151b38"/><stop offset="1" stop-color="#7768a8"/></linearGradient>
        <linearGradient id="sceneSnow" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f7fcff"/><stop offset="1" stop-color="#bedbf0"/></linearGradient>
        <linearGradient id="dressGold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff3cf"/><stop offset=".55" stop-color="#e7c777"/><stop offset="1" stop-color="#c99a4e"/></linearGradient>
        <linearGradient id="dressNight" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#5e5aa9"/><stop offset="1" stop-color="#232851"/></linearGradient>
        <linearGradient id="dressPink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffe3ee"/><stop offset="1" stop-color="#e89cb8"/></linearGradient>
        <linearGradient id="dressIce" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#cfe7f6"/></linearGradient>
      </defs>
      ${scene.svg}<g transform="translate(30,26)">${wing.svg}${hair.svg}${body}${face}${dress.svg}${neck.svg}${head.svg}${hand.svg}</g>
    </svg>`;
    const s=scoreLook(); els.score.textContent=s; els.scoreFill.style.width=s+'%';
  }

  function renderTabs(){els.tabs.innerHTML=CATEGORIES.map(([id,name,icon])=>`<button class="tab ${state.category===id?'active':''}" data-cat="${id}">${icon} ${name}</button>`).join(''); els.tabs.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{state.category=b.dataset.cat;renderTabs();renderItems()})}
  function tagText(tags){const map={elegant:'优雅',glam:'华丽',sweet:'甜美',fantasy:'梦幻'};return Object.keys(tags||{}).map(k=>map[k]).join(' · ')||'基础款'}
  function renderItems(){const arr=ITEMS[state.category];els.items.innerHTML=arr.map(it=>`<div class="item ${state.selected[state.category]===it.id?'selected':''}" data-id="${it.id}"><div class="check">✓</div><div class="item-icon">${it.icon}</div><div class="item-name">${it.name}</div><div class="item-tags">${tagText(it.tags)}</div></div>`).join('');els.items.querySelectorAll('.item').forEach(el=>el.onclick=()=>{state.selected[state.category]=el.dataset.id;renderItems();renderStage()})}
  function setTheme(t){state.theme=t;els.themeName.textContent=t.name;els.themeDesc.textContent=t.desc;renderStage()}
  function randomize(){Object.keys(state.selected).forEach(cat=>{const arr=ITEMS[cat]; state.selected[cat]=arr[Math.floor(Math.random()*arr.length)].id});renderItems();renderStage()}
  function reset(){state.selected={hair:'hair-1',dress:'dress-1',head:'head-1',necklace:'neck-1',hand:'hand-0',wing:'wing-0',scene:'scene-palace'};renderItems();renderStage()}

  $('#pa-random').onclick=randomize; $('#pa-reset').onclick=reset; $('#pa-theme').onclick=()=>{let i=(THEMES.findIndex(t=>t.id===state.theme.id)+1)%THEMES.length;setTheme(THEMES[i])};
  setTheme(THEMES[0]); renderTabs(); renderItems(); renderStage();
})();