const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 400 }, debug: false }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, platforms, castle, cursors, music;
let gravityFlipped = false;
let won = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Music (starts after first input – browser rule)
  music = this.sound.add("music", { loop: true, volume: 0.4 });
  this.input.once("pointerdown", () => music.play());

  platforms = this.physics.add.staticGroup();

  // Zig-zag puzzle path
  platforms.create(200, 420, "block");
  platforms.create(300, 360, "block");
  platforms.create(400, 300, "block");
  platforms.create(500, 360, "block");
  platforms.create(600, 300, "block");

  // Wizard
  wizard = this.physics.add.sprite(120, 440, "wizard");
  wizard.setScale(0.2);
  wizard.setCollideWorldBounds(true);

  // Castle
  castle = this.physics.add.staticImage(680, 220, "castle");
  castle.setScale(0.6);

  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20, 20,
    "← → Move\nSPACE Flip Gravity\nReach the Castle ✨",
    { fontSize: "16px", fill: "#fff" }
  );
}

function update() {
  if (won) return;

  wizard.setVelocityX(0);

  if (cursors.left.isDown) wizard.setVelocityX(-160);
  if (cursors.right.isDown) wizard.setVelocityX(160);

  // Anti-gravity flip
  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.setGravityY(gravityFlipped ? -800 : 0);
    wizard.setFlipY(gravityFlipped);
  }
}

function winGame() {
  if (won) return;
  won = true;

  wizard.setVelocity(0);
  wizard.setGravityY(600);     // restore gravity
  wizard.setFlipY(false);
  wizard.setVelocityY(-300);   // 🎉 jump

  const text = wizard.scene.add.text(
    400, 250,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  );
  text.setOrigin(0.5);
}








