# Archived Learnings

This file preserves older and explicitly superseded entries moved out of the
active [`LEARNINGS.md`](LEARNINGS.md) retrieval path. Entries retain their
original dates and wording unless an archive heading supplies context.

_Distilled 2026-06-21 (F3): the 2026-06-10 / 2026-06-03 / 2026-06-02 sections below were moved out of the active `LEARNINGS.md` once it passed 500 lines; their evergreen rules were promoted to `GOLDEN_RULES.md`. Original dates and wording preserved._

## 2026-06-10

- **Research fold-in (testing/gaming-math) → metamorphic invariants (ADR-0013).**
  Four Gemini "deep dive" docs were reviewed for useful additions. Three of them
  (AI-dev trustworthiness, solo-repo security, advanced testing) cite
  **unverifiable, future-dated sources** (`arXiv:2603.*`, "ICLR 2026", tools like
  _ClaimCheck/Lore_) — treated as **RESEARCH_ONLY**, judged by concept not
  citation. The gaming-math doc's sources are real (GLI-19, NIST SP 800-22,
  `scipy.stats.binomtest`). **The research mostly VALIDATED what this repo already
  does** — so a future session should NOT "rediscover" it: seeded `mulberry32`;
  **no modulo bias** (the weighted pick is a cumulative-CDF walk, `slotmath.js`
  `pickSymbol`, not `% N`); chi-square + KS + runs + serial-correlation battery
  (`rng-stats.test.js`); RTP as a deterministic pin **plus** a CI band
  (`rtp-target.test.js`), not a magic number; an exact-binomial trigger test;
  property/fuzz tests; a mutation probe. The one genuine gap was **metamorphic
  relations** → added `test/metamorphic.test.js` (uniform weight-scaling
  invariance + payline-reorder invariance). Bet-scaling invariance was NOT added:
  RTP is bet-invariant by construction (`model.bet` is never used in the sim) and
  payout linearity is already covered in `property.test.js`.
- **Drift audit of PR #12 (in-session auditor):** deterministic pass clean
  (lint/build green, `src/` net +0, 79/79 tests); claims verified against the
  ground truth (`44bfd28` lockfile: vite 6.4.2→8.0.16, playwright
  1.56.1→1.60.0; PR #1/#2 both merged 2026-06-02). One phantom claim found and
  fixed: this pass originally called `claude/fast-visual-demo-GV6wC`
  "long-deleted," but `git ls-remote` shows the branch still exists (head
  `29a73fb`, merged into main, never deleted — as the 2026-06-02 entry itself
  says). Doc wording corrected; the same claim in commit `7857994`'s message
  stays as-is (pushed history). Lesson: verify "deleted" with `ls-remote`, not
  from memory.
- **Doc/CI currency pass (drift cleanup).** Fixed stale claims found by an audit:
  `AGENTS.md` said "Vite 6" but the repo has been on Vite 8 since the Dependabot
  major bump (`44bfd28`, 2026-06-02 — 6.4.2 → 8.0.16, no config changes needed);
  `SECURITY.md` said Dependabot was "weekly" but `.github/dependabot.yml` is
  monthly; `deploy.yml` still triggered on the stale
  `claude/fast-visual-demo-GV6wC` branch (PR #1's head — fully merged into
  main but never deleted; the 2026-06-02 stacked-PR entry below records that
  the merge kept it). Lesson: version/cadence claims in prose
  rot silently — prefer pointing at the source file (`package.json`,
  `dependabot.yml`) over restating numbers.
- **CHANGELOG hygiene:** everything that sat in `[Unreleased]` had actually
  shipped on 2026-06-02 (PRs #1/#2). Since the demo isn't versioned, released
  sections are now dated by merge date; `[Unreleased]` is empty again.
- **zizmor (`uvx zizmor .github/workflows/`) is a cheap, good workflow auditor.**
  It found 2 high-confidence template injections (`${{ github.base_ref }}`
  interpolated straight into `run:` in audit.yml/scan.yml — fixed by passing it
  through `env:`), workflow-level `pages: write`/`id-token: write` in deploy.yml
  (moved to job-level least privilege; note `actions/configure-pages` still needs
  `pages: read` to probe enablement), and missing `persist-credentials: false` on
  checkouts (added to read-only jobs; **intentionally NOT added in audit.yml**,
  whose job pushes auto-fix commits and needs the persisted token — the one
  remaining zizmor warning is accepted).
- **Action pins were already current** — Dependabot's grouped github-actions PR
  (#7) had moved checkout/setup-node to v6-era SHAs ahead of GitHub's 2026-06-16
  Node 24 runner default. Verified the pinned SHAs against the real tags with
  `git ls-remote ... refs/tags/vX.Y.Z` — note annotated tags need the peeled
  `^{}` SHA (checkout v6.0.3 peels to `df4cb1c0…`), while setup-node v6.4.0 is a
  lightweight tag (no `^{}` line, the tag SHA is the commit).
- **2026 GitHub convention for SECURITY.md:** point reporters at the repo
  Security tab → "Report a vulnerability" (private vulnerability reporting),
  explicitly say "no public issues," and state a response window.

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

## 2026-06-02 — superseded by ADR-0011

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
