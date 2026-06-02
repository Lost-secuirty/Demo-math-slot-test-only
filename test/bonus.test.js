import { describe, it, expect } from 'vitest';
import {
  decideCoin,
  simulateBonus,
  buildModel,
  defaultModel,
  monteCarloFullGame,
  mulberry32,
  DEFAULT_BONUS_ODDS,
} from '../src/slotmath.js';
import { chiSquareCategorical } from './helpers/stats.js';
import { BONUS, JACKPOTS } from '../src/config.js';

// Hold & Win bonus economics. The respin "lock coins -> respin empties ->
// reset on a new coin -> resolve" loop is a two-phase open/resolve ledger
// (ported from the testing-kits partial_fill harness). All amounts are in
// x-bet units (bet normalised to 1).

// A scripted RNG that returns a fixed queue (ported from the Drive
// suite's ScriptedRng) — makes coin decisions exactly assertable.
const scripted = (values) => {
  let i = 0;
  return () => values[i++];
};

describe('decideCoin', () => {
  it('returns the right jackpot tier / cash value for boundary rolls', () => {
    expect(decideCoin(scripted([0.01]), defaultModel())).toEqual({
      jackpot: 'MAJOR',
      amount: JACKPOTS.MAJOR.mult,
    });
    expect(decideCoin(scripted([0.05]), defaultModel())).toEqual({
      jackpot: 'MINOR',
      amount: JACKPOTS.MINOR.mult,
    });
    expect(decideCoin(scripted([0.15]), defaultModel())).toEqual({
      jackpot: 'MINI',
      amount: JACKPOTS.MINI.mult,
    });
    // roll >= .2 -> weighted cash value; second draw 0 picks the first value
    expect(decideCoin(scripted([0.5, 0]), defaultModel())).toEqual({
      jackpot: null,
      amount: BONUS.coinValues[0],
    });
  });

  it('average coin value matches the analytic expected value (~15.6x)', () => {
    const model = defaultModel();
    const rng = mulberry32(2026);
    const n = 200_000;
    let sum = 0;
    for (let i = 0; i < n; i++) sum += decideCoin(rng, model).amount;
    // EV = .03*200 + .06*50 + .11*20 + .80*mean(cashWeighted=5.5) = 15.6
    expect(Math.abs(sum / n - 15.6)).toBeLessThan(0.3);
  });

  it('cash-value distribution matches the coin-value weights', () => {
    const model = defaultModel();
    const rng = mulberry32(99);
    const total = BONUS.coinValueWeights.reduce((a, b) => a + b, 0);
    const prob = {};
    BONUS.coinValues.forEach((v, i) => (prob[v] = BONUS.coinValueWeights[i] / total));
    const observed = Object.fromEntries(BONUS.coinValues.map((v) => [v, 0]));
    let cashCount = 0;
    for (let i = 0; i < 300_000; i++) {
      const c = decideCoin(rng, model);
      if (!c.jackpot) {
        observed[c.amount]++;
        cashCount++;
      }
    }
    const chi2 = chiSquareCategorical(observed, prob, cashCount);
    expect(chi2).toBeLessThan(20.09); // dof=8, 1% critical (robust)
  });
});

describe('jackpot ladder', () => {
  it('is strictly increasing MINI < MINOR < MAJOR < GRAND', () => {
    const m = defaultModel().bonus.jackpots;
    expect(m.MINI).toBeLessThan(m.MINOR);
    expect(m.MINOR).toBeLessThan(m.MAJOR);
    expect(m.MAJOR).toBeLessThan(m.GRAND);
  });
});

describe('simulateBonus (open -> resolve ledger)', () => {
  it('filling all 9 cells awards the GRAND jackpot', () => {
    const model = buildModel({
      bonus: { odds: { ...DEFAULT_BONUS_ODDS, respinLandChance: 1 } },
    });
    const res = simulateBonus([0, 1, 2], model, mulberry32(5));
    expect(res.filledAll).toBe(true);
    expect(res.coinsCollected).toBe(9);
    expect(res.total).toBeGreaterThanOrEqual(model.bonus.jackpots.GRAND);
  });

  it('with no new coins landing, only the trigger coins are collected', () => {
    const model = buildModel({
      bonus: { odds: { ...DEFAULT_BONUS_ODDS, respinLandChance: 0 } },
    });
    const res = simulateBonus([0, 1, 2, 3, 4, 5], model, mulberry32(5));
    expect(res.filledAll).toBe(false);
    expect(res.coinsCollected).toBe(6);
    expect(res.total).toBeGreaterThan(0);
  });
});

describe('natural bonus trigger rate (demo config)', () => {
  it('is vanishingly rare without the DEMO nudges (lives off forced triggers)', () => {
    const fg = monteCarloFullGame(defaultModel(), { seed: 777, spins: 200_000 });
    expect(fg.bonusTriggerRate).toBeLessThan(0.001);
    expect(fg.bonusRtp).toBeLessThan(0.01);
  });
});
