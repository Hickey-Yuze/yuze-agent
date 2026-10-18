javascript:(function() {
    'use strict';

    // ===================== 配置与状态 =====================
    const STORAGE_KEY = 'pomo_fun_v2';
    
    const defaultSettings = {
        workTime: 25,
        breakTime: 5,
        longBreakTime: 15,
        longBreakInterval: 4,
        soundEnabled: true,
        theme: 'auto',
        currentTask: ''
    };

    let settings = { ...defaultSettings };
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) settings = { ...settings, ...JSON.parse(saved) };
    } catch(e) {}

    const state = {
        mode: 'work',
        timeLeft: settings.workTime * 60,
        isRunning: false,
        timerId: null,
        completedPomodoros: parseInt(localStorage.getItem('pomo_count') || '0'),
        totalFocusMinutes: parseInt(localStorage.getItem('pomo_focus') || '0'),
        currentCycle: 0,
        tasks: JSON.parse(localStorage.getItem('pomo_tasks') || '[]'),
        collapsed: localStorage.getItem('pomo_collapsed') === '1',
        showSettings: false
    };

    // ===================== 增强CSS =====================
    const styles = `
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-6px); }
    }
    @keyframes breathe {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.05); opacity: 1; }
    }
    @keyframes shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-5deg); }
        75% { transform: rotate(5deg); }
    }
    @keyframes popIn {
        0% { transform: scale(0.5); opacity: 0; }
        70% { transform: scale(1.1); }
        100% { transform: scale(1); opacity: 1; }
    }
    @keyframes slideDown {
        from { max-height: 0; opacity: 0; }
        to { max-height: 400px; opacity: 1; }
    }
    @keyframes particle {
        0% { transform: translate(0, 0) scale(1); opacity: 1; }
        100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
    }

    .pomo-fun {
        --pf-bg: rgba(255, 255, 255, 0.78);
        --pf-solid: rgba(255, 255, 255, 0.95);
        --pf-text: #1a202c;
        --pf-sub: #718096;
        --pf-border: rgba(255,255,255,0.5);
        --pf-accent: #ff6b6b;
        --pf-accent2: #ffd93d;
        --pf-success: #6bcb77;
        --pf-blue: #4d96ff;
        --pf-shadow: 0 10px 40px -10px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6);
        --pf-inset: inset 3px 3px 6px rgba(0,0,0,0.08), inset -3px -3px 6px rgba(255,255,255,0.8);
        --pf-raised: 4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.9);
        --pf-raised-hover: 6px 6px 12px rgba(0,0,0,0.12), -6px -6px 12px rgba(255,255,255,0.95);
        --pf-btn: #edf2f7;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
    }

    @media (prefers-color-scheme: dark) {
        .pomo-fun {
            --pf-bg: rgba(30, 34, 45, 0.8);
            --pf-solid: rgba(38, 42, 55, 0.95);
            --pf-text: #f7fafc;
            --pf-sub: #a0aec0;
            --pf-border: rgba(255,255,255,0.06);
            --pf-accent: #ff8585;
            --pf-accent2: #ffe066;
            --pf-success: #8ce99a;
            --pf-blue: #74c0fc;
            --pf-shadow: 0 10px 40px -10px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
            --pf-inset: inset 3px 3px 6px rgba(0,0,0,0.4), inset -3px -3px 6px rgba(255,255,255,0.05);
            --pf-raised: 4px 4px 8px rgba(0,0,0,0.4), -4px -4px 8px rgba(255,255,255,0.05);
            --pf-raised-hover: 6px 6px 12px rgba(0,0,0,0.5), -6px -6px 12px rgba(255,255,255,0.08);
            --pf-btn: #2d3748;
        }
    }

    .pomo-fun-wrap {
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .pomo-fun-wrap.collapsed .pf-panel { display: none; }
    .pomo-fun-wrap.collapsed .pf-tab { display: flex; }

    .pf-tab {
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        width: 44px;
        padding: 16px 0;
        background: var(--pf-solid);
        backdrop-filter: blur(20px);
        border-radius: 16px 0 0 16px;
        border: 1px solid var(--pf-border);
        border-right: none;
        box-shadow: var(--pf-shadow);
        cursor: pointer;
        color: var(--pf-text);
        font-size: 11px;
        font-weight: 700;
        writing-mode: vertical-rl;
        letter-spacing: 3px;
        transition: all 0.3s ease;
    }
    .pf-tab:hover { width: 50px; background: var(--pf-accent); color: white; }

    .pf-panel {
        width: 300px;
        background: var(--pf-bg);
        backdrop-filter: blur(24px);
        border-radius: 28px;
        border: 1px solid var(--pf-border);
        box-shadow: var(--pf-shadow);
        padding: 24px;
        animation: popIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .pf-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }
    .pf-title { font-size: 16px; font-weight: 800; color: var(--pf-text); letter-spacing: -0.3px; }
    .pf-header-btns { display: flex; gap: 6px; }
    .pf-icon-btn {
        width: 30px; height: 30px; border: none; border-radius: 10px;
        background: var(--pf-btn); color: var(--pf-sub); cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        font-size: 13px; transition: all 0.2s; box-shadow: var(--pf-raised);
    }
    .pf-icon-btn:hover { transform: translateY(-2px); color: var(--pf-text); box-shadow: var(--pf-raised-hover); }
    .pf-icon-btn:active { transform: translateY(0); box-shadow: var(--pf-inset); }

    /* 任务输入 */
    .pf-task-input-wrap {
        margin-bottom: 16px;
        position: relative;
    }
    .pf-task-input {
        width: 100%; padding: 10px 14px; border: none; border-radius: 14px;
        background: var(--pf-btn); color: var(--pf-text); font-size: 13px;
        box-shadow: var(--pf-inset); outline: none;
        transition: all 0.3s;
    }
    .pf-task-input::placeholder { color: var(--pf-sub); }
    .pf-task-input:focus { box-shadow: var(--pf-raised); background: var(--pf-solid); }

    /* 角色/表情区 */
    .pf-mascot-wrap {
        display: flex; flex-direction: column; align-items: center;
        margin: 8px 0 16px; position: relative;
    }
    .pf-mascot {
        width: 100px; height: 100px;
        display: flex; align-items: center; justify-content: center;
        font-size: 64px; line-height: 1;
        filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
        animation: float 3s ease-in-out infinite;
        transition: all 0.5s ease;
        cursor: pointer;
    }
    .pf-mascot:hover { animation: shake 0.5s ease-in-out; }
    .pf-mascot.breathing { animation: breathe 2s ease-in-out infinite, float 3s ease-in-out infinite; }
    
    .pf-mascot-speech {
        position: absolute; top: -8px; right: 20px;
        background: var(--pf-accent); color: white;
        padding: 4px 12px; border-radius: 12px 12px 0 12px;
        font-size: 12px; font-weight: 700; opacity: 0;
        transform: translateY(10px); transition: all 0.3s ease;
        pointer-events: none; white-space: nowrap;
    }
    .pf-mascot-speech.show { opacity: 1; transform: translateY(0); }

    /* 计时器 */
    .pf-timer-box {
        position: relative; width: 180px; height: 180px; margin: 0 auto 16px;
    }
    .pf-timer-svg { transform: rotate(-90deg); width: 100%; height: 100%; }
    .pf-timer-svg circle { fill: none; stroke-width: 5; stroke-linecap: round; }
    .pf-track { stroke: var(--pf-btn); }
    .pf-progress { stroke: var(--pf-accent); transition: stroke-dashoffset 1s linear; }
    .pf-timer-text {
        position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
        font-size: 42px; font-weight: 800; color: var(--pf-text);
        font-variant-numeric: tabular-nums; letter-spacing: -2px;
    }
    .pf-timer-label {
        text-align: center; font-size: 13px; color: var(--pf-sub);
        font-weight: 600; margin-top: -8px; margin-bottom: 16px;
    }

    /* 模式切换 */
    .pf-modes {
        display: flex; gap: 6px; margin-bottom: 16px;
        padding: 4px; background: var(--pf-btn); border-radius: 16px;
        box-shadow: var(--pf-inset);
    }
    .pf-mode {
        flex: 1; padding: 8px 0; border: none; border-radius: 12px;
        background: transparent; color: var(--pf-sub); font-size: 12px;
        font-weight: 700; cursor: pointer; transition: all 0.3s;
    }
    .pf-mode.active {
        background: var(--pf-solid); color: var(--pf-text);
        box-shadow: var(--pf-raised);
    }
    .pf-mode.active.work { color: var(--pf-accent); }
    .pf-mode.active.break { color: var(--pf-success); }
    .pf-mode.active.longBreak { color: var(--pf-blue); }

    /* 操作按钮 */
    .pf-actions { display: flex; gap: 10px; margin-bottom: 14px; }
    .pf-btn {
        flex: 1; padding: 12px 0; border: none; border-radius: 16px;
        font-size: 14px; font-weight: 800; cursor: pointer;
        transition: all 0.2s; letter-spacing: 0.5px;
    }
    .pf-btn-start {
        background: linear-gradient(135deg, var(--pf-accent), var(--pf-accent2));
        color: #fff; box-shadow: 0 4px 16px rgba(255,107,107,0.35);
    }
    .pf-btn-start:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255,107,107,0.45); }
    .pf-btn-start:active { transform: translateY(0); }
    .pf-btn-secondary {
        background: var(--pf-btn); color: var(--pf-text); box-shadow: var(--pf-raised);
    }
    .pf-btn-secondary:hover { transform: translateY(-2px); }

    /* 设置面板 */
    .pf-settings {
        max-height: 0; overflow: hidden; opacity: 0;
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        margin-bottom: 0;
    }
    .pf-settings.open { max-height: 300px; opacity: 1; margin-bottom: 14px; }
    .pf-setting-row {
        display: flex; justify-content: space-between; align-items: center;
        padding: 8px 0; border-bottom: 1px solid var(--pf-border);
    }
    .pf-setting-row:last-child { border-bottom: none; }
    .pf-setting-label { font-size: 12px; color: var(--pf-sub); font-weight: 600; }
    .pf-setting-input {
        width: 60px; padding: 6px 8px; border: none; border-radius: 8px;
        background: var(--pf-btn); color: var(--pf-text); font-size: 13px;
        font-weight: 700; text-align: center; box-shadow: var(--pf-inset);
        outline: none;
    }
    .pf-toggle {
        width: 44px; height: 24px; border-radius: 12px;
        background: var(--pf-btn); box-shadow: var(--pf-inset);
        position: relative; cursor: pointer; transition: all 0.3s;
    }
    .pf-toggle::after {
        content: ''; position: absolute; top: 2px; left: 2px;
        width: 20px; height: 20px; border-radius: 50%;
        background: var(--pf-sub); transition: all 0.3s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .pf-toggle.on { background: var(--pf-accent); }
    .pf-toggle.on::after { left: 22px; background: white; }

    /* 统计 */
    .pf-stats {
        display: flex; justify-content: space-around;
        padding-top: 14px; border-top: 1px solid var(--pf-border);
    }
    .pf-stat { text-align: center; }
    .pf-stat-num { font-size: 22px; font-weight: 800; color: var(--pf-text); line-height: 1; }
    .pf-stat-label { font-size: 11px; color: var(--pf-sub); margin-top: 4px; font-weight: 600; }

    /* 任务列表 */
    .pf-tasks { margin-bottom: 12px; max-height: 80px; overflow-y: auto; }
    .pf-task-item {
        display: flex; align-items: center; gap: 8px;
        padding: 6px 8px; border-radius: 10px; margin-bottom: 4px;
        font-size: 12px; color: var(--pf-text); background: var(--pf-btn);
        cursor: pointer; transition: all 0.2s;
    }
    .pf-task-item:hover { transform: translateX(4px); }
    .pf-task-item.done { opacity: 0.5; text-decoration: line-through; }
    .pf-task-check { width: 16px; height: 16px; border-radius: 50%; border: 2px solid var(--pf-sub); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: transparent; transition: all 0.2s; }
    .pf-task-item.done .pf-task-check { background: var(--pf-success); border-color: var(--pf-success); color: white; }

    /* 通知 */
    .pf-notif {
        position: fixed; top: 24px; left: 50%;
        transform: translateX(-50%) translateY(-120px);
        padding: 14px 24px; background: var(--pf-solid);
        backdrop-filter: blur(20px); border-radius: 20px;
        border: 1px solid var(--pf-border);
        box-shadow: var(--pf-shadow); color: var(--pf-text);
        font-weight: 700; font-size: 14px; z-index: 2147483647;
        display: flex; align-items: center; gap: 10px;
        transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
    }
    .pf-notif.show { transform: translateX(-50%) translateY(0); }

    /* 粒子画布 */
    #pf-canvas {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: 2147483646;
    }

    /* 拖拽 */
    .pf-drag { cursor: grab; }
    .pf-drag:active { cursor: grabbing; }
    `;

    // ===================== HTML =====================
    function createHTML() {
        const div = document.createElement('div');
        div.className = 'pomo-fun-wrap' + (state.collapsed ? ' collapsed' : '');
        div.innerHTML = `
        <div class="pf-tab" id="pf-tab" title="展开番茄钟">🍅 番茄钟</div>
        <div class="pf-panel" id="pf-panel">
            <div class="pf-header pf-drag">
                <span class="pf-title">🍅 专注番茄</span>
                <div class="pf-header-btns">
                    <button class="pf-icon-btn" id="pf-sound" title="音效">🔊</button>
                    <button class="pf-icon-btn" id="pf-settings-btn" title="设置">⚙️</button>
                    <button class="pf-icon-btn" id="pf-minimize" title="收起">─</button>
                    <button class="pf-icon-btn" id="pf-close" title="关闭">✕</button>
                </div>
            </div>

            <div class="pf-task-input-wrap">
                <input type="text" class="pf-task-input" id="pf-task-input" placeholder="✏️ 输入当前要专注的任务..." maxlength="30" value="${settings.currentTask}">
            </div>

            <div class="pf-mascot-wrap">
                <div class="pf-mascot breathing" id="pf-mascot">🍅</div>
                <div class="pf-mascot-speech" id="pf-speech">加油！</div>
            </div>

            <div class="pf-timer-box">
                <svg class="pf-timer-svg" viewBox="0 0 180 180">
                    <circle class="pf-track" cx="90" cy="90" r="80"/>
                    <circle class="pf-progress" id="pf-progress" cx="90" cy="90" r="80" stroke-dasharray="502.65" stroke-dashoffset="0"/>
                </svg>
                <div class="pf-timer-text" id="pf-time">25:00</div>
            </div>
            <div class="pf-timer-label" id="pf-status">准备开始专注</div>

            <div class="pf-modes">
                <button class="pf-mode active work" data-mode="work">专注</button>
                <button class="pf-mode" data-mode="break">短休</button>
                <button class="pf-mode" data-mode="longBreak">长休</button>
            </div>

            <div class="pf-settings" id="pf-settings">
                <div class="pf-setting-row">
                    <span class="pf-setting-label">专注时长 (分)</span>
                    <input type="number" class="pf-setting-input" id="set-work" value="${settings.workTime}" min="1" max="60">
                </div>
                <div class="pf-setting-row">
                    <span class="pf-setting-label">短休时长 (分)</span>
                    <input type="number" class="pf-setting-input" id="set-break" value="${settings.breakTime}" min="1" max="30">
                </div>
                <div class="pf-setting-row">
                    <span class="pf-setting-label">长休时长 (分)</span>
                    <input type="number" class="pf-setting-input" id="set-long" value="${settings.longBreakTime}" min="1" max="60">
                </div>
                <div class="pf-setting-row">
                    <span class="pf-setting-label">长休间隔</span>
                    <input type="number" class="pf-setting-input" id="set-interval" value="${settings.longBreakInterval}" min="2" max="10">
                </div>
                <div class="pf-setting-row">
                    <span class="pf-setting-label">音效</span>
                    <div class="pf-toggle ${settings.soundEnabled ? 'on' : ''}" id="set-sound"></div>
                </div>
            </div>

            <div class="pf-actions">
                <button class="pf-btn pf-btn-start" id="pf-start">▶ 开始</button>
                <button class="pf-btn pf-btn-secondary" id="pf-reset">↺ 重置</button>
            </div>

            <div class="pf-tasks" id="pf-tasks"></div>

            <div class="pf-stats">
                <div class="pf-stat">
                    <div class="pf-stat-num" id="pf-count">${state.completedPomodoros}</div>
                    <div class="pf-stat-label">今日番茄</div>
                </div>
                <div class="pf-stat">
                    <div class="pf-stat-num" id="pf-focus">${state.totalFocusMinutes}</div>
                    <div class="pf-stat-label">专注分钟</div>
                </div>
                <div class="pf-stat">
                    <div class="pf-stat-num" id="pf-cycles">${state.currentCycle}</div>
                    <div class="pf-stat-label">当前轮次</div>
                </div>
            </div>
        </div>
        <div class="pf-notif" id="pf-notif"><span style="font-size:20px;">🎉</span> <span id="pf-notif-text">完成！</span></div>
        <canvas id="pf-canvas"></canvas>
        `;
        return div;
    }

    // ===================== 核心类 =====================
    class FunPomodoro {
        constructor() {
            this.wrap = createHTML();
            document.body.appendChild(this.wrap);

            this.els = {
                tab: this.wrap.querySelector('#pf-tab'),
                panel: this.wrap.querySelector('#pf-panel'),
                time: this.wrap.querySelector('#pf-time'),
                status: this.wrap.querySelector('#pf-status'),
                progress: this.wrap.querySelector('#pf-progress'),
                startBtn: this.wrap.querySelector('#pf-start'),
                resetBtn: this.wrap.querySelector('#pf-reset'),
                minimize: this.wrap.querySelector('#pf-minimize'),
                close: this.wrap.querySelector('#pf-close'),
                settingsBtn: this.wrap.querySelector('#pf-settings-btn'),
                settingsPanel: this.wrap.querySelector('#pf-settings'),
                soundBtn: this.wrap.querySelector('#pf-sound'),
                mascot: this.wrap.querySelector('#pf-mascot'),
                speech: this.wrap.querySelector('#pf-speech'),
                notif: this.wrap.querySelector('#pf-notif'),
                notifText: this.wrap.querySelector('#pf-notif-text'),
                count: this.wrap.querySelector('#pf-count'),
                focus: this.wrap.querySelector('#pf-focus'),
                cycles: this.wrap.querySelector('#pf-cycles'),
                taskInput: this.wrap.querySelector('#pf-task-input'),
                tasksBox: this.wrap.querySelector('#pf-tasks'),
                canvas: this.wrap.querySelector('#pf-canvas')
            };

            this.circumference = 2 * Math.PI * 80;
            this.ctx = this.els.canvas.getContext('2d');
            this.resizeCanvas();

            this.modes = {
                work: { label: '专注中', text: '准备开始专注', color: '#ff6b6b', emoji: '🍅', quotes: ['加油！','你可以的！','保持专注！','效率MAX！'] },
                break: { label: '休息中', text: '准备休息', color: '#6bcb77', emoji: '🌿', quotes: ['放松一下','深呼吸','喝杯茶吧','休息是为了更好的出发'] },
                longBreak: { label: '长休中', text: '准备长休', color: '#4d96ff', emoji: '🌊', quotes: ['好好休息一下','眺望远方','做个拉伸','充电中...'] }
            };

            this.speechTimer = null;
            this.init();
        }

        init() {
            this.updateModeUI();
            this.updateDisplay();
            this.renderTasks();
            this.bindEvents();
            this.loadPosition();
            this.say('你好！准备开始专注了吗？', 3000);
        }

        bindEvents() {
            this.els.startBtn.addEventListener('click', () => this.toggle());
            this.els.resetBtn.addEventListener('click', () => this.reset());

            this.wrap.querySelectorAll('.pf-mode').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    if (state.isRunning && !confirm('切换模式会重置计时哦，确定吗？')) return;
                    this.stop();
                    this.setMode(e.target.dataset.mode);
                });
            });

            this.els.minimize.addEventListener('click', () => this.toggleCollapse());
            this.els.tab.addEventListener('click', () => this.toggleCollapse());
            this.els.close.addEventListener('click', () => this.destroy());
            this.els.settingsBtn.addEventListener('click', () => this.toggleSettings());
            this.els.soundBtn.addEventListener('click', () => this.toggleSound());

            this.els.taskInput.addEventListener('change', (e) => {
                settings.currentTask = e.target.value;
                this.saveSettings();
            });
            this.els.taskInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                    state.tasks.push({ text: e.target.value.trim(), done: false });
                    this.saveTasks();
                    this.renderTasks();
                    e.target.value = '';
                }
            });

            // 设置项
            ['work','break','long','interval'].forEach(key => {
                const el = this.wrap.querySelector(`#set-${key}`);
                if (el) el.addEventListener('change', () => this.updateSettings());
            });
            this.wrap.querySelector('#set-sound').addEventListener('click', (e) => {
                settings.soundEnabled = !settings.soundEnabled;
                e.target.classList.toggle('on', settings.soundEnabled);
                this.els.soundBtn.textContent = settings.soundEnabled ? '🔊' : '🔇';
                this.saveSettings();
            });

            // 键盘
            document.addEventListener('keydown', (e) => {
                if (e.code === 'Space' && e.target.tagName !== 'INPUT') {
                    e.preventDefault(); this.toggle();
                }
                if (e.code === 'Escape') this.toggleCollapse();
            });

            window.addEventListener('resize', () => this.resizeCanvas());
            this.makeDraggable();
        }

        makeDraggable() {
            const header = this.wrap.querySelector('.pf-drag');
            let dragging = false, sx, sy, sl, st;
            header.addEventListener('mousedown', e => {
                if (this.wrap.classList.contains('collapsed')) return;
                dragging = true; sx = e.clientX; sy = e.clientY;
                const r = this.wrap.getBoundingClientRect();
                sl = r.left; st = r.top;
            });
            document.addEventListener('mousemove', e => {
                if (!dragging) return;
                e.preventDefault();
                this.wrap.style.left = `px`;
                this.wrap.style.top = `px`;
                this.wrap.style.right = 'auto';
                this.savePosition();
            });
            document.addEventListener('mouseup', () => dragging = false);
        }

        savePosition() {
            const r = this.wrap.getBoundingClientRect();
            localStorage.setItem('pomo_pos2', JSON.stringify({ left: r.left, top: r.top }));
        }

        loadPosition() {
            const pos = localStorage.getItem('pomo_pos2');
            if (pos) {
                const { left, top } = JSON.parse(pos);
                this.wrap.style.left = `px`; this.wrap.style.top = `px`; this.wrap.style.right = 'auto';
            }
        }

        toggleSettings() {
            state.showSettings = !state.showSettings;
            this.els.settingsPanel.classList.toggle('open', state.showSettings);
        }

        updateSettings() {
            const w = parseInt(this.wrap.querySelector('#set-work').value) || 25;
            const b = parseInt(this.wrap.querySelector('#set-break').value) || 5;
            const l = parseInt(this.wrap.querySelector('#set-long').value) || 15;
            const i = parseInt(this.wrap.querySelector('#set-interval').value) || 4;
            settings.workTime = w; settings.breakTime = b;
            settings.longBreakTime = l; settings.longBreakInterval = i;
            this.saveSettings();
            if (!state.isRunning) {
                state.timeLeft = this.getModeTime();
                this.updateDisplay();
            }
        }

        getModeTime() {
            const map = { work: settings.workTime, break: settings.breakTime, longBreak: settings.longBreakTime };
            return (map[state.mode] || 25) * 60;
        }

        saveSettings() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        }

        saveTasks() {
            localStorage.setItem('pomo_tasks', JSON.stringify(state.tasks));
        }

        renderTasks() {
            this.els.tasksBox.innerHTML = state.tasks.map((t, i) => `
                <div class="pf-task-item ${t.done ? 'done' : ''}" data-idx="${i}">
                    <div class="pf-task-check">${t.done ? '✓' : ''}</div>
                    <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.text}</span>
                    <span style="opacity:0.4;font-size:10px;">×</span>
                </div>
            `).join('');
            this.els.tasksBox.querySelectorAll('.pf-task-item').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.dataset.idx);
                    if (el.textContent.includes('×') && el.querySelector('span:last-child:hover')) {
                        state.tasks.splice(idx, 1);
                    } else {
                        state.tasks[idx].done = !state.tasks[idx].done;
                    }
                    this.saveTasks(); this.renderTasks();
                });
            });
        }

        setMode(mode) {
            state.mode = mode;
            state.timeLeft = this.getModeTime();
            state.currentCycle = 0;
            this.updateModeUI();
            this.updateDisplay();
            const m = this.modes[mode];
            this.els.mascot.textContent = m.emoji;
            this.say(m.quotes[Math.floor(Math.random() * m.quotes.length)]);
        }

        updateModeUI() {
            this.wrap.querySelectorAll('.pf-mode').forEach(btn => {
                btn.className = 'pf-mode' + (btn.dataset.mode === state.mode ? ' active' : '') + ' ' + btn.dataset.mode;
            });
            const m = this.modes[state.mode];
            this.els.status.textContent = state.isRunning ? m.label : m.text;
            this.els.progress.style.stroke = m.color;
            this.els.mascot.textContent = m.emoji;
        }

        toggle() {
            state.isRunning ? this.stop() : this.start();
        }

        start() {
            state.isRunning = true;
            this.els.startBtn.innerHTML = '⏸ 暂停';
            this.els.mascot.classList.add('breathing');
            this.updateModeUI();
            this.tick();
            state.timerId = setInterval(() => this.tick(), 1000);
            this.say('开始！加油！');
        }

        stop() {
            state.isRunning = false;
            this.els.startBtn.innerHTML = '▶ 继续';
            this.els.status.textContent = '已暂停';
            this.els.mascot.classList.remove('breathing');
            clearInterval(state.timerId);
        }

        reset() {
            this.stop();
            state.timeLeft = this.getModeTime();
            this.els.startBtn.innerHTML = '▶ 开始';
            this.updateModeUI();
            this.updateDisplay();
            this.say('已重置');
        }

        tick() {
            if (state.timeLeft > 0) {
                state.timeLeft--;
                this.updateDisplay();
                // 随机鼓励
                if (state.mode === 'work' && state.timeLeft % 300 === 0 && state.timeLeft > 0) {
                    const quotes = this.modes.work.quotes;
                    this.say(quotes[Math.floor(Math.random() * quotes.length)], 2000);
                }
            } else {
                this.complete();
            }
        }

        complete() {
            this.stop();
            this.playSound();
            const m = this.modes[state.mode];
            
            if (state.mode === 'work') {
                state.completedPomodoros++;
                state.totalFocusMinutes += settings.workTime;
                state.currentCycle++;
                localStorage.setItem('pomo_count', state.completedPomodoros);
                localStorage.setItem('pomo_focus', state.totalFocusMinutes);
                this.els.count.textContent = state.completedPomodoros;
                this.els.focus.textContent = state.totalFocusMinutes;
                this.els.cycles.textContent = state.currentCycle;
                
                this.celebrate();
                if (state.currentCycle % settings.longBreakInterval === 0) {
                    this.showNotif('🎉 太棒了！完成一轮，去长休吧！');
                    this.setMode('longBreak');
                } else {
                    this.showNotif('✨ 专注完成！休息一下吧~');
                    this.setMode('break');
                }
                this.start();
            } else {
                this.showNotif('🌟 休息结束！继续加油！');
                this.setMode('work');
                this.start();
            }
        }

        updateDisplay() {
            const mins = Math.floor(state.timeLeft / 60);
            const secs = state.timeLeft % 60;
            this.els.time.textContent = `:`;
            
            const total = this.getModeTime();
            const prog = (total - state.timeLeft) / total;
            this.els.progress.style.strokeDashoffset = this.circumference - prog * this.circumference;

            if (state.isRunning) {
                document.title = `(:) `;
            } else {
                document.title = document.title.replace(/^$\d+:\d+$\s*/, '');
            }
        }

        say(text, duration = 2500) {
            this.els.speech.textContent = text;
            this.els.speech.classList.add('show');
            clearTimeout(this.speechTimer);
            this.speechTimer = setTimeout(() => this.els.speech.classList.remove('show'), duration);
        }

        showNotif(text) {
            this.els.notifText.textContent = text;
            this.els.notif.classList.add('show');
            setTimeout(() => this.els.notif.classList.remove('show'), 3500);
        }

        toggleCollapse() {
            state.collapsed = !state.collapsed;
            this.wrap.classList.toggle('collapsed', state.collapsed);
            if (state.collapsed) {
                this.wrap.style.left = 'auto'; this.wrap.style.top = '50%';
                this.wrap.style.transform = 'translateY(-50%)';
            } else {
                this.wrap.style.transform = '';
                this.loadPosition();
            }
            localStorage.setItem('pomo_collapsed', state.collapsed ? '1' : '0');
        }

        toggleSound() {
            settings.soundEnabled = !settings.soundEnabled;
            this.els.soundBtn.textContent = settings.soundEnabled ? '🔊' : '🔇';
            this.wrap.querySelector('#set-sound').classList.toggle('on', settings.soundEnabled);
            this.saveSettings();
        }

        playSound() {
            if (!settings.soundEnabled) return;
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmFgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.play().catch(() => {});
        }

        resizeCanvas() {
            this.els.canvas.width = window.innerWidth;
            this.els.canvas.height = window.innerHeight;
        }

        celebrate() {
            const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff9ff3', '#54a0ff'];
            for (let i = 0; i < 60; i++) {
                setTimeout(() => {
                    const x = window.innerWidth / 2 + (Math.random() - 0.5) * 200;
                    const y = window.innerHeight / 2 + (Math.random() - 0.5) * 100;
                    this.spawnParticle(x, y, colors[Math.floor(Math.random() * colors.length)]);
                }, i * 15);
            }
        }

        spawnParticle(x, y, color) {
            const el = document.createElement('div');
            el.style.cssText = `
                position: fixed; left: ${x}px; top: ${y}px;
                width: 8px; height: 8px; border-radius: 50%;
                background: ${color}; pointer-events: none; z-index: 2147483646;
                --tx: ${(Math.random() - 0.5) * 300}px;
                --ty: ${(Math.random() - 0.5) * 400 + 200}px;
                animation: particle 1s ease-out forwards;
            `;
            document.body.appendChild(el);
            setTimeout(() => el.remove(), 1000);
        }

        destroy() {
            if (!confirm('确定要关闭番茄钟吗？')) return;
            this.stop();
            this.wrap.remove();
            document.querySelectorAll('.pomo-fun-wrap, #pf-canvas').forEach(e => e.remove());
        }
    }

    // ===================== 注入 =====================
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    if (!document.querySelector('.pomo-fun-wrap')) {
        new FunPomodoro();
    }
})();