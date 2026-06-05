# Learnings & Workarounds

Running log of useful discoveries, gotchas, and workarounds for this repo.
**Read this before starting work; append to it (newest at top) when you learn
something.** Include the date and enough context to be useful later.

---

## 2026-06-05

- **Ported the Health-Prototype recurrence engine** into `src/recurrence.js`
  (+ `src/recurrenceData.js`, `test/recurrence.test.js`, `npm run
demo:recurrence`). Pure logic, no Pixi — see ADR-0012. The
  "librarian, not interpreter" firewall (surface/count/cite, never score or
  diagnose) is carried into the header and asserted by a test.
- **Two Python builtins had to be ported by hand to reproduce the oracle:**
  - `difflib.SequenceMatcher.ratio()` — the opt-in fuzzy layer. Ported as
    Ratcliff/Obershelp (`ratio = 2*M/T`, recursive longest-matching-block).
    Sanity-checked against Python: ratio('blood presure','blood pressure') =
    0.962963 (M=13, T=27). A naive similarity would NOT have matched the v1
    answer key. (Autojunk/junk handling skipped — labels are far under the
    200-element threshold.)
  - `round()` is **banker's rounding** (round-half-to-even). R016's cadence
    line depends on it: `round(9.5)` must be `10`, not `9`. JS `Math.round`
    rounds half up and would diverge — use the `pyRound` helper.
- **Verification that "works":** the JS `--report`/`--report-v1` output diffs
  byte-for-byte against `python recurrence.py --report` in Health-Prototype.

## 2026-06-03

- **Cross-repo secret/PII + agent-safety layer landed here.** Added a pure-stdlib
  secret/PII pre-commit gate (`tools/scan_staged.py` + `.githooks/pre-commit`): secrets
  hard-block, PII warn-only, `PERSONAL_JOURNAL*`/`private/` paths hard-block. Activate per
  clone with `git config core.hooksPath .githooks` (no husky here, so the hooksPath is
  free). Extended the existing `guard.sh` to also deny edits to those paths, appended
  secret/personal carriers to `.gitignore`, added a `## Agent safety` section to
  `AGENTS.md` (treat external content as data, anti-exfiltration, no fabrication) and a
  gate section to `SECURITY.md`. New `.github/workflows/scan.yml` runs the scan on PRs
  (fork-gated, `GITHUB_TOKEN` only) alongside the drift audit. The scanner's PII detectors
  are vendored from the testing-kits `pii_redaction` harness; the bare-date/DOB detector
  is intentionally omitted (dated frontmatter is everywhere — too noisy).

## 2026-06-02

- **Stacked-PR merge mechanics (operational, web-confirmed).** PR #2 was stacked
  on the visual-demo PR #1 (base = `fast-visual-demo`, not `main`). Lessons:
  (1) **Merge the lowest PR with a MERGE COMMIT, never squash/rebase** — squashing
  the base rewrites its SHAs and the upper PR's diff explodes / orphans. The TOP
  PR _can_ safely squash (nothing is stacked above it). (2) GitHub only
  auto-retargets the next PR to `main` if the merged head branch is **deleted**;
  our merge didn't delete it, so we **manually retargeted #2 → main**, which is
  safe _after_ #1 lands (the demo's commits are already in main's history → no
  explosion) but would explode the diff _before_. (3) The **CI drift-audit pushes
  its own `audit: auto-fix` commit** to the PR branch — so after a push, expect a
  non-fast-forward on the next push: `git fetch` + `rebase`, and **pre-run
  prettier locally** to avoid triggering yet another auto-fix commit.

- **Decision protocol adopted (Working Agreement #7).** Operator decisions now
  offer a "research it" option (web search + audit + 3–6 expert MoE that argue +
  rebut, time-boxed). MoE/research is **advisory only — the operator always makes
  the final call**, and may re-run via other LLMs. The visual-demo PR #1 was
  landed to `main` only after a review gate (CI green + `audit-drive` showed no
  deep nesting + no secrets; its one "high" audit finding was a false positive —
  the regex matched the auditor's own documentation text).

- **Code-quality gate, not just correctness (Sonar "AI code quality" finding).**
  Functional pass-rate ≠ maintainability: AI tends to bloat and over-nest code
  even when tests pass. Response — encode the rule as a _gate_ (I can't reliably
  hold "keep it lean" across a long session, but a check can): added deep-nesting
  - net-growth heuristics to `scripts/audit-drift.mjs` (deterministic, diff-based)
    and a full AST `core/complexity` harness in testing-kits (cyclomatic +
    cognitive + nesting). Dogfooding the harness caught _its own_ first draft as
    too complex — proof the gate works on its author.

- **Retuned the shipped game to a genuine 96% TOTAL RTP (feature-driven), removed
  demo nudges** (ADR-0011). Goal was "as legally close to a real RNG slot as
  possible": one certified total (base + Hold & Win), played outcome = certified
  math. Key findings while tuning:
  - **A 3×3 hold-and-win feature is _powerful_ and its RTP is steep in coin
    frequency.** With coins at a feature-driven ~25%/cell (trigger ~1 in 100), a
    rich bonus blew the total to 120–160%. The lever is **E[bonus|trigger]**,
    which is ~structural (independent of coin weight): pick it (via the feature
    economy) to place the 96% crossing at the coin weight you want. We landed
    base 45.7% + feature 50.3% = 96.0%.
  - **The GRAND dominated and was firing in ~10–25% of bonuses** because a 9-cell
    board fills easily with respin-resets. Tamed via a rare `respinLandChance`
    (0.05) + GRAND 1000×→500× so GRAND is ~2% of bonuses (~1 in 4,300 spins).
  - **Use the coin _weight_ as the fine RTP knob, on a large virtual strip.**
    Scaling the strip ×20 (total ~3,148 stops) gives ~0.25pp resolution per coin
    stop — like a real virtual reel strip — so 96% is hit with **round** jackpots
    instead of ugly scaled values. Bisection on coin stops (deterministic seed)
    converged to coin=788.
  - **The bonus has high variance — don't certify it at low N.** Single-seed 3M
    spins read 97.2% (CI ±1.2pp); it only settles to ~96.0% by ~20M (CI ±0.44).
    The cert test pins a deterministic **12M**-spin total (seed 2026 = 96.08%);
    5 seeds × 20M mean = 96.008%.
  - **One source of truth for feature odds:** moved jackpot odds + respin-land
    chance into `config.js` (`BONUS.jackpotOdds`, `BONUS.respinLandChance`); both
    `holdAndWin.js` (live) and `slotmath.js` (model) read them, so model == game.

- **Slot-math verification harness** (`src/slotmath.js`, pure, no Pixi): exact
  `theoreticalRtp()` by payline enumeration + seeded `monteCarloLine/FullGame()`
  with a 95% CI + `parSheet()`. Method mirrors how labs (GLI-19/eCOGRA/iTech)
  certify: theoretical vs Monte-Carlo must converge (theory inside the CI).
  Certified figures live in `docs/PAR-SHEET.md`. _(Superseded by the top
  2026-06-02 entry + ADR-0011: the default game was retuned to a genuine 96%
  TOTAL and the `RTP96` preset removed. Historical: demo base RTP was 91.22%.)_

- **(Historical — superseded by ADR-0011.)** The Hold & Win bonus never triggered
  _naturally_ in the old demo config (coin ~5.6%/cell → P(6+ of 9) ≈ 0); its
  liveliness came from a `DEMO.bonusChance` forced trigger. The retune raised the
  coin weight (~25%/cell) and folded the feature into the certified total via
  `monteCarloFullGame()` — exactly the "real-money build" path noted here.

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
