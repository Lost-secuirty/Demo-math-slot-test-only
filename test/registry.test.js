import { describe, it, expect } from 'vitest';
import {
  registerFeature,
  getFeature,
  listFeatures,
  findTriggered,
} from '../src/features/registry.js';
import { checkTrigger, holdAndWinFeature } from '../src/features/holdAndWin.js';
import { defaultModel } from '../src/slotmath.js';
import { mulberry32 } from './helpers/seededRng.js';

// =====================================================================
// The pluggable-feature seam (ADR-0016): the registry decision must be
// EXACTLY the rule main.js used to inline (coinCount >= triggerCount),
// and the contract must reject malformed features loudly.
// =====================================================================

const model = defaultModel();
const cells = (n) => Array.from({ length: n }, (_, i) => ({ reel: 0, row: i }));

describe('checkTrigger (the one trigger rule)', () => {
  it('fires at exactly triggerCount cells, not below', () => {
    const t = model.bonus.triggerCount;
    expect(checkTrigger(cells(t - 1), model)).toBeNull();
    expect(checkTrigger(cells(t), model)).toEqual({ cells: cells(t) });
    expect(checkTrigger(cells(t + 1), model)).not.toBeNull();
  });

  it('passes the SAME cells array through as the bonus seed', () => {
    const c = cells(model.bonus.triggerCount);
    expect(checkTrigger(c, model).cells).toBe(c);
  });

  it('consumes no rng (trigger decisions are deterministic from the grid)', () => {
    // checkTrigger has no rng parameter; this pins the contract shape
    expect(checkTrigger.length).toBe(2);
  });
});

describe('registry', () => {
  it('ships with holdAndWin installed', () => {
    expect(getFeature('holdAndWin')).toBe(holdAndWinFeature);
    expect(listFeatures().map((f) => f.id)).toContain('holdAndWin');
  });

  it('findTriggered mirrors the old inline rule across seeded coin counts', () => {
    const rng = mulberry32(2026);
    for (let n = 0; n < 500; n++) {
      const count = Math.floor(rng() * 10); // 0..9 coins
      const c = cells(count);
      const hit = findTriggered(c, model);
      const oldRule = count >= model.bonus.triggerCount; // pre-registry main.js
      expect(hit !== null).toBe(oldRule);
      if (hit) {
        expect(hit.feature.id).toBe('holdAndWin');
        expect(hit.payload.cells).toBe(c);
      }
    }
  });

  it('rejects malformed and duplicate features loudly', () => {
    expect(() => registerFeature(null)).toThrow(/id/);
    expect(() => registerFeature({ id: '' })).toThrow(/id/);
    expect(() => registerFeature({ id: 'x' })).toThrow(/checkTrigger/);
    expect(() =>
      registerFeature({ id: 'holdAndWin', checkTrigger: () => null, play: () => ({}) }),
    ).toThrow(/already registered/);
    // failed registrations must not pollute the registry
    expect(listFeatures()).toHaveLength(1);
  });
});
