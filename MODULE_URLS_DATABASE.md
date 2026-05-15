# Module and Function URLs for Database

This document contains all URLs for functions and modules in the ERP system, organized by function hierarchy.

## Functions (FunctionID Mapping)

**Note:** DBS and HR are NOT functions in the backend. Summary and Human Resources modules exist at root level, not under functions.

### 1. System Administration (SysAdm - FunctionID: 2)

**Base URL:** `/system-administration`

| Module Code | Module Name          | URL                                           | Description                        |
| ----------- | -------------------- | --------------------------------------------- | ---------------------------------- |
| SDB         | Dashboard            | `/` or `/system-administration/dashboard`     | Main dashboard                     |
| ERPF        | ERP Functions        | `/system-administration/erp-functions`        | ERP Functions management           |
| ERPM        | ERP Modules          | `/system-administration/erp-modules`          | ERP Modules management             |
| SCP         | System Control Panel | `/system-administration/system-control-panel` | System control panel (Coming Soon) |

**ERP Functions Sub-routes:**

- `/system-administration/erp-functions/list` - Functions list
- `/system-administration/erp-functions/new` - Create new function
- `/system-administration/erp-functions/:id` - Function details
- `/system-administration/erp-functions/:id/edit` - Edit function

**ERP Modules Sub-routes:**

- `/system-administration/erp-modules/list` - Modules list
- `/system-administration/erp-modules/new` - Create new module
- `/system-administration/erp-modules/:id` - Module details
- `/system-administration/erp-modules/:id/edit` - Edit module

### 2. Entity Administration (EntAdm - FunctionID: 3)

**Base URL:** `/company-administration`

| Module Code | Module Name     | URL                                      | Description                   |
| ----------- | --------------- | ---------------------------------------- | ----------------------------- |
| ENTDT       | Entities        | `/entity-administration/entities`        | Entities management           |
| USRACC      | User Accounts   | `/entity-administration/user-accounts`   | User accounts management      |
| WF          | Workflows       | `/entity-administration/workflows`       | Workflows management          |
| Roles       | Roles           | `/entity-administration/roles`           | Roles management              |
| EACC        | Entity Accounts | `/entity-administration/entity-accounts` | Entity accounts (Coming Soon) |

**Entities Sub-routes:**

- `/entity-administration/entities/list` - Entities list
- `/entity-administration/entities/new` - Create new entity
- `/entity-administration/entities/:id` - Entity details
- `/entity-administration/entities/:id/edit` - Edit entity

**Roles Sub-routes:**

- `/entity-administration/roles/list` - Roles list
- `/entity-administration/roles/new` - Create new role
- `/entity-administration/roles/:id` - Role details
- `/entity-administration/roles/:id/edit` - Edit role

### 3. Document Control (DC - FunctionID: 4)

**Base URL:** `/document-control`

| Module Code | Module Name      | URL                 | Description                 |
| ----------- | ---------------- | ------------------- | --------------------------- |
| SHDOC       | Shared Documents | `/document-control` | Shared documents management |

### 4. Finance & Accounting (FIN - FunctionID: 5)

**Base URL:** `/financials`

| Module Code | Module Name         | URL                               | Description                       |
| ----------- | ------------------- | --------------------------------- | --------------------------------- |
| CINV        | Invoices            | `/financials`                     | Invoices management               |
| FCOA        | Chart of Accounts   | `/financials/chart-of-accounts`   | Chart of accounts (Coming Soon)   |
| AP          | Account Payables    | `/financials/account-payables`    | Account payables (Coming Soon)    |
| AR          | Account Receivables | `/financials/account-receivables` | Account receivables (Coming Soon) |
| GL          | General Ledger      | `/financials/general-ledger`      | General ledger (Coming Soon)      |

### 5. Customer Relation Management (CRM - FunctionID: 7)

**Base URL:** `/customer-relation-management` (Not yet in routing, placeholder modules created)

