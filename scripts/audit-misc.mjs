// Miscellaneous checks: keyboard interactions, focus states, computed styles
// for highly-styled elements, and behavior under various edge cases.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

const URLS = { a: 'http://localhost:8765/index.html', b: 'http://localhost:8766/index.html' };

async function open(url, vp = [480, 1200]) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

// 1. Computed style snapshot of key elements.
async function checkComputedStyles(url) {
  const { ctx, page } = await open(url);
  const styles = await page.evaluate(() => {
    const sel = [
      '.app',
      '.header',
      '.title',
      '.subtitle',
      '.recipe-card',
      '.recipe-dropdown-trigger',
      '.recipe-recommend-badge',
      '.recipe-label-tag-hot',
      '.settings-card',
      '.setting-label',
      '.qs7-btn.minus5',
      '.qs7-input',
      '.qs7-unit',
      '.seg-track',
      '.seg-thumb',
      '.seg-btn.active',
      '.help-btn',
      '.roast-chip',
      '.roast-chip-temp-single',
      '.total-water-value',
      '.timer-card',
      '.timer-text',
      '.action-amount-inline',
      '.action-text-inline',
      '.btn-play',
      '.btn-reset',
      '.btn-se-toggle',
      '.se-volume-slider',
      '.tl-track',
      '.tl-dot',
      '.tl-row.active',
      '.tl-time',
      '.tl-label',
      '.app-footer',
      '.app-footer-link',
    ];
    const collect = (s) => {
      const el = document.querySelector(s);
      if (!el) return '(missing)';
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        bg: cs.backgroundColor,
        color: cs.color,
        font: cs.fontFamily,
        size: cs.fontSize,
        weight: cs.fontWeight,
        border: cs.border,
        radius: cs.borderRadius,
        padding: cs.padding,
        margin: cs.margin,
        display: cs.display,
        position: cs.position,
        width: cs.width,
        height: cs.height,
        rect: `${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      };
    };
    const out = {};
    for (const s of sel) out[s] = collect(s);
    return out;
  });
  await ctx.close();
  return styles;
}

const a = await checkComputedStyles(URLS.a);
const b = await checkComputedStyles(URLS.b);

let mismatches = 0;
console.log('=== Computed style comparison ===');
for (const sel of Object.keys(a)) {
  const av = a[sel];
  const bv = b[sel];
  if (typeof av !== typeof bv) {
    console.log(`[NG] ${sel}: types differ`);
    mismatches++;
    continue;
  }
  if (typeof av === 'string') {
    if (av !== bv) {
      console.log(`[NG] ${sel}: A=${av} B=${bv}`);
      mismatches++;
    }
    continue;
  }
  for (const k of Object.keys(av)) {
    if (av[k] !== bv[k]) {
      console.log(`[NG] ${sel}.${k}: A=${av[k]} B=${bv[k]}`);
      mismatches++;
    }
  }
}
console.log(`\nTotal style mismatches: ${mismatches}`);

// 2. Keyboard interactions.
async function keyboardTest(url) {
  const { ctx, page } = await open(url);
  // Tab through 5 focusable elements
  const focused = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const tag = await page.evaluate(() => {
      const a = document.activeElement;
      if (!a) return null;
      return `${a.tagName.toLowerCase()}.${a.className || ''}`.slice(0, 80);
    });
    focused.push(tag);
  }
  await ctx.close();
  return focused;
}

const ka = await keyboardTest(URLS.a);
const kb = await keyboardTest(URLS.b);
console.log('\n=== Tab focus order ===');
let kbMismatches = 0;
for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
  if (ka[i] !== kb[i]) {
    console.log(`#${i}: A=${ka[i]} | B=${kb[i]}`);
    kbMismatches++;
  }
}
console.log(`Tab focus mismatches: ${kbMismatches}`);

await browser.close();
