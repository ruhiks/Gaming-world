"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= LOAD IMAGES ================= */
const bg = new Image();
bg.src = "assets/bg.png";

const wizard = new Image();
wizard.src = "assets/wizard.png";

const blockImg = new Image();
blockImg.src = "assets/block.png";

const spikeImg = new Image();
spikeImg.src = "assets/spike.png";

const castleImg = new Image();
castleImg.src = "assets/castle.png";

/* ================= PLAYER ================= */
const player = {
    x: 50,
    y: 400,
    w: 40,
    h: 40,
    vx: 0,
    vy: 0,
    speed: 5,
    jump: 14,
    onGround: false
};

/* ================= GAME STATE ================= */
let levelIndex = 0;
let gameOver = false;
let levelWin = false;

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (gameOver && e.code === "KeyR") {
        loadLevel(levelIndex);
        gameOver = false;
    }
});
window.addEventListener("keyup", e => keys[e.code] = false);

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
        spikes: [{ x: 200, y: 500, w: 100, h: 20 }],
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
        spikes: [{ x: 150, y: 520, w: 400, h: 20 }],
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
    player.vx = 0;
    player.vy = 0;

    levelWin = false;
}

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

    if (gameOver || levelWin) return;

    player.vx = 0;

    if (keys["ArrowLeft"]) player.vx = -player.speed;
    if (keys["ArrowRight"]) player.vx = player.speed;

    if (keys["Space"] && player.onGround) {
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

    if (player.y > canvas.height) gameOver = true;

    spikes.forEach(s => {
        if (hit(player, s)) gameOver = true;
    });

    if (hit(player, castle)) {
        levelWin = true;

        setTimeout(() => {
            levelIndex++;
            if (levelIndex >= levels.length) {
                alert("🎉 Dungeon Completed!");
                levelIndex = 0;
            }
            loadLevel(levelIndex);
        }, 1200);
    }
}

/* ================= DRAW ================= */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Background */
    if (bg.complete) {
        ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = "#0b0b1a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /* Platforms */
    platforms.forEach(p => {
        if (blockImg.complete) {
            ctx.drawImage(blockImg, p.x, p.y, p.w, p.h);
        } else {
            ctx.fillStyle = "#6c63ff";
            ctx.fillRect(p.x, p.y, p.w, p.h);
        }
    });

    /* Spikes */
    spikes.forEach(s => {
        if (spikeImg.complete) {
            ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
        } else {
            ctx.fillStyle = "red";
            ctx.fillRect(s.x, s.y, s.w, s.h);
        }
    });

    /* Castle */
    if (castleImg.complete) {
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    } else {
        ctx.fillStyle = "gold";
        ctx.fillRect(castle.x, castle.y, castle.w, castle.h);
    }

    /* Dragon (visual only) */
    ctx.fillStyle = "purple";
    ctx.fillRect(castle.x - 60, castle.y, 40, 40);

    /* Player */
    if (wizard.complete) {
        ctx.drawImage(wizard, player.x, player.y, 60, 60);
    } else {
        ctx.fillStyle = "cyan";
        ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    /* UI */
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Level " + (levelIndex + 1), 20, 30);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED (Press R)", 280, 260);
    }

    if (levelWin) {
        ctx.fillStyle = "yellow";
        ctx.font = "40px Arial";
        ctx.fillText("LEVEL COMPLETED!", 240, 260);
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

























































































































































































































































































































































































































































































































