(function() {
    'use strict';
    
    if (window.xiehouyuModalLoaded) {
        console.log('歇后语扭蛋机弹窗已加载，跳过重复执行');
        return;
    }
    window.xiehouyuModalLoaded = true;
    
    console.log('正在加载半拿铁播客俏皮话扭蛋机弹窗...');
    
    const xiehouyuData = [
        // 原来的俏皮话
        { riddle: "喝酒穿皮袄", answer: "里外发烧" },
        { riddle: "茶壶里煮饺子", answer: "有却倒不出来" },
        { riddle: "乌龟退租", answer: "憋不住了" },
        { riddle: "黄连水里泡苦瓜", answer: "苦透了心" },
        { riddle: "水仙不开花", answer: "装蒜" },
        { riddle: "《百家姓》去掉赵", answer: "开口就是钱" },
        { riddle: "屎壳郎戴面具", answer: "臭不要脸" },
        { riddle: "芝麻掉进针眼里", answer: "巧了" },
        { riddle: "梅西到了天津", answer: "没戏啊" },
        { riddle: "广东人唱京剧", answer: "根本摸不着调啊" },
        { riddle: "广东歌飚国粹", answer: "根本不是那个味儿啊" },
        { riddle: "叫花子捡了金元宝", answer: "不知道怎么花呀" },
        { riddle: "热油浇到芝麻上", answer: "真香啊" },
        { riddle: "阳的说成阴的，阴的说成阳的", answer: "阳奉阴违啊" },
        { riddle: "楼下买了震楼机", answer: "震撼到家了" },
        { riddle: "会车开了闪光灯", answer: "亮瞎了" },
        { riddle: "你有大哥你有二弟", answer: "你算老几啊" },
        { riddle: "和尚住的地方", answer: "妙啊" },
        { riddle: "孔夫子搬家", answer: "全是输" },
        { riddle: "夏天你不放冰箱", answer: "你变味了" },
        { riddle: "熊孩子坐高铁", answer: "惊天动地" },
        { riddle: "老太太吃麻花", answer: "软磨硬泡" },
        { riddle: "柯南来敲门", answer: "你离死不远了" },
        { riddle: "恶心他妈给恶心开门", answer: "恶心到家了" },
        { riddle: "煎饼果子加毒药", answer: "你别来这一套" },
        { riddle: "钢管子怼青蛙", answer: "顶呱呱" },
        { riddle: "柯达鸭上站青蛙", answer: "顶呱呱" },
        { riddle: "头上长了哈勃", answer: "大开眼界" },
        { riddle: "豆腐脑煮稀饭", answer: "那叫一个稀烂" },
        { riddle: "老母猪坎栏杆", answer: "进退两难" },
        { riddle: "叫花子摔了碗", answer: "倾家又荡产" },
        { riddle: "三班的小母牛", answer: "不是一般的牛" },
        { riddle: "新厕所蹲第一坑", answer: "史无前例" },
        { riddle: "小蜜蜂摸电门", answer: "麻BEE了" },
        { riddle: "82年的龙井", answer: "老绿茶了" },
        { riddle: "21天不出鸡", answer: "这不坏蛋嘛" },
        { riddle: "1+1=7", answer: "想多了" },
        { riddle: "刚做完近视手术", answer: "睁眼说瞎话" },
        { riddle: "弹钢琴不看本儿", answer: "离谱" },
        { riddle: "小偷弹钢琴不看本儿", answer: "贼离谱" },
        { riddle: "大年三十儿看黄历", answer: "没日子啦" },
        { riddle: "皮裤套棉裤", answer: "必定有缘故" },
        { riddle: "吴京踩周杰伦", answer: "精彩绝伦" },
        { riddle: "神仙放屁", answer: "不同凡响" },
        { riddle: "屁股后面挂暖瓶", answer: "有一定的水平" },
        { riddle: "胸口上挂钥匙", answer: "开心" },
        { riddle: "林心如拧水龙头接水", answer: "心如止水" },
        { riddle: "悬崖边上扭秧歌", answer: "眼看就要到头了" },
        { riddle: "跳水的冠军", answer: "一点水也没有" },
        { riddle: "芝麻掉到水面上", answer: "飘了" },
        { riddle: "水果快递慢了半个月", answer: "烂到家了" },
        { riddle: "泡了水的树", answer: "烂了根了" },
        { riddle: "王八退房", answer: "鳖不住了" },
        { riddle: "武则天当寡妇", answer: "失去了理智" },
        { riddle: "HR转行", answer: "不干人事" },
        { riddle: "屎壳郎打喷嚏", answer: "好大的口气" },
        { riddle: "小可爱按门铃", answer: "可爱到家了" },
        { riddle: "屎壳郎搬家", answer: "滚蛋" },
        { riddle: "厕所里跳高", answer: "过分" },
        { riddle: "屎壳郎推车", answer: "滚蛋" },
        { riddle: "谢娜老公骑自行车", answer: "张灯结彩" },
        { riddle: "九个压路机坏了一台", answer: "八个压路" },
        { riddle: "张飞和李逵比颜值", answer: "谁也别嫌谁黑" },
        { riddle: "易中天老师的工作单位", answer: "厦大的" },
        { riddle: "小王八退房", answer: "憋不住了" },

        // 你新增的 秦始皇 系列
        { riddle: "秦始皇摸电门", answer: "赢麻了" },
        { riddle: "秦始皇敲门", answer: "赢到家了" },
        { riddle: "秦始皇戴小红帽", answer: "赢到姥姥家了" },
        { riddle: "秦始皇照镜子", answer: "双赢" },
        { riddle: "秦始皇叼奶嘴", answer: "又（幼）赢" },
        { riddle: "秦始皇拿大顶", answer: "反正都是赢" },
        { riddle: "秦始皇驾崩", answer: "不能再赢了" },
        { riddle: "秦始皇长疖子", answer: "赢一点" },
        { riddle: "秦始皇下地狱", answer: "赢到底" },
        { riddle: "秦二世摸电门", answer: "又赢麻了" },
        { riddle: "秦始皇跳舞", answer: "步步赢" },
        { riddle: "秦始皇化妆", answer: "赢得漂亮" },
        { riddle: "秦始皇他娘不管秦始皇他爹", answer: "只管赢" },
        { riddle: "秦始皇拾痦子", answer: "少赢一点" },
        { riddle: "秦始皇做大保健", answer: "躺赢" },
        { riddle: "秦始皇被雷劈", answer: "赢炸了" },
        { riddle: "秦始皇吃后丘", answer: "肯定赢" },
        { riddle: "秦始皇举扶苏", answer: "赢上加赢" },
        { riddle: "秦王绕柱", answer: "转着圈赢" },

        // 你新增的 西湖 系列
        { riddle: "富士相机掉西湖", answer: "错失良机" },
        { riddle: "西湖上的船", answer: "随波逐流" },
        { riddle: "西湖边的帐篷", answer: "近水楼台" },
        { riddle: "西湖的垂柳", answer: "随风摇摆" },
        { riddle: "西湖里面捞月亮", answer: "徒劳无功/枉费心机" },
        { riddle: "西湖里的藕", answer: "心眼多" },
        { riddle: "做梦游西湖", answer: "想得美" },
        { riddle: "西湖里面倒酱油", answer: "没滋没味/无济于事" },
        { riddle: "芝麻掉到西湖上", answer: "飘了" },
        { riddle: "腊月跳西湖", answer: "拔凉到心里" },
        { riddle: "泥菩萨过西湖", answer: "自身难保" },
        { riddle: "八仙过西湖", answer: "各显神通" },
        { riddle: "西湖里开邮轮", answer: "无路可走啊" },
        { riddle: "西湖想偶遇白素贞", answer: "想得美" }
    ];
    
    function buildModalStylesheet() {
        const style = document.createElement('style');
        style.textContent = `
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            .xiehouyu-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 99999;
                backdrop-filter: blur(3px);
            }
            
            .xiehouyu-modal-container {
                background: #D9C2B0;
                border-radius: 20px;
                width: 90%;
                max-width: 500px;
                padding: 25px;
                box-shadow: 
                    0 20px 50px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(255, 248, 225, 0.1),
                    inset 0 2px 10px rgba(255, 255, 255, 0.1);
                border: 8px solid #4E342E;
                position: relative;
                animation: modalAppear 0.4s ease-out;
            }
            
            @keyframes modalAppear {
                0% { opacity: 0; transform: scale(0.9) translateY(20px); }
                100% { opacity: 1; transform: scale(1) translateY(0); }
            }
            
            .modal-header {
                display: flex;
                justify-content: center;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 15px;
                border-bottom: 2px solid rgba(255, 248, 225, 0.2);
                width: 100%;
            }

            .machine-brand-logo {
                position: absolute;
                top: -18px;
                left: 50%;
                transform: translateX(-50%);
                max-width: 140px;
                max-height: 56px;
                object-fit: contain;
                z-index: 10;
            }
            
            .modal-title {
                font-family: 'SimHei', 'Microsoft YaHei', sans-serif;
                font-size: 1.8rem;
                color: #6F4E37;
                font-weight: bold;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .coffee-icon {
                font-size: 1.5rem;
                animation: coffeeSteam 3s infinite ease-in-out;
            }
            
            @keyframes coffeeSteam {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-3px); }
            }
            
            .close-btn {
                position: absolute;
                right: 25px;
                top: 25px;
                z-index: 10;
                background: rgba(255, 255, 255, 0.1);
                border: 2px solid #8D6E63;
                color: #FFF8E1;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                font-size: 1.2rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.3s ease;
            }
            
            .close-btn:hover {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }
            
            .capsule-machine {
                position: relative;
                width: 100%;
                height: 250px;
                margin: 20px 0 30px;
                overflow: visible;
            }
            
            .machine-body {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 200px;
                height: 250px;
                overflow: visible;
            }
            
            .machine-dome {
                position: absolute;
                top: 0;
                left: 50%;
                transform: translateX(-50%);
                width: 180px;
                height: 60px;
                background: linear-gradient(135deg, #6D4C41 0%, #4E342E 100%);
                border-radius: 90px 90px 0 0;
                box-shadow: 
                    0 5px 15px rgba(0, 0, 0, 0.4),
                    inset 0 2px 5px rgba(255, 255, 255, 0.1);
                z-index: 3;
            }
            
            .machine-dome::after {
                content: '';
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                height: 15px;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                border-radius: 7px;
            }
            
            .capsule-chamber {
                position: absolute;
                top: 50px;
                left: 50%;
                transform: translateX(-50%);
                width: 160px;
                height: 140px;
                background: rgba(255, 248, 225, 0.15);
                border-radius: 15px;
                border: 4px solid #8D6E63;
                box-shadow: 
                    0 5px 15px rgba(0, 0, 0, 0.3),
                    inset 0 0 20px rgba(255, 248, 225, 0.1);
                z-index: 2;
                overflow: hidden;
                backdrop-filter: blur(2px);
            }
            
            .capsule-chamber::before {
                content: '';
                position: absolute;
                top: 5px;
                left: 5px;
                right: 5px;
                bottom: 5px;
                border: 2px solid rgba(255, 248, 225, 0.1);
                border-radius: 10px;
                pointer-events: none;
            }
            
            .capsules {
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                display: flex;
                flex-wrap: wrap;
                gap: 5px;
                justify-content: center;
            }
            
            .capsule {
                width: 20px;
                height: 30px;
                background: linear-gradient(45deg, #795548, #A1887F);
                border-radius: 10px 10px 5px 5px;
                position: relative;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                transform: rotate(var(--rotate, 0deg));
            }
            
            .capsule::after {
                content: '';
                position: absolute;
                top: 5px;
                left: 3px;
                right: 3px;
                height: 1px;
                background: #D7CCC8;
                border-radius: 0.5px;
            }
            
            .machine-base {
                position: absolute;
                top: 190px;
                left: 50%;
                transform: translateX(-50%);
                width: 220px;
                height: 40px;
                background: linear-gradient(to bottom, #4E342E 0%, #3E2723 100%);
                border-radius: 10px;
                box-shadow: 
                    0 5px 15px rgba(0, 0, 0, 0.4),
                    inset 0 2px 5px rgba(255, 255, 255, 0.1);
                z-index: 1;
            }
            
            .machine-base::before {
                content: '';
                position: absolute;
                top: 5px;
                left: 10px;
                right: 10px;
                height: 3px;
                background: #8D6E63;
                border-radius: 1.5px;
            }
            
            .handle-container {
                position: absolute;
                top: 100px;
                right: 20px;
                cursor: pointer;
                z-index: 4;
                transition: transform 0.3s ease;
            }
            
            .handle-container:hover {
                transform: scale(1.1);
            }
            
            .handle {
                width: 50px;
                height: 80px;
                background: linear-gradient(to right, #8D6E63, #6D4C41);
                border-radius: 25px;
                position: relative;
                box-shadow: 
                    5px 5px 15px rgba(0, 0, 0, 0.4),
                    inset 0 2px 5px rgba(255, 255, 255, 0.1);
            }
            
            .handle::before {
                content: '';
                position: absolute;
                top: 15px;
                left: 10px;
                right: 10px;
                height: 50px;
                background: #5D4037;
                border-radius: 15px;
            }
            
            .handle-knob {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 16px;
                height: 16px;
                background: #D7CCC8;
                border-radius: 50%;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
            }
            
            .coffee-beans {
                position: absolute;
                top: 20px;
                left: 20px;
                display: flex;
                gap: 3px;
                z-index: 5;
            }
            
            .bean {
                width: 8px;
                height: 5px;
                background: #3E2723;
                border-radius: 50%;
                transform: rotate(45deg);
            }
            
            .latte-art {
                position: absolute;
                top: 20px;
                right: 20px;
                width: 30px;
                height: 30px;
                background: radial-gradient(circle, #FFF8E1 30%, transparent 70%);
                border-radius: 50%;
                opacity: 0.8;
                z-index: 5;
            }
            
            .outlet {
                position: absolute;
                top: 230px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 15px;
                background: #5D4037;
                border-radius: 0 0 8px 8px;
                box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3);
                z-index: 0;
                overflow: hidden;
            }
            
            .result-container {
                background: #6F4E37;
                border: 2px solid #8D6E63;
                border-radius: 10px;
                padding: 15px;
                margin: 15px 0;
                min-height: 120px;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            /* 胶囊样式 + GPU加速（只定义一次） */
            .falling-capsule {
                position: absolute;
                top: -80px;
                left: 50%;
                transform: translateX(-50%) translateZ(0);
                width: 50px;
                height: 70px;
                background: linear-gradient(45deg, #D4A76A, #B07D44);
                border-radius: 25px 25px 15px 15px;
                box-shadow: 0 6px 12px rgba(0,0,0,0.4);
                z-index: 10;
                display: none;
                background-image: linear-gradient(
                    120deg, 
                    rgba(255,255,255,0.2) 0%, 
                    rgba(255,255,255,0) 50%, 
                    rgba(0,0,0,0.1) 100%
                );
                /* 强制丝滑：GPU 加速 */
                will-change: top, transform, opacity;
                backface-visibility: hidden;
            }
            
            .falling-capsule::after {
                content: '';
                position: absolute;
                top: 12px;
                left: 8px;
                right: 8px;
                height: 3px;
                background: #FFF8E1;
                border-radius: 2px;
                box-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            /* 丝滑掉落动画（只定义一次） */
            @keyframes capsuleFall {
              0% {
                top: -80px;
                transform: translateX(-50%) rotate(0deg) translateZ(0);
                animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
              }
              100% {
                top: 8px;
                transform: translateX(-50%) rotate(360deg) translateZ(0);
              }
            }
            
            /* 丝滑爆开动画（只定义一次） */
            @keyframes capsuleOpen {
              0% {
                transform: translateX(-50%) rotate(360deg) scale(1) translateZ(0);
                opacity: 1;
              }
              60% {
                transform: translateX(-50%) rotate(360deg) scale(1.1) translateZ(0);
                opacity: 1;
              }
              100% {
                transform: translateX(-50%) rotate(360deg) scale(0) translateZ(0);
                opacity: 0;
              }
            }
            
            /* 动画类名 */
            .falling {
              display: block;
              animation: capsuleFall 1.1s cubic-bezier(0.22,1,0.36,1) forwards;
            }
            .opening {
              animation: capsuleOpen 0.5s ease-out forwards;
            }
            
            .result-title {
                font-size: 1.1rem;
                color: #D7CCC8;
                margin-bottom: 10px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 5;
            }
            
            .riddle {
                font-size: 1.4rem;
                color: #FFF8E1;
                margin: 8px 0;
                line-height: 1.3;
                text-align: center;
                text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5);
                opacity: 0;
                transition: opacity 0.6s ease;
                z-index: 5;
            }
            
            /* 答案容器 - 3D翻转样式 */
            .answer-wrapper {
                position: relative;
                font-size: 1.2rem;
                color: #FFCC80;
                font-style: italic;
                margin-top: 12px;
                padding: 12px 20px;
                background: rgba(62, 39, 35, 0.7);
                border-radius: 12px;
                border-left: 5px solid #FF9800;
                text-align: center;
                display: none;
                width: 90%;
                box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
                opacity: 0;
                transition: opacity 0.6s ease 0.4s, transform 0.5s ease;
                z-index: 5;
                transform-style: preserve-3d;
                cursor: pointer;
                height: 80px; /* 固定高度容纳两行提示 */
            }
            
            /* 翻转动画 */
            .answer-wrapper.flipped {
                transform: rotateX(180deg);
            }
            
            .answer-wrapper::before {
                content: '';
                position: absolute;
                left: -5px;
                top: 0;
                bottom: 0;
                width: 5px;
                background: linear-gradient(to bottom, #FF9800, #FFB74D);
                border-radius: 3px;
            }
            
            /* 提示文字容器（正面） */
            .answer-hint-container {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                backface-visibility: hidden;
                text-align: center;
                width: 100%;
            }
            
            /* 主提示文字 */
            .answer-hint {
                font-size: 1.2rem;
                color: #FFCC80;
                margin-bottom: 4px;
            }
            
            /* 辅助提示文字（浅色小字） */
            .answer-hint-sub {
                font-size: 0.9rem;
                color: #FFCC80;
                opacity: 0.7;
            }
            
            /* 答案文字层（背面） */
            .answer-text {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotateX(180deg);
                backface-visibility: hidden;
                font-size: 1.2rem;
                color: #FFCC80;
                width: 100%;
            }
            
            .counter {
                font-size: 0.9rem;
                color: #BCAAA4;
                margin-top: 10px;
                z-index: 5;
            }
            
            .controls {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 20px;
            }
            
            .btn {
                padding: 10px 25px;
                font-size: 1rem;
                background: linear-gradient(to bottom, #8D6E63, #6D4C41);
                color: #FFF8E1;
                border: none;
                border-radius: 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                font-weight: bold;
                letter-spacing: 0.5px;
            }
            
            .btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
                background: linear-gradient(to bottom, #9C7B6F, #7D5C51);
            }
            
            .btn:active {
                transform: translateX(1px);
            }
            
            .steam {
                position: absolute;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                width: 30px;
                height: 30px;
                background: radial-gradient(circle, rgba(255, 248, 225, 0.2) 0%, transparent 70%);
                border-radius: 50%;
                opacity: 0;
                z-index: 6;
            }
            
            @keyframes rotateHandle {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            @keyframes shakeMachine {
                0%, 100% { transform: translateX(-50%); }
                25% { transform: translateX(calc(-50% - 3px)); }
                75% { transform: translateX(calc(-50% + 3px)); }
            }
            
            @keyframes bounce {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            
            @keyframes steamRise {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(0) scale(0.5);
                }
                50% {
                    opacity: 0.6;
                    transform: translateX(-50%) translateY(-15px) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(-30px) scale(1.2);
                }
            }
            
            .rotating {
                animation: rotateHandle 0.8s ease-in-out;
            }
            
            .shaking {
                animation: shakeMachine 0.3s ease-in-out 3;
            }
            
            .bouncing {
                animation: bounce 0.4s ease-in-out 2;
            }
            
            .steaming {
                animation: steamRise 1.5s ease-out;
            }
            
            /* 移动端适配（统一动画时长，不破坏丝滑感） */
            @media (max-width: 768px) {
                .xiehouyu-modal-container {
                    padding: 20px;
                    max-width: 90%;
                }
                
                .modal-title {
                    font-size: 1.5rem;
                }
                
                .capsule-machine {
                    height: 220px;
                }
                
                .machine-body {
                    width: 180px;
                }
                
                .machine-dome {
                    width: 160px;
                }
                
                .capsule-chamber {
                    width: 140px;
                }
                
                .riddle {
                    font-size: 1.2rem;
                }
                
                .answer-wrapper {
                    font-size: 1.1rem;
                    height: 70px;
                }
                
                .answer-hint {
                    font-size: 1rem;
                }
                
                .answer-hint-sub {
                    font-size: 0.8rem;
                }
                
                .answer-text {
                    font-size: 1rem;
                }
                
                .falling-capsule {
                    width: 40px;
                    height: 60px;
                }
            }
            
            @media (max-width: 480px) {
                .capsule-machine {
                    height: 200px;
                }
                
                .machine-body {
                    width: 160px;
                }
                
                .handle-container {
                    right: 10px;
                }
                
                .handle {
                    width: 40px;
                    height: 60px;
                }
                
                .controls {
                    flex-direction: column;
                    align-items: center;
                }
                
                .btn {
                    width: 100%;
                    max-width: 200px;
                }
            }
        `;
        return style;
    }
    
    function createElement(tag, className, text = '', attributes = {}) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text) element.textContent = text;
        
        for (const [key, value] of Object.entries(attributes)) {
            element.setAttribute(key, value);
        }
        
        return element;
    }
    
    function createModal() {
        // Shadow DOM：样式（含 * 重置）只作用于弹窗内部，不污染宿主页面
        const host = document.createElement('div');
        host.id = 'xiehouyuModalHost';
        host.setAttribute('data-xiehouyu-modal-host', '');
        // 层叠与命中区域在宿主上统一，pointer-events:none 避免空宿主挡页面；子节点内恢复为可点
        host.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none;';
        const shadow = host.attachShadow({ mode: 'open' });
        shadow.appendChild(buildModalStylesheet());
        
        const overlay = createElement('div', 'xiehouyu-modal-overlay');
        overlay.id = 'xiehouyuModalOverlay';
        overlay.style.pointerEvents = 'auto';
        
        const modalContainer = createElement('div', 'xiehouyu-modal-container');
        modalContainer.id = 'xiehouyuModalContainer';
        
        const modalHeader = createElement('div', 'modal-header');
        const modalTitle = createElement('div', 'modal-title');
        const coffeeIcon1 = createElement('span', 'coffee-icon', '☕');
        const titleText = createElement('span', '', '半拿铁俏皮话扭蛋机');
        const coffeeIcon2 = createElement('span', 'coffee-icon', '☕');
        
        modalTitle.appendChild(coffeeIcon1);
        modalTitle.appendChild(titleText);
        modalTitle.appendChild(coffeeIcon2);
        
        const closeBtn = createElement('button', 'close-btn', '×');
        closeBtn.id = 'modalCloseBtn';
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        modalContainer.appendChild(modalHeader);
        
        const capsuleMachine = createElement('div', 'capsule-machine');
        const machineBody = createElement('div', 'machine-body');
        machineBody.id = 'machineBody';
        
        const brandLogo = createElement('img', 'machine-brand-logo', '', {
            src: 'https://p0.meituan.net/guangnian/95d033df6b8087a13ab3c35e7707023a214971.png',
            alt: '半拿铁'
        });
        machineBody.appendChild(brandLogo);
        
        const machineDome = createElement('div', 'machine-dome');
        machineBody.appendChild(machineDome);
        
        const capsuleChamber = createElement('div', 'capsule-chamber');
        const capsules = createElement('div', 'capsules');
        capsules.id = 'capsules';
        
        for (let i = 0; i < 20; i++) {
            const capsule = createElement('div', 'capsule');
            capsule.style.setProperty('--rotate', `${Math.random() * 30 - 15}deg`);
            capsules.appendChild(capsule);
        }
        
        capsuleChamber.appendChild(capsules);
        machineBody.appendChild(capsuleChamber);
        
        const machineBase = createElement('div', 'machine-base');
        machineBody.appendChild(machineBase);
        
        capsuleMachine.appendChild(machineBody);
        
        const handleContainer = createElement('div', 'handle-container');
        handleContainer.id = 'handleContainer';
        const handle = createElement('div', 'handle');
        const handleKnob = createElement('div', 'handle-knob');
        handle.appendChild(handleKnob);
        handleContainer.appendChild(handle);
        capsuleMachine.appendChild(handleContainer);
        
        const coffeeBeans = createElement('div', 'coffee-beans');
        for (let i = 0; i < 3; i++) {
            const bean = createElement('div', 'bean');
            coffeeBeans.appendChild(bean);
        }
        capsuleMachine.appendChild(coffeeBeans);
        
        const latteArt = createElement('div', 'latte-art');
        capsuleMachine.appendChild(latteArt);
        
        const outlet = createElement('div', 'outlet');
        capsuleMachine.appendChild(outlet);
        
        const steam = createElement('div', 'steam');
        steam.id = 'steam';
        capsuleMachine.appendChild(steam);
        
        modalContainer.appendChild(capsuleMachine);
        
        const resultContainer = createElement('div', 'result-container');
        resultContainer.id = 'resultContainer';
        
        const fallingCapsule = createElement('div', 'falling-capsule');
        fallingCapsule.id = 'fallingCapsule';
        resultContainer.appendChild(fallingCapsule);
        
        const resultTitle = createElement('div', 'result-title');
        const resultIcon = createElement('span', 'coffee-icon', '☕');
        const resultTitleText = createElement('span', '', '看看能抽到什么吧~');
        resultTitle.appendChild(resultIcon);
        resultTitle.appendChild(resultTitleText);
        
        const riddleText = createElement('div', 'riddle', '点击手柄开始抽取');
        riddleText.id = 'riddleText';
        riddleText.style.opacity = '1'; // 初始显示
        
        // 答案容器 - 包含主提示和子提示
        const answerWrapper = createElement('div', 'answer-wrapper');
        answerWrapper.id = 'answerWrapper';
        
        const answerHintContainer = createElement('div', 'answer-hint-container');
        const answerHint = createElement('div', 'answer-hint', '无奖竞猜🫢下句是 ——');
        answerHint.id = 'answerHint';
        const answerHintSub = createElement('div', 'answer-hint-sub', '猜不到？点击翻转查看答案😎 →');
        answerHintSub.id = 'answerHintSub';
        
        answerHintContainer.appendChild(answerHint);
        answerHintContainer.appendChild(answerHintSub);
        
        const answerText = createElement('div', 'answer-text');
        answerText.id = 'answerText';
        
        answerWrapper.appendChild(answerHintContainer);
        answerWrapper.appendChild(answerText);
        
        const counterText = createElement('div', 'counter', '已抽取：0 次');
        counterText.id = 'counterText';
        
        resultContainer.appendChild(resultTitle);
        resultContainer.appendChild(riddleText);
        resultContainer.appendChild(answerWrapper);
        resultContainer.appendChild(counterText);
        
        modalContainer.appendChild(resultContainer);
        
        const controls = createElement('div', 'controls');
        const spinBtn = createElement('button', 'btn', '拧扭蛋');
        spinBtn.id = 'spinBtn';
        const resetBtn = createElement('button', 'btn', '重新开始');
        resetBtn.id = 'resetBtn';
        controls.appendChild(spinBtn);
        controls.appendChild(resetBtn);
        modalContainer.appendChild(controls);
        
        overlay.appendChild(modalContainer);
        shadow.appendChild(overlay);
        document.body.appendChild(host);
        
        return {
            host,
            overlay,
            modalContainer,
            handleContainer,
            machineBody,
            steam,
            riddleText,
            answerWrapper,
            answerHintContainer,
            answerHint,
            answerHintSub,
            answerText,
            counterText,
            spinBtn,
            resetBtn,
            closeBtn,
            fallingCapsule
        };
    }
    
    function initGameLogic(elements) {
        let spinCount = 0;
        let isSpinning = false;
        let usedIndexes = new Set();
        let currentAnswer = ''; // 存储当前答案
        
        // 随机歇后语
        function getRandomXiehouyu() {
            if (usedIndexes.size >= xiehouyuData.length) usedIndexes.clear();
            let i;
            do i = Math.floor(Math.random() * xiehouyuData.length);
            while (usedIndexes.has(i));
            usedIndexes.add(i);
            return xiehouyuData[i];
        }
        
        // 点击翻转答案
        function toggleAnswer() {
            if (!currentAnswer) return;
            elements.answerWrapper.classList.toggle('flipped');
        }
        
        function spinCapsule() {
            if (isSpinning) return;
            isSpinning = true;
            spinCount++;
            currentAnswer = '';
            
            elements.riddleText.style.opacity = '0';
            elements.answerWrapper.style.display = 'none';
            elements.answerWrapper.style.opacity = '0';
            elements.answerWrapper.classList.remove('flipped');
            elements.fallingCapsule.classList.remove('falling', 'opening');
            
            elements.handleContainer.classList.add('rotating');
            elements.machineBody.classList.add('shaking');
            
            elements.steam.classList.remove('steaming');
            void elements.steam.offsetWidth;
            elements.steam.classList.add('steaming');
            
            const result = getRandomXiehouyu();
            currentAnswer = result.answer;
            elements.answerText.textContent = currentAnswer;
            
            // 修复嵌套的setTimeout，补全闭合符号
            setTimeout(() => {
                elements.fallingCapsule.classList.add('falling');
                
                setTimeout(() => {
                    elements.fallingCapsule.classList.add('opening');
                    
                    setTimeout(() => {
                        elements.riddleText.textContent = `"${result.riddle}"`;
                        elements.riddleText.style.opacity = '1';
                        elements.answerWrapper.style.display = 'block';
                        elements.answerWrapper.style.opacity = '1';
                        
                        elements.answerWrapper.classList.remove('bouncing');
                        void elements.answerWrapper.offsetWidth;
                        elements.answerWrapper.classList.add('bouncing');
                        
                        elements.counterText.textContent = `已抽取：${spinCount} 次`;
                        
                        setTimeout(() => {
                            elements.handleContainer.classList.remove('rotating');
                            elements.machineBody.classList.remove('shaking');
                            isSpinning = false;
                        }, 300);
                    }, 400);
                }, 1100);
            }, 200);
        }
        
        function resetGame() {
            spinCount = 0;
            usedIndexes.clear();
            currentAnswer = '';
            elements.riddleText.textContent = '点击手柄开始抽取';
            elements.riddleText.style.opacity = '1';
            elements.answerWrapper.style.display = 'none';
            elements.answerWrapper.style.opacity = '0';
            elements.answerWrapper.classList.remove('flipped');
            elements.counterText.textContent = '已抽取：0 次';
            elements.fallingCapsule.classList.remove('falling', 'opening');
            
            elements.handleContainer.classList.remove('rotating');
            elements.machineBody.classList.remove('shaking');
            isSpinning = false;
        }
        
        function closeModal() {
            if (elements.host && elements.host.parentNode) {
                document.body.removeChild(elements.host);
            }
            window.xiehouyuModalLoaded = false;
        }
        
        // 绑定事件
        elements.handleContainer.addEventListener('click', spinCapsule);
        elements.spinBtn.addEventListener('click', spinCapsule);
        elements.resetBtn.addEventListener('click', resetGame);
        elements.closeBtn.addEventListener('click', closeModal);
        elements.answerWrapper.addEventListener('click', toggleAnswer);
        
        elements.overlay.addEventListener('click', (e) => {
            if (e.target === elements.overlay) closeModal();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !isSpinning) {
                e.preventDefault();
                spinCapsule();
            }
            if (e.code === 'KeyR' && e.ctrlKey) {
                e.preventDefault();
                resetGame();
            }
            if (e.code === 'Escape') {
                closeModal();
            }
        });
        
        console.log(`半拿铁播客俏皮话扭蛋机已启动，共 ${xiehouyuData.length} 条`);
    }
    
    function init() {
        const elements = createModal();
        initGameLogic(elements);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();