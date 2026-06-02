import { describe, it, expect } from 'vitest';
import {
  defaultModel,
  theoreticalRtp,
  monteCarloFullGame,
  symbolProbabilities,
} from '../src/slotmath.js';
import { RTP_TARGET } from '../src/config.js';

// Certifies the SHIPPED game (the default config) to a real ~96% TOTAL RTP —
// base lines + the Hold & Win feature — the way a lab certifies a hold-and-win
// slot: the base game is exact (payline enumeration); the feature is
// intractable to enumerate, so it's measured by a high-volume seeded
// Monte-Carlo. There are no demo nudges — the played game draws from these
// same weights and pays strictly by the paytable — so the certified RTP IS the
// experienced RTP. Headline figures + method: docs/PAR-SHEET.md, docs/adr/0011.
describe('certified ~96% TOTAL RTP (shipped/default game)', () => {
  const model = defaultModel();
  const th = theoreticalRtp(model);

  it('base (line) RTP is exact and lean — the feature carries the rest', () => {
    expect(th.lineRtp).toBeCloseTo(0.45689, 4); // exact enumeration (golden)
    expect(th.lineRtp).toBeLessThan(RTP_TARGET); // base alone is well below 96%
  });

  it('the Hold & Win feature triggers naturally ~1 in 100 spins (exact binomial)', () => {
    const p = symbolProbabilities(model.weights).p.coin;
    const C = (n, k) => {
      let r = 1;
      for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
      return r;
    };
    let trigger = 0; // P(>=6 coins among the 9 cells)
    for (let k = 6; k <= 9; k++) trigger += C(9, k) * p ** k * (1 - p) ** (9 - k);
    expect(trigger).toBeCloseTo(0.01006, 4); // ~1 in 99 spins
  });

  it('TOTAL RTP (lines + feature) certifies to ~96% — seeded Monte-Carlo', () => {
    const fg = monteCarloFullGame(model, { seed: 2026, spins: 12_000_000 });
    // Deterministic regression pin (mulberry32 is integer-stable across
    // platforms): any change to weights/paytable/bonus shifts this and trips.
    expect(fg.rtp).toBeCloseTo(0.96082, 4);
    // Certification band around the 96% target.
    expect(fg.rtp).toBeGreaterThanOrEqual(0.955);
    expect(fg.rtp).toBeLessThanOrEqual(0.965);
    // The feature is the RTP engine, not the base lines.
    expect(fg.bonusRtp).toBeGreaterThan(fg.lineRtp);
    expect(fg.bonusRtp).toBeGreaterThan(0.45);
    // The simulated line component lands on the exact theoretical base RTP.
    expect(fg.lineRtp).toBeCloseTo(th.lineRtp, 2);
  }, 60_000);

  it('is deterministic for a fixed seed (reproducible certification)', () => {
    const a = monteCarloFullGame(model, { seed: 7, spins: 200_000 });
    const b = monteCarloFullGame(model, { seed: 7, spins: 200_000 });
    expect(a.rtp).toBe(b.rtp);
  });
});
