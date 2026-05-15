# apply-regional-data-remapping

Apply the project **regional data remapping** pattern so screens update displayed regional/default text immediately when language changes, without a page refresh.

---

## Authoritative source

1. **Rule:** `.cursor/rules/regional-data-remapping.mdc`
2. **Language source:** `src/app/core/services/language-dir.service.ts`
3. **Language preference:** `LocalStorageService.getPreferredLanguageCode()`

---

## Scope (what to edit)

| Area | Action |
| ---- | ------ |
| **Feature `.ts` components** | Keep raw API rows/details unchanged, map displayed models from raw data, and remap on language changes. |
| **Lists / tables / dropdowns** | Store raw arrays and rebuild visible labels (`name`, `title`, `description`, `message`, etc.). |
| **Details dialogs / read-only views** | Store raw details and rebuild displayed model/text on language change. |
| **Edit forms** | Be careful: do **not** overwrite active unsaved inputs while the user is editing. Remap only selectors/read-only labels, or skip input remap unless explicitly requested. |

---

## Find candidates

Search for regional fields and stale language checks:

```text
Language !== 'English'
Name_Regional
Description_Regional
Title_Regional
Message_Regional
Address_Regional
title_Regional
description_Regional
name_Regional
```

Prioritize files that map API data like:

```ts
name: isRegional ? item.Name_Regional : item.Name
```

inside `load...()` / subscribe handlers and then keep only the displayed value.

---

## Required pattern

### 1. Keep raw API data

```ts
private rawEntities: EntityBackend[] = [];
```

Assign raw data after the API succeeds:

```ts
this.rawEntities = Object.values(entitiesData) as EntityBackend[];
this.mapRawEntities();
```

### 2. Map displayed data in one method

```ts
private mapRawEntities(): void {
  const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';

  this.entities = this.rawEntities.map((item) => ({
    id: String(item.Entity_ID || ''),
    name: isRegional ? (item.Name_Regional || item.Name || '') : (item.Name || ''),
    description: isRegional ? (item.Description_Regional || item.Description || '') : (item.Description || '')
  }));
}
```

### 3. Remap on language changes

```ts
this.subscriptions.push(
  this.languageDirService.userLanguageCode$.subscribe(() => {
    this.mapRawEntities();
  })
);
```

Use existing cleanup patterns:

- `subscriptions: Subscription[]` → push and unsubscribe in `ngOnDestroy`.
- `takeUntilDestroyed(this.destroyRef)` → use it where the component already uses `DestroyRef`.

---

## STRICT RULES

- Use `LocalStorageService.getPreferredLanguageCode() === 'ar'`, not one-time `accountSettings.Language !== 'English'`.
- Do not reload the API just because language changed, unless the backend returns only one language version.
- Do not let duplicate request signatures block local remapping; if a same-request guard returns early, call the map method first.
- Do not keep only final displayed text when raw regional fields are available.
- Do not introduce shared regional mapping services/helpers unless the owner explicitly asks.
- Do not remap active edit input values if that can discard unsaved user edits.

---

## Checklist

- [ ] Raw API data is stored unchanged (`raw...` property).
- [ ] Displayed data is rebuilt by a small `mapRaw...()` method.
- [ ] Language changes call the same mapping method.
- [ ] Existing filters/search/table values are refreshed after remapping where needed.
- [ ] Selected labels/details/dialog text update without API reload.
- [ ] Unsaved form inputs are not overwritten.
- [ ] Build passes.

---

## Related rules / commands

- **`regional-data-remapping`** (`.cursor/rules/regional-data-remapping.mdc`)
- **`i18n-translations`** — translation keys and toasts
- **`apply-table-defaults`** — when touched screens are `p-table` list screens
