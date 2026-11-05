// Touch + tooltip check against a running dev server (installed Edge, mobile emulation).
//   npx tsx --tsconfig tsconfig.node.json scripts/smoke-mobile.ts http://127.0.0.1:5173/ sim-output/mobile
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright-core';

const base = process.argv[2] ?? 'http://127.0.0.1:5173/';
const out = process.argv[3] ?? 'sim-output/mobile';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const errors: string[] = [];

// ---- phone, landscape, duo ----
const phone = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await phone.newPage();
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(base);
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/01-menu.png` });
await page.getByRole('button', { name: '双人同屏' }).tap();
await page.waitForSelector('canvas');
await page.waitForTimeout(1200);
const box = (await page.locator('.frame').boundingBox())!;
const states = async () =>
  page.evaluate(() => {
    const gm = (window as unknown as { __gm?: { host: { session: { players: { hook: { state: string } }[] } } } }).__gm;
    return gm?.host.session.players.map((p) => p.hook.state);
  });
await page.touchscreen.tap(box.x + box.width * 0.25, box.y + box.height * 0.6);
await page.waitForTimeout(150);
const afterLeft = await states();
await page.touchscreen.tap(box.x + box.width * 0.75, box.y + box.height * 0.6);
await page.waitForTimeout(150);
const afterRight = await states();
await page.screenshot({ path: `${out}/02-play-touch.png` });
// pause button
await page.locator('.touch-pause').tap();
await page.waitForTimeout(200);
const paused = await page.locator('text=暂停').first().isVisible();
await page.screenshot({ path: `${out}/03-paused.png` });
console.log(JSON.stringify({ afterLeft, afterRight, paused }));
await phone.close();

// ---- desktop tooltip ----
const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
desk.on('pageerror', (e) => errors.push(String(e)));
await desk.goto(base);
await desk.evaluate(() => localStorage.clear());
await desk.reload();
await desk.getByRole('button', { name: '单人游戏' }).click();
await desk.waitForSelector('canvas');
await desk.waitForTimeout(500);
// PC: clicking the playfield must not drop the hook, and there are no touch buttons
await desk.locator('.frame').click({ position: { x: 300, y: 400 } });
await desk.waitForTimeout(150);
const pcHook = await desk.evaluate(
  () => (window as unknown as { __gm?: { host: { session: { players: { hook: { state: string } }[] } } } }).__gm?.host.session.players[0]?.hook.state,
);
const pcTouchButtons = await desk.locator('.touch-btn').count();
console.log(JSON.stringify({ pcHook, pcTouchButtons }));
await desk.evaluate(() => {
  const gm = (window as unknown as { __gm?: { addGold(n: number): void; end(): void } }).__gm;
  gm?.addGold(3000);
  gm?.end();
});
await desk.waitForURL(/result/, { timeout: 5000 });
await desk.getByRole('button', { name: /前往商店/ }).click();
await desk.waitForURL(/shop/);
await desk.locator('.card').nth(1).hover();
await desk.waitForTimeout(300);
await desk.screenshot({ path: `${out}/04-shop-tooltip.png` });
await desk.locator('.card').nth(5).hover();
await desk.waitForTimeout(300);
await desk.screenshot({ path: `${out}/05-shop-tooltip-hook.png` });
console.log(JSON.stringify({ errors }));
await browser.close();
