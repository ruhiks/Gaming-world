/* ========= FILE CHECK ========= */
console.log("game_main.js loaded");

/* ========= CANVAS (FIXED) ========= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ========= SAFETY ========= */
if (!canvas || !ctx) {
  throw new Error("Canvas not found. Check index.html");
}

/* ========= PLAYER ========= */
const player = {
  x: 100,
  y: 350,
  w: 120,
  h: 160,
  vx: 0,
  vy: 0,
  onGround: false
};

/* ========= PHYSICS ========= */
const GRAVITY = 0.6;
let gravityDir = 1;

/* ========= IMAGE LOADER ========= */
function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

/* ========= ASSETS ========= */
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
function c

