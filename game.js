/* ================= CANVAS & SETUP ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
// Make canvas full screen or fixed size? Let's go with fixed size for gameplay
// but responsive CSS handles the rest.
canvas.width = 1000;
canvas.height = 600;
/* ================= CONSTANTS ================= */
const GRAVITY = 0.6;
const FRICTION = 0.8;
const MOVE_ACCEL = 0.8;
const MAX_SPEED = 8;
const JUMP_FORCE = 14;
const FALL_DEATH_Y = 2000; // Death if you fall too far
// "Little Big" Character dimensions
// We'll make the hit box smaller than the visual sprite for better feel
const PLAYER_W = 60;
const PLAYER_H = 90;
const PLAYER_DRAW_SCALE = 1.4; // Visuals are bigger
/* ================= STATE ================= */
let levelIndex = 0;
let gameOver = false;
let levelWin = false;
let winTimer = 0;
let transitionRotate = 0;
let wandAngle = 0;
// Camera
const camera = { x: 0, y: 0 };
/* ================= ASSETS ================= */
const load = src => {
    const i = new Image();
    i.src = src;
    return i;
};
const bgImg = load("assets/bg.png");
const wizardImg = load("assets/wizard.png");
const blockImg = load("assets/block.png");
const castleImg = load("assets/castle.png");
const spikeImg = load("assets/spike.png");
// Audio (Placeholder handlers)
// If files exist, they will play. If not, catch suppresses errors.
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.3;
const deathSound = new Audio("assets/death.mp3");
let audioStarted = false;
window.addEventListener("keydown", () => {
    if (!audioStarted) {
        bgm.play().catch(() => { });
        audioStarted = true;
    }
}, { once: true });
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
/* ================= PARTICLES ================= */
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
/* ================= LEVELS ================= */
// Helper to create blocks more easily
const B = (x, y, w, h) => ({ x, y, w, h });
const S = (x, y) => ({ x, y, w: 40, h: 60 }); // Standard spike size
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
            S(500, 440), // First spike safe test
            S(1000, 450 + 50) // Spike below gap
        ],
        castle: { x: 1600, y: 50, w: 140, h: 200 },
        width: 2000
    },
    // LEVEL 2: More Spikes & Height (Simplified gaps)
    {
        start: { x: 100, y: 400 },
        blocks: [
            B(0, 500, 400, 100),
            // Gap reduced (was 500 start, now 450)
            B(450, 500, 400, 100),
            // Next blocks closer
            B(850, 400, 150, 40),
            B(1050, 300, 150, 40), // Closer
            B(1250, 200, 400, 40), // Closer
            B(1700, 300, 200, 40)
        ],
        spikes: [
            S(420, 500), // Spikes in gap
            S(950, 550),              // Ground spike
            S(1100, 400 - 60),        // Jump over spike
            S(1350, 200 - 60),        // Adjusted for new block pos
            S(1450, 200 - 60)
        ],
        castle: { x: 1750, y: 100, w: 140, h: 200 },
        width: 2500
    },
    // LEVEL 3: Verticality and Precision
    {
        start: { x: 100, y: 500 },
        blocks: [
            B(0, 550, 300, 50),
            B(400, 450, 100, 30),
            B(600, 350, 100, 30),
            B(800, 250, 100, 30),
            B(500, 150, 200, 30), // Middle platform
            B(200, 50, 200, 30),  // High platform
            B(1000, 350, 100, 30),
            B(1200, 450, 500, 50) // End platform
        ],
        spikes: [
            S(150, 550 - 60),
            S(650, 350 - 60),
            S(550, 150 - 60),
            S(1300, 450 - 60),
            S(1400, 450 - 60)
        ],
        castle: { x: 1500, y: 250, w: 140, h: 200 },
        width: 2000
    }
];
let blocks = [];
let spikes = [];
let castle = {};
let levelWidth = 0;
/* ================= GAME LOGIC ================= */
function loadLevel(i) {
    if (i >= levels.length) i = 0; // Loop back or end logic
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
    player.onGround = false;
    gameOver = false;
    levelWin = false;
    winTimer = 0;
    transitionRotate = 0;
    particles = [];
    wandAngle = 0;
}
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (gameOver && e.code === "KeyR") loadLevel(levelIndex);
});
window.addEventListener("keyup", e => keys[e.code] = false);
// AABB Collision
const rectIntersect = (r1, r2) =>
    r1.x < r2.x + r2.w &&
    r1.x + r1.w > r2.x &&
    r1.y < r2.y + r2.h &&
    r1.y + r1.h > r2.y;
