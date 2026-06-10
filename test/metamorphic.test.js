import { describe, it, expect } from 'vitest';
import {
  defaultModel,
  buildModel,
  symbolProbabilities,
  theoreticalRtp,
  monteCarloFullGame,
} from '../src/slotmath.js';

// Metamorphic tests — relations the math MUST satisfy under a transformed
// input, without us having to know the exact output (the oracle). They catch
// a class of bugs the existing certification pins can't: a calculation that
// secretly depends on something it shouldn't.
//
// (Bet-scaling invariance is deliberately NOT here: the full-game RTP is
// computed in "x bet" units and `model.bet` is never threaded into the sim,
// so RTP is bet-invariant by construction, and payout linearity in bet is
// already proven at the evaluate() level in property.test.js.)

const base = defaultModel();

describe('metamorphic: uniform weight scaling leaves the math invariant', () => {
  // Transform: multiply EVERY symbol weight by the same constant. Relation:
  // nothing changes — only RELATIVE weights may matter, never absolute counts.
  // A bug that reads an absolute weight instead of a probability breaks this.
  const scaled = buildModel({
    weights: Object.fromEntries(Object.entries(base.weights).map(([id, w]) => [id, w * 3])),
  });

  it('symbol probabilities are unchanged', () => {
    const p0 = symbolProbabilities(base.weights).p;
    const p1 = symbolProbabilities(scaled.weights).p;
    for (const id of Object.keys(p0)) expect(p1[id]).toBeCloseTo(p0[id], 12);
  });

  it('theoretical (exact) RTP and hit frequency are unchanged', () => {
    const a = theoreticalRtp(base);
    const b = theoreticalRtp(scaled);
    expect(b.lineRtp).toBeCloseTo(a.lineRtp, 10);
    expect(b.hitFrequencyPerLine).toBeCloseTo(a.hitFrequencyPerLine, 10);
  });

  it('full-game Monte-Carlo RTP is unchanged (same seed)', () => {
    const a = monteCarloFullGame(base, { seed: 2026, spins: 200_000 });
    const b = monteCarloFullGame(scaled, { seed: 2026, spins: 200_000 });
    expect(b.rtp).toBeCloseTo(a.rtp, 4);
  });
});

describe('metamorphic: reordering the paylines leaves total RTP invariant', () => {
  // Transform: reverse the payline list. Relation: total RTP is a SUM over
  // lines (order-independent), and the per-line expectation is identical for
  // any line of the same length. A bug that lets line order leak into the
  // total breaks this.
  const reordered = buildModel({ paylines: [...base.paylines].reverse() });

  it('theoretical RTP is byte-identical', () => {
    const a = theoreticalRtp(base);
    const b = theoreticalRtp(reordered);
    expect(b.lineRtp).toBe(a.lineRtp);
    expect(b.hitFrequencyPerLine).toBe(a.hitFrequencyPerLine);
  });

  it('full-game Monte-Carlo RTP is exactly equal (same seed)', () => {
    const a = monteCarloFullGame(base, { seed: 2026, spins: 200_000 });
    const b = monteCarloFullGame(reordered, { seed: 2026, spins: 200_000 });
    expect(b.rtp).toBe(a.rtp);
  });
});
