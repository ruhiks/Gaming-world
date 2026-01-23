const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 500 },
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

let wizard;
let platforms;
let cursors;
let castle;
let gravityFlipped = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  platforms = this.physics.add.staticGroup();

  // floor
  for (let i = 0; i < 12; i++) {
    platforms.create(80 + i * 64, 460, "block");
  }

  // ceiling
  for (let i = 0; i < 12; i++) {
    platforms.create(80 + i * 64, 40, "block");
  }

  // puzzle blocks
  platforms.create(300, 300, "block");
  platforms.create(500, 220, "block");

  wizard = this.physics.add.sprite(120, 420, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);

  castle = this.physics.add.staticImage(700, 180, "castle");
  castle.setScale(0.5);

  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, reachGoal, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20,
    20,
    "← → Move\nSPACE Flip Gravity\nReach the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  );
}

function update() {
  if (cursors.left.isDown) {
    wizard.setVelocityX(-160);
  } else if (cursors.right.isDown) {
    wizard.setVelocityX(160);
  } else {
    wizard.setVelocityX(0);
  }

  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.setGravityY(gravityFlipped ? -800 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}

function reachGoal() {
  this.physics.p
