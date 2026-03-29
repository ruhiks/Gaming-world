"use strict";
document.addEventListener("DOMContentLoaded", () => {
/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");
/* ================= CONSTANTS ================= */
const GRAVITY    = 0.9;
const SPEED      = 5;
const JUMP       = 16;
const FAST_FALL  = 1.8;
const FALL_DEATH_Y = canvas.height + 60;
const CLOUD_SPEED  = 0.4;
const MAX_LIVES    = 3;
/* ================= STATE ================= */
let levelIndex = 0;
let gameOver   = false;
let levelWin   = false;
let finalWin   = false;
let winTimer   = 0;
let bgX        = 0;
let frameCount = 0;
let lives      = MAX_LIVES;
let isDead     = false;
/* Castle Entering Animation */
let isEnteringCastle = false;
let enterTimer       = 0;
let castleDoorOpen   = 0; // 0.0 to 1.0 (width of open door)
/* Fade-to-black transition */
let fadeAlpha    = 0;
let fadingOut    = false;
let fadingIn     = false;
let fadeCallback = null;
/* Screen Shake */
let shakeTime = 0;
let shakeX = 0, shakeY = 0;
/* Trails, fireworks */
let playerTrails = [];
let fireworks    = [];
/* Background runes */
let runes = [];
for (let i = 0; i < 14; i++) {
  runes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size:  14 + Math.random() * 18,
    alpha: 0.05 + Math.random() * 0.12,
    speed: 0.15 + Math.random() * 0.3,
    symbol: ["✦","✧","⬡","◈","⟡","⋆","✺","❋","⌖","⊕","⌘","⍟","☽","⚡"][i % 14]
  });
}
/* ================= ASSETS ================= */
const load = s => { const i = new Image(); i.src = s; return i; };
const bg       = load("assets/bg.png");
const wizard   = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg= load("assets/castle.png");
const dragonImg= load("assets/dragon.png");
let para1X = 0, para2X = 0;
/* ================= AUDIO ================= */
const bgm       = new Audio("assets/music.mp3");
bgm.loop = true;
const deathSound = new Audio("assets/death.mp3");
window.addEventListener("keydown", () => bgm.play().catch(()=>{}), { once:true });
/* ================= PLAYER ================= */
const player = {
  x:0, y:0, w:60, h:60,
  vx:0, vy:0,
  onGround:false,
  facing:true
};
/* ================= PARTICLES ================= */
let particles = [];
function spawnParticles(x, y, color, count=10, speed=2, life=40, size=3) {
  for (let i=0; i<count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const mag   = Math.random() * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle)*mag, vy: Math.sin(angle)*mag,
      life: life + Math.random()*20, maxLife: life+20,
      color, size: Math.random()*size+1
    });
  }
}
function spark(x,y)      { spawnParticles(x,y,"gold",8,5,50,4); }
function magicSpark(x,y) { spawnParticles(x,y,"cyan",3,2,60,3); }
function dragonBreath(x,y) {
  for (let i=0;i<10;i++) {
    const spread=(Math.random()-0.5)*1.4;
    const spd=3+Math.random()*5;
    particles.push({
      x,y, vx:-spd+spread, vy:spread*0.5,
      life:55+Math.random()*20, maxLife:75,
      color:["#ff4500","#ff8c00","#ffd700"][Math.floor(Math.random()*3)],
      size:3+Math.random()*4
    });
  }
}
function lavaParticle(x,y) {
  spawnParticles(x, y, "#ff4500", 2, 2, 30, 3);
}
/* ================= FIREWORKS ================= */
function spawnFirework(x,y) {
  const hue=Math.floor(Math.random()*360);
  for (let i=0;i<70;i++) {
    const angle=(i/70)*Math.PI*2, spd=3+Math.random()*6;
    fireworks.push({
      x,y, vx:Math.cos(angle)*spd, vy:Math.sin(angle)*spd-1,
      life:90+Math.random()*40, maxLife:130,
      color:`hsl(${hue+Math.random()*40},100%,65%)`, size:3+Math.random()*3, gravity:0.08
    });
  }
}
/* ================= FADE ================= */
function startFade(callback) {
  fadingOut=true; fadeAlpha=0; fadeCallback=callback;
}
/* ================= OBJECTS ================= */
let blocks=[], spikes=[], castle={}, fireballs=[];
let hasLava = false; 
const dragonObj = {
  x:0, y:0, baseY:0, w:120, h:100,
  minX:0, maxX:0, moveSpeed:0, moveDir:-1,
  dir:-1, attackTimer:0, active:false,
  fireRate:120 
};
class Fireball {
  constructor(x,y,dir) {
    this.x=x; this.y=y; this.w=25; this.h=25;
    this.vx=dir*6; this.life=120;
  }
  update() {
    this.x+=this.vx; this.life--;
    if (frameCount%3===0)
      spawnParticles(this.x+12,this.y+12,"#ff8c00",3,2,20,3);
  }
  draw() {
    ctx.save();
    ctx.shadowColor="#ff4500"; ctx.shadowBlur=20;
    ctx.fillStyle="#ff4500";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle="#ffd700";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="white";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
/* ================= LEVEL DATA ================= */
const levels = [
  /* === LEVEL 1 === */
  {
    start:{x:40,y:420},
    blocks:[
      {x:0,  y:500,w:960,h:40, type:'static'},
      {x:300,y:430,w:160,h:30, type:'static'},
      {x:600,y:360,w:160,h:30, type:'moving',vx:2,minX:550,maxX:750}
    ],
    spikes:[{x:420,y:470,w:40,h:30}],
    castle:{x:820,y:170,w:130,h:160},
    dragon:{x:720,y:240,active:true,fireRate:120, minX:650, maxX:750, moveSpeed: 1.5},
    hasLava:false
  },
  /* === LEVEL 2 === */
  {
    start:{x:40,y:420},
    blocks:[
      {x:0,  y:500,w:200,h:40, type:'static'},
      {x:260,y:430,w:120,h:30, type:'moving',vy:2,minY:300,maxY:430},
      {x:450,y:350,w:120,h:30, type:'static'},
      {x:650,y:280,w:120,h:30, type:'static'}
    ],
    spikes:[
      {x:200,y:500,w:100,h:30},
      {x:500,y:500,w:100,h:30}
    ],
    castle:{x:820,y:100,w:130,h:160},
    dragon:{x:730,y:180,active:true,fireRate:110, minX:600, maxX:750, moveSpeed: 2.5},
    hasLava:true
  },
  /* === LEVEL 3 === */
  {
    start:{x:20,y:450},
    blocks:[
      {x:0,  y:520,w:150,h:30, type:'static'},
      {x:200,y:450,w:100,h:25, type:'moving',vx:3,minX:200,maxX:400},
      {x:360,y:350,w:100,h:25, type:'static'},
      {x:520,y:250,w:100,h:25, type:'moving',vy:-2,minY:150,maxY:350},
      {x:700,y:180,w:200,h:30, type:'static'}
    ],
    spikes:[{x:150,y:520,w:450,h:30}],
    castle:{x:820,y:40,w:130,h:160},
    dragon:{x:730,y:100,active:true,fireRate:90, minX:630, maxX:800, moveSpeed: 3.5},
    hasLava:true
  },
  /* === LEVEL 4 — THE INFERNO DUNGEON === */
  {
    start:{x:20,y:350},
    blocks:[
      {x:0,  y:460,w:110,h:30, type:'static'},
      {x:180,y:400,w:90, h:25, type:'moving',vx:3,minX:150,maxX:330},
      {x:380,y:340,w:70, h:25, type:'static'},
      {x:490,y:280,w:130,h:25, type:'static'},
      {x:670,y:300,w:80, h:25, type:'moving',vy:4,minY:180,maxY:370},
      {x:780,y:200,w:70, h:25, type:'static'},
      {x:650,y:120,w:100,h:25, type:'moving',vx:4,minX:550,maxX:760},
      {x:820,y:80, w:140,h:30, type:'static'}
    ],
    spikes:[
      {x:510,y:252,w:30,h:28},
      {x:560,y:252,w:30,h:28},
      {x:290,y:432,w:60,h:28},
      {x:430,y:312,w:40,h:28},
    ],
    castle:{x:820,y:-80,w:140,h:160},
    dragon:{x:700,y:40, active:true, fireRate:80, minX:550, maxX:820, moveSpeed: 4}, 
    hasLava:true 
  }
];
function loadLevel(i) {
  if (i >= levels.length) { finalWin=true; levelWin=false; return; }
  const l = levels[i];
  blocks   = l.blocks.map(b => ({...b, ox:b.x, oy:b.y, dir:1}));
  spikes   = l.spikes;
  castle   = l.castle;
  hasLava  = l.hasLava || false;
  if (l.dragon) {
    dragonObj.x=l.dragon.x; dragonObj.y=l.dragon.y;
    dragonObj.baseY=l.dragon.y; dragonObj.active=l.dragon.active;
    dragonObj.fireRate=l.dragon.fireRate || 120;
    dragonObj.minX=l.dragon.minX || l.dragon.x;
    dragonObj.maxX=l.dragon.maxX || l.dragon.x;
    dragonObj.moveSpeed=l.dragon.moveSpeed || 0;
    dragonObj.moveDir=-1;
    dragonObj.attackTimer=0;
  } else { dragonObj.active=false; }
  fireballs=[]; particles=[]; playerTrails=[]; fireworks=[];
  player.x=l.start.x; player.y=l.start.y; player.vx=0; player.vy=0;
  
  gameOver=false; levelWin=false; winTimer=0; 
  isEnteringCastle=false; enterTimer=0; castleDoorOpen=0;
  isDead=false;
}
function die() {
  if (isDead) return;
  isDead = true; 
  lives--;
  deathSound.play().catch(()=>{});
  triggerShake();
  
  if (lives<=0) {
    lives=MAX_LIVES;
    gameOver=true;
  } else {
    startFade(() => { loadLevel(levelIndex); });
  }
}
/* ================= INPUT ================= */
const keys={};
window.addEventListener("keydown", e => {
  keys[e.code]=true;
  if (e.code==="KeyR") {
    if (finalWin) { levelIndex=0; finalWin=false; lives=MAX_LIVES; loadLevel(0); }
    else if (gameOver) { lives=MAX_LIVES; loadLevel(levelIndex); gameOver=false; }
  }
});
window.addEventListener("keyup", e => keys[e.code]=false);
/* ================= COLLISION ================= */
const hit=(a,b)=>(
  a.x<b.x+b.w && a.x+a.w>b.x &&
  a.y<b.y+b.h && a.y+a.h>b.y
);
/* ================= SCREEN SHAKE ================= */
function triggerShake(dur=14, mag=9) {
  shakeTime=dur;
  shakeX=(Math.random()-0.5)*mag;
  shakeY=(Math.random()-0.5)*mag;
}
/* ================= UPDATE ================= */
function update() {
  frameCount++;
  /* Parallax */
  bgX   -= CLOUD_SPEED; para1X -= CLOUD_SPEED*0.5; para2X -= CLOUD_SPEED*0.25;
  if (bgX   <= -canvas.width) bgX=0;
  if (para1X<= -canvas.width) para1X=0;
  if (para2X<= -canvas.width) para2X=0;
  if (shakeTime>0) {
    shakeTime--; shakeX=(Math.random()-0.5)*7; shakeY=(Math.random()-0.5)*7;
  } else { shakeX=0; shakeY=0; }
  /* Fade transition logic */
  if (fadingOut) {
    fadeAlpha+=0.05;
    if (fadeAlpha>=1) { fadeAlpha=1; fadingOut=false; fadingIn=true; if(fadeCallback){fadeCallback(); fadeCallback=null;} }
  }
  if (fadingIn) {
    fadeAlpha-=0.05;
    if (fadeAlpha<=0) { fadeAlpha=0; fadingIn=false; }
  }
  /* Rune drift */
  runes.forEach(r => { r.y-=r.speed; if(r.y<-30){r.y=canvas.height+20; r.x=Math.random()*canvas.width;} });
  /* Castle Door ambient sparkles */
  if (!finalWin && frameCount % 6 === 0) {
     spawnParticles(castle.x + 65, castle.y + 110, "cyan", 1, 1, 40, 3);
     spawnParticles(castle.x + 65, castle.y + 110, "gold", 1, 1, 40, 2);
  }
  if (gameOver || finalWin) {
    if (finalWin && frameCount%35===0)
      spawnFirework(150+Math.random()*(canvas.width-300), 50+Math.random()*(canvas.height-150));
    updateFireworks(); updateParticles(); return;
  }
  /* Moving platforms */
  blocks.forEach(b => {
    if (b.type==='moving') {
      if (b.vx) { b.x+=b.vx*b.dir; if(b.x>b.maxX||b.x<b.minX) b.dir*=-1; }
      if (b.vy) { b.y+=b.vy*b.dir; if(b.y>b.maxY||b.y<b.minY) b.dir*=-1; }
    }
  });
  /* Lava particles */
  if (hasLava && frameCount%6===0) {
    lavaParticle(Math.random()*canvas.width, canvas.height-20);
  }
  /* Level Complete Timer */
  if (levelWin) {
    winTimer++;
    if (winTimer>120) { levelWin=false; levelIndex++; startFade(()=>loadLevel(levelIndex)); }
    updateParticles();
    return;
  }
  /* Player Movement & Entering Castle Logic */
  player.vx=0;
  if (keys.ArrowLeft  && !isEnteringCastle) { player.vx=-SPEED; player.facing=false; }
  if (keys.ArrowRight && !isEnteringCastle) { player.vx=SPEED;  player.facing=true;  }
  if (keys.Space && player.onGround && !isDead && !fadingOut && !isEnteringCastle) player.vy=-JUMP;
  if (keys.ArrowDown  && !isEnteringCastle) player.vy+=FAST_FALL;
  if (isEnteringCastle) {
      // Lerp player towards center of the doorway
      const doorCenterX = castle.x + castle.w/2 - player.w/2;
      const doorFloorY  = castle.y + castle.h - player.h - 15;
      player.x += (doorCenterX - player.x) * 0.12;
      player.y += (doorFloorY - player.y) * 0.12;
      enterTimer++;
      castleDoorOpen = Math.min(1, enterTimer / 30); // Door opens over 30 frames
      
      if (enterTimer > 60) {
          isEnteringCastle = false;
          levelWin = true; // Complete entry animation, trigger level finish
          winTimer = 0;
      }
      
  } else if (!isDead && !fadingOut) {
      player.vy+=GRAVITY;
      player.x+=player.vx; player.y+=player.vy;
  } else {
      player.vy+=GRAVITY;
      player.y+=player.vy; // Let them fall naturally into the void
  }
  
  if (!isEnteringCastle) {
      player.onGround=false;
      blocks.forEach(b=>{
        if (hit(player,b) && player.vy>=0 && player.y+player.h-player.vy<=b.y+(b.vy||0)+5){
          player.y=b.y-player.h; player.vy=0; player.onGround=true;
          if (b.type==='moving'&&b.vx) player.x+=b.vx*b.dir;
        }
      });
  }
  /* Player trail when moving fast */
  if (!isEnteringCastle && (Math.abs(player.vx)>0.5 || Math.abs(player.vy)>1)) {
    playerTrails.push({x:player.x, y:player.y, life:10, maxLife:10});
  }
  playerTrails = playerTrails.filter(t=>{t.life--;return t.life>0;});
  /* Dragon Patrolling & Hover */
  if (dragonObj.active) {
    dragonObj.y=dragonObj.baseY+Math.sin(frameCount*0.04)*10;
    if (dragonObj.minX !== dragonObj.maxX) {
       dragonObj.x += dragonObj.moveSpeed * dragonObj.moveDir;
       if (dragonObj.x <= dragonObj.minX || dragonObj.x >= dragonObj.maxX) {
           dragonObj.moveDir *= -1; 
       }
    }
    dragonObj.attackTimer++;
    if (dragonObj.attackTimer>dragonObj.fireRate) {
      const dir=(player.x<dragonObj.x)?-1:1;
      dragonObj.dir=dir;
      fireballs.push(new Fireball(dragonObj.x+(dir===1?dragonObj.w:0), dragonObj.y+40, dir));
      dragonObj.attackTimer=0;
    }
  }
  /* Fireballs */
  for (let i=fireballs.length-1;i>=0;i--) {
    fireballs[i].update();
    if (fireballs[i].life<=0||fireballs[i].x<0||fireballs[i].x>canvas.width) fireballs.splice(i,1);
  }
  /* Collision fixes - Disable ALL collision checks when transitioning or dying */
  if (!isDead && !levelWin && !gameOver && !fadingOut && !fadingIn && !isEnteringCastle) {
      if (player.y>FALL_DEATH_Y) die();
      else if (hasLava && player.y>canvas.height-30) die();
      else {
          spikes.forEach(s=>{ if(!isDead && hit(player,s)) die(); });
          if (!isDead && hit(player,castle)) {
              isEnteringCastle = true; 
              enterTimer = 0;
          }
      }
  }
  updateParticles();
}
function updateParticles() {
  particles.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;});
  particles=particles.filter(p=>p.life>0);
}
function updateFireworks() {
  fireworks.forEach(f=>{f.x+=f.vx;f.y+=f.vy;f.vy+=f.gravity;f.life--;});
  fireworks=fireworks.filter(f=>f.life>0);
}
/* ================= DRAW: 3D BLOCK ================= */
function draw3DBlock(b) {
  const D=16; 
  const bx=b.x,by=b.y,bw=b.w,bh=b.h;
  ctx.save();
  ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=14; ctx.shadowOffsetY=8;
  ctx.fillStyle="black";
  ctx.fillRect(bx,by,bw,bh);
  ctx.restore();
  ctx.drawImage(blockImg, bx, by, bw, bh);
  const bottomGrad=ctx.createLinearGradient(0, by+bh, 0, by+bh+D);
  bottomGrad.addColorStop(0,"rgba(0,0,0,0.85)");
  bottomGrad.addColorStop(1,"rgba(0,0,0,0.45)");
  ctx.fillStyle=bottomGrad;
  ctx.beginPath();
  ctx.moveTo(bx,    by+bh);
  ctx.lineTo(bx+D,  by+bh+D);
  ctx.lineTo(bx+bw+D, by+bh+D);
  ctx.lineTo(bx+bw, by+bh);
  ctx.closePath(); ctx.fill();
  const rightGrad=ctx.createLinearGradient(bx+bw, 0, bx+bw+D, 0);
  rightGrad.addColorStop(0,"rgba(0,0,0,0.7)");
  rightGrad.addColorStop(1,"rgba(0,0,0,0.3)");
  ctx.fillStyle=rightGrad;
  ctx.beginPath();
  ctx.moveTo(bx+bw,   by);
  ctx.lineTo(bx+bw+D, by+D);
  ctx.lineTo(bx+bw+D, by+bh+D);
  ctx.lineTo(bx+bw,   by+bh);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle="rgba(0,0,0,0.35)";
  ctx.fillRect(bx, by, bw, 6);
  ctx.strokeStyle="rgba(255,255,255,0.4)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+bw,by); ctx.stroke();
  if (b.type==='moving') {
    const pulse=0.5+0.5*Math.sin(frameCount*0.1);
    ctx.save();
    ctx.shadowColor=`rgba(0,220,255,${0.6*pulse+0.2})`; ctx.shadowBlur=16;
    ctx.strokeStyle=`rgba(0,220,255,${0.5*pulse+0.2})`; ctx.lineWidth=2.5;
    ctx.strokeRect(bx,by,bw,bh);
    ctx.restore();
  }
}
/* ================= DRAW: LAVA FLOOR ================= */
function drawLava() {
  const t=frameCount*0.04;
  const lavaY=canvas.height-28;
  const h=40;
  const grad=ctx.createLinearGradient(0,lavaY,0,canvas.height);
  grad.addColorStop(0,"#ff4500"); grad.addColorStop(0.4,"#cc2200"); grad.addColorStop(1,"#550000");
  ctx.fillStyle=grad;
  ctx.beginPath(); ctx.moveTo(0,canvas.height); ctx.lineTo(0,lavaY);
  for (let x=0;x<=canvas.width;x+=20)
    ctx.lineTo(x, lavaY + Math.sin(t+x*0.04)*6);
  ctx.lineTo(canvas.width,canvas.height); ctx.closePath(); ctx.fill();
  const glow=ctx.createLinearGradient(0,lavaY-20,0,lavaY+h);
  glow.addColorStop(0,"rgba(255,100,0,0.0)");
  glow.addColorStop(0.5,"rgba(255,80,0,0.35)");
  glow.addColorStop(1,"rgba(200,0,0,0.0)");
  ctx.fillStyle=glow;
  ctx.fillRect(0,lavaY-20,canvas.width,h+20);
}
/* ================= DRAW: LIVES UI ================= */
function drawLives() {
  ctx.save();
  ctx.font="22px Arial"; ctx.fillStyle="white";
  ctx.shadowColor="black"; ctx.shadowBlur=4;
  ctx.fillText("❤".repeat(lives) + "♡".repeat(MAX_LIVES-lives), 20, 30);
  ctx.restore();
}
/* ================= DRAW ================= */
function draw() {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10,-10,canvas.width+20,canvas.height+20);
  /* Background layers */
  ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, bgX+canvas.width, 0, canvas.width, canvas.height);
  ctx.globalAlpha=0.18;
  ctx.drawImage(bg, para1X, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, para1X+canvas.width, 0, canvas.width, canvas.height);
  ctx.globalAlpha=0.09;
  ctx.drawImage(bg, para2X, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, para2X+canvas.width, 0, canvas.width, canvas.height);
  ctx.globalAlpha=1;
  /* Depth fog */
  const fog=ctx.createLinearGradient(0,0,0,canvas.height);
  fog.addColorStop(0,"rgba(0,0,0,0)");
  fog.addColorStop(1,"rgba(0,0,0,0.35)");
  ctx.fillStyle=fog; ctx.fillRect(0,0,canvas.width,canvas.height);
  /* Floating runes */
  runes.forEach(r=>{
    ctx.save(); ctx.globalAlpha=r.alpha;
    ctx.fillStyle="#c8a0ff"; ctx.font=`${r.size}px serif`;
    ctx.fillText(r.symbol,r.x,r.y); ctx.restore();
  });
  /* Final win beams */
  if (finalWin) {
    const cx=canvas.width/2, cy=canvas.height/2, t=Date.now()*0.001;
    ctx.save(); ctx.translate(cx,cy);
    for (let i=0;i<16;i++) {
      ctx.save(); ctx.rotate((Math.PI*2/16)*i+t*0.4);
      const g=ctx.createLinearGradient(0,0,0,520);
      g.addColorStop(0,`hsla(${(i*22+t*40)%360},100%,70%,0.55)`); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(50,520);ctx.lineTo(-50,520);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  /* Lava */
  if (hasLava) drawLava();
  /* 3D Platforms */
  blocks.forEach(b=>draw3DBlock(b));
  /* Spikes */
  spikes.forEach(s=>{
    ctx.save();
    ctx.shadowColor="#ff2200"; ctx.shadowBlur=10;
    ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h);
    ctx.restore();
  });
  /* Castle */
  ctx.save();
  const gp=0.5+0.5*Math.sin(frameCount*0.07);
  ctx.shadowColor="gold"; ctx.shadowBlur=30+25*gp;
  ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
  ctx.restore();
  /* Dark Doorway Graphic for Entrance Animation */
  if (isEnteringCastle || levelWin || fadingOut) {
      let openRatio = castleDoorOpen;
      if (levelWin || fadingOut) openRatio = 1;
      
      ctx.save();
      ctx.fillStyle = "black";
      ctx.shadowColor = "black"; ctx.shadowBlur = 10;
      
      const doorW = 44 * openRatio; 
      const doorH = 75; 
      const doorX = castle.x + (castle.w/2) - (doorW/2);
      const doorY = castle.y + castle.h - doorH - 4; // slight off bottom
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.restore();
  }
  /* Dragon */
  if (dragonObj.active) {
    ctx.save();
    ctx.shadowColor="#9b00ff"; ctx.shadowBlur=28;
    if (dragonObj.moveDir > 0) {
        ctx.translate(dragonObj.x + dragonObj.w, dragonObj.y);
        ctx.scale(-1, 1);
        ctx.drawImage(dragonImg, 0, 0, dragonObj.w, dragonObj.h);
    } else {
        ctx.drawImage(dragonImg,dragonObj.x,dragonObj.y,dragonObj.w,dragonObj.h);
    }
    ctx.restore();
  }
  /* Fireballs */
  fireballs.forEach(fb=>fb.draw());
  /* Player trails */
  playerTrails.forEach(t=>{
    ctx.save();
    ctx.globalAlpha=t.life/t.maxLife*0.3;
    ctx.drawImage(wizard,t.x,t.y,80,80);
    ctx.restore();
  });
  /* Player */
  if (!gameOver && !finalWin) {
    let alpha = 1;
    if (isEnteringCastle) {
        // Player enters door and fades into darkness
        alpha = Math.max(0, 1 - Math.max(0, enterTimer - 15) / 30);
    } else if (levelWin || fadingOut) {
        alpha = 0; // Fully inside the castle
    }
    
    if (alpha > 0) {
        const bobY = (player.onGround && !isEnteringCastle) ? Math.sin(frameCount*0.12)*2:0;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor="#a0f0ff"; ctx.shadowBlur=22;
        ctx.drawImage(wizard,player.x,player.y+bobY,80,80);
        ctx.restore();
    }
  }
  /* Particles */
  particles.forEach(p=>{
    const a=Math.max(0,p.life/p.maxLife);
    ctx.save(); ctx.globalAlpha=a;
    ctx.shadowColor=p.color; ctx.shadowBlur=10;
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  /* Fireworks */
  fireworks.forEach(f=>{
    ctx.save(); ctx.globalAlpha=f.life/f.maxLife;
    ctx.shadowColor=f.color; ctx.shadowBlur=8; ctx.fillStyle=f.color;
    ctx.beginPath(); ctx.arc(f.x,f.y,f.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });
  /* HUD */
  if (!finalWin) {
    ctx.save();
    ctx.shadowColor="black"; ctx.shadowBlur=6;
    ctx.fillStyle="white"; ctx.font="bold 18px Arial";
    ctx.fillText("Level "+(levelIndex+1), 20, 56);
    ctx.restore();
    drawLives();
  }
  /* Game Over */
  if (gameOver) {
    ctx.save();
    ctx.fillStyle="rgba(0,0,0,0.6)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.textAlign="center";
    ctx.shadowColor="#ff0000"; ctx.shadowBlur=35;
    ctx.fillStyle="#ff4444"; ctx.font="bold 64px serif";
    ctx.fillText("GAME OVER",canvas.width/2,canvas.height/2-15);
    ctx.shadowBlur=0;
    ctx.fillStyle="white"; ctx.font="bold 24px Arial";
    ctx.fillText("You ran out of lives!",canvas.width/2,canvas.height/2+35);
    ctx.fillStyle="#ccc"; ctx.font="20px Arial";
    ctx.fillText("Press R to Restart",canvas.width/2,canvas.height/2+75);
    ctx.restore();
  }
  /* Level Complete (Clean, simplified iteration) */
  if (levelWin && !finalWin) {
    ctx.save(); 
    ctx.textAlign="center";
    // Fade in text up to 1 over first 30 frames of the win phase
    const fade = Math.min(1, winTimer / 30);
    ctx.globalAlpha = fade;
    
    ctx.shadowColor="rgba(0,0,0,0.8)"; 
    ctx.shadowBlur=8; 
    ctx.shadowOffsetY=4;
    ctx.fillStyle="#ffd700"; 
    ctx.font="bold 54px Arial";
    ctx.fillText("LEVEL COMPLETED!", canvas.width/2, canvas.height/2);
    ctx.restore();
  }
  /* Final Win */
  if (finalWin) {
    ctx.save(); ctx.textAlign="center";
    const text="DUNGEON CLEARED!";
    const charW=38;
    const startX=canvas.width/2 - (text.length*charW)/2;
    ctx.font="bold 64px serif";
    for (let ci=0;ci<text.length;ci++) {
      const wy=Math.sin(frameCount*0.08+ci*0.5)*9;
      ctx.fillStyle=`hsl(${(frameCount*2+ci*15)%360},100%,65%)`;
      ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=18;
      ctx.fillText(text[ci], startX+ci*charW, canvas.height/2+wy);
    }
    ctx.shadowBlur=0;
    ctx.fillStyle="white"; ctx.font="28px Arial";
    ctx.fillText("The Wizard is Victorious!",canvas.width/2,canvas.height/2+58);
    ctx.fillStyle="#aaa"; ctx.font="20px Arial";
    ctx.fillText("Press R to Play Again",canvas.width/2,canvas.height/2+96);
    ctx.restore();
  }
  /* Fade overlay */
  if (fadeAlpha>0) {
    ctx.save();
    ctx.globalAlpha=fadeAlpha;
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }
  ctx.restore(); // end shake
}
/* ================= LOOP ================= */
function loop() { update(); draw(); requestAnimationFrame(loop); }
/* ================= START ================= */
loadLevel(0);
loop();
});
