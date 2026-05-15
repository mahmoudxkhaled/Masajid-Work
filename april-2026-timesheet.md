# April 2026 Timesheet

Generated from Git history for **April 2026**. **Billable hours** follow the agreed weekly pattern (Sun 5, Mon 2, Tue 2, Wed 2, Thu 5, Fri 7, Sat 7). **One row per calendar day that has at least one commit**; the hour value is the scheduled hours for that weekday (not derived from commit count), so the total reflects **planned capacity on days you actually shipped code**.

Below: (1) invoice-style summary table, (2) **detailed technical log** with commit hashes and what changed, for a clear audit trail.

---

## Summary table

| Date   | Category Code | Project | Task            | Sub-Task (headline)                                                                 | Hours |
| ------ | ------------- | ------- | --------------- | ----------------------------------------------------------------------------------- | ----- |
| 02-Apr | Angular       | ERP     | Data Management | File systems list UX, virtual drives models/table, company storage labels & i18n. | 5     |
| 03-Apr | Angular       | ERP     | Data Management | Removed legacy folder module; company storage + file-system permissions overhaul. | 7     |
| 05-Apr | Angular       | ERP     | Data Management | Folder UI: navigation stack, breadcrumbs, ellipsis, dialogs, i18n.              | 5     |
| 11-Apr | Angular       | ERP     | Entity Module   | Top bar resilience + dashboard logo loading + new localized errors.                 | 7     |
| 12-Apr | Angular       | ERP     | Entity Module   | Sync commit on record; hours = scheduled Sunday capacity (see detailed log).         | 5     |
| 13-Apr | Angular       | ERP     | Profile Module  | Account status accuracy; entity logo/top bar logging refinements.                   | 2     |
| 14-Apr | Angular       | ERP     | Data Management | Transfer progress overlay; chunk upload keys; download token in query.               | 2     |
| 15-Apr | Angular       | ERP     | Entity Module   | Top bar & logo pipeline cleanup, reload-after-logo-change, dead imports removed.    | 2     |
| 16-Apr | Angular       | ERP     | Entity Module   | Deleted legacy entities components module; top bar parent entity + notifications. | 5     |
| 21-Apr | Angular       | ERP     | Profile Module  | Settings engine + local storage refactor for consistent preference handling.      | 2     |
| 22-Apr | Angular       | ERP     | UI/Layout       | Session expiry via interceptor + login banner; removed session-expired dialog.    | 2     |
| 24-Apr | Angular       | ERP     | Entity Module   | Shared entity details route binding & loading; top bar title/logo flow churn.       | 7     |
| 25-Apr | Angular       | ERP     | Entity Module   | Language direction service + reactive regional copy across entity admin UI.         | 7     |
| 26-Apr | Angular       | ERP     | Profile Module  | Profile preferences route; app config/auth/storage; settings save & schema work.  | 5     |

---

## Detailed technical log (by date, with commits)

### 2026-04-02 — Thursday — **5 hours**

**Commits (newest first):** `bd5000e`, `35047a3`, `6790c46`, `649a354`

- **Company storage (`649a354`):** Clearer file-system selection behaviour, placeholder text that reflects loading, more readable access-right labels, tighter license-ID filtering for drive lists, removal of noise comments, and **new en/ar keys** for effective access wording.
- **Virtual drives (`6790c46`):** Simplified `VirtualDrive` / `VirtualDriveFilters`, introduced **`VirtualDriveRow`** for the table layer, improved **PrimeNG table sorting** and responsiveness in the template, and streamlined load/filter logic in the component.
- **File systems section (`35047a3`):** Added **skeleton** states for the main grid and entity filter so the screen does not “pop” empty; refactored header/row markup for consistent spacing; tightened load/filter TypeScript; extended translations for prompts.
- **File systems service + virtual drives UX (`bd5000e`):** Service cleanup; **virtual drives** now uses **translation-backed** success/error toasts (aligned with project i18n rules); added matching keys in **en.json / ar.json**.

---

### 2026-04-03 — Friday — **7 hours**

**Commits:** `3a9e385`, `eaee219`, `a724886`, `240c540`, `c7c8dfb`, `9202152`, `4355114`

