(async function __tabEvaluateScriptBridge() {
  const __tabScriptArgs = null;
  const __tabOriginalFunction = (
    async function run(args) {
      // ═══════════════════════════════════════════════════════════
      // 厦门大学 · 人生 K 线图 v7 — 模态弹窗 + 悬停高亮交互版
      // ═══════════════════════════════════════════════════════════
      // v7 变更：
      // - K线图从静态图片改为实时交互式Canvas
      // - 鼠标悬停K线：高亮发光 + 十字准星线 + 浮动Tooltip详情
      // - 改善视觉：渐变实体、阴影、平滑曲线、更好的配色
      // - 保留v6全部功能：模态弹窗、遮罩层、关闭按钮、ESC关闭
    
      const XMU_BLUE = '#1B3A7B';
      const XMU_GOLD = '#C4922E';
      const XMU_LIGHT = 'rgba(27,58,123,0.06)';
    
      const STAGE_NAMES = ['初运','二运','三运','四运','五运','六运','七运','八运','九运','十运'];
      const SHICHEN = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];
      const WUXING = ['木','火','土','金','水'];
      const XUELI = ['无','本科','硕士','博士'];
    
      const WUXING_PROFILE = {
        '木': { trait:'生发向上，坚韧不拔', tags:['务实','进取','有韧性'], direction:'创业、学术研究、教育',
          up:'如春木逢雨，生机勃发', mid:'如树木扎根，默默生长', down:'如冬日枯木，待春而生',
          peak:'这一年你的成长能量达到顶峰，如同春笋破土。适合：发起重要项目、拓展人脉圈',
          trough:'这一年你可能感到成长停滞，但树根正在深处延伸。建议：沉潜学习、锻炼身体',
          turn:'这一年是你人生的拐点，新旧交替之际。建议：拥抱变化、不要固守旧模式' },
        '火': { trait:'热情奔放，感染力强', tags:['活跃','创意','有领导力'], direction:'公关、传媒、艺术创作',
          up:'如夏日骄阳，光芒四射', mid:'如炭火温炖，厚积薄发', down:'如星火微光，守之不灭',
          peak:'这一年你的影响力最大化，聚光灯下尽显才华。适合：公开演讲、展示作品',
          trough:'这一年你可能感到被忽视，但星星之火可以燎原。建议：积蓄力量、低调行事',
          turn:'这一年你的热情方向可能发生转变。建议：重新审视激情所在、勇于转型' },
        '土': { trait:'厚重包容，稳如泰山', tags:['靠谱','耐心','有担当'], direction:'管理、金融、公共服务',
          up:'如沃土载物，厚德载物', mid:'如岩石风化，渐露峥嵘', down:'如贫瘠之地，需勤耕耘',
          peak:'这一年你的稳定性最强，是打持久战的好时机。适合：购置资产、深化专业',
          trough:'这一年你可能感到压力沉重，但泰山崩于前而不变色。建议：简化生活、专注核心',
          turn:'这一年你的根基可能需要重建。建议：检视核心价值观、该放手就放手' },
        '金': { trait:'刚毅果断，追求完美', tags:['敏锐','自律','有条理'], direction:'技术、法律、精密工程',
          up:'如百炼成钢，锋芒毕露', mid:'如金石之声，清越悠扬', down:'如锈铁需磨，去芜存菁',
          peak:'这一年你的判断力最敏锐，决策质量最高。适合：重大选择、签约合作',
          trough:'这一年你可能感到处处受阻，但真金不怕火炼。建议：复盘反思、打磨技能',
          turn:'这一年你的规则体系面临挑战。建议：打破旧框架、建立新秩序' },
        '水': { trait:'灵动深邃，善于变通', tags:['机智','洞察力强','适应力好'], direction:'投资、咨询、跨领域创新',
          up:'如江河奔腾，一往无前', mid:'如细水长流，润物无声', down:'如寒冰封冻，内蕴生机',
          peak:'这一年你的灵感最活跃，直觉准确度爆表。适合：创意工作、学习新技能',
          trough:'这一年你可能感到迷茫不定，但水至清则无鱼。建议：保持开放、多尝试小步实验',
          turn:'这一年你的适应性受到最大考验。建议：灵活应变、像水一样绕过障碍' }
      };
    
      const STAGE_THEMES = [
        { range:'0-9',   topic:'童蒙养正期', advice:'家庭熏陶是此生底色' },
        { range:'10-19', topic:'志学探索期', advice:'学业奠基的关键十年' },
        { range:'20-29', topic:'初入社会期', advice:'试错成本最低的阶段' },
        { range:'30-39', topic:'而立深耕期', advice:'事业方向基本定型' },
        { range:'40-49', topic:'不惑丰收期', advice:'前期积累开始兑现' },
        { range:'50-59', topic:'天命沉淀期', advice:'经验转化为智慧' },
        { range:'60-69', topic:'花甲安养期', advice:'关注健康与传承' },
        { range:'70-79', topic:'古稀回望期', advice:'精神富足胜过物质' },
        { range:'80-89', topic:'期颐静心期', advice:'顺其自然，享受天伦' },
        { range:'90-99', topic:'归真返璞期', advice:'人生圆满，无憾无悔' }
      ];
    
      const UNI_TREND_TEXT = {
        '\u2191': { generic:'运势逐年走高，越读越顺', 木:'如竹节拔节，年年高升', 火:'如火焰燎原，势不可挡',
          土:'如堆土成山，步步为营', 金:'如炼金提纯，愈磨愈亮', 水:'如汇流成河，后劲十足',
          advice_up:'珍惜当下，乘势而上，这是你求学的黄金窗口' },
        '\u2193': { generic:'入学时运势较高，后期需努力', 木:'如落叶归根，重在扎根', 火:'如残烛余晖，需添新油',
          土:'如水土流失，宜筑堤坝', 金:'如钝刀需磨，回归基础', 水:'如退潮见底，礁石自现',
          advice_down:'前期基础打得好，后期更多靠自律和坚持' },
        '\u2192': { generic:'起伏不定，考验适应力', 木:'如风中劲草，柔韧抗压', 火:'如忽明忽暗，学会调适',
          土:'如旱涝交替，修渠引水', 金:'如炉火温度，掌控节奏', 水:'如潮汐涨落，顺势而为',
          advice_mid:'起伏是常态，关键是低谷时不放弃，高峰时不骄傲' }
      };
    
      // ═══ RNG ═══
      function createRNG(seed) {
        let s = (seed % 2147483647 + 2147483647) % 2147483647;
        if (s === 0) s = 1;
        return function() { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
      }
    
      // ═══ 数据生成 ═══
      function generateKlineData(by, bm, bd, hr) {
        const seed = ((by*367+bm*31+bd+hr*10000)*48271)%2147483647;
        const rng = createRNG(seed);
        const data = [];
        let prevClose = 50;
        for (let age=0;age<80;age++) {
          const year=by+age, stage=Math.min(9,Math.floor(age/10));
          const sm=(stage%2===0?1:-1)*(1+stage*0.15);
          const bt=Math.sin(age*0.15+seed*0.001)*12;
          const noise=(rng()-0.5)*18;
          const sw=Math.cos((bm-1)/12*Math.PI*2)*3;
          let open=prevClose+(rng()-0.5)*6+bt*0.3;
          let close=open+sm*rng()*8+bt*0.4+noise+sw*0.2;
          const hlR=3+rng()*12;
          let high=Math.max(open,close)+rng()*hlR;
          let low=Math.min(open,close)-rng()*hlR;
          open=Math.max(5,Math.min(95,open)); close=Math.max(5,Math.min(95,close));
          high=Math.max(Math.max(open,close),Math.min(95,high));
          low=Math.min(Math.min(open,close),Math.max(5,low));
          data.push({age,year,open:Math.round(open*10)/10,close:Math.round(close*10)/10,
            high:Math.round(high*10)/10,low:Math.round(low*10)/10,stage});
          prevClose=close;
        }
        return data;
      }
    
      // ═══ 统计 ═══
      function calcStats(data,xueli){
        let pi=0,ti=0;
        for(let i=1;i<data.length;i++){
          if(data[i].close>data[pi].close)pi=i; if(data[i].close<data[ti].close)ti=i;
        }
        const sAvgs=[];
        for(let s=0;s<10;s++){
          const sl=data.filter(d=>d.stage===s);
          const avg=sl.reduce((s,d)=>s+d.close,0)/sl.length;
          sAvgs.push({stage:s,avg:Math.round(avg*10)/10});
        }
        sAvgs.sort((a,b)=>b.avg-a.avg);
        const best=sAvgs[0];
        const entryAge=parseInt(document.getElementById('xmu-entry')?.value)||18;
        const gradAge=parseInt(document.getElementById('xmu-grad')?.value)||(entryAge+4);
        const ua=Math.max(0,entryAge), ub=Math.min(79,Math.max(entryAge,gradAge));
        let us=null;
        if(xueli>0&&ub>=ua){
          const ud=data.slice(ua,ub+1);
          if(ud.length>0){
            const uAvg=ud.reduce((s,d)=>s+d.close,0)/ud.length;
            let upi=0;
            for(let i=1;i<ud.length;i++){if(ud[i].close>ud[upi].close)upi=i;}
            let tr='\u2192';
            if(ud.length>=2){const d=ud[ud.length-1].close-ud[0].close; tr=d>2?'\u2191':d<-2?'\u2193':'\u2192';}
            us={label:XUELI[xueli],avg:Math.round(uAvg*10)/10,peakAge:ua+upi,
              peakYear:ud[upi].year,peakScore:ud[upi].close,trend:tr};
          }
        }
        let tni=1;let md=0;
        for(let i=1;i<data.length;i++){const d=Math.abs(data[i].close-data[i-1].close);if(d>md){md=d;tni=i;}}
        return{peak:data[pi],trough:data[ti],bestStage:best,uniStat:us,turnYear:data[tni],stageAvgs:sAvgs};
      }
    
      // ═══ 评语生成 ═══
      function genCommentary(by,bm,bd,hr,xl,stats,kd){
        const seed=((by*367+bm*31+bd+hr*10000)*48271)%2147483647;
        const wx=WUXING[seed%5], p=WUXING_PROFILE[wx];
        const now=new Date(),cY=now.getFullYear(),cA=cY-by;
        const cData=cA>=0&&cA<80?kd[cA]:null;
        const srM={}; stats.stageAvgs.forEach((s,i)=>{srM[s.stage]=i+1;});
        const cS=cA>=0?Math.min(9,Math.floor(cA/10)):0;
        const cR=srM[cS]||5;
        const rT=(r)=>r<=3?'up':r<=7?'mid':'down';
        return{
          wuxing:wx, profile:p,
          personalityHTML:`<div style="margin-bottom:10px;padding:8px;background:linear-gradient(135deg,${XMU_LIGHT},rgba(196,146,46,0.05));border-radius:8px;border-left:3px solid ${XMU_GOLD};">
    <div style="font-weight:700;color:${XMU_BLUE};font-size:13px;margin-bottom:3px;">\uD83C\uDF3F 日主属【${wx}】· ${p.trait}</div>
    <div style="font-size:11px;color:#555;line-height:1.6;">性格关键词：<span style="color:${XMU_GOLD};font-weight:600">${p.tags.join(' · ')}</span><br>天赋方向：<span style="color:${XMU_BLUE};">${p.direction}</span></div></div>`,
          currentStageHTML:(()=>{
            const th=STAGE_THEMES[cS], tone=rT(cR);
            const sc=stats.stageAvgs.find(s=>s.stage===cS)?.avg||'?';
            return`<div style="margin-bottom:8px;padding:8px;background:#fafafa;border-radius:8px;border-left:3px solid ${XMU_BLUE};">
    <div style="font-weight:700;color:${XMU_BLUE};font-size:13px;">\uD83D\uDD2E 当前大运 · ${STAGE_NAMES[cS]}</div>
    <div style="font-size:10px;color:#888;margin-bottom:4px;">${th.range}岁 · ${th.topic}</div>
    <div style="font-size:11px;color:#444;line-height:1.6;">此阶段运势均分 <b>${sc}</b> 分，十大运中排名第 <b>${cR}/10</b>。<br>${p[tone]}。<br>\uD83D\uDCA1 <b>建议</b>：${th.advice}。</div></div>`;
          })(),
          uniHTML:(()=>{
            if(!stats.uniStat) return '';
            const u=stats.uniStat, tt=UNI_TREND_TEXT[u.trend];
            const tText=tt?tt[wx]||tt.generic:'';
            const advKey=u.trend==='\u2191'?'advice_up':u.trend==='\u2193'?'advice_down':'advice_mid';
            return`<div style="margin-bottom:8px;padding:8px;background:linear-gradient(135deg,${XMU_LIGHT},rgba(196,146,46,0.08));border-radius:8px;border-left:3px solid ${XMU_GOLD};">
    <div style="font-weight:700;color:${XMU_GOLD};font-size:13px;">\uD83C\uDF93 ${u.label}阶段走势</div>
    <div style="font-size:11px;color:#444;line-height:1.6;">
    \u2B50 均分 <b>${u.avg}</b> | 峰值 <b>${u.peakScore}</b> 分（${u.peakYear}年，${u.peakAge}岁）<br>
    走势判定：<b style="color:${u.trend==='\u2191'?'#16a34a':u.trend==='\u2193'?'#dc2626':'#d97706'}">${u.trend==='↑'?'上涨 ↗':u.trend==='↓'?'下跌 ↘':'震荡 ↔'}</b> ${tText}<br>
    <span style="color:${XMU_BLUE};font-style:italic">\uD83D\uDCA1 ${tt?tt[advKey]:''}</span></div></div>`;
          })(),
          yearHTML:(()=>{
            if(!cData) return '';
            const d=cData, dir=d.close>d.open?'up':'down';
            const tone=rT(cR);
            let msg='';
            if(d.high>=85) msg=p.peak;
            else if(d.low<=20) msg=p.trough;
            else if(Math.abs(d.close-d.open)<3) msg=p.turn;
            else msg=p[tone];
            return`<div style="padding:8px;background:#fff;border-radius:8px;border-left:3px solid ${dir==='up'?'#16a34a':'#dc2626'};">
    <div style="font-weight:700;color:${dir==='up'?'#16a34a':'#dc2626'};font-size:13px;">\uD83D\uDCC5 ${cY}年运势</div>
    <div style="font-size:11px;color:#444;line-height:1.6;">
    开盘<b>${d.open}</b> → 收盘<b>${d.close}</b> | 最高<b>${d.high}</b> 最低<b>${d.low}</b><br>
    ${msg}</div></div>`;
          })()
        };
      }
    
      // ═══ v7: 交互式K线绘制器（含悬停高亮） ═══
      function createInteractiveKLine(containerEl, data, xueli, entryAge, gradAge) {
        const W = Math.min(520, containerEl.clientWidth - 20 || 500);
        const H = 300;
    
        // 创建包装容器（相对定位，用于tooltip）
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'position:relative;display:inline-block;width:100%;max-width:'+W+'px;';
        containerEl.appendChild(wrapper);
    
        // Canvas
        const canvas = document.createElement('canvas');
        canvas.width = W * 2;  // Retina 2x
        canvas.height = H * 2;
        canvas.style.cssText = 'width:'+W+'px;height:'+H+'px;border-radius:8px;cursor:crosshair;display:block;background:#0f172a;';
        wrapper.appendChild(canvas);
    
        // Tooltip 元素
        const tooltip = document.createElement('div');
        tooltip.style.cssText = 'position:absolute;display:none;pointer-events:none;z-index:100;' +
          'background:linear-gradient(135deg,#1e293b,#0f172a);color:#f1f5f9;border-radius:10px;padding:10px 14px;' +
          'font-size:12px;line-height:1.7;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.08);' +
          'min-width:160px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;' +
          'transition:opacity 0.15s ease;opacity:0;';
        wrapper.appendChild(tooltip);
    
        const ctx = canvas.getContext('2d');
        ctx.scale(2, 2);  // Retina 缩放
    
        const padL = 48, padR = 16, padT = 16, padB = 28;
        const chartW = W - padL - padR;
        const chartH = H - padT - padB;
        const kW = Math.max(3, chartW / data.length - 0.5);
    
        // 预计算每根K线的屏幕坐标
        const klineCoords = data.map((d, i) => {
          const x = padL + (i + 0.5) * chartW / data.length;
          const yO = padT + chartH * (100 - d.open) / 90;
          const yC = padT + chartH * (100 - d.close) / 90;
          const yH = padT + chartH * (100 - d.high) / 90;
          const yL = padT + chartH * (100 - d.low) / 90;
          return { x, yO, yC, yH, yL, idx: i, data: d };
        });
    
        let hoverIdx = -1;
    
        function draw(hoverIndex) {
          ctx.clearRect(0, 0, W, H);
    
          // 深色背景渐变
          const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
          bgGrad.addColorStop(0, '#0c1222');
          bgGrad.addColorStop(1, '#161f35');
          ctx.fillStyle = bgGrad;
          ctx.fillRect(0, 0, W, H);
    
          // 网格线
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.lineWidth = 0.5;
          for (let i = 0; i <= 5; i++) {
            const y = padT + chartH * i / 5;
            ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.font = '9px -apple-system,sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText((100 - i * 20).toString(), padL - 6, y + 3);
          }
    
          // 厦大学历高亮区域
          if (xueli > 0) {
            const x0 = padL + entryAge * chartW / data.length;
            const x1 = padL + (gradAge + 1) * chartW / data.length;
            const uniGrad = ctx.createLinearGradient(x0, 0, x1, 0);
            uniGrad.addColorStop(0, 'rgba(27,58,123,0.12)');
            uniGrad.addColorStop(0.5, 'rgba(196,146,46,0.08)');
            uniGrad.addColorStop(1, 'rgba(27,58,123,0.12)');
            ctx.fillStyle = uniGrad;
            ctx.fillRect(x0, padT, x1 - x0, chartH);
    
            ctx.strokeStyle = 'rgba(196,146,46,0.25)';
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(x0, padT); ctx.lineTo(x0, padT + chartH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x1, padT); ctx.lineTo(x1, padT + chartH); ctx.stroke();
            ctx.setLineDash([]);
          }
    
          // 绘制所有K线
          klineCoords.forEach((kc, i) => {
            const isHovered = i === hoverIndex;
            const d = kc.data;
            const isUp = d.close >= d.open;
            const isDoji = Math.abs(d.close - d.open) < 0.5;
    
            // 颜色定义
            let bodyColor, strokeColor, glowColor;
            if (isUp) {
              bodyColor = isHovered ? '#22c55e' : '#10b981';
              strokeColor = isHovered ? '#4ade80' : '#34d399';
              glowColor = 'rgba(34,197,94,0.35)';
            } else {
              bodyColor = isHovered ? '#ef4444' : '#f43f5e';
              strokeColor = isHovered ? '#f87171' : '#fb7185';
              glowColor = 'rgba(239,68,68,0.35)';
            }
    
            // 悬停发光效果
            if (isHovered) {
              ctx.shadowColor = glowColor;
              ctx.shadowBlur = 14;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;
            } else {
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
            }
    
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isHovered ? 1.5 : 1;
            ctx.lineCap = 'round';
    
            // 影线
            ctx.beginPath();
            ctx.moveTo(kc.x, kc.yH);
            ctx.lineTo(kc.x, kc.yL);
            ctx.stroke();
    
            // 实体（带渐变）
            const bodyTop = Math.min(kc.yO, kc.yC);
            const bodyH = Math.max(1, Math.abs(kc.yC - kc.yO));
    
            if (!isDoji) {
              const bodyGrad = ctx.createLinearGradient(kc.x - kW/2, bodyTop, kc.x + kW/2, bodyTop + bodyH);
              if (isUp) {
                bodyGrad.addColorStop(0, isHovered ? '#16a34a' : '#059669');
                bodyGrad.addColorStop(1, isHovered ? '#4ade80' : '#34d399');
              } else {
                bodyGrad.addColorStop(0, isHovered ? '#dc2626' : '#e11d48');
                bodyGrad.addColorStop(1, isHovered ? '#fca5a5' : '#fb7185');
              }
              ctx.fillStyle = bodyGrad;
            } else {
              // 十字星：用线条代替填充
              ctx.fillStyle = isUp ? '#10b981' : '#f43f5e';
            }
    
            const halfW = Math.max(1.5, kW / 2 - (isHovered ? 0.5 : 0.8));
            if (isUp && !isDoji) {
              ctx.fillRect(kc.x - halfW, kc.yC, halfW * 2, bodyH);
            } else if (!isDoji) {
              ctx.fillRect(kc.x - halfW, kc.yO, halfW * 2, bodyH);
            } else {
              // 十字星
              ctx.fillRect(kc.x - 0.8, kc.yO, 1.6, Math.max(2, bodyH));
            }
    
            // 重置阴影
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
          });
    
          // 悬停时的十字准星线和价格标签
          if (hoverIndex >= 0 && hoverIndex < klineCoords.length) {
            const kc = klineCoords[hoverIndex];
            const d = kc.data;
            const isUp = d.close >= d.open;
    
            // 垂直线
            ctx.strokeStyle = 'rgba(255,255,255,0.15)';
            ctx.lineWidth = 0.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(kc.x, padT);
            ctx.lineTo(kc.x, padT + chartH);
            ctx.stroke();
    
            // 水平线（收盘价）
            ctx.beginPath();
            ctx.moveTo(padL, kc.yC);
            ctx.lineTo(W - padR, kc.yC);
            ctx.stroke();
            ctx.setLineDash([]);
    
            // 收盘价标签
            ctx.fillStyle = isUp ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.9)';
            const closeLabel = d.close.toFixed(1);
            const labelW = ctx.measureText(closeLabel).width + 10;
            roundRect(ctx, W - padR - labelW - 4, kc.yC - 8, labelW, 16, 3);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px -apple-system,sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(closeLabel, W - padR - labelW / 2 - 4, kc.yC + 3);
          }
    
          // 年份标签
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.font = '9px -apple-system,sans-serif';
          ctx.textAlign = 'center';
          for (let a = 0; a < 80; a += 10) {
            const kc = klineCoords[a];
            if (kc) ctx.fillText(kc.data.year.toString(), kc.x, H - 8);
          }
        }
    
        // 圆角矩形辅助函数
        function roundRect(ctx, x, y, w, h, r) {
          r = Math.min(r, w / 2, h / 2);
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.arcTo(x + w, y, x + w, y + r, r);
          ctx.lineTo(x + w, y + h - r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.lineTo(x + r, y + h);
          ctx.arcTo(x, y + h, x, y + h - r, r);
          ctx.lineTo(x, y + r);
          ctx.arcTo(x, y, x + r, y, r);
          ctx.closePath();
        }
    
        // 初始绘制
        draw(-1);
    
        // 鼠标事件
        canvas.addEventListener('mousemove', (e) => {
          const rect = canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
    
          // 找到最近的K线索引
          let nearestIdx = -1;
          let minDist = Infinity;
          klineCoords.forEach((kc, i) => {
            const dist = Math.abs(mx - kc.x);
            if (dist < minDist && dist < kW * 2) {
              minDist = dist;
              nearestIdx = i;
            }
          });
    
          if (nearestIdx !== hoverIdx) {
            hoverIdx = nearestIdx;
            draw(hoverIdx);
          }
    
          // 更新Tooltip
          if (hoverIdx >= 0) {
            const d = data[hoverIdx];
            const isUp = d.close >= d.open;
            const change = (d.close - d.open).toFixed(1);
            const changePct = ((d.close - d.open) / d.open * 100).toFixed(1);
            const swing = (d.high - d.low).toFixed(1);
    
            const stageName = STAGE_NAMES[d.stage] || '';
            const arrow = isUp ? '\u2191' : '\u2193';
    
            tooltip.innerHTML =
              `<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;">
                <span style="font-weight:800;font-size:14px;color:${isUp ? '#4ade80' : '#f87171'};">${d.year}</span>
                <span style="color:rgba(255,255,255,0.5);font-size:11px;">${d.age}岁 · ${stageName}</span>
              </div>
              <div style="display:grid;grid-template-columns:auto auto;gap:2px 12px;font-size:11px;">
                <span style="color:rgba(255,255,255,0.45)">开盘</span><span style="color:#f1f5f9;font-weight:600">${d.open}</span>
                <span style="color:rgba(255,255,255,0.45)">收盘</span><span style="color:${isUp ? '#4ade80' : '#f87171'};font-weight:700">${d.close}</span>
                <span style="color:rgba(255,255,255,0.45)">最高</span><span style="color:#fbbf24;font-weight:600">${d.high}</span>
                <span style="color:rgba(255,255,255,0.45)">最低</span><span style="color:#60a5fa;font-weight:600">${d.low}</span>
                <span style="color:rgba(255,255,255,0.45)">振幅</span><span style="color:#c084fc;font-weight:600">${swing}</span>
                <span style="color:rgba(255,255,255,0.45)">涨跌</span><span style="color:${isUp ? '#4ade80' : '#f87171'};font-weight:600">${arrow} ${change} (${changePct}%)</span>
              </div>`;
    
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';
    
            // 定位tooltip
            let tx = mx + 16;
            let ty = my - 10;
            const ttRect = tooltip.getBoundingClientRect();
    
            // 边界检测
            if (tx + ttRect.width > W - 8) tx = mx - ttRect.width - 16;
            if (ty + ttRect.height > H - 8) ty = H - ttRect.height - 8;
            if (ty < 0) ty = 8;
    
            tooltip.style.left = tx + 'px';
            tooltip.style.top = ty + 'px';
          } else {
            tooltip.style.opacity = '0';
            setTimeout(() => { if (hoverIdx < 0) tooltip.style.display = 'none'; }, 150);
          }
        });
    
        canvas.addEventListener('mouseleave', () => {
          hoverIdx = -1;
          draw(-1);
          tooltip.style.opacity = '0';
          setTimeout(() => tooltip.style.display = 'none', 150);
        });
      }
    
      // ═══ 创建模态弹窗 ═══
      function createModal() {
        const oldBackdrop = document.getElementById('xmu-kline-backdrop');
        const oldModal = document.getElementById('xmu-kline-modal');
        if (oldBackdrop) oldBackdrop.remove();
        if (oldModal) oldModal.remove();
    
        // 遮罩层
        const backdrop = document.createElement('div');
        backdrop.id = 'xmu-kline-backdrop';
        Object.assign(backdrop.style, {
          position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.55)', zIndex: '99998',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
          animation: 'xmuFadeIn 0.3s ease'
        });
    
        // 弹窗容器
        const modal = document.createElement('div');
        modal.id = 'xmu-kline-modal';
        Object.assign(modal.style, {
          position: 'relative',
          width: 'min(540px,94vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'linear-gradient(145deg,#ffffff 0%,#f6f8fc 100%)',
          borderRadius: '18px',
          boxShadow: '0 24px 80px rgba(27,58,123,0.28),0 8px 32px rgba(0,0,0,0.12)',
          zIndex: '99999',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
          padding: '0',
          animation: 'xmuSlideUp 0.35s cubic-bezier(0.16,1,0.3,1)'
        });
    
        // 关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '&times;';
        Object.assign(closeBtn.style, {
          position: 'absolute', top: '12px', right: '14px',
          width: '34px', height: '34px',
          border: 'none', borderRadius: '50%',
          background: 'rgba(27,58,123,0.07)',
          color: XMU_BLUE, fontSize: '22px', lineHeight: '1',
          cursor: 'pointer', zIndex: '10',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s ease'
        });
        closeBtn.onmouseover = () => { closeBtn.style.background = 'rgba(220,38,38,0.1)'; closeBtn.style.color = '#dc2626'; };
        closeBtn.onmouseout = () => { closeBtn.style.background = 'rgba(27,58,123,0.07)'; closeBtn.style.color = XMU_BLUE; };
        closeBtn.onclick = () => closeModal();
    
        // 标题栏
        const header = document.createElement('div');
        header.innerHTML = `
          <div style="padding:20px 22px 14px;background:linear-gradient(135deg,${XMU_BLUE} 0%,#234b96 50%,#2a5298 100%);border-radius:18px 18px 0 0;text-align:center;position:relative;overflow:hidden;">
            <div style="position:absolute;top:-20px;left:-20px;width:80px;height:80px;background:rgba(196,146,46,0.1);border-radius:50%;"></div>
            <div style="position:absolute;bottom:-30px;right:-10px;width:60px;height:60px;background:rgba(255,255,255,0.04);border-radius:50%;"></div>
            <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:4px;position:relative;">
              <span style="font-size:20px;">\uD83D\uDCC8</span>
              <span style="color:#fff;font-weight:800;font-size:17px;letter-spacing:1px;text-shadow:0 1px 4px rgba(0,0,0,0.2);">厦门大学 \u00B7 人生K线图</span>
              <span style="font-size:20px;">\uD83C\uDF93</span>
            </div>
            <div style="color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:1.5px;position:relative;">自强不息 \u00B7 止于至善</div>
          </div>`;
    
        // 输入区域
        const inputArea = document.createElement('div');
        inputArea.id = 'xmu-input-area';
        inputArea.innerHTML = `
          <div style="padding:14px 18px 10px;border-bottom:1px solid rgba(27,58,123,0.07);">
            <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;">
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">出生年份</label>
                <input id="xmu-by" type="number" placeholder="1990" value="1990" style="width:64px;padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;transition:border-color 0.2s,box-shadow 0.2s;" /></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">月</label>
                <input id="xmu-bm" type="number" placeholder="6" value="6" min="1" max="12" style="width:52px;padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;" /></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">日</label>
                <input id="xmu-bd" type="number" placeholder="15" value="15" min="1" max="31" style="width:52px;padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;" /></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">时辰</label>
                <select id="xmu-hr" style="padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:12px;outline:none;cursor:pointer;"><option value="-1">未知</option>${SHICHEN.map((s,i)=>`<option value="${i}">${s}</option>`).join('')}</select></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">学历</label>
                <select id="xmu-xl" style="padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:12px;outline:none;cursor:pointer;">${XUELI.map((x,i)=>`<option value="${i}"${i===1?' selected':''}>${x}</option>`).join('')}</select></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">入学年龄</label>
                <input id="xmu-entry" type="number" value="18" min="0" max="79" style="width:56px;padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;" /></div>
              <div><label style="display:block;font-size:10px;color:#888;font-weight:600;margin-bottom:2px;">毕业年龄</label>
                <input id="xmu-grad" type="number" value="22" min="0" max="79" style="width:56px;padding:6px 7px;border:1.5px solid #ddd;border-radius:7px;font-size:13px;outline:none;box-sizing:border-box;" /></div>
              <button id="xmu-gen-btn" style="padding:7px 18px;background:linear-gradient(135deg,${XMU_BLUE},#2a5298);color:#fff;border:none;border-radius:9px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:all 0.2s ease;box-shadow:0 2px 8px rgba(27,58,123,0.25);">生成K线</button>
            </div>
          </div>`;
    
        // 结果区域
        const resultArea = document.createElement('div');
        resultArea.id = 'xmu-result-area';
        resultArea.innerHTML = `<div style="padding:24px;text-align:center;color:#aaa;font-size:13px;">\uD83D\uDCC8 请输入信息并点击「生成K线」查看你的人生走势图</div>`;
    
        modal.appendChild(closeBtn);
        modal.appendChild(header);
        modal.appendChild(inputArea);
        modal.appendChild(resultArea);
        backdrop.appendChild(modal);
        document.body.appendChild(backdrop);
    
        backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };
    
        document.addEventListener('keydown', function escHandler(e) {
          if (e.key === 'Escape') { document.removeEventListener('keydown', escHandler); closeModal(); }
        });
    
        // 生成按钮事件
        document.getElementById('xmu-gen-btn').onclick = () => {
          const by=parseInt(document.getElementById('xmu-by').value)||1990;
          const bm=Math.max(1,Math.min(12,parseInt(document.getElementById('xmu-bm').value)||6));
          const bd=Math.max(1,Math.min(31,parseInt(document.getElementById('xmu-bd').value)||15));
          const hr=parseInt(document.getElementById('xmu-hr').value)||-1;
          const xl=parseInt(document.getElementById('xmu-xl').value)||1;
          const entryAge=Math.max(0,Math.min(79,parseInt(document.getElementById('xmu-entry').value)||18));
          const gradAge=Math.max(entryAge,Math.min(79,parseInt(document.getElementById('xmu-grad')?.value)||(entryAge+4)));
    
          const kd=generateKlineData(by,bm,bd,hr);
          const stats=calcStats(kd,xl);
          const com=genCommentary(by,bm,bd,hr,xl,stats,kd);
    
          resultArea.innerHTML = `
            <div style="padding:12px 18px 6px;">
              <!-- K线图容器 -->
              <div id="xmu-chart-container" style="background:linear-gradient(180deg,#0c1222,#161f35);border-radius:12px;padding:12px;margin-bottom:14px;box-shadow:inset 0 2px 8px rgba(0,0,0,0.3),0 4px 16px rgba(0,0,0,0.1);">
                <div style="text-align:center;margin-bottom:8px;">
                  <span style="font-size:12px;font-weight:700;color:#e2e8f0;">\uD83D\uDCC8 80\u5E74\u8FD0\u52BFK\u7EBF\u56FE</span>
                  <span style="font-size:10px;color:rgba(255,255,255,0.35);margin-left:8px;">(${by}\u2013${by+79})</span>
                  ${xl>0?`<span style="font-size:9px;background:linear-gradient(135deg,${XMU_GOLD},${XMU_BLUE});color:#fff;padding:2px 8px;border-radius:10px;margin-left:8px;font-weight:600;">${XUELI[xl]} ${entryAge}\u2013${gradAge}\u5C81</span>`:''}
                  <span style="float:right;font-size:9px;color:rgba(255,255,255,0.25);margin-top:2px;">\uD83D\uDDEE \u60AC\u505C\u67E5\u770B\u8BE6\u60C5</span>
                </div>
              </div>
    
              <!-- 统计摘要 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                <div class="xmu-stat-card" style="background:linear-gradient(135deg,#ecfdf5,rgba(16,185,129,0.06));border-radius:10px;padding:12px;border-left:3px solid #10b981;transition:transform 0.2s,box-shadow 0.2s;cursor:default;">
                  <div style="font-size:10px;color:#059669;font-weight:700;">\u2B06\uFE0F \u5CF0\u503C\u5E74\u4EFD</div>
                  <div style="font-size:14px;font-weight:800;color:#047857;">${stats.peak.year}\u5E74 <span style="font-size:11px;color:#059669;">(${stats.peak.age}\u5C81)</span></div>
                  <div style="font-size:11px;color:#555;">\u6536\u76D8 <b style="color:#047857;">${stats.peak.close}</b> \u5206</div>
                </div>
                <div class="xmu-stat-card" style="background:linear-gradient(135deg,#fef2f2,rgba(244,63,94,0.06));border-radius:10px;padding:12px;border-left:3px solid #f43f5e;transition:transform 0.2s,box-shadow 0.2s;cursor:default;">
                  <div style="font-size:10px;color:#e11d48;font-weight:700;">\u2B07\uFE0F \u4F4E\u8C37\u5E74\u4EFD</div>
                  <div style="font-size:14px;font-weight:800;color:#be123c;">${stats.trough.year}\u5E74 <span style="font-size:11px;color:#e11d48;">(${stats.trough.age}\u5C81)</span></div>
                  <div style="font-size:11px;color:#555;">\u6536\u76D8 <b style="color:#be123c;">${stats.trough.close}</b> \u5206</div>
                </div>
              </div>
    
              <!-- 最佳大运 -->
              <div class="xmu-stat-card" style="background:linear-gradient(135deg,${XMU_LIGHT},rgba(196,146,46,0.06));border-radius:10px;padding:12px;margin-bottom:14px;border-left:3px solid ${XMU_GOLD};transition:transform 0.2s,box-shadow 0.2s;">
                <div style="font-size:10px;color:${XMU_GOLD};font-weight:700;">\uD83C\uDFC6 \u6700\u4F73\u5927\u8FD0</div>
                <div style="font-size:14px;font-weight:800;color:${XMU_BLUE};">${STAGE_NAMES[stats.bestStage.stage]}\uFF08${STAGE_THEMES[stats.bestStage.stage].range}\u5C81\uFF09</div>
                <div style="font-size:11px;color:#555;">\u5747\u5206 <b style="color:${XMU_BLUE};">${stats.bestStage.avg}</b> \u00B7 ${STAGE_THEMES[stats.bestStage.stage].topic}</div>
              </div>
    
              <!-- 转折年份 -->
              <div class="xmu-stat-card" style="background:#fff;border-radius:10px;padding:12px;margin-bottom:14px;border:1px solid rgba(27,58,123,0.08);transition:transform 0.2s,box-shadow 0.2s;">
                <div style="font-size:10px;color:${XMU_BLUE};font-weight:700;">\uD83D\uDD04 \u6700\u5927\u8F6C\u6298\u5E74</div>
                <div style="font-size:14px;font-weight:800;color:#333;">${stats.turnYear.year}\u5E74 <span style="font-size:11px;color:#666;">(${stats.turnYear.age}\u5C81)</span></div>
                <div style="font-size:11px;color:#666;">\u6CE2\u52A8\u5E45\u5EA6 \u00B1${Math.abs(stats.turnYear.close-(kd[stats.turnYear.age-1]?.close||stats.turnYear.close)).toFixed(1)} \u5206</div>
              </div>
    
              ${com.personalityHTML}
              ${com.currentStageHTML}
              ${com.uniHTML}
              ${com.yearHTML}
    
              <div style="text-align:center;margin-top:14px;padding:12px;background:linear-gradient(135deg,${XMU_BLUE},#2a5298);border-radius:12px;color:rgba(255,255,255,0.92);font-size:12px;font-weight:700;letter-spacing:3px;text-shadow:0 1px 4px rgba(0,0,0,0.2);">
                \u81EA\u5F3A\u4E0D\u606F \u00B7 \u6B62\u4E8E\u81F3\u5584
              </div>
            </div>`;
    
          // 在图表容器中创建交互式K线
          const chartContainer = document.getElementById('xmu-chart-container');
          if (chartContainer) {
            createInteractiveKLine(chartContainer, kd, xl, entryAge, gradAge);
          }
    
          // 为统计卡片添加悬停效果
          resultArea.querySelectorAll('.xmu-stat-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
              card.style.transform = 'translateY(-2px)';
              card.style.boxShadow = '0 6px 20px rgba(27,58,123,0.12)';
            });
            card.addEventListener('mouseleave', () => {
              card.style.transform = '';
              card.style.boxShadow = '';
            });
          });
        };
    
        function closeModal() {
          const bd = document.getElementById('xmu-kline-backdrop');
          const md = document.getElementById('xmu-kline-modal');
          if (bd || md) {
            if (bd) { bd.style.animation = 'xmuFadeOut 0.25s ease'; setTimeout(() => bd.remove(), 250); }
            if (md) { md.style.animation = 'xmuSlideDown 0.25s ease'; setTimeout(() => md.remove(), 250); }
          }
        }
    
        // 注入动画CSS（含卡片悬停效果）
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
          @keyframes xmuFadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes xmuFadeOut { from { opacity: 1; } to { opacity: 0; } }
          @keyframes xmuSlideUp { from { transform: translateY(30px) scale(0.97); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
          @keyframes xmuSlideDown { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(30px) scale(0.97); opacity: 0; } }
          #xmu-input-area input:focus, #xmu-input-area select:focus { border-color: ${XMU_BLUE} !important; box-shadow: 0 0 0 3px rgba(27,58,123,0.15) !important; }
          #xmu-gen-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 6px 20px rgba(27,58,123,0.35) !important; }
          #xmu-gen-btn:active { transform: translateY(0) !important; box-shadow: 0 2px 8px rgba(27,58,123,0.25) !important; }
          .xmu-stat-card { will-change: transform, box-shadow; }
        `;
        document.head.appendChild(styleSheet);
    
        return { ok: true, summary: '厦门大学人生K线图v7模态弹窗+悬停高亮已创建', modal_id: 'xmu-kline-modal' };
      }
    
      return createModal();
    }
  );
  if (typeof __tabOriginalFunction !== "function") {
    throw new Error("evaluate_script source must evaluate to a function");
  }
  return await __tabOriginalFunction();
})();