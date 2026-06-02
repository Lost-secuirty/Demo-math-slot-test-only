#!/usr/bin/env node
// =====================================================================
// scripts/audit-drift.mjs — deterministic PR "drift" auditor.
//
// No external deps, NO API key. Compares the LOGGED INTENT (commit
// messages, PR body, docs/LEARNINGS.md — the externalized "world state")
// against the ACTUAL diff, and flags drift. With --fix it applies only
// safe, reversible fixes (prettier, eslint --fix). Logic-affecting smells
// (console.log, eslint-disable, skipped tests, TODO) are report-only so
// the auditor never drifts the code itself. It also reports code-quality
// signals (deep nesting, net code growth without tests) — a deterministic
// proxy for the cyclomatic/cognitive-complexity gate, since AI-generated
// code tends to bloat and over-nest even when it passes its tests.
//
// Usage:
//   node scripts/audit-drift.mjs [--base <ref>] [--head <ref>]
//                                [--fix] [--run-checks] [--strict]
// Defaults: base=origin/main head=HEAD. Writes audit-report.md + stdout.
// Exit 0 always, unless --strict and a high-severity finding exists.
// =====================================================================

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);
const opt = {
  base: val('--base') || process.env.AUDIT_BASE || 'origin/main',
  head: val('--head') || process.env.AUDIT_HEAD || 'HEAD',
  fix: argv.includes('--fix'),
  runChecks: argv.includes('--run-checks'),
  strict: argv.includes('--strict'),
};

function val(flag) {
  const i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}
function sh(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return '';
  }
}

const findings = [];
const add = (severity, confidence, title, detail, evidence = []) =>
  findings.push({ severity, confidence, title, detail, evidence });

// ---- resolve the commit range -------------------------------------------
const mergeBase = sh(`git merge-base ${opt.base} ${opt.head}`).trim() || opt.base;
const range = `${mergeBase}..${opt.head}`;

const nameStatus = sh(`git diff --name-status ${range}`)
  .trim()
  .split('\n')
  .filter(Boolean)
  .map((l) => {
    const [status, ...rest] = l.split('\t');
    return { status, path: rest.join('\t') };
  });
const changedPaths = nameStatus.map((f) => f.path);

const commitText = sh(`git log --format=%s%x00%b ${range}`).toLowerCase();
const prBody = (process.env.GITHUB_PR_BODY || readIf('.audit/pr-body.md') || '').toLowerCase();
const claims = commitText + '\n' + prBody;

function readIf(p) {
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

// ---- parse ADDED lines (unified=0, lockfile excluded) -------------------
const rawDiff = sh(`git diff --unified=0 ${range} -- . ":(exclude)package-lock.json"`);
const added = [];
{
  let file = null;
  let newLine = 0;
  for (const line of rawDiff.split('\n')) {
    if (line.startsWith('diff --git')) {
      file = null;
    } else if (line.startsWith('+++ b/')) {
      file = line.slice(6);
    } else if (line.startsWith('+++ ')) {
      file = null;
    } else {
      const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        newLine = parseInt(m[1], 10);
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        if (file) added.push({ file, line: newLine, text: line.slice(1) });
        newLine++;
      }
    }
  }
}

const isSrc = (p) => p && p.startsWith('src/');
const inAudit = (p) => p === 'scripts/audit-drift.mjs' || p === 'verify.mjs';

// ---- checks --------------------------------------------------------------
function scan(re, predicate, sev, conf, title, detail) {
  const hits = added.filter((a) => predicate(a) && re.test(a.text));
  if (hits.length) {
    add(
      sev,
      conf,
      title,
      detail,
      hits.slice(0, 12).map((h) => `${h.file}:${h.line}  ${h.text.trim().slice(0, 100)}`),
    );
  }
}

