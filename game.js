"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

/* ================= PARTICLES ================= */
let particles = [];

function spark(x, y, color = "gold", amount = 5) {
    for (let i = 0; i < amount; i++) {
        particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 40,
            color
        });
    }
}

/* ================= DRAGON FIRE ================= */
let fireballs = [];

function shootFire(x, y) {
    fireballs.push({
        x,
        y,
        w: 20,
        h: 20,
        vx: -5 - level, // harder each level
    });
}

/* ================= LEVELS ================= */
const levels = [
    {
        platforms: [
            { x: 0, y: 500, w: 960, h: 40 },
            { x: 300, y: 420, w: 120, h: 20 },
            { x: 600, y: 350, w: 120, h: 20 }
        ],
        spikes: [{ x: 450, y: 480, w: 40, h: 20 }],
        dragon: { x: 760, y: 260, fireRate: 120 },
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
        dragon: { x: 760, y: 200, fireRate: 90 },
        castle: { x: 820, y: 180, w: 100, h: 120 }
    },
    {
        platforms: [
            { x: 0, y: 520, w: 120, h: 20 },
            { x: 200, y: 420, w: 100, h: 20, move: true, min: 200, max: 450 },
            { x: 500, y: 320, w: 100, h: 20 },
            { x: 700, y: 220, w: 150, h: 20 }
        ],
        spikes: [
            { x: 150, y: 520, w: 400, h: 20 },
        ],
        dragon: { x: 760, y: 100, fireRate: 60 },
        castle: { x: 820, y: 80, w: 100, h: 120 }
    }
];

let platforms = [];
let spikes = [];
let dragon = {};
let castle = {};
let fireTimer = 0;

/* ================= LOAD LEVEL ================= */
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

/* ================= UPDATE ================= */
function update() {

    if (gameOver || win) return;

    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -player.speed;
    if (keys.ArrowRight) player.vx = player.speed;

    if (keys.Space && player.onGround) {
        player.vy = -player.jump;
        spark(player.x, player.y, "cyan", 10);
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

    /* Fire system */
    fireTimer++;
    if (fireTimer > dragon.fireRate) {
        shootFire(dragon.x, dragon.y + 20);
        fireTimer = 0;
    }

    fireballs.forEach(f => {
        f.x += f.vx;
        if (hit(player, f)) gameOver = true;
    });

    /* Death */
    if (player.y > canvas.height) gameOver = true;
    spikes.forEach(s => { if (hit(player, s)) gameOver = true; });

    /* WIN */
    if (hit(player, castle)) {
        win = true;

        // wizard glow burst
        for (let i = 0; i < 50; i++) {
            spark(player.x + 25, player.y + 25, "yellow", 1);
        }

        setTimeout(() => {
            level++;
            if (level >= levels.length) {
                alert("🏆 You completed all levels!");
                level = 0;
            }
            loadLevel(level);
        }, 1500);
    }

    /* particles */
    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });

    particles = particles.filter(p => p.life > 0);

    /* castle aura */
    spark(castle.x + 50, castle.y + 20, "gold", 2);
}

/* ================= DRAW ================= */
function draw() {

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    /* platforms */
    ctx.fillStyle = "#444";
    platforms.forEach(p => ctx.fillRect(p.x, p.y, p.w, p.h));

    /* spikes */
    ctx.fillStyle = "red";
    spikes.forEach(s => ctx.fillRect(s.x, s.y, s.w, s.h));

    /* dragon */
    ctx.fillStyle = "purple";
    ctx.fillRect(dragon.x, dragon.y, 40, 40);

    /* fireballs */
    ctx.fillStyle = "orange";
    fireballs.forEach(f => ctx.fillRect(f.x, f.y, f.w, f.h));

    /* castle glow */
    ctx.shadowColor = "gold";
    ctx.shadowBlur = 40;
    ctx.fillStyle = "#888";
    ctx.fillRect(castle.x, castle.y, castle.w, castle.h);
    ctx.shadowBlur = 0;

    /* player glow */
    ctx.shadowColor = "cyan";
    ctx.shadowBlur = 20;
    ctx.fillStyle = "white";
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.shadowBlur = 0;

    /* particles */
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    /* UI */
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Level " + (level + 1), 20, 30);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED - Refresh", 250, 260);
    }

    if (win) {
        ctx.shadowColor = "yellow";
        ctx.shadowBlur = 30;
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




































































































































































































































































































































