// ==UserScript==
// @name         Obsidian Web Clipper Callout Annotator
// @namespace    https://tabbit-ai.com
// @version      1.4.15
// @description  面向 Obsidian Web Clipper 的网页 Callout 标注器：15 种标注类型、合法列表插入、富文本编辑、自动保存与毛玻璃浮动面板。
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

/* OCA-BEGIN v1.4.15 */
console.log('[OCA v1.4.15] \u4EE3\u7801\u5B8C\u6574,\u89E3\u6790\u901A\u8FC7');
(function(){
'use strict';
if(window.__OCA__){try{window.__OCA__.destroy()}catch(e){}}
var timers=[],observers=[],listeners=[],els=[];
var NL=String.fromCharCode(10);
function on(t,e,f,o){t.addEventListener(e,f,o);listeners.push([t,e,f,o])}
function boot(){if(!document.body||!document.head)return setTimeout(boot,50);
 try{main()}catch(err){console.error('[OCA] \u542F\u52A8\u5931\u8D25:',err);
 try{alert('[OCA] \u542F\u52A8\u5931\u8D25: '+err.message)}catch(_){}}}
function main(){
 var V='1.4.15',OR=location.origin+location.pathname;
var LS='oca111:'+OR,LS_OLD=['oca110:'+OR,'oca106:'+OR,'oca105:'+OR];
var KB='oca110-pos-btn',KP='oca110-pos-panel',KC='oca-cfg',KT='oca111-types';
var GKT='oca115-types-global',GKO='oca115-clipper-onboarding',GUIDE_VERSION=1;
var TYPES=[['note','\u7B14\u8BB0','\uD83D\uDCDD','#086ddd'],['abstract','\u6458\u8981','\uD83D\uDCCB','#00b0f0'],['info','\u4FE1\u606F','\u2139\uFE0F','#00b8d4'],['todo','\u5F85\u529E','\u2611\uFE0F','#00b8d4'],['tip','\u63D0\u793A','\uD83D\uDCA1','#00bf63'],['success','\u6210\u529F','\u2705','#08b94e'],['question','\u7591\u95EE','\u2753','#ec7500'],['warning','\u8B66\u544A','\u26A0\uFE0F','#ec7500'],['failure','\u5931\u8D25','\u274C','#e93147'],['danger','\u5371\u9669','\uD83D\uDD25','#e93147'],['bug','Bug','\uD83D\uDC1B','#e93147'],['example','\u793A\u4F8B','\uD83D\uDCCC','#7a5af8'],['quote','\u5F15\u7528','\uD83D\uDCAC','#9e9e9e'],['important','\u91CD\u8981','\u2B50','#00bf63'],['summary','\u603B\u7ED3','\uD83D\uDCDA','#00b0f0']];
 var BUILTIN_TYPES=TYPES.slice(),MAX_CUSTOM=5,TM={},customTypes=[],typeOrder=[],nextCustomId=1,knownCustomIds=[],undoStack=[],redoStack=[];
 var EMOJI_PRESETS=['⭐','💡','🎯','🧠','📌','🔖','✨','🔥','🌱','🚀','🧩','📝','💬','❓','⚠️','✅','❌','🐛','🔍','🎨','📚','💎','🛠️','🌈'];
var curType='note',ins=false,cand=null,banner=null,moved=false,typeDrag=null,typeDragSuppressUntil=0,cancelTypeDragFn=function(){};
var onboarding=null,templateLastSig='',templateStateReady=false;
var snapTimer=null,peekTimerIn=null,peekTimerOut=null,peekActive=false;
var adjusting=false,adjustTimer=null;
var lastMX=0,lastMY=0,hoverPending=false;
var editorEl=null,editorTarget=null,editorCleanups=[];
var SENS=[50,100,200,350,500];
function escHTML(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]})}
function validColor(v){return /^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toLowerCase():'#5b8def'}
function cloneJSON(v){return JSON.parse(JSON.stringify(v))}
function builtinIds(){return BUILTIN_TYPES.map(function(t){return t[0]})}
function typeById(id){for(var i=0;i<customTypes.length;i++)if(customTypes[i].id===id)return customTypes[i];for(var j=0;j<BUILTIN_TYPES.length;j++)if(BUILTIN_TYPES[j][0]===id)return BUILTIN_TYPES[j];return null}
 function isCustomType(id){for(var i=0;i<customTypes.length;i++)if(customTypes[i].id===id)return true;return false}
 function validTypeId(v){return /^[a-z0-9_-]{1,40}$/i.test(String(v||'').trim())}
 function globalRead(key,fallback){
  try{if(typeof GM_getValue==='function'){var gv=GM_getValue(key,null);if(gv!=null&&!(gv&&typeof gv.then==='function')){if(typeof gv==='string'){try{gv=JSON.parse(gv)}catch(_){}}return gv}}}catch(e){}
  try{var raw=localStorage.getItem(key);if(raw==null)return fallback;return JSON.parse(raw)}catch(e){return fallback}}
 function globalWrite(key,value){
  try{if(typeof GM_setValue==='function'){GM_setValue(key,value);return true}}catch(e){}
  try{localStorage.setItem(key,JSON.stringify(value));return true}catch(e){return false}}
 function validTypePayload(raw){return !!(raw&&typeof raw==='object'&&(!raw.schema||raw.schema==='oca-custom-callouts')&&(raw.version===1||raw.version===2||raw.version===3)&&Array.isArray(raw.customTypes))}
 function rememberKnownId(id){id=String(id||'').trim().toLowerCase();if(!validTypeId(id)||builtinIds().indexOf(id)>=0)return;if(knownCustomIds.indexOf(id)<0)knownCustomIds.push(id)}
 function normalizeTypeState(){
 var seen={},clean=[];
 for(var i=0;i<customTypes.length&&clean.length<MAX_CUSTOM;i++){
   var t=customTypes[i]||{},id=String(t.id||'').trim().toLowerCase();
   if(!validTypeId(id)||seen[id]||builtinIds().indexOf(id)>=0)continue;
  var label=String(t.label||'').trim().slice(0,80);if(!label)continue;
  seen[id]=1;clean.push({id:id,label:label,icon:String(t.icon||'\u2728').slice(0,8),color:validColor(t.color)});rememberKnownId(id)}
 customTypes=clean;for(var ci=0;ci<customTypes.length;ci++){var serial=/^oca-custom-(\d+)$/.exec(customTypes[ci].id);if(serial)nextCustomId=Math.max(nextCustomId,(parseInt(serial[1],10)||0)+1)}
 var history=[],historySeen={};for(var hi=0;hi<knownCustomIds.length;hi++){var hid=String(knownCustomIds[hi]||'').trim().toLowerCase();if(validTypeId(hid)&&builtinIds().indexOf(hid)<0&&!historySeen[hid]){historySeen[hid]=1;history.push(hid)}}
 customTypes.forEach(function(t){if(!historySeen[t.id]){historySeen[t.id]=1;history.push(t.id)}});knownCustomIds=history;
 var known={},order=[];for(var j=0;j<BUILTIN_TYPES.length;j++)known[BUILTIN_TYPES[j][0]]=1;
 for(var k=0;k<customTypes.length;k++)known[customTypes[k].id]=1;
 for(var n=0;n<typeOrder.length;n++){var oid=String(typeOrder[n]);if(known[oid]&&order.indexOf(oid)<0){order.push(oid);delete known[oid]}}
 builtinIds().concat(customTypes.map(function(t){return t.id})).forEach(function(id){if(known[id]){order.push(id);delete known[id]}});
 typeOrder=order;nextCustomId=Math.max(1,parseInt(nextCustomId,10)||1)}
 function adoptTypePayload(raw){if(!validTypePayload(raw))return false;customTypes=Array.isArray(raw.customTypes)?cloneJSON(raw.customTypes):[];typeOrder=Array.isArray(raw.order)?raw.order.slice():builtinIds();nextCustomId=raw.nextId||1;knownCustomIds=Array.isArray(raw.knownCustomIds)?raw.knownCustomIds.slice():[];return true}
 function mergeTypePayload(raw){if(!validTypePayload(raw))return false;var before=JSON.stringify({customTypes:customTypes,order:typeOrder,known:knownCustomIds}),existing={};customTypes.forEach(function(t){existing[t.id]=1;rememberKnownId(t.id)});(raw.knownCustomIds||[]).forEach(rememberKnownId);var incoming=Array.isArray(raw.customTypes)?raw.customTypes:[];for(var i=0;i<incoming.length&&customTypes.length<MAX_CUSTOM;i++){var t=incoming[i]||{},id=String(t.id||'').trim().toLowerCase();if(!validTypeId(id)||existing[id]||builtinIds().indexOf(id)>=0)continue;customTypes.push({id:id,label:String(t.label||'').trim(),icon:String(t.icon||'\u2728').slice(0,8),color:validColor(t.color)});existing[id]=1;rememberKnownId(id)}var incomingOrder=Array.isArray(raw.order)?raw.order:[];for(var j=0;j<incomingOrder.length;j++){var oid=String(incomingOrder[j]);if((builtinIds().indexOf(oid)>=0||existing[oid])&&typeOrder.indexOf(oid)<0)typeOrder.push(oid)};nextCustomId=Math.max(nextCustomId,parseInt(raw.nextId,10)||1);return before!==JSON.stringify({customTypes:customTypes,order:typeOrder,known:knownCustomIds})}
 function rebuildTM(){TM={};BUILTIN_TYPES.forEach(function(t){TM[t[0]]=t});customTypes.forEach(function(t){TM[t.id]=[t.id,t.label,t.icon,t.color]})}
 function loadTypeState(){
  typeOrder=builtinIds();customTypes=[];nextCustomId=1;knownCustomIds=[];var global=globalRead(GKT,null),local=null,merged=false,needsSave=!validTypePayload(global)||global.version!==3,before='';
  try{local=JSON.parse(localStorage.getItem(KT)||'null')}catch(e){local=null}
  before=JSON.stringify({customTypes:customTypes,order:typeOrder,nextId:nextCustomId,knownCustomIds:knownCustomIds});
  if(!adoptTypePayload(global)){if(validTypePayload(local))adoptTypePayload(local)}else if(validTypePayload(local))merged=mergeTypePayload(local);
  normalizeTypeState();rebuildTM();var after=JSON.stringify({customTypes:customTypes,order:typeOrder,nextId:nextCustomId,knownCustomIds:knownCustomIds});if(needsSave||merged||before!==after)saveTypeState()}
 function clipperIds(){var ids=builtinIds().slice(),seen={};ids.forEach(function(id){seen[id]=1});var add=function(id){id=String(id||'').trim().toLowerCase();if(validTypeId(id)&&!seen[id]&&builtinIds().indexOf(id)<0){seen[id]=1;ids.push(id)}};typeOrder.forEach(add);customTypes.forEach(function(t){add(t.id)});knownCustomIds.forEach(add);return ids}
 function buildClipperTemplate(){return '{{content'+clipperIds().map(function(id){return '|replace:"/..!'+id+'../g":"[!'+id+']"'}).join('')+'}}'}
 function templateSignature(){return clipperIds().slice().sort().join('|')}
 function loadOnboarding(){var raw=globalRead(GKO,null);onboarding=raw&&typeof raw==='object'?raw:{guideVersion:0,acknowledgedSignature:'',snoozedSignature:'',snoozedUntil:0,autoDisabled:false};if(!onboarding.guideVersion)onboarding.guideVersion=0}
 function saveOnboarding(){globalWrite(GKO,onboarding)}
 function notifyTemplateSignature(){var sig=templateSignature();if(templateStateReady&&sig!==templateLastSig){if(typeof updateTemplateStatus==='function')updateTemplateStatus();if(typeof toast==='function')toast('\u26A0\uFE0F Web Clipper \u8FC7\u6EE4\u6A21\u677F\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u590D\u5236\u65B0\u6A21\u677F');}templateLastSig=sig}
 function saveTypeState(){var payload={schema:'oca-custom-callouts',version:3,customTypes:cloneJSON(customTypes),order:typeOrder.slice(),nextId:nextCustomId,knownCustomIds:knownCustomIds.slice()};globalWrite(GKT,payload);try{localStorage.setItem(KT,JSON.stringify({schema:'oca-custom-callouts',version:2,customTypes:cloneJSON(customTypes),order:typeOrder.slice(),nextId:nextCustomId}))}catch(e){};notifyTemplateSignature()}
function allTypes(){var out=[];for(var i=0;i<typeOrder.length;i++){var t=typeById(typeOrder[i]);if(t)out.push(t)}return out}
function typeInfo(id,meta){var t=typeById(id),fallback=t?{id:t[0]||t.id,label:t[1]||t.label,icon:t[2]||t.icon,color:validColor(t[3]||t.color)}:{id:id||'note',label:id||'\u7B14\u8BB0',icon:'\uD83D\uDCDD',color:'#5b8def'};if(meta&&(meta.label||meta.icon||meta.color))return{id:fallback.id,label:meta.label||fallback.label,icon:meta.icon||fallback.icon,color:validColor(meta.color||fallback.color)};return fallback}
 function typeGridHTML(){return allTypes().map(function(t){var id=t[0]||t.id,label=t[1]||t.label,icon=t[2]||t.icon,color=validColor(t[3]||t.color),custom=isCustomType(id);return '<div class="tb'+(id===curType?' on':'')+(custom?' custom':'')+'" data-t="'+escHTML(id)+'" data-color="'+color+'" role="button" tabindex="0"><span class="tb-main">'+escHTML(icon)+'<small>'+escHTML(label)+'</small></span>'+(custom?'<button type="button" class="tb-more" data-type-action="menu" data-type-id="'+escHTML(id)+'" title="\u7BA1\u7406\u81EA\u5B9A\u4E49\u6807\u6CE8">\u22EF</button><span class="tb-menu" data-menu-for="'+escHTML(id)+'"><button type="button" data-type-action="create">\u65B0\u5EFA</button><button type="button" data-type-action="edit" data-type-id="'+escHTML(id)+'">\u7F16\u8F91</button><button type="button" data-type-action="delete" data-type-id="'+escHTML(id)+'">\u5220\u9664</button></span>':'')+'</div>'}).join('')}
