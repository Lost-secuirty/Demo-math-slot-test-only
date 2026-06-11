// =====================================================================
// ui.js — HUD: balance, bet, SPIN / AUTO / MUTE buttons, win readout,
// and the MINI->GRAND jackpot ladder. All drawn with Pixi (no DOM).
// =====================================================================

import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { DESIGN, COLORS, ECONOMY, JACKPOTS, JACKPOT_ORDER } from './config.js';
import { fmt } from './utils.js';
import { audio } from './audio.js';

function label(text, size, fill, weight = '700') {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: size,
      fontWeight: weight,
      fill,
      align: 'center',
    }),
  });
}

class Button extends Container {
  constructor({ w, h, radius = 18, fill, stroke, onTap, glow }) {
    super();
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this._w = w;
    this._h = h;
    this._radius = radius;
    this._fill = fill;
    this._stroke = stroke;
    this.bg = new Graphics();
    this.addChild(this.bg);
    this._draw(1);
    if (glow) {
      this.filters = [
        new GlowFilter({ color: glow, distance: 16, outerStrength: 2, quality: 0.2 }),
      ];
    }
    this.on('pointerdown', () => {
      this.scale.set(0.94);
    });
    this.on('pointerup', () => {
      this.scale.set(1);
    });
    this.on('pointerupoutside', () => {
      this.scale.set(1);
    });
    this.on('pointertap', () => {
      audio.uiClick();
      if (!this.disabledState && onTap) onTap();
    });
    this.pivot.set(w / 2, h / 2);
  }
  _draw(alpha = 1) {
    this.bg.clear();
    this.bg
      .roundRect(0, 0, this._w, this._h, this._radius)
      .fill({ color: this._fill, alpha })
      .stroke({ color: this._stroke, width: 4, alpha });
  }
  setDisabled(d) {
    this.disabledState = d;
    this.alpha = d ? 0.45 : 1;
    this.cursor = d ? 'default' : 'pointer';
  }
}

export class UI {
  constructor(app, handlers) {
    this.app = app;
    this.handlers = handlers;
    this.root = new Container();
    this.betIndex = ECONOMY.defaultBetIndex;

    this._buildJackpotLadder();
    this._buildTitle();
    this._buildPanel();
  }

  get bet() {
    return ECONOMY.betLevels[this.betIndex];
  }

  _buildTitle() {
    const t = label('COINS: HOLD & WIN', 46, COLORS.frameGold, '900');
    t.anchor.set(0.5);
    t.position.set(DESIGN.width / 2, 60);
    t.filters = [
      new GlowFilter({ color: COLORS.coin, distance: 14, outerStrength: 2, quality: 0.2 }),
    ];
    this.titleText = t;
    this.root.addChild(t);
  }

  // The Spokey cabinet supplies its own marquee + LED readout, so the default
  // title and corner balance/win readouts are hidden under that theme.
  setTitleVisible(v) {
    if (this.titleText) this.titleText.visible = v;
  }
  setReadoutVisible(v) {
    this.balanceText.visible = v;
    this.winText.visible = v;
  }

  _buildJackpotLadder() {
    this.jackpotChips = {};
    const order = JACKPOT_ORDER;
    const chipW = 240,
      chipH = 64,
      gap = 16;
    const totalW = order.length * chipW + (order.length - 1) * gap;
    let x = (DESIGN.width - totalW) / 2;
    const y = 140;
    for (const kind of order) {
      const jp = JACKPOTS[kind];
      const chip = new Container();
      const g = new Graphics()
        .roundRect(0, 0, chipW, chipH, 14)
        .fill({ color: 0x0a1330 })
        .stroke({ color: jp.color, width: 3 });
      const name = label(kind, 22, jp.color, '900');
      name.anchor.set(0, 0.5);
      name.position.set(16, chipH / 2);
      const val = label('', 26, COLORS.textWhite, '800');
      val.anchor.set(1, 0.5);
      val.position.set(chipW - 16, chipH / 2);
      chip.addChild(g, name, val);
      chip.position.set(x, y);
      chip.filters = [
        new GlowFilter({ color: jp.color, distance: 8, outerStrength: 1, quality: 0.15 }),
      ];
      this.root.addChild(chip);
      this.jackpotChips[kind] = { val, chip };
      x += chipW + gap;
    }
  }

