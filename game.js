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
    let frameCount = 0;
    /* Screen Shake */
    let shakeTime = 0;
    let shakeX = 0;
    let shakeY = 0;
    /* Player trail */
    let playerTrails = [];
    /* Fireworks */
    let fireworks = [];
    /* Background runes */
    let runes = [];
    for (let i = 0; i < 12; i++) {
        runes.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 14 + Math.random() * 18,
            alpha: 0.05 + Math.random() * 0.12,
            speed: 0.15 + Math.random() * 0.25,
            symbol: ["✦", "✧", "⬡", "◈", "⟡", "⋆", "✺", "❋", "⌖", "⊕", "⌘", "⍟"][i % 12]
        });
    }
    /* ================= ASSETS ================= */
    const load = s => { const i = new Image(); i.src = s; return i; };
    const bg = load("assets/bg.png");
    const wizard = load("assets/wizard.png");
    const blockImg = load("assets/block.png");
    const spikeImg = load("assets/spike.png");
    const castleImg = load("assets/castle.png");
    const dragonImg = load("assets/dragon.png");
    /* Parallax layers (reuse bg at different alphas/speeds) */
    let para1X = 0, para2X = 0;
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
            const angle = Math.random() * Math.PI * 2;
            const mag = Math.random() * speed;
            particles.push({
                x, y,
                vx: Math.cos(angle) * mag,
                vy: Math.sin(angle) * mag,
                life: life + Math.random() * 20,
                maxLife: life + 20,
                color,
                size: Math.random() * size + 1
            });
        }
    }
    function spark(x, y) { spawnParticles(x, y, "gold", 8, 5, 50, 4); }
    function magicSpark(x, y) { spawnParticles(x, y, "violet", 3, 2, 70, 3); }
    function dragonBreath(x, y) {
        /* Cone-burst — all particles shoot LEFT (toward player usually) */
        for (let i = 0; i < 8; i++) {
            const spread = (Math.random() - 0.5) * 1.2;
            const speed = 3 + Math.random() * 4;
            particles.push({
                x, y,
                vx: -speed + spread,
                vy: spread * 0.5,
                life: 50 + Math.random() * 20,
                maxLife: 70,
                color: ["#ff4500", "#ff8c00", "#ffd700"][Math.floor(Math.random() * 3)],
                size: 3 + Math.random() * 4
            });
        }
    }
    function winRing(cx, cy) {
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const speed = 4 + Math.random() * 3;
            particles.push({
                x: cx, y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 80, maxLife: 80,
                color: `hsl(${Math.random() * 60 + 20}, 100%, 60%)`,
                size: 4 + Math.random() * 3
            });
        }
    }
    /* ================= FIREWORKS ================= */
    function spawnFirework(x, y) {
        const hue = Math.floor(Math.random() * 360);
        for (let i = 0; i < 60; i++) {
            const angle = (i / 60) * Math.PI * 2;
            const speed = 3 + Math.random() * 5;
            fireworks.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                life: 80 + Math.random() * 40,
                maxLife: 120,
                color: `hsl(${hue + Math.random() * 40},100%,65%)`,
                size: 3 + Math.random() * 3,
                gravity: 0.08
            });
        }
    }
    /* ================= OBJECTS ================= */
    let blocks = [], spikes = [], castle = {}, fireballs = [];
    const dragonObj = {
        x: 0, y: 0, baseY: 0, w: 120, h: 100,
        dir: -1, attackTimer: 0, active: false
    };
    class Fireball {
        constructor(x, y, dir) {
            this.x = x; this.y = y; this.w = 25; this.h = 25;
            this.vx = dir * 6; this.life = 100;
        }
        update() {
            this.x += this.vx;
            this.life--;
            if (frameCount % 3 === 0)
                spawnParticles(this.x + 12, this.y + 12, "#ff8c00", 3, 2, 20, 3);
        }
        draw() {
            /* Outer glow */
            ctx.save();
            ctx.shadowColor = "#ff4500";
            ctx.shadowBlur = 18;
            ctx.fillStyle = "#ff4500";
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 12, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffd700";
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 12, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "white";
            ctx.beginPath();
            ctx.arc(this.x + 12, this.y + 12, 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
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
            dragon: { x: 720, y: 240, active: true }
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
            dragon: { x: 730, y: 180, active: true }
        },
        {
            start: { x: 20, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 150, h: 30, type: 'static' },
                { x: 200, y: 450, w: 100, h: 25, type: 'moving', vx: 3, minX: 200, maxX: 400 },
                { x: 360, y: 350, w: 100, h: 25, type: 'static' },
                { x: 520, y: 250, w: 100, h: 25, type: 'moving', vy: -2, minY: 150, maxY: 350 },
                { x: 700, y: 180, w: 200, h: 30, type: 'static' }
            ],
            spikes: [{ x: 150, y: 520, w: 450, h: 30 }],
            castle: { x: 820, y: 40, w: 130, h: 160 },
            dragon: { x: 730, y: 100, active: true }
        }
    ];
    function loadLevel(i) {
        if (i >= levels.length) { finalWin = true; levelWin = false; return; }
        const l = levels[i];
        blocks = l.blocks.map(b => ({ ...b, ox: b.x, oy: b.y, dir: 1 }));
        spikes = l.spikes;
        castle = l.castle;
        if (l.dragon) {
            dragonObj.x = l.dragon.x; dragonObj.y = l.dragon.y;
            dragonObj.baseY = l.dragon.y;
            dragonObj.active = l.dragon.active; dragonObj.attackTimer = 0;
        } else { dragonObj.active = false; }
        fireballs = []; particles = []; playerTrails = []; fireworks = [];
        player.x = l.start.x; player.y = l.start.y; player.vx = 0; player.vy = 0;
        gameOver = false; levelWin = false; winTimer = 0; textScale = 0;
    }
    /* ================= INPUT ================= */
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (e.code === "KeyR") {
            if (finalWin) { levelIndex = 0; finalWin = false; loadLevel(0); }
            else if (gameOver) { loadLevel(levelIndex); }
        }
    });
    window.addEventListener("keyup", e => keys[e.code] = false);
    /* ================= COLLISION ================= */
    const hit = (a, b) => (
        a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y
    );
    /* ================= SCREEN SHAKE ================= */
    function triggerShake(duration = 12, magnitude = 8) {
        shakeTime = duration;
        shakeX = (Math.random() - 0.5) * magnitude;
        shakeY = (Math.random() - 0.5) * magnitude;
    }
    /* ================= UPDATE ================= */
    function update() {
        frameCount++;
        /* Parallax scroll */
        bgX -= CLOUD_SPEED;
        para1X -= CLOUD_SPEED * 0.5;
        para2X -= CLOUD_SPEED * 0.25;
        if (bgX <= -canvas.width) bgX = 0;
        if (para1X <= -canvas.width) para1X = 0;
        if (para2X <= -canvas.width) para2X = 0;
        /* Screen shake decay */
        if (shakeTime > 0) {
            shakeTime--;
            shakeX = (Math.random() - 0.5) * 6;
            shakeY = (Math.random() - 0.5) * 6;
        } else { shakeX = 0; shakeY = 0; }
        /* Rune drift */
        runes.forEach(r => {
            r.y -= r.speed;
            if (r.y < -30) { r.y = canvas.height + 20; r.x = Math.random() * canvas.width; }
        });
        if (gameOver || finalWin) {
            /* Fireworks animation even after win */
            if (finalWin && frameCount % 40 === 0) {
                spawnFirework(
                    150 + Math.random() * (canvas.width - 300),
                    50 + Math.random() * (canvas.height - 150)
                );
            }
            updateFireworks();
            updateParticles();
            return;
        }
        /* WIN animation */
        if (levelWin) {
            winTimer++;
            spark(player.x + 30, player.y);
            magicSpark(castle.x + 65, castle.y + 80);
            if (textScale < 1.3) textScale += 0.05;
            if (winTimer === 1) winRing(canvas.width / 2, canvas.height / 2);
            if (dragonObj.active && frameCount % 8 === 0) dragonBreath(dragonObj.x, dragonObj.y + 40);
            updateParticles();
            if (winTimer > 180) { levelIndex++; loadLevel(levelIndex); }
            return;
        }
        /* Moving Platforms */
        blocks.forEach(b => {
            if (b.type === 'moving') {
                if (b.vx) { b.x += b.vx * b.dir; if (b.x > b.maxX || b.x < b.minX) b.dir *= -1; }
                if (b.vy) { b.y += b.vy * b.dir; if (b.y > b.maxY || b.y < b.minY) b.dir *= -1; }
            }
        });
        /* Player trail */
        if (Math.abs(player.vx) > 0.5 || Math.abs(player.vy) > 1) {
            playerTrails.push({ x: player.x, y: player.y, life: 10, maxLife: 10 });
        }
        playerTrails = playerTrails.filter(t => { t.life--; return t.life > 0; });
        /* Movement */
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
            if (hit(player, b) && player.vy >= 0 && player.y + player.h - player.vy <= b.y + (b.vy || 0) + 5) {
                player.y = b.y - player.h; player.vy = 0; player.onGround = true;
                if (b.type === 'moving' && b.vx) player.x += b.vx * b.dir;
            }
        });
        /* Dragon hover */
        if (dragonObj.active) {
            dragonObj.y = dragonObj.baseY + Math.sin(frameCount * 0.04) * 10;
            dragonObj.attackTimer++;
            if (dragonObj.attackTimer > 120) {
                const dir = (player.x < dragonObj.x) ? -1 : 1;
                dragonObj.dir = dir;
                fireballs.push(new Fireball(dragonObj.x + (dir === 1 ? dragonObj.w : 0), dragonObj.y + 40, dir));
                dragonObj.attackTimer = 0;
            }
        }
        /* Fireballs */
        for (let i = fireballs.length - 1; i >= 0; i--) {
            fireballs[i].update();
            if (fireballs[i].life <= 0 || fireballs[i].x < 0 || fireballs[i].x > canvas.width)
                fireballs.splice(i, 1);
        }
        /* Death */
        if (player.y > FALL_DEATH_Y) {
            gameOver = true; triggerShake(); deathSound.play().catch(() => { });
        }
        spikes.forEach(s => {
            if (hit(player, s)) { gameOver = true; triggerShake(); deathSound.play().catch(() => { }); }
        });
        if (hit(player, castle)) levelWin = true;
        updateParticles();
    }
    function updateParticles() {
        particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
        particles = particles.filter(p => p.life > 0);
    }
    function updateFireworks() {
        fireworks.forEach(f => {
            f.x += f.vx; f.y += f.vy; f.vy += f.gravity; f.life--;
        });
        fireworks = fireworks.filter(f => f.life > 0);
    }
    /* ================= DRAW HELPERS ================= */
    /* 3D block: top face + extruded side */
    function draw3DBlock(b) {
        const depth = 10; // Depth of extrusion in pixels
        const bx = b.x, by = b.y, bw = b.w, bh = b.h;
        /* Draw the image on the top face as usual */
        ctx.drawImage(blockImg, bx, by, bw, bh);
        /* Bottom extrusion (darker solid overlay) */
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.beginPath();
        ctx.moveTo(bx, by + bh);
        ctx.lineTo(bx + depth, by + bh + depth);
        ctx.lineTo(bx + bw + depth, by + bh + depth);
        ctx.lineTo(bx + bw, by + bh);
        ctx.closePath();
        ctx.fill();
        /* Right face extrusion */
        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.moveTo(bx + bw, by);
        ctx.lineTo(bx + bw + depth, by + depth);
        ctx.lineTo(bx + bw + depth, by + bh + depth);
        ctx.lineTo(bx + bw, by + bh);
        ctx.closePath();
        ctx.fill();
        /* Top edge highlight */
        ctx.strokeStyle = "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + bw, by);
        ctx.stroke();
        /* Moving platform indicator: pulse glow on top */
        if (b.type === 'moving') {
            const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.1);
            ctx.strokeStyle = `rgba(0,220,255,${0.4 * pulse + 0.15})`;
            ctx.lineWidth = 3;
            ctx.strokeRect(bx, by, bw, bh);
            ctx.strokeStyle = `rgba(0,180,255,${0.2 * pulse})`;
            ctx.lineWidth = 7;
            ctx.strokeRect(bx, by, bw, bh);
        }
    }
    /* ================= DRAW ================= */
    function draw() {
        ctx.save();
        ctx.translate(shakeX, shakeY);
        ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
        /* ---- Background ---- */
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
        /* Parallax layer 1: farther stars/clouds */
        ctx.globalAlpha = 0.18;
        ctx.drawImage(bg, para1X, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, para1X + canvas.width, 0, canvas.width, canvas.height);
        /* Parallax layer 2: even farther */
        ctx.globalAlpha = 0.09;
        ctx.drawImage(bg, para2X, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, para2X + canvas.width, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        /* Floating runes */
        runes.forEach(r => {
            ctx.save();
            ctx.globalAlpha = r.alpha;
            ctx.fillStyle = "#c8a0ff";
            ctx.font = `${r.size}px serif`;
            ctx.fillText(r.symbol, r.x, r.y);
            ctx.restore();
        });
        /* ---- Final Win Beams ---- */
        if (finalWin) {
            const cx = canvas.width / 2, cy = canvas.height / 2;
            const t = Date.now() * 0.001;
            ctx.save();
            ctx.translate(cx, cy);
            for (let i = 0; i < 16; i++) {
                ctx.save();
                ctx.rotate((Math.PI * 2 / 16) * i + t * 0.4);
                const g = ctx.createLinearGradient(0, 0, 0, 500);
                g.addColorStop(0, `hsla(${(i * 22 + t * 40) % 360},100%,70%,0.55)`);
                g.addColorStop(1, "rgba(0,0,0,0)");
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(45, 500); ctx.lineTo(-45, 500); ctx.closePath();
                ctx.fill();
                ctx.restore();
            }
            ctx.restore();
        }
        /* ---- 3D Platforms ---- */
        blocks.forEach(b => draw3DBlock(b));
        /* ---- Spikes ---- */
        spikes.forEach(s => {
            ctx.save();
            ctx.shadowColor = "#ff2200";
            ctx.shadowBlur = 8;
            ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
            ctx.restore();
        });
        /* ---- Castle ---- */
        ctx.save();
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 30;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        /* Extra glow pulse */
        const glow = 0.5 + 0.5 * Math.sin(frameCount * 0.07);
        ctx.shadowBlur = 50 * glow;
        ctx.shadowColor = `rgba(255,215,0,${0.4 * glow})`;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.restore();
        /* ---- Dragon ---- */
        if (dragonObj.active) {
            ctx.save();
            ctx.shadowColor = "#9b00ff";
            ctx.shadowBlur = 25;
            ctx.drawImage(dragonImg, dragonObj.x, dragonObj.y, dragonObj.w, dragonObj.h);
            ctx.restore();
        }
        /* ---- Fireballs ---- */
        fireballs.forEach(fb => fb.draw());
        /* ---- Player trails ---- */
        playerTrails.forEach(t => {
            const a = t.life / t.maxLife * 0.35;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.drawImage(wizard, t.x, t.y, 80, 80);
            ctx.restore();
        });
        /* ---- Player ---- */
        if (!gameOver && !finalWin) {
            /* Idle bob */
            const bobY = player.onGround ? Math.sin(frameCount * 0.12) * 2 : 0;
            ctx.save();
            ctx.shadowColor = "#a0f0ff";
            ctx.shadowBlur = 20;
            ctx.drawImage(wizard, player.x, player.y + bobY, 80, 80);
            ctx.restore();
        }
        /* ---- Particles ---- */
        particles.forEach(p => {
            const a = Math.max(0, p.life / p.maxLife);
            ctx.save();
            ctx.globalAlpha = a;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        /* ---- Fireworks ---- */
        fireworks.forEach(f => {
            const a = f.life / f.maxLife;
            ctx.save();
            ctx.globalAlpha = a;
            ctx.shadowColor = f.color; ctx.shadowBlur = 8;
            ctx.fillStyle = f.color;
            ctx.beginPath();
            ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });
        /* ---- HUD ---- */
        if (!finalWin) {
            ctx.save();
            ctx.shadowColor = "black"; ctx.shadowBlur = 6;
            ctx.fillStyle = "white"; ctx.font = "bold 18px 'Arial'";
            ctx.fillText("Level " + (levelIndex + 1), 20, 30);
            ctx.restore();
        }
        /* ---- Game Over ---- */
        if (gameOver) {
            ctx.save();
            ctx.fillStyle = "rgba(0,0,0,0.55)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.textAlign = "center";
            ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 30;
            ctx.fillStyle = "#ff4444"; ctx.font = "bold 56px serif";
            ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2 - 10);
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#ffffff"; ctx.font = "24px Arial";
            ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 40);
            ctx.restore();
        }
        /* ---- Level Win ---- */
        if (levelWin) {
            ctx.save();
            ctx.textAlign = "center";
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            /* Fire ring effect */
            const ring = 0.5 + 0.5 * Math.sin(frameCount * 0.2);
            ctx.shadowColor = `hsl(${frameCount * 4 % 360},100%,60%)`;
            ctx.shadowBlur = 40 + 20 * ring;
            ctx.fillStyle = "#ffd700";
            ctx.font = "bold 52px serif";
            ctx.fillText("LEVEL COMPLETED!", 0, 0);
            /* Inner brighter glow */
            ctx.shadowBlur = 10; ctx.shadowColor = "white";
            ctx.fillStyle = "#fff8c0";
            ctx.font = "bold 52px serif";
            ctx.fillText("LEVEL COMPLETED!", 0, 0);
            ctx.restore();
        }
        /* ---- Final Win ---- */
        if (finalWin) {
            ctx.save();
            ctx.textAlign = "center";
            /* Wave text */
            ctx.shadowColor = "lime"; ctx.shadowBlur = 25;
            ctx.font = "bold 62px serif";
            const text = "DUNGEON CLEARED!";
            const startX = canvas.width / 2 - ctx.measureText(text).width / 2;
            for (let ci = 0; ci < text.length; ci++) {
                const waveY = Math.sin(frameCount * 0.08 + ci * 0.5) * 8;
                ctx.fillStyle = `hsl(${(frameCount * 2 + ci * 15) % 360},100%,65%)`;
                ctx.fillText(text[ci], startX + ci * 36, canvas.height / 2 + waveY);
            }
            ctx.shadowBlur = 0;
            ctx.fillStyle = "white"; ctx.font = "28px Arial";
            ctx.fillText("The Wizard is Victorious!", canvas.width / 2, canvas.height / 2 + 55);
            ctx.fillStyle = "#aaaaaa"; ctx.font = "20px Arial";
            ctx.fillText("Press R to Play Again", canvas.width / 2, canvas.height / 2 + 95);
            ctx.restore();
        }
        ctx.restore(); // end shake translate
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



















































































































































































































































































































































































































































































































































