"use strict";

document.addEventListener("DOMContentLoaded", () => {

/* ================= CANVAS ================= */
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

/* ================= CONSTANTS & PHYSICS CONFIG ================= */
const FIXED_DT     = 1 / 60; // Deterministic 60Hz physics step
const MAX_DELTA    = 0.25;   // Prevent physics spiral on tab switch / lag spike
const GRAVITY      = 0.9;
const SPEED        = 5;
const JUMP         = 16;
const FAST_FALL    = 1.8;
const FALL_DEATH_Y = canvas.height + 60;
const CLOUD_SPEED  = 0.4;
const MAX_LIVES    = 3;
const MAX_HEALTH   = 3; // 3 Hearts

/* ================= PHASE 2A: PLATFORMING FEEL ================= */
const COYOTE_TIME         = 6;   // ~100ms at 60 Hz — frames after leaving ground where jump is still allowed
const JUMP_BUFFER_TIME    = 6;   // ~100ms at 60 Hz — frames before landing where a jump press is remembered
const JUMP_CUT_MULTIPLIER = 0.4; // multiplier applied to upward vy when jump key released early (tap = shorter hop)

/* ================= PHASE 2B: COLLISION TYPES ================= */
// Set block.collision in level data to control collision behavior:
//   'one-way' — top surface only; player can jump up through it (default for all existing platforms)
//   'solid'   — 4-directional; stops player on top, bottom, left, and right (for walls / enclosed rooms)
const COLLISION_ONE_WAY = 'one-way';
const COLLISION_SOLID   = 'solid';

/* ================= HITBOX CONFIGURATION ================= */
const PLAYER_CONFIG = {
  w: 48,             // Accurate collision width (tight to body)
  h: 64,             // Accurate collision height (head-to-feet)
  spriteW: 80,       // Visual render width
  spriteH: 80,       // Visual render height
  offsetX: -16,      // Center sprite over hitbox: (80 - 48)/2 = 16
  offsetY: -16       // Align feet with platform surface: 80 - 64 = 16
};

/* ================= GAME STATES & STATE MACHINE (PHASE 3) ================= */
const GAME_STATES = {
  MAIN_MENU:      "MAIN_MENU",
  PLAYING:        "PLAYING",
  PAUSED:         "PAUSED",
  LEVEL_COMPLETE: "LEVEL_COMPLETE",
  GAME_OVER:      "GAME_OVER",
  SETTINGS:       "SETTINGS"
};

let gameState     = GAME_STATES.MAIN_MENU;
let previousState = GAME_STATES.MAIN_MENU;

function setGameState(newState) {
  if (newState === GAME_STATES.SETTINGS && gameState !== GAME_STATES.SETTINGS) {
    previousState = gameState;
  }

  gameState = newState;

  if (typeof document !== 'undefined') {
    const screens = {
      [GAME_STATES.MAIN_MENU]:      document.getElementById("mainMenuScreen"),
      [GAME_STATES.PAUSED]:         document.getElementById("pauseMenuScreen"),
      [GAME_STATES.GAME_OVER]:      document.getElementById("gameOverScreen"),
      [GAME_STATES.LEVEL_COMPLETE]: document.getElementById("levelCompleteScreen"),
      [GAME_STATES.SETTINGS]:       document.getElementById("settingsScreen"),
      "LEVEL_SELECT":               document.getElementById("levelSelectScreen")
    };

    Object.entries(screens).forEach(([key, el]) => {
      if (el) el.style.display = (key === newState) ? "flex" : "none";
    });

    const pauseBtn = document.getElementById("btnInGamePause");
    if (pauseBtn) {
      pauseBtn.style.display = (newState === GAME_STATES.PLAYING) ? "block" : "none";
    }

    const mobileUI = document.getElementById("mobileUI");
    if (mobileUI) {
      const isTouch = ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));
      if (isTouch && newState === GAME_STATES.PLAYING) {
        mobileUI.style.display = "flex";
      } else {
        mobileUI.style.display = "none";
      }
    }

    if (newState === GAME_STATES.LEVEL_COMPLETE) {
      const titleEl = document.getElementById("levelCompleteTitle");
      const subEl   = document.getElementById("levelCompleteSubtitle");
      const nextBtn = document.getElementById("btnNextLevel");

      if (levelIndex >= levels.length - 1) {
        if (titleEl) titleEl.textContent = "DUNGEON CLEARED!";
        if (subEl)   subEl.textContent   = "The Wizard is Victorious!";
        if (nextBtn) nextBtn.textContent = "★ PLAY AGAIN";
      } else {
        if (titleEl) titleEl.textContent = "LEVEL COMPLETED!";
        if (subEl)   subEl.textContent   = "Dungeon floor " + (levelIndex + 1) + " cleared!";
        if (nextBtn) nextBtn.textContent = "⚡ NEXT LEVEL";
      }
    }
  }

  if (typeof soundSystem !== 'undefined' && soundSystem) {
    soundSystem.updateUI();
  }
}

/* ================= STATE ================= */
let levelIndex = 0;
let gameOver   = false;
let levelWin   = false;
let finalWin   = false;
let winTimer   = 0;
let bgX        = 0;
let frameCount = 0;

/* Health & Lives */
let lives              = MAX_LIVES;
let hp                 = MAX_HEALTH;
let isDead             = false;
let invincibilityTimer = 0;

/* Combat */
let playerSpells  = [];
let shootCooldown = 0;

/* Castle Entering Animation */
let isEnteringCastle = false;
let enterTimer       = 0;
let castleDoorOpen   = 0;

/* Fade-to-black transition */
let fadeAlpha    = 0;
let fadingOut    = false;
let fadingIn     = false;
let fadeCallback = null;

/* Screen Shake */
let shakeTime = 0;
let shakeX = 0, shakeY = 0;

/* Trails, fireworks */
let playerTrails = [];
let fireworks    = [];

/* Background runes */
let runes = [];
for (let i = 0; i < 14; i++) {
  runes.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size:  14 + Math.random() * 18,
    alpha: 0.05 + Math.random() * 0.12,
    speed: 0.15 + Math.random() * 0.3,
    symbol: ["✦","✧","⬡","◈","⟡","⋆","✺","❋","⌖","⊕","⌘","⍟","☽","⚡"][i % 14]
  });
}

/* ================= ASSET PRELOADER & RESILIENCE ================= */
const ASSET_PATHS = {
  bg:     "assets/bg.png",
  wizard: "assets/wizard.png",
  block:  "assets/block.png",
  spike:  "assets/spike.png",
  castle: "assets/castle.png",
  dragon: "assets/dragon.png"
};

const images = {};
let assetsLoaded = 0;
const totalAssets = Object.keys(ASSET_PATHS).length;
let isLoaded = false;

function createProceduralDragonFallback() {
  const c = document.createElement("canvas");
  c.width = 120; c.height = 100;
  const cx = c.getContext("2d");
  cx.fillStyle = "#8a2be2";
  cx.beginPath();
  cx.ellipse(60, 50, 40, 25, 0, 0, Math.PI * 2);
  cx.fill();
  cx.fillStyle = "#ba55d3";
  cx.beginPath();
  cx.moveTo(40, 40); cx.lineTo(15, 10); cx.lineTo(45, 25); cx.lineTo(25, 5); cx.lineTo(65, 35);
  cx.closePath(); cx.fill();
  cx.fillStyle = "#ffd700";
  cx.beginPath(); cx.arc(85, 45, 5, 0, Math.PI * 2); cx.fill();
  cx.fillStyle = "#ff4500";
  cx.beginPath(); cx.arc(87, 45, 2.5, 0, Math.PI * 2); cx.fill();
  return c;
}

function preloadAssets(onComplete) {
  const entries = Object.entries(ASSET_PATHS);
  let count = 0;

  entries.forEach(([key, path]) => {
    const img = new Image();
    img.src = path;
    img.onload = () => {
      images[key] = img;
      count++;
      assetsLoaded = count;
      if (count === totalAssets) {
        isLoaded = true;
        onComplete();
      }
    };
    img.onerror = () => {
      console.warn(`[AssetLoader] Could not load ${path}. Using fallback.`);
      if (key === "dragon") {
        images[key] = createProceduralDragonFallback();
      } else {
        const fallback = document.createElement("canvas");
        fallback.width = 64; fallback.height = 64;
        const fcx = fallback.getContext("2d");
        fcx.fillStyle = key === "spike" ? "#ff4444" : "#6a5acd";
        fcx.fillRect(0, 0, 64, 64);
        images[key] = fallback;
      }
      count++;
      assetsLoaded = count;
      if (count === totalAssets) {
        isLoaded = true;
        onComplete();
      }
    };
  });
}

let para1X = 0, para2X = 0;

/* ================= AUDIO & SOUND SYSTEM (PHASE 2C) ================= */
class SoundSystem {
  constructor() {
    this.musicVolume = 0.5;
    this.sfxVolume   = 0.7;
    this.isMuted     = false;

    this.audioCtx    = null;
    this.masterGain  = null;
    this.musicGain   = null;
    this.sfxGain     = null;
    this.compressor  = null;
    this.isUnlocked  = false;
    this.noiseBuffer = null;

    /* Procedural BGM state */
    this.bgmTimer        = null;
    this.bgmStep         = 0;
    this.bgmIsPlaying    = false;
    this.bgmNextNoteTime = 0;

    /* Audio files mapping */
    this.audioFiles = {
      bgm:        "assets/music.mp3",
      jump:       "assets/jump.mp3",
      land:       "assets/land.mp3",
      shoot:      "assets/shoot.mp3",
      enemyHit:   "assets/enemy_hit.mp3",
      enemyDeath: "assets/enemy_death.mp3",
      damage:     "assets/hurt.mp3",
      death:      "assets/death.mp3",
      castle:     "assets/castle.mp3",
      levelWin:   "assets/win.mp3",
      finalWin:   "assets/victory.mp3"
    };

    this.audioElements = {};
    this.fileLoaded    = {};

    /* Prevent sound stacking: track last played timestamps */
    this.lastPlayTimes = {};
    this.minIntervals = {
      jump:       70,
      land:       100,
      shoot:      50,
      enemyHit:   50,
      enemyDeath: 250,
      damage:     120,
      death:      500,
      castle:     500,
      levelWin:   500,
      finalWin:   1000
    };

    /* Initialize file instances safely */
    this.initAudioElements();
  }

