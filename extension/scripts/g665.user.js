// ==UserScript==
// @name         网页字体工具
// @namespace    tabbit-font-tool
// @description  调整网页字体、字号、样式、阴影、描边与选中文字颜色。直接运行或丢入油猴皆可
// @match        *://*/*
// @icon         data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 128 128'><defs><linearGradient id='bg' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%236D5DF6'/><stop offset='100%' stop-color='%238B5CF6'/></linearGradient><filter id='shadow' x='-20%' y='-20%' width='140%' height='140%'><feDropShadow dx='0' dy='4' stdDeviation='4' flood-color='%23000000' flood-opacity='0.25'/></filter></defs><rect x='8' y='8' width='112' height='112' rx='24' fill='url(%23bg)'/><g filter='url(%23shadow)'><path d='M64 28L87 92H75L69 74H59L53 92H41L64 28ZM64 46L62 52L55 66H73L66 52L64 46Z' fill='white'/><rect x='84' y='34' width='10' height='44' rx='5' fill='%23FDE68A'/><rect x='78' y='40' width='22' height='8' rx='4' fill='%23F59E0B'/><circle cx='91' cy='98' r='10' fill='%2322C55E'/><circle cx='91' cy='98' r='5' fill='white' opacity='0.9'/></g></svg>
// @grant        GM_addStyle
// @grant        GM_info
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-end
// ==/UserScript==
(function(){

const PANEL_ID="tabbit-font-panel",PANEL_STYLE_ID="tabbit-font-panel-style",FONT_STYLE_ID="tabbit-custom-font-style",STORAGE_KEY="tabbit_font_tool_settings",COLOR_MARK_ATTR="data-tabbit-colored",ROOT_FLAG="__TABBIT_FONT_TOOL_INITIALIZED__",MENU_FLAG="__TABBIT_FONT_TOOL_MENU_REGISTERED__",IS_USERSCRIPT=typeof GM_info!="undefined"||typeof GM_addStyle=="function"||typeof GM_registerMenuCommand=="function"||typeof GM_getValue=="function"||typeof GM_setValue=="function"||typeof unsafeWindow!="undefined",HAS_GM_STORAGE=typeof GM_getValue=="function"&&typeof GM_setValue=="function"&&typeof GM_deleteValue=="function";

const FONT_OPTIONS=[{label:"默认 Sans",value:'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif'},{label:"微软雅黑",value:'"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif'},{label:'微软雅黑 Light',value:'"Microsoft YaHei UI","Microsoft YaHei",sans-serif'},{label:'苹方',value:'"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif'},{label:'思源黑体',value:'"Noto Sans SC","Microsoft YaHei","PingFang SC",sans-serif'},{label:'冬青黑体',value:'"Hiragino Sans GB","Microsoft YaHei","PingFang SC",sans-serif'},{label:'华文细黑',value:'"STHeiti","Microsoft YaHei",sans-serif'},{label:'阿里巴巴普惠体',value:'"Alibaba PuHuiTi","Microsoft YaHei","PingFang SC",sans-serif'},{label:'OPPO Sans',value:'"OPPOSans","Microsoft YaHei",sans-serif'},{label:'HarmonyOS Sans',value:'"HarmonyOS Sans SC","Microsoft YaHei","PingFang SC",sans-serif'},{label:'Source Han Sans',value:'"Source Han Sans SC","Noto Sans SC","Microsoft YaHei",sans-serif'},{label:'得意黑',value:'"Smiley Sans","Noto Sans SC","Microsoft YaHei",sans-serif'},{label:'宋体',value:'SimSun,"Songti SC",serif'},{label:'新宋体',value:'NSimSun,SimSun,serif'},{label:'仿宋',value:'FangSong,serif'},{label:'楷体',value:'KaiTi,serif'},{label:'黑体',value:'SimHei,sans-serif'},{label:'华文宋体',value:'"STSong","Songti SC",serif'},{label:'华文中宋',value:'"STZhongsong","Songti SC",serif'},{label:'华文仿宋',value:'"STFangsong",FangSong,serif'},{label:'华文楷体',value:'"STKaiti",KaiTi,serif'},{label:'方正书宋',value:'"FZShuSong-Z01","Songti SC",serif'},{label:'方正黑体',value:'"FZHei-B01","Microsoft YaHei",sans-serif'},{label:'Arial',value:'Arial,Helvetica,sans-serif'},{label:'Helvetica',value:'Helvetica,Arial,sans-serif'},{label:'Helvetica Neue',value:'"Helvetica Neue",Helvetica,Arial,sans-serif'},{label:'Segoe UI',value:'"Segoe UI",system-ui,sans-serif'},{label:'Tahoma',value:'Tahoma,Geneva,sans-serif'},{label:'Verdana',value:'Verdana,sans-serif'},{label:'Trebuchet MS',value:'"Trebuchet MS",sans-serif'},{label:'Gill Sans',value:'"Gill Sans","Gill Sans MT",sans-serif'},{label:'Avenir',value:'Avenir,"Avenir Next","Segoe UI",sans-serif'},{label:'Avenir Next',value:'"Avenir Next",Avenir,"Segoe UI",sans-serif'},{label:'Futura',value:'Futura,"Trebuchet MS",sans-serif'},{label:'Optima',value:'Optima,"Segoe UI",sans-serif'},{label:'Inter',value:'Inter,"Segoe UI",system-ui,sans-serif'},{label:'Roboto',value:'Roboto,"Segoe UI",sans-serif'},{label:'Open Sans',value:'"Open Sans","Segoe UI",sans-serif'},{label:'Lato',value:'Lato,"Segoe UI",sans-serif'},{label:'Montserrat',value:'Montserrat,"Segoe UI",sans-serif'},{label:'Ubuntu',value:'Ubuntu,"Segoe UI",sans-serif'},{label:'Nunito',value:'Nunito,"Segoe UI",sans-serif'},{label:'Poppins',value:'Poppins,"Segoe UI",sans-serif'},{label:'Georgia',value:'Georgia,serif'},{label:'Times New Roman',value:'"Times New Roman",serif'},{label:'Garamond',value:'Garamond,serif'},{label:'Baskerville',value:'Baskerville,"Times New Roman",serif'},{label:'Palatino',value:'"Palatino Linotype","Book Antiqua",Palatino,serif'},{label:'Book Antiqua',value:'"Book Antiqua",Palatino,serif'},{label:'Cambria',value:'Cambria,Georgia,serif'},{label:'Didot',value:'Didot,Georgia,serif'},{label:'Constantia',value:'Constantia,Georgia,serif'},{label:'Courier New',value:'"Courier New",monospace'},{label:'Consolas',value:'Consolas,"Courier New",monospace'},{label:'Monaco',value:'Monaco,monospace'},{label:'Menlo',value:'Menlo,Monaco,monospace'},{label:'Source Code Pro',value:'"Source Code Pro",Consolas,monospace'},{label:'JetBrains Mono',value:'"JetBrains Mono",monospace'},{label:'Fira Code',value:'"Fira Code",monospace'},{label:'Cascadia Code',value:'"Cascadia Code",Consolas,monospace'},{label:'IBM Plex Mono',value:'"IBM Plex Mono",Consolas,monospace'},{label:'SF Mono',value:'"SF Mono",Menlo,Monaco,monospace'},{label:'Inconsolata',value:'Inconsolata,Consolas,monospace'},{label:'Ubuntu Mono',value:'"Ubuntu Mono",Consolas,monospace'},{label:'Hack',value:'Hack,"DejaVu Sans Mono",monospace'},{label:'Comic Sans MS',value:'"Comic Sans MS","Comic Sans",cursive'},{label:'Brush Script MT',value:'"Brush Script MT",cursive'},{label:'Segoe Print',value:'"Segoe Print",cursive'},{label:'系统默认 Serif',value:'ui-serif,Georgia,serif'},{label:'系统默认 Monospace',value:'ui-monospace,SFMono-Regular,Menlo,monospace'},{label:'系统默认 Rounded',value:'ui-rounded,"Hiragino Maru Gothic ProN",sans-serif'}];

function def(){return{fontFamily:"",fontSize:"",fontWeight:"normal",fontStyle:"normal",underline:false,strike:false,color:"#ff4d4f",shadowEnabled:false,shadowColor:"#000000",shadowBlur:2,shadowOffsetX:1,shadowOffsetY:1,strokeEnabled:false,strokeColor:"#000000",strokeWidth:1,panelPosition:{right:24,top:24},shadowSectionCollapsed:true,strokeSectionCollapsed:true}}

function normalizeSettings(e){const t=def(),n={...t,...(e||{})};return n.panelPosition&&typeof n.panelPosition=="object"||(n.panelPosition={right:24,top:24}),typeof n.shadowSectionCollapsed!="boolean"&&(n.shadowSectionCollapsed=true),typeof n.strokeSectionCollapsed!="boolean"&&(n.strokeSectionCollapsed=true),n}

function readStorageRaw(){try{return HAS_GM_STORAGE?GM_getValue(STORAGE_KEY,""):localStorage.getItem(STORAGE_KEY)}catch(e){return""}}
function writeStorageRaw(e){try{HAS_GM_STORAGE?GM_setValue(STORAGE_KEY,e):localStorage.setItem(STORAGE_KEY,e)}catch(e){}}
function removeStorageRaw(){try{HAS_GM_STORAGE?GM_deleteValue(STORAGE_KEY):localStorage.removeItem(STORAGE_KEY)}catch(e){}}
function load(){try{const e=readStorageRaw();return e?normalizeSettings(JSON.parse(e)):def()}catch(e){return def()}}
function save(e){try{writeStorageRaw(JSON.stringify(normalizeSettings(e)))}catch(e){}}
function clearStore(){removeStorageRaw()}

function hasFontStyleEffect(e){return!!(e&&(e.fontFamily||e.fontSize||e.fontWeight==="bold"||e.fontStyle==="italic"||e.underline||e.strike||e.shadowEnabled||e.strokeEnabled))}

function buildFontCss(e){if(!hasFontStyleEffect(e))return"";const t=[];e.fontFamily&&t.push(`font-family:${e.fontFamily} !important;`);e.fontSize&&t.push(`font-size:${e.fontSize}px !important;`);t.push(`font-weight:${e.fontWeight} !important;`);t.push(`font-style:${e.fontStyle} !important;`);e.underline&&e.strike?t.push("text-decoration:underline line-through !important;"):e.underline?t.push("text-decoration:underline !important;"):e.strike?t.push("text-decoration:line-through !important;"):t.push("text-decoration:none !important;");e.shadowEnabled?t.push(`text-shadow:${e.shadowOffsetX}px ${e.shadowOffsetY}px ${e.shadowBlur}px ${e.shadowColor} !important;`):t.push("text-shadow:none !important;");e.strokeEnabled?(t.push(`-webkit-text-stroke:${e.strokeWidth}px ${e.strokeColor} !important;`),t.push("paint-order:stroke fill !important;")):t.push("-webkit-text-stroke:0 transparent !important;");return`body *:not(#${PANEL_ID}):not(#${PANEL_ID} *){${t.join("")}}`}

function isDarkColor(e){if(!e||e==="transparent"||e==="rgba(0, 0, 0, 0)")return null;const t=e.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);if(!t)return null;const n=parseInt(t[1],10),o=parseInt(t[2],10),r=parseInt(t[3],10);return.2126*n+.7152*o+.0722*r<128}

function getCurrentTheme(){const e=document.documentElement,t=document.body,n=[e,t].filter(Boolean);for(const o of n){const r=((o.getAttribute("data-theme")||"")+" "+(o.getAttribute("theme")||"")+" "+(o.className||"")).toLowerCase();if(/\bdark\b|theme-dark|dark-mode|night/.test(r))return"dark";if(/\blight\b|theme-light|light-mode/.test(r))return"light"}for(const o of n){try{const r=getComputedStyle(o).colorScheme||"";if(r.includes("dark"))return"dark";if(r.includes("light"))return"light"}catch(e){}}if(window.matchMedia){try{if(window.matchMedia("(prefers-color-scheme: dark)").matches)return"dark"}catch(e){}}for(const o of n){try{const r=isDarkColor(getComputedStyle(o).backgroundColor);if(r!==null)return r?"dark":"light"}catch(e){}}return"light"}

function injectPanelStyle(){
  document.getElementById(PANEL_STYLE_ID)?.remove();
  const e=document.createElement("style");
  e.id=PANEL_STYLE_ID;
  e.textContent=`:root{--tp-bg:rgba(255,255,255,.78);--tp-bg2:rgba(255,255,255,.92);--tp-surface:rgba(248,250,252,.86);--tp-surface-2:rgba(255,255,255,.55);--tp-text:#172030;--tp-soft:#5f6b7a;--tp-muted:#7b8794;--tp-border:rgba(148,163,184,.24);--tp-shadow:rgba(15,23,42,.18);--tp-primary:#5b5cf0;--tp-accent:#8b5cf6;--tp-success:#10b981;--tp-warn:#f59e0b;--tp-warn-text:#fff;--tp-input-bg:rgba(255,255,255,.76);--tp-input-text:#172030;--tp-input-border:rgba(148,163,184,.28);--tp-ring:rgba(91,92,240,.22);--tp-btn2-bg:rgba(241,245,249,.9);--tp-btn2-text:#172030;--tp-chip-bg:rgba(238,242,247,.9);--tp-chip-text:#172030;--tp-chip-active:#fff}@media(prefers-color-scheme:dark){:root{--tp-bg:rgba(15,23,42,.72);--tp-bg2:rgba(19,28,49,.88);--tp-surface:rgba(24,34,53,.84);--tp-surface-2:rgba(255,255,255,.03);--tp-text:#e8eef8;--tp-soft:#b7c2d4;--tp-muted:#94a3b8;--tp-border:rgba(148,163,184,.16);--tp-shadow:rgba(0,0,0,.42);--tp-primary:#8b93ff;--tp-accent:#a78bfa;--tp-success:#34d399;--tp-warn:#fbbf24;--tp-warn-text:#1f1605;--tp-input-bg:rgba(22,32,51,.76);--tp-input-text:#e8eef8;--tp-input-border:rgba(148,163,184,.18);--tp-ring:rgba(139,147,255,.28);--tp-btn2-bg:rgba(26,36,56,.88);--tp-btn2-text:#e8eef8;--tp-chip-bg:rgba(26,36,56,.88);--tp-chip-text:#e8eef8;--tp-chip-active:#0f172a}}#${PANEL_ID}{position:fixed;top:24px;right:24px;z-index:2147483647;width:370px;max-width:calc(100vw - 24px);color:var(--tp-text);background:linear-gradient(180deg,var(--tp-bg2),var(--tp-bg));border:1px solid var(--tp-border);border-radius:24px;box-shadow:0 24px 60px var(--tp-shadow);overflow:hidden;font-family:Inter,Arial,sans-serif !important;backdrop-filter:blur(18px) saturate(145%);-webkit-backdrop-filter:blur(18px) saturate(145%)}#${PANEL_ID},#${PANEL_ID} *{box-sizing:border-box}#${PANEL_ID} .tabbit-font-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;cursor:move;user-select:none;color:#fff;background:linear-gradient(135deg,var(--tp-primary),var(--tp-accent))}#${PANEL_ID} .tabbit-font-title{font-size:14px;font-weight:800;letter-spacing:.2px}#${PANEL_ID} .tabbit-font-badge{font-size:11px;padding:4px 8px;border-radius:999px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.18);font-weight:600}#${PANEL_ID} .tabbit-font-body{padding:14px;max-height:72vh;overflow:auto}#${PANEL_ID} .tabbit-font-section{padding:12px;border:1px solid var(--tp-border);background:linear-gradient(180deg,var(--tp-surface),var(--tp-surface-2));border-radius:18px;margin-bottom:12px;box-shadow:inset 0 1px 0 rgba(255,255,255,.05)}#${PANEL_ID} .tabbit-font-row{margin-bottom:10px}#${PANEL_ID} .tabbit-font-row:last-child{margin-bottom:0}#${PANEL_ID} .tabbit-section-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}#${PANEL_ID} .tabbit-section-title{font-size:13px;font-weight:800;color:var(--tp-text)}#${PANEL_ID} .tabbit-section-sub{font-size:11px;color:var(--tp-muted);margin-top:2px}#${PANEL_ID} label{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--tp-soft)}#${PANEL_ID} select,#${PANEL_ID} input[type="number"],#${PANEL_ID} input[type="color"]{width:100%;border:1px solid var(--tp-input-border);border-radius:12px;padding:9px 11px;font-size:13px;outline:none;background:var(--tp-input-bg);color:var(--tp-input-text);transition:.18s ease}#${PANEL_ID} select:focus,#${PANEL_ID} input[type="number"]:focus,#${PANEL_ID} input[type="color"]:focus{border-color:var(--tp-primary);box-shadow:0 0 0 4px var(--tp-ring)}#${PANEL_ID} input[type="color"]{padding:4px;min-height:42px}#${PANEL_ID} .tabbit-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}#${PANEL_ID} .tabbit-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}#${PANEL_ID} .tabbit-style-btn,#${PANEL_ID} .tabbit-toggle-btn,#${PANEL_ID} .tabbit-collapse-btn,#${PANEL_ID} button{border:none;border-radius:12px;padding:10px 12px;font-size:13px;cursor:pointer;transition:.18s ease}#${PANEL_ID} .tabbit-style-btn,#${PANEL_ID} .tabbit-toggle-btn{background:var(--tp-chip-bg);color:var(--tp-chip-text);font-weight:800;border:1px solid transparent}#${PANEL_ID} .tabbit-style-btn:hover,#${PANEL_ID} .tabbit-toggle-btn:hover,#${PANEL_ID} .tabbit-btn-secondary:hover,#${PANEL_ID} .tabbit-collapse-btn:hover{transform:translateY(-1px)}#${PANEL_ID} .tabbit-style-btn.active,#${PANEL_ID} .tabbit-toggle-btn.active{background:linear-gradient(135deg,var(--tp-primary),var(--tp-accent));color:var(--tp-chip-active);box-shadow:0 10px 24px rgba(91,92,240,.28)}#${PANEL_ID} .tabbit-toggle-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;white-space:nowrap}#${PANEL_ID} .tabbit-toggle-dot{width:10px;height:10px;border-radius:999px;background:currentColor;opacity:.35;box-shadow:0 0 0 3px rgba(255,255,255,.08) inset}#${PANEL_ID} .tabbit-toggle-btn.active .tabbit-toggle-dot{opacity:1;background:#fff}#${PANEL_ID} .tabbit-collapse-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:38px;height:38px;padding:0 12px;background:var(--tp-btn2-bg);color:var(--tp-btn2-text);border:1px solid var(--tp-input-border);border-radius:999px;font-weight:800}#${PANEL_ID} .tabbit-collapse-icon{display:inline-block;font-size:14px;line-height:1;transition:transform .18s ease}#${PANEL_ID} .tabbit-collapsible{overflow:hidden;max-height:500px;opacity:1;transition:max-height .22s ease,opacity .18s ease,margin-top .18s ease}#${PANEL_ID} .tabbit-font-section.collapsed .tabbit-collapsible{max-height:0;opacity:0;margin-top:0;pointer-events:none}#${PANEL_ID} .tabbit-font-section.collapsed .tabbit-section-head{margin-bottom:0}#${PANEL_ID} .tabbit-font-section.collapsed .tabbit-collapse-icon{transform:rotate(-90deg)}#${PANEL_ID} .tabbit-effect-grid{display:grid;grid-template-columns:1fr;gap:10px}#${PANEL_ID} .tabbit-effect-card{padding:10px;border:1px solid var(--tp-border);border-radius:14px;background:rgba(255,255,255,.04)}#${PANEL_ID} .tabbit-effect-card-title{font-size:11px;font-weight:700;color:var(--tp-muted);margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}#${PANEL_ID} .tabbit-font-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}#${PANEL_ID} .tabbit-btn-warning{background:linear-gradient(135deg,var(--tp-warn),#ff8a00);color:var(--tp-warn-text);font-weight:800}#${PANEL_ID} .tabbit-btn-secondary{background:var(--tp-btn2-bg);color:var(--tp-btn2-text);border:1px solid var(--tp-input-border);font-weight:700}#${PANEL_ID} .tabbit-font-body::-webkit-scrollbar{width:8px}#${PANEL_ID} .tabbit-font-body::-webkit-scrollbar-thumb{background:rgba(148,163,184,.35);border-radius:999px}`;
  (document.head||document.documentElement)?.appendChild(e);
}

function getOrCreateFontStyleNode(){let e=document.getElementById(FONT_STYLE_ID);return e||(e=document.createElement("style"),e.id=FONT_STYLE_ID,(document.head||document.documentElement)?.appendChild(e)),e}
function upsertFontStyle(e){const t=buildFontCss(e),n=getOrCreateFontStyleNode();return!!n&&(n.textContent=t,true)}
function removeFontStyle(){document.getElementById(FONT_STYLE_ID)?.remove()}

function unwrap(e){if(!e||!e.parentNode)return;const t=e.parentNode;for(;e.firstChild;)t.insertBefore(e.firstChild,e);t.removeChild(e),t.normalize()}
function clearColoredText(){const e=Array.from(document.querySelectorAll(`[${COLOR_MARK_ATTR}="true"]`));e.sort((e,t)=>e===t?0:e.contains(t)?-1:t.contains(e)?1:0);e.forEach(e=>{e.nodeType===1&&e.hasAttribute(COLOR_MARK_ATTR)&&(e.style.removeProperty("color"),e.removeAttribute(COLOR_MARK_ATTR),(!e.getAttribute("style")||!e.getAttribute("style").trim())&&e.tagName==="SPAN"&&unwrap(e))})}
function getAllTextNodesIn(e,t){const n=(e.ownerDocument||document).createTreeWalker(e,NodeFilter.SHOW_TEXT,{acceptNode:e=>{if(!e||!e.nodeValue||!e.nodeValue.trim())return NodeFilter.FILTER_REJECT;const n=e.parentElement;return!n||t&&t.contains(n)||/^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|OPTION)$/.test(n.tagName)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}}),o=[];let r=n.nextNode();for(;r;)o.push(r),r=n.nextNode();return o}
function getSelectedTextNodes(e,t){const n=new Set;for(let o=0;o<e.rangeCount;o++){const r=e.getRangeAt(o);let i=r.commonAncestorContainer;i&&i.nodeType===3&&(i=i.parentNode);i&&getAllTextNodesIn(i,t).forEach(e=>{try{r.intersectsNode(e)&&n.add(e)}catch(e){}})}return Array.from(n)}
function wrapTextNodeRange(e,t,n,o){if(!e||t===n)return;const r=e.nodeValue.length,i=Math.max(0,Math.min(t,r)),a=Math.max(0,Math.min(n,r));if(i>=a)return;const l=document.createRange();l.setStart(e,i);l.setEnd(e,a);const d=document.createElement("span");d.setAttribute(COLOR_MARK_ATTR,"true");d.style.setProperty("color",o,"important");try{l.surroundContents(d)}catch(e){const t=l.extractContents();d.appendChild(t);l.insertNode(d)}}
function applyColorToSelection(e){const t=window.getSelection(),n=document.getElementById(PANEL_ID);if(!t||t.rangeCount===0||t.isCollapsed)return false;const o=[];for(let e=0;e<t.rangeCount;e++){const r=t.getRangeAt(e);(!n||!n.contains(r.commonAncestorContainer))&&o.push(r.cloneRange())}if(!o.length)return false;let r=false;for(let i=o.length-1;i>=0;i--){const a=o[i],l=getSelectedTextNodes({rangeCount:1,getRangeAt:()=>a},n);if(l.length)for(let i=l.length-1;i>=0;i--){const n=l[i],o=n===a.startContainer,d=n===a.endContainer;let c=0,u=n.nodeValue.length;o&&(c=a.startOffset);d&&(u=a.endOffset);wrapTextNodeRange(n,c,u,e);r=true}}return r&&t.removeAllRanges(),r}

