(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    /**
     * 🐾 Yuze 桌宠 v6.0 — 随机功能版
     * 
     * v6 新增：
     * ✅ 🎲 丢色子 — 随机1-6点，色子旋转动画+大字显示结果
     * ✅ ⚖️ 做决定 — 帮你做选择（做/不做/看心情），硬币翻转动画
     * ✅ 🎵 推荐歌曲 — 随机推荐一首歌，带音符飘出效果
     * 
     * 保留v5全部功能：
     * 自由放置 / 敲代码(粒子) / 画画(图形) / 钓鱼(波纹)
     * 眼球防越界 / 最小化 / 自动眨眼 / 丰富台词
     */
    
    async function run(args) {
      const CONFIG = {
        normalSize: 70,
        miniSize: 38,
        idleInterval: 5500,
        dockPadding: 10,
        pupilMaxOffset: 2.8
      };
    
      const STATES = {
        IDLE:'idle',WALK:'walk',HAPPY:'happy',SLEEP:'sleep',THINK:'think',
        TYPE:'type',DRAW:'draw',FISH:'fish',
        DICE:'dice', DECIDE:'decide', MUSIC:'music'
      };
    
      let state=STATES.IDLE,isDragging=false,isMini=false;
      let walkTimer=null,blinkTimer=null,idleTimer=null,actionTimer=null;
      let dragStartX=0,dragStartY=0,petStartX=0,petStartY=0;
      let currentX=window.innerWidth-CONFIG.normalSize-CONFIG.dockPadding;
      let currentY=window.innerHeight-CONFIG.normalSize-CONFIG.dockPadding;
    
      // ========== 台词库 ==========
      const DIALOGUES={
        idle:[
          '今天天气真好~ ☀️','要不要一起玩呀？ 🎮','我在这里陪你哦~ 💛',
          '摸摸我吧~ ✋','无聊了...转个圈~ 🔄','Yuze真好用！🚀',
          '双击我可以变小哦~ 📦','你今天看起来不错哦！✨',
          '要不要我帮你写个Hello World？ 💻','听说你在做技炉？加油鸭！🦆',
          '我是不是全网最可爱的桌宠？🤔','今天写了多少行代码？📝',
          '我的bug比你的少哦~ 😜','要不要听我讲个冷笑话？❄️',
          '我觉得这个网页可以再好看点...🎨','要不要一起去钓鱼？🎣',
          'Ctrl+C Ctrl+V 是我的超能力 🧬','你 debug 了吗？还是直接重写？🔄',
          '今天的咖啡好喝吗？☕','要不要来段BGM？🎵',
          '我在想下一个技炉做什么...💡','这个网页加载得好快啊~ ⚡',
          '要不要我帮你整理标签页？📑','我觉得你可以去参加技炉大赛！🏆',
          '今天也是元气满满的一天！🌈','要不要给我起个名字？🏷️',
          '不知道做什么的话，让我帮你丢个色子吧~ 🎲',
          '犹豫不决？我可以帮你做决定！⚖️',
          '想听歌吗？让我给你推荐一首！🎵'
        ],
        happy:[
          '嘻嘻~被戳到了！😊','再戳我一下？😜','好痒啊哈哈哈~ 😂',
          '你今天不错哦！✨','要和我聊天吗？💬','嘿嘿嘿~ 开心！🥳',
          '再来再来我不怕！💪','你是我的最佳拍档！🤝',
          '被夸了会飘的哦~ 🎈','戳得好！满分！💯',
          '再来再来我准备好了！🛡️','最喜欢被你戳了~ ❤️'
        ],
        type:[
          '让我来写段代码... ⌨️','console.log("Hello World!"); 🖥️',
          '正在debug中... 🔍','这个bug好难找... 😫','编译通过了！🎉',
          'Segmentation fault! 💀','正在import各种库... 📦',
          'TODO: 写完这个技炉 ✏️','git push --force 💪',
          '我在想变量名叫什么好... 🤔','function doMagic() { ... } ✨',
          '这代码谁写的？！哦是我自己... 😅','终于跑通了！！！🏃💨',
          '又是一个 warning 忽略掉 ⚠️','npm install 几乎所有东西... 📦',
          '重构！全部重写！🔥','Stack Overflow 没找到答案... 自己造轮子吧！⚙️'
        ],
        draw:[
          '让我画点什么... 🎨','看！这是你！（大概）🖼️',
          '我在画一只... 嗯... 神秘生物 🦄','抽象派，懂吗？抽象！🎭',
          '别笑！我在很认真地画！😤','画好了！是个... 圆？⭕',
          '调色板是我的武器！🌈','像素风！复古！👾',
          '这线条... 充满了灵魂！✏️','毕加索看了都点头 🎩',
          '我要画一颗超大的爱心！❤️','看！一朵小花！🌸',
          '在画彩虹桥！🌈','画个星星送给你 ⭐'
        ],
        fish:[
          '钓鱼中... 🎣','有鱼上钩了吗... 🐟','耐心... 耐心是金... ⏳',
          '我感觉有动静！！👀','今天的鱼好像都很聪明 🧠',
          '姜太公钓鱼，愿者上钩~ 🎋','钓到了一只... 鞋子？👟',
          '这条鱼说它还有bug要修 🐛🐟','空军的日常... 🌚',
          '大鱼！哎呀跑了... 🏃💨','鱼饵好像用完了... 🪱',
          '换一个钓点试试 🗺️','嘘... 别把鱼吓跑了 🤫',
          '今天的运气值+10！🍀','钓到了一只小虾米！🦐'
        ],
        // ========== v6 新增台词 ==========
        dice:[
          '来丢个色子看看运气！🎲','1-6随便选一个数字吧~ 🎯',
          '命运之骰，启动！⚡','转起来转起来！🌀',
          '相信概率的力量！📊','色子不会骗人的！（大概）😏',
          '抛出你的命运吧！🎲','叮！答案揭晓！🔔'
        ],
        decide:[
          '纠结什么呢？我来帮你！⚖️','交给我来做决定吧！🤔',
          '正在计算宇宙的意志... 🔮','答案即将揭晓... ⏳',
          '命运的硬币在空中翻转... 🪙','不用再纠结啦！✨',
          '相信直觉还是相信我？🤷‍♂️','决定了就是决定了！💪'
        ],
        music:[
          '让我想想今天适合听什么... 🎵','正在从我的曲库里挑选... 🎶',
          '这首歌超适合现在的氛围！🎧','听我的准没错！😎',
          '音乐是灵魂的食物~ 🍽️','这首会让你心情变好的！☀️',
          '发现一首宝藏歌曲！💎','戴上耳机享受吧~ 🎧'
        ]
      };
    
      // ========== 歌曲库 ==========
      const SONGS = [
        { name: '《晴天》- 周杰伦', mood: '🌤 温暖怀旧', genre: '流行' },
        { name: '《Bohemian Rhapsody》- Queen', mood: '🔥 史诗燃爆', genre: '摇滚' },
        { name: '《Lemon》- 米津玄师', mood: '💔 催泪神曲', genre: 'J-Pop' },
        { name: '《Shape of You》- Ed Sheeran', mood: '💃 轻松律动', genre: 'Pop' },
        { name: '《平凡之路》- 朴树', mood: '🛣️ 治愈公路', genre: '民谣' },
        { name: '《Nightcall》- Kavinsky', mood: '🌃 赛博朋克', genre: 'Synthwave' },
        { name: '《Canon in D》- Pachelbel', mood: '📖 古典优雅', genre: '古典' },
        { name: '《Starboy》- The Weeknd', mood: '🌆 都市夜行', genre: 'R&B' },
        { name: '《千本樱》- 初音未来', mood: '🎹 电子活力', genre: 'Vocaloid' },
        { name: '《Hotel California》- Eagles', mood: '🏜️ 经典不朽', genre: '摇滚' },
        { name: '《起风了》- 买辣椒也用券', mood: '🍃 青春飞扬', genre: '华语' },
        { name: '《Blinding Lights》- The Weeknd', mood: '🌙 迷幻霓虹', genre: 'Synth-pop' },
        { name: '《海阔天空》- Beyond', mood: '🕊️ 永恒经典', genre: '粤语摇滚' },
        { name: '《Summer》- Calvin Harris', mood: '☀️ 夏日阳光', genre: 'EDM' },
        { name: '《打上花火》- ssss', mood: '🎆 绚烂花火', genre: 'Vocaloid' },
        { name: '《Lost Frequencies》- Are You With Me', mood: '🌿 清新自然', genre: 'Deep House' },
        { name: '《前前前世》- RADWIMPS', mood: '💫 动漫神曲', genre: 'J-Rock' },
        { name: '《Fly Me to the Moon》- Frank Sinatra', mood: '🌙 浪漫爵士', genre: 'Jazz' },
        { name: '《孤勇者》- 陈奕迅', mood: '🔥 燃魂热血', genre: '华语' },
        { name: '《Cornfield Chase》- Tyrone', mood: '🌽 搞怪欢乐', genre: 'Soundtrack' }
      ];
    
      // ========== 创建 DOM ==========
      function createPetDOM(){
        const ex=document.getElementById('Yuze-desktop-pet');if(ex)ex.remove();
        const c=document.createElement('div');
        c.id='Yuze-desktop-pet';
        c.style.cssText=`position:fixed;z-index:2147483647;width:${CONFIG.normalSize}px;height:${CONFIG.normalSize}px;left:${currentX}px;top:${currentY}px;cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;filter:drop-shadow(0 3px 10px rgba(0,0,0,.15));transition:width .3s ease,height .3s ease,opacity .25s ease;`;
        c.innerHTML=`
    <svg id="pet-svg" viewBox="0 0 100 100" width="100%" height="100%" style="display:block;transition:transform .25s ease;">
    <defs>
    <radialGradient id="bodyGrad" cx="38%" cy="35%" r="65%"><stop offset="0%" stop-color="#FFD47F"/><stop offset="55%" stop-color="#F5A623"/><stop offset="100%" stop-color="#E08E0B"/></radialGradient>
    <radialGradient id="cheekGrad" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF8888" stop-opacity=".7"/><stop offset="100%" stop-color="#FF6666" stop-opacity="0"/></radialGradient>
    </defs>
    <!-- 小翅膀 -->
    <ellipse id="pet-wing-l" cx="14" cy="54" rx="9" ry="13" fill="#F5C56D" opacity=".6" transform="rotate(-20 14 54)" style="transition:all .3s ease"/>
    <ellipse id="pet-wing-r" cx="86" cy="54" rx="9" ry="13" fill="#F5C56D" opacity=".6" transform="rotate(20 86 54)" style="transition:all .3s ease"/>
    <!-- 身体 -->
    <ellipse id="pet-body-oval" cx="50" cy="52" rx="36" ry="34" fill="url(#bodyGrad)" style="transition:all .3s ease"/>
    <ellipse cx="50" cy="60" rx="22" ry="18" fill="#FFE8B0" opacity=".5"/>
    <!-- 耳朵 -->
    <ellipse id="pet-ear-l" cx="30" cy="19" rx="10" ry="12" fill="url(#bodyGrad)" transform="rotate(-18 30 19)" style="transition:all .3s ease"/>
    <ellipse cx="30" cy="21" rx="5" ry="6" fill="#FFDD99" opacity=".5" transform="rotate(-18 30 21)"/>
    <ellipse id="pet-ear-r" cx="70" cy="19" rx="10" ry="12" fill="url(#bodyGrad)" transform="rotate(18 70 19)" style="transition:all .3s ease"/>
    <ellipse cx="70" cy="21" rx="5" ry="6" fill="#FFDD99" opacity=".5" transform="rotate(18 70 21)"/>
    <!-- 脚 -->
    <ellipse id="pet-foot-l" cx="36" cy="83" rx="11" ry="7" fill="#E8940C" style="transition:all .3s ease"/><ellipse cx="36" cy="81" rx="6" ry="3" fill="#F5A623" opacity=".4"/>
    <ellipse id="pet-foot-r" cx="64" cy="83" rx="11" ry="7" fill="#E8940C" style="transition:all .3s ease"/><ellipse cx="64" cy="81" rx="6" ry="3" fill="#F5A623" opacity=".4"/>
    <!-- 手 -->
    <circle id="pet-hand-l" cx="17" cy="62" r="7.5" fill="url(#bodyGrad)" style="transition:all .3s ease"/>
    <circle id="pet-hand-r" cx="83" cy="62" r="7.5" fill="url(#bodyGrad)" style="transition:all .3s ease"/>
    
    <!-- ====== 动作道具 ====== -->
    
    <!-- 键盘（敲代码）-->
    <g id="prop-keyboard" style="display:none;transition:all .3s ease">
    <rect x="24" y="67" width="52" height="18" rx="3" fill="#2d2d2d" opacity=".9" stroke="#444" stroke-width=".5"/>
    <rect x="27" y="70" width="5" height="3" rx=".8" fill="#60a5fa"/><rect x="34" y="70" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="41" y="70" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/><rect x="48" y="70" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="55" y="70" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/><rect x="62" y="70" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="69" y="70" width="4" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="29" y="76" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/><rect x="36" y="76" width="5" height="3" rx=".8" fill="#4ade80"/>
    <rect x="43" y="76" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/><rect x="50" y="76" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="57" y="76" width="5" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/><rect x="64" y="76" width="5" height="3" rx=".8" fill="#f87171"/>
    <rect x="71" y="76" width="3" height="3" rx=".8" fill="#fff" stroke="#aaa" stroke-width=".3"/>
    <rect x="22" y="63" width="56" height="26" rx="4" fill="none" stroke="#60a5fa" stroke-width=".5" opacity=".3"/>
    </g>
    <g id="code-particles" style="display:none"></g>
    
    <!-- 画板+笔（画画）-->
    <g id="prop-canvas" style="display:none;transition:all .3s ease">
    <rect x="24" y="58" width="52" height="34" rx="4" fill="#fefefe" stroke="#ddd" stroke-width="1"/>
    <rect x="27" y="61" width="46" height="28" rx="2" fill="#fafafa"/>
    <g id="canvas-drawing">
    <circle cx="38" cy="72" r="6" fill="none" stroke="#f472b6" stroke-width="2" opacity=".7"/>
    <path d="M50 68 Q55 75 62 70" stroke="#60a5fa" stroke-width="2" fill="none" opacity=".7"/>
    <polygon points="58,78 63,86 53,84" fill="#34d399" opacity=".6"/>
    </g>
    <line x1="68" y1="82" x2="74" y2="70" stroke="#78716c" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="74" cy="69" r="2.5" fill="#fbbf24"/>
    </g>
    
    <!-- 钓竿（钓鱼）-->
    <g id="prop-fishing-rod" style="display:none;transition:all .3s ease">
    <path d="M76 22 Q85 42 96 56" stroke="#8B4513" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path id="fishing-line" d="M96 56 Q94 64 92 72" stroke="#888" stroke-width="1" fill="none"/>
    <ellipse id="bobber" cx="92" cy="73" rx="2.5" ry="3.5" fill="#f87171" style="transition:all .15s ease"/>
    <g id="fish-on-hook" style="display:none;transition:all .2s ease">
    <ellipse cx="92" cy="77" rx="6" ry="4" fill="#60a5fa"/>
    <circle cx="87" cy="76" r="1.5" fill="#fff"/>
    <path d="M97 77 L101 75 L101 79 Z" fill="#3b82f6"/>
    <ellipse cx="93" cy="78.5" rx="2" ry="1" fill="#93c5fd" opacity=".5"/>
    </g>
    <ellipse id="water-ripple" cx="92" cy="80" rx="0" ry="0" fill="none" stroke="#60a5fa" stroke-width="1" opacity="0" style="transition:all .4s ease"/>
    </g>
    
    <!-- ====== v6 新道具 ====== -->
    
    <!-- 色子（丢色子）-->
    <g id="prop-dice" style="display:none;transition:all .3s ease">
      <rect id="dice-body" x="32" y="28" width="36" height="36" rx="6" fill="#fff" stroke="#ddd" stroke-width="1.5"
        style="transform-origin:center;transition:transform .15s ease;"/>
      <!-- 色子点（默认显示1，运行时动态更新）-->
      <g id="dice-dots">
        <!-- 点1:中心 -->
        <circle cx="50" cy="46" r="3" fill="#333" class="dice-dot" data-face="1"/>
        <!-- 点2:左上+右下 -->
        <circle cx="40" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="2tl"/>
        <circle cx="60" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="2br"/>
        <!-- 点3:左上+中心+右下 -->
        <circle cx="40" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="3tl"/>
        <circle cx="50" cy="46" r="3" fill="#333" class="dice-dot" data-face="3c"/>
        <circle cx="60" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="3br"/>
        <!-- 点4:四角 -->
        <circle cx="40" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="4tl"/>
        <circle cx="60" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="4tr"/>
        <circle cx="40" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="4bl"/>
        <circle cx="60" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="4br"/>
        <!-- 点5:四角+中心 -->
        <circle cx="40" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="5tl"/>
        <circle cx="60" cy="36" r="2.8" fill="#333" class="dice-dot" data-face="5tr"/>
        <circle cx="50" cy="46" r="3" fill="#333" class="dice-dot" data-face="5c"/>
        <circle cx="40" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="5bl"/>
        <circle cx="60" cy="56" r="2.8" fill="#333" class="dice-dot" data-face="5br"/>
        <!-- 点6:三列两排 -->
        <circle cx="40" cy="35" r="2.8" fill="#333" class="dice-dot" data-face="6t1"/>
        <circle cx="40" cy="46" r="2.8" fill="#333" class="dice-dot" data-face="6m1"/>
        <circle cx="40" cy="57" r="2.8" fill="#333" class="dice-dot" data-face="6b1"/>
        <circle cx="60" cy="35" r="2.8" fill="#333" class="dice-dot" data-face="6t2"/>
        <circle cx="60" cy="46" r="2.8" fill="#333" class="dice-dot" data-face="6m2"/>
        <circle cx="60" cy="57" r="2.8" fill="#333" class="dice-dot" data-face="6b2"/>
      </g>
    </g>
    
    <!-- 决定硬币（做决定）-->
    <g id="prop-coin" style="display:none;transition:all .3s ease">
      <ellipse id="coin-body" cx="50" cy="42" rx="18" ry="18" fill="#FFD700" stroke="#DAA520" stroke-width="2"
        style="transform-origin:center;transition:transform .08s linear;"/>
      <text id="coin-text" x="50" y="47" text-anchor="middle" font-size="14" font-weight="bold"
        fill="#B8860B" style="font-family:ui-sans-serif,system-ui,sans-serif;">?</text>
    </g>
    
    <!-- 音符飘出（推荐歌曲）-->
    <g id="music-notes" style="display:none"></g>
    
    <!-- ====== 面部 ====== -->
    <ellipse id="pet-eye-white-l" cx="39" cy="46" rx="11" ry="12" fill="#FFF" stroke="#DDD" stroke-width=".5" style="transition:all .2s ease"/>
    <circle id="pet-pupil-l" cx="40" cy="47" r="6" fill="#3a2a0a" style="transition:all .12s ease"/>
    <circle id="pet-highlight-l" cx="42" cy="44.5" r="2.5" fill="#FFF" style="transition:all .12s ease"/>
    <circle cx="38" cy="48.5" r="1.2" fill="#FFF" opacity=".6"/>
    
    <ellipse id="pet-eye-white-r" cx="61" cy="46" rx="11" ry="12" fill="#FFF" stroke="#DDD" stroke-width=".5" style="transition:all .2s ease"/>
    <circle id="pet-pupil-r" cx="60" cy="47" r="6" fill="#3a2a0a" style="transition:all .12s ease"/>
    <circle id="pet-highlight-r" cx="58" cy="44.5" r="2.5" fill="#FFF" style="transition:all .12s ease"/>
    <circle cx="62" cy="48.5" r="1.2" fill="#FFF" opacity=".6"/>
    
    <ellipse id="pet-cheek-l" cx="26" cy="56" rx="7" ry="4.5" fill="url(#cheekGrad)" style="transition:opacity .25s ease"/>
    <ellipse id="pet-cheek-r" cx="74" cy="56" rx="7" ry="4.5" fill="url(#cheekGrad)" style="transition:opacity .25s ease"/>
    
    <g id="pet-mouth-group" style="transition:all .3s ease">
    <path id="pet-mouth-path" d="M45 60 Q50 64 55 60" fill="none" stroke="#5a3a0a" stroke-width="2.2" stroke-linecap="round" style="transition:all .3s ease"/>
    </g>
    <circle cx="50" cy="55" r="1.8" fill="#E8940C" opacity=".5"/>
    </svg>
    
    <!-- 大号结果显示（色子/决定/歌曲共用）-->
    <div id="pet-result-display" style="position:absolute;display:none;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
      border-radius:14px;padding:12px 18px;color:#fff;font-size:20px;font-weight:700;
      white-space:nowrap;bottom:calc(100% + 12px);left:50%;transform:translateX(-50%);
      box-shadow:0 6px 24px rgba(102,126,234,.4);pointer-events:none;font-family:ui-sans-serif,system-ui,sans-serif;
      line-height:1.4;text-align:center;min-width:80px;z-index:10;"></div>
    
    <!-- 气泡 -->
    <div id="pet-bubble" style="position:absolute;display:none;background:#fff;border:1.5px solid rgba(0,0,0,.1);border-radius:10px;padding:6px 11px;font-size:11.5px;color:#444;white-space:nowrap;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:7px;box-shadow:0 2px 10px rgba(0,0,0,.1);pointer-events:none;font-weight:500;line-height:1.4;max-width:220px;"></div>
    <div id="pet-bubble-arrow" style="position:absolute;display:none;bottom:calc(100%+5px);left:50%;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:5.5px solid #fff;"></div>
    
    <!-- 屏幕涂鸦层 -->
    <canvas id="pet-doodle-canvas" style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:2147483646;pointer-events:none;display:none;"></canvas>
    
    <!-- 最小化指示 -->
    <div id="pet-mini-dot" style="position:absolute;display:none;width:7px;height:7px;background:#F5A623;border-radius:50%;top:4px;right:4px;box-shadow:0 0 5px rgba(0,0,0,.15);"></div>
    `;
    
        document.body.appendChild(c);
        return c;
      }
    
      // ========== 右键菜单 ==========
      let menuVisible=false;
      function createContextMenu(){
        if(document.getElementById('pet-context-menu'))return;
        const m=document.createElement('div');
        m.id='pet-context-menu';
        m.style.cssText=`position:fixed;z-index:2147483648;display:none;min-width:175px;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:12px;padding:5px 0;box-shadow:0 8px 28px rgba(0,0,0,.16);font-size:12.5px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;`;
        const items=[
          {label:isMini?'🔍 展开':'📦 最小化',action:()=>toggleMini()},
          {label:'💬 和它聊天',action:()=>{setState(STATES.HAPPY);showBubble(pick(DIALOGUES.happy));}},
          {label:'---',action:null},
          {label:'⌨️ 敲代码',action:()=>startAction(STATES.TYPE)},
          {label:'🎨 屏幕画画',action:()=>startAction(STATES.DRAW)},
          {label:'🎣 钓鱼',action:()=>startAction(STATES.FISH)},
          {label:'---',action:null},
          {label:'🎲 丢色子',action:()=>startAction(STATES.DICE)},
          {label:'⚖️ 帮我做决定',action:()=>startAction(STATES.DECIDE)},
          {label:'🎵 推荐歌曲',action:()=>startAction(STATES.MUSIC)},
          {label:'---',action:null},
          {label:'😴 去睡觉',action:()=>setState(STATES.SLEEP)},
          {label:'🎲 随机移动',action:()=>randomMove()},
          {label:'📍 贴边停靠',action:()=>dockToEdge()},
          {label:'---',action:null},
          {label:'❌ 关闭桌宠',action:()=>destroyPet()}
        ];
        items.forEach(item=>{
          if(item.label==='---'){const d=document.createElement('d');d.style.cssText='height:1px;background:rgba(0,0,0,.06);margin:4px 10px;';m.appendChild(d);return;}
          const el=document.createElement('div');el.textContent=item.label;
          el.style.cssText='padding:7px 16px;cursor:pointer;color:#444;transition:background .15s;';
          el.addEventListener('mouseenter',()=>el.style.background='rgba(0,0,0,.05)');
          el.addEventListener('mouseleave',()=>el.style.background='transparent');
          el.addEventListener('click',()=>{hideMenu();item.action&&item.action();});
          m.appendChild(el);
        });
        document.body.appendChild(m);
        document.addEventListener('click',()=>{if(menuVisible)hideMenu();},true);
      }
      function refreshMenuLabel(){const m=document.getElementById('pet-context-menu');if(m){m.remove();menuVisible=false;createContextMenu();}}
      function showMenu(x,y){refreshMenuLabel();const m=document.getElementById('pet-context-menu');if(!m)return;m.style.display='block';m.style.left=Math.min(x,window.innerWidth-195)+'px';m.style.top=Math.min(y,window.innerHeight-320)+'px';menuVisible=true;}
      function hideMenu(){const m=document.getElementById('pet-context-menu');if(m)m.style.display='none';menuVisible=false;}
    
      function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
    
      // ========== 最小化 ==========
      function toggleMini(){
        isMini=!isMini;
        const pet=document.getElementById('Yuze-desktop-pet');
        const dot=document.getElementById('pet-mini-dot');
        if(isMini){
          pet.style.width=CONFIG.miniSize+'px';pet.style.height=CONFIG.miniSize+'px';
          pet.style.opacity='.72';pet.style.cursor='pointer';
          dot.style.display='block';endAction();
          showBubble('最小化了~ 点我展开 📦');setTimeout(()=>hideBubble(),1800);
        }else{
          pet.style.width=CONFIG.normalSize+'px';pet.style.height=CONFIG.normalSize+'px';
          pet.style.opacity='1';pet.style.cursor='grab';
          dot.style.display='none';
          showBubble('展开啦！✨');setTimeout(()=>hideBubble(),1200);
        }
        refreshMenuLabel();
      }
    
      function dockToEdge(){
        const sz=isMini?CONFIG.miniSize:CONFIG.normalSize,pad=CONFIG.dockPadding;
        const cx=currentX+sz/2,cy=currentY+sz/2;
        const dists=[{d:cx,fn:()=>{currentX=pad;}},{d:window.innerWidth-cx,fn:()=>{currentX=window.innerWidth-sz-pad;}},{d:cy,fn:()=>{currentY=pad;}},{d:window.innerHeight-cy,fn:()=>{currentY=window.innerHeight-sz-pad;}}];
        dists.sort((a,b)=>a.d-bd);dists[0].fn();
        updatePosition(true);showBubble('已停靠 📍');setTimeout(()=>hideBubble(),1200);
      }
    
      // ========== 道具控制 ==========
      function showProp(id){['prop-keyboard','prop-canvas','prop-fishing-rod','prop-dice','prop-coin','music-notes'].forEach(pid=>{const el=document.getElementById(pid);if(el)el.style.display=(pid===id)?'block':'none';});}
      function hideAllProps(){
        ['prop-keyboard','prop-canvas','prop-fishing-rod','prop-dice','prop-coin','music-notes'].forEach(pid=>{const el=document.getElementById(pid);if(el)el.style.display='none';});
        const fish=document.getElementById('fish-on-hook'),fe=document.getElementById('fish-eye');
        if(fish)fish.style.display='none';
        const dc=document.getElementById('pet-doodle-canvas');
        if(dc){dc.style.display='none';const ctx=dc.getContext('2d');if(ctx)ctx.clearRect(0,0,dc.width,dc.height);}
        const rd=document.getElementById('pet-result-display');if(rd)rd.style.display='none';
      }
    
      // ========== 结果大字显示 ==========
      function showResult(text,color){
        const el=document.getElementById('pet-result-display');
        if(el){el.innerHTML=text.replace(/\n/g,'<br>');el.style.display='block';if(color)el.style.background=color;}
      }
      function hideResult(){
        const el=document.getElementById('pet-result-display');if(el)el.style.display='none';
      }
    
      // ========== 色子点显隐 ==========
      function setDiceDots(face){
        const dots=document.querySelectorAll('.dice-dot');
        dots.forEach(dot=>{
          const f=dot.getAttribute('data-face')||'';
          let show=false;
          switch(face){
            case 1: show=f==='1';break;
            case 2: show=f.startsWith('2');break;
            case 3: show=f.startsWith('3');break;
            case 4: show=f.startsWith('4');break;
            case 5: show=f.startsWith('5');break;
            case 6: show=f.startsWith('6');break;
          }
          dot.setAttribute('fill',show?'#333':'#FFE8B0');
          dot.setAttribute('opacity',show?1:0);
        });
      }
    
      // ========== 动作系统 ==========
      function startAction(actionState){
        if(isMini||isDragging)return;
        endAction();
        setState(actionState);
    
        switch(actionState){
    
          // ========== ⌨️ 敲代码 ==========
          case STATES.TYPE:{
            showProp('prop-keyboard');
            showBubble(pick(DIALOGUES.type));
            const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
            if(hl)hl.setAttribute('transform','translate(14,8)');
            if(hr)hr.setAttribute('translate','translate(-14,8)');
            let tc=0;
            const ti=setInterval(()=>{
              if(state!==STATES.TYPE||tc>8){clearInterval(ti);return;}
              const lo=tc%2===0?0:2,ro=tc%2===1?0:2;
              if(hl)hl.setAttribute('transform',`translate(${14-lo},${8+lo})`);
              if(hr)hr.setAttribute('translate',`translate(${-14+ro},${8+ro})`);
              tc++;if(tc===4)showBubble(pick(DIALOGUES.type));
            },350);
            actionTimer=setTimeout(()=>{clearInterval(ti);endAction();showBubble('代码写完了！提交！🚀');setTimeout(()=>hideBubble(),2000);},4000);
            break;
          }
    
          // ========== 🎨 画画 ==========
          case STATES.DRAW:{
            showProp('prop-canvas');
            showBubble(pick(DIALOGUES.draw));
            const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
            if(hr)hr.setAttribute('transform','translate(-10,-2)');
            const canvas=document.getElementById('pet-doodle-canvas');
            if(canvas){
              canvas.width=window.innerWidth;canvas.height=window.innerHeight;canvas.style.display='block';
              const ctx=canvas.getContext('2d');
              ctx.strokeStyle=['#F5A623','#60a5fa','#f472b6','#34d399','#fbbf24','#a78bfa'][Math.floor(Math.random()*6)];
              ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';
              let drawing=true,px=Math.random()*canvas.width*.6+canvas.width*.2,py=Math.random()*canvas.height*.5+canvas.height*.25,step=0,maxSteps=40+Math.floor(Math.random()*30);
              const di=setInterval(()=>{
                if(!drawing||step>=maxSteps){clearInterval(di);return;}
                const nx=px+(Math.random()-.5)*80,ny=py+(Math.random()-.5)*60;
                ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(nx,ny);ctx.stroke();px=nx;py=ny;step++;
                if(step%15===0)showBubble(pick(DIALOGUES.draw));
              },120);
              actionTimer=setTimeout(()=>{
                drawing=false;clearInterval(di);
                let a=1;const fi=setInterval(()=>{a-=.05;canvas.style.opacity=a;if(a<=0){clearInterval(fi);canvas.style.display='none';canvas.style.opacity='1';}},50);
                endAction();showBubble('画完了！怎么样？好看吗？🖼️');setTimeout(()=>hideBubble(),2500);
              },6000);
            }
            break;
          }
    
          // ========== 🎣 钓鱼 ==========
          case STATES.FISH:{
            showProp('prop-fishing-rod');
            showBubble(pick(DIALOGUES.fish));
            const rod=document.getElementById('prop-fishing-rod');
            let sc=0;
            const si=setInterval(()=>{
              if(state!==STATES.FISH||sc>20){clearInterval(si);return;}
              if(rod)rod.style.transform=`rotate(${Math.sin(sc*.5)*3}deg)`;sc++;
              if(sc===8)showBubble(pick(DIALOGUES.fish));
            },300);
            const willCatch=Math.random()>.4;
            actionTimer=setTimeout(()=>{
              clearInterval(si);if(rod)rod.style.transform='';
              if(willCatch){
                const fish=document.getElementById('fish-on-hook');
                if(fish)fish.style.display='block';
                showBubble('哇！！钓到了一条鱼！！🐟🎉');
                let bc=0;const bi=setInterval(()=>{bc++;
                  const fEl=document.getElementById('fish-on-hook');
                  if(fEl)fEl.querySelector('ellipse').setAttribute('cy',77+(bc%2===0?-3:3));
                  if(bc>8){clearInterval(bi);const fE=document.getElementById('fish-on-hook');if(fE){const e=fE.querySelector('ellipse');if(e)e.setAttribute('cy','77');}}
                },150);
              }else{
                showBubble('没钓到...下次一定！🎣💦');
              }
              setTimeout(()=>{endAction();hideBubble();},3000);
            },5000);
            break;
          }
    
          // ========== 🎲 丢色子（v6新）==========
          case STATES.DICE:{
            showProp('prop-dice');
            showBubble(pick(DIALOGUES.dice));
            const diceBody=document.getElementById('dice-body');
            const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
            // 手举起色子
            if(hl)hl.setAttribute('transform','translate(-6,-12)');
            if(hr)hr.setAttribute('transform','translate(6,-12)');
            
            // 先快速随机翻滚
            let rollCount=0;
            const maxRolls=12+Math.floor(Math.random()*8);
            const ri=setInterval(()=>{
              if(state!==STATES.DICE||rollCount>=maxRolls){clearInterval(ri);return;}
              rollCount++;
              const fakeFace=Math.ceil(Math.random()*6);
              setDiceDots(fakeFace);
              // 旋转动画
              const rot=rollCount*360+(Math.random()*270);
              const scale=1+Math.sin(rollCount*.8)*.15;
              if(diceBody)diceBody.setAttribute('transform',`rotate(${rot}deg) scale(${scale})`);
              // 换台词
              if(rollCount===Math.floor(maxRolls*.4))showBubble(pick(DIALOGUES.dice));
            },80);
    
            // 最终停止
            actionTimer=setTimeout(()=>{
              clearInterval(ri);
              const finalFace=Math.ceil(Math.random()*6);
              setDiceDots(finalFace);
              if(diceBody)diceBody.setAttribute('transform','rotate(0deg) scale(1.2)');
              
              // 大字显示结果
              setTimeout(()=>{
                showResult('🎲 '+finalFace+' 点！','linear-gradient(135deg,#f093fb 0%,#f5576c 100%)');
                
                // 根据点数给不同评价
                const comments={
                  1:'最小点！但1也是幸运数字~ ✨',
                  2:'两点！稳扎稳打！🐢',
                  3:'三点！不好不坏~ 😊',
                  4:'四点！中规中矩！👍',
                  5:'五点！运气不错！🌟',
                  6:'六点！！最大点！！🎉🎉🎉 大吉大利！'
                };
                showBubble(comments[finalFace]);
                
                // 庆祝动画：手举高
                if(hl)hl.setAttribute('transform','translate(-8,-16) rotate(-20)');
                if(hr)hr.setAttribute('transform','translate(8,-16) rotate(20)');
                
                setTimeout(()=>{
                  hideResult();endAction();hideBubble();
                },3500);
              },300);
            },maxRolls*80+200);
            break;
          }
    
          // ========== ⚖️ 做决定（v6新）==========
          case STATES.DECIDE:{
            showProp('prop-coin');
            showBubble(pick(DIALOGUES.decide));
            const coinBody=document.getElementById('coin-body');
            const coinText=document.getElementById('coin-text');
            const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
            // 手托着硬币
            if(hl)hl.setAttribute('transform','translate(-4,-6)');
            if(hr)hr.setAttribute('translate','translate(4,-6)');
            
            // 硬币翻转动画
            let flipCount=0;
            const maxFlips=16+Math.floor(Math.random()*12);
            const fi=setInterval(()=>{
              if(state!==STATES.DECIDE||flipCount>=maxFlips){clearInterval(fi);return;}
              flipCount++;
              const angle=flipCount*24*(flipCount%2===0?1:-1);
              const scaleX=flipCount%2===0?1:.3;
              if(coinBody)coinBody.setAttribute('transform',`rotate(${angle}deg) scaleX(${scaleX})`);
              if(coinText)coinText.textContent=flipCount%2===0?'正':'反';
              if(flipCount===Math.floor(maxFlips*.45))showBubble(pick(DIALOGUES.decide));
            },50);
    
            // 最终结果
            actionTimer=setTimeout(()=>{
              clearInterval(fi);
              const rand=Math.random();
              let result,text,color;
              if(rand<.33){
                result='✅ 做！';text=pick(['去做吧！机会难得！🏃','冲就完事了！💪','当然要做！别犹豫！🎯','YES！支持你！👍','去做！做了就不后悔！✨']);
                color='linear-gradient(135deg,#11998e 0%,#38ef7d 100%)';
                if(coinText)coinText.textContent='✓';
              }else if(rand<.66){
                result='❌ 不做';text=pick(['算了，下次再说吧~ 🤷','不做也行，休息一下 😌','这次就算了吧 🏳️','NO！相信直觉！🚫','先放一放，不急~ ☕']);
                color='linear-gradient(135deg,#eb3349 0%,#f45c43 50%,#ff6b22 100%)';
                if(coinText)coinText.textContent='✗';
              }else{
                result='🤔 看心情';text=pick(['随缘吧~ 佛系决定 🧘','看心情！开心就好 😄','抛个硬...哦已经抛完了 🤪','MAYBE！再问一次？🔄','交给宇宙吧~ 🌌']);
                color='linear-gradient(135deg,#667eea 0%,#764ba2 100%)';
                if(coinText)coinText.textContent='~';
              }
              if(coinBody)coinBody.setAttribute('transform','rotate(0deg) scaleX(1)');
              
              // 大字显示
              setTimeout(()=>{
                showResult(result,color);
                showBubble(text);
                
                // 表情配合
                if(rand<.33){
                  // 正面表情
                  const svg=document.getElementById('pet-svg');
                  if(svg)svg.setAttribute('transform','scale(1.1) translate(-3,-3)');
                }else if(rand<.66){
                  // 思考/摇头
                  const mouthPath=document.getElementById('pet-mouth-path');
                  if(mouthPath)mouthPath.setAttribute('d','M46 62 L54 62');
                }
                
                setTimeout(()=>{hideResult();endAction();hideBubble();},3500);
              },250);
            },maxFlips*50+300);
            break;
          }
    
          // ========== 🎵 推荐歌曲（v6新）==========
          case STATES.MUSIC:{
            showProp('music-notes');
            showBubble(pick(DIALOGUES.music));
            const notesContainer=document.getElementById('music-notes');
            const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
            // 戴耳机姿势（手放在耳朵旁）
            if(hl)hl.setAttribute('transform','translate(-8,-4) rotate(-15)');
            if(hr)hr.setAttribute('translate','translate(8,-4) rotate(15)');
            
            // 音符飘出动画
            if(notesContainer){
              notesContainer.innerHTML='';
              const noteSymbols=['♪','♫','♬','♩','🎵','🎶'];
              const noteColors=['#f472b6','#60a5fa','#34d399','#fbbf24','#a78bfa','#f87171'];
              for(let i=0;i<6;i++){
                const note=document.createElementNS('http://www.w3.org/2000/svg','text');
                note.setAttribute('x',20+i*12);
                note.setAttribute('y',30-Math.abs(i-2.5)*8);
                note.setAttribute('font-size',14+i);
                note.setAttribute('fill',noteColors[i%noteColors.length]);
                note.setAttribute('style',`opacity:0;transition:all .4s ease ${i*.1}s;`);
                note.textContent=noteSymbols[i%noteSymbols.length];
                notesContainer.appendChild(note);
                // 延迟显示
                setTimeout(()=>{note.setAttribute('opacity','.8');},100+i*150);
                // 上浮消失
                setTimeout(()=>{
                  note.setAttribute('transform',`translate(0,-${20+i*5})`);
                  note.setAttribute('opacity','0');
                },800+i*200);
              }
            }
            
            // 选歌
            actionTimer=setTimeout(()=>{
              const song=pick(SONGS);
              // 大字显示歌曲名
              showResult(`🎵 ${song.name}`,'linear-gradient(135deg,#a18cd1 0%,#fbc2eb 100%)');
              showBubble(`${song.mood}\n${song.genre}`);
              
              // 听歌摇摆动画
              const svg=document.getElementById('pet-svg');
              let swayCount=0;
              const swayInt=setInterval(()=>{
                swayCount++;
                if(swayCount>10||state!==STATES.MUSIC){clearInterval(swayInt);if(svg)svg.setAttribute('transform','');return;}
                if(svg)svg.setAttribute('transform',`rotate(${Math.sin(swayCount*.6)*5}deg) translate(0,${Math.sin(swayCount*.8)*2})`);
              },150);
              
              setTimeout(()=>{
                clearInterval(swayInt);
                if(svg)svg.setAttribute('transform','');
                hideResult();endAction();hideBubble();
              },4500);
            },1500);
            break;
          }
        }
      }
    
      function endAction(){
        if(actionTimer)clearTimeout(actionTimer);
        hideAllProps();
        hideResult();
        const hl=document.getElementById('pet-hand-l'),hr=document.getElementById('pet-hand-r');
        if(hl)hl.setAttribute('transform','');
        if(hr)hr.setAttribute('transform','');
        const svg=document.getElementById('pet-svg');
        if(svg)svg.setAttribute('transform','');
        if(state!==STATES.IDLE&&state!==STATES.SLEEP&&state!==STATES.HAPPY){
          setState(STATES.IDLE);
        }
        startIdleBehavior();
      }
    
      // ========== 状态渲染 ==========
      function setState(newState){
        state=newState;renderState();
      }
    
      function renderState(){
        const svg=document.getElementById('pet-svg');
        const bodyOval=document.getElementById('pet-body-oval');
        const eyeWL=document.getElementById('pet-eye-white-l'),eyeWR=document.getElementById('pet-eye-white-r');
        const pupilL=document.getElementById('pet-pupil-l'),pupilR=document.getElementById('pet-pupil-r');
        const hlL=document.getElementById('pet-highlight-l'),hlR=document.getElementById('pet-highlight-r');
        const cheekL=document.getElementById('pet-cheek-l'),cheekR=document.getElementById('pet-cheek-r');
        const mouthPath=document.getElementById('pet-mouth-path');
        const handL=document.getElementById('pet-hand-l'),handR=document.getElementById('pet-hand-r');
        const wingL=document.getElementById('pet-wing-l'),wingR=document.getElementById('pet-wing-r');
    
        svg.setAttribute('transform','');bodyOval.setAttribute('rx','36');bodyOval.setAttribute('ry','34');
        eyeWL.setAttribute('rx','11');eyeWL.setAttribute('ry','12');eyeWR.setAttribute('rx','11');eyeWR.setAttribute('ry','12');
        pupilL.setAttribute('r','6');pupilL.setAttribute('cy','47');pupilR.setAttribute('r','6');pupilR.setAttribute('cy','47');
        hlL.setAttribute('opacity','1');hlR.setAttribute('opacity','1');
        pupilL.setAttribute('transform','');pupilR.setAttribute('transform','');
        cheekL.setAttribute('opacity','.6');cheekR.setAttribute('opacity','.6');
        mouthPath.setAttribute('d','M45 60 Q50 64 55 60');mouthPath.setAttribute('stroke','#5a3a0a');mouthPath.setAttribute('fill','none');
        handL.setAttribute('transform','');handR.setAttribute('transform','');
        wingL.setAttribute('opacity','.6');wingR.setAttribute('opacity','.6');
    
        switch(state){
          case STATES.HAPPY:
            svg.setAttribute('transform','scale(1.08) translate(-4,-4)');
            eyeWL.setAttribute('ry','3');eyeWL.setAttribute('cy','47');eyeWR.setAttribute('ry','3');eyeWR.setAttribute('cy','47');
            pupilL.setAttribute('r','4');pupilL.setAttribute('cy','47');pupilR.setAttribute('r','4');pupilR.setAttribute('cy','47');
            hlL.setAttribute('opacity','0');hlR.setAttribute('opacity','0');
            cheekL.setAttribute('opacity','1');cheekR.setAttribute('opacity','1');
            mouthPath.setAttribute('d','M43 59 Q50 67 57 59 Z');mouthPath.setAttribute('fill','#5a3a0a');mouthPath.setAttribute('stroke','#5a3a0a');
            handL.setAttribute('transform','translate(-4,-8)');handR.setAttribute('translate','translate(4,-8)');
            wingL.setAttribute('opacity','.85');wingR.setAttribute('opacity','.85');
            setTimeout(()=>{if(state===STATES.HAPPY)setState(STATES.IDLE);},1400);
            break;
          case STATES.SLEEP:
            svg.setAttribute('transform','scale(.95) translate(2.5,2.5)');
            eyeWL.setAttribute('ry','1.5');eyeWL.setAttribute('cy','47');eyeWR.setAttribute('ry','1.5');eyeWR.setAttribute('cy','47');
            pupilL.setAttribute('opacity','0');pupilR.setAttribute('opacity','0');hlL.setAttribute('opacity','0');hlR.setAttribute('opacity','0');
            mouthPath.setAttribute('d','M47 61 Q50 63 53 61');
            showBubble('Z z z... 😴');setTimeout(()=>hideBubble(),2200);
            break;
          case STATES.TYPE:
            svg.setAttribute('transform','scale(1.02) translate(-1,-1)');
            pupilL.setAttribute('transform','translate(1.5,2)');pupilR.setAttribute('translate','-1.5,2)');
            if(hlL)hlL.setAttribute('transform','translate(0.6,0.8)');if(hlR)hlR.setAttribute('transform','translate(-0.6,0.8)');
            mouthPath.setAttribute('d','M46 60 Q50 63 54 60');break;
          case STATES.DRAW:
            svg.setAttribute('transform','scale(1.03) translate(-1.5,-1)');
            pupilL.setAttribute('transform','translate(2,1)');pupilR.setAttribute('transform',"translate(-2,1)");
            if(hlL)hlL.setAttribute('transform','translate(0.8,0.4)');if(hlR)hlR.setAttribute('transform','translate(-0.8,0.4)');
            mouthPath.setAttribute('d','M44 59 Q50 65 56 59');cheekL.setAttribute('opacity','.9');cheekR.setAttribute('opacity','.9');break;
          case STATES.FISH:
            svg.setAttribute('transform','scale(1) rotate(-3 50 50)');
            pupilL.setAttribute('transform','translate(0,3)');pupilR.setAttribute('translate(','0,3)');
            if(hlL)hlL.setAttribute('transform','translate(0,1.2)');if(hlR)hlR.setAttribute('transform','translate(0,1.2)');
            mouthPath.setAttribute('d','M47 61 Q50 63 53 61');break;
          case STATES.THINK:
            showBubble(pick(['Hmm... 🤔','让我想想... 💭','有个想法！💡','等等...我想到一个绝妙的点子！✨']));
            setTimeout(()=>hideBubble(),2200);break;
          // v6 新状态渲染
          case STATES.DICE:
            svg.setAttribute('transform','scale(1.04) translate(-1.5,-1)');
            pupilL.setAttribute('transform','translate(1,2)');pupilR.setAttribute('transform',"translate(-1,2)");
            mouthPath.setAttribute('d','M44 59 Q50 64 56 59');cheekL.setAttribute('opacity','.85');cheekR.setAttribute('opacity','.85');break;
          case STATES.DECIDE:
            svg.setAttribute('transform','scale(1.03) translate(-1,-1)');
            pupilL.setAttribute('transform','translate(0,2.5)');pupilR.setAttribute('transform',"translate(0,2.5)");
            mouthPath.setAttribute('d','M46 61 Q50 63 54 61');break;
          case STATES.MUSIC:
            // 轻微摇摆
            pupilL.setAttribute('transform','translate(1,1)');pupilR.setAttribute('transform',"translate(-1,1)");
            mouthPath.setAttribute('d','M44 58 Q50 65 56 58');mouthPath.setAttribute('stroke-width','2.5');
            cheekL.setAttribute('opacity','1');cheekR.setAttribute('opacity','1');break;
        }
      }
    
      // ========== 气泡 ==========
      function showBubble(text){
        const b=document.getElementById('pet-bubble'),a=document.getElementById('pet-bubble-arrow');
        if(b&&a){b.innerHTML=text.replace(/\n/g,'<br>');b.style.display='block';a.style.display='block';}
      }
      function hideBubble(){
        const b=document.getElementById('pet-bubble'),a=document.getElementById('pet-bubble-arrow');
        if(b)b.style.display='none';if(a)a.style.display='none';
      }
    
      // ========== 移动 ==========
      function randomMove(){
        if(isDragging||isMini)return;endAction();setState(STATES.WALK);
        const sz=CONFIG.normalSize,margin=30;
        const maxX=window.innerWidth-sz-margin,maxY=window.innerHeight-sz-margin;
        currentX=margin+Math.random()*Math.max(1,maxX-margin);
        currentY=margin+Math.random()*Math.max(1,maxY-margin);
        updatePosition(true);showBubble('溜达一下~ 🚶');
        clearTimeout(walkTimer);
        walkTimer=setTimeout(()=>{hideBubble();setState(STATES.IDLE);startIdleBehavior();},1000);
      }
    
      function updatePosition(animated){
        const p=document.getElementById('Yuze-desktop-pet');if(!p)return;
        p.style.left=currentX+'px';p.style.top=currentY+'px';
      }
    
      // ========== 待机行为 ==========
      function startIdleBehavior(){
        stopIdleBehavior();
        idleTimer=setInterval(()=>{
          if(state!==STATES.IDLE||isDragging||isMini)return;
          const r=Math.random();
          if(r<.10){randomMove();}
          else if(r<.20){
            // 随机触发一个动作（包含新的三个）
            const actions=[STATES.TYPE,STATES.DRAW,STATES.FISH,STATES.DICE,STATES.DECIDE,STATES.MUSIC];
            startAction(pick(actions));
          }
          else if(r<.38){showBubble(pick(DIALOGUES.idle));setTimeout(()=>hideBubble(),2500);}
          else if(r<.50){blinkEyes();}
        },CONFIG.idleInterval);
      }
      function stopIdleBehavior(){
        if(idleTimer)clearInterval(idleTimer);
        if(walkTimer)clearTimeout(walkTimer);
        if(actionTimer)clearTimeout(actionTimer);
      }
    
      // ========== 眨眼 ==========
      function blinkEyes(){
        const pl=document.getElementById('pet-pupil-l'),pr=document.getElementById('pet-pupil-r');
        const hll=document.getElementById('pet-highlight-l'),hlr=document.getElementById('pet-highlight-r');
        if(pl&&pr){pl.setAttribute('transform','scaleY(0.1)');pr.setAttribute('transform','scaleY(0.1)');if(hll)hll.setAttribute('opacity','0');if(hlr)hlr.setAttribute('opacity','0');
          setTimeout(()=>{pl.setAttribute('transform','');pr.setAttribute('transform','');if(hll)hll.setAttribute('opacity','1');if(hlr)hlr.setAttribute('opacity','1');},120);}
      }
      function startAutoBlink(){
        blinkTimer=setInterval(()=>{if(state!==STATES.SLEEP&&!isDragging)blinkEyes();},4000+Math.random()*3000);
      }
    
      // ========== 拖拽系统 ==========
      function bindEvents(pet){
        pet.addEventListener('pointerdown',(e)=>{
          if(e.button===2)return;e.preventDefault();pet.setPointerCapture(e.pointerId);
          isDragging=false;dragStartX=e.clientX;dragStartY=e.clientY;petStartX=currentX;petStartY=currentY;
          pet.style.transition='width .3s ease,height .3s ease,opacity .25s ease';pet.style.cursor='grabbing';
          const onMove=(me)=>{
            const dx=me.clientX-dragStartX,dy=me.clientY-dragStartY;
            if(Math.abs(dx)>3||Math.abs(dy)>3)isDragging=true;
            if(isDragging){currentX=petStartX+dx;currentY=petStartY+dy;
              const sz=isMini?CONFIG.miniSize:CONFIG.normalSize;
              currentX=Math.max(0,Math.min(window.innerWidth-sz,currentX));currentY=Math.max(0,Math.min(window.innerHeight-sz,currentY));
              updatePosition(false);}
          };
          const onUp=(ue)=>{
            pet.releasePointerCapture(ue.pointerId);pet.removeEventListener('pointermove',onMove);
            pet.removeEventListener('pointerup',onUp);pet.removeEventListener('pointercancel',onUp);
            pet.style.cursor=isMini?'pointer':'grab';
            if(!isDragging){if(isMini){toggleMini();}else{endAction();setState(STATES.HAPPY);showBubble(pick(DIALOGUES.happy));setTimeout(()=>hideBubble(),2000);}}
            else{/* ★ v5/v6: 松手停在原地，不再强制贴边 */}
            isDragging=false;startIdleBehavior();
          };
          pet.addEventListener('pointermove',onMove);pet.addEventListener('pointerup',onUp);pet.addEventListener('pointercancel',onUp);
        });
    
        pet.addEventListener('dblclick',(e)=>{e.preventDefault();if(!isDragging)toggleMini();});
        pet.addEventListener('contextmenu',(e)=>{e.preventDefault();e.stopPropagation();showMenu(e.clientX,e.clientY);});
    
        // 鼠标跟随眼睛（限制范围）
        document.addEventListener('mousemove',(e)=>{
          if(state===STATES.SLEEP||isMini)return;
          const rect=pet.getBoundingClientRect();
          const cx=rect.left+rect.width/2,cy=rect.top+rect.height*.42;
          const dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.sqrt(dx*dx+dy*dy)||1;
          const mo=CONFIG.pupilMaxOffset;
          let mx=(dx/dist)*Math.min(dist*.02,mo),my=(dy/dist)*Math.min(dist*.02,mo);
          mx=Math.max(-mo,Math.min(mo,mx));my=Math.max(-mo,Math.min(my,my));
          const pl=document.getElementById('pet-pupil-l'),pr=document.getElementById('pet-pupil-r');
          const hll=document.getElementById('pet-highlight-l'),hlr=document.getElementById('pet-highlight-r');
          if(pl&&pr){pl.setAttribute('transform',`translate(${mx},${my})`);pr.setAttribute('transform',`translate(${mx},${my})`);
            if(hll)hll.setAttribute('transform',`translate(${mx*.4},${my*.4})`);if(hlr)hlr.setAttribute('transform',`translate(${mx*.4},${my*.4})`);}
        });
    
        window.addEventListener('resize',()=>{
          const sz=isMini?CONFIG.miniSize:CONFIG.normalSize;
          currentX=Math.max(0,Math.min(window.innerWidth-sz,currentX));currentY=Math.max(0,Math.min(window.innerHeight-sz,currentY));
          updatePosition(false);
          const dc=document.getElementById('pet-doodle-canvas');if(dc){dc.width=window.innerWidth;dc.height=window.innerHeight;}
        });
      }
    
      function dockToNearestEdge(){
        const sz=isMini?CONFIG.miniSize:CONFIG.normalSize,pad=CONFIG.dockPadding;
        const cx=currentX+sz/2,cy=currentY+sz/2;
        const dists=[{d:cx,fn:()=>{currentX=pad;}},{d:window.innerWidth-cx,fn:()=>{currentX=window.innerWidth-sz-pad;}},{d:cy,fn:()=>{currentY=pad;}},{d:window.innerHeight-cy,fn:()=>{currentY=window.innerHeight-sz-pad;}}];
        dists.sort((a,b)=>a.d-bd);dists[0].fn();updatePosition(true);
      }
    
      // ========== 销毁 ==========
      function destroyPet(){
        stopIdleBehavior();if(blinkTimer)clearInterval(blinkTimer);
        const pet=document.getElementById('Yuze-desktop-pet');
        if(pet){pet.style.transform='scale(0)';pet.style.opacity='0';pet.style.transition='all .35s ease';setTimeout(()=>pet.remove(),350);}
        const m=document.getElementById('pet-context-menu');if(m)m.remove();
        const dc=document.getElementById('pet-doodle-canvas');if(dc)dc.remove();
      }
    
      // ========== 初始化 ==========
      function init(){
        createPetDOM();createContextMenu();
        const pet=document.getElementById('Yuze-desktop-pet');
        bindEvents(pet);startAutoBlink();startIdleBehavior();
    
        const svg=document.getElementById('pet-svg');if(svg)svg.style.transformOrigin='center center';
        pet.style.transform='scale(0)';
        requestAnimationFrame(()=>{requestAnimationFrame(()=>{
          pet.style.transition='transform .45s cubic-bezier(.175,.885,.32,1.275), opacity .25s ease, width .3s ease, height .3s ease';
          pet.style.transform='scale(1)';pet.style.opacity='1';
        });});
        setTimeout(()=>{
          showBubble('你好呀！我是你的桌宠~ 🐾\n右键可以丢色子/做决定/推荐歌曲哦！');
          setTimeout(()=>hideBubble(),3800);
        },700);
      }
    
      init();
    
      return {
        ok:true,
        summary:'🐾 Yuze桌宠 v6.0 已创建！（随机功能版）\n\n✅ v6新增：\n• 🎲 丢色子 — 色子旋转动画 + 1-6点大字显示 + 评价\n• ⚖️ 做决定 — 硬币翻转动画 + 做/不做/看心情 三种结果\n• 🎵 推荐歌曲 — 音符飘出 + 20首精选歌曲 + 摇摆听歌\n\n保留全部v5功能：敲代码/画画/钓鱼/自由放置/眼球防越界\n\n操作：拖拽(自由)/单击/双击最小化/右键菜单(含6个动作)',
        data:{version:'6.0.0',features:['丢色子','做决定','推荐歌曲','敲代码(粒子)','画画(图形)','钓鱼(波纹)','自由放置','眼球防越界','自动眨眼','丰富台词']},
        warnings:[]
      };
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();