function update() {
    if (gameOver) return;
    if (levelWin) {
        winTimer++;
        // Wand Swoosh Logic
        wandAngle = Math.sin(winTimer * 0.1) * 1.5; // Back and forth wave
        // Sparkles from wand tip
        // We estimate tip position similar to draw loop but in world space logic
        const tipX = player.x + player.w / 2 + (player.facingRight ? 1 : -1) * 40;
        const tipY = player.y + player.h / 3;
        // Shoot sparkles towards the center of screen where text will be?
        // Or just explosion of sparkles
        spawnSparkle(tipX, tipY, `hsl(${winTimer * 10}, 100%, 70%)`);
        // Also sparkles appearing in the center for the text
        if (winTimer > 30) {
            const cx = camera.x + canvas.width / 2 + (Math.random() - 0.5) * 300;
            const cy = camera.y + canvas.height / 2 + (Math.random() - 0.5) * 100;
            spawnSparkle(cx, cy, "white");
        }
        // Float player up
        player.y -= 0.5;
        player.onGround = false;
        if (winTimer > 240) { // 4 seconds (longer to appreciate the effect)
            loadLevel(levelIndex + 1);
        }
        return;
    }
    /* Movement Physics */
    if (keys.ArrowLeft) {
        player.vx -= MOVE_ACCEL;
        player.facingRight = false;
    }
    if (keys.ArrowRight) {
        player.vx += MOVE_ACCEL;
        player.facingRight = true;
    }
    // Friction
    player.vx *= FRICTION;
    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
        spawnSparkle(player.x + player.w / 2, player.y + player.h, "white");
    }
    player.vy += GRAVITY;
    // Cap speed
    if (player.vx > MAX_SPEED) player.vx = MAX_SPEED;
    if (player.vx < -MAX_SPEED) player.vx = -MAX_SPEED;
    player.x += player.vx;
    player.y += player.vy;
    /* Collision: Blocks */
    player.onGround = false;
    blocks.forEach(b => {
        // Basic Platformer Collision (checking previous position helps, but simple AABB usually fine for simple speeds)
        // We only resolve collisions effectively if we are falling onto them usually, or push out.
        // Simple approach: vertical resolution
        if (rectIntersect(player, b)) {
            // Check if we hit the top
            // If we were above the block in previous frame... logic simplified:
            // If vy > 0 and the bottom of player is roughly at top of block
            const overlapY = (player.y + player.h) - b.y;
            const overlapX = (player.x + player.w / 2) - (b.x + b.w / 2); // Center distance
            // Very simple "landing" check
            if (player.vy >= 0 && (player.y + player.h - player.vy) <= b.y + 10) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
            }
            // Ceiling check could go here
            // Wall check could go here
        }
    });
    /* Collision: Spikes */
    // Use a slightly smaller hitbox for spikes to be forgiving
    const hitBox = {
        x: player.x + 10,
        y: player.y + 10,
        w: player.w - 20,
        h: player.h - 10
    };
    spikes.forEach(s => {
        // Spike hitbox also smaller
        const spikeBox = {
            x: s.x + 10,
            y: s.y + 10,
            w: s.w - 20,
            h: s.h - 10
        };
        if (rectIntersect(hitBox, spikeBox)) {
            die();
        }
    });
    /* Death by fall */
    if (player.y > FALL_DEATH_Y) die();
    /* Win */
    if (rectIntersect(player, castle)) {
        levelWin = true;
        player.vx = 0;
        player.vy = 0;
        spawnSparkle(player.x, player.y, "gold");
    }
    /* Particles */
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);
    /* Camera Logic */
    // Camera follows player, centered on screen
    let targetCamX = player.x - canvas.width / 2 + player.w / 2;
    let targetCamY = player.y - canvas.height / 2 + player.h / 2;
    // Clamp camera
    if (targetCamX < 0) targetCamX = 0;
    // if (targetCamX > levelWidth - canvas.width) targetCamX = levelWidth - canvas.width;
    // Smooth follow
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;
    // Optional: Lock Y axis for simple platformers? "Movement everywhere" suggests free camera.
    // We'll keep Y follow but maybe clamp it so we don't see too much empty void below.
}
function die() {
    if (gameOver) return;
    gameOver = true;
    deathSound.play().catch(() => { });
    // Screen shake effect could be added here
}
/* ================= DRAW ================= */
/* ================= DRAW ================= */
function draw() {
    // Parallax Background + Auto Move (Clouds effect)
    // camera.x * 0.5 for parallax, + Date.now() * 0.05 for constant cloud movement
    const cloudOffset = Date.now() * 0.05;
    const bgScrollX = (camera.x * 0.5 + cloudOffset) % canvas.width;
    ctx.drawImage(bgImg, -bgScrollX, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, -bgScrollX + canvas.width, 0, canvas.width, canvas.height); // Tiled
    ctx.drawImage(bgImg, -bgScrollX - canvas.width, 0, canvas.width, canvas.height); // Tiled left
    ctx.save();
    ctx.translate(-Math.floor(camera.x), -Math.floor(camera.y));
    // Castle
    ctx.save();
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 30 + Math.sin(Date.now() / 200) * 15;
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    // Intense magical sparks!
    if (Math.random() < 0.3) {
        const color = Math.random() < 0.5 ? "cyan" : "white";
        spawnSparkle(castle.x + castle.w / 2 + (Math.random() - 0.5) * 60, castle.y + castle.h / 2 + (Math.random() - 0.5) * 90, color);
    }
    ctx.restore();
    // Blocks
    blocks.forEach(b => {
        ctx.drawImage(blockImg, b.x, b.y, b.w, b.h);
    });
    // Spikes
    spikes.forEach(s => {
        ctx.globalAlpha = 0.9;
        ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
        ctx.globalAlpha = 1.0;
    });
    // Player
    if (!gameOver) {
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(player.x + player.w / 2, player.y + player.h / 2);
            ctx.scale(-1, 1);
            ctx.translate(-(player.x + player.w / 2), -(player.y + player.h / 2));
        }
        // Default Draw
        const drawW = player.w * PLAYER_DRAW_SCALE;
        const drawH = player.h * PLAYER_DRAW_SCALE;
        const drawX = player.x - (drawW - player.w) / 2;
        const drawY = player.y - (drawH - player.h) / 2;
        ctx.drawImage(wizardImg, drawX, drawY, drawW, drawH);
        ctx.restore();
    }
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillRect(p.x, p.y, p.size || 4, p.size || 4);
    });
    ctx.globalAlpha = 1.0;
    ctx.restore(); // Restore camera translation
    /* UI Layer */
    ctx.fillStyle = "white";
    ctx.font = "bold 24px Arial";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 4;
    ctx.fillText(`Level ${levelIndex + 1}`, 20, 30);
    ctx.shadowBlur = 0;
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.save();
        ctx.shadowColor = "red";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "red";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2 - 20);
        ctx.restore();
        ctx.fillStyle = "white";
        ctx.font = "30px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Press R to Try Again", canvas.width / 2, canvas.height / 2 + 60);
        ctx.textAlign = "left";
    }
    if (levelWin) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        // Animation Phase: Wand Raise
        // Duration: 60 frames (1 sec)
        const raisePhase = Math.min(1, winTimer / 60);
        // Wand Position: Starts low, moves up
        const startWandY = centerY + 100;
        const endWandY = centerY - 50;
        const currentWandY = startWandY + (endWandY - startWandY) * raisePhase; // Linear interp
        // Draw the Wand Raising
        ctx.save();
        ctx.translate(centerX, currentWandY);
        ctx.rotate(0); // Upright wand
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(-4, 0, 8, 80); // Wand handle (vertical)
        // Flashing tip
        ctx.shadowColor = "white";
        ctx.shadowBlur = 20;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.random() * 0.5})`;
        ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Spawn sparkles along the path
        if (raisePhase < 1) {
            spawnSparkle(centerX + camera.x + (Math.random() - 0.5) * 20, currentWandY + camera.y, "cyan");
        }
        // Text Reveal Phase
        if (raisePhase >= 1) {
            // Boom! Text appears
            const textScale = Math.min(1, (winTimer - 60) / 20); // Quick pop
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.scale(textScale, textScale);
            ctx.shadowColor = "cyan";
            ctx.shadowBlur = 30;
            ctx.fillStyle = "white";
            ctx.font = "bold 60px Arial";
            ctx.textAlign = "center";
            ctx.fillText("LEVEL COMPLETED", 0, 0);
            ctx.shadowColor = "gold";
            ctx.font = "italic 30px Arial";
            ctx.fillText("Magical!", 0, 50);
            ctx.restore();
            // Continuous sparkles around text
            if (Math.random() < 0.2) {
                const tx = centerX + camera.x + (Math.random() - 0.5) * 400;
                const ty = centerY + camera.y + (Math.random() - 0.5) * 100;
                spawnSparkle(tx, ty, Math.random() < 0.5 ? "gold" : "white");
            }
        }
    }
}
/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
























































































































































































































































































































































































































































































