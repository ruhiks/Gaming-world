// ================== CANVAS ==================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================== CONSTANTS ==================
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 14;

// ================== GAME STATE ==================
let gravityDir = 1;
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
const castleImg = loadImage("assets/castle.png");

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
  if (levelComplete) return;

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

  // Platform collision
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
    levelComplete = true;
  }
}

// ================== DRAW ==================
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Platforms
  blocks.forEach(b => {
    ctx.drawImage(blockImg, b.x, b.y, b.w, b.h);
  });

  // Castle
  ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);

  // Player
  ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);

  // UI
  ctx.fillStyle = "white";
  ctx.font = "18px Arial";
  ctx.fillText("← → Move | Space Jump | G Flip Gravity", 20, 30);

  if (levelComplete) {
    ctx.font = "40px Arial";
    ctx.fillText("LEVEL COMPLETE!", 300, 260);
  }
}

// ================== GAME LOOP ==================
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();




































































































































































































































