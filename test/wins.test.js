import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/wins.js';
import { PAYTABLE, PAYLINES, ECONOMY } from '../src/config.js';

// A 3x3 grid (grid[reel][row]) crafted so NO payline matches.
const noWin = () => [
  ['cherry', 'lemon', 'plum'],
  ['bell', 'bar', 'seven'],
  ['watermelon', 'plum', 'lemon'],
];

// set the middle payline (row 1 of each reel) to a symbol
function withMiddleLine(sym) {
  const g = noWin();
  g[0][1] = g[1][1] = g[2][1] = sym;
  return g;
}

// set an arbitrary payline (by index) to a symbol
function withLine(lineIndex, sym) {
  const g = noWin();
  PAYLINES[lineIndex].forEach((row, reel) => {
    g[reel][row] = sym;
  });
  return g;
}

describe('evaluate', () => {
  it('pays a 3-of-a-kind line at paytable × bet', () => {
    const res = evaluate(withMiddleLine('seven'), 5);
    expect(res.total).toBe(PAYTABLE.seven * 5);
    expect(res.lines).toHaveLength(1);
    expect(res.lines[0].symbol).toBe('seven');
    expect(res.lines[0].cells).toHaveLength(3);
  });

  it('scales payout with bet', () => {
    expect(evaluate(withMiddleLine('bell'), 1).total).toBe(PAYTABLE.bell);
    expect(evaluate(withMiddleLine('bell'), 10).total).toBe(PAYTABLE.bell * 10);
  });

  it('returns zero on a no-win board', () => {
    const res = evaluate(noWin(), 5);
    expect(res.total).toBe(0);
    expect(res.lines).toHaveLength(0);
  });

  it('coins do not pay line wins but are counted', () => {
    const g = noWin();
    g[0][1] = g[1][1] = g[2][1] = 'coin'; // a full line of coins
    const res = evaluate(g, 5);
    expect(res.total).toBe(0); // coins never pay a line
    expect(res.coinCount).toBe(3);
    expect(res.coinCells).toHaveLength(3);
  });

  it('counts coins across the whole board', () => {
    const g = noWin();
    g[0][0] = g[2][2] = 'coin';
    const res = evaluate(g, 5);
    expect(res.coinCount).toBe(2);
  });

  it('every paytable symbol is a valid winning symbol', () => {
    for (const sym of Object.keys(PAYTABLE)) {
      const res = evaluate(withMiddleLine(sym), 2);
      expect(res.total).toBe(PAYTABLE[sym] * 2);
    }
  });
});

// ---- Extended exact-payout math (ported from the Drive Python suite
// TestExactPayoutMath + numeric/property kit ideas) ----
describe('evaluate — exact payout math (ports)', () => {
  it('every paytable symbol pays on EVERY payline (not just the middle)', () => {
    for (let i = 0; i < PAYLINES.length; i++) {
      for (const sym of Object.keys(PAYTABLE)) {
        const res = evaluate(withLine(i, sym), 3);
        const line = res.lines.find((l) => l.lineIndex === i);
        expect(line, `payline ${i} symbol ${sym}`).toBeTruthy();
        expect(line.symbol).toBe(sym);
        expect(line.payout).toBe(PAYTABLE[sym] * 3);
      }
    }
  });

  it('sums multiple simultaneous line wins', () => {
    const g = noWin();
    // top line (index 1) and bottom line (index 2) both all-seven
    PAYLINES[1].forEach((row, reel) => (g[reel][row] = 'seven'));
    PAYLINES[2].forEach((row, reel) => (g[reel][row] = 'seven'));
    const res = evaluate(g, 5);
    expect(res.lines.length).toBeGreaterThanOrEqual(2);
    expect(res.total).toBe(res.lines.reduce((s, l) => s + l.payout, 0));
    expect(res.total).toBeGreaterThanOrEqual(2 * PAYTABLE.seven * 5);
  });

  it('evaluates both diagonal paylines', () => {
    const down = evaluate(withLine(3, 'bar'), 2); // [0,1,2]
    const up = evaluate(withLine(4, 'bar'), 2); // [2,1,0]
    expect(down.lines.some((l) => l.lineIndex === 3 && l.symbol === 'bar')).toBe(true);
    expect(up.lines.some((l) => l.lineIndex === 4 && l.symbol === 'bar')).toBe(true);
  });

  it('payout is integer-exact across every bet level', () => {
    for (const bet of ECONOMY.betLevels) {
      const res = evaluate(withMiddleLine('watermelon'), bet);
      expect(res.total).toBe(PAYTABLE.watermelon * bet);
      expect(Number.isInteger(res.total)).toBe(true);
    }
  });

  it('does not pay a two-of-a-kind (this game pays 3-of-a-kind only)', () => {
    const g = noWin();
    g[0][1] = g[1][1] = 'seven'; // only two on the middle line
    g[2][1] = 'bar';
    expect(evaluate(g, 5).total).toBe(0);
  });
});
