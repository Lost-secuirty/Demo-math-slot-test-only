// =====================================================================
// reelWindow.js — pure strip-window index math for the reel engine.
//
// This is the payout-load-bearing seam of the renderer: the spin
// orchestration writes the predetermined outcome INTO a reel's strip at
// the stop target (writeOutcome), and the settled grid that wins are
// evaluated from is read BACK out of the strip (visibleFromStrip).
// Those two must be exact inverses or the game would pay on a grid the
// player didn't see. Extracted from reels.js (no Pixi) so the
// round-trip is unit-testable in node for any number of rows
// (test/reelWindow.test.js); reels.js delegates to these.
//
// Convention: at an integer stop position `target`, visible row k
// (0 = top … rows-1 = bottom) lives at strip[mod(target + rows - k)].
// =====================================================================

export const mod = (n, m) => ((n % m) + m) % m;

// Write the outcome column (out[0]=top … out[rows-1]=bottom, length must
// be `rows`) into the strip slice visible at integer position `target`.
// Mutates `strip`; touches exactly `rows` slots.
export function writeOutcome(strip, target, rows, out) {
  for (let k = 0; k < rows; k++) {
    strip[mod(target + rows - k, strip.length)] = out[k];
  }
}

// Read the visible column ([top … bottom], length `rows`) at integer
// position `base`. Inverse of writeOutcome at the same position.
export function visibleFromStrip(strip, base, rows) {
  return Array.from({ length: rows }, (_, k) => strip[mod(base + rows - k, strip.length)]);
}