  _buildPanel() {
    const ctrlY = 1120; // main controls row

    // balance + win readouts (bottom corners, clear of controls)
    this.balanceText = label('', 30, COLORS.textWhite, '800');
    this.balanceText.anchor.set(0, 1);
    this.balanceText.position.set(60, 1255);

    this.winText = label('', 30, COLORS.win, '900');
    this.winText.anchor.set(1, 1);
    this.winText.position.set(DESIGN.width - 60, 1255);

    this.root.addChild(this.balanceText, this.winText);

    // SPIN button (center)
    this.spinBtn = new Button({
      w: 210,
      h: 210,
      radius: 105,
      fill: COLORS.frameGoldDark,
      stroke: COLORS.frameGold,
      glow: COLORS.coin,
      onTap: () => this.handlers.onSpin(),
    });
    const spinLabel = label('SPIN', 42, COLORS.textWhite, '900');
    spinLabel.anchor.set(0.5);
    spinLabel.position.set(105, 105);
    this.spinBtn.addChild(spinLabel);
    this.spinBtn.position.set(DESIGN.width / 2, ctrlY);
    this.root.addChild(this.spinBtn);

    // bet controls (left cluster)
    this.betMinus = this._smallBtn('−', () => this.changeBet(-1));
    this.betPlus = this._smallBtn('+', () => this.changeBet(1));
    this.betMinus.position.set(150, ctrlY);
    this.betPlus.position.set(280, ctrlY);
    this.betValueText = label('', 40, COLORS.frameGold, '900');
    this.betValueText.anchor.set(0.5);
    this.betValueText.position.set(215, ctrlY - 95);
    const betCap = label('BET', 22, COLORS.textWhite, '700');
    betCap.anchor.set(0.5);
    betCap.position.set(215, ctrlY - 135);
    this.root.addChild(this.betMinus, this.betPlus, this.betValueText, betCap);

    // AUTO + SOUND (right cluster, stacked)
    this.autoBtn = this._wideBtn('AUTO', () => this.handlers.onAuto());
    this.autoBtn.position.set(900, ctrlY - 34);
    this.muteBtn = this._wideBtn('SOUND', () => this.handlers.onMute());
    this.muteBtn.position.set(900, ctrlY + 34);
    this.root.addChild(this.autoBtn, this.muteBtn);

    // SETTINGS (gear) + INFO (paytable) — small icon buttons, top-right corner
    this.settingsBtn = this._iconBtn(
      '⚙',
      () => this.handlers.onSettings && this.handlers.onSettings(),
    );
    this.settingsBtn.position.set(1022, 58);
    this.infoBtn = this._iconBtn('i', () => this.handlers.onPaytable && this.handlers.onPaytable());
    this.infoBtn.position.set(936, 58);
    this.root.addChild(this.settingsBtn, this.infoBtn);

    this.refresh();
  }

  _iconBtn(glyph, onTap) {
    const b = new Button({
      w: 76,
      h: 76,
      radius: 20,
      fill: 0x16306e,
      stroke: COLORS.frameGold,
      onTap,
    });
    const t = label(glyph, glyph === 'i' ? 44 : 40, COLORS.textWhite, '900');
    t.anchor.set(0.5);
    t.position.set(38, 38);
    b.addChild(t);
    return b;
  }

  _smallBtn(txt, onTap) {
    const b = new Button({
      w: 90,
      h: 90,
      radius: 20,
      fill: 0x16306e,
      stroke: COLORS.frameGold,
      onTap,
    });
    const t = label(txt, 44, COLORS.textWhite, '900');
    t.anchor.set(0.5);
    t.position.set(45, 42);
    b.addChild(t);
    return b;
  }

  _wideBtn(txt, onTap) {
    const b = new Button({
      w: 200,
      h: 56,
      radius: 16,
      fill: 0x16306e,
      stroke: COLORS.frameGold,
      onTap,
    });
    const t = label(txt, 26, COLORS.textWhite, '800');
    t.anchor.set(0.5);
    t.position.set(100, 28);
    b.addChild(t);
    b._label = t;
    return b;
  }

  changeBet(dir) {
    const next = this.betIndex + dir;
    if (next < 0 || next >= ECONOMY.betLevels.length) return;
    this.betIndex = next;
    this.refresh();
    if (this.handlers.onBetChange) this.handlers.onBetChange(this.bet);
  }

  setAutoActive(active) {
    this.autoBtn._label.text = active ? 'STOP' : 'AUTO';
    this.autoBtn._fill = active ? 0x7a1530 : 0x16306e;
    this.autoBtn._draw();
  }

  setMuted(muted) {
    this.muteBtn._label.text = muted ? 'MUTED' : 'SOUND';
    this.muteBtn.alpha = muted ? 0.6 : 1;
  }

  setBalance(v) {
    this._balance = v;
    this.balanceText.text = `BALANCE  ${fmt(v)}`;
  }
  setWin(v) {
    this.winText.text = v > 0 ? `WIN  ${fmt(v)}` : '';
  }

  setSpinEnabled(enabled) {
    this.spinBtn.setDisabled(!enabled);
    this.betMinus.setDisabled(!enabled);
    this.betPlus.setDisabled(!enabled);
  }

  refresh() {
    this.betValueText.text = `${this.bet}`;
    for (const kind of JACKPOT_ORDER) {
      this.jackpotChips[kind].val.text = fmt(JACKPOTS[kind].mult * this.bet);
    }
  }

  flashJackpot(kind) {
    const chip = this.jackpotChips[kind]?.chip;
    if (!chip) return;
    let f = 0;
    const id = setInterval(() => {
      chip.alpha = chip.alpha === 1 ? 0.3 : 1;
      if (++f > 8) {
        clearInterval(id);
        chip.alpha = 1;
      }
    }, 90);
  }
}
