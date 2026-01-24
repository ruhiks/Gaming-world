 const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 600 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let platformGroup;
let castle;
let cursors;
let spaceKey;
let isGravityInverted = false;
let instructionText;

function preload() {
    this.load.image('bg', 'assets/bg.png');
    this.load.image('wizard', 'assets/wizard.png');
    this.load.image('block', 'assets/block.png');
    this.load.image('castle', 'assets/castle.png');
}

function create() {
    // Background - Fills screen
    const bg = this.add.image(400, 300, 'bg');
    bg.setDisplaySize(800, 600);

    // Groups
    platformGroup = this.physics.add.staticGroup();

    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Instructions
    instructionText = this.add.text(400, 200, 'Arrow Keys to Move\nSPACE to Flip Gravity\n\nReach the Castle', {
        fontSize: '28px',
        fill: '#ffffff',
        align: 'center',
        fontFamily: '"Segoe UI", Tahoma, sans-serif',
        stroke: '#272744',
        strokeThickness: 4
    }).setOrigin(0.5);

    setupLevel();
}

function update() {
    if (!player || !player.body) return;

    // Movement
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
        player.setFlipX(true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(200);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
    }

    // Anti-Gravity Input
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        flipGravity();
    }

    // Simple bounds check (wrap around or restart)
    if (player.y > 650 || player.y < -50) {
        setupLevel(); // Restart if fell out
    }
}

function flipGravity() {
    isGravityInverted = !isGravityInverted;
    if (isGravityInverted) {
        player.setGravityY(-1200);
        player.setFlipY(true);
    } else {
        player.setGravityY(0);
        player.setFlipY(false);
    }
}

function setupLevel() {
    // Reset State
    isGravityInverted = false;
    platformGroup.clear(true, true);
    if (castle) castle.destroy();
    if (player) player.destroy();

    // -- Level Design --
    // A simple, symmetrical, calm puzzle.

    // Floor
    createRow(0, 568, 25);
    // Ceiling
    createRow(0, 32, 25);

    // Middle Barrier - Requires gravity flip to go over/under
    createRow(350, 568 - 32, 1);
    createRow(350, 568 - 64, 1);
    createRow(350, 568 - 96, 1);
    createRow(350, 568 - 128, 1);

    // Create Goal
    castle = this.physics.add.staticImage(700, 450, 'castle').setScale(0.5);
    castle.body.setSize(castle.width * 0.4, castle.height * 0.4);
    castle.body.setOffset(castle.width * 0.3, castle.height * 0.3);

    // Create Player
    player = this.physics.add.sprite(100, 450, 'wizard');
    player.setBounce(0.1);
    player.setCollideWorldBounds(false);
    player.setScale(0.35); // Smaller, cute scale
    player.body.setSize(player.width * 0.5, player.height * 0.7);
    player.body.setOffset(player.width * 0.25, player.height * 0.15);

    // Collisions
    this.physics.add.collider(player, platformGroup);
    this.physics.add.overlap(player, castle, winGame, null, this);
}

function createRow(x, y, count) {
    for (let i = 0; i < count; i++) {
        platformGroup.create(x + (i * 32), y, 'block')
            .setScale(0.5)
            .refreshBody(); // Important after scaling static physics objects
    }
}

function winGame(player, castle) {
    this.physics.pause();
    player.setTint(0xffd700);
    instructionText.setText('You reached the Castle!\nMagical!');
    instructionText.setVisible(true);
}







