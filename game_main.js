console.log("Antigravity Wizard game loaded");

// ================= CANVAS =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================= CONSTANTS =================
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 14;

// ================= GAME STATE =================
let gravityDir = 1;
let gameOver = false;
let win = false;

// ================= IMAGE LOADER =================
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ================= ASSETS =================
const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const castleImg = loadImage("assets/castle_v2.png");

// ================= PLAYER =================
const player = {
  x: 100,
  y: 300,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

// ================= LEVEL (MAZE) =================
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 200, y: 420, w: 160, h: 30 },
  { x: 450, y: 350, w: 160, h: 30 },
  { x: 700, y: 280, w: 160, h: 30 },
  { x: 450, y: 160, w: 160, h: 30 }
];

const castle = {
  x: 780,
  y: 80,
  w: 160,
  h: 180
};

// ================= INPUT =================
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// ================= COLLISION =================
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ================= UPDATE =================
function update() {
  if (gameOver || win) return;

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
    keys.KeyG = false; // prevent rapid flip
  }

  // Physics
  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  // Platforms
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (collide(player, b)) {
      if (gravityDir === 1) {
        player.y = b.y - player.h;
      } else {
        player.y = b.y + b.h;
      }
      player.vy = 0;
      player.onGround = true;
    }
  }

  // Win
  if (collide(player, castle)) {
    win = true;
  }
}

// ================= DRAW =================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (bgImg.complete) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Platforms
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (blockImg.complete) {
      ctx.drawImage(blockImg, b.x, b.y, b.w, b.h);
    } else {
      ctx.fillStyle = "#555";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }

  // Castle
  if (castleImg.complete) {
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  }

  // Player
  if (wizardImg.complete) {
    ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
  } else {
    ctx.fillStyle = "cyan";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // UI
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("← → Move | Space Jump | G Flip Gravity", 20, 30);

  if (win) {
    ctx.font = "40px Arial";







































































