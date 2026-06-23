# Lessons Learned — Coins: Hold & Win

Failures, gotchas, non-obvious discoveries. Dates are approximate based on session context.

---

## 2026-06: Shebang in imported module breaks Vite/vitest on Windows

**What happened:** Added `#!/usr/bin/env node` shebang to `tools/mcp/server.mjs` (for Unix `bin` entry-point). The test file `test/mcp-server.test.js` imports `server.mjs`. On Windows, Vite/vitest's transform mis-parses a shebang leading an imported module: `SyntaxError: Invalid or unexpected token`. The file was pure ASCII, `node --check` passed, esbuild transform passed — took a bisect probe to isolate the shebang as the cause.

**Fix:** Remove shebang from `server.mjs` entirely. The `mcp:serve` script and MCP client config both invoke `node` explicitly — shebang wasn't needed for those paths. A shebang-less file can't double as a Unix `bin`, so the `bin` entry in `package.json` was removed too (package is `private: true`, so no publish risk).

**Why it matters:** Any module that is both (a) a runnable Node.js file AND (b) imported by test code cannot have a shebang on Windows with Vite/vitest. The shebang must be removed; use an explicit `node` invocation or a thin wrapper script instead.

---

## 2026-06: GitHub auto-merge disabled in this repo

**What happened:** Ran `gh pr merge 45 --auto` after marking PR ready. Got `GraphQL: Auto merge is not allowed for this repository`.

**Fix:** Monitor CI manually (`Monitor` tool on the check run), then merge once green.

**Why it matters:** Don't plan workflows that depend on auto-merge. Always check CI status before attempting to merge.

---

## 2026-06: Heavy audit fan-out ROI — docs/config = overkill

**What happened:** Ran ~1.18M token deep audit on PR-46 (docs/config/governance changes). Findings: minor doc drift that CodeRabbit already covers. No blockers, no majors.

**Contrast:** The PR-B1 security audit (~1.6M tokens) found a real `modelOverrides` DoS that CodeRabbit missed. The plan/fact verification fan-out (~364K tokens) caught two plan-breaking errors CI structurally can't catch (coverage gate gotcha, Canva SVG/autofill dead-ends).

**Rule:** Lean by default. Heavy fan-out only for: money-path/security/novel logic, AND pre-commitment fact/plan verification. Docs/config → CodeRabbit covers it.

---

## 2026-06: Vitest coverage global thresholds count render files

**What happened:** Plan assumed we could add render files to coverage `include` alongside a global 85/85/80/85 threshold block. Web verification found: Vitest counts glob-matched files toward global thresholds even if they also match a per-glob block. Adding render files to `include` with a high global threshold would fail the core gate (render coverage starts at ~30%).

**Fix:** Drop the single global threshold block. Use per-glob `thresholds` blocks — core globs at 85/85/80/85, render globs starting low (~30/30/20/30) with a documented ratchet.

---

## 2026-06: Canva limitations (verified against actual API docs)

**What happened:** Initial plan assumed SVG export was possible (for crisp vector symbols). Wrong.

**Actual constraints:**

- Exports are raster only: `png/jpg/gif/pdf/pptx/mp4`. No SVG.
- Transparent-background PNG requires a premium/Pro plan. The 30-day trial unlocks it.
- Autofill API (brand-template programmatic fill) is Enterprise-gated. Pro trial does NOT unlock it.
- Export rate limits: ~75/5min, 500/24h per user. Download URLs expire in 24h.

**Implication:** Ship high-res transparent PNG for symbol art (not vectors). Use templates manually (no autofill scripting on Pro).

---

## 2026-06: pixi-filters v6 uses submodule import paths (not v5 scoped packages)

**What happened:** v5 used `@pixi/filter-advanced-bloom` etc. v6 restructured to submodule paths: `import { AdvancedBloomFilter } from 'pixi-filters/advanced-bloom'`.

**Fix:** Use the submodule path. The v5 scoped packages don't exist in v6 — using them causes import errors.

---

## 2026-06: modelOverrides DoS vector — bounds are mandatory

**What happened:** CodeRabbit did not flag that the MCP server's `modelOverrides` allowed callers to pass `{reels: 9}`, which causes `theoreticalRtp()` to enumerate `symbols^9` outcomes — OOM-kills Node.

**Found by:** The PR-B1 security audit.

**Fix:** `boundedModel()` in `server.mjs` validates before compute. Caps: reels ≤ 8, rows ≤ 8, symbols ≤ 32, enumeration ceiling 2,000,000. Also rejects fractional dimensions (would cause infinite recursion in enumeration's base-case check).

**Why it matters:** Every caller-controlled numeric that feeds into an exponential computation needs a guard. Don't trust the MCP schema's integer type alone — Zod will coerce floats to integers, but NaN/Infinity can still slip through.

---

## 2026-06: MCP SDK — v1 API only, not v2 pre-alpha

**What happened:** The SDK is `@modelcontextprotocol/sdk@^1.29.0`. Key API: `McpServer`, `StdioServerTransport`, `registerTool` with raw `ZodRawShape`, `InMemoryTransport.createLinkedPair()`, `Client`.

**Don't mix up with v2 pre-alpha patterns** — the API is different. If you see examples online using different import paths or a differently structured `registerTool` call, verify which version they're for.

---

## 2026-06: Vitest shuffle sequence — seed IS logged on ≥4.1.8

**What happened:** Plan initially stated the seed might not be logged. Web verification: the seed IS logged on Vitest ≥4.1.8. A shuffle-exposed failure reproduces with `--sequence.seed=<logged value>`.

**Also:** `--sequence.shuffle` (bare boolean) shuffles BOTH files AND tests. Config form: `sequence: { shuffle: true, seed: N }` or `{ shuffle: { files: true, tests: true } }`.
