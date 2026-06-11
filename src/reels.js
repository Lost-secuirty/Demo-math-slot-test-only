// =====================================================================
// reels.js — the spinning reel engine.
//
// Model: each reel owns a fixed logical `strip` of symbol ids and a
// floating `pos` (in cell units). Slots are Sprites whose texture +
// y are derived from `pos` every frame, giving seamless infinite
// scroll. To land a deterministic outcome we simply OVERWRITE the strip
// slice that will be visible at the integer target position, then ease
// `pos` there with an easeOutBack bounce. Motion blur scales with speed.
// =====================================================================

import { Container, Sprite, Graphics, BlurFilter } from 'pixi.js';
import { GRID, SPIN, SYMBOLS, SYMBOL_WEIGHTS, TIME } from './config.js';
import { mod, writeOutcome, visibleFromStrip } from './reelWindow.js';

const CELL = GRID.symbolSize + GRID.gap;
const ROWS = GRID.rows;
const NSLOTS = ROWS + 2; // visible rows + 2 buffers
const Y0 = ROWS * CELL; // anchor so slots 1..ROWS are visible
const STRIP_LEN = 64;

const SPINNABLE = SYMBOLS.filter((s) => s.id !== 'coin').map((s) => s.id);
const ALL_IDS = SYMBOLS.map((s) => s.id);

// weighted random symbol id (used to fill the strip with filler)
function weightedRandom(pool = ALL_IDS) {
  let total = 0;
  for (const id of pool) total += SYMBOL_WEIGHTS[id] || 1;
  let r = Math.random() * total;
  for (const id of pool) {
    r -= SYMBOL_WEIGHTS[id] || 1;
    if (r <= 0) return id;
  }
  return pool[pool.length - 1];
}

