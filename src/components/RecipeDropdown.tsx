import { useEffect, useRef, useState } from 'react';
import type { Lang, RecipeId } from '../types';
import { RECIPES, isRecommended } from '../data/recipes';
import { getStrings } from '../i18n/strings';
import { RecipeLabel } from './RecipeLabel';
interface Props {
  value: RecipeId;
  onChange(id: RecipeId): void;
  lang: Lang;
}
export function RecipeDropdown({ value, onChange, lang }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const s = getStrings(lang);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  return (
    <div className="recipe-dropdown" ref={ref}>
      <button
        className="recipe-dropdown-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="recipe-dropdown-label">
          <RecipeLabel id={value} lang={lang} />
          {isRecommended(value) && (
            <span className="recipe-recommend-badge">{s.recommend}</span>
          )}
        </span>
        <span className={`recipe-dropdown-arrow ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="recipe-dropdown-menu">
          {RECIPES.map((r) => (
            <button
              key={r.id}
              className={`recipe-dropdown-item ${r.id === value ? 'active' : ''}`}
              onClick={() => {
                onChange(r.id);
                setOpen(false);
              }}
            >
              <span className="recipe-item-label">
                <RecipeLabel id={r.id} lang={lang} />
              </span>
              {isRecommended(r.id) && (
                <span className="recipe-recommend-badge">{s.recommend}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
