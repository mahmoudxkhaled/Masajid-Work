import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Roles } from 'src/app/core/models/system-roles';

/**
 * Service for managing Notifications
 * Handles Notification Types, Categories, Notifications, Send, and Account Notifications
 */
@Injectable({
    providedIn: 'root',
})
export class NotificationsService {
    isLoadingSubject = new BehaviorSubject<boolean>(false);

    constructor(
        private apiServices: ApiService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.isLoadingSubject = new BehaviorSubject<boolean>(false);
    }

    private getAccessToken(): string {
        return this.localStorageService.getAccessToken();
    }

    private getAccountId(): number {
        const accountDetails = this.localStorageService.getAccountDetails();
        return accountDetails?.Account_ID || 0;
    }

    private getEntityId(): number {
        const entityDetails = this.localStorageService.getEntityDetails();
        const entityIdFromDetails = entityDetails?.Entity_ID || 0;
        if (entityIdFromDetails > 0) {
            return entityIdFromDetails;
        }
        // Fallback for Entity Admin: use Entity_ID from Account_Details when Entity_Details is missing
        const accountDetails = this.localStorageService.getAccountDetails();
        return accountDetails?.Entity_ID || 0;
    }

    /**
     * Check if current user is System Admin
     */
    isSystemAdmin(): boolean {
        return this.permissionService.hasRole(Roles.SystemAdministrator) ||
            this.permissionService.hasRole(Roles.Developer);
    }

    /**
     * Check if current user is Entity Admin
     */
    isEntityAdmin(): boolean {
        return this.permissionService.hasRole(Roles.EntityAdministrator) ||
            this.permissionService.hasRole(Roles.SystemAdministrator) ||
            this.permissionService.hasRole(Roles.Developer);
    }

    /**
     * Get current user's account ID
     */
    getCurrentAccountId(): number {
        return this.getAccountId();
    }

    /**
     * Get current entity ID
     */
    getCurrentEntityId(): number {
        return this.getEntityId();
    }

    // ==================== Notification Types (Code 800) ====================

    /**
     * List all notification types
     * API Code: 800
     */
    listNotificationTypes(): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(800, this.getAccessToken(), []).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Notification Categories - System (Codes 810-814) ====================

    /**
     * Create a new System Notification Category
     * API Code: 810
     * @param typeId - Notification Type ID
     * @param title - Category title
     * @param description - Category description
     * @param canBeUnsubscribed - Whether users can unsubscribe
     */
    createNotificationCategory(
        typeId: number,
        title: string,
        description: string,
        sendEmail: boolean,
        canBeUnsubscribed: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            typeId,
            title,
            description,
            sendEmail,
            canBeUnsubscribed
        ];
        console.log('params', params);

