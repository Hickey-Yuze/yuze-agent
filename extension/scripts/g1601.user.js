(function() {
const old = document.getElementById('Yuze-fx-overlay');
if (old) old.remove();
const overlay = document.createElement('div');
overlay.id = 'Yuze-fx-overlay';
Object.assign(overlay.style, {
position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
zIndex: 999999, pointerEvents: 'none', overflow: 'hidden'
});
document.body.appendChild(overlay);
const canvas = document.createElement('canvas');
overlay.appendChild(canvas);
const ctx = canvas.getContext('2d');
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = window.innerWidth * dpr;
canvas.height = window.innerHeight * dpr;
canvas.style.width = '100%';
canvas.style.height = '100%';
ctx.scale(dpr, dpr);
const W = window.innerWidth, H = window.innerHeight;
const CX = W / 2, CY = H / 2;
function rand(a, b) { return Math.random() * (b - a) + a; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// 根据logo.jpg的配色方案
const LOGO_BROWN = [139, 69, 19];      // logo建筑线条色 #8B4513
const LOGO_BLACK = [0, 0, 0];          // logo主文字色 #000000
const LOGO_GRAY = [128, 128, 128];     // logo副文字色 #808080
const SOFT_BROWN = [180, 150, 120];    // 柔和的浅棕色 #B49678
const LIGHT_BROWN = [200, 170, 140];   // 更淡的棕色 #C8AA8C
const CREAM_WHITE = [255, 250, 240];   // 奶油白色 #FFFAF0
const ALL_COLORS = [LOGO_BROWN, SOFT_BROWN, LIGHT_BROWN, CREAM_WHITE, LOGO_GRAY];

function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + clamp(a, 0, 1) + ')'; }

// --- PHASES ---
const PHASE_ENTER = 0;
const PHASE_HOLD = 1;
const PHASE_EXIT = 2;
const PHASE_DONE = 3;
let phase = PHASE_ENTER;
let phaseTime = 0;
let globalAlpha = 0;
const ENTER_DUR = 2000;
const HOLD_DUR = 3000;
const EXIT_DUR = 1800;

// --- GEOMETRIC RING ---
const rings = [];
class GeoRing {
constructor(delay) {
this.radius = 0;
this.targetRadius = rand(80, 260);
this.lineWidth = rand(1, 2.5);
this.color = pick([LOGO_BROWN, SOFT_BROWN, LIGHT_BROWN]);
this.sides = pick([6, 8, 10, 12]);
this.rotation = rand(0, Math.PI * 2);
this.rotSpeed = rand(-0.015, 0.015);
this.alpha = 0;
this.delay = delay;
this.pulsePhase = rand(0, Math.PI * 2);
this.pulseAmp = rand(3, 10);
}
update(dt, exitProgress) {
if (this.delay > 0) { this.delay -= dt; return; }
if (phase === PHASE_ENTER) {
this.radius += (this.targetRadius - this.radius) * 0.06;
this.alpha += (0.7 - this.alpha) * 0.05;
} else if (phase === PHASE_HOLD) {
this.pulsePhase += 0.03;
this.radius = this.targetRadius + Math.sin(this.pulsePhase) * this.pulseAmp;
this.alpha = 0.7;
} else if (phase === PHASE_EXIT) {
this.radius *= 1 + exitProgress * 0.02;
this.alpha = 0.7 * (1 - exitProgress);
}
this.rotation += this.rotSpeed;
}
draw() {
if (this.alpha <= 0.01 || this.delay > 0) return;
ctx.save();
ctx.translate(CX, CY);
ctx.rotate(this.rotation);
ctx.globalAlpha = this.alpha * globalAlpha;
const r = Math.max(1, this.radius);
// polygon
ctx.beginPath();
for (let i = 0; i <= this.sides; i++) {
const a = (Math.PI * 2 / this.sides) * i;
const px = Math.cos(a) * r, py = Math.sin(a) * r;
i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
}
ctx.closePath();
ctx.strokeStyle = rgba(this.color, 1);
ctx.lineWidth = this.lineWidth;
ctx.stroke();
// inner glow
ctx.strokeStyle = rgba(this.color, 0.1);
ctx.lineWidth = this.lineWidth + 6;
ctx.stroke();
// vertex dots
for (let i = 0; i < this.sides; i++) {
const a = (Math.PI * 2 / this.sides) * i;
const px = Math.cos(a) * r, py = Math.sin(a) * r;
ctx.beginPath();
ctx.arc(px, py, 2.5, 0, Math.PI * 2);
ctx.fillStyle = rgba(CREAM_WHITE, 0.9);
ctx.fill();
}
ctx.restore();
}
}
for (let i = 0; i < 5; i++) rings.push(new GeoRing(i * 300));

// --- DATA STREAM RAIN ---
const streams = [];
class DataStream {
constructor() {
this.x = rand(0, W);
this.y = rand(-H, 0);
this.speed = rand(2, 6);
this.chars = [];
const len = Math.floor(rand(6, 18));
const glyphs = '01アイウエオカキクケコ{}[]<>/\\|+=\*&%$#@!';
for (let i = 0; i < len; i++) this.chars.push(glyphs[Math.floor(rand(0, glyphs.length))]);
this.alpha = rand(0.15, 0.4);
this.color = pick([LOGO_BROWN, SOFT_BROWN]);
this.spacing = rand(14, 22);
this.fontSize = rand(10, 14);
}
update(dt, exitProgress) {
this.y += this.speed;
if (this.y > H + 200) { this.y = rand(-300, -50); this.x = rand(0, W); }
if (phase === PHASE_EXIT) this.alpha *= (1 - exitProgress * 0.03);
}
draw() {
if (this.alpha <= 0.01) return;
ctx.save();
ctx.font = this.fontSize + 'px monospace';
ctx.globalAlpha = this.alpha * globalAlpha;
for (let i = 0; i < this.chars.length; i++) {
const a = this.alpha * (1 - i / this.chars.length);
ctx.fillStyle = rgba(this.color, a);
ctx.fillText(this.chars[i], this.x, this.y + i * this.spacing);
}
ctx.restore();
}
}
for (let i = 0; i < 25; i++) streams.push(new DataStream());

// --- NEURAL NODES ---
const neuralNodes = [];
class NeuralNode {
constructor(x, y) {
this.x = x; this.y = y;
this.baseX = x; this.baseY = y;
this.color = pick([LOGO_BROWN, SOFT_BROWN, LIGHT_BROWN, CREAM_WHITE]);
this.radius = rand(2, 4);
this.alpha = 0;
this.pulsePhase = rand(0, Math.PI * 2);
this.driftAngle = rand(0, Math.PI * 2);
this.driftSpeed = rand(0.005, 0.02);
this.driftRadius = rand(5, 20);
}
update(dt, exitProgress) {
this.pulsePhase += 0.04;
this.driftAngle += this.driftSpeed;
this.x = this.baseX + Math.cos(this.driftAngle) * this.driftRadius;
this.y = this.baseY + Math.sin(this.driftAngle) * this.driftRadius;
if (phase === PHASE_ENTER) {
this.alpha += (0.7 - this.alpha) * 0.04;
} else if (phase === PHASE_EXIT) {
const dx = CX - this.x, dy = CY - this.y;
this.baseX += dx * exitProgress * 0.02;
this.baseY += dy * exitProgress * 0.02;
this.alpha = 0.7 * (1 - exitProgress);
} else {
this.alpha = 0.7;
}
}
draw() {
if (this.alpha <= 0.01) return;
const glow = 0.6 + Math.sin(this.pulsePhase) * 0.4;
ctx.beginPath();
ctx.arc(this.x, this.y, this.radius + glow * 4, 0, Math.PI * 2);
ctx.fillStyle = rgba(this.color, this.alpha * 0.1 * glow);
ctx.fill();
ctx.beginPath();
ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
ctx.fillStyle = rgba(this.color, this.alpha);
ctx.fill();
}
}
for (let i = 0; i < 30; i++) {
const angle = rand(0, Math.PI * 2);
const dist = rand(100, 300);
neuralNodes.push(new NeuralNode(CX + Math.cos(angle) * dist, CY + Math.sin(angle) * dist));
}

function drawNeuralConnections(exitProgress) {
const maxDist = 130;
for (let i = 0; i < neuralNodes.length; i++) {
for (let j = i + 1; j < neuralNodes.length; j++) {
const dx = neuralNodes[i].x - neuralNodes[j].x;
const dy = neuralNodes[i].y - neuralNodes[j].y;
const dist = Math.sqrt(dx * dx + dy * dy);
if (dist < maxDist) {
const a = (1 - dist / maxDist) * Math.min(neuralNodes[i].alpha, neuralNodes[j].alpha) * 0.3;
ctx.beginPath();
ctx.moveTo(neuralNodes[i].x, neuralNodes[i].y);
ctx.lineTo(neuralNodes[j].x, neuralNodes[j].y);
ctx.strokeStyle = rgba(LOGO_BROWN, a);
ctx.lineWidth = 0.5;
ctx.stroke();
}
}
}
}

// --- BURST PARTICLES (for enter & exit) ---
const burstParticles = [];
class BurstParticle {
constructor(x, y, color, speed, size) {
this.x = x; this.y = y;
const angle = rand(0, Math.PI * 2);
const s = speed || rand(2, 8);
this.vx = Math.cos(angle) * s;
this.vy = Math.sin(angle) * s;
this.life = 1;
this.decay = rand(0.01, 0.025);
this.size = size || rand(1.5, 4);
this.color = color || pick(ALL_COLORS);
this.friction = 0.97;
}
update() {
this.vx *= this.friction;
this.vy *= this.friction;
this.x += this.vx;
this.y += this.vy;
this.life -= this.decay;
}
draw() {
if (this.life <= 0) return;
ctx.beginPath();
ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
ctx.fillStyle = rgba(this.color, this.life * 0.6);
ctx.fill();
ctx.beginPath();
ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
ctx.fillStyle = rgba(this.color, this.life * 0.08);
ctx.fill();
}
}
// initial burst
for (let i = 0; i < 60; i++) burstParticles.push(new BurstParticle(CX, CY));

// --- PULSE SHOCKWAVES ---
const shockwaves = [];
class Shockwave {
constructor(x, y, maxR) {
this.x = x; this.y = y;
this.radius = 0; this.maxR = maxR || rand(200, 400);
this.alpha = 0.4;
this.color = pick([LOGO_BROWN, SOFT_BROWN, LIGHT_BROWN]);
}
update() {
this.radius += 4;
this.alpha = 0.4 * (1 - this.radius / this.maxR);
}
draw() {
if (this.alpha <= 0) return;
ctx.beginPath();
ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
ctx.strokeStyle = rgba(this.color, this.alpha);
ctx.lineWidth = 1.5;
ctx.stroke();
ctx.beginPath();
ctx.arc(this.x, this.y, Math.max(1, this.radius), 0, Math.PI * 2);
ctx.strokeStyle = rgba(this.color, this.alpha * 0.15);
ctx.lineWidth = 8;
ctx.stroke();
}
}
shockwaves.push(new Shockwave(CX, CY, 350));
setTimeout(() => shockwaves.push(new Shockwave(CX, CY, 280)), 400);

// --- CENTER CORE ---
let coreAlpha = 0;
let corePulse = 0;
let coreSize = 0;
function updateCore(exitProgress) {
corePulse += 0.05;
if (phase === PHASE_ENTER) {
coreAlpha += (0.8 - coreAlpha) * 0.04;
coreSize += (20 - coreSize) * 0.05;
} else if (phase === PHASE_HOLD) {
coreAlpha = 0.8;
coreSize = 20 + Math.sin(corePulse) * 4;
} else {
coreAlpha = 0.8 * (1 - exitProgress);
coreSize = 20 * (1 + exitProgress * 2);
}
}
function drawCore() {
if (coreAlpha <= 0.01) return;
// outer glow
const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(1, coreSize * 5));
grad.addColorStop(0, rgba(LOGO_BROWN, coreAlpha * 0.15));
grad.addColorStop(0.5, rgba(SOFT_BROWN, coreAlpha * 0.05));
grad.addColorStop(1, rgba(SOFT_BROWN, 0));
ctx.beginPath();
ctx.arc(CX, CY, Math.max(1, coreSize * 5), 0, Math.PI * 2);
ctx.fillStyle = grad;
ctx.fill();
// core
ctx.beginPath();
ctx.arc(CX, CY, Math.max(1, coreSize), 0, Math.PI * 2);
ctx.fillStyle = rgba(CREAM_WHITE, coreAlpha * 0.85);
ctx.fill();
// ring
ctx.beginPath();
ctx.arc(CX, CY, Math.max(1, coreSize * 2 + Math.sin(corePulse) * 5), 0, Math.PI * 2);
ctx.strokeStyle = rgba(LOGO_BROWN, coreAlpha * 0.3);
ctx.lineWidth = 1.2;
ctx.stroke();
}

// --- SCAN LINE ---
let scanY = 0;
let scanActive = true;
function drawScanLine(exitProgress) {
if (!scanActive) return;
scanY += 5;
if (scanY > H) { scanY = 0; if (phase === PHASE_EXIT) scanActive = false; }
const a = (phase === PHASE_EXIT ? (1 - exitProgress) : 1) * 0.15;
const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30);
grad.addColorStop(0, rgba(LOGO_BROWN, 0));
grad.addColorStop(0.5, rgba(LOGO_BROWN, a));
grad.addColorStop(1, rgba(LOGO_BROWN, 0));
ctx.fillStyle = grad;
ctx.fillRect(0, scanY - 30, W, 60);
}

