// Validate the static agent-interop surface (A2A Agent Card + MCP tool-defs) and enforce the
// no-overclaim honesty rule from ADR-0019: while STATUS.md records `agent_interop_phase: A`,
// the card must NOT advertise a live, callable endpoint. Pure Node stdlib — no new deps.
//
// `validateAgentSurface` and `parsePhase` are exported so test/agent-card.test.js can prove
// the gate bites (a broken/overclaiming card must fail). `node scripts/agent-card-validate.mjs`
// runs it over the real files and exits 1 on any error.

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Read `agent_interop_phase` from STATUS.md's YAML front-matter without a YAML dependency.
export function parsePhase(statusText) {
  const fm = statusText.match(/^---\n([\s\S]*?)\n---/);
  const block = fm ? fm[1] : statusText;
  const m = block.match(/^agent_interop_phase:\s*(\S+)\s*$/m);
  return m ? m[1] : null;
}

// Returns { ok, errors } — never throws, so the teeth test can assert on every shape.
export function validateAgentSurface({ card, tools, phase }) {
  const errors = [];
  const req = (cond, msg) => {
    if (!cond) errors.push(msg);
  };

  // --- A2A Agent Card: the five required top-level fields + each skill's required fields ---
  req(typeof card?.name === 'string' && card.name.length > 0, 'card.name missing');
  req(
    typeof card?.description === 'string' && card.description.length > 0,
    'card.description missing',
  );
  req(typeof card?.version === 'string' && card.version.length > 0, 'card.version missing');
  req(typeof card?.url === 'string' && card.url.length > 0, 'card.url missing');
  req(
    Array.isArray(card?.skills) && card.skills.length >= 1,
    'card.skills must be a non-empty array',
  );
  for (const [i, s] of (Array.isArray(card?.skills) ? card.skills : []).entries()) {
    req(typeof s?.id === 'string' && KEBAB.test(s.id), `skill[${i}].id missing or not kebab-case`);
    req(typeof s?.name === 'string' && s.name.length > 0, `skill[${i}].name missing`);
    req(
      typeof s?.description === 'string' && s.description.length > 0,
      `skill[${i}].description missing`,
    );
  }

  // --- lifecycle block (machine-readable growing-until-frozen signal) ---
  const lc = card?.['x-lifecycle'];
  req(lc && typeof lc === 'object', 'card.x-lifecycle missing');
  if (lc && typeof lc === 'object') {
    req(typeof lc.status === 'string', 'x-lifecycle.status missing');
    req(typeof lc.frozen === 'boolean', 'x-lifecycle.frozen must be a boolean');
    req(typeof lc.interopPhase === 'string', 'x-lifecycle.interopPhase missing');
    req(typeof lc.liveEndpoint === 'boolean', 'x-lifecycle.liveEndpoint must be a boolean');
  }

  // --- honesty: no live endpoint while phase A (ADR-0019) ---
  req(phase != null, 'STATUS.md agent_interop_phase not found');
  if (phase === 'A') {
    req(
      card?.capabilities?.streaming === false,
      'phase A: card.capabilities.streaming must be false (no live A2A streaming endpoint)',
    );
    req(lc?.liveEndpoint === false, 'phase A: x-lifecycle.liveEndpoint must be false');
    req(
      lc?.interopPhase === phase,
      `phase A: x-lifecycle.interopPhase (${lc?.interopPhase}) must match STATUS.md agent_interop_phase (${phase})`,
    );
  }

  // --- MCP tool-defs: each tool needs a name, description, and object in/out schemas ---
  req(
    Array.isArray(tools?.tools) && tools.tools.length >= 1,
    'tools.tools must be a non-empty array',
  );
  for (const [i, t] of (Array.isArray(tools?.tools) ? tools.tools : []).entries()) {
    req(typeof t?.name === 'string' && t.name.length > 0, `tool[${i}].name missing`);
    req(
      typeof t?.description === 'string' && t.description.length > 0,
      `tool[${i}].description missing`,
    );
    req(t?.inputSchema?.type === 'object', `tool[${i}].inputSchema must be an object schema`);
    req(t?.outputSchema?.type === 'object', `tool[${i}].outputSchema must be an object schema`);
  }

  return { ok: errors.length === 0, errors };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const card = JSON.parse(readFileSync(join(root, 'public/.well-known/agent-card.json'), 'utf8'));
  const tools = JSON.parse(readFileSync(join(root, 'tools/mcp/tools.json'), 'utf8'));
  const phase = parsePhase(readFileSync(join(root, 'STATUS.md'), 'utf8'));
  const { ok, errors } = validateAgentSurface({ card, tools, phase });
  if (ok) {
    console.log(
      `agent-card: OK — A2A card + ${tools.tools.length} MCP tool(s) valid; honesty check passed (phase ${phase}).`,
    );
    return 0;
  }
  console.error('agent-card: INVALID —');
  for (const e of errors) console.error(`  - ${e}`);
  return 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exit(main());
}
