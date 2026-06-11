import { describe, it, expect } from 'vitest';
import { mod, writeOutcome, visibleFromStrip } from '../src/reelWindow.js';
import { evaluate } from '../src/wins.js';
import { mulberry32 } from './helpers/seededRng.js';
import { SYMBOLS, PAYLINES, PAYTABLE, GRID } from '../src/config.js';

// =====================================================================
// The renderer's payout-load-bearing seam: the spin path writes the
// predetermined outcome INTO the reel strip (writeOutcome) and the grid
// that wins are evaluated from is read BACK out (visibleFromStrip via
// getVisible/getGrid). If those aren't exact inverses, the game pays on
// a grid the player didn't see. The Playwright smoke can't run in this
// container and isn't in CI, so this pins the round-trip in pure node.
// =====================================================================

const IDS = SYMBOLS.map((s) => s.id);
const STRIP_LEN = 64; // matches reels.js

function randomStrip(rng, len = STRIP_LEN) {
  return Array.from({ length: len }, () => IDS[Math.floor(rng() * IDS.length)]);
}

describe('mod', () => {
  it('wraps negatives into [0, m)', () => {
    expect(mod(-1, 64)).toBe(63);
    expect(mod(-64, 64)).toBe(0);
    expect(mod(65, 64)).toBe(1);
    expect(mod(0, 64)).toBe(0);
  });
});

describe('writeOutcome / visibleFromStrip are exact inverses', () => {
  it('round-trips any outcome at any target for 1..6 rows (seeded sweep)', () => {
    const rng = mulberry32(2026);
    for (let rows = 1; rows <= 6; rows++) {
      for (let n = 0; n < 200; n++) {
        const strip = randomStrip(rng);
        // include wrap-around targets (near 0 and near strip end) and deep
        // overshoots — the live target is Math.ceil(pos + travel) and grows
        const target = Math.floor(rng() * STRIP_LEN * 3);
        const out = Array.from({ length: rows }, () => IDS[Math.floor(rng() * IDS.length)]);
        writeOutcome(strip, target, rows, out);
        expect(visibleFromStrip(strip, target, rows)).toEqual(out);
      }
    }
  });

  it('touches exactly `rows` strip slots and nothing else', () => {
    const rng = mulberry32(7);
    for (let n = 0; n < 100; n++) {
      const strip = randomStrip(rng);
      const before = [...strip];
      const rows = 1 + Math.floor(rng() * 6);
      const target = Math.floor(rng() * STRIP_LEN * 2);
      const out = Array.from({ length: rows }, () => 'seven');
      writeOutcome(strip, target, rows, out);
      const written = new Set(
        Array.from({ length: rows }, (_, k) => mod(target + rows - k, STRIP_LEN)),
      );
      for (let i = 0; i < STRIP_LEN; i++) {
        if (written.has(i)) expect(strip[i]).toBe('seven');
        else expect(strip[i]).toBe(before[i]);
      }
    }
  });

  it('matches the pre-refactor unrolled indices at ROWS=3 (top/mid/bottom)', () => {
    const strip = Array.from({ length: STRIP_LEN }, () => 'lemon');
    const target = 41;
    writeOutcome(strip, target, 3, ['cherry', 'bell', 'bar']);
    // the old reels.js wrote: [target+ROWS]=top, [target+ROWS-1]=mid, [target+ROWS-2]=bottom
    expect(strip[mod(target + 3, STRIP_LEN)]).toBe('cherry');
    expect(strip[mod(target + 3 - 1, STRIP_LEN)]).toBe('bell');
    expect(strip[mod(target + 3 - 2, STRIP_LEN)]).toBe('bar');
  });

  it('wraps across the strip boundary without clobbering the outcome', () => {
    const strip = Array.from({ length: STRIP_LEN }, () => 'plum');
    const target = STRIP_LEN - 2; // indices wrap: 64→0, 65→1
    const out = ['seven', 'bar', 'bell'];
    writeOutcome(strip, target, 3, out);
    expect(visibleFromStrip(strip, target, 3)).toEqual(out);
  });
});

describe('outcome → strip → readback → evaluate (the live payout path, headless)', () => {
  it('a planted line win survives the strip round-trip and pays exactly', () => {
    const rng = mulberry32(99);
    // crafted outcome: middle line of sevens (PAYLINES[0]), no other wins
    const outcome = [
      ['cherry', 'seven', 'lemon'],
      ['plum', 'seven', 'bell'],
      ['lemon', 'seven', 'watermelon'],
    ];
    // simulate each reel: random strip, random stop target, write + read back
    const grid = outcome.map((col, reel) => {
      const strip = randomStrip(rng);
      const target = 10 + reel * 7 + Math.floor(rng() * STRIP_LEN);
      writeOutcome(strip, target, GRID.rows, col);
      return visibleFromStrip(strip, target, GRID.rows);
    });
    expect(grid).toEqual(outcome); // what the player sees IS the outcome
    const res = evaluate(grid, 5);
    expect(res.total).toBe(PAYTABLE.seven * 5);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].cells).toEqual(PAYLINES[0].map((row, reel) => ({ reel, row })));
  });

  it('coin cells survive the round-trip at the exact positions written', () => {
    const rng = mulberry32(5);
    const outcome = [
      ['coin', 'lemon', 'coin'],
      ['bell', 'coin', 'plum'],
      ['coin', 'bar', 'coin'],
    ];
    const grid = outcome.map((col) => {
      const strip = randomStrip(rng);
      const target = Math.floor(rng() * STRIP_LEN);
      writeOutcome(strip, target, GRID.rows, col);
      return visibleFromStrip(strip, target, GRID.rows);
    });
    const res = evaluate(grid, 1);
    expect(res.coinCount).toBe(5);
    expect(res.coinCells).toEqual([
      { reel: 0, row: 0 },
      { reel: 0, row: 2 },
      { reel: 1, row: 1 },
      { reel: 2, row: 0 },
      { reel: 2, row: 2 },
    ]);
  });
});
