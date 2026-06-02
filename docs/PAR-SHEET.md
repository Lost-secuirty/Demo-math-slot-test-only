# PAR Sheet — Coins: Hold & Win

A **Probability / Accounting Report**: the certified math of the game, the way
a testing lab (GLI, eCOGRA, iTech) documents and verifies a slot. Every figure
here is produced by the in-repo math harness (`src/slotmath.js`) and locked by
tests (`test/slotmath.test.js`, `test/rtp-target.test.js`, `test/rng-stats.test.js`).

> Pure entertainment demo — play money only. The "RTP96" column shows that the
> same pipeline can certify a real, regulated-market 96% game (see ADR-0010).

## How RTP is verified (two values, must agree)

1. **Theoretical RTP** — exact, by enumerating every 3-symbol payline outcome
   weighted by reel probability (`theoreticalRtp()`). Total RTP = per-line RTP ×
   5 paylines (expectation is linear).
2. **Actual RTP** — a seeded Monte-Carlo of millions of spins with a 95%
   confidence interval (`monteCarloLine()`). The convergence check: the exact
   figure must sit **inside** the simulated CI.

Reproduce:

```bash
node --input-type=module -e "import('./src/slotmath.js').then(m=>console.log(m.parSheet()))"
npm test           # locks the figures below
npm run mutation   # proves the tests actually catch math bugs (100% kill rate)
```

## Reel model

3 reels × 3 rows, each cell drawn from one weighted virtual strip (weights are
the primary RTP lever; the paytable is identical across both columns below).
Paytable (×bet, 3-of-a-kind on a line): cherry 4, lemon 5, plum 6, watermelon
10, bell 20, bar 40, seven 100. Five fixed paylines (middle, top, bottom, two
diagonals). Coins never pay a line — 6+ coins trigger the Hold & Win bonus.

## Certified figures

| Metric                       | Demo (default)  | RTP96 preset                  |
| ---------------------------- | --------------- | ----------------------------- |
| Virtual stops / reel         | 125             | 122                           |
| **Theoretical base RTP**     | **91.2210%**    | **96.0328%**                  |
| House edge                   | 8.7790%         | 3.9672%                       |
| Monte-Carlo RTP (seeded)     | 91.05% (N=500k) | **95.992%** (N=2M, seed 2026) |
| 95% CI brackets theory       | ✅              | ✅ ([95.521%, 96.463%])       |
| Hit frequency (per line)     | 2.6123%         | 2.9247%                       |
| Volatility (SD per line)     | 1.7134          | 1.5209                        |
| Jackpot — 3× seven on a line | 1 in 9,042      | 1 in 14,527                   |

Symbol probabilities (RTP96): cherry 21.31%, lemon 19.67%, plum 18.03%,
watermelon 17.21%, bell 9.02%, bar 5.74%, seven 4.10%, coin 4.92%.

## Hold & Win bonus

Triggering 6+ coins is intractable to enumerate, so the bonus is measured by
Monte-Carlo (`monteCarloFullGame()` / `simulateBonus()`). Each coin holds a cash
value (weighted 1–25× bet, EV ≈ 5.5×) or a jackpot (MINI 20× @ ~11%, MINOR 50×
@ 6%, MAJOR 200× @ 3%); filling all 9 cells awards the GRAND (1000×). Average
coin value ≈ **15.6× bet**.

**Finding:** with the demo weights, 6+ coins essentially **never** land
naturally (coin ≈ 5.6% per cell → P(≥6 of 9) ≈ 0), so the demo's bonus
liveliness comes from the `DEMO.bonusChance` forced trigger, **not** fair math.
The base RTP figures above are therefore the certified game RTP; the bonus is a
presentation feature layered on top. A real-money build would raise the coin
weight / lower its value and re-run `monteCarloFullGame()` to fold the bonus
into a single certified total.
