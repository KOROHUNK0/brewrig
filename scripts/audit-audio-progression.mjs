// Verify that the natural step-progression SE matches.
// Approach: replace setInterval with a fast tick (10ms per second), record
// AudioContext operations across a full 210-second brew + ~70s of overtime.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});

async function trace(url) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  // Patch setInterval to fire ~50x faster (20ms per tick).
  await page.addInitScript(() => {
    const log = [];
    /** @type {any} */ const w = window;
    w.__audioLog = log;
    const origSetInterval = w.setInterval;
    w.setInterval = function (fn, delay) {
      const fast = delay >= 900 ? 20 : delay;
      return origSetInterval(fn, fast);
    };
    function wrap(obj, name, label) {
      const orig = obj[name];
      if (typeof orig !== 'function') return;
      obj[name] = function (...args) {
        const r = orig.apply(this, args);
        try {
          const argsStr = args.map((x) => {
            if (typeof x === 'object' && x !== null) {
              if (ArrayBuffer.isView(x) || x instanceof ArrayBuffer) return '<buf>';
              return JSON.stringify(x).slice(0, 80);
            }
            return String(x).slice(0, 80);
          }).join(',');
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
            'setValueAtTime', 'linearRampToValueAtTime',
            'exponentialRampToValueAtTime', 'cancelScheduledValues',
          ].forEach((m) => wrap(node[p], m, `${kind}.${p}`));
          const origSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node[p]), 'value')?.set;
          if (origSet) {
            Object.defineProperty(node[p], 'value', {
              set(v) { log.push(`${kind}.${p}.value=${v}`); origSet.call(this, v); },
              get() {
                return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'value').get.call(this);
              },
            });
          }
        }
      });
      const origTypeSet = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'type')?.set;
      if (origTypeSet) {
        Object.defineProperty(node, 'type', {
          set(v) { log.push(`${kind}.type=${v}`); origTypeSet.call(this, v); },
          get() {
            return Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'type').get.call(this);
          },
        });
      }
    }
    const origAC = w.AudioContext;
    w.AudioContext = function () {
      const inst = new origAC();
      ['createOscillator', 'createGain', 'createBuffer', 'createBufferSource', 'decodeAudioData']
        .forEach((m) => wrap(inst, m, 'ctx'));
      Object.defineProperty(inst, 'currentTime', { get: () => 0 });
      return inst;
    };
  });

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  // Start. Fast tick (20ms/s); 210s brew + 60s = 270s × 20ms = 5400ms wait.
  await page.click('.btn-play');
  await page.waitForTimeout(7000);
  const log = await page.evaluate(() => window.__audioLog);
  await ctx.close();
  return log;
}

const a = await trace('http://localhost:8765/index.html');
const b = await trace('http://localhost:8766/index.html');

console.log(`A (backup): ${a.length} ops`);
console.log(`B (dist):   ${b.length} ops`);

// Count by type for high-level signature comparison.
function profile(log) {
  const types = new Map();
  const freqs = new Map();
  let oscCount = 0, gainCount = 0, bufferSrc = 0, decode = 0;
  for (const line of log) {
    if (line === 'ctx.createOscillator()') oscCount++;
    else if (line === 'ctx.createGain()') gainCount++;
    else if (line === 'ctx.createBufferSource()') bufferSrc++;
    else if (line.startsWith('ctx.decodeAudioData')) decode++;
    if (line.includes('frequency.value=')) {
      const f = parseInt(line.split('=')[1], 10);
      freqs.set(f, (freqs.get(f) ?? 0) + 1);
    }
    if (line.includes('.type=')) {
      const t = line.split('=')[1];
      types.set(t, (types.get(t) ?? 0) + 1);
    }
  }
  return { oscCount, gainCount, bufferSrc, decode, types, freqs };
}

const pa = profile(a);
const pb = profile(b);
console.log('\n=== Profile ===');
console.log(`  Oscillators: A=${pa.oscCount}, B=${pb.oscCount}`);
console.log(`  Gains:       A=${pa.gainCount}, B=${pb.gainCount}`);
console.log(`  BufferSrc:   A=${pa.bufferSrc}, B=${pb.bufferSrc}`);
console.log(`  Decode:      A=${pa.decode}, B=${pb.decode}`);
console.log(`  Types: A=${[...pa.types.entries()].map(([k,v])=>`${k}:${v}`).join(',')}`);
console.log(`         B=${[...pb.types.entries()].map(([k,v])=>`${k}:${v}`).join(',')}`);

console.log('\n=== Frequency histogram ===');
const allFreqs = new Set([...pa.freqs.keys(), ...pb.freqs.keys()]);
const sorted = [...allFreqs].sort((x, y) => x - y);
for (const f of sorted) {
  const aC = pa.freqs.get(f) ?? 0;
  const bC = pb.freqs.get(f) ?? 0;
  if (aC !== bC) console.log(`  ${f}Hz: A=${aC} B=${bC} ${aC === bC ? '=' : '≠'}`);
}
const allMatch = sorted.every((f) => (pa.freqs.get(f) ?? 0) === (pb.freqs.get(f) ?? 0));
console.log(`Frequency histogram match: ${allMatch ? 'YES' : 'NO'}`);

// Full line-by-line diff count.
let mismatches = 0;
const max = Math.max(a.length, b.length);
for (let i = 0; i < max; i++) {
  if (a[i] !== b[i]) mismatches++;
}
console.log(`Total line mismatches: ${mismatches}`);
if (mismatches > 0 && mismatches < 30) {
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) {
      console.log(`#${i}: A=${a[i] ?? '(none)'} | B=${b[i] ?? '(none)'}`);
    }
  }
}

await browser.close();