        return this.apiServices.callAPI(810, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get a specific System Notification Category
     * API Code: 811
     * @param categoryId - Category ID
     */
    getNotificationCategory(categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(811, this.getAccessToken(), [categoryId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List all System Notification Categories
     * API Code: 812
     * @param lastCategoryId - Last Category ID for pagination (-ve if page number)
     * @param filterCount - Number of records (min 5, max 100)
     */
    listNotificationCategories(lastCategoryId: number = 0, filterCount: number = 20): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [lastCategoryId.toString(), filterCount.toString()];
        return this.apiServices.callAPI(812, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update a System Notification Category
     * API Code: 813
     * @param categoryId - Category ID
     * @param typeId - Notification Type ID
     * @param title - Category title
     * @param description - Category description
     * @param sendEmail - Whether to send email notifications
     * @param isRegional - Whether to use regional fields
     * @param canBeUnsubscribed - Whether users can unsubscribe
     */
    updateNotificationCategory(
        categoryId: number,
        typeId: number,
        title: string,
        description: string,
        sendEmail: boolean,
        isRegional: boolean,
        canBeUnsubscribed: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            categoryId.toString(),
            typeId.toString(),
            title,
            description,
            isRegional.toString(),
            sendEmail.toString(),
            canBeUnsubscribed.toString(),
        ];
        console.log('params', params);
        return this.apiServices.callAPI(813, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete a System Notification Category
     * API Code: 814
     * @param categoryId - Category ID
     */
    deleteNotificationCategory(categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(814, this.getAccessToken(), [categoryId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Notification Categories - Entity (Codes 815-819) ====================

    /**
     * Create a new Entity Notification Category
     * API Code: 815
     * @param entityId - Entity ID
     * @param typeId - Notification Type ID
     * @param title - Category title
     * @param description - Category description
     * @param sendEmail - Whether to send email notifications
     * @param canBeUnsubscribed - Whether users can unsubscribe
     */
    createEntityNotificationCategory(
        entityId: number,
        typeId: number,
        title: string,
        description: string,
        sendEmail: boolean,
        canBeUnsubscribed: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            entityId,
            typeId,
            title,
            description,
            sendEmail,
            canBeUnsubscribed
        ];
        return this.apiServices.callAPI(815, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get a specific Entity Notification Category
     * API Code: 816
     * @param categoryId - Category ID
     */
    getEntityNotificationCategory(categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(816, this.getAccessToken(), [categoryId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List all Entity Notification Categories
     * API Code: 817
     * @param entityId - Entity ID
     * @param lastCategoryId - Last Category ID for pagination (-ve if page number)
     * @param filterCount - Number of records (min 5, max 100)
     */
    listEntityNotificationCategories(
        entityId: number,
        lastCategoryId: number = 0,
        filterCount: number = 20
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [entityId.toString(), lastCategoryId.toString(), filterCount.toString()];
        return this.apiServices.callAPI(817, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update an Entity Notification Category
     * API Code: 818
     * @param categoryId - Category ID
     * @param typeId - Notification Type ID
     * @param title - Category title
     * @param description - Category description
     * @param sendEmail - Whether to send email notifications
     * @param isRegional - Whether to use regional fields
     * @param canBeUnsubscribed - Whether users can unsubscribe
     */
    updateEntityNotificationCategory(
        categoryId: number,
        typeId: number,
        title: string,
        description: string,
        sendEmail: boolean,
        isRegional: boolean,
        canBeUnsubscribed: boolean
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            categoryId.toString(),
            typeId.toString(),
            title,
            description,
            isRegional.toString(),
            sendEmail.toString(),
            canBeUnsubscribed.toString(),
        ];
        return this.apiServices.callAPI(818, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete an Entity Notification Category
     * API Code: 819
     * @param categoryId - Category ID
     */
    deleteEntityNotificationCategory(categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(819, this.getAccessToken(), [categoryId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Notifications - System (Codes 820-824) ====================

    /**
     * Create a new System Notification
     * API Code: 820
     * @param moduleId - Module ID (depends on calling module from Frontend)
     * @param categoryId - Category ID
     * @param title - Notification title
     * @param message - Notification message
     * @param referenceType - Reference type (Image/Document/Link/Workflow) or null
     * @param referenceId - Reference ID or null
     */
    createNotification(
        moduleId: number,
        categoryId: number,
        title: string,
        message: string,
        referenceType: string | null = null,
        referenceId: number | null = null
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            moduleId.toString(),
            categoryId.toString(),
            title,
            message,
            referenceType || '',
            referenceId ? referenceId.toString() : '0'
        ];
        console.log('params111111', params);
        return this.apiServices.callAPI(820, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get a specific System Notification
     * API Code: 821
     * @param notificationId - Notification ID
     */
    getNotification(notificationId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(821, this.getAccessToken(), [notificationId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List all System Notifications
     * API Code: 822
     * @param typeFilter - List of Type IDs to filter by (empty array or {0} to ignore)
     * @param categoryFilter - List of Category IDs to filter by (empty array or {0} to ignore)
     * @param textFilter - Text filter (empty string to ignore)
     * @param lastNotificationId - Last Notification ID for pagination (-ve if page number)
     * @param filterCount - Number of records (min 5, max 100)
     */
    listNotifications(
        typeFilter: number[] = [],
        categoryFilter: number[] = [],
        textFilter: string = '',
        lastNotificationId: number = 0,
        filterCount: number = 20
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const typeFilterStr = typeFilter.length === 0 ? '{}' : JSON.stringify(typeFilter);
        const categoryFilterStr = categoryFilter.length === 0 ? '{}' : JSON.stringify(categoryFilter);
        const params = [
            typeFilterStr,
            categoryFilterStr,
            textFilter,
            lastNotificationId.toString(),
            filterCount.toString()
        ];
        return this.apiServices.callAPI(822, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update a System Notification
     * API Code: 823
     * @param notificationId - Notification ID
     * @param categoryId - Category ID
     * @param title - Notification title
     * @param message - Notification message
     * @param isRegional - Whether to use regional fields
     * @param referenceType - Reference type or null
     * @param referenceId - Reference ID or null
     */
    updateNotification(
        notificationId: number,
        categoryId: number,
        title: string,
        message: string,
        isRegional: boolean,
        referenceType: string | null = null,
        referenceId: number | null = null
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            notificationId.toString(),
            categoryId.toString(),
            title,
            message,
            isRegional.toString(),
            referenceType || '',
            referenceId ? referenceId.toString() : '0'
        ];
        return this.apiServices.callAPI(823, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete a System Notification
     * API Code: 824
     * @param notificationId - Notification ID
     */
    deleteNotification(notificationId: number): Observable<any> {
        console.log('deleteNotification notificationId', notificationId);
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(824, this.getAccessToken(), [notificationId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Notifications - Entity (Codes 825-829) ====================

    /**
     * Create a new Entity Notification
     * API Code: 825
     * @param moduleId - Module ID (depends on calling module from Frontend)
     * @param categoryId - Category ID
     * @param entityId - Entity ID
     * @param title - Notification title
     * @param message - Notification message
     * @param referenceType - Reference type or null
     * @param referenceId - Reference ID or null
     */
    createEntityNotification(
        moduleId: number,
        categoryId: number,
        entityId: number,
        title: string,
        message: string,
        referenceType: string | null = null,
        referenceId: number | null = null
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            moduleId.toString(),
            categoryId.toString(),
            entityId.toString(),
            title,
            message,
            referenceType || '',
            referenceId ? referenceId.toString() : '0'
        ];
        console.log('params', params);
        return this.apiServices.callAPI(825, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Get a specific Entity Notification
     * API Code: 826
     * @param notificationId - Notification ID
     */
    getEntityNotification(notificationId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(826, this.getAccessToken(), [notificationId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * List all Entity Notifications
     * API Code: 827
     * @param entityId - Entity ID
     * @param typeFilter - List of Type IDs to filter by
     * @param categoryFilter - List of Category IDs to filter by
     * @param textFilter - Text filter
     * @param lastNotificationId - Last Notification ID for pagination
     * @param filterCount - Number of records (min 5, max 100)
     */
    listEntityNotifications(
        entityId: number,
        typeFilter: number[] = [],
        categoryFilter: number[] = [],
        textFilter: string = '',
        lastNotificationId: number = 0,
        filterCount: number = 20
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const typeFilterStr = typeFilter.length === 0 ? '{}' : JSON.stringify(typeFilter);
        const categoryFilterStr = categoryFilter.length === 0 ? '{}' : JSON.stringify(categoryFilter);
        const params = [
            entityId.toString(),
            typeFilterStr,
            categoryFilterStr,
            textFilter,
            lastNotificationId.toString(),
            filterCount.toString()
        ];
        return this.apiServices.callAPI(827, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Update an Entity Notification
     * API Code: 828
     * @param notificationId - Notification ID
     * @param categoryId - Category ID
     * @param title - Notification title
     * @param message - Notification message
     * @param isRegional - Whether to use regional fields
     * @param referenceType - Reference type or null
     * @param referenceId - Reference ID or null
     */
    updateEntityNotification(
        notificationId: number,
        categoryId: number,
        title: string,
        message: string,
        isRegional: boolean,
        referenceType: string | null = null,
        referenceId: number | null = null
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [
            notificationId.toString(),
            categoryId.toString(),
            title,
            message,
            isRegional.toString(),
            referenceType || '',
            referenceId ? referenceId.toString() : ''
        ];
        return this.apiServices.callAPI(828, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete an Entity Notification
     * API Code: 829
     * @param notificationId - Notification ID
     */
    deleteEntityNotification(notificationId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(829, this.getAccessToken(), [notificationId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Send Notifications (Codes 830-834) ====================

    /**
     * Send notification to specific accounts
     * API Code: 830
     * @param notificationId - Notification ID
     * @param accountIds - List of Account IDs
     */
    sendNotificationToAccounts(notificationId: number, accountIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        console.log('notificationId sendNotificationToAccounts', notificationId);
        console.log('accountIds sendNotificationToAccounts', accountIds);
        const params = [notificationId, JSON.stringify(accountIds)];
        console.log('params sendNotificationToAccounts', params);
        return this.apiServices.callAPI(830, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Send notification to groups
     * API Code: 831
     * @param notificationId - Notification ID
     * @param groupIds - List of Group IDs
     */
    sendNotificationToGroups(notificationId: number, groupIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [notificationId.toString(), JSON.stringify(groupIds)];
        return this.apiServices.callAPI(831, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Send notification to roles
     * API Code: 832
     * @param notificationId - Notification ID
     * @param roleIds - List of Entity Role IDs
     */
    sendNotificationToRoles(notificationId: number, roleIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [notificationId.toString(), JSON.stringify(roleIds)];
        return this.apiServices.callAPI(832, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Send notification to entities
     * API Code: 833
     * @param notificationId - Notification ID
     * @param entityIds - List of Entity IDs
     */
    sendNotificationToEntities(notificationId: number, entityIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [notificationId.toString(), JSON.stringify(entityIds)];
        return this.apiServices.callAPI(833, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Send notification to all system users
     * API Code: 834
     * @param notificationId - Notification ID
     */
    sendNotificationToAll(notificationId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        return this.apiServices.callAPI(834, this.getAccessToken(), [notificationId.toString()]).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    // ==================== Account Notifications (Codes 840-845) ====================

    /**
     * List account notifications (Inbox)
     * API Code: 843
     * @param accountId - Account ID
     * @param typeFilter - List of Type IDs to filter by
     * @param categoryFilter - List of Category IDs to filter by
     * @param textFilter - Text filter
     * @param unreadOnly - Show only unread notifications
     * @param lastNotificationId - Last Notification ID for pagination
     * @param filterCount - Number of records (min 5, max 100)
     */
    listAccountNotifications(
        accountId: number,
        typeFilter: number[] = [],
        categoryFilter: number[] = [],
        textFilter: string = '',
        unreadOnly: boolean = false,
        lastNotificationId: number = 0,
        filterCount: number = 20
    ): Observable<any> {
        this.isLoadingSubject.next(true);
        const typeFilterStr = typeFilter.length === 0 ? '{}' : JSON.stringify(typeFilter);
        const categoryFilterStr = categoryFilter.length === 0 ? '{}' : JSON.stringify(categoryFilter);
        const params = [
            accountId.toString(),
            typeFilterStr,
            categoryFilterStr,
            textFilter,
            unreadOnly.toString(),
            lastNotificationId.toString(),
            filterCount.toString()
        ];
        console.log('params listAccountNotifications', params);
        return this.apiServices.callAPI(843, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Mark notifications as read
     * API Code: 840
     * @param accountId - Account ID
     * @param notificationIds - List of Notification IDs
     */
    markNotificationsRead(accountId: number, notificationIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), JSON.stringify(notificationIds)];
        return this.apiServices.callAPI(840, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Mark notifications as unread
     * API Code: 841
     * @param accountId - Account ID
     * @param notificationIds - List of Notification IDs
     */
    markNotificationsUnread(accountId: number, notificationIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), JSON.stringify(notificationIds)];
        return this.apiServices.callAPI(841, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Delete account notifications
     * API Code: 842
     * @param accountId - Account ID
     * @param notificationIds - List of Notification IDs
     */
    deleteAccountNotifications(accountId: number, notificationIds: number[]): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), JSON.stringify(notificationIds)];
        return this.apiServices.callAPI(842, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }

    /**
     * Subscribe to notification category
     * API Code: 844
     * @param accountId - Account ID
     * @param categoryId - Category ID
     */
    subscribeToNotificationCategory(accountId: number, categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), categoryId.toString()];
        return this.apiServices.callAPI(844, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }    /**
     * Unsubscribe from notification category
     * API Code: 845
     * @param accountId - Account ID
     * @param categoryId - Category ID
     */
    unsubscribeFromNotificationCategory(accountId: number, categoryId: number): Observable<any> {
        this.isLoadingSubject.next(true);
        const params = [accountId.toString(), categoryId.toString()];
        return this.apiServices.callAPI(845, this.getAccessToken(), params).pipe(
            finalize(() => this.isLoadingSubject.next(false))
        );
    }
}