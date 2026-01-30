// ================== CANVAS ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================== CONSTANTS ==================
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 14;

// ================== GAME STATE ==================
let gravityDir = 1;
let gameOver = false;
let levelComplete = false;

// ================== IMAGE LOADER ==================
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ================== ASSETS ==================
const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const spikeImg = loadImage("assets/spike.png");
const castleImg = loadImage("assets/castle.png");

// ================== MUSIC ==================
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;
let musicStarted = false;

function startMusic() {
  if (!musicStarted) {
    bgm.play().catch(() => {});
    musicStarted = true;
  }
}
window.addEventListener("keydown", startMusic, { once: true });
window.addEventListener("mousedown", startMusic, { once: true });

// ================== PLAYER ==================
const player = {
  x: 100,
  y: 320,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

// ================== LEVEL ==================
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 220, y: 420, w: 160, h: 30 },
  { x: 440, y: 340, w: 160, h: 30 },
  { x: 660, y: 260, w: 160, h: 30 },
  { x: 440, y: 150, w: 160, h: 30 }
];

const spikes = [
  { x: 350, y: 460, w: 40, h: 40 },
  { x: 390, y: 460, w: 40, h: 40 },
  { x: 520, y: 300, w: 40, h: 40 }
];

const castle = {
  x: 760,
  y: 80,
  w: 160,
  h: 180
};

// ================== INPUT ==================
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// ================== COLLISION ==================
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ================== UPDATE ==================
function update() {
  // Freeze game on end states
  if (gameOver || levelComplete) return;

  // Movement
  if (keys.ArrowLeft) player.vx = -MOVE_SPEED;
  else if (keys.ArrowRight) player.vx = MOVE_SPEED;
  else player.vx = 0;

  // Jump
  if (keys.Space && player.onGround) {
    player.vy = -JUMP_FORCE * gravityDir;
    player.onGround = false;
  }

  // Gravity flip
  if (keys.KeyG) {
    gravityDir *= -1;
    keys.KeyG = false;
  }

  // Physics
  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  // Block collision
  blocks.forEach(b => {
    if (collide(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  // Spike collision (death)
  spikes.forEach(s => {
    if (collide(player, s)) {
      gameOver = true;
    }
  });

  // Win condition (ENTER CASTLE)
  if (collide(player, castle)) {
    levelComplete = true;

    // Lock wizard neatly inside castle
    player.x = castle.x + castle.w / 2 - player.w / 2;
    player.y = castle.y + castle.h - player.h;
    player.vx = 0;
    player.vy = 0;
  }
}

// ================== DRAW ==================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
  ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);

  // UI
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("← → Move | Space Jump | G Flip Gravity", 20, 30);

  if (gameOver) {
    ctx.font = "40px Arial";
    ctx.fillText("YOU DIED", 360, 250);
    ctx.font = "20px Arial";
    ctx.fillText("Press Ctrl + R to Restart", 330, 290);
  }

  if (levelComplete) {
    ctx.font = "42px Arial";
    ctx.fillText("LEVEL COMPLETED", 250, 240);
    ctx.font = "20px Arial";
    ctx.fillText("Press Ctrl + R to Continue", 300, 280);
  }
}

// ================== LOOP ==================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();

































































































































































































































