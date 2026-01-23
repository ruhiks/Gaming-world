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
let spikeGroup;
let castle;
let cursors;
let spaceKey;
let isGravityInverted = false;
let currentLevelIndex = 0;
let isLevelTransitioning = false;
let instructionText;
// Level Data
const levels = [
    // Level 1: Tutorial
    {
        start: { x: 100, y: 450 },
        goal: { x: 700, y: 450 },
        platforms: [
            { x: 50, y: 580, count: 25 }, // Floor
            { x: 50, y: 20, count: 25 },  // Ceiling
            { x: 400, y: 400, count: 5 }
        ],
        spikes: []
    },
    // Level 2: The Gap
    {
        start: { x: 50, y: 450 },
        goal: { x: 750, y: 150 },
        platforms: [
            { x: 0, y: 580, count: 10 },
            { x: 500, y: 580, count: 10 }, // Gap in floor
            { x: 0, y: 20, count: 25 },    // Ceiling
            { x: 300, y: 300, count: 8 }
        ],
        spikes: [
            { x: 400, y: 560 } // Spike in the pit
        ]
    },
    // Level 3: Verticality
    {
        start: { x: 50, y: 500 },
        goal: { x: 700, y: 50 },
        platforms: [
            { x: 0, y: 580, count: 25 },
            { x: 0, y: 20, count: 25 },
            { x: 200, y: 450, count: 4 },
            { x: 400, y: 300, count: 4 },
            { x: 600, y: 150, count: 4 }
        ],
        spikes: [
            { x: 300, y: 20 }, // Ceiling spikes
            { x: 500, y: 540 } // Floor spikes
        ]
    }
];
function preload() {
    this.load.image('bg', 'assets/bg.png');
    this.load.image('wizard', 'assets/wizard.png');
    this.load.image('block', 'assets/block.png');
    this.load.image('castle', 'assets/castle.png');
    this.load.image('spike', 'assets/spike.png');
}
function create() {
    this.add.image(400, 300, 'bg').setDisplaySize(800, 600);
    // Groups
    platformGroup = this.physics.add.staticGroup();
    spikeGroup = this.physics.add.staticGroup();
    // Controls
    cursors = this.input.keyboard.createCursorKeys();
    spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    // Instructions (Only show on level 1)
    instructionText = this.add.text(16, 16, '', { fontSize: '18px', fill: '#ffffff', stroke: '#000', strokeThickness: 2 });
    startLevel(this, currentLevelIndex);
}
function update() {
    if (isLevelTransitioning) return;
    if (!player || !player.body) return; // Safety check
    // Horizontal Movement
    if (cursors.left.isDown) {
        player.setVelocityX(-200);
        player.setFlipX(true);
    } else if (cursors.right.isDown) {
        player.setVelocityX(200);
        player.setFlipX(false);
    } else {
        player.setVelocityX(0);
    }
    // Anti-Gravity
    if (Phaser.Input.Keyboard.JustDown(spaceKey)) {
        flipGravity();
    }
    // World Bounds Death Check
    if (player.y > 650 || player.y < -50) {
        restartLevel(this.scene);
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
function startLevel(scene, index) {
    if (index >= levels.length) {
        // Game Over / Win Screen
        scene.add.text(400, 300, 'All Levels Complete!', { fontSize: '48px', fill: '#ffd700', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5);
        if (player) player.destroy();
        return;
    }
    const levelData = levels[index];
    // Reset State
    isGravityInverted = false;
    platformGroup.clear(true, true);
    spikeGroup.clear(true, true);
    if (castle) castle.destroy();
    if (player) player.destroy();
    // Create Platforms
    levelData.platforms.forEach(p => {
        for (let i = 0; i < p.count; i++) {
            platformGroup.create(p.x + (i * 32), p.y, 'block').setScale(0.5).refreshBody();
        }
    });
    // Create Spikes
    levelData.spikes.forEach(s => {
        spikeGroup.create(s.x, s.y, 'spike').setScale(0.5).refreshBody();
    });
    // Create Goal
    castle = scene.physics.add.staticImage(levelData.goal.x, levelData.goal.y, 'castle').setScale(0.5);
    castle.body.setSize(castle.width * 0.5, castle.height * 0.5);
    // Create Player
    player = scene.physics.add.sprite(levelData.start.x, levelData.start.y, 'wizard');
    player.setBounce(0.1);
    player.setCollideWorldBounds(false);
    player.setScale(0.5);
    player.body.setSize(player.width * 0.6, player.height * 0.8);
    // Collisions
    scene.physics.add.collider(player, platformGroup);
    scene.physics.add.overlap(player, castle, nextLevel, null, scene);
    scene.physics.add.collider(player, spikeGroup, () => restartLevel(scene), null, scene);
    // UI Updates
    if (index === 0) {
        instructionText.setText('Arrows to Move\nSPACE to Flip Gravity\nReach the Castle!');
    } else {
        instructionText.setText(`Level ${index + 1}`);
    }
    isLevelTransitioning = false;
}
function restartLevel(scene) {
    if (isLevelTransitioning) return;
    // Simple shake effect
    scene.cameras.main.shake(200, 0.01);
    startLevel(scene, currentLevelIndex);
}
function nextLevel(player, castle) {
    if (isLevelTransitioning) return;

    isLevelTransitioning = true;
    player.setTint(0x00ff00);

    this.time.delayedCall(1000, () => {
        currentLevelIndex++;
        startLevel(this, currentLevelIndex);
    });
}

