// ==UserScript==
// @name         自定义滚动条
// @match        https://*/*
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjNGE5ZWZmIiBzdHJva2Utd2lkdGg9IjIiPjxyZWN0IHg9IjMiIHk9IjMiIHdpZHRoPSIxOCIgaGVpZ2h0PSIxOCIgcng9IjMiLz48cmVjdCB4PSIxNSIgeT0iNyIgd2lkdGg9IjQiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjNGE5ZWZmIiBzdHJva2U9Im5vbmUiLz48L3N2Zz4=
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    var IS_TM = typeof GM !== 'undefined' && typeof GM_getValue === 'function';

    if (window.__MINI_SCROLLBAR_INITIALIZED__) return;
    window.__MINI_SCROLLBAR_INITIALIZED__ = true;

    var CONFIG_KEY = 'mini_scrollbar_config';
    var GLOBAL_KEY = 'mini_scrollbar_global_config';
    var DEFAULT_CONFIG = {
        hidden: false,
        width: 8,
        borderRadius: 12,
        thumbColor: '#000000',
        thumbOpacity: 40,
        thumbBorderWidth: 1,
        showPanel: false,
        hideToggle: false
    };

    function loadConfig() {
        if (IS_TM) {
            try {
                var s = GM_getValue(GLOBAL_KEY);
                if (s) return merge(DEFAULT_CONFIG, JSON.parse(s));
            } catch (e) {}
            return merge(DEFAULT_CONFIG);
        }
        try {
            var s = localStorage.getItem(CONFIG_KEY);
            if (s) return merge(DEFAULT_CONFIG, JSON.parse(s));
        } catch (e) {}
        return merge(DEFAULT_CONFIG);
    }

    function merge() {
        var result = {};
        for (var i = 0; i < arguments.length; i++) {
            var src = arguments[i];
            for (var k in src) { if (src.hasOwnProperty(k)) result[k] = src[k]; }
        }
        return result;
    }

    function smartSave(config) {
        if (IS_TM) {
            var copy = merge(config);
            delete copy.showPanel;
            try { GM_setValue(GLOBAL_KEY, JSON.stringify(copy)); return true; }
            catch (e) { return false; }
        }
        try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)); return true; }
        catch (e) { return false; }
    }

    function clearConfig() {
        if (IS_TM) {
            try { GM_deleteValue(GLOBAL_KEY); return true; }
            catch (e) { return false; }
        }
        try { localStorage.removeItem(CONFIG_KEY); return true; }
        catch (e) { return false; }
    }

    var scrollbarStyle = null;

    function hexToRgba(hex, a) {
        var r = parseInt(hex.slice(1, 3), 16);
        var g = parseInt(hex.slice(3, 5), 16);
        var b = parseInt(hex.slice(5, 7), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    function genScrollbarCSS(c) {
        if (c.hidden) {
            return '::-webkit-scrollbar{width:0!important;height:0!important;display:none!important}body{scrollbar-width:none;-ms-overflow-style:none}';
        }
        var o = c.thumbOpacity / 100;
        var col = hexToRgba(c.thumbColor, o);
        var colH = hexToRgba(c.thumbColor, Math.min(o * 2, 1));
        var colA = hexToRgba(c.thumbColor, Math.min(o * 1.5, 0.8));
        return [
            '::-webkit-scrollbar{width:' + c.width + 'px!important;height:' + c.width + 'px!important;background:transparent}',
            '::-webkit-scrollbar:hover{background:rgba(128,128,128,.1)}',
            '::-webkit-scrollbar-thumb{border:' + c.thumbBorderWidth + 'px solid rgba(255,255,255,.4)!important;background-color:' + col + '!important;border-radius:' + c.borderRadius + 'px;background-clip:content-box;min-height:30px}',
            '::-webkit-scrollbar-thumb:hover{background-color:' + colH + '!important}',
            '::-webkit-scrollbar-thumb:active{background-color:' + colA + '!important}',
            '::-webkit-scrollbar-corner{background:rgba(255,255,255,.3);border:1px solid transparent}'
        ].join('');
    }

    function applyStyles(c) {
        if (!scrollbarStyle) {
            scrollbarStyle = document.createElement('style');
            scrollbarStyle.id = 'mini-scrollbar-styles';
            (document.head || document.documentElement).appendChild(scrollbarStyle);
        }
        scrollbarStyle.textContent = genScrollbarCSS(c);
    }

    var panelCSSReady = false;

    function isDark() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
    }

    function themeColors() {
        var d = isDark();
        return {
            bg: d ? 'rgba(30,30,30,.98)' : 'rgba(245,245,245,.98)',
            text: d ? '#e0e0e0' : '#333',
            textSec: d ? '#a0a0a0' : '#555',
            border: d ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)',
            btnBg: d ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)',
            btnBgH: d ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.1)',
            inputBg: d ? 'rgba(255,255,255,.05)' : '#fff',
            inputBd: d ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)',
            headerBg: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)',
            closeBtn: d ? '#aaa' : '#666',
            closeBtnH: d ? '#ddd' : '#333',
            rangeBg: d ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.15)',
            toggleOff: d ? '#555' : '#ccc',
            toggleHov: d ? '#666' : '#bbb',
        };
    }

    function genPanelCSS(tc) {
        return [
            '#mini-scrollbar-panel{position:fixed;top:20px;right:20px;width:280px;display:flex;flex-direction:column;',
            'background:' + tc.bg + ';border:1px solid ' + tc.border + ';border-radius:12px;',
            'box-shadow:0 8px 32px rgba(0,0,0,.3);z-index:2147483647;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:13px;',
            'color:' + tc.text + ';user-select:none;box-sizing:border-box;overflow:hidden}',
            '#mini-scrollbar-header{display:flex;justify-content:space-between;align-items:center;',
            'padding:12px 16px;background:' + tc.headerBg + ';border-bottom:1px solid ' + tc.border + ';',
            'border-radius:12px 12px 0 0;cursor:move;font-weight:500;color:' + tc.text + ';flex-shrink:0;box-sizing:border-box}',
            '#mini-scrollbar-close{background:none;border:none;color:' + tc.closeBtn + ';font-size:20px;cursor:pointer;padding:0;line-height:1}',
            '#mini-scrollbar-close:hover{color:' + tc.closeBtnH + '}',
            '#mini-scrollbar-content{padding:16px;overflow-y:auto;flex:1 1 0%;min-height:0;box-sizing:border-box}',
            '.mini-scrollbar-option{margin-bottom:14px;box-sizing:border-box}',
            '.mini-scrollbar-option label{display:block;margin-bottom:6px;color:' + tc.textSec + '}',
            '.mini-scrollbar-option input[type="range"]{width:100%;height:4px;-webkit-appearance:none;background:' + tc.rangeBg + ';border-radius:2px;outline:none;box-sizing:border-box}',
            '.mini-scrollbar-option input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;background:#4a9eff;border-radius:50%;cursor:pointer}',
            '.mini-scrollbar-option input[type="color"]{width:100%;height:32px;border:1px solid ' + tc.inputBd + ';border-radius:6px;cursor:pointer;background:' + tc.inputBg + ';box-sizing:border-box}',
            '.toggle-option{display:flex;justify-content:space-between;align-items:center;padding:8px 0;margin-bottom:0;border-bottom:1px solid ' + tc.border + ';box-sizing:border-box}',
            '.toggle-label{font-size:13px;color:' + tc.text + ';font-weight:500}',
            '.toggle-switch{position:relative;display:inline-block;width:44px;height:24px;cursor:pointer}',
            '.toggle-switch input{opacity:0;width:0;height:0}',
            '.toggle-slider{position:absolute;top:0;left:0;right:0;bottom:0;background-color:' + tc.toggleOff + ';transition:all .3s ease;border-radius:24px}',
            '.toggle-slider:before{position:absolute;content:"";height:18px;width:18px;left:3px;bottom:3px;background-color:white;transition:all .3s ease;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.3)}',
            '.toggle-switch input:checked+.toggle-slider{background-color:#4a9eff}',
            '.toggle-switch input:checked+.toggle-slider:before{transform:translateX(20px)}',
            '.toggle-switch:hover .toggle-slider{background-color:' + tc.toggleHov + '}',
            '.toggle-switch input:checked:hover+.toggle-slider{background-color:#3a8eef}',
            '#mini-scrollbar-actions{margin-top:16px;padding-top:12px;border-top:1px solid ' + tc.border + ';display:flex;flex-direction:column;gap:8px;flex-shrink:0;box-sizing:border-box}',
            '#mini-scrollbar-reset{width:100%;padding:8px;background:' + tc.btnBg + ';border:1px solid ' + tc.border + ';border-radius:6px;color:' + tc.text + ';cursor:pointer;transition:all .2s;font-size:13px;box-sizing:border-box}',
            '#mini-scrollbar-reset:hover{background:' + tc.btnBgH + ';color:' + tc.text + '}'
        ].join('');
    }

    function genToggleCSS(tc) {
        return '#mini-scrollbar-toggle{position:fixed;bottom:20px;right:-14px;width:28px;height:28px;' +
            'background:' + tc.bg + ';border:1px solid ' + tc.border + ';border-radius:50%;' +
            'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
            'z-index:2147483646;font-size:14px;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:all .3s ease;box-sizing:border-box}' +
            '#mini-scrollbar-toggle:hover{right:0;transform:scale(1.05);background:' + tc.bg + ';box-shadow:0 4px 12px rgba(0,0,0,.25)}';
    }

    function ensurePanelCSS() {
        if (panelCSSReady) return;
        var tc = themeColors();
        var ps = document.getElementById('mini-scrollbar-panel-styles');
        if (!ps) { ps = document.createElement('style'); ps.id = 'mini-scrollbar-panel-styles'; document.head.appendChild(ps); }
        ps.textContent = genPanelCSS(tc);
        var ts = document.getElementById('mini-scrollbar-toggle-styles');
        if (!ts) { ts = document.createElement('style'); ts.id = 'mini-scrollbar-toggle-styles'; document.head.appendChild(ts); }
        ts.textContent = genToggleCSS(tc);
        panelCSSReady = true;
    }

    function refreshThemeCSS() {
        if (!panelCSSReady) return;
        var tc = themeColors();
        var ps = document.getElementById('mini-scrollbar-panel-styles');
        if (ps) ps.textContent = genPanelCSS(tc);
        var ts = document.getElementById('mini-scrollbar-toggle-styles');
        if (ts) ts.textContent = genToggleCSS(tc);
    }

    var TOP_OFFSET = 20;
    var BOTTOM_SAFE = 20;

    function clampPanelHeight(panel) {
        if (!panel) return;
        var available = window.innerHeight - TOP_OFFSET - BOTTOM_SAFE;
        panel.style.maxHeight = available + 'px';
        requestAnimationFrame(function() {
            var rect = panel.getBoundingClientRect();
            if (rect.top < TOP_OFFSET) {
                panel.style.top = TOP_OFFSET + 'px';
            }
            if (rect.bottom > window.innerHeight - 4) {
                var overflow = rect.bottom - window.innerHeight + 8;
                panel.style.maxHeight = (available - overflow) + 'px';
            }
        });
    }

    function showToast(msg) {
        var tc = themeColors();
        var t = document.createElement('div');
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;' +
            'background:' + tc.bg + ';color:' + tc.text + ';border-radius:8px;font-size:13px;' +
            'z-index:2147483648;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:msbSlideDown .3s ease';
        t.textContent = msg;
        if (!document.getElementById('msb-toast-anim')) {
            var s = document.createElement('style');
            s.id = 'msb-toast-anim';
            s.textContent = '@keyframes msbSlideDown{from{opacity:0;transform:translateX(-50%) translateY(-20px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}';
            document.head.appendChild(s);
        }
        document.body.appendChild(t);
        setTimeout(function() { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(function() { t.remove(); }, 300); }, 2000);
    }

    function createToggle(cfg) {
        var old = document.getElementById('mini-scrollbar-toggle');
        if (old) old.remove();

        if (cfg.hideToggle) return;

        var btn = document.createElement('div');
        btn.id = 'mini-scrollbar-toggle';
        btn.innerHTML = '⚙️';
        btn.title = '滚动条设置';
        document.body.appendChild(btn);
        btn.addEventListener('click', function() {
            var p = document.getElementById('mini-scrollbar-panel');
            if (p) {
                closePanel();
            } else {
                openPanel();
            }
        });
    }

    var currentPanel = null;
    var resizeHandler = null;
    var activeCfg = null;

    function openPanel() {
        var existing = document.getElementById('mini-scrollbar-panel');
        if (existing) {
            existing.style.transition = 'box-shadow .15s ease';
            existing.style.boxShadow = '0 0 0 3px #4a9eff, 0 8px 32px rgba(0,0,0,.3)';
            setTimeout(function() {
                existing.style.boxShadow = '0 8px 32px rgba(0,0,0,.3)';
            }, 400);
            return;
        }
        var cfg = activeCfg || loadConfig();
        initPanel(cfg);
    }

    function closePanel() {
        var p = document.getElementById('mini-scrollbar-panel');
        if (p) {
            p.remove();
            currentPanel = null;
        }
        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }
        if (activeCfg) {
            activeCfg.showPanel = false;
            smartSave(activeCfg);
        }
    }

    function initPanel(cfg) {
        ensurePanelCSS();
        var cur = merge(cfg);
        activeCfg = cur;

        var panel = document.createElement('div');
        panel.id = 'mini-scrollbar-panel';
        currentPanel = panel;

        var dis = cur.hidden ? '0.5' : '1';
        var pe = cur.hidden ? 'none' : 'auto';

        var hideToggleHtml = '';
        if (IS_TM) {
            hideToggleHtml =
                '<div class="mini-scrollbar-option toggle-option">' +
                    '<span class="toggle-label">隐藏悬浮球</span>' +
                    '<label class="toggle-switch">' +
                        '<input type="checkbox" id="mini-scrollbar-hide-toggle"' + (cur.hideToggle ? ' checked' : '') + '>' +
                        '<span class="toggle-slider"></span>' +
                    '</label>' +
                '</div>';
        }

        panel.innerHTML =
            '<div id="mini-scrollbar-header">' +
                '<span>滚动条设置</span>' +
                '<button id="mini-scrollbar-close">&times;</button>' +
            '</div>' +
            '<div id="mini-scrollbar-content">' +
                '<div class="mini-scrollbar-option toggle-option">' +
                    '<span class="toggle-label">隐藏滚动条</span>' +
                    '<label class="toggle-switch">' +
                        '<input type="checkbox" id="mini-scrollbar-hidden"' + (cur.hidden ? ' checked' : '') + '>' +
                        '<span class="toggle-slider"></span>' +
                    '</label>' +
                '</div>' +
                hideToggleHtml +
                '<div class="mini-scrollbar-option" id="width-option" style="opacity:' + dis + ';pointer-events:' + pe + '">' +
                    '<label>宽度: <span id="width-value">' + cur.width + 'px</span></label>' +
                    '<input type="range" id="mini-scrollbar-width" min="4" max="20" value="' + cur.width + '">' +
                '</div>' +
                '<div class="mini-scrollbar-option" id="radius-option" style="opacity:' + dis + ';pointer-events:' + pe + '">' +
                    '<label>圆角: <span id="radius-value">' + cur.borderRadius + 'px</span></label>' +
                    '<input type="range" id="mini-scrollbar-radius" min="0" max="20" value="' + cur.borderRadius + '">' +
                '</div>' +
                '<div class="mini-scrollbar-option" id="color-option" style="opacity:' + dis + ';pointer-events:' + pe + '">' +
                    '<label>颜色:</label>' +
                    '<input type="color" id="mini-scrollbar-color" value="' + cur.thumbColor + '">' +
                '</div>' +
                '<div class="mini-scrollbar-option" id="opacity-option" style="opacity:' + dis + ';pointer-events:' + pe + '">' +
                    '<label>透明度: <span id="opacity-value">' + cur.thumbOpacity + '%</span></label>' +
                    '<input type="range" id="mini-scrollbar-opacity" min="10" max="100" value="' + cur.thumbOpacity + '">' +
                '</div>' +
                '<div id="mini-scrollbar-actions">' +
                    '<button id="mini-scrollbar-reset">重置</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(panel);
        clampPanelHeight(panel);

        resizeHandler = function() { clampPanelHeight(panel); };
        window.addEventListener('resize', resizeHandler);

        var mq = window.matchMedia('(prefers-color-scheme:dark)');
        var th = function() { refreshThemeCSS(); };
        mq.addEventListener('change', th);

        var drag = false, ox, oy;
        var hdr = panel.querySelector('#mini-scrollbar-header');
        hdr.addEventListener('mousedown', function(e) {
            if (e.target.id === 'mini-scrollbar-close') return;
            drag = true; ox = e.clientX - panel.offsetLeft; oy = e.clientY - panel.offsetTop;
        });
        document.addEventListener('mousemove', function(e) {
            if (!drag) return;
            var newLeft = e.clientX - ox;
            var newTop = e.clientY - oy;
            newTop = Math.max(0, Math.min(newTop, window.innerHeight - 60));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
            clampPanelHeight(panel);
        });
        document.addEventListener('mouseup', function() { drag = false; });

        panel.querySelector('#mini-scrollbar-close').addEventListener('click', closePanel);

        var updateDisabled = function() {
            ['width-option', 'radius-option', 'color-option', 'opacity-option'].forEach(function(id) {
                var el = panel.querySelector('#' + id);
                if (el) { el.style.opacity = cur.hidden ? '0.5' : '1'; el.style.pointerEvents = cur.hidden ? 'none' : 'auto'; }
            });
        };

        panel.querySelector('#mini-scrollbar-hidden').addEventListener('change', function(e) {
            cur.hidden = e.target.checked;
            updateDisabled();
            applyStyles(cur);
            smartSave(cur);
        });
        if (IS_TM) {
            var hideToggleInput = panel.querySelector('#mini-scrollbar-hide-toggle');
            if (hideToggleInput) {
                hideToggleInput.addEventListener('change', function(e) {
                    cur.hideToggle = e.target.checked;
                    createToggle(cur);
                    smartSave(cur);
                });
            }
        }

        var bindRange = function(inputId, key, displayId, suffix) {
            panel.querySelector('#' + inputId).addEventListener('input', function(e) {
                cur[key] = parseInt(e.target.value);
                var d = panel.querySelector('#' + displayId);
                if (d) d.textContent = cur[key] + suffix;
                applyStyles(cur);
                smartSave(cur);
            });
        };

        bindRange('mini-scrollbar-width', 'width', 'width-value', 'px');
        bindRange('mini-scrollbar-radius', 'borderRadius', 'radius-value', 'px');
        bindRange('mini-scrollbar-opacity', 'thumbOpacity', 'opacity-value', '%');

        panel.querySelector('#mini-scrollbar-color').addEventListener('input', function(e) {
            cur.thumbColor = e.target.value;
            applyStyles(cur);
            smartSave(cur);
        });

        panel.querySelector('#mini-scrollbar-reset').addEventListener('click', function() {
            if (clearConfig()) {
                showToast('✓ 已重置');
                cur = merge(DEFAULT_CONFIG);
                activeCfg = cur;
                panel.querySelector('#mini-scrollbar-hidden').checked = cur.hidden;
                if (IS_TM) {
                    var hti = panel.querySelector('#mini-scrollbar-hide-toggle');
                    if (hti) hti.checked = cur.hideToggle;
                }
                panel.querySelector('#mini-scrollbar-width').value = cur.width;
                panel.querySelector('#width-value').textContent = cur.width + 'px';
                panel.querySelector('#mini-scrollbar-radius').value = cur.borderRadius;
                panel.querySelector('#radius-value').textContent = cur.borderRadius + 'px';
                panel.querySelector('#mini-scrollbar-color').value = cur.thumbColor;
                panel.querySelector('#mini-scrollbar-opacity').value = cur.thumbOpacity;
                panel.querySelector('#opacity-value').textContent = cur.thumbOpacity + '%';
                updateDisabled();
                applyStyles(cur);
                smartSave(cur);
                createToggle(cur);
                clampPanelHeight(panel);
            } else {
                showToast('✗ 清空失败');
            }
        });

        cur.showPanel = true;
        smartSave(cur);
    }

    function registerMenuCommand() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            try {
                GM_registerMenuCommand('⚙ 设置', function() {
                    openPanel();
                }, 's');
            } catch (e) {}
        }
    }

    function init() {
        var cfg = loadConfig();
        activeCfg = cfg;
        applyStyles(cfg);

        requestAnimationFrame(function() {
            ensurePanelCSS();
            createToggle(cfg);
            registerMenuCommand();
            if (cfg.showPanel) {
                initPanel(cfg);
            }
        });
    }

    init();
})();