# 0002. Procedural assets — no binary art or audio files

- **Status:** Accepted (superseded in part by ADR-0021)
- **Date:** 2026-06-01

> **Superseded in part by ADR-0021 (2026-06-23):** Binary _visual_ assets are now
> permitted in the render layer (files that import `pixi.js`). The procedural-by-default
> constraint still applies to **audio** (no sampled files) and is absolute for the
> **math/test layer** (no Pixi imports, no binary assets, ever).

## Context

We needed glossy classic-style symbols and casino SFX fast, in an ephemeral
container, without shipping copyrighted slot art/sound or managing binary assets.

## Decision

Generate everything at runtime: symbols are drawn with Pixi `Graphics`
(gradients + gloss highlights) and baked to textures (`src/symbols.js`); all SFX
are synthesized with the WebAudio API (`src/audio.js`). No image or audio files
in the repo.

## Consequences

- Zero asset-licensing risk; crisp at any resolution; tiny repo.
- Fully self-contained — works offline, nothing to host.
- Cost: art fidelity is bounded by what's reasonable to vector-draw; a future
  "real art" skin would be a separate, larger effort.

## Alternatives considered

- **Ship PNG/MP3 assets** — licensing risk, binary bloat, asset pipeline.
- **Emoji glyphs** — inconsistent across platforms, less "premium" look.
