const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 450,
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

let wizard, cursors, castle;
let pathA, pathB;
let currentPath = "A";
let musicStarted = false;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
  this.load.image("block", "assets/block.png");
  this.load.image("castle", "assets/castle.png");
  this.load.audio("bgm", "assets/music.mp3"); // optional
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  // Start music on first interaction (browser rule)
  this.input.once("pointerdown", () => startMusic(this));
  this.input.keyboard.once("keydown", () => startMusic(this));

  // PATHS
  pathA = this.physics.add.staticGroup();
  pathB = this.physics.add.staticGroup();

  // Path A (top)
  for (let i = 0; i < 10; i++) {
    pathA.create(120 + i * 60, 160, "block");
  }

  // Path B (bottom)
  for (let i = 0; i < 10; i++) {
    pathB.create(120 + i * 60, 300, "block");
  }

  // Wizard
  wizard = this.physics.add.sprite(100, 120, "wizard");
  wizard.setScale(0.18);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.4, wizard.height * 0.6);

  // Castle (goal)
  castle = this.physics.add.staticImage(720, 230, "castle");
  castle.setScale(0.6);

  // Collisions
  this.physics.add.collider(wizard, pathA);
  this.physics.add.overlap(wizard, castle, winGame, null, this);

  cursors = this.input.keyboard.createCursorKeys();

  // Path switching
  this.input.keyboard.on("keydown-A", () => switchPath("A"));
  this.input.keyboard.on("keydown-B", () => switchPath("B"));

  // UI text
  this.add.text(
    20, 20,
    "← → Move\nA / B Choose Path\nReach the castle ✨",
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
}

function switchPath(path) {
  if (currentPath === path) return;

  wizard.setVelocity(0);

  if (path === "A") {
    wizard.y = 120;
    currentPath = "A";
  } else {
    wizard.y = 260;
    currentPath = "B";
  }
}

function startMusic(scene) {
  if (musicStarted) return;
  musicStarted = true;

  const music = scene.sound.add("bgm", {
    loop: true,
    volume: 0.35
  });
  music.play();
}

function winGame() {
  this.physics.pause();

  this.add.rectangle(400, 225, 800, 450, 0x000000, 0.6);

  this.add.text(400, 200, "🎉 Yeah! You did it! 🎉", {
    fontSize: "36px",
    fill: "#ffd700"
  }).setOrigin(0.5);

  this.add.text(400, 250, "You guided the wizard safely ✨", {
    fontSize: "18px",
    fill: "#ffffff"
  }).setOrigin(0.5);
}





