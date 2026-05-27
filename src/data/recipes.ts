import type {
  FlavorOption,
  Lang,
  PourStep,
  Recipe,
  RoastChip,
  StrengthOption,
} from '../types';
import { getStrings } from '../i18n/strings';

/** Total brew time (seconds). Common to all recipes. */
export const FINISH_TIME = 210;

export function getRoastChips(lang: Lang): RoastChip[] {
  const s = getStrings(lang);
  return [
    { label: s.roastLight, temp: '93℃' },
    { label: s.roastMedium, temp: '88℃' },
    { label: s.roastDark, temp: '83℃' },
  ];
}

function flavorOptions(lang: Lang): FlavorOption[] {
  const s = getStrings(lang);
  return [
    { value: 'sweet', label: s.flavorSweet },
    { value: 'normal', label: s.flavorNormal },
    { value: 'bright', label: s.flavorBright },
  ];
}

/** 4:6 Method (Hot) — Tetsu Kasuya. Steps carry only time + amount + label. */
const hot: Recipe = {
  id: 'hot',
  getLabel: (lang) => getStrings(lang).hotLabel,
  getGrind: (lang) => getStrings(lang).grindMedCoarse,
  waterMultiplier: 15,
  getDescription: (lang) => getStrings(lang).hotDesc,
  sourceUrl:
    'https://philocoffea.com/?mode=f3&srsltid=AfmBOootNwcQ2a6EOZrSfL1rqMnGhptPxljoapVa2WLPnzYZ4IvUvMAQ',
  getFlavorOptions: flavorOptions,
  defaultFlavor: 'normal',
  getStrengthOptions(lang) {
    const s = getStrings(lang);
    return [
      { value: 'light', label: s.strengthLight },
      { value: 'normal', label: s.strengthNormal },
      { value: 'strong', label: s.strengthStrong },
    ];
  },
  defaultStrength: 'normal',
  getTemperature: () => null,
  getPourSteps(flavor, strength, lang, powder = 20) {
    const s = getStrings(lang);
    const r = powder;
    const i = Math.round(
      flavor === 'sweet' ? r * 2.5 : flavor === 'bright' ? r * 3.5 : r * 3,
    );
    const a = Math.round(
      flavor === 'sweet' ? r * 3.5 : flavor === 'bright' ? r * 2.5 : r * 3,
    );
    const o = Math.round(r * 9);
    const ss = Math.round(r * 4.5);
    const c = Math.round(r * 3);
    if (strength === 'light') {
      return [
        { timeSeconds: 0, amount: i, label: s.pour(1) },
        { timeSeconds: 45, amount: a, label: s.pour(2) },
        { timeSeconds: 90, amount: o, label: s.pour(3) },
      ];
    }
    if (strength === 'normal') {
      return [
        { timeSeconds: 0, amount: i, label: s.pour(1) },
        { timeSeconds: 45, amount: a, label: s.pour(2) },
        { timeSeconds: 90, amount: ss, label: s.pour(3) },
        { timeSeconds: 130, amount: ss, label: s.pour(4) },
      ];
    }
    return [
      { timeSeconds: 0, amount: i, label: s.pour(1) },
      { timeSeconds: 45, amount: a, label: s.pour(2) },
      { timeSeconds: 90, amount: c, label: s.pour(3) },
      { timeSeconds: 130, amount: c, label: s.pour(4) },
      { timeSeconds: 160, amount: c, label: s.pour(5) },
    ];
  },
};

/** 4:6 Method (Iced) — first two pours stir, rest plain. */
const iced: Recipe = {
  id: 'iced',
  getLabel: (lang) => getStrings(lang).icedLabel,
  getGrind: (lang) => getStrings(lang).grindMedium,
  waterMultiplier: 7.5,
  getDescription: (lang) => getStrings(lang).icedDesc,
  sourceUrl: 'https://youtu.be/TfSBzFeoL4s?si=60ThFm-z5wOSqSRu',
  getFlavorOptions: flavorOptions,
  defaultFlavor: 'normal',
  getStrengthOptions(lang) {
    const s = getStrings(lang);
    return [
      { value: 'light', label: s.strengthLight },
      { value: 'strong', label: s.strengthStrongRec },
    ];
  },
  defaultStrength: 'strong',
  getTemperature: (_lang, strength) =>
    strength === 'light' ? '80℃' : '90℃',
  getPourSteps(flavor, _strength, lang, powder = 20) {
    const s = getStrings(lang);
    const r = powder;
    const i = Math.round(
      flavor === 'sweet' ? r * 1 : flavor === 'bright' ? r * 2 : r * 1.5,
    );
    const a = Math.round(
      flavor === 'sweet' ? r * 2 : flavor === 'bright' ? r * 1 : r * 1.5,
    );
    const o = Math.round(r * 1.5);
    return [
      { timeSeconds: 0, amount: i, label: s.pour(1), stir: true },
      { timeSeconds: 45, amount: a, label: s.pour(2), stir: true },
      { timeSeconds: 90, amount: o, label: s.pour(3) },
      { timeSeconds: 130, amount: o, label: s.pour(4) },
      { timeSeconds: 160, amount: o, label: s.pour(5) },
    ];
  },
  getPreparation: (lang) => [getStrings(lang).icedPrep],
};

