import { describe, it, expect } from 'vitest';
import { buildModel, defaultModel, theoreticalRtp, monteCarloLine } from '../src/slotmath.js';
import { RTP96_WEIGHTS, RTP96_TARGET, SYMBOL_WEIGHTS, PAYTABLE } from '../src/config.js';

// Certifies the RTP96 preset to a real ~96% the way a lab does: the
// theoretical (exact) figure AND the Monte-Carlo (actual) figure must both
// land in the certified band, and the theoretical value must sit inside the
// simulated 95% confidence interval (convergence). Default game untouched.
describe('RTP96 preset certification', () => {
  const model = buildModel({ weights: RTP96_WEIGHTS });
  const th = theoreticalRtp(model);

  it('retunes weights only — the paytable is unchanged', () => {
    expect(model.paytable).toEqual(PAYTABLE);
    expect(RTP96_WEIGHTS).not.toEqual(SYMBOL_WEIGHTS); // it really is a retune
    expect(Object.keys(RTP96_WEIGHTS).sort()).toEqual(Object.keys(SYMBOL_WEIGHTS).sort());
  });

  it('theoretical RTP lands in the certified band [95.5%, 96.5%]', () => {
    expect(th.lineRtp).toBeGreaterThanOrEqual(0.955);
    expect(th.lineRtp).toBeLessThanOrEqual(0.965);
    expect(th.lineRtp).toBeCloseTo(0.9603, 3); // golden: 96.0328%
  });

  it('hits the 96% target far better than the demo config', () => {
    const demo = theoreticalRtp(defaultModel()).lineRtp;
    expect(Math.abs(th.lineRtp - RTP96_TARGET)).toBeLessThan(Math.abs(demo - RTP96_TARGET));
  });

  it('Monte-Carlo (actual) RTP also lands in band and brackets the theory', () => {
    const mc = monteCarloLine(model, { seed: 2026, spins: 2_000_000 });
    expect(mc.rtp).toBeGreaterThanOrEqual(0.955);
    expect(mc.rtp).toBeLessThanOrEqual(0.965);
    // convergence: the exact figure is inside the simulated 95% CI
    expect(th.lineRtp).toBeGreaterThanOrEqual(mc.ci95Low);
    expect(th.lineRtp).toBeLessThanOrEqual(mc.ci95High);
  });
});
