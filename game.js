const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // floating
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, castle, cursors, walls, music;
let won = false;
const SPEED = 160;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#2e2f5e");

  // 🎵 MUSIC (safe start)
  music = this.sound.add("music", { loop: true, volume: 0.35 });
  const startMusic = () => {
    if (!music.isPlaying) music.play();
  };
  this.input.once("pointerdown", startMusic);
  this.input.keyboard.once("keydown", startMusic);

  // 🧱 MAZE WALLS (REAL OBSTACLES)
  walls = this.physics.add.staticGroup();

  // Zig-zag maze layout
  walls.create(200, 420, "block");
  walls.create(260, 360, "block");
  walls.create(320, 420, "block");
  walls.create(380, 300, "block");
  walls.create(440, 360, "block");
  walls.create(500, 260, "block");
  walls.create(560, 320, "block");
  walls.create(620, 220, "block");

  // 🧙 WIZARD (FLOATING + COLLISION)
  wizard = this.physics.add.sprite(100, 420, "wizard");
  wizard.setScale(0.2);
  wizard.setCollideWorldBounds(true);
  wizard.body.setAllowGravity(false);

  // 🏰 CASTLE (GOAL)
  castle = this.physics.add.staticImage(720, 140, "castle");
  castle.setScale(0.75);

  // Collisions
  this.physics.add.collider(wizard, walls);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // UI
  this.add.text(
    20,
    20,
    "← → ↑ ↓ Float through the maze\nFind the correct path ✨",
    { fontSize: "15px", fill: "#ffffff" }
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

function winGame() {
  won = true;

  wizard.setVelocity(0);

  // 🎉 Victory jump
  wizard.scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    duration: 200,
    yoyo: true,
    repeat: 3,
    ease: "Power1"
  });

  // Fade overlay
  wizard.scene.add.rectangle(400, 250, 800, 500, 0x000000, 0.55);

  wizard.scene.add.text(
    400,
    230,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);

  wizard.scene.add.text(
    400,
    280,
    "You solved the maze ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5);
}














