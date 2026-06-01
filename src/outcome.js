// =====================================================================
// outcome.js — generates the predetermined spin result (3x3 grid).
// Weighted by the reel strip, with demo nudges so the showpiece stays
// lively: occasional forced bonuses and frequent line wins.
// =====================================================================

import { SYMBOLS, SYMBOL_WEIGHTS, PAYLINES, BONUS, DEMO } from './config.js';
import { randInt } from './utils.js';

const SPINNABLE = SYMBOLS.filter((s) => s.id !== 'coin').map((s) => s.id);
const ALL = SYMBOLS.map((s) => s.id);

function weighted(pool) {
  let total = 0;
  for (const id of pool) total += SYMBOL_WEIGHTS[id] || 1;
  let r = Math.random() * total;
  for (const id of pool) {
    r -= SYMBOL_WEIGHTS[id] || 1;
    if (r <= 0) return id;
  }
  return pool[pool.length - 1];
}

// returns grid[reel][row]
export function generateOutcome() {
  // grid as [reel][row]
  const grid = [[], [], []];

  const forceBonus = Math.random() < DEMO.bonusChance;

  if (forceBonus) {
    // scatter 6..8 coins across the 9 cells, filler elsewhere
    const cells = [];
    for (let reel = 0; reel < 3; reel++) for (let row = 0; row < 3; row++) cells.push([reel, row]);
    // shuffle
    for (let i = cells.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const coinCount = randInt(BONUS.triggerCount, 8);
    for (let reel = 0; reel < 3; reel++) for (let row = 0; row < 3; row++) grid[reel][row] = weighted(SPINNABLE);
    for (let i = 0; i < coinCount; i++) {
      const [reel, row] = cells[i];
      grid[reel][row] = 'coin';
    }
    return grid;
  }

  // base fill (allow natural coins, but keep below trigger by using SPINNABLE
  // mostly and sprinkling the odd coin)
  for (let reel = 0; reel < 3; reel++) {
    for (let row = 0; row < 3; row++) {
      // small chance of a stray coin for flavour
      grid[reel][row] = Math.random() < 0.04 ? 'coin' : weighted(SPINNABLE);
    }
  }

  // nudge a line win for liveliness
  if (Math.random() < DEMO.winChance) {
    const line = PAYLINES[randInt(0, PAYLINES.length - 1)];
    // favour lower tiers (more common, smaller wins) most of the time
    const sym = Math.random() < 0.8
      ? weighted(['cherry', 'lemon', 'plum', 'watermelon', 'bell'])
      : weighted(['bar', 'seven']);
    line.forEach((row, reel) => { grid[reel][row] = sym; });
  }

  // guard: never accidentally trigger the bonus on a normal spin
  let coins = 0;
  const coinPos = [];
  for (let reel = 0; reel < 3; reel++)
    for (let row = 0; row < 3; row++)
      if (grid[reel][row] === 'coin') { coins++; coinPos.push([reel, row]); }
  while (coins >= BONUS.triggerCount) {
    const [reel, row] = coinPos.pop();
    grid[reel][row] = weighted(SPINNABLE);
    coins--;
  }

  return grid;
}
