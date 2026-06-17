import type { Lang } from '../types';

export interface Strings {
  appSubtitle: string;
  lightMode: string;
  darkMode: string;
  recipeLabel: string;
  recommend: string;
  powderLabel: string;
  flavorLabel: string;
  strengthLabel: string;
  grindLabel: string;
  totalWaterLabel: string;
  tempLabel: string;
  prepLabel: string;
  flavorSweet: string;
  flavorNormal: string;
  flavorBright: string;
  strengthLight: string;
  strengthNormal: string;
  strengthStrong: string;
  strengthStrongRec: string;
  roastLight: string;
  roastMedium: string;
  roastDark: string;
  grindMedCoarse: string;
  grindMedium: string;
  grindMedFine: string;
  start: string;
  resume: string;
  pause: string;
  reset: string;
  seOn: string;
  seOff: string;
  timelineTitle: string;
  timelineHint: string;
  pour(n: number): string;
  pourAmount(n: number): string;
  pourTotal(n: number): string;
  finish: string;
  removeFilter: string;
  stir: string;
  stirInstruction: string;
  instrSwitchClose: string;
  instrSwitchOpen: string;
  instrSwitchOpenContinue: string;
  instrSwitchClosePour: string;
  instrSwitchRelease: string;
  hybridTempNote: string;
  instrPour1Hybrid: string;
  tagTemp70: string;
  instrSwitchOpenContinueHot: string;
  instrSwitchOpenStir2: string;
  switchOpenLabel: string;
  instrSwitchOpenStir: string;
  instrSwitchCloseIced: string;
  instrSwitchReleaseIced: string;
  hybridTempNoteIced: string;
  equipLabel: string;
  equipHarioSwitch: string;
  jumpLink: string;
  pourTo(n: number): string;
  finishMsg: string;
  confirmReset: string;
  confirmChange: string;
  confirmSkip(label: string, time: string, verb: string): string;
  confirmFinish(time: string): string;
  rewind: string;
  skip: string;
  ok: string;
  cancel: string;
  flavorHelpTitle: string;
  flavorHelpBright: string;
  flavorHelpBrightDesc: string;
  flavorHelpSweet: string;
  flavorHelpSweetDesc: string;
  flavorHelpClose: string;
  hotDesc: string;
  hybridDesc: string;
  hybridIcedDesc: string;
  icedDesc: string;
  hotLabel: string;
  icedLabel: string;
  hybridLabel: string;
  hybridIcedLabel: string;
  sourcePrefix: string;
  icedPrep: string;
  soundLabel: string;
  soundSe: string;
  soundTts: string;
  ttsPourTo(n: number): string;
  ttsPourRange(a: number, b: number): string;
  ttsStir: string;
  ttsSwitchClose: string;
  ttsSwitchOpen: string;
  ttsSwitchOpenContinue: string;
  ttsSwitchClosePour: string;
  ttsSwitchRelease: string;
  ttsPour1Hybrid: string;
  ttsSwitchOpenContinueHot: string;
  ttsSwitchOpenStir: string;
  ttsSwitchOpenStir2: string;
  ttsSwitchCloseIced: string;
  ttsSwitchReleaseIced: string;
  ttsFinish: string;
}

