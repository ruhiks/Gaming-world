const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 500,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 500 },
      debug: false
    }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let wizard;
let platforms;
let cursors;
let gravityFlipped = false;
let gate;
let finished = false;

function preload() {
  // No assets yet — intentional
}

function create() {
  // Soft magical background
  this.cameras.main.setBackgroundColor('#2b2d5c');

  // Platforms
  platforms = this.physics.add.staticGroup();
  platforms.create(400, 480).setScale(16, 1).refreshBody(); // floor
  platforms.create(400, 20).setScale(16, 1).refreshBody();  // ceiling
  platforms.create(400, 300).setScale(3, 1).refreshBody(); // floating

  // Wizard (simple, cute rectangle)
  wizard = this.add.rectangle(100, 440, 30, 40, 0x7fffd4);
  this.physics.add.existing(wizard);
  wizard.body.setCollideWorldBounds(true);

  // Magical gate (goal)
  gate = this.add.circle(700, 260, 22, 0xffd700);
  this.physics.add.existing(gate, true);

  // Physics
  this.physics.add.collider(wizard, platforms);
  this.physics.add.overlap(wizard, gate, win, null, this);

  // Controls
  cursors = this.input.keyboard.createCursorKeys();

  // Gentle instructions
  this.add.text(20, 20,
    '← → Move\nSPACE Float / Flip Gravity\n\nReach the glowing gate ✨',
    { fontSize: '16px', color: '#ffffff' }
  );
}

function update() {
  if (finished) return;

  if (cursors.left.isDown) {
    wizard.body.setVelocityX(-180);
  } else if (cursors.right.isDown) {
    wizard.body.setVelocityX(180);
  } else {
    wizard.body.setVelocityX(0);
  }

  if (Phaser.Input.Keyboard.JustDown(cursors.space)) {
    gravityFlipped = !gravityFlipped;
    wizard.body.setGravityY(gravityFlipped ? -900 : 0);
    wizard.scaleY = gravityFlipped ? -1 : 1;
  }
}

function win() {
  finished = true;
  this.physics.pause();

  this.add.text(400, 250,
    '✨ You made it ✨\n\nTake a breath.\nYou did well.',
    {
      fontSize: '28px',
      color: '#ffffff',
      align: 'center'
    }
  ).setOrigin(0.5);
}
