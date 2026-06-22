import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createServer, MAX_SPINS } from '../tools/mcp/server.mjs';

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

  it('rejects a spins count over the MAX_SPINS guard', async () => {
    // Either a protocol-level rejection (InvalidParams) or an isError result is
    // acceptable — both mean the guard bit and no simulation ran.
    const result = await client
      .callTool({ name: 'simulate_rtp', arguments: { spins: MAX_SPINS + 1 } })
      .catch(() => ({ isError: true }));
    expect(result.isError).toBe(true);
  });
});