  initAudioElements() {
    if (typeof Audio === 'undefined') return;
    Object.entries(this.audioFiles).forEach(([name, path]) => {
      try {
        const audio = new Audio();
        audio.preload = "auto";
        audio.src = path;
        if (name === "bgm") {
          audio.loop = true;
        }
        audio.addEventListener("canplaythrough", () => {
          this.fileLoaded[name] = true;
        }, { once: true });
        audio.addEventListener("error", () => {
          this.fileLoaded[name] = false;
        });
        this.audioElements[name] = audio;
      } catch (e) {
        this.fileLoaded[name] = false;
      }
    });
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.setupGraph();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  setupGraph() {
    if (!this.audioCtx) return;

    // Master Gain
    this.masterGain = this.audioCtx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioCtx.currentTime);

    // Dynamics compressor to prevent clipping / distortion when multiple sounds trigger
    this.compressor = this.audioCtx.createDynamicsCompressor();
    this.compressor.threshold.setValueAtTime(-12, this.audioCtx.currentTime);
    this.compressor.knee.setValueAtTime(24, this.audioCtx.currentTime);
    this.compressor.ratio.setValueAtTime(12, this.audioCtx.currentTime);
    this.compressor.attack.setValueAtTime(0.003, this.audioCtx.currentTime);
    this.compressor.release.setValueAtTime(0.2, this.audioCtx.currentTime);

    // Music & SFX Gain nodes
    this.musicGain = this.audioCtx.createGain();
    this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioCtx.currentTime);

    this.sfxGain = this.audioCtx.createGain();
    this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);

    // Node graph:
    // musicGain -> masterGain -> destination
    // sfxGain -> compressor -> masterGain -> destination
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.compressor);
    this.compressor.connect(this.masterGain);
    this.masterGain.connect(this.audioCtx.destination);
  }

  unlock() {
    this.getAudioContext();
    if (!this.isUnlocked) {
      this.isUnlocked = true;
      this.startBGM();
    }
  }

  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1, this.audioCtx.currentTime);
    }
    // Also sync HTMLAudioElements
    Object.values(this.audioElements).forEach(el => {
      if (el) el.muted = this.isMuted;
    });
    this.updateUI();
  }

  toggleMute() {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  setMusicVolume(vol) {
    this.musicVolume = Math.max(0, Math.min(1, Math.round(vol * 100) / 100));
    if (this.musicGain && this.audioCtx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.audioCtx.currentTime);
    }
    if (this.audioElements.bgm) {
      this.audioElements.bgm.volume = this.musicVolume;
    }
    this.updateUI();
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, Math.round(vol * 100) / 100));
    if (this.sfxGain && this.audioCtx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.audioCtx.currentTime);
    }
    Object.entries(this.audioElements).forEach(([name, el]) => {
      if (name !== "bgm" && el) {
        el.volume = this.sfxVolume;
      }
    });
    this.updateUI();
  }

  updateUI() {
    if (typeof document === 'undefined') return;
    const muteBtn  = document.getElementById("audioMuteBtn");
    const muteIcon = document.getElementById("muteIcon");
    const muteText = document.getElementById("muteText");
    const musicSlider = document.getElementById("musicVol");
    const musicVal    = document.getElementById("musicVolVal");
    const sfxSlider   = document.getElementById("sfxVol");
    const sfxVal      = document.getElementById("sfxVolVal");

    const smBtn        = document.getElementById("settingsMuteBtn");
    const smIcon       = document.getElementById("settingsMuteIcon");
    const smText       = document.getElementById("settingsMuteText");
    const sMusicSlider = document.getElementById("settingsMusicVol");
    const sMusicVal    = document.getElementById("settingsMusicVal");
    const sSfxSlider   = document.getElementById("settingsSfxVol");
    const sSfxVal      = document.getElementById("settingsSfxVal");

    const musicPct = Math.round(this.musicVolume * 100);
    const sfxPct   = Math.round(this.sfxVolume * 100);

    if (muteBtn) {
      if (this.isMuted) {
        muteBtn.classList.add("muted");
        if (muteIcon) muteIcon.textContent = "🔇";
        if (muteText) muteText.textContent = "Muted";
      } else {
        muteBtn.classList.remove("muted");
        if (muteIcon) muteIcon.textContent = "🔊";
        if (muteText) muteText.textContent = "Audio";
      }
    }
    if (smBtn) {
      if (this.isMuted) {
        if (smIcon) smIcon.textContent = "🔇";
        if (smText) smText.textContent = "Unmute";
      } else {
        if (smIcon) smIcon.textContent = "🔊";
        if (smText) smText.textContent = "Mute";
      }
    }

    if (musicSlider)  musicSlider.value  = musicPct;
    if (musicVal)     musicVal.textContent = musicPct + "%";
    if (sMusicSlider) sMusicSlider.value = musicPct;
    if (sMusicVal)    sMusicVal.textContent = musicPct + "%";

    if (sfxSlider)    sfxSlider.value    = sfxPct;
    if (sfxVal)       sfxVal.textContent   = sfxPct + "%";
    if (sSfxSlider)   sSfxSlider.value   = sfxPct;
    if (sSfxVal)      sSfxVal.textContent  = sfxPct + "%";
  }

  /* ================= BACKGROUND MUSIC ================= */
  startBGM() {
    if (this.bgmIsPlaying) return;
    this.bgmIsPlaying = true;

    // Try HTMLAudioElement first if available
    const bgmEl = this.audioElements.bgm;
    if (bgmEl && this.fileLoaded.bgm) {
      bgmEl.volume = this.musicVolume;
      bgmEl.muted = this.isMuted;
      bgmEl.play().catch(() => {
        this.startProceduralBGM();
      });
    } else {
      this.startProceduralBGM();
    }
  }

  stopBGM() {
    this.bgmIsPlaying = false;
    if (this.audioElements.bgm) {
      try { this.audioElements.bgm.pause(); } catch(e) {}
    }
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  /* Procedural Retro Dungeon BGM Generator (Web Audio Fallback) */
  startProceduralBGM() {
    if (this.bgmTimer) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.bgmStep = 0;
    this.bgmNextNoteTime = ctx.currentTime + 0.05;

    // D minor scales and harmonies
    const bassNotes = [
      146.83, 146.83, 146.83, 146.83, 174.61, 174.61, 130.81, 130.81,
      146.83, 146.83, 196.00, 196.00, 220.00, 196.00, 174.61, 164.81
    ];
    const arpNotes = [
      293.66, 349.23, 440.00, 523.25, 440.00, 349.23, 392.00, 440.00,
      293.66, 349.23, 440.00, 587.33, 523.25, 440.00, 349.23, 329.63
    ];
    const leadNotes = [
      587.33, 0, 523.25, 0, 440.00, 0, 349.23, 392.00,
      440.00, 0, 523.25, 587.33, 659.25, 0, 587.33, 0
    ];

    const stepDuration = 0.14; // ~107 BPM 16th-note groove

    const scheduleStep = () => {
      if (!this.bgmIsPlaying) return;
      const now = ctx.currentTime;

      while (this.bgmNextNoteTime < now + 0.25) {
        const t = this.bgmNextNoteTime;
        const step = this.bgmStep;

        // 1. Bass voice (Triangle wave with lowpass)
        const bassFreq = bassNotes[step % bassNotes.length];
        if (bassFreq > 0) {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = "triangle";
            osc.frequency.setValueAtTime(bassFreq * 0.5, t);

            filter.type = "lowpass";
            filter.frequency.setValueAtTime(320, t);

            gain.gain.setValueAtTime(0.22, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.95);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + stepDuration * 0.95);
          } catch(e) {}
        }

        // 2. Arpeggio voice (soft pulse/sine with bandpass)
        const arpFreq = arpNotes[step % arpNotes.length];
        if (arpFreq > 0 && (step % 2 === 0 || step % 4 === 1)) {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = "sine";
            osc.frequency.setValueAtTime(arpFreq, t);

            filter.type = "bandpass";
            filter.frequency.setValueAtTime(arpFreq * 1.5, t);
            filter.Q.setValueAtTime(2, t);

            gain.gain.setValueAtTime(0.09, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.8);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + stepDuration * 0.8);
          } catch(e) {}
        }

        // 3. Lead voice (Mellow sawtooth melody with gentle filter sweep)
        const leadFreq = leadNotes[Math.floor(step / 2) % leadNotes.length];
        if (leadFreq > 0 && step % 2 === 0) {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(leadFreq, t);

            const lpf = ctx.createBiquadFilter();
            lpf.type = "lowpass";
            lpf.frequency.setValueAtTime(800, t);
            lpf.frequency.linearRampToValueAtTime(300, t + stepDuration * 1.8);

            gain.gain.setValueAtTime(0.06, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 1.8);

            osc.connect(lpf);
            lpf.connect(gain);
            gain.connect(this.musicGain);

            osc.start(t);
            osc.stop(t + stepDuration * 1.8);
          } catch(e) {}
        }

        this.bgmNextNoteTime += stepDuration;
        this.bgmStep++;
      }
    };

    this.bgmTimer = setInterval(scheduleStep, 50);
  }

  /* ================= SFX PLAYBACK & FALLBACKS ================= */
  play(name) {
    // 1. Check sound stacking throttle
    const now = Date.now();
    const minInt = this.minIntervals[name] || 50;
    if (this.lastPlayTimes[name] && (now - this.lastPlayTimes[name] < minInt)) {
      return; // Prevent excessive rapid stacking
    }
    this.lastPlayTimes[name] = now;

    // Ensure audio graph is ready
    this.getAudioContext();

    // 2. If audio file is verified loaded, try HTML5 Audio
    if (this.fileLoaded[name] && this.audioElements[name]) {
      try {
        const audioClone = this.audioElements[name].cloneNode();
        audioClone.volume = this.sfxVolume;
        audioClone.muted = this.isMuted;
        audioClone.play().catch(() => {
          this.playSynthSFX(name);
        });
        return;
      } catch (e) {
        // Fall through to synth
      }
    }

    // 3. Web Audio procedural synth fallback
    this.playSynthSFX(name);
  }

  getNoiseBuffer(ctx) {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = Math.floor(ctx.sampleRate * 0.6);
    this.noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return this.noiseBuffer;
  }

  playSynthSFX(name) {
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const dest = this.sfxGain;

    try {
      switch (name) {
        case "jump": {
          // Snappy rising pitch sweep (170Hz -> 500Hz)
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(170, now);
          osc.frequency.exponentialRampToValueAtTime(500, now + 0.12);

          gain.gain.setValueAtTime(0.3, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.12);
          break;
        }

        case "land": {
          // Low thump + subtle noise impact
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + 0.09);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.09);

          // Noise puff
          const noise = ctx.createBufferSource();
          noise.buffer = this.getNoiseBuffer(ctx);
          const nFilter = ctx.createBiquadFilter();
          nFilter.type = "lowpass";
          nFilter.frequency.setValueAtTime(260, now);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.18, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

          noise.connect(nFilter);
          nFilter.connect(nGain);
          nGain.connect(dest);
          noise.start(now);
          noise.stop(now + 0.07);
          break;
        }

        case "shoot": {
          // Magical energy bolt (high chirp down-sweep with overtone)
          const osc1 = ctx.createOscillator();
          const gain1 = ctx.createGain();
          osc1.type = "sawtooth";
          osc1.frequency.setValueAtTime(880, now);
          osc1.frequency.exponentialRampToValueAtTime(220, now + 0.14);

          const lpf = ctx.createBiquadFilter();
          lpf.type = "lowpass";
          lpf.frequency.setValueAtTime(1600, now);
          lpf.frequency.exponentialRampToValueAtTime(400, now + 0.14);

          gain1.gain.setValueAtTime(0.25, now);
          gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

          osc1.connect(lpf);
          lpf.connect(gain1);
          gain1.connect(dest);
          osc1.start(now);
          osc1.stop(now + 0.14);

          // High harmonic sparkle
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.type = "sine";
          osc2.frequency.setValueAtTime(1760, now);
          osc2.frequency.exponentialRampToValueAtTime(580, now + 0.1);

          gain2.gain.setValueAtTime(0.18, now);
          gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

          osc2.connect(gain2);
          gain2.connect(dest);
          osc2.start(now);
          osc2.stop(now + 0.1);
          break;
        }

        case "enemyHit": {
          // Punchy square wave crunch + spark burst
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.setValueAtTime(280, now);
          osc.frequency.exponentialRampToValueAtTime(75, now + 0.09);

          gain.gain.setValueAtTime(0.28, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.09);

          // Impact noise click
          const noise = ctx.createBufferSource();
          noise.buffer = this.getNoiseBuffer(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = "bandpass";
          filter.frequency.setValueAtTime(1400, now);
          filter.Q.setValueAtTime(2, now);
          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.2, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(dest);
          noise.start(now);
          noise.stop(now + 0.06);
          break;
        }

        case "enemyDeath": {
          // Dragon explosion & deep rumble roar
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(420, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.45);

          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.45);

          // Explosion burst
          const noise = ctx.createBufferSource();
          noise.buffer = this.getNoiseBuffer(ctx);
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(700, now);
          filter.frequency.linearRampToValueAtTime(90, now + 0.55);

          const nGain = ctx.createGain();
          nGain.gain.setValueAtTime(0.38, now);
          nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

          noise.connect(filter);
          filter.connect(nGain);
          nGain.connect(dest);
          noise.start(now);
          noise.stop(now + 0.55);
          break;
        }

        case "damage": {
          // Player hurt: descending buzz with fast tremolo
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(340, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.2);

          gain.gain.setValueAtTime(0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gain);
          gain.connect(dest);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case "death": {
          // Player death: dramatic 4-note falling minor cadence
          const deathPitches = [329.63, 261.63, 196.00, 130.81]; // E4, C4, G3, C3
          deathPitches.forEach((freq, i) => {
            const t = now + i * 0.11;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq * 0.85, t + 0.22);

            gain.gain.setValueAtTime(0.3, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(t);
            osc.stop(t + 0.22);
          });
          break;
        }

        case "castle":
        case "levelWin": {
          // Triumphant ascending arpeggio fanfare
          const winNotes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
          winNotes.forEach((freq, i) => {
            const t = now + i * 0.08;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.24, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(t);
            osc.stop(t + 0.35);
          });

          // Sustained chord on last note
          const tChord = now + 0.48;
          [523.25, 659.25, 783.99, 1046.50].forEach(f => {
            const cOsc = ctx.createOscillator();
            const cGain = ctx.createGain();
            cOsc.type = "sine";
            cOsc.frequency.setValueAtTime(f, tChord);
            cGain.gain.setValueAtTime(0.15, tChord);
            cGain.gain.exponentialRampToValueAtTime(0.001, tChord + 0.6);

            cOsc.connect(cGain);
            cGain.connect(dest);
            cOsc.start(tChord);
            cOsc.stop(tChord + 0.6);
          });
          break;
        }

        case "finalWin": {
          // Dungeon cleared grand victory fanfare
          const victoryMelody = [
            { f: 392.00, d: 0.12 },
            { f: 523.25, d: 0.12 },
            { f: 659.25, d: 0.12 },
            { f: 783.99, d: 0.24 },
            { f: 659.25, d: 0.12 },
            { f: 783.99, d: 0.12 },
            { f: 1046.50, d: 0.6 }
          ];
          let curT = now;
          victoryMelody.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(note.f, curT);

            gain.gain.setValueAtTime(0.28, curT);
            gain.gain.exponentialRampToValueAtTime(0.001, curT + note.d * 1.5);

            osc.connect(gain);
            gain.connect(dest);
            osc.start(curT);
            osc.stop(curT + note.d * 1.5);
            curT += note.d;
          });
          break;
        }

        default:
          break;
      }
    } catch (e) {
      // Audio node failure safety
    }
  }
}

