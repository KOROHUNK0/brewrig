// Compare interactive behaviors between two builds.
import { chromium } from 'playwright-core';

const [, , urlA, urlB] = process.argv;
const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox'],
});

async function open(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  return { page, ctx };
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
    const role = node.getAttribute('role') || '';
    const dataTheme = node.getAttribute('data-theme') || '';
    const id = node.getAttribute('id') || '';
    const attrs = [
      id && `#${id}`,
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
}

async function snap(page) {
  return await page.evaluate(bodyTree);
}

async function step(label, action) {
  const a = await open(urlA);
  const b = await open(urlB);
  try {
    await action(a.page);
    await action(b.page);
    await a.page.waitForTimeout(400);
    await b.page.waitForTimeout(400);
    const sa = await snap(a.page);
    const sb = await snap(b.page);
    const ok = sa === sb;
    process.stdout.write(`[${ok ? 'OK ' : 'NG '}] ${label} (${sa.length} vs ${sb.length} bytes)\n`);
    if (!ok) {
      // Write diffs to files
      const { writeFileSync } = await import('node:fs');
      writeFileSync(`/tmp/snap-a-${label.replace(/\W+/g, '_')}.txt`, sa);
      writeFileSync(`/tmp/snap-b-${label.replace(/\W+/g, '_')}.txt`, sb);
    }
  } finally {
    await a.ctx.close();
    await b.ctx.close();
  }
}

await step('initial', async () => {});
await step('toggle-theme', async (p) => {
  await p.click('.theme-toggle');
});
await step('toggle-lang', async (p) => {
  await p.click('.lang-toggle');
});
await step('powder-plus5', async (p) => {
  await p.click('.qs7-btn.plus5');
});
await step('select-iced', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(150);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[1]) await items[1].click();
});
await step('select-hybrid', async (p) => {
  await p.click('.recipe-dropdown-trigger');
  await p.waitForTimeout(150);
  const items = await p.$$('.recipe-dropdown-item');
  if (items[2]) await items[2].click();
});
await step('flavor-bright', async (p) => {
  const btns = await p.$$('.setting-item.wide-half .seg-btn');
  if (btns[2]) await btns[2].click();
});
await step('open-flavor-help', async (p) => {
  await p.click('.help-btn');
});

await browser.close();
