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
    const BG_SCROLL_SPEED = 1.0;
    /* ================= STATE ================= */
    let levelIndex = 0;
    let gameOver = false;
    let levelWin = false;
    let finalWin = false;
    let winTimer = 0;
    let wandAngle = 0;   // For animation
    let textScale = 0;   // For text zoom
    // Background scrolling state
    let bgX = 0;
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
    // Click/Key to start audio
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
        w: 80, h: 80, // Little big character
        vx: 0, vy: 0,
        onGround: false,
        facingRight: true
    };
    /* ================= PARTICLES ================= */
    let particles = [];
    function spawnSparkles(x, y, count = 10, color = "white") {
        for (let i = 0; i < count; i++) {
            particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 40 + Math.random() * 20,
                color: color,
                size: Math.random() * 4 + 2
            });
        }
    }
    /* ================= LEVELS ================= */
    const levels = [
        // LEVEL 1: Intro (Easy)
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 960, h: 40 }, // Ground
                { x: 300, y: 430, w: 150, h: 32 },
                { x: 600, y: 350, w: 150, h: 32 }
            ],
            spikes: [
                { x: 400, y: 460, w: 40, h: 40 } // Spike on ground
            ],
            castle: { x: 800, y: 200, w: 140, h: 180 }
        },
        // LEVEL 2: Moderate (Gaps & Spikes)
        {
            start: { x: 50, y: 400 },
            blocks: [
                { x: 0, y: 500, w: 250, h: 40 },
                { x: 300, y: 420, w: 120, h: 32 },
                { x: 500, y: 350, w: 120, h: 32 },
                { x: 750, y: 300, w: 210, h: 32 }
            ],
            spikes: [
                { x: 220, y: 500, w: 100, h: 32 }, // Floor spikes
                { x: 340, y: 388, w: 40, h: 32 },  // Platform spike
            ],
            castle: { x: 800, y: 140, w: 140, h: 180 }
        },
        // LEVEL 3: HARD (High precision, many spikes)
        {
            start: { x: 30, y: 450 },
            blocks: [
                { x: 0, y: 520, w: 120, h: 32 },
                { x: 180, y: 450, w: 100, h: 32 },
                { x: 350, y: 380, w: 100, h: 32 },
                { x: 520, y: 310, w: 100, h: 32 },
                { x: 690, y: 240, w: 100, h: 32 },
                { x: 830, y: 240, w: 130, h: 32 }
            ],
            spikes: [
                { x: 230, y: 418, w: 40, h: 32 },
                { x: 400, y: 348, w: 40, h: 32 },
                { x: 570, y: 278, w: 40, h: 32 }
            ],
            castle: { x: 810, y: 30, w: 140, h: 200 }
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
    }
    /* ================= INPUT ================= */
    const keys = {};
    window.addEventListener("keydown", e => {
        keys[e.code] = true;
        if (gameOver && e.code === "KeyR") loadLevel(levelIndex);
    });
    window.addEventListener("keyup", e => keys[e.code] = false);
    /* ================= COLLISION ================= */
    const hit = (a, b) =>
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y;
    /* ================= UPDATE ================= */
    function update() {
        // Scroll Background
        bgX -= BG_SCROLL_SPEED;
        if (bgX <= -canvas.width) bgX = 0;
        if (gameOver || finalWin) return;
        // == WIN ANIMATION SEQUENCE ==
        if (levelWin) {
            winTimer++;
            // 1. Raise Wand (First 40 frames)
            if (winTimer < 40) {
                wandAngle = (winTimer / 40) * (-Math.PI / 3); // ~60 degrees up
            }
            // 2. Emit Sparkles & Show Text (At frame 40)
            if (winTimer >= 40) {
                if (winTimer === 40) {
                    // Burst of sparkles from wand tip
                    const tipX = player.facingRight ? player.x + player.w + 10 : player.x - 10;
                    const tipY = player.y + 10;
                    spawnSparkles(tipX, tipY, 30, "gold");
                    spawnSparkles(tipX, tipY, 15, "cyan");
                }
                // Continuous small sparkles
                if (winTimer % 5 === 0) {
                    const tipX = player.facingRight ? player.x + player.w + 10 : player.x - 10;
                    spawnSparkles(tipX, player.y + 10, 2, "white");
                }
                // Zoom text
                if (textScale < 1) textScale += 0.05;
            }
            // 3. Next Level
            if (winTimer > 180) { // 3 seconds
                levelIndex++;
                loadLevel(levelIndex);
            }
            updateParticles();
            return;
        }
        // == PLAYER MOVEMENT ==
        player.vx = 0;
        if (keys.ArrowLeft) {
            player.vx = -SPEED;
            player.facingRight = false;
        }
        if (keys.ArrowRight) {
            player.vx = SPEED;
            player.facingRight = true;
        }
        if (keys.ArrowDown) player.vy += FAST_FALL;
        if (keys.Space && player.onGround) {
            player.vy = -JUMP;
            player.onGround = false;
        }
        player.vy += GRAVITY;
        // X Movement & Collision
        player.x += player.vx;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vx > 0) player.x = b.x - player.w;
                else if (player.vx < 0) player.x = b.x + b.w;
                player.vx = 0;
            }
        });
        // Bounds X
        if (player.x < 0) player.x = 0;
        if (player.x + player.w > canvas.width) player.x = canvas.width - player.w;
        // Y Movement & Collision
        player.y += player.vy;
        player.onGround = false;
        blocks.forEach(b => {
            if (hit(player, b)) {
                if (player.vy > 0) { // Falling
                    player.y = b.y - player.h;
                    player.vy = 0;
                    player.onGround = true;
                } else if (player.vy < 0) { // Jumping up
                    player.y = b.y + b.h;
                    player.vy = 0;
                }
            }
        });
        // == DEATH ==
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
        // == VICTORY CHECK ==
        // Must touch castle center
        const px = player.x + player.w / 2;
        const py = player.y + player.h / 2;
        if (px > castle.x + 20 && px < castle.x + castle.w - 20 &&
            py > castle.y + 20 && py < castle.y + castle.h) {
            levelWin = true;
            player.vx = 0;
            player.vy = 0;
            // Center player in castle door
            player.x = castle.x + castle.w / 2 - player.w / 2;
            player.y = castle.y + castle.h - player.h - 5;
        }
        updateParticles();
    }
    function updateParticles() {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
        });
        particles = particles.filter(p => p.life > 0);
    }
    /* ================= DRAW ================= */
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw Scrolling BG (Two copies stitched)
        ctx.drawImage(bg, bgX, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, bgX + canvas.width, 0, canvas.width, canvas.height);
        // Blocks
        blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
        spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));
        // Castle (Glow)
        ctx.save();
        ctx.shadowColor = "gold";
        ctx.shadowBlur = 30;
        ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
        ctx.restore();
        // Player
        ctx.save();
        if (!player.facingRight) {
            ctx.translate(player.x + player.w, player.y);
            ctx.scale(-1, 1);
            ctx.drawImage(wizard, 0, 0, player.w, player.h);
        } else {
            ctx.drawImage(wizard, player.x, player.y, player.w, player.h);
        }
        // Wand Drawing (Only during win)
        if (levelWin) {
            ctx.save();
            // Attach wand to hand position
            if (player.facingRight) ctx.translate(player.x + player.w - 15, player.y + 45);
            else ctx.translate(15, 45); // Flipped coords
            ctx.rotate(wandAngle);
            // Wand stick
            ctx.fillStyle = "#8d5524";
            ctx.fillRect(0, -4, 35, 8);
            // Wand tip
            ctx.fillStyle = "#fff";
            ctx.fillRect(30, -5, 10, 10);
            ctx.restore();
        }
        ctx.restore(); // End player flip
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
        ctx.fillText(`Level ${levelIndex + 1}`, 20, 40);
        if (gameOver) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "#ff4444";
            ctx.textAlign = "center";
            ctx.font = "bold 60px Arial";
            ctx.fillText("YOU DIED", canvas.width / 2, canvas.height / 2);
            ctx.font = "24px Arial";
            ctx.fillStyle = "white";
            ctx.fillText("Press R to Retry", canvas.width / 2, canvas.height / 2 + 50);
        }
        if (levelWin && textScale > 0) {
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(textScale, textScale);
            ctx.fillStyle = "#ffd700";
            ctx.shadowColor = "black";
            ctx.shadowBlur = 10;
            ctx.textAlign = "center";
            ctx.font = "bold 70px Arial";
            ctx.fillText("LEVEL COMPLETED", 0, 0);
            ctx.restore();
        }
        if (finalWin) {
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = "gold";
            ctx.textAlign = "center";
            ctx.font = "bold 60px Arial";
            ctx.fillText("VICTORY!", canvas.width / 2, canvas.height / 2);
            ctx.font = "30px Arial";
            ctx.fillStyle = "white";
            ctx.fillText("You are a Master Wizard!", canvas.width / 2, canvas.height / 2 + 60);
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














































































































































































































































































































































































































































