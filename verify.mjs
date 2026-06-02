import { chromium } from 'playwright';

// Render + behavior smoke test for the built app.
//
// Scope note (honest): this container renders with software-WebGL at a few fps,
// which is too slow to finish the win/bonus *celebration animations*. So this
// test asserts what's reliable here — boot, render, a deterministic no-win spin
// settling, and a forced win CREDITING the balance (credited the moment the win
// is determined, before the cosmetic animation). The win/bonus *economics* are
// covered deterministically by the Vitest unit tests (test/wins.test.js); the
// animated bonus is merely observed, not gated. See docs/LEARNINGS.md.

const url = 'http://localhost:4173/?debug=1';
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 800, height: 1000 },
  deviceScaleFactor: 1,
});

const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const note = (msg) => console.log(`ℹ️  ${msg}`);
const waitFn = (fn, arg = null, timeout = 15000) =>
  page
    .waitForFunction(fn, arg, { timeout, polling: 200 })
    .then(() => true)
    .catch(() => false);

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const has = await page.evaluate(() => !!window.__slot);
check('slot api present', has);

const guiPresent = await page.evaluate(
  () => !!document.querySelector('.lil-gui') && !!document.querySelector('canvas'),
);
check('debug panel present', guiPresent);

let keepAwake;
if (has) {
  // Turn particles off — big bursts saturate this software-WebGL renderer.
  await page.evaluate(() => window.__slot.setQuality({ particlesPerBurst: 0, maxParticles: 0 }));
  await page.screenshot({ path: 'shot-idle.png' });

  // Stop idle "attract" auto-spin from racing our assertions.
  keepAwake = setInterval(
    () =>
      page.evaluate(() => (window.__slot.state.lastInteract = performance.now())).catch(() => {}),
    2000,
  );

  // 1) a deterministic NO-WIN spin settles (reels stop, not busy).
  await page.evaluate(() => {
    window.__slot.state.forceNext = [
      ['cherry', 'lemon', 'plum'],
      ['bell', 'bar', 'seven'],
      ['watermelon', 'plum', 'lemon'],
    ];
    window.__slot.doSpin();
  });
  await page.screenshot({ path: 'shot-spinning.png' });
  check(
    'no-win spin settles',
    await waitFn(() => !window.__slot.state.busy && !window.__slot.reels.spinning),
  );

  // 2) a forced winning line CREDITS the balance (credited before the animation).
  // Poll from Node with a generous budget: at this container's ~2fps the reel
  // animation runs in slow-motion (the engine clamps per-frame dt), so the
  // credit can take a while in wall-clock time — but it does land.
  const before = await page.evaluate(() => window.__slot.state.balance);
  await page.evaluate(() => window.__slot.forceLineWin('seven'));
  let after = before;
  for (let i = 0; i < 60 && after <= before; i++) {
    await page.waitForTimeout(500);
    after = await page.evaluate(() => window.__slot.state.balance);
  }
  check('forced win credits balance', after > before, `${before} -> ${after}`);
  await page.screenshot({ path: 'shot-win.png' });

  // theme switch applies without error
  await page.evaluate(() => window.__slot.applyTheme('neon'));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'shot-theme-neon.png' });
  await page.evaluate(() => window.__slot.applyTheme('classic'));

  // bonus: observe only (its animation may be too slow to finish headless).
  const bonusWin = await Promise.race([
    page.evaluate(() => window.__slot.runBonus(7)).catch(() => null),
    new Promise((r) => setTimeout(() => r('TIMEOUT'), 20000)),
  ]);
  if (typeof bonusWin === 'number') note(`bonus awarded ${bonusWin}`);
  else note('bonus animation too slow to verify in headless (observed, not gated)');
  await page.screenshot({ path: 'shot-bonus.png' });
}

if (keepAwake) clearInterval(keepAwake);
check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));

const allOk = checks.every((c) => c.ok);
console.log(`\n${allOk ? 'PASS' : 'FAIL'} — ${checks.filter((c) => c.ok).length}/${checks.length}`);
await browser.close();
process.exit(allOk ? 0 : 1);
