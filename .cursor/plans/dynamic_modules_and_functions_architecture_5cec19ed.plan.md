---
name: Dynamic Modules and Functions Architecture
overview: Transform the application to use dynamic menu and dashboard generation based on Functions_Details and Modules_Details from localStorage. Replace hardcoded routes with dynamic module-based routing, implement hierarchical menu structure (Functions → Modules), and create a ModuleGuard for route protection.
todos:
    - id: create-module-navigation-service
      content: Create ModuleNavigationService to load, parse, and organize modules/functions from localStorage with route resolution
      status: completed
    - id: create-module-guard
      content: Create ModuleGuard to validate module access before route activation
      status: completed
    - id: update-menu-component
      content: Update app-menu.component.ts to generate menu dynamically from ModuleNavigationService
      status: completed
    - id: update-dashboard-component
      content: Update dashboard.component.ts and HTML to display functions and modules dynamically
      status: completed
    - id: update-routing
      content: Add dynamic module route in app-routing.module.ts and create dynamic-module routing module
      status: completed
    - id: update-models
      content: Add URL field to IModuleDetail and create menu/dashboard helper interfaces
      status: completed
    - id: create-route-mapping
      content: Create route mapping for existing modules (module code → route path)
      status: completed
    - id: handle-special-cases
      content: "Handle special cases: logout command, dashboard route, disabled modules"
      status: completed
---

# Dynamic Modules and Functions Architecture

## Overview

Transform the application to dynamically generate menus and dashboards from localStorage data (`Functions_Details` and `Modules_Details`). Replace all hardcoded routes with dynamic module-based routing using module codes.

## Architecture Components

### 1. Core Services

#### **ModuleNavigationService** (`src/app/core/services/module-navigation.service.ts`)

- **Purpose**: Central service for module navigation logic
- **Responsibilities**:
    - Load modules and functions from localStorage
    - Group modules by function
    - Sort by `Default_Order`
    - **Route Resolution**:
        - Convert function codes to slugs (e.g., `EntAdm` → `entity-administration`)
        - Convert module codes to slugs (e.g., `ENTDT` → `entities`)
        - Generate routes in format: `{functionSlug}/{moduleSlug}/{nestedRoute}`
        - Use `URL` field from module data to extract nested route
        - Fallback to code-to-slug mapping if URL not available
    - Check if module route exists/is implemented
    - Get module logo URLs
    - Handle regional names based on `Account_Settings.Language`
    - **Code-to-Slug Conversion**: Maintain mappings for function and module codes to URL-friendly slugs

#### **ModuleGuard** (`src/app/core/guards/module.guard.ts`)

- **Purpose**: Protect routes by validating module access
- **Logic**:
    - Extract `functionCode` and `moduleCode` from route params (e.g., `/entity-administration/entities/list`)
    - Convert slugs back to codes using `ModuleNavigationService`
    - Check if function exists in `Functions_Details`
    - Check if module exists in `Modules_Details` and belongs to the function
    - Check if module is active
    - Redirect to dashboard if module not found/inactive

### 2. Data Models

#### **Update `account-status.model.ts`**

- Add `URL` field to `IModuleDetail` interface (if not present)
- Create helper interfaces for menu/dashboard items:

    ```typescript
    export interface IMenuFunction {
        code: string;
        name: string;
        nameRegional: string;
        defaultOrder: number;
        icon?: string; // module logo URL
        modules: IMenuModule[];
    }

    export interface IMenuModule {
        code: string;
        name: string;
        nameRegional: string;
        defaultOrder: number;
        route: string; // Format: /{functionSlug}/{moduleSlug}/{nestedRoute}
        icon?: string;
        isImplemented: boolean;
        moduleId: number;
        functionCode: string; // Parent function code
    }
    ```

### 3. Dynamic Menu Component

#### **Update `app-menu.component.ts`**

