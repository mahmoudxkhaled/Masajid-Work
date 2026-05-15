import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';
import { Roles } from '../models/system-roles';

const PERMISSION_MATRIX = {
    // Credentials and Session related requests (100-110)
    Login: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Verify_2FA: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Logout: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Set_2FA: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Change_Password: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Reset_Password_Request: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Reset_Password_Confirm: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Verify_Email: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser, Roles.Guest],
    Get_Login_Data_Package: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],

    // Entity Management APIs (400-422)
    Add_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Activate_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Deactivate_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Entity_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity: [Roles.Developer],
    List_Entities: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Contacts: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Update_Entity_Contacts: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Assign_Entity_Admin: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Admins: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity_Admin: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Assign_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Remove_Entity_Logo: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Entity Accounts & Tree APIs (500-501)
    Get_Entity_Accounts_List: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Tree: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],

    // Account Management APIs (150-158)
    Create_Account: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Activate_Account: [Roles.Developer, Roles.SystemAdministrator],
    Deactivate_Account: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Account: [Roles.Developer, Roles.SystemAdministrator],
    Get_Account_Status: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Get_Account_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Account_Details: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Account_Email: [Roles.Developer, Roles.SystemAdministrator],
    Update_Account_Entity: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Entity Settings APIs (780-784)
    Set_Default_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Get_Default_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Set_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Settings: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Remove_Entity_Setting: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // System Settings APIs (730-732)
    Set_ERP_System_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Get_ERP_System_Settings: [Roles.Developer, Roles.SystemAdministrator],
    Remove_ERP_System_Setting: [Roles.Developer, Roles.SystemAdministrator],

    // Account Group Management APIs (570-583)
    Create_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Get_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Update_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Activate_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Deactivate_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Delete_Account_Group: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    List_Personal_Account_Groups: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    List_Entity_Account_Groups: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Assign_Group_Members: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Add_Group_Members: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Get_Group_Members: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Remove_Group_Members: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],

    // Notification Types APIs (800)
    List_Notification_Types: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Notification Categories - System APIs (810-814)
    Create_Notification_Category: [Roles.Developer, Roles.SystemAdministrator],
    Get_Notification_Category: [Roles.Developer, Roles.SystemAdministrator],
    List_Notification_Categories: [Roles.Developer, Roles.SystemAdministrator],
    Update_Notification_Category: [Roles.Developer, Roles.SystemAdministrator],
    Delete_Notification_Category: [Roles.Developer, Roles.SystemAdministrator],

    // Notification Categories - Entity APIs (815-819)
    Create_Entity_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    List_Entity_Notification_Categories: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Update_Entity_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Notifications - System APIs (820-824)
    Create_Notification: [Roles.Developer, Roles.SystemAdministrator],
    Get_Notification: [Roles.Developer, Roles.SystemAdministrator],
    List_Notifications: [Roles.Developer, Roles.SystemAdministrator],
    Update_Notification: [Roles.Developer, Roles.SystemAdministrator],
    Delete_Notification: [Roles.Developer, Roles.SystemAdministrator],

    // Notifications - Entity APIs (825-829)
    Create_Entity_Notification: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Get_Entity_Notification: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    List_Entity_Notifications: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Update_Entity_Notification: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Delete_Entity_Notification: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Send Notification APIs (830-834)
    Send_Notification_To_Accounts: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Send_Notification_To_Groups: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Send_Notification_To_Roles: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Send_Notification_To_Entities: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],
    Send_Notification_To_All: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator],

    // Account Notifications APIs (840-845)
    Mark_Notifications_Read: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Mark_Notifications_Unread: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Delete_Account_Notifications: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    List_Account_Notifications: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Subscribe_To_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
    Unsubscribe_To_Notification_Category: [Roles.Developer, Roles.SystemAdministrator, Roles.EntityAdministrator, Roles.SystemUser],
} as const;

export type PermissionAction = keyof typeof PERMISSION_MATRIX;

@Injectable({
    providedIn: 'root',
})
export class PermissionService {
    constructor(private localStorageService: LocalStorageService) { }

    /**
     * Returns the current user's role identifier.
     */
    getCurrentRoleId(): Roles | 0 {
        const accountDetails = this.localStorageService.getAccountDetails();
        return (accountDetails?.System_Role_ID as Roles) || 0;
    }

    /**
     * Checks if the current user matches the provided role.
     */
    hasRole(roleId: Roles | number): boolean {
        return this.getCurrentRoleId() === roleId;
    }

    /**
     * Checks if the current user matches any of the provided roles.
     */
    hasAnyRole(roles: ReadonlyArray<Roles | number>): boolean {
        if (!roles?.length) {
            return false;
        }
        const currentRole = this.getCurrentRoleId();
        return roles.some((role) => role === currentRole);
    }

    /**
     * Checks if the current user satisfies every role in the provided list.
     * (Useful for future scenarios with multiple role assignments.)
     */
    hasAllRoles(roles: ReadonlyArray<Roles | number>): boolean {
        if (!roles?.length) {
            return false;
        }
        return roles.every((role) => this.hasRole(role));
    }

    /**
     * Generic permission check that relies on the centralized matrix.
     */
    can(action: PermissionAction): boolean {
        const allowedRoles = PERMISSION_MATRIX[action];
        if (!allowedRoles) {
            return false;
        }
        return this.hasAnyRole(allowedRoles);
    }

    /**
     * Convenience helpers for frequently used permissions.
     */
    canCreateAccount(): boolean {
        return this.can('Create_Account');
    }

