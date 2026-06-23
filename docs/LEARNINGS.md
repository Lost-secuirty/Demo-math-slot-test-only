# Learnings & Workarounds

Running log of useful discoveries, gotchas, and workarounds for this repo.
**Read this before starting work; append to it (newest at top) when you learn
something.** Include the date and enough context to be useful later.

Also: **grep this file for the module you're about to edit, at the moment you
edit it** (Working Agreement #9 — retrieval at point of use). Past ~500 lines
the `learnings-distill-due` audit check nags for a distillation pass: promote
evergreen rules to `GOLDEN_RULES.md`, mark superseded entries historical.

---

## 2026-06-23 — ADR-0021: render-layer visual assets permitted (PR-0)

Relaxed ADR-0002's procedural-by-default constraint for the render layer (files
that import `pixi.js`). Binary visual assets (PNG, sprite sheets, Canva art) are
now permitted there. Key points to remember:

- **Math/test layer firewall is permanent.** No `pixi.js`/`pixi-filters`/`@pixi/*`
  imports and no binary assets in pure-logic modules or `test/` files — ever. The
  verified pinned RTP (0.96081525) and its tests are immutable.
- **Audio stays procedural** (Web Audio API only) — this decision covers _visual_
  assets only. Widen with a future ADR if sampled audio is ever needed.
- **Canva export constraints:** raster only (no SVG); transparent-background PNG
  requires Pro plan; autofill API is Enterprise-gated (Pro trial does NOT unlock
  it). Export rate limits ~75/5min, 500/24h per user; download URLs expire in 24h.
- Lint enforcement (the `no-restricted-imports` firewall rule) lands in PR-1c —
  until then the boundary is convention-only.

---

## 2026-06-22 — agent-interop phase B: local stdio MCP server (PR-B1/B2, ADR-0020)

Made the MCP tool-defs genuinely callable via an in-repo **stdio** server
(`tools/mcp/server.mjs`) wrapping the pure `src/slotmath.js` exports — no HTTP,
no listener, runs in the caller's process. Hard-won points:

- **SDK v1 vs v2 trap.** Use `@modelcontextprotocol/sdk` (**v1**, `^1.29.0`):
  `McpServer` from `server/mcp.js`, `StdioServerTransport`, `registerTool` with a
  raw **`ZodRawShape`** (an object of zod validators, NOT `z.object(...)`). The
  v2 pre-alpha `@modelcontextprotocol/server` is a different, unstable API — do
  not mix. Providing `outputSchema` makes the SDK validate `structuredContent`.
- **stdout is the JSON-RPC frame.** The stdio transport owns stdout; log only to
  `console.error`. A stray `console.log` corrupts framing.
- **Lint-glob gap.** `tools/` was outside the `eslint`/mutation `COPY` globs —
  widen both when adding a linted+imported dir, or the new file silently escapes
  the security plugin and the mutation baseline ENOENT-fails.
- **Untrusted `modelOverrides` is a DoS footgun.** It merges straight into
  `buildModel`, so caller-set `reels`/`rows`/`symbols` hit the exponential
  enumeration (`symbols^reels`) / per-spin allocation — `{reels:9}` OOM-killed
  Node; a fractional `{reels:1.5}` infinitely recursed past the `depth===reels`
  base case. Bound the shape (caps + an enumeration ceiling + `Number.isInteger`)
  and reject degenerate weights (NaN) BEFORE compute, returning a clean `isError`.
  Also normalize non-finite output (`Infinity`→omit) so the content-text and
  `structuredContent` halves agree (`JSON.stringify(Infinity)==='null'`).
- **Honesty stays orthogonal.** `streaming`/`pushNotifications`/`liveEndpoint`
  track a HOSTED endpoint (phase C — stay `false`); a new
  `x-lifecycle.localMcpServer` marks the stdio server. The validator gained a
  phase-B branch with an injected `fileExists` (kept pure; `main()` passes real
  `existsSync`) so the gate bites if the card claims a server file that is gone.

## 2026-06-20 — CI-state literacy; the CodeRabbit absent-required trap (PR #40)

