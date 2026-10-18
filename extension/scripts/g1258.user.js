(function() {
    console.log('🚀 正在执行 CSDN 深度解锁脚本...');
    
    // 1. 暴力注入全局样式，强制开启选中
    const styleId = 'csdn-unlock-style-v2';
    if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.textContent = `
            *, *::before, *::after {
                -webkit-user-select: text !important;
                -moz-user-select: text !important;
                -ms-user-select: text !important;
                user-select: text !important;
                -webkit-touch-callout: default !important;
            }
            body, html, .article_content, #content_views, #article_content, .htmledit_views, .blog-content-box {
                user-select: text !important;
            }
        `;
        document.head.appendChild(s);
    }

    // 2. 清除所有内联的 user-select 样式
    document.querySelectorAll('*[style*="user-select"]').forEach(el => {
        el.style.removeProperty('user-select');
        el.style.removeProperty('-webkit-user-select');
        el.style.removeProperty('-moz-user-select');
    });

    // 3. 劫持事件监听 (在捕获阶段拦截)
    window.addEventListener('contextmenu', e => { e.stopPropagation(); return true; }, true);
    window.addEventListener('selectstart', e => { e.stopPropagation(); return true; }, true);
    window.addEventListener('copy', e => { e.stopPropagation(); }, true);
    
    // 重置常见的全局事件绑定
    document.oncontextmenu = null;
    document.oncopy = null;
    document.oncut = null;
    document.onselectstart = null;
    document.body.oncontextmenu = null;
    document.body.oncopy = null;
    document.body.oncut = null;
    document.body.onselectstart = null;

    // 4. 隐藏所有弹窗和遮罩
    const selectors = [
        '.passport-login-tip-container', '.mask-dark', '.skin-boxshadow', 
        '.directory-boxshadow', '#st_mask', '.unlogin-comment-model',
        '.vip-limited-time-offer-box-new', '.toolbar-btn-login'
    ];
    
    const modalStyle = document.createElement('style');
    modalStyle.textContent = selectors.map(sel => `${sel} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).join(' ');
    document.head.appendChild(modalStyle);

    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
        });
    });

    // 5. 启动监控，防止动态加载的限制
    new MutationObserver(() => {
        clearTimeout(window.__csdnTimer);
        window.__csdnTimer = setTimeout(() => {
            document.querySelectorAll('*[style*="user-select"]').forEach(el => {
                el.style.removeProperty('user-select');
                el.style.removeProperty('-webkit-user-select');
            });
            selectors.forEach(sel => document.querySelectorAll(sel).forEach(el => el.style.display = 'none'));
        }, 100);
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    console.log('✅ 解锁完成！请尝试选中文本复制。');
})();