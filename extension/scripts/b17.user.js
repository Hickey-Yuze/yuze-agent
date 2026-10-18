// ==UserScript==
// @name         便签
// @match        *://*/*
// @icon         data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nODAnIGhlaWdodD0nODUnIHg9JzEwJyB5PScxMCcgcng9JzYnIGZpbGw9JyNmNWM4NDInLz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzEnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAnIHN0b3AtY29sb3I9JyNmZmYnIHN0b3Atb3BhY2l0eT0nLjYnLz48c3RvcCBvZmZzZXQ9JzEnIHN0b3AtY29sb3I9JyNlOGEwMjAnIHN0b3Atb3BhY2l0eT0nMCcvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxyZWN0IHdpZHRoPSc4MCcgaGVpZ2h0PSc4NScgeD0nMTAnIHk9JzEwJyByeD0nNicgZmlsbD0ndXJsKCNnKScgb3BhY2l0eT0nLjMnLz48cmVjdCB3aWR0aD0nNDgnIGhlaWdodD0nNicgeD0nMjInIHk9JzMwJyByeD0nMycgZmlsbD0nI2M4N2QxMCcgb3BhY2l0eT0nLjUnLz48cmVjdCB3aWR0aD0nNDgnIGhlaWdodD0nNicgeD0nMjInIHk9JzQ0JyByeD0nMycgZmlsbD0nI2M4N2QxMCcgb3BhY2l0eT0nLjUnLz48cmVjdCB3aWR0aD0nMzInIGhlaWdodD0nNicgeD0nMjInIHk9JzU4JyByeD0nMycgZmlsbD0nI2M4N2QxMCcgb3BhY2l0eT0nLjUnLz48cG9seWdvbiBwb2ludHM9JzkwLDk1IDcwLDk1IDcwLDc1JyBmaWxsPScjZThhMDIwJy8+PC9zdmc+
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_xmlhttpRequest
// @connect      *
// @connect      api.github.com
// @connect      gist.githubusercontent.com
// @run-at       document-end
// ==/UserScript==

