'use client';

import { useId, useState } from 'react';
import { ArrowRight, ClipboardList, Copy, Info, Pencil, Wine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { countVolume, recipeVolume, summarize } from '@/lib/inventory';
import type { Ingredient, InventoryState } from '@/lib/inventory';

type Result = ReturnType<typeof summarize>[number];

type Props = {
  state: InventoryState;
  results: Result[];
  shownResults: Result[];
  onlySpirits: boolean;
  onOnlySpiritsChange: (value: boolean) => void;
  disabled: boolean;
  onCopy: () => void;
  onEditIngredient: (ingredient: Ingredient) => void;
  onShowInventory: (recipeId?: string) => void;
};

function ResultBottle({ level, label }: { level: number; label: string }) {
  const id = useId().replace(/:/g, '');
  const path = 'M18 4h16v15c0 5 10 6 10 15v55c0 5-3 8-8 8H16c-5 0-8-3-8-8V34c0-9 10-10 10-15Z';
  const top = 97 - Math.max(0, Math.min(level, 1)) * 93;
  return <span className="result-bottle">
    <svg viewBox="0 0 52 101" aria-hidden="true" focusable="false">
      <defs><clipPath id={id}><path d={path} /></clipPath></defs>
      <path d={path} fill="#101b25" stroke="#a6bfd1" strokeWidth="1.6" />
      <rect x="7" y={top} width="38" height={97 - top} fill="#ff8d7e" clipPath={'url(#' + id + ')'} />
      <path d={path} fill="none" stroke="#c4d7e5" strokeWidth="1.6" />
      <path d="M18 16h16" stroke="#c4d7e5" strokeWidth="1.2" />
    </svg>
    <span>{label}</span>
  </span>;
}

export default function ResultsView({ state, results, shownResults, onlySpirits, onOnlySpiritsChange, disabled, onCopy, onEditIngredient, onShowInventory }: Props) {
  const { t, format, ingredientName } = useI18n();
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const countedRecipes = state.recipes.filter(recipe => Boolean(state.counts[recipe.id]));
  const selectedRecipe = countedRecipes.find(recipe => recipe.id === selectedRecipeId) ?? countedRecipes[0];
  const count = selectedRecipe ? state.counts[selectedRecipe.id] : undefined;
  const opened = count?.openMl.filter(ml => ml > 0) ?? [];
  const totalMl = countedRecipes.reduce((sum, recipe) => sum + countVolume(state.counts[recipe.id]), 0);
  const remaining = state.recipes.length - countedRecipes.length;
  const equivalentLabel = (row: Result) => {
    if (row.stockCl === null) return t('Umrechnung offen');
    if (row.bottleMl === null) return t('Flaschengröße offen');
    const size = format(row.bottleMl / 10);
    const rest = format(row.remainderCl ?? 0);
    if (!row.bottles) return t('{rest} cl von {size} cl pro Flasche', { rest, size });
    if (row.bottles === 1) return row.remainderCl === 0
      ? t('1 volle Originalflasche à {size} cl', { size })
      : t('1 volle Originalflasche à {size} cl + {rest} cl', { size, rest });
    return row.remainderCl === 0
      ? t('{count} volle Originalflaschen à {size} cl', { count: row.bottles, size })
      : t('{count} volle Originalflaschen à {size} cl + {rest} cl', { count: row.bottles, size, rest });
  };

  return <div className="results-view">
    <p className="results-subtitle">{t('Wir rechnen deine übrigen Pre-Batches in einzelne Zutaten um.')}</p>
    <div className="results-overview">
      <div className="result-stat"><Wine aria-hidden="true" /><div><strong>{format(totalMl / 1000, 3)} l</strong><span>{t('Noch in gezählten Pre-Batches')}</span></div></div>
      <div className="result-stat"><ClipboardList aria-hidden="true" /><div><strong>{countedRecipes.length} {t('von')} {state.recipes.length}</strong><span>{t('Pre-Batches gezählt')}</span></div></div>
    </div>

    {remaining > 0 && <div className="results-progress">
      <strong>{t('{count} Pre-Batches noch offen', { count: remaining })}</strong>
      <Progress value={state.recipes.length ? countedRecipes.length / state.recipes.length * 100 : 0} aria-label={t('{count} von {total} Pre-Batches erfasst', { count: countedRecipes.length, total: state.recipes.length })} />
      <Button onClick={() => onShowInventory()}>{t('Weiter zählen')}<ArrowRight size={17} /></Button>
    </div>}

    {selectedRecipe && count && <section className="batch-breakdown" aria-labelledby="batch-breakdown-title">
      <div className="batch-breakdown-top">
        <div><p className="eyebrow">{t('Dein gezählter Restbestand')}</p><h2 id="batch-breakdown-title">{selectedRecipe.name}</h2></div>
        {countedRecipes.length > 1 && <Select value={selectedRecipe.id} onValueChange={setSelectedRecipeId}><SelectTrigger aria-label={t('Pre-Batch auswählen')}><SelectValue /></SelectTrigger><SelectContent>{countedRecipes.map(recipe => <SelectItem key={recipe.id} value={recipe.id}>{recipe.name}</SelectItem>)}</SelectContent></Select>}
      </div>
      <div className="batch-breakdown-body">
        <div className="batch-bottles" aria-label={t('Gezählte Batch-Flaschen')}>
          {count.full > 0 && <ResultBottle level={1} label={count.full === 1 ? t('1 volle Flasche') : t('{count} volle Flaschen', { count: count.full })} />}
          {opened.slice(0, 3).map((ml, index) => <ResultBottle key={index} level={ml / count.bottleMl} label={t('{volume} cl in Flasche {index}', { volume: format(ml / 10), index: index + 1 })} />)}
          {opened.length > 3 && <span className="batch-more-bottles">{t('+ {count} weitere', { count: opened.length - 3 })}</span>}
          {!count.full && !opened.length && <span className="batch-zero">{t('Kein Bestand erfasst')}</span>}
        </div>
        <div className="batch-total"><span>{t('Noch vorhandener Pre-Batch')}</span><strong>{format(countVolume(count) / 10)} cl</strong><small>{t('Batch-Flaschengröße: {volume} cl', { volume: format(count.bottleMl / 10) })}{count.estimated ? ' · ' + t('Füllstand geschätzt') : ''}</small></div>
      </div>
      <div className="batch-ingredients"><span>{t('Laut Rezept enthalten:')}</span>{selectedRecipe.lines.map(line => <span className="batch-ingredient" key={line.ingredientId}>{ingredientName(state.ingredients.find(i => i.id === line.ingredientId))} {format(line.ml / recipeVolume(selectedRecipe) * 100, 1)} %</span>)}</div>
    </section>}

    {results.some(row => row.demo) && <p className="scope-notice">{t('Dieses Ergebnis enthält Demo-Rezepte und ist noch keine echte Bar-Inventur.')}</p>}
    <section className="results-ingredients" aria-labelledby="results-ingredients-title">
      <div className="results-section-heading">
        <div><p className="eyebrow">{t('FÜR DEINE INVENTURLISTE')}</p><h2 id="results-ingredients-title">{t('Diese Zutaten stecken noch darin')}</h2></div>
        <Button className="copy-button" onClick={onCopy} disabled={!shownResults.length}><Copy size={17} />{t('Liste kopieren')}</Button>
      </div>
      <label className="checkbox-row filter-row"><Checkbox checked={onlySpirits} onCheckedChange={value => onOnlySpiritsChange(value === true)} /><span>{t('Nur alkoholische Zutaten anzeigen')}</span></label>
      {shownResults.length ? <div className="result-list" role="table" aria-label={t('Noch vorhandene Zutaten')}>
        <div className="result-list-head" role="row"><span role="columnheader">{t('Zutat')}</span><span role="columnheader">{t('Noch im Batch')}</span><span role="columnheader">{t('Entspricht Originalprodukt')}</span></div>
        {shownResults.map(row => <div className="result-list-row" role="row" key={row.id}>
          <div className="result-item-name" role="cell">
            <button type="button" className="product-link" disabled={disabled} onClick={() => onEditIngredient(row)}>{ingredientName(row)}<Pencil size={14} /></button>
            <span>{row.sources.map(source => source.name).join(' · ')}</span>
          </div>
          <div className="result-item-volume" role="cell"><span className="result-mobile-label">{t('Noch im Batch')}</span><strong>{row.estimated && <small>{t('ca.')} </small>}{format(row.totalCl)} cl</strong><small>{t('In der gezählten Mischung')}</small></div>
          <div className="result-item-equivalent" role="cell"><span className="result-mobile-label">{t('Entspricht Originalprodukt')}</span><strong>{row.stockCl === null ? '—' : <>{row.estimated && <small>{t('ca.')} </small>}{format(row.stockCl)} cl</>}</strong><small>{equivalentLabel(row)}</small></div>
        </div>)}
      </div> : <div className="empty-results"><ClipboardList size={38} /><h3>{countedRecipes.length ? t('Keine passenden Zutaten.') : t('Zuerst die Flaschen zählen.')}</h3><p>{countedRecipes.length ? t('Blende alle Zutaten ein oder erfasse einen weiteren Pre-Batch.') : t('Wähle einen Pre-Batch und gib volle Flaschen und Restmengen ein.')}</p><Button onClick={() => onShowInventory()}>{t('Zur Inventur')}<ArrowRight /></Button></div>}
    </section>

    <aside className="results-explainer" aria-labelledby="results-explainer-title"><Info size={24} aria-hidden="true" /><div><h3 id="results-explainer-title">{t('Was bedeuten die Mengen?')}</h3><p>{t('„Noch im Batch“ ist die Menge dieser Zutat in deinen gezählten Mischungen.')}</p><p>{t('1 cl = 10 ml. 100 cl = 1 Liter.')}</p><p>{t('„Originalprodukt“ ist ein rechnerischer Gegenwert. Separate Originalflaschen sind nicht mitgezählt.')}</p><p>{t('Verbrauch lässt sich erst mit bekanntem Anfangsbestand berechnen.')}</p></div></aside>
  </div>;
}
