'use client';
import { BookOpen } from 'lucide-react';
import { catalog, type Recipe } from '@/lib/inventory';
import { useI18n } from '@/lib/i18n';

const terms: Record<string, string> = {
  'White wine glass': 'Weißweinglas', 'Apple / Dry Apple': 'Apfel / getrockneter Apfel',
  'Banana chips': 'Bananenchips', Blueberry: 'Blaubeeren', 'Coconut or Raspberry': 'Kokos oder Himbeere',
  Lime: 'Limette', 'Lime juice': 'Limettensaft', 'Lemon juice': 'Zitronensaft',
  'Chamomile tea': 'Kamillentee', 'Lemon juice / Lime juice — offen': 'Zitrone oder Limette · noch offen',
  'Hendricks tea pot and cups / Teapot + cup': 'Teekanne und Tasse',
  'Some citrus / lemon slice in cup': 'Zitrus / Zitronenscheibe in der Tasse', 'Tajin crust': 'Tajín-Rand',
  Building: 'Im Glas aufbauen',
};

export default function CatalogReference({ recipe }: { recipe: Recipe }) {
  const { t, format } = useI18n();
  const original = catalog.recipes.find(r => r.key === recipe.catalogKey);
  if (!original) return recipe.note ? <p className="muted-help">{recipe.note}</p> : null;
  const term = (value: string) => t(terms[value] || value);
  return <details className="catalog-reference">
    <summary><BookOpen size={15} />{t('Originalblatt & Servierzugaben')}</summary>
    <div className="catalog-reference-body">
      <p className="reference-label">{t('Erst beim Servieren · nicht in der Inventur')}</p>
      {original.servingAdditions.map((line, index) => <div className="reference-line" key={index}><span>{term(line.name)}</span><strong>{line.ml === null ? t('Menge offen') : `${format(line.ml)} ml`}</strong></div>)}
      <p className="muted-help">{t('Originalrezept: {volume} ml Batch pro Drink.', { volume: format(original.batchPortionMl) })} {t('Die Rechnung verwendet deine oben gespeicherten Batch-Zutaten.')}</p>
      <dl><dt>{t('Glas')}</dt><dd>{term(original.glass)}</dd><dt>{t('Garnitur')}</dt><dd>{term(original.garnish)}</dd><dt>{t('Zubereitung')}</dt><dd>{term(original.method)}</dd></dl>
      {original.preparation && <p className="reference-prep">{t(original.preparation)}</p>}
      {original.issues.map(issue => <p className="reference-issue" key={issue}>{t(issue)}</p>)}
      {recipe.note && <p>{recipe.note}</p>}
    </div>
  </details>;
}
