# CLAUDE.md — ERP-Front (pmat)

## Project Overview

Angular 17 enterprise ERP frontend (`iAwareApplication-Front`). Covers accounting, entity administration, document control, system administration, and dashboards.

## Tech Stack

- **Framework**: Angular 17.0.5 (TypeScript, strict mode)
- **UI**: PrimeNG 17.2.0 + PrimeFlex grid
- **State/Async**: RxJS 7.8.1
- **Real-time**: SignalR 8.0.7
- **i18n**: @ngx-translate with messageformat compiler
- **Charts**: Chart.js 3.9.1, ng2-charts, chartjs-gauge
- **Export**: jsPDF, ExcelJS, html2canvas, html2pdf
- **Editors**: ngx-editor, Quill
- **Styling**: SCSS

## Commands

```bash
npm start          # dev server (ng serve)
npm run build      # development build
npm run build:prod # production build (optimized)
npm run build:test # test environment build
npm test           # Karma/Jasmine unit tests
npm run lint       # Angular lint
```

## Project Structure

```
src/app/
├── core/                    # Guards, interceptors, services, directives, pipes, validators
├── layout/                  # App shell: header, footer, menu, breadcrumb
├── modules/                 # Lazy-loaded feature modules
│   ├── auth/
│   ├── dashboard/
│   ├── summary/
│   ├── system-administration/
│   ├── entity-administration/
│   ├── document-control/
│   ├── finance-accounting/
│   └── shared/
├── Shared/                  # Global shared components and modules
│   ├── components/
│   └── shared/              # app-translate, shared module declarations
└── environments/            # prod, test, dev configs
```

## Architecture

- **Lazy-loaded modules**: Each feature domain is its own Angular module
- **HTTP interceptors**: Error handling, loading state, routing headers (3 interceptors in `core/`)
- **AuthGuard**: Protects all authenticated routes (`core/Guards/auth.guard.ts`)
- **Permission service**: Centralized role/permission checks (`core/services/permission.service.ts`)
- **Service layer**: `local-storage.service`, `notification.service`, `module-navigation.service`
- **Smart/dumb component pattern**: Layout shell contains feature modules

## Code Conventions

- **Styling**: SCSS, single quotes, 120-char line width (`.prettierrc`)
- **TypeScript**: ES2022 target, strict mode, strict templates, decorators enabled
- **Module resolution**: `node` strategy (tsconfig)
- **Bundle budget**: 8MB max (angular.json)
- **Component style**: Angular standalone or NgModule-based depending on feature

## Key Config Files

| File                | Purpose                                                       |
| ------------------- | ------------------------------------------------------------- |
| `angular.json`      | Build configs (prod/test/dev), SCSS schemas, size budgets     |
| `tsconfig.json`     | TypeScript strict config, ES2022                              |
| `.prettierrc`       | Formatting: single quotes, 120 chars, angular template parser |
| `src/environments/` | Per-environment API base URLs and flags                       |

## Reference Docs

- `MODULE_URLS_DATABASE.md` — routing reference for all module URLs
- `CHANGELOG.md` — version history (v15 → v17 migrations documented)
- `deploy.md` — deployment notes
- `Docs/storage-management-file-system-api.md` — Storage & File System API spec

---

## API / HTTP Service Pattern

All HTTP calls go through `ApiService` (`core/api/api.service.ts`) — **never call `HttpClient` directly**.

The backend uses a **custom binary protocol** — request codes instead of REST endpoints.

```ts
// core/api/api.service.ts
callAPI(requestCode: number, accessToken: string, parameters: string[]): Observable<ApiResult>

export interface ApiResult {
  ReturnStatus: number;
  Body: string;
}
```

### How to call the API in a service

```ts
@Injectable({ providedIn: "root" })
export class MyFeatureService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService,
    ) {}

    listItems(lastId: number, count: number, filter: string): Observable<ApiResult> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(REQUEST_CODE, this.localStorageService.getAccessToken(), [lastId.toString(), count.toString(), filter]).pipe(finalize(() => this.isLoadingSubject.next(false)));
    }
}
```

- Get the access token via `this.localStorageService.getAccessToken()` — never store it locally.
- All parameters must be `string[]`.
- Wrap calls with `isLoadingSubject.next(true/false)` + `finalize()` for loading state.
- Request codes are documented per feature — check existing services in the same module.

### Interceptors (automatic — no action needed)

