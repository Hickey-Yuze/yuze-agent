// ==================== 大学生精神状态模拟器 · 阳光版 ====================
(function() {
  // 1. 注入样式
  const style = document.createElement('style');
  style.textContent = `
    * { margin: 0; padding: 0; box-sizing: border-box; font-family: "Microsoft YaHei", "PingFang SC", sans-serif; }
    body {
      background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 20px;
      color: #fff;
    }
    #game-container {
      width: 960px;
      max-width: 100%;
      background: rgba(255,255,255,0.06);
      backdrop-filter: blur(14px);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: 0 25px 80px rgba(0,0,0,0.45);
      display: grid;
      grid-template-columns: 240px 1fr 220px;
      grid-template-rows: 60px 1fr 110px;
      grid-template-areas:
        "header header header"
        "status scene sidebar"
        "status action sidebar";
      height: 680px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    #header {
      grid-area: header;
      background: rgba(0,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 22px;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 1px;
      z-index: 10;
    }
    #status-panel {
      grid-area: status;
      background: rgba(0,0,0,0.18);
      padding: 18px;
      border-right: 1px solid rgba(255,255,255,0.08);
      z-index: 5;
    }
    #scene-panel {
      grid-area: scene;
      position: relative;
      overflow: hidden;
      z-index: 1;
    }
    #sidebar {
      grid-area: sidebar;
      background: rgba(0,0,0,0.18);
      padding: 14px;
      border-left: 1px solid rgba(255,255,255,0.08);
      overflow-y: auto;
      z-index: 5;
    }
    #action-panel {
      grid-area: action;
      padding: 12px 20px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      justify-content: flex-start;
      border-top: 1px solid rgba(255,255,255,0.06);
      z-index: 5;
      background: rgba(0,0,0,0.15);
    }

    /* ========== 阳光自信版角色 ========== */
    #character-area {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      background-size: cover;
      background-position: center;
      transition: background 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      padding-bottom: 20px;
    }
    #character {
      position: relative;
      width: 160px;
      height: 180px;
      animation: float 4s ease-in-out infinite;
      filter: drop-shadow(0 6px 16px rgba(0,0,0,0.3));
      z-index: 2;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    /* 脸 —— 更透亮的肤色 */
    .face {
      position: absolute;
      top: 32px;
      left: 50%;
      transform: translateX(-50%);
      width: 125px;
      height: 115px;
      background: #ffe0bd;
      border-radius: 48% 48% 52% 52%;
      z-index: 2;
      box-shadow: inset 0 -5px 10px rgba(0,0,0,0.05);
    }

    /* 头发 —— 清爽短发，层次翘起 */
    .hair {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 138px;
      height: 65px;
      background: #3a3a3a;
      border-radius: 70px 70px 40% 40%;
      z-index: 3;
    }
    .hair::after {
      content: "";
      position: absolute;
      bottom: -8px;
      left: 5px;
      right: 5px;
      height: 22px;
      background: #3a3a3a;
      border-radius: 0 0 45% 45%;
      clip-path: polygon(0 0, 15% 60%, 30% 20%, 45% 70%, 60% 30%, 75% 65%, 90% 25%, 100% 0, 100% 100%, 0 100%);
    }

    /* 呆毛 —— 俏皮翘起来 */
    .ahoge {
      position: absolute;
      top: -14px;
      left: 58%;
      width: 10px;
      height: 32px;
      background: #3a3a3a;
      border-radius: 50%;
      transform: rotate(25deg);
      z-index: 4;
      transform-origin: bottom center;
      transition: transform 0.3s;
    }

    /* 淡黑眼圈 —— 仅疲惫时明显 */
    .eyebag {
      position: absolute;
      top: 44px;
      width: 24px;
      height: 8px;
      background: rgba(100, 80, 140, 0);
      border-radius: 50%;
      z-index: 3;
      transition: all 0.3s;
    }
    .eyebag.left { left: 28px; }
    .eyebag.right { right: 28px; }

    /* 眼睛 —— 大而明亮，元气满满 */
    .eye {
      position: absolute;
      top: 36px;
      width: 26px;
      height: 26px;
      background: #fff;
      border-radius: 50%;
      z-index: 4;
      overflow: hidden;
      transition: all 0.3s;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
    }
    .eye.left { left: 26px; }
    .eye.right { right: 26px; }
    .eye::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #2d3436;
      border-radius: 50%;
      transition: all 0.3s;
    }
    .eye::after {
      content: "";
      position: absolute;
      top: 25%;
      left: 30%;
      width: 6px;
      height: 6px;
      background: #fff;
      border-radius: 50%;
    }

    /* 眼镜 —— 学霸专属 */
    .glasses {
      position: absolute;
      top: 32px;
      left: 50%;
      transform: translateX(-50%) scale(0);
      width: 80px;
      height: 32px;
      border: 3px solid #2d3436;
      border-radius: 10px;
      z-index: 5;
      opacity: 0;
      transition: all 0.3s;
    }
    .glasses::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 8px;
      height: 3px;
      background: #2d3436;
    }

    /* 嘴巴 —— 默认自信微笑 */
    .mouth {
      position: absolute;
      bottom: 26px;
      left: 50%;
      transform: translateX(-50%);
      width: 28px;
      height: 14px;
      border: 3px solid #c44569;
      border-top: none;
      border-radius: 0 0 28px 28px;
      background: transparent;
      z-index: 4;
      transition: all 0.3s;
    }

    /* 腮红 —— 淡淡好气色 */
    .cheek {
      position: absolute;
      top: 64px;
      width: 20px;
      height: 10px;
      background: rgba(255, 160, 160, 0.25);
      border-radius: 50%;
      z-index: 3;
      transition: all 0.3s;
    }
    .cheek.left { left: 16px; }
    .cheek.right { right: 16px; }

    /* —— 表情状态 —— */

    /* 正常：自信微笑 */
    .mood-normal .mouth { width: 26px; height: 12px; }

    /* 开心：咧嘴大笑 */
    .mood-happy .eye { height: 10px; top: 42px; }
    .mood-happy .eye::before, .mood-happy .eye::after { display: none; }
    .mood-happy .mouth { 
      width: 40px; 
      height: 20px; 
      background: #c44569;
      border: none;
      border-radius: 0 0 40px 40px;
    }
    .mood-happy .cheek { background: rgba(255, 140, 140, 0.5); }
    .mood-happy .ahoge { transform: rotate(40deg); }

    /* 犯困：眯眼 */
    .mood-tired .eye { height: 5px; top: 46px; }
    .mood-tired .eye::after { display: none; }
    .mood-tired .eyebag { background: rgba(90, 70, 130, 0.35); height: 12px; }
    .mood-tired .mouth { width: 14px; height: 6px; border-width: 2px; }
    .mood-tired .ahoge { transform: rotate(5deg); top: -10px; }

    /* 崩溃：X眼 */
    .mood-dead .eye { background: transparent; }
    .mood-dead .eye::before {
      content: "×";
      width: auto;
      height: auto;
      background: transparent;
      color: #2d3436;
      font-size: 26px;
      font-weight: bold;
      top: -4px;
    }
    .mood-dead .eye::after { display: none; }
    .mood-dead .mouth { 
      width: 18px; 
      height: 8px; 
      border-radius: 50%; 
      border: 2px solid #c44569;
      transform: translateX(-50%) rotate(180deg); 
    }
    .mood-dead .ahoge { transform: rotate(-25deg); top: -6px; }

    /* 学习：戴眼镜认真脸 */
    .mood-study .glasses { opacity: 1; transform: translateX(-50%) scale(1); }
    .mood-study .eye { width: 22px; height: 22px; top: 38px; }
    .mood-study .mouth { width: 16px; height: 8px; border-radius: 50%; border: 2px solid #c44569; }
    .mood-study .ahoge { transform: rotate(20deg); }

    /* 恋爱：爱心眼 */
    .mood-love .eye { background: transparent; }
    .mood-love .eye::before {
      content: "♥";
      background: transparent;
      color: #ff4757;
      font-size: 24px;
      top: -2px;
    }
    .mood-love .eye::after { display: none; }
    .mood-love .mouth { 
      width: 34px; 
      height: 16px; 
      background: transparent;
      border: 3px solid #c44569;
      border-top: none;
      border-radius: 0 0 34px 34px;
    }
    .mood-love .cheek { background: rgba(255, 120, 120, 0.6); }
    .mood-love .ahoge { transform: rotate(50deg); }

    /* 惊恐：瞪大眼 */
    .mood-panic .eye { width: 32px; height: 32px; top: 32px; }
    .mood-panic .eye::before { width: 10px; height: 10px; }
    .mood-panic .mouth { 
      width: 20px; 
      height: 24px; 
      background: #c44569;
      border: none;
      border-radius: 50%; 
    }
    .mood-panic .ahoge { transform: rotate(90deg); top: -18px; }

    /* 难过：撇嘴 */
    .mood-sad .eye { height: 20px; }
    .mood-sad .eye::before { top: 65%; }
    .mood-sad .mouth { 
      width: 24px; 
      height: 10px; 
      border: 3px solid #c44569;
      border-bottom: none;
      border-radius: 24px 24px 0 0;
      background: transparent;
      transform: translateX(-50%);
    }
    .mood-sad .ahoge { transform: rotate(-15deg); }

    /* 生气：眯眼皱眉 */
    .mood-angry .eye { height: 8px; top: 44px; transform: rotate(-10deg); }
    .mood-angry .eye.right { transform: rotate(10deg); }
    .mood-angry .eye::after { display: none; }
    .mood-angry .mouth { 
      width: 18px; 
      height: 10px; 
      border-radius: 50%; 
      border: 2px solid #c44569;
    }
    .mood-angry .ahoge { transform: rotate(65deg); }

    /* 生病：气色变差 */
    .mood-sick .face { filter: brightness(0.95) saturate(0.8); }
    .mood-sick .eye { height: 10px; top: 44px; }
    .mood-sick .eye::after { display: none; }
    .mood-sick .mouth { width: 12px; height: 8px; border-radius: 50%; border: 2px solid #c44569; }
    .mood-sick .cheek { background: rgba(255, 180, 180, 0.4); }

    /* 思考：歪头感 */
    .mood-think .eye.left { transform: translateX(-4px); }
    .mood-think .eye.right { transform: translateX(4px); }
    .mood-think .mouth { 
      width: 14px; 
      height: 14px; 
      border-radius: 50%; 
      border: 2px solid #c44569;
      left: 54%; 
    }

    #day-info {
      position: absolute;
      top: 18px;
      left: 22px;
      font-size: 16px;
      background: rgba(0,0,0,0.5);
      padding: 8px 14px;
      border-radius: 10px;
      backdrop-filter: blur(6px);
      font-weight: 500;
      z-index: 10;
    }
    #event-text {
      position: absolute;
      bottom: 16px;
      left: 20px;
      right: 20px;
      background: rgba(0,0,0,0.7);
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      line-height: 1.6;
      max-height: 90px;
      overflow-y: auto;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.06);
      z-index: 10;
    }
    #event-text strong {
      display: block;
      margin-bottom: 4px;
      font-size: 15px;
      color: #ffeaa7;
    }

    .stat-item { margin-bottom: 14px; }
    .stat-label { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; opacity: 0.9; }
    .stat-bar {
      height: 10px;
      background: rgba(255,255,255,0.12);
      border-radius: 6px;
      overflow: hidden;
    }
    .stat-fill { height: 100%; border-radius: 6px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
    .stat-spirit { background: linear-gradient(90deg, #ff6b6b, #feca57); }
    .stat-gpa { background: linear-gradient(90deg, #54a0ff, #5f27cd); }
    .stat-money { background: linear-gradient(90deg, #00d2d3, #10ac84); }
    .stat-social { background: linear-gradient(90deg, #ff9ff3, #f368e0); }
    .stat-energy { background: linear-gradient(90deg, #feca57, #ff9f43); }

    .status-footer {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px solid rgba(255,255,255,0.08);
      font-size: 12px;
      line-height: 1.9;
      opacity: 0.85;
    }
    .status-footer div { display: flex; justify-content: space-between; }

    .btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border: none;
      color: white;
      padding: 9px 14px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-weight: 500;
    }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(102,126,234,0.45); }
    .btn:active { transform: translateY(0); }
    .btn-option {
      background: rgba(255,255,255,0.12);
      text-align: left;
      width: 100%;
      border: 1px solid rgba(255,255,255,0.06);
      padding: 8px 12px;
      font-size: 13px;
    }
    .btn-option:hover { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.15); }
    .btn-small { padding: 6px 12px; font-size: 12px; }
    .btn-ghost { background: rgba(255,255,255,0.08); }
    #next-day-btn { margin-top: 4px; }

    .achievement-item {
      background: rgba(255,255,255,0.06);
      padding: 9px;
      border-radius: 8px;
      margin-bottom: 7px;
      font-size: 12px;
      opacity: 0.35;
      transition: all 0.3s;
    }
    .achievement-item.unlocked {
      opacity: 1;
      background: linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.15));
      border: 1px solid rgba(255,215,0,0.45);
      box-shadow: 0 0 12px rgba(255,215,0,0.15);
    }
    .achievement-title { font-weight: bold; margin-bottom: 3px; font-size: 13px; }
    .sidebar-title { margin-bottom: 10px; font-size: 14px; font-weight: 600; opacity: 0.9; }

    .header-btns { display: flex; gap: 8px; }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
      animation: fadeIn 0.3s ease;
    }
    .modal-overlay.active { display: flex; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .modal {
      background: linear-gradient(145deg, #2c3e50, #1a252f);
      padding: 32px;
      border-radius: 14px;
      max-width: 420px;
      width: 90%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
      border: 1px solid rgba(255,255,255,0.06);
      animation: slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      z-index: 1001;
    }
    @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .modal h2 { margin-bottom: 16px; font-size: 22px; }
    .modal p { margin-bottom: 22px; line-height: 1.7; white-space: pre-line; opacity: 0.9; }
    .modal-btns { display: flex; gap: 10px; justify-content: center; }

    #sidebar::-webkit-scrollbar { width: 5px; }
    #sidebar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 3px; }
    #event-text::-webkit-scrollbar { width: 4px; }
    #event-text::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

    .toast {
      position: fixed;
      top: 30px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      background: rgba(0,0,0,0.85);
      padding: 10px 20px;
      border-radius: 8px;
      opacity: 0;
      transition: all 0.3s;
      z-index: 2000;
      pointer-events: none;
    }
    .toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

    @media (max-width: 820px) {
      #game-container {
        grid-template-columns: 1fr;
        grid-template-rows: 60px auto auto 1fr auto;
        grid-template-areas:
          "header"
          "status"
          "scene"
          "action"
          "sidebar";
        height: auto;
        min-height: 95vh;
      }
      #status-panel { 
        display: flex; 
        flex-wrap: wrap; 
        gap: 12px; 
        border-right: none; 
        border-bottom: 1px solid rgba(255,255,255,0.08);
        padding: 14px 18px;
      }
      .stat-item { flex: 1 1 40%; margin-bottom: 0; }
      .status-footer { flex-basis: 100%; margin-top: 8px; padding-top: 8px; }
      #sidebar { 
        border-left: none; 
        border-top: 1px solid rgba(255,255,255,0.08); 
        max-height: 180px;
      }
      #scene-panel { min-height: 280px; }
      #character { width: 130px; height: 150px; }
      #action-panel { padding: 12px 16px; }
      #event-text {
        bottom: 12px;
        left: 16px;
        right: 16px;
        font-size: 13px;
        max-height: 80px;
      }
    }
  `;
  document.head.appendChild(style);

  // 2. 构建DOM结构
  const container = document.createElement('div');
  container.id = 'game-container';
  container.innerHTML = `
    <div id="header">
      <span>🎓 大学生精神状态模拟器</span>
      <div class="header-btns">
        <button class="btn btn-small btn-ghost" id="btn-save">💾 存档</button>
        <button class="btn btn-small btn-ghost" id="btn-load">📂 读档</button>
        <button class="btn btn-small btn-ghost" id="btn-music">🔊 音效</button>
        <button class="btn btn-small btn-ghost" id="btn-help">❓ 帮助</button>
      </div>
    </div>

    <div id="status-panel">
      <div class="stat-item">
        <div class="stat-label"><span>🧠 精神值</span><span id="val-spirit">80</span></div>
        <div class="stat-bar"><div class="stat-fill stat-spirit" id="bar-spirit" style="width:80%"></div></div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><span>📚 GPA</span><span id="val-gpa">3.00</span></div>
        <div class="stat-bar"><div class="stat-fill stat-gpa" id="bar-gpa" style="width:60%"></div></div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><span>💰 生活费</span><span id="val-money">1500</span></div>
        <div class="stat-bar"><div class="stat-fill stat-money" id="bar-money" style="width:50%"></div></div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><span>🤝 人缘</span><span id="val-social">50</span></div>
        <div class="stat-bar"><div class="stat-fill stat-social" id="bar-social" style="width:50%"></div></div>
      </div>
      <div class="stat-item">
        <div class="stat-label"><span>⚡ 体力</span><span id="val-energy">100</span></div>
        <div class="stat-bar"><div class="stat-fill stat-energy" id="bar-energy" style="width:100%"></div></div>
      </div>
      <div class="status-footer">
        <div><span>💑 恋爱状态</span><span id="val-love">单身</span></div>
        <div><span>🏆 已获成就</span><span><span id="val-achieve">0</span> / <span id="total-achieve">0</span></span></div>
        <div><span>📅 当前学期</span><span id="val-term">大一上</span></div>
      </div>
    </div>

    <div id="scene-panel">
      <div id="character-area" style="background: linear-gradient(180deg, #74b9ff 0%, #a29bfe 60%, #dfe6e9 100%);">
        <div id="day-info">第 <span id="day-num">1</span> 天</div>
        <div id="character" class="mood-normal">
          <div class="hair"></div>
          <div class="ahoge"></div>
          <div class="face">
            <div class="eyebag left"></div>
            <div class="eyebag right"></div>
            <div class="eye left"></div>
            <div class="eye right"></div>
            <div class="glasses"></div>
            <div class="mouth"></div>
            <div class="cheek left"></div>
            <div class="cheek right"></div>
          </div>
        </div>
        <div id="event-text"><strong>开学第一天</strong>欢迎来到大学！你的四年生活即将开始，点击下方按钮度过每一天。</div>
      </div>
    </div>

    <div id="sidebar">
      <div class="sidebar-title">🏅 成就墙</div>
      <div id="achievement-list"></div>
    </div>

    <div id="action-panel">
      <div id="options-container"></div>
      <button class="btn" id="next-day-btn">⏭️ 进入下一天</button>
    </div>

    <div class="modal-overlay" id="modal">
      <div class="modal">
        <h2 id="modal-title">提示</h2>
        <p id="modal-content">内容</p>
        <div class="modal-btns">
          <button class="btn" id="modal-ok">确定</button>
        </div>
      </div>
    </div>

    <div class="toast" id="toast"></div>
  `;
  document.body.appendChild(container);

  // 3. 游戏核心逻辑
  const gameState = {
    day: 1,
    term: 1,
    stats: { spirit: 80, gpa: 3.0, money: 1500, social: 50, energy: 100 },
    love: false,
    loveName: "",
    loveDays: 0,
    scholarship: false,
    failed: false,
    failCount: 0,
    partTimeJob: false,
    clubJoined: false,
    postgraduate: false,
    internship: false,
    flags: {},
    achievements: [],
    eventHistory: [],
    soundEnabled: true,
    bgmEnabled: true
  };

  const termNames = ["大一上学期","大一下学期","大二上学期","大二下学期","大三上学期","大三下学期","大四上学期","大四下学期"];
  const termShort = ["大一上","大一下","大二上","大二下","大三上","大三下","大四上","大四下"];

  const scenes = {
    dorm: "linear-gradient(180deg, #4a4a4a 0%, #2d2d2d 70%, #1a1a1a 100%)",
    classroom: "linear-gradient(180deg, #74b9ff 0%, #a29bfe 55%, #dfe6e9 100%)",
    canteen: "linear-gradient(180deg, #fdcb6e 0%, #e17055 65%, #fab1a0 100%)",
    playground: "linear-gradient(180deg, #55efc4 0%, #00b894 55%, #81ecec 100%)",
    library: "linear-gradient(180deg, #dfe6e9 0%, #b2bec3 55%, #636e72 100%)",
    night: "linear-gradient(180deg, #0c0c1d 0%, #1a1a3e 50%, #2d2d5a 100%)",
    sunset: "linear-gradient(180deg, #ff7675 0%, #fd79a8 40%, #a29bfe 100%)",
    rainy: "linear-gradient(180deg, #636e72 0%, #2d3436 70%, #1e272e 100%)",
    exam: "linear-gradient(180deg, #e17055 0%, #d63031 50%, #b71c1c 100%)"
  };

  const moodMap = {
    normal: "mood-normal", happy: "mood-happy", sad: "mood-sad", tired: "mood-tired",
    angry: "mood-angry", love: "mood-love", shock: "mood-panic", think: "mood-think",
    cool: "mood-happy", sick: "mood-sick", cry: "mood-sad", smirk: "mood-happy",
    confused: "mood-think", excited: "mood-happy", dead: "mood-dead", study: "mood-study", panic: "mood-panic"
  };

  const achievementDefs = [
    { id: "freshman", name: "萌新入学", desc: "开启大学生活", icon: "🎒" },
    { id: "all_nighter", name: "熬夜冠军", desc: "精神值跌破20", icon: "🌙" },
    { id: "straight_A", name: "卷王之王", desc: "GPA达到满分4.0", icon: "📖" },
    { id: "broke", name: "吃土少年", desc: "生活费低于200元", icon: "💸" },
    { id: "social_king", name: "社交牛逼症", desc: "人缘值达到90", icon: "👑" },
    { id: "love_story", name: "脱单成功", desc: "收获一段恋情", icon: "💕" },
    { id: "fail_exam", name: "挂科预定", desc: "第一次挂科", icon: "📉" },
    { id: "scholarship", name: "奖学金得主", desc: "获得校级奖学金", icon: "🏆" },
    { id: "survive_100", name: "百天战士", desc: "存活超过100天", icon: "⏰" },
    { id: "graduate", name: "顺利毕业", desc: "走完大学四年", icon: "🎓" },
    { id: "work_study", name: "勤工俭学", desc: "开始做兼职", icon: "💼" },
    { id: "club_master", name: "社团大佬", desc: "加入社团并活跃", icon: "🎭" },
    { id: "postgrad", name: "考研人", desc: "踏上考研之路", icon: "📝" },
    { id: "intern", name: "实习达人", desc: "获得实习机会", icon: "🏢" },
    { id: "love_long", name: "长跑爱情", desc: "恋爱超过60天", icon: "💍" }
  ];

  const normalEvents = [
    { id: "morning_class", title: "早八噩梦", text: "闹钟响了三遍，第一节是高数早八。起不起？", scene: "classroom", face: "tired",
      options: [
        { text: "硬爬起来去上课", effect: { spirit:-12, gpa:+0.08, energy:-18 }, result: "困得睁不开眼，但笔记还是记了。" },
        { text: "再睡十分钟…", effect: { spirit:+6, gpa:-0.12, energy:+8 }, result: "一睁眼已经第二节课了。" },
        { text: "直接请假不去", effect: { spirit:+10, gpa:-0.2, energy:+15 }, result: "心安理得睡了一上午。" }
      ]
    },
    { id: "lunch_choice", title: "午饭抉择", text: "干饭时间到，今天吃什么？", scene: "canteen", face: "happy",
      options: [
        { text: "食堂一荤一素", effect: { money:-15, energy:+22, spirit:+2 }, result: "朴实无华，健康饮食。" },
        { text: "点顿好的外卖", effect: { money:-40, energy:+28, spirit:+12 }, result: "炸鸡配可乐，快乐加倍。" },
        { text: "泡面+火腿肠", effect: { money:-8, energy:+12, spirit:-3 }, result: "大学生的经典套餐。" }
      ]
    },
    { id: "library_study", title: "图书馆自习", text: "路过图书馆，良心隐隐作痛。", scene: "library", face: "think",
      options: [
        { text: "进去卷三小时", effect: { gpa:+0.15, spirit:-10, energy:-22 }, result: "专注学习，收获满满。" },
        { text: "进去拍个照就走", effect: { gpa:+0.02, spirit:+5, energy:-5 }, result: "朋友圈发了，学没学不重要。" },
        { text: "扭头回宿舍", effect: { spirit:+4, gpa:-0.05, energy:+6 }, result: "宿舍才是快乐老家。" }
      ]
    },
    { id: "club_activity", title: "社团团建", text: "社团今晚有破冰活动，去不去？", scene: "playground",
      options: [
        { text: "积极参与", effect: { social:+10, money:-25, energy:-18, spirit:+6 }, result: "认识了好多新朋友，社恐好转了。",
          callback: () => { gameState.clubJoined = true; unlockAchievement("club_master"); } },
        { text: "社恐发作，溜了", effect: { social:-2, spirit:+4, energy:+8 }, result: "一个人待着也挺好。" }
      ]
    },
    { id: "part_time_job", title: "兼职招聘", text: "食堂门口贴着兼职海报，一小时18块。", scene: "canteen", face: "think",
      options: [
        { text: "报名试试", effect: { money:+100, energy:-35, spirit:-12 }, result: "虽然累但赚钱了，生活费+100。",
          callback: () => { gameState.partTimeJob = true; unlockAchievement("work_study"); } },
        { text: "时间宝贵，算了", effect: {}, result: "你选择专注学业。" }
      ]
    },
    { id: "pop_quiz", title: "突击小测", text: "老师突然宣布随堂测验！", scene: "classroom", face: "shock",
      options: [
        { text: "沉着答题", effect: { gpa: 0.08, spirit:-4 }, condition: () => gameState.stats.gpa > 2.8, result: "平时学得扎实，问题不大。" },
        { text: "瞎蒙一通", effect: { gpa:-0.1, spirit:-6 }, result: "好多不会，听天由命。" }
      ]
    },
    { id: "roommate_gaming", title: "室友开黑", text: "室友半夜还在打游戏大喊大叫，根本睡不着。", scene: "dorm", face: "angry",
      options: [
        { text: "委婉提醒一下", effect: { spirit:+2, social:-3 }, result: "室友小声了一点。" },
        { text: "戴上耳塞忍了", effect: { spirit:-10, energy:-12 }, result: "翻来覆去很晚才睡着。" },
        { text: "加入他们开黑", effect: { spirit:+12, energy:-25, social:+6, gpa:-0.06 }, result: "开黑真快乐，明天起不来再说。" }
      ]
    },
    { id: "lost_card", title: "饭卡失踪", text: "饭卡找不到了，里面还有两百多。", scene: "dorm", face: "confused",
      options: [
        { text: "立刻挂失补办", effect: { money:-25, spirit:-4 }, result: "花了工本费，还好损失不大。" },
        { text: "翻遍宿舍找", effect: { spirit:-8, energy:-8 }, result: "最后在脏衣服里找到了。" }
      ]
    },
    { id: "express_package", title: "快递到了", text: "快递驿站发来取件码，驿站在学校另一头。", scene: "playground", face: "happy",
      options: [
        { text: "立刻去取", effect: { spirit:+6, energy:-12 }, result: "拆快递的快乐无可替代。" },
        { text: "攒着明天再说", effect: { spirit:-2 }, result: "拖延症又犯了。" }
      ]
    },
    { id: "sudden_rain", title: "突降大雨", text: "出门还晴空万里，半路下起瓢泼大雨。", scene: "rainy", face: "sad",
      options: [
        { text: "冒雨冲回宿舍", effect: { spirit:-12, energy:-18 }, result: "浑身湿透，好狼狈。" },
        { text: "躲雨等天晴", effect: { spirit:-4, energy:-6 }, result: "等了好久雨才小。" }
      ]
    },
    { id: "takeout_late", title: "外卖超时", text: "外卖超时半小时还没到，饿到昏厥。", scene: "dorm", face: "angry",
      options: [
        { text: "催单+差评", effect: { spirit:-6, money:-5 }, result: "商家赔了五块红包。" },
        { text: "耐心等待", effect: { spirit:-10, energy:-5 }, result: "终于到了，饭都凉了。" }
      ]
    },
    { id: "nap_time", title: "午后小憩", text: "下午没课，要不要睡个午觉？", scene: "dorm", face: "tired",
      options: [
        { text: "睡半小时就起", effect: { energy:+20, spirit:+8 }, result: "神清气爽。" },
        { text: "一觉睡到傍晚", effect: { energy:+30, spirit:-5, gpa:-0.03 }, result: "醒来以为是第二天早上。" }
      ]
    },
    { id: "exercise_run", title: "校园跑", text: "体育要求的校园跑还没达标。", scene: "playground", face: "tired",
      options: [
        { text: "去跑两公里", effect: { energy:-25, spirit:+5, social:+2 }, result: "虽然累但出了一身汗。" },
        { text: "骑单车代跑", effect: { energy:-5, spirit:+3 }, result: "作弊的感觉有点刺激。" },
        { text: "下次一定", effect: { spirit:-2 }, result: "拖延症日常。" }
      ]
    },
    { id: "group_project", title: "小组作业", text: "小组作业要交了，队友还没动静。", scene: "library", face: "angry",
      options: [
        { text: "自己全做了", effect: { gpa:+0.1, spirit:-15, energy:-20 }, result: "虽然累但分数有保障。" },
        { text: "疯狂催队友", effect: { gpa:+0.05, spirit:-8, social:-5 }, result: "催了半天才动起来。" },
        { text: "摆烂一起死", effect: { gpa:-0.15, spirit:+3 }, result: "大不了一起低分。" }
      ]
    },
    { id: "phone_dead", title: "手机没电", text: "出门手机突然没电，充电宝也没带。", scene: "playground", face: "shock",
      options: [
        { text: "借个共享充电宝", effect: { money:-6, spirit:+4 }, result: "续命成功。" },
        { text: "硬扛着回宿舍", effect: { spirit:-8, energy:-10 }, result: "没有手机的时间好漫长。" }
      ]
    },
    { id: "cold_sick", title: "感冒了", text: "可能着凉了，头晕嗓子疼。", scene: "dorm", face: "sick",
      options: [
        { text: "去校医院拿药", effect: { money:-30, energy:-10, spirit:+3 }, result: "吃了药好多了。" },
        { text: "多喝热水硬扛", effect: { spirit:-8, energy:-15, gpa:-0.05 }, result: "扛了两天才好。" }
      ]
    },
    { id: "monthly_money", title: "生活费到账", text: "爸妈打生活费了！", scene: "dorm", face: "happy",
      options: [
        { text: "规划着花", effect: { money:+1500, spirit:+8 }, result: "理性消费，细水长流。" },
        { text: "先挥霍一顿", effect: { money:+1500, spirit:+15, energy:+10 }, result: "月初富翁，月底乞丐。" }
      ]
    },
    { id: "wifi_broken", title: "校园网崩了", text: "校园网突然断了，作业还没提交。", scene: "dorm", face: "shock",
      options: [
        { text: "开流量提交", effect: { money:-10, spirit:+5 }, result: "心疼流量但保住了作业。" },
        { text: "等网恢复再说", effect: { spirit:-10, gpa:-0.05 }, result: "差点超时提交。" }
      ]
    }
  ];

  const specialEvents = [
    { id: "love_meet", condition: () => gameState.stats.social >= 65 && !gameState.love && gameState.day > 12,
      title: "图书馆邂逅", text: "对面座位的同学不小心碰掉了你的笔，你们对视的那一刻有点心动。", scene: "library", face: "think",
      options: [
        { text: "主动搭话聊天", effect: { social:+6, spirit:+18 }, result: "聊得很投机，你们交换了联系方式。",
          callback: () => {
            gameState.love = true;
            gameState.loveName = ["小林","小苏","小杨","小陈"][Math.floor(Math.random()*4)];
            gameState.loveDays = 0;
            unlockAchievement("love_story");
          }
        },
        { text: "腼腆笑一下作罢", effect: { spirit:+3 }, result: "有点遗憾，但也挺好。" }
      ]
    },
    { id: "love_date", condition: () => gameState.love && gameState.loveDays % 7 === 3 && Math.random() < 0.7,
      title: "约会日", text: `${gameState.loveName}约你周末去看电影。`, scene: "sunset", face: "love",
      options: [
        { text: "精心打扮赴约", effect: { money:-120, spirit:+25, energy:-18 }, result: "约会超开心，感情升温！" },
        { text: "借口学习推掉", effect: { spirit:-8, social:-4 }, result: "对方有点失落。" }
      ]
    },
    { id: "love_quarrel", condition: () => gameState.love && gameState.stats.spirit < 40 && Math.random() < 0.15,
      title: "感情摩擦", text: `最近压力太大，你和${gameState.loveName}因为小事吵了一架。`, scene: "night", face: "sad",
      options: [
        { text: "主动道歉和好", effect: { spirit:-6, social:+4 }, result: "和好了，感情需要经营。" },
        { text: "冷战冷静一下", effect: { spirit:-15, social:-8 },
          callback: () => { if (Math.random() < 0.3) { gameState.love = false; gameState.loveName = ""; } },
          result: "气氛很僵……" }
      ]
    },
    { id: "love_anniversary", condition: () => gameState.love && gameState.loveDays === 60,
      title: "恋爱两个月", text: `不知不觉和${gameState.loveName}在一起两个月了。`, scene: "sunset", face: "love",
      options: [
        { text: "准备惊喜庆祝", effect: { money:-200, spirit:+30, social:+8 }, result: "对方很感动，度过了美好的一天。",
          callback: () => unlockAchievement("love_long") },
        { text: "平平淡淡就好", effect: { spirit:+10 }, result: "细水长流的幸福。" }
      ]
    },
    { id: "final_fail", condition: () => gameState.stats.gpa < 2.0 && !gameState.failed && gameState.day % 30 >= 27,
      title: "期末出分", text: "成绩出来了……有一门课挂了。", scene: "exam", face: "sad",
      options: [
        { text: "接受现实，准备补考", effect: { spirit:-22, gpa:-0.15 },
          callback: () => { gameState.failed = true; gameState.failCount++; unlockAchievement("fail_exam"); },
          result: "唉，下学期再战吧。" }
      ]
    },
    { id: "get_scholarship", condition: () => gameState.stats.gpa >= 3.8 && !gameState.scholarship && gameState.day % 30 >= 28,
      title: "一等奖学金！", text: "因为成绩优异，综合表现突出，你获得了一等奖学金！", scene: "classroom", face: "happy",
      options: [
        { text: "太开心了！", effect: { money:+3000, spirit:+35, social:+12 },
          callback: () => { gameState.scholarship = true; unlockAchievement("scholarship"); },
          result: "努力终于有了回报！" }
      ]
    },
    { id: "all_nighter_exam", condition: () => gameState.stats.gpa < 2.5 && gameState.stats.energy > 55 && gameState.day % 30 >= 25 && Math.random() < 0.25,
      title: "考前通宵", text: "明天就期末考试了，你决定通宵突击。", scene: "dorm", face: "tired",
      options: [
        { text: "学到天亮！", effect: { gpa:+0.35, spirit:-30, energy:-55 }, result: "学是学了，人也快没了。" },
        { text: "算了，听天由命", effect: { spirit:+6, gpa:-0.12 }, result: "躺平了。" }
      ]
    },
    { id: "postgrad_decision", condition: () => gameState.term >= 5 && !gameState.postgraduate && gameState.stats.gpa >= 3.0 && Math.random() < 0.2,
      title: "考研还是工作", text: "大三了，身边同学都在考虑未来。要不要加入考研大军？", scene: "library", face: "think",
      options: [
        { text: "决定考研", effect: { spirit:-8, gpa:+0.1 },
          callback: () => { gameState.postgraduate = true; unlockAchievement("postgrad"); },
          result: "踏上漫漫考研路。" },
        { text: "准备找工作", effect: { social:+5, spirit:+3 }, result: "开始关注实习和校招。" }
      ]
    },
    { id: "internship_offer", condition: () => gameState.term >= 4 && !gameState.internship && gameState.stats.social >= 60 && Math.random() < 0.15,
      title: "实习机会", text: "学长内推了一个实习岗位，你通过了面试！", scene: "classroom", face: "happy",
      options: [
        { text: "接受实习", effect: { money:+800, energy:-25, social:+8, gpa:-0.08 },
          callback: () => { gameState.internship = true; unlockAchievement("intern"); },
          result: "一边上课一边实习，生活充实起来。" },
        { text: "太忙了算了", effect: {}, result: "专注学业也挺好。" }
      ]
    },
    { id: "bonus_money", condition: () => Math.random() < 0.04,
      title: "意外之财", text: "走在路上捡到100块钱！", scene: "playground", face: "happy",
      options: [
        { text: "收入囊中", effect: { money:+100, spirit:+8 }, result: "今天运气真好！" },
        { text: "交给保安亭", effect: { social:+5, spirit:+4 }, result: "做了件好事，心里踏实。" }
      ]
    },
    { id: "bike_stolen", condition: () => Math.random() < 0.03 && gameState.stats.money > 500,
      title: "自行车被偷", text: "停在楼下的自行车不见了……", scene: "dorm", face: "angry",
      options: [
        { text: "报警+调监控", effect: { spirit:-12, money:-50 }, result: "折腾半天也没找到。" },
        { text: "认栽，以后走路", effect: { spirit:-8, energy:-5 }, result: "就当锻炼身体了。" }
      ]
    }
  ];

  // 工具函数
  function setScene(sceneKey) {
    document.getElementById("character-area").style.background = scenes[sceneKey] || scenes.dorm;
  }

  function setFace(faceKey) {
    const char = document.getElementById("character");
    Object.values(moodMap).forEach(m => char.classList.remove(m));
    const mood = moodMap[faceKey] || moodMap.normal;
    char.classList.add(mood);
  }

  function updateCharacterMood() {
    const s = gameState.stats;
    if (gameState.love) { setFace("love"); return; }
    if (s.spirit <= 10) { setFace("dead"); return; }
    if (s.spirit <= 25) { setFace("tired"); return; }
    if (s.gpa >= 3.8) { setFace("study"); return; }
    if (s.gpa >= 3.3) { setFace("happy"); return; }
    if (s.gpa < 1.8) { setFace("panic"); return; }
    if (s.money >= 3000) { setFace("happy"); return; }
    if (s.money < 200) { setFace("sad"); return; }
    if (s.energy < 20) { setFace("tired"); return; }
    if (s.social >= 85) { setFace("happy"); return; }
    if (s.social < 20) { setFace("sad"); return; }
    setFace("normal");
  }

  function updateStats() {
    const s = gameState.stats;
    s.spirit = Math.max(0, Math.min(100, s.spirit));
    s.gpa = Math.max(0, Math.min(4.0, Math.round(s.gpa * 100) / 100));
    s.money = Math.max(0, Math.round(s.money));
    s.social = Math.max(0, Math.min(100, s.social));
    s.energy = Math.max(0, Math.min(100, s.energy));

    document.getElementById("val-spirit").textContent = Math.round(s.spirit);
    document.getElementById("val-gpa").textContent = s.gpa.toFixed(2);
    document.getElementById("val-money").textContent = s.money;
    document.getElementById("val-social").textContent = Math.round(s.social);
    document.getElementById("val-energy").textContent = Math.round(s.energy);

    document.getElementById("bar-spirit").style.width = s.spirit + "%";
    document.getElementById("bar-gpa").style.width = (s.gpa / 4.0 * 100) + "%";
    document.getElementById("bar-money").style.width = Math.min(100, s.money / 30) + "%";
    document.getElementById("bar-social").style.width = s.social + "%";
    document.getElementById("bar-energy").style.width = s.energy + "%";

    document.getElementById("val-love").textContent = gameState.love ? `${gameState.loveName}(${gameState.loveDays}天)` : "单身";
    document.getElementById("day-num").textContent = gameState.day;
    document.getElementById("val-term").textContent = termShort[gameState.term - 1] || "毕业";

    if (s.spirit < 20) unlockAchievement("all_nighter");
    if (s.gpa >= 4.0) unlockAchievement("straight_A");
    if (s.money < 200) unlockAchievement("broke");
    if (s.social >= 90) unlockAchievement("social_king");
    if (gameState.day >= 100) unlockAchievement("survive_100");

    updateCharacterMood();
  }

  function unlockAchievement(id) {
    if (gameState.achievements.includes(id)) return;
    const ach = achievementDefs.find(a => a.id === id);
    if (!ach) return;
    gameState.achievements.push(id);
    showToast(`🏆 成就解锁：${ach.name}`);
    playSound("achieve");
    renderAchievements();
  }

  function renderAchievements() {
    const list = document.getElementById("achievement-list");
    list.innerHTML = "";
    achievementDefs.forEach(a => {
      const unlocked = gameState.achievements.includes(a.id);
      const div = document.createElement("div");
      div.className = "achievement-item" + (unlocked ? " unlocked" : "");
      div.innerHTML = `<div class="achievement-title">${a.icon} ${a.name}</div><div>${a.desc}</div>`;
      list.appendChild(div);
    });
    document.getElementById("val-achieve").textContent = gameState.achievements.length;
    document.getElementById("total-achieve").textContent = achievementDefs.length;
  }

  function showEvent(event) {
    setScene(event.scene || "dorm");
    setFace(event.face || "normal");
    document.getElementById("event-text").innerHTML = `<strong>${event.title}</strong>${event.text}`;

    const container = document.getElementById("options-container");
    container.innerHTML = "";
    document.getElementById("next-day-btn").style.display = "none";

    event.options.forEach((opt) => {
      if (opt.condition && !opt.condition()) return;
      const btn = document.createElement("button");
      btn.className = "btn btn-option";
      btn.textContent = opt.text;
      btn.onclick = () => chooseOption(event, opt);
      container.appendChild(btn);
    });
    playSound("click");
  }

  function chooseOption(event, option) {
    if (option.effect) {
      for (let key in option.effect) {
        gameState.stats[key] += option.effect[key];
      }
    }
    if (option.callback) option.callback();

    document.getElementById("event-text").innerHTML = `<strong>${event.title}</strong>${option.result}`;
    document.getElementById("options-container").innerHTML = "";
    document.getElementById("next-day-btn").style.display = "block";

    updateStats();
    playSound("select");
    checkGameOver();
  }

  let dailyEvents = [];
  let currentEventIndex = 0;

  function nextDay() {
    if (currentEventIndex < dailyEvents.length) {
      showEvent(dailyEvents[currentEventIndex]);
      currentEventIndex++;
      return;
    }

    gameState.day++;
    if (gameState.love) gameState.loveDays++;

    gameState.stats.energy += 18;
    gameState.stats.money -= 22;
    gameState.stats.spirit += 2;

    if (gameState.partTimeJob && gameState.day % 7 === 0) {
      gameState.stats.money += 300;
      showToast("💼 兼职工资到账 +300");
    }
    if (gameState.internship && gameState.day % 30 === 15) {
      gameState.stats.money += 1500;
      showToast("🏢 实习工资到账 +1500");
    }

    const newTerm = Math.min(8, Math.floor((gameState.day - 1) / 30) + 1);
    if (newTerm > gameState.term) {
      gameState.term = newTerm;
      if (newTerm > 8) { gameEnding(); return; }
      showModal("📅 新学期", `进入${termNames[newTerm-1]}！\n新的学期，新的开始。`);
    }

    dailyEvents = [];
    currentEventIndex = 0;

    specialEvents.forEach(se => {
      if (se.condition() && !gameState.eventHistory.includes(se.id + "_d" + gameState.day)) {
        dailyEvents.push(se);
        gameState.eventHistory.push(se.id + "_d" + gameState.day);
      }
    });

    const count = Math.floor(Math.random() * 3) + 1;
    const pool = [...normalEvents];
    for (let i = 0; i < count && pool.length > 0; i++) {
      const idx = Math.floor(Math.random() * pool.length);
      dailyEvents.push(pool[idx]);
      pool.splice(idx, 1);
    }
    dailyEvents.sort(() => Math.random() - 0.5);

    if (dailyEvents.length > 0) {
      showEvent(dailyEvents[0]);
      currentEventIndex = 1;
    } else {
      document.getElementById("event-text").innerHTML = "<strong>平静的一天</strong>没什么特别的事发生。";
      document.getElementById("next-day-btn").style.display = "block";
    }

    setScene("dorm");
    updateStats();
    playSound("day");
    saveGame(true);
  }

  function checkGameOver() {
    if (gameState.stats.spirit <= 0) {
      showModal("💔 游戏结束", "你的精神彻底崩溃了……\n大学压力太大，你选择了休学调整。\n\n坚持了 " + gameState.day + " 天", true);
    }
    if (gameState.stats.energy <= 0) {
      showModal("😵 游戏结束", "你体力透支晕倒了，被室友送进了医院。\n\n坚持了 " + gameState.day + " 天", true);
    }
    if (gameState.failCount >= 5) {
      showModal("📉 游戏结束", "挂科太多，你被学校劝退了。\n\n坚持了 " + gameState.day + " 天", true);
    }
  }

  function gameEnding() {
    unlockAchievement("graduate");
    let ending = "";
    const s = gameState.stats;
    ending += "【学业评价】\n";
    if (s.gpa >= 3.8) ending += "🏆 优秀毕业生，保研/大厂offer拿到手软\n";
    else if (s.gpa >= 3.2) ending += "📚 成绩优良，顺利找到心仪工作\n";
    else if (s.gpa >= 2.0) ending += "📄 顺利毕业，中规中矩\n";
    else ending += "⚠️ 延毕边缘，勉强凑够学分\n";
    ending += "\n【感情生活】\n";
    if (gameState.love && gameState.loveDays >= 60) ending += "💕 稳定恋情，毕业不分手\n";
    else if (gameState.love) ending += "💛 有对象，但未来还不确定\n";
    else ending += "💪 单身贵族，专注搞事业\n";
    ending += "\n【其他成就】\n";
    if (gameState.scholarship) ending += "🏅 拿过奖学金，履历亮眼\n";
    if (gameState.internship) ending += "💼 有实习经历，求职加分\n";
    if (gameState.postgraduate) ending += "📝 考研上岸，继续深造\n";
    if (gameState.partTimeJob) ending += "💵 勤工俭学，独立自强\n";
    ending += `\n—— 共度过 ${gameState.day} 天大学生活 ——`;
    showModal("🎓 毕业快乐！", ending, true);
  }

  // 存档系统
  function saveGame(silent = false) {
    try {
      localStorage.setItem("college_sim_save_v3", JSON.stringify(gameState));
      if (!silent) { showToast("💾 存档成功"); playSound("save"); }
    } catch(e) { showToast("存档失败：浏览器存储不可用"); }
  }

  function loadGame() {
    const data = localStorage.getItem("college_sim_save_v3");
    if (!data) { showToast("📂 没有找到存档"); return; }
    try {
      const saved = JSON.parse(data);
      Object.assign(gameState, saved);
      updateStats();
      renderAchievements();
      dailyEvents = [];
      currentEventIndex = 0;
      document.getElementById("event-text").innerHTML = "<strong>读档成功</strong>继续你的大学生活吧！";
      document.getElementById("next-day-btn").style.display = "block";
      setScene("dorm");
      playSound("load");
      showToast("📂 读取存档成功");
    } catch(e) { showToast("读档失败：数据损坏"); }
  }

  // 音效系统
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  function playSound(type) {
    if (!gameState.soundEnabled) return;
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch(type) {
      case "click":
        osc.frequency.value = 660; osc.type = "sine";
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.start(); osc.stop(audioCtx.currentTime + 0.08); break;
      case "select":
        osc.frequency.value = 880; osc.type = "sine";
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start(); osc.stop(audioCtx.currentTime + 0.15); break;
      case "achieve":
        osc.type = "sine";
        osc.frequency.setValueAtTime(523, audioCtx.currentTime);
        osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12);
        osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.24);
        osc.frequency.setValueAtTime(1047, audioCtx.currentTime + 0.36);
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5); break;
      case "day":
        osc.frequency.value = 440; osc.type = "triangle";
        gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
        osc.start(); osc.stop(audioCtx.currentTime + 0.2); break;
      case "save": case "load":
        osc.frequency.value = 587; osc.type = "sine";
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
        osc.start(); osc.stop(audioCtx.currentTime + 0.18); break;
    }
  }

  let bgmInterval = null;
  let bgmPlaying = false;

  function startBGM() {
    if (bgmPlaying) return;
    bgmPlaying = true;
    const melody = [523, 587, 659, 698, 784, 698, 659, 587, 523, 659, 784, 659];
    const bass =   [262, 262, 330, 330, 392, 392, 330, 294, 262, 330, 392, 330];
    let idx = 0;
    bgmInterval = setInterval(() => {
      if (!gameState.bgmEnabled || !gameState.soundEnabled) return;
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine"; osc1.connect(gain1); gain1.connect(audioCtx.destination);
      osc1.frequency.value = melody[idx % melody.length];
      gain1.gain.setValueAtTime(0.025, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
      osc1.start(); osc1.stop(audioCtx.currentTime + 0.45);

      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "triangle"; osc2.connect(gain2); gain2.connect(audioCtx.destination);
      osc2.frequency.value = bass[idx % bass.length];
      gain2.gain.setValueAtTime(0.015, audioCtx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc2.start(); osc2.stop(audioCtx.currentTime + 0.5);
      idx++;
    }, 480);
  }

  function stopBGM() {
    if (bgmInterval) { clearInterval(bgmInterval); bgmInterval = null; }
    bgmPlaying = false;
  }

  function toggleMusic() {
    gameState.soundEnabled = !gameState.soundEnabled;
    if (gameState.soundEnabled) {
      gameState.bgmEnabled = true;
      startBGM();
      showToast("🔊 音效与音乐已开启");
    } else {
      stopBGM();
      showToast("🔇 已静音");
    }
  }

  // UI辅助
  function showModal(title, content, isEnd = false) {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-content").textContent = content;
    document.getElementById("modal").classList.add("active");
    const okBtn = document.getElementById("modal-ok");
    okBtn.textContent = "确定";
    okBtn.onclick = () => {
      closeModal();
      if (isEnd) {
        localStorage.removeItem("college_sim_save_v3");
        location.reload();
      }
    };
    if (isEnd) okBtn.textContent = "重新开始";
  }

  function closeModal() {
    document.getElementById("modal").classList.remove("active");
  }

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  function showHelp() {
    showModal("游戏说明",
      "【目标】\n度过8个学期的大学生活，顺利毕业\n\n" +
      "【属性】\n" +
      "🧠 精神值：归零则崩溃休学\n" +
      "📚 GPA：影响奖学金、挂科、毕业\n" +
      "💰 生活费：每天消耗，可兼职赚取\n" +
      "🤝 人缘：解锁恋爱、社团、实习\n" +
      "⚡ 体力：归零则晕倒住院\n\n" +
      "【玩法】\n" +
      "每天会随机触发多个事件，做出选择影响属性。\n" +
      "满足条件会触发特殊剧情。\n" +
      "角色表情会随你的状态自动变化。\n" +
      "游戏自动存档，也可手动存档读档。"
    );
  }

  // 绑定事件
  document.getElementById("btn-save").onclick = saveGame;
  document.getElementById("btn-load").onclick = loadGame;
  document.getElementById("btn-music").onclick = toggleMusic;
  document.getElementById("btn-help").onclick = showHelp;
  document.getElementById("next-day-btn").onclick = nextDay;
  document.getElementById("modal-ok").onclick = closeModal;

  // 初始化
  function init() {
    unlockAchievement("freshman");
    updateStats();
    renderAchievements();
    document.getElementById("next-day-btn").style.display = "block";

    document.body.addEventListener("click", () => {
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!bgmPlaying && gameState.soundEnabled && gameState.bgmEnabled) startBGM();
    }, { once: true });
  }

  init();
})();