function getPanelBounds(e){const t=Math.max(document.documentElement.clientWidth||0,window.innerWidth||0),n=Math.max(document.documentElement.clientHeight||0,window.innerHeight||0),o=e.getBoundingClientRect(),r=Math.min(o.width||e.offsetWidth||370,t),i=Math.min(o.height||e.offsetHeight||0,n),a=Math.max(0,t-r),l=Math.max(0,n-i);return{vw:t,vh:n,w:r,h:i,maxLeft:a,maxTop:l}}
function clampPosition(e,t,n){const o=getPanelBounds(e);return{left:Math.min(Math.max(0,Math.round(t)),o.maxLeft),top:Math.min(Math.max(0,Math.round(n)),o.maxTop)}}
function applyPanelPosition(e,t){if(!e||!t)return;const n=getPanelBounds(e),o=typeof t.left=="number"?t.left:n.vw-(typeof t.right=="number"?t.right:24)-n.w,r=typeof t.top=="number"?t.top:24,i=clampPosition(e,o,r);e.style.left=`${i.left}px`;e.style.top=`${i.top}px`;e.style.right="auto"}
function makePanelDraggable(e,t,n){if(!e||!t)return;let o=false,r=0,i=0,a=0,l=0;function d(t){if(!o)return;const n=clampPosition(e,a+(t.clientX-r),l+(t.clientY-i));e.style.left=`${n.left}px`;e.style.top=`${n.top}px`;e.style.right="auto"}function c(){if(!o)return;o=false;document.removeEventListener("mousemove",d);document.removeEventListener("mouseup",c);const t=e.getBoundingClientRect();typeof n=="function"&&n({left:Math.max(0,Math.round(t.left)),top:Math.max(0,Math.round(t.top)),right:null})}t.addEventListener("mousedown",function(t){if(t.button!==0||t.target&&t.target.closest("button"))return;o=true;const n=e.getBoundingClientRect();r=t.clientX;i=t.clientY;a=n.left;l=n.top;e.style.left=`${a}px`;e.style.top=`${l}px`;e.style.right="auto";document.addEventListener("mousemove",d);document.addEventListener("mouseup",c)})}