// easeOutBack — overshoots then settles, giving the reel-stop bounce
function easeOutBack(t) {
  const c1 = 1.70158,
    c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

class Reel {
  constructor(index, textures) {
    this.index = index;
    this.textures = textures;
    this.container = new Container();
    this.container.x = index * CELL;

    this.strip = Array.from({ length: STRIP_LEN }, () => weightedRandom());
    this.pos = 0;
    this.speed = 0;
    this.mode = 'idle'; // idle | accel | spin | stopping
    this.maxSpeed = 30;

    this.blur = new BlurFilter({ strength: 0, quality: 2 });
    this.blur.blurX = 0;
    this.container.filters = [this.blur];

    this.slots = [];
    for (let s = 0; s < NSLOTS; s++) {
      const sp = new Sprite(textures[this.strip[s]]);
      sp.width = GRID.symbolSize;
      sp.height = GRID.symbolSize;
      this.container.addChild(sp);
      this.slots.push(sp);
    }
    this._render();
  }

  _render() {
    const base = Math.floor(this.pos);
    const frac = this.pos - base;
    for (let s = 0; s < NSLOTS; s++) {
      const sp = this.slots[s];
      const stripIndex = mod(base + s, STRIP_LEN);
      const id = this.strip[stripIndex];
      const tex = this.textures[id];
      if (sp.texture !== tex) sp.texture = tex;
      sp.x = GRID.gap / 2;
      sp.y = (frac - s) * CELL + Y0;
    }
  }

  startSpin() {
    this.mode = 'accel';
    this.stopRequested = false;
  }

  // outcome = [topId, …, bottomId] — one symbol per visible row (ROWS long)
  setOutcome(outcome) {
    this._pendingOutcome = outcome;
  }

  requestStop() {
    this.stopRequested = true;
  }

  _beginStopping() {
    // no-outcome filler stays SPINNABLE (coin-excluded) so a free-spin
    // settle can never surface stray coins that would fake a bonus trigger
    const out =
      this._pendingOutcome || Array.from({ length: ROWS }, () => weightedRandom(SPINNABLE));
    const travel = 6 + this.index * 1.5 + Math.random() * 2;
    const target = Math.ceil(this.pos + travel);
    // land the outcome in the strip slice visible at `target`
    // (pure index math + the inverse readback live in reelWindow.js)
    writeOutcome(this.strip, target, ROWS, out);
    // fill the approach with filler so neighbours look natural
    for (let k = 1; k <= 4; k++) this.strip[mod(target + ROWS + k, STRIP_LEN)] = weightedRandom();
    this.stopFrom = this.pos;
    this.stopTarget = target;
    this.stopT = 0;
    this.stopDuration = 0.42 + (target - this.pos) * 0.012;
    this.mode = 'stopping';
  }

  update(dt) {
    switch (this.mode) {
      case 'accel':
        this.speed = Math.min(this.maxSpeed, this.speed + 90 * dt);
        this.pos += this.speed * dt;
        if (this.speed >= this.maxSpeed) this.mode = 'spin';
        break;
      case 'spin':
        this.pos += this.speed * dt;
        if (this.stopRequested) this._beginStopping();
        break;
      case 'stopping': {
        this.stopT += dt / this.stopDuration;
        if (this.stopT >= 1) {
          this.stopT = 1;
          this.pos = this.stopTarget;
          this.speed = 0;
          this.mode = 'idle';
          this._render();
          if (this.onStopped) this.onStopped(this.index);
          this.blur.blurY = 0;
          return;
        }
        const e = easeOutBack(this.stopT);
        this.pos = this.stopFrom + (this.stopTarget - this.stopFrom) * e;
        break;
      }
      default:
        this.blur.blurY = 0;
        return;
    }
    // motion blur tied to current speed
    const blurAmt = (this.speed / this.maxSpeed) * SPIN.maxBlur;
    this.blur.blurY = this.mode === 'stopping' ? Math.max(0, blurAmt * (1 - this.stopT)) : blurAmt;
    this._render();
  }

  getVisible() {
    const base = this.stopTarget != null ? this.stopTarget : Math.round(this.pos);
    return visibleFromStrip(this.strip, base, ROWS); // [top … bottom]
  }

  // world position (within reels container) of a visible cell centre
  cellCenter(row) {
    return {
      x: this.container.x + CELL / 2,
      y: row * CELL + GRID.symbolSize / 2,
    };
  }
}

export class ReelSet {
  constructor(textures) {
    this.textures = textures;
    this.root = new Container();
    this.root.x = GRID.x;
    this.root.y = GRID.y;

    // reel well background + mask
    const wellW = GRID.reels * CELL;
    const wellH = ROWS * CELL;

    const mask = new Graphics().rect(0, 0, wellW, wellH).fill(0xffffff);
    this.root.addChild(mask);
    this.reelsLayer = new Container();
    this.reelsLayer.mask = mask;
    this.root.addChild(this.reelsLayer);

    this.reels = [];
    for (let i = 0; i < GRID.reels; i++) {
      const reel = new Reel(i, textures);
      this.reelsLayer.addChild(reel.container);
      this.reels.push(reel);
    }

    this.wellW = wellW;
    this.wellH = wellH;
    this.spinning = false;
  }

  update(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000) * TIME.scale;
    for (const r of this.reels) r.update(dt);
  }

  // outcomes: grid[reel] = [top…bottom] (ROWS long) per reel; resolves when all stop
  spin(outcomes) {
    return new Promise((resolve) => {
      this.spinning = true;
      let stopped = 0;
      for (let i = 0; i < this.reels.length; i++) {
        const reel = this.reels[i];
        reel.stopTarget = null;
        reel.setOutcome(outcomes ? outcomes[i] : null);
        reel.onStopped = () => {
          stopped++;
          if (this.onReelStop) this.onReelStop(reel.index);
          if (stopped === this.reels.length) {
            this.spinning = false;
            resolve(this.getGrid());
          }
        };
        reel.startSpin();
      }
      // schedule staggered stops
      const begin = performance.now();
      const tick = () => {
        const elapsed = performance.now() - begin;
        for (let i = 0; i < this.reels.length; i++) {
          const when = SPIN.minSpinMs + i * SPIN.reelStaggerMs;
          if (elapsed >= when && !this.reels[i].stopRequested) {
            this.reels[i].requestStop();
          }
        }
        if (this.reels.some((r) => !r.stopRequested)) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  // grid[reel][row] of symbol ids (row 0=top,1=mid,2=bottom)
  getGrid() {
    return this.reels.map((r) => r.getVisible());
  }
}

export { CELL };
