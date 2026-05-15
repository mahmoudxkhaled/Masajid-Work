# implement-feature

Implement **only** what was asked. **No over-engineering**, **no assumed requirements**, **no extra code** “for the future.” Align with project rule **`angular-project`** (section **Scope — implement the feature only**).

---

## Goal

Deliver the smallest change that satisfies the feature so **maintenance and follow-up work stay light** — avoid heavy code nobody asked for.

---

## STRICT RULES

### 1. Minimum scope

- Write **only** the code needed for the **current** task or ticket.
- **Do not** refactor unrelated areas, rename unrelated symbols, or “clean up” files outside the requested scope unless the owner explicitly asked for a wider refactor.
- **Do not** add new modules, services, helpers, or files unless the feature **requires** them.

---

### 2. No assumptions

- If something is **ambiguous** (behaviour, API shape, UX, edge cases), **ask the owner** — do **not** guess and build speculative behaviour.
- **Do not** invent requirements, extra validations, feature flags, or abstractions that were not described.

---

### 3. No over-coding

- **Do not** add wrappers, generic utilities, deep inheritance, or configuration layers unless the task **clearly** needs them.
- Prefer **simple**, **local** changes: same component, same service, same module — match how neighbouring code in the repo already works.
- **Do not** introduce new patterns that differ from the surrounding feature without instruction.

---

### 4. Smallest useful change

- Prefer the **shortest, most boring** solution that works and matches existing style.
- Every new line should **earn its place** for this feature; if it does not, omit it.

---

### 5. When the owner asks for “more”

- Wider refactors, new architecture, or extra robustness are fine **only** when explicitly requested.

---

## Checklist

- [ ] Change set is limited to what the task describes.
- [ ] No new files or abstractions unless necessary for the feature.
- [ ] No guessed requirements; unclear points were asked or left as-is per owner.
- [ ] No unrelated formatting or drive-by edits in other features.
- [ ] Solution is easy to read and extend without reading extra layers.

---

## Related rule

- **`.cursor/rules/angular-project.mdc`** — full Angular style, `#region`, PrimeNG, RxJS guidance, and **Scope — implement the feature only**.