- Remove hardcoded menu structure
- Inject `ModuleNavigationService`
- Call `buildMenu()` to generate menu from localStorage:
    ```typescript
    buildMenu(): void {
      const functions = this.moduleNavigationService.getFunctionsWithModules();
      this.model = functions.map(func => ({
        label: this.getDisplayName(func),
        icon: func.icon || 'fa fa-folder',
        items: func.modules.map(module => ({
          label: this.getDisplayName(module),
          icon: module.icon || 'fa fa-file',
          routerLink: module.isImplemented ? [module.route] : null,
          disabled: !module.isImplemented,
          command: !module.isImplemented ? () => this.showComingSoon(module) : null
        }))
      }));
    }
    ```

### 4. Dynamic Dashboard Component

#### **Update `dashboard.component.ts`**

- Remove hardcoded categories
- Use `ModuleNavigationService` to get functions with modules
- Generate dashboard sections dynamically:
    ```typescript
    getDashboardCategories(): IMenuFunction[] {
      return this.moduleNavigationService.getFunctionsWithModules();
    }
    ```

#### **Update `dashboard.component.html`**

- Replace hardcoded cards with `*ngFor` loops
- Show functions as section headers (`p-card` headers)
- Show modules as cards within each function section
- Handle disabled modules (grayed out, no click)
- Display module logos if available

### 5. Dynamic Routing

#### **Route Structure: `function_code/module_code/nested_component`**

Routes follow the pattern: `{functionCode}/{moduleCode}/{nestedRoute}`

**Examples:**

- `company-administration/entities/list`
- `summary/actions` (no nested route)
- `human-resources/timesheets`
- `financials/chart-of-accounts`

#### **Update `app-routing.module.ts`**

- Add dynamic catch-all route for function/module pattern:
    ```typescript
    {
      path: ':functionCode/:moduleCode',
      canActivate: [AuthGuard, ModuleGuard],
      loadChildren: () => import('./modules/dynamic-module/dynamic-module.module').then(m => m.DynamicModuleModule)
    },
    {
      path: ':functionCode/:moduleCode/:nestedRoute',
      canActivate: [AuthGuard, ModuleGuard],
      loadChildren: () => import('./modules/dynamic-module/dynamic-module.module').then(m => m.DynamicModuleModule)
    }
    ```

#### **Create Dynamic Module Router** (`src/app/modules/dynamic-module/dynamic-module-routing.module.ts`)

- Extract `functionCode` and `moduleCode` from route params
- Use `ModuleNavigationService` to resolve to actual module component
- Handle nested routes (e.g., `/list`, `/new`, `/:id`)
- Redirect to appropriate existing module route based on module URL field
- Handle unimplemented modules (show "Coming Soon" component)

### 6. Route Resolution Strategy

#### **Route Generation Pattern**

Routes are generated as: `{functionSlug}/{moduleSlug}/{nestedRoute}`

**Step 1: Convert Function Code to Slug**

- Function code: `EntAdm` → Slug: `entity-administration`
- Use mapping or convention-based conversion
- Store in `ModuleNavigationService`

**Step 2: Convert Module Code to Slug**

- Module code: `ENTDT` → Slug: `entities`
- Use mapping or convention-based conversion
- Store in `ModuleNavigationService`

**Step 3: Append Nested Route**

- Use `URL` field from module data (e.g., `/list`, `/new`)
- If URL is empty, default to empty (just `function/module`)
- If URL has nested path, append it

**Route Resolution Priority:**

1. **Primary**: Use `URL` field from module API data
    - Parse: Extract function slug, module slug, and nested route
    - Example: URL = `/entity-administration/entities/list` → Parse to components

2. **Fallback**: Use code-to-slug mapping
    - Function code → Function slug mapping
    - Module code → Module slug mapping
    - Combine: `{functionSlug}/{moduleSlug}`

3. **Default**: Convention-based slug generation
    - Convert codes to kebab-case slugs
    - Example: `ENTDT` → `entdt` or use name-based: `Entity Details` → `entity-details`

### 7. Implementation Steps

1. **Create ModuleNavigationService**
    - Load and parse Functions_Details and Modules_Details
    - Group modules by FunctionID
    - Sort by Default_Order
    - Resolve routes (URL field or mapping)

2. **Create ModuleGuard**
    - Validate module access
    - Check localStorage for module existence

