const STORAGE_KEY = 'falldown-neon.best-score';
const MUSIC_STORAGE_KEY = 'falldown-neon.music-enabled';
const DIFFICULTY_STORAGE_KEY = 'falldown-neon.difficulty';
const MUSIC_VOLUME_STORAGE_KEY = 'falldown-neon.music-volume';

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const FLOOR_SPACING = 82;
const FLOOR_THICKNESS = 16;
const FLOOR_COUNT = 16;
const FLOOR_BUFFER_BELOW = 4;
const BALL_RADIUS = 11;
const STEPS_PER_BAR = 16;
const TITLE_LOOP_BARS = 8;
const TITLE_LOOP_STEPS = STEPS_PER_BAR * TITLE_LOOP_BARS;
const LOOP_BARS = 32;
const LOOP_STEPS = STEPS_PER_BAR * LOOP_BARS;
const MUSIC_GAIN_MULTIPLIER = 4;
const BASE_SCROLL_SPEED = 82;
const MAX_SCROLL_SPEED = 242;
const BASE_GAP_WIDTH = 122;
const MIN_GAP_WIDTH = 68;
const BALL_ACCELERATION = 1280;
const BALL_DRAG = 7.2;
const MAX_HORIZONTAL_SPEED = 235;
const GRAVITY = 1180;
const MAX_PHYSICS_TRAVEL_PER_STEP = 12;
const MAX_PHYSICS_SUBSTEPS = 6;

const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayLabel = document.getElementById('overlay-label');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const statusText = document.getElementById('status-text');
const scoreValue = document.getElementById('score-value');
const bestValue = document.getElementById('best-value');
const levelValue = document.getElementById('level-value');
const speedValue = document.getElementById('speed-value');
const runSummary = document.getElementById('run-summary');
const startButton = document.getElementById('start-button');
const pauseButton = document.getElementById('pause-button');
const musicButton = document.getElementById('music-button');
const immersiveButton = document.getElementById('immersive-button');
const difficultySelect = document.getElementById('difficulty-select');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const touchButtons = Array.from(document.querySelectorAll('.touch-button'));
const gameFrame = document.querySelector('.game-frame');
const screenPanel = document.querySelector('.screen-panel');

const inputState = {
  left: false,
  right: false,
};

const game = {
  started: false,
  running: false,
  paused: false,
  gameOver: false,
  difficulty: loadDifficulty(),
  score: 0,
  best: loadBestScore(),
  level: 1,
  scrollSpeed: 0,
  catchUpSpeed: 0,
  elapsed: 0,
  lastTimestamp: 0,
  ball: createBall(),
  floors: [],
  trail: [],
};

const soundtrack = {
  enabled: loadMusicEnabled(),
  context: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  filter: null,
  noiseBuffer: null,
  schedulerId: 0,
  isInitialized: false,
  currentStep: 0,
  nextNoteTime: 0,
  tempo: 102,
  userVolume: loadMusicVolume(),
};

const DIFFICULTY_LEVELS = {
  easy: {
    label: 'Easy',
    baseScrollSpeed: 92,
    maxScrollSpeed: 250,
    scrollRamp: 0.46,
    baseGapWidth: 136,
    minGapWidth: 86,
    gapShrinkRate: 0.08,
    scoreRate: 42,
    moveAcceleration: 1340,
    maxHorizontalSpeed: 248,
  },
  normal: {
    label: 'Normal',
    baseScrollSpeed: 112,
    maxScrollSpeed: 318,
    scrollRamp: 0.72,
    baseGapWidth: 122,
    minGapWidth: 72,
    gapShrinkRate: 0.1,
    scoreRate: 50,
    moveAcceleration: 1440,
    maxHorizontalSpeed: 266,
  },
  hard: {
    label: 'Hard',
    baseScrollSpeed: 132,
    maxScrollSpeed: 380,
    scrollRamp: 0.92,
    baseGapWidth: 112,
    minGapWidth: 66,
    gapShrinkRate: 0.11,
    scoreRate: 58,
    moveAcceleration: 1560,
    maxHorizontalSpeed: 286,
  },
  impossible: {
    label: 'Impossible',
    baseScrollSpeed: 148,
    maxScrollSpeed: 430,
    scrollRamp: 1.08,
    baseGapWidth: 104,
    minGapWidth: 62,
    gapShrinkRate: 0.12,
    scoreRate: 64,
    moveAcceleration: 1700,
    maxHorizontalSpeed: 308,
  },
};

const WORLD_BANDS = [
  {
    topColor: [7, 21, 43],
    midColor: [4, 15, 30],
    bottomColor: [2, 5, 11],
    glowColor: [89, 243, 255],
    accentColor: [255, 78, 221],
    alertColor: [255, 204, 92],
    dustColor: [160, 220, 255],
    gridStrength: 0.95,
    panelStrength: 0.92,
    pipeStrength: 0.84,
    ruinStrength: 0.08,
    magmaStrength: 0,
    alienStrength: 0.04,
    chevronStrength: 0.9,
    instability: 0.08,
    particleStrength: 0.18,
    ringStrength: 0.24,
    cityGlowStrength: 0.92,
  },
  {
    topColor: [16, 19, 28],
    midColor: [14, 15, 21],
    bottomColor: [7, 7, 11],
    glowColor: [255, 144, 76],
    accentColor: [255, 83, 83],
    alertColor: [255, 210, 104],
    dustColor: [210, 197, 150],
    gridStrength: 0.55,
    panelStrength: 0.98,
    pipeStrength: 0.95,
    ruinStrength: 0.18,
    magmaStrength: 0.02,
    alienStrength: 0.05,
    chevronStrength: 0.72,
    instability: 0.16,
    particleStrength: 0.28,
    ringStrength: 0.18,
    cityGlowStrength: 0.34,
  },
  {
    topColor: [34, 20, 18],
    midColor: [28, 20, 19],
    bottomColor: [12, 10, 13],
    glowColor: [214, 124, 62],
    accentColor: [133, 168, 184],
    alertColor: [255, 183, 94],
    dustColor: [184, 150, 118],
    gridStrength: 0.22,
    panelStrength: 0.72,
    pipeStrength: 0.68,
    ruinStrength: 0.82,
    magmaStrength: 0.16,
    alienStrength: 0.08,
    chevronStrength: 0.28,
    instability: 0.24,
    particleStrength: 0.34,
    ringStrength: 0.26,
    cityGlowStrength: 0.06,
  },
  {
    topColor: [22, 10, 8],
    midColor: [29, 11, 9],
    bottomColor: [7, 4, 5],
    glowColor: [255, 116, 30],
    accentColor: [255, 193, 71],
    alertColor: [151, 255, 143],
    dustColor: [255, 168, 92],
    gridStrength: 0.05,
    panelStrength: 0.44,
    pipeStrength: 0.4,
    ruinStrength: 0.64,
    magmaStrength: 0.92,
    alienStrength: 0.12,
    chevronStrength: 0.08,
    instability: 0.42,
    particleStrength: 0.54,
    ringStrength: 0.28,
    cityGlowStrength: 0,
  },
  {
    topColor: [25, 11, 14],
    midColor: [18, 13, 19],
    bottomColor: [6, 5, 9],
    glowColor: [110, 245, 255],
    accentColor: [183, 104, 255],
    alertColor: [255, 164, 82],
    dustColor: [223, 232, 255],
    gridStrength: 0.08,
    panelStrength: 0.36,
    pipeStrength: 0.26,
    ruinStrength: 0.28,
    magmaStrength: 0.56,
    alienStrength: 0.54,
    chevronStrength: 0.05,
    instability: 0.5,
    particleStrength: 0.6,
    ringStrength: 0.62,
    cityGlowStrength: 0,
  },
  {
    topColor: [8, 7, 18],
    midColor: [5, 7, 15],
    bottomColor: [2, 3, 8],
    glowColor: [96, 242, 255],
    accentColor: [189, 98, 255],
    alertColor: [164, 255, 129],
    dustColor: [209, 227, 255],
    gridStrength: 0.12,
    panelStrength: 0.15,
    pipeStrength: 0.08,
    ruinStrength: 0.04,
    magmaStrength: 0.16,
    alienStrength: 0.96,
    chevronStrength: 0,
    instability: 0.68,
    particleStrength: 0.74,
    ringStrength: 0.98,
    cityGlowStrength: 0,
  },
  {
    topColor: [17, 10, 24],
    midColor: [12, 8, 19],
    bottomColor: [5, 3, 9],
    glowColor: [255, 255, 255],
    accentColor: [102, 190, 255],
    alertColor: [255, 204, 96],
    dustColor: [255, 240, 212],
    gridStrength: 0.08,
    panelStrength: 0.02,
    pipeStrength: 0,
    ruinStrength: 0,
    magmaStrength: 0.12,
    alienStrength: 1,
    chevronStrength: 0,
    instability: 0.9,
    particleStrength: 0.94,
    ringStrength: 1,
    cityGlowStrength: 0,
  },
];

