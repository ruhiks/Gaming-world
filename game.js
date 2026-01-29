// ================= CONFIG =================
const TILE = 64;
const SPEED = 160;

const MAZE = [
  ["S","░","▓","▓","░","░","░","░"],
  ["▓","░","▓","░","░","▓","▓","░"],
  ["▓","░","░","░","▓","░","░","░"],
  ["▓","▓","▓","░","▓","░","▓","░"],
  ["░","░","░","░","░","░","▓","░"],
  ["▓","▓","▓","▓","▓","░","░","C"]
];

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

// ================= GLOBALS =================
let wizard, walls, cursors, music;
let won = false;

// ================= PRELOAD =================
function preload() {
  this.load.image("bg", "assets/background.png");
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("path", "assets/path.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

// ================= CREATE =================
function create() {

  // Pixel-perfect visuals
  this.game.renderer.config.antialias = false;
  this.cameras.main.setRoundPixels(true);

  // Background
  this.add.image(
    this.scale.width / 2,
    this.scale.height / 2,
    "bg"
  ).setDepth(-10).setAlpha(0.9);

  // Music (starts on user action)
  music = this.sound.add("music", { loop: true, volume: 0.4 });

const startMusic = () => {
  if (!music.isPlaying) {
    music.play();
  }
};

this.input.once("pointerdown", startMusic);
this.input.keyboard.once("keydown", startMusic);

  walls = this.physics.add.staticGroup();

  let startX = 0;
  let startY = 0;
  let castle;

  // Build maze from grid
  MAZE.forEach((row, y) => {
    row.forEach((cell, x) => {

      const px = x * TILE + TILE / 2;
      const py = y * TILE + TILE / 2;

      if (cell === "░") {
     this.add.image(px, py, "path")
      .setDepth(0)
      .setAlpha(0.9);
      }

      if (cell === "▓") {
        walls.create(px, py, "block")
          .setDepth(1)
          .refreshBody();
      }

      if (cell === "S") {
        startX = px;
        startY = py;
      }

      if (cell === "C") {
        castle = this.physics.add.staticImage(px, py, "castle");
        castle.setScale(0.6);
        castle.setDepth(2);
      }
    });
  });

  // Wizard
  wizard = this.physics.add.sprite(startX, startY, "wizard");
  wizard.setScale(0.18);
  wizard.setDepth(2);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.5, wizard.height * 0.7);

  this.physics.add.collider(wizard, walls);
  this.physics.add.overlap(wizard, castle, () => winGame(this), null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // Camera follow (smooth)
  this.cameras.main.startFollow(wizard, true, 0.08, 0.08);

  // UI
  this.add.text(
    12,
    12,
    "← → ↑ ↓ Float\nSolve the maze & reach the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  ).setDepth(3);
}

// ================= UPDATE =================
function update() {
  if (won) return;

  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-SPEED);
  if (cursors.right.isDown) wizard.setVelocityX(SPEED);
  if (cursors.up.isDown) wizard.setVelocityY(-SPEED);
  if (cursors.down.isDown) wizard.setVelocityY(SPEED);
}

// ================= WIN =================
function winGame(scene) {
  won = true;
  wizard.setVelocity(0);

  // Happy jump
  scene.tweens.add({
    targets: wizard,
    y: wizard.y - 60,
    yoyo: true,
    repeat: 4,
    duration: 220,
    ease: "Quad.out"
  });

  // Overlay
  scene.add.rectangle(
    scene.scale.width / 2,
    scene.scale.height / 2,
    scene.scale.width,
    scene.scale.height,
    0x000000,
    0.6
  ).setDepth(5);

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2 - 10,
    "🎉 Level Completed! 🎉",
    { fontSize: "38px", fill: "#ffd700" }
  ).setOrigin(0.5).setDepth(6);

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2 + 35,
    "The wizard reached the castle ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5).setDepth(6);
}











