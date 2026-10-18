(function () {
  'use strict';

  if (window.__tbExtGamesLoaded) return;
  window.__tbExtGamesLoaded = true;

  function getDark() {
    if (window.__tbRuntime && typeof window.__tbRuntime.getContext === 'function') {
      return window.__tbRuntime.getContext().dark;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme:dark)').matches;
  }

  function cssObj(el, s) { Object.assign(el.style, s); return el; }
  function div(s) { var d = document.createElement('div'); if (s) cssObj(d, s); return d; }

  function makeBtn(text, dark) {
    var b = document.createElement('button');
    cssObj(b, {
      height:'26px', padding:'0 12px',
      border:'.5px solid '+(dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.12)'),
      borderRadius:'8px',
      background:dark?'rgba(255,255,255,.08)':'rgba(0,0,0,.06)',
      fontSize:'12px', cursor:'pointer', fontFamily:'inherit', flexShrink:'0',
      color:dark?'rgba(255,255,255,.65)':'rgba(0,0,0,.6)',
    });
    b.textContent = text; return b;
  }

  function makeLabel(text, color) {
    var s = document.createElement('span');
    cssObj(s, { fontSize:'13px', color:color||'rgba(0,0,0,.5)', fontWeight:'500' });
    s.textContent = text; return s;
  }

  function makeHdr(container, items, dark) {
    var hdr = div({
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'8px 12px', gap:'8px', flexShrink:'0',
      background:dark?'rgba(0,0,0,.35)':'rgba(0,0,0,.04)',
      borderBottom:'.5px solid '+(dark?'rgba(255,255,255,.07)':'rgba(0,0,0,.08)'),
    });
    items.forEach(function(item){ hdr.appendChild(item); });
    container.appendChild(hdr);
    return hdr;
  }

  function baseContainer(container, bg) {
    cssObj(container, {
      width:'100%', height:'100%', display:'flex', flexDirection:'column',
      overflow:'hidden', background:bg||'#f4f4f6', padding:'0',
      boxSizing:'border-box', fontFamily:'ui-sans-serif,system-ui,sans-serif',
    });
  }

  function mountSnake(container) {
    var dark = getDark();
    baseContainer(container, '#0f1923');

    var scoreEl = makeLabel('分数: 0','rgba(255,255,255,.5)');
    var levelEl = makeLabel('Lv.1',   'rgba(255,255,255,.5)');
    var hintEl  = makeLabel('方向键 / WASD','rgba(255,255,255,.25)');
    var restBtn = makeBtn('重来', true);
    makeHdr(container, [scoreEl, levelEl, hintEl, restBtn], true);

    var wrap = div({ flex:'1', overflow:'hidden', position:'relative' });
    container.appendChild(wrap);
    var canvas = document.createElement('canvas');
    cssObj(canvas, { display:'block', width:'100%', height:'100%' });
    wrap.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var CELL=20, COLS, ROWS;
    var snake, dir, nextDir, food, bonus, score, dead, level, eatCount, intervalID;

    function recalcGrid(){
      var w=wrap.clientWidth||340, h=wrap.clientHeight||400;
      canvas.width=w; canvas.height=h;
      COLS=Math.max(8,Math.floor(w/CELL));
      ROWS=Math.max(8,Math.floor(h/CELL));
    }
    function init(){
      recalcGrid();
      var sx=Math.floor(COLS/2), sy=Math.floor(ROWS/2);
      snake=[{x:sx,y:sy},{x:sx-1,y:sy},{x:sx-2,y:sy}];
      dir={x:1,y:0}; nextDir={x:1,y:0};
      score=0; dead=false; level=1; eatCount=0; bonus=null;
      placeFood();
      scoreEl.textContent='分数: 0'; levelEl.textContent='Lv.1';
    }
    function placeFood(){
      var empty=[];
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++)
        if(!snake.some(function(s){return s.x===c&&s.y===r;})) empty.push({x:c,y:r});
      if(empty.length) food=empty[Math.floor(Math.random()*empty.length)];
    }
    function placeBonus(){
      var empty=[];
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++)
        if(!snake.some(function(s){return s.x===c&&s.y===r;})&&!(food.x===c&&food.y===r)) empty.push({x:c,y:r});
      if(empty.length) bonus=Object.assign(empty[Math.floor(Math.random()*empty.length)],{ttl:80});
    }
    function step(){
      if(dead)return;
      dir=nextDir;
      var head={x:(snake[0].x+dir.x+COLS)%COLS,y:(snake[0].y+dir.y+ROWS)%ROWS};
      if(snake.some(function(s){return s.x===head.x&&s.y===head.y;})){dead=true;draw();return;}
      snake.unshift(head);
      var ate=false;
      if(head.x===food.x&&head.y===food.y){
        score+=10*level; ate=true; eatCount++; placeFood();
        if(eatCount%5===0) placeBonus();
        if(eatCount%8===0){level++;levelEl.textContent='Lv.'+level;restartInterval();}
        scoreEl.textContent='分数: '+score;
        window.__tbRuntime&&window.__tbRuntime.setScore('分数 '+score+'  Lv.'+level);
      }
      if(bonus&&head.x===bonus.x&&head.y===bonus.y){
        score+=50*level; ate=true; bonus=null;
        scoreEl.textContent='分数: '+score;
        window.__tbRuntime&&window.__tbRuntime.setScore('分数 '+score+' ⭐');
      }
      if(!ate) snake.pop();
      if(bonus){bonus.ttl--;if(bonus.ttl<=0)bonus=null;}
      draw();
    }
    function draw(){
      var w=canvas.width,h=canvas.height;
      var offX=Math.floor((w-COLS*CELL)/2),offY=Math.floor((h-ROWS*CELL)/2);
      ctx.fillStyle='#0f1923'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='rgba(255,255,255,.04)'; ctx.lineWidth=.5;
      for(var c=0;c<=COLS;c++){ctx.beginPath();ctx.moveTo(offX+c*CELL,offY);ctx.lineTo(offX+c*CELL,offY+ROWS*CELL);ctx.stroke();}
      for(var r=0;r<=ROWS;r++){ctx.beginPath();ctx.moveTo(offX,offY+r*CELL);ctx.lineTo(offX+COLS*CELL,offY+r*CELL);ctx.stroke();}
      if(food){var fx=offX+food.x*CELL+CELL/2,fy=offY+food.y*CELL+CELL/2;ctx.fillStyle='#FF6B6B';ctx.beginPath();ctx.arc(fx,fy,CELL/2-2,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.arc(fx-2,fy-2,3,0,Math.PI*2);ctx.fill();}
      if(bonus&&Math.floor(bonus.ttl/5)%2===0){var bx=offX+bonus.x*CELL+CELL/2,by=offY+bonus.y*CELL+CELL/2;ctx.fillStyle='#FFD700';ctx.beginPath();ctx.arc(bx,by,CELL/2-1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font='12px ui-sans-serif';ctx.textAlign='center';ctx.fillText('⭐',bx,by+4);ctx.textAlign='left';}
      snake.forEach(function(s,i){var ratio=i/snake.length;var gr=Math.round(80+(1-ratio)*96),gg=Math.round(200+(1-ratio)*40),gb=Math.round(80+(1-ratio)*60);ctx.fillStyle='rgb('+gr+','+gg+','+gb+')';var pad=i===0?1:2,rx=offX+s.x*CELL+pad,ry=offY+s.y*CELL+pad,rw=CELL-pad*2,rh=CELL-pad*2,rr=4;ctx.beginPath();ctx.moveTo(rx+rr,ry);ctx.lineTo(rx+rw-rr,ry);ctx.quadraticCurveTo(rx+rw,ry,rx+rw,ry+rr);ctx.lineTo(rx+rw,ry+rh-rr);ctx.quadraticCurveTo(rx+rw,ry+rh,rx+rw-rr,ry+rh);ctx.lineTo(rx+rr,ry+rh);ctx.quadraticCurveTo(rx,ry+rh,rx,ry+rh-rr);ctx.lineTo(rx,ry+rr);ctx.quadraticCurveTo(rx,ry,rx+rr,ry);ctx.closePath();ctx.fill();});
      if(snake.length>0){var hd=snake[0],hx=offX+hd.x*CELL+CELL/2,hy=offY+hd.y*CELL+CELL/2;var eo=[{x:dir.y*4+dir.x*2,y:-dir.x*4+dir.y*2},{x:-dir.y*4+dir.x*2,y:dir.x*4+dir.y*2}];eo.forEach(function(o){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(hx+o.x,hy+o.y,3,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0f1923';ctx.beginPath();ctx.arc(hx+o.x+dir.x,hy+o.y+dir.y,1.5,0,Math.PI*2);ctx.fill();});}
      if(dead){ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillRect(0,0,w,h);ctx.fillStyle='#FF6B6B';ctx.font='bold 22px ui-sans-serif';ctx.textAlign='center';ctx.fillText('Game Over',w/2,h/2-22);ctx.fillStyle='#fff';ctx.font='14px ui-sans-serif';ctx.fillText('分数: '+score+'  Lv.'+level,w/2,h/2+4);ctx.fillStyle='rgba(255,255,255,.4)';ctx.font='12px ui-sans-serif';ctx.fillText('按方向键重新开始',w/2,h/2+28);ctx.textAlign='left';}
    }
    function restartInterval(){clearInterval(intervalID);intervalID=setInterval(step,Math.max(60,140-(level-1)*12));}
    var ro=new ResizeObserver(function(){recalcGrid();if(!dead)draw();});
    ro.observe(wrap);
    init(); restartInterval();
    var keyH=function(e){var map={ArrowUp:{x:0,y:-1},ArrowDown:{x:0,y:1},ArrowLeft:{x:-1,y:0},ArrowRight:{x:1,y:0},w:{x:0,y:-1},s:{x:0,y:1},a:{x:-1,y:0},d:{x:1,y:0}};var d=map[e.key];if(!d)return;e.preventDefault();if(dead){init();restartInterval();return;}if(d.x!==-dir.x||d.y!==-dir.y)nextDir=d;};
    window.addEventListener('keydown',keyH);
    restBtn.addEventListener('click',function(){init();restartInterval();});
    return{destroy:function(){clearInterval(intervalID);ro.disconnect();window.removeEventListener('keydown',keyH);}};
  }

  function mountTetris(container) {
    var dark = getDark();
    baseContainer(container, dark?'#1a1a2e':'#1a1a2e');

    var scoreEl = makeLabel('分数: 0', 'rgba(255,255,255,.6)');
    var linesEl = makeLabel('行: 0',   'rgba(255,255,255,.4)');
    var levelEl = makeLabel('Lv.1',    'rgba(255,255,255,.4)');
    var hintEl  = makeLabel('↑旋转  空格硬降','rgba(255,255,255,.22)');
    var restBtn = makeBtn('重来', true);
    makeHdr(container, [scoreEl, linesEl, levelEl, hintEl, restBtn], true);

    var wrap = div({ flex:'1', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' });
    container.appendChild(wrap);

    var canvas = document.createElement('canvas');
    cssObj(canvas, { display:'block' });
    wrap.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var TCOLS=10, TROWS=20;
    var CELL;

    function calcCell(){
      var aw=wrap.clientWidth||300, ah=wrap.clientHeight||460;
      var byW=Math.floor(aw/TCOLS), byH=Math.floor(ah/TROWS);
      CELL=Math.max(14, Math.min(byW, byH, 28));
      canvas.width=TCOLS*CELL; canvas.height=TROWS*CELL;
    }

    var PIECES=[
      {shape:[[1,1,1,1]],color:'#00BCD4'},
      {shape:[[1,1],[1,1]],color:'#FFD700'},
      {shape:[[0,1,0],[1,1,1]],color:'#9C27B0'},
      {shape:[[1,0,0],[1,1,1]],color:'#FF9800'},
      {shape:[[0,0,1],[1,1,1]],color:'#2196F3'},
      {shape:[[0,1,1],[1,1,0]],color:'#4CAF50'},
      {shape:[[1,1,0],[0,1,1]],color:'#F44336'},
    ];

    var board,cur,curX,curY,score2,lines,level2,raf2,dead2,dropTimer,dropInterval;

    function newBoard(){return Array.from({length:TROWS},function(){return Array(TCOLS).fill(0);});}
    function randPiece(){var p=PIECES[Math.floor(Math.random()*PIECES.length)];return{shape:p.shape.map(function(r){return r.slice();}),color:p.color};}
    function rotate(shape){var R=shape.length,C=shape[0].length,out=Array.from({length:C},function(){return Array(R).fill(0);});for(var r=0;r<R;r++)for(var c=0;c<C;c++)out[c][R-1-r]=shape[r][c];return out;}
    function fits(shape,x,y){for(var r=0;r<shape.length;r++)for(var c=0;c<shape[r].length;c++){if(!shape[r][c])continue;var nx=x+c,ny=y+r;if(nx<0||nx>=TCOLS||ny>=TROWS)return false;if(ny>=0&&board[ny][nx])return false;}return true;}
    function place(){
      cur.shape.forEach(function(row,r){row.forEach(function(v,c){if(v&&curY+r>=0)board[curY+r][curX+c]=cur.color;});});
      var cleared=0;
      board=board.filter(function(row){if(row.every(Boolean)){cleared++;return false;}return true;});
      while(board.length<TROWS)board.unshift(Array(TCOLS).fill(0));
      lines+=cleared; score2+=[0,100,300,500,800][cleared]||0;
      level2=Math.floor(lines/10)+1;
      scoreEl.textContent='分数: '+score2; linesEl.textContent='行: '+lines; levelEl.textContent='Lv.'+level2;
      window.__tbRuntime&&window.__tbRuntime.setScore('分数 '+score2);
      dropInterval=Math.max(80,500-level2*40);
      spawn();
    }
    function spawn(){cur=randPiece();curX=Math.floor((TCOLS-cur.shape[0].length)/2);curY=-cur.shape.length;if(!fits(cur.shape,curX,curY+1)){dead2=true;}}
    function init2(){
      calcCell();
      board=newBoard();score2=0;lines=0;level2=1;dead2=false;dropTimer=0;dropInterval=500;
      scoreEl.textContent='分数: 0';linesEl.textContent='行: 0';levelEl.textContent='Lv.1';
      spawn();
    }
    function drawCell2(c,r,color){var x=c*CELL,y=r*CELL,p=1;ctx.fillStyle=color;ctx.fillRect(x+p,y+p,CELL-p*2,CELL-p*2);ctx.fillStyle='rgba(255,255,255,.25)';ctx.fillRect(x+p,y+p,CELL-p*2,Math.max(2,CELL*.12));ctx.fillStyle='rgba(0,0,0,.2)';ctx.fillRect(x+p,y+CELL-p-Math.max(2,CELL*.12),CELL-p*2,Math.max(2,CELL*.12));}
    function draw2(){
      ctx.fillStyle='#1a1a2e';ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.strokeStyle='rgba(255,255,255,.04)';ctx.lineWidth=.5;
      for(var c=0;c<=TCOLS;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,TROWS*CELL);ctx.stroke();}
      for(var r=0;r<=TROWS;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(TCOLS*CELL,r*CELL);ctx.stroke();}
      board.forEach(function(row,r){row.forEach(function(v,c){if(v)drawCell2(c,r,v);});});
      if(cur){
        var ghost=curY;while(fits(cur.shape,curX,ghost+1))ghost++;
        cur.shape.forEach(function(row,r){row.forEach(function(v,c){if(v&&ghost+r>=0){ctx.globalAlpha=0.18;drawCell2(curX+c,ghost+r,cur.color);ctx.globalAlpha=1;}});});
        cur.shape.forEach(function(row,r){row.forEach(function(v,c){if(v&&curY+r>=0)drawCell2(curX+c,curY+r,cur.color);});});
      }
      if(dead2){ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#F44336';ctx.font='bold '+Math.max(14,CELL*0.8)+'px ui-sans-serif';ctx.textAlign='center';ctx.fillText('Game Over',canvas.width/2,canvas.height/2-CELL*1.2);ctx.fillStyle='#fff';ctx.font=Math.max(11,CELL*0.6)+'px ui-sans-serif';ctx.fillText('分数: '+score2,canvas.width/2,canvas.height/2+CELL*.2);ctx.fillStyle='rgba(255,255,255,.4)';ctx.font=Math.max(10,CELL*0.55)+'px ui-sans-serif';ctx.fillText('按 R 重新开始',canvas.width/2,canvas.height/2+CELL*1.4);ctx.textAlign='left';}
    }
    var last2=0;
    function loop2(ts){raf2=requestAnimationFrame(loop2);if(!dead2){dropTimer+=ts-last2;if(dropTimer>=dropInterval){dropTimer=0;if(fits(cur.shape,curX,curY+1)){curY++;}else{place();}}}last2=ts;draw2();}
    var ro2=new ResizeObserver(function(){calcCell();if(!dead2)draw2();});
    ro2.observe(wrap);
    init2(); raf2=requestAnimationFrame(loop2);
    var keyH2=function(e){
      if(dead2){if(e.key==='r'||e.key==='R'){init2();}return;}
      if(e.key==='ArrowLeft'||e.key==='a'){if(fits(cur.shape,curX-1,curY))curX--;e.preventDefault();}
      else if(e.key==='ArrowRight'||e.key==='d'){if(fits(cur.shape,curX+1,curY))curX++;e.preventDefault();}
      else if(e.key==='ArrowDown'||e.key==='s'){if(fits(cur.shape,curX,curY+1)){curY++;dropTimer=0;}e.preventDefault();}
      else if(e.key==='ArrowUp'||e.key==='w'){var rot=rotate(cur.shape);if(fits(rot,curX,curY))cur.shape=rot;e.preventDefault();}
      else if(e.key===' '){while(fits(cur.shape,curX,curY+1))curY++;place();dropTimer=0;e.preventDefault();}
    };
    window.addEventListener('keydown',keyH2);
    restBtn.addEventListener('click',function(){init2();});
    return{destroy:function(){cancelAnimationFrame(raf2);ro2.disconnect();window.removeEventListener('keydown',keyH2);}};
  }

  function mountMemory(container) {
    var dark = getDark();
    baseContainer(container, dark?'#1e1a2e':'#fdf6ec');
    cssObj(container,{padding:'10px'});

    var COLS4=6,ROWS4=5,TOTAL=COLS4*ROWS4;
    var ICONS4=['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞'];
    var cards4,flipped,matched4,moves4,timerID4,elapsed4,lock4;

    var tc=dark?'rgba(255,255,255,.5)':'rgba(0,0,0,.5)';
    var movesEl=makeLabel('步数: 0',tc), matchEl=makeLabel('0/'+TOTAL/2,tc), timeEl4=makeLabel('⏱ 0s',tc);
    var restBtn4=makeBtn('重来',dark);
    makeHdr(container,[movesEl,matchEl,timeEl4,restBtn4],dark);

    var boardWrap4=div({flex:'1',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'});
    container.appendChild(boardWrap4);
    var boardEl4=div({display:'grid',gap:'6px'});
    boardWrap4.appendChild(boardEl4);

    function initGame4(){
      clearInterval(timerID4);elapsed4=0;timeEl4.textContent='⏱ 0s';
      var pool=ICONS4.slice(0,TOTAL/2),deck=[];
      pool.forEach(function(ic){deck.push(ic,ic);});
      for(var i=deck.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=deck[i];deck[i]=deck[j];deck[j]=t;}
      cards4=deck.map(function(ic){return{icon:ic,face:false,matched:false};});
      flipped=[];matched4=0;moves4=0;lock4=false;
      movesEl.textContent='步数: 0';matchEl.textContent='0/'+TOTAL/2;
      window.__tbRuntime&&window.__tbRuntime.setScore('');
      render4();
    }
    function calcCell4(){var ww=boardWrap4.clientWidth||500,wh=boardWrap4.clientHeight||400;return Math.max(40,Math.min(Math.floor((ww-(COLS4-1)*6)/COLS4),Math.floor((wh-(ROWS4-1)*6)/ROWS4),72));}
    function render4(){
      var cs=calcCell4();
      boardEl4.style.gridTemplateColumns='repeat('+COLS4+','+cs+'px)';
      boardEl4.innerHTML='';
      var cardBg=dark?'#2e2e3e':'#fff';
      var cardBdr=dark?'rgba(255,255,255,.1)':'rgba(0,0,0,.1)';
      cards4.forEach(function(card,idx){
        var cell=div({width:cs+'px',height:cs+'px',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.round(cs*.52)+'px',cursor:card.matched?'default':'pointer',transition:'background .15s,transform .15s',boxSizing:'border-box',userSelect:'none',background:card.face||card.matched?cardBg:'linear-gradient(135deg,#667eea,#764ba2)',border:card.face||card.matched?'.5px solid '+cardBdr:'none',transform:card.face||card.matched?'scale(1)':'scale(0.96)',boxShadow:card.matched?'0 0 0 2px #4CAF50':card.face?'0 2px 8px rgba(0,0,0,.15)':'none'});
        cell.textContent=(card.face||card.matched)?card.icon:'';
        if(!card.matched&&!lock4){
          cell.addEventListener('click',function(){
            if(card.face||lock4)return;
            if(elapsed4===0&&flipped.length===0){timerID4=setInterval(function(){elapsed4++;timeEl4.textContent='⏱ '+elapsed4+'s';},1000);}
            card.face=true;flipped.push(idx);render4();
            if(flipped.length===2){
              moves4++;movesEl.textContent='步数: '+moves4;lock4=true;
              var a=cards4[flipped[0]],b=cards4[flipped[1]];
              if(a.icon===b.icon){a.matched=b.matched=true;matched4++;matchEl.textContent=matched4+'/'+TOTAL/2;flipped=[];lock4=false;if(matched4===TOTAL/2){clearInterval(timerID4);window.__tbRuntime&&window.__tbRuntime.setScore('通关! '+moves4+'步 '+elapsed4+'s');}render4();}
              else{setTimeout(function(){a.face=b.face=false;flipped=[];lock4=false;render4();},900);}
            }
          });
          if(!card.face){cell.addEventListener('mouseenter',function(){if(!lock4)cell.style.transform='scale(1.05)';});cell.addEventListener('mouseleave',function(){cell.style.transform='scale(0.96)';});}
        }
        boardEl4.appendChild(cell);
      });
    }
    restBtn4.addEventListener('click',initGame4);
    initGame4();
    return{destroy:function(){clearInterval(timerID4);}};
  }

  function mountBreakout(container) {
    var dark = getDark();
    baseContainer(container, '#10131c');

    var scoreEl = makeLabel('分数: 0', 'rgba(255,255,255,.6)');
    var stageEl = makeLabel('关卡 1', 'rgba(130,200,255,.8)');
    var livesEl = makeLabel('♥♥♥', 'rgba(255,120,120,.8)');
    var hintEl  = makeLabel('← → / 鼠标  空格发球', 'rgba(255,255,255,.25)');
    var restBtn = makeBtn('重来', true);
    makeHdr(container, [scoreEl, stageEl, livesEl, hintEl, restBtn], true);

    var wrap = div({ flex:'1', overflow:'hidden', position:'relative' });
    container.appendChild(wrap);
    var canvas = document.createElement('canvas');
    cssObj(canvas, { display:'block', width:'100%', height:'100%' });
    wrap.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var W, H, paddle, ball, bricks, drops, score, lives, stage, launched, dead, won, raf, widenT;
    var HP_COLORS = ['#2196F3','#4CAF50','#FFD700','#FF9800','#FF6B6B'];
    var DROP_TYPES = [
      { key:'wide',  color:'#42A5F5', char:'W' },
      { key:'life',  color:'#4CAF50', char:'+' },
      { key:'score', color:'#FFD700', char:'$' }
    ];
    var DROP_CHANCE = 0.1;
    var keys = {};

    function recalc() { W = wrap.clientWidth || 340; H = wrap.clientHeight || 400; canvas.width = W; canvas.height = H; }
    function ballSpeed() { return Math.max(4, H / 90) + (stage - 1) * 0.9; }
    function buildBricks() {
      bricks = [];
      var cols = 7, pad = 6;
      var rows = Math.min(9, 4 + stage);
      var maxHp = Math.min(HP_COLORS.length, 1 + Math.floor(stage / 2));
      var bw = (W - pad * (cols + 1)) / cols, bh = 16;
      for (var r = 0; r < rows; r++)
        for (var c = 0; c < cols; c++) {
          var hp = Math.max(1, maxHp - Math.floor(r / 2));
          bricks.push({ x: pad + c * (bw + pad), y: 44 + r * (bh + pad), w: bw, h: bh, hp: hp, alive: true });
        }
    }
    function baseWidth() { return Math.max(54, W * 0.18 - (stage - 1) * 4); }
    function resetBall() {
      paddle.w = baseWidth(); widenT = 0;
      ball = { x: W / 2, y: H - 44, r: 7, dx: 0, dy: 0, speed: ballSpeed() };
      launched = false;
    }
    function init() {
      recalc();
      paddle = { w: 0, h: 12, x: W / 2, y: H - 28 };
      stage = 1; score = 0; lives = 3; dead = false; won = false; drops = [];
      buildBricks(); resetBall();
      scoreEl.textContent = '分数: 0'; stageEl.textContent = '关卡 1'; livesEl.textContent = '♥♥♥';
    }
    function nextStage() {
      stage++; drops = [];
      stageEl.textContent = '关卡 ' + stage;
      buildBricks(); resetBall();
      window.__tbRuntime && window.__tbRuntime.setScore('关卡 ' + stage + '  分数 ' + score);
    }
    function launch() { if (launched || dead || won) return; launched = true; ball.dx = ball.speed * (Math.random() > 0.5 ? 0.6 : -0.6); ball.dy = -ball.speed; }
    function loseLife() {
      lives--; livesEl.textContent = lives > 0 ? '♥'.repeat(lives) : '';
      if (lives <= 0) { dead = true; return; }
      resetBall();
    }
    function spawnDrop(bx, by) {
      if (Math.random() > DROP_CHANCE) return;
      var t = DROP_TYPES[Math.floor(Math.random() * DROP_TYPES.length)];
      drops.push({ x: bx, y: by, vy: 2.4, type: t });
    }
    function applyDrop(t) {
      if (t.key === 'wide') { paddle.w = Math.min(W * 0.42, baseWidth() * 1.7); widenT = 480; }
      else if (t.key === 'life') { lives = Math.min(5, lives + 1); livesEl.textContent = '♥'.repeat(lives); }
      else if (t.key === 'score') { score += 50; }
      scoreEl.textContent = '分数: ' + score;
      window.__tbRuntime && window.__tbRuntime.setScore('分数 ' + score);
    }
    function update() {
      if (dead || won) return;
      if (keys.left)  paddle.x -= 7;
      if (keys.right) paddle.x += 7;
      paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, paddle.x));
      if (widenT > 0) { widenT--; if (widenT === 0) paddle.w = baseWidth(); }

      if (!launched) { ball.x = paddle.x; ball.y = paddle.y - 14; }
      else {
        ball.x += ball.dx; ball.y += ball.dy;
        if (ball.x - ball.r < 0) { ball.x = ball.r; ball.dx *= -1; }
        if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.dx *= -1; }
        if (ball.y - ball.r < 0) { ball.y = ball.r; ball.dy *= -1; }
        if (ball.y - ball.r > H) { loseLife(); }
        else {
          if (ball.dy > 0 && ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 8 &&
              ball.x >= paddle.x - paddle.w / 2 && ball.x <= paddle.x + paddle.w / 2) {
            ball.dy = -Math.abs(ball.dy);
            ball.dx = ((ball.x - paddle.x) / (paddle.w / 2)) * ball.speed;
          }
          for (var i = 0; i < bricks.length; i++) {
            var b = bricks[i];
            if (!b.alive) continue;
            if (ball.x + ball.r > b.x && ball.x - ball.r < b.x + b.w &&
                ball.y + ball.r > b.y && ball.y - ball.r < b.y + b.h) {
              b.hp--; ball.dy *= -1; score += 10;
              if (b.hp <= 0) { b.alive = false; spawnDrop(b.x + b.w / 2, b.y + b.h / 2); }
              scoreEl.textContent = '分数: ' + score;
              window.__tbRuntime && window.__tbRuntime.setScore('分数 ' + score);
              break;
            }
          }
          if (bricks.every(function (b) { return !b.alive; })) { nextStage(); }
        }
      }

      for (var d = drops.length - 1; d >= 0; d--) {
        var dp = drops[d]; dp.y += dp.vy;
        if (dp.y > H + 20) { drops.splice(d, 1); continue; }
        if (dp.y + 8 >= paddle.y && dp.y - 8 <= paddle.y + paddle.h &&
            dp.x >= paddle.x - paddle.w / 2 && dp.x <= paddle.x + paddle.w / 2) {
          applyDrop(dp.type); drops.splice(d, 1);
        }
      }
    }
    function draw() {
      ctx.fillStyle = '#10131c'; ctx.fillRect(0, 0, W, H);
      bricks.forEach(function (b) {
        if (!b.alive) return;
        ctx.fillStyle = HP_COLORS[Math.min(HP_COLORS.length - 1, b.hp - 1)];
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(b.x, b.y, b.w, b.h, 4) : ctx.rect(b.x, b.y, b.w, b.h); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(b.x, b.y, b.w, 3);
        if (b.hp > 1) { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.font = 'bold 10px ui-sans-serif'; ctx.textAlign = 'center'; ctx.fillText(b.hp, b.x + b.w / 2, b.y + b.h - 4); ctx.textAlign = 'left'; }
      });
      drops.forEach(function (dp) {
        ctx.fillStyle = dp.type.color;
        ctx.beginPath(); ctx.arc(dp.x, dp.y, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10131c'; ctx.font = 'bold 11px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(dp.type.char, dp.x, dp.y + 4); ctx.textAlign = 'left';
      });
      ctx.fillStyle = widenT > 0 ? '#80D8FF' : '#4FC3F7';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h, 6) : ctx.rect(paddle.x - paddle.w / 2, paddle.y, paddle.w, paddle.h); ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2); ctx.fill();

      if (!launched && !dead && !won) {
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = '13px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('点击或按空格发球', W / 2, H / 2); ctx.textAlign = 'left';
      }
      if (dead) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FF6B6B'; ctx.font = 'bold 24px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('Game Over', W / 2, H / 2 - 16);
        ctx.fillStyle = '#fff'; ctx.font = '14px ui-sans-serif';
        ctx.fillText('关卡 ' + stage + '  分数 ' + score, W / 2, H / 2 + 10);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '12px ui-sans-serif';
        ctx.fillText('按 R 重新开始', W / 2, H / 2 + 34); ctx.textAlign = 'left';
      }
    }
    function loop() { raf = requestAnimationFrame(loop); update(); draw(); }

    var ro = new ResizeObserver(function () { recalc(); buildBricks(); if (!launched) resetBall(); });
    ro.observe(wrap);
    init(); loop();

    var keyH = function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
      else if (e.key === ' ') { launch(); e.preventDefault(); }
      else if ((e.key === 'r' || e.key === 'R') && dead) { init(); }
    };
    var keyU = function (e) { if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false; };
    var moveH = function (e) { var rect = canvas.getBoundingClientRect(); paddle.x = Math.max(paddle.w / 2, Math.min(W - paddle.w / 2, e.clientX - rect.left)); };
    var clickH = function () { if (dead) init(); else launch(); };
    window.addEventListener('keydown', keyH);
    window.addEventListener('keyup', keyU);
    wrap.addEventListener('mousemove', moveH);
    wrap.addEventListener('click', clickH);
    return { destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keyH); window.removeEventListener('keyup', keyU); } };
  }

  function mountTower(container) {
    var dark = getDark();
    baseContainer(container, '#141b2e');

    var floorEl = makeLabel('第 0 层', 'rgba(255,255,255,.7)');
    var bestEl  = makeLabel('最高: 0', 'rgba(255,215,0,.7)');
    var hintEl  = makeLabel('← → 移动  自动弹跳', 'rgba(255,255,255,.25)');
    var restBtn = makeBtn('重来', true);
    makeHdr(container, [floorEl, bestEl, hintEl, restBtn], true);

    var wrap = div({ flex:'1', overflow:'hidden', position:'relative' });
    container.appendChild(wrap);
    var canvas = document.createElement('canvas');
    cssObj(canvas, { display:'block', width:'100%', height:'100%' });
    wrap.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var W, H, player, platforms, floor, best = 0, camY, dead, won, raf, nextId;
    var keys = {};
    var GRAV = 0.45, JUMP = -12, PW = 26, PH = 30, PLAT_H = 12, GAP = 72;

    function recalc() { W = wrap.clientWidth || 340; H = wrap.clientHeight || 400; canvas.width = W; canvas.height = H; }
    function platWidth(idx) { return Math.max(48, W * 0.34 - Math.min(idx, 60) * 0.8); }
    function makePlatform(idx) {
      var pw = platWidth(idx);
      return { x: Math.random() * (W - pw), y: -idx * GAP, w: pw, idx: idx };
    }
    function init() {
      recalc();
      platforms = [];
      platforms.push({ x: W / 2 - W * 0.22, y: 0, w: W * 0.44, idx: 0 });
      nextId = 1;
      while (platforms[platforms.length - 1].y > -H - GAP * 2) platforms.push(makePlatform(nextId++));
      player = { x: W / 2 - PW / 2, y: -PH, vx: 0, vy: JUMP, cur: 0 };
      floor = 0; dead = false; won = false;
      camY = player.y - H * 0.6;
    }
    function update() {
      if (dead || won) return;
      if (keys.left)  player.vx = -5.5;
      else if (keys.right) player.vx = 5.5;
      else player.vx *= 0.8;

      player.x += player.vx;
      if (player.x + PW < 0) player.x = W;
      else if (player.x > W) player.x = -PW;

      player.vy += GRAV;
      player.y += player.vy;

      if (player.vy > 0) {
        for (var i = 0; i < platforms.length; i++) {
          var p = platforms[i];
          if (player.x + PW > p.x && player.x < p.x + p.w &&
              player.y + PH >= p.y && player.y + PH <= p.y + PLAT_H + player.vy + 1 &&
              player.y + PH - player.vy <= p.y + 1) {
            player.y = p.y - PH; player.vy = JUMP;
            if (p.idx > player.cur) {
              player.cur = p.idx; floor = p.idx;
              floorEl.textContent = '第 ' + floor + ' 层';
              if (floor > best) { best = floor; bestEl.textContent = '最高: ' + best; }
              window.__tbRuntime && window.__tbRuntime.setScore('第 ' + floor + ' 层');
              if (floor >= 100) won = true;
            }
            break;
          }
        }
      }

      var targetCam = player.y - H * 0.6;
      if (targetCam < camY) camY = targetCam;

      while (platforms.length && platforms[0].y - camY > H + GAP) platforms.shift();
      var topY = platforms.length ? platforms[platforms.length - 1].y : camY;
      while (topY > camY - GAP * 2) {
        var np = makePlatform(nextId++);
        platforms.push(np);
        topY = np.y;
      }

      if (player.y - camY > H + 40) dead = true;
    }
    function draw() {
      ctx.fillStyle = '#141b2e'; ctx.fillRect(0, 0, W, H);
      platforms.forEach(function (p) {
        var sy = p.y - camY;
        if (sy < -30 || sy > H + 30) return;
        ctx.fillStyle = p.idx === 0 ? '#4CAF50' : (p.idx % 10 === 0 ? '#FFD700' : '#5C6BC0');
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x, sy, p.w, PLAT_H, 6) : ctx.rect(p.x, sy, p.w, PLAT_H); ctx.fill();
        if (p.idx % 10 === 0 && p.idx > 0) {
          ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.font = '10px ui-sans-serif'; ctx.textAlign = 'center';
          ctx.fillText(p.idx + '层', p.x + p.w / 2, sy + 9); ctx.textAlign = 'left';
        }
      });
      var py = player.y - camY;
      ctx.fillStyle = '#FF7043';
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(player.x, py, PW, PH, 6) : ctx.rect(player.x, py, PW, PH); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(player.x + 8, py + 11, 3, 0, Math.PI * 2); ctx.arc(player.x + 18, py + 11, 3, 0, Math.PI * 2); ctx.fill();

      if (dead || won) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = won ? '#FFD700' : '#FF6B6B';
        ctx.font = 'bold 24px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(won ? '登顶 100 层!' : '掉下去了', W / 2, H / 2 - 16);
        ctx.fillStyle = '#fff'; ctx.font = '14px ui-sans-serif';
        ctx.fillText('到达第 ' + floor + ' 层', W / 2, H / 2 + 10);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '12px ui-sans-serif';
        ctx.fillText('按 R 重新开始', W / 2, H / 2 + 34); ctx.textAlign = 'left';
      }
    }
    function loop() { raf = requestAnimationFrame(loop); update(); draw(); }

    var ro = new ResizeObserver(function () { recalc(); });
    ro.observe(wrap);
    init(); loop();

    var keyH = function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
      else if ((e.key === 'r' || e.key === 'R') && (dead || won)) { init(); }
    };
    var keyU = function (e) { if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false; if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false; };
    window.addEventListener('keydown', keyH);
    window.addEventListener('keyup', keyU);
    restBtn.addEventListener('click', function () { init(); });
    return { destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keyH); window.removeEventListener('keyup', keyU); } };
  }

  function mountDodge(container) {
    var dark = getDark();
    baseContainer(container, '#222');

    var scoreEl = makeLabel('分数: 0', 'rgba(255,255,255,.7)');
    var bestEl  = makeLabel('最佳: 0', 'rgba(255,215,0,.7)');
    var hintEl  = makeLabel('← → / A D 左右移动', 'rgba(255,255,255,.25)');
    var restBtn = makeBtn('重来', true);
    makeHdr(container, [scoreEl, bestEl, hintEl, restBtn], true);

    var wrap = div({ flex:'1', overflow:'hidden', position:'relative' });
    container.appendChild(wrap);
    var canvas = document.createElement('canvas');
    cssObj(canvas, { display:'block', width:'100%', height:'100%' });
    wrap.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var W, H, ROAD_X, ROAD_W, CAR_W, CAR_H;
    var player, enemies, score, best = 0, speed, baseSpeed, spawnGap, spawnTimer, lineOff, dead, raf;
    var keys = {};
    var ENEMY_COLORS = ['#E53935','#FB8C00','#FDD835','#8E24AA','#43A047','#00ACC1'];

    function recalc() {
      W = wrap.clientWidth || 340; H = wrap.clientHeight || 400;
      canvas.width = W; canvas.height = H;
      ROAD_W = Math.min(W * 0.8, 360);
      ROAD_X = (W - ROAD_W) / 2;
      CAR_W = Math.max(28, ROAD_W * 0.16);
      CAR_H = CAR_W * 1.7;
    }
    function init() {
      recalc();
      player = { x: W / 2 - CAR_W / 2, y: H - CAR_H - 24, vx: 0 };
      enemies = [];
      score = 0; baseSpeed = Math.max(3, H / 130); speed = baseSpeed;
      spawnGap = 90; spawnTimer = 0; lineOff = 0; dead = false;
      scoreEl.textContent = '分数: 0';
    }
    function canSpawn(laneX) {
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].y < CAR_H * 1.4 && Math.abs(enemies[i].x - laneX) < CAR_W * 1.2) return false;
      }
      return true;
    }
    function spawn() {
      var tries = 6;
      while (tries-- > 0) {
        var x = ROAD_X + Math.random() * (ROAD_W - CAR_W);
        if (canSpawn(x)) {
          enemies.push({ x: x, y: -CAR_H, color: ENEMY_COLORS[Math.floor(Math.random() * ENEMY_COLORS.length)] });
          return;
        }
      }
    }
    function rectHit(a, b) {
      return a.x < b.x + CAR_W && a.x + CAR_W > b.x && a.y < b.y + CAR_H && a.y + CAR_H > b.y;
    }
    function update() {
      if (dead) return;
      if (keys.left) player.vx = -6;
      else if (keys.right) player.vx = 6;
      else player.vx *= 0.75;
      player.x += player.vx;
      if (player.x < ROAD_X) { player.x = ROAD_X; player.vx = 0; }
      if (player.x + CAR_W > ROAD_X + ROAD_W) { player.x = ROAD_X + ROAD_W - CAR_W; player.vx = 0; }

      score += 1;
      scoreEl.textContent = '分数: ' + score;
      speed = baseSpeed + Math.floor(score / 400) * 0.8;
      lineOff = (lineOff + speed) % 60;

      spawnTimer += 1;
      var curGap = Math.max(42, spawnGap - Math.floor(score / 400) * 6);
      if (spawnTimer >= curGap) { spawnTimer = 0; spawn(); }

      for (var i = enemies.length - 1; i >= 0; i--) {
        var e = enemies[i];
        e.y += speed;
        if (e.y > H + CAR_H) { enemies.splice(i, 1); continue; }
        if (rectHit(player, e)) {
          dead = true;
          if (score > best) { best = score; bestEl.textContent = '最佳: ' + best; }
          window.__tbRuntime && window.__tbRuntime.setScore('分数 ' + score);
        }
      }
    }
    function drawCar(x, y, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(x, y, CAR_W, CAR_H, 6) : ctx.rect(x, y, CAR_W, CAR_H); ctx.fill();
      ctx.fillStyle = 'rgba(180,225,255,.85)';
      ctx.fillRect(x + CAR_W * 0.16, y + CAR_H * 0.14, CAR_W * 0.68, CAR_H * 0.2);
      ctx.fillRect(x + CAR_W * 0.16, y + CAR_H * 0.62, CAR_W * 0.68, CAR_H * 0.2);
      ctx.fillStyle = '#111';
      ctx.fillRect(x - 3, y + CAR_H * 0.16, 4, CAR_H * 0.16);
      ctx.fillRect(x + CAR_W - 1, y + CAR_H * 0.16, 4, CAR_H * 0.16);
      ctx.fillRect(x - 3, y + CAR_H * 0.66, 4, CAR_H * 0.16);
      ctx.fillRect(x + CAR_W - 1, y + CAR_H * 0.66, 4, CAR_H * 0.16);
    }
    function draw() {
      ctx.fillStyle = '#3a5a3a'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#37474F'; ctx.fillRect(ROAD_X, 0, ROAD_W, H);
      ctx.fillStyle = '#FFEB3B';
      ctx.fillRect(ROAD_X - 4, 0, 4, H);
      ctx.fillRect(ROAD_X + ROAD_W, 0, 4, H);

      ctx.fillStyle = 'rgba(255,255,255,.7)';
      var midX = ROAD_X + ROAD_W / 2 - 3;
      for (var y = -60 + lineOff; y < H; y += 60) {
        ctx.fillRect(midX, y, 6, 32);
      }
      var qx1 = ROAD_X + ROAD_W * 0.25 - 2, qx2 = ROAD_X + ROAD_W * 0.75 - 2;
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      for (var y2 = -60 + lineOff; y2 < H; y2 += 60) {
        ctx.fillRect(qx1, y2, 4, 28);
        ctx.fillRect(qx2, y2, 4, 28);
      }

      enemies.forEach(function (e) { drawCar(e.x, e.y, e.color); });
      drawCar(player.x, player.y, '#1E88E5');

      if (dead) {
        ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#FF6B6B'; ctx.font = 'bold 24px ui-sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('撞车了!', W / 2, H / 2 - 16);
        ctx.fillStyle = '#fff'; ctx.font = '14px ui-sans-serif';
        ctx.fillText('分数: ' + score, W / 2, H / 2 + 10);
        ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = '12px ui-sans-serif';
        ctx.fillText('按 R 重新开始', W / 2, H / 2 + 34); ctx.textAlign = 'left';
      }
    }
    function loop() { raf = requestAnimationFrame(loop); update(); draw(); }

    var ro = new ResizeObserver(function () {
      var ratioX = player ? (player.x - ROAD_X) / ROAD_W : 0.5;
      recalc();
      if (player) { player.x = ROAD_X + ratioX * ROAD_W; player.y = H - CAR_H - 24; }
    });
    ro.observe(wrap);
    init(); loop();

    var keyH = function (e) {
      if (dead) { if (e.key === 'r' || e.key === 'R') init(); return; }
      if (e.key === 'ArrowLeft' || e.key === 'a') { keys.left = true; e.preventDefault(); }
      else if (e.key === 'ArrowRight' || e.key === 'd') { keys.right = true; e.preventDefault(); }
    };
    var keyU = function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    };
    window.addEventListener('keydown', keyH);
    window.addEventListener('keyup', keyU);
    restBtn.addEventListener('click', function () { init(); });
    return { destroy: function () { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('keydown', keyH); window.removeEventListener('keyup', keyU); } };
  }

  function mountSudoku(container) {
    var dark = getDark();
    baseContainer(container, dark ? '#1e1e28' : '#fdfdf8');
    cssObj(container, { padding: '10px' });

    var tc = dark ? 'rgba(255,255,255,.6)' : 'rgba(0,0,0,.6)';
    var statusEl = makeLabel('选格子后点数字', tc);
    var diffBtn  = makeBtn('难度: 简单', dark);
    var checkBtn = makeBtn('检查', dark);
    var restBtn  = makeBtn('新局', dark);
    makeHdr(container, [statusEl, diffBtn, checkBtn, restBtn], dark);

    var area = div({ flex:'1', overflow:'auto', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start', gap:'10px', padding:'10px 8px', boxSizing:'border-box' });
    container.appendChild(area);
    var gridWrap = div({ display:'grid', gridTemplateColumns:'repeat(9,1fr)', gap:'0', flexShrink:'0' });
    cssObj(gridWrap, { border:'2px solid ' + (dark ? '#888' : '#333'), background: dark ? '#888' : '#333' });
    area.appendChild(gridWrap);
    var padWrap = div({ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'6px', width:'100%', maxWidth:'320px', flexShrink:'0', paddingBottom:'4px' });
    area.appendChild(padWrap);

    var DIFFS = [['简单', 40], ['中等', 50], ['困难', 56]];
    var diffIdx = 0;
    var solution, puzzle, given, selected = -1;

    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    function okAt(g, r, c, n) {
      for (var i = 0; i < 9; i++) if (g[r][i] === n || g[i][c] === n) return false;
      var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) if (g[br + a][bc + b] === n) return false;
      return true;
    }
    function genSolved() {
      var g = Array.from({ length: 9 }, function () { return Array(9).fill(0); });
      (function fill(pos) {
        if (pos === 81) return true;
        var r = Math.floor(pos / 9), c = pos % 9;
        var nums = shuffle([1,2,3,4,5,6,7,8,9]);
        for (var k = 0; k < 9; k++) { if (okAt(g, r, c, nums[k])) { g[r][c] = nums[k]; if (fill(pos + 1)) return true; g[r][c] = 0; } }
        return false;
      })(0);
      return g;
    }
    function countSolutions(g, limit) {
      var count = 0;
      (function solve() {
        if (count >= limit) return;
        var r = -1, c = -1;
        for (var i = 0; i < 81 && r < 0; i++) if (g[Math.floor(i / 9)][i % 9] === 0) { r = Math.floor(i / 9); c = i % 9; }
        if (r < 0) { count++; return; }
        for (var n = 1; n <= 9; n++) { if (okAt(g, r, c, n)) { g[r][c] = n; solve(); g[r][c] = 0; if (count >= limit) return; } }
      })();
      return count;
    }
    function newGame() {
      solution = genSolved();
      puzzle = solution.map(function (row) { return row.slice(); });
      var target = DIFFS[diffIdx][1];
      var order = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }));
      var removed = 0;
      for (var oi = 0; oi < order.length && removed < target; oi++) {
        var idx = order[oi], r = Math.floor(idx / 9), c = idx % 9;
        if (puzzle[r][c] === 0) continue;
        var backup = puzzle[r][c];
        puzzle[r][c] = 0;
        var probe = puzzle.map(function (row) { return row.slice(); });
        if (countSolutions(probe, 2) !== 1) { puzzle[r][c] = backup; }
        else { removed++; }
      }
      given = puzzle.map(function (row) { return row.map(function (v) { return v !== 0; }); });
      selected = -1;
      statusEl.textContent = '选格子后点数字';
      window.__tbRuntime && window.__tbRuntime.setScore('');
      render();
    }
    function conflict(r, c) {
      var v = puzzle[r][c];
      if (!v) return false;
      for (var i = 0; i < 9; i++) {
        if (i !== c && puzzle[r][i] === v) return true;
        if (i !== r && puzzle[i][c] === v) return true;
      }
      var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (var a = 0; a < 3; a++) for (var b = 0; b < 3; b++) { var rr = br + a, cc = bc + b; if ((rr !== r || cc !== c) && puzzle[rr][cc] === v) return true; }
      return false;
    }
    function cellSize() {
      var availW = (area.clientWidth || 360) - 16;
      var availH = (area.clientHeight || 420) - 10 - 96 - 10;
      var byW = Math.floor(availW / 9);
      var byH = Math.floor(availH / 9);
      return Math.max(20, Math.min(40, byW, byH));
    }
    function render() {
      gridWrap.innerHTML = '';
      var size = cellSize();
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) {
        (function (r, c) {
          var idx = r * 9 + c, v = puzzle[r][c], bad = conflict(r, c);
          var cell = div({
            width: size + 'px', height: size + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: Math.round(size * 0.5) + 'px', fontWeight: given[r][c] ? '700' : '400',
            cursor: given[r][c] ? 'default' : 'pointer', userSelect: 'none', boxSizing: 'border-box',
            background: selected === idx ? (dark ? '#3a4a6a' : '#cfe3ff') : (bad ? (dark ? '#5a2a2a' : '#ffd5d5') : (dark ? '#26262f' : '#fff')),
            color: bad ? '#e53935' : (given[r][c] ? (dark ? '#fff' : '#000') : (dark ? '#7FB4FF' : '#1565C0')),
            borderRight: '.5px solid ' + (c % 3 === 2 ? (dark ? '#888' : '#333') : (dark ? '#3a3a44' : '#ddd')),
            borderBottom: '.5px solid ' + (r % 3 === 2 ? (dark ? '#888' : '#333') : (dark ? '#3a3a44' : '#ddd')),
          });
          cell.textContent = v || '';
          if (!given[r][c]) cell.addEventListener('click', function () { selected = idx; render(); });
          gridWrap.appendChild(cell);
        })(r, c);
      }
      padWrap.innerHTML = '';
      for (var n = 1; n <= 9; n++) {
        (function (n) {
          var b = makeBtn(String(n), dark);
          cssObj(b, { height: '40px', fontSize: '18px' });
          b.addEventListener('click', function () { if (selected < 0) return; var r = Math.floor(selected / 9), c = selected % 9; if (given[r][c]) return; puzzle[r][c] = n; checkWin(); render(); });
          padWrap.appendChild(b);
        })(n);
      }
      var er = makeBtn('清除', dark);
      cssObj(er, { height: '40px' });
      er.addEventListener('click', function () { if (selected < 0) return; var r = Math.floor(selected / 9), c = selected % 9; if (given[r][c]) return; puzzle[r][c] = 0; render(); });
      padWrap.appendChild(er);
    }
    function checkWin() {
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) if (puzzle[r][c] !== solution[r][c]) return;
      statusEl.textContent = '🎉 完成! 全部正确';
      window.__tbRuntime && window.__tbRuntime.setScore('数独通关!');
    }
    function check() {
      var full = true, correct = true;
      for (var r = 0; r < 9; r++) for (var c = 0; c < 9; c++) { if (puzzle[r][c] === 0) full = false; else if (puzzle[r][c] !== solution[r][c]) correct = false; }
      statusEl.textContent = !full ? '还有空格未填' : (correct ? '🎉 完成! 全部正确' : '有错误，再检查一下');
    }
    diffBtn.addEventListener('click', function () { diffIdx = (diffIdx + 1) % DIFFS.length; diffBtn.textContent = '难度: ' + DIFFS[diffIdx][0]; newGame(); });
    checkBtn.addEventListener('click', check);
    restBtn.addEventListener('click', newGame);

    var ro = new ResizeObserver(function () { render(); });
    ro.observe(area);
    newGame();
    return { destroy: function () { ro.disconnect(); } };
  }

  window.addEventListener('tb-theme-change', function(e) {
  });

  var EXT_GAMES=[
    {name:'ext-snake',    label:'贪吃蛇',      icon:'🐍',color:'#00AA90',desc:'经典贪吃',  controls:'方向键 / WASD',      builtin:false,mount:mountSnake   },
    {name:'ext-tetris',   label:'俄罗斯方块',   icon:'🟦',color:'#B481BB',desc:'方块堆叠',  controls:'方向键 / 空格硬降',  builtin:false,mount:mountTetris  },
    {name:'ext-memory',   label:'记忆翻牌',     icon:'🃏',color:'#E98B2A',desc:'翻牌配对',  controls:'点击翻牌配对',       builtin:false,mount:mountMemory  },
    {name:'ext-breakout', label:'打砖块', icon:'🧱',color:'#4FC3F7',desc:'弹球击砖',  controls:'← → / 鼠标  空格发球',builtin:false,mount:mountBreakout},
    {name:'ext-tower',    label:'涂鸦跳跃',     icon:'🏗️',color:'#FF7043',desc:'跳台登顶',  controls:'← → 自动弹跳',       builtin:false,mount:mountTower   },
    {name:'ext-dodge',    label:'公路赛车',       icon:'🚗',color:'#42A5F5',desc:'变道躲车',  controls:'← → / A D 变道',     builtin:false,mount:mountDodge   },
    {name:'ext-sudoku',   label:'数独',         icon:'🔢',color:'#26A69A',desc:'数字谜题',  controls:'点格子选数字',       builtin:false,mount:mountSudoku  },
  ];

  function registerAll(){
    EXT_GAMES.forEach(function(g){
      if(typeof window.__tbRegisterGame==='function') window.__tbRegisterGame(g.name,g);
    });
  }
  function waitForRuntime(){
    var rt=window.__tbRuntime;
    if(rt&&rt.ready){rt.ready.then(registerAll);return;}
    window.addEventListener('tb-skill:master-online',function wake(){
      window.removeEventListener('tb-skill:master-online',wake);
      waitForRuntime();
    });
  }
  function onDestroyAll(){
    window.removeEventListener('tb-skill:destroy-all',onDestroyAll);
    window.__tbExtGamesLoaded=false;
  }
  window.addEventListener('tb-skill:destroy-all',onDestroyAll);
  waitForRuntime();

})();