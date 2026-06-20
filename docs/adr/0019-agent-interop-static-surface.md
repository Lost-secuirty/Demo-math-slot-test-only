# 0019. Static agent-interop surface (A2A Agent Card + MCP tool-defs)

- **Status:** Accepted
- **Date:** 2026-06-19

## Context

This repo computes and verifies slot-math facts deterministically — theoretical and
Monte-Carlo RTP, RNG statistics (ADR-0010, ADR-0011, ADR-0013). Those facts are reachable
today only by reading the source or running the tests. The cross-repo governance rollout is
adding a machine-readable way for AI agents and other tools to **discover** (and, later,
call) those deterministic capabilities, using two open standards:

- **A2A** (Agent2Agent, Linux Foundation): a static **Agent Card** at
  `/.well-known/agent-card.json` advertising what a service can do.
- **MCP** (Model Context Protocol): tool definitions describing callable functions.

"M2M" across this family of repos means the machine-to-machine **knowledge base** (ADR-0018)
— machine _readability_, not authentication. This surface is the same spirit: it makes the
repo's existing capabilities legible to machines that work in it.

## Decision

Expose a **static, no-runtime** agent-interop surface, in phases:

- **Phase A (this ADR + follow-up PRs):** ship STATIC artifacts only — an A2A Agent Card and
  MCP tool definitions as committed files describing this repo's EXISTING deterministic math
  capabilities (`verify-rtp`, `simulate-rtp`), plus a `docs/kb/agent-interop.md` discovery
  sheet. No server, no live endpoint, therefore no authentication surface.
- **Phase B (deferred, NOT decided here):** a live JSON-RPC (A2A) / Streamable-HTTP (MCP)
  endpoint would require machine-to-machine **auth** (OAuth2 client-credentials / OIDC),
  rate-limiting, and an expanded threat model. Out of scope until separately decided.

Honesty rules (extend ADR-0014, factual-wording policy):

- The Agent Card's `url` must NOT advertise a live, callable endpoint while Phase A holds; its
  `capabilities` are `{ streaming: false, pushNotifications: false }`. A validation gate
  (follow-up PR) fails the build if the card overclaims a live transport while `STATUS.md`
  records `agent_interop_phase: A`.
- The card describes the _capability_ ("compute RTP by enumeration / Monte-Carlo"); the actual
  numbers stay in `docs/PAR-SHEET.md` and `test/rtp-target.test.js` (the load-bearing RTP
  pin), never duplicated into the card where they could drift.

Scope boundary: the surface advertises play-money **math / verification** only — never real
money, accounts, wagering, or an AI/LLM runtime. The card is published facts, not a model.

## Consequences

- Easier: agents and tooling can discover what this repo deterministically proves without
  reading the source. The surface is just files, frozen by the `control-policy.json`
  `required_files` list + branch protection — no new runtime to attack.
- Harder / cost: a new validation gate and its teeth test must stay honest — a stale or
  overclaiming card is a build failure / drift finding. Static-card spoofing, MCP
  tool-poisoning, and rug-pull risks are mitigated by the card being static, version-pinned,
  and required — there is no live tool def to swap at runtime in Phase A.
- Rolled out across PRs: **D1** (this ADR + `STATUS.md`), **D2** (Agent Card + MCP tool-defs +
  kb sheet), **D3** (validator + teeth test + `control-policy.json` registration).

## Alternatives considered

- **A live MCP/A2A server now** — why not: a callable endpoint pulls in auth, rate-limiting,
  and a much larger threat surface for a growing demo; the static card delivers discovery with
  zero runtime risk. Deferred to Phase B.
- **No agent surface** — why not: the cross-repo direction is machine-readability (agents work
  in these repos); leaving the capabilities source-only is the gap this closes.
- **Put the interop sheet under `docs/`, not `docs/kb/`** — kb is the stack (ADR-0018); A2A and
  MCP are external protocols this repo speaks, so a kb crib sheet fits, with the _decision_
  recorded here.