function renderTypeGrid(){var grid=panel&&panel.querySelector('.tg');if(!grid)return;grid.innerHTML=typeGridHTML();syncTypeTiles();updateTypeActions()}
function syncTypeTiles(){if(!panel)return;panel.querySelectorAll('.tb').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-t')===curType)})}
 function updateTypeActions(){if(!panel)return;var count=customTypes.length,add=panel.querySelector('.type-actions [data-type-action="create"]');if(add)add.disabled=count>=MAX_CUSTOM;var u=panel.querySelector('.type-actions [data-type-action="undo"]'),r=panel.querySelector('.type-actions [data-type-action="redo"]');if(u)u.disabled=!undoStack.length;if(r)r.disabled=!redoStack.length}
 function typeSnapshot(){return JSON.stringify({customTypes:customTypes,order:typeOrder,nextId:nextCustomId,knownCustomIds:knownCustomIds,curType:curType})}
 function pushTypeHistory(){var s=typeSnapshot();if(undoStack[undoStack.length-1]===s)return;undoStack.push(s);if(undoStack.length>20)undoStack.shift();redoStack=[];updateTypeActions()}
 function restoreTypeSnapshot(s){try{var x=JSON.parse(s);customTypes=x.customTypes||[];typeOrder=x.order||builtinIds();nextCustomId=x.nextId||1;knownCustomIds=x.knownCustomIds||[];normalizeTypeState();rebuildTM();if(x.curType&&typeById(x.curType))curType=x.curType;else if(!typeById(curType))curType='note';saveTypeState();renderTypeGrid();applyUI()}catch(e){}}
 function undoType(){if(!undoStack.length){toast('\u26A0\uFE0F \u6CA1\u6709\u53EF\u64A4\u56DE\u7684\u7C7B\u578B\u64CD\u4F5C');return}var current=typeSnapshot(),s=undoStack.pop();redoStack.push(current);if(redoStack.length>20)redoStack.shift();restoreTypeSnapshot(s);toast('\u21A9 \u5DF2\u64A4\u56DE');updateTypeActions()}
 function redoType(){if(!redoStack.length){toast('\u26A0\uFE0F \u6CA1\u6709\u53EF\u524D\u8FDB\u7684\u7C7B\u578B\u64CD\u4F5C');return}var current=typeSnapshot(),s=redoStack.pop();undoStack.push(current);if(undoStack.length>20)undoStack.shift();restoreTypeSnapshot(s);toast('\u21AA \u5DF2\u524D\u8FDB');updateTypeActions()}
loadTypeState();loadOnboarding();templateLastSig=templateSignature();templateStateReady=true;
function q(s,r){return (r||document).querySelector(s)}
function noTr(el){el.setAttribute('translate','no');el.classList.add('notranslate')}
function darkP(){try{var c=getComputedStyle(document.body).backgroundColor;
 if(!c||c==='transparent'||c.indexOf('rgba(0, 0, 0, 0)')===0)return false;
 var m=c.match(/\d+/g);return m&&(m[0]*.299+m[1]*.587+m[2]*.114)<128}catch(e){return false}}
function webFontSize(){try{return parseFloat(getComputedStyle(document.body).fontSize)||16}catch(e){return 16}}
function root(){return q('main,article,[role="main"],.content,#content')||document.body}
 function blocks(){var a=root().querySelectorAll('h1,h2,h3,h4,h5,h6,p,ul,ol,li,pre,table,figure,img,hr'),o=[];
  for(var i=0;i<a.length;i++){if(!a[i].closest('.oca-note')&&!a[i].closest('#oca-panel')&&!a[i].closest('.oca-editor'))o.push(a[i])}return o}
 function isList(el){if(!el||el.nodeType!==1)return false;var t=el.tagName.toLowerCase();return t==='ol'||t==='ul'}
 function listItems(list){var out=[],c=list?list.children:[];for(var i=0;i<c.length;i++)if(c[i].tagName&&c[i].tagName.toLowerCase()==='li')out.push(c[i]);return out}
 function listOrigin(list){if(!isList(list))return -1;var raw=list.getAttribute('data-oca-origin-list'),n=parseInt(raw,10);
  if(!isNaN(n))return n;
  var all=root().querySelectorAll('ol,ul');n=0;
  for(var i=0;i<all.length;i++)if(all[i]===list){n=i;break}
  list.setAttribute('data-oca-origin-list',String(n));
  if(!list.hasAttribute('data-oca-list-base'))list.setAttribute('data-oca-list-base','0');
  return n}
 function listBase(list){var n=parseInt(list&&list.getAttribute('data-oca-list-base'),10);return isNaN(n)?0:Math.max(0,n)}
 function seedListOrigins(){var all=root().querySelectorAll('ol,ul');for(var i=0;i<all.length;i++)listOrigin(all[i])}
 function listAnchorForItem(item){var list=item&&item.parentElement;if(!isList(list))return null;
  var items=listItems(list),at=items.indexOf(item);if(at<0)return null;
  return{kind:'list',listIndex:listOrigin(list),itemIndex:listBase(list)+at+1,listTag:list.tagName.toLowerCase()}}
 function findListItem(anchor){if(!anchor||anchor.kind!=='list')return null;
  var all=root().querySelectorAll('ol,ul'),wanted=parseInt(anchor.listIndex,10),itemNo=parseInt(anchor.itemIndex,10);
  if(isNaN(wanted)||isNaN(itemNo)||itemNo<1)return null;
  for(var i=0;i<all.length;i++){
   var list=all[i],origin=listOrigin(list);if(origin!==wanted)continue;
   var items=listItems(list),offset=itemNo-listBase(list)-1;
   if(offset>=0&&offset<items.length)return items[offset]}
  return null}
 function setListAnchor(noteEl,anchor){if(!noteEl||!anchor||anchor.kind!=='list')return;
  noteEl.setAttribute('data-oca-anchor-kind','list');
  noteEl.setAttribute('data-oca-list-index',String(anchor.listIndex));
  noteEl.setAttribute('data-oca-item-index',String(anchor.itemIndex));
  noteEl.setAttribute('data-oca-list-tag',anchor.listTag||'')}
 function readListAnchor(noteEl){if(!noteEl||noteEl.getAttribute('data-oca-anchor-kind')!=='list')return null;
  var listIndex=parseInt(noteEl.getAttribute('data-oca-list-index'),10),itemIndex=parseInt(noteEl.getAttribute('data-oca-item-index'),10);
  if(isNaN(listIndex)||isNaN(itemIndex)||itemIndex<1)return null;
  return{kind:'list',listIndex:listIndex,itemIndex:itemIndex,listTag:noteEl.getAttribute('data-oca-list-tag')||''}}
 function anchorForCandidate(el){
  if(el&&el.tagName&&el.tagName.toLowerCase()==='li')return listAnchorForItem(el);
  return{kind:'block',ai:blocks().indexOf(el)}}
 function cloneListShell(list,itemsBefore){
  var tail=list.cloneNode(false),items=listItems(list),base=listBase(list),tag=list.tagName.toLowerCase();
  tail.removeAttribute('id');tail.setAttribute('data-oca-origin-list',String(listOrigin(list)));
  tail.setAttribute('data-oca-list-base',String(base+itemsBefore));
  if(tag==='ol'){
   var start=parseInt(list.getAttribute('start'),10);
   if(isNaN(start))start=list.hasAttribute('reversed')?items.length:1;
   tail.setAttribute('start',String(list.hasAttribute('reversed')?start-itemsBefore:start+itemsBefore))}
  return tail}
 function insertAfterListItem(noteEl,item,anchor){
  var list=item&&item.parentElement;if(!isList(list)||!list.parentNode)return false;
  var items=listItems(list),at=items.indexOf(item);if(at<0)return false;
  var before=at+1,tail=cloneListShell(list,before),node=item.nextSibling;
  while(node){var next=node.nextSibling;tail.appendChild(node);node=next}
  list.parentNode.insertBefore(noteEl,list.nextSibling);
  if(listItems(tail).length)list.parentNode.insertBefore(tail,noteEl.nextSibling);
  setListAnchor(noteEl,anchor||listAnchorForItem(item));
  return true}
 function mergeSplitListAround(noteEl){
  var left=noteEl&&noteEl.previousElementSibling,right=noteEl&&noteEl.nextElementSibling;
  if(!isList(left)||!isList(right))return;
  if(left.getAttribute('data-oca-origin-list')!==right.getAttribute('data-oca-origin-list'))return;
  if(listBase(right)!==listBase(left)+listItems(left).length)return;
  while(right.firstChild)left.appendChild(right.firstChild);
  right.remove()}
 function removeNote(noteEl){if(!noteEl)return;mergeSplitListAround(noteEl);noteEl.remove()}
 function anchorFromExistingNote(noteEl){
  var stored=readListAnchor(noteEl);if(stored)return stored;
  var parent=noteEl&&noteEl.parentElement;
  if(isList(parent)){
   var count=0,c=parent.children;
   for(var i=0;i<c.length;i++){if(c[i]===noteEl)break;if(c[i].tagName&&c[i].tagName.toLowerCase()==='li')count++}
   if(count)return{kind:'list',listIndex:listOrigin(parent),itemIndex:listBase(parent)+count,listTag:parent.tagName.toLowerCase()}}
  var prev=noteEl&&noteEl.previousElementSibling;
  return{kind:'block',ai:blocks().indexOf(prev)}}
function toast(m){var t=q('#oca-toast');if(!t){t=document.createElement('div');t.id='oca-toast';noTr(t);document.body.appendChild(t);els.push(t)}
 t.textContent=m;t.style.opacity='1';clearTimeout(t._h);t._h=setTimeout(function(){t.style.opacity='0'},2600)}
function escHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function inlineMd(s){
 s=escHtml(s);
 s=s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
 s=s.replace(/==(.+?)==/g,'<mark>$1</mark>');
 s=s.replace(/~~(.+?)~~/g,'<s>$1</s>');
 var emRe=new RegExp('(^|[\\s>])\\*([^'+NL+']+?)\\*(?=[\\s<.,!?]|$)', 'g');
 s=s.replace(emRe,'$1<em>$2</em>');
 s=s.replace(/&lt;u&gt;/g,'<u>').replace(/&lt;\/u&gt;/g,'</u>');
 return s}
function mdToHtml(md){
 if(!md)return '';
 var lines=md.split(NL),html='',inBq=false;
 for(var i=0;i<lines.length;i++){
  var line=lines[i];
  if(/^>\s?(.*)/.test(line)){
   if(!inBq){html+='<blockquote>';inBq=true}
   html+=inlineMd(line.replace(/^>\s?/,''))+'<br>'}
  else{
   if(inBq){html+='</blockquote>';inBq=false}
   if(line.trim()===''){html+='<br>'}
   else{html+=inlineMd(line)+'<br>'}}}
 if(inBq)html+='</blockquote>';
 return html}
function toHtml(body){
 if(!body)return '';
 if(/<\/?[a-z][^>]*>/i.test(body))return body;
 if(/\*\*|==|~~|(^|\n)>/m.test(body))return mdToHtml(body);
 return escHtml(body).split(NL).join('<br>')}
function mdFromHTML(el){
 var out='';
 function walkChildren(n){var c=n.childNodes;for(var i=0;i<c.length;i++)walk(c[i])}
 function walkList(n,ordered){
  var c=n.children,num=0;
  for(var i=0;i<c.length;i++){
   var item=c[i];
   if(item.tagName&&item.tagName.toLowerCase()==='li'){
    num++;out+=(ordered?num+'. ':'- ');walkChildren(item);out+=NL}
   else{walk(item)}}}
 function walk(n){
  if(n.nodeType===3){out+=n.textContent;return}
  if(n.nodeType!==1)return;
  var tag=n.tagName.toLowerCase();
  if(tag==='br'){out+=NL;return}
  if(tag==='strong'||tag==='b'){out+='**'+n.textContent+'**';return}
  if(tag==='em'||tag==='i'){out+='*'+n.textContent+'*';return}
  if(tag==='u'){out+=n.outerHTML;return}
  if(tag==='mark'){out+='=='+n.textContent+'==';return}
  if(tag==='s'||tag==='strike'){out+='~~'+n.textContent+'~~';return}
  if(tag==='a'){out+='['+(n.textContent||n.href)+']('+n.href+')';return}
  if(tag==='blockquote'){
   var start=out.length;walkChildren(n);
   var quoted=out.slice(start).replace(new RegExp(NL+'+$'),'');out=out.slice(0,start);
   out+='> '+quoted.split(NL).join(NL+'> ')+NL+NL;return}
  if(tag==='li'){out+='- ';walkChildren(n);out+=NL;return}
  if(tag==='ol'){walkList(n,true);return}
  if(tag==='ul'){walkList(n,false);return}
  if(tag==='div'||tag==='p'){walkChildren(n);out+=NL;return}
  walkChildren(n)}
 walk(el);
 return out.replace(new RegExp(NL+'{3,}','g'),NL+NL).trim()}
function lockAdjust(){adjusting=true;clearTimeout(adjustTimer);
 adjustTimer=setTimeout(function(){adjusting=false;hoverCheck()},600)}
function defCfg(){return{glass:1,blur:8,op:92,theme:'dark',cbg:'#1e1e1e',ctxt:'#e0e0e0',cbdr:'#444444',chead:'#2a2a2a',fmode:'default',fsize:13,bmode:'default',bsize:42,pos:'snap',full:0,gap:20,fold:0,pw:272,ph:0,autoFold:1,noteFont:'web',noteSize:15,peek:30,sens:3,saveCfg:1,transient:0}}
var CFG=defCfg();
(function(){
 var raw=null,hasRaw=false;
 try{var s=localStorage.getItem(KC);
  if(s){raw=JSON.parse(s);hasRaw=(raw&&typeof raw==='object')}}catch(e){}
 if(hasRaw){
  if(raw.saveCfg===0){CFG.saveCfg=0}
  else{for(var k in raw){if(raw[k]!=null)CFG[k]=raw[k]}}}
 if(!hasRaw||!raw||!raw.theme){var t0=localStorage.getItem('oca110-theme');
  if(t0==='light'||t0==='dark')CFG.theme=t0;else CFG.theme=darkP()?'dark':'light'}
 if(!hasRaw||!raw||raw.pos!==('snap')&&raw.pos!==('free'))CFG.pos='snap';
 CFG.fold=0;CFG.transient=0})();
function saveCfg(){if(CFG.saveCfg){var saved=cloneJSON(CFG);delete saved.transient;localStorage.setItem(KC,JSON.stringify(saved))}}
function hexA(hex,a){var m=(hex||'').replace('#','');if(m.length===3)m=m[0]+m[0]+m[1]+m[1]+m[2]+m[2];
 var r=parseInt(m.substr(0,2),16)||0,g=parseInt(m.substr(2,2),16)||0,b=parseInt(m.substr(4,2),16)||0;
 return 'rgba('+r+','+g+','+b+','+a+')'}
function lumOf(hex){var m=(hex||'').replace('#','');if(m.length===3)m=m[0]+m[0]+m[1]+m[1]+m[2]+m[2];
 var r=parseInt(m.substr(0,2),16)||0,g=parseInt(m.substr(2,2),16)||0,b=parseInt(m.substr(4,2),16)||0;
 return r*.299+g*.587+b*.114}
function themeBase(){if(CFG.theme==='custom')return lumOf(CFG.cbg)<128?'dark':'light';return CFG.theme}
function noteFontSize(){return CFG.noteFont==='web'?webFontSize():CFG.noteSize}
var C=['@keyframes oca-pulse3{0%{box-shadow:0 0 0 0 rgba(212,175,55,.9),0 0 12px rgba(212,175,55,.4)}25%{box-shadow:0 0 0 4px rgba(230,190,100,.7),0 0 18px rgba(212,175,55,.5)}50%{box-shadow:0 0 0 2px rgba(255,223,128,.85),0 0 14px rgba(230,190,100,.45)}75%{box-shadow:0 0 0 5px rgba(212,175,55,.6),0 0 20px rgba(212,175,55,.5)}100%{box-shadow:0 0 0 0 rgba(212,175,55,.2),0 0 8px rgba(212,175,55,.15)}}',
'.oca-pulse{animation:oca-pulse3 1.1s ease-in-out 2}',
'@keyframes oca-type-jelly{0%{transform:scale(1)}35%{transform:scale(1.08,.92)}60%{transform:scale(.96,1.05)}82%{transform:scale(1.02,.98)}100%{transform:scale(1)}}',
'.oca-type-jelly{animation:oca-type-jelly .42s cubic-bezier(.2,.8,.2,1)}',
 'blockquote.oca-note{margin:14px 0;padding:10px 14px;border-left:3px solid;border-radius:6px;position:relative;line-height:1.6;font-style:normal!important}',
'blockquote.oca-note .oca-nt{font-weight:700;cursor:pointer;user-select:none;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}',
'blockquote.oca-note .oca-nt::before{content:"\u25BE";margin-right:6px;font-size:1em;display:inline-block}',
'blockquote.oca-note.oca-folded .oca-nt::before{content:"\u25B8"}',
'blockquote.oca-note.oca-folded .oca-nb{display:none}',
 'blockquote.oca-note .oca-nb{margin-top:6px;min-height:1.4em;white-space:pre-wrap;word-break:break-word;font-style:normal!important}',
 'blockquote.oca-note .oca-nb i,blockquote.oca-note .oca-nb em{font-style:italic!important}',
'blockquote.oca-note .oca-nb:empty::before{content:"\u5199\u4E0B\u4F60\u7684\u611F\u609F\u2026";opacity:.45}',
'.oca-note .oca-x,.oca-note .oca-cp,.oca-note .oca-ed{position:absolute;top:6px;width:18px;height:18px;line-height:18px;text-align:center;cursor:pointer;opacity:0;border-radius:4px;transition:opacity .15s}',
'.oca-note .oca-x{right:9px;font-size:14px}.oca-note .oca-x::after{content:"\u00D7"}',
'.oca-note .oca-cp{right:32px;font-size:13px}.oca-note .oca-cp::after{content:"\uD83D\uDCCB"}',
'.oca-note .oca-ed{right:55px;font-size:12px}.oca-note .oca-ed::after{content:"\u270E"}',
'.oca-note:hover .oca-x,.oca-note:hover .oca-cp,.oca-note:hover .oca-ed{opacity:.55}',
'.oca-note .oca-x:hover,.oca-note .oca-cp:hover,.oca-note .oca-ed:hover{opacity:1!important}',
'.oca-cand{outline:2px dashed #086ddd!important;outline-offset:3px!important;cursor:copy!important}',
'.oca-editor{margin:10px 0 12px 20px;border:1px solid rgba(186,222,226,.78);border-radius:8px;overflow:hidden;font-family:Georgia,"Noto Serif SC","Songti SC",serif;font-size:13px;color:#263f47;background:rgba(246,252,252,.72);box-shadow:0 18px 42px rgba(12,49,60,.20),inset 0 1px 0 rgba(255,255,255,.82);backdrop-filter:blur(16px) saturate(135%);-webkit-backdrop-filter:blur(16px) saturate(135%)}',
'.oca-editor .oe-head{display:flex;align-items:center;gap:8px;padding:9px 12px;background:rgba(13,75,86,.84);color:#f4fffe;border-bottom:1px solid rgba(226,190,104,.84);box-shadow:inset 0 1px 0 rgba(255,255,255,.20)}',
'.oca-editor .oe-mark{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(231,188,91,.96);color:#173d47;box-shadow:inset 0 1px 0 rgba(255,255,255,.52),0 2px 7px rgba(0,0,0,.18);font-family:-apple-system,"Segoe UI",sans-serif;font-weight:800;font-size:13px;flex-shrink:0}',
'.oca-editor .oe-title{font-size:14px;font-weight:700;flex:1;line-height:1.2}',
'.oca-editor .oe-state{font-family:-apple-system,"Segoe UI",sans-serif;font-size:11px;opacity:.82;white-space:nowrap}',
'.oca-editor .oe-state.dirty{color:#ffe49a;opacity:1}',
'.oca-editor .oe-bar{display:flex;flex-wrap:wrap;gap:5px;padding:7px 10px;background:rgba(237,246,245,.70);border-bottom:1px solid rgba(169,202,205,.60);align-items:center}',
'.oca-editor .oe-group{display:flex;gap:4px;padding-right:6px;border-right:1px solid rgba(114,153,158,.26)}',
'.oca-editor .oe-group:last-child{padding-right:0;border-right:none}',
'.oca-editor .oe-tool{width:30px;height:30px;padding:0;border:1px solid rgba(114,153,158,.22);border-radius:5px;background:rgba(255,255,255,.32);color:#28515b;cursor:pointer;font-family:-apple-system,"Segoe UI",sans-serif;font-size:13px;font-weight:700;line-height:1;box-sizing:border-box;box-shadow:inset 0 1px 0 rgba(255,255,255,.70)}',
'.oca-editor .oe-tool:hover{background:rgba(222,239,235,.82);border-color:rgba(75,133,140,.50)}',
'.oca-editor .oe-tool.is-active{background:rgba(18,79,91,.92);border-color:rgba(18,79,91,.92);color:#fffaf0;box-shadow:inset 0 1px 0 rgba(255,255,255,.20),inset 0 -2px 0 #d6a954}',
'.oca-editor .oe-tool:focus-visible,.oca-editor .oe-foot button:focus-visible{outline:2px solid #d6a954;outline-offset:2px}',
'.oca-editor .oe-body{min-height:124px;max-height:260px;overflow-y:auto;padding:15px 17px;outline:none;background:rgba(255,255,253,.60);color:#263f47;font-family:Georgia,"Noto Serif SC","Songti SC",serif;font-size:15px;line-height:1.72;white-space:pre-wrap;word-break:break-word}',
'.oca-editor .oe-body:focus{background:rgba(255,255,253,.80)}',
'.oca-editor .oe-body blockquote{margin:8px 0;padding:6px 12px;border-left:3px solid #d7a240;background:rgba(244,234,201,.56);border-radius:0 5px 5px 0;color:#38525b;box-shadow:inset 0 1px 0 rgba(255,255,255,.65)}',
'.oca-editor .oe-body ul,.oca-editor .oe-body ol{padding-left:1.5em;margin:.45em 0}',
'.oca-editor .oe-body a{color:#086ddd;text-decoration:underline}',
'.oca-editor .oe-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:rgba(238,246,244,.68);border-top:1px solid rgba(169,202,205,.60);font-family:-apple-system,"Segoe UI",sans-serif}',
'.oca-editor .oe-caption{font-size:11px;color:#647278;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
'.oca-editor .oe-actions{display:flex;gap:6px;flex-shrink:0}',
'.oca-editor .oe-foot button{border:1px solid transparent;border-radius:5px;padding:6px 13px;cursor:pointer;font-size:12px;font-weight:700;line-height:1}',
'.oca-editor .oe-save{background:rgba(18,79,91,.94);color:#fffaf0;border-color:rgba(18,79,91,.95)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.23),0 2px 6px rgba(12,49,60,.20)}',
'.oca-editor .oe-save:hover{background:rgba(13,63,73,.98)}',
'.oca-editor .oe-cancel{background:rgba(255,255,255,.28)!important;color:#52646b;border-color:rgba(127,158,157,.58)!important}',
'.oca-editor .oe-cancel:hover{background:rgba(225,238,234,.84)}',
 '#oca-trigger{position:fixed;right:24px;bottom:24px;z-index:2147483647;width:42px;height:42px;border-radius:50%;border:1px solid rgba(226,248,250,.82);background:rgba(8,109,221,.86);color:#fff;font-size:19px;cursor:grab;box-shadow:0 10px 24px rgba(2,45,84,.35),inset 0 1px 0 rgba(255,255,255,.52);backdrop-filter:blur(12px) saturate(140%);-webkit-backdrop-filter:blur(12px) saturate(140%);display:none;align-items:center;justify-content:center;touch-action:none;box-sizing:border-box}',
 '#oca-panel{position:fixed;top:80px;right:24px;z-index:2147483646;display:none;flex-direction:column;width:272px;max-width:90vw;max-height:80vh;border-radius:10px;box-shadow:0 18px 54px rgba(9,37,50,.30),inset 0 1px 0 rgba(255,255,255,.56);font-family:-apple-system,"Segoe UI",Roboto,sans-serif;font-size:13px;will-change:transform,opacity;overflow:hidden;isolation:isolate}',
'#oca-panel.light{background:#fff;color:#222}#oca-panel.dark{background:#1e1e1e;color:#e0e0e0}',
 '#oca-panel .ph{padding:.7em .9em;font-weight:700;display:flex;align-items:center;gap:.3em;cursor:grab;user-select:none;flex-shrink:0;border-radius:9px 9px 0 0;box-shadow:inset 0 1px 0 rgba(255,255,255,.32)}',
'#oca-panel .ph .ttl{flex:1;text-align:center;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.68em}',
'#oca-panel .ic{cursor:pointer;padding:.2em .45em;border-radius:.35em;opacity:.75;font-size:1.05em;line-height:1;transition:transform .2s,background .15s,opacity .15s;flex-shrink:0}',
 '#oca-panel .ic:hover{opacity:1;background:rgba(255,255,255,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.20)}',
'#oca-panel .ic.fold.open{transform:rotate(90deg)}',
'#oca-panel.folded{width:40px!important;min-width:40px!important;cursor:move;border-width:3px!important}',
'#oca-panel.folded .ph{padding:4px;justify-content:center;cursor:move;border-radius:7px}',
'#oca-panel.folded .ic.fold{cursor:pointer;font-size:14px;padding:4px}',
 '#oca-panel .pb{padding:.75em .9em;overflow-y:auto;flex:1;background:rgba(255,255,255,.08)}',
'#oca-panel .rsz{position:absolute;right:2px;bottom:2px;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 0 46%,rgba(128,128,128,.7) 46% 56%,transparent 56% 70%,rgba(128,128,128,.7) 70% 80%,transparent 80%);border-radius:2px}',
  '#oca-panel .sec{margin:.6em 0 .45em;opacity:.6;font-size:.85em}',
  '#oca-panel .type-head{display:block;margin:.6em 0 .45em}',
  '#oca-panel .type-head .sec{margin:0}',
  '#oca-panel .type-drag-hint{display:block;margin:0 0 .2em;font-size:.72em;line-height:1.35;opacity:.72;white-space:normal;user-select:none;-webkit-user-select:none}',
'#oca-panel .row{display:flex;gap:.45em;margin:.45em 0}',
'#oca-panel .sl{display:flex;align-items:center;gap:.45em;margin:.4em 0}',
'#oca-panel .sl .lb{min-width:3.2em;font-size:.85em;opacity:.8;flex-shrink:0}',
'#oca-panel .sl input[type=range]{flex:1;min-width:0}',
'#oca-panel .sl .val{min-width:3.4em;text-align:right;font-size:.85em;opacity:.75;flex-shrink:0}',
'#oca-panel .chk{display:flex;align-items:center;gap:.45em;font-size:.92em;cursor:pointer}',
 '#oca-panel .stp{width:1.8em;padding:.15em 0;border:1px solid rgba(128,158,163,.42);border-radius:.4em;background:rgba(255,255,255,.12);color:inherit;cursor:pointer;font-size:.7em;flex-shrink:0;box-shadow:inset 0 1px 0 rgba(255,255,255,.22)}',
'#oca-panel .cpick{display:flex;gap:.6em;flex-wrap:wrap;margin-top:.45em}',
'#oca-panel .cpick .cp{display:flex;flex-direction:column;align-items:center;gap:.2em;font-size:.77em;opacity:.9}',
'#oca-panel .cpick input[type=color]{width:2.9em;height:2em;border:1px solid #8885;border-radius:.4em;padding:0;background:none;cursor:pointer}',
'#oca-panel .tg{display:grid;grid-template-columns:repeat(5,1fr);gap:.4em}',
 '#oca-panel .tb{position:relative;min-width:0;border:1px solid rgba(128,158,163,.18);border-radius:.45em;padding:.4em 0 .2em;text-align:center;cursor:grab;font-size:1.15em;line-height:1.3;box-shadow:inset 0 1px 0 rgba(255,255,255,.16);touch-action:none;transition:transform .18s,box-shadow .18s,opacity .18s}',
  '#oca-panel .tb,#oca-panel .tb *{user-select:none;-webkit-user-select:none}',
  '#oca-panel .tb-main{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
 '#oca-panel .tb-more{position:absolute;top:2px;right:2px;width:17px;height:17px;padding:0;border:0;border-radius:4px;background:rgba(255,255,255,.16);color:inherit;cursor:pointer;font-size:13px;line-height:13px;opacity:.65}',
 '#oca-panel .tb-more:hover{opacity:1;background:rgba(214,169,84,.32)}',
 '#oca-panel .tb-menu{position:absolute;top:22px;right:2px;z-index:5;display:none;min-width:72px;padding:3px;border:1px solid rgba(128,158,163,.45);border-radius:5px;background:rgba(15,42,49,.94);box-shadow:0 8px 22px rgba(0,0,0,.28);backdrop-filter:blur(12px)}',
 '#oca-panel .tb-menu.open{display:block}',
 '#oca-panel .tb-menu button{display:block;width:100%;padding:4px 7px;border:0;border-radius:3px;background:none;color:#fff;text-align:left;cursor:pointer;font-size:11px;white-space:nowrap}',
 '#oca-panel .tb-menu button:hover{background:rgba(214,169,84,.28)}',
   'body.oca-type-moving,body.oca-type-moving *{user-select:none!important;-webkit-user-select:none!important}',
   '.tb.oca-type-dragging{position:fixed!important;z-index:2147483646!important;margin:0!important;opacity:.98!important;cursor:grabbing!important;pointer-events:none!important;transform:scale(1.06) rotate(1deg)!important;box-shadow:0 14px 28px rgba(0,0,0,.30),0 0 0 2px #d6a954!important;transition:none!important}',
  '#oca-panel .tb.oca-type-placeholder{min-height:42px;border:1px dashed rgba(214,169,84,.92);background:rgba(214,169,84,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);cursor:grabbing}',
  '#oca-panel .tb.oca-type-live-shift{animation:oca-type-shift .34s cubic-bezier(.18,1.35,.4,1)}',
  '@keyframes oca-type-shift{0%{transform:scale(.91)}58%{transform:scale(1.035)}100%{transform:scale(1)}}',
  '#oca-panel .type-actions{display:flex;gap:.35em;margin:.5em 0 .2em}',
  '#oca-panel .type-actions[data-type-toolbar]{display:grid;grid-template-columns:repeat(4,minmax(0,1fr))}',
  '#oca-panel .type-actions button{flex:1;min-width:0;padding:.38em .2em;border:1px solid rgba(128,158,163,.38);border-radius:.4em;background:rgba(255,255,255,.10);color:inherit;cursor:pointer;font-size:.78em;white-space:nowrap}',
  '#oca-panel .type-actions[data-type-toolbar] button{white-space:normal;font-size:.72em}',
 '#oca-panel .type-actions button:hover{background:rgba(214,169,84,.22)}#oca-panel .type-actions button:disabled{opacity:.38;cursor:not-allowed}',
 '#oca-type-dialog{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(9,31,38,.24);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}',
 '#oca-type-dialog .td-card{width:min(330px,92vw);padding:16px;border:1px solid rgba(218,246,250,.48);border-radius:10px;background:rgba(245,252,251,.88);color:#243f47;box-shadow:0 20px 60px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.85);font-family:-apple-system,"Segoe UI",sans-serif}',
 '#oca-type-dialog .td-title{font-weight:700;margin-bottom:12px;font-size:15px}',
 '#oca-type-dialog label{display:block;margin:8px 0 4px;font-size:12px;color:#52666c}',
 '#oca-type-dialog input{box-sizing:border-box;width:100%;padding:7px 8px;border:1px solid rgba(91,129,135,.4);border-radius:5px;background:rgba(255,255,255,.72);color:#263f47}',
  '#oca-type-dialog .td-help{margin-top:3px;color:#6a7d83;font-size:11px;line-height:1.45}',
  '#oca-type-dialog .td-emoji-pick{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}',
  '#oca-type-dialog .td-emoji-pick button{width:27px;height:27px;padding:0;border:1px solid rgba(91,129,135,.28);border-radius:5px;background:rgba(255,255,255,.56);cursor:pointer;font-size:15px;line-height:1}',
  '#oca-type-dialog .td-emoji-pick button:hover,#oca-type-dialog .td-emoji-pick button:focus{border-color:#256a79;background:#e5f4f3;outline:0}',
  '#oca-type-dialog .td-preview{display:grid;grid-template-columns:64px minmax(0,1fr);gap:8px;margin-top:12px;font-size:13px}',
  '#oca-type-dialog .td-preview-icon,#oca-type-dialog .td-preview-style{min-height:52px;box-sizing:border-box;border-radius:5px}',
  '#oca-type-dialog .td-preview-icon{display:flex;align-items:center;justify-content:center;border:1px solid rgba(91,129,135,.28);background:rgba(255,255,255,.54);font-size:24px}',
  '#oca-type-dialog .td-preview-style{display:flex;flex-direction:column;justify-content:center;gap:3px;padding:7px 9px;border-left:3px solid #5b8def;border-radius:0 5px 5px 0;background:rgba(91,141,239,.10);overflow:hidden}',
  '#oca-type-dialog .td-preview-style code{font:11px ui-monospace,SFMono-Regular,Consolas,monospace;color:#52666c;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
  '#oca-type-dialog .td-preview-style strong{font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '#oca-type-dialog .td-error{min-height:16px;margin-top:7px;color:#b42318;font-size:11px;line-height:1.35}',
 '#oca-type-dialog .td-actions{display:flex;justify-content:flex-end;gap:7px;margin-top:14px}',
 '#oca-type-dialog .td-actions button{padding:7px 12px;border:1px solid rgba(91,129,135,.4);border-radius:5px;cursor:pointer}',
 '#oca-type-dialog .td-save{background:#124f5b;color:#fffaf0}',
  '@media (prefers-reduced-motion:reduce){.oca-type-jelly,#oca-panel .tb.oca-type-live-shift{animation:none!important}.oca-type-dragging{transition:none!important}}',
 '#oca-panel.light .tb{background:rgba(255,255,255,.34)}#oca-panel.dark .tb{background:rgba(255,255,255,.07)}',
 '#oca-panel .tb small{display:block;font-size:.6em;opacity:.75}#oca-panel .tb.on{border-color:#3b9db0;box-shadow:0 0 0 1px #3b9db0 inset,0 3px 10px rgba(26,123,143,.18)}',
 '#oca-panel .btn{flex:1;padding:.55em .45em;border:1px solid rgba(255,255,255,.22);border-radius:.45em;cursor:pointer;font-size:.92em;font-weight:600;background:rgba(74,99,107,.78);color:#fff;box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 2px 6px rgba(0,0,0,.12)}',
 '#oca-panel .act{background:rgba(8,109,190,.84)}#oca-panel .clr{background:rgba(104,113,118,.78)}',
 '#oca-panel .thb{flex:1;padding:.4em 0;border:1px solid rgba(128,158,163,.42);border-radius:.45em;background:rgba(255,255,255,.10);color:inherit;cursor:pointer;font-size:.85em;box-shadow:inset 0 1px 0 rgba(255,255,255,.16)}',
 '#oca-panel .thb.on{border-color:#3b9db0;background:rgba(47,149,171,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.22)}',
'#oca-panel .st{font-size:.85em;opacity:.65;margin-top:.45em}',
'#oca-panel .hint{font-size:.8em;opacity:.55;margin-top:.6em;line-height:1.55;border-top:1px dashed #8885;padding-top:.5em}',
'#oca-panel .doc{font-size:.82em;line-height:1.6;margin-top:.5em;padding:.6em;border:1px dashed #8885;border-radius:.4em}',
'#oca-panel .doc b{display:block;margin:.4em 0 .2em}',
 '#oca-banner{position:fixed;top:12px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(8,109,190,.84);border:1px solid rgba(218,246,250,.62);color:#fff;padding:9px 18px;border-radius:8px;font:13px sans-serif;box-shadow:0 10px 26px rgba(0,57,90,.28),inset 0 1px 0 rgba(255,255,255,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}',
 '#oca-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:2147483647;background:rgba(17,42,49,.84);border:1px solid rgba(211,237,235,.30);color:#fff;padding:8px 16px;border-radius:8px;font:13px sans-serif;opacity:0;transition:opacity .25s;pointer-events:none;box-shadow:0 10px 26px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.14);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)}',
 '#oca-panel .oca-template-status{margin:.35em 0;padding:.45em .6em;border-radius:.4em;font-size:.78em;line-height:1.4;background:rgba(255,255,255,.10);border:1px solid rgba(128,158,163,.28)}',
 '#oca-panel .oca-template-status.needs{color:#ffd98a;border-color:rgba(214,169,84,.55);background:rgba(214,169,84,.12)}',
 '#oca-panel .oca-template-actions{margin:.3em 0}',
 '#oca-panel .oca-template-actions button{font-size:.76em}',
 '#oca-clipper-dialog{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(7,28,35,.30);backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}',
 '#oca-clipper-dialog .ocd-card{width:min(560px,94vw);max-height:88vh;overflow:auto;padding:18px;border:1px solid rgba(218,246,250,.58);border-radius:14px;background:rgba(242,250,249,.94);color:#243f47;box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(255,255,255,.88);font-family:-apple-system,"Segoe UI",sans-serif}',
 '#oca-clipper-dialog .ocd-title{font-size:17px;font-weight:750;margin-bottom:5px}',
 '#oca-clipper-dialog .ocd-sub{font-size:12px;color:#5d7278;line-height:1.55;margin-bottom:10px}',
 '#oca-clipper-dialog .ocd-code{display:block;width:100%;min-height:74px;box-sizing:border-box;padding:9px;border:1px solid rgba(91,129,135,.38);border-radius:6px;background:#fff;color:#243f47;font:11px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;resize:vertical}',
 '#oca-clipper-dialog .ocd-section{margin:12px 0 5px;font-size:12px;font-weight:700;color:#365861}',
 '#oca-clipper-dialog .ocd-list{margin:0;padding:7px 9px;border:1px solid rgba(91,129,135,.22);border-radius:6px;background:rgba(255,255,255,.56);font:11px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace;word-break:break-word}',
 '#oca-clipper-dialog .ocd-steps{margin:5px 0 0;padding-left:20px;font-size:12px;line-height:1.65}',
 '#oca-clipper-dialog .ocd-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:7px;margin-top:15px}',
 '#oca-clipper-dialog .ocd-actions button{padding:7px 11px;border:1px solid rgba(91,129,135,.42);border-radius:6px;background:rgba(255,255,255,.72);color:#294b54;cursor:pointer;font-size:12px}',
 '#oca-clipper-dialog .ocd-actions .primary{background:#124f5b;color:#fffaf0;border-color:#124f5b}',
 '#oca-clipper-dialog .ocd-close{float:right;border:0;background:none;color:#60777c;font-size:19px;cursor:pointer}',
 '@media (prefers-reduced-motion:reduce){#oca-clipper-dialog *{scroll-behavior:auto}}'];
function applyNoteTypeStyle(noteEl,info){if(!noteEl||!info)return;var color=validColor(info.color);noteEl.setAttribute('data-oca-color',color);noteEl.style.borderLeftColor=color;noteEl.style.background=hexA(color,.10);var title=noteEl.querySelector('.oca-nt');if(title)title.style.color=color}
TYPES.forEach(function(t){C.push('.oca-note[data-type="'+t[0]+'"]{border-left-color:'+t[3]+';background:'+t[3]+'16;box-shadow:inset 0 1px 0 rgba(255,255,255,.48)}.oca-note[data-type="'+t[0]+'"] .oca-nt{color:'+t[3]+'}')});
var st=document.createElement('style');st.textContent=C.join('');document.head.appendChild(st);els.push(st);
function cp(k,lb){return '<span class="cp"><input type="color" value="'+CFG[k]+'" data-k="'+k+'"><small>'+lb+'</small></span>'}
var trig=document.createElement('button');trig.id='oca-trigger';trig.textContent='\uD83D\uDCDD';
 trig.title='Obsidian Web Clipper Callout Annotator';noTr(trig);
trig.style.display='none';
document.body.appendChild(trig);els.push(trig);
var trigDragged=false;
 var DOC_HTML='<div class="doc notranslate" translate="no">'
 +'<b>📝 标注与编辑</b>'
 +'• 选择类型后点击“插入标注”，再点击网页位置放置 Callout。<br>'
 +'• 标注类型支持短点击选择；长按约 180ms 后移动超过 6px，可自由拖动排序。拖动时不会选中文字。<br>'
 +'• 自定义类型最多 5 个，可设置 ID、标签、Emoji 和颜色；右上角菜单可新建、编辑或删除。<br>'
 +'• 拖动排序、创建、编辑、删除、导入和恢复默认均支持撤回与前进，最多保留 20 步。<br>'
 +'• 编辑器支持加粗、斜体、下划线、删除线、列表、引用、撤销和重做；保存后自动同步。<br>'
 +'<b>⚙️ 面板与显示</b>'
 +'• 玻璃开关控制毛玻璃；模糊、透明度、主题和字体控制视觉效果。<br>'
 +'• 贴边模式控制面板吸附；完全贴边隐藏、露出、间距和悬停灵敏度控制收起行为。<br>'
 +'• 面板右下角可调整尺寸；“插入后自动收起面板”减少重复操作。<br>'
 +'• “本次标注刷新后消失”只影响下一条插入的标注，不写入页面恢复记录。<br>'
 +'<b>💾 保存、导入与导出</b>'
 +'• 标注和外观设置保存在本地，刷新页面后自动恢复；临时标注不会恢复。<br>'
 +'• 单条标注可编辑、复制 Markdown 或删除；设置页可复制全部内容或导出 .md。<br>'
 +'• 自定义类型支持 JSON 导入/导出；重复、冲突或非法字段会跳过并报告结果。<br>'
 +'• 恢复默认只恢复内置类型顺序并删除自定义定义，不删除已有页面标注。<br>'
 +'<b>🧩 Web Clipper 模板</b>'
 +'• 模板助手会生成完整过滤模板，覆盖固定类型、当前自定义 ID 和历史 ID；复制后粘贴到 Web Clipper 模板的“自定义笔记内容”。<br>'
 +'• 自定义 ID 只能使用小写字母、数字、- 和 _；改名或删除后，历史 ID 会继续保留在模板中，直到手动清理。<br>'
 +'• 剪藏预览应显示 <code>&gt; [!type] 标签</code>，如果看到 <code>\\[!type\\]</code>，请打开模板助手复制最新模板。<br>'
 +'• 设置页的“模板需要更新”状态不会阻止剪藏，只是提醒复制一次最新模板。</div>';
var panel=document.createElement('div');panel.id='oca-panel';
panel.setAttribute('translate','no');panel.classList.add('notranslate');
panel.innerHTML='<div class="ph">'
 +'<span class="ic gear" title="\u8BBE\u7F6E(\u518D\u70B9\u4E00\u6B21\u8FD4\u56DE)">\u2699</span>'
 +'<span class="ic rfr" title="\u91CD\u7F6E\u5F53\u524D\u5916\u89C2\u8BBE\u7F6E">\u21BB</span>'
 +'<span class="ttl" title="Obsidian Web Clipper Callout Annotator">\uD83D\uDCDD Obsidian Web Clipper Callout Annotator <small>v'+V+'</small></span>'
 +'<span class="ic cls" title="\u5173\u95ED(\u70B9\u5706\u94AE\u91CD\u5F00)">\u2716</span>'
 +'<span class="ic fold open" title="\u6536\u8D77/\u5C55\u5F00">\u25B6</span>'
 +'</div><div class="pb"><div class="mview">'
  +'<div class="type-head"><span class="type-drag-hint">\u957F\u6309\u53EF\u4EE5\u81EA\u7531\u62D6\u52A8</span><div class="sec">\u6807\u6CE8\u7C7B\u578B</div></div>'
 +'<div class="tg">'+typeGridHTML()+'</div>'
  +'<div class="type-actions" data-type-toolbar="1"><button type="button" data-type-action="create">\uFF0B \u65B0\u5EFA</button><button type="button" data-type-action="undo" title="\u64A4\u56DE\u7C7B\u578B\u7BA1\u7406\u64CD\u4F5C">\u21A9 \u64A4\u56DE</button><button type="button" data-type-action="redo" title="\u524D\u8FDB\u7C7B\u578B\u7BA1\u7406\u64CD\u4F5C">\u21AA \u524D\u8FDB</button><button type="button" data-type-action="reset">\u21BB \u6062\u590D\u9ED8\u8BA4</button></div>'
 +'<div class="type-actions"><button type="button" data-type-action="export">\uD83D\uDCE4 \u5BFC\u51FA\u81EA\u5B9A\u4E49</button><button type="button" data-type-action="import">\uD83D\uDCE5 \u5BFC\u5165\u81EA\u5B9A\u4E49</button></div><input id="oca-type-file" type="file" accept="application/json,.json" style="display:none">'
 +'<div class="sl"><label class="chk"><input type="checkbox" data-k="autoFold"'+(CFG.autoFold?' checked':'')+'>\u63D2\u5165\u540E\u81EA\u52A8\u6536\u8D77\u9762\u677F</label></div>'
 +'<div class="sl"><label class="chk"><input type="checkbox" data-k="transient"'+(CFG.transient?' checked':'')+'>\u672C\u6B21\u6807\u6CE8\u5237\u65B0\u540E\u6D88\u5931</label></div>'
 +'<div class="row"><button class="btn act">\u270F\uFE0F \u63D2\u5165\u6807\u6CE8</button><button class="btn clr">\uD83D\uDDD1\uFE0F \u6E05\u7A7A\u672C\u9875</button></div>'
 +'<div class="st">\u5DF2\u4FDD\u5B58 0 \u6761\u6807\u6CE8 \u00B7 \u81EA\u52A8\u540C\u6B65\u4E2D</div>'
  +'<div class="hint">\uD83D\uDCA1 \u957F\u6309\u6807\u6CE8\u7C7B\u578B\u53EF\u81EA\u7531\u79FB\u52A8\uFF0C\u79FB\u52A8\u65F6\u4E0D\u4F1A\u9009\u4E2D\u7F51\u9875\u6587\u5B57\u3002<br>\u60AC\u505C\u6807\u6CE8\uFF1A\u270E \u7F16\u8F91 / \uD83D\uDCCB \u590D\u5236 / \u00D7 \u5220\u9664\u3002<br>\uD83D\uDCBE \u81EA\u52A8\u5B58\u672C\u5730\uFF0C\u5237\u65B0\u540E\u81EA\u52A8\u6062\u590D\u3002</div>'
 +'</div><div class="gview" style="display:none">'
 +'<div class="row"><button class="btn" data-g="back">\u2B05 \u8FD4\u56DE\u6807\u6CE8</button></div>'
 +'<div class="sec">\u6BDB\u73BB\u7483</div>'
 +'<div class="sl"><label class="chk"><input type="checkbox" data-k="glass"'+(CFG.glass?' checked':'')+'>\u6A21\u7CCA\u603B\u5F00\u5173</label></div>'
 +'<div class="sl"><span class="lb">\u6A21\u7CCA</span><input type="range" min="0" max="30" step="1" value="'+CFG.blur+'" data-k="blur"><span class="val" data-v="blur">'+CFG.blur+'px</span></div>'
 +'<div class="sl"><span class="lb">\u900F\u660E\u5EA6</span><input type="range" min="20" max="100" step="1" value="'+CFG.op+'" data-k="op"><span class="val" data-v="op">'+CFG.op+'%</span></div>'
 +'<div class="sec">\u989C\u8272\u4E3B\u9898</div>'
 +'<div class="row"><button class="thb" data-thm="dark">\u6DF1\u8272</button><button class="thb" data-thm="light">\u6D45\u8272</button><button class="thb" data-thm="custom">\u81EA\u5B9A\u4E49</button></div>'
 +'<div id="oca-cwrap" class="cpick">'+cp('cbg','\u80CC\u666F')+cp('ctxt','\u6587\u5B57')+cp('cbdr','\u8FB9\u6846')+cp('chead','\u6807\u9898\u680F')+'</div>'
 +'<div class="sec">\u6807\u6CE8\u5B57\u4F53</div>'
 +'<div class="row"><button class="thb" data-nf="web">\u9002\u914D\u7F51\u9875</button><button class="thb" data-nf="custom">\u81EA\u5B9A\u4E49</button></div>'
 +'<div id="oca-nfwrap" class="sl"><span class="lb">Aa</span><input type="range" min="12" max="24" step="1" value="'+CFG.noteSize+'" data-k="noteSize"><span class="val" data-v="noteSize">'+CFG.noteSize+'px</span></div>'
 +'<div class="sec">\u9762\u677F\u5B57\u4F53</div>'
 +'<div class="row"><button class="thb" data-fm="default">\u9ED8\u8BA4</button><button class="thb" data-fm="custom">\u81EA\u5B9A\u4E49</button></div>'
 +'<div id="oca-fwrap" class="sl"><span class="lb">Aa</span><input type="range" min="10" max="22" step="1" value="'+CFG.fsize+'" data-k="fsize"><span class="val" data-v="fsize">'+CFG.fsize+'px</span></div>'
 +'<div class="sec">\u5706\u94AE\u5927\u5C0F</div>'
 +'<div class="row"><button class="thb" data-bm="default">\u9ED8\u8BA4</button><button class="thb" data-bm="custom">\u81EA\u5B9A\u4E49</button></div>'
 +'<div id="oca-bwrap" class="sl"><span class="lb">\u2B24</span><input type="range" min="28" max="72" step="1" value="'+CFG.bsize+'" data-k="bsize"><span class="val" data-v="bsize">'+CFG.bsize+'px</span></div>'
 +'<div class="sec">\u754C\u9762\u4F4D\u7F6E</div>'
 +'<div class="row"><button class="thb" data-pos="snap">\u8D34\u8FB9</button><button class="thb" data-pos="free">\u81EA\u7531</button></div>'
 +'<div id="oca-gwrap">'
 +'<div class="sl"><label class="chk"><input type="checkbox" data-k="full"'+(CFG.full?' checked':'')+'>\u5B8C\u5168\u8D34\u8FB9\u9690\u85CF</label></div>'
 +'<div id="oca-pwrap">'
 +'<div class="sl"><span class="lb">\u9732\u51FA</span><button class="stp" data-pk="-1">\u25C0</button><button class="stp" data-pk="1">\u25B6</button><input type="range" min="30" max="200" step="1" value="'+CFG.peek+'" data-k="peek"><span class="val" data-v="peek">'+CFG.peek+'px</span></div>'
 +'<div class="sec">\u60AC\u505C\u7075\u654F\u5EA6</div>'
 +'<div class="row"><button class="thb" data-sn="1">1</button><button class="thb" data-sn="2">2</button><button class="thb" data-sn="3">3</button><button class="thb" data-sn="4">4</button><button class="thb" data-sn="5">5</button></div>'
 +'</div>'
 +'<div class="sl"><span class="lb">\u95F4\u8DDD</span><button class="stp" data-st="-1">\u25C0</button><button class="stp" data-st="1">\u25B6</button><input type="range" min="0" max="200" step="1" value="'+CFG.gap+'" data-k="gap"><span class="val" data-v="gap">'+CFG.gap+'px</span></div></div>'
 +'<div class="sec">\u5237\u65B0\u6301\u4E45\u5316</div>'
 +'<div class="sl"><label class="chk"><input type="checkbox" data-k="saveCfg"'+(CFG.saveCfg?' checked':'')+'>\u5237\u65B0\u540E\u4FDD\u5B58\u8BBE\u7F6E(\u6807\u6CE8\u6C38\u8FDC\u4FDD\u5B58)</label></div>'
 +'<div class="sec">Web Clipper \u6A21\u677F</div>'
 +'<div class="oca-template-status" data-template-status></div>'
 +'<div class="row oca-template-actions"><button class="btn" data-template-action="open">\uD83E\uDDE9 \u6253\u5F00\u6A21\u677F\u52A9\u624B</button><button class="btn" data-template-action="copy">\uD83D\uDCCB \u590D\u5236\u8FC7\u6EE4\u6A21\u677F</button></div>'
 +'<div class="row oca-template-actions"><button class="btn clr" data-template-action="clean-history">\uD83E\uDDF9 \u6E05\u7406\u5386\u53F2 ID</button></div>'
 +'<div class="sec">\u5168\u5C40\u64CD\u4F5C</div>'
 +'<div class="row"><button class="btn act" data-g="export">\uD83D\uDCC2 \u5BFC\u51FA\u6807\u6CE8MD</button></div>'
 +'<div class="row"><button class="btn" data-g="copyall">\uD83D\uDCCB \u590D\u5236\u5168\u90E8\u6807\u6CE8</button></div>'
 +'<div class="row"><button class="btn clr" data-g="reset">\u21BB \u91CD\u7F6E\u5168\u90E8\u8BBE\u7F6E</button></div>'
 +'<div class="row"><button class="btn" data-g="doc">\uD83D\uDCD6 \u529F\u80FD\u8BF4\u660E</button></div>'
 +'<div id="oca-doc" style="display:none">'+DOC_HTML+'</div>'
 +'<div class="hint">\u6CE8\uFF1A\u91CD\u7F6E\u4EC5\u5F71\u54CD\u5916\u89C2\u4E0E\u754C\u9762\u8BBE\u7F6E\uFF0C\u4E0D\u4F1A\u5220\u9664\u6807\u6CE8\u5185\u5BB9\u3002</div>'
 +'</div></div></div><div class="rsz"></div>';
document.body.appendChild(panel);els.push(panel);
function templateState(){var sig=templateSignature(),ack=onboarding&&Number(onboarding.guideVersion||0)===GUIDE_VERSION&&onboarding.acknowledgedSignature===sig,delayed=onboarding&&onboarding.snoozedSignature===sig&&Number(onboarding.snoozedUntil||0)>Date.now();return{sig:sig,ack:!!ack,delayed:!!delayed,needs:!ack,auto:!!(!ack&&!delayed&&!(onboarding&&onboarding.autoDisabled))}}
function updateTemplateStatus(){if(!panel)return;var el=panel.querySelector('[data-template-status]');if(!el)return;var st=templateState();el.classList.toggle('needs',st.needs);el.textContent=st.needs?'⚠️ 模板需要更新 · '+clipperIds().length+' 个 ID':'✅ 已同步 · '+clipperIds().length+' 个 ID'}
function customIdListHTML(){var active=customTypes.map(function(t){return t.id+' · '+t.label}),activeSet={};customTypes.forEach(function(t){activeSet[t.id]=1});var retired=knownCustomIds.filter(function(id){return !activeSet[id]});return '<div class="ocd-section">固定 15 个类型</div><div class="ocd-list">'+escHTML(builtinIds().join('、'))+'</div><div class="ocd-section">当前自定义 ID</div><div class="ocd-list">'+escHTML(active.length?active.join('、'):'（无）')+'</div><div class="ocd-section">历史 ID（用于旧 Callout）</div><div class="ocd-list">'+escHTML(retired.length?retired.join('、'):'（无）')+'</div>'}
function closeClipperAssistant(){var modal=q('#oca-clipper-dialog');if(modal){modal.remove();els=els.filter(function(x){return x!==modal})}}
function openClipperAssistant(auto){closeClipperAssistant();var modal=document.createElement('div');modal.id='oca-clipper-dialog';noTr(modal);modal.innerHTML='<div class="ocd-card" role="dialog" aria-modal="true" aria-labelledby="oca-clipper-title"><button type="button" class="ocd-close" aria-label="关闭">×</button><div id="oca-clipper-title" class="ocd-title">🧩 Web Clipper 模板助手</div><div class="ocd-sub">'+(auto?'首次使用提示：复制下面的完整过滤模板，避免 [!type] 被 Web Clipper 转义。':'复制最新模板并粘贴到你的 Web Clipper 模板。')+'</div><textarea class="ocd-code" readonly spellcheck="false"></textarea>'+customIdListHTML()+'<div class="ocd-section">使用步骤</div><ol class="ocd-steps"><li>打开 Obsidian Web Clipper 设置。</li><li>在“新建模板”下选择或创建自己的模板。</li><li>在“自定义笔记内容”中，用“变量预填充页面数据”加入下面的模板。</li><li>剪藏前确认预览显示 <code>&gt; [!type] 标签</code>，而不是 <code>&gt; \\[!type\\] 标签</code>。</li></ol><div class="ocd-actions"><button type="button" data-clipper-action="copy" class="primary">📋 复制模板</button><button type="button" data-clipper-action="done">我已完成配置</button><button type="button" data-clipper-action="snooze">7 天后提醒</button><button type="button" data-clipper-action="disable">不再自动弹出</button></div></div>';
 document.body.appendChild(modal);els.push(modal);modal.querySelector('.ocd-code').value=buildClipperTemplate();
 function closeOnly(){closeClipperAssistant()}
 function copy(){copyText(buildClipperTemplate());toast('📋 已复制完整过滤模板')}
 function ack(){onboarding.guideVersion=GUIDE_VERSION;onboarding.acknowledgedSignature=templateSignature();onboarding.snoozedSignature='';onboarding.snoozedUntil=0;saveOnboarding();updateTemplateStatus();toast('✅ 已确认当前模板');closeOnly()}
 function snooze(){onboarding.snoozedSignature=templateSignature();onboarding.snoozedUntil=Date.now()+7*24*60*60*1000;saveOnboarding();closeOnly()}
 function disable(){onboarding.autoDisabled=true;saveOnboarding();toast('🔕 已关闭自动提醒，可在设置页手动打开模板助手');closeOnly()}
 modal.addEventListener('click',function(e){if(e.target===modal||e.target.closest('.ocd-close')){snooze();return}var b=e.target.closest('[data-clipper-action]');if(!b)return;var a=b.getAttribute('data-clipper-action');if(a==='copy')copy();else if(a==='done')ack();else if(a==='snooze')snooze();else if(a==='disable')disable()});modal.addEventListener('keydown',function(e){if(e.key==='Escape'){e.preventDefault();snooze()}});modal.querySelector('.ocd-code').focus()}
function maybeOpenClipperAssistant(){var top=true;try{top=window.top===window.self}catch(e){top=false}if(!top)return;var st=templateState();if(st.auto)setTimeout(function(){if(!q('#oca-clipper-dialog'))openClipperAssistant(true)},650)}
updateTemplateStatus();
function closeTypeMenus(){panel.querySelectorAll('.tb-menu.open').forEach(function(m){m.classList.remove('open')})}
function nextTypeId(){var id;do{id='oca-custom-'+nextCustomId++;}while(typeById(id));return id}
function typeDialog(existingId){
 var old=existingId&&customTypes.filter(function(t){return t.id===existingId})[0];
 if(!old&&customTypes.length>=MAX_CUSTOM){toast('\u26A0\uFE0F \u6700\u591A\u53EF\u6DFB\u52A0 '+MAX_CUSTOM+' \u4E2A\u81EA\u5B9A\u4E49\u6807\u6CE8');return}
 var modal=document.createElement('div');modal.id='oca-type-dialog';noTr(modal);
 var title=old?'\u7F16\u8F91\u81EA\u5B9A\u4E49\u6807\u6CE8':'\u65B0\u5EFA\u81EA\u5B9A\u4E49\u6807\u6CE8';
 var emojiButtons=EMOJI_PRESETS.map(function(emoji){return '<button type="button" data-emoji="'+escHTML(emoji)+'" title="'+escHTML(emoji)+'">'+escHTML(emoji)+'</button>'}).join('');
 modal.innerHTML='<div class="td-card" role="dialog" aria-modal="true"><div class="td-title">'+title+'</div>'
  +'<label>Callout \u7C7B\u578B ID</label><input class="td-id" maxlength="40" autocapitalize="off" spellcheck="false" value="'+escHTML(old?old.id:'')+'" placeholder="my-focus">'
  +'<div class="td-help">\u8F93\u5165 [! ] \u5185\u7684 ID\uFF0C\u53EA\u5141\u8BB8\u5B57\u6BCD\u3001\u6570\u5B57\u3001- \u548C _\u3002</div>'
  +'<label>\u6807\u7B7E</label><input class="td-label" maxlength="80" value="'+escHTML(old?old.label:'')+'" placeholder="\u4F8B\u5982\uFF1A\u91CD\u70B9">'
  +'<label>Emoji / \u56FE\u6807</label><input class="td-icon" maxlength="8" value="'+escHTML(old?old.icon:'\u2728')+'" placeholder="\u2728">'
  +'<div class="td-emoji-pick" aria-label="Emoji \u5FEB\u9009">'+emojiButtons+'</div>'
  +'<label>\u989C\u8272</label><input class="td-color" type="color" value="'+escHTML(old?old.color:'#5b8def')+'">'
  +'<div class="td-preview"><div class="td-preview-icon"></div><div class="td-preview-style"><code></code><strong></strong></div></div><div class="td-error" aria-live="polite"></div><div class="td-actions"><button type="button" class="td-cancel">\u53D6\u6D88</button><button type="button" class="td-save">\u4FDD\u5B58</button></div></div>';
 document.body.appendChild(modal);
 var idField=modal.querySelector('.td-id'),label=modal.querySelector('.td-label'),icon=modal.querySelector('.td-icon'),color=modal.querySelector('.td-color'),iconPreview=modal.querySelector('.td-preview-icon'),stylePreview=modal.querySelector('.td-preview-style'),error=modal.querySelector('.td-error');
 function normalizedId(){return String(idField.value||'').trim().toLowerCase()}
 function refresh(){var text=label.value.trim()||'\u81EA\u5B9A\u4E49\u6807\u6CE8',ico=icon.value||'\u2728',id=normalizedId()||'xxxxx',col=validColor(color.value);iconPreview.textContent=ico;stylePreview.style.borderLeftColor=col;stylePreview.style.background=hexA(col,.12);stylePreview.querySelector('code').textContent='[!'+id+']';stylePreview.querySelector('strong').textContent=text}
 function setError(msg){error.textContent=msg||''}
 function close(){modal.remove()}
 [idField,label,icon,color].forEach(function(field){field.addEventListener('input',function(){setError('');refresh()})});
 modal.querySelector('.td-emoji-pick').addEventListener('click',function(e){var b=e.target.closest('[data-emoji]');if(!b)return;icon.value=b.getAttribute('data-emoji');setError('');refresh();icon.focus()});
 refresh();idField.focus();
 modal.querySelector('.td-cancel').addEventListener('click',close);
 modal.addEventListener('click',function(e){if(e.target===modal)close()});
 modal.querySelector('.td-save').addEventListener('click',function(){
  var id=normalizedId(),text=label.value.trim(),ico=icon.value.trim()||'\u2728',col=validColor(color.value);
  if(!validTypeId(id)){setError('ID \u9700\u4E3A 1-40 \u4F4D\u82F1\u6587\u5B57\u6BCD\u3001\u6570\u5B57\u3001- \u6216 _\u3002');idField.focus();return}
  if(builtinIds().indexOf(id)>=0||customTypes.some(function(t){return t.id===id&&t!==old})){setError('ID \u5DF2\u88AB\u5185\u7F6E\u6216\u81EA\u5B9A\u4E49\u6807\u6CE8\u4F7F\u7528\u3002');idField.focus();return}
  if(!text){setError('\u6807\u7B7E\u4E0D\u80FD\u4E3A\u7A7A\u3002');label.focus();return}
  pushTypeHistory();
  if(old){var oldId=old.id;old.id=id;old.label=text;old.icon=ico;old.color=col;if(oldId!==id){typeOrder=typeOrder.map(function(savedId){return savedId===oldId?id:savedId});if(curType===oldId)curType=id}toast('\u2705 \u5DF2\u4FDD\u5B58\u81EA\u5B9A\u4E49\u6807\u6CE8')}
  else{customTypes.push({id:id,label:text,icon:ico,color:col});typeOrder.push(id);curType=id;toast('\u2705 \u5DF2\u65B0\u5EFA\u81EA\u5B9A\u4E49\u6807\u6CE8')}
  normalizeTypeState();rebuildTM();saveTypeState();renderTypeGrid();close()});
}
function deleteCustomType(id){var found=customTypes.filter(function(t){return t.id===id})[0];if(!found)return;if(!confirm('\u5220\u9664\u300C'+found.label+'\u300D\u3002\u5DF2\u63D2\u5165\u7684\u6807\u6CE8\u4F1A\u4FDD\u7559\uFF1A\u786E\u8BA4\u7EE7\u7EED\uFF1F'))return;pushTypeHistory();customTypes=customTypes.filter(function(t){return t.id!==id});typeOrder=typeOrder.filter(function(x){return x!==id});if(curType===id)curType='note';normalizeTypeState();rebuildTM();saveTypeState();renderTypeGrid();toast('\u5DF2\u5220\u9664\u81EA\u5B9A\u4E49\u6807\u6CE8')}
function resetTypes(){if(!confirm('\u6062\u590D\u9ED8\u8BA4\u6392\u5E8F\u5E76\u5220\u9664\u5168\u90E8\u81EA\u5B9A\u4E49\u6807\u6CE8\u5B9A\u4E49\uFF1F\u5DF2\u63D2\u5165\u7684\u6807\u6CE8\u4E0D\u4F1A\u88AB\u5220\u9664\u3002'))return;pushTypeHistory();customTypes=[];typeOrder=builtinIds();if(!typeById(curType))curType='note';normalizeTypeState();rebuildTM();saveTypeState();renderTypeGrid();toast('\u21BB \u5DF2\u6062\u590D\u9ED8\u8BA4\u6807\u6CE8\u7C7B\u578B')}
function exportCustomTypes(){
 var payload={schema:'oca-custom-callouts',version:3,customTypes:cloneJSON(customTypes),order:typeOrder.filter(function(id){return isCustomType(id)}),nextId:nextCustomId,knownCustomIds:knownCustomIds.slice()};
 var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='oca-custom-callouts.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},500);toast('\uD83D\uDCE4 \u5DF2\u5BFC\u51FA '+customTypes.length+' \u4E2A\u81EA\u5B9A\u4E49\u6807\u6CE8')}
function importCustomTypes(raw){
 if(!raw||raw.schema!=='oca-custom-callouts'||(raw.version!==1&&raw.version!==2&&raw.version!==3)||!Array.isArray(raw.customTypes)){toast('\u26A0\uFE0F \u5BFC\u5165\u6587\u4EF6\u683C\u5F0F\u65E0\u6548\uFF08\u5931\u8D25 1 \u4E2A\uFF09');return}
 var existing={},incoming={},accepted=[],importedKnown=[],skipped=0,failed=0;customTypes.forEach(function(t){existing[t.id]=1});
 (raw.knownCustomIds||[]).forEach(function(id){id=String(id||'').trim().toLowerCase();if(validTypeId(id)&&builtinIds().indexOf(id)<0&&importedKnown.indexOf(id)<0)importedKnown.push(id)});
 raw.customTypes.forEach(function(t){var id=String(t&&t.id||'').trim().toLowerCase(),label=String(t&&t.label||'').trim(),rawColor=String(t&&t.color||''),rawIcon=String(t&&t.icon||'\u2728');if(!validTypeId(id)||!label||label.length>80||!/^#[0-9a-f]{6}$/i.test(rawColor)||rawIcon.length>8){failed++;return}if(builtinIds().indexOf(id)>=0||existing[id]||incoming[id]||accepted.length+customTypes.length>=MAX_CUSTOM){skipped++;if(validTypeId(id))importedKnown.push(id);return}incoming[id]=1;accepted.push({id:id,label:label.slice(0,80),icon:rawIcon,color:validColor(rawColor)});importedKnown.push(id)});
 if(!accepted.length&&!importedKnown.length){toast('\u26A0\uFE0F \u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u81EA\u5B9A\u4E49\u6807\u6CE8\uFF0C\u8DF3\u8FC7 '+skipped+' \u4E2A\uFF0C\u5931\u8D25 '+failed+' \u4E2A');return}
 pushTypeHistory();customTypes=customTypes.concat(accepted);accepted.forEach(function(t){typeOrder.push(t.id)});importedKnown.forEach(rememberKnownId);normalizeTypeState();rebuildTM();saveTypeState();renderTypeGrid();toast('\uD83D\uDCE5 \u5DF2\u5BFC\u5165 '+accepted.length+' \u4E2A\uFF0C\u8DF3\u8FC7 '+skipped+' \u4E2A\uFF0C\u5931\u8D25 '+failed+' \u4E2A')}
function cleanRetiredIds(){var active={};customTypes.forEach(function(t){active[t.id]=1});var retired=knownCustomIds.filter(function(id){return !active[id]});if(!retired.length){toast('\u2139\uFE0F \u6CA1\u6709\u53EF\u6E05\u7406\u7684\u5386\u53F2 ID');return}if(!confirm('\u6E05\u7406 '+retired.length+' \u4E2A\u5DF2\u5220\u9664\u6216\u6539\u540D\u7684 ID\uFF1F\u6E05\u7406\u540E\u65E7 Callout \u53EF\u80FD\u65E0\u6CD5\u901A\u8FC7\u6A21\u677F\u8FD8\u539F\u3002'))return;pushTypeHistory();knownCustomIds=knownCustomIds.filter(function(id){return !!active[id]});saveTypeState();updateTemplateStatus();toast('\u2705 \u5DF2\u6E05\u7406\u5386\u53F2 ID\uFF0C\u8BF7\u590D\u5236\u65B0\u6A21\u677F')}
function initTypeDrag(){
 var grid=panel.querySelector('.tg');
 var clearingSelection=false;
  var raf=window.requestAnimationFrame||function(fn){return setTimeout(fn,16)};
  var caf=window.cancelAnimationFrame||function(id){clearTimeout(id)};
  var reflowFrame=0,reflowTimer=0,reflowTiles=[];
  var PRESS_TOLERANCE=7,DRAG_THRESHOLD=6,DRAG_HYSTERESIS=12;
 function clearNativeSelection(){if(clearingSelection)return;try{var s=window.getSelection&&window.getSelection();if(s&&s.rangeCount){clearingSelection=true;s.removeAllRanges();clearingSelection=false}}catch(_){clearingSelection=false}}
 function setSelectionGuard(enabled){var rootEl=document.documentElement,bodyEl=document.body;if(rootEl)rootEl.classList.toggle('oca-type-moving',!!enabled);if(bodyEl)bodyEl.classList.toggle('oca-type-moving',!!enabled);if(enabled)clearNativeSelection()}
 function reducedMotion(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches)}
 function tileOrder(){return Array.prototype.slice.call(grid.querySelectorAll('.tb[data-t]')).map(function(tile){return tile.getAttribute('data-t')})}
 function dragRects(){return Array.prototype.slice.call(grid.querySelectorAll('.tb[data-t]')).map(function(tile){return{tile:tile,rect:tile.getBoundingClientRect()}})}
 function clearReflow(){if(reflowFrame){caf(reflowFrame);reflowFrame=0}if(reflowTimer){clearTimeout(reflowTimer);reflowTimer=0}reflowTiles.forEach(function(tile){if(tile){tile.style.transition='';tile.style.transform=''}});reflowTiles=[]}
 function animateReflow(before){if(reducedMotion()){clearReflow();return}clearReflow();var after=dragRects(),moved=[];after.forEach(function(now){for(var i=0;i<before.length;i++)if(before[i].tile===now.tile){var dx=before[i].rect.left-now.rect.left,dy=before[i].rect.top-now.rect.top;if(dx||dy){now.tile.style.transition='none';now.tile.style.transform='translate('+dx+'px,'+dy+'px)';moved.push(now.tile)}break}});if(!moved.length)return;reflowTiles=moved;void grid.offsetWidth;reflowFrame=raf(function(){reflowFrame=0;moved.forEach(function(tile){tile.style.transition='transform .22s cubic-bezier(.22,.8,.32,1)';tile.style.transform=''}) ;reflowTimer=setTimeout(function(){reflowTimer=0;reflowTiles.forEach(function(tile){if(tile){tile.style.transition='';tile.style.transform=''}});reflowTiles=[]},260)})}
 function clearDraggedTile(tile){tile.classList.remove('oca-type-dragging');tile.style.position='';tile.style.left='';tile.style.top='';tile.style.width='';tile.style.height='';tile.style.zIndex='';tile.style.transform='';tile.style.transition='';tile.style.pointerEvents=''}
 function moveDraggedTile(d,e){d.tile.style.left=Math.round(e.clientX-d.offsetX)+'px';d.tile.style.top=Math.round(e.clientY-d.offsetY)+'px'}
  function beginTypeDrag(d,e){if(!typeDrag||typeDrag!==d||d.active)return;clearTimeout(d.timer);d.active=true;setSelectionGuard(true);var rect=d.tile.getBoundingClientRect();d.dragOriginRect=rectCopy(rect);d.justStarted=true;d.placeholder=document.createElement('div');d.placeholder.className='tb oca-type-placeholder';d.placeholder.setAttribute('aria-hidden','true');d.placeholder.style.width=rect.width+'px';d.placeholder.style.height=rect.height+'px';d.grid.insertBefore(d.placeholder,d.tile);d.offsetX=Math.max(0,Math.min(rect.width,e.clientX-rect.left));d.offsetY=Math.max(0,Math.min(rect.height,e.clientY-rect.top));d.tile.classList.add('oca-type-dragging');d.tile.style.width=rect.width+'px';d.tile.style.height=rect.height+'px';d.tile.style.position='fixed';document.body.appendChild(d.tile);d.lockTarget=null;d.lockRect=null;d.lockSide=null;d.lockAxis=null;d.slotIndex=Array.prototype.indexOf.call(d.grid.children,d.placeholder);moveDraggedTile(d,e);try{d.tile.setPointerCapture(d.pointerId)}catch(_){};e.preventDefault()}
 function restoreDraggedTile(d,origin){if(!d.active)return;clearTimeout(d.timer);if(d.moveFrame){caf(d.moveFrame);d.moveFrame=0}d.latestEvent=null;clearReflow();var placeholder=d.placeholder;if(origin){if(d.originNext&&d.originNext.parentNode===d.grid)d.grid.insertBefore(placeholder,d.originNext);else d.grid.appendChild(placeholder)}d.grid.insertBefore(d.tile,placeholder);placeholder.remove();clearDraggedTile(d.tile);setSelectionGuard(false)}
 function cancelTypeDrag(showMessage){var d=typeDrag;if(!d){setSelectionGuard(false);return}clearTimeout(d.timer);if(d.active){restoreDraggedTile(d,true);typeDragSuppressUntil=Date.now()+220;if(showMessage)toast('\u21A9 \u5DF2\u53D6\u6D88\u7C7B\u578B\u6392\u5E8F')}else setSelectionGuard(false);typeDrag=null}
 function dragTiles(d){return Array.prototype.slice.call(d.grid.querySelectorAll('.tb[data-t]')).filter(function(tile){return tile!==d.tile})}
  function rectDistance(x,y,r){var dx=x<r.left?r.left-x:x>r.right?x-r.right:0,dy=y<r.top?r.top-y:y>r.bottom?y-r.bottom:0;return Math.sqrt(dx*dx+dy*dy)}
  function rectCopy(r){return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
  function inRect(x,y,r,pad){return x>=r.left-pad&&x<=r.right+pad&&y>=r.top-pad&&y<=r.bottom+pad}
  function nearestDragTile(d,e){var candidates=dragTiles(d),best=null,bestDistance=Infinity;for(var i=0;i<candidates.length;i++){var r=candidates[i].getBoundingClientRect(),distance=rectDistance(e.clientX,e.clientY,r);if(distance<bestDistance){bestDistance=distance;best=candidates[i]}}return best}
  function chooseDragTarget(d,e){var candidates=dragTiles(d),locked=d.lockTarget&&d.lockTarget.parentNode===d.grid&&d.lockTarget!==d.tile,lockNow=locked?d.lockTarget.getBoundingClientRect():null,lockPad=locked?Math.max(DRAG_HYSTERESIS,Math.min(24,Math.min(lockNow.width,lockNow.height)*.34)):0;if(locked&&((d.lockRect&&inRect(e.clientX,e.clientY,d.lockRect,lockPad))||inRect(e.clientX,e.clientY,lockNow,lockPad)))return d.lockTarget;var hit=document.elementFromPoint?document.elementFromPoint(e.clientX,e.clientY):null,target=hit&&hit.closest&&hit.closest('.tb[data-t]');if(!target||candidates.indexOf(target)<0)target=nearestDragTile(d,e);if(locked&&target&&target!==d.lockTarget){var lockedRect=d.lockTarget.getBoundingClientRect(),targetRect=target.getBoundingClientRect(),lockedDistance=rectDistance(e.clientX,e.clientY,lockedRect),targetDistance=rectDistance(e.clientX,e.clientY,targetRect),pad=Math.max(DRAG_HYSTERESIS,Math.min(28,Math.min(lockedRect.width,lockedRect.height)*.3));if(lockedDistance<=targetDistance+pad)target=d.lockTarget}return target}
 function dragSide(d,target,e){var r=target.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,horizontal=Math.abs(dx)/(r.width||1)>=Math.abs(dy)/(r.height||1),coord=horizontal?e.clientX:e.clientY,center=horizontal?cx:cy,half=(horizontal?r.width:r.height)/2,dead=Math.min(DRAG_HYSTERESIS,Math.max(6,half*.22));if(d.lockTarget===target&&d.lockSide){if(d.lockAxis===horizontal){if(d.lockSide==='before'&&coord>center+dead)d.lockSide='after';else if(d.lockSide==='after'&&coord<center-dead)d.lockSide='before';return d.lockSide} }d.lockAxis=horizontal;return coord<=center?'before':'after'}
 function placeDragPlaceholder(d,desired){var items=dragTiles(d);desired=Math.max(0,Math.min(items.length,desired));var ref=items[desired]||null,already=ref?d.placeholder.nextSibling===ref: d.placeholder===d.grid.lastElementChild;if(already){d.slotIndex=desired;return}var previous=dragRects();d.grid.insertBefore(d.placeholder,ref);d.slotIndex=desired;animateReflow(previous)}
  function updateDragSlot(d,e){var gr=d.grid.getBoundingClientRect();d.outside=e.clientX<gr.left||e.clientX>gr.right||e.clientY<gr.top||e.clientY>gr.bottom;if(d.outside)return;var target=chooseDragTarget(d,e);if(!target||target.parentNode!==d.grid)return;if(d.lockTarget!==target){d.lockTarget=target;d.lockRect=rectCopy(target.getBoundingClientRect());d.lockSide=null;d.lockAxis=null}var side=dragSide(d,target,e),items=dragTiles(d),targetIndex=items.indexOf(target);if(targetIndex<0)return;placeDragPlaceholder(d,targetIndex+(side==='after'?1:0))}
 function finishTypeDrag(d){if(d.outside){cancelTypeDrag(true);return}restoreDraggedTile(d,false);typeDrag=null;var order=tileOrder();if(order.join('|')===typeOrder.join('|'))return;pushTypeHistory();typeOrder=order;normalizeTypeState();saveTypeState();syncTypeTiles();updateTypeActions();typeDragSuppressUntil=Date.now()+220;if(!reducedMotion()){d.tile.classList.add('oca-type-jelly');setTimeout(function(){if(d.tile)d.tile.classList.remove('oca-type-jelly')},500)}toast('\u2728 \u6807\u6CE8\u7C7B\u578B\u987A\u5E8F\u5DF2\u4FDD\u5B58')}
 cancelTypeDragFn=cancelTypeDrag;
 on(grid,'pointerdown',function(e){var tile=e.target.closest('.tb');if(!tile||e.target.closest('button'))return;cancelTypeDrag(false);var d={tile:tile,id:tile.getAttribute('data-t'),grid:grid,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,originNext:tile.nextElementSibling,ready:false,active:false,outside:false,latestEvent:null,moveFrame:0,lockTarget:null,lockRect:null,lockSide:null,lockAxis:null,slotIndex:null};typeDrag=d;d.timer=setTimeout(function(){if(typeDrag===d)d.ready=true},180);try{tile.setPointerCapture(e.pointerId)}catch(_){} });
  function processDragMove(d,e){if(!d||typeDrag!==d||!d.active)return;moveDraggedTile(d,e);if(d.justStarted&&d.dragOriginRect&&inRect(e.clientX,e.clientY,d.dragOriginRect,DRAG_HYSTERESIS)){clearNativeSelection();if(e.preventDefault)e.preventDefault();return}d.justStarted=false;updateDragSlot(d,e);if(d.outside){cancelTypeDrag(true);return}clearNativeSelection();if(e.preventDefault)e.preventDefault()}
 function queueDragMove(d,e){d.latestEvent={clientX:e.clientX,clientY:e.clientY};if(d.moveFrame)return;d.moveFrame=raf(function(){d.moveFrame=0;var latest=d.latestEvent;d.latestEvent=null;if(typeDrag===d&&latest)processDragMove(d,latest)})}
 function flushDragMove(d){if(!d)return;if(d.moveFrame){caf(d.moveFrame);d.moveFrame=0}var latest=d.latestEvent;d.latestEvent=null;if(typeDrag===d&&latest)processDragMove(d,latest)}
 on(document,'pointermove',function(e){var d=typeDrag;if(!d||(e.pointerId!=null&&e.pointerId!==d.pointerId))return;var dx=e.clientX-d.startX,dy=e.clientY-d.startY,dist=Math.sqrt(dx*dx+dy*dy);if(!d.active){if(!d.ready&&dist>PRESS_TOLERANCE){cancelTypeDrag(false);return}if(d.ready&&dist>DRAG_THRESHOLD){beginTypeDrag(d,e);if(d.active){processDragMove(d,e);if(d.outside){cancelTypeDrag(true);return}}return}return}e.preventDefault();queueDragMove(d,e)});
 on(document,'pointerup',function(e){var d=typeDrag;if(!d||(e.pointerId!=null&&e.pointerId!==d.pointerId))return;if(!d.active){clearTimeout(d.timer);typeDrag=null;return}flushDragMove(d);if(typeDrag!==d)return;e.preventDefault();finishTypeDrag(d)});
 on(document,'pointercancel',function(e){if(typeDrag&&(!e.pointerId||e.pointerId===typeDrag.pointerId))cancelTypeDrag(true)});
 on(document,'selectstart',function(e){var target=e.target;if(typeDrag&&(typeDrag.active||(target&&target.closest&&target.closest('#oca-panel .tb')))){e.preventDefault();clearNativeSelection()}},true);
 on(document,'selectionchange',function(){if(typeDrag&&typeDrag.active)clearNativeSelection()},true);
 on(grid,'dragstart',function(e){e.preventDefault()});
}
initTypeDrag();
on(panel.querySelector('#oca-type-file'),'change',function(e){var file=e.target.files&&e.target.files[0];e.target.value='';if(!file)return;var reader=new FileReader();reader.onload=function(){try{importCustomTypes(JSON.parse(reader.result))}catch(err){toast('\u26A0\uFE0F \u5BFC\u5165\u6587\u4EF6\u4E0D\u662F\u5408\u6CD5 JSON')}};reader.onerror=function(){toast('\u26A0\uFE0F \u8BFB\u53D6\u5BFC\u5165\u6587\u4EF6\u5931\u8D25')};reader.readAsText(file)});
on(document,'pointerdown',function(e){if(!e.target.closest('#oca-panel .tb'))closeTypeMenus()});
function isGview(){return panel.querySelector('.gview').style.display!=='none'}
function resetTrigToCorner(){
 trig.style.left='';trig.style.top='';trig.style.right='24px';trig.style.bottom='24px';
 localStorage.removeItem(KB);trigDragged=false}
function clampTrig(){
 if(trig.style.display==='none')return;
 var r=trig.getBoundingClientRect();
 var nl=r.left,nt=r.top,ch=false;
 if(r.right>innerWidth){nl=innerWidth-r.width-4;ch=true}
 if(r.bottom>innerHeight){nt=innerHeight-r.height-4;ch=true}
 if(nl<0){nl=4;ch=true}
 if(nt<0){nt=4;ch=true}
 if(ch){trig.style.left=nl+'px';trig.style.top=nt+'px';trig.style.right='auto';trig.style.bottom='auto'}}
function hiddenLeft(){
 var w=panel.offsetWidth||CFG.pw;
 var peek=CFG.peek||30;
 var cur=parseFloat(panel.style.left);if(isNaN(cur))cur=panel.getBoundingClientRect().left;
 var leftSide=(cur+w/2)<innerWidth/2;
 return leftSide?(-(w-peek)):(innerWidth-peek)}
function ensureVisible(){
 var r=panel.getBoundingClientRect();
 if(r.right<=0||r.left>=innerWidth){
  var g=CFG.gap||0;
  panel.style.left=(innerWidth-(panel.offsetWidth||CFG.pw)-g)+'px';
  panel.style.right='auto'}}
function snapX(el,key,animate,keepVisible){
 var r=el.getBoundingClientRect(),w=r.width;
 var cur=parseFloat(el.style.left);if(isNaN(cur))cur=r.left;
 var leftSide=(cur+w/2)<innerWidth/2,target;
 if(CFG.full&&el===panel&&!CFG.fold&&!keepVisible){target=hiddenLeft()}
 else{var g=CFG.gap||0;target=leftSide?g:(innerWidth-w-g)}
 if(target<-(w-30)){target=-(w-30)}
 el.style.right='auto';
 if(animate!==false){el.style.transition='left .25s ease'}
 el.style.left=target+'px';
 if(animate!==false){setTimeout(function(){el.style.transition=''},280)}
 var L=parseFloat(el.style.left)||0;
 var T=parseFloat(el.style.top);if(isNaN(T))T=r.top;
 localStorage.setItem(key,JSON.stringify({lx:L/innerWidth,ty:T/innerHeight}))}
function snapDebounced(keepVisible){
 clearTimeout(snapTimer);
 snapTimer=setTimeout(function(){
  if(CFG.pos==='snap'&&panel.style.display!=='none'){
   snapX(panel,KP,true,keepVisible);ensureVisible()}},150)}
function pointInPanel(x,y){
 if(panel.style.display==='none')return false;
 var r=panel.getBoundingClientRect();
 return x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom}
function peekShow(){
 if(peekActive||!CFG.full||CFG.fold||adjusting)return;
 clearTimeout(peekTimerIn);clearTimeout(peekTimerOut);
 var si=Math.max(0,Math.min(4,(CFG.sens||3)-1));
 var delay=SENS[si];
 peekTimerIn=setTimeout(function(){
  if(adjusting)return;
  peekActive=true;
  var g=CFG.gap||0,w=panel.offsetWidth||CFG.pw;
  var cur=parseFloat(panel.style.left);if(isNaN(cur))cur=panel.getBoundingClientRect().left;
  var leftSide=(cur+w/2)<innerWidth/2;
  var target=leftSide?g:(innerWidth-w-g);
  panel.style.transition='left .25s ease';
  panel.style.left=target+'px';
  setTimeout(function(){panel.style.transition=''},280)},delay)}
function peekHide(){
 if(!CFG.full||CFG.fold||adjusting)return;
 clearTimeout(peekTimerOut);clearTimeout(peekTimerIn);
 var si=Math.max(0,Math.min(4,(CFG.sens||3)-1));
 var delay=SENS[si];
 peekTimerOut=setTimeout(function(){
  if(adjusting)return;
  peekActive=false;
  var t=hiddenLeft();
  panel.style.transition='left .25s ease';
  panel.style.left=t+'px';
  setTimeout(function(){panel.style.transition=''},280)},delay)}
function hoverCheck(){
 if(!CFG.full||panel.style.display==='none')return;
 if(pointInPanel(lastMX,lastMY)){peekShow()}
 else{peekHide()}}
on(document,'pointermove',function(e){
 lastMX=e.clientX;lastMY=e.clientY;
 if(CFG.full&&panel.style.display!=='none'&&!hoverPending){
  hoverPending=true;
  setTimeout(function(){hoverPending=false;hoverCheck()},100)}},true);
function doFold(){
 var before=panel.getBoundingClientRect();
 var centerX=before.left+before.width/2;
 CFG.fold=1;peekActive=false;
 applyUI();saveCfg();
 if(CFG.pos==='snap'){
  var g=CFG.gap||0,w=40;
  var goLeft=centerX<innerWidth/2;
  var target=goLeft?g:(innerWidth-w-g);
  panel.style.transition='left .25s ease';
  panel.style.right='auto';
  panel.style.left=target+'px';
  setTimeout(function(){panel.style.transition='';
   var L=parseFloat(panel.style.left)||0;
   var T=parseFloat(panel.style.top);if(isNaN(T))T=panel.getBoundingClientRect().top;
   localStorage.setItem(KP,JSON.stringify({lx:L/innerWidth,ty:T/innerHeight}))},280)}
 else{
  var keep=Math.max(0,Math.min(innerWidth-40,centerX-20));
  panel.style.right='auto';
  panel.style.left=keep+'px';
  localStorage.setItem(KP,JSON.stringify({lx:keep/innerWidth,ty:(parseFloat(panel.style.top)||before.top)/innerHeight}))}}
function doUnfold(){
 CFG.fold=0;peekActive=false;
 applyUI();saveCfg();
 if(CFG.pos==='snap'){snapX(panel,KP);ensureVisible()}}
function applyNoteFont(){
 var fs=noteFontSize();
 var ns=document.querySelectorAll('.oca-note .oca-nb');
 for(var i=0;i<ns.length;i++)ns[i].style.fontSize=fs+'px'}
function applyUI(){
 var base=themeBase();
 panel.className=(base==='dark'?'dark':'light')+' notranslate'+(CFG.fold?' folded':'');
 var a=CFG.op/100,bg,hd,bd,tx,shine;
 if(CFG.theme==='custom'){bg=hexA(CFG.cbg,a);hd=hexA(CFG.chead,a);bd=CFG.cbdr;tx=CFG.ctxt;shine=base==='dark'?'rgba(235,255,255,.12)':'rgba(255,255,255,.72)'}
 else if(base==='dark'){bg='rgba(10,28,36,'+a+')';hd='rgba(17,70,82,'+Math.min(1,a+.08)+')';bd='rgba(151,218,225,.30)';tx='#e7f5f4';shine='rgba(235,255,255,.12)'}
 else{bg='rgba(242,251,252,'+a+')';hd='rgba(220,243,246,'+Math.min(1,a+.06)+')';bd='rgba(73,143,153,.30)';tx='#163b44';shine='rgba(255,255,255,.72)'}
 panel.style.background=bg;
 panel.style.borderWidth=CFG.fold?'3px':'1px';panel.style.borderStyle='solid';panel.style.borderColor=bd;
 panel.style.borderRadius=CFG.fold?'8px':'10px';
 panel.style.color=tx;
 panel.style.boxShadow=base==='dark'?'0 20px 54px rgba(0,0,0,.48),inset 0 1px 0 '+shine:'0 20px 54px rgba(9,61,72,.24),inset 0 1px 0 '+shine;
 var phEl=panel.querySelector('.ph');
 phEl.style.background=hd;phEl.style.borderBottom=CFG.fold?'none':'1px solid '+bd;phEl.style.boxShadow='inset 0 1px 0 '+shine;
 var bf=CFG.glass?('blur('+CFG.blur+'px)'):'none';
 panel.style.backdropFilter=bf;panel.style.webkitBackdropFilter=bf;
 panel.style.fontSize=CFG.fmode==='custom'?CFG.fsize+'px':'13px';
 var s=CFG.bmode==='custom'?CFG.bsize:42;
 trig.style.width=s+'px';trig.style.height=s+'px';trig.style.fontSize=Math.round(s*0.45)+'px';
 trig.style.background=base==='dark'?'rgba(29,151,173,.84)':'rgba(8,109,190,.86)';
 trig.style.borderColor=base==='dark'?'rgba(201,247,245,.60)':'rgba(218,246,250,.78)';
 trig.style.boxShadow=base==='dark'?'0 10px 24px rgba(0,0,0,.38),inset 0 1px 0 rgba(255,255,255,.28)':'0 10px 24px rgba(2,45,84,.35),inset 0 1px 0 rgba(255,255,255,.52)';
 if(!CFG.fold){panel.style.width=CFG.pw+'px';
  panel.style.height=CFG.ph?CFG.ph+'px':''}
 else{panel.style.width='40px';panel.style.height=''}
 var pbEl=panel.querySelector('.pb'),rz=panel.querySelector('.rsz');
 pbEl.style.display=CFG.fold?'none':'block';
 rz.style.display=CFG.fold?'none':'block';
 var gearEl=panel.querySelector('.gear'),rfrEl=panel.querySelector('.rfr'),
     ttlEl=panel.querySelector('.ttl'),clsEl=panel.querySelector('.cls'),foldEl=panel.querySelector('.fold');
 if(gearEl)gearEl.style.display=CFG.fold?'none':'';
 if(rfrEl)rfrEl.style.display=CFG.fold?'none':'';
 if(ttlEl)ttlEl.style.display=CFG.fold?'none':'';
 if(clsEl)clsEl.style.display=CFG.fold?'none':'';
 if(foldEl)foldEl.classList.toggle('open',!CFG.fold);
 var cw=panel.querySelector('#oca-cwrap');if(cw)cw.style.display=CFG.theme==='custom'?'flex':'none';
 var fw=panel.querySelector('#oca-fwrap');if(fw)fw.style.display=CFG.fmode==='custom'?'flex':'none';
 var bw=panel.querySelector('#oca-bwrap');if(bw)bw.style.display=CFG.bmode==='custom'?'flex':'none';
 var gw=panel.querySelector('#oca-gwrap');if(gw)gw.style.display=CFG.pos==='snap'?'block':'none';
 var pw=panel.querySelector('#oca-pwrap');if(pw)pw.style.display=(CFG.pos==='snap'&&CFG.full)?'block':'none';
 var nfw=panel.querySelector('#oca-nfwrap');if(nfw)nfw.style.display=CFG.noteFont==='custom'?'flex':'none';
 panel.querySelectorAll('[data-thm]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-thm')===CFG.theme)});
 panel.querySelectorAll('[data-fm]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-fm')===CFG.fmode)});
 panel.querySelectorAll('[data-bm]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-bm')===CFG.bmode)});
 panel.querySelectorAll('[data-pos]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-pos')===CFG.pos)});
 panel.querySelectorAll('[data-nf]').forEach(function(b){b.classList.toggle('on',b.getAttribute('data-nf')===CFG.noteFont)});
 panel.querySelectorAll('[data-sn]').forEach(function(b){b.classList.toggle('on',parseInt(b.getAttribute('data-sn'),10)===(CFG.sens||3))});
 var gi=function(k){return panel.querySelector('[data-k="'+k+'"]')};
 var gl=function(k){return panel.querySelector('[data-v="'+k+'"]')};
 if(gi('blur'))gi('blur').value=CFG.blur;if(gl('blur'))gl('blur').textContent=CFG.blur+'px';
 if(gi('op'))gi('op').value=CFG.op;if(gl('op'))gl('op').textContent=CFG.op+'%';
 if(gi('fsize'))gi('fsize').value=CFG.fsize;if(gl('fsize'))gl('fsize').textContent=CFG.fsize+'px';
 if(gi('bsize'))gi('bsize').value=CFG.bsize;if(gl('bsize'))gl('bsize').textContent=CFG.bsize+'px';
 if(gi('noteSize'))gi('noteSize').value=CFG.noteSize;if(gl('noteSize'))gl('noteSize').textContent=CFG.noteSize+'px';
 if(gi('gap'))gi('gap').value=CFG.gap;if(gl('gap'))gl('gap').textContent=CFG.gap+'px';
 if(gi('peek'))gi('peek').value=CFG.peek;if(gl('peek'))gl('peek').textContent=CFG.peek+'px';
 if(gi('glass'))gi('glass').checked=!!CFG.glass;
 if(gi('full'))gi('full').checked=!!CFG.full;
 if(gi('autoFold'))gi('autoFold').checked=!!CFG.autoFold;
 if(gi('transient'))gi('transient').checked=!!CFG.transient;
 if(gi('saveCfg'))gi('saveCfg').checked=!!CFG.saveCfg;
 updateTypeActions();applyNoteFont()}
