# Architektur

## Oberfläche

- Next.js 16 / React 19 / TypeScript
- Statischer Export mit `output: 'export'`
- Originales After-Hours-Design in `app/globals.css`
- Drink-Bilder unter `public/drinks/`

## Fachlogik

- Rezepte: `lib/bar-recipes.json`
- Berechnung und Migration: `lib/inventory.ts`
- Validierung: `lib/validation.ts`
- Hauptoberfläche: `app/inventory-app.tsx`

## Speicheradapter

Aktuell: `lib/client-storage.ts` nutzt `localStorage`.

Später: Firebase-Adapter für Firestore, Authentication und Storage. UI und Rechenlogik bleiben gleich; nur Laden, Speichern und Fotoablage werden ersetzt.

## Berechnung

```text
Gesamtvolumen = volle Flaschen × Batch-Flaschengröße + alle Restmengen
Zutat = Gesamtvolumen × Zutatenmenge / gesamte Rezeptmenge
```

Gleiche Produkt-IDs werden über mehrere Batches addiert. Ergebnisse werden erst nach Aggregation gerundet.

