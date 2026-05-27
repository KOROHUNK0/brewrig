// Sound effect engine — direct port of the original bundle.
//
// The bundle defines 13 step cues and 13 finish cues (`current`, A..G, D2..D6),
// selected at runtime by a variant key. The active variant is fixed at 'F' in
// state (no UI to change it) — `w` (step) and `T` (finish) — but we port every
// variant so the engine matches the original. The start cue (`ot`) plays an
// MP3 buffer with `it` (the F-variant step cue) as a synthesized fallback.
//
// Variable names follow the bundle: parameter `e` is the AudioContext,
// `t` is the gain multiplier (== volume).

let ctx: AudioContext | null = null;

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

export function getAudioContext(): AudioContext {
  if (ctx) return ctx;
  const w = window as WindowWithWebkitAudio;
  const Ctor = window.AudioContext ?? w.webkitAudioContext;
  if (!Ctor) {
    throw new Error('Web Audio API is not supported in this browser.');
  }
  ctx = new Ctor();
  return ctx;
}

export function ensureRunning(): void {
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }
}

// ------------------------------------------------------------------
// Shared helper: two-partial tone (triangle + sine octave).
// ------------------------------------------------------------------
function S(
  e: AudioContext,
  t: number,
  n: number,
  r: number,
  i: number,
): void {
  [t, t * 2].forEach((freq, a) => {
    const osc = e.createOscillator();
    const gain = e.createGain();
    osc.connect(gain);
    gain.connect(e.destination);
    osc.frequency.value = freq;
    osc.type = a === 0 ? 'triangle' : 'sine';
    const c = n * (a === 0 ? 0.28 : 0.09);
    gain.gain.setValueAtTime(0, i);
    gain.gain.linearRampToValueAtTime(c, i + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, i + r);
    osc.start(i);
    osc.stop(i + r + 0.05);
  });
}

// Helper used by several variants — chord with weighted partials.
function me(
  e: AudioContext,
  t: number[],
  n: number,
  r: number,
  i: number = 0.008,
): void {
  const a = e.currentTime;
  t.forEach((freq, o) => {
    const osc = e.createOscillator();
    const gain = e.createGain();
    osc.connect(gain);
    gain.connect(e.destination);
    osc.frequency.value = freq;
    osc.type = o === 0 ? 'triangle' : 'sine';
    const peak = n * (o === 0 ? 0.24 : o === 1 ? 0.18 : 0.12);
    gain.gain.setValueAtTime(0, a);
    gain.gain.linearRampToValueAtTime(peak, a + i);
    gain.gain.exponentialRampToValueAtTime(0.001, a + r);
    osc.start(a);
    osc.stop(a + r + 0.05);
  });
}

// ------------------------------------------------------------------
// Step cues
// ------------------------------------------------------------------
function C(e: AudioContext, t: number = 1): void {
  S(e, 740, t, 0.38, e.currentTime);
}

function ne(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  [523, 1046, 1569].forEach((r, i) => {
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = r;
    a.type = 'sine';
    const s = t * [0.3, 0.12, 0.05][i];
    o.gain.setValueAtTime(0, n);
    o.gain.linearRampToValueAtTime(s, n + 0.005);
    o.gain.exponentialRampToValueAtTime(0.001, n + 0.6);
    a.start(n);
    a.stop(n + 0.65);
  });
}

function ie(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  const r = e.createOscillator();
  const i = e.createGain();
  r.connect(i);
  i.connect(e.destination);
  r.frequency.value = 880;
  r.type = 'sine';
  i.gain.setValueAtTime(0, n);
  i.gain.linearRampToValueAtTime(0.25 * t, n + 0.003);
  i.gain.exponentialRampToValueAtTime(0.001, n + 1.2);
  r.start(n);
  r.stop(n + 1.25);
  const a = e.createOscillator();
  const o = e.createGain();
  a.connect(o);
  o.connect(e.destination);
  a.frequency.value = 1320;
  a.type = 'sine';
  o.gain.setValueAtTime(0, n);
  o.gain.linearRampToValueAtTime(0.08 * t, n + 0.003);
  o.gain.exponentialRampToValueAtTime(0.001, n + 0.6);
  a.start(n);
  a.stop(n + 0.65);
}

