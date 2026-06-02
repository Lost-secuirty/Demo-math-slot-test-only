# 0011. Retune the shipped game to a genuine 96% TOTAL RTP (feature-driven), remove demo nudges

- **Status:** Accepted
- **Date:** 2026-06-02
- **Supersedes:** the `RTP96_WEIGHTS` preset from ADR-0010 (the default config now
  _is_ the certified 96% game, so the opt-in preset is removed).

## Context

ADR-0010 added the math harness and an opt-in `RTP96_WEIGHTS` preset that
certified the **base/line** game to ~96%. But it also surfaced that the shipped
demo (a) leaned on `DEMO` nudges (forced wins ~42% of spins, forced bonuses ~5%)
for liveliness, and (b) **never triggered the Hold & Win feature naturally**
(coin ~5.6%/cell → P(6+ of 9) ≈ 0). So the "game" the player experienced was not
the math we could certify, and the headline feature was effectively dead in fair
play.

The goal of this change: make the game **as legally close to a real RNG slot as
possible** — a single certified **TOTAL** RTP of ~96% (base + feature), with the
played outcome equal to the certified math. Research on regulated hold-and-win
titles (Lightning/Dragon Link family, GLI-style PAR sheets) confirmed the shape:
the **feature is the RTP engine**, the base game is lean, outcomes are pure RNG
paid strictly by the paytable, and RTP is certified as one total (feature folded
in by Monte-Carlo because it's intractable to enumerate).

## Decision

1. **Pure RNG, no nudges.** `src/outcome.js` now draws all 9 cells independently
   from the reel-strip weights (coin included) and pays by the paytable. The
   `DEMO` forced-win / forced-bonus knobs are removed. Experienced RTP =
   certified RTP. (Explicit `?debug=1` force buttons remain — they are dev tools,
   not silent nudges.)

2. **Retune to a feature-driven 96% total.** Coins are now ~25%/cell (a
   ~3,148-stop virtual strip), so 6+ coins trigger the feature ~1 in 99 spins.
   The base game is lean (**45.69%**, exact); the feature carries **~50.3%**;
   **total ≈ 96.0%** (5 seeds × 20M: mean 96.008%, range 95.83–96.24%;
   deterministic 12M/seed-2026 pin = 96.08%). The feature economy was made
   modest (cash EV ~4×, leaner jackpot-coin odds, GRAND 1000×→**500×**, a rarer
   `respinLandChance` 0.05) so a frequent trigger still fits inside 96% with
   sane variance and a clear jackpot ladder.

3. **One source of truth for the feature odds.** `BONUS.jackpotOdds` and
   `BONUS.respinLandChance` live in `config.js` and are read by **both** the live
   feature (`holdAndWin.js`) and the math model (`slotmath.js`). The previous
   duplicated `DEFAULT_BONUS_ODDS` constant can no longer drift from the game.

4. **Certify the total, not just the base.** `test/rtp-target.test.js` now pins
   the exact base RTP, the exact binomial trigger rate, and the deterministic
   12M-spin TOTAL inside a [95.5%, 96.5%] band. `monteCarloFullGame()` gained a
   `maxWin` figure for the PAR sheet.

## Consequences

- The shipped game is a genuine, fair, RNG hold-and-win slot certified to ~96%
  total; the PAR sheet (`docs/PAR-SHEET.md`) documents one honest number.
- **Feel change:** the base game is intentionally lean — most spins lose, line
  hit frequency ~6.3% — and the show comes from coins landing constantly and the
  feature firing ~1 in 100 spins (plenty for the idle attract loop), **not** from
  forced wins. This is the trade for legal realism (the alternative — keep the
  flashy nudges — was explicitly rejected for this build).
- A 3×3 hold-and-win is inherently powerful (the board fills easily), so the
  feature economy must stay modest to certify at 96% with a frequent trigger;
  this is documented so future retunes don't reintroduce an explosive GRAND.
- Tests/docs that referenced the old 91.2% demo / `RTP96` preset were updated;
  `RTP96_WEIGHTS`/`RTP96_TARGET` were replaced by a single `RTP_TARGET = 0.96`.

## Alternatives considered

- **Base→96%, keep the show-piece nudges** (smallest change): rejected — the
  played RTP would not match the certified math, the opposite of "legally real".
- **Real per-reel strips (positional correlation):** deferred — the i.i.d.-cell
  model already makes played == certified; multi-strip fidelity is a follow-up
  noted in the PAR sheet.
- **Scale coin payouts by a non-round factor to hit 96.000% exactly:** rejected —
  ugly player-facing values and a GRAND that collides with MAJOR. Instead the
  coin _weight_ (a virtual-stop count, the real reel-strip lever) is the fine
  calibration knob, leaving jackpots round.
