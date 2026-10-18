(function() {
  try {
    // 清理之前的脚本效果
    const cleanup = () => {
      document.querySelectorAll('.random-script-overlay').forEach(el => el.remove());
      document.body.style.cssText = document.body.getAttribute('data-original-style') || '';
    };

    // 保存原始样式
    if (!document.body.hasAttribute('data-original-style')) {
      document.body.setAttribute('data-original-style', document.body.style.cssText);
    }

    // 仅保留：今天吃什么转盘
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

    // 直接执行转盘脚本（不再随机）
    foodWheel();

    return {
      success: true,
      scriptName: '今天吃什么转盘',
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