function oe(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  const r = e.createBuffer(1, e.sampleRate * 0.02, e.sampleRate);
  const i = r.getChannelData(0);
  for (let k = 0; k < i.length; k++) {
    i[k] = (Math.random() * 2 - 1) * (1 - k / i.length) * 0.4;
  }
  const a = e.createBufferSource();
  const o = e.createGain();
  a.buffer = r;
  o.gain.value = t;
  a.connect(o);
  o.connect(e.destination);
  a.start(n);
  const s = e.createOscillator();
  const c = e.createGain();
  s.connect(c);
  c.connect(e.destination);
  s.frequency.value = 600;
  s.type = 'sine';
  c.gain.setValueAtTime(0, n + 0.015);
  c.gain.linearRampToValueAtTime(0.18 * t, n + 0.03);
  c.gain.exponentialRampToValueAtTime(0.001, n + 0.4);
  s.start(n + 0.015);
  s.stop(n + 0.45);
}

function ce(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  [523, 659, 784].forEach((r, i) => {
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = r;
    a.type = 'sine';
    const s = t * [0.22, 0.18, 0.14][i];
    o.gain.setValueAtTime(0, n);
    o.gain.linearRampToValueAtTime(s, n + 0.01);
    o.gain.exponentialRampToValueAtTime(0.001, n + 0.45);
    a.start(n);
    a.stop(n + 0.5);
  });
}

function ue(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  const r = e.createOscillator();
  const i = e.createGain();
  r.connect(i);
  i.connect(e.destination);
  r.frequency.value = 900;
  r.type = 'sine';
  r.frequency.exponentialRampToValueAtTime(320, n + 0.12);
  i.gain.setValueAtTime(0, n);
  i.gain.linearRampToValueAtTime(0.3 * t, n + 0.005);
  i.gain.exponentialRampToValueAtTime(0.001, n + 0.25);
  r.start(n);
  r.stop(n + 0.3);
}

function w(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  const r = [740, 1480];
  const i = [0.28, 0.09];
  r.forEach((freq, a) => {
    const o = e.createOscillator();
    const s = e.createGain();
    o.connect(s);
    s.connect(e.destination);
    o.frequency.value = freq;
    o.type = a === 0 ? 'triangle' : 'sine';
    s.gain.setValueAtTime(0, n);
    s.gain.linearRampToValueAtTime(i[a] * t, n + 0.005);
    s.gain.exponentialRampToValueAtTime(0.001, n + 0.7);
    o.start(n);
    o.stop(n + 0.75);
  });
}

function fe(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  ([[660, 0], [880, 0.1]] as const).forEach(([r, i]) => {
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = r;
    a.type = 'triangle';
    o.gain.setValueAtTime(0, n + i);
    o.gain.linearRampToValueAtTime(0.25 * t, n + i + 0.008);
    o.gain.exponentialRampToValueAtTime(0.001, n + i + 0.18);
    a.start(n + i);
    a.stop(n + i + 0.2);
  });
}

function he(e: AudioContext, t: number = 1): void {
  me(e, [440, 523, 659], t, 0.5);
}

function D(e: AudioContext, t: number = 1): void {
  me(e, [523, 784, 1046], t, 0.55);
}

function _e(e: AudioContext, t: number = 1): void {
  me(e, [523, 659, 784, 988], t, 0.5);
}

function ye(e: AudioContext, t: number = 1): void {
  [523, 587, 659].forEach((r, idx) => {
    const i = e.currentTime + idx * 0.08;
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = r;
    a.type = 'triangle';
    o.gain.setValueAtTime(0, i);
    o.gain.linearRampToValueAtTime(0.26 * t, i + 0.008);
    o.gain.exponentialRampToValueAtTime(0.001, i + 0.35);
    a.start(i);
    a.stop(i + 0.4);
  });
}

function xe(e: AudioContext, t: number = 1): void {
  me(e, [330, 415, 494, 659], t, 0.55, 0.012);
}

// ------------------------------------------------------------------
// Finish cues
// ------------------------------------------------------------------
function te(e: AudioContext, t: number = 1): void {
  ([[587, 0], [740, 0.2], [880, 0.4]] as const).forEach(([n, r]) => {
    S(e, n, t * (r === 0.4 ? 1.2 : 1), r === 0.4 ? 0.55 : 0.3, e.currentTime + r);
  });
}

