(function() {
    console.log('可爱泡泡鱼游戏（带尾巴）启动...');
    
    // 防止重复执行
    if (window.cuteFishGameRunning) {
        console.log('游戏已在运行中');
        return;
    }
    window.cuteFishGameRunning = true;
    
    // 创建游戏容器
    const gameContainer = document.createElement('div');
    gameContainer.id = 'cuteFishGameContainer';
    gameContainer.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 999999;
        background: linear-gradient(135deg, #ffcce6 0%, #ccf2ff 50%, #e6ccff 100%);
        border-radius: 25px;
        box-shadow: 0 20px 60px rgba(255, 105, 180, 0.3), 
                    0 0 0 2px rgba(255, 182, 193, 0.2);
        overflow: hidden;
        font-family: 'Comic Sans MS', 'Segoe UI', sans-serif;
        min-width: 600px;
        min-height: 500px;
        resize: both;
        overflow: auto;
        max-width: 95vw;
        max-height: 95vh;
    `;
    
    // 创建游戏标题栏
    const titleBar = document.createElement('div');
    titleBar.style.cssText = `
        background: linear-gradient(90deg, #ff9ec0 0%, #ffb6c1 100%);
        color: white;
        padding: 20px 25px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: move;
        user-select: none;
        border-bottom: 3px solid rgba(255,255,255,0.3);
    `;
    
    const titleContent = document.createElement('div');
    titleContent.style.display = 'flex';
    titleContent.style.alignItems = 'center';
    titleContent.style.gap = '15px';
    
    const icon = document.createElement('div');
    icon.innerHTML = '🐠';
    icon.style.fontSize = '32px';
    
    const titleText = document.createElement('div');
    titleText.style.display = 'flex';
    titleText.style.flexDirection = 'column';
    
    const title = document.createElement('h2');
    title.textContent = '泡泡鱼乐园';
    title.style.margin = '0';
    title.style.fontSize = '24px';
    title.style.fontWeight = 'bold';
    title.style.color = '#ff69b4';
    title.style.textShadow = '2px 2px 0 rgba(255,255,255,0.8)';
    
    const subtitle = document.createElement('span');
    subtitle.textContent = '可爱小鱼大冒险';
    subtitle.style.fontSize = '12px';
    subtitle.style.color = 'rgba(255,255,255,0.9)';
    
    titleText.appendChild(title);
    titleText.appendChild(subtitle);
    
    titleContent.appendChild(icon);
    titleContent.appendChild(titleText);
    
    // 控制按钮
    const controls = document.createElement('div');
    controls.style.display = 'flex';
    controls.style.gap = '10px';
    controls.style.alignItems = 'center';
    
    const createControlBtn = (emoji, titleText, bgColor) => {
        const btn = document.createElement('button');
        btn.innerHTML = emoji;
        btn.title = titleText;
        btn.style.cssText = `
            background: ;
            border: 2px solid rgba(255,255,255,0.3);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 12px;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        `;
        btn.onmouseover = () => {
            btn.style.background = bgColor.replace('0.6', '0.8');
            btn.style.transform = 'scale(1.1)';
        };
        btn.onmouseout = () => {
            btn.style.background = bgColor;
            btn.style.transform = 'scale(1)';
        };
        return btn;
    };
    
    const smallBtn = createControlBtn('🔍', '小窗口', 'rgba(135, 206, 235, 0.6)');
    const mediumBtn = createControlBtn('📐', '中窗口', 'rgba(255, 182, 193, 0.6)');
    const largeBtn = createControlBtn('🔍➕', '大窗口', 'rgba(152, 251, 152, 0.6)');
    const closeBtn = createControlBtn('❌', '关闭', 'rgba(255, 99, 71, 0.6)');
    
    const sizeControls = document.createElement('div');
    sizeControls.style.display = 'flex';
    sizeControls.style.gap = '8px';
    sizeControls.style.marginRight = '15px';
    sizeControls.style.padding = '6px';
    sizeControls.style.background = 'rgba(255,255,255,0.2)';
    sizeControls.style.borderRadius = '15px';
    
    sizeControls.appendChild(smallBtn);
    sizeControls.appendChild(mediumBtn);
    sizeControls.appendChild(largeBtn);
    
    controls.appendChild(sizeControls);
    controls.appendChild(closeBtn);
    
    titleBar.appendChild(titleContent);
    titleBar.appendChild(controls);
    
    // 游戏主体
    const gameBody = document.createElement('div');
    gameBody.style.cssText = `
        display: flex;
        flex-direction: column;
        padding: 25px;
        gap: 20px;
        height: calc(100% - 88px);
        background: linear-gradient(180deg, #f0f8ff 0%, #fff0f5 100%);
    `;
    
    // 游戏画布容器
    const canvasContainer = document.createElement('div');
    canvasContainer.style.cssText = `
        flex: 1;
        background: linear-gradient(180deg, #87ceeb 0%, #b0e0e6 50%, #e0ffff 100%);
        border-radius: 20px;
        overflow: hidden;
        position: relative;
        min-height: 350px;
        border: 3px solid #add8e6;
    `;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'cuteFishGameCanvas';
    canvas.style.cssText = `
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
    `;
    
    canvasContainer.appendChild(canvas);
    
    // 信息面板
    const infoPanel = document.createElement('div');
    infoPanel.style.cssText = `
        background: linear-gradient(90deg, #ffd1dc 0%, #ffecf1 100%);
        border-radius: 18px;
        padding: 18px;
        display: flex;
        justify-content: space-around;
        align-items: center;
        border: 3px solid #ffb6c1;
    `;
    
    const createStatCard = (label, valueId, color, icon) => {
        const card = document.createElement('div');
        card.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 12px 24px;
            background: rgba(255,255,255,0.7);
            border-radius: 15px;
            border: 2px solid rgba(255,255,255,0.9);
            min-width: 140px;
        `;
        
        const iconDiv = document.createElement('div');
        iconDiv.textContent = icon;
        iconDiv.style.fontSize = '28px';
        
        const contentDiv = document.createElement('div');
        contentDiv.style.display = 'flex';
        contentDiv.style.flexDirection = 'column';
        contentDiv.style.gap = '4px';
        
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.cssText = `
            font-size: 12px;
            color: #ff69b4;
            font-weight: bold;
        `;
        
        const valueSpan = document.createElement('span');
        valueSpan.id = valueId;
        valueSpan.textContent = '0';
        valueSpan.style.cssText = `
            font-size: 26px;
            font-weight: 900;
            color: ;
        `;
        
        contentDiv.appendChild(labelSpan);
        contentDiv.appendChild(valueSpan);
        
        card.appendChild(iconDiv);
        card.appendChild(contentDiv);
        return card;
    };
    
    const scoreCard = createStatCard('泡泡糖', 'cuteFishScore', '#ff69b4', '🍭');
    const levelCard = createStatCard('等级', 'cuteFishLevel', '#32cd32', '⭐');
    const sizeCard = createStatCard('体型', 'cuteFishSize', '#ff4500', '📏');
    
    infoPanel.appendChild(scoreCard);
    infoPanel.appendChild(levelCard);
    infoPanel.appendChild(sizeCard);
    
    // 控制面板
    const controlPanel = document.createElement('div');
    controlPanel.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 24px;
        background: linear-gradient(90deg, #e6e6fa 0%, #f0f8ff 100%);
        border-radius: 18px;
        border: 3px solid #d8bfd8;
    `;
    
    const instruction = document.createElement('div');
    instruction.style.display = 'flex';
    instruction.style.alignItems = 'center';
    instruction.style.gap = '15px';
    
    const instructionIcon = document.createElement('div');
    instructionIcon.textContent = '💡';
    instructionIcon.style.fontSize = '32px';
    
    const instructionText = document.createElement('div');
    instructionText.style.display = 'flex';
    instructionText.style.flexDirection = 'column';
    instructionText.style.gap = '8px';
    
    const instructionTitle = document.createElement('span');
    instructionTitle.textContent = '游戏说明';
    instructionTitle.style.cssText = `
        font-size: 16px;
        font-weight: bold;
        color: #9370db;
    `;
    
    const instructionDesc = document.createElement('span');
    instructionDesc.textContent = '移动鼠标控制小鱼，吃泡泡糖和小鱼成长，躲避大鱼！';
    instructionDesc.style.cssText = `
        font-size: 13px;
        color: #696969;
        max-width: 380px;
        line-height: 1.5;
    `;
    
    instructionText.appendChild(instructionTitle);
    instructionText.appendChild(instructionDesc);
    
    instruction.appendChild(instructionIcon);
    instruction.appendChild(instructionText);
    
    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '15px';
    
    const createActionButton = (text, bgColor, hoverColor, emoji) => {
        const btn = document.createElement('button');
        btn.innerHTML = emoji ? ` ` : text;
        btn.style.cssText = `
            background: ;
            color: white;
            border: 3px solid rgba(255,255,255,0.5);
            padding: 14px 28px;
            border-radius: 15px;
            cursor: pointer;
            font-size: 15px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 6px 15px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            gap: 10px;
        `;
        
        btn.onmouseover = () => {
            btn.style.background = hoverColor;
            btn.style.transform = 'translateY(-3px)';
        };
        
        btn.onmouseout = () => {
            btn.style.background = bgColor;
            btn.style.transform = 'translateY(0)';
        };
        
        return btn;
    };
    
    const restartBtn = createActionButton('重新开始', '#ffb347', '#ff8c00', '🔄');
    const pauseBtn = createActionButton('暂停', '#ff6b6b', '#ff4757', '⏸️');
    
    btnContainer.appendChild(restartBtn);
    btnContainer.appendChild(pauseBtn);
    
    controlPanel.appendChild(instruction);
    controlPanel.appendChild(btnContainer);
    
    // 组装
    gameBody.appendChild(canvasContainer);
    gameBody.appendChild(infoPanel);
    gameBody.appendChild(controlPanel);
    
    gameContainer.appendChild(titleBar);
    gameContainer.appendChild(gameBody);
    
    document.body.appendChild(gameContainer);
    
    // 游戏变量
    let ctx;
    let gameRunning = true;
    let gamePaused = false;
    let score = 0;
    let level = 1;
    let playerSize = 25;
    let mouseX = 0;
    let mouseY = 0;
    let fish = [];
    let food = [];
    let gameLoopId;
    let tailWiggle = 0; // 尾巴摆动动画
    
    // 初始化画布
    function initCanvas() {
        canvas.width = canvasContainer.clientWidth;
        canvas.height = canvasContainer.clientHeight;
        ctx = canvas.getContext('2d');
    }
    
    // 玩家鱼
    const player = {
        x: 0,
        y: 0,
        size: playerSize,
        speed: 1.5,
        targetX: 0,
        targetY: 0
    };
    
    // 初始化游戏
    function initGame() {
        fish = [];
        food = [];
        score = 0;
        level = 1;
        playerSize = 25;
        player.size = playerSize;
        player.speed = 1.5;
        player.x = canvas.width / 2;
        player.y = canvas.height / 2;
        player.targetX = player.x;
        player.targetY = player.y;
        
        // 创建初始鱼群
        for (let i = 0; i < 15; i++) createFish('tiny');
        for (let i = 0; i < 10; i++) createFish('small');
        for (let i = 0; i < 5; i++) createFish('medium');
        for (let i = 0; i < 2; i++) createFish('large');
        
        // 创建食物
        for (let i = 0; i < 20; i++) createFood();
        
        updateGameInfo();
    }
    
    // 创建鱼
    function createFish(type) {
        let size, speed, color;
        
        switch(type) {
            case 'tiny':
                size = Math.random() * 5 + 5;
                speed = 1.0;
                color = '#98fb98';
                break;
            case 'small':
                size = Math.random() * 8 + 10;
                speed = 0.8;
                color = '#87ceeb';
                break;
            case 'medium':
                size = Math.random() * 10 + 20;
                speed = 0.6;
                color = '#ffa500';
                break;
            case 'large':
                size = Math.random() * 15 + 30;
                speed = 0.4;
                color = '#ff4500';
                break;
        }
        
        fish.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: size,
            speed: speed,
            color: color,
            direction: Math.random() * Math.PI * 2,
            type: type,
            tailWiggle: Math.random() * Math.PI * 2 // 每条鱼有自己的尾巴摆动
        });
    }
    
    // 创建食物
    function createFood() {
        food.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 6,
            color: '#ff69b4'
        });
    }
    
    // 更新游戏信息
    function updateGameInfo() {
        document.getElementById('cuteFishScore').textContent = score;
        document.getElementById('cuteFishLevel').textContent = level;
        document.getElementById('cuteFishSize').textContent = Math.round(player.size);
    }
    
    // 绘制玩家鱼（带尾巴）
    function drawPlayer() {
        ctx.save();
        ctx.translate(player.x, player.y);
        
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const angle = Math.atan2(dy, dx);
        ctx.rotate(angle);
        
        // 尾巴摆动动画
        tailWiggle += 0.1;
        const tailAngle = Math.sin(tailWiggle) * 0.3;
        
        // 绘制尾巴（心形尾巴）
        ctx.fillStyle = '#ff1493';
        ctx.save();
        ctx.rotate(tailAngle); // 尾巴摆动
        
        // 心形尾巴
        ctx.beginPath();
        ctx.moveTo(-player.size, 0);
        ctx.bezierCurveTo(
            -player.size - 20, -10,
            -player.size - 25, 5,
            -player.size - 15, 15
        );
        ctx.bezierCurveTo(
            -player.size - 5, 25,
            -player.size + 5, 15,
            -player.size, 0
        );
        ctx.bezierCurveTo(
            -player.size + 5, -15,
            -player.size - 5, -25,
            -player.size - 15, -15
        );
        ctx.bezierCurveTo(
            -player.size - 25, -5,
            -player.size - 20, 10,
            -player.size, 0
        );
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // 鱼身
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.ellipse(0, 0, player.size, player.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 鱼鳍
        ctx.fillStyle = '#ffb6c1';
        ctx.beginPath();
        ctx.ellipse(player.size * 0.3, -player.size * 0.4, player.size * 0.3, player.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(player.size * 0.3, player.size * 0.4, player.size * 0.3, player.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 鱼眼
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(player.size * 0.4, -player.size * 0.2, player.size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.arc(player.size * 0.45, -player.size * 0.2, player.size * 0.08, 0, Math.PI * 2);
        ctx.fill();
        
        // 嘴巴（微笑）
        ctx.strokeStyle = '#ff1493';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.size * 0.6, player.size * 0.1, player.size * 0.1, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // 绘制AI鱼（带尾巴）
    function drawFish(f) {
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.direction);
        
        // 尾巴摆动
        f.tailWiggle += 0.05;
        const tailAngle = Math.sin(f.tailWiggle) * 0.4;
        
        // 绘制尾巴
        ctx.fillStyle = f.color;
        ctx.save();
        ctx.rotate(tailAngle);
        
        // 三角形尾巴
        ctx.beginPath();
        ctx.moveTo(-f.size, 0);
        ctx.lineTo(-f.size - 15, -f.size * 0.4);
        ctx.lineTo(-f.size - 15, f.size * 0.4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
        
        // 鱼身
        ctx.beginPath();
        ctx.ellipse(0, 0, f.size, f.size * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // 鱼眼
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(f.size * 0.4, -f.size * 0.15, f.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(f.size * 0.45, -f.size * 0.15, f.size * 0.06, 0, Math.PI * 2);
        ctx.fill();
        
        // 大鱼有特殊标记
        if (f.type === 'large') {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(0, -f.size * 0.6, f.size * 0.12, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'white';
            ctx.font = 'bold 10px Comic Sans MS';
            ctx.textAlign = 'center';
            ctx.fillText('!', 0, -f.size * 0.55);
        }
        
        ctx.restore();
    }
    
    // 绘制食物
    function drawFood(f) {
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // 更新玩家
    function updatePlayer() {
        const dx = player.targetX - player.x;
        const dy = player.targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 2) {
            player.x += (dx / distance) * player.speed;
            player.y += (dy / distance) * player.speed;
        }
        
        player.x = Math.max(player.size, Math.min(canvas.width - player.size, player.x));
        player.y = Math.max(player.size, Math.min(canvas.height - player.size, player.y));
    }
    
    // 更新AI鱼（更新尾巴摆动）
    function updateFish() {
        for (let i = fish.length - 1; i >= 0; i--) {
            const f = fish[i];
            
            f.direction += (Math.random() - 0.5) * 0.1;
            f.tailWiggle += 0.05; // 更新尾巴摆动
            
            f.x += Math.cos(f.direction) * f.speed;
            f.y += Math.sin(f.direction) * f.speed;
            
            if (f.x < f.size || f.x > canvas.width - f.size) {
                f.direction = Math.PI - f.direction;
            }
            if (f.y < f.size || f.y > canvas.height - f.size) {
                f.direction = -f.direction;
            }
            
            const dx = player.x - f.x;
            const dy = player.y - f.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < (player.size + f.size) * 0.7) {
                const sizeRatio = player.size / f.size;
                
                if (sizeRatio > 1.4) {
                    player.size += f.size * 0.05;
                    score += Math.round(f.size * 5);
                    fish.splice(i, 1);
                    
                    if (Math.random() < 0.5) createFish('tiny');
                    else createFish('small');
                    
                    checkLevelUp();
                } else if (sizeRatio < 0.6) {
                    gameOver();
                    return;
                }
            }
        }
    }
    
    // 更新食物
    function updateFood() {
        for (let i = food.length - 1; i >= 0; i--) {
            const f = food[i];
            const dx = player.x - f.x;
            const dy = player.y - f.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.size + f.size) {
                player.size += 0.2;
                score += 1;
                food.splice(i, 1);
                createFood();
                checkLevelUp();
            }
        }
    }
    
    // 检查升级
    function checkLevelUp() {
        const newLevel = Math.floor((player.size - 25) / 30) + 1;
        
        if (newLevel > level) {
            level = newLevel;
            player.speed = Math.min(1.5 + level * 0.08, 2.5);
        }
    }
    
    // 游戏结束
    function gameOver() {
        gameRunning = false;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 240, 245, 0.95);
            border-radius: 20px;
            padding: 40px;
            z-index: 1000000;
            color: #ff69b4;
            text-align: center;
            min-width: 300px;
            border: 3px solid #ffb6c1;
        `;
        
        const title = document.createElement('h2');
        title.textContent = '游戏结束啦~';
        title.style.margin = '0 0 20px 0';
        title.style.fontSize = '28px';
        
        const stats = document.createElement('div');
        stats.style.cssText = `
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 25px 0;
        `;
        
        const createStat = (label, value, color) => {
            const div = document.createElement('div');
            const labelSpan = document.createElement('div');
            labelSpan.textContent = label;
            labelSpan.style.cssText = 'font-size: 12px; color: #ff69b4; margin-bottom: 5px;';
            
            const valueSpan = document.createElement('div');
            valueSpan.textContent = value;
            valueSpan.style.cssText = `font-size: 32px; font-weight: 800; color: ;`;
            
            div.appendChild(labelSpan);
            div.appendChild(valueSpan);
            return div;
        };
        
        stats.appendChild(createStat('最终得分', score, '#ff69b4'));
        stats.appendChild(createStat('最终大小', Math.round(player.size), '#ff4500'));
        stats.appendChild(createStat('最终等级', level, '#32cd32'));
        
        const playAgainBtn = document.createElement('button');
        playAgainBtn.textContent = '再玩一次';
        playAgainBtn.style.cssText = `
            background: #ff69b4;
            color: white;
            border: none;
            padding: 14px 40px;
            border-radius: 12px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 20px;
        `;
        
        playAgainBtn.onclick = () => {
            document.body.removeChild(modal);
            restartGame();
        };
        
        modal.appendChild(title);
        modal.appendChild(stats);
        modal.appendChild(playAgainBtn);
        document.body.appendChild(modal);
    }
    
    // 重新开始游戏
    function restartGame() {
        gameRunning = true;
        gamePaused = false;
        pauseBtn.innerHTML = '⏸️ 暂停';
        pauseBtn.style.background = '#ff6b6b';
        initGame();
    }
    
    // 游戏主循环
    function gameLoop() {
        if (!gameRunning || gamePaused) {
            gameLoopId = requestAnimationFrame(gameLoop);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        updatePlayer();
        updateFish();
        updateFood();
        
        food.forEach(drawFood);
        fish.forEach(drawFish);
        drawPlayer();
        
        // 随机生成新鱼和食物
        if (Math.random() < 0.01 && fish.length < 30) {
            createFish('tiny');
        }
        if (Math.random() < 0.02 && food.length < 25) {
            createFood();
        }
        
        updateGameInfo();
        gameLoopId = requestAnimationFrame(gameLoop);
    }
    
    // 事件监听
    canvas.addEventListener('mousemove', function(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        player.targetX = mouseX;
        player.targetY = mouseY;
    });
    
    // 按钮事件
    restartBtn.onclick = restartGame;
    
    pauseBtn.onclick = () => {
        gamePaused = !gamePaused;
        pauseBtn.innerHTML = gamePaused ? '▶️ 继续' : '⏸️ 暂停';
        pauseBtn.style.background = gamePaused ? '#32cd32' : '#ff6b6b';
    };
    
    // 大小控制
    smallBtn.onclick = () => {
        gameContainer.style.width = '500px';
        gameContainer.style.height = '400px';
        initCanvas();
    };
    
    mediumBtn.onclick = () => {
        gameContainer.style.width = '700px';
        gameContainer.style.height = '550px';
        initCanvas();
    };
    
    largeBtn.onclick = () => {
        gameContainer.style.width = '900px';
        gameContainer.style.height = '700px';
        initCanvas();
    };
    
    closeBtn.onclick = () => {
        document.body.removeChild(gameContainer);
        window.cuteFishGameRunning = false;
        if (gameLoopId) cancelAnimationFrame(gameLoopId);
    };
    
    // 可拖拽功能
    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;
    
    titleBar.addEventListener('mousedown', function(e) {
        isDragging = true;
        const rect = gameContainer.getBoundingClientRect();
        dragOffsetX = e.clientX - rect.left;
        dragOffsetY = e.clientY - rect.top;
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        e.preventDefault();
        gameContainer.style.left = (e.clientX - dragOffsetX) + 'px';
        gameContainer.style.top = (e.clientY - dragOffsetY) + 'px';
        gameContainer.style.transform = 'none';
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    
    // 初始化游戏
    initCanvas();
    initGame();
    gameLoopId = requestAnimationFrame(gameLoop);
    
    console.log('可爱泡泡鱼游戏（带尾巴）加载完成！');
})();