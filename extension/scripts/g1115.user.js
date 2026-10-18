(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = {};
  const __tabOriginalFunction = (
    /**
     * 名称：Yuze 隐藏技能
     * 描述：弹出可移动/可缩放精致弹窗，展示 Yuze 神技能。纯 SVG 图标、CSS 动画演示、字号可调
     * 类型：脚本  生效网页：*  自动运行：false
     */
    async function run(args) {
    
      /* ══════════════════════════════════════════════
         § 内联 SVG 图标集 — 全部来自 Lucide 开源图标库
         ══════════════════════════════════════════════ */
      const I = {
        bulb:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="21" x2="15" y2="21"/><path d="M12 2a7 7 0 0 1 4 12.9V17H8v-2.1A7 7 0 0 1 12 2z"/></svg>`,
        x:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
        refresh:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>`,
        tag:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
        grip:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor"><circle cx="5" cy="5" r="1.3"/><circle cx="11" cy="5" r="1.3"/><circle cx="5" cy="11" r="1.3"/><circle cx="11" cy="11" r="1.3"/></svg>`,
        play:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
        star:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        check:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        zap:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
        layers:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
        loader:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>`,
      };
    
      /* ══════════════════════════════════════════════
         § 技能库（内置底包，含最新宠物玩法）
         每条 demo 为纯 CSS/SVG 动画，不依赖外链
         ══════════════════════════════════════════════ */
      const DEFAULT = [
    
        /* ── 1. Codex 桌面宠物 ── */
        {
          title:"Codex 桌面宠物",
          content:"Yuze 近期整理了 Codex 桌面宠物的完整玩法教程，并制作了一只可直接安装的 GG Bond 小猪宠物包。宠物会根据运行、等待、审阅、失败等状态自动切换动画，让工作台更有陪伴感。",
          source:"官方最新动态",
          demo:`
            <style>
              @keyframes petRun{0%,100%{transform:translateX(0)}25%{transform:translateX(6px) scaleX(1.05)}75%{transform:translateX(-6px) scaleX(.95)}}
              @keyframes petIdle{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
              @keyframes petWave{0%,100%{transform:rotate(-10deg)}50%{transform:rotate(10deg)}}
              .pet-wrap{display:flex;justify-content:center;gap:18px;padding:4px 0;}
              .pet-unit{text-align:center;}
              .pet-avatar{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
              .pet-running{background:linear-gradient(135deg,#fef9c3,#fde047);box-shadow:0 3px 10px rgba(253,224,71,.5);animation:petRun 1s ease-in-out infinite;}
              .pet-idle{background:linear-gradient(135deg,#dbeafe,#93c5fd);box-shadow:0 3px 10px rgba(147,197,253,.4);animation:petIdle 2s ease-in-out infinite;}
              .pet-wave{background:linear-gradient(135deg,#dcfce7,#6ee7b7);box-shadow:0 3px 10px rgba(110,231,183,.4);animation:petWave 1s ease-in-out infinite;}
              .pet-lbl{font-size:9.5px;color:#888;margin-top:4px;letter-spacing:.3px;}
              .pet-icon{width:24px;height:24px;color:#555;}
            </style>
            <div class="pet-wrap">
              <div class="pet-unit"><div class="pet-avatar pet-running"><svg class="pet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="11" rx="5" ry="6"/><path d="M8 6s-2-3-3-2 0 4 2 4M16 6s2-3 3-2 0 4-2 4"/><circle cx="10.5" cy="10" r=".8" fill="currentColor"/><circle cx="13.5" cy="10" r=".8" fill="currentColor"/><path d="M10 14s.8 1 2 1 2-1 2-1"/></svg></div><div class="pet-lbl">running</div></div>
              <div class="pet-unit"><div class="pet-avatar pet-idle"><svg class="pet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="11" rx="5" ry="6"/><path d="M8 6s-2-3-3-2 0 4 2 4M16 6s2-3 3-2 0 4-2 4"/><circle cx="10.5" cy="10" r=".8" fill="currentColor"/><circle cx="13.5" cy="10" r=".8" fill="currentColor"/><path d="M10 14s.8 1 2 1 2-1 2-1"/></svg></div><div class="pet-lbl">waiting</div></div>
              <div class="pet-unit"><div class="pet-avatar pet-wave"><svg class="pet-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><ellipse cx="12" cy="11" rx="5" ry="6"/><path d="M8 6s-2-3-3-2 0 4 2 4M16 6s2-3 3-2 0 4-2 4"/><circle cx="10.5" cy="10" r=".8" fill="currentColor"/><circle cx="13.5" cy="10" r=".8" fill="currentColor"/><path d="M10 14s.8 1 2 1 2-1 2-1"/></svg></div><div class="pet-lbl">review</div></div>
            </div>`
        },
    
        /* ── 2. 智能截图吸附 ── */
        {
          title:"智能截图吸附",
          content:"截图时 Yuze 会自动识别页面 HTML 结构中的代码块、卡片、表格等元素，像素级吸附高亮，直接点选即可精准截取，无需手动拖框。",
          source:"产品介绍",
          demo:`
            <style>
              @keyframes snapBorder{0%,100%{opacity:0;box-shadow:0 0 0 0 rgba(255,222,0,0)}50%{opacity:1;box-shadow:0 0 0 4px rgba(255,222,0,.2)}}
              .snap-wrap{position:relative;background:#1e1e2e;border-radius:8px;padding:10px 12px;font-family:monospace;font-size:11px;line-height:1.6;}
              .snap-border{position:absolute;inset:0;border:2px solid #ffde00;border-radius:8px;pointer-events:none;animation:snapBorder 2s ease-in-out infinite;}
              .kw{color:#cba6f7;}.fn{color:#89b4fa;}.str{color:#a6e3a1;}.op{color:#89dceb;}.cm{color:#6c7086;}
              .snap-tip{margin-top:6px;font-size:10px;color:#8e8e93;display:flex;align-items:center;gap:4px;}
              .snap-tip svg{width:10px;height:10px;flex-shrink:0;}
            </style>
            <div class="snap-wrap">
              <div><span class="kw">const</span> <span class="op">result</span> = <span class="kw">await</span> <span class="fn">Yuze</span>.<span class="fn">agent</span>(</div>
              <div style="padding-left:12px;"><span class="str">"帮我整理收藏夹"</span></div>
              <div>)</div>
              <div class="snap-border"></div>
            </div>
            <div class="snap-tip">${I.zap}<span>AI 自动识别代码块边界，一点即截</span></div>`
        },
    
        /* ── 3. 一键 @ 批量引用 ── */
        {
          title:"一键 @ 批量引用",
          content:"在输入框输入 @ 即可引用当前打开的多个标签页、标签组或本地文件作为上下文，让 AI 跨文档深度分析，告别来回复制粘贴。",
          source:"使用指南",
          demo:`
            <style>
              @keyframes tagIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}
              @keyframes curBlink{0%,100%{opacity:1}50%{opacity:0}}
              .at-box{background:#fff;border:1.5px solid #d0d0e0;border-radius:8px;padding:8px 10px;font-size:11px;}
              .at-tag{display:inline-flex;align-items:center;gap:3px;background:#eef2ff;color:#4338ca;border-radius:4px;padding:2px 6px;font-size:10px;font-weight:600;margin:2px;animation:tagIn .3s ease both;}
              .at-tag svg{width:9px;height:9px;}
              .at-cursor{display:inline-block;width:1.5px;height:11px;background:#555;margin-left:1px;animation:curBlink 1s step-end infinite;vertical-align:middle;}
              .at-hint{margin-top:6px;font-size:10px;color:#6366f1;background:#eef2ff;border-radius:5px;padding:3px 8px;display:inline-block;}
            </style>
            <div class="at-box">
              <span class="at-tag">${I.tag} 产品文档.pdf</span>
              <span class="at-tag">${I.tag} 竞品分析页</span>
              <span class="at-tag">${I.tag} 用户反馈</span>
              <span class="at-cursor"></span>
            </div>
            <div class="at-hint">AI 已读取 3 个上下文，综合分析中...</div>`
        },
    
        /* ── 4. 技炉唤起 ── */
        {
          title:"技炉 / 快捷唤起",
          content:"对话框输入 '/' 即可调出技炉菜单，选择已保存的 Prompt 指令，将润色、总结、翻译等高频工作流变成一键操作。",
          source:"产品介绍",
          demo:`
            <style>
              .mz-input{background:#fff;border:1.5px solid #e0e0e8;border-radius:7px;padding:6px 10px;font-size:11px;color:#555;margin-bottom:7px;}
              .mz-menu{background:#fff;border:1.5px solid #e0e0e8;border-radius:9px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.09);}
              .mz-item{display:flex;align-items:center;gap:7px;padding:6px 10px;font-size:10.5px;color:#333;border-bottom:1px solid #f3f3f6;cursor:pointer;}
              .mz-item:last-child{border-bottom:none;}
              .mz-item:first-child{background:#fefce8;}
              .mz-badge{background:#ffde00;border-radius:3px;padding:1px 5px;font-size:9.5px;font-weight:700;color:#333;flex-shrink:0;}
              .mz-item svg{width:12px;height:12px;color:#888;flex-shrink:0;}
            </style>
            <div class="mz-input">/</div>
            <div class="mz-menu">
              <div class="mz-item"><span class="mz-badge">技炉</span>${I.star} 润色文案</div>
              <div class="mz-item"><span class="mz-badge">技炉</span>${I.layers} 总结全文</div>
              <div class="mz-item"><span class="mz-badge">技炉</span>${I.zap} 翻译英文</div>
            </div>`
        },
    
        /* ── 5. 网页转 Excel ── */
        {
          title:"自然语言 → Excel",
          content:"对 Yuze 说「批量提取当前页面所有商品名称和价格，导出为 Excel」，AI 自动生成并执行脚本，数据表格一键下载，无需手写代码。",
          source:"智能代理",
          demo:`
            <style>
              @keyframes rowFade{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:none}}
              .xl-wrap{border-radius:7px;overflow:hidden;border:1px solid #c8d8c8;font-size:10.5px;}
              .xl-head{background:#1a7231;color:#fff;padding:4px 10px;font-size:10px;font-weight:700;display:flex;align-items:center;gap:5px;}
              .xl-head svg{width:12px;height:12px;}
              .xl-tr{display:grid;grid-template-columns:1fr .6fr;border-bottom:1px solid #e0e8e0;}
              .xl-tr:last-child{border-bottom:none;}
              .xl-th{background:#e8f5e9;font-weight:700;padding:4px 8px;border-right:1px solid #e0e8e0;}
              .xl-td{padding:4px 8px;border-right:1px solid #e0e8e0;}
              .xl-r1{animation:rowFade .4s .1s both;}
              .xl-r2{animation:rowFade .4s .3s both;background:#fafcfa;}
              .xl-r3{animation:rowFade .4s .5s both;}
            </style>
            <div class="xl-wrap">
              <div class="xl-head">${I.layers} 导出结果 · 3 条数据</div>
              <div class="xl-tr"><div class="xl-th">商品名称</div><div class="xl-th">价格</div></div>
              <div class="xl-tr xl-r1"><div class="xl-td">AirPods Pro 2</div><div class="xl-td">¥1,799</div></div>
              <div class="xl-tr xl-r2"><div class="xl-td">Apple Watch S9</div><div class="xl-td">¥2,999</div></div>
              <div class="xl-tr xl-r3"><div class="xl-td">iPad mini 7</div><div class="xl-td">¥3,999</div></div>
            </div>`
        },
    
        /* ── 6. 智能标签整理 ── */
        {
          title:"智能标签页整理",
          content:"点击标签页管理中的「智能标签整理」，AI 自动分析标签页内容，按任务语义一键归类分组，彻底告别混乱的标签栏。",
          source:"使用指南",
          demo:`
            <style>
              @keyframes spin{to{transform:rotate(360deg)}}
              @keyframes groupIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
              .tg-before{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px;}
              .tg-tab{padding:2px 8px;border-radius:4px;font-size:10px;border:1px solid #e0e0e8;color:#555;}
              .tg-arrow{display:flex;align-items:center;gap:6px;color:#6366f1;font-size:10px;margin-bottom:8px;}
              .tg-arrow svg{width:13px;height:13px;animation:spin 1.2s linear infinite;}
              .tg-after{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
              .tg-group{background:#fff;border:1px solid #e0e0e8;border-radius:7px;padding:6px 8px;animation:groupIn .5s ease both;}
              .tg-group-name{font-weight:700;font-size:10px;margin-bottom:3px;}
              .tg-group-tabs{font-size:9.5px;color:#8e8e93;}
              .g1{border-top:2.5px solid #6366f1;animation-delay:.1s}
              .g2{border-top:2.5px solid #10b981;animation-delay:.25s}
              .g3{border-top:2.5px solid #f59e0b;animation-delay:.4s}
              .g4{border-top:2.5px solid #ec4899;animation-delay:.55s}
            </style>
            <div class="tg-before">
              <div class="tg-tab">标签1</div><div class="tg-tab">标签2</div><div class="tg-tab">标签3</div>
              <div class="tg-tab">标签4</div><div class="tg-tab">标签5</div><div class="tg-tab">标签6</div>
            </div>
            <div class="tg-arrow">${I.loader} AI 智能分组中...</div>
            <div class="tg-after">
              <div class="tg-group g1"><div class="tg-group-name" style="color:#6366f1">工作</div><div class="tg-group-tabs">标签1 · 标签3</div></div>
              <div class="tg-group g2"><div class="tg-group-name" style="color:#10b981">学习</div><div class="tg-group-tabs">标签2 · 标签5</div></div>
              <div class="tg-group g3"><div class="tg-group-name" style="color:#f59e0b">参考</div><div class="tg-group-tabs">标签4</div></div>
              <div class="tg-group g4"><div class="tg-group-name" style="color:#ec4899">娱乐</div><div class="tg-group-tabs">标签6</div></div>
            </div>`
        },
    
        /* ── 7. Agent 模式 ── */
        {
          title:"全自动 Agent 模式",
          content:"开启智能代理，用自然语言描述复杂需求，Yuze 自主规划策略、打开多个标签页搜索、提取关键信息，最终生成深度调研报告。",
          source:"产品介绍",
          demo:`
            <style>
              @keyframes stepIn{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
              .ag-step{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
              .ag-dot{width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0;}
              .ag-dot svg{width:10px;height:10px;}
              .ag-label{font-size:10.5px;border-radius:6px;padding:4px 9px;flex:1;}
              .s1{animation:stepIn .4s .0s both;} .ag-dot.s1{background:#6366f1;color:#fff;} .ag-label.s1{background:#eef2ff;color:#3730a3;}
              .s2{animation:stepIn .4s .2s both;} .ag-dot.s2{background:#6366f1;color:#fff;} .ag-label.s2{background:#eef2ff;color:#3730a3;}
              .s3{animation:stepIn .4s .4s both;} .ag-dot.s3{background:#6366f1;color:#fff;} .ag-label.s3{background:#eef2ff;color:#3730a3;}
              .s4{animation:stepIn .4s .6s both;} .ag-dot.s4{background:#10b981;color:#fff;} .ag-label.s4{background:#d1fae5;color:#065f46;font-weight:700;}
            </style>
            <div class="ag-step s1"><div class="ag-dot s1">1</div><div class="ag-label s1">规划搜索策略</div></div>
            <div class="ag-step s2"><div class="ag-dot s2">2</div><div class="ag-label s2">打开 12 个相关页面</div></div>
            <div class="ag-step s3"><div class="ag-dot s3">3</div><div class="ag-label s3">逐页提取关键信息</div></div>
            <div class="ag-step s4"><div class="ag-dot s4">${I.check}</div><div class="ag-label s4">深度调研报告已生成</div></div>`
        },
    
        /* ── 8. 网页风格改造 ── */
        {
          title:"网页风格一键改造",
          content:"输入 '/' 选择「使用脚本」，用自然语言描述风格，例如「把这个页面改成极简深色模式」，Yuze 生成脚本一键执行，刷新页面可还原。",
          source:"脚本功能",
          demo:`
            <style>
              @keyframes arrow{0%,100%{transform:translateX(0)}50%{transform:translateX(3px)}}
              .wf-wrap{display:flex;gap:8px;align-items:stretch;}
              .wf-card{flex:1;border-radius:8px;overflow:hidden;border:1px solid #e0e0e8;}
              .wf-bar{padding:3px 8px;font-size:9.5px;font-weight:700;}
              .wf-body{padding:8px;}
              .wf-line{height:7px;border-radius:2px;margin-bottom:4px;}
              .wf-arrow{display:flex;align-items:center;color:#6366f1;animation:arrow 1.2s ease-in-out infinite;}
              .wf-arrow svg{width:18px;height:18px;}
            </style>
            <div class="wf-wrap">
              <div class="wf-card">
                <div class="wf-bar" style="background:#f5f5f7;color:#888;">改造前</div>
                <div class="wf-body" style="background:#fff;">
                  <div class="wf-line" style="background:#e0e0e8;width:100%"></div>
                  <div class="wf-line" style="background:#e0e0e8;width:75%"></div>
                  <div class="wf-line" style="background:#e0e0e8;width:88%"></div>
                </div>
              </div>
              <div class="wf-arrow">${I.refresh}</div>
              <div class="wf-card" style="border-color:#6366f1;">
                <div class="wf-bar" style="background:linear-gradient(90deg,#6366f1,#8b5cf6);color:#fff;">深色极简</div>
                <div class="wf-body" style="background:#1e1b4b;">
                  <div class="wf-line" style="background:#6366f1;width:100%"></div>
                  <div class="wf-line" style="background:#4f46e5;width:75%"></div>
                  <div class="wf-line" style="background:#6366f1;width:88%"></div>
                </div>
              </div>
            </div>`
        },
    
        /* ── 9. 保存 Agent 为技炉 ── */
        {
          title:"Agent 任务保存为技炉",
          content:"智能代理任务执行完成后，点击对话底部「保存为技炉」，将复杂执行流程固化为可复用指令，下次直接一键调用，无需重新描述。",
          source:"使用指南",
          demo:`
            <style>
              @keyframes savedPulse{0%,100%{box-shadow:none}50%{box-shadow:0 0 0 4px rgba(255,222,0,.35)}}
              .sv-card{background:#fff;border:1.5px solid #e0e0e8;border-radius:9px;padding:10px 12px;}
              .sv-head{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
              .sv-icon{width:30px;height:30px;border-radius:7px;background:#6366f1;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
              .sv-icon svg{width:15px;height:15px;color:#fff;}
              .sv-name{font-weight:700;color:#1c1c1e;font-size:11px;}
              .sv-meta{color:#8e8e93;font-size:9.5px;}
              .sv-btns{display:flex;gap:6px;}
              .sv-run{flex:1;background:#f4f4f8;border-radius:6px;padding:5px;font-size:10px;text-align:center;color:#555;}
              .sv-saved{flex:1;background:#ffde00;border-radius:6px;padding:5px;font-size:10px;font-weight:700;text-align:center;color:#333;animation:savedPulse 2s ease-in-out infinite;}
            </style>
            <div class="sv-card">
              <div class="sv-head">
                <div class="sv-icon">${I.star}</div>
                <div><div class="sv-name">小红书运营助手</div><div class="sv-meta">已执行 23 次 · 上次 2 分钟前</div></div>
              </div>
              <div class="sv-btns">
                <div class="sv-run">一键运行</div>
                <div class="sv-saved">已保存为技炉</div>
              </div>
            </div>`
        }
      ];
    
      /* ══════════════════════════════════════════════
         § 从 localStorage 合并动态缓存技能
         ══════════════════════════════════════════════ */
      let cached = [];
      try { cached = JSON.parse(localStorage.getItem('Yuze_skill_cache') || '[]'); } catch (_) {}
      const pool = Object.fromEntries(DEFAULT.map(s => [s.title, s]));
      cached.forEach(s => { if (!pool[s.title]) pool[s.title] = s; });
      const skills = Object.values(pool);
    
      /* ══════════════════════════════════════════════
         § 后台静默抓取官网最新技能
         ══════════════════════════════════════════════ */
      const isOfficial = /Yuze\.com|Yuze-ai\.com|go\.Yuze/.test(location.href);
      function extractFromDoc(doc, label) {
        const items = [];
        doc.querySelectorAll('h2,h3').forEach(h => {
          const t = h.innerText.trim();
          if (t.length < 3 || t.length > 26) return;
          let el = h.nextElementSibling, body = '';
          while (el && !['H2','H3'].includes(el.tagName) && body.length < 180) {
            body += ' ' + (el.innerText || '').trim(); el = el.nextElementSibling;
          }
          body = body.trim();
          if (body.length > 15) items.push({ title:t, content:body.slice(0,180), source:label, demo:null });
        });
        return items;
      }
      function saveCache(items) {
        try {
          const c = JSON.parse(localStorage.getItem('Yuze_skill_cache') || '[]');
          items.forEach(x => { if (!c.some(y => y.title === x.title)) c.push(x); });
          localStorage.setItem('Yuze_skill_cache', JSON.stringify(c.slice(-30)));
        } catch (_) {}
      }
      if (isOfficial) {
        saveCache(extractFromDoc(document, '实时官网：' + document.title.slice(0,12)));
      } else {
        ['https://www.Yuze.com/guide/usage', 'https://go.Yuze-ai.com/topics/desktop-pet-for-codex/ggbond'].forEach(url => {
          const ac = new AbortController(); setTimeout(() => ac.abort(), 2800);
          fetch(url, { signal:ac.signal, credentials:'omit' })
            .then(r => r.text())
            .then(html => saveCache(extractFromDoc(new DOMParser().parseFromString(html,'text/html'), '官网动态同步')))
            .catch(() => {});
        });
      }
    
      /* ══════════════════════════════════════════════
         § 随机抽取
         ══════════════════════════════════════════════ */
      const skill = skills[Math.floor(Math.random() * skills.length)];
    
      /* ══════════════════════════════════════════════
         § Shadow DOM 弹窗（完全隔离宿主 CSS）
         ══════════════════════════════════════════════ */
      const HOST_ID = 'tbsk-v5';
      document.getElementById(HOST_ID)?.remove();
      const host = document.createElement('div');
      host.id = HOST_ID;
      /* 关键：host 本身 all:initial + pointer-events:none，让 shadow 内容承接事件 */
      host.style.cssText = 'all:initial;position:fixed;inset:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode:'open' });
    
      shadow.innerHTML = `
    <style>
    :host { all:initial; }
    *,::before,::after { box-sizing:border-box; margin:0; padding:0; }
    
    /* ── CSS 变量 —— 字号缩放的核心 ── */
    #win {
      --fs: 13px;          /* 基准字号，A+/A- 修改这一个变量 */
      font-size: var(--fs);
      /* 以下所有字号全部用 em，跟随 --fs 一起缩放 */
    }
    
    /* ── 弹窗容器 ── */
    #win {
      pointer-events: all;
      position: fixed;
      top: 12vh;
      right: 36px;
      width: 360px;
      min-width: 280px;
      min-height: 240px;
      max-height: 80vh;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,.15), 0 4px 12px rgba(0,0,0,.06);
      border: 1.5px solid #e8e8ed;
      display: flex;
      flex-direction: column;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Segoe UI", Roboto, sans-serif;
      color: #2c2c2e;
      overflow: hidden;
      animation: winIn .4s cubic-bezier(.16,1,.3,1);
    }
    @keyframes winIn {
      from { opacity:0; transform:scale(.92) translateY(22px); }
      to   { opacity:1; transform:none; }
    }
    
    /* ── 标题栏 ── */
    #bar {
      display: flex;
      align-items: center;
      gap: .6em;
      background: #f5f5f7;
      border-bottom: 1.5px solid #e8e8ed;
      padding: .75em 1em;
      cursor: move;
      user-select: none;
      flex-shrink: 0;
    }
    #bar-logo {
      width: 2em;
      height: 2em;
      background: #ffde00;
      border-radius: .6em;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    #bar-logo svg { width: 1.15em; height: 1.15em; color: #444; }
    #bar-title {
      flex: 1;
      font-weight: 700;
      font-size: 1em;
      color: #1c1c1e;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    #bar-btns { display:flex; align-items:center; gap:.2em; flex-shrink:0; }
    .ctrl {
      width: 2.1em; height: 2.1em;
      background: none; border: none; cursor: pointer;
      border-radius: .55em;
      display: flex; align-items: center; justify-content: center;
      color: #636366;
      transition: background .14s, color .14s;
      flex-shrink: 0;
    }
    .ctrl svg { width: 1.05em; height: 1.05em; pointer-events: none; }
    .ctrl-lbl { font-size: .85em; font-weight: 700; line-height:1; pointer-events: none; }
    .ctrl:hover { background: #e5e5ea; color: #1c1c1e; }
    #btn-close:hover { background: #ffd5d5; color: #c00; }
    
    /* ── 滚动内容区 ── */
    #body {
      flex: 1;
      overflow-y: auto;
      padding: 1.05em 1.1em;
      display: flex;
      flex-direction: column;
      gap: .8em;
      min-height: 0;
    }
    #body::-webkit-scrollbar { width: 3px; }
    #body::-webkit-scrollbar-thumb { background: #d1d1d6; border-radius: 2px; }
    
    /* ── 技能标题 ── */
    #skill-title {
      font-weight: 700;
      font-size: 1.07em;
      color: #1c1c1e;
      line-height: 1.4;
      padding-left: .7em;
      border-left: 3px solid #ffde00;
    }
    /* ── 技能描述 ── */
    #skill-desc {
      font-size: .91em;
      color: #48484a;
      line-height: 1.72;
    }
    /* ── 演示区 ── */
    #demo-box {
      background: #f9f9fb;
      border: 1px solid #ebebf0;
      border-radius: .8em;
      padding: .8em .85em;
      font-size: .88em;
    }
    .demo-label {
      font-size: .75em;
      font-weight: 700;
      color: #8e8e93;
      letter-spacing: .5px;
      text-transform: uppercase;
      margin-bottom: .5em;
      display: flex;
      align-items: center;
      gap: .4em;
    }
    .demo-label svg { width: .9em; height: .9em; }
    
    /* ── 底栏 ── */
    #foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-shrink: 0;
    }
    #src-badge {
      display: flex;
      align-items: center;
      gap: .4em;
      font-size: .79em;
      color: #8e8e93;
      background: #f2f2f7;
      padding: .28em .65em;
      border-radius: .4em;
      max-width: 55%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    #src-badge svg { width: .9em; height: .9em; flex-shrink:0; }
    #btn-next {
      display: flex;
      align-items: center;
      gap: .4em;
      font-size: .85em;
      font-weight: 700;
      color: #b07a00;
      cursor: pointer;
      background: none;
      border: none;
      padding: .3em .65em;
      border-radius: .5em;
      transition: background .14s;
      white-space: nowrap;
    }
    #btn-next:hover { background: #fff8e0; }
    #btn-next svg { width: 1em; height: 1em; }
    
    /* ── 右下角调整大小角标 ── */
    #grip {
      position: absolute;
      bottom: 5px; right: 5px;
      width: 14px; height: 14px;
      cursor: nwse-resize;
      color: #c7c7cc;
      opacity: .65;
      transition: opacity .15s;
      pointer-events: all;
    }
    #grip:hover { opacity: 1; color: #8e8e93; }
    #grip svg { width: 14px; height: 14px; }
    </style>
    
    <div id="win">
    
      <!-- 标题栏（可拖拽） -->
      <div id="bar">
        <div id="bar-logo">${I.bulb}</div>
        <div id="bar-title">Yuze 隐藏技能</div>
        <div id="bar-btns">
          <button class="ctrl" id="btn-zo" title="缩小字号"><span class="ctrl-lbl">A−</span></button>
          <button class="ctrl" id="btn-zi" title="放大字号"><span class="ctrl-lbl">A＋</span></button>
          <button class="ctrl" id="btn-close" title="关闭">${I.x}</button>
        </div>
      </div>
    
      <!-- 内容区 -->
      <div id="body">
        <div id="skill-title">${skill.title}</div>
        <div id="skill-desc">${skill.content}</div>
        ${skill.demo ? `
        <div id="demo-box">
          <div class="demo-label">${I.play} 效果演示</div>
          ${skill.demo}
        </div>` : ''}
        <div id="foot">
          <div id="src-badge">${I.tag}<span>${skill.source}</span></div>
          <button id="btn-next">${I.refresh}<span>换一个</span></button>
        </div>
      </div>
    
      <!-- 右下角拉伸角标 -->
      <div id="grip">${I.grip}</div>
    </div>`;
    
      const win  = shadow.getElementById('win');
      const bar  = shadow.getElementById('bar');
      const grip = shadow.getElementById('grip');
    
      /* ── 字号缩放（修复版：直接操作 CSS 变量 --fs，所有 em 单位自动跟随） */
      let fsVal = 13; // 单位 px
      shadow.getElementById('btn-zi').addEventListener('click', e => {
        e.stopPropagation();
        if (fsVal < 20) { fsVal = Math.min(20, fsVal + 1); win.style.setProperty('--fs', fsVal + 'px'); }
      });
      shadow.getElementById('btn-zo').addEventListener('click', e => {
        e.stopPropagation();
        if (fsVal > 10) { fsVal = Math.max(10, fsVal - 1); win.style.setProperty('--fs', fsVal + 'px'); }
      });
    
      /* ── 拖拽 ── */
      let drag=false, rx=0, ry=0;
      const onDrag = e => {
        if (!drag) return;
        let l = e.clientX - rx, t = e.clientY - ry;
        l = Math.max(0, Math.min(l, innerWidth  - win.offsetWidth));
        t = Math.max(0, Math.min(t, innerHeight - win.offsetHeight));
        win.style.left = l + 'px'; win.style.top = t + 'px';
      };
      bar.addEventListener('mousedown', e => {
        if (e.target.closest('.ctrl')) return;
        drag = true;
        const r = win.getBoundingClientRect();
        rx = e.clientX - r.left; ry = e.clientY - r.top;
        win.style.right = 'auto'; win.style.left = r.left+'px'; win.style.top = r.top+'px';
        e.preventDefault();
      });
      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', () => { drag = false; });
    
      /* ── 右下角拉伸 ── */
      let rzOn=false, rzW, rzH, rzX, rzY;
      const onRz = e => {
        if (!rzOn) return;
        win.style.width  = Math.max(280, rzW + (e.clientX - rzX)) + 'px';
        win.style.height = Math.max(240, rzH + (e.clientY - rzY)) + 'px';
      };
      grip.addEventListener('mousedown', e => {
        e.preventDefault(); rzOn = true;
        rzX = e.clientX; rzY = e.clientY;
        rzW = win.offsetWidth; rzH = win.offsetHeight;
        const r = win.getBoundingClientRect();
        win.style.right = 'auto'; win.style.left = r.left+'px'; win.style.top = r.top+'px';
      });
      document.addEventListener('mousemove', onRz);
      document.addEventListener('mouseup', () => { rzOn = false; });
    
      /* ── 关闭 ── */
      function closeWin() {
        win.style.transition = 'opacity .2s, transform .2s';
        win.style.opacity = '0'; win.style.transform = 'scale(.94) translateY(10px)';
        setTimeout(() => {
          host.remove();
          document.removeEventListener('mousemove', onDrag);
          document.removeEventListener('mousemove', onRz);
        }, 220);
      }
      shadow.getElementById('btn-close').addEventListener('click', closeWin);
    
      /* ── 换一个 ── */
      shadow.getElementById('btn-next').addEventListener('click', () => {
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mousemove', onRz);
        host.remove(); run(args);
      });
    
      return { ok:true, summary:'v5 弹窗已显示：' + skill.title, skill };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction(__tabScriptArgs);
})();