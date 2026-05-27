// Run the confirm-cancel scenario multiple times to detect flake.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function run(url) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 1200 } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.click('.btn-play');
  await page.waitForTimeout(300);
  await page.click('.btn-reset');
  await page.waitForTimeout(200);
  await page.click('.dialog-cancel');
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const tc = document.querySelector('.timer-card');
    const row = document.querySelector('.tl-row.active');
    const txt = document.querySelector('.timer-text')?.textContent;
    return {
      timerText: txt,
      pulseOnCard: tc?.classList.contains('pulse') ?? false,
      highlightOnRow: row?.classList.contains('highlight') ?? false,
    };
  });
  await ctx.close();
  return r;
}

const URLS = {
  a: 'http://localhost:8765/index.html',
  b: 'http://localhost:8766/index.html',
};

console.log('Run 5 trials, each both A and B');
for (let i = 0; i < 5; i++) {
  const a = await run(URLS.a);
  const b = await run(URLS.b);
  console.log(`Trial ${i + 1}:`);
  console.log(`  A: timer=${a.timerText} pulse=${a.pulseOnCard} highlight=${a.highlightOnRow}`);
  console.log(`  B: timer=${b.timerText} pulse=${b.pulseOnCard} highlight=${b.highlightOnRow}`);
}

await browser.close();