const LOOP_CHORDS = [
  { root: 45, tones: [57, 60, 64] },
  { root: 45, tones: [57, 60, 64] },
  { root: 41, tones: [53, 57, 60] },
  { root: 41, tones: [53, 57, 60] },
  { root: 43, tones: [55, 59, 62] },
  { root: 43, tones: [55, 59, 62] },
  { root: 40, tones: [52, 55, 59] },
  { root: 40, tones: [52, 55, 59] },
  { root: 48, tones: [60, 64, 67] },
  { root: 48, tones: [60, 64, 67] },
  { root: 41, tones: [53, 57, 60] },
  { root: 41, tones: [53, 57, 60] },
  { root: 43, tones: [55, 59, 62] },
  { root: 43, tones: [55, 59, 62] },
  { root: 40, tones: [52, 55, 59] },
  { root: 40, tones: [52, 55, 59] },
  { root: 38, tones: [50, 53, 57] },
  { root: 38, tones: [50, 53, 57] },
  { root: 48, tones: [60, 64, 67] },
  { root: 48, tones: [60, 64, 67] },
  { root: 45, tones: [57, 60, 64] },
  { root: 45, tones: [57, 60, 64] },
  { root: 43, tones: [55, 59, 62] },
  { root: 43, tones: [55, 59, 62] },
  { root: 48, tones: [60, 64, 67] },
  { root: 48, tones: [60, 64, 67] },
  { root: 41, tones: [53, 57, 60] },
  { root: 41, tones: [53, 57, 60] },
  { root: 43, tones: [55, 59, 62] },
  { root: 43, tones: [55, 59, 62] },
  { root: 40, tones: [52, 55, 59] },
  { root: 40, tones: [52, 55, 59] },
];

const TITLE_CHORDS = [
  { root: 45, tones: [57, 60, 64] },
  { root: 41, tones: [53, 57, 60] },
  { root: 48, tones: [60, 64, 67] },
  { root: 43, tones: [55, 59, 62] },
  { root: 38, tones: [50, 53, 57] },
  { root: 41, tones: [53, 57, 60] },
  { root: 43, tones: [55, 59, 62] },
  { root: 40, tones: [52, 55, 59] },
];

const BASS_PATTERNS = {
  intro: [
    [0, null, null, null, 0, null, 7, null, 0, null, 12, null, 7, null, 0, null],
    [0, null, null, null, 0, null, 7, null, 0, 12, 7, null, 0, null, 7, null],
  ],
  cruise: [
    [0, null, 12, null, 0, null, 7, null, 0, null, 12, null, 7, null, 0, null],
    [0, null, 7, null, 12, null, 7, null, 0, null, 7, null, 10, null, 7, null],
  ],
  bridge: [
    [0, null, 0, 12, 0, null, 7, null, 5, null, 7, 12, 5, null, 7, null],
    [0, null, 7, null, 10, null, 7, 12, 0, null, 7, null, 10, null, 7, null],
  ],
  finale: [
    [0, 12, 0, null, 7, 12, 7, null, 0, 12, 0, null, 7, 12, 10, null],
    [0, null, 12, 7, 0, null, 7, 12, 0, null, 12, 7, 10, null, 7, 12],
  ],
};

const ARP_PATTERNS = {
  intro: [
    null, null, 0, null, 1, null, 2, null, 1, null, 0, null, 2, null, 1, null,
  ],
  cruise: [
    0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1,
  ],
  bridge: [
    0, 2, 1, 3, 0, 2, 1, 3, 1, 2, 0, 3, 1, 2, 0, 4,
  ],
  finale: [
    0, 1, 2, 3, 1, 2, 4, 2, 0, 1, 2, 4, 2, 1, 3, 4,
  ],
};

const LEAD_PATTERNS = {
  intro: [
    null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null,
  ],
  cruise: [
    null, null, null, null, 12, null, 14, null, 15, null, 14, null, 12, null, 10, null,
  ],
  bridge: [
    19, null, 17, null, 15, null, 14, null, 12, null, 10, null, 12, null, 14, null,
  ],
  finale: [
    12, null, 14, null, 15, 14, 12, null, 19, null, 17, null, 15, null, 14, null,
  ],
};

const DRUM_PATTERNS = {
  intro: {
    kick: 'x.......x.......',
    snare: '................',
    hat: '..x...x...x...x.',
  },
  cruise: {
    kick: 'x...x..x..x.x...',
    snare: '....x.......x...',
    hat: '..xxxxxxxxxxxxxx',
  },
  bridge: {
    kick: 'x..x....x..x.x..',
    snare: '....x.......x...',
    hat: 'x.xxxxxxxxxxxxxx',
  },
  finale: {
    kick: 'x.x.x..xx.x.x..x',
    snare: '....x.......x..x',
    hat: 'xxxxxxxxxxxxxxxx',
  },
};

const TITLE_BASS_PATTERNS = [
  [0, null, null, null, 0, null, 7, null, 12, null, 7, null, 0, null, 7, null],
  [0, null, null, null, 0, null, 5, null, 10, null, 7, null, 0, null, 7, null],
];

const TITLE_ARP_PATTERN = [
  null, 0, 1, 2, null, 2, 1, 3, null, 1, 2, 4, null, 2, 1, 3,
];

const TITLE_LEAD_PATTERNS = [
  [null, null, null, null, 12, null, 14, null, 17, null, 14, null, 12, null, 10, null],
  [null, null, 7, null, 10, null, 12, null, 15, null, 12, null, 10, null, 7, null],
  [null, 12, null, 14, null, 17, null, 19, null, 17, null, 14, null, 12, null, 10],
  [null, null, 15, null, 17, null, 19, null, 22, null, 19, null, 17, null, 15, null],
];

const TITLE_DRUMS = {
  kick: 'x.......x...x...',
  snare: '........x.......',
  hat: '..x.x.x...x.x.x.',
};

function createBall() {
  return {
    x: GAME_WIDTH * 0.5,
    y: 132,
    vx: 0,
    vy: 0,
  };
}

function loadBestScore() {
  const value = Number(localStorage.getItem(STORAGE_KEY) || '0');
  return Number.isFinite(value) && value > 0 ? Math.ceil(value) : 0;
}

function loadMusicEnabled() {
  const saved = localStorage.getItem(MUSIC_STORAGE_KEY);
  return saved === null ? true : saved === 'true';
}

function loadMusicVolume() {
  const saved = Number(localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY));
  if (!Number.isFinite(saved)) {
    return 0.5;
  }

  return clamp(saved, 0, 1);
}

function saveMusicVolume(volume) {
  localStorage.setItem(MUSIC_VOLUME_STORAGE_KEY, String(volume));
}

function loadDifficulty() {
  const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY);
  return ['easy', 'normal', 'hard', 'impossible'].includes(saved) ? saved : 'normal';
}

function saveDifficulty(difficulty) {
  localStorage.setItem(DIFFICULTY_STORAGE_KEY, difficulty);
}

function saveMusicEnabled(enabled) {
  localStorage.setItem(MUSIC_STORAGE_KEY, String(enabled));
}

