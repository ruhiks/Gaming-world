/* ================== CANVAS ================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================== CONSTANTS ================== */
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 14;

/* ================== STATE ================== */
let gravityDir = 1;
let gameOver = false;
let finalWin = false;
let currentLevel = 0;

/* ================== BACKGROUND CLOUDS ================== */
let cloudX1 = 0;
let cloudX2 = canvas.width;
const CLOUD_SPEED = 0.25;

/* ================== IMAGE LOADER ================== */
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/* ================== ASSETS ================== */
const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const spikeImg = loadImage("assets/spike.png");
const castleImg = loadImage("assets/castle.png");

/* ================== MUSIC ================== */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;

const deathSound = new Audio("assets/death.mp3");
deathSound.volume = 0.7;

let musicStarted = false;

function startMusic() {
  if (!musicStarted) {
    bgm.play().catch(() => {});
    musicStarted = true;
  }
}
window.addEventListener("keydown", startMusic, { once: true });
window.addEventListener("mousedown", startMusic, { once: true });

/* ================== PLAYER ================== */
const player = {
  x: 0,
  y: 0,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ================== LEVEL DATA ================== */
const levels = [
  // -------- LEVEL 1 --------
  {
    start: { x: 100, y: 320 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 220, y: 420, w: 160, h: 30 },
      { x: 440, y: 340, w: 160, h: 30 },
      { x: 660, y: 260, w: 160, h: 30 }
    ],
    spikes: [
      { x: 350, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 80, w: 160, h: 180 }
  },

  // -------- LEVEL 2 (harder) --------
  {
    start: { x: 80, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 180, y: 420, w: 140, h: 30 },
      { x: 380, y: 340, w: 140, h: 30 },
      { x: 580, y: 260, w: 140, h: 30 },
      { x: 380, y: 140, w: 140, h: 30 }
    ],
    spikes: [
      { x: 300, y: 470, w: 40, h: 40 },
      { x: 520, y: 300, w: 40, h: 40 }
    ],
    castle: { x: 100, y: 20, w: 160, h: 180 }
  },

  // -------- LEVEL 3 (hard) --------
  {
    start: { x: 60, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 140, y: 420, w: 120, h: 30 },
      { x: 300, y: 340, w: 120, h: 30 },
      { x: 460, y: 260, w: 120, h: 30 },
      { x: 620, y: 180, w: 120, h: 30 },
      { x: 300, y: 60, w: 120, h: 30 }
    ],
    spikes: [
      { x: 200, y: 470, w: 40, h: 40 },
      { x: 360, y: 380, w: 40, h: 40 },
      { x: 520, y: 300, w: 40, h: 40 },
      { x: 680, y: 220, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 0, w: 160, h: 180 }
  }
];

let blocks = [];
let spikes = [];
let castle = {};

/* ================== LOAD LEVEL ================== */
function loadLevel(index) {
  const lvl = levels[index];

  blocks = lvl.blocks;
  spikes = lvl.spikes;
  castle = lvl.castle;

  player.x = lvl.start.x;
  player.y = lvl.start.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;

  gravityDir = 1;
  gameOver = false;
}

/* ================== INPUT ================== */
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================== COLLISION ================== */
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ================== UPDATE ================== */
function update() {
  if (gameOver || finalWin) return;

  // Clouds
  cloudX1 -= CLOUD_SPEED;
  cloudX2 -= CLOUD_SPEED;
  if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
  if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;

  // Movement
  if (keys.ArrowLeft) player.vx = -MOVE_SPEED;
  else if (keys.ArrowRight) player.vx = MOVE_SPEED;
  else player.vx = 0;

  if (keys.Space && player.onGround) {
    player.vy = -JUMP_FORCE * gravityDir;
    player.onGround = false;
  }

  if (keys.KeyG) {
    gravityDir *= -1;
    keys.KeyG = false;
  }

  // Physics
  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  // Platforms
  blocks.forEach(b => {
    if (collide(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  // Spikes
  spikes.forEach(s => {
    if (collide(player, s)) {
      gameOver = true;
      bgm.pause();
      deathSound.play();
    }
  });

  // Castle → next level
  if (collide(player, castle)) {
    currentLevel++;
    if (currentLevel < levels.length) {
      loadLevel(currentLevel);
    } else {
      finalWin = true;
    }
  }
}

/* ================== DRAW ================== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, cloudX1, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, cloudX2, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
  ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);

  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText(`Level ${currentLevel + 1}`, 20, 30);

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.fillText("YOU DIED", 360, 260);
    ctx.font = "20px Arial";
    ctx.fillText("Press Ctrl + R to Restart", 320, 300);
  }

  if (finalWin) {
    ctx.font = "42px Arial";
    ctx.fillText("YOU MASTERED GRAVITY!", 200, 260);
  }
}

/* ================== LOOP ================== */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

/* ================== START ================== */
loadLevel(0);
loop();

































































































































































































































