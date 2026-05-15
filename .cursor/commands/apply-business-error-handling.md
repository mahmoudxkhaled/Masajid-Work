# apply-business-error-handling

Implement or refactor **business / API failure handling** in feature components using the project **`business-error-handling`** pattern (same idea as **virtual drives**).

---

## Authoritative sources (read and follow)

1. **Rule:** `.cursor/rules/business-error-handling.mdc`
2. **Reference component:** `src/app/modules/system-administration/system-storage-management/virtual-drives-section/virtual-drives-section.component.ts` — `handleBusinessError`, `getListErrorMessage`, `getCreateErrorMessage`, and related private methods

---

## Scope (what to edit)

| Area | Action |
| ---- | ------ |
| **Feature `.ts` (component)** | Add or align `handleBusinessError`, context union type, `switch (context)` → one `get{Operation}ErrorMessage(code)` per branch; per-operation `switch (code)` with `return this.translate.getInstant('…')`; context-specific cleanup (e.g. table loading). |
| **`en.json` / `ar.json`** | Add **every** new message key used in `getInstant` for errors and any related toasts (**both** files, same change). |
| **Do not create** | Shared `*-errors.ts` files, `Record`/`Map`/array code catalogs, or `core/` services whose main job is feature-specific ERP code → message maps. |

---

## STRICT RULES

### 1. Call sites

- On `!response?.success` (or equivalent), call **`this.handleBusinessError('<context>', response)`** then **`return`** — no scattered inline `messageService.add` for each code at the call site.

### 2. `handleBusinessError`

- **`private`**, on the **same** screen component.
- **`const code = String(response?.message || '')`** (or the shape that feature’s API uses — stay consistent in that file).
- **`switch (context)`** delegating to **`this.getListErrorMessage(code)`**-style methods only.
- If detail is non-empty: **`MessageService.add`** with `severity: 'error'`, **`summary: this.translate.getInstant('common.error')`**, **`detail`** = resolved string (already translated via `getInstant` inside getters).
- Run **UI cleanup** here when needed (e.g. `tableLoadingSpinner = false` for list context).

### 3. `get{Operation}ErrorMessage(code): string | null`

- **`private`**, **`switch (code)`**, each case **`return this.translate.getInstant('module.feature.key')`** — **no** hardcoded user-visible strings in the component.
- **`default: return null`** for unknown / silent codes.
- One getter per **operation** that has its own set of codes; do not merge unrelated operations unless messages are truly identical.

### 4. Success / validation toasts

- **`summary` / `detail`** must also use **`getInstant`** + keys in **en** and **ar** (e.g. **`common.success`**, existing validation keys).

### 5. i18n

- Follow **`i18n-translations`**: hierarchical keys, **both** language files, formal Arabic for UI.

---

## Checklist

- [ ] Business failures go through **`handleBusinessError`** + context union.
- [ ] Each operation has its own **`get…ErrorMessage`** with **`switch (code)`** and **`getInstant` only** for message text.
- [ ] Error toast uses **`common.error`** (or equivalent) for summary.
- [ ] No new shared error-registry files, maps, or arrays for codes.
- [ ] **`en.json`** and **`ar.json`** updated together for every key.
- [ ] HTTP errors still rely on interceptors unless the task says otherwise.

---

## Related rules / commands

- **`business-error-handling`** (`.cursor/rules/business-error-handling.mdc`)
- **`i18n-translations`** (rule + `.cursor/commands/i18n-translations.md`)
