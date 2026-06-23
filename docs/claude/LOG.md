# Session Log — Coins: Hold & Win

What was actually done, session by session. Most recent first.

---

## 2026-06-23 — Memory overhaul + decision docs + Claude workspace

**Started mid-session (context carried from prior session).**

Pending work coming in: PR-B2 fold-ins (3 doc fixes + 2 missing tests) still not applied — was in the middle of them when context reset.

**Done this session:**

- Answered: "Instructions for Claude" in the Claude desktop Settings applies to claude.ai chat only, NOT Claude Code CLI (use CLAUDE.md for that)
- Overhauled stale memory files:
  - `feedback-scott-interaction-style.md` — removed one-question-max (stale), updated voice-to-text framing, added no-personal-in-code rule
  - `user-scott.md` — removed heavy clinical career framing, added no-personal-in-code except lostsouls-game
  - `reference-drive-handoff-protocol.md` — marked handoff chain INACTIVE; Drive is now research/personal logs only
  - `project-slot-machine-relocation-toolkit.md` — clarified this is the Python project, separate from the JS project
  - `project-lost-secuirty-org-repos.md` — major expansion: full JS project toolkit, scripts, architecture layers, current branch state, per-PR protocol
  - Added `reference-claude-workspace.md` — pointer to docs/claude/ and docs/decisions/
- Created `docs/decisions/` directory with:
  - `README.md` — ADR vs decision-log distinction
  - `audio.md` — seeded with current audio design decisions
  - `graphics.md` — seeded with PixiJS v8, pixi-filters, gradient, texture, regression approach decisions
  - `gameplay.md` — seeded with RTP pin (immutable), grid, bonus, bet, balance, win-tier decisions
- Created `docs/claude/` directory with:
  - `NOTES.md` — braindump, architecture understanding, open questions, improvement ideas
  - `BACKLOG.md` — prioritized backlog including URGENT ESLint v9→v10 (EOL August 6, 2026)
  - `LESSONS.md` — 7 lessons from June 2026 work (shebang Windows gotcha, audit ROI, coverage threshold gotcha, Canva limits, pixi-filters paths, DoS guard, MCP v1 API)
  - `LOG.md` — this file
- Updated MEMORY.md index

**Still pending (from before this session):**

- PR-B2 fold-ins: 3 doc fixes + 2 missing tests — not yet applied to files
- PR-B2 CI needs to be green → then Scott merges
- After PR-B2: PR-0 (ADR-0021)

---

## 2026-06-22 — PR-B2 audit + fold-in decisions

- Ran deep audit on PR #46 (feat/phase-b-flip) — ~1.18M tokens, 25 agents
- Findings: no blockers, no majors. Minor doc drift (3 stale phase-A references, shebang/bin inconsistency, 2 missing test branches)
- Scott chose to fold in all 3 finding sets before merging
- Saved audit calibration policy to memory: lean by default; heavy only for money-path/security/novel + fact verification
- Started reading files for fold-ins — all reads completed, no edits made before context filled

---

## 2026-06-22 — PR-B1 merge + PR-B2 open

- PR #45 (PR-B1: stdio MCP server) merged after CI green
- Shebang removed from server.mjs (Windows Vite/vitest footgun — blocked CI)
- PR #46 (PR-B2: phase B flip) opened as draft on feat/phase-b-flip
- Changes: STATUS A→B, honest agent card (v0.2.0, phase B), gate teeth generalized for both phases, ADR-0020, docs update (agent-interop.md)

---

## 2026-06 — Chapter plan verified + finalized

- Web-searched all major plan claims (10 claims, 7 confirmed, 3 corrected)
- Corrections: Vitest shuffle IS logged; Vitest uses test.projects not workspace; Canva no SVG, no autofill on Pro
- Coverage gotcha found: per-glob thresholds required (not global block)
- Plan written to `.claude/plans/i-want-to-plan-happy-volcano.md`
- Scott selected 3 tracks: render-path testing, art polish, CI/tooling

---

## 2026-06 — PR-B1 build + gate

- Built stdio MCP server (`tools/mcp/server.mjs`) with boundedModel(), finalize(), toolResult()
- 13 integration tests in `test/mcp-server.test.js`
- Gate green (after shebang fix)
- PR #45 opened as draft → marked ready → merged
