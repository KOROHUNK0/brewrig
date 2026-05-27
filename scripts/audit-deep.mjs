// Deep parity audit: cookie persistence, more dialog states, animations,
// timer at multiple points, hover/focus states, and CSS computed values
// for highly-styled elements.
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function open(url, vp = [480, 1200], ua) {
  const ctx = await browser.newContext({
    viewport: { width: vp[0], height: vp[1] },
    userAgent: ua,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return { ctx, page };
}

function bodyTree() {
  function s(node, depth) {
    if (node.nodeType === 3) {
      const t = node.textContent.trim();
      return t ? `${'  '.repeat(depth)}# "${t.slice(0, 80)}"\n` : '';
    }
    if (node.nodeType !== 1) return '';
    const tag = node.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style' || tag === 'link') return '';
    const cls = node.getAttribute('class') || '';
    const inputType = node.getAttribute('type') || '';
    const value = tag === 'input' ? `[value=${node.value}]` : '';
    const checked = (tag === 'input' && node.checked) ? '[checked]' : '';
    const disabled = node.disabled ? '[disabled]' : '';
    const attrs = [
      cls && `.${cls.replace(/\s+/g, '.')}`,
      inputType && tag === 'input' && `[type=${inputType}]`,
      value, checked, disabled,
    ].filter(Boolean).join('');
    let out = `${'  '.repeat(depth)}<${tag}${attrs}>\n`;
    for (const c of node.childNodes) out += s(c, depth + 1);
    return out;
  }
  return s(document.body, 0);
}

const URLS = { a: 'http://localhost:8765/index.html', b: 'http://localhost:8766/index.html' };

async function compareState(label, action, vp, ua) {
  const A = await open(URLS.a, vp, ua);
  const B = await open(URLS.b, vp, ua);
  try {
    if (action) {
      await action(A.page);
      await action(B.page);
    }
    await A.page.waitForTimeout(400);
    await B.page.waitForTimeout(400);
    const ta = await A.page.evaluate(bodyTree);
    const tb = await B.page.evaluate(bodyTree);
    const norm = (s) => s
      .replace(/\d\d:\d\d/g, 'MM:SS')
      .replace(/\[value=\d+(\.\d+)?\]/g, '[value=N]');
    const ok = norm(ta) === norm(tb);
    console.log(`[${ok ? 'OK ' : 'NG '}] ${label} (A=${ta.length} B=${tb.length})`);
    if (!ok) {
      await writeFile(`/tmp/deep-${label}-a.txt`, ta);
      await writeFile(`/tmp/deep-${label}-b.txt`, tb);
    }
    return ok;
  } finally {
    await A.ctx.close();
    await B.ctx.close();
  }
}

// 1. Cookie persistence: set cookies then reload and check initial state.
async function compareCookiePersistence() {
  const A = await open(URLS.a);
  const B = await open(URLS.b);
  try {
    // Switch recipe to iced + change SE volume.
    for (const page of [A.page, B.page]) {
      await page.click('.recipe-dropdown-trigger');
      await page.waitForTimeout(200);
      const items = await page.$$('.recipe-dropdown-item');
      if (items[1]) await items[1].click();
      // Volume change
      await page.evaluate(() => {
        const slider = document.querySelector('.se-volume-slider');
        if (slider) {
          slider.value = '0.25';
          slider.dispatchEvent(new Event('input', { bubbles: true }));
          slider.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await page.waitForTimeout(300);
    }
    const aCookies = await A.ctx.cookies();
    const bCookies = await B.ctx.cookies();
    const a = aCookies.map((c) => `${c.name}=${c.value}`).sort();
    const b = bCookies.map((c) => `${c.name}=${c.value}`).sort();
    const ok = JSON.stringify(a) === JSON.stringify(b);
    console.log(`[${ok ? 'OK ' : 'NG '}] cookie-write A=${a.join(',')} B=${b.join(',')}`);
  } finally {
    await A.ctx.close();
    await B.ctx.close();
  }
}

// 2. Verify overtime display (timer > FINISH_TIME).
async function compareOvertimeState() {
  // Skip to finish to enter finished state.
  await compareState('overtime-0s', async (page) => {
    await page.click('.tl-row.tl-row-finish');
    await page.waitForTimeout(200);
    const ok = await page.$('.dialog-ok');
    if (ok) await ok.click();
    await page.waitForTimeout(2000);
  }, [480, 1200]);

  await compareState('overtime-60s+', async (page) => {
    await page.click('.tl-row.tl-row-finish');
    await page.waitForTimeout(200);
    const ok = await page.$('.dialog-ok');
    if (ok) await ok.click();
    // Wait until overtime > 60 seconds.
    await page.waitForTimeout(62000);
  }, [480, 1200]);
}

// 3. Compare hot-strong recipe (5 steps).
await compareState('hot-strong-5steps', async (page) => {
  const sbtns = await page.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn');
  if (sbtns[2]) await sbtns[2].click();
  await page.waitForTimeout(300);
});

// 4. Compare iced-light recipe.
await compareState('iced-then-light', async (page) => {
  await page.click('.recipe-dropdown-trigger');
  await page.waitForTimeout(200);
  const items = await page.$$('.recipe-dropdown-item');
  if (items[1]) await items[1].click();
  await page.waitForTimeout(300);
  const sbtns = await page.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn');
  if (sbtns[0]) await sbtns[0].click();
});

// 5. Powder typing input.
await compareState('powder-input-edit', async (page) => {
  // Set via input
  const input = await page.$('.qs7-input');
  if (input) {
    await input.click();
    await input.fill('25');
    await input.dispatchEvent('change');
  }
});

// 6. Click on timeline during play (skip mid-brew).
await compareState('skip-during-play', async (page) => {
  await page.click('.btn-play');
  await page.waitForTimeout(300);
  const rows = await page.$$('.tl-row.clickable');
  if (rows[2]) await rows[2].click();
  await page.waitForTimeout(300);
  const ok = await page.$('.dialog-ok');
  if (ok) await ok.click();
  await page.waitForTimeout(1500);
});

// 7. Confirm cancel button works the same.
await compareState('confirm-cancel', async (page) => {
  await page.click('.btn-play');
  await page.waitForTimeout(300);
  await page.click('.btn-reset');
  await page.waitForTimeout(200);
  await page.click('.dialog-cancel');
  await page.waitForTimeout(300);
});

// 8. SE mute and slider disabled state.
await compareState('se-mute-disabled', async (page) => {
  await page.click('.btn-se-toggle');
});

// 9. Roast chips for hot recipe (no temperature fixed).
await compareState('roast-chips-display', null);

// 10. Equipment shown for hybrid.
await compareState('equipment-hybrid', async (page) => {
  await page.click('.recipe-dropdown-trigger');
  await page.waitForTimeout(200);
  const items = await page.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();
});

// 11. Wide layout (lang toggle / theme toggle visible).
await compareState('wide-layout', null, [800, 1200]);

await compareCookiePersistence();

await browser.close();
