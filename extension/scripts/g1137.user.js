async function run(args) {
  // ============================================================
  // 🧠 SmartPage Pro · 智慧网页助手 v2.0
  // 功能：阅读进度 · 智能摘要 · 知识本 · 高亮 · 沉浸模式 · 快捷键
  // ============================================================
  const APP_ID = 'spp';
  const STORAGE_KEY = 'smartpage_pro_kb_v2';

  // ===== 防重复初始化 =====
  if (document.getElementById(`${APP_ID}-fab`)) {
    const panel = document.getElementById(`${APP_ID}-panel`);
    if (panel) {
      const vis = panel.style.display !== 'none';
      panel.style.display = vis ? 'none' : 'flex';
    }
    return { ok: true, summary: 'SmartPage Pro 已切换显示状态' };
  }

  // ===== 知识本管理 =====
  const KB = {
    get() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch { return []; }
    },
    save(item) {
      const items = this.get();
      items.unshift({
        id: Date.now(),
        text: item.text,
        note: item.note || '',
        url: location.href,
        title: document.title,
        domain: location.hostname,
        color: item.color || '#6366f1',
        time: new Date().toLocaleString('zh-CN'),
        ts: Date.now()
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 500)));
    },
    delete(id) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.get().filter(i => i.id !== id)));
    },
    search(q) {
      const items = this.get();
      if (!q) return items;
      const lq = q.toLowerCase();
      return items.filter(i =>
        i.text.toLowerCase().includes(lq) ||
        i.title.toLowerCase().includes(lq) ||
        (i.note && i.note.toLowerCase().includes(lq))
      );
    },
    exportMD() {
      const items = this.get();
      if (!items.length) return '# 知识本为空\n';
      const byDomain = {};
      items.forEach(i => { (byDomain[i.domain] = byDomain[i.domain] || []).push(i); });
      let md = `# 📚 SmartPage Pro 知识本\n\n> 导出时间：${new Date().toLocaleString('zh-CN')}  共 ${items.length} 条笔记\n\n---\n\n`;
      for (const [domain, its] of Object.entries(byDomain)) {
        md += `## 🌐 ${domain}\n\n`;
        its.forEach(i => {
          md += `### 📌 ${i.title}\n> ${i.text}\n\n`;
          if (i.note) md += `💡 **备注**：${i.note}\n\n`;
          md += `🔗 [原文链接](${i.url})  🕐 ${i.time}\n\n---\n\n`;
        });
      }
      return md;
    }
  };

  // ===== 智能摘要（TextRank算法）=====
  function generateSummary() {
    const nodes = Array.from(document.querySelectorAll('p, h1, h2, h3, article, .content, .post-body'));
    const paras = nodes.map(el => el.innerText?.trim()).filter(t => t && t.length > 20 && t.length < 600);
    if (!paras.length) return { sentences: [], keywords: [], wordCount: 0, readTime: '< 1 分钟' };

    const stopWords = new Set(['的','了','在','是','我','有','和','就','不','人','都','一','也','很','到','说','要','去','你','会','着','这','那','但','而','与','对','为','以','及','被','等','中','the','a','an','is','are','was','were','be','to','of','in','for','on','with','at','by','as','or','and','but','it','this','that','not','we','he','she','they','I','you']);

    const wordFreq = {};
    paras.join(' ').match(/[\u4e00-\u9fa5]{2,6}|[a-zA-Z]{3,}/g)?.forEach(w => {
      if (!stopWords.has(w)) wordFreq[w] = (wordFreq[w] || 0) + 1;
    });

    const keywords = Object.entries(wordFreq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);

    const scored = paras.map(s => {
      let score = 0;
      keywords.forEach(kw => { if (s.includes(kw)) score += (wordFreq[kw] || 0); });
      if (/^[一二三四五六七八九十\d①②③]/.test(s)) score += 3;
      if (s.length > 50 && s.length < 200) score += 2;
      return { s, score };
    });

    const sentences = scored.sort((a, b) => b.score - a.score).slice(0, 5).map(x => x.s);
    const allText = paras.join('');
    const wordCount = (allText.match(/[\u4e00-\u9fa5]|[a-zA-Z]+/g) || []).length;
    const readMins = Math.max(1, Math.ceil(wordCount / 300));
    return { sentences, keywords: keywords.slice(0, 8), wordCount, readTime: `${readMins} 分钟` };
  }

  // ===== CSS 样式 =====
  const css = `
    #${APP_ID}-progress {
      position:fixed;top:0;left:0;width:0%;height:3px;z-index:2147483640;
      background:linear-gradient(90deg,#6366f1,#8b5cf6,#06b6d4);
      transition:width 0.15s linear;border-radius:0 2px 2px 0;
      box-shadow:0 0 12px rgba(99,102,241,0.7);pointer-events:none;
    }
    #${APP_ID}-fab {
      position:fixed;bottom:28px;right:28px;z-index:2147483638;
      width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      box-shadow:0 4px 20px rgba(99,102,241,0.55),0 0 0 0 rgba(99,102,241,0.35);
      display:flex;align-items:center;justify-content:center;
      font-size:24px;transition:transform 0.2s,box-shadow 0.2s;
      animation:${APP_ID}pulse 3s infinite;
    }
    #${APP_ID}-fab:hover{transform:scale(1.12);box-shadow:0 6px 28px rgba(99,102,241,0.75);}
    @keyframes ${APP_ID}pulse{
      0%,100%{box-shadow:0 4px 20px rgba(99,102,241,0.55),0 0 0 0 rgba(99,102,241,0.35);}
      60%{box-shadow:0 4px 20px rgba(99,102,241,0.55),0 0 0 12px rgba(99,102,241,0);}
    }
    #${APP_ID}-panel {
      position:fixed;bottom:94px;right:28px;z-index:2147483637;
      width:348px;max-height:82vh;
      background:rgba(10,10,18,0.97);backdrop-filter:blur(24px) saturate(180%);
      border:1px solid rgba(99,102,241,0.35);border-radius:22px;
      box-shadow:0 24px 64px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.04),inset 0 1px 0 rgba(255,255,255,0.06);
      display:flex;flex-direction:column;overflow:hidden;
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Hiragino Sans GB',sans-serif;
      animation:${APP_ID}in 0.32s cubic-bezier(0.34,1.56,0.64,1);
    }
    @keyframes ${APP_ID}in{
      from{opacity:0;transform:translateY(18px) scale(0.94);}
      to{opacity:1;transform:translateY(0) scale(1);}
    }
    .${APP_ID}-hd{
      padding:15px 18px 11px;
      background:linear-gradient(135deg,rgba(99,102,241,0.18),rgba(139,92,246,0.12));
      border-bottom:1px solid rgba(255,255,255,0.07);
      display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
    }
    .${APP_ID}-logo{font-size:14px;font-weight:700;color:#fff;display:flex;align-items:center;gap:8px;}
    .${APP_ID}-ver{font-size:9px;background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;padding:2px 7px;border-radius:20px;font-weight:600;letter-spacing:0.5px;}
    .${APP_ID}-cnt-badge{font-size:10px;background:rgba(99,102,241,0.18);color:#a5b4fc;padding:3px 9px;border-radius:20px;}
    .${APP_ID}-x{background:rgba(255,255,255,0.07);border:none;border-radius:7px;color:rgba(255,255,255,0.45);cursor:pointer;padding:3px 8px;font-size:13px;transition:all 0.15s;}
    .${APP_ID}-x:hover{background:rgba(255,80,80,0.2);color:#ff6b6b;}
    .${APP_ID}-tabs{display:flex;padding:10px 14px 0;gap:3px;border-bottom:1px solid rgba(255,255,255,0.06);flex-shrink:0;}
    .${APP_ID}-tab{
      flex:1;padding:8px 2px;border:none;background:transparent;
      color:rgba(255,255,255,0.4);font-size:11.5px;font-weight:500;
      cursor:pointer;border-radius:8px 8px 0 0;transition:all 0.2s;
      font-family:inherit;border-bottom:2px solid transparent;
    }
    .${APP_ID}-tab:hover{color:rgba(255,255,255,0.65);}
    .${APP_ID}-tab.on{color:#a5b4fc;background:rgba(99,102,241,0.1);border-bottom-color:#6366f1;}
    .${APP_ID}-body{flex:1;overflow-y:auto;padding:14px 14px 10px;}
    .${APP_ID}-body::-webkit-scrollbar{width:3px;}
    .${APP_ID}-body::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.35);border-radius:3px;}
    .${APP_ID}-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
    .${APP_ID}-card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:11px 13px;}
    .${APP_ID}-num{font-size:22px;font-weight:700;background:linear-gradient(90deg,#a5b4fc,#7dd3fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
    .${APP_ID}-lbl{font-size:11px;color:rgba(255,255,255,0.38);margin-top:2px;}
    .${APP_ID}-sec{font-size:10px;font-weight:600;color:rgba(255,255,255,0.3);letter-spacing:1.2px;text-transform:uppercase;margin:13px 0 8px;}
    .${APP_ID}-kwrap{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px;}
    .${APP_ID}-kw{font-size:11px;padding:3px 10px;border-radius:20px;background:rgba(99,102,241,0.13);border:1px solid rgba(99,102,241,0.28);color:#a5b4fc;}
    .${APP_ID}-si{font-size:12px;color:rgba(255,255,255,0.72);line-height:1.7;padding:8px 10px;margin-bottom:6px;background:rgba(255,255,255,0.03);border-radius:9px;border-left:2.5px solid rgba(99,102,241,0.55);}
    .${APP_ID}-tip{font-size:10px;color:rgba(255,255,255,0.22);text-align:center;padding:8px 0 2px;letter-spacing:0.3px;}
    .${APP_ID}-q{width:100%;box-sizing:border-box;padding:9px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#fff;font-size:12px;outline:none;margin-bottom:10px;font-family:inherit;transition:border-color 0.2s;}
    .${APP_ID}-q:focus{border-color:rgba(99,102,241,0.55);}
    .${APP_ID}-q::placeholder{color:rgba(255,255,255,0.22);}
    .${APP_ID}-ki{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:11px;padding:10px 12px;margin-bottom:8px;position:relative;transition:background 0.2s;}
    .${APP_ID}-ki:hover{background:rgba(255,255,255,0.07);}
    .${APP_ID}-kt{font-size:12px;color:rgba(255,255,255,0.8);line-height:1.65;margin-bottom:5px;border-left:3px solid var(--c,#6366f1);padding-left:8px;}
    .${APP_ID}-km{font-size:10px;color:rgba(255,255,255,0.28);display:flex;gap:6px;align-items:center;}
    .${APP_ID}-kd{position:absolute;top:8px;right:8px;background:rgba(239,68,68,0.12);border:none;border-radius:6px;color:rgba(239,68,68,0.65);cursor:pointer;font-size:10px;padding:2px 7px;opacity:0;transition:opacity 0.15s;font-family:inherit;}
    .${APP_ID}-ki:hover .${APP_ID}-kd{opacity:1;}
    .${APP_ID}-empty{text-align:center;padding:28px 8px;color:rgba(255,255,255,0.22);font-size:12.5px;line-height:2;}
    .${APP_ID}-ei{font-size:34px;display:block;margin-bottom:6px;}
    .${APP_ID}-ft{padding:10px 14px;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:7px;flex-shrink:0;}
    .${APP_ID}-btn{flex:1;padding:9px;border:none;border-radius:11px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all 0.2s;font-family:inherit;}
    .${APP_ID}-pri{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
    .${APP_ID}-pri:hover{filter:brightness(1.12);transform:translateY(-1px);}
    .${APP_ID}-sec2{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.62);border:1px solid rgba(255,255,255,0.1);}
    .${APP_ID}-sec2:hover{background:rgba(255,255,255,0.13);color:#fff;}
    #${APP_ID}-sel{
      position:fixed;z-index:2147483647;
      background:rgba(10,10,18,0.97);backdrop-filter:blur(18px);
      border:1px solid rgba(99,102,241,0.45);border-radius:13px;
      padding:7px 10px;display:flex;gap:5px;align-items:center;
      box-shadow:0 10px 36px rgba(0,0,0,0.45),0 0 0 1px rgba(255,255,255,0.05);
      animation:${APP_ID}fd 0.15s ease;pointer-events:auto;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    }
    @keyframes ${APP_ID}fd{from{opacity:0;transform:translateY(5px);}to{opacity:1;transform:translateY(0);}}
    .${APP_ID}-sb{padding:5px 9px;border:none;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.15s;white-space:nowrap;font-family:inherit;}
    .${APP_ID}-sv{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;}
    .${APP_ID}-sv:hover{filter:brightness(1.15);}
    .${APP_ID}-hl{background:rgba(253,224,71,0.14);color:#fde047;border:1px solid rgba(253,224,71,0.25);}
    .${APP_ID}-hl:hover{background:rgba(253,224,71,0.25);}
    .${APP_ID}-sr{background:rgba(6,182,212,0.1);color:#67e8f9;border:1px solid rgba(6,182,212,0.2);}
    .${APP_ID}-sr:hover{background:rgba(6,182,212,0.2);}
    .${APP_ID}-cp{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.6);}
    .${APP_ID}-cp:hover{background:rgba(255,255,255,0.14);color:#fff;}
    .${APP_ID}-div{width:1px;height:18px;background:rgba(255,255,255,0.1);}
    .${APP_ID}-nc{font-size:10px;color:rgba(255,255,255,0.28);padding:0 2px;}
    #${APP_ID}-toast{
      position:fixed;bottom:94px;left:50%;transform:translateX(-50%) translateY(80px);
      z-index:2147483647;background:rgba(10,10,18,0.97);backdrop-filter:blur(18px);
      color:#fff;padding:10px 20px;border-radius:30px;font-size:13px;font-weight:500;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);
      transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s;
      pointer-events:none;opacity:0;white-space:nowrap;
      font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    }
    #${APP_ID}-toast.on{transform:translateX(-50%) translateY(0);opacity:1;}
    .${APP_ID}-hl-y{background:linear-gradient(120deg,rgba(253,224,71,0.42) 0%,rgba(253,186,116,0.38) 100%);border-radius:3px;padding:0 2px;}
    .${APP_ID}-hl-b{background:linear-gradient(120deg,rgba(99,102,241,0.38) 0%,rgba(139,92,246,0.35) 100%);border-radius:3px;padding:0 2px;}
    .${APP_ID}-hl-g{background:linear-gradient(120deg,rgba(34,197,94,0.38) 0%,rgba(16,185,129,0.35) 100%);border-radius:3px;padding:0 2px;}
    .${APP_ID}-sc-row{display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:rgba(255,255,255,0.04);border-radius:9px;margin-bottom:5px;}
    .${APP_ID}-sc-key{font-size:10px;background:rgba(99,102,241,0.18);color:#a5b4fc;padding:2px 8px;border-radius:5px;font-family:monospace;}
    .${APP_ID}-sc-val{font-size:11px;color:rgba(255,255,255,0.65);}
  `;
  const styleEl = document.createElement('style');
  styleEl.id = `${APP_ID}-styles`;
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ===== Toast =====
  const toastEl = document.createElement('div');
  toastEl.id = `${APP_ID}-toast`;
  document.body.appendChild(toastEl);
  let toastT;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
  }

  // ===== 进度条 =====
  const bar = document.createElement('div');
  bar.id = `${APP_ID}-progress`;
  document.body.appendChild(bar);
  function updateBar() {
    const st = window.scrollY, dh = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (dh > 0 ? Math.min(100, st / dh * 100) : 0) + '%';
  }
  window.addEventListener('scroll', updateBar, { passive: true });
  updateBar();

  // ===== 生成摘要 =====
  const sumData = generateSummary();

  // ===== 面板状态 =====
  let curTab = 'summary', immersive = false, hlColor = 'yellow';

  // ===== HTML 构建 =====
  function buildSummary() {
    return `
      <div class="${APP_ID}-grid">
        <div class="${APP_ID}-card"><div class="${APP_ID}-num">${sumData.wordCount.toLocaleString()}</div><div class="${APP_ID}-lbl">📝 字数</div></div>
        <div class="${APP_ID}-card"><div class="${APP_ID}-num">${sumData.readTime}</div><div class="${APP_ID}-lbl">⏱ 阅读时间</div></div>
      </div>
      <div class="${APP_ID}-sec">🔑 核心关键词</div>
      <div class="${APP_ID}-kwrap">${sumData.keywords.map(k => `<span class="${APP_ID}-kw">${k}</span>`).join('') || '<span style="color:rgba(255,255,255,0.28);font-size:12px">未检测到</span>'}</div>
      <div class="${APP_ID}-sec">💡 智能摘要</div>
      ${sumData.sentences.map(s => `<div class="${APP_ID}-si">${s.length > 110 ? s.slice(0, 107) + '…' : s}</div>`).join('')}
      ${!sumData.sentences.length ? '<div class="' + APP_ID + '-empty">暂无可提取段落</div>' : ''}
      <div class="${APP_ID}-tip">💡 选中任意文字，即可保存到知识本</div>
    `;
  }
  function buildKB(q = '') {
    const items = KB.search(q);
    return `
      <input class="${APP_ID}-q" id="${APP_ID}-qs" placeholder="🔍 搜索知识本…" value="${q}" />
      ${!items.length ? `<div class="${APP_ID}-empty"><span class="${APP_ID}-ei">${q ? '🔍' : '📭'}</span>${q ? '无匹配结果' : '知识本还是空的<br>选中文字立即保存！'}</div>` : ''}
      ${items.slice(0, 40).map(it => `<div class="${APP_ID}-ki"><div class="${APP_ID}-kt" style="--c:${it.color}">${it.text.length > 140 ? it.text.slice(0, 137) + '…' : it.text}</div><div class="${APP_ID}-km"><span>🌐 ${it.domain}</span><span>•</span><span>${it.time}</span></div><button class="${APP_ID}-kd" data-id="${it.id}">删除</button></div>`).join('')}
      ${items.length > 40 ? `<div style="text-align:center;font-size:11px;color:rgba(255,255,255,0.28);padding:8px">另有 ${items.length - 40} 条，请搜索筛选</div>` : ''}
    `;
  }
  function buildSettings() {
    const colorMap = [['yellow', '#fde047', '🟡 黄色'], ['blue', '#818cf8', '🟣 蓝紫'], ['green', '#4ade80', '🟢 绿色']];
    const kbs = KB.get();
    return `
      <div class="${APP_ID}-sec">🎨 高亮颜色</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        ${colorMap.map(([k, c, n]) => `<button style="flex:1;padding:8px 4px;border-radius:9px;border:2px solid ${hlColor === k ? c : 'rgba(255,255,255,0.1)'};background:${c}18;color:${c};font-size:11px;cursor:pointer;font-family:inherit;transition:all 0.2s" data-hlc="${k}">${n}</button>`).join('')}
      </div>
      <div class="${APP_ID}-sec">⌨️ 快捷键</div>
      ${[['Alt + R', '沉浸阅读模式'], ['Alt + K', '打开知识本'], ['Alt + S', '保存页面摘要'], ['Alt + E', '导出Markdown']].map(([k, v]) => `<div class="${APP_ID}-sc-row"><span class="${APP_ID}-sc-val">${v}</span><code class="${APP_ID}-sc-key">${k}</code></div>`).join('')}
      <div class="${APP_ID}-sec" style="margin-top:14px">📊 知识本数据</div>
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07);border-radius:11px;padding:13px;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.8">
        共保存 <b style="color:#a5b4fc">${kbs.length}</b> 条笔记，跨越 <b style="color:#7dd3fc">${[...new Set(kbs.map(i => i.domain))].length}</b> 个网站
        <br>本页标题：<span style="color:rgba(255,255,255,0.45)">${document.title.slice(0, 30)}${document.title.length > 30 ? '…' : ''}</span>
      </div>
    `;
  }

  // ===== 面板元素 =====
  const panel = document.createElement('div');
  panel.id = `${APP_ID}-panel`;
  document.body.appendChild(panel);

  function getKBCount() { return KB.get().length; }

  function render() {
    const contents = { summary: buildSummary(), kb: buildKB(), settings: buildSettings() };
    const cnt = getKBCount();
    panel.innerHTML = `
      <div class="${APP_ID}-hd">
        <div class="${APP_ID}-logo">🧠 SmartPage Pro <span class="${APP_ID}-ver">v2.0</span></div>
        <div style="display:flex;align-items:center;gap:7px">
          <span class="${APP_ID}-cnt-badge">${cnt ? cnt + ' 条笔记' : '知识本为空'}</span>
          <button class="${APP_ID}-x" id="${APP_ID}-x">✕</button>
        </div>
      </div>
      <div class="${APP_ID}-tabs">
        <button class="${APP_ID}-tab ${curTab === 'summary' ? 'on' : ''}" data-t="summary">📋 摘要</button>
        <button class="${APP_ID}-tab ${curTab === 'kb' ? 'on' : ''}" data-t="kb">📚 知识本</button>
        <button class="${APP_ID}-tab ${curTab === 'settings' ? 'on' : ''}" data-t="settings">⚙️ 设置</button>
      </div>
      <div class="${APP_ID}-body" id="${APP_ID}-bc">${contents[curTab]}</div>
      <div class="${APP_ID}-ft">
        <button class="${APP_ID}-btn ${APP_ID}-sec2" id="${APP_ID}-im">${immersive ? '☀️ 退出沉浸' : '🌙 沉浸阅读'}</button>
        <button class="${APP_ID}-btn ${APP_ID}-pri" id="${APP_ID}-ex">📥 导出笔记</button>
      </div>
    `;
    bindEvents();
  }

  function bindEvents() {
    document.getElementById(`${APP_ID}-x`)?.addEventListener('click', () => {
      panel.style.display = 'none'; panelVis = false;
    });
    panel.querySelectorAll(`.${APP_ID}-tab`).forEach(b => b.addEventListener('click', () => {
      curTab = b.dataset.t; render();
    }));
    document.getElementById(`${APP_ID}-qs`)?.addEventListener('input', e => {
      document.getElementById(`${APP_ID}-bc`).innerHTML = buildKB(e.target.value);
      bindKBDel();
    });
    document.getElementById(`${APP_ID}-im`)?.addEventListener('click', doImmersive);
    document.getElementById(`${APP_ID}-ex`)?.addEventListener('click', doExport);
    panel.querySelectorAll('[data-hlc]').forEach(b => b.addEventListener('click', () => {
      hlColor = b.dataset.hlc; render(); toast('🎨 高亮颜色已切换');
    }));
    bindKBDel();
  }

  function bindKBDel() {
    panel.querySelectorAll(`.${APP_ID}-kd`).forEach(b => b.addEventListener('click', e => {
      e.stopPropagation();
      KB.delete(parseInt(b.dataset.id));
      const q = document.getElementById(`${APP_ID}-qs`)?.value || '';
      document.getElementById(`${APP_ID}-bc`).innerHTML = buildKB(q);
      bindKBDel();
      toast('🗑️ 已删除笔记');
    }));
  }

  render();

  // ===== FAB =====
  let panelVis = true;
  const fab = document.createElement('button');
  fab.id = `${APP_ID}-fab`; fab.title = 'SmartPage Pro · 智慧网页助手'; fab.innerHTML = '🧠';
  document.body.appendChild(fab);
  fab.addEventListener('click', () => {
    panelVis = !panelVis;
    panel.style.display = panelVis ? 'flex' : 'none';
    if (panelVis) render();
  });

  // ===== 沉浸模式 =====
  function doImmersive() {
    immersive = !immersive;
    if (immersive) {
      document.documentElement.style.setProperty('--spp-bg', 'none');
      const s = document.createElement('style');
      s.id = `${APP_ID}-imm`;
      s.textContent = `html{filter:none!important}body{background:#0d0f1a!important}body *:not([id^="${APP_ID}"]){color:#dde1ef!important;background:transparent!important}p,li,td{font-size:16.5px!important;line-height:1.9!important}`;
      document.head.appendChild(s);
    } else {
      document.getElementById(`${APP_ID}-imm`)?.remove();
    }
    render();
    toast(immersive ? '🌙 已进入沉浸阅读模式' : '☀️ 已退出沉浸阅读模式');
  }

  // ===== 导出 =====
  function doExport() {
    const md = KB.exportMD();
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `smartpage-kb-${Date.now()}.md`; a.click();
    URL.revokeObjectURL(url);
    toast('📥 知识本已导出为 Markdown');
  }

  // ===== 文字选择工具栏 =====
  const selEl = document.createElement('div');
  selEl.id = `${APP_ID}-sel`; selEl.style.display = 'none';
  document.body.appendChild(selEl);
  let selText = '';

  document.addEventListener('mouseup', e => {
    if (e.target.closest(`#${APP_ID}-sel`) || e.target.closest(`#${APP_ID}-panel`) || e.target.closest(`#${APP_ID}-fab`)) return;
    setTimeout(() => {
      const sel = window.getSelection();
      const txt = sel?.toString().trim();
      if (txt && txt.length > 4) {
        selText = txt;
        const rect = sel.getRangeAt(0).getBoundingClientRect();
        const colorHex = { yellow: '#fde047', blue: '#818cf8', green: '#4ade80' }[hlColor];
        selEl.innerHTML = `
          <button class="${APP_ID}-sb ${APP_ID}-sv">💾 保存</button>
          <div class="${APP_ID}-div"></div>
          <button class="${APP_ID}-sb ${APP_ID}-hl" style="color:${colorHex};border-color:${colorHex}33">🖍 高亮</button>
          <button class="${APP_ID}-sb ${APP_ID}-sr">🔍 搜索</button>
          <button class="${APP_ID}-sb ${APP_ID}-cp">📋 引用</button>
          <div class="${APP_ID}-div"></div>
          <span class="${APP_ID}-nc">${txt.length}字</span>
        `;
        selEl.style.display = 'flex';
        const top = rect.top + window.scrollY - 50;
        const left = Math.max(8, Math.min(window.innerWidth - 360, rect.left + window.scrollX + rect.width / 2 - 175));
        selEl.style.top = top + 'px'; selEl.style.left = left + 'px';
        selEl.querySelector(`.${APP_ID}-sv`).onclick = () => {
          KB.save({ text: selText, color: colorHex }); selEl.style.display = 'none';
          toast('💾 已保存到知识本！');
          if (curTab === 'kb' && panelVis) { document.getElementById(`${APP_ID}-bc`).innerHTML = buildKB(); bindKBDel(); }
          render();
        };
        selEl.querySelector(`.${APP_ID}-hl`).onclick = () => {
          try {
            const range = sel.getRangeAt(0);
            const sp = document.createElement('span');
            sp.className = `${APP_ID}-hl-${hlColor[0]}`;
            range.surroundContents(sp);
            sel.removeAllRanges();
          } catch { toast('⚠️ 无法高亮跨元素文本'); }
          selEl.style.display = 'none'; toast('🖍 高亮已添加');
        };
        selEl.querySelector(`.${APP_ID}-sr`).onclick = () => {
          window.open(`https://www.google.com/search?q=${encodeURIComponent(selText)}`, '_blank');
          selEl.style.display = 'none';
        };
        selEl.querySelector(`.${APP_ID}-cp`).onclick = () => {
          const q = `"${selText}"\n—— 来源：${document.title}\n🔗 ${location.href}`;
          navigator.clipboard?.writeText(q).then(() => toast('📋 引用格式已复制'));
          selEl.style.display = 'none';
        };
      } else if (!e.target.closest(`#${APP_ID}-sel`)) {
        selEl.style.display = 'none';
      }
    }, 60);
  });
  document.addEventListener('mousedown', e => { if (!e.target.closest(`#${APP_ID}-sel`)) selEl.style.display = 'none'; });

  // ===== 快捷键 =====
  document.addEventListener('keydown', e => {
    if (!e.altKey) return;
    switch (e.key.toLowerCase()) {
      case 'r': e.preventDefault(); doImmersive(); break;
      case 'k':
        e.preventDefault(); curTab = 'kb'; panelVis = true;
        panel.style.display = 'flex'; render(); toast('📚 知识本已打开');
        break;
      case 's':
        e.preventDefault();
        KB.save({ text: `【摘要】${document.title}\n${sumData.sentences.slice(0, 2).join(' | ')}`, color: '#06b6d4' });
        toast('📋 页面摘要已保存到知识本！'); render();
        break;
      case 'e': e.preventDefault(); doExport(); break;
    }
  });

  // ===== 启动提示 =====
  setTimeout(() => toast('🧠 SmartPage Pro 已启动！选中文字即可保存笔记'), 400);

  return {
    ok: true,
    summary: '🧠 SmartPage Pro · 智慧网页助手启动成功',
    page: document.title,
    wordCount: sumData.wordCount,
    readTime: sumData.readTime,
    keywords: sumData.keywords,
    features: [
      '✅ 顶部渐变阅读进度条',
      '✅ 智能摘要（TextRank）',
      '✅ 文字选择工具栏（保存/高亮/搜索/引用）',
      '✅ 知识本（localStorage 永久存储 + 搜索）',
      '✅ Markdown一键导出',
      '✅ 沉浸阅读模式',
      '✅ 快捷键系统 Alt+R/K/S/E'
    ]
  };
}