function onEditor(t,e,f,o){t.addEventListener(e,f,o);editorCleanups.push(function(){t.removeEventListener(e,f,o)})}
function editorState(dirty){
 if(!editorEl)return;
 if(dirty)editorEl._dirty=true;
 var state=editorEl.querySelector('.oe-state');
 if(state){state.textContent=editorEl._dirty?'\u5DF2\u4FEE\u6539':'\u5DF2\u4FDD\u5B58';state.classList.toggle('dirty',!!editorEl._dirty)}}
function selectionIn(tag){
 var s=window.getSelection&&window.getSelection(),n=s&&s.anchorNode;
 if(n&&n.nodeType===3)n=n.parentNode;
 return !!(n&&n.closest&&n.closest(tag))}
function syncEditorTools(){
 if(!editorEl)return;
 var commands=['bold','italic','underline','strikeThrough','insertOrderedList','insertUnorderedList'];
 for(var i=0;i<commands.length;i++){
  var cmd=commands[i],active=false;
  try{active=document.queryCommandState(cmd)}catch(e){}
  var btn=editorEl.querySelector('[data-c="'+cmd+'"]');
  if(btn){btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',active?'true':'false')}}
 var quote=editorEl.querySelector('[data-c="blockquote"]');
 if(quote){var qa=selectionIn('blockquote');quote.classList.toggle('is-active',qa);quote.setAttribute('aria-pressed',qa?'true':'false')}}
function runEditorCommand(cmd,body){
 if(cmd==='blockquote'){document.execCommand('formatBlock',false,selectionIn('blockquote')?'p':'blockquote')}
 else{document.execCommand(cmd,false,null)}
 editorState(true);syncEditorTools()}
function closeEditor(force){
 if(!editorEl)return true;
 if(!force&&editorEl._dirty&&!confirm('\u5F53\u524D\u7F16\u8F91\u5C1A\u672A\u4FDD\u5B58\uFF0C\u4E22\u5F03\u66F4\u6539\uFF1F'))return false;
 editorCleanups.forEach(function(off){off()});editorCleanups=[];
 editorEl.remove();editorEl=null;editorTarget=null;return true}
function exitEditorQuote(body){
 var s=window.getSelection&&window.getSelection();if(!s||!s.rangeCount)return false;
 var r=s.getRangeAt(0),n=s.anchorNode;if(n&&n.nodeType===3)n=n.parentNode;
 var quote=n&&n.closest?n.closest('blockquote'):null;
 if(!quote||!body.contains(quote))return false;
 r.deleteContents();r.collapse(true);
 var tail=r.cloneRange();tail.setEnd(quote,quote.childNodes.length);
 var normal=document.createElement('div');normal.appendChild(tail.extractContents());
 if(!normal.childNodes.length)normal.appendChild(document.createElement('br'));
 if(!quote.textContent.trim()&&!quote.querySelector('img,video,audio,iframe,canvas'))quote.parentNode.replaceChild(normal,quote);
 else quote.parentNode.insertBefore(normal,quote.nextSibling);
 var caret=document.createRange();caret.selectNodeContents(normal);caret.collapse(true);
 s.removeAllRanges();s.addRange(caret);return true}
function saveEditor(){
 if(!editorEl||!editorTarget)return;
 var html=editorEl.querySelector('.oe-body').innerHTML;
 var nb=editorTarget.querySelector('.oca-nb');
 nb.innerHTML=html;
 nb.setAttribute('data-body',html);
 nb.style.fontSize=noteFontSize()+'px';
 save();closeEditor(true);toast('\u2705 \u5DF2\u4FDD\u5B58\u7F16\u8F91')}
function openEditor(noteEl){
 if(editorEl&&editorTarget===noteEl){editorEl.querySelector('.oe-body').focus();return}
 if(!closeEditor())return;
 editorTarget=noteEl;noteEl.classList.remove('oca-folded');
 var nb=noteEl.querySelector('.oca-nb');
 var md=nb.getAttribute('data-body')||'';
 editorEl=document.createElement('div');
 editorEl.className='oca-editor notranslate';
 editorEl.setAttribute('translate','no');
 editorEl.innerHTML='<div class="oe-head"><span class="oe-mark">\u270E</span><span class="oe-title">\u7F16\u8F91\u6807\u6CE8</span><span class="oe-state" aria-live="polite">\u5DF2\u4FDD\u5B58</span></div>'
 +'<div class="oe-bar" role="toolbar" aria-label="\u6807\u6CE8\u7F16\u8F91\u5DE5\u5177">'
 +'<span class="oe-group"><button type="button" class="oe-tool" data-c="undo" title="\u64A4\u9500" aria-label="\u64A4\u9500">\u21A9</button><button type="button" class="oe-tool" data-c="redo" title="\u91CD\u505A" aria-label="\u91CD\u505A">\u21AA</button></span>'
 +'<span class="oe-group"><button type="button" class="oe-tool" data-c="bold" title="\u52A0\u7C97" aria-label="\u52A0\u7C97"><b>B</b></button><button type="button" class="oe-tool" data-c="italic" title="\u659C\u4F53" aria-label="\u659C\u4F53"><i>I</i></button><button type="button" class="oe-tool" data-c="underline" title="\u4E0B\u5212\u7EBF" aria-label="\u4E0B\u5212\u7EBF"><u>U</u></button><button type="button" class="oe-tool" data-c="strikeThrough" title="\u5220\u9664\u7EBF" aria-label="\u5220\u9664\u7EBF"><s>S</s></button></span>'
 +'<span class="oe-group"><button type="button" class="oe-tool" data-c="insertOrderedList" title="\u6709\u5E8F\u5217\u8868" aria-label="\u6709\u5E8F\u5217\u8868">1.</button><button type="button" class="oe-tool" data-c="insertUnorderedList" title="\u65E0\u5E8F\u5217\u8868" aria-label="\u65E0\u5E8F\u5217\u8868">\u2022</button></span>'
 +'<span class="oe-group"><button type="button" class="oe-tool" data-c="blockquote" title="\u5F15\u7528" aria-label="\u5F15\u7528">\u275D</button><button type="button" class="oe-tool" data-c="removeFormat" title="\u6E05\u9664\u683C\u5F0F" aria-label="\u6E05\u9664\u683C\u5F0F">\u232B</button></span>'
 +'</div>'
 +'<div class="oe-body" contenteditable="true" spellcheck="true"></div>'
 +'<div class="oe-foot"><span class="oe-caption">'+(noteEl.getAttribute('data-label')||'\u6807\u6CE8')+'</span><span class="oe-actions"><button type="button" class="oe-cancel">\u53D6\u6D88</button><button type="button" class="oe-save" title="Ctrl/Cmd+S">\u4FDD\u5B58</button></span></div>';
 var body=editorEl.querySelector('.oe-body');
 body.innerHTML=toHtml(md);editorEl._dirty=false;
 noteEl.parentNode.insertBefore(editorEl,noteEl.nextSibling);
 body.focus();syncEditorTools();
 onEditor(editorEl.querySelector('.oe-bar'),'mousedown',function(e){e.preventDefault()});
 onEditor(editorEl.querySelector('.oe-bar'),'click',function(e){
  var btn=e.target.closest('[data-c]');
  if(!btn)return;
  e.stopPropagation();body.focus();runEditorCommand(btn.getAttribute('data-c'),body)});
 onEditor(body,'input',function(){editorState(true);syncEditorTools()});
 onEditor(body,'keyup',syncEditorTools);onEditor(body,'mouseup',syncEditorTools);
 onEditor(body,'paste',function(e){
  var data=e.clipboardData||window.clipboardData;if(!data)return;
  e.preventDefault();var text=data.getData('text/plain');
  if(!document.execCommand('insertText',false,text)){
   var s=window.getSelection();if(s&&s.rangeCount){var r=s.getRangeAt(0);r.deleteContents();r.insertNode(document.createTextNode(text))}}
  editorState(true);syncEditorTools()});
 onEditor(body,'keydown',function(e){
 var mod=e.ctrlKey||e.metaKey,key=e.key.toLowerCase();
 if(mod&&key==='s'){e.preventDefault();e.stopPropagation();saveEditor();return}
 if(mod&&({b:'bold',i:'italic',u:'underline'}[key])){e.preventDefault();e.stopPropagation();runEditorCommand({b:'bold',i:'italic',u:'underline'}[key],body);return}
  if(!e.isComposing&&e.key==='Enter'&&selectionIn('blockquote')){
   e.preventDefault();e.stopPropagation();
   if(e.shiftKey)document.execCommand('insertLineBreak',false,null);
   else exitEditorQuote(body);editorState(true);syncEditorTools();return}
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(closeEditor())toast('\u5DF2\u53D6\u6D88')}});
 onEditor(editorEl.querySelector('.oe-save'),'click',function(){saveEditor()});
 onEditor(editorEl.querySelector('.oe-cancel'),'click',function(){if(closeEditor())toast('\u5DF2\u53D6\u6D88')})}
function drag(el,hd,key,can){
 var sx=0,sy=0,ox=0,oy=0,pending=false,dn=false;
 on(hd,'pointerdown',function(e){
  if(can&&!can())return;
  if(e.target.closest('button,input,textarea,select,.tb,.ic,.stp,.rsz'))return;
  pending=true;dn=false;
  sx=e.clientX;sy=e.clientY;
  var r=el.getBoundingClientRect();ox=r.left;oy=r.top});
 on(hd,'pointermove',function(e){
  if(!pending&&!dn)return;
  var dx=e.clientX-sx,dy=e.clientY-sy;
  if(!dn){
   if(Math.abs(dx)<5&&Math.abs(dy)<5)return;
   dn=true;
   el.style.left=ox+'px';el.style.top=oy+'px';
   el.style.right='auto';el.style.bottom='auto';
   try{hd.setPointerCapture(e.pointerId)}catch(_){}
   e.preventDefault()}
  el.style.left=Math.max(0,Math.min(innerWidth-40,ox+dx))+'px';
  el.style.top=Math.max(0,Math.min(innerHeight-40,oy+dy))+'px'});
 on(hd,'pointerup',function(){
  if(dn){
   if(key){
    if(el===trig)trigDragged=true;
    if(CFG.pos==='snap'&&el===panel){snapX(el,KP);ensureVisible()}
    else{var L=parseFloat(el.style.left)||0,T=parseFloat(el.style.top)||0;
     localStorage.setItem(key,JSON.stringify({lx:L/innerWidth,ty:T/innerHeight}))}}}
  pending=false;dn=false});
 if(key){try{var p=JSON.parse(localStorage.getItem(key));
  if(p){var L,T;
   if(p.lx!=null){L=p.lx*innerWidth;T=p.ty*innerHeight}
   else if(p.l){L=parseFloat(p.l);T=parseFloat(p.t)}
   if(L!=null&&!isNaN(L)){el.style.left=L+'px';el.style.top=T+'px';el.style.right='auto';el.style.bottom='auto';
    if(el===trig)trigDragged=true}}}catch(e){}}}
function pulse(el){if(!el)return;el.classList.remove('oca-pulse');void el.offsetWidth;el.classList.add('oca-pulse');
 setTimeout(function(){if(el)el.classList.remove('oca-pulse')},2300)}
function panelOpen(){
 clearTimeout(panel._ct);
 showG(false);
 panel.style.display='flex';
 if(CFG.pos==='snap'){snapX(panel,KP,false);ensureVisible()}
 var r=panel.getBoundingClientRect();
 var cx=r.left+r.width/2,cy=r.top+r.height/2;
 var dx=(r.right-cx),dy=(r.bottom-cy);
 panel.style.transition='none';
 panel.style.transformOrigin='bottom right';
 panel.style.transform='translate('+dx+'px,'+dy+'px) scale(0.05)';
 panel.style.opacity='0';
 void panel.offsetWidth;
 panel.style.transition='transform .28s cubic-bezier(.22,1,.36,1),opacity .22s ease';
 panel.style.transform='none';panel.style.opacity='1';
 pulse(panel)}
function panelClose(){
 var r=panel.getBoundingClientRect();
 var cx=r.left+r.width/2,cy=r.top+r.height/2;
 var dx=(r.right-cx),dy=(r.bottom-cy);
 panel.style.transition='transform .26s cubic-bezier(.4,0,.6,1),opacity .24s ease';
 panel.style.transformOrigin='bottom right';
 panel.style.transform='translate('+dx+'px,'+dy+'px) scale(0.05)';
 panel.style.opacity='0';
 clearTimeout(panel._ct);
 panel._ct=setTimeout(function(){panel.style.display='none';panel.style.transform='none';
  panel.style.transition='none';panel.style.opacity='1'},300);
 trig.style.display='flex';
 if(!trigDragged)resetTrigToCorner();
 clampTrig();
 pulse(trig)}
 function note(type,body,where,meta){var info=typeInfo(type,meta);
  var b=document.createElement('blockquote');b.className='oca-note';
  b.setAttribute('data-type',info.id);b.setAttribute('data-label',info.label);b.setAttribute('data-oca-icon',info.icon);
  b.innerHTML='<div class="oca-nt notranslate" translate="no">[!'+escHTML(info.id)+'] '+escHTML(info.label)+'</div><div class="oca-nb"></div><span class="oca-ed" title="\u7F16\u8F91"></span><span class="oca-cp" title="\u590D\u5236\u6B64\u6807\u6CE8MD"></span><span class="oca-x" title="\u5220\u9664"></span>';
  applyNoteTypeStyle(b,info);
  var nbEl=b.querySelector('.oca-nb');
  var html=toHtml(body||'');
  nbEl.innerHTML=html;
  nbEl.setAttribute('data-body',html);
  nbEl.style.fontSize=noteFontSize()+'px';
  var anchor=(where&&typeof where==='object')?where:null;
  if(anchor&&anchor.kind==='list'){
   var item=findListItem(anchor);
   if(item&&insertAfterListItem(b,item,anchor))return b}
  var ai=anchor&&anchor.kind==='block'?anchor.ai:where;
  if(ai!=null){var bs=blocks(),a=bs[Math.min(ai,bs.length-1)];
   if(a&&a.parentNode){a.parentNode.insertBefore(b,a.nextSibling);return b}}
  root().appendChild(b);return b}
function loadRaw(){var v=localStorage.getItem(LS);if(v)return v;
 for(var i=0;i<LS_OLD.length;i++){var o=localStorage.getItem(LS_OLD[i]);if(o)return o}return null}
 function save(){var ns=document.querySelectorAll('.oca-note'),bs=blocks(),d=[];
  for(var i=0;i<ns.length;i++){var n=ns[i],ai=bs.length-1,p=n.previousElementSibling;
   if(p){var x=bs.indexOf(p);if(x>=0)ai=x}
   var nbEl=n.querySelector('.oca-nb');
   var body=nbEl.getAttribute('data-body');
   if(body==null){body=nbEl.innerHTML}
   if(n.getAttribute('data-oca-transient')==='1')continue;
   var anchor=readListAnchor(n),record={ai:ai,type:n.getAttribute('data-type')||'note',body:body,label:n.getAttribute('data-label')||'',icon:n.getAttribute('data-oca-icon')||'',color:n.getAttribute('data-oca-color')||''};
   if(anchor)record.anchor=anchor;d.push(record)}
  localStorage.setItem(LS,JSON.stringify(d));
  var s=q('#oca-panel .st');if(s)s.textContent='\u5DF2\u4FDD\u5B58 '+d.length+' \u6761\u6807\u6CE8 \u00B7 \u81EA\u52A8\u540C\u6B65\u4E2D'}
 function restore(){try{JSON.parse(loadRaw()||'[]').forEach(function(x){
  if(x.body&&x.body!=='\u5199\u4E0B\u4F60\u7684\u611F\u609F\u2026')note(x.type,x.body,x.anchor||x.ai,x)})}catch(e){}}
 seedListOrigins();
 var olds=document.querySelectorAll('blockquote.oca-note');
 for(var i=0;i<olds.length;i++){var o=olds[i];
  if(isList(o.parentElement)){
   var oldAnchor=anchorFromExistingNote(o),be=o.querySelector('.oca-nb'),oldType=o.getAttribute('data-type')||'note',oldBody=be?(be.getAttribute('data-body')||be.innerHTML):'';
   o.remove();note(oldType,oldBody,oldAnchor)}}
drag(trig,trig,KB,null);
drag(panel,panel.querySelector('.ph'),KP,null);
applyUI();
var rz=panel.querySelector('.rsz');
on(rz,'pointerdown',function(e){
 e.stopPropagation();e.preventDefault();
 var sw=panel.offsetWidth,sh=panel.offsetHeight,sx=e.clientX,sy=e.clientY;
 function mv2(ev){var w=Math.max(240,Math.min(innerWidth*0.9,sw+ev.clientX-sx));
  var h=Math.max(180,Math.min(innerHeight*0.85,sh+ev.clientY-sy));
  panel.style.width=w+'px';panel.style.height=h+'px'}
 function up2(){document.removeEventListener('pointermove',mv2);
  document.removeEventListener('pointerup',up2);
  CFG.pw=panel.offsetWidth;CFG.ph=panel.offsetHeight;saveCfg();
  if(CFG.pos==='snap'){snapX(panel,KP);ensureVisible()}}
 document.addEventListener('pointermove',mv2);
 document.addEventListener('pointerup',up2)});
function showG(v){panel.querySelector('.gview').style.display=v?'block':'none';
 panel.querySelector('.mview').style.display=v?'none':'block';
 var gearEl=panel.querySelector('.gear');
 if(gearEl)gearEl.style.background=v?'rgba(8,109,221,.2)':''}
function onCfgInput(e){
 var t=e.target;if(!t||!t.getAttribute)return;
 var k=t.getAttribute('data-k');if(!k)return;
 if(t.type==='checkbox'){CFG[k]=t.checked?1:0}
 else if(t.type==='color'){CFG[k]=t.value}
 else{var v=parseFloat(t.value);if(isNaN(v))return;CFG[k]=v}
 if(k==='transient'){applyUI();return}
 var lab=panel.querySelector('[data-v="'+k+'"]');
 if(lab)lab.textContent=(k==='op')?CFG.op+'%':CFG[k]+'px';
 applyUI();saveCfg();
 if(k==='gap'||k==='full'||k==='peek'){lockAdjust();snapDebounced(true)}}
on(panel,'input',onCfgInput);
on(panel,'change',function(e){if(e.target&&e.target.type==='checkbox')onCfgInput(e)});
function allMD(){var ns=document.querySelectorAll('.oca-note'),parts=[];
 for(var i=0;i<ns.length;i++)parts.push(mdOf(ns[i]));
 return parts.join(NL+NL)}
function exportAll(){var ns=document.querySelectorAll('.oca-note');
 if(!ns.length){toast('\u26A0\uFE0F \u65E0\u5185\u5BB9');return}
 var d=new Date(),p2=function(n){return n<10?('0'+n):(''+n)};
 var fn='obsidian-notes-'+d.getFullYear()+p2(d.getMonth()+1)+p2(d.getDate())+'.md';
 try{var b=new Blob([allMD()],{type:'text/markdown'});
  var u=URL.createObjectURL(b),a=document.createElement('a');
  a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(u)},500);
  toast('\uD83D\uDCC2 \u5DF2\u5BFC\u51FA '+ns.length+' \u6761')}catch(e){toast('\u26A0\uFE0F \u5BFC\u51FA\u5931\u8D25')}}
