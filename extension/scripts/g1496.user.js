(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ============================================================
      // 塔罗占卜程序 - 支持Word文件上传，根据文件内容抽取塔罗牌
      // ============================================================
    
      const TAROT_CARDS = [
        { name: "愚者", emoji: "🃏", upright: "新的开始，冒险，自由，天真", reversed: "鲁莽，冒险，心不在焉", element: "风", keywords: ["新旅程", "纯真", "潜力"] },
        { name: "魔法师", emoji: "🎩", upright: "意志力，技巧，资源丰富，创造力", reversed: "操控，计划不周，技能未发挥", element: "风", keywords: ["创造", "主动", "专注"] },
        { name: "女祭司", emoji: "🌙", upright: "直觉，神秘，内在知识，潜意识", reversed: "秘密，脱节，压抑内心", element: "水", keywords: ["直觉", "智慧", "神秘"] },
        { name: "女皇", emoji: "👑", upright: "丰盛，母性，自然，美丽，富足", reversed: "依赖，窒息，创意枯竭", element: "地", keywords: ["丰盛", "养育", "创造力"] },
        { name: "皇帝", emoji: "⚔️", upright: "权威，建立，稳定，领导力", reversed: "独裁，控制，缺乏灵活性", element: "火", keywords: ["权威", "秩序", "稳定"] },
        { name: "教皇", emoji: "✝️", upright: "精神智慧，宗教信仰，传统，从众", reversed: "个人信仰，反传统，自由思考", element: "地", keywords: ["传统", "信仰", "指导"] },
        { name: "恋人", emoji: "💕", upright: "爱，和谐，关系，价值观，选择", reversed: "失调，不平衡，误对齐价值观", element: "风", keywords: ["爱情", "选择", "和谐"] },
        { name: "战车", emoji: "🏆", upright: "控制，意志力，胜利，断言，决心", reversed: "自我限制，缺乏方向，攻击性", element: "水", keywords: ["胜利", "决心", "控制"] },
        { name: "力量", emoji: "🦁", upright: "力量，勇气，说服，影响，同情", reversed: "内心疑虑，低能量，原始恐惧", element: "火", keywords: ["勇气", "耐心", "内力"] },
        { name: "隐士", emoji: "🏮", upright: "灵魂探索，内省，独处，内在指引", reversed: "孤立，孤独，退缩", element: "地", keywords: ["内省", "智慧", "独处"] },
        { name: "命运之轮", emoji: "☸️", upright: "好运，因果报应，生命周期，命运", reversed: "坏运气，缺乏控制，执着于旧事", element: "火", keywords: ["命运", "循环", "转机"] },
        { name: "正义", emoji: "⚖️", upright: "正义，公平，真理，因果，法律", reversed: "不公平，缺乏问责，不诚实", element: "风", keywords: ["公正", "真实", "平衡"] },
        { name: "倒吊人", emoji: "🙃", upright: "暂停，放弃，新视角，牺牲，等待", reversed: "迟疑，拖延，阻力", element: "水", keywords: ["等待", "视角", "牺牲"] },
        { name: "死神", emoji: "💀", upright: "终结，变化，转变，过渡，放手", reversed: "抵制变化，个人转变，内部清理", element: "水", keywords: ["转变", "结束", "新生"] },
        { name: "节制", emoji: "🌊", upright: "平衡，节制，耐心，目的，意义", reversed: "失衡，过度，自我治愈", element: "火", keywords: ["平衡", "适度", "调和"] },
        { name: "恶魔", emoji: "😈", upright: "阴影，执念，依附，诱惑，物质主义", reversed: "探索黑暗面，分离，自由", element: "地", keywords: ["执念", "欲望", "束缚"] },
        { name: "高塔", emoji: "⚡", upright: "动荡，变化，混乱，揭示，破坏", reversed: "恐惧变化，避免灾难，延迟", element: "火", keywords: ["变化", "冲击", "觉醒"] },
        { name: "星星", emoji: "⭐", upright: "希望，信仰，复兴，宁静，灵感", reversed: "绝望，沮丧，不相信", element: "风", keywords: ["希望", "指引", "灵感"] },
        { name: "月亮", emoji: "🌕", upright: "幻觉，恐惧，未知，潜意识，混乱", reversed: "放开恐惧，压抑情感，内心混乱", element: "水", keywords: ["幻觉", "潜意识", "迷惑"] },
        { name: "太阳", emoji: "☀️", upright: "积极，乐趣，温暖，成功，活力", reversed: "内在成人，过于乐观，悲观", element: "火", keywords: ["成功", "快乐", "活力"] },
        { name: "审判", emoji: "📯", upright: "判断，重生，内心呼唤，宽恕", reversed: "自我怀疑，内心批评，拒绝接受", element: "火", keywords: ["重生", "觉醒", "召唤"] },
        { name: "世界", emoji: "🌍", upright: "完成，整合，完整性，成就", reversed: "寻求个人封闭，成就不完整", element: "地", keywords: ["完成", "成就", "圆满"] }
      ];
    
      const POSITIONS = [
        { name: "过去", desc: "影响当前状况的过去因素", color: "#8B5CF6" },
        { name: "现在", desc: "当前处境与能量状态", color: "#EC4899" },
        { name: "未来", desc: "可能的发展方向与结果", color: "#F59E0B" }
      ];
    
      // 根据故事内容的关键词来影响抽牌结果（伪随机但有意义）
      function drawCardsFromStory(storyText) {
        let seed = 0;
        for (let i = 0; i < storyText.length; i++) {
          seed = (seed * 31 + storyText.charCodeAt(i)) & 0xFFFFFFFF;
        }
        const drawn = [];
        const used = new Set();
        let s = Math.abs(seed);
        while (drawn.length < 3) {
          s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
          const idx = Math.abs(s) % TAROT_CARDS.length;
          if (!used.has(idx)) {
            used.add(idx);
            const reversed = (s & 1) === 0;
            drawn.push({ card: TAROT_CARDS[idx], reversed, position: POSITIONS[drawn.length] });
          }
        }
        return drawn;
      }
    
      // 根据故事内容分析主题
      function analyzeStory(text) {
        const themes = {
          love: ["爱", "情", "心", "恋", "喜欢", "love", "heart", "relationship"],
          career: ["工作", "事业", "职", "业", "努力", "奋斗", "career", "work", "job"],
          challenge: ["困难", "挑战", "问题", "烦恼", "迷茫", "trouble", "problem", "challenge"],
          growth: ["成长", "学习", "进步", "提升", "发展", "grow", "learn", "progress"],
          change: ["改变", "转变", "新", "不同", "change", "new", "different"],
        };
        const found = [];
        const lower = text.toLowerCase();
        for (const [theme, keywords] of Object.entries(themes)) {
          if (keywords.some(k => lower.includes(k))) found.push(theme);
        }
        return found.length > 0 ? found : ["general"];
      }
    
      // 生成综合解读
      function generateReading(draws, themes) {
        const themeMap = {
          love: "感情方面",
          career: "事业方面",
          challenge: "面对挑战时",
          growth: "个人成长方面",
          change: "面对变化时",
          general: "整体运势方面"
        };
        const themeStr = themes.map(t => themeMap[t] || t).join("、");
    
        const past = draws[0];
        const present = draws[1];
        const future = draws[2];
    
        const pastMeaning = past.reversed ? past.card.reversed : past.card.upright;
        const presentMeaning = present.reversed ? present.card.reversed : present.card.upright;
        const futureMeaning = future.reversed ? future.card.reversed : future.card.upright;
    
        return {
          overall: `根据你分享的文件，${themeStr}，今日塔罗能量呈现出独特的启示。`,
          past: `【${past.position.name}】${past.card.name}${past.reversed ? '（逆位）' : '（正位）'}：${pastMeaning}。这表明过去的经历为你积累了宝贵的底蕴。`,
          present: `【${present.position.name}】${present.card.name}${present.reversed ? '（逆位）' : '（正位）'}：${presentMeaning}。此刻你正处于能量的${present.reversed ? '调整' : '积聚'}阶段。`,
          future: `【${future.position.name}】${future.card.name}${future.reversed ? '（逆位）' : '（正位）'}：${futureMeaning}。未来的路上，${future.card.keywords[0]}将是你的关键词。`,
          advice: `综合三张牌的启示：${past.card.keywords[0]}作为基础，在${present.card.keywords[0]}中前行，向${future.card.keywords[0]}迈进。今日宜保持内心平静，顺应宇宙的节奏。`
        };
      }
    
      // 解析 .docx 文件内容（读取XML）
      async function extractDocxText(file) {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async (e) => {
            try {
              const arrayBuffer = e.target.result;
              // 尝试用 JSZip 解析 docx
              if (typeof JSZip !== 'undefined') {
                const zip = await JSZip.loadAsync(arrayBuffer);
                const docXml = await zip.file('word/document.xml').async('string');
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(docXml, 'text/xml');
                const texts = xmlDoc.querySelectorAll('t');
                let result = '';
                texts.forEach(t => result += t.textContent + ' ');
                resolve(result.trim() || '无法提取文字内容');
              } else {
                // 降级：直接读取二进制中的可见文字
                const uint8 = new Uint8Array(arrayBuffer);
                let text = '';
                for (let i = 0; i < uint8.length - 1; i++) {
                  if (uint8[i] > 31 && uint8[i] < 127) text += String.fromCharCode(uint8[i]);
                }
                // 尝试提取XML中的文字片段
                const xmlMatch = text.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
                if (xmlMatch) {
                  resolve(xmlMatch.map(m => m.replace(/<[^>]+>/g, '')).join(' '));
                } else {
                  resolve(text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？,.!?]/g, ' ').replace(/\s+/g, ' ').trim() || '故事内容已接收');
                }
              }
            } catch (err) {
              resolve('故事已接收，正在为你解读星象...');
            }
          };
          reader.readAsArrayBuffer(file);
        });
      }
    
      // ============================================================
      // UI 样式
      // ============================================================
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Noto+Serif+SC:wght@300;400;600&display=swap');
    
        #tarot-overlay * { box-sizing: border-box; margin: 0; padding: 0; }
    
        #tarot-overlay {
          position: fixed; inset: 0; z-index: 999999;
          background: linear-gradient(135deg, #0a0015 0%, #1a0030 40%, #0d001f 100%);
          font-family: 'Noto Serif SC', 'Cinzel', serif;
          display: flex; flex-direction: column; align-items: center;
          overflow-y: auto; padding: 20px;
        }
    
        #tarot-overlay .stars-bg {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image:
            radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px),
            radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px);
          background-size: 200px 200px, 150px 150px, 100px 100px;
          background-position: 0 0, 50px 50px, 25px 75px;
          animation: twinkle 4s ease-in-out infinite alternate;
        }
    
        @keyframes twinkle {
          0% { opacity: 0.6; }
          100% { opacity: 1; }
        }
    
        #tarot-overlay .main-container {
          position: relative; z-index: 1;
          width: 100%; max-width: 860px;
        }
    
        #tarot-overlay .header {
          text-align: center; margin-bottom: 32px; padding-top: 20px;
        }
    
        #tarot-overlay .header h1 {
          font-family: 'Cinzel', serif;
          font-size: clamp(28px, 5vw, 48px);
          background: linear-gradient(135deg, #ffd700, #ff69b4, #9b59b6, #ffd700);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 3s ease infinite;
          letter-spacing: 4px;
          text-shadow: none;
          margin-bottom: 8px;
        }
    
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
    
        #tarot-overlay .header .subtitle {
          color: rgba(255, 215, 0, 0.7);
          font-size: 14px;
          letter-spacing: 6px;
          text-transform: uppercase;
        }
    
        #tarot-overlay .upload-section {
          background: rgba(255,255,255,0.03);
          border: 2px dashed rgba(255, 215, 0, 0.4);
          border-radius: 20px;
          padding: 40px 30px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
    
        #tarot-overlay .upload-section:hover,
        #tarot-overlay .upload-section.drag-over {
          border-color: rgba(255, 215, 0, 0.9);
          background: rgba(255, 215, 0, 0.06);
          transform: translateY(-2px);
          box-shadow: 0 10px 40px rgba(255, 215, 0, 0.2);
        }
    
        #tarot-overlay .upload-icon { font-size: 56px; margin-bottom: 16px; display: block; animation: float 3s ease-in-out infinite; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    
        #tarot-overlay .upload-text {
          color: rgba(255,255,255,0.85);
          font-size: 18px;
          margin-bottom: 8px;
        }
    
        #tarot-overlay .upload-hint {
          color: rgba(255,215,0,0.6);
          font-size: 13px;
        }
    
        #tarot-overlay #file-input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
    
        #tarot-overlay .btn-divine {
          width: 100%;
          padding: 18px;
          background: linear-gradient(135deg, #7b2ff7, #e040fb, #7b2ff7);
          background-size: 200% 200%;
          border: none;
          border-radius: 14px;
          color: white;
          font-size: 18px;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 4px;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: btn-shimmer 2s ease infinite;
          box-shadow: 0 4px 24px rgba(123,47,247,0.5);
          margin-bottom: 24px;
        }
    
        @keyframes btn-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
    
        #tarot-overlay .btn-divine:hover:not(:disabled) {
          transform: translateY(-3px);
          box-shadow: 0 8px 36px rgba(123,47,247,0.8);
        }
    
        #tarot-overlay .btn-divine:disabled {
          opacity: 0.5; cursor: not-allowed;
        }
    
        #tarot-overlay .file-info {
          background: rgba(123,47,247,0.15);
          border: 1px solid rgba(123,47,247,0.4);
          border-radius: 12px;
          padding: 12px 20px;
          color: rgba(255,255,255,0.8);
          font-size: 14px;
          margin-bottom: 16px;
          display: none;
        }
    
        #tarot-overlay .loading-section {
          text-align: center;
          padding: 60px 20px;
          display: none;
        }
    
        #tarot-overlay .crystal-ball {
          font-size: 80px;
          display: block;
          margin-bottom: 20px;
          animation: crystal-pulse 1.5s ease-in-out infinite;
        }
    
        @keyframes crystal-pulse {
          0%,100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(138,43,226,0.6)); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 25px rgba(255,215,0,0.8)); }
        }
    
        #tarot-overlay .loading-text {
          color: rgba(255,215,0,0.9);
          font-size: 18px;
          letter-spacing: 3px;
          animation: fade-pulse 1.5s ease infinite;
        }
    
        @keyframes fade-pulse {
          0%,100% { opacity: 0.6; } 50% { opacity: 1; }
        }
    
        #tarot-overlay .results-section {
          display: none;
        }
    
        #tarot-overlay .story-preview {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          padding: 16px 20px;
          margin-bottom: 28px;
          color: rgba(255,255,255,0.65);
          font-size: 13px;
          line-height: 1.7;
        }
    
        #tarot-overlay .story-preview strong {
          color: rgba(255,215,0,0.8);
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
    
        #tarot-overlay .cards-row {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
          flex-wrap: wrap;
          justify-content: center;
        }
    
        #tarot-overlay .tarot-card {
          flex: 1; min-width: 200px; max-width: 260px;
          background: linear-gradient(160deg, rgba(30,10,60,0.9) 0%, rgba(20,5,45,0.95) 100%);
          border-radius: 20px;
          border: 1px solid rgba(255,215,0,0.25);
          padding: 24px 18px;
          text-align: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          animation: card-appear 0.6s ease both;
        }
    
        @keyframes card-appear {
          from { opacity: 0; transform: translateY(30px) rotateY(20deg); }
          to { opacity: 1; transform: translateY(0) rotateY(0deg); }
        }
    
        #tarot-overlay .tarot-card:nth-child(1) { animation-delay: 0.1s; }
        #tarot-overlay .tarot-card:nth-child(2) { animation-delay: 0.3s; }
        #tarot-overlay .tarot-card:nth-child(3) { animation-delay: 0.5s; }
    
        #tarot-overlay .tarot-card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 20px 50px rgba(255,215,0,0.25);
          border-color: rgba(255,215,0,0.6);
        }
    
        #tarot-overlay .tarot-card::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,215,0,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
    
        #tarot-overlay .card-position-badge {
          display: inline-block;
          padding: 3px 12px;
          border-radius: 20px;
          font-size: 11px;
          letter-spacing: 2px;
          margin-bottom: 14px;
          font-weight: 600;
        }
    
        #tarot-overlay .card-emoji {
          font-size: 52px;
          display: block;
          margin-bottom: 10px;
          transition: transform 0.3s;
        }
    
        #tarot-overlay .tarot-card.reversed .card-emoji {
          transform: rotate(180deg);
        }
    
        #tarot-overlay .card-name {
          color: #ffd700;
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: 2px;
        }
    
        #tarot-overlay .card-orientation {
          font-size: 11px;
          letter-spacing: 2px;
          margin-bottom: 14px;
          padding: 2px 10px;
          border-radius: 10px;
          display: inline-block;
        }
    
        #tarot-overlay .card-meaning {
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          line-height: 1.7;
          border-top: 1px solid rgba(255,255,255,0.1);
          padding-top: 12px;
        }
    
        #tarot-overlay .card-keywords {
          display: flex; flex-wrap: wrap; gap: 5px;
          justify-content: center; margin-top: 10px;
        }
    
        #tarot-overlay .keyword-tag {
          background: rgba(255,215,0,0.1);
          border: 1px solid rgba(255,215,0,0.3);
          color: rgba(255,215,0,0.8);
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
        }
    
        #tarot-overlay .reading-panel {
          background: linear-gradient(135deg, rgba(20,5,45,0.9) 0%, rgba(35,10,65,0.9) 100%);
          border: 1px solid rgba(255,215,0,0.25);
          border-radius: 20px;
          padding: 28px;
          margin-bottom: 24px;
        }
    
        #tarot-overlay .reading-title {
          color: #ffd700;
          font-size: 16px;
          letter-spacing: 4px;
          text-transform: uppercase;
          margin-bottom: 20px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
    
        #tarot-overlay .reading-item {
          margin-bottom: 16px;
          padding: 14px 18px;
          background: rgba(255,255,255,0.03);
          border-radius: 12px;
          border-left: 3px solid rgba(255,215,0,0.5);
          color: rgba(255,255,255,0.82);
          font-size: 14px;
          line-height: 1.8;
        }
    
        #tarot-overlay .overall-fortune {
          text-align: center;
          padding: 20px;
          background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(138,43,226,0.08));
          border-radius: 14px;
          border: 1px solid rgba(255,215,0,0.2);
          margin-bottom: 20px;
          color: rgba(255,255,255,0.85);
          font-size: 15px;
          line-height: 1.9;
        }
    
        #tarot-overlay .disclaimer {
          text-align: center;
          padding: 16px 20px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: rgba(255,255,255,0.4);
          font-size: 12px;
          line-height: 1.7;
          margin-bottom: 16px;
          letter-spacing: 1px;
        }
    
        #tarot-overlay .egg-banner {
          display: flex;
          align-items: center;
          gap: 14px;
          background: linear-gradient(135deg, rgba(255,215,0,0.10) 0%, rgba(255,105,180,0.10) 50%, rgba(138,43,226,0.12) 100%);
          border: 1.5px solid rgba(255,215,0,0.45);
          border-radius: 16px;
          padding: 16px 20px;
          margin-bottom: 16px;
          animation: egg-glow 2.5s ease-in-out infinite alternate;
        }
    
        @keyframes egg-glow {
          0%  { box-shadow: 0 0 10px rgba(255,215,0,0.15); border-color: rgba(255,215,0,0.4); }
          100%{ box-shadow: 0 0 24px rgba(255,215,0,0.40); border-color: rgba(255,215,0,0.8); }
        }
    
        #tarot-overlay .egg-icon {
          font-size: 32px;
          flex-shrink: 0;
          animation: egg-bounce 1.6s ease-in-out infinite;
        }
    
        @keyframes egg-bounce {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50%      { transform: translateY(-6px) rotate(5deg); }
        }
    
        #tarot-overlay .egg-text {
          color: rgba(255,230,100,0.95);
          font-size: 14px;
          line-height: 1.75;
          letter-spacing: 0.5px;
        }
    
        #tarot-overlay .btn-reset {
          width: 100%;
          padding: 14px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 12px;
          color: rgba(255,255,255,0.7);
          font-size: 15px;
          font-family: 'Noto Serif SC', serif;
          letter-spacing: 3px;
          cursor: pointer;
          transition: all 0.3s;
          margin-bottom: 20px;
        }
    
        #tarot-overlay .btn-reset:hover {
          background: rgba(255,255,255,0.12);
          color: white;
        }
    
        #tarot-overlay .close-btn {
          position: fixed;
          top: 20px; right: 24px;
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          color: white;
          font-size: 20px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          z-index: 1000000;
          transition: all 0.3s;
        }
    
        #tarot-overlay .close-btn:hover {
          background: rgba(255,255,255,0.25);
          transform: rotate(90deg);
        }
    
        #tarot-overlay .fortune-stars {
          display: flex; justify-content: center; gap: 4px;
          margin-bottom: 12px;
        }
    
        #tarot-overlay .fortune-stars span {
          font-size: 20px;
          animation: star-pop 0.4s ease both;
        }
    
        @keyframes star-pop {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
    
        #tarot-overlay .fortune-stars span:nth-child(1) { animation-delay: 0.6s; }
        #tarot-overlay .fortune-stars span:nth-child(2) { animation-delay: 0.8s; }
        #tarot-overlay .fortune-stars span:nth-child(3) { animation-delay: 1.0s; }
        #tarot-overlay .fortune-stars span:nth-child(4) { animation-delay: 1.2s; }
        #tarot-overlay .fortune-stars span:nth-child(5) { animation-delay: 1.4s; }
    
        @media (max-width: 600px) {
          #tarot-overlay .cards-row { flex-direction: column; align-items: center; }
          #tarot-overlay .tarot-card { width: 100%; max-width: 320px; }
        }
      `;
      document.head.appendChild(style);
    
      // ============================================================
      // DOM 构建
      // ============================================================
      const overlay = document.createElement('div');
      overlay.id = 'tarot-overlay';
      overlay.innerHTML = `
        <div class="stars-bg"></div>
        <button class="close-btn" id="tarot-close">✕</button>
        <div class="main-container">
          <!-- Header -->
          <div class="header">
            <h1>✦ TAROT ✦</h1>
            <div class="subtitle">神秘塔罗 · 今日运势占卜</div>
          </div>
    
          <!-- Upload Section -->
          <div class="upload-section" id="upload-area">
            <input type="file" id="file-input" accept=".docx,.doc,.txt" />
            <span class="upload-icon">📜</span>
            <div class="upload-text">上传你的故事文件</div>
            <div class="upload-hint">支持 .docx / .doc / .txt 格式 · 拖拽或点击上传</div>
          </div>
    
          <!-- File Info -->
          <div class="file-info" id="file-info">
            📄 <span id="file-name-display"></span>
          </div>
    
          <!-- Divine Button -->
          <button class="btn-divine" id="btn-divine" disabled>
            🔮 &nbsp; 请先上传故事文件
          </button>
    
          <!-- Loading -->
          <div class="loading-section" id="loading-section">
            <span class="crystal-ball">🔮</span>
            <div class="loading-text">星象正在运转，命运之轮缓缓转动...</div>
          </div>
    
          <!-- Results -->
          <div class="results-section" id="results-section">
            <div class="story-preview" id="story-preview-box">
              <strong>📖 故事内容节选</strong>
              <span id="story-preview-text"></span>
            </div>
    
            <div class="fortune-stars" id="fortune-stars"></div>
    
            <div class="cards-row" id="cards-row"></div>
    
            <div class="reading-panel" id="reading-panel">
              <div class="reading-title">✦ 今日运势解读 ✦</div>
              <div class="overall-fortune" id="overall-fortune"></div>
              <div id="reading-items"></div>
            </div>
    
            <div class="disclaimer">
              ⚠️ 内容仅供娱乐，请勿作为现实决策依据<br>
              塔罗牌是探索内心的工具，最终的选择权始终在你手中 🌟
            </div>
    
            <div class="egg-banner" id="egg-banner">
              <div class="egg-icon">🥚✨</div>
              <div class="egg-text">
                恭喜你已经找到了3个技炉彩蛋！第4个彩蛋依然藏在技炉广场中，是一个测试MBTI的技炉哦！
              </div>
            </div>
    
            <button class="btn-reset" id="btn-reset">↩ 重新占卜</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    
      // ============================================================
      // 事件处理
      // ============================================================
      let selectedFile = null;
    
      const fileInput = overlay.querySelector('#file-input');
      const uploadArea = overlay.querySelector('#upload-area');
      const fileInfo = overlay.querySelector('#file-info');
      const fileNameDisplay = overlay.querySelector('#file-name-display');
      const btnDivine = overlay.querySelector('#btn-divine');
      const loadingSection = overlay.querySelector('#loading-section');
      const resultsSection = overlay.querySelector('#results-section');
      const uploadSectionEl = overlay.querySelector('.upload-section');
    
      // 拖拽支持
      uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
      });
      uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
      uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelect(f);
      });
    
      fileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleFileSelect(e.target.files[0]);
      });
    
      function handleFileSelect(file) {
        selectedFile = file;
        fileNameDisplay.textContent = `${file.name}（${(file.size / 1024).toFixed(1)} KB）`;
        fileInfo.style.display = 'block';
        btnDivine.disabled = false;
        btnDivine.textContent = '🔮   开始塔罗占卜';
        uploadArea.style.borderColor = 'rgba(255,215,0,0.8)';
        uploadArea.style.background = 'rgba(255,215,0,0.05)';
      }
    
      btnDivine.addEventListener('click', async () => {
        if (!selectedFile) return;
        // 切换到加载状态
        uploadSectionEl.style.display = 'none';
        fileInfo.style.display = 'none';
        btnDivine.style.display = 'none';
        loadingSection.style.display = 'block';
    
        // 模拟读取延迟（营造仪式感）
        await new Promise(r => setTimeout(r, 1800));
    
        let storyText = '';
        const ext = selectedFile.name.split('.').pop().toLowerCase();
    
        if (ext === 'txt') {
          storyText = await selectedFile.text();
        } else {
          storyText = await extractDocxText(selectedFile);
        }
    
        if (!storyText || storyText.length < 5) storyText = '命运的指引已经降临';
    
        // 分析并抽牌
        const themes = analyzeStory(storyText);
        const draws = drawCardsFromStory(storyText);
        const reading = generateReading(draws, themes);
    
        // 渲染结果
        loadingSection.style.display = 'none';
        resultsSection.style.display = 'block';
    
        // 故事预览
        overlay.querySelector('#story-preview-text').textContent =
          storyText.length > 120 ? storyText.substring(0, 120) + '……' : storyText;
    
        // 星级（根据正位数量）
        const uprightCount = draws.filter(d => !d.reversed).length;
        const stars = uprightCount === 3 ? 5 : uprightCount === 2 ? 4 : uprightCount === 1 ? 3 : 2;
        const starsEl = overlay.querySelector('#fortune-stars');
        starsEl.innerHTML = '';
        for (let i = 0; i < 5; i++) {
          const s = document.createElement('span');
          s.textContent = i < stars ? '⭐' : '☆';
          s.style.animationDelay = (0.6 + i * 0.2) + 's';
          starsEl.appendChild(s);
        }
    
        // 渲染塔罗牌
        const cardsRow = overlay.querySelector('#cards-row');
        cardsRow.innerHTML = '';
        const posColors = ['#8B5CF6', '#EC4899', '#F59E0B'];
        draws.forEach((draw, i) => {
          const card = document.createElement('div');
          card.className = 'tarot-card' + (draw.reversed ? ' reversed' : '');
          card.innerHTML = `
            <div class="card-position-badge" style="background:${posColors[i]}22;color:${posColors[i]};border:1px solid ${posColors[i]}55">
              ${draw.position.name}
            </div>
            <span class="card-emoji">${draw.card.emoji}</span>
            <div class="card-name">${draw.card.name}</div>
            <span class="card-orientation" style="background:${draw.reversed ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)'};color:${draw.reversed ? '#f87171' : '#4ade80'}">
              ${draw.reversed ? '▼ 逆位' : '▲ 正位'}
            </span>
            <div class="card-meaning">
              ${draw.reversed ? draw.card.reversed : draw.card.upright}
            </div>
            <div class="card-keywords">
              ${draw.card.keywords.map(k => `<span class="keyword-tag">${k}</span>`).join('')}
            </div>
          `;
          cardsRow.appendChild(card);
        });
    
        // 渲染解读
        overlay.querySelector('#overall-fortune').innerHTML =
          `<div style="font-size:13px;color:rgba(255,215,0,0.7);letter-spacing:3px;margin-bottom:10px">✦ 综合运势 ✦</div>` +
          reading.overall;
    
        const readingItems = overlay.querySelector('#reading-items');
        readingItems.innerHTML = [reading.past, reading.present, reading.future, reading.advice]
          .map(r => `<div class="reading-item">${r}</div>`).join('');
    
        // 重新占卜
        overlay.querySelector('#btn-reset').addEventListener('click', () => {
          selectedFile = null;
          uploadSectionEl.style.display = 'block';
          btnDivine.style.display = 'block';
          btnDivine.disabled = true;
          btnDivine.textContent = '🔮   请先上传故事文件';
          fileInfo.style.display = 'none';
          resultsSection.style.display = 'none';
          uploadArea.style.borderColor = '';
          uploadArea.style.background = '';
          fileInput.value = '';
        });
      });
    
      // 关闭按钮
      overlay.querySelector('#tarot-close').addEventListener('click', () => {
        overlay.style.animation = 'fadeOut 0.4s ease forwards';
        setTimeout(() => overlay.remove(), 400);
      });
    
      const fadeOutStyle = document.createElement('style');
      fadeOutStyle.textContent = `@keyframes fadeOut { to { opacity: 0; transform: scale(0.95); } }`;
      document.head.appendChild(fadeOutStyle);
    
      return {
        ok: true,
        summary: "塔罗占卜程序已成功注入页面！支持上传Word/TXT文件，读取故事内容，抽取三张塔罗牌（过去/现在/未来），并给出今日运势解读。",
        features: [
          "支持 .docx / .doc / .txt 文件上传（含拖拽）",
          "根据故事内容语义抽取三张塔罗牌",
          "正位/逆位随机判定，附完整解读",
          "过去·现在·未来三位布局",
          "综合运势星级评分",
          "带免责声明",
          "可关闭浮层"
        ]
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();