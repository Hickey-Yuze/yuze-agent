(function() {
  if (document.getElementById('__Yuze_timer_overlay')) return;

  const style = document.createElement('style');
  style.textContent = `
    #__Yuze_timer_overlay *{margin:0;padding:0;box-sizing:border-box}
    #__Yuze_timer_overlay{position:fixed;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
    #__Yuze_timer_drag{cursor:move;user-select:none}
    .__tt_panel{background:#1a1a2e;border-radius:20px;padding:28px 24px 24px;box-shadow:0 16px 48px rgba(0,0,0,0.6);text-align:center;min-width:300px;border:1px solid #2a2a4a}
    .__tt_title{font-size:14px;color:#8888aa;letter-spacing:2px;margin-bottom:16px}
    .__tt_display{font-size:72px;font-weight:700;color:#e94560;letter-spacing:4px;text-shadow:0 0 40px rgba(233,69,96,0.4);line-height:1.1;font-variant-numeric:tabular-nums}
    .__tt_display.warn{color:#ffc107;text-shadow:0 0 40px rgba(255,193,7,0.4)}
    .__tt_display.done{color:#00ff88;text-shadow:0 0 40px rgba(0,255,136,0.4);animation:__tt_pulse 0.5s infinite alternate}
    @keyframes __tt_pulse{to{opacity:0.5}}
    .__tt_inputs{display:flex;justify-content:center;align-items:center;gap:4px;margin:16px 0 20px}
    .__tt_ig{display:flex;flex-direction:column;align-items:center}
    .__tt_ig label{font-size:10px;color:#666;margin-bottom:4px;letter-spacing:1px}
    .__tt_ig input{width:56px;height:42px;text-align:center;font-size:20px;font-weight:600;border:2px solid #2a2a4a;border-radius:10px;background:#0f0f23;color:#eee;outline:none;transition:border-color 0.2s;font-variant-numeric:tabular-nums}
    .__tt_ig input:focus{border-color:#e94560}
    .__tt_sep{font-size:24px;color:#555;margin-top:10px}
    .__tt_btns{display:flex;gap:10px;justify-content:center}
    .__tt_btns button{padding:10px 22px;border:none;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.15s;letter-spacing:0.5px}
    .__tt_btns button:active{transform:scale(0.95)}
    .__tt_start{background:#e94560;color:#fff}
    .__tt_start:hover{background:#d63851}
    .__tt_pause{background:#ffc107;color:#1a1a2e}
    .__tt_pause:hover{background:#e0a800}
    .__tt_reset{background:#2a2a4a;color:#999}
    .__tt_reset:hover{background:#3a3a5a;color:#eee}
    .__tt_btns button:disabled{opacity:0.35;cursor:not-allowed;transform:none}
    .__tt_close{position:absolute;top:8px;right:12px;background:none;border:none;color:#555;font-size:18px;cursor:pointer;line-height:1;padding:4px}
    .__tt_close:hover{color:#e94560}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = '__Yuze_timer_overlay';
  overlay.innerHTML = `
    <div class="__tt_panel" style="position:relative">
      <button class="__tt_close" id="__tt_close_btn" title="关闭">✕</button>
      <div class="__tt_title">⏱ 倒计时</div>
      <div class="__tt_display" id="__tt_display">00:00:00</div>
      <div class="__tt_inputs" id="__tt_inputs">
        <div class="__tt_ig"><label>时</label><input type="number" id="__tt_h" value="0" min="0" max="99"></div>
        <span class="__tt_sep">:</span>
        <div class="__tt_ig"><label>分</label><input type="number" id="__tt_m" value="5" min="0" max="59"></div>
        <span class="__tt_sep">:</span>
        <div class="__tt_ig"><label>秒</label><input type="number" id="__tt_s" value="0" min="0" max="59"></div>
      </div>
      <div class="__tt_btns">
        <button class="__tt_start" id="__tt_btn_start">开始</button>
        <button class="__tt_pause" id="__tt_btn_pause" disabled>暂停</button>
        <button class="__tt_reset" id="__tt_btn_reset">重置</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const panel = overlay.querySelector('.__tt_panel');
  const dragHandle = panel;
  const display = document.getElementById('__tt_display');
  const inputs = document.getElementById('__tt_inputs');
  const hInput = document.getElementById('__tt_h');
  const mInput = document.getElementById('__tt_m');
  const sInput = document.getElementById('__tt_s');
  const btnStart = document.getElementById('__tt_btn_start');
  const btnPause = document.getElementById('__tt_btn_pause');
  const btnReset = document.getElementById('__tt_btn_reset');
  const btnClose = document.getElementById('__tt_close_btn');

  let remaining = 300, interval = null, finished = false;

  overlay.style.right = '20px';
  overlay.style.bottom = '20px';

  function pad(n){ return String(n).padStart(2,'0'); }
  function upd(){
    const h=Math.floor(remaining/3600), m=Math.floor((remaining%3600)/60), s=remaining%60;
    display.textContent=pad(h)+':'+pad(m)+':'+pad(s);
    display.classList.remove('warn','done');
    if(finished) display.classList.add('done');
    else if(remaining<=10&&remaining>0) display.classList.add('warn');
  }
  function read(){
    return (parseInt(hInput.value)||0)*3600+(parseInt(mInput.value)||0)*60+(parseInt(sInput.value)||0);
  }
  function beep(){
    try{
      const ctx=new(window.AudioContext||window.webkitAudioContext)();
      function b(f,t,d){const o=ctx.createOscillator(),g=ctx.createGain();o.type='square';o.frequency.value=f;g.gain.setValueAtTime(0.3,t);g.gain.exponentialRampToValueAtTime(0.01,t+d);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+d)}
      const n=ctx.currentTime;b(880,n,0.15);b(880,n+0.2,0.15);b(880,n+0.4,0.15);b(1100,n+0.65,0.4);
    }catch(e){}
  }

  btnStart.onclick=function(){
    if(finished){btnReset.click();}
    if(remaining<=0){const t=read();if(t<=0)return;remaining=t;}
    finished=false;display.classList.remove('done');
    btnStart.disabled=true;btnPause.disabled=false;
    inputs.style.opacity='0.5';inputs.style.pointerEvents='none';
    interval=setInterval(function(){
      remaining--;upd();
      if(remaining<=0){clearInterval(interval);interval=null;finished=true;upd();btnStart.disabled=false;btnPause.disabled=true;inputs.style.opacity='1';inputs.style.pointerEvents='auto';beep();setTimeout(function(){alert('⏰ 倒计时结束！');},100);}
    },1000);
  };
  btnPause.onclick=function(){
    if(interval){clearInterval(interval);interval=null;btnStart.disabled=false;btnPause.disabled=true;btnStart.textContent='继续';}
  };
  btnReset.onclick=function(){
    if(interval){clearInterval(interval);interval=null;}
    finished=false;remaining=read();upd();display.classList.remove('warn','done');
    btnStart.disabled=false;btnPause.disabled=true;btnStart.textContent='开始';
    inputs.style.opacity='1';inputs.style.pointerEvents='auto';
  };
  btnClose.onclick=function(){
    if(interval) clearInterval(interval);
    overlay.remove();style.remove();
  };

  hInput.oninput=mInput.oninput=sInput.oninput=function(){if(!interval&&!finished){remaining=read();upd();}};

  let dragging=false,dx,dy;
  dragHandle.addEventListener('mousedown',function(e){if(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT')return;dragging=true;const r=overlay.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;overlay.style.right='auto';overlay.style.bottom='auto';overlay.style.left=r.left+'px';overlay.style.top=r.top+'px';e.preventDefault();});
  document.addEventListener('mousemove',function(e){if(!dragging)return;overlay.style.left=(e.clientX-dx)+'px';overlay.style.top=(e.clientY-dy)+'px';});
  document.addEventListener('mouseup',function(){dragging=false;});

  upd();
})();