function saveBestScore(score) {
  localStorage.setItem(STORAGE_KEY, String(Math.ceil(score)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return amount * amount * (3 - 2 * amount);
}

function fract(value) {
  return value - Math.floor(value);
}

function randomFromSeed(seed) {
  return fract(Math.sin(seed * 127.1 + 311.7) * 43758.5453123);
}

function mixRgb(start, end, amount) {
  return [
    lerp(start[0], end[0], amount),
    lerp(start[1], end[1], amount),
    lerp(start[2], end[2], amount),
  ];
}

function rgbToString(rgb, alpha = 1) {
  const rounded = rgb.map((value) => Math.round(clamp(value, 0, 255)));
  return `rgba(${rounded[0]}, ${rounded[1]}, ${rounded[2]}, ${alpha})`;
}

function blendBandColor(weights, key) {
  return weights.reduce((color, weight, index) => {
    const source = WORLD_BANDS[index][key];
    color[0] += source[0] * weight;
    color[1] += source[1] * weight;
    color[2] += source[2] * weight;
    return color;
  }, [0, 0, 0]);
}

function blendBandValue(weights, key) {
  return weights.reduce((total, weight, index) => total + WORLD_BANDS[index][key] * weight, 0);
}

function getWorldTheme() {
  const depth = clamp((game.level - 1) / 12, 0, WORLD_BANDS.length - 1);
  const weights = WORLD_BANDS.map((_, index) => {
    const proximity = clamp(1 - Math.abs(depth - index), 0, 1);
    return proximity * proximity * (3 - 2 * proximity);
  });
  const totalWeight = weights.reduce((total, weight) => total + weight, 0) || 1;
  const normalizedWeights = weights.map((weight) => weight / totalWeight);

  return {
    depth,
    topColor: blendBandColor(normalizedWeights, 'topColor'),
    midColor: blendBandColor(normalizedWeights, 'midColor'),
    bottomColor: blendBandColor(normalizedWeights, 'bottomColor'),
    glowColor: blendBandColor(normalizedWeights, 'glowColor'),
    accentColor: blendBandColor(normalizedWeights, 'accentColor'),
    alertColor: blendBandColor(normalizedWeights, 'alertColor'),
    dustColor: blendBandColor(normalizedWeights, 'dustColor'),
    gridStrength: blendBandValue(normalizedWeights, 'gridStrength'),
    panelStrength: blendBandValue(normalizedWeights, 'panelStrength'),
    pipeStrength: blendBandValue(normalizedWeights, 'pipeStrength'),
    ruinStrength: blendBandValue(normalizedWeights, 'ruinStrength'),
    magmaStrength: blendBandValue(normalizedWeights, 'magmaStrength'),
    alienStrength: blendBandValue(normalizedWeights, 'alienStrength'),
    chevronStrength: blendBandValue(normalizedWeights, 'chevronStrength'),
    instability: blendBandValue(normalizedWeights, 'instability'),
    particleStrength: blendBandValue(normalizedWeights, 'particleStrength'),
    ringStrength: blendBandValue(normalizedWeights, 'ringStrength'),
    cityGlowStrength: blendBandValue(normalizedWeights, 'cityGlowStrength'),
    zoneWeights: {
      surface: normalizedWeights[0],
      maintenance: normalizedWeights[1],
      ruins: normalizedWeights[2],
      magma: normalizedWeights[3],
      interface: normalizedWeights[4],
      alien: normalizedWeights[5],
      core: normalizedWeights[6],
    },
  };
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function getDifficultyConfig() {
  return DIFFICULTY_LEVELS[game.difficulty] || DIFFICULTY_LEVELS.normal;
}

function getMusicMode() {
  return !game.started && !game.running && !game.gameOver ? 'title' : 'game';
}

function getSoundtrackSection(barIndex) {
  if (barIndex < 8) {
    return 'intro';
  }

  if (barIndex < 16) {
    return 'cruise';
  }

  if (barIndex < 24) {
    return 'bridge';
  }

  return 'finale';
}

function getSectionPattern(patternMap, sectionName, barIndex) {
  const patterns = patternMap[sectionName];
  return patterns[barIndex % patterns.length];
}

function resolveArpNote(chord, index) {
  const toneIndex = index % chord.tones.length;
  const octave = Math.floor(index / chord.tones.length);
  return chord.tones[toneIndex] + octave * 12;
}

function resetSoundtrackSequence() {
  if (!soundtrack.context) {
    return;
  }

  soundtrack.currentStep = 0;
  soundtrack.nextNoteTime = soundtrack.context.currentTime + 0.06;
}

function setMusicButtonState() {
  musicButton.textContent = soundtrack.enabled ? 'Music On' : 'Music Off';
  musicButton.setAttribute('aria-pressed', String(soundtrack.enabled));
}

function isImmersiveModeActive() {
  return document.body.classList.contains('immersive-mode');
}

function setImmersiveMode(isActive) {
  document.body.classList.toggle('immersive-mode', isActive);
}

function setImmersiveButtonState() {
  const isFullscreen = document.fullscreenElement === screenPanel;
  const isImmersive = isImmersiveModeActive() || isFullscreen;
  immersiveButton.textContent = isImmersive ? 'Minimize' : 'Maximize';
  immersiveButton.setAttribute('aria-pressed', String(isImmersive));
}

function setDifficultyControlState() {
  difficultySelect.value = game.difficulty;
}

function setVolumeControlState() {
  const volumePercent = Math.round(soundtrack.userVolume * 100);
  volumeSlider.value = String(volumePercent);
  volumeValue.textContent = `${volumePercent}%`;
}

function createNoiseBuffer(audioContext) {
  const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.18, audioContext.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < channel.length; index += 1) {
    channel[index] = Math.random() * 2 - 1;
  }

  return buffer;
}

function ensureSoundtrack() {
  if (soundtrack.isInitialized) {
    return soundtrack.context;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    musicButton.disabled = true;
    musicButton.textContent = 'No Audio';
    return null;
  }

  const audioContext = new AudioContextClass();
  const masterGain = audioContext.createGain();
  const musicGain = audioContext.createGain();
  const sfxGain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.value = 2550;
  filter.Q.value = 0.8;

  masterGain.gain.value = 0.0001;
  musicGain.gain.value = soundtrack.userVolume * MUSIC_GAIN_MULTIPLIER;
  sfxGain.gain.value = 0.4;

  musicGain.connect(filter);
  sfxGain.connect(masterGain);
  filter.connect(masterGain);
  masterGain.connect(audioContext.destination);

  soundtrack.context = audioContext;
  soundtrack.masterGain = masterGain;
  soundtrack.musicGain = musicGain;
  soundtrack.sfxGain = sfxGain;
  soundtrack.filter = filter;
  soundtrack.noiseBuffer = createNoiseBuffer(audioContext);
  soundtrack.isInitialized = true;

  resetSoundtrackSequence();
  startSoundtrackScheduler();
  updateSoundtrackMix();

  return audioContext;
}

function startSoundtrackScheduler() {
  if (soundtrack.schedulerId || !soundtrack.context) {
    return;
  }

  soundtrack.schedulerId = window.setInterval(() => {
    if (!soundtrack.context) {
      return;
    }

    while (soundtrack.nextNoteTime < soundtrack.context.currentTime + 0.18) {
      scheduleSoundtrackStep(soundtrack.currentStep, soundtrack.nextNoteTime);
      soundtrack.nextNoteTime += 60 / soundtrack.tempo / 4;
      soundtrack.currentStep = (soundtrack.currentStep + 1) % LOOP_STEPS;
    }
  }, 50);
}

function scheduleSoundtrackStep(step, time) {
  if (!soundtrack.context || !soundtrack.enabled) {
    return;
  }

  if (getMusicMode() === 'title') {
    scheduleTitleStep(step % TITLE_LOOP_STEPS, time);
    return;
  }

  const barIndex = Math.floor(step / STEPS_PER_BAR) % LOOP_BARS;
  const stepInBar = step % STEPS_PER_BAR;
  const sectionName = getSoundtrackSection(barIndex);
  const chord = LOOP_CHORDS[barIndex];
  const bassPattern = getSectionPattern(BASS_PATTERNS, sectionName, barIndex);
  const arpPattern = ARP_PATTERNS[sectionName];
  const leadPattern = LEAD_PATTERNS[sectionName];
  const drums = DRUM_PATTERNS[sectionName];
  const bassOffset = bassPattern[stepInBar];
  const arpIndex = arpPattern[stepInBar];
  const leadOffset = leadPattern[stepInBar];

  if (stepInBar === 0) {
    playPadChord(chord.tones, time, sectionName === 'intro' ? 1.6 : 1.15, sectionName === 'bridge');
  }

  if (sectionName === 'finale' && stepInBar === 8) {
    playPadChord(chord.tones, time, 0.75, false);
  }

  if (bassOffset !== null) {
    playBassNote(chord.root + bassOffset, time, sectionName === 'intro' ? 0.24 : 0.28, sectionName);
  }

  if (arpIndex !== null) {
    playArpNote(resolveArpNote(chord, arpIndex), time, sectionName === 'finale' ? 0.13 : 0.1, sectionName);
  }

  if (leadOffset !== null && sectionName !== 'intro') {
    playLeadNote(chord.root + leadOffset, time, sectionName === 'bridge' ? 0.2 : 0.16, sectionName === 'finale' ? 0.1 : 0.085);
  }

  if (drums.kick[stepInBar] === 'x') {
    playKick(time);
  }

  if (drums.snare[stepInBar] === 'x') {
    playSnare(time, sectionName);
  }

  if (drums.hat[stepInBar] === 'x') {
    playHat(time, stepInBar % 2 === 0 ? 0.045 : 0.03, sectionName);
  }
}

function scheduleTitleStep(step, time) {
  const barIndex = Math.floor(step / STEPS_PER_BAR) % TITLE_LOOP_BARS;
  const stepInBar = step % STEPS_PER_BAR;
  const chord = TITLE_CHORDS[barIndex];
  const bassPattern = TITLE_BASS_PATTERNS[barIndex % TITLE_BASS_PATTERNS.length];
  const leadPattern = TITLE_LEAD_PATTERNS[barIndex % TITLE_LEAD_PATTERNS.length];
  const bassOffset = bassPattern[stepInBar];
  const arpIndex = TITLE_ARP_PATTERN[stepInBar];
  const leadOffset = leadPattern[stepInBar];

  if (stepInBar === 0) {
    playPadChord(chord.tones, time, 1.9, false);
  }

  if (stepInBar === 8) {
    playPadChord([chord.tones[1], chord.tones[2], chord.tones[0] + 12], time, 0.95, true);
  }

  if (bassOffset !== null) {
    playBassNote(chord.root + bassOffset, time, 0.34, 'title');
  }

  if (arpIndex !== null) {
    playArpNote(resolveArpNote(chord, arpIndex), time, 0.14, 'title');
  }

  if (leadOffset !== null) {
    playLeadNote(chord.root + leadOffset, time, 0.22, 0.075);
  }

  if (TITLE_DRUMS.kick[stepInBar] === 'x') {
    playKick(time);
  }

  if (TITLE_DRUMS.snare[stepInBar] === 'x' && barIndex >= 2) {
    playSnare(time, 'title');
  }

  if (TITLE_DRUMS.hat[stepInBar] === 'x') {
    playHat(time, 0.05, 'title');
  }
}

function createVoice(type, frequency, time, duration, volume, detune = 0) {
  const oscillator = soundtrack.context.createOscillator();
  const gain = soundtrack.context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.detune.setValueAtTime(detune, time);

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), time + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  oscillator.connect(gain);
  gain.connect(soundtrack.musicGain);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.02);
}

