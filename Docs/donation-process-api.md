# Donation Process API Reference

This document is the **single source of truth** for the **Donation Process** APIs. Use it when implementing or changing donation features in the ERP frontend: request codes, input/output shapes, permissions, error codes, and status rules.

> All endpoints require an **Access Token** unless otherwise noted.  
> All error codes inherit the generic codes **`DAP11000`–`DAP11099`** in addition to the specific ones listed per endpoint.

---

## 1. Frontend Integration (ERP)

### Calling APIs

- Use **`ApiService.callAPI(requestCode, accessToken, parameters)`** — never call `HttpClient` directly.
- Get the token via **`LocalStorageService.getAccessToken()`**.
- All parameters are **`string[]`** (convert numbers, booleans, lists per existing service patterns in the same module).
- Wrap service calls with **`isLoadingSubject`** + **`finalize()`** for loading state.
- Responses are auto-parsed JSON; check **`response?.success`** first, then read **`response.message.*`** (PascalCase fields from the backend).

### Business errors

- On **`success: false`**, use the component-local **`handleBusinessError`** pattern with **`switch (code)`** per operation — see **`business-error-handling`** rule.
- Map **`DAP13xxx`** codes from this document to translation keys in **`en.json`** / **`ar.json`**.
- HTTP/session errors remain handled by existing interceptors.

### Pagination (list endpoints)

List APIs use cursor-style paging via **`Last_*_ID`** + **`Filter_Count`**:

| Parameter | Role |
|-----------|------|
| `Last_Request_ID` / `Last_Commitment_ID` / `Last_Offer_ID` / `Last_Entity_ID` | Cursor for the next page (follow the same negative-page convention used elsewhere in the ERP when applicable) |
| `Filter_Count` | Page size — for **`List_Entities_Extra_Data`**, must be **between 5 and 100** (`DAP13050` otherwise) |
| `Text_Filter` | Optional search string where supported |

### Permissions (roles)

| Abbreviation | Role |
|--------------|------|
| DEV | Developer |
| SADMIN | System Administrator |
| EADMIN | Entity Administrator |
| USER | System User |
| GUEST | Guest |

### Entity types (Group 12)

| `Entity_Type_ID` | Type |
|------------------|------|
| `1` | Facility |
| `2` | Vendor |
| `3` | CharityCenter |

> **`Country_Code`** is **case-sensitive**.

### Attachments & file storage

Fulfillment proof, validation attachments, and **`Add_Donation_Attachment`** use file IDs from the storage module. For upload/download contracts, see **`Docs/storage-management-file-system-api.md`**.

---

## 2. Endpoint Index

