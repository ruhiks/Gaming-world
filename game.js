"use strict";

document.addEventListener("DOMContentLoaded", () => {

/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

/* ================= CONSTANTS & PHYSICS CONFIG ================= */
const FIXED_DT     = 1 / 60; // Deterministic 60Hz physics step
const MAX_DELTA    = 0.25;   // Prevent physics spiral on tab switch / lag spike
const GRAVITY      = 0.9;
const SPEED        = 5;
const JUMP         = 16;
const FAST_FALL    = 1.8;
const FALL_DEATH_Y = canvas.height + 60;
const CLOUD_SPEED  = 0.4;
const MAX_LIVES    = 3;
const MAX_HEALTH   = 3; // 3 Hearts

/* ================= PHASE 2A: PLATFORMING FEEL ================= */
const COYOTE_TIME         = 6;   // ~100ms at 60 Hz — frames after leaving ground where jump is still allowed
const JUMP_BUFFER_TIME    = 6;   // ~100ms at 60 Hz — frames before landing where a jump press is remembered
const JUMP_CUT_MULTIPLIER = 0.4; // multiplier applied to upward vy when jump key released early (tap = shorter hop)

/* ================= PHASE 2B: COLLISION TYPES ================= */
// Set block.collision in level data to control collision behavior:
//   'one-way' — top surface only; player can jump up through it (default for all existing platforms)
//   'solid'   — 4-directional; stops player on top, bottom, left, and right (for walls / enclosed rooms)
const COLLISION_ONE_WAY = 'one-way';
const COLLISION_SOLID   = 'solid';

/* ================= HITBOX CONFIGURATION ================= */
const PLAYER_CONFIG = {
  w: 48,             // Accurate collision width (tight to body)
  h: 64,             // Accurate collision height (head-to-feet)
  spriteW: 80,       // Visual render width
  spriteH: 80,       // Visual render height
  offsetX: -16,      // Center sprite over hitbox: (80 - 48)/2 = 16
  offsetY: -16       // Align feet with platform surface: 80 - 64 = 16
};

/* ================= STATE ================= */
let levelIndex = 0;
let gameOver   = false;
let levelWin   = false;
let finalWin   = false;
let winTimer   = 0;
let bgX        = 0;
let frameCount = 0;

/* Health & Lives */
let lives              = MAX_LIVES;
let hp                 = MAX_HEALTH;
let isDead             = false;
let invincibilityTimer = 0;

/* Combat */
let playerSpells  = [];
let shootCooldown = 0;

/* Castle Entering Animation */
let isEnteringCastle = false;
let enterTimer       = 0;
let castleDoorOpen   = 0; 

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

/* ================= ASSET PRELOADER & RESILIENCE ================= */
const ASSET_PATHS = {
  bg:     "assets/bg.png",
  wizard: "assets/wizard.png",
  block:  "assets/block.png",
  spike:  "assets/spike.png",
  castle: "assets/castle.png",
  dragon: "assets/dragon.png"
};

const images = {};
let assetsLoaded = 0;
const totalAssets = Object.keys(ASSET_PATHS).length;
let isLoaded = false;

function createProceduralDragonFallback() {
  const c = document.createElement("canvas");
  c.width = 120; c.height = 100;
  const cx = c.getContext("2d");
  cx.fillStyle = "#8a2be2";
  cx.beginPath();
  cx.ellipse(60, 50, 40, 25, 0, 0, Math.PI * 2);
  cx.fill();
  cx.fillStyle = "#ba55d3";
  cx.beginPath();
  cx.moveTo(40, 40); cx.lineTo(15, 10); cx.lineTo(45, 25); cx.lineTo(25, 5); cx.lineTo(65, 35);
  cx.closePath(); cx.fill();
  cx.fillStyle = "#ffd700";
  cx.beginPath(); cx.arc(85, 45, 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "#ff4500";
  cx.beginPath(); cx.arc(87, 45, 2.5, 0, Math.PI * 2); cx.fill();
  return c;
}

function preloadAssets(onComplete) {
  const entries = Object.entries(ASSET_PATHS);
  let count = 0;

  entries.forEach(([key, path]) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      images[key] = img;
      count++;
      assetsLoaded = count;
      if (count === totalAssets) {
        isLoaded = true;
        onComplete();
      }
    };
    img.onerror = () => {
      console.warn(`[AssetLoader] Could not load ${path}. Using fallback.`);
      if (key === "dragon") {
        images[key] = createProceduralDragonFallback();
      } else {
        const fallback = document.createElement("canvas");
        fallback.width = 64; fallback.height = 64;
        const fcx = fallback.getContext("2d");
        fcx.fillStyle = key === "spike" ? "#ff4444" : "#6a5acd";
        fcx.fillRect(0, 0, 64, 64);
        images[key] = fallback;
      }
      count++;
      assetsLoaded = count;
      if (count === totalAssets) {
        isLoaded = true;
        onComplete();
      }
    };
  });
}

let para1X = 0, para2X = 0;

/* ================= AUDIO & FALLBACKS ================= */
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(()=>{});
  }
  return audioCtx;
}

