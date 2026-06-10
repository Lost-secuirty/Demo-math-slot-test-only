<!-- This template structures the PR body so the drift auditor can reconcile
     "claims" against the diff. Fill every section. -->

## What & why

<!-- What does this PR change, and why? Link the issue/ADR if any. -->

## Changes

<!-- Bullet the notable changes, by area/file. Mention anything sensitive
     (config, CI, deps, .claude/). -->

-

## AI assistance

- [ ] No AI-assisted code
- [ ] AI-assisted code present

## Slot/math risk

- [ ] Docs only
- [ ] UI/render behavior
- [ ] Slot math, RTP, RNG, or weights
- [ ] State machine or debug controls
- [ ] Recurrence module or provenance behavior
- [ ] Dependency, build, or CI

## Testing

<!-- How was this verified? -->

- [ ] `npm test` passes
- [ ] `npm run lint` clean
- [ ] `npm run build` succeeds
- [ ] Smoke test (`node verify.mjs`) — if behavior/render changed
- [ ] RTP/math changes have proof tests
- [ ] Reviewer checked silent-failure risk

## Records

- [ ] Added/updated an **ADR** in `docs/adr/` (if an architectural decision)
- [ ] Updated **`docs/LEARNINGS.md`** (if I hit a gotcha/workaround)
- [ ] Updated **`docs/SPEC.md`** (if behavior changed)

## Notes for reviewers / auditor

<!-- Anything the drift audit should know (intentional sensitive changes, etc.)
     Hit a workaround or gotcha while building this? Record it in
     docs/LEARNINGS.md (dated, newest at top) rather than only here. -->
