(function() {
  // 清理旧游戏
  const oldGame = document.getElementById('relaxing-game-container');
  if (oldGame) oldGame.remove();

  const gameHTML = `
    <div id="relaxing-game-container" style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 2147483647; background: #000; padding: 4px; border-radius: 4px; box-shadow: 0 0 100px rgba(255, 0, 0, 0.8); border: 2px solid #ff0000; font-family: 'Courier New', monospace;">
      <div style="text-align: center; color: #f00; margin-bottom: 5px; background: #111; padding: 10px;">
        <h2 style="margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -1px; text-transform: uppercase;">⚠️ 别笑，你来你也到不了100分</h2>
        <div style="font-size: 16px; margin-top: 5px; color: #fff;">SCORE: <span id="game-score" style="color: #ff0000; font-size: 24px; font-weight: bold;">0</span></div>
        <button id="close-game" style="position: absolute; top: -10px; right: -10px; background: #f00; border: 2px solid #fff; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-weight: bold; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">✕</button>
      </div>
      <canvas id="game-canvas" width="500" height="400" style="background: #000; display: block; cursor: none;"></canvas>
      
      <!-- 游戏结束弹窗 -->
      <div id="game-over" style="display: none; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(20, 0, 0, 0.95); color: #f00; padding: 40px; border: 2px solid #f00; text-align: center; width: 80%;">
        <h3 style="margin: 0 0 20px 0; font-size: 40px; text-shadow: 2px 2px 0 #fff;">FAILED</h3>
        <p style="font-size: 24px; color: #fff; margin-bottom: 10px;">最终得分: <span id="final-score" style="color: #f00; font-weight: bold;">0</span></p>
        <p id="mock-msg" style="font-size: 14px; color: #888; margin-bottom: 30px; font-style: italic;">就这？</p>
        <button id="restart-game" style="background: #f00; border: none; color: black; padding: 15px 40px; font-size: 18px; font-weight: 900; cursor: pointer; text-transform: uppercase; letter-spacing: 2px; transition: transform 0.1s;">RETRY</button>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', gameHTML);

  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const scoreElement = document.getElementById('game-score');
  const gameOverDiv = document.getElementById('game-over');
  const finalScoreElement = document.getElementById('final-score');
  const mockMsg = document.getElementById('mock-msg');

  // === 变态参数配置 ===
  let score = 0;
  let gameRunning = true;
  const INITIAL_PADDLE_WIDTH = 60; // 初始就很短
  const MIN_PADDLE_WIDTH = 15;     // 最小缩到牙签一样细
  
  const paddle = {
    x: canvas.width / 2 - INITIAL_PADDLE_WIDTH / 2,
    y: canvas.height - 20,
    width: INITIAL_PADDLE_WIDTH,
    height: 8,
    color: '#fff'
  };

  const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 4, // 球极小，很难看清
    speed: 7,  // 初始速度
    dx: 5,
    dy: -5
  };

  // 砖块配置
  const brickRowCount = 8; // 密密麻麻的砖块
  const brickColumnCount = 10;
  const brickPadding = 2;
  const brickOffsetTop = 30;
  const brickOffsetLeft = 35;
  const brickWidth = (canvas.width - brickOffsetLeft * 2) / brickColumnCount;
  const brickHeight = 15;

  let bricks = [];

  function initBricks() {
    bricks = [];
    for (let c = 0; c < brickColumnCount; c++) {
      bricks[c] = [];
      for (let r = 0; r < brickRowCount; r++) {
        // 砖块颜色越往下越红，代表危险
        const redVal = 100 + (r * 20);
        bricks[c][r] = { 
          x: 0, 
          y: 0, 
          status: 1, 
          color: `rgb(${redVal}, 0, 0)` 
        };
      }
    }
  }
  initBricks();

  function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
  }

  function drawPaddle() {
    ctx.beginPath();
    ctx.rect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.fillStyle = paddle.color;
    ctx.fill();
    // 给板子加个红边，增加紧张感
    ctx.strokeStyle = '#f00';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.closePath();
  }

  function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        if (bricks[c][r].status === 1) {
          const brickX = c * brickWidth + brickOffsetLeft;
          const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
          bricks[c][r].x = brickX;
          bricks[c][r].y = brickY;
          ctx.beginPath();
          ctx.rect(brickX, brickY, brickWidth - brickPadding, brickHeight);
          ctx.fillStyle = bricks[c][r].color;
          ctx.fill();
          ctx.closePath();
        }
      }
    }
  }

  function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
      for (let r = 0; r < brickRowCount; r++) {
        const b = bricks[c][r];
        if (b.status === 1) {
          if (ball.x > b.x && ball.x < b.x + brickWidth && 
              ball.y > b.y && ball.y < b.y + brickHeight) {
            ball.dy = -ball.dy;
            b.status = 0;
            score += 10;
            scoreElement.textContent = score;
            
            // === 绝望机制：得分越高，板子越短 ===
            if (paddle.width > MIN_PADDLE_WIDTH) {
                paddle.width -= 1.5; // 每打一个砖块，板子缩短1.5px
                paddle.x += 0.75;    // 保持中心对齐视觉
                paddle.color = '#f00'; // 打中时板子闪红
                setTimeout(() => paddle.color = '#fff', 50);
            }

            // 球速微增
            const speedInc = 1.02;
            ball.dx *= speedInc;
            ball.dy *= speedInc;

            if (score >= 100 && score < 110) {
                 // 到达100分时嘲讽一下（如果真有人能到）
                 scoreElement.style.textShadow = "0 0 10px #fff";
            }
          }
        }
      }
    }
  }

  function showGameOver(msg) {
    finalScoreElement.textContent = score;
    // 根据分数给评语
    let m = "连100分都不到？别笑了。";
    if(score < 50) m = "你是来搞笑的吗？";
    else if(score < 100) m = "就差一点点... 骗你的，还差得远。";
    else if(score >= 100) m = "居然超过100分了？一定是运气。";
    
    mockMsg.textContent = m;
    gameOverDiv.style.display = 'block';
    canvas.style.cursor = 'default';
  }

  function update() {
    if (!gameRunning) return;

    // 留下一点残影，增加速度感
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    drawBricks();
    drawBall();
    drawPaddle();
    collisionDetection();

    ball.x += ball.dx;
    ball.y += ball.dy;

    // 墙壁反弹
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
      ball.dx = -ball.dx;
    }
    if (ball.y - ball.radius < 0) {
      ball.dy = -ball.dy;
    }

    // 死亡判定
    if (ball.y + ball.radius > canvas.height) {
      gameRunning = false;
      showGameOver();
      return;
    }

    // 挡板判定（要求极高精度）
    if (ball.y + ball.radius >= paddle.y && 
        ball.y - ball.radius <= paddle.y + paddle.height &&
        ball.x >= paddle.x && 
        ball.x <= paddle.x + paddle.width) {
        
        if (ball.dy > 0) {
            ball.dy = -ball.dy;
            
            // 每次接球也加速！
            ball.dx *= 1.05;
            ball.dy *= 1.05;

            // 根据击打位置大幅改变X速度（增加不可控性）
            let hitPoint = ball.x - (paddle.x + paddle.width/2);
            // 归一化 -1 到 1
            hitPoint = hitPoint / (paddle.width/2);
            
            // 疯狂的角度变化
            ball.dx = hitPoint * 8; 
        }
    }

    requestAnimationFrame(update);
  }

  // 鼠标移动处理
  canvas.addEventListener('mousemove', (e) => {
    if(!gameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    paddle.x = mouseX - paddle.width / 2;

    // 边界检查
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
      paddle.x = canvas.width - paddle.width;
    }
  });

  document.getElementById('close-game').addEventListener('click', () => {
    const container = document.getElementById('relaxing-game-container');
    if (container) container.remove();
  });

  document.getElementById('restart-game').addEventListener('click', () => {
    score = 0;
    scoreElement.textContent = '0';
    
    // 重置所有变态参数
    paddle.width = INITIAL_PADDLE_WIDTH;
    
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    // 随机初始方向
    ball.dx = (Math.random() > 0.5 ? 5 : -5);
    ball.dy = -5;
    
    gameRunning = true;
    gameOverDiv.style.display = 'none';
    canvas.style.cursor = 'none'; // 隐藏鼠标，增加沉浸感
    
    initBricks();
    update();
  });

  update();
  console.log('💀 绝望模式已启动。祝你好运。');
})();