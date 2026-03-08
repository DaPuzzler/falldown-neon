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
const SCORE_PER_LEVEL = 3600;
const NORMAL_DESCENT_LEVELS = 7;
const ENDGAME_TRIGGER_LEVEL = NORMAL_DESCENT_LEVELS + 1;
const CORE_BOSS_DURATION = 28;
const CORE_LANDING_DURATION = 1.9;
const CORE_SPRINT_DURATION = 12;
const CORE_ACTIVATION_DURATION = 4.8;
const SPRINT_TRACK_Y = GAME_HEIGHT - 108;
const SPRINT_NODE_X = GAME_WIDTH - 28;
const SPRINT_HAZARD_INTERVAL = 0.88;
const DEBUG_ENDGAME_SCORE = (ENDGAME_TRIGGER_LEVEL - 1) * SCORE_PER_LEVEL;
const WORLD_ZONE_THRESHOLDS = Array.from(
  { length: NORMAL_DESCENT_LEVELS + 1 },
  (_, index) => index / NORMAL_DESCENT_LEVELS
);

const canvas = document.getElementById('game-canvas');
const context = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayGeneric = document.getElementById('overlay-generic');
const overlayLabel = document.getElementById('overlay-label');
const overlayTitle = document.getElementById('overlay-title');
const overlayCopy = document.getElementById('overlay-copy');
const overlayPrompt = document.getElementById('overlay-prompt');
const overlayDialogue = document.getElementById('overlay-dialogue');
const dialogueBadge = document.getElementById('dialogue-badge');
const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueLines = document.getElementById('dialogue-lines');
const dialoguePortrait = document.getElementById('dialogue-portrait');
const statusText = document.getElementById('status-text');
const scoreValue = document.getElementById('score-value');
const bestValue = document.getElementById('best-value');
const levelValue = document.getElementById('level-value');
const zoneValue = document.getElementById('zone-value');
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
const portraitContext = dialoguePortrait.getContext('2d');
const pageParams = new URLSearchParams(window.location.search);

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
  lastGapCenter: GAME_WIDTH * 0.5,
};

const intro = {
  mode: 'title',
  screenIndex: 0,
  lineIndex: 0,
  charIndex: 0,
  visibleLines: [],
  typing: false,
  ready: false,
  activeSpeaker: 'command',
  nextCharTime: 0,
  pauseUntil: 0,
  launchStartTime: 0,
  launchProgress: 0,
};

const endgame = {
  phase: 'none',
  bossTimer: 0,
  nextBossRowIndex: 0,
  lastBossCenter: 0,
  landingTimer: 0,
  landingStartX: 0,
  briefingIndex: 0,
  briefingVisibleText: '',
  briefingTyping: false,
  briefingReady: false,
  briefingNextCharTime: 0,
  briefingActiveSpeaker: 'command',
  endingVisibleText: '',
  endingTyping: false,
  endingReady: false,
  endingNextCharTime: 0,
  sprintTimer: 0,
  sprintDuration: CORE_SPRINT_DURATION,
  sprintHazardTimer: 0,
  sprintHazards: [],
  activationTimer: 0,
  completionTime: 0,
  endingIndex: 0,
};

const runtimeState = {
  fatalError: '',
};

const presentation = {
  cueTitle: '',
  cueSubtitle: '',
  cueTimer: 0,
  flashAlpha: 0,
  currentZoneLabel: '',
  lastFrameTimestamp: 0,
};

