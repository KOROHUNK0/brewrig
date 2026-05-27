// Verify storage layer (cookies/localStorage/sessionStorage) parity.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

async function inspect(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Change a setting, check storage write.
  await page.click('.recipe-dropdown-trigger');
  await page.waitForTimeout(200);
  const items = await page.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();   // pick hybrid
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = document.querySelector('.se-volume-slider');
    s.value = '0.33';
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => ({
    cookieStr: document.cookie,
    localKeys: Object.keys(localStorage),
    sessionKeys: Object.keys(sessionStorage),
    localItems: Object.fromEntries(Object.entries(localStorage)),
    sessionItems: Object.fromEntries(Object.entries(sessionStorage)),
  }));
  await ctx.close();
  return data;
}

const a = await inspect('http://localhost:8765/index.html');
const b = await inspect('http://localhost:8766/index.html');
console.log('=== A (backup) ===');
console.log(JSON.stringify(a, null, 2));
console.log('=== B (dist) ===');
console.log(JSON.stringify(b, null, 2));

// Reload-persistence: verify cookies survive a reload.
async function reloadCheck(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Change recipe
  await page.click('.recipe-dropdown-trigger');
  await page.waitForTimeout(200);
  const items = await page.$$('.recipe-dropdown-item');
  if (items[1]) await items[1].click();
  await page.waitForTimeout(300);
  // Reload
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const restored = await page.evaluate(() => ({
    recipe: document.querySelector('.recipe-dropdown-label')?.textContent,
    cookies: document.cookie,
  }));
  await ctx.close();
  return restored;
}

const ar = await reloadCheck('http://localhost:8765/index.html');
const br = await reloadCheck('http://localhost:8766/index.html');
console.log('\n=== Reload persistence ===');
console.log('A after reload:', ar);
console.log('B after reload:', br);

await browser.close();
