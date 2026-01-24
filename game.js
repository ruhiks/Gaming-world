const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 }, // FLOATING
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard;
let castle;
let platforms;
let cursors;
let music;
let winText;
let won = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("bgm", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // MUSIC (autoplay after user input)
  music = this.sound.add("bgm", { loop: true, volume: 0.4 });
  this.input.once("pointerdown", () => music.play());

  // Platforms (PATHWAYS)
  platforms = this.physics.add.staticGroup();

  // Zig-zag path
  platforms.create(200, 350, "block");
  platforms.create(300, 300, "block");
  platforms.create(400, 250, "block");
  platforms.create(500, 200, "block");

  // Wizard
  wizard = this.physics.add.sprite(100, 400, "wizard");
  wizard.setScale(0.2);
  wizard.setDrag(0.95);
  wizard.setMaxVelocity(200);

  // Castle (goal)
  castle = this.physics.add.staticImage(680, 160, "castle");
  castle.setScale(0.6);

  // Collisions
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // UI text
  this.add.text(
    20,
    20,
    "Arrow Keys → Float\nFollow the path to the castle ✨",
    { fontSize: "16px", fill: "#ffffff" }
  );

  winText = this.add.text(
    400,
    250,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "32px", fill: "#ffd700" }
  );
  winText.setOrigin(0.5);
  winText.setVisible(false);
}

function update() {
  if (won) {
    wizard.setVelocity(0);
    return;
  }

  const speed = 140;

  if (cursors.left.isDown) wizard.setVelocityX(-speed);
  else if (cursors.right.isDown) wizard.setVelocityX(speed);
  else wizard.setVelocityX(0);

  if (cursors.up.isDown) wizard.setVelocityY(-speed);
  else if (cursors.down.isDown) wizard.setVelocityY(speed);
  else wizard.setVelocityY(0);
}

function winGame() {
  won = true;
  winText.setVisible(true);
}





