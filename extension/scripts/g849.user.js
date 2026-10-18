(function() {
    // --- 1. 基础设置 ---
    // 移除旧的 canvas (如果存在)
    const oldCanvas = document.getElementById('lumina-canvas');
    if (oldCanvas) oldCanvas.remove();

    const canvas = document.createElement('canvas');
    canvas.id = 'lumina-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none'; // 关键：允许点击穿透
    canvas.style.zIndex = '999999';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true }); // 优化 context
    let width, height;
    
    // 性能优化：使用 devicePixelRatio 确保清晰度，但限制最大像素比以防卡顿
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
    }
    window.addEventListener('resize', resize);
    resize();

    // --- 2. 交互状态 ---
    // 初始位置设为屏幕外，避免刚打开时闪现
    const mouse = { x: -100, y: -100, down: false };
    let isActive = true;

    // 快捷键 Cmd+I / Ctrl+I 开关
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
            e.preventDefault();
            isActive = !isActive;
            canvas.style.display = isActive ? 'block' : 'none';
        }
    });

    document.addEventListener('mousemove', (e) => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    });

    document.addEventListener('mousedown', (e) => {
        mouse.down = true;
        if (isActive) {
            // 触发点击波纹
            rippleSystem.spawn(mouse.x, mouse.y);
            // 触发粒子爆发
            particleSystem.explode(mouse.x, mouse.y);
            // 主角瞬间收缩反馈
            cursor.pulse();
        }
    });

    document.addEventListener('mouseup', () => {
        mouse.down = false;
    });

    // --- 3. 视觉组件 ---

    // 3.1 点击波纹 (模仿录屏软件)
    class Ripple {
        constructor() {
            this.active = false;
            this.x = 0;
            this.y = 0;
            this.radius = 0;
            this.maxRadius = 50;
            this.alpha = 1;
            this.lineWidth = 0;
        }

        spawn(x, y) {
            this.active = true;
            this.x = x;
            this.y = y;
            this.radius = 10;
            this.alpha = 1;
            this.lineWidth = 4;
        }

        update() {
            if (!this.active) return;
            this.radius += 2; // 扩散速度
            this.alpha -= 0.04; // 消失速度
            this.lineWidth -= 0.1;

            if (this.alpha <= 0) this.active = false;
        }

        draw(ctx) {
            if (!this.active) return;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 100, 100, ${this.alpha})`; // 醒目的红色波纹
            ctx.lineWidth = Math.max(0.1, this.lineWidth);
            ctx.stroke();
        }
    }

    class RippleSystem {
        constructor() {
            this.pool = [];
            for(let i=0; i<10; i++) this.pool.push(new Ripple());
        }
        spawn(x, y) {
            const r = this.pool.find(r => !r.active);
            if (r) r.spawn(x, y);
        }
        updateAndDraw(ctx) {
            for(let r of this.pool) {
                if (r.active) {
                    r.update();
                    r.draw(ctx);
                }
            }
        }
    }

    // 3.2 极简粒子 (性能优化版)
    class Particle {
        constructor() {
            this.active = false;
            this.x = 0; this.y = 0;
            this.vx = 0; this.vy = 0;
            this.life = 0;
            this.color = '';
        }
        spawn(x, y) {
            this.active = true;
            this.x = x; this.y = y;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.life = 1.0;
            // 随机颜色：金黄到橙红
            const hue = Math.random() * 40 + 340; // 340-380 (Red-Orange)
            this.color = `hsla(${hue}, 100%, 60%,`;
        }
        update() {
            if (!this.active) return;
            this.x += this.vx;
            this.y += this.vy;
            this.vy += 0.2; // 重力
            this.life -= 0.05; // 消失得快一点，减少渲染压力
            if (this.life <= 0) this.active = false;
        }
        draw(ctx) {
            if (!this.active) return;
            ctx.fillStyle = this.color + this.life + ')';
            // 用小矩形代替圆，渲染更快
            ctx.fillRect(this.x, this.y, 3, 3);
        }
    }

    class ParticleSystem {
        constructor() {
            this.pool = [];
            for(let i=0; i<50; i++) this.pool.push(new Particle());
        }
        explode(x, y) {
            let count = 0;
            for(let p of this.pool) {
                if (!p.active) {
                    p.spawn(x, y);
                    count++;
                    if(count >= 8) break; // 每次点击只产生8个粒子，足够了
                }
            }
        }
        updateAndDraw(ctx) {
            for(let p of this.pool) {
                if (p.active) {
                    p.update();
                    p.draw(ctx);
                }
            }
        }
    }

    // 3.3 主角：光标跟随器 (Cursor Follower)
    class Cursor {
        constructor() {
            this.x = width/2;
            this.y = height/2;
            this.targetX = width/2;
            this.targetY = height/2;
            this.radius = 15;
            this.scale = 1;
        }

        update() {
            // 极简跟随算法：指数平滑 (Exponential Smoothing)
            // 这种算法比弹簧更稳定，计算量更小，延迟感更低
            this.x += (mouse.x - this.x) * 0.2; // 0.2 = 响应速度，越大越快
            this.y += (mouse.y - this.y) * 0.2;

            // 恢复大小
            this.scale += (1 - this.scale) * 0.1;
        }

        pulse() {
            this.scale = 0.8; // 点击时缩小
        }

        draw(ctx) {
            // 绘制一个半透明的圆环，指示鼠标位置
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 0, 0.3)'; // 淡黄色填充
            ctx.fill();
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * this.scale, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 200, 0, 0.8)'; // 深黄色边框
            ctx.lineWidth = 2;
            ctx.stroke();

            // 中心点
            ctx.beginPath();
            ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 1)';
            ctx.fill();
        }
    }

    // --- 4. 主循环 ---
    const cursor = new Cursor();
    const rippleSystem = new RippleSystem();
    const particleSystem = new ParticleSystem();

    function animate() {
        if (!isActive) {
            requestAnimationFrame(animate);
            return;
        }

        // 清空画布
        ctx.clearRect(0, 0, width, height);

        // 更新并绘制所有组件
        cursor.update();
        cursor.draw(ctx);

        rippleSystem.updateAndDraw(ctx);
        particleSystem.updateAndDraw(ctx);

        requestAnimationFrame(animate);
    }

    // 启动
    animate();
    console.log("Aurora Ripple initialized. Press Cmd+I to toggle.");

})();