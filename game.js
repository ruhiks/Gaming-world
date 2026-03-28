"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= IMAGES ================= */
const bg = new Image();
bg.src = "assets/bg.png";

const wizard = new Image();
wizard.src = "assets/wizard.png";

const block = new Image();
block.src = "assets/block.png";

const spikeImg = new Image();
spikeImg.src = "assets/spike.png";

const castleImg = new Image();
castleImg.src = "assets/castle.png";

/* ================= AUDIO ================= */
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
bgm.volume = 0.5;

let musicStarted = false;

function startMusic() {
    if (!musicStarted) {
        bgm.play().catch(() => {});
        musicStarted = true;
    }
}

window.addEventListener("click", startMusic);
window.addEventListener("keydown", startMusic);

/* ================= PLAYER ================= */
const player = {
    x: 50,
    y: 400,
    w: 50,
    h: 50,
    vx: 0,
    vy: 0,
    speed: 5,
    jump: 14,
    onGround: false
};

/* ================= STATE ================= */
let level = 0;
let gameOver = false;
let win = false;
let bgX = 0;

/* ================= PARTICLES ================= */
let particles = [];

function spark(x, y, color = "gold") {
    for (let i = 0; i < 5; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            life: 40,
            color
        });
    }
}

/* ================= LEVELS ================= */
const levels = [
    {
        start: { x: 50, y: 400 },
        platforms: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 300, y: 420, w: 120, h: 20 },
            { x: 600, y: 350, w: 120, h: 20 }
        ],
        spikes: [{ x: 450, y: 480, w: 40, h: 20 }],
        castle: { x: 820, y: 250, w: 100, h: 120 }
    },
    {
        start: { x: 50, y: 400 },
        platforms: [
            { x: 0, y: 500, w: 200, h: 40 },
            { x: 250, y: 420, w: 120, h: 20, move: true, min: 250, max: 500 },
            { x: 600, y: 320, w: 120, h: 20 }
        ],
        spikes: [
            { x: 200, y: 500, w: 100, h: 20 },
            { x: 500, y: 300, w: 40, h: 20 }
        ],
        castle: { x: 820, y: 180, w: 100, h: 120 }
    },
    {
        start: { x: 20, y: 450 },
        platforms: [
            { x: 0, y: 520, w: 120, h: 20 },
            { x: 200, y: 420, w: 100, h: 20, move: true, min: 200, max: 450 },
            { x: 500, y: 320, w: 100, h: 20 },
            { x: 700, y: 220, w: 150, h: 20 }
        ],
        spikes: [
            { x: 150, y: 520, w: 400, h: 20 },
            { x: 500, y: 300, w: 50, h: 20 }
        ],
        castle: { x: 820, y: 80, w: 100, h: 120 }
    }
];

let platforms = [];
let spikes = [];
let castle = {};

/* ================= LOAD LEVEL ================= */
function loadLevel(i) {
    const l = levels[i];

    platforms = l.platforms.map(p => ({ ...p, dir: 1 }));
    spikes = l.spikes;
    castle = l.castle;

    player.x = l.start.x;
    player.y = l.start.y;
    player.vy = 0;

    win = false;
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (gameOver && e.code === "KeyR") {
        loadLevel(level);
        gameOver = false;
    }
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= COLLISION ================= */
function hit(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

/* ================= UPDATE ================= */
function update() {

    if (gameOver || win) return;

    /* Background scroll */
    bgX -= 0.5;
    if (bgX <= -canvas.width) bgX = 0;

    /* Movement */
    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -player.speed;
    if (keys.ArrowRight) player.vx = player.speed;

    if (keys.Space && player.onGround) {
        player.vy = -player.jump;
        spark(player.x, player.y, "cyan");
    }

    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;

    platforms.forEach(p => {

        if (p.move) {
            p.x += 2 * p.dir;
            if (p.x > p.max || p.x < p.min) p.dir *= -1;
        }

        if (hit(player, p) && player.vy >= 0) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.onGround = true;
        }
    });

    /* Death */
    if (player.y > canvas.height) gameOver = true;

    spikes.forEach(s => {
        if (hit(player, s)) gameOver = true;
    });

    /* Win */
    if (hit(player, castle)) {
        win = true;

        setTimeout(() => {
            level++;
            if (level >= levels.length) {
                alert("🎉 Dungeon Completed!");
                level = 0;
            }
            loadLevel(level);
        }, 1500);
    }

    /* Particles */
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });
    particles = particles.filter(p => p.life > 0);

    /* Castle sparkle */
    spark(castle.x + 50, castle.y + 20, "yellow");
}

/* ================= DRAW ================= */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Background */
    if (bg.complete) {
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
    }

    /* Platforms */
    platforms.forEach(p => ctx.drawImage(block, p.x, p.y, p.w, p.h));

    /* Spikes */
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

    /* Castle Glow */
    ctx.shadowColor = "gold";
    ctx.shadowBlur = 30;
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    ctx.shadowBlur = 0;

    /* Dragon (safe) */
    ctx.fillStyle = "purple";
    ctx.fillRect(castle.x - 60, castle.y, 40, 40);

    /* Player */
    ctx.drawImage(wizard, player.x, player.y, 60, 60);

    /* Particles */
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    /* UI */
    ctx.fillStyle = "white";
    ctx.fillText("Level " + (level + 1), 20, 30);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED (R)", 300, 260);
    }

    if (win) {
        ctx.fillStyle = "yellow";
        ctx.font = "40px Arial";
        ctx.fillText("LEVEL COMPLETED", 250, 260);
    }
}

/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

/* ================= START ================= */
loadLevel(0);
loop();


















































































































































































































































































































































































































































































































