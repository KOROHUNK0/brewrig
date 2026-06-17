import type { Lang, PourStep } from '../types';
import type { Strings } from '../i18n/strings';

// 表示用 instruction 文字列 → 短縮 TTS 文字列の引き当て。
// `recipes.ts` を触らないため、現在言語の Strings を介した値マッチで解決する。
function ttsForInstruction(instr: string, s: Strings): string | null {
  const map: Array<[string, string]> = [
    [s.instrSwitchClose, s.ttsSwitchClose],
    [s.instrSwitchOpen, s.ttsSwitchOpen],
    [s.instrSwitchOpenContinue, s.ttsSwitchOpenContinue],
    [s.instrSwitchClosePour, s.ttsSwitchClosePour],
    [s.instrSwitchRelease, s.ttsSwitchRelease],
    [s.instrPour1Hybrid, s.ttsPour1Hybrid],
    [s.instrSwitchOpenContinueHot, s.ttsSwitchOpenContinueHot],
    [s.instrSwitchOpenStir, s.ttsSwitchOpenStir],
    [s.instrSwitchOpenStir2, s.ttsSwitchOpenStir2],
    [s.instrSwitchCloseIced, s.ttsSwitchCloseIced],
    [s.instrSwitchReleaseIced, s.ttsSwitchReleaseIced],
  ];
  const m = map.find(([key]) => key === instr);
  return m ? m[1] : null;
}

// 表示と同じく、最初のステップで amountMin/amountMax を持つ場合のみ範囲読み。
// それ以外は累積投入量を読む。noWater のステップは湯量を読まない。
export function buildStepTts(
  step: PourStep,
  stepIndex: number,
  cumulative: number,
  s: Strings,
  lang: Lang,
): string {
  const parts: string[] = [];
  if (!step.noWater) {
    if (step.amountMin && step.amountMax && stepIndex === 0) {
      parts.push(s.ttsPourRange(step.amountMin, step.amountMax));
    } else {
      parts.push(s.ttsPourTo(cumulative));
    }
  }
  if (step.instruction) {
    const tts = ttsForInstruction(step.instruction, s);
    if (tts) parts.push(tts);
  } else if (step.stir) {
    parts.push(s.ttsStir);
  }
  const sep = lang === 'ja' ? '。' : ' ';
  return parts.join(sep);
}

export function buildFinishTts(s: Strings): string {
  return s.ttsFinish;
}