function playSynthTone(freqStart, freqEnd, duration, type="sawtooth") {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(10, freqEnd), ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch(e) {}
}

const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
const deathSound = new Audio("assets/death.mp3");

let audioUnlocked = false;
function unlockAudio() {
  if (!audioUnlocked) {
    getAudioContext();
    bgm.play().catch(()=>{});
    audioUnlocked = true;
  }
}
window.addEventListener("keydown", unlockAudio, { once:true });
window.addEventListener("touchstart", unlockAudio, { once:true });
window.addEventListener("click", unlockAudio, { once:true });

function playDeathAudio() {
  deathSound.play().catch(() => {
    playSynthTone(240, 40, 0.4, "sawtooth");
  });
}

/* ================= PLAYER OBJECT ================= */
const player = {
  x: 0,
  y: 0,
  w: PLAYER_CONFIG.w,
  h: PLAYER_CONFIG.h,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: true,
  standingPlatform: null,
  /* Phase 2A feel state */
  coyoteTimer: 0,    // counts down after leaving ground — allows late jumps
  jumpBuffer:  0,    // counts down after Space pressed in air — fires on next landing
  jumpHeld:    false, // true while jump key is held during the upward arc
  wasJumping:  false  // previous-frame Space state for rising-edge detection
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
function lavaParticle(x,y) { spawnParticles(x, y, "#ff4500", 2, 2, 30, 3); }

/* ================= FIREWORKS ================= */
function spawnFirework(x,y) {
  const hue = Math.floor(Math.random()*360);
  for (let i=0; i<70; i++) {
    const angle = (i/70)*Math.PI*2, spd=3+Math.random()*6;
    fireworks.push({
      x, y,
      vx: Math.cos(angle)*spd,
      vy: Math.sin(angle)*spd-1,
      life: 90+Math.random()*40,
      maxLife: 130,
      color: `hsl(${hue+Math.random()*40},100%,65%)`,
      size: 3+Math.random()*3,
      gravity: 0.08
    });
  }
}

/* ================= FADE ================= */
function startFade(callback) {
  fadingOut=true; fadeAlpha=0; fadeCallback=callback;
}

/* ================= OBJECTS & CLASSES ================= */
let blocks=[], spikes=[], castle={}, fireballs=[];
let hasLava = false; 

const dragonObj = {
  x:0, y:0, baseY:0, w:120, h:100,
  minX:0, maxX:0, moveSpeed:0, moveDir:-1,
  dir:-1, attackTimer:0, active:false,
  fireRate:120, hp:3, hitTimer: 0
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

class PlayerSpell {
  constructor(x,y,dir) {
    this.x=x; this.y=y; this.w=15; this.h=15;
    this.vx=dir*14; this.life=50;
  }
  update() {
    this.x+=this.vx; this.life--;
    if (frameCount%2===0) magicSpark(this.x+8,this.y+8);
  }
  draw() {
    ctx.save();
    ctx.shadowColor="cyan"; ctx.shadowBlur=18;
    ctx.fillStyle="white";
    ctx.beginPath(); ctx.arc(this.x+8,this.y+8,6,0,Math.PI*2); ctx.fill();
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
    dragon:{x:720,y:240,active:true,hp:3,fireRate:120, minX:650, maxX:750, moveSpeed: 1.5},
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
    dragon:{x:730,y:180,active:true,hp:4,fireRate:100, minX:600, maxX:750, moveSpeed: 2.5},
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
    dragon:{x:730,y:100,active:true,hp:5,fireRate:80, minX:630, maxX:800, moveSpeed: 3.5},
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
      {x:290,y:432,w:60,h:28},
      {x:430,y:312,w:40,h:28},
    ],
    castle:{x:820,y:-80,w:140,h:160},
    dragon:{x:700,y:40, active:true, hp:6, fireRate:70, minX:550, maxX:820, moveSpeed: 4}, 
    hasLava:true 
  }
];

function loadLevel(i) {
  if (i >= levels.length) { finalWin=true; levelWin=false; return; }
  const l = levels[i];
  // Spread block data and inject runtime fields.
  // collision defaults to COLLISION_ONE_WAY — all existing platforms are top-surface only.
  blocks   = l.blocks.map(b => ({
    ...b,
    ox: b.x, oy: b.y,
    dir: 1, deltaX: 0, deltaY: 0,
    collision: b.collision || COLLISION_ONE_WAY
  }));
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
    dragonObj.hp=l.dragon.hp || 3;
    dragonObj.hitTimer=0;
  } else { dragonObj.active=false; }

  fireballs=[]; particles=[]; playerTrails=[]; fireworks=[]; playerSpells=[];
  
  /* Reset Player Combat & Positioning */
  player.x=l.start.x; player.y=l.start.y; player.vx=0; player.vy=0;
  player.standingPlatform = null;
  player.onGround = false;
  /* Phase 2A: reset feel state */
  player.coyoteTimer = 0;
  player.jumpBuffer  = 0;
  player.jumpHeld    = false;
  player.wasJumping  = false;
  
  hp = MAX_HEALTH;
  invincibilityTimer = 0;
  shootCooldown = 0;
  
  gameOver=false; levelWin=false; winTimer=0; 
  isEnteringCastle=false; enterTimer=0; castleDoorOpen=0;
  isDead=false;
}

