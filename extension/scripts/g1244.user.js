// ==UserScript==
// @name         网页图片提取 [简化]
// @description  一键提取页面所有图片：网格/瀑布流双视图、多选、原图查看、下载、手动拾取漏网之鱼
// @icon         https://img.icons8.com/fluency/48/camera.png
// @match        *://*/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        unsafeWindow
// @connect      *
// @run-at       document-idle
// @noframes
// ==/UserScript==
(function(){
if(window.__IPV_LOADED__)return;
window.__IPV_LOADED__=true;

const $=(t,p,c)=>{const e=document.createElement(t);if(p)Object.assign(e,p);if(c!=null)e.textContent=c;return e;};
const abs=u=>{try{return new URL(u,location.href).href;}catch{return '';}};
const isImgUrl=u=>/\.(png|jpe?g|gif|webp|bmp|svg|avif|ico|tiff?)(\\?|#|$)/i.test(u||'');
const extractFromSrcset=s=>(s||'').split(',').map(x=>x.trim().split(/\s+/)[0]).filter(Boolean);
const extractBg=s=>{const r=[];const re=/url$['"]?(.*?)['"]?$/g;let m;while((m=re.exec(s)))r.push(m[1]);return r;};
const fileName=u=>{try{return decodeURIComponent((u.split('/').pop()||'').split('?')[0].split('#')[0]).slice(0,160)||'image';}catch{return 'image';}};
const sanitizeName=s=>s.replace(/[\\/:*?"<>|]/g,'_').slice(0,120);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LAZY_ATTRS=['data-src','data-original','data-lazy-src','data-actualsrc','data-hi-res-src','data-zoom-src','data-echo','data-flickity-lazyload','data-bg','data-background-image','data-image','data-srcset','data-thumb','data-large','data-origin'];

const SVG={
camera:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
close:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
chevLeft:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
chevRight:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
download:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
copy:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
externalLink:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
reset:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`,
refresh:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
selectAll:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
invert:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20" stroke-dasharray="4 2"/></svg>`,
clear:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
pick:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M12 8v4l3 3"/></svg>`,
grid:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>`,
masonry:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="11"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="18" width="7" height="3"/><rect x="14" y="14" width="7" height="7"/></svg>`,
add:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
trash:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
};

function collectImages(root){
  root=root||document;
  const set=new Set();
  const add=u=>{
    u=abs(u);
    if(!u)return;
    if(/^data:image\/gif;base64,R0lGODlh[A-Za-z0-9]/.test(u))return;
    if(u.length>4096)return;
    if(/^javascript:/i.test(u))return;
    set.add(u);
  };
  const qsa=sel=>{try{return root.querySelectorAll(sel);}catch{return [];}};
  qsa('img').forEach(img=>{
    add(img.currentSrc||img.src);
    LAZY_ATTRS.forEach(a=>{const v=img.getAttribute(a);if(v)v.includes(',')&&/\s\d/.test(v)?extractFromSrcset(v).forEach(add):add(v);});
    extractFromSrcset(img.srcset).forEach(add);
  });
  qsa('source').forEach(s=>extractFromSrcset(s.srcset).forEach(add));
  qsa('a[href]').forEach(a=>{if(isImgUrl(a.href))add(a.href);});
  qsa('svg image').forEach(i=>add(i.getAttribute('xlink:href')||i.getAttribute('href')));
  qsa('[style*="background"]').forEach(el=>{const v=el.getAttribute('style')||'';if(v.includes('url('))extractBg(v).forEach(add);});
  const all=root.querySelectorAll?root.querySelectorAll('*'):[];
  const limit=Math.min(all.length,6000);
  for(let i=0;i<limit;i++){
    const bg=getComputedStyle(all[i]).backgroundImage;
    if(bg&&bg!=='none'&&bg.includes('url('))extractBg(bg).forEach(add);
  }
  return [...set];
}

const css=`
:host{all:initial}
*{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e5e5ea}
.btn{position:fixed;right:20px;bottom:20px;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;cursor:pointer;box-shadow:0 8px 24px rgba(139,92,246,.45);z-index:2147483646;transition:.2s;display:flex;align-items:center;justify-content:center}
.btn svg{width:24px;height:24px;stroke:#fff}
.btn:hover{transform:scale(1.08);box-shadow:0 10px 30px rgba(139,92,246,.6)}
.btn:active{transform:scale(.95)}
.mask{position:fixed;inset:0;background:rgba(10,10,15,.94);backdrop-filter:blur(14px);z-index:2147483645;display:flex;flex-direction:column;animation:fade .2s}
@keyframes fade{from{opacity:0}to{opacity:1}}
.bar{display:flex;flex-direction:column;padding:8px 14px 0;border-bottom:1px solid rgba(255,255,255,.08);background:rgba(0,0,0,.3);gap:0}
.bar-row1{display:flex;align-items:center;gap:8px;padding-bottom:8px;flex-wrap:wrap}
.bar-row2{display:flex;align-items:center;gap:5px;padding:6px 0;flex-wrap:wrap}
.bar h3{margin:0;font-size:14px;font-weight:600;background:linear-gradient(135deg,#a5b4fc,#c4b5fd);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap}
.bar .sp{flex:1;min-width:4px}
.tab{display:inline-flex;background:rgba(255,255,255,.06);border-radius:8px;padding:2px;flex-shrink:0}
.tab button{background:none;border:none;color:#bbb;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:12px;transition:.18s;display:inline-flex;align-items:center;gap:5px}
.tab button svg{width:13px;height:13px;flex-shrink:0}
.tab button.on{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;box-shadow:0 2px 8px rgba(139,92,246,.4)}
.ico{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:#ccc;height:30px;min-width:30px;padding:0 10px;border-radius:20px;cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:.18s;white-space:nowrap;letter-spacing:.2px;flex-shrink:0}
.ico svg{width:13px;height:13px;flex-shrink:0;stroke:currentColor}
.ico span{line-height:1}
.ico:hover{background:rgba(255,255,255,.14);border-color:rgba(255,255,255,.18);color:#fff;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.3)}
.ico:active{transform:scale(.95) translateY(0)}
.ico.pri{background:linear-gradient(135deg,rgba(99,102,241,.8),rgba(139,92,246,.8));border-color:rgba(139,92,246,.4);color:#fff;font-weight:500}
.ico.pri svg{stroke:#fff}
.ico.pri:hover{background:linear-gradient(135deg,#6366f1,#8b5cf6);border-color:rgba(139,92,246,.6);box-shadow:0 4px 16px rgba(139,92,246,.4)}
.ico.danger{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.2);color:#fca5a5}
.ico.danger svg{stroke:#fca5a5}
.ico.danger:hover{background:rgba(239,68,68,.24);border-color:rgba(239,68,68,.4);color:#fff}
.ico.danger:hover svg{stroke:#fff}
.ico.acc{background:rgba(34,197,94,.12);border-color:rgba(34,197,94,.2);color:#86efac}
.ico.acc svg{stroke:#86efac}
.ico.acc:hover{background:rgba(34,197,94,.24);border-color:rgba(34,197,94,.4);color:#fff}
.ico.acc:hover svg{stroke:#fff}
.ico.ghost{background:transparent;border-color:rgba(255,255,255,.1);color:#888}
.ico.ghost svg{stroke:#888}
.ico.ghost:hover{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.2);color:#ddd}
.ico.ghost:hover svg{stroke:#ddd}
.cnt{padding:2px 10px;background:rgba(255,255,255,.08);border-radius:12px;font-size:11px;color:#aaa;white-space:nowrap;flex-shrink:0}
.body{flex:1;overflow:auto;padding:14px;scrollbar-width:thin;scrollbar-color:rgba(139,92,246,.5) transparent}
.body::-webkit-scrollbar{width:8px;height:8px}
.body::-webkit-scrollbar-thumb{background:rgba(139,92,246,.5);border-radius:4px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.grid .it{aspect-ratio:1}
.mas{column-count:5;column-gap:10px}
@media(max-width:1100px){.mas{column-count:4}}
@media(max-width:800px){.mas{column-count:3}}
@media(max-width:500px){.mas{column-count:2}}
.mas .it{break-inside:avoid;margin-bottom:10px}
.it{position:relative;border-radius:10px;overflow:hidden;background:#1a1a22;cursor:pointer;border:2px solid transparent;transition:.2s}
.it img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .25s}
.mas .it img{height:auto;object-fit:initial}
.it:hover{border-color:rgba(139,92,246,.55);transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.4)}
.it.sel{border-color:#8b5cf6;box-shadow:0 0 0 2px rgba(139,92,246,.45),0 6px 16px rgba(139,92,246,.3)}
.it .chk{position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:50%;background:rgba(0,0,0,.55);border:2px solid #fff;display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;cursor:pointer;opacity:0;transition:.18s;z-index:2}
.it:hover .chk,.it.sel .chk{opacity:1}
.it.sel .chk{background:#8b5cf6;border-color:#8b5cf6}
.it .meta{position:absolute;left:0;right:0;bottom:0;padding:14px 8px 6px;font-size:10px;color:#fff;background:linear-gradient(to top,rgba(0,0,0,.75),transparent);opacity:0;transition:.2s}
.it:hover .meta{opacity:1}
.it.bad{background:repeating-linear-gradient(45deg,#1a1a22 0 8px,#22222c 8px 16px)}
.it.bad::after{content:'加载失败';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:11px}
.it.bad img{display:none}
.it.loading::after{content:'⏳';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:20px}
.empty{text-align:center;padding:80px 20px;color:#888;font-size:13px}
.empty .em-i{font-size:36px;display:block;margin-bottom:10px;opacity:.5}
.lb{position:fixed;inset:0;background:rgba(5,5,10,.97);z-index:2147483647;display:flex;flex-direction:column;animation:fade .2s}
.lb .stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative}
.lb img{max-width:94%;max-height:94%;object-fit:contain;box-shadow:0 20px 60px rgba(0,0,0,.6);cursor:grab;user-select:none;transition:transform .05s}
.lb img.drag{cursor:grabbing}
.lb .nav{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:48px;border-radius:50%;background:rgba(255,255,255,.08);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.12);color:#fff;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center}
.lb .nav svg{width:22px;height:22px;stroke:#fff;flex-shrink:0}
.lb .nav:hover{background:rgba(139,92,246,.55);border-color:rgba(139,92,246,.7);transform:translateY(-50%) scale(1.08);box-shadow:0 4px 20px rgba(139,92,246,.4)}
.lb .nv-l{left:20px}.lb .nv-r{right:20px}
.lb .tl{display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 20px;background:rgba(0,0,0,.7);backdrop-filter:blur(10px);flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.07)}
.lb .tl-btn{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#ccc;height:36px;padding:0 14px;border-radius:10px;cursor:pointer;font-size:13px;display:inline-flex;align-items:center;justify-content:center;gap:6px;transition:.18s;white-space:nowrap;flex-shrink:0}
.lb .tl-btn svg{width:15px;height:15px;stroke:currentColor;flex-shrink:0}
.lb .tl-btn span{line-height:1}
.lb .tl-btn:hover{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.22);color:#fff;transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.35)}
.lb .tl-btn:active{transform:scale(.96)}
.lb .tl-btn.pri{background:linear-gradient(135deg,rgba(99,102,241,.85),rgba(139,92,246,.85));border-color:rgba(139,92,246,.5);color:#fff;font-weight:500}
.lb .tl-btn.pri:hover{background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 4px 18px rgba(139,92,246,.45)}
.lb .tl-btn.danger{background:rgba(239,68,68,.12);border-color:rgba(239,68,68,.2);color:#fca5a5}
.lb .tl-btn.danger svg{stroke:#fca5a5}
.lb .tl-btn.danger:hover{background:rgba(239,68,68,.24);border-color:rgba(239,68,68,.4);color:#fff}
.lb .tl-btn.danger:hover svg{stroke:#fff}
.lb .ti{position:absolute;top:14px;left:14px;font-size:11px;color:#bbb;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);padding:4px 12px;border-radius:20px;max-width:60vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:1px solid rgba(255,255,255,.08)}
.lb .clo{position:absolute;top:14px;right:14px;width:38px;height:38px;border-radius:50%;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.1);color:#fff;cursor:pointer;transition:.2s;display:flex;align-items:center;justify-content:center}
.lb .clo svg{width:16px;height:16px;stroke:#fff;flex-shrink:0}
.lb .clo:hover{background:rgba(239,68,68,.75);border-color:rgba(239,68,68,.6);box-shadow:0 4px 16px rgba(239,68,68,.35)}
.toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%);background:rgba(20,20,30,.95);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;z-index:2147483647;animation:tin .2s;box-shadow:0 8px 24px rgba(0,0,0,.4);transition:opacity .2s;border:1px solid rgba(139,92,246,.3)}
@keyframes tin{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
.pick-tip{position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;z-index:2147483647;box-shadow:0 6px 20px rgba(139,92,246,.5);font-weight:500}
.filter{display:inline-flex;gap:4px;align-items:center;background:rgba(255,255,255,.06);padding:3px 10px;border-radius:20px;font-size:11px;color:#aaa;border:1px solid rgba(255,255,255,.08);flex-shrink:0}
.filter input{width:48px;background:transparent;border:none;color:#ddd;font-size:11px;padding:0 3px;outline:none}
.prog{position:fixed;left:50%;top:20px;transform:translateX(-50%);min-width:240px;background:rgba(20,20,30,.96);border:1px solid rgba(139,92,246,.4);border-radius:12px;padding:10px 14px;font-size:12px;color:#ddd;z-index:2147483647;box-shadow:0 10px 30px rgba(0,0,0,.5)}
.prog .pb{height:4px;background:rgba(255,255,255,.1);border-radius:2px;margin-top:8px;overflow:hidden}
.prog .pf{height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6);transition:width .2s}
.divider{width:1px;height:18px;background:rgba(255,255,255,.12);margin:0 2px;flex-shrink:0;align-self:center}
.it .rm{position:absolute;bottom:6px;right:6px;width:20px;height:20px;border-radius:50%;background:rgba(239,68,68,.75);border:none;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;cursor:pointer;opacity:0;transition:.18s;z-index:3;line-height:1;padding:0}
.it:hover .rm{opacity:1}
.it .rm:hover{background:rgba(239,68,68,1);transform:scale(1.15);box-shadow:0 2px 8px rgba(239,68,68,.5)}
`;

const host=$('div',{id:'__ipv_root'});
Object.assign(host.style,{all:'initial',position:'fixed',zIndex:2147483646});
document.documentElement.appendChild(host);
const sh=host.attachShadow({mode:'open'});
sh.appendChild($('style',{textContent:css}));
const trigger=$('button',{className:'btn',title:'提取页面图片 (Alt+Shift+I)'});
trigger.innerHTML=SVG.camera;
sh.appendChild(trigger);

let urls=[],metaMap=new Map(),selected=new Set(),view='grid',pickHover=null;
let mask=null,body=null,countEl=null,lastSelectIdx=-1,minSize=0;

function toast(msg,ms=1800){
  sh.querySelectorAll('.toast').forEach(t=>t.remove());
  const t=$('div',{className:'toast',textContent:msg});
  sh.appendChild(t);
  setTimeout(()=>t.style.opacity='0',ms-200);
  setTimeout(()=>t.remove(),ms);
}

function progress(label){
  const p=$('div',{className:'prog'});
  const t=$('div',{textContent:label});
  const bar=$('div',{className:'pb'});
  const fill=$('div',{className:'pf'});
  fill.style.width='0%';
  bar.appendChild(fill);p.append(t,bar);sh.appendChild(p);
  return{
    set(cur,total){t.textContent=cur+'/'+total;fill.style.width=(cur/total*100)+'%';},
    done(){p.remove();}
  };
}

function gmXhrBlob(url,headers){
  return new Promise((resolve,reject)=>{
    if(typeof GM_xmlhttpRequest!=='function')return reject();
    try{
      GM_xmlhttpRequest({
        method:'GET',url,responseType:'blob',timeout:45000,
        headers:headers||{},
        onload:r=>(r.status>=200&&r.status<400&&r.response&&r.response.size>0)?resolve(r.response):reject(r.status),
        onerror:reject,ontimeout:reject
      });
    }catch{reject();}
  });
}

function gmDownload(url,name,headers){
  return new Promise(resolve=>{
    if(typeof GM_download!=='function')return resolve(false);
    try{
      GM_download({url,name,saveAs:false,headers:headers||{},
        onload:()=>resolve(true),onerror:()=>resolve(false),ontimeout:()=>resolve(false)
      });
    }catch{resolve(false);}
  });
}

function saveBlob(blob,name){
  const a=$('a',{href:URL.createObjectURL(blob),download:name});
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

async function downloadOne(url){
  const origBase=fileName(url);
  const extMatch=origBase.match(/\.(\w+)$/);
  const ext=extMatch?('.'+extMatch[1]):'';
  const baseName=fileName(url);
  const name=/\.\w+$/.test(baseName)?baseName:(baseName+ext);
  if(await gmDownload(url,name,{}))return true;
  let blob;
  try{blob=await gmXhrBlob(url,{});}catch{}
  if(!blob||blob.size===0){
    try{blob=await(await fetch(url,{mode:'cors',credentials:'omit'})).blob();}catch{}
  }
  if(blob&&blob.size>0){saveBlob(blob,name);return true;}
  const a=$('a',{href:url,target:'_blank',rel:'noopener',download:name});
  document.body.appendChild(a);a.click();a.remove();
  return false;
}

async function downloadMany(list){
  if(!list.length)return;
  const pr=progress('下载中...');
  let ok=0;
  for(let i=0;i<list.length;i++){
    if(await downloadOne(list[i]))ok++;
    pr.set(i+1,list.length);
    await sleep(220);
  }
  pr.done();
  toast('下载完成：成功 '+ok+'/共 '+list.length);
}

async function copyLinks(list){
  if(!list.length)return;
  const text=list.join('\n');
  try{await navigator.clipboard.writeText(text);toast('已复制 '+list.length+' 条链接');return;}catch{}
  if(typeof GM_setClipboard==='function'){GM_setClipboard(text,'text');toast('已复制 '+list.length+' 条链接');return;}
  const ta=$('textarea');ta.value=text;
  Object.assign(ta.style,{position:'fixed',opacity:0,top:0,left:0});
  document.body.appendChild(ta);ta.select();
  try{document.execCommand('copy');toast('已复制链接');}catch{toast('复制失败');}
  ta.remove();
}

async function copyImage(url){
  try{
    let blob;
    try{blob=await gmXhrBlob(url,{});}catch{blob=await(await fetch(url)).blob();}
    if(!blob||!blob.type.startsWith('image/'))throw 0;
    let out=blob;
    if(blob.type!=='image/png'){
      out=await new Promise((res,rej)=>{
        const im=new Image();im.crossOrigin='anonymous';
        im.onload=()=>{
          const c=document.createElement('canvas');
          c.width=im.naturalWidth;c.height=im.naturalHeight;
          c.getContext('2d').drawImage(im,0,0);
          c.toBlob(b=>b?res(b):rej(),'image/png');
        };
        im.onerror=rej;im.src=URL.createObjectURL(blob);
      });
    }
    await navigator.clipboard.write([new ClipboardItem({'image/png':out})]);
    toast('图片已复制到剪贴板');
  }catch{toast('复制图片失败，已复制链接');navigator.clipboard.writeText(url).catch(()=>{});}
}

function probeMeta(u){
  if(metaMap.has(u))return;
  const im=new Image();
  im.onload=()=>{metaMap.set(u,{w:im.naturalWidth,h:im.naturalHeight,ok:true});updateMeta(u,im.naturalWidth,im.naturalHeight);};
  im.onerror=()=>metaMap.set(u,{w:0,h:0,ok:false});
  im.referrerPolicy='no-referrer';
  im.src=u;
}

function updateMeta(u,w,h){
  if(!body)return;
  const node=body.querySelector('.it[data-u="'+CSS.escape(u)+'"] .meta');
  if(node)node.textContent=w+'×'+h;
}

function removeUrl(u){
  const idx=urls.indexOf(u);
  if(idx!==-1)urls.splice(idx,1);
  selected.delete(u);
  metaMap.delete(u);
  render();
}

function openLightbox(idx){
  const lb=$('div',{className:'lb'});
  let i=idx;
  const stage=$('div',{className:'stage'});
  const img=$('img');
  const ti=$('div',{className:'ti'});
  const clo=$('button',{className:'clo',title:'关闭 (Esc)'});
  clo.innerHTML=SVG.close;
  const navL=$('button',{className:'nav nv-l',title:'上一张 (←)'});
  navL.innerHTML=SVG.chevLeft;
  const navR=$('button',{className:'nav nv-r',title:'下一张 (→)'});
  navR.innerHTML=SVG.chevRight;
  const tl=$('div',{className:'tl'});
  const info=$('span',{className:'cnt'});
  const dl=$('button',{className:'tl-btn pri',title:'下载 (D)'});
  dl.innerHTML=SVG.download+'<span>下载</span>';
  const cp=$('button',{className:'tl-btn',title:'复制图片'});
  cp.innerHTML=SVG.copy+'<span>复制</span>';
  const addBtn=$('button',{className:'tl-btn',title:'加入多选 (S)'});
  const syncAddBtn=()=>{
    const inSel=selected.has(urls[i]);
    addBtn.innerHTML=(inSel?SVG.selectAll:SVG.add)+'<span>'+(inSel?'已选中':'加入选择')+'</span>';
    addBtn.style.color=inSel?'#a78bfa':'';
    addBtn.style.borderColor=inSel?'rgba(167,139,250,.5)':'';
  };
  addBtn.onclick=()=>{
    const u=urls[i];
    selected.has(u)?selected.delete(u):selected.add(u);
    syncAddBtn();
    render();
    toast(selected.has(u)?'已加入选择（共 '+selected.size+' 张）':'已取消选择（剩余 '+selected.size+' 张）');
  };
  const rmBtn=$('button',{className:'tl-btn danger',title:'从列表中剔除此图 (X)'});
  rmBtn.innerHTML=SVG.trash+'<span>剔除</span>';
  rmBtn.onclick=()=>{
    const u=urls[i];
    removeUrl(u);
    if(!urls.length){lb.remove();window.removeEventListener('keydown',onKey,true);return;}
    i=Math.min(i,urls.length-1);
    render_lb();
    toast('已剔除，剩余 '+urls.length+' 张');
  };
  const op=$('button',{className:'tl-btn',title:'在新窗口打开'});
  op.innerHTML=SVG.externalLink+'<span>新窗口</span>';
  const rs=$('button',{className:'tl-btn',title:'复位缩放 (0)'});
  rs.innerHTML=SVG.reset+'<span>复位</span>';
  tl.append(info,dl,cp,addBtn,rmBtn,op,rs);
  stage.append(navL,img,navR);
  lb.append(ti,clo,stage,tl);
  sh.appendChild(lb);
  let scale=1,tx=0,ty=0,dragging=false,sx=0,sy=0;
  const apply=()=>img.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
  const reset=()=>{scale=1;tx=0;ty=0;apply();};
  const render_lb=()=>{
    const u=urls[i];
    ti.textContent=fileName(u);
    info.textContent=(i+1)+'/'+urls.length;
    reset();
    syncAddBtn();
    img.referrerPolicy='no-referrer';
    img.src=u;
  };
  stage.addEventListener('wheel',e=>{
    e.preventDefault();
    scale=Math.max(0.2,Math.min(scale*(e.deltaY>0?0.88:1.12),10));
    apply();
  },{passive:false});
  img.addEventListener('mousedown',e=>{
    dragging=true;sx=e.clientX-tx;sy=e.clientY-ty;
    img.classList.add('drag');e.preventDefault();
  });
  function onMove(e){if(dragging){tx=e.clientX-sx;ty=e.clientY-sy;apply();}}
  function onUp(){dragging=false;img.classList.remove('drag');}
  window.addEventListener('mousemove',onMove);
  window.addEventListener('mouseup',onUp);
  img.addEventListener('dblclick',reset);
  const close=()=>{
    lb.remove();
    window.removeEventListener('keydown',onKey,true);
    window.removeEventListener('mousemove',onMove);
    window.removeEventListener('mouseup',onUp);
  };
  const onKey=e=>{
    if(e.key==='Escape'){e.stopPropagation();close();}
    else if(e.key==='ArrowLeft'){i=(i-1+urls.length)%urls.length;render_lb();}
    else if(e.key==='ArrowRight'){i=(i+1)%urls.length;render_lb();}
    else if(e.key==='0')reset();
    else if(e.key==='d'||e.key==='D')downloadOne(urls[i]);
    else if(e.key==='s'||e.key==='S')addBtn.onclick();
    else if(e.key==='x'||e.key==='X')rmBtn.onclick();
  };
  navL.onclick=()=>{i=(i-1+urls.length)%urls.length;render_lb();};
  navR.onclick=()=>{i=(i+1)%urls.length;render_lb();};
  dl.onclick=()=>downloadOne(urls[i]);
  cp.onclick=()=>copyImage(urls[i]);
  op.onclick=()=>window.open(urls[i],'_blank','noopener');
  rs.onclick=reset;
  clo.onclick=close;
  lb.addEventListener('click',e=>{if(e.target===lb||e.target===stage)close();});
  window.addEventListener('keydown',onKey,true);
  render_lb();
}

function getFiltered(){
  if(!minSize)return urls.slice();
  return urls.filter(u=>{const m=metaMap.get(u);if(!m||!m.ok)return true;return m.w>=minSize||m.h>=minSize;});
}

function render(){
  if(!body)return;
  const list=getFiltered();
  countEl.textContent=list.length+'/'+urls.length+' 张 · 已选 '+selected.size;
  body.innerHTML='';
  if(!list.length){
    const e=$('div',{className:'empty'});
    e.append($('span',{className:'em-i',textContent:'🖼️'}),document.createTextNode('未发现图片，可尝试"手动拾取"或调整筛选'));
    body.appendChild(e);
    return;
  }
  const wrap=$('div',{className:view==='grid'?'grid':'mas'});
  list.forEach((u,idx)=>{
    const realIdx=urls.indexOf(u);
    const it=$('div',{className:'it'+(selected.has(u)?' sel':'')});
    it.dataset.u=u;
    const im=$('img');im.loading='lazy';
    im.referrerPolicy='no-referrer';
    im.onerror=()=>it.classList.add('bad');
    const metaEl=$('div',{className:'meta',textContent:''});
    im.onload=()=>{
      if(!metaMap.has(u))metaMap.set(u,{w:im.naturalWidth,h:im.naturalHeight,ok:true});
      const m=metaMap.get(u);
      metaEl.textContent=m?(m.w+'×'+m.h):'';
    };
    im.src=u;
    const chk=$('div',{className:'chk',textContent:selected.has(u)?'✓':''});
    probeMeta(u);
    const rm=$('button',{className:'rm',title:'从列表中移除此图'});
    rm.textContent='✕';
    rm.onclick=e=>{
      e.stopPropagation();
      removeUrl(u);
      toast('已剔除，剩余 '+urls.length+' 张');
    };
    const toggleSel=shift=>{
      if(shift&&lastSelectIdx>=0){
        const a=Math.min(lastSelectIdx,idx),b=Math.max(lastSelectIdx,idx);
        for(let k=a;k<=b;k++)selected.add(list[k]);
      }else{selected.has(u)?selected.delete(u):selected.add(u);}
      lastSelectIdx=idx;
      render();
    };
    chk.onclick=e=>{e.stopPropagation();toggleSel(e.shiftKey);};
    it.onclick=e=>{
      if(e.shiftKey||e.ctrlKey||e.metaKey){e.preventDefault();toggleSel(e.shiftKey);return;}
      openLightbox(realIdx);
    };
    it.append(im,chk,rm,metaEl);
    wrap.appendChild(it);
  });
  body.appendChild(wrap);
}

function startPicker(){
  if(!mask)return;
  toast('拾取模式：点击元素抓取图片，ESC 退出');
  const overlay=$('div');
  Object.assign(overlay.style,{
    position:'fixed',pointerEvents:'none',border:'2px solid #8b5cf6',
    background:'rgba(139,92,246,.15)',zIndex:2147483646,transition:'all .08s',
    borderRadius:'4px',boxShadow:'0 0 0 9999px rgba(0,0,0,.25)'
  });
  document.body.appendChild(overlay);
  const tip=$('div',{className:'pick-tip',textContent:'拾取模式 · 点击元素抓取 · ESC 退出'});
  sh.appendChild(tip);
  document.body.style.cursor='crosshair';
  const onMove=e=>{
    const el=document.elementFromPoint(e.clientX,e.clientY);
    if(!el||el===host||el===overlay)return;
    pickHover=el;
    const r=el.getBoundingClientRect();
    Object.assign(overlay.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
  };
  const swallow=e=>{e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();};
  const onClick=e=>{
    swallow(e);
    if(!pickHover)return;
    const found=collectImages(pickHover);
    if(pickHover.tagName==='IMG')found.push(abs(pickHover.currentSrc||pickHover.src));
    if(pickHover.href&&isImgUrl(pickHover.href))found.push(abs(pickHover.href));
    let added=0;
    found.forEach(u=>{if(u&&!urls.includes(u)){urls.push(u);added++;}});
    toast('拾取 '+added+' 张新图（共 '+urls.length+'）');
    render();
  };
  const onKey=e=>{if(e.key==='Escape'){e.stopPropagation();stop();}};
  const stop=()=>{
    overlay.remove();tip.remove();
    document.body.style.cursor='';
    document.removeEventListener('mousemove',onMove,true);
    document.removeEventListener('click',onClick,true);
    ['pointerdown','mousedown','mouseup','contextmenu'].forEach(ev=>document.removeEventListener(ev,swallow,true));
    window.removeEventListener('keydown',onKey,true);
    if(mask)mask.style.display='';
  };
  mask.style.display='none';
  document.addEventListener('mousemove',onMove,true);
  document.addEventListener('click',onClick,true);
  ['pointerdown','mousedown','mouseup','contextmenu'].forEach(ev=>document.addEventListener(ev,swallow,true));
  window.addEventListener('keydown',onKey,true);
}

function openViewer(){
  if(mask)mask.remove();
  urls=collectImages();selected.clear();lastSelectIdx=-1;
  mask=$('div',{className:'mask'});
  const bar=$('div',{className:'bar'});
  const row1=$('div',{className:'bar-row1'});
  const row2=$('div',{className:'bar-row2'});
  const title=$('h3',null,' 图片提取器');
  countEl=$('span',{className:'cnt'});
  const tab=$('div',{className:'tab'});
  const bg=$('button',{className:view==='grid'?'on':''});
  bg.innerHTML=SVG.grid+'<span>网格</span>';
  const bm=$('button',{className:view==='mas'?'on':''});
  bm.innerHTML=SVG.masonry+'<span>瀑布流</span>';
  bg.onclick=()=>{view='grid';bg.classList.add('on');bm.classList.remove('on');render();};
  bm.onclick=()=>{view='mas';bm.classList.add('on');bg.classList.remove('on');render();};
  tab.append(bg,bm);
  const filter=$('div',{className:'filter'});
  filter.append(document.createTextNode('最小边 ≥'));
  const sizeInput=$('input',{type:'number',placeholder:'0',value:minSize||''});
  sizeInput.oninput=()=>{minSize=parseInt(sizeInput.value,10)||0;render();};
  filter.append(sizeInput,document.createTextNode('px'));
  const sp1=$('div',{className:'sp'});
  const cl=$('button',{className:'ico danger',title:'关闭'});
  cl.innerHTML=SVG.close+'<span>关闭</span>';
  row1.append(title,countEl,tab,filter,sp1,cl);
  const refreshBtn=$('button',{className:'ico ghost',title:'重新扫描页面图片'});
  refreshBtn.innerHTML=SVG.refresh+'<span>扫描</span>';
  const div1=$('div',{className:'divider'});
  const all=$('button',{className:'ico ghost',title:'全选 (Ctrl+A)'});
  all.innerHTML=SVG.selectAll+'<span>全选</span>';
  const inv=$('button',{className:'ico ghost',title:'反选'});
  inv.innerHTML=SVG.invert+'<span>反选</span>';
  const clr=$('button',{className:'ico ghost',title:'清空选择'});
  clr.innerHTML=SVG.clear+'<span>清空</span>';
  const rmSel=$('button',{className:'ico danger',title:'从列表中剔除已选图片'});
  rmSel.innerHTML=SVG.trash+'<span>剔除所选</span>';
  const div2=$('div',{className:'divider'});
  const dlSel=$('button',{className:'ico pri',title:'下载已选图片'});
  dlSel.innerHTML=SVG.download+'<span>下载已选</span>';
  const dlAll=$('button',{className:'ico ghost',title:'下载全部图片'});
  dlAll.innerHTML=SVG.download+'<span>下载全部</span>';
  const div3=$('div',{className:'divider'});
  const cpSel=$('button',{className:'ico ghost',title:'复制已选链接'});
  cpSel.innerHTML=SVG.copy+'<span>复制链接</span>';
  const div4=$('div',{className:'divider'});
  const pick=$('button',{className:'ico ghost',title:'手动拾取漏网之鱼'});
  pick.innerHTML=SVG.pick+'<span>手动拾取</span>';
  row2.append(refreshBtn,div1,all,inv,clr,rmSel,div2,dlSel,dlAll,div3,cpSel,div4,pick);
  refreshBtn.onclick=()=>{
    urls=collectImages();
    selected.clear();
    lastSelectIdx=-1;
    render();
    toast('重新扫描完成，共 '+urls.length+' 张');
  };
  all.onclick=()=>{const list=getFiltered();list.forEach(u=>selected.add(u));render();};
  inv.onclick=()=>{const list=getFiltered();list.forEach(u=>selected.has(u)?selected.delete(u):selected.add(u));render();};
  clr.onclick=()=>{selected.clear();render();};
  rmSel.onclick=()=>{
    if(!selected.size){toast('请先选择要剔除的图片');return;}
    const count=selected.size;
    selected.forEach(u=>{const idx=urls.indexOf(u);if(idx!==-1)urls.splice(idx,1);metaMap.delete(u);});
    selected.clear();lastSelectIdx=-1;render();
    toast('已剔除 '+count+' 张，剩余 '+urls.length+' 张');
  };
  dlSel.onclick=()=>{const list=[...selected];if(!list.length){toast('请先选择图片');return;}downloadMany(list);};
  dlAll.onclick=()=>{const list=getFiltered();if(!list.length){toast('没有可下载的图片');return;}downloadMany(list);};
  cpSel.onclick=()=>{const list=selected.size?[...selected]:getFiltered();copyLinks(list);};
  pick.onclick=()=>startPicker();
  cl.onclick=()=>{mask.remove();mask=null;body=null;countEl=null;};
  bar.append(row1,row2);
  body=$('div',{className:'body'});
  mask.append(bar,body);
  sh.appendChild(mask);
  render();
  const onGlobalKey=e=>{
    if(!mask)return;
    if((e.ctrlKey||e.metaKey)&&e.key==='a'){
      e.preventDefault();
      const list=getFiltered();list.forEach(u=>selected.add(u));render();
    }
    if(e.key==='Escape'&&mask){
      mask.remove();mask=null;body=null;countEl=null;
      window.removeEventListener('keydown',onGlobalKey,true);
    }
  };
  window.addEventListener('keydown',onGlobalKey,true);
}

trigger.onclick=openViewer;
window.addEventListener('keydown',e=>{
  if(e.altKey&&e.shiftKey&&(e.key==='I'||e.key==='i')){
    e.preventDefault();
    openViewer();
  }
});
})();