import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, MAX_SPINS } from '../tools/mcp/server.mjs';

// Resolve tools.json relative to THIS file (cwd-independent: vitest runs from
// the repo root, the mutation probe from a temp copy — both must resolve).
const TOOLS_JSON = JSON.parse(
  readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'tools', 'mcp', 'tools.json'),
    'utf8',
  ),
);
const textOf = (res) => (res.content ?? []).map((c) => c.text).join(' ');

// The default virtual-strip weights, mirrored so override tests can tweak ONE
// symbol while keeping a complete (non-degenerate) distribution. Kept honest by
// the verify_rtp golden pin (lineRtp ≈ 0.45689) which uses the real config.
const defaultWeights = {
  cherry: 520,
  lemon: 480,
  plum: 440,
  watermelon: 360,
  bell: 260,
  bar: 180,
  seven: 120,
  coin: 788,
};

// Phase B (ADR-0020): the local stdio MCP server must expose the SAME real
// math the rest of the suite pins — not a stub. We drive it over an in-memory
// transport (headless, no subprocess/stdout framing) and assert the tool
// results match the golden PAR-sheet base RTP and the seeded determinism that
// rtp-target.test.js pins directly.
describe('Phase B — local stdio MCP server (tools/mcp/server.mjs)', () => {
  let client;

  beforeAll(async () => {
    const server = createServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'mcp-server-test', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  });

  afterAll(async () => {
    await client?.close();
  });

  it('advertises exactly verify_rtp and simulate_rtp', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['simulate_rtp', 'verify_rtp']);
  });

  it('verify_rtp returns the exact PAR-sheet base RTP (real math, not a stub)', async () => {
    const res = await client.callTool({ name: 'verify_rtp', arguments: {} });
    expect(res.isError).toBeFalsy();
    // Same golden value rtp-target.test.js pins directly off theoreticalRtp().
    expect(res.structuredContent.lineRtp).toBeCloseTo(0.45689, 4);
    expect(res.structuredContent.nLines).toBe(5);
    expect(res.structuredContent.houseEdge).toBeCloseTo(1 - res.structuredContent.lineRtp, 6);
  });

  it('simulate_rtp is deterministic for a fixed seed and returns the CI shape', async () => {
    const args = { seed: 7, spins: 200_000 };
    const a = await client.callTool({ name: 'simulate_rtp', arguments: args });
    const b = await client.callTool({ name: 'simulate_rtp', arguments: args });
    expect(a.isError).toBeFalsy();
    expect(a.structuredContent.rtp).toBe(b.structuredContent.rtp); // seeded determinism
    for (const k of ['rtp', 'lineRtp', 'bonusRtp', 'ci95Low', 'ci95High', 'spins', 'seed']) {
      expect(a.structuredContent).toHaveProperty(k);
    }
    expect(a.structuredContent.spins).toBe(200_000);
    expect(a.structuredContent.rtp).toBeGreaterThan(0.9);
    expect(a.structuredContent.rtp).toBeLessThan(1.05);
  });

  it('rejects a spins count over the MAX_SPINS guard, and the reason is about spins', async () => {
    // Either a protocol-level rejection (InvalidParams) or an isError result is
    // acceptable — both mean the guard bit and no simulation ran. Capture the
    // message so we prove the SPINS ceiling fired, not some unrelated error.
    const result = await client
      .callTool({ name: 'simulate_rtp', arguments: { spins: MAX_SPINS + 1 } })
      .catch((err) => ({
        isError: true,
        content: [{ type: 'text', text: String(err?.message ?? err) }],
      }));
    expect(result.isError).toBe(true);
    expect(textOf(result).toLowerCase()).toContain('spins');
  });

  // ---- Hardening (PR-B1 audit fold-ins) --------------------------------------

  it('the published tools.json spins.maximum equals the server MAX_SPINS (no drift)', () => {
    const spins = TOOLS_JSON.tools.find((t) => t.name === 'simulate_rtp').inputSchema.properties
      .spins;
    expect(spins.maximum).toBe(MAX_SPINS);
  });

  it('verify_rtp: the text content and structuredContent are identical (dual-channel contract)', async () => {
    const res = await client.callTool({ name: 'verify_rtp', arguments: {} });
    expect(res.isError).toBeFalsy();
    expect(JSON.parse(res.content[0].text)).toEqual(res.structuredContent);
  });

  it('simulate_rtp: a different seed produces a different rtp (the seed truly drives the RNG)', async () => {
    const a = await client.callTool({
      name: 'simulate_rtp',
      arguments: { seed: 7, spins: 200_000 },
    });
    const c = await client.callTool({
      name: 'simulate_rtp',
      arguments: { seed: 8, spins: 200_000 },
    });
    expect(a.structuredContent.rtp).not.toBe(c.structuredContent.rtp);
  });

  it('modelOverrides actually flows into the math: a weight tweak shifts lineRtp off the default', async () => {
    const base = await client.callTool({ name: 'verify_rtp', arguments: {} });
    // Bias toward the top payer -> base line RTP must move off the golden 0.45689.
    const tuned = await client.callTool({
      name: 'verify_rtp',
      arguments: { modelOverrides: { weights: { ...defaultWeights, seven: 600 } } },
    });
    expect(tuned.isError).toBeFalsy();
    expect(tuned.structuredContent.lineRtp).not.toBeCloseTo(base.structuredContent.lineRtp, 5);
  });

  it('a degenerate model is rejected as a clean input error, not a NaN/validation wall', async () => {
    // A partial weights map zeroes the total -> NaN cascade; the guard must catch it.
    const res = await client
      .callTool({ name: 'verify_rtp', arguments: { modelOverrides: { weights: { seven: 0 } } } })
      .catch((err) => ({
        isError: true,
        content: [{ type: 'text', text: String(err?.message ?? err) }],
      }));
    expect(res.isError).toBe(true);
    expect(textOf(res).toLowerCase()).toContain('invalid modeloverrides');
  });

  it('a non-finite OPTIONAL figure is omitted so both channels stay JSON-valid and agree', async () => {
    // Full valid distribution but the jackpot symbol never lands -> jackpotOneIn
    // would be Infinity (1-in-infinity). It must be omitted (not emitted as a
    // misleading JSON null), and text/structuredContent must still match.
    const res = await client.callTool({
      name: 'verify_rtp',
      arguments: { modelOverrides: { weights: { ...defaultWeights, seven: 0 } } },
    });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent.jackpotProb).toBe(0);
    expect('jackpotOneIn' in res.structuredContent).toBe(false);
    expect(JSON.parse(res.content[0].text)).toEqual(res.structuredContent);
  });

  it('a grid override past the enumeration ceiling is rejected, not crashed (verify_rtp)', async () => {
    // reels:7 = 8^7 ≈ 2.1M outcomes, just over MAX_ENUMERATION; reels:9 (8^9 ≈
    // 134M) OOM-killed the process pre-fix. Both must now return a clean error.
    const res = await client
      .callTool({ name: 'verify_rtp', arguments: { modelOverrides: { reels: 7 } } })
      .catch((err) => ({
        isError: true,
        content: [{ type: 'text', text: String(err?.message ?? err) }],
      }));
    expect(res.isError).toBe(true);
    expect(textOf(res).toLowerCase()).toContain('enumerate');
  });

  it('a huge grid override that would OOM-allocate is rejected, not crashed (simulate_rtp)', async () => {
    const res = await client
      .callTool({
        name: 'simulate_rtp',
        arguments: { spins: 1, modelOverrides: { reels: 100000, rows: 100000 } },
      })
      .catch((err) => ({
        isError: true,
        content: [{ type: 'text', text: String(err?.message ?? err) }],
      }));
    expect(res.isError).toBe(true);
    expect(textOf(res).toLowerCase()).toContain('invalid modeloverrides');
  });
});
