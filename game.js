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
  this.cameras.main.setBackgroundColor("#3b3b6d");

  platforms = this.physics.add.staticGroup();

  // Floor
  for (let i = 0; i < 10; i++) {
    platforms.create(80 + i * 64, 460, "block").refreshBody();
  }

  // Ceiling
  for (let i = 0; i < 10; i++) {
    platforms.create(80 + i * 64, 40, "block").refreshBody();
  }

  // Puzzle platforms
  platforms.create(300, 300, "block").refreshBody();
  platforms.create(500, 200, "block").refreshBody();

  // Wizard (SMALL + PROPORTIONAL)
  wizard = this.physics.add.sprite(120, 420, "wizard");
  wizard.setScale(0.18); // 🔑 this is the key change
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.5, wizard.height * 0.7);

  // Castle goal
  gate = this.physics.add.staticImage(680, 180, "castle");
  gate.setScale(0.4);

  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, gate, reachGoal, null, this);

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
    wizard.setVelocityX(-150);
  } else if (cursors.right.isDown) {
    wizard.setVelocityX(150);
  } else {
    wizard.setVelocityX(0);
  }

  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.setGravityY(gravityFlipped ? -600 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}









