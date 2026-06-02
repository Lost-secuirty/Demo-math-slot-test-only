// =====================================================================
// holdAndWin.js — the bonus showpiece.
// Triggering coins lock in place; empty cells respin; each new coin
// resets the respin counter. Coins carry cash values or MINI/MINOR/
// MAJOR jackpots; filling all 9 awards the GRAND. Ends with a collect
// count-up. run() resolves with the total win (x already applied bet).
// =====================================================================

import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { DESIGN, GRID, COLORS, BONUS, JACKPOTS } from './config.js';
import { CELL } from './reels.js';
import { tween, wait, Ease, weightedPick, randInt, fmt } from './utils.js';
import { audio } from './audio.js';

function txt(text, size, fill, weight = '900') {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Arial Black, Arial, sans-serif',
      fontSize: size,
      fontWeight: weight,
      fill,
      align: 'center',
      stroke: { color: 0x3a2400, width: size * 0.08 },
    }),
  });
}

export class BonusGame {
  constructor(app, textures, effects) {
    this.app = app;
    this.textures = textures;
    this.effects = effects;
    this.root = new Container();
    this.root.visible = false;
    this.root.zIndex = 80;
  }

  _decideCoin(bet) {
    // small chance of a jackpot coin, otherwise a cash value
    const roll = Math.random();
    if (roll < 0.03) return { jackpot: 'MAJOR', amount: JACKPOTS.MAJOR.mult * bet };
    if (roll < 0.09) return { jackpot: 'MINOR', amount: JACKPOTS.MINOR.mult * bet };
    if (roll < 0.2) return { jackpot: 'MINI', amount: JACKPOTS.MINI.mult * bet };
    const v = weightedPick(BONUS.coinValues, BONUS.coinValueWeights);
    return { jackpot: null, amount: v * bet };
  }

  _makeCell(reel, row) {
    const c = new Container();
    c.x = GRID.x + reel * CELL + CELL / 2;
    c.y = GRID.y + row * CELL + CELL / 2;
    const slot = new Graphics()
      .roundRect(-CELL / 2 + 6, -CELL / 2 + 6, CELL - 12, CELL - 12, 16)
      .fill({ color: 0x081026, alpha: 0.6 })
      .stroke({ color: 0x24407e, width: 2 });
    c.addChild(slot);
    this.root.addChild(c);
    return { c, slot, reel, row, state: 'empty', coin: null, sprite: null, label: null };
  }

  async _landCoin(cell, info) {
    cell.state = 'coin';
    cell.coin = info;
    const sp = new Sprite(this.textures.coin);
    sp.anchor.set(0.5);
    sp.width = GRID.symbolSize * 0.92;
    sp.height = GRID.symbolSize * 0.92;
    sp.scale.set(0.1);
    cell.sprite = sp;
    cell.c.addChild(sp);

    const lab = txt(
      info.jackpot ? info.jackpot : fmt(info.amount),
      info.jackpot ? 26 : 40,
      info.jackpot ? JACKPOTS[info.jackpot].color : COLORS.textWhite,
    );
    lab.anchor.set(0.5);
    lab.y = 4;
    cell.label = lab;
    cell.c.addChild(lab);
    lab.alpha = 0;

    sp.filters = [
      new GlowFilter({ color: COLORS.coin, distance: 14, outerStrength: 2, quality: 0.2 }),
    ];
    audio.coinLand();
    this.effects.burst(cell.c.x, cell.c.y, {
      count: 16,
      colors: [COLORS.coin, 0xfff2b0],
      scale: 0.7,
    });
    await tween(
      360,
      (t, e) => {
        sp.scale.set(0.1 + 0.9 * e);
        lab.alpha = Math.max(0, (t - 0.5) * 2);
      },
      Ease.outBack,
    );
    sp.scale.set(1);
    lab.alpha = 1;
  }

  async _respinFlicker(emptyCells) {
    // quick flicker on empty cells to sell the spin
    const flickTex = [
      this.textures.cherry,
      this.textures.bell,
      this.textures.seven,
      this.textures.bar,
    ];
    const ghosts = emptyCells.map((cell) => {
      const s = new Sprite(flickTex[0]);
      s.anchor.set(0.5);
      s.width = GRID.symbolSize * 0.8;
      s.height = GRID.symbolSize * 0.8;
      s.alpha = 0.35;
      cell.c.addChild(s);
      return { s, cell };
    });
    await tween(520, (t) => {
      for (const g of ghosts) {
        g.s.texture = flickTex[(Math.random() * flickTex.length) | 0];
        g.s.y = Math.sin(t * 30) * 6;
      }
    });
    for (const g of ghosts) g.cell.c.removeChild(g.s);
  }