function re(e: AudioContext, t: number = 1): void {
  ([[392, 0], [523, 0.25], [659, 0.5]] as const).forEach(([base, offset]) => {
    const i = e.currentTime + offset;
    [base, base * 2, base * 3].forEach((freq, k) => {
      const a = e.createOscillator();
      const o = e.createGain();
      a.connect(o);
      o.connect(e.destination);
      a.frequency.value = freq;
      a.type = 'sine';
      const s = t * [0.28, 0.1, 0.04][k];
      o.gain.setValueAtTime(0, i);
      o.gain.linearRampToValueAtTime(s, i + 0.005);
      o.gain.exponentialRampToValueAtTime(0.001, i + 0.8);
      a.start(i);
      a.stop(i + 0.85);
    });
  });
}

function ae(e: AudioContext, t: number = 1): void {
  ([[659, 0], [784, 0.28], [1047, 0.56]] as const).forEach(([base, offset]) => {
    const i = e.currentTime + offset;
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = base;
    a.type = 'sine';
    o.gain.setValueAtTime(0, i);
    o.gain.linearRampToValueAtTime(0.22 * t, i + 0.003);
    o.gain.exponentialRampToValueAtTime(0.001, i + 1);
    a.start(i);
    a.stop(i + 1.05);
    const s = e.createOscillator();
    const c = e.createGain();
    s.connect(c);
    c.connect(e.destination);
    s.frequency.value = base * 1.5;
    s.type = 'sine';
    c.gain.setValueAtTime(0, i);
    c.gain.linearRampToValueAtTime(0.07 * t, i + 0.003);
    c.gain.exponentialRampToValueAtTime(0.001, i + 0.5);
    s.start(i);
    s.stop(i + 0.55);
  });
}

function se(e: AudioContext, t: number = 1): void {
  ([[500, 0], [630, 0.22], [800, 0.44]] as const).forEach(([base, offset]) => {
    const i = e.currentTime + offset;
    const a = e.createBuffer(1, e.sampleRate * 0.015, e.sampleRate);
    const o = a.getChannelData(0);
    for (let k = 0; k < o.length; k++) {
      o[k] = (Math.random() * 2 - 1) * (1 - k / o.length) * 0.35;
    }
    const s = e.createBufferSource();
    const c = e.createGain();
    s.buffer = a;
    c.gain.value = t;
    s.connect(c);
    c.connect(e.destination);
    s.start(i);
    const l = e.createOscillator();
    const u = e.createGain();
    l.connect(u);
    u.connect(e.destination);
    l.frequency.value = base;
    l.type = 'sine';
    u.gain.setValueAtTime(0, i + 0.012);
    u.gain.linearRampToValueAtTime(0.2 * t, i + 0.025);
    u.gain.exponentialRampToValueAtTime(
      0.001,
      i + (offset === 0.44 ? 0.7 : 0.35),
    );
    l.start(i + 0.012);
    l.stop(i + (offset === 0.44 ? 0.75 : 0.4));
  });
}

function le(e: AudioContext, t: number = 1): void {
  ([[392, 494, 587], [440, 554, 659], [523, 659, 784]] as const).forEach(
    (chord, r) => {
      chord.forEach((freq, i) => {
        const a = e.currentTime + r * 0.25;
        const o = e.createOscillator();
        const s = e.createGain();
        o.connect(s);
        s.connect(e.destination);
        o.frequency.value = freq;
        o.type = 'sine';
        const c = t * [0.2, 0.16, 0.12][i] * (r === 2 ? 1.2 : 1);
        s.gain.setValueAtTime(0, a);
        s.gain.linearRampToValueAtTime(c, a + 0.008);
        s.gain.exponentialRampToValueAtTime(0.001, a + (r === 2 ? 0.9 : 0.4));
        o.start(a);
        o.stop(a + (r === 2 ? 0.95 : 0.45));
      });
    },
  );
}

function de(e: AudioContext, t: number = 1): void {
  [0, 0.22, 0.44].forEach((offset, r) => {
    const i = e.currentTime + offset;
    const a = [900, 1100, 1300][r];
    const o = [320, 380, 440][r];
    const s = r === 2 ? 0.5 : 0.28;
    const c = e.createOscillator();
    const l = e.createGain();
    c.connect(l);
    l.connect(e.destination);
    c.frequency.value = a;
    c.type = 'sine';
    c.frequency.exponentialRampToValueAtTime(o, i + s * 0.5);
    const u = t * (r === 2 ? 0.32 : 0.26);
    l.gain.setValueAtTime(0, i);
    l.gain.linearRampToValueAtTime(u, i + 0.005);
    l.gain.exponentialRampToValueAtTime(0.001, i + s);
    c.start(i);
    c.stop(i + s + 0.05);
  });
}

