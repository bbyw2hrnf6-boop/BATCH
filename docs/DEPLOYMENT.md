# GitHub Pages Deployment

## Repository erstellen

```bash
git add .
git commit -m "Initial BATCH app"
git branch -M main
git remote add origin DEINE_REPO_URL
git push -u origin main
```

## Pages aktivieren

1. GitHub Repository öffnen.
2. **Settings → Pages** öffnen.
3. Source auf **GitHub Actions** stellen.
4. Workflow **Deploy GitHub Pages** abwarten.

Der Workflow setzt den Repository-Namen automatisch als Base Path. Deshalb funktionieren Bilder und JavaScript auch unter `username.github.io/repository/`.

## Eigene Domain

Später in **Settings → Pages → Custom domain** eintragen. Danach HTTPS aktivieren.

## Lokaler Produktions-Build

```bash
pnpm build
python3 -m http.server 8080 -d out
```

