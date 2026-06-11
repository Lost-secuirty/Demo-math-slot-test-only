import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173/?debug=1';
const artifactDir = 'artifacts/playwright';
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 1000 } });
const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));

await page.context().tracing.start({ screenshots: true, snapshots: true });
try {
  await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 15_000 });
  await page.waitForFunction(() => window.__slot, null, { timeout: 15_000 });
  await page.screenshot({ path: `${artifactDir}/smoke-boot.png`, fullPage: true });
  if (errors.length) throw new Error(errors.slice(0, 5).join(' | '));
  await page.context().tracing.stop({ path: `${artifactDir}/trace.zip` });
} catch (error) {
  await page
    .screenshot({ path: `${artifactDir}/smoke-failure.png`, fullPage: true })
    .catch(() => {});
  await page
    .context()
    .tracing.stop({ path: `${artifactDir}/trace.zip` })
    .catch(() => {});
  throw error;
} finally {
  await browser.close();
}
