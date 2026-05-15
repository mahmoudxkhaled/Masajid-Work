/**
 * Backend Notification Type Response Structure
 * Represents the raw notification type data structure from the API
 */
export interface NotificationTypeBackend {
    type_ID: number;
    title: string;
    description: string;
    urgeny?: string; // Typo in API - should be "urgency"
    example?: string;
}

/**
 * Backend Notification Category Response Structure
 * Represents the raw category data structure from the API
 */
export interface NotificationCategoryBackend {
    Category_ID: number;
    Type_ID: number;
    Title: string;
    Title_Regional?: string;
    Description: string;
    Description_Regional?: string;
    Send_Email: boolean;
    Can_Be_Unsubscribed: boolean;
    Entity_ID?: number; // Present for Entity Categories only
}

/**
 * Backend Notification Response Structure
 * Represents the raw notification data structure from the API
 */
export interface NotificationBackend {
    Notification_ID: number;
    Module_ID: number;
    Type_ID: number;
    Category_ID: number;
    Entity_ID?: number; // Present for Entity Notifications only
    Title: string;
    Title_Regional?: string;
    Message: string;
    Message_Regional?: string;
    Reference_Type?: string | null;
    Reference_ID?: number | null;
    Created_At?: string;
}

/**
 * Backend Account Notification Response Structure
 * Represents the raw account notification data structure from the API
 */
export interface AccountNotificationBackend {
    Notification_ID: number;
    Module_ID: number;
    Type_ID: number;
    Category_ID: number;
    Entity_ID?: number;
    Title: string;
    Title_Regional?: string;
    Message: string;
    Message_Regional?: string;
    Reference_Type?: string | null;
    Reference_ID?: number | null;
    Is_Read: boolean;
    Read_At?: string | null;
    Created_At?: string;
}

/**
 * Backend API Response Structure for Notification Types List
 */
export interface NotificationTypesListResponse {
    success: boolean;
    message?: NotificationTypeBackend[];
    Notification_Types?: NotificationTypeBackend[];
}

/**
 * Backend API Response Structure for Notification Categories List
 */
export interface NotificationCategoriesListResponse {
    success: boolean;
    message?: {
        Total_Count?: number;
        Notification_Categories?: NotificationCategoryBackend[];
    };
    Total_Count?: number;
    Notification_Categories?: NotificationCategoryBackend[];
}

/**
 * Backend API Response Structure for Notifications List
 */
export interface NotificationsListResponse {
    success: boolean;
    message?: {
        Total_Count?: number;
        Notifications?: NotificationBackend[];
    };
    Total_Count?: number;
    Notifications?: NotificationBackend[];
}

/**
 * Backend API Response Structure for Account Notifications List
 */
export interface AccountNotificationsListResponse {
    success: boolean;
    message?: {
        Total_Count?: number;
        Notifications?: AccountNotificationBackend[];
    };
    Total_Count?: number;
    Notifications?: AccountNotificationBackend[];
}

/**
 * Frontend Notification Type Model
 * Represents the normalized notification type data used in components
 */
export interface NotificationType {
    id: number;
    name: string;
    nameRegional?: string;
    urgency?: string;
    example?: string;
}

/**
 * Frontend Notification Category Model
 * Represents the normalized category data used in components
 */
export interface NotificationCategory {
    id: number;
    typeId: number;
    title: string;
    description: string;
    titleRegional?: string;
    descriptionRegional?: string;
    sendEmail: boolean;
    canBeUnsubscribed: boolean;
    entityId?: number; // Present for Entity Categories only
    isSystemCategory: boolean; // true if Entity_ID is not present or 0
}

/**
 * Frontend Notification Model
 * Represents the normalized notification data used in components
 */
export interface Notification {
    id: number;
    moduleId: number;
    typeId: number;
    categoryId: number;
    entityId?: number; // Present for Entity Notifications only
    title: string;
    message: string;
    titleRegional?: string;
    messageRegional?: string;
    referenceType?: string | null;
    referenceId?: number | null;
    createdAt?: string;
    isSystemNotification: boolean; // true if Entity_ID is not present or 0
}

/**
 * Frontend Account Notification Model
 * Represents the normalized account notification data used in components
 */
export interface AccountNotification {
    id: number;
    moduleId: number;
    typeId: number;
    categoryId: number;
    entityId?: number;
    title: string;
    message: string;
    titleRegional?: string;
    messageRegional?: string;
    referenceType?: string | null;
    referenceId?: number | null;
    isRead: boolean;
    readAt?: string | null;
    createdAt?: string;
}

/**
 * Reference Type Options
 */
export type ReferenceType = 'Image' | 'Document' | 'Link' | 'Workflow' | null;/**
 * Send Notification Request
 * Used for sending notifications to different targets
 */
export interface SendNotificationRequest {
    notificationId: number;
    targetType: 'accounts' | 'groups' | 'roles' | 'entities' | 'all';
    accountIds?: number[];
    groupIds?: number[];
    roleIds?: number[];
    entityIds?: number[];
}