function createSfxVoice(type, frequency, time, duration, volume, sweepTo = frequency) {
  const oscillator = soundtrack.context.createOscillator();
  const gain = soundtrack.context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, time);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), time + duration);

  gain.gain.setValueAtTime(Math.max(0.0001, volume), time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  oscillator.connect(gain);
  gain.connect(soundtrack.sfxGain);
  oscillator.start(time);
  oscillator.stop(time + duration + 0.03);
}

function playLeadNote(note, time, duration, volume) {
  createVoice('square', midiToFrequency(note), time, duration, volume, -4);
  createVoice('square', midiToFrequency(note + 12), time, duration * 0.75, volume * 0.42, 4);
}

function playBassNote(note, time, duration, sectionName) {
  const filter = soundtrack.context.createBiquadFilter();
  const gain = soundtrack.context.createGain();
  const subOscillator = soundtrack.context.createOscillator();
  const bodyOscillator = soundtrack.context.createOscillator();
  const targetVolume = sectionName === 'title' ? 0.135 : sectionName === 'intro' ? 0.12 : 0.16;

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(sectionName === 'title' ? 680 : sectionName === 'bridge' ? 520 : 760, time);
  filter.Q.value = 1.2;

  gain.gain.setValueAtTime(0.0001, time);
  gain.gain.exponentialRampToValueAtTime(targetVolume, time + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  subOscillator.type = 'triangle';
  subOscillator.frequency.setValueAtTime(midiToFrequency(note - 24), time);
  bodyOscillator.type = 'sawtooth';
  bodyOscillator.frequency.setValueAtTime(midiToFrequency(note - 12), time);
  bodyOscillator.detune.setValueAtTime(4, time);

  subOscillator.connect(filter);
  bodyOscillator.connect(filter);
  filter.connect(gain);
  gain.connect(soundtrack.musicGain);

  subOscillator.start(time);
  bodyOscillator.start(time);
  subOscillator.stop(time + duration + 0.05);
  bodyOscillator.stop(time + duration + 0.05);
}

function playArpNote(note, time, duration, sectionName) {
  const volume = sectionName === 'title' ? 0.04 : sectionName === 'intro' ? 0.03 : sectionName === 'finale' ? 0.055 : 0.045;
  createVoice('square', midiToFrequency(note + 12), time, duration, volume, -2);
  createVoice('triangle', midiToFrequency(note), time, duration * 0.9, volume * 0.5, 2);
}

function playPadChord(chord, time, duration, muted) {
  chord.forEach((note, index) => {
    createVoice('sawtooth', midiToFrequency(note), time, duration, muted ? 0.018 : 0.024, index * 4 - 4);
    createVoice('triangle', midiToFrequency(note - 12), time, duration * 0.85, muted ? 0.012 : 0.016, 0);
  });
}

function playKick(time) {
  const oscillator = soundtrack.context.createOscillator();
  const gain = soundtrack.context.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(112, time);
  oscillator.frequency.exponentialRampToValueAtTime(42, time + 0.12);

  gain.gain.setValueAtTime(0.22, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);

  oscillator.connect(gain);
  gain.connect(soundtrack.musicGain);
  oscillator.start(time);
  oscillator.stop(time + 0.16);
}

function playSnare(time, sectionName) {
  const source = soundtrack.context.createBufferSource();
  const filter = soundtrack.context.createBiquadFilter();
  const gain = soundtrack.context.createGain();

  source.buffer = soundtrack.noiseBuffer;
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(sectionName === 'bridge' ? 1600 : sectionName === 'title' ? 1500 : 1900, time);
  gain.gain.setValueAtTime(sectionName === 'finale' ? 0.16 : sectionName === 'title' ? 0.11 : 0.13, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(soundtrack.musicGain);
  source.start(time);
  source.stop(time + 0.13);
}

function playHat(time, duration, sectionName) {
  const source = soundtrack.context.createBufferSource();
  const filter = soundtrack.context.createBiquadFilter();
  const gain = soundtrack.context.createGain();

  source.buffer = soundtrack.noiseBuffer;
  filter.type = 'highpass';
  filter.frequency.setValueAtTime(sectionName === 'intro' ? 4200 : sectionName === 'title' ? 4600 : 5600, time);
  gain.gain.setValueAtTime(sectionName === 'intro' ? 0.026 : sectionName === 'title' ? 0.03 : 0.04, time);
  gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(soundtrack.musicGain);
  source.start(time);
  source.stop(time + duration + 0.01);
}

function playGameOverSound() {
  activateSoundtrack().catch((error) => {
    console.error('Audio activation failed', error);
  });

  if (!soundtrack.context || !soundtrack.sfxGain || !soundtrack.noiseBuffer) {
    return;
  }

  const startTime = soundtrack.context.currentTime + 0.02;
  const notes = [
    { note: 76, offset: 0, duration: 0.11 },
    { note: 71, offset: 0.12, duration: 0.12 },
    { note: 67, offset: 0.25, duration: 0.14 },
    { note: 62, offset: 0.4, duration: 0.26 },
  ];

  notes.forEach(({ note, offset, duration }, index) => {
    const when = startTime + offset;
    createSfxVoice('square', midiToFrequency(note), when, duration, 0.18 - index * 0.02, midiToFrequency(note - 7));
    createSfxVoice('triangle', midiToFrequency(note - 12), when, duration * 1.1, 0.1 - index * 0.01, midiToFrequency(note - 19));
  });

  const noiseSource = soundtrack.context.createBufferSource();
  const noiseFilter = soundtrack.context.createBiquadFilter();
  const noiseGain = soundtrack.context.createGain();

  noiseSource.buffer = soundtrack.noiseBuffer;
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(820, startTime + 0.37);
  noiseGain.gain.setValueAtTime(0.0001, startTime + 0.35);
  noiseGain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.38);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.72);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(soundtrack.sfxGain);
  noiseSource.start(startTime + 0.35);
  noiseSource.stop(startTime + 0.74);
}

function updateSoundtrackMix() {
  if (!soundtrack.masterGain || !soundtrack.filter || !soundtrack.context) {
    return;
  }

  const now = soundtrack.context.currentTime;
  let targetGain = 0.0001;
  let targetFilter = 1750;
  soundtrack.tempo = getMusicMode() === 'title' ? 92 : 102;

  if (soundtrack.enabled) {
    if (getMusicMode() === 'title') {
      targetGain = 0.22;
      targetFilter = 2850;
    } else if (game.running) {
      targetGain = 0.32;
      targetFilter = 3600;
    } else if (game.paused) {
      targetGain = 0.17;
      targetFilter = 2100;
    } else if (game.gameOver) {
      targetGain = 0.15;
      targetFilter = 1900;
    } else {
      targetGain = 0.2;
      targetFilter = 2500;
    }
  }

  soundtrack.masterGain.gain.cancelScheduledValues(now);
  soundtrack.masterGain.gain.setTargetAtTime(targetGain, now, 0.08);
  soundtrack.filter.frequency.cancelScheduledValues(now);
  soundtrack.filter.frequency.setTargetAtTime(targetFilter, now, 0.12);
}

