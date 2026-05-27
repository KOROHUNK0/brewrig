// Take screenshots of both builds in multiple states.
import { chromium } from 'playwright-core';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const out = '/tmp/screens';
await mkdir(out, { recursive: true });

async function snap(url, label, action, { width = 480, height = 1200 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (action) await action(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${label}.png`, fullPage: true });
  await ctx.close();
}

const urls = {
  a: 'http://localhost:8765/index.html',
  b: 'http://localhost:8766/index.html',
};

// 480 = below the wide-controls breakpoint, so theme/lang toggles live
// inside the hamburger menu. Use the wider 720 viewport for those.
const wide = { width: 720, height: 1200 };

await snap(urls.a, 'a-initial');
await snap(urls.b, 'b-initial');

await snap(urls.a, 'a-light', async (p) => p.click('.theme-toggle'), wide);
await snap(urls.b, 'b-light', async (p) => p.click('.theme-toggle'), wide);

await snap(urls.a, 'a-en', async (p) => p.click('.lang-toggle'), wide);
await snap(urls.b, 'b-en', async (p) => p.click('.lang-toggle'), wide);

await snap(urls.a, 'a-hybrid', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(200);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();
});
await snap(urls.b, 'b-hybrid', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(200);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();
});

await snap(urls.a, 'a-iced', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(200);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[1]) await items[1].click();
});
await snap(urls.b, 'b-iced', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(200);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[1]) await items[1].click();
});

await snap(urls.a, 'a-flavor-help', async (p) => p.click('.help-btn'));
await snap(urls.b, 'b-flavor-help', async (p) => p.click('.help-btn'));

await snap(urls.a, 'a-bright', async (p) => {
  const btns = await p.$$('.setting-item.wide-half .seg-btn');
  if (btns[2]) await btns[2].click();
});
await snap(urls.b, 'b-bright', async (p) => {
  const btns = await p.$$('.setting-item.wide-half .seg-btn');
  if (btns[2]) await btns[2].click();
});

await browser.close();
console.log(`screenshots saved to ${out}`);
