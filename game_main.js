// ===== CANVAS =====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ===== PLAYER =====
const player = {
  x: 100,
  y: 300,
  w: 120,
  h: 160,
  vx: 0,
  vy: 0,
  onGround: false
};

let gravity = 0.6;
let gravityDir = 1;

// ===== IMAGE LOADER =====
function load(src) {
  const img = new Image();
  img.src = src;
  return img;
}

// ===== ASSETS =====
const bg = load("assets/bg.png");
const wizard = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const spikeImg = load("assets/spike.png");
const castleImg = load("assets/castle_v2.png");

// ===== LEVEL =====
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 300, y: 400, w: 200, h: 30 },
  { x: 600, y: 300, w: 200, h: 30 }
];

// ===== INPUT =====
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// ===== COLLISION =====
function hit(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ===== UPDATE =====
function update() {
  if (keys.ArrowLeft) player.vx = -4;
  else if (keys.ArrowRight) player.vx = 4;
  else player.vx = 0;

  if (keys.Space && player.onGround) {
    player.vy = -14 * gravityDir;
    player.onGround = false;
  }

  if (keys.KeyG) gravityDir *= -1;

  player.vy += gravity * gravityDir;
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
}

// ===== DRAW =====
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
  ctx.drawImage(castleImg, 760, 120, 160, 180);
  ctx.drawImage(wizard, player.x, player.y, player.w, player.h);
}

// ===== LOOP =====
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
