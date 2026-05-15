import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { NotificationsService } from '../../../services/notifications.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { NotificationRefreshService } from 'src/app/core/services/notification-refresh.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { AccountNotification, AccountNotificationBackend } from '../../../models/notifications.model';
import { IAccountDetails } from 'src/app/core/models/account-status.model';

type NotificationActionContext = 'list' | 'markRead' | 'markUnread' | 'delete' | 'subscribe' | 'unsubscribe';

@Component({
    selector: 'app-notifications-inbox',
    templateUrl: './notifications-inbox.component.html',
    styleUrls: ['./notifications-inbox.component.scss']
})
export class NotificationsInboxComponent implements OnInit, OnDestroy {
    notifications: AccountNotification[] = [];
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];

    /** When loading and notifications is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): AccountNotification[] {
        if (this.tableLoadingSpinner && this.notifications.length === 0) {
            return Array(10).fill(null).map(() => ({} as AccountNotification));
        }
        return this.notifications;
    }
    currentAccountId: number = 0;
    isRegional: boolean = false;
    private rawNotifications: AccountNotificationBackend[] = [];

    // Filters
    selectedTypeIds: number[] = [];
    selectedCategoryIds: number[] = [];
    textFilter: string = '';
    unreadOnly: boolean = false;

    // Pagination
    lastNotificationId: number = 0;
    totalCount: number = 0;
    filterCount: number = 20;

    // Available filters data
    notificationTypes: any[] = [];
    notificationCategories: any[] = [];

    constructor(
        private notificationsService: NotificationsService,
        private router: Router,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService,
        private notificationRefreshService: NotificationRefreshService
    ) {
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    }

    ngOnInit(): void {
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                this.mapRawNotifications();
            })
        );
        this.loadNotificationTypes();
        this.loadNotificationCategories();
        this.loadNotifications();

        // Sync when top bar does "Mark All as Read" in dropdown
        this.subscriptions.push(
            this.notificationRefreshService.onInboxRefreshRequested().subscribe(() => {
                this.lastNotificationId = 0;
                this.loadNotifications();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadNotificationTypes(): void {
        if (!this.permissionService.canListNotificationTypes()) {
            return;
        }

        const sub = this.notificationsService.listNotificationTypes().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const types = response?.message || [];
                    this.notificationTypes = Array.isArray(types) ? types : [];
                }
            },
            error: () => {
                // Silently fail - types are optional for filtering
            }
        });
        this.subscriptions.push(sub);
    }

    loadNotificationCategories(): void {
        // Load both System and Entity categories if user has permissions
        if (this.permissionService.canListNotificationCategories()) {
            const sub = this.notificationsService.listNotificationCategories(0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const categories = response?.message?.Categories || [];
                        const systemCategories = Array.isArray(categories) ? categories : [];
                        this.notificationCategories = [...this.notificationCategories, ...systemCategories];
                    }
                },
                error: () => {
                    // Silently fail
                }
            });
            this.subscriptions.push(sub);
        }

        // Load Entity categories if user is Entity Admin
        if (this.permissionService.canListEntityNotificationCategories()) {
            const entityId = this.notificationsService.getCurrentEntityId();
            if (entityId > 0) {
                const sub = this.notificationsService.listEntityNotificationCategories(entityId, 0, 100).subscribe({
                    next: (response: any) => {
                        if (response?.success) {
                            const categories = response?.message?.Categories || [];
                            const entityCategories = Array.isArray(categories) ? categories : [];
                            this.notificationCategories = [...this.notificationCategories, ...entityCategories];
                        }
                    },
                    error: () => {
                        // Silently fail
                    }
                });
                this.subscriptions.push(sub);
            }
        }
    }

    loadNotifications(): void {
        if (!this.currentAccountId) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Unable to get account information.'
            });
            this.resetLoadingFlags();
            return;
        }

        this.tableLoadingSpinner = true;

        const sub = this.notificationsService.listAccountNotifications(
            this.currentAccountId,
            this.selectedTypeIds,
            this.selectedCategoryIds,
            this.textFilter,
            this.unreadOnly,
            this.lastNotificationId,
            this.filterCount
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }

                const responseData = response?.message || response;
                this.totalCount = responseData?.Total_Count || 0;
                const notificationsData = responseData?.Notifications || responseData?.message || [];

                this.rawNotifications = Array.isArray(notificationsData)
                    ? notificationsData as AccountNotificationBackend[]
                    : [];
                this.mapRawNotifications();

                // Update lastNotificationId for pagination
                if (this.notifications.length > 0) {
                    this.lastNotificationId = this.notifications[this.notifications.length - 1].id;
                }
            },
            error: () => {
                this.resetLoadingFlags();
            },
            complete: () => {
                this.resetLoadingFlags();
            }
        });

        this.subscriptions.push(sub);
    }

    onFilterChange(): void {
        this.lastNotificationId = 0; // Reset pagination
        this.loadNotifications();
    }

    onUnreadOnlyChange(): void {
        this.onFilterChange();
    }

    markAsRead(notification: AccountNotification): void {
        if (!this.currentAccountId || !this.permissionService.canMarkNotificationsRead()) {
            return;
        }

        const sub = this.notificationsService.markNotificationsRead(this.currentAccountId, [notification.id]).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('markRead', response);
                    return;
                }

                notification.isRead = true;
                this.notificationRefreshService.requestTopBarRefresh();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification marked as read.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    markAsUnread(notification: AccountNotification): void {
        if (!this.currentAccountId || !this.permissionService.canMarkNotificationsUnread()) {
            return;
        }

        const sub = this.notificationsService.markNotificationsUnread(this.currentAccountId, [notification.id]).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('markUnread', response);
                    return;
                }

                notification.isRead = false;
                this.notificationRefreshService.requestTopBarRefresh();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification marked as unread.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    deleteNotification(notification: AccountNotification): void {
        if (!this.currentAccountId || !this.permissionService.canDeleteAccountNotifications()) {
            return;
        }

        const sub = this.notificationsService.deleteAccountNotifications(this.currentAccountId, [notification.id]).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    return;
                }

                this.rawNotifications = this.rawNotifications.filter(n => n.Notification_ID !== notification.id);
                this.mapRawNotifications();
                this.notificationRefreshService.requestTopBarRefresh();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification deleted.'
                });
            }
        });
        this.subscriptions.push(sub);
    }

    loadMore(): void {
        if (this.notifications.length < this.totalCount) {
            this.loadNotifications();
        }
    }

    private handleBusinessError(context: NotificationActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code);
                break;
            case 'markRead':
                detail = this.getMarkReadErrorMessage(code);
                break;
            case 'markUnread':
                detail = this.getMarkUnreadErrorMessage(code);
                break;
            case 'delete':
                detail = this.getDeleteErrorMessage(code);
                break;
            default:
                return null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }

        if (context === 'list') {
            this.resetLoadingFlags();
        }
        return null;
    }

    private getListErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return 'Invalid Account ID';
            case 'ERP11456':
                return 'Invalid one or more Type_ID';
            case 'ERP11457':
                return 'Invalid one or more Category_ID';
            case 'ERP11458':
                return 'Filter_Count must be between 5 and 100';
            default:
                return null;
        }
    }

    private getMarkReadErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return 'Invalid Account ID';
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }

    private getMarkUnreadErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return 'Invalid Account ID';
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11470':
                return 'Invalid Account ID';
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    private mapRawNotifications(): void {
        this.notifications = this.rawNotifications.map((notificationBackend: AccountNotificationBackend) => ({
            id: notificationBackend?.Notification_ID || 0,
            moduleId: notificationBackend?.Module_ID || 0,
            typeId: notificationBackend?.Type_ID || 0,
            categoryId: notificationBackend?.Category_ID || 0,
            entityId: notificationBackend?.Entity_ID || undefined,
            title: this.isRegional ? (notificationBackend?.Title_Regional || notificationBackend?.Title || '') : (notificationBackend?.Title || ''),
            message: this.isRegional
                ? (notificationBackend?.Message_Regional || notificationBackend?.Message || '')
                : (notificationBackend?.Message || ''),
            titleRegional: notificationBackend?.Title_Regional,
            messageRegional: notificationBackend?.Message_Regional,
            referenceType: notificationBackend?.Reference_Type || null,
            referenceId: notificationBackend?.Reference_ID || null,
            isRead: !Boolean((notificationBackend as any)?.Is_Unread),
            readAt: notificationBackend?.Read_At || null,
            createdAt: (notificationBackend as any)?.Received_At || notificationBackend?.Created_At || null
        }));
    }

    getUnreadCount(): number {
        return this.notifications.filter(n => !n.isRead).length;
    }

    /** Get type name from Type_ID using loaded notification types. */
    getTypeName(typeId: number): string {
        if (!typeId || !this.notificationTypes?.length) {
            return '—';
        }
        const type = this.notificationTypes.find(
            (t: any) => (t.type_ID ?? t.Type_ID ?? t.typeId) === typeId
        );
        return type?.title ?? type?.Title ?? String(typeId);
    }
}
