/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.65;
const MOVE_SPEED = 4;
const JUMP_FORCE = 13.5;

/* ================= GAME STATE ================= */
let gravityDir = 1;
let gameOver = false;
let finalWin = false;
let currentLevel = 0;

/* ================= CLOUD BACKGROUND ================= */
let cloudX1 = 0;
let cloudX2 = canvas.width;
const CLOUD_SPEED = 0.35;

/* ================= IMAGE LOADER ================= */
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/* ================= ASSETS ================= */
const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const spikeImg = loadImage("assets/spike.png");
const castleImg = loadImage("assets/castle.png");

/* ================= AUDIO ================= */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;

const deathSound = new Audio("assets/death.mp3");
deathSound.volume = 0.8;

let musicStarted = false;
function startMusic() {
  if (!musicStarted) {
    bgm.play().catch(() => {});
    musicStarted = true;
  }
}
window.addEventListener("keydown", startMusic, { once: true });
window.addEventListener("mousedown", startMusic, { once: true });

/* ================= PLAYER ================= */
const player = {
  x: 0,
  y: 0,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ================= LEVEL DATA ================= */
const levels = [
  {
    start: { x: 100, y: 320 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 240, y: 420, w: 140, h: 28 },
      { x: 460, y: 340, w: 140, h: 28 },
      { x: 680, y: 260, w: 120, h: 28 }
    ],
    spikes: [
      { x: 180, y: 460, w: 40, h: 40 },
      { x: 360, y: 460, w: 40, h: 40 },
      { x: 540, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 90, w: 160, h: 180 }
  },
  {
    start: { x: 70, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 170, y: 420, w: 120, h: 26 },
      { x: 360, y: 340, w: 120, h: 26 },
      { x: 550, y: 260, w: 120, h: 26 },
      { x: 360, y: 160, w: 110, h: 26 }
    ],
    spikes: [
      { x: 120, y: 460, w: 40, h: 40 },
      { x: 300, y: 460, w: 40, h: 40 },
      { x: 480, y: 460, w: 40, h: 40 },
      { x: 420, y: 300, w: 40, h: 40 }
    ],
    castle: { x: 90, y: 30, w: 160, h: 180 }
  }
];

let blocks = [];
let spikes = [];
let castle = {};

/* ================= LOAD LEVEL ================= */
function loadLevel(i) {
  const l = levels[i];
  blocks = l.blocks;
  spikes = l.spikes;
  castle = l.castle;

  player.x = l.start.x;
  player.y = l.start.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;

  gravityDir = 1;
  gameOver = false;
  bgm.currentTime = 0;
  bgm.play().catch(() => {});
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;

  // Restart on death
  if (gameOver && e.code === "KeyR") {
    loadLevel(currentLevel);
  }
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= COLLISION ================= */
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ================= UPDATE ================= */
function update() {
  if (gameOver || finalWin) return;

  cloudX1 -= CLOUD_SPEED;
  cloudX2 -= CLOUD_SPEED;
  if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
  if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;

  player.vx = keys.ArrowLeft ? -MOVE_SPEED :
              keys.ArrowRight ? MOVE_SPEED : 0;

  if (keys.Space && player.onGround) {
    player.vy = -JUMP_FORCE * gravityDir;
    player.onGround = false;
  }

  if (keys.KeyG) {
    gravityDir *= -1;
    keys.KeyG = false;
  }

  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  blocks.forEach(b => {
    if (collide(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  spikes.forEach(s => {
    if (collide(player, s)) {
      gameOver = true;
      bgm.pause();
      deathSound.currentTime = 0;
      deathSound.play().catch(() => {});
    }
  });

  if (collide(player, castle)) {
    currentLevel++;
    if (currentLevel < levels.length) {
      loadLevel(currentLevel);
    } else {
      finalWin = true;
    }
  }
}

/* ================= DRAW ================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, cloudX1, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, cloudX2, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

  const glow = 18 + Math.sin(Date.now() / 300) * 10;
  ctx.save();
  ctx.shadowColor = "rgba(255,215,120,0.9)";
  ctx.shadowBlur = glow;
  ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  ctx.restore();

  ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Dungeon Level ${currentLevel + 1}`, 20, 30);

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.fillText("YOU DIED", 360, 260);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to Retry", 360, 300);
  }

  if (finalWin) {
    ctx.font = "42px Arial";
    ctx.fillText("DUNGEON CLEARED!", 240, 260);
  }
}

/* ================= LOOP ================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ================= START ================= */
loadLevel(0);
loop();











































































































































































































































































































































































































































































































































































