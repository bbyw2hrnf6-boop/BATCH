'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCheck, ChevronRight, CircleHelp, ClipboardList, Copy, FlaskConical, Globe2, Download, Info, Layers3, Loader2, Minus, Pencil, Plus, RotateCcw, Wine, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Count, Ingredient, InventoryState, Recipe, countVolume, formatInputQuantity, parseQuantity, recipeVolume, seedState, ingredientAmounts, catalog, recipeNeedsRecount, summarize } from '@/lib/inventory';
import { stateSchema } from '@/lib/validation';
import { useI18n, errorMessage } from '@/lib/i18n';
import type { Language } from '@/lib/i18n';
import AnimatedNumber from './animated-number';
import Guide from './guide';
import DrinkGallery, { DrinkArtwork } from './drink-gallery';
import BottleLevel from './bottle-level';
import CatalogReference from './catalog-reference';
import RecipePhoto from './recipe-photo';
import ProductFields, { productDraft, productFromDraft, type ProductDraft } from './product-fields';

type Save = (next: InventoryState) => Promise<boolean>;
const freshId = () => crypto.randomUUID();

function Quantity({ label, value, onChange, unit = 'ml', disabled = false }: { label: string; value: string; onChange: (s: string) => void; unit?: string; disabled?: boolean }) {
  return <label className="field"><span>{label}</span><span className="quantity-input"><Input inputMode="decimal" value={value} disabled={disabled} onChange={e => onChange(e.target.value)} aria-label={label} autoComplete="off" /><span>{unit}</span></span></label>;
}