async function activateSoundtrack() {
  if (!soundtrack.enabled) {
    return;
  }

  const audioContext = ensureSoundtrack();

  if (!audioContext) {
    return;
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  updateSoundtrackMix();
}

async function toggleImmersiveMode() {
  const shouldEnable = !(isImmersiveModeActive() || document.fullscreenElement === screenPanel);

  try {
    if (shouldEnable) {
      setImmersiveMode(true);
      if (document.fullscreenEnabled) {
        await screenPanel.requestFullscreen();
      }
    } else {
      setImmersiveMode(false);
      if (document.fullscreenElement === screenPanel) {
        await document.exitFullscreen();
      }
    }
  } catch (error) {
    setImmersiveMode(shouldEnable);
    console.error('Fullscreen toggle failed', error);
  } finally {
    setImmersiveButtonState();
  }
}

function toggleMusicEnabled() {
  soundtrack.enabled = !soundtrack.enabled;
  saveMusicEnabled(soundtrack.enabled);
  setMusicButtonState();

  if (soundtrack.enabled) {
    activateSoundtrack().catch((error) => {
      console.error('Audio activation failed', error);
    });
  } else {
    updateSoundtrackMix();
  }
}

function setMusicVolume(value) {
  soundtrack.userVolume = clamp(value, 0, 1);
  saveMusicVolume(soundtrack.userVolume);
  setVolumeControlState();

  if (soundtrack.musicGain && soundtrack.context) {
    soundtrack.musicGain.gain.setTargetAtTime(
      soundtrack.userVolume * MUSIC_GAIN_MULTIPLIER,
      soundtrack.context.currentTime,
      0.05
    );
  }
}

function currentGapWidth() {
  const config = getDifficultyConfig();
  return clamp(
    config.baseGapWidth - game.score * config.gapShrinkRate,
    config.minGapWidth,
    config.baseGapWidth
  );
}

function createFloor(y, difficultyIndex) {
  const gapWidth = currentGapWidth();
  const margin = 26;
  const minGapX = margin;
  const maxGapX = GAME_WIDTH - gapWidth - margin;
  const lateSpread = clamp((game.level - 50) / 28, 0, 1);
  const phase = (difficultyIndex + game.score * 0.012) * (0.85 + lateSpread * 0.45);
  let wave = Math.sin(phase) * 0.5 + 0.5;

  if (lateSpread > 0) {
    wave = wave < 0.5
      ? wave * (1 - lateSpread * 0.68)
      : 1 - (1 - wave) * (1 - lateSpread * 0.68);
  }

  const gapX = lerp(minGapX, maxGapX, wave);
  const hueOffset = difficultyIndex % 2 === 0 ? 0 : 28;

  return {
    y,
    thickness: FLOOR_THICKNESS,
    gapX,
    gapWidth,
    glow: hueOffset,
  };
}

function shiftWorldUp(amount) {
  if (amount <= 0) {
    return;
  }

  game.floors.forEach((floor) => {
    floor.y -= amount;
  });

  game.ball.y -= amount;
}

function resetFloors() {
  game.floors = [];
  const lowestStartY = GAME_HEIGHT - 62 + FLOOR_BUFFER_BELOW * FLOOR_SPACING;

  for (let index = 0; index < FLOOR_COUNT; index += 1) {
    const y = lowestStartY - index * FLOOR_SPACING;
    game.floors.push(createFloor(y, index));
  }
}

function resetGame() {
  const config = getDifficultyConfig();
  game.started = false;
  game.running = false;
  game.paused = false;
  game.gameOver = false;
  game.score = 0;
  game.level = 1;
  game.scrollSpeed = config.baseScrollSpeed;
  game.catchUpSpeed = 0;
  game.elapsed = 0;
  game.lastTimestamp = 0;
  game.ball = createBall();
  game.trail = [];
  resetFloors();
  updateHud();
  setStatus('Standby');
  setSummary(`The grid is idle. ${config.label} mode is armed. Start a run to initialize the lane generator.`);
  showOverlay('Tap Screen To Start', 'Drop Through The Grid', 'Thread the glowing gaps. Tap the playfield to start, pause, or resume the run.');
  startButton.textContent = 'Start Run';
  pauseButton.textContent = 'Pause';
  pauseButton.disabled = true;
  resetSoundtrackSequence();
  updateSoundtrackMix();
}

function startGame(forceReset = false) {
  const config = getDifficultyConfig();
  if (game.running && !forceReset) {
    return;
  }

  if (forceReset || game.gameOver || !game.started) {
    game.score = 0;
    game.level = 1;
    game.scrollSpeed = config.baseScrollSpeed;
    game.catchUpSpeed = 0;
    game.elapsed = 0;
    game.ball = createBall();
    game.trail = [];
    resetFloors();
  }

  game.started = true;
  game.running = true;
  game.paused = false;
  game.gameOver = false;
  game.lastTimestamp = 0;
  setStatus('Live');
  setSummary(`Run active on ${config.label} mode. Floors are rising faster and the grid will keep tightening as score climbs.`);
  hideOverlay();
  startButton.textContent = 'Restart Run';
  pauseButton.textContent = 'Pause';
  pauseButton.disabled = false;
  resetSoundtrackSequence();
  activateSoundtrack().catch((error) => {
    console.error('Audio activation failed', error);
  });
  updateSoundtrackMix();
}

function pauseGame() {
  if ((!game.running && !game.paused) || game.gameOver) {
    return;
  }

  game.paused = !game.paused;
  game.running = !game.paused;
  game.lastTimestamp = 0;

  if (game.paused) {
    setStatus('Paused');
    setSummary('Run paused. Resume when you are ready to drop back into the grid.');
    showOverlay('Signal Hold', 'Run Paused', 'Tap the playfield again to resume and keep descending through the openings.');
    pauseButton.textContent = 'Resume';
  } else {
    setStatus('Live');
    setSummary('Run resumed. The scroll speed continues to ramp with your score.');
    hideOverlay();
    pauseButton.textContent = 'Pause';
  }

  updateSoundtrackMix();
}

function endGame(reason) {
  game.running = false;
  game.paused = false;
  game.gameOver = true;

  const finalScore = Math.ceil(game.score);

  if (finalScore > game.best) {
    game.best = finalScore;
    saveBestScore(game.best);
  }

  updateHud();
  setStatus('Terminated');
  setSummary(`Run ended at ${finalScore} points. ${reason}`);
  showOverlay('Run Lost', `Score ${finalScore}`, reason);
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
  playGameOverSound();
  updateSoundtrackMix();
}

function setStatus(text) {
  statusText.textContent = text;
}

function setSummary(text) {
  runSummary.textContent = text;
}

function showOverlay(label, title, copy) {
  overlayLabel.textContent = label;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlay.hidden = false;
}

function hideOverlay() {
  overlay.hidden = true;
}

function updateHud() {
  const config = getDifficultyConfig();
  scoreValue.textContent = String(Math.ceil(game.score));
  bestValue.textContent = String(game.best);
  levelValue.textContent = String(game.level);
  speedValue.textContent = `${(game.scrollSpeed / config.baseScrollSpeed).toFixed(1)}x`;
}

function setCanvasResolution() {
  const ratio = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(GAME_WIDTH * ratio);
  canvas.height = Math.round(GAME_HEIGHT * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function updateInputAxis(deltaTime) {
  const config = getDifficultyConfig();
  const horizontalIntent = (inputState.right ? 1 : 0) - (inputState.left ? 1 : 0);

  if (horizontalIntent !== 0) {
    game.ball.vx += horizontalIntent * config.moveAcceleration * deltaTime;
  } else {
    const damping = Math.exp(-BALL_DRAG * deltaTime);
    game.ball.vx *= damping;
  }

  game.ball.vx = clamp(game.ball.vx, -config.maxHorizontalSpeed, config.maxHorizontalSpeed);
}

function recycleFloors() {
  let nextSpawnY = Math.max(...game.floors.map((floor) => floor.y)) + FLOOR_SPACING;
  let recycledCount = 0;

  game.floors.forEach((floor) => {
    if (floor.y + floor.thickness < -24) {
      Object.assign(floor, createFloor(nextSpawnY, game.level + recycledCount));
      nextSpawnY += FLOOR_SPACING;
      recycledCount += 1;
    }
  });
}

function updateDifficulty() {
  const config = getDifficultyConfig();
  game.level = Math.floor(game.score / 160) + 1;
  const post25Levels = Math.max(0, game.level - 25);
  const post50Levels = Math.max(0, game.level - 50);
  const effectiveMaxScrollSpeed = config.maxScrollSpeed + post25Levels * 4 + post50Levels * 6;
  const intensity = clamp(
    game.score * config.scrollRamp + post25Levels * 5 + post50Levels * 8,
    0,
    effectiveMaxScrollSpeed - config.baseScrollSpeed
  );
  game.scrollSpeed = config.baseScrollSpeed + intensity;
}

function updateTrail() {
  game.trail.unshift({ x: game.ball.x, y: game.ball.y });
  game.trail = game.trail.slice(0, 8);
}

function resolveFloorCollisions(previousY, scrollStep) {
  const ballLeft = game.ball.x - BALL_RADIUS;
  const ballRight = game.ball.x + BALL_RADIUS;

  for (const floor of game.floors) {
    const gapStart = floor.gapX;
    const gapEnd = floor.gapX + floor.gapWidth;
    const inSolidColumn = ballLeft < gapStart || ballRight > gapEnd;
    const previousBottom = previousY + BALL_RADIUS;
    const currentBottom = game.ball.y + BALL_RADIUS;
    const previousTop = previousY - BALL_RADIUS;
    const currentTop = game.ball.y - BALL_RADIUS;
    const rowTop = floor.y;
    const rowBottom = floor.y + floor.thickness;
    const rowTopBeforeScroll = rowTop + scrollStep;
    const rowBottomBeforeScroll = rowBottom + scrollStep;

    if (inSolidColumn && previousBottom <= rowTopBeforeScroll && currentBottom >= rowTop) {
      game.ball.y = rowTop - BALL_RADIUS;
      game.ball.vy = Math.min(game.ball.vy, 0);
      return;
    }

    const intersectsVertically = game.ball.y + BALL_RADIUS > rowTop && game.ball.y - BALL_RADIUS < rowBottom;
    const cameFromBelow = previousTop >= rowBottomBeforeScroll && currentTop <= rowBottom;

    if (inSolidColumn && intersectsVertically && cameFromBelow) {
      game.ball.y = rowBottom + BALL_RADIUS;
      game.ball.vy = Math.max(game.ball.vy, 80);
      return;
    }
  }
}

function updateGame(deltaTime) {
  updateDifficulty();
  const estimatedTravel =
    game.scrollSpeed * deltaTime +
    Math.abs(game.ball.vy) * deltaTime +
    0.5 * GRAVITY * deltaTime * deltaTime;
  const substeps = clamp(
    Math.ceil(estimatedTravel / MAX_PHYSICS_TRAVEL_PER_STEP),
    1,
    MAX_PHYSICS_SUBSTEPS
  );
  const stepDelta = deltaTime / substeps;

  for (let step = 0; step < substeps; step += 1) {
    const scrollStep = game.scrollSpeed * stepDelta;

    game.floors.forEach((floor) => {
      floor.y -= scrollStep;
    });

    recycleFloors();
    updateInputAxis(stepDelta);

    game.ball.vy += GRAVITY * stepDelta;
    const previousY = game.ball.y;

    game.ball.x += game.ball.vx * stepDelta;
    game.ball.y += game.ball.vy * stepDelta;

    game.ball.x = clamp(game.ball.x, BALL_RADIUS, GAME_WIDTH - BALL_RADIUS);
    resolveFloorCollisions(previousY, scrollStep);

    const rescueLine = GAME_HEIGHT - FLOOR_SPACING * 1.18;
    const visibleLine = GAME_HEIGHT - BALL_RADIUS * 1.35;
    const rescueOverflow = Math.max(0, game.ball.y - rescueLine);

    if (rescueOverflow > 0) {
      const targetCatchUpSpeed = rescueOverflow * 10 + game.scrollSpeed * 0.55;
      const catchUpBlend = 1 - Math.exp(-8 * stepDelta);
      const minimumVisibleShift = Math.max(0, game.ball.y - visibleLine);

      game.catchUpSpeed = lerp(game.catchUpSpeed, targetCatchUpSpeed, catchUpBlend);

      shiftWorldUp(
        Math.max(
          minimumVisibleShift,
          Math.min(rescueOverflow, game.catchUpSpeed * stepDelta)
        )
      );
      recycleFloors();
    } else if (game.catchUpSpeed > 0.1) {
      game.catchUpSpeed *= Math.exp(-10 * stepDelta);
    }

    if (game.ball.y - BALL_RADIUS <= 0) {
      endGame('You were pinned against the ceiling by the rising grid.');
      break;
    }
  }

  updateTrail();

  if (game.gameOver) {
    return;
  }

  game.elapsed += deltaTime;
  game.score += deltaTime * getDifficultyConfig().scoreRate;
}

function drawChevronStrip(x, y, width, height, color, alpha, reverse = false) {
  if (width <= 0 || height <= 0) {
    return;
  }

  const segment = Math.max(10, width / 4.5);
  context.save();
  context.fillStyle = rgbToString(color, alpha);

  for (let offset = -segment; offset < width + segment; offset += segment * 1.18) {
    const startX = reverse ? x + width - offset : x + offset;
    context.beginPath();
    context.moveTo(startX, y);
    context.lineTo(startX + segment * (reverse ? -0.9 : 0.9), y);
    context.lineTo(startX + segment * (reverse ? -0.32 : 0.32), y + height * 0.5);
    context.lineTo(startX + segment * (reverse ? -0.9 : 0.9), y + height);
    context.lineTo(startX, y + height);
    context.closePath();
    context.fill();
  }

  context.restore();
}

function drawWorldGradient(theme, time) {
  const bgGradient = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  bgGradient.addColorStop(0, rgbToString(theme.topColor));
  bgGradient.addColorStop(0.46, rgbToString(theme.midColor));
  bgGradient.addColorStop(1, rgbToString(theme.bottomColor));
  context.fillStyle = bgGradient;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const upperGlow = context.createRadialGradient(
    GAME_WIDTH * 0.5,
    -20,
    0,
    GAME_WIDTH * 0.5,
    0,
    GAME_WIDTH * 0.88
  );
  upperGlow.addColorStop(0, rgbToString(theme.glowColor, 0.18 + theme.cityGlowStrength * 0.16));
  upperGlow.addColorStop(1, rgbToString(theme.glowColor, 0));
  context.fillStyle = upperGlow;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.42);

  const lowerGlow = context.createRadialGradient(
    GAME_WIDTH * 0.5,
    GAME_HEIGHT + 40,
    8,
    GAME_WIDTH * 0.5,
    GAME_HEIGHT,
    GAME_WIDTH
  );
  const coreBlend = theme.zoneWeights.core;
  const geothermalColor = mixRgb(theme.alertColor, theme.glowColor, 0.32 + coreBlend * 0.4);
  lowerGlow.addColorStop(0, rgbToString(geothermalColor, 0.12 + theme.magmaStrength * 0.18 + coreBlend * 0.28));
  lowerGlow.addColorStop(1, rgbToString(geothermalColor, 0));
  context.fillStyle = lowerGlow;
  context.fillRect(0, GAME_HEIGHT * 0.2, GAME_WIDTH, GAME_HEIGHT * 0.8);

  if (theme.gridStrength > 0.03) {
    context.save();
    context.globalAlpha = 0.05 + theme.gridStrength * 0.12;
    context.strokeStyle = rgbToString(mixRgb(theme.glowColor, theme.accentColor, 0.2), 1);
    context.lineWidth = 1;

    for (let x = 0; x <= GAME_WIDTH; x += 24) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, GAME_HEIGHT);
      context.stroke();
    }

    for (let y = ((time * 42) % 24) - 24; y <= GAME_HEIGHT + 24; y += 24) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(GAME_WIDTH, y);
      context.stroke();
    }

    context.restore();
  }
}

