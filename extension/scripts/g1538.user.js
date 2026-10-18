(function(){if(window.__CCY_GAME__)return;window.__CCY_GAME__=1;
var ID="ccy-game-root",MAX_TRY=2,TIMEOUT=12000,API="https://free.wqwlkj.cn/wqwlapi/ccy.php";
var PROXIES=[function(u){return"https://api.codetabs.com/v1/proxy?quest="+encodeURIComponent(u)},function(u){return"https://test.cors.workers.dev/?"+u}];

function fetchText(url,timeout){return new Promise(function(resolve,reject){var ctl=new AbortController(),tm=setTimeout(function(){try{ctl.abort()}catch(e){}reject(new Error("请求超时"))},timeout||TIMEOUT);fetch(url,{method:"GET",cache:"no-store",credentials:"omit",signal:ctl.signal}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.text()}).then(function(txt){clearTimeout(tm);resolve(txt)}).catch(function(e){clearTimeout(tm);reject(e)})})}
function parseQ(txt){var body=txt;if(typeof body==="string"){try{body=JSON.parse(body)}catch(e){throw new Error("返回内容不是 JSON")}}["contents","body","data"].forEach(function(k){if(body&&typeof body==="object"&&typeof body[k]==="string"){try{body=JSON.parse(body[k])}catch(e){}}});if(!body||typeof body!=="object"||body.code!=1||!body.img||!body.answer)throw new Error("成语接口无返回数据");return body}
function fetchQ(){var target=API+"?_="+Date.now(),done=false,fc=0,le=null;return new Promise(function(resolve,reject){PROXIES.forEach(function(proxy){fetchText(proxy(target),TIMEOUT).then(parseQ).then(function(d){if(done)return;done=true;resolve(d)}).catch(function(e){le=e;fc++;if(fc>=PROXIES.length&&!done){done=true;reject(new Error("题目请求失败:"+(le&&le.message||"网络异常")))}})})})}

var data=null,answered=false,tryLeft=MAX_TRY,score=+localStorage.getItem("ccy_score")||0,total=+localStorage.getItem("ccy_total")||0,destroyed=false,dragging=false,dragMoved=false,dragDX=0,dragDY=0,dragEl=null,loadSeq=0;
function q(s,p){return(p||document).querySelector(s)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(m){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]})}
function el(t,c,h){var e=document.createElement(t);if(c)e.className=c;if(h!==undefined)e.innerHTML=h;return e}