| Interceptor                     | What it does                                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `routing-header.interceptor.ts` | Adds `Routing` header to all `/SystemAPIs/` calls                                                                                |
| `loading.interceptor.ts`        | Toggles global loading spinner                                                                                                   |
| `error-handling.interceptor.ts` | Session-related ERP codes → clear storage + redirect `/auth?sessionExpired=1`; other generic ERP11xxx errors → translated toasts |

---

## Permission Checking

**Service:** `core/services/permission.service.ts`

### Key methods

```ts
permissionService.can("Delete_Entity"); // generic action check (preferred)
permissionService.hasRole(Roles.SystemAdministrator);
permissionService.hasAnyRole([Roles.Developer, Roles.EntityAdministrator]);
permissionService.canCreateAccount(); // convenience helpers (40+)
permissionService.canDeleteAccount();
permissionService.canActivateAccount();
permissionService.getRoleName(roleId); // → "System Administrator"
```

**Roles enum:**

```ts
export enum Roles {
    Developer = 1,
    SystemAdministrator = 2,
    EntityAdministrator = 3,
    SystemUser = 4,
    Guest = 5,
}
```

### In templates — structural directive

```html
<!-- Show only for specific role(s) -->
<div *appHasRole="Roles.SystemAdministrator">Admin-only content</div>
<div *appHasRole="[Roles.SystemAdministrator, Roles.EntityAdministrator]">Multi-role content</div>
```

### In templates — property binding

```ts
// component.ts
canDelete = this.permissionService.can("Delete_Entity");
```

```html
<p-button *ngIf="canDelete" label="Delete" ...></p-button>
```

### In TypeScript — building conditional menus

```ts
buildMenuItems(): MenuItem[] {
  const items: MenuItem[] = [];
  if (this.permissionService.canActivateAccount()) {
    items.push({ label: 'Activate', command: () => this.activate() });
  }
  if (this.permissionService.can('Delete_Entity')) {
    items.push({ label: 'Delete', command: () => this.delete() });
  }
  return items;
}
```

---

## Typical Feature Module Structure

```
modules/entity-administration/entity-accounts/
├── components/
│   ├── entity-account-list/
│   │   ├── entity-account-list.component.ts      # component class
│   │   ├── entity-account-list.component.html    # template
│   │   └── entity-account-list.component.scss    # scoped styles
│   ├── entity-account-details/
│   │   ├── ...
│   └── entity-account-update/
│       ├── ...
├── services/
│   └── entity-accounts.service.ts                # all API calls for this feature
├── models/
│   └── entity-accounts.model.ts                  # interfaces / types
├── entity-accounts.module.ts                     # NgModule (declarations, imports, exports)
└── entity-accounts-routing.module.ts             # RouterModule.forChild(routes)
```

### File naming conventions

| File                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `*.component.ts/html/scss` | Component (class / template / styles) |
| `*.service.ts`             | Business logic and API calls          |
| `*.module.ts`              | Feature NgModule                      |
| `*-routing.module.ts`      | `RouterModule.forChild()` routes      |
| `*.model.ts`               | Interfaces and types                  |
| `*.directive.ts`           | Structural / attribute directives     |
| `*.guard.ts`               | Route guards                          |
| `*.interceptor.ts`         | HTTP interceptors                     |
| `*.validator.ts`           | Form validators                       |

### Routing pattern

```ts
// feature-routing.module.ts
const routes: Routes = [
    { path: "", redirectTo: "list", pathMatch: "full" },
    { path: "list", component: ItemListComponent, data: { breadcrumb: "itemList" } },
    { path: "new", component: ItemFormComponent, data: { breadcrumb: "newItem" } },
    { path: ":id", component: ItemDetailsComponent, data: { breadcrumb: "itemDetails" } },
    { path: ":id/edit", component: ItemFormComponent, data: { breadcrumb: "editItem" } },
];
```

Parent module lazy-loads via:

```ts
{
  path: 'my-feature',
  canActivate: [AuthGuard],
  loadChildren: () => import('./modules/my-feature/my-feature.module').then(m => m.MyFeatureModule),
}
```

---

## Rules (from .cursor/rules)

### Response Style

- **Code-first, minimal prose.** Give only the code or requested artifact by default.
- No preamble, no "here's what I did," no step-by-step unless explicitly asked.
- If summarizing changes, use 1–2 short lines max.
- Explain reasoning only when the user asks ("why?", "explain", "how does this work?").

