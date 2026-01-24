const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, platforms, cursors, castle;
let gravityFlipped = false;
let musicStarted = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("bgm", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // MUSIC (starts on first click / key)
  this.input.once("pointerdown", () => startMusic(this));
  this.input.keyboard.once("keydown", () => startMusic(this));

  platforms = this.physics.add.staticGroup();

  // Floor
  for (let i = 0; i < 12; i++) {
    platforms.create(60 + i * 64, 470, "block");
  }

  // Ceiling
  for (let i = 0; i < 12; i++) {
    platforms.create(60 + i * 64, 30, "block");
  }

  // Puzzle blocks
  platforms.create(300, 320, "block");
  platforms.create(460, 220, "block");

  // Wizard (small + controlled)
  wizard = this.physics.add.sprite(100, 420, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.4, wizard.height * 0.6);

  // Castle (goal)
  castle = this.physics.add.staticImage(700, 180, "castle");
  castle.setScale(0.6);

  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20, 20,
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
    wizard.setGravityY(gravityFlipped ? -900 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}

function startMusic(scene) {
  if (musicStarted) return;
  musicStarted = true;

  const music = scene.sound.add("bgm", {
    loop: true,
    volume: 0.4
  });
  music.play();
}

function winGame(player, castle) {
  this.physics.pause();
  player.setTint(0x00ff99);

  this.add.text(
    400, 250,
    "✨ You did it! ✨",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);
}


