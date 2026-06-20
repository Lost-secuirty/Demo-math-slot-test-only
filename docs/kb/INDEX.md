# docs/kb — the machine-to-machine knowledge base

Curated, **version-pinned** crib sheets for the tools this repo uses that sit outside (or past
the cutoff of) an agent's training data, plus per-agent journals. Plain markdown, small files,
one tool per sheet — built for fast agent-to-agent transfer (copy this folder to another repo
and the contract works there too).

Evidence basis (web-verified; see codex-speed-test ADR-0018): docs-in-context lifts
coding-agent performance most for less-common / fast-moving libraries, and _working code
examples_ contribute more than prose (arXiv 2503.15231). So sheets lean on examples and skip
what every model already knows.

## The contract (binds every agent and subagent — see AGENTS.md)

1. **READ before working with a listed tool:** open this INDEX, then ONLY the sheet(s) you
   need (progressive disclosure — don't bulk-load the folder).
2. **WRITE what you verify:** a new gotcha/fix/API fact → append to the matching sheet under
   the right section, tagged `[agent · date · VERIFIED|SECONDARY|MYTH]` (grades in
   `EVIDENCE.md`). Append-only — mark superseded entries `SUPERSEDED:` with a reason; never
   delete another agent's entry.
3. **Your session story goes in `journal/<agent>.md`**, not in the sheets. Sheets hold durable
   tool facts; journals hold what _you_ did, tried, and suspect. Read your OWN journal on
   session start; never edit another agent's journal.
4. **Scope:** kb = the stack (tool facts). Project decisions live in `docs/adr/`, project
   gotchas in `docs/LEARNINGS.md`. When a LEARNINGS entry is really a _tool_ fact, distill it
   here and link back (Working Agreement #9's distillation pass feeds this).

## Catalog

This repo's stack (ADRs 0001–0008): vanilla ES modules + PixiJS v8 + Vite + Vitest +
ESLint/Prettier + Playwright + WebAudio. Sheets are created **as facts are verified** — copy
`TEMPLATE.md`, add the row here, fill from real runs (no fabrication, no importing another
repo's stack sheets).

| Sheet                                | Covers                                               | Pinned at                 |
| ------------------------------------ | ---------------------------------------------------- | ------------------------- |
| [agent-interop.md](agent-interop.md) | A2A Agent Card + MCP tool-defs — this repo's surface | A2A v1.0 / MCP 2025-06-18 |

_More stack sheets created on first verified gotcha (candidates: pixi-8, vite, vitest, eslint, webaudio)._

## Journals

| Agent                                                          | File                                   |
| -------------------------------------------------------------- | -------------------------------------- |
| Claude (Claude Code sessions)                                  | [journal/claude.md](journal/claude.md) |
| (new agent? copy the header convention from journal/README.md) |                                        |

New sheet = copy [TEMPLATE.md](TEMPLATE.md), add a Catalog row here, done.