const soundSystem = new SoundSystem();

function unlockAudio() {
  soundSystem.unlock();
}
window.addEventListener("keydown", unlockAudio);
window.addEventListener("touchstart", unlockAudio, { passive: true });
window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("click", unlockAudio);

/* ================= PLAYER OBJECT ================= */
const player = {
  x: 0,
  y: 0,
  w: PLAYER_CONFIG.w,
  h: PLAYER_CONFIG.h,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: true,
  standingPlatform: null,
  /* Phase 2A feel state */
  coyoteTimer: 0,    // counts down after leaving ground — allows late jumps
  jumpBuffer:  0,    // counts down after Space pressed in air — fires on next landing
  jumpHeld:    false, // true while jump key is held during the upward arc
  wasJumping:  false  // previous-frame Space state for rising-edge detection
};

/* ================= PARTICLES ================= */
let particles = [];
function spawnParticles(x, y, color, count=10, speed=2, life=40, size=3) {
  for (let i=0; i<count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const mag   = Math.random() * speed;
    particles.push({
      x, y,
      vx: Math.cos(angle)*mag, vy: Math.sin(angle)*mag,
      life: life + Math.random()*20, maxLife: life+20,
      color, size: Math.random()*size+1
    });
  }
}
function spark(x,y)      { spawnParticles(x,y,"gold",8,5,50,4); }
function magicSpark(x,y) { spawnParticles(x,y,"cyan",3,2,60,3); }
function lavaParticle(x,y) { spawnParticles(x, y, "#ff4500", 2, 2, 30, 3); }

/* ================= FIREWORKS ================= */
function spawnFirework(x,y) {
  const hue = Math.floor(Math.random()*360);
  for (let i=0; i<70; i++) {
    const angle = (i/70)*Math.PI*2, spd=3+Math.random()*6;
    fireworks.push({
      x, y,
      vx: Math.cos(angle)*spd,
      vy: Math.sin(angle)*spd-1,
      life: 90+Math.random()*40,
      maxLife: 130,
      color: `hsl(${hue+Math.random()*40},100%,65%)`,
      size: 3+Math.random()*3,
      gravity: 0.08
    });
  }
}

/* ================= FADE ================= */
function startFade(callback) {
  fadingOut=true; fadeAlpha=0; fadeCallback=callback;
}

/* ================= 2.5D DARK FANTASY VISUAL & LIGHTING SYSTEM (PHASE 2) ================= */
// Ambient atmospheric floating embers and spores
const ATMOSPHERE_CONFIG = {
  emberCount: 45,
  fogLayers: 3
};

let atmosphericEmbers = [];
function initAtmosphere() {
  atmosphericEmbers = [];
  for (let i = 0; i < ATMOSPHERE_CONFIG.emberCount; i++) {
    atmosphericEmbers.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.4) * 0.45,
      vy: -(Math.random() * 0.55 + 0.25),
      alpha: Math.random() * 0.6 + 0.2,
      baseAlpha: Math.random() * 0.6 + 0.2,
      pulseSpeed: Math.random() * 0.05 + 0.02,
      hue: Math.random() > 0.35 ? (Math.random() * 25 + 15) : (Math.random() * 40 + 260) // fiery orange or arcane violet
    });
  }
}
initAtmosphere();

function updateAtmosphere() {
  for (let i = 0; i < atmosphericEmbers.length; i++) {
    const e = atmosphericEmbers[i];
    e.x += e.vx + Math.sin(frameCount * 0.02 + i) * 0.2;
    e.y += e.vy;
    e.alpha = e.baseAlpha * (0.65 + 0.35 * Math.sin(frameCount * e.pulseSpeed + i));

    if (e.y < -10) {
      e.y = canvas.height + 10;
      e.x = Math.random() * canvas.width;
    }
    if (e.x < -10) e.x = canvas.width + 10;
    if (e.x > canvas.width + 10) e.x = -10;
  }
}

// Lighting Map: collects light sources each frame and renders a soft additive lighting pass
const lightSources = [];
function addLight(x, y, radius, color, intensity=1.0) {
  lightSources.push({ x, y, radius, color, intensity });
}

function renderLightingPass() {
  if (lightSources.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < lightSources.length; i++) {
    const l = lightSources[i];
    const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
    grad.addColorStop(0, l.color);
    grad.addColorStop(0.4, l.color.replace(/[\d\.]+\)$/, (m) => (parseFloat(m) * 0.45).toFixed(3) + ")"));
    grad.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  lightSources.length = 0; // reset for next frame
}

