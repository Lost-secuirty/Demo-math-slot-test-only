// =====================================================================
// symbols.js — procedurally drawn glossy symbol textures.
// No image assets: every symbol is vector-drawn with Pixi Graphics and
// baked to a texture so reels can use cheap, recyclable Sprites.
// =====================================================================

import { Container, Graphics, Text, TextStyle, Rectangle } from 'pixi.js';
import { GRID, COLORS } from './config.js';

const S = GRID.symbolSize;
const C = S / 2; // center

// soft elliptical highlight for that high-gloss Playson sheen
function gloss(g, cx, cy, rx, ry) {
  g.ellipse(cx - rx * 0.22, cy - ry * 0.34, rx * 0.55, ry * 0.34)
    .fill({ color: 0xffffff, alpha: 0.28 });
}

function shadow(g, cx, cy, r) {
  g.ellipse(cx, cy + r * 0.62, r * 0.85, r * 0.3).fill({ color: 0x000000, alpha: 0.28 });
}

function makeText(str, size, fill, stroke) {
  return new Text({
    text: str,
    style: new TextStyle({
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: size,
      fontWeight: '900',
      fill,
      stroke: stroke ? { color: stroke, width: size * 0.12 } : undefined,
      align: 'center',
    }),
  });
}

const drawers = {
  cherry(c) {
    const g = new Graphics();
    shadow(g, C, C, S * 0.34);
    // stems
    g.moveTo(C, C - S * 0.30)
      .quadraticCurveTo(C + 18, C - S * 0.05, C - S * 0.16, C + S * 0.10)
      .stroke({ color: 0x2e8b2e, width: 9 });
    g.moveTo(C, C - S * 0.30)
      .quadraticCurveTo(C - 4, C - 0.02 * S, C + S * 0.18, C + S * 0.10)
      .stroke({ color: 0x2e8b2e, width: 9 });
    // two cherries
    for (const [dx, r] of [[-S * 0.16, S * 0.16], [S * 0.18, S * 0.17]]) {
      g.circle(C + dx, C + S * 0.16, r).fill({ color: 0xe23b4e });
      g.circle(C + dx, C + S * 0.16, r).fill({ color: 0xb01a2c, alpha: 0.25 });
      gloss(g, C + dx, C + S * 0.16, r, r);
    }
    // leaf
    g.ellipse(C + S * 0.10, C - S * 0.27, S * 0.12, S * 0.06).fill({ color: 0x3fbf3f });
    return g;
  },

  lemon(c) {
    const g = new Graphics();
    shadow(g, C, C, S * 0.3);
    g.ellipse(C, C, S * 0.30, S * 0.22).fill({ color: 0xf6d033 });
    g.ellipse(C, C, S * 0.30, S * 0.22).stroke({ color: 0xcaa215, width: 6 });
    g.circle(C - S * 0.30, C, 7).fill({ color: 0x9c7d12 });
    g.circle(C + S * 0.30, C, 7).fill({ color: 0x9c7d12 });
    gloss(g, C, C, S * 0.30, S * 0.22);
    return g;
  },

  plum(c) {
    const g = new Graphics();
    shadow(g, C, C, S * 0.3);
    g.circle(C, C + 6, S * 0.27).fill({ color: 0x8e44c9 });
    g.circle(C, C + 6, S * 0.27).fill({ color: 0x5b2a86, alpha: 0.3 });
    g.ellipse(C + S * 0.12, C - S * 0.24, S * 0.11, S * 0.055).fill({ color: 0x3fbf3f });
    gloss(g, C, C + 6, S * 0.27, S * 0.27);
    return g;
  },

  watermelon(c) {
    const g = new Graphics();
    shadow(g, C, C, S * 0.32);
    // wedge: dark green rind, light rind, red flesh
    g.moveTo(C - S * 0.32, C + S * 0.22)
      .arc(C, C + S * 0.22, S * 0.34, Math.PI, 0, true)
      .closePath().fill({ color: 0x1e7d34 });
    g.moveTo(C - S * 0.27, C + S * 0.22)
      .arc(C, C + S * 0.22, S * 0.28, Math.PI, 0, true)
      .closePath().fill({ color: 0x8fe06a });
    g.moveTo(C - S * 0.24, C + S * 0.22)
      .arc(C, C + S * 0.22, S * 0.25, Math.PI, 0, true)
      .closePath().fill({ color: 0xee3a52 });
    // seeds
    for (const dx of [-0.12, 0, 0.12]) {
      g.ellipse(C + dx * S, C + S * 0.06, 5, 9).fill({ color: 0x222 });
    }
    return g;
  },

  bell(c) {
    const g = new Graphics();
    shadow(g, C, C, S * 0.3);
    g.moveTo(C - S * 0.26, C + S * 0.18)
      .quadraticCurveTo(C - S * 0.26, C - S * 0.26, C, C - S * 0.26)
      .quadraticCurveTo(C + S * 0.26, C - S * 0.26, C + S * 0.26, C + S * 0.18)
      .lineTo(C - S * 0.26, C + S * 0.18)
      .closePath()
      .fill({ color: 0xffc93c });
    g.rect(C - S * 0.30, C + S * 0.16, S * 0.60, S * 0.07).fill({ color: 0xe0a818 });
    g.circle(C, C + S * 0.28, S * 0.07).fill({ color: 0xb8841f });
    gloss(g, C, C - 6, S * 0.22, S * 0.22);
    return g;
  },

  bar(c) {
    const cont = new Container();
    const g = new Graphics();
    shadow(g, C, C, S * 0.3);
    g.roundRect(C - S * 0.34, C - S * 0.16, S * 0.68, S * 0.32, 12)
      .fill({ color: 0xf5f5f5 })
      .stroke({ color: 0xc9a227, width: 6 });
    g.roundRect(C - S * 0.30, C - S * 0.12, S * 0.60, S * 0.10, 6)
      .fill({ color: 0xffffff, alpha: 0.5 });
    cont.addChild(g);
    const t = makeText('BAR', S * 0.20, 0xc8102e);
    t.anchor.set(0.5); t.position.set(C, C);
    cont.addChild(t);
    return cont;
  },

  seven(c) {
    const cont = new Container();
    const g = new Graphics();
    shadow(g, C, C, S * 0.3);
    cont.addChild(g);
    const t = makeText('7', S * 0.6, COLORS.coin, 0x8a0f0f);
    t.anchor.set(0.5); t.position.set(C, C);
    // red gradient feel via stacked tints
    const back = makeText('7', S * 0.6, 0xff3b3b, 0x8a0f0f);
    back.anchor.set(0.5); back.position.set(C + 3, C + 3); back.alpha = 0.9;
    cont.addChild(back);
    const front = makeText('7', S * 0.6, 0xff6161);
    front.anchor.set(0.5); front.position.set(C, C);
    cont.addChild(front);
    const shine = makeText('7', S * 0.6, 0xffd0d0);
    shine.anchor.set(0.5); shine.position.set(C - 3, C - 4); shine.alpha = 0.4;
    cont.addChild(shine);
    return cont;
  },

  coin(c) {
    const cont = new Container();
    const g = new Graphics();
    shadow(g, C, C, S * 0.34);
    // gold disc
    g.circle(C, C, S * 0.34).fill({ color: COLORS.coinDark });
    g.circle(C, C, S * 0.30).fill({ color: COLORS.coin });
    g.circle(C, C, S * 0.23).stroke({ color: 0xfff2b0, width: 5, alpha: 0.7 });
    // inner star
    const star = new Graphics();
    const pts = 5, ro = S * 0.17, ri = S * 0.075;
    for (let i = 0; i < pts * 2; i++) {
      const ang = (Math.PI / pts) * i - Math.PI / 2;
      const rr = i % 2 === 0 ? ro : ri;
      const px = C + Math.cos(ang) * rr, py = C + Math.sin(ang) * rr;
      if (i === 0) star.moveTo(px, py); else star.lineTo(px, py);
    }
    star.closePath().fill({ color: 0xffe9a0 });
    gloss(g, C, C, S * 0.30, S * 0.30);
    cont.addChild(g, star);
    return cont;
  },
};

// Build a Texture for every symbol id. renderer.generateTexture bakes the
// vector drawing to GPU once; reels then spawn cheap Sprites.
export function buildSymbolTextures(renderer) {
  const textures = {};
  for (const id of Object.keys(drawers)) {
    const node = drawers[id]();
    const tex = renderer.generateTexture({
      target: node,
      resolution: 2,
      frame: new Rectangle(0, 0, S, S),
    });
    textures[id] = tex;
    node.destroy(true);
  }
  return textures;
}
