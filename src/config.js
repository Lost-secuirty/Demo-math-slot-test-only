// =====================================================================
// config.js — every tunable knob for "Coins: Hold & Win" lives here.
// Reskin the theme, retune the math, or trade visuals<->performance
// without touching the engine.
// =====================================================================

// ---- Design canvas (game is authored at this resolution, then scaled) ----
export const DESIGN = {
  width: 1080,
  height: 1280,
};

// ---- Reel grid: classic Playson 3x3 ----
export const GRID = {
  reels: 3,
  rows: 3,
  symbolSize: 200, // px of one cell at design resolution
  gap: 14, // gap between cells
  // top-left of the reel viewport (well is 3*214=642 wide, centred on 1080)
  x: 219,
  y: 320,
};

// ---- Palette (deep blue + gold Playson sheen) ----
export const COLORS = {
  bgTop: 0x12306e,
  bgBottom: 0x04081c,
  frameGold: 0xffd25a,
  frameGoldDark: 0xb8841f,
  reelWell: 0x0a1330,
  reelWellAlt: 0x0d1a3d,
  textGold: 0xffe08a,
  textWhite: 0xffffff,
  win: 0xffe14d,
  coin: 0xffcf3f,
  coinDark: 0xc8881a,
  jackpotMini: 0x69d0ff,
  jackpotMinor: 0x7bff8a,
  jackpotMajor: 0xff8ad0,
  jackpotGrand: 0xff5a3c,
};

// ---- Symbols ----
// id, label, kind, base color used by the procedural renderer.
// "coin" is the bonus symbol that drives Hold & Win.
export const SYMBOLS = [
  { id: 'cherry', kind: 'fruit', color: 0xe23b4e, tier: 1 },
  { id: 'lemon', kind: 'fruit', color: 0xf6d033, tier: 1 },
  { id: 'plum', kind: 'fruit', color: 0x9b59c9, tier: 1 },
  { id: 'watermelon', kind: 'fruit', color: 0x2ecc71, tier: 2 },
  { id: 'bell', kind: 'bell', color: 0xffc93c, tier: 3 },
  { id: 'bar', kind: 'bar', color: 0xf2f2f2, tier: 4 },
  { id: 'seven', kind: 'seven', color: 0xff3b3b, tier: 5 },
  { id: 'coin', kind: 'coin', color: 0xffcf3f, tier: 0 }, // bonus
];

// Reel strip weighting — higher weight = more common. Coin is rare.
export const SYMBOL_WEIGHTS = {
  cherry: 26,
  lemon: 24,
  plum: 22,
  watermelon: 18,
  bell: 13,
  bar: 9,
  seven: 6,
  coin: 7, // tuned so 6+ coin bonus triggers occasionally
};

// ---- Paylines over the 3x3 grid (row indices per reel column) ----
// Each line: [rowOnReel0, rowOnReel1, rowOnReel2]
export const PAYLINES = [
  [1, 1, 1], // middle
  [0, 0, 0], // top
  [2, 2, 2], // bottom
  [0, 1, 2], // diagonal down
  [2, 1, 0], // diagonal up
];

// ---- Paytable: payout multiplier (x bet) for 3-of-a-kind on a line ----
export const PAYTABLE = {
  cherry: 4,
  lemon: 5,
  plum: 6,
  watermelon: 10,
  bell: 20,
  bar: 40,
  seven: 100,
};

// ---- Hold & Win bonus ----
export const BONUS = {
  triggerCount: 6, // coins needed on the board to start the bonus
  respins: 3, // respins reset to this each time a new coin lands
  // coin cash values (x bet) used to fill landed coins
  coinValues: [1, 2, 3, 5, 8, 10, 15, 20, 25],
  coinValueWeights: [22, 20, 16, 12, 10, 8, 6, 4, 2],
};

// ---- Jackpots (x bet). GRAND awarded when all 9 cells fill with coins ----
export const JACKPOTS = {
  MINI: { mult: 20, color: COLORS.jackpotMini },
  MINOR: { mult: 50, color: COLORS.jackpotMinor },
  MAJOR: { mult: 200, color: COLORS.jackpotMajor },
  GRAND: { mult: 1000, color: COLORS.jackpotGrand },
};
export const JACKPOT_ORDER = ['MINI', 'MINOR', 'MAJOR', 'GRAND'];