var css="#ccy-game-root{all:initial;position:fixed;right:24px;bottom:24px;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#0f172a}"
+"#ccy-game-root *{box-sizing:border-box}"
+"#ccy-game-root .ccy-card{width:340px;background:rgba(255,255,255,.94);backdrop-filter:saturate(160%) blur(18px);-webkit-backdrop-filter:saturate(160%) blur(18px);border:1px solid rgba(15,23,42,.08);border-radius:20px;box-shadow:0 24px 60px -12px rgba(15,23,42,.28),0 8px 24px -8px rgba(15,23,42,.14);overflow:hidden}"
+"#ccy-game-root.min .ccy-card{display:none}"
+"#ccy-game-root .ccy-mini-bar{display:none;align-items:center;gap:8px;background:#fff;border:1px solid #e5e7eb;border-radius:999px;padding:8px 14px;box-shadow:0 12px 30px rgba(0,0,0,.18);font-size:13px;color:#374151;cursor:move;user-select:none;touch-action:none}"
+"#ccy-game-root.min .ccy-mini-bar{display:flex}"
+"#ccy-game-root .ccy-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7)}"
+"#ccy-game-root .ccy-hd{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;cursor:move;user-select:none;touch-action:none}"
+"#ccy-game-root .ccy-brand{display:flex;flex-direction:column;gap:1px}"
+"#ccy-game-root .ccy-title{font-weight:700;font-size:14px;letter-spacing:.2px}"
+"#ccy-game-root .ccy-sub{font-size:11px;opacity:.85}"
+"#ccy-game-root .ccy-hda{display:flex;gap:6px;cursor:auto}"
+"#ccy-game-root .ccy-ic{width:26px;height:26px;border-radius:8px;border:0;background:rgba(255,255,255,.18);color:#fff;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;transition:.15s}"
+"#ccy-game-root .ccy-ic:hover{background:rgba(255,255,255,.3)}"
+"#ccy-game-root .ccy-bd{padding:14px}"
+"#ccy-game-root .ccy-stage{position:relative;height:198px;border-radius:14px;background:repeating-linear-gradient(45deg,#f8fafc,#f8fafc 12px,#f1f5f9 12px,#f1f5f9 24px);border:1px dashed rgba(15,23,42,.1);display:flex;align-items:center;justify-content:center;overflow:hidden}"
+"#ccy-game-root .ccy-stage img{max-width:100%;max-height:100%;display:block;cursor:zoom-in;border-radius:10px}"
+"#ccy-game-root .ccy-load{font-size:12px;color:#64748b;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 16px;text-align:center}"
+"#ccy-game-root .ccy-spin{width:22px;height:22px;border:2px solid rgba(99,102,241,.2);border-top-color:#6366f1;border-radius:50%;animation:ccySpin .8s linear infinite}"
+"@keyframes ccySpin{to{transform:rotate(1turn)}}"
+"#ccy-game-root .ccy-row{display:flex;gap:8px;margin-top:12px}"
+"#ccy-game-root .ccy-input{flex:1;height:42px;border:1px solid #cbd5e1;border-radius:11px;padding:0 14px;font-size:15px;outline:none;background:#fff;font-family:inherit;transition:.15s}"
+"#ccy-game-root .ccy-input:focus{border-color:#6366f1;box-shadow:0 0 0 4px rgba(99,102,241,.15)}"
+"#ccy-game-root .ccy-btn{height:42px;padding:0 18px;border:0;border-radius:11px;font-size:13px;font-weight:600;cursor:pointer;color:#fff;background:linear-gradient(135deg,#6366f1,#8b5cf6);box-shadow:0 6px 14px -4px rgba(99,102,241,.5);font-family:inherit;transition:.15s}"
+"#ccy-game-root .ccy-btn:hover{transform:translateY(-1px);box-shadow:0 10px 20px -6px rgba(99,102,241,.6)}"
+"#ccy-game-root .ccy-acts{display:flex;gap:6px;margin-top:8px}"
+"#ccy-game-root .ccy-mini{flex:1;height:30px;border:0;border-radius:9px;background:transparent;color:#64748b;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;font-family:inherit;transition:.15s}"
+"#ccy-game-root .ccy-mini:hover{background:#f1f5f9;color:#0f172a}"
+"#ccy-game-root .ccy-mini.danger:hover{background:#fef2f2;color:#dc2626}"
+"#ccy-game-root .ccy-msg{min-height:18px;margin-top:10px;font-size:12.5px;color:#64748b;line-height:1.5}"
+"#ccy-game-root .ccy-msg.ok{color:#059669;font-weight:600}"
+"#ccy-game-root .ccy-msg.err{color:#dc2626;font-weight:600}"
+"#ccy-game-root .ccy-msg.warn{color:#d97706;font-weight:600}"
+"#ccy-game-root .ccy-ans{font-weight:800;color:#0f172a;background:linear-gradient(180deg,transparent 60%,rgba(168,85,247,.28) 60%);padding:0 2px}"
+"#ccy-game-root .ccy-chips{display:flex;gap:6px;margin-top:12px;padding-top:12px;border-top:1px dashed rgba(15,23,42,.08)}"
+"#ccy-game-root .ccy-chip{flex:1;display:flex;flex-direction:column;align-items:center;padding:6px 4px;border-radius:9px;background:#f8fafc;font-size:11px;color:#64748b}"
+"#ccy-game-root .ccy-chip b{font-size:14px;color:#0f172a;font-weight:700;margin-bottom:1px}"
+"#ccy-game-root .ccy-chip.acc b{background:linear-gradient(135deg,#6366f1,#a855f7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}"
+"#ccy-game-root .ccy-modal{position:fixed;inset:0;z-index:2147483647;background:rgba(2,6,23,.78);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;padding:28px}"
+"#ccy-game-root .ccy-modal.show{display:flex}"
+"#ccy-game-root .ccy-mst{max-width:92vw;max-height:86vh;overflow:auto;border-radius:14px;background:#fff;box-shadow:0 30px 80px rgba(0,0,0,.5)}"
+"#ccy-game-root .ccy-mimg{display:block;width:auto;height:auto;max-width:none;max-height:none;background:#fff;cursor:zoom-out}"
+"#ccy-game-root .ccy-mclose{position:absolute;right:24px;top:24px;border:0;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.18);color:#fff;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:.2s}"
+"#ccy-game-root .ccy-mclose:hover{background:rgba(255,255,255,.3);transform:rotate(90deg)}";

