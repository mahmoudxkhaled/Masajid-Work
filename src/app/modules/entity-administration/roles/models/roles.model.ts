/**
 * Backend Entity Role Response Structure
 * Represents the raw entity role data structure from the API
 */
export interface EntityRoleBackend {
    Entity_Role_ID: number;
    Entity_ID: number;
    Title: string;
    Description: string;
    Title_Regional: string;
    Description_Regional: string;
    Functions?: number[];
    Modules?: number[];
}

/**
 * Backend API Response Structure for Role List
 * The message contains an object where keys are role IDs and values are EntityRoleBackend objects
 * For paginated responses, Entity_Roles contains the paginated data and Total_Count contains the total number of records
 */
export interface EntityRoleListResponse {
    success: boolean;
    message?: {
        Total_Count?: number;
        Entity_Roles?: Record<string, EntityRoleBackend>;
    };
}

/**
 * Frontend Entity Role Model
 * Represents the normalized entity role data used in components
 */
export interface EntityRole {
    id: string;
    entityId: string;
    title: string;
    description: string;
    titleRegional?: string;
    descriptionRegional?: string;
    functions?: number[];
    modules?: number[];
}

/**
 * Response structure for Role Functions
 */
export interface RoleFunctionsResponse {
    success: boolean;
    message?: {
        Functions?: number[];
    };
}

/**
 * Response structure for Role Modules
 */
export interface RoleModulesResponse {
    success: boolean;
    message?: {
        Modules?: number[];
    };
}