- **Architecture / document control (`4355114`):** **Removed** the standalone **folder management module** (component, routing, services, templates) to reduce duplication and simplify storage navigation under document control.
- **Company storage (`9202152`):** Reworked file-system picker flow, **skeleton** loading for first paint, HTML/SCSS structure pass for responsiveness, TypeScript load pipeline cleanup, **en/ar** updates.
- **File-system permissions — data & errors (`240c540`):** Replaced admin-specific permissions service usage with **`FileSystemPermissionsService`**, centralized **business-error** handling with clearer user messaging, deleted obsolete helpers, **en/ar** for new/updated messages.
- **File-system permissions — UX (`a724886`, `eaee219`, `3a9e385`):** Title shows file system name in context; **smooth scroll** to “effective access”; table layout, loading, and **skeleton** rows; **entity column** for related targets; effective-access counts; ellipsis for long cells; caching improvements for accessible entities; ongoing **localization** additions.

---

### 2026-04-05 — Sunday — **5 hours**

**Commits:** `3c88cd2`, `eaa5ba2`, `b1ba74c`, `e9e457f`, `ec1293b`, `5ad3e56`

- **Navigation model (`ec1293b`, `e9e457f`):** **Back stack** for folder browsing, helpers to resolve tree paths and expand nodes, breadcrumb trail building and segment navigation, SCSS/HTML for breadcrumbs including loading behaviour.
- **Long paths (`b1ba74c`, `eaa5ba2`):** **Ellipsis** menu for hidden breadcrumb segments; wider panel for readability; method signature cleanup for opening the ellipsis menu.
- **Dialogs & copy (`3c88cd2`):** Upload / create-folder dialog titles now include **dynamic folder name** context; new resolver methods; **en/ar** keys for new titles.
- **Housekeeping (`5ad3e56`):** Normalized file/folder field access in templates and TS for easier maintenance.

---

### 2026-04-11 — Saturday — **7 hours**

**Commits:** `6183166`

- **Top bar:** Clearer **business-error** paths for notifications and entity-detail fetches (less opaque failures for users).
- **Dashboard:** **Loading indicators** for module logos while data is in flight.
- **i18n:** New success/error strings in **English and Arabic** tied to the above flows.
- **Structure:** General readability pass on dashboard + top bar templates to support the new states.

---

### 2026-04-12 — Sunday — **5 hours**

**Commits:** `8deb85b`

- Chore / sync commit (“up”) only in history for this date — **billable hours still follow the Sunday slot** on the schedule because the day is a committed workday in the repo.

---

### 2026-04-13 — Monday — **2 hours**

**Commits:** `cab66c6`, `bf7aef1`

- **Profile overview (`cab66c6`):** Status label + **severity** now driven from **`Account_State`** instead of a simplistic active flag, so suspended/blocked/etc. states match backend truth.
- **Entity logo + top bar (`bf7aef1`):** Initial **`currentEntityLogoResolvedSubject`** value adjusted for cleaner state; simplified logo resolution in **AppTopbar** with better **logging**; optional **login** default email for dev; **ProfileOverview** logs while user details load.

---

### 2026-04-14 — Tuesday — **2 hours**

**Commits:** `c1781c1`, `56817aa`, `d522772`

- **Transfer UX (`c1781c1`):** Introduced **`TransferProgressOverlayComponent`** in the shell; **FolderManagementComponent** now **synchronizes** upload vs download overlay visibility and progress data so users always see the right operation.
- **Protocol alignment (`56817aa`):** Chunk uploads use consistent **`Chunk_ID`** FormData key; download URLs carry the **token as query** for clearer, safer requests.
- **`d522772`:** Small incremental update (“up”) captured in history.

---

### 2026-04-15 — Wednesday — **2 hours**

**Commits:** `69505f8`

- **AppTopbar:** Removed unused **inputs** and **service** dependencies; clearer **logo** update path including **“should reload”** detection after logo changes.
- **Cross-cutting:** Import cleanup across touched components to reduce bundle noise and accidental circular dependencies.

---

### 2026-04-16 — Thursday — **5 hours**

**Commits:** `87732a3`, `1a76b88`

- **Module deletion (`87732a3`):** Removed **`EntitiesComponentsModule`** and its **list / contact / details** components; updated **`EntitiesModule`** wiring; deleted unused templates/styles to shrink the entity-admin surface area.
- **Runtime behaviour (`1a76b88`):** **`EntitiesService`** integration in **AppTopbar** for **parent entity code**; **SharedEntityDetails** notification logic so the bar updates for **current and parent** entity transitions; **SharedEntitiesList** logo path simplified with extra logging for supportability.