// --- HOLOGRAPHIC TEXT ---
function showHoloMessage() {
const wrapper = document.createElement('div');
wrapper.id = 'Yuze-holo-msg';
Object.assign(wrapper.style, {
position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
display: 'flex', alignItems: 'center', justifyContent: 'center',
zIndex: 1000000, pointerEvents: 'none', perspective: '900px'
});
const card = document.createElement('div');
card.id = 'Yuze-holo-card';
Object.assign(card.style, {
position: 'relative', padding: '40px 70px', textAlign: 'center',
background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.05) 0%, rgba(180, 150, 120, 0.08) 50%, rgba(200, 170, 140, 0.05) 100%)',
border: '1px solid rgba(139, 69, 19, 0.2)',
borderRadius: '16px',
backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
boxShadow: '0 0 30px rgba(139, 69, 19, 0.1), 0 0 60px rgba(180, 150, 120, 0.08), inset 0 0 30px rgba(139, 69, 19, 0.03)',
transform: 'scale(0.2) rotateY(90deg)', opacity: '0',
transition: 'transform 0.8s cubic-bezier(0.16,1,0.3,1), opacity 0.5s ease',
overflow: 'hidden'
});
// scanlines overlay
const scanOv = document.createElement('div');
Object.assign(scanOv.style, {
position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 69, 19, 0.015) 2px, rgba(139, 69, 19, 0.015) 4px)',
pointerEvents: 'none', zIndex: 1
});
card.appendChild(scanOv);
// accent lines
const topLine = document.createElement('div');
Object.assign(topLine.style, {
position: 'absolute', top: 0, left: '10%', width: '80%', height: '1px',
background: 'linear-gradient(90deg, transparent, #8B4513, #B49678, transparent)', zIndex: 2
});
card.appendChild(topLine);
const btmLine = document.createElement('div');
Object.assign(btmLine.style, {
position: 'absolute', bottom: 0, left: '10%', width: '80%', height: '1px',
background: 'linear-gradient(90deg, transparent, #C8AA8C, #8B4513, transparent)', zIndex: 2
});
card.appendChild(btmLine);
// corners
const cs = [
{ top:'-1px',left:'-1px',borderTop:'1px solid #8B4513',borderLeft:'1px solid #8B4513' },
{ top:'-1px',right:'-1px',borderTop:'1px solid #8B4513',borderRight:'1px solid #8B4513' },
{ bottom:'-1px',left:'-1px',borderBottom:'1px solid #C8AA8C',borderLeft:'1px solid #C8AA8C' },
{ bottom:'-1px',right:'-1px',borderBottom:'1px solid #C8AA8C',borderRight:'1px solid #C8AA8C' },
];
cs.forEach(s => {
const d = document.createElement('div');
Object.assign(d.style, { position:'absolute',width:'15px',height:'15px',zIndex:2 }, s);
card.appendChild(d);
});
// main text - 使用logo的黑色主文字风格
const mainT = document.createElement('div');
mainT.id = 'Yuze-holo-main';
mainT.innerHTML = '云组会的同学们！';
Object.assign(mainT.style, {
fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
fontSize: '42px', fontWeight: '800', letterSpacing: '5px',
color: '#000000', // logo主文字黑色
position: 'relative', zIndex: 3,
textShadow: '0 0 15px rgba(139, 69, 19, 0.4), 0 0 30px rgba(180, 150, 120, 0.3)', // 棕色发光
opacity: '0', transform: 'translateY(15px)',
transition: 'opacity 0.5s ease 0.3s, transform 0.5s ease 0.3s'
});
card.appendChild(mainT);
// sub text - 使用logo的灰色副文字风格
const subT = document.createElement('div');
subT.id = 'Yuze-holo-sub';
subT.innerHTML = 'This is for you！！！';
Object.assign(subT.style, {
fontFamily: '"SF Pro Display","PingFang SC",sans-serif',
fontSize: '24px', fontWeight: '600', letterSpacing: '8px',
color: '#808080', // logo副文字灰色
marginTop: '14px',
position: 'relative', zIndex: 3,
textShadow: '0 0 10px rgba(139, 69, 19, 0.3), 0 0 20px rgba(180, 150, 120, 0.2)', // 棕色发光
opacity: '0', transform: 'translateY(15px)',
transition: 'opacity 0.5s ease 0.55s, transform 0.5s ease 0.55s'
});
card.appendChild(subT);
wrapper.appendChild(card);
document.body.appendChild(wrapper);
const styleEl = document.createElement('style');
styleEl.id = 'Yuze-holo-style';
styleEl.textContent = '@keyframes glitchOut{0%,80%{opacity:1;transform:translate(0) scale(1)}82%{transform:translate(-3px,2px) scale(1.01)}85%{opacity:0.6;transform:translate(4px,-1px) scale(0.99)}88%{transform:translate(-2px,3px)}90%{opacity:0.3;transform:translate(3px,-2px) scale(1.02)}93%{opacity:0.15;transform:translate(-1px,1px) scale(0.98)}100%{opacity:0;transform:scale(0.6) rotateY(90deg)}}';
document.head.appendChild(styleEl);
// animate in
requestAnimationFrame(() => {
card.style.transform = 'scale(1) rotateY(0deg)';
card.style.opacity = '1';
mainT.style.opacity = '1';
mainT.style.transform = 'translateY(0)';
subT.style.opacity = '1';
subT.style.transform = 'translateY(0)';
});
// animate out with glitch
setTimeout(() => {
card.style.transition = 'none';
card.style.animation = 'glitchOut 1.2s ease-in forwards';
mainT.style.transition = 'opacity 0.4s ease 0.3s';
subT.style.transition = 'opacity 0.3s ease 0.2s';
mainT.style.opacity = '0';
subT.style.opacity = '0';
setTimeout(() => {
wrapper.remove();
styleEl.remove();
}, 1500);
}, 5000);
}
setTimeout(showHoloMessage, 800);