on(panel,'click',function(e){
 var templateAction=e.target.closest('[data-template-action]');
 if(templateAction){e.preventDefault();e.stopPropagation();var templateOp=templateAction.getAttribute('data-template-action');if(templateOp==='open')openClipperAssistant(false);else if(templateOp==='copy'){copyText(buildClipperTemplate());toast('📋 已复制完整过滤模板')}else if(templateOp==='clean-history')cleanRetiredIds();return}
 var typeAction=e.target.closest('[data-type-action]');
 if(typeAction){
  e.preventDefault();e.stopPropagation();var ta=typeAction.getAttribute('data-type-action'),tid=typeAction.getAttribute('data-type-id');
  if(ta==='menu'){var menu=typeAction.closest('.tb').querySelector('.tb-menu'),open=menu.classList.contains('open');closeTypeMenus();if(!open)menu.classList.add('open')}
  else if(ta==='create'){closeTypeMenus();typeDialog()}
  else if(ta==='edit'){closeTypeMenus();typeDialog(tid)}
  else if(ta==='delete'){closeTypeMenus();deleteCustomType(tid)}
   else if(ta==='undo'){undoType()}
   else if(ta==='redo'){redoType()}
  else if(ta==='reset'){resetTypes()}
  else if(ta==='export'){exportCustomTypes()}
  else if(ta==='import'){panel.querySelector('#oca-type-file').click()}
  return}
 var g=e.target.closest('[data-g]');
 if(g){var ga=g.getAttribute('data-g');
  if(ga==='back')showG(false);
  else if(ga==='export')exportAll();
  else if(ga==='copyall'){if(!document.querySelectorAll('.oca-note').length){toast('\u26A0\uFE0F \u65E0\u5185\u5BB9');return}
   copyText(allMD());toast('\uD83D\uDCCB \u5DF2\u590D\u5236\u5168\u90E8\u6807\u6CE8')}
  else if(ga==='reset'){if(confirm('\u786E\u8BA4\u91CD\u7F6E\u5168\u90E8\u8BBE\u7F6E\uFF1F')){
   CFG=defCfg();applyUI();saveCfg();showG(false);resetTrigToCorner();toast('\u8BBE\u7F6E\u5DF2\u5168\u90E8\u91CD\u7F6E')}}
  else if(ga==='doc'){var dc=panel.querySelector('#oca-doc');
   dc.style.display=dc.style.display==='none'?'block':'none'}
  return}
 var ic=e.target.closest('.ic');
 if(ic){
  if(ic.classList.contains('gear'))showG(!isGview());
  else if(ic.classList.contains('rfr')){if(confirm('\u91CD\u7F6E\u5F53\u524D\u5916\u89C2\u8BBE\u7F6E\uFF1F')){
   CFG=defCfg();applyUI();saveCfg();resetTrigToCorner();toast('\u5DF2\u91CD\u7F6E\u4E3A\u9ED8\u8BA4\u5916\u89C2')}}
  else if(ic.classList.contains('cls'))panelClose();
  else if(ic.classList.contains('fold')){
   if(CFG.fold){doUnfold()}else{doFold()}}
  return}
 var nf=e.target.closest('[data-nf]');
 if(nf){CFG.noteFont=nf.getAttribute('data-nf');applyUI();saveCfg();return}
 var sn=e.target.closest('[data-sn]');
 if(sn){CFG.sens=parseInt(sn.getAttribute('data-sn'),10)||3;applyUI();saveCfg();return}
 var tb=e.target.closest('.tb');
  if(tb){if(Date.now()<typeDragSuppressUntil)return;curType=tb.getAttribute('data-t');closeTypeMenus();syncTypeTiles();return}
 var th=e.target.closest('[data-thm]');
 if(th){CFG.theme=th.getAttribute('data-thm');applyUI();saveCfg();return}
 var fm=e.target.closest('[data-fm]');
 if(fm){CFG.fmode=fm.getAttribute('data-fm');applyUI();saveCfg();return}
 var bm=e.target.closest('[data-bm]');
 if(bm){CFG.bmode=bm.getAttribute('data-bm');applyUI();saveCfg();return}
 var ps=e.target.closest('[data-pos]');
 if(ps){CFG.pos=ps.getAttribute('data-pos');applyUI();saveCfg();
  if(CFG.pos==='snap'&&panel.style.display!=='none'){snapX(panel,KP);ensureVisible()}
  return}
 var sp=e.target.closest('[data-st]');
 if(sp){var dd=parseInt(sp.getAttribute('data-st'),10)||0;
  CFG.gap=Math.max(0,Math.min(200,(CFG.gap||0)+dd));applyUI();saveCfg();
  lockAdjust();
  if(CFG.pos==='snap'&&panel.style.display!=='none')snapDebounced(true);return}
 var pk=e.target.closest('[data-pk]');
 if(pk){var dp=parseInt(pk.getAttribute('data-pk'),10)||0;
  CFG.peek=Math.max(30,Math.min(200,(CFG.peek||30)+dp));applyUI();saveCfg();
  lockAdjust();
  if(CFG.full&&panel.style.display!=='none')snapDebounced(true);return}
 if(e.target.closest('.act')){enterIns();return}
  if(e.target.closest('.clr')){if(confirm('\u6E05\u7A7A\u672C\u9875\u6240\u6709\u6807\u6CE8\uFF1F')){
   Array.prototype.slice.call(document.querySelectorAll('.oca-note')).forEach(removeNote);save();toast('\u5DF2\u6E05\u7A7A')}return}});