3. **Update Menu Component**
    - Replace hardcoded menu with dynamic generation
    - Handle disabled modules
    - Load module logos

4. **Update Dashboard Component**
    - Replace hardcoded categories with dynamic generation
    - Group modules by function
    - Display module logos

5. **Update Routing**
    - Add dynamic routes: `:functionCode/:moduleCode` and `:functionCode/:moduleCode/:nestedRoute`
    - Create dynamic module router that resolves function/module codes to actual components
    - Map existing module routes to new dynamic structure
    - Update all existing route definitions to use new pattern

6. **Update Models**
    - Add URL to IModuleDetail if missing
    - Create menu/dashboard interfaces

7. **Handle Edge Cases**
    - **Modules without URLs**: Use code-to-slug mapping to generate route
    - **Unimplemented modules**: Show disabled state, route to "Coming Soon" component
    - **Missing function/module codes**: Use convention-based slug generation (kebab-case)
    - **Missing logos**: Use default icons based on function type
    - **Regional names**: Respect `Account_Settings.Language` for display names
    - **Nested routes**: Parse URL field to extract nested path (e.g., `/list`, `/new`, `/:id`)
    - **Route conflicts**: Ensure function/module slug combinations are unique

### 8. Route Mapping for Existing Modules

Create code-to-slug mappings in `ModuleNavigationService`:

```typescript
// Function Code → Function Slug Mapping
private readonly FUNCTION_SLUG_MAP: Record<string, string> = {
  'DBS': 'summary',                    // Dashboard Summary
  'SysAdm': 'system-administration',   // System Administration
  'EntAdm': 'company-administration',  // Entity Administration
  'DC': 'document-control',            // Document Control
  'FIN': 'financials',                 // Finance & Accounting
  'HR': 'human-resources',             // Human Resources
  'CRM': 'crm',                        // Customer Relation Management
  'SCM': 'scm',                        // Supply Chain Management
  'PC': 'project-controls'             // Project Controls
};

// Module Code → Module Slug Mapping
private readonly MODULE_SLUG_MAP: Record<string, string> = {
  // Dashboard Summary (DBS)
  'ACT': 'actions',
  'NOT': 'notifications',
  'PRF': 'profile',
  'SET': 'settings',
  'LGOT': 'logout', // Special: command, not route

  // System Administration (SysAdm)
  'SDB': 'dashboard',
  'ERPF': 'erp-functions',
  'ERPM': 'erp-modules',
  'SCP': 'system-control-panel',

  // Entity Administration (EntAdm)
  'ENTDT': 'entities',
  'USRACC': 'users-details',
  'WF': 'workflows',
  'EACC': 'entity-accounts',

  // Document Control (DC)
  'SHDOC': 'shared-documents',

  // Finance & Accounting (FIN)
  'FCOA': 'chart-of-accounts',
  'AP': 'account-payables',
  'AR': 'account-receivables',
  'GL': 'general-ledger',

  // Human Resources (HR)
  'OC': 'organization-charts',
  'PRSN': 'personnel-details',
  'TS': 'timesheets',

  // CRM
  'CLNT': 'clients-details',
  'EST': 'estimation',
  'TND': 'tendering',
  'MC': 'main-contracts',
  'CINV': 'customers-invoicing',

  // SCM
  'VND': 'vendors-details',
  'PO': 'purchase-orders',
  'SC': 'subcontracts',
  'VINV': 'vendors-invoicing',

  // Project Controls
  'WBS': 'work-breakdown-structure',
  'CBS': 'cost-breakdown-structure',
  'QS': 'quantity-surveying',
  'BUDG': 'budgeting',
  'CRPT': 'cost-reports',
  'PRPT': 'progress-reports'
};

// Generate route: functionSlug/moduleSlug/nestedRoute
private generateRoute(functionCode: string, moduleCode: string, nestedRoute?: string): string {
  const functionSlug = this.FUNCTION_SLUG_MAP[functionCode] || functionCode.toLowerCase();
  const moduleSlug = this.MODULE_SLUG_MAP[moduleCode] || moduleCode.toLowerCase();
  const route = `/${functionSlug}/${moduleSlug}`;
  return nestedRoute ? `${route}/${nestedRoute}` : route;
}
```

