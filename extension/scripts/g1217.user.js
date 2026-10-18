(function() {
    'use strict';

    // 目标URL
    const TARGET_URL = 'https://web.wetab.link/';
    
    // 获取当前URL
    const currentUrl = window.location.href;
    
    // 检查当前URL是否已经是目标网站
    if (!currentUrl.startsWith('https://web.wetab.link/')) {
        console.log(`正在重定向到: ${TARGET_URL}`);
        window.location.href = TARGET_URL;
    }
})();