| Module Code | Module Name         | URL                                                 | Description                       |
| ----------- | ------------------- | --------------------------------------------------- | --------------------------------- |
| CLNT        | Clients Details     | `/customer-relation-management/clients-details`     | Clients management (Coming Soon)  |
| EST         | Estimation          | `/customer-relation-management/estimation`          | Estimation (Coming Soon)          |
| TND         | Tendering           | `/customer-relation-management/tendering`           | Tendering (Coming Soon)           |
| MC          | Main Contracts      | `/customer-relation-management/main-contracts`      | Main contracts (Coming Soon)      |
| CINV        | Customers Invoicing | `/customer-relation-management/customers-invoicing` | Customers invoicing (Coming Soon) |

### 6. Supply Chain Management (SCM - FunctionID: 8)

**Base URL:** `/supply-chain-management` (Not yet in routing, placeholder modules created)

| Module Code | Module Name       | URL                                          | Description                      |
| ----------- | ----------------- | -------------------------------------------- | -------------------------------- |
| VND         | Vendors Details   | `/supply-chain-management/vendors-details`   | Vendors management (Coming Soon) |
| PO          | Purchase Orders   | `/supply-chain-management/purchase-orders`   | Purchase orders (Coming Soon)    |
| SC          | Subcontracts      | `/supply-chain-management/subcontracts`      | Subcontracts (Coming Soon)       |
| VINV        | Vendors Invoicing | `/supply-chain-management/vendors-invoicing` | Vendors invoicing (Coming Soon)  |

### 7. Project Controls (PC - FunctionID: 9)

**Base URL:** `/project-controls` (Not yet in routing, placeholder modules created)

| Module Code | Module Name              | URL                                          | Description                      |
| ----------- | ------------------------ | -------------------------------------------- | -------------------------------- |
| WBS         | Work Breakdown Structure | `/project-controls/work-breakdown-structure` | WBS (Coming Soon)                |
| CBS         | Cost Breakdown Structure | `/project-controls/cost-breakdown-structure` | CBS (Coming Soon)                |
| QS          | Quantity Surveying       | `/project-controls/quantity-surveying`       | Quantity surveying (Coming Soon) |
| BUDG        | Budgeting                | `/project-controls/budgeting`                | Budgeting (Coming Soon)          |
| CRPT        | Cost Reports             | `/project-controls/cost-reports`             | Cost reports (Coming Soon)       |
| PRPT        | Progress Reports         | `/project-controls/progress-reports`         | Progress reports (Coming Soon)   |

---

## Root Level Modules (Not Under Functions)

### Summary Modules (No Function - Root Level)

**Base URL:** `/summary`

| Module Code | Module Name   | URL                      | Description              |
| ----------- | ------------- | ------------------------ | ------------------------ |
| ACT         | Actions       | `/summary/actions`       | User actions page        |
| NOT         | Notifications | `/summary/notifications` | Notifications page       |
| PRF         | Profile       | `/summary/profile`       | User profile page        |
| SET         | Settings      | `/summary/settings`      | User settings page       |
| LGOT        | Logout        | N/A                      | Logout action (no route) |

### Human Resources Modules (No Function - Root Level)

**Base URL:** `/human-resources`

| Module Code | Module Name           | URL                                      | Description                       |
| ----------- | --------------------- | ---------------------------------------- | --------------------------------- |
| TS          | Timesheets            | `/human-resources/timesheets`            | Employee timesheets               |
| TS_ADMIN    | Admin Timesheets      | `/human-resources/admin-timesheets`      | Admin timesheets view             |
| TS_SUP      | Supervisor Timesheets | `/human-resources/supervisor-timesheets` | Supervisor timesheets view        |
| CONTRACT    | Contract              | `/human-resources/contract`              | Contract management               |
| OC          | Organization Charts   | `/human-resources/organization-charts`   | Organization charts (Coming Soon) |
| PRSN        | Personnel Details     | `/human-resources/personnel-details`     | Personnel details (Coming Soon)   |

---

## SQL Insert Statements Template

