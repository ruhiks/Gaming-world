/* ================= CANVAS & SETUP ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// Responsive Canvas
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();
/* ================= CONSTANTS ================= */
const GRAVITY = 0.6;
const FRICTION = 0.8;
const MOVE_ACCEL = 0.8;
const MAX_SPEED = 8;
const JUMP_FORCE = 14;
const FALL_DEATH_Y = 2000;
const PLAYER_W = 40; // Slightly smaller for better feel
const PLAYER_H = 60;
/* ================= STATE ================= */
let levelIndex = 0;
let gameOver = false;
let levelWin = false;
let winTimer = 0;
let wandAngle = 0;
// Camera
const camera = { x: 0, y: 0 };
/* ================= MAGIC BACKGROUND ================= */
class MagicParticle {
    constructor() {
        this.reset();
    }
    reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.alpha = Math.random() * 0.5;
        this.fadeSpeed = Math.random() * 0.005 + 0.002;
        // Violet/Magic Palette
        const hue = Math.random() * 60 + 250; // 250-310 (Violet/Purple)
        this.color = `hsla(${hue}, 100%, 70%,`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.alpha += this.fadeSpeed;
        if (this.alpha > 0.8 || this.alpha < 0) this.fadeSpeed *= -1;
        // Wrap around screen
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
    }
    draw(ctx) {
        ctx.fillStyle = this.color + this.alpha + ")";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}
const bgParticles = Array.from({ length: 150 }, () => new MagicParticle());
/* ================= EFFECTS ================= */
let particles = [];
function spawnSparkle(x, y, color = "gold") {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 30 + Math.random() * 20,
            color: color
        });
    }
}
/* ================= PLAYER ================= */
const player = {
    x: 100,
    y: 100,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    onGround: false,
    facingRight: true
};
/* ================= LEVELS ================= */
const B = (x, y, w, h) => ({ x, y, w, h });
const S = (x, y) => ({ x, y, w: 40, h: 40 }); // Adjust spike size
const levels = [
    // LEVEL 1: Introduction
    {
        start: { x: 100, y: 300 },
        blocks: [
            B(0, 500, 800, 100),   // Start platform
            B(900, 450, 200, 50),
            B(1200, 350, 200, 50),
            B(1500, 250, 300, 50), // Before castle
            B(-200, 0, 100, 600)   // Left wall
        ],
        spikes: [
            S(500, 460), // First spike safe test
            S(1000, 600) // Spike way below (decoration)
        ],
        castle: { x: 1600, y: 50, w: 100, h: 200 },
        width: 2000
    },
    // LEVEL 2: "Little Easy" (Simplified)
    {
        start: { x: 100, y: 400 },
        blocks: [
            B(0, 500, 500, 100),   // Long start
            B(550, 450, 300, 50),  // Easy step up
            B(900, 400, 300, 50),  // Another wide step
            B(1300, 350, 400, 50), // Long landing
            B(-200, 0, 100, 600)
        ],
        spikes: [
            S(700, 450 - 40), // Spike ON the platform? No, let's put it clearly visible
            // Actually request was "Little Easy", let's make spikes sparse
            S(300, 500 - 40), // One visible spike on ground
            S(1100, 400 - 40) // One jump over spike
        ],
        castle: { x: 1400, y: 150, w: 100, h: 200 },
        width: 2000
    },
    // LEVEL 3: More challenge
    {
        start: { x: 100, y: 500 },
        blocks: [
            B(0, 550, 300, 50),
            B(400, 450, 100, 30),
            B(600, 350, 100, 30),
            B(800, 250, 200, 30),
            B(1100, 250, 300, 50)
        ],
        spikes: [
            S(150, 510),
            S(650, 310)
        ],
        castle: { x: 1200, y: 50, w: 100, h: 200 },
        width: 1500
    }
];
let blocks = [], spikes = [], castle = {};
let levelWidth = 0;
function loadLevel(i) {
    if (i >= levels.length) i = 0;
    levelIndex = i;
    const l = levels[i];
    blocks = l.blocks;
    spikes = l.spikes;
    castle = l.castle;
    levelWidth = l.width;
    player.x = l.start.x;
    player.y = l.start.y;
    player.vx = 0;
    player.vy = 0;
    gameOver = false;
    levelWin = false;
    winTimer = 0;
    particles = [];
}
/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    keys[e.code] = true;
    if (gameOver && (e.key === 'r' || e.code === 'KeyR')) loadLevel(levelIndex);
});
window.addEventListener("keyup", e => {
    keys[e.key] = false;
    keys[e.code] = false;
});
/* ================= UPDATE ================= */
const rectIntersect = (r1, r2) =>
    r1.x < r2.x + r2.w && r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