const debugState = {
  startMode: pageParams.get('debug') === 'endgame' ? 'endgame' : '',
  autostartEndgame: pageParams.get('debug') === 'endgame' && pageParams.get('autostart') === '1',
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
    bossBaseScrollSpeed: 168,
    bossWaveAmplitude: 7,
    bossGapBonus: 14,
    bossGateTighten: 6,
    bossMaxCenterShift: 44,
    sprintDuration: 14,
    sprintHazardIntervalScale: 1.18,
    strikeTelegraphBonus: 0.18,
    debrisSpeedScale: 0.88,
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
    bossBaseScrollSpeed: 182,
    bossWaveAmplitude: 8,
    bossGapBonus: 8,
    bossGateTighten: 10,
    bossMaxCenterShift: 52,
    sprintDuration: 13,
    sprintHazardIntervalScale: 1,
    strikeTelegraphBonus: 0.08,
    debrisSpeedScale: 1,
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
    bossBaseScrollSpeed: 198,
    bossWaveAmplitude: 9,
    bossGapBonus: 2,
    bossGateTighten: 14,
    bossMaxCenterShift: 60,
    sprintDuration: 12,
    sprintHazardIntervalScale: 0.92,
    strikeTelegraphBonus: 0,
    debrisSpeedScale: 1.08,
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
    bossBaseScrollSpeed: 214,
    bossWaveAmplitude: 10,
    bossGapBonus: -4,
    bossGateTighten: 18,
    bossMaxCenterShift: 68,
    sprintDuration: 11,
    sprintHazardIntervalScale: 0.84,
    strikeTelegraphBonus: -0.08,
    debrisSpeedScale: 1.16,
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

const INTRO_SCREENS = [
  [
    { speaker: 'command', text: 'VX-99 core is going critical. No one can get that deep.' },
    { speaker: 'jett', text: 'Then send me.' },
  ],
  [
    { speaker: 'command', text: 'Jett... this is a one-way drop.' },
    { speaker: 'jett', text: 'Then I better make it count.' },
  ],
];

const SPEAKERS = {
  command: {
    label: 'COMMAND',
    color: '#8effc2',
    accent: [120, 255, 194],
    shadow: [38, 78, 62],
    suit: [86, 108, 130],
    visor: [163, 255, 206],
  },
  jett: {
    label: 'JETT',
    color: '#ff88e8',
    accent: [255, 132, 232],
    shadow: [94, 26, 76],
    suit: [72, 90, 122],
    visor: [106, 232, 255],
  },
  her: {
    label: 'HER',
    color: '#ffe08a',
    accent: [255, 224, 138],
    shadow: [92, 54, 20],
    suit: [124, 76, 54],
    visor: [255, 238, 184],
  },
};

const DIALOGUE_CHAR_MS = 24;
const DIALOGUE_LINE_PAUSE_MS = 260;
const LAUNCH_DURATION_MS = 1650;

const CORE_BOSS_PATTERNS = [
  { center: 0.5, width: 76 },
  { center: 0.38, width: 70 },
  { center: 0.62, width: 68 },
  { center: 0.3, width: 66 },
  { center: 0.7, width: 64 },
  { center: 0.46, width: 62 },
  { center: 0.76, width: 60 },
  { center: 0.34, width: 62 },
  { center: 0.58, width: 60 },
  { center: 0.24, width: 58 },
  { center: 0.68, width: 58 },
  { center: 0.5, width: 56 },
];

const CORE_SPRINT_BRIEFING = [
  { speaker: 'command', text: 'Jett... I can’t believe you made it.' },
  { speaker: 'jett', text: 'Took longer than I thought.' },
  { speaker: 'command', text: 'The ignition node is straight ahead. Reach it before the chamber tears itself apart, and watch the debris and core discharges on your way in.' },
];

const ENDING_SCREENS = [
  {
    type: 'dialogue',
    badge: 'Command Link',
    lines: [
      { speaker: 'command', text: 'VX-99 is stable. You saved millions.' },
    ],
    prompt: 'PRESS START',
  },
  {
    type: 'dialogue',
    lines: [
      { speaker: 'jett', text: 'Not bad for a one-way drop.' },
    ],
    prompt: 'PRESS START',
  },
  {
    type: 'dialogue',
    lines: [
      { speaker: 'command', text: 'I’d call that an understatement.' },
    ],
    prompt: 'PRESS START',
  },
  {
    type: 'dialogue',
    lines: [
      { speaker: 'jett', text: 'Yeah. Me too.' },
    ],
    prompt: 'PRESS START',
  },
  {
    type: 'stats',
    label: 'MISSION REPORT',
    title: 'CORE SYNCHRONIZED',
    prompt: 'PRESS START',
  },
  {
    type: 'credits',
    label: 'THANK YOU FOR PLAYING',
    title: 'CORE DROP',
    html: 'Designed by <strong>DaPuzzler</strong><br>See you on the next drop.',
    prompt: 'PRESS START FOR TITLE',
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

const VICTORY_BASS_PATTERNS = [
  [0, null, 7, null, 12, null, 7, null, 0, null, 12, null, 7, null, 12, null],
  [0, null, 5, null, 10, null, 7, null, 0, null, 7, null, 10, null, 12, null],
];

const VICTORY_ARP_PATTERN = [
  0, 2, 1, 3, 2, 4, 3, 4, 1, 2, 3, 4, 2, 1, 3, 4,
];

const VICTORY_LEAD_PATTERNS = [
  [12, null, 14, null, 17, null, 19, null, 17, null, 21, null, 19, null, 17, null],
  [10, null, 12, null, 15, null, 17, null, 15, null, 19, null, 17, null, 15, null],
  [12, null, 17, null, 19, null, 21, null, 24, null, 21, null, 19, null, 17, null],
  [15, null, 19, null, 22, null, 24, null, 22, null, 19, null, 17, null, 15, null],
];

const VICTORY_DRUMS = {
  kick: 'x..xx..xx..xx..x',
  snare: '....x.......x...',
  hat: 'x.xxxxxxxxxxxxxx',
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

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds - minutes * 60;
  return `${String(minutes).padStart(2, '0')}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
}

function getRunDepthProgress(score = game.score) {
  const totalScore = Math.max(SCORE_PER_LEVEL, (ENDGAME_TRIGGER_LEVEL - 1) * SCORE_PER_LEVEL);
  return clamp(score / totalScore, 0, 1);
}

function getZoneIndexForProgress(progress) {
  for (let index = 0; index < WORLD_ZONE_THRESHOLDS.length - 1; index += 1) {
    if (progress < WORLD_ZONE_THRESHOLDS[index + 1]) {
      return index;
    }
  }

  return WORLD_ZONE_THRESHOLDS.length - 2;
}

function getBandDepthForProgress(progress) {
  for (let index = 0; index < WORLD_ZONE_THRESHOLDS.length - 1; index += 1) {
    const start = WORLD_ZONE_THRESHOLDS[index];
    const end = WORLD_ZONE_THRESHOLDS[index + 1];

    if (progress <= end || index === WORLD_ZONE_THRESHOLDS.length - 2) {
      const localBlend = smoothstep(start, end, progress);
      return Math.min(WORLD_BANDS.length - 1, index + localBlend);
    }
  }

  return WORLD_BANDS.length - 1;
}

function getZoneLabel() {
  if (endgame.phase === 'boss') {
    return 'Living Core';
  }

  if (endgame.phase === 'landing') {
    return 'Core Floor';
  }

  if (endgame.phase === 'briefing') {
    return 'Ignition Staging';
  }

  if (endgame.phase === 'sprint') {
    return 'Ignition Sprint';
  }

  if (endgame.phase === 'activation') {
    return 'Core Synchronization';
  }

  if (endgame.phase === 'ending') {
    return 'VX-99 Restored';
  }

  const labels = [
    'Neon Undercity',
    'Maintenance Shafts',
    'Mining Ruins',
    'Magma Veins',
    'Alien Interface',
    'Circuit Cathedral',
    'Core Approach',
  ];

  return labels[getZoneIndexForProgress(getRunDepthProgress())];
}

function getObjectiveLabel() {
  if (intro.mode === 'title') {
    return 'Press Start';
  }

  if (intro.mode === 'dialogue') {
    return 'Advance Transmission';
  }

  if (intro.mode === 'launch') {
    return 'Board Gravity Racer';
  }

  switch (endgame.phase) {
    case 'boss':
      return 'Survive The Core';
    case 'landing':
      return 'Hold The Floor';
    case 'briefing':
      return 'Await Instructions';
    case 'sprint':
      return 'Reach Ignition Node';
    case 'activation':
      return 'Synchronizing Core';
    case 'ending':
      return 'Mission Complete';
    default:
      return 'Drop Through The Gaps';
  }
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function reportRuntimeError(error) {
  const rawMessage = typeof error === 'string'
    ? error
    : error && typeof error === 'object'
      ? (error.stack || error.message || String(error))
      : String(error);

  if (runtimeState.fatalError === rawMessage) {
    return;
  }

  runtimeState.fatalError = rawMessage;
  game.running = false;
  game.paused = false;
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
  startButton.textContent = 'Reload Required';
  setStatus('Runtime Error');
  setSummary('The current build hit a browser-side exception. Reload after the bug is fixed.');
  showOverlayHtml(
    'Runtime Error',
    'Debug Route Failed',
    `<code class="runtime-error-copy">${escapeHtml(rawMessage)}</code>`,
    'RELOAD TO RETRY'
  );
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

function getWorldThemeForDepth(rawDepth) {
  const depth = clamp(rawDepth, 0, WORLD_BANDS.length - 1);
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

function getWorldTheme() {
  return getWorldThemeForDepth(getBandDepthForProgress(getRunDepthProgress()));
}

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function getDifficultyConfig() {
  return DIFFICULTY_LEVELS[game.difficulty] || DIFFICULTY_LEVELS.normal;
}

function getMusicMode() {
  if (endgame.phase === 'ending') {
    return 'victory';
  }

  if (endgame.phase === 'activation') {
    return 'core-sprint';
  }

  if (!game.started && !game.running && !game.gameOver) {
    return 'title';
  }

  if (endgame.phase === 'boss') {
    return 'core-boss';
  }

  if (endgame.phase === 'briefing') {
    return 'core-boss';
  }

  if (endgame.phase === 'sprint') {
    return 'core-sprint';
  }

  return 'game';
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

  const musicMode = getMusicMode();

  if (musicMode === 'title') {
    scheduleTitleStep(step % TITLE_LOOP_STEPS, time);
    return;
  }

  if (musicMode === 'victory') {
    scheduleVictoryStep(step % TITLE_LOOP_STEPS, time);
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

function scheduleVictoryStep(step, time) {
  const barIndex = Math.floor(step / STEPS_PER_BAR) % TITLE_LOOP_BARS;
  const stepInBar = step % STEPS_PER_BAR;
  const chord = TITLE_CHORDS[barIndex];
  const bassPattern = VICTORY_BASS_PATTERNS[barIndex % VICTORY_BASS_PATTERNS.length];
  const leadPattern = VICTORY_LEAD_PATTERNS[barIndex % VICTORY_LEAD_PATTERNS.length];
  const bassOffset = bassPattern[stepInBar];
  const arpIndex = VICTORY_ARP_PATTERN[stepInBar];
  const leadOffset = leadPattern[stepInBar];

  if (stepInBar === 0) {
    playPadChord(chord.tones, time, 1.35, false);
  }

  if (stepInBar === 8) {
    playPadChord([chord.tones[0] + 12, chord.tones[1], chord.tones[2]], time, 0.8, false);
  }

  if (bassOffset !== null) {
    playBassNote(chord.root + bassOffset, time, 0.26, 'title');
  }

  playArpNote(resolveArpNote(chord, arpIndex), time, 0.12, 'title');

  if (leadOffset !== null) {
    playLeadNote(chord.root + leadOffset, time, 0.18, 0.09);
  }

  if (VICTORY_DRUMS.kick[stepInBar] === 'x') {
    playKick(time);
  }

  if (VICTORY_DRUMS.snare[stepInBar] === 'x') {
    playSnare(time, 'title');
  }

  if (VICTORY_DRUMS.hat[stepInBar] === 'x') {
    playHat(time, 0.04, 'title');
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

function playCoreIgnitionSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain || !soundtrack.noiseBuffer) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.01;
  createSfxVoice('triangle', midiToFrequency(52), start, 0.28, 0.09, midiToFrequency(76));
  createSfxVoice('sawtooth', midiToFrequency(64), start + 0.06, 0.44, 0.11, midiToFrequency(95));
  createSfxVoice('square', midiToFrequency(76), start + 0.14, 0.38, 0.08, midiToFrequency(100));

  const noiseSource = soundtrack.context.createBufferSource();
  const noiseFilter = soundtrack.context.createBiquadFilter();
  const noiseGain = soundtrack.context.createGain();

  noiseSource.buffer = soundtrack.noiseBuffer;
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(1400, start);
  noiseGain.gain.setValueAtTime(0.0001, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.12, start + 0.08);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.46);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(soundtrack.sfxGain);
  noiseSource.start(start);
  noiseSource.stop(start + 0.5);
}

function playPhaseCueSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.01;
  createSfxVoice('square', midiToFrequency(72), start, 0.08, 0.06, midiToFrequency(84));
  createSfxVoice('triangle', midiToFrequency(60), start + 0.05, 0.14, 0.05, midiToFrequency(72));
}

function triggerPhaseCue(title, subtitle = '') {
  presentation.cueTitle = title;
  presentation.cueSubtitle = subtitle;
  presentation.cueTimer = 2.2;
  presentation.flashAlpha = Math.max(presentation.flashAlpha, 0.18);
  playPhaseCueSound();
}

function updateSoundtrackMix() {
  if (!soundtrack.masterGain || !soundtrack.filter || !soundtrack.context) {
    return;
  }

  const now = soundtrack.context.currentTime;
  let targetGain = 0.0001;
  let targetFilter = 1750;
  const musicMode = getMusicMode();
  soundtrack.tempo = musicMode === 'title'
    ? 92
    : musicMode === 'core-boss'
      ? 124
      : musicMode === 'core-sprint'
        ? 150
        : musicMode === 'victory'
          ? 128
          : 102;

  if (soundtrack.enabled) {
    if (musicMode === 'title') {
      targetGain = 0.22;
      targetFilter = 2850;
    } else if (musicMode === 'core-boss') {
      targetGain = 0.38;
      targetFilter = 4100;
    } else if (musicMode === 'core-sprint') {
      targetGain = 0.43;
      targetFilter = 4900;
    } else if (musicMode === 'victory') {
      targetGain = 0.31;
      targetFilter = 4300;
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
  const depthProgress = getRunDepthProgress();
  const squeeze = clamp(
    Math.pow(depthProgress, 1.08) * 0.82 + smoothstep(0.58, 1, depthProgress) * 0.12,
    0,
    1
  );
  return clamp(
    lerp(config.baseGapWidth, config.minGapWidth, squeeze),
    config.minGapWidth,
    config.baseGapWidth
  );
}

function createFloor(y, difficultyIndex) {
  const gapWidth = currentGapWidth();
  const margin = 26;
  const minCenter = margin + gapWidth * 0.5;
  const maxCenter = GAME_WIDTH - margin - gapWidth * 0.5;
  const depthProgress = getRunDepthProgress();
  const lateSpread = smoothstep(0.73, 1, depthProgress);
  const phase = difficultyIndex * (0.98 + lateSpread * 0.16) + depthProgress * 11.5 + game.elapsed * 0.12;
  const wave =
    Math.sin(phase) * 0.34 +
    Math.sin(phase * 1.78 + 1.15) * 0.21 +
    Math.sin(phase * 2.46 + 0.4) * 0.1;
  const normalizedWave = clamp(0.5 + wave, 0.05, 0.95);
  const targetCenter = lerp(minCenter, maxCenter, normalizedWave);
  const previousCenter = Number.isFinite(game.lastGapCenter) ? game.lastGapCenter : GAME_WIDTH * 0.5;
  const minShift = lerp(18, 26, 1 - depthProgress * 0.35);
  const maxShift = lerp(84, 122, depthProgress);
  const fallbackDirection = difficultyIndex % 2 === 0 ? 1 : -1;
  const signedShift = targetCenter - previousCenter;
  let nextCenter = clamp(targetCenter, previousCenter - maxShift, previousCenter + maxShift);

  if (Math.abs(nextCenter - previousCenter) < minShift) {
    nextCenter = clamp(
      previousCenter + Math.sign(signedShift || fallbackDirection) * minShift,
      minCenter,
      maxCenter
    );
  }

  game.lastGapCenter = nextCenter;
  const hueOffset = difficultyIndex % 2 === 0 ? 0 : 28;

  return {
    y,
    thickness: FLOOR_THICKNESS,
    gapX: nextCenter - gapWidth * 0.5,
    gapWidth,
    glow: hueOffset,
  };
}

function createCoreBossFloor(y, rowIndex) {
  const config = getDifficultyConfig();
  const pattern = CORE_BOSS_PATTERNS[rowIndex % CORE_BOSS_PATTERNS.length];
  const margin = 18;
  const gatePulse = [0, 0.55, 1, 0.35][rowIndex % 4];
  const gapWidth = clamp(
    pattern.width + config.bossGapBonus - config.bossGateTighten * gatePulse,
    52,
    GAME_WIDTH - margin * 2 - 12
  );
  const minCenter = margin + gapWidth * 0.5;
  const maxCenter = GAME_WIDTH - margin - gapWidth * 0.5;
  const targetCenter = lerp(minCenter, maxCenter, pattern.center);
  const previousCenter = endgame.lastBossCenter || targetCenter;
  const gapCenter = rowIndex === 0
    ? targetCenter
    : clamp(
      targetCenter,
      minCenter,
      maxCenter
    );
  const constrainedCenter = rowIndex === 0
    ? gapCenter
    : clamp(
      gapCenter,
      previousCenter - config.bossMaxCenterShift,
      previousCenter + config.bossMaxCenterShift
    );
  endgame.lastBossCenter = clamp(constrainedCenter, minCenter, maxCenter);

  return {
    y,
    thickness: FLOOR_THICKNESS + 2,
    gapX: endgame.lastBossCenter - gapWidth * 0.5,
    gapWidth,
    glow: rowIndex % 2,
    kind: 'core',
  };
}

function resetEndgameState() {
  endgame.phase = 'none';
  endgame.bossTimer = 0;
  endgame.nextBossRowIndex = 0;
  endgame.lastBossCenter = 0;
  endgame.landingTimer = 0;
  endgame.landingStartX = 0;
  endgame.briefingIndex = 0;
  endgame.briefingVisibleText = '';
  endgame.briefingTyping = false;
  endgame.briefingReady = false;
  endgame.briefingNextCharTime = 0;
  endgame.briefingActiveSpeaker = 'command';
  endgame.endingVisibleText = '';
  endgame.endingTyping = false;
  endgame.endingReady = false;
  endgame.endingNextCharTime = 0;
  endgame.sprintTimer = CORE_SPRINT_DURATION;
  endgame.sprintDuration = CORE_SPRINT_DURATION;
  endgame.sprintHazardTimer = 0;
  endgame.sprintHazards = [];
  endgame.activationTimer = 0;
  endgame.completionTime = 0;
  endgame.endingIndex = 0;
}

function shiftWorldUp(amount, includeBall = true) {
  if (amount <= 0) {
    return;
  }

  game.floors.forEach((floor) => {
    floor.y -= amount;
  });

  if (includeBall) {
    game.ball.y -= amount;
  }
}

function resetFloors() {
  game.floors = [];
  const lowestStartY = GAME_HEIGHT - 62 + FLOOR_BUFFER_BELOW * FLOOR_SPACING;

  if (endgame.phase !== 'boss') {
    game.lastGapCenter = GAME_WIDTH * 0.5;
  }

  for (let index = 0; index < FLOOR_COUNT; index += 1) {
    const y = lowestStartY - index * FLOOR_SPACING;
    if (endgame.phase === 'boss') {
      game.floors.push(createCoreBossFloor(y, endgame.nextBossRowIndex));
      endgame.nextBossRowIndex += 1;
    } else {
      game.floors.push(createFloor(y, index));
    }
  }
}

function setOverlayPrompt(text, visible = Boolean(text)) {
  overlayPrompt.textContent = text;
  overlayPrompt.hidden = !visible;
}

function isEndgameDebugStartEnabled() {
  return debugState.startMode === 'endgame';
}

function setOverlayMode(mode) {
  overlay.dataset.mode = mode;
  overlayGeneric.hidden = mode === 'dialogue';
  overlayDialogue.hidden = mode !== 'dialogue';
  overlay.hidden = false;
}

function showOverlayHtml(label, title, html, prompt = '') {
  setOverlayMode('generic');
  overlayLabel.textContent = label;
  overlayTitle.textContent = title;
  overlayCopy.innerHTML = html;
  setOverlayPrompt(prompt, Boolean(prompt));
  overlay.hidden = false;
}

function drawDialoguePortrait(speakerKey) {
  const speaker = SPEAKERS[speakerKey] || SPEAKERS.command;
  const scale = 4;
  portraitContext.clearRect(0, 0, dialoguePortrait.width, dialoguePortrait.height);
  portraitContext.imageSmoothingEnabled = false;

  portraitContext.fillStyle = 'rgba(4, 10, 18, 0.96)';
  portraitContext.fillRect(0, 0, 64, 64);

  portraitContext.fillStyle = rgbToString(speaker.shadow, 0.25);
  portraitContext.fillRect(6, 8, 52, 48);

  const fillPixels = (pixels, color) => {
    portraitContext.fillStyle = color;
    pixels.forEach(([x, y, w = 1, h = 1]) => {
      portraitContext.fillRect(x * scale, y * scale, w * scale, h * scale);
    });
  };

  if (speakerKey === 'jett') {
    const skin = '#d7a07f';
    const hair = '#121318';
    const jacket = rgbToString(speaker.suit, 0.96);
    const accent = '#ffd76e';
    const visor = '#86f2ff';

    fillPixels([[2, 11, 12, 3], [2, 14, 5, 2], [9, 14, 5, 2], [1, 16, 14, 1]], jacket);
    fillPixels([[2, 12, 2, 4], [12, 12, 2, 4], [3, 10, 1, 2], [11, 10, 1, 2], [5, 15, 5, 1]], accent);
    fillPixels([[4, 4, 8, 2], [3, 6, 11, 1], [4, 7, 8, 1], [3, 8, 4, 1], [9, 8, 3, 1], [11, 9, 1, 1]], hair);
    fillPixels([[4, 9, 8, 5], [5, 14, 6, 1]], skin);
    fillPixels([[5, 10, 2, 1], [9, 10, 2, 1]], '#fff7ea');
    fillPixels([[7, 12, 3, 1]], '#25140f');
    fillPixels([[8, 13, 2, 1]], '#f0c4b2');
    fillPixels([[9, 8, 3, 1], [10, 9, 2, 1]], visor);
    fillPixels([[11, 5, 2, 1], [12, 6, 1, 6]], accent);
    fillPixels([[4, 5, 1, 1], [5, 4, 2, 1]], '#2a2c35');
  } else if (speakerKey === 'command') {
    const skin = '#cdb39f';
    const hair = '#f2f5ff';
    const coat = rgbToString(speaker.suit, 0.96);
    const trim = '#9fd5b7';
    const visor = rgbToString(speaker.visor, 0.78);

    fillPixels([[2, 11, 12, 3], [2, 14, 5, 2], [9, 14, 5, 2], [1, 16, 14, 1]], coat);
    fillPixels([[2, 12, 2, 4], [12, 12, 2, 4], [5, 15, 4, 1], [9, 15, 2, 1]], trim);
    fillPixels([[4, 4, 8, 2], [3, 6, 10, 1], [2, 7, 3, 1], [10, 7, 3, 1], [4, 8, 8, 1]], hair);
    fillPixels([[4, 9, 8, 5], [5, 14, 6, 1]], skin);
    fillPixels([[5, 10, 2, 1], [9, 10, 2, 1]], visor);
    fillPixels([[7, 12, 3, 1]], '#3e2e26');
    fillPixels([[8, 13, 2, 1]], '#e0c6b7');
    fillPixels([[1, 7, 2, 6], [13, 8, 1, 5], [4, 7, 1, 1], [10, 7, 1, 1]], trim);
    fillPixels([[6, 8, 4, 1]], rgbToString(speaker.visor, 0.72));
  } else {
    const skin = '#d8ab94';
    const hair = '#f0d9b8';
    const jacket = rgbToString(speaker.suit, 0.96);
    const accent = rgbToString(speaker.accent, 0.92);
    const visor = rgbToString(speaker.visor, 0.84);

    fillPixels([[2, 11, 12, 3], [2, 14, 5, 2], [9, 14, 5, 2], [1, 16, 14, 1]], jacket);
    fillPixels([[3, 12, 1, 3], [12, 12, 1, 3], [5, 15, 5, 1]], accent);
    fillPixels([[4, 4, 8, 2], [3, 6, 10, 1], [4, 7, 8, 1], [3, 8, 2, 1], [11, 8, 2, 1]], hair);
    fillPixels([[4, 9, 8, 5], [5, 14, 6, 1]], skin);
    fillPixels([[5, 10, 2, 1], [9, 10, 2, 1]], visor);
    fillPixels([[7, 12, 3, 1]], '#3a2222');
    fillPixels([[8, 13, 2, 1]], '#f0c7bb');
  }

  portraitContext.strokeStyle = rgbToString(speaker.accent, 0.38);
  portraitContext.lineWidth = 1;
  portraitContext.strokeRect(2.5, 2.5, 59, 59);
}

function renderDialoguePanel(lines, activeSpeaker, prompt = '', badgeText = 'Live') {
  const speaker = SPEAKERS[activeSpeaker] || SPEAKERS.command;
  const speakerSet = new Set(lines.map((line) => line.speaker));
  const inlineSpeakerLabels = speakerSet.size > 1;
  setOverlayMode('dialogue');
  dialogueBadge.textContent = badgeText;
  dialogueSpeaker.textContent = speaker.label;
  dialogueSpeaker.style.color = speaker.color;
  dialogueLines.innerHTML = lines
    .map((line) => {
      const prefix = inlineSpeakerLabels
        ? `<span class="dialogue-line-speaker ${line.speaker}">${SPEAKERS[line.speaker].label}:</span>`
        : '';
      return `<p class="dialogue-line">${prefix}${line.text}</p>`;
    })
    .join('');
  setOverlayPrompt(prompt, Boolean(prompt));
  drawDialoguePortrait(activeSpeaker);
}

function renderDialogueOverlay() {
  renderDialoguePanel(
    intro.visibleLines,
    intro.activeSpeaker,
    overlayPrompt.hidden ? '' : overlayPrompt.textContent,
    intro.mode === 'launch' ? 'Drop' : 'Live'
  );
}

function renderBriefingOverlay() {
  renderDialoguePanel(
    [{ speaker: endgame.briefingActiveSpeaker, text: endgame.briefingVisibleText }],
    endgame.briefingActiveSpeaker,
    overlayPrompt.hidden ? '' : overlayPrompt.textContent,
    'Core Link'
  );
}

function startBriefingEntry(index) {
  const entry = CORE_SPRINT_BRIEFING[index];
  endgame.briefingIndex = index;
  endgame.briefingVisibleText = '';
  endgame.briefingTyping = true;
  endgame.briefingReady = false;
  endgame.briefingActiveSpeaker = entry.speaker;
  intro.pauseUntil = performance.now() + 90;
  endgame.briefingNextCharTime = intro.pauseUntil + DIALOGUE_CHAR_MS;
  setOverlayPrompt('', false);
  renderBriefingOverlay();
}

function startEndingEntry(index) {
  const screen = ENDING_SCREENS[index];
  const entry = screen.lines[0];
  endgame.endingVisibleText = '';
  endgame.endingTyping = true;
  endgame.endingReady = false;
  intro.pauseUntil = performance.now() + 90;
  endgame.endingNextCharTime = intro.pauseUntil + DIALOGUE_CHAR_MS;
  setOverlayPrompt('', false);
  renderDialoguePanel(
    [{ speaker: entry.speaker, text: '' }],
    entry.speaker,
    '',
    screen.badge || 'Archive'
  );
}

function completeBriefingEntry() {
  const entry = CORE_SPRINT_BRIEFING[endgame.briefingIndex];
  endgame.briefingVisibleText = entry.text;
  endgame.briefingTyping = false;
  endgame.briefingReady = true;
  endgame.briefingActiveSpeaker = entry.speaker;
  const isFinalEntry = endgame.briefingIndex === CORE_SPRINT_BRIEFING.length - 1;
  setOverlayPrompt(isFinalEntry ? 'PRESS START TO SPRINT' : 'PRESS START');
  renderBriefingOverlay();
}

function completeEndingEntry() {
  const screen = ENDING_SCREENS[endgame.endingIndex];
  const entry = screen.lines[0];
  endgame.endingVisibleText = entry.text;
  endgame.endingTyping = false;
  endgame.endingReady = true;
  setOverlayPrompt(screen.prompt, Boolean(screen.prompt));
  renderDialoguePanel(
    [{ speaker: entry.speaker, text: entry.text }],
    entry.speaker,
    screen.prompt,
    screen.badge || 'Archive'
  );
}

function advanceBriefingSequence() {
  if (endgame.briefingTyping) {
    completeBriefingEntry();
    return;
  }

  if (!endgame.briefingReady) {
    return;
  }

  playUiConfirmSound();
  if (endgame.briefingIndex < CORE_SPRINT_BRIEFING.length - 1) {
    startBriefingEntry(endgame.briefingIndex + 1);
    return;
  }

  hideOverlay();
  beginSprintPhase();
}

function playUiConfirmSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain) {
    return;
  }

  const when = soundtrack.context.currentTime + 0.01;
  createSfxVoice('square', midiToFrequency(88), when, 0.05, 0.08, midiToFrequency(95));
  createSfxVoice('triangle', midiToFrequency(76), when, 0.08, 0.05, midiToFrequency(83));
}

function playTransmissionBleep(speakerKey) {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.003;
  const baseNote = speakerKey === 'jett' ? 86 : 79;
  createSfxVoice('square', midiToFrequency(baseNote), start, 0.03, 0.04, midiToFrequency(baseNote + 2));
  createSfxVoice('triangle', midiToFrequency(baseNote - 12), start, 0.022, 0.016, midiToFrequency(baseNote - 10));
}

function playLaunchSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.03;
  createSfxVoice('triangle', midiToFrequency(40), start, 0.42, 0.12, midiToFrequency(52));
  createSfxVoice('square', midiToFrequency(57), start + 0.16, 0.22, 0.08, midiToFrequency(69));
}

function playCoreBeamSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain || !soundtrack.noiseBuffer) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.01;
  createSfxVoice('sawtooth', midiToFrequency(74), start, 0.12, 0.08, midiToFrequency(98));
  createSfxVoice('square', midiToFrequency(86), start + 0.02, 0.08, 0.05, midiToFrequency(103));

  const noiseSource = soundtrack.context.createBufferSource();
  const noiseFilter = soundtrack.context.createBiquadFilter();
  const noiseGain = soundtrack.context.createGain();

  noiseSource.buffer = soundtrack.noiseBuffer;
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.setValueAtTime(2800, start);
  noiseGain.gain.setValueAtTime(0.05, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(soundtrack.sfxGain);
  noiseSource.start(start);
  noiseSource.stop(start + 0.14);
}

function playDebrisImpactSound() {
  activateSoundtrack().catch(() => {});

  if (!soundtrack.context || !soundtrack.sfxGain || !soundtrack.noiseBuffer) {
    return;
  }

  const start = soundtrack.context.currentTime + 0.01;
  createSfxVoice('triangle', midiToFrequency(43), start, 0.18, 0.09, midiToFrequency(29));
  createSfxVoice('square', midiToFrequency(55), start, 0.07, 0.045, midiToFrequency(38));

  const noiseSource = soundtrack.context.createBufferSource();
  const noiseFilter = soundtrack.context.createBiquadFilter();
  const noiseGain = soundtrack.context.createGain();

  noiseSource.buffer = soundtrack.noiseBuffer;
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(920, start);
  noiseGain.gain.setValueAtTime(0.09, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);

  noiseSource.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(soundtrack.sfxGain);
  noiseSource.start(start);
  noiseSource.stop(start + 0.2);
}

function showTitleScreen() {
  intro.mode = 'title';
  intro.screenIndex = 0;
  intro.lineIndex = 0;
  intro.charIndex = 0;
  intro.visibleLines = [];
  intro.typing = false;
  intro.ready = true;
  intro.activeSpeaker = 'command';
  intro.launchProgress = 0;

  setOverlayMode('title');
  overlayLabel.textContent = isEndgameDebugStartEnabled() ? 'VX-99 / Finale Test' : 'VX-99 / Drop Protocol';
  overlayTitle.textContent = 'CORE DROP';
  overlayCopy.textContent = isEndgameDebugStartEnabled()
    ? 'Debug route armed. Press Start to drop straight into the Living Core finale.'
    : 'A one-way gravity dive from the neon undercity into the living core below.';
  setOverlayPrompt(isEndgameDebugStartEnabled() ? 'PRESS START FOR FINALE' : 'PRESS START');
  setStatus('Title Screen');
  startButton.textContent = 'Start Mission';
  drawDialoguePortrait('jett');
}

function startCurrentIntroEntry() {
  const entry = INTRO_SCREENS[intro.screenIndex][intro.lineIndex];
  intro.charIndex = 0;
  intro.visibleLines = [{ speaker: entry.speaker, text: '' }];
  intro.typing = true;
  intro.ready = false;
  intro.activeSpeaker = entry.speaker;
  intro.pauseUntil = performance.now() + 90;
  intro.nextCharTime = intro.pauseUntil + DIALOGUE_CHAR_MS;
  setOverlayPrompt('', false);
  renderDialogueOverlay();
}

function startIntroScreen(screenIndex) {
  intro.mode = 'dialogue';
  intro.screenIndex = screenIndex;
  intro.lineIndex = 0;
  setStatus(`Transmission ${screenIndex + 1}/2`);
  startButton.textContent = 'Advance';
  startCurrentIntroEntry();
}

function beginIntroSequence() {
  playUiConfirmSound();
  startIntroScreen(0);
  setSummary('Launch command channel open. Jett is receiving the drop brief.');
}

function completeCurrentIntroEntry() {
  const entry = INTRO_SCREENS[intro.screenIndex][intro.lineIndex];
  intro.visibleLines = [{ speaker: entry.speaker, text: entry.text }];
  intro.charIndex = entry.text.length;
  intro.typing = false;
  intro.ready = true;
  intro.activeSpeaker = entry.speaker;
  const isFinalEntry =
    intro.screenIndex === INTRO_SCREENS.length - 1 &&
    intro.lineIndex === INTRO_SCREENS[intro.screenIndex].length - 1;
  setOverlayPrompt(isFinalEntry ? 'PRESS START TO LAUNCH' : 'PRESS START');
  renderDialogueOverlay();
}

function beginLaunchTransition() {
  playLaunchSound();
  intro.mode = 'launch';
  intro.typing = false;
  intro.ready = false;
  intro.launchStartTime = performance.now();
  intro.launchProgress = 0;

  setOverlayMode('launch');
  overlayLabel.textContent = 'Launch Bay 03';
  overlayTitle.textContent = 'DROP COMMITTED';
  overlayCopy.textContent = 'Hatch open. Gravity sled hot. Descend.';
  setOverlayPrompt('', false);
  setStatus('Launch');
  setSummary('Jett is in the chute. Control transfers the moment the drop begins.');
  startButton.textContent = 'Launching...';
}

function advanceIntroSequence() {
  if (intro.mode === 'title') {
    beginIntroSequence();
    return;
  }

  if (intro.mode === 'dialogue') {
    if (intro.typing) {
      completeCurrentIntroEntry();
      return;
    }

    if (intro.ready) {
      playUiConfirmSound();
      if (intro.lineIndex < INTRO_SCREENS[intro.screenIndex].length - 1) {
        intro.lineIndex += 1;
        startCurrentIntroEntry();
      } else if (intro.screenIndex < INTRO_SCREENS.length - 1) {
        startIntroScreen(intro.screenIndex + 1);
      } else {
        beginLaunchTransition();
      }
    }
  }
}

function updateIntroSequence(timestamp) {
  if (intro.mode === 'dialogue' && intro.typing) {
    const entry = INTRO_SCREENS[intro.screenIndex][intro.lineIndex];

    while (intro.typing && timestamp >= intro.nextCharTime) {
      intro.activeSpeaker = entry.speaker;

      if (intro.charIndex < entry.text.length) {
        const nextCharacter = entry.text[intro.charIndex];
        intro.visibleLines[0].text += nextCharacter;
        intro.charIndex += 1;

        if (nextCharacter.trim()) {
          playTransmissionBleep(entry.speaker);
        }

        const extraDelay = nextCharacter === '.' || nextCharacter === '!' || nextCharacter === '?' ? 74 : nextCharacter === ',' ? 42 : 0;
        intro.nextCharTime += DIALOGUE_CHAR_MS + extraDelay;
      } else {
        completeCurrentIntroEntry();
      }
    }

    renderDialogueOverlay();
  } else if (endgame.phase === 'briefing' && endgame.briefingTyping) {
    const entry = CORE_SPRINT_BRIEFING[endgame.briefingIndex];

    while (endgame.briefingTyping && timestamp >= endgame.briefingNextCharTime) {
      if (endgame.briefingVisibleText.length < entry.text.length) {
        const nextCharacter = entry.text[endgame.briefingVisibleText.length];
        endgame.briefingVisibleText += nextCharacter;

        if (nextCharacter.trim()) {
          playTransmissionBleep(entry.speaker);
        }

        const extraDelay = nextCharacter === '.' || nextCharacter === '!' || nextCharacter === '?' ? 74 : nextCharacter === ',' ? 42 : 0;
        endgame.briefingNextCharTime += DIALOGUE_CHAR_MS + extraDelay;
      } else {
        completeBriefingEntry();
      }
    }

    renderBriefingOverlay();
  } else if (endgame.phase === 'ending' && endgame.endingTyping) {
    const screen = ENDING_SCREENS[endgame.endingIndex];
    const entry = screen.lines[0];

    while (endgame.endingTyping && timestamp >= endgame.endingNextCharTime) {
      if (endgame.endingVisibleText.length < entry.text.length) {
        const nextCharacter = entry.text[endgame.endingVisibleText.length];
        endgame.endingVisibleText += nextCharacter;

        if (nextCharacter.trim()) {
          playTransmissionBleep(entry.speaker);
        }

        const extraDelay = nextCharacter === '.' || nextCharacter === '!' || nextCharacter === '?' ? 74 : nextCharacter === ',' ? 42 : 0;
        endgame.endingNextCharTime += DIALOGUE_CHAR_MS + extraDelay;
      } else {
        completeEndingEntry();
      }
    }

    renderDialoguePanel(
      [{ speaker: entry.speaker, text: endgame.endingVisibleText }],
      entry.speaker,
      overlayPrompt.hidden ? '' : overlayPrompt.textContent,
      screen.badge || 'Archive'
    );
  } else if (intro.mode === 'launch') {
    intro.launchProgress = clamp((timestamp - intro.launchStartTime) / LAUNCH_DURATION_MS, 0, 1);

    if (intro.launchProgress >= 1) {
      intro.mode = 'none';
      startGame(true);
    }
  }
}

function createSprintHazard() {
  const config = getDifficultyConfig();
  const type = randomFromSeed(game.elapsed * 13.7 + endgame.sprintTimer * 2.1) > 0.38 ? 'debris' : 'strike';
  const avoidRadius = 28;
  const constrainHazardX = (rawX) => {
    if (Math.abs(rawX - game.ball.x) >= avoidRadius) {
      return rawX;
    }

    return clamp(
      rawX < game.ball.x ? game.ball.x - avoidRadius : game.ball.x + avoidRadius,
      34,
      GAME_WIDTH - 34
    );
  };

  if (type === 'debris') {
    return {
      type,
      x: constrainHazardX(28 + randomFromSeed(game.elapsed * 5.1 + endgame.sprintTimer) * (GAME_WIDTH - 56)),
      y: -24,
      width: 22 + randomFromSeed(game.elapsed * 3.4 + 7) * 18,
      height: 18 + randomFromSeed(game.elapsed * 4.8 + 3) * 18,
      vy: (295 + randomFromSeed(game.elapsed * 6.2 + 11) * 145) * config.debrisSpeedScale,
      active: true,
    };
  }

  return {
    type,
    x: constrainHazardX(34 + randomFromSeed(game.elapsed * 7.3 + endgame.sprintTimer * 4.3) * (GAME_WIDTH - 68)),
    y: 0,
    width: 30,
    telegraph: Math.max(0.3, 0.5 + config.strikeTelegraphBonus),
    initialTelegraph: Math.max(0.3, 0.5 + config.strikeTelegraphBonus),
    duration: 0.28,
    active: false,
  };
}

function beginLandingSequence() {
  endgame.phase = 'landing';
  endgame.landingTimer = 0;
  endgame.landingStartX = clamp(game.ball.x, BALL_RADIUS + 12, GAME_WIDTH - BALL_RADIUS - 12);
  game.running = false;
  game.paused = false;
  game.lastTimestamp = 0;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.trail = [];
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
  startButton.textContent = 'Stabilizing...';
  hideOverlay();
  setStatus('Core Floor');
  setSummary('The chamber floor catches Jett for a split second before the reactor tips into the ignition lane.');
  triggerPhaseCue('Core Floor', 'Brace for reactor tilt.');
  updateSoundtrackMix();
}

function beginCoreBossPhase() {
  const config = getDifficultyConfig();
  endgame.phase = 'boss';
  endgame.bossTimer = 0;
  endgame.nextBossRowIndex = 0;
  endgame.lastBossCenter = 0;
  game.scrollSpeed = config.bossBaseScrollSpeed;
  game.catchUpSpeed = 0;
  game.ball.vx = 0;
  game.ball.vy = 0;
  resetFloors();
  hideOverlay();
  setStatus('Living Core');
  setSummary('The living core is active. Its chamber is rejecting you with deliberate defense patterns.');
  pauseButton.disabled = false;
  startButton.textContent = 'Pause / Resume';
  triggerPhaseCue('Living Core', 'Survive the hostile chamber patterns.');
  updateSoundtrackMix();
}

function startDebugEndgameRun() {
  startGame(true);
  game.score = DEBUG_ENDGAME_SCORE;
  game.level = ENDGAME_TRIGGER_LEVEL;
  game.elapsed = DEBUG_ENDGAME_SCORE / getDifficultyConfig().scoreRate;
  updateHud();
  beginCoreBossPhase();
}

function beginSprintPhase() {
  const config = getDifficultyConfig();
  endgame.phase = 'sprint';
  endgame.sprintDuration = config.sprintDuration;
  endgame.sprintTimer = endgame.sprintDuration;
  endgame.sprintHazardTimer = 0.22 * config.sprintHazardIntervalScale;
  endgame.sprintHazards = [];
  game.running = true;
  game.paused = false;
  game.lastTimestamp = 0;
  game.ball.x = 24;
  game.ball.y = SPRINT_TRACK_Y - BALL_RADIUS;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.trail = [];
  pauseButton.disabled = false;
  pauseButton.textContent = 'Pause';
  startButton.textContent = 'Restart Run';
  hideOverlay();
  setStatus('Ignition Sprint');
  setSummary('The chamber is breaking apart. Reach the ignition node before the synchronization window collapses.');
  triggerPhaseCue('Ignition Sprint', 'Reach the ignition node.');
  updateSoundtrackMix();
}

function beginSprintBriefing() {
  const config = getDifficultyConfig();
  endgame.phase = 'briefing';
  endgame.briefingIndex = 0;
  endgame.briefingVisibleText = '';
  endgame.briefingTyping = false;
  endgame.briefingReady = false;
  endgame.briefingActiveSpeaker = 'command';
  endgame.sprintDuration = config.sprintDuration;
  endgame.sprintTimer = endgame.sprintDuration;
  endgame.sprintHazards = [];
  game.running = false;
  game.paused = false;
  game.ball.x = 24;
  game.ball.y = SPRINT_TRACK_Y - BALL_RADIUS;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.trail = [];
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
  startButton.textContent = 'Start Sprint';
  setStatus('Ignition Node');
  setSummary('Command is guiding Jett to the ignition node. One clean sprint finishes the mission.');
  triggerPhaseCue('Core Staging', 'The reactor floor is shifting beneath you.');
  startBriefingEntry(0);
  updateSoundtrackMix();
}

function updateLandingSequence(deltaTime) {
  endgame.landingTimer += deltaTime;
  const progress = clamp(endgame.landingTimer / CORE_LANDING_DURATION, 0, 1);
  const settle = smoothstep(0, 0.28, progress);
  const roll = smoothstep(0.34, 1, progress);

  game.ball.y = lerp(132, SPRINT_TRACK_Y - BALL_RADIUS, settle);
  game.ball.x = lerp(endgame.landingStartX, 24, roll);
  game.ball.vx = 0;
  game.ball.vy = 0;
  updateTrail();

  if (progress >= 1) {
    beginSprintBriefing();
  }
}

function beginActivationSequence() {
  endgame.phase = 'activation';
  endgame.activationTimer = 0;
  endgame.completionTime = game.elapsed;
  endgame.sprintHazards = [];
  game.running = false;
  game.paused = false;
  game.ball.x = SPRINT_NODE_X;
  game.ball.y = SPRINT_TRACK_Y - BALL_RADIUS;
  game.ball.vx = 0;
  game.ball.vy = 0;
  setStatus('Core Ignition');
  setSummary('Synchronization accepted. The living core is rebooting through Jett’s ignition link.');
  triggerPhaseCue('Core Synchronization', 'Ignition accepted.');
  playCoreIgnitionSound();
  updateSoundtrackMix();
}

function showEndingScreen(index) {
  const screen = ENDING_SCREENS[index];

  if (!screen) {
    resetGame();
    return;
  }

  endgame.endingIndex = index;
  endgame.phase = 'ending';
  game.running = false;
  game.paused = false;
  pauseButton.disabled = true;
  pauseButton.textContent = 'Pause';
  startButton.textContent = index === ENDING_SCREENS.length - 1 ? 'Return To Title' : 'Continue';

  if (screen.type === 'dialogue') {
    startEndingEntry(index);
  } else if (screen.type === 'stats') {
    const difficultyLabel = getDifficultyConfig().label;
    showOverlayHtml(
      screen.label,
      screen.title,
      `Score <strong>${Math.ceil(game.score)}</strong><br>Time <strong>${formatDuration(endgame.completionTime)}</strong><br>Difficulty <strong>${difficultyLabel}</strong><br>Best <strong>${game.best}</strong>`,
      screen.prompt
    );
  } else {
    showOverlayHtml(screen.label, screen.title, screen.html, screen.prompt);
  }

  if (screen.type === 'credits') {
    setStatus('Transmission Closed');
    setSummary('VX-99 is stable. Jett made the drop and came back alive.');
  } else {
    setStatus('Victory');
  }

  updateSoundtrackMix();
}

function beginEndingSequence() {
  const finalScore = Math.ceil(game.score);
  if (finalScore > game.best) {
    game.best = finalScore;
    saveBestScore(game.best);
  }
  updateHud();
  triggerPhaseCue('VX-99 Stabilized', 'Power is returning across the planet.');
  showEndingScreen(0);
}

function advanceEndingSequence() {
  if (endgame.phase !== 'ending') {
    return;
  }

  if (ENDING_SCREENS[endgame.endingIndex]?.type === 'dialogue' && endgame.endingTyping) {
    completeEndingEntry();
    return;
  }

  if (ENDING_SCREENS[endgame.endingIndex]?.type === 'dialogue' && !endgame.endingReady) {
    return;
  }

  playUiConfirmSound();
  showEndingScreen(endgame.endingIndex + 1);
}

function runVerticalPhysics(deltaTime, scoreRate) {
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
      const catchUpShift = Math.max(
        minimumVisibleShift,
        Math.min(rescueOverflow, game.catchUpSpeed * stepDelta)
      );

      game.catchUpSpeed = lerp(game.catchUpSpeed, targetCatchUpSpeed, catchUpBlend);
      shiftWorldUp(catchUpShift, false);
      game.ball.y = Math.min(game.ball.y, visibleLine);
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
  game.score += deltaTime * scoreRate;
}

function updateCoreBossPhase(deltaTime) {
  const config = getDifficultyConfig();
  endgame.bossTimer += deltaTime;
  game.scrollSpeed = config.bossBaseScrollSpeed + Math.sin(endgame.bossTimer * 1.4) * config.bossWaveAmplitude;
  runVerticalPhysics(deltaTime, getDifficultyConfig().scoreRate * 0.55);

  if (game.gameOver) {
    return;
  }

  if (endgame.bossTimer >= CORE_BOSS_DURATION) {
    beginLandingSequence();
  }
}

function updateSprintPhase(deltaTime) {
  const config = getDifficultyConfig();
  endgame.sprintTimer -= deltaTime;
  endgame.sprintHazardTimer -= deltaTime;

  updateInputAxis(deltaTime);
  game.ball.x += game.ball.vx * deltaTime;
  game.ball.x = clamp(game.ball.x, BALL_RADIUS + 4, GAME_WIDTH - BALL_RADIUS - 4);
  game.ball.y = SPRINT_TRACK_Y - BALL_RADIUS;
  game.ball.vy = 0;
  updateTrail();

  if (endgame.sprintHazardTimer <= 0) {
    endgame.sprintHazards.push(createSprintHazard());
    endgame.sprintHazardTimer = SPRINT_HAZARD_INTERVAL
      * config.sprintHazardIntervalScale
      * lerp(0.58, 0.34, 1 - endgame.sprintTimer / Math.max(1, endgame.sprintDuration));
  }

  endgame.sprintHazards = endgame.sprintHazards.filter((hazard) => {
    if (hazard.type === 'debris') {
      hazard.y += hazard.vy * deltaTime;
      if (!hazard.impacted && hazard.y + hazard.height >= SPRINT_TRACK_Y) {
        hazard.impacted = true;
        playDebrisImpactSound();
      }
      if (hazard.y > GAME_HEIGHT + 32) {
        return false;
      }

      const overlapsX = game.ball.x + BALL_RADIUS > hazard.x - hazard.width * 0.5 && game.ball.x - BALL_RADIUS < hazard.x + hazard.width * 0.5;
      const overlapsY = game.ball.y + BALL_RADIUS > hazard.y && game.ball.y - BALL_RADIUS < hazard.y + hazard.height;

      if (overlapsX && overlapsY) {
        endGame('Falling core debris crushed the sprint lane before ignition.');
        return false;
      }

      return true;
    }

    if (!hazard.active) {
      hazard.telegraph -= deltaTime;
      if (hazard.telegraph <= 0) {
        hazard.active = true;
        playCoreBeamSound();
      }
      return true;
    }

    hazard.duration -= deltaTime;
    const insideStrike = Math.abs(game.ball.x - hazard.x) < hazard.width * 0.5 + BALL_RADIUS;

    if (insideStrike) {
      endGame('A core discharge sealed the ignition path before you could cross it.');
      return false;
    }

    return hazard.duration > 0;
  });

  game.elapsed += deltaTime;
  game.score += deltaTime * getDifficultyConfig().scoreRate * 0.35;

  if (game.gameOver) {
    return;
  }

  if (endgame.sprintTimer <= 0) {
    endGame('The ignition window collapsed before you could stabilize the core.');
    return;
  }

  if (game.ball.x >= SPRINT_NODE_X) {
    beginActivationSequence();
  }
}

function updateActivationSequence(deltaTime) {
  endgame.activationTimer += deltaTime;
  game.ball.vx = 0;
  game.ball.vy = 0;
  game.ball.x = SPRINT_NODE_X;
  game.ball.y = SPRINT_TRACK_Y - BALL_RADIUS;
  updateTrail();

  if (endgame.activationTimer >= CORE_ACTIVATION_DURATION) {
    beginEndingSequence();
  }
}

function resetGame() {
  const config = getDifficultyConfig();
  resetEndgameState();
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
  setSummary(`Drop corridor is idle. ${config.label} mode is armed. Start the mission to enter VX-99.`);
  showTitleScreen();
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
    resetEndgameState();
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
  intro.mode = 'none';
  game.running = true;
  game.paused = false;
  game.gameOver = false;
  game.lastTimestamp = 0;
  setStatus('Live');
  setSummary(`Run active on ${config.label} mode. Each level pushes you deeper toward the core and the floor patterns will keep tightening.`);
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
    showOverlay('Signal Hold', 'Run Paused', 'Tap the playfield again to resume and keep descending through the openings.', 'PRESS START TO RESUME');
    pauseButton.textContent = 'Resume';
  } else {
    setStatus('Live');
    setSummary('Run resumed. The shaft keeps accelerating as the descent deepens.');
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
  const difficultyLabel = getDifficultyConfig().label;
  const coreReached = endgame.phase !== 'none' || game.level >= ENDGAME_TRIGGER_LEVEL ? 'Yes' : 'No';
  setSummary(`Run ended at ${finalScore} points. ${reason}`);
  showOverlayHtml(
    'Run Lost',
    `Score ${finalScore}`,
    `${escapeHtml(reason)}<br><br>Level <strong>${game.level}</strong><br>Difficulty <strong>${difficultyLabel}</strong><br>Core Reached <strong>${coreReached}</strong>`,
    'PRESS START TO RESTART'
  );
  startButton.textContent = 'Restart Run';
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

function showOverlay(label, title, copy, prompt = '') {
  setOverlayMode('generic');
  overlayLabel.textContent = label;
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  setOverlayPrompt(prompt, Boolean(prompt));
  overlay.hidden = false;
}

function hideOverlay() {
  setOverlayPrompt('', false);
  overlay.hidden = true;
}

function updateHud() {
  const config = getDifficultyConfig();
  scoreValue.textContent = String(Math.ceil(game.score));
  bestValue.textContent = String(game.best);
  levelValue.textContent = String(game.level);
  zoneValue.textContent = getZoneLabel();
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
      const nextFloor = endgame.phase === 'boss'
        ? createCoreBossFloor(nextSpawnY, endgame.nextBossRowIndex++)
        : createFloor(nextSpawnY, game.level + recycledCount);
      Object.assign(floor, nextFloor);
      nextSpawnY += FLOOR_SPACING;
      recycledCount += 1;
    }
  });
}

function updateDifficulty() {
  if (endgame.phase !== 'none') {
    game.level = Math.max(game.level, ENDGAME_TRIGGER_LEVEL);
    return;
  }

  const config = getDifficultyConfig();
  const depthProgress = getRunDepthProgress();
  const levelFromScore = Math.floor(game.score / SCORE_PER_LEVEL) + 1;
  const baseRamp = Math.pow(depthProgress, 1.02);
  const pressureRamp = smoothstep(0.4, 1, depthProgress) * 0.08;
  const finalRamp = smoothstep(0.88, 1, depthProgress) * 0.12;
  const ramp = clamp(baseRamp + pressureRamp + finalRamp, 0, 1);

  game.level = Math.min(levelFromScore, ENDGAME_TRIGGER_LEVEL);
  game.scrollSpeed = lerp(config.baseScrollSpeed, config.maxScrollSpeed, ramp);
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
  if (endgame.phase === 'none' && game.level >= ENDGAME_TRIGGER_LEVEL) {
    beginCoreBossPhase();
  }

  if (endgame.phase === 'boss') {
    updateCoreBossPhase(deltaTime);
    return;
  }

  if (endgame.phase === 'landing') {
    updateLandingSequence(deltaTime);
    return;
  }

  if (endgame.phase === 'sprint') {
    updateSprintPhase(deltaTime);
    return;
  }

  if (endgame.phase === 'activation') {
    updateActivationSequence(deltaTime);
    return;
  }

  runVerticalPhysics(deltaTime, getDifficultyConfig().scoreRate);
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

function drawBackground(themeOverride = null) {
  const theme = themeOverride || getWorldTheme();
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

function drawSprintTrack() {
  const theme = getWorldThemeForDepth(6);
  const trackTop = SPRINT_TRACK_Y;
  const nodePulse = 0.55 + Math.sin(game.elapsed * 7) * 0.18;

  context.fillStyle = 'rgba(8, 10, 18, 0.88)';
  context.fillRect(0, trackTop, GAME_WIDTH, GAME_HEIGHT - trackTop);

  context.strokeStyle = rgbToString(theme.glowColor, 0.22);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, trackTop);
  context.lineTo(GAME_WIDTH, trackTop);
  context.stroke();

  for (let x = 14; x < GAME_WIDTH; x += 34) {
    drawChevronStrip(x, trackTop + 10, 18, 10, theme.alertColor, 0.12);
  }

  context.strokeStyle = rgbToString(theme.accentColor, 0.34 + nodePulse * 0.25);
  context.lineWidth = 2.5;
  context.strokeRect(SPRINT_NODE_X - 18, trackTop - 28, 28, 28);
  context.fillStyle = rgbToString([255, 255, 255], 0.18 + nodePulse * 0.18);
  context.fillRect(SPRINT_NODE_X - 14, trackTop - 24, 20, 20);
  context.strokeStyle = 'rgba(255, 214, 120, 0.42)';
  context.lineWidth = 2;
  for (let index = 0; index < 3; index += 1) {
    context.beginPath();
    context.moveTo(SPRINT_NODE_X - 64 - index * 20, trackTop - 14 - index * 3);
    context.lineTo(SPRINT_NODE_X - 30 - index * 10, trackTop - 14);
    context.stroke();
  }
  context.fillStyle = 'rgba(255, 240, 176, 0.94)';
  context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
  context.textAlign = 'center';
  context.fillText('NODE', SPRINT_NODE_X - 4, trackTop - 36);
  context.textAlign = 'left';

  endgame.sprintHazards.forEach((hazard) => {
    if (hazard.type === 'debris') {
      context.save();
      context.shadowBlur = 14;
      context.shadowColor = '#ff9a45';
      context.fillStyle = 'rgba(255, 154, 69, 0.86)';
      context.fillRect(
        hazard.x - hazard.width * 0.5,
        hazard.y,
        hazard.width,
        hazard.height
      );
      context.restore();
    } else {
      if (!hazard.active) {
        const beamProgress = clamp(
          1 - hazard.telegraph / Math.max(hazard.initialTelegraph || hazard.telegraph || 1, 0.001),
          0,
          1
        );
        const beamHeadY = beamProgress * GAME_HEIGHT;
        context.fillStyle = 'rgba(255, 108, 108, 0.26)';
        context.fillRect(hazard.x - hazard.width * 0.6, trackTop - 8, hazard.width * 1.2, 8);
        context.fillStyle = 'rgba(255, 108, 108, 0.24)';
        context.fillRect(hazard.x - hazard.width * 0.5, 0, hazard.width, beamHeadY);
        context.fillStyle = 'rgba(255, 170, 120, 0.2)';
        context.fillRect(hazard.x - hazard.width * 0.3, 0, hazard.width * 0.6, beamHeadY);
      } else {
        context.save();
        context.shadowBlur = 20;
        context.shadowColor = '#89fbff';
        context.fillStyle = 'rgba(137, 251, 255, 0.78)';
        context.fillRect(hazard.x - hazard.width * 0.5, 0, hazard.width, GAME_HEIGHT);
        context.restore();
        context.fillStyle = 'rgba(137, 251, 255, 0.24)';
        context.fillRect(hazard.x - hazard.width * 0.7, trackTop - 10, hazard.width * 1.4, 10);
      }
    }
  });

  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
  context.fillText(`Ignition ${Math.max(0, Math.ceil(endgame.sprintTimer))}`, 16, 22);
}

function drawLandingScene() {
  const theme = getWorldThemeForDepth(6);
  const progress = clamp(endgame.landingTimer / CORE_LANDING_DURATION, 0, 1);
  const tilt = smoothstep(0.34, 1, progress) * 24;
  const leftY = SPRINT_TRACK_Y + tilt * 0.5;
  const rightY = SPRINT_TRACK_Y - tilt * 0.5;

  drawBackground(theme);

  context.fillStyle = 'rgba(8, 10, 18, 0.88)';
  context.beginPath();
  context.moveTo(0, leftY);
  context.lineTo(GAME_WIDTH, rightY);
  context.lineTo(GAME_WIDTH, GAME_HEIGHT);
  context.lineTo(0, GAME_HEIGHT);
  context.closePath();
  context.fill();

  context.strokeStyle = rgbToString(theme.glowColor, 0.22);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, leftY);
  context.lineTo(GAME_WIDTH, rightY);
  context.stroke();

  for (let x = 14; x < GAME_WIDTH; x += 34) {
    const y = lerp(leftY, rightY, x / GAME_WIDTH) + 10;
    drawChevronStrip(x, y, 18, 10, theme.alertColor, 0.12);
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.9)';
  context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
  context.fillText(progress < 0.34 ? 'Core Floor' : 'Reactor Tilt', 16, 22);

  if (progress > 0.4) {
    const sparkAlpha = smoothstep(0.4, 1, progress) * 0.5;
    context.save();
    context.strokeStyle = `rgba(255, 214, 120, ${sparkAlpha})`;
    context.lineWidth = 1.4;
    for (let index = 0; index < 6; index += 1) {
      const sparkX = game.ball.x - 2 + index * 2.5;
      context.beginPath();
      context.moveTo(sparkX, game.ball.y + BALL_RADIUS - 1);
      context.lineTo(sparkX - 8 - index, game.ball.y + BALL_RADIUS + 8 + index * 2);
      context.stroke();
    }
    context.restore();
  }

  drawBall();
}

function drawActivationScene() {
  const theme = getWorldThemeForDepth(6);
  const pulse = smoothstep(0, 1, Math.min(1, endgame.activationTimer / CORE_ACTIVATION_DURATION));

  drawBackground(theme);
  drawSprintTrack();
  drawBall();

  const coreBurst = context.createRadialGradient(
    SPRINT_NODE_X - 4,
    SPRINT_TRACK_Y - 18,
    8,
    SPRINT_NODE_X - 4,
    SPRINT_TRACK_Y - 18,
    190
  );
  coreBurst.addColorStop(0, `rgba(255,255,255,${0.48 + pulse * 0.42})`);
  coreBurst.addColorStop(0.2, `rgba(138,245,255,${0.24 + pulse * 0.28})`);
  coreBurst.addColorStop(0.55, `rgba(104,190,255,${0.08 + pulse * 0.16})`);
  coreBurst.addColorStop(1, 'rgba(104,190,255,0)');
  context.fillStyle = coreBurst;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  context.fillStyle = `rgba(255, 255, 255, ${0.12 + pulse * 0.68})`;
  context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  if (pulse > 0.2) {
    context.save();
    context.fillStyle = `rgba(255, 255, 255, ${0.2 + pulse * 0.34})`;
    context.beginPath();
    context.arc(SPRINT_NODE_X - 4, SPRINT_TRACK_Y - 18, 28 + pulse * 120, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawEndingBackdrop() {
  const baseDepth = endgame.endingIndex === 0 ? 6 : endgame.endingIndex === 3 ? 0.4 : 5.5;
  const theme = getWorldThemeForDepth(baseDepth);
  drawBackground(theme);

  if (endgame.endingIndex === 0 || endgame.endingIndex === 1) {
    const relight = context.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    relight.addColorStop(0, 'rgba(130, 230, 255, 0.08)');
    relight.addColorStop(1, 'rgba(255, 255, 255, 0.18)');
    context.fillStyle = relight;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  if (endgame.endingIndex === 2) {
    context.save();
    context.fillStyle = 'rgba(255, 214, 132, 0.16)';
    context.beginPath();
    context.arc(GAME_WIDTH * 0.5, GAME_HEIGHT * 0.42, 96, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function drawTitleScene() {
  const time = performance.now() * 0.00018;
  const theme = getWorldThemeForDepth(0.18);
  const alarmPulse = 0.35 + Math.sin(time * 8.5) * 0.18;
  const lightningSeed = fract(time * 0.22);
  const lightningAlpha = lightningSeed > 0.965 ? (1 - (lightningSeed - 0.965) / 0.035) * 0.36 : 0;

  drawWorldGradient(theme, time);
  drawFarShaft(theme, time * 0.72);

  context.fillStyle = rgbToString(theme.bottomColor, 0.7);
  context.beginPath();
  context.moveTo(32, 0);
  context.lineTo(132, 0);
  context.lineTo(214, GAME_HEIGHT);
  context.lineTo(146, GAME_HEIGHT);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(GAME_WIDTH - 32, 0);
  context.lineTo(GAME_WIDTH - 132, 0);
  context.lineTo(GAME_WIDTH - 214, GAME_HEIGHT);
  context.lineTo(GAME_WIDTH - 146, GAME_HEIGHT);
  context.closePath();
  context.fill();

  context.fillStyle = rgbToString(theme.glowColor, 0.08);
  context.fillRect(0, 0, GAME_WIDTH, 120);

  context.fillStyle = `rgba(255, 92, 92, ${0.08 + alarmPulse * 0.12})`;
  context.fillRect(116, 98, 128, 10);

  for (let index = 0; index < 14; index += 1) {
    const x = 12 + index * 26;
    const height = 20 + randomFromSeed(index + 1.3) * 42;
    context.fillStyle = rgbToString(mixRgb(theme.midColor, theme.glowColor, 0.2), 0.22);
    context.fillRect(x, 40 - height, 18, height);
    context.fillStyle = rgbToString(theme.accentColor, 0.35);
    context.fillRect(x + 6, 38 - height, 4, 4);
  }

  context.strokeStyle = rgbToString(theme.alertColor, 0.36);
  context.lineWidth = 2;
  context.strokeRect(116, 98, 128, 34);
  drawChevronStrip(116, 100, 128, 30, theme.alertColor, 0.14);

  context.fillStyle = rgbToString(theme.glowColor, 0.16);
  context.beginPath();
  context.moveTo(GAME_WIDTH * 0.5, 148);
  context.lineTo(202, 206);
  context.lineTo(158, 206);
  context.closePath();
  context.fill();

  context.fillStyle = rgbToString([255, 255, 255], 0.88);
  context.beginPath();
  context.arc(GAME_WIDTH * 0.5, 186, 5, 0, Math.PI * 2);
  context.fill();

  if (lightningAlpha > 0.01) {
    context.save();
    context.strokeStyle = `rgba(180, 238, 255, ${lightningAlpha})`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(GAME_WIDTH * 0.5 + 22, 40);
    context.lineTo(GAME_WIDTH * 0.5 - 8, 132);
    context.lineTo(GAME_WIDTH * 0.5 + 18, 176);
    context.lineTo(GAME_WIDTH * 0.5 - 20, 268);
    context.stroke();
    context.restore();
  }
}

function drawDialogueScene() {
  const time = performance.now() * 0.00018;
  const theme = getWorldThemeForDepth(0.95);

  drawWorldGradient(theme, time * 0.4);

  context.fillStyle = rgbToString([8, 10, 18], 0.82);
  context.fillRect(0, 0, 48, GAME_HEIGHT);
  context.fillRect(GAME_WIDTH - 48, 0, 48, GAME_HEIGHT);

  context.strokeStyle = rgbToString(theme.glowColor, 0.12);
  context.lineWidth = 2;
  [28, 44, GAME_WIDTH - 28, GAME_WIDTH - 44].forEach((x) => {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, GAME_HEIGHT);
    context.stroke();
  });

  for (let index = 0; index < 4; index += 1) {
    const light = 0.32 + Math.sin(time * 5 + index * 1.3) * 0.18;
    context.fillStyle = rgbToString([255, 98, 98], 0.2 + light * 0.18);
    context.fillRect(56 + index * 76, 76, 22, 6);
  }

  context.strokeStyle = rgbToString(theme.alertColor, 0.26);
  context.lineWidth = 2;
  context.strokeRect(88, 136, 184, 286);
  context.strokeRect(118, 168, 124, 224);
  drawChevronStrip(88, 430, 184, 16, theme.alertColor, 0.12);

  context.fillStyle = rgbToString(theme.glowColor, 0.1);
  context.fillRect(120, 170, 120, 220);

  context.strokeStyle = rgbToString(theme.accentColor, 0.22);
  for (let index = 0; index < 5; index += 1) {
    context.beginPath();
    context.moveTo(138, 196 + index * 40);
    context.lineTo(222, 196 + index * 40);
    context.stroke();
  }
}

function drawLaunchScene() {
  const time = performance.now() * 0.0002;
  const theme = getWorldThemeForDepth(1.3 + intro.launchProgress * 0.7);
  const hatchOpen = smoothstep(0.08, 0.58, intro.launchProgress);
  const boarding = smoothstep(0.06, 0.46, intro.launchProgress);
  const dropAmount = smoothstep(0.34, 1, intro.launchProgress);
  const orbCenterX = GAME_WIDTH * 0.5;
  const orbCenterY = lerp(254, 388, dropAmount);

  drawWorldGradient(theme, time);
  drawDialogueScene();

  const doorTravel = 96 * hatchOpen;
  context.fillStyle = rgbToString([9, 12, 20], 0.96);
  context.fillRect(88, 146 - doorTravel, 184, 64);
  context.fillRect(88, 358 + doorTravel, 184, 64);

  const shaftGlow = context.createLinearGradient(0, 180, 0, GAME_HEIGHT);
  shaftGlow.addColorStop(0, rgbToString(theme.glowColor, 0));
  shaftGlow.addColorStop(1, rgbToString(mixRgb(theme.alertColor, theme.accentColor, 0.28), 0.28 + intro.launchProgress * 0.22));
  context.fillStyle = shaftGlow;
  context.fillRect(118, 196, 124, GAME_HEIGHT - 196);

  context.strokeStyle = rgbToString(theme.alertColor, 0.28);
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(90, 236);
  context.lineTo(142, 236);
  context.lineTo(166, 258);
  context.stroke();

  const pilotX = lerp(124, orbCenterX - 4, boarding);
  const pilotY = lerp(236, orbCenterY + 1, boarding);
  const pilotAlpha = 1 - smoothstep(0.3, 0.58, intro.launchProgress);

  context.save();
  context.globalAlpha = pilotAlpha;
  context.fillStyle = 'rgba(255, 215, 110, 0.9)';
  context.fillRect(pilotX - 3, pilotY - 18, 6, 18);
  context.fillRect(pilotX - 7, pilotY - 8, 5, 3);
  context.fillRect(pilotX + 2, pilotY - 8, 5, 3);
  context.fillStyle = 'rgba(18, 19, 24, 0.96)';
  context.beginPath();
  context.arc(pilotX, pilotY - 22, 5.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(134, 242, 255, 0.88)';
  context.fillRect(pilotX - 3, pilotY - 24, 6, 2);
  context.restore();

  const orbGlow = context.createRadialGradient(
    orbCenterX - 5,
    orbCenterY - 6,
    4,
    orbCenterX,
    orbCenterY,
    36
  );
  orbGlow.addColorStop(0, 'rgba(255, 249, 214, 0.95)');
  orbGlow.addColorStop(0.35, 'rgba(255, 215, 110, 0.88)');
  orbGlow.addColorStop(0.72, 'rgba(255, 157, 41, 0.38)');
  orbGlow.addColorStop(1, 'rgba(255, 157, 41, 0)');

  context.save();
  context.shadowBlur = 24;
  context.shadowColor = '#ffb347';
  context.fillStyle = orbGlow;
  context.beginPath();
  context.arc(orbCenterX, orbCenterY, 30, 0, Math.PI * 2);
  context.fill();
  context.restore();

  context.fillStyle = '#ffd76e';
  context.beginPath();
  context.arc(orbCenterX, orbCenterY, 17, 0, Math.PI * 2);
  context.fill();

  context.save();
  context.beginPath();
  context.arc(orbCenterX, orbCenterY, 15, 0, Math.PI * 2);
  context.clip();

  const canopy = context.createLinearGradient(orbCenterX - 16, orbCenterY - 16, orbCenterX + 16, orbCenterY + 16);
  canopy.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
  canopy.addColorStop(0.4, 'rgba(255, 239, 170, 0.18)');
  canopy.addColorStop(1, 'rgba(255, 160, 44, 0.04)');
  context.fillStyle = canopy;
  context.fillRect(orbCenterX - 16, orbCenterY - 16, 32, 32);

  context.fillStyle = 'rgba(18, 19, 24, 0.96)';
  context.beginPath();
  context.arc(orbCenterX - 1, orbCenterY - 1, 4.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(134, 242, 255, 0.88)';
  context.fillRect(orbCenterX - 4, orbCenterY - 4, 8, 2);
  context.fillStyle = 'rgba(255, 215, 110, 0.82)';
  context.fillRect(orbCenterX - 2, orbCenterY - 15, 4, 24);
  context.restore();

  context.strokeStyle = 'rgba(255, 247, 210, 0.72)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(orbCenterX, orbCenterY, 16.5, 0, Math.PI * 2);
  context.stroke();

  context.save();
  context.translate(orbCenterX, orbCenterY + 10);
  context.fillStyle = rgbToString(theme.accentColor, 0.4 + dropAmount * 0.18);
  context.fillRect(-3, 0, 6, 26);
  context.fillStyle = 'rgba(255, 215, 110, 0.22)';
  context.beginPath();
  context.moveTo(-9, 20);
  context.lineTo(0, 54 + dropAmount * 16);
  context.lineTo(9, 20);
  context.closePath();
  context.fill();
  context.restore();
}

function drawFloors() {
  game.floors.forEach((floor) => {
    const leftWidth = floor.gapX;
    const rightX = floor.gapX + floor.gapWidth;
    const rightWidth = GAME_WIDTH - rightX;
    const fill = floor.kind === 'core'
      ? (floor.glow % 2 === 0 ? '#9cfaff' : '#ffe68a')
      : (floor.glow === 0 ? '#59f3ff' : '#ff4edd');

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

  context.fillStyle = 'rgba(255, 255, 255, 0.55)';
  context.beginPath();
  context.ellipse(game.ball.x - 4.5, game.ball.y - 4.4, 2.6, 1.5, -0.8, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(255, 247, 210, 0.72)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(game.ball.x, game.ball.y, BALL_RADIUS - 0.5, 0, Math.PI * 2);
  context.stroke();
}

function drawObjectiveRibbon() {
  const objective = getObjectiveLabel();
  if (!objective || intro.mode === 'title') {
    return;
  }

  const width = 180;
  const x = GAME_WIDTH * 0.5 - width * 0.5;
  context.save();
  context.fillStyle = 'rgba(4, 10, 20, 0.76)';
  context.strokeStyle = 'rgba(89, 243, 255, 0.2)';
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, 10, width, 28, 12);
  context.fill();
  context.stroke();
  context.fillStyle = 'rgba(255, 204, 92, 0.92)';
  context.font = '700 10px "Eurostile", "Trebuchet MS", sans-serif';
  context.textAlign = 'center';
  context.fillText(objective, GAME_WIDTH * 0.5, 28);
  context.restore();
}

function drawPhaseCue() {
  if (presentation.cueTimer <= 0 && presentation.flashAlpha <= 0.01) {
    return;
  }

  if (presentation.flashAlpha > 0.01) {
    context.save();
    context.fillStyle = `rgba(255, 255, 255, ${presentation.flashAlpha})`;
    context.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    context.restore();
  }

  if (presentation.cueTimer <= 0) {
    return;
  }

  const reveal = smoothstep(0, 0.2, Math.min(1, presentation.cueTimer / 2.2));
  const alpha = Math.min(1, presentation.cueTimer / 0.4, (2.2 - presentation.cueTimer) / 0.4);
  const width = 240;
  const height = presentation.cueSubtitle ? 56 : 42;
  const x = GAME_WIDTH * 0.5 - width * 0.5;
  const y = 58 - (1 - reveal) * 12;

  context.save();
  context.globalAlpha = Math.max(0, alpha);
  context.fillStyle = 'rgba(3, 8, 16, 0.86)';
  context.strokeStyle = 'rgba(255, 204, 92, 0.26)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.roundRect(x, y, width, height, 16);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255, 255, 255, 0.94)';
  context.font = '700 13px "Eurostile", "Trebuchet MS", sans-serif';
  context.textAlign = 'center';
  context.fillText(presentation.cueTitle, GAME_WIDTH * 0.5, y + 19);
  if (presentation.cueSubtitle) {
    context.fillStyle = 'rgba(234, 248, 255, 0.82)';
    context.font = '500 10px "Work Sans", sans-serif';
    context.fillText(presentation.cueSubtitle, GAME_WIDTH * 0.5, y + 36);
  }
  context.restore();
}

function drawFrame() {
  if (intro.mode === 'title') {
    drawTitleScene();
  } else if (intro.mode === 'dialogue') {
    drawDialogueScene();
  } else if (intro.mode === 'launch') {
    drawLaunchScene();
  } else if (endgame.phase === 'boss') {
    drawBackground(getWorldThemeForDepth(5.8));
    drawFloors();
    drawBall();
    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
    context.fillText(`Core ${Math.max(0, Math.ceil(CORE_BOSS_DURATION - endgame.bossTimer))}`, 16, 22);
    context.fillText('Living Core', GAME_WIDTH - 86, 22);
  } else if (endgame.phase === 'landing') {
    drawLandingScene();
  } else if (endgame.phase === 'briefing') {
    drawBackground(getWorldThemeForDepth(6));
    drawSprintTrack();
    drawBall();
  } else if (endgame.phase === 'sprint') {
    drawBackground(getWorldThemeForDepth(6));
    drawSprintTrack();
    drawBall();
  } else if (endgame.phase === 'activation') {
    drawActivationScene();
  } else if (endgame.phase === 'ending') {
    drawEndingBackdrop();
  } else {
    drawBackground();
    drawFloors();
    drawBall();

    context.fillStyle = 'rgba(255, 255, 255, 0.9)';
    context.font = '700 11px "Eurostile", "Trebuchet MS", sans-serif';
    context.fillText(`Score ${Math.ceil(game.score)}`, 16, 22);
    context.fillText(`Level ${game.level}`, GAME_WIDTH - 74, 22);
  }

  if (intro.mode !== 'title') {
    drawObjectiveRibbon();
  }

  drawPhaseCue();
}

function frame(timestamp) {
  try {
    updateIntroSequence(timestamp);

    let uiDelta = 0;
    if (presentation.lastFrameTimestamp) {
      uiDelta = clamp((timestamp - presentation.lastFrameTimestamp) / 1000, 0, 0.05);
    }
    presentation.lastFrameTimestamp = timestamp;

    let deltaTime = 0;
    if (game.running || endgame.phase === 'activation' || endgame.phase === 'landing') {
      if (!game.lastTimestamp) {
        game.lastTimestamp = timestamp;
      }

      deltaTime = clamp((timestamp - game.lastTimestamp) / 1000, 0, 0.032);
      game.lastTimestamp = timestamp;

      updateGame(deltaTime);
      updateHud();
    }

    presentation.cueTimer = Math.max(0, presentation.cueTimer - uiDelta);
    presentation.flashAlpha = Math.max(0, presentation.flashAlpha - Math.max(uiDelta, 0.016) * 1.6);
    presentation.currentZoneLabel = getZoneLabel();

    drawFrame();
  } catch (error) {
    reportRuntimeError(error);
  }
  requestAnimationFrame(frame);
}

function updateDirectionalInput(direction, isActive) {
  inputState[direction] = isActive;

  touchButtons.forEach((button) => {
    button.classList.toggle('is-active', inputState[button.dataset.dir]);
  });
}

function handlePrimaryAction() {
  if (endgame.phase === 'ending') {
    advanceEndingSequence();
    return;
  }

  if (endgame.phase === 'briefing') {
    advanceBriefingSequence();
    return;
  }

  if (intro.mode === 'title' && isEndgameDebugStartEnabled()) {
    startDebugEndgameRun();
    return;
  }

  if (intro.mode === 'title' || intro.mode === 'dialogue') {
    advanceIntroSequence();
    return;
  }

  if (intro.mode === 'launch' || endgame.phase === 'activation') {
    return;
  }

  if (game.gameOver) {
    startGame(true);
    return;
  }

  if (!game.started) {
    beginIntroSequence();
    return;
  }

  pauseGame();
}

function handleKeyState(event, isActive) {
  const key = event.key.toLowerCase();
  const isModifierOnly = key === 'shift' || key === 'meta' || key === 'alt' || key === 'control';

  if (isActive) {
    activateSoundtrack().catch((error) => {
      console.error('Audio activation failed', error);
    });
  }

  if (isActive && !isModifierOnly && (intro.mode === 'dialogue' || endgame.phase === 'briefing')) {
    handlePrimaryAction();
    event.preventDefault();
    return;
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
    if (intro.mode === 'none' && endgame.phase !== 'ending' && (game.running || game.paused)) {
      pauseGame();
    }
  }

  if (isActive && (event.code === 'Space' || key === ' ')) {
    handlePrimaryAction();
    event.preventDefault();
  }

  if (isActive && key === 'enter' && (intro.mode === 'title' || intro.mode === 'dialogue')) {
    handlePrimaryAction();
    event.preventDefault();
  }

  if (isActive && event.shiftKey && key === 'e' && intro.mode === 'title' && !game.started) {
    debugState.startMode = 'endgame';
    showTitleScreen();
    playUiConfirmSound();
    startDebugEndgameRun();
    event.preventDefault();
  }

  if (isActive && key === 'm') {
    toggleMusicEnabled();
    event.preventDefault();
  }
}

function togglePlayfieldState() {
  handlePrimaryAction();
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
  setSummary(`Drop corridor is idle. ${config.label} mode is armed. Start the mission to enter VX-99.`);
}

window.addEventListener('keydown', (event) => handleKeyState(event, true));
window.addEventListener('keyup', (event) => handleKeyState(event, false));
window.addEventListener('error', (event) => {
  reportRuntimeError(event.error || `${event.message} @ ${event.filename || 'unknown'}:${event.lineno || 0}`);
});
window.addEventListener('unhandledrejection', (event) => {
  reportRuntimeError(event.reason || 'Unhandled promise rejection');
});
window.addEventListener('blur', () => {
  updateDirectionalInput('left', false);
  updateDirectionalInput('right', false);

  if (game.running && endgame.phase !== 'activation') {
    pauseGame();
  }
});

touchButtons.forEach((button) => {
  const direction = button.dataset.dir;

  const activate = (event) => {
    event.preventDefault();
    if (!game.running && !game.paused) {
      return;
    }
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
  handlePrimaryAction();
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
setImmersiveMode(false);
setMusicButtonState();
setImmersiveButtonState();
setDifficultyControlState();
setVolumeControlState();
resetGame();
if (debugState.autostartEndgame) {
  startDebugEndgameRun();
}
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
