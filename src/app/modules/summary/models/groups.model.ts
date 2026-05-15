/**
 * Backend Group Response Structure
 * Represents the raw group data structure from the API
 */
export interface GroupBackend {
    groupID: number;
    entityID: number | null;
    title: string;
    title_Regional: string;
    description: string;
    description_Regional: string;
    createAccountID: number;
    isActive?: boolean; // May not always be present in list response
}

/**
 * Backend API Response Structure for Groups List
 * The message contains a list of GroupBackend objects
 */
export interface GroupsListResponse {
    success: boolean;
    message?: GroupBackend[];
    Account_Groups?: GroupBackend[];
}

/**
 * Frontend Group Model
 * Represents the normalized group data used in components
 */
export interface Group {
    id: string;
    title: string;
    description: string;
    titleRegional?: string;
    descriptionRegional?: string;
    entityId: number;
    active: boolean;
    createAccountId: number; // Account ID of the group owner/creator
}

/**
 * Group Member Model
 * Represents a member (account) in a group
 */
export interface GroupMember {
    accountId: number;
    email: string;
    entityId?: number;
    entityName?: string;
}

/**
 * Group Members Response
 * Can return either list of account IDs or dictionary of account IDs and emails
 */
export interface GroupMembersResponse {
    success: boolean;
    message?: number[] | Record<number, string>;
    Account_IDs?: number[];
    Accounts?: Record<number, string>;
}