    canAssignAdmin(): boolean {
        return this.can('Assign_Entity_Admin');
    }

    canActivateAccount(): boolean {
        return this.can('Activate_Account');
    }

    canDeactivateAccount(): boolean {
        return this.can('Deactivate_Account');
    }

    canDeleteAccount(): boolean {
        return this.can('Delete_Account');
    }

    canRemoveEntityAdmin(): boolean {
        return this.can('Delete_Entity_Admin');
    }

    /**
     * Account Group Management permissions
     */
    canCreateAccountGroup(): boolean {
        return this.can('Create_Account_Group');
    }

    canManageAccountGroup(): boolean {
        return this.can('Update_Account_Group') || this.can('Delete_Account_Group');
    }

    canListPersonalGroups(): boolean {
        return this.can('List_Personal_Account_Groups');
    }

    canListEntityGroups(): boolean {
        return this.can('List_Entity_Account_Groups');
    }

    /**
     * Notification Types permissions
     */
    canListNotificationTypes(): boolean {
        return this.can('List_Notification_Types');
    }

    /**
     * Notification Categories - System permissions
     */
    canCreateNotificationCategory(): boolean {
        return this.can('Create_Notification_Category');
    }

    canGetNotificationCategory(): boolean {
        return this.can('Get_Notification_Category');
    }

    canListNotificationCategories(): boolean {
        return this.can('List_Notification_Categories');
    }

    canUpdateNotificationCategory(): boolean {
        return this.can('Update_Notification_Category');
    }

    canDeleteNotificationCategory(): boolean {
        return this.can('Delete_Notification_Category');
    }

    /**
     * Notification Categories - Entity permissions
     */
    canCreateEntityNotificationCategory(): boolean {
        return this.can('Create_Entity_Notification_Category');
    }

    canGetEntityNotificationCategory(): boolean {
        return this.can('Get_Entity_Notification_Category');
    }

    canListEntityNotificationCategories(): boolean {
        return this.can('List_Entity_Notification_Categories');
    }

    canUpdateEntityNotificationCategory(): boolean {
        return this.can('Update_Entity_Notification_Category');
    }

    canDeleteEntityNotificationCategory(): boolean {
        return this.can('Delete_Entity_Notification_Category');
    }

    /**
     * Notifications - System permissions
     */
    canCreateNotification(): boolean {
        return this.can('Create_Notification');
    }

    canGetNotification(): boolean {
        return this.can('Get_Notification');
    }

    canListNotifications(): boolean {
        return this.can('List_Notifications');
    }

    canUpdateNotification(): boolean {
        return this.can('Update_Notification');
    }

    canDeleteNotification(): boolean {
        return this.can('Delete_Notification');
    }

    /**
     * Notifications - Entity permissions
     */
    canCreateEntityNotification(): boolean {
        return this.can('Create_Entity_Notification');
    }

    canGetEntityNotification(): boolean {
        return this.can('Get_Entity_Notification');
    }

    canListEntityNotifications(): boolean {
        return this.can('List_Entity_Notifications');
    }

    canUpdateEntityNotification(): boolean {
        return this.can('Update_Entity_Notification');
    }

    canDeleteEntityNotification(): boolean {
        return this.can('Delete_Entity_Notification');
    }

    /**
     * Send Notification permissions
     */
    canSendNotificationToAccounts(): boolean {
        return this.can('Send_Notification_To_Accounts');
    }

    canSendNotificationToGroups(): boolean {
        return this.can('Send_Notification_To_Groups');
    }

    canSendNotificationToRoles(): boolean {
        return this.can('Send_Notification_To_Roles');
    }

    canSendNotificationToEntities(): boolean {
        return this.can('Send_Notification_To_Entities');
    }

    canSendNotificationToAll(): boolean {
        return this.can('Send_Notification_To_All');
    }

    /**
     * Account Notifications permissions
     */
    canListAccountNotifications(): boolean {
        return this.can('List_Account_Notifications');
    }

    canMarkNotificationsRead(): boolean {
        return this.can('Mark_Notifications_Read');
    }

    canMarkNotificationsUnread(): boolean {
        return this.can('Mark_Notifications_Unread');
    }

    canDeleteAccountNotifications(): boolean {
        return this.can('Delete_Account_Notifications');
    }

    canSubscribeToNotificationCategory(): boolean {
        return this.can('Subscribe_To_Notification_Category');
    }

    canUnsubscribeFromNotificationCategory(): boolean {
        return this.can('Unsubscribe_To_Notification_Category');
    }

    /**
     * Returns the allowed roles for a particular action.
     */
    getAllowedRoles(action: PermissionAction): ReadonlyArray<Roles> {
        return PERMISSION_MATRIX[action] || [];
    }

    /**
     * Returns the full permission matrix for debugging or diagnostics.
     */
    getPermissionMatrix(): Readonly<typeof PERMISSION_MATRIX> {
        return PERMISSION_MATRIX;
    }

    /**
     * Human-friendly role names for display.
     */
    getRoleName(systemRoleId: number): string {
        switch (systemRoleId) {
            case Roles.Developer:
                return 'Developer';
            case Roles.SystemAdministrator:
                return 'System Administrator';
            case Roles.EntityAdministrator:
                return 'Entity Administrator';
            case Roles.SystemUser:
                return 'System User';
            case Roles.Guest:
                return 'Guest';
            default:
                return 'Unknown';
        }
    }
}

