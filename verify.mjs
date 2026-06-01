import { chromium } from 'playwright';

const url = 'http://localhost:4173/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 1000 }, deviceScaleFactor: 1 });

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(2500);

const has = await page.evaluate(() => !!window.__slot);
console.log('slot api present:', has);

if (has) {
  await page.screenshot({ path: 'shot-idle.png' });
  // mid-spin shot
  page.evaluate(() => window.__slot.doSpin());
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shot-spinning.png' });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'shot-result.png' });

  // bonus scene
  page.evaluate(() => window.__slot.runBonus(7));
  await page.waitForTimeout(4000);
  await page.screenshot({ path: 'shot-bonus.png' });

  const bal = await page.evaluate(() => window.__slot.state.balance);
  console.log('balance:', bal);
}

console.log('--- total console errors:', errors.length);
errors.slice(0, 30).forEach((e) => console.log('  -', e));
await browser.close();
process.exit(has && errors.length === 0 ? 0 : 1);
