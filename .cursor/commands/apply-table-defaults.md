# apply-table-defaults

Bring **`p-table`** list screens in line with project **`table-defaults`** and the **canonical reference** implementation.

---

## Authoritative sources (read and follow)

1. **Rule:** `.cursor/rules/table-defaults.mdc`
2. **Reference template:** `src/app/modules/entity-administration/entity-storage-management/file-systems-section/file-systems-section.component.html` (table in `.block-card`, ~lines 16–169)
3. **Reference row hover:** `file-systems-section.component.scss` (`{feature}-row-clickable` + `--surface-hover`)

---

## Scope (what to edit)

| Area | Action |
| ---- | ------ |
| **`.html`** | Align `p-table` shell, caption, header, body, skeletons, column widths, row class/cursor/details handler, `stopPropagation` on inline actions, global filter wiring, ellipsis + `pTooltip` where text overflows. |
| **`.scss`** | Add or align `:host ::ng-deep` row hover for `{feature}-row-clickable` like the reference. |
| **`.ts`** | Only when required for lazy load, pagination cursors, or handlers the template calls — **do not** refactor unrelated logic. Prefer reusing existing loading flags. |
| **`en.json` / `ar.json`** | Any new or changed user-visible strings (see **`i18n-translations`**). |

---

## STRICT RULES

### 1. Match the reference structure

- `responsiveLayout="scroll"`, `styleClass="p-datatable-sm"`.
- Paginator: `[paginator]="true"`, `[rows]`, `[rowsPerPageOptions]="[10, 25, 50, 100]"` for **new** work; if the file already uses another array, stay consistent in that file unless the owner asks to change it.
- `[showCurrentPageReport]="true"` and translated `[currentPageReportTemplate]`.
- **Global filter:** `[globalFilterFields]` + caption search input calling `filterGlobal(..., 'contains')` like the reference.

### 2. Caption toolbar

- Same flex / gap / margin pattern as the reference (`justify-content-between`, `gap-3`, `mb-2`, filter groups with `gap-2`, `ml-2` where used).
- **Skeletons** for search and filters only in the **initial empty load** pattern the reference uses (`loading && items.length === 0` or the screen’s equivalent).
- Skeleton **heights and widths** must match real controls (e.g. `2.5rem` search, dropdown widths like `10rem` / `12rem`, checkbox-sized skeleton next to label).
- **Labels** stay visible; all visible text via **translate**.

### 3. Columns

- **Fixed widths** on every `<th>` and matching `<td>` (`style="width: …rem"`).
- **Ellipsis** for overflow + **`[pTooltip]`** for full value when truncated; `min-width: 0` inside flex where needed.
- Header alignment classes (`text-center` / `text-start`) consistent with body.

### 4. Body rows

- Class `{feature}-row-clickable`, `[style.cursor]="loading ? 'default' : 'pointer'"` with the **existing** loading flag.
- **Details:** reference uses row **`(click)`** for details; keep that unless the owner asked for hover-open (then use debounced `(mouseenter)` and **ask** if unclear).
- **SCSS:** same hover transition and `var(--surface-hover)` as reference for that row class.

### 5. Skeletons inside cells

- Per-cell `*ngIf="loading; else …"` with **`<p-skeleton>`** in the **same `<td>`** as loaded content.
- Mirror real content: tag pills, round icon buttons, `flex` + `gap-2` clusters — **no layout shift** when data loads (see **`ui-defaults`** / **`skeleton-page`** command).
- **Placeholder / skeleton body rows:** the count must match **`[rows]`** on `p-table` (use the same property for `Array(n)` or `*ngFor` length as for the paginator default page size — e.g. `fileSystemsTableRows`, `virtualDrivesTableRows`).

### 6. Inline actions

- **`$event.stopPropagation()`** on menu triggers and other row buttons so they do not fire row details.

### 7. Server-side data

- If the list is **lazy / server-paged**, add `[lazy]="true"`, `totalRecords`, `first`, `(onLazyLoad)`, and cursor pagination per project docs — **without** dropping the caption/header/body/skeleton/column rules above.

### 8. Do not

- Add **new** loading flags (reuse existing).
- Hardcode user-visible strings.
- Change outer layout containers or spacing arbitrarily.
- Assume export, sort, or selection — add only when the feature or owner requires it.

---

## Checklist

- [ ] `p-table` shell matches reference + **`table-defaults.mdc`**.
- [ ] Caption skeletons match control sizes and gaps; no shift vs loaded toolbar.
- [ ] Fixed column widths; ellipsis + tooltip where text can overflow.
- [ ] Per-cell skeletons match loaded layout (padding, flex, gaps); **skeleton/placeholder row count = `[rows]`**.
- [ ] Row clickable class, cursor, hover SCSS; details on row **click** unless owner specified hover.
- [ ] `stopPropagation` on row-level buttons/menus.
- [ ] Lazy + cursor pagination if server-driven list.
- [ ] **`en.json`** + **`ar.json`** for any new copy.

---

## Related rules / commands

- **`table-defaults`** (`.cursor/rules/table-defaults.mdc`)
- **`i18n-translations`** — all visible strings
- **`ui-defaults`** — skeleton discipline
- **`skeleton-page`** command — template-only skeleton refactors
