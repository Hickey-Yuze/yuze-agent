(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 🧠 焦虑指数大测试 - 增强版（含彩蛋+全正反馈）
     * 仅供娱乐 · 请勿当真 · 放松就好 😌
     * 
     * 使用方式：在任意网页上运行此脚本，即可在页面中嵌入完整的焦虑测试小游戏
     * 保存为妙招后，一键即可在任何页面启动测试！
     */
    async function run(args) {
      // ========== 注入完整样式 ==========
      const styleId = 'anxiety-test-game-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          /* ===== 基础样式 ===== */
          #atg-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.6); z-index: 99998;
            display: flex; justify-content: center; align-items: center;
            backdrop-filter: blur(8px); animation: atgFadeIn 0.4s ease;
            font-family: 'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;
          }
          @keyframes atgFadeIn { from{opacity:0} to{opacity:1} }
          @keyframes atgFadeOut { from{opacity:1} to{opacity:0} }
          @keyframes atgBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
          @keyframes atgGradient { 0%,100%{background-position:0%50%} 50%{background-position:100%50%} }
          @keyframes atgPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }
          @keyframes atgConfetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
          }
          @keyframes atgStarFloat {
            0%,100% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0.6; }
            25% { transform: translateY(-15px) translateX(10px) rotate(90deg); opacity: 1; }
            50% { transform: translateY(-5px) translateX(-8px) rotate(180deg); opacity: 0.7; }
            75% { transform: translateY(-20px) translateX(5px) rotate(270deg); opacity: 0.9; }
          }
          @keyframes atgGlow { 
            0%,100% { box-shadow: 0 0 20px rgba(102,126,234,0.3); } 
            50% { box-shadow: 0 0 40px rgba(118,75,162,0.6), 0 0 60px rgba(245,87,108,0.3); } 
          }
          @keyframes atgScorePop {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes atgSlideUp {
            from { transform: translateY(30px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
    
          /* ===== 容器 ===== */
          .atg-container {
            background: white; border-radius: 24px; width: 92%; max-width: 580px;
            max-height: 90vh; overflow-y: auto; position: relative;
            box-shadow: 0 25px 80px rgba(0,0,0,0.4);
            animation: atgSlideUp 0.5s ease;
          }
          .atg-container::-webkit-scrollbar { width: 6px; }
          .atg-container::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
    
          /* ===== 顶部彩虹条 ===== */
          .atg-container::before {
            content:''; position:absolute; top:0; left:0; right:0; height:6px;
            background: linear-gradient(90deg,#f093fb,#f5576c,#4facfe,#00f2fe,#43e97b);
            background-size:300%100%; animation:atgGradient 4s ease infinite;
            border-radius:24px 24px 0 0;
          }
    
          /* ===== 内容区域 ===== */
          .atg-body { padding: 36px 32px 28px; }
    
          /* ===== 开始界面 ===== */
          .atg-emoji { text-align:center; font-size:56px; margin-bottom:8px; animation:atgBounce 2.5s ease infinite; }
          .atg-title { text-align:center; color:#333; font-size:24px; font-weight:bold; margin-bottom:6px; }
          .atg-subtitle { text-align:center; color:#aaa; font-size:13px; margin-bottom:24px; }
          .atg-intro { color:#666; line-height:1.9; font-size:14.5px; margin-bottom:20px; }
          .atg-start-btn {
            display:block; width:100%; padding:16px; font-size:18px; font-weight:bold;
            color:white; background:linear-gradient(135deg,#667eea,#764ba2);
            border:none; border-radius:14px; cursor:pointer; transition:all 0.3s;
            margin-top:16px; letter-spacing:2px;
          }
          .atg-start-btn:hover { transform:translateY(-3px); box-shadow:0 12px 30px rgba(102,126,234,0.45); }
    
          /* ===== 进度条 ===== */
          .atg-progress { height:8px; background:#f0f0f0; border-radius:4px; margin-bottom:22px; overflow:hidden; }
          .atg-progress-fill { height:100%; background:linear-gradient(90deg,#667eea,#764ba2,#f5576c); border-radius:4px; transition:width 0.5s cubic-bezier(0.4,0,0.2,1); }
    
          /* ===== 题目 ===== */
          .atg-qnum { color:#bbb; font-size:13px; margin-bottom:10px; }
          .atg-qtext { font-size:17px; color:#333; line-height:1.65; margin-bottom:20px; font-weight:600; }
    
          /* ===== 选项 ===== */
          .atg-options { display:flex; flex-direction:column; gap:10px; }
          .atg-opt {
            padding:14px 18px; font-size:15px; text-align:left; border:2px solid #eee;
            border-radius:12px; cursor:pointer; transition:all 0.2s ease; background:white; color:#555;
            display:flex; align-items:center; gap:12px;
          }
          .atg-opt:hover { border-color:#667eea; background:#f8f9ff; transform:translateX(6px); }
          .atg-opt.selected { border-color:#667eea; background:linear-gradient(135deg,rgba(102,126,234,0.08),rgba(118,75,162,0.08)); transform:scale(1.02); }
          .atg-opt-label { font-weight:bold; color:#667eea; min-width:24px; font-size:15px; }
    
          /* ===== 结果界面 ===== */
          .atg-result-emoji { text-align:center; font-size:72px; margin-bottom:4px; animation:atgBounce 2s ease infinite; }
          .atg-result-level { text-align:center; font-size:26px; font-weight:bold; color:#333; margin-bottom:6px; }
          .atg-result-score {
            text-align:center; font-size:68px; font-weight:bold;
            background:linear-gradient(135deg,#667eea,#764ba2,#f5576c);
            -webkit-background-clip:text; -webkit-text-fill-color:transparent;
            background-clip:text; margin:12px 0; animation:atgScorePop 0.8s ease;
          }
          .atg-result-desc {
            text-align:center; color:#666; line-height:1.85; font-size:14.5px;
            margin-bottom:18px; padding:16px; background:linear-gradient(135deg,#f8f9ff,#fff5fa); border-radius:14px;
          }
    
          /* ===== 维度分析 ===== */
          .atg-detail { margin-top:18px; padding:18px; background:#fafbfc; border-radius:14px; }
          .atg-detail-title { font-weight:bold; color:#444; margin-bottom:14px; font-size:15px; }
          .atg-detail-item { display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-bottom:1px solid #eee; font-size:13.5px; }
          .atg-detail-item:last-child { border-bottom:none; }
          .atg-bar { width:110px; height:8px; background:#e8e8e8; border-radius:4px; overflow:hidden; }
          .atg-bar-fill { height:100%; border-radius:4px; transition:width 1.2s cubic-bezier(0.4,0,0.2,1); }
    
          /* ===== 彩蛋区域 ===== */
          .atg-easter-egg {
            margin-top:18px; padding:18px 20px; border-radius:14px; text-align:center;
            font-size:14px; line-height:1.8; animation:atgSlideUp 0.6s ease backwards;
            animation-delay: 0.8s;
          }
          .atg-easter-egg-title { font-size:18px; font-weight:bold; margin-bottom:10px; }
          .atg-easter-egg-emoji { font-size:40px; margin-bottom:8px; }
    
          /* ===== 提示卡片 ===== */
          .atg-tip {
            background:linear-gradient(135deg,#fff8f5,#fff0f6); border-left:4px solid #f5576c;
            padding:14px 16px; border-radius:0 12px 12px 0; margin-top:16px;
            font-size:13.5px; color:#555; line-height:1.75;
          }
          .atg-tip strong { color:#f5576c; }
    
          /* ===== 按钮组 ===== */
          .atg-btns { display:flex; gap:10px; margin-top:20px; }
          .atg-btns button {
            flex:1; padding:13px; font-size:15px; font-weight:bold; border:none;
            border-radius:12px; cursor:pointer; transition:all 0.2s;
          }
          .atg-btn-retest { background:linear-gradient(135deg,#667eea,#764ba2); color:white; }
          .atg-btn-share { background:#f5f5f5; color:#444; }
          .atg-btn-retest:hover,.atg-btn-share:hover { transform:translateY(-2px); }
    
          /* ===== 免责声明 ===== */
          .atg-disclaimer { text-align:center; font-size:11.5px; color:#ccc; margin-top:16px; line-height:1.7; }
    
          /* ===== 彩蛋特效：彩带容器 ===== */
          .atg-confetti-container { position:fixed; top:0;left:0;width:100%;height:100%; pointer-events:none; z-index:99999; overflow:hidden; }
          .atg-confetti { position:absolute; font-size:24px; animation:atgConfetti 3s ease-out forwards; }
    
          /* ===== 关闭按钮 ===== */
          .atg-close {
            position:absolute; top:12px; right:14px; width:32px; height:32px;
            border:none; background:rgba(0,0,0,0.06); border-radius:50%;
            cursor:pointer; font-size:18px; color:#999; display:flex;
            align-items:center; justify-content:center; transition:all 0.2s;
            z-index:10;
          }
          .atg-close:hover { background:rgba(0,0,0,0.15); color:#333; transform:rotate(90deg); }
    
          /* ===== 星星装饰（结果页） ===== */
          .atg-star { position:absolute; font-size:16px; pointer-events:none; animation:atgStarFloat 3s ease-in-out infinite; opacity:0; }
        `;
        document.head.appendChild(style);
      }
    
      // ========== 题库数据 ==========
      const questions = [
        { text: "📱 当你的手机没信号或快没电时，你会？",
          options: [
            { label:"A", text:"完全不在意，该干嘛干嘛", score:0 },
            { label:"B", text:"稍微有点不安，但能忍受", score:2 },
            { label:"C", text:"开始四处找充电器/信号好的地方", score:4 },
            { label:"D", text:"心跳加速，感觉与世界失联了！", score:6 }
          ], category:"social" },
        { text: "⏰ 如果一个消息已经读了但还没回复，你会？",
          options: [
            { label:"A", text:"想回就回，不着急", score:0 },
            { label:"B", text:"心里记着，有空就回", score:2 },
            { label:"C", text:"一直想着这件事，有点内疚", score:4 },
            { label:"D", text:"立刻回复！不回睡不着觉！", score:6 }
          ], category:"social" },
        { text: "💼 明天有一个重要会议/考试，今晚你会？",
          options: [
            { label:"A", text:"正常作息，没什么特别的", score:0 },
            { label:"B", text:"稍微复习/准备一下就睡了", score:2 },
            { label:"C", text:"反复检查准备材料，睡得比较晚", score:4 },
            { label:"D", text:"失眠！脑子里疯狂过各种场景", score:6 }
          ], category:"performance" },
        { text: "👥 走进一个全是陌生人的房间时，你感觉如何？",
          options: [
            { label:"A", text:"很自在，甚至想认识新朋友", score:0 },
            { label:"B", text:"有点小紧张，但很快适应", score:2 },
            { label:"C", text:"不太自在，想找个角落待着", score:4 },
            { label:"D", text:"手心冒汗，想立刻逃离现场", score:6 }
          ], category:"social" },
        { text: "📧 收到「我们需要谈谈」这条消息时，你的第一反应是？",
          options: [
            { label:"A", text:"哦？谈什么？正常回复", score:0 },
            { label:"B", text:"嗯？有点好奇是什么事", score:2 },
            { label:"C", text:"心里一紧，是不是我做错了什么", score:4 },
            { label:"D", text:"完了完了完了！！！", score:6 }
          ], category:"overthinking" },
        { text: "🛒 排队结账时前面的人动作很慢，你会？",
          options: [
            { label:"A", text:"无所谓，刷刷手机等一下", score:0 },
            { label:"B", text:"稍微有点不耐烦，但能控制", score:2 },
            { label:"C", text:"频繁看表，换队伍的念头在打架", score:4 },
            { label:"D", text:"焦躁到想直接走人！", score:6 }
          ], category:"patience" },
        { text: "🔔 手机响了但你不知道是谁，你会？",
          options: [
            { label:"A", text:"接啊，有什么大不了的", score:0 },
            { label:"B", text:"犹豫一下再接", score:2 },
            { label:"C", text:"盯着屏幕犹豫很久才敢接", score:4 },
            { label:"D", text:"不敢接！让铃声自己停掉", score:6 }
          ], category:"social" },
        { text: "🎯 你正在做一件事，突然想到还有别的事没做，你会？",
          options: [
            { label:"A", text:"记下来，继续专注当前的事", score:0 },
            { label:"B", text:"心里记着，做完手头的事再去处理", score:2 },
            { label:"C", text:"开始分心，效率明显下降", score:4 },
            { label:"D", text:"立刻放下手里的事去处理那个！", score:6 }
          ], category:"focus" },
        { text: "🌙 睡前躺在床上，你的大脑通常处于什么状态？",
          options: [
            { label:"A", text:"很快放空，几分钟就睡着", score:0 },
            { label:"B", text:"偶尔想东想西，但能入睡", score:2 },
            { label:"C", text:"反复回想今天发生的事", score:4 },
            { label:"D", text:"脑子像跑马灯一样停不下来！", score:6 }
          ], category:"overthinking" },
        { text: "✈️ 出行前你通常会？",
          options: [
            { label:"A", text:"拿上钥匙就走，随性出发", score:0 },
            { label:"B", text:"简单确认一下必备物品", score:2 },
            { label:"C", text:"反复检查2-3遍，生怕忘东西", score:4 },
            { label:"D", text:"提前列清单，出门还要再检查一遍", score:6 }
          ], category:"perfectionism" }
      ];
    
      // ========== 彩蛋数据（每个等级都有独特的彩蛋！）==========
      const easterEggs = {
        level1: {
          title: "🎊 恭喜解锁「人间清醒」成就！",
          emoji: "🏆🌈✨🎉🦋",
          content: `
            <div class="atg-easter-egg-emoji">🏆</div>
            <p><strong>你的松弛感已经达到了传说级别！</strong></p>
            <p>你知道吗？在心理学中，这种「低焦虑高适应力」的状态被称为<strong>「心理弹性」</strong>——这是非常珍贵的能力！</p>
            <p>🌟 <strong>你的超能力：</strong></p>
            <ul style="text-align:left;display:inline-block;margin:0;padding-left:20px;">
              <li>情绪稳定器 — 天塌下来当被子盖</li>
              <li>压力粉碎机 — 别人慌你不慌</li>
              <li>淡定光环 — 走到哪都自带 calm vibe</li>
            </ul>
            <p style="margin-top:10px;">💬 <em>"不是我不在乎，是我选择用平静的方式面对一切。"</em></p>
            <p><strong>今日幸运签：</strong>🔮 你最近会遇到一件让你会心一笑的小确幸~</p>
          `,
          bgColor: "linear-gradient(135deg, #e8f5e9, #c8e6c9, #dcedc8)",
          borderColor: "#4caf50",
          textColor: "#2e7d32",
          confettiEmojis: ["🏆","⭐","🌟","✨","🎉","🎊","🌈","🦋","💫","🍀"]
        },
        level2: {
          title: "🌸 解锁「温柔力量」徽章！",
          emoji: "💪🌸🌿☀️🎵",
          content: `
            <div class="atg-easter-egg-emoji">🌸</div>
            <p><strong>你拥有恰到好处的敏感度——这其实是一种天赋！</strong></p>
            <p>心理学研究表明：<strong>适度焦虑的人往往更有同理心和洞察力。</strong>你能感知到别人忽略的细节，这份细腻是你独特的优势。</p>
            <p>🌟 <strong>你的隐藏技能：</strong></p>
            <ul style="text-align:left;display:inline-block;margin:0;padding-left:20px;">
              <li>情绪雷达 — 能敏锐察觉他人的感受</li>
              <li>细节捕手 — 别人看不到的你都能看到</li>
              <li>温柔铠甲 — 外表温和内心有力量</li>
            </ul>
            <p style="margin-top:10px;">💬 <em>"敏感不是弱点，是世界给你的礼物。"</em></p>
            <p><strong>今日幸运签：</strong>🔮 你的直觉会在关键时刻帮到你~</p>
          `,
          bgColor: "linear-gradient(135deg, #fce4ec, #f8bbd0, #f48fb1)",
          borderColor: "#ec407a",
          textColor: "#ad1457",
          confettiEmojis: ["🌸","💐","🌷","🌹","☀️","💫","🎵","🦋","💗","✨"]
        },
        level3: {
          title: "🛡️ 获得「成长战士」称号！",
          emoji: "🛡️⚡🔥💎🚀",
          content: `
            <div class="atg-easter-egg-emoji">🛡️</div>
            <p><strong>你正在经历成长的阵痛——这说明你在乎，你想变得更好！</strong></p>
            <p>每一份焦虑背后，都藏着一个<strong>「我想做好」</strong>的愿望。这不是缺点，这是你<strong>上进心的证明</strong>。很多成功人士都经历过这个阶段。</p>
            <p>🌟 <strong>你的成长武器：</strong></p>
            <ul style="text-align:left;display:inline-block;margin:0;padding-left:20px;">
              <li>责任心MAX — 你对事情认真负责</li>
              <li>自我驱动 — 不需要别人推就会往前走</li>
              <li>反思能力 — 总在想怎么做得更好</li>
            </ul>
            <p style="margin-top:10px;">💬 <em>"焦虑只是提醒你：这件事对你很重要。"</em></p>
            <p><strong>今日幸运签：</strong>🔮 你的努力很快会被某人看到并认可~</p>
          `,
          bgColor: "linear-gradient(135deg, #fff3e0, #ffe0b2, #ffcc80)",
          borderColor: "#ff9800",
          textColor: "#e65100",
          confettiEmojis: ["🛡️","⚡","🔥","💎","🚀","⭐","🌟","💪","🎯","✨"]
        },
        level4: {
          title: "💎 触发「钻石锻造」剧情！",
          emoji: "💎🔥🌋✨🌅",
          content: `
            <div class="atg-easter-egg-emoji">💎</div>
            <p><strong>压力越大，钻石越亮——你可能正处于蜕变的前夜！</strong></p>
            <p>你知道吗？<strong>高压环境往往是人成长最快的时期。</strong>你现在感受到的一切压力，都在为你锻造一颗更强大的内心。很多伟大的人都曾经历过这样的阶段。</p>
            <p>🌟 <strong>你的钻石属性：</strong></p>
            <ul style="text-align:left;display:inline-block;margin:0;padding-left:20px;">
              <li>抗压能力正在升级中... ⬆️</li>
              <li>你对生活有着深刻的思考和追求</li>
              <li>你的敏感度让你能创造出独特价值</li>
            </ul>
            <p style="margin-top:10px;">💬 <em>"你不是脆弱，你是在经历一场心灵的淬炼。"</em></p>
            <p><strong>今日幸运签：</strong>🔮 一件意想不到的好事正在靠近你~</p>
          `,
          bgColor: "linear-gradient(135deg, #e3f2fd, #bbdefb, #90caf9)",
          borderColor: "#2196f3",
          textColor: "#0d47a1",
          confettiEmojis: ["💎","🔥","🌋","✨","🌅","⭐","💫","🌊","🦅","🎆"]
        },
        level5: {
          title: "🌺 开启「凤凰涅槃」隐藏章节！",
          emoji: "🌺🦋🌈🔥💖",
          content: `
            <div class="atg-easter-egg-emoji">🦋</div>
            <p><strong>亲爱的，你已经很努力了。现在，请允许自己休息一下。</strong></p>
            <p>你现在的状态说明：<strong>你是一个对自己有要求、对生活有热情的人。</strong>但请记住——<strong>你不需要完美才能被爱，你已经足够好了。</strong></p>
            <p>🌟 <strong>你的光芒：</strong></p>
            <ul style="text-align:left;display:inline-block;margin:0;padding-left:20px;">
              <li>你比想象中更坚强 💪</li>
              <li>你的感受都是真实且合理的 ❤️</li>
              <li>寻求帮助是最勇敢的选择 🤝</li>
            </ul>
            <p style="margin-top:10px;">💬 <em>"你不必成为超人才能证明自己的价值。做真实的自己，就已经足够闪耀。"</em></p>
            <p><strong>今日幸运签：</strong>🔮 温暖你的人就在身边，别忘记抬头看看~</p>
            <p style="margin-top:8px;font-size:12.5px;color:#888;">
              📞 全国心理援助热线：400-161-9995<br>
              📞 北京心理危机干预：010-82951332<br>
              <em>求助不是软弱，而是勇敢的表现 💙</em>
            </p>
          `,
          bgColor: "linear-gradient(135deg, #fce4ec, #f3e5f5, #e8eaf6)",
          borderColor: "#9c27b0",
          textColor: "#6a1b9a",
          confettiEmojis: ["🌺","🦋","🌈","🔥","💖","🕊️","☮️","💫","🌸","✨"]
        }
      };
    
      // ========== 全正反馈描述数据 ==========
      const positiveResults = {
        level1: {
          level: "🌿 佛系达人",
          emoji: "😌",
          desc: `你的焦虑指数只有 <strong>{score}%</strong>！<br><br>你就是行走的「淡定丸」，心态稳得让人羡慕。<br>天塌下来当被子盖，这种松弛感简直是稀缺资源！<br><br>🌱 <strong>正反馈：</strong>你的心理弹性非常出色，能在变化中保持平衡。这种能力让你在面对挑战时更加从容不迫。继续保持这份从容，世界会因为你的平静而变得更美好~`,
          tip: "<strong>💡 小建议：</strong>你已经很棒了！保持这份从容的同时，也可以适当规划未来目标，让你的松弛感变成一种主动选择的智慧~"
        },
        level2: {
          level: "😊 轻微波动",
          emoji: "🙂",
          desc: `你的焦虑指数是 <strong>{score}%</strong>，属于健康的正常范围！<br><br>大多数时候你能保持平静，只在特定情况下会有一些小波动。<br>这说明你有正常的情绪感知能力，同时也有很好的自我调节能力。<br><br>🌱 <strong>正反馈：</strong>你的情绪调节能力很好！能够在大多数情况下保持内心的平衡，这是一个非常了不起的特质。你对生活的态度既不过度紧张也不过于松懈，刚刚好！`,
          tip: "<strong>💡 小建议：</strong>状态很不错！当你感到轻微波动时，试试深呼吸或短暂散步。这些简单的技巧就能帮你快速恢复最佳状态~"
        },
        level3: {
          level: "😐 中度关注",
          emoji: "😊",
          desc: `你的焦虑指数达到 <strong>{score}%</strong>。<br><br>这说明你是一个<strong>对生活有要求、对未来有期待</strong>的人！<br>你会思考、会在意、会想要做得更好——这些都是非常积极的品质。<br><br>🌱 <strong>正反馈：</strong>你的在意和思考，证明了你对生活的热爱和责任感。很多人正是因为像你这样「想太多」才取得了卓越的成就。你的焦虑能量完全可以转化为前进的动力！`,
          tip: "<strong>💡 小建议：</strong>试着每天给自己留一段「放空时间」，远离手机和社交媒体。规律运动、充足睡眠都会帮助你的思绪更清晰。记住：你已经做得很好了！"
        },
        level4: {
          level: "⚠️ 能量满格",
          emoji: "💪",
          desc: `你的焦虑指数达到 <strong>{score}%</strong>！<br><br>朋友，你身上承载了很多期望和责任——这说明<strong>你是可以被信赖的人</strong>。<br>你的敏感和在意，让你在工作中更细致，在关系中更用心。<br><br>🌱 <strong>正反馈：</strong>你的高度敏感是一种超能力！你能察觉到别人忽略的细节，能在问题发生前就做好准备。现在你需要的是学会给这份能力找一个合适的「出口」。`,
          tip: "<strong>💡 温馨提示：</strong>建议每天做10分钟冥想、减少信息摄入、保证运动时间。如果持续感到困扰，和朋友聊聊或咨询专业人士都是非常好的选择。照顾好自己，因为你值得！"
        },
        level5: {
          level: "🌟 勇者勋章",
          emoji: "🤗",
          desc: `你的焦虑指数达到了 <strong>{score}%</strong>。<br><br>首先，<strong>请给自己一个大大的拥抱</strong> 🤗<br>你能完成这个测试本身就需要勇气。你一直在努力面对和承担，这本身就是一种了不起的力量。<br><br>🌱 <strong>正反馈：</strong>你的感受是完全合理且真实的。能够意识到自己需要关注，这就是迈向更好状态的第一步。你比你想象的更坚强，也比你认为的更重要。`,
          tip: "<strong>💙 重要提醒：</strong>你已经很努力了，现在最重要的是好好照顾自己。<br>📞 全国心理援助热线：400-161-9995<br>📞 北京心理危机干预：010-82951332<br>💜 记住：求助不是软弱，而是最勇敢的选择。你值得被爱，值得被关心。"
        }
      };
    
      // ========== 状态变量 ==========
      let currentQ = 0;
      let answers = [];
      let catScores = { social:0, performance:0, overthinking:0, patience:0, focus:0, perfectionism:0 };
    
      // ========== 移除旧实例 ==========
      const oldOverlay = document.getElementById('atg-overlay');
      if (oldOverlay) oldOverlay.remove();
    
      // ========== 创建主容器 ==========
      const overlay = document.createElement('div');
      overlay.id = 'atg-overlay';
      overlay.innerHTML = `
        <div class="atg-container">
          <button class="atg-close" id="atg-close" title="关闭">✕</button>
          <div class="atg-body" id="atg-body"></div>
        </div>
      `;
      document.body.appendChild(overlay);
    
      const body = document.getElementById('atg-body');
    
      // ========== 关闭按钮 ==========
      document.getElementById('atg-close').onclick = () => {
        overlay.style.animation = 'atgFadeOut 0.3s ease forwards';
        setTimeout(() => overlay.remove(), 300);
      };
    
      // ========== 渲染开始界面 ==========
      function renderStart() {
        body.innerHTML = `
          <div class="atg-emoji">🧠</div>
          <div class="atg-title">焦虑指数大测试</div>
          <div class="atg-subtitle">仅供娱乐 · 请勿当真 · 放松就好 😌</div>
          <div class="atg-intro">
            欢迎来到焦虑测试！本测试包含 <strong>10道趣味题目</strong>，
            帮你了解自己最近的「焦虑能量」水平。<br><br>
            ⏱️ 预计用时：2分钟<br>
            🎁 每个等级都有专属彩蛋等你发现！<br>
            ✨ 不管结果如何，都有正反馈等着你~
          </div>
          <button class="atg-start-btn" id="atg-start-btn">开始测试 🚀</button>
          <div class="atg-disclaimer">
            ⚠️ 本测试纯属娱乐，不具备任何医学诊断价值。<br>
            如有真实困扰，请寻求专业帮助 💙
          </div>
        `;
        document.getElementById('atg-start-btn').onclick = startTest;
      }
    
      // ========== 开始测试 ==========
      function startTest() {
        currentQ = 0;
        answers = [];
        catScores = { social:0, performance:0, overthinking:0, patience:0, focus:0, perfectionism:0 };
        renderQuestion();
      }
    
      // ========== 渲染题目 ==========
      function renderQuestion() {
        const q = questions[currentQ];
        const progressPct = (currentQ / questions.length) * 100;
    
        let optsHtml = q.options.map((opt, i) => `
          <div class="atg-opt" data-idx="${i}">
            <span class="atg-opt-label">${opt.label}</span>
            <span>${opt.text}</span>
          </div>
        `).join('');
    
        body.innerHTML = `
          <div class="atg-progress"><div class="atg-progress-fill" style="width:${progressPct}%"></div></div>
          <div class="atg-qnum">第 ${currentQ + 1} 题 / 共 ${questions.length} 题</div>
          <div class="atg-qtext">${q.text}</div>
          <div class="atg-options">${optsHtml}</div>
        `;
    
        body.querySelectorAll('.atg-opt').forEach(btn => {
          btn.onclick = function() {
            body.querySelectorAll('.atg-opt').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            const idx = parseInt(this.dataset.idx);
            const opt = q.options[idx];
            setTimeout(() => {
              answers.push({ question: currentQ, score: opt.score, category: q.category });
              catScores[q.category] += opt.score;
              currentQ++;
              currentQ < questions.length ? renderQuestion() : renderResult();
            }, 280);
          };
        });
      }
    
      // ========== 彩带特效 ==========
      function fireConfetti(emojis) {
        const container = document.createElement('div');
        container.className = 'atg-confetti-container';
        for (let i = 0; i < 30; i++) {
          const confetti = document.createElement('div');
          confetti.className = 'atg-confetti';
          confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
          confetti.style.left = Math.random() * 100 + '%';
          confetti.style.bottom = '-30px';
          confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
          confetti.style.animationDelay = Math.random() * 0.8 + 's';
          container.appendChild(confetti);
        }
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 4500);
      }
    
      // ========== 星星装饰 ==========
      function addStars(containerEl) {
        const starEmojis = ['⭐', '✨', '🌟', '💫', '🌠'];
        for (let i = 0; i < 12; i++) {
          const star = document.createElement('span');
          star.className = 'atg-star';
          star.textContent = starEmojis[i % starEmojis.length];
          star.style.left = Math.random() * 100 + '%';
          star.style.top = Math.random() * 100 + '%';
          star.style.animationDelay = (Math.random() * 2) + 's';
          containerEl.querySelector('.atg-container')?.appendChild(star);
          // 也加到overlay上
          if (containerEl.closest('#atg-overlay')) {
            containerEl.closest('#atg-overlay').appendChild(star);
          }
        }
      }
    
      // ========== 确定等级 ==========
      function getLevel(pct) {
        if (pct <= 20) return 'level1';
        if (pct <= 40) return 'level2';
        if (pct <= 60) return 'level3';
        if (pct <= 80) return 'level4';
        return 'level5';
      }
    
      // ========== 渲染结果 ==========
      function renderResult() {
        const totalScore = answers.reduce((s, a) => s + a.score, 0);
        const maxPossible = questions.length * 6;
        const percentage = Math.round((totalScore / maxPossible) * 100);
        const levelKey = getLevel(percentage);
        const result = positiveResults[levelKey];
        const egg = easterEggs[levelKey];
    
        // 替换分数占位符
        const descHtml = result.desc.replace('{score}', percentage);
    
        // 维度分析
        const categories = {
          social:{name:'社交焦虑',icon:'👥'}, performance:{name:'表现焦虑',icon:'💼'},
          overthinking:{name:'过度思考',icon:'🔄'}, patience:{name:'急躁程度',icon:'⏳'},
          focus:{name:'注意力分散',icon:'🎯'}, perfectionism:{name:'完美主义倾向',icon:'✨'}
        };
        const catMax = { social:12, performance:6, overthinking:12, patience:6, focus:6, perfectionism:6 };
    
        let detailHtml = '';
        Object.entries(categories).forEach(([key, info]) => {
          const s = catScores[key];
          const m = catMax[key];
          const pct = Math.round((s / m) * 100);
          let c = '#4caf50'; if (pct > 60) c = '#ff9800'; if (pct > 80) c = '#f44336';
          detailHtml += `<div class="atg-detail-item">
            <span>${info.icon} ${info.name}</span>
            <div style="display:flex;align-items:center;gap:8px;">
              <div class="atg-bar"><div class="atg-bar-fill" style="width:${pct}%;background:${c}"></div></div>
              <span style="font-size:11.5px;color:#999;width:30px;text-align:right">${pct}%</span>
            </div>
          </div>`;
        });
    
        body.innerHTML = `
          <div class="atg-result-emoji">${result.emoji}</div>
          <div class="atg-result-level">${result.level}</div>
          <div class="atg-result-score" id="atg-score">0</div>
          <div class="atg-result-desc">${descHtml}</div>
    
          <div class="atg-detail">
            <div class="atg-detail-title">📊 各维度分析</div>
            ${detailHtml}
          </div>
    
          <!-- 🎁 彩蛋区域 -->
          <div class="atg-easter-egg" style="background:${egg.bgColor};border-left:4px solid ${egg.borderColor};color:${egg.textColor};">
            <div class="atg-easter-egg-title">${egg.title}</div>
            ${egg.content}
          </div>
    
          <div class="atg-tip">${result.tip}</div>
    
          <div class="atg-btns">
            <button class="atg-btn-retest" id="atg-retest">再测一次 🔄</button>
            <button class="atg-btn-share" id="atg-share">分享结果 📤</button>
          </div>
          <div class="atg-disclaimer">
            ⚠️ 本测试仅供娱乐参考，不构成任何专业建议<br>
            🎮 每次测试结果可能不同，享受过程就好~
          </div>
        `;
    
        // 数字动画
        const scoreEl = document.getElementById('atg-score');
        let cur = 0;
        const step = totalScore / 40;
        const timer = setInterval(() => {
          cur += step;
          if (cur >= totalScore) { cur = totalScore; clearInterval(timer); }
          scoreEl.textContent = Math.round(cur);
        }, 30);
    
        // 发射彩带！
        setTimeout(() => fireConfetti(egg.confettiEmojis), 500);
    
        // 添加星星装饰
        addStars(overlay);
    
        // 结果容器发光效果
        const container = overlay.querySelector('.atg-container');
        container.style.animation = 'atgGlow 2s ease-in-out infinite';
    
        // 按钮
        document.getElementById('atg-retest').onclick = () => {
          container.style.animation = '';
          startTest();
        };
        document.getElementById('atg-share').onclick = shareResult;
      }
    
      // ========== 分享功能 ==========
      function shareResult() {
        const totalScore = answers.reduce((s, a) => s + a.score, 0);
        const maxPossible = questions.length * 6;
        const percentage = Math.round((totalScore / maxPossible) * 100);
        const levelKey = getLevel(percentage);
        const levelName = positiveResults[levelKey].level;
        const text = `🧠 我的焦虑指数测试结果：${percentage}%\n${levelName}\n\n✨ 每个等级都有专属彩蛋！\n快来测测你的焦虑指数吧！\n（仅供娱乐 😄）`;
    
        if (navigator.share) {
          navigator.share({ title: '焦虑指数测试结果', text });
        } else if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => alert('📋 结果已复制到剪贴板，快去分享吧！'));
        } else {
          alert(text);
        }
      }
    
      // ========== 启动！==========
      renderStart();
    
      return {
        ok: true,
        summary: "🧠 焦虑指数大测试（增强版）已启动！包含10道题目、5个等级彩蛋、全正反馈系统。点击「开始测试」即可体验~",
        data: {
          features: [
            "10道趣味题目覆盖6个维度",
            "5个等级评定，每个等级有专属彩蛋",
            "全正反馈机制 - 所有结果都有鼓励性评语",
            "彩带特效 + 星星装饰 + 发光动画",
            "分享功能支持",
            "可保存为妙招重复使用"
          ]
        }
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();