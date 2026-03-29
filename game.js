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
const bgm = new Audio("assets/music.mp3");
bgm.loop = true;
const deathSound = new Audio("assets/death.mp3");

let started = false;
window.addEventListener("click", () => {
    if (!started) {
        bgm.play().catch(()=>{});
        started = true;
    }
});

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
let gameOver = false;

/* ================= BACKGROUND SCROLL ================= */
let bgX = 0;

/* ================= FIRE ================= */
let fireParticles = [];

function createFlame(x, y) {
    fireParticles.push({
        x,
        y,
        vx: -4 - Math.random() * 2,
        vy: (Math.random() - 0.5) * 1.5,
        life: 30,
        size: 8 + Math.random() * 6
    });
}

/* ================= DRAGON ORBIT ================= */
let angle = 0;
const castle = { x: 820, y: 250, w: 100, h: 120 };
let dragon = { x: 700, y: 200 };

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

    if (gameOver) return;

    /* Background move */
    bgX -= 0.3;
    if (bgX <= -canvas.width) bgX = 0;

    /* Player movement */
    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -player.speed;
    if (keys.ArrowRight) player.vx = player.speed;

    if (keys.Space && player.onGround) {
        player.vy = -player.jump;
    }

    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;

    /* Ground */
    if (player.y > 450) {
        player.y = 450;
        player.vy = 0;
        player.onGround = true;
    }

    /* 🔥 Dragon orbit around castle */
    angle += 0.02;
    dragon.x = castle.x + Math.cos(angle) * 120;
    dragon.y = castle.y + Math.sin(angle) * 80;

    /* 🔥 Fire emission */
    for (let i = 0; i < 3; i++) {
        createFlame(dragon.x + 40, dragon.y + 30);
    }

    /* 🔥 Fire update */
    fireParticles.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.life--;
        f.size *= 0.97;

        // collision FIXED
        if (
            player.x < f.x &&
            player.x + player.w > f.x &&
            player.y < f.y &&
            player.y + player.h > f.y
        ) {
            if (!gameOver) deathSound.play();
            gameOver = true;
        }
    });

    fireParticles = fireParticles.filter(f => f.life > 0);
}

/* ================= DRAW ================= */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* 🌌 Moving background */
    if (bg.complete) {
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
    }

    /* ✨ Castle Aura (REAL LIGHT) */
    let g = ctx.createRadialGradient(
        castle.x + 50, castle.y + 60, 20,
        castle.x + 50, castle.y + 60, 140
    );
    g.addColorStop(0, "rgba(255,255,180,0.9)");
    g.addColorStop(1, "rgba(255,255,180,0)");

    ctx.fillStyle = g;
    ctx.fillRect(castle.x - 80, castle.y - 80, 260, 260);

    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);

    /* 🐉 Dragon */
    ctx.save();
    ctx.translate(dragon.x + 40, dragon.y + 40);
    ctx.rotate(angle);
    ctx.drawImage(dragonImg, -40, -40, 80, 80);
    ctx.restore();

    /* 🔥 Flame rendering (REAL FIRE LOOK) */
    fireParticles.forEach(f => {
        let grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);

        grad.addColorStop(0, "rgba(255,255,200,1)");
        grad.addColorStop(0.4, "rgba(255,150,0,0.8)");
        grad.addColorStop(1, "rgba(255,0,0,0)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });

    /* Player */
    ctx.drawImage(wizard, player.x, player.y, 60, 60);

    /* UI */
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Level 1", 20, 30);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED", 350, 240);

        ctx.font = "20px Arial";
        ctx.fillText("Press CTRL + R to Restart", 320, 280);
    }
}

/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();