on(trig,'pointerdown',function(){moved=false});
on(trig,'pointermove',function(){moved=true});
on(trig,'click',function(){if(moved)return;
 trig.style.display='none';panelOpen()});
 if(!document.querySelector('.oca-note'))restore();save();
function enterIns(){
 if(ins){exitIns();return}
 ins=true;banner=document.createElement('div');banner.id='oca-banner';noTr(banner);
 banner.textContent='\uD83D\uDCCD \u60AC\u505C\u9009\u62E9\u4F4D\u7F6E \u00B7 \u70B9\u51FB\u786E\u8BA4 \u00B7 Esc \u53D6\u6D88';document.body.appendChild(banner);els.push(banner);
 if(CFG.autoFold&&!CFG.fold)doFold()}
function exitIns(){ins=false;if(cand){cand.classList.remove('oca-cand');cand=null}
 if(banner){banner.remove();banner=null;els=els.filter(function(x){return x!==banner})}}
on(document,'mouseover',function(e){if(!ins)return;
 var el=document.elementFromPoint(e.clientX,e.clientY);
 if(!el||el.closest('#oca-panel,#oca-trigger,#oca-banner,.oca-note,.oca-editor'))return;
 var b=el.closest('h1,h2,h3,h4,h5,h6,p,ul,ol,li,pre,table,figure,img,hr');
 if(cand)cand.classList.remove('oca-cand');cand=null;
 if(b&&root().contains(b)){cand=b;cand.classList.add('oca-cand')}});