const ja: Strings = {
  appSubtitle: 'コーヒードリップ・湯量管理タイマー',
  lightMode: 'ライトモードに切り替え',
  darkMode: 'ダークモードに切り替え',
  recipeLabel: 'ドリップレシピ',
  recommend: '定番',
  powderLabel: 'コーヒー粉量',
  flavorLabel: '味わい',
  strengthLabel: '濃度',
  grindLabel: '挽き目',
  totalWaterLabel: '総投入湯量',
  tempLabel: '湯温',
  prepLabel: '備考',
  flavorSweet: '甘い',
  flavorNormal: '普通',
  flavorBright: '明るい',
  strengthLight: '薄い',
  strengthNormal: '普通',
  strengthStrong: '濃い',
  strengthStrongRec: '濃い（推奨）',
  roastLight: '浅煎り',
  roastMedium: '中煎り',
  roastDark: '深煎り',
  grindMedCoarse: '中粗挽き',
  grindMedium: '中挽き',
  grindMedFine: '中細挽き',
  start: 'スタート',
  resume: '再開',
  pause: '一時停止',
  reset: 'リセット',
  seOn: '🔔 SE: ON',
  seOff: '🔇 SE: OFF',
  timelineTitle: '投入タイムライン',
  timelineHint: '各ステップをタップしてスキップ / 巻き戻し',
  pour: (n) => `${n}投目`,
  pourAmount: (n) => `${n}g 投入`,
  pourTotal: (n) => `計 ${n}g`,
  finish: '完了',
  removeFilter: 'ドリッパーを外す',
  stir: '撹拌',
  stirInstruction: '投入後、ドリッパーを円を描くように軽く揺すり撹拌する',
  instrSwitchClose: 'スイッチを閉鎖した状態でお湯を注ぐ(浸漬)',
  instrSwitchOpen: 'スイッチを開放し、お湯を注ぐ(透過)',
  instrSwitchOpenContinue: 'スイッチを開放した状態でお湯を注ぐ(透過)',
  instrSwitchClosePour: 'スイッチを閉鎖し、75℃前後のお湯を注ぐ(浸漬)',
  instrSwitchRelease: 'スイッチを解放する(透過)',
  hybridTempNote: '※4投目から 75℃前後に下げる',
  instrPour1Hybrid: 'スイッチを閉鎖した状態でお湯を注ぐ(浸漬) / 粉全体が浸る程度まで注ぐ',
  tagTemp70: '湯温75℃',
  instrSwitchOpenContinueHot:
    'スイッチを開放した状態でお湯を注ぐ(透過) / 投入後、ケトルに水や氷を加え、湯温を75℃前後まで下げておく',
  instrSwitchOpenStir2:
    'スイッチを開放した状態でお湯を注ぐ(透過) / 投入後、ドリッパーを円を描くように揺すって撹拌する / 投入後、ケトルに水や氷を加え、湯温を75℃前後まで下げておく',
  switchOpenLabel: 'スイッチ開放',
  instrSwitchOpenStir:
    'スイッチを開放した状態でお湯を注ぐ(透過) / 投入後、ドリッパーを円を描くように揺すって撹拌する',
  instrSwitchCloseIced: 'スイッチを閉鎖し、75℃前後のお湯を注ぐ(浸漬)',
  instrSwitchReleaseIced: 'スイッチを解放する(透過)',
  hybridTempNoteIced: '※3投目から 75℃前後に下げる',
  equipLabel: '使用器具',
  equipHarioSwitch: 'ハリオ スイッチ ドリッパー',
  jumpLink: '↗ 移動',
  pourTo: (n) => `${n}g まで注いでください`,
  finishMsg: '抽出完了！',
  confirmReset: 'タイマーをリセットしますか？',
  confirmChange:
    'タイマーをリセットしてから変更してください。\n今すぐリセットしますか？',
  confirmSkip: (label, time, verb) => `${label}（${time}）へ${verb}しますか？`,
  confirmFinish: (time) => `完了（${time}）へスキップしますか？`,
  rewind: '巻き戻し',
  skip: 'スキップ',
  ok: 'OK',
  cancel: 'キャンセル',
  flavorHelpTitle: '味わいについて',
  flavorHelpBright: '明るい',
  flavorHelpBrightDesc: '爽やかな（スッキリとした）酸味を感じられること。',
  flavorHelpSweet: '甘い',
  flavorHelpSweetDesc:
    '舌で感じる直接的な甘味ではなく、香りから感じられるもののこと。',
  flavorHelpClose: '閉じる',
  hotDesc:
    'バリスタ世界チャンピオン粕谷哲氏が考案した、ハンドドリップコーヒーの抽出方法(ホット用)。',
  hybridDesc:
    'バリスタ世界チャンピオン粕谷哲氏が考案した、ハリオ スイッチ ドリッパーを使用して浸漬式と透過式を組み合わせた抽出方法(ホット用)。ハイブリッドメソッドの淹れ方には旧版と改良版の2パターンがあり、ニューハイブリッドメソッドは改良版を指す。',
  hybridIcedDesc:
    'バリスタ世界チャンピオン粕谷哲氏が考案した、ハリオ スイッチ ドリッパーを使用して浸漬式と透過式を組み合わせた抽出方法(アイス用)。ハイブリッドメソッドの淹れ方には旧版と改良版の2パターンがあり、こちらは旧版をベースにしたもの。',
  icedDesc:
    'バリスタ世界チャンピオン粕谷哲氏が考案した、ハンドドリップコーヒーの抽出方法(アイス用)。',
  hotLabel: '4:6メソッド #HOT',
  icedLabel: '4:6メソッド #ICED',
  hybridLabel: 'ニューハイブリッドメソッド #HOT',
  hybridIcedLabel: 'ハイブリッドメソッド #ICED',
  sourcePrefix: '出典: ',
  icedPrep: 'コーヒーサーバーに十分な氷を入れておく',
  soundLabel: 'サウンド',
  soundSe: '🔔 SE',
  soundTts: '🗣 ガイダンス',
  ttsPourTo: (n) => `${n}グラムまで注いでください`,
  ttsPourRange: (a, b) => `${a}グラムから${b}グラムまで注いでください`,
  ttsStir: '投入後、ドリッパーを軽く揺すって撹拌してください',
  ttsSwitchClose: 'スイッチを閉鎖した状態で、お湯を注いでください',
  ttsSwitchOpen: 'スイッチを開放して、お湯を注いでください',
  ttsSwitchOpenContinue: 'スイッチを開放した状態で、お湯を注いでください',
  ttsSwitchClosePour: 'スイッチを閉鎖し、75度前後のお湯を注いでください',
  ttsSwitchRelease: 'スイッチを解放してください',
  ttsPour1Hybrid: 'スイッチを閉鎖した状態で、粉全体が浸る程度までお湯を注いでください',
  ttsSwitchOpenContinueHot:
    'スイッチを開放した状態で、お湯を注いでください。投入後、ゆおんを75度まで下げてください',
  ttsSwitchOpenStir:
    'スイッチを開放した状態でお湯を注ぎ、投入後にドリッパーを揺すって撹拌してください',
  ttsSwitchOpenStir2:
    'スイッチを開放した状態でお湯を注ぎ、撹拌してください。投入後、ゆおんを75度まで下げてください',
  ttsSwitchCloseIced: 'スイッチを閉鎖し、75度前後のお湯を注いでください',
  ttsSwitchReleaseIced: 'スイッチを解放してください',
  ttsFinish: '抽出が完了しました',
};

