const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 600 },
      debug: false
    }
  },
  scene: {
    preload,
    create,
    update
  }
};

new Phaser.Game(config);

let player;
let platforms;
let cursors;
let gravityInverted = false;
let goal;

function preload() {
  // NO IMAGES — this avoids all asset issues
}

function create() {
  // Background
  this.cameras.main.setBackgroundColor('#2b2b4f');

  // Platforms
  platforms = this.physics.add.staticGroup();

  platforms.create(400, 580).setScale(16, 1).refreshBody(); // floor
  platforms.create(400, 20).setScale(16, 1).refreshBody();  // ceiling
  platforms.create(400, 400).setScale(4, 1).refreshBody(); // middle

  // Player (simple rectangle)
  player = this.add.rectangle(100, 500, 30, 40, 0x00ffcc);
  this.physics.add.existing(player);
  player.body.setCollideWorldBounds(true);

  // Goal
  goal = this.add.circle(700, 500, 20, 0xffd700);
  this.physics.add.existing(goal, true);

  // Collisions
  this.physics.add.collider(player, platforms);
  this.physics.add.overlap(player, goal, () => {
    this.add.text(300, 250, 'YOU WIN 🎉', {
      fontSize: '40px',
      color: '#ffffff'
    });
    this.physics.pause();
  });

  // Controls
  cursors = this.input.keyboard.createCursorKeys();

  // Instructions
  this.add.text(20, 20, '← → Move\nSPACE Flip Gravity', {
    fontSize: '18px',
    color: '#ffffff'
  });
}

function update() {
  if (cursors.left.isDown) {
    player.body.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    player.body.setVelocityX(200);
  } else {
    player.body.setVelocityX(0);
  }

  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityInverted = !gravityInverted;
    player.body.setGravityY(gravityInverted ? -1200 : 0);
    player.scaleY = gravityInverted ? -1 : 1;
  }
}
