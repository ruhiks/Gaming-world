const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // ❌ NO GRAVITY
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, platforms, castle, cursors, winText;
let won = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Platforms (PUZZLE PATH)
  platforms = this.physics.add.staticGroup();

  platforms.create(200, 380, "block");
  platforms.create(280, 320, "block");
  platforms.create(360, 260, "block");
  platforms.create(440, 320, "block");
  platforms.create(520, 260, "block");
  platforms.create(600, 200, "block");

  // Wizard (FLOATING)
  wizard = this.physics.add.sprite(120, 420, "wizard");
  wizard.setScale(0.2);
  wizard.body.setAllowGravity(false);
  wizard.setCollideWorldBounds(true);

  // Castle (GOAL)
  castle = this.physics.add.staticImage(680, 160, "castle");
  castle.setScale(0.6);

  // Collisions
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // Instructions
  this.add.text(
    20,
    20,
    "Arrow Keys → Float freely\nFollow the path to the castle ✨",
    { fontSize: "16px", fill: "#ffffff" }
  );

  // Win text
  winText = this.add.text(
    400,
    250,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "34px", fill: "#ffd700" }
  );
  winText.setOrigin(0.5);
  winText.setVisible(false);
}

function update() {
  if (won) {
    wizard.setVelocity(0);
    return;
  }

  const speed = 150;

  wizard.setVelocity(0);

  if (cursors.left.isDown) wizard.setVelocityX(-speed);
  if (cursors.right.isDown) wizard.setVelocityX(speed);
  if (cursors.up.isDown) wizard.setVelocityY(-speed);
  if (cursors.down.isDown) wizard.setVelocityY(speed);
}

function winGame() {
  won = true;
  winText.setVisible(true);
}







