// =====================================================================
// audio.js — procedural WebAudio SFX + ambient dread bed. No asset files:
// every sound is synthesized at runtime so the demo is fully self-contained
// (ADR-0002).
//
// Routing:  osc/noise -> sfx ------\
//                                    >-- master -> destination
//           drone/distant -> ambience /
//
// `master` is the player volume (0 when muted). `ambience` is a separate
// channel so the Spokey dread bed can swell during the bonus independently
// of the SFX (see src/unease.js + UNEASE in config.js).
// =====================================================================

import { AUDIO } from './config.js';

// Exported for unit tests (test/audio-mix.test.js); the game uses the
// `audio` singleton below.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfx = null;
    this.ambience = null;
    this.muted = false;
    this.volume = AUDIO.masterVolume; // player-facing 0..1
    this._spinNodes = null;
    this._ambNodes = null;
  }

  // Must be called after a user gesture (browsers block audio otherwise).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.volume;
    this.master.connect(this.ctx.destination);
    // sub-channels
    this.sfx = this.ctx.createGain();
    this.sfx.gain.value = AUDIO.sfxGain;
    this.sfx.connect(this.master);
    this.ambience = this.ctx.createGain();
    this.ambience.gain.value = 0; // silent until the dread bed starts
    this.ambience.connect(this.master);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // Click-free master ramp: an instantaneous gain jump pops audibly; a ~15ms
  // setTargetAtTime decay reads as immediate to the ear without the click
  // (MDN Web Audio best practices).
  _rampMaster(target) {
    if (!this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(target, t, 0.015);
  }

  // Master volume 0..1. Independent of mute: unmuting restores this level.
  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (!this.muted) this._rampMaster(this.volume);
  }

  setMuted(m) {
    this.muted = m;
    this._rampMaster(m ? 0 : this.volume);
  }

  _now() {
    return this.ctx.currentTime;
  }

  // --- one-shot tone helper (SFX channel) ---
  _blip(freq, dur, type = 'sine', gain = 0.3, when = 0, glideTo = null) {
    if (!this.ctx || this.muted) return;
    const t = this._now() + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.sfx);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // --- continuous spin whir (filtered noise + rising pitch) ---
  startSpin() {
    if (!this.ctx || this.muted || this._spinNodes) return;
    const t = this._now();
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.linearRampToValueAtTime(900, t + 0.6);
    bp.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.15);
    noise.connect(bp);
    bp.connect(g);
    g.connect(this.sfx);
    noise.start(t);
    this._spinNodes = { noise, g };
  }

  stopSpin() {
    if (!this._spinNodes) return;
    const { noise, g } = this._spinNodes;
    const t = this._now();
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    noise.stop(t + 0.16);
    this._spinNodes = null;
  }

  reelStop(index = 0) {
    // mechanical click + thunk, pitched down per reel
    this._blip(220 - index * 18, 0.06, 'square', 0.25);
    this._blip(90, 0.12, 'sine', 0.22, 0.01);
  }

  // win chime — arpeggio whose length/pitch scales with win size
  win(size = 0) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    const count = Math.min(notes.length, 2 + Math.floor(size / 12));
    for (let i = 0; i < count; i++) {
      this._blip(notes[i], 0.18, 'triangle', 0.28, i * 0.07);
    }
  }

  coinLand() {
    this._blip(880, 0.05, 'square', 0.2);
    this._blip(1320, 0.12, 'sine', 0.22, 0.02, 1760);
  }

  coinCollect(step = 0) {
    this._blip(660 + step * 40, 0.09, 'triangle', 0.24);
  }

  jackpot(kind = 'GRAND') {
    // ascending fanfare
    const base = { MINI: 392, MINOR: 440, MAJOR: 494, GRAND: 523.25 }[kind] || 523.25;
    const seq = [1, 1.25, 1.5, 2, 2.5, 3];
    seq.forEach((m, i) => this._blip(base * m, 0.28, 'sawtooth', 0.22, i * 0.12));
    seq.forEach((m, i) => this._blip(base * m * 2, 0.28, 'triangle', 0.14, i * 0.12));
  }

  bonusTrigger() {
    [0, 0.1, 0.2, 0.34].forEach((d, i) =>
      this._blip(330 * (1 + i * 0.5), 0.3, 'sawtooth', 0.24, d, 660 * (1 + i * 0.4)),
    );
  }

  uiClick() {
    this._blip(540, 0.04, 'square', 0.18);
  }

  // ---------- ambient dread bed (Spokey) ----------
  // A low drone (two near-unison oscillators through a lowpass, slowly
  // "breathing" via an LFO) plus sparse distant tones with deliberate
  // silences. All on the ambience channel so it can swell during the bonus.
  startAmbience() {
    if (!this.ctx || this._ambNodes) return;
    const t = this._now();
    const { drone } = AUDIO;
    const oscA = this.ctx.createOscillator();
    const oscB = this.ctx.createOscillator();
    oscA.type = 'sine';
    oscB.type = 'triangle';
    oscA.frequency.value = drone.freqA;
    oscB.frequency.value = drone.freqB;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = drone.lowpassHz;
    // breathing gain modulated by a very slow LFO
    const breath = this.ctx.createGain();
    breath.gain.value = 0.5;
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = drone.lfoHz;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.3; // breathes between ~0.2 and ~0.8
    lfo.connect(lfoGain);
    lfoGain.connect(breath.gain);
    oscA.connect(lp);
    oscB.connect(lp);
    lp.connect(breath);
    breath.connect(this.ambience);
    oscA.start(t);
    oscB.start(t);
    lfo.start(t);
    // fade the channel up to its resting level
    this.ambience.gain.cancelScheduledValues(t);
    this.ambience.gain.setValueAtTime(this.ambience.gain.value, t);
    this.ambience.gain.linearRampToValueAtTime(AUDIO.ambienceBaseGain, t + 2);
    this._ambNodes = { oscA, oscB, lp, breath, lfo, lfoGain, timer: null };
    this._scheduleDistantTone();
  }

  _scheduleDistantTone() {
    if (!this._ambNodes) return;
    const delay = AUDIO.distantToneEveryMs + (Math.random() - 0.5) * 2 * AUDIO.distantToneJitterMs;
    this._ambNodes.timer = setTimeout(
      () => {
        this._distantTone();
        this._scheduleDistantTone();
      },
      Math.max(1500, delay),
    );
  }

  // a single faint, far-off tone (lowpassed, slow swell) on the ambience bus
  _distantTone() {
    if (!this.ctx || !this._ambNodes) return;
    const t = this._now();
    const freqs = AUDIO.distantToneFreqs;
    const f = freqs[(Math.random() * freqs.length) | 0];
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.ambience);
    osc.start(t);
    osc.stop(t + 1.7);
  }

  // ramp the ambience channel toward a target gain over `ms` (bonus swell)
  ambienceTo(target, ms = 1000) {
    if (!this.ambience) return;
    const t = this._now();
    this.ambience.gain.cancelScheduledValues(t);
    this.ambience.gain.setValueAtTime(this.ambience.gain.value, t);
    this.ambience.gain.linearRampToValueAtTime(Math.max(0.0001, target), t + ms / 1000);
  }

  stopAmbience() {
    if (!this._ambNodes) return;
    const { oscA, oscB, lfo, timer } = this._ambNodes;
    const t = this._now();
    if (timer) clearTimeout(timer);
    this.ambience.gain.cancelScheduledValues(t);
    this.ambience.gain.setValueAtTime(this.ambience.gain.value, t);
    this.ambience.gain.linearRampToValueAtTime(0.0001, t + 0.8);
    oscA.stop(t + 0.9);
    oscB.stop(t + 0.9);
    lfo.stop(t + 0.9);
    this._ambNodes = null;
  }
}

export const audio = new AudioEngine();
