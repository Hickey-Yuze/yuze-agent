(function () {
  if (window.__IMG_CRAWLER_LOADED__) return;
  window.__IMG_CRAWLER_LOADED__ = true;

  var STYLE_ID = '__img_crawler_style__';
  var PANEL_ID = '__img_crawler_panel__';
  var BTN_ID = '__img_crawler_btn__';
  var COLLAPSE_THRESHOLD = 700;
  var COLLAPSED_HEIGHT = 360;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = '\
      #__img_crawler_btn__ {\
        position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147483640;\
        width:32px;height:64px;border-radius:0 14px 14px 0;border:none;cursor:pointer;\
        background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a78bfa 100%);\
        color:#fff;box-shadow:4px 0 20px rgba(99,102,241,0.35);\
        display:flex;align-items:center;justify-content:center;\
        transition:all .3s cubic-bezier(.4,0,.2,1);font-size:18px;\
      }\
      #__img_crawler_btn__:hover { width:38px;box-shadow:6px 0 28px rgba(99,102,241,0.55); }\
      #__img_crawler_btn__:active { transform:translateY(-50%) scale(0.95); }\
      @keyframes __ic_pulse_btn {\
        0%,100%{box-shadow:4px 0 20px rgba(99,102,241,0.35),0 0 0 0 rgba(99,102,241,0.25);}\
        50%{box-shadow:4px 0 20px rgba(99,102,241,0.35),0 0 0 8px rgba(99,102,241,0);}\
      }\
      #__img_crawler_btn__{animation:__ic_pulse_btn 2.5s ease-in-out infinite;}\
      #__img_crawler_btn__:hover{animation:none;}\
      #__img_crawler_panel__ *{box-sizing:border-box;margin:0;padding:0;}\
      #__img_crawler_panel__{\
        position:fixed;top:0;left:0;width:420px;height:100vh;z-index:2147483647;\
        background:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif;\
        transform:translateX(-100%);transition:transform .4s cubic-bezier(.16,1,.3,1);\
        display:flex;flex-direction:column;box-shadow:8px 0 40px rgba(0,0,0,0.12),0 0 0 1px rgba(0,0,0,0.04);\
      }\
      #__img_crawler_panel__.__show{transform:translateX(0);}\
      #__img_crawler_panel__.__show ~ #__img_crawler_scrim__{opacity:1;pointer-events:auto;}\
      #__img_crawler_scrim__{\
        position:fixed;top:0;left:0;width:100vw;height:100vh;z-index:2147483646;\
        background:rgba(8,8,14,0.3);backdrop-filter:blur(6px) saturate(1.4);\
        opacity:0;pointer-events:none;transition:opacity .4s cubic-bezier(.16,1,.3,1);\
      }\
      .__ic_header{\
        display:flex;align-items:center;justify-content:space-between;\
        padding:22px 24px 18px;border-bottom:1px solid #f0f0f5;flex-shrink:0;\
      }\
      .__ic_header h2{font-size:18px;font-weight:700;color:#111;display:flex;align-items:center;gap:10px;letter-spacing:-0.4px;}\
      .__ic_header h2 span{\
        display:inline-flex;align-items:center;justify-content:center;\
        width:34px;height:34px;border-radius:11px;\
        background:linear-gradient(135deg,#ede9fe,#e0e7ff);font-size:17px;\
        box-shadow:0 2px 8px rgba(99,102,241,0.12);\
      }\
      .__ic_header_badge{font-size:11px;font-weight:600;color:#6366f1;background:#eef2ff;padding:3px 10px;border-radius:16px;margin-left:2px;}\
      .__ic_close{\
        width:36px;height:36px;border-radius:11px;border:none;cursor:pointer;\
        background:#f5f5f7;color:#86868b;font-size:16px;\
        display:flex;align-items:center;justify-content:center;transition:all .2s;font-weight:500;\
      }\
      .__ic_close:hover{background:#ebebf0;color:#1d1d1f;transform:scale(1.08);}\
      .__ic_toolbar{\
        display:flex;align-items:center;justify-content:space-between;\
        padding:14px 20px;border-bottom:1px solid #f5f5f8;flex-shrink:0;flex-wrap:wrap;gap:8px;\
      }\
      .__ic_toolbar_left{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}\
      .__ic_toolbar_right{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}\
      .__ic_toolbar_sep{width:1px;height:24px;background:#e5e5ea;margin:0 2px;flex-shrink:0;}\
      .__ic_toolbar label{font-size:12px;color:#6e6e73;display:flex;align-items:center;gap:6px;font-weight:500;}\
      .__ic_toolbar input[type="number"]{\
        width:64px;height:34px;border:1.5px solid #e5e5ea;border-radius:10px;\
        padding:0 8px;font-size:13px;outline:none;background:#fafafa;\
        transition:border-color .2s,background .2s,box-shadow .2s;font-weight:500;-moz-appearance:textfield;\
      }\
      .__ic_toolbar input[type="number"]::-webkit-inner-spin-button{-webkit-appearance:none;}\
      .__ic_toolbar input[type="number"]:focus{border-color:#6366f1;background:#fff;box-shadow:0 0 0 3px rgba(99,102,241,0.1);}\
      .__ic_sel_info{\
        font-size:12px;color:#6366f1;font-weight:700;\
        background:linear-gradient(135deg,#eef2ff,#ede9fe);\
        padding:6px 14px;border-radius:10px;font-variant-numeric:tabular-nums;\
      }\
      .__ic_btn{\
        height:34px;padding:0 14px;border-radius:10px;border:none;cursor:pointer;\
        font-size:12.5px;font-weight:600;transition:all .2s cubic-bezier(.4,0,.2,1);\
        display:inline-flex;align-items:center;gap:6px;letter-spacing:-0.2px;white-space:nowrap;\
      }\
      .__ic_btn_primary{\
        background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;\
        box-shadow:0 3px 12px rgba(99,102,241,0.3);padding:0 18px;\
      }\
      .__ic_btn_primary:hover{box-shadow:0 6px 20px rgba(99,102,241,0.4);transform:translateY(-1px);filter:brightness(1.06);}\
      .__ic_btn_primary:active{transform:translateY(0);filter:brightness(0.97);}\
      .__ic_btn_primary:disabled{background:#c7c7cc;box-shadow:none;cursor:not-allowed;transform:none;filter:none;}\
      .__ic_btn_outline{background:#f7f7fa;color:#1d1d1f;border:1.5px solid #e5e5ea;}\
      .__ic_btn_outline:hover{background:#ededf2;border-color:#d1d1d6;transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.05);}\
      .__ic_btn_outline:active{transform:translateY(0);}\
      .__ic_list{\
        flex:1;overflow-y:auto;padding:12px;display:flex;flex-wrap:wrap;gap:8px;align-content:start;\
      }\
      .__ic_list::-webkit-scrollbar{width:6px;}\
      .__ic_list::-webkit-scrollbar-track{background:transparent;}\
      .__ic_list::-webkit-scrollbar-thumb{background:#d1d1d6;border-radius:3px;}\
      .__ic_list::-webkit-scrollbar-thumb:hover{background:#a1a1a6;}\
      .__ic_card{\
        position:relative;border-radius:8px;overflow:hidden;\
        border:2px solid transparent;cursor:pointer;\
        transition:all .2s cubic-bezier(.4,0,.2,1);\
        background:#fafafa;box-shadow:0 1px 4px rgba(0,0,0,0.03);\
        width:calc(25% - 6px);flex-shrink:0;\
      }\
      .__ic_card:hover{box-shadow:0 4px 12px rgba(0,0,0,0.08);transform:translateY(-1px);}\
      .__ic_card.__selected{\
        border-color:#6366f1;box-shadow:0 2px 8px rgba(99,102,241,0.18),0 0 0 2px rgba(99,102,241,0.06);\
      }\
      .__ic_card_img_wrap{\
        position:relative;overflow:hidden;\
        background:repeating-conic-gradient(#f0f0f3 0% 25%,#fff 0% 50%) 50%/10px 10px;\
        aspect-ratio:1;\
      }\
      .__ic_card_img{width:100%;height:100%;object-fit:cover;display:block;transition:opacity .3s;}\
      .__ic_card_expand_overlay{\
        position:absolute;bottom:0;left:0;right:0;\
        display:flex;flex-direction:column;align-items:center;justify-content:flex-end;\
        padding:0 0 6px;pointer-events:none;transition:opacity .3s;z-index:2;\
      }\
      .__ic_card_expand_overlay::before{\
        content:"";position:absolute;bottom:0;left:0;right:0;height:100%;\
        background:linear-gradient(transparent 10%,rgba(255,255,255,0.92) 60%);pointer-events:none;\
      }\
      .__ic_card_expand_btn{\
        position:relative;z-index:1;pointer-events:auto;\
        height:22px;padding:0 8px;border-radius:11px;border:none;cursor:pointer;\
        background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;\
        font-size:9px;font-weight:600;letter-spacing:-0.1px;\
        display:inline-flex;align-items:center;gap:3px;\
        box-shadow:0 2px 8px rgba(99,102,241,0.35);\
        transition:all .2s cubic-bezier(.4,0,.2,1);\
      }\
      .__ic_card_expand_btn:hover{box-shadow:0 3px 12px rgba(99,102,241,0.5);filter:brightness(1.08);}\
      .__ic_card_expand_btn:active{filter:brightness(0.95);}\
      .__ic_card.__expanded .__ic_card_expand_btn{background:linear-gradient(135deg,#86868b,#6e6e73);box-shadow:0 1px 4px rgba(0,0,0,0.15);}\
      .__ic_card_check{\
        position:absolute;top:4px;left:4px;width:18px;height:18px;\
        border-radius:5px;border:1.5px solid rgba(0,0,0,0.2);\
        background:rgba(255,255,255,0.9);backdrop-filter:blur(4px);\
        display:flex;align-items:center;justify-content:center;\
        transition:all .2s cubic-bezier(.4,0,.2,1);\
        font-size:10px;color:transparent;font-weight:700;z-index:3;\
      }\
      .__ic_card.__selected .__ic_card_check{\
        background:linear-gradient(135deg,#6366f1,#7c3aed);border-color:transparent;color:#fff;\
        box-shadow:0 2px 6px rgba(99,102,241,0.35);transform:scale(1.05);\
      }\
      .__ic_card_info{\
        padding:4px 5px;font-size:8px;color:#86868b;\
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\
        border-top:1px solid #f0f0f3;font-weight:500;\
        display:flex;align-items:center;justify-content:space-between;gap:2px;\
      }\
      .__ic_card_info_dims{color:#6366f1;font-weight:600;font-size:7.5px;}\
      .__ic_empty{text-align:center;padding:80px 20px;color:#aeaeb2;width:100%;}\
      .__ic_empty svg{width:56px;height:56px;margin-bottom:18px;opacity:.2;stroke:currentColor;}\
      .__ic_empty p{font-size:15px;font-weight:500;}\
      .__ic_progress{padding:0 20px 18px;flex-shrink:0;}\
      .__ic_progress_bar{height:6px;background:#f0f0f3;border-radius:3px;overflow:hidden;}\
      .__ic_progress_fill{\
        height:100%;background:linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa);\
        border-radius:3px;transition:width .3s ease;width:0%;box-shadow:0 0 12px rgba(99,102,241,0.3);\
      }\
      .__ic_progress_text{font-size:12px;color:#6e6e73;margin-top:8px;text-align:center;font-weight:600;font-variant-numeric:tabular-nums;}\
      .__ic_card.__expanded{\
        width:100%;\
      }\
      .__ic_card.__expanded .__ic_card_img_wrap{\
        aspect-ratio:auto;max-height:none;\
      }\
      .__ic_card.__expanded .__ic_card_img{\
        object-fit:contain;\
      }\
      @media(max-width:640px){\
        #__img_crawler_panel__{width:100vw;}\
        .__ic_header{padding:18px 16px 14px;}\
        .__ic_header h2{font-size:16px;}\
        .__ic_toolbar{padding:12px 16px;}\
        .__ic_list{padding:10px;}\
        .__ic_card{width:calc(25% - 6px);}\
      }\
    ';
    document.head.appendChild(style);
  }

  function collectImages() {
    var images = new Map();
    var minSize = 20;
    function addUrl(url) {
      if (!url) return;
      try {
        var full = new URL(url, location.href).href;
        if (images.has(full)) return;
        if (full.startsWith('data:') && full.length < 200) return;
        images.set(full, { url: full, selected: false, expanded: false, _w: undefined, _h: undefined });
      } catch (_) {}
    }
    document.querySelectorAll('img').forEach(function(el) {
      if (el.naturalWidth >= minSize || el.naturalHeight >= minSize || !el.complete) {
        addUrl(el.src);
        addUrl(el.dataset.src);
        if (el.srcset) {
          el.srcset.split(',').forEach(function(s) {
            var u = s.trim().split(/\s+/)[0];
            if (u) addUrl(u);
          });
        }
      }
    });
    document.querySelectorAll('picture source').forEach(function(el) {
      if (el.srcset) {
        el.srcset.split(',').forEach(function(s) {
          var u = s.trim().split(/\s+/)[0];
          if (u) addUrl(u);
        });
      }
    });
    document.querySelectorAll('video').forEach(function(el) {
      addUrl(el.poster);
      el.querySelectorAll('source').forEach(function(s) { addUrl(s.src); });
    });
    document.querySelectorAll('[style]').forEach(function(el) {
      var sty = el.getAttribute('style');
      var bgMatch = sty.match(/url$\s*['"]?[^'")]+['"]?\s*$/g);
      if (bgMatch) {
        bgMatch.forEach(function(m) {
          var u = m.replace(/url$\s*['"]?/, '').replace(/['"]?\s*$$/, '');
          addUrl(u);
        });
      }
    });
    document.querySelectorAll('a[href]').forEach(function(el) {
      var href = el.getAttribute('href');
      if (/\.(jpe?g|png|gif|webp|svg|bmp|ico|avif)(\?|$)/i.test(href)) {
        addUrl(href);
      }
    });
    document.querySelectorAll('meta[property="og:image"],meta[name="twitter:image"]').forEach(function(el) {
      addUrl(el.content);
    });
    return Array.from(images.values());
  }

  var imageList = [];
  var minFilter = 0;
  var dirHandle = null;

  function getFiltered() {
    if (minFilter <= 0) return imageList;
    return imageList.filter(function(img) {
      if (img._w !== undefined) return img._w >= minFilter || img._h >= minFilter;
      return true;
    });
  }

  function getSelected() {
    return getFiltered().filter(function(i) { return i.selected; });
  }

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function truncate(s, n) {
    return s.length > n ? s.slice(0, n) + '\u2026' : s;
  }

  function buildPanel() {
    if (document.getElementById(PANEL_ID)) return document.getElementById(PANEL_ID);

    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML =
      '<div class="__ic_header">' +
        '<h2><span>\uD83D\uDDBC</span> \u56FE\u7247\u91C7\u96C6\u5668 <span class="__ic_header_badge" id="__ic_count_badge">0 \u5F20</span></h2>' +
        '<button class="__ic_close" title="\u5173\u95ED">\u2715</button>' +
      '</div>' +
      '<div class="__ic_toolbar">' +
        '<div class="__ic_toolbar_left">' +
          '<label>\uD83D\uDCCF \u6700\u5C0F <input type="number" id="__ic_min_size" value="0" min="0" step="10" title="\u8FC7\u6EE4\u5C0F\u4E8E\u8BE5\u5C3A\u5BF8\u7684\u56FE\u7247(px)"> px</label>' +
          '<div class="__ic_toolbar_sep"></div>' +
          '<button class="__ic_btn __ic_btn_outline" id="__ic_sel_all">\u2713 \u5168\u9009</button>' +
          '<button class="__ic_btn __ic_btn_outline" id="__ic_desel_all">\u2715 \u53D6\u6D88</button>' +
          '<button class="__ic_btn __ic_btn_outline" id="__ic_refresh">\uD83D\uDD04 \u5237\u65B0</button>' +
        '</div>' +
        '<div class="__ic_toolbar_right">' +
          '<span class="__ic_sel_info" id="__ic_sel_info">\u5DF2\u9009 0</span>' +
          '<button class="__ic_btn __ic_btn_outline" id="__ic_dir_btn">\uD83D\uDCC1 \u76EE\u5F55</button>' +
          '<button class="__ic_btn __ic_btn_primary" id="__ic_download" disabled>\u2B07 \u4E0B\u8F7D</button>' +
        '</div>' +
      '</div>' +
      '<div class="__ic_list" id="__ic_list"></div>' +
      '<div class="__ic_progress" id="__ic_progress_wrap" style="display:none">' +
        '<div class="__ic_progress_bar"><div class="__ic_progress_fill" id="__ic_progress_fill"></div></div>' +
        '<div class="__ic_progress_text" id="__ic_progress_text"></div>' +
      '</div>';
    document.body.appendChild(panel);

    var scrim = document.createElement('div');
    scrim.id = '__img_crawler_scrim__';
    document.body.appendChild(scrim);

    panel.querySelector('.__ic_close').addEventListener('click', hidePanel);
    scrim.addEventListener('click', hidePanel);

    document.getElementById('__ic_min_size').addEventListener('change', function() {
      minFilter = parseInt(this.value) || 0;
      renderList();
    });
    document.getElementById('__ic_sel_all').addEventListener('click', function() {
      getFiltered().forEach(function(i) { i.selected = true; });
      renderList();
    });
    document.getElementById('__ic_desel_all').addEventListener('click', function() {
      getFiltered().forEach(function(i) { i.selected = false; });
      renderList();
    });
    document.getElementById('__ic_refresh').addEventListener('click', function() {
      imageList = collectImages();
      dirHandle = null;
      renderList();
      updateDirBtn();
    });
    document.getElementById('__ic_dir_btn').addEventListener('click', chooseDirectory);
    document.getElementById('__ic_download').addEventListener('click', downloadSelected);

    return panel;
  }

  function updateDirBtn() {
    var btn = document.getElementById('__ic_dir_btn');
    if (btn) btn.textContent = dirHandle ? '\uD83D\uDCC1 ' + dirHandle.name : '\uD83D\uDCC1 \u76EE\u5F55';
  }

  async function chooseDirectory() {
    try {
      if (!('showDirectoryPicker' in window)) {
        alert('\u5F53\u524D\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 File System Access API\uFF0C\u5C06\u4F7F\u7528\u9ED8\u8BA4\u4E0B\u8F7D\u65B9\u5F0F\u3002');
        return;
      }
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      updateDirBtn();
    } catch (e) {
      if (e.name !== 'AbortError') console.warn('\u9009\u62E9\u76EE\u5F55\u5931\u8D25:', e);
    }
  }

  function getFilename(url, mimeType) {
    try {
      var pathname = new URL(url).pathname;
      var decoded = decodeURIComponent(pathname);
      var parts = decoded.split('/');
      var last = parts[parts.length - 1];
      if (last && /\.\w{2,5}$/.test(last) && last.length < 200) return last;
    } catch (_) {}
    var extMap = {
      'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif',
      'image/webp': '.webp', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'image/bmp': '.bmp'
    };
    var ext = extMap[mimeType] || '.jpg';
    var hash = url.length < 40
      ? url.replace(/[^a-zA-Z0-9]/g, '')
      : (url.split('').reduce(function(a, c) { return ((a << 5) - a + c.charCodeAt(0)) | 0; }, 0) >>> 0).toString(36);
    return 'image_' + hash + ext;
  }

  async function downloadSelected() {
    var selected = getSelected();
    if (!selected.length) return;
    var btn = document.getElementById('__ic_download');
    var progressWrap = document.getElementById('__ic_progress_wrap');
    var progressFill = document.getElementById('__ic_progress_fill');
    var progressText = document.getElementById('__ic_progress_text');

    btn.disabled = true;
    btn.textContent = '\u23F3 \u4E0B\u8F7D\u4E2D\u2026';
    progressWrap.style.display = 'block';
    progressFill.style.width = '0%';

    var success = 0;
    var fail = 0;
    var total = selected.length;

    for (var i = 0; i < selected.length; i++) {
      var img = selected[i];
      var pct = Math.round(((i + 1) / total) * 100);
      progressFill.style.width = pct + '%';
      progressText.textContent = '\u4E0B\u8F7D\u4E2D ' + (i + 1) + ' / ' + total;

      try {
        var response = await fetch(img.url, { mode: 'cors' }).catch(function() { return null; });
        if (!response || !response.ok) {
          await fallbackDownload(img.url);
          success++;
          continue;
        }
        var blob = await response.blob();
        var filename = getFilename(img.url, blob.type);

        if (dirHandle) {
          var fileHandle = await dirHandle.getFileHandle(filename, { create: true });
          var writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } else {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
          await new Promise(function(r) { setTimeout(r, 300); });
        }
        success++;
      } catch (e) {
        console.warn('\u4E0B\u8F7D\u5931\u8D25:', img.url, e);
        fail++;
      }
    }

    btn.disabled = false;
    btn.textContent = '\u2B07 \u4E0B\u8F7D';
    progressFill.style.width = '100%';
    progressText.textContent = '\u5B8C\u6210\uFF01\u6210\u529F ' + success + ' \u5F20' + (fail > 0 ? '\uFF0C\u5931\u8D25 ' + fail + ' \u5F20' : '');
    setTimeout(function() { progressWrap.style.display = 'none'; }, 3000);
  }

  function fallbackDownload(url) {
    return new Promise(function(resolve) {
      var a = document.createElement('a');
      a.href = url;
      a.download = '';
      a.target = '_blank';
      a.click();
      setTimeout(resolve, 300);
    });
  }

  function renderList() {
    var list = document.getElementById('__ic_list');
    if (!list) return;
    var filtered = getFiltered();

    var badge = document.getElementById('__ic_count_badge');
    if (badge) badge.textContent = filtered.length + ' \u5F20';

    if (!filtered.length) {
      list.innerHTML =
        '<div class="__ic_empty">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '<rect x="3" y="3" width="18" height="18" rx="2"/>' +
            '<circle cx="8.5" cy="8.5" r="1.5"/>' +
            '<path d="M21 15l-5-5L5 21"/>' +
          '</svg>' +
          '<p>\u672A\u627E\u5230\u56FE\u7247\uFF0C\u70B9\u51FB\u300C\u5237\u65B0\u300D\u91CD\u65B0\u626B\u63CF</p>' +
        '</div>';
      updateInfo();
      return;
    }

    list.innerHTML = '';
    filtered.forEach(function(img) {
      var card = document.createElement('div');
      card.className = '__ic_card' + (img.selected ? ' __selected' : '') + (img.expanded ? ' __expanded' : '');
      card.innerHTML =
        '<div class="__ic_card_check">\u2713</div>' +
        '<div class="__ic_card_img_wrap">' +
          '<img class="__ic_card_img" src="' + escHtml(img.url) + '" loading="lazy" alt="">' +
          '<div class="__ic_card_expand_overlay" style="display:none">' +
            '<button class="__ic_card_expand_btn" title="\u5C55\u5F00/\u6298\u53E0\u56FE\u7247">\u2B07</button>' +
          '</div>' +
        '</div>' +
        '<div class="__ic_card_info" title="' + escHtml(img.url) + '">' +
          '<span class="__ic_card_info_name">' + truncate(img.url.split('/').pop() || img.url, 16) + '</span>' +
          '<span class="__ic_card_info_dims"></span>' +
        '</div>';

      var imgEl = card.querySelector('.__ic_card_img');
      var wrapEl = card.querySelector('.__ic_card_img_wrap');
      var dimsEl = card.querySelector('.__ic_card_info_dims');
      var overlayEl = card.querySelector('.__ic_card_expand_overlay');
      var expandBtnEl = card.querySelector('.__ic_card_expand_btn');

      function updateExpandUI() {
        if (img._h === undefined) return;
        var isTall = img._h > COLLAPSE_THRESHOLD;
        if (img.expanded) {
          card.classList.add('__expanded');
          wrapEl.style.maxHeight = 'none';
          wrapEl.style.aspectRatio = 'auto';
          imgEl.style.objectFit = 'contain';
          expandBtnEl.textContent = '\u2B06 \u6536\u8D77';
          overlayEl.style.display = 'flex';
        } else if (isTall) {
          card.classList.remove('__expanded');
          overlayEl.style.display = 'flex';
          expandBtnEl.textContent = '\u2B07 ' + img._w + '\u00D7' + img._h;
          wrapEl.style.maxHeight = COLLAPSED_HEIGHT + 'px';
          wrapEl.style.aspectRatio = 'auto';
          imgEl.style.objectFit = 'cover';
        } else {
          card.classList.remove('__expanded');
          overlayEl.style.display = 'none';
          wrapEl.style.maxHeight = 'none';
          wrapEl.style.aspectRatio = '1';
          imgEl.style.objectFit = 'cover';
        }
      }

      imgEl.addEventListener('load', function() {
        img._w = imgEl.naturalWidth;
        img._h = imgEl.naturalHeight;
        if (dimsEl && img._w) dimsEl.textContent = img._w + '\u00D7' + img._h;
        updateExpandUI();
        if (minFilter > 0 && img._w < minFilter && img._h < minFilter) {
          card.style.display = 'none';
          updateInfo();
        }
      });

      expandBtnEl.addEventListener('click', function(e) {
        e.stopPropagation();
        img.expanded = !img.expanded;
        updateExpandUI();
      });

      card.addEventListener('click', function(e) {
        if (e.target === expandBtnEl || expandBtnEl.contains(e.target)) return;
        if (e.shiftKey) {
          window.open(img.url, '_blank');
          return;
        }
        img.selected = !img.selected;
        card.classList.toggle('__selected', img.selected);
        updateInfo();
      });

      updateExpandUI();
      list.appendChild(card);
    });
    updateInfo();
  }

  function updateInfo() {
    var info = document.getElementById('__ic_sel_info');
    var btn = document.getElementById('__ic_download');
    var filtered = getFiltered();
    var selected = filtered.filter(function(i) { return i.selected; });
    if (info) info.textContent = '\u5DF2\u9009 ' + selected.length;
    if (btn) btn.disabled = selected.length === 0;
  }

  function showPanel() {
    imageList = collectImages();
    var panel = buildPanel();
    panel.classList.add('__show');
    renderList();
    updateDirBtn();
  }

  function hidePanel() {
    var panel = document.getElementById(PANEL_ID);
    if (panel) panel.classList.remove('__show');
  }

  function createTrigger() {
    if (document.getElementById(BTN_ID)) return;
    var btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.title = '\u56FE\u7247\u91C7\u96C6\u5668';
    btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>';
    btn.addEventListener('click', function() {
      var panel = document.getElementById(PANEL_ID);
      if (panel && panel.classList.contains('__show')) {
        hidePanel();
      } else {
        showPanel();
      }
    });
    document.body.appendChild(btn);
  }

  function init() {
    injectStyles();
    createTrigger();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();