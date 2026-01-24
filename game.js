const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // NO gravity = floating
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, castle, cursors;
let speed = 180;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Zig-zag puzzle blocks (visual obstacles)
  const blocks = this.add.group();
  blocks.create(200, 400, "block");
  blocks.create(350, 300, "block");
  blocks.create(500, 200, "block");
  blocks.create(650, 300, "block");

  // Floating wizard
  wizard = this.physics.add.sprite(100, 400, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);
  wizard.body.setAllowGravity(false);

  // Bigger castle (goal)
  castle = this.physics.add.staticImage(720, 120, "castle");
  castle.setScale(0.75);

  // Win detection
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20, 20,
    "← → ↑ ↓ Float\nReach the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  );
}

function update() {
  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-speed);
  if (cursors.right.isDown) wizard.setVelocityX(speed);
  if (cursors.up.isDown) wizard.setVelocityY(-speed);
  if (cursors.down.isDown) wizard.setVelocityY(speed);
}

function winGame() {
  this.physics.pause();

  this.add.rectangle(400, 250, 800, 500, 0x000000, 0.6);

  this.add.text(
    400, 240,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);

  this.add.text(
    400, 290,
    "The wizard reached the castle ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5);
}







