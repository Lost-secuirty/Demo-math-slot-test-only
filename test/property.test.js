import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/wins.js';
import { generateOutcome } from '../src/outcome.js';
import { mulberry32, withSeededRandom } from './helpers/seededRng.js';
import { SYMBOLS, ECONOMY } from '../src/config.js';

// Property-based + fuzz tests (ported from the testing-kits property/fuzz
// harnesses). Seeded generators keep them deterministic.
const IDS = SYMBOLS.map((s) => s.id);

function randomGrid(rng) {
  const g = [];
  for (let reel = 0; reel < 3; reel++) {
    const col = [];
    for (let row = 0; row < 3; row++) col.push(IDS[Math.floor(rng() * IDS.length)]);
    g.push(col);
  }
  return g;
}

describe('properties of evaluate()', () => {
  it('payout is always a finite, non-negative number (1000 random grids)', () => {
    const rng = mulberry32(2026);
    for (let i = 0; i < 1000; i++) {
      const res = evaluate(randomGrid(rng), 5);
      expect(Number.isFinite(res.total)).toBe(true);
      expect(res.total).toBeGreaterThanOrEqual(0);
    }
  });

  it('payout is exactly linear in the bet (evaluate(g,k) = k·evaluate(g,1))', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 500; i++) {
      const g = randomGrid(rng);
      const base = evaluate(g, 1).total;
      for (const bet of ECONOMY.betLevels) {
        expect(evaluate(g, bet).total).toBe(base * bet);
      }
    }
  });
});

describe('properties of generateOutcome()', () => {
  it('always returns a 3×3 grid of valid symbol ids (5000 seeded spins)', () => {
    const idSet = new Set(IDS);
    withSeededRandom(12345, () => {
      for (let n = 0; n < 5000; n++) {
        const g = generateOutcome();
        expect(g).toHaveLength(3);
        for (const reel of g) {
          expect(reel).toHaveLength(3);
          for (const id of reel) expect(idSet.has(id)).toBe(true);
        }
      }
    });
  });
});

describe('fuzz: evaluate() never throws on adversarial input', () => {
  it('tolerates unknown symbols, coins, and undefined cells', () => {
    const rng = mulberry32(99);
    const garbage = [...IDS, 'coin', 'UNKNOWN', '', undefined, null, 123];
    for (let i = 0; i < 2000; i++) {
      const g = [];
      for (let reel = 0; reel < 3; reel++) {
        const col = [];
        for (let row = 0; row < 3; row++) col.push(garbage[Math.floor(rng() * garbage.length)]);
        g.push(col);
      }
      expect(() => {
        const res = evaluate(g, 5);
        expect(res.total).toBeGreaterThanOrEqual(0);
      }).not.toThrow();
    }
  });
});
