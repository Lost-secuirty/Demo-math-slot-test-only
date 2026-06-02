# AGENTS.md

Canonical contract for any AI coding agent working in this repo (Claude reads
`CLAUDE.md`, which points here). Keep this lean — every line must change agent
behavior.

**"Coins: Hold & Win"** — a Playson-style 3×3 slot. Pure entertainment demo,
**play money only, no real wagering**.

## Commands

```bash
npm install          # deps
npm run dev          # Vite dev server (HMR)
npm run build        # static bundle -> dist/
npm run preview      # serve the build on :4173
npm run lint         # eslint (src, scripts, test, verify.mjs)
npm run format       # prettier --write
npm test             # vitest run (unit tests)
npm run audit        # drift audit on the current branch (see docs/DRIFT-AUDIT.md)
```

## Testing

- **Unit (Vitest):** `npm test` — pure, Pixi-free logic in `test/` (`wins`,
  `outcome`, `config` invariants, `utils`). Add tests here for any change to the
  money math, RNG, or config.
- **E2E smoke (Playwright):** `npm run build && npm run preview &` then
  `node verify.mjs` — loads the app, spins, runs the bonus, checks 0 console
  errors. Needs Chromium (`npx playwright install chromium`).
- Never skip/`.only` tests to make a suite pass (Working Agreement #4).

## Project structure

- **Stack:** PixiJS v8 (WebGL) + pixi-filters, Vite 6, vanilla ES modules (no
  TypeScript). WebAudio for SFX. lil-gui + stats.js for the debug panel.
- **`src/`** — `main.js` (boot + game-state machine), `reels.js` (reel engine),
  `symbols.js` (procedural textures), `wins.js` (payline eval), `outcome.js`
  (weighted RNG), `holdAndWin.js` (bonus), `effects.js`, `ui.js`, `audio.js`,
  `debug.js`, and **`config.js` — all tunables live here.**
- **`scripts/audit-drift.mjs`**, **`test/`**, **`verify.mjs`**, **`docs/`**
  (`SPEC.md`, `adr/`, `LEARNINGS.md`, `DRIFT-AUDIT.md`, `AGENT-SCAFFOLDING.md`).

## Code style

- Prettier-enforced: single quotes, 2-space, semicolons, width 100, trailing
  commas. Run `npm run format`; don't hand-fight it.
- ES modules only. Keep render code (imports `pixi.js`) separate from pure logic
  (no Pixi imports) so the latter stays unit-testable.
- Tunables go in `config.js`, never hard-coded in modules.
- No stray `console.log`/`debugger` in `src/` (the drift audit flags them).

## Boundaries — do NOT touch without explicit sign-off

- `package-lock.json`, `dist/`, `node_modules/` — generated; never hand-edit.
- `.claude/settings.json` and hooks — agent self-config; change only when the
  user explicitly asks (the harness gates this anyway).
- Don't add binary art/audio assets — assets are procedural by design (ADR-0002).
- Don't introduce real-money / wagering / payment anything.

## Git workflow

- Work on a feature branch; never commit straight to `main`.
- Conventional, imperative commit subjects + a short bullet body explaining
  **why**. Keep the tree clean and pushed (a Stop hook enforces this).
- Open a **draft PR**; the drift-audit workflow comments on every PR.
- Significant decisions get an ADR in `docs/adr/`; gotchas go in
  `docs/LEARNINGS.md`.

## Working Agreement (applies to humans AND every agent/subagent)

1. **Never declare something impossible.** On failure, web-search the latest
   updates, causes, and workarounds before reporting a dead end.
2. **Document findings** — append fixes/gotchas/API changes to
   `docs/LEARNINGS.md` with the date.
3. **Stuck-bug protocol** — if a bug isn't a fast fix, or the same thing errors
   twice, look up known edge cases / similar issues before guessing again.
4. **No shortcuts** — never cheat, skip, gut, or cut scope to save time. Plan
   fully, then do.
5. **Verify before claiming done — "runs" is not "works".** Run the relevant
   check and show the evidence (test output, the actual value/behavior), not just
   that it compiled or loaded. Don't report success you haven't observed; if a
   gate (CI, deploy) isn't confirmed yet, say "running/unconfirmed," not "green."
6. **Don't declare a tool or approach broken on the first failure.** Re-check the
   inputs/parameters and retry once with corrections before concluding it doesn't
   work — most "tool is broken" turns out to be a wrong argument.