function drawFarShaft(theme, time) {
  const humanWeight = theme.zoneWeights.surface + theme.zoneWeights.maintenance + theme.zoneWeights.ruins;
  const sideShade = mixRgb(theme.bottomColor, [0, 0, 0], 0.58);
  const vignette = context.createLinearGradient(0, 0, GAME_WIDTH, 0);
  vignette.addColorStop(0, rgbToString(sideShade, 0.72));
  vignette.addColorStop(0.18, rgbToString(sideShade, 0.22));
  vignette.addColorStop(0.5, rgbToString(theme.bottomColor, 0.03));
  vignette.addColorStop(0.82, rgbToString(sideShade, 0.22));
  vignette.addColorStop(1, rgbToString(sideShade, 0.72));
  context.fillStyle = vignette;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const structuralColor = mixRgb(theme.midColor, theme.glowColor, 0.24);
  const panelColor = mixRgb(theme.midColor, theme.alertColor, 0.2);
  const speed = 16 + theme.instability * 34;

  for (let index = 0; index < 8; index += 1) {
    const seed = index * 13.7 + 4.2;
    const y = ((index * 98 + time * speed) % (GAME_HEIGHT + 140)) - 140;
    const leftWidth = 28 + randomFromSeed(seed) * 36 + theme.panelStrength * 18;
    const rightWidth = 28 + randomFromSeed(seed + 2) * 36 + theme.panelStrength * 18;
    const blockHeight = 26 + randomFromSeed(seed + 3) * 30 + theme.ruinStrength * 18;

    context.fillStyle = rgbToString(panelColor, 0.08 + theme.panelStrength * 0.18);
    context.fillRect(0, y, leftWidth, blockHeight);
    context.fillRect(GAME_WIDTH - rightWidth, y, rightWidth, blockHeight);

    if (theme.chevronStrength > 0.04) {
      drawChevronStrip(0, y + 3, Math.min(leftWidth, 56), blockHeight - 6, theme.alertColor, 0.05 + theme.chevronStrength * 0.12);
      drawChevronStrip(
        GAME_WIDTH - Math.min(rightWidth, 56),
        y + 3,
        Math.min(rightWidth, 56),
        blockHeight - 6,
        theme.alertColor,
        0.05 + theme.chevronStrength * 0.12,
        true
      );
    }
  }

  if (theme.pipeStrength > 0.05) {
    context.save();
    context.strokeStyle = rgbToString(structuralColor, 0.08 + theme.pipeStrength * 0.18);
    context.lineWidth = 2;

    [34, 52, 74, GAME_WIDTH - 34, GAME_WIDTH - 52, GAME_WIDTH - 74].forEach((x, index) => {
      context.beginPath();
      context.moveTo(x, -20);
      context.lineTo(x, GAME_HEIGHT + 20);
      context.stroke();

      for (let joint = 0; joint < 8; joint += 1) {
        const y = ((joint * 88 + time * (18 + index * 2)) % (GAME_HEIGHT + 60)) - 30;
        context.beginPath();
        context.moveTo(x - 8, y);
        context.lineTo(x + 8, y);
        context.stroke();
      }
    });

    context.restore();
  }

  if (humanWeight > 0.1 || theme.ringStrength > 0.12) {
    context.save();
    context.strokeStyle = rgbToString(mixRgb(theme.glowColor, theme.accentColor, 0.4), 0.06 + theme.ringStrength * 0.12);
    context.lineWidth = 2;

    for (let index = 0; index < 5; index += 1) {
      const seed = index * 7.11 + 0.8;
      const y = ((index * 144 + time * (12 + theme.instability * 8)) % (GAME_HEIGHT + 220)) - 110;
      const radiusX = 108 + randomFromSeed(seed) * 70 + theme.zoneWeights.alien * 26;
      const radiusY = 22 + randomFromSeed(seed + 1) * 18 + theme.zoneWeights.alien * 12;
      context.beginPath();
      context.ellipse(GAME_WIDTH * 0.5, y, radiusX, radiusY, 0, 0, Math.PI * 2);
      context.stroke();
    }

    context.restore();
  }
}