// ---- Economy ----
export const ECONOMY = {
  startingBalance: 1000,
  betLevels: [1, 2, 5, 10, 25, 50],
  defaultBetIndex: 2, // -> 5
};

// ---- Spin timing / feel ----
export const SPIN = {
  reelStaggerMs: 260, // delay between each reel starting to stop
  minSpinMs: 900, // shortest spin before reels begin stopping
  maxBlur: 14, // motion blur at full speed
  bounceOvershoot: 26, // px overshoot for the stop bounce
  autoSpinDelayMs: 900, // pause between auto spins
  idleToAttractMs: 12000, // idle time before attract/auto mode kicks in
};

// ---- "Big win" celebration thresholds (x bet) ----
export const BIGWIN = {
  big: 15,
  mega: 40,
  epic: 100,
};

// ---- Global time scale (debug slow-mo). 1 = normal. ----
export const TIME = { scale: 1 };

// ---- Demo tuning (this is a show-piece, so keep the action lively) ----
export const DEMO = {
  bonusChance: 0.05, // chance a spin is forced into a Hold & Win trigger
  winChance: 0.42, // chance a non-bonus spin is nudged to a line win
};

// ---- Visual quality (drop these if any frame dips) ----
export const QUALITY = {
  particlesPerBurst: 28,
  maxParticles: 400,
  glowQuality: 0.25,
  shakeIntensity: 14,
  godrays: true,
};

// ---- Theme presets (live-switchable via the debug panel) ----
// Each preset overrides keys on COLORS, then the scene repaints the
// background gradient, reel frame, godrays and glow accents. Baked symbol
// art is unchanged (full symbol reskin is a separate task).
export const THEMES = {
  classic: {
    bgTop: 0x12306e,
    bgBottom: 0x04081c,
    frameGold: 0xffd25a,
    frameGoldDark: 0xb8841f,
    coin: 0xffcf3f,
    win: 0xffe14d,
    ray: 0x4f7bd6,
  },
  neon: {
    bgTop: 0x1a0b3d,
    bgBottom: 0x05010f,
    frameGold: 0x36f0ff,
    frameGoldDark: 0xb02bff,
    coin: 0xff36c4,
    win: 0x4dfff0,
    ray: 0xb02bff,
  },
  mystical: {
    bgTop: 0x14324a,
    bgBottom: 0x050b16,
    frameGold: 0xffe08a,
    frameGoldDark: 0x3fae9c,
    coin: 0x6fe3c8,
    win: 0xffe08a,
    ray: 0x2f7d8a,
  },
  sunset: {
    bgTop: 0x6e1f3a,
    bgBottom: 0x1a0610,
    frameGold: 0xffd25a,
    frameGoldDark: 0xd1552a,
    coin: 0xff8a3c,
    win: 0xffd25a,
    ray: 0xff6a4f,
  },
};
export const THEME_NAMES = Object.keys(THEMES);

// ---- Certified RTP preset (see docs/PAR-SHEET.md + docs/adr/0010) ----
// The default game above is a deliberately generous show-piece demo: its
// base (line) RTP is ~91.2% and it leans on DEMO nudges for liveliness.
// This preset retunes ONLY the virtual-reel weights (the primary RTP
// lever — paytable unchanged) so the base game certifies to a real ~96%
// RTP, the regulated-online-slot target. Verified by the math harness:
// theoretical 96.0328% (exact enumeration) and Monte-Carlo 95.99% / 2M
// spins (theory inside the 95% CI). Apply with:
//   slotmath.buildModel({ weights: RTP96_WEIGHTS })
export const RTP96_WEIGHTS = {
  cherry: 26,
  lemon: 24,
  plum: 22,
  watermelon: 21,
  bell: 11,
  bar: 7,
  seven: 5,
  coin: 6,
};
export const RTP96_TARGET = 0.96;