const en: Strings = {
  appSubtitle: 'Coffee Drip & Pour Management Timer',
  lightMode: 'Switch to Light Mode',
  darkMode: 'Switch to Dark Mode',
  recipeLabel: 'Drip Recipe',
  recommend: '定番',
  powderLabel: 'Coffee Grounds',
  flavorLabel: 'Flavor',
  strengthLabel: 'Strength',
  grindLabel: 'Grind Size',
  totalWaterLabel: 'Total Water',
  tempLabel: 'Water Temp',
  prepLabel: 'Notes',
  flavorSweet: 'Sweet',
  flavorNormal: 'Normal',
  flavorBright: 'Bright',
  strengthLight: 'Light',
  strengthNormal: 'Normal',
  strengthStrong: 'Strong',
  strengthStrongRec: 'Strong (Rec.)',
  roastLight: 'Light',
  roastMedium: 'Medium',
  roastDark: 'Dark',
  grindMedCoarse: 'Med-Coarse',
  grindMedium: 'Medium',
  grindMedFine: 'Med-Fine',
  start: 'Start',
  resume: 'Resume',
  pause: 'Pause',
  reset: 'Reset',
  seOn: '🔔 SE: ON',
  seOff: '🔇 SE: OFF',
  timelineTitle: 'Pour Timeline',
  timelineHint: 'Tap a step to skip / rewind',
  pour: (n) => `Pour ${n}`,
  pourAmount: (n) => `${n}g`,
  pourTotal: (n) => `Total ${n}g`,
  finish: 'Done',
  removeFilter: 'Remove dripper',
  stir: 'Stir',
  stirInstruction: 'Gently swirl the dripper in circles to mix.',
  instrSwitchClose: 'Pour with switch closed (immersion)',
  instrSwitchOpen: 'Open switch and pour (percolation)',
  instrSwitchOpenContinue: 'Pour with switch open (percolation)',
  instrSwitchClosePour: 'Close switch and pour ~75°C water (immersion)',
  instrSwitchRelease: 'Release switch (percolation)',
  hybridTempNote: '※From 4th pour, lower to ~75°C',
  instrPour1Hybrid:
    'Pour with switch closed (immersion) / just enough to saturate grounds',
  tagTemp70: '75°C',
  instrSwitchOpenContinueHot:
    'Pour with switch open (percolation) / After pouring, add water/ice to kettle to cool to ~75°C',
  instrSwitchOpenStir2:
    'Pour with switch open (percolation) / Swirl dripper in circles after pouring / Also add water/ice to kettle to cool to ~75°C',
  switchOpenLabel: 'Open Switch',
  instrSwitchOpenStir:
    'Pour with switch open (percolation) / Swirl dripper in circles after pouring',
  instrSwitchCloseIced: 'Close switch and pour ~75 deg C water (immersion)',
  instrSwitchReleaseIced: 'Release switch (percolation)',
  hybridTempNoteIced: 'From 3rd pour, lower to ~75 deg C',
  equipLabel: 'Equipment',
  equipHarioSwitch: 'HARIO Switch Dripper',
  jumpLink: '↗ Jump',
  pourTo: (n) => `Pour up to ${n}g`,
  finishMsg: 'Brew Complete!',
  confirmReset: 'Reset the timer?',
  confirmChange: 'Please reset the timer before making changes.\nReset now?',
  confirmSkip: (label, time, verb) => `${verb} to ${label} (${time})?`,
  confirmFinish: (time) => `Skip to finish (${time})?`,
  rewind: 'Rewind',
  skip: 'Skip',
  ok: 'OK',
  cancel: 'Cancel',
  flavorHelpTitle: 'About Flavor',
  flavorHelpBright: 'Bright',
  flavorHelpBrightDesc: 'A clean, crisp acidity — refreshing and vibrant.',
  flavorHelpSweet: 'Sweet',
  flavorHelpSweetDesc:
    'Not direct tongue sweetness, but an aromatic sweetness perceived through fragrance.',
  flavorHelpClose: 'Close',
  hotDesc:
    'A hand-drip method devised by World Barista Champion Tetsu Kasuya (hot version).',
  hybridDesc:
    'A hybrid immersion+percolation drip method using the Hario Switch dripper (hot). Two versions exist; New = improved version.',
  hybridIcedDesc:
    'A hybrid immersion+percolation drip method using the Hario Switch dripper (iced). Based on the original version.',
  icedDesc:
    'A hand-drip method devised by World Barista Champion Tetsu Kasuya (iced version).',
  hotLabel: '4:6 Method #HOT',
  icedLabel: '4:6 Method #ICED',
  hybridLabel: 'New Hybrid Method #HOT',
  hybridIcedLabel: 'Hybrid Method #ICED',
  sourcePrefix: 'Source: ',
  icedPrep: 'Fill the coffee server with plenty of ice beforehand.',
  soundLabel: 'Sound',
  soundSe: '🔔 SE',
  soundTts: '🗣 Voice',
  ttsPourTo: (n) => `Pour up to ${n} grams.`,
  ttsPourRange: (a, b) => `Pour ${a} to ${b} grams.`,
  ttsStir: 'After pouring, gently swirl the dripper to stir.',
  ttsSwitchClose: 'Keep the switch closed and pour water.',
  ttsSwitchOpen: 'Open the switch and pour water.',
  ttsSwitchOpenContinue: 'Keep the switch open and pour water.',
  ttsSwitchClosePour: 'Close the switch and pour water at around 75 degrees.',
  ttsSwitchRelease: 'Release the switch.',
  ttsPour1Hybrid: 'Keep the switch closed and pour just enough water to saturate the grounds.',
  ttsSwitchOpenContinueHot:
    'Keep the switch open and pour water. After pouring, lower the water temperature to around 75 degrees.',
  ttsSwitchOpenStir:
    'Keep the switch open and pour water, then swirl the dripper to stir after pouring.',
  ttsSwitchOpenStir2:
    'Keep the switch open and pour water, then stir. After pouring, lower the water temperature to around 75 degrees.',
  ttsSwitchCloseIced: 'Close the switch and pour water at around 75 degrees.',
  ttsSwitchReleaseIced: 'Release the switch.',
  ttsFinish: 'Brewing is complete.',
};

const dict: Record<Lang, Strings> = { ja, en };

export function getStrings(lang: Lang): Strings {
  return dict[lang];
}
