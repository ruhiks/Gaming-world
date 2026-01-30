/* ===================== CANVAS ===================== */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

console.log("game.js loaded");

/* ===================== CONSTANTS ===================== */
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 14;

/* ===================== GAME STATE ===================== */
let gravityDir = 1;
let gameOver = false;
let win = false;
let levelComplete = false;

/* ===================== SAFE IMAGE LOADER ===================== */
function loadImage(src) {
  const img = new Image();
  img.src = src + "?v=" + Date.now(); // cache-busting
  img.onerror = () => console.warn("Image failed:", src);
  return img;
}

/* ===================== IMAGES ===================== */
const bgImg = loadImage("assets/bg.png");
const wizardImg = loadImage("assets/wizard.png");
const blockImg = loadImage("assets/block.png");
const spikeImg = loadImage("assets/spike.png");
const castleImg = loadImage("assets/castle_v2.png"); // 👈 UPDATED

/* ===================== MUSIC ===================== */
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

/* ===================== PLAYER (BIG SIZE) ===================== */
const player = {
  x: 100,
  y: 260,
  w: 96,   // 👈 BIG WIDTH
  h: 128,  // 👈 BIG HEIGHT
  vx: 0,
  vy: 0,
  onGround: false
};

/* ===================== LEVEL ===================== */
const blocks = [
  { x: 0, y: 500, w: 960, h: 40 },
  { x: 200, y: 420, w: 160, h: 30 },
  { x: 420, y: 340, w: 160, h: 30 },
  { x: 650, y: 260, w: 160, h: 30 },
  { x: 420, y: 150, w: 160, h: 30 }
];

const spikes = [
  { x: 340, y: 460, w: 40, h: 40 },
  { x: 380, y: 460, w: 40, h: 40 },
  { x: 560, y: 310, w: 40, h: 40 }
];

const castle = {
  x: 780,
  y: 60,
  w: 160,
  h: 180
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
  player.y = 260;
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
      if (re


