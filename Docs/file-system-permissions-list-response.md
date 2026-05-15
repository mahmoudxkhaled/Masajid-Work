# List File System Permissions — response model (API 1170)

This document describes the **`message`** payload returned when listing permissions for a selected file system. It is a **file-system-centric** summary: raw assignments plus a **computed** per-account effective result.

## High level

| Field | Meaning |
|--------|---------|
| `success` | Request succeeded. |
| `message.access_Rights` | **Raw** explicit permission rows configured on the selected file system. |
| `message.accounts_Access_Rights` | **Computed** effective access right **per account** for that file system (not raw DB rows). |

## `access_Rights[]` — one row per explicit assignment

Each element is one stored permission for this file system.

| Field | Meaning |
|--------|---------|
| `fS_Access_ID` | Unique id of this file-system access record. |
| `file_System_ID` | Target file system. |
| `access_Right` | Granted level (see **AccessRight** enum below). |
| `access_Right_Type` | What kind of target the row applies to (see **AccessRightType** enum below). |
| `permission_ID` | Id of the target; meaning depends on `access_Right_Type` (Account id, Group id, Role id, Entity id, organization-scoped entity id, etc.). |

### AccessRight (numeric)

| Value | Label |
|-------|--------|
| 0 | None |
| 1 | List |
| 2 | Read |
| 3 | Amend |
| 4 | Modify |
| 5 | Full |

### AccessRightType (numeric)

| Value | Label | Notes |
|-------|--------|--------|
| 0 | Account | Direct account assignment. |
| 1 | Group | |
| 2 | Role | |
| 3 | Entity | Applies to **that entity only**. |
| 4 | Organization | Applies to that entity **and all descendants** in the entity tree (not upward). |
| 5 | All | |
| 6 | Owner | Derived; not manually assignable in UI. |
| 7 | EntityAdmin | Derived; not manually assignable in UI. |

## Effective access rule

- Effective access for an account is **`max(applicable access_Right values)`** from all rules that apply to that account.
- **`access_Right_Type` does not define priority** over the numeric `access_Right` level.
- **`accounts_Access_Rights` is authoritative** for “what does this account effectively have” without recomputing on the client.

Optional backend rule: a direct Account row with **None (0)** as an explicit deny is only valid if the backend implements it; otherwise treat effective access as max of applicable rights as above.

## `accounts_Access_Rights`

Object/map:

- **Key**: Account ID (string).
- **Value**: Effective `AccessRight` numeric for that account on **this** file system.

Example:

```json
"accounts_Access_Rights": {
  "2": 2,
  "4": 2
}
```

Means: accounts `2` and `4` both have effective access **Read** on this file system.

## Frontend usage

- **Show/edit raw assignments** (who/what was granted, and type): use **`access_Rights`**.
- **Show final effective access per account** without recalculating: use **`accounts_Access_Rights`**.

## TypeScript

Interfaces, enums, and label-key helpers live in:

`src/app/modules/entity-administration/entity-storage-management/models/file-system-permissions-list-response.model.ts`