function die() {
  if (isDead) return;
  isDead = true; 
  lives--;
  playDeathAudio();
  triggerShake();
  
  if (lives<=0) {
    lives=MAX_LIVES;
    gameOver=true;
  } else {
    startFade(() => { loadLevel(levelIndex); });
  }
}

function damagePlayer() {
  if (invincibilityTimer > 0 || isDead || isEnteringCastle) return;
  hp--;
  invincibilityTimer = 90; // 1.5s iFrames
  triggerShake(12, 6);
  spawnParticles(player.x + player.w/2, player.y + player.h/2, "#ff0000", 12, 4, 30, 4);
  
  // Knockback!
  const kbDir = player.facing ? -1 : 1;
  player.vx = kbDir * 6;
  player.vy = -6;
  player.standingPlatform = null;
  player.onGround = false;

  if (hp <= 0) {
     die();
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

/* ================= MOBILE TOUCH LOGIC ================= */
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const mobileUI = document.getElementById("mobileUI");
    if (mobileUI) mobileUI.style.display = "flex";
}

let lastTapTime = 0;
window.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    if (tapLength < 400 && tapLength > 0) {
        if (gameOver) { lives=MAX_LIVES; loadLevel(levelIndex); gameOver=false; }
        else if (finalWin) { levelIndex=0; finalWin=false; lives=MAX_LIVES; loadLevel(0); }
    }
    lastTapTime = currentTime;
});

const bindBtn = (id, code) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const press = (e) => { 
        unlockAudio();
        if(e.cancelable) e.preventDefault(); 
        keys[code] = true; 
    };
    const release = (e) => { 
        if(e.cancelable) e.preventDefault(); 
        keys[code] = false; 
    };
    btn.addEventListener("touchstart", press, {passive: false});
    btn.addEventListener("touchend", release);
    btn.addEventListener("touchcancel", release);
};
bindBtn("btn-left", "ArrowLeft");
bindBtn("btn-right", "ArrowRight");
bindBtn("btn-jump", "Space");
bindBtn("btn-shoot", "KeyZ");