| Code | API | Group |
|------|-----|-------|
| `100100` | List_Donation_Types | 1 — Reference & Lookups |
| `100101` | List_Donation_Categories | 1 |
| `100102` | Add_Donation_Category | 1 |
| `100103` | Update_Donation_Category | 1 |
| `100104` | Activate_Donation_Category | 1 |
| `100105` | Deactivate_Donation_Category | 1 |
| `100106` | List_Donation_Request_Statuses | 1 |
| `100200` | Create_Donation_Request | 2 — Requests (Facility) |
| `100201` | Update_Donation_Request | 2 |
| `100202` | Submit_Donation_Request_For_Review | 2 |
| `100203` | Delete_Donation_Request | 2 |
| `100204` | Get_Donation_Request_Details | 2 |
| `100205` | List_Entity_Donation_Requests | 2 |
| `100206` | Get_Donation_Request_Workflow | 2 |
| `100300` | List_Pending_Review_Requests | 3 — Admin Review |
| `100301` | Approve_Donation_Request | 3 |
| `100302` | Reject_Donation_Request | 3 |
| `100303` | List_Overdue_Donations | 3 |
| `100304` | Cancel_Donation | 3 |
| `100305` | Close_Donation_Request | 3 |
| `100400` | Browse_Donation_Requests | 4 — Browse (Donor) |
| `100401` | Get_Donation_Request_Public_Details | 4 |
| `100500` | Accept_Donation | 5 — Commitment |
| `100501` | Cancel_Donation_Commitment | 5 |
| `100502` | Get_Donation_Commitment_Details | 5 |
| `100503` | List_Donor_Commitments | 5 |
| `100504` | Set_Donation_Fulfillment_Mode | 5 |
| `100600` | List_Representation_Requests | 6 — Charity |
| `100601` | Respond_Donor_Representation | 6 |
| `100700` | List_Requests_For_Vendor | 7 — Vendor Offers |
| `100701` | Create_Vendor_Offer | 7 |
| `100702` | Update_Vendor_Offer | 7 |
| `100703` | Withdraw_Vendor_Offer | 7 |
| `100704` | List_Vendor_Offers | 7 |
| `100705` | List_Vendor_Offers_For_Request | 7 |
| `100706` | Get_Vendor_Offer_Details | 7 |
| `100707` | Select_Vendor_Offer | 7 |
| `100800` | Submit_Fulfillment_Proof | 8 — Fulfillment |
| `100801` | Get_Fulfillment_Details | 8 |
| `100802` | List_Fulfillments | 8 |
| `100803` | Confirm_Fulfillment | 8 |
| `100804` | Reject_Fulfillment | 8 |
| `100805` | Review_Fulfillment_Rejection | 8 |
| `100900` | Create_Breakdown_Request | 9 — Breakdown |
| `100901` | Get_Breakdown_Request_Details | 9 |
| `100902` | List_Breakdown_Requests | 9 |
| `100903` | Confirm_Breakdown_Request | 9 |
| `100904` | Apply_Breakdown_Request | 9 |
| `100905` | Reject_Breakdown_Request | 9 |
| `110000` | List_Donations_Open_For_Validation | 10 — Validation |
| `110001` | Submit_Donation_Validation | 10 |
| `110002` | Get_Validation_Details | 10 |
| `110003` | List_Request_Validations | 10 |
| `111000` | Add_Donation_Attachment | 11 — Attachments |
| `111001` | List_Donation_Attachments | 11 |
| `111002` | Remove_Donation_Attachment | 11 |
| `112000` | Add_Entity_Extra_Data | 12 — Entity Extra Data |
| `112001` | Update_Entity_Extra_Data | 12 |
| `112004` | Get_Entity_Extra_Data | 12 |
| `112006` | List_Entities_Extra_Data | 12 |

---

## 3. Group 1 — Reference & Lookups

### `List_Donation_Types`

- **Code:** `100100`
- **Description:** List all Donation Types registered in the system.
- **Access Token:** Yes

**Input:** _(none)_

**Output:**

- `Dictionary<int, object>` — `Donation_Types`

**Permissions:** DEV, SADMIN, EADMIN, USER, GUEST

**Errors:** _(none specific)_

---

### `List_Donation_Categories`

- **Code:** `100101`
- **Description:** List all Donation Categories for a specific Donation Type.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donation_Type_ID` |
| 2 | `boolean` | `Active_Only` |

**Output:**

- `Dictionary<int, object>` — `Donation_Categories`

**Permissions:** DEV, SADMIN, EADMIN, USER, GUEST

**Errors:**

- `DAP13002` — Invalid Donation Type ID

---

### `Add_Donation_Category`

- **Code:** `100102`
- **Description:** Add a new Donation Category.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donation_Type_ID` |
| 2 | `string` | `Code` |
| 3 | `string` | `Name` |
| 4 | `boolean` | `Is_Service` |
| 5 | `int` | `Default_Order` |

**Output:**

- `int` — `Donation_Category_ID`

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13002` — Invalid Donation Type ID
- `DAP13017` — Invalid Code format (length must be > 0 and < 20)
- `DAP13018` — Invalid Name format (length must be > 0 and < 100)
- `DAP13034` — Duplicate Category Code
- `DAP13035` — Invalid Default Order (must be > 0)

---

### `Update_Donation_Category`

- **Code:** `100103`
- **Description:** Update an existing Donation Category.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donation_Category_ID` |
| 2 | `string` | `Code` |
| 3 | `string` | `Name` |
| 4 | `boolean` | `Is_Service` |
| 5 | `int` | `Default_Order` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13001` — Invalid Donation Category ID
- `DAP13017` — Invalid Code format (length must be > 0 and < 20)
- `DAP13018` — Invalid Name format (length must be > 0 and < 100)
- `DAP13034` — Duplicate Category Code
- `DAP13035` — Invalid Default Order (must be > 0)

---

### `Activate_Donation_Category`

- **Code:** `100104`
- **Description:** Activates a previously deactivated Donation Category.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donation_Category_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13001` — Invalid Donation Category ID

---

### `Deactivate_Donation_Category`

