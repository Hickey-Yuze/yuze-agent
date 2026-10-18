(() => {
  "use strict";

  // Yuze 脚本技炉：在当前标签页直接生成完整导航页；不依赖本机文件或外部资源。
  const groups = [
    { title: "学习与办事", caption: "高频", items: [
      ["教务处", "https://jw.muc.edu.cn/", "教学通知"], ["研究生院", "https://grs.muc.edu.cn/", "培养与招生"],
      ["图书馆", "https://lib.muc.edu.cn/", "借阅与数据库"], ["校园邮箱", "https://mail.muc.edu.cn/", "需登录"],
      ["财务处", "https://cwc.muc.edu.cn/", "缴费与票据"], ["学生就业服务", "https://www.career.muc.edu.cn/", "招聘与生涯"],
      ["VPN", "https://vpn.muc.edu.cn/", "校外访问"], ["校园网账户服务", "https://zz.muc.edu.cn/", "需登录"],
      ["迎新网", "https://yx.muc.edu.cn/", "新生专用"], ["本科招生网", "https://zb.muc.edu.cn/", "考生与家长"]
    ]},
    { title: "校园与公共信息", caption: "常用", items: [
      ["民大新闻", "https://news.muc.edu.cn/", "新闻"], ["信息公开", "https://xxgk.muc.edu.cn/", "校务信息"],
      ["校园地图", "https://www.muc.edu.cn/xxgk1/xydt.htm", "校区位置"], ["民族博物馆", "https://bwg.muc.edu.cn/", "公共文化"],
      ["信息化建设管理处", "https://met.muc.edu.cn/", "网络与 IT"], ["国际合作处", "https://oir.muc.edu.cn/", "国际交流"],
      ["国际教育学院", "https://cie.muc.edu.cn/", "留学生"], ["继续教育学院", "https://sce.muc.edu.cn/", "继续教育"],
      ["校友网", "https://xiaoyou.muc.edu.cn/", "校友服务"], ["中央民族大学出版社", "https://cbs.muc.edu.cn/", "出版"]
    ]},
    { title: "人文与社会科学学院", caption: "学院", items: [
      ["民族学与社会学学院", "https://msy.muc.edu.cn/", "学院官网"], ["中国少数民族语言文学学院", "https://scemll.muc.edu.cn/", "学院官网"],
      ["文学院", "https://sla.muc.edu.cn/", "学院官网"], ["历史文化学院", "https://history.muc.edu.cn/", "学院官网"],
      ["哲学与宗教学学院", "https://phil.muc.edu.cn/", "学院官网"], ["新闻与传播学院", "https://xinchuan.muc.edu.cn/", "学院官网"],
      ["外国语学院", "https://sfs.muc.edu.cn/", "学院官网"], ["马克思主义学院", "https://marxism.muc.edu.cn/", "学院官网"],
      ["经济学院", "https://eco.muc.edu.cn/", "学院官网"], ["管理学院", "https://ms.muc.edu.cn/", "学院官网"],
      ["法学院", "https://law.muc.edu.cn/", "学院官网"], ["教育学院", "https://edu.muc.edu.cn/", "学院官网"]
    ]},
    { title: "理工、医药与艺术学院", caption: "学院", items: [
      ["生命与环境科学学院", "https://cles.muc.edu.cn/", "学院官网"], ["药学院", "https://yxy.muc.edu.cn/", "学院官网"],
      ["理学院", "https://lxy.muc.edu.cn/", "学院官网"], ["信息工程学院", "https://xingong.muc.edu.cn/", "学院官网"],
      ["音乐学院", "https://yyxy.muc.edu.cn/", "学院官网"], ["舞蹈学院", "https://wd.muc.edu.cn/", "学院官网"],
      ["美术学院", "https://art.muc.edu.cn/", "学院官网"], ["体育学院", "https://sport.muc.edu.cn/", "学院官网"],
      ["海南国际学院", "https://muchnic.muc.edu.cn/", "学院官网"], ["国家安全研究院", "https://gjaqyjy.muc.edu.cn/", "研究机构"],
      ["民族语言资源中心", "https://nmlr.muc.edu.cn/", "研究机构"], ["兴边富民战略研究院", "https://vbep.muc.edu.cn/", "研究机构"]
    ]}
  ];

  const host = document.createElement("div");
  host.id = "muc-Yuze-full-page";
  host.style.setProperty("position", "fixed", "important");
  host.style.setProperty("inset", "0", "important");
  host.style.setProperty("z-index", "2147483647", "important");
  host.style.setProperty("overflow", "auto", "important");
  host.style.setProperty("display", "block", "important");
  host.style.setProperty("background", "#e7e8e1", "important");
  host.setAttribute("aria-label", "你的一站式民大导航");

  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host { display:block; min-height:100%; color:#17262a; font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif; }
      *,*::before,*::after { box-sizing:border-box; }
      a { color:inherit; }
      button,input { font:inherit; }
      .page { min-height:100vh; overflow:hidden; background:#e7e8e1; }
      .shell { width:min(1320px, calc(100% - 80px)); margin:0 auto; }
      .site-header { display:flex; align-items:center; min-height:136px; border-bottom:1px solid #9aa4a0; }
      .brand { display:inline-flex; align-items:center; gap:18px; text-decoration:none; }
      .seal { position:relative; display:grid; place-items:center; width:57px; aspect-ratio:1; overflow:hidden; border:3px solid #ae292c; border-radius:50%; color:#ae292c; font-family:Georgia,serif; font-size:21px; font-weight:800; letter-spacing:-.15em; }
      .seal::before { position:absolute; inset:6px; border:1px solid #ae292c; border-radius:50%; content:""; }
      .seal span { z-index:1; transform:translateX(-1px); }
      .brand strong { font-family:"Songti SC","STSong",serif; font-size:clamp(1.35rem,2.2vw,2rem); font-weight:700; letter-spacing:.02em; white-space:nowrap; }
      .hero { display:grid; grid-template-columns:minmax(270px,.75fr) minmax(570px,1.25fr); gap:clamp(50px,7vw,120px); align-items:center; min-height:590px; padding:70px 0 86px; }
      h1,h2,h3,p { margin:0; }
      h1 { font-family:"Songti SC","STSong",serif; font-size:clamp(4.1rem,7.2vw,8.7rem); font-weight:700; line-height:.96; letter-spacing:-.08em; }
      .title-line { display:block; white-space:nowrap; }
      .hero-copy p { max-width:430px; margin-top:32px; color:#53656a; font-size:1rem; line-height:1.8; }
      .portal-field { position:relative; display:grid; grid-template-columns:1fr 1fr; gap:16px; padding:38px 24px 23px; }
      .portal-field::before { position:absolute; inset:0 0 0 24px; z-index:0; background:#214850; content:""; transform:skewX(-12deg); }
      .field-caption { position:absolute; top:2px; right:24px; z-index:1; color:#53656a; font-size:.77rem; letter-spacing:.12em; }
      .core-link { position:relative; z-index:1; display:flex; min-height:195px; flex-direction:column; justify-content:space-between; padding:23px; color:#f7f7f2; text-decoration:none; transition:transform .22s ease, box-shadow .22s ease; }
      .core-link:hover { transform:translate(-5px,-5px); box-shadow:9px 10px 0 #17262a; }
      .core-link:focus-visible,.link-row a:focus-visible,input:focus-visible { outline:3px solid #b84b37; outline-offset:3px; }
      .core-link.home { grid-column:1 / 2; background:#bc4b34; }
      .core-link.portal { grid-column:2 / 3; background:#2f7883; }
      .core-link.graduate { background:#f7f7f2; color:#17262a; }
      .core-link.undergraduate { background:#152b30; }
      .kind { color:inherit; font-size:.75rem; opacity:.85; }
      .core-link strong { font-size:clamp(1.38rem,2.2vw,2.25rem); line-height:1.2; }
      .launch { display:flex; align-items:center; justify-content:space-between; font-size:.84rem; }
      .launch b { font-size:1.5rem; font-weight:400; }
      .utility { background:#19363d; color:#f7f7f2; }
      .utility .shell { display:grid; grid-template-columns:1fr minmax(270px,.7fr); gap:80px; align-items:end; padding:48px 0; }
      .utility h2,.directory h2 { font-family:"Songti SC","STSong",serif; font-size:clamp(1.65rem,3vw,2.6rem); letter-spacing:-.04em; }
      .utility p { margin-top:11px; color:#cad3cf; font-size:.9rem; line-height:1.65; }
      .find label { display:block; margin-bottom:10px; color:#cad3cf; font-size:.75rem; letter-spacing:.12em; }
      .find input { width:100%; border:0; border-bottom:1px solid #cad3cf; border-radius:0; padding:10px 0; color:#f7f7f2; outline:0; background:transparent; }
      .find input::placeholder { color:#b3c0bc; }
      .directory { padding:84px 0 100px; }
      .directory-heading { display:flex; align-items:end; justify-content:space-between; gap:30px; padding-bottom:32px; border-bottom:1px solid #9aa4a0; }
      .directory-heading p { max-width:520px; margin-top:12px; color:#53656a; line-height:1.65; }
      .count { flex:0 0 auto; color:#b84b37!important; font-size:.82rem; text-align:right; }
      .groups { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:48px 72px; padding-top:44px; }
      .group { min-width:0; }
      .group-title { display:flex; align-items:center; justify-content:space-between; gap:18px; padding-bottom:15px; border-bottom:2px solid #17262a; font-family:"Songti SC","STSong",serif; font-size:1.34rem; }
      .group-title span { color:#b84b37; font-family:"PingFang SC",sans-serif; font-size:.68rem; font-weight:600; letter-spacing:.12em; }
      .link-list { margin:0; padding:0; list-style:none; }
      .link-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:14px; align-items:center; min-height:54px; border-bottom:1px solid #b5bcb8; }
      .link-row a { display:flex; align-items:center; justify-content:space-between; gap:12px; min-width:0; padding:11px 0; color:#17262a; text-decoration:none; }
      .link-row a:hover { color:#b84b37; }
      .arrow { color:#b84b37; font-size:1.22rem; }
      .scope { color:#68777a; font-size:.72rem; white-space:nowrap; }
      .empty { grid-column:1 / -1; padding:40px 0; color:#53656a; }
      .restore { margin-top:68px; color:#68777a; font-size:.78rem; }
      .restore button { margin-left:8px; border:0; padding:0; color:#b84b37; text-decoration:underline; cursor:pointer; background:none; }
      @media (max-width:900px) { .shell{width:min(100% - 44px,1320px)} .hero{grid-template-columns:1fr;gap:56px;min-height:auto;padding:64px 0} .hero-copy p{max-width:580px} .portal-field{max-width:720px;width:100%;justify-self:center} .utility .shell{grid-template-columns:1fr;gap:28px;align-items:start} }
      @media (max-width:600px) { .shell{width:calc(100% - 32px)} .site-header{min-height:88px} .seal{width:43px;border-width:2px;font-size:16px} .seal::before{inset:5px} .brand{gap:11px}.brand strong{font-size:1.18rem} h1{font-size:clamp(3.65rem,17vw,5.8rem)} .hero{padding:43px 0 56px}.portal-field{grid-template-columns:1fr;gap:10px;padding:31px 14px 14px}.portal-field::before{inset:0 0 0 12px}.field-caption{right:0;font-size:.63rem}.core-link{grid-column:auto!important;min-height:145px;padding:18px}.groups{grid-template-columns:1fr;gap:40px;padding-top:35px}.directory{padding:56px 0 70px}.directory-heading{display:block}.count{text-align:left;margin-top:20px!important}.utility .shell{padding:38px 0}.scope{font-size:.66rem} }
    </style>
    <main class="page" id="top">
      <header class="shell site-header">
        <a class="brand" href="#top" aria-label="回到页面顶部"><span class="seal" aria-hidden="true"><span>中 民</span></span><strong>你的一站式民大导航</strong></a>
      </header>
      <section class="shell hero" aria-labelledby="muc-title">
        <div class="hero-copy"><h1 id="muc-title"><span class="title-line">下一站，</span><span class="title-line">直接抵达。</span></h1><p>把每天最常用的校园入口放在眼前：办事、选课、查看研究生培养信息，或回到学校官网。</p></div>
        <div class="portal-field" aria-label="四个核心入口"><span class="field-caption">四个核心入口 / CORE FOUR</span>
          <a class="core-link home" href="https://www.muc.edu.cn/" target="_blank" rel="noopener noreferrer"><span class="kind">学校资讯</span><strong>中央民族大学官网</strong><span class="launch">进入官网 <b>→</b></span></a>
          <a class="core-link portal" href="https://my.muc.edu.cn/" target="_blank" rel="noopener noreferrer"><span class="kind">统一办事 · 需登录</span><strong>智慧信息门户</strong><span class="launch">进入门户 <b>→</b></span></a>
          <a class="core-link graduate" href="https://yjsy.muc.edu.cn/#/StudentsHomePage" target="_blank" rel="noopener noreferrer"><span class="kind">研究生培养 · 需登录</span><strong>研究生教务系统</strong><span class="launch">进入系统 <b>→</b></span></a>
          <a class="core-link undergraduate" href="https://jwxs.muc.edu.cn/" target="_blank" rel="noopener noreferrer"><span class="kind">本科教学 · 需登录</span><strong>本科生教务系统</strong><span class="launch">进入系统 <b>→</b></span></a>
        </div>
      </section>
      <section class="utility" aria-labelledby="utility-title"><div class="shell"><div><h2 id="utility-title">按要办的事找，不按部门找。</h2><p>教学、校园生活、公共信息、学院与研究机构依次排列。输入关键词可即时筛选。</p></div><div class="find"><label for="muc-search">查找链接</label><input id="muc-search" type="search" placeholder="例如：图书馆、法学院、VPN" autocomplete="off"></div></div></section>
      <section class="shell directory" aria-labelledby="directory-title"><div class="directory-heading"><div><h2 id="directory-title">更多官方入口</h2><p>按学生使用频率排序。标注“需登录”的系统会要求你的统一身份认证账号。</p></div><p class="count" id="muc-count" aria-live="polite"></p></div><div class="groups" id="muc-groups"></div><p class="restore">此页面由 Yuze 临时生成，不读取或提交当前网页数据。<button type="button" id="muc-restore">刷新当前标签页，回到原网页</button></p></section>
    </main>`;

  // 只替换当前标签页呈现；刷新会重新请求原网址，因此可恢复原网页。
  document.body.replaceChildren(host);
  document.title = "你的一站式民大导航";
  document.documentElement.style.setProperty("background", "#e7e8e1", "important");
  document.body.style.setProperty("margin", "0", "important");
  document.body.style.setProperty("min-height", "100vh", "important");
  document.body.style.setProperty("overflow", "hidden", "important");

  const groupsEl = shadow.getElementById("muc-groups");
  const countEl = shadow.getElementById("muc-count");
  const searchEl = shadow.getElementById("muc-search");
  const link = ([name, url, scope]) => `<li class="link-row"><a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="${name}（在新标签页打开）"><span>${name}</span><span class="arrow" aria-hidden="true">→</span></a><span class="scope">${scope}</span></li>`;

  function render(query = "") {
    const key = query.trim().toLowerCase();
    let visible = 0;
    const markup = groups.map(group => {
      const items = group.items.filter(item => item.join(" ").toLowerCase().includes(key));
      visible += items.length;
      return items.length ? `<section class="group"><h3 class="group-title">${group.title}<span>${group.caption}</span></h3><ul class="link-list">${items.map(link).join("")}</ul></section>` : "";
    }).join("");
    groupsEl.innerHTML = markup || '<p class="empty">没有找到对应入口。试试“教务”“学院”“网络”等关键词。</p>';
    countEl.textContent = key ? `目录已更新：显示 ${visible} 个匹配入口` : `共 ${visible} 个补充入口`;
  }

  searchEl.addEventListener("input", event => render(event.target.value));
  shadow.getElementById("muc-restore").addEventListener("click", () => location.reload());
  render();
})();