function drawRuinsAndTransit(theme, time) {
  if (theme.ruinStrength <= 0.04) {
    return;
  }

  context.save();
  context.strokeStyle = rgbToString(mixRgb(theme.alertColor, theme.dustColor, 0.45), 0.08 + theme.ruinStrength * 0.16);
  context.lineWidth = 2;

  for (let index = 0; index < 4; index += 1) {
    const y = ((index * 172 + time * 14) % (GAME_HEIGHT + 220)) - 120;
    context.beginPath();
    context.moveTo(36, y + 46);
    context.quadraticCurveTo(GAME_WIDTH * 0.5, y - 34, GAME_WIDTH - 36, y + 46);
    context.stroke();

    context.beginPath();
    context.moveTo(58, y + 62);
    context.lineTo(118, y + 22);
    context.lineTo(158, y + 62);
    context.moveTo(GAME_WIDTH - 58, y + 62);
    context.lineTo(GAME_WIDTH - 118, y + 22);
    context.lineTo(GAME_WIDTH - 158, y + 62);
    context.stroke();
  }

  context.restore();
}

function drawMagmaLayer(theme, time) {
  if (theme.magmaStrength <= 0.03) {
    return;
  }

  const lavaColor = mixRgb(theme.alertColor, theme.glowColor, 0.2);
  const crackColor = mixRgb(theme.glowColor, theme.accentColor, 0.18);
  const heatGradient = context.createLinearGradient(0, GAME_HEIGHT * 0.4, 0, GAME_HEIGHT);
  heatGradient.addColorStop(0, rgbToString(lavaColor, 0));
  heatGradient.addColorStop(1, rgbToString(lavaColor, 0.1 + theme.magmaStrength * 0.24));
  context.fillStyle = heatGradient;
  context.fillRect(0, GAME_HEIGHT * 0.35, GAME_WIDTH, GAME_HEIGHT * 0.65);

  for (let index = 0; index < 5; index += 1) {
    const seed = index * 9.7 + 6.2;
    const startX = 32 + randomFromSeed(seed) * (GAME_WIDTH - 64);
    const depth = 150 + randomFromSeed(seed + 1) * 210 + theme.zoneWeights.core * 90;

    context.beginPath();
    context.moveTo(startX, GAME_HEIGHT + 10);
    for (let step = 0; step <= 6; step += 1) {
      const progress = step / 6;
      const y = GAME_HEIGHT - depth * progress;
      const wobble = Math.sin(time * (1.6 + randomFromSeed(seed + 2) * 1.2) + step * 0.8 + seed) * (8 + theme.magmaStrength * 10);
      const x = startX + wobble + (randomFromSeed(seed + step + 3) - 0.5) * 24;
      context.lineTo(x, y);
    }
    context.lineTo(startX + 12, GAME_HEIGHT + 10);
    context.closePath();
    context.fillStyle = rgbToString(crackColor, 0.08 + theme.magmaStrength * 0.14);
    context.fill();
  }

  context.save();
  context.strokeStyle = rgbToString(mixRgb(lavaColor, [255, 255, 255], 0.16), 0.12 + theme.magmaStrength * 0.16);
  context.lineWidth = 1.5;
  for (let index = 0; index < 6; index += 1) {
    const yBase = GAME_HEIGHT - 40 - index * 24;
    context.beginPath();
    for (let x = 0; x <= GAME_WIDTH; x += 18) {
      const wave = Math.sin(x * 0.038 + time * 2.1 + index * 0.8) * (3 + theme.instability * 5);
      if (x === 0) {
        context.moveTo(x, yBase + wave);
      } else {
        context.lineTo(x, yBase + wave);
      }
    }
    context.stroke();
  }
  context.restore();
}

