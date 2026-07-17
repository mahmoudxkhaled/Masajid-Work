# align-backend-response

Align frontend list/details parsing and UI with the **actual backend JSON** from `console.log` (or a pasted payload). Use this whenever a screen misreads fields, shows empty labels, or maps the wrong shape.

---

## When to use

Paste the **real** API response next to the subscribe/`console.log` site, then run this command.

Typical symptoms:

- Categories / lookups empty even though `success: true`
- Table rows empty or wrong columns
- Labels stay blank (`-`) while data exists in console
- Status / extra columns expected by UI but **not** returned by API
- Code reads `Name` / `Donation_Category_ID` but payload uses `name` / `donation_Category_ID` (or the reverse)

---

## Authoritative sources

1. **Donation APIs:** `.cursor/rules/donation-process-api.mdc` + `Docs/donation-process-api.md`
2. **Regional display:** `.cursor/rules/regional-language.mdc`
3. **Existing mappers:** prefer `DonationReferenceService` helpers (`parseListFromResponse`, `mapDonationCategories`, `mapDonationTypes`, `extractDictionaryItems`, `read*` via mappers) — do **not** invent a second parse layer
4. **Project norms:** keep `console.log` on list/details subscribe handlers; use `response.message.*` shapes directly

---

## Input the user should provide

1. **File + line** of the subscribe / mapper to fix
2. **Exact JSON** from the backend (full success payload preferred)
3. Optional: which UI fields look wrong

If JSON is missing, ask for it — do **not** guess alternate keys.

---

## STRICT RULES

### 1. Trust the pasted payload

- Map **only** fields that appear in the JSON (or in the documented API for that code).
- Do **not** invent defensive extractors, alternate key fallthroughs, or “maybe also `Foo_List`” layers unless the pasted payload or doc clearly has them.
- Prefer the same assignment style used elsewhere for that feature, e.g.:

```ts
this.totalRecords = Number(response.message.Total_Count);
this.requests = response.message.Donation_Requests;
```

### 2. Match container shape

| Backend `message` shape | Frontend bind |
| ----------------------- | ------------- |
| `{ Total_Count, Donation_Requests: [ ... ] }` | Use the **array** as-is |
| `{ "1": { ... }, "2": { ... } }` indexed dictionary | `parseListFromResponse` / `Object.values` / existing `extractDictionaryItems` |
| Nested `{ Donation_Categories: { "1": … } }` | Extract nested dictionary first, then map |
| Single details object / named dictionary | Use the feature’s existing `extract*Details` if present; otherwise bind the documented key |

### 3. Match property casing

ERP payloads may mix PascalCase and camelCase (`Donation_Category_ID` vs `donation_Category_ID`, `Name` vs `name`).

- Prefer **service mappers** that already tolerate both (`mapDonationCategories`, `mapDonationTypes`, etc.).
- Do **not** read raw PascalCase-only properties in the component when the payload is camelCase (or vice versa) — that causes empty dropdowns/labels.
- After mapping, build UI options/labels from the **mapped** model (`item.id`, `item.name`), not from unmapped raw keys.

### 4. Drop UI that the payload does not support

If a column/badge depends on a field that is **absent** from list rows (e.g. no `Donation_Request_Status_ID`):

- Remove that column / badge / filter from the template
- Remove related lookup loads, maps, and helpers from the component
- Do **not** hardcode fake status values unless the owner asks

Same idea as admin review / browse lists when status is not returned.

### 5. Regional labels after align

- Reference / lookup labels: `pickLocalizedField(Name, Name_Regional)` via mapper
- User-entered request content: `pickRequestContentField(Title, Title_Regional)`
- Keep raw arrays for remapping on language change when the screen already follows that pattern

### 6. Scope control

- Fix **only** the subscribe/mapper/UI needed for this payload
- Keep existing `console.log` labels
- No drive-by refactors, no new shared error registries, no extra abstraction files

---

## Workflow

1. Open the cited component (and service mapper if any).
2. Compare pasted JSON keys to current reads (`response.message.…`, `item.Name`, etc.).
3. Fix container binding (array vs dictionary vs nested).
4. Fix field access via existing mappers when casing differs.
5. Remove or hide UI for fields not present.
6. Confirm labels/options rebuild from mapped data (and language remap if applicable).
7. Leave `console.log` in place for the owner to re-verify.

---

## Checklist

- [ ] Binding uses the **exact** `message` keys from the pasted JSON / API doc
- [ ] Array vs dictionary vs nested dictionary handled correctly
- [ ] Casing handled via existing mappers (not broken PascalCase-only reads)
- [ ] UI columns/fields not in the payload removed
- [ ] Regional helpers used correctly for display
- [ ] `console.log` preserved
- [ ] No invented alternate-key parse layers

---

## Related rules / commands

- `donation-process-api` (`.cursor/rules/donation-process-api.mdc`)
- `regional-language` / `apply-regional-language`
- `regional-data-remapping` / `apply-regional-data-remapping`
- `business-error-handling` / `apply-business-error-handling`
