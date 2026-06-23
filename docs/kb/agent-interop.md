# A2A + MCP agent-interop — crib sheet

> Pinned at: A2A spec `v1.0` · MCP spec `2025-06-18` · MCP SDK `@modelcontextprotocol/sdk ^1.29.0` · Last verified: `2026-06-22` · Maintainer: `claude`

How this repo exposes its deterministic capabilities to agents, and the minimum facts to
consume or extend that surface. Read before touching the Agent Card or the MCP tool-defs.

## What this repo publishes (phase B — static card + a LOCAL stdio MCP server)

- **A2A Agent Card:** `public/.well-known/agent-card.json` → Vite copies it to
  `dist/.well-known/agent-card.json`, served at `<pages-url>/.well-known/agent-card.json`. It
  lists the skills `verify-rtp` and `simulate-rtp`. `capabilities.streaming`,
  `capabilities.pushNotifications`, and `x-lifecycle.liveEndpoint` are all `false` — there is
  still **no live/hosted A2A JSON-RPC endpoint** (that is phase C). `x-lifecycle.localMcpServer`
  marks the stdio server as locally callable (see `docs/adr/0020-local-stdio-mcp-server.md`).
- **MCP tool-defs:** `tools/mcp/tools.json` — static definitions (`verify_rtp`, `simulate_rtp`)
  mapping 1:1 to `src/slotmath.js` exports; the single source of truth the live server reads.
- **Local stdio MCP server (phase B):** `tools/mcp/server.mjs` wraps those exports and is
  runnable via `npm run mcp:serve`. It speaks MCP over **stdio in
  the caller's own process** — no network listener, no auth, no secrets. Point an MCP client
  (e.g. Claude Desktop/IDE) at the command to call `verify_rtp` / `simulate_rtp` live.

## Running / consuming the local MCP server (phase B)

- **Serve:** `npm run mcp:serve` — connects a `StdioServerTransport`; logs readiness to **stderr
  only** (stdout is the JSON-RPC frame — never write to it).
- **Client config example** (Claude Desktop `mcpServers` entry):
  `{ "coins-math": { "command": "node", "args": ["tools/mcp/server.mjs"], "cwd": "<repo>" } }`.
- **`verify_rtp`** — exact theoretical RTP by full payline enumeration (deterministic, <1ms).
  Optional `modelOverrides` (a hypothetical tuning, not the shipped RTP).
- **`simulate_rtp`** — seeded Monte-Carlo of the full game with a 95% CI. `seed` (default 12345),
  `spins` (default 1,000,000, **hard max `MAX_SPINS` = 5,000,000** so a runaway call can't hang
  the stdio loop; the 12M-spin RTP pin is offline-test-only). Optional `modelOverrides`.
- **`modelOverrides` is bounded:** grid size (`reels`/`rows` ≤ 8, integer), symbol count (≤ 32),
  the `symbols^reels` enumeration cost (≤ 2,000,000), and a degenerate weights map are rejected
  with a clean `isError` — a single bad override cannot OOM-crash the caller's process.

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
  used). This discovery card (phase B / v0.2.0) still OMITS `protocolVersion` and
  `supportedInterfaces` because it declares no live interface — both land with the deferred
  phase-C hosted endpoint. MCP (Anthropic) current spec `2025-06-18`. A2A = agent↔agent; MCP = agent↔tools.

- `[claude · 2026-06-22 · VERIFIED]` Phase B keeps the hosted-endpoint signals and the
  local-server signal **orthogonal**: `capabilities.streaming` / `pushNotifications` and
  `x-lifecycle.liveEndpoint` track a HOSTED A2A/MCP-HTTP endpoint (phase C — still `false`); the
  new `x-lifecycle.localMcpServer` (`available`, `transport:"stdio"`, `entry`) tracks the
  in-process stdio server. The validator (`scripts/agent-card-validate.mjs`) enforces both for
  phase A and B, and in phase B requires `localMcpServer.entry` to **exist on disk** (an injected
  `fileExists` keeps the function pure; `main()` passes a real `existsSync`).
- `[claude · 2026-06-22 · VERIFIED]` MCP SDK: use the **v1** production API
  (`@modelcontextprotocol/sdk`: `McpServer` from `server/mcp.js`, `StdioServerTransport`,
  `registerTool` with a raw `ZodRawShape`). The **v2 pre-alpha** (`@modelcontextprotocol/server`,
  `z.object()` shapes) is a different, unstable API — do not mix it in. The stdio transport OWNS
  stdout; log only to stderr or the JSON-RPC framing breaks.

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

- `docs/adr/0019-agent-interop-static-surface.md` (phase A) + `docs/adr/0020-local-stdio-mcp-server.md`
  (phase B), `STATUS.md` (`agent_interop_phase`), `public/.well-known/agent-card.json`,
  `tools/mcp/tools.json`, `tools/mcp/server.mjs` (the stdio server), `scripts/agent-card-validate.mjs`.
- A2A: <https://a2a-protocol.org/latest/specification/> · MCP: <https://modelcontextprotocol.io>
