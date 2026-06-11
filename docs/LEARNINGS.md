# Learnings & Workarounds

Running log of useful discoveries, gotchas, and workarounds for this repo.
**Read this before starting work; append to it (newest at top) when you learn
something.** Include the date and enough context to be useful later.

---

## 2026-06-11

- **Spokey horror theme + Settings/Paytable + ambient dread (PR 1 of 2).** Added
  a 5th `spokey` theme preset (dark-but-colorful) with cabinet chrome, a
  player-facing Settings panel (volume slider + mute + theme picker, persisted),
  a Paytable modal, and a procedural ambient dread bed — all VISUAL/AUDIO only,
  zero money/math touched (RTP pin `0.96081525` byte-identical; mutation 100%).
  Gotchas worth keeping:
  - **`applyTheme` is narrower than its name** — it repaints only the bg
    gradient + godrays + reel frame/glow. UI title, jackpot ladder, and corner
    readouts read `COLORS` ONCE at build and never repaint. New themed chrome
    (cabinet, fog) needs its OWN repaint hook; we route it all through
    `applyTheme` so debug- and player-triggered switches behave identically.
  - **Jackpot ladder chips don't recolor with the theme** (fixed
    `JACKPOTS[kind].color`) — true for every theme, just more visible under
    spokey's dark palette. Left as a follow-up, not a regression.
  - **Bottom-center is owned by the big SPIN button** — a centered cabinet LED
    strip collided with it and the bet cluster. Moved CREDITS/WIN to the bottom
    CORNERS (the HUD's own readout spots, proven clear of controls) and hid the
    default corner text under spokey. Lesson: reuse the layout slots the HUD
    already proved safe instead of inventing new ones in a crowded row.
  - **Pixi v8 slider needs `root.toLocal(e.global)`** — the game lives in a
    letterbox-scaled `world`, so raw window pixels make the knob jump. Map
    pointer coords through the container.
  - **`localStorage` is greenfield** — centralized in one Pixi-free `persist.js`
    (try/catch, degrades to defaults in private mode) so the render/pure
    firewall holds and it stays unit-testable (`test/persist.test.js`).
  - **Audio channel graph**: SFX + ambience now sit on separate sub-gains under
    a master so the dread bed can swell during the bonus independently; mute is
    master=0, volume restores. Bonus-gated unease (`src/unease.js`) decorates
    the Hold & Win animation timeline ONLY — it never reads/writes the ledger
    (the money seam stays load-bearing; the 12M RTP pin is the canary).
  - **#23 audit fold-ins (Scott-gated, + web-sourced updates).** (1) An
    instantaneous `gain.value` jump on mute/volume pops audibly — replaced with
    `setTargetAtTime(target, t, 0.015)` (~15ms reads as immediate without the
    click; MDN Web Audio best practices). The `0.0001` floor on exponential
    ramps was already right — exponentialRamp mathematically can't reach 0.
    (2) **Pixi v8 drags need `globalpointermove`** — plain `pointermove` on the
    stage only fires while the pointer is over an interactive object, so a fast
    drag off the knob would stall; the slider now attaches `globalpointermove`
    - `pointerup` on drag-start and removes them on drag-end (no lingering
      stage listeners). (3) The audio mix arithmetic (mute=0, unmute restores,
      volume-while-muted stays silent) is pure — pinned in
      `test/audio-mix.test.js` with a stub gain node (same trick as persist:
      export the class, stub the boundary). 118 tests; RTP pin + smoke 8/8
      unchanged.
  - **verify.mjs browser**: the full Chrome build auto-requests `/favicon.ico`
    (404 → a console error that fails the smoke); CI's headless shell doesn't.
    Added an optional `PW_CHROMIUM` executablePath override for local runs when
    the pinned browser can't be downloaded (restricted network) — unset in CI,
    so default behavior is unchanged.
- **ADR-0017 — the audit loop got memory and a propose-only self-tuning path.**
  Trigger: Scott caught a mid-task tactic change that lived only in agent
  _thinking_ — never surfaced, lesson lost. Three additions, all gated: (1)
  Working Agreement #8 + mandatory PR-body `## Deviations from plan` section,
  enforced by the new `deviations-section` check (medium on purpose — strict
  stays a logic gate; HTML comments stripped first so the untouched template
  placeholder fails; check silently skipped when no body is available, so
  local bodyless runs don't nag). (2) `docs/audit-history.ndjson` — CI appends
  one line per audited head (stable check ids now on every finding), deduped
  by head sha, persisted by the existing auto-fix commit (no retrigger loop);
  `merge=union` via the new `.gitattributes`; the history file is exempted
  from the `unlogged-files` heuristic or the loop would manufacture its own
  findings forever. (3) `/audit-retro` — manual, propose-only meta-audit
  (fire-rates, dead checks from `CHECK_IDS`, real-catch cross-ref vs this
  log, deviation-compliance spot-checks; refuses to tune on <5 PRs). Pure
  logic extracted to `scripts/audit-lib.mjs` + unit tests — the auditor
  itself is finally under test. Gotcha for porters: in Actions
  `GITHUB_PR_BODY` is SET even when the body is empty (check fires,
  correctly); detect "body provided" via `'VAR' in process.env`, not
  truthiness.
- **Post-#20 verification + history repair.** Codex's hardening pass (#20) was
  verified clean: zero math files touched, 94/94 green, 12M-spin headline
  `0.96081525` exact `===`, lint/build green, main CI #90 success — and CI is
  now STRICTER (mutation probe gates, `test:proof`, browser-smoke, CodeQL,
  dependency-review, Node 24). Two doc dings repaired here: (1) #20's blanket
  old-name find/replace corrupted the append-only rename entry into "renamed
  X → X" — restored the original text (repairing corrupted history ≠
  rewriting history); (2) ADR-0012 was deleted outright in the privacy scrub,
  breaking the append-only ADR chain (index jumped 0011→0013) — recreated as
  a content-free TOMBSTONE (number + removal record, deliberately no detail,
  so the scrub holds) and re-indexed as "Removed". Also fixed our own miss:
  ADR-0015/0016 were never added to the README index in #18/#19. Lessons:
  blanket find/replace is the enemy of append-only logs — scope renames to
  living docs; and "delete for privacy" still gets a tombstone, because a
  numbering gap reads as a mistake while a tombstone reads as a decision.
- **Smoke's first CI run failed on a latent test race, not game code (990→975).**
  On the GitHub runner the slow software-WebGL boot exceeded `idleToAttractMs`
  BEFORE verify.mjs's keepAwake interval started → attract engaged →
  `state.auto` chained spins. keepAwake only prevents NEW activations; auto
  stays on once engaged. `forceLineWin()` then silently no-oped (returns early
  while `state.busy`), and the poll watched auto-spins drain 3 bets. Fix in
  verify.mjs only: `toggleAuto(false)` after boot AND again before the
  forced-win baseline; wait-for-fully-idle before calling `forceLineWin`; 60s
  settle timeouts. Lessons: (1) a test tuned in one environment carries hidden
  timing assumptions — the first run on new hardware is a test OF the test;
  (2) silent-no-op test APIs (`if (busy) return`) turn races into confusing
  downstream failures — prefer waiting for idle before invoking them.
- **#19 audit fold-ins (Scott-gated audit, per the new CLAUDE.md gate).** The
  deep audit found the registry's trigger input was secretly coin-shaped —
  `checkTrigger(cells)` looked general but the orchestrator only fed it
  `res.coinCells`, so a feature triggering on anything else couldn't be a
  plug-in. Widened the contract BEFORE a second feature exists (cheapest
  moment): `checkTrigger(spin, model)` with `spin = { grid, cells }` — grid is
  canonical (shared shape both sides), cells stays the bonus-symbol
  convenience (representations differ: flat vs {reel,row}; custom features
  must derive from grid). Also: loud missing-renderer guard in main.js
  (register-without-map-entry is the obvious feature-#2 mistake); committed
  `test/bonusMoney.test.js` (renderer money arithmetic ≡ feature ledger, 2000
  seeded rounds — was a throwaway check in #17, now a permanent pin); and the
  **smoke test finally runs somewhere**: new `smoke` job in ci.yml (chromium
  only via `npx playwright install chromium --with-deps`, vite preview +
  curl-wait, verify.mjs gates with exit code, screenshots uploaded as
  artifacts) — closing the "render path has no executable check anywhere"
  finding from the #18 audit. Lesson worth keeping: **a contract is what you
  feed it, not what you name it** — the registry pattern was easy, the real
  coupling hid in the argument.
- **Phase 2/PR B — feature-plugin registry (ADR-0016); Hold & Win is plug-in #1.**
  The last hardcoded feature coupling is gone: `main.js` no longer inlines the
  trigger rule or names `BonusGame` in the branch — it asks
  `src/features/registry.js` `findTriggered(cells, model)` and dispatches via a
  `featureRenderers` map (`id → Pixi scene`; renderers deliberately stay OUT of
  the registry to keep the pure/render firewall). The trigger rule lives ONCE in
  `features/holdAndWin.js` `checkTrigger(cells, model)` (no rng, count-only,
  passes the same cells array through) — the live game reaches it via the
  registry, `monteCarloFullGame` imports it directly, so live-vs-sim trigger
  drift is now impossible. Gotchas: (1) the orchestrator snapshots
  `defaultModel()` **per spin** for the check — a boot-time model would freeze
  values and break the live debug sliders (config singletons are mutated live);
  (2) the harness does NOT consult the registry, so sims stay independent of
  global registration state. Equivalence re-proven: seeded outputs incl. the
  12M headline are `===`-identical through the registry path; 107/107 green.
  Adding a feature is now: pure module + `registerFeature` + one renderer-map
  entry.
- **Repo renamed `replit-code` → `Demo-math-slot-test-only` (Scott, 2026-06-11).**
  Git remotes keep working (GitHub redirects), and the deployed app survives
  because `vite.config.js` uses `base: './'` — but **GitHub Pages URLs do NOT
  redirect**, so the README's live-demo link was dead until re-pointed at
  `lostsoulfs.github.io/Demo-math-slot-test-only/`. ADR-0012's "replit-code"
  mention is a historical quote — left as-is (decision records keep their
  history). Lesson: after a repo rename, grep for the old name — Pages links
  and badges are the silent breakage.
- **Coverage finding: the rendered payout path had NO executable check anywhere.**
  Review of PR #18 surfaced that `evaluate()` scores the grid read back from
  the reel strips (`reels.spin()` → `getGrid()` → `getVisible()`), NOT the
  pre-committed outcome object — so the strip write/readback is
  payout-load-bearing. Meanwhile `verify.mjs` (Playwright smoke) runs in **no
  CI workflow** (ci.yml = lint+test+build only) and is blocked locally by the
  container network policy — i.e. the entire render path shipped on reasoning
  - "build succeeds". Fix folded into #18: extracted the strip-window index
    math into pure `src/reelWindow.js` (`mod`, `writeOutcome`,
    `visibleFromStrip`; reels.js delegates) and added
    `test/reelWindow.test.js` — write/read pinned as exact inverses for 1–6
    rows incl. wrap-around + only-touches-`rows`-slots, the pre-refactor
    unrolled ROWS=3 indices asserted verbatim, and a headless
    outcome→strip→readback→`evaluate()` test proving a planted win and planted
    coin cells survive the round-trip and pay exactly. Follow-up worth doing
    someday: run the smoke in CI (needs Playwright browser install there).
- **Phase 2/PR A — grid is model-driven N×M (ADR-0015); default 3×3 byte-identical.**
  Two implicit dimension sources existed (renderer read `GRID.reels/rows`; math
  _inferred_ dims from PAYLINES). Now `defaultModel()` carries explicit
  `reels`/`rows` from `GRID`; math consumers read `model.reels ?? inferred`
  (fallback keeps hand-built test models working); the renderer keeps reading
  `config.GRID` (no model threading — main.js stays the orchestrator). The flat
  cell index is **column-major `reel*rows+row`** everywhere, matching
  `monteCarloFullGame`'s `flat.slice(r*rows,…)` — `test/nbym.test.js` uses a
  non-square 5×3 shape because a square grid can't distinguish `reel*rows+row`
  from `reel*reels+row`. De-hardcoded: `outcome.js` literal `[[],[],[]]`+`<3`
  loops; `reels.js` unrolled top/mid/bottom window → `strip[mod(target+ROWS-k)]`
  for k=0…ROWS-1 (no-outcome filler stays SPINNABLE/coin-excluded); Pixi bonus
  board build + `reel*3+row`; debug slider max 9; main.js debug helpers
  (`forceLineWin` now lands `PAYLINES[0]` instead of assuming `[1,1,1]`).
  **Equivalence proof:** before any edit, captured full-precision seeded outputs
  (theoretical lineRtp; monteCarloFullGame at seeds 2026/1/42/777 incl. the 12M
  headline 0.96081525; monteCarloLine seed 9); after the refactor every figure
  is `===`-identical, and the suite is 94/94 (84 old + 10 new N×M tests). The
  N×M tests assert finite/structural sanity ONLY — an untuned 5×3 board
  triggers the bonus far more often than 3×3 (15 cells ≈ same per-cell coin
  odds), so its RTP exceeds 1; per ADR-0014 no balance claim is made for
  non-default shapes. `evaluate()` reads the LIVE config paylines, so N-wide
  line math is proven via the model-driven harness; `evaluate`'s own loops are
  shape-agnostic (tested with coins beyond the 3×3 window).
- **Mutation probe had 2 silently-SKIPPED mutants since Phase 1** — their find
  strings (`if (roll < odds.major)`, GRAND-award) moved from `slotmath.js` to
  `src/features/holdAndWin.js` in PR #17, and the probe SKIPs when the string
  isn't found in the declared file. Baseline before this fix: 8 KILLED / 2
  SKIPPED (the old "10/10" in earlier entries predates the extraction).
  Re-pointed the two `file:` fields at the feature module. Lesson: the probe's
  find-strings are **location-coupled** — any refactor that moves pinned code
  must re-point the probe, and "SKIPPED" is the tell.
- **Phase 1 — Hold & Win feature de-duplicated into ONE pure source of truth.**
  `decideCoin` + the respin loop existed verbatim in both `slotmath.js` (seeded
  math) and `holdAndWin.js` (Pixi UI, via `_decideCoin` + an inline loop) — a
  drift hazard. Extracted both into `src/features/holdAndWin.js` as a pure module
  (no Pixi, rng injected): `decideCoin(rng, model)` and `play(triggerCells,
model, rng)`. `play()` returns the round total (x bet) **and an event stream**
  (`{type:'place',cells}` then one `{type:'respin',landed,respinsLeft}` per
  respin) that the renderer **replays** instead of re-deciding — the load-bearing
  "one event stream, two consumers" seam. `slotmath.js` now re-exports
  `decideCoin` and keeps `simulateBonus` as a thin ledger-only wrapper over
  `play()`; the Pixi `BonusGame.run()` builds `defaultModel()`, calls `play(...,
Math.random)`, and animates the events (coin amounts x bet at render time).
  **Behavior preserved:** the RNG draw order in `play()` is identical to the old
  inline sim, so the 96.082% RTP pin and `bonus.test.js` seeded values are
  byte-identical (84/84 green). Extra check: over 4000 seeded rounds `play()`'s
  total == `simulateBonus`'s total and the event stream reconstructs that exact
  total (no UI drift). **Gap:** the live Pixi render couldn't be smoke-tested here
  — `npx playwright install chromium` is blocked by the container network policy,
  so `verify.mjs` didn't run; the replay was validated by build + the event-total
  reconstruction instead.
- **Factual-wording sweep (ADR-0014) — no certification/lab claims anywhere.**
  This is a play-money portfolio demo; it cannot be certified, audited, or
  reviewed by any regulator/lab. Earlier wording across code comments, docs,
  ADRs, tests, and the README framed the math the way a real-money slot lab
  documents one — "certified", "the way a lab certifies", "fair", "regulated",
  "compliant", plus standards-body name-drops (GLI/GLI-19, eCOGRA, iTech, NIST
  SP 800-22, Diehard). All of that was **claiming a status the project doesn't
  have**, so it was reworded to what the code actually does: the RTP is
  **self-computed by this project's own simulation (enumeration + Monte-Carlo),
  shown for transparency** — never "certified". Wording-only change: no logic,
  assertions, numbers, or function names touched; 84/84 tests stayed green, and
  lint and build were clean. Also genericized "Playson-style" to "classic-style"
  everywhere (Playson is a real studio; the disclaimer says we are not affiliated
  with any studio and all names are original). Demo framing now lives in three
  always-present places: `DISCLAIMER.md`, a README blockquote, and an in-app
  banner in `index.html`. Enforcement grep (should return nothing outside this
  append-only log, the policy ADR-0014, and the disclaimer negations):
  `git grep -nIPi "certif|complian|fairness|regulat|GLI|eCOGRA|iTech|\bNIST\b|diehard"`.

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