---

### Angular Code Style

You are a **Senior Angular Developer**. Write **simple, junior-readable code**.

- Use Angular v17+ practices (standalone where it fits; signals when they simplify).
- **Clarity over cleverness:** no over-engineering, no abbreviations, no clever tricks.
- **Avoid RxJS as much as possible** — use `async`/`await`, callbacks, or plain subscriptions; use basic operators (`map`, `tap`, `switchMap`) only when the API or flow requires it; never long reactive chains.
- Short methods, one responsibility per component.
- Prefer template-driven or basic reactive forms; straightforward templates.
- Follow the Angular style guide strictly.

#### Comments & Regions

- **Do not add comments** — keep code self-explanatory with clear names.
- **Group related members** with collapsible regions:

```ts
// #region Load data
loadItems() { ... }
reload() { ... }
// #endregion
```

- Use `// #region` / `// #endregion` so related functions, properties, and lifecycle hooks stay together and are foldable in the editor.
- Add comments only if the user explicitly asks for them.

#### PrimeNG

- Prefer PrimeNG components whenever possible: `p-button`, `p-table`, `p-dialog`, `p-inputText`, `p-dropdown`, etc.
- Default to PrimeNG over plain HTML elements in templates.

---

### i18n & Translations

All user-visible strings must use **`@ngx-translate`**. Keys live in `src/assets/i18n/en.json` and `src/assets/i18n/ar.json`.

#### Templates

- Replace static text with the translate pipe: `{{ 'key.path' | translate }}`
- Attributes: `[placeholder]="'key.path' | translate"`
- Keep DOM structure, icons, and CSS classes unless the task is layout changes.

#### Key Naming (hierarchical)

Pattern: `[module].[pageOrFeature].[section].[element]`

Examples:

- `auth.reset-password.title`
- `auth.reset-password.fields.newPassword`
- `entityGroups.form.editTitle`
- `systemAdministration.erpFunctions.functionsList.searchPlaceholder`

For toasts: `[module].[feature].messages.*` or shared keys like `common.success`, `common.error`.

#### Translation Files

- **Always** update **both** `en.json` and `ar.json` together.
- Arabic: formal, professional UI Arabic — not slang, not overly literal.

#### Toasts (`MessageService`)

- **Never** hardcode `summary` or `detail`.
- Use `this.translate.instant('key')` for both fields:

```ts
this.messageService.add({
    severity: "success",
    summary: this.translate.instant("common.success"),
    detail: this.translate.instant("entityAccounts.messages.created"),
});
```

#### Checklist

- [ ] Template text uses `translate` pipe (or `instant` in TS for dynamic strings)
- [ ] Keys follow the naming hierarchy
- [ ] `en.json` and `ar.json` updated together
- [ ] Toasts use translated `summary` / `detail` only

---

### UI Defaults — Loading Skeletons

Every UI change **must** include a proper skeleton loading state.

#### Rules

- Use **`<p-skeleton>`** — no spinners, no new loading flags.
- Use only existing loading flags (`loading`, `loadingDetails`, `isLoading$`, etc.).
- The skeleton **must** match the exact size, layout, spacing, gaps, padding, and margins of the real content.
- No layout shift when switching between loading and loaded states.

#### Pattern

```html
<ng-container *ngIf="loading; else realContent">
    <!-- skeleton here -->
</ng-container>
<ng-template #realContent>
    <!-- real content here -->
</ng-template>
```

#### Correct Example

Original:

```html
<div class="card p-3 mb-3">
    <h3 class="mb-2">Title</h3>
    <p>Description</p>
</div>
```

Skeleton:

```html
<div class="card p-3 mb-3">
    <p-skeleton height="24px" class="mb-2"></p-skeleton>
    <p-skeleton height="16px" width="80%"></p-skeleton>
</div>
```

- Same container, same padding, same margins — only inner content replaced.
- Do not remove wrappers, change spacing, use random sizes, or replace the full layout.

---

### Storage & File System API

When working on upload, download, file systems, folders, file allocations, or virtual drives:

- Use `Docs/storage-management-file-system-api.md` as the single source of truth for endpoint contracts, request/response shapes, query vs form vs body, and error codes.
- **Upload flow**: `Upload_Request` (get token) → `Upload_File_Chunk` (query: token; form: Current_Chunk, Offset, Hash; file: chunk). File ID returned only on the **last** chunk.
- **Download flow**: `Download_Request` (get token + chunk count) → `Download_File_Chunk` (query: token; form: Chunk_ID); response body is the chunk stream.
- Use **`Delete_File_Allocation`** instead of `Delete_File` for ERP.
- Match error codes (`ERP12xxx`) and permission matrix from the doc when handling errors and access.

Applies to: `file-system*/`, `file-system-lib/`, `document-control/`, `system-storage-management/`, `entity-storage-management/`

---

## Response Parsing

`ApiService` **automatically JSON-parses** `ApiResult.Body` before returning — components receive plain JS objects, no manual parsing needed.

```ts
// What the API returns after auto-parsing:
{
  success: true,
  message: {
    Total_Count: 150,
    Entities_List: { "0": { Entity_ID: 1, Code: "E01", Name: "...", Is_Active: true }, ... }
  }
}
```

### Standard subscribe pattern

```ts
this.myService.listItems(...).subscribe({
  next: (response: any) => {
    if (!response?.success) {
      // handle business error (show toast, etc.)
      return;
    }
    this.totalRecords = Number(response.message.Total_Count);
    this.items = Object.values(response.message.Items_List).map((item: any) => ({
      id: String(item.Item_ID),
      name: item.Name || '',
      active: Boolean(item.Is_Active),
    }));
  },
  error: () => { /* HTTP-level errors handled by interceptor */ },
  complete: () => this.resetLoadingFlags()
});
```

- Always check `response?.success` first.
- Access data via `response.message.*` — property names are `PascalCase` (e.g. `Entity_ID`, `Is_Active`).
- Map raw API objects to typed local models immediately after receiving them.
- HTTP errors are caught globally by `error-handling.interceptor.ts` — no need to re-handle them.

---

## Shared / Reusable Components

### `src/app/Shared/components/`

| Component               | Selector                      | Purpose                                                          |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `erp-info`              | `<app-erp-info>`              | Info/alert box with icon, severity, title, description           |
| `erp-rich-text`         | `<app-erp-rich-text>`         | Rich text editor (summernote) with ERP variable insertion        |
| `erp-variables`         | `<app-erp-variables>`         | Variable picker opened inside rich text editor via DynamicDialog |
| `table-loading-spinner` | `<app-table-loading-spinner>` | Skeleton loader for tables                                       |
| `color-schema-settings` | `<app-color-schema-settings>` | Theme/color/scale switcher                                       |

**`erp-info` inputs:**

```html
<app-erp-info
  icon="pi pi-info-circle"
  severity="info"          <!-- info | success | warning | danger -->
  title="Note"
  description="Some message">
</app-erp-info>
```

**`erp-rich-text` inputs/outputs:**

```html
<app-erp-rich-text [height]="300" id="myEditor" placeholder="Type here..." (Content)="onContentChange($event)"> </app-erp-rich-text>
```

### `src/app/modules/shared/`

| Module                 | Components                                                                                     | Purpose                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `shared/user-accounts` | `shared-account-list`, `shared-account-details`, `shared-account-update`                       | Reusable account screens used across entity-administration and system-administration |
| `shared/entities`      | `shared-entities-list`, `shared-entity-form`, `shared-entity-details`, `shared-entity-contact` | Reusable entity screens                                                              |

---

## Component Communication

### 1. `@Input()` / `@Output()` — parent ↔ child

```ts
// child dialog component
@Input() visible: boolean = false;
@Input() mode: 'create' | 'edit' = 'edit';
@Input() entityId: number = 0;
@Output() visibleChange = new EventEmitter<boolean>();
@Output() saved = new EventEmitter<void>();
```

```html
<!-- parent template -->
<app-edit-role-dialog [(visible)]="dialogVisible" [mode]="formMode" [entityId]="selectedId" (saved)="onSaved()"> </app-edit-role-dialog>
```

### 2. Shared service with `BehaviorSubject` — cross-component / siblings

```ts
// service
@Injectable({ providedIn: "root" })
export class MyStateService {
    private itemSubject = new BehaviorSubject<Item | null>(null);
    item$ = this.itemSubject.asObservable();

    setItem(item: Item) {
        this.itemSubject.next(item);
    }
    getItem() {
        return this.itemSubject.value;
    }
}
```

```ts
// any component
this.myStateService.item$.subscribe((item) => {
    this.item = item;
});
// or: isLoading$ = this.myService.isLoadingSubject.asObservable();
```

