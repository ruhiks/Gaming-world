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
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, platforms, cursors, castle;
let gravityFlipped = false;
let musicStarted = false;
let bgm;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("bgm", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Platforms
  platforms = this.physics.add.staticGroup();

  // Floor
  for (let i = 0; i < 12; i++) {
    platforms.create(60 + i * 64, 470, "block");
  }

  // Ceiling
  for (let i = 0; i < 12; i++) {
    platforms.create(60 + i * 64, 30, "block");
  }

  // Puzzle steps
  platforms.create(350, 330, "block");
  platforms.create(500, 240, "block");

  // Wizard
  wizard = this.physics.add.sprite(120, 430, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.5, wizard.height * 0.7);

  // Castle (goal)
  castle = this.physics.add.staticImage(700, 200, "castle");
  castle.setScale(0.45);

  // Physics
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, reachGoal, null, this);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();

  // Music (starts on first input — REQUIRED)
  bgm = this.sound.add("bgm", { loop: true, volume: 0.25 });

  this.add.text(
    20,
    20,
    "← → Move\nSPACE Flip Gravity\nReach the castle ✨",
    { fontSize: "14px", fill: "#ffffff" }
  );
}

function update() {
  // Start music after first key press
  if (!musicStarted && (cursors.left.isDown || cursors.right.isDown || cursors.space.isDown)) {
    bgm.play();
    musicStarted = true;
  }

  // Movement
  if (cursors.left.isDown) {
    wizard.setVelocityX(-160);
  } else if (cursors.right.isDown) {
    wizard.setVelocityX(160);
  } else {
    wizard.setVelocityX(0);
  }

  // Gravity flip
  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.setGravityY(gravityFlipped ? -700 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}

function reachGoal() {
  this.add.rectangle(400, 250, 800, 500, 0x000000, 0.6);
  this.add.text(400, 250, "✨ You did it! ✨", {
    fontSize: "40px",
    fill: "#ffd700"
  }).setOrigin(0.5);

  wizard.setVelocity(0);
  wizard.body.enable = false;
}














