import catalog from './bar-recipes.json' with { type: 'json' };
export { catalog };
export type Ingredient = { id: string; name: string; bottleMl: number | null; spirit: boolean; stockFactor?: number | null; preparation?: string | null };
export type Recipe = { id: string; name: string; subtitle: string; demo: boolean; bottleMl: number; color: string; note: string; source?: string; catalogKey?: string; photoId?: string; lines: { ingredientId: string; ml: number }[] };
export type Count = { bottleMl: number; full: number; openMl: number[]; estimated: boolean; updatedAt: string };
export type InventoryState = { schemaVersion: 1; catalogVersion?: number; ingredients: Ingredient[]; recipes: Recipe[]; counts: Record<string, Count> };

export function legacySeedState(): InventoryState {
  return {
    schemaVersion: 1,
    ingredients: [
      { id: 'tequila', name: 'Tequila', bottleMl: 700, spirit: true },
      { id: 'white-rum', name: 'Weißer Rum', bottleMl: 700, spirit: true },
      { id: 'coconut-liqueur', name: 'Kokoslikör', bottleMl: 700, spirit: true },
      { id: 'vodka', name: 'Vodka', bottleMl: 700, spirit: true },
      { id: 'gin', name: 'Gin', bottleMl: 700, spirit: true },
      { id: 'campari', name: 'Campari', bottleMl: 700, spirit: true },
      { id: 'vermouth', name: 'Roter Wermut', bottleMl: 1000, spirit: true },
      { id: 'grapefruit', name: 'Grapefruitsaft', bottleMl: 1000, spirit: false },
      { id: 'lime', name: 'Limettensaft', bottleMl: 1000, spirit: false },
      { id: 'agave', name: 'Agavensirup', bottleMl: 700, spirit: false },
      { id: 'pineapple', name: 'Ananassaft', bottleMl: 1000, spirit: false },
      { id: 'coconut-cream', name: 'Kokoscreme', bottleMl: 1000, spirit: false },
      { id: 'apple', name: 'Apfelsaft', bottleMl: 1000, spirit: false },
      { id: 'lemon', name: 'Zitronensaft', bottleMl: 1000, spirit: false },
      { id: 'sugar', name: 'Zuckersirup', bottleMl: 700, spirit: false },
    ],
    recipes: [
      { id: 'paloma', name: 'Paloma Chili', subtitle: 'Tequila · Grapefruit · Limette', demo: true, bottleMl: 700, color: '#efb8a4', note: 'Frei gewähltes Demo-Rezept, inspiriert von der Paloma. Chili-Tequila wird ohne Infusionsverlust als Tequila gerechnet. Soda, Eis und Garnitur kommen erst beim Servieren dazu.', source: 'https://iba-world.com/iba-cocktail/paloma/', lines: [{ ingredientId: 'tequila', ml: 50 }, { ingredientId: 'grapefruit', ml: 30 }, { ingredientId: 'lime', ml: 10 }, { ingredientId: 'agave', ml: 10 }] },
      { id: 'pineapple-coconut', name: 'Pineapple Coconut', subtitle: 'Rum · Kokos · Ananas', demo: true, bottleMl: 700, color: '#dfd189', note: 'Frei gewähltes Demo-Rezept. Zutaten und Flaschengrößen vor der echten Inventur ersetzen.', lines: [{ ingredientId: 'white-rum', ml: 40 }, { ingredientId: 'coconut-liqueur', ml: 20 }, { ingredientId: 'pineapple', ml: 40 }] },
      { id: 'pina-colada', name: 'Funky Piña Colada', subtitle: 'Rum · Kokoscreme · Ananas', demo: true, bottleMl: 700, color: '#d6e4c4', note: 'Demo auf Basis des IBA-Verhältnisses für Piña Colada (50:30:50), ohne Eis. Der Name ist ein Platzhalter; das echte Bar-Rezept kann abweichen.', source: 'https://iba-world.com/iba-cocktail/pina-colada/', lines: [{ ingredientId: 'white-rum', ml: 50 }, { ingredientId: 'coconut-cream', ml: 30 }, { ingredientId: 'pineapple', ml: 50 }] },
      { id: 'apple-fizz', name: 'Apple Fizz', subtitle: 'Vodka · Apfel · Zitrone', demo: true, bottleMl: 700, color: '#bbd897', note: 'Frei gewähltes Demo-Rezept. Soda wird erst beim Servieren ergänzt und gehört nicht zur abgefüllten Mischung.', lines: [{ ingredientId: 'vodka', ml: 40 }, { ingredientId: 'apple', ml: 40 }, { ingredientId: 'lemon', ml: 10 }, { ingredientId: 'sugar', ml: 10 }] },
      { id: 'negroni', name: 'Negroni', subtitle: 'Gin · Campari · Wermut', demo: true, bottleMl: 700, color: '#e99d82', note: 'Demo mit dem IBA-Verhältnis 1:1:1. Ohne Eis und vorab zugesetztes Wasser. Originalflaschengrößen sind Beispielwerte.', source: 'https://iba-world.com/iba-cocktail/negroni/', lines: [{ ingredientId: 'gin', ml: 30 }, { ingredientId: 'campari', ml: 30 }, { ingredientId: 'vermouth', ml: 30 }] },
    ],
    counts: {},
  };
}

