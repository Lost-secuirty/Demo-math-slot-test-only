import { describe, it, expect } from 'vitest';
import { mulberry32, withSeededRandom } from './helpers/seededRng.js';
import {
  chiSquareUniform,
  ksUniform,
  runsZ,
  serialCorrelation,
  chiSquareCategorical,
} from './helpers/stats.js';
import { weightedPick } from '../src/utils.js';
import { SYMBOLS, SYMBOL_WEIGHTS } from '../src/config.js';

// The statistical battery gambling labs use to certify an RNG (GLI-19 /
// eCOGRA reference NIST SP 800-22 & Diehard; chi-square and KS are the
// core reference distributions). Seeds are fixed, so every statistic is
// deterministic — these never flake.
const SEED = 2026;

describe('seeded RNG (mulberry32) — basic guarantees', () => {
  it('same seed reproduces the exact sequence; different seeds diverge', () => {
    const a = mulberry32(SEED);
    const b = mulberry32(SEED);
    const c = mulberry32(SEED + 1);
    const seqA = [a(), a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b(), b()];
    const seqC = [c(), c(), c(), c(), c()];
    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
  });

  it('emits values in [0, 1)', () => {
    const r = mulberry32(SEED);
    for (let i = 0; i < 10_000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('RNG randomness battery (NIST/Diehard-style)', () => {
  it('chi-square frequency/uniformity test passes (k=10, dof=9, crit 16.919)', () => {
    const chi2 = chiSquareUniform(mulberry32(SEED), 100_000, 10);
    expect(chi2).toBeLessThan(16.919);
  });

  it('Kolmogorov-Smirnov uniformity test passes', () => {
    const n = 10_000;
    const d = ksUniform(mulberry32(SEED), n);
    expect(d).toBeLessThan(1.36 / Math.sqrt(n)); // 5% critical value
  });

  it('runs test (Wald-Wolfowitz) shows no clustering (|Z| < 1.96)', () => {
    const z = runsZ(mulberry32(SEED), 100_000);
    expect(Math.abs(z)).toBeLessThan(1.96);
  });

  it('lag-1 serial correlation is ~0 (|r| < 3/sqrt(n))', () => {
    const n = 100_000;
    const r = serialCorrelation(mulberry32(SEED), n);
    expect(Math.abs(r)).toBeLessThan(3 / Math.sqrt(n));
  });
});

describe('RNG maps fairly onto the paytable (weighted symbols)', () => {
  it('symbol frequencies match reel weights (chi-square, dof=7, crit 14.067)', () => {
    const ids = SYMBOLS.map((s) => s.id);
    const total = ids.reduce((a, id) => a + SYMBOL_WEIGHTS[id], 0);
    const prob = {};
    for (const id of ids) prob[id] = SYMBOL_WEIGHTS[id] / total;
    const n = 200_000;

    const observed = withSeededRandom(SEED, () => {
      const counts = Object.fromEntries(ids.map((id) => [id, 0]));
      const weights = ids.map((id) => SYMBOL_WEIGHTS[id]);
      for (let i = 0; i < n; i++) counts[weightedPick(ids, weights)]++;
      return counts;
    });

    const chi2 = chiSquareCategorical(observed, prob, n);
    expect(chi2).toBeLessThan(14.067);
  });
});
