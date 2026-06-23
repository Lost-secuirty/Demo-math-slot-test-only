// Teeth for the agent-interop validation gate (ADR-0019): the REAL surface must validate,
// and the gate must BITE on a broken or overclaiming card/tool-def. Mirrors the repo's
// "a gate with no teeth is worse than none" stance (see mutation-probe / smoke:planted).

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { validateAgentSurface, parsePhase } from '../scripts/agent-card-validate.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cardPath = join(root, 'public/.well-known/agent-card.json');
const toolsPath = join(root, 'tools/mcp/tools.json');
const statusPath = join(root, 'STATUS.md');
// The mutation probe runs the suite from a temp copy that omits the static surface files;
// this suite targets the surface, not src/ logic, so skip it there (rather than ENOENT-fail).
// `npm test` and `npm run agent-card` exercise it fully against the real files.
const present = existsSync(cardPath) && existsSync(toolsPath) && existsSync(statusPath);
const card = present ? JSON.parse(readFileSync(cardPath, 'utf8')) : null;
const tools = present ? JSON.parse(readFileSync(toolsPath, 'utf8')) : null;
const phase = present ? parsePhase(readFileSync(statusPath, 'utf8')) : null;
// Real on-disk resolver for the phase-B server-entry existence check.
const fileExists = (rel) => existsSync(join(root, rel));

describe.skipIf(!present)('agent-interop surface', () => {
  it('STATUS.md is phase B and the real surface validates (server entry exists on disk)', () => {
    expect(phase).toBe('B');
    const { ok, errors } = validateAgentSurface({ card, tools, phase, fileExists });
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  // --- teeth: each broken/overclaiming variant MUST fail ---
  // These hosted-endpoint claims must stay false in BOTH phase A and B (a hosted A2A/MCP-HTTP
  // endpoint is phase C); the gate must bite if the card advertises one.

  it('bites when the card advertises live streaming', () => {
    const bad = structuredClone(card);
    bad.capabilities.streaming = true;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when the card advertises pushNotifications', () => {
    const bad = structuredClone(card);
    bad.capabilities.pushNotifications = true;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when x-lifecycle.liveEndpoint is true', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].liveEndpoint = true;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when interopPhase disagrees with STATUS.md', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].interopPhase = 'A'; // real phase is B
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('fails closed on an unsupported agent_interop_phase (does not silently skip the gate)', () => {
    // A typo'd/unknown phase must ERROR, not bypass every phase-specific honesty check.
    expect(validateAgentSurface({ card, tools, phase: 'C', fileExists }).ok).toBe(false);
    expect(validateAgentSurface({ card, tools, phase: 'b', fileExists }).ok).toBe(false);
  });

  // --- phase-B teeth: the localMcpServer claim must be present, runnable, and not overclaim ---

  it('bites when phase B claims a localMcpServer whose entry file is missing on disk', () => {
    // Card is otherwise valid; the entry just does not exist -> overclaim, must fail.
    expect(validateAgentSurface({ card, tools, phase, fileExists: () => false }).ok).toBe(false);
  });

  it('bites when phase B is missing the localMcpServer marker entirely', () => {
    const bad = structuredClone(card);
    delete bad['x-lifecycle'].localMcpServer;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when phase B localMcpServer.available is false', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].localMcpServer.available = false;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when phase B localMcpServer.transport is not stdio', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].localMcpServer.transport = 'http';
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when phase B localMcpServer.entry is an empty string', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].localMcpServer.entry = '';
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  // --- phase-A teeth: localMcpServer must be absent or disabled ---

  it('validates a well-formed phase-A card with no localMcpServer', () => {
    const phaseA = structuredClone(card);
    phaseA['x-lifecycle'].interopPhase = 'A';
    delete phaseA['x-lifecycle'].localMcpServer;
    const { ok, errors } = validateAgentSurface({ card: phaseA, tools, phase: 'A', fileExists });
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  it('bites when phase A claims an available localMcpServer (no callable server in phase A)', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].interopPhase = 'A';
    bad['x-lifecycle'].localMcpServer.available = true;
    expect(validateAgentSurface({ card: bad, tools, phase: 'A', fileExists }).ok).toBe(false);
  });

  // --- structural teeth (phase-independent) ---

  it('bites when a required A2A field is missing', () => {
    const bad = structuredClone(card);
    delete bad.skills;
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when a skill id is not kebab-case', () => {
    const bad = structuredClone(card);
    bad.skills[0].id = 'Verify_RTP';
    expect(validateAgentSurface({ card: bad, tools, phase, fileExists }).ok).toBe(false);
  });

  it('bites when an MCP tool is missing its output schema', () => {
    const bad = structuredClone(tools);
    delete bad.tools[0].outputSchema;
    expect(validateAgentSurface({ card, tools: bad, phase, fileExists }).ok).toBe(false);
  });
});
