import { describe, it, expect } from 'vitest';
import { CHECK_IDS, checkDeviationSection, historyLine, hasHead } from '../scripts/audit-lib.mjs';

// =====================================================================
// The audit's own load-bearing logic (ADR-0017). checkDeviationSection
// enforces Working Agreement #8's PR-body section; historyLine/hasHead
// are the longitudinal-memory primitives the CI audit and /audit-retro
// depend on. The script shell (git plumbing) stays untested on purpose —
// proportionate to 20 PRs of survival.
// =====================================================================

describe('checkDeviationSection', () => {
  it('fails with "missing" when there is no heading at all', () => {
    expect(checkDeviationSection('## What\nstuff')).toEqual({ reason: 'missing' });
    expect(checkDeviationSection('')).toEqual({ reason: 'missing' });
    expect(checkDeviationSection(null)).toEqual({ reason: 'missing' });
  });

  it('fails with "empty" when the section has no real content', () => {
    expect(checkDeviationSection('## Deviations from plan\n\n## Next')).toEqual({
      reason: 'empty',
    });
    expect(checkDeviationSection('## Deviations from plan\n   \n\t\n')).toEqual({
      reason: 'empty',
    });
  });

  it('fails when the section contains ONLY the template HTML comment', () => {
    const body =
      '## Deviations from plan\n\n<!-- Mandatory. Write "None." explicitly. -->\n\n## AI';
    expect(checkDeviationSection(body)).toEqual({ reason: 'empty' });
  });

  it('does not accept a heading that only exists inside an HTML comment', () => {
    const body = '<!--\n## Deviations from plan\nNone.\n-->\n## What\nstuff';
    expect(checkDeviationSection(body)).toEqual({ reason: 'missing' });
  });

  it('passes an explicit "None."', () => {
    expect(checkDeviationSection('## Deviations from plan\n\nNone.\n\n## Next')).toBeNull();
  });

  it('passes real deviation content and is case-insensitive', () => {
    expect(
      checkDeviationSection('## DEVIATIONS FROM PLAN\n- switched X to Y because Z'),
    ).toBeNull();
  });

  it('works on the lowercased body the auditor actually feeds it', () => {
    // audit-drift.mjs lowercases the whole PR body before any check runs
    const lowered = '## deviations from plan\n\nnone.\n\n## testing\n- stuff'.toLowerCase();
    expect(checkDeviationSection(lowered)).toBeNull();
  });

  it('treats a section ending at end-of-body correctly', () => {
    expect(checkDeviationSection('## Deviations from plan\nSwapped the rng seam.')).toBeNull();
    expect(checkDeviationSection('## Deviations from plan\n')).toEqual({ reason: 'empty' });
  });
});

describe('historyLine', () => {
  const sample = {
    ts: '2026-06-11T00:00:00.000Z',
    base: 'aaa111',
    head: 'bbb222',
    pr: 21,
    findings: [
      { id: 'todo-marker', severity: 'medium', confidence: 'medium', title: 'x', detail: 'y' },
    ],
    srcNet: 42,
    autofixed: false,
  };

  it('round-trips through JSON.parse and ends with a newline', () => {
    const line = historyLine(sample);
    expect(line.endsWith('\n')).toBe(true);
    const parsed = JSON.parse(line);
    expect(parsed).toEqual({
      ts: sample.ts,
      base: 'aaa111',
      head: 'bbb222',
      pr: 21,
      findings: [{ id: 'todo-marker', sev: 'medium', conf: 'medium' }],
      srcNet: 42,
      autofixed: false,
    });
  });

  it('normalizes a missing pr to null and coerces autofixed to boolean', () => {
    const parsed = JSON.parse(historyLine({ ...sample, pr: undefined, autofixed: 'yes' }));
    expect(parsed.pr).toBeNull();
    expect(parsed.autofixed).toBe(true);
  });
});

describe('hasHead', () => {
  const file = historyLine({
    ts: 't',
    base: 'a',
    head: 'sha-one',
    pr: 1,
    findings: [],
    srcNet: 0,
    autofixed: false,
  });

  it('finds an existing head and misses an absent one', () => {
    expect(hasHead(file, 'sha-one')).toBe(true);
    expect(hasHead(file, 'sha-two')).toBe(false);
  });

  it('tolerates empty files and garbage lines', () => {
    expect(hasHead('', 'sha-one')).toBe(false);
    expect(hasHead('not json\n' + file, 'sha-one')).toBe(true);
  });
});

describe('CHECK_IDS', () => {
  it('is the canonical 12-check list with unique ids', () => {
    expect(CHECK_IDS).toHaveLength(12);
    expect(new Set(CHECK_IDS).size).toBe(CHECK_IDS.length);
    expect(CHECK_IDS).toContain('deviations-section');
  });

  it('matches the ids audit-drift.mjs actually emits (no orphans either way)', async () => {
    const { readFileSync } = await import('node:fs');
    const script = readFileSync(new URL('../scripts/audit-drift.mjs', import.meta.url), 'utf8');
    for (const id of CHECK_IDS) {
      expect(script.includes(`'${id}'`), `${id} missing from audit-drift.mjs`).toBe(true);
    }
  });
});
