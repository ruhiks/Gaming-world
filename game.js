/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 13;

/* ================= GAME STATE ================= */
let gravityDir = 1;
let gameOver = false;
let levelComplete = false;
let currentLevel = 0;

/* ================= CLOUD BACKGROUND ================= */
let cloudX1 = 0;
let cloudX2 = canvas.width;
const CLOUD_SPEED = 0.25;

/* ================= IMAGE LOADER ================= */
function img(src) {
  const i = new Image();
  i.src = src;
  return i;
}

/* ================= ASSETS ================= */
const bgImg = img("assets/bg.png");
const wizardImg = img("assets/wizard.png");
const blockImg = img("assets/block.png");
const spikeImg = img("assets/spike.png");
const castleImg = img("assets/castle.png");

/* ================= AUDIO ================= */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;

const deathSound = new Audio("assets/death.mp3");
deathSound.volume = 0.8;

let audioUnlocked = false;
function unlockAudio() {
  if (!audioUnlocked) {
    bgm.play().catch(() => {});
    audioUnlocked = true;
  }
}
window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("mousedown", unlockAudio, { once: true });

/* ================= PLAYER ================= */
const player = {
  x: 0, y: 0,
  w: 96, h: 128,
  vx: 0, vy: 0,
  onGround: false
};

/* ================= LEVELS ================= */
const levels = [
  {
    start: { x: 80, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 260, y: 420, w: 160, h: 30 },
      { x: 520, y: 340, w: 160, h: 30 }
    ],
    spikes: [
      { x: 380, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 100, w: 160, h: 180 }
  },
  {
    start: { x: 60, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 200, y: 420, w: 120, h: 28 },
      { x: 420, y: 340, w: 120, h: 28 },
      { x: 640, y: 260, w: 120, h: 28 }
    ],
    spikes: [
      { x: 180, y: 460, w: 40, h: 40 },
      { x: 420, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 40, w: 160, h: 180 }
  },
  {
    start: { x: 40, y: 380 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 160, y: 420, w: 100, h: 26 },
      { x: 340, y: 340, w: 100, h: 26 },
      { x: 520, y: 260, w: 100, h: 26 },
      { x: 340, y: 140, w: 100, h: 26 }
    ],
    spikes: [
      { x: 120, y: 460, w: 40, h: 40 },
      { x: 300, y: 460, w: 40, h: 40 },
      { x: 480, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 740, y: 0, w: 180, h: 200 }
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
  levelComplete = false;
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (gameOver && e.code === "KeyR") {
    loadLevel(currentLevel);
  }
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= COLLISION ================= */
function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ================= UPDATE ================= */
function update() {
  // floating clouds
  cloudX1 -= CLOUD_SPEED;
  cloudX2 -= CLOUD_SPEED;
  if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
  if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;

  if (gameOver || levelComplete) return;

  player.vx =
    keys.ArrowLeft ? -MOVE_SPEED :
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
    if (hit(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  spikes.forEach(s => {
    if (hit(player, s)) {
      gameOver = true;
      deathSound.currentTime = 0;
      deathSound.play().catch(() => {});
    }
  });

  if (hit(player, castle)) {
    levelComplete = true;
    setTimeout(() => {
      currentLevel++;
      if (currentLevel < levels.length) loadLevel(currentLevel);
    }, 1200);
  }
}

/* ================= DRAW ================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, cloudX1, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, cloudX2, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

  // sparkling castle
  const glow = 18 + Math.sin(Date.now() / 250) * 10;
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

  if (levelComplete) {
    ctx.font = "32px Arial";
    ctx.fillText("LEVEL COMPLETED!", 320, 260);
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










































































































































































































































































































































































































































































































































































