(function () {
    if (document.getElementById('Yuze-niudan-machine') || document.getElementById('Yuze-pet')) {
        return;
    }

    const STICKERS = [
        'https://p0.meituan.net/guangnian/0fb7d3cce2a52869ea0cc94e52091ea9318997.png',
        'https://p0.meituan.net/guangnian/ab400dd684c9e5c48a6a11a9fe84b45a369309.png',
        'https://p0.meituan.net/guangnian/d27cc0ef652b3ef14d799cfdb601ec86346667.png',
        'https://p0.meituan.net/guangnian/4d98a5db159c6a43f3849cef6ac2c288364819.png',
    ];

    const EGG_COLORS = [
        ['#ff9eb5', '#ff5286'],
        ['#ffe066', '#ffae00'],
        ['#a0e7e5', '#5bc0de'],
        ['#b8e0d2', '#7ac0a3'],
        ['#d4b3ff', '#9c6cff'],
        ['#ffb3ba', '#ff7e9a'],
        ['#bae1ff', '#7eb6ff'],
        ['#fdfd96', '#f4d03f'],
    ];

    const style = document.createElement('style');
    style.textContent = `
        #Yuze-niudan-machine {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(ellipse at center, rgba(255, 200, 220, 0.35) 0%, rgba(0, 0, 0, 0.55) 80%);
            z-index: 2147483646;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            animation: niudan-fade-in 0.4s ease-out;
        }

        @keyframes niudan-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .niudan-close {
            position: absolute;
            top: 24px;
            right: 24px;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.95);
            border: none;
            cursor: pointer;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ff5286;
            transition: all 0.25s ease;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .niudan-close svg {
            display: block;
            width: 18px;
            height: 18px;
        }
        .niudan-close:hover {
            transform: rotate(90deg) scale(1.1);
            background: white;
        }

        .niudan-stage {
            position: relative;
            width: 320px;
            display: flex;
            flex-direction: column;
            align-items: center;
            animation: niudan-pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes niudan-pop-in {
            from { transform: scale(0.5) translateY(40px); opacity: 0; }
            to { transform: scale(1) translateY(0); opacity: 1; }
        }

        .niudan-title {
            color: white;
            font-size: 26px;
            font-weight: 800;
            margin-bottom: 18px;
            text-shadow: 0 2px 12px rgba(255, 105, 145, 0.6);
            letter-spacing: 4px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .niudan-title::before, .niudan-title::after {
            content: '★';
            color: #ffd700;
            font-size: 18px;
            text-shadow: 0 0 8px #ffd700;
            animation: niudan-twinkle 1.6s ease-in-out infinite;
        }
        .niudan-title::after {
            animation-delay: 0.8s;
        }
        @keyframes niudan-twinkle {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.4; transform: scale(0.7); }
        }

        .niudan-machine {
            position: relative;
            width: 280px;
            height: 400px;
            transform-origin: center bottom;
        }
        .niudan-machine.shaking {
            animation: niudan-shake 0.12s ease-in-out 8;
        }
        @keyframes niudan-shake {
            0%, 100% { transform: translateX(0) rotate(0deg); }
            25% { transform: translateX(-6px) rotate(-2deg); }
            75% { transform: translateX(6px) rotate(2deg); }
        }

        .niudan-glass {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 240px;
            height: 240px;
            border-radius: 50%;
            background:
                radial-gradient(circle at 28% 25%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.25) 22%, transparent 50%),
                radial-gradient(circle at 70% 75%, rgba(255,255,255,0.4) 0%, transparent 25%),
                linear-gradient(135deg, rgba(255, 192, 210, 0.55), rgba(255, 230, 240, 0.65));
            border: 5px solid #ff7da3;
            box-shadow:
                inset 0 -10px 30px rgba(255, 105, 145, 0.25),
                inset 0 10px 30px rgba(255, 255, 255, 0.6),
                0 12px 36px rgba(255, 82, 134, 0.45);
            overflow: hidden;
            z-index: 2;
        }

        .niudan-egg-ball {
            position: absolute;
            width: 56px;
            height: 70px;
            border-radius: 50% 50% 46% 46%;
            box-shadow:
                inset -5px -6px 10px rgba(0,0,0,0.15),
                inset 5px 5px 10px rgba(255,255,255,0.55),
                0 4px 8px rgba(0,0,0,0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            animation: niudan-bounce 2.4s ease-in-out infinite;
        }
        .niudan-egg-ball img {
            width: 80%;
            height: 80%;
            object-fit: contain;
            opacity: 0.55;
            -webkit-user-drag: none;
            pointer-events: none;
        }
        @keyframes niudan-bounce {
            0%, 100% { transform: translateY(0) rotate(var(--r, 0deg)); }
            50% { transform: translateY(-6px) rotate(calc(var(--r, 0deg) + 8deg)); }
        }

        .niudan-coin-slot {
            position: absolute;
            top: 232px;
            left: 30px;
            width: 50px;
            height: 28px;
            background: linear-gradient(180deg, #c93767 0%, #a02852 100%);
            border-radius: 4px;
            box-shadow: inset 0 2px 6px rgba(0,0,0,0.4), 0 1px 2px rgba(255,255,255,0.3);
        }
        .niudan-coin-slot::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 30px;
            height: 4px;
            background: #5c1a32;
            border-radius: 2px;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.6);
        }

        .niudan-outlet {
            position: absolute;
            top: 220px;
            left: 50%;
            transform: translateX(-50%);
            width: 110px;
            height: 30px;
            background: linear-gradient(180deg, #ff7da3 0%, #ff5286 100%);
            border-radius: 8px 8px 0 0;
            box-shadow: 0 -2px 8px rgba(255, 105, 145, 0.5), inset 0 -3px 6px rgba(0,0,0,0.15);
            z-index: 1;
        }

        .niudan-base {
            position: absolute;
            top: 240px;
            left: 50%;
            transform: translateX(-50%);
            width: 270px;
            height: 160px;
            background:
                linear-gradient(180deg, #ff5286 0%, #d63a6a 50%, #b02858 100%);
            border-radius: 14px;
            box-shadow:
                0 16px 32px rgba(176, 40, 88, 0.5),
                inset 0 -6px 12px rgba(0,0,0,0.2),
                inset 0 2px 4px rgba(255,255,255,0.3);
        }
        .niudan-base::before {
            content: ' ';
            position: absolute;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 6px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }

        .niudan-tray {
            position: absolute;
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            width: 170px;
            height: 70px;
            background: linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.35));
            border-radius: 8px;
            box-shadow: inset 0 4px 12px rgba(0, 0, 0, 0.6);
            overflow: visible;
        }
        .niudan-tray::after {
            content: '';
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 95%;
            height: 12px;
            background: linear-gradient(180deg, rgba(0,0,0,0.4), transparent);
            border-radius: 8px 8px 0 0;
        }

        .niudan-handle {
            position: absolute;
            top: 270px;
            right: 18px;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #fff5cc, #ffd700 40%, #ffa500 90%);
            border: 4px solid #c98a00;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), inset 0 -3px 8px rgba(0,0,0,0.25);
            transition: transform 0.25s ease, filter 0.25s ease;
            user-select: none;
            z-index: 3;
        }
        .niudan-handle::before {
            content: '';
            position: absolute;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.1) 70%);
            top: 6px;
            left: 8px;
            pointer-events: none;
        }
        .niudan-handle::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 8px;
            height: 28px;
            background: linear-gradient(90deg, #6a3500 0%, #2e1700 100%);
            border-radius: 3px;
            box-shadow: inset 1px 0 2px rgba(0,0,0,0.7), 1px 0 0 rgba(255,255,255,0.4);
        }
        .niudan-handle:hover {
            transform: scale(1.08);
            filter: brightness(1.08);
        }
        .niudan-handle:active {
            transform: scale(0.96);
        }
        .niudan-handle.spinning {
            animation: niudan-spin 0.5s linear 3;
        }
        @keyframes niudan-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .niudan-tip {
            color: white;
            font-size: 14px;
            margin-top: 32px;
            opacity: 0.95;
            text-align: center;
            text-shadow: 0 2px 6px rgba(0,0,0,0.4);
            letter-spacing: 1px;
            min-height: 22px;
        }

        .niudan-egg-out {
            position: absolute;
            bottom: 22px;
            left: 50%;
            width: 60px;
            height: 74px;
            opacity: 0;
            transform: translateX(-50%);
            z-index: 4;
            pointer-events: none;
        }
        .niudan-egg-half {
            position: absolute;
            left: 0;
            width: 100%;
            height: 50%;
            background: linear-gradient(135deg, var(--egg-c1, #ff9eb5), var(--egg-c2, #ff5286));
            box-shadow:
                inset -4px -5px 8px rgba(0,0,0,0.18),
                inset 5px 5px 10px rgba(255,255,255,0.5);
        }
        .niudan-egg-half.top {
            top: 0;
            border-radius: 100% 100% 8% 8% / 100% 100% 12% 12%;
        }
        .niudan-egg-half.top::after {
            content: '';
            position: absolute;
            top: 22%;
            left: 24%;
            width: 32%;
            height: 30%;
            border-radius: 50%;
            background: rgba(255,255,255,0.65);
            filter: blur(3px);
        }
        .niudan-egg-half.bottom {
            bottom: 0;
            border-radius: 8% 8% 100% 100% / 12% 12% 100% 100%;
            box-shadow:
                inset -4px -5px 8px rgba(0,0,0,0.22),
                inset 5px 5px 10px rgba(255,255,255,0.4),
                0 4px 10px rgba(0,0,0,0.3);
        }

        @keyframes niudan-egg-drop {
            0% { transform: translate(-50%, -160px); opacity: 1; }
            55% { transform: translate(-50%, 0); }
            70% { transform: translate(-50%, -16px) rotate(8deg); }
            85% { transform: translate(-50%, -4px) rotate(-4deg); }
            100% { transform: translate(-50%, 0) rotate(0deg); opacity: 1; }
        }
        .niudan-egg-out.drop {
            animation: niudan-egg-drop 0.9s cubic-bezier(0.22, 0.61, 0.36, 1) forwards;
        }

        @keyframes niudan-egg-shake {
            0%, 100% { transform: translateX(-50%) rotate(0deg); }
            25% { transform: translateX(-50%) rotate(-14deg) translateY(-3px); }
            75% { transform: translateX(-50%) rotate(14deg); }
        }
        .niudan-egg-out.shake {
            animation: niudan-egg-shake 0.32s ease-in-out 2;
        }

        @keyframes niudan-egg-top-open {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            45% { transform: translateY(-44px) rotate(-30deg); opacity: 1; }
            100% { transform: translateY(-110px) rotate(-65deg); opacity: 0; }
        }
        @keyframes niudan-egg-bottom-open {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(20px) rotate(15deg); opacity: 0; }
        }
        .niudan-egg-out.crack .niudan-egg-half.top {
            animation: niudan-egg-top-open 0.65s cubic-bezier(0.22, 0.8, 0.36, 1) forwards;
        }
        .niudan-egg-out.crack .niudan-egg-half.bottom {
            animation: niudan-egg-bottom-open 0.6s cubic-bezier(0.22, 0.8, 0.36, 1) forwards;
        }

        .niudan-flash {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: white;
            transform: translate(-50%, -50%) scale(0);
            box-shadow: 0 0 60px 30px rgba(255, 255, 255, 0.9), 0 0 120px 60px rgba(255, 215, 0, 0.6);
            pointer-events: none;
            z-index: 5;
        }
        .niudan-flash.burst {
            animation: niudan-flash-burst 0.6s ease-out forwards;
        }
        @keyframes niudan-flash-burst {
            0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
            30% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
        }

        .niudan-sticker-reveal {
            position: absolute;
            top: 36%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0);
            width: 220px;
            height: 220px;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            z-index: 6;
            pointer-events: none;
        }
        .niudan-sticker-reveal img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            filter:
                drop-shadow(0 0 20px rgba(255, 215, 0, 0.9))
                drop-shadow(0 8px 24px rgba(0, 0, 0, 0.3));
        }
        .niudan-sticker-reveal.show {
            animation: niudan-sticker-show 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                       niudan-sticker-float 3s ease-in-out 0.7s infinite;
        }
        @keyframes niudan-sticker-show {
            0% { transform: translate(-50%, 90px) scale(0.3) rotate(-180deg); opacity: 0; }
            25% { opacity: 1; }
            65% { transform: translate(-50%, -50%) scale(1.2) rotate(10deg); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes niudan-sticker-float {
            0%, 100% { transform: translate(-50%, -50%) translateY(0); }
            50% { transform: translate(-50%, -50%) translateY(-8px); }
        }

        .niudan-sparkle {
            position: absolute;
            width: 14px;
            height: 14px;
            pointer-events: none;
            z-index: 5;
            opacity: 0;
        }
        .niudan-sparkle::before, .niudan-sparkle::after {
            content: '';
            position: absolute;
            background: linear-gradient(180deg, #fff, #ffd700);
            border-radius: 2px;
        }
        .niudan-sparkle::before {
            width: 100%;
            height: 3px;
            top: 50%;
            left: 0;
            transform: translateY(-50%);
            box-shadow: 0 0 8px #ffd700, 0 0 14px #fff;
        }
        .niudan-sparkle::after {
            width: 3px;
            height: 100%;
            left: 50%;
            top: 0;
            transform: translateX(-50%);
            box-shadow: 0 0 8px #ffd700, 0 0 14px #fff;
        }
        .niudan-sparkle.go {
            animation: niudan-sparkle-fly 1.2s ease-out forwards;
        }
        @keyframes niudan-sparkle-fly {
            0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
            20% { opacity: 1; }
            100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1.2) rotate(360deg); opacity: 0; }
        }

        .niudan-actions {
            position: absolute;
            bottom: -90px;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 14px;
            opacity: 0;
            transition: opacity 0.4s ease, transform 0.4s ease;
            pointer-events: none;
            white-space: nowrap;
        }
        .niudan-actions.show {
            opacity: 1;
            transform: translateX(-50%) translateY(-6px);
            pointer-events: auto;
        }
        .niudan-btn {
            padding: 12px 22px;
            border-radius: 24px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 700;
            transition: all 0.2s ease;
            box-shadow: 0 4px 14px rgba(0,0,0,0.25);
            letter-spacing: 1px;
        }
        .niudan-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
        }
        .niudan-btn:active {
            transform: translateY(0);
        }
        .niudan-btn.primary {
            background: linear-gradient(135deg, #ffd700, #ffa500);
            color: #5c2d00;
        }
        .niudan-btn.secondary {
            background: white;
            color: #ff5286;
        }

        #Yuze-pet {
            position: fixed;
            top: 0;
            left: 60px;
            z-index: 2147483645;
            width: 110px;
            transform-origin: 55px 0;
            animation: Yuze-pet-swing 3.6s ease-in-out infinite;
            user-select: none;
            pointer-events: auto;
        }
        @keyframes Yuze-pet-swing {
            0%, 100% { transform: rotate(-14deg); }
            50% { transform: rotate(14deg); }
        }
        #Yuze-pet.dragging {
            animation: none !important;
        }

        .pet-pin {
            position: absolute;
            top: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #fff, #c0c0c0 45%, #6e6e6e);
            box-shadow: 0 2px 4px rgba(0,0,0,0.4), inset 0 -2px 3px rgba(0,0,0,0.25);
            z-index: 4;
        }
        .pet-pin::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: radial-gradient(circle, #ffd700, #b88a00);
        }
        .pet-chain {
            position: relative;
            width: 8px;
            height: 72px;
            margin: 22px auto 0;
        }
        .pet-chain-bead {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: radial-gradient(circle at 30% 30%, #fff8c5, #ffd700 55%, #b88a00);
            box-shadow: 0 1px 2px rgba(0,0,0,0.35);
        }
        .pet-sticker-wrap {
            position: relative;
            margin-top: -16px;
            display: flex;
            justify-content: center;
            cursor: grab;
        }
        .pet-sticker-wrap:active {
            cursor: grabbing;
        }
        .pet-sticker {
            width: 110px;
            height: 110px;
            object-fit: contain;
            filter: drop-shadow(0 6px 14px rgba(0,0,0,0.25));
            -webkit-user-drag: none;
            pointer-events: none;
            transform-origin: center center;
        }
        .pet-sticker-wrap::after {
            content: '';
            position: absolute;
            bottom: 6px;
            left: 50%;
            transform: translateX(-50%);
            width: 70px;
            height: 6px;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.18), transparent 70%);
            border-radius: 50%;
            z-index: -1;
        }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.id = 'Yuze-niudan-machine';
    wrapper.innerHTML = `
        <button class="niudan-close" aria-label="关闭">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                <line x1="6" y1="6" x2="18" y2="18"></line>
                <line x1="18" y1="6" x2="6" y2="18"></line>
            </svg>
        </button>
        <div class="niudan-stage">
            <div class="niudan-title">电子扭蛋机</div>
            <div class="niudan-machine">
                <div class="niudan-glass"></div>
                <div class="niudan-coin-slot"></div>
                <div class="niudan-outlet"></div>
                <div class="niudan-base">
                    <div class="niudan-tray"></div>
                </div>
                <div class="niudan-handle" title="按下旋钮扭蛋"></div>
                <div class="niudan-egg-out">
                    <div class="niudan-egg-half top"></div>
                    <div class="niudan-egg-half bottom"></div>
                </div>
                <div class="niudan-flash"></div>
                <div class="niudan-sticker-reveal"><img alt="sticker"/></div>
            </div>
            <div class="niudan-tip">点击黄色按钮，扭出你的专属可爱挂件~</div>
            <div class="niudan-actions">
                <button class="niudan-btn secondary" data-action="again">再来一发</button>
                <button class="niudan-btn primary" data-action="pet">设为挂件</button>
            </div>
        </div>
    `;
    document.body.appendChild(wrapper);

    const glass = wrapper.querySelector('.niudan-glass');
    const eggSlots = [
        { x: 55, y: 25 },
        { x: 145, y: 30 },
        { x: 20, y: 100 },
        { x: 100, y: 95 },
        { x: 170, y: 100 },
        { x: 70, y: 165 },
        { x: 150, y: 165 },
    ];
    eggSlots.forEach((slot, i) => {
        const ball = document.createElement('div');
        ball.className = 'niudan-egg-ball';
        const colors = EGG_COLORS[i % EGG_COLORS.length];
        ball.style.background = `linear-gradient(135deg, ${colors[0]}cc, ${colors[1]}cc)`;
        const jitterX = (Math.random() - 0.5) * 6;
        const jitterY = (Math.random() - 0.5) * 6;
        ball.style.left = (slot.x + jitterX) + 'px';
        ball.style.top = (slot.y + jitterY) + 'px';
        const rot = Math.floor(Math.random() * 60 - 30);
        ball.style.setProperty('--r', rot + 'deg');
        ball.style.animationDelay = (Math.random() * 1.5) + 's';
        ball.style.animationDuration = (2 + Math.random() * 1.2) + 's';

        const stickerUrl = STICKERS[Math.floor(Math.random() * STICKERS.length)];
        const img = document.createElement('img');
        img.src = stickerUrl;
        img.alt = '';
        img.draggable = false;
        ball.appendChild(img);

        glass.appendChild(ball);
    });

    const machine = wrapper.querySelector('.niudan-machine');
    const handle = wrapper.querySelector('.niudan-handle');
    const eggOut = wrapper.querySelector('.niudan-egg-out');
    const flash = wrapper.querySelector('.niudan-flash');
    const stickerReveal = wrapper.querySelector('.niudan-sticker-reveal');
    const stickerImg = stickerReveal.querySelector('img');
    const tip = wrapper.querySelector('.niudan-tip');
    const actions = wrapper.querySelector('.niudan-actions');
    const closeBtn = wrapper.querySelector('.niudan-close');

    let isPlaying = false;
    let currentSticker = '';

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    function resetStage() {
        eggOut.className = 'niudan-egg-out';
        eggOut.style.opacity = '0';
        flash.className = 'niudan-flash';
        stickerReveal.className = 'niudan-sticker-reveal';
        stickerReveal.style.opacity = '0';
        stickerImg.src = '';
        actions.classList.remove('show');
        wrapper.querySelectorAll('.niudan-sparkle').forEach((node) => node.remove());
    }

    function spawnSparkles(count) {
        const machineRect = machine.getBoundingClientRect();
        const cx = machineRect.width / 2;
        const cy = machineRect.height * 0.36;
        for (let i = 0; i < count; i++) {
            const sparkle = document.createElement('div');
            sparkle.className = 'niudan-sparkle';
            const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
            const distance = 80 + Math.random() * 110;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            sparkle.style.left = cx + 'px';
            sparkle.style.top = cy + 'px';
            sparkle.style.setProperty('--tx', tx + 'px');
            sparkle.style.setProperty('--ty', ty + 'px');
            const size = 10 + Math.random() * 14;
            sparkle.style.width = size + 'px';
            sparkle.style.height = size + 'px';
            sparkle.style.animationDelay = (Math.random() * 0.25) + 's';
            machine.appendChild(sparkle);
            requestAnimationFrame(() => sparkle.classList.add('go'));
            setTimeout(() => sparkle.remove(), 1600);
        }
    }

    async function playRound() {
        if (isPlaying) return;
        isPlaying = true;
        resetStage();
        tip.textContent = '哗啦啦~ 蛋蛋们都在动呢';

        const colors = EGG_COLORS[Math.floor(Math.random() * EGG_COLORS.length)];
        eggOut.style.setProperty('--egg-c1', colors[0]);
        eggOut.style.setProperty('--egg-c2', colors[1]);

        handle.classList.add('spinning');
        machine.classList.add('shaking');

        await wait(900);
        machine.classList.remove('shaking');
        handle.classList.remove('spinning');

        tip.textContent = '蛋蛋掉出来啦！';
        eggOut.classList.add('drop');
        await wait(900);

        tip.textContent = '咔哒~ 蛋壳要打开了';
        eggOut.classList.add('shake');
        await wait(640);

        currentSticker = STICKERS[Math.floor(Math.random() * STICKERS.length)];
        stickerImg.src = currentSticker;

        eggOut.classList.add('crack');
        flash.classList.add('burst');
        spawnSparkles(14);

        stickerReveal.style.opacity = '1';
        stickerReveal.classList.add('show');
        tip.textContent = 'Bling Bling~ 你的专属挂件诞生啦！';

        await wait(800);
        spawnSparkles(8);
        actions.classList.add('show');
        isPlaying = false;
    }

    function activatePet(stickerUrl) {
        const existing = document.getElementById('Yuze-pet');
        if (existing) existing.remove();

        const pet = document.createElement('div');
        pet.id = 'Yuze-pet';
        pet.innerHTML = `
            <div class="pet-pin"></div>
            <div class="pet-chain">
                ${Array.from({ length: 9 }).map((_, i) => `<div class="pet-chain-bead" style="top:${i * 8}px"></div>`).join('')}
            </div>
            <div class="pet-sticker-wrap" title="拖动可移动">
                <img class="pet-sticker" src="${stickerUrl}" alt="Yuze-pet" draggable="false"/>
            </div>
        `;
        document.body.appendChild(pet);

        const stickerWrap = pet.querySelector('.pet-sticker-wrap');

        let dragging = false;
        let startX = 0;
        let petStartLeft = 0;

        stickerWrap.addEventListener('mousedown', (e) => {
            dragging = true;
            startX = e.clientX;
            petStartLeft = pet.getBoundingClientRect().left;
            pet.classList.add('dragging');
            pet.style.transform = 'rotate(0deg)';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            const newLeft = Math.max(8, Math.min(window.innerWidth - 120, petStartLeft + dx));
            pet.style.left = newLeft + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            pet.classList.remove('dragging');
            pet.style.transform = '';
        });
    }

    handle.addEventListener('click', playRound);

    actions.addEventListener('click', (e) => {
        const target = e.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.getAttribute('data-action');
        if (action === 'again') {
            playRound();
        } else if (action === 'pet') {
            wrapper.style.transition = 'opacity 0.35s ease';
            wrapper.style.opacity = '0';
            setTimeout(() => {
                wrapper.remove();
                activatePet(currentSticker);
            }, 350);
        }
    });

    closeBtn.addEventListener('click', () => {
        wrapper.style.transition = 'opacity 0.3s ease';
        wrapper.style.opacity = '0';
        setTimeout(() => wrapper.remove(), 300);
    });

    wrapper.addEventListener('click', (e) => {
        if (e.target === wrapper) {
            closeBtn.click();
        }
    });
})();