on(document,'click',function(e){
 if(e.target.closest('#oca-panel,#oca-trigger,#oca-banner,.oca-editor'))return;
 if(ins){e.preventDefault();e.stopPropagation();
   var n=note(curType,'',cand?anchorForCandidate(cand):null);
  if(CFG.transient){n.setAttribute('data-oca-transient','1');CFG.transient=0;applyUI()}
  exitIns();save();openEditor(n);
  n.scrollIntoView({block:'center',behavior:'smooth'});toast('\u2705 \u5DF2\u63D2\u5165\uFF0C\u8BF7\u7F16\u8F91');return}
 var ed=e.target.closest('.oca-ed');
 if(ed){var nn2=ed.closest('.oca-note');openEditor(nn2);return}
 var cpEl=e.target.closest('.oca-cp');
 if(cpEl){var nn=cpEl.closest('.oca-note');copyText(mdOf(nn));toast('\uD83D\uDCCB \u5DF2\u590D\u5236');return}
 var x=e.target.closest('.oca-x');
  if(x){if(confirm('\u5220\u9664\u6B64\u6807\u6CE8\uFF1F')){removeNote(x.closest('.oca-note'));save()}return}
 var nt=e.target.closest('.oca-nt');
 if(nt){nt.closest('.oca-note').classList.toggle('oca-folded')}},true);
 on(document,'keydown',function(e){
  if(e.key==='Escape'){if(typeDrag){cancelTypeDragFn(true);e.preventDefault();return}if(ins)exitIns();else closeEditor()}});
