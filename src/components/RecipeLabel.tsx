import type { Lang, RecipeId } from '../types';
import { getRecipeById } from '../data/recipes';
interface Props {
  id: RecipeId;
  lang: Lang;
}
/** Splits a recipe label like "X #HOT" into a base + tag badge. */
export function RecipeLabel({ id, lang }: Props) {
  const text = getRecipeById(id).getLabel(lang);
  const m = text.match(/^(.*?)\s*#(\S+)$/);
  const tag = m?.[2]?.toUpperCase() ?? '';
  const cls =
    tag === 'HOT'
      ? 'recipe-label-tag recipe-label-tag-hot'
      : tag === 'ICED'
        ? 'recipe-label-tag recipe-label-tag-iced'
        : 'recipe-label-tag';
  return (
    <span className="recipe-label-wrap">
      <span className="recipe-label-base">{m ? m[1] : text}</span>
      {m && <span className={cls}>{m[2]}</span>}
    </span>
  );
}
