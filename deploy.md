# GitHub Pages

**Live URL:** https://mahmoudxkhaled.github.io/Masajid-Work/

## One-time setup (required)

1. Open **https://github.com/mahmoudxkhaled/Masajid-Work/settings/pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions** (not “Deploy from a branch”).
3. If you previously used a branch (`main` / `/` or `/docs`), change it to **GitHub Actions** so Jekyll does not build the repo.

Pushes to `main` run `.github/workflows/deploy-github-pages.yml` and publish the Angular app from `dist/pmat`.

## Fix: Jekyll / Liquid error on `CLAUDE.md`

If the deployment log shows **jekyll v3.10.0** and errors on `CLAUDE.md`, Pages is still using **branch + Jekyll**, not the Angular workflow.

- Set **Source** to **GitHub Actions** (steps above).
- Re-run **Deploy to GitHub Pages** under **Actions** (or push to `main`).
- Root `.nojekyll` and `_config.yml` are safety nets only; the Angular site must come from the workflow artifact.

## Local build (same as CI)

```bash
npm run build:gh-pages
```

Output: `dist/pmat` with `baseHref` `/Masajid-Work/`.

## Manual deploy (optional)

```bash
npm run build:gh-pages
cp dist/pmat/index.html dist/pmat/404.html
npx angular-cli-ghpages --dir=dist/pmat --no-silent
```

Requires `angular-cli-ghpages` if you use the manual path.
