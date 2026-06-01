# 🎰 Coins: Hold & Win

A flashy, **buttery-smooth** Playson-style 3×3 slot machine, built with **PixiJS v8 (WebGL)** so it stays at 60fps even with glow, particles, and screen shake piled on.

## Features

- **3×3 reels** with weighted strips, staggered stops, and per-reel **motion blur**.
- **Glossy classic-fruit symbols** (cherries, lemon, plum, watermelon, bell, BAR, lucky 7) plus the gold **coin** bonus symbol — all drawn procedurally (no image assets, crisp at any resolution).
- **Line wins**: glowing cell highlights, particle bursts, screen shake, and a rolling WIN count-up with BIG / MEGA / EPIC banners.
- **Hold & Win bonus**: land 6+ coins → coins lock, 3 respins (reset on every new coin), cash values + **MINI / MINOR / MAJOR** jackpots, and the **GRAND** for filling all 9.
- **Auto-spin + attract mode**: hands-free spinning that auto-starts after idle — perfect to leave running on a screen.
- **Procedural WebAudio SFX**: spin whir, reel clicks, win chimes, coin dings, jackpot fanfare — synthesized at runtime, no audio files. Toggle with the SOUND button.

> Pure entertainment demo — play money only, no real wagering.

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

Everything lives in [`src/config.js`](src/config.js): palette, symbols, weights, paytable,
paylines, jackpots, bet levels, spin timing, demo win/bonus frequency, and a
`QUALITY` block to trade visuals ↔ performance.

## Project layout

| File | Role |
| --- | --- |
| `src/main.js` | Boot, scene, game state machine, auto-spin/attract |
| `src/reels.js` | Reel engine (deterministic strip-overwrite + motion blur) |
| `src/symbols.js` | Procedural glossy symbol textures |
| `src/wins.js` | Payline evaluation |
| `src/outcome.js` | Weighted spin-result generator (with demo nudges) |
| `src/holdAndWin.js` | The Hold & Win bonus showpiece |
| `src/effects.js` | Particle bursts, glow pulses, screen shake |
| `src/ui.js` | HUD: balance, bet, SPIN/AUTO/SOUND, jackpot ladder |
| `src/audio.js` | Procedural WebAudio SFX |
| `verify.mjs` | Headless Playwright smoke test + screenshots |

## Verify

```bash
npm run build
npm run preview &      # serve on :4173
node verify.mjs        # loads the page, spins, runs the bonus, screenshots, checks for console errors
```
