/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
/* ================= CONSTANTS ================= */
const GRAVITY = 0.9;
const MOVE_SPEED = 4;
const JUMP_FORCE = 15;
const FAST_FALL = 1.8;
const FALL_DEATH_Y = canvas.height + 40; // Die immediately when falling off screen
/* ================= STATE ================= */
let currentLevel = 0;
let gameOver = false;
let levelComplete = false;
let finalWin = false;
let winTimer = 0;
let wandAngle = 0;
let textScale = 0;
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
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.4;
const deathSound = new Audio("assets/death.mp3");
// Audio unlock
let audioUnlocked = false;
const unlockAudio = () => {
    if (!audioUnlocked) {
        bgm.play().catch(() => { });
        audioUnlocked = true;
    }
};
window.addEventListener("keydown", unlockAudio, { once: true });
window.addEventListener("click", unlockAudio, { once: true });
/* ================= PLAYER ================= */
const player = {
    x: 0, y: 0,
    w: 64, h: 64,
    vx: 0, vy: 0,
    onGround: false,
    facingRight: true
};
/* ================= PARTICLES ================= */
let particles = [];
function spawnSparkles(x, y) {
    for (let i = 0; i < 3; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5 - 2,
            life: 60,
            color: `hsl(${Math.random() * 60 + 40}, 100%, 70%)`,
            size: Math.random() * 4 + 2
        });
    }
}
/* ================= LEVELS ================= */
const levels = [
    // LEVEL 1: Tutorial (Safe floor)
    {
        start: { x: 50, y: 400 },
        blocks: [
            { x: 0, y: 500, w: 960, h: 40 }, // Safe floor
            { x: 300, y: 400, w: 150, h: 32 },
            { x: 600, y: 300, w: 150, h: 32 }
        ],
        spikes: [],
        castle: { x: 800, y: 200, w: 120, h: 140 }
    },
    // LEVEL 2: The Gap (No floor, must jump)
    {
        start: { x: 50, y: 350 },
        blocks: [
            { x: 0, y: 450, w: 200, h: 32 }, // Start platform
            { x: 300, y: 400, w: 120, h: 32 },
            { x: 500, y: 350, w: 120, h: 32 },
            { x: 750, y: 300, w: 200, h: 32 } // End platform
        ],
        spikes: [
            { x: 250, y: 510, w: 500, h: 32 } // Spikes at bottom just in case
        ],
        castle: { x: 800, y: 200, w: 120, h: 140 }
    },
    // LEVEL 3: Harder (Tiny platforms, verticality, NO FLOOR)
    {
        start: { x: 40, y: 400 },
        blocks: [
            { x: 20, y: 480, w: 100, h: 32 }, // Start
            { x: 200, y: 420, w: 80, h: 32 },
            { x: 380, y: 360, w: 80, h: 32 },
            { x: 560, y: 300, w: 80, h: 32 },
            { x: 740, y: 240, w: 80, h: 32 },
            { x: 850, y: 180, w: 100, h: 32 } // Goal platform
        ],
        spikes: [], // The void is the danger
        castle: { x: 860, y: 80, w: 80, h: 100 }
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
/* ================= COLLISION ================= */
const hit = (a, b) =>
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
/* ================= UPDATE ================= */
function update() {
    cloudX1 -= CLOUD_SPEED;
    cloudX2 -= CLOUD_SPEED;
    if (cloudX1 <= -canvas.width) cloudX1 = canvas.width;
    if (cloudX2 <= -canvas.width) cloudX2 = canvas.width;
    if (gameOver || finalWin) return;
    // == LEVEL COMPLETE ANIMATION LIGIC ==
    if (levelComplete) {
        winTimer++;
        // 1. Raise Wand (0 to 90 degrees approx)
        if (winTimer < 30) {
            wandAngle = (winTimer / 30) * -Math.PI / 4; // Raise up
        }
        // 2. Spawn stats
        if (winTimer > 30) {
            // Wand Tip Position
            const dir = player.facingRight ? 1 : -1;
            const tipX = player.x + (player.w / 2) + (dir * 30);
            const tipY = player.y + 20; // Raised height
            spawnSparkles(tipX, tipY);
            // 3. Animate Text
            if (textScale < 1) textScale += 0.05;
        }
        // 4. Next Level
        if (winTimer > 180) { // 3 seconds
            currentLevel++;
            if (currentLevel < levels.length) loadLevel(currentLevel);
            else finalWin = true;
        }
        // Particle Physics
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
        return;
    }
    // == PLAYER MOVEMENT ==
    const moveDir = (keys.ArrowLeft ? -1 : 0) + (keys.ArrowRight ? 1 : 0);
    player.vx = moveDir * MOVE_SPEED;
    if (moveDir !== 0) player.facingRight = moveDir > 0;
    if (keys.Space && player.onGround) {
        player.vy = -JUMP_FORCE;
        player.onGround = false;
    }
    if (keys.ArrowDown) player.vy += FAST_FALL;
    // Phyics X
    player.x += player.vx;
    blocks.forEach(b => {
        if (hit(player, b)) {
            if (player.vx > 0) player.x = b.x - player.w;
            else if (player.vx < 0) player.x = b.x + b.w;
            player.vx = 0;
        }
    });
    // Limit Bounds X
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
    // Physics Y
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
                player.vy = 0; // Bonk head
            }
        }
    });
    // Death
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
    // Win Check
    if (hit(player, castle)) {
        levelComplete = true;
        player.vx = 0;
        player.vy = 0;
    }
    // Particle cleanup
    particles = particles.filter(p => p.life > 0);
}
/* ================= DRAW ================= */
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    ctx.drawImage(bg, cloudX1, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, cloudX2, 0, canvas.width, canvas.height);
    // Blocks
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
    // Castle
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    // Player
    ctx.save();
    // Facing flip
    if (!player.facingRight) {
        ctx.translate(player.x + player.w, player.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizardImg, 0, 0, player.w, player.h);
    } else {
        ctx.drawImage(wizardImg, player.x, player.y, player.w, player.h);
    }
    // Wand Logic
    if (levelComplete) {
        ctx.save();
        // Pivot at hand position (approximate)
        ctx.translate(player.facingRight ? player.x + 40 : 40, player.y + 40);
        ctx.rotate(wandAngle);
        // Draw Wand
        ctx.fillStyle = "#8d5524";
        ctx.fillRect(0, -5, 30, 6);
        ctx.fillStyle = "white"; // Magic Tip
        ctx.fillRect(28, -6, 6, 8);
        ctx.restore();
    }
    ctx.restore(); // Restore flip
    // Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    // UI
    ctx.fillStyle = "white";
    ctx.font = "20px sans-serif";
    ctx.fillText(`Level ${currentLevel + 1}`, 20, 30);
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ff5555";
        ctx.textAlign = "center";
        ctx.font = "bold 50px sans-serif";
        ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
        ctx.fillStyle = "white";
        ctx.font = "24px sans-serif";
        ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
    }
    if (levelComplete) {
        if (textScale > 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            ctx.rotate(Math.sin(winTimer * 0.1) * 0.1);
            ctx.shadowColor = "gold";
            ctx.shadowBlur = 20;
            ctx.fillStyle = "#fff700";
            ctx.textAlign = "center";
            ctx.font = "bold 60px sans-serif";
            ctx.fillText("LEVEL COMPLETE!", 0, 0);
            ctx.restore();
        }
    }
    if (finalWin) {
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "gold";
        ctx.textAlign = "center";
        ctx.font = "bold 60px sans-serif";
        ctx.fillText("YOU WIN!", canvas.width / 2, canvas.height / 2);
    }
}
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}
loadLevel(0);
loop();




























































































































































































































































































































































































































































































































































