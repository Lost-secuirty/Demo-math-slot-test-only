// =====================================================================
// unease.js — the Spokey "just out of reach" dread layer. VISUAL/AUDIO ONLY.
// It decorates the Hold & Win bonus timeline (vignette, light flicker, a
// distant watcher that's sometimes slightly closer) and swells the ambient
// dread bed. It NEVER reads or writes the bonus ledger (coin amounts, totals,
// respins) — the money seam is load-bearing (docs/LEARNINGS.md). All knobs
// live in UNEASE (config.js); defaults are rare so the game reads as a normal
// slot that's subtly wrong, not a jump-scare.
// =====================================================================

import { Container, Graphics, Sprite, Rectangle } from 'pixi.js';
import { DESIGN, UNEASE, AUDIO } from './config.js';
import { audio } from './audio.js';
import { tween } from './utils.js';

// soft glowing eye-pair, baked once and reused (procedural — ADR-0002)
function makeWatcherTexture(renderer) {
  const g = new Graphics();
  const eye = (cx) => {
    g.ellipse(cx, 40, 34, 20).fill({ color: 0x2a0d06, alpha: 0.6 }); // socket shadow
    g.ellipse(cx, 40, 16, 11).fill({ color: 0xff6a2a, alpha: 0.9 }); // glow
    g.ellipse(cx, 40, 7, 9).fill({ color: 0xffe08a }); // bright pupil
  };
  eye(56);
  eye(144);
  const tex = renderer.generateTexture({
    target: g,
    resolution: 1,
    frame: new Rectangle(0, 0, 200, 80),
  });
  g.destroy();
  return tex;
}

export class Unease {
  constructor(app, world) {
    this.app = app;
    this.enabled = false;

    this.layer = new Container();
    this.layer.zIndex = 82; // above the bonus board (80), below effects (90)
    this.layer.eventMode = 'none';
    this.layer.visible = false;
    world.addChild(this.layer);

    // edge vignette (alpha tweened by start/stop)
    this.vignette = new Graphics();
    this._drawVignette(this.vignette);
    this.vignette.alpha = 0;
    this.layer.addChild(this.vignette);

    // full-screen dim used for light flicker dips
    this.flash = new Graphics().rect(0, 0, DESIGN.width, DESIGN.height).fill({ color: 0x000000 });
    this.flash.alpha = 0;
    this.layer.addChild(this.flash);

    this.watcherTex = makeWatcherTexture(app.renderer);
    this.watcher = null;
    this._flickering = false;
  }

  setEnabled(b) {
    this.enabled = b;
    if (!b) this._hardReset();
  }

  // build a 4-edge inward-fading darkness (corners deepest) — a cheap vignette
  _drawVignette(g) {
    const W = DESIGN.width;
    const H = DESIGN.height;
    const depth = 380;
    const bands = 20;
    g.clear();
    for (let i = 0; i < bands; i++) {
      const t = 1 - i / bands; // 1 at the edge -> 0 inward
      const a = t * t * 0.6;
      const off = (depth / bands) * i;
      const bw = depth / bands + 1;
      g.rect(0, off, W, bw).fill({ color: 0x000000, alpha: a }); // top
      g.rect(0, H - off - bw, W, bw).fill({ color: 0x000000, alpha: a }); // bottom
      g.rect(off, 0, bw, H).fill({ color: 0x000000, alpha: a }); // left
      g.rect(W - off - bw, 0, bw, H).fill({ color: 0x000000, alpha: a }); // right
    }
  }

  // ---- bonus lifecycle ----
  start() {
    if (!this.enabled || !UNEASE.enabled) return;
    this._removeWatcher();
    this.layer.visible = true;
    this.flash.alpha = 0;
    audio.ambienceTo(UNEASE.ambienceBonusGain, UNEASE.swellMs);
    tween(UNEASE.swellMs, (t) => {
      this.vignette.alpha = t * UNEASE.vignetteAlpha;
    });
  }

  stop() {
    if (!this.layer.visible) return;
    // recede ambience back to its resting level
    audio.ambienceTo(AUDIO.ambienceBaseGain, UNEASE.swellMs);
    const fromV = this.vignette.alpha;
    tween(UNEASE.swellMs, (t) => {
      this.vignette.alpha = fromV * (1 - t);
    }).then(() => {
      this.layer.visible = false;
      this._removeWatcher();
    });
  }

  // a brief light dip, gated by chance — call on each respin event
  async maybeFlicker() {
    if (!this.enabled || !UNEASE.enabled || this._flickering) return;
    if (Math.random() > UNEASE.flickerChancePerRespin) return;
    this._flickering = true;
    await tween(UNEASE.flickerDipMs, (t) => {
      this.flash.alpha = 0.55 * Math.sin(t * Math.PI);
    });
    this.flash.alpha = 0;
    this._flickering = false;
  }

  // maybe reveal a distant watcher just inside one edge, very faint
  spawnWatcher() {
    if (!this.enabled || !UNEASE.enabled) return;
    if (this.watcher || Math.random() > UNEASE.watcherChance) return;
    const sp = new Sprite(this.watcherTex);
    sp.anchor.set(0.5);
    sp.alpha = UNEASE.watcherBaseAlpha;
    sp.scale.set(0.8);
    // park near a random edge, biased to the dark margins
    const side = (Math.random() * 4) | 0;
    const m = 120;
    const pos = [
      [DESIGN.width / 2, m], // top
      [DESIGN.width / 2, DESIGN.height - m], // bottom
      [m, DESIGN.height / 2], // left
      [DESIGN.width - m, DESIGN.height / 2], // right
    ][side];
    sp.position.set(pos[0], pos[1]);
    this._watcherHome = { x: pos[0], y: pos[1], cx: DESIGN.width / 2, cy: DESIGN.height / 2 };
    this.layer.addChild(sp);
    this.watcher = sp;
    this._approachStep = 0;
  }

  // nudge the watcher slightly toward center + a touch brighter — the calibrated
  // "it's closer now". Bounded so it never reaches you within a bonus.
  maybeApproach() {
    if (!this.watcher || !this.enabled) return;
    if (this._approachStep >= 2) return;
    if (Math.random() > UNEASE.watcherApproachChance) return;
    this._approachStep++;
    const h = this._watcherHome;
    const k = this._approachStep * 0.22; // small fraction of the way in
    const tx = h.x + (h.cx - h.x) * k;
    const ty = h.y + (h.cy - h.y) * k;
    const fromA = this.watcher.alpha;
    const toA = Math.min(0.5, UNEASE.watcherBaseAlpha + this._approachStep * 0.12);
    const fromX = this.watcher.x;
    const fromY = this.watcher.y;
    tween(700, (t, e) => {
      this.watcher.x = fromX + (tx - fromX) * e;
      this.watcher.y = fromY + (ty - fromY) * e;
      this.watcher.alpha = fromA + (toA - fromA) * t;
      this.watcher.scale.set(0.8 + this._approachStep * 0.08);
    });
  }

  _removeWatcher() {
    if (this.watcher) {
      this.layer.removeChild(this.watcher);
      this.watcher.destroy();
      this.watcher = null;
    }
  }

  _hardReset() {
    this._removeWatcher();
    this.vignette.alpha = 0;
    this.flash.alpha = 0;
    this.layer.visible = false;
  }
}