// --- MAIN LOOP ---
let lastTime = performance.now();
let phaseTimer = 0;
let exitProgress = 0;
function animate(now) {
const dt = now - lastTime;
lastTime = now;
phaseTimer += dt;
// phase transitions
if (phase === PHASE_ENTER && phaseTimer >= ENTER_DUR) {
phase = PHASE_HOLD; phaseTimer = 0;
} else if (phase === PHASE_HOLD && phaseTimer >= HOLD_DUR) {
phase = PHASE_EXIT; phaseTimer = 0;
// exit burst
for (let i = 0; i < 40; i++) burstParticles.push(new BurstParticle(CX, CY, pick(ALL_COLORS), rand(3, 10)));
shockwaves.push(new Shockwave(CX, CY, 400));
} else if (phase === PHASE_EXIT && phaseTimer >= EXIT_DUR) {
phase = PHASE_DONE;
}
// global alpha
if (phase === PHASE_ENTER) globalAlpha = clamp(phaseTimer / 600, 0, 1);
else if (phase === PHASE_HOLD) globalAlpha = 1;
else if (phase === PHASE_EXIT) globalAlpha = clamp(1 - phaseTimer / EXIT_DUR, 0, 1);
exitProgress = phase === PHASE_EXIT ? clamp(phaseTimer / EXIT_DUR, 0, 1) : 0;
// CLEAR EVERY FRAME
ctx.clearRect(0, 0, W, H);
// light vignette background (保持淡雅背景)
if (globalAlpha > 0.01) {
const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.7);
bg.addColorStop(0, rgba([245, 240, 235], 0.3 * globalAlpha)); // 更亮的背景
bg.addColorStop(1, rgba([235, 230, 225], 0.6 * globalAlpha));
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);
}
// data streams
streams.forEach(s => { s.update(dt, exitProgress); s.draw(); });
// shockwaves
for (let i = shockwaves.length - 1; i >= 0; i--) {
shockwaves[i].update();
shockwaves[i].draw();
if (shockwaves[i].alpha <= 0) shockwaves.splice(i, 1);
}
// rings
rings.forEach(r => { r.update(dt, exitProgress); r.draw(); });
// neural
neuralNodes.forEach(n => { n.update(dt, exitProgress); n.draw(); });
drawNeuralConnections(exitProgress);
// core
updateCore(exitProgress);
drawCore();
// burst particles
for (let i = burstParticles.length - 1; i >= 0; i--) {
burstParticles[i].update();
burstParticles[i].draw();
if (burstParticles[i].life <= 0) burstParticles.splice(i, 1);
}
// scan line
drawScanLine(exitProgress);
if (phase !== PHASE_DONE) {
requestAnimationFrame(animate);
} else {
ctx.clearRect(0, 0, W, H);
// wait for text card to finish, then remove overlay
setTimeout(() => { overlay.remove(); }, 2000);
}
}
requestAnimationFrame(animate);
})();