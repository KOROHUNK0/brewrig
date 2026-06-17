import type { Lang } from '../types';

// Web Speech API ベースの音声ガイダンスエンジン。SE (`se.ts`) とは独立に動作する。
// 音量は呼び出し側で 0〜1 に正規化済みの値を受け取る前提。

interface SpeakOptions {
  lang: Lang;
  volume: number;
}

let voicesCache: SpeechSynthesisVoice[] = [];
let voicesLoaded = false;

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function loadVoices(): void {
  if (!isTtsSupported()) return;
  voicesCache = window.speechSynthesis.getVoices();
  voicesLoaded = voicesCache.length > 0;
}

function ensureVoicesInitialized(): void {
  if (!isTtsSupported() || voicesLoaded) return;
  loadVoices();
  if (!voicesLoaded) {
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices, {
      once: true,
    });
  }
}

function pickVoice(lang: Lang): SpeechSynthesisVoice | undefined {
  ensureVoicesInitialized();
  if (voicesCache.length === 0) return undefined;
  const target = lang === 'ja' ? 'ja' : 'en';
  return (
    voicesCache.find((v) => v.lang.toLowerCase().startsWith(`${target}-`)) ??
    voicesCache.find((v) => v.lang.toLowerCase().startsWith(target))
  );
}

export function cancelSpeech(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
}

export function speak(text: string, opts: SpeakOptions): void {
  if (!isTtsSupported()) return;
  if (!text) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang === 'ja' ? 'ja-JP' : 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  utterance.volume = Math.max(0, Math.min(1, opts.volume));
  const voice = pickVoice(opts.lang);
  if (voice) utterance.voice = voice;
  synth.speak(utterance);
}
