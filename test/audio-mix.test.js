import { describe, it, expect, beforeEach } from 'vitest';
import { AudioEngine } from '../src/audio.js';
import { AUDIO } from '../src/config.js';

// The mix invariants (mute = 0, unmute restores volume, volume independent of
// mute) are pure arithmetic over a gain node — testable with a stub, no
// WebAudio needed. Ramps go through setTargetAtTime (click-free mute, MDN
// best practice), so the stub records the last ramp target as the effective
// gain.
function stubGainNode() {
  return {
    gain: {
      value: 0,
      lastTarget: null,
      cancelScheduledValues() {},
      setTargetAtTime(v) {
        this.lastTarget = v;
        this.value = v;
      },
    },
  };
}

function rigged() {
  const a = new AudioEngine();
  a.ctx = { currentTime: 0 }; // enough for _rampMaster's timestamp
  a.master = stubGainNode();
  return a;
}

describe('audio mix (master volume / mute arithmetic)', () => {
  let a;
  beforeEach(() => {
    a = rigged();
  });

  it('defaults to the configured master volume', () => {
    expect(new AudioEngine().volume).toBe(AUDIO.masterVolume);
  });

  it('setVolume clamps to [0,1] and ramps the master gain', () => {
    a.setVolume(1.7);
    expect(a.volume).toBe(1);
    expect(a.master.gain.lastTarget).toBe(1);
    a.setVolume(-0.3);
    expect(a.volume).toBe(0);
    expect(a.master.gain.lastTarget).toBe(0);
  });

  it('mute ramps to 0; unmute restores the set volume', () => {
    a.setVolume(0.8);
    a.setMuted(true);
    expect(a.master.gain.lastTarget).toBe(0);
    a.setMuted(false);
    expect(a.master.gain.lastTarget).toBe(0.8);
  });

  it('setVolume while muted stores the level but keeps output silent', () => {
    a.setMuted(true);
    a.setVolume(0.9);
    expect(a.volume).toBe(0.9);
    expect(a.master.gain.lastTarget).toBe(0); // still muted
    a.setMuted(false);
    expect(a.master.gain.lastTarget).toBe(0.9); // restored on unmute
  });

  it('does not throw before init (no master node yet)', () => {
    const cold = new AudioEngine();
    expect(() => cold.setVolume(0.4)).not.toThrow();
    expect(() => cold.setMuted(true)).not.toThrow();
    expect(cold.volume).toBe(0.4);
    expect(cold.muted).toBe(true);
  });
});
