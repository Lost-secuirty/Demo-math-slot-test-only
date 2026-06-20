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

describe.skipIf(!present)('agent-interop surface', () => {
  it('STATUS.md is phase A and the real surface validates', () => {
    expect(phase).toBe('A');
    const { ok, errors } = validateAgentSurface({ card, tools, phase });
    expect(errors).toEqual([]);
    expect(ok).toBe(true);
  });

  // --- teeth: each broken/overclaiming variant MUST fail ---

  it('bites when the card advertises live streaming while phase A', () => {
    const bad = structuredClone(card);
    bad.capabilities.streaming = true;
    expect(validateAgentSurface({ card: bad, tools, phase }).ok).toBe(false);
  });

  it('bites when x-lifecycle.liveEndpoint is true while phase A', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].liveEndpoint = true;
    expect(validateAgentSurface({ card: bad, tools, phase }).ok).toBe(false);
  });

  it('bites when interopPhase disagrees with STATUS.md', () => {
    const bad = structuredClone(card);
    bad['x-lifecycle'].interopPhase = 'B';
    expect(validateAgentSurface({ card: bad, tools, phase }).ok).toBe(false);
  });

  it('bites when a required A2A field is missing', () => {
    const bad = structuredClone(card);
    delete bad.skills;
    expect(validateAgentSurface({ card: bad, tools, phase }).ok).toBe(false);
  });

  it('bites when a skill id is not kebab-case', () => {
    const bad = structuredClone(card);
    bad.skills[0].id = 'Verify_RTP';
    expect(validateAgentSurface({ card: bad, tools, phase }).ok).toBe(false);
  });

  it('bites when an MCP tool is missing its output schema', () => {
    const bad = structuredClone(tools);
    delete bad.tools[0].outputSchema;
    expect(validateAgentSurface({ card, tools: bad, phase }).ok).toBe(false);
  });
});
