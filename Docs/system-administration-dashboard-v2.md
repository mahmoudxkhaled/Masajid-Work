# System Administration Dashboard (v2 — observability)

This document describes the **rich observability** dashboard module: `system-dashboard-v2`.

## Route

| Item | Value |
|------|--------|
| **URL** | `/system-administration/dashboard-v2` |
| **Lazy module** | `system-dashboard-v2.module.ts` (`SystemDashboardV2Module`) |
| **Breadcrumb** | `layout.app-breadcrumb.systemAdminDashboardV2` |

## Purpose

Full observability UI: metrics (P50/P95/P99, RPS), health, alerts, rankings, logs search, traces, environment switch, auto-refresh. Data is **mocked** via `SystemDashboardV2MockDataSource` until APIs exist.

## Architecture

```
SystemDashboardV2Component
        │
        ▼
SystemDashboardV2Service
        │
        ▼
SystemDashboardV2MockDataSource
```

- **Models:** `system-dashboard-v2/models/dashboard-v2.models.ts`
- **Component:** `system-dashboard-v2/components/system-dashboard-v2/`
- **Legacy dashboard** (simpler): `system-dashboard/` at route `/system-administration/dashboard`

## Observability roadmap

See phases in this doc’s history; backend checklist: metrics store, log aggregation, trace backend (OTel), alert manager, health probes, RBAC.

---

_Last aligned with `src/app/modules/system-administration/system-dashboard-v2/`._
