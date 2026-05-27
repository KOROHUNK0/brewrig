// Comprehensive parity audit: compare DOM trees and console output across
// many states, viewport sizes, recipes, and edge cases. Read-only; never
// modifies the source.
import { chromium } from 'playwright-core';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

const URLS = {
  a: 'http://localhost:8765/index.html',
  b: 'http://localhost:8766/index.html',
};

const SCENARIOS = [
  // [name, viewport(w,h), userAgent, action]
  { name: 'default-desktop', vp: [480, 1200], action: null },
  { name: 'wide-desktop', vp: [800, 1200], action: null },
  { name: 'mobile-portrait', vp: [375, 800], ua: 'mobile', action: null },
  { name: 'mobile-landscape', vp: [800, 400], ua: 'mobile', action: null },
  { name: 'narrow-mobile', vp: [320, 600], ua: 'mobile', action: null },
  { name: 'after-2tick', vp: [480, 1200], action: async (p) => {
    await p.click('.btn-play');
    await p.waitForTimeout(2500);
    await p.click('.btn-pause');
  }},
  { name: 'powder-min', vp: [480, 1200], action: async (p) => {
    for (let i = 0; i < 10; i++) await p.click('.qs7-btn.minus5');
  }},
  { name: 'powder-max', vp: [480, 1200], action: async (p) => {
    for (let i = 0; i < 10; i++) await p.click('.qs7-btn.plus5');
  }},
  { name: 'hot-light', vp: [480, 1200], action: async (p) => {
    const btns = await p.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn');
    if (btns[0]) await btns[0].click();
  }},
  { name: 'hot-strong', vp: [480, 1200], action: async (p) => {
    const btns = await p.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn');
    if (btns[2]) await btns[2].click();
  }},
  { name: 'hot-sweet', vp: [480, 1200], action: async (p) => {
    const btns = await p.$$('.setting-item.wide-half .seg-btn');
    if (btns[0]) await btns[0].click();
  }},
  { name: 'iced-light', vp: [480, 1200], action: async (p) => {
    await p.click('.recipe-dropdown-trigger');
    await p.waitForTimeout(200);
    const items = await p.$$('.recipe-dropdown-item');
    if (items[1]) await items[1].click();
    await p.waitForTimeout(200);
    const sbtns = await p.$$('.setting-item.wide-half + .setting-item.wide-half .seg-btn');
    if (sbtns[0]) await sbtns[0].click();
  }},
  { name: 'hybrid-iced', vp: [480, 1200], action: async (p) => {
    await p.click('.recipe-dropdown-trigger');
    await p.waitForTimeout(200);
    const items = await p.$$('.recipe-dropdown-item');
    if (items[3]) await items[3].click();
  }},
  { name: 'hamburger-open', vp: [400, 800], action: async (p) => {
    await p.click('.hamburger-btn');
  }},
  { name: 'confirm-reset-dialog', vp: [480, 1200], action: async (p) => {
    await p.click('.btn-play');
    await p.waitForTimeout(300);
    await p.click('.btn-pause');
    await p.click('.btn-reset');
  }},
  { name: 'confirm-change-dialog', vp: [480, 1200], action: async (p) => {
    await p.click('.btn-play');
    await p.waitForTimeout(300);
    await p.click('.qs7-btn.plus1');
  }},
  { name: 'confirm-skip-dialog', vp: [480, 1200], action: async (p) => {
    const rows = await p.$$('.tl-row.clickable');
    if (rows[1]) await rows[1].click();
  }},
  { name: 'flavor-help-en', vp: [800, 1200], action: async (p) => {
    await p.click('.lang-toggle');
    await p.waitForTimeout(200);
    await p.click('.help-btn');
  }},
  { name: 'powder-edit-mode', vp: [480, 1200], action: async (p) => {
    await p.click('.qs7-input');
  }},
];

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
    const inputType = node.getAttribute('type') || '';
    const value = tag === 'input' ? `[value=${node.value}]` : '';
    const attrs = [
      cls && `.${cls.replace(/\s+/g, '.')}`,
      inputType && tag === 'input' && `[type=${inputType}]`,
      value,
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

async function runScenario(url, scenario) {
  const ua = scenario.ua === 'mobile'
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    : undefined;
  const ctx = await browser.newContext({
    viewport: { width: scenario.vp[0], height: scenario.vp[1] },
    userAgent: ua,
  });
  const page = await ctx.newPage();
  const consoleLines = [];
  const errors = [];
  page.on('console', (m) => consoleLines.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message.slice(0, 200)}`));
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    if (scenario.action) await scenario.action(page);
    await page.waitForTimeout(500);
    const tree = await page.evaluate(bodyTree);
    const cookies = await ctx.cookies();
    return {
      tree,
      consoleLines: consoleLines.filter((l) => !l.includes('CERT_AUTHORITY')),
      errors,
      cookies: cookies.map((c) => `${c.name}=${c.value}`).sort(),
    };
  } finally {
    await ctx.close();
  }
}

const results = {};
for (const scenario of SCENARIOS) {
  process.stderr.write(`▶ ${scenario.name}\n`);
  const a = await runScenario(URLS.a, scenario);
  const b = await runScenario(URLS.b, scenario);
  const norm = (s) => s
    .replace(/\d\d:\d\d/g, 'MM:SS')
    .replace(/\[value=\d+\]/g, '[value=N]');
  const treeMatch = norm(a.tree) === norm(b.tree);
  const cookieMatch = JSON.stringify(a.cookies) === JSON.stringify(b.cookies);
  const errorMatch = a.errors.length === b.errors.length;
  results[scenario.name] = {
    treeMatch,
    cookieMatch,
    errorMatch,
    aTreeBytes: a.tree.length,
    bTreeBytes: b.tree.length,
    aCookies: a.cookies,
    bCookies: b.cookies,
    aErrors: a.errors,
    bErrors: b.errors,
    aConsole: a.consoleLines,
    bConsole: b.consoleLines,
  };
  if (!treeMatch) {
    await writeFile(`/tmp/audit-${scenario.name}-a.txt`, a.tree);
    await writeFile(`/tmp/audit-${scenario.name}-b.txt`, b.tree);
  }
  const status = treeMatch && cookieMatch && errorMatch ? 'OK' : 'NG';
  console.log(`[${status}] ${scenario.name} tree=${treeMatch?'=':'≠'}(${a.tree.length}/${b.tree.length}) cookies=${cookieMatch?'=':'≠'} errors=${errorMatch?'=':'≠'}`);
}

await browser.close();
await writeFile('/tmp/audit-summary.json', JSON.stringify(results, null, 2));
console.log('\nFull report: /tmp/audit-summary.json');
console.log('Diffs (if any): /tmp/audit-<scenario>-a.txt vs /tmp/audit-<scenario>-b.txt');