/** New Hybrid Method (Hot) — HARIO Switch, percolation+immersion mix. */
const hybrid: Recipe = {
  id: 'hybrid',
  getLabel: (lang) => getStrings(lang).hybridLabel,
  getGrind: (lang) => getStrings(lang).grindMedCoarse,
  waterMultiplier: 15,
  getDescription: (lang) => getStrings(lang).hybridDesc,
  sourceUrl: 'https://youtu.be/4FeUp_zNiiY?si=wyJO1QLRu4Crf06R',
  getFlavorOptions: flavorOptions,
  defaultFlavor: 'normal',
  defaultStrength: 'normal',
  getTemperature: () => null,
  getEquipment: (lang) => getStrings(lang).equipHarioSwitch,
  getTempNote: (lang) => getStrings(lang).hybridTempNote,
  getPourSteps(flavor, _strength, lang, powder = 20) {
    const s = getStrings(lang);
    const r = powder;
    const i = Math.round(
      flavor === 'sweet' ? r * 1.5 : flavor === 'bright' ? r * 2.5 : r * 2,
    );
    const a = Math.round(
      flavor === 'sweet' ? r * 2 : flavor === 'bright' ? r * 3 : r * 2.5,
    );
    const o = a;
    const ss = Math.round(r * 6) - a;
    const c = Math.round(r * 6) - i;
    const l = ss;
    const u = Math.round(r * 4);
    const d = Math.round(r * 5);
    return [
      {
        timeSeconds: 0,
        amount: o,
        amountMin: i,
        amountMax: a,
        label: s.pour(1),
        instruction: s.instrPour1Hybrid,
        flowType: 'immersion',
      },
      {
        timeSeconds: 40,
        amount: l,
        amountMin: ss,
        amountMax: c,
        cumTarget: Math.round(r * 6),
        label: s.pour(2),
        instruction: s.instrSwitchOpen,
        flowType: 'percolation',
      },
      {
        timeSeconds: 90,
        amount: u,
        label: s.pour(3),
        instruction: s.instrSwitchOpenContinueHot,
        flowType: 'percolation',
      },
      {
        timeSeconds: 130,
        amount: d,
        label: s.pour(4),
        instruction: s.instrSwitchClosePour,
        flowType: 'immersion',
        stepTag: s.tagTemp70,
      },
      {
        timeSeconds: 165,
        amount: 0,
        label: s.switchOpenLabel,
        instruction: s.instrSwitchRelease,
        noWater: true,
        flowType: 'percolation',
      },
    ];
  },
};

/** Hybrid Method (Iced) — HARIO Switch, original version. */
const hybridIced: Recipe = {
  id: 'hybrid-iced',
  getLabel: (lang) => getStrings(lang).hybridIcedLabel,
  getGrind: (lang) => getStrings(lang).grindMedFine,
  waterMultiplier: 7,
  getDescription: (lang) => getStrings(lang).hybridIcedDesc,
  sourceUrl: 'https://youtu.be/dBf8im6Jyng?si=iV-INxuNnqOesaRE',
  getFlavorOptions: flavorOptions,
  defaultFlavor: 'normal',
  defaultStrength: 'normal',
  getTemperature: () => null,
  getEquipment: (lang) => getStrings(lang).equipHarioSwitch,
  getTempNote: (lang) => getStrings(lang).hybridTempNoteIced,
  getPreparation: (lang) => [getStrings(lang).icedPrep],
  getPourSteps(flavor, _strength, lang, powder = 20) {
    const s = getStrings(lang);
    const r = powder;
    const i = Math.round(
      flavor === 'sweet' ? r * 1 : flavor === 'bright' ? r * 2 : r * 1.5,
    );
    const a = Math.round(
      flavor === 'sweet' ? r * 2.5 : flavor === 'bright' ? r * 1.5 : r * 2,
    );
    const o = Math.round(r * 3.5);
    return [
      {
        timeSeconds: 0,
        amount: i,
        label: s.pour(1),
        instruction: s.instrSwitchOpenStir,
        stir: true,
        flowType: 'percolation',
      },
      {
        timeSeconds: 30,
        amount: a,
        label: s.pour(2),
        instruction: s.instrSwitchOpenStir2,
        stir: true,
        flowType: 'percolation',
      },
      {
        timeSeconds: 100,
        amount: o,
        label: s.pour(3),
        instruction: s.instrSwitchCloseIced,
        flowType: 'immersion',
        stepTag: s.tagTemp70,
      },
      {
        timeSeconds: 130,
        amount: 0,
        label: s.switchOpenLabel,
        instruction: s.instrSwitchReleaseIced,
        noWater: true,
        flowType: 'percolation',
        stir: true,
      },
    ];
  },
};

/** Public registry — order matters: this drives the dropdown. */
export const RECIPES: Recipe[] = [hot, iced, hybrid, hybridIced];

export function getRecipeById(id: string): Recipe {
  return RECIPES.find((r) => r.id === id) ?? RECIPES[0];
}

export function isRecommended(id: string): boolean {
  return id === 'hot' || id === 'iced';
}
