'use client';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useI18n } from '@/lib/i18n';
import { formatInputQuantity, parseQuantity, type Ingredient } from '@/lib/inventory';

export type ProductDraft = { name: string; bottle: string; spirit: boolean; prepared: boolean; factor: string; preparation: string };
export function productDraft(ingredient: Ingredient, language: 'de' | 'en' | 'nb'): ProductDraft {
  return { name: ingredient.name, bottle: ingredient.bottleMl === null ? '' : String(ingredient.bottleMl), spirit: ingredient.spirit,
    prepared: Boolean(ingredient.preparation), factor: ingredient.stockFactor == null ? '' : formatInputQuantity(ingredient.stockFactor, language), preparation: ingredient.preparation || '' };
}
export function productFromDraft(draft: ProductDraft, id: string): Ingredient | null {
  const bottleMl = draft.bottle.trim() ? parseQuantity(draft.bottle) : null;
  const stockFactor = !draft.prepared ? 1 : draft.factor.trim() ? parseQuantity(draft.factor) : null;
  if (!draft.name.trim() || draft.name.trim().length > 100
    || (bottleMl !== null && (!Number.isInteger(bottleMl) || bottleMl <= 0 || bottleMl > 100000))
    || (stockFactor !== null && (!Number.isFinite(stockFactor) || stockFactor <= 0 || stockFactor > 100))) return null;
  return { id, name: draft.name.trim(), bottleMl, spirit: draft.spirit, stockFactor,
    preparation: draft.prepared ? draft.preparation.trim() || 'Eigene Infusion' : null };
}
export default function ProductFields({ draft, setDraft, disabled }: { draft: ProductDraft; setDraft: (draft: ProductDraft) => void; disabled: boolean }) {
  const { t } = useI18n();
  const change = (part: Partial<ProductDraft>) => setDraft({ ...draft, ...part });
  return <div className="product-fields">
    <label className="field"><span>{t('Produktname inklusive Marke')}</span><Input value={draft.name} maxLength={100} onChange={e => change({ name: e.target.value })} disabled={disabled} placeholder={t('z. B. Bareksten Blueberry Liqueur')} /></label>
    <label className="field"><span>{t('Größe der Originalflasche · optional')}</span><span className="quantity-input"><Input inputMode="numeric" value={draft.bottle} onChange={e => change({ bottle: e.target.value })} disabled={disabled} placeholder={t('Vom Flaschenetikett übernehmen')} /><span>ml</span></span></label>
    <p className="muted-help">{t('Ohne Flaschengröße zeigen wir cl. Flaschen und Rest folgen nach der Eingabe. 0,7 l = 700 ml.')}</p>
    <label className="checkbox-row"><Checkbox checked={draft.spirit} onCheckedChange={v => change({ spirit: v === true })} disabled={disabled} /><span>{t('Alkoholische Zutat')}</span></label>
    <label className="checkbox-row"><Checkbox checked={draft.prepared} onCheckedChange={v => change({ prepared: v === true, factor: '' })} disabled={disabled} /><span>{t('Vorbereitete Infusion')}</span></label>
    {draft.prepared && <div className="infusion-setup"><p>{t('Gezählt wird die fertige Infusion. Für den Gegenwert des Originalprodukts braucht BATCH eure Umrechnung.')}</p>
      <label className="field"><span>{t('Originalprodukt je 1 ml fertige Infusion')}</span><span className="quantity-input"><Input inputMode="decimal" value={draft.factor} onChange={e => change({ factor: e.target.value })} disabled={disabled} placeholder={t('Noch nicht bestätigt')} /><span>ml</span></span></label>
      <p className="muted-help">{t('Nur wenn ihr ohne Volumenänderung rechnet: 1 eingeben. Sonst euren bestätigten Faktor verwenden. Leer lassen zeigt ausschließlich die fertige Infusion.')}</p>
    </div>}
  </div>;
}