function update() {
    if (gameOver) return;
    // Background Particles Always Update
    bgParticles.forEach(p => p.update());
    if (levelWin) {
        winTimer++;
        if (winTimer > 180) loadLevel(levelIndex + 1);
        spawnSparkle(player.x + player.w / 2, player.y + player.h / 2, `hsl(${winTimer * 10}, 100%, 50%)`);
        return;
    }
    // Movement
    if (keys.ArrowLeft || keys.KeyA) { player.vx -= MOVE_ACCEL; player.facingRight = false; }
    if (keys.ArrowRight || keys.KeyD) { player.vx += MOVE_ACCEL; player.facingRight = true; }
    player.vx *= FRICTION;
    if ((keys.Space || keys.ArrowUp || keys.KeyW) && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
        spawnSparkle(player.x + player.w / 2, player.y + player.h, "white");
    }
    player.vy += GRAVITY;
    if (player.vx > MAX_SPEED) player.vx = MAX_SPEED;
    if (player.vx < -MAX_SPEED) player.vx = -MAX_SPEED;
    player.x += player.vx;
    player.y += player.vy;
    // Collisions
    player.onGround = false;
    blocks.forEach(b => {
        if (rectIntersect(player, b)) {
            // Overlap depth
            const oy = (player.y + player.h) - b.y;
            const ox = (player.x + player.w / 2) - (b.x + b.w / 2);
            // Simple Top Collision
            if (player.vy >= 0 && oy < 20 && player.y + player.h > b.y) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
            }
            // Horz collision would go here
        }
    });
    // Spikes
    const hitBox = { x: player.x + 10, y: player.y + 10, w: player.w - 20, h: player.h - 10 };
    spikes.forEach(s => {
        if (rectIntersect(hitBox, s)) die();
    });
    if (player.y > FALL_DEATH_Y) die();
    // Goal
    if (rectIntersect(player, castle)) {
        levelWin = true;
        spawnSparkle(player.x, player.y, "gold");
    }
    // Camera
    let targetCamX = player.x - canvas.width / 2 + player.w / 2;
    if (targetCamX < 0) targetCamX = 0;
    // Limit camera end to level width??
    // if (targetCamX > levelWidth - canvas.width) targetCamX = levelWidth - canvas.width;
    camera.x += (targetCamX - camera.x) * 0.1;
    // Effect Particles
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);
}
function die() {
    if (!gameOver) {
        gameOver = true;
        // deathSound.play(); // Optional
    }
}
/* ================= DRAW ================= */
function draw() {
    // 1. Clear & Background
    ctx.fillStyle = "#1a0b2e"; // Dark Violet
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // 2. Magic Particles
    bgParticles.forEach(p => p.draw(ctx));
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    // 3. World Objects
    // Castle
    ctx.fillStyle = "#00ffff";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "cyan";
    ctx.fillRect(castle.x, castle.y, castle.w, castle.h);
    ctx.shadowBlur = 0;
    // Blocks
    ctx.fillStyle = "#4a4e69";
    blocks.forEach(b => {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = "#9a8c98"; // Highlight
        ctx.fillRect(b.x, b.y, b.w, 5);
        ctx.fillStyle = "#4a4e69"; // Reset
    });
    // Spikes
    ctx.fillStyle = "#e63946";
    spikes.forEach(s => {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y + s.h);
        ctx.lineTo(s.x + s.w / 2, s.y);
        ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.fill();
    });
    // Player
    if (!gameOver) {
        ctx.fillStyle = "gold";
        ctx.fillRect(player.x, player.y, player.w, player.h);
        // Hat
        ctx.fillStyle = "purple";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(player.x + player.w, player.y);
        ctx.lineTo(player.x + player.w / 2, player.y - 20);
        ctx.fill();
    }
    // Effect Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 50;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0;
    ctx.restore();
    // 4. UI
    ctx.fillStyle = "white";
    ctx.font = "24px Arial";
    ctx.fillText("Level: " + (levelIndex + 1), 20, 40);
    if (levelWin) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.fillText("LEVEL COMPLETE!", canvas.width / 2, canvas.height / 2);
    }
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "red";
        ctx.font = "50px Arial";
        ctx.textAlign = "center";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "white";
        ctx.font = "20px Arial";
        ctx.fillText("Press R or Space to Restart", canvas.width / 2, canvas.height / 2 + 50);
    }
}
/* ================= LOOP ================= */
loadLevel(0);
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loop();
























































































































































































































































































































































































































































































