(function () {
  'use strict';

  if (window.top !== window.self) return;
  if (document.getElementById('__Yuze_ls_host__')) return;

  const DEFAULT_WIDTH = 890;
  const DEFAULT_HEIGHT = 650;
  const MIN_WIDTH = 620;
  const MIN_HEIGHT = 320;
  const EDGE_GAP = 12;

  const DEFAULT_DETAIL_WIDTH = 240;
  const MIN_DETAIL_WIDTH = 240;
  const MAX_DETAIL_WIDTH = 520;
  const MIN_LIST_WIDTH = 340;
  const SPLITTER_LINE_WIDTH = 1;

  const host = document.createElement('div');
  host.id = '__Yuze_ls_host__';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      position: fixed;
      right: 16px;
      bottom: 16px;
      width: min(890px, calc(100vw - 24px));
      height: min(650px, calc(100vh - 24px));
      min-width: 620px;
      min-height: 320px;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      z-index: 2147483647;

      --ls-primary: #f3a04c;
      --ls-primary-hover: #e88f35;
      --ls-primary-fg: #ffffff;

      --ls-bg: #f4f4f6;
      --ls-surface: #ffffff;
      --ls-panel: #fbfaf8;
      --ls-line: rgba(0, 0, 0, .08);
      --ls-line-strong: rgba(0, 0, 0, .14);

      --ls-text: rgba(0, 0, 0, .86);
      --ls-sub: rgba(0, 0, 0, .58);
      --ls-muted: rgba(0, 0, 0, .38);

      --ls-hover: rgba(0, 0, 0, .035);
      --ls-active: rgba(243, 160, 76, .13);
      --ls-danger: #e65c53;
      --ls-ok: #40b43e;
      --ls-warn: #eba400;

      --ls-json: #4f9ed2;
      --ls-num: #6aa84f;
      --ls-bool: #9869b5;

      --ls-shadow: rgba(0, 0, 0, .18);
      --ls-radius: 14px;
      --detail-width: 240px;

      color-scheme: light dark;
      font-family:
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        "Microsoft YaHei",
        "PingFang SC",
        sans-serif;
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --ls-bg: #232324;
        --ls-surface: #2e2e2e;
        --ls-panel: #292929;
        --ls-line: rgba(255, 255, 255, .09);
        --ls-line-strong: rgba(255, 255, 255, .15);

        --ls-text: rgba(255, 255, 255, .88);
        --ls-sub: rgba(255, 255, 255, .58);
        --ls-muted: rgba(255, 255, 255, .36);

        --ls-hover: rgba(255, 255, 255, .045);
        --ls-active: rgba(243, 160, 76, .16);
        --ls-shadow: rgba(0, 0, 0, .45);

        --ls-primary-fg: #000000;
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    button,
    input,
    textarea {
      font: inherit;
    }

    button {
      cursor: pointer;
      user-select: none;
    }

    .panel {
      position: relative;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;

      background: var(--ls-bg);
      border: 1px solid var(--ls-line-strong);
      border-radius: var(--ls-radius);
      box-shadow: 0 16px 48px var(--ls-shadow);
      color: var(--ls-text);
    }

    .panel.is-collapsed {
      height: 44px;
      min-height: 44px;
    }

    .panel.is-collapsed .toolbar,
    .panel.is-collapsed .main,
    .panel.is-collapsed .footer,
    .panel.is-collapsed .resize-handle {
      display: none;
    }

    .topbar {
      height: 44px;
      flex: 0 0 44px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px 0 12px;

      background: var(--ls-panel);
      border-bottom: 1px solid var(--ls-line);
      cursor: move;
      user-select: none;
    }

    .brand {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .brand-icon {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      color: var(--ls-sub);
    }

    .brand-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--ls-text);
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .pill {
      height: 20px;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      padding: 0 8px;
      border-radius: 999px;
      background: rgba(0, 0, 0, .055);
      color: var(--ls-sub);
      font-size: 11px;
      font-weight: 600;
      line-height: 20px;
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .pill {
        background: rgba(255, 255, 255, .07);
      }
    }

    .top-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex: 0 0 auto;
    }

    .icon-button {
      width: 30px;
      height: 30px;
      flex: 0 0 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      border: 1px solid var(--ls-line-strong);
      border-radius: 9px;
      background: var(--ls-surface);
      color: var(--ls-sub);
      line-height: 1;
      transition: background .12s ease, color .12s ease, border-color .12s ease;
    }

    .icon-button svg {
      width: 15px;
      height: 15px;
      display: block;
      stroke: currentColor;
      fill: none;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .icon-button:hover {
      background: var(--ls-hover);
      color: var(--ls-text);
    }

    .icon-button.is-on {
      color: var(--ls-primary);
      border-color: rgba(243, 160, 76, .38);
      background: rgba(243, 160, 76, .14);
    }

    .toolbar {
      height: 54px;
      flex: 0 0 54px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto auto auto;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;

      background: var(--ls-panel);
      border-bottom: 1px solid var(--ls-line);
    }

    .search-wrap {
      position: relative;
      min-width: 0;
      height: 34px;
    }

    .search-icon {
      position: absolute;
      left: 11px;
      top: 50%;
      width: 14px;
      height: 14px;
      transform: translateY(-50%);
      color: var(--ls-muted);
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      height: 34px;
      display: block;

      border: 1px solid var(--ls-line-strong);
      border-radius: 10px;
      background: var(--ls-surface);
      color: var(--ls-text);
      padding: 0 12px 0 32px;
      outline: none;

      font-size: 13px;
      line-height: 34px;
    }

    .search-input:focus {
      border-color: rgba(243, 160, 76, .58);
    }

    .primary-button {
      height: 34px;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      border: 0;
      border-radius: 10px;
      background: var(--ls-primary);
      color: var(--ls-primary-fg);
      padding: 0 14px;

      font-size: 12px;
      font-weight: 700;
      white-space: nowrap;
      transition: background .12s ease;
    }

    .primary-button:hover {
      background: var(--ls-primary-hover);
    }

    .main {
      flex: 1;
      min-height: 0;
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1px minmax(240px, var(--detail-width));
      background: var(--ls-surface);
      overflow: hidden;
    }

    .list-pane {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--ls-surface);
    }

    .splitter {
      position: relative;
      width: 11px;
      min-width: 11px;
      margin-left: -5px;
      margin-right: -5px;
      background: transparent;
      cursor: col-resize;
      user-select: none;
      z-index: 4;
    }

    .splitter::before {
      content: "";
      position: absolute;
      top: 0;
      bottom: 0;
      left: 5px;
      width: 1px;
      background: var(--ls-line);
      transition: background .12s ease;
    }

    .splitter:hover::before,
    .splitter.is-dragging::before {
      background: var(--ls-primary);
    }

    .splitter::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 3px;
      width: 5px;
      height: 42px;
      border-radius: 999px;
      background: var(--ls-line-strong);
      opacity: 0;
      transform: translateY(-50%);
      transition: opacity .12s ease;
    }

    .splitter:hover::after,
    .splitter.is-dragging::after {
      opacity: .32;
    }

    .table-head {
      height: 34px;
      flex: 0 0 34px;
      display: grid;
      grid-template-columns: minmax(160px, 1.05fr) minmax(190px, 1.35fr) 104px;
      align-items: center;
      padding: 0 12px;

      background: var(--ls-panel);
      border-bottom: 1px solid var(--ls-line);
      color: var(--ls-muted);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: .04em;
      line-height: 1;
    }

    .table-head-cell {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .table-head-cell.sortable {
      cursor: pointer;
    }

    .table-head-cell.sortable:hover {
      color: var(--ls-text);
    }

    .row-list {
      flex: 1;
      min-height: 0;
      overflow: auto;
      background: var(--ls-surface);
    }

    .row {
      height: 40px;
      min-height: 40px;
      display: grid;
      grid-template-columns: minmax(160px, 1.05fr) minmax(190px, 1.35fr) 104px;
      align-items: center;
      padding: 0 12px;

      border-bottom: 1px solid var(--ls-line);
      color: var(--ls-text);
      transition: background .1s ease;
    }

    .row:hover {
      background: var(--ls-hover);
    }

    .row.is-active {
      background: var(--ls-active);
    }

    .key-cell {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      padding-right: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      font-weight: 700;
      line-height: 40px;
      color: var(--ls-text);
    }

    .value-cell {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
      overflow: hidden;

      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      color: var(--ls-sub);
      line-height: 1.35;
    }

    .value-text {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag {
      height: 16px;
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;

      border: 1px solid currentColor;
      border-radius: 5px;
      padding: 0 5px;

      font-size: 8px;
      font-weight: 800;
      line-height: 14px;
      opacity: .76;
    }

    .tag-json { color: var(--ls-json); }
    .tag-num  { color: var(--ls-num); }
    .tag-bool { color: var(--ls-bool); }

    .row-actions {
      width: 104px;
      min-width: 104px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      opacity: .25;
      transition: opacity .12s ease;
    }

    .row:hover .row-actions,
    .row.is-active .row-actions {
      opacity: 1;
    }

    .mini-button {
      width: 24px;
      height: 24px;
      flex: 0 0 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      border: 1px solid transparent;
      border-radius: 7px;
      background: transparent;
      color: var(--ls-sub);
      font-size: 12px;
      line-height: 1;

      transition: background .12s ease, color .12s ease, border-color .12s ease;
    }

    .mini-button:hover {
      background: var(--ls-hover);
      border-color: var(--ls-line-strong);
      color: var(--ls-text);
    }

    .mini-button.danger:hover {
      color: var(--ls-danger);
      background: rgba(230, 92, 83, .1);
      border-color: rgba(230, 92, 83, .28);
    }

    .empty {
      display: none;
      padding: 36px 18px;
      text-align: center;
      color: var(--ls-muted);
      font-size: 13px;
      line-height: 1.6;
    }

    .detail-pane {
      min-width: 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: var(--ls-panel);
    }

    .detail-head {
      height: 38px;
      flex: 0 0 38px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;

      border-bottom: 1px solid var(--ls-line);
      color: var(--ls-text);
      font-size: 13px;
      font-weight: 800;
      line-height: 1;
    }

    .detail-status {
      margin-left: auto;
      color: var(--ls-muted);
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .detail-body {
      flex: 1;
      min-height: 0;
      min-width: 0;
      overflow: auto;
      padding: 12px;
    }

    .meta {
      min-width: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }

    .meta-chip {
      height: 22px;
      display: inline-flex;
      align-items: center;

      border-radius: 999px;
      background: rgba(0, 0, 0, .055);
      color: var(--ls-sub);
      padding: 0 8px;

      font-size: 11px;
      font-weight: 700;
      line-height: 22px;
      white-space: nowrap;
    }

    @media (prefers-color-scheme: dark) {
      .meta-chip {
        background: rgba(255, 255, 255, .07);
      }
    }

    .field-label {
      margin: 12px 0 6px;
      color: var(--ls-muted);
      font-size: 11px;
      font-weight: 800;
      line-height: 1.2;
    }

    .code-box {
      min-width: 0;
      min-height: 44px;
      max-height: 220px;
      overflow: auto;

      background: var(--ls-surface);
      border: 1px solid var(--ls-line);
      border-radius: 10px;
      padding: 10px 12px;

      color: var(--ls-text);
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      line-height: 1.6;
      white-space: pre-wrap;
      word-break: break-word;
      overflow-wrap: anywhere;
    }

    .footer {
      height: 32px;
      flex: 0 0 32px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 12px;

      background: var(--ls-panel);
      border-top: 1px solid var(--ls-line);
      color: var(--ls-muted);

      font-size: 11px;
      font-weight: 600;
      line-height: 1;
    }

    .footer span { white-space: nowrap; }

    .footer-space {
      flex: 1;
      min-width: 0;
    }

    .danger-link {
      flex: 0 0 auto;
      border: 0;
      background: transparent;
      color: var(--ls-danger);
      font-size: 11px;
      font-weight: 700;
      opacity: .78;
      white-space: nowrap;
    }

    .danger-link:hover {
      opacity: 1;
      text-decoration: underline;
    }

    .resize-handle {
      position: absolute;
      right: 0;
      bottom: 0;
      width: 18px;
      height: 18px;
      z-index: 5;
      cursor: nwse-resize;
      border-bottom-right-radius: var(--ls-radius);
      opacity: .56;
    }

    .resize-handle::before {
      content: "";
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 9px;
      height: 9px;
      background:
        linear-gradient(135deg, transparent 0 45%, var(--ls-muted) 46% 54%, transparent 55%),
        linear-gradient(135deg, transparent 0 65%, var(--ls-muted) 66% 74%, transparent 75%);
      opacity: .75;
    }

    .resize-handle:hover { opacity: 1; }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(0, 0, 0, .35);
    }

    .modal {
      width: 460px;
      max-width: calc(100vw - 32px);
      background: var(--ls-surface);
      border: 1px solid var(--ls-line-strong);
      border-radius: 14px;
      box-shadow: 0 18px 52px rgba(0, 0, 0, .26);
      padding: 16px;
      color: var(--ls-text);
    }

    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 14px;
    }

    .modal-title {
      color: var(--ls-text);
      font-size: 14px;
      font-weight: 800;
      line-height: 1;
    }

    .secondary-button {
      height: 26px;
      border: 1px solid var(--ls-line-strong);
      border-radius: 8px;
      background: var(--ls-bg);
      color: var(--ls-sub);
      padding: 0 10px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }

    .secondary-button:hover {
      color: var(--ls-text);
      background: var(--ls-hover);
    }

    .modal label {
      display: block;
      margin-bottom: 5px;
      color: var(--ls-sub);
      font-size: 11px;
      font-weight: 700;
    }

    .modal-input,
    .modal-textarea {
      width: 100%;
      border: 1px solid var(--ls-line-strong);
      border-radius: 9px;
      background: var(--ls-bg);
      color: var(--ls-text);
      outline: none;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
    }

    .modal-input {
      height: 36px;
      padding: 0 10px;
      line-height: 36px;
      margin-bottom: 12px;
    }

    .modal-textarea {
      min-height: 170px;
      resize: vertical;
      line-height: 1.6;
      padding: 10px;
      margin-bottom: 8px;
    }

    .modal-input:focus,
    .modal-textarea:focus {
      border-color: rgba(243, 160, 76, .58);
      background: var(--ls-surface);
    }

    .modal-hint {
      min-height: 16px;
      margin-bottom: 12px;
      color: var(--ls-muted);
      font-size: 11px;
      line-height: 1.4;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .modal-button {
      height: 34px;
      border-radius: 9px;
      padding: 0 14px;
      font-size: 12px;
      font-weight: 800;
      white-space: nowrap;
    }

    .modal-button.cancel {
      border: 1px solid var(--ls-line-strong);
      background: var(--ls-bg);
      color: var(--ls-text);
    }

    .modal-button.save {
      border: 0;
      background: var(--ls-primary);
      color: var(--ls-primary-fg);
    }

    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      z-index: 2147483647;
      transform: translateX(-50%) translateY(18px);
      opacity: 0;
      pointer-events: none;

      background: var(--ls-text);
      color: var(--ls-bg);
      border-radius: 999px;
      padding: 9px 15px;

      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      transition: opacity .18s ease, transform .18s ease;
    }

    .toast.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    @media (max-width: 900px) {
      :host {
        left: 8px !important;
        right: 8px !important;
        bottom: 8px !important;
        width: auto !important;
        height: min(84vh, 760px);
        min-width: 0;
      }

      .main {
        grid-template-columns: 1fr;
        grid-template-rows: minmax(220px, 1fr) 260px;
      }

      .splitter { display: none; }

      .toolbar {
        grid-template-columns: minmax(0, 1fr) auto auto;
      }

      .hide-narrow { display: none !important; }

      .table-head,
      .row {
        grid-template-columns: minmax(120px, 1fr) minmax(120px, 1fr) 96px;
      }

      .row-actions { width: 96px; min-width: 96px; }
      .resize-handle { display: none; }
    }

    @media (max-width: 560px) {
      .pill.size-pill { display: none; }

      .table-head,
      .row {
        grid-template-columns: minmax(105px, 1fr) minmax(90px, 1fr) 82px;
      }

      .row-actions { width: 82px; min-width: 82px; gap: 2px; }
      .mini-button { width: 22px; height: 22px; flex-basis: 22px; }
    }
  `;

  function svgIcon(name) {
    if (name === 'pin') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6"></path><path d="M9 9l6-6 6 6-6 6"></path><path d="M5 19l7-7"></path><path d="M8 12l4 4"></path></svg>';
    }
    if (name === 'chevron') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"></path></svg>';
    }
    if (name === 'chevronRight') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7l5 5-5 5"></path></svg>';
    }
    if (name === 'close') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6L6 18"></path></svg>';
    }
    if (name === 'refresh') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66"></path><path d="M20 4v6h-6"></path></svg>';
    }
    if (name === 'download') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12"></path><path d="M7 11l5 5 5-5"></path><path d="M5 20h14"></path></svg>';
    }
    if (name === 'upload') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V8"></path><path d="M7 13l5-5 5 5"></path><path d="M5 4h14"></path></svg>';
    }
    return '';
  }

  const panel = document.createElement('section');
  panel.className = 'panel';
  panel.innerHTML = ''
    + '<div class="topbar" id="topbar">'
    + '  <div class="brand">'
    + '    <svg class="brand-icon" viewBox="0 0 16 16" fill="none">'
    + '      <rect x="1.5" y="3.5" width="13" height="10" rx="2" stroke="currentColor" stroke-width="1.3"></rect>'
    + '      <path d="M5 3.5V2.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" stroke="currentColor" stroke-width="1.3"></path>'
    + '      <path d="M4.5 8h7M4.5 10.8h4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"></path>'
    + '    </svg>'
    + '    <div class="brand-title">localStorage</div>'
    + '    <span class="pill" id="countPill">0 项</span>'
    + '    <span class="pill size-pill" id="sizePill">0 B</span>'
    + '  </div>'
    + '  <div class="top-actions">'
    + '    <button class="icon-button" id="pinBtn" title="固定/取消固定">' + svgIcon('pin') + '</button>'
    + '    <button class="icon-button" id="collapseBtn" title="收起/展开">' + svgIcon('chevron') + '</button>'
    + '    <button class="icon-button" id="closeBtn" title="关闭">' + svgIcon('close') + '</button>'
    + '  </div>'
    + '</div>'
    + '<div class="toolbar">'
    + '  <div class="search-wrap">'
    + '    <svg class="search-icon" viewBox="0 0 16 16" fill="none">'
    + '      <circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.4"></circle>'
    + '      <path d="M11 11L14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"></path>'
    + '    </svg>'
    + '    <input class="search-input" id="searchInput" type="text" placeholder="搜索 key / value… (Ctrl+F)">'
    + '  </div>'
    + '  <button class="primary-button" id="addBtn">+ 新增</button>'
    + '  <button class="icon-button" id="refreshBtn" title="刷新">' + svgIcon('refresh') + '</button>'
    + '  <button class="icon-button hide-narrow" id="exportBtn" title="导出 JSON">' + svgIcon('download') + '</button>'
    + '  <button class="icon-button hide-narrow" id="importBtn" title="导入 JSON">' + svgIcon('upload') + '</button>'
    + '</div>'
    + '<div class="main" id="mainArea">'
    + '  <div class="list-pane">'
    + '    <div class="table-head">'
    + '      <div class="table-head-cell sortable" id="sortKeyBtn">KEY <span id="sortArrow">↑</span></div>'
    + '      <div class="table-head-cell">VALUE</div>'
    + '      <div class="table-head-cell" style="text-align:right">操作</div>'
    + '    </div>'
    + '    <div class="row-list" id="rowList"></div>'
    + '    <div class="empty" id="emptyState">暂无 localStorage 数据</div>'
    + '  </div>'
    + '  <div class="splitter" id="splitter" title="拖拽调整详情区宽度，双击恢复默认宽度"></div>'
    + '  <aside class="detail-pane">'
    + '    <div class="detail-head">'
    + '      <span>详情预览</span>'
    + '      <span class="detail-status" id="detailStatus">未选择条目</span>'
    + '    </div>'
    + '    <div class="detail-body">'
    + '      <div class="meta" id="metaBox"></div>'
    + '      <div class="field-label">Key</div>'
    + '      <div class="code-box" id="previewKey"></div>'
    + '      <div class="field-label">Value</div>'
    + '      <div class="code-box" id="previewValue"></div>'
    + '    </div>'
    + '  </aside>'
    + '</div>'
    + '<div class="footer">'
    + '  <span id="footerCount">共 0 条</span>'
    + '  <span>·</span>'
    + '  <span id="footerSort">按 Key 升序</span>'
    + '  <div class="footer-space"></div>'
    + '  <button class="danger-link" id="clearBtn">清空全部</button>'
    + '</div>'
    + '<div class="resize-handle" id="resizeHandle" title="拖拽缩放，双击恢复默认大小"></div>'
    + '<div class="modal-backdrop" id="modalBackdrop">'
    + '  <div class="modal">'
    + '    <div class="modal-head">'
    + '      <div class="modal-title" id="modalTitle">新增条目</div>'
    + '      <button class="secondary-button" id="formatBtn">格式化 JSON</button>'
    + '    </div>'
    + '    <label>Key</label>'
    + '    <input class="modal-input" id="modalKey" type="text">'
    + '    <label>Value</label>'
    + '    <textarea class="modal-textarea" id="modalValue" rows="7"></textarea>'
    + '    <div class="modal-hint" id="modalHint"></div>'
    + '    <div class="modal-footer">'
    + '      <button class="modal-button cancel" id="modalCancel">取消</button>'
    + '      <button class="modal-button save" id="modalSave">保存</button>'
    + '    </div>'
    + '  </div>'
    + '</div>'
    + '<div class="toast" id="toast"></div>';

  shadow.appendChild(style);
  shadow.appendChild(panel);

  const get = function (id) { return shadow.getElementById(id); };

  const topbar       = get('topbar');
  const countPill    = get('countPill');
  const sizePill     = get('sizePill');
  const searchInput  = get('searchInput');
  const rowList      = get('rowList');
  const emptyState   = get('emptyState');
  const sortArrow    = get('sortArrow');
  const footerCount  = get('footerCount');
  const footerSort   = get('footerSort');
  const detailStatus = get('detailStatus');
  const metaBox      = get('metaBox');
  const previewKey   = get('previewKey');
  const previewValue = get('previewValue');
  const modalBackdrop = get('modalBackdrop');
  const modalTitle   = get('modalTitle');
  const modalKey     = get('modalKey');
  const modalValue   = get('modalValue');
  const modalHint    = get('modalHint');
  const toast        = get('toast');
  const resizeHandle = get('resizeHandle');
  const splitter     = get('splitter');
  const mainArea     = get('mainArea');
  const collapseBtn  = get('collapseBtn');

  let activeKey    = null;
  let editKey      = null;
  let sortAsc      = true;
  let pinned       = false;
  let collapsed    = false;
  let searchTimer  = null;

  let dragging      = false;
  let dragOffsetX   = 0;
  let dragOffsetY   = 0;

  let resizing          = false;
  let resizeStartX      = 0;
  let resizeStartY      = 0;
  let resizeStartWidth  = 0;
  let resizeStartHeight = 0;

  let splitting = false;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function resetSize() {
    host.style.width  = Math.min(DEFAULT_WIDTH,  window.innerWidth  - EDGE_GAP * 2) + 'px';
    host.style.height = Math.min(DEFAULT_HEIGHT, window.innerHeight - EDGE_GAP * 2) + 'px';
    keepInsideViewport();
    showToast('已恢复默认尺寸');
  }

  function resetDetailWidth() {
    host.style.setProperty('--detail-width', DEFAULT_DETAIL_WIDTH + 'px');
    showToast('已恢复详情区宽度');
  }

  function keepInsideViewport() {
    const rect = host.getBoundingClientRect();
    let nextLeft = rect.left;
    let nextTop  = rect.top;

    if (rect.right  > window.innerWidth  - EDGE_GAP) nextLeft = Math.max(EDGE_GAP, window.innerWidth  - rect.width  - EDGE_GAP);
    if (rect.bottom > window.innerHeight - EDGE_GAP) nextTop  = Math.max(EDGE_GAP, window.innerHeight - rect.height - EDGE_GAP);
    if (rect.left < EDGE_GAP) nextLeft = EDGE_GAP;
    if (rect.top  < EDGE_GAP) nextTop  = EDGE_GAP;

    if (nextLeft !== rect.left || nextTop !== rect.top) {
      host.style.left   = nextLeft + 'px';
      host.style.top    = nextTop  + 'px';
      host.style.right  = 'auto';
      host.style.bottom = 'auto';
    }
  }

  function getAllItems() {
    const arr = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      arr.push({ key: key, value: localStorage.getItem(key) || '' });
    }
    return arr;
  }

  function calcSize() {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      total += (key.length + (localStorage.getItem(key) || '').length) * 2;
    }
    return total;
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  }

  function detectType(value) {
    const text = String(value).trim();
    if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
      try { JSON.parse(text); return 'json'; } catch (e) {}
    }
    if (text !== '' && !Number.isNaN(Number(text))) return 'num';
    if (text === 'true' || text === 'false') return 'bool';
    return '';
  }

  function prettyValue(value) {
    if (detectType(value) === 'json') {
      try { return JSON.stringify(JSON.parse(value), null, 2); } catch (e) {}
    }
    return value || '—';
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  function createMetaChip(text) {
    const chip = document.createElement('span');
    chip.className = 'meta-chip';
    chip.textContent = text;
    return chip;
  }

  function setPreview(item) {
    metaBox.innerHTML = '';
    if (!item) {
      detailStatus.textContent = '未选择条目';
      metaBox.appendChild(createMetaChip('点击左侧条目查看完整内容'));
      previewKey.textContent   = '';
      previewValue.textContent = '';
      return;
    }
    const type = detectType(item.value);
    detailStatus.textContent = '已选择';
    metaBox.appendChild(createMetaChip('Key'));
    if (type) metaBox.appendChild(createMetaChip(type.toUpperCase()));
    metaBox.appendChild(createMetaChip('长度 ' + String(item.value || '').length));
    if (type === 'json') metaBox.appendChild(createMetaChip('已格式化'));
    previewKey.textContent   = item.key;
    previewValue.textContent = prettyValue(item.value);
  }

  function fallbackCopy(text, successText) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try { document.execCommand('copy'); showToast(successText); } catch (e) { showToast('复制失败'); }
    textarea.remove();
  }

  function copyText(text, successText) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(function () { showToast(successText); })
        .catch(function () { fallbackCopy(text, successText); });
      return;
    }
    fallbackCopy(text, successText);
  }

  function updateModalHint() {
    const value = modalValue.value.trim();
    const type  = detectType(value);
    if (type === 'json') {
      modalHint.textContent = '✓ 检测到合法 JSON，可点击右上角格式化';
      modalHint.style.color = 'var(--ls-ok)';
      return;
    }
    if (value && (value.startsWith('{') || value.startsWith('['))) {
      modalHint.textContent = '⚠ 看起来像 JSON，但当前不是合法格式';
      modalHint.style.color = 'var(--ls-warn)';
      return;
    }
    modalHint.textContent = '';
    modalHint.style.color = 'var(--ls-muted)';
  }

  function openModal(mode, key, value) {
    editKey = mode === 'edit' ? key : null;
    modalTitle.textContent     = mode === 'edit' ? '编辑条目' : '新增条目';
    modalKey.value             = key   || '';
    modalValue.value           = value || '';
    modalKey.readOnly          = mode === 'edit';
    modalKey.style.opacity     = mode === 'edit' ? '.55' : '1';
    updateModalHint();
    modalBackdrop.style.display = 'flex';
    setTimeout(function () { (mode === 'add' ? modalKey : modalValue).focus(); }, 0);
  }

  function closeModal() {
    modalBackdrop.style.display = 'none';
    editKey = null;
  }

  function exportJson() {
    const obj   = {};
    const items = getAllItems();
    items.forEach(function (item) { obj[item.key] = item.value; });
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    const anchor = document.createElement('a');
    const href   = URL.createObjectURL(blob);
    anchor.href     = href;
    anchor.download = 'localStorage_' + location.hostname + '.json';
    anchor.click();
    setTimeout(function () { URL.revokeObjectURL(href); }, 300);
    showToast('已导出 ' + items.length + ' 条');
  }

  function importJson() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const obj = JSON.parse(String(reader.result));
          if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw new Error('bad json');
          let count = 0;
          Object.keys(obj).forEach(function (key) { localStorage.setItem(key, String(obj[key])); count++; });
          render();
          showToast('已导入 ' + count + ' 条');
        } catch (e) { alert('JSON 格式不正确'); }
      };
      reader.readAsText(file);
    });
    input.click();
  }

  function createTag(type) {
    const tag = document.createElement('span');
    tag.className   = 'tag tag-' + type;
    tag.textContent = type.toUpperCase();
    return tag;
  }

  function createMiniButton(text, title, danger) {
    const button = document.createElement('button');
    button.className   = danger ? 'mini-button danger' : 'mini-button';
    button.type        = 'button';
    button.title       = title;
    button.textContent = text;
    return button;
  }

  function buildRow(item) {
    const row = document.createElement('div');
    row.className = item.key === activeKey ? 'row is-active' : 'row';

    const keyCell = document.createElement('div');
    keyCell.className   = 'key-cell';
    keyCell.title       = item.key;
    keyCell.textContent = item.key;

    const valueCell = document.createElement('div');
    valueCell.className = 'value-cell';
    valueCell.title     = item.value;
    const type = detectType(item.value);
    if (type) valueCell.appendChild(createTag(type));
    const valueText = document.createElement('span');
    valueText.className   = 'value-text';
    valueText.textContent = item.value || '—';
    valueCell.appendChild(valueText);

    const actions    = document.createElement('div');
    actions.className = 'row-actions';
    const copyButton   = createMiniButton('⧉', '复制值', false);
    const editButton   = createMiniButton('✎', '编辑',   false);
    const deleteButton = createMiniButton('×', '删除',   true);
    actions.appendChild(copyButton);
    actions.appendChild(editButton);
    actions.appendChild(deleteButton);

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    row.appendChild(actions);

    row.addEventListener('click', function (event) {
      if (event.target.closest('button')) return;
      activeKey = item.key;
      setPreview(item);
      render();
    });

    copyButton.addEventListener('click', function (event) {
      event.stopPropagation();
      copyText(item.value, '已复制值到剪贴板');
    });

    editButton.addEventListener('click', function (event) {
      event.stopPropagation();
      openModal('edit', item.key, item.value);
    });

    deleteButton.addEventListener('click', function (event) {
      event.stopPropagation();
      if (!confirm('删除 "' + item.key + '"？')) return;
      localStorage.removeItem(item.key);
      if (activeKey === item.key) { activeKey = null; setPreview(null); }
      render();
      showToast('已删除');
    });

    return row;
  }

  function render() {
    const keyword = searchInput.value.trim().toLowerCase();
    const all     = getAllItems();

    let shown = keyword
      ? all.filter(function (item) {
          return item.key.toLowerCase().includes(keyword) ||
                 item.value.toLowerCase().includes(keyword);
        })
      : all.slice();

    shown.sort(function (a, b) {
      return sortAsc ? a.key.localeCompare(b.key) : b.key.localeCompare(a.key);
    });

    countPill.textContent  = all.length + ' 项';
    sizePill.textContent   = formatSize(calcSize());
    sortArrow.textContent  = sortAsc ? '↑' : '↓';
    footerCount.textContent = '共 ' + shown.length + ' 条' +
      (keyword && shown.length !== all.length ? ' (筛选)' : '');
    footerSort.textContent  = '按 Key ' + (sortAsc ? '升序' : '降序');

    rowList.innerHTML = '';

    if (!shown.length) {
      rowList.style.display    = 'none';
      emptyState.style.display = 'block';
      emptyState.textContent   = keyword ? '没有匹配的条目' : '暂无 localStorage 数据';
      activeKey = null;
      setPreview(null);
      return;
    }

    rowList.style.display    = 'block';
    emptyState.style.display = 'none';

    if (activeKey !== null && !shown.some(function (item) { return item.key === activeKey; })) {
      activeKey = null;
      setPreview(null);
    }

    const fragment = document.createDocumentFragment();
    shown.forEach(function (item) { fragment.appendChild(buildRow(item)); });
    rowList.appendChild(fragment);

    if (activeKey !== null) {
      setPreview(shown.find(function (item) { return item.key === activeKey; }) || null);
    }
  }

  topbar.addEventListener('mousedown', function (event) {
    if (pinned || resizing || splitting) return;
    if (event.target.closest('button')) return;
    dragging = true;
    const rect  = host.getBoundingClientRect();
    dragOffsetX = event.clientX - rect.left;
    dragOffsetY = event.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  resizeHandle.addEventListener('mousedown', function (event) {
    if (collapsed) return;
    event.preventDefault();
    event.stopPropagation();
    resizing = true;
    resizeStartX = event.clientX;
    resizeStartY = event.clientY;
    const rect       = host.getBoundingClientRect();
    resizeStartWidth  = rect.width;
    resizeStartHeight = rect.height;
    host.style.left   = rect.left + 'px';
    host.style.top    = rect.top  + 'px';
    host.style.right  = 'auto';
    host.style.bottom = 'auto';
    document.body.style.userSelect = 'none';
  });

  resizeHandle.addEventListener('dblclick', function (event) {
    event.preventDefault();
    event.stopPropagation();
    resetSize();
  });

  splitter.addEventListener('mousedown', function (event) {
    if (collapsed) return;
    event.preventDefault();
    event.stopPropagation();
    splitting = true;
    splitter.classList.add('is-dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
  });

  splitter.addEventListener('dblclick', function (event) {
    event.preventDefault();
    event.stopPropagation();
    resetDetailWidth();
  });

  document.addEventListener('mousemove', function (event) {
    if (splitting) {
      const mainRect = mainArea.getBoundingClientRect();
      const maxByMain = Math.max(MIN_DETAIL_WIDTH, mainRect.width - MIN_LIST_WIDTH - SPLITTER_LINE_WIDTH);
      const nextDetailWidth = clamp(
        mainRect.right - event.clientX - SPLITTER_LINE_WIDTH / 2,
        MIN_DETAIL_WIDTH,
        Math.min(MAX_DETAIL_WIDTH, maxByMain)
      );
      host.style.setProperty('--detail-width', Math.round(nextDetailWidth) + 'px');
      return;
    }

    if (resizing) {
      const dx   = event.clientX - resizeStartX;
      const dy   = event.clientY - resizeStartY;
      const rect = host.getBoundingClientRect();
      host.style.width  = Math.min(Math.max(MIN_WIDTH,  resizeStartWidth  + dx), Math.max(MIN_WIDTH,  window.innerWidth  - rect.left - EDGE_GAP)) + 'px';
      host.style.height = Math.min(Math.max(MIN_HEIGHT, resizeStartHeight + dy), Math.max(MIN_HEIGHT, window.innerHeight - rect.top  - EDGE_GAP)) + 'px';
      return;
    }

    if (!dragging) return;
    host.style.left   = clamp(event.clientX - dragOffsetX, EDGE_GAP, window.innerWidth  - host.offsetWidth  - EDGE_GAP) + 'px';
    host.style.top    = clamp(event.clientY - dragOffsetY, EDGE_GAP, window.innerHeight - host.offsetHeight - EDGE_GAP) + 'px';
    host.style.right  = 'auto';
    host.style.bottom = 'auto';
  });

  document.addEventListener('mouseup', function () {
    dragging = resizing = false;
    if (splitting) {
      splitting = false;
      splitter.classList.remove('is-dragging');
    }
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
  });

  window.addEventListener('resize', function () { keepInsideViewport(); });

  get('sortKeyBtn').addEventListener('click', function () { sortAsc = !sortAsc; render(); });

  get('refreshBtn').addEventListener('click', function () { render(); showToast('已刷新'); });

  get('addBtn').addEventListener('click', function () { openModal('add', '', ''); });

  get('exportBtn').addEventListener('click', exportJson);
  get('importBtn').addEventListener('click', importJson);

  get('pinBtn').addEventListener('click', function () {
    pinned = !pinned;
    get('pinBtn').classList.toggle('is-on', pinned);
    topbar.style.cursor = pinned ? 'default' : 'move';
  });

  get('collapseBtn').addEventListener('click', function () {
    collapsed = !collapsed;
    panel.classList.toggle('is-collapsed', collapsed);
    collapseBtn.innerHTML = collapsed ? svgIcon('chevronRight') : svgIcon('chevron');
  });

  get('closeBtn').addEventListener('click', function () {
    host.remove();
    document.removeEventListener('keydown', onKeydown);
  });

  get('clearBtn').addEventListener('click', function () {
    if (!confirm('清空所有 localStorage？此操作不可撤销。')) return;
    localStorage.clear();
    activeKey = null;
    setPreview(null);
    render();
    showToast('已清空');
  });

  searchInput.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(render, 120);
  });

  get('formatBtn').addEventListener('click', function () {
    try {
      modalValue.value = JSON.stringify(JSON.parse(modalValue.value), null, 2);
      updateModalHint();
      showToast('JSON 已格式化');
    } catch (e) {
      showToast('无法格式化：不是合法 JSON');
    }
  });

  modalValue.addEventListener('input', updateModalHint);

  get('modalCancel').addEventListener('click', closeModal);

  get('modalSave').addEventListener('click', function () {
    const key   = modalKey.value.trim();
    const value = modalValue.value;
    if (!key) { alert('Key 不能为空'); return; }
    if (editKey !== null && editKey !== key) localStorage.removeItem(editKey);
    localStorage.setItem(key, value);
    activeKey = key;
    closeModal();
    render();
    setPreview({ key: key, value: localStorage.getItem(key) || '' });
    showToast('已保存');
  });

  modalBackdrop.addEventListener('click', function (event) {
    if (event.target === modalBackdrop) closeModal();
  });

  function onKeydown(event) {
    if (event.key === 'Escape') {
      if (modalBackdrop.style.display === 'flex') closeModal();
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      const active = shadow.activeElement;
      if (active === searchInput || active === null || active === undefined ||
          document.activeElement === host || document.activeElement === document.body) {
        event.preventDefault();
        searchInput.focus();
        searchInput.select();
      }
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      if (modalBackdrop.style.display === 'flex') get('modalSave').click();
    }
  }

  document.addEventListener('keydown', onKeydown);

  window.addEventListener('storage', function () { render(); });

  setPreview(null);
  render();
})();