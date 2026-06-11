#!/usr/bin/env node
// =====================================================================
// mutation-probe.mjs — does the test suite actually catch bugs?
//
// Ported from the Drive `mutation_probe_2.py`. Injects small, deliberate
// faults into the pure-logic source (wins.js, slotmath.js), runs the full
// Vitest suite against each mutant in an isolated temp copy, and reports a
// mutation score:
//   KILLED   = the suite failed on the mutant (good — tests have teeth)
//   SURVIVED = the suite still passed (blind spot — add/strengthen a test)
//   SKIPPED  = the target source text was not found
//
// Standalone (not part of `npm test`) so CI stays fast. Run:
//   npm run mutation   (or: node scripts/mutation-probe.mjs)
// The working tree is never mutated — every run happens in a temp dir with
// node_modules symlinked.
// =====================================================================

import { mkdtempSync, cpSync, rmSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const REPO = process.cwd();
// scripts/ is needed since test/auditLib.test.js imports scripts/audit-lib.mjs
const COPY = ['src', 'test', 'scripts', 'package.json', 'vitest.config.js'];

// Each mutation: a single targeted source edit that SHOULD break a test.
const MUTATIONS = [
  {
    name: 'wins: line payout stops summing',
    file: 'src/wins.js',
    find: 'total += payout;',
    replace: 'total += 0;',
  },
  {
    name: 'wins: payout ignores the bet',
    file: 'src/wins.js',
    find: 'const payout = PAYTABLE[first] * bet;',
    replace: 'const payout = PAYTABLE[first];',
  },
  {
    name: 'wins: pays a two-of-a-kind (every -> some)',
    file: 'src/wins.js',
    find: 'ids.every((id) => id === first)',
    replace: 'ids.some((id) => id === first)',
  },
  {
    name: 'slotmath: theoretical payout uses some() not every()',
    file: 'src/slotmath.js',
    find: 'combo.every((s) => s === combo[0])',
    replace: 'combo.some((s) => s === combo[0])',
  },
  {
    name: 'slotmath: expected value drops the payout',
    file: 'src/slotmath.js',
    find: 'mean += prob * payout;',
    replace: 'mean += prob * 0;',
  },
  {
    name: 'slotmath: house-edge sign flipped',
    file: 'src/slotmath.js',
    find: 'houseEdge: 1 - mean * nLines,',
    replace: 'houseEdge: 1 + mean * nLines,',
  },
  {
    name: 'slotmath: jackpot odds use exponent 2 not 3',
    file: 'src/slotmath.js',
    find: 'const jackpotProb = p[model.jackpotSymbol] ** reels;',
    replace: 'const jackpotProb = p[model.jackpotSymbol] ** 2;',
  },
  {
    name: 'slotmath: Monte-Carlo RTP halved',
    file: 'src/slotmath.js',
    find: 'const mean = sum / spins;',
    replace: 'const mean = sum / spins / 2;',
  },
  // these two strings moved from slotmath.js to the extracted feature module
  // in the Phase-1 de-dup (PR #17) — point at the new home so they run
  {
    name: 'feature: MAJOR jackpot coin never decided',
    file: 'src/features/holdAndWin.js',
    find: 'if (roll < odds.major)',
    replace: 'if (false)',
  },
  {
    name: 'feature: GRAND never awarded on a full board',
    file: 'src/features/holdAndWin.js',
    find: 'if (filledAll) total += model.bonus.jackpots.GRAND;',
    replace: 'if (false) total += model.bonus.jackpots.GRAND;',
  },
];

function makeTemp() {
  const dir = mkdtempSync(join(tmpdir(), 'slot-mut-'));
  for (const item of COPY) cpSync(join(REPO, item), join(dir, item), { recursive: true });
  symlinkSync(
    join(REPO, 'node_modules'),
    join(dir, 'node_modules'),
    process.platform === 'win32' ? 'junction' : 'dir',
  );
  return dir;
}

function runSuite(dir) {
  const bin = join(dir, 'node_modules', 'vitest', 'vitest.mjs');
  const res = spawnSync(process.execPath, [bin, 'run'], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 180000,
  });
  return {
    status: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    error: res.error,
  };
}

function run() {
  console.log('MUTATION PROBE — proving the test suite catches injected bugs\n');

  const baseDir = makeTemp();
  let baseStatus;
  try {
    baseStatus = runSuite(baseDir);
  } finally {
    rmSync(baseDir, { recursive: true, force: true });
  }
  if (baseStatus.status !== 0) {
    console.error('BASELINE FAILED: the clean suite does not pass. Fix tests first.');
    if (baseStatus.error) console.error(baseStatus.error);
    if (baseStatus.stdout) console.error(baseStatus.stdout);
    if (baseStatus.stderr) console.error(baseStatus.stderr);
    process.exit(1);
  }
  console.log('Baseline (clean suite) passed.\n');

  let killed = 0;
  let survived = 0;
  let skipped = 0;
  const survivors = [];

  MUTATIONS.forEach((m, i) => {
    const dir = makeTemp();
    try {
      const path = join(dir, m.file);
      const source = readFileSync(path, 'utf8');
      if (!source.includes(m.find)) {
        skipped++;
        console.log(`${String(i + 1).padStart(2)}. SKIPPED  | ${m.name}`);
        return;
      }
      writeFileSync(path, source.replace(m.find, m.replace));
      const result = runSuite(dir);
      if (result.status !== 0) {
        killed++;
        console.log(`${String(i + 1).padStart(2)}. KILLED   | ${m.name}`);
      } else {
        survived++;
        survivors.push(m.name);
        console.log(`${String(i + 1).padStart(2)}. SURVIVED | ${m.name}`);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  const executable = MUTATIONS.length - skipped;
  console.log('\n--- SUMMARY ---');
  console.log(
    `Total: ${MUTATIONS.length}  Killed: ${killed}  Survived: ${survived}  Skipped: ${skipped}`,
  );
  console.log(`Mutation score: ${executable ? ((killed / executable) * 100).toFixed(1) : 'n/a'}%`);
  if (survivors.length) {
    console.log('\nSURVIVED (test blind spots — add a test):');
    for (const s of survivors) console.log(`- ${s}`);
    process.exit(1);
  }
}

run();
