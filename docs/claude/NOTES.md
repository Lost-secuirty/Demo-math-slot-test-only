# Claude's Notes — Coins: Hold & Win

Braindump, architecture understanding, open questions, suggestions. Not a PR description or planning doc — raw working notes.

---

## Current architecture understanding (June 2026)

Two-layer firewall:

- **Math/test layer**: `src/slotmath.js`, `src/wins.js`, `src/outcome.js`, `src/reelWindow.js`, `src/utils.js`, `src/persist.js`, `src/features/**`, all `test/` files. Pure JS, no Pixi, no binary assets. Lint-enforced (once ADR-0021 + PR-1c land).
- **Render layer**: everything that imports `pixi.js`. This is where PixiJS, pixi-filters, audio, and (post ADR-0021) visual assets live.

The MCP server (`tools/mcp/server.mjs`) is phase B — a local stdio server wrapping the math layer. The agent card (`public/.well-known/agent-card.json`) is phase B / v0.2.0. Phase C (hosted A2A/MCP-HTTP) is not started.

The `AGENTS.md` file is canonical (CLAUDE.md and GOLDEN_RULES.md point to it). Always read `AGENTS.md` first in a fresh session.

---

## Architecture ideas / suggestions

### GraphicsPath (PixiJS v8.19)

PixiJS v8.19 added `GraphicsPath` — a reusable path object that can be shared across multiple Graphics instances. This could be useful for symbol drawing: define each symbol's path once, reuse across all instances. Would improve consistency and potentially performance in `symbols.js`. Worth exploring when we upgrade PixiJS (backlogged).

### Canvas 2D renderer fallback for headless CI

PixiJS v8.16+ has a Canvas 2D renderer fallback. This could let Playwright browser-smoke tests run in headless CI without needing software-WebGL. Currently the smoke job needs hardware acceleration flags. Investigate if this removes the need for those flags. Low priority but interesting.

### Playwright Vision mode

Playwright now has a "vision mode" that handles canvas/WebGL elements (previously unparseable DOM). Could improve the browser-smoke tests — instead of checking CSS values and debug-API outputs, vision mode might be able to validate visual correctness more directly. Investigate before PR-1h (deepen browser-smoke).

### Config singletons leakage in test shuffle

The `test:determinism` gate (PR-1b) will expose that some tests mutate the shared `SPIN/QUALITY/BIGWIN/ECONOMY/SYMBOL_WEIGHTS/BONUS/UNEASE/TIME/COLORS` singletons without restoring them. The fix pattern (snapshot+restore via `setupFiles`) is already specced — but the tricky part is making sure `mutation-probe.mjs` still copies the helper into the probe's isolated dir. Don't forget that.

### ESLint v10 — flat config only, no migration tool for some patterns

ESLint v10 dropped `eslintrc` entirely (v9 EOL August 6, 2026). We're already on flat config so this isn't a big lift. But there may be subtle API changes in how `no-restricted-imports` patterns work. Check the migration guide carefully, especially for the `patterns` form we're using in the Pixi firewall rule (PR-1c).

---

## Open questions

1. What PixiJS version is currently in `package.json`? (v8.7 is my estimate, need to check.) Relevant for planning the GraphicsPath upgrade.
2. Does `lostsouls-game` use the same repo structure / toolchain, or is it independent? (Read-only per the org memory — don't touch it.)
3. Is the Python slot machine (`slot-machine`) still active, or is it parked? The toolkit was set up 2026-05-29 but hasn't appeared in recent work.
4. What's the Node.js version pinned for this project? Need to know for ESLint v10 compat.
