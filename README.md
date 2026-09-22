# BATCH · Bar-Inventur

Originale BATCH-App im **After Hours Design**. Vorbereitet als statische React/Next-App für GitHub Pages.

## Funktionen

- Sieben echte Bar-Rezepte aus dem bisherigen BATCH-Projekt
- Volle und angebrochene Pre-Batch-Flaschen erfassen
- Mehrere Restflaschen in ml, cl oder Liter
- Zutaten automatisch aggregieren
- Ergebnis als Originalflaschen plus Rest in cl
- Rezepte, Produkte und Flaschengrößen bearbeiten
- Eigene Fotos per Datei, Mediathek oder Kamera
- Deutsch, Englisch und Norwegisch
- Responsive Desktop- und Mobile-Oberfläche

## Aktueller Speicher

Inventur und Fotos werden vorerst lokal im Browser gespeichert. Das macht die App sofort auf GitHub Pages nutzbar. Daten sind noch nicht zwischen Geräten synchronisiert.

Firebase ist als nächster Schritt dokumentiert: [docs/FIREBASE.md](docs/FIREBASE.md).

## Lokal starten

Voraussetzungen: Node.js 22+, pnpm 11.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Danach `http://localhost:3000` öffnen.

## Prüfen und bauen

```bash
pnpm exec tsc --noEmit
node --experimental-strip-types scripts/test-inventory.mjs
node --experimental-strip-types scripts/test-bar-catalog.mjs
node --experimental-strip-types scripts/test-photos.mjs
pnpm build
```

Der statische Export liegt danach in `out/`.

## GitHub Pages

Workflow liegt unter `.github/workflows/pages.yml`. Nach Push auf `main` wird die App automatisch gebaut und veröffentlicht.

Details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Dokumentation

- [Architektur](docs/ARCHITECTURE.md)
- [GitHub Pages](docs/DEPLOYMENT.md)
- [Firebase-Plan](docs/FIREBASE.md)

## Wichtiger Datenhinweis

Flaschengrößen und Infusionsfaktoren vor echter Inventur prüfen. Unbekannte Werte werden bewusst nicht geraten.

