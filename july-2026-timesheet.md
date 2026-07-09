# July 2026 Timesheet

Generated from Git history for **July 2026**. **Billable hours** follow the agreed weekly pattern (Sun 5, Mon 2, Tue 2, Wed 2, Thu 5, Fri 7, Sat 7). **One row per calendar day that has at least one commit**; the hour value is the scheduled hours for that weekday (not derived from commit count), so the total reflects **planned capacity on days you actually shipped code**.

Below: (1) invoice-style summary table, (2) **detailed technical log** with commit hashes and what changed, for a clear audit trail.

---

## Summary table

| Date   | Category Code | Project | Task                            | Sub-Task                                                                                                                                                                                                                                                                                                    | Hours |
| ------ | ------------- | ------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 02-Jul | Angular       | ERP     | API Integration                 | Enhanced the donation requests list with loading indicators and category/country columns, refactored the location picker with CSS variables for better theming, and integrated Leaflet map synchronization to significantly improve the location selection experience during registration.                   | 5     |
| 04-Jul | Angular       | ERP     | Form Validation & UX            | Refactored the preloader and language-switching logic to ensure smooth visual transitions, implemented comprehensive guest language support, optimized layout responsiveness with fixed headers, and strengthened login/2FA security with explicit validation checks.                               | 7     |
| 05-Jul | Angular       | ERP     | Project Setup & Configuration   | Optimized application deployment for Nginx compatibility by adjusting production base-href and documenting SPA fallback routing, refactored regional language handling to use centralized helper utilities, and streamlined authentication and preloader synchronization during language transitions. | 5     |
| 06-Jul | Angular       | ERP     | Entity Module                   | Refactored the entity contact edit dialog layout and form structure to provide consistent validation feedback and a more responsive layout, and simplified the donation requests service and workflow timeline templates to improve application maintainability.                                            | 2     |
| 07-Jul | Angular       | ERP     | Profile Module                  | Upgraded the location picker with skeleton loading UI for geolocation processes, and refactored workspace modules and role visibility to introduce dedicated Facility and Vendor profile modules with dynamic, role-restricted access and updated menu icons.                                                | 2     |

---

## Detailed technical log (by date, with commits)

### 2026-07-02 — Thursday — **5 hours**

**Commits (newest first):** `e92f61f`, `546fcd3`, `4385a81`

- **Donation Request List Enhancements (`4385a81`):** Added category and country columns to the facility requests list, complete with skeleton loading indicators to prevent layout shifts. Refactored the donation category picker to dynamically load categories on changes, improving data accuracy and user feedback.
- **Location Picker Refactoring (`546fcd3`):** Updated the location picker styles to utilize CSS variables, ensuring consistent theming across the application. Optimized the TypeScript logic with coordinate subscriptions and robust country code handling to ensure the map marker synchronizes perfectly with input changes.
- **Donation Process & Map Integration (`e92f61f`):** Enhanced the donation process management module by scaffolding new features and integrating Leaflet maps into registration forms. Refined data handling and translations to provide a more intuitive and seamless user experience.

---

### 2026-07-04 — Saturday — **7 hours**

**Commits (newest first):** `75104cf`, `5500918`, `780daf5`, `9ac0639`, `405691c`, `2ae1e73`, `8184627`, `c8e32e1`, `945db47`, `7df34fa`

- **GPS Geolocation & Country Resolution (`7df34fa`):** Upgraded the location picker component to automatically resolve and apply the detected country from GPS coordinates. Implemented clear error handling and localized user feedback for country resolution failures.
- **Preloader & Language Switch Refinements (`945db47`, `c8e32e1`, `405691c`):** Refactored preloader implementation and language handling logic. Introduced centralized methods in the translation service to show and hide the bootstrap preloader during language transitions, ensuring a smooth, flicker-free experience for users when switching between English and Arabic.
- **RTL & Language Direction Handling (`8184627`, `780daf5`, `75104cf`):** Refactored language direction handling across the application to utilize centralized helper methods in the local storage service. Implemented guest language support to ensure proper localization for non-authenticated visitors, and simplified RTL detection with a clean `isRtl` getter.
- **Responsive Layout & CSS Variables (`9ac0639`, `2ae1e73`):** Updated header positioning from sticky to fixed to ensure it remains visible at the top of the viewport on all screen sizes. Introduced CSS variables for header height, button text, and borders to improve theming consistency and layout responsiveness.
- **Login & 2FA Security Hardening (`5500918`):** Updated authentication and 2FA verification logic to explicitly check for false success responses, ensuring that business errors are properly caught and validation messages are clearly displayed to protect user accounts.

---

### 2026-07-05 — Sunday — **5 hours**

**Commits (newest first):** `f9c9c6a`, `6d801ba`, `f50bab7`

- **Nginx & SPA Deployment Optimization (`f9c9c6a`):** Configured the production build base-href to `/` in `angular.json` and updated `deploy.md` with detailed Nginx setup instructions and Single Page Application (SPA) fallback configurations to prevent 404 errors on client-side routes.
- **Centralized Regional Field Mapping (`6d801ba`):** Refactored regional data handling across core components (SharedEntityContact, SharedEntityDetails, SharedEntityForm, SharedAccount) to utilize the centralized `pickRequestContentField` utility. Removed redundant direct language checks, ensuring consistent and maintainability-friendly handling of localized fields.
- **Authentication & Language Sync (`f50bab7`):** Streamlined user authentication checks and language selection logic in `app.component.ts`. Synchronized document language attributes and improved localized name retrieval in the module navigation service to ensure a seamless transition when the language changes.

---

### 2026-07-06 — Monday — **2 hours**

**Commits (newest first):** `4255668`, `4e1c04a`

- **Entity Contact Dialog Refactoring (`4255668`):** Redesigned the SharedEntityContact component's edit dialog layout and form structure. Adjusted the dialog width, header styling, and form controls to utilize a more consistent layout with clear validation feedback, dramatically improving the user experience during contact updates.
- **Donation Request Timeline Cleanup (`4e1c04a`):** Refactored the `DonationRequestsService` and related models to simplify donation request ID extraction. Cleaned up the workflow timeline HTML templates by removing deprecated fields, enhancing code maintainability and visual clarity.

---

### 2026-07-07 — Tuesday — **2 hours**

**Commits (newest first):** `e25904a`, `226b1c0`

- **Location Picker Geolocation Skeletons (`e25904a`):** Enhanced the location picker component by integrating PrimeNG Skeleton loading states for the map and action buttons during geolocation processes, providing immediate visual feedback to users while their location is being resolved.
- **Role Visibility & Profile Modules (`226b1c0`):** Refactored workspace modules and role visibility to introduce dedicated Facility and Vendor profile modules (`FAC_PROFILE` and `VND_PROFILE`). Restrained module navigation access dynamically based on user type, updated menu icons, and added localized strings for entity details and edit actions in both English and Arabic.

---

## Summary

| Metric | Value |
| ------ | ----- |
| **Total Working Days** | 5 |
| **Total Hours** | 21 hours |
| **Total Commits** | 20 |
