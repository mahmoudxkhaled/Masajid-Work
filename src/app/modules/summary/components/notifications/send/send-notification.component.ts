import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { GroupsService } from '../../../services/groups.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { Group } from '../../../models/groups.model';
import { IAccountSettings, IAccountDetails } from 'src/app/core/models/account-status.model';
import { NotificationsService } from '../../../services/notifications.service';
import { Notification } from '../../../models/notifications.model';

type SendTargetType = 'accounts' | 'groups' | 'roles' | 'entities' | 'all';

@Component({
    selector: 'app-send-notification',
    templateUrl: './send-notification.component.html',
    styleUrls: ['./send-notification.component.scss']
})
export class SendNotificationComponent implements OnInit, OnDestroy {
    notificationId: number = 0;
    notification: Notification | null = null;
    loading: boolean = false;
    sending: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    currentAccountId: number = 0;
    currentEntityId: number = 0;

    // Send target
    selectedTargetType: SendTargetType = 'accounts';

    // Accounts
    availableAccounts: any[] = [];
    selectedAccountIds: number[] = [];

    // Groups (Personal Groups only)
    availableGroups: Group[] = [];
    selectedGroupIds: number[] = [];

    // Roles
    availableRoles: any[] = [];
    selectedRoleIds: number[] = [];

    // Entities
    availableEntities: any[] = [];
    selectedEntityIds: number[] = [];

