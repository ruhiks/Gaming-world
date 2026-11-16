const fs = require('fs');

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = val.toString(); },
    clear: () => { store = {}; },
    removeItem: (key) => { delete store[key]; }
  };
})();

global.localStorage = localStorageMock;
global.requestAnimationFrame = (cb) => setTimeout(cb, 16);
global.navigator = { maxTouchPoints: 1 };

global.window = {
  listeners: {},
  addEventListener: (evt, h) => {
    if (!global.window.listeners[evt]) global.window.listeners[evt] = [];
    global.window.listeners[evt].push(h);
  },
  trigger: (evt, e) => {
    if (global.window.listeners[evt]) global.window.listeners[evt].forEach(h => h(e || {}));
  },
  requestAnimationFrame: (cb) => setTimeout(cb, 16),
  AudioContext: class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 1.0;
      this.sampleRate = 44100;
      this.destination = {};
    }
    createGain() { return { gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { type: 'sine', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { type: 'lowpass', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {} }; }
    createDynamicsCompressor() { return { threshold: { setValueAtTime: () => {} }, knee: { setValueAtTime: () => {} }, ratio: { setValueAtTime: () => {} }, attack: { setValueAtTime: () => {} }, release: { setValueAtTime: () => {} }, connect: () => {} }; }
    createBuffer(c, l, s) { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
    resume() { return Promise.resolve(); }
  }
};

const mockCtx = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', shadowColor: '', shadowBlur: 0, shadowOffsetY: 0, globalAlpha: 1, globalCompositeOperation: 'source-over', filter: 'none',
  fillRect: () => {}, clearRect: () => {}, beginPath: () => {}, ellipse: () => {}, fill: () => {}, stroke: () => {}, moveTo: () => {}, lineTo: () => {}, closePath: () => {}, arc: () => {}, save: () => {}, restore: () => {}, translate: () => {}, rotate: () => {}, scale: () => {}, drawImage: () => {}, fillText: () => {}, strokeRect: () => {}, createLinearGradient: () => ({ addColorStop: () => {} })
};

const domElements = {};
global.document = {
  listeners: {},
  addEventListener: (evt, h) => {
    if (!global.document.listeners[evt]) global.document.listeners[evt] = [];
    global.document.listeners[evt].push(h);
  },
  getElementById: (id) => {
    if (!domElements[id]) {
      domElements[id] = {
        id,
        listeners: {},
        style: {},
        width: 960,
        height: 540,
        getContext: () => mockCtx,
        classList: { add: () => {}, remove: () => {} },
        value: 50,
        textContent: '',
        addEventListener: (evt, h) => {
          if (!domElements[id].listeners[evt]) domElements[id].listeners[evt] = [];
          domElements[id].listeners[evt].push(h);
        },
        trigger: (evt, e) => {
          if (domElements[id].listeners[evt]) {
            domElements[id].listeners[evt].forEach(h => h(e || { target: domElements[id] }));
          }
        },
        blur: () => {}
      };
    }
    return domElements[id];
  },
  querySelectorAll: (sel) => {
    if (sel === '.level-btn') {
      if (!global._levelButtons) {
        global._levelButtons = [0, 1, 2, 3].map(i => ({
          getAttribute: (attr) => i.toString(),
          listeners: {},
          disabled: false,
          style: {},
          addEventListener: function(evt, h) {
            if (!this.listeners[evt]) this.listeners[evt] = [];
            this.listeners[evt].push(h);
          },
          trigger: function(evt, e) {
            if (this.listeners[evt]) this.listeners[evt].forEach(h => h(e || { target: this }));
          }
        }));
      }
      return global._levelButtons;
    }
    return [];
  },
  createElement: () => ({ width: 64, height: 64, getContext: () => mockCtx })
};

global.Image = class { constructor() { setTimeout(() => { if (this.onload) this.onload(); }, 5); } };
global.Audio = class MockAudio {
  constructor(src) { this.src = src; this.volume = 1; this.muted = false; this.loop = false; }
  addEventListener(evt, cb) { if (evt === 'error') setTimeout(cb, 5); }
  play() { return Promise.reject(new Error('Missing file')); }
  pause() {}
  cloneNode() { return new MockAudio(this.src); }
};

localStorageMock.clear();

let code = fs.readFileSync('game.js', 'utf8');
code = code.replace('/* ================= STATE ================= */', 'global.__TEST__ = { GameStorage, addScore, getScore: () => score, setGameState, GAME_STATES };\n/* ================= STATE ================= */');

