# apply-donation-table-cell-ellipsis

Apply the project **CSS ellipsis** pattern for long text in donation-process (and similar) `p-table` cells. Prefer this over character-count truncation (`slice` + `...`) in TypeScript.

When text is truncated with dots, **hovering the cell** must show the **full remaining text** in `[pTooltip]`.

---

## When to use

- Title, description, category, name, or other long text overflows a table column
- Owner asks for dotted / truncated text in a list cell
- Owner asks for full text on hover via tooltip
- Aligning a table with other donation lists that already use `donation-table-cell-ellipsis`

---

## Authoritative reference

**Template + styles:** `src/app/modules/donation-process/facility-requests/components/facility-fulfillments-list/`

- `facility-fulfillments-list.component.html` — title / category cells
- `facility-fulfillments-list.component.scss` — `donation-table-cell-ellipsis` + `text-overflow-ellipsis`

**Tooltip on cell (preferred for hover):** `src/app/modules/donation-process/browse/components/donor-request-public-details/` — vendor offers table (ellipsis `<td>` + `pTooltip` + `appendTo="body"`)

Also used in: `browse-donations-list`, `pending-review-list`, `ready-to-close-list`, `facility-requests-list`, `my-commitments-list`, `validation-list`, `vendor-requests-list`, `breakdown-items-list`, etc.

Related: **`table-defaults`** / **`apply-table-defaults`** (ellipsis + tooltip is part of column rules).

---

## Input the user should provide

1. Target component (`.html` / `.scss`, or path + column names)
2. Which columns need ellipsis (e.g. title, description)

---

## STRICT RULES

### 1. Use CSS ellipsis — not character truncation

- **Do** use `donation-table-cell-ellipsis` on the `<td>` and `text-overflow-ellipsis` on the inner `<span>`.
- **Do not** add `truncateTitle` / `slice(0, N) + '...'` helpers for table display unless the owner explicitly asks for a fixed character limit.

### 2. HTML pattern (required)

Put **`[pTooltip]` on the `<td>`** (not only on the inner span) so hovering **anywhere on the cell** shows the full text. Always set **`appendTo="body"`** so the tooltip is not clipped by parents with `overflow: hidden` (e.g. `.details-card`, table scroll wrappers).

```html
<td
  class="donation-table-cell-ellipsis"
  style="width: 14rem"
  [pTooltip]="getTitle(row)"
  tooltipPosition="top"
  appendTo="body"
>
  <ng-container *ngIf="loading; else titleCell">
    <p-skeleton height="1.25rem" width="12rem"></p-skeleton>
  </ng-container>
  <ng-template #titleCell>
    <span class="font-semibold text-overflow-ellipsis">{{ getTitle(row) }}</span>
  </ng-template>
</td>
```

Optional empty-value guard:

```html
[tooltipDisabled]="!row.description"
[pTooltip]="row.description || ''"
```

Requirements:

- Class **`donation-table-cell-ellipsis`** on the **`<td>`** that holds the long text.
- Inner **`<span class="text-overflow-ellipsis">`** wraps the **displayed** (possibly truncated) value.
- **`[pTooltip]` on the same `<td>`** binds the **full** value (the “rest” of the dotted text).
- **`tooltipPosition="top"`** and **`appendTo="body"`** on that tooltip.
- Keep an explicit **`style="width: …"`** on `<th>` / `<td>` (same rem/% as the column already uses).
- Keep per-cell **skeleton** wiring unchanged (same `<td>`, existing loading flag).
- Do **not** rely on native `title=""`; use PrimeNG **`pTooltip`**.

Optional: `font-semibold` on the span when the reference column uses it (e.g. title).

### 3. SCSS pattern (match reference)

Add to the component **`.scss`** if missing:

```scss
:host ::ng-deep {
  .p-datatable .p-datatable-tbody > tr > td.donation-table-cell-ellipsis {
    max-width: 0;
    overflow: hidden;
  }
}

.text-overflow-ellipsis {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- Nest the `td.donation-table-cell-ellipsis` rule under existing `:host ::ng-deep` if the file already has one (e.g. next to row-clickable hover rules).
- Do **not** invent a new class name; reuse **`donation-table-cell-ellipsis`** and **`text-overflow-ellipsis`**.

### 4. Scope control

- Touch only the columns that need ellipsis + the component SCSS.
- Do not change pagination, filters, row click handlers, or unrelated columns.
- Do not remove tooltips when adding ellipsis; always wire full text + `appendTo="body"`.

---

## Workflow

1. Open the target list `.html` and `.scss`.
2. For each long-text column:
   - add `donation-table-cell-ellipsis` + fixed width on `<td>`
   - wrap display text in `span.text-overflow-ellipsis`
   - put `[pTooltip]="fullValue"` + `tooltipPosition="top"` + `appendTo="body"` on the **`<td>`**
3. Ensure component SCSS has the two rules above (copy from fulfillments list if missing).
4. Remove any character-based truncate helpers / custom ellipsis wrappers (e.g. `offer-description-cell`) that only existed for that cell display.
5. Verify: truncated text shows dots; hover on the cell shows the full text in the tooltip; no layout shift vs skeleton cells.

---

## Checklist

- [ ] Long-text `<td>` uses `donation-table-cell-ellipsis` + fixed width
- [ ] Display text wrapped in `span.text-overflow-ellipsis`
- [ ] Full value on `[pTooltip]` on the **`<td>`**
- [ ] `tooltipPosition="top"` and **`appendTo="body"`**
- [ ] Hovering the dotted cell shows the rest of the text in the tooltip
- [ ] Component SCSS includes `donation-table-cell-ellipsis` + `.text-overflow-ellipsis` rules
- [ ] No TS character `slice` truncation for these cells (unless owner required it)
- [ ] Skeletons / loading flags unchanged

---

## Related

- `.cursor/rules/table-defaults.mdc`
- `.cursor/commands/apply-table-defaults.md`
- `.cursor/commands/skeleton-page.md`
