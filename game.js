// ====== CONSTANTS ======
const TILE = 64;
const SPEED = 160;

// ====== MAZE GRID ======
const MAZE = [
  ["S","░","▓","▓","░","░","░","░"],
  ["▓","░","▓","░","░","▓","▓","░"],
  ["▓","░","░","░","▓","░","░","░"],
  ["▓","▓","▓","░","▓","░","▓","░"],
  ["░","░","░","░","░","░","▓","░"],
  ["▓","▓","▓","▓","▓","░","░","C"]
];

// ====== PHASER CONFIG ======
const config = {
  type: Phaser.AUTO,
  width: TILE * 8,
  height: TILE * 6,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

// ====== GLOBALS ======
let wizard;
let walls;
let cursors;
let music;
let won = false;

// ====== PRELOAD ======
function preload() {
  this.load.image("bg", "assets/background.png");
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("path", "assets/path.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

// ====== CREATE ======
function create() {

  // 🔧 PIXEL PERFECT FIX
  this.game.renderer.config.antialias = false;
  this.cameras.main.startFollow(wizard, true, 0.08, 0.08);


  // 🌄 BACKGROUND
  const bg = this.add.image(
  this.scale.width / 2,
  this.scale.height / 2,
  "bg"
);
bg.setDepth(-10);
bg.setAlpha(0.9);


  // 🧱 WALL GROUP
  walls = this.physics.add.staticGroup();

  let startX = 0;
  let startY = 0;
  let castle;

  // 🧩 BUILD MAZE FROM GRID
  MAZE.forEach((row, y) => {
    row.forEach((cell, x) => {

      const px = x * TILE + TILE / 2;
      const py = y * TILE + TILE / 2;

      if (cell === "░") {
        this.add.image(px, py, "path").setDepth(0);
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

  // 🧙 WIZARD
  wizard = this.physics.add.sprite(startX, startY, "wizard");
  wizard.setScale(0.18);
  wizard.setOrigin(0.5);
  wizard.setDepth(2);
  wizard.setCollideWorldBounds(true);

  wizard.body.setSize(
    wizard.width * 0.5,
    wizard.height * 0.7
  );

  // 🧱 COLLISION
  this.physics.add.collider(wizard, walls);

  // 🏰 WIN CONDITION
  this.physics.add.overlap(wizard, castle, () => winGame(this), null, this);

  // 🎵 MUSIC (browser safe)
  music = this.sound.add("music", { loop: true, volume: 0.4 });
  this.input.once("pointerdown", () => music.play());
  this.input.keyboard.once("keydown", () => music.play());

  // 🎮 CONTROLS
  cursors = this.input.keyboard.createCursorKeys();

  // 📝 UI TEXT
  this.add.text(
    12,
    12,
    "← → ↑ ↓ Float\nFind the path to the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  ).setDepth(3);
}

// ====== UPDATE ======
function update() {
  if (won) return;

  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-SPEED);
  if (cursors.right.isDown) wizard.setVelocityX(SPEED);
  if (cursors.up.isDown) wizard.setVelocityY(-SPEED);
  if (cursors.down.isDown) wizard.setVelocityY(SPEED);
}

// ====== WIN GAME ======
function winGame(scene) {
  won = true;
  wizard.setVelocity(0);

  // 🎉 HAPPY CELEBRATION JUMP
  scene.tweens.add({
    targets: wizard,
    y: wizard.y - 60,
    duration: 220,
    ease: "Quad.out",
    yoyo: true,
    repeat: 5
  });

  // ✨ Slight spin (feels joyful)
  scene.tweens.add({
    targets: wizard,
    angle: 360,
    duration: 900,
    ease: "Cubic.easeInOut"
  });

  // 🌑 Fade overlay
  scene.add.rectangle(
    scene.scale.width / 2,
    scene.scale.height / 2,
    scene.scale.width,
    scene.scale.height,
    0x000000,
    0.65
  ).setDepth(5);

  // 🏆 WIN TEXT
  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2 - 10,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "38px", fill: "#ffd700" }
  ).setOrigin(0.5).setDepth(6);

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2 + 40,
    "The wizard reached the castle ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5).setDepth(6);
}