// rule violations (Working Agreement)
scan(
  /eslint-disable/,
  (a) => !inAudit(a.file),
  'high',
  'high',
  'Lint suppression added',
  'New `eslint-disable` — rules should be fixed, not silenced (CLAUDE.md rule 4).',
);
scan(
  /\b(xit|xdescribe)\s*\(|\.(skip|only)\s*\(/,
  () => true,
  'high',
  'medium',
  'Test skipped / focused',
  'A test was skipped or `.only`-focused — tests must not be gutted to pass (rule 4).',
);
scan(
  /\b(TODO|FIXME|HACK|XXX)\b/,
  (a) => !inAudit(a.file),
  'medium',
  'medium',
  'TODO/HACK marker added',
  'Unfinished-work marker introduced — confirm it is intended, not a shortcut.',
);
scan(
  /console\.log\(|^\s*debugger\s*;?\s*$/,
  (a) => isSrc(a.file) && a.file !== 'src/debug.js',
  'medium',
  'high',
  'Debug statement in src/',
  'Stray `console.log`/`debugger` left in shipped code.',
);

// sensitive paths
const sensitive = changedPaths.filter((p) =>
  /^\.github\/|^\.claude\/|(^|\/)package(-lock)?\.json$|(^|\/)vite\.config\.js$/.test(p),
);
if (sensitive.length) {
  add(
    'medium',
    'high',
    'Sensitive files changed',
    'Build/CI/agent-config/deps changed — review intentionality and that it was logged.',
    sensitive,
  );
}

// code bloat / complexity (Sonar "AI code quality" signals) ---------------
// AI-generated code tends to bloat and over-nest even when it passes tests.
// These are deterministic diff heuristics — a language-agnostic proxy for the
// cyclomatic/cognitive-complexity gate (see testing-kits core/complexity).

// 1) Deep nesting: added src lines indented past ~8 levels (2-space style).
scan(
  /^ {16,}\S/,
  (a) => isSrc(a.file),
  'low',
  'low',
  'Deep nesting added (complexity smell)',
  'Added code nested past ~8 levels — a cognitive-complexity smell; consider extracting helpers.',
);

// 2) Net code growth in src/ with no accompanying test change.
const srcNumstat = sh(`git diff --numstat ${range} -- "src/*.js"`)
  .trim()
  .split('\n')
  .filter(Boolean);
let srcAdded = 0;
let srcRemoved = 0;
for (const l of srcNumstat) {
  const [a, d] = l.split('\t');
  srcAdded += parseInt(a, 10) || 0;
  srcRemoved += parseInt(d, 10) || 0;
}
const srcNet = srcAdded - srcRemoved;
const testChanged = changedPaths.some((p) => p.startsWith('test/'));
if (srcNet > 300 && !testChanged) {
  add(
    'low',
    'low',
    'Large net code growth without tests',
    `src grew by net ${srcNet} lines (+${srcAdded}/-${srcRemoved}) with no test changes — check for bloat and add coverage.`,
    [],
  );
}

// documentation drift
const srcChanged = changedPaths.some(isSrc);
const learningsChanged = changedPaths.includes('docs/LEARNINGS.md');
if (srcChanged && !learningsChanged) {
  add(
    'low',
    'medium',
    'LEARNINGS not updated',
    'Source changed but `docs/LEARNINGS.md` was not touched — capture any decision/gotcha (rule 2).',
    [],
  );
}

// unlogged files (heuristic): changed file never named in commits/PR body
const unlogged = changedPaths.filter((p) => {
  const stem = p
    .split('/')
    .pop()
    .replace(/\.[^.]+$/, '')
    .toLowerCase();
  return stem.length > 2 && !claims.includes(stem) && !claims.includes(p.toLowerCase());
});
if (unlogged.length) {
  add(
    'low',
    'low',
    'Possibly unlogged changes',
    'These files are not referenced in any commit message or PR body (heuristic).',
    unlogged.slice(0, 20),
  );
}

// ---- optional: build/lint health ----------------------------------------
let checks = '';
if (opt.runChecks) {
  const lint = trySh('npm run lint');
  const build = trySh('npm run build');
  checks =
    `\n## Build & lint\n` +
    `- lint: ${lint.ok ? '✅ pass' : '‼️ FAIL'}\n` +
    `- build: ${build.ok ? '✅ pass' : '‼️ FAIL'}\n`;
  if (!lint.ok) add('high', 'high', 'Lint failing', 'CI `npm run lint` failed on this PR.', []);
  if (!build.ok) add('high', 'high', 'Build failing', 'CI `npm run build` failed on this PR.', []);
}
function trySh(cmd) {
  try {
    execSync(cmd, { stdio: 'ignore' });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

// ---- optional: safe auto-fixes -------------------------------------------
let fixNote = '';
if (opt.fix) {
  sh('npx prettier --write . > /dev/null 2>&1');
  sh('npm run lint -- --fix > /dev/null 2>&1');
  const dirty = sh('git status --porcelain').trim();
  fixNote = dirty
    ? `\n## Auto-fixes applied\nSafe formatting/lint fixes (prettier + eslint --fix) were applied:\n\n\`\`\`\n${dirty}\n\`\`\`\n`
    : `\n## Auto-fixes applied\nNone needed — formatting and lint were already clean.\n`;
}

// ---- report --------------------------------------------------------------
const order = { high: 0, medium: 1, low: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity]);
const emoji = { high: '🔴', medium: '🟠', low: '🟡' };
const highCount = findings.filter((f) => f.severity === 'high').length;

let md = `## 🔍 Drift Audit\n\n`;
md += `Range \`${range}\` · ${changedPaths.length} file(s) changed · `;
md += findings.length
  ? `**${findings.length} finding(s)** (${highCount} high)\n`
  : `**no drift detected** ✅\n`;

if (findings.length) {
  md += `\n| | Finding | Severity | Confidence | Evidence |\n|---|---|---|---|---|\n`;
  for (const f of findings) {
    const ev = f.evidence.length ? f.evidence.map((e) => `\`${e}\``).join('<br>') : f.detail;
    md += `| ${emoji[f.severity]} | **${f.title}** | ${f.severity} | ${f.confidence} | ${ev} |\n`;
  }
  md += `\n_Details:_\n`;
  for (const f of findings) md += `- **${f.title}** — ${f.detail}\n`;
}
md += checks + fixNote;
md += `\n## Code size\n- \`src/\` net change this range: **${srcNet >= 0 ? '+' : ''}${srcNet}** lines (+${srcAdded}/-${srcRemoved})\n`;
md += `\n<sub>Generated by \`scripts/audit-drift.mjs\` — deterministic, no API key. Semantic claim-vs-code review is handled by the in-session auditor (see docs/DRIFT-AUDIT.md).</sub>\n`;

writeFileSync('audit-report.md', md);
process.stdout.write(md + '\n');

if (opt.strict && highCount > 0) process.exit(1);
