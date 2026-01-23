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

const game = new Phaser.Game(config);

let wizard;
let platforms;
let cursors;
let gate;
let gravityFlipped = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
}

function create() {
  // Background color
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Platforms
  platforms = this.physics.add.staticGroup();

  platforms.create(400, 480, "block").setScale(25, 1).refreshBody(); // floor
  platforms.create(400, 20, "block").setScale(25, 1).refreshBody();  // ceiling
  platforms.create(400, 300, "block").setScale(3, 1).refreshBody(); // middle

  // Wizard
  wizard = this.physics.add.sprite(100, 420, "wizard");
  wizard.setScale(0.4);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.6, wizard.height * 0.8);

  // Castle (goal)
  gate = this.physics.add.staticImage(700, 430, "castle");
  gate.setScale(0.6);

  // Collisions
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, gate, reachGoal, null, this);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();

  // UI text
  this.add.text(20, 20,
    "← → Move\nSPACE Flip Gravity\nReach the castle ✨",
    { fontSize: "16px", fill: "#ffffff" }
  );
}

function update() {
  if (cursors.left.isDown) {
    wizard.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    wizard.setVelocityX(200);
  } else {
    wizard.setVelocityX(0);
  }

  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.setGravityY(gravityFlipped ? -1000 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}

function reachGoal() {
  this.add.text(400, 250, "✨ You made it! ✨",
    { fontSize: "32px", fill: "#ffd700" }
  ).setOrigin(0.5);

  wizard.setVelocity(0);
  wizard.body.enable = false;
}









