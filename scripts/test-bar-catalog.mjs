import assert from 'node:assert/strict';
import { catalog, seedState, legacySeedState, upgradeCatalog, countVolume, summarize, ingredientAmounts, recipeVolume } from '../lib/inventory.ts';
import { stateSchema } from '../lib/validation.ts';

const count = (full, openMl = [], bottleMl = 700) => ({ full, openMl, bottleMl, estimated: false, updatedAt: '2026-09-15T10:00:00.000Z' });
const close = (actual, expected) => assert(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);
// Independently transcribed expected amounts from the photographed red Batch lines.
// First vector is for a 700 ml bottle; second for 4 × 700 ml + 250 ml.
const expected = [
  ['bar-apple-fig', 40, ['bar-jack-apple', 'bar-plum', 'bar-drambui'], [437.5, 175, 87.5], [1906.25, 762.5, 381.25]],
  ['bar-mandarin-bergamot', 40, ['bar-bacardi-8', 'bar-tio-pepe', 'bar-bols-banana'], [350, 175, 175], [1525, 762.5, 762.5]],
  ['bar-blueberry-spritz', 50, ['bar-vodka-spirulina', 'bar-blueberry', 'bar-sugar'], [140, 420, 140], [610, 1830, 610]],
  ['bar-funky-pinacolada', 40, ['bar-coconut-ube', 'bar-xante', 'bar-bacardi-rum'], [350, 175, 175], [1525, 762.5, 762.5]],
  ['bar-top-lemonade', 40, ['bar-gin-butterfly', 'bar-elderflower'], [437.5, 262.5], [1906.25, 1143.75]],
  ['bar-paloma', 40, ['bar-tequila-chili', 'bar-mezcal'], [525, 175], [2287.5, 762.5]],
  ['bar-top-tea', 60, ['bar-hendricks-cabaret', 'bar-peach', 'bar-cane-syrup'], [350, 350 / 3, 700 / 3], [1525, 1525 / 3, 3050 / 3]],
];
assert.equal(catalog.recipes.length, 7);
assert.equal(seedState().ingredients.length, 19);
assert(stateSchema.safeParse(seedState()).success);
assert(seedState().ingredients.every(i => i.bottleMl === null), 'No guessed original bottle sizes');
for (const [id, portion, ids, one, five] of expected) {
  const recipe = seedState().recipes.find(r => r.id === id);
  assert.equal(recipeVolume(recipe), portion);
  assert.deepEqual(recipe.lines.map(line => line.ingredientId), ids);
  for (const [c, amounts] of [[count(1), one], [count(4, [250]), five]]) {
    const state = seedState(); state.counts[id] = c;
    const results = summarize(state);
    assert.equal(results.length, ids.length);
    ids.forEach((ingredientId, index) => close(results.find(i => i.id === ingredientId).totalMl, amounts[index]));
    close(results.reduce((sum, row) => sum + row.totalMl, 0), countVolume(c));
    assert(results.every(i => !i.demo && !i.estimated && i.bottles === null && i.remainderCl === null));
  }
}
const paloma = seedState(); paloma.counts['bar-paloma'] = count(4, [250]);
let tequila = summarize(paloma).find(i => i.id === 'bar-tequila-chili');
assert.equal(tequila.totalCl, 228.75);
assert.equal(tequila.stockCl, null, 'Prepared infusion is not silently equated to raw spirit');
let ingredient = paloma.ingredients.find(i => i.id === tequila.id);
ingredient.bottleMl = 700;
assert.equal(summarize(paloma).find(i => i.id === tequila.id).bottles, null, 'Bottle size alone does not confirm an infusion factor');
ingredient.stockFactor = 1;
tequila = summarize(paloma).find(i => i.id === tequila.id);
assert.deepEqual([tequila.stockCl, tequila.bottles, tequila.remainderCl], [228.75, 3, 18.75]);
ingredient.stockFactor = 1.1;
close(summarize(paloma).find(i => i.id === tequila.id).stockMl, 2516.25);
assert.deepEqual(ingredientAmounts(762.5, { ...ingredient, stockFactor: 1, bottleMl: 1000 }), { totalCl: 76.25, stockMl: 762.5, stockCl: 76.25, bottles: 0, remainderCl: 76.25 });
// A filter may hide syrup but never remove it from the denominator.
const tea = seedState(); tea.counts['bar-top-tea'] = count(0, [60]);
assert.equal(summarize(tea).filter(i => i.spirit).reduce((sum, i) => sum + i.totalMl, 0), 40);
assert.equal(summarize(tea).find(i => i.id === 'bar-cane-syrup').totalMl, 20);
assert.equal(catalog.recipes.find(r => r.id === 'bar-blueberry-spritz').servingTotalMl, null);
assert.notEqual('bar-sugar', 'bar-cane-syrup');
// Service amounts and garnish changes cannot affect inventory.
const reference = catalog.recipes.find(r => r.id === 'bar-paloma');
const before = summarize(paloma);
const serviceMl = reference.servingAdditions[0].ml;
reference.servingAdditions[0].ml = 9999;
assert.deepEqual(summarize(paloma), before);
reference.servingAdditions[0].ml = serviceMl;
// One product aggregates across recipes; a different named brand keeps its own ID.
const brands = seedState();
const apple = brands.recipes.find(r => r.id === 'bar-apple-fig');
brands.recipes.push({ ...structuredClone(apple), id: 'second-apple', name: 'Second Apple' });
brands.counts['bar-apple-fig'] = count(1); brands.counts['second-apple'] = count(1);
assert.equal(summarize(brands).find(i => i.id === 'bar-jack-apple').totalMl, 875);
brands.ingredients.push({ id: 'another-apple-brand', name: 'Alicias eigene Marke', bottleMl: 750, spirit: true });
brands.recipes.find(r => r.id === 'second-apple').lines[0].ingredientId = 'another-apple-brand';
assert.equal(summarize(brands).find(i => i.id === 'bar-jack-apple').totalMl, 437.5);
assert.equal(summarize(brands).find(i => i.id === 'another-apple-brand').totalMl, 437.5);
// Migration adds real recipes without reinterpreting old counts or overwriting edits.
const old = legacySeedState(); const untouched = structuredClone(old);
const upgraded = upgradeCatalog(stateSchema.parse(old));
assert.deepEqual(old, untouched, 'Migration must not mutate input');
assert.equal(upgraded.recipes.length, 7); assert.equal(upgraded.ingredients.length, 19);
assert.deepEqual(upgradeCatalog(upgraded), upgraded);
old.counts.paloma = count(4, [250]);
old.recipes.find(r => r.id === 'negroni').name = 'My custom Negroni';
old.ingredients.find(i => i.id === 'white-rum').name = 'My rum brand';
const migrated = stateSchema.parse(upgradeCatalog(old));
assert.deepEqual(migrated.counts, old.counts);
assert.deepEqual(migrated.recipes.find(r => r.id === 'paloma'), old.recipes.find(r => r.id === 'paloma'));
assert.equal(migrated.recipes.find(r => r.id === 'negroni').name, 'My custom Negroni');
assert(migrated.recipes.some(r => r.id === 'pineapple-coconut'));
assert.equal(summarize(migrated).find(i => i.id === 'tequila').totalMl, 1525, 'Legacy count keeps its legacy 50% ratio');
assert(!migrated.counts['bar-paloma'], 'New 75% recipe must not inherit old count');
migrated.recipes.find(r => r.id === 'bar-paloma').lines[0].ml = 35;
assert.equal(upgradeCatalog(migrated).recipes.find(r => r.id === 'bar-paloma').lines[0].ml, 35, 'User catalog edits survive subsequent loads');
for (const change of [
 s => { s.ingredients[0].bottleMl = 0; },
 s => { s.ingredients[0].stockFactor = 0; },
 s => { s.ingredients[0].stockFactor = -1; },
 s => { s.ingredients[0].stockFactor = Infinity; },
 s => { s.ingredients[0].stockFactor = 101; },
]) { const invalid = seedState(); change(invalid); assert(!stateSchema.safeParse(invalid).success); }
console.log('PASS: 7 source recipes; 14 independent volume cases; syrup denominator; service exclusion; explicit infusion conversion; brand separation; migration preserves counts and edits; invalid input rejection.');

// Photo/name edits preserve a count; changes to ingredients or quantities require recounting.
const { recipeNeedsRecount } = await import('../lib/inventory.ts');
const source = seedState().recipes[0];
assert(!recipeNeedsRecount(source, { ...source, photoId: 'e31f24bb-23e8-4f33-a167-c343a19f6585', name: 'New name', note: 'Updated note' }));
assert(!recipeNeedsRecount(source, { ...source, lines: [...source.lines].reverse() }));
assert(recipeNeedsRecount(source, { ...source, lines: source.lines.map((line, i) => i === 0 ? { ...line, ml: line.ml + 1 } : line) }));
const withPhoto = seedState(); withPhoto.recipes[0].photoId = 'e31f24bb-23e8-4f33-a167-c343a19f6585';
assert.equal(stateSchema.parse(withPhoto).recipes[0].photoId, withPhoto.recipes[0].photoId);
withPhoto.recipes[0].photoId = 'https://untrusted.example/photo.svg';
assert(!stateSchema.safeParse(withPhoto).success);
console.log('PASS: photo references persist, external image URLs rejected, cosmetic edits preserve counts.');
