import { Fragment } from 'react';
import type { Lang, Recipe, RecipeId } from '../types';
import { getStrings } from '../i18n/strings';
import { RecipeDropdown } from './RecipeDropdown';
interface Props {
  lang: Lang;
  recipe: Recipe;
  selectRecipe(id: RecipeId): void;
}
export function RecipeCard({ lang, recipe, selectRecipe }: Props) {
  const s = getStrings(lang);
  const desc = recipe.getDescription(lang);
  const lines = desc.split(/(?<=。)/).filter((l) => l.length > 0);
  return (
    <section className="card recipe-card">
      <label className="setting-label">{s.recipeLabel}</label>
      <RecipeDropdown value={recipe.id} onChange={selectRecipe} lang={lang} />
      <div className="recipe-description">
        <p className="recipe-desc-text">
          {lines.map((line, i) => (
            <Fragment key={i}>
              <span>
                {line}
                {i < lines.length - 1 && <br />}
              </span>
            </Fragment>
          ))}
        </p>
        <a
          className="recipe-desc-source"
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {s.sourcePrefix}
          {recipe.sourceUrl}
        </a>
      </div>
    </section>
  );
}
