async function run(args) {
  // ══════════════════════════════════════════════════════════════════════════
  // ⏳ 今日时光机 v2 — 实时追踪上网时长 + 分享仪表盘图片
  // Yuze 技炉大赛 · 脚本赛道参赛作品
  // ══════════════════════════════════════════════════════════════════════════

  // ── Toggle: re-run closes the panel ──────────────────────────────────────
  const existing = document.getElementById('Yuze-timemachine');
  if (existing) {
    cleanup();
    return { ok: true, summary: '已关闭时光机' };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  const todayStr = () => {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };
  const yesterdayStr = () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  };

  const today = todayStr();
  const STORAGE_KEY = 'Yuze_timemachine_' + today;
  const POS_KEY = 'Yuze_tm_pos';

  // ── Domain classification (120+ domains) ────────────────────────────────
  const siteCategories = {
    work: [
      'github.com','notion.so','figma.com','linear.app','docs.google','sheets.google',
      'slides.google','drive.google','slack.com','teams.microsoft','feishu.cn',
      'dingtalk.com','gitlab.com','stackoverflow.com','juejin.cn','csdn.net',
      'jira.','confluence.','trello.com','asana.com','clickup.com','monday.com',
      'vercel.com','netlify.com','supabase.com','heroku.com','railway.app',
      'jenkins.','gitlab.io','bitbucket.org','sentry.io','datadoghq.com',
      'postman.com','insomnia.rest','figma.com','sketch.com','canva.com',
      'docs.airtable.com','coda.io','miro.com','whimsical.com','excalidraw.com',
      'deepseek.com','openai.com','chat.openai.com','claude.ai','copilot.microsoft.com',
      'kimi.moonshot.cn','tongyi.aliyun.com','yiyan.baidu.com','chatglm.cn',
      'coze.com','dify.ai','langchain.com','huggingface.co','colab.research.google.com',
      'kaggle.com','replit.com','codesandbox.io','stackblitz.com','codepen.io',
      'developer.mozilla.org','w3schools.com','css-tricks.com','medium.com',
      'substack.com','ghost.org','wordpress.com','blogger.com','typecho.org',
      'yuque.com','wolai.com','wps.cn','kdocs.cn','shimo.im','mubu.com',
      'dingtalk.com','weixin.qq.com','企业微信','tencent.com','alibaba.com',
      'amazonaws.com','cloudflare.com','dns.cloudflare.com'
    ],
    learn: [
      'coursera.org','udemy.com','edx.org','youtube.com','bilibili.com','zhihu.com',
      'wikipedia.org','khanacademy.org','web.Yuzebrowser.com','Yuzebrowser.com',
      'mooc.cn','icourse163.org','xuetangx.com','open.163.com','icloud.uilab.com',
      'segmentfault.com','v2ex.com','discuss.llvm.org','news.ycombinator.com',
      'reddit.com','quora.com','medium.com','dev.to','hashnode.dev','dzone.com',
      'freecodecamp.org','codecademy.com','leetcode.com','leetcode.cn',
      'nowcoder.com','luogu.com.cn','acwing.com','oi-wiki.org','oi.org',
      'arxiv.org','scholar.google.com','semanticscholar.org','paperswithcode.com',
      'sci-hub.se','libgen.is','z-lib.org','gutenberg.org','archive.org',
      'juejin.cn','segmentfault.com','infoq.cn','oschina.net','cnblogs.com',
      'iteye.com','oschina.net','linux.do','lwn.net','kernel.org',
      'docs.python.org','developer.apple.com','developer.android.com',
      'learn.microsoft.com','docs.oracle.com','go.dev','rust-lang.org',
      'kubernetes.io','docker.com','terraform.io','ansible.com',
      'spring.io','flask.palletsprojects.com','django.fun','laravel.com',
      'nextjs.org','astro.build','svelte.dev','vuejs.org','react.dev'
    ],
    leisure: [
      'twitter.com','x.com','weibo.com','xiaohongshu.com','douyin.com',
      'tiktok.com','instagram.com','facebook.com','netflix.com','iqiyi.com',
      'youku.com','baidu.com','tieba.baidu.com','steam.com','store.steampowered.com',
      'douban.com','hupu.com','nga.cn','zhihu.com','tieba.baidu.com',
      'taobao.com','tmall.com','jd.com','pinduoduo.com','suning.com',
      'meituan.com','ele.me','dianping.com','ctrip.com','qunar.com',
      '163.com','sina.com','sohu.com','ifeng.com','people.com.cn',
      'xinhuanet.com','chinadaily.com.cn','thepaper.cn','caixin.com',
      'sspai.com','36kr.com','pingwest.com','ifanr.com','geekpark.net',
      'smzdm.com','chiphell.com','v2ex.com','nga.178.com','nga.cn',
      'acfun.cn','mcbbs.net','mc.huijiwiki.com','pokemon.com',
      'nintendo.com','playstation.com','xbox.com','ea.com','ubisoft.com',
      'blizzard.com','riotgames.com','supercell.com','mojang.com',
      'music.163.com','y.qq.com','kugou.com','kuwo.cn','spotify.com',
      'music.apple.com','soundcloud.com','bandcamp.com',
      'mgtv.com','v.qq.com','m.bilibili.com','agefans.tv',
      'zhihu.com','douyin.com','kuaishou.com','huoshanzhibo.com',
      'im.qq.com','telegram.org','web.telegram.org','discord.com',
      'whatsapp.com','signal.org','line.me'
    ]
  };

  const classify = (host) => {
    const h = host.toLowerCase();
    for (const [cat, domains] of Object.entries(siteCategories))
      if (domains.some(d => h.includes(d))) return cat;
    return 'other';
  };

  // ── Data ─────────────────────────────────────────────────────────────────
  let data;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { data = {}; }
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {} };

  const host = location.hostname || '当前页面';
  if (!data[host]) data[host] = { sec: 0, cat: classify(host), visits: 0 };
  data[host].visits++;
  save();

  // ── Visibility API: accurate timing ─────────────────────────────────────
  let pausedAt = null;
  let tickInterval = null;
  let elapsedSinceTick = 0;

  const onVisibilityChange = () => {
    if (document.hidden) {
      if (pausedAt === null) pausedAt = Date.now();
    } else {
      if (pausedAt !== null) {
        const gap = Math.floor((Date.now() - pausedAt) / 1000);
        if (gap > 0) {
          const h2 = location.hostname || '当前页面';
          if (!data[h2]) data[h2] = { sec: 0, cat: classify(h2), visits: 0 };
          data[h2].sec += gap;
          save();
          renderBody();
        }
        pausedAt = null;
      }
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  // ── Styles ───────────────────────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'Yuze-tm-style';
  style.textContent = `
    @keyframes tmFadeIn { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
    #Yuze-timemachine { animation: tmFadeIn .3s ease; }
    #Yuze-timemachine button { transition: opacity .15s, transform .15s; }
    #Yuze-timemachine button:hover { opacity: .8 !important; }
    #Yuze-tm-list::-webkit-scrollbar { width: 4px; }
    #Yuze-tm-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.2); border-radius: 2px; }
  `;
  document.head.appendChild(style);

  // ── Panel ────────────────────────────────────────────────────────────────
  const panel = document.createElement('div');
  panel.id = 'Yuze-timemachine';

  // Restore saved position or use default
  let savedPos = null;
  try { savedPos = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); } catch {}
  const posStyle = savedPos
    ? `left:${savedPos.left}px;top:${savedPos.top}px;`
    : 'top:80px;right:20px;';

  panel.style.cssText = `
    position:fixed; ${posStyle} width:min(290px, calc(100vw - 40px));
    background:rgba(10,18,38,0.88); backdrop-filter:blur(24px); -webkit-backdrop-filter:blur(24px);
    border:1px solid rgba(255,255,255,.15); border-radius:18px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    box-shadow:0 24px 64px rgba(0,0,0,.5); color:#f1f5f9;
    z-index:2147483647; padding:16px; user-select:none;
  `;

  const header = document.createElement('div');
  header.id = 'tm-drag';
  header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;cursor:move';
  header.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:20px">⏳</span>
      <div>
        <div style="font-size:14px;font-weight:700;line-height:1.2">今日时光机</div>
        <div style="font-size:10px;color:#64748b">${today}</div>
      </div>
    </div>
    <div style="display:flex;gap:4px">
      <button id="tm-share" title="生成分享图片" style="background:rgba(96,165,250,.2);border:1px solid rgba(96,165,250,.3);color:#60a5fa;border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer;font-weight:600">分享</button>
      <button id="tm-export" title="导出JSON数据" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#94a3b8;border-radius:7px;padding:3px 8px;font-size:11px;cursor:pointer">导出</button>
      <button id="tm-close" style="background:rgba(255,255,255,.08);border:none;color:#64748b;border-radius:7px;width:26px;height:26px;cursor:pointer;font-size:12px">✕</button>
    </div>
  `;

  const body = document.createElement('div');
  body.id = 'tm-body';

  panel.appendChild(header);
  panel.appendChild(body);
  document.body.appendChild(panel);

  // ── Render ───────────────────────────────────────────────────────────────
  const CAT_COLOR = { work:'#4ade80', learn:'#60a5fa', leisure:'#f87171', other:'#a78bfa' };
  const CAT_LABEL = { work:'工作', learn:'学习', leisure:'娱乐', other:'其他' };
  const fmt = s => s < 60 ? s + '秒' : s < 3600
    ? Math.floor(s / 60) + '分钟'
    : Math.floor(s / 3600) + 'h' + String(Math.floor((s % 3600) / 60)).padStart(2, '0') + 'm';

  const renderBody = () => {
    const entries = Object.entries(data).sort((a, b) => b[1].sec - a[1].sec);
    const totalSec = entries.reduce((s, [, v]) => s + v.sec, 0);
    const byCat = { work: 0, learn: 0, leisure: 0, other: 0 };
    entries.forEach(([, v]) => { byCat[v.cat] = (byCat[v.cat] || 0) + v.sec; });
    const pct = s => totalSec > 0 ? Math.round(s / totalSec * 100) : 0;

    let badge = '⚖️ 均衡浏览';
    if (totalSec > 0) {
      if (pct(byCat.leisure) >= 60) badge = '😴 摸鱼预警';
      else if (pct(byCat.work) + pct(byCat.learn) >= 65) badge = '🔥 高效状态';
    }

    // Empty state
    if (entries.length === 0 || totalSec < 2) {
      body.innerHTML = `
        <div style="text-align:center;padding:24px 12px;color:#64748b">
          <div style="font-size:28px;margin-bottom:8px">⏳</div>
          <div style="font-size:12px;line-height:1.6">正在记录你的上网时光…<br>浏览几个页面后回来看效果</div>
        </div>`;
      return;
    }

    const statsHTML = ['work', 'learn', 'leisure'].map(cat => `
      <div style="flex:1;background:rgba(255,255,255,.07);border-radius:10px;padding:8px 4px;text-align:center;border:1px solid rgba(255,255,255,.08)">
        <div style="font-size:20px;font-weight:800;color:${CAT_COLOR[cat]}">${pct(byCat[cat])}%</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px">${CAT_LABEL[cat]}</div>
      </div>
    `).join('');

    const listHTML = entries.slice(0, 8).map(([site, v]) => {
      const p = pct(v.sec);
      const isNow = site === host;
      return `
        <div style="margin:5px 0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
            <span style="font-size:11.5px;color:${isNow ? '#fff' : '#cbd5e1'};max-width:170px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:${isNow ? '600' : '400'}">${isNow ? '▶ ' : ''}${site}</span>
            <span style="font-size:10.5px;color:#64748b">${fmt(v.sec)}</span>
          </div>
          <div style="background:rgba(255,255,255,.08);border-radius:4px;height:4px;overflow:hidden">
            <div style="height:100%;width:${p}%;background:${CAT_COLOR[v.cat]};border-radius:4px;transition:width .6s ease"></div>
          </div>
        </div>`;
    }).join('');

    // Yesterday comparison
    let yesterdayHTML = '';
    try {
      const yData = JSON.parse(localStorage.getItem('Yuze_timemachine_' + yesterdayStr()) || '{}');
      const yTotal = Object.values(yData).reduce((s, v) => s + (v.sec || 0), 0);
      if (yTotal > 0) {
        yesterdayHTML = `
          <div style="text-align:center;font-size:11px;color:#475569;margin-top:8px;padding:5px;background:rgba(255,255,255,.04);border-radius:7px">
            昨天 ${fmt(yTotal)} · 今天已 ${fmt(totalSec)}
          </div>`;
      }
    } catch {}

    body.innerHTML = `
      <div style="display:flex;gap:7px;margin-bottom:10px">${statsHTML}</div>
      <div style="text-align:center;font-size:12.5px;padding:7px;background:rgba(255,255,255,.07);border-radius:9px;margin-bottom:10px">
        ${badge} &nbsp;·&nbsp; 今日 <strong>${fmt(totalSec)}</strong>
      </div>
      <div id="Yuze-tm-list" style="max-height:190px;overflow-y:auto;padding-right:2px">${listHTML}</div>
      ${yesterdayHTML}
    `;
  };
  renderBody();

  // ── Start ticker ─────────────────────────────────────────────────────────
  const startTicker = () => {
    if (tickInterval) return;
    tickInterval = setInterval(() => {
      if (document.hidden) return; // double safety
      const h = location.hostname || '当前页面';
      if (!data[h]) data[h] = { sec: 0, cat: classify(h), visits: 0 };
      data[h].sec++;
      save();
      renderBody();
    }, 1000);
  };
  startTicker();

  // ── Close / Cleanup ──────────────────────────────────────────────────────
  function cleanup() {
    clearInterval(tickInterval);
    tickInterval = null;
    document.removeEventListener('visibilitychange', onVisibilityChange);
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('keydown', onKeydown);
    panel.remove();
    style.remove();
  }

  document.getElementById('tm-close').onclick = cleanup;

  // Escape key
  const onKeydown = (e) => { if (e.key === 'Escape') cleanup(); };
  document.addEventListener('keydown', onKeydown);

  // ── Share: Canvas image card ─────────────────────────────────────────────
  document.getElementById('tm-share').onclick = () => {
    const entries = Object.entries(data).sort((a, b) => b[1].sec - a[1].sec);
    const totalSec = entries.reduce((s, [, v]) => s + v.sec, 0);
    const byCat = { work: 0, learn: 0, leisure: 0, other: 0 };
    entries.forEach(([, v]) => { byCat[v.cat] = (byCat[v.cat] || 0) + v.sec; });
    const pct = s => totalSec > 0 ? Math.round(s / totalSec * 100) : 0;

    let badge = '⚖️ 均衡浏览';
    if (totalSec > 0) {
      if (pct(byCat.leisure) >= 60) badge = '😴 摸鱼预警';
      else if (pct(byCat.work) + pct(byCat.learn) >= 65) badge = '🔥 高效状态';
    }

    // Build canvas
    const W = 800, H = 420;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');

    // Background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a1226');
    bg.addColorStop(0.5, '#0f1d35');
    bg.addColorStop(1, '#0a1226');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Noise texture
    ctx.save(); ctx.globalAlpha = 0.03;
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
    }
    ctx.restore();

    // Top accent line
    const topGrad = ctx.createLinearGradient(40, 0, W - 40, 0);
    topGrad.addColorStop(0, '#4ade80');
    topGrad.addColorStop(0.5, '#60a5fa');
    topGrad.addColorStop(1, '#f87171');
    ctx.save(); ctx.globalAlpha = 0.6;
    ctx.fillStyle = topGrad;
    ctx.fillRect(40, 28, W - 80, 2);
    ctx.restore();

    // ── Left side: total time + badge ────────────────────────────────────
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px -apple-system,sans-serif';
    ctx.fillText('TODAY\'S SCREEN TIME', 50, 58);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 48px -apple-system,sans-serif';
    ctx.fillText(fmt(totalSec), 50, 120);

    // Badge
    ctx.font = '16px -apple-system,sans-serif';
    ctx.fillText(badge, 50, 155);

    // Date
    ctx.fillStyle = '#475569';
    ctx.font = '12px -apple-system,sans-serif';
    ctx.fillText(today, 50, 180);

    // Category breakdown text
    const cats = [
      { label: '工作', pct: pct(byCat.work), color: '#4ade80' },
      { label: '学习', pct: pct(byCat.learn), color: '#60a5fa' },
      { label: '娱乐', pct: pct(byCat.leisure), color: '#f87171' },
    ];
    cats.forEach((cat, i) => {
      const y = 220 + i * 28;
      ctx.fillStyle = cat.color;
      ctx.beginPath();
      ctx.arc(58, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '13px -apple-system,sans-serif';
      ctx.fillText(cat.label + '  ' + cat.pct + '%', 72, y + 4);
    });

    // ── Right side: donut chart ──────────────────────────────────────────
    const cx = 530, cy = 180, R = 100, r = 60;
    const catOrder = ['work', 'learn', 'leisure', 'other'];
    const catColors = { work: '#4ade80', learn: '#60a5fa', leisure: '#f87171', other: '#a78bfa' };
    let startAngle = -Math.PI / 2;

    catOrder.forEach(cat => {
      const val = byCat[cat] || 0;
      if (val === 0) return;
      const sweep = (val / totalSec) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, R, startAngle, startAngle + sweep);
      ctx.arc(cx, cy, r, startAngle + sweep, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = catColors[cat];
      ctx.fill();
      startAngle += sweep;
    });

    // Center text in donut
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 22px -apple-system,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(fmt(totalSec), cx, cy + 2);
    ctx.fillStyle = '#64748b';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.fillText('今日总计', cx, cy + 20);
    ctx.textAlign = 'left';

    // ── Top 5 list ──────────────────────────────────────────────────────
    const top5 = entries.slice(0, 5);
    const listX = 370, listY = 300;
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 11px -apple-system,sans-serif';
    ctx.fillText('TOP 5 SITES', listX, listY);

    top5.forEach(([site, v], i) => {
      const y = listY + 22 + i * 22;
      const barW = Math.max(4, (v.sec / (top5[0]?.sec || 1)) * 140);
      ctx.fillStyle = catColors[v.cat] || '#a78bfa';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(listX, y - 8, barW, 12);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px -apple-system,sans-serif';
      const displayName = site.length > 18 ? site.slice(0, 16) + '…' : site;
      ctx.fillText(displayName, listX + barW + 8, y);
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(fmt(v.sec), W - 50, y);
      ctx.textAlign = 'left';
    });

    // ── Bottom bar: brand ───────────────────────────────────────────────
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, H - 36, W, 36);
    ctx.fillStyle = '#475569';
    ctx.font = '11px -apple-system,sans-serif';
    ctx.fillText('⏳ 今日时光机  ·  Yuze', 50, H - 14);
    ctx.textAlign = 'right';
    ctx.fillText('#Yuze技炉大赛', W - 50, H - 14);
    ctx.textAlign = 'left';

    // ── Download + Copy ─────────────────────────────────────────────────
    try {
      const a = document.createElement('a');
      a.download = '时光机_' + today + '.png';
      a.href = c.toDataURL('image/png', 1.0);
      a.click();
    } catch {}

    // Try clipboard
    try {
      c.toBlob(async blob => {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        } catch {}
      }, 'image/png', 1.0);
    } catch {}

    const btn = document.getElementById('tm-share');
    if (btn) { btn.textContent = '✓ 已保存'; setTimeout(() => { if (btn) btn.textContent = '分享'; }, 2200); }
  };

  // ── Export: JSON data ────────────────────────────────────────────────────
  document.getElementById('tm-export').onclick = () => {
    const entries = Object.entries(data).sort((a, b) => b[1].sec - a[1].sec);
    const totalSec = entries.reduce((s, [, v]) => s + v.sec, 0);
    const exportData = {
      date: today,
      exportedAt: new Date().toISOString(),
      totalSeconds: totalSec,
      sites: entries.map(([domain, v]) => ({
        domain,
        seconds: v.sec,
        category: v.cat,
        visits: v.visits
      }))
    };
    try {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.download = '时光机_' + today + '.json';
      a.href = URL.createObjectURL(blob);
      a.click();
      URL.revokeObjectURL(a.href);
      const btn = document.getElementById('tm-export');
      if (btn) { btn.textContent = '✓ 导出'; setTimeout(() => { if (btn) btn.textContent = '导出'; }, 2200); }
    } catch {}
  };

  // ── Drag (mouse + touch) ────────────────────────────────────────────────
  let drag = false, ox = 0, oy = 0;

  const savePos = () => {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({
        left: panel.offsetLeft,
        top: panel.offsetTop
      }));
    } catch {}
  };

  // Mouse
  document.getElementById('tm-drag').onmousedown = e => {
    drag = true;
    ox = e.clientX - panel.offsetLeft;
    oy = e.clientY - panel.offsetTop;
    e.preventDefault();
  };
  const onMove = e => {
    if (!drag) return;
    panel.style.left = (e.clientX - ox) + 'px';
    panel.style.top = (e.clientY - oy) + 'px';
    panel.style.right = 'auto';
  };
  const onUp = () => { if (drag) { drag = false; savePos(); } };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);

  // Touch
  document.getElementById('tm-drag').ontouchstart = e => {
    drag = true;
    const t = e.touches[0];
    ox = t.clientX - panel.offsetLeft;
    oy = t.clientY - panel.offsetTop;
    e.preventDefault();
  };
  const onTouchMove = e => {
    if (!drag) return;
    const t = e.touches[0];
    panel.style.left = (t.clientX - ox) + 'px';
    panel.style.top = (t.clientY - oy) + 'px';
    panel.style.right = 'auto';
  };
  const onTouchEnd = () => { if (drag) { drag = false; savePos(); } };
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);

  return { ok: true, summary: '今日时光机 v2 已启动 — 精确计时 · 120+域名分类 · 仪表盘分享图 · 昨日对比 · 数据导出' };
}