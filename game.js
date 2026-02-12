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
    const CLOUD_SPEED = 0.2;
    /* ================= GAME STATE ================= */
    let levelIndex = 0;
    let gameOver = false;
    let levelWin = false;
    let finalWin = false;
    let winTimer = 0;
    let bgX = 0;
    let textScale = 0;
    let frameCount = 0;
    /* ================= ASSETS ================= */
    const load = s => { const i = new Image(); i.src = s; return i; };
    const bg = load("assets/bg.png");
    const wizard = load("assets/wizard.png");
    const blockImg = load("assets/block.png");
    const spikeImg = load("assets/spike.png");
    const castleImg = load("assets/castle.png");
    // Dragon is procedurally drawn
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
    function spawnParticles(x, y, color, count = 10, speed = 2, life = 40, size = 3) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * speed,
                vy: (Math.random() - 0.5) * speed,
                life: life + Math.random() * 20,
                color: color,
                size: Math.random() * size + 1
            });
        }
    }
    function spark(x, y) { spawnParticles(x, y, "gold", 5, 4); }
    function fireSpark(x, y) { spawnParticles(x, y, "orange", 3, 3, 20); }
    function magicSpark(x, y) { spawnParticles(x, y, "violet", 2, 1, 60); }
    function dragonBreath(x, y) { spawnParticles(x, y, "#ff4500", 5, 2, 30, 4); }
    /* ================= OBJECTS ================= */
    let blocks = [], spikes = [], castle = {}, fireballs = [];
    /* Dragon Object */
    const dragonObj = {
        x: 0, y: 0, w: 120, h: 100,
        dir: -1,
        attackTimer: 0,
        active: false,
        yOffset: 0
    };
    class Fireball {
        constructor(x, y, dir) {
            this.x = x;
            this.y = y;
            this.w = 25;
            this.h = 25;
            this.vx = dir * 6;
            this.life = 120;
        }
        update() {
            this.x += this.vx;
            this.life--;
            if (frameCount % 4 === 0) spawnParticles(this.x + this.w / 2, this.y + this.h / 2, "orange", 2, 2);
        }
        draw() {
            ctx.fillStyle = "#ff4500";
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "yellow";
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 12, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    /* ================= LEVEL DATA ================= */
    const levels = [
        {
            start: { x: 40, y: 420 },
            blocks: [
                { x: 0, y: 500, w: 960, h: 40, type: 'static' },
                { x: 300, y: 430, w: 160, h: 30, type: 'static' },
                { x: 600, y: 360, w: 160, h: 30, type: 'moving', vx: 2, minX: 550, maxX: 750 }
            ],
            spikes: [{ x: 420, y: 470, w: 40, h: 30 }],
            castle: { x: 820, y: 170, w: 130, h: 160 },
            dragon: { x: 650, y: 220, active: true }
        },
        {
            start: { x: 40, y: 420 },
            blocks: [
                { x: 0, y: 500, w: 200, h: 40, type: 'static' },
                { x: 260, y: 430, w: 120, h: 30, type: 'moving', vy: 2, minY: 300, maxY: 430 },
                { x: 450, y: 350, w: 120, h: 30, type: 'static' },
                { x: 650, y: 280, w: 120, h: 30, type: 'static' }
            ],
            spikes: [
                { x: 200, y: 500, w: 100, h: 30 },
                { x: 500, y: 500, w: 100, h: 30 }
            ],
            castle: { x: 820, y: 100, w: 130, h: 160 },
            dragon: { x: 700, y: 160, active: true }
        },
        {
            start: { x: 20, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 150, h: 30, type: 'static' },
                { x: 200, y: 450, w: 100, h: 25, type: 'moving', vx: 3, minX: 200, maxX: 400 },
                { x: 450, y: 350, w: 100, h: 25, type: 'static' },
                { x: 520, y: 250, w: 100, h: 25, type: 'moving', vy: -2, minY: 150, maxY: 350 },
                { x: 700, y: 180, w: 200, h: 30, type: 'static' }
            ],
            spikes: [
                { x: 150, y: 520, w: 450, h: 30 }
            ],
            castle: { x: 820, y: 40, w: 130, h: 160 },
            dragon: { x: 600, y: 80, active: true }
        }
    ];
    function loadLevel(i) {
        if (i >= levels.length) { finalWin = true; return; }
        const l = levels[i];
        blocks = l.blocks.map(b => ({ ...b, ox: b.x, oy: b.y, dir: 1 }));
        spikes = l.spikes;
        castle = l.castle;
        if (l.dragon) {
            dragonObj.x = l.dragon.x;
            dragonObj.y = l.dragon.y;
            dragonObj.active = l.dragon.active;
            dragonObj.attackTimer = 0;
        } else {
            dragonObj.active = false;
        }
        fireballs = [];
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
    /* ================= DRAGON DRAWING ================= */
    function drawDragon(ctx, x, y, w, h) {
        const time = frameCount * 0.05;
        const hoverY = Math.sin(time) * 10;
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2 + hoverY);
        // Dragon Body Color: Deep Violet
        ctx.fillStyle = "#4B0082"; // Indigo/Violet
        ctx.strokeStyle = "#800080"; // Bright Purple Outline
        ctx.lineWidth = 3;
        ctx.scale(dragonObj.dir, 1);
        // Body (Menacing S-shape)
        ctx.beginPath();
        ctx.moveTo(30, -20);
        ctx.quadraticCurveTo(10, -40, -10, -20); // Neck
        ctx.quadraticCurveTo(-30, 0, -10, 30); // Body
        ctx.quadraticCurveTo(10, 50, 40, 40); // Tail base
        ctx.lineTo(60, 50); // Tail tip
        ctx.lineTo(40, 30);
        ctx.quadraticCurveTo(20, 30, 10, 10);
        ctx.lineTo(30, -20);
        ctx.fill();
        ctx.stroke();
        // Wings (Bat-like)
        ctx.fillStyle = "#2E0854"; // Darker Purple
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(40, -50);
        ctx.quadraticCurveTo(20, -30, 10, -10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-20, -40);
        ctx.quadraticCurveTo(-10, -20, 0, -10);
        ctx.fill();
        // Head
        ctx.fillStyle = "#4B0082";
        ctx.beginPath();
        ctx.moveTo(-10, -20); // Neck base
        ctx.lineTo(-30, -35); // Snout top
        ctx.lineTo(-35, -25); // Nose
        ctx.lineTo(-25, -20); // Jaw
        ctx.lineTo(-10, -10); // Neck front
        ctx.fill();
        ctx.stroke();
        // Eye (Menacing Glowing Red/Yellow)
        ctx.fillStyle = "#FFD700"; // Gold
        ctx.beginPath();
        ctx.moveTo(-20, -30);
        ctx.lineTo(-25, -28);
        ctx.lineTo(-20, -25);
        ctx.fill();
        // Horns
        ctx.strokeStyle = "#D8BFD8"; // Thistle (Bone color)
        ctx.beginPath();
        ctx.moveTo(-15, -30);
        ctx.lineTo(-10, -45);
        ctx.stroke();
        // Smoke/Fire from nostrils
        if (frameCount % 60 < 20) {
            ctx.fillStyle = "rgba(100, 100, 100, 0.5)";
            ctx.beginPath();
            ctx.arc(-35, -25, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
    /* ================= UPDATE ================= */
    function update() {
        frameCount++;
        bgX -= CLOUD_SPEED;
        if (bgX <= -canvas.width) bgX = 0;
        // Magical background particles (stars)
        if (frameCount % 15 === 0) {
            spawnParticles(Math.random() * canvas.width, Math.random() * canvas.height, "white", 1, 0.5, 100, 2);
        }
        if (gameOver || finalWin) return;
        /* Level Win Logic */
        if (levelWin) {
            winTimer++;
            magicSpark(player.x + 30, player.y + 30);
            spawnParticles(castle.x + 65, castle.y + 80, "cyan", 1, 3);
            if (dragonObj.active) {
                dragonObj.yOffset = Math.sin(frameCount * 0.5) * 5;
                if (frameCount % 5 === 0) {
                    dragonBreath(dragonObj.x, dragonObj.y + 40);
                }
            }
            if (textScale < 1.3) textScale += 0.05;
            if (winTimer > 180) {
                levelIndex++;
                loadLevel(levelIndex);
            }
            return;
        }
        /* Moving Platforms Logic */
        blocks.forEach(b => {
            if (b.type === 'moving') {
                if (b.vx) {
                    b.x += b.vx * b.dir;
                    if (b.x > b.maxX || b.x < b.minX) b.dir *= -1;
                }
                if (b.vy) {
                    b.y += b.vy * b.dir;
                    if (b.y > b.maxY || b.y < b.minY) b.dir *= -1;
                }
            }
        });
        /* Player Movement */
        const prevY = player.y;
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
            if (hit(player, b) && player.vy >= 0 && prevY + player.h - player.vy <= b.y + (b.vy || 0)) {
                player.y = b.y - player.h;
                player.vy = 0;
                player.onGround = true;
                if (b.type === 'moving') {
                    if (b.vx) player.x += b.vx * b.dir;
                }
            }
        });
        /* Dragon Logic */
        if (dragonObj.active) {
            dragonObj.attackTimer++;
            if (dragonObj.attackTimer > 120) {
                const dir = (player.x < dragonObj.x) ? -1 : 1;
                dragonObj.dir = dir;
                fireballs.push(new Fireball(dragonObj.x + (dir === 1 ? dragonObj.w : 0), dragonObj.y + 40, dir));
                dragonObj.attackTimer = 0;
            }
            if (hit(player, dragonObj)) {
                gameOver = true;
                deathSound.play().catch(() => { });
            }
        }
        /* Fireballs Update */
        for (let i = fireballs.length - 1; i >= 0; i--) {
            let fb = fireballs[i];
            fb.update();
            if (fb.life <= 0 || fb.x < 0 || fb.x > canvas.width) {
                fireballs.splice(i, 1);
                continue;
            }
            if (hit(player, fb)) {
                gameOver = true;
                deathSound.play().catch(() => { });
            }
        }
        /* Death Checks */
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
        if (hit(player, castle)) {
            levelWin = true;
        }
    }
    /* ================= DRAW ================= */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        /* Background */
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, "#2c003e");
        gradient.addColorStop(1, "#4b0082");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (bg.complete) {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
            ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1.0;
        }
        /* Level Elements */
        blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
        spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
        /* Castle */
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 25;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.shadowBlur = 0;
        /* Dragon */
        if (dragonObj.active) {
            drawDragon(ctx, dragonObj.x, dragonObj.y, dragonObj.w, dragonObj.h);
        }
        /* Fireballs */
        fireballs.forEach(fb => fb.draw());
        /* Player */
        ctx.drawImage(wizard, player.x, player.y, 80, 80);
        /* Particles */
        particles.forEach(p => {
            ctx.fillStyle = p.color || "cyan";
            ctx.globalAlpha = p.life / 40;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
        particles = particles.filter(p => p.life > 0);
        /* UI Text */
        ctx.fillStyle = "white";
        ctx.font = "20px monospace";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText("Level " + (levelIndex + 1), 20, 30);
        ctx.shadowBlur = 0;
        if (gameOver) {
            ctx.fillStyle = "red";
            ctx.font = "48px serif";
            ctx.fillText("YOU DIED - Press R", 300, 260);
        }
        if (levelWin) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 50px serif";
            ctx.shadowColor = "orange";
            ctx.shadowBlur = 20;
            ctx.fillText("LEVEL COMPLETED!", -220, 0);
            ctx.restore();
        }
        if (finalWin) {
            ctx.font = "60px serif";
            ctx.fillStyle = "#00ff00";
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

































































































































































































































































































































































