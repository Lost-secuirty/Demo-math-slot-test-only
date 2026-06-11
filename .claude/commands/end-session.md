---
description: End-of-session sweep — check state + drift, surface every open question for the operator to resolve, act on their calls, then go read-only and write a chat-only diary. Usage: /end-session
allowed-tools: Bash(git status:*), Bash(git fetch:*), Bash(git log:*), Bash(git branch:*), Bash(git diff:*), Bash(git rev-list:*), Bash(git for-each-ref:*), Bash(npm run lint:*), Bash(npm test:*), Bash(npm run mutation:*), Bash(npm run build:*), Bash(npm run test:proof:*), Read, Grep, Glob
---

Run the end-of-session protocol. This is a STOP-AND-RECONCILE ritual, not a
ship command — never self-initiate it; only run it when the operator says
"end session" / `/end-session`.

## 1. Check state of everything + drift sweep

- Open PRs and their **CI conclusions on the real code commit** (bot
  `audit:` commits don't retrigger CI — check the last code commit, and
  always check `npm run mutation`, not just `npm test`; CI gates on it).
- Working branch vs `main`; orphaned/unmerged branches (`git for-each-ref`
  - ahead/behind vs `main`); uncommitted work; any STATUS/docs open loops.
- A drift pass: stale claims, wrong numbers, source-of-truth conflicts,
  evidence-level overclaims (e.g. "CI green" claimed off a local run).

## 2. Close every open question — blocking AND non-blocking

"Close" does NOT mean merge or close PRs. It means **resolve every dangling
question by ASKING the operator** (use `AskUserQuestion`), so nothing is left
as a silent todo. The operator usually wants everything closed with no todos
remaining. If something genuinely can't be resolved, state why.

## 3. List it all for the operator to audit

One scannable list — PRs (state + CI), branches, open loops, drift findings,
anything pending. **Surface, don't decide.**

## 4. Do whatever the operator says

They review and direct (merge / close / fix / leave); act on their calls.
**The per-PR merge ask-gate always applies — never merge without their
explicit OK on that specific PR.** Branches/work that aren't from this session
are surfaced, never touched without their say-so.

## 5. Only AFTER the final push/merge, switch to READ-ONLY

No more repo writes/commits/pushes. Then write the session **diary in chat
only** — never a committed `JOURNAL.md` / `*handoff*.md` file (the operator
logs their own thoughts; persistence is the repo + PRs, not a handoff doc).
