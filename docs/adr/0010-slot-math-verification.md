# 0010. Slot-math verification harness + certified RTP preset

- **Status:** Accepted
- **Date:** 2026-06-02

## Context

The repo could test that a win _evaluates_ correctly, but had no way to verify
the game's **math model** — RTP, hit frequency, volatility, jackpot odds — the
way a regulated-market lab (GLI-19, eCOGRA, iTech) certifies a slot. The
canonical method is well established (see `docs/PAR-SHEET.md`): compute the
**theoretical** RTP exactly, then confirm an **actual** RTP from a high-volume
simulation lands inside a 95% confidence interval around it, plus statistical
RNG-fairness tests (NIST SP 800-22 / Diehard reference chi-square & KS).

A second need: prove the test _flow_ has teeth — that the math tests fail when
the math is wrong, not just when it throws.

## Decision

Add a pure, Pixi-free **`src/slotmath.js`** that derives the math from the live
`config.js`: `theoreticalRtp()` (exact enumeration), seeded `monteCarloLine()` /
`monteCarloFullGame()` (with a 95% CI), `simulateBonus()` / `decideCoin()`, and
`parSheet()`. It uses a seeded **mulberry32** RNG so every simulation is
deterministic and reproducible (no flaky CI). Tests
(`test/slotmath.test.js`, `test/rng-stats.test.js`, `test/rtp-target.test.js`,
`test/bonus.test.js`) lock the figures and the RNG statistical battery.

Add **`RTP96_WEIGHTS`** to `config.js` — a reel-weight retune (paytable
unchanged) that certifies the base game to a real ~96% RTP (theoretical
96.0328%, Monte-Carlo 95.99% / 2M spins). The **default demo game is
unchanged**; RTP96 is opt-in via `buildModel({ weights: RTP96_WEIGHTS })`.

Add **`scripts/mutation-probe.mjs`** (`npm run mutation`) — injects faults into
`wins.js` / `slotmath.js`, runs the suite against each mutant in an isolated
temp copy, and reports a mutation score. Standalone (not in `npm test`) so CI
stays fast.

## Consequences

- The game's RTP/volatility/fairness is now machine-verified and documented in a
  PAR sheet; the same pipeline can certify a 96% regulated-market build.
- Mutation probe shows the math suite kills **100% (10/10)** of injected bugs —
  the tests are not vacuous.
- Surfaced a real finding: the demo's Hold & Win bonus never triggers _naturally_
  (it relies on `DEMO.bonusChance`); base RTP is therefore the certified figure.
- Cost: `slotmath.js` duplicates the bonus odds that live in `holdAndWin.js`
  (`DEFAULT_BONUS_ODDS`) — kept in sync deliberately; a future refactor could
  extract one source.

## Alternatives considered

- **decimal.js / big.js** — rejected; payouts are integer multiplier × integer
  bet, so integer-exactness tests suffice (no fractional cents).
- **fast-check / Stryker** — rejected; a tiny in-repo seeded generator + the
  mutation probe cover property/fuzz/mutation needs without new dependencies.
- **Full NIST SP 800-22 / TestU01 suites** — overkill for a JS demo; the core
  chi-square / KS / runs / serial-correlation tests are reimplemented and the
  pro suites are referenced in the PAR sheet instead.