- **Code:** `100105`
- **Description:** Deactivates a Donation Category.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donation_Category_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13001` — Invalid Donation Category ID

---

### `List_Donation_Request_Statuses`

- **Code:** `100106`
- **Description:** List all possible statuses for any Donation Request.
- **Access Token:** Yes

**Input:** _(none)_

**Output:**

- `Dictionary<int, object>` — `Request_Statuses`

**Permissions:** DEV, SADMIN, EADMIN, USER, GUEST

**Errors:** _(none specific)_

---

## 4. Group 2 — Requests (by Facility Representative)

### `Create_Donation_Request`

- **Code:** `100200`
- **Description:** Create a new Donation Request in `DRAFT` state.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Entity_ID` |
| 2 | `int` | `Donation_Category_ID` |
| 3 | `string` | `Title` |
| 4 | `string` | `Description` |
| 5 | `bool` | `Is_Regional` |
| 6 | `int` | `Quantity` |
| 7 | `string` | `Unit` |
| 8 | `decimal` | `Estimated_Cost` |
| 9 | `string` | `Currency_Code` |
| 10 | `bool` | `Needs_Installation` |
| 11 | `string` | `Address` |
| 12 | `decimal` | `Latitude` |
| 13 | `decimal` | `Longitude` |
| 14 | `string` | `City` |
| 15 | `string` | `Country_Code` |

**Output:**

- `long` — `Donation_Request_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13001` — Invalid Donation Category ID
- `DAP13013` — Not the owner facility of this request
- `DAP13019` — Invalid Quantity (must be > 0)
- `DAP13020` — Invalid Title format
- `DAP13021` — Invalid Currency Code
- `DAP13022` — Invalid Country Code
- `DAP13023` — Invalid Unit

---

### `Update_Donation_Request`

- **Code:** `100201`
- **Description:** Update an existing Donation Request (`DRAFT` only).
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `int` | `Donation_Category_ID` |
| 3 | `string` | `Title` |
| 4 | `string` | `Description` |
| 5 | `bool` | `Is_Regional` |
| 6 | `int` | `Quantity` |
| 7 | `string` | `Unit` |
| 8 | `decimal` | `Estimated_Cost` |
| 9 | `string` | `Currency_Code` |
| 10 | `bool` | `Needs_Installation` |
| 11 | `string` | `Address` |
| 12 | `decimal` | `Latitude` |
| 13 | `decimal` | `Longitude` |
| 14 | `string` | `City` |
| 15 | `string` | `Country_Code` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13001` — Invalid Donation Category ID
- `DAP13013` — Not the owner facility
- `DAP13020` — Invalid Title format
- `DAP13023` — Invalid Unit
- `DAP13032` — Cannot modify a request after it is published

---

### `Submit_Donation_Request_For_Review`

- **Code:** `100202`
- **Description:** Submit a `DRAFT` Donation Request for admin review. Status changes to `PENDING_REVIEW`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13010` — Invalid status (must be DRAFT)

---

### `Delete_Donation_Request`

- **Code:** `100203`
- **Description:** Soft-delete a `DRAFT` Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13031` — Cannot delete a request that is not in DRAFT

---

### `Get_Donation_Request_Details`

- **Code:** `100204`
- **Description:** Get full details of a Donation Request (including admin fields).
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `Dictionary<string, object?>` — `Donation_Request`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

### `List_Entity_Donation_Requests`

- **Code:** `100205`
- **Description:** List Donation Requests for an entity with optional status and text filters.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Entity_ID` |
| 2 | `List<int>` | `Status_Filter` |
| 3 | `int` | `Last_Request_ID` |
| 4 | `int` | `Filter_Count` |
| 5 | `string` | `Text_Filter` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13013` — Not the owner facility

---

### `Get_Donation_Request_Workflow`

- **Code:** `100206`
- **Description:** Get the full status-change history of a Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `List<Dictionary<string, object?>>` — `History`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

## 5. Group 3 — Admin Review & Oversight

### `List_Pending_Review_Requests`

- **Code:** `100300`
- **Description:** List Donation Requests currently in `PENDING_REVIEW` status.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Last_Request_ID` |
| 2 | `int` | `Filter_Count` |
| 3 | `string` | `Text_Filter` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN, EADMIN

**Errors:** _(none specific)_

---

### `Approve_Donation_Request`

