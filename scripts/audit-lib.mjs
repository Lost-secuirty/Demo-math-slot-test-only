// =====================================================================
// audit-lib.mjs — pure helpers for the drift auditor (no side effects,
// no git, no fs writes) so the load-bearing logic is unit-testable
// (test/auditLib.test.js). audit-drift.mjs stays the script shell.
// =====================================================================

// Canonical check ids — the ONE list the retro (/audit-retro) uses to
// detect dead checks. Adding a check to audit-drift.mjs means adding its
// id here, or the retro will report it as unknown.
export const CHECK_IDS = [
  'lint-suppress',
  'test-skip',
  'todo-marker',
  'debug-stmt',
  'sensitive-paths',
  'deep-nesting',
  'growth-no-tests',
  'learnings-stale',
  'unlogged-files',
  'deviations-section',
  'lint-fail',
  'build-fail',
];

// Working Agreement #8: every PR body must carry a "## Deviations from
// plan" section with explicit content ("None." counts; an untouched
// template placeholder does not). HTML comments are stripped FIRST so a
// commented-out heading or the template's instructional comment can't
// satisfy the check. Case-insensitive (the auditor feeds a lowercased
// body). Returns null when satisfied, else { reason: 'missing'|'empty' }.
export function checkDeviationSection(body) {
  const text = (body || '').replace(/<!--[\s\S]*?-->/g, '');
  const m = /^##\s*deviations from plan\s*$/im.exec(text);
  if (!m) return { reason: 'missing' };
  const rest = text.slice(m.index + m[0].length);
  const next = rest.search(/^##\s/m);
  const content = (next === -1 ? rest : rest.slice(0, next)).trim();
  return content ? null : { reason: 'empty' };
}

// One docs/audit-history.ndjson line (ends with \n). Findings are
// reduced to { id, sev, conf } — the retro needs counts, not prose.
export function historyLine({ ts, base, head, pr, findings, srcNet, autofixed }) {
  return (
    JSON.stringify({
      ts,
      base,
      head,
      pr: pr ?? null,
      findings: findings.map((f) => ({ id: f.id, sev: f.severity, conf: f.confidence })),
      srcNet,
      autofixed: Boolean(autofixed),
    }) + '\n'
  );
}

// Dedupe predicate: has this head sha already been recorded? Makes
// workflow re-runs idempotent (one line per audited head).
export function hasHead(fileText, headSha) {
  if (!fileText || !headSha) return false;
  return fileText
    .split('\n')
    .filter(Boolean)
    .some((line) => {
      try {
        return JSON.parse(line).head === headSha;
      } catch {
        return false;
      }
    });
}
