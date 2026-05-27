// Trace audio operations during full timer lifecycle:
// 1. start (MP3 + activate step 0)
// 2. step SE (advance 1 minute -> hit step 2 boundary)
// 3. finish SE (jump to finish)
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function trace(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const log = [];
    /** @type {any} */ const w = window;
    w.__audioLog = log;
    function wrap(obj, name, label) {
      const orig = obj[name];
      if (typeof orig !== 'function') return;
      obj[name] = function (...args) {
        const r = orig.apply(this, args);
        try {
          const argsStr = args
            .map((x) => {
              if (typeof x === 'object' && x !== null) {
                if (ArrayBuffer.isView(x) || x instanceof ArrayBuffer)
                  return '<buf>';
                return JSON.stringify(x).slice(0, 80);
              }
              return String(x).slice(0, 80);
            })
            .join(',');
          log.push(`${label}.${name}(${argsStr})`);
        } catch {}
        if (r && typeof r === 'object' && r.constructor && r.constructor.name) {
          wrapNode(r, r.constructor.name);
        }
        return r;
      };
    }
    function wrapNode(node, kind) {
      if (node.__wrapped) return;
      node.__wrapped = true;
      ['connect', 'start', 'stop'].forEach((m) => wrap(node, m, kind));
      ['frequency', 'gain'].forEach((p) => {
        if (node[p] && !node[p].__wrapped) {
          node[p].__wrapped = true;
          [
            'setValueAtTime',
            'linearRampToValueAtTime',
            'exponentialRampToValueAtTime',
            'cancelScheduledValues',
          ].forEach((m) => wrap(node[p], m, `${kind}.${p}`));
          const origSet = Object.getOwnPropertyDescriptor(
            Object.getPrototypeOf(node[p]),
            'value',
          )?.set;
          if (origSet) {
            Object.defineProperty(node[p], 'value', {
              set(v) {
                log.push(`${kind}.${p}.value=${v}`);
                origSet.call(this, v);
              },
              get() {
                return Object.getOwnPropertyDescriptor(
                  Object.getPrototypeOf(this),
                  'value',
                ).get.call(this);
              },
            });
          }
        }
      });
      const origTypeSet = Object.getOwnPropertyDescriptor(
        Object.getPrototypeOf(node),
        'type',
      )?.set;
      if (origTypeSet) {
        Object.defineProperty(node, 'type', {
          set(v) {
            log.push(`${kind}.type=${v}`);
            origTypeSet.call(this, v);
          },
          get() {
            return Object.getOwnPropertyDescriptor(
              Object.getPrototypeOf(this),
              'type',
            ).get.call(this);
          },
        });
      }
    }
    const origCreate = w.AudioContext;
    w.AudioContext = function () {
      const inst = new origCreate();
      [
        'createOscillator',
        'createGain',
        'createBuffer',
        'createBufferSource',
        'decodeAudioData',
      ].forEach((m) => wrap(inst, m, 'ctx'));
      Object.defineProperty(inst, 'currentTime', { get: () => 0 });
      return inst;
    };
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Start (triggers MP3 click)
  await page.click('.btn-play');
  await page.waitForTimeout(400);
  const afterStart = (await page.evaluate(() => window.__audioLog.length));

  // 2. Reset state so we can isolate later cues; instead use jump-to-finish
  //    to trigger the finish SE.
  await page.click('.tl-row.tl-row-finish'); // jump to finish
  await page.waitForTimeout(300);
  // Confirm dialog
  const ok = await page.$('.dialog-ok');
  if (ok) await ok.click();
  await page.waitForTimeout(600);
  const afterFinish = (await page.evaluate(() => window.__audioLog.length));

  const log = await page.evaluate(() => window.__audioLog);
  await ctx.close();
  return { log, afterStart, afterFinish };
}

const a = await trace('http://localhost:8765/index.html');
const b = await trace('http://localhost:8766/index.html');

console.log(`Total ops:  A=${a.log.length}, B=${b.log.length}`);
console.log(`After start:  A=${a.afterStart}, B=${b.afterStart}`);
console.log(`After finish: A=${a.afterFinish}, B=${b.afterFinish}`);

const max = Math.max(a.log.length, b.log.length);
let mismatches = 0;
for (let i = 0; i < max; i++) {
  if (a.log[i] !== b.log[i]) {
    if (mismatches < 30) {
      console.log(`#${i}`);
      console.log(`  A: ${a.log[i] ?? '(missing)'}`);
      console.log(`  B: ${b.log[i] ?? '(missing)'}`);
    }
    mismatches++;
  }
}
console.log(`Total mismatches: ${mismatches}`);

await browser.close();
