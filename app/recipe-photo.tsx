'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n, errorMessage } from '@/lib/i18n';
import type { Recipe } from '@/lib/inventory';
import { DrinkArtwork } from './drink-gallery';

async function preparePhoto(file: File): Promise<Blob> {
  if (file.size > 30 * 1024 * 1024) throw new Error('Das Bild ist zu groß. Bitte ein kleineres Foto auswählen.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url;
    try { await image.decode(); } catch { throw new Error('Dieses Bildformat kann hier nicht geöffnet werden. Bitte JPG, PNG oder WebP wählen.'); }
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 64000000) throw new Error('Das Bild ist zu groß. Bitte ein kleineres Foto auswählen.');
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Bild konnte nicht vorbereitet werden.');
    ctx.fillStyle = '#101923'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    if (!blob || blob.size > 2 * 1024 * 1024) throw new Error('Das Bild ist zu groß. Bitte ein kleineres Foto auswählen.');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}

export default function RecipePhoto({ recipe, value, onChange, disabled, onBusyChange }: { recipe: Recipe; value?: string; onChange: (value?: string) => void; disabled: boolean; onBusyChange: (busy: boolean) => void }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const files = useRef<HTMLInputElement>(null), camera = useRef<HTMLInputElement>(null), controller = useRef<AbortController | null>(null);
  useEffect(() => () => { controller.current?.abort(); }, []);
  const upload = async (file?: File) => {
    if (!file || busy) return;
    const operation = new AbortController(); controller.current = operation;
    setBusy(true); onBusyChange(true); setError('');
    const timeout = window.setTimeout(() => operation.abort(), 45000);
    try {
      const body = await preparePhoto(file);
      if (operation.signal.aborted) return;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Bild konnte nicht gespeichert werden. Bitte erneut versuchen.'));
        reader.readAsDataURL(body);
      });
      onChange(dataUrl);
    } catch (e) { setError(errorMessage(e, 'Bild konnte nicht gespeichert werden. Bitte erneut versuchen.')); }
    finally { window.clearTimeout(timeout); setBusy(false); onBusyChange(false); }
  };
  const picked = (input: HTMLInputElement) => { const file = input.files?.[0]; input.value = ''; void upload(file); };
  return <section className="recipe-photo-editor" aria-label={t('Bild für deinen Pre-Batch')}>
    <div className="photo-preview"><DrinkArtwork recipe={{ ...recipe, photoId: value }} /></div>
    <div className="photo-controls"><strong>{t('Bild für deinen Pre-Batch')}</strong><p>{value ? t('Dein Foto · mit Rezept speichern') : t('Ohne Foto: animierter Drink automatisch')}</p>
      <div className="photo-buttons"><Button type="button" variant="outline" onClick={() => files.current?.click()} disabled={disabled || busy}><ImagePlus />{t('Foto auswählen')}</Button><Button type="button" variant="outline" onClick={() => camera.current?.click()} disabled={disabled || busy}><Camera />{t('Kamera')}</Button></div>
      <input ref={files} type="file" accept="image/*" hidden onChange={e => picked(e.currentTarget)} />
      <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={e => picked(e.currentTarget)} />
      {busy && <p className="photo-status" role="status"><Loader2 className="spin" size={15} />{t('Bild wird vorbereitet und gespeichert …')}</p>}
      {value && <Button className="photo-reset" type="button" variant="ghost" onClick={() => { onChange(undefined); setError(''); }} disabled={disabled || busy}><RotateCcw size={14} />{t('Automatisches Bild verwenden')}</Button>}
      {error && <p className="field-error" role="alert">{t(error)}</p>}
    </div>
  </section>;
}
