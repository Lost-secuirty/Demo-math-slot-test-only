# PAR Sheet — Coins: Hold & Win

A **Probability / Accounting Report**: the certified math of the game, the way
a testing lab (GLI, eCOGRA, iTech) documents and verifies a slot. Every figure
here is produced by the in-repo math harness (`src/slotmath.js`) and locked by
tests (`test/slotmath.test.js`, `test/rtp-target.test.js`, `test/rng-stats.test.js`,
`test/bonus.test.js`).

> Pure entertainment demo — play money only, no real wagering. The math below
> is nonetheless built to a real regulated-online-slot spec (a single certified
> **TOTAL** RTP of ~96%), so the pipeline mirrors how a live game is signed off.

**Last certified:** 2026-06-02 (ADR-0011 retune, PR #2) — deterministic pin:
seed 2026, 12M spins → **96.08%** total; 5 seeds × 20M spins → mean **96.008%**.

## The one number that matters: TOTAL RTP ≈ 96%

This is a **hold-and-win** game, so RTP is certified as a single TOTAL across
the base lines **and** the Hold & Win feature — exactly as a lab certifies a
Lightning-Link-style title (the feature, not the base game, is the RTP engine).

| Component              | RTP (×bet) |
| ---------------------- | ---------: |
| Base game (5 paylines) |    ~45.69% |
| Hold & Win feature     |     ~50.3% |
| **TOTAL**              | **~96.0%** |
| House edge (total)     |      ~4.0% |

- **Base game** is **exact** (full payline enumeration — zero variance).
- **Feature** is intractable to enumerate, so it's measured by a high-volume
  seeded Monte-Carlo (`monteCarloFullGame()`), the same way labs handle
  hold-and-win features.
- **5 seeds × 20M spins:** mean total **96.008%**, range **95.83%–96.24%**
  (per-seed 95% CI ±0.44pp). Deterministic check (seed 2026, 12M spins):
  **96.08%** — pinned in `test/rtp-target.test.js`.

### No nudges — played RTP **equals** certified RTP

The live game (`src/outcome.js`) draws each of the 9 cells independently from
the reel-strip weights below and pays strictly by the paytable. There are **no
forced wins and no forced bonuses** — the experienced RTP is the certified RTP.
(An earlier build leaned on demo "nudges"; those were removed so the game is as
close to a real RNG slot as possible.)

## How it's verified

```bash
node --input-type=module -e "import('./src/slotmath.js').then(m=>console.log(m.parSheet()))"
npm test           # locks every figure below (incl. the 12M-spin total)
npm run mutation   # proves the math tests catch bugs (100% kill rate)
```

1. **Theoretical (exact)** — enumerate every 3-symbol payline outcome weighted
   by reel probability (`theoreticalRtp()`); total base RTP = per-line × 5.
2. **Actual (Monte-Carlo)** — seeded millions of spins with a 95% CI
   (`monteCarloLine()` for the base, `monteCarloFullGame()` for base+feature).
   Convergence check: the exact base figure sits **inside** the simulated CI.
3. **RNG battery** — seeded mulberry32 passes chi-square / KS / runs /
   serial-correlation (`test/rng-stats.test.js`); labs reference NIST SP 800-22.

## Reel model

3 reels × 3 rows. Each cell is drawn independently from one weighted virtual
strip of **3,148 stops** (the primary RTP lever):

| Symbol     | Stops | Probability |
| ---------- | ----: | ----------: |
| cherry     |   520 |      16.52% |
| lemon      |   480 |      15.25% |
| plum       |   440 |      13.98% |
| watermelon |   360 |      11.44% |
| bell       |   260 |       8.26% |
| bar        |   180 |       5.72% |
| seven      |   120 |       3.81% |
| **coin**   |   788 |  **25.03%** |

> **Modeling note:** cells are i.i.d. draws from one strip — a simplification
> vs. physical per-reel strips (which add positional correlation). The live
> reel engine (`src/reels.js`) lands on exactly this i.i.d. grid, so the model
> matches the played game. A multi-strip model would be the next fidelity step.

Paytable (×bet, 3-of-a-kind on a line): cherry 4, lemon 5, plum 6, watermelon
10, bell 20, bar 40, seven 100. Five fixed paylines (middle, top, bottom, two
diagonals). Coins never pay a line — they feed the Hold & Win trigger.

## Base-game figures (exact)

| Metric                        |       Value |
| ----------------------------- | ----------: |
| Base (line) RTP               |    45.6889% |
| Hit frequency (per line)      |     1.3084% |
| Hit frequency (any line, sim) |      ~6.32% |
| Volatility (SD per line)      |      1.2160 |
| Top line pay — 3× seven       | 1 in 18,053 |

## Hold & Win feature

Coins land ~25% of cells, so **6+ coins** (the trigger) appear naturally about
**1 in 99 spins** (exact binomial). Triggering coins lock; empty cells respin
(`respinLandChance` 5% each, per respin) and the respin counter resets to 3 on
every new coin. Each coin carries a weighted cash value (1–20×, cash EV ≈ 4.0×)
or a jackpot — MINI 20× / MINOR 50× / MAJOR 200× (per-coin odds 4% / 1.2% /
0.3%); average coin value ≈ **5.8×**. Filling all 9 cells awards the **GRAND
500×**.

| Feature metric                 |             Value |
| ------------------------------ | ----------------: |
| Trigger (6+ coins), exact      |         1 in 99.4 |
| Feature RTP (of the 96% total) |            ~50.3% |
| GRAND (all 9 filled)           | ~1 in 4,300 spins |
| Max win observed (20M spins)   |         ~810–977× |

Measured by `monteCarloFullGame()` / `simulateBonus()`, whose coin odds are read
from `config.js` (`BONUS.jackpotOdds`, `BONUS.respinLandChance`) — the **same**
constants the live feature (`holdAndWin.js`) uses, so model = game.