### 9. Special Cases

- **Logout Module (LGOT)**:
    - Route: `/summary/logout` (but handle as command, not navigation)
    - Show in menu but execute logout command instead of navigation

- **Dashboard Module (SDB)**:
    - Route: `/summary/dashboard` or `/` (root)
    - Can be the default landing page

- **Settings & Configurations (ERPF, ERPM)**:
    - Routes: `/system-administration/erp-functions/list` and `/system-administration/erp-modules/list`
    - Keep as regular menu items under System Administration function

### 10. Route Examples

Based on the provided data structure:

| Function Code | Module Code | Generated Route | Example |

|--------------|-------------|-----------------|---------|

| `EntAdm` | `ENTDT` | `/entity-administration/entities/list` | Entity Details |

| `EntAdm` | `USRACC` | `/entity-administration/users-details` | User Accounts |

| `DBS` | `ACT` | `/summary/actions` | Actions |

| `DBS` | `NOT` | `/summary/notifications` | Notifications |

| `FIN` | `FCOA` | `/financials/chart-of-accounts` | Chart of Accounts |

| `HR` | `TS` | `/human-resources/timesheets` | Timesheets |

| `CRM` | `CLNT` | `/crm/clients-details` | Clients Details |

| `PC` | `WBS` | `/project-controls/work-breakdown-structure` | WBS |

### 11. Benefits

- **Single Source of Truth**: Menu and dashboard driven by backend data
- **Easy Maintenance**: Add new modules without code changes
- **User-Specific**: Each user sees only their assigned modules
- **Scalable**: Supports unlimited functions and modules
- **Consistent**: Same data structure for menu and dashboard

## Files to Create/Modify

### New Files:

- `src/app/core/services/module-navigation.service.ts`
- `src/app/core/guards/module.guard.ts`
- `src/app/modules/dynamic-module/dynamic-module.module.ts`
- `src/app/modules/dynamic-module/dynamic-module-routing.module.ts`
- `src/app/modules/dynamic-module/components/coming-soon/coming-soon.component.ts`

### Modified Files:

- `src/app/layout/app-menu/app.menu.component.ts`
- `src/app/modules/dashboard/dashboard.component.ts`
- `src/app/modules/dashboard/dashboard.component.html`
- `src/app/app-routing.module.ts`
- `src/app/core/models/account-status.model.ts`

## Route Structure Details

### Route Format: `/{functionSlug}/{moduleSlug}/{nestedRoute}`

**Examples:**

- `/entity-administration/entities/list` → Function: `EntAdm`, Module: `ENTDT`, Nested: `list`
- `/summary/actions` → Function: `DBS`, Module: `ACT`, Nested: (empty)
- `/human-resources/timesheets` → Function: `HR`, Module: `TS`, Nested: (empty)
- `/financials/chart-of-accounts` → Function: `FIN`, Module: `FCOA`, Nested: (empty)

### URL Field Parsing

When module has `URL` field (e.g., `/entity-administration/entities/list`):

1. Parse to extract: function slug, module slug, nested route
2. Use parsed components to generate route
3. If URL doesn't match pattern, use code-to-slug mapping

### Reverse Lookup (ModuleGuard)

When route is `/entity-administration/entities/list`:

1. Extract `functionSlug` = `company-administration`
2. Extract `moduleSlug` = `entities`
3. Extract `nestedRoute` = `list`
4. Convert slugs back to codes:
    - `company-administration` → `EntAdm` (function code)
    - `entities` → `ENTDT` (module code)

5. Validate in localStorage

## Questions to Clarify

1. Should we fetch module details (including URL) on app initialization, or rely on localStorage only?
2. For the URL field parsing - if URL is `/entity-administration/entities/list`, should we:
    - Parse it to extract function/module slugs, or
    - Use it as-is and just validate it matches the pattern?

3. How should we handle nested routes within modules (e.g., `/list`, `/new`, `/:id`)? Should they be part of the URL field or handled separately?
4. How should we handle module logos - fetch on-demand or cache in localStorage?
