'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Wine } from 'lucide-react';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import type { InventoryState, Recipe } from '@/lib/inventory';

const artwork: Record<string, string> = {
  'bar-apple-fig': '/drinks/bar-apple-fig.webp',
  'bar-mandarin-bergamot': '/drinks/bar-mandarin-bergamot.webp',
  'bar-blueberry-spritz': '/drinks/bar-blueberry-spritz.webp',
  'bar-funky-pinacolada': '/drinks/bar-funky-pinacolada.webp',
  'bar-top-lemonade': '/drinks/bar-top-lemonade.webp',
  'bar-paloma': '/drinks/bar-paloma.webp',
  'bar-top-tea': '/drinks/bar-top-tea.webp',

  paloma: '/drinks/paloma.webp',
  'pineapple-coconut': '/drinks/pineapple-coconut.webp',
  'pina-colada': '/drinks/pina-colada.webp',
  'apple-fizz': '/drinks/apple-fizz.webp',
  negroni: '/drinks/negroni.webp',
};

export function DrinkArtwork({ recipe, priority = false }: { recipe: Recipe; priority?: boolean }) {
  const [failedPhoto, setFailedPhoto] = useState<string | undefined>();
  const defaults = ['apple-fig', 'mandarin-bergamot', 'blueberry-spritz', 'funky-pinacolada', 'top-lemonade', 'paloma'];
  const hash = Array.from(recipe.id).reduce((value, char) => ((value * 31 + char.charCodeAt(0)) >>> 0), 0);
  const custom = Boolean(recipe.photoId && failedPhoto !== recipe.photoId);
  const src = custom ? `/api/recipe-images/${recipe.photoId}` : artwork[recipe.id] || artwork[`bar-${recipe.catalogKey}`] || artwork[`bar-${defaults[hash % defaults.length]}`];
  return <img key={src} src={src} alt={custom ? recipe.name : ''} width={600} height={800} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" draggable={false} className={`drink-artwork ${custom ? 'drink-photo' : 'drink-generated'}`} onError={custom ? () => setFailedPhoto(recipe.photoId) : undefined} />;
}

export default function DrinkGallery({ state, selected, onSelect, disabled }: { state: InventoryState; selected: string; onSelect: (id: string) => void; disabled: boolean }) {
  const { t, format } = useI18n();
  const [api, setApi] = useState<CarouselApi>();
  const [reducedMotion, setReducedMotion] = useState(false);
  const choices = useRef<Record<string, HTMLButtonElement | null>>({});
  const selectedIndex = Math.max(0, state.recipes.findIndex(recipe => recipe.id === selected));
  const handler = useRef(onSelect);
  handler.current = onSelect;
  const recipes = useRef(state.recipes);
  recipes.current = state.recipes;
  const blocked = useRef(disabled);
  blocked.current = disabled;
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!api) return;
    const handleSelect = () => {
      if (blocked.current) return;
      const recipe = recipes.current[api.selectedScrollSnap()];
      if (recipe) handler.current(recipe.id);
    };
    api.on('select', handleSelect);
    return () => { api.off('select', handleSelect); };
  }, [api]);
  useEffect(() => {
    if (api && api.selectedScrollSnap() !== selectedIndex) api.scrollTo(selectedIndex);
  }, [api, selectedIndex]);
  const selectIndex = (index: number) => {
    if (disabled) return;
    const next = (index + state.recipes.length) % state.recipes.length;
    onSelect(state.recipes[next].id);
  };
  return <section className="drink-stage" aria-label={t('Deine Pre-Batches')}>
    <div className="stage-heading"><span>{t('Deine Pre-Batches')}</span><span>{format(selectedIndex + 1, 0)} <span className="dim">/ {format(state.recipes.length, 0)}</span></span></div>
    <Carousel className="drink-carousel" opts={{ align: 'center', loop: true, watchDrag: !disabled, watchFocus: false, duration: reducedMotion ? 0 : 25 }} setApi={setApi} aria-label={t('Getränk auswählen')} onKeyDownCapture={event => {
      if (disabled) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const next = (selectedIndex + (event.key === 'ArrowRight' ? 1 : -1) + state.recipes.length) % state.recipes.length;
        selectIndex(next);
        if ((event.target as Element).closest('.drink-choice')) choices.current[state.recipes[next].id]?.focus({ preventScroll: true });
      }
    }}>
      <CarouselContent className="drink-track">{state.recipes.map(recipe => {
        const active = recipe.id === selected;
        const count = state.counts[recipe.id];
        return <CarouselItem key={recipe.id} className={`drink-slide ${active ? 'is-selected' : ''}`} aria-label={recipe.name}>
          <button ref={node => { choices.current[recipe.id] = node; }} className="drink-choice" type="button" onClick={() => onSelect(recipe.id)} disabled={disabled} aria-pressed={active} tabIndex={active ? 0 : -1}>
            <div className="drink-image-wrap"><DrinkArtwork recipe={recipe} priority={active} /></div>
            <strong>{recipe.name}</strong>
            <span className={`drink-count-status ${count ? 'is-counted' : ''}`}>{count ? <><Check size={13} />{t('Erfasst')}</> : t('Noch nicht gezählt')}</span>
          </button>
        </CarouselItem>;
      })}</CarouselContent>
      <Button className="gallery-arrow gallery-prev" variant="outline" size="icon" aria-label={t('Vorheriger Drink')} disabled={disabled || state.recipes.length < 2} onClick={() => selectIndex(selectedIndex - 1)}><ArrowLeft /></Button>
      <Button className="gallery-arrow gallery-next" variant="outline" size="icon" aria-label={t('Nächster Drink')} disabled={disabled || state.recipes.length < 2} onClick={() => selectIndex(selectedIndex + 1)}><ArrowRight /></Button>
    </Carousel>
    <div className="drink-dots" aria-label={t('Getränk auswählen')}>{state.recipes.map(recipe => <button key={recipe.id} type="button" aria-label={recipe.name} aria-pressed={recipe.id === selected} disabled={disabled} onClick={() => onSelect(recipe.id)}><span className={recipe.id === selected ? 'active' : state.counts[recipe.id] ? 'counted' : ''} /></button>)}</div>
    <div className="stage-note"><Wine size={15} /><span>{t('Serviervorschlag · gezählt wird die abgefüllte Mischung')}</span></div>
  </section>;
}
