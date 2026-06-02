# Agent Scaffolding — what, why, and how

A learning reference for setting up a repo that AI coding agents can work in
**reliably**. Captures the principles behind this repo's setup so future
projects can reuse them. (Companion to `docs/DRIFT-AUDIT.md` and `docs/adr/`.)

## The five principles

1. **Lean, path-scoped instruction files.** The main contract (`AGENTS.md` /
   `CLAUDE.md`) should be short — every line must change agent behavior or it's
   noise. Split into sub-docs when a file grows past ~150–200 lines.
2. **Externalize intent ("world state").** Durable truth lives outside the chat:
   the **spec** (`docs/SPEC.md` — what), **ADRs** (`docs/adr/` — why), and the
   **memory log** (`docs/LEARNINGS.md` — gotchas). Agents and audits reconcile
   against these, not against a vanishing conversation.
3. **Formalize repeatable roles & workflows as files**, not prose: subagents
   (`.claude/agents/`) and commands (`.claude/commands/`) are reproducible;
   a paragraph in CLAUDE.md is not.
4. **Mechanical enforcement → hooks/CI; judgement → the contract.** Formatting,
   guards, and gates belong in hooks and CI. Taste and trade-offs belong in
   AGENTS.md.
5. **Test the deterministic core.** Golden/regression tests on the pure logic
   are how you trust an agent's diff. Render/IO gets a smoke test.

## The layers (and where they live here)

| Layer        | Purpose                 | In this repo                                     |
| ------------ | ----------------------- | ------------------------------------------------ |
| Contract     | how the project works   | `AGENTS.md` (canonical), `CLAUDE.md` (Claude)    |
| Spec         | what is built           | `docs/SPEC.md`                                   |
| Decisions    | why choices were made   | `docs/adr/`                                      |
| Memory       | gotchas & workarounds   | `docs/LEARNINGS.md`                              |
| Roles        | reusable subagents      | `.claude/agents/`                                |
| Workflows    | reusable commands       | `.claude/commands/`                              |
| Enforcement  | format, guard, deps     | `.claude/hooks/`, `.claude/settings.json`        |
| Verification | unit + e2e + drift      | `test/`, `verify.mjs`, `scripts/audit-drift.mjs` |
| CI/CD        | gates & delivery        | `.github/workflows/`                             |
| Governance   | PRs, ownership, license | `.github/`, `CONTRIBUTING.md`, `LICENSE`         |

## Gap analysis (snapshot — what this repo added and why)

- **Tests / eval harness (Vitest)** — was missing entirely; the backbone of
  "trust the diff." Pure logic only; render is smoke-tested. → ADR-0008.
- **AGENTS.md + boundaries/code-style/git sections** — portability + fewer risky
  edits + less drift. → ADR-0009.
- **Subagents & commands as files** — turn prose into reproducible harness.
- **Hooks for format/guard** — enforce mechanically, not by reminding the agent.
- **ADRs + SPEC** — the durable "why/what" for future maintainers (and agents).
- **Governance** — PR template (feeds the drift auditor structured "claims"),
  CONTRIBUTING, LICENSE, CODEOWNERS, a CI gate, Dependabot.

## Deliberately NOT added (avoid over-scaffolding)

Heavyweight multi-agent frameworks (e.g. BMAD), unused MCP servers, and large
eval datasets — valuable to know, overkill for a demo of this size. Add scaffolding
when a real pain justifies it, not preemptively.

## Upgrade policy — when a change is worth shipping

Avoid token-for-token-negative "upgrades." Before adding/changing agent
machinery, it must clear this bar:

- **Fixes a failure _class_ or moves a reliability _tier_** (e.g. 60%→90%), not a
  few % within the same tier. Why tiers matter: errors compound — at 99%/step a
  50-step task ≈ 60% success; at 95% ≈ 8%. Marginal per-step gains are huge
  _across_ tiers, negligible _within_ one.
- **Measured by a _repeatable_ check** — run it N times (pass^k / consistency),
  not a single lucky pass@1.
- **ROI-positive on tokens.** Reject changes that add large token/context for
  sub-tier gains (the "+40% tokens for +1%" anti-pattern). Remember the paradox:
  trimming bloated context usually improves quality _and_ cost at once — value
  often means _fewer_ tokens, not more.
- **One mechanism per job.** Don't add a second tool that does what an existing
  one already covers.

## Professional logging & observability flow (what / when / where)

Where mature agent repos record information, by layer:

| Layer                 | Records                                     | Where                                                  | Here                                       |
| --------------------- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| Contract              | how to work in the repo                     | `AGENTS.md` / `CLAUDE.md` (big repos nest one per dir) | ✅                                         |
| Decisions (why)       | architectural choices                       | `docs/adr/`                                            | ✅                                         |
| Spec (what)           | product behavior                            | `docs/SPEC.md`                                         | ✅                                         |
| Memory                | gotchas / workarounds                       | `docs/LEARNINGS.md`                                    | ✅                                         |
| Change history        | user-facing changes                         | `CHANGELOG.md`                                         | ✅                                         |
| Per-run observability | tool calls, ok/fail, tokens, cost, duration | structured logs / **OpenTelemetry** traces             | ~ (local JSONL via `.claude/hooks/log.sh`) |
| Safety / loop control | iteration caps, doom-loop detection         | the harness                                            | partial (Stop hook)                        |

**Per-run observability** is the layer most teams add as they scale: hook events

- tool calls as **OTel traces** (tools: `claude-code-otel`, `claude_telemetry`),
  where subagent spans nest under the parent's Task span, exported to a backend
  (SigNoz / Honeycomb / Datadog). That's heavyweight (needs infra). Our
  `.claude/hooks/log.sh` is the cheap stand-in: it appends `{ts, tool, ok}` per
  tool call to a gitignored `.claude/logs/events.jsonl` — enough to _see_ the flow
  without a backend. (Note: per-call **duration** isn't in the PostToolUse payload,
  so we log ok/tool/ts, not ms — full timing needs OTel.)

**Doom-loop detection** (fingerprint `(tool, result)`, stop after ~3 identical)
and **iteration/token caps** are mostly the harness's job — known patterns,
intentionally not rebuilt here.

## Sources

- [AGENTS.md standard](https://agents.md/) · [GitHub: lessons from 2,500 repos](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [Claude Code advanced best practices](https://smartscope.blog/en/generative-ai/claude/claude-code-best-practices-advanced-2026/)
- [Spec-driven development](https://www.augmentcode.com/guides/what-is-spec-driven-development) · [ADR vs spec](https://ceaksan.com/en/adr-openspec-decision-spec-management)
- [CI/CD for evals & regression tests](https://www.kinde.com/learn/ai-for-software-engineering/ai-devops/ci-cd-for-evals-running-prompt-and-agent-regression-tests-in-github-actions/)