/* ================= COLLISION ================= */
const hit = (a, b) => (
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y
);

/* ================= SCREEN SHAKE ================= */
function triggerShake(dur=14, mag=9) {
  shakeTime=dur;
  shakeX=(Math.random()-0.5)*mag;
  shakeY=(Math.random()-0.5)*mag;
}

/* ================= PHASE 2B: COLLISION RESOLUTION ================= */
/**
 * resolveCollisions()
 *
 * Called once per physics tick, AFTER position integration.
 * Iterates every block and resolves overlap based on its collision type:
 *
 *   COLLISION_ONE_WAY — top surface only (original behavior, unchanged).
 *     The player lands on top when falling AND the previous-frame foot
 *     position was above the surface (with a speed+tolerance margin).
 *     The player passes freely through the bottom and sides.
 *
 *   COLLISION_SOLID — 4-directional MTV resolution.
 *     Computes per-axis overlap. The axis with smaller overlap is the
 *     separating axis → push the player out on that axis only.
 *     Side hit → zero vx.  Top hit → land + onGround.  Bottom hit → zero vy.
 *
 * Moving-platform passenger carry (handled before this call) sets
 * standingPlatform for moving platforms. This function may additionally
 * set it for one-way/solid landing. It is cleared here if no block
 * claims the ground this tick and the passenger system hasn't kept it.
 */
function resolveCollisions() {
  if (isEnteringCastle || isDead) return;

  let foundGround = false;

  blocks.forEach(b => {
    if (!hit(player, b)) return; // early-out — no overlap

    if (b.collision === COLLISION_SOLID) {
      /* ---- 4-directional MTV ---- */
      const overlapL = (player.x + player.w) - b.x;       // penetration from left
      const overlapR = (b.x + b.w) - player.x;             // penetration from right
      const overlapT = (player.y + player.h) - b.y;        // penetration from top
      const overlapB = (b.y + b.h) - player.y;             // penetration from bottom

      const minX = Math.min(overlapL, overlapR);
      const minY = Math.min(overlapT, overlapB);

      if (minX < minY) {
        /* --- Side collision (horizontal axis is shallowest) --- */
        if (overlapL < overlapR) {
          player.x = b.x - player.w;  // push left (hit right face of player)
        } else {
          player.x = b.x + b.w;       // push right (hit left face of player)
        }
        player.vx = 0;

      } else {
        /* --- Vertical collision (vertical axis is shallowest) --- */
        if (overlapT < overlapB) {
          /* Top surface — landing */
          player.y = b.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.standingPlatform = b;
          foundGround = true;
        } else {
          /* Bottom surface — ceiling hit */
          player.y = b.y + b.h;
          if (player.vy < 0) player.vy = 0; // kill upward momentum
        }
      }

    } else {
      /* ---- ONE-WAY: top surface only (original logic, preserved exactly) ---- */
      const platformSpeedY = b.vy ? Math.abs(b.vy) : 0;
      if (player.vy >= 0 && (player.y + player.h - player.vy) <= (b.y + platformSpeedY + 8)) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.standingPlatform = b;
        foundGround = true;
      }
    }
  });

  /* Ground-state maintenance:
   * 1. If player has a standingPlatform (static or moving), verify whether player is still atop it.
   * 2. If atop the platform surface within horizontal bounds, maintain onGround and foundGround.
   * 3. If player walked off edges or separated, clear static platform so gravity resumes next frame.
   * 4. If no ground contact confirmed, mark player airborne.
   */
  if (player.standingPlatform) {
    const sp = player.standingPlatform;
    const withinBounds = (player.x + player.w > sp.x && player.x < sp.x + sp.w);
    const atSurface = Math.abs((player.y + player.h) - sp.y) <= 2;
    if (withinBounds && atSurface) {
      player.onGround = true;
      foundGround = true;
    } else if (sp.type !== 'moving') {
      player.standingPlatform = null;
    }
  }

  if (!foundGround && !player.standingPlatform) {
    player.onGround = false;
  }
}