export default function InventoryApp() {
  const { t, format, language, setLanguage, ingredientName } = useI18n();
  const [state, setState] = useState<InventoryState>(seedState);
  const [revision, setRevision] = useState(0);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [tab, setTab] = useState('inventory');
  const [selected, setSelected] = useState<string | null>(null);
  const [recipeEdit, setRecipeEdit] = useState<Recipe | null>(null);
  const [ingredientEdit, setIngredientEdit] = useState<Ingredient | null>(null);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const [copyFallback, setCopyFallback] = useState('');
  const [onlySpirits, setOnlySpirits] = useState(true);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/inventory', { cache: 'no-store' });
      const data = await response.json() as { error?: string; state: unknown; revision: number; updatedAt: string | null };
      setNeedsAuth(response.status === 401);
      if (!response.ok) throw new Error(data.error || t("Laden fehlgeschlagen."));
      setState(stateSchema.parse(data.state)); setRevision(data.revision); setSavedAt(data.updatedAt);
      setReady(true); setConflict(false); setSelected(null); setRecipeEdit(null); setIngredientEdit(null);
    } catch (e) { setError(errorMessage(e, 'Deine Inventur konnte nicht geladen werden.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save: Save = async next => {
    if (!ready || saving.current || conflict) return false;
    const parsed = stateSchema.safeParse(next);
    if (!parsed.success) { toast.error(t('Bitte deine Eingaben prüfen.')); return false; }
    saving.current = true; setBusy(true); setError('');
    try {
      const response = await fetch('/api/inventory', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, state: parsed.data }) });
      const data = await response.json() as { error?: string; state: unknown; revision: number; updatedAt: string | null };
      setNeedsAuth(response.status === 401);
      if (response.status === 409) setConflict(true);
      if (!response.ok) throw new Error(data.error || t("Speichern fehlgeschlagen."));
      setState(parsed.data); setRevision(data.revision); setSavedAt(data.updatedAt); return true;
    } catch (e) { const message = errorMessage(e, 'Speichern fehlgeschlagen. Deine Eingaben bleiben erhalten.'); setError(message); toast.error(t(message)); return false; }
    finally { setBusy(false); saving.current = false; }
  };
  const live = useRef({ state, save }); live.current = { state, save };
  useEffect(() => {
    type Tool = { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean }; execute: (input: unknown) => unknown };
    const context = (document as unknown as { modelContext?: { registerTool: (t: Tool, o: { signal: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [{ name: 'read_batch_inventory', title: t("Pre-Batch-Inventur lesen"), description: t("Liest Rezepte, erfasste Mengen und nach Zutaten summierte Ergebnisse."), inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true }, execute: () => ({ recipes: live.current.state.recipes, counts: live.current.state.counts, results: summarize(live.current.state) }) }, { name: 'save_batch_count', title: t("Pre-Batch-Bestand speichern"), description: t("Speichert den Bestand eines bekannten Pre-Batches und aktualisiert die sichtbare Inventur. Überschreibt dessen bisherige Zählung."), inputSchema: { type: 'object', properties: { recipeId: { type: 'string' }, full: { type: 'integer', minimum: 0, maximum: 10000 }, bottleMl: { type: 'integer', minimum: 1, maximum: 100000 }, openMl: { type: 'array', items: { type: 'number', minimum: 0 }, maxItems: 50 }, estimated: { type: 'boolean' } }, required: ['recipeId', 'full', 'bottleMl', 'openMl', 'estimated'], additionalProperties: false }, annotations: { readOnlyHint: false }, execute: async input => {
      if (!input || typeof input !== 'object') throw new Error('Ungültige Eingabe');
      const data = input as { recipeId: string; full: number; bottleMl: number; openMl: number[]; estimated: boolean };
      if (!live.current.state.recipes.some(r => r.id === data.recipeId)) throw new Error('Unbekannter Pre-Batch');
      const count: Count = { full: data.full, bottleMl: data.bottleMl, openMl: data.openMl, estimated: data.estimated, updatedAt: new Date().toISOString() };
      const next = stateSchema.parse({ ...live.current.state, counts: { ...live.current.state.counts, [data.recipeId]: count } });
      if (!await live.current.save(next)) throw new Error('Bestand wurde nicht gespeichert');
      setTab('inventory'); setSelected(data.recipeId);
      return { saved: true, recipeId: data.recipeId, totalMl: countVolume(count), results: summarize(next) };
    } }];
    for (const tool of tools) { try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} }
    return () => lifecycle.abort();
  }, []);

  const counted = state.recipes.filter(r => state.counts[r.id]).length;
  const totalMl = Object.values(state.counts).reduce((sum, c) => sum + countVolume(c), 0);
  const results = summarize(state);
  const shownResults = results.filter(i => !onlySpirits || i.spirit);
  const currentRecipe = state.recipes.find(r => r.id === selected) || state.recipes[0];
  const disabled = !ready || busy || loading || conflict;
  const hasDemo = state.recipes.some(r => r.demo);
  const copyList = async () => {
    const text = [t("BATCH · Zutaten in erfassten Pre-Batches"), t('{count} von {total} Pre-Batches erfasst', { count: counted, total: state.recipes.length }), results.some(r => r.demo) ? t("ACHTUNG: Enthält Demo-Rezepte.") : '', t('Produkt | Im Batch cl | Originalprodukt cl | Originalflasche ml | Flaschen | Rest cl'), ...shownResults.map(r => `${ingredientName(r)} | ${r.estimated ? t('ca. ') : ''}${format(r.totalCl)} | ${r.stockCl === null ? t('Umrechnung offen') : format(r.stockCl)} | ${r.bottleMl === null ? t('Offen') : format(r.bottleMl)} | ${r.bottles ?? '—'} | ${r.remainderCl === null ? '—' : format(r.remainderCl)}`), '', t("Nur Pre-Batches. Separat vorhandene Originalflaschen sind nicht enthalten. Werte gerundet auf 0,01 cl.")].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(text); toast.success(t("Inventurliste kopiert.")); }
    catch { setCopyFallback(text); }
  };

  const downloadCatalog = () => {
    const blob = new Blob([JSON.stringify({ sourceCatalog: catalog, ingredients: state.ingredients, recipes: state.recipes }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'BATCH-Rezepte.json'; document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <main className="app-shell">
    <header className="brand-header"><a className="brand" href="/" aria-label={t('BATCH Startseite')}><span>BATCH<small>AFTER HOURS</small></span></a><div className="header-actions"><button className="header-guide" onClick={() => setTab('guide')}><CircleHelp size={18} /><span>{t('Guide')}</span></button><div className="language-picker"><Globe2 size={17} /><Select value={language} onValueChange={next => setLanguage(next as Language)}><SelectTrigger id="language-switcher" aria-label={t('Sprache')}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="de">Deutsch</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="nb">Norsk bokmål</SelectItem></SelectContent></Select></div></div></header>
    <Tabs value={tab} onValueChange={value => { setTab(value); setSelected(null); }} className="app-tabs">
      <div className="page-heading"><div><p className="eyebrow"><span />{t('Bar-Inventur')}</p><h1>{tab === 'inventory' ? t('Alles im Blick.') : tab === 'recipes' ? t('Deine Rezepte.') : tab === 'guide' ? t('So funktioniert’s') : t('Alles aufgelöst.')}</h1></div><div className="save-status" role="status">{busy || loading ? <Loader2 className="spin" size={16} /> : savedAt ? <CheckCheck size={17} /> : <FlaskConical size={17} />}<span>{busy ? t('Speichert …') : loading ? t('Lädt …') : savedAt ? t('Gespeichert') : t('Bereit zum Zählen')}</span></div></div><TabsList className="main-nav" aria-label={t('App-Bereiche')}><TabsTrigger value="inventory"><ClipboardList />{t('Zählen')}</TabsTrigger><TabsTrigger value="recipes"><BookOpen />{t('Rezepte')}</TabsTrigger><TabsTrigger value="results"><CheckCheck />{t('Ergebnis')}</TabsTrigger><TabsTrigger value="guide"><CircleHelp />{t('Guide')}</TabsTrigger></TabsList>
      {hasDemo && <div className="demo-notice"><span className="demo-tag">{t("DEMO-REZEPTE")}</span><span>{t("Zum Ausprobieren. Für die echte Inventur die Bar-Rezepte einsetzen.")}</span><button onClick={() => setTab('recipes')} aria-label={t("Demo-Rezepte bearbeiten")}><ArrowRight size={18} /></button></div>}
      {!hasDemo && <div className="catalog-notice"><BookOpen size={18} /><div><strong>{t('Eure Bar-Rezepte sind bereit.')}</strong><span>{t('Nur rote Batch-Zutaten zählen. Produktnamen und Flaschengrößen kannst du anpassen.')}</span></div><button type="button" onClick={() => { setTab('recipes'); setIngredientsOpen(true); }} disabled={disabled}>{t('Produkte einrichten')}<ArrowRight size={16} /></button></div>}
      {error && <div className="error-notice" role="alert"><p>{t(error)}</p>{needsAuth ? <a href="/signin-with-chatgpt?return_to=%2F" target="_top">{t("Mit ChatGPT anmelden")}</a> : <Button variant="outline" disabled={loading} onClick={() => void load()}>{conflict ? t("Serverstand laden (offene Eingaben verwerfen)") : t("Erneut laden")}</Button>}</div>}

      <TabsContent value="inventory">
        <div className="inventory-grid">
          <DrinkGallery state={state} selected={currentRecipe.id} onSelect={setSelected} disabled={disabled} />
          <section className="count-panel"><CountEditor key={`${currentRecipe.id}-${state.counts[currentRecipe.id]?.updatedAt || 'new'}`} recipe={currentRecipe} state={state} disabled={disabled} save={save} onBack={() => setSelected(currentRecipe.id)} onEdit={() => setRecipeEdit(currentRecipe)} /></section>
        </div>
        <div className="inventory-summary"><div className="summary-progress"><div><span>{t('Erfasste Pre-Batches')}</span><strong><AnimatedNumber value={counted} digits={0} /> / {state.recipes.length}</strong></div><Progress value={counted / state.recipes.length * 100} aria-label={t('{count} von {total} Pre-Batches erfasst', { count: counted, total: state.recipes.length })} /></div><div className="summary-volume"><span>{t('Gesamtvolumen')}</span><strong><AnimatedNumber value={totalMl / 1000} digits={3} /><small> l</small></strong></div><Button variant="outline" onClick={() => setTab('results')} disabled={!counted}>{t('Ergebnis ansehen')}<ArrowRight size={17} /></Button></div>
      </TabsContent>

      <TabsContent value="recipes">
        <div className="section-heading recipe-heading"><div><h2>{t("Mischverhältnisse")}</h2><p>{t("Alle flüssigen Zutaten, die in der abgefüllten Mischung stecken.")}</p></div><div className="heading-actions"><Button variant="outline" onClick={downloadCatalog} disabled={disabled}><Download />{t("Rezeptdatei")}</Button><Button variant="outline" onClick={() => setIngredientsOpen(true)} disabled={disabled}><Wine />{t("Zutaten & Flaschen")}</Button><Button onClick={() => setRecipeEdit({ id: freshId(), name: '', subtitle: '', demo: true, bottleMl: 700, color: '#ff7065', note: '', lines: [{ ingredientId: state.ingredients[0].id, ml: 50 }] })} disabled={disabled}><Plus />{t("Rezept")}</Button></div></div>
        <div className="recipe-grid">{state.recipes.map((recipe, index) => <article className="recipe-card" key={recipe.id} style={{ '--batch-color': recipe.color, '--item-index': index } as React.CSSProperties}><div className="recipe-card-top"><span className="recipe-number">{String(index + 1).padStart(2, '0')}</span><span className={recipe.demo ? 'recipe-badge' : 'verified-badge'}>{recipe.demo ? t("Demo-Rezept") : recipe.catalogKey ? t("Bar-Rezept") : t("Eigenes Rezept")}</span></div><div className="recipe-art"><DrinkArtwork recipe={recipe} /></div><h3>{recipe.name}</h3><p>{t('{volume} ml Rezeptmenge · {bottle} ml Batch-Flasche', { volume: format(recipeVolume(recipe)), bottle: format(recipe.bottleMl) })}</p><div className="recipe-lines">{recipe.lines.map(line => <div key={line.ingredientId}><span>{ingredientName(state.ingredients.find(i => i.id === line.ingredientId))}</span><strong>{format(line.ml)} ml</strong></div>)}</div><CatalogReference recipe={recipe} /><Button variant="outline" onClick={() => setRecipeEdit(recipe)} disabled={disabled}><Pencil />{t("Rezept bearbeiten")}</Button></article>)}</div>
        <p className="footnote"><Info size={16} />{t("Die roten Batch-Zutaten bestimmen das Mischverhältnis, auch Sirup. Servierzugaben gehören nicht hinein. Infusionen benötigen eine bestätigte Umrechnung zum Originalprodukt.")}</p>
      </TabsContent>

      <TabsContent value="results">
        <div className="results-intro"><div><p className="eyebrow">{t("FÜR DEINE INVENTURLISTE")}</p><h2>{counted ? t('{volume} Liter. Aufgeschlüsselt.', { volume: format(totalMl / 1000, 3) }) : t("Dein Ergebnis wartet.")}</h2><p>{t('{count} von {total} Pre-Batches erfasst. Nur Zutaten in diesen Mischungen.', { count: counted, total: state.recipes.length })}</p></div><Button className="copy-button" onClick={() => void copyList()} disabled={!shownResults.length}><Copy />{t("Liste kopieren")}</Button></div>
        {counted < state.recipes.length && <p className="scope-notice">{t('Noch zu zählen: {count}. „Nicht gezählt“ bedeutet nicht „kein Bestand“.', { count: state.recipes.length - counted })}</p>}
        {results.some(r => r.demo) && <p className="scope-notice">{t("Dieses Ergebnis enthält Demo-Rezepte und ist noch keine echte Bar-Inventur.")}</p>}
        <label className="checkbox-row filter-row"><Checkbox checked={onlySpirits} onCheckedChange={v => setOnlySpirits(v === true)} /><span>{t("Nur alkoholische Zutaten anzeigen")}</span></label>
        {shownResults.some(row => row.bottles === null) && <p className="scope-notice">{t('Für einige Produkte fehlen Flaschengröße oder Infusionsfaktor. Die Menge im Batch ist berechnet; offene Gegenwerte sind mit — markiert.')}</p>}
        {shownResults.length ? <section className="result-surface"><Table><TableHeader><TableRow><TableHead>{t("Produkt")}</TableHead><TableHead className="number-cell">{t("Flaschen")}</TableHead><TableHead className="number-cell">{t("Rest cl")}</TableHead><TableHead className="number-cell total-cell">{t("Originalprodukt cl")}</TableHead></TableRow></TableHeader><TableBody>{shownResults.map(row => <TableRow key={row.id}><TableCell><button type="button" className="result-product product-link" disabled={disabled} onClick={() => setIngredientEdit(row)}>{ingredientName(row)}<Pencil size={13} /></button><span className="result-meta">{row.bottleMl === null ? t('Flaschengröße offen') : t('Originalflasche') + ' ' + format(row.bottleMl) + ' ml'}</span><span className="result-meta">{row.estimated ? t('ca. ') : ''}{format(row.totalCl)} cl {t('im Batch')}{row.stockCl === null ? ' · ' + t('Umrechnung offen') : ''}</span><span className="result-sources">{row.sources.map(s => s.name).join(' · ')}</span></TableCell><TableCell className="number-cell result-number">{row.bottles ?? '—'}</TableCell><TableCell className="number-cell result-number rest-number">{row.remainderCl === null ? '—' : format(row.remainderCl)}</TableCell><TableCell className="number-cell total-cell">{row.estimated && row.stockCl !== null && <small>{t("ca.")} </small>}{row.stockCl === null ? '—' : format(row.stockCl)}</TableCell></TableRow>)}</TableBody></Table></section> : <div className="empty-results"><ClipboardList size={38} /><h3>{counted ? t("Keine passenden Zutaten.") : t("Zuerst die Flaschen zählen.")}</h3><p>{counted ? t("Blende alle Zutaten ein oder erfasse einen weiteren Pre-Batch.") : t("Wähle einen Pre-Batch und gib volle Flaschen und Restmengen ein.")}</p><Button onClick={() => setTab('inventory')}>{t("Zur Inventur")}<ArrowRight /></Button></div>}
        <div className="results-footer"><p>{t("Die Flaschenanzahl ist ein rechnerischer Gegenwert. Separat vorhandene Originalflaschen kommen auf deiner Inventurliste zusätzlich dazu. Restmengen werden auf 0,01 cl gerundet; geschätzte Füllstände bleiben Schätzwerte.")}</p><AlertDialog><AlertDialogTrigger asChild><Button variant="outline" disabled={disabled || !counted}><RotateCcw />{t("Neue Zählung")}</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("Neue Zählung beginnen?")}</AlertDialogTitle><AlertDialogDescription>{t("Die aktuellen Zählwerte werden geleert. Deine Rezepte und Zutaten bleiben gespeichert. Kopiere das Ergebnis vorher, wenn du es behalten möchtest.")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("Abbrechen")}</AlertDialogCancel><AlertDialogAction onClick={async () => { if (await save({ ...state, counts: {} })) { setTab('inventory'); setSelected(null); toast.success(t("Bereit für eine neue Zählung.")); } }}>{t("Zählwerte leeren")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>
      </TabsContent>
      <TabsContent value="guide"><Guide onNavigate={target => { if (target === 'ingredients') { setTab('recipes'); setIngredientsOpen(true); } else { setTab(target); setSelected(null); } }} /></TabsContent>
    </Tabs>
    <footer className="app-footer"><span>{t("BATCH / BAR INVENTUR")}</span><span>{t("1 Liter = 100 cl = 1.000 ml")}</span></footer>

    <Dialog open={Boolean(recipeEdit)} onOpenChange={open => { if (!open && !busy) setRecipeEdit(null); }}><LocalizedDialogContent className="editor-dialog"><DialogHeader><DialogTitle>{t("Rezept bearbeiten")}</DialogTitle><DialogDescription>{t("Mengen und Zutaten der abgefüllten Mischung.")}</DialogDescription></DialogHeader>{recipeEdit && <RecipeEditor key={recipeEdit.id} recipe={recipeEdit} state={state} disabled={disabled} save={save} onDone={() => setRecipeEdit(null)} />}</LocalizedDialogContent></Dialog>
    <Dialog open={ingredientsOpen} onOpenChange={setIngredientsOpen}><LocalizedDialogContent className="ingredients-dialog"><DialogHeader><DialogTitle>{t("Zutaten & Originalflaschen")}</DialogTitle><DialogDescription>{t("Eine Zutat wird über alle Rezepte hinweg zusammengezählt. Unterschiedliche Marken als eigene Zutaten anlegen.")}</DialogDescription></DialogHeader><div className="ingredient-list">{state.ingredients.map(i => <button className="ingredient-item" key={i.id} disabled={disabled} onClick={() => { setIngredientEdit(i); setIngredientsOpen(false); }}><span><strong>{ingredientName(i)}</strong><small>{i.spirit ? t("Alkoholisch") : t("Weitere Zutat")}</small></span><span>{i.bottleMl === null ? t('Offen') : format(i.bottleMl) + ' ml'} <Pencil size={16} /></span></button>)}</div><Button onClick={() => { setIngredientEdit({ id: freshId(), name: '', bottleMl: null, spirit: true }); setIngredientsOpen(false); }}><Plus />{t("Zutat hinzufügen")}</Button></LocalizedDialogContent></Dialog>
    <Dialog open={Boolean(ingredientEdit)} onOpenChange={open => { if (!open && !busy) setIngredientEdit(null); }}><LocalizedDialogContent className="editor-dialog"><DialogHeader><DialogTitle>{t("Zutat bearbeiten")}</DialogTitle><DialogDescription>{t("Die Originalflaschengröße bestimmt die Umrechnung für die Inventurliste.")}</DialogDescription></DialogHeader>{ingredientEdit && <IngredientEditor ingredient={ingredientEdit} state={state} disabled={disabled} save={save} onDone={() => { setIngredientEdit(null); setIngredientsOpen(true); }} />}</LocalizedDialogContent></Dialog>
    <Dialog open={Boolean(copyFallback)} onOpenChange={open => { if (!open) setCopyFallback(''); }}><LocalizedDialogContent><DialogHeader><DialogTitle>{t("Inventurliste kopieren")}</DialogTitle><DialogDescription>{t("Dein Browser erlaubt kein automatisches Kopieren. Markiere diesen Text.")}</DialogDescription></DialogHeader><textarea className="copy-text" aria-label={t("Inventurliste")} value={copyFallback} readOnly onFocus={e => e.target.select()} /></LocalizedDialogContent></Dialog>
    <Toaster position="top-center" theme="dark" />
  </main>;
}

function CountEditor({ recipe, state, disabled, save, onBack, onEdit }: { recipe: Recipe; state: InventoryState; disabled: boolean; save: Save; onBack: () => void; onEdit: () => void }) {
  const { t, format, ingredientName, language } = useI18n();
  const existing = state.counts[recipe.id];
  const [full, setFull] = useState(String(existing?.full ?? 0));
  const [bottle, setBottle] = useState(String(existing?.bottleMl ?? recipe.bottleMl));
  const [open, setOpen] = useState((existing?.openMl.length ? existing.openMl : [0]).map(n => formatInputQuantity(n, language)));
  const [unit, setUnit] = useState('ml');
  useEffect(() => { setOpen(values => values.map(s => s.trim() && Number.isFinite(parseQuantity(s)) ? formatInputQuantity(parseQuantity(s), language) : s)); }, [language]);
  const [estimated, setEstimated] = useState(existing?.estimated ?? true);
  const [formError, setFormError] = useState('');
  const [example, setExample] = useState(false);
  const multiplier = unit === 'cl' ? 10 : unit === 'l' ? 1000 : 1;
  const candidate: Count = { full: parseQuantity(full), bottleMl: parseQuantity(bottle), openMl: open.map(s => parseQuantity(s) * multiplier), estimated, updatedAt: new Date().toISOString() };
  const valid = Number.isInteger(candidate.full) && candidate.full >= 0 && candidate.full <= 10000 && Number.isInteger(candidate.bottleMl) && candidate.bottleMl > 0 && candidate.bottleMl <= 100000 && candidate.openMl.every(ml => Number.isFinite(ml) && ml >= 0 && ml <= candidate.bottleMl);
  const volume = valid ? countVolume(candidate) : 0;
  const lead = recipe.lines.find(l => state.ingredients.find(i => i.id === l.ingredientId)?.spirit) || recipe.lines[0];
  const ingredient = state.ingredients.find(i => i.id === lead.ingredientId)!;
  const contribution = valid ? ingredientAmounts(volume * lead.ml / recipeVolume(recipe), ingredient) : null;
  const changeUnit = (next: string) => { const nextMultiplier = next === 'cl' ? 10 : next === 'l' ? 1000 : 1; setOpen(open.map(s => Number.isFinite(parseQuantity(s)) ? formatInputQuantity(parseQuantity(s) * multiplier / nextMultiplier, language) : s)); setUnit(next); };
  return <div className="count-editor"><div className="detail-heading"><div><p className="eyebrow">{t("BESTAND ERFASSEN")}</p><h2>{recipe.name}</h2></div><Button variant="ghost" size="icon" onClick={onEdit} aria-label={t("Rezept bearbeiten")} disabled={disabled}><Pencil size={18} /></Button></div><p className="detail-subtitle">{recipe.demo ? t("Demo-Rezept") : recipe.catalogKey ? t("Bar-Rezept") : t("Eigenes Rezept")} · {format(lead.ml / recipeVolume(recipe) * 100)} % {ingredientName(ingredient)}</p>
    <form onSubmit={async e => { e.preventDefault(); if (!valid) { setFormError('Volle Flaschen als ganze Zahl angeben. Restmengen müssen zwischen 0 und der Flaschengröße liegen.'); return; } setFormError(''); if (await save({ ...state, counts: { ...state.counts, [recipe.id]: candidate } })) { toast.success(t("Bestand gespeichert.")); onBack(); } }}>
      <div className="count-controls"><div className="count-inputs"><Quantity label={t("Größe der Batch-Flasche")} value={bottle} onChange={setBottle} disabled={disabled} />
      <div className="full-bottle-field"><label htmlFor="full-bottles">{t("Volle Flaschen")}</label><div className="stepper"><Button type="button" variant="ghost" aria-label={t("Eine volle Flasche weniger")} disabled={disabled || !Number.isFinite(parseQuantity(full)) || parseQuantity(full) <= 0} onClick={() => setFull(String(Math.max(0, Math.floor(parseQuantity(full)) - 1)))}><Minus /></Button><Input id="full-bottles" inputMode="numeric" value={full} onChange={e => setFull(e.target.value)} disabled={disabled} /><Button type="button" variant="ghost" aria-label={t("Eine volle Flasche mehr")} disabled={disabled} onClick={() => setFull(String(Math.min(10000, Math.floor(parseQuantity(full) || 0) + 1)))}><Plus /></Button></div></div>
      <div className="open-heading"><label>{t("Angebrochene Flaschen")}</label><Select value={unit} onValueChange={changeUnit} disabled={disabled}><SelectTrigger aria-label={t("Einheit der Restmengen")}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ml">ml</SelectItem><SelectItem value="cl">cl</SelectItem><SelectItem value="l">{t("Liter")}</SelectItem></SelectContent></Select></div>
      <div className="open-bottles">{open.map((value, index) => <div key={index} className="open-bottle"><Quantity label={t('Rest in Flasche {index}', { index: index + 1 })} value={value} onChange={s => setOpen(open.map((v, n) => n === index ? s : v))} unit={unit} disabled={disabled} />{open.length > 1 && <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={t('Restflasche {index} entfernen', { index: index + 1 })} onClick={() => setOpen(open.filter((_, n) => index !== n))}><X /></Button>}</div>)}</div>
      </div><div className="bottle-gauges">{candidate.openMl.map((ml, index) => <BottleLevel key={index} volume={ml} capacity={candidate.bottleMl} index={index + 1} />)}</div></div>
      <Button type="button" variant="ghost" className="add-open" disabled={disabled || open.length >= 50} onClick={() => setOpen([...open, '0'])}><Plus />{t("Weitere angebrochene Flasche")}</Button>
      <label className="checkbox-row"><Checkbox checked={estimated} disabled={disabled} onCheckedChange={v => setEstimated(v === true)} /><span>{t("Restmengen sind geschätzt")}</span></label>
      <div className="live-volume" aria-live="polite"><span>{example ? t('BEISPIELBESTAND') : t('PRE-BATCH GESAMT')}</span><strong>{valid ? <AnimatedNumber value={volume} /> : '—'} <small>ml</small></strong><p>{valid ? t('{volume} Liter abgefüllte Mischung', { volume: format(volume / 1000, 3) }) : t('Bitte die Mengen prüfen.')}</p><div className="composition-bar" role="img" aria-label={t('Rezeptanteil')}>{recipe.lines.map((line, index) => <span key={line.ingredientId} title={`${ingredientName(state.ingredients.find(i => i.id === line.ingredientId))}: ${format(line.ml / recipeVolume(recipe) * 100)} %`} style={{ width: `${line.ml / recipeVolume(recipe) * 100}%`, '--segment': index } as React.CSSProperties} />)}</div></div>
      {valid && volume > 0 && contribution && <p className="live-contribution"><Wine size={16} /><span>{ingredientName(ingredient)}: <strong>{contribution.bottles === null ? `${format(contribution.totalCl)} cl ${t('im Batch')}` : t('{bottles} Fl. + {rest} cl', { bottles: contribution.bottles, rest: format(contribution.remainderCl!) })}</strong></span></p>}
      {formError && <p className="field-error" role="alert">{t(formError)}</p>}
      <Button className="primary-button" type="submit" disabled={disabled || !valid}><Check />{existing ? t("Bestand aktualisieren") : t("Bestand speichern")}</Button>
      {(recipe.id === 'bar-paloma' || recipe.id === 'paloma') && !existing && <button className="example-button" type="button" disabled={disabled} onClick={() => { setFull('4'); setBottle('700'); setUnit('ml'); setOpen(['250']); setEstimated(true); setExample(true); }}>{t("Beispiel ausprobieren: 4 Flaschen + 250 ml")}</button>}
    </form>
  </div>;
}

function RecipeEditor({ recipe, state, disabled, save, onDone }: { recipe: Recipe; state: InventoryState; disabled: boolean; save: Save; onDone: () => void }) {
  const { t, ingredientName, recipeNote, language } = useI18n();
  const [name, setName] = useState(recipe.name);
  const [bottle, setBottle] = useState(String(recipe.bottleMl));
  const [demo, setDemo] = useState(recipe.demo);
  const [note, setNote] = useState(recipeNote(recipe));
  const [noteEdited, setNoteEdited] = useState(false);
  useEffect(() => { if (!noteEdited) setNote(recipeNote(recipe)); }, [language, noteEdited, recipe, recipeNote]);
  const [products, setProducts] = useState(state.ingredients);
  const [photoId, setPhotoId] = useState(recipe.photoId);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [newProduct, setNewProduct] = useState<{ index: number; draft: ProductDraft } | null>(null);
  const [lines, setLines] = useState(recipe.lines.map(l => ({ ...l, value: formatInputQuantity(l.ml, language) })));
  useEffect(() => { setLines(values => values.map(l => ({ ...l, value: l.value.trim() && Number.isFinite(parseQuantity(l.value)) ? formatInputQuantity(parseQuantity(l.value), language) : l.value }))); }, [language]);
  const [error, setError] = useState('');
  const saveRecipe = async () => {
    if (photoBusy) return;
    if (newProduct) { setError('Bitte das neue Produkt zuerst übernehmen oder abbrechen.'); return; }
    const counts = { ...state.counts };
    const updated: Recipe = { ...recipe, photoId, name: name.trim(), bottleMl: parseQuantity(bottle), demo, note: noteEdited ? note : recipe.note, lines: lines.map(l => ({ ingredientId: l.ingredientId, ml: parseQuantity(l.value) })), subtitle: lines.map(l => products.find(i => i.id === l.ingredientId)?.name).filter(Boolean).join(' · ').slice(0, 200) };
    if (name.trim().length < 1 || !Number.isInteger(updated.bottleMl) || updated.bottleMl < 1 || updated.bottleMl > 100000 || updated.lines.some(l => !Number.isFinite(l.ml) || l.ml <= 0) || new Set(lines.map(l => l.ingredientId)).size !== lines.length) { setError('Name, positive Mengen und eine gültige Flaschengröße angeben. Jede Zutat nur einmal verwenden.'); return; }
    const recount = recipeNeedsRecount(recipe, updated);
    if (recount) delete counts[recipe.id];
    const recipes = state.recipes.some(r => r.id === recipe.id) ? state.recipes.map(r => r.id === recipe.id ? updated : r) : [...state.recipes, updated];
    const ingredients = products.filter(p => state.ingredients.some(i => i.id === p.id) || lines.some(l => l.ingredientId === p.id));
    if (await save({ ...state, recipes, counts, ingredients })) { toast.success(recount && state.counts[recipe.id] ? t("Rezept gespeichert. Bestand bitte neu erfassen.") : t("Rezept gespeichert.")); onDone(); }
  };
  const addProduct = () => {
    if (!newProduct) return;
    const product = productFromDraft(newProduct.draft, freshId());
    if (!product) { setError('Bitte Produktname, Flaschengröße und Infusionsfaktor prüfen.'); return; }
    if (products.some(p => p.name.trim().toLocaleLowerCase() === product.name.toLocaleLowerCase())) { setError('Dieses Produkt ist bereits vorhanden. Bitte aus der Liste auswählen.'); return; }
    setProducts([...products, product]);
    setLines(lines.map((line, index) => index === newProduct.index ? { ...line, ingredientId: product.id } : line));
    setNewProduct(null); setError('');
  };
  return <form className="recipe-form" onSubmit={e => { e.preventDefault(); void saveRecipe(); }}>
    <label className="field"><span>{t("Name des Pre-Batches")}</span><Input value={name} onChange={e => setName(e.target.value)} maxLength={100} disabled={disabled} /></label>
    <RecipePhoto recipe={recipe} value={photoId} onChange={setPhotoId} disabled={disabled} onBusyChange={setPhotoBusy} />
    <Quantity label={t("Größe der Batch-Flasche")} value={bottle} onChange={setBottle} disabled={disabled} />
    <div className="editor-line-heading"><strong>{t("Zutaten pro Rezeptmenge")}</strong><span>ml</span></div>
    <p className="muted-help">{t('Nur die roten Batch-Zutaten eintragen. Über „Eigenes Produkt“ kannst du die genaue Marke direkt hier eingeben.')}</p>
    {lines.map((line, index) => <div className="recipe-edit-line" key={index}>
      <Select value={line.ingredientId} onValueChange={id => {
        if (id === '__new__') { const previous = products.find(p => p.id === line.ingredientId)!; setNewProduct({ index, draft: { ...productDraft(previous, language), name: '', bottle: '' } }); setError(''); }
        else setLines(lines.map((l, n) => n === index ? { ...l, ingredientId: id } : l));
      }} disabled={disabled || Boolean(newProduct)}><SelectTrigger aria-label={t('Zutat {index}', { index: index + 1 })}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__new__">{t('＋ Eigenes Produkt / Marke eingeben')}</SelectItem>{products.map(i => <SelectItem value={i.id} key={i.id}>{ingredientName(i)}</SelectItem>)}</SelectContent></Select>
      <Input aria-label={t('Menge Zutat {index} in ml', { index: index + 1 })} inputMode="decimal" value={line.value} onChange={e => setLines(lines.map((l, n) => n === index ? { ...l, value: e.target.value } : l))} disabled={disabled} />
      <Button type="button" variant="ghost" size="icon" aria-label={t('Zutat {index} entfernen', { index: index + 1 })} disabled={disabled || lines.length === 1 || Boolean(newProduct)} onClick={() => setLines(lines.filter((_, n) => n !== index))}><X /></Button>
    </div>)}
    {newProduct && <section className="inline-product"><h3>{t('Eigenes Produkt für Zutat {index}', { index: newProduct.index + 1 })}</h3><ProductFields draft={newProduct.draft} setDraft={draft => setNewProduct({ ...newProduct, draft })} disabled={disabled} /><div className="inline-product-actions"><Button type="button" onClick={addProduct} disabled={disabled}>{t('Produkt übernehmen')}<Check /></Button><Button type="button" variant="ghost" disabled={disabled} onClick={() => { setNewProduct(null); setError(''); }}>{t('Abbrechen')}</Button></div><p className="muted-help">{t('Wird zusammen mit dem Rezept gespeichert. Andere Marken bleiben getrennt.')}</p></section>}
    <Button type="button" variant="outline" disabled={disabled || Boolean(newProduct) || lines.length >= Math.min(products.length, 50)} onClick={() => { const next = products.find(i => !lines.some(l => l.ingredientId === i.id)); if (next) setLines([...lines, { ingredientId: next.id, ml: 10, value: '10' }]); }}><Plus />{t("Zutat hinzufügen")}</Button>
    <label className="field"><span>{t("Hinweis zum Rezept")}</span><textarea value={note} maxLength={1500} onChange={e => { setNote(e.target.value); setNoteEdited(true); }} disabled={disabled} /></label>
    <label className="checkbox-row"><Checkbox checked={demo} onCheckedChange={v => setDemo(v === true)} disabled={disabled} /><span>{t("Als Demo-Rezept kennzeichnen")}</span></label>
    {recipe.source && <a className="source-link" href={recipe.source} target="_blank" rel="noreferrer">{t("Rezept-Inspiration bei der IBA ↗")}</a>}
    {state.counts[recipe.id] && <p className="scope-notice">{t("Änderst du Zutaten, Mengen oder Batch-Flaschengröße, wird dieser Bestand geleert. Ein neues Foto, Name oder Hinweis erhält die Zählung.")}</p>}
    {error && <p role="alert" className="field-error">{t(error)}</p>}
    <Button className="primary-button" disabled={disabled || photoBusy || Boolean(newProduct)} type="submit">{t("Rezept speichern")}<Check /></Button>
  </form>;
}

function IngredientEditor({ ingredient, state, disabled, save, onDone }: { ingredient: Ingredient; state: InventoryState; disabled: boolean; save: Save; onDone: () => void }) {
  const { t, language } = useI18n();
  const [draft, setDraft] = useState(() => productDraft(ingredient, language));
  const [error, setError] = useState('');
  return <form className="recipe-form" onSubmit={async e => {
    e.preventDefault();
    const updated = productFromDraft(draft, ingredient.id);
    if (!updated) { setError('Bitte Produktname, Flaschengröße und Infusionsfaktor prüfen.'); return; }
    if (state.ingredients.some(p => p.id !== ingredient.id && p.name.trim().toLocaleLowerCase() === updated.name.toLocaleLowerCase())) { setError('Dieses Produkt ist bereits vorhanden. Bitte aus der Liste auswählen.'); return; }
    const ingredients = state.ingredients.some(i => i.id === ingredient.id) ? state.ingredients.map(i => i.id === ingredient.id ? updated : i) : [...state.ingredients, updated];
    if (await save({ ...state, ingredients })) { toast.success(t('Zutat gespeichert.')); onDone(); }
  }}><ProductFields draft={draft} setDraft={setDraft} disabled={disabled} />
    <p className="muted-help">{t('Gilt für alle Rezepte mit dieser Zutat. Eine andere Marke als neue Zutat anlegen. Beispiel: 0,7 l = 700 ml.')}</p>
    {error && <p className="field-error" role="alert">{t(error)}</p>}
    <Button type="submit" className="primary-button" disabled={disabled}>{t('Zutat speichern')}<Check /></Button>
  </form>;
}

function LocalizedDialogContent({ children, ...props }: React.ComponentProps<typeof DialogContent>) {
  const { t } = useI18n();
  return <DialogContent {...props} showCloseButton={false}><DialogClose asChild><Button className="localized-close" variant="ghost" size="icon" aria-label={t('Schließen')}><X /></Button></DialogClose>{children}</DialogContent>;
}
