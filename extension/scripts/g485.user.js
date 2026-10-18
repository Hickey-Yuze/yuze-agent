// ==UserScript==
// @name         Vocab Collector — 生词记录与卡片复习
// @namespace    vocab-collector
// @version      2.6.1
// @description  双击生词即记录，悬停显示中文释义与例句，内置闪卡复习
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const STORE_KEY = 'vc_words_v1';
  const SKIP_SEL  = ['script','style','textarea','input','select','option','button',
    'code','pre','kbd','noscript','svg','math','canvas','[contenteditable]',
    '.vc-word','#vc-tooltip','#vc-panel','#vc-badge'].join(',');
  const SKIP_TAGS = new Set(['SCRIPT','STYLE','TEXTAREA','INPUT','SELECT',
    'BUTTON','CODE','PRE','KBD','NOSCRIPT','SVG','MATH']);

  /* ─── 存储 ─── */
  function dbLoad() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') } catch { return {} }
  }
  function dbSave(db) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(db)) } catch(e) { console.error('[VC] save', e) }
  }

  /* ─── 翻译（MyMemory API，国内可用，无需 key） ─── */
  async function translate(text) {
    if (!text) return ''
    try {
      const r = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=en|zh-CN')
      if (!r.ok) return text
      const j = await r.json()
      return (j.responseData && j.responseData.translatedText) ? j.responseData.translatedText : text
    } catch { return text }
  }
  async function translateDef(text) {
    return translate(text.replace(/[.;,(].*$/, '').trim().slice(0, 60))
  }

  /* ─── 查词 ─── */
  async function fetchDef(word) {
    try {
      const r = await fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()), { headers: { Accept: 'application/json' } })
      if (!r.ok) return await fallbackDef(word)
      const arr = await r.json()
      const entry = Array.isArray(arr) ? arr[0] : null
      if (!entry) return await fallbackDef(word)
      const phonetic = entry.phonetic || (entry.phonetics || []).find(p => p.text)?.text || ''
      const raw = []
      for (const m of (entry.meanings || []).slice(0, 3)) {
        const d = (m.definitions || [])[0]
        if (d) raw.push({ pos: m.partOfSpeech || '', def: d.definition || '', ex: d.example || '' })
      }
      const [zhDefs, zhExs] = await Promise.all([
        Promise.all(raw.map(m => translateDef(m.def))),
        Promise.all(raw.map(m => m.ex ? translate(m.ex) : Promise.resolve('')))
      ])
      return {
        word: entry.word || word, phonetic,
        meanings: raw.length ? raw.map((m,i) => ({ pos:m.pos, def:zhDefs[i]||m.def, ex:m.ex, exZh:zhExs[i] }))
          : [{ pos:'', def:'暂无释义', ex:'', exZh:'' }]
      }
    } catch(e) { console.error('[VC]',e); return await fallbackDef(word) }
  }
  async function fallbackDef(word) {
    return { word, phonetic:'', meanings:[{ pos:'', def: await translate(word), ex:'', exZh:'' }] }
  }

  /* ─── CSS ─── */
  function injectCSS() {
    if (document.getElementById('vc-style')) return
    const s = document.createElement('style')
    s.id = 'vc-style'
    s.textContent = [
      '.vc-word{border-bottom:1px dashed #2563eb!important;background:rgba(37,99,235,.12)!important;border-radius:2px!important;cursor:help!important;text-decoration:none!important}',
      '.vc-word:hover,.vc-word:focus{background:rgba(37,99,235,.22)!important}',
      '#vc-tooltip{position:fixed!important;z-index:2147483647!important;box-sizing:border-box!important;max-width:min(360px,calc(100vw - 16px))!important;padding:10px 12px!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:8px!important;background:rgba(15,23,42,.97)!important;color:#fff!important;box-shadow:0 12px 32px rgba(0,0,0,.24)!important;font:13px/1.55 -apple-system,BlinkMacSystemFont,sans-serif!important;pointer-events:none!important;opacity:0!important;transform:translateY(2px)!important;transition:opacity 120ms ease,transform 120ms ease!important;white-space:normal!important}',
      '#vc-tooltip.vc-vis{opacity:1!important;transform:translateY(0)!important}',
      '#vc-tooltip .vc-w{margin:0 0 4px!important;font-size:15px!important;font-weight:700!important;color:#bfdbfe!important}',
      '#vc-tooltip .vc-p{margin-left:6px!important;font-size:12px!important;font-weight:500!important;color:#c4b5fd!important}',
      '#vc-tooltip .vc-l{margin:3px 0!important;color:#f9fafb!important}',
      '#vc-tooltip .vc-e{margin-top:6px!important;color:#d1d5db!important;font-size:12px!important;line-height:1.6!important}',
      '#vc-panel{position:fixed!important;top:16px!important;right:16px!important;z-index:2147483646!important;width:360px!important;max-height:80vh!important;border-radius:12px!important;background:rgba(15,23,42,.97)!important;color:#f1f5f9!important;font:13px/1.6 -apple-system,BlinkMacSystemFont,sans-serif!important;box-shadow:0 20px 60px rgba(0,0,0,.4)!important;display:none!important;flex-direction:column!important;overflow:hidden!important}',
      '#vc-panel.open{display:flex!important}',
      '#vc-ph{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0}',
      '#vc-ph-title{font-size:14px;font-weight:600;color:#bfdbfe}',
      '#vc-ph-right{display:flex;align-items:center;gap:8px}',
      '#vc-tabs{display:flex;gap:4px}',
      '.vc-tab{padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;color:#94a3b8;border:1px solid transparent;background:transparent}',
      '.vc-tab.on{background:rgba(255,255,255,.08);color:#f1f5f9;border-color:rgba(255,255,255,.12)}',
      '#vc-pb{flex:1;overflow-y:auto;padding:12px 16px}',
      '#vc-close-btn{cursor:pointer;color:#64748b;font-size:20px;background:none;border:none;padding:2px 6px;line-height:1}',
      '#vc-close-btn:hover{color:#f1f5f9}',
      '.vc-item{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}',
      '.vc-item:last-child{border-bottom:none}',
      '.vc-iname{font-size:14px;font-weight:600;color:#bfdbfe}',
      '.vc-idef{font-size:11px;color:#94a3b8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}',
      '.vc-idel{cursor:pointer;color:#ef4444;font-size:16px;background:none;border:none;padding:2px 6px;opacity:.5;flex-shrink:0}',
      '.vc-idel:hover{opacity:1}',
      '.vc-empty{color:#64748b;font-size:13px;text-align:center;padding:32px 0}',
      '.vc-cnt{font-size:11px;color:#475569;margin-bottom:10px;text-align:right}',
      '.vc-card{border-radius:10px;border:1px solid rgba(255,255,255,.1);padding:28px 20px;text-align:center;min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center}',
      '.vc-cword{font-size:26px;font-weight:700;color:#bfdbfe;margin-bottom:4px}',
      '.vc-cpostag{font-size:13px;font-weight:400;color:#94a3b8;margin-left:8px}',
      '.vc-cph{font-size:12px;color:#64748b;margin-bottom:16px}',
      '.vc-chint{font-size:12px;color:#475569;margin-bottom:12px}',
      '.vc-cans{width:100%;text-align:left;display:none}',
      '.vc-cans.show{display:block}',
      '.vc-cm{margin-bottom:8px;font-size:13px;color:#e2e8f0}',
      '.vc-cpos{font-size:10px;font-weight:600;color:#c4b5fd;background:rgba(196,181,253,.12);padding:1px 5px;border-radius:3px;margin-right:4px}',
      '.vc-csep{border:none;border-top:1px solid rgba(255,255,255,.08);margin:5px 0}',
      '.vc-cex{font-size:11px;color:#64748b;margin-top:3px;font-style:italic}',
      '.vc-br{display:flex;gap:8px;margin-top:14px;justify-content:center}',
      '.vc-cbtn{padding:6px 16px;border-radius:7px;cursor:pointer;font-size:13px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);color:#f1f5f9}',
      '.vc-cbtn:hover{background:rgba(255,255,255,.12)}',
      '.vc-cbtn.p{background:#2563eb;border-color:#2563eb;color:#fff}',
      '.vc-cbtn.p:hover{background:#1d4ed8}',
      '#vc-badge{position:fixed!important;bottom:20px!important;right:20px!important;z-index:2147483645!important;width:42px!important;height:42px!important;border-radius:50%!important;background:#2563eb!important;color:#fff!important;font-size:18px!important;cursor:pointer!important;border:none!important;display:flex!important;align-items:center!important;justify-content:center!important;box-shadow:0 4px 16px rgba(37,99,235,.5)!important}',
      '#vc-badge:hover{background:#1d4ed8!important}'
    ].join('')
    document.documentElement.appendChild(s)
  }

  /* ─── Tooltip ─── */
  let T, A = 0

  function ensureTip() {
    if (T) return
    T = document.createElement('div')
    T.id = 'vc-tooltip'
    document.body.appendChild(T)
  }

  function show(span, x, y) {
    ensureTip(); T.textContent = ''
    const wDiv = document.createElement('div'); wDiv.className = 'vc-w'
    wDiv.textContent = span.dataset.vcWord || span.textContent || ''
    if (span.dataset.vcPos) {
      const p = document.createElement('span'); p.className = 'vc-p'
      p.textContent = span.dataset.vcPos; wDiv.appendChild(p)
    }
    const lDiv = document.createElement('div'); lDiv.className = 'vc-l'
    lDiv.textContent = span.dataset.vcZh || '暂无释义'
    T.append(wDiv, lDiv)
    if (span.dataset.vcEx) {
      const eDiv = document.createElement('div'); eDiv.className = 'vc-e'
      eDiv.textContent = span.dataset.vcEx; T.appendChild(eDiv)
    }
    T.classList.add('vc-vis'); posTip(x, y)
  }

  function posTip(x, y) {
    if (!T) return
    const p=8, o=14, r=T.getBoundingClientRect()
    let l=x+o, t=y+o
    if (l+r.width>innerWidth-p) l=x-r.width-o
    if (t+r.height>innerHeight-p) t=y-r.height-o
    T.style.left = Math.max(p,Math.min(l,innerWidth-r.width-p))+'px'
    T.style.top  = Math.max(p,Math.min(t,innerHeight-r.height-p))+'px'
  }

  function hide() { A=0; if(T) T.classList.remove('vc-vis') }

  /* ─── 事件 ─── */
  function bindEvents() {
    document.addEventListener('mouseover', function(e) {
      var t = e.target && e.target.closest && e.target.closest('.vc-word')
      if (t) { A=t; show(t, e.clientX, e.clientY) }
    }, true)
    document.addEventListener('mousemove', function(e) {
      if (A) posTip(e.clientX, e.clientY)
    }, true)
    document.addEventListener('mouseout', function(e) {
      var t = e.target && e.target.closest && e.target.closest('.vc-word')
      if (t && !(e.relatedTarget && t.contains(e.relatedTarget))) hide()
    }, true)
    document.addEventListener('dblclick', onDblClick, true)
  }

  /* ─── span ─── */
  function makeSpan(word, d) {
    var sp = document.createElement('span')
    sp.className = 'vc-word'
    sp.textContent = word
    sp.dataset.vcKey  = word.toLowerCase()
    sp.dataset.vcWord = d.word || word
    sp.dataset.vcPos  = (d.meanings||[]).map(function(m){return m.pos}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i}).join('/')
    sp.dataset.vcZh   = (d.meanings||[]).map(function(m){return m.def}).filter(Boolean).join('；')
    var wx = (d.meanings||[]).find(function(m){return m.ex})
    sp.dataset.vcEx   = wx ? (wx.ex + (wx.exZh ? ' / '+wx.exZh : '')) : ''
    return sp
  }

  function highlightSaved(db) {
    var words = Object.keys(db); if (!words.length) return
    collectTextNodes(document.body).forEach(function(n){ wrapNode(n, buildRegex(words), db) })
  }

  function buildRegex(words) {
    var esc = words.slice().sort(function(a,b){return b.length-a.length}).map(function(w){return w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})
    return new RegExp('(^|[^A-Za-z])('+esc.join('|')+')(?![A-Za-z])','gi')
  }

  function collectTextNodes(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: function(n){ return canProcess(n)?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT } })
    var nodes=[], n; while(n=walker.nextNode()) nodes.push(n); return nodes
  }

  function canProcess(n) {
    if (!n.nodeValue || !/[A-Za-z]/.test(n.nodeValue)) return false
    var p = n.parentElement
    return p && !SKIP_TAGS.has(p.tagName) && !p.closest(SKIP_SEL)
  }

  function wrapNode(node, re, db) {
    var s=node.nodeValue, frag=document.createDocumentFragment(), i=0, hit=false, m
    re.lastIndex=0
    while((m=re.exec(s))) {
      var pre=m[1]||'', wd=m[2]||'', st=m.index+pre.length, en=st+wd.length, key=wd.toLowerCase()
      if (db[key]) {
        if (st>i) frag.appendChild(document.createTextNode(s.slice(i,st)))
        frag.appendChild(makeSpan(wd,db[key])); i=en; hit=true
      }
      if (re.lastIndex<=m.index) re.lastIndex=m.index+(m[0].length||1)
    }
    if (!hit) return
    if (i<s.length) frag.appendChild(document.createTextNode(s.slice(i)))
    node.parentNode.replaceChild(frag,node)
  }

  /* ─── 删除 ─── */
  function delWord(k) {
    var db=dbLoad(); delete db[k]; dbSave(db)
    document.querySelectorAll('.vc-word').forEach(function(el){
      if (el.dataset.vcKey===k) el.parentNode.replaceChild(document.createTextNode(el.textContent),el)
    })
    renderList()
  }

  /* ─── 双击 ─── */
  async function onDblClick(e) {
    var el=e.target
    if (!el||SKIP_TAGS.has(el.tagName)) return
    if (el.closest && el.closest('#vc-panel,#vc-tooltip,#vc-badge')) return
    var word=(window.getSelection()&&window.getSelection().toString().trim())||''
    if (!word) {
      var range=document.caretRangeFromPoint&&document.caretRangeFromPoint(e.clientX,e.clientY)
      if (!range) return
      range.expand('word'); word=range.toString().trim()
    }
    word=word.replace(/[^A-Za-z'-]/g,'').trim()
    if (!word||!/^[A-Za-z]/.test(word)||word.length<2) return
    var key=word.toLowerCase(), db=dbLoad()
    if (db[key]) {
      var ex=document.querySelector('.vc-word[data-vc-key="'+key+'"]')
      if (ex) show(ex,e.clientX,e.clientY)
      else show(makeSpan(word,db[key]),e.clientX,e.clientY)
      return
    }
    e.preventDefault(); e.stopPropagation()
    ensureTip(); T.textContent=''
    var ld=document.createElement('div'); ld.className='vc-l'
    ld.textContent='正在查询 '+word+'…'
    T.appendChild(ld); T.classList.add('vc-vis'); posTip(e.clientX,e.clientY)
    var data=await fetchDef(word)
    db[key]=data||{word:word,phonetic:'',meanings:[{pos:'',def:'暂无释义',ex:'',exZh:''}]}
    dbSave(db)
    collectTextNodes(document.body).forEach(function(n){wrapNode(n,buildRegex([key]),db)})
    var ns=document.querySelector('.vc-word[data-vc-key="'+key+'"]')
    if (ns) show(ns,e.clientX,e.clientY)
    else show(makeSpan(word,db[key]),e.clientX,e.clientY)
  }

  /* ─── 面板 ─── */
  var activeTab='list', cardWords=[], cardIdx=0

  function mkEl(tag, cls, txt) {
    var e=document.createElement(tag)
    if (cls) e.className=cls
    if (txt!==undefined) e.textContent=txt
    return e
  }

  function ensurePanel() {
    if (document.getElementById('vc-panel')) return

    var panel=mkEl('div'); panel.id='vc-panel'

    var ph=mkEl('div'); ph.id='vc-ph'
    var title=mkEl('div'); title.id='vc-ph-title'; title.textContent='📖 我的生词本'
    var right=mkEl('div'); right.id='vc-ph-right'
    var tabs=mkEl('div'); tabs.id='vc-tabs'
    var t1=mkEl('div','vc-tab on','单词列表'); t1.dataset.t='list'
    var t2=mkEl('div','vc-tab','卡片复习');   t2.dataset.t='card'
    t1.onclick=function(){switchTab('list')}
    t2.onclick=function(){switchTab('card')}
    tabs.append(t1,t2)
    var closeBtn=mkEl('button'); closeBtn.id='vc-close-btn'; closeBtn.textContent='×'
    closeBtn.onclick=function(){ document.getElementById('vc-panel').classList.remove('open') }
    right.append(tabs,closeBtn)
    ph.append(title,right)

    var pb=mkEl('div'); pb.id='vc-pb'
    var lv=mkEl('div'); lv.id='vc-lv'
    var cv=mkEl('div'); cv.id='vc-cv'; cv.style.display='none'
    pb.append(lv,cv)

    panel.append(ph,pb)
    document.body.appendChild(panel)
  }

  function switchTab(tab) {
    activeTab=tab
    document.querySelectorAll('.vc-tab').forEach(function(t){
      t.classList.toggle('on', t.dataset.t===tab)
    })
    var lv=document.getElementById('vc-lv')
    var cv=document.getElementById('vc-cv')
    if(lv) lv.style.display=tab==='list'?'block':'none'
    if(cv) cv.style.display=tab==='card'?'block':'none'
    if(tab==='card') initCard(); else renderList()
  }

  function renderList() {
    var lv=document.getElementById('vc-lv')
    if (!lv) return
    while(lv.firstChild) lv.removeChild(lv.firstChild)
    var db=dbLoad(), keys=Object.keys(db)
    if (!keys.length) {
      var emp=mkEl('div','vc-empty','还没有收录任何单词'); lv.appendChild(emp); return
    }
    lv.appendChild(mkEl('div','vc-cnt','共 '+keys.length+' 个单词'))
    keys.sort().forEach(function(k){
      var d=db[k], def=(d.meanings||[]).map(function(m){return m.def}).filter(Boolean).join('；')||'暂无释义'
      var row=mkEl('div','vc-item')
      var info=mkEl('div'); info.style.minWidth='0'
      info.appendChild(mkEl('div','vc-iname',d.word||k))
      info.appendChild(mkEl('div','vc-idef',def))
      var del=mkEl('button','vc-idel','×')
      del.dataset.k=k
      del.onclick=function(e){ e.stopPropagation(); delWord(this.dataset.k) }
      row.append(info,del); lv.appendChild(row)
    })
  }

  function initCard() {
    cardWords=Object.keys(dbLoad()).sort(function(){return Math.random()-.5})
    cardIdx=0; renderCard()
  }

  function renderCard() {
    var cv=document.getElementById('vc-cv')
    if (!cv) return
    while(cv.firstChild) cv.removeChild(cv.firstChild)
    var db=dbLoad()
    if (!cardWords.length) { cv.appendChild(mkEl('div','vc-empty','生词本为空，先去双击添加单词吧')); return }
    var k=cardWords[cardIdx], d=db[k]
    if (!d) { nextCard(); return }
    var posStr=(d.meanings||[]).map(function(m){return m.pos}).filter(Boolean).filter(function(v,i,a){return a.indexOf(v)===i}).join('/')
    cv.appendChild(mkEl('div','vc-cnt',(cardIdx+1)+' / '+cardWords.length))
    var card=mkEl('div','vc-card')
    var cword=mkEl('div','vc-cword',d.word||k)
    if (posStr) { var pt=mkEl('span','vc-cpostag',posStr); cword.appendChild(pt) }
    card.appendChild(cword)
    if (d.phonetic) card.appendChild(mkEl('div','vc-cph',d.phonetic))
    var hint=mkEl('div','vc-chint','点击「显示释义」查看答案'); card.appendChild(hint)
    var ans=mkEl('div','vc-cans')
    ;(d.meanings||[]).forEach(function(m,i){
      if (i) ans.appendChild(mkEl('hr','vc-csep'))
      var cm=mkEl('div','vc-cm')
      if (m.pos) cm.appendChild(mkEl('span','vc-cpos',m.pos))
      cm.appendChild(document.createTextNode(m.def||'')); ans.appendChild(cm)
      if (m.ex) ans.appendChild(mkEl('div','vc-cex',m.ex+(m.exZh?' / '+m.exZh:'')))
    })
    card.appendChild(ans)
    var br=mkEl('div','vc-br')
    var rv=mkEl('button','vc-cbtn p','显示释义')
    rv.onclick=function(){ ans.classList.add('show'); hint.style.display='none' }
    var nx=mkEl('button','vc-cbtn','下一个 →')
    nx.onclick=nextCard
    br.append(rv,nx); card.appendChild(br); cv.appendChild(card)
  }

  function nextCard() { cardIdx=(cardIdx+1)%cardWords.length; renderCard() }

  /* ─── 浮动按钮 ─── */
  function buildBadge() {
    var b=document.createElement('button')
    b.id='vc-badge'; b.title='生词本'; b.textContent='📖'
    b.onclick=function(){
      ensurePanel()
      var panel=document.getElementById('vc-panel')
      panel.classList.toggle('open')
      if (panel.classList.contains('open')) {
        if (activeTab==='card') initCard(); else renderList()
      }
    }
    document.body.appendChild(b)
  }

  /* ─── 初始化 ─── */
  function boot() {
    injectCSS(); buildBadge(); bindEvents()
    var db=dbLoad()
    if (Object.keys(db).length) highlightSaved(db)
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true})
  else boot()

})();