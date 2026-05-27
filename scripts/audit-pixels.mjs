// Run pixel-diff at a wide variety of states.
import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

const URLS = { a: 'http://localhost:8765/index.html', b: 'http://localhost:8766/index.html' };
await mkdir('/tmp/audit-pix', { recursive: true });

async function snap(url, label, action, vp = [480, 1300]) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  if (action) await action(page);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `/tmp/audit-pix/${label}.png`, fullPage: true });
  await ctx.close();
}

async function compare(label) {
  const a = PNG.sync.read(await readFile(`/tmp/audit-pix/a-${label}.png`));
  const b = PNG.sync.read(await readFile(`/tmp/audit-pix/b-${label}.png`));
  const w = Math.min(a.width, b.width);
  const h = Math.min(a.height, b.height);
  const diff = new PNG({ width: w, height: h });
  function crop(img) {
    if (img.width === w && img.height === h) return img;
    const c = new PNG({ width: w, height: h });
    for (let y = 0; y < h; y++)
      img.data.copy(c.data, y * w * 4, y * img.width * 4, y * img.width * 4 + w * 4);
    return c;
  }
  const aC = crop(a);
  const bC = crop(b);
  const mm = pixelmatch(aC.data, bC.data, diff.data, w, h, { threshold: 0.1 });
  await writeFile(`/tmp/audit-pix/diff-${label}.png`, PNG.sync.write(diff));
  const total = w * h;
  console.log(`${label}: ${mm}/${total} (${((mm/total)*100).toFixed(3)}%)`);
  return mm === 0;
}

const cases = [
  // [name, action, viewport]
  ['hot-light',           async (p) => { const b = await p.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn'); if (b[0]) await b[0].click(); }],
  ['hot-strong',          async (p) => { const b = await p.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn'); if (b[2]) await b[2].click(); }],
  ['hot-sweet',           async (p) => { const b = await p.$$('.setting-item.wide-half .seg-btn'); if (b[0]) await b[0].click(); }],
  ['hot-bright',          async (p) => { const b = await p.$$('.setting-item.wide-half .seg-btn'); if (b[2]) await b[2].click(); }],
  ['powder-5',            async (p) => { for (let i = 0; i < 10; i++) await p.click('.qs7-btn.minus5'); }],
  ['powder-50',           async (p) => { for (let i = 0; i < 10; i++) await p.click('.qs7-btn.plus5'); }],
  ['powder-30',           async (p) => { await p.click('.qs7-btn.plus5'); await p.click('.qs7-btn.plus5'); }],
  ['hamburger',           async (p) => { await p.click('.hamburger-btn'); }, [400, 800]],
  ['light-theme',         async (p) => { await p.click('.theme-toggle'); }, [800, 1200]],
  ['en-iced',             async (p) => { await p.click('.lang-toggle'); await p.waitForTimeout(200); await p.click('.recipe-dropdown-trigger'); await p.waitForTimeout(200); const items = await p.$$('.recipe-dropdown-item'); if (items[1]) await items[1].click(); }, [800, 1200]],
  ['recipe-menu-open',    async (p) => { await p.click('.recipe-dropdown-trigger'); }],
  ['confirm-reset',       async (p) => { await p.click('.btn-play'); await p.waitForTimeout(200); await p.click('.btn-reset'); }],
  ['confirm-skip',        async (p) => { const r = await p.$$('.tl-row.clickable'); if (r[2]) await r[2].click(); }],
  ['confirm-finish',      async (p) => { await p.click('.tl-row.tl-row-finish'); }],
  ['flavor-help-ja',      async (p) => { await p.click('.help-btn'); }],
  ['flavor-help-light',   async (p) => { await p.click('.theme-toggle'); await p.waitForTimeout(200); await p.click('.help-btn'); }, [800, 1200]],
  ['se-muted',            async (p) => { await p.click('.btn-se-toggle'); }],
  ['se-volume-zero',      async (p) => { await p.evaluate(() => { const s = document.querySelector('.se-volume-slider'); s.value = '0'; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }); }],
];

for (const [name, action, vp] of cases) {
  await snap(URLS.a, `a-${name}`, action, vp);
  await snap(URLS.b, `b-${name}`, action, vp);
  await compare(name);
}

await browser.close();