// Cinematic Vignette & Atmospheric Fog Overlay
function drawDarkFantasyVignette() {
  ctx.save();
  // Deep peripheral vignette
  const vig = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, canvas.width * 0.32,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.72
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(0.65, "rgba(4, 3, 10, 0.45)");
  vig.addColorStop(1, "rgba(2, 1, 6, 0.88)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle cold gothic color grade wash
  ctx.globalCompositeOperation = "color-burn";
  ctx.fillStyle = "rgba(10, 15, 30, 0.12)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawAtmosphericEmbers() {
  ctx.save();
  for (let i = 0; i < atmosphericEmbers.length; i++) {
    const e = atmosphericEmbers[i];
    ctx.fillStyle = `hsla(${e.hue}, 100%, 65%, ${e.alpha})`;
    ctx.shadowColor = `hsla(${e.hue}, 100%, 55%, 0.7)`;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ================= OBJECTS & CLASSES ================= */
let blocks=[], spikes=[], castle={}, fireballs=[];
let hasLava = false;

const dragonObj = {
  x:0, y:0, baseY:0, w:120, h:100,
  minX:0, maxX:0, moveSpeed:0, moveDir:-1,
  dir:-1, attackTimer:0, active:false,
  fireRate:120, hp:3, hitTimer: 0
};

class Fireball {
  constructor(x,y,dir) {
    this.x=x; this.y=y; this.w=25; this.h=25;
    this.vx=dir*6; this.life=120;
  }
  update() {
    this.x+=this.vx; this.life--;
    if (frameCount%3===0)
      spawnParticles(this.x+12,this.y+12,"#ff8c00",3,2,20,3);
  }
  draw() {
    ctx.save();
    ctx.shadowColor="#ff4500"; ctx.shadowBlur=20;
    ctx.fillStyle="#ff4500";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,12,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle="#ffd700";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,6,0,Math.PI*2); ctx.fill();
    ctx.fillStyle="white";
    ctx.beginPath(); ctx.arc(this.x+12,this.y+12,2.5,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

class PlayerSpell {
  constructor(x,y,dir) {
    this.x=x; this.y=y; this.w=15; this.h=15;
    this.vx=dir*14; this.life=50;
  }
  update() {
    this.x+=this.vx; this.life--;
    if (frameCount%2===0) magicSpark(this.x+8,this.y+8);
  }
  draw() {
    ctx.save();
    ctx.shadowColor="cyan"; ctx.shadowBlur=18;
    ctx.fillStyle="white";
    ctx.beginPath(); ctx.arc(this.x+8,this.y+8,6,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}

/* ================= LEVEL DATA ================= */
const levels = [
  /* === LEVEL 1 === */
  {
    start:{x:40,y:420},
    blocks:[
      {x:0,  y:500,w:960,h:40, type:'static'},
      {x:300,y:430,w:160,h:30, type:'static'},
      {x:600,y:360,w:160,h:30, type:'moving',vx:2,minX:550,maxX:750}
    ],
    spikes:[{x:420,y:470,w:40,h:30}],
    castle:{x:820,y:170,w:130,h:160},
    dragon:{x:720,y:240,active:true,hp:3,fireRate:120, minX:650, maxX:750, moveSpeed: 1.5},
    hasLava:false
  },
  /* === LEVEL 2 === */
  {
    start:{x:40,y:420},
    blocks:[
      {x:0,  y:500,w:200,h:40, type:'static'},
      {x:260,y:430,w:120,h:30, type:'moving',vy:2,minY:300,maxY:430},
      {x:450,y:350,w:120,h:30, type:'static'},
      {x:650,y:280,w:120,h:30, type:'static'}
    ],
    spikes:[
      {x:200,y:500,w:100,h:30},
      {x:500,y:500,w:100,h:30}
    ],
    castle:{x:820,y:100,w:130,h:160},
    dragon:{x:730,y:180,active:true,hp:4,fireRate:100, minX:600, maxX:750, moveSpeed: 2.5},
    hasLava:true
  },
  /* === LEVEL 3 === */
  {
    start:{x:20,y:450},
    blocks:[
      {x:0,  y:520,w:150,h:30, type:'static'},
      {x:200,y:450,w:100,h:25, type:'moving',vx:3,minX:200,maxX:400},
      {x:360,y:350,w:100,h:25, type:'static'},
      {x:520,y:250,w:100,h:25, type:'moving',vy:-2,minY:150,maxY:350},
      {x:700,y:180,w:200,h:30, type:'static'}
    ],
    spikes:[{x:150,y:520,w:450,h:30}],
    castle:{x:820,y:40,w:130,h:160},
    dragon:{x:730,y:100,active:true,hp:5,fireRate:80, minX:630, maxX:800, moveSpeed: 3.5},
    hasLava:true
  },
  /* === LEVEL 4 — THE INFERNO DUNGEON === */
  {
    start:{x:20,y:350},
    blocks:[
      {x:0,  y:460,w:110,h:30, type:'static'},
      {x:180,y:400,w:90, h:25, type:'moving',vx:3,minX:150,maxX:330},
      {x:380,y:340,w:70, h:25, type:'static'},
      {x:490,y:280,w:130,h:25, type:'static'},
      {x:670,y:300,w:80, h:25, type:'moving',vy:4,minY:180,maxY:370},
      {x:780,y:200,w:70, h:25, type:'static'},
      {x:650,y:120,w:100,h:25, type:'moving',vx:4,minX:550,maxX:760},
      {x:820,y:80, w:140,h:30, type:'static'}
    ],
    spikes:[
      {x:290,y:432,w:60,h:28},
      {x:430,y:312,w:40,h:28},
    ],
    castle:{x:820,y:-80,w:140,h:160},
    dragon:{x:700,y:40, active:true, hp:6, fireRate:70, minX:550, maxX:820, moveSpeed: 4},
    hasLava:true
  }
];

function loadLevel(i) {
  if (i >= levels.length) { finalWin=true; levelWin=false; soundSystem.play("finalWin"); return; }
  const l = levels[i];
  // Spread block data and inject runtime fields.
  // collision defaults to COLLISION_ONE_WAY — all existing platforms are top-surface only.
  blocks   = l.blocks.map(b => ({
    ...b,
    ox: b.x, oy: b.y,
    dir: 1, deltaX: 0, deltaY: 0,
    collision: b.collision || COLLISION_ONE_WAY
  }));
  spikes   = l.spikes;
  castle   = l.castle;
  hasLava  = l.hasLava || false;

  if (l.dragon) {
    dragonObj.x=l.dragon.x; dragonObj.y=l.dragon.y;
    dragonObj.baseY=l.dragon.y; dragonObj.active=l.dragon.active;
    dragonObj.fireRate=l.dragon.fireRate || 120;
    dragonObj.minX=l.dragon.minX || l.dragon.x;
    dragonObj.maxX=l.dragon.maxX || l.dragon.x;
    dragonObj.moveSpeed=l.dragon.moveSpeed || 0;
    dragonObj.moveDir=-1;
    dragonObj.attackTimer=0;
    dragonObj.hp=l.dragon.hp || 3;
    dragonObj.hitTimer=0;
  } else { dragonObj.active=false; }

  fireballs=[]; particles=[]; playerTrails=[]; fireworks=[]; playerSpells=[];

  /* Reset Player Combat & Positioning */
  player.x=l.start.x; player.y=l.start.y; player.vx=0; player.vy=0;
  player.standingPlatform = null;
  player.onGround = false;
  /* Phase 2A: reset feel state */
  player.coyoteTimer = 0;
  player.jumpBuffer  = 0;
  player.jumpHeld    = false;
  player.wasJumping  = false;

  hp = MAX_HEALTH;
  invincibilityTimer = 0;
  shootCooldown = 0;

  gameOver=false; levelWin=false; winTimer=0;
  isEnteringCastle=false; enterTimer=0; castleDoorOpen=0;
  isDead=false;
}

function die() {
  if (isDead) return;
  isDead = true;
  lives--;
  soundSystem.play("death");
  triggerShake();

  if (lives <= 0) {
    gameOver = true;
    setGameState(GAME_STATES.GAME_OVER);
  } else {
    startFade(() => { loadLevel(levelIndex); });
  }
}

function damagePlayer() {
  if (invincibilityTimer > 0 || isDead || isEnteringCastle) return;
  hp--;
  invincibilityTimer = 90; // 1.5s iFrames
  triggerShake(12, 6);
  spawnParticles(player.x + player.w/2, player.y + player.h/2, "#ff0000", 12, 4, 30, 4);
  soundSystem.play("damage");

  // Knockback!
  const kbDir = player.facing ? -1 : 1;
  player.vx = kbDir * 6;
  player.vy = -6;
  player.standingPlatform = null;
  player.onGround = false;

  if (hp <= 0) {
     die();
  }
}

/* ================= INPUT ================= */
const keys={};
window.addEventListener("keydown", e => {
  soundSystem.unlock();

  /* State Navigation Hotkeys */
  if (e.code === "Escape" || e.code === "KeyP") {
    if (gameState === GAME_STATES.PLAYING) {
      setGameState(GAME_STATES.PAUSED);
      return;
    } else if (gameState === GAME_STATES.PAUSED) {
      setGameState(GAME_STATES.PLAYING);
      return;
    } else if (gameState === GAME_STATES.SETTINGS) {
      setGameState(previousState || GAME_STATES.MAIN_MENU);
      return;
    } else if (gameState === "LEVEL_SELECT") {
      setGameState(GAME_STATES.MAIN_MENU);
      return;
    }
  }

  if (e.code === "KeyR") {
    if (gameState === GAME_STATES.GAME_OVER) {
      lives = MAX_LIVES;
      hp = MAX_HEALTH;
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
      return;
    } else if (gameState === GAME_STATES.PAUSED) {
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
      return;
    }
  }

  if (e.code === "Enter" || e.code === "Space") {
    if (gameState === GAME_STATES.MAIN_MENU) {
      levelIndex = 0;
      loadLevel(0);
      setGameState(GAME_STATES.PLAYING);
      return;
    } else if (gameState === GAME_STATES.GAME_OVER) {
      lives = MAX_LIVES;
      hp = MAX_HEALTH;
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
      return;
    } else if (gameState === GAME_STATES.LEVEL_COMPLETE) {
      if (levelIndex >= levels.length - 1) {
        levelIndex = 0;
        loadLevel(0);
        setGameState(GAME_STATES.PLAYING);
      } else {
        levelIndex++;
        loadLevel(levelIndex);
        setGameState(GAME_STATES.PLAYING);
      }
      return;
    }
  }

  if (e.code === "KeyM") {
    soundSystem.toggleMute();
  } else if (e.code === "BracketLeft") {
    soundSystem.setMusicVolume(soundSystem.musicVolume - 0.1);
  } else if (e.code === "BracketRight") {
    soundSystem.setMusicVolume(soundSystem.musicVolume + 0.1);
  } else if (e.code === "Minus" || e.code === "NumpadSubtract") {
    soundSystem.setSfxVolume(soundSystem.sfxVolume - 0.1);
  } else if (e.code === "Equal" || e.code === "NumpadAdd") {
    soundSystem.setSfxVolume(soundSystem.sfxVolume + 0.1);
  }

  if (gameState === GAME_STATES.PLAYING) {
    keys[e.code] = true;
  }
});
window.addEventListener("keyup", e => keys[e.code]=false);

/* ================= MOBILE TOUCH LOGIC ================= */
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    const mobileUI = document.getElementById("mobileUI");
    if (mobileUI) mobileUI.style.display = "flex";
}

let lastTapTime = 0;
window.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    if (tapLength < 400 && tapLength > 0) {
        if (gameOver) { lives=MAX_LIVES; loadLevel(levelIndex); gameOver=false; }
        else if (finalWin) { levelIndex=0; finalWin=false; lives=MAX_LIVES; loadLevel(0); }
    }
    lastTapTime = currentTime;
});

const bindBtn = (id, code) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const press = (e) => {
        soundSystem.unlock();
        if(e.cancelable) e.preventDefault();
        keys[code] = true;
    };
    const release = (e) => {
        if(e.cancelable) e.preventDefault();
        keys[code] = false;
    };
    btn.addEventListener("touchstart", press, {passive: false});
    btn.addEventListener("touchend", release);
    btn.addEventListener("touchcancel", release);
};
bindBtn("btn-left", "ArrowLeft");
bindBtn("btn-right", "ArrowRight");
bindBtn("btn-jump", "Space");
bindBtn("btn-shoot", "KeyZ");

/* Audio Controls DOM Binding & Professional UI System (Phase 3) */
function initUI() {
  // Top-Right Quick Audio Controls
  const muteBtn = document.getElementById("audioMuteBtn");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      soundSystem.unlock();
      soundSystem.toggleMute();
      muteBtn.blur();
    });
  }
  const musicSlider = document.getElementById("musicVol");
  if (musicSlider) {
    musicSlider.addEventListener("input", (e) => {
      soundSystem.unlock();
      soundSystem.setMusicVolume(parseFloat(e.target.value) / 100);
    });
  }
  const sfxSlider = document.getElementById("sfxVol");
  if (sfxSlider) {
    sfxSlider.addEventListener("input", (e) => {
      soundSystem.unlock();
      soundSystem.setSfxVolume(parseFloat(e.target.value) / 100);
    });
  }

  // In-Game Pause Button
  const btnInGamePause = document.getElementById("btnInGamePause");
  if (btnInGamePause) {
    btnInGamePause.addEventListener("click", () => {
      soundSystem.unlock();
      if (gameState === GAME_STATES.PLAYING) {
        setGameState(GAME_STATES.PAUSED);
      }
    });
  }

  // Main Menu Buttons
  const btnPlay = document.getElementById("btnPlay");
  if (btnPlay) {
    btnPlay.addEventListener("click", () => {
      soundSystem.unlock();
      levelIndex = 0;
      loadLevel(0);
      setGameState(GAME_STATES.PLAYING);
    });
  }

  const btnLevels = document.getElementById("btnLevels");
  if (btnLevels) {
    btnLevels.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState("LEVEL_SELECT");
    });
  }

  const btnSettings = document.getElementById("btnSettings");
  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      soundSystem.unlock();
      previousState = GAME_STATES.MAIN_MENU;
      setGameState(GAME_STATES.SETTINGS);
    });
  }

  // Level Select Grid Buttons
  const levelBtns = document.querySelectorAll(".level-btn");
  levelBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      soundSystem.unlock();
      const targetLevel = parseInt(btn.getAttribute("data-level")) || 0;
      levelIndex = targetLevel;
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
    });
  });

  const btnLevelSelectBack = document.getElementById("btnLevelSelectBack");
  if (btnLevelSelectBack) {
    btnLevelSelectBack.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState(GAME_STATES.MAIN_MENU);
    });
  }

  // Pause Menu Buttons
  const btnResume = document.getElementById("btnResume");
  if (btnResume) {
    btnResume.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState(GAME_STATES.PLAYING);
    });
  }

  const btnRestart = document.getElementById("btnRestart");
  if (btnRestart) {
    btnRestart.addEventListener("click", () => {
      soundSystem.unlock();
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
    });
  }

  const btnPauseSettings = document.getElementById("btnPauseSettings");
  if (btnPauseSettings) {
    btnPauseSettings.addEventListener("click", () => {
      soundSystem.unlock();
      previousState = GAME_STATES.PAUSED;
      setGameState(GAME_STATES.SETTINGS);
    });
  }

  const btnPauseMainMenu = document.getElementById("btnPauseMainMenu");
  if (btnPauseMainMenu) {
    btnPauseMainMenu.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState(GAME_STATES.MAIN_MENU);
    });
  }

  // Game Over Buttons
  const btnRetry = document.getElementById("btnRetry");
  if (btnRetry) {
    btnRetry.addEventListener("click", () => {
      soundSystem.unlock();
      lives = MAX_LIVES;
      hp = MAX_HEALTH;
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
    });
  }

  const btnGameOverMainMenu = document.getElementById("btnGameOverMainMenu");
  if (btnGameOverMainMenu) {
    btnGameOverMainMenu.addEventListener("click", () => {
      soundSystem.unlock();
      lives = MAX_LIVES;
      hp = MAX_HEALTH;
      setGameState(GAME_STATES.MAIN_MENU);
    });
  }

  // Level Complete Buttons
  const btnNextLevel = document.getElementById("btnNextLevel");
  if (btnNextLevel) {
    btnNextLevel.addEventListener("click", () => {
      soundSystem.unlock();
      if (levelIndex >= levels.length - 1) {
        levelIndex = 0;
        loadLevel(0);
        setGameState(GAME_STATES.PLAYING);
      } else {
        levelIndex++;
        loadLevel(levelIndex);
        setGameState(GAME_STATES.PLAYING);
      }
    });
  }

  const btnReplayLevel = document.getElementById("btnReplayLevel");
  if (btnReplayLevel) {
    btnReplayLevel.addEventListener("click", () => {
      soundSystem.unlock();
      loadLevel(levelIndex);
      setGameState(GAME_STATES.PLAYING);
    });
  }

  const btnLevelCompleteMainMenu = document.getElementById("btnLevelCompleteMainMenu");
  if (btnLevelCompleteMainMenu) {
    btnLevelCompleteMainMenu.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState(GAME_STATES.MAIN_MENU);
    });
  }

  // Settings Screen Controls
  const settingsMusicVol = document.getElementById("settingsMusicVol");
  if (settingsMusicVol) {
    settingsMusicVol.addEventListener("input", (e) => {
      soundSystem.unlock();
      soundSystem.setMusicVolume(parseFloat(e.target.value) / 100);
    });
  }

  const settingsSfxVol = document.getElementById("settingsSfxVol");
  if (settingsSfxVol) {
    settingsSfxVol.addEventListener("input", (e) => {
      soundSystem.unlock();
      soundSystem.setSfxVolume(parseFloat(e.target.value) / 100);
    });
  }

  const settingsMuteBtn = document.getElementById("settingsMuteBtn");
  if (settingsMuteBtn) {
    settingsMuteBtn.addEventListener("click", () => {
      soundSystem.unlock();
      soundSystem.toggleMute();
      settingsMuteBtn.blur();
    });
  }

  const btnSettingsBack = document.getElementById("btnSettingsBack");
  if (btnSettingsBack) {
    btnSettingsBack.addEventListener("click", () => {
      soundSystem.unlock();
      setGameState(previousState || GAME_STATES.MAIN_MENU);
    });
  }
}