/* ================= UPDATE (FIXED TIMESTEP TICK) ================= */
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

  /* Update Moving Platforms & Track Deltas */
  blocks.forEach(b => {
    if (b.type==='moving') {
      const oldX = b.x;
      const oldY = b.y;

      if (b.vx) { b.x += b.vx * b.dir; if(b.x > b.maxX || b.x < b.minX) b.dir *= -1; }
      if (b.vy) { b.y += b.vy * b.dir; if(b.y > b.maxY || b.y < b.minY) b.dir *= -1; }

      b.deltaX = b.x - oldX;
      b.deltaY = b.y - oldY;
    } else {
      b.deltaX = 0;
      b.deltaY = 0;
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

  /* Timers */
  if (invincibilityTimer > 0) invincibilityTimer--;
  if (shootCooldown > 0) shootCooldown--;

  /* Combat mechanics */
  if (keys.KeyZ && shootCooldown <= 0 && !isEnteringCastle && !isDead && !fadingOut) {
      shootCooldown = 28;
      const dir = player.facing ? 1 : -1;
      const sx = player.x + (player.facing ? player.w + 4 : -16);
      const sy = player.y + player.h/2 - 6;
      playerSpells.push(new PlayerSpell(sx, sy, dir));
  }

  /* Player Spells vs Dragon */
  for (let i = playerSpells.length - 1; i >= 0; i--) {
      const sp = playerSpells[i];
      sp.update();
      if (dragonObj.active && dragonObj.hp > 0 && hit(sp, {x:dragonObj.x, y:dragonObj.y, w:dragonObj.w, h:dragonObj.h})) {
          dragonObj.hp--;
          dragonObj.hitTimer = 10;
          spark(sp.x+8, sp.y+8);
          playerSpells.splice(i, 1);
          
          if (dragonObj.hp <= 0) {
              dragonObj.active = false;
              spawnFirework(dragonObj.x+dragonObj.w/2, dragonObj.y+dragonObj.h/2);
              spawnFirework(dragonObj.x, dragonObj.y);
              spawnFirework(dragonObj.x+dragonObj.w, dragonObj.y+dragonObj.h);
          }
          continue;
      }
      if (sp.life <= 0 || sp.x < 0 || sp.x > canvas.width) playerSpells.splice(i, 1);
  }

  /* Passenger carriage on moving platforms */
  if (player.standingPlatform && player.standingPlatform.type === 'moving' && !isDead && !isEnteringCastle) {
    const sp = player.standingPlatform;
    player.x += sp.deltaX;
    player.y = sp.y - player.h;
    player.vy = 0;
    player.onGround = true;

    // Check if player walked off edges
    if (player.x + player.w <= sp.x || player.x >= sp.x + sp.w) {
      player.standingPlatform = null;
      player.onGround = false;
    }
  }

  /* Player Input Movement */
  if (!isEnteringCastle && invincibilityTimer < 80) {
      player.vx = 0;
      if (keys.ArrowLeft)  { player.vx = -SPEED; player.facing = false; }
      if (keys.ArrowRight) { player.vx = SPEED;  player.facing = true;  }

      /* --- Rising-edge jump detection (prevents held-key repeat) --- */
      const jumpPressed = keys.Space && !player.wasJumping;
      const jumpHeldNow = !!keys.Space;
      player.wasJumping = jumpHeldNow;

      /* --- Jump buffer: remember a press made in the air --- */
      if (jumpPressed) player.jumpBuffer = JUMP_BUFFER_TIME;
      if (player.jumpBuffer > 0) player.jumpBuffer--;

      /* --- Coyote time: grace period after walking off a ledge --- */
      if (player.onGround) {
        player.coyoteTimer = COYOTE_TIME; // refresh while grounded
      } else if (player.coyoteTimer > 0) {
        player.coyoteTimer--;             // count down in the air
      }

      /* --- Perform jump when buffer is active AND jump window is open --- */
      const canJump = player.coyoteTimer > 0 && !isDead && !fadingOut;
      if (player.jumpBuffer > 0 && canJump) {
        player.vy             = -JUMP;
        player.onGround       = false;
        player.standingPlatform = null;
        player.coyoteTimer    = 0; // consume coyote window — prevents double jump
        player.jumpBuffer     = 0; // consume buffer   — prevents repeated auto-jump
        player.jumpHeld       = true;
        playSynthTone(520, 260, 0.12, "sine");
      }

      /* --- Variable jump height: cut upward velocity on early key release --- */
      if (!jumpHeldNow && player.jumpHeld && player.vy < 0) {
        player.vy      *= JUMP_CUT_MULTIPLIER;
        player.jumpHeld = false;
      }
      if (!jumpHeldNow) player.jumpHeld = false;

      if (keys.ArrowDown) player.vy += FAST_FALL;
  }

  if (isEnteringCastle) {
      const doorCenterX = castle.x + castle.w/2 - player.w/2;
      const doorFloorY  = castle.y + castle.h - player.h - 15;
      player.x += (doorCenterX - player.x) * 0.12;
      player.y += (doorFloorY - player.y) * 0.12;
      enterTimer++;
      castleDoorOpen = Math.min(1, enterTimer / 30);
      
      if (enterTimer > 60) {
          isEnteringCastle = false;
          levelWin = true; 
          winTimer = 0;
      }
  } else if (!isDead && !fadingOut) {
      if (!player.standingPlatform) {
        player.vy += GRAVITY;
        player.x  += player.vx;
        player.y  += player.vy;
      } else {
        player.x += player.vx;
      }
  } else {
      player.vy += GRAVITY;
      player.y  += player.vy; 
  }
  
  /* Collision resolution — see resolveCollisions() above */
  resolveCollisions();

  /* Player trail */
  if (!isEnteringCastle && (Math.abs(player.vx)>0.5 || Math.abs(player.vy)>1)) {
    playerTrails.push({
      x: player.x + PLAYER_CONFIG.offsetX,
      y: player.y + PLAYER_CONFIG.offsetY,
      facing: player.facing,
      life: 10,
      maxLife: 10
    });
  }
  playerTrails = playerTrails.filter(t => { t.life--; return t.life>0; });

  /* Dragon Patrolling & Hover */
  if (dragonObj.active) {
    dragonObj.y = dragonObj.baseY + Math.sin(frameCount*0.04)*10;
    if (dragonObj.minX !== dragonObj.maxX) {
       dragonObj.x += dragonObj.moveSpeed * dragonObj.moveDir;
       if (dragonObj.x <= dragonObj.minX || dragonObj.x >= dragonObj.maxX) {
           dragonObj.moveDir *= -1; 
       }
    }
    dragonObj.attackTimer++;
    if (dragonObj.attackTimer > dragonObj.fireRate) {
      const dir = (player.x < dragonObj.x) ? -1 : 1;
      dragonObj.dir = dir;
      fireballs.push(new Fireball(dragonObj.x + (dir===1 ? dragonObj.w : 0), dragonObj.y + 40, dir));
      dragonObj.attackTimer = 0;
    }
  }

  /* Fireballs vs Player */
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fb = fireballs[i];
    fb.update();
    
    if (!isDead && !fadingOut && !isEnteringCastle && hit(player, fb)) {
       damagePlayer();
       fireballs.splice(i, 1);
       continue;
    }
    
    if (fb.life <= 0 || fb.x < 0 || fb.x > canvas.width) fireballs.splice(i, 1);
  }

  /* Hazards: Spikes, Lava, Pits & Dragon Body Collision */
  if (!isDead && !levelWin && !gameOver && !fadingOut && !fadingIn && !isEnteringCastle) {
      if (player.y > FALL_DEATH_Y) die();
      else if (hasLava && player.y + player.h > canvas.height - 18) die();
      else {
          spikes.forEach(s => { 
              if (!isDead && hit(player, s)) damagePlayer(); 
          });
          
          if (dragonObj.active && hit(player, {x:dragonObj.x, y:dragonObj.y, w:dragonObj.w, h:dragonObj.h})) {
              damagePlayer();
          }
          
          if (!isDead && hit(player, castle)) {
              isEnteringCastle = true; 
              enterTimer = 0;
              player.standingPlatform = null;
          }
      }
  }

  updateParticles();
}

function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter(p => p.life > 0);
}
function updateFireworks() {
  fireworks.forEach(f => { f.x += f.vx; f.y += f.vy; f.vy += f.gravity; f.life--; });
  fireworks = fireworks.filter(f => f.life > 0);
}

