"use strict";

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= IMAGES ================= */
const bg = new Image(); bg.src = "assets/bg.png";
const wizard = new Image(); wizard.src = "assets/wizard.png";
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
    onGround: false,
    hp: 100
};

/* ================= DRAGON ================= */
let dragon = {
    x: 700,
    y: 200,
    hp: 100
};

let level = 1;
let gameOver = false;
let win = false;

/* ================= BACKGROUND ================= */
let bgX = 0;

/* ================= FIRE ================= */
let fireParticles = [];

function createFlame(x, y) {
    fireParticles.push({
        x,
        y,
        vx: -3 - level,
        vy: (Math.random() - 0.5) * 2,
        life: 30,
        size: 8
    });
}

/* ================= MAGIC ================= */
let bullets = [];

function shootMagic() {
    bullets.push({
        x: player.x + 40,
        y: player.y + 20,
        vx: 7,
        size: 6
    });
}

/* ================= INPUT ================= */
const keys = {};
window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if (e.code === "KeyF") shootMagic();
});
window.addEventListener("keyup", e => keys[e.code] = false);

/* ================= COLLISION ================= */
function hit(a, b) {
    return (
        a.x < b.x + 50 &&
        a.x + 50 > b.x &&
        a.y < b.y + 50 &&
        a.y + 50 > b.y
    );
}

/* ================= UPDATE ================= */
let angle = 0;

function update() {

    if (gameOver) return;

    /* BG */
    bgX -= 0.4;
    if (bgX <= -canvas.width) bgX = 0;

    /* PLAYER */
    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -player.speed;
    if (keys.ArrowRight) player.vx = player.speed;

    if (keys.Space && player.onGround) {
        player.vy = -player.jump;
    }

    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;

    if (player.y > 450) {
        player.y = 450;
        player.vy = 0;
        player.onGround = true;
    }

    /* DRAGON ORBIT */
    angle += 0.02 + level * 0.01;
    dragon.x = 820 + Math.cos(angle) * 120;
    dragon.y = 250 + Math.sin(angle) * 80;

    /* FIRE */
    for (let i = 0; i < 3 + level; i++) {
        createFlame(dragon.x + 40, dragon.y + 30);
    }

    fireParticles.forEach(f => {
        f.x += f.vx;
        f.y += f.vy;
        f.life--;

        // DAMAGE instead of instant death
        if (
            player.x < f.x &&
            player.x + player.w > f.x &&
            player.y < f.y &&
            player.y + player.h > f.y
        ) {
            player.hp -= 0.3;
        }
    });

    fireParticles = fireParticles.filter(f => f.life > 0);

    /* BULLETS */
    bullets.forEach(b => {
        b.x += b.vx;

        if (
            b.x < dragon.x + 80 &&
            b.x > dragon.x &&
            b.y > dragon.y &&
            b.y < dragon.y + 80
        ) {
            dragon.hp -= 1;
        }
    });

    bullets = bullets.filter(b => b.x < canvas.width);

    /* PLAYER DEATH */
    if (player.hp <= 0) {
        deathSound.play();
        gameOver = true;
    }

    /* DRAGON DEFEATED */
    if (dragon.hp <= 0) {
        level++;
        if (level > 3) {
            alert("🏆 You defeated the dungeon!");
            location.reload();
        } else {
            nextLevel();
        }
    }
}

/* ================= LEVEL ================= */
function nextLevel() {
    player.hp = 100;
    dragon.hp = 100 + level * 50;
    fireParticles = [];
    bullets = [];
}

/* ================= DRAW ================= */
function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* BG */
    if (bg.complete) {
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
    }

    /* CASTLE GLOW */
    let g = ctx.createRadialGradient(870, 310, 20, 870, 310, 140);
    g.addColorStop(0, "rgba(255,255,180,0.9)");
    g.addColorStop(1, "rgba(255,255,180,0)");
    ctx.fillStyle = g;
    ctx.fillRect(700, 150, 300, 300);

    ctx.drawImage(castleImg, 820, 250, 100, 120);

    /* DRAGON */
    ctx.drawImage(dragonImg, dragon.x, dragon.y, 80, 80);

    /* FIRE */
    fireParticles.forEach(f => {
        let grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.size);
        grad.addColorStop(0, "yellow");
        grad.addColorStop(1, "red");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
    });

    /* MAGIC */
    ctx.fillStyle = "cyan";
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
        ctx.fill();
    });

    /* PLAYER */
    ctx.drawImage(wizard, player.x, player.y, 60, 60);

    /* UI */
    ctx.fillStyle = "white";
    ctx.fillText("Level: " + level, 20, 30);

    /* HEALTH BAR */
    ctx.fillStyle = "red";
    ctx.fillRect(20, 40, 200, 10);
    ctx.fillStyle = "green";
    ctx.fillRect(20, 40, player.hp * 2, 10);

    if (gameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Arial";
        ctx.fillText("YOU DIED", 350, 240);
        ctx.font = "20px Arial";
        ctx.fillText("CTRL + R to Restart", 350, 280);
    }
}

/* ================= LOOP ================= */
function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

loop();
