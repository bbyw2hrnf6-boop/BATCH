import { z } from 'zod';
const id = z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/);
const amount = z.number().finite().min(0).max(1000000);
const bottle = z.number().int().min(1).max(100000);
export const stateSchema = z.object({
  schemaVersion: z.literal(1),
  catalogVersion: z.number().int().min(0).max(1000).optional(),
  ingredients: z.array(z.object({ id, name: z.string().trim().min(1).max(100), bottleMl: bottle.nullable(), spirit: z.boolean(), stockFactor: z.number().finite().positive().max(100).nullable().optional(), preparation: z.string().max(1500).nullable().optional() })).min(1).max(300),
  recipes: z.array(z.object({ id, name: z.string().trim().min(1).max(100), subtitle: z.string().max(200), demo: z.boolean(), bottleMl: bottle, color: z.string().regex(/^#[a-fA-F0-9]{6}$/), note: z.string().max(1500), catalogKey: id.optional(), photoId: z.string().max(3000000).refine(value => /^data:image\/jpeg;base64,/.test(value) || /^[a-f0-9-]{36}$/.test(value)).optional(), source: z.string().url().refine(url => url.startsWith('https://')).optional(), lines: z.array(z.object({ ingredientId: id, ml: amount.refine(n => n > 0) })).min(1).max(50) })).min(1).max(120),
  counts: z.record(id, z.object({ bottleMl: bottle, full: z.number().int().min(0).max(10000), openMl: z.array(amount).max(50), estimated: z.boolean(), updatedAt: z.string().datetime() })),
}).superRefine((state, ctx) => {
  const ingredients = new Set(state.ingredients.map(i => i.id));
  const recipes = new Set(state.recipes.map(r => r.id));
  if (ingredients.size !== state.ingredients.length || recipes.size !== state.recipes.length) ctx.addIssue({ code: 'custom', message: 'Doppelte ID' });
  for (const recipe of state.recipes) {
    if (recipe.lines.some(l => !ingredients.has(l.ingredientId))) ctx.addIssue({ code: 'custom', message: 'Unbekannte Zutat' });
    if (new Set(recipe.lines.map(l => l.ingredientId)).size !== recipe.lines.length) ctx.addIssue({ code: 'custom', message: 'Eine Zutat steht doppelt im Rezept' });
  }
  for (const [key, count] of Object.entries(state.counts)) {
    if (!recipes.has(key)) ctx.addIssue({ code: 'custom', message: 'Unbekanntes Rezept' });
    if (count.openMl.some(ml => ml > count.bottleMl)) ctx.addIssue({ code: 'custom', message: 'Restmenge größer als Flasche' });
  }
});
export const saveSchema = z.object({ revision: z.number().int().min(0), state: stateSchema });
