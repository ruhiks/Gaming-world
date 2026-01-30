const canvas = document.get5ElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Player
const player = {
  x: 100,
  y: 300,
  w: 96,
  h: 128,
  vx: 0,
  vy: 0,
  onGround: false
};

let gravity = 0.6;
let gravityDir = 1;
let gameOver = false;
let win = false;

// Images
function img(src) {
  const i = new Image();
  i.src = src;
  return i;
}

const bg = img("assets/bg.png");
const wizard = img("assets/wizard.png");
const blockImg = img("assets/block.png");
const spikeImg = img("assets/spike.png");
const castleImg = img("assets/castle_v2.png");

// Level
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 250, y: 420, w: 160, h: 30 },
  { x: 500, y: 340, w: 160, h: 30 }
];

const spikes = [
  { x: 350, y: 460, w: 40, h: 40 }
];

const castle = { x: 760, y: 80, w: 160, h: 180 };

// Input
const keys = {};
addEventListener("keydown", e => keys[e.code] = true);
addEventListener("keyup", e => keys[e.code] = false);

function hit(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

function update() {
  if (gameOver || win) return;

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

  spikes.forEach(s => {
    if (hit(player, s)) gameOver = true;
  });

  if (hit(player, castle)) win = true;
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bg,0,0,canvas.width,canvas.height);
  blocks.forEach(b => ctx.drawImage(blockImg,b.x,b.y,b.w,b.h));
  spikes.forEach(s => ctx.drawImage(spikeImg,s.x,s.y,s.w,s.h));
  ctx.drawImage(castleImg,castle.x,castle.y,castle.w,castle.h);
  ctx.drawImage(wizard,player.x,player.y,player.w,player.h);

  if (gameOver) ctx.fillText("YOU DIED",380,260);
  if (win) ctx.fillText("LEVEL COMPLETE",300,260);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