/* ================= DRAW: 3D BLOCK ================= */
function draw3DBlock(b) {
  const D=16; 
  const bx=b.x,by=b.y,bw=b.w,bh=b.h;
  const blockTexture = images.block;

  ctx.save();
  ctx.shadowColor="rgba(0,0,0,0.8)"; ctx.shadowBlur=14; ctx.shadowOffsetY=8;
  ctx.fillStyle="black";
  ctx.fillRect(bx,by,bw,bh);
  ctx.restore();

  if (blockTexture) {
    ctx.drawImage(blockTexture, bx, by, bw, bh);
  } else {
    ctx.fillStyle="#4b0082";
    ctx.fillRect(bx, by, bw, bh);
  }

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

/* ================= DRAW: HUD ================= */
function drawLives() {
  ctx.save();
  ctx.font="22px Arial";
  ctx.shadowColor="black"; ctx.shadowBlur=6; ctx.shadowOffsetY=2;
  
  ctx.fillStyle="white"; 
  ctx.fillText("Lives:  " + "❤".repeat(lives) + "♡".repeat(MAX_LIVES-lives), 20, 36);
  ctx.fillStyle="#ff4444";
  ctx.fillText("Health: " + "❤".repeat(hp) + "♡".repeat(MAX_HEALTH-hp), 20, 68);
  ctx.restore();
}

/* ================= DRAW: LOADING SCREEN ================= */
function drawLoadingScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0c0c16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.textAlign = "center";
  
  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 38px serif";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 16;
  ctx.fillText("WIZARD DUNGEON", canvas.width / 2, canvas.height / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#a0f0ff";
  ctx.font = "18px Arial";
  ctx.fillText("Loading Magic Assets...", canvas.width / 2, canvas.height / 2 + 5);

  const barW = 320, barH = 14;
  const barX = canvas.width / 2 - barW / 2;
  const barY = canvas.height / 2 + 30;
  
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  const progress = Math.min(1, assetsLoaded / Math.max(1, totalAssets));
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, "#00c8ff");
  fillGrad.addColorStop(1, "#ffd700");
  ctx.fillStyle = fillGrad;
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4);

  ctx.restore();
}

