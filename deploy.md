# GitHub Pages

**Live URL:** https://mahmoudxkhaled.github.io/Masajid-Work/

## One-time setup (GitHub)

1. Open the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.

Pushes to `main` run `.github/workflows/deploy-github-pages.yml` and publish `dist/pmat`.

## Local build (same as CI)

```bash
npm run build:gh-pages
```

Output: `dist/pmat` with `baseHref` `/Masajid-Work/`.

## Manual deploy (optional)

```bash
npm run build:gh-pages
cp dist/pmat/index.html dist/pmat/404.html
touch dist/pmat/.nojekyll
npx angular-cli-ghpages --dir=dist/pmat --no-silent
```

Requires `angular-cli-ghpages` if you use the manual path.
