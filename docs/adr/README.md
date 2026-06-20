# Architecture Decision Records (ADRs)

An ADR captures **one architecturally significant decision**: the context, the
choice, and its consequences. ADRs answer **"why"**; the spec (`docs/SPEC.md`)
answers **"what"**. They are append-only history — supersede, don't rewrite.

Format: [Michael Nygard's template](https://github.com/joelparkerhenderson/architecture-decision-record).
To add one: copy `0000-template.md` to the next number, fill it in, set Status.

| #    | Decision                                            | Status   |
| ---- | --------------------------------------------------- | -------- |
| 0001 | PixiJS v8 (WebGL) over DOM/CSS                      | Accepted |
| 0002 | Procedural assets — no binary art/audio files       | Accepted |
| 0003 | Deterministic reel engine (strip-overwrite)         | Accepted |
| 0004 | Vite + vanilla ES modules (no TypeScript)           | Accepted |
| 0005 | Free PR drift audit (no API key)                    | Accepted |
| 0006 | SessionStart hook + permission allowlist            | Accepted |
| 0007 | GitHub Pages deploy with artifact fallback          | Accepted |
| 0008 | Vitest for the deterministic core; smoke for E2E    | Accepted |
| 0009 | AGENTS.md as the canonical cross-tool contract      | Accepted |
| 0010 | Slot-math verification harness + computed RTP       | Accepted |
| 0011 | Genuine 96% TOTAL RTP; remove demo nudges           | Accepted |
| 0012 | Recurrence engine port                              | Removed  |
| 0013 | Metamorphic invariants for the slot math            | Accepted |
| 0014 | Factual-wording policy (no cert/audit claims)       | Accepted |
| 0015 | Model-driven N×M grid (explicit dimensions)         | Accepted |
| 0016 | Feature-plugin registry (pure descriptors)          | Accepted |
| 0017 | Self-improving audit loop (hard human gates)        | Accepted |
| 0018 | Portable docs/kb machine-to-machine knowledge base  | Accepted |
| 0019 | Static agent-interop surface (A2A Agent Card + MCP) | Accepted |
