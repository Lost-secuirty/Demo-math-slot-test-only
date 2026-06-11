# 0016. Feature-plugin registry (pure descriptors, renderer map by id)

- **Status:** Accepted
- **Date:** 2026-06-11

## Context

The roadmap's end state is a reusable slot core where game features plug in.
After ADR-0015 (model-driven N×M) the last hardcoded coupling was the feature
itself: `main.js` inlined the trigger rule (`coinCount >= BONUS.triggerCount`)
and called `BonusGame` by name, and `slotmath.js` repeated the same trigger
rule inline — two copies of the rule, and adding a second feature meant
editing the orchestrator's branching.

Constraints: behavior byte-identical (the seeded RTP pin is the gate); pure
logic stays Pixi-free; `main.js` remains the orchestrator (no headless-engine
extraction yet, per the operator's scoping).

## Decision

1. **A feature is a pure descriptor:** `{ id, checkTrigger(cells, model),
play(triggerCells, model, rng) }`. No Pixi, no globals, rng injected.
   `features/holdAndWin.js` exports `holdAndWinFeature` — the first plug-in.
2. **`checkTrigger` is the ONE trigger rule.** It consumes no rng, only
   counts cells, and passes the same array through as the bonus seed. The
   live orchestrator reaches it via the registry; the math harness imports
   it directly — both run the identical rule.
3. **`src/features/registry.js`** holds registration (`registerFeature` with
   loud validation: id/shape/duplicates), lookup, and `findTriggered(cells,
model)` (registration order = priority). The game self-registers
   Hold & Win on import.
4. **Renderers stay out of the registry.** `main.js` owns a
   `featureRenderers` map (`feature.id → Pixi scene`) and dispatches
   `renderers[triggered.feature.id].run(payload.cells, bet)`. Pure contract
   and render binding never mix.
5. The orchestrator snapshots `defaultModel()` **per spin** for the trigger
   check, so live debug-slider edits to config keep applying exactly like
   the old direct `BONUS.triggerCount` read.

## Consequences

- Adding a feature = one pure module + `registerFeature(...)` + one renderer
  map entry. No edits to the trigger logic of the orchestrator or harness.
- The trigger rule cannot drift between the live game and the simulation —
  it is the same imported function (`test/registry.test.js` also pins the
  registry decision against the old inline rule across seeded coin counts).
- Behavior unchanged, proven: seeded `monteCarloFullGame` outputs (12M-spin
  headline included) are `===`-identical through the registry path; 107/107
  tests green.
- The math harness deliberately does NOT consult the registry (it imports
  the feature's functions): simulations stay independent of global
  registration state. A multi-feature simulation would revisit this.
- `main.js`'s feature branch is now generic, but win _presentation_
  (celebrate/banners) is still shared — fine for one feature, a follow-up
  if a future feature needs its own presentation flow.

## Alternatives considered

- **Registry owns renderers too** — couples pure modules to Pixi, breaking
  the repo's pure/render firewall and unit-testability.
- **Event-bus / state machine in main.js** — the right shape if features
  multiply, but a bigger orchestrator rewrite than one feature justifies;
  the operator scoped main.js extraction out.
- **Keep the inline rule, registry later** — leaves the trigger rule
  duplicated (live vs sim), which is exactly the drift class Phase 1/2
  eliminated elsewhere.
