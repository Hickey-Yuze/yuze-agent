(function() {
  if (window.poopHeroGameLoaded) return;
  window.poopHeroGameLoaded = true;

  // --- 1. CSS 样式还原 (新增超级臭气提示框样式) ---
  const style = document.createElement('style');
  style.textContent = `
    #poop-game-container {
      position: fixed; top: 2%; left: 50%; transform: translateX(-50%);
      width: 880px; height: 95vh; overflow-y: auto; z-index: 1000000;
      background: #1a0a00; border: 3px solid #ffd700; border-radius: 25px;
      padding: 30px; color: #fff; font-family: 'Microsoft YaHei', sans-serif;
      box-shadow: 0 0 50px rgba(0,0,0,0.9); scrollbar-width: none;
    }
    #poop-game-container::-webkit-scrollbar { display: none; }
    
    .game-header { text-align: center; margin-bottom: 20px; }
    .game-title { 
      color: #ffd700; font-size: 42px; font-weight: bold; 
      text-shadow: 0 0 20px rgba(255, 215, 0, 0.8); 
    }
    
    /* 状态栏 */
    .stat-bar { 
      background: #2d1800; border: 2px solid #ffd700; border-radius: 15px;
      display: flex; justify-content: space-around; padding: 15px; margin-bottom: 20px;
    }
    .stat-item { font-size: 20px; font-weight: bold; color: #fff; }
    .val-green { color: #00ff00; margin-left: 5px; text-shadow: 0 0 5px #00ff00; }
    .val-yellow { color: #ffff00; text-shadow: 0 0 5px #ffff00; }
    .val-red { color: #ff0000; text-shadow: 0 0 5px #ff0000; }

    /* 画布区域 */
    .canvas-box { position: relative; width: 800px; margin: 0 auto; }
    #gameCanvas { 
      background: #3d2200; border: 2px solid #ffd700; border-radius: 12px; 
      display: block; cursor: none; box-shadow: inset 0 0 20px #000;
    }
    /* 超级臭气提示框 */
    #powerUpIndicator {
      position: absolute; top: 15px; right: 15px;
      background: rgba(0,0,0,0.9); border: 2px solid #00ff00;
      border-radius: 10px; padding: 8px 15px; z-index: 110;
      font-size: 16px; color: #00ff00; font-weight: bold;
      text-shadow: 0 0 8px #00ff00; display: none;
    }
    
    /* 游戏结束面板 */
    #gameOverPanel {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(5px);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      border: 3px solid #ffd700;
      border-radius: 12px;
      z-index: 100;
    }
    .over-text { color: #ff4500; font-size: 56px; font-weight: bold; text-shadow: 0 0 20px #ff0000; margin: 0; }

    /* 按钮组 */
    .btn-row { display: flex; justify-content: center; gap: 20px; margin: 25px 0; }
    .game-btn {
      background: linear-gradient(to bottom, #ff8c00, #d35400);
      border: 1px solid #ffd700; border-radius: 30px; color: white;
      padding: 12px 35px; font-size: 18px; font-weight: bold; cursor: pointer;
      box-shadow: 0 0 15px rgba(211, 84, 0, 0.6); transition: 0.3s;
    }
    .game-btn:hover { transform: scale(1.05); filter: brightness(1.2); box-shadow: 0 0 20px #ff8c00; }
    .btn-secondary { background: #555 !important; border-color: #999 !important; }

    /* 游戏说明区 */
    .info-panel { background: #2d1800; border-radius: 20px; padding: 25px; margin-top: 10px; }
    .info-title { color: #ffd700; font-size: 22px; font-weight: bold; text-align: center; margin-bottom: 20px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; font-size: 15px; color: #e0e0e0; }
    .info-item { display: flex; align-items: center; gap: 8px; }

    /* 底部提示框 (虚线) */
    .footer-note {
      border: 2px dashed #ffd700; border-radius: 15px; padding: 15px;
      margin-top: 25px; text-align: center; color: #ffd700; font-size: 13px; line-height: 1.6;
    }
    .close-corner { position: absolute; top: 15px; right: 25px; font-size: 30px; cursor: pointer; color: #ffd700; }
  `;
  document.head.appendChild(style);

  // --- 2. HTML 结构还原 (新增超级臭气提示框DOM) ---
  const container = document.createElement('div');
  container.id = 'poop-game-container';
  container.innerHTML = `
    <div class="close-corner" onclick="window.closeGame()">×</div>
    <div class="game-header">
      <span class="game-title">💩 大便超人 💩</span>
    </div>
    <div class="stat-bar">
      <div class="stat-item">得分: <span id="s_score" class="val-green">0</span></div>
      <div class="stat-item">生命值: <span id="s_lives" class="val-green">3</span></div>
      <div class="stat-item">等级: <span id="s_level" class="val-green">1</span></div>
      <div class="stat-item">臭气能量: <span id="s_power" class="val-green">100%</span></div>
    </div>
    
    <div class="canvas-box">
      <canvas id="gameCanvas" width="800" height="450"></canvas>
      <!-- 超级臭气提示框 -->
      <div id="powerUpIndicator">超级臭气模式激活!</div>
      <div id="gameOverPanel">
        <p class="over-text">GAME OVER</p>
        <div class="btn-row">
          <button class="game-btn" onclick="window.restartGame()">🔄 重新开始</button>
        </div>
      </div>
    </div>

    <div class="btn-row">
      <button class="game-btn" onclick="window.startGame()">开始游戏</button>
      <button class="game-btn" onclick="window.pauseGame()">暂停/继续</button>
      <button class="game-btn" onclick="window.restartGame()">重新开始</button>
      <button class="game-btn" onclick="window.useSuperPower()">超级臭气</button>
    </div>

    <div class="info-panel">
      <div class="info-title">游戏说明:</div>
      <div class="info-grid">
        <div class="info-item">💩 使用鼠标控制大便超人移动</div>
        <div class="info-item">💩 自动发射臭气波攻击敌人</div>
        <div class="info-item">💩 击中苍蝇10分,卫生纸15分,马桶刷20分</div>
        <div class="info-item">💩 每得100分升一级,敌人速度加快</div>
        <div class="info-item">💩 被敌人碰到损失1点生命值</div>
        <div class="info-item">💩 消耗50点能量激活超级臭气，持续5秒</div>
        <div class="info-item">💩 生命值为0时游戏结束</div>
        <div class="info-item">💩 按空格键暂停/按P键快速激活超级臭气</div>
      </div>
    </div>

     <div class="footer-note">
      💡 如何保存和运行游戏:<br/>
      点击技炉链接窗口右上角【一键添加】即可保存这个技炉，快去试试吧
    </div>
  `;
  document.body.appendChild(container);

  // --- 3. 游戏核心逻辑 (新增完整超级臭气功能) ---
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('gameOverPanel');
  const powerUpIndicator = document.getElementById('powerUpIndicator'); // 超级臭气提示框
  
  // 游戏状态新增超级臭气相关属性
  let game = { 
    running: false, score: 0, lives: 3, level: 1, 
    power: 100, lastSpawn: 0, lastShot: 0,
    powerUpActive: false, // 超级臭气是否激活
    powerUpTime: 0,      // 超级臭气激活时间
    lastPowerRecover: 0  // 能量最后恢复时间
  };
  let player = { x: 400, y: 390 };
  let bullets = [], enemies = [], mouseX = 400;

  window.startGame = () => { if(game.lives > 0) { game.running = true; overlay.style.display = 'none'; } };
  window.pauseGame = () => { if(game.lives > 0) game.running = !game.running; };
  window.restartGame = () => {
    game = { 
      running: true, score: 0, lives: 3, level: 1, power: 100, 
      lastSpawn: 0, lastShot: 0, powerUpActive: false, powerUpTime: 0, lastPowerRecover:0 
    };
    bullets = []; enemies = [];
    overlay.style.display = 'none';
    powerUpIndicator.style.display = 'none'; // 重置提示框
    updateUI();
  };
  window.closeGame = () => { container.remove(); style.remove(); window.poopHeroGameLoaded = false; };
  // 超级臭气激活方法
  window.useSuperPower = () => { 
    if(game.power >= 50 && !game.powerUpActive && game.running && game.lives>0) { 
      game.power -= 50;          // 消耗50点能量
      game.powerUpActive = true; // 激活超级模式
      game.powerUpTime = Date.now(); // 记录激活时间
      powerUpIndicator.style.display = 'block'; // 显示提示框
      updateUI();
      // 5秒后自动关闭超级模式
      setTimeout(() => {
        if(game.powerUpActive && Date.now() - game.powerUpTime > 5000) {
          game.powerUpActive = false;
          powerUpIndicator.style.display = 'none';
        }
      }, 5000);
    } 
  };

  // 更新UI：新增能量颜色渐变(绿→黄→红)
  function updateUI() {
    const powerEl = document.getElementById('s_power');
    document.getElementById('s_score').innerText = game.score;
    document.getElementById('s_lives').innerText = game.lives;
    document.getElementById('s_level').innerText = game.level;
    powerEl.innerText = Math.floor(game.power) + '%';
    
    // 能量颜色根据数值变化
    if(game.power < 30) {
      powerEl.className = 'val-red';
    } else if(game.power < 60) {
      powerEl.className = 'val-yellow';
    } else {
      powerEl.className = 'val-green';
    }
  }

  function gameLoop(time) {
    if (!document.getElementById('gameCanvas')) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 背景网格
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.05)';
    for(let i=0; i<canvas.width; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }

    if (game.running && game.lives > 0) {
      player.x += (mouseX - player.x) * 0.1;
      
      // 能量自动恢复：每100ms恢复0.5点，上限100
      if(time - game.lastPowerRecover > 100 && game.power < 100) {
        game.power = Math.min(100, game.power + 0.5);
        game.lastPowerRecover = time;
        updateUI();
      }

      // 自动射击：超级模式下子弹更大、速度更快
      if (time - game.lastShot > (game.powerUpActive ? 150 : 200)) {
        bullets.push({
          x: player.x, 
          y: player.y - 10,
          isPower: game.powerUpActive // 标记是否为超级子弹
        });
        game.lastShot = time;
        // 普通模式射击消耗1点能量，超级模式不消耗
        if(!game.powerUpActive) {
          game.power = Math.max(0, game.power - 1);
          updateUI();
        }
      }

      // 生成敌人
      if (time - game.lastSpawn > 1200 / (1 + game.level * 0.2)) {
        // 新增马桶刷敌人(🧹)，按概率生成：苍蝇40%、卫生纸40%、马桶刷20%
        const randomIcon = Math.random();
        let icon = '🦟';
        if(randomIcon > 0.4) icon = '🧻';
        if(randomIcon > 0.8) icon = '🧹';
        enemies.push({
          x: Math.random() * 740 + 30, y: -20, 
          speed: 2 + game.level * 0.4, 
          icon: icon,
          score: icon === '🦟' ? 10 : (icon === '🧻' ? 15 : 20) // 不同敌人不同得分
        });
        game.lastSpawn = time;
      }

      // 子弹移动：超级子弹速度更快
      bullets.forEach((b, bi) => {
        b.y -= b.isPower ? 15 : 10;
        if(b.y < 0) bullets.splice(bi, 1);
      });

      // 敌人移动 + 碰撞
      enemies.forEach((e, ei) => {
        e.y += e.speed;
        
        // 子弹击中：超级子弹范围更大(40)，普通子弹30
        bullets.forEach((b, bi) => {
          if (Math.hypot(e.x - b.x, e.y - b.y) < (b.isPower ? 40 : 30)) {
            enemies.splice(ei, 1); bullets.splice(bi, 1);
            game.score += e.score; // 按敌人类型加对应分数
            updateUI();
            // 击中敌人恢复5点能量
            game.power = Math.min(100, game.power + 5);
            if(game.score % 100 === 0) game.level++;
          }
        });
        
        // 碰到玩家
        if (Math.hypot(e.x - player.x, e.y - player.y) < 45) {
          enemies.splice(ei, 1);
          game.lives--; updateUI();
          if(game.lives <= 0) {
            game.running = false;
            overlay.style.display = 'flex';
          }
        }
        
        if(e.y > canvas.height + 20) enemies.splice(ei, 1);
      });

      // 超级模式5秒到期自动关闭
      if(game.powerUpActive && Date.now() - game.powerUpTime > 5000) {
        game.powerUpActive = false;
        powerUpIndicator.style.display = 'none';
      }
    }

    // 绘制玩家：超级模式下添加绿色发光特效
    ctx.font = "40px Arial";
    if(game.powerUpActive) {
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 20;
    }
    ctx.fillText("💩", player.x - 22, player.y + 15);
    ctx.shadowBlur = 0; // 重置阴影
    
    // 绘制子弹：超级子弹更大(10px)、绿色，普通子弹6px、金色
    bullets.forEach(b => {
      ctx.fillStyle = b.isPower ? "#00ff00" : "#ffd700";
      ctx.beginPath(); 
      ctx.arc(b.x, b.y, b.isPower ? 10 : 6, 0, Math.PI*2); 
      ctx.fill(); 
    });
    
    // 绘制敌人：不同敌人不同图标
    ctx.font = "28px Arial";
    enemies.forEach(e => { ctx.fillText(e.icon, e.x - 15, e.y + 15); });

    requestAnimationFrame(gameLoop);
  }

  // 鼠标控制
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = e.clientX - r.left;
  });

  // 键盘控制：空格暂停 + P键快速激活超级臭气
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); window.pauseGame(); }
    if (e.code === 'KeyP') { e.preventDefault(); window.useSuperPower(); }
  });    

  requestAnimationFrame(gameLoop);
  console.log("大便超人[完美还原版+超级臭气功能]已加载！");
})();