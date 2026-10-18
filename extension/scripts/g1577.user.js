// ═══════════════════════════════════════════════════════════
// 🌟 小醒派·星际觉醒 🌟
// ═══════════════════════════════════════════════════════════
// 欢迎来到小醒派的星际战场！
// 在这里，你将驾驶觉醒战机，穿梭于璀璨星河，
// 击退入侵的陨石军团，守护宇宙的和平！
// 
// 🎮 操作说明：
//    ← → 或 A D 键：左右移动战机
//    空格键：发射觉醒光波
//    P 键：暂停游戏
// 
// 💫 小醒派寄语：
//    "每一次觉醒，都是新的开始；
//     每一次挑战，都让你更强大。
//     勇敢的星际旅人，准备好迎接你的冒险了吗？"
// 
// 祝你玩得开心！—— 小醒派 ✨
// ═══════════════════════════════════════════════════════════

(function() {
    // 创建游戏容器
    const gameContainer = document.createElement('div');
    gameContainer.id = 'xiaoxingpai-game';
    gameContainer.innerHTML = `
        <style>
            #xiaoxingpai-game {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(180deg, #0a0a2e 0%, #1a1a4e 50%, #0a0a2e 100%);
                z-index: 999999;
                display: flex;
                flex-direction: column;
                align-items: center;
                font-family: 'Microsoft YaHei', sans-serif;
                overflow: hidden;
            }
            #game-header {
                width: 100%;
                padding: 15px 30px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                background: rgba(0,0,0,0.3);
                color: #fff;
                box-sizing: border-box;
            }
            #game-title {
                font-size: 24px;
                font-weight: bold;
                background: linear-gradient(90deg, #ffd700, #ff6b6b, #4ecdc4);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                text-shadow: 0 0 20px rgba(255,215,0,0.5);
            }
            #game-stats {
                display: flex;
                gap: 30px;
                font-size: 18px;
            }
            .stat {
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .stat-icon {
                font-size: 20px;
            }
            #game-canvas {
                border: 2px solid rgba(255,215,0,0.3);
                border-radius: 10px;
                box-shadow: 0 0 30px rgba(78,205,196,0.3);
            }
            #game-controls {
                margin-top: 20px;
                color: rgba(255,255,255,0.7);
                font-size: 14px;
                text-align: center;
            }
            #close-btn {
                position: absolute;
                top: 15px;
                right: 20px;
                width: 40px;
                height: 40px;
                border: none;
                background: rgba(255,107,107,0.8);
                color: white;
                font-size: 24px;
                border-radius: 50%;
                cursor: pointer;
                transition: all 0.3s;
                z-index: 1000000;
            }
            #close-btn:hover {
                background: #ff6b6b;
                transform: scale(1.1);
            }
            #start-screen, #game-over-screen {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                text-align: center;
                color: white;
                z-index: 10;
            }
            #start-screen h1, #game-over-screen h1 {
                font-size: 48px;
                margin-bottom: 20px;
                background: linear-gradient(90deg, #ffd700, #ff6b6b);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            #start-screen p, #game-over-screen p {
                font-size: 18px;
                margin-bottom: 30px;
                color: rgba(255,255,255,0.8);
                max-width: 400px;
            }
            .game-btn {
                padding: 15px 40px;
                font-size: 20px;
                border: none;
                border-radius: 30px;
                cursor: pointer;
                transition: all 0.3s;
                margin: 10px;
            }
            #start-btn {
                background: linear-gradient(90deg, #4ecdc4, #44a08d);
                color: white;
            }
            #restart-btn {
                background: linear-gradient(90deg, #ffd700, #ff6b6b);
                color: white;
            }
            .game-btn:hover {
                transform: scale(1.05);
                box-shadow: 0 5px 20px rgba(0,0,0,0.3);
            }
            .power-up-indicator {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 20px;
            }
            .power-item {
                padding: 8px 15px;
                background: rgba(0,0,0,0.5);
                border-radius: 20px;
                color: #ffd700;
                font-size: 14px;
            }
        </style>
        <button id="close-btn" onclick="document.getElementById('xiaoxingpai-game').remove()">×</button>
        <div id="game-header">
            <div id="game-title">🌟 小醒派·星际觉醒</div>
            <div id="game-stats">
                <div class="stat"><span class="stat-icon">💎</span><span id="score">0</span></div>
                <div class="stat"><span class="stat-icon">❤️</span><span id="lives">3</span></div>
                <div class="stat"><span class="stat-icon">🏆</span><span id="high-score">0</span></div>
            </div>
        </div>
        <canvas id="game-canvas"></canvas>
        <div id="game-controls">
            ← → 或 A D 移动 | 空格 发射 | P 暂停
        </div>
        <div id="start-screen">
            <h1>🌟 星际觉醒</h1>
            <p>欢迎来到小醒派的星际战场！驾驶觉醒战机，击退陨石军团，守护宇宙和平！</p>
            <p style="font-style: italic; color: #4ecdc4;">"每一次觉醒，都是新的开始"<br>—— 小醒派 ✨</p>
            <button id="start-btn" class="game-btn">开始冒险</button>
        </div>
        <div id="game-over-screen" style="display: none;">
            <h1>💫 任务结束</h1>
            <p>最终得分: <span id="final-score">0</span></p>
            <p id="new-record" style="color: #ffd700; display: none;">🎉 新纪录！</p>
            <button id="restart-btn" class="game-btn">再来一次</button>
        </div>
    `;
    document.body.appendChild(gameContainer);

    // 游戏主逻辑
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = Math.min(600, window.innerWidth - 40);
    canvas.height = Math.min(700, window.innerHeight - 200);

    // 游戏状态
    let gameState = {
        running: false,
        paused: false,
        score: 0,
        lives: 3,
        highScore: parseInt(localStorage.getItem('xiaoxingpai-highscore') || '0'),
        level: 1
    };

    // 玩家战机
    const player = {
        x: canvas.width / 2 - 25,
        y: canvas.height - 80,
        width: 50,
        height: 60,
        speed: 7,
        bullets: [],
        canShoot: true,
        shootCooldown: 150,
        powerLevel: 1
    };

    // 敌人和道具
    let enemies = [];
    let powerUps = [];
    let particles = [];
    let stars = [];

    // 按键状态
    const keys = {};

    // 初始化星星背景
    function initStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 0.5
            });
        }
    }

    // 绘制星星背景
    function drawStars() {
        ctx.fillStyle = '#fff';
        stars.forEach(star => {
            ctx.globalAlpha = Math.random() * 0.5 + 0.5;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = 0;
                star.x = Math.random() * canvas.width;
            }
        });
        ctx.globalAlpha = 1;
    }

    // 绘制玩家战机
    function drawPlayer() {
        // 战机主体
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        
        // 机身
        const gradient = ctx.createLinearGradient(0, -30, 0, 30);
        gradient.addColorStop(0, '#4ecdc4');
        gradient.addColorStop(0.5, '#44a08d');
        gradient.addColorStop(1, '#2c5f5d');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(-20, 25);
        ctx.lineTo(-10, 20);
        ctx.lineTo(-10, 30);
        ctx.lineTo(10, 30);
        ctx.lineTo(10, 20);
        ctx.lineTo(20, 25);
        ctx.closePath();
        ctx.fill();
        
        // 驾驶舱
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.ellipse(0, -5, 6, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 引擎火焰
        const flameHeight = 15 + Math.random() * 10;
        const flameGradient = ctx.createLinearGradient(0, 30, 0, 30 + flameHeight);
        flameGradient.addColorStop(0, '#ff6b6b');
        flameGradient.addColorStop(0.5, '#ffd700');
        flameGradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = flameGradient;
        ctx.beginPath();
        ctx.moveTo(-8, 30);
        ctx.lineTo(0, 30 + flameHeight);
        ctx.lineTo(8, 30);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    // 创建子弹
    function shoot() {
        if (!player.canShoot) return;
        
        const bulletCount = Math.min(player.powerLevel, 3);
        const spread = 15;
        
        for (let i = 0; i < bulletCount; i++) {
            const offset = (i - (bulletCount - 1) / 2) * spread;
            player.bullets.push({
                x: player.x + player.width / 2 - 3 + offset,
                y: player.y,
                width: 6,
                height: 15,
                speed: 12
            });
        }
        
        player.canShoot = false;
        setTimeout(() => player.canShoot = true, player.shootCooldown);
    }

    // 绘制子弹
    function drawBullets() {
        player.bullets.forEach((bullet, index) => {
            const gradient = ctx.createLinearGradient(bullet.x, bullet.y, bullet.x, bullet.y + bullet.height);
            gradient.addColorStop(0, '#ffd700');
            gradient.addColorStop(1, '#ff6b6b');
            
            ctx.fillStyle = gradient;
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 10;
            ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
            ctx.shadowBlur = 0;
            
            bullet.y -= bullet.speed;
            if (bullet.y < -bullet.height) {
                player.bullets.splice(index, 1);
            }
        });
    }

    // 创建敌人
    function createEnemy() {
        const types = [
            { width: 40, height: 40, speed: 2 + gameState.level * 0.3, health: 1, points: 10, color: '#ff6b6b' },
            { width: 50, height: 50, speed: 1.5 + gameState.level * 0.2, health: 2, points: 25, color: '#9b59b6' },
            { width: 60, height: 60, speed: 1 + gameState.level * 0.1, health: 3, points: 50, color: '#e74c3c' }
        ];
        
        const type = types[Math.floor(Math.random() * Math.min(types.length, gameState.level))];
        
        enemies.push({
            x: Math.random() * (canvas.width - type.width),
            y: -type.height,
            ...type,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1
        });
    }

    // 绘制敌人
    function drawEnemies() {
        enemies.forEach((enemy, index) => {
            ctx.save();
            ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
            enemy.rotation += enemy.rotationSpeed;
            ctx.rotate(enemy.rotation);
            
            // 陨石形状
            ctx.fillStyle = enemy.color;
            ctx.beginPath();
            const points = 8;
            for (let i = 0; i < points; i++) {
                const angle = (i / points) * Math.PI * 2;
                const radius = enemy.width / 2 * (0.7 + Math.random() * 0.3);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            
            // 陨石纹理
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(
                    (Math.random() - 0.5) * enemy.width * 0.6,
                    (Math.random() - 0.5) * enemy.height * 0.6,
                    enemy.width * 0.1,
                    0, Math.PI * 2
                );
                ctx.fill();
            }
            
            ctx.restore();
            
            enemy.y += enemy.speed;
            
            // 碰撞检测 - 子弹
            player.bullets.forEach((bullet, bIndex) => {
                if (bullet.x < enemy.x + enemy.width &&
                    bullet.x + bullet.width > enemy.x &&
                    bullet.y < enemy.y + enemy.height &&
                    bullet.y + bullet.height > enemy.y) {
                    
                    enemy.health--;
                    player.bullets.splice(bIndex, 1);
                    createParticles(bullet.x, bullet.y, '#ffd700', 5);
                    
                    if (enemy.health <= 0) {
                        createParticles(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.color, 15);
                        gameState.score += enemy.points;
                        updateUI();
                        enemies.splice(index, 1);
                    }
                }
            });
            
            // 碰撞检测 - 玩家
            if (enemy.x < player.x + player.width &&
                enemy.x + enemy.width > player.x &&
                enemy.y < player.y + player.height &&
                enemy.y + enemy.height > player.y) {
                
                createParticles(player.x + player.width/2, player.y + player.height/2, '#4ecdc4', 20);
                enemies.splice(index, 1);
                gameState.lives--;
                updateUI();
                
                if (gameState.lives <= 0) {
                    gameOver();
                }
            }
            
            // 移除超出屏幕的敌人
            if (enemy.y > canvas.height + enemy.height) {
                enemies.splice(index, 1);
            }
        });
    }

    // 创建粒子效果
    function createParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                size: Math.random() * 4 + 2,
                color: color,
                life: 1
            });
        }
    }

    // 绘制粒子
    function drawParticles() {
        particles.forEach((p, index) => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            
            if (p.life <= 0) {
                particles.splice(index, 1);
            }
        });
        ctx.globalAlpha = 1;
    }

    // 创建道具
    function createPowerUp(x, y) {
        if (Math.random() < 0.15) {
            const types = ['power', 'life', 'score'];
            powerUps.push({
                x: x,
                y: y,
                width: 30,
                height: 30,
                type: types[Math.floor(Math.random() * types.length)],
                speed: 2
            });
        }
    }

    // 绘制道具
    function drawPowerUps() {
        powerUps.forEach((pu, index) => {
            ctx.save();
            ctx.translate(pu.x + pu.width/2, pu.y + pu.height/2);
            
            let emoji, color;
            switch(pu.type) {
                case 'power': emoji = '⚡'; color = '#ffd700'; break;
                case 'life': emoji = '❤️'; color = '#ff6b6b'; break;
                case 'score': emoji = '💎'; color = '#4ecdc4'; break;
            }
            
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 0, 0);
            
            ctx.restore();
            
            pu.y += pu.speed;
            
            // 碰撞检测
            if (pu.x < player.x + player.width &&
                pu.x + pu.width > player.x &&
                pu.y < player.y + player.height &&
                pu.y + pu.height > player.y) {
                
                switch(pu.type) {
                    case 'power': player.powerLevel = Math.min(player.powerLevel + 1, 3); break;
                    case 'life': gameState.lives = Math.min(gameState.lives + 1, 5); break;
                    case 'score': gameState.score += 100; break;
                }
                createParticles(pu.x, pu.y, color, 10);
                updateUI();
                powerUps.splice(index, 1);
            }
            
            if (pu.y > canvas.height) {
                powerUps.splice(index, 1);
            }
        });
    }

    // 更新UI
    function updateUI() {
        document.getElementById('score').textContent = gameState.score;
        document.getElementById('lives').textContent = gameState.lives;
        document.getElementById('high-score').textContent = gameState.highScore;
    }

    // 游戏结束
    function gameOver() {
        gameState.running = false;
        
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('xiaoxingpai-highscore', gameState.highScore.toString());
            document.getElementById('new-record').style.display = 'block';
        } else {
            document.getElementById('new-record').style.display = 'none';
        }
        
        document.getElementById('final-score').textContent = gameState.score;
        document.getElementById('game-over-screen').style.display = 'block';
        updateUI();
    }

    // 游戏循环
    let enemySpawnTimer = 0;
    let levelTimer = 0;

    function gameLoop() {
        if (!gameState.running) return;
        if (gameState.paused) {
            requestAnimationFrame(gameLoop);
            return;
        }

        // 清空画布
        ctx.fillStyle = '#0a0a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制星星
        drawStars();

        // 玩家移动
        if ((keys['ArrowLeft'] || keys['KeyA']) && player.x > 0) {
            player.x -= player.speed;
        }
        if ((keys['ArrowRight'] || keys['KeyD']) && player.x < canvas.width - player.width) {
            player.x += player.speed;
        }
        if (keys['Space']) {
            shoot();
        }

        // 绘制游戏元素
        drawPlayer();
        drawBullets();
        drawEnemies();
        drawPowerUps();
        drawParticles();

        // 生成敌人
        enemySpawnTimer++;
        const spawnRate = Math.max(30, 60 - gameState.level * 5);
        if (enemySpawnTimer >= spawnRate) {
            createEnemy();
            enemySpawnTimer = 0;
        }

        // 关卡提升
        levelTimer++;
        if (levelTimer >= 600) { // 约10秒升一级
            gameState.level++;
            levelTimer = 0;
        }

        // 随机生成道具
        enemies.forEach((enemy, index) => {
            if (enemy.health <= 0) {
                createPowerUp(enemy.x, enemy.y);
            }
        });

        requestAnimationFrame(gameLoop);
    }

    // 开始游戏
    function startGame() {
        gameState = {
            running: true,
            paused: false,
            score: 0,
            lives: 3,
            highScore: gameState.highScore,
            level: 1
        };
        
        player.x = canvas.width / 2 - 25;
        player.y = canvas.height - 80;
        player.bullets = [];
        player.powerLevel = 1;
        
        enemies = [];
        powerUps = [];
        particles = [];
        enemySpawnTimer = 0;
        levelTimer = 0;
        
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('game-over-screen').style.display = 'none';
        
        updateUI();
        initStars();
        gameLoop();
    }

    // 事件监听
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyP' && gameState.running) {
            gameState.paused = !gameState.paused;
        }
        if (e.code === 'Space') {
            e.preventDefault();
        }
    });

    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);

    // 初始化
    document.getElementById('high-score').textContent = gameState.highScore;
    initStars();
})();