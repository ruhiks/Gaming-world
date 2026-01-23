const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
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

let wizard;
let platforms;
let cursors;
let spaceKey;
let gravityFlipped = false;
let gate;
let finished = false;

function preload() {
  this.load.image('wizard', 'assets/wizard.png');
  this.load.image('block', 'assets/block.png');
  this.load.image('castle', 'assets/castle.png');
}

function create() {
  this.cameras.main.setBackgroundColor('#2b2d5c');

  // Platforms
  platforms = this.physics.add.staticGroup();

  // Floor
  for (let i = 0; i < 25; i++) {
    platforms.create(i * 32, 480, 'block').setOrigin(0, 0).refreshBody();
  }

  // Ceiling
  for (let i = 0; i < 25; i++) {
    platforms.create(i * 32, 0, 'block').setOrigin(0, 0).refreshBody();
  }

  // Floating platform
  platforms.create(380, 300, 'block').setScale(3, 1).refreshBody();

  // Wizard
  wizard = this.physics.add.sprite(100, 430, 'wizard');
  wizard.setScale(0.25);
  wizard.setOrigin(0.5, 1);
  wizard.setCollideWorldBounds(true);
  wizard.body.setSize(wizard.width * 0.4, wizard.height * 0.6);
  wizard.body.setBounce(0.05);

  // Castle (goal)
  gate = this.physics.add.staticSprite(700, 430, 'castle');
  gate.setScale(0.4);

  // Physics
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, gate, reachCastle, null, this);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();
  spaceKey = this.input.keyboard.addKey(
    Phaser.Input.Keyboard.KeyCodes.SPACE
  );

  // Instructions
  this.add.text(
    20,
    20,
    '← → Move\nSPACE Flip Gravity\n\nReach the castle 🏰',
    { fontSize: '16px', color: '#ffffff' }
  );
}

function update() {
  if (finished) return;

  // Horizontal movement (smooth)
  if (cursors.left.isDown) {
    wizard.setVelocityX(-200);
    wizard.setFlipX(true);
  } else if (cursors.right.isDown) {
    wizard.setVelocityX(200);
    wizard.setFlipX(false);
  } else {
    wizard.setVelocityX(0);
  }

  // Gravity flip (controlled, no spam)
  if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
    gravityFlipped = !gravityFlipped;

    wizard.body.setGravityY(gravityFlipped ? -1200 : 0);
    wizard.setFlipY(gravityFlipped);
  }

  // Safety reset if falling out
  if (wizard.y > 550 || wizard.y < -50) {
    this.scene.restart();
  }
}

function reachCastle() {
  finished = true;
  this.physics.pause();

  this.add.text(
    400,
    250,
    '✨ You reached the castle ✨\n\nWell done.\nTake a breath.',
    {
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }
  ).setOrigin(0.5);
}








