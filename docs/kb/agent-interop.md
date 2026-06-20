# A2A + MCP agent-interop — crib sheet

> Pinned at: A2A spec `v1.0` · MCP spec `2025-06-18` · Last verified: `2026-06-19` · Maintainer: `claude`

How this repo exposes its deterministic capabilities to agents, and the minimum facts to
consume or extend that surface. Read before touching the Agent Card or the MCP tool-defs.

## What this repo publishes (phase A — static, no live endpoint)

- **A2A Agent Card:** `public/.well-known/agent-card.json` → Vite copies it to
  `dist/.well-known/agent-card.json`, served at `<pages-url>/.well-known/agent-card.json`. It
  lists the skills `verify-rtp` and `simulate-rtp`. `capabilities.streaming` is `false` and
  `x-lifecycle.liveEndpoint` is `false` — there is **no live A2A JSON-RPC endpoint** yet
  (phase A; see `docs/adr/0019-agent-interop-static-surface.md` and `STATUS.md`).
- **MCP tool-defs:** `tools/mcp/tools.json` — static definitions (`verify_rtp`, `simulate_rtp`)
  mapping 1:1 to `src/slotmath.js` exports. No running MCP server in phase A.

## Gotchas / facts

- `[claude · 2026-06-19 · VERIFIED]` A2A Agent Card REQUIRED top-level fields are exactly
  `name`, `description`, `version`, `url`, `skills`; each `AgentSkill` requires `id`
  (kebab-case), `name`, `description` (verified against the A2A spec + the StackA2A field
  reference).
- `[claude · 2026-06-19 · VERIFIED]` A2A `url` means the JSON-RPC endpoint (where a client
  POSTs `message/send`), NOT the card's discovery location — so a static card with no server
  must signal no-live-endpoint (`capabilities.streaming=false` + `x-lifecycle.liveEndpoint=false`)
  to avoid overclaiming a callable server.
- `[claude · 2026-06-19 · VERIFIED]` GitHub Pages serves this project under the subpath
  `/Demo-math-slot-test-only/`, so the card sits at `<pages>/Demo-math-slot-test-only/.well-known/agent-card.json`,
  not the domain root — canonical RFC 8615 root discovery would need a custom domain (deferred).
- `[claude · 2026-06-19 · VERIFIED]` A2A spec **v1.0 REMOVED the top-level `protocolVersion`**
  field (CodeRabbit web-check + a2a-protocol.org/latest/whats-new-v1): it moved into
  `supportedInterfaces[].protocolVersion` as `Major.Minor` (e.g. `"1.0"`; patch versions are not
  used). This phase-A discovery card targets v1.0 but OMITS `protocolVersion` and
  `supportedInterfaces` because it declares no live interface yet — both land with a phase-B
  endpoint. MCP (Anthropic) current spec `2025-06-18`. A2A = agent↔agent; MCP = agent↔tools.

## Minimal examples

```json
{
  "name": "x",
  "description": "y",
  "version": "1.0.0",
  "url": "https://x.example",
  "skills": [{ "id": "do-thing", "name": "Do", "description": "does the thing" }]
}
```

## See also

- `docs/adr/0019-agent-interop-static-surface.md` (the decision), `STATUS.md`
  (`agent_interop_phase`), `public/.well-known/agent-card.json`, `tools/mcp/tools.json`.
- A2A: <https://a2a-protocol.org/latest/specification/> · MCP: <https://modelcontextprotocol.io>
