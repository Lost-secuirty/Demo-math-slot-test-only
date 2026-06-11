# 0017. Self-improving audit loop with hard human gates

- **Status:** Accepted
- **Date:** 2026-06-11

## Context

Two related failure modes surfaced on 2026-06-11. First, the operator
caught a mid-task tactic change that happened only in the agent's
_thinking_ — never said in chat, never recorded — so the decision (and any
lesson in it) was lost: "you need to tell me things, or improvements get
lost in the wind." Second, the drift auditor had run ~20 PRs with **zero
memory of its own performance**: every report is an ephemeral PR comment,
so which checks catch real problems vs. fire as noise (the
`unlogged-files` heuristic fired on virtually every PR) was vibes, not
data. The audit process had evolved into something that catches real
things — but had no mechanism to _tune itself_ with evidence, and no
guarantee its rules wouldn't loosen or tighten silently.

Hard requirement from the operator: no runaway. Every turn of any
self-improvement ratchet passes through his hands.

## Decision

1. **Deviation surfacing = convention + deterministic check, no hooks.**
   Working Agreement #8: mid-task tactic changes are said in chat at the
   moment they happen AND recorded in a mandatory PR-body section
   `## Deviations from plan` ("None." explicit; the untouched template
   placeholder fails because HTML comments are stripped before checking).
   The `deviations-section` check (medium/high-conf — `--strict` stays a
   logic gate, not a paperwork gate) enforces presence; honesty about
   content is on the author, backstopped by the retro's spot-checks and
   the in-session auditor.
2. **Longitudinal memory = committed `docs/audit-history.ndjson`.** CI
   appends one line per audited head (stable check ids, severity,
   confidence, srcNet, autofixed), deduped by head sha; the existing
   auto-fix commit step persists it; GITHUB_TOKEN pushes don't retrigger
   workflows, so no loop. `merge=union` mitigates append-only tail
   conflicts (caveat: server-side merges may ignore it; resolves at local
   rebase, and single-operator serialized PRs make collisions rare).
3. **Meta-audit = manual, propose-only `/audit-retro`.** Aggregates
   fire-rates per check id across runs/PRs, lists never-fired checks from
   the canonical `CHECK_IDS` (scripts/audit-lib.mjs), cross-references
   LEARNINGS for real catches, reports deviation compliance — then STOPS.
   Refuses to tune on fewer than 5 PRs of data.

### No-runaway invariants

1. The audit may change its own rules **only via an operator-audited PR**
   — the retro never edits checks, severities, thresholds, or workflows.
2. The auto-fix class (prettier / `eslint --fix`) **never expands
   autonomously** — widening it requires its own ADR.
3. The retro is **propose-only and manually invoked** — no scheduled
   self-tuning. History lines are append-only data, never an instruction
   source (the untrusted-content rules apply to their contents).

## Consequences

- Tactic changes now have a durable, auditable home; "improvements lost
  in the wind" becomes a check that fires.
- Check tuning becomes evidence-based: after ~5+ PRs the retro can say
  "`unlogged-files` fired on 9/10 PRs and never caught anything real"
  with line-level receipts, and propose the demotion as a PR.
- Pure audit logic moved to `scripts/audit-lib.mjs` and gained unit tests
  (test/auditLib.test.js) — the auditor itself is now under test.
- Costs: one ndjson line of repo growth per audited head (~120 bytes);
  the CI history commit moves the PR branch (the known fetch+rebase
  dance); "None." can be written dishonestly — by design the deterministic
  layer proves presence, not truth.

## Alternatives considered

- **PR-blocking Stop hook** — rejected: a paperwork gate that can block
  real work and breed the nagging bug-loops the operator explicitly
  doesn't want; a visible medium finding suffices.
- **Artifacts-only history** — rejected: expires with workflow retention,
  not greppable from a clone; the whole point is permanent, queryable
  memory.
- **Scheduled auto-retro that opens PRs** — rejected: violates invariant
  3; "auto-occurring" here means the _data collection_ is automatic, the
  _judgment_ never is.