- **Code:** `100301`
- **Description:** Approve a `PENDING_REVIEW` request and publish it. Status changes to `PUBLISHED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `string` | `Review_Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13010` — Invalid status (must be PENDING_REVIEW)

---

### `Reject_Donation_Request`

- **Code:** `100302`
- **Description:** Reject a `PENDING_REVIEW` request. Status changes to `REJECTED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `string` | `Review_Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13010` — Invalid status (must be PENDING_REVIEW)

---

### `List_Overdue_Donations`

- **Code:** `100303`
- **Description:** List published Donation Requests past their expected closure date.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Last_Request_ID` |
| 2 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN

**Errors:** _(none specific)_

---

### `Cancel_Donation`

- **Code:** `100304`
- **Description:** Cancel an active Donation Request (admin override). Status changes to `CANCELLED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `string` | `Reason` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13010` — Invalid status for this action

---

### `Close_Donation_Request`

- **Code:** `100305`
- **Description:** Close a `VALIDATED` Donation Request. Status changes to `CLOSED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13010` — Invalid status (must be VALIDATED)

---

## 6. Group 4 — Browse / Discovery (Donor)

### `Browse_Donation_Requests`

- **Code:** `100400`
- **Description:** Browse `PUBLISHED` Donation Requests with optional category, location, cost, and city/country filters.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `List<int>` | `Category_Filter` |
| 2 | `decimal` | `Latitude` |
| 3 | `decimal` | `Longitude` |
| 4 | `int` | `Radius_KM` |
| 5 | `decimal` | `Max_Estimated_Cost` |
| 6 | `string` | `Country_Code` |
| 7 | `string` | `City` |
| 8 | `short` | `Sort_By` |
| 9 | `int` | `Last_Request_ID` |
| 10 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN, EADMIN, USER, GUEST

**Errors:** _(none specific)_

---

### `Get_Donation_Request_Public_Details`

- **Code:** `100401`
- **Description:** Get the public-facing details of a `PUBLISHED` Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `Dictionary<string, object?>` — `Donation_Request`

**Permissions:** DEV, SADMIN, EADMIN, USER, GUEST

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

## 7. Group 5 — Commitment (Donor)

### `Accept_Donation`

- **Code:** `100500`
- **Description:** Commit to fulfilling a `PUBLISHED` Donation Request. Status changes to `ACCEPTED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `bool` | `Is_Anonymous` |
| 3 | `short` | `Fulfillment_Mode` |
| 4 | `int` | `Charity_Entity_ID` |
| 5 | `DateTime` | `Expected_Closure_At` |

**Output:**

- `long` — `Donation_Commitment_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13011` — Request not in PUBLISHED state
- `DAP13012` — Request already has an active commitment
- `DAP13025` — Invalid Fulfillment Mode
- `DAP13026` — Charity entity required when mode = via representative

---

### `Cancel_Donation_Commitment`

- **Code:** `100501`
- **Description:** Cancel an active commitment. Status changes to `CANCELLED`; request reverts to `PUBLISHED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |
| 2 | `string` | `Reason` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID
- `DAP13014` — Not the donor of this commitment
- `DAP13010` — Invalid status for this action

---

### `Get_Donation_Commitment_Details`

- **Code:** `100502`
- **Description:** Get full details of a Donation Commitment.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |

**Output:**

- `Dictionary<string, object?>` — `Donation_Commitment`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID

---

### `List_Donor_Commitments`

- **Code:** `100503`
- **Description:** List a donor's commitments with optional status filter and pagination.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Donor_User_ID` |
| 2 | `List<int>` | `Status_Filter` |
| 3 | `int` | `Last_Commitment_ID` |
| 4 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Commitments`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13014` — Not the donor (only own commitments visible)

---

### `Set_Donation_Fulfillment_Mode`

- **Code:** `100504`
- **Description:** Update the fulfillment mode and charity entity on an active commitment.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |
| 2 | `short` | `Fulfillment_Mode` |
| 3 | `int` | `Charity_Entity_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID
- `DAP13014` — Not the donor
- `DAP13025` — Invalid Fulfillment Mode
- `DAP13026` — Charity entity required

---

## 8. Group 6 — Charity Representation

### `List_Representation_Requests`

- **Code:** `100600`
- **Description:** List donation commitments assigned to a charity entity for representation, with pagination.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Charity_Entity_ID` |
| 2 | `bool` | `Pending_Only` |
| 3 | `int` | `Last_Commitment_ID` |
| 4 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Commitments`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13015` — Not the assigned charity representative