  async run(triggerCoinCells, bet) {
    // (re)build board
    this.root.removeChildren();
    const dim = new Graphics()
      .rect(0, 0, DESIGN.width, DESIGN.height)
      .fill({ color: 0x02040c, alpha: 0.82 });
    this.root.addChild(dim);

    const banner = txt('HOLD & WIN', 70, COLORS.frameGold);
    banner.anchor.set(0.5);
    banner.position.set(DESIGN.width / 2, 130);
    banner.filters = [
      new GlowFilter({ color: COLORS.coin, distance: 18, outerStrength: 3, quality: 0.2 }),
    ];
    this.root.addChild(banner);

    const respinText = txt('RESPINS  3', 40, COLORS.textWhite);
    respinText.anchor.set(0.5);
    respinText.position.set(DESIGN.width / 2, 250);
    this.root.addChild(respinText);

    const cells = [];
    for (let reel = 0; reel < 3; reel++)
      for (let row = 0; row < 3; row++) cells[reel * 3 + row] = this._makeCell(reel, row);

    const cellAt = (reel, row) => cells[reel * 3 + row];

    this.root.visible = true;
    audio.bonusTrigger();
    await wait(500);

    // place triggering coins
    for (const { reel, row } of triggerCoinCells) {
      await this._landCoin(cellAt(reel, row), this._decideCoin(bet));
      await wait(90);
    }

    let respins = BONUS.respins;
    respinText.text = `RESPINS  ${respins}`;

    const emptyCells = () => cells.filter((c) => c.state === 'empty');

    while (respins > 0 && emptyCells().length > 0) {
      await wait(350);
      const empties = emptyCells();
      await this._respinFlicker(empties);

      // decide new coins this respin
      const landed = [];
      for (const cell of empties) {
        if (Math.random() < 0.16) landed.push(cell);
      }

      if (landed.length > 0) {
        for (const cell of landed) {
          await this._landCoin(cell, this._decideCoin(bet));
          await wait(80);
        }
        respins = BONUS.respins; // reset on any new coin
      } else {
        respins--;
      }
      respinText.text = `RESPINS  ${respins}`;
      respinText.scale.set(1.25);
      await tween(180, (t, e) => respinText.scale.set(1.25 - 0.25 * e), Ease.outCubic);
    }

    // ----- COLLECT -----
    await wait(400);
    const filledAll = emptyCells().length === 0;
    let total = 0;
    const coinCells = cells.filter((c) => c.state === 'coin');

    const totalText = txt('0', 64, COLORS.win);
    totalText.anchor.set(0.5);
    totalText.position.set(DESIGN.width / 2, 250);
    respinText.visible = false;
    this.root.addChild(totalText);

    for (let i = 0; i < coinCells.length; i++) {
      const cell = coinCells[i];
      total += cell.coin.amount;
      if (cell.coin.jackpot) audio.jackpot(cell.coin.jackpot);
      else audio.coinCollect(i % 8);
      this.effects.burst(cell.c.x, cell.c.y, {
        count: 10,
        colors: [COLORS.coin, COLORS.win],
        scale: 0.6,
      });
      cell.sprite.filters = [
        new GlowFilter({ color: COLORS.win, distance: 18, outerStrength: 4, quality: 0.2 }),
      ];
      totalText.text = fmt(total);
      totalText.scale.set(1.2);
      await tween(120, (t, e) => totalText.scale.set(1.2 - 0.2 * e));
    }

    if (filledAll) {
      total += JACKPOTS.GRAND.mult * bet;
      const grand = txt('GRAND JACKPOT!', 64, JACKPOTS.GRAND.color);
      grand.anchor.set(0.5);
      grand.position.set(DESIGN.width / 2, DESIGN.height / 2 + 360);
      grand.filters = [
        new GlowFilter({
          color: JACKPOTS.GRAND.color,
          distance: 24,
          outerStrength: 5,
          quality: 0.25,
        }),
      ];
      this.root.addChild(grand);
      audio.jackpot('GRAND');
      this.effects.screenShake(this.app.stage, 26, 0.92);
      for (let b = 0; b < 6; b++) {
        this.effects.burst(
          DESIGN.width / 2 + randInt(-300, 300),
          DESIGN.height / 2 + randInt(-300, 300),
          { count: 30, scale: 1 },
        );
        await wait(120);
      }
      totalText.text = fmt(total);
    }

    await wait(1400);
    // fade out
    await tween(450, (t) => {
      this.root.alpha = 1 - t;
    });
    this.root.visible = false;
    this.root.alpha = 1;
    return total;
  }
}
