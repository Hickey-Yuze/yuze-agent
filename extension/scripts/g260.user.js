async function run(args) {
  'use strict';

  var CONFIG = {
    colors: ['#ffeb3b', '#4caf50', '#2196f3', '#ff9800', '#e91e63'],
    storageKey: 'tabbit-notes'
  };

  /* 清理旧版本 */
  function cleanup() {
    var ids = ['note-assistant-btn', 'note-panel', 'note-assistant-styles', 'note-color-picker'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el) el.remove();
    }
  }

  /* 注入样式 */
  function injectStyles() {
    var s = document.createElement('style');
    s.id = 'note-assistant-styles';
    s.textContent =
      '#note-assistant-btn{position:fixed!important;top:20px!important;right:20px!important;' +
      'width:50px!important;height:50px!important;min-width:50px!important;min-height:50px!important;' +
      'background:linear-gradient(135deg,#667eea,#764ba2)!important;border-radius:50%!important;' +
      'cursor:pointer!important;z-index:2147483647!important;display:flex!important;' +
      'align-items:center!important;justify-content:center!important;font-size:24px!important;' +
      'box-shadow:0 4px 15px rgba(0,0,0,.35)!important;transition:transform .25s ease!important;' +
      'opacity:1!important;visibility:visible!important;pointer-events:auto!important;color:#fff!important;' +
      'text-shadow:none!important;line-height:1!important;padding:0!important;margin:0!important;' +
      'border:none!important;overflow:visible!important}' +
      '#note-assistant-btn:hover{transform:scale(1.15)!important}' +
      '#note-panel{position:fixed!important;top:80px!important;right:20px!important;' +
      'width:350px!important;max-height:500px!important;background:#fff!important;' +
      'border-radius:12px!important;box-shadow:0 10px 40px rgba(0,0,0,.25)!important;' +
      'z-index:2147483646!important;overflow:hidden!important;' +
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif!important;' +
      'opacity:1!important;visibility:visible!important;pointer-events:auto!important}' +
      '.note-highlight{padding:2px 4px!important;border-radius:3px!important}' +
      '#note-color-picker{user-select:none!important;-webkit-user-select:none!important}';
    document.head.appendChild(s);
  }

  /* 创建浮动按钮 */
  function createBtn() {
    var btn = document.createElement('div');
    btn.id = 'note-assistant-btn';
    btn.innerHTML = '\uD83D\uDCDD';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', '\u7F51\u9875\u7B14\u8BB0\u52A9\u624B');
    btn.title = '\u70B9\u51FB\u6253\u5F00\u7B14\u8BB0\u9762\u677F';
    document.body.appendChild(btn);
    btn.onclick = togglePanel;
  }

  /* 创建面板 */
  function createPanel() {
    var p = document.createElement('div');
    p.id = 'note-panel';
    p.innerHTML =
      '<div style="padding:15px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff">' +
        '<h3 style="margin:0;font-size:16px">\uD83D\uDCDD \u7F51\u9875\u7B14\u8BB0</h3>' +
        '<p style="margin:5px 0 0;font-size:12px;opacity:.85">\u9009\u4E2D\u6587\u5B57\u5F00\u59CB\u9AD8\u4EAE</p>' +
      '</div>' +
      '<div id="note-list" style="padding:10px;max-height:350px;overflow-y:auto"></div>' +
      '<div style="padding:10px;border-top:1px solid #eee;display:flex;gap:10px">' +
        '<button id="nb-export-md" style="flex:1;padding:8px;border:none;background:#4caf50;color:#fff;border-radius:6px;cursor:pointer;font-size:13px">\u5BFC\u51FAMD</button>' +
        '<button id="nb-export-pdf" style="flex:1;padding:8px;border:none;background:#2196f3;color:#fff;border-radius:6px;cursor:pointer;font-size:13px">\u5BFC\u51FA PDF</button>' +
      '</div>';
    document.body.appendChild(p);
    p.querySelector('#nb-export-md').onclick = exportMd;
    p.querySelector('#nb-export-pdf').onclick = exportPdf;
  }

  /* 选区保存 */
  var savedRange = null;

  /* 高亮 */
  function highlightSelection(color) {
    try {
      var r = savedRange || (window.getSelection().rangeCount > 0 ? window.getSelection().getRangeAt(0) : null);
      if (!r || r.toString().trim().length === 0) return false;
      var mk = document.createElement('mark');
      mk.style.cssText = 'background-color:' + color + ';padding:2px 4px;border-radius:3px';
      mk.className = 'note-highlight';
      mk.dataset.noteId = String(Date.now());
      r.surroundContents(mk);
      saveNote({ id: mk.dataset.noteId, text: r.toString(), color: color, url: location.href, timestamp: new Date().toISOString() });
      window.getSelection().removeAllRanges();
      savedRange = null;
      return true;
    } catch (e) { console.warn('[\u7B14\u8BB0\u52A9\u624B] \u9AD8\u4EAE\u5931\u8D25:', e.message); return false; }
  }

  /* 保存笔记 */
  function saveNote(note) {
    var notes = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    notes.push(note);
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(notes));
    updateList();
  }

  function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

  /* 更新列表 */
  function updateList() {
    var list = document.getElementById('note-list');
    if (!list) return;
    var notes = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    if (notes.length === 0) {
      list.innerHTML = '<p style="text-align:center;color:#999;padding:20px;font-size:13px">\u6682\u65E0\u7B14\u8BB0 \uD83D\uDCCC</p>';
      return;
    }
    var html = '';
    for (var i = notes.length - 1; i >= 0; i--) {
      var n = notes[i];
      html += '<div style="padding:12px;margin:6px 0;background:#f8f9fa;border-radius:8px;border-left:4px solid ' + n.color + '">' +
        '<p style="margin:0 0 6px;font-size:14px;line-height:1.5;word-break:break-word">' + esc(n.text) + '</p>' +
        '<div style="display:flex;justify-content:space-between">' +
          '<span style="font-size:11px;color:#999">' + new Date(n.timestamp).toLocaleString() + '</span>' +
          '<span onclick="window.__nbDel(\'' + n.id + '\')" style="font-size:11px;color:#e53935;cursor:pointer">\u5220\u9664</span>' +
        '</div></div>';
    }
    list.innerHTML = html;
  }

  window.__nbDel = function (id) {
    var notes = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    var filtered = [];
    for (var j = 0; j < notes.length; j++) { if (notes[j].id !== id) filtered.push(notes[j]); }
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(filtered));
    var marks = document.querySelectorAll('mark[data-note-id="' + id + '"]');
    for (var k = 0; k < marks.length; k++) {
      var parent = marks[k].parentNode;
      while (marks[k].firstChild) parent.insertBefore(marks[k].firstChild, marks[k]);
      parent.removeChild(marks[k]);
    }
    updateList();
  };

  /* 导出MD */
  function exportMd() {
    var notes = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    if (notes.length === 0) { alert('\u6682\u65E0\u7B14\u8BB0'); return; }
    var md = '# \u7F51\u9875\u7B14\u8BB0\n\n\u65F6\u95F4\uFF1A' + new Date().toLocaleString() + '\n\u6765\u6E90\uFF1A' + location.href + '\n\n---\n\n';
    for (var i = 0; i < notes.length; i++) {
      md += '## \u7B14\u8BB0' + (i + 1) + '\n> ' + notes[i].text + '\n- \u65F6\u95F4\uFF1A' + new Date(notes[i].timestamp).toLocaleString() + '\n\n';
    }
    download(md, 'notes.md', 'text/markdown');
  }

  /* 导出PDF */
  function exportPdf() {
    var notes = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '[]');
    if (notes.length === 0) { alert('\u6682\u65E0\u7B14\u8BB0'); return; }
    var itemsHtml = '';
    for (var i = 0; i < notes.length; i++) {
      itemsHtml += '<div class=n style=border-color:' + notes[i].color + '><b>' + notes[i].text + '</b><div class=m>' + new Date(notes[i].timestamp).toLocaleString() + '</div></div>';
    }
    var w = window.open('', '_blank');
    w.document.write('<!doctype html><html><head><meta charset=utf-8><title>\u7B14\u8BB0</title>' +
      '<style>body{font-family:sans-serif;padding:40px;max-width:700px;margin:auto}h1{color:#667eea}.n{margin:15px 0;padding:15px;border-left:4px solid}.m{font-size:12px;color:#888}</style>' +
      '</head><body><h1>\uD83D\uDCDD \u7B14\u8BB0</h1><p>' + new Date().toLocaleString() + '</p><hr/>' + itemsHtml + '</body></html>');
    w.document.close();
    w.print();
  }

  function download(content, name, type) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function togglePanel() {
    var p = document.getElementById('note-panel');
    if (!p) return;
    p.style.display = p.style.display === 'none' ? 'block' : 'none';
    if (p.style.display === 'block') updateList();
  }

  function rmPicker() {
    var el = document.getElementById('note-color-picker');
    if (el) el.remove();
  }

  /* ===== 初始化 ===== */
  cleanup();
  injectStyles();
  createBtn();
  createPanel();

  document.addEventListener('mouseup', function (e) {
    if (e.target.closest('#note-color-picker') ||
        e.target.closest('#note-panel') ||
        e.target.closest('#note-assistant-btn')) return;

    setTimeout(function () {
      var sel = window.getSelection();
      var txt = sel.toString().trim();
      if (txt.length > 0) {
        if (sel.rangeCount > 0) savedRange = sel.getRangeAt(0).cloneRange();

        rmPicker();

        var pk = document.createElement('div');
        pk.id = 'note-color-picker';
        pk.style.cssText =
          'position:fixed;top:' + Math.min(e.clientY + 12, window.innerHeight - 60) + 'px;' +
          'left:' + Math.min(e.clientX, window.innerWidth - 170) + 'px;' +
          'background:#fff;padding:10px 12px;border-radius:12px;' +
          'box-shadow:0 6px 24px rgba(0,0,0,.2);z-index:2147483647;display:flex;gap:8px';

        for (var ci = 0; ci < CONFIG.colors.length; ci++) {
          (function (c) {
            var dot = document.createElement('div');
            dot.style.cssText =
              'width:30px;height:30px;background:' + c + ';border-radius:50%;' +
              'cursor:pointer;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.25);transition:transform .15s';
            dot.onmouseover = function () { dot.style.transform = 'scale(1.3)'; };
            dot.onmouseout = function () { dot.style.transform = ''; };
            dot.onmousedown = function (ev) {
              ev.preventDefault();
              ev.stopPropagation();
              highlightSelection(c);
              rmPicker();
            };
            pk.appendChild(dot);
          })(CONFIG.colors[ci]);
        }

        document.body.appendChild(pk);

        setTimeout(function () {
          var handler = function (ev) {
            if (!pk.contains(ev.target)) {
              rmPicker();
              document.removeEventListener('mousedown', handler);
            }
          };
          document.addEventListener('mousedown', handler);
        }, 60);
      }
    }, 10);
  });

  updateList();
  return { ok: true, summary: '\u2705 \u7F51\u9875\u7B14\u8BB0\u52A9\u624B\u5DF2\u542F\u52A8\uFF01\u53F3\u4E0A\u89D2\uD83D\uDCDD\u6309\u94AE\u53EF\u89C1\u3002' };
}