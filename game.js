"use strict";
document.addEventListener("DOMContentLoaded", () => {
    /* ================= CANVAS ================= */
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");
    /* ================= CONSTANTS ================= */
    const GRAVITY = 0.9;
    const SPEED = 5;
    const JUMP = 16;
    const FAST_FALL = 2.0;
    const FALL_DEATH_Y = canvas.height + 80;
    const CLOUD_SPEED = 0.5;
    /* ================= STATE ================= */
    let levelIndex = 0;
    let gameOver = false;
    let levelWin = false;
    let finalWin = false;
    let winTimer = 0;
    // Animation vars
    let wandAngle = 0;
    let textScale = 0;
    let arcRotation = 0; // For background arc
    // Background vars
    let bgX = 0;
    let colorTick = 0;
    /* ================= ASSETS ================= */
    const load = src => { const i = new Image(); i.src = src; return i; };
    const bg = load("assets/bg.png");
    const wizard = load("assets/wizard.png");
    const blockImg = load("assets/block.png");
    const spikeImg = load("assets/spike.png");
    const castleImg = load("assets/castle.png");
    /* ================= AUDIO ================= */
    const bgm = new Audio("assets/music.mp3");
    bgm.loop = true;
    bgm.volume = 0.6;
    const deathSound = new Audio("assets/death.mp3");
    let audioStarted = false;
    const startAudio = () => {
        if (!audioStarted) {
            bgm.play().catch(() => { });
            audioStarted = true;
        }
    };
    window.addEventListener("keydown", startAudio);
    window.addEventListener("click", startAudio);
    /* ================= PLAYER ================= */
    const player = {
        x: 0, y: 0,
        w: 60, h: 60, // Hitbox
        visualW: 80, visualH: 80,
        vx: 0, vy: 0,
        onGround: false,
        facingRight: true,
        parentPlatform: null
    };
    /* ================= PARTICLES ================= */
    let particles = [];
    let bgParticles = [];
    let castleParticles = [];
    function spawnParticle(list, x, y, options = {}) {
        list.push({
            x, y,
            vx: options.vx || (Math.random() - 0.5) * 2,
            vy: options.vy || (Math.random() - 0.5) * 2,
            life: options.life || 60,
            color: options.color || "white",
            size: options.size || Math.random() * 3 + 1,
            gravity: options.gravity || 0
        });
    }
    /* ================= LEVELS ================= */
    const levels = [
        // LEVEL 1: Intro
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 960, h: 40, type: 'static' },
                { x: 300, y: 430, w: 180, h: 32, type: 'static' },
                { x: 600, y: 350, w: 180, h: 32, type: 'static' }
            ],
            spikes: [
                { x: 400, y: 470, w: 40, h: 30 }
            ],
            castle: { x: 800, y: 200, w: 140, h: 180 }
        },
        // LEVEL 2: Moving Platforms
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 250, h: 40, type: 'static' },
                { x: 300, y: 420, w: 140, h: 32, type: 'moving', dx: 1.5, minX: 300, maxX: 500 },
                { x: 600, y: 350, w: 140, h: 32, type: 'moving', dx: -1.5, minX: 550, maxX: 750 },
                { x: 800, y: 300, w: 160, h: 32, type: 'static' }
            ],
            spikes: [
                { x: 200, y: 500, w: 100, h: 32 },
                { x: 850, y: 268, w: 40, h: 32 }
            ],
            castle: { x: 820, y: 140, w: 140, h: 180 }
        },
        // LEVEL 3: Sky High
        {
            start: { x: 30, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 150, h: 32, type: 'static' },
                { x: 200, y: 450, w: 120, h: 32, type: 'moving', dy: -1, minY: 350, maxY: 450 },
                { x: 380, y: 350, w: 120, h: 32, type: 'moving', dx: 2, minX: 380, maxX: 600 },
                { x: 700, y: 250, w: 200, h: 32, type: 'static' }
            ],
            spikes: [
                { x: 450, y: 500, w: 400, h: 32 },
                { x: 750, y: 218, w: 40, h: 32 }
            ],
            castle: { x: 800, y: 80, w: 140, h: 180 }
        }
    ];
    let blocks = [], spikes = [], castle = {};
    function loadLevel(i) {
        if (i >= levels.length) {
            finalWin = true;
            return;
        }
        const l = JSON.parse(JSON.stringify(levels[i]));
        blocks = l.blocks;
        spikes = l.spikes;
        castle = l.castle;
        player.x = l.start.x;
        player.y = l.start.y;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;
        player.parentPlatform = null;
        gameOver = false;
        levelWin = false;
        winTimer = 0;
        wandAngle = 0;
        textScale = 0;
        particles = [];
        castleParticles = [];
    }
    // Strict Hitbox (Blocks)
    function hit(a, b) {
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    }
    // Precise Hitbox (Spikes)
    function hitSpike(p, s) {
        // Reduced kill zone
        return p.x + p.w > s.x + 10 &&
            p.x < s.x + s.w - 10 &&
            p.y + p.h > s.y + 15;
    }
    /* ================= GAME LOOP ================= */
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (gameOver && e.code === "KeyR") loadLevel(levelIndex);
    });
    window.addEventListener("keyup", e => keys[e.code] = false);
    function update() {
        // Background
        bgX -= CLOUD_SPEED;
        if (bgX <= -canvas.width) bgX = 0;
        colorTick += 0.02;
        arcRotation += 0.002; // Rotate arc slow
        // BG Particles
        if (Math.random() < 0.2) {
            spawnParticle(bgParticles, Math.random() * canvas.width, canvas.height + 10, {
                vy: -Math.random() * 2 - 1,
                life: 300,
                color: `hsla(${Math.random() * 60 + 240}, 100%, 70%, 0.5)`,
                size: Math.random() * 4
            });
        }
        if (gameOver || finalWin) {
            updateParticles();
            return;
        }
        // Castle sparkles
        if (Math.random() < 0.4) {
            spawnParticle(castleParticles,
                castle.x + Math.random() * castle.w,
                castle.y + Math.random() * castle.h,
                { color: Math.random() > 0.5 ? "#FFD700" : "#FFF", life: 50 });
        }
        // == WIN ANIMATION ==
        if (levelWin) {
            winTimer++;
            // Raise Wand
            if (winTimer < 45) {
                wandAngle = (winTimer / 45) * (-Math.PI / 2.5);
            }
            // Sparkles
            if (winTimer >= 45) {
                // Calculate EXACT Wand Tip Position using the same transforms as draw()
                const visX = player.x - (player.visualW - player.w) / 2;
                const visY = player.y - (player.visualH - player.h); // Aligned bottom
                // Pivot point relative to visual rect
                // Facing Right: Pivot is at (visualW - 20, 45)
                // Facing Left:  Pivot is at (20, 45)
                const pivotX = player.facingRight ? (visX + player.visualW - 20) : (visX + 20);
                const pivotY = visY + 45;
                // Wand Length = 40. Start drawing at 0, end at 40. Tip is at 40.
                // Rotation = wandAngle
                // Math for rotated point:
                // If facing right: angle is wandAngle (negative = up)
                // If facing left:  context is flipped, so visual angle is mirrored
                const wLen = 40;
                let actualAngle = wandAngle;
                // The 'draw' scale(-1, 1) effectively reflects the X coord relative to pivot?
                // Actually easier: calculate vector
                // Right: Vector( cos(angle), sin(angle) ) * length
                // Left:  Vector( -cos(angle), sin(angle) ) * length (X is flipped)
                const dirX = player.facingRight ? 1 : -1;
                const tipX = pivotX + (Math.cos(actualAngle) * wLen * dirX);
                const tipY = pivotY + (Math.sin(actualAngle) * wLen);
                // Burst
                if (winTimer === 45) {
                    for (let i = 0; i < 30; i++) spawnParticle(particles, tipX, tipY, { vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, color: "cyan" });
                    // Text Burst center
                    for (let i = 0; i < 50; i++) {
                        spawnParticle(particles,
                            canvas.width / 2 + (Math.random() - 0.5) * 300,
                            canvas.height / 2 + (Math.random() - 0.5) * 50,
                            { color: "gold", life: 100, size: 4 });
                    }
                }
                // Stream
                if (winTimer % 4 === 0) {
                    spawnParticle(particles, tipX, tipY, {
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2,
                        color: "#00FFFF"
                    });
                }
                if (textScale < 1.2) textScale += 0.05;
            }
            if (winTimer > 200) {
                levelIndex++;
                loadLevel(levelIndex);
            }
            updateParticles();
            return;
        }
        // == BLOCKS LOGIC ==
        blocks.forEach(b => {
            if (b.type === 'moving') {
                if (b.dx) {
                    b.x += b.dx;
                    if (b.x > b.maxX || b.x < b.minX) b.dx *= -1;
                    if (player.parentPlatform === b) player.x += b.dx;
                }
                if (b.dy) {
                    b.y += b.dy;
                    if (b.y > b.maxY || b.y < b.minY) b.dy *= -1;
                    if (player.parentPlatform === b) player.y += b.dy;
                }
            }
        });
        // == PLAYER PHYSICS ==
        player.vx = 0;
        if (keys.ArrowLeft) { player.vx = -SPEED; player.facingRight = false; }
        if (keys.ArrowRight) { player.vx = SPEED; player.facingRight = true; }
        if (keys.ArrowDown) player.vy += FAST_FALL;
        if (keys.Space && player.onGround) {
            player.vy = -JUMP;
            player.onGround = false;
            player.parentPlatform = null;
        }
        player.vy += GRAVITY;
        player.x += player.vx;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vx > 0) player.x = b.x - player.w;
                else if (player.vx < 0) player.x = b.x + b.w;
                player.vx = 0;
            }
        });
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
        player.y += player.vy;
        player.onGround = false;
        const oldParent = player.parentPlatform;
        player.parentPlatform = null;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vy > 0) {
                    player.y = b.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                    player.parentPlatform = b;
                } else if (player.vy < 0) {
                    player.y = b.y + b.h;
                    player.vy = 0;
                }
            }
        });
        if (player.y > FALL_DEATH_Y) die();
        spikes.forEach(s => { if (hitSpike(player, s)) die(); });
        const pcx = player.x + player.w / 2;
        const pcy = player.y + player.h / 2;
        if (pcx > castle.x && pcx < castle.x + castle.w &&
            pcy > castle.y + 20 && pcy < castle.y + castle.h) {
            levelWin = true;
            player.vx = 0; player.vy = 0;
            player.x = castle.x + castle.w / 2 - player.w / 2;
            player.y = castle.y + castle.h - player.h - 5;
        }
        updateParticles();
    }
    function die() {
        gameOver = true;
        deathSound.play().catch(() => { });
    }
    function updateParticles() {
        [particles, bgParticles, castleParticles].forEach(list => {
            list.forEach(p => {
                p.x += p.vx;
                p.y += p.vy + p.gravity;
                p.life--;
            });
        });
        particles = particles.filter(p => p.life > 0);
        bgParticles = bgParticles.filter(p => p.life > 0);
        castleParticles = castleParticles.filter(p => p.life > 0);
    }
    /* ================= DRAW ================= */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // -- BACK LAYER --
        const tint = Math.abs(Math.sin(colorTick)) * 0.2;
        ctx.save();
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(30, 0, 60, ${tint + 0.3})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        // -- MAGICAL ARC ELEMENT --
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2); // Center
        ctx.rotate(arcRotation);
        // Draw huge arc
        ctx.beginPath();
        ctx.arc(0, 0, 300, 0, Math.PI * 2); // Radius 300
        ctx.lineWidth = 15;
        const grad = ctx.createLinearGradient(-300, -300, 300, 300);
        grad.addColorStop(0, "transparent");
        grad.addColorStop(0.5, `hsla(${colorTick * 100}, 80%, 70%, 0.3)`);
        grad.addColorStop(1, "transparent");
        ctx.strokeStyle = grad;
        ctx.stroke();
        // Use a second arc for effect
        ctx.rotate(arcRotation * 2); // Different speed
        ctx.beginPath();
        ctx.arc(0, 0, 350, 0, Math.PI * 1.5);
        ctx.lineWidth = 5;
        ctx.strokeStyle = `hsla(${colorTick * 100 + 180}, 80%, 80%, 0.2)`;
        ctx.stroke();
        ctx.restore();
        // BG Particles
        bgParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        // World
        blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
        spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
        // Castle
        ctx.save();
        ctx.shadowColor = `hsl(${colorTick * 100}, 100%, 75%)`;
        ctx.shadowBlur = 50;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.restore();
        castleParticles.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, 2, 2); });
        // Player
        const visX = player.x - (player.visualW - player.w) / 2;
        const visY = player.y - (player.visualH - player.h);
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(visX + player.visualW, visY);
            ctx.scale(-1, 1);
            ctx.drawImage(wizard, 0, 0, player.visualW, player.visualH);
        } else {
            ctx.drawImage(wizard, visX, visY, player.visualW, player.visualH);
        }
        // Wand
        if (levelWin) {
            ctx.save();
            const wx = player.facingRight ? visX + player.visualW - 20 : visX + 20;
            const wy = visY + 45;
            ctx.translate(wx, wy);
            if (!player.facingRight) ctx.scale(-1, 1);
            ctx.rotate(wandAngle);
            ctx.fillStyle = "#8d5524";
            ctx.fillRect(0, -4, 40, 8);
            ctx.fillStyle = "#00FFFF";
            ctx.fillRect(35, -5, 12, 12);
            ctx.restore();
        }
        ctx.restore();
        // Particles
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });
        // UI
        ctx.fillStyle = "white";
        ctx.font = "bold 24px Arial";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`Level ${levelIndex + 1}`, 20, 40);
        if (gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ff4444";
            ctx.textAlign = "center";
            ctx.font = "bold 60px Arial";
            ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
            ctx.fillStyle = "white";
            ctx.font = "24px Arial";
            ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 60);
        }
        if (levelWin && textScale > 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "cyan";
            ctx.shadowBlur = 20;
            ctx.textAlign = "center";
            ctx.font = "bold 80px Arial";
            ctx.fillText("LEVEL COMPLETED", 0, 0);
            ctx.restore();
        }
        if (finalWin) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "gold";
            ctx.textAlign = "center";
            ctx.font = "bold 70px Arial";
            ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2);
        }
    }
    function loop() {
        update();
        draw();
        requestAnimationFrame(loop);
    }
    loadLevel(0);
    loop();
});













































































































































































































































































































































































































































