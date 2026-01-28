const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // FLOATING
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, walls, castle, cursors, music;
let won = false;
const SPEED = 180;

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

  // 🧱 MAZE WALLS (REAL COLLISIONS)
  walls = this.physics.add.staticGroup();

  walls.create(220, 420, "block");
  walls.create(300, 360, "block");
  walls.create(380, 420, "block");
  walls.create(460, 300, "block");
  walls.create(540, 360, "block");
  walls.create(620, 260, "block");

  // 🧙 WIZARD (PHYSICS-BASED FLOATING)
  wizard = this.physics.add.sprite(100, 420, "wizard");
  wizard.setScale(0.2);
  wizard.setCollideWorldBounds(true);
  wizard.body.setAllowGravity(false);
  wizard.setDrag(600);          // smooth stopping
  wizard.setMaxVelocity(200);   // controlled speed

  // 🏰 CASTLE (GOAL)
  castle = this.physics.add.staticImage(720, 140, "castle");
  castle.setScale(0.75);

  // Collisions
  this.physics.add.collider(wizard, walls);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20,
    20,
    "← → ↑ ↓ Float through the maze\nFind the path to the castle ✨",
    { fontSize: "15px", fill: "#ffffff" }
  );
}

function update() {
  if (won) return;

  // RESET velocity each frame
  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-SPEED);
  if (cursors.right.isDown) wizard.setVelocityX(SPEED);
  if (cursors.up.isDown) wizard.setVelocityY(-SPEED);
  if (cursors.down.isDown) wizard.setVelocityY(SPEED);
}

function winGame() {
  if (won) return;
  won = true;

  wizard.setVelocity(0);

  // 🎉 Victory jump animation
  wizard.scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    duration: 200,
    yoyo: true,
    repeat: 3,
    ease: "Power1"
  });

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