function destroyPanelOnly(){document.getElementById(PANEL_ID)?.remove();document.getElementById(PANEL_STYLE_ID)?.remove();delete window[ROOT_FLAG]}

function setButtonState(e,t){if(!e)return;e.querySelector("#tabbit-style-bold")?.classList.toggle("active",t.fontWeight==="bold");e.querySelector("#tabbit-style-italic")?.classList.toggle("active",t.fontStyle==="italic");e.querySelector("#tabbit-style-underline")?.classList.toggle("active",!!t.underline);e.querySelector("#tabbit-style-strike")?.classList.toggle("active",!!t.strike);e.querySelector("#tabbit-shadow-enabled")?.classList.toggle("active",!!t.shadowEnabled);e.querySelector("#tabbit-stroke-enabled")?.classList.toggle("active",!!t.strokeEnabled);const n=e.querySelector("#tabbit-shadow-section"),o=e.querySelector("#tabbit-stroke-section");n?.classList.toggle("collapsed",!!t.shadowSectionCollapsed);o?.classList.toggle("collapsed",!!t.strokeSectionCollapsed);e.querySelector("#tabbit-shadow-collapse")?.setAttribute("aria-expanded",String(!t.shadowSectionCollapsed));e.querySelector("#tabbit-stroke-collapse")?.setAttribute("aria-expanded",String(!t.strokeSectionCollapsed))}

