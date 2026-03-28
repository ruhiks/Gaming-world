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
bgm.volume = 0.5;

const deathSound = new Audio("assets/death.mp3");

let musicStarted = false;
function startMusic() {
    if (!musicStarted) {
        bgm.play().catch(()=>{});
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

/* ================= FIRE PARTICLES ================= */
let fireParticles = [];

function createFire(x, y) {
    for (let i = 0; i < 5; i++) {
        fireParticles.push({
            x,
            y,
            vx: -3 - Math.random() * 2,
            vy: (Math.random() - 0.5) * 2,
            life: 30
        });
    }
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
        dragon: { x: 720, y: 250 },
        castle: { x: 820, y: 250, w: 100, h: 120 }
    }
];

let platforms = [];
let spikes = [];
let dragon = {};
let castle = {};

/* ================= LOAD ================= */
function loadLevel(i) {
    const l = levels[i];

    platforms = l.platforms;
    spikes = l.spikes;
    dragon = l.dragon;
    castle = l.castle;

    player.x = 50;
    player.y = 400;
    player.vy = 0;

    fireParticles = [];
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
    }

    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;

    platforms.forEach(p => {
        if (hit(player, p) && player.vy >= 0) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.onGround = true;
        }
    });

    /* 🔥 DRAGON FIRE EMISSION */
    createFire(dragon.x, dragon.y + 30);

    fireParticles.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.life--;

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

    /* 🐉 DRAGON */
    ctx.shadowColor = "orange";
    ctx.shadowBlur = 30;
    ctx.drawImage(dragonImg, dragon.x, dragon.y, 80, 80);
    ctx.shadowBlur = 0;

    /* 🔥 FIRE PARTICLES */
    fireParticles.forEach(f => {
        ctx.fillStyle = `rgba(255, ${100 + Math.random()*155}, 0, ${f.life/30})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    /* ✨ CASTLE LIGHT */
    let gradient = ctx.createRadialGradient(
        castle.x + 50, castle.y + 60, 10,
        castle.x + 50, castle.y + 60, 120
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
        ctx.fillText("YOU DIED", 350, 240);

        ctx.font = "20px Arial";
        ctx.fillText("Press CTRL + R to Restart", 330, 280);
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


