(function() {
    // 防止重复执行
    if (window.snakeGameInitialized) return;
    window.snakeGameInitialized = true;
    
    console.log('贪食蛇游戏正在初始化...');
    
    // 创建游戏容器
    const gameContainer = document.createElement('div');
    gameContainer.id = 'snake-game-container';
    gameContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 99999;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
        padding: 30px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        text-align: center;
        max-width: 800px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        font-family: 'Arial', sans-serif;
    `;
    
    // 创建游戏标题
    const title = document.createElement('h1');
    title.textContent = '🐍 离线贪食蛇游戏 (JS版本)';
    title.style.cssText = `
        color: white;
        margin-bottom: 20px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
    `;
    
    // 创建游戏信息区域
    const gameInfo = document.createElement('div');
    gameInfo.style.cssText = `
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
        color: white;
        font-size: 1.2em;
    `;
    
    const scoreDiv = document.createElement('div');
    scoreDiv.className = 'score';
    scoreDiv.innerHTML = '得分: <span id="js-score">0</span>';
    scoreDiv.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: bold;
    `;
    
    const highScoreDiv = document.createElement('div');
    highScoreDiv.className = 'high-score';
    highScoreDiv.innerHTML = '最高分: <span id="js-high-score">0</span>';
    highScoreDiv.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        padding: 10px 20px;
        border-radius: 10px;
        font-weight: bold;
    `;
    
    gameInfo.appendChild(scoreDiv);
    gameInfo.appendChild(highScoreDiv);
    
    // 创建游戏画布容器
    const gameBoard = document.createElement('div');
    gameBoard.style.cssText = `
        background: #1a1a2e;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'js-game-canvas';
    canvas.style.cssText = `
        display: block;
        background: #16213e;
    `;
    
    gameBoard.appendChild(canvas);
    
    // 创建控制按钮
    const controls = document.createElement('div');
    controls.style.cssText = `
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-bottom: 20px;
        flex-wrap: wrap;
    `;
    
    const startBtn = document.createElement('button');
    startBtn.id = 'js-start-btn';
    startBtn.textContent = '开始游戏';
    
    const pauseBtn = document.createElement('button');
    pauseBtn.id = 'js-pause-btn';
    pauseBtn.textContent = '暂停游戏';
    
    const restartBtn = document.createElement('button');
    restartBtn.id = 'js-restart-btn';
    restartBtn.textContent = '重新开始';
    
    const closeBtn = document.createElement('button');
    closeBtn.id = 'js-close-btn';
    closeBtn.textContent = '关闭游戏';
    closeBtn.style.background = 'linear-gradient(45deg, #6c757d, #495057)';
    
    // 按钮通用样式
    [startBtn, pauseBtn, restartBtn, closeBtn].forEach(btn => {
        btn.style.cssText = `
            background: linear-gradient(45deg, #ff6b6b, #ee5a24);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 50px;
            font-size: 1.1em;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(238, 90, 36, 0.4);
            min-width: 120px;
        `;
    });
    
    controls.appendChild(startBtn);
    controls.appendChild(pauseBtn);
    controls.appendChild(restartBtn);
    controls.appendChild(closeBtn);
    
    // 创建移动控制按钮
    const mobileControls = document.createElement('div');
    mobileControls.id = 'js-mobile-controls';
    mobileControls.style.cssText = `
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 10px;
        margin-top: 20px;
        justify-items: center;
        max-width: 200px;
        margin-left: auto;
        margin-right: auto;
    `;
    
    const upBtn = document.createElement('button');
    upBtn.id = 'js-up-btn';
    upBtn.textContent = '↑';
    upBtn.style.cssText = `
        grid-column: 2;
        grid-row: 1;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        font-size: 1.5em;
        padding: 0;
    `;
    
    const leftBtn = document.createElement('button');
    leftBtn.id = 'js-left-btn';
    leftBtn.textContent = '←';
    leftBtn.style.cssText = `
        grid-column: 1;
        grid-row: 2;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        font-size: 1.5em;
        padding: 0;
    `;
    
    const rightBtn = document.createElement('button');
    rightBtn.id = 'js-right-btn';
    rightBtn.textContent = '→';
    rightBtn.style.cssText = `
        grid-column: 3;
        grid-row: 2;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        font-size: 1.5em;
        padding: 0;
    `;
    
    const downBtn = document.createElement('button');
    downBtn.id = 'js-down-btn';
    downBtn.textContent = '↓';
    downBtn.style.cssText = `
        grid-column: 2;
        grid-row: 3;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        font-size: 1.5em;
        padding: 0;
    `;
    
    // 方向按钮通用样式
    [upBtn, leftBtn, rightBtn, downBtn].forEach(btn => {
        btn.style.cssText += `
            background: linear-gradient(45deg, #4a90e2, #357abd);
            color: white;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(53, 122, 189, 0.4);
        `;
    });
    
    mobileControls.appendChild(upBtn);
    mobileControls.appendChild(leftBtn);
    mobileControls.appendChild(rightBtn);
    mobileControls.appendChild(downBtn);
    
    // 创建游戏说明
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        background: rgba(255, 255, 255, 0.1);
        padding: 20px;
        border-radius: 10px;
        color: white;
        margin-top: 20px;
        text-align: left;
    `;
    
    const instructionsTitle = document.createElement('h3');
    instructionsTitle.textContent = '游戏说明';
    instructionsTitle.style.cssText = `
        margin-bottom: 10px;
        color: #ffd700;
        text-align: center;
    `;
    
    const instructionsList = document.createElement('ul');
    instructionsList.style.cssText = `
        list-style: none;
        padding-left: 0;
    `;
    
    const instructionsItems = [
        '使用 <strong>方向键 (↑ ↓ ← →)</strong> 或点击屏幕上的方向按钮控制蛇的移动',
        '吃到红色食物可以增加长度和得分',
        '撞到墙壁或自己的身体游戏结束',
        '按 <strong>空格键</strong> 可以暂停/继续游戏',
        '游戏完全离线运行，无需网络连接'
    ];
    
    instructionsItems.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = item;
        li.style.cssText = `
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
        `;
        li.innerHTML = '• ' + item;
        instructionsList.appendChild(li);
    });
    
    instructions.appendChild(instructionsTitle);
    instructions.appendChild(instructionsList);
    
    // 创建游戏结束界面
    const gameOver = document.createElement('div');
    gameOver.id = 'js-game-over';
    gameOver.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: none;
        justify-content: center;
        align-items: center;
        z-index: 100000;
    `;
    
    const gameOverContent = document.createElement('div');
    gameOverContent.style.cssText = `
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        max-width: 400px;
        width: 90%;
    `;
    
    const gameOverTitle = document.createElement('h2');
    gameOverTitle.textContent = '游戏结束!';
    gameOverTitle.style.cssText = `
        color: #ff6b6b;
        margin-bottom: 20px;
    `;
    
    const finalScore = document.createElement('p');
    finalScore.innerHTML = '最终得分: <span id="js-final-score">0</span>';
    finalScore.style.marginBottom = '10px';
    
    const finalHighScore = document.createElement('p');
    finalHighScore.innerHTML = '最高分: <span id="js-final-high-score">0</span>';
    finalHighScore.style.marginBottom = '20px';
    
    const playAgainBtn = document.createElement('button');
    playAgainBtn.id = 'js-play-again-btn';
    playAgainBtn.textContent = '再玩一次';
    playAgainBtn.style.cssText = `
        background: linear-gradient(45deg, #ff6b6b, #ee5a24);
        color: white;
        border: none;
        padding: 12px 30px;
        border-radius: 50px;
        font-size: 1.1em;
        cursor: pointer;
        font-weight: bold;
    `;
    
    gameOverContent.appendChild(gameOverTitle);
    gameOverContent.appendChild(finalScore);
    gameOverContent.appendChild(finalHighScore);
    gameOverContent.appendChild(playAgainBtn);
    gameOver.appendChild(gameOverContent);
    
    // 组装游戏容器
    gameContainer.appendChild(title);
    gameContainer.appendChild(gameInfo);
    gameContainer.appendChild(gameBoard);
    gameContainer.appendChild(controls);
    gameContainer.appendChild(mobileControls);
    gameContainer.appendChild(instructions);
    
    // 添加到页面
    document.body.appendChild(gameContainer);
    document.body.appendChild(gameOver);
    
    // 游戏配置
    const GRID_SIZE = 20;
    const GAME_SPEED = 150;
    const CANVAS_WIDTH = 600;
    const CANVAS_HEIGHT = 400;
    
    // 游戏状态
    let snake = [];
    let food = {};
    let direction = 'right';
    let nextDirection = 'right';
    let gameInterval;
    let score = 0;
    let highScore = localStorage.getItem('snakeHighScore') || 0;
    let isPaused = false;
    let isGameOver = false;
    
    // 获取DOM元素
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('js-score');
    const highScoreElement = document.getElementById('js-high-score');
    const finalScoreElement = document.getElementById('js-final-score');
    const finalHighScoreElement = document.getElementById('js-final-high-score');
    
    // 设置画布大小
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // 初始化游戏
    function initGame() {
        // 初始化蛇
        snake = [
            {x: 5, y: 10},
            {x: 4, y: 10},
            {x: 3, y: 10}
        ];
        
        // 生成食物
        generateFood();
        
        // 重置状态
        direction = 'right';
        nextDirection = 'right';
        score = 0;
        isPaused = false;
        isGameOver = false;
        
        // 更新显示
        updateScore();
        gameOver.style.display = 'none';
        
        // 绘制初始状态
        draw();
    }
    
    // 生成食物
    function generateFood() {
        const maxX = Math.floor(CANVAS_WIDTH / GRID_SIZE) - 1;
        const maxY = Math.floor(CANVAS_HEIGHT / GRID_SIZE) - 1;
        
        let foodOnSnake;
        do {
            food = {
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY)
            };
            
            foodOnSnake = snake.some(segment => 
                segment.x === food.x && segment.y === food.y
            );
        } while (foodOnSnake);
    }
    
    // 绘制游戏
    function draw() {
        // 清空画布
        ctx.fillStyle = '#16213e';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        // 绘制网格线
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
        }
        
        for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
        }
        
        // 绘制蛇
        snake.forEach((segment, index) => {
            if (index === 0) {
                // 蛇头
                ctx.fillStyle = '#4ECDC4';
                ctx.fillRect(
                    segment.x * GRID_SIZE, 
                    segment.y * GRID_SIZE, 
                    GRID_SIZE, 
                    GRID_SIZE
                );
                
                // 蛇头边框
                ctx.strokeStyle = '#26A69A';
                ctx.lineWidth = 2;
                ctx.strokeRect(
                    segment.x * GRID_SIZE, 
                    segment.y * GRID_SIZE, 
                    GRID_SIZE, 
                    GRID_SIZE
                );
                
                // 蛇眼睛
                ctx.fillStyle = '#000';
                const eyeSize = GRID_SIZE / 5;
                
                // 根据方向绘制眼睛
                if (direction === 'right') {
                    ctx.fillRect(
                        segment.x * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        segment.y * GRID_SIZE + eyeSize,
                        eyeSize, eyeSize
                    );
                    ctx.fillRect(
                        segment.x * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        segment.y * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        eyeSize, eyeSize
                    );
                } else if (direction === 'left') {
                    ctx.fillRect(
                        segment.x * GRID_SIZE + eyeSize,
                        segment.y * GRID_SIZE + eyeSize,
                        eyeSize, eyeSize
                    );
                    ctx.fillRect(
                        segment.x * GRID_SIZE + eyeSize,
                        segment.y * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        eyeSize, eyeSize
                    );
                } else if (direction === 'up') {
                    ctx.fillRect(
                        segment.x * GRID_SIZE + eyeSize,
                        segment.y * GRID_SIZE + eyeSize,
                        eyeSize, eyeSize
                    );
                    ctx.fillRect(
                        segment.x * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        segment.y * GRID_SIZE + eyeSize,
                        eyeSize, eyeSize
                    );
                } else if (direction === 'down') {
                    ctx.fillRect(
                        segment.x * GRID_SIZE + eyeSize,
                        segment.y * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        eyeSize, eyeSize
                    );
                    ctx.fillRect(
                        segment.x * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        segment.y * GRID_SIZE + GRID_SIZE - eyeSize * 2,
                        eyeSize, eyeSize
                    );
                }
            } else {
                // 蛇身体
                ctx.fillStyle = '#45B7D1';
                ctx.fillRect(
                    segment.x * GRID_SIZE, 
                    segment.y * GRID_SIZE, 
                    GRID_SIZE, 
                    GRID_SIZE
                );
                
                // 身体边框
                ctx.strokeStyle = '#3498DB';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    segment.x * GRID_SIZE, 
                    segment.y * GRID_SIZE, 
                    GRID_SIZE, 
                    GRID_SIZE
                );
            }
        });
        
        // 绘制食物
        ctx.fillStyle = '#FF6B6B';
        ctx.beginPath();
        const foodX = food.x * GRID_SIZE + GRID_SIZE / 2;
        const foodY = food.y * GRID_SIZE + GRID_SIZE / 2;
        const foodRadius = GRID_SIZE / 2 - 2;
        ctx.arc(foodX, foodY, foodRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 食物光泽效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.beginPath();
        ctx.arc(foodX - foodRadius/3, foodY - foodRadius/3, foodRadius/3, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 更新游戏状态
    function update() {
        if (isPaused || isGameOver) return;
        
        // 更新方向
        direction = nextDirection;
        
        // 计算新的蛇头位置
        const head = {...snake[0]};
        
        switch (direction) {
            case 'up':
                head.y -= 1;
                break;
            case 'down':
                head.y += 1;
                break;
            case 'left':
                head.x -= 1;
                break;
            case 'right':
                head.x += 1;
                break;
        }
        
        // 检查是否撞墙
        if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE ||
            head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
            gameOverFunc();
            return;
        }
        
        // 检查是否撞到自己
        for (let i = 0; i < snake.length; i++) {
            if (snake[i].x === head.x && snake[i].y === head.y) {
                gameOverFunc();
                return;
            }
        }
        
        // 添加新的蛇头
        snake.unshift(head);
        
        // 检查是否吃到食物
        if (head.x === food.x && head.y === food.y) {
            // 增加分数
            score += 10;
            updateScore();
            
            // 生成新食物
            generateFood();
            
            // 播放声音效果
            playEatSound();
        } else {
            // 移除蛇尾
            snake.pop();
        }
        
        // 重绘游戏
        draw();
    }
    
    // 游戏结束
    function gameOverFunc() {
        isGameOver = true;
        clearInterval(gameInterval);
        
        // 更新最高分
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            updateScore();
        }
        
        // 显示游戏结束界面
        finalScoreElement.textContent = score;
        finalHighScoreElement.textContent = highScore;
        gameOver.style.display = 'flex';
        
        // 播放游戏结束声音
        playGameOverSound();
    }
    
    // 更新分数显示
    function updateScore() {
        scoreElement.textContent = score;
        highScoreElement.textContent = highScore;
    }
    
    // 开始游戏
    function startGame() {
        if (gameInterval) {
            clearInterval(gameInterval);
        }
        
        isPaused = false;
        pauseBtn.textContent = '暂停游戏';
        gameInterval = setInterval(update, GAME_SPEED);
    }
    
    // 暂停/继续游戏
    function togglePause() {
        if (isGameOver) return;
        
        isPaused = !isPaused;
        pauseBtn.textContent = isPaused ? '继续游戏' : '暂停游戏';
    }
    
    // 声音效果
    function playEatSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // 如果音频API不可用，静默失败
        }
    }
    
    function playGameOverSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 200;
            oscillator.type = 'sawtooth';
            
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // 如果音频API不可用，静默失败
        }
    }
    
    // 设置事件监听器
    function setupEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                    if (direction !== 'down') nextDirection = 'up';
                    e.preventDefault();
                    break;
                case 'ArrowDown':
                    if (direction !== 'up') nextDirection = 'down';
                    e.preventDefault();
                    break;
                case 'ArrowLeft':
                    if (direction !== 'right') nextDirection = 'left';
                    e.preventDefault();
                    break;
                case 'ArrowRight':
                    if (direction !== 'left') nextDirection = 'right';
                    e.preventDefault();
                    break;
                case ' ':
                    togglePause();
                    e.preventDefault();
                    break;
                case 'Enter':
                    if (isGameOver) {
                        initGame();
                        startGame();
                    }
                    break;
            }
        });
        
        // 按钮事件
        startBtn.addEventListener('click', () => {
            if (!gameInterval) {
                initGame();
                startGame();
            }
        });
        
        pauseBtn.addEventListener('click', togglePause);
        
        restartBtn.addEventListener('click', () => {
            initGame();
            if (!isPaused) {
                startGame();
            }
        });
        
        playAgainBtn.addEventListener('click', () => {
            initGame();
            startGame();
        });
        
        closeBtn.addEventListener('click', () => {
            if (gameInterval) {
                clearInterval(gameInterval);
            }
            document.body.removeChild(gameContainer);
            document.body.removeChild(gameOver);
            window.snakeGameInitialized = false;
        });
        
        // 移动控制按钮
        upBtn.addEventListener('click', () => {
            if (direction !== 'down') nextDirection = 'up';
        });
        
        downBtn.addEventListener('click', () => {
            if (direction !== 'up') nextDirection = 'down';
        });
        
        leftBtn.addEventListener('click', () => {
            if (direction !== 'right') nextDirection = 'left';
        });
        
        rightBtn.addEventListener('click', () => {
            if (direction !== 'left') nextDirection = 'right';
        });
        
        // 触摸设备优化
        let touchStartX = 0;
        let touchStartY = 0;
        
        canvas.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            e.preventDefault();
        });
        
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });
        
        canvas.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            // 确定滑动方向
            if (Math.abs(dx) > Math.abs(dy)) {
                // 水平滑动
                if (dx > 0 && direction !== 'left') {
                    nextDirection = 'right';
                } else if (dx < 0 && direction !== 'right') {
                    nextDirection = 'left';
                }
            } else {
                // 垂直滑动
                if (dy > 0 && direction !== 'up') {
                    nextDirection = 'down';
                } else if (dy < 0 && direction !== 'down') {
                    nextDirection = 'up';
                }
            }
            
            e.preventDefault();
        });
        
        // 防止页面滚动
        document.addEventListener('touchmove', (e) => {
            if (e.target === canvas || e.target.closest('#js-mobile-controls')) {
                e.preventDefault();
            }
        }, { passive: false });
    }
    
    // 初始化游戏
    function init() {
        // 初始化游戏状态
        initGame();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 更新最高分显示
        updateScore();
        
        // 绘制初始状态
        draw();
        
        console.log('贪食蛇游戏已初始化！使用方向键控制，空格键暂停。');
    }
    
    // 开始初始化
    init();
})();