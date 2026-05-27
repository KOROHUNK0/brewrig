import type { ConfirmState, Lang } from '../types';
import { getStrings } from '../i18n/strings';
interface ConfirmProps {
  state: ConfirmState;
  onCancel(): void;
  lang: Lang;
}
export function ConfirmDialog({ state, onCancel, lang }: ConfirmProps) {
  if (!state.open) return null;
  const s = getStrings(lang);
  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <p className="dialog-msg">{state.message}</p>
        <div className="dialog-actions">
          <button
            className="btn btn-ghost dialog-cancel"
            onClick={onCancel}
          >
            {s.cancel}
          </button>
          <button
            className="btn btn-primary dialog-ok"
            onClick={() => {
              state.onOk();
              onCancel();
            }}
          >
            {s.ok}
          </button>
        </div>
      </div>
    </div>
  );
}
interface FlavorHelpProps {
  onClose(): void;
  lang: Lang;
}
export function FlavorHelpDialog({ onClose, lang }: FlavorHelpProps) {
  const s = getStrings(lang);
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        className="dialog-box flavor-help-box"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="flavor-help-title">{s.flavorHelpTitle}</p>
        <div className="flavor-help-items">
          <div className="flavor-help-item">
            <span className="flavor-help-label">{s.flavorHelpBright}</span>
            <span className="flavor-help-desc">{s.flavorHelpBrightDesc}</span>
          </div>
          <div className="flavor-help-item">
            <span className="flavor-help-label">{s.flavorHelpSweet}</span>
            <span className="flavor-help-desc">{s.flavorHelpSweetDesc}</span>
          </div>
        </div>
        <button
          className="btn btn-ghost dialog-cancel flavor-help-close"
          onClick={onClose}
        >
          {s.flavorHelpClose}
        </button>
      </div>
    </div>
  );
}
