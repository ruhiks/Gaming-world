/* ================= STATE ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 4;
const JUMP_FORCE = 15;
const FAST_FALL = 1.8;
const FALL_DEATH_Y = canvas.height + 40;

/* ================= VARIABLES ================= */
let currentLevel = 0;
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let winTimer = 0;
let wandAngle = 0;
let textScale = 0;
let particles = [];

/* ================= ASSET LOADER ================= */
const img = (src) => {
    const i = new Image();
    i.src = src;
    return i;
};

const bg = img("assets/bg.png");
const wizardImg = img("assets/wizard.png");
const blockImg = img("assets/block.png");
const spikeImg = img("assets/spike.png");
const castleImg = img("assets/castle.png");

// Audio safe wrapper
const playAudio = (path) => {
    try {
        const audio = new Audio(path);
        audio.volume = 0.4;
        audio.play().catch(e => console.warn("Audio blocked:", e));
    } catch (e) {
        console.warn("Audio error:", e);
    }
};

/* ================= PLAYER ================= */
const player = {
    x: 0, y: 0,
    w: 48, h: 48, // Smaller hitbox for better feel
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true
};

/* ================= LEVELS ================= */
const levels = [
    // LEVEL 1: Tutorial
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 300, y: 420, w: 150, h: 32 },
            { x: 600, y: 300, w: 150, h: 32 }
        ],
        spikes: [],
        castle: { x: 800, y: 200, w: 120, h: 140 }
    },
    // LEVEL 2: The Gap
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 200, h: 40 },
            { x: 250, y: 450, w: 100, h: 32 },
            { x: 400, y: 400, w: 100, h: 32 },
            { x: 550, y: 350, w: 100, h: 32 },
            { x: 750, y: 300, w: 210, h: 32 }
        ],
        spikes: [{ x: 300, y: 510, w: 400, h: 32 }],
        castle: { x: 800, y: 160, w: 120, h: 140 }
    },
    // LEVEL 3: Hard Verticality
    {
        start: { x: 30, y: 450 },
        blocks: [
            { x: 0, y: 520, w: 100, h: 32 }, // Start
            { x: 150, y: 450, w: 80, h: 32 },
            { x: 300, y: 380, w: 80, h: 32 },
            { x: 450, y: 310, w: 80, h: 32 },
            { x: 600, y: 240, w: 80, h: 32 },
            { x: 750, y: 180, w: 120, h: 32 } // Goal
        ],
        spikes: [],
        castle: { x: 770, y: 40, w: 80, h: 140 }
    }
];

let blocks = [];
let spikes = [];
let castle = {};

