# 🎰 Coins: Hold & Win

> **Educational portfolio demo — not a gambling product.** Play-money only:
> credits have no cash value and reset on reload; there are no prizes. Nothing
> here is certified, audited, or approved by any regulator or testing lab — the
> RTP and statistics shown are computed by this project's own simulation, for
> transparency. See [`DISCLAIMER.md`](DISCLAIMER.md).

> **Status: growing, not frozen.** Actively developed — features and governance
> keep changing until an explicit freeze. See [`STATUS.md`](STATUS.md).

A flashy, **buttery-smooth** classic-style 3×3 slot machine, built with **PixiJS v8 (WebGL)** so it stays at 60fps even with glow, particles, and screen shake piled on.

## Features

- **3×3 reels** with weighted strips, staggered stops, and per-reel **motion blur**.
- **Glossy classic-fruit symbols** (cherries, lemon, plum, watermelon, bell, BAR, lucky 7) plus the gold **coin** bonus symbol — all drawn procedurally (no image assets, crisp at any resolution).
- **Line wins**: glowing cell highlights, particle bursts, screen shake, and a rolling WIN count-up with BIG / MEGA / EPIC banners.
- **Hold & Win bonus**: land 6+ coins → coins lock, 3 respins (reset on every new coin), cash values + **MINI / MINOR / MAJOR** jackpots, and the **GRAND** for filling all 9. It's the RTP engine — the feature, not the base game, carries most of the payback.
- **Self-computed ~96% TOTAL RTP**: pure RNG, no nudges — every cell is a weighted draw and pays strictly by the paytable, so the played return equals the self-computed math. The RTP is computed by this project's own simulation (enumeration + Monte-Carlo), shown for transparency — see the [disclaimer](DISCLAIMER.md) and [`docs/PAR-SHEET.md`](docs/PAR-SHEET.md).
- **Auto-spin + attract mode**: hands-free spinning that auto-starts after idle — perfect to leave running on a screen.
- **Procedural WebAudio SFX**: spin whir, reel clicks, win chimes, coin dings, jackpot fanfare — synthesized at runtime, no audio files. Toggle with the SOUND button.

> Pure entertainment demo — play money only, no real wagering.

## 🕹️ Test it yourself

**Play it live (no install):** every push auto-deploys to GitHub Pages →
**https://lostsoulfs.github.io/Demo-math-slot-test-only/**
_One-time setup:_ in the repo go to **Settings → Pages → Source: "GitHub Actions"**.
(If Pages isn't available on the repo's plan, the build is also attached as a
downloadable artifact on each Actions run.)

**Dev / debug panel:** add `?debug=1` to the URL (works on the live site too) or
press the **backtick (`` ` ``)** key. You get:

- an **FPS / ms** meter (top-left), and
- a tweak panel with buttons to **Force WIN / BIG / MEGA / EPIC / BONUS** on demand,
  plus live sliders for symbol weights, spin speed, slow-mo, particle/glow/shake
  quality, balance/bet, and a **theme switcher**.

So you can trigger and inspect every visual state instantly instead of waiting on RNG.

## Run it

```bash
npm install
npm run dev      # open the printed localhost URL
```

Build a static bundle:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the build locally
```

## Tuning

Everything lives in [`src/config.js`](src/config.js): palette, symbols, reel-strip weights,
paytable, paylines, jackpots, the Hold & Win feature economy (`BONUS`), bet levels,
spin timing, and a `QUALITY` block to trade visuals ↔ performance. Retune a number and
recompute with `npm test` / the `slotmath.js` harness (see [`docs/PAR-SHEET.md`](docs/PAR-SHEET.md)).

## Project layout

| File                | Role                                                      |
| ------------------- | --------------------------------------------------------- |
| `src/main.js`       | Boot, scene, game state machine, auto-spin/attract        |
| `src/reels.js`      | Reel engine (deterministic strip-overwrite + motion blur) |
| `src/symbols.js`    | Procedural glossy symbol textures                         |
| `src/wins.js`       | Payline evaluation                                        |
| `src/outcome.js`    | Pure-RNG spin-result generator (weighted draw, no nudges) |
| `src/holdAndWin.js` | The Hold & Win bonus showpiece                            |
| `src/effects.js`    | Particle bursts, glow pulses, screen shake                |
| `src/ui.js`         | HUD: balance, bet, SPIN/AUTO/SOUND, jackpot ladder        |
| `src/audio.js`      | Procedural WebAudio SFX                                   |
| `src/debug.js`      | In-app dev panel (lil-gui) + FPS meter, lazy-loaded       |
| `verify.mjs`        | Headless Playwright smoke test + screenshots              |

## Develop (read & edit locally)

Open in VS Code — `.vscode/` recommends ESLint + Prettier and enables format-on-save.

```bash
npm run lint           # eslint
npm run format         # prettier --write
```

## Verify

```bash
npm run build
npm run preview &      # serve on :4173
node verify.mjs        # loads the page, spins, runs the bonus, screenshots, checks for console errors
```

## Repo map (the six-slot model)

The same skeleton repeats across the connected repos — **rules → memory →
decisions → agent-tooling → verification → product**. This repo's job is to
_prove the slot math is honest_ (play-money, no real wagering, nothing certified):

- **Rules** — `AGENTS.md` (contract) · `CLAUDE.md` (pointer) · `GOLDEN_RULES.md` (cheat-sheet) · `SECURITY.md` · `DISCLAIMER.md` (no-certification wording).
- **Memory** — `docs/LEARNINGS.md` (+ archive) · `docs/kb/` (per-agent journal) · `docs/audit-history.ndjson` (the auditor's own memory).
- **Decisions** — `docs/adr/` (the "why" trail) · `docs/SPEC.md` (what) · `docs/PAR-SHEET.md` (the RTP math model).
- **Agent tooling** — `.claude/` (auditor/explorer/planner roles · slash-commands · hooks).
- **Verification** — `npm run test:proof` (RTP/RNG proofs) · `npm run mutation` (payout-logic mutants) · `scripts/audit-drift.mjs` (claims-vs-diff) · `npm run smoke:browser` · `.github/workflows/` + the secret/PII gate. The deep audit is **operator-triggered** (the human says "audit").
- **Product** — `src/` (the Pixi slot frontend); `src/outcome.js` (pure-RNG result) + `src/holdAndWin.js` (the RTP engine — the feature carries most of the payback).

Plain-language **and** technical walk-through: [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md).
