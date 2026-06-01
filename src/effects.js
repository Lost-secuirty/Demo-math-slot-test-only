// =====================================================================
// effects.js — GPU juice: particle bursts, glow pulses, screen shake.
// Pools sprites to stay allocation-free during big-win storms.
// =====================================================================

import { Container, Sprite, Graphics, Rectangle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { QUALITY, COLORS } from './config.js';
import { rand, tween, Ease } from './utils.js';

// one tiny soft-dot texture reused by every particle
function makeDotTexture(renderer) {
  const g = new Graphics();
  g.circle(16, 16, 14).fill({ color: 0xffffff });
  g.circle(16, 16, 14).stroke({ color: 0xffffff, alpha: 0.4, width: 4 });
  const tex = renderer.generateTexture({ target: g, resolution: 1, frame: new Rectangle(0, 0, 32, 32) });
  g.destroy();
  return tex;
}

export class Effects {
  constructor(app) {
    this.app = app;
    this.dot = makeDotTexture(app.renderer);
    this.layer = new Container();
    this.layer.zIndex = 50;
    this.particles = [];
    this.pool = [];
    app.ticker.add(this._update, this);

    // shake state
    this.shake = { amt: 0, decay: 0, target: null };
  }

  _spawn() {
    let p = this.pool.pop();
    if (!p) {
      p = new Sprite(this.dot);
      p.anchor.set(0.5);
    }
    this.layer.addChild(p);
    return p;
  }

  burst(x, y, opts = {}) {
    const n = Math.min(opts.count || QUALITY.particlesPerBurst, QUALITY.maxParticles - this.particles.length);
    const colors = opts.colors || [COLORS.coin, 0xfff2b0, COLORS.win, 0xffffff];
    for (let i = 0; i < n; i++) {
      const p = this._spawn();
      const ang = rand(0, Math.PI * 2);
      const spd = rand(opts.minSpeed || 120, opts.maxSpeed || 420);
      p.x = x; p.y = y;
      p.tint = colors[(Math.random() * colors.length) | 0];
      p.alpha = 1;
      const sc = rand(0.3, 0.9) * (opts.scale || 1);
      p.scale.set(sc);
      this.particles.push({
        sp: p,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - rand(60, 180),
        life: 0,
        ttl: rand(0.5, 1.1),
        grav: opts.grav ?? 620,
        baseScale: sc,
      });
    }
  }

  fountain(x, y, colors) {
    this.burst(x, y, { count: 14, minSpeed: 60, maxSpeed: 240, colors, scale: 0.8 });
  }

  _update(ticker) {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life += dt;
      const k = pt.life / pt.ttl;
      if (k >= 1) {
        this.layer.removeChild(pt.sp);
        this.pool.push(pt.sp);
        this.particles.splice(i, 1);
        continue;
      }
      pt.vy += pt.grav * dt;
      pt.sp.x += pt.vx * dt;
      pt.sp.y += pt.vy * dt;
      pt.sp.alpha = 1 - k * k;
      pt.sp.scale.set(pt.baseScale * (1 - k * 0.4));
      pt.sp.rotation += dt * 4;
    }

    // screen shake decay
    if (this.shake.amt > 0.1 && this.shake.target) {
      this.shake.target.x = this.shake.baseX + rand(-this.shake.amt, this.shake.amt);
      this.shake.target.y = this.shake.baseY + rand(-this.shake.amt, this.shake.amt);
      this.shake.amt *= this.shake.decay;
    } else if (this.shake.target) {
      this.shake.target.x = this.shake.baseX;
      this.shake.target.y = this.shake.baseY;
      this.shake.target = null;
    }
  }

  screenShake(target, intensity = QUALITY.shakeIntensity, decay = 0.9) {
    if (!this.shake.target) {
      this.shake.baseX = target.x;
      this.shake.baseY = target.y;
    }
    this.shake.target = target;
    this.shake.amt = Math.max(this.shake.amt, intensity);
    this.shake.decay = decay;
  }

  // pulse a glow on a display object for a while, then remove it
  async glowPulse(obj, { color = COLORS.win, ms = 900, repeat = 2 } = {}) {
    const glow = new GlowFilter({
      color,
      distance: 22,
      outerStrength: 0,
      innerStrength: 0,
      quality: QUALITY.glowQuality,
    });
    const prev = obj.filters || [];
    obj.filters = Array.isArray(prev) ? [...prev, glow] : [prev, glow];
    for (let r = 0; r < repeat; r++) {
      await tween(ms / repeat, (t) => {
        const v = Math.sin(t * Math.PI);
        glow.outerStrength = v * 4;
      }, Ease.linear);
    }
    obj.filters = prev;
  }
}