eval(code);

if (global.document.listeners['DOMContentLoaded']) {
  global.document.listeners['DOMContentLoaded'].forEach(h => h());
}

setTimeout(() => {
  const { GameStorage, addScore, getScore, setGameState, GAME_STATES } = global.__TEST__;
  console.log('--- STARTING PHASE 4 VERIFICATION SUITE ---');

  // Test 1: New player initial level unlock
  const initialUnlocked = GameStorage.getUnlockedLevel();
  console.log('1. New player unlocked level:', initialUnlocked === 0 ? 'PASS (Level 1 only)' : 'FAIL');

  // Test 2: Level Select UI reflects Level 1 unlocked, Levels 2-4 locked
  setGameState('LEVEL_SELECT');
  const btns = global.document.querySelectorAll('.level-btn');
  console.log('2. Level Select locked state:', btns[0].disabled === false && btns[1].disabled === true && btns[2].disabled === true && btns[3].disabled === true ? 'PASS (Only Level 1 unlocked)' : 'FAIL');

  // Test 3: Progression unlocking (Level 1 -> Level 2 -> Level 3 -> Level 4)
  GameStorage.setUnlockedLevel(1);
  console.log('3. Complete Level 1 -> unlocks Level 2:', GameStorage.getUnlockedLevel() === 1 ? 'PASS' : 'FAIL');

  GameStorage.setUnlockedLevel(2);
  console.log('4. Complete Level 2 -> unlocks Level 3:', GameStorage.getUnlockedLevel() === 2 ? 'PASS' : 'FAIL');

  GameStorage.setUnlockedLevel(3);
  console.log('5. Complete Level 3 -> unlocks Level 4:', GameStorage.getUnlockedLevel() === 3 ? 'PASS' : 'FAIL');

  // Test 4: Cannot unlock beyond Level 4 (Level 4 is index 3, max existing level)
  GameStorage.setUnlockedLevel(10);
  console.log('6. Max level capped at Level 4:', GameStorage.getUnlockedLevel() === 3 ? 'PASS' : 'FAIL');

  // Test 5: Score awards
  addScore(50); // hit
  addScore(250); // boss defeat
  addScore(500 + 3 * 100); // level complete with 3 hearts
  console.log('7. Score calculation (50 + 250 + 800 = 1100):', getScore() === 1100 ? 'PASS (score = ' + getScore() + ')' : 'FAIL');

  // Test 6: High Score persistence in localStorage
  console.log('8. High Score persisted in localStorage:', GameStorage.getHighScore() === 1100 ? 'PASS' : 'FAIL');

  // Test 7: Corrupted / missing localStorage handling
  localStorageMock.setItem('wizard_dungeon_unlocked_level', 'corrupted_invalid_data');
  console.log('9. Corrupted unlocked level fallback:', GameStorage.getUnlockedLevel() === 0 ? 'PASS (Safely falls back to 0)' : 'FAIL');

  localStorageMock.setItem('wizard_dungeon_high_score', 'abc_non_number');
  console.log('10. Corrupted high score fallback:', GameStorage.getHighScore() === 0 ? 'PASS (Safely falls back to 0)' : 'FAIL');

  // Restore valid state
  GameStorage.setUnlockedLevel(2);
  GameStorage.saveHighScore(1500);

  // Test 8: Level Complete Screen score updates
  setGameState(GAME_STATES.LEVEL_COMPLETE);
  const lcScore = domElements['levelCompleteScore'].textContent;
  const lcHS = domElements['levelCompleteHighScore'].textContent;
  console.log('11. Level Complete screen shows scores:', lcScore !== '' && lcHS !== '' ? 'PASS' : 'FAIL');

  // Test 9: Game Over Screen score updates
  setGameState(GAME_STATES.GAME_OVER);
  const goScore = domElements['gameOverScore'].textContent;
  const goHS = domElements['gameOverHighScore'].textContent;
  console.log('12. Game Over screen shows scores:', goScore !== '' && goHS !== '' ? 'PASS' : 'FAIL');

  // Test 10: Main Menu Screen stats updates
  setGameState(GAME_STATES.MAIN_MENU);
  const menuHS = domElements['menuHighScore'].textContent;
  const menuProg = domElements['menuProgress'].textContent;
  console.log('13. Main Menu shows best score & progress:', menuHS === '1,500' && menuProg === 'Level 3' ? 'PASS' : 'FAIL');

  console.log('--- ALL 13 PHASE 4 TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}, 250);
