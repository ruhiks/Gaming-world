"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= IMAGES ================= */
const bg = new Image(); bg.src = "assets/bg.png";
const wizard = new Image(); wizard.src = "assets/wizard.png";
const block = new Image(); block.src = "assets/block.png";
const spikeImg = new Image(); spikeImg.src = "assets/spike.png";
const castleImg = new Image(); castleImg.src = "assets/castle.png";
const dragonImg = new Image(); dragonImg.src = "assets/dragon.png";

/* ================= AUDIO ================= */
const deathSound = new Audio("assets/death.mp3");

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

/* ================= FIRE ================= */
let fireballs = [];
let fireTimer = 0;

/* ================= LEVELS ================= */
const levels = [
    {
        platforms: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 300, y: 420, w: 120, h: 20 },
            { x: 600, y: 350, w: 120, h: 20 }
        ],
        spikes: [{ x: 450, y: 480, w: 40, h: 20 }],
        dragon: { x: 720, y: 250, fireRate: 120 },
        castle: { x: 820, y: 250, w: 100, h: 120 }
    },
    {
        platforms: [
            { x: 0, y: 500, w: 200, h: 40 },
            { x: 250, y: 420, w: 120, h: 20, move: true, min: 250, max: 500 },
            { x: 600, y: 320, w: 120, h: 20 }
        ],
        spikes: [
            { x: 200, y: 500, w: 100, h: 20 },
            { x: 500, y: 300, w: 40, h: 20 }
        ],
        dragon: { x: 720, y: 200, fireRate: 90 },
        castle: { x: 820, y: 180, w: 100, h: 120 }
    },
    {
        platforms: [
            { x: 0, y: 520, w: 120, h: 20 },
            { x: 200, y: 420, w: 100, h: 20, move: true, min: 200, max: 450 },
            { x: 500, y: 320, w: 100, h: 20 },
            { x: 700, y: 220, w: 150, h: 20 }
        ],
        spikes: [{ x: 150, y: 520, w: 400, h: 20 }],
        dragon: { x: 720, y: 120, fireRate: 60 },
        castle: { x: 820, y: 80, w: 100, h: 120 }
    }
];

let platforms = [];
let spikes = [];
let dragon = {};
let castle = {};

/* ================= LOAD ================= */
function loadLevel(i) {
    const l = levels[i];

    platforms = l.platforms.map(p => ({ ...p, dir: 1 }));
    spikes = l.spikes;
    dragon = l.dragon;
    castle = l.castle;

    player.x = 50;
    player.y = 400;
    player.vy = 0;

    fireballs = [];
    fireTimer = 0;
    win = false;
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => keys[e.code] = true);
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

/* ================= FIRE ================= */
function shootFire() {
    fireballs.push({
        x: dragon.x,
        y: dragon.y + 30,
        w: 25,
        h: 25,
        vx: -6 - level
    });
}

/* ================= UPDATE ================= */
function update() {

    if (gameOver || win) return;

    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -player.speed;
    if (keys.ArrowRight) player.vx = player.speed;

    if (keys.Space && player.onGround) {
        player.vy = -player.jump;
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

    /* FIRE SYSTEM */
    fireTimer++;
    if (fireTimer > dragon.fireRate) {
        shootFire();
        fireTimer = 0;
    }

    fireballs.forEach(f => {
        f.x += f.vx;
        if (hit(player, f)) {
            if (!gameOver) deathSound.play();
            gameOver = true;
        }
    });

    /* DEATH */
    if (player.y > canvas.height) {
        if (!gameOver) deathSound.play();
        gameOver = true;
    }

    spikes.forEach(s => {
        if (hit(player, s)) {
            if (!gameOver) deathSound.play();
            gameOver = true;
        }
    });

    /* WIN */
    if (hit(player, castle)) {
        win = true;

        setTimeout(() => {
            level++;
            if (level >= levels.length) {
                alert("🏆 Completed!");
                level = 0;
            }
            loadLevel(level);
        }, 1500);
    }
}

/* ================= DRAW ================= */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* BG */
    if (bg.complete)
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);

    /* Platforms */
    platforms.forEach(p => ctx.drawImage(block, p.x, p.y, p.w, p.h));

    /* Spikes */
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

    /* 🔥 DRAGON (REAL IMAGE + GLOW) */
    ctx.shadowColor = "orange";
    ctx.shadowBlur = 25;
    ctx.drawImage(dragonImg, dragon.x, dragon.y, 80, 80);
    ctx.shadowBlur = 0;

    /* 🔥 FIRE */
    ctx.fillStyle = "orange";
    fireballs.forEach(f => {
        ctx.shadowColor = "red";
        ctx.shadowBlur = 20;
        ctx.fillRect(f.x, f.y, f.w, f.h);
        ctx.shadowBlur = 0;
    });

    /* ✨ CASTLE LIGHT (REAL AURA EFFECT) */
    let gradient = ctx.createRadialGradient(
        castle.x + 50,
        castle.y + 60,
        10,
        castle.x + 50,
        castle.y + 60,
        120
    );

    gradient.addColorStop(0, "rgba(255,255,150,0.9)");
    gradient.addColorStop(1, "rgba(255,255,150,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(castle.x - 50, castle.y - 50, 200, 200);

    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);

    /* PLAYER */
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 20;
    ctx.drawImage(wizard, player.x, player.y, 60, 60);
    ctx.shadowBlur = 0;

    /* UI */
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Level " + (level + 1), 20, 30);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED", 350, 260);
    }

    if (win) {
        ctx.shadowColor = "yellow";
        ctx.shadowBlur = 40;
        ctx.fillStyle = "yellow";
        ctx.font = "40px Arial";
        ctx.fillText("LEVEL COMPLETED", 250, 260);
        ctx.shadowBlur = 0;
    }
}

/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loadLevel(0);
loop();
