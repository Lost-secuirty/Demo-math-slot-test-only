// =====================================================================
// slotmath.js — pure slot-math verification harness (no Pixi).
//
// Computes the game's math the way a certification lab does:
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
//                         which is intractable to enumerate (the doc/labs
//                         use Monte-Carlo for hold-and-win features).
//   - parSheet()        : a human-readable Probability/Accounting Report.
//
// The model defaults to the live `config.js`. Pass overrides (e.g. the
// RTP96 preset) to certify an alternate tuning. This module is the math
// model; it does not drive the renderer.
// =====================================================================

import { SYMBOLS, SYMBOL_WEIGHTS, PAYLINES, PAYTABLE, BONUS, JACKPOTS, ECONOMY } from './config.js';

// Hold & Win coin-decision odds — lifted from holdAndWin.js `_decideCoin`
// so the bonus Monte-Carlo matches the live feature exactly.
export const DEFAULT_BONUS_ODDS = {
  major: 0.03, // roll < .03            -> MAJOR jackpot coin
  minor: 0.09, // .03 <= roll < .09     -> MINOR
  mini: 0.2, // .09 <= roll < .2        -> MINI
  respinLandChance: 0.16, // per empty cell, per respin
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

// ---- Hold & Win coin decision (pure port of holdAndWin `_decideCoin`) --
export function decideCoin(rng, model = defaultModel()) {
  const { odds, jackpots, coinValues, coinValueWeights } = model.bonus;
  const roll = rng();
  if (roll < odds.major) return { jackpot: 'MAJOR', amount: jackpots.MAJOR };
  if (roll < odds.minor) return { jackpot: 'MINOR', amount: jackpots.MINOR };
  if (roll < odds.mini) return { jackpot: 'MINI', amount: jackpots.MINI };
  // weighted cash value (x bet) — mirrors utils.weightedPick
  const total = coinValueWeights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < coinValues.length; i++) {
    r -= coinValueWeights[i];
    if (r <= 0) return { jackpot: null, amount: coinValues[i] };
  }
  return { jackpot: null, amount: coinValues[coinValues.length - 1] };
}

// Simulate one Hold & Win round given the triggering coin cells.
// Returns total payout (x bet) for the round. Pure: rng injected.
export function simulateBonus(triggerCells, model, rng) {
  const reels = model.paylines[0].length;
  const rows = Math.max(...model.paylines.flat()) + 1;
  const cellCount = reels * rows;
  const coins = new Array(cellCount).fill(null);
  for (const idx of triggerCells) coins[idx] = decideCoin(rng, model);

  let respins = model.bonus.respins;
  while (respins > 0 && coins.includes(null)) {
    let landed = false;
    for (let i = 0; i < cellCount; i++) {
      if (coins[i] === null && rng() < model.bonus.odds.respinLandChance) {
        coins[i] = decideCoin(rng, model);
        landed = true;
      }
    }
    respins = landed ? model.bonus.respins : respins - 1;
  }

  let total = coins.reduce((s, c) => s + (c ? c.amount : 0), 0);
  const filledAll = !coins.includes(null);
  if (filledAll) total += model.bonus.jackpots.GRAND;
  return { total, filledAll, coinsCollected: coins.filter(Boolean).length };
}

// ---- Monte-Carlo: full game (lines + Hold & Win bonus), seeded ---------
// The bonus triggers naturally when `triggerCount`+ coin symbols land on
// the grid — exactly what the live `evaluate()` counts. This is the
// total-RTP figure a lab would simulate for a hold-and-win feature.
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
