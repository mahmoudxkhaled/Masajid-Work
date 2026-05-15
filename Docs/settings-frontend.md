# ERP Frontend — Settings (Summary module)

Single reference for **account / entity / system / default** settings: routing, APIs, state, UI components, merged “custom” behaviour, i18n, and extension points.

**Route:** `/summary/settings` (lazy `SummaryModule` → `SettingsComponent`).

---

## 1. Concepts & layers

Settings are grouped into **five logical layers** (`SettingsLayer` in `src/app/modules/summary/models/settings-engine.model.ts`):

| Layer            | Meaning |
|------------------|---------|
| `system`         | Global ERP system settings (`system_Settings` / `System_Settings` from 763 for runtime refresh; 731 for system tab load). |
| `defaultAccount` | Template defaults for accounts (`Default_Account_Settings`; 763/760). |
| `account`        | Per-account overrides (`Account_Settings`; 763/762/764). |
| `defaultEntity`  | Template defaults for entities (`Default_Entity_Settings`; 783/780). |
| `entity`         | Per-entity overrides (`Entity_Settings`; 783/782/784). |

**Effective value resolution** (first non-null wins) is implemented in `src/app/modules/summary/utils/settings-resolver.ts`:

1. `account[key]`
2. `defaultAccount[key]`
3. `entity[key]`
4. `defaultEntity[key]`
5. `system[key]`

Use `SettingsEngineService.getSetting(key)` for reads from cached state.

---

## 2. HTTP API (`SettingsApiService`)

File: `src/app/modules/summary/services/settings-api.service.ts`.

All calls go through `ApiService.callAPI` with the access token. Set operations pass a **serialized JSON payload** (not a raw object) as the last string parameter where applicable.

### 2.1 Serialization (`serializeSettings`)

- Input: `Record<string, string>`.
- Keys are **sorted alphabetically**.
- Body shape: `JSON.stringify` of an array of single-key objects, e.g. `[{"a":"1"},{"b":"2"}]`.

### 2.2 Request codes

| Code | Method | Params | Purpose |
|------|--------|--------|---------|
| **730** | `setERPSystemSettings` | `[serialized dict]` | Save system settings. |
| **731** | `getERPSystemSettings` | `[]` | Load system settings for the System settings tab only; runtime refresh uses `system_Settings` / `System_Settings` from 763. |
| **732** | `removeERPSystemSetting` | `[settingName]` | Remove one system key. |
| **760** | `setDefaultAccountSettings` | `[serialized dict]` | Save default account template. |
| **761** | `getDefaultAccountSettings` | `[]` | Load default account template. |
| **762** | `setAccountSettings` | `[accountId, serialized dict]` | Save account custom settings. |
| **763** | `getAccountSettings` | `[accountId]` | Load account payload (see §3). |
| **764** | `removeAccountSetting` | `[accountId, settingName]` | Remove one account custom key. |
| **780** | `setDefaultEntitySettings` | `[serialized dict]` | Save default entity template. |
| **781** | `getDefaultEntitySettings` | `[]` | Load default entity template. |
| **782** | `setEntitySettings` | `[entityId, serialized dict]` | Save entity custom settings. |
| **783** | `getEntitySettings` | `[entityId]` | Load entity payload (see §3). |
| **784** | `removeEntitySetting` | `[entityId, settingName]` | Remove one entity custom key. |

### 2.3 Business error codes (`SETTINGS_ERROR_CODES`)

| Code | Constant |
|------|----------|
| `ERP11420` | `EMPTY_KEY` |
| `ERP11421` | `EMPTY_VALUE` |
| `ERP11422` | `NOT_FOUND` |
| `ERP11425` | `INVALID_ACCOUNT_ID` |
| `ERP11426` | `INVALID_ENTITY_ID` |

Handled in `SettingsSectionComponent` via `handleBusinessError` + `settings.messages.errors.*` (see `.cursor/rules/business-error-handling.mdc` pattern).

---

## 3. Account / entity GET response shape

**763** (`getAccountSettings`) and **783** (`getEntitySettings`) return `message` as an object that can include:

| Property | Role |
|----------|------|
| `system_Settings` / `System_Settings` | Global system settings included with account/entity settings. |
| `Default_Account_Settings` / `Default_Entity_Settings` | Inherited defaults for that owner context. |
| `Account_Settings` / `Entity_Settings` | Stored custom overrides only. |

The **account** and **entity** tabs each perform **one GET** per tab load and split:

- `defaultAccountData` / `defaultEntityData` → defaults sections + `inheritedDefaults` for merged custom section.
- `accountCustomData` / `entityCustomData` → `preloadedData` for the merged custom section.

---

## 4. Settings engine & cache

File: `src/app/modules/summary/services/settings-engine.service.ts`.