function loadLevel(i) {
    if (i >= levels.length) {
        finalWin = true;
        return;
    }
    const l = levels[i];
    blocks = l.blocks;
    spikes = l.spikes;
    castle = l.castle;
    player.x = l.start.x;
    player.y = l.start.y;
    player.vx = 0;
    player.vy = 0;
    gameOver = false;
    levelComplete = false;
    winTimer = 0;
    wandAngle = 0;
    textScale = 0;
    particles = [];
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (gameOver && e.code === "KeyR") loadLevel(currentLevel);
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= PHYSICS ================= */
function update() {
    if (gameOver || finalWin) return;

    // === LEVEL COMPLETE LOGIC ===
    if (levelComplete) {
        winTimer++;

        // Wand Animation
        if (winTimer < 30) {
            wandAngle = (winTimer / 30) * (-Math.PI / 4);
        }

        // Sparkles and Text
        if (winTimer > 30) {
            if (textScale < 1) textScale += 0.05;

            // Spawn Sparkles from Wand Tip
            // Calculate absolute position of wand tip
            let tipX, tipY;
            if (player.facingRight) {
                tipX = player.x + player.w + 10;
                tipY = player.y + 10;
            } else {
                tipX = player.x - 10;
                tipY = player.y + 10;
            }
            spawnSparkles(tipX, tipY);
        }

        if (winTimer > 180) { // 3 seconds
            currentLevel++;
            loadLevel(currentLevel);
        }

        // Particle update
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
        particles = particles.filter(p => p.life > 0);
        return;
    }

    // === MOVEMENT ===
    const dir = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    player.vx = dir * MOVE_SPEED;
    if (dir !== 0) player.facingRight = dir > 0;

    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
    }
    if (keys.ArrowDown) player.vy += FAST_FALL;

    // === X AXIS ===
    player.x += player.vx;
    // Bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

    // Collisions
    const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    blocks.forEach(b => {
        if (hit(player, b)) {
            if (player.vx > 0) player.x = b.x - player.w;
            else if (player.vx < 0) player.x = b.x + b.w;
            player.vx = 0;
        }
    });

    // === Y AXIS ===
    player.vy += GRAVITY;
    player.y += player.vy;
    player.onGround = false;

    blocks.forEach(b => {
        if (hit(player, b)) {
            if (player.vy > 0) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                player.y = b.y + b.h;
                player.vy = 0;
            }
        }
    });

    // === DEATH & WIN ===
    if (player.y > FALL_DEATH_Y) {
        gameOver = true;
        playAudio("assets/death.mp3");
    }
    spikes.forEach(s => {
        if (hit(player, s)) {
            gameOver = true;
            playAudio("assets/death.mp3");
        }
    });
    if (hit(player, castle)) {
        levelComplete = true;
        player.vx = 0;
        player.vy = 0;
    }
}

function spawnSparkles(x, y) {
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4 - 1,
            life: 40 + Math.random() * 20,
            color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`
        });
    }
}

/* ================= DRAW ================= */
function draw() {
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Bg
    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    // Blocks
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

    // Castle
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);

    // Player & Wand
    ctx.save();
    if (!player.facingRight) {
        ctx.translate(player.x + player.w, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizardImg, 0, 0, player.w, player.h); // Draw at relative 0,0
    } else {
        ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
    }

    // Draw Wand (Only when level complete)
    if (levelComplete) {
        // If flipped, we are in transformed context.
        // Origin is top-right (visually). X points Left. Y Points Down.
        // We want wand at hand.

        ctx.save();
        if (player.facingRight) {
            ctx.translate(player.x + player.w - 10, player.y + 20); // Hand pos
        } else {
            // In flipped context:
            // Hand is at "Visual Left". Which is +X in flipped. 
            // Width is 48. Hand is maybe at 40 (near "back"/left).
            ctx.translate(40, 20);
        }

        ctx.rotate(wandAngle);

        // Wand Graphic
        ctx.fillStyle = "#8d5524";
        ctx.fillRect(0, -2, 24, 4); // Stick
        ctx.fillStyle = "#fff";
        ctx.fillRect(20, -3, 6, 6); // Tip

        ctx.restore();
    }
    ctx.restore(); // Restore flip

    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });

    // UI
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Level " + (currentLevel + 1), 20, 30);

    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.font = "bold 60px Arial";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "left";
    }

    if (levelComplete && textScale > 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(textScale, textScale);
        ctx.rotate(Math.sin(winTimer * 0.1) * 0.1);
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "center";
        ctx.font = "bold 60px Arial";
        ctx.fillText("LEVEL COMPLETE!", 0, 0);
        ctx.restore();
        ctx.textAlign = "left";
    }

    if (finalWin) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.textAlign = "center";
        ctx.font = "bold 60px Arial";
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);
    }
}

function loop() {
    try {
        update();
        draw();
        requestAnimationFrame(loop);
    } catch (e) {
        console.error(e);
        ctx.fillStyle = "red";
        ctx.font = "20px Arial";
        ctx.fillText("Error: " + e.message, 50, 50);
    }
}

loadLevel(0);
loop();




























































































































































































































































































































































































































































































































