/* ================= COLLISION ================= */
const hit = (a, b) => (
  a.x < b.x + b.w && a.x + a.w > b.x &&
  a.y < b.y + b.h && a.y + a.h > b.y
);

/* ================= SCREEN SHAKE ================= */
function triggerShake(dur=14, mag=9) {
  shakeTime=dur;
  shakeX=(Math.random()-0.5)*mag;
  shakeY=(Math.random()-0.5)*mag;
}

/* ================= PHASE 2B: COLLISION RESOLUTION ================= */
/**
 * resolveCollisions()
 *
 * Called once per physics tick, AFTER position integration.
 * Iterates every block and resolves overlap based on its collision type:
 *
 *   COLLISION_ONE_WAY — top surface only (original behavior, unchanged).
 *     The player lands on top when falling AND the previous-frame foot
 *     position was above the surface (with a speed+tolerance margin).
 *     The player passes freely through the bottom and sides.
 *
 *   COLLISION_SOLID — 4-directional MTV resolution.
 *     Computes per-axis overlap. The axis with smaller overlap is the
 *     separating axis → push the player out on that axis only.
 *     Side hit → zero vx.  Top hit → land + onGround.  Bottom hit → zero vy.
 *
 * Moving-platform passenger carry (handled before this call) sets
 * standingPlatform for moving platforms. This function may additionally
 * set it for one-way/solid landing. It is cleared here if no block
 * claims the ground this tick and the passenger system hasn't kept it.
 */
