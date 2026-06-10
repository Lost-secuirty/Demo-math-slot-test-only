# 0013. Metamorphic invariants for the slot math

- **Status:** Accepted
- **Date:** 2026-06-10

## Context

The slot-math harness is already certified by exact enumeration (`theoreticalRtp`)
and a seeded high-volume Monte-Carlo with a CI band (`monteCarloFullGame`,
ADR-0010/0011), plus an RNG statistical battery and property/fuzz tests. Those
pin the math to known values. A research pass on testing strategy (see
`docs/LEARNINGS.md`, 2026-06-10) flagged one class they don't cover:
**metamorphic relations** — properties that must hold when an input is
transformed, even when the exact output is its own oracle. They catch a
calculation that secretly depends on something it shouldn't.

The "double the bet → RTP constant" relation from the source material does not
apply here: full-game RTP is computed in "× bet" units and `model.bet` is never
threaded into the simulation, so RTP is bet-invariant by construction, and
payout linearity in bet is already proven at the `evaluate()` level
(`test/property.test.js`).

## Decision

Add `test/metamorphic.test.js` asserting two relations on the existing model:

1. **Uniform weight scaling** — multiplying every symbol weight by a constant
   leaves probabilities, exact RTP, and Monte-Carlo RTP unchanged. Only relative
   weights may matter; this catches absolute-count leakage.
2. **Payline reordering** — reversing the payline list leaves the theoretical
   result byte-identical and the Monte-Carlo RTP exactly equal (the total is an
   order-independent sum; RNG draws are unaffected).

No production code changes — these test the shipped math model as-is.

## Consequences

- A regression that couples the math to absolute weights or to payline order now
  fails fast, deterministically (no flake: same seed, and the relations are
  exact or near-exact rather than statistical thresholds).
- The suite documents, in executable form, two invariants the PAR sheet assumes.
- Cheap to extend with further relations (symbol relabeling, etc.) if needed.

## Alternatives considered

- **Bet-scaling invariance** — rejected: bet-invariant by construction and
  already covered by `evaluate()` linearity, so the test would be tautological.
- **Symbol-relabeling invariance** — deferred: valid but fiddlier (paytable and
  paylines reference symbol ids); the two relations above give the high-value
  coverage at low cost.
