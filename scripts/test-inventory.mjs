import assert from 'node:assert/strict';
import { legacySeedState as seedState, countVolume, summarize, splitBottles, parseQuantity, formatInputQuantity } from '../lib/inventory.ts';
import { stateSchema } from '../lib/validation.ts';

const count = (full, openMl = [], bottleMl = 700) => ({ full, openMl, bottleMl, estimated: true, updatedAt: new Date().toISOString() });
const state = seedState();
assert(stateSchema.safeParse(state).success);
assert.equal(summarize(state).length, 0);
state.counts.paloma = count(4, [250]);
assert.equal(countVolume(state.counts.paloma), 3050);
let results = summarize(state);
const tequila = results.find(i => i.id === 'tequila');
assert.deepEqual([tequila.totalMl, tequila.bottles, tequila.remainderCl, tequila.totalCl], [1525, 2, 12.5, 152.5]);
assert.equal(results.reduce((sum, i) => sum + i.totalMl, 0), 3050);
assert.equal(results.find(i => i.id === 'grapefruit').totalCl, 91.5);
assert(tequila.estimated && tequila.demo);

// Same product in two distinct mixes must aggregate before rounding.
state.counts['pineapple-coconut'] = count(1);
state.counts['pina-colada'] = count(0, [130]);
results = summarize(state);
assert.equal(results.find(i => i.id === 'white-rum').totalMl, 330);
assert.equal(results.find(i => i.id === 'white-rum').sources.length, 2);
assert.equal(results.find(i => i.id === 'pineapple').totalMl, 330);
// Non-spirit ingredients still belong in the denominator (50/130, not 50/50).
assert.equal(results.find(i => i.id === 'white-rum').sources.find(s => s.name === 'Funky Piña Colada').ml, 50);
assert.equal(countVolume(count(2, [100, 250], 1000)), 2350);
assert.deepEqual(splitBottles(1525, 1000), { bottles: 1, remainderCl: 52.5, totalCl: 152.5 });
assert.deepEqual(splitBottles(699.999, 700), { bottles: 1, remainderCl: 0, totalCl: 70 });
assert.deepEqual(splitBottles(0, 700), { bottles: 0, remainderCl: 0, totalCl: 0 });
assert.equal(parseQuantity('12,5'), 12.5);
assert.equal(parseQuantity('1.25'), 1.25);
for (const language of ['de', 'en', 'nb']) {
  for (const value of [0, 2.5, 12.75, 250, 1000.123]) {
    assert.equal(parseQuantity(formatInputQuantity(value, language)), value, 'Switching display language must preserve numeric values');
  }
}
assert.equal(formatInputQuantity(12.5, 'en'), '12.5');
assert.equal(formatInputQuantity(12.5, 'nb'), '12,5');
assert(Number.isNaN(parseQuantity('-4')));
assert(Number.isNaN(parseQuantity('12foo')));
assert.throws(() => splitBottles(10, 0));

for (const change of [
  s => { s.counts.paloma = count(-1); },
  s => { s.counts.paloma = count(0, [701]); },
  s => { s.counts.paloma = count(1.5); },
  s => { s.recipes[0].lines[0].ml = 0; },
  s => { s.recipes[0].lines[0].ingredientId = 'unknown'; },
  s => { s.recipes[0].lines.push(s.recipes[0].lines[0]); },
  s => { s.ingredients[0].bottleMl = 0; },
  s => { s.ingredients.push(s.ingredients[0]); },
]) {
  const invalid = seedState(); change(invalid);
  assert(!stateSchema.safeParse(invalid).success, 'Invalid inventory must be rejected');
}
console.log('PASS: example conversion, ingredient aggregation, recipe denominator, multiple open bottles, units, rounding and invalid inputs.');