function updateThemeBadge(e){const t=e?.querySelector("#tabbit-font-badge");if(!t)return;const n=getCurrentTheme();t.textContent=n==="dark"?"🌙 深色":"☀️ 浅色";t.dataset.theme=n}

function mk(tag,props,children){
  const el=document.createElement(tag);
  if(props)Object.entries(props).forEach(([k,v])=>{
    if(k==="className")el.className=v;
    else if(k==="id")el.id=v;
    else if(k==="type")el.type=v;
    else if(k==="htmlFor")el.htmlFor=v;
    else if(k==="textContent")el.textContent=v;
    else if(k==="value")el.value=v;
    else if(k==="min")el.min=v;
    else if(k==="max")el.max=v;
    else if(k==="step")el.step=v;
    else if(k==="placeholder")el.placeholder=v;
    else if(k==="title")el.title=v;
    else if(k==="style")el.style.cssText=v;
    else if(k==="ariaExpanded")el.setAttribute("aria-expanded",v);
    else el.setAttribute(k,v);
  });
  if(children)children.forEach(c=>{if(c)el.appendChild(c)});
  return el;
}

function forceDestroyPanel(){
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(PANEL_STYLE_ID)?.remove();
  delete window[ROOT_FLAG];
}

function createPanel(){
  if(!document.body)return;
  forceDestroyPanel();
  injectPanelStyle();

  const e=load();

  const header=mk("div",{className:"tabbit-font-header"},[
    mk("div",{className:"tabbit-font-title",textContent:"网页字体工具"}),
    mk("div",{className:"tabbit-font-badge",id:"tabbit-font-badge"})
  ]);

  const fontFamilyLabel=mk("label",{htmlFor:"tabbit-font-family",textContent:"选择字体"});
  const fontFamilySelect=mk("select",{id:"tabbit-font-family"});
  fontFamilySelect.appendChild(mk("option",{value:"",textContent:"请选择字体"}));
  FONT_OPTIONS.forEach(opt=>{fontFamilySelect.appendChild(mk("option",{value:opt.value,textContent:opt.label}))});
  const rowFamily=mk("div",{className:"tabbit-font-row"},[fontFamilyLabel,fontFamilySelect]);

  const fontSizeLabel=mk("label",{htmlFor:"tabbit-font-size",textContent:"字体大小 (px)"});
  const fontSizeInput=mk("input",{id:"tabbit-font-size",type:"number",min:"10",max:"72",placeholder:"例如 16"});
  const rowSize=mk("div",{className:"tabbit-font-row"},[fontSizeLabel,fontSizeInput]);

  const styleLabel=mk("label",{textContent:"文字样式"});
  const btnBold=mk("button",{className:"tabbit-style-btn",type:"button",id:"tabbit-style-bold",textContent:"B"});
  const btnItalic=mk("button",{className:"tabbit-style-btn",type:"button",id:"tabbit-style-italic",textContent:"I"});
  const btnUnderline=mk("button",{className:"tabbit-style-btn",type:"button",id:"tabbit-style-underline",textContent:"U"});
  const btnStrike=mk("button",{className:"tabbit-style-btn",type:"button",id:"tabbit-style-strike",textContent:"S"});
  const styleGrid=mk("div",{className:"tabbit-grid-4"},[btnBold,btnItalic,btnUnderline,btnStrike]);
  const rowStyle=mk("div",{className:"tabbit-font-row"},[styleLabel,styleGrid]);
  const sec1=mk("div",{className:"tabbit-font-section"},[rowFamily,rowSize,rowStyle]);

  const shadowTitle=mk("div",{className:"tabbit-section-title",textContent:"字体阴影"});
  const shadowSub=mk("div",{className:"tabbit-section-sub",textContent:"颜色、偏移与模糊即时预览"});
  const shadowTitleWrap=mk("div",{},[shadowTitle,shadowSub]);
  const shadowToggleDot=mk("span",{className:"tabbit-toggle-dot"});
  const shadowToggleText=mk("span",{textContent:"启用阴影"});
  const btnShadowEnabled=mk("button",{className:"tabbit-toggle-btn",type:"button",id:"tabbit-shadow-enabled"},[shadowToggleDot,shadowToggleText]);
  const shadowCollapseIcon=mk("span",{className:"tabbit-collapse-icon",textContent:"▼"});
  const btnShadowCollapse=mk("button",{className:"tabbit-collapse-btn",type:"button",id:"tabbit-shadow-collapse",title:"收起/展开",ariaExpanded:"false"},[shadowCollapseIcon]);
  const shadowHeadRight=mk("div",{style:"display:flex;align-items:center;gap:8px;"},[btnShadowEnabled,btnShadowCollapse]);
  const shadowHead=mk("div",{className:"tabbit-section-head"},[shadowTitleWrap,shadowHeadRight]);
  const shadowColorLabel=mk("label",{htmlFor:"tabbit-shadow-color",textContent:"阴影颜色"});
  const shadowColorInput=mk("input",{id:"tabbit-shadow-color",type:"color"});
  const shadowBlurLabel=mk("label",{htmlFor:"tabbit-shadow-blur",textContent:"模糊 (px)"});
  const shadowBlurInput=mk("input",{id:"tabbit-shadow-blur",type:"number",min:"0",max:"50"});
  const shadowCard1=mk("div",{className:"tabbit-effect-card"},[
    mk("div",{className:"tabbit-effect-card-title",textContent:"颜色与模糊"}),
    mk("div",{className:"tabbit-grid-2"},[mk("div",{},[shadowColorLabel,shadowColorInput]),mk("div",{},[shadowBlurLabel,shadowBlurInput])])
  ]);
  const shadowXLabel=mk("label",{htmlFor:"tabbit-shadow-x",textContent:"水平偏移 (px)"});
  const shadowXInput=mk("input",{id:"tabbit-shadow-x",type:"number",min:"-50",max:"50"});
  const shadowYLabel=mk("label",{htmlFor:"tabbit-shadow-y",textContent:"垂直偏移 (px)"});
  const shadowYInput=mk("input",{id:"tabbit-shadow-y",type:"number",min:"-50",max:"50"});
  const shadowCard2=mk("div",{className:"tabbit-effect-card"},[
    mk("div",{className:"tabbit-effect-card-title",textContent:"位置偏移"}),
    mk("div",{className:"tabbit-grid-2"},[mk("div",{},[shadowXLabel,shadowXInput]),mk("div",{},[shadowYLabel,shadowYInput])])
  ]);
  const shadowCollapsible=mk("div",{className:"tabbit-collapsible"},[mk("div",{className:"tabbit-effect-grid"},[shadowCard1,shadowCard2])]);
  const sec2=mk("div",{className:"tabbit-font-section collapsed",id:"tabbit-shadow-section"},[shadowHead,shadowCollapsible]);

  const strokeTitle=mk("div",{className:"tabbit-section-title",textContent:"字体描边"});
  const strokeSub=mk("div",{className:"tabbit-section-sub",textContent:"适合深浅底色对比增强"});
  const strokeTitleWrap=mk("div",{},[strokeTitle,strokeSub]);
  const strokeToggleDot=mk("span",{className:"tabbit-toggle-dot"});
  const strokeToggleText=mk("span",{textContent:"启用描边"});
  const btnStrokeEnabled=mk("button",{className:"tabbit-toggle-btn",type:"button",id:"tabbit-stroke-enabled"},[strokeToggleDot,strokeToggleText]);
  const strokeCollapseIcon=mk("span",{className:"tabbit-collapse-icon",textContent:"▼"});
  const btnStrokeCollapse=mk("button",{className:"tabbit-collapse-btn",type:"button",id:"tabbit-stroke-collapse",title:"收起/展开",ariaExpanded:"false"},[strokeCollapseIcon]);
  const strokeHeadRight=mk("div",{style:"display:flex;align-items:center;gap:8px;"},[btnStrokeEnabled,btnStrokeCollapse]);
  const strokeHead=mk("div",{className:"tabbit-section-head"},[strokeTitleWrap,strokeHeadRight]);
  const strokeColorLabel=mk("label",{htmlFor:"tabbit-stroke-color",textContent:"描边颜色"});
  const strokeColorInput=mk("input",{id:"tabbit-stroke-color",type:"color"});
  const strokeWidthLabel=mk("label",{htmlFor:"tabbit-stroke-width",textContent:"描边宽度 (px)"});
  const strokeWidthInput=mk("input",{id:"tabbit-stroke-width",type:"number",min:"0",max:"10",step:"0.5"});
  const strokeCard=mk("div",{className:"tabbit-effect-card"},[
    mk("div",{className:"tabbit-effect-card-title",textContent:"描边参数"}),
    mk("div",{className:"tabbit-grid-2"},[mk("div",{},[strokeColorLabel,strokeColorInput]),mk("div",{},[strokeWidthLabel,strokeWidthInput])])
  ]);
  const strokeCollapsible=mk("div",{className:"tabbit-collapsible"},[mk("div",{className:"tabbit-effect-grid"},[strokeCard])]);
  const sec3=mk("div",{className:"tabbit-font-section collapsed",id:"tabbit-stroke-section"},[strokeHead,strokeCollapsible]);

  const colorLabel=mk("label",{htmlFor:"tabbit-font-color",textContent:"选中文字颜色"});
  const colorInput=mk("input",{id:"tabbit-font-color",type:"color"});
  const rowColor=mk("div",{className:"tabbit-font-row"},[colorLabel,colorInput]);
  const btnApplyColor=mk("button",{className:"tabbit-btn-warning",type:"button",id:"tabbit-apply-color",textContent:"选中文字上色"});
  const btnResetFont=mk("button",{className:"tabbit-btn-secondary",type:"button",id:"tabbit-reset-font",textContent:"重置页面"});
  const btnStop=mk("button",{className:"tabbit-btn-secondary",type:"button",id:"tabbit-stop-script",style:"grid-column:1 / span 2;",textContent:"关闭面板"});
  const actions=mk("div",{className:"tabbit-font-actions"},[btnApplyColor,btnResetFont,btnStop]);
  const sec4=mk("div",{className:"tabbit-font-section"},[rowColor,actions]);

  const body=mk("div",{className:"tabbit-font-body"},[sec1,sec2,sec3,sec4]);
  const t=mk("div",{id:PANEL_ID},[header,body]);
  document.body.appendChild(t);

  applyPanelPosition(t,e.panelPosition);
  updateThemeBadge(t);

  const n=s=>t.querySelector(s);
  const r=n("#tabbit-font-family");
  const i=n("#tabbit-font-size");
  const a=n("#tabbit-font-color");
  const s=n("#tabbit-shadow-enabled");
  const f=n("#tabbit-shadow-collapse");
  const p=n("#tabbit-shadow-color");
  const m=n("#tabbit-shadow-blur");
  const g=n("#tabbit-shadow-x");
  const h=n("#tabbit-shadow-y");
  const y=n("#tabbit-stroke-enabled");
  const bk=n("#tabbit-stroke-collapse");
  const v=n("#tabbit-stroke-color");
  const w=n("#tabbit-stroke-width");
  const x=n("#tabbit-apply-color");
  const k=n("#tabbit-reset-font");
  const q=n("#tabbit-stop-script");

  r&&(r.value=e.fontFamily||"");
  i&&(i.value=e.fontSize!==""?String(e.fontSize):"");
  a&&(a.value=e.color||"#ff4d4f");
  p&&(p.value=e.shadowColor||"#000000");
  m&&(m.value=String(e.shadowBlur??2));
  g&&(g.value=String(e.shadowOffsetX??1));
  h&&(h.value=String(e.shadowOffsetY??1));
  v&&(v.value=e.strokeColor||"#000000");
  w&&(w.value=String(e.strokeWidth??1));
  setButtonState(t,e);
  makePanelDraggable(t,header,function(e){const t=load();t.panelPosition=e;save(t)});

  window.addEventListener("resize",()=>{const e=load();applyPanelPosition(t,e.panelPosition);updateThemeBadge(t)});
  window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change",()=>updateThemeBadge(t));
  const E=new MutationObserver(()=>updateThemeBadge(t));
  E.observe(document.documentElement,{attributes:true,attributeFilter:["class","data-theme","theme","style"]});
  document.body&&E.observe(document.body,{attributes:true,attributeFilter:["class","data-theme","theme","style"]});

  function S(e){const n=normalizeSettings({...load(),...e});save(n);setButtonState(t,n);upsertFontStyle(n);updateThemeBadge(t);return n}

  r?.addEventListener("change",()=>S({fontFamily:r.value||""}));
  i?.addEventListener("input",()=>{const e=i.value.trim(),t=e===""?"":Math.max(10,Math.min(72,parseInt(e,10)||10));S({fontSize:t});i.value=t===""?"":String(t)});
  n("#tabbit-style-bold")?.addEventListener("click",()=>S({fontWeight:load().fontWeight==="bold"?"normal":"bold"}));
  n("#tabbit-style-italic")?.addEventListener("click",()=>S({fontStyle:load().fontStyle==="italic"?"normal":"italic"}));
  n("#tabbit-style-underline")?.addEventListener("click",()=>S({underline:!load().underline}));
  n("#tabbit-style-strike")?.addEventListener("click",()=>S({strike:!load().strike}));
  s?.addEventListener("click",()=>S({shadowEnabled:!load().shadowEnabled}));
  y?.addEventListener("click",()=>S({strokeEnabled:!load().strokeEnabled}));
  f?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const t=load();S({shadowSectionCollapsed:!t.shadowSectionCollapsed})});
  bk?.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();const t=load();S({strokeSectionCollapsed:!t.strokeSectionCollapsed})});
  p?.addEventListener("input",()=>S({shadowColor:p.value||"#000000"}));
  m?.addEventListener("input",()=>S({shadowBlur:Math.max(0,Math.min(50,Number(m.value)||0))}));
  g?.addEventListener("input",()=>S({shadowOffsetX:Math.max(-50,Math.min(50,Number(g.value)||0))}));
  h?.addEventListener("input",()=>S({shadowOffsetY:Math.max(-50,Math.min(50,Number(h.value)||0))}));
  v?.addEventListener("input",()=>S({strokeColor:v.value||"#000000"}));
  w?.addEventListener("input",()=>S({strokeWidth:Math.max(0,Math.min(10,Number(w.value)||0))}));
  a?.addEventListener("input",()=>S({color:a.value||"#ff4d4f"}));
  x?.addEventListener("click",()=>{const e=a?.value||"#ff4d4f";if(applyColorToSelection(e)){const t=load();t.color=e;save(t)}});
  k?.addEventListener("click",()=>{
    removeFontStyle();clearColoredText();
    const e=def();clearStore();save(e);
    r&&(r.value="");i&&(i.value="");a&&(a.value=e.color);
    p&&(p.value=e.shadowColor);m&&(m.value=String(e.shadowBlur));
    g&&(g.value=String(e.shadowOffsetX));h&&(h.value=String(e.shadowOffsetY));
    v&&(v.value=e.strokeColor);w&&(w.value=String(e.strokeWidth));
    applyPanelPosition(t,e.panelPosition);setButtonState(t,e);updateThemeBadge(t);
  });
  q?.addEventListener("click",()=>{E.disconnect();destroyPanelOnly()});
}

function registerUserscriptMenu(){
  if(!IS_USERSCRIPT||window[MENU_FLAG])return;
  if(typeof GM_registerMenuCommand!="function")return;
  window[MENU_FLAG]=true;
  GM_registerMenuCommand(" 面板",function(){
    if(document.getElementById(PANEL_ID)){
      document.getElementById(PANEL_ID).remove();
      delete window[ROOT_FLAG];
    }
    createPanel();
    window[ROOT_FLAG]=true;
  });
}

function restoreOnInit(){const e=load();hasFontStyleEffect(e)&&upsertFontStyle(e)}

function executeAutomation(){
  if(window[ROOT_FLAG])return;
  window[ROOT_FLAG]=true;
  restoreOnInit();
  registerUserscriptMenu();
  if(!IS_USERSCRIPT){injectPanelStyle();document.body&&createPanel()}
}

document.readyState==="loading"?document.addEventListener("DOMContentLoaded",executeAutomation,{once:true}):executeAutomation();
})();