/* ================= DRAW ================= */
function draw() {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10,-10,canvas.width+20,canvas.height+20);

  /* Background layers */
  const bgImg = images.bg;
  if (bgImg) {
    ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, bgX+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=0.18;
    ctx.drawImage(bgImg, para1X, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, para1X+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=0.09;
    ctx.drawImage(bgImg, para2X, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, para2X+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=1;
  }

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
  blocks.forEach(b => draw3DBlock(b));

  /* Spikes */
  const spikeImg = images.spike;
  spikes.forEach(s => {
    ctx.save();
    ctx.shadowColor="#ff2200"; ctx.shadowBlur=10;
    if (spikeImg) ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
    ctx.restore();
  });

  /* Castle */
  const castleImg = images.castle;
  ctx.save();
  const gp=0.5+0.5*Math.sin(frameCount*0.07);
  ctx.shadowColor="gold"; ctx.shadowBlur=30+25*gp;
  if (castleImg) ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
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
      const doorY = castle.y + castle.h - doorH - 4; 
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.restore();
  }

  /* Dragon */
  if (dragonObj.active) {
    const dragonImg = images.dragon;
    ctx.save();
    ctx.shadowColor = dragonObj.hitTimer > 0 ? "white" : "#9b00ff"; 
    ctx.shadowBlur  = dragonObj.hitTimer > 0 ? 40 : 28;
    
    if (dragonObj.hitTimer > 0) {
       ctx.globalCompositeOperation = "lighter";
       ctx.filter = "brightness(2) contrast(1.5)";
       dragonObj.hitTimer--;
    }
    
    if (dragonImg) {
      if (dragonObj.moveDir > 0) {
          ctx.translate(dragonObj.x + dragonObj.w, dragonObj.y);
          ctx.scale(-1, 1);
          ctx.drawImage(dragonImg, 0, 0, dragonObj.w, dragonObj.h);
      } else {
          ctx.drawImage(dragonImg, dragonObj.x, dragonObj.y, dragonObj.w, dragonObj.h);
      }
    }
    ctx.restore();
  }

  /* Magic Spells & Fireballs */
  playerSpells.forEach(s=>s.draw());
  fireballs.forEach(fb=>fb.draw());

  /* Player trails */
  const wizImg = images.wizard;
  playerTrails.forEach(t=>{
    ctx.save();
    ctx.globalAlpha=t.life/t.maxLife*0.3;
    if (wizImg) {
      if (!t.facing) {
        ctx.translate(t.x + PLAYER_CONFIG.spriteW, t.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizImg, 0, 0, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
      } else {
        ctx.drawImage(wizImg, t.x, t.y, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
      }
    }
    ctx.restore();
  });

  /* Player */
  if (!gameOver && !finalWin) {
    let alpha = 1;
    if (isEnteringCastle) {
        alpha = Math.max(0, 1 - Math.max(0, enterTimer - 15) / 30);
    } else if (levelWin || fadingOut) {
        alpha = 0; 
    } else if (invincibilityTimer > 0) {
        alpha = (frameCount % 12 > 6) ? 0.3 : 1;
    }
    
    if (alpha > 0) {
        const bobY = (player.onGround && !isEnteringCastle) ? Math.sin(frameCount*0.12)*2:0;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor="#a0f0ff"; ctx.shadowBlur=22;
        
        const drawX = player.x + PLAYER_CONFIG.offsetX;
        const drawY = player.y + PLAYER_CONFIG.offsetY + bobY;

        if (wizImg) {
          if (!player.facing) {
             ctx.translate(drawX + PLAYER_CONFIG.spriteW, drawY);
             ctx.scale(-1, 1);
             ctx.drawImage(wizImg, 0, 0, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
          } else {
             ctx.drawImage(wizImg, drawX, drawY, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
          }
        }
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
    ctx.shadowColor="black"; ctx.shadowBlur=6; ctx.shadowOffsetY=2;
    ctx.fillStyle="white"; ctx.font="bold 20px Arial";
    ctx.fillText("Level "+(levelIndex+1), 20, 100);
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
    ctx.fillText("You Ran out of Lives!",canvas.width/2,canvas.height/2+35);
    ctx.fillStyle="#ccc"; ctx.font="20px Arial";
    ctx.fillText("Press R or Double-Tap to Restart",canvas.width/2,canvas.height/2+75);
    ctx.restore();
  }

  /* Level Complete */
  if (levelWin && !finalWin) {
    ctx.save(); 
    ctx.textAlign="center";
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
    ctx.fillText("Press R or Double-Tap to Play Again",canvas.width/2,canvas.height/2+96);
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

  ctx.restore(); 
}

/* ================= DETERMINISTIC FIXED-TIMESTEP LOOP ================= */
let lastTime = 0;
let accumulator = 0;

function loop(currentTime) {
  if (!isLoaded) {
    drawLoadingScreen();
    requestAnimationFrame(loop);
    return;
  }

  if (!lastTime) lastTime = currentTime;
  let delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  if (delta > MAX_DELTA) delta = MAX_DELTA;

  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    update();
    accumulator -= FIXED_DT;
  }

  draw();
  requestAnimationFrame(loop);
}

/* ================= INITIALIZATION ================= */
preloadAssets(() => {
  loadLevel(0);
});

requestAnimationFrame(loop);

});
