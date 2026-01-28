const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

const TILE_SIZE = 80;
const OFFSET_X = 80;
const OFFSET_Y = 60;

let wizard, castle, walls, cursors, music;
let won = false;

// 🗺️ MAZE DATA (YOUR DESIGN)
const maze = [
  ["S","░","▓","▓","░","░","░","░"],
  ["▓","░","▓","░","░","▓","▓","░"],
  ["▓","░","░","░","▓","░","░","░"],
  ["▓","▓","▓","░","▓","░","▓","░"],
  ["░","░","░","░","░","░","▓","░"],
  ["▓","▓","▓","▓","▓","░","░","C"]
];

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("music", "assets/music.mp3");
}

function create() {
  this.cameras.main.setBackgroundColor("#2e2f5e");

  // 🎵 MUSIC (safe start)
  music = this.sound.add("music", { loop: true, volume: 0.35 });
  const startMusic = () => {
    if (!music.isPlaying) music.play();
  };
  this.input.once("pointerdown", startMusic);
  this.input.keyboard.once("keydown", startMusic);

  walls = this.physics.add.staticGroup();

  // 🧩 BUILD MAZE
  for (let row = 0; row < maze.length; row++) {
    for (let col = 0; col < maze[row].length; col++) {
      const cell = maze[row][col];
      const x = OFFSET_X + col * TILE_SIZE;
      const y = OFFSET_Y + row * TILE_SIZE;

      if (cell === "▓") {
        walls.create(x, y, "block");
      }

      if (cell === "S") {
        wizard = this.physics.add.sprite(x, y, "wizard");
        wizard.setScale(0.2);
        wizard.body.setAllowGravity(false);
        wizard.setCollideWorldBounds(true);
        
      }

      if (cell === "C") {
        castle = this.physics.add.staticImage(x, y, "castle");
        castle.setScale(0.7);
      }
    }
  }

  // Collisions
  this.physics.add.collider(wizard, walls);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(
    20,
    20,
    "← → ↑ ↓ Float through the maze\nFind the castle ✨",
    { fontSize: "15px", fill: "#ffffff" }
  );
}

function update() {
  function update() {
  if (won) return;

  const SPEED = 180;

  let vx = 0;
  let vy = 0;

  if (cursors.left.isDown)  vx = -SPEED;
  else if (cursors.right.isDown) vx = SPEED;

  if (cursors.up.isDown)    vy = -SPEED;
  else if (cursors.down.isDown) vy = SPEED;

  wizard.setVelocity(vx, vy);
}


function winGame() {
  if (won) return;
  won = true;

  wizard.setVelocity(0);

  // 🎉 Celebration jump
  wizard.scene.tweens.add({
    targets: wizard,
    y: wizard.y - 40,
    duration: 200,
    yoyo: true,
    repeat: 3,
    ease: "Power1"
  });

  wizard.scene.add.rectangle(400, 250, 800, 500, 0x000000, 0.55);

  wizard.scene.add.text(
    400,
    230,
    "🎉 Yeah! You did it! 🎉",
    { fontSize: "36px", fill: "#ffd700" }
  ).setOrigin(0.5);

  wizard.scene.add.text(
    400,
    280,
    "You solved the maze ✨",
    { fontSize: "18px", fill: "#ffffff" }
  ).setOrigin(0.5);
}


















