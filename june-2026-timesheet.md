# June 2026 Timesheet

Generated from Git history for **June 2026**. **Billable hours** follow the agreed weekly pattern (Sun 5, Mon 2, Tue 2, Wed 2, Thu 5, Fri 7, Sat 7). **One row per calendar day that has at least one commit**; the hour value is the scheduled hours for that weekday (not derived from commit count), so the total reflects **planned capacity on days you actually shipped code**.

Below: (1) invoice-style summary table, (2) **detailed technical log** with commit hashes and what changed, for a clear audit trail.

---

## Summary table

| Date   | Category Code | Project      | Task              | Sub-Task (headline)                                                                 | Hours |
| ------ | ------------- | ------------ | ----------------- | ----------------------------------------------------------------------------------- | ----- |
| 06-Jun | Angular       | Masajid Work | Donation & Domain | Donation Process API spec; static nav Entity terminology; en/ar i18n alignment.       | 7     |
| 12-Jun | Angular       | Masajid Work | Donation Module   | Full donation-process module scaffold; categories CRUD UI with dialogs & validation. | 7     |
| 25-Jun | Angular       | Masajid Work | Registration & Nav | Entity contact geo fields; Leaflet location picker; Masajid user-type navigation.    | 5     |

---

## Detailed technical log (by date, with commits)

### 2026-06-06 — Saturday — **7 hours**

**Commits (newest first):** `9759a2b`, `c7f28fc`, `57f6c8c`

- **Donation Process API documentation (`57f6c8c`):** Authored **`Docs/donation-process-api.md`** (~1 800 lines) as the single source of truth for donation features — frontend integration patterns (`ApiService.callAPI`, pagination, permissions), full **endpoint index** (`100100`–`112006` across 12 API groups), request/response shapes, **`DAP13xxx`** error codes, status transitions, and attachment/storage cross-references. Added **`.cursor/rules/donation-process-api.mdc`** so AI-assisted work on donation modules picks up the spec automatically. Linked the new rule from **`project-context.mdc`**.
- **Static navigation terminology (`c7f28fc`):** Updated **`static-navigation.config.ts`** to revert May’s “Facility” naming back to **Entity** terminology for consistency with the broader ERP domain model — function label **Entity Administration**, module labels **System Entities**, **Manage Entities**, **Entity User Accounts**, and **Entity Storage Management**, with matching Arabic regional names.
- **i18n alignment (`9759a2b`):** Synced **`en.json`** and **`ar.json`** (~530 lines touched) so user-facing copy matches the navigation/config terminology — e.g. “Facilities Management” → **Entity Administration**, “Facility Details” → **Company Details**, “Facility Storage” → **Company Storage**, “Facility Representative” → **Entity Administrator**, and related storage/document-control strings.

---

### 2026-06-12 — Friday — **7 hours**

**Commits (newest first):** `50a7b19`, `56060e2`

- **Donation module scaffold (`56060e2`):** Built the full **`donation-process`** feature area — parent routing module plus **9 sub-modules** (reference, facility-requests, admin-review, browse, commitments, charity-representation, vendor-offers, validation). Created **models** (donation request, category, type, status, commitment, entity extra data), **services** wired to API request codes, and **list components** for each workflow stage. Added shared **`DonationCategoryPicker`** and **`DonationStatusBadge`** components. Extended **`static-navigation.config.ts`** with donation function/modules and wired **`app-routing.module.ts`**. Added **114 en/ar translation keys** for donation titles and labels.
- **Donation categories CRUD (`50a7b19`):** Refactored **`DonationCategoriesListComponent`** with improved table layout, sorting, and filtering. Introduced **create/edit form dialogs** with validation messages and business-error handling. Extended **`DonationReferenceService`** with add/update/activate/deactivate category API calls. Added **57 new en/ar keys** for form fields, actions, and validation copy.

---

### 2026-06-25 — Thursday — **5 hours**

**Commits (newest first):** `968e286`, `257155d`, `df53fe7`

- **Entity contact geo fields (`df53fe7`):** Added **city, latitude, and longitude** to entity contact management; removed fax number fields. Created **`PublicLookupService`** with country/currency mock data and alpha-3→alpha-2 mapping. Refactored all **4 registration components** (donor, vendor, facility, charity-centre) and **`PublicRegistrationService`** to the new data shape. Updated **`SharedEntityContactComponent`** UI and validation. Added **89 en/ar keys** for new contact/registration fields.
- **Leaflet location picker (`257155d`):** Integrated **Leaflet** map library (package + types + bundled marker assets). Built **`RegisterLocationPickerComponent`** (318-line map picker with country-centroid defaults, click-to-place, and coordinate binding). Wired into donor, vendor, facility, and charity-centre registration forms. Updated **`angular.json`** styles and global SCSS for Leaflet CSS.
- **Masajid user-type navigation (`968e286`):** Introduced **`MasajidUserType`** model and **`masajid-workspace.config.ts`** (281 lines) defining per-user-type function/module visibility. Added user-type persistence in **`LocalStorageService`** and dynamic function retrieval in **`ModuleNavigationService`**. Created **`DashboardResolverService`** for role-aware dashboard routing. Refactored **`AppMenuComponent`** and **`DashboardComponent`** to resolve modules by user type. Cleaned deprecated donation entries from static navigation config and improved icon mapping.

---

## Summary

| Metric | Value |
| ------ | ----- |
| **Working days (with commits)** | 3 |
| **Total billable hours (schedule)** | **19** |
| **Commits in period (`git rev-list`)** | **8** |

### How to read this for "reliable hours"

- **Hours** = agreed **day-of-week rate** on days where the repo shows work (see table at top of `timesheet-instructions.md`).
- **Detail** = **grouped commit narrative** above; you can verify any line with `git show <hash>`.
- **Light days:** If a date only has a tiny chore commit but still counts as a "commit day," the **hours stay on the schedule** unless you agree with the client to **move** that capacity to another day.