var html="<style></style>"
+"<div class='ccy-mini-bar' title='拖动或点击展开'><span class='ccy-dot'></span><span>猜成语</span></div>"
+"<div class='ccy-card'>"
+"<div class='ccy-hd'><div class='ccy-brand'><div class='ccy-title'>看图猜成语</div></div><div class='ccy-hda'><button class='ccy-ic ccy-min' title='最小化'>−</button><button class='ccy-ic ccy-close' title='关闭'>×</button></div></div>"
+"<div class='ccy-bd'>"
+"<div class='ccy-stage'><div class='ccy-load'><div class='ccy-spin'></div><span>正在加载题目…</span></div></div>"
+"<div class='ccy-row'><input class='ccy-input' placeholder='输入你猜到的成语' maxlength='20'><button class='ccy-btn ccy-check'>提交</button></div>"
+"<div class='ccy-acts'><button class='ccy-mini ccy-next'>↻ 下一题</button><button class='ccy-mini ccy-show'>👁 查看答案</button><button class='ccy-mini danger ccy-reset'>⌫ 清零</button></div>"
+"<div class='ccy-msg'></div>"
+"<div class='ccy-chips'><div class='ccy-chip'><b class='ccy-score'>0</b>答对</div><div class='ccy-chip'><b class='ccy-total'>0</b>总数</div><div class='ccy-chip acc'><b class='ccy-rate'>0%</b>正确率</div></div>"
+"</div></div>"
+"<div class='ccy-modal'><button class='ccy-mclose' title='关闭'>×</button><div class='ccy-mst'><img class='ccy-mimg' alt=''></div></div>";

var root=el("div","",html);root.id=ID;q("style",root).textContent=css;document.documentElement.appendChild(root);

function msg(t,c){if(destroyed)return;var m=q(".ccy-msg",root);m.className="ccy-msg "+(c||"");m.innerHTML=t||""}
function stat(){if(destroyed)return;q(".ccy-score",root).textContent=score;q(".ccy-total",root).textContent=total;q(".ccy-rate",root).textContent=(total?Math.round(score/total*100):0)+"%";localStorage.setItem("ccy_score",score);localStorage.setItem("ccy_total",total)}
function finish(ok){if(destroyed)return;answered=true;total++;if(ok)score++;stat();setTimeout(function(){var i=q(".ccy-input",root);if(i)i.focus()},0)}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function place(x,y){var r=root.getBoundingClientRect();root.style.left=clamp(x,0,Math.max(0,innerWidth-r.width))+"px";root.style.top=clamp(y,0,Math.max(0,innerHeight-r.height))+"px";root.style.right="auto";root.style.bottom="auto"}
function dragStart(e){if(destroyed||e.button!==0||e.target.closest(".ccy-hda"))return;var r=root.getBoundingClientRect();dragging=true;dragMoved=false;dragEl=e.currentTarget;dragDX=e.clientX-r.left;dragDY=e.clientY-r.top;root.style.left=r.left+"px";root.style.top=r.top+"px";root.style.right="auto";root.style.bottom="auto";document.body.style.userSelect="none";try{dragEl.setPointerCapture(e.pointerId)}catch(x){}}
function dragMove(e){if(!dragging||destroyed)return;dragMoved=true;place(e.clientX-dragDX,e.clientY-dragDY)}
function dragEnd(e){if(!dragging)return;dragging=false;document.body.style.userSelect="";try{(dragEl||e.currentTarget).releasePointerCapture(e.pointerId)}catch(x){}dragEl=null}
function bindDrag(h){h.addEventListener("pointerdown",dragStart);h.addEventListener("pointermove",dragMove);h.addEventListener("pointerup",dragEnd);h.addEventListener("pointercancel",dragEnd)}
function openZoom(src){if(destroyed||!src)return;var m=q(".ccy-modal",root),s=q(".ccy-mst",root),i=q(".ccy-mimg",root);s.scrollLeft=0;s.scrollTop=0;i.removeAttribute("style");i.onload=function(){if(destroyed)return;var w=i.naturalWidth||i.width,h=i.naturalHeight||i.height;if(w)i.style.width=w*2+"px";if(h)i.style.height=h*2+"px"};i.src=src;m.classList.add("show")}
function closeZoom(){if(destroyed)return;var m=q(".ccy-modal",root),i=q(".ccy-mimg",root);m.classList.remove("show");i.onload=null;i.removeAttribute("src");i.removeAttribute("style")}
function onKey(e){if(destroyed)return;if(e.key==="Escape"&&q(".ccy-modal",root).classList.contains("show"))closeZoom()}