function T(e: AudioContext, t: number = 1): void {
  ([[587, 0], [740, 0.28], [880, 0.56]] as const).forEach(([base, offset]) => {
    const i = e.currentTime + offset;
    [base, base * 2].forEach((freq, a) => {
      const o = e.createOscillator();
      const s = e.createGain();
      o.connect(s);
      s.connect(e.destination);
      o.frequency.value = freq;
      o.type = a === 0 ? 'triangle' : 'sine';
      const c = t * (a === 0 ? 0.26 : 0.08) * (offset === 0.56 ? 1.2 : 1);
      s.gain.setValueAtTime(0, i);
      s.gain.linearRampToValueAtTime(c, i + 0.005);
      s.gain.exponentialRampToValueAtTime(
        0.001,
        i + (offset === 0.56 ? 0.55 : 0.3),
      );
      o.start(i);
      o.stop(i + (offset === 0.56 ? 1.05 : 0.6));
    });
  });
}

function pe(e: AudioContext, t: number = 1): void {
  const n = e.currentTime;
  ([[523, 0], [659, 0.15], [784, 0.3], [1047, 0.5]] as const).forEach(
    ([freq, offset]) => {
      const a = e.createOscillator();
      const o = e.createGain();
      a.connect(o);
      o.connect(e.destination);
      a.frequency.value = freq;
      a.type = 'triangle';
      const s = offset === 0.5 ? 0.45 : 0.18;
      o.gain.setValueAtTime(0, n + offset);
      o.gain.linearRampToValueAtTime(0.22 * t, n + offset + 0.008);
      o.gain.exponentialRampToValueAtTime(0.001, n + offset + s);
      a.start(n + offset);
      a.stop(n + offset + s + 0.05);
    },
  );
}

function E(e: AudioContext, t: number = 1): void {
  ([[349, 440, 523], [392, 494, 587], [440, 523, 659]] as const).forEach(
    (chord, r) => {
      const i = e.currentTime + r * 0.26;
      chord.forEach((freq, a) => {
        const o = e.createOscillator();
        const s = e.createGain();
        o.connect(s);
        s.connect(e.destination);
        o.frequency.value = freq;
        o.type = a === 0 ? 'triangle' : 'sine';
        const c = t * [0.22, 0.17, 0.11][a] * (r === 2 ? 1.25 : 1);
        s.gain.setValueAtTime(0, i + 0.006);
        s.gain.linearRampToValueAtTime(c, i + 0.014);
        s.gain.exponentialRampToValueAtTime(0.001, i + (r === 2 ? 0.85 : 0.42));
        o.start(i + 0.006);
        o.stop(i + (r === 2 ? 0.9 : 0.47));
      });
    },
  );
}

function ge(e: AudioContext, t: number = 1): void {
  (
    [
      [392, 587, 784, 0],
      [440, 659, 880, 0.25],
      [523, 784, 1046, 0.5],
    ] as const
  ).forEach(([n, r, i, a]) => {
    const o = e.currentTime + a;
    [n, r, i].forEach((freq, idx) => {
      const osc = e.createOscillator();
      const gain = e.createGain();
      osc.connect(gain);
      gain.connect(e.destination);
      osc.frequency.value = freq;
      osc.type = idx === 0 ? 'triangle' : 'sine';
      const c = t * [0.22, 0.16, 0.1][idx] * (a === 0.5 ? 1.2 : 1);
      gain.gain.setValueAtTime(0, o);
      gain.gain.linearRampToValueAtTime(c, o + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, o + (a === 0.5 ? 0.9 : 0.45));
      osc.start(o);
      osc.stop(o + (a === 0.5 ? 0.95 : 0.5));
    });
  });
}

function ve(e: AudioContext, t: number = 1): void {
  (
    [
      [392, 494, 587, 740],
      [440, 554, 659, 830],
      [523, 659, 784, 988],
    ] as const
  ).forEach((chord, r) => {
    const i = e.currentTime + r * 0.27;
    chord.forEach((freq, a) => {
      const o = e.createOscillator();
      const s = e.createGain();
      o.connect(s);
      s.connect(e.destination);
      o.frequency.value = freq;
      o.type = a <= 1 ? 'triangle' : 'sine';
      const c = t * [0.2, 0.16, 0.12, 0.08][a] * (r === 2 ? 1.2 : 1);
      s.gain.setValueAtTime(0, i);
      s.gain.linearRampToValueAtTime(c, i + 0.008);
      s.gain.exponentialRampToValueAtTime(0.001, i + (r === 2 ? 0.9 : 0.45));
      o.start(i);
      o.stop(i + (r === 2 ? 0.95 : 0.5));
    });
  });
}

