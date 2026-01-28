const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard, castle, cursors, music;
let won = false;
let speed = 160;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // 🎵 MUSIC (browser-safe)
  music = this.sound.add("music", { loop: true, volume: 0.4 });

  const startMusic = () => {
    if (!music.isPlaying) {
      music.play();
    }
  };

  // allow BOTH mouse + keyboard
  this.input.once("pointerdown", startMusic);
  this.input.keyboard.once("keydown", startMusic);

  // 🧩 ZIG-ZAG PUZZLE WALLS (visual maze)
  this.add.image(220, 420, "block");
  this.add.image(300, 360, "block");
  this.add.image(380, 420, "block");
  this.add.image(460, 300, "block");
  this.add.image(540, 360, "block");
  this.add.image(620, 260, "block");

  // 🧙 WIZARD (PURE FLOATING)
  wizard = this.add.image(100, 420, "wizard");
  wizard.setScale(0.2);

  // 🏰 CASTLE (GOAL)
  castle = this.add.image(720, 140, "castle");
  castle.setScale(0.7);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20,
    20,
    "← → ↑ ↓ Float freely\nClick or press a key to start music 🎵",
    { fontSize: "15px", fill: "#ffffff" }
  );
}

function update() {
  if (won) return;

  // FLOATING MOVEMENT
  if (cursors.left.isDown) wizard.x -= speed * 0.016;
  if (cursors.right.isDown) wizard.x += speed * 0.016;
  if (cursors.up.isDown) wizard.y -= speed * 0.016;
  if (cursors.down.isDown) wizard.y += speed * 0.016;

  // WIN CHECK (manual distance check)
  const distance = Phaser.Math.Distance.Between(
    wizard.x, wizard.y,
    castle.x, castle.y
  );

  if (distance < 60) {
    winGame();
  }
}

function winGame() {
  won = true;

  // 🎉 CELEBRATION JUMP
  wizard.scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    duration: 250,
    yoyo: true,
    repeat: 3,
    ease: "Power1"
  });

  wizard.scene.add.rectangle(400, 250, 800, 500, 0x000000, 0.6);

  wizard.scene.add.text(
    400,
    240,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);

  wizard.scene.add.text(
    400,
    285,
    "The wizard reached the castle ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5);
}










