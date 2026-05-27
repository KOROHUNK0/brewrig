import type { FlavorKey, Lang, Recipe, StrengthKey } from '../types';
import { getRoastChips } from '../data/recipes';
import { getStrings } from '../i18n/strings';
import { SegSlider } from './SegSlider';
interface Props {
  lang: Lang;
  recipe: Recipe;
  powder: number;
  setPowder(v: number | ((prev: number) => number)): void;
  flavor: FlavorKey;
  setFlavor(k: FlavorKey): void;
  strength: StrengthKey;
  setStrength(k: StrengthKey): void;
  totalWater: number;
  onOpenFlavorHelp(): void;
  guardChange(fn: () => void): void;
  /** When the timer is running or has progressed, fields are readOnly. */
  locked: boolean;
}
export function SettingsCard({
  lang,
  recipe,
  powder,
  setPowder,
  flavor,
  setFlavor,
  strength,
  setStrength,
  totalWater,
  onOpenFlavorHelp,
  guardChange,
  locked,
}: Props) {
  const s = getStrings(lang);
  const strengthOpts = recipe.getStrengthOptions?.(lang);
  const effectiveStrength = strengthOpts
    ? (strengthOpts.find((o) => o.value === strength)?.value ??
      recipe.defaultStrength)
    : recipe.defaultStrength;
  const temp = recipe.getTemperature(lang, effectiveStrength);
  const tempNote = recipe.getTempNote?.(lang);
  const equipment = recipe.getEquipment?.(lang);
  const prep = recipe.getPreparation?.(lang);
  return (
    <section className="card settings-card">
      <div className="settings-grid">
        {/* Powder */}
        <div className="setting-item full-width">
          <label className="setting-label">{s.powderLabel}</label>
          <div className="powder-row">
            <div className="powder-stepper-wrap">
              <button
                className="qs7-btn minus5"
                onClick={() =>
                  guardChange(() =>
                    setPowder((e) => Math.max(5, e - 5)),
                  )
                }
              >
                －5
              </button>
              <button
                className="qs7-btn minus1"
                onClick={() =>
                  guardChange(() =>
                    setPowder((e) => Math.max(5, e - 1)),
                  )
                }
              >
                －1
              </button>
              <div
                className="qs7-input-zone"
                onClick={() => {
                  if (locked) guardChange(() => {});
                }}
              >
                <span className="qs7-pencil">✎</span>
                <div className="qs7-input-row">
                  <input
                    type="number"
                    className="qs7-input"
                    value={powder}
                    min={5}
                    max={50}
                    onChange={(e) => {
                      const n = Number(e.currentTarget.value);
                      if (Number.isFinite(n)) {
                        setPowder(Math.min(50, Math.max(5, n)));
                      }
                    }}
                    disabled={locked}
                    readOnly={locked}
                  />
                  <span className="qs7-unit">g</span>
                </div>
              </div>
              <button
                className="qs7-btn plus1"
                onClick={() =>
                  guardChange(() =>
                    setPowder((e) => Math.min(50, e + 1)),
                  )
                }
              >
                ＋1
              </button>
              <button
                className="qs7-btn plus5"
                onClick={() =>
                  guardChange(() =>
                    setPowder((e) => Math.min(50, e + 5)),
                  )
                }
              >
                ＋5
              </button>
            </div>
          </div>
        </div>
        {/* Flavor */}
        <div className="setting-item full-width wide-half">
          <div className="setting-label-row">
            <label className="setting-label">{s.flavorLabel}</label>
            <button
              className="help-btn"
              onClick={onOpenFlavorHelp}
              title={s.flavorHelpTitle}
            >
              ?
            </button>
          </div>
          <SegSlider
            options={recipe.getFlavorOptions(lang)}
            value={flavor}
            onChange={(v) => guardChange(() => setFlavor(v))}
            disabled={locked}
          />
        </div>
        {/* Strength */}
        {strengthOpts && (
          <div className="setting-item full-width wide-half">
            <label className="setting-label">{s.strengthLabel}</label>
            <SegSlider
              options={strengthOpts}
              value={effectiveStrength}
              onChange={(v) => guardChange(() => setStrength(v))}
              disabled={locked}
            />
          </div>
        )}
        <div className="setting-divider full-width" />
        <div className="settings-grid-bottom full-width">
          {equipment && (
            <div className="setting-item setting-item-equip">
              <label className="setting-label">{s.equipLabel}</label>
              <p className="equipment-value">{equipment}</p>
            </div>
          )}
          <div
            className={`setting-item ${equipment ? 'setting-item-grind-eq' : 'setting-item-grind'}`}
          >
            <label className="setting-label">{s.grindLabel}</label>
            <div className="roast-info-compact">
              <span className="roast-chip">
                <span className="roast-chip-temp roast-chip-temp-single">
                  {recipe.getGrind(lang)}
                </span>
              </span>
            </div>
          </div>
          <div className="setting-item setting-item-water">
            <label className="setting-label">{s.totalWaterLabel}</label>
            <div className="total-water-display">
              <span className="total-water-value">{totalWater}</span>
              <span className="total-water-unit">g</span>
            </div>
          </div>
          <div className="setting-item setting-item-temp">
            <label className="setting-label">{s.tempLabel}</label>
            {temp ? (
              <div className="roast-info-compact">
                <span className="roast-chip">
                  <span className="roast-chip-temp roast-chip-temp-single">
                    {temp}
                  </span>
                </span>
              </div>
            ) : (
              <div className="roast-info-compact">
                {getRoastChips(lang).map((c) => (
                  <span className="roast-chip" key={c.label}>
                    <span className="roast-chip-label">{c.label}</span>
                    <span className="roast-chip-temp roast-chip-temp-single">
                      {c.temp}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {tempNote && <p className="temp-note">{tempNote}</p>}
          </div>
        </div>
        {prep && prep.length > 0 && (
          <div className="setting-item full-width">
            <label className="setting-label">{s.prepLabel}</label>
            <ul className="preparation-list">
              {prep.map((p, i) => (
                <li className="preparation-item" key={i}>
                  <span className="preparation-num">{i + 1}.</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
