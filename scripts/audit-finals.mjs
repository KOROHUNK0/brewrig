// Final checks: initial cookies written, hot-recipe timeline rows have
// no flow badges, finish state display, audio variant defaults.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

const URLS = { a: 'http://localhost:8765/index.html', b: 'http://localhost:8766/index.html' };

async function open(url, ua) {
  const ctx = await browser.newContext({ userAgent: ua });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { ctx, page };
}

// 1. Verify first-load cookie writes (desktop vs mobile).
async function firstLoadCookies(url, label, ua) {
  const { ctx, page } = await open(url, ua);
  const cookies = await ctx.cookies();
  console.log(`${label}: ${cookies.map(c => `${c.name}=${c.value}`).join('; ')}`);
  await ctx.close();
  return cookies;
}

console.log('=== Initial cookie defaults ===');
const aDesk = await firstLoadCookies(URLS.a, 'A desktop ');
const bDesk = await firstLoadCookies(URLS.b, 'B desktop ');
const mobUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
const aMob = await firstLoadCookies(URLS.a, 'A mobile  ', mobUA);
const bMob = await firstLoadCookies(URLS.b, 'B mobile  ', mobUA);

function eq(a, b) {
  return JSON.stringify(a.map(c => `${c.name}=${c.value}`).sort()) ===
         JSON.stringify(b.map(c => `${c.name}=${c.value}`).sort());
}
console.log(`Desktop match: ${eq(aDesk, bDesk) ? 'YES' : 'NO'}`);
console.log(`Mobile match:  ${eq(aMob, bMob) ? 'YES' : 'NO'}`);

// 2. Hot recipe timeline rows — should NOT have flow badges.
async function timelineBadgesHot(url) {
  const { ctx, page } = await open(url);
  const badges = await page.evaluate(() => {
    return [...document.querySelectorAll('.tl-row.clickable')].map((r) => ({
      label: r.querySelector('.tl-label')?.textContent,
      badges: [...r.querySelectorAll('.tl-badges *')].map((b) => `${b.className}:${b.textContent}`),
    }));
  });
  await ctx.close();
  return badges;
}

console.log('\n=== Hot recipe timeline badges ===');
const tbA = await timelineBadgesHot(URLS.a);
const tbB = await timelineBadgesHot(URLS.b);
const sameBadges = JSON.stringify(tbA) === JSON.stringify(tbB);
console.log(`Match: ${sameBadges ? 'YES' : 'NO'}`);
console.log('A:', JSON.stringify(tbA));
console.log('B:', JSON.stringify(tbB));

// 3. Hybrid recipe timeline rows — should HAVE flow badges + stepTag on step 4.
async function timelineBadgesHybrid(url) {
  const { ctx, page } = await open(url);
  await page.click('.recipe-dropdown-trigger');
  await page.waitForTimeout(200);
  const items = await page.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();
  await page.waitForTimeout(300);
  const badges = await page.evaluate(() => {
    return [...document.querySelectorAll('.tl-row.clickable')].map((r) => ({
      label: r.querySelector('.tl-label')?.textContent,
      badges: [...r.querySelectorAll('.tl-badges *')].map((b) => `${b.className}:${b.textContent}`),
    }));
  });
  await ctx.close();
  return badges;
}

console.log('\n=== Hybrid recipe timeline badges ===');
const hbA = await timelineBadgesHybrid(URLS.a);
const hbB = await timelineBadgesHybrid(URLS.b);
const sameHybrid = JSON.stringify(hbA) === JSON.stringify(hbB);
console.log(`Match: ${sameHybrid ? 'YES' : 'NO'}`);
console.log('A:', JSON.stringify(hbA, null, 2));

// 4. Check button title attributes (tooltips).
async function buttonTitles(url) {
  const { ctx, page } = await open(url);
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('button[title]')].map((b) => ({
      cls: b.className,
      title: b.getAttribute('title'),
    }));
  });
  await ctx.close();
  return data;
}

console.log('\n=== Button titles (tooltips) ===');
const btA = await buttonTitles(URLS.a);
const btB = await buttonTitles(URLS.b);
const sameTitles = JSON.stringify(btA) === JSON.stringify(btB);
console.log(`Match: ${sameTitles ? 'YES' : 'NO'}`);
if (!sameTitles) {
  console.log('A:', JSON.stringify(btA, null, 2));
  console.log('B:', JSON.stringify(btB, null, 2));
}

// 5. Check tl-row title attributes.
async function rowTitles(url) {
  const { ctx, page } = await open(url);
  const data = await page.evaluate(() => {
    return [...document.querySelectorAll('.tl-row[title]')].map((r) => r.getAttribute('title'));
  });
  await ctx.close();
  return data;
}

console.log('\n=== Timeline row titles ===');
const rA = await rowTitles(URLS.a);
const rB = await rowTitles(URLS.b);
console.log(`Match: ${JSON.stringify(rA) === JSON.stringify(rB) ? 'YES' : 'NO'}`);
console.log('A:', rA);

await browser.close();
