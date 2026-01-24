const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // 🔑 FLOATING
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard;
let castle;
let cursors;
let winText;
let hasWon = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("castle", "assets/castle.png");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Wizard (small + floating)
  wizard = this.physics.add.sprite(100, 250, "wizard");
  wizard.setScale(0.2);
  wizard.setDamping(true);
  wizard.setDrag(0.95);
  wizard.setMaxVelocity(200);

  // Castle (goal)
  castle = this.physics.add.staticImage(680, 250, "castle");
  castle.setScale(0.6);

  // Overlap = win
  this.physics.add.overlap(wizard, castle, reachCastle, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // Instructions
  this.add.text(
    20,
    20,
    "← → ↑ ↓ Move (float)\nReach the castle ✨",
    { fontSize: "16px", fill: "#ffffff" }
  );

  // Win text (hidden)
  winText = this.add.text(
    400,
    250,
    "✨ Yeah! You did it! ✨",
    { fontSize: "32px", fill: "#ffd700" }
  );
  winText.setOrigin(0.5);
  winText.setVisible(false);
}

function update() {
  if (hasWon) {
    wizard.setVelocity(0);
    return;
  }

  const speed = 120;

  if (cursors.left.isDown) wizard.setVelocityX(-speed);
  else if (cursors.right.isDown) wizard.setVelocityX(speed);

  if (cursors.up.isDown) wizard.setVelocityY(-speed);
  else if (cursors.down.isDown) wizard.setVelocityY(speed);
}

function reachCastle() {
  hasWon = true;
  winText.setVisible(true);
}




