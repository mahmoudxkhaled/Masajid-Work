# May 2026 Timesheet

Generated from Git history for **May 2026**. **Billable hours** follow the agreed weekly pattern (Sun 5, Mon 2, Tue 2, Wed 2, Thu 5, Fri 7, Sat 7). **One row per calendar day that has at least one commit**; the hour value is the scheduled hours for that weekday (not derived from commit count), so the total reflects **planned capacity on days you actually shipped code**.

Below: (1) invoice-style summary table, (2) **detailed technical log** with commit hashes and what changed, for a clear audit trail.

---

## Summary table

| Date   | Category Code | Project      | Task               | Sub-Task (headline)                                                                      | Hours |
| ------ | ------------- | ------------ | ------------------ | ---------------------------------------------------------------------------------------- | ----- |
| 15-May | Angular       | Masajid Work | Project Setup      | Initial project commit; full codebase bootstrap.                                         | 7     |
| 16-May | Angular       | Masajid Work | Rebranding & Infra | Error codes ERP→DAP; brand palette; style refactor; module cleanup; branding service.    | 7     |
| 21-May | Angular       | Masajid Work | Public Module       | Public landing page with sections; registration pages; Arabic/RTL; GH Pages deployment.  | 5     |
| 22-May | Angular       | Masajid Work | Deployment         | Deployment docs & scripts for GitHub Pages; output dir alignment; CI workflow cleanup.    | 7     |

---

## Detailed technical log (by date, with commits)

### 2026-05-15 — Friday — **7 hours**

**Commits:** `6f704ad`, `8fcea8f`

- **Initial commit (`6f704ad`):** Repository initialised with the full Angular 17 ERP codebase — modules, routing, services, i18n files, layout shell, auth flows, and all existing feature modules carried over from the parent project.
- **Bootstrap (`8fcea8f`):** Baseline working state confirmed; all source, config, and asset files present.

---

### 2026-05-16 — Saturday — **7 hours**

**Commits:** `7041734`, `4586a03`, `15315f0`, `42efda3`, `d91f661`, `dade9bb`

- **Error-code migration (`7041734`):** Renamed **ERP → DAP** error codes across **64 files** — interceptors, services, components, docs, and i18n. Updated app title and logo in `index.html` and top bar. Changed API base URL in `runtime-config.json`. Updated login credentials for the new environment.
- **Brand palette — core (`4586a03`):** Created **`brand-palette.scss`** with CSS variables; applied to top bar, login, sidebar menu, and PrimeNG theme SCSS — **9 files**, 276 insertions.
- **Brand palette — components (`15315f0`):** Extended brand colours to auth screens (forget-password, reset-password, verify-2FA, email-verified, account-status), dashboard, document-control landing pages, preloading styles, and global `styles.scss` — **20 files** touched for colour consistency.
- **Interceptor & navigation (`42efda3`):** Added **request context logging** for business and HTTP errors in the interceptor. Made function/module details **optional** on `AccountStatusModel`. Created **`static-navigation.config.ts`** (233-line static config) so the module-navigation service uses permission-checked static routes instead of dynamic API lookups. Simplified module-logo retrieval in settings service.
- **Module & route cleanup (`d91f661`):** **Removed** the entire **finance-accounting** module (invoices component, routing, module file — ~8 500 lines deleted). Removed **role-permissions** component, **actions** component, ERP functions/modules admin (forms, lists, details, logos, services, models), and related routing. Simplified dashboard logo loading. Updated permission service with streamlined role checks. Cleaned entity-detail and entity-list components.
- **Branding service & terminology (`dade9bb`):** Introduced **`BrandingService`** + **`app-branding.config.ts`** + **`BrandingParamsPipe`** for dynamic product-name injection into i18n strings. Replaced **"Entity"** terminology with **"Facility"** across entity-admin translations. Removed **workflows** component. Enhanced permission-service error handling with translation support. Updated **en/ar** JSON and all three environment files with branding config.

---

### 2026-05-21 — Thursday — **5 hours**

**Commits:** `4f379ff`, `2091fbe`, `444bbf4`, `d3d0c6d`, `7ecbd62`, `6f13e70`

- **Public landing page (`4f379ff`):** Built the **public module** from scratch — 10 section components (header, hero, about, features, how-it-works, stats, services, trust-bar, validation, call-to-action, footer), landing-page shell, data files, models, scroll-reveal directive, and theme-preference service. Added Arabic/RTL support with `dir="rtl"` and **186 new en/ar keys**. Downloaded and stored **9 Masajid Work images** under `src/assets/images/masajid-work/`. Adjusted app routing for the new `/public` module. Refactored translation service for default-language config.
- **Registration pages (`2091fbe`):** Created **5 registration flows** (donor, vendor, facility, charity-centre, register-selection) with full form components, public layout shell, file-upload field component, validators, registration service, and Stitch design references. Refactored all **auth components** for translation-pipe consistency (login, forget-password, reset-password, verify-2FA, email-verified, account-status, logout). Added **~300 new en/ar keys** for registration and auth. Created GitHub Actions deploy workflow. Added **public-register.scss** (473 lines) for form styling.
- **GitHub Pages config (`444bbf4`):** Added a dedicated `github-pages` build configuration in `angular.json` with appropriate output path and base href.
- **Project rename (`d3d0c6d`):** Renamed build target from **`pmat`** to **`Masajid-Work`** in `angular.json`, updating all output paths and build references.
- **Deploy docs (`7ecbd62`):** Updated `deploy.md` with GitHub Actions setup instructions, Jekyll error-resolution steps, and one-time configuration guidance. Added `.nojekyll` and `_config.yml`.
- **Jekyll workflow (`6f13e70`):** Created initial **`jekyll-gh-pages.yml`** GitHub Actions workflow for Pages deployment.

---

### 2026-05-22 — Friday — **7 hours**

**Commits:** `7f56b13`, `6e4cab4`

- **Deploy docs overhaul (`7f56b13`):** Rewrote deployment instructions to recommend **branch-based deployment** for the Angular app. Removed outdated Jekyll workflow file. Clarified GitHub Actions setup, one-time settings, and local build sections.
- **Deploy scripts & alignment (`6e4cab4`):** Changed all output-directory references from `dist/pmat` to `dist/Masajid-Work`. Created **`scripts/deploy-gh-pages.mjs`** for safer Windows-compatible GitHub Pages deployment. Updated GitHub Actions workflow for the new output structure. Added `deploy:gh-pages` npm script. Updated `github.md` with full local deployment instructions. Fixed loading interceptor import path.

---

## Summary

| Metric | Value |
| ------ | ----- |
| **Working days (with commits)** | 4 |
| **Total billable hours (schedule)** | **26** |
| **Commits in period (`git rev-list`)** | **16** |

### How to read this for "reliable hours"

- **Hours** = agreed **day-of-week rate** on days where the repo shows work (see table at top of `timesheet-instructions.md`).
- **Detail** = **grouped commit narrative** above; you can verify any line with `git show <hash>`.
- **Light days:** If a date only has a tiny chore commit but still counts as a "commit day," the **hours stay on the schedule** unless you agree with the client to **move** that capacity to another day.
