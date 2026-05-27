// Verify timer-related behaviors against backup.
import { chromium } from 'playwright-core';

const [, , urlA, urlB] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

async function snapshotAt(url, action) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await action(page);
  await page.waitForTimeout(200);
  const tree = await page.evaluate(() => {
    function s(node, depth) {
      if (node.nodeType === 3) {
        const t = node.textContent.trim();
        return t ? `${'  '.repeat(depth)}# "${t.slice(0, 100)}"\n` : '';
      }
      if (node.nodeType !== 1) return '';
      const tag = node.tagName.toLowerCase();
      if (tag === 'script' || tag === 'style' || tag === 'link') return '';
      const cls = node.getAttribute('class') || '';
      const role = node.getAttribute('role') || '';
      const dataTheme = node.getAttribute('data-theme') || '';
      const attrs = [
        cls && `.${cls.replace(/\s+/g, '.')}`,
        role && `[role=${role}]`,
        dataTheme && `[data-theme=${dataTheme}]`,
      ].filter(Boolean).join('');
      let out = `${'  '.repeat(depth)}<${tag}${attrs}>\n`;
      for (const child of node.childNodes) {
        out += s(child, depth + 1);
      }
      return out;
    }
    return s(document.body, 0);
  });
  await ctx.close();
  return tree;
}

async function compare(name, action) {
  const a = await snapshotAt(urlA, action);
  const b = await snapshotAt(urlB, action);
  // Normalise volatile numeric timer text difference is unavoidable; use a
  // tolerance: replace mm:ss patterns in both before comparing.
  const norm = (s) => s.replace(/\d\d:\d\d/g, 'MM:SS');
  const ok = norm(a) === norm(b);
  console.log(`[${ok ? 'OK ' : 'NG '}] ${name} (${a.length} vs ${b.length} bytes)`);
  if (!ok) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(`/tmp/timer-a-${name}.txt`, a);
    writeFileSync(`/tmp/timer-b-${name}.txt`, b);
  }
}

await compare('start-and-wait', async (p) => {
  await p.click('button.btn-play');
  // Wait until ~3 seconds elapsed to capture progression of timer/UI.
  await p.waitForTimeout(3200);
});

await compare('start-pause', async (p) => {
  await p.click('button.btn-play');
  await p.waitForTimeout(1500);
  await p.click('button.btn-pause');
});

await compare('reset-after-start', async (p) => {
  await p.click('button.btn-play');
  await p.waitForTimeout(800);
  await p.click('button.btn-reset');
  // Dialog appears — confirm OK
  await p.waitForTimeout(200);
  const ok = await p.$('.dialog-ok');
  if (ok) await ok.click();
  await p.waitForTimeout(200);
});

await compare('toggle-se', async (p) => {
  await p.click('.btn-se-toggle');
});

await browser.close();
