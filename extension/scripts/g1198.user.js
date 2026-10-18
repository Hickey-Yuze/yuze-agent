// ==UserScript==
// @name         磁力链接预览
// @description  以缩图形式预览磁力链接，默认快捷键ALT+M
// @icon         data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23f3a04c'/><stop offset='1' stop-color='%23e58522'/></linearGradient></defs><rect width='64' height='64' rx='14' fill='url(%23g)'/><path d='M20 18v14a12 12 0 0 0 24 0V18h-7v14a5 5 0 0 1-10 0V18z' fill='%23fff'/><rect x='20' y='14' width='7' height='6' fill='%23ff4d4f'/><rect x='37' y='14' width='7' height='6' fill='%23ff4d4f'/></svg>
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      whatslink.info
// @run-at       document-idle
// ==/UserScript==
(function () {
  'use strict';

  const HAS_GM =
    typeof GM_xmlhttpRequest === 'function' &&
    typeof GM_getValue === 'function' &&
    typeof GM_setValue === 'function';

  if (HAS_GM) {
    runTampermonkeyVersion();
  } else {
    runPlainVersion();
  }

  function runTampermonkeyVersion() {
    const DEFAULT_HOTKEY = { ctrl: false, alt: true, shift: false, meta: false, key: 'm' };

    function loadHotkey() {
      try {
        const v = GM_getValue('wl_hotkey', null);
        if (!v) return { ...DEFAULT_HOTKEY };
        const obj = typeof v === 'string' ? JSON.parse(v) : v;
        return { ...DEFAULT_HOTKEY, ...obj };
      } catch { return { ...DEFAULT_HOTKEY }; }
    }
    function saveHotkey(hk) { GM_setValue('wl_hotkey', JSON.stringify(hk)); }
    function hotkeyToText(hk) {
      if (!hk || !hk.key) return '未设置';
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const parts = [];
      if (hk.ctrl)  parts.push(isMac ? '⌃ Ctrl' : 'Ctrl');
      if (hk.alt)   parts.push(isMac ? '⌥ Option' : 'Alt');
      if (hk.shift) parts.push(isMac ? '⇧ Shift' : 'Shift');
      if (hk.meta)  parts.push(isMac ? '⌘ Cmd' : 'Meta');
      let k = hk.key;
      if (k.length === 1) k = k.toUpperCase();
      else k = k.replace(/^Arrow/, '').replace(/^Key/, '');
      parts.push(k);
      return parts.join(' + ');
    }
    function matchHotkey(e, hk) {
      if (!hk || !hk.key) return false;
      if (!!e.ctrlKey  !== !!hk.ctrl)  return false;
      if (!!e.altKey   !== !!hk.alt)   return false;
      if (!!e.shiftKey !== !!hk.shift) return false;
      if (!!e.metaKey  !== !!hk.meta)  return false;
      return e.key.toLowerCase() === String(hk.key).toLowerCase();
    }

    let currentHotkey = loadHotkey();

    function openPanel() {
      const existing = document.getElementById('wl-root');
      if (existing) { existing.style.display = 'flex'; return; }
      buildPanel();
    }
    function togglePanel() {
      const existing = document.getElementById('wl-root');
      if (!existing) { buildPanel(); return; }
      existing.style.display = existing.style.display === 'none' ? 'flex' : 'none';
    }

    document.addEventListener('keydown', e => {
      if (matchHotkey(e, currentHotkey)) {
        e.preventDefault();
        togglePanel();
      }
    });

    function openSettings() {
      const old = document.getElementById('wl-settings');
      if (old) old.remove();

      ensureStyle();

      const overlay = document.createElement('div');
      overlay.id = 'wl-settings';
      overlay.innerHTML = `
        <div class="wl-set-panel">
          <div class="wl-set-header">
            <div class="wl-title">
              <div class="wl-title-icon">⚙️</div>
              设置
            </div>
            <button class="wl-close" id="wl-set-close" title="关闭">✕</button>
          </div>
          <div class="wl-set-body">
            <div class="wl-set-label">触发快捷键</div>
            <div class="wl-set-hint">点击下方输入框，然后按下你想使用的组合键</div>
            <div class="wl-hk-display" id="wl-hk-display" tabindex="0"></div>
            <div class="wl-set-hint" style="margin-top:8px;">提示：建议至少包含一个修饰键（Ctrl / Alt / Shift / ⌘）</div>
            <div class="wl-set-actions">
              <button class="wl-btn-sec" id="wl-hk-reset">恢复默认</button>
              <div style="flex:1;"></div>
              <button class="wl-btn-sec" id="wl-hk-cancel">取消</button>
              <button class="wl-btn-pri-sm" id="wl-hk-save">保存</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const display = overlay.querySelector('#wl-hk-display');
      let draft = { ...currentHotkey };
      let recording = false;

      function refreshDisplay() {
        display.textContent = hotkeyToText(draft);
        display.classList.toggle('recording', recording);
      }
      refreshDisplay();

      display.addEventListener('focus', () => {
        recording = true;
        display.textContent = '请按下组合键…';
        display.classList.add('recording');
      });
      display.addEventListener('blur', () => {
        recording = false;
        refreshDisplay();
      });
      display.addEventListener('keydown', e => {
        e.preventDefault();
        e.stopPropagation();
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
        if (e.key === 'Escape') { display.blur(); return; }
        draft = {
          ctrl:  e.ctrlKey,
          alt:   e.altKey,
          shift: e.shiftKey,
          meta:  e.metaKey,
          key:   e.key.length === 1 ? e.key.toLowerCase() : e.key,
        };
        recording = false;
        display.blur();
        refreshDisplay();
      });

      overlay.querySelector('#wl-hk-reset').addEventListener('click', () => {
        draft = { ...DEFAULT_HOTKEY };
        refreshDisplay();
      });
      overlay.querySelector('#wl-hk-cancel').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#wl-set-close').addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

      overlay.querySelector('#wl-hk-save').addEventListener('click', () => {
        if (!draft.key) { flashToast('请先录制一个快捷键'); return; }
        const noMods = !draft.ctrl && !draft.alt && !draft.shift && !draft.meta;
        const isLetterOrDigit = /^[a-z0-9]$/i.test(draft.key);
        if (noMods && isLetterOrDigit) {
          flashToast('请至少包含一个修饰键');
          return;
        }
        currentHotkey = { ...draft };
        saveHotkey(currentHotkey);
        flashToast('快捷键已保存：' + hotkeyToText(currentHotkey));
        overlay.remove();
      });
    }

    function flashToast(msg) {
      ensureStyle();
      let t = document.getElementById('wl-global-toast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'wl-global-toast';
        t.className = 'wl-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(t._timer);
      t._timer = setTimeout(() => t.classList.remove('show'), 2400);
    }

    function fmtSize(bytes) {
      if (!bytes) return '未知大小';
      const units = ['B', 'KB', 'MB', 'GB', 'TB'];
      let i = 0, n = bytes;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return n.toFixed(2) + ' ' + units[i];
    }
    function fileIcon(t) {
      return ({ video: '🎬', audio: '🎵', image: '🖼️', document: '📄', archive: '📦', text: '📝', font: '🔤', folder: '📁' })[t] || '❓';
    }
    function iconBg(t) {
      return ({
        video: 'linear-gradient(135deg,#667eea,#764ba2)',
        audio: 'linear-gradient(135deg,#f093fb,#f5576c)',
        image: 'linear-gradient(135deg,#4facfe,#00f2fe)',
        document: 'linear-gradient(135deg,#43e97b,#38f9d7)',
        archive: 'linear-gradient(135deg,#fa8231,#f7b731)',
        text: 'linear-gradient(135deg,#00b09b,#96c93d)',
        font: 'linear-gradient(135deg,#a18cd1,#fbc2eb)',
        folder: 'linear-gradient(135deg,#ffecd2,#fcb69f)'
      })[t] || 'linear-gradient(135deg,#8e9eab,#eef2f3)';
    }
    function tagColor(t) {
      return ({
        video: { bg: 'rgba(102,126,234,.15)', color: '#667eea', border: 'rgba(102,126,234,.3)' },
        audio: { bg: 'rgba(245,87,108,.12)', color: '#f5576c', border: 'rgba(245,87,108,.3)' },
        image: { bg: 'rgba(79,172,254,.12)', color: '#4facfe', border: 'rgba(79,172,254,.3)' },
        document: { bg: 'rgba(67,233,123,.12)', color: '#2ecc71', border: 'rgba(67,233,123,.3)' },
        archive: { bg: 'rgba(250,130,49,.12)', color: '#fa8231', border: 'rgba(250,130,49,.3)' },
        text: { bg: 'rgba(0,176,155,.12)', color: '#00b09b', border: 'rgba(0,176,155,.3)' },
      })[t] || { bg: 'rgba(128,128,128,.1)', color: '#888', border: 'rgba(128,128,128,.2)' };
    }
    function today() { return new Date().toISOString().slice(0, 10); }

    function loadHistory() {
      try { return JSON.parse(GM_getValue('wl_history', '[]')); } catch { return []; }
    }
    function saveHistory(arr) { GM_setValue('wl_history', JSON.stringify(arr.slice(0, 50))); }
    function addHistory(url, info) {
      const arr = loadHistory().filter(h => h.url !== url);
      arr.unshift({ url, name: info.name || url, file_type: info.file_type || 'unknown', size: info.size, date: today() });
      saveHistory(arr);
    }

    function ensureStyle() {
      if (document.getElementById('wl-style')) return;
      const style = document.createElement('style');
      style.id = 'wl-style';
      style.textContent = `
        @keyframes wl-in {
          from { opacity:0; transform:scale(.94) translateY(12px); }
          to   { opacity:1; transform:scale(1)  translateY(0); }
        }
        @keyframes wl-spin { to { transform: rotate(360deg); } }
        @keyframes wl-fade-in {
          from { opacity:0; transform:translateY(6px); }
          to   { opacity:1; transform:translateY(0); }
        }

        #wl-root, #wl-settings {
          position: fixed; inset: 0; z-index: 2147483647;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.45);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
        }
        #wl-panel, .wl-set-panel {
          background: rgba(255,255,255,.88);
          backdrop-filter: blur(40px) saturate(200%);
          -webkit-backdrop-filter: blur(40px) saturate(200%);
          border-radius: 24px; overflow: hidden;
          box-shadow:
            0 0 0 .5px rgba(255,255,255,.6) inset,
            0 2px 4px rgba(0,0,0,.04),
            0 8px 24px rgba(0,0,0,.1),
            0 32px 72px rgba(0,0,0,.18);
          animation: wl-in .28s cubic-bezier(.34,1.56,.64,1) both;
        }
        #wl-panel {
          width: 520px; max-width: calc(100vw - 28px); max-height: calc(100vh - 48px);
          display: flex; flex-direction: column;
        }
        .wl-set-panel {
          width: 420px; max-width: calc(100vw - 28px);
          display: flex; flex-direction: column;
        }

        @media (prefers-color-scheme: dark) {
          #wl-panel, .wl-set-panel {
            background: rgba(28,28,30,.92);
            box-shadow:
              0 0 0 .5px rgba(255,255,255,.08) inset,
              0 2px 4px rgba(0,0,0,.3),
              0 8px 24px rgba(0,0,0,.4),
              0 32px 72px rgba(0,0,0,.5);
          }
          .wl-header, .wl-set-header { border-bottom-color: rgba(255,255,255,.06) !important; }
          .wl-title       { color: rgba(255,255,255,.92) !important; }
          .wl-card        { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.06) !important; }
          .wl-input       { background: rgba(255,255,255,.06) !important; color: rgba(255,255,255,.88) !important; border-color: rgba(255,255,255,.1) !important; }
          .wl-input::placeholder { color: rgba(255,255,255,.25) !important; }
          .wl-input:focus { border-color: #e58522 !important; box-shadow: 0 0 0 3px rgba(229,133,34,.18) !important; }
          .wl-hist-row    { background: rgba(255,255,255,.05) !important; border-color: rgba(255,255,255,.06) !important; }
          .wl-hist-row:hover { background: rgba(255,255,255,.09) !important; }
          .wl-empty, .wl-sub, .wl-set-hint { color: rgba(255,255,255,.4) !important; }
          .wl-name-text   { color: rgba(255,255,255,.9) !important; }
          .wl-tab         { color: rgba(255,255,255,.35) !important; border-color: rgba(255,255,255,.1) !important; }
          .wl-close       { background: rgba(255,255,255,.08) !important; color: rgba(255,255,255,.4) !important; }
          .wl-close:hover { background: rgba(229,85,83,.2) !important; color: #ff6b6b !important; }
          .wl-btn-sec     { background: rgba(255,255,255,.07) !important; color: rgba(255,255,255,.6) !important; border-color: rgba(255,255,255,.1) !important; }
          .wl-btn-sec:hover { background: rgba(255,255,255,.12) !important; }
          .wl-divider     { border-color: rgba(255,255,255,.06) !important; }
          .wl-file-row    { border-bottom-color: rgba(255,255,255,.05) !important; }
          .wl-file-name   { color: rgba(255,255,255,.75) !important; }
          .wl-hk-display  { background: rgba(255,255,255,.06) !important; color: rgba(255,255,255,.9) !important; border-color: rgba(255,255,255,.12) !important; }
          .wl-set-label   { color: rgba(255,255,255,.85) !important; }
          .wl-file-size   { color: rgba(255,255,255,.35) !important; }
          .wl-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,.18) !important; }
        }

        .wl-header, .wl-set-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px 14px;
          border-bottom: 1px solid rgba(0,0,0,.06);
          flex-shrink: 0;
        }
        .wl-title {
          font-size: 15px; font-weight: 700; letter-spacing: -.3px;
          color: rgba(0,0,0,.85);
          display: flex; align-items: center; gap: 8px;
        }
        .wl-title-icon {
          width: 30px; height: 30px; border-radius: 9px;
          background: linear-gradient(135deg,#f3a04c,#e58522);
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; box-shadow: 0 2px 8px rgba(229,133,34,.4);
        }
        .wl-tabs {
          display: flex; gap: 4px;
          background: rgba(0,0,0,.05); border-radius: 999px; padding: 3px;
        }
        .wl-tab {
          height: 26px; padding: 0 14px;
          border: none; border-radius: 999px;
          background: transparent; color: rgba(0,0,0,.4);
          font-size: 11.5px; font-weight: 500; cursor: pointer;
          transition: all .2s cubic-bezier(.4,0,.2,1);
        }
        .wl-tab.active {
          background: #fff; color: #e58522;
          box-shadow: 0 1px 4px rgba(0,0,0,.12), 0 0 0 .5px rgba(0,0,0,.05);
        }
        @media (prefers-color-scheme: dark) {
          .wl-tabs { background: rgba(255,255,255,.07) !important; }
          .wl-tab.active { background: rgba(255,255,255,.14) !important; color: #f3a04c !important; box-shadow: 0 1px 4px rgba(0,0,0,.3) !important; }
        }
        .wl-close {
          width: 30px; height: 30px; border: none; border-radius: 999px;
          background: rgba(0,0,0,.06); color: rgba(0,0,0,.4);
          font-size: 12px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all .18s; flex-shrink: 0;
        }
        .wl-close:hover { background: rgba(229,85,83,.12); color: #e55553; transform: scale(1.08); }

        .wl-body { padding: 16px 18px 20px; overflow-y: auto; flex: 1; }
        .wl-body::-webkit-scrollbar { width: 4px; }
        .wl-body::-webkit-scrollbar-track { background: transparent; }
        .wl-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 999px; }

        .wl-input-row { display: flex; gap: 8px; margin-bottom: 16px; }
        .wl-input {
          flex: 1; height: 42px;
          border: 1.5px solid rgba(0,0,0,.1); border-radius: 13px;
          background: rgba(0,0,0,.03); color: rgba(0,0,0,.8);
          padding: 0 14px; font-size: 13px; outline: none; min-width: 0;
          transition: border-color .18s, box-shadow .18s;
        }
        .wl-input::placeholder { color: rgba(0,0,0,.3); }
        .wl-input:focus {
          border-color: #e58522;
          box-shadow: 0 0 0 3.5px rgba(229,133,34,.15);
        }
        .wl-btn-pri {
          height: 42px; padding: 0 20px; border: 0; border-radius: 13px;
          background: linear-gradient(135deg,#f3a04c 0%,#e58522 100%);
          color: #fff; font-size: 13px; font-weight: 650; cursor: pointer;
          white-space: nowrap; flex-shrink: 0;
          box-shadow: 0 2px 10px rgba(229,133,34,.4);
          transition: opacity .18s, transform .18s, box-shadow .18s;
        }
        .wl-btn-pri:hover   { opacity: .9; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(229,133,34,.5); }
        .wl-btn-pri:active  { transform: translateY(0); }
        .wl-btn-pri:disabled{ opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
        .wl-btn-pri-sm {
          height: 32px; padding: 0 16px; border: 0; border-radius: 10px;
          background: linear-gradient(135deg,#f3a04c 0%,#e58522 100%);
          color: #fff; font-size: 12px; font-weight: 650; cursor: pointer;
          box-shadow: 0 2px 8px rgba(229,133,34,.35);
          transition: opacity .18s, transform .18s;
        }
        .wl-btn-pri-sm:hover  { opacity: .92; transform: translateY(-1px); }
        .wl-btn-pri-sm:active { transform: translateY(0); }

        .wl-btn-sec {
          height: 32px; padding: 0 14px;
          border: 1px solid rgba(0,0,0,.1); border-radius: 10px;
          background: rgba(0,0,0,.04); color: rgba(0,0,0,.55);
          font-size: 12px; font-weight: 550; cursor: pointer;
          transition: all .15s;
        }
        .wl-btn-sec:hover { background: rgba(0,0,0,.08); }

        .wl-card {
          background: rgba(255,255,255,.9);
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 18px; padding: 16px;
          margin-bottom: 10px;
          animation: wl-fade-in .22s ease both;
          box-shadow: 0 1px 3px rgba(0,0,0,.04), 0 4px 12px rgba(0,0,0,.06);
        }

        .wl-icon-box {
          width: 46px; height: 46px; border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,.18);
        }
        .wl-name-text {
          font-size: 13.5px; font-weight: 650; color: rgba(0,0,0,.85);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
          margin-bottom: 8px; letter-spacing: -.2px;
        }

        .wl-tags { display: flex; gap: 5px; flex-wrap: wrap; }
        .wl-tag {
          height: 22px; display: inline-flex; align-items: center;
          border-radius: 999px; padding: 0 9px;
          font-size: 10.5px; font-weight: 600; letter-spacing: .1px;
        }

        .wl-divider { border: none; border-top: 1px solid rgba(0,0,0,.06); margin: 14px 0; }

        .wl-file-row {
          display: flex; align-items: center; gap: 9px;
          padding: 8px 0; border-bottom: 1px solid rgba(0,0,0,.05);
        }
        .wl-file-row:last-child { border-bottom: none; }
        .wl-file-name {
          flex: 1; font-size: 12px; color: rgba(0,0,0,.7);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .wl-file-size { font-size: 11px; color: rgba(0,0,0,.35); flex-shrink: 0; }

        .wl-img-wrap {
          position: relative; border-radius: 13px; overflow: hidden;
          margin-top: 14px; background: rgba(0,0,0,.04);
          box-shadow: 0 2px 12px rgba(0,0,0,.1);
        }
        .wl-img-wrap img { width: 100%; display: block; cursor: zoom-in; transition: opacity .2s; }
        .wl-img-nav {
          position: absolute; top: 50%; transform: translateY(-50%) scale(.92);
          width: 32px; height: 32px; border: 0; border-radius: 999px;
          background: rgba(0,0,0,.5); backdrop-filter: blur(8px);
          color: #fff; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          opacity: 0; pointer-events: none;
          transition: opacity .22s ease, transform .22s ease, background .15s;
        }
        .wl-img-counter {
          position: absolute; bottom: 10px; left: 50%;
          transform: translateX(-50%) translateY(4px);
          background: rgba(0,0,0,.5); backdrop-filter: blur(8px);
          color: #fff; font-size: 11px; border-radius: 999px; padding: 3px 10px;
          opacity: 0; pointer-events: none;
          transition: opacity .22s ease, transform .22s ease;
        }
        .wl-img-wrap:hover .wl-img-nav {
          opacity: 1; pointer-events: auto;
          transform: translateY(-50%) scale(1);
        }
        .wl-img-wrap:hover .wl-img-nav:hover {
          background: rgba(0,0,0,.75);
          transform: translateY(-50%) scale(1.08);
        }
        .wl-img-wrap:hover .wl-img-counter {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }

        .wl-sub { font-size: 11.5px; color: rgba(0,0,0,.35); }
        .wl-loading {
          display: flex; flex-direction: column; align-items: center;
          padding: 44px 0; color: rgba(0,0,0,.3); gap: 14px;
        }
        .wl-spinner {
          width: 28px; height: 28px; border: 2.5px solid rgba(229,133,34,.2);
          border-top-color: #e58522; border-radius: 50%;
          animation: wl-spin .7s linear infinite;
        }
        .wl-empty {
          text-align: center; padding: 36px 0;
          color: rgba(0,0,0,.28); font-size: 12.5px;
        }
        .wl-empty-icon { font-size: 32px; margin-bottom: 8px; }

        .wl-toast {
          position: fixed; bottom: 32px; left: 50%;
          transform: translateX(-50%) translateY(8px);
          z-index: 2147483647;
          background: rgba(30,30,30,.92); backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #fff; border-radius: 12px; padding: 10px 20px;
          font-size: 12.5px; white-space: nowrap;
          opacity: 0; transition: opacity .2s, transform .2s; pointer-events: none;
          box-shadow: 0 6px 20px rgba(0,0,0,.3);
        }
        .wl-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

        .wl-hist-row {
          display: flex; align-items: center; gap: 11px;
          background: rgba(255,255,255,.85);
          border: 1px solid rgba(0,0,0,.06);
          border-radius: 14px; padding: 11px 13px; margin-bottom: 8px;
          cursor: pointer; transition: all .18s;
          box-shadow: 0 1px 3px rgba(0,0,0,.04);
        }
        .wl-hist-row:hover {
          background: rgba(255,255,255,1);
          transform: translateY(-1px);
          box-shadow: 0 3px 12px rgba(0,0,0,.08);
        }
        .wl-hist-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }

        .wl-fullscreen {
          position: fixed; inset: 0; z-index: 2147483648;
          background: rgba(0,0,0,.88); backdrop-filter: blur(20px);
          display: flex; align-items: center; justify-content: center; cursor: zoom-out;
          animation: wl-fade-in .18s ease both;
        }
        .wl-fullscreen img {
          max-width: 90vw; max-height: 90vh;
          border-radius: 14px;
          box-shadow: 0 24px 64px rgba(0,0,0,.6);
        }

        .wl-set-body { padding: 18px 20px 20px; }
        .wl-set-label {
          font-size: 13px; font-weight: 650; color: rgba(0,0,0,.8);
          margin-bottom: 6px; letter-spacing: -.2px;
        }
        .wl-set-hint {
          font-size: 11.5px; color: rgba(0,0,0,.4); margin-bottom: 10px;
        }
        .wl-hk-display {
          height: 48px; border-radius: 12px;
          border: 1.5px dashed rgba(0,0,0,.18);
          background: rgba(0,0,0,.03);
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 600; color: rgba(0,0,0,.78);
          cursor: pointer; outline: none; user-select: none;
          transition: all .18s;
        }
        .wl-hk-display:hover { background: rgba(0,0,0,.05); }
        .wl-hk-display.recording {
          border-color: #e58522; background: rgba(229,133,34,.08);
          color: #e58522; box-shadow: 0 0 0 3.5px rgba(229,133,34,.15);
        }
        .wl-set-actions {
          display: flex; align-items: center; gap: 8px; margin-top: 18px;
        }
      `;
      document.head.appendChild(style);
    }

    function buildPanel() {
      ensureStyle();

      const root = document.createElement('div');
      root.id = 'wl-root';
      root.innerHTML = `
        <div id="wl-panel">
          <div class="wl-header">
            <div class="wl-title">
              <div class="wl-title-icon">🧲</div>
              磁力链接预览
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <div class="wl-tabs">
                <button class="wl-tab active" data-tab="query">查询</button>
                <button class="wl-tab" data-tab="hist">历史</button>
              </div>
              <button class="wl-close" id="wl-settings-btn" title="设置" style="font-size:14px;">⚙</button>
              <button class="wl-close" id="wl-close" title="关闭">✕</button>
            </div>
          </div>

          <div class="wl-body" id="wl-body-query">
            <div class="wl-input-row">
              <input class="wl-input" id="wl-url" placeholder="粘贴磁力链接 magnet:? / ed2k:// / http://" />
              <button class="wl-btn-pri" id="wl-query">查询</button>
            </div>
            <div id="wl-result"></div>
          </div>

          <div class="wl-body" id="wl-body-hist" style="display:none;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
              <span style="font-size:12px;font-weight:600;color:rgba(0,0,0,.5);">最近查询</span>
              <button class="wl-btn-sec" id="wl-clear-hist" style="color:#e55553;border-color:rgba(229,85,83,.2);height:28px;padding:0 12px;font-size:11.5px;">清空历史</button>
            </div>
            <div id="wl-hist-list"></div>
          </div>
        </div>
      `;
      document.body.appendChild(root);

      const urlInput  = root.querySelector('#wl-url');
      const queryBtn  = root.querySelector('#wl-query');
      const resultDiv = root.querySelector('#wl-result');
      const histList  = root.querySelector('#wl-hist-list');
      const bodyQuery = root.querySelector('#wl-body-query');
      const bodyHist  = root.querySelector('#wl-body-hist');
      const tabs      = root.querySelectorAll('.wl-tab');

      root.querySelector('#wl-close').addEventListener('click', () => { root.style.display = 'none'; });
      root.querySelector('#wl-settings-btn').addEventListener('click', openSettings);
      root.addEventListener('click', e => { if (e.target === root) root.style.display = 'none'; });

      tabs.forEach(tab => {
        tab.addEventListener('click', () => {
          tabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          const t = tab.dataset.tab;
          bodyQuery.style.display = t === 'query' ? '' : 'none';
          bodyHist.style.display  = t === 'hist'  ? '' : 'none';
          if (t === 'hist') renderHist();
        });
      });

      let imgList = [], imgIdx = 0;

      function doQuery(url) {
        if (!url) { flashToast('请输入链接'); return; }
        queryBtn.disabled = true;
        resultDiv.innerHTML = `
          <div class="wl-loading">
            <div class="wl-spinner"></div>
            <span style="font-size:12.5px;">查询中,请稍候…</span>
          </div>`;

        GM_xmlhttpRequest({
          method: 'GET',
          url: `https://whatslink.info/api/v1/link?url=${encodeURIComponent(url)}`,
          onload(res) {
            queryBtn.disabled = false;
            try {
              const data = JSON.parse(res.responseText);
              renderResult(url, data);
              addHistory(url, data);
            } catch {
              resultDiv.innerHTML = `<div class="wl-empty"><div class="wl-empty-icon">⚠️</div>解析响应失败,请重试</div>`;
            }
          },
          onerror() {
            queryBtn.disabled = false;
            resultDiv.innerHTML = `<div class="wl-empty"><div class="wl-empty-icon">📡</div>网络请求失败,请检查网络</div>`;
          }
        });
      }

      queryBtn.addEventListener('click', () => doQuery(urlInput.value.trim()));
      urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') doQuery(urlInput.value.trim()); });

      function renderResult(url, data) {
        imgList = data.screenshots || [];
        imgIdx  = 0;
        const icon = fileIcon(data.file_type);
        const bg   = iconBg(data.file_type);
        const tc   = tagColor(data.file_type);

        const tagsHtml = [
          data.file_type ? `<span class="wl-tag" style="background:${tc.bg};color:${tc.color};border:.5px solid ${tc.border};">${data.file_type}</span>` : '',
          data.size      ? `<span class="wl-tag" style="background:rgba(0,0,0,.05);color:rgba(0,0,0,.45);border:.5px solid rgba(0,0,0,.08);">${fmtSize(data.size)}</span>` : '',
          data.count     ? `<span class="wl-tag" style="background:rgba(0,0,0,.05);color:rgba(0,0,0,.45);border:.5px solid rgba(0,0,0,.08);">${data.count} 个文件</span>` : '',
        ].filter(Boolean).join('');

        const filesHtml = (data.files && data.files.length) ? `
          <hr class="wl-divider" />
          <div style="font-size:11.5px;font-weight:600;color:rgba(0,0,0,.5);margin-bottom:8px;">
            📂 文件列表 <span style="font-weight:400;color:rgba(0,0,0,.3);">(${data.files.length})</span>
          </div>
          <div>
            ${data.files.slice(0, 8).map(f => `
              <div class="wl-file-row">
                <span>${fileIcon(f.file_type)}</span>
                <span class="wl-file-name" title="${f.name || ''}">${f.name || '未命名'}</span>
                <span class="wl-file-size">${fmtSize(f.size)}</span>
              </div>
            `).join('')}
            ${data.files.length > 8 ? `<div class="wl-sub" style="text-align:center;padding-top:8px;">还有 ${data.files.length - 8} 个文件…</div>` : ''}
          </div>
        ` : '';

        const imgHtml = imgList.length ? `
          <div class="wl-img-wrap">
            <img id="wl-img" src="${imgList[0].screenshot}" />
            ${imgList.length > 1 ? `
              <button class="wl-img-nav" id="wl-prev" style="left:10px;">‹</button>
              <button class="wl-img-nav" id="wl-next" style="right:10px;">›</button>
              <div class="wl-img-counter" id="wl-img-counter">1 / ${imgList.length}</div>
            ` : ''}
          </div>
        ` : '';

        resultDiv.innerHTML = `
          <div class="wl-card">
            <div style="display:flex;align-items:flex-start;gap:13px;">
              <div class="wl-icon-box" style="background:${bg};">${icon}</div>
              <div style="flex:1;min-width:0;">
                <div class="wl-name-text" title="${data.name || ''}">${data.name || '未知文件名'}</div>
                <div class="wl-tags">${tagsHtml}</div>
              </div>
            </div>
            ${imgHtml}
            ${filesHtml}
          </div>
        `;

        if (imgList.length > 1) {
          const img     = resultDiv.querySelector('#wl-img');
          const counter = resultDiv.querySelector('#wl-img-counter');
          resultDiv.querySelector('#wl-prev').addEventListener('click', e => {
            e.stopPropagation();
            imgIdx = (imgIdx - 1 + imgList.length) % imgList.length;
            img.style.opacity = '0';
            setTimeout(() => { img.src = imgList[imgIdx].screenshot; img.style.opacity = '1'; }, 150);
            counter.textContent = `${imgIdx + 1} / ${imgList.length}`;
          });
          resultDiv.querySelector('#wl-next').addEventListener('click', e => {
            e.stopPropagation();
            imgIdx = (imgIdx + 1) % imgList.length;
            img.style.opacity = '0';
            setTimeout(() => { img.src = imgList[imgIdx].screenshot; img.style.opacity = '1'; }, 150);
            counter.textContent = `${imgIdx + 1} / ${imgList.length}`;
          });
        }

        if (imgList.length) {
          resultDiv.querySelector('#wl-img').addEventListener('click', () => {
            const fs = document.createElement('div');
            fs.className = 'wl-fullscreen';
            fs.innerHTML = `<img src="${imgList[imgIdx].screenshot}" />`;
            document.body.appendChild(fs);
            fs.addEventListener('click', () => fs.remove());
          });
        }
      }

      function renderHist() {
        const arr = loadHistory();
        if (!arr.length) {
          histList.innerHTML = `
            <div class="wl-empty">
              <div class="wl-empty-icon">🗂️</div>
              暂无历史记录
            </div>`;
          return;
        }
        histList.innerHTML = arr.map((h, i) => `
          <div class="wl-hist-row" data-i="${i}">
            <div class="wl-hist-icon" style="background:${iconBg(h.file_type)};">${fileIcon(h.file_type)}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(0,0,0,.8);">${h.name}</div>
              <div class="wl-sub">${fmtSize(h.size)} · ${h.date}</div>
            </div>
            <button class="wl-btn-sec wl-del" data-i="${i}" style="color:#e55553;border-color:rgba(229,85,83,.2);height:28px;padding:0 10px;font-size:11px;">✕</button>
          </div>
        `).join('');

        histList.querySelectorAll('.wl-hist-row').forEach(row => {
          row.addEventListener('click', e => {
            if (e.target.classList.contains('wl-del')) return;
            const h = loadHistory()[+row.dataset.i];
            urlInput.value = h.url;
            tabs[0].click();
            doQuery(h.url);
          });
        });
        histList.querySelectorAll('.wl-del').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            const arr2 = loadHistory();
            arr2.splice(+btn.dataset.i, 1);
            saveHistory(arr2);
            renderHist();
            flashToast('已删除');
          });
        });
      }

      root.querySelector('#wl-clear-hist').addEventListener('click', () => {
        saveHistory([]); renderHist(); flashToast('历史已清空');
      });

      navigator.clipboard.readText().then(text => {
        if (text && /^(magnet:\?|ed2k:\/\/|https?:\/\/)/i.test(text)) {
          urlInput.value = text.trim();
          flashToast('已从剪贴板读取链接 ✓');
        }
      }).catch(() => {});
    }
  }

  function runPlainVersion() {
    if (document.getElementById('wl-panel-root')) {
      const r = document.getElementById('wl-panel-root');
      r.style.display = r.style.display === 'none' ? 'flex' : 'none';
      return;
    }

    const API_BASE = 'https://whatslink.info/api/v1/link?url=';

    const PROXY_POOL = [
      {
        name: 'AllOrigins',
        build: t => 'https://api.allorigins.win/get?url=' + encodeURIComponent(t),
        parse: raw => JSON.parse(raw.contents)
      },
      {
        name: 'Codetabs',
        build: t => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(t),
        parse: raw => typeof raw === 'string' ? JSON.parse(raw) : raw
      },
      {
        name: 'CorsProxy.io',
        build: t => 'https://corsproxy.io/?url=' + encodeURIComponent(t),
        parse: raw => typeof raw === 'string' ? JSON.parse(raw) : raw
      },
      {
        name: 'ThingProxy',
        build: t => 'https://thingproxy.freeboard.io/fetch/' + t,
        parse: raw => typeof raw === 'string' ? JSON.parse(raw) : raw
      },
      {
        name: 'Whateverorigin',
        build: t => 'https://www.whateverorigin.org/get?url=' + encodeURIComponent(t),
        parse: raw => JSON.parse(raw.contents)
      },
      {
        name: 'CORS.eu.org',
        build: t => 'https://cors.eu.org/' + t,
        parse: raw => typeof raw === 'string' ? JSON.parse(raw) : raw
      }
    ];

    const FIXED_PROXY_INDEX = 1;

    async function requestOne(proxy, targetUrl) {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch(proxy.build(targetUrl), { signal: controller.signal });
        clearTimeout(tid);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const text = await resp.text();
        let raw;
        try { raw = JSON.parse(text); } catch { raw = text; }
        const data = proxy.parse(raw);
        if (!data || (!data.name && !data.file_type)) throw new Error('数据格式无效');
        return data;
      } catch (err) {
        clearTimeout(tid);
        throw err;
      }
    }

    async function fetchData(targetUrl, selectedIndex) {
      if (selectedIndex >= 0) {
        setStatus('使用 ' + PROXY_POOL[selectedIndex].name + ' 查询中…');
        return requestOne(PROXY_POOL[selectedIndex], targetUrl);
      }
      let lastErr;
      for (let i = 0; i < PROXY_POOL.length; i++) {
        setStatus('自动轮询：尝试 ' + PROXY_POOL[i].name + ' (' + (i + 1) + '/' + PROXY_POOL.length + ')…');
        try { return await requestOne(PROXY_POOL[i], targetUrl); }
        catch (err) { lastErr = err; }
      }
      throw lastErr || new Error('所有代理均失败');
    }

    function setStatus(msg) {
      const el = document.getElementById('wl-status');
      if (el) el.textContent = msg;
    }

    async function doQuery() {
      const urlInput  = document.getElementById('wl-url');
      const resultDiv = document.getElementById('wl-result');
      const queryBtn  = document.getElementById('wl-query-btn');
      const url = urlInput.value.trim();

      if (!url) { showToast('请输入磁力/ed2k链接'); return; }

      queryBtn.disabled = true;
      resultDiv.innerHTML = '';
      const statusEl = document.createElement('div');
      statusEl.id = 'wl-status';
      statusEl.style.cssText = 'text-align:center;padding:20px;color:#999;font-size:12px;';
      statusEl.textContent = '准备请求…';
      resultDiv.appendChild(statusEl);

      try {
        const data = await fetchData(API_BASE + encodeURIComponent(url), FIXED_PROXY_INDEX);
        renderResult(url, data);
      } catch (e) {
        resultDiv.innerHTML = '';
        const errEl = document.createElement('div');
        errEl.style.cssText = 'color:#e65c53;padding:15px;font-size:12px;background:rgba(230,92,83,0.06);border-radius:8px;margin-top:12px;';
        errEl.textContent = '查询失败，请稍后重试。';
        resultDiv.appendChild(errEl);
      } finally {
        queryBtn.disabled = false;
      }
    }

    function renderResult(url, data) {
      const resultDiv = document.getElementById('wl-result');
      const shots = (data.screenshots || []).map(s => s.screenshot).filter(Boolean);
      const typeMap = { video:'🎬', audio:'🎵', image:'🖼️', document:'📄', archive:'📦', text:'📝', folder:'📁' };

      resultDiv.innerHTML = '';

      const card = document.createElement('div');
      card.className = 'wl-card-plain';
      resultDiv.appendChild(card);

      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:10px;';
      const iconEl = document.createElement('span');
      iconEl.style.fontSize = '24px';
      iconEl.textContent = typeMap[data.file_type] || '❓';
      const nameEl = document.createElement('span');
      nameEl.className = 'wl-name-plain';
      nameEl.textContent = data.name || '未知文件名';
      titleRow.appendChild(iconEl);
      titleRow.appendChild(nameEl);
      card.appendChild(titleRow);

      const hasShots = shots.length > 0;

      const metaRow = document.createElement('div');
      metaRow.className = 'wl-meta-plain';
      metaRow.style.cssText += hasShots ? 'margin-bottom:12px;' : '';
      if (data.size) {
        const sizeEl = document.createElement('span');
        sizeEl.textContent = '💾 ' + (data.size / (1024 ** 3)).toFixed(2) + ' GB';
        metaRow.appendChild(sizeEl);
      }
      if (data.file_count) {
        const countEl = document.createElement('span');
        countEl.textContent = '📦 ' + data.file_count + ' 个文件';
        metaRow.appendChild(countEl);
      }
      card.appendChild(metaRow);

      if (hasShots) {
        let idx = 0;

        const wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;border-radius:10px;overflow:hidden;background:#111;user-select:none;';

        const img = document.createElement('img');
        img.src = shots[0];
        img.style.cssText = 'width:100%;display:block;max-height:220px;object-fit:contain;cursor:zoom-in;';
        wrap.appendChild(img);

        if (shots.length > 1) {
          const counter = document.createElement('div');
          counter.className = 'wl-overlay';
          counter.style.cssText = 'position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.55);color:#fff;font-size:11px;padding:2px 10px;border-radius:20px;pointer-events:none;opacity:0;transition:opacity .25s ease;';
          counter.textContent = '1 / ' + shots.length;
          wrap.appendChild(counter);

          const navStyle = 'position:absolute;top:50%;transform:translateY(-50%);width:30px;height:30px;border:0;border-radius:50%;background:rgba(0,0,0,0.5);color:#fff;font-size:20px;line-height:1;cursor:pointer;opacity:0;transition:opacity .25s ease;';

          const prevBtn = document.createElement('button');
          prevBtn.className = 'wl-overlay';
          prevBtn.textContent = '‹';
          prevBtn.style.cssText = navStyle + 'left:8px;';

          const nextBtn = document.createElement('button');
          nextBtn.className = 'wl-overlay';
          nextBtn.textContent = '›';
          nextBtn.style.cssText = navStyle + 'right:8px;';

          function goTo(n) {
            idx = (n + shots.length) % shots.length;
            img.src = shots[idx];
            counter.textContent = (idx + 1) + ' / ' + shots.length;
          }

          prevBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(idx - 1); });
          nextBtn.addEventListener('click', function(e) { e.stopPropagation(); goTo(idx + 1); });
          wrap.appendChild(prevBtn);
          wrap.appendChild(nextBtn);

          const overlays = [counter, prevBtn, nextBtn];
          const showOverlays = () => overlays.forEach(el => { el.style.opacity = '1'; });
          const hideOverlays = () => overlays.forEach(el => { el.style.opacity = '0'; });

          wrap.addEventListener('mouseenter', showOverlays);
          wrap.addEventListener('mouseleave', hideOverlays);

          let touchTimer = null;
          wrap.addEventListener('touchstart', function () {
            showOverlays();
            clearTimeout(touchTimer);
            touchTimer = setTimeout(hideOverlays, 1500);
          }, { passive: true });
        }

        img.addEventListener('click', function () {
          const fs = document.createElement('div');
          fs.style.cssText = 'position:fixed;inset:0;z-index:2147483648;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
          const fsImg = document.createElement('img');
          fsImg.src = img.src;
          fsImg.style.cssText = 'max-width:92vw;max-height:92vh;border-radius:8px;';
          fs.appendChild(fsImg);
          fs.addEventListener('click', function () { fs.remove(); });
          document.body.appendChild(fs);
        });

        card.appendChild(wrap);
      }
    }

    const style = document.createElement('style');
    style.id = 'wl-style-plain';
    style.textContent = [
      '#wl-panel-root{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);font-family:system-ui,-apple-system,sans-serif;}',
      '#wl-panel{position:relative;width:400px;max-width:calc(100vw - 32px);max-height:calc(100vh - 48px);overflow-y:auto;background:#f9f9f9;border-radius:20px;padding:20px;box-shadow:0 20px 50px rgba(0,0,0,.2);}',
      '.wl-label{font-size:11px;color:#999;margin:0 0 5px 4px;display:block;}',
      '.wl-input{width:100%;height:42px;border:1px solid rgba(0,0,0,.1);border-radius:10px;padding:0 12px;box-sizing:border-box;font-size:13px;outline:none;background:#fff;transition:border-color .2s;}',
      '.wl-input:focus{border-color:#f3a04c;}',
      '.wl-btn{width:100%;height:42px;background:#f3a04c;color:#fff;border:none;border-radius:10px;cursor:pointer;font-weight:600;font-size:14px;margin-top:12px;}',
      '.wl-btn:hover{opacity:.9;}',
      '.wl-btn:disabled{background:#ccc;cursor:not-allowed;}',
      '.wl-title-plain{font-weight:700;color:#333;font-size:15px;}',
      '#wl-close-plain{cursor:pointer;color:#aaa;font-size:20px;padding:0 5px;}',
      '.wl-card-plain{background:#fff;border:1px solid rgba(0,0,0,0.08);border-radius:12px;padding:15px;margin-top:15px;}',
      '.wl-name-plain{font-weight:600;font-size:13px;word-break:break-all;color:#333;flex:1;}',
      '.wl-meta-plain{font-size:11px;color:#888;display:flex;gap:12px;flex-wrap:wrap;}',
      '#wl-toast{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:#333;color:#fff;padding:8px 16px;border-radius:20px;font-size:12px;text-align:center;white-space:nowrap;opacity:0;transition:opacity .3s;pointer-events:none;}',
      '#wl-toast.show{opacity:1;}',
      '@media (prefers-color-scheme: dark){',
      '  #wl-panel-root{background:rgba(0,0,0,.55);}',
      '  #wl-panel{background:#1c1c1e;box-shadow:0 20px 50px rgba(0,0,0,.5);}',
      '  .wl-label{color:rgba(255,255,255,.4);}',
      '  .wl-input{background:rgba(255,255,255,.06);color:rgba(255,255,255,.88);border-color:rgba(255,255,255,.12);}',
      '  .wl-input:focus{border-color:#f3a04c;}',
      '  .wl-title-plain{color:rgba(255,255,255,.92);}',
      '  #wl-close-plain{color:rgba(255,255,255,.4);}',
      '  .wl-card-plain{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.08);}',
      '  .wl-name-plain{color:rgba(255,255,255,.9);}',
      '  .wl-meta-plain{color:rgba(255,255,255,.45);}',
      '  #wl-toast{background:rgba(255,255,255,.92);color:#1c1c1e;}',
      '}'
    ].join('');
    document.head.appendChild(style);

    const root = document.createElement('div');
    root.id = 'wl-panel-root';

    const panel = document.createElement('div');
    panel.id = 'wl-panel';
    root.appendChild(panel);

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;';
    const title = document.createElement('span');
    title.className = 'wl-title-plain';
    title.textContent = '🧲 磁力预览';
    const closeBtn = document.createElement('span');
    closeBtn.id = 'wl-close-plain';
    closeBtn.textContent = '✕';
    header.appendChild(title);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    const urlLabel = document.createElement('label');
    urlLabel.className = 'wl-label';
    urlLabel.textContent = '链接';
    panel.appendChild(urlLabel);

    const urlInput = document.createElement('input');
    urlInput.className = 'wl-input';
    urlInput.id = 'wl-url';
    urlInput.placeholder = '粘贴 magnet:? 或 ed2k://';
    panel.appendChild(urlInput);

    const queryBtn = document.createElement('button');
    queryBtn.className = 'wl-btn';
    queryBtn.id = 'wl-query-btn';
    queryBtn.textContent = '查询详情';
    panel.appendChild(queryBtn);

    const resultDiv = document.createElement('div');
    resultDiv.id = 'wl-result';
    panel.appendChild(resultDiv);

    const toast = document.createElement('div');
    toast.id = 'wl-toast';
    panel.appendChild(toast);

    document.body.appendChild(root);

    function showToast(msg) {
      toast.textContent = msg;
      toast.classList.add('show');
      setTimeout(function () { toast.classList.remove('show'); }, 2000);
    }

    function destroy() {
      document.removeEventListener('keydown', hotkeyHandler);
      root.remove();
      style.remove();
    }

    function hotkeyHandler(e) {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        if (!document.getElementById('wl-panel-root')) return;
        root.style.display = root.style.display === 'none' ? 'flex' : 'none';
        if (root.style.display === 'flex') urlInput.focus();
      }
    }

    queryBtn.addEventListener('click', doQuery);
    urlInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') doQuery(); });
    closeBtn.addEventListener('click', destroy);
    root.addEventListener('click', function (e) { if (e.target === root) destroy(); });
    document.addEventListener('keydown', hotkeyHandler);

    navigator.clipboard.readText().then(function (text) {
      const t = text.trim();
      if (t.startsWith('magnet:') || t.startsWith('ed2k://')) urlInput.value = t;
    }).catch(function () {});
  }

})();