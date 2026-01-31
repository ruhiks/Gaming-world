/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const MOVE_SPEED = 4;
const JUMP_HEIGHT = 90;
const JUMP_TIME = 18;

/* ================= STATE ================= */
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let currentLevel = 0;
let jumpFrame = 0;
let jumping = false;
let winTimer = 0;

/* ================= BACKGROUND ================= */
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
const bg = img("assets/bg.png");
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
window.addEventListener("keydown", () => {
  if (!audioUnlocked) {
    bgm.play().catch(() => {});
    audioUnlocked = true;
  }
}, { once: true });

/* ================= PLAYER ================= */
const player = {
  x: 0,
  y: 0,
  w: 96,
  h: 128,
  onBrick: false
};

/* ================= LEVELS ================= */
const levels = [
  {
    start: { x: 80, y: 372 },
    blocks: [
      { x: 80, y: 500, w: 160, h: 28 },
      { x: 320, y: 420, w: 160, h: 28 },
      { x: 560, y: 340, w: 160, h: 28 }
    ],
    spikes: [{ x: 400, y: 472, w: 40, h: 40 }],
    castle: { x: 760, y: 220, w: 160, h: 180 }
  },
  {
    start: { x: 80, y: 372 },
    blocks: [
      { x: 80, y: 500, w: 120, h: 26 },
      { x: 260, y: 420, w: 120, h: 26 },
      { x: 440, y: 340, w: 120, h: 26 },
      { x: 620, y: 260, w: 120, h: 26 }
    ],
    spikes: [
      { x: 200, y: 472, w: 40, h: 40 },
      { x: 380, y: 472, w: 40, h: 40 },
      { x: 560, y: 472, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 100, w: 160, h: 180 }
  },
  {
    start: { x: 80, y: 372 },
    blocks: [
      { x: 80, y: 500, w: 90, h: 24 },
      { x: 220, y: 420, w: 90, h: 24 },
      { x: 360, y: 340, w: 90, h: 24 },
      { x: 500, y: 260, w: 90, h: 24 },
      { x: 640, y: 180, w: 90, h: 24 }
    ],
    spikes: [
      { x: 160, y: 472, w: 40, h: 40 },
      { x: 300, y: 472, w: 40, h: 40 },
      { x: 440, y: 472, w: 40, h: 40 },
      { x: 580, y: 472, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 0, w: 180, h: 200 }
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

  gameOver = false;
  levelComplete = false;
  jumping = false;
  jumpFrame = 0;
  winTimer = 0;
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (gameOver && e.code === "KeyR") loadLevel(currentLevel);
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
  cloudX1 -= CLOUD_SPEED;
  cloudX2 -= CLOUD_SPEED;
  if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
  if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;

  if (gameOver) return;

  if (levelComplete) {
    winTimer++;
    player.y -= 0.5; // wand celebration lift
    if (winTimer > 120) {
      currentLevel++;
      if (currentLevel < levels.length) loadLevel(currentLevel);
      else finalWin = true;
    }
    return;
  }

  if (keys.ArrowLeft) player.x -= MOVE_SPEED;
  if (keys.ArrowRight) player.x += MOVE_SPEED;

  if (keys.Space && !jumping) {
    jumping = true;
    jumpFrame = 0;
  }

  if (jumping) {
    const progress = jumpFrame / JUMP_TIME;
    player.y -= Math.sin(progress * Math.PI) * (JUMP_HEIGHT / JUMP_TIME);
    jumpFrame++;
    if (jumpFrame >= JUMP_TIME) jumping = false;
  }

  player.onBrick = false;
  blocks.forEach(b => {
    if (
      player.x + player.w > b.x &&
      player.x < b.x + b.w &&
      Math.abs(player.y + player.h - b.y) < 6
    ) {
      player.y = b.y - player.h;
      player.onBrick = true;
    }
  });

  if (!player.onBrick && !jumping) {
    gameOver = true;
    deathSound.play().catch(() => {});
  }

  spikes.forEach(s => {
    if (hit(player, s)) {
      gameOver = true;
      deathSound.play().catch(() => {});
    }
  });

  if (hit(player, castle)) {
    levelComplete = true;
  }
}

/* ================= DRAW ================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

  const glow = 20 + Math.sin(Date.now() / 200) * 15;
  ctx.save();
  ctx.shadowColor = "rgba(255,215,120,1)";
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
    ctx.fillText("LEVEL COMPLETED", 300, 260);
  }

  if (finalWin) {
    ctx.font = "42px Arial";
    ctx.fillText("DUNGEON CLEARED!", 250, 260);
  }
}

/* ================= LOOP ================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loadLevel(0);
loop();










































































































































































































































































































































































































































































































































