### 4.1 `loadAllLayers(forceReload?)`

- Runtime network refresh calls **763** account (if `Account_ID`) and **783** entity (if `Entity_ID`) in `forkJoin`.
- It does **not** call **731** because runtime `system_Settings` / `System_Settings` now comes from **763**.
- Each runtime call is role-safe: if **763** or **783** fails, the affected layers fall back to current state or cached state so `refreshRuntimeFromServer()` can still emit.
- Builds `SettingsLayersState`:
  - `system` — from `system_Settings` / `System_Settings` in 763, then fallback.
  - `defaultAccount` — from `Default_Account_Settings` in 763.
  - `account` — from `Account_Settings` in 763.
  - `defaultEntity` — from `Default_Entity_Settings` in 783.
  - `entity` — from `Entity_Settings` in 783.
- Persists to local storage under `SETTINGS_CACHE_KEY` (`erp_settings_layers_cache_v1`).

### 4.2 Layer mutators

- `getLayer`, `replaceLayer`, `removeLayerKeys`, `setLayerValues`.
- All state writes route through private `commitState(nextState)`: `stateSubject.next` + `writeCache` + `applyEffectiveRuntimeToShell`.
- Settings mutations should not use optimistic layer writes when a successful API response immediately calls `refreshRuntimeFromServer()`.

### 4.3 Runtime refresh (`refreshRuntimeFromServer`)

After **any** successful settings mutation from the UI (save/remove/reset override), the app calls **`SettingsEngineService.refreshRuntimeFromServer()`**, which runs **`loadAllLayers(true)`** (763 + 783 only, as applicable) so all five layers match the server/runtime source.

When layers are updated (including the first network load and when a **cached** state is restored), the engine commits through **`commitState()`**, which then runs **`applyEffectiveRuntimeToShell()`** (private):

- Recomputes **`getSetting(key)`** using the resolver order (account → defaultAccount → entity → defaultEntity → system).
- Writes **`language` / `theme`** into `LocalStorageService` preferences, updates **`LanguageDirService`**, **`TranslationService.useLanguage`**, **`LayoutService.applyUserTheme`**, and sets **`document.documentElement.lang` / `dir`**.
- Merges **`Functions_Order`** / **`Modules_Order`** (PascalCase or `functions_order` / `modules_order`) into stored **`Account_Settings`** when the effective value is non-empty.

Consumers should rely on **`state$`** / **`getSetting()`** after mutations rather than stale section-local state. Settings sections still call **`reloadParentTab`** where needed so preloaded panels refetch **763/783**.

**Note:** The settings **screens** in Summary often use **preloaded** props into `SettingsSection`; the engine is the source of truth for **effective** values after `refreshRuntimeFromServer()`.

---

## 5. UI structure

### 5.1 `SettingsComponent`

- Tabs: Account settings, Layout & theme (`app-config`), Entity (role-gated), System (Developer only).
- Permissions: `PermissionService` — entity tab for Developer / SystemAdministrator / EntityAdministrator; system tab for **Developer** only.

### 5.2 Tab hosts

| Tab | Component | Data loading |
|-----|-----------|----------------|
| Account | `AccountSettingsTabComponent` | Single **763**; splits defaults vs custom. |
| Entity | `EntitySettingsTabComponent` | Single **783**; splits defaults vs custom. |
| System | `SystemSettingsTabComponent` | No preload; `SettingsSection` loads **731** (`layer="system"`). |

### 5.3 `SettingsSectionComponent`

File: `src/app/modules/summary/components/settings/settings-section/settings-section.component.ts` (+ `.html`).

**Inputs**

| Input | Purpose |
|-------|---------|
| `layer` | Which API family / engine layer to use. |
| `titleKey` | i18n key for panel header (via `TranslationService.getInstant`). |
| `showRemove` | Enables remove UI path (confirm dialog + API or local logic). |
| `fixedKeys` | If set, keys are fixed (no add-key UI); used for **system** tab. |
| `preloadedData` | Dictionary to hydrate section without calling GET in `ngOnInit`. |
| `inheritedDefaults` | When set **with** `layer === 'account' \| 'entity'`, activates **merged custom view** (§6). |

**Outputs**

| Output | When emitted |
|--------|----------------|
| `reloadParentTab` | After successful save/remove that should refresh tab-level **763/783** data (defaults + custom). |

**Child:** `SharedSettingsPanelComponent` — fields, skeletons, row actions.

### 5.4 `SharedSettingsPanelComponent`

File: `src/app/modules/summary/components/settings/shared-settings-panel/`.