function drawAlienArchitecture(theme, time) {
  if (theme.alienStrength <= 0.04 && theme.ringStrength <= 0.1) {
    return;
  }

  const energyColor = mixRgb(theme.glowColor, theme.accentColor, 0.42);
  const glyphColor = mixRgb(theme.dustColor, theme.glowColor, 0.5);
  const centerX = GAME_WIDTH * 0.5;
  const centerY = lerp(GAME_HEIGHT * 0.38, GAME_HEIGHT * 0.66, theme.zoneWeights.core);

  context.save();
  context.strokeStyle = rgbToString(energyColor, 0.08 + theme.ringStrength * 0.2);
  context.lineWidth = 2;

  for (let index = 0; index < 5; index += 1) {
    const radius = 54 + index * 44 + Math.sin(time * (0.75 + index * 0.05) + index) * (3 + theme.zoneWeights.core * 8);
    context.save();
    context.translate(centerX, centerY);
    context.rotate(time * (0.08 + index * 0.015) * (index % 2 === 0 ? 1 : -1));
    context.beginPath();
    context.ellipse(0, 0, radius, radius * 0.28, 0, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  context.restore();

  context.save();
  context.strokeStyle = rgbToString(glyphColor, 0.08 + theme.alienStrength * 0.18);
  context.lineWidth = 1.5;

  [42, 70, GAME_WIDTH - 42, GAME_WIDTH - 70].forEach((x, columnIndex) => {
    context.beginPath();
    context.moveTo(x, -20);
    for (let y = 28; y <= GAME_HEIGHT + 24; y += 56) {
      const drift = Math.sin(time * 1.1 + y * 0.012 + columnIndex) * (8 + theme.zoneWeights.interface * 10);
      context.lineTo(x + drift, y);
    }
    context.stroke();

    for (let y = 44; y <= GAME_HEIGHT; y += 86) {
      const pulse = 2 + Math.sin(time * 2.4 + y * 0.02 + columnIndex) * 1.4;
      context.beginPath();
      context.arc(x, y, pulse + theme.zoneWeights.core * 2.5, 0, Math.PI * 2);
      context.stroke();
    }
  });

  if (theme.zoneWeights.interface > 0.08 || theme.zoneWeights.alien > 0.08) {
    for (let index = 0; index < 7; index += 1) {
      const y = ((index * 86 + time * 22) % (GAME_HEIGHT + 80)) - 40;
      const span = 26 + randomFromSeed(index + 0.4) * 26;
      context.beginPath();
      context.moveTo(centerX - span, y);
      context.lineTo(centerX - span * 0.35, y);
      context.lineTo(centerX - span * 0.1, y - 7);
      context.moveTo(centerX + span, y);
      context.lineTo(centerX + span * 0.35, y);
      context.lineTo(centerX + span * 0.1, y - 7);
      context.stroke();
    }
  }

  context.restore();

  if (theme.zoneWeights.core > 0.06) {
    const coreGradient = context.createRadialGradient(centerX, GAME_HEIGHT - 64, 8, centerX, GAME_HEIGHT - 72, 180);
    coreGradient.addColorStop(0, rgbToString([255, 255, 255], 0.5 + theme.zoneWeights.core * 0.3));
    coreGradient.addColorStop(0.18, rgbToString(theme.alertColor, 0.28 + theme.zoneWeights.core * 0.22));
    coreGradient.addColorStop(0.46, rgbToString(theme.accentColor, 0.16 + theme.zoneWeights.core * 0.18));
    coreGradient.addColorStop(1, rgbToString(theme.accentColor, 0));
    context.fillStyle = coreGradient;
    context.fillRect(0, GAME_HEIGHT - 300, GAME_WIDTH, 320);

    context.save();
    context.strokeStyle = rgbToString(theme.glowColor, 0.14 + theme.zoneWeights.core * 0.24);
    context.lineWidth = 2;
    for (let index = 0; index < 5; index += 1) {
      context.beginPath();
      context.moveTo(centerX, GAME_HEIGHT - 90);
      context.bezierCurveTo(
        centerX - 140 + index * 36,
        GAME_HEIGHT - 190 - index * 18,
        centerX - 90 + index * 28,
        GAME_HEIGHT - 300 - index * 12,
        centerX + (index - 2) * 30,
        GAME_HEIGHT - 420
      );
      context.stroke();
    }
    context.restore();
  }
}

function drawAtmosphere(theme, time) {
  const particleCount = Math.round(12 + theme.particleStrength * 34);
  const emberColor = mixRgb(theme.alertColor, theme.glowColor, 0.24);
  const energyColor = mixRgb(theme.glowColor, theme.accentColor, 0.45);
  const dustColor = mixRgb(theme.dustColor, theme.bottomColor, 0.12);
  const hotWeight = theme.zoneWeights.magma + theme.zoneWeights.core * 0.55;
  const energyWeight = theme.zoneWeights.interface + theme.zoneWeights.alien + theme.zoneWeights.core;

  for (let index = 0; index < particleCount; index += 1) {
    const seed = index * 5.73 + 2.1;
    const drift = randomFromSeed(seed);
    const x = 16 + drift * (GAME_WIDTH - 32);
    const y = GAME_HEIGHT - fract(time * (0.08 + randomFromSeed(seed + 1) * 0.16) + randomFromSeed(seed + 2)) * (GAME_HEIGHT + 40);
    const size = 1 + randomFromSeed(seed + 3) * (1.4 + theme.zoneWeights.core * 2);
    const alpha = 0.06 + randomFromSeed(seed + 4) * (0.1 + theme.particleStrength * 0.14);
    const color = energyWeight > hotWeight
      ? mixRgb(dustColor, energyColor, 0.65)
      : mixRgb(dustColor, emberColor, 0.6);

    context.fillStyle = rgbToString(color, alpha);
    context.fillRect(x, y, size, size * (1.4 + energyWeight * 0.8));
  }

  if (theme.instability > 0.2) {
    context.save();
    context.strokeStyle = rgbToString(theme.glowColor, 0.03 + theme.instability * 0.06);
    context.lineWidth = 1;
    for (let index = 0; index < 4; index += 1) {
      const y = ((index * 132 + time * 46) % (GAME_HEIGHT + 40)) - 20;
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(GAME_WIDTH, y + Math.sin(time * 3 + index) * (2 + theme.instability * 5));
      context.stroke();
    }
    context.restore();
  }

  context.save();
  context.globalAlpha = 0.05 + theme.gridStrength * 0.04;
  context.fillStyle = '#ffffff';
  for (let y = 0; y <= GAME_HEIGHT; y += 4) {
    context.fillRect(0, y, GAME_WIDTH, 1);
  }
  context.restore();
}

function drawBackground() {
  const theme = getWorldTheme();
  const time = game.elapsed + performance.now() * 0.0002;
  const shakeAmount = theme.instability * (0.35 + smoothstep(0, 1, theme.zoneWeights.core) * 1.6);

  context.save();
  context.translate(
    Math.sin(time * 11.5) * shakeAmount,
    Math.cos(time * 9.8) * shakeAmount * 0.7
  );

  drawWorldGradient(theme, time);
  drawFarShaft(theme, time);
  drawRuinsAndTransit(theme, time);
  drawMagmaLayer(theme, time);
  drawAlienArchitecture(theme, time);
  drawAtmosphere(theme, time);

  context.restore();
}

function drawFloors() {
  game.floors.forEach((floor) => {
    const leftWidth = floor.gapX;
    const rightX = floor.gapX + floor.gapWidth;
    const rightWidth = GAME_WIDTH - rightX;
    const fill = floor.glow === 0 ? '#59f3ff' : '#ff4edd';

    context.save();
    context.shadowBlur = 16;
    context.shadowColor = fill;
    context.fillStyle = fill;

    if (leftWidth > 0) {
      context.fillRect(0, floor.y, leftWidth, floor.thickness);
    }

    if (rightWidth > 0) {
      context.fillRect(rightX, floor.y, rightWidth, floor.thickness);
    }

    context.restore();

    context.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    context.strokeRect(0, floor.y, leftWidth, floor.thickness);
    context.strokeRect(rightX, floor.y, rightWidth, floor.thickness);
  });
}

function drawBall() {
  game.trail.forEach((point, index) => {
    const alpha = 0.22 - index * 0.024;
    const radius = BALL_RADIUS - index * 0.8;

    if (radius <= 1 || alpha <= 0) {
      return;
    }

    context.beginPath();
    context.fillStyle = `rgba(255, 204, 92, ${alpha.toFixed(3)})`;
    context.arc(point.x, point.y, radius, 0, Math.PI * 2);
    context.fill();
  });

  const orb = context.createRadialGradient(
    game.ball.x - 3,
    game.ball.y - 4,
    3,
    game.ball.x,
    game.ball.y,
    BALL_RADIUS + 10
  );
  orb.addColorStop(0, '#fff9d6');
  orb.addColorStop(0.3, '#ffdf7a');
  orb.addColorStop(0.7, '#ff9d29');
  orb.addColorStop(1, 'rgba(255, 157, 41, 0)');

  context.save();
  context.shadowBlur = 20;
  context.shadowColor = '#ffb347';
  context.beginPath();
  context.fillStyle = orb;
  context.arc(game.ball.x, game.ball.y, BALL_RADIUS + 8, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.beginPath();
  context.fillStyle = '#ffd76e';
  context.arc(game.ball.x, game.ball.y, BALL_RADIUS, 0, Math.PI * 2);
  context.fill();
}

function drawFrame() {
  drawBackground();
  drawFloors();
  drawBall();

  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
  context.fillText(`Score ${Math.ceil(game.score)}`, 16, 22);
  context.fillText(`Level ${game.level}`, GAME_WIDTH - 74, 22);
}

function frame(timestamp) {
  if (game.running) {
    if (!game.lastTimestamp) {
      game.lastTimestamp = timestamp;
    }

    const deltaTime = clamp((timestamp - game.lastTimestamp) / 1000, 0, 0.032);
    game.lastTimestamp = timestamp;

    updateGame(deltaTime);
    updateHud();
  }

  drawFrame();
  requestAnimationFrame(frame);
}

function updateDirectionalInput(direction, isActive) {
  inputState[direction] = isActive;

  touchButtons.forEach((button) => {
    button.classList.toggle('is-active', inputState[button.dataset.dir]);
  });
}

function handleKeyState(event, isActive) {
  const key = event.key.toLowerCase();

  if (isActive) {
    activateSoundtrack().catch((error) => {
      console.error('Audio activation failed', error);
    });
  }

  if (key === 'arrowleft' || key === 'a') {
    updateDirectionalInput('left', isActive);
    event.preventDefault();
  }

  if (key === 'arrowright' || key === 'd') {
    updateDirectionalInput('right', isActive);
    event.preventDefault();
  }

  if (isActive && key === 'p') {
    pauseGame();
  }

  if (isActive && (event.code === 'Space' || key === ' ')) {
    if (!game.started || game.gameOver) {
      startGame(true);
    } else {
      pauseGame();
    }
    event.preventDefault();
  }

  if (isActive && key === 'm') {
    toggleMusicEnabled();
    event.preventDefault();
  }
}

function togglePlayfieldState() {
  if (!game.started || game.gameOver) {
    startGame(true);
    return;
  }

  pauseGame();
}

function applyDifficultyChange(nextDifficulty) {
  if (!DIFFICULTY_LEVELS[nextDifficulty]) {
    return;
  }

  game.difficulty = nextDifficulty;
  saveDifficulty(game.difficulty);
  setDifficultyControlState();

  if (game.running || game.paused) {
    resetGame();
    return;
  }

  const config = getDifficultyConfig();
  game.scrollSpeed = config.baseScrollSpeed;
  updateHud();
  setSummary(`The grid is idle. ${config.label} mode is armed. Start a run to initialize the lane generator.`);
}

window.addEventListener('keydown', (event) => handleKeyState(event, true));
window.addEventListener('keyup', (event) => handleKeyState(event, false));
window.addEventListener('blur', () => {
  updateDirectionalInput('left', false);
  updateDirectionalInput('right', false);

  if (game.running) {
    pauseGame();
  }
});

touchButtons.forEach((button) => {
  const direction = button.dataset.dir;

  const activate = (event) => {
    event.preventDefault();
    updateDirectionalInput(direction, true);
  };

  const deactivate = (event) => {
    event.preventDefault();
    updateDirectionalInput(direction, false);
  };

  button.addEventListener('pointerdown', activate);
  button.addEventListener('pointerup', deactivate);
  button.addEventListener('pointerleave', deactivate);
  button.addEventListener('pointercancel', deactivate);
});

gameFrame.addEventListener('click', (event) => {
  if (event.target.closest('.touch-button')) {
    return;
  }

  togglePlayfieldState();
});

startButton.addEventListener('click', () => {
  startGame(true);
});

pauseButton.addEventListener('click', pauseGame);
musicButton.addEventListener('click', () => {
  toggleMusicEnabled();
});
immersiveButton.addEventListener('click', () => {
  toggleImmersiveMode();
});
difficultySelect.addEventListener('change', (event) => {
  applyDifficultyChange(event.target.value);
});
volumeSlider.addEventListener('input', (event) => {
  setMusicVolume(Number(event.target.value) / 100);
});
document.addEventListener('fullscreenchange', setImmersiveButtonState);
document.addEventListener('pointerdown', () => {
  activateSoundtrack().catch((error) => {
    console.error('Audio activation failed', error);
  });
}, { once: true, passive: true });
window.addEventListener('resize', setCanvasResolution);

setCanvasResolution();
setImmersiveMode(true);
setMusicButtonState();
setImmersiveButtonState();
setDifficultyControlState();
setVolumeControlState();
resetGame();
requestAnimationFrame(frame);

activateSoundtrack().catch(() => {
  // Browsers may block autoplay until first interaction.
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