function resolveCollisions() {
  if (isEnteringCastle || isDead) return;

  let foundGround = false;

  blocks.forEach(b => {
    if (!hit(player, b)) return; // early-out — no overlap

    if (b.collision === COLLISION_SOLID) {
      /* ---- 4-directional MTV ---- */
      const overlapL = (player.x + player.w) - b.x;       // penetration from left
      const overlapR = (b.x + b.w) - player.x;             // penetration from right
      const overlapT = (player.y + player.h) - b.y;        // penetration from top
      const overlapB = (b.y + b.h) - player.y;             // penetration from bottom

      const minX = Math.min(overlapL, overlapR);
      const minY = Math.min(overlapT, overlapB);

      if (minX < minY) {
        /* --- Side collision (horizontal axis is shallowest) --- */
        if (overlapL < overlapR) {
          player.x = b.x - player.w;  // push left (hit right face of player)
        } else {
          player.x = b.x + b.w;       // push right (hit left face of player)
        }
        player.vx = 0;

      } else {
        /* --- Vertical collision (vertical axis is shallowest) --- */
        if (overlapT < overlapB) {
          /* Top surface — landing */
          player.y = b.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.standingPlatform = b;
          foundGround = true;
        } else {
          /* Bottom surface — ceiling hit */
          player.y = b.y + b.h;
          if (player.vy < 0) player.vy = 0; // kill upward momentum
        }
      }

    } else {
      /* ---- ONE-WAY: top surface only (original logic, preserved exactly) ---- */
      const platformSpeedY = b.vy ? Math.abs(b.vy) : 0;
      if (player.vy >= 0 && (player.y + player.h - player.vy) <= (b.y + platformSpeedY + 8)) {
        player.y = b.y - player.h;
        player.vy = 0;
        player.onGround = true;
        player.standingPlatform = b;
        foundGround = true;
      }
    }
  });

  /* Ground-state maintenance:
   * 1. If player has a standingPlatform (static or moving), verify whether player is still atop it.
   * 2. If atop the platform surface within horizontal bounds, maintain onGround and foundGround.
   * 3. If player walked off edges or separated, clear static platform so gravity resumes next frame.
   * 4. If no ground contact confirmed, mark player airborne.
   */
  if (player.standingPlatform) {
    const sp = player.standingPlatform;
    const withinBounds = (player.x + player.w > sp.x && player.x < sp.x + sp.w);
    const atSurface = Math.abs((player.y + player.h) - sp.y) <= 2;
    if (withinBounds && atSurface) {
      player.onGround = true;
      foundGround = true;
    } else if (sp.type !== 'moving') {
      player.standingPlatform = null;
    }
  }

  if (!foundGround && !player.standingPlatform) {
    player.onGround = false;
  }
}

/* ================= UPDATE (FIXED TIMESTEP TICK) ================= */
function update() {
  /* Stop gameplay completely when not in PLAYING state */
  if (gameState !== GAME_STATES.PLAYING) {
    return;
  }

  frameCount++;

  /* Parallax */
  bgX   -= CLOUD_SPEED; para1X -= CLOUD_SPEED*0.5; para2X -= CLOUD_SPEED*0.25;
  if (bgX   <= -canvas.width) bgX=0;
  if (para1X<= -canvas.width) para1X=0;
  if (para2X<= -canvas.width) para2X=0;

  if (shakeTime>0) {
    shakeTime--; shakeX=(Math.random()-0.5)*7; shakeY=(Math.random()-0.5)*7;
  } else { shakeX=0; shakeY=0; }

  /* Fade transition logic */
  if (fadingOut) {
    fadeAlpha+=0.05;
    if (fadeAlpha>=1) { fadeAlpha=1; fadingOut=false; fadingIn=true; if(fadeCallback){fadeCallback(); fadeCallback=null;} }
  }
  if (fadingIn) {
    fadeAlpha-=0.05;
    if (fadeAlpha<=0) { fadeAlpha=0; fadingIn=false; }
  }

  /* Rune drift */
  runes.forEach(r => { r.y-=r.speed; if(r.y<-30){r.y=canvas.height+20; r.x=Math.random()*canvas.width;} });

  /* Castle Door ambient sparkles */
  if (!finalWin && frameCount % 6 === 0) {
     spawnParticles(castle.x + 65, castle.y + 110, "cyan", 1, 1, 40, 3);
     spawnParticles(castle.x + 65, castle.y + 110, "gold", 1, 1, 40, 2);
  }

  if (gameOver || finalWin) {
    if (finalWin && frameCount%35===0)
      spawnFirework(150+Math.random()*(canvas.width-300), 50+Math.random()*(canvas.height-150));
    updateFireworks(); updateParticles(); return;
  }

  /* Update Moving Platforms & Track Deltas */
  blocks.forEach(b => {
    if (b.type==='moving') {
      const oldX = b.x;
      const oldY = b.y;

      if (b.vx) { b.x += b.vx * b.dir; if(b.x > b.maxX || b.x < b.minX) b.dir *= -1; }
      if (b.vy) { b.y += b.vy * b.dir; if(b.y > b.maxY || b.y < b.minY) b.dir *= -1; }

      b.deltaX = b.x - oldX;
      b.deltaY = b.y - oldY;
    } else {
      b.deltaX = 0;
      b.deltaY = 0;
    }
  });

  /* Lava particles */
  if (hasLava && frameCount%6===0) {
    lavaParticle(Math.random()*canvas.width, canvas.height-20);
  }

  /* Level Complete Timer */
  if (levelWin) {
    winTimer++;
    if (winTimer>120) { levelWin=false; levelIndex++; startFade(()=>loadLevel(levelIndex)); }
    updateParticles();
    return;
  }

  /* Timers */
  if (invincibilityTimer > 0) invincibilityTimer--;
  if (shootCooldown > 0) shootCooldown--;

  /* Combat mechanics */
  if (keys.KeyZ && shootCooldown <= 0 && !isEnteringCastle && !isDead && !fadingOut) {
      shootCooldown = 28;
      const dir = player.facing ? 1 : -1;
      const sx = player.x + (player.facing ? player.w + 4 : -16);
      const sy = player.y + player.h/2 - 6;
      playerSpells.push(new PlayerSpell(sx, sy, dir));
      soundSystem.play("shoot");
  }

  /* Player Spells vs Dragon */
  for (let i = playerSpells.length - 1; i >= 0; i--) {
      const sp = playerSpells[i];
      sp.update();
      if (dragonObj.active && dragonObj.hp > 0 && hit(sp, {x:dragonObj.x, y:dragonObj.y, w:dragonObj.w, h:dragonObj.h})) {
          dragonObj.hp--;
          dragonObj.hitTimer = 10;
          spark(sp.x+8, sp.y+8);
          playerSpells.splice(i, 1);

          if (dragonObj.hp <= 0) {
              dragonObj.active = false;
              spawnFirework(dragonObj.x+dragonObj.w/2, dragonObj.y+dragonObj.h/2);
              spawnFirework(dragonObj.x, dragonObj.y);
              spawnFirework(dragonObj.x+dragonObj.w, dragonObj.y+dragonObj.h);
              soundSystem.play("enemyDeath");
          } else {
              soundSystem.play("enemyHit");
          }
          continue;
      }
      if (sp.life <= 0 || sp.x < 0 || sp.x > canvas.width) playerSpells.splice(i, 1);
  }

  /* Passenger carriage on moving platforms */
  if (player.standingPlatform && player.standingPlatform.type === 'moving' && !isDead && !isEnteringCastle) {
    const sp = player.standingPlatform;
    player.x += sp.deltaX;
    player.y = sp.y - player.h;
    player.vy = 0;
    player.onGround = true;

    // Check if player walked off edges
    if (player.x + player.w <= sp.x || player.x >= sp.x + sp.w) {
      player.standingPlatform = null;
      player.onGround = false;
    }
  }

  /* Player Input Movement */
  if (!isEnteringCastle && invincibilityTimer < 80) {
      player.vx = 0;
      if (keys.ArrowLeft)  { player.vx = -SPEED; player.facing = false; }
      if (keys.ArrowRight) { player.vx = SPEED;  player.facing = true;  }

      /* --- Rising-edge jump detection (prevents held-key repeat) --- */
      const jumpPressed = keys.Space && !player.wasJumping;
      const jumpHeldNow = !!keys.Space;
      player.wasJumping = jumpHeldNow;

      /* --- Jump buffer: remember a press made in the air --- */
      if (jumpPressed) player.jumpBuffer = JUMP_BUFFER_TIME;
      if (player.jumpBuffer > 0) player.jumpBuffer--;

      /* --- Coyote time: grace period after walking off a ledge --- */
      if (player.onGround) {
        player.coyoteTimer = COYOTE_TIME; // refresh while grounded
      } else if (player.coyoteTimer > 0) {
        player.coyoteTimer--;             // count down in the air
      }

      /* --- Perform jump when buffer is active AND jump window is open --- */
      const canJump = player.coyoteTimer > 0 && !isDead && !fadingOut;
      if (player.jumpBuffer > 0 && canJump) {
        player.vy             = -JUMP;
        player.onGround       = false;
        player.standingPlatform = null;
        player.coyoteTimer    = 0; // consume coyote window — prevents double jump
        player.jumpBuffer     = 0; // consume buffer   — prevents repeated auto-jump
        player.jumpHeld       = true;
        soundSystem.play("jump");
      }

      /* --- Variable jump height: cut upward velocity on early key release --- */
      if (!jumpHeldNow && player.jumpHeld && player.vy < 0) {
        player.vy      *= JUMP_CUT_MULTIPLIER;
        player.jumpHeld = false;
      }
      if (!jumpHeldNow) player.jumpHeld = false;

      if (keys.ArrowDown) player.vy += FAST_FALL;
  }

  if (isEnteringCastle) {
      const doorCenterX = castle.x + castle.w/2 - player.w/2;
      const doorFloorY  = castle.y + castle.h - player.h - 15;
      player.x += (doorCenterX - player.x) * 0.12;
      player.y += (doorFloorY - player.y) * 0.12;
      enterTimer++;
      castleDoorOpen = Math.min(1, enterTimer / 30);

      if (enterTimer > 60) {
          isEnteringCastle = false;
          levelWin = true;
          winTimer = 0;
          soundSystem.play("levelWin");
          setGameState(GAME_STATES.LEVEL_COMPLETE);
      }
  } else if (!isDead && !fadingOut) {
      if (!player.standingPlatform) {
        player.vy += GRAVITY;
        player.x  += player.vx;
        player.y  += player.vy;
      } else {
        player.x += player.vx;
      }
  } else {
      player.vy += GRAVITY;
      player.y  += player.vy;
  }

  /* Collision resolution — see resolveCollisions() above */
  const prevGrounded = player.onGround;
  const prevVy = player.vy;
  resolveCollisions();
  if (!prevGrounded && player.onGround && prevVy > 2 && !isDead && !isEnteringCastle) {
    soundSystem.play("land");
  }

  /* Player trail */
  if (!isEnteringCastle && (Math.abs(player.vx)>0.5 || Math.abs(player.vy)>1)) {
    playerTrails.push({
      x: player.x + PLAYER_CONFIG.offsetX,
      y: player.y + PLAYER_CONFIG.offsetY,
      facing: player.facing,
      life: 10,
      maxLife: 10
    });
  }
  playerTrails = playerTrails.filter(t => { t.life--; return t.life>0; });

  /* Dragon Patrolling & Hover */
  if (dragonObj.active) {
    dragonObj.y = dragonObj.baseY + Math.sin(frameCount*0.04)*10;
    if (dragonObj.minX !== dragonObj.maxX) {
       dragonObj.x += dragonObj.moveSpeed * dragonObj.moveDir;
       if (dragonObj.x <= dragonObj.minX || dragonObj.x >= dragonObj.maxX) {
           dragonObj.moveDir *= -1;
       }
    }
    dragonObj.attackTimer++;
    if (dragonObj.attackTimer > dragonObj.fireRate) {
      const dir = (player.x < dragonObj.x) ? -1 : 1;
      dragonObj.dir = dir;
      fireballs.push(new Fireball(dragonObj.x + (dir===1 ? dragonObj.w : 0), dragonObj.y + 40, dir));
      dragonObj.attackTimer = 0;
    }
  }

  /* Fireballs vs Player */
  for (let i = fireballs.length - 1; i >= 0; i--) {
    const fb = fireballs[i];
    fb.update();

    if (!isDead && !fadingOut && !isEnteringCastle && hit(player, fb)) {
       damagePlayer();
       fireballs.splice(i, 1);
       continue;
    }

    if (fb.life <= 0 || fb.x < 0 || fb.x > canvas.width) fireballs.splice(i, 1);
  }

  /* Hazards: Spikes, Lava, Pits & Dragon Body Collision */
  if (!isDead && !levelWin && !gameOver && !fadingOut && !fadingIn && !isEnteringCastle) {
      if (player.y > FALL_DEATH_Y) die();
      else if (hasLava && player.y + player.h > canvas.height - 18) die();
      else {
          spikes.forEach(s => {
              if (!isDead && hit(player, s)) damagePlayer();
          });

          if (dragonObj.active && hit(player, {x:dragonObj.x, y:dragonObj.y, w:dragonObj.w, h:dragonObj.h})) {
              damagePlayer();
          }

          if (!isDead && hit(player, castle)) {
              isEnteringCastle = true;
              enterTimer = 0;
              player.standingPlatform = null;
              soundSystem.play("castle");
          }
      }
  }

  updateParticles();
}

