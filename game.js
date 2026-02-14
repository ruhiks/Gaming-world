"use strict";
document.addEventListener("DOMContentLoaded", () => {
    /* ================= CANVAS ================= */
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    /* ================= CONSTANTS ================= */
    const GRAVITY = 0.9;
    const SPEED = 5;
    const JUMP = 16;
    const FAST_FALL = 1.8;
    const FALL_DEATH_Y = canvas.height + 60;
    const CLOUD_SPEED = 0.4;
    /* ================= STATE ================= */
    let levelIndex = 0;
    let gameOver = false;
    let levelWin = false;
    let finalWin = false;
    let winTimer = 0;
    let bgX = 0;
    let textScale = 0;
    /* ================= ASSETS ================= */
    const load = s => { const i = new Image(); i.src = s; return i; };
    const bg = load("assets/bg.png");
    const wizard = load("assets/wizard.png");
    const blockImg = load("assets/block.png");
    const spikeImg = load("assets/spike.png");
    const castleImg = load("assets/castle.png");
    const dragonImg = load("assets/dragon.png");
    /* ================= AUDIO ================= */
    const bgm = new Audio("assets/music.mp3");
    bgm.loop = true;
    const deathSound = new Audio("assets/death.mp3");
    window.addEventListener("keydown", () => bgm.play().catch(() => { }), { once: true });
    /* ================= PLAYER ================= */
    const player = {
        x: 0, y: 0, w: 60, h: 60,
        vx: 0, vy: 0,
        onGround: false,
        facing: true
    };
    /* ================= PARTICLES ================= */
    let particles = [];
    function spark(x, y) {
        for (let i = 0; i < 20; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 40
            });
        }
    }
    /* ================= LEVEL DATA ================= */
    const levels = [
        {
            start: { x: 40, y: 420 },
            blocks: [
                { x: 0, y: 500, w: 960, h: 40 },
                { x: 300, y: 430, w: 160, h: 30 },
                { x: 600, y: 360, w: 160, h: 30 }
            ],
            spikes: [{ x: 420, y: 470, w: 40, h: 30 }],
            castle: { x: 820, y: 170, w: 130, h: 160 },
            dragon: { x: 720, y: 240 }
        },
        {
            start: { x: 40, y: 420 },
            blocks: [
                { x: 0, y: 500, w: 200, h: 40 },
                { x: 260, y: 430, w: 120, h: 30 },
                { x: 450, y: 350, w: 120, h: 30 },
                { x: 650, y: 280, w: 120, h: 30 }
            ],
            spikes: [
                { x: 200, y: 500, w: 100, h: 30 },
                { x: 500, y: 500, w: 100, h: 30 }
            ],
            castle: { x: 820, y: 100, w: 130, h: 160 },
            dragon: { x: 730, y: 180 }
        },
        {
            start: { x: 20, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 150, h: 30 },
                { x: 200, y: 450, w: 100, h: 25 },
                { x: 360, y: 350, w: 100, h: 25 },
                { x: 520, y: 250, w: 100, h: 25 },
                { x: 700, y: 180, w: 200, h: 30 }
            ],
            spikes: [
                { x: 150, y: 520, w: 450, h: 30 }
            ],
            castle: { x: 820, y: 40, w: 130, h: 160 },
            dragon: { x: 730, y: 100 }
        }
    ];
    let blocks = [], spikes = [], castle = {}, dragon = {};
    function loadLevel(i) {
        if (i >= levels.length) { finalWin = true; return; }
        const l = levels[i];
        blocks = l.blocks;
        spikes = l.spikes;
        castle = l.castle;
        dragon = l.dragon;
        player.x = l.start.x;
        player.y = l.start.y;
        player.vx = 0;
        player.vy = 0;
        gameOver = false;
        levelWin = false;
        winTimer = 0;
        textScale = 0;
    }
    /* ================= INPUT ================= */
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (gameOver && e.code === "KeyR") loadLevel(levelIndex);
    });
    window.addEventListener("keyup", e => keys[e.code] = false);
    /* ================= COLLISION ================= */
    const hit = (a, b) => (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
    /* ================= UPDATE ================= */
    function update() {
        bgX -= CLOUD_SPEED;
        if (bgX <= -canvas.width) bgX = 0;
        if (gameOver || finalWin) return;
        /* WIN animation */
        if (levelWin) {
            winTimer++;
            spark(player.x + 30, player.y);
            if (textScale < 1.3) textScale += 0.05;
            if (winTimer > 100) {
                levelIndex++;
                loadLevel(levelIndex);
            }
            return;
        }
        /* movement */
        player.vx = 0;
        if (keys.ArrowLeft) { player.vx = -SPEED; player.facing = false; }
        if (keys.ArrowRight) { player.vx = SPEED; player.facing = true; }
        if (keys.Space && player.onGround) player.vy = -JUMP;
        if (keys.ArrowDown) player.vy += FAST_FALL;
        player.vy += GRAVITY;
        player.x += player.vx;
        player.y += player.vy;
        player.onGround = false;
        blocks.forEach(b => {
            if (hit(player, b) && player.vy >= 0 && player.y + player.h - player.vy <= b.y) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
            }
        });
        if (player.y > FALL_DEATH_Y) {
            gameOver = true;
            deathSound.play();
        }
        spikes.forEach(s => {
            if (hit(player, s)) {
                gameOver = true;
                deathSound.play();
            }
        });
        if (hit(player, castle)) {
            levelWin = true;
        }
    }
    /* ================= DRAW ================= */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
        blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
        spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 25;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.shadowBlur = 0;
        ctx.drawImage(dragonImg, dragon.x, dragon.y, 120, 100);
        ctx.drawImage(wizard, player.x, player.y, 80, 80);
        /* particles */
        particles.forEach(p => {
            ctx.fillStyle = "cyan";
            ctx.fillRect(p.x, p.y, 3, 3);
            p.x += p.vx; p.y += p.vy; p.life--;
        });
        particles = particles.filter(p => p.life > 0);
        ctx.fillStyle = "white";
        ctx.font = "18px Arial";
        ctx.fillText("Level " + (levelIndex + 1), 20, 30);
        if (gameOver) {
            ctx.fillText("YOU DIED - Press R", 350, 260);
        }
        if (levelWin) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            ctx.font = "40px Arial";
            ctx.fillText("LEVEL COMPLETED!", -180, 0);
            ctx.restore();
        }
        if (finalWin) {
            ctx.font = "48px Arial";
            ctx.fillText("DUNGEON CLEARED!", 200, 260);
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
});



































































































































































































































































































































































