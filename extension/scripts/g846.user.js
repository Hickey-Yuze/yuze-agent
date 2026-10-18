(function() {
    // 配置参数
    const CONFIG = {
        messageSelector: '.theme-user-message',
        containerId: 'chat-timeline-sidebar',
        width: '240px',          // 展开后的宽度
        visibleWidth: '12px',    // 收起时露出的宽度（把手宽度）
        truncateLength: 18       // 标题截断长度
    };

    // 0. 清理旧实例（防止重复执行导致样式堆叠）
    function cleanup() {
        const oldSidebar = document.getElementById(CONFIG.containerId);
        const oldStyle = document.getElementById('timeline-styles');
        if (oldSidebar) oldSidebar.remove();
        if (oldStyle) oldStyle.remove();
    }

    // 1. 注入 CSS 样式（含动画效果）
    function injectStyles() {
        const style = document.createElement('style');
        style.id = 'timeline-styles';
        style.textContent = `
            #${CONFIG.containerId} {
                position: fixed;
                right: 0;
                top: 100px;
                bottom: 120px;
                width: ${CONFIG.width};
                background: var(--panel-bg, #ffffff);
                border-left: 1px solid var(--intensity-6, #e5e5e5);
                box-shadow: -2px 0 8px rgba(0,0,0,0.05);
                z-index: 9999;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                
                /* 核心收缩逻辑 */
                transform: translateX(calc(100% - ${CONFIG.visibleWidth}));
                transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
                opacity: 0.9;
                border-top-left-radius: 12px;
                border-bottom-left-radius: 12px;
            }

            /* 鼠标悬停时展开 */
            #${CONFIG.containerId}:hover {
                transform: translateX(0);
                opacity: 1;
                box-shadow: -8px 0 24px rgba(0,0,0,0.15);
            }

            /* 左侧视觉“把手”提示 */
            #${CONFIG.containerId}::before {
                content: "";
                position: absolute;
                left: 4px;
                top: 50%;
                transform: translateY(-50%);
                width: 4px;
                height: 40px;
                background-color: var(--intensity-20, #ccc);
                border-radius: 2px;
                pointer-events: none; /* 防止遮挡鼠标事件 */
                transition: background-color 0.2s;
            }
            
            #${CONFIG.containerId}:hover::before {
                background-color: var(--accent, #007bff);
            }

            #${CONFIG.containerId} h3 {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary, #333);
                margin: 0;
                padding-bottom: 8px;
                border-bottom: 1px solid var(--intensity-6, #e5e5e5);
                white-space: nowrap;
            }

            .timeline-list {
                flex: 1;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 6px;
                padding-right: 4px; /* 防止滚动条遮挡文字 */
            }

            .timeline-item {
                display: flex;
                align-items: center;
                padding: 8px 10px;
                font-size: 12px;
                color: var(--text-secondary, #666);
                background: var(--intensity-4, #f5f5f5);
                border-radius: 6px;
                cursor: pointer;
                text-decoration: none;
                transition: all 0.2s;
                border-left: 3px solid transparent;
            }

            .timeline-item:hover {
                background: var(--intensity-6, #e5e5e5);
                color: var(--text-primary, #000);
                border-left-color: var(--accent, #007bff);
                transform: translateX(-2px);
            }

            .timeline-index {
                font-weight: bold;
                margin-right: 6px;
                opacity: 0.5;
                min-width: 16px;
            }

            .timeline-text {
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                flex: 1;
            }

            /* 滚动条样式 */
            .timeline-list::-webkit-scrollbar { width: 4px; }
            .timeline-list::-webkit-scrollbar-thumb { background: var(--intensity-10, #ccc); border-radius: 2px; }
        `;
        document.head.appendChild(style);
    }

    // 2. 创建侧边栏容器
    function createSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = CONFIG.containerId;
        
        // 标题
        const header = document.createElement('h3');
        header.innerText = '对话导航';
        sidebar.appendChild(header);

        // 列表容器
        const list = document.createElement('div');
        list.className = 'timeline-list';
        sidebar.appendChild(list);

        document.body.appendChild(sidebar);
        return list;
    }

    // 3. 扫描并更新目录
    function updateTimeline() {
        let listContainer = document.querySelector(`#${CONFIG.containerId} .timeline-list`);
        if (!listContainer) {
            listContainer = createSidebar();
        }

        const messages = document.querySelectorAll(CONFIG.messageSelector);
        listContainer.innerHTML = ''; // 清空重绘

        if (messages.length === 0) {
            listContainer.innerHTML = '<div style="padding:10px; font-size:12px; color:var(--text-tertiary); text-align:center;">暂无对话</div>';
            return;
        }

        messages.forEach((msg, index) => {
            // 确保消息有ID锚点
            if (!msg.id) msg.id = `msg-anchor-${index}`;

            // 提取并截断文本
            let rawText = msg.innerText.trim().replace(/\s+/g, ' ');
            let displayText = rawText;
            if (displayText.length > CONFIG.truncateLength) {
                displayText = displayText.substring(0, CONFIG.truncateLength) + '...';
            }
            if (!displayText) displayText = "图片或附件";

            // 创建条目
            const item = document.createElement('div');
            item.className = 'timeline-item';
            item.title = rawText; // 悬停显示完整文本
            
            // 序号
            const idxSpan = document.createElement('span');
            idxSpan.className = 'timeline-index';
            idxSpan.innerText = `${index + 1}.`;
            
            // 文本
            const textSpan = document.createElement('span');
            textSpan.className = 'timeline-text';
            textSpan.innerText = displayText;

            item.appendChild(idxSpan);
            item.appendChild(textSpan);

            // 点击跳转逻辑
            item.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                msg.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 高亮闪烁效果
                const prevTransition = msg.style.transition;
                msg.style.transition = 'background-color 0.3s';
                msg.style.backgroundColor = 'var(--accent-20, rgba(0,123,255,0.2))'; // 临时高亮色
                setTimeout(() => {
                    msg.style.backgroundColor = '';
                    setTimeout(() => { msg.style.transition = prevTransition; }, 300);
                }, 600);
            };

            listContainer.appendChild(item);
        });
    }

    // 4. 初始化与监听
    function init() {
        console.log('Initializing Sliding Chat Timeline...');
        cleanup();       // 先清理
        injectStyles();  // 再注入
        updateTimeline();// 初次渲染

        // 监听DOM变化（新消息上屏）
        const observer = new MutationObserver((mutations) => {
            const hasAddedNodes = mutations.some(m => m.addedNodes.length > 0);
            if (hasAddedNodes) {
                // 防抖更新
                if (window._timelineDebounce) clearTimeout(window._timelineDebounce);
                window._timelineDebounce = setTimeout(updateTimeline, 500);
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 执行脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();