New governance doc: `docs/CI_AND_LIVE_STATE.md` — the CI-status taxonomy + the
live-state check. This repo's PR #40 (a Dependabot bump) was the canonical example:
`mergeStateStatus=BLOCKED` with every check green and zero unresolved threads, because
the required `CodeRabbit` context never posted (CodeRabbit skips draft/bot PRs by
default). `@coderabbitai review` posted `CodeRabbit :: success` and it went `CLEAN`.
Fix: `.coderabbit.yaml` with `auto_review.drafts: true`. A required context with no
reliable producer is a deadlock, not a gate — diff required-contexts vs what reported.

## 2026-06-13 — Slot-bundle salvage cross-check (read-only sweep; info for a future PR)

A ChatGPT-side session bundle (`dice_slot_session_bundle.zip`) held an earlier
Python slot build (`slot_machine.py` + a 44-test harness). Swept for anything
worth pulling into the math repo. **Verdict: the testing discipline is already
here and stronger — nothing to port.** This entry is forward-looking info only;
no code/tests changed in the PR that carries it.

- **Already covered + surpassed.** The bundle's exact-known-answer payouts,
  exhaustive enumeration, seeded Monte-Carlo, and RNG isolation are all present
  and more rigorous here: exact payline enumeration → seeded Monte-Carlo in
  `test/rtp-target.test.js` + `test/slotmath.test.js` (the latter's header even
  records it was ported from a _newer_ `slot_machine_v2_weighted.py`), plus
  `test/property.test.js` (property/fuzz), `test/metamorphic.test.js` (invariance
  relations), `test/rng-stats.test.js` (chi-square/KS/runs/serial-correlation +
  seed-replay), and the `withSeededRandom` isolation helper in
  `test/helpers/seededRng.js`. Re-porting any of it would be cargo-culting.
- **Two genuine future-expansion candidates (for a later, separate PR — not now):**
  1. **Durable/previous-good wrapper for `src/persist.js`** — schema-version tag +
     validate-on-read + one previous-good copy + an _observable_ (non-silent)
     fallback. This is the salvageable essence of the slot build's
     main+backup+manifest recovery, right-sized (no `fsync`/manifest machinery in
     a browser). The same pattern is landing in Codex `src/lib/storage.ts`; mirror
     it here only if/when persisted state becomes load-bearing.
  2. **A suite-wide determinism gate (test-order shuffle + perturbed clock/seed)** —
     mirroring the gate Codex is adding. This repo's many property/statistical
     tests are a natural home for latent order-dependence; a shuffle gate would
     fail loud on any non-hermetic test. `rng-stats`/`seededRng` already give RNG
     determinism, but not _suite-wide_ order independence.

## 2026-06-11 — audit-loop mechanics + cross-repo rollout (PR #28)

