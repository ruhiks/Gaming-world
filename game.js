const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 13;

/* ================= STATE ================= */
let gravityDir = 1;
let gameOver = false;
let currentLevel = 0;

/* ================= IMAGES ================= */
function img(src) {
  const i = new Image();
  i.src = src;
  return i;
}

const bg = img("assets/bg.png");
const wizard = img("assets/wizard.png");
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
  x: 100,
  y: 300,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ================= LEVEL ================= */
const level = {
  blocks: [
    { x: 0, y: 500, w: 960, h: 40 },
    { x: 250, y: 420, w: 140, h: 30 },
    { x: 480, y: 340, w: 140, h: 30 },
    { x: 700, y: 260, w: 140, h: 30 }
  ],
  spikes: [
    { x: 200, y: 460, w: 40, h: 40 },
    { x: 360, y: 460, w: 40, h: 40 },
    { x: 520, y: 460, w: 40, h: 40 }
  ],
  castle: { x: 760, y: 80, w: 160, h: 180 }
};

function resetLevel() {
  player.x = 100;
  player.y = 300;
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

  if (gameOver && e.code === "KeyR") {
    resetLevel();
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
  if (!gameOver) {
    // movement
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

    // physics
    player.vy += GRAVITY * gravityDir;
    player.x += player.vx;
    player.y += player.vy;
    player.onGround = false;

    // blocks
    level.blocks.forEach(b => {
      if (hit(player, b)) {
        player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
        player.vy = 0;
        player.onGround = true;
      }
    });

    // spikes
    level.spikes.forEach(s => {
      if (hit(player, s)) {
        gameOver = true;
        bgm.pause();
        deathSound.currentTime = 0;
        deathSound.play().catch(() => {});
      }
    });
  }
}

/* ================= DRAW ================= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

  level.blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  level.spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

  // glowing castle
  ctx.save();
  ctx.shadowColor = "gold";
  ctx.shadowBlur = 20;
  ctx.drawImage(castleImg, level.castle.x, level.castle.y, level.castle.w, level.castle.h);
  ctx.restore();

  ctx.drawImage(wizard, player.x, player.y, player.w, player.h);

  if (gameOver) {
    ctx.fillStyle = "white";
    ctx.font = "42px Arial";
    ctx.fillText("YOU DIED", 360, 260);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to Retry", 360, 300);
  }
}

/* ================= LOOP ================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

resetLevel();
loop();










































































































































































































































































































































































































































































































































































