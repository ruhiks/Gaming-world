/* ================= STATE ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 5;
const JUMP_FORCE = 16;
const FAST_FALL = 2.0;
const FALL_DEATH_Y = canvas.height + 40;
const CLOUD_SPEED = 1.0; // Faster clouds
/* ================= VARIABLES ================= */
let currentLevel = 0;
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let winTimer = 0;
let wandAngle = 0;
let textScale = 0;
let particles = [];
let castleParticles = [];
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
// Audio Logic (Safe Mode)
// Note: Requires 'music.mp3' and 'death.mp3' in assets folder to actually play.
const playAudio = (path) => {
    const audio = new Audio(path);
    audio.volume = 0.4;
    audio.play().catch(() => { }); // Ignore errors if file missing
};
/* ================= BACKGROUND ================= */
let cloudX1 = 0;
let cloudX2 = canvas.width;
/* ================= PLAYER ================= */
const player = {
    x: 0, y: 0,
    w: 80, h: 80, // BIGGER PLAYER
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
            { x: 300, y: 420, w: 180, h: 32 },
            { x: 600, y: 320, w: 180, h: 32 }
        ],
        spikes: [],
        castle: { x: 750, y: 150, w: 160, h: 200 } // BIGGER CASTLE
    },
    // LEVEL 2: The Gap
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 220, h: 40 },
            { x: 280, y: 450, w: 120, h: 32 },
            { x: 450, y: 400, w: 120, h: 32 },
            { x: 620, y: 350, w: 120, h: 32 },
            { x: 800, y: 350, w: 160, h: 32 }
        ],
        spikes: [{ x: 300, y: 510, w: 400, h: 32 }],
        castle: { x: 800, y: 140, w: 160, h: 200 }
    },
    // LEVEL 3: Hard Verticality
    {
        start: { x: 30, y: 450 },
        blocks: [
            { x: 0, y: 520, w: 120, h: 32 }, // Start
            { x: 180, y: 450, w: 100, h: 32 },
            { x: 350, y: 380, w: 100, h: 32 },
            { x: 520, y: 310, w: 100, h: 32 },
            { x: 690, y: 240, w: 100, h: 32 },
            { x: 830, y: 240, w: 130, h: 32 } // Goal
        ],
        spikes: [],
        castle: { x: 810, y: 30, w: 140, h: 200 } // Tucked high up
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
    castleParticles = [];
}
/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (gameOver && e.code === "KeyR") loadLevel(currentLevel);
});
window.addEventListener("keyup", e => keys[e.code] = false);
/* ================= LOGIC ================= */
function update() {
    // --- BACKGROUND SCROLL ---
    cloudX1 -= CLOUD_SPEED;
    cloudX2 -= CLOUD_SPEED;
    if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
    if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;
    if (gameOver || finalWin) return;
    // --- CASTLE SPARKLES (Always Active) ---
    // Spawn particles around the castle
    if (Math.random() < 0.3) { // 30% chance per frame
        castleParticles.push({
            x: castle.x + Math.random() * castle.w,
            y: castle.y + Math.random() * castle.h,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5 - 1,
            life: 60,
            color: `hsl(${Math.random() * 60 + 50}, 100%, 70%)` // Gold/Yellow ish
        });
    }
    // --- LEVEL COMPLETE ANIMATION ---
    if (levelComplete) {
        winTimer++;
        if (winTimer < 30) {
            wandAngle = (winTimer / 30) * (-Math.PI / 3);
        } else {
            if (textScale < 1) textScale += 0.05;
            // Player Wand Sparkles
            const tipX = player.facingRight ? player.x + player.w : player.x;
            const tipY = player.y; // High up
            spawnSparkles(tipX, tipY);
        }
        if (winTimer > 180) {
            currentLevel++;
            loadLevel(currentLevel);
        }
        updateParticles();
        return;
    }
    // --- MOVEMENT ---
    const dir = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    player.vx = dir * MOVE_SPEED;
    if (dir !== 0) player.facingRight = dir > 0;
    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
    }
    if (keys.ArrowDown) player.vy += FAST_FALL;
    // Physics Loop
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
    // Win
    if (rectIntersect(player, castle)) {
        levelComplete = true;
        player.vx = 0; player.vy = 0;
    }
    updateParticles();
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
    gameOver = true;
    playAudio("assets/death.mp3");
}
function spawnSparkles(x, y) {
    for (let i = 0; i < 3; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 5,
            life: 40,
            color: "white"
        });
    }
}
function updateParticles() {
    [particles, castleParticles].forEach(list => {
        list.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
    });
    // Filter dead
    particles = particles.filter(p => p.life > 0);
    castleParticles = castleParticles.filter(p => p.life > 0);
}
/* ================= DRAW ================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // BG (Scrolled)
    ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);
    // Objects
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
    // Castle Sparkles (Behind)
    drawParticles(castleParticles);
    // Castle
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    // Player
    ctx.save();
    if (!player.facingRight) {
        ctx.translate(player.x + player.w, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizardImg, 0, 0, player.w, player.h);
    } else {
        ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
    }
    // Wand
    if (levelComplete) {
        ctx.save();
        if (player.facingRight) ctx.translate(player.x + player.w - 15, player.y + 30);
        else ctx.translate(15, 30); // Relative in flipped context
        ctx.rotate(wandAngle);
        ctx.fillStyle = "#8d5524";
        ctx.fillRect(0, -3, 35, 6);
        ctx.fillStyle = "cyan";
        ctx.fillRect(30, -4, 8, 8);
        ctx.restore();
    }
    ctx.restore();
    // Wand Particles
    drawParticles(particles);
    // UI
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.fillText("Level " + (currentLevel + 1), 20, 40);
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff5555";
        ctx.textAlign = "center";
        ctx.font = "bold 60px Arial";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.fillText("Press R", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "left";
    }
    if (levelComplete && textScale > 0) {
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(textScale, textScale);
        ctx.fillStyle = "#ffd700";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 10;
        ctx.textAlign = "center";
        ctx.font = "bold 80px Arial";
        ctx.fillText("LEVEL COMPLETE!", 0, 0);
        ctx.restore();
    }
    if (finalWin) {
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
        ctx.globalAlpha = p.life / 60;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
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
loadLevel(0);
loop();




























































































































































































































































































































































































































































































































































