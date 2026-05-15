# Timesheet Generation Instructions

## How to Use This File

Share this file with the AI assistant in any chat to automatically generate your monthly timesheet from Git commits.

---

## Step 1: Provide the Git Log with Dates

Run this command in your project folder and paste the output:

```bash
git log --since="YYYY-MM-01" --until="YYYY-MM-31" --pretty=format:"%ad | %h | %s" --date=short
```

**Replace:**

-   `YYYY-MM-01` with the first day of the month (e.g., `2025-12-01`)
-   `YYYY-MM-31` with the last day of the month (e.g., `2025-12-31`)

---

## Step 2: Working Hours Schedule

| Day       | Hours |
| --------- | ----- |
| Sunday    | 5     |
| Monday    | 2     |
| Tuesday   | 2     |
| Wednesday | 2     |
| Thursday  | 5     |
| Friday    | 7     |
| Saturday  | 7     |

---

## Step 3: Timesheet Format Required

| Date  | Category Code | Project | Task        | Sub-Task                                  | Hours |
| ----- | ------------- | ------- | ----------- | ----------------------------------------- | ----- |
| X-Mon | Angular       | ERP     | [Task Name] | [Detailed technical sub-task description] | X     |

---

## Step 4: Requirements

1. **Category Code:** Angular
2. **Project:** ERP
3. **Sub-Task Style:** Make sub-tasks very detailed and technical to reflect the effort and complexity of work done
4. **Group commits** by date and create meaningful task descriptions
5. **Calculate hours** based on the day of week from the schedule above
6. **Skip days** with no commits

---

## Step 4.1: Writing Style Guidelines (IMPORTANT)

### Humanize the Language

-   Use **simple, clear words** that anyone can understand
-   Avoid overly technical jargon that sounds robotic
-   Write like you're explaining to your manager what you accomplished

### Show the Effort & Value

-   Emphasize **why** the work matters, not just what was done
-   Highlight the **impact** on the project (better security, improved user experience, faster performance)
-   Show the **problem solved** or **goal achieved**

### Good vs Bad Examples

| Bad (Robotic)                        | Good (Humanized & Valuable)                                                                                             |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Implement 2FA verification component | Built a secure two-factor authentication system to protect user accounts from unauthorized access                       |
| Fix navigation bar issues            | Resolved critical navigation problems to ensure users can smoothly move through the application on all devices          |
| Update dependencies                  | Upgraded all project packages to latest secure versions, addressing potential security vulnerabilities                  |
| Refactor entity module               | Reorganized and cleaned up the entity management code for better maintainability and easier future development          |
| Add pagination                       | Improved application performance by implementing smart pagination that loads data only when needed, reducing load times |

### Key Phrases to Use

-   "to improve user experience..."
-   "to ensure security and reliability..."
-   "to enhance application performance..."
-   "to provide better feedback to users..."
-   "to streamline the workflow..."
-   "to reduce errors and improve stability..."
-   "to make the system more maintainable..."
-   "to protect sensitive user data..."

---

## Step 5: Task Categories (Use These as Task Names)

-   **Authentication Module** - Login, 2FA, logout, session management, password reset
-   **Profile Module** - User profile, avatar, preferences, top bar integration
-   **Entity Module** - Entity CRUD, admin management, pagination, contact management
-   **Account Management** - Account dialogs, validation, state handling
-   **UI/Layout** - Theme configuration, colors, styling, responsive design
-   **Project Setup & Configuration** - Environment setup, routing, deployment config
-   **Session Management** - Session handling, token management, auto-logout
-   **Security Features** - 2FA, password policies, role-based access
-   **Form Validation & UX** - Input validation, error messages, user feedback
-   **Data Management** - Local storage, state persistence, caching
-   **API Integration** - Service layer, HTTP calls, interceptors

---

## Example Request Message

```
Hi, I need to generate my monthly timesheet.

Here's my git log:
[PASTE GIT LOG OUTPUT HERE]

Please follow the instructions in the attached timesheet-instructions.md file.
```

---

## Example Output (Humanized & Shows Value)

| Date  | Category Code | Project | Task                  | Sub-Task                                                                                                                                                                                                                                   | Hours |
| ----- | ------------- | ------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----- |
| 1-Dec | Angular       | ERP     | Authentication Module | Built a complete and secure login system with form validation to prevent invalid entries, integrated with backend API for user verification, and added automatic navigation to dashboard after successful login to improve user experience | 7     |
| 2-Dec | Angular       | ERP     | Entity Module         | Developed the core entity management service to handle all company data operations (create, read, update, delete), ensuring data integrity and proper error handling to prevent data loss and provide clear feedback to users              | 5     |
| 3-Dec | Angular       | ERP     | Security Features     | Implemented two-factor authentication (2FA) system to add an extra layer of security for user accounts, protecting sensitive company data from unauthorized access                                                                         | 2     |
| 4-Dec | Angular       | ERP     | UI/Layout             | Redesigned the application header and navigation to match company branding, improved visual consistency across all pages for a more professional appearance                                                                                | 2     |

---

## Summary Section (Include at End)

After the timesheet, include:

| Metric                 | Value   |
| ---------------------- | ------- |
| **Total Working Days** | X       |
| **Total Hours**        | X hours |
| **Total Commits**      | X       |
