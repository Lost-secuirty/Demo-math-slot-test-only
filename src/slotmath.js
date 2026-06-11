// =====================================================================
// slotmath.js — pure slot-math verification harness (no Pixi).
//
// Computes the game's RTP by enumeration + simulation:
//   - theoreticalRtp()  : exact RTP / hit-frequency / volatility by
//                         full enumeration of one payline (the PAR-sheet
//                         calculation). Total RTP = per-line x #paylines
//                         (expectation is linear, even across overlapping
//                         lines).
//   - monteCarloLine()  : seeded high-volume simulation of the base line
//                         game with a 95% confidence interval — the
//                         convergence check (theoretical should sit inside
//                         the simulated CI).
//   - monteCarloFullGame: full simulation INCLUDING the Hold & Win bonus,
//                         which is intractable to enumerate (Monte-Carlo is
//                         the practical way to model hold-and-win features).
//   - parSheet()        : a human-readable Probability/Accounting Report.
//
// The model defaults to the live `config.js`. Pass overrides to
// `buildModel()` to recompute an alternate tuning. This module is the math
// model; it does not drive the renderer.
// =====================================================================

import { SYMBOLS, SYMBOL_WEIGHTS, PAYLINES, PAYTABLE, BONUS, JACKPOTS, ECONOMY } from './config.js';
import { play as playBonus } from './features/holdAndWin.js';

// Hold & Win coin-decision odds — sourced from config (BONUS) so the bonus
// Monte-Carlo matches the live feature (holdAndWin.js) exactly. The live
// game and the math model read the SAME numbers; there is no second
// copy to drift out of sync.
export const DEFAULT_BONUS_ODDS = {
  major: BONUS.jackpotOdds.major, // roll < major          -> MAJOR jackpot coin
  minor: BONUS.jackpotOdds.minor, // major <= roll < minor -> MINOR
  mini: BONUS.jackpotOdds.mini, // minor <= roll < mini    -> MINI
  respinLandChance: BONUS.respinLandChance, // per empty cell, per respin
};

// The default math model = the live game's config.
export function defaultModel() {
  return {
    symbols: SYMBOLS.map((s) => s.id),
    weights: { ...SYMBOL_WEIGHTS },
    paytable: { ...PAYTABLE },
    paylines: PAYLINES.map((l) => [...l]),
    bonusSymbol: 'coin',
    jackpotSymbol: 'seven', // top line payer, used for jackpot-odds reporting
    bet: ECONOMY.betLevels[ECONOMY.defaultBetIndex],
    bonus: {
      triggerCount: BONUS.triggerCount,
      respins: BONUS.respins,
      coinValues: [...BONUS.coinValues],
      coinValueWeights: [...BONUS.coinValueWeights],
      jackpots: {
        MINI: JACKPOTS.MINI.mult,
        MINOR: JACKPOTS.MINOR.mult,
        MAJOR: JACKPOTS.MAJOR.mult,
        GRAND: JACKPOTS.GRAND.mult,
      },
      odds: { ...DEFAULT_BONUS_ODDS },
    },
  };
}

// Shallow+nested merge so callers can override just the keys they care
// about (e.g. { weights, paytable }) and inherit the rest.
export function buildModel(overrides = {}) {
  const base = defaultModel();
  return {
    ...base,
    ...overrides,
    bonus: { ...base.bonus, ...(overrides.bonus || {}) },
  };
}

// ---- Seeded RNG (mulberry32) — deterministic, so simulations/tests are
// reproducible and never flake. Returns a function() -> [0,1). ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- Probabilities -----------------------------------------------------
export function symbolProbabilities(weights) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const p = {};
  for (const id of Object.keys(weights)) p[id] = weights[id] / total;
  return { p, total };
}

// Cumulative table for fast weighted picks with an injected rng.
function cumulative(weights) {
  const ids = Object.keys(weights);
  const table = [];
  let acc = 0;
  for (const id of ids) {
    acc += weights[id];
    table.push([acc, id]);
  }
  return { table, total: acc, ids };
}