function updateAtmosphereAndParticles() {
  updateAtmosphere();
  updateAtmosphereAndParticles();
}

function updateParticles() {
  particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life--; });
  particles = particles.filter(p => p.life > 0);
}
function updateFireworks() {
  fireworks.forEach(f => { f.x += f.vx; f.y += f.vy; f.vy += f.gravity; f.life--; });
  fireworks = fireworks.filter(f => f.life > 0);
}

/* ================= DRAW: 2.5D DARK FANTASY CHISELED BLOCK ================= */
function draw3DBlock(b) {
  const D = 16;
  const bx = b.x, by = b.y, bw = b.w, bh = b.h;
  const blockTexture = images.block;

  // 1. Ambient Occlusion / Drop Shadow into background
  ctx.save();
  ctx.shadowColor = "rgba(2, 2, 6, 0.9)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "black";
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();

  // 2. Primary Top Surface Face
  if (blockTexture) {
    ctx.drawImage(blockTexture, bx, by, bw, bh);
    // Dark fantasy gothic tint overlay
    ctx.fillStyle = "rgba(12, 10, 24, 0.28)";
    ctx.fillRect(bx, by, bw, bh);
  } else {
    // Chiseled procedural obsidian masonry
    const surfaceGrad = ctx.createLinearGradient(bx, by, bx, by + bh);
    surfaceGrad.addColorStop(0, "#2a2236");
    surfaceGrad.addColorStop(0.5, "#1a1524");
    surfaceGrad.addColorStop(1, "#120e1a");
    ctx.fillStyle = surfaceGrad;
    ctx.fillRect(bx, by, bw, bh);
  }

  // 3. 2.5D Bottom Extrusion with Chiseled Stone Texture
  const bottomGrad = ctx.createLinearGradient(0, by + bh, 0, by + bh + D);
  bottomGrad.addColorStop(0, "rgba(8, 6, 14, 0.95)");
  bottomGrad.addColorStop(0.5, "rgba(14, 10, 22, 0.85)");
  bottomGrad.addColorStop(1, "rgba(4, 2, 8, 0.45)");
  ctx.fillStyle = bottomGrad;
  ctx.beginPath();
  ctx.moveTo(bx, by + bh);
  ctx.lineTo(bx + D, by + bh + D);
  ctx.lineTo(bx + bw + D, by + bh + D);
  ctx.lineTo(bx + bw, by + bh);
  ctx.closePath();
  ctx.fill();

  // Bottom edge mortar line
  ctx.strokeStyle = "rgba(0, 0, 0, 0.75)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // 4. 2.5D Right Lateral Bevel Face
  const rightGrad = ctx.createLinearGradient(bx + bw, 0, bx + bw + D, 0);
  rightGrad.addColorStop(0, "rgba(22, 18, 34, 0.85)");
  rightGrad.addColorStop(0.5, "rgba(14, 10, 22, 0.65)");
  rightGrad.addColorStop(1, "rgba(5, 3, 10, 0.35)");
  ctx.fillStyle = rightGrad;
  ctx.beginPath();
  ctx.moveTo(bx + bw, by);
  ctx.lineTo(bx + bw + D, by + D);
  ctx.lineTo(bx + bw + D, by + bh + D);
  ctx.lineTo(bx + bw, by + bh);
  ctx.closePath();
  ctx.fill();

  // 5. Chiseled Top Rim Specular Highlight (Crisp footing line)
  ctx.save();
  const rimGrad = ctx.createLinearGradient(bx, by, bx + bw, by);
  rimGrad.addColorStop(0, "rgba(160, 240, 255, 0.55)");
  rimGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.75)");
  rimGrad.addColorStop(1, "rgba(160, 240, 255, 0.45)");
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(bx, by + 1);
  ctx.lineTo(bx + bw, by + 1);
  ctx.stroke();

  // Subtle runic corner rivets
  ctx.fillStyle = "rgba(160, 240, 255, 0.4)";
  ctx.fillRect(bx + 4, by + 3, 3, 3);
  ctx.fillRect(bx + bw - 7, by + 3, 3, 3);
  ctx.restore();

  // 6. Moving Platform Glowing Arcane Runes
  if (b.type === 'moving') {
    const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.1);
    ctx.save();
    ctx.shadowColor = `rgba(0, 220, 255, ${0.65 * pulse + 0.25})`;
    ctx.shadowBlur = 18;
    ctx.strokeStyle = `rgba(0, 220, 255, ${0.55 * pulse + 0.25})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, bw, bh);

    // Glowing core crystal indicator
    ctx.fillStyle = `rgba(160, 240, 255, ${0.4 * pulse + 0.3})`;
    ctx.beginPath();
    ctx.arc(bx + bw / 2, by + bh / 2, 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Register dynamic arcane light
    addLight(bx + bw / 2, by + bh / 2, 80 + pulse * 30, "rgba(0, 200, 255, 0.18)");
  }
}

/* ================= DRAW: DARK FANTASY LIQUID CAUSTICS & LAVA ================= */
function drawLava() {
  const t = frameCount * 0.04;
  const lavaY = canvas.height - 28;
  const h = 42;

  // Layer 1: Deep molten magma body gradient
  const deepGrad = ctx.createLinearGradient(0, lavaY - 10, 0, canvas.height);
  deepGrad.addColorStop(0, "#ff5500");
  deepGrad.addColorStop(0.25, "#d62400");
  deepGrad.addColorStop(0.65, "#770000");
  deepGrad.addColorStop(1, "#2a0000");
  ctx.fillStyle = deepGrad;

  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  ctx.lineTo(0, lavaY);
  for (let x = 0; x <= canvas.width; x += 16) {
    const wave = Math.sin(t + x * 0.035) * 5 + Math.sin(t * 1.5 + x * 0.07) * 2.5;
    ctx.lineTo(x, lavaY + wave);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Layer 2: Glowing hot crust edge line
  ctx.save();
  ctx.shadowColor = "#ff7700";
  ctx.shadowBlur = 12;
  ctx.strokeStyle = "rgba(255, 230, 140, 0.85)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let x = 0; x <= canvas.width; x += 16) {
    const wave = Math.sin(t + x * 0.035) * 5 + Math.sin(t * 1.5 + x * 0.07) * 2.5;
    if (x === 0) ctx.moveTo(x, lavaY + wave);
    else ctx.lineTo(x, lavaY + wave);
  }
  ctx.stroke();
  ctx.restore();

  // Layer 3: Rising heat plume atmospheric gradient
  const glow = ctx.createLinearGradient(0, lavaY - 55, 0, canvas.height);
  glow.addColorStop(0, "rgba(255, 60, 0, 0)");
  glow.addColorStop(0.4, "rgba(255, 80, 0, 0.22)");
  glow.addColorStop(0.8, "rgba(255, 120, 0, 0.38)");
  glow.addColorStop(1, "rgba(200, 20, 0, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, lavaY - 55, canvas.width, h + 55);

  // Register wide dynamic light bar across floor
  addLight(canvas.width * 0.25, lavaY, 180, "rgba(255, 80, 0, 0.16)");
  addLight(canvas.width * 0.75, lavaY, 180, "rgba(255, 80, 0, 0.16)");
}

/* ================= DRAW: HUD ================= */
function drawLives() {
  ctx.save();
  ctx.font="22px Arial";
  ctx.shadowColor="black"; ctx.shadowBlur=6; ctx.shadowOffsetY=2;

  ctx.fillStyle="white";
  ctx.fillText("Lives:  " + "❤".repeat(lives) + "♡".repeat(MAX_LIVES-lives), 20, 36);
  ctx.fillStyle="#ff4444";
  ctx.fillText("Health: " + "❤".repeat(hp) + "♡".repeat(MAX_HEALTH-hp), 20, 68);
  ctx.restore();
}

/* ================= DRAW: LOADING SCREEN ================= */
function drawLoadingScreen() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0c0c16";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#ffd700";
  ctx.font = "bold 38px serif";
  ctx.shadowColor = "#ffd700";
  ctx.shadowBlur = 16;
  ctx.fillText("WIZARD DUNGEON", canvas.width / 2, canvas.height / 2 - 40);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#a0f0ff";
  ctx.font = "18px Arial";
  ctx.fillText("Loading Magic Assets...", canvas.width / 2, canvas.height / 2 + 5);

  const barW = 320, barH = 14;
  const barX = canvas.width / 2 - barW / 2;
  const barY = canvas.height / 2 + 30;

  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barW, barH);

  const progress = Math.min(1, assetsLoaded / Math.max(1, totalAssets));
  const fillGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fillGrad.addColorStop(0, "#00c8ff");
  fillGrad.addColorStop(1, "#ffd700");
  ctx.fillStyle = fillGrad;
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * progress, barH - 4);

  ctx.restore();
}

/* ================= DRAW ================= */
function draw() {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  ctx.clearRect(-10,-10,canvas.width+20,canvas.height+20);

  /* Background layers */
  const bgImg = images.bg;
  if (bgImg) {
    ctx.drawImage(bgImg, bgX, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, bgX+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=0.18;
    ctx.drawImage(bgImg, para1X, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, para1X+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=0.09;
    ctx.drawImage(bgImg, para2X, 0, canvas.width, canvas.height);
    ctx.drawImage(bgImg, para2X+canvas.width, 0, canvas.width, canvas.height);
    ctx.globalAlpha=1;
  }

  /* Depth fog */
  const fog=ctx.createLinearGradient(0,0,0,canvas.height);
  fog.addColorStop(0,"rgba(0,0,0,0)");
  fog.addColorStop(1,"rgba(0,0,0,0.35)");
  ctx.fillStyle=fog; ctx.fillRect(0,0,canvas.width,canvas.height);

  /* Floating runes */
  runes.forEach(r=>{
    ctx.save(); ctx.globalAlpha=r.alpha;
    ctx.fillStyle="#c8a0ff"; ctx.font=`${r.size}px serif`;
    ctx.fillText(r.symbol,r.x,r.y); ctx.restore();
  });

  /* Final win beams */
  if (finalWin) {
    const cx=canvas.width/2, cy=canvas.height/2, t=Date.now()*0.001;
    ctx.save(); ctx.translate(cx,cy);
    for (let i=0;i<16;i++) {
      ctx.save(); ctx.rotate((Math.PI*2/16)*i+t*0.4);
      const g=ctx.createLinearGradient(0,0,0,520);
      g.addColorStop(0,`hsla(${(i*22+t*40)%360},100%,70%,0.55)`); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(50,520);ctx.lineTo(-50,520);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  /* Lava */
  if (hasLava) drawLava();

  /* 3D Platforms */
  blocks.forEach(b => draw3DBlock(b));

  /* Spikes */
  const spikeImg = images.spike;
  spikes.forEach(s => {
    ctx.save();
    ctx.shadowColor="#ff2200"; ctx.shadowBlur=10;
    if (spikeImg) ctx.drawImage(spikeImg, s.x, s.y, s.w, s.h);
    ctx.restore();
  });

  /* Castle */
  const castleImg = images.castle;
  ctx.save();
  const gp=0.5+0.5*Math.sin(frameCount*0.07);
  ctx.shadowColor="gold"; ctx.shadowBlur=30+25*gp;
  if (castleImg) ctx.drawImage(castleImg, castle.x, castle.y, castle.w, castle.h);
  ctx.restore();
  addLight(castle.x + castle.w / 2, castle.y + castle.h - 40, 160 + gp * 40, "rgba(255, 215, 0, 0.25)");

  /* Dark Doorway Graphic for Entrance Animation */
  if (isEnteringCastle || levelWin || fadingOut) {
      let openRatio = castleDoorOpen;
      if (levelWin || fadingOut) openRatio = 1;

      ctx.save();
      ctx.fillStyle = "black";
      ctx.shadowColor = "black"; ctx.shadowBlur = 10;

      const doorW = 44 * openRatio;
      const doorH = 75;
      const doorX = castle.x + (castle.w/2) - (doorW/2);
      const doorY = castle.y + castle.h - doorH - 4;
      ctx.fillRect(doorX, doorY, doorW, doorH);
      ctx.restore();
  }

  /* Dragon */
  if (dragonObj.active) {
    const dragonImg = images.dragon;
    ctx.save();
    ctx.shadowColor = dragonObj.hitTimer > 0 ? "white" : "#9b00ff";
    ctx.shadowBlur  = dragonObj.hitTimer > 0 ? 40 : 28;

    if (dragonObj.hitTimer > 0) {
       ctx.globalCompositeOperation = "lighter";
       ctx.filter = "brightness(2) contrast(1.5)";
       dragonObj.hitTimer--;
    }

    addLight(dragonObj.x + dragonObj.w / 2, dragonObj.y + dragonObj.h / 2, 180, "rgba(180, 0, 255, 0.28)");
    if (dragonImg) {
      if (dragonObj.moveDir > 0) {
          ctx.translate(dragonObj.x + dragonObj.w, dragonObj.y);
          ctx.scale(-1, 1);
          ctx.drawImage(dragonImg, 0, 0, dragonObj.w, dragonObj.h);
      } else {
          ctx.drawImage(dragonImg, dragonObj.x, dragonObj.y, dragonObj.w, dragonObj.h);
      }
    }
    ctx.restore();
  }

  /* Magic Spells & Fireballs (with 2.5D dynamic illumination) */
  playerSpells.forEach(s => {
    s.draw();
    addLight(s.x + 8, s.y + 8, 90, "rgba(0, 240, 255, 0.35)");
  });
  fireballs.forEach(fb => {
    fb.draw();
    addLight(fb.x + 12, fb.y + 12, 110, "rgba(255, 90, 0, 0.40)");
  });

  /* Player trails */
  const wizImg = images.wizard;
  playerTrails.forEach(t=>{
    ctx.save();
    ctx.globalAlpha=t.life/t.maxLife*0.3;
    if (wizImg) {
      if (!t.facing) {
        ctx.translate(t.x + PLAYER_CONFIG.spriteW, t.y);
        ctx.scale(-1, 1);
        ctx.drawImage(wizImg, 0, 0, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
      } else {
        ctx.drawImage(wizImg, t.x, t.y, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
      }
    }
    ctx.restore();
  });

  /* Player */
  if (!gameOver && !finalWin) {
    let alpha = 1;
    if (isEnteringCastle) {
        alpha = Math.max(0, 1 - Math.max(0, enterTimer - 15) / 30);
    } else if (levelWin || fadingOut) {
        alpha = 0;
    } else if (invincibilityTimer > 0) {
        alpha = (frameCount % 12 > 6) ? 0.3 : 1;
    }

    if (alpha > 0) {
        const bobY = (player.onGround && !isEnteringCastle) ? Math.sin(frameCount*0.12)*2:0;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor="#a0f0ff"; ctx.shadowBlur=22;

        const drawX = player.x + PLAYER_CONFIG.offsetX;
        const drawY = player.y + PLAYER_CONFIG.offsetY + bobY;

        const staffX = player.facing ? (player.x + player.w + 6) : (player.x - 6);
        const staffY = player.y + 18 + bobY;
        addLight(staffX, staffY, 95, "rgba(160, 240, 255, 0.28)");
        addLight(player.x + player.w / 2, player.y + player.h / 2, 70, "rgba(180, 100, 255, 0.16)");

        if (wizImg) {
          if (!player.facing) {
             ctx.translate(drawX + PLAYER_CONFIG.spriteW, drawY);
             ctx.scale(-1, 1);
             ctx.drawImage(wizImg, 0, 0, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
          } else {
             ctx.drawImage(wizImg, drawX, drawY, PLAYER_CONFIG.spriteW, PLAYER_CONFIG.spriteH);
          }
        }
        ctx.restore();
    }
  }

  /* Particles */
  particles.forEach(p=>{
    const a=Math.max(0,p.life/p.maxLife);
    ctx.save(); ctx.globalAlpha=a;
    ctx.shadowColor=p.color; ctx.shadowBlur=10;
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* Fireworks */
  fireworks.forEach(f=>{
    ctx.save(); ctx.globalAlpha=f.life/f.maxLife;
    ctx.shadowColor=f.color; ctx.shadowBlur=8; ctx.fillStyle=f.color;
    ctx.beginPath(); ctx.arc(f.x,f.y,f.size,0,Math.PI*2); ctx.fill();
    ctx.restore();
  });

  /* HUD (In-game) */
  if (gameState === GAME_STATES.PLAYING || gameState === GAME_STATES.PAUSED) {
    ctx.save();
    ctx.shadowColor="black"; ctx.shadowBlur=6; ctx.shadowOffsetY=2;
    ctx.fillStyle="white"; ctx.font="bold 20px Arial";
    ctx.fillText("Level "+(levelIndex+1), 20, 100);
    ctx.restore();
    drawLives();
  }

  /* Backdrop Dimming during Game Over / Level Win (HTML UI panels take precedence) */
  if (gameOver || levelWin || finalWin) {
    ctx.save();
    ctx.fillStyle = "rgba(4, 3, 10, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  /* 2.5D Lighting Pass (Dynamic light emission blending) */
  renderLightingPass();

  /* 2.5D Dark Fantasy Atmospheric Embers & Spores */
  drawAtmosphericEmbers();

  /* 2.5D Gothic Vignette & Atmospheric Depth Grading */
  drawDarkFantasyVignette();

  /* Fade overlay */
  if (fadeAlpha>0) {
    ctx.save();
    ctx.globalAlpha=fadeAlpha;
    ctx.fillStyle="black";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.restore();
  }

  ctx.restore();
}

/* ================= DETERMINISTIC FIXED-TIMESTEP LOOP ================= */
let lastTime = 0;
let accumulator = 0;

function loop(currentTime) {
  if (!isLoaded) {
    drawLoadingScreen();
    requestAnimationFrame(loop);
    return;
  }

  if (!lastTime) lastTime = currentTime;
  let delta = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  if (delta > MAX_DELTA) delta = MAX_DELTA;

  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    update();
    accumulator -= FIXED_DT;
  }

  draw();
  requestAnimationFrame(loop);
}

/* ================= INITIALIZATION ================= */
preloadAssets(() => {
  loadLevel(0);
  initUI();
  setGameState(GAME_STATES.MAIN_MENU);
});

requestAnimationFrame(loop);

});
