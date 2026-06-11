// =====================================================================
// cabinet.js — passive Spokey "cabinet" chrome: side pillars, a top marquee
// with the SPOKEY title, a bottom console, and LED-style CREDITS / WIN panels
// in the bottom corners (where the HUD's default readouts sit, which the
// spokey theme hides). Purely decorative and theme-gated — it lives at zIndex
// 5 (behind the reels and HUD) and is hidden for every non-Spokey theme, so
// the classic look is untouched. Reads only COLORS (Spokey keys, with
// fallbacks); never touches game/money state.
// =====================================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { DESIGN, COLORS } from './config.js';
import { fmt } from './utils.js';

function ledText(text, size, fill) {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Consolas, "Courier New", monospace',
      fontSize: size,
      fontWeight: '700',
      fill,
      align: 'center',
      letterSpacing: 2,
    }),
  });
}

export class Cabinet {
  constructor(world) {
    this.layer = new Container();
    this.layer.zIndex = 5;
    this.layer.visible = false;
    world.addChild(this.layer);
    this._built = false;
    this._readout = { credits: 0, win: 0, bet: 0 };
  }

  paint(themeName) {
    const on = themeName === 'spokey';
    this.layer.visible = on;
    if (!on) return;
    if (!this._built) this._build();
    this._recolor();
  }

  _build() {
    const W = DESIGN.width;
    const H = DESIGN.height;

    // structural chrome (pillars + top/bottom panels) — one Graphics we redraw
    this.chrome = new Graphics();
    this.layer.addChild(this.chrome);
    this._dims = { W, H, pillar: 150, topH: 150, consoleY: 970 };

    // SPOKEY marquee title
    this.title = new Text({
      text: 'SPOKEY',
      style: new TextStyle({
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontSize: 92,
        fontWeight: '900',
        fill: COLORS.marquee ?? 0x8a2f22,
        align: 'center',
        letterSpacing: 10,
        stroke: { color: 0x140405, width: 8 },
      }),
    });
    this.title.anchor.set(0.5);
    this.title.position.set(W / 2, 78);
    this.title.filters = [
      new GlowFilter({
        color: COLORS.ledOn ?? 0xd14a2a,
        distance: 16,
        outerStrength: 2,
        quality: 0.2,
      }),
    ];
    this.layer.addChild(this.title);

    // LED readout panels — CREDITS (bottom-left) + WIN (bottom-right), at the
    // HUD's own corner-readout spots (clear of the SPIN / AUTO controls).
    this.readoutBox = new Graphics();
    this.layer.addChild(this.readoutBox);
    this._segs = {};
    const boxW = 330;
    const boxH = 66;
    const by = 1206;
    const spots = { credits: 36, win: W - 36 - boxW };
    for (const key of ['credits', 'win']) {
      const x = spots[key];
      const cap = ledText(key.toUpperCase(), 18, COLORS.ledOff ?? 0x2a1410);
      cap.anchor.set(0, 0.5);
      cap.position.set(x + 18, by + boxH / 2);
      const val = ledText('0', 34, COLORS.ledOn ?? 0xd14a2a);
      val.anchor.set(1, 0.5);
      val.position.set(x + boxW - 18, by + boxH / 2);
      this._segs[key] = { cap, val, x, boxW, boxH, by };
      this.layer.addChild(cap, val);
    }
  }

  _recolor() {
    const { W, H, pillar, topH, consoleY } = this._dims;
    const body = COLORS.cabinet ?? 0x120a10;
    const edge = COLORS.cabinetEdge ?? 0x4a2e22;
    const g = this.chrome;
    g.clear();
    // top marquee panel
    g.rect(0, 0, W, topH).fill({ color: body }).stroke({ color: edge, width: 5 });
    // side pillars
    g.rect(0, 0, pillar, H).fill({ color: body }).stroke({ color: edge, width: 5 });
    g.rect(W - pillar, 0, pillar, H)
      .fill({ color: body })
      .stroke({ color: edge, width: 5 });
    // bottom console
    g.rect(0, consoleY, W, H - consoleY)
      .fill({ color: body })
      .stroke({ color: edge, width: 5 });
    // a faint ember rail down each pillar (the cabinet's red LED trim)
    const rail = COLORS.ledOn ?? 0xd14a2a;
    g.rect(pillar - 10, topH, 4, H - topH).fill({ color: rail, alpha: 0.5 });
    g.rect(W - pillar + 6, topH, 4, H - topH).fill({ color: rail, alpha: 0.5 });

    if (this.title) this.title.style.fill = COLORS.marquee ?? 0x8a2f22;
    // LED readout panels + colors
    if (this.readoutBox) {
      const rb = this.readoutBox;
      rb.clear();
      for (const key of ['credits', 'win']) {
        const s = this._segs[key];
        rb.roundRect(s.x, s.by, s.boxW, s.boxH, 10)
          .fill({ color: 0x0a0406 })
          .stroke({ color: COLORS.ledOff ?? 0x2a1410, width: 2 });
        s.cap.style.fill = COLORS.ledOff ?? 0x2a1410;
        s.val.style.fill = COLORS.ledOn ?? 0xd14a2a;
      }
    }
    this._renderReadout();
  }

  setReadout(patch) {
    Object.assign(this._readout, patch);
    if (this._built) this._renderReadout();
  }

  _renderReadout() {
    if (!this._segs) return;
    this._segs.credits.val.text = fmt(this._readout.credits);
    this._segs.win.val.text = this._readout.win > 0 ? fmt(this._readout.win) : '—';
  }
}