function pickSymbol(cum, rng) {
  const x = rng() * cum.total;
  for (const [edge, id] of cum.table) if (x < edge) return id;
  return cum.table[cum.table.length - 1][1];
}

// ---- Theoretical (exact) per-line math via full enumeration ------------
// Enumerates all symbols^reels combinations for ONE payline, weighted by
// probability. Exact — this is the PAR-sheet calculation.
export function theoreticalRtp(model = defaultModel()) {
  const reels = model.paylines[0].length;
  const { p } = symbolProbabilities(model.weights);
  const ids = model.symbols;

  let mean = 0;
  let hit = 0;
  const outcomes = [];
  const enumerate = (depth, combo, prob) => {
    if (depth === reels) {
      const payout =
        combo.every((s) => s === combo[0]) && model.paytable[combo[0]]
          ? model.paytable[combo[0]]
          : 0;
      mean += prob * payout;
      if (payout > 0) hit += prob;
      outcomes.push([prob, payout]);
      return;
    }
    for (const id of ids) enumerate(depth + 1, [...combo, id], prob * p[id]);
  };
  enumerate(0, [], 1);

  const variance = outcomes.reduce((s, [pr, x]) => s + pr * (x - mean) ** 2, 0);
  const nLines = model.paylines.length;
  const jackpotProb = p[model.jackpotSymbol] ** reels;

  return {
    perLineRtp: mean, // expected payout per line (x bet=1)
    lineRtp: mean * nLines, // total base-game RTP (all paylines)
    houseEdge: 1 - mean * nLines, // base-game house edge
    hitFrequencyPerLine: hit,
    sdPerLine: Math.sqrt(variance),
    jackpotProb,
    jackpotOneIn: jackpotProb > 0 ? 1 / jackpotProb : Infinity,
    nLines,
    symbolProbabilities: p,
  };
}

// ---- Monte-Carlo: base line game (seeded) with 95% CI ------------------
export function monteCarloLine(model = defaultModel(), { seed = 12345, spins = 1_000_000 } = {}) {
  const cum = cumulative(model.weights);
  const rng = mulberry32(seed);
  const reels = model.paylines[0].length;
  const rows = Math.max(...model.paylines.flat()) + 1;

  let sum = 0;
  let sumsq = 0;
  let wins = 0;
  for (let n = 0; n < spins; n++) {
    // grid[reel][row]
    const grid = [];
    for (let r = 0; r < reels; r++) {
      const col = [];
      for (let row = 0; row < rows; row++) col.push(pickSymbol(cum, rng));
      grid.push(col);
    }
    let payout = 0;
    let won = false;
    for (const line of model.paylines) {
      const a = grid[0][line[0]];
      let same = true;
      for (let r = 1; r < reels; r++) if (grid[r][line[r]] !== a) same = false;
      if (same && model.paytable[a]) {
        payout += model.paytable[a];
        won = true;
      }
    }
    sum += payout;
    sumsq += payout * payout;
    if (won) wins++;
  }

  const mean = sum / spins;
  const variance = sumsq / spins - mean * mean;
  const se = Math.sqrt(variance / spins);
  return {
    spins,
    seed,
    rtp: mean,
    hitFrequency: wins / spins,
    sd: Math.sqrt(variance),
    ci95Low: mean - 1.96 * se,
    ci95High: mean + 1.96 * se,
    ci95HalfwidthPp: 1.96 * se * 100,
  };
}

// ---- Hold & Win feature: ONE pure source of truth -----------------------
// decideCoin + the respin loop live in `features/holdAndWin.js` so the math
// harness and the live renderer share identical logic (no copy to drift).
// `decideCoin` is re-exported for the math API; `simulateBonus` keeps its
// ledger-only return shape — the harness needs the payout, not the renderer
// event stream that `play()` also produces.
export { decideCoin } from './features/holdAndWin.js';