- **Loading state**: every service exposes `isLoadingSubject = new BehaviorSubject<boolean>(false)`. Components bind to it via `isLoading$ = this.service.isLoadingSubject.asObservable()` and use `(isLoading$ | async)` in templates.
- **Siblings**: coordinate through the shared parent component (parent holds dialog flags and selected entity) or through a shared service.

---

## Dialog Pattern

All dialogs use **`p-dialog` with a boolean visibility flag** — never `DynamicDialog` for regular feature dialogs (only used in `erp-rich-text` for the variable picker).

### Standard pattern

**Component TS:**

```ts
showDialog = false;
currentItem?: MyItem;

openDialog(item: MyItem) {
  this.currentItem = item;
  this.showDialog = true;
}

onDialogClose() {
  this.showDialog = false;
  this.currentItem = undefined;
}

confirm() {
  this.myService.doAction(this.currentItem!.id).subscribe({
    next: (response: any) => {
      if (!response?.success) { /* show error toast */ return; }
      this.messageService.add({ severity: 'success', summary: this.translate.instant('common.success'), detail: this.translate.instant('myModule.messages.done') });
      this.showDialog = false;
    }
  });
}
```

**Template:**

```html
<p-dialog [(visible)]="showDialog" [modal]="true" [style]="{ width: '480px' }" [draggable]="false" [resizable]="false" (onHide)="onDialogClose()">
    <ng-template pTemplate="header">
        <h3>{{ 'myModule.dialog.title' | translate }}</h3>
    </ng-template>

    <p>{{ 'myModule.dialog.message' | translate: { name: currentItem?.name } }}</p>

    <ng-template pTemplate="footer">
        <p-button [label]="'common.cancel' | translate" icon="pi pi-times" (onClick)="onDialogClose()" [disabled]="!!(isLoading$ | async)"> </p-button>
        <p-button severity="danger" [label]="'common.confirm' | translate" (onClick)="confirm()" [disabled]="!!(isLoading$ | async)"> </p-button>
    </ng-template>
</p-dialog>
```

**Rules:**

- `[modal]="true"`, `[draggable]="false"`, `[resizable]="false"` on every dialog.
- Always disable action buttons with `[disabled]="!!(isLoading$ | async)"` during API calls.
- Destructive actions use `severity="danger"`.
- Always use translated strings for `summary` and `detail` in `messageService.add()`.

---

## Pagination Pattern

All list screens use **PrimeNG `p-table` with `[lazy]="true"`** and **cursor-based pagination via negative page numbers**.

### How the cursor works

```
page 1 → lastEntityId = -1
page 2 → lastEntityId = -2
page N → lastEntityId = -N
```

### Component pattern

```ts
// State
first = 0;           // row offset (managed by p-table)
rows = 10;           // rows per page
totalRecords = 0;    // total count from server
tableLoadingSpinner = false;

loadItems(forceReload = false): void {
  this.tableLoadingSpinner = true;
  const currentPage = Math.floor(this.first / this.rows) + 1;
  const cursor = -currentPage;   // negative page number

  this.myService.listItems(cursor, this.rows, this.textFilter).subscribe({
    next: (response: any) => {
      if (!response?.success) { /* handle error */ return; }
      this.totalRecords = Number(response.message.Total_Count);
      this.items = Object.values(response.message.Items_List).map((item: any) => ({ ... }));
    },
    complete: () => { this.tableLoadingSpinner = false; }
  });
}

onPageChange(event: any): void {
  this.first = event.first;
  this.rows = event.rows;
  this.loadItems();
}

onSearch(): void {
  this.first = 0;   // reset to page 1 on new search
  this.loadItems();
}
```

### Template

```html
<p-table [value]="items" [paginator]="true" [lazy]="true" [first]="first" [rows]="rows" [totalRecords]="totalRecords" [rowsPerPageOptions]="[10, 25, 50, 100]" [showCurrentPageReport]="true" currentPageReportTemplate="{{ 'common.pagination.report' | translate }}" (onLazyLoad)="onPageChange($event)"> ... </p-table>
```

- `[lazy]="true"` — server-side pagination (most lists).
- `[lazy]="false"` — client-side pagination for small datasets loaded all at once (e.g. groups).
- Search/filter always resets `first = 0` before reloading.
- `rowsPerPageOptions` is always `[10, 25, 50, 100]`.
