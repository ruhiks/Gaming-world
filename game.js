document.addEventListener("DOMContentLoaded", () => {

  /* ================= CANVAS ================= */
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  /* ================= CONSTANTS ================= */
  const GRAVITY = 0.9;
  const SPEED = 4;
  const JUMP = 15;
  const FAST_FALL = 1.6;
  const FALL_DEATH_Y = canvas.height + 80;

  /* ================= STATE ================= */
  let levelIndex = 0;
  let gameOver = false;
  let levelWin = false;
  let finalWin = false;
  let winTimer = 0;
  let rotate = 0;

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
  window.addEventListener("keydown", () => {
    if (!audioStarted) {
      bgm.play().catch(() => {});
      audioStarted = true;
    }
  }, { once: true });

  /* ================= PLAYER ================= */
  const player = {
    x: 0, y: 0,
    w: 96, h: 128,
    vx: 0, vy: 0,
    onGround: false
  };

  /* ================= WAND SPARKLES ================= */
  let particles = [];
  function sparkle(x, y) {
    for (let i = 0; i < 20; i++) {
      particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2,
        life: 40
      });
    }
  }

  /* ================= LEVELS ================= */
  const levels = [
    {
      start: { x: 80, y: 360 },
      blocks: [
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 320, y: 420, w: 160, h: 28 },
        { x: 580, y: 340, w: 160, h: 28 }
      ],
      spikes: [{ x: 450, y: 460, w: 40, h: 40 }],
      castle: { x: 760, y: 120, w: 160, h: 180 }
    },
    {
      start: { x: 60, y: 360 },
      blocks: [
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 240, y: 420, w: 120, h: 26 },
        { x: 440, y: 340, w: 120, h: 26 },
        { x: 640, y: 260, w: 120, h: 26 }
      ],
      spikes: [
        { x: 200, y: 460, w: 40, h: 40 },
        { x: 400, y: 460, w: 40, h: 40 },
        { x: 600, y: 460, w: 40, h: 40 }
      ],
      castle: { x: 760, y: 60, w: 160, h: 180 }
    },
    {
      start: { x: 40, y: 360 },
      blocks: [
        { x: 0, y: 500, w: 960, h: 40 },
        { x: 160, y: 420, w: 90, h: 24 },
        { x: 320, y: 340, w: 90, h: 24 },
        { x: 480, y: 260, w: 90, h: 24 },
        { x: 640, y: 180, w: 90, h: 24 }
      ],
      spikes: [
        { x: 120, y: 460, w: 40, h: 40 },
        { x: 300, y: 460, w: 40, h: 40 },
        { x: 480, y: 460, w: 40, h: 40 },
        { x: 660, y: 460, w: 40, h: 40 }
      ],
      castle: { x: 760, y: 0, w: 180, h: 200 }
    }
  ];

  let blocks = [], spikes = [], castle = {};

  function loadLevel(i) {
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
    rotate = 0;
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
    if (gameOver || finalWin) return;

    if (levelWin) {
      winTimer++;
      rotate += 0.03;
      sparkle(player.x + player.w / 2, player.y + 30);
      if (winTimer > 120) {
        levelIndex++;
        if (levelIndex < levels.length) loadLevel(levelIndex);
        else finalWin = true;
      }
      return;
    }

    player.vx = 0;
    if (keys.ArrowLeft) player.vx = -SPEED;
    if (keys.ArrowRight) player.vx = SPEED;
    if (keys.ArrowDown) player.vy += FAST_FALL;

    if (keys.Space && player.onGround) {
      player.vy = -JUMP;
      player.onGround = false;
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    player.onGround = false;
    blocks.forEach(b => {
      if (
        hit(player, b) &&
        player.vy >= 0 &&
        player.y + player.h - player.vy <= b.y
      ) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    });

    if (player.y > FALL_DEATH_Y) {
      gameOver = true;
      deathSound.play().catch(() => {});
    }

    spikes.forEach(s => {
      if (hit(player, s)) {
        gameOver = true;
        deathSound.play().catch(() => {});
      }
    });

    if (hit(player, castle)) {
      levelWin = true;
      player.vx = 0;
      player.vy = 0;
    }

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

    ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
    blocks.forEach(b => ctx.drawImage(blockImg, b.x, b.y, b.w, b.h));
    spikes.forEach(s => ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h));

    ctx.save();
    ctx.shadowColor = "gold";
    ctx.shadowBlur = 20;
    ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
    ctx.restore();

    ctx.drawImage(wizard, player.x, player.y, player.w, player.h);

    particles.forEach(p => {
      ctx.fillStyle = "rgba(255,215,160,0.8)";
      ctx.fillRect(p.x, p.y, 4, 4);
    });

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText(`Dungeon Level ${levelIndex + 1}`, 20, 30);

    if (gameOver) {
      ctx.font = "40px Arial";
      ctx.fillText("YOU DIED", 360, 260);
      ctx.font = "20px Arial";
      ctx.fillText("Press R to Retry", 360, 300);
    }

    if (levelWin) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.sin(rotate) * 0.15);
      ctx.font = "34px Arial";
      ctx.fillText("LEVEL COMPLETED", -160, 0);
      ctx.restore();
    }

    if (finalWin) {
      ctx.font = "42px Arial";
      ctx.fillText("DUNGEON CLEARED!", 250, 260);
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



























































































































































































































































































































































































































































