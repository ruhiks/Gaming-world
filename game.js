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
    const CLOUD_SPEED = 1.0;

    /* ================= STATE ================= */
    let levelIndex = 0;
    let gameOver = false;
    let levelWin = false;
    let finalWin = false;
    let winTimer = 0;
    // Animation vars
    let wandAngle = 0;
    let textScale = 0;
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
    bgm.volume = 0.4;
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
        w: 64, h: 64, // Slightly smaller hitbox for better feel (Visual is drawn larger if needed)
        visualW: 80, visualH: 80, // Draw size
        vx: 0, vy: 0,
        onGround: false,
        facingRight: true
    };

    /* ================= PARTICLES ================= */
    let particles = [];
    let castleParticles = [];

    function spawnSparkles(list, x, y, count, colors) {
        for (let i = 0; i < count; i++) {
            list.push({
                x, y,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                life: 40 + Math.random() * 30,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 3 + 1
            });
        }
    }

    /* ================= LEVELS ================= */
    // Note: Blocks are wider now to give "space to stand"
    const levels = [
        // LEVEL 1: Intro (Easy but with spike)
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 960, h: 40 }, // Ground
                { x: 300, y: 430, w: 180, h: 32 }, // Wider platform
                { x: 600, y: 350, w: 180, h: 32 }
            ],
            spikes: [
                { x: 400, y: 465, w: 40, h: 35 }, // Spike on ground (lowered collision)
                { x: 660, y: 315, w: 40, h: 35 }
            ],
            castle: { x: 800, y: 200, w: 140, h: 180 }
        },
        // LEVEL 2: The Climb (Harder)
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 300, h: 40 },
                { x: 350, y: 420, w: 140, h: 32 },
                { x: 550, y: 350, w: 140, h: 32 },
                { x: 750, y: 300, w: 210, h: 32 }
            ],
            spikes: [
                { x: 280, y: 500, w: 70, h: 32 }, // Floor spikes gap
                { x: 400, y: 388, w: 40, h: 32 }, // Platform spike
                { x: 600, y: 318, w: 40, h: 32 }
            ],
            castle: { x: 820, y: 140, w: 140, h: 180 }
        },
        // LEVEL 3: Use the Spells (Hard)
        // More precision required, but blocks are fair size
        {
            start: { x: 30, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 150, h: 32 },
                { x: 220, y: 440, w: 120, h: 32 }, // Gap requires jump
                { x: 400, y: 360, w: 120, h: 32 },
                { x: 580, y: 280, w: 120, h: 32 },
                { x: 740, y: 200, w: 180, h: 32 }  // Castle platform
            ],
            spikes: [
                { x: 260, y: 408, w: 40, h: 32 }, // Spike ON platform requiring precision
                { x: 440, y: 328, w: 40, h: 32 },
                { x: 620, y: 248, w: 40, h: 32 }
            ],
            castle: { x: 760, y: 20, w: 140, h: 180 }
        }
    ];

    let blocks = [], spikes = [], castle = {};

    function loadLevel(i) {
        if (i >= levels.length) {
            finalWin = true;
            return;
        }
        const l = levels[i];
        blocks = l.blocks;
        spikes = l.spikes;
        castle = l.castle;

        player.x = l.start.x;
        player.y = l.start.y;
        player.vx = 0;
        player.vy = 0;
        player.onGround = false;

        gameOver = false;
        levelWin = false;
        winTimer = 0;
        wandAngle = 0;
        textScale = 0;
        particles = [];
        castleParticles = [];
    }

    /* ================= COLLISIONS ================= */

    // Strict AABB
    function hit(a, b) {
        return a.x < b.x + b.w &&
            a.x + a.w > b.x &&
            a.y < b.y + b.h &&
            a.y + a.h > b.y;
    }

    // Forgiving hitbox for spikes (Must overlap significantly)
    // Padding reduces the "kill zone" size inside the sprite
    function hitSpike(p, s) {
        const padding = 15; // 15 pixels forgiveness on each side
        return p.x + padding < s.x + s.w - padding &&
            p.x + p.w - padding > s.x + padding &&
            p.y + padding < s.y + s.h - 5 && // Less padding on bottom (ground)
            p.y + p.h - padding > s.y + 10;
    }

    /* ================= GAME LOOP ================= */

    // Input
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (gameOver && e.code === "KeyR") loadLevel(levelIndex);
    });
    window.addEventListener("keyup", e => keys[e.code] = false);


    function update() {
        // Magical Background
        bgX -= CLOUD_SPEED;
        if (bgX <= -canvas.width) bgX = 0;
        colorTick += 0.02;

        if (gameOver || finalWin) return;

        // == CASTLE SPARKLES (Always) ==
        if (Math.random() < 0.3) {
            spawnSparkles(castleParticles,
                castle.x + Math.random() * castle.w,
                castle.y + Math.random() * castle.h,
                1, ["#FFD700", "#FFF"]);
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
                const tipX = player.facingRight ? player.x + player.w + 12 : player.x - 12;
                const tipY = player.y + 12;

                if (winTimer === 45) {
                    spawnSparkles(particles, tipX, tipY, 40, ["#FFD700", "#00FFFF", "#FFFFFF"]);
                }
                if (winTimer % 4 === 0) {
                    spawnSparkles(particles, tipX, player.y + 10, 2, ["#00FFFF", "#FFF"]);
                }
                if (textScale < 1.2) textScale += 0.04;
            }

            if (winTimer > 200) {
                levelIndex++;
                loadLevel(levelIndex);
            }

            updateParticles();
            return;
        }

        // == MOVEMENT ==
        player.vx = 0;
        if (keys.ArrowLeft) { player.vx = -SPEED; player.facingRight = false; }
        if (keys.ArrowRight) { player.vx = SPEED; player.facingRight = true; }
        if (keys.ArrowDown) player.vy += FAST_FALL;

        if (keys.Space && player.onGround) {
            player.vy = -JUMP;
            player.onGround = false;
        }

        player.vy += GRAVITY;

        // X Physics
        player.x += player.vx;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vx > 0) player.x = b.x - player.w;
                else if (player.vx < 0) player.x = b.x + b.w;
                player.vx = 0;
            }
        });

        // Bounds
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;

        // Y Physics
        player.y += player.vy;
        player.onGround = false;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vy > 0) {
                    player.y = b.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                } else if (player.vy < 0) {
                    player.y = b.y + b.h;
                    player.vy = 0;
                }
            }
        });

        // == DEATH ==
        if (player.y > FALL_DEATH_Y) die();

        // Spike Death (Forgiving)
        spikes.forEach(s => {
            if (hitSpike(player, s)) die();
        });

        // Win Trigger
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
        [particles, castleParticles].forEach(list => {
            list.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life--;
            });
            // Can't assign back to list variable inside forEach easily, need to filter outside or use a loop
        });
        particles = particles.filter(p => p.life > 0);
        castleParticles = castleParticles.filter(p => p.life > 0);
    }

    /* ================= DRAW ================= */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // BG
        const tint = Math.abs(Math.sin(colorTick)) * 0.2;
        ctx.save();
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
        ctx.fillStyle = `rgba(50, 0, 80, ${tint})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // World
        blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
        spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

        // Castle
        ctx.save();
        ctx.shadowColor = `hsl(${colorTick * 50}, 100%, 70%)`;
        ctx.shadowBlur = 40;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.restore();

        // Castle Sparkles
        castleParticles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 2, 2);
        });

        // Player
        // Note: Logic x/y/w/h (64) is smaller than Visual (80)
        // We centre the visual sprite on the logic hitbox
        const visX = player.x - (player.visualW - player.w) / 2;
        const visY = player.y - (player.visualH - player.h); // Aligned bottom

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
            const handX = player.facingRight ? visX + player.visualW - 15 : 15;
            const handY = visY + 45;

            if (player.facingRight) ctx.translate(handX, handY);
            else ctx.translate(handX, handY); // already inside flip if I did it right? No, wait.
            // Wait, we are NOT inside the player flip context here.

            // Correction: Re-calculate for world space draw
            const wX = player.facingRight ? visX + player.visualW - 20 : visX + 20;
            const wY = visY + 45;

            ctx.translate(wX, wY);
            if (!player.facingRight) ctx.scale(-1, 1); // Flip wand too

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
            ctx.rotate(Math.sin(colorTick * 2) * 0.1);

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














































































































































































































































































































































































































































