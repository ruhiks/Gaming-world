const TILE = 64;

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
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, cursors, music;
let walls;
let won = false;
const SPEED = 160;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("path", "assets/path.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  walls = this.physics.add.staticGroup();

  let startX = 0;
  let startY = 0;
  let castle;

  // 🎯 BUILD MAZE FROM GRID
  MAZE.forEach((row, y) => {
    row.forEach((cell, x) => {
      const px = x * TILE + TILE / 2;
      const py = y * TILE + TILE / 2;

      if (cell === "▓") {
        walls.create(px, py, "block").setScale(0.5).refreshBody();
      }

      if (cell === "░") {
        this.add.image(px, py, "path").setScale(0.5);
      }

      if (cell === "S") {
        startX = px;
        startY = py;
      }

      if (cell === "C") {
        castle = this.physics.add.staticImage(px, py, "castle");
        castle.setScale(0.6);
      }
    });
  });

  // 🧙 WIZARD
  wizard = this.physics.add.sprite(startX, startY, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.5, wizard.height * 0.7);

  this.physics.add.collider(wizard, walls);

  // 🎵 MUSIC (user interaction safe)
  music = this.sound.add("music", { loop: true, volume: 0.4 });
  this.input.once("pointerdown", () => music.play());
  this.input.keyboard.once("keydown", () => music.play());

  // 🏁 GOAL
  this.physics.add.overlap(wizard, castle, () => winGame(this), null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    12,
    12,
    "← → ↑ ↓ Float\nFind the path to the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  );
}

function update() {
  if (won) return;

  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-SPEED);
  if (cursors.right.isDown) wizard.setVelocityX(SPEED);
  if (cursors.up.isDown) wizard.setVelocityY(-SPEED);
  if (cursors.down.isDown) wizard.setVelocityY(SPEED);
}

function winGame(scene) {
  won = true;
  wizard.setVelocity(0);

  // 🎉 Celebration jump
  scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    yoyo: true,
    repeat: 3,
    duration: 250,
    ease: "Power1"
  });

  scene.add.rectangle(
    scene.scale.width / 2,
    scene.scale.height / 2,
    scene.scale.width,
    scene.scale.height,
    0x000000,
    0.6
  );

  scene.add.text(
    scene.scale.width / 2,
    scene.scale.height / 2,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);
}