---

### `Respond_Donor_Representation`

- **Code:** `100601`
- **Description:** Accept or reject a charity representation assignment for a commitment.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |
| 2 | `bool` | `Accept` |
| 3 | `string` | `Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID
- `DAP13015` — Not the assigned charity representative

---

## 9. Group 7 — Vendor Offers

### `List_Requests_For_Vendor`

- **Code:** `100700`
- **Description:** List `PUBLISHED` Donation Requests visible to vendors with optional category, country, and city filters.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `List<int>` | `Category_Filter` |
| 2 | `string` | `Country_Code` |
| 3 | `string` | `City` |
| 4 | `int` | `Last_Request_ID` |
| 5 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:** _(none specific)_

---

### `Create_Vendor_Offer`

- **Code:** `100701`
- **Description:** Submit a vendor offer for a Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `int` | `Vendor_Entity_ID` |
| 3 | `decimal` | `Offer_Amount` |
| 4 | `string` | `Currency_Code` |
| 5 | `bool` | `Includes_Supply` |
| 6 | `bool` | `Includes_Installation` |
| 7 | `string` | `Description` |
| 8 | `DateTime` | `Valid_Until` |

**Output:**

- `long` — `Donation_Vendor_Offer_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13016` — Not the vendor of this offer
- `DAP13024` — Invalid Offer Amount
- `DAP13021` — Invalid Currency Code

---

### `Update_Vendor_Offer`

- **Code:** `100702`
- **Description:** Update an existing vendor offer (must be active and owned by the calling entity).
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Vendor_Offer_ID` |
| 2 | `decimal` | `Offer_Amount` |
| 3 | `string` | `Currency_Code` |
| 4 | `bool` | `Includes_Supply` |
| 5 | `bool` | `Includes_Installation` |
| 6 | `string` | `Description` |
| 7 | `bool` | `Is_Regional` |
| 8 | `DateTime` | `Valid_Until` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13004` — Invalid Vendor Offer ID
- `DAP13016` — Not the vendor
- `DAP13024` — Invalid Offer Amount

---

### `Withdraw_Vendor_Offer`

- **Code:** `100703`
- **Description:** Withdraw an active vendor offer. Status changes to `WITHDRAWN`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Vendor_Offer_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13004` — Invalid Vendor Offer ID
- `DAP13016` — Not the vendor

---

### `List_Vendor_Offers`

- **Code:** `100704`
- **Description:** List vendor offers submitted by an entity with optional status filter and pagination.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Vendor_Entity_ID` |
| 2 | `List<int>` | `Status_Filter` |
| 3 | `int` | `Last_Offer_ID` |
| 4 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Vendor_Offers`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13016` — Not the vendor

---

### `List_Vendor_Offers_For_Request`

- **Code:** `100705`
- **Description:** List all non-withdrawn vendor offers for a specific Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `List<Dictionary<string, object?>>` — `Vendor_Offers`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID
- `DAP13033` — Action not accessible for this Entity

---

### `Get_Vendor_Offer_Details`

- **Code:** `100706`
- **Description:** Get full details of a specific vendor offer.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Vendor_Offer_ID` |

**Output:**

- `Dictionary<string, object?>` — `Vendor_Offer`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13004` — Invalid Vendor Offer ID
- `DAP13033` — Action not accessible for this Entity

---

### `Select_Vendor_Offer`

- **Code:** `100707`
- **Description:** Select a vendor offer to proceed with. Offer status → `SELECTED`; request status → `IN_FULFILLMENT`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Vendor_Offer_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13004` — Invalid Vendor Offer ID
- `DAP13014` — Not the donor of the request

---

## 10. Group 8 — Fulfillment

### `Submit_Fulfillment_Proof`

- **Code:** `100800`
- **Description:** Submit proof of fulfillment for an active commitment. Request status → `FULFILLMENT_SUBMITTED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |
| 2 | `short` | `Fulfilled_By` |
| 3 | `long` | `Donation_Vendor_Offer_ID` |
| 4 | `string` | `Fulfillment_Note` |
| 5 | `bool` | `Is_Regional` |
| 6 | `List<long>` | `Attachment_File_IDs` |
| 7 | `int` | `File_System_ID` |
| 8 | `long` | `Folder_ID` |

**Output:**

- `long` — `Donation_Fulfillment_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID
- `DAP13014` — Not the donor
- `DAP13029` — Fulfillment proof required (no attachments provided)
- `DAP13010` — Invalid status for this action

