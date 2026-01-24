 const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // 🔑 NO gravity
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, castle, cursors;
let bgm, musicStarted = false;
const SPEED = 200;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("bgm", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // ZIG-ZAG VISUAL PUZZLE (no collision)
  this.add.image(250, 380, "block");
  this.add.image(400, 280, "block");
  this.add.image(550, 180, "block");
  this.add.image(650, 260, "block");

  // WIZARD (FLOATING)
  wizard = this.physics.add.sprite(100, 400, "wizard");
  wizard.setScale(0.2);
  wizard.setCollideWorldBounds(true);
  wizard.body.setAllowGravity(false);

  // CASTLE (BIG GOAL)
  castle = this.physics.add.staticImage(720, 140, "castle");
  castle.setScale(0.8);

  // WIN CONDITION
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // MUSIC — start only after first input (REQUIRED)
  bgm = this.sound.add("bgm", { loop: true, volume: 0.4 });

  this.input.keyboard.once("keydown", () => {
    bgm.play();
    musicStarted = true;
  });

  this.add.text(
    20, 20,
    "← → ↑ ↓ Float freely\nReach the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  );
}

function update() {
  wizard.setVelocity(0);

  if (cursors.left.isDown)  wizard.setVelocityX(-SPEED);
  if (cursors.right.isDown) wizard.setVelocityX(SPEED);
  if (cursors.up.isDown)    wizard.setVelocityY(-SPEED);
  if (cursors.down.isDown)  wizard.setVelocityY(SPEED);
}

function winGame() {
  this.physics.pause();
  if (bgm && bgm.isPlaying) bgm.stop();

  this.add.rectangle(400, 250, 800, 500, 0x000000, 0.6);

  this.add.text(400, 240, "🎉 Yeah! You did it! 🎉", {
    fontSize: "36px",
    fill: "#ffd700"
  }).setOrigin(0.5);

  this.add.text(400, 290, "The wizard reached the castle ✨", {
    fontSize: "18px",
    fill: "#ffffff"
  }).setOrigin(0.5);
}
