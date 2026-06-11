// =====================================================================
// paytable.js — in-game info modal: symbol payouts, paylines, the jackpot
// ladder, the Hold & Win rules, and the factual play-money notice. Reads
// everything from config (no new data) and recomputes x-bet values from the
// live bet each time it opens. ADR-0014: no certification/audit claims.
// =====================================================================

import { Text, TextStyle } from 'pixi.js';
import { COLORS, SYMBOLS, PAYTABLE, PAYLINES, JACKPOTS, JACKPOT_ORDER, BONUS } from './config.js';
import { fmt } from './utils.js';
import { makeModalShell } from './overlay.js';

function line(text, size, fill, weight = '700', align = 'left') {
  return new Text({
    text,
    style: new TextStyle({
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: size,
      fontWeight: weight,
      fill,
      align,
    }),
  });
}

const NAME = Object.fromEntries(SYMBOLS.map((s) => [s.id, s.id.toUpperCase()]));

export class PaytablePanel {
  constructor(app, world, handlers) {
    this.handlers = handlers; // { getBet }
    this.shell = makeModalShell({ title: 'PAYTABLE', width: 900, height: 1100 });
    world.addChild(this.shell.root);
    this._build();
  }

  get isOpen() {
    return this.shell.isOpen;
  }

  _build() {
    const content = this.shell.content;
    const pad = 56;
    const colR = this.shell.width - pad;
    let y = 0;

    const section = (t) => {
      const n = line(t, 30, COLORS.frameGold, '900');
      n.position.set(pad, y);
      content.addChild(n);
      y += 46;
    };
    const row = (left, rightNode) => {
      const l = line(left, 26, 0xdfe6f5);
      l.position.set(pad + 8, y);
      content.addChild(l);
      rightNode.anchor.set(1, 0);
      rightNode.position.set(colR, y);
      content.addChild(rightNode);
      y += 40;
    };

    // ----- symbol payouts (3-of-a-kind on a line), high to low -----
    section('SYMBOL PAYS (3 on a line)');
    this._symRows = [];
    const order = Object.keys(PAYTABLE).sort((a, b) => PAYTABLE[b] - PAYTABLE[a]);
    for (const id of order) {
      const val = line('', 26, 0xffe08a, '800');
      this._symRows.push({ id, mult: PAYTABLE[id], val });
      row(`${NAME[id]}   ×${PAYTABLE[id]}`, val);
    }
    y += 14;

    // ----- jackpots -----
    section('JACKPOTS');
    this._jpRows = [];
    for (const kind of JACKPOT_ORDER) {
      const val = line('', 26, JACKPOTS[kind].color, '800');
      this._jpRows.push({ kind, mult: JACKPOTS[kind].mult, val });
      row(`${kind}   ×${JACKPOTS[kind].mult}`, val);
    }
    y += 14;

    // ----- paylines + bonus rules -----
    section('PAYLINES');
    const pl = line(
      `${PAYLINES.length} lines — middle, top, bottom, and both diagonals.`,
      24,
      0xdfe6f5,
    );
    pl.position.set(pad + 8, y);
    content.addChild(pl);
    y += 56;

    section('HOLD & WIN BONUS');
    const rules = [
      `Land ${BONUS.triggerCount}+ COIN symbols to trigger the bonus.`,
      `Coins lock in place; empty cells respin. Each new coin resets the`,
      `respins to ${BONUS.respins}. Coins carry cash values or MINI / MINOR /`,
      `MAJOR jackpots; fill all 9 cells to win the GRAND.`,
    ];
    for (const r of rules) {
      const rn = line(r, 23, 0xc7d0e6);
      rn.position.set(pad + 8, y);
      content.addChild(rn);
      y += 34;
    }
    y += 24;

    // ----- factual notice (matches index.html; ADR-0014) -----
    const notice = line(
      'Demo · play-money only · no real money, no prizes · not certified or audited.',
      20,
      0x9aa4be,
      '600',
    );
    notice.position.set(pad, y);
    content.addChild(notice);

    // a live "values shown for current bet" hint, updated on open
    y += 44;
    this.betHint = line('', 22, 0xffe08a, '700');
    this.betHint.position.set(pad, y);
    content.addChild(this.betHint);
  }

  open() {
    const bet = this.handlers.getBet();
    for (const r of this._symRows) r.val.text = fmt(r.mult * bet);
    for (const r of this._jpRows) r.val.text = fmt(r.mult * bet);
    this.betHint.text = `Win values shown for current bet: ${fmt(bet)}`;
    this.shell.open();
  }

  close() {
    this.shell.close();
  }
}
