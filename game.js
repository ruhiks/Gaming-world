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
const SPEED = 2.5;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // 🎵 MUSIC (browser-safe: click OR key)
  music = this.sound.add("music", { loop: true, volume: 0.4 });

  const startMusic = () => {
    if (!music.isPlaying) music.play();
  };
  this.input.once("pointerdown", startMusic);
  this.input.keyboard.once("keydown", startMusic);

  // 🧩 ZIG-ZAG PUZZLE PATH (visual guidance)
  this.add.image(220, 420, "block");
  this.add.image(300, 360, "block");
  this.add.image(380, 420, "block");
  this.add.image(460, 300, "block");
  this.add.image(540, 360, "block");
  this.add.image(620, 260, "block");

  // 🧙 WIZARD (PURE FLOATING — NO PHYSICS)
  wizard = this.add.image(100, 420, "wizard");
  wizard.setScale(0.2);

  // 🏰 CASTLE (GOAL)
  castle = this.add.image(720, 140, "castle");
  castle.setScale(0.7);

  cursors = this.input.keyboard.createCursorKeys();

  // Instructions
  this.add.text(
    20,
    20,
    "← → ↑ ↓ Float freely\nReach the castle ✨\n(click or press a key for music)",
    { fontSize: "15px", fill: "#ffffff" }
  );
}

function update() {
  if (won) return;

  // ✅ GUARANTEED FLOATING MOVEMENT
  if (cursors.left.isDown) wizard.x -= SPEED;
  if (cursors.right.isDown) wizard.x += SPEED;
  if (cursors.up.isDown) wizard.y -= SPEED;
  if (cursors.down.isDown) wizard.y += SPEED;

  // Win check (distance-based, very safe)
  const d = Phaser.Math.Distance.Between(
    wizard.x, wizard.y,
    castle.x, castle.y
  );

  if (d < 50) {
    winGame();
  }
}

function winGame() {
  won = true;

  // 🎉 Celebration jump
  wizard.scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    duration: 200,
    yoyo: true,
    repeat: 4,
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
    "You guided the wizard safely ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5);
}