function be(e: AudioContext, t: number = 1): void {
  [523, 587, 659, 784, 880, 1047].forEach((freq, r) => {
    const i = e.currentTime + r * 0.1;
    const a = e.createOscillator();
    const o = e.createGain();
    a.connect(o);
    o.connect(e.destination);
    a.frequency.value = freq;
    a.type = 'triangle';
    const s = r >= 4 ? 0.55 : 0.22;
    o.gain.setValueAtTime(0, i);
    o.gain.linearRampToValueAtTime(0.24 * t * (r >= 4 ? 1.15 : 1), i + 0.008);
    o.gain.exponentialRampToValueAtTime(0.001, i + s);
    a.start(i);
    a.stop(i + s + 0.05);
  });
}

function Se(e: AudioContext, t: number = 1): void {
  (
    [
      [262, 330, 392, 523],
      [294, 370, 440, 587],
      [330, 415, 494, 659],
    ] as const
  ).forEach((chord, r) => {
    const i = e.currentTime + r * 0.28;
    chord.forEach((freq, a) => {
      const o = e.createOscillator();
      const s = e.createGain();
      o.connect(s);
      s.connect(e.destination);
      o.frequency.value = freq;
      o.type = a <= 1 ? 'triangle' : 'sine';
      const c = t * [0.24, 0.2, 0.15, 0.1][a] * (r === 2 ? 1.2 : 1);
      s.gain.setValueAtTime(0, i);
      s.gain.linearRampToValueAtTime(c, i + 0.012);
      s.gain.exponentialRampToValueAtTime(0.001, i + (r === 2 ? 1 : 0.5));
      o.start(i);
      o.stop(i + (r === 2 ? 1.05 : 0.55));
    });
  });
}

// ------------------------------------------------------------------
// Dispatchers
// ------------------------------------------------------------------
export type SeVariant =
  | 'current'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'E'
  | 'F'
  | 'G'
  | 'D2'
  | 'D3'
  | 'D4'
  | 'D5'
  | 'D6';

/** Step cue (`it` in bundle). Active variant is fixed at 'F'. */
export function playStep(
  e: AudioContext,
  t: number,
  variant: SeVariant = 'F',
): void {
  const map: Record<SeVariant, () => void> = {
    current: () => C(e, t),
    A: () => ne(e, t),
    B: () => ie(e, t),
    C: () => oe(e, t),
    D: () => ce(e, t),
    E: () => ue(e, t),
    F: () => w(e, t),
    G: () => fe(e, t),
    D2: () => he(e, t),
    D3: () => D(e, t),
    D4: () => _e(e, t),
    D5: () => ye(e, t),
    D6: () => xe(e, t),
  };
  (map[variant] ?? map.current)();
}

/** Finish cue (`at` in bundle). Active variant is fixed at 'F'. */
export function playFinish(
  e: AudioContext,
  t: number,
  variant: SeVariant = 'F',
): void {
  const map: Record<SeVariant, () => void> = {
    current: () => te(e, t),
    A: () => re(e, t),
    B: () => ae(e, t),
    C: () => se(e, t),
    D: () => le(e, t),
    E: () => de(e, t),
    F: () => T(e, t),
    G: () => pe(e, t),
    D2: () => E(e, t),
    D3: () => ge(e, t),
    D4: () => ve(e, t),
    D5: () => be(e, t),
    D6: () => Se(e, t),
  };
  (map[variant] ?? map.current)();
}

/**
 * Start cue (`ot` in bundle): play the bundled MP3 click; on any failure,
 * fall back to the synthesized step cue.
 */
export async function playStart(
  e: AudioContext,
  t: number,
  variant: SeVariant = 'F',
): Promise<void> {
  try {
    const buf = await (await fetch('./assets/submit-button-click2.mp3')).arrayBuffer();
    const decoded = await e.decodeAudioData(buf);
    const src = e.createBufferSource();
    const gain = e.createGain();
    gain.gain.value = t;
    src.buffer = decoded;
    src.connect(gain);
    gain.connect(e.destination);
    src.start();
  } catch {
    playStep(e, t, variant);
  }
}
