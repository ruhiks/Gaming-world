/* ===================== BASIC SETUP ===================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

console.log("game.js loaded");

/* ===================== CONSTANTS ===================== */
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 12;

/* ===================== GAME STATE ===================== */
let gravityDir = 1;
let gameOver = false;
let win = false;
let levelComplete = false;

/* ===================== SAFE IMAGE LOADER ===================== */
function loadImage(src) {
  const img = new Image();
  img.src = src;
  img.onerror = () => console.warn("Image failed:", src);
  return img;
}

const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const spikeImg = loadImage("assets/spike.png");
const castleImg = loadImage("assets/castle.png");

/* ===================== MUSIC (SAFE) ===================== */
const bgm = document.getElementById("bgm");
let musicStarted = false;

function startMusic() {
  if (!musicStarted && bgm) {
    bgm.volume = 0.4;
    bgm.play().then(() => {
      musicStarted = true;
    }).catch(() => {});
  }
}

window.addEventListener("keydown", startMusic, { once: true });
window.addEventListener("mousedown", startMusic, { once: true });

/* ===================== PLAYER ===================== */
const player = {
  x: 100,
  y: 300,
  w: 64,
  h: 80,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ===================== LEVEL ===================== */
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 200, y: 420, w: 140, h: 30 },
  { x: 400, y: 350, w: 140, h: 30 },
  { x: 600, y: 280, w: 140, h: 30 },
  { x: 400, y: 150, w: 140, h: 30 }
];

const spikes = [
  { x: 320, y: 460, w: 40, h: 40 },
  { x: 360, y: 460, w: 40, h: 40 },
  { x: 520, y: 320, w: 40, h: 40 }
];

const castle = {
  x: 800,
  y: 80,
  w: 120,
  h: 140
};

/* ===================== INPUT ===================== */
const keys = {};

window.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "KeyG" && !levelComplete && !gameOver) {
    gravityDir *= -1;
  }

  if ((gameOver || win) && e.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", e => {
  keys[e.code] = false;
});

/* ===================== HELPERS ===================== */
function rectCollide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ===================== RESET ===================== */
function resetGame() {
  player.x = 100;
  player.y = 300;
  player.vx = 0;
  player.vy = 0;
  gravityDir = 1;
  gameOver = false;
  win = false;
  levelComplete = false;
}

/* ===================== UPDATE ===================== */
function update() {

  // Victory jump animation
  if (levelComplete) {
    player.vy += GRAVITY * gravityDir;
    player.y += player.vy;

    blocks.forEach(b => {
      if (rectCollide(player, b)) {
        player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
        player.vy = -10 * gravityDir;
      }
    });
    return;
  }

  if (gameOver || win) return;

  // Movement
  if (keys["ArrowLeft"]) player.vx = -MOVE_SPEED;
  else if (keys["ArrowRight"]) player.vx = MOVE_SPEED;
  else player.vx = 0;

  if (keys["Space"] && player.onGround) {
    player.vy = -JUMP_FORCE * gravityDir;
    player.onGround = false;
  }

  // Gravity
  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  // Blocks
  blocks.forEach(b => {
    if (rectCollide(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });

  // Spikes
  spikes.forEach(s => {
    if (rectCollide(player, s)) {
      gameOver = true;
    }
  });

  // Win
  if (rectCollide(player, castle)) {
    levelComplete = true;
    win = true;
    player.vy = -12 * gravityDir;
  }
}

/* ===================== DRAW ===================== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (bgImg.complete && bgImg.naturalWidth) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Blocks
  blocks.forEach(b => {
    if (blockImg.complete && blockImg.naturalWidth) {
      ctx.drawImage(blockImg, b.x, b.y, b.w, b.h);
    } else {
      ctx.fillStyle = "#555";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });

  // Spikes
  spikes.forEach(s => {
    if (spikeImg.complete && spikeImg.naturalWidth) {
      ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
    } else {
      ctx.fillStyle = "red";
      ctx.fillRect(s.x, s.y, s.w, s.h);
    }
  });

  // Castle
  if (castleImg.complete && castleImg.naturalWidth) {
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  } else {
    ctx.fillStyle = "gold";
    ctx.fillRect(castle.x, castle.y, castle.w, castle.h);
  }

  // Player
  if (wizardImg.complete && wizardImg.naturalWidth) {
    ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = "cyan";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // UI
  if (gameOver) {
    ctx.fillStyle = "red";
    ctx.font = "40px Arial";
    ctx.fillText("YOU DIED", 360, 260);
    ctx.font = "20px Arial";
    ctx.fillText("Press R to Restart", 380, 300);
  }

  if (win) {
    ctx.fillStyle = "#00ffcc";
    ctx.font = "40px Arial";
    ctx.fillText("LEVEL COMPLETE!", 260, 240);
  }
}

/* ===================== LOOP ===================== */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
