import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173/?debug=1';
const plantedBad =
  process.env.SMOKE_PLANTED_BAD ||
  process.argv.find((arg) => arg.startsWith('--planted-bad='))?.split('=')[1] ||
  '';
const artifactDir = 'artifacts/playwright';
await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch(
  process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {},
);
const page = await browser.newPage({
  viewport: { width: 800, height: 1000 },
  deviceScaleFactor: 1,
});
const errors = [];
const checks = [];

page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));

function check(name, ok, detail = '') {
  checks.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function hudRepainted(before, after) {
  return (
    !!before &&
    !!after &&
    before.titleFill !== after.titleFill &&
    before.spinStroke !== after.spinStroke &&
    before.spinGlow !== after.spinGlow &&
    before.jackpots?.MINI?.stroke !== after.jackpots?.MINI?.stroke &&
    before.jackpots?.GRAND?.stroke !== after.jackpots?.GRAND?.stroke
  );
}

function jackpotDiagnosticsSane(uiTheme) {
  if (!uiTheme?.jackpots) return false;
  return Object.values(uiTheme.jackpots).every(
    (chip) => chip.stroke === chip.nameFill && chip.stroke === chip.glow && chip.valueFill,
  );
}

async function screenshot(name) {
  await page.screenshot({ path: `${artifactDir}/${name}.png`, fullPage: true });
}

async function readSlotState() {
  return page.evaluate(() => ({
    hasSlot: !!window.__slot,
    hasCanvas: !!document.querySelector('canvas'),
    hasUi: !!window.__slot?.ui?.root,
    hasSettings: !!window.__slot?.settings,
    hasPaytable: !!window.__slot?.paytable,
    settingsOpen: !!window.__slot?.settings?.isOpen,
    paytableOpen: !!window.__slot?.paytable?.isOpen,
    cabinetVisible: !!window.__slot?.cabinet?.layer?.visible,
    uneaseEnabled: !!window.__slot?.unease?.enabled,
    hasThemeApi: typeof window.__slot?.applyTheme === 'function',
    hasSettingsApi: typeof window.__slot?.openSettings === 'function',
    hasPaytableApi: typeof window.__slot?.openPaytable === 'function',
    uiTheme: window.__slot?.ui?.getThemeDiagnostics?.(),
  }));
}

async function injectPlantedBad(mode) {
  if (!mode) return;
  await page.evaluate((fault) => {
    if (fault === 'settings-open') window.__slot.openSettings = () => {};
    if (fault === 'paytable-open') window.__slot.openPaytable = () => {};
    if (fault === 'theme-apply') window.__slot.applyTheme = () => {};
    if (fault === 'ui-theme') window.__slot.ui.applyTheme = () => {};
    if (fault === 'console-error') console.error('planted browser-smoke console fault');
  }, mode);
}

async function assertModal(name, open, close, isOpen) {
  await page.evaluate(
    ({ openName, closeName }) => {
      window.__slot.settings.close();
      window.__slot.paytable.close();
      window.__slot[openName]();
      if (closeName) window.__slot[closeName]?.();
    },
    { openName: open, closeName: close },
  );
  await page.waitForTimeout(200);
  const state = await readSlotState();
  check(`${name} opens`, isOpen(state), JSON.stringify(state));
  await screenshot(`smoke-${name}`);
}

await page.context().tracing.start({ screenshots: true, snapshots: true });
try {
  await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForFunction(() => document.querySelector('canvas'), null, { timeout: 15_000 });
  await page.waitForFunction(() => window.__slot, null, { timeout: 15_000 });
  await page.waitForTimeout(300);
  await injectPlantedBad(plantedBad);

  const boot = await readSlotState();
  check('canvas present', boot.hasCanvas);
  check('slot debug api present', boot.hasSlot);
  check('ui root present', boot.hasUi);
  check(
    'settings/paytable api present',
    boot.hasSettingsApi && boot.hasPaytableApi && boot.hasThemeApi,
  );
  check('hud theme diagnostics present', !!boot.uiTheme?.jackpots?.MINI);
  await screenshot('smoke-boot');

  await page.evaluate(() => window.__slot.applyTheme('classic'));
  await page.waitForTimeout(100);
  let theme = await readSlotState();
  const classicUi = theme.uiTheme;
  check('classic theme hides spokey chrome', !theme.cabinetVisible && !theme.uneaseEnabled);
  check('classic jackpot diagnostics sane', jackpotDiagnosticsSane(classicUi));

  await page.evaluate(() => window.__slot.applyTheme('neon'));
  await page.waitForTimeout(100);
  theme = await readSlotState();
  const neonUi = theme.uiTheme;
  check('neon theme keeps spokey chrome off', !theme.cabinetVisible && !theme.uneaseEnabled);
  check('neon theme repaints hud chrome', hudRepainted(classicUi, neonUi));
  check('neon jackpot diagnostics sane', jackpotDiagnosticsSane(neonUi));

  await page.evaluate(() => window.__slot.applyTheme('spokey'));
  await page.waitForTimeout(150);
  theme = await readSlotState();
  const spokeyUi = theme.uiTheme;
  check('spokey theme engages cabinet + unease', theme.cabinetVisible && theme.uneaseEnabled);
  check('spokey theme repaints hud chrome', hudRepainted(neonUi, spokeyUi));
  check('spokey jackpot diagnostics sane', jackpotDiagnosticsSane(spokeyUi));
  await screenshot('smoke-theme-spokey');

  await assertModal(
    'settings panel',
    'openSettings',
    '',
    (state) => state.settingsOpen && !state.paytableOpen,
  );
  await page.evaluate(() => window.__slot.settings.close());
  await page.waitForTimeout(100);
  check('settings panel closes', !(await readSlotState()).settingsOpen);

  await assertModal(
    'paytable panel',
    'openPaytable',
    '',
    (state) => state.paytableOpen && !state.settingsOpen,
  );
  await page.evaluate(() => window.__slot.paytable.close());
  await page.waitForTimeout(100);
  check('paytable panel closes', !(await readSlotState()).paytableOpen);

  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  const allOk = checks.every((item) => item.ok);

  if (plantedBad) {
    if (allOk) throw new Error(`planted browser-smoke fault survived: ${plantedBad}`);
    console.log(`PASS planted fault killed: ${plantedBad}`);
  } else if (!allOk) {
    const failed = checks
      .filter((item) => !item.ok)
      .map((item) => item.name)
      .join(', ');
    throw new Error(`browser smoke failed checks: ${failed}`);
  }

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
