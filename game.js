// ================= CANVAS =================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// ================= CONSTANTS =================
const GRAVITY = 0.6;
const MOVE_SPEED = 4;
const JUMP_FORCE = 12;

// ================= GAME STATE =================
let gravityDir = 1;
let gameOver = false;
let win = false;
let levelComplete = false;

// ================= IMAGES =================
const bgImg = new Image();
bgImg.src = "assets/bg.png";

const wizardImg = new Image();
wizardImg.src = "assets/wizard.png";

const blockImg = new Image();
blockImg.src = "assets/block.png";

const spikeImg = new Image();
spikeImg.src = "assets/spike.png";

const castleImg = new Image();
castleImg.src = "assets/castle.png";

// ================= MUSIC =================
const bgm = document.getElementById("bgm");
bgm.volume = 0.4;
let musicStarted = false;

function startMusic() {
  if (!musicStarted) {
    bgm.play().then(() => {
      musicStarted = true;
    }).catch(() => {});
  }
}




















