---
lifecycle: growing
frozen: false
agent_interop_phase: A
maturity: phase-A-static
updated: 2026-06-19
---

# Status — Coins: Hold & Win

**This project is GROWING, not frozen.** It will keep gaining features, governance, and
machine-readable surfaces until it is explicitly marked `frozen: true` in the front-matter
above. Treat anything here as a current snapshot of an in-progress build, not a final release.

This file is the lifecycle source-of-truth referenced by `AGENTS.md` (source-of-truth order
#3).

## Lifecycle

- **lifecycle:** `growing` — actively developed; expect change.
- **frozen:** `false` — no freeze declared.

## Agent-interop (A2A / MCP) — phase A (static)

- **Phase A (current):** a static, machine-readable surface only — an A2A Agent Card and MCP
  tool definitions, as committed files, describing this repo's EXISTING deterministic math
  capabilities (`verify-rtp`, `simulate-rtp`). No server, no live endpoint, no authentication.
  Rolled out across the PRs listed in `docs/adr/0019-agent-interop-static-surface.md`.
- **Phase B (not started):** a live callable endpoint + machine-to-machine auth. Deferred.

The Agent Card therefore advertises **no live, callable endpoint**; a validation gate enforces
that honesty against the `agent_interop_phase` value above.

## Scope (unchanged)

Play-money slot-**math** demo: no real money, accounts, wagering, or AI/LLM runtime. RTP and
statistics are this project's own computed figures, shown for transparency — not certified or
audited (see `DISCLAIMER.md`, ADR-0014).
