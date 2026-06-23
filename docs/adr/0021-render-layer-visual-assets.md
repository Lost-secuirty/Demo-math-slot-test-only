# 0021. Render-layer visual assets — binary files permitted in the render layer

- **Status:** Accepted
- **Date:** 2026-06-23
- **Amends / partially supersedes:** ADR-0002 (procedural-by-default assets)

## Context

ADR-0002 established procedural-by-default assets for practical reasons: no art
pipeline, no licensing risk, a tiny repo. That constraint served the early build
well. As the project matures the render layer (everything that imports `pixi.js`)
can benefit from higher-fidelity art: richer symbol textures, polished
backgrounds, and visual chrome produced in tools like Canva.

At the same time the project has a hard invariant: a pure, deterministic math
layer (the `src/slotmath.js` / `src/wins.js` / `src/outcome.js` /
`src/reelWindow.js` cluster and all `test/` files) with a pinned, verified RTP
(0.96081525). Any blurring of the render/math boundary — letting visual deps or
binary fixtures reach the math layer — would undermine testability and the RTP
proof.

## Decision

The render layer may use **binary visual assets** (PNG, JPG, sprite sheets) and
new visual runtime dependencies (additional Pixi plugins, image loaders). The
ADR-0002 procedural default is relaxed for visuals in that layer only.

The **math/test layer firewall is permanent and absolute**:

- No `pixi.js`, `pixi-filters`, or `@pixi/*` imports in pure-logic modules or
  test files.
- No binary assets of any kind used as test fixtures.
- The verified pinned RTP (0.96081525), its computation in `slotmath.js`, and the
  tests that pin it (`test:proof`, `rtp-target`) are immutable — no visual change
  may touch them.

Audio stays procedural (Web Audio API, no sampled files) unless a future ADR
explicitly widens this decision from "visual" to "AV."

The 1 MB large-file gate, the secret/PII gate, and the asset-licence gate still
apply to every committed asset.

**Bright-line test:** an asset or visual dep is permitted iff it is reachable only
from the render layer and never from a math/test file; the pinned RTP math is
never modified; and the math/test suite runs with zero binary assets and zero
render deps installed.

## Consequences

- **Positive:** Canva-produced transparent-PNG symbols, polished backgrounds, and
  visual chrome can be committed and deployed. Art fidelity is no longer bounded
  by what's reasonable to draw with PixiJS `Graphics`.
- **Positive:** Clears the way for Phase 3 art polish PRs (gradient symbol
  shading, animated background, richer spectacle).
- **Negative:** Binary assets increase repo size and require licence tracking.
  Mitigated by the 1 MB large-file gate and the licence gate.
- **Negative:** The render/math firewall must be lint-enforced (PR-1c: ESLint
  `no-restricted-imports` rule banning Pixi in pure-core files) or the boundary
  erodes silently.

## Alternatives considered

- **Keep ADR-0002 as-is** — art stays procedural. Simpler but bounds fidelity
  permanently; misses Canva as a practical force-multiplier.
- **Widen to all assets including audio** — too broad; sampled audio brings codec,
  licence, and size concerns that aren't worth opening up yet.
