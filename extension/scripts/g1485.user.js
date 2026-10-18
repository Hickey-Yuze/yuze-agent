(function() {
  try {
    // 随机选择一个脚本（1-4）
    const randomScript = Math.floor(Math.random() * 4) + 1;
    console.log(`🎲 随机到脚本 #${randomScript}`);

    // 清理之前的脚本效果
    const cleanup = () => {
      document.querySelectorAll('.random-script-overlay').forEach(el => el.remove());
      document.body.style.cssText = document.body.getAttribute('data-original-style') || '';
    };

    // 保存原始样式
    if (!document.body.hasAttribute('data-original-style')) {
      document.body.setAttribute('data-original-style', document.body.style.cssText);
    }

    // 脚本1: Windows 95 风格
    const windows95Style = () => {
      cleanup();
      const style = document.createElement('style');
      style.className = 'random-script-overlay';
      style.textContent = `
        * { 
          font-family: "MS Sans Serif", "Microsoft Sans Serif", sans-serif !important; 
          cursor: default !important;
        }
        body { 
          background: #008080 !important; 
        }
        a, button, [role="button"], input[type="submit"], input[type="button"] {
          cursor: pointer !important;
        }
        input, textarea, select {
          cursor: text !important;
        }
        button, input, select, textarea { 
          background: #c0c0c0 !important; 
          border: 2px outset #fff !important; 
          box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff !important;
          border-radius: 0 !important;
        }
        div[class*="rounded"], div[class*="shadow"] {
          background: #c0c0c0 !important;
          border: 2px outset #fff !important;
          box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf !important;
          border-radius: 0 !important;
        }
      `;
      document.head.appendChild(style);
      
      const banner = document.createElement('div');
      banner.className = 'random-script-overlay';
      banner.innerHTML = `
        <div style="position:fixed;top:0;left:0;right:0;background:linear-gradient(90deg,#000080,#1084d0);color:#fff;padding:4px 8px;font-size:14px;font-weight:bold;z-index:999999;display:flex;align-items:center;gap:8px;">
          <span style="background:#c0c0c0;color:#000;padding:2px 6px;border:1px outset #fff;">💾</span>
          Windows 95 Mode Activated
        </div>
      `;
      document.body.appendChild(banner);
    };

    // 脚本2: 打地鼠游戏
    const whackAMoleGame = () => {
      cleanup();
      const taunts = ['打我呀~', '来啊', '笨蛋~', '太慢了', '哈哈哈', '就这?'];
      const hitPhrases = ['哎呦!', '好痛!', '你赢了!', '厉害!', '服了!'];
      
      const game = document.createElement('div');
      game.className = 'random-script-overlay';
      game.innerHTML = `
        <style>
          @keyframes floatIn{from{opacity:0;transform:translate(-50%,-50%) scale(.8)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
          @keyframes moleUp{from{bottom:-60px}to{bottom:15px}}
          @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
          .float-window{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:30px;padding:30px;box-shadow:0 25px 60px rgba(0,0,0,.5);z-index:999999;animation:floatIn .4s ease-out;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto}
          .hole{width:90px;height:90px;background:radial-gradient(circle at 30% 30%,#a0826d,#6b4423);border-radius:50%;position:relative;box-shadow:inset 0 6px 12px rgba(0,0,0,.6),0 3px 8px rgba(0,0,0,.3);cursor:pointer;transition:transform .1s;overflow:visible}
          .hole:active{transform:scale(.95)}
          .mole{position:absolute;bottom:-60px;left:50%;transform:translateX(-50%);font-size:40px;cursor:pointer;animation:moleUp .2s forwards;user-select:none;z-index:10}
          .taunt{position:absolute;bottom:100%;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#ff6b9d,#c44569);color:#fff;padding:5px 12px;border-radius:18px;font-size:12px;font-weight:bold;white-space:nowrap;box-shadow:0 4px 12px rgba(0,0,0,.4);animation:pulse 1s infinite;margin-bottom:6px;pointer-events:none}
          .taunt::after{content:'';position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#c44569}
        </style>
        <div class="float-window">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <div style="color:#fff;font-size:28px;font-weight:800;text-shadow:0 4px 20px rgba(0,0,0,.4)">🔨 打地鼠</div>
            <button id="close-float" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s" onmouseover="this.style.background='rgba(255,255,255,.3)'" onmouseout="this.style.background='rgba(255,255,255,.2)'">×</button>
          </div>
          <div style="display:flex;gap:15px;justify-content:center;margin-bottom:20px">
            <div style="background:rgba(255,255,255,.2);backdrop-filter:blur(10px);padding:10px 20px;border-radius:18px;color:#fff;font-size:20px;font-weight:bold;box-shadow:0 6px 20px rgba(0,0,0,.3)">
              <span style="color:#ffd700">⭐</span> <span id="mole-score">0</span>
            </div>
            <div style="background:rgba(255,255,255,.2);backdrop-filter:blur(10px);padding:10px 18px;border-radius:18px;color:#fff;font-size:18px;font-weight:bold;box-shadow:0 6px 20px rgba(0,0,0,.3)">
              ⏱️ <span id="time-left">10</span>s
            </div>
          </div>
          <div id="mole-grid" style="display:grid;grid-template-columns:repeat(3,90px);gap:18px;padding:20px;background:rgba(255,255,255,.1);border-radius:25px;backdrop-filter:blur(10px);box-shadow:0 12px 40px rgba(0,0,0,.3);margin-bottom:20px"></div>
          <button id="end-btn" style="width:100%;padding:12px;font-size:17px;background:rgba(255,255,255,.95);color:#667eea;border:none;border-radius:50px;cursor:pointer;font-weight:bold;box-shadow:0 8px 20px rgba(0,0,0,.25);transition:all .2s;opacity:0;pointer-events:none" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 12px 30px rgba(0,0,0,.35)'" onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 8px 20px rgba(0,0,0,.25)'">关闭</button>
        </div>
      `;
      document.body.appendChild(game);

      let score = 0, timeLeft = 10, gameActive = true;
      const grid = document.getElementById('mole-grid');
      const scoreEl = document.getElementById('mole-score');
      const timeEl = document.getElementById('time-left');
      const endBtn = document.getElementById('end-btn');
      
      for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.className = 'hole';
        grid.appendChild(hole);
      }

      const countdown = setInterval(() => {
        if (--timeLeft <= 0) {
          clearInterval(countdown);
          endGame();
        }
        timeEl.textContent = timeLeft;
      }, 1000);

      const showMole = () => {
        if (!gameActive) return;
        const holes = [...grid.children].filter(h => !h.querySelector('.mole'));
        if (!holes.length) return;
        
        const hole = holes[Math.floor(Math.random() * holes.length)];
        const mole = document.createElement('div');
        mole.className = 'mole';
        mole.innerHTML = `<div class="taunt">${taunts[Math.floor(Math.random() * taunts.length)]}</div>🐹`;
        hole.appendChild(mole);
        
        mole.onclick = (e) => {
          e.stopPropagation();
          score++;
          scoreEl.textContent = score;
          const taunt = mole.querySelector('.taunt');
          if (taunt) {
            taunt.textContent = hitPhrases[Math.floor(Math.random() * hitPhrases.length)];
            taunt.style.background = 'linear-gradient(135deg,#ffd700,#ffa500)';
            taunt.style.animation = 'none';
          }
          mole.innerHTML = mole.innerHTML.replace('🐹', '💫');
          setTimeout(() => mole.remove(), 300);
        };
        
        setTimeout(() => mole.remove(), 1200);
      };

      const moleInterval = setInterval(showMole, 600);

      const endGame = () => {
        gameActive = false;
        clearInterval(moleInterval);
        const ratings = [
          [0, '🥔 地鼠笑了'],
          [3, '🌱 初出茅庐'],
          [6, '⚡ 反应不错'],
          [9, '🔥 地鼠杀手'],
          [12, '👑 传奇猎手']
        ];
        const rating = ratings.reverse().find(([min]) => score >= min)[1];
        
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:#fff;padding:25px">
          <div style="font-size:42px;margin-bottom:12px">🎉</div>
          <div style="font-size:26px;font-weight:bold;margin-bottom:8px">游戏结束！</div>
          <div style="font-size:20px;margin-bottom:6px">得分: <span style="color:#ffd700">${score}</span></div>
          <div style="font-size:18px;color:#ffd700">${rating}</div>
        </div>`;
        
        endBtn.style.opacity = '1';
        endBtn.style.pointerEvents = 'auto';
      };

      const closeGame = () => game.remove();
      endBtn.onclick = closeGame;
      document.getElementById('close-float').onclick = closeGame;
    };

    // 脚本3: 今天吃什么转盘
    const foodWheel = () => {
      cleanup();
      const foods = ['🍕 披萨', '🍜 拉面', '🍱 寿司', '🍔 汉堡', '🌮 塔可', '🍛 咖喱', '🥘 小碗菜', '🍝 意面', '🥟 饺子', '🍲 土豆粉', '🥙 肉夹馍', '🍢 麻辣烫', '🥗 沙拉', '🍳 盖浇饭', '🌯 卷饼', '🥪 三明治'];
      
      const wheel = document.createElement('div');
      wheel.className = 'random-script-overlay';
      wheel.innerHTML = `
        <style>
          @keyframes wheelFloatIn{from{opacity:0;transform:translate(-50%,-50%) scale(.8)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
          .wheel-float{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#667eea,#764ba2);border-radius:30px;padding:35px;box-shadow:0 25px 60px rgba(0,0,0,.5);z-index:999999;animation:wheelFloatIn .4s ease-out;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto}
        </style>
        <div class="wheel-float">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:25px">
            <h1 style="color:#fff;font-size:36px;font-weight:bold;text-shadow:0 4px 12px rgba(0,0,0,0.3);margin:0;">🍽️ 今天吃什么？</h1>
            <button id="wheel-close-x" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:none;color:#fff;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-left:20px" onmouseover="this.style.background='rgba(255,255,255,.3)'" onmouseout="this.style.background='rgba(255,255,255,.2)'">×</button>
          </div>
          <div id="wheel-container" style="position:relative;width:350px;height:350px;margin:0 auto 25px">
            <canvas id="wheel-canvas" width="350" height="350" style="border-radius:50%;box-shadow:0 12px 40px rgba(0,0,0,0.4);"></canvas>
            <div id="wheel-pointer" style="position:absolute;top:-15px;left:50%;transform:translateX(-50%);font-size:35px;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.3));">🔻</div>
          </div>
          <button id="spin-btn" style="width:100%;padding:14px;font-size:20px;background:#fff;color:#667eea;border:none;border-radius:50px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,0.3);font-weight:bold;transition:all 0.3s;margin-bottom:12px" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">开始转动！</button>
          <button id="wheel-close-btn" style="width:100%;padding:10px;font-size:16px;background:rgba(255,255,255,0.2);color:#fff;border:2px solid #fff;border-radius:50px;cursor:pointer;transition:all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">关闭</button>
        </div>
      `;
      document.body.appendChild(wheel);

      const canvas = document.getElementById('wheel-canvas');
      const ctx = canvas.getContext('2d');
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B500', '#FF69B4', '#20B2AA', '#FFD700', '#FF6347', '#9370DB', '#32CD32', '#FF8C00'];
      
      let rotation = 0, spinning = false, animationId = null;
      
      const drawWheel = () => {
        const centerX = 175, centerY = 175, radius = 175;
        ctx.clearRect(0, 0, 350, 350);
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        
        const anglePerSlice = (Math.PI * 2) / foods.length;
        foods.forEach((food, i) => {
          ctx.beginPath();
          ctx.fillStyle = colors[i];
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, anglePerSlice * i, anglePerSlice * (i + 1));
          ctx.fill();
          ctx.save();
          ctx.rotate(anglePerSlice * i + anglePerSlice / 2);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(food, radius * 0.65, 5);
          ctx.restore();
        });
        ctx.restore();
      };
      
      drawWheel();

      const spinBtn = document.getElementById('spin-btn');
      
      spinBtn.onclick = () => {
        if (spinning) {
          spinning = false;
          cancelAnimationFrame(animationId);
          spinBtn.textContent = '开始转动！';
          
          const normalizedRotation = (rotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
          const pointerAngle = Math.PI * 1.5;
          const adjustedAngle = (pointerAngle - normalizedRotation + Math.PI * 2) % (Math.PI * 2);
          const sliceAngle = (Math.PI * 2) / foods.length;
          const selectedIndex = Math.floor(adjustedAngle / sliceAngle);
          const selectedFood = foods[selectedIndex];
          
          setTimeout(() => alert(`🎉 就吃 ${selectedFood} 吧！`), 300);
        } else {
          spinning = true;
          spinBtn.textContent = '停止！';
          
          let speed = 0.3;
          const animate = () => {
            if (!spinning) return;
            rotation += speed;
            drawWheel();
            animationId = requestAnimationFrame(animate);
          };
          animate();
        }
      };

      const closeWheel = () => {
        spinning = false;
        cancelAnimationFrame(animationId);
        wheel.remove();
      };
      
      document.getElementById('wheel-close-btn').onclick = closeWheel;
      document.getElementById('wheel-close-x').onclick = closeWheel;
    };

    // 脚本4: 答案之书
    const answerBook = () => {
      cleanup();
      const answers = [
        '✨ 是的，一定会实现', '🌟 前景光明', '💫 不妨一试', '🎯 时机已到',
        '🌈 答案就在你心中', '🔮 再等等看', '⏰ 时机未到', '🌙 保持耐心',
        '💭 换个角度思考', '🎲 随遇而安', '🌸 顺其自然', '⭐ 相信直觉'
      ];
      
      const book = document.createElement('div');
      book.className = 'random-script-overlay';
      book.innerHTML = `
        <style>
          @keyframes bookFloatIn{from{opacity:0;transform:translate(-50%,-50%) scale(.8)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}
          @keyframes bookFlip{0%{transform:rotateY(0)}50%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
          .book-float{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(135deg,#1e3c72,#2a5298);border-radius:30px;padding:35px;box-shadow:0 25px 60px rgba(0,0,0,.6);z-index:999999;animation:bookFloatIn .4s ease-out;font-family:system-ui,-apple-system,sans-serif;pointer-events:auto}
        </style>
        <div class="book-float">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <h1 style="color:#ffd700;font-size:36px;font-weight:bold;text-shadow:0 4px 12px rgba(0,0,0,0.5);margin:0;">📖 答案之书</h1>
            <button id="book-close-x" style="width:32px;height:32px;border-radius:50%;background:rgba(255,255,255,.2);border:none;color:#ffd700;font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin-left:20px" onmouseover="this.style.background='rgba(255,255,255,.3)'" onmouseout="this.style.background='rgba(255,255,255,.2)'">×</button>
          </div>
          <input id="question-input" placeholder="输入你的问题..." style="width:100%;max-width:350px;padding:14px 22px;font-size:16px;border:none;border-radius:50px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,0.3);outline:none;margin:0 auto 25px;display:block;background:rgba(255,255,255,0.95);" />
          <div id="book-cover" style="width:260px;height:340px;background:linear-gradient(135deg,#8b4513,#654321);border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform 0.3s;position:relative;overflow:hidden;margin:0 auto 25px" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
            <div style="position:absolute;inset:20px;border:3px solid #ffd700;border-radius:15px;"></div>
            <div id="book-text" style="color:#ffd700;font-size:24px;font-weight:bold;text-align:center;padding:30px;z-index:1;line-height:1.4;">点击获取答案</div>
          </div>
          <button id="book-close-btn" style="width:100%;padding:12px;font-size:16px;background:rgba(255,255,255,0.2);color:#fff;border:2px solid #ffd700;border-radius:50px;cursor:pointer;font-weight:bold;transition:all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.3)';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.2)';this.style.transform='translateY(0)'">关闭</button>
        </div>
      `;
      document.body.appendChild(book);

      const bookCover = document.getElementById('book-cover');
      const bookText = document.getElementById('book-text');
      const questionInput = document.getElementById('question-input');
      
      bookCover.onclick = () => {
        const question = questionInput.value;
        if (!question.trim()) {
          alert('💭 请先输入你的问题');
          return;
        }
        
        bookCover.style.animation = 'bookFlip 1s ease-in-out';
        bookText.textContent = '📖';
        bookText.style.fontSize = '70px';
        
        setTimeout(() => {
          const answer = answers[Math.floor(Math.random() * answers.length)];
          bookText.textContent = answer;
          bookText.style.fontSize = '22px';
          bookCover.style.animation = '';
        }, 500);
      };

      const closeBook = () => book.remove();
      document.getElementById('book-close-btn').onclick = closeBook;
      document.getElementById('book-close-x').onclick = closeBook;
    };

    // 执行对应的脚本
    const scripts = [windows95Style, whackAMoleGame, foodWheel, answerBook];
    scripts[randomScript - 1]();

    return {
      success: true,
      scriptNumber: randomScript,
      scriptName: ['Windows 95风格', '打地鼠游戏', '今天吃什么转盘', '答案之书'][randomScript - 1],
      timestamp: Date.now()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      stack: error.stack
    };
  }
})();