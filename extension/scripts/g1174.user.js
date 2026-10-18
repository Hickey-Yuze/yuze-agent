// 电子书图书馆阅读模式脚本
// 功能：将电子书内容框选出来，添加图书馆安静氛围背景

(function() {
    'use strict';
    
    // 创建图书馆风格样式
    const libraryStyle = `
        <style id="library-reading-mode">
            /* 图书馆风格背景 */
            body.library-mode {
                background: linear-gradient(135deg, #f5e9d9 0%, #e8d9c5 100%);
                background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" opacity="0.05"><rect width="100" height="100" fill="%23d4b483"/><path d="M0,0 L100,100 M100,0 L0,100" stroke="%23a67c52" stroke-width="1"/></svg>');
                font-family: 'Georgia', 'Times New Roman', serif;
                padding: 20px;
                min-height: 100vh;
                position: relative;
            }
            
            /* 内容框选区域 */
            .library-content-frame {
                max-width: 800px;
                margin: 40px auto;
                padding: 40px;
                background: rgba(255, 255, 255, 0.95);
                border-radius: 8px;
                box-shadow: 
                    0 10px 30px rgba(0, 0, 0, 0.1),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.5),
                    inset 0 0 20px rgba(210, 180, 140, 0.1);
                border: 1px solid #e0d0b0;
                position: relative;
                z-index: 1;
            }
            
            /* 模拟书本效果 */
            .library-content-frame::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(to right, #c9b08b, #a67c52, #c9b08b);
                border-radius: 8px 8px 0 0;
            }
            
            .library-content-frame::after {
                content: '';
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(to right, #c9b08b, #a67c52, #c9b08b);
                border-radius: 0 0 8px 8px;
            }
            
            /* 优化文本样式 */
            .library-content-frame p {
                font-size: 18px;
                line-height: 1.8;
                color: #333;
                margin-bottom: 1.5em;
                text-align: justify;
            }
            
            .library-content-frame h1,
            .library-content-frame h2,
            .library-content-frame h3 {
                color: #5d4037;
                font-weight: normal;
                border-bottom: 1px solid #e0d0b0;
                padding-bottom: 10px;
                margin-top: 2em;
                margin-bottom: 1em;
            }
            
            /* 隐藏干扰元素 */
            body.library-mode header,
            body.library-mode nav,
            body.library-mode .advertisement,
            body.library-mode .sidebar,
            body.library-mode footer,
            body.library-mode iframe,
            body.library-mode [class*="ad-"],
            body.library-mode [id*="ad-"] {
                display: none !important;
            }
            
            /* 添加图书馆装饰元素 */
            .library-decoration {
                position: fixed;
                z-index: 0;
                opacity: 0.1;
                pointer-events: none;
            }
            
            .bookshelf-left {
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                width: 60px;
                height: 300px;
                background: linear-gradient(to right, #8b7355, #a67c52);
                border-radius: 4px;
                box-shadow: 5px 5px 15px rgba(0, 0, 0, 0.2);
            }
            
            .bookshelf-right {
                right: 20px;
                top: 50%;
                transform: translateY(-50%);
                width: 60px;
                height: 300px;
                background: linear-gradient(to left, #8b7355, #a67c52);
                border-radius: 4px;
                box-shadow: -5px 5px 15px rgba(0, 0, 0, 0.2);
            }
            
            /* 阅读进度指示器 */
            .reading-progress {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                background: linear-gradient(to right, #a67c52, #c9b08b);
                transform-origin: 0%;
                z-index: 1000;
            }
            
            /* 专注模式开关 */
            .library-mode-toggle {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: #a67c52;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 20px;
                cursor: pointer;
                z-index: 1000;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                transition: all 0.3s ease;
            }
            
            .library-mode-toggle:hover {
                background: #8b7355;
                transform: translateY(-2px);
                box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
            }
        </style>
    `;
    
    // 创建装饰元素
    const createDecoration = () => {
        const leftShelf = document.createElement('div');
        leftShelf.className = 'library-decoration bookshelf-left';
        
        const rightShelf = document.createElement('div');
        rightShelf.className = 'library-decoration bookshelf-right';
        
        document.body.appendChild(leftShelf);
        document.body.appendChild(rightShelf);
    };
    
    // 创建阅读进度条
    const createProgressBar = () => {
        const progressBar = document.createElement('div');
        progressBar.className = 'reading-progress';
        
        document.body.appendChild(progressBar);
        
        // 更新进度条
        const updateProgress = () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = scrollTop / docHeight;
            progressBar.style.transform = `scaleX(${scrollPercent})`;
        };
        
        window.addEventListener('scroll', updateProgress);
        updateProgress();
    };
    
    // 创建切换按钮
    const createToggleButton = () => {
        const button = document.createElement('button');
        button.className = 'library-mode-toggle';
        button.textContent = '退出图书馆模式';
        button.onclick = toggleLibraryMode;
        
        document.body.appendChild(button);
    };
    
    // 切换图书馆模式
    function toggleLibraryMode() {
        if (document.body.classList.contains('library-mode')) {
            // 退出图书馆模式
            document.body.classList.remove('library-mode');
            document.querySelector('.library-mode-toggle').textContent = '进入图书馆模式';
            
            // 移除内容框
            const frame = document.querySelector('.library-content-frame');
            if (frame) {
                const content = frame.innerHTML;
                document.body.innerHTML = content;
            }
            
            // 移除样式
            const style = document.getElementById('library-reading-mode');
            if (style) style.remove();
            
            // 移除装饰元素
            document.querySelectorAll('.library-decoration, .reading-progress').forEach(el => el.remove());
            
        } else {
            // 进入图书馆模式
            document.body.classList.add('library-mode');
            
            // 添加样式
            document.head.insertAdjacentHTML('beforeend', libraryStyle);
            
            // 创建内容框
            const mainContent = document.querySelector('main, article, .content, #content') || document.body;
            const contentHTML = mainContent.innerHTML;
            
            const frame = document.createElement('div');
            frame.className = 'library-content-frame';
            frame.innerHTML = contentHTML;
            
            document.body.innerHTML = '';
            document.body.appendChild(frame);
            
            // 添加装饰和控件
            createDecoration();
            createProgressBar();
            createToggleButton();
        }
    }
    
    // 初始化
    if (!document.body.classList.contains('library-mode')) {
        toggleLibraryMode();
    }
    
})();