---

### `Get_Fulfillment_Details`

- **Code:** `100801`
- **Description:** Get details of a specific fulfillment record.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Fulfillment_ID` |

**Output:**

- `Dictionary<string, object?>` — `Fulfillment`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13005` — Invalid Fulfillment ID

---

### `List_Fulfillments`

- **Code:** `100802`
- **Description:** List all fulfillment records for a Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `List<Dictionary<string, object?>>` — `Fulfillments`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

### `Confirm_Fulfillment`

- **Code:** `100803`
- **Description:** Confirm a submitted fulfillment. Status → `CONFIRMED`; request → `OPEN_FOR_VALIDATION`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Fulfillment_ID` |
| 2 | `string` | `Response_Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13005` — Invalid Fulfillment ID
- `DAP13013` — Not the owner facility
- `DAP13010` — Invalid status for this action

---

### `Reject_Fulfillment`

- **Code:** `100804`
- **Description:** Reject a submitted fulfillment. Status → `REJECTED`; request reverts to `IN_FULFILLMENT`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Fulfillment_ID` |
| 2 | `string` | `Response_Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13005` — Invalid Fulfillment ID
- `DAP13013` — Not the owner facility
- `DAP13010` — Invalid status for this action

---

### `Review_Fulfillment_Rejection`

- **Code:** `100805`
- **Description:** Admin reviews a disputed fulfillment rejection. If valid → `BROKEN_DOWN`; if invalid → resubmit.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Fulfillment_ID` |
| 2 | `bool` | `Rejection_Valid` |
| 3 | `string` | `Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13005` — Invalid Fulfillment ID
- `DAP13010` — Invalid status for this action

---

## 11. Group 9 — Breakdown / Partial Fulfillment

### `Create_Breakdown_Request`

- **Code:** `100900`
- **Description:** Request a partial breakdown of a commitment into sub-requests. Each item specifies title, quantity, cost, currency, and donor-portion flag.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Commitment_ID` |
| 2 | `List<object>` | `Items` |
| 3 | `bool` | `Is_Regional` |

**Output:**

- `long` — `Donation_Breakdown_Request_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13003` — Invalid Commitment ID
- `DAP13014` — Not the donor
- `DAP13030` — Invalid breakdown (items/quantities)

---

### `Get_Breakdown_Request_Details`

- **Code:** `100901`
- **Description:** Get the header and line items of a breakdown request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Breakdown_Request_ID` |

**Output:**

- `Dictionary<string, object?>` — `Breakdown_Request`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13006` — Invalid Breakdown Request ID

---

### `List_Breakdown_Requests`

- **Code:** `100902`
- **Description:** List breakdown requests for a Donation Request with optional status filter.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |
| 2 | `List<int>` | `Status_Filter` |

**Output:**

- `List<Dictionary<string, object?>>` — `Breakdown_Requests`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

### `Confirm_Breakdown_Request`

- **Code:** `100903`
- **Description:** Facility confirms (approves) a pending breakdown request. Status → `FACILITY_CONFIRMED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Breakdown_Request_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13006` — Invalid Breakdown Request ID
- `DAP13013` — Not the owner facility
- `DAP13010` — Invalid status for this action

---

### `Apply_Breakdown_Request`

- **Code:** `100904`
- **Description:** Apply a `CONFIRMED` breakdown: creates sub-donation-requests and marks the original as `BROKEN_DOWN`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Breakdown_Request_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13006` — Invalid Breakdown Request ID
- `DAP13010` — Invalid status (must be CONFIRMED)

---

### `Reject_Breakdown_Request`

- **Code:** `100905`
- **Description:** Reject a pending or confirmed breakdown request. Status → `REJECTED`.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Breakdown_Request_ID` |
| 2 | `string` | `Rejection_Note` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13006` — Invalid Breakdown Request ID
- `DAP13010` — Invalid status for this action

---

## 12. Group 10 — Community Validation

### `List_Donations_Open_For_Validation`

- **Code:** `110000`
- **Description:** List Donation Requests open for community validation (within the 1-month window) with optional category and location filters.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `List<int>` | `Category_Filter` |
| 2 | `decimal` | `Latitude` |
| 3 | `decimal` | `Longitude` |
| 4 | `int` | `Radius_KM` |
| 5 | `int` | `Last_Request_ID` |
| 6 | `int` | `Filter_Count` |

**Output:**

- `long` — `Total_Count`
- `List<Dictionary>` — `Donation_Requests`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:** _(none specific)_

---

### `Submit_Donation_Validation`

- **Code:** `110001`
- **Description:** Submit a community validation for a confirmed fulfillment.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Fulfillment_ID` |
| 2 | `short` | `Validation_Result` |
| 3 | `string` | `Notes` |
| 4 | `bool` | `Is_Regional` |
| 5 | `List<long>` | `Attachment_File_IDs` |
| 6 | `int` | `File_System_ID` |
| 7 | `long` | `Folder_ID` |

