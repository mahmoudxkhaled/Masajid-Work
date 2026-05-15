# skeleton-page

Refactor **ONLY** the HTML template to introduce PrimeNG Skeleton loading.

---

## STRICT RULES

### 1. DO NOT modify ANY TypeScript logic

- Do not edit variables
- Do not change loading flags
- Do not add new observables or state
- **Only** modify the HTML template

---

### 2. Replace ALL visual loading indicators

- Remove spinners / loaders / placeholders
- Use **ONLY** `<p-skeleton>`

---

### 3. Use existing loading flags only

Examples:

- `loading`
- `loadingDetails`
- `isLoading$`

---

### 4. Static vs dynamic (reload / first visit)

When the user **reloads** or **navigates** to the page and loading is true:

| Kind | Rule |
| ------ | ------ |
| **Static text** | **Keep it visible.** Do **not** replace with `<p-skeleton>`. Examples: fixed page/section titles, labels, helper text, tab names, button labels that use only i18n (`translate` pipe) and **no** data from an API/async load. |
| **Dynamic content** | **Use `<p-skeleton>`** for anything that appears only after data arrives: bound values (`{{ ... }}` from loaded models), lists (`*ngFor`), tables, charts, KPI numbers, avatars/images whose `src` depends on data, empty slots that will fill from the server. |

- If a line mixes static + dynamic (e.g. label + value), keep the **label** as real text; skeletonize **only the value** part so layout stays stable.
- Do not skeletonize i18n strings that are known upfront; skeletonize the **data-driven** parts.

---

### 5. VERY IMPORTANT — Preserve layout structure (STRICT)

- **DO NOT** change containers (`div`, grid, flex, etc.)
- **DO NOT** remove or change:
  - padding
  - margin
  - gap
  - spacing utilities (`mb-*`, `mt-*`, `p-*`, `gap-*`, etc.)
- **DO NOT** change alignment classes:
  - `text-center`, `text-start`, `text-end`
  - `flex`, `justify-*`, `items-*`
- **DO NOT** alter layout hierarchy

- Skeleton must replace **ONLY inner content**
- Outer layout **MUST** remain **identical**

---

### 6. CRITICAL — Size, spacing & alignment fidelity

#### Mandatory

- Skeleton **MUST** match:
  - **Exact width** (where it matters for the block)
  - **Exact height** (line / control / image block)
  - **Same spacing** (margin / padding / gap)
  - **Same alignment** (text / flex positioning)

#### Alignment

Detect and preserve alignment:

- `text-center` → skeleton must appear centered in that block
- `text-end` → skeleton aligned to the end
- `flex justify-between` → skeleton pieces respect the same distribution
- `items-center` → skeleton vertically centered as in the loaded state

**Never** break alignment behavior.

#### Spacing

- Preserve **ALL** `gap-*`, margin, and padding utilities
- Skeleton elements must sit in the **same wrappers** with the **same spacing classes**
- **Do NOT** collapse or compress spacing

#### Size (by element type)

| Element type   | Skeleton rule                          |
| ---------------- | ---------------------------------------- |
| Text             | height ≈ line-height of that text       |
| Title            | larger height (match heading size)      |
| Button           | same height & width as the real button  |
| Input            | same height as the input               |
| Avatar / image   | same width/height (or ratio) as media   |
| Card / block     | same spacing & block footprint          |

---

### 7. Pattern to follow

Instead of:

```html
<div>
  REAL CONTENT
</div>
```

Use:

```html
<div>
  <ng-container *ngIf="loading; else realContent">
    <p-skeleton height="X" width="Y"></p-skeleton>
  </ng-container>

  <ng-template #realContent>
    ORIGINAL CONTENT WITHOUT MODIFICATION
  </ng-template>
</div>
```

(Equivalent: `*ngIf="loading; else realContent"` on a wrapper with `<ng-template #realContent>` — keep the same structure the file already uses.)

---

### 8. Complex blocks

- Keep **ALL** wrappers exactly as-is
- Replace **ONLY** text, icons, images, buttons, and dynamic values with skeletons

**Example**

```html
<h1 class="text-3xl font-bold text-center mb-3">
```

Skeleton **MUST**:

- Keep `text-center`
- Keep `mb-3`
- Use height ~2rem (or match `text-3xl`)
- Stay visually centered

---

### 9. Images / avatars

- **DO NOT** remove the container
- Replace only inner content

```html
<div class="identity-logo">
  <p-skeleton width="100%" height="100%"></p-skeleton>
</div>
```

---

### 10. Forms

- Label → small skeleton line
- Input → full-width rectangular skeleton matching input height
- Button → skeleton matching button size

**Keep spacing between fields EXACTLY** as in the loaded form.

---

### 11. Tabs / panels

- **DO NOT** modify tab structure
- Apply skeleton **ONLY** inside the active content area

---

### 12. Async handling

- **Do NOT** duplicate async pipes
- Use **existing loading flags** only

---

### 13. PrimeNG tables (`p-table`)

- When the loading state shows **several skeleton table body rows** (repeated `<tr>` skeletons or placeholder rows bound to `[value]`), the **number of those rows must equal `[rows]`** on the same `p-table` so the paginator’s default page size and the skeleton state have the **same height**.
- **Preferred:** the component exposes one property used for **`[rows]`** and for building placeholders (e.g. `Array(tableRows).fill(...)` in a getter) so template and row count stay in sync without magic numbers.
- **Template-only refactors** (no `.ts` changes): if `[rows]="10"` is already in the template, repeat the skeleton row markup **10** times **only if** that matches `[rows]`; if you cannot align without TS, note that **`apply-table-defaults`** / **`table-defaults`** allow a minimal `.ts` change to share one `rows` constant with the placeholder array length.
- Full table rules: **`.cursor/rules/table-defaults.mdc`**.

---

## FINAL GOAL

Create a skeleton state that is:

- Visually consistent with the final UI (size + spacing + alignment)
- Preserves layout, padding, gaps, and alignment
- Keeps **static** copy visible; skeletonizes **dynamic** data only (see **Static vs dynamic** above)
- For **`p-table`**, uses the **same row count** as **`[rows]`** when showing multi-row skeletons (see **§13**)
- Causes **zero layout shift (CLS)** when switching loading → loaded

## Golden rule

> When the skeleton disappears, the UI must **not** move — not even by 1px.
