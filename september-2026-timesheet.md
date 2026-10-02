# September 2026 Timesheet

Generated from Git history for **September 2026**. **Billable hours** follow the agreed weekly pattern (Sun 5, Mon 2, Tue 2, Wed 2, Thu 5, Fri 7, Sat 7). **One row per calendar day that has at least one commit**; the hour value is the scheduled hours for that weekday (not derived from commit count), so the total reflects **planned capacity on days you actually shipped code**.

Below: (1) invoice-style summary table, (2) **detailed technical log** with commit hashes and what changed, for a clear audit trail.

---

## Summary table

| Date   | Category Code | Project | Task                          | Sub-Task                                                                                                                                                                                                                                                                                                    | Hours |
| ------ | ------------- | ------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 06-Sep | Angular       | ERP     | Entity Module                 | Built the ready-to-close admin workflow so completed donation requests can be reviewed and closed with a clear audit trail, and completed attachment handling so users can upload, list, and manage proof files without losing context across roles. | 5     |
| 09-Sep | Angular       | ERP     | Form Validation & UX          | Moved fulfillment proof submission from a cramped dialog onto a dedicated page, giving donors a clearer multi-step flow and tightening related list, review, and validation screens so the workflow stays consistent. | 2     |
| 21-Sep | Angular       | ERP     | API Integration               | Implemented the breakdown and partial-fulfillment workflow so donors and admins can split, review, confirm, or reject remaining work, and stabilized public-site language switching so Arabic and English stay in sync on landing and registration pages. | 2     |
| 22-Sep | Angular       | ERP     | UI/Layout                     | Hid unfinished navigation modules from the live menu so users only see ready features, and hardened entity details, admin review, and public landing shells for a cleaner, more reliable first impression. | 2     |
| 23-Sep | Angular       | ERP     | Form Validation & UX          | Stabilized skeleton loading on donation details screens to prevent layout shift, and enriched request context across donor, facility, charity, and vendor views so each role sees the same request story with less missing information. | 2     |
| 24-Sep | Angular       | ERP     | UI/Layout                     | Unified hidden-module navigation so dashboard and sidebar stay consistent, reordered donor commitment details for a clearer reading path, and fixed entity contact API parameters to reduce failed saves. | 5     |

---

## Detailed technical log (by date, with commits)

### 2026-09-06 — Sunday — **5 hours**

**Commits:** `0ebd3ea`

- **Ready-to-close workflow (`0ebd3ea`):** Added the admin ready-to-close list and details flow so completed donation requests can be reviewed and closed instead of staying open after fulfillment is done.
- **Attachment handling (`0ebd3ea`):** Completed donation attachment upload, listing, and pending-file picker behaviour so proof files stay attached through validation, vendor offers, and fulfillment screens.
- **Localization:** Added matching English and Arabic keys for the new close and attachment actions.

---

### 2026-09-09 — Wednesday — **2 hours**

**Commits:** `34d7786`

- **Dedicated fulfillment proof page (`34d7786`):** Converted `SubmitFulfillmentProofDialogComponent` into a full routed page (`SubmitFulfillmentProofComponent`) so donors have enough space for files, notes, and validation without a cramped modal.
- **Related workflow cleanup:** Updated donor commitment details, facility fulfillment review/list, and validation lists to open the new page and keep status actions aligned.

---

### 2026-09-21 — Monday — **2 hours**

**Commits:** `6089cfa`

- **Breakdown / partial fulfillment (`6089cfa`):** Built the breakdown feature from scratch — create-breakdown page, request list/details, apply/confirm/reject dialogs, admin review list, and `DonationBreakdownService` — so remaining work can be split and tracked instead of treating every request as all-or-nothing.
- **Public language switching (`6089cfa`):** Stabilized `LanguageDirService` and public landing/registration templates so guests keep the correct Arabic or English layout when switching language.
- **i18n:** Added ~180 keys in both `en.json` and `ar.json` for breakdown statuses, actions, and public copy.

---

### 2026-09-22 — Tuesday — **2 hours**

**Commits:** `9e25bf5`

- **Hide unfinished modules (`9e25bf5`):** Updated `masajid-workspace.config.ts` and `static-navigation.config.ts` so incomplete donation modules no longer appear in the live menu.
- **Shell hardening:** Simplified shared entity details, tightened pending-review details markup, and cleaned public header/hero styles plus system-administration and summary routing so unfinished entry points are not exposed.

---

### 2026-09-23 — Wednesday — **2 hours**

**Commits:** `e8a83c7`

- **Details skeletons (`e8a83c7`):** Aligned skeleton states on facility request, vendor offer, vendor request, charity representation, and donor public details so loading no longer jumps the layout.
- **Shared request context:** Passed richer request context across those role-specific details screens so category, status, and related records stay visible without extra navigation.

---

### 2026-09-24 — Thursday — **5 hours**

**Commits:** `866309e`

- **Unified hidden navigation (`866309e`):** Synced workspace config, static navigation, app menu, dashboard, and profile menu so hidden modules stay hidden everywhere, not only in one menu.
- **Commitment details reorder (`866309e`):** Reordered donor commitment details sections for a clearer path from request summary to fulfillment actions.
- **Entity contact params (`866309e`):** Corrected entity contact API parameters in `EntitiesService` to prevent failed contact updates.

---

## Summary

| Metric | Value |
| ------ | ----- |
| **Total Working Days** | 6 |
| **Total Hours** | 18 hours |
| **Total Commits** | 6 |
