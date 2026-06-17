export type Lang = 'ja' | 'en';

export type Theme = 'dark' | 'light';

export type FlavorKey = 'sweet' | 'normal' | 'bright';

export type StrengthKey = 'light' | 'normal' | 'strong';

export type FlowType = 'immersion' | 'percolation';

export type RecipeId = 'hot' | 'iced' | 'hybrid' | 'hybrid-iced';

export type SoundMode = 'se' | 'tts';

export interface PourStep {
  timeSeconds: number;
  label: string;
  amount: number;
  amountMin?: number;
  amountMax?: number;
  cumTarget?: number;
  noWater?: boolean;
  instruction?: string;
  stir?: boolean;
  flowType?: FlowType;
  stepTag?: string;
}

export interface RoastChip {
  label: string;
  temp: string;
}

export interface FlavorOption {
  value: FlavorKey;
  label: string;
}

export interface StrengthOption {
  value: StrengthKey;
  label: string;
}

export interface Recipe {
  id: RecipeId;
  getLabel(lang: Lang): string;
  getDescription(lang: Lang): string;
  sourceUrl: string;
  getGrind(lang: Lang): string;
  waterMultiplier: number;
  getFlavorOptions(lang: Lang): FlavorOption[];
  defaultFlavor: FlavorKey;
  getStrengthOptions?(lang: Lang): StrengthOption[];
  defaultStrength: StrengthKey;
  getTemperature(lang: Lang, strength: StrengthKey): string | null;
  getEquipment?(lang: Lang): string;
  getPreparation?(lang: Lang): string[];
  getTempNote?(lang: Lang): string;
  getPourSteps(
    flavor: FlavorKey,
    strength: StrengthKey,
    lang: Lang,
    powder: number,
  ): PourStep[];
}

export interface ConfirmState {
  open: boolean;
  message: string;
  onOk: () => void;
}
