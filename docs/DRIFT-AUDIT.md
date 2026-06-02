# PR Drift Audit

**Drift** = the gap between what the agents _said/logged_ they did and what the
diff _actually_ did — plus any violation of the `CLAUDE.md` Working Agreement.

The logged intent (commit messages, PR body, `docs/LEARNINGS.md`, the plan
file) is our externalized **"world state"** — durable truth that lives outside
any chat. The auditor reconciles that world state against the real `git diff`.

## Two auditors (both free, no API key)

|          | In-session auditor                   | CI auditor (`.github/workflows/audit.yml`) |
| -------- | ------------------------------------ | ------------------------------------------ |
| Runs     | when a session is watching the PR    | on every `pull_request`, always-on         |
| Engine   | Claude (this session) — semantic     | `scripts/audit-drift.mjs` — deterministic  |
| Cost     | none (runs on the session)           | none (built-in `GITHUB_TOKEN`)             |
| Strength | claim-vs-code _meaning_, transcripts | mechanical rules, never sleeps             |

The deterministic script catches ~90% of drift mechanically; the in-session
pass adds semantic "does this claim match the code's meaning" judgement.

## What it flags

- **Rule violations:** added `eslint-disable`, skipped/`.only` tests, new
  `TODO/HACK`, stray `console.log`/`debugger` in `src/`.
- **Sensitive paths:** `.github/`, `.claude/`, `package.json`, `vite.config.js`.
- **Code bloat / complexity:** deep nesting added (src lines indented past ~8
  levels) and large net `src/` growth with no test change — a deterministic,
  language-agnostic proxy for the cyclomatic/cognitive-complexity gate (full
  AST version: testing-kits `core/complexity`). The report always prints the
  `src/` net line delta so bloat is visible at a glance.
- **Documentation drift:** `src/` changed but `docs/LEARNINGS.md` not updated.
- **Unlogged changes:** files not named in any commit message or PR body.
- **Scope creep / phantom claims** (semantic, in-session).
- **Build/lint health** in CI.

## Auto-fix policy (report + auto-fix the clear ones)

Auto-fix is limited to **safe, reversible** changes: `prettier --write` and
`eslint --fix`. Logic-affecting smells (debug statements, suppressions, skipped
tests) are **report-only** so the auditor never drifts the code itself.

## Flow

```mermaid
flowchart TD
    A[PR opened / updated] --> B[Auditor triggered]
    B --> C[Ground truth: git diff base...head]
    B --> D[World state: commits · PR body · docs/LEARNINGS.md · plan]
    C --> E[Reconcile claims vs diff]
    D --> E
    E --> F[Rule checks vs CLAUDE.md]
    E --> G[Coverage: unlogged files · scope creep · phantom claims]
    E --> H[Sensitive paths · build/lint health]
    F --> I[Score: severity + confidence + evidence]
    G --> I
    H --> I
    I --> J{Clear, safe fix?}
    J -- yes --> K[Auto-fix: prettier / eslint --fix, commit 'audit:']
    J -- no --> L[Report only]
    K --> M[Post drift report comment on PR]
    L --> M
    M --> N[Owner decides · append outcome to docs/LEARNINGS.md]
```

## Run it manually

```bash
node scripts/audit-drift.mjs --base origin/main --head HEAD      # report only
node scripts/audit-drift.mjs --fix --run-checks                  # + safe fixes + build/lint
```
