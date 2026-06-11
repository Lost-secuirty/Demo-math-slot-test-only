// =====================================================================
// features/holdAndWin.js — the Hold & Win feature as ONE pure source of
// truth. decideCoin + the respin loop live here, with no Pixi and no
// global RNG: callers inject `rng` (a seeded mulberry32 for the math model,
// `Math.random` for the live game). `play()` returns the round total (in
// x-bet units) AND an event stream the renderer replays — so the math
// harness (slotmath.js) and the on-screen feature (holdAndWin.js) animate
// from the same decisions and can never drift apart.
// =====================================================================

// Decide one coin: a small chance of a jackpot coin, otherwise a weighted
// cash value. Amounts are bet-agnostic multipliers (x bet); the renderer
// multiplies by the actual bet. `rng` is injected.
export function decideCoin(rng, model) {
  const { odds, jackpots, coinValues, coinValueWeights } = model.bonus;
  const roll = rng();
  if (roll < odds.major) return { jackpot: 'MAJOR', amount: jackpots.MAJOR };
  if (roll < odds.minor) return { jackpot: 'MINOR', amount: jackpots.MINOR };
  if (roll < odds.mini) return { jackpot: 'MINI', amount: jackpots.MINI };
  // weighted cash value (x bet) — mirrors utils.weightedPick
  const total = coinValueWeights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < coinValues.length; i++) {
    r -= coinValueWeights[i];
    if (r <= 0) return { jackpot: null, amount: coinValues[i] };
  }
  return { jackpot: null, amount: coinValues[coinValues.length - 1] };
}

// Simulate one Hold & Win round given the triggering coin cells (flat grid
// indices). Pure: `rng` injected. Returns the total payout (x bet), whether
// the board filled (GRAND), the coins collected, and an `events` stream the
// renderer replays to animate:
//   { type: 'place',  cells:  [{ idx, coin }] }              — the triggering coins
//   { type: 'respin', landed: [{ idx, coin }], respinsLeft } — one per respin
// The RNG draw order is identical to a flat decide-then-respin loop (place
// every trigger coin, then each respin scan cells 0..N deciding a coin where
// one lands), so the seeded RTP is unchanged from the previous inline sim.
export function play(triggerCells, model, rng) {
  const reels = model.paylines[0].length;
  const rows = Math.max(...model.paylines.flat()) + 1;
  const cellCount = reels * rows;
  const coins = new Array(cellCount).fill(null);
  const events = [];

  const placed = [];
  for (const idx of triggerCells) {
    const coin = decideCoin(rng, model);
    coins[idx] = coin;
    placed.push({ idx, coin });
  }
  events.push({ type: 'place', cells: placed });

  let respins = model.bonus.respins;
  while (respins > 0 && coins.includes(null)) {
    const landed = [];
    for (let i = 0; i < cellCount; i++) {
      if (coins[i] === null && rng() < model.bonus.odds.respinLandChance) {
        const coin = decideCoin(rng, model);
        coins[i] = coin;
        landed.push({ idx: i, coin });
      }
    }
    respins = landed.length > 0 ? model.bonus.respins : respins - 1;
    events.push({ type: 'respin', landed, respinsLeft: respins });
  }

  let total = coins.reduce((s, c) => s + (c ? c.amount : 0), 0);
  const filledAll = !coins.includes(null);
  if (filledAll) total += model.bonus.jackpots.GRAND;
  return { total, filledAll, coinsCollected: coins.filter(Boolean).length, events };
}