- **OnPush** — parent updates `values` / whitelists / `activeKeys`; `ngOnChanges` calls `markForCheck` when needed.
- **Layout:** Each row is `.setting-item` → `.setting-header` (label + fixed-width `.setting-actions`) → `.setting-control` (full-width control). The action slot is **always reserved** (placeholder when no action) so rows align.

**Inputs**

| Input | Purpose |
|-------|---------|
| `activeKeys` | Keys to render, sorted internally for display. |
| `values` | Current string values. |
| `showRemove` | Master switch for per-row remove affordance. |
| `removeKeyWhitelist` | If **not** `null`, remove (trash) only for keys in this array. If `null`, all rows allow remove (when `showRemove`). |
| `refreshableKeys` | Keys that show **reset** (`pi-refresh`); merged custom view only (parent fills). |
| `loading` | Skeleton vs fields. |

**Outputs**

| Output | Purpose |
|--------|---------|
| `valuesChange` | Emits full `Record<string, string>` on edit. |
| `removeKey` | User confirmed trash on a key (parent opens confirm dialog). |
| `resetKey` | User clicked reset (merged custom rules in parent). |

### 5.5 Language, theme, and other effective preferences (live shell)

Effective **`language`** / **`theme`** (and optional **`Functions_Order`** / **`Modules_Order`**) are applied by **`SettingsEngineService`** after every **`loadAllLayers`** completion (network or cache), via private **`applyEffectiveRuntimeToShell()`** — see **§4.3**. That uses **`getSetting(key)`** (full layer priority), not the form value alone, so removing an account override immediately falls back to entity/default/system.

**Normalization**

| Key | Stored examples | Applied |
|-----|-----------------|---------|
| `language` | `'ar'`, `'Arabic'`, … | `'en'` or `'ar'` |
| `theme` | `'dark'` or other | `'light'` or `'dark'` |

**Side-effect chain**

1. **`LocalStorageService`** — `setPreferredLanguageCode` / `setPreferredTheme` update the **`Account_Settings`** mirror used by `getPreferredLanguageCode` / `getPreferredTheme` (`src/app/core/services/local-storage.service.ts`). Non-empty effective **`Functions_Order`** / **`Modules_Order`** are merged via **`mergeAccountSettings`**.
2. **`LanguageDirService`** — `setUserLanguageCode`, `setRtl` for Arabic.
3. **`TranslationService`** — `useLanguage(...)`.
4. **`LayoutService`** — `applyUserTheme` → **`changeTheme()`** (`src/app/layout/app-services/app.layout.service.ts`).
5. **`document.documentElement`** — `lang` and `dir` attributes updated for accessibility.

Top bar quick toggles still call **`saveAccountPreferences`**; on success they invoke **`refreshRuntimeFromServer()`** so the engine and shell stay aligned with **762** responses.

---

## 6. Merged custom view (account / entity “My … settings”)

Activated when:

- `layer` is `account` or `entity`, **and**
- `inheritedDefaults` is not `null` (parent passes default template dict from the same **763/783** response).

### 6.1 Data held in the section

- `defaultsSnapshot` — inherited defaults.
- `customOverridesSnapshot` — last loaded custom dict from API.
- `keysFromCustomApi` — `Object.keys(customOverridesSnapshot)` at load.
- `keysAddedLocally` — keys added in-session via “Add key” (not yet saved).

**Union keys:** all keys from defaults ∪ custom, sorted.

**Displayed value:** custom value if key exists in custom map; else default.

### 6.2 Save payload (`buildMergedCustomSavePayload`)

For each active key, include in **762/782** payload when:

- Key is in `keysFromCustomApi` or `keysAddedLocally` → always send current value; or
- Key exists in defaults and current value **differs** from default → send override (new or changed default-row edit).

Keys that only inherit default and were **not** edited off default are omitted.

### 6.3 Row actions (`updateRowActions`)

When `showRemove` and merged view:

**Trash (`removeKeyWhitelist` = `panelTrashWhitelist`)**

- Locally added keys (`keysAddedLocally`).
- Custom API keys **without** a matching default key (pure custom keys).

**Reset (`refreshableKeys` = `panelRefreshKeyList`)**

- Keys that have a default entry, are **not** in the trash list, and `currentValue !== defaultValue`.

**`onResetKey`**

- If key is in `keysFromCustomApi` **and** has a default → **764/784** remove (clear stored override), then `reloadParentTab`.
- Else if has default and not locally added → set field to `defaultsSnapshot[key]` (revert before save; no API until user saves).

**`onRemoveClick` / confirm**

- Locally added → drop row locally, update engine custom slice, toast.
- Default template sections (`defaultAccount` / `defaultEntity`) → delete key from dict and **760/780** set whole dict.
- Other removes → `getRemoveApiCall` as per layer.

---

## 7. Known keys & schema

File: `src/app/modules/summary/models/known-settings.schema.ts`.