    private subscriptions: Subscription[] = [];

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private notificationsService: NotificationsService,
        private groupsService: GroupsService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        const accountDetails = this.localStorageService.getAccountDetails() as IAccountDetails;
        this.currentAccountId = accountDetails?.Account_ID || 0;
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
    }

    ngOnInit(): void {
        this.route.params.subscribe(params => {
            this.notificationId = Number(params['id']);
            if (this.notificationId) {
                this.loadNotification();
            }
        });
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    loadNotification(): void {
        this.loading = true;
        // Try System first, then Entity
        const sub = this.notificationsService.getNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapNotification(response.message, true);
                } else {
                    this.loadEntityNotification();
                }
                this.loading = false;
            },
            error: () => {
                this.loadEntityNotification();
            }
        });
        this.subscriptions.push(sub);
    }

    loadEntityNotification(): void {
        const sub = this.notificationsService.getEntityNotification(this.notificationId).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.mapNotification(response.message, false);
                }
                this.loading = false;
            },
            error: () => {
                this.loading = false;
            }
        });
        this.subscriptions.push(sub);
    }

    mapNotification(notificationData: any, isSystem: boolean): void {
        this.notification = {
            id: notificationData?.Notification_ID || this.notificationId,
            moduleId: notificationData?.Module_ID || 0,
            typeId: notificationData?.Type_ID || 0,
            categoryId: notificationData?.Category_ID || 0,
            entityId: notificationData?.Entity_ID,
            title: this.isRegional ? (notificationData?.Title_Regional || notificationData?.Title || '') : (notificationData?.Title || ''),
            message: this.isRegional ? (notificationData?.Message_Regional || notificationData?.Message || '') : (notificationData?.Message || ''),
            titleRegional: notificationData?.Title_Regional,
            messageRegional: notificationData?.Message_Regional,
            referenceType: notificationData?.Reference_Type || null,
            referenceId: notificationData?.Reference_ID || null,
            createdAt: notificationData?.Created_At,
            isSystemNotification: isSystem
        };
    }

    onTargetTypeChange(): void {
        // Load data based on selected target type
        switch (this.selectedTargetType) {
            case 'accounts':
                this.loadAccounts();
                break;
            case 'groups':
                this.loadGroups();
                break;
            case 'roles':
                this.loadRoles();
                break;
            case 'entities':
                this.loadEntities();
                break;
        }
    }

    loadAccounts(): void {
        if (this.currentEntityId > 0) {
            const sub = this.entitiesService.getEntityAccountsList(this.currentEntityId.toString()).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const accounts = response?.message || [];
                        this.availableAccounts = Array.isArray(accounts) ? accounts : [];
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    loadGroups(): void {
        // Load Personal Groups only (owner check)
        const sub = this.groupsService.listPersonalGroups(this.currentAccountId, false).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const groupsData = response?.message?.Account_Groups || response?.message || [];
                    this.availableGroups = Array.isArray(groupsData) ? groupsData
                        .filter((g: any) => g.entityID === 0 || g.entityID === null) // Personal Groups only
                        .map((item: any) => ({
                            id: String(item.groupID || ''),
                            title: this.isRegional ? (item.title_Regional || item.title || '') : (item.title || ''),
                            description: this.isRegional ? (item.description_Regional || item.description || '') : (item.description || ''),
                            entityId: 0,
                            active: true,
                            createAccountId: item.createAccountID || 0
                        })) : [];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    loadRoles(): void {
        // TODO: Load Entity Roles - need to check if there's a service for this
        this.availableRoles = [];
    }

    loadEntities(): void {
        // TODO: Load Entities - need to check if there's a service for this
        this.availableEntities = [];
    }

    send(): void {
        if (!this.notification) {
            return;
        }

        // Validate selection based on target type
        if (this.selectedTargetType === 'accounts' && this.selectedAccountIds.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select at least one account.'
            });
            return;
        }

        if (this.selectedTargetType === 'groups' && this.selectedGroupIds.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select at least one group.'
            });
            return;
        }

        if (this.selectedTargetType === 'roles' && this.selectedRoleIds.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select at least one role.'
            });
            return;
        }

        if (this.selectedTargetType === 'entities' && this.selectedEntityIds.length === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select at least one entity.'
            });
            return;
        }

        this.sending = true;
        let sub: Subscription;

        switch (this.selectedTargetType) {
            case 'accounts':
                sub = this.notificationsService.sendNotificationToAccounts(this.notificationId, this.selectedAccountIds).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleSendError(response);
                            return;
                        }
                        this.handleSendSuccess();
                    },
                    complete: () => this.sending = false
                });
                break;
            case 'groups':
                sub = this.notificationsService.sendNotificationToGroups(this.notificationId, this.selectedGroupIds).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleSendError(response);
                            return;
                        }
                        this.handleSendSuccess();
                    },
                    complete: () => this.sending = false
                });
                break;
            case 'roles':
                sub = this.notificationsService.sendNotificationToRoles(this.notificationId, this.selectedRoleIds).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleSendError(response);
                            return;
                        }
                        this.handleSendSuccess();
                    },
                    complete: () => this.sending = false
                });
                break;
            case 'entities':
                sub = this.notificationsService.sendNotificationToEntities(this.notificationId, this.selectedEntityIds).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleSendError(response);
                            return;
                        }
                        this.handleSendSuccess();
                    },
                    complete: () => this.sending = false
                });
                break;
            case 'all':
                if (!this.permissionService.canSendNotificationToAll()) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Access Denied',
                        detail: 'Only System Administrators can send notifications to all users.'
                    });
                    this.sending = false;
                    return;
                }
                sub = this.notificationsService.sendNotificationToAll(this.notificationId).subscribe({
                    next: (response: any) => {
                        if (!response?.success) {
                            this.handleSendError(response);
                            return;
                        }
                        this.handleSendSuccess();
                    },
                    complete: () => this.sending = false
                });
                break;
        }

        if (sub) {
            this.subscriptions.push(sub);
        }
    }

    handleSendSuccess(): void {
        this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Notification sent successfully.'
        });
        this.router.navigate(['/summary/notifications/notifications']);
    }

    handleSendError(response: any): void {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (code) {
            case 'ERP11466':
                detail = 'Invalid Account IDs';
                break;
            case 'ERP11467':
                detail = 'Invalid Group IDs';
                break;
            case 'ERP11468':
                detail = 'Invalid Entity Role IDs';
                break;
            case 'ERP11469':
                detail = 'Invalid Entity IDs';
                break;
            default:
                detail = null;
        }

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    navigateBack(): void {
        this.router.navigate(['/summary/notifications/notifications', this.notificationId]);
    }

    canSendToAll(): boolean {
        return this.permissionService.canSendNotificationToAll();
    }
}
