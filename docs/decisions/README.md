# Decision Logs

Incremental design decisions for "Coins: Hold & Win." Distinct from ADRs.

**ADRs** (`docs/adr/`) = big architectural pivots: changing the agent-interop phase, adopting a new rendering library, switching testing strategies. Requires a formal record because reversing it would be costly.

**Decision logs** (this directory) = specific implementation choices within an established direction: why a particular PixiJS API was chosen, audio envelope tuning rationale, gameplay parameter choices, filter configuration. Useful for onboarding and avoiding re-litigating settled choices.

## Files

- `audio.md` — sound design decisions (Web Audio API, synth approach, effects)
- `graphics.md` — render and visual decisions (PixiJS APIs, filters, shaders, gradients)
- `gameplay.md` — game mechanics and math decisions (RTP, grid, bonus, bet system)
