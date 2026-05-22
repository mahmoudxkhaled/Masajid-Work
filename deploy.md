# GitHub Pages

**Live URL:** https://mahmoudxkhaled.github.io/Masajid-Work/

## Deploy from a branch (recommended for this repo)

This project is an **Angular** app. You must **not** publish the `main` branch root — GitHub will run **Jekyll** on `CLAUDE.md` and fail.

### One-time GitHub settings

1. Open **https://github.com/mahmoudxkhaled/Masajid-Work/settings/pages**
2. **Build and deployment** → **Source** → **Deploy from a branch**
3. **Branch** → **`gh-pages`** → **`/ (root)`** → **Save**

### How it works

- Push to **`main`** runs **`.github/workflows/deploy-gh-pages-branch.yml`**
- That workflow builds Angular and pushes static files to the **`gh-pages`** branch (with `.nojekyll` and `404.html` for SPA routing)
- Pages serves **`gh-pages`** at the URL above

After the first successful run, confirm branch **`gh-pages`** exists under **Branches** on GitHub.

### Local build (same as CI)

```bash
npm run build:gh-pages
```

Output: `dist/Masajid-Work` with `baseHref` `/Masajid-Work/`.

### Manual deploy to `gh-pages` (optional)

Use the project script (pushes **only** `dist/Masajid-Work`, safe on Windows):

```bash
npm run deploy:gh-pages
```

Do **not** use `angular-cli-ghpages` on this repo from Windows — it clones the full tree under `node_modules/.cache/gh-pages/` and often fails with **Filename too long**.

Wrong folder (will fail or deploy empty):

```bash
npx angular-cli-ghpages --dir=dist/pmat   # incorrect — use dist/Masajid-Work
```

If you see `Could not resolve host: github.com`, fix DNS/network/VPN — the build is fine; only the git push failed.

---

## Alternative: GitHub Actions artifact (not “Deploy from a branch”)

Use **`.github/workflows/deploy-github-pages.yml`** only if **Source** is **GitHub Actions** (not branch `gh-pages`). Do not enable both branch deploy and that workflow at the same time.

---

## Repo status (branch deploy)

| Check | Status |
|--------|--------|
| `github-pages` build config in `angular.json` | Yes (`baseHref: /Masajid-Work/`) |
| `gh-pages` branch on remote | Created after first workflow run |
| Publish `main` root directly | **No** — Jekyll + Liquid errors |
| Publish `gh-pages` with built files + `.nojekyll` | **Yes** |

Removed: **`jekyll-gh-pages.yml`** (Jekyll build of the full repo — not compatible with this Angular project).