```sql
-- Functions Table (Only 7 functions - DBS and HR do NOT exist)
INSERT INTO Functions (FunctionID, Code, Name, Name_Regional, Default_Order, URL) VALUES
(2, 'SysAdm', 'System Administration', 'إدارة النظام', 2, '/system-administration'),
(3, 'EntAdm', 'Entity Administration', 'إدارة الكيانات', 3, '/company-administration'),
(4, 'DC', 'Document Control', 'التحكم في المستندات', 4, '/document-control'),
(5, 'FIN', 'Finance & Accounting', 'المالية والمحاسبة', 5, '/financials'),
(7, 'CRM', 'Customer Relation Management', 'إدارة علاقات العملاء', 7, '/customer-relation-management'),
(8, 'SCM', 'Supply Chain Management', 'إدارة سلسلة التوريد', 8, '/supply-chain-management'),
(9, 'PC', 'Project Controls', 'التحكم في المشاريع', 9, '/project-controls');

-- Modules Table
INSERT INTO Modules (ModuleID, FunctionID, Code, Name, Name_Regional, Default_Order, URL, Is_Implemented) VALUES
-- Summary Modules (No FunctionID - NULL or 0, depending on your schema)
(1, NULL, 'ACT', 'Actions', 'الإجراءات', 1, '/summary/actions', 1),
(2, NULL, 'NOT', 'Notifications', 'الإشعارات', 2, '/summary/notifications', 1),
(3, NULL, 'PRF', 'Profile', 'الملف الشخصي', 3, '/summary/profile', 1),
(4, NULL, 'SET', 'Settings', 'الإعدادات', 4, '/summary/settings', 1),
(5, NULL, 'LGOT', 'Logout', 'تسجيل الخروج', 5, NULL, 1),

-- System Administration Modules
(6, 2, 'SDB', 'Dashboard', 'لوحة التحكم', 1, '/system-administration/dashboard', 1),
(7, 2, 'ERPF', 'ERP Functions', 'وظائف النظام', 2, '/system-administration/erp-functions', 1),
(8, 2, 'ERPM', 'ERP Modules', 'وحدات النظام', 3, '/system-administration/erp-modules', 1),
(9, 2, 'SCP', 'System Control Panel', 'لوحة تحكم النظام', 4, '/system-administration/system-control-panel', 0),

-- Entity Administration Modules
(10, 3, 'ENTDT', 'Entities', 'الكيانات', 1, '/entity-administration/entities', 1),
(11, 3, 'USRACC', 'User Accounts', 'حسابات المستخدمين', 2, '/entity-administration/user-accounts', 1),
(12, 3, 'WF', 'Workflows', 'سير العمل', 3, '/entity-administration/workflows', 1),
(13, 3, 'ROLES', 'Roles', 'الأدوار', 4, '/entity-administration/roles', 1),
(14, 3, 'EACC', 'Entity Accounts', 'حسابات الكيانات', 5, '/entity-administration/entity-accounts', 0),

-- Document Control Modules
(15, 4, 'SHDOC', 'Shared Documents', 'المستندات المشتركة', 1, '/document-control', 1),

-- Finance & Accounting Modules
(16, 5, 'CINV', 'Invoices', 'الفواتير', 1, '/financials', 1),
(17, 5, 'FCOA', 'Chart of Accounts', 'دليل الحسابات', 2, '/financials/chart-of-accounts', 0),
(18, 5, 'AP', 'Account Payables', 'الحسابات الدائنة', 3, '/financials/account-payables', 0),
(19, 5, 'AR', 'Account Receivables', 'الحسابات المدينة', 4, '/financials/account-receivables', 0),
(20, 5, 'GL', 'General Ledger', 'دفتر الأستاذ العام', 5, '/financials/general-ledger', 0),

-- Human Resources Modules (No FunctionID - NULL or 0)
(21, NULL, 'TS', 'Timesheets', 'سجلات الوقت', 1, '/human-resources/timesheets', 1),
(22, NULL, 'TS_ADMIN', 'Admin Timesheets', 'سجلات الوقت للمدير', 2, '/human-resources/admin-timesheets', 1),
(23, NULL, 'TS_SUP', 'Supervisor Timesheets', 'سجلات الوقت للمشرف', 3, '/human-resources/supervisor-timesheets', 1),
(24, NULL, 'CONTRACT', 'Contract', 'العقود', 4, '/human-resources/contract', 1),
(25, NULL, 'OC', 'Organization Charts', 'الهياكل التنظيمية', 5, '/human-resources/organization-charts', 0),
(26, NULL, 'PRSN', 'Personnel Details', 'تفاصيل الموظفين', 6, '/human-resources/personnel-details', 0),

-- Customer Relation Management Modules
(27, 7, 'CLNT', 'Clients Details', 'تفاصيل العملاء', 1, '/customer-relation-management/clients-details', 0),
(28, 7, 'EST', 'Estimation', 'التقديرات', 2, '/customer-relation-management/estimation', 0),
(29, 7, 'TND', 'Tendering', 'المناقصات', 3, '/customer-relation-management/tendering', 0),
(30, 7, 'MC', 'Main Contracts', 'العقود الرئيسية', 4, '/customer-relation-management/main-contracts', 0),
(31, 7, 'CINV_CRM', 'Customers Invoicing', 'فوترة العملاء', 5, '/customer-relation-management/customers-invoicing', 0),

-- Supply Chain Management Modules
(32, 8, 'VND', 'Vendors Details', 'تفاصيل الموردين', 1, '/supply-chain-management/vendors-details', 0),
(33, 8, 'PO', 'Purchase Orders', 'أوامر الشراء', 2, '/supply-chain-management/purchase-orders', 0),
(34, 8, 'SC', 'Subcontracts', 'المقاولات الفرعية', 3, '/supply-chain-management/subcontracts', 0),
(35, 8, 'VINV', 'Vendors Invoicing', 'فوترة الموردين', 4, '/supply-chain-management/vendors-invoicing', 0),

-- Project Controls Modules
(36, 9, 'WBS', 'Work Breakdown Structure', 'هيكل تقسيم العمل', 1, '/project-controls/work-breakdown-structure', 0),
(37, 9, 'CBS', 'Cost Breakdown Structure', 'هيكل تقسيم التكلفة', 2, '/project-controls/cost-breakdown-structure', 0),
(38, 9, 'QS', 'Quantity Surveying', 'قياس الكميات', 3, '/project-controls/quantity-surveying', 0),
(39, 9, 'BUDG', 'Budgeting', 'الميزانية', 4, '/project-controls/budgeting', 0),
(40, 9, 'CRPT', 'Cost Reports', 'تقارير التكلفة', 5, '/project-controls/cost-reports', 0),
(41, 9, 'PRPT', 'Progress Reports', 'تقارير التقدم', 6, '/project-controls/progress-reports', 0);
```

