// Compare network behavior: fetched assets, manifest, sw.js registration.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

async function inspect(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', (r) => {
    requests.push({
      method: r.method(),
      url: r.url().replace(/https?:\/\/localhost:\d+/, ''),
    });
  });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  // Check service worker registration
  const swInfo = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return null;
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.map((r) => ({
      scope: r.scope.replace(/https?:\/\/localhost:\d+/, ''),
      active: r.active?.scriptURL.replace(/https?:\/\/localhost:\d+/, '') ?? null,
      installing: !!r.installing,
      waiting: !!r.waiting,
    }));
  });
  // Check manifest link
  const manifest = await page.evaluate(() => {
    const link = document.querySelector('link[rel="manifest"]');
    return link ? link.getAttribute('href') : null;
  });
  // Check favicon, apple-touch-icon
  const icons = await page.evaluate(() => {
    return [...document.querySelectorAll('link[rel*="icon"]')].map((l) => ({
      rel: l.getAttribute('rel'),
      href: l.getAttribute('href'),
      type: l.getAttribute('type'),
    }));
  });
  // Check meta tags
  const metas = await page.evaluate(() => {
    return [...document.querySelectorAll('meta')].map((m) => ({
      name: m.getAttribute('name') || m.getAttribute('property'),
      content: m.getAttribute('content'),
    })).filter((m) => m.name);
  });
  await ctx.close();
  return { requests, swInfo, manifest, icons, metas };
}

const a = await inspect('http://localhost:8765/index.html');
const b = await inspect('http://localhost:8766/index.html');

console.log('=== Requests A ===');
a.requests.forEach((r) => console.log(`  ${r.method} ${r.url}`));
console.log('=== Requests B ===');
b.requests.forEach((r) => console.log(`  ${r.method} ${r.url}`));

console.log('\n=== Service Worker A ===');
console.log(JSON.stringify(a.swInfo, null, 2));
console.log('=== Service Worker B ===');
console.log(JSON.stringify(b.swInfo, null, 2));

console.log('\n=== Manifest A:', a.manifest);
console.log('=== Manifest B:', b.manifest);

console.log('\n=== Icons A ===');
a.icons.forEach((i) => console.log(`  ${i.rel} ${i.type ?? ''} ${i.href}`));
console.log('=== Icons B ===');
b.icons.forEach((i) => console.log(`  ${i.rel} ${i.type ?? ''} ${i.href}`));

console.log('\n=== Meta diff ===');
const ma = new Map(a.metas.map((m) => [m.name, m.content]));
const mb = new Map(b.metas.map((m) => [m.name, m.content]));
const allKeys = new Set([...ma.keys(), ...mb.keys()]);
for (const k of allKeys) {
  if (ma.get(k) !== mb.get(k)) {
    console.log(`  ${k}: A=${ma.get(k) ?? '(missing)'} | B=${mb.get(k) ?? '(missing)'}`);
  }
}
console.log('(meta diff complete)');

await browser.close();
