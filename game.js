
game.js


/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 4;
const JUMP_FORCE = 15;
const FAST_FALL = 1.8;
const FALL_DEATH_Y = canvas.height + 80;
/* ================= STATE ================= */
let currentLevel = 0;
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let winTimer = 0;
let rotateAngle = 0;
let showWand = false;
/* ================= BACKGROUND ================= */
let cloudX1 = 0;
let cloudX2 = canvas.width;
const CLOUD_SPEED = 0.25;
/* ================= IMAGE LOADER ================= */
const img = src => {
    const i = new Image();
    i.src = src;
    return i;
};
/* ================= ASSETS ================= */
const bg = img("assets/bg.png");
const wizardImg = img("assets/wizard.png");
const blockImg = img("assets/block.png");
const spikeImg = img("assets/spike.png");
const castleImg = img("assets/castle.png");
/* ================= AUDIO ================= */
// Create dummy audio objects to prevent errors if files missing
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;
const deathSound = new Audio("assets/death.mp3");
// Audio unlock
let audioUnlocked = false;
const unlockAudio = () => {
    if (!audioUnlocked) {
        bgm.play().catch(() => console.log("Audio play failed (user interaction needed)"));
        audioUnlocked = true;
    }
};
window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("click", unlockAudio, { once: true });
/* ================= PLAYER ================= */
const player = {
    x: 0, y: 0,
    w: 64, h: 64, // Adjusted size for better collision feeling
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true
};
/* ================= WAND SPARKLES ================= */
let particles = [];
function spawnSparkles(x, y) {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 60,
            color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`
        });
    }
}
/* ================= LEVELS ================= */
const levels = [
    {
        start: { x: 80, y: 360 },
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 300, y: 420, w: 160, h: 32 },
            { x: 580, y: 340, w: 160, h: 32 }
        ],
        spikes: [{ x: 450, y: 460, w: 40, h: 40 }],
        castle: { x: 760, y: 120, w: 160, h: 180 }
    },
    {
        start: { x: 60, y: 360 },
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 220, y: 420, w: 120, h: 32 },
            { x: 440, y: 340, w: 120, h: 32 },
            { x: 660, y: 260, w: 120, h: 32 }
        ],
        spikes: [
            { x: 160, y: 460, w: 40, h: 40 },
            { x: 360, y: 460, w: 40, h: 40 },
            { x: 560, y: 460, w: 40, h: 40 }
        ],
        castle: { x: 760, y: 40, w: 160, h: 180 }
    },
    {
        start: { x: 40, y: 400 }, // Adjusted start for Level 3
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 160, y: 420, w: 100, h: 32 },
            { x: 330, y: 340, w: 100, h: 32 },
            { x: 500, y: 260, w: 100, h: 32 },
            { x: 680, y: 180, w: 100, h: 32 }
        ],
        spikes: [
            { x: 120, y: 460, w: 40, h: 40 },
            { x: 300, y: 460, w: 40, h: 40 },
            { x: 480, y: 460, w: 40, h: 40 },
            { x: 660, y: 460, w: 40, h: 40 }
        ],
        castle: { x: 760, y: 0, w: 180, h: 200 }
    }
];
let blocks = [], spikes = [], castle = {};
/* ================= LOAD LEVEL ================= */
function loadLevel(i) {
    const l = levels[i];
    blocks = l.blocks;
    spikes = l.spikes;
    castle = l.castle;
    player.x = l.start.x;
    player.y = l.start.y;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    gameOver = false;
    levelComplete = false;
    winTimer = 0;
    rotateAngle = 0;
    showWand = false;
    particles = [];
}
/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (gameOver && e.code === "KeyR") loadLevel(currentLevel);
});
window.addEventListener("keyup", e => keys[e.code] = false);
/* ================= COLLISION UTILS ================= */
const hit = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
/* ================= UPDATE ================= */
function update() {
    // Background Scroll
    cloudX1 -= CLOUD_SPEED;
    cloudX2 -= CLOUD_SPEED;
    if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
    if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;
    if (gameOver || finalWin) return;
    /* ---- LEVEL COMPLETE ANIMATION ---- */
    if (levelComplete) {
        winTimer++;
        rotateAngle += 0.05;
        // Sparkles from Wand
        const wandX = player.x + (player.facingRight ? player.w : 0);
        const wandY = player.y + player.h / 3;
        spawnSparkles(wandX, wandY);
        if (winTimer > 180) { // 3 seconds approx
            currentLevel++;
            if (currentLevel < levels.length) {
                loadLevel(currentLevel);
            } else {
                finalWin = true;
            }
        }
        return;
    }
    /* ---- MOVEMENT ---- */
    const moveDir = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    player.vx = moveDir * MOVE_SPEED;
    if (moveDir !== 0) player.facingRight = moveDir > 0;
    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
    }
    if (keys.ArrowDown) player.vy += FAST_FALL;
    /* ---- PHYSICS (X AXIS) ---- */
    // Move X
    player.x += player.vx;
    // X Collision (Prevent walking through walls)
    blocks.forEach(b => {
        if (hit(player, b)) {
            // If moving right, snap to left of block
            if (player.vx > 0) {
                player.x = b.x - player.w;
            }
            // If moving left, snap to right of block
            else if (player.vx < 0) {
                player.x = b.x + b.w;
            }
            player.vx = 0;
        }
    });
    /* ---- PHYSICS (Y AXIS) ---- */
    player.vy += GRAVITY;
    player.y += player.vy;
    // Ground Check Reset
    player.onGround = false;
    // Y Collision (Landing or hitting head)
    blocks.forEach(b => {
        if (hit(player, b)) {
            if (player.vy > 0) {
                // Falling down - Land on top
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
            } else if (player.vy < 0) {
                // Jumping up - Hit head on bottom
                player.y = b.y + b.h;
                player.vy = 0;
            }
        }
    });
    /* ---- LIMITS ---- */
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    /* ---- DEATH ---- */
    if (player.y > FALL_DEATH_Y) {
        gameOver = true;
        deathSound.play().catch(() => { });
    }
    spikes.forEach(s => {
        if (hit(player, s)) {
            gameOver = true;
            deathSound.play().catch(() => { });
        }
    });
    /* ---- WIN CONDITION ---- */
    if (hit(player, castle)) {
        levelComplete = true;
        player.vx = 0;
        player.vy = 0;
        showWand = true;
    }
    /* ---- PARTICLES UPDATE ---- */
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);
}
/* ================= DRAW ================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    /* Background */
    ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);
    /* Level Elements */
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
    /* Castle */
    ctx.save();
    ctx.shadowColor = "rgba(255,215,120,0.5)";
    ctx.shadowBlur = 10;
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    ctx.restore();
    /* Player */
    ctx.save();
    if (!player.facingRight) {
        ctx.translate(player.x + player.w, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizardImg, 0, 0, player.w, player.h);
    } else {
        ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
    }
    ctx.restore();
    /* Wand Drawing */
    if (showWand || levelComplete) {
        ctx.save();
        // Position wand relative to player
        const wandX = player.facingRight ? player.x + player.w - 10 : player.x + 10;
        const wandY = player.y + player.h / 2;
        ctx.translate(wandX, wandY);
        if (!player.facingRight) ctx.scale(-1, 1);
        // Animate wand bobbing
        if (levelComplete) ctx.rotate(-0.5 + Math.sin(winTimer * 0.2) * 0.2);
        ctx.fillStyle = "#8B5A2B"; // Brown wood
        ctx.fillRect(0, 0, 20, 4);
        ctx.fillStyle = "#FFF"; // Tip
        ctx.fillRect(16, -1, 4, 6);
        ctx.restore();
    }
    /* Particles */
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    /* UI & Text */
    ctx.fillStyle = "white";
    ctx.font = "bold 20px 'Segoe UI', Arial";
    ctx.fillText(`Level ${currentLevel + 1}`, 20, 30);
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff6b6b";
        ctx.textAlign = "center";
        ctx.font = "bold 48px 'Segoe UI'";
        ctx.fillText("TRY AGAIN", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "#fff";
        ctx.font = "24px 'Segoe UI'";
        ctx.fillText("Press R", canvas.width / 2, canvas.height / 2 + 50);
        ctx.textAlign = "left"; // Reset
    }
    if (levelComplete) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.sin(rotateAngle) * 0.1); // Gentle swing
        ctx.scale(1 + Math.sin(rotateAngle * 2) * 0.1, 1 + Math.sin(rotateAngle * 2) * 0.1);
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#ffd700";
        ctx.textAlign = "center";
        ctx.font = "bold 64px 'Segoe UI', cursive";
        ctx.fillText("LEVEL COMPLETE!", 0, 0);
        ctx.restore();
    }
    if (finalWin) {
        ctx.fillStyle = "rgba(0,0,0,0.8)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = "center";
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 64px 'Segoe UI'";
        ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = "#fff";
        ctx.font = "32px 'Segoe UI'";
        ctx.fillText("You reached the castle!", canvas.width / 2, canvas.height / 2 + 40);
    }
}
/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
// Start
loadLevel(0);
loop();































































































































































































































































































































































































































































































































