**Output:**

- `long` — `Donation_Validation_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13005` — Invalid Fulfillment ID
- `DAP13027` — Invalid Validation Result
- `DAP13028` — Validation not yet open (1-month window not reached)

---

### `Get_Validation_Details`

- **Code:** `110002`
- **Description:** Get the details of a specific validation record.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Validation_ID` |

**Output:**

- `Dictionary<string, object?>` — `Validation`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13007` — Invalid Validation ID

---

### `List_Request_Validations`

- **Code:** `110003`
- **Description:** List all validation records for a Donation Request.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Request_ID` |

**Output:**

- `List<Dictionary<string, object?>>` — `Validations`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13000` — Invalid Donation Request ID

---

## 13. Group 11 — Attachments

### `Add_Donation_Attachment`

- **Code:** `111000`
- **Description:** Attach a file (from storage) to a donation process entity (request, commitment, fulfillment, validation, or breakdown).
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `short` | `Owner_Type` |
| 2 | `long` | `Owner_ID` |
| 3 | `short` | `Attachment_Kind` |
| 4 | `long` | `File_ID` |
| 5 | `long` | `Folder_ID` |
| 6 | `int` | `File_System_ID` |
| 7 | `string` | `Caption` |
| 8 | `bool` | `Is_Regional` |
| 9 | `int` | `Sort_Order` |

**Output:**

- `long` — `Donation_Attachment_ID`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13008` — Invalid Attachment owner
- `DAP13010` — Owner not in an editable state

---

### `List_Donation_Attachments`

- **Code:** `111001`
- **Description:** List all active attachments for a given owner (by type and ID).
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `short` | `Owner_Type` |
| 2 | `long` | `Owner_ID` |

**Output:**

- `List<Dictionary<string, object?>>` — `Attachments`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:** _(none specific)_

---

### `Remove_Donation_Attachment`

- **Code:** `111002`
- **Description:** Soft-delete a donation attachment.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `long` | `Donation_Attachment_ID` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13008` — Invalid Donation Attachment ID

---

## 14. Group 12 — Entities Extra Data

### `Add_Entity_Extra_Data`

- **Code:** `112000`
- **Description:** Add additional data tied to an existing Entity.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Entity_ID` |
| 2 | `short` | `Entity_Type_ID` |
| 3 | `code` | `Country_Code` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13022` — Invalid Country Code
- `DAP13037` — Invalid Entity Type ID
- `DAP13038` — Entity already registered

---

### `Update_Entity_Extra_Data`

- **Code:** `112001`
- **Description:** Update the additional data related to an existing Entity.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Entity_ID` |
| 2 | `short` | `Entity_Type_ID` |
| 3 | `code` | `Country_Code` |

**Output:** _(none)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13022` — Invalid Country Code
- `DAP13036` — Invalid Entity ID
- `DAP13037` — Invalid Entity Type ID

---

### `Get_Entity_Extra_Data`

- **Code:** `112004`
- **Description:** Get the additional data related to an existing Entity.
- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `int` | `Entity_ID` |

**Output:**

