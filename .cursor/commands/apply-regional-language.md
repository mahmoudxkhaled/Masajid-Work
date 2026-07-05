# apply-regional-language

Fix or implement **bilingual API field display and save** in a component using the project **`regional-language`** helpers. Use when you see manual `isArabicUi()`, `isRegional`, or `lang === 'ar' ? *_Regional : *` branching on `Name`, `Title`, `Description`, `Address`, etc.

---

## Authoritative sources (read and follow)

1. **Rule:** `.cursor/rules/regional-language.mdc`
2. **Remapping on language change:** `.cursor/rules/regional-data-remapping.mdc` + `.cursor/commands/apply-regional-data-remapping.md`
3. **Helpers:** `src/app/core/utils/regional-language.util.ts` via `LocalStorageService`:
   - `pickLocalizedField(defaultField, regionalField)`
   - `pickRequestContentField(defaultField, regionalField)`
   - `isRegionalApiInput()`
4. **Reference components (recent):**
   - User content: `shared-entities-list`, `shared-entity-form`, `shared-entity-details`, `shared-entity-contact`, `shared-account-details`, `shared-account-list`, `shared-account-update`
   - Reference lookup: role `Title` / `Title_Regional` in account list/update/details

---

## Two field conventions — pick the right helper

| Data type | ERP shape | Arabic UI shows | English UI shows | Display helper |
|-----------|-----------|-----------------|------------------|----------------|
| **Reference / lookup** (status, type, category, **role title**) | `Name` = EN, `Name_Regional` = AR | `Name_Regional` | `Name` | `pickLocalizedField` |
| **User-entered content** (entity name/description, account description, address, donation title) | `Name` = AR (default), `Name_Regional` = EN | `Name` | `Name_Regional` | `pickRequestContentField` |

**Default app language is `ar`.** “Default field” = non-`_Regional` API property. “Regional field” = `*_Regional`.

**Never** use `isArabicUi()` or a component `isRegional` flag to choose display fields. **Never** invert save logic for display.

---

## Save / API write

```ts
const isRegional = this.localStorageService.isRegionalApiInput();
// ar → false (writes default field); en → true (writes *_Regional)
```

Pass `isRegional` to APIs that accept `Is_Regional`. Do **not** bind `Is_Regional` to a manual checkbox unless the feature explicitly requires it.

After a successful update, patch only the field that was saved:

```ts
if (this.localStorageService.isRegionalApiInput()) {
  raw.Name_Regional = value;
} else {
  raw.Name = value;
}
```

---

## Display — list / details / dropdowns

### 1. Store raw API data

```ts
private rawEntities: EntityBackend[] = [];

// after API success:
this.rawEntities = Object.values(entitiesData) as EntityBackend[];
this.mapRawEntities();
```

### 2. Map in one method with helpers (not manual `if`)

**User-entered entity name/description:**

```ts
private mapRawEntities(): void {
  this.entities = this.rawEntities.map((item) => ({
    id: String(item?.Entity_ID || ''),
    name: this.localStorageService.pickRequestContentField(
      String(item?.Name || ''),
      String(item?.Name_Regional || ''),
    ),
    description: this.localStorageService.pickRequestContentField(
      String(item?.Description || ''),
      String(item?.Description_Regional || ''),
    ),
  }));
}
```

**Reference role title:**

```ts
title: this.localStorageService.pickLocalizedField(
  String(item?.Title || ''),
  String(item?.Title_Regional || ''),
),
```

### 3. Remap on language change (no API reload)

```ts
this.subscriptions.push(
  this.languageDirService.userLanguageCode$.subscribe(() => {
    this.mapRawEntities();
    this.mapEntityAndRoleLabels();
  }),
);
```

**Details getters** — prefer helpers over stored `isRegional`:

```ts
getEntityName(): string {
  if (!this.entityDetails) return '';
  return this.localStorageService.pickRequestContentField(
    String(this.entityDetails.Name || ''),
    String(this.entityDetails.Name_Regional || ''),
  );
}
```

---

## Forms (edit / create)

**Load** — patch the field for the **current UI language**:

```ts
this.rawEntityDetails = response?.message ?? {};
this.form.patchValue({
  name: this.localStorageService.pickRequestContentField(
    String(entity?.Name ?? ''),
    String(entity?.Name_Regional ?? ''),
  ),
});
```

**Language change while editing** — re-patch from raw **only if** the user has not modified the field (or dialog just opened). See `shared-entity-form` (`patchEntityFormFromRaw`) and `shared-entity-contact` (re-patch address when dialog open).

**Submit** — send form value + `isRegionalApiInput()`; update the correct raw/local field on success.

---

## Find and fix anti-patterns

Search the target component for:

```text
isArabicUi()
isRegional
Name_Regional || Name
Description_Regional
pickLocalizedField(   // wrong for entity/account user content
Language !== 'English'
```

Replace with:

| Anti-pattern | Fix |
|--------------|-----|
| `isRegional = isArabicUi()` | Remove; use helpers at map/getter time |
| `isRegional ? Name_Regional : Name` on **entity/account content** | `pickRequestContentField(Name, Name_Regional)` |
| `isRegional ? Title_Regional : Title` on **role/status lookup** | `pickLocalizedField(Title, Title_Regional)` |
| `pickLocalizedField` on entity `Name` / `Description` | `pickRequestContentField` |
| Hardcoded AR/EN placeholder strings | `translationService.getInstant('…')` or translate pipe |
| Save sets both `Name` and `Name_Regional` to same value | Update only the field for `isRegionalApiInput()` |

---

## STRICT RULES

- Use **`LocalStorageService` wrappers** only — do not reimplement `lang === 'ar'` in components.
- **Do not** reload the API on language change when raw `*_Regional` fields are already cached.
- **Do not** overwrite unsaved form input on language change unless the task explicitly allows it.
- **Do not** add shared regional mapping services or new util files unless the owner asks.
- Add **`console.log`** for list/details API responses only when adding or changing those subscribe handlers (per **`angular-project`**).

---

## Checklist

- [ ] Field convention identified per property (reference vs user content).
- [ ] Display uses `pickLocalizedField` **or** `pickRequestContentField` — not manual branching.
- [ ] Save uses `isRegionalApiInput()` where API accepts `Is_Regional`.
- [ ] Raw API objects kept; labels rebuilt on `userLanguageCode$`.
- [ ] Removed stale `isRegional` / `isArabicUi()` display flags.
- [ ] Post-save raw/local cache updates the correct field only.
- [ ] Forms load and (where safe) re-patch from raw on language change.
- [ ] Build passes.

---

## Related rules / commands

- **`regional-language`** (`.cursor/rules/regional-language.mdc`)
- **`regional-data-remapping`** (rule + `apply-regional-data-remapping.md`)
- **`i18n-translations`** — user-visible placeholders and toasts