---

## Notes

1. **Functions**: Only 7 functions exist in the backend: SysAdm, EntAdm, DC, FIN, CRM, SCM, PC. DBS and HR are NOT functions.

2. **Root Level Modules**: Summary and Human Resources modules exist at root level (not under functions):
    - Summary modules: ACT, NOT, PRF, SET, LGOT (under `/summary` route)
    - Human Resources modules: TS, TS_ADMIN, TS_SUP, CONTRACT, OC, PRSN (under `/human-resources` route)

3. **Is_Implemented**:
    - `1` = Module is fully implemented
    - `0` = Module is a placeholder (Coming Soon)

4. **URL Format**:
    - Base URLs are relative paths from the root
    - Sub-routes are appended to base URLs
    - Dynamic routes use `:id` parameter

5. **Module Codes**:
    - Use the codes listed above for consistency
    - Some modules share codes (e.g., CINV appears in both FIN and CRM) - differentiate with suffixes if needed

6. **Function Order**:
    - Default_Order determines display order in menus
    - Lower numbers appear first

7. **Missing Routes**:
    - CRM, SCM, and PC functions are not yet added to main routing
    - Add them to `app-routing.module.ts` when ready to implement

8. **FunctionID for Root Modules**:
    - Summary and Human Resources modules should have `FunctionID = NULL` or `0` in the database
    - They are not associated with any function
