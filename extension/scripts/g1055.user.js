// ==UserScript==
// @name         全能工具箱 Q（V1.1.4 Enhanced）
// @namespace    https://github.com/example/all-in-one-toolbox
// @version      1.1.4
// @description  全站工具箱：快速启动、视频调速、网盘、音乐、主题、广告移除和视觉特效
// @author       Toolbox Creator
// @match        *://*/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==

/*
更新说明 V1.1.4
1. 新增 QHR 超级插件网页跳转页面
2. 添加 5 个全新主题（极光、薰衣草、珊瑚、石墨、薄荷）
3. 优化主题选择器布局
4. 点击计数器支持持久化保存
*/

(function () {
    'use strict';

    if (globalThis.__TOOLBOX_Q_114__) return;
    globalThis.__TOOLBOX_Q_114__ = true;

    const C = {
        version: '1.1.4',
        prefix: 'toolbox_',
        openKey: '/',
        closeKey: 'Escape',
        themes: ['light', 'dark', 'ocean', 'forest', 'midnight', 'sunset', 'autumn', 'spring', 'hacker', 'aurora', 'lavender', 'coral', 'slate', 'mint'],
        speeds: [0.25, 0.5, 1, 1.5, 2, 4, 8, 16],
        speedMin: 0.05,
        speedMax: 16
    };

    const AD_SELECTORS_LIBRARY = [
        { name: '📦 普通广告块', selector: '.ad', desc: '隐藏常见广告 DIV' },
        { name: '🏷️ 广告属性', selector: '[data-ad]', desc: '隐藏网页标记广告元素' },
        { name: '📢 推广区域', selector: '.promotion', desc: '隐藏推广内容' },
        { name: '🎬 视频广告', selector: '.video-ad', desc: '隐藏播放器广告' },
        { name: '🎈 浮动广告', selector: '.float-ad', desc: '隐藏悬浮广告' },
        { name: '📑 侧边广告', selector: '.sidebar-ad', desc: '隐藏网页侧栏广告' }
    ];

    const COMMON_AD_SELECTORS = [
        ['通用广告类', [
            '.ad',
            '.ads',
            '.advert',
            '.advertisement',
            '.ad-container',
            '.ad-box',
            '.ad-wrapper'
        ]],
        ['广告属性类', [
            '[data-ad]',
            '[data-ads]',
            '[data-advert]',
            '[class*="ad-"]',
            '[id*="ad-"]'
        ]],
        ['推广内容类', [
            '.promotion',
            '.promoted',
            '.sponsored',
            '.recommend',
            '.recommend-ad'
        ]],
        ['弹窗广告类', [
            '.popup',
            '.modal-ad',
            '.float-ad',
            '.fixed-ad'
        ]],
        ['视频广告类', [
            '.video-ad',
            '.player-ad',
            '.play-ad'
        ]],
        ['右侧广告栏', [
            '.sidebar-ad',
            '.right-ad',
            '.aside-ad'
        ]]
    ];

    const DEFAULTS = {
        theme: 'light',
        speeds: {},
        autoCloseSpeed: false,
        adEnabled: false,
        adSites: {
            baidu: true,
            bing: true,
            google: true,
            sogou: true,
            so360: true,
            sm: true
        },
        customAdRules: {},
        savedCSSRules: {},
        customSites: [],
        qhrClickCount: 0,
        effects: {
            enabled: true,
            type: 'fireworks',
            trigger: 'blank',
            startupSnow: true,
            snowColor: '#ffffff',
            snowSpeed: 5,
            snowDensity: 100,
            clickMax: 5,
            trail: {
                enabled: true,
                type: 'rainbow',
                size: 3,
                duration: 3,
                speed: 2
            }
        }
    };

    const THEMES = {
        light: {
            bg: '#fff', header: '#f8f9fa', card: '#f8f9fa',
            border: '#e0e0e0', text: '#333', text2: '#666',
            primary: '#007bff', active: 'rgba(0,123,255,.1)',
            hover: '#f0f0f0', input: '#fff'
        },
        dark: {
            bg: '#1a1a1a', header: '#2d2d2d', card: '#2d2d2d',
            border: '#404040', text: '#e0e0e0', text2: '#aaa',
            primary: '#4dabf7', active: 'rgba(77,171,247,.2)',
            hover: '#404040', input: '#252525'
        },
        ocean: {
            bg: '#f0f8ff', header: '#e0f0ff', card: '#e0f0ff',
            border: '#b0d0e0', text: '#006080', text2: '#4080a0',
            primary: '#0088cc', active: 'rgba(0,136,204,.12)',
            hover: '#d0e8f0', input: '#f8fcff'
        },
        forest: {
            bg: '#f0fff0', header: '#e0ffe0', card: '#e0ffe0',
            border: '#a0d0a0', text: '#075f07', text2: '#408040',
            primary: '#00aa00', active: 'rgba(0,170,0,.12)',
            hover: '#d0f0d0', input: '#f8fff8'
        },
        midnight: {
            bg: '#001122', header: '#002244', card: '#002244',
            border: '#004466', text: '#c5dcff', text2: '#83a4c5',
            primary: '#3399ff', active: 'rgba(51,153,255,.2)',
            hover: '#003366', input: '#001a33'
        },
        sunset: {
            bg: '#fff0e0', header: '#ffe0c0', card: '#ffe0c0',
            border: '#ffb080', text: '#804000', text2: '#a06000',
            primary: '#ff6600', active: 'rgba(255,102,0,.12)',
            hover: '#ffd0a0', input: '#fff8f0'
        },
        autumn: {
            bg: '#fff8e0', header: '#ffe8c0', card: '#ffe8c0',
            border: '#e0b080', text: '#704000', text2: '#966000',
            primary: '#cc6600', active: 'rgba(204,102,0,.12)',
            hover: '#ffd8a0', input: '#fffaf0'
        },
        spring: {
            bg: '#fff0f8', header: '#ffe0f0', card: '#ffe0f0',
            border: '#ffa0d0', text: '#800040', text2: '#a00060',
            primary: '#ff0080', active: 'rgba(255,0,128,.12)',
            hover: '#ffc0e0', input: '#fff8fc'
        },
        hacker: {
            bg: '#050505', header: '#001b00', card: '#001400',
            border: '#00ff66', text: '#00ff99', text2: '#00aa55',
            primary: '#00ff00', active: 'rgba(0,255,0,.15)',
            hover: '#003300', input: '#001000'
        },
        aurora: {
            bg: '#0a1628', header: '#1a2a4a', card: '#152545',
            border: '#2a4a7a', text: '#e0f0ff', text2: '#a0c0e0',
            primary: '#00ffff', active: 'rgba(0,255,255,.15)',
            hover: '#1a3a5a', input: '#0a2040'
        },
        lavender: {
            bg: '#f5f0ff', header: '#e8e0f5', card: '#e8e0f5',
            border: '#d0c0e0', text: '#4a3060', text2: '#7a6090',
            primary: '#9370db', active: 'rgba(147,112,219,.12)',
            hover: '#d8d0e8', input: '#faf5ff'
        },
        coral: {
            bg: '#fff5f5', header: '#ffe8e8', card: '#ffe8e8',
            border: '#ffc0c0', text: '#802020', text2: '#a04040',
            primary: '#ff6b6b', active: 'rgba(255,107,107,.12)',
            hover: '#ffd0d0', input: '#fffafa'
        },
        slate: {
            bg: '#f0f2f5', header: '#e0e4e8', card: '#e0e4e8',
            border: '#c0c8d0', text: '#304050', text2: '#506070',
            primary: '#4a6fa5', active: 'rgba(74,111,165,.12)',
            hover: '#d0d8e0', input: '#f8fafc'
        },
        mint: {
            bg: '#f0fff8', header: '#e0ffe8', card: '#e0ffe8',
            border: '#b0e0c0', text: '#205040', text2: '#407060',
            primary: '#00aa88', active: 'rgba(0,170,136,.12)',
            hover: '#d0f0e0', input: '#f8fffc'
        }
    };

    const THEME_NAMES = {
        light: '🌞 明亮',
        dark: '🌙 深色',
        ocean: '🌊 海洋',
        forest: '🌲 森林',
        midnight: '🌌 午夜',
        sunset: '🌅 日落',
        autumn: '🍂 秋日',
        spring: '🌸 春日',
        hacker: '🟢 黑客矩阵',
        aurora: '✨ 极光',
        lavender: '💜 薰衣草',
        coral: '🪸 珊瑚',
        slate: '🪨 石墨',
        mint: '🌿 薄荷'
    };

    const FX_NAMES = {
        fireworks: '🎆 烟花',
        particles: '✨ 粒子',
        ripple: '🌊 涟漪',
        sparkle: '🌟 星光',
        snow: '❄️ 雪花'
    };

    const TRAIL_NAMES = {
        rainbow: '🌈 彩虹',
        fire: '🔥 火焰',
        ice: '🧊 冰晶',
        neon: '💡 霓虹',
        sparkle: '✨ 闪烁',
        bubble: '💧 气泡',
        heart: '❤️ 爱心',
        star: '⭐ 星星'
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function isObject(value) {
        return value && typeof value === 'object' && !Array.isArray(value);
    }

    function merge(base, value) {
        const out = clone(base);
        if (!isObject(value)) return out;

        Object.keys(value).forEach(key => {
            if (isObject(value[key]) && isObject(out[key])) {
                out[key] = merge(out[key], value[key]);
            } else if (value[key] !== undefined) {
                out[key] = value[key];
            }
        });

        return out;
    }

    function gmGet(key, fallback) {
        try {
            if (typeof GM_getValue === 'function') {
                return GM_getValue(C.prefix + key, fallback);
            }
        } catch (_) {}

        try {
            const value = localStorage.getItem(C.prefix + key);
            return value === null ? fallback : value;
        } catch (_) {
            return fallback;
        }
    }

    function gmSet(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(C.prefix + key, value);
                return;
            }
        } catch (_) {}

        try {
            localStorage.setItem(C.prefix + key, value);
        } catch (_) {}
    }

    function readJSON(key, fallback) {
        const value = gmGet(key, null);
        if (value === null || value === undefined) return clone(fallback);

        if (typeof value === 'object') {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch (_) {
            return clone(fallback);
        }
    }

    function writeJSON(key, value) {
        gmSet(key, value);
    }

    function migrateLegacy() {
        const migrationKey = 'migration_114';

        if (gmGet(migrationKey, false)) return;

        try {
            const map = {
                theme: 'theme',
                speed_settings: 'speeds',
                auto_close_speed: 'autoCloseSpeed',
                ad_remover_enabled: 'adEnabled',
                ad_remover_sites: 'adSites',
                custom_ad_rules: 'customAdRules',
                custom_sites: 'customSites',
                effects: 'effects'
            };

            Object.entries(map).forEach(([oldKey, newKey]) => {
                const raw = localStorage.getItem(C.prefix + oldKey);
                if (raw === null) return;
                if (gmGet(newKey, null) !== null) return;

                try {
                    writeJSON(newKey, JSON.parse(raw));
                } catch (_) {
                    gmSet(newKey, raw);
                }
            });
        } catch (_) {}

        gmSet(migrationKey, true);
    }

    migrateLegacy();

    const S = {
        isOpen: false,
        theme: gmGet('theme', DEFAULTS.theme),
        speeds: readJSON('speeds', DEFAULTS.speeds),
        autoCloseSpeed: String(gmGet('autoCloseSpeed', DEFAULTS.autoCloseSpeed)) === 'true',
        adEnabled: String(gmGet('adEnabled', DEFAULTS.adEnabled)) === 'true',
        adSites: merge(DEFAULTS.adSites, readJSON('adSites', DEFAULTS.adSites)),
        customAdRules: readJSON('customAdRules', DEFAULTS.customAdRules),
        savedCSSRules: readJSON('savedCSSRules', DEFAULTS.savedCSSRules),
        customSites: readJSON('customSites', DEFAULTS.customSites),
        qhrClickCount: readJSON('qhrClickCount', DEFAULTS.qhrClickCount),
        effects: merge(DEFAULTS.effects, readJSON('effects', DEFAULTS.effects)),
        isAdmin: String(gmGet('admin', 'false')) === 'true',
        suggestions: readJSON('suggestions', []),
        votes: readJSON('votes', {}),
        notice: gmGet('notice', '')
    };

    if (!C.themes.includes(S.theme)) S.theme = DEFAULTS.theme;
    if (!Array.isArray(S.customSites)) S.customSites = [];
    if (!isObject(S.customAdRules)) S.customAdRules = {};

    let UI = null;
    let OVERLAY = null;
    let CONTENT = null;
    let activeTab = 'launch';

    let toastTimer = 0;

    let adObserver = null;
    let adTimer = 0;
    let activeAdConfig = null;
    const hiddenAds = new Map();

    let videoObserver = null;
    const watchedVideos = new WeakSet();

    let canvas = null;
    let ctx = null;
    let animationId = 0;
    let resizeHandler = null;
    let moveHandler = null;
    let clickHandler = null;
    let lastX = null;
    let lastY = null;
    let trails = [];
    let snowflakes = [];
    let bursts = [];

    function saveState(key, value) {
        if (typeof value === 'object') writeJSON(key, value);
        else gmSet(key, value);
    }

    function saveEffects() {
        saveState('effects', S.effects);
    }

    function el(tag, props, children) {
        const node = document.createElement(tag);

        if (props) {
            Object.entries(props).forEach(([key, value]) => {
                if (key === 'style') node.style.cssText = value;
                else if (key === 'text') node.textContent = value;
                else if (key === 'html') node.innerHTML = value;
                else if (key.startsWith('on') && typeof value === 'function') {
                    node.addEventListener(key.slice(2), value);
                } else if (value !== undefined && value !== null) {
                    node.setAttribute(key, value);
                }
            });
        }

        if (children) {
            const list = Array.isArray(children) ? children : [children];
            list.forEach(child => {
                if (child) node.appendChild(child);
            });
        }

        return node;
    }

    function openURL(url) {
        try {
            const parsed = new URL(url, location.href);
            if (!/^https?:$/.test(parsed.protocol)) {
                showMessage('仅允许打开 HTTP 或 HTTPS 地址');
                return;
            }

            const win = window.open(parsed.href, '_blank', 'noopener,noreferrer');
            if (win) win.opener = null;
        } catch (_) {
            showMessage('网址格式无效');
        }
    }

    function showMessage(message) {
        let node = document.getElementById('tbq-toast');

        if (!node) {
            node = el('div', {
                id: 'tbq-toast',
                style:
                    'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
                    'z-index:2147483647;padding:11px 20px;border-radius:9px;' +
                    'background:rgba(0,0,0,.86);color:#fff;font:14px sans-serif;' +
                    'box-shadow:0 5px 18px rgba(0,0,0,.25);opacity:0;' +
                    'pointer-events:none;transition:opacity .2s'
            });
            (document.body || document.documentElement).appendChild(node);
        }

        node.textContent = message;
        node.style.opacity = '1';
        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            node.style.opacity = '0';
        }, 1800);
    }

    function button(text, onClick) {
        return el('button', {
            type: 'button',
            text,
            style:
                'padding:10px 15px;border:0;border-radius:8px;cursor:pointer;' +
                'background:var(--tb-primary);color:#fff;font-weight:600',
            onclick: onClick
        });
    }

    function input(placeholder) {
        return el('input', {
            type: 'text',
            placeholder,
            style:
                'box-sizing:border-box;width:100%;padding:10px 11px;' +
                'border:1px solid var(--tb-border);border-radius:8px;' +
                'background:var(--tb-input);color:var(--tb-text);outline:none'
        });
    }

    function title(text) {
        return el('h3', {
            text,
            style: 'margin:0 0 16px;font-size:18px;color:var(--tb-text)'
        });
    }

    function card() {
        return el('div', {
            style:
                'padding:16px;background:var(--tb-card);border:1px solid var(--tb-border);' +
                'border-radius:12px;margin-bottom:16px'
        });
    }

    function makeSwitch(checked, callback) {
        const checkbox = el('input', {
            type: 'checkbox',
            style: 'position:absolute;opacity:0;width:1px;height:1px'
        });

        checkbox.checked = Boolean(checked);

        const track = el('span', {
            style:
                'position:relative;display:block;width:48px;height:26px;border-radius:20px;' +
                'background:' + (checked ? 'var(--tb-primary)' : '#aaa') + ';transition:.2s'
        });

        const knob = el('span', {
            style:
                'position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;' +
                'background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:.2s;' +
                'transform:' + (checked ? 'translateX(22px)' : 'translateX(0)')
        });

        track.appendChild(knob);

        checkbox.addEventListener('change', () => {
            track.style.background = checkbox.checked ? 'var(--tb-primary)' : '#aaa';
            knob.style.transform = checkbox.checked ? 'translateX(22px)' : 'translateX(0)';
            callback(Boolean(checkbox.checked));
        });

        return el('label', {
            style: 'position:relative;display:inline-block;cursor:pointer;flex-shrink:0'
        }, [checkbox, track]);
    }

    function switchRow(label, checked, callback) {
        return el('div', {
            style: 'display:flex;align-items:center;justify-content:space-between;gap:16px'
        }, [
            el('span', {
                text: label,
                style: 'font-weight:500;color:var(--tb-text)'
            }),
            makeSwitch(checked, callback)
        ]);
    }

    function makeSelect(options, selected, callback) {
        const select = el('select', {
            style:
                'box-sizing:border-box;width:100%;padding:10px;border:1px solid var(--tb-border);' +
                'border-radius:8px;background:var(--tb-input);color:var(--tb-text)'
        });

        options.forEach(item => {
            const value = Array.isArray(item) ? item[0] : item;
            const name = Array.isArray(item) ? item[1] : item;
            const option = el('option', { value, text: name });
            option.selected = String(value) === String(selected);
            select.appendChild(option);
        });

        select.addEventListener('change', () => callback(select.value));
        return select;
    }

    function makeSlider(label, value, min, max, step, callback) {
        const valueLabel = el('span', { text: String(value) });

        const range = el('input', {
            type: 'range',
            min,
            max,
            step,
            style: 'width:100%;margin-top:8px'
        });

        range.value = value;
        range.addEventListener('input', () => {
            valueLabel.textContent = range.value;
            callback(Number(range.value));
        });

        return el('div', {
            style: 'margin-top:13px;color:var(--tb-text)'
        }, [
            el('div', {
                style: 'display:flex;justify-content:space-between;font-size:14px'
            }, [
                el('span', { text: label }),
                valueLabel
            ]),
            range
        ]);
    }

    function applyTheme() {
        if (!UI) return;

        const theme = THEMES[S.theme] || THEMES.light;

        Object.entries(theme).forEach(([key, value]) => {
            UI.style.setProperty('--tb-' + key, value);
        });

        if (OVERLAY) {
            OVERLAY.style.setProperty('--tb-primary', theme.primary);
        }
    }

    function createUI() {
        if (UI || !document.body) return;

        OVERLAY = el('div', {
            id: 'tbq-overlay',
            style:
                'position:fixed;inset:0;z-index:2147483600;display:none;opacity:0;' +
                'background:rgba(0,0,0,.5);backdrop-filter:blur(4px);transition:opacity .2s'
        });

        UI = el('section', {
            id: 'tbq-root',
            role: 'dialog',
            'aria-label': '全能工具箱 Q',
            style:
                'position:fixed;top:50%;left:50%;z-index:2147483601;display:none;' +
                'width:min(900px,92vw);max-height:84vh;overflow:hidden;' +
                'transform:translate(-50%,-50%) scale(.96);opacity:0;' +
                'border:1px solid var(--tb-border);border-radius:18px;' +
                'background:var(--tb-bg);color:var(--tb-text);' +
                'box-shadow:0 22px 70px rgba(0,0,0,.38);font-family:Arial,sans-serif;' +
                'transition:opacity .2s,transform .2s'
        });

        applyTheme();

        const header = el('header', {
            style:
                'display:flex;align-items:center;justify-content:space-between;padding:18px 22px;' +
                'border-bottom:1px solid var(--tb-border);background:var(--tb-header)'
        }, [
            el('div', {
                html:
                    '<div style="font-size:22px;font-weight:700">🎯 全能工具箱 Q</div>' +
                    '<div style="font-size:12px;color:var(--tb-text2);margin-top:3px">V' +
                    C.version + ' Enhanced</div>'
            }),
            el('button', {
                type: 'button',
                text: '×',
                title: '关闭',
                style:
                    'width:38px;height:38px;border:0;border-radius:50%;cursor:pointer;' +
                    'background:transparent;color:var(--tb-text);font-size:28px',
                onclick: closeToolbox
            })
        ]);

        const nav = el('nav', {
            style:
                'display:flex;gap:7px;padding:12px 16px 7px;overflow-x:auto;' +
                'background:var(--tb-bg);border-bottom:1px solid var(--tb-border)'
        });

        const tabs = [
            ['launch', '🚀 网页启动'],
            ['speed', '⏩ 视频调速'],
            ['cloud', '☁️ 网盘启动'],
            ['music', '🎵 音乐平台'],
            ['theme', '🎨 主题'],
            ['ad', '🚫 广告移除'],
            ['fx', '✨ 视觉特效'],
            ['qhr', '🔗 QHR 超级插件'],
            ['update', '📜 更新说明']
        ];

        tabs.forEach(([id, label]) => {
            const tabButton = el('button', {
                type: 'button',
                text: label,
                'data-tab-button': id,
                style:
                    'flex-shrink:0;padding:9px 13px;border:0;border-radius:8px;' +
                    'cursor:pointer;background:transparent;color:var(--tb-text2);font-weight:600',
                onclick: () => selectTab(id)
            });
            nav.appendChild(tabButton);
        });

        CONTENT = el('main', {
            style: 'box-sizing:border-box;padding:21px;max-height:calc(84vh - 133px);overflow:auto'
        });

        UI.append(header, nav, CONTENT);
        document.body.append(OVERLAY, UI);

        OVERLAY.addEventListener('click', closeToolbox);
        selectTab(activeTab);
    }

    function selectTab(id) {
        if (!CONTENT || !UI) return;

        activeTab = id;

        UI.querySelectorAll('[data-tab-button]').forEach(btn => {
            const selected = btn.getAttribute('data-tab-button') === id;
            btn.style.color = selected ? 'var(--tb-primary)' : 'var(--tb-text2)';
            btn.style.background = selected ? 'var(--tb-active)' : 'transparent';
        });

        CONTENT.replaceChildren();

        const creators = {
            launch: renderLaunchTab,
            speed: renderSpeedTab,
            cloud: renderCloudTab,
            music: renderMusicTab,
            theme: renderThemeTab,
            ad: renderAdTab,
            fx: renderEffectsTab,
            qhr: renderQHRTab,
            update: renderUpdateTab
        };

        CONTENT.appendChild((creators[id] || renderLaunchTab)());
    }

    function renderLaunchTab() {
        const root = el('div');
        root.appendChild(title('快速启动常用网站'));

        const urlField = input('输入网址，例如：https://example.com');
        const nameField = input('网站名称，可选');

        const addArea = card();
        addArea.style.display = 'grid';
        addArea.style.gridTemplateColumns = 'minmax(180px,2fr) minmax(130px,1fr) auto';
        addArea.style.gap = '10px';

        addArea.append(urlField, nameField, button('➕ 添加', () => {
            try {
                let value = urlField.value.trim();
                if (!value) return showMessage('请输入网址');
                if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) value = 'https://' + value;

                const parsed = new URL(value);
                if (!/^https?:$/.test(parsed.protocol)) {
                    return showMessage('仅支持 HTTP 或 HTTPS 地址');
                }

                S.customSites.push({
                    name: nameField.value.trim() || parsed.hostname,
                    url: parsed.href,
                    icon: '🔗'
                });

                saveState('customSites', S.customSites);
                showMessage('网站已添加');
                selectTab('launch');
            } catch (_) {
                showMessage('网址格式无效');
            }
        }));

        root.appendChild(addArea);

        const defaults = [
            ['B 站', 'https://www.bilibili.com', '📺'],
            ['爱奇艺', 'https://www.iqiyi.com', '🎬'],
            ['腾讯视频', 'https://v.qq.com', '📹'],
            ['优酷', 'https://www.youku.com', '🎥'],
            ['百度', 'https://www.baidu.com', '🔍'],
            ['知乎', 'https://www.zhihu.com', '💭'],
            ['淘宝', 'https://www.taobao.com', '🛒'],
            ['京东', 'https://www.jd.com', '📦'],
            ['微博', 'https://weibo.com', '🐦'],
            ['豆瓣', 'https://www.douban.com', '📚'],
            ['网易云音乐', 'https://music.163.com', '🎵']
        ].map(item => ({
            name: item[0],
            url: item[1],
            icon: item[2],
            custom: false
        }));

        const custom = S.customSites.map((site, index) => ({
            name: site.name || site.n || '自定义网站',
            url: site.url || site.u,
            icon: site.icon || site.i || '🔗',
            custom: true,
            index
        }));

        root.appendChild(siteGrid(defaults.concat(custom), site => {
            if (!site.custom) return;

            S.customSites.splice(site.index, 1);
            saveState('customSites', S.customSites);
            showMessage('自定义网站已删除');
            selectTab('launch');
        }));

        return root;
    }

    function siteGrid(sites, removeCallback) {
        const grid = el('div', {
            style:
                'display:grid;grid-template-columns:repeat(auto-fill,minmax(135px,1fr));gap:13px'
        });

        sites.forEach(site => {
            const item = el('div', {
                style:
                    'position:relative;min-height:85px;padding:15px 10px;box-sizing:border-box;' +
                    'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
                    'gap:7px;border:1px solid var(--tb-border);border-radius:12px;' +
                    'background:var(--tb-card);cursor:pointer;text-align:center',
                onclick: () => openURL(site.url)
            }, [
                el('span', { text: site.icon || '🔗', style: 'font-size:25px' }),
                el('span', {
                    text: site.name,
                    style: 'font-size:14px;font-weight:600;color:var(--tb-text);word-break:break-word'
                })
            ]);

            if (site.custom) {
                item.appendChild(el('button', {
                    type: 'button',
                    text: '×',
                    title: '删除',
                    style:
                        'position:absolute;top:5px;right:5px;width:22px;height:22px;padding:0;' +
                        'border:0;border-radius:50%;background:#ff4d4f;color:#fff;cursor:pointer',
                    onclick: event => {
                        event.stopPropagation();
                        removeCallback(site);
                    }
                }));
            }

            grid.appendChild(item);
        });

        return grid;
    }

    function renderSpeedTab() {
        const root = el('div');
        root.appendChild(title('视频播放速度控制'));

        root.appendChild(el('p', {
            text: '支持当前页面及后续动态加载的 HTML5 视频。网站重新创建视频时也会自动应用已保存倍速。',
            style: 'margin:-6px 0 18px;color:var(--tb-text2);font-size:14px;line-height:1.6'
        }));

        const host = location.hostname;
        const current = clamp(Number(S.speeds[host] || 1), C.speedMin, C.speedMax);

        const valueText = el('div', {
            text: current.toFixed(2) + 'x',
            style:
                'margin:10px 0;text-align:center;color:var(--tb-primary);font-size:22px;font-weight:700'
        });

        const preset = makeSelect(
            C.speeds.map(speed => [speed, speed + 'x']),
            C.speeds.includes(current) ? current : 1,
            value => {
                const speed = clamp(Number(value), C.speedMin, C.speedMax);
                valueText.textContent = speed.toFixed(2) + 'x';
                setHostSpeed(speed, true);
            }
        );

        const range = el('input', {
            type: 'range',
            min: C.speedMin,
            max: C.speedMax,
            step: 0.05,
            style: 'width:100%'
        });

        range.value = current;

        range.addEventListener('input', () => {
            const speed = clamp(Number(range.value), C.speedMin, C.speedMax);
            valueText.textContent = speed.toFixed(2) + 'x';
            setHostSpeed(speed, false);
        });

        range.addEventListener('change', () => {
            showMessage('视频速度已设置为 ' + Number(range.value).toFixed(2) + 'x');
            if (S.autoCloseSpeed) setTimeout(closeToolbox, 350);
        });

        const speedCard = card();
        speedCard.append(
            el('div', {
                text: '预设速度',
                style: 'margin-bottom:8px;font-weight:600;color:var(--tb-text)'
            }),
            preset,
            valueText,
            range
        );

        root.appendChild(speedCard);

        const optionCard = card();
        optionCard.appendChild(switchRow(
            '调节后自动关闭工具箱',
            S.autoCloseSpeed,
            checked => {
                S.autoCloseSpeed = checked;
                saveState('autoCloseSpeed', checked);
                showMessage(checked ? '自动关闭已开启' : '自动关闭已关闭');
            }
        ));

        root.appendChild(optionCard);

        let adminClick = 0;
        let adminTimer = null;

        root.appendChild(button('恢复 1.00x', () => {
            adminClick++;
            clearTimeout(adminTimer);
            adminTimer = setTimeout(() => {
                adminClick = 0;
            }, 1500);

            if (adminClick >= 6) {
                S.isAdmin = true;
                gmSet('admin', 'true');
                showMessage('高级设置已开启');
                adminClick = 0;
                return;
            }

            setHostSpeed(1, true);
            range.value = 1;
            valueText.textContent = '1.00x';
        }));

        return root;
    }

    function renderCloudTab() {
        const root = el('div');
        root.appendChild(title('网盘服务快速启动'));

        const sites = [
            ['百度网盘', 'https://pan.baidu.com', '📁'],
            ['阿里云盘', 'https://www.alipan.com', '☁️'],
            ['腾讯微云', 'https://www.weiyun.com', '💾'],
            ['坚果云', 'https://www.jianguoyun.com', '🥜'],
            ['天翼云盘', 'https://cloud.189.cn', '☁️'],
            ['中国移动云盘', 'https://yun.139.com', '🌈'],
            ['蓝奏云', 'https://www.lanzou.com', '📤'],
            ['文叔叔', 'https://www.wenshushu.cn', '📝'],
            ['奶牛快传', 'https://cowtransfer.com', '🐄'],
            ['Google Drive', 'https://drive.google.com', '📊'],
            ['Dropbox', 'https://www.dropbox.com', '📦'],
            ['OneDrive', 'https://onedrive.live.com', '🗂️']
        ].map(item => ({
            name: item[0],
            url: item[1],
            icon: item[2]
        }));

        root.appendChild(siteGrid(sites, () => {}));
        return root;
    }

    function renderMusicTab() {
        const root = el('div');
        root.appendChild(title('音乐平台快速访问'));

        const sites = [
            ['网易云音乐', 'https://music.163.com', '☁️'],
            ['QQ 音乐', 'https://y.qq.com', '🎵'],
            ['酷狗音乐', 'https://www.kugou.com', '🐶'],
            ['酷我音乐', 'https://www.kuwo.cn', '🎶'],
            ['咪咕音乐', 'https://music.migu.cn', '📱'],
            ['Apple Music', 'https://music.apple.com', '🍎']
        ].map(item => ({
            name: item[0],
            url: item[1],
            icon: item[2]
        }));

        root.appendChild(siteGrid(sites, () => {}));
        return root;
    }

    function renderThemeTab() {
        const root = el('div');
        root.appendChild(title('界面主题切换'));

        const grid = el('div', {
            style:
                'display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:13px'
        });

        C.themes.forEach(theme => {
            const themeData = THEMES[theme];

            grid.appendChild(el('button', {
                type: 'button',
                style:
                    'padding:18px 12px;border:2px solid ' +
                    (S.theme === theme ? 'var(--tb-primary)' : 'var(--tb-border)') +
                    ';border-radius:12px;background:var(--tb-card);color:var(--tb-text);' +
                    'cursor:pointer;font-size:15px;font-weight:700',
                onclick: () => {
                    S.theme = theme;
                    saveState('theme', theme);
                    applyTheme();
                    showMessage('已切换至 ' + THEME_NAMES[theme]);
                    selectTab('theme');
                }
            }, [
                el('div', { text: THEME_NAMES[theme] }),
                el('div', {
                    style: 'display:flex;justify-content:center;gap:5px;margin-top:11px'
                }, [
                    el('i', {
                        style: 'width:18px;height:18px;border-radius:50%;background:' + themeData.bg
                    }),
                    el('i', {
                        style: 'width:18px;height:18px;border-radius:50%;background:' + themeData.primary
                    }),
                    el('i', {
                        style: 'width:18px;height:18px;border-radius:50%;background:' + themeData.text
                    })
                ])
            ]));
        });

        root.appendChild(grid);
        return root;
    }

    function renderQHRTab() {
        const root = el('div');
        root.appendChild(title('QHR 超级插件网页跳转'));

        const note = card();
        note.style.borderLeft = '4px solid var(--tb-primary)';
        note.innerHTML =
            '<div style="font-weight:700;margin-bottom:7px">📌 使用说明</div>' +
            '<div style="font-size:13px;line-height:1.7;color:var(--tb-text2)">' +
            '• 点击下方图标 <b>3 次</b> 即可自动跳转<br>' +
            '• 每次点击会有计数提示<br>' +
            '• 第 3 次点击后自动打开目标网页<br>' +
            '• 点击计数器可重置进度' +
            '</div>';
        root.appendChild(note);

        const clickArea = card();
        clickArea.style.textAlign = 'center';
        clickArea.style.padding = '40px 20px';

        const icon = el('div', {
            html: '🚀',
            style:
                'font-size:80px;cursor:pointer;display:inline-block;' +
                'transition:transform 0.15s;user-select:none;' +
                '-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;'
        });

        const counter = el('div', {
            text: '已点击 0 / 3 次',
            style:
                'margin-top:20px;font-size:24px;font-weight:700;' +
                'color:var(--tb-primary)'
        });

        const hint = el('div', {
            text: '继续点击图标以跳转',
            style:
                'margin-top:10px;font-size:14px;color:var(--tb-text2)'
        });

        let clickCount = S.qhrClickCount || 0;

        icon.addEventListener('click', () => {
            clickCount++;
            
            icon.style.transform = 'scale(0.9)';
            setTimeout(() => {
                icon.style.transform = 'scale(1)';
            }, 150);

            if (clickCount < 3) {
                counter.textContent = '已点击 ' + clickCount + ' / 3 次';
                hint.textContent = '继续点击图标以跳转';
                S.qhrClickCount = clickCount;
                saveState('qhrClickCount', clickCount);
                showMessage('已点击 ' + clickCount + ' 次，还需 ' + (3 - clickCount) + ' 次');
            } else {
                counter.textContent = '✓ 跳转中...';
                hint.textContent = '正在打开目标网页';
                showMessage('即将跳转到 QHR 超级插件页面');
                
                setTimeout(() => {
                    openURL('https://go.Yuze.site/projects/tj3xYcwVLL#install');
                    clickCount = 0;
                    S.qhrClickCount = 0;
                    saveState('qhrClickCount', 0);
                    counter.textContent = '已点击 0 / 3 次';
                    hint.textContent = '继续点击图标以跳转';
                }, 500);
            }
        });

        counter.style.cursor = 'pointer';
        counter.title = '点击重置计数';
        counter.addEventListener('click', () => {
            clickCount = 0;
            S.qhrClickCount = 0;
            saveState('qhrClickCount', 0);
            counter.textContent = '已点击 0 / 3 次';
            hint.textContent = '继续点击图标以跳转';
            showMessage('计数已重置');
        });

        clickArea.append(icon, counter, hint);
        root.appendChild(clickArea);

        const infoCard = card();
        infoCard.appendChild(el('div', {
            html:
                '<div style="font-weight:700;margin-bottom:8px">🔗 目标网址</div>' +
                '<div style="font-size:13px;color:var(--tb-text2);word-break:break-all">' +
                'https://go.Yuze.site/projects/tj3xYcwVLL#install' +
                '</div>',
            style: 'text-align:center'
        }));
        root.appendChild(infoCard);

        return root;
    }

    function testSelector(selector) {
        try {
            const count = document.querySelectorAll(selector).length;
            showMessage('匹配到 ' + count + ' 个元素');
        } catch (e) {
            showMessage('CSS 选择器错误');
        }
    }

    function currentDomain() {
        return location.hostname.replace(/^www\./, '');
    }

    function renderAdTab() {
        const root = el('div');
        root.appendChild(title('搜索引擎广告移除'));

        const note = card();
        note.style.borderLeft = '4px solid var(--tb-primary)';
        note.innerHTML =
            '<div style="font-weight:700;margin-bottom:7px">📌 V1.1.3 广告观察器更新说明</div>' +
            '<div style="font-size:13px;line-height:1.7;color:var(--tb-text2)">' +
            '• 全局只创建一个观察器，重复开启不会叠加。<br>' +
            '• 关闭功能后会断开观察器，并恢复由本脚本隐藏的元素。<br>' +
            '• 动态内容采用防抖扫描，单条错误规则不会中断其他规则。<br>' +
            '• 搜索网站结构可能随时变化，规则失效时可使用自定义 CSS 选择器。<br>' +
            '• 新增广告选择器库，支持快速添加常用规则。<br>' +
            '• 已保存规则可独立开关，灵活管理各网站规则。' +
            '</div>';
        root.appendChild(note);

        const master = card();
        master.appendChild(switchRow('启用广告移除功能', S.adEnabled, checked => {
            S.adEnabled = checked;
            saveState('adEnabled', checked);

            if (checked) {
                startAdRemover();
                showMessage('广告移除已启用');
            } else {
                stopAdRemover(true);
                showMessage('广告移除已关闭，已恢复隐藏元素');
            }
        }));
        root.appendChild(master);

        const engines = [
            ['baidu', '🔍 百度搜索', 'baidu.com'],
            ['bing', '🔎 必应搜索', 'bing.com'],
            ['google', '🌐 Google 搜索', 'google.com'],
            ['sogou', '🐕 搜狗搜索', 'sogou.com'],
            ['so360', '🛡️ 360 搜索', 'so.com'],
            ['sm', '🐎 神马搜索', 'sm.cn']
        ];

        const engineCard = card();
        engineCard.appendChild(el('div', {
            text: '搜索引擎开关',
            style: 'font-weight:700;margin-bottom:8px'
        }));

        engines.forEach(([id, name, domain], index) => {
            const row = el('div', {
                style:
                    'display:flex;align-items:center;justify-content:space-between;gap:12px;' +
                    'padding:11px 0;' + (index ? 'border-top:1px solid var(--tb-border)' : '')
            }, [
                el('div', {
                    html:
                        '<div style="font-weight:600">' + name + '</div>' +
                        '<div style="font-size:12px;color:var(--tb-text2)">' + domain + '</div>'
                }),
                makeSwitch(S.adSites[id] !== false, checked => {
                    S.adSites[id] = checked;
                    saveState('adSites', S.adSites);

                    if (S.adEnabled) restartAdRemover();

                    showMessage(name + (checked ? '已启用' : '已关闭'));
                })
            ]);

            engineCard.appendChild(row);
        });

        root.appendChild(engineCard);

        const customCard = card();
        customCard.appendChild(el('div', {
            text: '自定义网站广告规则',
            style: 'font-weight:700;margin-bottom:6px'
        }));

        customCard.appendChild(el('p', {
            text: '域名示例：example.com；选择器示例：.ad, [data-ad]',
            style: 'margin:0 0 12px;color:var(--tb-text2);font-size:13px'
        }));

        const domainField = input('网站域名');
        domainField.value = currentDomain();

        const selectorField = input('CSS 选择器，例如 .ad, [data-ad]');

        const selectorSearch = input('搜索选择器，例如 视频 / 弹窗 / 属性');
        
        const quickSelectorBox = el('div', {
            style: 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px'
        });

        AD_SELECTORS_LIBRARY.forEach(item => {
            quickSelectorBox.appendChild(
                el('button', {
                    type: 'button',
                    html: `
                        <div>${item.name}</div>
                        <div style="
                            font-size:11px;
                            color:var(--tb-text2);
                            margin-top:4px">
                            ${item.desc}
                        </div>
                    `,
                    style:
                        'padding:8px 12px;' +
                        'border:1px solid var(--tb-border);' +
                        'border-radius:8px;' +
                        'background:var(--tb-input);' +
                        'color:var(--tb-text);' +
                        'cursor:pointer;font-size:12px;' +
                        'text-align:left;' +
                        'min-width:140px;',
                    onclick: () => {
                        if (selectorField.value.trim()) {
                            selectorField.value += ', ' + item.selector;
                        } else {
                            selectorField.value = item.selector;
                        }
                    }
                })
            );
        });

        selectorSearch.addEventListener('input', () => {
            const key = selectorSearch.value.toLowerCase();
            quickSelectorBox.querySelectorAll('button').forEach(btn => {
                const text = btn.textContent.toLowerCase();
                btn.style.display = text.includes(key) ? '' : 'none';
            });
        });

        customCard.append(
            domainField,
            el('div', { style: 'height:9px' }),
            button('使用当前网站', () => {
                domainField.value = currentDomain();
            }),
            el('div', { style: 'height:9px' }),
            selectorField,
            el('div', { style: 'height:9px' }),
            selectorSearch,
            quickSelectorBox,
            el('div', { style: 'height:10px' }),
            button('⭐ 添加全部常用广告规则', () => {
                const all = [];
                COMMON_AD_SELECTORS.forEach(group => {
                    all.push(...group[1]);
                });
                selectorField.value = Array.from(new Set(all)).join(', ');
            }),
            el('div', { style: 'height:10px' }),
            button('🎯 自动选择网页元素', () => {
                showMessage('请点击需要隐藏的元素');
                const pickerHandler = e => {
                    e.preventDefault();
                    e.stopPropagation();
                    const el = e.target;
                    let selector;
                    if (el.id) {
                        selector = '#' + el.id;
                    } else if (el.className && typeof el.className === 'string') {
                        selector = '.' + el.className.split(' ')[0];
                    } else {
                        selector = el.tagName.toLowerCase();
                    }
                    selectorField.value = selector;
                    document.removeEventListener('click', pickerHandler, true);
                };
                document.addEventListener('click', pickerHandler, true);
            }),
            button('🔍 测试选择器', () => {
                const list = splitSelectors(selectorField.value);
                list.forEach(testSelector);
            }),
            el('div', { style: 'height:10px' }),
            button('添加自定义规则', () => {
                const domain = normalizeDomain(domainField.value);
                const selectors = splitSelectors(selectorField.value);

                if (!domain) return showMessage('请输入有效域名');
                if (!selectors.length) return showMessage('请输入有效 CSS 选择器');

                const valid = selectors.filter(isValidSelector);
                if (!valid.length) return showMessage('CSS 选择器格式无效');

                S.customAdRules[domain] = {
                    enabled: true,
                    selectors: valid,
                    name: domain
                };
                saveState('customAdRules', S.customAdRules);

                if (S.adEnabled) restartAdRemover();

                showMessage('自定义规则已添加');
                selectTab('ad');
            })
        );

        root.appendChild(customCard);

        const entries = Object.entries(S.customAdRules);

        if (entries.length) {
            const rulesCard = card();
            rulesCard.appendChild(el('div', {
                text: '已保存的自定义规则',
                style: 'font-weight:700;margin-bottom:8px'
            }));

            entries.forEach(([domain, ruleData]) => {
                const selectors = ruleData.selectors || (Array.isArray(ruleData) ? ruleData : []);
                const isEnabled = ruleData.enabled !== undefined ? ruleData.enabled : true;

                const row = el('div', {
                    style:
                        'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;' +
                        'padding:10px 0;border-top:1px solid var(--tb-border)'
                }, [
                    el('div', {
                        style: 'min-width:0;flex:1',
                        html:
                            '<div style="font-weight:600;word-break:break-all">' +
                            escapeHTML(domain) +
                            '</div><div style="margin-top:4px;font-size:12px;color:var(--tb-text2);' +
                            'word-break:break-all">' +
                            escapeHTML(selectors.join(', ')) +
                            '</div>'
                    }),
                    el('div', {
                        style: 'display:flex;align-items:center;gap:8px',
                    }, [
                        makeSwitch(isEnabled, checked => {
                            ruleData.enabled = checked;
                            saveState('customAdRules', S.customAdRules);
                            if (S.adEnabled) restartAdRemover();
                            showMessage(domain + ' 规则已' + (checked ? '启用' : '禁用'));
                        }),
                        el('button', {
                            type: 'button',
                            text: '删除',
                            style:
                                'flex-shrink:0;padding:7px 10px;border:0;border-radius:7px;' +
                                'background:#ff4d4f;color:#fff;cursor:pointer',
                            onclick: () => {
                                delete S.customAdRules[domain];
                                saveState('customAdRules', S.customAdRules);
                                if (S.adEnabled) restartAdRemover();
                                showMessage('规则已删除');
                                selectTab('ad');
                            }
                        })
                    ])
                ]);

                rulesCard.appendChild(row);
            });

            root.appendChild(rulesCard);
        }

        return root;
    }

    function renderUpdateTab() {
        const root = el('div');
        root.appendChild(title('版本更新说明'));

        const box = card();
        box.innerHTML = `
<b>V1.1.4 Enhanced</b>
<br><br>
1. 新增 QHR 超级插件网页跳转页面<br>
2. 添加 5 个全新主题（极光、薰衣草、珊瑚、石墨、薄荷）<br>
3. 点击计数器支持持久化保存<br>
4. 优化主题选择器布局<br>
<br>
<b>V1.1.3 Enhanced</b>
<br><br>
1. 新增常用广告选择器库<br>
2. 优化选择器按钮显示（名称 + 描述）<br>
3. 增加当前网站域名自动填充<br>
4. 支持 CSS 规则命名保存<br>
5. 已保存规则可独立开关<br>
6. 新增黑客矩阵主题<br>
7. 优化快捷键切换逻辑（/键开/关）<br>
8. 提升广告规则管理灵活性
`;

        root.appendChild(box);
        return root;
    }

    function renderEffectsTab() {
        const root = el('div');
        root.appendChild(title('视觉特效设置'));

        const master = card();
        master.appendChild(switchRow('启用视觉特效', S.effects.enabled, checked => {
            S.effects.enabled = checked;
            saveEffects();

            if (checked) startEffects();
            else stopEffects();

            showMessage(checked ? '视觉特效已开启' : '视觉特效已关闭');
            selectTab('fx');
        }));
        root.appendChild(master);

        const clickCard = card();
        clickCard.appendChild(el('div', {
            text: '点击特效',
            style: 'font-weight:700;margin-bottom:10px'
        }));

        clickCard.appendChild(makeSelect(
            Object.entries(FX_NAMES),
            S.effects.type,
            value => {
                S.effects.type = value;
                saveEffects();
                showMessage('点击特效已切换为 ' + FX_NAMES[value]);
            }
        ));

        clickCard.appendChild(el('div', { style: 'height:10px' }));

        clickCard.appendChild(makeSelect([
            ['blank', '仅空白区域触发'],
            ['all', '全部区域触发']
        ], S.effects.trigger, value => {
            S.effects.trigger = value;
            saveEffects();
        }));

        root.appendChild(clickCard);

        const trailCard = card();
        trailCard.appendChild(switchRow(
            '启用鼠标拖尾',
            S.effects.trail.enabled,
            checked => {
                S.effects.trail.enabled = checked;
                saveEffects();

                if (S.effects.enabled) {
                    if (checked) attachMoveListener();
                    else detachMoveListener();
                }

                showMessage(checked ? '鼠标拖尾已开启' : '鼠标拖尾已关闭');
                selectTab('fx');
            }
        ));

        if (S.effects.trail.enabled) {
            trailCard.appendChild(el('div', { style: 'height:12px' }));

            trailCard.appendChild(makeSelect(
                Object.entries(TRAIL_NAMES),
                S.effects.trail.type,
                value => {
                    S.effects.trail.type = value;
                    saveEffects();
                }
            ));

            trailCard.appendChild(makeSlider(
                '拖尾大小',
                S.effects.trail.size,
                1, 10, 1,
                value => {
                    S.effects.trail.size = value;
                    saveEffects();
                }
            ));

            trailCard.appendChild(makeSlider(
                '持续时间',
                S.effects.trail.duration,
                1, 10, 1,
                value => {
                    S.effects.trail.duration = value;
                    saveEffects();
                }
            ));

            trailCard.appendChild(makeSlider(
                '移动速度',
                S.effects.trail.speed,
                1, 10, 1,
                value => {
                    S.effects.trail.speed = value;
                    saveEffects();
                }
            ));
        }

        root.appendChild(trailCard);

        const snowCard = card();
        snowCard.appendChild(switchRow(
            '持续雪花背景',
            S.effects.startupSnow,
            checked => {
                S.effects.startupSnow = checked;
                saveEffects();

                if (checked && S.effects.enabled) fillSnow();
                else snowflakes = [];

                showMessage(checked ? '雪花背景已开启' : '雪花背景已关闭');
            }
        ));

        const color = el('input', {
            type: 'color',
            style: 'width:100%;height:38px;margin-top:12px;border:0;cursor:pointer'
        });

        color.value = validColor(S.effects.snowColor)
            ? S.effects.snowColor
            : '#ffffff';

        color.addEventListener('input', () => {
            S.effects.snowColor = color.value;
            snowflakes.forEach(item => item.color = color.value);
            saveEffects();
        });

        snowCard.appendChild(color);

        snowCard.appendChild(makeSlider(
            '雪花速度',
            S.effects.snowSpeed,
            1, 20, 1,
            value => {
                S.effects.snowSpeed = value;
                saveEffects();
            }
        ));

        snowCard.appendChild(makeSlider(
            '雪花密度',
            S.effects.snowDensity || 100,
            20,
            300,
            10,
            value => {
                S.effects.snowDensity = value;
                snowflakes = [];
                saveEffects();
            }
        ));

        root.appendChild(snowCard);

        const preview = el('div', {
            text: '点击此处预览当前特效',
            style:
                'height:110px;display:flex;align-items:center;justify-content:center;' +
                'border:2px dashed var(--tb-border);border-radius:12px;' +
                'background:var(--tb-card);color:var(--tb-text2);cursor:pointer',
            onclick: event => {
                const rect = event.currentTarget.getBoundingClientRect();
                previewBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
        });

        root.appendChild(preview);
        return root;
    }

    function openToolbox() {
        createUI();
        if (!UI || !OVERLAY) return;

        OVERLAY.style.display = 'block';
        UI.style.display = 'block';

        requestAnimationFrame(() => {
            OVERLAY.style.opacity = '1';
            UI.style.opacity = '1';
            UI.style.transform = 'translate(-50%,-50%) scale(1)';
        });

        S.isOpen = true;
    }

    function closeToolbox() {
        if (!UI || !OVERLAY || !S.isOpen) return;

        OVERLAY.style.opacity = '0';
        UI.style.opacity = '0';
        UI.style.transform = 'translate(-50%,-50%) scale(.96)';
        S.isOpen = false;

        setTimeout(() => {
            if (S.isOpen) return;
            OVERLAY.style.display = 'none';
            UI.style.display = 'none';
        }, 220);
    }

    function previewBurst(x, y) {
        ensureCanvas();
        addBurst(x, y, true);
        startAnimation();
    }

    function clamp(value, min, max) {
        if (!Number.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    }

    function setHostSpeed(speed, notify) {
        speed = clamp(Number(speed), C.speedMin, C.speedMax);
        S.speeds[location.hostname] = speed;
        saveState('speeds', S.speeds);
        applySpeedToAll();

        if (notify) {
            showMessage('视频速度已设置为 ' + speed.toFixed(2) + 'x');
            if (S.autoCloseSpeed) setTimeout(closeToolbox, 350);
        }
    }

    function getHostSpeed() {
        return clamp(Number(S.speeds[location.hostname] || 1), C.speedMin, C.speedMax);
    }

    function watchVideo(video) {
        if (!(video instanceof HTMLVideoElement)) return;

        const apply = () => {
            const speed = getHostSpeed();
            if (Math.abs(video.playbackRate - speed) > 0.001) {
                try {
                    video.playbackRate = speed;
                    video.defaultPlaybackRate = speed;
                } catch (_) {}
            }
        };

        apply();

        if (watchedVideos.has(video)) return;
        watchedVideos.add(video);

        video.addEventListener('loadedmetadata', apply);
        video.addEventListener('play', apply);
        video.addEventListener('ratechange', () => {
            const desired = getHostSpeed();
            if (Math.abs(video.playbackRate - desired) > 0.001) {
                setTimeout(apply, 0);
            }
        });
    }

    function applySpeedToAll(root) {
        const scope = root && root.querySelectorAll ? root : document;
        if (scope instanceof HTMLVideoElement) watchVideo(scope);
        scope.querySelectorAll('video').forEach(watchVideo);
    }

    function startVideoWatcher() {
        applySpeedToAll();

        if (videoObserver || !document.documentElement) return;

        videoObserver = new MutationObserver(records => {
            records.forEach(record => {
                record.addedNodes.forEach(node => {
                    if (node.nodeType === 1) applySpeedToAll(node);
                });
            });
        });

        videoObserver.observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    const AD_ENGINES = {
        baidu: {
            domains: ['baidu.com'],
            selectors: [
                '.ec-tuiguang',
                '.ecfc-tuiguang',
                '.ec_d20_recomm_link',
                '[data-tuiguang]',
                '#content_left > div.ec-container'
            ],
            containers: ['.c-container', '.result-op', '.result', '.ec-container']
        },
        bing: {
            domains: ['bing.com'],
            selectors: [
                'li.b_ad',
                '.b_ad',
                '.b_adTop',
                '.sb_ad',
                '[data-adcode]'
            ],
            containers: ['li.b_ad', '.b_ad', '.sb_ad']
        },
        google: {
            domains: ['google.com'],
            selectors: [
                '[data-text-ad]',
                '#tads > div',
                '#tadsb > div',
                '.commercial-unit-desktop-top',
                '.commercial-unit-desktop-rhs',
                '.cu-container'
            ],
            containers: [
                '[data-text-ad]',
                '#tads > div',
                '#tadsb > div',
                '.commercial-unit-desktop-top',
                '.commercial-unit-desktop-rhs',
                '.cu-container'
            ]
        },
        sogou: {
            domains: ['sogou.com'],
            selectors: [
                '.ad-mark',
                '.ad-area',
                '[data-ad]',
                '.biz-ad'
            ],
            containers: ['.vrwrap', '.ad-area', '.biz-ad']
        },
        so360: {
            domains: ['so.com'],
            selectors: [
                '.res-ads',
                '.so-ad',
                '.ec_resitem',
                '[data-ad]'
            ],
            containers: ['.res-ads', '.so-ad', '.ec_resitem']
        },
        sm: {
            domains: ['sm.cn'],
            selectors: [
                '.ad-item',
                '.ad-wrap',
                '.ad-tag',
                '[data-ad]'
            ],
            containers: ['.ad-item', '.ad-wrap']
        }
    };

    function normalizeDomain(value) {
        let domain = String(value || '').trim().toLowerCase();
        if (!domain) return '';

        try {
            if (domain.includes('://')) domain = new URL(domain).hostname;
        } catch (_) {
            return '';
        }

        domain = domain
            .replace(/^\*\./, '')
            .replace(/^www\./, '')
            .replace(/:\d+$/, '')
            .replace(/^\.+|\.+$/g, '');

        if (
            domain.length > 253 ||
            !/^(?:[a-z\d\u00a1-\uffff](?:[a-z\d\u00a1-\uffff-]{0,61}[a-z\d\u00a1-\uffff])?\.)+[a-z\u00a1-\uffff]{2,63}$/i.test(domain)
        ) {
            return '';
        }

        return domain;
    }

    function hostMatches(host, domain) {
        host = host.toLowerCase().replace(/^www\./, '');
        domain = domain.toLowerCase().replace(/^www\./, '');
        return host === domain || host.endsWith('.' + domain);
    }

    function splitSelectors(value) {
        const text = String(value || '').trim();
        if (!text) return [];

        const output = [];
        let current = '';
        let square = 0;
        let round = 0;
        let quote = '';

        for (const char of text) {
            if (quote) {
                current += char;
                if (char === quote) quote = '';
                continue;
            }

            if (char === '"' || char === "'") {
                quote = char;
                current += char;
            } else if (char === '[') {
                square++;
                current += char;
            } else if (char === ']') {
                square = Math.max(0, square - 1);
                current += char;
            } else if (char === '(') {
                round++;
                current += char;
            } else if (char === ')') {
                round = Math.max(0, round - 1);
                current += char;
            } else if (char === ',' && square === 0 && round === 0) {
                if (current.trim()) output.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        if (current.trim()) output.push(current.trim());
        return output.slice(0, 50);
    }

    function isValidSelector(selector) {
        if (
            typeof selector !== 'string' ||
            !selector.trim() ||
            selector.length > 500 ||
            selector.includes(':contains(')
        ) {
            return false;
        }

        try {
            document.createDocumentFragment().querySelector(selector);
            return true;
        } catch (_) {
            return false;
        }
    }

    function buildAdConfig() {
        const host = location.hostname;
        const selectors = [];
        const containers = [];

        for (const [name, engine] of Object.entries(AD_ENGINES)) {
            if (S.adSites[name] === false) continue;

            if (engine.domains.some(domain => hostMatches(host, domain))) {
                selectors.push(...engine.selectors);
                containers.push(...engine.containers);
            }
        }

        Object.entries(S.customAdRules).forEach(([domain, ruleData]) => {
            if (!hostMatches(host, normalizeDomain(domain))) return;
            
            if (!ruleData.enabled) return;
            
            const selectorsToAdd = ruleData.selectors || (Array.isArray(ruleData) ? ruleData : []);
            if (Array.isArray(selectorsToAdd)) {
                selectors.push(...selectorsToAdd);
            }
        });

        const validSelectors = Array.from(new Set(selectors.filter(isValidSelector)));
        const validContainers = Array.from(new Set(containers.filter(isValidSelector)));

        if (!validSelectors.length) return null;

        return {
            selectors: validSelectors,
            containers: validContainers
        };
    }

    function hideAd(element) {
        if (!(element instanceof HTMLElement)) return;
        if (element === UI || element.contains(UI)) return;
        if (hiddenAds.has(element)) return;

        hiddenAds.set(element, {
            display: element.style.getPropertyValue('display'),
            priority: element.style.getPropertyPriority('display'),
            marker: element.getAttribute('data-tbq-ad-hidden')
        });

        element.setAttribute('data-tbq-ad-hidden', '1');
        element.style.setProperty('display', 'none', 'important');
    }

    function resolveAdContainer(element, config) {
        if (!(element instanceof Element)) return null;

        for (const selector of config.containers) {
            try {
                const container = element.closest(selector);
                if (container) return container;
            } catch (_) {}
        }

        return element;
    }

    function scanAds(root) {
        if (!S.adEnabled || !activeAdConfig) return;

        const scope = root && root.querySelectorAll ? root : document;

        activeAdConfig.selectors.forEach(selector => {
            try {
                if (scope instanceof Element && scope.matches(selector)) {
                    hideAd(resolveAdContainer(scope, activeAdConfig));
                }

                scope.querySelectorAll(selector).forEach(node => {
                    hideAd(resolveAdContainer(node, activeAdConfig));
                });
            } catch (_) {}
        });
    }

    function restoreHiddenAds() {
        hiddenAds.forEach((old, element) => {
            try {
                if (old.display) {
                    element.style.setProperty('display', old.display, old.priority || '');
                } else {
                    element.style.removeProperty('display');
                }

                if (old.marker === null) {
                    element.removeAttribute('data-tbq-ad-hidden');
                } else {
                    element.setAttribute('data-tbq-ad-hidden', old.marker);
                }
            } catch (_) {}
        });

        hiddenAds.clear();
    }

    function startAdRemover() {
        stopAdRemover(false);
        if (!S.adEnabled) return;

        activeAdConfig = buildAdConfig();
        if (!activeAdConfig) return;

        scanAds(document);

        const target = document.body || document.documentElement;
        if (!target) return;

        adObserver = new MutationObserver(records => {
            if (!S.adEnabled) return;
            clearTimeout(adTimer);

            adTimer = setTimeout(() => {
                let scanned = 0;

                for (const record of records) {
                    for (const node of record.addedNodes) {
                        if (node.nodeType !== 1) continue;
                        scanAds(node);
                        if (++scanned >= 80) return;
                    }
                }
            }, 160);
        });

        adObserver.observe(target, {
            childList: true,
            subtree: true
        });
    }

    function stopAdRemover(restore) {
        clearTimeout(adTimer);
        adTimer = 0;

        if (adObserver) {
            adObserver.disconnect();
            adObserver = null;
        }

        activeAdConfig = null;

        if (restore) restoreHiddenAds();
    }

    function restartAdRemover() {
        stopAdRemover(true);
        if (S.adEnabled) startAdRemover();
    }

    function validColor(value) {
        return /^#[0-9a-f]{6}$/i.test(String(value || ''));
    }

    function ensureCanvas() {
        if (canvas || !document.body) return;

        canvas = el('canvas', {
            id: 'tbq-effects-canvas',
            style:
                'position:fixed;inset:0;width:100vw;height:100vh;' +
                'z-index:2147483599;pointer-events:none'
        });

        ctx = canvas.getContext('2d');
        document.body.appendChild(canvas);

        resizeHandler = resizeCanvas;
        window.addEventListener('resize', resizeHandler, { passive: true });
        resizeCanvas();
    }

    function resizeCanvas() {
        if (!canvas || !ctx) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.floor(innerWidth * ratio));
        canvas.height = Math.max(1, Math.floor(innerHeight * ratio));
        canvas.style.width = innerWidth + 'px';
        canvas.style.height = innerHeight + 'px';
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function attachMoveListener() {
        if (moveHandler) return;

        moveHandler = event => {
            if (!S.effects.enabled || !S.effects.trail.enabled) return;

            const x = event.clientX;
            const y = event.clientY;

            if (lastX === null || lastY === null) {
                lastX = x;
                lastY = y;
                return;
            }

            const dx = x - lastX;
            const dy = y - lastY;
            const distance = Math.hypot(dx, dy);

            if (distance < 5) return;

            const count = Math.min(5, Math.max(1, Math.floor(distance / 14)));

            for (let index = 0; index < count; index++) {
                const part = (index + 1) / count;
                addTrail(lastX + dx * part, lastY + dy * part);
            }

            lastX = x;
            lastY = y;
        };

        document.addEventListener('mousemove', moveHandler, { passive: true });
    }

    function detachMoveListener() {
        if (moveHandler) {
            document.removeEventListener('mousemove', moveHandler);
            moveHandler = null;
        }

        lastX = null;
        lastY = null;
        trails = [];
    }

    function attachClickListener() {
        if (clickHandler) return;

        clickHandler = event => {
            if (!S.effects.enabled) return;
            if (event.button !== 0) return;

            if (S.effects.trigger === 'blank') {
                const interactive = event.target.closest(
                    'a,button,input,textarea,select,option,label,[role="button"],[contenteditable="true"]'
                );
                if (interactive) return;
            }

            addBurst(event.clientX, event.clientY);
        };

        document.addEventListener('click', clickHandler, true);
    }

    function detachClickListener() {
        if (clickHandler) {
            document.removeEventListener('click', clickHandler, true);
            clickHandler = null;
        }
    }

    function trailStyle(type) {
        const hue = Math.floor((performance.now() / 8) % 360);

        const styles = {
            rainbow: ['hsl(' + hue + ',100%,60%)', 'square'],
            fire: ['hsl(' + (15 + Math.random() * 35) + ',100%,55%)', 'circle'],
            ice: ['hsl(' + (180 + Math.random() * 30) + ',100%,75%)', 'circle'],
            neon: [
                ['#ff00ff', '#00ffff', '#ffff00', '#00ff66'][Math.floor(Math.random() * 4)],
                'square'
            ],
            sparkle: ['#ffffff', 'star'],
            bubble: ['rgba(150,220,255,.75)', 'ring'],
            heart: ['#ff69b4', 'heart'],
            star: ['#ffff55', 'star']
        };

        return styles[type] || styles.rainbow;
    }

    function addTrail(x, y) {
        const style = trailStyle(S.effects.trail.type);
        const size = Number(S.effects.trail.size) || 3;
        const duration = (Number(S.effects.trail.duration) || 3) * 160;
        const movement = (Number(S.effects.trail.speed) || 2) * 0.22;

        trails.push({
            x,
            y,
            vx: (Math.random() - 0.5) * movement,
            vy: (Math.random() - 0.5) * movement,
            size: size * (0.65 + Math.random() * 0.6),
            life: duration,
            maxLife: duration,
            color: style[0],
            shape: style[1],
            rotation: Math.random() * Math.PI * 2
        });

        if (trails.length > 450) trails.splice(0, trails.length - 450);
    }

    function addBurst(x, y, force = false) {
        if (!S.effects.enabled && !force) return;
        if (bursts.length >= Number(S.effects.clickMax || 5)) return;

        const type = S.effects.type;
        const particles = [];
        const count = type === 'particles' ? 90 :
            type === 'fireworks' ? 65 :
            type === 'snow' ? 45 :
            type === 'sparkle' ? 32 : 1;

        for (let index = 0; index < count; index++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = type === 'ripple' ? 0 : Math.random() * 5 + 1;

            particles.push({
                x: type === 'snow' ? x + (Math.random() - 0.5) * 60 : x,
                y: type === 'snow' ? y + (Math.random() - 0.5) * 30 : y,
                vx: type === 'snow'
                    ? (Math.random() - 0.5) * 1.4
                    : Math.cos(angle) * speed,
                vy: type === 'snow'
                    ? Math.random() * 1.8 + 0.5
                    : Math.sin(angle) * speed,
                size: Math.random() * 3.5 + 1.5,
                life: type === 'ripple' ? 700 : 650 + Math.random() * 650,
                maxLife: type === 'ripple' ? 700 : 1300,
                hue: Math.random() * 360,
                radius: 0,
                rotation: Math.random() * Math.PI
            });
        }

        bursts.push({ type, particles });
    }

    function fillSnow() {
        if (!canvas) return;

        const target = clamp(
            Number(S.effects.snowDensity || 100),
            20,
            300
        );

        while (snowflakes.length < target) {
            snowflakes.push(newSnowflake(true));
        }

        if (snowflakes.length > target) snowflakes.length = target;
    }

    function newSnowflake(randomY) {
        return {
            x: Math.random() * innerWidth,
            y: randomY ? Math.random() * innerHeight : -10,
            vx: (Math.random() - 0.5) * 0.65,
            vy: 0.35 + Math.random() * 0.8,
            radius: 1 + Math.random() * 2.8,
            color: validColor(S.effects.snowColor) ? S.effects.snowColor : '#ffffff',
            alpha: 0.35 + Math.random() * 0.65,
            angle: Math.random() * 6.28,
            spin: (Math.random() - 0.5) * 0.02
        };
    }

    function drawShape(item, alpha) {
        if (!ctx) return;

        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = item.color;
        ctx.strokeStyle = item.color;
        ctx.translate(item.x, item.y);
        ctx.rotate(item.rotation || 0);

        const size = item.size;

        if (item.shape === 'heart') {
            ctx.beginPath();
            ctx.moveTo(0, size * 0.85);
            ctx.bezierCurveTo(-size * 1.4, 0, -size, -size, 0, -size * 0.35);
            ctx.bezierCurveTo(size, -size, size * 1.4, 0, 0, size * 0.85);
            ctx.fill();
        } else if (item.shape === 'star') {
            ctx.beginPath();

            for (let index = 0; index < 10; index++) {
                const radius = index % 2 ? size * 0.45 : size;
                const angle = -Math.PI / 2 + index * Math.PI / 5;
                const px = Math.cos(angle) * radius;
                const py = Math.sin(angle) * radius;
                if (!index) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }

            ctx.closePath();
            ctx.fill();
        } else if (item.shape === 'ring') {
            ctx.lineWidth = Math.max(1, size * 0.25);
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.stroke();
        } else if (item.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(0, 0, size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.fillRect(-size / 2, -size / 2, size, size);
        }

        ctx.restore();
    }

    function updateAndDraw(delta) {
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, innerWidth, innerHeight);

        for (let index = trails.length - 1; index >= 0; index--) {
            const item = trails[index];
            item.life -= delta;
            item.x += item.vx * delta / 16.67;
            item.y += item.vy * delta / 16.67;
            item.rotation += 0.025 * delta / 16.67;

            if (item.life <= 0) {
                trails.splice(index, 1);
                continue;
            }

            drawShape(item, item.life / item.maxLife);
        }

        if (S.effects.startupSnow) {
            fillSnow();
            const snowSpeed = clamp(Number(S.effects.snowSpeed || 5), 1, 20) / 5;

            snowflakes.forEach(item => {
                item.y += item.vy * snowSpeed * delta / 16.67;
                item.x += item.vx * delta / 16.67;
                item.angle += item.spin * delta / 16.67;

                if (item.y > innerHeight + 10) {
                    Object.assign(item, newSnowflake(false));
                }

                if (item.x < -10) item.x = innerWidth + 10;
                if (item.x > innerWidth + 10) item.x = -10;

                ctx.save();
                ctx.translate(item.x, item.y);
                ctx.rotate(item.angle);
                ctx.globalAlpha = item.alpha;
                ctx.strokeStyle = item.color;
                ctx.lineWidth = 1;

                for (let i = 0; i < 6; i++) {
                    ctx.rotate(Math.PI / 3);
                    ctx.beginPath();
                    ctx.moveTo(0, 0);
                    ctx.lineTo(0, item.radius * 2);
                    ctx.stroke();
                }

                ctx.restore();
            });
        }

        for (let burstIndex = bursts.length - 1; burstIndex >= 0; burstIndex--) {
            const burst = bursts[burstIndex];

            for (let index = burst.particles.length - 1; index >= 0; index--) {
                const item = burst.particles[index];
                item.life -= delta;

                if (item.life <= 0) {
                    burst.particles.splice(index, 1);
                    continue;
                }

                const alpha = Math.min(1, item.life / Math.min(item.maxLife, 500));

                if (burst.type === 'ripple') {
                    item.radius += delta * 0.12;
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.strokeStyle = 'hsl(' + item.hue + ',100%,60%)';
                    ctx.lineWidth = Math.max(1, 4 * alpha);
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                    continue;
                }

                item.x += item.vx * delta / 16.67;
                item.y += item.vy * delta / 16.67;

                if (burst.type === 'fireworks') {
                    item.vy += 0.075 * delta / 16.67;
                    item.vx *= 0.985;
                    item.vy *= 0.985;
                }

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = burst.type === 'snow'
                    ? S.effects.snowColor
                    : 'hsl(' + item.hue + ',100%,60%)';

                if (burst.type === 'sparkle') {
                    const star = {
                        x: item.x,
                        y: item.y,
                        size: item.size * 1.5,
                        color: '#ffff66',
                        shape: 'star',
                        rotation: item.rotation
                    };
                    drawShape(star, alpha);
                } else {
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            }

            if (!burst.particles.length) bursts.splice(burstIndex, 1);
        }
    }

    function startAnimation() {
        if (animationId) return;

        let previous = performance.now();

        const frame = now => {
            if (!S.effects.enabled || !canvas || !ctx) {
                animationId = 0;
                return;
            }

            const delta = Math.min(40, Math.max(1, now - previous));
            previous = now;
            updateAndDraw(delta);
            animationId = requestAnimationFrame(frame);
        };

        animationId = requestAnimationFrame(frame);
    }

    function startEffects() {
        if (!S.effects.enabled) return;

        ensureCanvas();
        attachClickListener();

        if (S.effects.trail.enabled) attachMoveListener();
        else detachMoveListener();

        if (S.effects.startupSnow) fillSnow();
        startAnimation();
    }

    function stopEffects() {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = 0;
        }

        detachMoveListener();
        detachClickListener();

        if (resizeHandler) {
            window.removeEventListener('resize', resizeHandler);
            resizeHandler = null;
        }

        if (canvas) {
            canvas.remove();
            canvas = null;
            ctx = null;
        }

        trails = [];
        bursts = [];
        snowflakes = [];
    }

    function escapeHTML(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function isEditableTarget(target) {
        if (!(target instanceof Element)) return false;

        return Boolean(target.closest(
            'input,textarea,select,[contenteditable="true"],[contenteditable=""],' +
            '[role="textbox"],.CodeMirror,.monaco-editor'
        ));
    }

    document.addEventListener('keydown', event => {
        const slash =
            event.key === '/' ||
            event.code === 'Slash' ||
            event.code === 'NumpadDivide';

        if (
            slash &&
            !event.ctrlKey &&
            !event.metaKey &&
            !event.altKey &&
            !isEditableTarget(event.target)
        ) {
            event.preventDefault();
            event.stopPropagation();
            
            if (S.isOpen) {
                closeToolbox();
            } else {
                openToolbox();
            }
            return false;
        }

        if (
            event.key === C.closeKey &&
            S.isOpen
        ) {
            event.preventDefault();
            closeToolbox();
        }
    }, true);

    function initialize() {
        startVideoWatcher();

        if (S.adEnabled) startAdRemover();
        if (S.effects.enabled) startEffects();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }

    window.addEventListener('pagehide', () => {
        stopAdRemover(false);

        if (videoObserver) {
            videoObserver.disconnect();
            videoObserver = null;
        }

        stopEffects();
    }, { once: true });

})();