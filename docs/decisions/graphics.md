# Graphics & Render Decisions

"Coins: Hold & Win" — visual/render design log. See `src/symbols.js`, `src/reels.js`, `src/effects.js`, `src/ui.js`, `src/cabinet.js`.

---

## PixiJS v8 as the renderer

**Decision:** PixiJS v8 (not Three.js, raw Canvas 2D, or WebGL directly).

**Why:** Good 2D sprite/graphics performance, active maintenance, solid texture/filter API that fits slot machine UI patterns. v8 is a clean ES module build with no legacy cruft.

**Current version:** ~v8.7 in package.json. Latest is v8.19.0 (adds GraphicsPath, HTML-in-Canvas textures, Canvas 2D renderer fallback). **Upgrade is backlogged.**

**Status:** Active.

---

## Procedural symbol drawing — no binary image assets

**Decision:** All symbols are drawn procedurally in `src/symbols.js` using PixiJS Graphics. No PNG/SVG symbol sheets.

**Why:** ADR-0002 (procedural-by-default). ADR-0021 (pending) will permit binary visual assets in the render layer — when merged, transparent-PNG symbols from Canva become an option. Until then, procedural only.

**Status:** Active / evolving. Will revisit after ADR-0021 merges.

---

## FillGradient API — options-object form (PixiJS v8)

**Decision:** Use the options-object constructor:

```js
new FillGradient({ type: 'linear'|'radial', colorStops: [{offset, color}], ... })
```

Pass as `fill(gradient)` or `fill({ fill: gradient })`.

**Why:** PixiJS v8 deprecated the old positional-param form from v7. The options-object form works for both linear and radial on v8.x (verified against ^8.19 API). Using the old form silently fails or produces incorrect output.

**Status:** Active.

---

## pixi-filters v6 — submodule import paths

**Decision:** Import filters via submodule path:

```js
import { AdvancedBloomFilter } from 'pixi-filters/advanced-bloom';
```

NOT the old v5 scoped-package form (`@pixi/filter-advanced-bloom`).

**Why:** pixi-filters v6 restructured exports to submodule paths. The v5 scoped packages do not exist in v6. Using v5 paths causes import errors at runtime. **pixi-filters is already a dep — no new install needed for AdvancedBloomFilter.**

**Status:** Active. Current version: 6.1.5.

---

## generateTexture — always pass frame Rectangle

**Decision:** When calling `renderer.generateTexture(graphics, { frame: new Rectangle(x, y, w, h) })`, always provide the explicit frame.

**Why:** Without the frame, PixiJS infers bounds from the Graphics object's bounding box, which can be wrong-sized or zero for shapes with strokes. Explicit frame is the safe call.

**Status:** Active.

---

## No committed PNG snapshots for visual regression

**Decision:** Visual regression uses code-based assertions (computed values via `window.__slot.ui.getThemeDiagnostics()` and `getReadouts()`), not committed PNG snapshots.

**Why:** PNG snapshots are binary test fixtures (violates ADR-0002/ADR-0021 math-test-layer purity). Canvas/WebGL rendering differs between GPU hardware and software-WebGL headless — snapshot comparisons flake. Playwright screenshots are uploaded as artifacts for human review only, not asserted in CI.

**Status:** Active. The `getThemeDiagnostics()` / `getReadouts()` seam is the gating mechanism.

---

## Canvas 2D renderer fallback (PixiJS v8.16+)

**Note:** PixiJS v8.16+ has a Canvas 2D renderer fallback for environments where WebGL is unavailable. This is potentially useful for headless testing but not relied on in production. No decision made yet.

**Status:** Under investigation. Track in backlog.

---

## Bloom / post-processing — pixi-filters AdvancedBloomFilter

**Decision (planned, PR-3d):** Use `AdvancedBloomFilter` from `pixi-filters/advanced-bloom` for post-processing bloom effect. Respect `QUALITY.godrays` quality flag. Low headless-WebGL FPS is not a regression.

**Why:** No new dep needed (pixi-filters already installed). v6 submodule import is the correct path.

**Status:** Planned (PR-3d). Not yet implemented.
