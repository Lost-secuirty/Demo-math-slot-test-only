# Audio Design Decisions

"Coins: Hold & Win" — sound design log. See `src/audio.js`.

---

## Web Audio API — no external library

**Decision:** Use the browser's native Web Audio API directly. No Howler.js, Tone.js, or other audio libraries.

**Why:** Keeps the bundle lean (no dep), no license concerns, and the sound design is procedural (algorithmically generated tones) not sample-playback. An abstraction library would add complexity without payoff here.

**Status:** Active.

---

## Procedural synth only — no sampled audio

**Decision:** All sounds are generated algorithmically (oscillators, envelope shaping, gain curves). No `.mp3`/`.ogg`/`.wav` assets.

**Why:** ADR-0002 (procedural-by-default assets). ADR-0021 relaxes this for the render layer for _visual_ assets — audio was not included in that relaxation. Sampled audio remains out of scope until ADR-0021 is explicitly widened from "visual" to "AV."

**Status:** Active. Revisit if Scott widens ADR-0021.

---

## AudioContext lifecycle — suspend on hidden tab

**Decision:** Suspend `AudioContext` on `document.visibilitychange` (hidden) and resume on visible. Do not leave the context running in background tabs.

**Why:** Browsers auto-suspend AudioContext on tab hide as a power-saving measure. Resuming on visibility prevents audio gaps/cuts that confuse users.

**Status:** Active.

---

## Layer-based sound design

**Decision:** Separate oscillator layers for different event types (spin start, reel stop, win, bonus trigger, big-win). Each layer is independently gated (gain node to zero vs disconnect).

**Why:** Easier to tune individual sounds without cross-contamination. Bonus/big-win sounds need to layer over spin sounds without cutting them.

**Status:** Active. Planned expansion in PR-3e (richer envelopes, more layers).

---

## audio-mix.test.js coverage gate

**Decision:** `audio.js` has a dedicated test file (`test/audio-mix.test.js`) that must stay green for any audio change.

**Why:** Audio logic is invisible to the visual regression suite. The test file provides a basic sanity gate for critical audio code paths.

**Status:** Active.
