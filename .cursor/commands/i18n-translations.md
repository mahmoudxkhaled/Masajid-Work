# i18n-translations

Apply **`@ngx-translate`** to all **user-visible** strings: templates, translation JSON, and any TypeScript that surfaces text (e.g. toasts). Align with project rule **`i18n-translations`**.

---

## Scope (what to edit)

| Area | Action |
| ------ | ------ |
| **`.html` templates** | Replace hardcoded visible text with `translate` pipe (or bound translated attributes). |
| **`en.json` / `ar.json`** | Add or update **every** new or changed key in **both** files. |
| **`.ts` (toasts / alerts)** | Replace hardcoded `summary` / `detail` with `translate.instant('key')` (or `this.translate.instant`). |

**Prefer not to** change unrelated TypeScript logic, form wiring, or validation unless the task requires it. **Do not** change DOM structure, icons, or CSS classes unless the task is to change layout.

---

## STRICT RULES

### 1. No hardcoded user-visible strings

- **Templates:** no raw English/Arabic copy for UI labels, titles, placeholders, buttons, tooltips, empty states, errors shown in the template.
- **Toasts / notifications:** no hardcoded `summary` or `detail` in `MessageService.add()`.

---

### 2. Template patterns

Use one of:

```html
{{ 'module.feature.section.key' | translate }}
```

```html
[label]="'module.feature.section.key' | translate"
[placeholder]="'module.feature.section.key' | translate"
```

Use the same pattern for other PrimeNG / HTML attributes that bind visible text.

---

### 3. Key naming (hierarchical)

Format: **`[module].[pageOrFeature].[section].[element]`**

Examples:

- `auth.reset-password.title`
- `auth.reset-password.fields.newPassword`
- `entityGroups.form.editTitle`
- `systemAdministration.erpFunctions.functionsList.searchPlaceholder`

**Toasts / messages:**

- `[module].[feature].messages.something`
- Or shared: `common.success`, `common.error`, etc.

Keep names **stable** and **hierarchical** so keys stay searchable and consistent.

---

### 4. Translation files (must do both)

- Paths: **`src/assets/i18n/en.json`** and **`src/assets/i18n/ar.json`**
- **Every** new or renamed key → update **both** files in the **same** change.
- **Arabic:** formal, professional UI Arabic; not slang; avoid overly literal word-for-word translation when it hurts UX.

---

### 5. Toaster / `MessageService`

**Never** hardcode `summary` or `detail`.

```ts
this.messageService.add({
  severity: 'success',
  summary: this.translate.instant('common.success'),
  detail: this.translate.instant('entityAccounts.messages.created')
});
```

Register every key used in **`en.json`** and **`ar.json`**.

---

### 6. Before / after (template)

```html
<!-- Before -->
<h2>Reset Password</h2>
<p-button label="Submit"></p-button>

<!-- After -->
<h2>{{ 'auth.reset-password.title' | translate }}</h2>
<p-button [label]="'auth.reset-password.actions.submit' | translate"></p-button>
```

---

## Checklist

- [ ] All new/changed user-visible strings use keys (no stray literals in templates).
- [ ] Keys follow **`[module].[pageOrFeature].[section].[element]`** (or shared `common.*` where appropriate).
- [ ] **`en.json`** and **`ar.json`** updated together.
- [ ] Toasts use **`translate.instant`** for `summary` and `detail` only.
- [ ] Structure/layout/classes unchanged unless explicitly part of the task.

---

## Related rules

- **`ui-defaults`** — skeleton loading; for **strings**, this command + **`i18n-translations`** rule are authoritative.
- **`i18n-translations`** (`.cursor/rules`) — same policies; keep command and rule in sync.
