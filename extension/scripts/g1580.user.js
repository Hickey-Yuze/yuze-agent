// 美食摇奖机 - CDP 脚本版本（紧凑版 + 逻辑修复）
(function() {
    'use strict';
    
    // 食物列表
    const foodItems = [
        "猪脚饭", "螺蛳粉", "麻辣烫", "沙县大酒店", "羊肉粉",
        "兰州牛肉面", "黄焖鸡", "汉堡", "炸鸡", "鲍鱼饭",
        "披萨", "小炒套餐", "新疆炒米粉", "麻辣香锅", "炒粉炒粿条",
        "云南米线", "炸串", "木桶饭", "蔬菜沙拉", "赛百味",
        "寿司", "三明治", "福鼎肉片", "面线糊", "烤肉筋卷饼",
        "蒸饺水饺", "冒菜", "盖浇饭", "生煎", "冰饭",
        "炖罐", "卤面", "咖喱饭", "窑鸡", "渔粉",
        "咸粥甜粥", "粉干", "牛滑", "片皮鸭", "重庆小面", "凉拌菜",
        "饭团", "肠粉", "鸡蛋灌饼", "杂粮煎饼", "冷面",
        "炒饭", "四果汤", "再摇一次"
    ];
    
    // 创建样式
    const style = document.createElement('style');
    style.textContent = `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 15px;
            color: #fff;
        }
        
        .container {
            max-width: 650px;
            width: 100%;
            background: rgba(25, 25, 35, 0.9);
            border-radius: 15px;
            padding: 20px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            text-align: center;
            border: 2px solid #4a6fa5;
        }
        
        h1 {
            color: #ffd166;
            margin-bottom: 20px;
            font-size: 1.8em;
            font-weight: bold;
            text-shadow: 0 0 10px rgba(255, 209, 102, 0.5);
        }
        
        .slot-machine {
            background: #2d3748;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
            border: 2px solid #4a6fa5;
        }
        
        .reels-container {
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .reel {
            width: 150px;
            height: 200px;
            background: #1a202c;
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            border: 2px solid #4a6fa5;
        }
        
        .reel-header {
            background: #4a6fa5;
            color: white;
            padding: 6px;
            font-weight: bold;
            font-size: 0.85em;
            border-bottom: 2px solid #ffd166;
        }
        
        .reel-content {
            height: 173px;
            position: relative;
            overflow: hidden;
        }
        
        .food-list {
            position: absolute;
            width: 100%;
            top: 0;
            left: 0;
        }
        
        .food-item {
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: #e2e8f0;
            border-bottom: 1px solid #4a5568;
            background: rgba(26, 32, 44, 0.9);
        }
        
        .food-item.highlight {
            background: #4a6fa5;
            color: white;
        }
        
        .food-item.special {
            background: #ff6b6b;
            color: white;
        }
        
        .indicator {
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 2px;
            background: #ffd166;
            z-index: 10;
        }
        
        .controls {
            margin-bottom: 15px;
        }
        
        .spin-btn {
            background: #ffd166;
            color: #1a1a2e;
            border: none;
            padding: 10px 30px;
            font-size: 1em;
            font-weight: bold;
            border-radius: 50px;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .spin-btn:hover:not(:disabled) {
            transform: scale(1.05);
        }
        
        .spin-btn:disabled {
            background: #4a5568;
            color: #a0aec0;
            cursor: not-allowed;
        }
        
        .result-container {
            background: rgba(26, 32, 44, 0.8);
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 15px;
        }
        
        .result-title {
            color: #ffd166;
            font-size: 1.1em;
            margin-bottom: 10px;
        }
        
        .result {
            font-size: 1.8em;
            color: white;
            font-weight: bold;
            min-height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px;
            background: rgba(74, 111, 165, 0.2);
            border-radius: 8px;
            border: 2px solid #ffd166;
        }
        
        .stats {
            display: flex;
            justify-content: space-around;
            padding: 12px;
            background: rgba(45, 55, 72, 0.8);
            border-radius: 12px;
        }
        
        .stat-item {
            text-align: center;
        }
        
        .stat-value {
            font-size: 1.5em;
            font-weight: bold;
            color: #ffd166;
        }
        
        .stat-label {
            color: #a0aec0;
            margin-top: 3px;
            font-size: 0.85em;
        }
        
        .food-menu {
            margin-top: 20px;
            background: rgba(26, 32, 44, 0.8);
            border-radius: 12px;
            padding: 15px;
        }
        
        .menu-title {
            color: #ffd166;
            font-size: 1em;
            margin-bottom: 10px;
            font-weight: bold;
        }
        
        .food-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
            gap: 8px;
            max-height: 150px;
            overflow-y: auto;
            padding: 8px;
        }
        
        .food-cell {
            background: rgba(74, 111, 165, 0.2);
            padding: 6px;
            border-radius: 4px;
            font-size: 0.8em;
            border: 1px solid #4a5568;
        }
        
        .food-cell.special {
            background: rgba(255, 107, 107, 0.2);
            color: #ff6b6b;
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
    
    // 创建 HTML 结构
    const container = document.createElement('div');
    container.className = 'container';
    container.innerHTML = `
        <h1>今天中午吃什么</h1>
        
        <div class="slot-machine">
            <div class="reels-container">
                <div class="reel">
                    <div class="reel-header">美食轮1</div>
                    <div class="reel-content">
                        <div class="indicator"></div>
                        <div class="food-list" id="reel1"></div>
                    </div>
                </div>
                
                <div class="reel">
                    <div class="reel-header">美食轮2</div>
                    <div class="reel-content">
                        <div class="indicator"></div>
                        <div class="food-list" id="reel2"></div>
                    </div>
                </div>
                
                <div class="reel">
                    <div class="reel-header">美食轮3</div>
                    <div class="reel-content">
                        <div class="indicator"></div>
                        <div class="food-list" id="reel3"></div>
                    </div>
                </div>
            </div>
            
            <div class="controls">
                <button class="spin-btn" id="spinBtn">开始摇奖</button>
            </div>
        </div>
        
        <div class="result-container">
            <div class="result-title">今日推荐：</div>
            <div class="result" id="result">等待摇奖...</div>
        </div>
        
        <div class="stats">
            <div class="stat-item">
                <div class="stat-value" id="spinCount">0</div>
                <div class="stat-label">摇奖次数</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="lastResult">-</div>
                <div class="stat-label">上次结果</div>
            </div>
            <div class="stat-item">
                <div class="stat-value" id="specialCount">0</div>
                <div class="stat-label">再摇一次</div>
            </div>
        </div>
        
        <div class="food-menu">
            <div class="menu-title">📋 全部美食选项 (49种)</div>
            <div class="food-grid" id="foodGrid"></div>
        </div>
    `;
    
    // 清空页面并添加容器
    document.body.innerHTML = '';
    document.body.appendChild(container);
    
    // 状态变量
    let isSpinning = false;
    let spinCount = 0;
    let specialCount = 0;
    let lastResult = "";
    
    // DOM元素
    const spinBtn = document.getElementById('spinBtn');
    const resultEl = document.getElementById('result');
    const spinCountEl = document.getElementById('spinCount');
    const lastResultEl = document.getElementById('lastResult');
    const specialCountEl = document.getElementById('specialCount');
    const foodGridEl = document.getElementById('foodGrid');
    
    // 滚轮元素
    const reels = [
        document.getElementById('reel1'),
        document.getElementById('reel2'),
        document.getElementById('reel3')
    ];
    
    // 滚轮状态
    const reelStates = [
        { speed: 0, position: 0, interval: null, selectedFood: '' },
        { speed: 0, position: 0, interval: null, selectedFood: '' },
        { speed: 0, position: 0, interval: null, selectedFood: '' }
    ];
    
    // 初始化食物菜单
    function initFoodGrid() {
        foodItems.forEach((food) => {
            const foodCell = document.createElement('div');
            foodCell.className = 'food-cell';
            
            if (food === "再摇一次") {
                foodCell.classList.add('special');
                foodCell.innerHTML = '<span style="color:#ff6b6b;">🎰</span> ' + food;
            } else {
                foodCell.textContent = food;
            }
            
            foodGridEl.appendChild(foodCell);
        });
    }
    
    // 初始化滚轮
    function initReels() {
        reels.forEach((reel) => {
            reel.innerHTML = '';
            
            for (let i = 0; i < 50; i++) {
                const foodIndex = i % foodItems.length;
                const foodItem = document.createElement('div');
                foodItem.className = 'food-item';
                foodItem.textContent = foodItems[foodIndex];
                
                if (foodItems[foodIndex] === "再摇一次") {
                    foodItem.classList.add('special');
                }
                
                reel.appendChild(foodItem);
            }
        });
    }
    
    // 开始滚轮动画
    function startReels() {
        reels.forEach((reel, index) => {
            const state = reelStates[index];
            
            state.speed = 30 + Math.random() * 20;
            state.position = 0;
            state.selectedFood = '';
            
            if (state.interval) {
                clearInterval(state.interval);
            }
            
            state.interval = setInterval(() => {
                state.position += state.speed;
                reel.style.transform = 'translateY(-' + state.position + 'px)';
                
                state.speed *= 0.98;
                
                if (state.speed < 0.5) {
                    clearInterval(state.interval);
                    state.interval = null;
                    
                    const itemHeight = 40;
                    const offset = state.position % itemHeight;
                    if (offset > itemHeight / 2) {
                        state.position += (itemHeight - offset);
                    } else {
                        state.position -= offset;
                    }
                    
                    reel.style.transform = 'translateY(-' + state.position + 'px)';
                    
                    // 获取当前滚轮选中的食物
                    const itemIndex = Math.round(state.position / itemHeight) % foodItems.length;
                    state.selectedFood = foodItems[itemIndex];
                    
                    highlightSelectedItem(reel, state.position);
                    checkAllReelsStopped();
                }
            }, 50);
        });
    }
    
    // 高亮选中的食物项
    function highlightSelectedItem(reel, position) {
        const items = reel.querySelectorAll('.food-item');
        const itemHeight = 40;
        const itemIndex = Math.round(position / itemHeight) % foodItems.length;
        
        items.forEach(item => {
            item.classList.remove('highlight');
        });
        
        if (items[itemIndex]) {
            items[itemIndex].classList.add('highlight');
        }
    }
    
    // 检查所有滚轮是否停止
    function checkAllReelsStopped() {
        const allStopped = reelStates.every(state => state.interval === null);
        
        if (allStopped) {
            // 从中间滚轮（索引1）获取最终结果
            const selectedFood = reelStates[1].selectedFood;
            
            setTimeout(() => {
                showResult(selectedFood);
            }, 500);
        }
    }
    
    // 显示结果
    function showResult(selectedFood) {
        resultEl.textContent = selectedFood;
        
        spinCount++;
        lastResult = selectedFood;
        
        if (selectedFood === "再摇一次") {
            specialCount++;
        }
        
        spinCountEl.textContent = spinCount;
        lastResultEl.textContent = selectedFood;
        specialCountEl.textContent = specialCount;
        
        isSpinning = false;
        spinBtn.disabled = false;
        
        console.log('摇奖结果：', selectedFood);
        console.log('美食轮1：', reelStates[0].selectedFood);
        console.log('美食轮2（最终结果）：', reelStates[1].selectedFood);
        console.log('美食轮3：', reelStates[2].selectedFood);
        
        if (selectedFood === "再摇一次") {
            setTimeout(() => {
                resultEl.textContent = "🎰 可以再次摇奖！";
            }, 2000);
        }
    }
    
    // 开始摇奖
    function spin() {
        if (isSpinning) return;
        
        isSpinning = true;
        spinBtn.disabled = true;
        resultEl.textContent = "摇奖中...";
        
        console.log('开始新一轮摇奖...');
        startReels();
    }
    
    // 事件监听
    spinBtn.addEventListener('click', spin);
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' && !isSpinning) {
            e.preventDefault();
            spin();
        }
    });
    
    // 初始化
    initReels();
    initFoodGrid();
    
    console.log('美食摇奖机已准备就绪！按空格键或点击按钮开始摇奖');
    console.log('最终结果将以"美食轮2"（中间滚轮）为准');
})();