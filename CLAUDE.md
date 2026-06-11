# CLAUDE.md

Auto-loaded for Claude Code. **Read [`AGENTS.md`](AGENTS.md) first — it is the
canonical contract** (commands, structure, code style, boundaries, git workflow,
and the Working Agreement). For the distilled version, skim
[`GOLDEN_RULES.md`](GOLDEN_RULES.md). This file adds only the Claude-specific bits.

## Subagent directive (mandatory)

Whenever the Agent tool is used for this repo, the agent's prompt MUST tell it to
**read `AGENTS.md` and `docs/LEARNINGS.md` first, follow the Working Agreement,
and append anything it learns to `docs/LEARNINGS.md`.** Prefer the predefined
roles in `.claude/agents/` (auditor, explorer, planner). Keeping prompts short is
fine — but agents must be able to learn and document.

## PR drift audit

Every PR is audited for **drift** — divergence between what was logged (commits,
PR body, `docs/LEARNINGS.md` — the externalized "world state") and what the diff
actually did. Two free auditors (full design in `docs/DRIFT-AUDIT.md`):

- **CI** (`.github/workflows/audit.yml`): runs `scripts/audit-drift.mjs` on every
  PR, posts a report comment, applies safe auto-fixes. No API key — uses the
  built-in `GITHUB_TOKEN`.
- **In-session:** when watching a PR, spawn the **auditor subagent**
  (`.claude/agents/auditor.md`); it runs `node scripts/audit-drift.mjs
--run-checks`, reconciles claims vs the code's _meaning_, posts the report,
  applies only safe auto-fixes, and appends the outcome to `docs/LEARNINGS.md`.

## Per-PR audit gate (set 2026-06-11 — Scott's rule, every PR)

Every PR gets a joint stop-and-audit, in this order — **never self-initiated**:

1. **Work done → draft PR up → STOP.** No merging, no deep-audit pass, no
   "while I'm here" additions. Scott reviews first.
2. **Scott says "audit"** → only then run the deep review pass (the PR #18/#19
   format): hunt for what the green checks DON'T prove — uncovered seams,
   stale claims, coverage gaps — and report findings + learnings + remaining
   gaps, ranked. **Report only; don't fix yet.**
3. **Scott picks what to fold in** (e.g. "fold into the PR"), re-audits, and
   makes the merge call per the existing per-PR merge ask.

The CI drift audit stays automatic; this gate governs the in-session deep
audit. It exists because the #18 audit pause caught a payout-load-bearing
seam with zero executable coverage — the stop is the point.

## Environment notes

- Ephemeral remote container — commit & push to persist (a Stop hook enforces a
  clean, pushed tree at the end of every turn).
- A SessionStart hook (`.claude/hooks/session-start.sh`) installs deps + the
  Playwright browser on web sessions. Registered in `.claude/settings.json`,
  which also allowlists routine build/test/git commands so auto mode flows.
- In-app debug panel: append `?debug=1` or press the backtick key (force
  WIN/BIG/MEGA/EPIC/BONUS, live sliders, theme switcher, FPS meter).
