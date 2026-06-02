# Learnings & Workarounds

Running log of useful discoveries, gotchas, and workarounds for this repo.
**Read this before starting work; append to it (newest at top) when you learn
something.** Include the date and enough context to be useful later.

---

## 2026-06-02

- **Slot-math verification harness** (`src/slotmath.js`, pure, no Pixi): exact
  `theoreticalRtp()` by payline enumeration + seeded `monteCarloLine/FullGame()`
  with a 95% CI + `parSheet()`. Method mirrors how labs (GLI-19/eCOGRA/iTech)
  certify: theoretical vs Monte-Carlo must converge (theory inside the CI).
  Certified figures live in `docs/PAR-SHEET.md`. Demo base RTP = **91.22%**;
  the opt-in `RTP96_WEIGHTS` preset (paytable unchanged) = **96.0328%** theory /
  **95.99%** measured (2M spins, theory in CI). Default game untouched. See ADR-0010.

- **The Hold & Win bonus never triggers _naturally_ in the demo config.** Coin is
  ~5.6%/cell, so P(6+ of 9 cells) ≈ 0 → bonus RTP ≈ 0% under fair play. The demo's
  bonus liveliness is the `DEMO.bonusChance` forced trigger, **not** fair math, so
  base (line) RTP is the certified game RTP. A real-money build would raise the
  coin weight / lower coin value and fold the bonus in via `monteCarloFullGame()`.

- **Seed Monte-Carlo & statistical tests with mulberry32** (`test/helpers/`): a
  fixed seed makes every statistic deterministic → no flaky CI. Drive code that
  calls the global `Math.random` (`outcome.js`, `utils.weightedPick`) via
  `withSeededRandom()` (a `vi.spyOn(Math,'random')` wrapper).

- **Mutation testing proves the suite isn't vacuous.** `npm run mutation`
  (`scripts/mutation-probe.mjs`, ported from the Drive `mutation_probe_2.py`)
  injects faults into `wins.js`/`slotmath.js` in an isolated temp copy (working
  tree never touched) and runs Vitest per mutant. Current score: **100% (10/10
  killed)**. Standalone, not in `npm test`, so CI stays fast.

- **No decimal.js needed** — slot payouts are integer multiplier × integer bet;
  assert integer-exactness instead of adding a big-decimal dependency.

- **Credit wins when determined, not after the animation.** `resolve()` in
  `src/main.js` now does `state.balance += win` _before_ `presentLineWins` /
  `celebrate` (same for the bonus). The rolling counter is cosmetic; the player's
  balance shouldn't wait on a multi-second celebration. This is also what makes
  the win assertable in a slow/headless renderer.

- **Headless software-WebGL (this container) is ~2fps and can't finish the
  celebration animations.** Two compounding causes: (1) the reel engine clamps
  per-frame `dt` to 0.05s (`src/reels.js`), so at low fps game-time advances
  slower than wall-clock → animations run in real-time slow-motion; (2) big-win
  particle bursts saturate the software rasterizer. Net effect: a winning spin's
  `celebrate()` can stall for tens of seconds, so `busy` looks stuck. **This is
  an environment artifact, not a game bug** — real browsers run at 60fps and the
  win/bonus render fine (see screenshots).

- **How `verify.mjs` stays reliable despite the above:** disable particles via
  `window.__slot.setQuality({ particlesPerBurst: 0, maxParticles: 0 })`; assert
  settling with a **forced no-win** spin (no celebration); assert payout by
  forcing a win and **polling the balance from Node** with a generous budget
  (credit lands before the animation); and **observe (not gate)** the animated
  bonus. The win/bonus _economics_ are covered deterministically by Vitest
  (`test/wins.test.js`).

- **Don't over-invest debugging an environment artifact** (the upgrade-ROI rule
  applies to debugging too): chasing the headless stall cost far more than it was
  worth once the logic was proven correct. Prove the logic, scope the test to
  what the environment can reliably observe, and document the gap.

## 2026-06-01

- **PR drift audit is free without an API key.** `scripts/audit-drift.mjs` is a
  dependency-free deterministic auditor; CI (`.github/workflows/audit.yml`)
  posts via the built-in `GITHUB_TOKEN` and applies only safe auto-fixes
  (prettier / eslint --fix). Semantic claim-vs-code review is done by the
  in-session auditor (runs on the session, also free). The paid Anthropic API
  was only ever needed for semantic checks _in CI_ — skipped. See
  `docs/DRIFT-AUDIT.md`. GitHub Actions pushes made with `GITHUB_TOKEN` do not
  retrigger workflows, so the auto-fix commit can't cause an audit loop. Fork
  PRs get a read-only token, so the job is gated to same-repo PRs.

- **Pixi v8 `renderer.generateTexture({ frame })` needs a `Rectangle` instance**,
  not a plain `{ x, y, width, height }` object. Passing a plain object throws
  `e.frame?.copyTo is not a function`. Fix: `import { Rectangle } from 'pixi.js'`
  and pass `new Rectangle(0, 0, w, h)`. (Hit in `src/symbols.js`, `src/effects.js`.)

- **Headless/CI Chromium uses software WebGL (SwiftShader)** with no GPU/vsync,
  so `app.ticker.FPS` reads absurdly low there. Do **not** treat low FPS in a
  headless container as a perf regression — verify smoothness on a real GPU.

- **GitHub Pages deploy requires Pages to be enabled** (repo Settings → Pages →
  Source: "GitHub Actions"). On a **private** repo it also needs a paid plan.
  The workflow (`.github/workflows/deploy.yml`) therefore always uploads a
  downloadable `slot-build` artifact and only attempts the Pages deploy when
  Pages is configured, so CI stays green regardless of plan.

- **Reel determinism** (`src/reels.js`): the outcome is decided first, then the
  strip slice that will be visible at the integer stop position is overwritten
  and eased into with `easeOutBack` (gives the bounce). Motion blur scales with
  reel speed via a `BlurFilter`.

- **Registering a SessionStart hook is gated by the harness.** Writing
  `.claude/settings.json` (hook registration and/or permission allow-rules) is
  treated as self-modification and is blocked unless the user explicitly
  authorizes it / adds the permission rule themselves. The hook _script_ can be
  created freely; only the settings registration needs user action.
