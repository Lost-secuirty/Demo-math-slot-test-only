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

// ---- Reel grid: classic 3x3 ----
export const GRID = {
  reels: 3,
  rows: 3,
  symbolSize: 200, // px of one cell at design resolution
  gap: 14, // gap between cells
  // top-left of the reel viewport (well is 3*214=642 wide, centred on 1080)
  x: 219,
  y: 320,
};

// ---- Palette (deep blue + gold sheen) ----
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

// Virtual reel-strip weighting (stops) — higher weight = more common.
// This is the primary RTP lever. The strip is sized in the hundreds (like a
// real virtual strip) so RTP can be tuned at fine resolution. Coin is the
// bonus symbol and is deliberately frequent (~25%/cell) so that 6+ coins —
// the Hold & Win trigger — land at a real rate of ~1 in 100 spins. See
// docs/PAR-SHEET.md + docs/adr/0011 for how the self-computed 96% TOTAL is split.
export const SYMBOL_WEIGHTS = {
  cherry: 520,
  lemon: 480,
  plum: 440,
  watermelon: 360,
  bell: 260,
  bar: 180,
  seven: 120,
  coin: 788, // ~25%/cell -> 6+ coins (Hold & Win trigger) ~1 in 100 spins
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
// This is the RTP engine of the game (it contributes ~50pp of the ~96% total;
// see docs/PAR-SHEET.md). The coin economy below is read by BOTH the live
// feature (holdAndWin.js) AND the math model (slotmath.js) so the played game
// is identical to the math model — change a number here and recompute.
export const BONUS = {
  triggerCount: 6, // coins needed on the board to start the bonus
  respins: 3, // respins reset to this each time a new coin lands
  respinLandChance: 0.05, // per empty cell, per respin (full-board fill is rare)
  // coin cash values (x bet) used to fill landed coins (weighted; cash EV ~4x)
  coinValues: [1, 2, 3, 4, 5, 8, 10, 15, 20],
  coinValueWeights: [24, 21, 17, 12, 9, 7, 5, 3, 2],
  // per-coin jackpot odds — cumulative thresholds on a [0,1) roll: a coin is a
  // MAJOR if roll < major, else MINOR if < minor, else MINI if < mini, else a
  // weighted cash value. (~5.5% of coins are jackpot coins.)
  jackpotOdds: { major: 0.003, minor: 0.015, mini: 0.055 },
};

// ---- Jackpots (x bet). GRAND awarded when all 9 cells fill with coins ----
export const JACKPOTS = {
  MINI: { mult: 20, color: COLORS.jackpotMini },
  MINOR: { mult: 50, color: COLORS.jackpotMinor },
  MAJOR: { mult: 200, color: COLORS.jackpotMajor },
  GRAND: { mult: 500, color: COLORS.jackpotGrand },
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

// ---- Visual quality (drop these if any frame dips) ----
export const QUALITY = {
  particlesPerBurst: 28,
  maxParticles: 400,
  glowQuality: 0.25,
  shakeIntensity: 14,
  godrays: true,
};

// ---- Audio (procedural WebAudio; ADR-0002 — no asset files) ----
// All gains 0..1. The engine routes SFX and the ambient dread bed through
// separate sub-gains under a master, so ambience can swell independently
// during the bonus. masterVolume is the player-facing default (persisted).
export const AUDIO = {
  masterVolume: 0.5, // default master; the settings slider drives this 0..1
  sfxGain: 1.0, // SFX channel level (relative to master)
  ambienceBaseGain: 0.12, // resting ambience level while the dread bed plays
  // low drone: two near-unison oscillators through a lowpass + slow LFO breath
  drone: { freqA: 58, freqB: 61.5, lowpassHz: 220, lfoHz: 0.07 },
  // sparse "distant tones" punctuating the drone with deliberate silences
  distantToneEveryMs: 9000,
  distantToneJitterMs: 4000,
  distantToneFreqs: [196, 233, 311],
};

// ---- Unease (Spokey horror layer — VISUAL/AUDIO ONLY) ----
// Calibrated "just out of reach" dread, gated to the Hold & Win bonus. None of
// this reads or writes the bonus ledger (coin amounts / totals / respins) — it
// only decorates the existing animation timeline. Keep events RARE so the game
// reads as a normal slot that's subtly wrong, not a jump-scare. See
// src/unease.js + docs/LEARNINGS.md.
export const UNEASE = {
  enabled: true,
  swellMs: 1800, // ambience ramp time entering/leaving the bonus
  vignetteAlpha: 0.5, // darkened edges during the bonus
  ambienceBonusGain: 0.5, // ambience level the bonus swells to
  flickerChancePerRespin: 0.35, // chance of a light flicker per respin event
  flickerDipMs: 90, // flicker dip duration
  watcherChance: 0.4, // chance a distant watcher appears in a bonus
  watcherApproachChance: 0.5, // chance it edges closer on a later respin
  watcherBaseAlpha: 0.18, // how faint the watcher starts (low = barely there)
};

// ---- Persisted player settings (localStorage) ----
export const STORAGE_KEY = 'coinsHoldWin.settings.v1';

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
  // "Spokey" — a dark-but-colorful horror skin. Behaves like a normal slot;
  // the unease (vignette, flicker, a distant watcher) is gated to the Hold &
  // Win bonus (see UNEASE + src/unease.js). The standard keys recolor the
  // existing scene via applyTheme; the extra keys below are read only by the
  // Spokey-only chrome (cabinet/fog) with fallbacks, so other themes ignore
  // them. Symbol art is unchanged here — a procedural reskin is a later pass.
  spokey: {
    bgTop: 0x1a0e14, // dried-blood maroon
    bgBottom: 0x05060a, // cold near-black
    frameGold: 0x6e7f53, // sickly verdigris brass
    frameGoldDark: 0x2c2118, // rusted iron
    coin: 0xc8412a, // ember accent
    win: 0xc69a3a, // tarnished gold
    ray: 0x3a1f2a, // dim crimson godrays
    // Spokey-only chrome colors:
    fog: 0x0a0f14,
    cabinet: 0x120a10,
    cabinetEdge: 0x4a2e22,
    marquee: 0x8a2f22,
    ledOn: 0xd14a2a,
    ledOff: 0x2a1410,
  },
};
export const THEME_NAMES = Object.keys(THEMES);

// ---- RTP target (self-computed; see docs/PAR-SHEET.md + docs/adr/0011) ----
// The default config above is tuned so the game's TOTAL RTP (base lines +
// the Hold & Win feature, which contributes the majority) computes to a
// typical online-slot RTP of ~96%, verified by simulation end-to-end by the
// math harness (`monteCarloFullGame()`). There are no demo nudges: the played
// game draws each cell from the weights above and pays strictly by the
// paytable, so the experienced RTP equals the self-computed RTP.
export const RTP_TARGET = 0.96;
