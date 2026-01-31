/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 4;
const JUMP_FORCE = 15;
const FAST_FALL = 1.8;
const FALL_DEATH_Y = canvas.height + 80;

/* ================= STATE ================= */
let currentLevel = 0;
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let winTimer = 0;
let rotateAngle = 0;

/* ================= BACKGROUND ================= */
let cloudX1 = 0;
let cloudX2 = canvas.width;
const CLOUD_SPEED = 0.25;

/* ================= IMAGE LOADER ================= */
const img = src => {
  const i = new Image();
  i.src = src;
  return i;
};

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

let audioUnlocked = false;
window.addEventListener("keydown", () => {
  if (!audioUnlocked) {
    bgm.play().catch(() => {});
    audioUnlocked = true;
  }
}, { once: true });

/* ================= PLAYER ================= */
const player = {
  x: 0, y: 0,
  w: 96, h: 128,
  vx: 0, vy: 0,
  onGround: false
};

/* ================= WAND SPARKLES ================= */
let particles = [];
function spawnSparkles(x, y) {
  for (let i = 0; i < 18; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 2,
      vy: -Math.random() * 2.5,
      life: 40
    });
  }
}

/* ================= LEVELS ================= */
const levels = [
  {
    start: { x: 80, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 300, y: 420, w: 160, h: 28 },
      { x: 580, y: 340, w: 160, h: 28 }
    ],
    spikes: [{ x: 450, y: 460, w: 40, h: 40 }],
    castle: { x: 760, y: 120, w: 160, h: 180 }
  },
  {
    start: { x: 60, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 220, y: 420, w: 120, h: 26 },
      { x: 440, y: 340, w: 120, h: 26 },
      { x: 660, y: 260, w: 120, h: 26 }
    ],
    spikes: [
      { x: 160, y: 460, w: 40, h: 40 },
      { x: 360, y: 460, w: 40, h: 40 },
      { x: 560, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 40, w: 160, h: 180 }
  },
  {
    start: { x: 40, y: 360 },
    blocks: [
      { x: 0, y: 500, w: 960, h: 40 },
      { x: 160, y: 420, w: 90, h: 24 },
      { x: 330, y: 340, w: 90, h: 24 },
      { x: 500, y: 260, w: 90, h: 24 },
      { x: 680, y: 180, w: 90, h: 24 }
    ],
    spikes: [
      { x: 120, y: 460, w: 40, h: 40 },
      { x: 300, y: 460, w: 40, h: 40 },
      { x: 480, y: 460, w: 40, h: 40 },
      { x: 660, y: 460, w: 40, h: 40 }
    ],
    castle: { x: 760, y: 0, w: 180, h: 200 }
  }
];

let blocks = [], spikes = [], castle = {};

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

  gameOver = false;
  levelComplete = false;
  winTimer = 0;
  rotateAngle = 0;
  particles = [];
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
  keys[e.code] = true;
  if (gameOver && e.code === "KeyR") loadLevel(currentLevel);
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= COLLISION ================= */
const hit = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

/* ================= UPDATE ================= */
function update() {
  cloudX1 -= CLOUD_SPEED;
  cloudX2 -= CLOUD_SPEED;
  if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
  if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;

  if (gameOver || finalWin) return;

  /* ---- LEVEL COMPLETE STATE ---- */
  if (levelComplete) {
    winTimer++;
    rotateAngle += 0.02;
    spawnSparkles(player.x + player.w / 2, player.y + 20);

    if (winTimer > 140) {
      currentLevel++;
      if (currentLevel < levels.length) loadLevel(currentLevel);
      else finalWin = true;
    }
    return;
  }

  /* ---- MOVEMENT (PLAYER ONLY) ---- */
  player.vx =
    (keys.ArrowLeft ? -MOVE_SPEED : 0) +
    (keys.ArrowRight ? MOVE_SPEED : 0);

  if (keys.Space && player.onGround) {
    player.vy = -JUMP_FORCE;
    player.onGround = false;
  }

  if (keys.ArrowDown) player.vy += FAST_FALL;

  /* ---- PHYSICS ---- */
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  /* ---- PLATFORM COLLISION (NO AUTO CLIMB) ---- */
  player.onGround = false;
  blocks.forEach(b => {
    if (
      hit(player, b) &&
      player.vy >= 0 &&
      player.y + player.h - player.vy <= b.y + 6
    ) {
      player.y = b.y - player.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  /* ---- DEATH ---- */
  if (player.y > FALL_DEATH_Y) {
    gameOver = true;
    deathSound.play().catch(() => {});
  }

  spikes.forEach(s => {
    if (hit(player, s)) {
      gameOver = true;
      deathSound.play().catch(() => {});
    }
  });

  /* ---- WIN ---- */
  if (hit(player, castle)) {
    levelComplete = true;
    player.vx = 0;
    player.vy = 0;
  }

  /* ---- PARTICLES ---- */
  particles.forEach(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  });
  particles = particles.filter(p => p.life > 0);
}

/* ================= DRAW ================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

  ctx.save();
  ctx.shadowColor = "rgba(255,215,120,1)";
  ctx.shadowBlur = 20;
  ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  ctx.restore();

  ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);

  particles.forEach(p => {
    ctx.fillStyle = "rgba(255,215,160,0.8)";
    ctx.fillRect(p.x, p.y, 4, 4);
  });

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
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.sin(rotateAngle) * 0.15);
    ctx.font = "32px Arial";
    ctx.fillText("LEVEL COMPLETED", -140, 0);
    ctx.restore();
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



































































































































































































































































































































































































































































































































































