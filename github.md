# GitHub Pages — quick commands

**URL:** https://mahmoudxkhaled.github.io/Masajid-Work/

## Recommended

Push to `main` — GitHub Actions (`.github/workflows/deploy-gh-pages-branch.yml`) builds and updates the `gh-pages` branch.

**Settings → Pages:** Deploy from a branch → `gh-pages` → `/ (root)`

## Local deploy (Windows-safe)

Build output: **`dist/Masajid-Work`** (see `angular.json` → `outputPath`).

```bash
npm run deploy:gh-pages
```

## Build only

```bash
npm run build:gh-pages
```

Verify after build:

- `dist/Masajid-Work/index.html` contains `<base href="/Masajid-Work/">`
- `dist/Masajid-Work/main.*.js` exists

## Avoid on Windows

`npx angular-cli-ghpages` — clones the full repo and often hits **Filename too long**.
