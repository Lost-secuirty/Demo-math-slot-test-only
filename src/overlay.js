// =====================================================================
// overlay.js — a shared modal shell (dim backdrop + centered card + title +
// close button) used by the Settings and Paytable panels so they don't drift
// apart. All Pixi, zIndex 95 (above the bonus/effects). The backdrop blocks
// input to the game beneath and closes on tap; clicks inside the card do not.
// =====================================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { DESIGN, COLORS } from './config.js';
import { audio } from './audio.js';

function header(text) {
  const t = new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: 44,
      fontWeight: '900',
      fill: COLORS.frameGold,
      align: 'center',
    }),
  });
  t.anchor.set(0.5, 0);
  return t;
}

// Returns { root, card, content, open, close, onClose }. Callers add their
// widgets to `content` (origin = card top-left, below the title bar).
export function makeModalShell({ title, width = 840, height = 1040, onClose } = {}) {
  const root = new Container();
  root.zIndex = 95;
  root.visible = false;

  const backdrop = new Graphics()
    .rect(0, 0, DESIGN.width, DESIGN.height)
    .fill({ color: 0x02040c, alpha: 0.86 });
  backdrop.eventMode = 'static';
  backdrop.on('pointertap', () => api.close());
  root.addChild(backdrop);

  const card = new Container();
  const cx = (DESIGN.width - width) / 2;
  const cy = (DESIGN.height - height) / 2;
  card.position.set(cx, cy);
  card.eventMode = 'static';
  // swallow taps so clicking the card never reaches the backdrop
  card.on('pointertap', (e) => e.stopPropagation());
  root.addChild(card);

  const bg = new Graphics();
  card.addChild(bg);

  const titleText = header(title);
  titleText.position.set(width / 2, 28);
  card.addChild(titleText);

  // close button (top-right X)
  const close = new Container();
  close.eventMode = 'static';
  close.cursor = 'pointer';
  const cg = new Graphics();
  close.addChild(cg);
  const xLabel = new Text({
    text: '✕',
    style: new TextStyle({ fontFamily: 'Arial', fontSize: 34, fontWeight: '900', fill: 0xffffff }),
  });
  xLabel.anchor.set(0.5);
  xLabel.position.set(0, -1);
  close.addChild(xLabel);
  close.position.set(width - 46, 46);
  close.on('pointerdown', () => close.scale.set(0.9));
  close.on('pointerup', () => close.scale.set(1));
  close.on('pointerupoutside', () => close.scale.set(1));
  close.on('pointertap', () => {
    audio.uiClick();
    api.close();
  });
  card.addChild(close);

  const content = new Container();
  content.position.set(0, 110); // below the title bar
  card.addChild(content);

  function paint() {
    bg.clear();
    bg.roundRect(0, 0, width, height, 26)
      .fill({ color: 0x0b0f1a })
      .stroke({ color: COLORS.frameGold, width: 3 });
    bg.roundRect(0, 96, width, 2, 0).fill({ color: COLORS.frameGoldDark, alpha: 0.8 }); // title rule
    titleText.style.fill = COLORS.frameGold;
    cg.clear();
    cg.circle(0, 0, 28).fill({ color: 0x2a0e14 }).stroke({ color: COLORS.frameGold, width: 2 });
  }
  paint();

  const api = {
    root,
    card,
    content,
    width,
    height,
    onClose,
    open() {
      paint(); // re-skin to the active theme each time it opens
      root.visible = true;
    },
    close() {
      root.visible = false;
      if (api.onClose) api.onClose();
    },
    get isOpen() {
      return root.visible;
    },
  };
  return api;
}
