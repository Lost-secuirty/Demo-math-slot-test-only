// =====================================================================
// holdAndWin.js — the bonus showpiece.
// Triggering coins lock in place; empty cells respin; each new coin
// resets the respin counter. Coins carry cash values or MINI/MINOR/
// MAJOR jackpots; filling every cell awards the GRAND. Ends with a
// collect count-up. run() resolves with the total win (bet applied).
// =====================================================================

import { Container, Graphics, Sprite, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { DESIGN, GRID, COLORS, BONUS, JACKPOTS } from './config.js';
import { CELL } from './reels.js';
import { tween, wait, Ease, randInt, fmt } from './utils.js';
import { audio } from './audio.js';
import { play as playBonus } from './features/holdAndWin.js';
import { defaultModel } from './slotmath.js';

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
  constructor(app, textures, effects, unease = null) {
    this.app = app;
    this.textures = textures;
    this.effects = effects;
    // optional Spokey dread layer — VISUAL/AUDIO only, never the money ledger
    this.unease = unease;
    this.root = new Container();
    this.root.visible = false;
    this.root.zIndex = 80;
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

    // flat cell index is column-major (reel * rows + row) — must match the
    // feature sim's flat layout in features/holdAndWin.js (ADR-0015)
    const cells = [];
    for (let reel = 0; reel < GRID.reels; reel++)
      for (let row = 0; row < GRID.rows; row++)
        cells[reel * GRID.rows + row] = this._makeCell(reel, row);

    this.root.visible = true;
    audio.bonusTrigger();
    // Spokey arrives with the bonus: swell the dread bed, darken the edges,
    // and maybe reveal a distant watcher. No-op under non-Spokey themes.
    this.unease?.start();
    this.unease?.spawnWatcher();
    await wait(500);

    // Decide the whole round up front from the ONE shared feature sim
    // (features/holdAndWin.js — the same logic the math harness uses), then
    // replay its event stream as animation. Coin amounts come back in x-bet
    // units, so multiply by the live bet for display.
    const model = defaultModel();
    const triggerIdx = triggerCoinCells.map(({ reel, row }) => reel * GRID.rows + row);
    const { events } = playBonus(triggerIdx, model, Math.random);
    const withBet = (coin) => ({ jackpot: coin.jackpot, amount: coin.amount * bet });

    // place triggering coins (events[0] is always the 'place' event)
    for (const { idx, coin } of events[0].cells) {
      await this._landCoin(cells[idx], withBet(coin));
      await wait(90);
    }

    let respins = BONUS.respins;
    respinText.text = `RESPINS  ${respins}`;

    const emptyCells = () => cells.filter((c) => c.state === 'empty');

    // replay each respin event: flicker the empties, land the coins the sim
    // decided this respin, then show the respins-left it computed.
    for (let e = 1; e < events.length; e++) {
      const ev = events[e];
      await wait(350);
      // unease cues ride the respin beat (chance-gated, rare by default)
      await this.unease?.maybeFlicker();
      this.unease?.maybeApproach();
      await this._respinFlicker(emptyCells());

      for (const { idx, coin } of ev.landed) {
        await this._landCoin(cells[idx], withBet(coin));
        await wait(80);
      }
      respins = ev.respinsLeft;
      respinText.text = `RESPINS  ${respins}`;
      respinText.scale.set(1.25);
      await tween(180, (t, ease) => respinText.scale.set(1.25 - 0.25 * ease), Ease.outCubic);
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
    // fade out + let the dread recede with the bonus
    this.unease?.stop();
    await tween(450, (t) => {
      this.root.alpha = 1 - t;
    });
    this.root.visible = false;
    this.root.alpha = 1;
    return total;
  }
}
