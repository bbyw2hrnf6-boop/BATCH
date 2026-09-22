'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import messages from './messages.json';
import { seedState, legacySeedState } from './inventory';
import type { Ingredient, Recipe } from './inventory';

export type Language = 'de' | 'en' | 'nb';
type Parameters = Record<string, string | number>;
const dictionary = messages as Record<string, { en: string; nb: string }>;
const locales: Record<Language, string> = { de: 'de-DE', en: 'en-GB', nb: 'nb-NO' };
const defaults = { ingredients: [...seedState().ingredients, ...legacySeedState().ingredients], recipes: [...seedState().recipes, ...legacySeedState().recipes] };

export function errorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  return Object.prototype.hasOwnProperty.call(dictionary, message) ? message : fallback;
}

export function translate(language: Language, key: string, parameters: Parameters = {}) {
  const template = language === 'de' ? key : dictionary[key]?.[language] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, parameter: string) => String(parameters[parameter] ?? match));
}

function languageHelpers(language: Language) {
  const t = (key: string, parameters?: Parameters) => translate(language, key, parameters);
  const format = (value: number, digits = 2) => new Intl.NumberFormat(locales[language], { maximumFractionDigits: digits }).format(value);
  const ingredientName = (ingredient?: Ingredient) => {
    if (!ingredient) return '';
    const original = defaults.ingredients.find(i => i.id === ingredient.id);
    return original?.name === ingredient.name ? t(ingredient.name) : ingredient.name;
  };
  const recipeNote = (recipe: Recipe) => {
    const original = defaults.recipes.find(r => r.id === recipe.id);
    return original?.note === recipe.note ? t(recipe.note) : recipe.note;
  };
  return { t, format, ingredientName, recipeNote };
}

const I18nContext = createContext({ language: 'de' as Language, languageReady: false, setLanguage: (_: Language) => {}, ...languageHelpers('de') });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageValue] = useState<Language>('de');
  const [languageReady, setLanguageReady] = useState(false);
  useEffect(() => {
    let next: Language = 'de';
    try {
      const saved = localStorage.getItem('batch-display-language');
      if (saved === 'de' || saved === 'en' || saved === 'nb') next = saved;
      else {
        const browser = navigator.languages?.[0]?.toLowerCase() || navigator.language.toLowerCase();
        next = /^(nb|no|nn)/.test(browser) ? 'nb' : browser.startsWith('de') ? 'de' : 'en';
      }
    } catch {}
    setLanguageValue(next);
    setLanguageReady(true);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = `BATCH · ${translate(language, 'Bar-Inventur')}`;
  }, [language]);
  const value = useMemo(() => ({ language, languageReady, ...languageHelpers(language), setLanguage: (next: Language) => {
    setLanguageValue(next);
    try { localStorage.setItem('batch-display-language', next); } catch {}
  } }), [language, languageReady]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
