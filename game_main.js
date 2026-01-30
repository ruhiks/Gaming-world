console.log("game_main.js loaded");

// CANVAS
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// PLAYER
const player = { x: 100, y: 300, w: 80, h: 120, vx: 0, vy: 0 };
const GRAVITY = 0.6;

// INPUT
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
window.addEventListener("keyup", e => keys[e.code] = false);

// UPDATE
function update() {
  if (keys.ArrowLeft) player.vx = -4;
  else if (keys.ArrowRight) player.vx = 4;
  else player.vx = 0;

  if (keys.Space) player.vy = -10;

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.y > 380) {
    player.y = 380;
    player.vy = 0;
  }
}

// DRAW
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "cyan";
  ctx.fillRect(player.x, player.y, player.w, player.h);
}

// LOOP
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