- **Historical audit-loop failure (superseded by PR #28).** The old audit
  workflow pushed `github-actions[bot]` auto-fix/history commits, which left
  held (`action_required`) runs and hid the last human commit's check state.
  PR #28 made the audit read-only: PR automation must not mutate the branch,
  and the exact latest human SHA must be green before merge.
- **The Working Agreement here is the extended local superset** of the shared
  core now in the other repos' `AGENTS.md`. The numbering (especially #8/#9)
  is load-bearing — ADR-0017, the `deviations-section` check, and
  `GOLDEN_RULES.md` reference it by number. Never renumber; cross-reference.
- Recon reports (even from subagents) are leads, not facts: this rollout's
  survey was wrong four times (claimed concurrency existed in ci/codeql here,
  and in two other repos' workflows). Ground-truth the file before editing.

## 2026-06-11

- **Post-#23 MoE retro → memory-hygiene loop changes (Scott-approved, ranked).**
  A 6-lens review (agent-memory research, NASA LLIS, SRE postmortems,
  regression-test culture, automation bias, Toyota kata) concluded our loop is
  capture-strong but **retrieval- and executability-weak**. Changes landed:
  - **Footgun lint rules** (`eslint.config.js`, `no-restricted-syntax` /
    `no-restricted-globals`): Pixi v8 plain-`'pointermove'` drags, plain-object
    `generateTexture` frame, and localStorage outside `src/persist.js`. Zero
    hits at introduction (verified); each rule cites its dated LEARNINGS entry.
    **Deviation from the ranked proposal:** these were planned as
    `audit-drift.mjs` scans but landed as ESLint rules — AST selectors can't
    false-positive on comments/strings, they fire at dev time AND in CI lint,
    and the auditor inherits them via its `lint-fail` check anyway. Flat-config
    gotcha: overlapping blocks REPLACE a rule's options (no merge), so
    `persist.js`'s exemption needs the pixi selectors repeated in both blocks,
    not split across them.
  - **`learnings-distill-due` audit check** (id in `CHECK_IDS`, pure helper
    `learningsDistillDue` in `audit-lib.mjs`, unit-tested): nags (low sev,
    never gates) when this file passes ~500 lines — distill evergreen rules to
    `GOLDEN_RULES.md`, mark superseded entries historical. NASA's
    lessons-learned failure mode is retrieval, not capture; an append-only log
    decays into a junk drawer.
  - **Working Agreement #9** (+ GOLDEN_RULES #17 + this file's header): grep
    LEARNINGS for the module **at the moment you edit it**, not just at session
    start.
  - **Retro cadence** (DRIFT-AUDIT.md): `/audit-retro` once history ≥5 PRs;
    at most ONE loop change per retro cycle so the next window can measure it.
  - **Accepted gaps got issues**: #24 (jackpot chips don't theme, ex-F8), #25
    (theme-switch mid-bonus pop, ex-F4) — deferred work in PR prose is where
    it goes to die.
  - **#26 self-audit fold-ins (Scott-gated).** The deep audit caught the loop
    eating its own tail: the footgun lint rules had **no permanent test** —
    proven only by a throwaway probe, so a flat-config refactor could silently
    neuter a selector while `npm run lint` stayed green (the PR's own thesis,
    one level up). Fixed: **F1** → `test/eslint-footguns.test.js` runs the REAL
    config through ESLint's `Linter` API on inline fixtures, filename-routed so
    the `src/**` vs `src/persist.js` scoping is exercised (8 tests: each rule
    fires on the bad form, passes on `globalpointermove`/`new Rectangle`, and
    persist.js is storage-exempt but Pixi-still-enforced). **F2** → a SCOPE
    comment in `eslint.config.js` naming the known-uncovered evasions
    (`addEventListener`, variable frame, `globalThis`/`self.localStorage`) so
    the next author treats the rules as a tripwire for the common form, not a
    wall. Gotcha for porters: `Linter.verify(code, config, { filename })`
    applies flat-config `files`/`ignores` by the passed filename — that's how
    you unit-test path-scoped rules without touching disk; filter messages by
    `ruleId` to drop `no-undef` noise from the fixtures.
  - **CI caught what local `npm test` didn't (mutation probe).** The F1 test
    `test/eslint-footguns.test.js` imports `../eslint.config.js`, but
    `scripts/mutation-probe.mjs` copies only a `COPY` allowlist (`src`, `test`,
    `scripts`, `package.json`, `vitest.config.js`) into its isolated `/tmp`
    clone — so the baseline vitest run there threw `ERR_MODULE_NOT_FOUND` on
    `eslint.config.js` and the `mutation` CI step failed **while lint/test/
    build/smoke all passed**. I'd claimed "130 green / CI green" off local runs
    without running `npm run mutation` — a verify-before-claiming miss (WA#5);
    the end-session drift sweep is what surfaced the red. Fix: add
    `eslint.config.js` to the probe's `COPY` list (same class as the earlier
    `scripts/` addition). **Rule: any new test that imports a repo file outside
    `src/`/`test/`/`scripts/` must be matched by a `COPY` entry, or the
    mutation probe's baseline breaks.** Always run `npm run mutation` (not just
    `npm test`) before claiming a green PR.

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

## Archive index

Superseded and older entries remain available in
[`LEARNINGS-archive.md`](LEARNINGS-archive.md). Moving them out of the hot path
is a retrieval decision, not a deletion or rewrite of project history.
