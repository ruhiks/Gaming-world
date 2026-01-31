/* ================= STATE ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 5;
const JUMP_FORCE = 16;
const FAST_FALL = 2.0;
const FALL_DEATH_Y = canvas.height + 40;
const CLOUD_SPEED = 1.0;
/* ================= VARIABLES ================= */
let gameState = "START"; // START, PLAY, LEVEL_WIN, GAME_WIN, GAME_OVER
let currentLevel = 0;
let winTimer = 0;
let wandAngle = 0;
let textScale = 0;
let particles = [];
let castleParticles = [];
let audioContext = null; // For robust audio if we were using WebAudio API, but staying simple for now
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
// Audio Logic
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.5;
const deathSound = new Audio("assets/death.mp3");
/* ================= PLAYER ================= */
const player = {
    x: 0, y: 0,
    w: 80, h: 80, // BIGGER
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true,
    visible: true
};
/* ================= LEVELS ================= */
const levels = [
    // LEVEL 1: Spikes introduced
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 250, y: 450, w: 200, h: 32 },
            { x: 550, y: 380, w: 200, h: 32 }
        ],
        spikes: [
            { x: 320, y: 418, w: 40, h: 32 } // Spike ON the path
        ],
        castle: { x: 800, y: 220, w: 140, h: 180 }
    },
    // LEVEL 2: More Spikes
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 220, h: 40 },
            { x: 280, y: 420, w: 140, h: 32 },
            { x: 500, y: 350, w: 140, h: 32 },
            { x: 750, y: 300, w: 210, h: 32 }
        ],
        spikes: [
            { x: 220, y: 500, w: 60, h: 32 }, // Floor spike
            { x: 330, y: 388, w: 40, h: 32 }, // Platform spike
            { x: 550, y: 318, w: 40, h: 32 }  // Platform spike
        ],
        castle: { x: 800, y: 140, w: 140, h: 180 }
    },
    // LEVEL 3: Hard
    {
        start: { x: 30, y: 450 },
        blocks: [
            { x: 0, y: 520, w: 120, h: 32 },
            { x: 180, y: 450, w: 100, h: 32 },
            { x: 350, y: 380, w: 100, h: 32 },
            { x: 520, y: 310, w: 100, h: 32 },
            { x: 690, y: 240, w: 100, h: 32 },
            { x: 830, y: 240, w: 130, h: 32 }
        ],
        spikes: [
            { x: 210, y: 418, w: 40, h: 32 },
            { x: 380, y: 348, w: 40, h: 32 }
        ],
        castle: { x: 810, y: 30, w: 140, h: 200 }
    }
];
let blocks = [], spikes = [], castle = {};
function loadLevel(i) {
    if (i >= levels.length) {
        gameState = "GAME_WIN";
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
    player.visible = true;
    gameState = "PLAY";
    winTimer = 0;
    textScale = 0;
    particles = [];
    castleParticles = [];
}
/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (gameState === "START" && e.code === "Space") {
        bgm.play().catch(e => console.log("Audio Error:", e));
        loadLevel(0);
    }
    if (gameState === "GAME_OVER" && e.code === "KeyR") loadLevel(currentLevel);
});
window.addEventListener("keyup", e => keys[e.code] = false);
// Click to start fallback
canvas.addEventListener("click", () => {
    if (gameState === "START") {
        bgm.play().catch(e => console.log("Audio Error:", e));
        loadLevel(0);
    }
});
/* ================= LOGIC ================= */
// Background vars
let cloudX1 = 0;
let cloudX2 = canvas.width;
function update() {
    // Scroll BG always
    cloudX1 -= CLOUD_SPEED;
    cloudX2 -= CLOUD_SPEED;
    if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
    if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;
    // Castle Sparkles (Always, make them bright)
    if (gameState !== "START" && castle.x) {
        if (Math.random() < 0.4) {
            castleParticles.push({
                x: castle.x + Math.random() * castle.w,
                y: castle.y + Math.random() * castle.h,
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1 - 1,
                life: 40,
                color: "white",
                size: Math.random() * 5 + 2
            });
        }
    }
    if (gameState === "PLAY") updatePlay();
    else if (gameState === "LEVEL_WIN") updateLevelWin();
    updateParticles();
}
function updatePlay() {
    // Move
    const dir = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    player.vx = dir * MOVE_SPEED;
    if (dir !== 0) player.facingRight = dir > 0;
    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
    }
    if (keys.ArrowDown) player.vy += FAST_FALL;
    // Physics
    player.vy += GRAVITY;
    player.x += player.vx;
    handleCollisionsX();
    player.y += player.vy;
    player.onGround = false;
    handleCollisionsY();
    // Bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    // Death
    if (player.y > FALL_DEATH_Y) die();
    spikes.forEach(s => { if (rectIntersect(player, s)) die(); });
    // Win Condition: Enter Castle
    // Checks if player center is inside castle
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    if (px > castle.x + 20 && px < castle.x + castle.w - 20 &&
        py > castle.y + 20 && py < castle.y + castle.h) {
        gameState = "LEVEL_WIN";
        player.vx = 0; player.vy = 0;
        player.x = castle.x + castle.w / 2 - player.w / 2; // Snap to center
        player.y = castle.y + castle.h - player.h - 10;
    }
}
function updateLevelWin() {
    winTimer++;
    // Phase 1: Player enters (fades/shrinks slightly)
    // Actually user wants: character enters, THEN raises wand, THEN sparkles
    // Wand Raise
    if (winTimer < 40) {
        wandAngle = (winTimer / 40) * (-Math.PI / 3);
    }
    // Sparkles Explosion
    if (winTimer === 45) {
        // Big burst
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: castle.x + castle.w / 2,
                y: castle.y + castle.h / 2,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 100,
                color: `hsl(${Math.random() * 60 + 50}, 100%, 70%)`,
                size: Math.random() * 6 + 3
            });
        }
    }
    // Text Animation
    if (winTimer > 45) {
        if (textScale < 1) textScale += 0.05;
    }
    // Next Level
    if (winTimer > 200) {
        currentLevel++;
        loadLevel(currentLevel);
    }
}
function handleCollisionsX() {
    blocks.forEach(b => {
        if (rectIntersect(player, b)) {
            if (player.vx > 0) player.x = b.x - player.w;
            else if (player.vx < 0) player.x = b.x + b.w;
            player.vx = 0;
        }
    });
}
function handleCollisionsY() {
    blocks.forEach(b => {
        if (rectIntersect(player, b)) {
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
}
function rectIntersect(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
function die() {
    gameState = "GAME_OVER";
    deathSound.play().catch(() => { });
}
function updateParticles() {
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    castleParticles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
    particles = particles.filter(p => p.life > 0);
    castleParticles = castleParticles.filter(p => p.life > 0);
}
/* ================= DRAW ================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // BG
    ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);
    // Start Screen
    if (gameState === "START") {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.textAlign = "center";
        ctx.font = "bold 50px Arial";
        ctx.fillText("ANTIGRAVITY WIZARD", canvas.width / 2, 200);
        ctx.font = "30px Arial";
        ctx.fillText("Click or Press SPACE to Start", canvas.width / 2, 300);
        return; // Skip rest
    }
    // World
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
    // Castle
    // Draw "Glow" behind castle
    ctx.save();
    ctx.shadowColor = "gold";
    ctx.shadowBlur = 30;
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    ctx.restore();
    // Castle Particles
    drawParticles(castleParticles);
    // Player
    if (player.visible) {
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(player.x + player.w, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(wizardImg, 0, 0, player.w, player.h);
        } else {
            ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
        }
        // Wand logic
        if (gameState === "LEVEL_WIN") {
            ctx.save();
            if (player.facingRight) ctx.translate(player.x + player.w - 15, player.y + 40);
            else ctx.translate(15, 40);
            ctx.rotate(wandAngle);
            ctx.fillStyle = "#8d5524";
            ctx.fillRect(0, -4, 40, 8); // Stick
            ctx.fillStyle = "cyan";
            ctx.fillRect(35, -5, 10, 10); // Tip
            ctx.restore();
        }
        ctx.restore();
    }
    // Explosion Particles
    drawParticles(particles);
    // UI
    if (gameState === "GAME_OVER") {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff4444";
        ctx.textAlign = "center";
        ctx.font = "bold 60px Arial";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("Press R", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "left";
    }
    if (gameState === "LEVEL_WIN" && textScale > 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(textScale, textScale);
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 10;
        ctx.textAlign = "center";
        ctx.font = "bold 70px Arial";
        ctx.fillText("LEVEL COMPLETED", 0, 0);
        ctx.restore();
    }
    if (gameState === "GAME_WIN") {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.textAlign = "center";
        ctx.font = "bold 80px Arial";
        ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2);
    }
}
function drawParticles(list) {
    list.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 4, 0, Math.PI * 2);
        ctx.fill();
    });
}
function loop() {
    try {
        update();
        draw();
        requestAnimationFrame(loop);
    } catch (e) {
        console.error(e);
    }
}
loop();










































































































































































































































































































































































































































































































































