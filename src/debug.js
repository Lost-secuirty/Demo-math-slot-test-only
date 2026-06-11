// =====================================================================
// debug.js — in-app dev panel (lil-gui) + FPS meter (stats.js).
// Loaded lazily only when ?debug=1, in Vite dev, or via the backtick key.
// Mutates the live config singletons so every change applies instantly,
// and drives forced wins/bonuses through the real game flow via __slot.
// =====================================================================

import GUI from 'lil-gui';
import Stats from 'stats.js';
import {
  SPIN,
  QUALITY,
  BIGWIN,
  ECONOMY,
  TIME,
  SYMBOL_WEIGHTS,
  THEME_NAMES,
  BONUS,
  PAYTABLE,
  GRID,
  UNEASE,
} from './config.js';

let gui = null;
let stats = null;
let visible = false;

function build(api) {
  // ---- FPS / ms / memory meter ----
  stats = new Stats();
  stats.showPanel(0);
  Object.assign(stats.dom.style, { position: 'fixed', top: '0', left: '0', zIndex: '1000' });
  document.body.appendChild(stats.dom);
  api.app.ticker.add(() => stats.update());

  // ---- panel ----
  gui = new GUI({ title: '🎰 Slot Debug  (` to toggle)' });
  gui.domElement.style.zIndex = '1000';

  const bonusProxy = { coins: 6 };
  const winProxy = { symbol: 'seven' };
  const econProxy = { balance: ECONOMY.startingBalance, betIndex: ECONOMY.defaultBetIndex };
  const themeProxy = { theme: 'classic' };

  // ===== Actions =====
  const fA = gui.addFolder('Actions');
  fA.add({ spin: () => api.doSpin() }, 'spin').name('▶ Spin');
  fA.add({ auto: () => api.toggleAuto() }, 'auto').name('♻ Toggle Auto');
  fA.add(winProxy, 'symbol', Object.keys(PAYTABLE)).name('win symbol');
  fA.add({ win: () => api.forceLineWin(winProxy.symbol) }, 'win').name('✦ Force WIN (line)');
  fA.add({ big: () => api.forceLineWin('bell') }, 'big').name('★ Force BIG (bell)');
  fA.add({ mega: () => api.forceLineWin('bar') }, 'mega').name('★★ Force MEGA (bar)');
  fA.add({ epic: () => api.forceLineWin('seven') }, 'epic').name('★★★ Force EPIC (7)');
  fA.add(bonusProxy, 'coins', BONUS.triggerCount, GRID.reels * GRID.rows, 1).name('bonus coins');
  fA.add({ bonus: () => api.forceBonus(bonusProxy.coins) }, 'bonus').name('🪙 Force BONUS');
  fA.open();

  // ===== Theme =====
  gui
    .add(themeProxy, 'theme', THEME_NAMES)
    .name('🎨 Theme')
    .onChange((v) => api.applyTheme(v));

  // ===== Spin feel =====
  const fS = gui.addFolder('Spin feel');
  fS.add(SPIN, 'maxBlur', 0, 30, 1).name('motion blur');
  fS.add(SPIN, 'reelStaggerMs', 0, 600, 10).name('reel stagger');
  fS.add(SPIN, 'minSpinMs', 200, 3000, 50).name('min spin ms');
  fS.add(TIME, 'scale', 0.1, 1, 0.05).name('⏱ slow-mo');

  // ===== Big-win thresholds (x bet) =====
  const fB = gui.addFolder('Big-win thresholds');
  fB.add(BIGWIN, 'big', 1, 200, 1);
  fB.add(BIGWIN, 'mega', 1, 400, 1);
  fB.add(BIGWIN, 'epic', 1, 1000, 5);

  // ===== Symbol weights (virtual reel-strip stops) =====
  const fW = gui.addFolder('Symbol weights');
  for (const id of Object.keys(SYMBOL_WEIGHTS)) fW.add(SYMBOL_WEIGHTS, id, 0, 1000, 5);

  // ===== Quality =====
  const fQ = gui.addFolder('Quality');
  fQ.add(QUALITY, 'particlesPerBurst', 0, 80, 1).name('particles/burst');
  fQ.add(QUALITY, 'maxParticles', 50, 1000, 10).name('max particles');
  fQ.add(QUALITY, 'shakeIntensity', 0, 40, 1).name('screen shake');
  fQ.add(QUALITY, 'godrays')
    .name('godrays')
    .onChange((v) => api.setGodrays(v));

  // ===== Audio / Unease (Spokey) =====
  const fU = gui.addFolder('Audio / Unease');
  const audioProxy = { volume: 0.5 };
  fU.add(audioProxy, 'volume', 0, 1, 0.01)
    .name('master volume')
    .onChange((v) => api.setVolume(v));
  fU.add(UNEASE, 'enabled').name('unease enabled');
  fU.add(UNEASE, 'vignetteAlpha', 0, 1, 0.05).name('vignette');
  fU.add(UNEASE, 'flickerChancePerRespin', 0, 1, 0.05).name('flicker chance');
  fU.add(UNEASE, 'watcherChance', 0, 1, 0.05).name('watcher chance');
  fU.add(UNEASE, 'watcherApproachChance', 0, 1, 0.05).name('approach chance');

  // ===== Economy =====
  const fE = gui.addFolder('Economy');
  fE.add(econProxy, 'balance', 0, 100000, 50)
    .name('set balance')
    .onChange((v) => api.setBalance(v));
  fE.add(econProxy, 'betIndex', 0, ECONOMY.betLevels.length - 1, 1)
    .name(`bet level (0-${ECONOMY.betLevels.length - 1})`)
    .onChange((i) => api.setBetIndex(i));

  visible = true;
}

export function initDebug(api) {
  if (!gui) build(api);
}

export function toggleDebug(api) {
  if (!gui) {
    build(api);
    return;
  }
  visible = !visible;
  gui.domElement.style.display = visible ? '' : 'none';
  if (stats) stats.dom.style.display = visible ? '' : 'none';
}