function load(){if(destroyed)return;var seq=++loadSeq,box=q(".ccy-stage",root),inp=q(".ccy-input",root);data=null;answered=false;tryLeft=MAX_TRY;inp.value="";msg("正在加载新题目…");box.innerHTML="<div class='ccy-load'><div class='ccy-spin'></div><span>正在加载题目…</span></div>";fetchQ().then(function(j){if(destroyed||seq!==loadSeq)return;data=j;var im=new Image();im.onload=function(){if(destroyed||seq!==loadSeq)return;box.innerHTML="";box.appendChild(im);msg("看图猜一个成语，本题还有 "+tryLeft+" 次机会。")};im.onerror=function(){if(destroyed||seq!==loadSeq)return;box.innerHTML="<div class='ccy-load'><span>图片加载失败，请点下一题</span></div>";msg("图片加载失败。","err")};im.onclick=function(){openZoom(j.img)};im.src=j.img;inp.focus()}).catch(function(e){if(destroyed||seq!==loadSeq)return;box.innerHTML="<div class='ccy-load'><span>题目加载失败</span></div>";msg(esc(e&&e.message||"接口请求失败，请稍后重试。"),"err")})}
function check(){if(destroyed)return;var inp=q(".ccy-input",root),v=inp.value.trim();if(!data){msg("请先点击下一题加载题目。","err");return}if(answered){msg("本题已结束，按回车进入下一题。","err");return}if(!v){msg("请先输入答案。","err");return}if(v===data.answer){finish(true);msg("✓ 回答正确！答案是 <span class='ccy-ans'>"+esc(data.answer)+"</span>","ok");return}tryLeft--;if(tryLeft>0){inp.value="";inp.focus();msg("✗ 错了，还剩 "+tryLeft+" 次机会。","warn");return}finish(false);msg("机会用完，正确答案是 <span class='ccy-ans'>"+esc(data.answer)+"</span>","err")}
function show(){if(destroyed)return;if(!data){msg("请先加载题目。","err");return}if(!answered)finish(false);msg("答案是 <span class='ccy-ans'>"+esc(data.answer)+"</span>")}
function reset(){if(destroyed)return;score=0;total=0;stat();msg("战绩已清零。")}
function minimize(){if(destroyed)return;root.classList.add("min")}
function restore(){if(destroyed)return;if(dragMoved){dragMoved=false;return}root.classList.remove("min");var i=q(".ccy-input",root);if(i)i.focus()}
function destroy(){if(destroyed)return;destroyed=true;document.removeEventListener("keydown",onKey,true);window.__CCY_GAME__=0;root.remove()}

bindDrag(q(".ccy-hd",root));bindDrag(q(".ccy-mini-bar",root));
q(".ccy-min",root).onclick=minimize;q(".ccy-mini-bar",root).onclick=restore;q(".ccy-close",root).onclick=destroy;
q(".ccy-next",root).onclick=load;q(".ccy-check",root).onclick=check;q(".ccy-show",root).onclick=show;q(".ccy-reset",root).onclick=reset;
q(".ccy-modal",root).onclick=function(e){if(e.target.classList.contains("ccy-modal")||e.target.classList.contains("ccy-mimg"))closeZoom()};
q(".ccy-mclose",root).onclick=closeZoom;
document.addEventListener("keydown",onKey,true);
q(".ccy-input",root).addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();if(answered)load();else check()}});
stat();load();
})();