- `int` — `Entity_ID`
- `short` — `Entity_Type_ID`
- `code` — `Country_Code`

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13036` — Invalid Entity ID

---

### `List_Entities_Extra_Data`

- **Code:** `112006`
- **Description:** List all additional entities data in the system.

> If `Entity_Type_ID_Filter = 0`, all types will be retrieved.

- **Access Token:** Yes

**Input:**

| # | Type | Name |
|---|------|------|
| 1 | `short` | `Entity_Type_ID_Filter` |
| 2 | `string` | `Country_Code_Filter` |
| 3 | `int` | `Last_Entity_ID` |
| 4 | `int` | `Filter_Count` |

**Output:** _(none — results returned implicitly)_

**Permissions:** DEV, SADMIN, EADMIN, USER

**Errors:**

- `DAP13037` — Invalid Entity Type ID
- `DAP13050` — Invalid Filter_Count (must be between 5 and 100)

---

## 15. Error Code Reference

| Code | Description |
|------|-------------|
| `DAP13000` | Invalid Donation Request ID |
| `DAP13001` | Invalid Donation Category ID |
| `DAP13002` | Invalid Donation Type ID |
| `DAP13003` | Invalid Commitment ID |
| `DAP13004` | Invalid Vendor Offer ID |
| `DAP13005` | Invalid Fulfillment ID |
| `DAP13006` | Invalid Breakdown Request ID |
| `DAP13007` | Invalid Validation ID |
| `DAP13008` | Invalid Attachment / owner |
| `DAP13010` | Invalid status for this action (state-machine violation) |
| `DAP13011` | Request not in PUBLISHED state |
| `DAP13012` | Request already has an active commitment |
| `DAP13013` | Not the owner facility of this request |
| `DAP13014` | Not the donor of this commitment |
| `DAP13015` | Not the assigned charity representative |
| `DAP13016` | Not the vendor of this offer |
| `DAP13017` | Invalid Code format (length must be > 0 and < 20) |
| `DAP13018` | Invalid Name format (length must be > 0 and < 100) |
| `DAP13019` | Invalid Quantity (must be > 0) |
| `DAP13020` | Invalid Title format |
| `DAP13021` | Invalid Currency Code |
| `DAP13022` | Invalid Country Code |
| `DAP13023` | Invalid Unit |
| `DAP13024` | Invalid Offer Amount |
| `DAP13025` | Invalid Fulfillment Mode |
| `DAP13026` | Charity entity required when mode = via representative |
| `DAP13027` | Invalid Validation Result |
| `DAP13028` | Validation not yet open (1-month window) |
| `DAP13029` | Fulfillment proof required (no attachments) |
| `DAP13030` | Invalid breakdown (items/quantities) |
| `DAP13031` | Cannot delete a request that is not in DRAFT |
| `DAP13032` | Cannot modify a request after it is published |
| `DAP13033` | Action not accessible for this Entity |
| `DAP13034` | Duplicate Category Code |
| `DAP13035` | Invalid Default Order (must be > 0) |
| `DAP13036` | Invalid Entity ID |
| `DAP13037` | Invalid Entity Type ID |
| `DAP13038` | Entity already registered |
| `DAP13050` | Invalid Filter_Count (must be between 5 and 100) |

> Generic session/HTTP errors: **`DAP11000`–`DAP11099`** (handled by interceptors where applicable).

---

## 16. Status Transitions (Quick Reference)

Key status changes enforced by **`DAP13010`** when the wrong state is used:

| Action | Required / Resulting States |
|--------|----------------------------|
| Create request | → `DRAFT` |
| Submit for review | `DRAFT` → `PENDING_REVIEW` |
| Approve | `PENDING_REVIEW` → `PUBLISHED` |
| Reject review | `PENDING_REVIEW` → `REJECTED` |
| Accept donation | `PUBLISHED` → `ACCEPTED` |
| Cancel commitment | commitment `CANCELLED`; request → `PUBLISHED` |
| Select vendor offer | offer → `SELECTED`; request → `IN_FULFILLMENT` |
| Submit fulfillment proof | request → `FULFILLMENT_SUBMITTED` |
| Confirm fulfillment | fulfillment → `CONFIRMED`; request → `OPEN_FOR_VALIDATION` |
| Reject fulfillment | fulfillment → `REJECTED`; request → `IN_FULFILLMENT` |
| Close request | `VALIDATED` → `CLOSED` |
| Cancel donation (admin) | → `CANCELLED` |
| Confirm breakdown | → `FACILITY_CONFIRMED` |
| Apply breakdown | `CONFIRMED` → creates sub-requests; original → `BROKEN_DOWN` |

Use **`List_Donation_Request_Statuses`** (`100106`) and **`Get_Donation_Request_Workflow`** (`100206`) for authoritative status IDs and history in the UI.

---

*Reference this document when implementing or changing donation process features in the ERP frontend.*
