import type { Lang } from '../types';
import { getStrings } from '../i18n/strings';

interface Props {
  lang: Lang;
  onReload(): void;
  onClose(): void;
}

export function UpdateToast({ lang, onReload, onClose }: Props) {
  const s = getStrings(lang);
  return (
    <div className="update-toast" role="status">
      <span className="update-toast-msg">{s.updateReady}</span>
      <button className="btn btn-primary update-toast-reload" onClick={onReload}>
        {s.updateReload}
      </button>
      <button
        className="update-toast-close"
        onClick={onClose}
        aria-label={s.close}
        title={s.close}
      >
        ×
      </button>
    </div>
  );
}
