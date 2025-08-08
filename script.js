// BloomBuds — MochiBloop Mini HTML5 Game (no external assets)
// script.js

// Canvas and drawing
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', {alpha: true});
const W = canvas.width;
const H = canvas.height;

// UI elements
const tapCountEl = document.getElementById('tapCount');
const resetBtn = document.getElementById('resetBtn');
const popup = document.getElementById('popup');
const closePopup = document.getElementById('closePopup');

let taps = 0;
let bloop = {
  x: W/2,
  y: H/2 - 40,
  radius: 50,
  scale: 1,
  eyeRadius: 6,
  sparkleParticles: []
};

// Audio: calming ambient (synth) using WebAudio
let audioCtx, masterGain, oscillator, lfo;
function startAmbient(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.08; // gentle
  masterGain.connect(audioCtx.destination);

  // warm pad via two oscillators + lowpass
  const o1 = audioCtx.createOscillator();
  const o2 = audioCtx.createOscillator();
  o1.type = 'sine';
  o2.type = 'triangle';
  o1.frequency.value = 110; // low
  o2.frequency.value = 220;
  const oGain = audioCtx.createGain();
  oGain.gain.value = 0.6;
  const lp = audioCtx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;

  o1.connect(oGain); o2.connect(oGain);
  oGain.connect(lp); lp.connect(masterGain);

  // slow tremolo via LFO
  lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 0.15;
  lfoGain.gain.value = 0.03;
  lfo.connect(lfoGain);
  lfoGain.connect(masterGain.gain);

  o1.start(); o2.start(); lfo.start();
  // release automatically after user gesture? Keep running quietly
}

// Draw functions
function drawBackground(){
  // subtle ground
  ctx.fillStyle = 'rgba(240,255,250,0.6)';
  ctx.fillRect(0,0,W,H);
}

function drawBloop(){
  const r = bloop.radius * bloop.scale;

  // body (soft circle with subtle gradient)
  const g = ctx.createRadialGradient(bloop.x - r*0.2, bloop.y - r*0.2, r*0.1, bloop.x, bloop.y, r);
  g.addColorStop(0, '#dfffe9');
  g.addColorStop(0.4, '#bff4d4'); // mint
  g.addColorStop(1, '#9fe6b8');
  ctx.fillStyle = g;
  roundCircle(ctx, bloop.x, bloop.y, r);
  ctx.fill();

  // eyes
  const eyeY = bloop.y - r*0.15;
  const eyeXOff = r*0.35;
  ctx.fillStyle = '#0b2c18';
  ctx.beginPath(); ctx.arc(bloop.x-eyeXOff, eyeY, bloop.eyeRadius, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(bloop.x+eyeXOff, eyeY, bloop.eyeRadius, 0, Math.PI*2); ctx.fill();

  // small chain/watch: simple small circle on top-right
  ctx.fillStyle = '#ffeab3';
  ctx.beginPath(); ctx.arc(bloop.x + r*0.55, bloop.y + r*0.1, r*0.18, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#f0c06d';
  ctx.beginPath(); ctx.arc(bloop.x + r*0.55, bloop.y + r*0.1, r*0.08, 0, Math.PI*2); ctx.fill();
}

function roundCircle(ctx, x, y, r){
  ctx.beginPath();
  ctx.arc(x,y,r,0,Math.PI*2);
  ctx.closePath();
}

// sparkle particles (for evolution)
function spawnSparkles(){
  for(let i=0;i<28;i++){
    bloop.sparkleParticles.push({
      x: bloop.x,
      y: bloop.y - bloop.radius * bloop.scale * 0.2,
      vx: (Math.random()-0.5) * 4,
      vy: -Math.random()*3 - 1,
      life: 60 + Math.random()*30,
      size: 2 + Math.random()*3,
      hue: 140 + Math.random()*40
    });
  }
}
function updateSparkles(){
  bloop.sparkleParticles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.08; // gravity down
    p.life--;
  });
  bloop.sparkleParticles = bloop.sparkleParticles.filter(p => p.life>0);
}
function drawSparkles(){
  bloop.sparkleParticles.forEach(p=>{
    ctx.fillStyle = `hsla(${p.hue},70%,60%,${p.life/100})`;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
  });
}

// game loop
function loop(){
  ctx.clearRect(0,0,W,H);
  drawBackground();

  // gentle bob
  bloop.y = H/2 - 40 + Math.sin(Date.now()/1200)*6;

  drawBloop();
  drawSparkles();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Tap handling (support mouse + touch)
function handleTap(clientX, clientY){
  // map to canvas coordinates
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);

  // simple hit test
  const dx = x - bloop.x;
  const dy = y - bloop.y;
  if(Math.sqrt(dx*dx + dy*dy) <= bloop.radius * bloop.scale + 10){
    // grow a bit
    bloop.scale *= 1.05;
    // clamp
    if(bloop.scale > 2.4) bloop.scale = 2.4;
    taps++;
    tapCountEl.textContent = `Taps: ${taps}`;

    // subtle pulse sound
    playTapSound();

    // small bounce animation via timeout
    const prev = bloop.scale;
    // check evolution every 5 taps
    if(taps % 5 === 0){
      showEvolution();
    }
  }
}

canvas.addEventListener('pointerdown', (e)=>{
  // start audio on first gesture (required by browsers)
  startAmbient();
  handleTap(e.clientX, e.clientY);
});

// reset
resetBtn.addEventListener('click', ()=>{
  taps = 0;
  bloop.scale = 1;
  tapCountEl.textContent = `Taps: ${taps}`;
});

// popup handlers
function showEvolution(){
  spawnSparkles();
  popup.classList.remove('hidden');
}
closePopup.addEventListener('click', ()=>{
  popup.classList.add('hidden');
});

// simple tap sound using WebAudio
function playTapSound(){
  if(!audioCtx) startAmbient();
  const ctx = audioCtx;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.value = 450 + Math.random()*30;
  g.gain.value = 0.0001;
  o.connect(g); g.connect(masterGain);
  const now = ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.08, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  o.start(now);
  o.stop(now + 0.4);
}

// make canvas responsive visually
function resizeCanvas(){
  const scale = Math.min(400, window.innerWidth - 32);
  canvas.style.width = scale + 'px';
  canvas.style.height = (scale * 640/360) + 'px';
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// small helper to allow keyboard reset for testing
window.addEventListener('keydown', (e)=>{
  if(e.key === 'r') {
    taps = 0;
    bloop.scale = 1;
    tapCountEl.textContent = `Taps: ${taps}`;
  }
});
