#!/usr/bin/env node
// =====================================================================
// tools/mcp/server.mjs — Phase B (ADR-0020): a local, runnable stdio MCP
// server that makes this repo's deterministic slot-math callable by an MCP
// client (Claude Desktop/IDE). It runs in the CALLER's own process over
// stdio — NO network listener, NO auth, NO secrets. A hosted/public endpoint
// (A2A or MCP-HTTP) is deferred to phase C (see ADR-0019 / ADR-0020).
//
// Tool names/titles/descriptions are sourced from the static contract
// `tools/mcp/tools.json` so the live server and the published tool-defs can
// never drift. The compute is the existing pure math in `src/slotmath.js`;
// this file only wraps it.
// =====================================================================
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildModel, theoreticalRtp, monteCarloFullGame } from '../../src/slotmath.js';

const here = dirname(fileURLToPath(import.meta.url));
const DEFS = JSON.parse(readFileSync(join(here, 'tools.json'), 'utf8'));
const defOf = (name) => DEFS.tools.find((t) => t.name === name) ?? {};

// Guard a runaway LOCAL call: simulate_rtp at huge spin counts would block the
// single-threaded stdio loop. 1M ≈ 1s, 5M ≈ ~5s; the 12M-spin RTP pin is
// offline-test-only and never exercised through this interactive surface.
export const MAX_SPINS = 5_000_000;

// Build a Zod output shape from a tool-def's JSON-Schema so tools/list
// advertises the SAME output contract as the static tools.json (no drift).
function outputShape(name) {
  const schema = defOf(name).outputSchema ?? {};
  const required = new Set(schema.required ?? []);
  const shape = {};
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    let t;
    if (prop.type === 'integer') t = z.number().int();
    else if (prop.type === 'number') t = z.number();
    else if (prop.type === 'object') t = z.object({}).passthrough();
    else t = z.any();
    shape[key] = required.has(key) ? t : t.optional();
  }
  return shape;
}

const modelOverrides = z
  .object({})
  .passthrough()
  .optional()
  .describe(
    'Optional partial model overrides merged via buildModel(). Computes a HYPOTHETICAL tuning, not the shipped game RTP.',
  );

export function createServer() {
  const server = new McpServer({ name: 'coins-hold-and-win-math', version: '0.2.0' });

  // verify_rtp -> exact theoretical RTP by full payline enumeration (deterministic, <1ms).
  server.registerTool(
    'verify_rtp',
    {
      title: defOf('verify_rtp').title,
      description: defOf('verify_rtp').description,
      inputSchema: { modelOverrides },
      outputSchema: outputShape('verify_rtp'),
    },
    async ({ modelOverrides: overrides }) => {
      const out = theoreticalRtp(buildModel(overrides ?? {}));
      return { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out };
    },
  );

  // simulate_rtp -> seeded Monte-Carlo of the full game (lines + Hold & Win), with 95% CI.
  server.registerTool(
    'simulate_rtp',
    {
      title: defOf('simulate_rtp').title,
      description: defOf('simulate_rtp').description,
      inputSchema: {
        seed: z
          .number()
          .int()
          .default(12345)
          .describe('RNG seed (mulberry32). The same seed yields an identical result.'),
        spins: z
          .number()
          .int()
          .min(1)
          .max(MAX_SPINS)
          .default(1_000_000)
          .describe(`Number of simulated spins (1..${MAX_SPINS}).`),
        modelOverrides,
      },
      outputSchema: outputShape('simulate_rtp'),
    },
    async ({ seed, spins, modelOverrides: overrides }) => {
      const out = monteCarloFullGame(buildModel(overrides ?? {}), { seed, spins });
      return { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out };
    },
  );

  return server;
}

// Stand up the stdio transport only when run directly (not when imported by
// the in-memory integration test). stdout is owned by the transport — log to
// stderr only, never stdout, or the JSON-RPC framing breaks.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const server = createServer();
  await server.connect(new StdioServerTransport());
  console.error('[coins-math-mcp] stdio MCP server ready — tools: verify_rtp, simulate_rtp');
}
