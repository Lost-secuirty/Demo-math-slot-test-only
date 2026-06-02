// =====================================================================
// test helper: seeded, deterministic randomness.
// Lets statistical/Monte-Carlo tests be reproducible (never flaky) and
// lets us drive code that calls the global Math.random (outcome.js,
// utils.weightedPick) from a fixed seed. The PRNG is the same mulberry32
// the math harness uses, so tests and src share one RNG implementation.
// =====================================================================

import { vi } from 'vitest';
import { mulberry32 } from '../../src/slotmath.js';

export { mulberry32 };

// Run `fn(rng)` with Math.random replaced by a seeded sequence, then
// restore the real Math.random. Returns whatever `fn` returns.
export function withSeededRandom(seed, fn) {
  const rng = mulberry32(seed);
  const spy = vi.spyOn(Math, 'random').mockImplementation(rng);
  try {
    return fn(rng);
  } finally {
    spy.mockRestore();
  }
}

// Collect `count` samples from a fresh seeded stream.
export function samples(seed, count) {
  const rng = mulberry32(seed);
  const out = new Array(count);
  for (let i = 0; i < count; i++) out[i] = rng();
  return out;
}
