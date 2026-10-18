// ==UserScript==
// @name         Yuze智能工作流引擎 - 一体化网页操作中心
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  🚀 你的全能网页助手！集成阅读增强、视频控制、笔记整合、效率工具于一体的智能工作平台。毛玻璃UI、模块化设计、零配置启动。
// @author       Yuze智能团队
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const CONFIG = {
        version: '1.0.0',
        name: 'Yuze智能工作流引擎',
        primaryColor: '#6366f1',
        accentColor: '#8b5cf6',
        glassBg: 'rgba(255, 255, 255, 0.72)',
        glassBorder: 'rgba(255, 255, 255, 0.5)',
        shadowColor: 'rgba(99, 102, 241, 0.15)',
    };

    const styles = `
        .twe-container { --twe-primary: ${CONFIG.primaryColor}; --twe-accent: ${CONFIG.accentColor}; --twe-glass-bg: ${CONFIG.glassBg}; --twe-glass-border: ${CONFIG.glassBorder}; --twe-shadow: ${CONFIG.shadowColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: fixed; z-index: 2147483647; * { box-sizing: border-box; margin: 0; padding: 0; } }
        .twe-float-ball { position: fixed; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 20px var(--twe-shadow); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease; user-select: none; z-index: 2147483647; font-size: 22px; font-weight: 700; }
        .twe-float-ball:hover { transform: scale(1.12) rotate(8deg); box-shadow: 0 6px 28px rgba(99, 102, 241, 0.35); }
        .twe-float-ball:active { transform: scale(0.95); }
        .twe-float-ball .twe-badge { position: absolute; top: -4px; right: -4px; width: 18px; height: 18px; background: #ef4444; border-radius: 50%; font-size: 10px; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; }
        .twe-panel { position: fixed; width: 380px; max-height: 520px; border-radius: 20px; background: var(--twe-glass-bg); backdrop-filter: blur(24px) saturate(1.4); -webkit-backdrop-filter: blur(24px) saturate(1.4); border: 1px solid var(--twe-glass-border); box-shadow: 0 16px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.08) inset; overflow: hidden; z-index: 2147483647; opacity: 0; visibility: hidden; transform: translateY(10px) scale(0.96); transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), visibility 0.3s; }
        .twe-panel.twe-active { opacity: 1; visibility: visible; transform: translateY(0) scale(1); }
        .twe-panel-header { padding: 18px 20px 14px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.05); }
        .twe-panel-title { font-size: 15px; font-weight: 700; color: #1a1a2e; }
        .twe-panel-title span { color: var(--twe-primary); }
        .twe-panel-actions { display: flex; gap: 6px; }
        .twe-btn-icon { width: 30px; height: 30px; border-radius: 9px; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #666; transition: all 0.2s; }
        .twe-btn-icon:hover { background: rgba(99,102,241,0.1); color: var(--twe-primary); }
        .twe-tabs { display: flex; padding: 10px 14px 0; gap: 4px; overflow-x: auto; }
        .twe-tab { padding: 7px 13px; border-radius: 10px; border: none; background: transparent; cursor: pointer; font-size: 12.5px; font-weight: 500; color: #888; white-space: nowrap; transition: all 0.2s; }
        .twe-tab:hover { background: rgba(99,102,241,0.06); color: #555; }
        .twe-tab.twe-active { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; box-shadow: 0 3px 12px rgba(99,102,241,0.3); }
        .twe-tab-content { display: none; padding: 14px 18px 18px; overflow-y: auto; max-height: 360px; }
        .twe-tab-content.twe-active { display: block; }
        .twe-section-title { font-size: 11.5px; font-weight: 600; color: #aaa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .twe-card { background: rgba(255,255,255,0.55); border-radius: 13px; padding: 13px 15px; margin-bottom: 9px; border: 1px solid rgba(0,0,0,0.04); transition: all 0.2s; }
        .twe-card:hover { background: rgba(255,255,255,0.8); border-color: rgba(99,102,241,0.15); box-shadow: 0 2px 12px rgba(99,102,241,0.08); }
        .twe-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .twe-card-name { font-size: 13px; font-weight: 600; color: #333; }
        .twe-card-desc { font-size: 11.5px; color: #888; line-height: 1.5; }
        .twe-switch-wrap { display: flex; align-items: center; gap: 8px; }
        .twe-switch { position: relative; width: 42px; height: 23px; appearance: none; background: #ddd; border-radius: 12px; cursor: pointer; transition: background 0.3s; flex-shrink: 0; }
        .twe-switch::after { content: ''; position: absolute; top: 2px; left: 2px; width: 19px; height: 19px; border-radius: 50%; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.15); transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .twe-switch:checked { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); }
        .twe-switch:checked::after { transform: translateX(19px); }
        .twe-slider-wrap { margin: 8px 0; }
        .twe-slider-label { display: flex; justify-content: space-between; font-size: 11.5px; color: #777; margin-bottom: 5px; }
        .twe-slider { width: 100%; height: 5px; border-radius: 3px; appearance: none; background: linear-gradient(to right, var(--twe-primary), var(--twe-accent)); outline: none; cursor: pointer; }
        .twe-slider::-webkit-slider-thumb { appearance: none; width: 17px; height: 17px; border-radius: 50%; background: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35); cursor: pointer; border: 2px solid var(--twe-primary); }
        .twe-btn-group { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .twe-btn { padding: 6px 12px; border-radius: 9px; border: 1px solid rgba(99,102,241,0.2); background: rgba(99,102,241,0.06); color: var(--twe-primary); font-size: 11.5px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
        .twe-btn:hover { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; border-color: transparent; box-shadow: 0 3px 10px rgba(99,102,241,0.3); }
        .twe-btn.twe-btn-danger { border-color: rgba(239,68,68,0.2); background: rgba(239,68,68,0.06); color: #ef4444; }
        .twe-btn.twe-btn-danger:hover { background: linear-gradient(135deg,#ef4444,#dc2626); color: #fff; border-color: transparent; }
        .twe-tomato-display { text-align: center; padding: 18px 0 10px; }
        .twe-tomato-time { font-size: 42px; font-weight: 800; background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; line-height: 1; font-variant-numeric: tabular-nums; }
        .twe-tomato-label { font-size: 11.5px; color: #999; margin-top: 4px; }
        .twe-tomato-controls { display: flex; justify-content: center; gap: 10px; margin-top: 12px; }
        .twe-tomato-btn { width: 44px; height: 44px; border-radius: 50%; border: none; cursor: pointer; font-size: 17px; display: flex; align-items: center; justify-content: center; transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .twe-tomato-btn.start { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; box-shadow: 0 4px 16px rgba(99,102,241,0.35); }
        .twe-tomato-btn.start:hover { transform: scale(1.1); }
        .twe-tomato-btn.reset { background: rgba(0,0,0,0.05); color: #888; }
        .twe-todo-input-wrap { display: flex; gap: 8px; margin-bottom: 10px; }
        .twe-todo-input { flex: 1; padding: 9px 13px; border-radius: 11px; border: 1.5px solid rgba(0,0,0,0.08); background: rgba(255,255,255,0.6); font-size: 12.5px; outline: none; transition: border-color 0.2s; }
        .twe-todo-input:focus { border-color: var(--twe-primary); }
        .twe-todo-add-btn { padding: 9px 14px; border-radius: 11px; border: none; background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; font-size: 12.5px; font-weight: 600; cursor: pointer; }
        .twe-todo-list { list-style: none; }
        .twe-todo-item { display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 10px; background: rgba(255,255,255,0.45); margin-bottom: 5px; font-size: 12.5px; }
        .twe-todo-item.done .twe-todo-text { text-decoration: line-through; color: #bbb; }
        .twe-todo-check { width: 18px; height: 18px; border-radius: 5px; border: 2px solid #ccc; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 11px; color: transparent; }
        .twe-todo-item.done .twe-todo-check { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); border-color: transparent; color: #fff; }
        .twe-todo-text { flex: 1; word-break: break-word; }
        .twe-todo-del { cursor: pointer; color: #ccc; font-size: 15px; }
        .twe-todo-del:hover { color: #ef4444; }
        .twe-note-area { width: 100%; min-height: 140px; padding: 12px 14px; border-radius: 12px; border: 1.5px solid rgba(0,0,0,0.07); background: rgba(255,255,255,0.55); font-size: 12.5px; line-height: 1.65; resize: vertical; outline: none; font-family: inherit; }
        .twe-note-area:focus { border-color: var(--twe-primary); }
        .twe-speed-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
        .twe-speed-btn { padding: 8px 0; border-radius: 9px; border: 1.5px solid rgba(99,102,241,0.15); background: rgba(255,255,255,0.5); color: #555; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
        .twe-speed-btn:hover, .twe-speed-btn.active { background: linear-gradient(135deg, var(--twe-primary), var(--twe-accent)); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(99,102,241,0.25); }
        .twe-stats-row { display: flex; justify-content: space-around; padding: 12px 0 4px; }
        .twe-stat-item { text-align: center; }
        .twe-stat-num { font-size: 22px; font-weight: 800; color: var(--twe-primary); }
        .twe-stat-label { font-size: 10.5px; color: #aaa; margin-top: 2px; }
        .twe-toast { position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%) translateY(20px); padding: 10px 22px; border-radius: 12px; background: rgba(26,26,46,0.88); backdrop-filter: blur(12px); color: #fff; font-size: 12.5px; font-weight: 500; z-index: 2147483647; opacity: 0; visibility: hidden; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); pointer-events: none; white-space: nowrap; }
        .twe-toast.show { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
    `;

    function $(sel, ctx = document) { return ctx.querySelector(sel); }
    function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }
    function createElement(tag, cls = '', innerHTML = '') {
        const el = document.createElement(tag);
        if (cls) el.className = cls;
        if (innerHTML) el.innerHTML = innerHTML;
        return el;
    }

    let toastTimer = null;
    function showToast(msg, duration = 2000) {
        let toast = $('.twe-toast');
        if (!toast) { toast = createElement('div', 'twe-toast'); document.body.appendChild(toast); }
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
    }

    const storage = {
        get(key, def = null) { try { return JSON.parse(localStorage.getItem(`twe_${key}`)) ?? def; } catch { return def; } },
        set(key, val) { localStorage.setItem(`twe_${key}`, JSON.stringify(val)); }
    };

    const state = {
        panelOpen: false, activeTab: 'read',
        ballPos: storage.get('ballPos', { right: 24, bottom: 100 }),
        readingMode: false, fontSize: storage.get('fontSize', 100),
        lineHeight: storage.get('lineHeight', 1.7), eyeCareMode: false,
        focusMode: false, videoSpeed: 1, videoSpeedLocked: false,
        tomatoTime: 25 * 60, tomatoRemaining: 25 * 60, tomatoRunning: false,
        tomatoInterval: null, todos: storage.get('todos', []),
        notes: storage.get('notes', ''),
        stats: storage.get('stats', { pomodoros: 0, todosDone: 0, notesCount: 0 }),
    };

    function createFloatBall() {
        const ball = createElement('div', 'twe-float-ball');
        ball.id = 'twe-float-ball';
        ball.innerHTML = `T<span class="twe-badge">✦</span>`;
        Object.assign(ball.style, { right: state.ballPos.right + 'px', bottom: state.ballPos.bottom + 'px' });
        ball.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
        let dragging = false, startX, startY, startRight, startBottom;
        ball.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            dragging = true; startX = e.clientX; startY = e.clientY;
            startRight = parseInt(ball.style.right); startBottom = parseInt(ball.style.bottom);
            ball.style.transition = 'none'; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const dx = startX - e.clientX, dy = e.clientY - startY;
            ball.style.right = Math.max(0, Math.min(window.innerWidth - 52, startRight + dx)) + 'px';
            ball.style.bottom = Math.max(0, Math.min(window.innerHeight - 52, startBottom - dy)) + 'px';
        });
        document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false; ball.style.transition = '';
            state.ballPos = { right: parseInt(ball.style.right), bottom: parseInt(ball.style.bottom) };
            storage.set('ballPos', state.ballPos);
        });
        return ball;
    }

    function buildReadTab() {
        return `<div class="twe-section-title">🔤 排版优化</div>
<div class="twe-card"><div class="twe-card-header"><span class="twe-card-name">📐 字号缩放</span><span style="font-size:11.5px;color:var(--twe-primary);font-weight:600;">${state.fontSize}%</span></div><div class="twe-slider-wrap"><input type="range" class="twe-slider" id="twe-font-size" min="70" max="180" value="${state.fontSize}"></div></div>
<div class="twe-card"><div class="twe-card-header"><span class="twe-card-name">📏 行高调整</span><span style="font-size:11.5px;color:var(--twe-primary);font-weight:600;">${state.lineHeight}</span></div><div class="twe-slider-wrap"><input type="range" class="twe-slider" id="twe-line-height" min="1.2" max="2.4" step="0.1" value="${state.lineHeight}"></div></div>
<div class="twe-section-title" style="margin-top:12px;">🎨 视觉模式</div>
<div class="twe-card"><div class="twe-card-header"><div><span class="twe-card-name">🌙 护眼模式</span><div class="twe-card-desc">豆沙绿背景，缓解视觉疲劳</div></div><label class="twe-switch-wrap"><input type="checkbox" class="twe-switch" id="twe-eye-care"></label></div></div>
<div class="twe-card"><div class="twe-card-header"><div><span class="twe-card-name">🎯 专注模式</span><div class="twe-card-desc">隐藏干扰元素，聚焦正文内容</div></div><label class="twe-switch-wrap"><input type="checkbox" class="twe-switch" id="twe-focus-mode"></label></div></div>
<div class="twe-card"><div class="twe-card-header"><div><span class="twe-card-name">📖 沉浸阅读</span><div class="twe-card-desc">一键切换极简阅读视图</div></div><label class="twe-switch-wrap"><input type="checkbox" class="twe-switch" id="twe-immersive"></label></div></div>
<div class="twe-btn-group"><button class="twe-btn" id="twe-reset-read">↺ 重置排版</button><button class="twe-btn twe-btn-danger" id="twe-exit-all">✕ 退出所有效果</button></div>`;
    }

    function buildVideoTab() {
        return `<div class="twe-section-title">⚡ 倍速控制</div>
<div class="twe-card"><div class="twe-card-header"><span class="twe-card-name">当前倍速：<span id="twe-current-speed" style="color:var(--twe-primary);">${state.videoSpeed}x</span></span></div>
<div class="twe-speed-grid">
<button class="twe-speed-btn" data-speed="0.5">0.5x</button><button class="twe-speed-btn" data-speed="0.75">0.75x</button><button class="twe-speed-btn active" data-speed="1">1x</button><button class="twe-speed-btn" data-speed="1.25">1.25x</button>
<button class="twe-speed-btn" data-speed="1.5">1.5x</button><button class="twe-speed-btn" data-speed="2">2x</button><button class="twe-speed-btn" data-speed="3">3x</button><button class="twe-speed-btn" data-speed="5">5x</button>
<button class="twe-speed-btn" data-speed="8">8x</button><button class="twe-speed-btn" data-speed="10">10x</button><button class="twe-speed-btn" data-speed="16">16x</button><button class="twe-speed-btn" data-speed="custom">自定义</button>
</div></div>
<div class="twe-card"><div class="twe-card-header"><div><span class="twe-card-name">🔒 锁定倍速</span><div class="twe-card-desc">防止视频自动重置速度</div></div><label class="twe-switch-wrap"><input type="checkbox" class="twe-switch" id="twe-lock-speed"></label></div></div>
<div class="twe-section-title" style="margin-top:12px;">⌨️ 快捷键</div>
<div class="twe-card"><div class="twe-card-desc" style="line-height:2;"><kbd style="display:inline-block;padding:1px 6px;border-radius:4px;background:rgba(99,102,241,0.1);color:var(--twe-primary);font-size:11px;font-weight:600;margin-right:4px;">]</kbd> 加速 <kbd style="display:inline-block;padding:1px 6px;border-radius:4px;background:rgba(99,102,241,0.1);color:var(--twe-primary);font-size:11px;font-weight:600;margin-right:4px;">[</kbd> 减速 <kbd style="display:inline-block;padding:1px 6px;border-radius:4px;background:rgba(99,102,241,0.1);color:var(--twe-primary);font-size:11px;font-weight:600;margin-right:4px;">\\</kbd> 重置</div></div>`;
    }

    function escapeHtml(str) { if (!str) return ''; return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

    function buildNotesTab() {
        const todoItems = state.todos.map((t, i) => `<li class="twe-todo-item ${t.done ? 'done' : ''}" data-index="${i}"><span class="twe-todo-check">${t.done ? '✓' : ''}</span><span class="twe-todo-text">${escapeHtml(t.text)}</span><span class="twe-todo-del">×</span></li>`).join('');
        return `<div class="twe-section-title">📝 快速笔记</div>
<div class="twe-card"><textarea class="twe-note-area" id="twe-note-area" placeholder="在这里记录灵感、摘录重点...&#10;&#10;支持划词快捷添加 → 选中文字后按 N 键">${escapeHtml(state.notes)}</textarea>
<div class="twe-btn-group" style="justify-content:flex-end;"><button class="twe-btn" id="twe-copy-note">📋 复制</button><button class="twe-btn" id="twe-export-note">💾 导出MD</button><button class="twe-btn twe-btn-danger" id="twe-clear-note">清空</button></div></div>
<div class="twe-section-title" style="margin-top:12px;">✅ 待办清单</div>
<div class="twe-card"><div class="twe-todo-input-wrap"><input type="text" class="twe-todo-input" id="twe-todo-input" placeholder="添加新任务..."><button class="twe-todo-add-btn" id="twe-todo-add">+</button></div>
<ul class="twe-todo-list" id="twe-todo-list">${todoItems || '<li style="text-align:center;color:#bbb;font-size:12px;padding:12px 0;">暂无待办，添加一个吧~</li>'}</ul></div>`;
    }

    function buildToolsTab() {
        const mins = Math.floor(state.tomatoRemaining / 60), secs = state.tomatoRemaining % 60;
        return `<div class="twe-section-title">🍅 番茄钟</div>
<div class="twe-card"><div class="twe-tomato-display"><div class="twe-tomato-time" id="twe-tomato-display">${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}</div><div class="twe-tomato-label" id="twe-tomato-label">${state.tomatoRunning ? '专注中...' : '准备开始'}</div></div>
<div class="twe-tomato-controls"><button class="twe-tomato-btn start" id="twe-tomato-start">${state.tomatoRunning ? '⏸' : '▶'}</button><button class="twe-tomato-btn reset" id="twe-tomato-reset">↺</button></div>
<div class="twe-btn-group" style="justify-content:center;margin-top:10px;">
<button class="twe-speed-btn" data-time="5">5分钟</button><button class="twe-speed-btn" data-time="15">15分钟</button><button class="twe-speed-btn active" data-time="25">25分钟</button><button class="twe-speed-btn" data-time="45">45分钟</button></div></div>
<div class="twe-section-title" style="margin-top:12px;">🛠️ 实用工具</div>
<div class="twe-card"><div class="twe-card-header"><span class="twe-card-name">📄 页面操作</span></div><div class="twe-btn-group"><button class="twe-btn" id="twe-scroll-top">↑ 回顶部</button><button class="twe-btn" id="twe-scroll-bottom">↓ 到底部</button><button class="twe-btn" id="twe-print-page">🖨️ 打印</button></div></div>
<div class="twe-card"><div class="twe-card-header"><span class="twe-card-name">🔗 链接工具</span></div><div class="twe-btn-group"><button class="twe-btn" id="twe-copy-link">复制链接</button><button class="twe-btn" id="twe-copy-title">复制标题</button></div></div>`;
    }

    function buildStatsTab() {
        return `<div class="twe-stats-row"><div class="twe-stat-item"><div class="twe-stat-num">${state.stats.pomodoros}</div><div class="twe-stat-label">番茄数</div></div><div class="twe-stat-item"><div class="twe-stat-num">${state.stats.todosDone}</div><div class="twe-stat-label">已完成</div></div><div class="twe-stat-item"><div class="twe-stat-num">${state.stats.notesCount}</div><div class="twe-stat-label">笔记数</div></div></div>
<div class="twe-card" style="margin-top:14px;"><div class="twe-card-header"><span class="twe-card-name">ℹ️ 脚本信息</span></div><div class="twe-card-desc" style="line-height:2;"><strong>${CONFIG.name}</strong> v${CONFIG.version}<br>当前页面：<span style="word-break:break-all;color:var(--twe-primary);">${location.hostname}</span><br>运行状态：<span style="color:#22c55e;">● 正常运行中</span></div></div>
<div class="twe-btn-group" style="justify-content:center;"><button class="twe-btn twe-btn-danger" id="twe-clear-data">清除所有数据</button></div>`;
    }

    function createPanel() {
        const panel = createElement('div', 'twe-panel');
        panel.id = 'twe-main-panel';
        panel.innerHTML = `<div class="twe-panel-header"><div class="twe-panel-title">⚡ <span>Yuze</span> 智能工作台</div><div class="twe-panel-actions"><button class="twe-btn-icon" id="twe-minimize" title="最小化">−</button><button class="twe-btn-icon" id="twe-close-panel" title="关闭">×</button></div></div>
<div class="twe-tabs"><button class="twe-tab twe-active" data-tab="read">📖 阅读</button><button class="twe-tab" data-tab="video">🎬 视频</button><button class="twe-tab" data-tab="notes">📝 笔记</button><button class="twe-tab" data-tab="tools">⏱️ 效率</button><button class="twe-tab" data-tab="stats">📊 数据</button></div>
<div class="twe-tab-content twe-active" data-tab="read">${buildReadTab()}</div>
<div class="twe-tab-content" data-tab="video">${buildVideoTab()}</div>
<div class="twe-tab-content" data-tab="notes">${buildNotesTab()}</div>
<div class="twe-tab-content" data-tab="tools">${buildToolsTab()}</div>
<div class="twe-tab-content" data-tab="stats">${buildStatsTab()}</div>`;
        return panel;
    }

    function togglePanel() {
        const panel = $('#twe-main-panel');
        state.panelOpen = !state.panelOpen;
        panel.classList.toggle('twe-active', state.panelOpen);
    }
    function switchTab(tabName) {
        state.activeTab = tabName;
        $$('.twe-tab').forEach(t => t.classList.toggle('twe-active', t.dataset.tab === tabName));
        $$('.twe-tab-content').forEach(c => c.classList.toggle('twe-active', c.dataset.tab === tabName));
    }

    // --- Reading ---
    function applyFontSize(size) { state.fontSize = size; storage.set('fontSize', size); document.body.style.fontSize = size + '%'; }
    function applyLineHeight(h) { state.lineHeight = h; storage.set('lineHeight', h); $$('.twe-card,.twe-tab-content,article,main,.article,.content,.post-body,.markdown-body,.rich_media_content').forEach(el => el.style.lineHeight = h); }
    function toggleEyeCare(on) {
        state.eyeCareMode = on;
        if (on) { document.body.style.backgroundColor = '#c7edcc'; document.body.style.color = '#2d4a1e'; showToast('✅ 护眼模式已开启'); }
        else { document.body.style.backgroundColor = ''; document.body.style.color = ''; showToast('❌ 护眼模式已关闭'); }
    }
    function toggleFocusMode(on) {
        state.focusMode = on;
        if (on) { ['nav','header','footer','aside','.sidebar','.advertisement','.ad','[class*="sidebar"]','[class*="banner"]'].forEach(s => $$(s).forEach(el => el.style.display = 'none')); showToast('🎯 专注模式：已隐藏侧边栏和广告'); }
        else location.reload();
    }
    function toggleImmersive(on) {
        state.readingMode = on;
        if (on) { document.body.style.maxWidth = '720px'; document.body.style.margin = '0 auto'; document.body.style.padding = '40px 24px'; document.body.style.backgroundColor = '#fefefe'; showToast('📖 沉浸阅读模式已开启'); }
        else { document.body.style.cssText = ''; showToast('已退出沉浸阅读'); }
    }
    function resetReading() { state.fontSize = 100; state.lineHeight = 1.7; storage.set('fontSize',100); storage.set('lineHeight',1.7); document.body.style.fontSize = ''; document.body.style.backgroundColor = ''; document.body.style.color = ''; document.body.style.cssText = ''; location.reload(); }

    // --- Video ---
    function getVideo() { return $('video') || $('iframe')?.contentWindow?.document?.querySelector('video'); }
    function setVideoSpeed(speed) {
        state.videoSpeed = speed;
        const video = getVideo();
        if (video) { video.playbackRate = speed; showToast(`⚡ 播放速度：${speed}x`); }
        else showToast('⚠️ 未检测到视频元素');
        $('#twe-current-speed').textContent = speed + 'x';
        $$('.twe-speed-btn').forEach(b => b.classList.toggle('active', parseFloat(b.dataset.speed) === speed));
    }
    function lockSpeed(lock) {
        state.videoSpeedLocked = lock;
        if (lock) { setInterval(() => { const v = getVideo(); if (v && v.playbackRate !== state.videoSpeed) v.playbackRate = state.videoSpeed; }, 500); showToast('🔒 倍速已锁定'); }
        else showToast('🔓 倍速已解锁');
    }

    // --- Tomato ---
    function updateTomatoDisplay() { const el = $('#twe-tomato-display'); if (el) { const m = Math.floor(state.tomatoRemaining/60), s = state.tomatoRemaining%60; el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; } }
    function updateTomatoUI() { const btn = $('#twe-tomato-start'), label = $('#twe-tomato-label'); if (btn) btn.textContent = state.tomatoRunning ? '⏸' : '▶'; if (label) label.textContent = state.tomatoRunning ? '专注中...' : '准备开始'; }
    function startTomato() { if (state.tomatoRunning) { pauseTomato(); return; } state.tomatoRunning = true; updateTomatoUI(); state.tomatoInterval = setInterval(() => { if (state.tomatoRemaining > 0) { state.tomatoRemaining--; updateTomatoDisplay(); } else completeTomato(); }, 1000); updateTomatoUI(); showToast('🍅 开始专注！'); }
    function pauseTomato() { state.tomatoRunning = false; clearInterval(state.tomatoInterval); updateTomatoUI(); showToast('⏸ 已暂停'); }
    function resetTomato() { state.tomatoRunning = false; clearInterval(state.tomatoInterval); state.tomatoRemaining = state.tomatoTime; updateTomatoDisplay(); updateTomatoUI(); }
    function setTomatoTime(mins) { state.tomatoTime = mins * 60; state.tomatoRemaining = mins * 60; updateTomatoDisplay(); $$('.twe-tomato-controls ~ div .twe-speed-btn[data-time]').forEach(b => b.classList.toggle('active', parseInt(b.dataset.time) === mins)); }
    function completeTomato() { state.tomatoRunning = false; clearInterval(state.tomatoInterval); state.stats.pomodoros++; storage.set('stats', state.stats); state.tomatoRemaining = state.tomatoTime; updateTomatoDisplay(); updateTomatoUI(); updateStatsDisplay(); showToast('🎉 番茄完成！休息一下吧~'); try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczIjzTEl/V+OYcFh/KltMjGpWcFh/KltMjGpWcA==').play().catch(() => {}); } catch(e) {} }

    // --- Todos ---
    function saveTodos() { storage.set('todos', state.todos); }
    function saveStats() { storage.set('stats', state.stats); }
    function addTodo(text) { if (!text.trim()) return; state.todos.unshift({ text: text.trim(), done: false }); saveTodos(); renderTodos(); showToast('✅ 已添加待办'); }
    function toggleTodo(index) { if (state.todos[index]) { state.todos[index].done = !state.todos[index].done; if (state.todos[index].done) state.stats.todosDone++; saveTodos(); saveStats(); renderTodos(); updateStatsDisplay(); } }
    function deleteTodo(index) { state.todos.splice(index, 1); saveTodos(); renderTodos(); }
    function renderTodos() { const list = $('#twe-todo-list'); if (!list) return; if (state.todos.length === 0) { list.innerHTML = '<li style="text-align:center;color:#bbb;font-size:12px;padding:12px 0;">暂无待办，添加一个吧~</li>'; return; } list.innerHTML = state.todos.map((t, i) => `<li class="twe-todo-item ${t.done?'done':''}" data-index="${i}"><span class="twe-todo-check">${t.done?'✓':''}</span><span class="twe-todo-text">${escapeHtml(t.text)}</span><span class="twe-todo-del">×</span></li>`).join(''); bindTodoEvents(list); }
    function bindTodoEvents(container) { container.querySelectorAll('.twe-todo-item').forEach(item => { item.querySelector('.twe-todo-check').addEventListener('click', () => toggleTodo(parseInt(item.dataset.index))); item.querySelector('.twe-todo-del').addEventListener('click', () => deleteTodo(parseInt(item.dataset.index))); }); }

    // --- Notes ---
    function saveNote() { const area = $('#twe-note-area'); if (!area) return; state.notes = area.value; storage.set('notes', state.notes); if (area.value.length > 0 && state.notes !== storage.get('notes_prev', '')) { state.stats.notesCount++; storage.set('stats', state.stats); storage.set('notes_prev', state.notes); updateStatsDisplay(); } }

    // --- Stats ---
    function updateStatsDisplay() { const nums = $$('.twe-stat-num'); if (nums[0]) nums[0].textContent = state.stats.pomodoros; if (nums[1]) nums[1].textContent = state.stats.todosDone; if (nums[2]) nums[2].textContent = state.stats.notesCount; }

    // --- Bind Events ---
    function bindAllEvents(panel) {
        $$('.twe-tab').forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
        $('#twe-minimize')?.addEventListener('click', togglePanel);
        $('#twe-close-panel')?.addEventListener('click', () => { togglePanel(); showToast('面板已收起，点击悬浮球重新打开'); });
        $('#twe-font-size')?.addEventListener('input', (e) => { applyFontSize(+e.target.value); e.target.parentElement.previousElementSibling.querySelector('span:last-child').textContent = e.target.value + '%'; });
        $('#twe-line-height')?.addEventListener('input', (e) => { applyLineHeight(+e.target.value); e.target.parentElement.previousElementSibling.querySelector('span:last-child').textContent = e.target.value; });
        $('#twe-eye-care')?.addEventListener('change', (e) => toggleEyeCare(e.target.checked));
        $('#twe-focus-mode')?.addEventListener('change', (e) => toggleFocusMode(e.target.checked));
        $('#twe-immersive')?.addEventListener('change', (e) => toggleImmersive(e.target.checked));
        $('#twe-reset-read')?.addEventListener('click', () => { resetReading(); showToast('↺ 排版已重置'); });
        $('#twe-exit-all')?.addEventListener('click', () => { resetReading(); state.eyeCareMode=false; state.focusMode=false; state.readingMode=false; $$('#twe-panel .twe-switch').forEach(s=>s.checked=false); showToast('✕ 已退出所有效果'); });
        $$('.twe-speed-btn[data-speed]').forEach(btn => btn.addEventListener('click', () => { const s = btn.dataset.speed; if (s==='custom') { const val=prompt('输入自定义倍速（如 1.75）：','1.75'); if(val&&!isNaN(val)) setVideoSpeed(parseFloat(val)); } else setVideoSpeed(parseFloat(s)); }));
        $('#twe-lock-speed')?.addEventListener('change', (e) => lockSpeed(e.target.checked));
        $('#twe-copy-note')?.addEventListener('click', () => { navigator.clipboard.writeText($('#twe-note-area')?.value||'').then(() => showToast('📋 笔记已复制')); });
        $('#twe-export-note')?.addEventListener('click', () => { const note=$('#twe-note-area')?.value||''; const blob=new Blob([`# 网页笔记\n\n${note}\n\n---\n导出时间：${new Date().toLocaleString()}\n来源：${location.href}`],{type:'text/markdown'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`TWE笔记_${Date.now()}.md`; a.click(); showToast('💾 Markdown文件已下载'); });
        $('#twe-clear-note')?.addEventListener('click', () => { if($('#twe-noteArea')){$('#twe-note-area').value='';state.notes='';storage.set('notes','');showToast('笔记已清空');} });
        $('#twe-note-area')?.addEventListener('input', () => saveNote());
        $('#twe-todo-add')?.addEventListener('click', () => addTodo($('#twe-todo-input')?.value||''));
        $('#twe-todo-input')?.addEventListener('keydown', (e) => { if (e.key==='Enter') addTodo(e.target.value); });
        bindTodoEvents(panel);
        $('#twe-tomato-start')?.addEventListener('click', startTomato);
        $('#twe-tomato-reset')?.addEventListener('click', resetTomato);
        $$('#twe-tomato-controls ~ div .twe-speed-btn[data-time]').forEach(b => b.addEventListener('click', () => setTomatoTime(parseInt(b.dataset.time))));
        $('#twe-scroll-top')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
        $('#twe-scroll-bottom')?.addEventListener('click', () => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
        $('#twe-print-page')?.addEventListener('click', () => window.print());
        $('#twe-copy-link')?.addEventListener('click', () => { navigator.clipboard.writeText(location.href).then(() => showToast('🔗 链接已复制')); });
        $('#twe-copy-title')?.addEventListener('click', () => { navigator.clipboard.writeText(document.title).then(() => showToast('📄 标题已复制')); });
        $('#twe-clear-data')?.addEventListener('click', () => { if(confirm('确定要清除所有数据吗？')) { localStorage.removeItem('twe_ballPos');localStorage.removeItem('twe_fontSize');localStorage.removeItem('twe_lineHeight');localStorage.removeItem('twe_todos');localStorage.removeItem('twe_notes');localStorage.removeItem('twe_stats');location.reload(); } });
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.isContentEditable) return;
            if (e.key===']') setVideoSpeed(Math.min(16,state.videoSpeed+0.25));
            if (e.key==='[') setVideoSpeed(Math.max(0.25,state.videoSpeed-0.25));
            if (e.key==='\\') setVideoSpeed(1);
            if ((e.key==='n'||e.key==='N') && window.getSelection().toString().trim()) {
                const selected = window.getSelection().toString().trim();
                const noteArea = $('#twe-note-area');
                if (noteArea) { noteArea.value += (noteArea.value?'\n':'')+`> ${selected}\n`; saveNote(); showToast('📝 已添加到笔记'); switchTab('notes'); }
            }
        });
    }

    function init() {
        const styleEl = document.createElement('style');
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
        const ball = createFloatBall();
        document.body.appendChild(ball);
        const panel = createPanel();
        document.body.appendChild(panel);
        const rect = ball.getBoundingClientRect();
        panel.style.right = (window.innerWidth - rect.left + 16) + 'px';
        panel.style.bottom = (window.innerHeight - rect.top - 20) + 'px';
        bindAllEvents(panel);
        document.addEventListener('click', (e) => { if (state.panelOpen && !panel.contains(e.target) && !ball.contains(e.target)) togglePanel(); });
        console.log(`%c⚡ ${CONFIG.name} v${CONFIG.version} 已启动`, 'color:#6366f1;font-weight:bold;font-size:14px;');
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();