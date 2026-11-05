// Browser smoke test against a running dev server (uses the installed Edge, no browser download).
//   npm run dev -- --port 5179   then   npx tsx scripts/smoke.ts [baseUrl] [outDir]
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://localhost:5179/';
const out = process.argv[3] ?? 'sim-output/screens';
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const shot = (name: string) => page.screenshot({ path: `${out}/${name}.png` });
const sleep = (ms: number) => page.waitForTimeout(ms);

await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await sleep(500);
await shot('01-menu');

await page.getByRole('button', { name: process.argv[4] === 'duo' ? '双人同屏' : '单人游戏' }).click();
await page.waitForSelector('canvas');
await sleep(800);
await shot('02-play');

// drop the hook a few times
for (let i = 0; i < 6; i++) {
  await page.keyboard.press('KeyS');
  await page.keyboard.press('ArrowDown');
  await sleep(1300);
  if (i === 1) await shot('03-hooking');
}
await shot('04-play-later');

// give enough gold and end the level
await page.evaluate(() => {
  // debug handle exposed by the /play route in dev builds
  const gm = (window as unknown as { __gm?: { addGold(n: number): void; end(): void } }).__gm;
  gm?.addGold(1000);
  gm?.end();
});
await sleep(400);
await shot('05-timeup');
await page.waitForURL(/result/, { timeout: 5000 });
await sleep(300);
await shot('06-result');

await page.getByRole('button', { name: /前往商店/ }).click();
await page.waitForURL(/shop/);
await sleep(300);
await shot('07-shop');
const buy = page.getByRole('button', { name: '购买' }).first();
if ((await buy.count()) > 0 && (await buy.isEnabled())) {
  await buy.click();
} else {
  // duo: select the bomb, P1 proposes with S, P2 confirms with ↓
  await page.locator('.card .name', { hasText: '炸弹' }).click();
  await page.keyboard.press('KeyS');
  await sleep(200);
  await shot('07b-shop-pending');
  await page.keyboard.press('ArrowDown');
}
await sleep(300);
await page.getByRole('button', { name: /完成购物/ }).click();
await page.waitForURL(/prep/);
await sleep(300);
await shot('08-prep');
await page.getByRole('button', { name: /开始第 2 关/ }).click();
await page.waitForURL(/play/);
await sleep(1000);
await shot('09-level2');

await page.keyboard.press('Escape');
await sleep(300);
await shot('10-pause');

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();
