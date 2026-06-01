// =====================================================================
// audio.js — procedural WebAudio SFX. No asset files: every sound is
// synthesized at runtime so the demo is fully self-contained.
// =====================================================================

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._spinNodes = null;
  }

  // Must be called after a user gesture (browsers block audio otherwise).
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _now() { return this.ctx.currentTime; }

  // --- one-shot tone helper ---
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
    g.connect(this.master);
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
    noise.connect(bp); bp.connect(g); g.connect(this.master);
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
      this._blip(330 * (1 + i * 0.5), 0.3, 'sawtooth', 0.24, d, 660 * (1 + i * 0.4)));
  }

  uiClick() {
    this._blip(540, 0.04, 'square', 0.18);
  }
}

export const audio = new AudioEngine();
