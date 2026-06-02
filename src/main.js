// =====================================================================
// main.js — boots Pixi, builds the scene, and runs the game loop:
// spin -> resolve line wins / Hold & Win bonus -> auto-spin / attract.
// =====================================================================

import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { GlowFilter } from 'pixi-filters';
import { DESIGN, GRID, COLORS, ECONOMY, SPIN, BONUS, BIGWIN, QUALITY, THEMES } from './config.js';
import { buildSymbolTextures } from './symbols.js';
import { ReelSet, CELL } from './reels.js';
import { evaluate } from './wins.js';
import { generateOutcome } from './outcome.js';
import { Effects } from './effects.js';
import { UI } from './ui.js';
import { BonusGame } from './holdAndWin.js';
import { audio } from './audio.js';
import { tween, wait, Ease } from './utils.js';

(async () => {
  const app = new Application();
  await app.init({
    background: '#04081c',
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    resizeTo: window,
  });
  document.getElementById('app').appendChild(app.canvas);

  // world: authored at DESIGN resolution, letterboxed into the window
  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);

  function layout() {
    const sc = Math.min(window.innerWidth / DESIGN.width, window.innerHeight / DESIGN.height);
    world.scale.set(sc);
    world.x = (window.innerWidth - DESIGN.width * sc) / 2;
    world.y = (window.innerHeight - DESIGN.height * sc) / 2;
  }
  window.addEventListener('resize', layout);
  layout();

  // ---------- background (painted by applyTheme below) ----------
  const bg = new Container();
  bg.zIndex = 0;
  world.addChild(bg);
  const gbg = new Graphics(); // vertical gradient (interpolated strips)
  bg.addChild(gbg);
  const rays = new Graphics(); // godrays
  rays.position.set(DESIGN.width / 2, GRID.y + (GRID.rows * CELL) / 2);
  rays.visible = QUALITY.godrays;
  bg.addChild(rays);

  // ---------- textures + reels ----------
  const textures = buildSymbolTextures(app.renderer);
  const reels = new ReelSet(textures);
  reels.root.zIndex = 10;
  world.addChild(reels.root);

  // gold frame around the reel well (painted by applyTheme below)
  const frame = new Graphics();
  const fx = GRID.x - 18,
    fy = GRID.y - 18;
  const fw = GRID.reels * CELL + 36,
    fh = GRID.rows * CELL + 36;
  frame.zIndex = 15;
  const frameGlow = new GlowFilter({
    color: COLORS.coin,
    distance: 16,
    outerStrength: 1.5,
    quality: 0.2,
  });
  frame.filters = [frameGlow];
  world.addChild(frame);

  // ---------- effects ----------
  const effects = new Effects(app);
  effects.layer.zIndex = 90;
  effects.layer.eventMode = 'none';
  world.addChild(effects.layer);

  // highlight overlay for winning cells
  const highlightLayer = new Container();
  highlightLayer.zIndex = 12;
  world.addChild(highlightLayer);

  // ---------- bonus ----------
  const bonus = new BonusGame(app, textures, effects);
  world.addChild(bonus.root);

  // ---------- win banner ----------
  const banner = new Text({
    text: '',
    style: new TextStyle({
      fontFamily: 'Arial Black, Arial',
      fontSize: 96,
      fontWeight: '900',
      fill: COLORS.win,
      align: 'center',
      stroke: { color: 0x5a3a00, width: 10 },
    }),
  });
  banner.anchor.set(0.5);
  banner.position.set(DESIGN.width / 2, GRID.y + (GRID.rows * CELL) / 2);
  banner.alpha = 0;
  banner.zIndex = 70;
  const bannerGlow = new GlowFilter({
    color: COLORS.coin,
    distance: 20,
    outerStrength: 3,
    quality: 0.25,
  });
  banner.filters = [bannerGlow];
  world.addChild(banner);

  // ---------- theme painting ----------
  function paintBackground() {
    const strips = 48;
    gbg.clear();
    for (let i = 0; i < strips; i++) {
      const t = i / (strips - 1);
      const col = lerpColor(COLORS.bgTop, COLORS.bgBottom, t);
      gbg
        .rect(0, (DESIGN.height / strips) * i, DESIGN.width, DESIGN.height / strips + 1)
        .fill({ color: col });
    }
    rays.clear();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      rays
        .moveTo(0, 0)
        .lineTo(Math.cos(a - 0.06) * 1400, Math.sin(a - 0.06) * 1400)
        .lineTo(Math.cos(a + 0.06) * 1400, Math.sin(a + 0.06) * 1400)
        .closePath()
        .fill({ color: COLORS.ray ?? 0x4f7bd6, alpha: 0.05 });
    }
    rays.visible = QUALITY.godrays;
  }

  function paintFrame() {
    frame.clear();
    frame.roundRect(fx, fy, fw, fh, 26).stroke({ color: COLORS.frameGold, width: 12 });
    frame
      .roundRect(fx + 6, fy + 6, fw - 12, fh - 12, 22)
      .stroke({ color: COLORS.frameGoldDark, width: 4 });
    frameGlow.color = COLORS.coin;
    bannerGlow.color = COLORS.coin;
  }

  function applyTheme(name) {
    const preset = THEMES[name];
    if (preset) Object.assign(COLORS, preset);
    paintBackground();
    paintFrame();
  }
  applyTheme('classic');

  // ---------- state ----------
  const state = {
    balance: ECONOMY.startingBalance,
    bet: ECONOMY.betLevels[ECONOMY.defaultBetIndex],
    busy: false,
    auto: false,
    lastInteract: performance.now(),
    forceNext: null, // debug: a crafted 3x3 grid consumed by the next spin
  };

  const ui = new UI(app, {
    onSpin: () => {
      state.lastInteract = performance.now();
      doSpin();
    },
    onBetChange: (bet) => {
      state.bet = bet;
    },
    onAuto: () => {
      state.lastInteract = performance.now();
      toggleAuto();
    },
    onMute: () => {
      const m = !audio.muted;
      audio.setMuted(m);
      ui.setMuted(m);
    },
  });
  ui.root.zIndex = 60;
  world.addChild(ui.root);
  ui.setBalance(state.balance);
  ui.setWin(0);

  // first user gesture unlocks audio
  const unlock = () => {
    audio.init();
    audio.resume();
    window.removeEventListener('pointerdown', unlock);
  };
  window.addEventListener('pointerdown', unlock);

  // reel-stop sfx
  reels.onReelStop = (i) => audio.reelStop(i);

  // ---------- per-frame ----------
  app.ticker.add((ticker) => {
    reels.update(ticker);
    if (rays) rays.rotation += 0.0008 * ticker.deltaTime;
    // attract / auto mode after idle
    if (
      !state.busy &&
      !state.auto &&
      performance.now() - state.lastInteract > SPIN.idleToAttractMs
    ) {
      toggleAuto(true);
    }
  });

  // ---------- game flow ----------
  function setBusy(b) {
    state.busy = b;
    ui.setSpinEnabled(!b);
  }

  function toggleAuto(force) {
    state.auto = force ?? !state.auto;
    ui.setAutoActive(state.auto);
    if (state.auto && !state.busy) doSpin();
  }

  async function doSpin() {
    if (state.busy) return;
    if (state.balance < state.bet) state.balance = ECONOMY.startingBalance; // demo: never dry out
    setBusy(true);
    clearHighlights();
    ui.setWin(0);
    state.balance -= state.bet;
    ui.setBalance(state.balance);

    audio.startSpin();
    const outcome = state.forceNext || generateOutcome();
    state.forceNext = null;
    const grid = await reels.spin(outcome);
    audio.stopSpin();

    await resolve(grid);

    setBusy(false);
    // chain auto-spin
    if (state.auto) {
      await wait(SPIN.autoSpinDelayMs);
      if (state.auto) doSpin();
    }
  }

  async function resolve(grid) {
    const res = evaluate(grid, state.bet);

    if (res.coinCount >= BONUS.triggerCount) {
      const won = await bonus.run(res.coinCells, state.bet);
      state.balance += won;
      ui.setBalance(state.balance);
      ui.setWin(won);
      await celebrate(won);
      return;
    }

    if (res.total > 0) {
      // credit the win as soon as it's determined, then play the (cosmetic)
      // celebration — the player's balance shouldn't wait on the animation.
      state.balance += res.total;
      ui.setBalance(state.balance);
      await presentLineWins(res);
      await celebrate(res.total);
    }
  }

  async function presentLineWins(res) {
    // highlight every winning cell + particle pop + screen shake
    const seen = new Set();
    for (const line of res.lines) {
      for (const { reel, row } of line.cells) {
        const key = `${reel},${row}`;
        if (seen.has(key)) continue;
        seen.add(key);
        addHighlight(reel, row);
        const cx = GRID.x + reel * CELL + CELL / 2;
        const cy = GRID.y + row * CELL + CELL / 2;
        effects.burst(cx, cy, { count: 12, scale: 0.6 });
      }
    }
    audio.win(res.total / state.bet);
    effects.screenShake(app.stage, Math.min(QUALITY.shakeIntensity, 6 + res.total / state.bet));
    await wait(700);
  }

  function addHighlight(reel, row) {
    const g = new Graphics()
      .roundRect(GRID.x + reel * CELL + 6, GRID.y + row * CELL + 6, CELL - 12, CELL - 12, 16)
      .stroke({ color: COLORS.win, width: 6 });
    g.filters = [
      new GlowFilter({ color: COLORS.win, distance: 18, outerStrength: 3, quality: 0.25 }),
    ];
    highlightLayer.addChild(g);
    let t = 0;
    const pulse = (ticker) => {
      t += ticker.deltaTime * 0.12;
      g.alpha = 0.55 + 0.45 * Math.sin(t);
    };
    g._pulse = pulse;
    app.ticker.add(pulse);
  }

  function clearHighlights() {
    for (const g of highlightLayer.children) if (g._pulse) app.ticker.remove(g._pulse);
    highlightLayer.removeChildren();
  }

  // rolling count-up + BIG/MEGA/EPIC banner
  async function celebrate(amount) {
    if (amount <= 0) return;
    const mult = amount / state.bet;
    let tier = '';
    if (mult >= BIGWIN.epic) tier = 'EPIC WIN';
    else if (mult >= BIGWIN.mega) tier = 'MEGA WIN';
    else if (mult >= BIGWIN.big) tier = 'BIG WIN';

    if (tier) {
      banner.text = tier;
      audio.win(mult);
      effects.screenShake(app.stage, QUALITY.shakeIntensity, 0.93);
      banner.scale.set(0.4);
      banner.alpha = 1;
      await tween(450, (t, e) => banner.scale.set(0.4 + 0.6 * e), Ease.outBack);
      for (let i = 0; i < 4; i++) {
        effects.burst(
          DESIGN.width / 2 + (Math.random() - 0.5) * 500,
          banner.y + (Math.random() - 0.5) * 200,
          { count: 22, scale: 0.9 },
        );
        await wait(140);
      }
    }

    // roll the WIN number up
    await tween(
      Math.min(1600, 500 + mult * 8),
      (t) => {
        ui.setWin(amount * t);
      },
      Ease.outCubic,
    );
    ui.setWin(amount);

    if (tier) {
      await wait(700);
      await tween(350, (t) => {
        banner.alpha = 1 - t;
      });
      banner.alpha = 0;
    }
  }

  // ---------- helpers ----------
  function lerpColor(a, b, t) {
    const ar = (a >> 16) & 255,
      ag = (a >> 8) & 255,
      ab = a & 255;
    const br = (b >> 16) & 255,
      bg2 = (b >> 8) & 255,
      bb = b & 255;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg2 - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  // hide boot splash
  const boot = document.getElementById('boot');
  if (boot) boot.classList.add('hide');

  // ---------- debug API (used by src/debug.js and verify.mjs) ----------
  function fillerGrid() {
    const g = generateOutcome();
    for (let r = 0; r < 3; r++)
      for (let row = 0; row < 3; row++) if (g[r][row] === 'coin') g[r][row] = 'lemon'; // strip stray coins
    return g;
  }

  window.__slot = {
    app,
    reels,
    state,
    ui,
    effects,
    bonus,
    doSpin,
    toggleAuto,
    applyTheme,
    generateOutcome,

    // force the next spin to land a winning middle line of `symbolId`
    forceLineWin(symbolId = 'seven') {
      if (state.busy) return;
      const g = fillerGrid();
      g[0][1] = g[1][1] = g[2][1] = symbolId; // PAYLINES[0] = [1,1,1]
      state.forceNext = g;
      state.lastInteract = performance.now();
      doSpin();
    },

    // force the next spin to trigger Hold & Win with `coins` scattered coins
    forceBonus(coins = 6) {
      if (state.busy) return;
      const g = fillerGrid();
      const cells = [];
      for (let r = 0; r < 3; r++) for (let row = 0; row < 3; row++) cells.push([r, row]);
      for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
      }
      const n = Math.max(BONUS.triggerCount, Math.min(9, coins));
      for (let i = 0; i < n; i++) {
        const [r, row] = cells[i];
        g[r][row] = 'coin';
      }
      state.forceNext = g;
      state.lastInteract = performance.now();
      doSpin();
    },

    setBalance(v) {
      state.balance = Math.max(0, Math.floor(v));
      ui.setBalance(state.balance);
    },
    setBetIndex(i) {
      ui.betIndex = Math.max(0, Math.min(ECONOMY.betLevels.length - 1, i));
      ui.refresh();
      state.bet = ui.bet;
    },
    setGodrays(on) {
      QUALITY.godrays = on;
      rays.visible = on;
    },
    // merge overrides into QUALITY (live). Used by verify.mjs to disable the
    // particle storm so the headless software-WebGL renderer stays responsive.
    setQuality(q) {
      Object.assign(QUALITY, q);
    },
    repaint() {
      paintBackground();
      paintFrame();
    },

    // run the bonus scene directly (no spin), used by verify.mjs
    runBonus: (coins = 7, bet = state.bet) => {
      const cells = [];
      for (let r = 0; r < 3 && cells.length < coins; r++)
        for (let row = 0; row < 3 && cells.length < coins; row++) cells.push({ reel: r, row });
      return bonus.run(cells, bet);
    },
  };

  // ---------- load the debug panel on ?debug=1 / DEV / backtick ----------
  const params = new URLSearchParams(location.search);
  const wantDebug = params.has('debug') || (import.meta.env && import.meta.env.DEV);
  if (wantDebug) {
    import('./debug.js')
      .then((m) => m.initDebug(window.__slot))
      .catch((e) => console.warn('debug panel failed:', e));
  }
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
      import('./debug.js').then((m) => m.toggleDebug(window.__slot)).catch(() => {});
    }
  });
})();
