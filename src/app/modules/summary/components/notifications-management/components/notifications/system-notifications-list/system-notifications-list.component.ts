import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { Notification, NotificationBackend, NotificationCategoryBackend } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

type NotificationActionContext = 'list' | 'delete';

@Component({
    selector: 'app-system-notifications-list',
    templateUrl: './system-notifications-list.component.html',
    styleUrls: ['./system-notifications-list.component.scss']
})
export class SystemNotificationsListComponent implements OnInit, OnDestroy {
    @ViewChild('notificationsTableContainer') notificationsTableContainer?: ElementRef;

    notifications: Notification[] = [];
    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;
    private subscriptions: Subscription[] = [];
    private rawNotifications: NotificationBackend[] = [];
    private rawNotificationCategories: NotificationCategoryBackend[] = [];

    /** When loading and notifications is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): Notification[] {
        if (this.tableLoadingSpinner && this.notifications.length === 0) {
            return Array(10).fill(null).map(() => ({} as Notification));
        }
        return this.notifications;
    }
    menuItems: MenuItem[] = [];
    currentNotification?: Notification;
    // Dialog for form (Edit: notification-form)
    formDialogVisible: boolean = false;
    formNotificationId?: number;

    // Filters (sent to API)
    selectedTypeIds: number[] = [];
    selectedCategoryIds: number[] = [];
    textFilter: string = '';

    // Options for filters (loaded from API)
    notificationTypes: any[] = [];
    notificationCategories: any[] = [];

    // Pagination (handled by PrimeNG automatically)
    first: number = 0;
    rows: number = 10;

    // Sorting
    sortField: string = '';
    sortOrder: number = 0; // 1 for ascending, -1 for descending, 0 for no sort

    // Pagination (for API)
    lastNotificationId: number = 0;
    totalCount: number = 0;
    filterCount: number = 20;

    // Delete dialog
    deleteNotificationDialog: boolean = false;
    currentNotificationForDelete?: Notification;

    // Debounce timer for search
    private searchTimeout: any;

    constructor(
        private router: Router,
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private permissionService: PermissionService,
        private translate: TranslationService
    ) {
        this.isLoading$ = this.notificationsService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.configureMenuItems();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.mapRawNotificationCategories();
                this.mapRawNotifications();
            })
        );
        this.loadNotificationTypes();
        this.loadNotificationCategories();
        this.loadNotifications();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
        // Clear search timeout if exists
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
    }

    loadNotificationTypes(): void {
        if (!this.permissionService.canListNotificationTypes()) {
            return;
        }

        const sub = this.notificationsService.listNotificationTypes().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    console.log('loadNotificationType1111111111111sdasdasds response', response);
                    const typesData = response?.message || [];
                    // Map to the expected format for dropdown
                    this.notificationTypes = Array.isArray(typesData) ? typesData.map((item: any) => ({
                        type_ID: item?.type_ID ?? 0,
                        title: item?.title || ''
                    })) : [];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    loadNotificationCategories(): void {
        // Load System Categories only
        if (this.permissionService.canListNotificationCategories()) {
            const sub = this.notificationsService.listNotificationCategories(0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const responseData = response?.message || response;
                        const categories = responseData?.Categories || responseData?.Notification_Categories || [];
                        this.rawNotificationCategories = Array.isArray(categories)
                            ? categories as NotificationCategoryBackend[]
                            : [];
                        this.mapRawNotificationCategories();
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    configureMenuItems(): void {
        this.menuItems = [
            {
                label: this.translate.getInstant('shared.actions.viewDetails'),
                icon: 'pi pi-eye',
                command: () => {
                    if (this.currentNotification) {
                        this.viewDetails(this.currentNotification);
                    }
                }
            },
            {
                label: this.translate.getInstant('shared.actions.send'),
                icon: 'pi pi-send',
                command: () => {
                    if (this.currentNotification) {
                        this.sendNotification(this.currentNotification);
                    }
                }
            },
            {
                label: this.translate.getInstant('shared.actions.edit'),
                icon: 'pi pi-pencil',
                command: () => {
                    if (this.currentNotification) {
                        this.edit(this.currentNotification);
                    }
                }
            },
            {
                label: this.translate.getInstant('shared.actions.delete'),
                icon: 'pi pi-trash',
                command: () => {
                    if (this.currentNotification) {
                        this.confirmDelete(this.currentNotification);
                    }
                }
            }
        ];
    }

    loadNotifications(): void {
        this.tableLoadingSpinner = true;

        // Load System Notifications only
        const sub = this.notificationsService.listNotifications(
            this.selectedTypeIds,
            this.selectedCategoryIds,
            this.textFilter,
            this.lastNotificationId,
            this.filterCount
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                console.log('loadNotifications response', response);
                const responseData = response?.message || response;
                this.totalCount = responseData?.Total_Count || 0;
                const notificationsData = responseData?.Notifications || responseData?.message || [];

                this.rawNotifications = Array.isArray(notificationsData)
                    ? notificationsData as NotificationBackend[]
                    : [];
                this.mapRawNotifications();
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

    navigateToNew(): void {
        this.router.navigate(['/summary/notifications-management/send'], {
            queryParams: { mode: 'system' }
        });
    }

    edit(notification: Notification): void {
        this.formNotificationId = notification.id;
        this.formDialogVisible = true;
    }

    viewDetails(notification: Notification): void {
        // Open edit dialog to view details
        this.edit(notification);
    }

    sendNotification(notification: Notification): void {
        this.router.navigate(['/summary/notifications-management/send'], {
            queryParams: { mode: 'system', templateId: notification.id }
        });
    }

    openMenu(menu: any, notification: Notification, event: Event): void {
        this.currentNotification = notification;
        menu.toggle(event);
    }

    confirmDelete(notification: Notification): void {
        this.currentNotificationForDelete = notification;
        this.deleteNotificationDialog = true;
    }

    deleteNotification(): void {
        if (!this.currentNotificationForDelete) {
            return;
        }

        const notification = this.currentNotificationForDelete;
        const sub = this.notificationsService.deleteNotification(notification.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('delete', response);
                    return;
                }

                this.rawNotifications = this.rawNotifications.filter(n => n.Notification_ID !== notification.id);
                this.mapRawNotifications();
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification deleted successfully.'
                });
                this.deleteNotificationDialog = false;
                this.currentNotificationForDelete = undefined;
            }
        });

        this.subscriptions.push(sub);
    }

    onFilterChange(): void {
        this.lastNotificationId = 0;
        this.rawNotifications = [];
        this.notifications = [];
        this.loadNotifications();
    }

    onFormDialogClose(): void {
        this.formDialogVisible = false;
        this.formNotificationId = undefined;
    }

    onFormSaved(): void {
        this.onFormDialogClose();
        this.lastNotificationId = 0;
        this.rawNotifications = [];
        this.notifications = [];
        this.loadNotifications();
    }

    onPageChange(event: any): void {
        this.first = event.first;
        this.rows = event.rows;
        // Scroll to top of table when page changes
        this.scrollToTableTop();
    }

    scrollToTableTop(): void {
        // Use setTimeout to ensure the DOM has updated before scrolling
        setTimeout(() => {
            if (this.notificationsTableContainer) {
                this.notificationsTableContainer.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 0);
    }

    onSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        this.textFilter = target?.value || '';

        // Clear previous timeout
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }

        // Debounce: Wait 500ms after user stops typing before calling API
        this.searchTimeout = setTimeout(() => {
            this.onFilterChange();
        }, 500);
    }

    clearSearch(): void {
        this.textFilter = '';
        // Clear timeout if exists
        if (this.searchTimeout) {
            clearTimeout(this.searchTimeout);
        }
        // Reload notifications from API without search text
        this.onFilterChange();
    }

    onSort(event: any): void {
        this.sortField = event.field;
        this.sortOrder = event.order;
        // PrimeNG will automatically sort the filteredNotifications array
        // No need for manual sorting as we're using client-side sorting
    }


    canManageNotification(): boolean {
        return this.permissionService.canUpdateNotification() || this.permissionService.canDeleteNotification();
    }

    canSendNotification(): boolean {
        return this.permissionService.canSendNotificationToAccounts() ||
            this.permissionService.canSendNotificationToGroups() ||
            this.permissionService.canSendNotificationToRoles() ||
            this.permissionService.canSendNotificationToEntities() ||
            this.permissionService.canSendNotificationToAll();
    }

    private handleBusinessError(context: NotificationActionContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code);
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

    private getDeleteErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }

    private resetLoadingFlags(): void {
        this.tableLoadingSpinner = false;
    }

    private mapRawNotificationCategories(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.notificationCategories = this.rawNotificationCategories.map((item) => ({
            Category_ID: item?.Category_ID || 0,
            Title: isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
            Type_ID: item?.Type_ID || 0
        }));
    }

    private mapRawNotifications(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.notifications = this.rawNotifications.map((notificationBackend) => ({
            id: notificationBackend?.Notification_ID || 0,
            moduleId: notificationBackend?.Module_ID || 0,
            typeId: notificationBackend?.Type_ID || 0,
            categoryId: notificationBackend?.Category_ID || 0,
            entityId: undefined,
            title: isRegional ? (notificationBackend?.Title_Regional || notificationBackend?.Title || '') : (notificationBackend?.Title || ''),
            message: isRegional
                ? (notificationBackend?.Message_Regional || notificationBackend?.Message || '')
                : (notificationBackend?.Message || ''),
            titleRegional: notificationBackend?.Title_Regional,
            messageRegional: notificationBackend?.Message_Regional,
            referenceType: notificationBackend?.Reference_Type || null,
            referenceId: notificationBackend?.Reference_ID || null,
            createdAt: notificationBackend?.Created_At,
            isSystemNotification: true
        }));
    }
}
