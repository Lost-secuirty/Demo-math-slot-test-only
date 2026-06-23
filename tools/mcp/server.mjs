// =====================================================================
// tools/mcp/server.mjs — Phase B (ADR-0020): a local, runnable stdio MCP
// server that makes this repo's deterministic slot-math callable by an MCP
// client (Claude Desktop/IDE). It runs in the CALLER's own process over
// stdio — NO network listener, NO auth, NO secrets. A hosted/public endpoint
// (A2A or MCP-HTTP) is deferred to phase C (see ADR-0019 / ADR-0020).
//
// NOTE: intentionally NO `#!/usr/bin/env node` shebang. This module is also
// IMPORTED by the in-memory integration test, and Vite/vitest's transform
// mis-parses a shebang that leads an imported module on Windows ("Invalid or
// unexpected token"). The `mcp:serve` script and the MCP client config both
// invoke `node` explicitly — no shebang needed for those paths. A shebang-less
// file can't double as a Unix `bin`; this package exposes no `bin` entry.
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

// modelOverrides is a HYPOTHETICAL-tuning knob, but it merges straight into the
// pure math via buildModel(), so its grid/symbol fields are caller-controlled.
// Without bounds a single tiny override crashes this stdio process: verify_rtp
// enumerates `symbols^reels` outcomes (exponential — {reels:9} OOM-kills Node),
// and simulate_rtp allocates `reels*rows` cells per spin. Cap the shape and the
// enumeration cost BEFORE compute, and reject (clean isError) instead of dying.
export const MAX_REELS = 8;
export const MAX_ROWS = 8;
export const MAX_SYMBOLS = 32;
export const MAX_ENUMERATION = 2_000_000; // symbols^reels leaves for the exact PAR-sheet walk

// A bad modelOverrides is the caller's input error, not a server fault — raise
// this so the tool callback can return a clean isError rather than a stack/crash.
class ToolInputError extends Error {}

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

const requiredOf = (name) => defOf(name).outputSchema?.required ?? [];

// Merge the overrides, then bound the resulting model so a hostile/garbage
// tuning can neither exhaust memory nor produce a degenerate (NaN) distribution.
// Returns the validated model or throws ToolInputError with a one-line reason.
function boundedModel(overrides) {
  const model = buildModel(overrides ?? {});
  const reels = Number.isFinite(model.reels) ? model.reels : (model.paylines?.[0]?.length ?? 0);
  const rows = Number.isFinite(model.rows)
    ? model.rows
    : Array.isArray(model.paylines) && model.paylines.length
      ? Math.max(...model.paylines.flat()) + 1
      : 0;
  const symbolCount = Array.isArray(model.symbols) ? model.symbols.length : 0;

  // Integrality matters, not just range: a fractional reels (e.g. 1.5) never
  // hits theoreticalRtp's `depth === reels` base case -> unbounded recursion.
  if (!(Number.isInteger(reels) && reels >= 1 && reels <= MAX_REELS))
    throw new ToolInputError(`reels must be an integer 1..${MAX_REELS} (got ${reels})`);
  if (!(Number.isInteger(rows) && rows >= 1 && rows <= MAX_ROWS))
    throw new ToolInputError(`rows must be an integer 1..${MAX_ROWS} (got ${rows})`);
  if (!(symbolCount >= 1 && symbolCount <= MAX_SYMBOLS))
    throw new ToolInputError(`symbols must number 1..${MAX_SYMBOLS} (got ${symbolCount})`);
  if (symbolCount ** reels > MAX_ENUMERATION)
    throw new ToolInputError(
      `model too large to enumerate: ${symbolCount}^${reels} exceeds ${MAX_ENUMERATION}`,
    );

  // Every symbol must carry a finite, non-negative weight that sums to a
  // positive total, or symbolProbabilities() divides by zero -> NaN cascade.
  const weights = model.weights ?? {};
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (!(Number.isFinite(total) && total > 0))
    throw new ToolInputError('weights must sum to a finite positive total');
  for (const id of model.symbols) {
    if (!(Number.isFinite(weights[id]) && weights[id] >= 0))
      throw new ToolInputError(`weights["${id}"] must be a finite, non-negative number`);
  }
  return model;
}

// Make the dual return (content-text + structuredContent) agree and stay
// JSON-RPC-valid. JSON.stringify turns Infinity/NaN into null, so the two halves
// would otherwise disagree; a non-finite OPTIONAL figure (jackpotOneIn /
// bonusTriggerOneIn when a symbol never appears = "1 in infinity") is omitted
// rather than emitted as a misleading null. A non-finite REQUIRED field means
// the override is genuinely invalid -> surface it as a clean input error.
function finalize(out, required) {
  const safe = {};
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      if (required.includes(key))
        throw new ToolInputError(`model produced a non-finite ${key} (check weights/paytable)`);
      continue; // omit the optional "never happens" figure
    }
    safe[key] = value;
  }
  return safe;
}

// Run a tool body, converting a bad-override ToolInputError into a clean MCP
// isError result (an unexpected error still propagates to the SDK).
function toolResult(buildOut) {
  try {
    const out = buildOut();
    return { content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out };
  } catch (err) {
    if (err instanceof ToolInputError)
      return {
        content: [{ type: 'text', text: `invalid modelOverrides: ${err.message}` }],
        isError: true,
      };
    throw err;
  }
}

const modelOverrides = z
  .object({})
  .passthrough()
  .optional()
  .describe(
    'Optional partial model overrides merged via buildModel(). Computes a HYPOTHETICAL tuning, not the shipped game RTP. Grid size, symbol count and weights are bounded; an out-of-range or degenerate model returns an error.',
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
    async ({ modelOverrides: overrides }) =>
      toolResult(() => finalize(theoreticalRtp(boundedModel(overrides)), requiredOf('verify_rtp'))),
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
    async ({ seed, spins, modelOverrides: overrides }) =>
      toolResult(() =>
        finalize(
          monteCarloFullGame(boundedModel(overrides), { seed, spins }),
          requiredOf('simulate_rtp'),
        ),
      ),
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
