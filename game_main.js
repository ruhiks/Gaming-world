/* ========= FILE CHECK ========= */
console.log("game_main.js loaded");

/* ========= CANVAS ========= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ========= BASIC SAFETY ========= */
if (!canvas || !ctx) {
  alert("Canvas not found. Check index.html");
}

/* ========= PLAYER ========= */
const player = {
  x: 100,
  y: 350,
  w: 120,   // BIG character
  h: 160,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ========= PHYSICS ========= */
const GRAVITY = 0.6;
let gravityDir = 1;

/* ========= IMAGES ========= */
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

const bgImg     = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg  = loadImage("assets/block.png");
const castleImg = loadImage("assets/castle_v2.png");

/* ========= LEVEL ========= */
const blocks = [
  { x: 0,   y: 500, w: 960, h: 40 },
  { x: 280, y: 400, w: 200, h: 30 },
  { x: 560, y: 300, w: 200, h: 30 }
];

const castle = { x: 740, y: 120, w: 180, h: 200 };

/* ========= INPUT ========= */
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup",   e => keys[e.code] = false);

/* ========= COLLISION ========= */
function collide(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ========= UPDATE ========= */
function update() {
  // Movement
  if (keys.ArrowLeft) player.vx = -4;
  else if (keys.ArrowRight) player.vx = 4;
  else player.vx = 0;

  // Jump
  if (keys.Space && player.onGround) {
    player.vy = -14 * gravityDir;
    player.onGround = false;
  }

  // Gravity flip
  if (keys.KeyG) gravityDir *= -1;

  // Physics
  player.vy += GRAVITY * gravityDir;
  player.x += player.vx;
  player.y += player.vy;
  player.onGround = false;

  // Ground / platforms
  blocks.forEach(b => {
    if (collide(player, b)) {
      player.y = gravityDir === 1 ? b.y - player.h : b.y + b.h;
      player.vy = 0;
      player.onGround = true;
    }
  });
}

/* ========= DRAW ========= */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  if (bgImg.complete) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Platforms
  blocks.forEach(b => {
    if (blockImg.complete) {
      ctx.drawImage(blockImg, b.x, b.y, b.w, b.h);
    } else {
      ctx.fillStyle = "#555";
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });

  // Castle
  if (castleImg.complete) {
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  } else {
    ctx.fillStyle = "gold";
    ctx.fillRect(castle.x, castle.y, castle.w, castle.h);
  }

  // Player
  if (wizardImg.complete) {
    ctx.drawImage(
      wizardImg,
      player.x,
      player.y,
      player.w,
      player.h
    );
  } else {
    ctx.fillStyle = "cyan";
    ctx.fillRect(player.x, player.y, player.w, player.h);
  }

  // UI
  ctx.fillStyle = "white";
  ctx.font = "16px Arial";
  ctx.fillText("← → Move | Space Jump | G Flip Gravity", 20, 30);
}

/* ========= LOOP ========= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
