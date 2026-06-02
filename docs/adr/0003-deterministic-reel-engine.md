# 0003. Deterministic reel engine (strip-overwrite + easeOutBack)

- **Status:** Accepted
- **Date:** 2026-06-01

## Context

Reels must (a) look like real spinning reels with motion blur and a satisfying
stop, and (b) land a **predetermined** outcome so wins/bonuses can be computed
and forced (debug panel, tests). Naive "spin then read whatever
random lands" can't guarantee a target grid.

## Decision

Each reel owns a fixed logical `strip` and a floating `pos`. The outcome is
decided first; then the strip slice that will be visible at the integer target
position is **overwritten** with the target symbols, and `pos` is eased to that
target with `easeOutBack` (overshoot → settle = the bounce). Motion blur scales
with reel speed via a `BlurFilter`. See `src/reels.js`.

## Consequences

- Outcomes are fully controllable and testable; the visual is decoupled from the
  math (RNG/paytable live in `outcome.js`/`wins.js`).
- Forcing a result (debug "Force EPIC/BONUS") is trivial; normal play stays pure
  RNG (no nudges — see ADR-0011).
- Cost: the strip bookkeeping is subtle — covered by unit tests + verify.mjs.

## Alternatives considered

- **Pixi "slots" example modulo-retexture** — random only; can't target a grid.
- **Pre-rendered spin video** — no control, large, not interactive.