- `KNOWN_SETTINGS_SCHEMA` defines control **type** (`select` | `number`), **options** (for selects), **defaultValue**, and **labelKey** (i18n).
- Account-related picklists use `getAccountLayerKeys()` (`ACCOUNT_SETTINGS_KEYS`).
- System tab uses `getAllKnownSettingKeys()` (includes `session_validity`, `reset_password_token_validity`).

**Adding a new known key**

1. Extend `KNOWN_SETTINGS_SCHEMA` (+ options / defaults).
2. Add label + option strings under `settings.sharedPanel.keys.*` and `settings.sharedPanel.options.*` in `en.json` / `ar.json`.
3. If the key should appear in account/entity pickers, ensure it is included in `ACCOUNT_SETTINGS_KEYS` or appropriate export.

---

## 8. Add-key dropdown

`src/app/modules/summary/utils/settings-key-utils.ts` — `buildAvailableKeyOptions`:

- Schema keys not yet on the form.
- Plus **unknown** keys still present in `persisted` but not in schema (so re-adding is possible).

---

## 9. i18n (high level)

- Panel chrome: `settings.sharedPanel.*` (add key, placeholders, tooltips, `removeKeyTooltip`, `resetToDefaultTooltip`, etc.).
- Section titles / toasts: `settings.sections.*`, `settings.system.*`, `settings.messages.*`.
- Remove confirm dialog: `settings.sections.common.removeConfirmTitle` / `removeConfirmMessage`.

Follow `.cursor/rules/i18n-translations.mdc`: no hardcoded user-visible strings in TS toasts (use `TranslationService` / keys in en + ar).

---

## 10. Skeleton & loading rules

- **Account / entity tabs:** gate on `*SettingsReady`; skeleton blocks approximate real panels.
- **Shared panel:** loading skeleton mirrors **setting-item** layout (header + reserved action slot + control height). See `.cursor/rules/ui-defaults.mdc`.

---

## 11. File map (quick lookup)

| Area | Path |
|------|------|
| API | `src/app/modules/summary/services/settings-api.service.ts` |
| Engine | `src/app/modules/summary/services/settings-engine.service.ts` |
| Resolver | `src/app/modules/summary/utils/settings-resolver.ts` |
| Schema | `src/app/modules/summary/models/known-settings.schema.ts` |
| Layer types | `src/app/modules/summary/models/settings-engine.model.ts` |
| Add-key util | `src/app/modules/summary/utils/settings-key-utils.ts` |
| Shell / tabs | `src/app/modules/summary/components/settings/settings.component.*` |
| Account tab | `.../account-settings-tab/*` |
| Entity tab | `.../entity-settings-tab/*` |
| System tab | `.../system-settings-tab/*` |
| Section | `.../settings-section/*` |
| Field grid | `.../shared-settings-panel/*` |
| Module declarations | `src/app/modules/summary/summary.module.ts` |
| Route | `src/app/modules/summary/summary-routing.module.ts` (`path: 'settings'`) |

---

## 12. Checklist when you change settings behaviour

1. **API contract:** Does 762/782 payload still match `serializeSettings` and server expectations?
2. **763/783:** If message shape changes, update **tab** loaders + `SettingsEngineService` extractors + `extractLoadDictionary` in `SettingsSection`.
3. **Merged view:** Update `buildMergedCustomSavePayload`, `updateRowActions`, and `onResetKey` together if rules change.
4. **Engine cache:** If new layer or key source, update `loadAllLayers` / `SETTINGS_CACHE_KEY` version if cache invalidation is required.
5. **i18n:** Every new string → `en.json` + `ar.json`.
6. **Permissions:** Tab visibility is in `SettingsComponent`; default sections use `canManageDefault` on account/entity tabs.
7. **Runtime shell:** After new mutation entry points, call **`SettingsEngineService.refreshRuntimeFromServer()`** (or ensure **`loadAllLayers`** runs) so **`applyEffectiveRuntimeToShell`** runs (see §4.3 / §5.5).
8. **Build:** `npm run build` from repo root.

---

## 13. DI note (HTTP interceptors)

`SettingsEngineService` depends on **`SettingsApiService`** → **`HttpClient`** → **`HTTP_INTERCEPTORS`** → **`ErrorHandlingInterceptor`** → **`AuthService`**. Therefore **`AuthService` must not inject `SettingsEngineService` in its constructor** (circular `NG0200`). Resolve the engine lazily with **`Injector.get(SettingsEngineService)`** only after login (see `auth.service.ts`).

---

## 14. Pasting this doc in chat

You can attach **`Docs/settings-frontend.md`** (or paste its contents) when asking for settings work so the assistant aligns with **request codes**, **merged custom rules**, and **file locations** without rediscovering the tree each time.