// Simulate one Hold & Win round given the triggering coin cells. Pure: rng
// injected. Delegates to the feature's play() (identical RNG draw order, so
// the seeded RTP is unchanged) and drops the renderer event stream.
export function simulateBonus(triggerCells, model, rng) {
  const { total, filledAll, coinsCollected } = playBonus(triggerCells, model, rng);
  return { total, filledAll, coinsCollected };
}

// ---- Monte-Carlo: full game (lines + Hold & Win bonus), seeded ---------
// The bonus triggers naturally when `triggerCount`+ coin symbols land on
// the grid — exactly what the live `evaluate()` counts. This is the
// total-RTP figure this simulation computes for a hold-and-win feature.
export function monteCarloFullGame(
  model = defaultModel(),
  { seed = 12345, spins = 1_000_000 } = {},
) {
  const cum = cumulative(model.weights);
  const rng = mulberry32(seed);
  const reels = model.paylines[0].length;
  const rows = Math.max(...model.paylines.flat()) + 1;
  const cellCount = reels * rows;

  let lineSum = 0;
  let bonusSum = 0;
  let sumsq = 0;
  let lineWins = 0;
  let bonusTriggers = 0;
  let grands = 0;
  let maxWin = 0; // largest single-spin payout seen (x bet) — a PAR-sheet figure

  for (let n = 0; n < spins; n++) {
    const flat = [];
    for (let i = 0; i < cellCount; i++) flat.push(pickSymbol(cum, rng));
    const grid = [];
    for (let r = 0; r < reels; r++) grid.push(flat.slice(r * rows, r * rows + rows));

    // line payout
    let payout = 0;
    let won = false;
    for (const line of model.paylines) {
      const a = grid[0][line[0]];
      let same = true;
      for (let r = 1; r < reels; r++) if (grid[r][line[r]] !== a) same = false;
      if (same && model.paytable[a]) {
        payout += model.paytable[a];
        won = true;
      }
    }
    lineSum += payout;
    if (won) lineWins++;

    // bonus trigger
    const coinCells = [];
    for (let i = 0; i < cellCount; i++) if (flat[i] === model.bonusSymbol) coinCells.push(i);
    let bonusPayout = 0;
    if (coinCells.length >= model.bonus.triggerCount) {
      bonusTriggers++;
      const res = simulateBonus(coinCells, model, rng);
      bonusPayout = res.total;
      bonusSum += bonusPayout;
      if (res.filledAll) grands++;
    }

    const spinTotal = payout + bonusPayout;
    sumsq += spinTotal * spinTotal;
    if (spinTotal > maxWin) maxWin = spinTotal;
  }

  const totalSum = lineSum + bonusSum;
  const mean = totalSum / spins;
  const variance = sumsq / spins - mean * mean;
  const se = Math.sqrt(variance / spins);
  return {
    spins,
    seed,
    rtp: mean,
    lineRtp: lineSum / spins,
    bonusRtp: bonusSum / spins,
    hitFrequency: lineWins / spins,
    bonusTriggerRate: bonusTriggers / spins,
    bonusTriggerOneIn: bonusTriggers > 0 ? spins / bonusTriggers : Infinity,
    grandRate: grands / spins,
    maxWin,
    sd: Math.sqrt(variance),
    ci95Low: mean - 1.96 * se,
    ci95High: mean + 1.96 * se,
    ci95HalfwidthPp: 1.96 * se * 100,
  };
}

// ---- PAR sheet (structured + formatted) --------------------------------
export function parSheet(model = defaultModel()) {
  const th = theoreticalRtp(model);
  const { total } = symbolProbabilities(model.weights);
  return {
    virtualStops: total,
    nLines: th.nLines,
    baseRtp: th.lineRtp,
    houseEdge: th.houseEdge,
    hitFrequencyPerLine: th.hitFrequencyPerLine,
    sdPerLine: th.sdPerLine,
    jackpotSymbol: model.jackpotSymbol,
    jackpotOneIn: th.jackpotOneIn,
    symbolProbabilities: th.symbolProbabilities,
  };
}