on(document,'input',function(e){if(e.target.closest('.oca-nb'))save()});
timers.push(setInterval(save,5000));
on(window,'beforeunload',save);on(window,'pagehide',save);
on(window,'resize',function(){
 if(panel.style.display!=='none'){
  if(CFG.pos==='snap'){snapX(panel,KP,false);ensureVisible()}
  else{var r=panel.getBoundingClientRect();
   if(r.right>innerWidth||r.bottom>innerHeight||r.left<0||r.top<0){
    panel.style.left=Math.max(0,Math.min(innerWidth-r.width-4,r.left))+'px';
    panel.style.top=Math.max(0,Math.min(innerHeight-r.height-4,r.top))+'px'}}}
 if(trig.style.display!=='none'){
  if(!trigDragged){resetTrigToCorner()}
  else{clampTrig()}}});
function mdOf(n){var t=n.getAttribute('data-type')||'note',lb=n.getAttribute('data-label')||'\u7B14\u8BB0';
 var nbEl=n.querySelector('.oca-nb');
 var md=mdFromHTML(nbEl);
 var lines=md.split(NL);
 return '> [!'+t+'] '+lb+NL+lines.map(function(l){return '> '+l}).join(NL)}
function copyText(t){try{navigator.clipboard.writeText(t)}catch(e){
 var ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0';
 document.body.appendChild(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove()}}
var mo=new MutationObserver(function(){
 if(!document.body.contains(trig))document.body.appendChild(trig);
 if(!document.body.contains(panel))document.body.appendChild(panel)});
mo.observe(document.body,{childList:true});observers.push(mo);
window.__OCA__={destroy:function(){
 listeners.forEach(function(a){a[0].removeEventListener(a[1],a[2],a[3])});
 observers.forEach(function(o){o.disconnect()});timers.forEach(clearInterval);
  clearTimeout(panel._ct);clearTimeout(snapTimer);clearTimeout(peekTimerIn);clearTimeout(peekTimerOut);clearTimeout(adjustTimer);cancelTypeDragFn(false);
 closeEditor(true);
 els.forEach(function(el){el.remove()});
 var b=q('#oca-banner'),t=q('#oca-toast');if(b)b.remove();if(t)t.remove();
 delete window.__OCA__}};
panelOpen();
maybeOpenClipperAssistant();
}
boot();
})();
/* OCA-END v1.4.15 */