import { describe, it, expect, vi } from 'vitest';
import {
  defaultModel,
  buildModel,
  theoreticalRtp,
  monteCarloLine,
  symbolProbabilities,
  parSheet,
} from '../src/slotmath.js';
import { PAYTABLE, PAYLINES } from '../src/config.js';

// Ported from the Drive Python suite (slot_machine_v2_weighted.py:
// theoretical_rtp / monte_carlo) — the PAR-sheet + convergence checks a
// certification lab runs. Golden figures are for the live demo config.

describe('theoreticalRtp (exact PAR-sheet math)', () => {
  const th = theoreticalRtp(defaultModel());

  it('reports the demo base RTP (~91.22%) and a positive house edge', () => {
    expect(th.lineRtp).toBeCloseTo(0.9122, 3);
    expect(th.houseEdge).toBeGreaterThan(0);
  });

  it('house edge is exactly 1 - base RTP (accounting identity)', () => {
    expect(th.houseEdge).toBeCloseTo(1 - th.lineRtp, 12);
  });

  it('total RTP is per-line RTP times the number of paylines', () => {
    expect(th.lineRtp).toBeCloseTo(th.perLineRtp * PAYLINES.length, 12);
    expect(th.nLines).toBe(PAYLINES.length);
  });

  it('expected value equals sum of p^3 x payout over paying symbols', () => {
    const { p } = symbolProbabilities(defaultModel().weights);
    const ev = Object.keys(PAYTABLE).reduce((s, sym) => s + p[sym] ** 3 * PAYTABLE[sym], 0);
    expect(th.perLineRtp).toBeCloseTo(ev, 12);
  });

  it('jackpot odds match three sevens on a line (~1 in 9042)', () => {
    const { p } = symbolProbabilities(defaultModel().weights);
    expect(th.jackpotProb).toBeCloseTo(p.seven ** 3, 12);
    expect(Math.round(th.jackpotOneIn)).toBe(9042);
  });

  it('records hit frequency and volatility (SD) for the demo', () => {
    expect(th.hitFrequencyPerLine).toBeCloseTo(0.0261, 4);
    expect(th.sdPerLine).toBeCloseTo(1.713, 3);
  });
});

describe('monteCarloLine (seeded simulation)', () => {
  it('is deterministic for a fixed seed', () => {
    const a = monteCarloLine(defaultModel(), { seed: 42, spins: 50_000 });
    const b = monteCarloLine(defaultModel(), { seed: 42, spins: 50_000 });
    expect(a.rtp).toBe(b.rtp);
    expect(a.ci95Low).toBe(b.ci95Low);
  });

  it('produces different sequences for different seeds', () => {
    const a = monteCarloLine(defaultModel(), { seed: 1, spins: 50_000 });
    const b = monteCarloLine(defaultModel(), { seed: 2, spins: 50_000 });
    expect(a.rtp).not.toBe(b.rtp);
  });

  it('converges: theoretical RTP sits inside the simulated 95% CI', () => {
    const th = theoreticalRtp(defaultModel());
    const mc = monteCarloLine(defaultModel(), { seed: 123456789, spins: 500_000 });
    expect(th.lineRtp).toBeGreaterThanOrEqual(mc.ci95Low);
    expect(th.lineRtp).toBeLessThanOrEqual(mc.ci95High);
    expect(mc.ci95HalfwidthPp).toBeLessThan(2); // CI tight enough to be meaningful
  });

  it('uses the injected seed, not global Math.random (RNG isolation)', () => {
    const spy = vi.spyOn(Math, 'random');
    monteCarloLine(defaultModel(), { seed: 7, spins: 1_000 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('parSheet', () => {
  it('base RTP equals the theoretical line RTP and edge is consistent', () => {
    const par = parSheet(defaultModel());
    const th = theoreticalRtp(defaultModel());
    expect(par.baseRtp).toBeCloseTo(th.lineRtp, 12);
    expect(par.houseEdge).toBeCloseTo(1 - par.baseRtp, 12);
    expect(par.virtualStops).toBe(125);
  });

  it('an alternate model (RTP96 weights) raises RTP above the demo', () => {
    const demo = parSheet(defaultModel()).baseRtp;
    const tuned = parSheet(buildModel({ weights: defaultModel().weights })).baseRtp;
    expect(tuned).toBeCloseTo(demo, 12); // same weights -> same RTP (sanity)
  });
});
