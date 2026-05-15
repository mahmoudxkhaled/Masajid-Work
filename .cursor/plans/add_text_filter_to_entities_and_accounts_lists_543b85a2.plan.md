---
name: Add Text Filter to Entities and Accounts Lists
overview: Add Text_Filter parameter support to List_Entities and Get_Entity_Accounts_List APIs, and connect the search bars to use server-side filtering instead of client-side filtering.
todos: []
---

# Add Text Filter to Entities and Accounts Lists

## Problem

Both `List_Entities` (API 406) and `Get_Entity_Accounts_List` (API 500) now support a `Text_Filter` parameter, but the current implementation:

- Entities list uses client-side filtering (`table.filterGlobal()`)
- Accounts list doesn't have a search input at all
- Service methods don't pass the `Text_Filter` parameter to the APIs

## Solution

Update the service methods to accept and pass `Text_Filter`, modify components to use server-side filtering, and add a search input to the accounts list.

## Implementation Steps

### 1. Update Entities Service

**File:** `src/app/modules/entities/services/entities.service.ts`

- Update `listEntities()` method signature to accept `textFilter: string = ''` as the 3rd parameter
- Add `textFilter` to the params array (after `lastEntityId` and `filterCount`)
- Update JSDoc to document the new parameter

- Update `getEntityAccountsList()` method signature to accept `textFilter: string = ''` as the 6th parameter (before `IDs_And_Emails_Only` if needed, but based on the API spec it should be after `filterCount`)
- Add `textFilter` to the params array
- Update JSDoc to document the new parameter

### 2. Update Entities List Component

**File:** `src/app/modules/entities/components/Entity/entities-list/entities-list.component.ts`

- Add `textFilter: string = ''` property to store the search value
- Modify `onSearchInput()` method to:
- Update `this.textFilter` with the input value
- Reset `this.first = 0` to go back to first page
- Call `this.loadEntities(true)` to reload with the new filter
- Consider adding debouncing (optional, but recommended for better UX)
- Update `loadEntities()` method to pass `this.textFilter` to `entitiesService.listEntities()`

**File:** `src/app/modules/entities/components/Entity/entities-list/entities-list.component.html`

- Remove or keep the search input (it already exists)
- The search input will now trigger server-side filtering instead of client-side

### 3. Update Account List Component

**File:** `src/app/modules/entities/components/Account/entity-account-list/entity-account-list.component.ts`

- Add `textFilter: string = ''` property to store the search value
- Add `onSearchInput()` method similar to entities list:
- Update `this.textFilter` with the input value
- Reset `this.first = 0`
- Call `this.reloadAccounts()` to reload with the new filter
- Consider adding debouncing
- Update `reloadAccounts()` method to pass `this.textFilter` to `entitiesService.getEntityAccountsList()`

**File:** `src/app/modules/entities/components/Account/entity-account-list/entity-account-list.component.html`

- Add a search input field in the filter options section (similar to entities list)
- Place it before or alongside the existing filter switches
- Use PrimeNG input with search icon: `<span class="p-input-icon-left">` pattern

### 4. Testing Considerations

- Verify that empty string is passed when search is cleared (API accepts empty string to ignore filter)
- Ensure pagination resets to first page when filter changes
- Test that filter works in combination with other filters (includeSubentities, activeOnly for accounts)
- Verify loading states are properly managed during search

## Files to Modify

1. `src/app/modules/entities/services/entities.service.ts` - Add textFilter parameter to both methods
2. `src/app/modules/entities/components/Entity/entities-list/entities-list.component.ts` - Add textFilter property and update methods
3. `src/app/modules/entities/components/Entity/entities-list/entities-list.component.html` - No changes needed (search input exists)
4. `src/app/modules/entities/components/Account/entity-account-list/entity-account-list.component.ts` - Add textFilter property and search method
5. `src/app/modules/entities/components/Account/entity-account-list/entity-account-list.component.html` - Add search input field

## Technical Details

- API Parameter Order:
- `List_Entities`: `Last_Entity_ID`, `Filter_Count`, `Text_Filter`
- `Get_Entity_Accounts_List`: `Entity_ID`, `Include_Subentities`, `Active_Only`, `Last_Account_ID`, `Filter_Count`, `Text_Filter`, `IDs_And_Emails_Only`
- Empty string should be passed when no filter is applied (API specification: "empty string to ignore")
- Filter changes should reset pagination to first page (`first = 0`)
- Consider debouncing search input (300-500ms) to avoid excessive API calls while user is typing