---

### 2026-04-21 — Tuesday — **2 hours**

**Commits:** `3ea8c03`

- **`SettingsEngineService`:** Central orchestration for settings layers (language, theme, etc.) consumed across the app.
- **`LocalStorageService`:** Token + settings retrieval streamlined; removed legacy “user blob” style paths where replaced by the engine.
- **Broad refactor:** Components updated to the new settings pipeline for **consistent UX** and easier future changes.

---

### 2026-04-22 — Wednesday — **2 hours**

**Commits:** `af96838`

- **Interceptor:** On session expiry, **clear storage** and **redirect** to login with a **`session expired`** query flag instead of a modal dialog.
- **Removed:** Standalone **session-expired dialog** component and assets.
- **Login:** Errors surfaced via **banner** pattern for clearer feedback.
- **Docs:** Updated to describe the new session flow.

---

### 2026-04-24 — Friday — **7 hours**

**Commits (chronological):** `f61ffb6` → `32bb119` → `ec36f3d`

- **Shared entity details (`f61ffb6`):** Explicit **route-bound entity ID** binding; **reset view state** when the ID changes mid-navigation; logo load path simplified.
- **Top bar + details (`32bb119`):** Integrated **`TopbarHeaderCacheService`** for title/logo caching; **SharedEntityDetails** gained a **visible loading state** for logos; HTML/SCSS pass for layout consistency.
- **Simplification (`ec36f3d`):** **Removed `TopbarHeaderCacheService`** and its interface so header/title state stays aligned with **local storage** without a parallel cache layer.

---

### 2026-04-25 — Saturday — **7 hours**

**Commits:** `027356a`

- **`LanguageDirService`:** Central **direction** + **regional field mapping** when language changes.
- **Entity admin surfaces:** Entity **groups**, **roles**, and **shared entity** flows subscribe reactively to language changes and remap **titles/descriptions** for RTL/LTR and translated content.
- **Cleanup:** Dropped redundant **account settings** guard checks after the new mapping model.

---

### 2026-04-26 — Sunday — **5 hours**

**Commits:** `7a5d869`, `e6c2019`, `ed7602f`, `651488b`, `0e72701`, `4438ba0`

- **Settings schema & shell (`4438ba0`):** Documentation for **settings layers** and APIs; **`LayoutService`** theme code deduped; **`AppTopbar`** reacts cleanly to theme switches; **account/entity** settings tabs handle defaults and display names better; **`SharedSettingsPanel`** supports **reset to schema defaults**; pruned deprecated keys from the known schema.
- **Profile preferences feature (`0e72701`):** New **`ProfilePreferencesComponent`**, **routing**, entry from **ProfileOverview**, optional sync hooks for entity settings, **en/ar** for the new area.
- **Auth + storage (`651488b`):** **`getUserPreferences`** on **`LocalStorageService`**; **`loadUserPreferencesOnLogin`** in **`AuthService`** via **`ProfileApiService`**; preferences cleared on **logout**; small **translation** consistency edits.
- **App config (`ed7602f`):** Layout changes **persist** through user-preferences API; **reset to defaults** syncs preferences; serialization fixes in **`ProfileApiService`**.
- **Profile edit (`e6c2019`):** **Removed** embedded preferences UI from **`ProfileEditComponent`** so preferences live in one dedicated place.
- **Settings section save (`7a5d869`):** Save paths for **defaultAccount** / **defaultEntity** layers, **server refresh** with success/error toasts, **emit reload** for parent tabs after successful writes.

---

## Summary

| Metric | Value |
| ------ | ----- |
| **Working days (with commits)** | 14 |
| **Total billable hours (schedule)** | **63** |
| **Commits in period (`git rev-list`)** | **39** |

### How to read this for “reliable hours”

- **Hours** = agreed **day-of-week rate** on days where the repo shows work (see table at top of `timesheet-instructions.md`).
- **Detail** = **grouped commit narrative** above; you can verify any line with `git show <hash>` in `d:\Github\ERP-front`.
- **Light days:** If a date only has a tiny chore commit but still counts as a “commit day,” the **hours stay on the schedule** unless you agree with the client to **move** that capacity to another day—see **2026-04-12** as an example.