(function () {
  if (document.getElementById('__sn_root__')) return;

  const STORE_KEY = '__sticky_notes_v4__', FAB_POS_KEY = '__sn_fab_pos__', THEME_KEY = '__sn_theme__';
  const LOCK_KEY = '__sn_locks__', PIN_WIN_KEY = '__sn_pin_wins__', TAB_HEARTBEAT_KEY = '__sn_tab_hb__';
  const WEBDAV_KEY = '__sn_webdav__', WEBDAV_CFG_KEY = '__sn_webdav_cfg__', WEBDAV_LAST_KEY = '__sn_webdav_last__';
  const GITHUB_CFG_KEY = '__sn_github_cfg__', GITHUB_LAST_KEY = '__sn_github_last__', SYNC_PANEL_ID = '__sn_sync_panel__';
  const HEARTBEAT_MS = 1000, LOCK_TIMEOUT_MS = 3000, TAB_HB_INTERVAL = 2000, TAB_HB_TIMEOUT = 6000;
  const LONG_PRESS_MS = 600, GIST_SIZE_LIMIT = 9 * 1024 * 1024, NL = String.fromCharCode(10);

  const isGM = typeof GM_getValue !== 'undefined' && typeof GM_setValue !== 'undefined';
  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
  const TAB_ID = genId();

  const loadData = () => { try { return JSON.parse((isGM ? GM_getValue(STORE_KEY) : localStorage.getItem(STORE_KEY)) || '[]'); } catch { return []; } };
  const saveData = n => { const s = JSON.stringify(n); isGM ? GM_setValue(STORE_KEY, s) : localStorage.setItem(STORE_KEY, s); };
  const loadLocks = () => { try { return JSON.parse((isGM ? GM_getValue(LOCK_KEY) : localStorage.getItem(LOCK_KEY)) || '{}'); } catch { return {}; } };
  const saveLocks = l => { const s = JSON.stringify(l); isGM ? GM_setValue(LOCK_KEY, s) : localStorage.setItem(LOCK_KEY, s); };
  const loadPinWins = () => { try { return JSON.parse((isGM ? GM_getValue(PIN_WIN_KEY) : localStorage.getItem(PIN_WIN_KEY)) || '{}'); } catch { return {}; } };
  const savePinWins = o => { isGM ? GM_setValue(PIN_WIN_KEY, JSON.stringify(o)) : localStorage.setItem(PIN_WIN_KEY, JSON.stringify(o)); };
  const loadTabHb = () => { try { return JSON.parse(isGM ? (GM_getValue(TAB_HEARTBEAT_KEY) || '{}') : '{}'); } catch { return {}; } };
  const saveTabHb = o => { if (isGM) GM_setValue(TAB_HEARTBEAT_KEY, JSON.stringify(o)); };

  const loadWdvCfg = () => {
    try {
      const raw = isGM ? GM_getValue(WEBDAV_CFG_KEY, null) : null; if (raw) return JSON.parse(raw);
      const old = isGM ? GM_getValue(WEBDAV_KEY, null) : null;
      if (old) { const o = JSON.parse(old); const c = { url: o.url || '', remotePath: o.path || '/sticky-notes/notes.json', user: o.username || '', pass: o.password || '', autoSync: false, autoTrigger: false }; if (isGM) { GM_setValue(WEBDAV_CFG_KEY, JSON.stringify(c)); GM_setValue(WEBDAV_KEY, ''); } return c; }
    } catch {}
    return { url: '', remotePath: '', user: '', pass: '', autoSync: false, autoTrigger: false };
  };
  const saveWdvCfg = c => { if (isGM) GM_setValue(WEBDAV_CFG_KEY, JSON.stringify(c)); };
  const loadGhCfg = () => { try { const r = isGM ? GM_getValue(GITHUB_CFG_KEY, null) : null; return r ? JSON.parse(r) : { token: '', gistId: '', fname: 'sticky-notes.json', autoSync: false, autoTrigger: false }; } catch { return { token: '', gistId: '', fname: 'sticky-notes.json', autoSync: false, autoTrigger: false }; } };
  const saveGhCfg = c => { if (isGM) GM_setValue(GITHUB_CFG_KEY, JSON.stringify(c)); };
  let wdvCfg = loadWdvCfg(), ghCfg = loadGhCfg(), _syncing = false, _autoSync = null;

  const sysDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;
  const loadTheme = () => { try { const v = isGM ? GM_getValue(THEME_KEY, null) : localStorage.getItem(THEME_KEY); if (v === '1') return true; if (v === '0') return false; return sysDark(); } catch { return sysDark(); } };
  const saveTheme = () => { try { isGM ? GM_setValue(THEME_KEY, isDark ? '1' : '0') : localStorage.setItem(THEME_KEY, isDark ? '1' : '0'); } catch {} };
  const clearTheme = () => { try { isGM ? GM_setValue(THEME_KEY, '') : localStorage.removeItem(THEME_KEY); } catch {} };
  const refreshTabHb = () => { if (!isGM) return; const hb = loadTabHb(); hb[TAB_ID] = Date.now(); saveTabHb(hb); };
  const removeTabHb = () => { if (!isGM) return; const hb = loadTabHb(); delete hb[TAB_ID]; saveTabHb(hb); const now = Date.now(); if (!Object.values(hb).some(ts => now - ts < TAB_HB_TIMEOUT)) clearTheme(); };
  const isLockActive = (locks, id, myToken) => { if (!isGM) return false; const e = locks[id]; if (!e) return false; if (e.token === myToken) return false; if (Date.now() - e.heartbeat > LOCK_TIMEOUT_MS) return false; return true; };
  const acquireLock = id => { if (!isGM) return '__local__'; const l = loadLocks(), t = genId(); if (isLockActive(l, id, t)) return null; l[id] = { token: t, heartbeat: Date.now() }; saveLocks(l); return t; };
  const refreshHeartbeat = (id, token) => { if (!isGM) return; const l = loadLocks(); if (l[id]?.token !== token) return; l[id].heartbeat = Date.now(); saveLocks(l); };
  const releaseLock = (id, token) => { if (!isGM) return; const l = loadLocks(); if (l[id]?.token !== token) return; delete l[id]; saveLocks(l); };

  function validateWdvUrl(url) { if (!url) return false; try { const u = new URL(url); return u.protocol === 'https:'; } catch { return false; } }
  function safeB64(str) { try { const b = new TextEncoder().encode(str); let s = ''; b.forEach(v => s += String.fromCharCode(v)); return btoa(s); } catch { return ''; } }
  function davReq(method, url, headers, body) {
    return new Promise((resolve, reject) => { const opt = { method, url, headers: headers || {}, onload: resolve, onerror: reject, anonymous: !wdvCfg.user }; if (wdvCfg.user) opt.headers['Authorization'] = 'Basic ' + safeB64(wdvCfg.user + ':' + (wdvCfg.pass || '')); if (body != null) opt.data = body; try { GM_xmlhttpRequest(opt); } catch (e) { reject(e); } });
  }
  async function davEnsureDir(url) { const parts = new URL(url).pathname.split('/').filter(Boolean), origin = new URL(url).origin; let path = ''; for (const seg of parts) { path += '/' + seg; const dirUrl = origin + path + '/'; try { const r = await davReq('PROPFIND', dirUrl, { Depth: '0' }, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'); if (r.status >= 200 && r.status < 400) continue; } catch {} try { await davReq('MKCOL', dirUrl, {}); } catch {} } }
  async function davGet(url) { const r = await davReq('GET', url, { Accept: 'application/json' }); if (r.status === 200) return r.responseText; if (r.status === 404) return null; throw new Error('GET ' + r.status); }
  async function davPut(url, data) { await davReq('PUT', url, { 'Content-Type': 'application/json' }, data); }
  async function davCleanOrphans(dirUrl, keepFname) { try { const normDir = dirUrl.replace(/\/$/, '') + '/'; const res = await davReq('PROPFIND', normDir, { Depth: '1' }, '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>'); if (!res || res.status < 200 || res.status >= 400) return; const base = new URL(normDir), re = /<[^>]*href[^>]*>([^<]+)<\/[^>]*href>/gi; let mx; while ((mx = re.exec(res.responseText)) !== null) { let href = mx[1].trim(); try { href = decodeURIComponent(href); } catch {} if (href.endsWith('/')) continue; const f2 = href.split('/').pop(); if (!f2 || !f2.toLowerCase().endsWith('.json') || f2 === keepFname) continue; try { const full = /^https?:\/\//i.test(href) ? href : base.origin + (href.startsWith('/') ? href : '/' + href); await davReq('DELETE', full, {}); } catch {} } } catch {} }
  function ghReq(method, url, token, body) { return new Promise((resolve, reject) => { const h = { 'Authorization': 'token ' + token, 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' }; if (typeof GM_xmlhttpRequest === 'function') { const o = { method, url, headers: h, onload: resolve, onerror: reject }; if (body != null) o.data = body; try { GM_xmlhttpRequest(o); } catch (e) { reject(e); } } else { const i = { method, headers: h, credentials: 'omit' }; if (body != null) i.body = body; fetch(url, i).then(async r => resolve({ status: r.status, responseText: await r.text() })).catch(reject); } }); }
  async function ghGetGist(gistId, token, fname) { const r = await ghReq('GET', 'https://api.github.com/gists/' + gistId, token); if (r.status === 404) return null; if (r.status < 200 || r.status >= 300) throw new Error('GET gist ' + r.status); const d = JSON.parse(r.responseText), f = d.files && d.files[fname]; if (!f) return []; if (f.truncated && f.raw_url) { const raw = await ghReq('GET', f.raw_url, token); return JSON.parse(raw.responseText); } return JSON.parse(f.content || '[]'); }
  async function ghPatchGist(gistId, token, fname, content) { const r = await ghReq('PATCH', 'https://api.github.com/gists/' + gistId, token, JSON.stringify({ files: { [fname]: { content } } })); if (r.status < 200 || r.status >= 300) throw new Error('PATCH gist ' + r.status); }
  async function ghCreateGist(token, fname, content) { const r = await ghReq('POST', 'https://api.github.com/gists', token, JSON.stringify({ description: '便签同步数据（由脚本自动创建）', public: false, files: { [fname]: { content } } })); if (r.status !== 201) throw new Error('CREATE gist ' + r.status); return JSON.parse(r.responseText); }
  function mergeNotes(local, remote, lastSyncTs) { if (!Array.isArray(remote)) return { merged: local.slice(), changed: false }; const lm = new Map(local.map(v => [v.id, v])), rm = new Map(lm); remote.forEach(v => { const l = lm.get(v.id); if (l) { if (l.deletedAt && !v.deletedAt) rm.set(v.id, l); else if (!l.deletedAt && v.deletedAt) rm.set(v.id, v); else if ((v.updatedAt || 0) > (l.updatedAt || 0)) rm.set(v.id, v); } else { if (!lastSyncTs) rm.set(v.id, v); else { if (Math.max(v.createdAt || 0, v.updatedAt || 0) > lastSyncTs) rm.set(v.id, v); } } }); const GC = Date.now() - 30 * 24 * 60 * 60 * 1000, merged = [...rm.values()].filter(v => !v.deletedAt || v.deletedAt > GC); merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); const sig = new Set(local.map(v => v.id + '|' + (v.updatedAt || 0))); return { merged, changed: merged.some(v => !sig.has(v.id + '|' + (v.updatedAt || 0))) }; }

  function applyTheme() { document.querySelectorAll('.sn-win').forEach(w => isDark ? w.classList.add('dark') : w.classList.remove('dark')); document.querySelectorAll('.sn-capsule').forEach(c => isDark ? c.classList.add('dark') : c.classList.remove('dark')); renderPanel(); }
  function showToast(msg, ev) { const ex = document.getElementById('__sn_toast__'); if (ex) ex.remove(); const t = document.createElement('div'); t.id = '__sn_toast__'; t.textContent = msg; t.style.cssText = 'position:fixed;z-index:2147483647;padding:7px 14px;border-radius:20px;background:rgba(40,40,50,.88);color:#fff;font-size:12px;font-family:-apple-system,sans-serif;line-height:1.5;pointer-events:none;white-space:nowrap;box-shadow:0 4px 16px rgba(0,0,0,.25);opacity:0;transition:opacity .18s;'; document.body.appendChild(t); const TW = t.offsetWidth || 200, TH = t.offsetHeight || 32; let x = ev ? ev.clientX + 12 : window.innerWidth / 2 - TW / 2, y = ev ? ev.clientY - TH - 8 : window.innerHeight / 2 - TH / 2; if (x + TW > window.innerWidth - 8) x = window.innerWidth - TW - 8; if (y < 8) y = ev ? ev.clientY + 16 : 8; t.style.left = x + 'px'; t.style.top = y + 'px'; requestAnimationFrame(() => { t.style.opacity = '1'; }); setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2200); }
  const fmtTime = ts => { const d = new Date(ts), p = n => String(n).padStart(2, '0'); return (d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  function serializeEditor(editor) { const nodes = []; editor.childNodes.forEach(node => { if (node.nodeType === Node.TEXT_NODE) { if (node.textContent) nodes.push({ t: 'text', v: node.textContent }); } else if (node.nodeType === Node.ELEMENT_NODE) { if (node.tagName === 'IMG') nodes.push({ t: 'img', src: node.src, title: node.title || '' }); else if (node.tagName === 'BR') nodes.push({ t: 'br' }); else if (node.tagName === 'DIV' || node.tagName === 'P') { const inner = []; node.childNodes.forEach(c => { if (c.nodeType === Node.TEXT_NODE) { if (c.textContent) inner.push({ t: 'text', v: c.textContent }); } else if (c.nodeType === Node.ELEMENT_NODE) { if (c.tagName === 'IMG') inner.push({ t: 'img', src: c.src, title: c.title || '' }); else if (c.tagName === 'BR') inner.push({ t: 'br' }); else { const t = c.textContent; if (t) inner.push({ t: 'text', v: t }); } } }); nodes.push({ t: 'block', children: inner }); } else { const t = node.textContent; if (t) nodes.push({ t: 'text', v: t }); } } }); return nodes; }
  function deserializeToEditor(editor, nodes) { editor.textContent = ''; if (!nodes?.length) return; nodes.forEach(node => { if (node.t === 'text') editor.appendChild(document.createTextNode(node.v)); else if (node.t === 'br') editor.appendChild(document.createElement('br')); else if (node.t === 'img') { const img = document.createElement('img'); img.src = node.src; img.title = node.title || '点击查看大图'; editor.appendChild(img); } else if (node.t === 'block') { const div = document.createElement('div'); (node.children || []).forEach(c => { if (c.t === 'text') div.appendChild(document.createTextNode(c.v)); else if (c.t === 'br') div.appendChild(document.createElement('br')); else if (c.t === 'img') { const img = document.createElement('img'); img.src = c.src; img.title = c.title || '点击查看大图'; div.appendChild(img); } }); editor.appendChild(div); } }); }
  function getPlainText(nodes) { if (!nodes?.length) return ''; let t = ''; nodes.forEach(n => { if (n.t === 'text') t += n.v; else if (n.t === 'br') t += NL; else if (n.t === 'block') { (n.children || []).forEach(c => { if (c.t === 'text') t += c.v; else if (c.t === 'br') t += NL; }); t += NL; } }); return t.trim(); }
  function getFirstImg(nodes) { if (!nodes?.length) return null; for (const n of nodes) { if (n.t === 'img') return n.src; if (n.t === 'block') for (const c of (n.children || [])) if (c.t === 'img') return c.src; } return null; }
  function migrateNote(note) { if (note.nodes) return note; if (!note.html) return { ...note, nodes: [] }; const tmp = document.createElement('div'); try { tmp.appendChild(document.createRange().createContextualFragment(note.html)); } catch { tmp.textContent = note.html; } return { ...note, nodes: serializeEditor(tmp), html: undefined }; }
  function compressImage(dataUrl, maxW, quality) { return new Promise(resolve => { const img = new Image(); img.onload = () => { let w = img.width, h = img.height; if (w <= maxW) { resolve(dataUrl); return; } h = Math.round(h * maxW / w); w = maxW; const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h); resolve(c.toDataURL('image/jpeg', quality)); }; img.onerror = () => resolve(dataUrl); img.src = dataUrl; }); }

  const CSS_ALL = '#__sn_root__ *,#__sn_root__ *::before,#__sn_root__ *::after{box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC",sans-serif}#__sn_root__{position:fixed;z-index:2147483647}.sn-fab{width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f5c842,#e8a020);border:none;cursor:grab;font-size:20px;box-shadow:0 4px 16px rgba(232,160,32,.45);display:flex;align-items:center;justify-content:center;transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .18s;user-select:none}.sn-fab:hover{transform:scale(1.12);box-shadow:0 6px 22px rgba(232,160,32,.55)}.sn-fab:active{transform:scale(.96);cursor:grabbing}.sn-panel{position:fixed;width:288px;max-height:460px;background:#fff;border-radius:16px;box-shadow:0 2px 6px rgba(0,0,0,.06),0 12px 40px rgba(0,0,0,.14);border:1px solid rgba(0,0,0,.07);display:flex;flex-direction:column;overflow:hidden;transition:opacity .2s,transform .2s cubic-bezier(.34,1.2,.64,1);transform-origin:bottom right;z-index:2147483645}.sn-panel.hidden{opacity:0;pointer-events:none;transform:scale(.92) translateY(8px)}.sn-panel.dark{background:#1c1c28;border-color:rgba(255,255,255,.08);color:#e0e0f0}.sn-ph{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;flex-shrink:0;border-bottom:1px solid rgba(0,0,0,.06)}.sn-panel.dark .sn-ph{border-color:rgba(255,255,255,.06)}.sn-ph-left{display:flex;align-items:center;gap:7px}.sn-ph-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#f5c842,#e8a020);flex-shrink:0}.sn-ph-title{font-size:13px;font-weight:600;color:#222;letter-spacing:-.01em}.sn-panel.dark .sn-ph-title{color:#e0e0f0}.sn-ph-count{font-size:11px;color:#aaa;font-weight:400}.sn-ph-actions{display:flex;gap:5px;align-items:center}.sn-btn{border:none;border-radius:8px;cursor:pointer;font-size:13px;padding:4px 10px;font-weight:500;transition:all .15s;line-height:1.5;outline:none}.sn-btn-add{background:linear-gradient(135deg,#f5c842,#e8a020);color:#fff;box-shadow:0 2px 8px rgba(232,160,32,.35)}.sn-btn-add:hover{box-shadow:0 3px 12px rgba(232,160,32,.5);transform:translateY(-1px)}.sn-btn-theme{background:transparent;color:#888;font-size:14px;padding:3px 6px;border-radius:6px}.sn-btn-theme:hover{background:rgba(0,0,0,.06);color:#444}.sn-panel.dark .sn-btn-theme:hover{background:rgba(255,255,255,.08);color:#ccc}.sn-list{overflow-y:auto;flex:1;min-height:0;padding:8px;display:flex;flex-direction:column;gap:5px;scrollbar-width:none}.sn-list::-webkit-scrollbar{display:none}.sn-empty{text-align:center;padding:32px 0;font-size:12px;color:#bbb;line-height:1.8}.sn-empty-icon{font-size:28px;display:block;margin-bottom:6px;opacity:.5}.sn-card{border-radius:10px;padding:9px 11px;background:#fdfbf2;border:1px solid #ede8cc;cursor:pointer;transition:box-shadow .15s,transform .15s,background .15s;position:relative;overflow:hidden;flex-shrink:0}.sn-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#f5c842,#e8a020);border-radius:3px 0 0 3px}.sn-card:hover{box-shadow:0 3px 12px rgba(0,0,0,.1);transform:translateY(-1px);background:#fefcf0}.sn-panel.dark .sn-card{background:#252535;border-color:rgba(255,255,255,.08)}.sn-panel.dark .sn-card:hover{background:#2d2d42}.sn-card.sn-card-pinned{border-color:#f5c842;background:#fffbee}.sn-card.sn-card-pinned::before{background:linear-gradient(180deg,#f5c842,#e8a020)}.sn-panel.dark .sn-card.sn-card-pinned{background:#2a2618;border-color:rgba(245,200,66,.35)}.sn-card.sn-card-locked{cursor:not-allowed;background:#f5f5f5!important;border-color:#ddd!important}.sn-card.sn-card-locked:hover{transform:none;box-shadow:none}.sn-card.sn-card-locked::before{background:#ddd}.sn-panel.dark .sn-card.sn-card-locked{background:#1e1e2a!important;border-color:rgba(255,255,255,.05)!important}.sn-card.sn-card-locked .sn-card-preview{color:#bbb}.sn-panel.dark .sn-card.sn-card-locked .sn-card-preview{color:#555}.sn-card.sn-card-locked .sn-card-del{display:none}.sn-card-lock-badge{font-size:10px;color:#ccc;margin-right:4px;flex-shrink:0}.sn-card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}.sn-card-time{font-size:10px;color:#bbb;padding-left:6px}.sn-panel.dark .sn-card-time{color:#666}.sn-card-del{border:none;background:transparent;cursor:pointer;font-size:12px;padding:1px 4px;border-radius:4px;color:#ddd;transition:all .15s;opacity:0}.sn-card:hover .sn-card-del{opacity:1}.sn-card-del:hover{background:#fee;color:#e55}.sn-panel.dark .sn-card-del:hover{background:rgba(229,85,85,.15);color:#e55}.sn-card-preview{font-size:13.5px;line-height:1.55;color:#666;max-height:48px;overflow:hidden;word-break:break-word;padding-left:6px}.sn-panel.dark .sn-card-preview{color:#888}.sn-card-preview img{max-height:32px;border-radius:3px;vertical-align:middle;margin-right:3px}.sn-card-pin-badge{font-size:10px;color:#e8a020;margin-right:4px;flex-shrink:0}.sn-win{position:fixed;z-index:2147483630;width:320px;height:360px;min-width:220px;min-height:180px;border-radius:14px;background:#faf8f0;border:1px solid #e8e2c8;box-shadow:0 1px 2px rgba(0,0,0,.04),0 4px 12px rgba(0,0,0,.08),0 16px 40px rgba(0,0,0,.12);display:flex;flex-direction:column;overflow:hidden;resize:both;transition:box-shadow .2s}.sn-win:focus-within{box-shadow:0 1px 2px rgba(0,0,0,.05),0 6px 18px rgba(0,0,0,.1),0 20px 50px rgba(0,0,0,.16)}.sn-win.dark{background:#22222e;border-color:rgba(255,255,255,.1);color:#ddd8f0}.sn-win-bar{display:flex;align-items:center;justify-content:space-between;padding:6px 8px 6px 12px;background:#f0ece0;border-bottom:1px solid #e0dac4;cursor:move;flex-shrink:0;user-select:none}.sn-win.dark .sn-win-bar{background:#2a2a3a;border-color:rgba(255,255,255,.08)}.sn-win-bar-title{font-size:11px;font-weight:500;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;min-width:0;pointer-events:none}.sn-win.dark .sn-win-bar-title{color:#666}.sn-win-bar-actions{display:flex;gap:2px;align-items:center;flex-shrink:0;margin-left:8px}.sn-win-btn{border:none;background:transparent;cursor:pointer;font-size:12px;line-height:1;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;color:#aaa;transition:background .15s,color .15s;flex-shrink:0}.sn-win-btn:hover{background:rgba(0,0,0,.08);color:#555}.sn-win.dark .sn-win-btn{color:#555}.sn-win.dark .sn-win-btn:hover{background:rgba(255,255,255,.1);color:#aaa}.sn-win-btn[data-close]:hover{background:rgba(229,85,85,.12);color:#e55}.sn-win.dark .sn-win-btn[data-close]:hover{background:rgba(229,85,85,.2);color:#e77}.sn-win-btn[data-pin].active{color:#e8a020}.sn-win-btn[data-pin].active:hover{background:rgba(232,160,32,.12);color:#c87a00}.sn-win-body{flex:1;min-height:0;display:flex;flex-direction:column;overflow:hidden}.sn-win-body::-webkit-scrollbar{width:4px}.sn-win-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:4px}.sn-win.dark .sn-win-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1)}.sn-win-editor{flex:1;min-height:0;padding:13px 15px;font-size:16px;line-height:1.7;color:#333;outline:none;word-break:break-word;background:transparent;caret-color:#e8a020;overflow-y:auto}.sn-win.dark .sn-win-editor{color:#ddd8f0}.sn-win-editor:empty::before{content:attr(data-placeholder);color:#ccc;pointer-events:none}.sn-win.dark .sn-win-editor:empty::before{color:#444}.sn-win-editor img{max-width:calc(100% - 4px);max-height:220px;border-radius:7px;vertical-align:middle;display:inline-block;cursor:default;border:2px solid transparent;transition:border-color .15s,box-shadow .15s;margin:2px 0}.sn-win-editor img:hover{border-color:#f5c842;box-shadow:0 2px 10px rgba(245,200,66,.3)}.sn-win-status{display:flex;align-items:center;justify-content:space-between;padding:5px 13px;flex-shrink:0;border-top:1px solid rgba(0,0,0,.06);background:rgba(0,0,0,.02)}.sn-win.dark .sn-win-status{border-color:rgba(255,255,255,.06);background:rgba(255,255,255,.02)}.sn-win-saved{font-size:10px;color:#bbb}.sn-win.dark .sn-win-saved{color:#555}.sn-win-saved.flash{color:#7cb87c}.sn-win-wc{font-size:10px;color:#ccc}.sn-win.dark .sn-win-wc{color:#444}.sn-capsule{position:fixed;z-index:2147483631;height:28px;padding:0 12px;border-radius:14px;background:#f0ece0;border:1px solid #e0dac4;box-shadow:0 2px 8px rgba(0,0,0,.12);display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none;white-space:nowrap;transition:box-shadow .15s,background .15s}.sn-capsule:hover{box-shadow:0 3px 12px rgba(0,0,0,.18);background:#f5f0e0}.sn-capsule.dark{background:#2a2a3a;border-color:rgba(255,255,255,.1)}.sn-capsule.dark:hover{background:#323244}.sn-capsule-dot{width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#f5c842,#e8a020);flex-shrink:0}.sn-capsule-label{font-size:11px;color:#888;max-width:140px;overflow:hidden;text-overflow:ellipsis;pointer-events:none}.sn-capsule.dark .sn-capsule-label{color:#aaa}.sn-lightbox{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;cursor:default;backdrop-filter:blur(4px);animation:snFadeIn .15s ease}@keyframes snFadeIn{from{opacity:0}to{opacity:1}}.sn-lightbox img{max-width:88vw;max-height:88vh;border-radius:10px;box-shadow:0 20px 80px rgba(0,0,0,.6)}.sn-win-pinned{resize:none;border:1px solid rgba(245,200,66,.5);box-shadow:0 2px 12px rgba(232,160,32,.18)}.sn-win-pinned .sn-win-bar{display:none}.sn-win-pinned .sn-win-status{display:none}.sn-win-pinned .sn-win-editor{pointer-events:none;user-select:none;padding:10px 12px;font-size:16px}.sn-pin-mask{position:absolute;inset:0;z-index:10;border-radius:14px;background:rgba(245,200,66,0);cursor:grab;display:flex;align-items:center;justify-content:center;transition:background .2s}.sn-pin-mask:hover{background:rgba(245,200,66,.12)}.sn-pin-unlock{opacity:0;border:none;border-radius:50%;width:36px;height:36px;background:rgba(255,255,255,.92);box-shadow:0 2px 10px rgba(0,0,0,.18);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:opacity .2s,transform .15s;pointer-events:none;flex-shrink:0}.sn-pin-mask:hover .sn-pin-unlock{opacity:1;pointer-events:auto}.sn-pin-unlock:hover{transform:scale(1.12)}@keyframes snHighlight{0%{box-shadow:0 0 0 0 rgba(245,200,66,.8)}50%{box-shadow:0 0 0 10px rgba(245,200,66,.3)}100%{box-shadow:0 0 0 0 rgba(245,200,66,0)}}.sn-win-highlight{animation:snHighlight .5s ease 2}.sn-ctx-menu{position:fixed;z-index:2147483647;background:#fff;border:1px solid rgba(0,0,0,.1);border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,.18);padding:5px 0;min-width:136px;animation:snFadeIn .12s ease}.sn-ctx-menu.dark{background:#252535;border-color:rgba(255,255,255,.1)}.sn-ctx-sep{height:1px;background:rgba(0,0,0,.07);margin:4px 0}.sn-ctx-menu.dark .sn-ctx-sep{background:rgba(255,255,255,.07)}.sn-ctx-item{padding:8px 16px;font-size:13px;cursor:pointer;color:#333;transition:background .12s;white-space:nowrap;display:flex;align-items:center;gap:7px}.sn-ctx-item:hover{background:rgba(0,0,0,.05)}.sn-ctx-menu.dark .sn-ctx-item{color:#e0e0f0}.sn-ctx-menu.dark .sn-ctx-item:hover{background:rgba(255,255,255,.07)}.sn-ctx-item.danger{color:#e55}.sn-ctx-item.danger:hover{background:rgba(229,85,85,.07)}';
  const s = document.createElement('style'); s.id = '__sn_style_v4__'; s.textContent = CSS_ALL; document.head.appendChild(s);

  if (isGM) {
    const gs = document.createElement('style'); gs.id = '__sn_style_gm__';
    gs.textContent = '@keyframes snSyncCharge{0%,100%{box-shadow:0 4px 16px rgba(232,160,32,.45)}50%{box-shadow:0 4px 16px rgba(232,160,32,.45),0 0 0 8px rgba(232,160,32,.22)}}@keyframes snSyncOk{0%,100%{box-shadow:0 4px 16px rgba(232,160,32,.45)}50%{box-shadow:0 4px 16px rgba(232,160,32,.45),0 0 0 8px rgba(16,185,129,.4)}}@keyframes snSyncErr{0%,100%{box-shadow:0 4px 16px rgba(232,160,32,.45)}50%{box-shadow:0 4px 16px rgba(232,160,32,.45),0 0 0 8px rgba(239,68,68,.4)}}@keyframes snSyncWarn{0%,100%{box-shadow:0 4px 16px rgba(232,160,32,.45)}50%{box-shadow:0 4px 16px rgba(232,160,32,.45),0 0 0 8px rgba(245,158,11,.4)}}.sn-fab.sync-charging{animation:snSyncCharge .9s ease-in-out infinite!important;cursor:progress!important;transition:none}.sn-fab.sync-ok{animation:snSyncOk .9s ease-in-out;transition:none}.sn-fab.sync-err{animation:snSyncErr .9s ease-in-out;transition:none}.sn-fab.sync-warn{animation:snSyncWarn .9s ease-in-out;transition:none}.sn-sync-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;animation:snFadeIn .15s ease}.sn-sync-panel{background:#fff;border-radius:16px;padding:18px;width:300px;max-width:calc(100vw - 32px);box-shadow:0 8px 40px rgba(0,0,0,.22);font-family:-apple-system,sans-serif;color:#333}.sn-sync-panel.dark{background:#1c1c28;color:#e0e0f0}.sn-sync-title{font-size:15px;font-weight:700;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between}.sn-sync-close{width:28px;height:28px;border:none;background:transparent;color:#888;cursor:pointer;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center}.sn-sync-close:hover{background:rgba(0,0,0,.06)}.sn-sync-panel.dark .sn-sync-close:hover{background:rgba(255,255,255,.08)}.sn-sync-toggle{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:13px}.sn-sync-switch{position:relative;width:40px;height:22px;background:rgba(148,163,184,.3);border-radius:11px;cursor:pointer;transition:background .2s;flex-shrink:0;border:none;padding:0}.sn-sync-switch::after{content:"";position:absolute;left:2px;top:2px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 3px rgba(0,0,0,.2)}.sn-sync-switch.on{background:#e8a020}.sn-sync-switch.on::after{transform:translateX(18px)}.sn-sync-tabs{display:flex;gap:0;margin:8px 0 10px;border-radius:10px;overflow:hidden;border:1px solid rgba(0,0,0,.08)}.sn-sync-panel.dark .sn-sync-tabs{border-color:rgba(255,255,255,.08)}.sn-sync-tab{flex:1;height:32px;border:none;background:transparent;color:#888;cursor:pointer;font-size:13px;font-weight:500;transition:background .15s,color .15s}.sn-sync-tab.active{background:linear-gradient(135deg,#f5c842,#e8a020);color:#fff}.sn-sync-tab:not(.active):hover{background:rgba(0,0,0,.04)}.sn-sync-panel.dark .sn-sync-tab:not(.active):hover{background:rgba(255,255,255,.06)}.sn-sync-field{margin-bottom:10px}.sn-sync-label{font-size:11px;color:#888;margin-bottom:4px;display:block}.sn-sync-panel.dark .sn-sync-label{color:#666}.sn-sync-input{width:100%;height:36px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none;transition:border-color .15s;box-sizing:border-box;background:#fff;color:#333;padding:0 10px}.sn-sync-input:focus{border-color:#f5c842}.sn-sync-panel.dark .sn-sync-input{background:#252535;border-color:rgba(255,255,255,.1);color:#e0e0f0}.sn-sync-btns{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}.sn-sync-save{height:34px;padding:0 16px;border-radius:10px;border:none;background:linear-gradient(135deg,#f5c842,#e8a020);color:#fff;cursor:pointer;font-size:13px;font-weight:600}.sn-sync-now{height:34px;padding:0 12px;border-radius:10px;border:1px solid rgba(232,160,32,.3);background:transparent;color:#e8a020;cursor:pointer;font-size:13px}';
    document.head.appendChild(gs);
  }

  let notes = loadData().map(migrateNote);
  let isDark = loadTheme();
  let panelOpen = false;
  let zCounter = 2147483600;
  const openWindows = {};
  const getTopZ = () => ++zCounter;

  const loadFabPos = () => { try { const raw = isGM ? GM_getValue(FAB_POS_KEY, null) : localStorage.getItem(FAB_POS_KEY); if (raw) { const p = JSON.parse(raw); return { x: p.x, y: p.y }; } } catch {} return null; };
  const saveFabPos = (x, y) => { try { isGM ? GM_setValue(FAB_POS_KEY, JSON.stringify({ x, y })) : localStorage.setItem(FAB_POS_KEY, JSON.stringify({ x, y })); } catch {} };
  const _initPos = loadFabPos();
  let fabX = _initPos ? Math.max(0, Math.min(window.innerWidth - 46, _initPos.x)) : window.innerWidth - 70;
  let fabY = _initPos ? Math.max(0, Math.min(window.innerHeight - 46, _initPos.y)) : window.innerHeight - 70;
  function positionFab() { root.style.left = fabX + 'px'; root.style.top = fabY + 'px'; }
  function updatePanelPos() { const ph = panel.offsetHeight || 460; let left = fabX + 23 - 144, top = fabY - ph - 8; if (left + 288 > window.innerWidth - 4) left = window.innerWidth - 292; if (left < 4) left = 4; if (top < 4) top = fabY + 54; if (top + ph > window.innerHeight - 4) top = window.innerHeight - ph - 4; panel.style.left = left + 'px'; panel.style.top = top + 'px'; }

  const root = document.createElement('div'); root.id = '__sn_root__'; document.body.appendChild(root);
  const fab = document.createElement('button'); fab.className = 'sn-fab';
  fab.title = isGM ? '便签｜左键单击打开｜左键长按同步｜右键显示菜单' : '便签 (右键退出)';
  fab.textContent = '📝'; root.appendChild(fab);
  const panel = document.createElement('div'); panel.id = '__sn_panel__'; panel.className = 'sn-panel hidden'; document.body.appendChild(panel);
  const fileInp = document.createElement('input'); fileInp.type = 'file'; fileInp.accept = '.json'; fileInp.style.display = 'none'; document.body.appendChild(fileInp);
  positionFab();

  let tabHbTimer = null;
  if (isGM) { refreshTabHb(); tabHbTimer = setInterval(refreshTabHb, TAB_HB_INTERVAL); window.addEventListener('beforeunload', () => { clearInterval(tabHbTimer); removeTabHb(); }, { once: true }); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if (!isGM) return; const st = GM_getValue(THEME_KEY, null); if (st === '1' || st === '0') return; isDark = e.matches; applyTheme(); });

  function startSyncAnim() { fab.classList.remove('sync-ok','sync-err','sync-warn'); fab.classList.add('sync-charging'); }
  function stopSyncAnim(state) {
    const cls = state==='ok'?'sync-ok':state==='err'?'sync-err':state==='warn'?'sync-warn':null;
    const done = () => { fab.classList.remove('sync-charging'); if(cls){requestAnimationFrame(()=>{fab.classList.add(cls);let c=false;const fn=()=>{if(c)return;c=true;fab.classList.remove(cls);};fab.addEventListener('animationend',fn,{once:true});setTimeout(()=>{if(!c){c=true;fab.classList.remove(cls);}},1200);});} };
    if(fab.classList.contains('sync-charging')){let h=false;fab.addEventListener('animationend',()=>{if(h)return;h=true;done();},{once:true});setTimeout(()=>{if(!h){h=true;done();}},1200);}else done();
  }

  async function doSync(silent) {
    if(_syncing)return;if(!wdvCfg||!wdvCfg.autoSync||!validateWdvUrl(wdvCfg.url)){if(!silent)showToast('⚠️ 未启用 WebDAV 同步',null);return;}
    _syncing=true;const lastSyncTs=isGM?JSON.parse(GM_getValue(WEBDAV_LAST_KEY,'0')||'0'):0;
    startSyncAnim();if(!silent)showToast('🔄 WebDAV 同步中…',null);
    try{const base=wdvCfg.url.replace(/\/$/,''),rp=(wdvCfg.remotePath||'').replace(/^\/+|\/+$/g,'');const ls=rp.lastIndexOf('/'),dir=ls>=0?rp.slice(0,ls):'',fname=(ls>=0?rp.slice(ls+1):rp)||'notes.json';const syncDir=dir?base+'/'+dir:base,fileUrl=syncDir+'/'+fname;await davEnsureDir(syncDir);const rr=await davGet(fileUrl);let rn=[];if(rr){try{rn=JSON.parse(rr);}catch{}}if(!Array.isArray(rn))rn=[];const result=mergeNotes(notes,rn,lastSyncTs);notes=result.merged.map(migrateNote);saveData(notes);await davPut(fileUrl,JSON.stringify(notes));if(isGM)GM_setValue(WEBDAV_LAST_KEY,JSON.stringify(Date.now()));renderPanel();davCleanOrphans(syncDir,fname).catch(()=>{});if(!silent)showToast('✅ WebDAV 同步完成',null);stopSyncAnim('ok');}catch(e){console.error('[sn-webdav]',e);stopSyncAnim('err');if(!silent)showToast('❌ WebDAV 同步失败',null);}finally{_syncing=false;}
  }

  async function doGithubSync(silent) {
    if(_syncing)return;const token=ghCfg.token;if(!token){if(!silent)showToast('⚠️ 未配置 GitHub Token',null);return;}
    const fname=ghCfg.fname||'sticky-notes.json';_syncing=true;const lastSyncTs=isGM?JSON.parse(GM_getValue(GITHUB_LAST_KEY,'0')||'0'):0;
    startSyncAnim();if(!silent)showToast('🐙 GitHub 同步中…',null);
    try{let gistId=ghCfg.gistId,rn=[],needCreate=!gistId;if(gistId){const remote=await ghGetGist(gistId,token,fname);if(remote===null){needCreate=true;gistId='';}else rn=Array.isArray(remote)?remote:[];}
    let up=notes;const sz=JSON.stringify(notes).length;if(sz>GIST_SIZE_LIMIT){up=notes.filter(n=>!getFirstImg(n.nodes||[]));if(!silent)showToast('⚠️ 数据过大，已跳过含图片便签',null);}
    if(needCreate){const cr=await ghCreateGist(token,fname,JSON.stringify(up));gistId=cr.id;ghCfg={...ghCfg,gistId};saveGhCfg(ghCfg);if(!silent)showToast('🐙 已创建 Gist：'+gistId.slice(0,8)+'…',null);}else{const result=mergeNotes(notes,rn,lastSyncTs);notes=result.merged.map(migrateNote);saveData(notes);await ghPatchGist(gistId,token,fname,JSON.stringify(up));}
    if(isGM)GM_setValue(GITHUB_LAST_KEY,JSON.stringify(Date.now()));renderPanel();stopSyncAnim('ok');if(!silent)showToast('🐙 GitHub 同步完成',null);}catch(e){console.error('[sn-github]',e);stopSyncAnim('err');if(!silent)showToast('❌ GitHub 同步失败：'+(e.message||''),null);}finally{_syncing=false;}
  }

  function triggerAutoSync(){if(!isGM)return;if(wdvCfg&&wdvCfg.autoSync&&wdvCfg.autoTrigger&&wdvCfg.url){if(_autoSync)clearTimeout(_autoSync);_autoSync=setTimeout(()=>{_autoSync=null;doSync(true);},3000);return;}if(ghCfg&&ghCfg.autoSync&&ghCfg.autoTrigger&&ghCfg.token){if(_autoSync)clearTimeout(_autoSync);_autoSync=setTimeout(()=>{_autoSync=null;doGithubSync(true);},3000);}}

  (function(){let dragging=false,ox=0,oy=0,moved=false;const THRESH=4;
    if(isGM){let lpt=null,isLP=false;
      function startSync(){isLP=true;if(wdvCfg&&wdvCfg.autoSync&&validateWdvUrl(wdvCfg.url))doSync();else if(ghCfg&&ghCfg.autoSync&&ghCfg.token)doGithubSync();else{showToast('⚠️ 请先在右键菜单中配置并启用同步',null);startSyncAnim();stopSyncAnim('warn');}}
      fab.addEventListener('mousedown',e=>{if(e.button!==0)return;dragging=true;moved=false;ox=e.clientX-fabX;oy=e.clientY-fabY;fab.style.cursor='grabbing';e.preventDefault();lpt=setTimeout(()=>{if(!moved)startSync();},LONG_PRESS_MS);});
      document.addEventListener('mousemove',e=>{if(!dragging)return;const dx=e.clientX-ox-fabX,dy=e.clientY-oy-fabY;if(!moved&&Math.sqrt(dx*dx+dy*dy)>THRESH){moved=true;clearTimeout(lpt);}fabX=Math.max(0,Math.min(window.innerWidth-46,e.clientX-ox));fabY=Math.max(0,Math.min(window.innerHeight-46,e.clientY-oy));positionFab();if(panelOpen)updatePanelPos();});
      document.addEventListener('mouseup',e=>{if(!dragging)return;dragging=false;clearTimeout(lpt);fab.style.cursor='grab';if(isLP){isLP=false;return;}if(moved)saveFabPos(fabX,fabY);else{panelOpen=!panelOpen;renderPanel();}});
      fab.addEventListener('contextmenu',e=>{e.preventDefault();showFabContextMenu(e);});
    }else{
      fab.addEventListener('mousedown',e=>{if(e.button!==0)return;dragging=true;moved=false;ox=e.clientX-fabX;oy=e.clientY-fabY;fab.style.cursor='grabbing';e.preventDefault();});
      document.addEventListener('mousemove',e=>{if(!dragging)return;const dx=e.clientX-ox-fabX,dy=e.clientY-oy-fabY;if(!moved&&Math.sqrt(dx*dx+dy*dy)>THRESH)moved=true;fabX=Math.max(0,Math.min(window.innerWidth-46,e.clientX-ox));fabY=Math.max(0,Math.min(window.innerHeight-46,e.clientY-oy));positionFab();if(panelOpen)updatePanelPos();});
      document.addEventListener('mouseup',e=>{if(!dragging)return;dragging=false;fab.style.cursor='grab';if(moved)saveFabPos(fabX,fabY);else{if(e.button===2){destroy();return;}panelOpen=!panelOpen;renderPanel();}});
      fab.addEventListener('contextmenu',e=>{e.preventDefault();showFabContextMenu(e);});
    }
  })();

  if (isGM) {
    GM_addValueChangeListener(STORE_KEY, (key, oldVal, newVal, remote) => { if (!remote) return; try { notes = JSON.parse(newVal || '[]').map(migrateNote); } catch { notes = []; } if (panelOpen) renderPanel(); Object.keys(openWindows).forEach(wid => { if (wid.endsWith('_cap')) return; const fn = notes.find(n => n.id === wid); const win = openWindows[wid]; if (!win) return; if (!fn) { if (openWindows[wid + '_cap']) { openWindows[wid + '_cap'].remove(); delete openWindows[wid + '_cap']; } win.remove(); delete openWindows[wid]; return; } const ed = win.querySelector('.sn-win-editor'); if (ed && document.activeElement !== ed) deserializeToEditor(ed, fn.nodes || []); win.__snRemoteUpdated = true; }); });
    let lrt = null;
    GM_addValueChangeListener(LOCK_KEY, (key, oldVal, newVal, remote) => { if (!remote) return; let ch = false; try { const ol = JSON.parse(oldVal || '{}'), nl = JSON.parse(newVal || '{}'); for (const id of new Set([...Object.keys(ol), ...Object.keys(nl)])) if (ol[id]?.token !== nl[id]?.token) { ch = true; break; } } catch { ch = true; } if (!ch) return; clearTimeout(lrt); lrt = setTimeout(() => { try { const fr = JSON.parse(GM_getValue(STORE_KEY) || '[]').map(migrateNote); const ri = new Set(fr.map(n => n.id)); notes = [...fr, ...notes.filter(n => !ri.has(n.id))]; } catch {} if (panelOpen) renderPanel(); }, 120); });
    GM_addValueChangeListener(PIN_WIN_KEY, (key, oldVal, newVal, remote) => { if (!remote) return; try { const pw = JSON.parse(newVal || '{}'); Object.entries(pw).forEach(([id, open]) => { if (open) { if (!openWindows[id]) { const n = notes.find(n => n.id === id); if (n && n.pinned) openNoteWindow(id); } } else { if (openWindows[id]) { openWindows[id].remove(); delete openWindows[id]; } } }); } catch {} });
    GM_addValueChangeListener(THEME_KEY, (key, oldVal, newVal, remote) => { if (!remote) return; isDark = newVal === '1' ? true : newVal === '0' ? false : sysDark(); applyTheme(); });
  }

  function destroy() { document.querySelectorAll('.sn-win,.sn-capsule,.sn-lightbox').forEach(e => e.remove()); document.getElementById('__sn_root__')?.remove(); document.getElementById('__sn_panel__')?.remove(); document.getElementById('__sn_style_v4__')?.remove(); document.getElementById('__sn_ctx__')?.remove(); fileInp.remove(); if (isGM) { document.getElementById('__sn_sync_overlay__')?.remove(); document.getElementById('__sn_style_gm__')?.remove(); clearInterval(tabHbTimer); if (_autoSync) { clearTimeout(_autoSync); _autoSync = null; } savePinWins({}); removeTabHb(); } }
  function highlightPinnedWin(id) { const win = openWindows[id]; if (!win) return; win.classList.remove('sn-win-highlight'); void win.offsetWidth; win.classList.add('sn-win-highlight'); win.style.zIndex = getTopZ(); const r = win.getBoundingClientRect(); if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) { win.style.top = Math.max(8, Math.min(window.innerHeight - win.offsetHeight - 8, r.top)) + 'px'; win.style.left = Math.max(8, Math.min(window.innerWidth - win.offsetWidth - 8, r.left)) + 'px'; } win.addEventListener('animationend', () => win.classList.remove('sn-win-highlight'), { once: true }); }

  function showFabContextMenu(e) {
    document.getElementById('__sn_ctx__')?.remove();
    const menu = document.createElement('div'); menu.id = '__sn_ctx__'; menu.className = 'sn-ctx-menu' + (isDark ? ' dark' : '');
    const items = isGM ? [
      { icon: '☁', label: '同步', action: () => showSyncPanel() },
      { sep: true },
      { icon: '📤', label: '导出数据', action: () => doExport() },
      { icon: '📥', label: '导入数据', action: () => fileInp.click() },
      { sep: true },
      { icon: '✕', label: '关闭便签', action: () => destroy(), cls: 'danger' }
    ] : [
      { icon: '📤', label: '导出数据', action: () => doExport() },
      { icon: '📥', label: '导入数据', action: () => fileInp.click() },
      { sep: true },
      { icon: '✕', label: '关闭便签', action: () => destroy(), cls: 'danger' }
    ];
    items.forEach(item => { if (item.sep) { const sep = document.createElement('div'); sep.className = 'sn-ctx-sep'; menu.appendChild(sep); return; } const el = document.createElement('div'); el.className = 'sn-ctx-item' + (item.cls ? ' ' + item.cls : ''); const ic = document.createElement('span'); ic.textContent = item.icon; const lb = document.createElement('span'); lb.textContent = item.label; el.append(ic, lb); el.addEventListener('click', () => { menu.remove(); item.action(); }); menu.appendChild(el); });
    document.body.appendChild(menu); let x = e.clientX, y = e.clientY; const mw = menu.offsetWidth || 136, mh = menu.offsetHeight || 72; if (x + mw > window.innerWidth - 6) x = window.innerWidth - mw - 6; if (y + mh > window.innerHeight - 6) y = window.innerHeight - mh - 6; if (x < 6) x = 6; if (y < 6) y = 6; menu.style.left = x + 'px'; menu.style.top = y + 'px';
    const dismiss = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', dismiss, true); } }; setTimeout(() => document.addEventListener('mousedown', dismiss, true), 0);
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(notes.filter(n => !n.deletedAt), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sticky-notes-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📤 导出成功', null);
  }

  fileInp.addEventListener('change', () => {
    const file = fileInp.files && fileInp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) { showToast('⚠️ 文件格式错误', null); return; }
        const validItems = imported.filter(v => v && typeof v === 'object' && v.id).map(migrateNote);
        if (!validItems.length) { showToast('⚠️ 未找到有效数据', null); return; }
        const existingIds = new Set(notes.map(v => v.id));
        let added = 0, skipped = 0;
        validItems.forEach(v => {
          if (existingIds.has(v.id)) { skipped++; }
          else { notes.push(v); added++; }
        });
        notes.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        saveData(notes);
        triggerAutoSync();
        renderPanel();
        showToast('📥 导入完成：新增 ' + added + ' 条，跳过 ' + skipped + ' 条', null);
      } catch (err) {
        console.error('[sn-import]', err);
        showToast('⚠️ 导入失败，请检查文件格式', null);
      }
    };
    reader.readAsText(file);
    fileInp.value = '';
  });

  function showSyncPanel() {
    if (document.getElementById('__sn_sync_overlay__')) return;
    const overlay = document.createElement('div'); overlay.id = '__sn_sync_overlay__'; overlay.className = 'sn-sync-overlay';
    const p = document.createElement('div'); p.className = 'sn-sync-panel' + (isDark ? ' dark' : '');
    const title = document.createElement('div'); title.className = 'sn-sync-title'; title.appendChild(document.createTextNode('☁ 同步'));
    const closeBtn = document.createElement('button'); closeBtn.className = 'sn-sync-close'; closeBtn.textContent = '×'; closeBtn.addEventListener('click', () => overlay.remove()); title.appendChild(closeBtn); p.appendChild(title);
    const toggleRow = document.createElement('div'); toggleRow.className = 'sn-sync-toggle'; toggleRow.appendChild(document.createTextNode('启用同步'));
    const sw = document.createElement('button'); sw.className = 'sn-sync-switch' + (wdvCfg.autoSync || ghCfg.autoSync ? ' on' : ''); toggleRow.appendChild(sw); p.appendChild(toggleRow);
    const autoRow = document.createElement('div'); autoRow.className = 'sn-sync-toggle'; autoRow.title = '开启后每次新增、修改、删除都会自动同步'; autoRow.appendChild(document.createTextNode('自动同步'));
    const autoSw = document.createElement('button'); autoSw.className = 'sn-sync-switch' + (wdvCfg.autoTrigger || ghCfg.autoTrigger ? ' on' : ''); autoRow.appendChild(autoSw); p.appendChild(autoRow);
    const tabWdv = document.createElement('button'); tabWdv.className = 'sn-sync-tab active'; tabWdv.textContent = 'WebDAV'; tabWdv.dataset.tab = 'webdav';
    const tabGh = document.createElement('button'); tabGh.className = 'sn-sync-tab'; tabGh.textContent = 'GitHub Gist'; tabGh.dataset.tab = 'github';
    const tabs = document.createElement('div'); tabs.className = 'sn-sync-tabs'; tabs.append(tabWdv, tabGh); p.appendChild(tabs);
    const wdvGrp = document.createElement('div');
    const mkField = (label, type, ph, val) => { const f = document.createElement('div'); f.className = 'sn-sync-field'; const l = document.createElement('label'); l.className = 'sn-sync-label'; l.textContent = label; const i = document.createElement('input'); i.className = 'sn-sync-input'; i.type = type; i.placeholder = ph; i.value = val || ''; f.append(l, i); return { el: f, input: i }; };
    const fUrl = mkField('服务器地址', 'text', 'https://dav.example.com', wdvCfg.url); wdvGrp.appendChild(fUrl.el);
    const fPath = mkField('目录', 'text', '/sticky-notes/notes.json', wdvCfg.remotePath); wdvGrp.appendChild(fPath.el);
    const fUser = mkField('用户名', 'text', '用户名(可选)', wdvCfg.user); wdvGrp.appendChild(fUser.el);
    const fPass = mkField('密码', 'password', '密码(可选)', wdvCfg.pass); wdvGrp.appendChild(fPass.el);
    p.appendChild(wdvGrp);
    const ghGrp = document.createElement('div'); ghGrp.style.display = 'none';
    const fTok = mkField('Personal Access Token（需 gist 权限）', 'password', 'ghp_xxxxxxxxxxxx', ghCfg.token); ghGrp.appendChild(fTok.el);
    const fGid = mkField('Gist ID（留空则首次同步自动创建）', 'text', '32 位十六进制字符串', ghCfg.gistId); ghGrp.appendChild(fGid.el);
    const fFn = mkField('文件名', 'text', 'sticky-notes.json', ghCfg.fname); ghGrp.appendChild(fFn.el);
    p.appendChild(ghGrp);
    const btns = document.createElement('div'); btns.className = 'sn-sync-btns';
    const syncNowBtn = document.createElement('button'); syncNowBtn.className = 'sn-sync-now'; syncNowBtn.textContent = '立即同步';
    const saveBtn = document.createElement('button'); saveBtn.className = 'sn-sync-save'; saveBtn.textContent = '保存';
    btns.append(syncNowBtn, saveBtn); p.appendChild(btns);
    let curTab = 'webdav';
    function switchTab(tab) { curTab = tab; tabWdv.classList.toggle('active', tab === 'webdav'); tabGh.classList.toggle('active', tab === 'github'); const on = sw.classList.contains('on'); wdvGrp.style.display = (tab === 'webdav' && on) ? '' : 'none'; ghGrp.style.display = (tab === 'github' && on) ? '' : 'none'; }
    const initOn = wdvCfg.autoSync || ghCfg.autoSync;
    if (!initOn) { wdvGrp.style.display = 'none'; ghGrp.style.display = 'none'; tabs.style.display = 'none'; }
    tabs.addEventListener('click', ev => { const t = ev.target.closest('.sn-sync-tab'); if (t?.dataset.tab) switchTab(t.dataset.tab); });
    sw.addEventListener('click', () => { const on = !sw.classList.contains('on'); sw.classList.toggle('on', on); autoRow.style.display = on ? '' : 'none'; tabs.style.display = on ? '' : 'none'; switchTab(curTab); });
    if (!initOn) { autoRow.style.display = 'none'; }
    autoSw.addEventListener('click', () => autoSw.classList.toggle('on'));
    saveBtn.addEventListener('click', () => {
      if (curTab === 'webdav') { const url = fUrl.input.value.trim(); if (url && !validateWdvUrl(url)) { showToast('⚠️ 服务器地址无效', null); return; } wdvCfg = { url, remotePath: fPath.input.value.trim(), user: fUser.input.value.trim(), pass: fPass.input.value, autoSync: sw.classList.contains('on'), autoTrigger: autoSw.classList.contains('on') }; saveWdvCfg(wdvCfg); }
      else { const tok = fTok.input.value.trim(); if (!tok) { showToast('⚠️ Token 不能为空', null); return; } ghCfg = { token: tok, gistId: fGid.input.value.trim(), fname: fFn.input.value.trim() || 'sticky-notes.json', autoSync: sw.classList.contains('on'), autoTrigger: autoSw.classList.contains('on') }; saveGhCfg(ghCfg); }
      overlay.remove(); showToast('✅ 同步设置已保存', null);
    });
    syncNowBtn.addEventListener('click', () => {
      if (curTab === 'webdav') { const url = fUrl.input.value.trim(); if (!url || !validateWdvUrl(url)) { showToast('⚠️ 请先填写有效的服务器地址', null); return; } wdvCfg = { url, remotePath: fPath.input.value.trim(), user: fUser.input.value.trim(), pass: fPass.input.value, autoSync: sw.classList.contains('on'), autoTrigger: autoSw.classList.contains('on') }; saveWdvCfg(wdvCfg); overlay.remove(); doSync(); }
      else { const tok = fTok.input.value.trim(); if (!tok) { showToast('⚠️ 请先填写 Token', null); return; } ghCfg = { token: tok, gistId: fGid.input.value.trim(), fname: fFn.input.value.trim() || 'sticky-notes.json', autoSync: sw.classList.contains('on'), autoTrigger: autoSw.classList.contains('on') }; saveGhCfg(ghCfg); overlay.remove(); doGithubSync(); }
    });
    overlay.appendChild(p); document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const escH = e => { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', escH); } }; document.addEventListener('keydown', escH);
    const pad2 = 10, pw = 300, ph2 = 450; overlay.style.cssText = '';
    p.style.position = 'fixed'; p.style.left = Math.max(pad2, window.innerWidth / 2 - pw / 2) + 'px'; p.style.top = Math.max(pad2, window.innerHeight / 2 - ph2 / 2) + 'px';
  }

  function renderPanel() {
    panel.textContent = ''; panel.className = 'sn-panel' + (panelOpen ? '' : ' hidden') + (isDark ? ' dark' : ''); if (panelOpen) updatePanelPos();
    const ph = document.createElement('div'); ph.className = 'sn-ph';
    const phLeft = document.createElement('div'); phLeft.className = 'sn-ph-left';
    const phDot = document.createElement('div'); phDot.className = 'sn-ph-dot';
    const phTitle = document.createElement('span'); phTitle.className = 'sn-ph-title'; phTitle.textContent = '便签';
    const visibleNotes = notes.filter(n => !n.deletedAt);
    const phCount = document.createElement('span'); phCount.className = 'sn-ph-count'; phCount.textContent = visibleNotes.length + ' 条';
    phLeft.append(phDot, phTitle, phCount);
    const phActions = document.createElement('div'); phActions.className = 'sn-ph-actions';
    const themeBtn = document.createElement('button'); themeBtn.className = 'sn-btn sn-btn-theme'; themeBtn.title = '切换主题'; themeBtn.textContent = isDark ? '☀️' : '🌙';
    const addBtn = document.createElement('button'); addBtn.className = 'sn-btn sn-btn-add'; addBtn.textContent = '＋ 新建';
    phActions.append(themeBtn, addBtn); ph.append(phLeft, phActions); panel.appendChild(ph);
    themeBtn.addEventListener('click', () => { isDark = !isDark; saveTheme(); applyTheme(); });
    addBtn.addEventListener('click', createNote);
    const list = document.createElement('div'); list.className = 'sn-list';
    const currentLocks = loadLocks();
    const sortedNotes = [...[...visibleNotes].reverse().filter(n => n.pinned), ...[...visibleNotes].reverse().filter(n => !n.pinned)];
    if (!sortedNotes.length) { const empty = document.createElement('div'); empty.className = 'sn-empty'; const emptyIcon = document.createElement('span'); emptyIcon.className = 'sn-empty-icon'; emptyIcon.textContent = '🗒️'; empty.append(emptyIcon, '暂无便签', document.createElement('br'), '点击「＋ 新建」开始记录'); list.appendChild(empty); }
    else {
      sortedNotes.forEach(note => {
        const lockedByOther = isGM && isLockActive(currentLocks, note.id, '__probe__') && !note.pinned;
        const card = document.createElement('div'); card.className = 'sn-card' + (note.pinned ? ' sn-card-pinned' : '') + (lockedByOther ? ' sn-card-locked' : '');
        const nodes = note.nodes || []; const textSnippet = getPlainText(nodes).slice(0, 55); const firstImgSrc = getFirstImg(nodes);
        const cardTop = document.createElement('div'); cardTop.className = 'sn-card-top';
        const cardTimeWrap = document.createElement('div'); cardTimeWrap.style.cssText = 'display:flex;align-items:center;padding-left:6px;gap:3px;min-width:0;flex:1';
        if (lockedByOther) { const lb = document.createElement('span'); lb.className = 'sn-card-lock-badge'; lb.textContent = '🔒'; cardTimeWrap.appendChild(lb); }
        if (note.pinned) { const b = document.createElement('span'); b.className = 'sn-card-pin-badge'; b.textContent = '📌'; cardTimeWrap.appendChild(b); }
        const cardTime = document.createElement('span'); cardTime.className = 'sn-card-time'; cardTime.style.paddingLeft = '0'; cardTime.textContent = fmtTime(note.updatedAt || note.createdAt); cardTimeWrap.appendChild(cardTime);
        const cardDel = document.createElement('button'); cardDel.className = 'sn-card-del'; cardDel.dataset.del = ''; cardDel.title = '删除'; cardDel.textContent = '✕';
        cardTop.append(cardTimeWrap, cardDel);
        const preview = document.createElement('div'); preview.className = 'sn-card-preview';
        if (firstImgSrc) { const thumb = document.createElement('img'); thumb.src = firstImgSrc; preview.appendChild(thumb); }
        preview.appendChild(document.createTextNode(textSnippet || (firstImgSrc ? '' : '（空便签）')));
        card.append(cardTop, preview);
        card.addEventListener('click', e => { if (e.target.closest('[data-del]')) return; if (lockedByOther) return; if (note.pinned && openWindows[note.id]) highlightPinnedWin(note.id); else openNoteWindow(note.id); });
        cardDel.addEventListener('click', e => { e.stopPropagation(); if (lockedByOther) return; if (openWindows[note.id]) { openWindows[note.id].remove(); delete openWindows[note.id]; } if (openWindows[note.id + '_cap']) { openWindows[note.id + '_cap'].remove(); delete openWindows[note.id + '_cap']; } note.deletedAt = Date.now(); const idx = notes.findIndex(n => n.id === note.id); if (idx !== -1) notes[idx] = note; saveData(notes); triggerAutoSync(); renderPanel(); });
        list.appendChild(card);
      });
    }
    panel.appendChild(list); if (panelOpen) requestAnimationFrame(updatePanelPos);
  }

  function createNote() { const note = { id: genId(), nodes: [], createdAt: Date.now(), updatedAt: Date.now() }; notes.push(note); saveData(notes); triggerAutoSync(); renderPanel(); openNoteWindow(note.id); }

  function openNoteWindow(id) {
    if (openWindows[id]) { const win = openWindows[id]; win.style.zIndex = getTopZ(); const note = notes.find(n => n.id === id); if (note?.pinned) highlightPinnedWin(id); else win.querySelector('.sn-win-editor')?.focus(); return; }
    const note = notes.find(n => n.id === id); if (!note) return;
    let myToken = note.pinned ? null : acquireLock(id); if (!note.pinned && !myToken) { showToast('🔒 其他标签页正在编辑，请稍后再试', null); return; }
    const win = document.createElement('div'); win.className = 'sn-win' + (isDark ? ' dark' : '');
    const offset = Object.keys(openWindows).filter(k => !k.endsWith('_cap')).length * 28;
    win.style.top = (80 + offset) + 'px'; win.style.left = (80 + offset) + 'px'; win.style.zIndex = getTopZ(); win.style.position = 'fixed';
    if (note.winWidth) win.style.width = note.winWidth + 'px'; if (note.winHeight) win.style.height = note.winHeight + 'px';
    if (note.winTop != null) win.style.top = note.winTop + 'px'; if (note.winLeft != null) win.style.left = note.winLeft + 'px';
    win.__snRemoteUpdated = false; document.body.appendChild(win); openWindows[id] = win;
    let heartbeatTimer = (isGM && myToken && myToken !== '__local__') ? setInterval(() => refreshHeartbeat(id, myToken), HEARTBEAT_MS) : null;
    const bar = document.createElement('div'); bar.className = 'sn-win-bar';
    const barTitle = document.createElement('span'); barTitle.className = 'sn-win-bar-title'; barTitle.textContent = '📝 便签';
    const barActions = document.createElement('div'); barActions.className = 'sn-win-bar-actions';
    const pinBtn = document.createElement('button'); pinBtn.className = 'sn-win-btn' + (note.pinned ? ' active' : ''); pinBtn.dataset.pin = ''; pinBtn.title = note.pinned ? '已固定' : '固定到页面'; pinBtn.textContent = '📌';
    const minBtn = document.createElement('button'); minBtn.className = 'sn-win-btn'; minBtn.dataset.minimize = ''; minBtn.title = '最小化';
    const minSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); minSvg.setAttribute('width', '10'); minSvg.setAttribute('height', '2'); minSvg.setAttribute('viewBox', '0 0 10 2'); minSvg.setAttribute('fill', 'none'); const minRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); minRect.setAttribute('width', '10'); minRect.setAttribute('height', '2'); minRect.setAttribute('rx', '1'); minRect.setAttribute('fill', 'currentColor'); minSvg.appendChild(minRect); minBtn.appendChild(minSvg);
    const closeBtn = document.createElement('button'); closeBtn.className = 'sn-win-btn'; closeBtn.dataset.close = ''; closeBtn.title = '关闭';
    const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); closeSvg.setAttribute('width', '10'); closeSvg.setAttribute('height', '10'); closeSvg.setAttribute('viewBox', '0 0 10 10'); closeSvg.setAttribute('fill', 'none'); const closePath = document.createElementNS('http://www.w3.org/2000/svg', 'path'); closePath.setAttribute('d', 'M1 1l8 8M9 1l-8 8'); closePath.setAttribute('stroke', 'currentColor'); closePath.setAttribute('stroke-width', '1.5'); closePath.setAttribute('stroke-linecap', 'round'); closeSvg.appendChild(closePath); closeBtn.appendChild(closeSvg);
    barActions.append(pinBtn, minBtn, closeBtn); bar.append(barTitle, barActions); win.appendChild(bar);
    const body = document.createElement('div'); body.className = 'sn-win-body';
    const editor = document.createElement('div'); editor.className = 'sn-win-editor'; editor.contentEditable = 'true'; editor.dataset.placeholder = '开始记录… 支持粘贴图片';
    deserializeToEditor(editor, note.nodes || []); body.appendChild(editor); win.appendChild(body);
    const status = document.createElement('div'); status.className = 'sn-win-status';
    const savedEl = document.createElement('span'); savedEl.className = 'sn-win-saved'; savedEl.textContent = '创建于 ' + fmtTime(note.createdAt);
    const wcEl = document.createElement('span'); wcEl.className = 'sn-win-wc'; wcEl.textContent = '0 字';
    status.append(savedEl, wcEl); win.appendChild(status);
    let maskEl = null;
    const updateWc = () => { wcEl.textContent = (editor.textContent || '').trim().length + ' 字'; }; updateWc();
    const ro = new ResizeObserver(() => { if (note.pinned) return; const w = win.offsetWidth, h = win.offsetHeight; if (w > 0 && h > 0) { note.winWidth = w; note.winHeight = h; const idx = notes.findIndex(n => n.id === id); if (idx !== -1) notes[idx] = note; saveData(notes); } }); ro.observe(win);
    let saveTimer;
    function persistNote(triggerRender = true) {
      if (win.__snRemoteUpdated && document.activeElement !== editor) return;
      note.nodes = serializeEditor(editor); note.updatedAt = Date.now(); note.winWidth = win.offsetWidth; note.winHeight = win.offsetHeight; note.winTop = parseInt(win.style.top) || null; note.winLeft = parseInt(win.style.left) || null;
      const idx = notes.findIndex(n => n.id === id); if (idx !== -1) notes[idx] = note; saveData(notes);
      savedEl.textContent = '已保存 ' + fmtTime(Date.now()); savedEl.classList.add('flash'); setTimeout(() => savedEl.classList.remove('flash'), 1200);
      if (triggerRender && panelOpen) renderPanel(); triggerAutoSync();
    }
    editor.addEventListener('input', () => { win.__snRemoteUpdated = false; updateWc(); clearTimeout(saveTimer); saveTimer = setTimeout(() => persistNote(true), 600); });
    editor.addEventListener('paste', e => {
      const items = Array.from(e.clipboardData?.items || []); const imgItem = items.find(i => i.type.startsWith('image/'));
      if (!imgItem) return; e.preventDefault();
      const reader = new FileReader();
      reader.onload = async ev => {
        editor.focus();
        const compressed = await compressImage(ev.target.result, 800, 0.6);
        const img = document.createElement('img'); img.src = compressed; img.title = '点击查看大图';
        const sel = window.getSelection();
        if (sel?.rangeCount > 0) { const range = sel.getRangeAt(0); if (editor.contains(range.commonAncestorContainer)) { range.deleteContents(); range.insertNode(img); range.setStartAfter(img); range.collapse(true); sel.removeAllRanges(); sel.addRange(range); } else editor.appendChild(img); } else editor.appendChild(img);
        win.__snRemoteUpdated = false; updateWc(); persistNote(true);
      };
      reader.readAsDataURL(imgItem.getAsFile());
    });
    editor.addEventListener('click', e => { if (e.target.tagName === 'IMG') showLightbox(e.target.src); });
    function enterPinMode() {
      persistNote(true); note.pinned = true; const idx = notes.findIndex(n => n.id === id); if (idx !== -1) notes[idx] = note; saveData(notes);
      if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; } if (myToken && myToken !== '__local__') { releaseLock(id, myToken); myToken = null; }
      win.classList.add('sn-win-pinned'); pinBtn.classList.add('active'); pinBtn.title = '已固定'; editor.contentEditable = 'false';
      maskEl = document.createElement('div'); maskEl.className = 'sn-pin-mask'; const unlockBtn = document.createElement('button'); unlockBtn.className = 'sn-pin-unlock'; unlockBtn.title = '解除固定'; unlockBtn.textContent = '🔓'; maskEl.appendChild(unlockBtn); win.appendChild(maskEl);
      makeDraggable(win, maskEl); unlockBtn.addEventListener('click', e => { e.stopPropagation(); exitPinMode(); });
      if (isGM) { const pw = loadPinWins(); pw[id] = true; savePinWins(pw); } if (panelOpen) renderPanel();
    }
    function exitPinMode() {
      note.pinned = false; const idx = notes.findIndex(n => n.id === id); if (idx !== -1) notes[idx] = note; saveData(notes);
      win.classList.remove('sn-win-pinned'); pinBtn.classList.remove('active'); pinBtn.title = '固定到页面'; editor.contentEditable = 'true';
      if (maskEl) { maskEl.remove(); maskEl = null; }
      if (isGM) { const pw = loadPinWins(); pw[id] = false; savePinWins(pw); }
      const newToken = acquireLock(id); if (!newToken) { showToast('🔒 其他标签页正在编辑，无法解除固定', null); enterPinMode(); return; }
      myToken = newToken; heartbeatTimer = (isGM && myToken && myToken !== '__local__') ? setInterval(() => refreshHeartbeat(id, myToken), HEARTBEAT_MS) : null;
      editor.focus(); if (panelOpen) renderPanel(); triggerAutoSync();
    }
    pinBtn.addEventListener('click', () => { note.pinned ? exitPinMode() : enterPinMode(); });
    if (note.pinned) {
      win.classList.add('sn-win-pinned'); pinBtn.classList.add('active'); pinBtn.title = '已固定'; editor.contentEditable = 'false';
      maskEl = document.createElement('div'); maskEl.className = 'sn-pin-mask'; const unlockBtn = document.createElement('button'); unlockBtn.className = 'sn-pin-unlock'; unlockBtn.title = '解除固定'; unlockBtn.textContent = '🔓'; maskEl.appendChild(unlockBtn); win.appendChild(maskEl);
      makeDraggable(win, maskEl); unlockBtn.addEventListener('click', e => { e.stopPropagation(); exitPinMode(); });
    }
    let minimized = false, capsuleEl = null;
    minBtn.addEventListener('click', () => {
      if (minimized) return; minimized = true; persistNote(false);
      const rect = win.getBoundingClientRect(); win.style.display = 'none';
      const cap = document.createElement('div'); cap.className = 'sn-capsule' + (isDark ? ' dark' : '');
      cap.style.top = rect.top + 'px'; cap.style.left = rect.left + 'px'; cap.style.zIndex = getTopZ();
      const capDot = document.createElement('div'); capDot.className = 'sn-capsule-dot';
      const capLabel = document.createElement('span'); capLabel.className = 'sn-capsule-label'; capLabel.textContent = getPlainText(note.nodes || []).slice(0, 18) || '便签';
      cap.append(capDot, capLabel); document.body.appendChild(cap); openWindows[id + '_cap'] = cap; capsuleEl = cap;
      makeDraggableWithClick(cap, () => { const capRect = cap.getBoundingClientRect(); cap.remove(); delete openWindows[id + '_cap']; win.style.left = capRect.left + 'px'; win.style.top = capRect.top + 'px'; win.style.display = ''; minimized = false; capsuleEl = null; win.style.zIndex = getTopZ(); if (!note.pinned) editor.focus(); });
    });
    closeBtn.addEventListener('click', () => {
      persistNote(false); if (heartbeatTimer) clearInterval(heartbeatTimer); if (myToken && myToken !== '__local__') releaseLock(id, myToken);
      if (note.pinned && isGM) { const pw = loadPinWins(); pw[id] = false; savePinWins(pw); }
      ro.disconnect(); if (capsuleEl) { capsuleEl.remove(); delete openWindows[id + '_cap']; } if (maskEl) { maskEl.remove(); maskEl = null; }
      win.remove(); delete openWindows[id]; if (panelOpen) renderPanel();
    });
    window.addEventListener('beforeunload', () => { if (heartbeatTimer) clearInterval(heartbeatTimer); if (myToken && myToken !== '__local__') releaseLock(id, myToken); }, { once: true });
    makeDraggable(win, bar, () => persistNote(false));
    win.addEventListener('mousedown', () => { win.style.zIndex = getTopZ(); });
    if (!note.pinned) editor.focus();
  }

  function makeDraggable(el, handle, onDragEnd) { handle.addEventListener('mousedown', e => { if (e.target.closest('button')) return; const rect = el.getBoundingClientRect(); const ox = e.clientX - rect.left, oy = e.clientY - rect.top; const onMove = e => { el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - ox)) + 'px'; el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - oy)) + 'px'; }; const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (onDragEnd) onDragEnd(); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); e.preventDefault(); }); }
  function makeDraggableWithClick(el, onTap) { const THRESH = 4; el.addEventListener('mousedown', e => { const startX = e.clientX, startY = e.clientY; const rect = el.getBoundingClientRect(); const ox = e.clientX - rect.left, oy = e.clientY - rect.top; let isDragging = false; const onMove = e => { const dx = e.clientX - startX, dy = e.clientY - startY; if (!isDragging && Math.sqrt(dx * dx + dy * dy) > THRESH) isDragging = true; if (isDragging) { el.style.left = Math.max(0, Math.min(window.innerWidth - el.offsetWidth, e.clientX - ox)) + 'px'; el.style.top = Math.max(0, Math.min(window.innerHeight - el.offsetHeight, e.clientY - oy)) + 'px'; } }; const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (!isDragging) onTap(); }; document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp); e.preventDefault(); }); }
  function showLightbox(src) { const box = document.createElement('div'); box.className = 'sn-lightbox'; const img = document.createElement('img'); img.src = src; box.appendChild(img); box.addEventListener('click', () => box.remove()); const esc = e => { if (e.key === 'Escape') { box.remove(); document.removeEventListener('keydown', esc); } }; document.addEventListener('keydown', esc); document.body.appendChild(box); }

  renderPanel();
  notes.filter(n => n.pinned && !n.deletedAt).forEach(n => openNoteWindow(n.id));

})();