// Stable catalog IDs keep existing counts tied to their original recipe ratios.
export function seedState(): InventoryState {
  const colors = ['#dbac74', '#ef9b57', '#a594ef', '#cda9f5', '#c8aaff', '#ef958a', '#e0bd79'];
  return {
    schemaVersion: 1, catalogVersion: catalog.catalogVersion,
    ingredients: structuredClone(catalog.products),
    recipes: catalog.recipes.map((recipe, index) => ({
      id: recipe.id, catalogKey: recipe.key, name: recipe.name, demo: false, bottleMl: 700,
      color: colors[index], subtitle: '', note: '', lines: structuredClone(recipe.lines),
    })),
    counts: {},
  };
}

export function upgradeCatalog(state: InventoryState): InventoryState {
  if ((state.catalogVersion ?? 0) >= catalog.catalogVersion) return state;
  const legacy = legacySeedState();
  const next = seedState();
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  // Never replace a counted recipe or a recipe with user edits, including its products.
  const retained = state.recipes.filter(recipe => {
    const original = legacy.recipes.find(r => r.id === recipe.id);
    return !original || Boolean(state.counts[recipe.id]) || !same(recipe, original)
      || recipe.lines.some(line => !same(state.ingredients.find(i => i.id === line.ingredientId), legacy.ingredients.find(i => i.id === line.ingredientId)));
  });
  const recipes = [...next.recipes.filter(r => !retained.some(existing => existing.id === r.id)), ...retained];
  const referenced = new Set(recipes.flatMap(r => r.lines.map(l => l.ingredientId)));
  const ingredients = state.ingredients.filter(ingredient => referenced.has(ingredient.id)
    || !same(ingredient, legacy.ingredients.find(i => i.id === ingredient.id)));
  return { ...state, catalogVersion: catalog.catalogVersion, recipes,
    ingredients: [...ingredients, ...next.ingredients.filter(i => !ingredients.some(existing => existing.id === i.id))] };
}

export function recipeNeedsRecount(previous: Recipe, next: Recipe) {
  return previous.bottleMl !== next.bottleMl || previous.lines.length !== next.lines.length
    || previous.lines.some(line => !next.lines.some(other => other.ingredientId === line.ingredientId && other.ml === line.ml));
}

export function ingredientAmounts(totalMl: number, ingredient: Ingredient) {
  const factor = ingredient.stockFactor === undefined ? 1 : ingredient.stockFactor;
  const stockMl = factor === null ? null : totalMl * factor;
  const split = stockMl !== null && ingredient.bottleMl !== null ? splitBottles(stockMl, ingredient.bottleMl) : null;
  return {
    totalCl: Math.round(totalMl * 10) / 100,
    stockMl, stockCl: stockMl === null ? null : Math.round(stockMl * 10) / 100,
    bottles: split?.bottles ?? null, remainderCl: split?.remainderCl ?? null,
  };
}

export const format = (n: number, digits = 2) => new Intl.NumberFormat('de-DE', { maximumFractionDigits: digits }).format(n);
export function formatInputQuantity(value: number, language: 'de' | 'en' | 'nb') {
  return language === 'en' ? String(value) : String(value).replace('.', ',');
}
export function parseQuantity(value: string): number {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return 0;
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return NaN;
  return Number(normalized);
}
export function countVolume(count?: Count): number {
  return count ? count.full * count.bottleMl + count.openMl.reduce((sum, ml) => sum + ml, 0) : 0;
}
export function recipeVolume(recipe: Recipe): number {
  return recipe.lines.reduce((sum, line) => sum + line.ml, 0);
}
export function splitBottles(totalMl: number, bottleMl: number) {
  if (!Number.isFinite(totalMl) || totalMl < 0 || !Number.isFinite(bottleMl) || bottleMl < 1) throw new Error('Ungültige Menge');
  // Round only for presentation, to 0.01 cl; carry into the next bottle correctly.
  const totalTenths = Math.round(totalMl * 10);
  const bottleTenths = Math.round(bottleMl * 10);
  const bottles = Math.floor(totalTenths / bottleTenths);
  return { bottles, remainderCl: (totalTenths - bottles * bottleTenths) / 100, totalCl: totalTenths / 100 };
}
export function summarize(state: InventoryState) {
  const totals = new Map<string, { totalMl: number; sources: { name: string; ml: number }[]; estimated: boolean; demo: boolean }>();
  for (const recipe of state.recipes) {
    const count = state.counts[recipe.id];
    const volume = countVolume(count);
    const denominator = recipeVolume(recipe);
    if (!volume || !denominator) continue;
    for (const line of recipe.lines) {
      const ml = volume * line.ml / denominator;
      const previous = totals.get(line.ingredientId) || { totalMl: 0, sources: [], estimated: false, demo: false };
      previous.totalMl += ml;
      previous.sources.push({ name: recipe.name, ml });
      previous.estimated ||= Boolean(count.estimated);
      previous.demo ||= recipe.demo;
      totals.set(line.ingredientId, previous);
    }
  }
  return state.ingredients.filter(i => totals.has(i.id)).map(ingredient => {
    const total = totals.get(ingredient.id)!;
    return { ...ingredient, ...total, ...ingredientAmounts(total.totalMl, ingredient) };
  });
}
