# Backlog — Coins: Hold & Win

Prioritized list of pending work. Updated June 2026.

Format: `[priority]` — what it is, why it matters, what PR/phase it belongs to.

---

## URGENT (time-sensitive)

### ESLint v9 → v10 migration

**Priority:** HIGH — deadline August 6, 2026 (v9 EOL)
**Why:** ESLint v9 reaches end-of-life August 6, 2026. v10 drops `eslintrc` entirely (we're already on flat config so migration should be low-effort, but needs verification). The `no-restricted-imports` patterns form we're planning for PR-1c — check v10 compatibility before writing that rule.
**Action:** Upgrade `eslint` to v10.x. Run `npm run lint` to confirm no breakage. Add to a small dedicated PR or fold into PR-1c.

---

## Immediate (PR-B2 fold-ins — in progress)

### PR-B2 fold-in: 3 stale doc spots

- `tools/mcp/tools.json` line 2: $comment says "Phase A" — update to phase B + ADR-0020 reference
- `docs/kb/agent-interop.md` lines 54–56: "phase-A discovery card...phase-B endpoint" — update to current framing
- `docs/kb/agent-interop.md` line 19: remove "(or the `coins-math-mcp` bin)" — bin is dead
- `scripts/agent-card-validate.mjs` lines 1–3: update header from phase-A to both A and B

### PR-B2 fold-in: Fix shebang/bin inconsistency

- `tools/mcp/server.mjs` lines 8–13: fix NOTE comment — remove false claim that "bin shim invokes node explicitly"; note bin is dead (private package, shebang removed)
- `package.json`: remove the `"bin": { "coins-math-mcp": ... }` entry entirely

### PR-B2 fold-in: 2 missing tests in agent-card.test.js

- Phase-A branch coverage: synthetic phase-A happy-path + phase-A overclaim test (localMcpServer.available:true in phase A should fail)
- `localMcpServer.entry=''` empty-string branch: one test asserting ok===false

---

## Phase 0 — governance prerequisite (next after PR-B2)

### PR-0: ADR-0021 — render-layer visual assets permitted

- No code changes. New ADR + index row + "superseded in part" note on ADR-0002 + reword AGENTS.md + GOLDEN_RULES.md + LEARNINGS entry
- Clears the way for Canva-produced assets in PR-3x

---

## Phase 1 — free wins + test seams

### PR-1a: Durable persist wrapper

- `src/persist.js` upgrades: versioned envelope, injectable validate(), previous-good copy, observable fallback (non-silent)
- QuotaExceededError handling + read-back verify (Safari/iOS private-mode safe)
- Extend `test/persist.test.js`

### PR-1b: Suite-wide determinism gate

- `test:determinism` = vitest run with shuffle + seed
- `test/helpers/configReset.js` — snapshot+restore shared config singletons
- New CI step (observe mode first, then flip blocking in Phase 2)
- Must verify mutation-probe COPY covers new helper file

### PR-1c: ESLint firewall — ban Pixi imports in math/test layer

- `no-restricted-imports` with `patterns: [{group: ['pixi.js','pixi-filters','@pixi/*'], message: '...'}]`
- Scoped to pure-core files only (own `files:` block, don't overlap with render config)
- Extend `test/eslint-footguns.test.js`
- Must be zero-hit at introduction (pure files are already Pixi-free)

### PR-1d: Extract pure UI/format helpers + tests

- `lerpColor` → `src/colorUtils.js`
- `resolveJackpotColor` → `src/uiMath.js`
- `betReadout`/`clampBetIndex` → `src/uiMath.js`
- No Pixi, no new dep. Canary: `getThemeDiagnostics` unchanged.

### PR-1e: Extract reel stop-position/easing math

- `easeOutBack` (dedupe with utils.js), deterministic stop-target/duration, blur-from-speed ramp → `src/reelMath.js`
- Inject `Math.random` jitter. Medium risk (live reel engine).
- Canary: `verify.mjs` planted-win round-trip + spin→evaluate

### PR-1f: Extract particle physics

- `stepParticle(p,dt)` → `src/particleMath.js`
- Low risk (cosmetic only).

### PR-1g: Extract game state-machine decisions

- `nextBalanceBeforeSpin`, `winTier`, `shouldDeferTheme`, `autoChainDecision` → `src/gameState.js`
- Riskiest extraction (touches `main.js` orchestrator).
- Canary: `verify.mjs` spin→win→credit + toggleAuto

### PR-1h: Deepen browser-smoke

- Widen `getThemeDiagnostics()` to expose computed layout/structural values
- Add real money-path assertion: `forceLineWin('seven')` → assert WIN readout == PAYTABLE.seven\*bet
- `forceBonus(7)` → assert balance rose + inBonus cleared
- Playwright screenshots as artifacts only (not asserted)

---

## Phase 2 — CI/tooling

### PR-2: Coverage on render path + phased thresholds + bundle budget + determinism blocking

- Replace global threshold block with per-glob blocks (core at 85/85/80/85; render at ~30/30/20/30 initially)
- `scripts/bundle-budget.mjs` — sum gzipped dist/assets/\*.js, fail over budget
- Flip `test:determinism` from observe to blocking
- Optional ADR-0022 (ratchet/budget policy)

---

## Phase 3 — art polish (after safety net exists)

### PR-3a: Gradient + specular symbol shading

- FillGradient options-object form, layered gloss. Procedural only. Watch generateTexture footgun.

### PR-3b: Multi-stage big-win spectacle

- anticipation → reveal → bursts → count-up → settle
- Consider `src/celebrate.js` extraction

### PR-3c: Animated background

- Parallax procedural bed + upgraded godrays. Respect QUALITY.godrays.

### PR-3d: Bloom / post-processing

- `AdvancedBloomFilter` from `pixi-filters/advanced-bloom`. No new dep. Submodule import required.
- Low headless-WebGL FPS is not a regression.

### PR-3e: Richer synth audio

- Expand `audio.js` layers/envelopes. Keep `audio-mix.test.js` green.
- Sampled audio = out of scope (needs ADR-0021 AV widening).

---

## Tool upgrades

### Vitest 4.1.8 → 4.1.9

Patch bump. Low risk. Also adds: coverage ignore comments, `coverage.changed` for modified-file-only reporting, `page/locator.mark` for Playwright trace integration. Fold into any upcoming PR.

### PixiJS → v8.19.0

Adds GraphicsPath (reusable path sharing across Graphics instances), HTML-in-Canvas textures, Canvas 2D renderer fallback. Review changelog for breaking changes before bumping. Investigate Canvas 2D fallback for headless CI improvement.

### pixi-filters → 6.1.5

Already at 6.1.5. No action needed.

### ESLint v9 → v10.0.0

**URGENT: v9 EOL August 6, 2026.** See URGENT section above.

---

## Canva integration (on tap for Phase 3)

Canva Pro trial (30-day) is available. Use for:

- Symbol art references and mockups
- Shippable render-layer visual assets (transparent PNG, high-res)
- Collateral (landing hero, og:image, brand kit)

**Constraints:** Exports are raster only — NO SVG. Transparent-background PNG requires Pro plan (trial unlocks it). Autofill API is Enterprise-gated (Pro trial does NOT unlock it — use templates manually). Export rate limits: ~75/5min, 500/24h per user. Download URLs expire in 24h.

Any committed asset is render-layer-only — never a test fixture, never imported by math/test layer.
