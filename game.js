const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  parent: "game-container",
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

let wizard;
let cursors;
const SPEED = 3;

function preload() {
  this.load.image("wizard", "assets/wizard.png");
}

function create() {
  this.cameras.main.setBackgroundColor("#3b3b6d");

  wizard = this.add.image(100, 400, "wizard");
  wizard.setScale(0.2);

  cursors = this.input.keyboard.createCursorKeys();

  this.add.text(20, 20,
    "← → ↑ ↓ Move (floating test)",
    { fontSize: "16px", fill: "#ffffff" }
  );
}

function update() {
  if (cursors.left.isDown)  wizard.x -= SPEED;
  if (cursors.right.isDown) wizard.x += SPEED;
  if (cursors.up.isDown)    wizard.y -= SPEED;
  if (cursors.down.isDown)  wizard.y += SPEED;
}
