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
const difficultySelect = document.getElementById('difficulty-select');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const touchButtons = Array.from(document.querySelectorAll('.touch-button'));
const gameFrame = document.querySelector('.game-frame');

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
  return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
}

function loadMusicEnabled() {
  const saved = localStorage.getItem(MUSIC_STORAGE_KEY);
  return saved === null ? true : saved === 'true';
}

function loadMusicVolume() {
  const saved = Number(localStorage.getItem(MUSIC_VOLUME_STORAGE_KEY));
  if (!Number.isFinite(saved)) {
    return 0.9;
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
  localStorage.setItem(STORAGE_KEY, String(Math.round(score)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
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
  const audioContext = ensureSoundtrack();

  if (!audioContext) {
    return;
  }

  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  updateSoundtrackMix();
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

  if (game.score > game.best) {
    game.best = game.score;
    saveBestScore(game.best);
  }

  updateHud();
  setStatus('Terminated');
  setSummary(`Run ended at ${Math.round(game.score)} points. ${reason}`);
  showOverlay('Run Lost', `Score ${Math.round(game.score)}`, reason);
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
  scoreValue.textContent = String(Math.round(game.score));
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
  const scrollStep = game.scrollSpeed * deltaTime;

  game.floors.forEach((floor) => {
    floor.y -= scrollStep;
  });

  recycleFloors();
  updateInputAxis(deltaTime);

  game.ball.vy += GRAVITY * deltaTime;
  const previousY = game.ball.y;

  game.ball.x += game.ball.vx * deltaTime;
  game.ball.y += game.ball.vy * deltaTime;

  game.ball.x = clamp(game.ball.x, BALL_RADIUS, GAME_WIDTH - BALL_RADIUS);
  resolveFloorCollisions(previousY, scrollStep);

  const rescueLine = GAME_HEIGHT - FLOOR_SPACING * 1.18;
  const visibleLine = GAME_HEIGHT - BALL_RADIUS * 1.35;
  const rescueOverflow = Math.max(0, game.ball.y - rescueLine);

  if (rescueOverflow > 0) {
    const targetCatchUpSpeed = rescueOverflow * 10 + game.scrollSpeed * 0.55;
    const catchUpBlend = 1 - Math.exp(-8 * deltaTime);
    const minimumVisibleShift = Math.max(0, game.ball.y - visibleLine);

    game.catchUpSpeed = lerp(game.catchUpSpeed, targetCatchUpSpeed, catchUpBlend);

    shiftWorldUp(
      Math.max(
        minimumVisibleShift,
        Math.min(rescueOverflow, game.catchUpSpeed * deltaTime)
      )
    );
    recycleFloors();
  } else if (game.catchUpSpeed > 0.1) {
    game.catchUpSpeed *= Math.exp(-10 * deltaTime);
  }

  updateTrail();

  game.elapsed += deltaTime;
  game.score += deltaTime * getDifficultyConfig().scoreRate;

  if (game.ball.y - BALL_RADIUS <= 0) {
    endGame('You were pinned against the ceiling by the rising grid.');
  }
}

function drawBackground() {
  const bgGradient = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  bgGradient.addColorStop(0, '#061226');
  bgGradient.addColorStop(0.52, '#04101d');
  bgGradient.addColorStop(1, '#01040a');
  context.fillStyle = bgGradient;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  context.save();
  context.globalAlpha = 0.2;
  context.strokeStyle = '#59f3ff';
  context.lineWidth = 1;

  for (let x = 0; x <= GAME_WIDTH; x += 24) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, GAME_HEIGHT);
    context.stroke();
  }

  for (let y = 0; y <= GAME_HEIGHT; y += 24) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(GAME_WIDTH, y);
    context.stroke();
  }

  context.restore();

  context.save();
  context.globalAlpha = 0.08;
  context.fillStyle = '#ffffff';
  for (let y = 0; y <= GAME_HEIGHT; y += 4) {
    context.fillRect(0, y, GAME_WIDTH, 1);
  }
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
  context.fillText(`Score ${Math.round(game.score)}`, 16, 22);
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
    pauseGame();
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
difficultySelect.addEventListener('change', (event) => {
  applyDifficultyChange(event.target.value);
});
volumeSlider.addEventListener('input', (event) => {
  setMusicVolume(Number(event.target.value) / 100);
});
window.addEventListener('resize', setCanvasResolution);

setCanvasResolution();
setMusicButtonState();
setDifficultyControlState();
setVolumeControlState();
resetGame();
requestAnimationFrame(frame);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((error) => {
      console.error('Service worker registration failed', error);
    });
  });
}
