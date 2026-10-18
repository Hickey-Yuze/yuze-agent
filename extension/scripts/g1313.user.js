(function () {

    // ==========================================================================
    // 配置
    // ==========================================================================
    const DEFAULT_CONFIG = {
        // Minimap 宽度占屏幕的百分比
        width: 12,
        className: 'KMinimap-v1',
        // 聚焦模式: 'full'(全景), 'visual'(窗口), 'smart'(智能)
        focusMode: 'visual',
        // 手动刷新开关
        manualRenderOnly: false,
        // 结构层选择器：这些元素会在 Minimap 上绘制背景色块或边框
        structureSelectors: 'table, tr, td, th, img, pre, div.code-block, div.highlight, div.CodeMirror',
        // 布局层选择器：用于 Smart 模式计算内容分布密度
        layoutSelectors: 'p, h1, h2, h3, h4, h5, h6, table, img, pre, li, span, code, div',

        // --- 容器定位规则 ---
        // 不在规则内时，会自行寻找最大滚动区域
        customRules: {
            'km.sankuai.com': "//div[@id='ct-editor-wrapper']",
        },
        // --- 黑名单（按需添加） ---
        blacklist: {
            'example123.com': ['//div[@class="ad-banner1"]', '//div[@class="ad-banner2"]']
        },

        // --- 配色方案 ---
        colors: {
            bg: 'rgba(255, 255, 255, 0.98)', // 背景
            slider: '#646464',               // 滑块

            textOpacity: 0.4,                // 普通文本透明度
            boldOpacity: 0.9,                // 粗体/标题透明度

            tableOuterBorder: 'rgba(0, 0, 0, 0.4)', // 表格及代码块外框
            tableInnerBorder: 'rgba(0, 0, 0, 0.15)', // 表格内框线 (td/th)
            tableRow: 'rgba(0, 0, 0, 0.02)',

            codeBox: '#f6f8fa',              // 代码块背景色
            image: 'rgb(200, 200, 0)',       // 图片占位色
        }
    };

    // 设置面板 UI 结构定义
    const CONFIG_SCHEMA = [
        { title: '基础设置', type: 'header' },
        { key: 'width', label: 'Minimap 宽度 (%)', type: 'number', min: 5, max: 50, step: 1 },

        { title: '透明度控制', type: 'header' },
        { key: 'colors.textOpacity', label: '正文深浅', type: 'number', min: 0.1, max: 1.0, step: 0.1 },
        { key: 'colors.boldOpacity', label: '强调深浅', type: 'number', min: 0.1, max: 1.0, step: 0.1 },

        { title: '配色方案', type: 'header' },
        { key: 'colors.slider', label: '滑块颜色', type: 'color' },
        { key: 'colors.codeBox', label: '代码块底色', type: 'color-opacity' },
        { key: 'colors.tableOuterBorder', label: '表格外框', type: 'color-opacity' },
        { key: 'colors.tableInnerBorder', label: '表格内框', type: 'color-opacity' },
        { key: 'colors.image', label: '图片占位', type: 'color-opacity' },
        { key: 'colors.bg', label: '背景色', type: 'color-opacity' },
    ];

    const STORAGE_KEY = 'k_minimap_v1_settings';

    // 样式
    const style = document.createElement('style');
    style.innerHTML = `
        .minimap-toolbar input[type=number]::-webkit-inner-spin-button, 
        .minimap-toolbar input[type=number]::-webkit-outer-spin-button { 
            -webkit-appearance: none; 
            margin: 0; 
        }
        .minimap-settings-compact input[type=number]::-webkit-inner-spin-button { opacity: 1; }
        .minimap-settings-compact label { font-size: 12px !important; color: #555 !important; }
        .minimap-settings-compact input, .minimap-settings-compact select { font-size: 12px !important; height: 24px !important; }
        .minimap-settings-compact input[type=checkbox] { height: 16px !important; width: 16px !important; }
        .minimap-settings-compact .row { margin-bottom: 4px !important; min-height: 24px !important; }
        
        .minimap-toolbar {
            display: flex; justify-content: space-between; align-items: center;
            height: 30px;
            background: #f8f8f8; border-bottom: 1px solid #ddd;
            padding: 0 2px;
            font-family: sans-serif;
            position: absolute; top: 0; left: 0; width: 100%;
            z-index: 2147483647; box-sizing: border-box;
        }
        .minimap-toolbar .group { display: flex; align-items: center; gap: 2px; }
        
        .minimap-toolbar .btn { 
            cursor: pointer; padding: 0; border-radius: 2px; 
            display: flex; align-items: center; justify-content: center; 
            height: 22px; width: 22px;
            position: relative !important; 
            transition: all 0.2s;
        }
        .minimap-toolbar .btn:hover { opacity: 1; background: rgba(0,0,0,0.05); }

        .minimap-toolbar .btn svg {
            width: 14px; height: 14px;
            fill: currentColor;
            pointer-events: none;
        }
        /* 刷新-自动模式 */
        .minimap-toolbar .btn.refresh-btn { color: #999; }
        .minimap-toolbar .btn.refresh-btn:hover { color: #007acc; }
        /* 刷新-手动模式 */
        .minimap-toolbar .btn.refresh-btn.manual-mode {
            color: #f44336 !important;
            opacity: 1 !important;
        }
        .minimap-toolbar .btn.refresh-btn.manual-mode::after {
            content: '';
            position: absolute;
            top: 50% !important; 
            left: 50% !important; 
            transform: translate(-50%, -50%) rotate(-45deg) !important;
            width: 18px;
            height: 2px;
            background-color: #f44336;
            pointer-events: none;
            box-shadow: 0 0 2px rgba(255,255,255,1);
            z-index: 10;
        }

        .minimap-toolbar .page-info { 
            font-size: 10px; color: #666; font-family: monospace; transform: scale(0.9); 
        }
        
        .minimap-toolbar select { 
            font-size: 11px; height: 20px; 
            border: none; background: transparent; 
            max-width: 40px; color: #333; outline: none; cursor: pointer;
            appearance: none; -webkit-appearance: none; -moz-appearance: none;
            text-align: center; text-align-last: center; padding: 0;
            opacity: 0.8;
        }
        .minimap-toolbar select:hover { opacity: 1; font-weight: bold; }
    `;
    document.head.appendChild(style);

    // ==========================================
    // 2. 辅助函数
    // ==========================================

    function isCodeBlock(el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'pre' || tag === 'code') return true;
        if (el.className && typeof el.className === 'string') {
            if (el.className.includes('code-block')) return true;
            if (el.className.includes('CodeMirror')) return true;
        }
        return false;
    }

    /**
     * 判断元素是否处于“有效隐藏”状态
     * 根据 style="overflow: hidden" 和 height 判断折叠
     */
    function isEffectivelyHidden(el) {
        if (!el || el === document) return false;
        if (el.style.display === 'none') return true;
        if (el.style.visibility === 'hidden') return true;
        if ((el.style.height === '0px' || el.style.height === '0') && el.style.overflow === 'hidden') {
            return true;
        }
        const rect = el.getBoundingClientRect();
        if (rect.height === 0 && rect.width === 0) return true;
        return false;
    }

    /**
     * 判断元素是否为悬浮/固定定位
     * 解决悬浮窗、吸顶表头干扰
     */
    function isFloating(el) {
        if (!el || el === document) return false;
        try {
            const style = window.getComputedStyle(el);
            return style.position === 'fixed' || style.position === 'sticky';
        } catch (e) {
            return false;
        }
    }

    function getStaticOffset(el, root) {
        const rect = el.getBoundingClientRect();
        // 判断是否是 Window 全局滚动 (root 是 body 或 html)
        if (root === document.body || root === document.documentElement) {
            return {
                left: rect.left + window.scrollX,
                top: rect.top + window.scrollY
            };
        } else {
            // 容器内滚动
            const rootRect = root.getBoundingClientRect();
            return {
                left: (rect.left - rootRect.left) + root.scrollLeft,
                top: (rect.top - rootRect.top) + root.scrollTop
            };
        }
    }

    /**
     * 递归判断当前节点的截断边界
     * 只有 Full 模式下的 Table 允许溢出，其他一律截断
     */
    function getTruncationLimit(node, root, clientWidth, isFullMode) {
        let current = node;
        let insideTable = false;
        let insideCode = false;

        // 向上遍历
        while (current && current !== root && current !== document.body) {
            const tag = current.tagName.toLowerCase();
            // 检查表格
            if (tag === 'table' || tag === 'td' || tag === 'th') {
                insideTable = true;
            }
            // 检查代码块
            if (isCodeBlock(current)) {
                insideCode = true;
            }
            // 检查隐藏
            if (isEffectivelyHidden(current)) return -99999;
            current = current.parentElement;
        }

        // 1. Full 模式下的表格：允许无限溢出
        if (insideTable && isFullMode) return null;
        const rootRect = root.getBoundingClientRect();
        const screenRightEdge = rootRect.left + clientWidth;

        // 2. 代码块：强制截断在屏幕右边缘 (修复文字消失问题)
        if (insideCode) return screenRightEdge;

        // 3. 其他所有情况：也强制截断在屏幕右边缘
        return screenRightEdge;
    }

    function getElementsByXpath(xpath, contextNode = document) {
        const results = [];
        try {
            const query = document.evaluate(xpath, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            for (let i = 0; i < query.snapshotLength; i++) {
                results.push(query.snapshotItem(i));
            }
        } catch (e) { }
        return results;
    }

    class Minimap {
        constructor() {
            this.loadSettings();
            this.targetContainer = null;
            this.isWindowScroll = true;
            this.scale = 0.1;
            this.isDragging = false;
            this.dragRatio = 1;
            this.effectiveTrackHeight = 0;
            this.renderParams = { contentLeft: 0, contentWidth: 0, mapWidth: 0 };
            this.blacklistedElements = [];
            this.isPinned = this.settings.isPinned ?? true;
            this.isHovered = false;
            this.resizeTimer = null;

            this.initUI();
            this.initSPAListener();
            setTimeout(() => this.detectTargetAndBind(), 500);
            window.addEventListener('resize', () => {
                if (this.resizeTimer) clearTimeout(this.resizeTimer);
                this.resizeTimer = setTimeout(() => {
                    this.detectTargetAndBind();
                    this.update(true);
                }, 100);
            });
        }

        loadSettings() {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    this.settings = { ...DEFAULT_CONFIG, ...parsed, colors: { ...DEFAULT_CONFIG.colors, ...parsed.colors }, customRules: { ...DEFAULT_CONFIG.customRules, ...parsed.customRules }, blacklist: { ...DEFAULT_CONFIG.blacklist, ...parsed.blacklist } };
                } catch (e) { this.settings = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); }
            } else { this.settings = JSON.parse(JSON.stringify(DEFAULT_CONFIG)); }
        }
        saveSettings() { this.settings.isPinned = this.isPinned; localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings)); }
        getPixelWidth() { return window.innerWidth * (this.settings.width / 100); }
        getSliderRgba(opacity) {
            let hex = this.settings.colors.slider;
            if (!hex.startsWith('#')) return hex;
            let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
        }

        initUI() {
            const old = document.querySelector(`.${DEFAULT_CONFIG.className}`);
            if (old) old.remove();

            this.viewport = document.createElement('div');
            this.viewport.className = DEFAULT_CONFIG.className;
            Object.assign(this.viewport.style, {
                position: 'fixed', top: '0', right: '0', height: '100vh',
                width: `${this.settings.width}vw`, zIndex: '2147483647',
                background: this.settings.colors.bg,
                borderLeft: '1px solid rgba(0,0,0,0.1)',
                overflow: 'visible',
                userSelect: 'none',
                transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                transform: 'translateX(0)'
            });
            // 感应区
            this.sensor = document.createElement('div');
            Object.assign(this.sensor.style, {
                position: 'absolute', top: '0', left: '-20px', // 向左延伸 20px
                width: '20px', height: '100%',
                background: 'transparent',
                cursor: 'pointer',
                display: 'none' // 默认隐藏，只有收起时才显示
            });
            this.viewport.appendChild(this.sensor);
            this.toolbar = document.createElement('div');
            this.toolbar.className = 'minimap-toolbar';
            const leftGroup = document.createElement('div'); leftGroup.className = 'group';
            this.pinBtn = document.createElement('div'); this.pinBtn.className = 'btn'; this.pinBtn.innerHTML = this.isPinned ? '📌' : '☁️'; this.pinBtn.title = this.isPinned ? '当前: [固定] （左键切换）' : '当前: [吸附] （左键切换）'; this.pinBtn.onclick = () => this.togglePinMode();
            const refreshBtn = document.createElement('div'); refreshBtn.className = 'btn refresh-btn';
            refreshBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
            const updateRefreshTitle = () => {
                if (this.settings.manualRenderOnly) {
                    refreshBtn.classList.add('manual-mode');
                    refreshBtn.title = '当前: [手动刷新] （左键刷新，右键切换）';
                } else {
                    refreshBtn.classList.remove('manual-mode');
                    refreshBtn.title = '当前: [自动刷新] （左键刷新，右键切换）';
                }
            };
            updateRefreshTitle();
            refreshBtn.onclick = () => this.update(true);
            refreshBtn.oncontextmenu = (e) => {
                e.preventDefault();
                this.settings.manualRenderOnly = !this.settings.manualRenderOnly;
                this.saveSettings();
                updateRefreshTitle();
                if (!this.settings.manualRenderOnly) {
                    this.update(true);
                }
            };
            leftGroup.append(this.pinBtn, refreshBtn);

            // 页码
            const centerGroup = document.createElement('div');
            centerGroup.className = 'group';
            centerGroup.style.cursor = 'pointer';
            const pageContainer = document.createElement('div');
            pageContainer.style.cssText = 'display:flex; align-items:center; justify-content:center; min-width:50px; height:20px; border-radius:3px; transition: background 0.2s; padding: 0 4px;';
            pageContainer.onmouseenter = () => pageContainer.style.background = 'rgba(0,0,0,0.05)';
            pageContainer.onmouseleave = () => pageContainer.style.background = 'transparent';
            this.pageText = document.createElement('span');
            this.pageText.innerText = '1 / 1';
            this.pageText.style.cssText = 'font-size:10px; color:#888; font-family: "Menlo", "Consolas", monospace; font-weight:normal; letter-spacing: -0.5px; line-height: 20px; vertical-align: middle;';
            this.pageText.title = '输入页码';
            // 页码-输入框 (默认隐藏)
            this.pageInput = document.createElement('input');
            this.pageInput.type = 'number';
            this.pageInput.style.cssText = 'display:none; width:40px; height:18px; font-size:10px; text-align:center; border:none; border-bottom:1px solid #999; background:transparent; outline:none; padding:0; color:#333; font-family:monospace; -moz-appearance:textfield;';
            this.pageInput.title = 'Enter跳转';
            // 页码-切换
            pageContainer.onclick = () => {
                if (this.pageInput.style.display === 'none') {
                    this.pageText.style.display = 'none';
                    this.pageInput.style.display = 'block';
                    this.pageInput.value = parseInt(this.pageText.innerText.split('/')[0]);
                    this.pageInput.focus();
                    this.pageInput.select();
                }
            };
            // 页码-跳转
            const commitPage = () => {
                let page = parseInt(this.pageInput.value);
                if (!isNaN(page) && page >= 1) {
                    const clientH = this.isWindowScroll ? window.innerHeight : this.targetContainer.clientHeight;
                    const targetScroll = (page - 1) * clientH;
                    if (this.isWindowScroll) window.scrollTo({ top: targetScroll, behavior: 'auto' });
                    else this.targetContainer.scrollTop = targetScroll;
                }
                this.pageInput.style.display = 'none';
                this.pageText.style.display = 'block';
            };
            this.pageInput.onkeydown = (e) => { if (e.key === 'Enter') commitPage(); };
            this.pageInput.onblur = () => {
                setTimeout(commitPage, 100);
            };
            pageContainer.appendChild(this.pageText);
            pageContainer.appendChild(this.pageInput);
            centerGroup.appendChild(pageContainer);

            // 模式切换
            const rightGroup = document.createElement('div'); rightGroup.className = 'group';
            this.modeSelect = document.createElement('select');
            this.modeSelect.title = '点击切换';
            [{ v: 'full', l: '全景' }, { v: 'visual', l: '窗口' }, { v: 'smart', l: '智能' }].forEach(opt => {
                const option = document.createElement('option'); option.value = opt.v; option.innerText = opt.l;
                if (this.settings.focusMode === opt.v) option.selected = true;
                this.modeSelect.appendChild(option);
            });
            this.modeSelect.onchange = (e) => { this.settings.focusMode = e.target.value; this.saveSettings(); this.update(true); };
            // 设置
            const settingsBtn = document.createElement('div'); settingsBtn.className = 'btn'; settingsBtn.innerHTML = '⚙️'; settingsBtn.title = '设置';
            settingsBtn.onclick = () => this.openSettings();
            rightGroup.append(this.modeSelect, settingsBtn);

            this.toolbar.append(leftGroup, centerGroup, rightGroup);
            this.viewport.appendChild(this.toolbar);

            this.container = document.createElement('div');
            Object.assign(this.container.style, { position: 'absolute', top: '28px', left: '0', width: '100%', height: 'calc(100% - 28px)', willChange: 'transform' });
            this.viewport.appendChild(this.container);

            this.canvas = document.createElement('canvas');
            Object.assign(this.canvas.style, { display: 'block', width: '100%' });
            this.ctx = this.canvas.getContext('2d');
            this.container.appendChild(this.canvas);

            this.slider = document.createElement('div');
            Object.assign(this.slider.style, { position: 'absolute', left: '0', width: '100%', background: this.getSliderRgba(0.15), cursor: 'grab' });
            this.container.appendChild(this.slider);

            document.body.appendChild(this.viewport);
            this.applyPinMode();
            this.bindInteraction();
        }

        // 监听 SPA 的 URL 变化
        initSPAListener() {
            // 浏览器的前进/后退
            window.addEventListener('popstate', () => {
                // URL 变了，DOM 可能还没变，延迟一下再检测
                setTimeout(() => this.update(true), 500);
            });
            // 拦截 pushState 和 replaceState (Vue/React 路由切换通常用这个)
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            history.pushState = (...args) => {
                originalPushState.apply(history, args);
                setTimeout(() => this.update(true), 500);
            };
            history.replaceState = (...args) => {
                originalReplaceState.apply(history, args);
                setTimeout(() => this.update(true), 500);
            };
        }

        
        togglePinMode() {
            this.isPinned = !this.isPinned;
            this.pinBtn.innerHTML = this.isPinned ? '📌' : '☁️';
            this.pinBtn.title = this.isPinned ? '切换【吸附】' : '切换至【固定】';
            this.saveSettings();
            this.applyPinMode();
            this.update(true);
        }

        applyPinMode() {
            const html = document.documentElement;
            const pxWidth = this.getPixelWidth();
            if (this.isPinned) {
                this.viewport.style.transform = 'translateX(0)';
                this.viewport.style.opacity = '1';
                this.sensor.style.display = 'none'; // 展开时不需要感应区
                html.style.width = `calc(100% - ${this.settings.width}vw)`;
                html.style.marginRight = `${this.settings.width}vw`;
            } else {
                // 收起时，向右移动，保留 10px 露出来
                this.viewport.style.transform = `translateX(${pxWidth - 10}px)`;
                this.viewport.style.opacity = '0.6';
                this.sensor.style.display = 'block'; // 启用感应区
                html.style.width = '';
                html.style.marginRight = '';
            }
        }

        bindInteraction() {
            // 鼠标移入移出效果
            const onEnter = () => {
                this.isHovered = true;
                this.slider.style.background = this.getSliderRgba(0.25);
                if (!this.isPinned) {
                    this.viewport.style.transform = 'translateX(0)';
                    this.viewport.style.opacity = '1';
                    this.sensor.style.display = 'none'; // 展开后隐藏感应区
                    this.update(true);
                }
            };
            this.viewport.addEventListener('mouseenter', onEnter);
            this.sensor.addEventListener('mouseenter', onEnter);
            this.viewport.addEventListener('mouseleave', () => {
                this.isHovered = false;
                if (!this.isDragging) this.slider.style.background = this.getSliderRgba(0.15);
                if (!this.isPinned) {
                    this.viewport.style.transform = `translateX(${this.getPixelWidth() - 10}px)`;
                    this.viewport.style.opacity = '0.6';
                    this.sensor.style.display = 'block'; // 收起后显示感应区
                }
            });
            // 滑块拖拽逻辑
            const onMouseDown = (e) => {
                e.preventDefault(); e.stopPropagation();
                this.isDragging = true;
                this.dragStartY = e.clientY;
                this.dragStartScrollTop = this.isWindowScroll ? window.scrollY : this.targetContainer.scrollTop;
                this.slider.style.background = this.getSliderRgba(0.4);
                this.slider.style.cursor = 'grabbing';
                document.body.style.userSelect = 'none';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            };
            const onMouseMove = (e) => {
                if (!this.isDragging) return;
                const deltaY = e.clientY - this.dragStartY;
                const targetScrollTop = this.dragStartScrollTop + (deltaY * this.dragRatio);
                if (this.isWindowScroll) window.scrollTo(0, targetScrollTop);
                else this.targetContainer.scrollTop = targetScrollTop;
            };
            const onMouseUp = () => {
                this.isDragging = false;
                this.slider.style.cursor = 'grab';
                this.slider.style.background = this.getSliderRgba(0.25);
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };
            this.slider.addEventListener('mousedown', onMouseDown);

            // 点击 Minimap 内容定位
            this.container.addEventListener('mousedown', (e) => {
                if (e.target === this.slider) return;
                // 获取 Canvas 的绝对位置
                // getBoundingClientRect 自动包含了 translateY 的偏移，非常准确
                const canvasRect = this.canvas.getBoundingClientRect();
                // 计算点击点相对于 Canvas 图片顶部的距离 (像素)
                const clickYOnCanvas = e.clientY - canvasRect.top;
                // 换算成页面的绝对 Y 坐标
                // 页面高度 = 画布高度 / 缩放比例
                const targetPageY = clickYOnCanvas / this.scale;
                // 目标滚动高度 = 目标点 - 屏高度/8（指向鼠标位置略靠上一点）
                const clientH = this.isWindowScroll ? window.innerHeight : this.targetContainer.clientHeight;
                const targetScrollTop = Math.max(targetPageY - clientH / 8, 0);
                // 滚动
                if (this.isWindowScroll) window.scrollTo({ top: targetScrollTop, behavior: 'auto' });
                else this.targetContainer.scrollTop = targetScrollTop;
            });
        }

        calculateRenderParams() {
            if (!this.targetContainer) return;
            const root = this.isWindowScroll ? document.body : this.targetContainer;
            const pageWidth = this.isWindowScroll ? document.documentElement.scrollWidth : this.targetContainer.scrollWidth;
            const clientWidth = this.isWindowScroll ? window.innerWidth : this.targetContainer.clientWidth;
            const pxWidth = this.getPixelWidth();

            this.blacklistedElements = [];
            Object.keys(this.settings.blacklist).forEach(domainKey => { if (window.location.hostname.includes(domainKey)) this.settings.blacklist[domainKey].forEach(xpath => this.blacklistedElements.push(...getElementsByXpath(xpath, document))); });


            this.renderParams = { contentLeft: 0, contentWidth: pageWidth, mapWidth: pxWidth };

            if (this.settings.focusMode === 'full') {
                let maxContentWidth = Math.max(pageWidth, clientWidth);
                const INSANE_WIDTH_THRESHOLD = 30000; 
                // 遍历所有可能撑开宽度的结构元素 (暂时只遇到了表格)
                const structures = root.querySelectorAll(this.settings.structureSelectors);
                structures.forEach(el => {
                    if (el.closest('.' + DEFAULT_CONFIG.className)) return;
                    if (this.blacklistedElements.some(b => b.contains(el))) return;
                    if (isEffectivelyHidden(el)) return;
                    // 计算元素右边界
                    // getStaticOffset 计算元素相对于文档左侧的绝对距离
                    // scrollWidth 是元素内容的真实宽度（包含溢出部分）
                    const tag = el.tagName.toLowerCase();
                    const staticPos = getStaticOffset(el, root);
                    let effectiveW = el.scrollWidth;
                    const isPrivileged = (tag === 'table');
                    if (!isPrivileged) {
                        effectiveW = Math.min(el.scrollWidth, maxContentWidth);
                    }
                    const rightEdge = staticPos.left + effectiveW;
                    if (rightEdge > INSANE_WIDTH_THRESHOLD) return;
                    if (rightEdge > maxContentWidth) {
                        maxContentWidth = rightEdge;
                    }
                    });
                    this.renderParams.contentWidth = maxContentWidth;
            } else if (this.settings.focusMode === 'visual') {
                this.renderParams.contentWidth = clientWidth;
                this.renderParams.contentLeft = this.isWindowScroll ? window.scrollX : this.targetContainer.scrollLeft;
            } else {
                // 智能模式
                const nodes = root.querySelectorAll(this.settings.layoutSelectors);
                if (nodes.length > 0) {
                    const binSize = 50, binCount = Math.ceil(pageWidth / binSize);
                    const bins = new Array(binCount).fill(0);
                    const scrollLeft = this.isWindowScroll ? window.scrollX : this.targetContainer.scrollLeft;
                    const containerRect = this.isWindowScroll ? { left: 0 } : this.targetContainer.getBoundingClientRect();

                    nodes.forEach(el => {
                        if (el.closest('.' + DEFAULT_CONFIG.className) || this.blacklistedElements.some(b => b.contains(el))) return;
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0) return;
                        const left = (rect.left - containerRect.left) + scrollLeft;
                        const startBin = Math.floor(Math.max(0, left) / binSize);
                        const endBin = Math.floor(Math.min(pageWidth, left + rect.width) / binSize);
                        for (let i = startBin; i <= endBin; i++) if (i >= 0 && i < binCount) bins[i] += Math.min(rect.height, 1000);
                    });

                    const totalWeight = bins.reduce((a, b) => a + b, 0), threshold = totalWeight * 0.05;
                    let start = 0, end = binCount - 1, sum = 0;
                    for (let i = 0; i < binCount; i++) { sum += bins[i]; if (sum > threshold) { start = i; break; } }
                    sum = 0;
                    for (let i = binCount - 1; i >= 0; i--) { sum += bins[i]; if (sum > threshold) { end = i; break; } }

                    const minX = start * binSize, maxX = (end + 1) * binSize, padding = (maxX - minX) * 0.1;
                    this.renderParams.contentLeft = Math.max(0, minX - padding);
                    this.renderParams.contentWidth = (maxX - minX) + (padding * 2);
                    if (this.renderParams.contentWidth < 300) { this.renderParams.contentWidth = pageWidth; this.renderParams.contentLeft = 0; }
                }
            }
        }

        detectTargetAndBind() {
            let candidate = null;
            const currentDomain = window.location.hostname;
            let hasCustomRule = false;
            // 优先匹配自定义规则
            for (const [domainKey, xpath] of Object.entries(this.settings.customRules)) {
                if (currentDomain.includes(domainKey)) {
                    hasCustomRule = true;
                    const el = getElementsByXpath(xpath, document)[0];
                    if (el && el.nodeType === 1) {
                        candidate = el;
                    }
                    break;
                }
            }
            // 如果没有规则，尝试智能寻找最大滚动容器
            if (!hasCustomRule) {
                // 默认document
                candidate = document.documentElement;
                // 寻找更好的候选者：高度最大且可滚动的 div
                const allDivs = document.querySelectorAll('div');
                let maxScrollHeight = 0;
                let bestDiv = null;
                const winHeight = window.innerHeight;
                allDivs.forEach(div => {
                    // 1. 滚动高度必须明显大于视口高度 (例如 > 1.2倍)
                    // 2. 必须有垂直滚动条 (scrollHeight > clientHeight)
                    // 3. 排除隐藏元素
                    if (div.scrollHeight > winHeight * 1.2 && div.scrollHeight > div.clientHeight) {
                        const style = window.getComputedStyle(div);
                        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                            if (div.scrollHeight > maxScrollHeight) {
                                maxScrollHeight = div.scrollHeight;
                                bestDiv = div;
                            }
                        }
                    }
                });
                if (bestDiv) {
                    candidate = bestDiv;
                    // 如果没找到 bestDiv，且 document 也没高度（可能是加载中）
                    // 暂时不要绑定，返回 null，让 MutationObserver 继续等
                    if (document.documentElement.scrollHeight <= window.innerHeight) {
                        candidate = null; 
                    }
                }
            }
            // 绑定逻辑
            if (this.targetContainer !== candidate) {
                this.targetContainer = candidate;
                if (this.mutationObserver) this.mutationObserver.disconnect();
                if (this.scrollHandler && this.eventTarget) {
                    this.eventTarget.removeEventListener('scroll', this.scrollHandler);
                }
                if (this.targetContainer) {
                    this.isWindowScroll = (this.targetContainer === document.documentElement || this.targetContainer === document.body);
                    this.eventTarget = this.isWindowScroll ? window : this.targetContainer;
                    this.scrollHandler = () => { requestAnimationFrame(() => this.syncMinimapView()); };
                    this.eventTarget.addEventListener('scroll', this.scrollHandler, { passive: true });
                    let updateTimeout = null;
                    this.mutationObserver = new MutationObserver(() => {
                        const isExpanded = this.isPinned || this.isHovered;
                        if (!isExpanded) return;
                        if (updateTimeout) clearTimeout(updateTimeout);
                        updateTimeout = setTimeout(() => {
                            requestAnimationFrame(() => this.update());
                        }, 500); // 延迟 500ms，合并短时间内的多次变动
                    });
                    this.mutationObserver.observe(this.targetContainer, { childList: true, subtree: true, characterData: true });
                    this.update();
                } else {
                    // SPA 加载中：清空画布，监听 body 等待目标出现
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.slider.style.height = '0px';
                    this.mutationObserver = new MutationObserver(() => { this.detectTargetAndBind(); });
                    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
                }
            }
        }

        update(refresh = false) {
           if (refresh || (this.targetContainer && !this.targetContainer.isConnected)) {
                this.targetContainer = null; // 丢弃旧目标
                this.detectTargetAndBind();  // 重新寻找
            }
            if (!this.targetContainer) return;
            this.calculateRenderParams();
            const safeContentW = Math.max(this.renderParams.contentWidth, 100);
            this.scale = this.renderParams.mapWidth / safeContentW;
            const pageH = this.isWindowScroll ? document.documentElement.scrollHeight : this.targetContainer.scrollHeight;
            if (pageH === 0) return;
            const canvasH = pageH * this.scale;

            if (this.canvas.width !== this.getPixelWidth() || this.canvas.height !== Math.floor(canvasH)) {
                this.canvas.width = this.getPixelWidth();
                this.canvas.height = canvasH;
            }
            if (!this.settings.manualRenderOnly) {
                this.drawSkeleton();
            } else if (refresh) {
                if (this.settings.manualRenderOnly) {
                    // DEBUG 打印整体渲染参数
                    console.log('[Minimap Debug] Global:', {
                        mode: this.settings.focusMode,
                        pageWidth: this.isWindowScroll ? document.documentElement.scrollWidth : this.targetContainer.scrollWidth,
                        contentWidth: this.renderParams.contentWidth,
                        contentLeft: this.renderParams.contentLeft, 
                        scale: this.scale,
                        canvasHeight: canvasH
                    });
                    window._minimap_debug_count = 0;
                }
                this.drawSkeleton();
            }
            this.updateMetrics();
            this.syncMinimapView();
        }

        updateMetrics() {
            const viewportH = this.container.clientHeight;
            const pageH = this.isWindowScroll ? document.documentElement.scrollHeight : this.targetContainer.scrollHeight;
            const clientH = this.isWindowScroll ? window.innerHeight : this.targetContainer.clientHeight;
            const canvasH = this.canvas.height;
            this.effectiveTrackHeight = Math.min(canvasH, viewportH);
            const sliderH = Math.max(clientH * this.scale, 20);
            this.slider.style.height = `${sliderH}px`;
            const maxPageScroll = pageH - clientH;
            const maxSliderVisScroll = this.effectiveTrackHeight - sliderH;
            this.dragRatio = (maxSliderVisScroll > 0) ? (maxPageScroll / maxSliderVisScroll) : 0;
        }

        applyOpacity(colorStr, opacity) {
            const match = colorStr.match(/\d+(\.\d+)?/g);
            return (match && match.length >= 3) ? `rgba(${match[0]}, ${match[1]}, ${match[2]}, ${opacity})` : colorStr;
        }


        drawSkeleton() {
            const ctx = this.ctx;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, this.canvas.width, this.canvas.height); ctx.clip();

            const root = this.isWindowScroll ? document.body : this.targetContainer;
            const clientWidth = this.isWindowScroll ? window.innerWidth : this.targetContainer.clientWidth;
            const containerRect = this.isWindowScroll ? { top: 0, left: 0 } : this.targetContainer.getBoundingClientRect();
            const currentScrollTop = this.isWindowScroll ? window.scrollY : this.targetContainer.scrollTop;
            const currentScrollLeft = this.isWindowScroll ? window.scrollX : this.targetContainer.scrollLeft;
            const MAX_CODE_HEIGHT = 3000;

            // 判断节点是否可见/需要渲染
            const checkNodeStatus = (node, style) => {
                // 基础隐藏
                if (style.display === 'none' || style.visibility === 'hidden') return 'hidden';
                if (parseFloat(style.opacity) === 0) return 'hidden';
                // 折叠/高度为0 (height: 0 + overflow: hidden)
                // 必须同时检查这两个，因为有些元素只是 float 清除可能有 height 0 但 overflow visible
                if (style.overflow === 'hidden' && (parseFloat(style.height) === 0 || node.clientHeight === 0)) {
                    return 'hidden';
                }
                // 悬浮/吸顶 (fixed / sticky) -> 跳过
                if (style.position === 'fixed' || style.position === 'sticky') return 'skip';
                // 黑名单
                if (this.blacklistedElements.some(b => b === node)) return 'skip';
                return 'visible';
            };

            // 递归遍历
            const traverse = (node, parentStyle) => {
                // 文本节点处理
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.nodeValue;
                    if (!text.trim()) return; // 空白文本跳过
                    // 绘制文本
                    this.drawTextNode(ctx, node, text, parentStyle, containerRect, currentScrollTop, currentScrollLeft, clientWidth);
                    return;
                }
                // 元素节点处理
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const tagName = node.tagName.toLowerCase();
                    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript') return;
                    const style = window.getComputedStyle(node);

                    // 如果隐藏或悬浮，直接返回，不遍历
                    const status = checkNodeStatus(node, style);
                    if (status !== 'visible') return;

                    // 绘制结构背景 (代码块/表格/图片) ---
                    const rect = node.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        this.drawStructure(ctx, node, rect, style, containerRect, currentScrollTop, currentScrollLeft, clientWidth, MAX_CODE_HEIGHT);
                    }
                    // 如果是长代码块，画完背景后，直接返回，不遍历
                    if (isCodeBlock(node) && rect.height > MAX_CODE_HEIGHT) {
                        return;
                    }
                    // 将当前样式传给子节点
                    // 实际上文本节点需要用到父级的 color 和 fontWeight
                    const childNodes = node.childNodes;
                    for (let i = 0; i < childNodes.length; i++) {
                        traverse(childNodes[i], style);
                    }
                }
            };

            // 启动递归
            traverse(root, window.getComputedStyle(root));

            ctx.restore();
        }


        // 绘制结构
        drawStructure(ctx, node, rect, style, containerRect, scrollTop, scrollLeft, clientWidth, maxCodeHeight) {
            const isFullMode = this.settings.focusMode === 'full';
            const tag = node.tagName.toLowerCase();
            let effectiveWidth = rect.width;

            if (isFullMode && (tag === 'table')) {
                effectiveWidth = node.scrollWidth;
            } else {
                effectiveWidth = Math.min(rect.width, clientWidth);
            }

            let drawX, drawY;

            let staticPos = null;
            if (isFullMode) {
                staticPos = getStaticOffset(node, this.isWindowScroll ? document.body : this.targetContainer);
                drawX = (staticPos.left - this.renderParams.contentLeft) * this.scale;
                drawY = staticPos.top * this.scale;
            } else {
                drawX = ((rect.left - containerRect.left) + scrollLeft - this.renderParams.contentLeft) * this.scale;
                drawY = ((rect.top - containerRect.top) + scrollTop) * this.scale;
            }
            let drawW = effectiveWidth * this.scale;
            let drawH = rect.height * this.scale;

            if (this.settings.manualRenderOnly) {
                // DEBUG 打印前 5 个被绘制元素的坐标详情
                if (window._minimap_debug_count < 5) {
                    console.log('[Minimap Debug] Element:', tag, {
                        rectLeft: rect.left,
                        staticLeft: staticPos ? staticPos.left : 'N/A',
                        calcDrawX: drawX,
                        calcDrawY: drawY,
                        calcDrawW: drawW
                    });
                    window._minimap_debug_count = (window._minimap_debug_count || 0) + 1;
                }
            }

            if (drawX < 0) { drawW += drawX; drawX = 0; }
            if (drawX + drawW > this.renderParams.mapWidth) drawW = this.renderParams.mapWidth - drawX;
            if (drawW <= 0) return;

            // 绘制背景
            if (isCodeBlock(node)) {
                ctx.fillStyle = this.settings.colors.codeBox;
                ctx.fillRect(drawX, drawY, drawW, drawH);
                // 如果是长代码块，在这里画横线，而不是代码
                if (rect.height > maxCodeHeight) {
                    this.drawSimplifiedCodeBlock(ctx, node, drawX, drawY, drawW, drawH, this.scale);
                }
            } else if (tag === 'table') {
                ctx.strokeStyle = this.settings.colors.tableOuterBorder; ctx.lineWidth = 1; ctx.strokeRect(drawX, drawY, drawW, drawH);
            } else if (tag === 'img') {
                ctx.fillStyle = this.settings.colors.image; ctx.fillRect(drawX, drawY, drawW, Math.max(drawH, 1));
            } else if (tag === 'tr') {
                ctx.fillStyle = this.settings.colors.tableRow; ctx.fillRect(drawX, drawY, drawW, Math.max(drawH - 0.5, 1));
            } else if (tag === 'td' || tag === 'th') {
                ctx.strokeStyle = this.settings.colors.tableInnerBorder; ctx.lineWidth = 0.5; ctx.strokeRect(drawX, drawY, drawW, drawH);
            }
        }

        // 绘制文本
        drawTextNode(ctx, node, text, style, containerRect, scrollTop, scrollLeft, clientWidth) {
            // 颜色检查
            if (style.color === 'rgba(0, 0, 0, 0)' || style.color === 'transparent') return;
            // 截断检查
            const parent = node.parentElement;
            const isFullMode = this.settings.focusMode === 'full';
            const truncationLimit = getTruncationLimit(node.parentElement, document.body, clientWidth, isFullMode);
            const opacity = (parseInt(style.fontWeight) >= 600 || /^h[1-6]$/i.test(node.parentElement.tagName)) ? this.settings.colors.boldOpacity : this.settings.colors.textOpacity;
            const finalColor = this.applyOpacity(style.color, opacity);
            let staticParentOffset = null;
            if (isFullMode) {
                staticParentOffset = getStaticOffset(parent, this.isWindowScroll ? document.body : this.targetContainer);
            }

            // 范围查找与绘制
            const range = document.createRange();
            const wordRegex = /[^\s\u00a0]+/g;
            let match;

            while ((match = wordRegex.exec(text)) !== null) {
                range.setStart(node, match.index);
                range.setEnd(node, match.index + match[0].length);
                const rects = range.getClientRects();

                for (const rect of rects) {
                    if (rect.width === 0 || rect.height === 0) continue;

                    // 截断：如果文本超出了允许的边界，跳过绘制
                    // Full模式下的表格允许溢出
                    if (truncationLimit !== null && rect.left >= truncationLimit) continue;

                    let drawX, drawY, drawW, drawH;
                    if (isFullMode && staticParentOffset) {
                        const parentRect = parent.getBoundingClientRect();
                        drawX = (staticParentOffset.left + (rect.left - parentRect.left) - this.renderParams.contentLeft) * this.scale;
                        drawY = (staticParentOffset.top + (rect.top - parentRect.top)) * this.scale;
                    } else {
                        drawX = ((rect.left - containerRect.left) + scrollLeft - this.renderParams.contentLeft) * this.scale;
                        drawY = ((rect.top - containerRect.top) + scrollTop) * this.scale;
                    }
                    drawW = rect.width * this.scale;
                    drawH = rect.height * this.scale;

                    if (drawX < 0) { drawW += drawX; drawX = 0; }
                    if (drawX + drawW > this.renderParams.mapWidth) drawW = this.renderParams.mapWidth - drawX;
                    if (drawW <= 0) continue;

                    ctx.fillStyle = finalColor;
                    ctx.fillRect(drawX, drawY, drawW, Math.max(drawH, 1.5));
                }
            }
        }

        // 简化绘制代码块
        drawSimplifiedCodeBlock(ctx, el, baseX, baseY, baseW, baseH, scale) {
            ctx.fillStyle = 'rgba(128, 128, 128, 0.5)';
            const step = 5;
            // 直接循环像素高度
            for (let y = 0; y < baseH; y += step) {
                const lineIndex = y / step;
                // 加噪随机
                let noise = Math.sin(lineIndex * 12.9898) * 43758.5453;
                noise = noise - Math.floor(noise);
                const randomFactor = noise * 0.6 + 0.2;
                let drawW = baseW * randomFactor;
                if (drawW > baseW) drawW = baseW;
                // 高度 2.5px
                ctx.fillRect(baseX, baseY + y, drawW, 2);
            }
        }


        syncMinimapView() {
            if (!this.isPinned && !this.isHovered) return;  // 收起状态不计算滚动
            if (!this.targetContainer) return;
            const scrollTop = this.isWindowScroll ? window.scrollY : this.targetContainer.scrollTop;
            const pageH = this.isWindowScroll ? document.documentElement.scrollHeight : this.targetContainer.scrollHeight;
            const clientH = this.isWindowScroll ? window.innerHeight : this.targetContainer.clientHeight;
            // 滚动进度 (0~1)
            const maxPageScroll = pageH - clientH;
            const progress = maxPageScroll > 0 ? (scrollTop / maxPageScroll) : 0;
            // 滑块在 Canvas 坐标系中的位置
            const sliderTopOnCanvas = scrollTop * this.scale;
            const sliderH = parseFloat(this.slider.style.height) || 20;
            // 设置滑块位置 (滑块始终相对于 container 定位)
            this.slider.style.top = `${sliderTopOnCanvas}px`;
            // 计算容器偏移
            // 视口高度（Minimap 容器的高度）
            const viewportH = this.container.clientHeight;
            // 画布实际高度
            const canvasH = this.canvas.height;
            let offsetY = 0;
            // 只有当画布高度超过视口高度时，才需要滚动画布
            if (canvasH > viewportH) {
                // 计算滑块在视口中的视觉位置 (0 ~ viewportH - sliderH)
                const visualSliderTop = Math.min(1, Math.max(0, progress)) * (viewportH - sliderH);
                // 偏移量 = 滑块真实位置 - 滑块视觉位置
                offsetY = sliderTopOnCanvas - visualSliderTop;
                // 边界修正：防止底部露白
                const maxOffset = canvasH - viewportH;
                if (offsetY > maxOffset) offsetY = maxOffset;
                if (offsetY < 0) offsetY = 0;
            } else {
                // 页面很短，不需要滚动画布，始终顶格显示
                offsetY = 0;
            }

            this.container.style.transform = `translateY(-${offsetY}px)`;
            // 页码
            const totalPages = Math.ceil(pageH / clientH);
            let currentPage = Math.floor(scrollTop / clientH) + 1;
            if (scrollTop + clientH >= pageH - 5) {
                currentPage = totalPages;
            }
            this.pageInput.value = currentPage;
            this.pageText.innerText = `${currentPage} / ${totalPages}`;
        }

        openSettings() {
            const modal = document.createElement('div');
            Object.assign(modal.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.4)', zIndex: '2147483647',
                display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(2px)'
            });

            const content = document.createElement('div');
            content.className = 'minimap-settings-compact';
            Object.assign(content.style, {
                background: '#fff', padding: '16px', borderRadius: '8px', width: '400px', maxHeight: '85vh',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
                overflowY: 'auto', fontFamily: 'system-ui, sans-serif'
            });

            const title = document.createElement('h3');
            title.innerText = 'Minimap 设置';
            title.style.cssText = 'margin: 0 0 12px 0; font-size: 16px; color: #333;';
            content.appendChild(title);

            const tempSettings = JSON.parse(JSON.stringify(this.settings));

            const parseColor = (str) => {
                if (!str) return { hex: '#000000', alpha: 1 };
                const div = document.createElement('div'); div.style.color = str; document.body.appendChild(div);
                const computed = window.getComputedStyle(div).color; document.body.removeChild(div);
                const rgba = computed.match(/[\d.]+/g);
                if (!rgba) return { hex: '#000000', alpha: 1 };
                const r = parseInt(rgba[0]).toString(16).padStart(2, '0');
                const g = parseInt(rgba[1]).toString(16).padStart(2, '0');
                const b = parseInt(rgba[2]).toString(16).padStart(2, '0');
                const a = rgba[3] !== undefined ? parseFloat(rgba[3]) : 1;
                return { hex: `#${r}${g}${b}`, alpha: a };
            };
            const mergeColor = (hex, alpha) => {
                const r = parseInt(hex.slice(1, 3), 16); const g = parseInt(hex.slice(3, 5), 16); const b = parseInt(hex.slice(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            };
            const getValue = (obj, path) => path.split('.').reduce((o, k) => o[k], obj);
            const setValue = (obj, path, val) => {
                const keys = path.split('.'); const last = keys.pop(); const target = keys.reduce((o, k) => o[k], obj); target[last] = val;
            };

            CONFIG_SCHEMA.forEach(item => {
                if (item.type === 'header') {
                    const h = document.createElement('div');
                    h.innerText = item.title;
                    h.style.cssText = 'font-weight:bold; color:#666; margin-top:12px; border-bottom:1px solid #eee; padding-bottom:4px; font-size:12px; margin-bottom: 6px;';
                    content.appendChild(h);
                    return;
                }

                const row = document.createElement('div');
                row.className = 'row';
                row.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;';
                if (item.tooltip) row.title = item.tooltip;

                const label = document.createElement('label');
                label.innerText = item.label;

                const inputContainer = document.createElement('div');
                inputContainer.style.cssText = 'display:flex; align-items:center; justify-content:flex-end; gap: 8px;';
                const currentVal = getValue(tempSettings, item.key);

                if (item.type === 'checkbox') {
                    const input = document.createElement('input');
                    input.type = 'checkbox';
                    input.checked = currentVal;
                    input.onchange = (e) => setValue(tempSettings, item.key, e.target.checked);
                    inputContainer.appendChild(input);
                } else if (item.type === 'number') {
                    const input = document.createElement('input');
                    input.type = 'number'; input.value = currentVal;
                    input.style.cssText = 'width: 50px; text-align: left; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px;';
                    if (item.step) input.step = item.step;
                    if (item.min !== undefined) input.min = item.min;
                    if (item.max !== undefined) input.max = item.max;
                    input.onchange = (e) => {
                        let val = parseFloat(e.target.value);
                        if (item.min !== undefined && val < item.min) val = item.min;
                        if (item.max !== undefined && val > item.max) val = item.max;
                        e.target.value = val; setValue(tempSettings, item.key, val);
                    };
                    inputContainer.appendChild(input);

                } else if (item.type === 'color') {
                    const input = document.createElement('input');
                    input.type = 'color'; input.value = currentVal;
                    input.style.cssText = 'width: 36px; height: 22px; cursor: pointer; border: 1px solid #ccc; padding: 0; border-radius: 2px;';
                    input.onchange = (e) => setValue(tempSettings, item.key, e.target.value);
                    inputContainer.appendChild(input);

                } else if (item.type === 'color-opacity') {
                    const parsed = parseColor(currentVal);
                    const colorInput = document.createElement('input');
                    colorInput.type = 'color'; colorInput.value = parsed.hex;
                    colorInput.style.cssText = 'width: 36px; height: 22px; cursor: pointer; border: 1px solid #ccc; padding: 0; border-radius: 2px;';

                    const alphaInput = document.createElement('input');
                    alphaInput.type = 'number'; alphaInput.min = 0; alphaInput.max = 1; alphaInput.step = 0.05; alphaInput.value = parsed.alpha;
                    alphaInput.style.cssText = 'width: 50px; text-align: left; border: 1px solid #ccc; border-radius: 4px; padding: 0 4px;';

                    const updateColor = () => {
                        let a = parseFloat(alphaInput.value);
                        if (a < 0) a = 0; if (a > 1) a = 1; alphaInput.value = a;
                        setValue(tempSettings, item.key, mergeColor(colorInput.value, a));
                    };
                    colorInput.oninput = updateColor; alphaInput.onchange = updateColor;
                    inputContainer.appendChild(colorInput); inputContainer.appendChild(alphaInput);
                }
                row.appendChild(label); row.appendChild(inputContainer); content.appendChild(row);
            });

            const btnRow = document.createElement('div');
            btnRow.style.cssText = 'display:flex; gap:10px; justify-content:flex-end; margin-top:16px;';

            const resetBtn = document.createElement('button');
            resetBtn.innerText = '重置默认';
            resetBtn.style.cssText = 'padding:4px 12px; background:#f44336; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px; margin-right:auto;';
            resetBtn.onclick = () => {
                if (confirm('确定恢复默认设置吗？')) {
                    this.settings = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
                    this.saveSettings();
                    location.reload();
                }
            };

            const saveBtn = document.createElement('button');
            saveBtn.innerText = '保存';
            saveBtn.style.cssText = 'padding:4px 12px; background:#007acc; color:#fff; border:none; border-radius:4px; cursor:pointer; font-size:12px;';
            saveBtn.onclick = () => {
                this.settings = tempSettings; this.saveSettings();
                this.viewport.style.width = `${this.settings.width}vw`;
                this.viewport.style.background = this.settings.colors.bg;
                this.slider.style.background = this.getSliderRgba(0.15);
                this.applyPinMode(); this.detectTargetAndBind(); this.update();
                document.body.removeChild(modal);
            };

            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = '取消';
            cancelBtn.style.cssText = 'padding:4px 12px; background:#eee; color:#333; border:none; border-radius:4px; cursor:pointer; font-size:12px;';
            cancelBtn.onclick = () => document.body.removeChild(modal);

            btnRow.appendChild(resetBtn);
            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(saveBtn);
            content.appendChild(btnRow);
            modal.appendChild(content);
            document.body.appendChild(modal);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') new Minimap();
    else window.addEventListener('DOMContentLoaded', () => new Minimap());

})();