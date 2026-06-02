# SPEC — Coins: Hold & Win

A **living spec**: what the product is and how it behaves. Update it as behavior
changes. (Why-decisions live in `docs/adr/`; gotchas in `docs/LEARNINGS.md`.)

> Pure entertainment demo. **Play money only — no real wagering, payments, or
> account systems.**

## 1. Overview

A Playson-style 3×3 slot ("…Coins: Hold and Win" look): glossy classic-fruit
symbols, deep-blue + gold theme, gold **coin** bonus symbols, a Hold & Win
respin bonus, big-win celebrations, auto-spin/attract, and procedural sound.
Built for **max visuals at a steady 60fps**.

## 2. Reels & symbols

- 3 reels × 3 visible rows. Symbols: `cherry, lemon, plum, watermelon, bell,
bar, seven`, plus the `coin` bonus symbol. (`src/config.js: SYMBOLS`.)
- Spin: accelerate → motion-blurred spin → staggered left-to-right stops with an
  `easeOutBack` bounce. Outcomes are predetermined; the reel lands them (ADR-0003).

## 3. Win evaluation (`src/wins.js`)

- **5 fixed paylines** over the grid: middle, top, bottom, and both diagonals.
- 3-of-a-kind on a line pays `PAYTABLE[symbol] × bet`. Coins never pay lines.
- Paytable (× bet): cherry 4, lemon 5, plum 6, watermelon 10, bell 20, bar 40,
  seven 100.
- **Pure RNG, no nudges:** each of the 9 cells is an independent weighted draw
  (`src/outcome.js`) paid strictly by the paytable, so the played return equals
  the certified math.

## 4. Hold & Win bonus (`src/holdAndWin.js`)

- **Trigger:** 6+ `coin` symbols on the board. Coins land ~25%/cell, so this
  fires naturally ~1 in 100 spins — the feature is the RTP engine.
- Coins lock; remaining cells respin. Respins reset to **3** whenever a new coin
  lands. Each coin holds a cash value or a MINI/MINOR/MAJOR jackpot.
- Filling all 9 cells awards the **GRAND**. Jackpots (× bet): MINI 20, MINOR 50,
  MAJOR 200, GRAND 500.

## 4a. Certified RTP

- **TOTAL RTP ≈ 96%** (base lines ~45.7% + Hold & Win feature ~50.3%), the way a
  regulated hold-and-win slot is certified. Base is exact (enumeration); the
  feature is measured by seeded Monte-Carlo. Full method + figures:
  `docs/PAR-SHEET.md`; rationale: `docs/adr/0011`.

## 5. Celebrations & feedback

- Line win: matching cells glow + pulse, particle burst, screen shake, rolling
  WIN count-up. Tiers by win/bet: BIG ≥15, MEGA ≥40, EPIC ≥100.
- Procedural WebAudio SFX: spin whir, reel-stop clicks, win chimes (scale with
  size), coin dings, jackpot fanfare. Toggle with SOUND.

## 6. UI / economy

- Balance, bet +/- (levels 1,2,5,10,25,50), SPIN, AUTO (auto-spin + attract after
  idle), SOUND, and a MINI→GRAND jackpot ladder.
- Starting balance 1000 (demo refills when it would dry out so attract never dies).

## 7. Debug / tuning

- `?debug=1` or backtick → lil-gui panel: force WIN/BIG/MEGA/EPIC/BONUS, live
  sliders (weights, spin feel, slow-mo, quality, balance/bet), theme switcher,
  FPS meter. Off in normal play.
- All numbers live in `src/config.js`.

## 8. Non-goals

Real money/wagering, accounts, networking/multiplayer, server backend, binary
art/audio assets, mobile-native packaging.
