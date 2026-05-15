/**
 * Backend Entity Response Structure
 * Represents the raw entity data structure from the API
 */
export interface EntityBackend {
    Entity_ID: number;
    Code: string;
    Name: string;
    Description: string;
    Name_Regional: string;
    Description_Regional: string;
    Parent_Entity_ID: number | string | null;
    Is_Active: boolean;
    Is_Personal: boolean;
}

/**
 * Backend API Response Structure
 * The message contains an object where keys are entity IDs and values are EntityBackend objects
 * For paginated responses, Entities_List contains the paginated data and Total_Count contains the total number of records
 */
export interface EntitiesListResponse {
    success: boolean;
    message?: Record<string, EntityBackend>; // Kept for backward compatibility
    Entities_List?: Record<string, EntityBackend>; // New paginated response field
    Total_Count?: number; // Total number of entities in the system
}

/**
 * Frontend Entity Model
 * Represents the normalized entity data used in components
 */
export interface Entity {
    id: string;
    code: string;
    name: string;
    description: string;
    parentEntityId?: string;
    active: boolean;
    isPersonal: boolean;
}


export interface EntityAccount {
    accountId: string;
    userId: number;
    email: string;
    systemRoleId: number;
    roleName: string;
    accountEntityId: number;
    /** Resolved display name; undefined while loading, null means show N/A */
    entityNameLabel?: string | null;
    entityRoleId: number;
    entityRoleName: string;
    accountState: number; // 1 = Active, 0 = Inactive
    Two_FA: boolean;
    Last_Login: string;
}
