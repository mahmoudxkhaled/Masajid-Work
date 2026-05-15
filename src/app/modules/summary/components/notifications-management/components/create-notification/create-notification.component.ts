import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { NotificationsService } from '../../../../services/notifications.service';

// Default Module ID for Summary module - should be configured based on actual module ID
const DEFAULT_MODULE_ID = 1;

@Component({
    selector: 'app-create-notification',
    templateUrl: './create-notification.component.html',
    styleUrls: ['./create-notification.component.scss']
})
export class CreateNotificationComponent implements OnInit, OnDestroy {
    /** When set by parent (e.g. Entity/System list dialog), use this mode and hide mode switch. */
    @Input() notificationMode?: 'system' | 'entity';
    @Output() notificationCreated = new EventEmitter<number>();

    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    systemCategories: any[] = [];
    entityCategories: any[] = [];
    currentEntityId: number = 0;
    isSystemAdmin: boolean = false;
    isEntityAdmin: boolean = false;
    isSystemNotification: boolean = true;
    referenceTypes: any[] = [
        { label: 'None', value: null },
        { label: 'Image', value: 'Image' },
        { label: 'Document', value: 'Document' },
        { label: 'Link', value: 'Link' },
        { label: 'Workflow', value: 'Workflow' }
    ];

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private notificationsService: NotificationsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
        this.currentEntityId = this.notificationsService.getCurrentEntityId();
        this.isSystemAdmin = this.notificationsService.isSystemAdmin();
        this.isEntityAdmin = this.notificationsService.isEntityAdmin();
    }

    ngOnInit(): void {
        this.initForm();
        this.loadNotificationCategories();
        this.determineNotificationType();
        if (this.notificationMode === 'system') {
            this.isSystemNotification = true;
        } else if (this.notificationMode === 'entity') {
            this.isSystemNotification = false;
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    determineNotificationType(): void {
        // Default to System if System Admin, Entity if Entity Admin only
        if (this.isSystemAdmin && !this.isEntityAdmin) {
            this.isSystemNotification = true;
        } else if (this.isEntityAdmin && !this.isSystemAdmin) {
            this.isSystemNotification = false;
        } else if (this.isSystemAdmin && this.isEntityAdmin) {
            // Both - default to System
            this.isSystemNotification = true;
        }
    }

    /** True when parent did not set notificationMode and user can choose (both admin). */
    canSwitchMode(): boolean {
        if (this.notificationMode !== undefined) {
            return false;
        }
        return this.isSystemAdmin && this.isEntityAdmin;
    }

    /** Switch between System and Entity mode; clears category so dropdown options match. */
    setNotificationMode(isSystem: boolean): void {
        this.isSystemNotification = isSystem;
        this.form.patchValue({ categoryId: '' });
    }

    initForm(): void {
        this.form = this.fb.group({
            categoryId: ['', [Validators.required]],
            title: ['', [Validators.required, textFieldValidator()]],
            message: ['', [Validators.required, textFieldValidator()]],
            referenceType: [null],
            referenceId: [null]
        });
    }

    loadNotificationCategories(): void {
        // Load System Categories (for System notification mode only)
        if (this.permissionService.canListNotificationCategories()) {
            const sub = this.notificationsService.listNotificationCategories(0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        console.log('loadNotificationCategories222222222222 response', response);
                        const categories = response?.message?.Categories || [];
                        const all = Array.isArray(categories) ? categories : [];
                        // System categories: only those with Entity_ID empty (no entity = system level)
                        this.systemCategories = all.filter((c: any) =>
                            c.Entity_ID === '' || c.Entity_ID == null || c.Entity_ID === undefined
                        );
                    }
                }
            });
            this.subscriptions.push(sub);
        }

        // Load Entity Categories (for Entity notification mode only)
        if (this.permissionService.canListEntityNotificationCategories() && this.currentEntityId > 0) {
            const sub = this.notificationsService.listEntityNotificationCategories(this.currentEntityId, 0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        console.log('loadEntityNotificationCategories222222222 response', response);
                        const message = response?.message || {};
                        const categories = message?.Categories ?? [];
                        this.entityCategories = Array.isArray(categories) ? categories : [];
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    /** Categories to show in dropdown: System categories in System mode, Entity categories in Entity mode. */
    get displayCategories(): any[] {
        return this.isSystemNotification ? this.systemCategories : this.entityCategories;
    }

    submit(): void {
        this.submitted = true;

        if (this.loading) {
            return;
        }

        if (this.form.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        this.loading = true;
        const { categoryId, title, message, referenceType, referenceId } = this.form.value;

        // Create new notification
        const sub = (this.isSystemNotification
            ? this.notificationsService.createNotification(
                DEFAULT_MODULE_ID,
                categoryId,
                title,
                message,
                referenceType,
                referenceId
            )
            : this.notificationsService.createEntityNotification(
                DEFAULT_MODULE_ID,
                categoryId,
                this.currentEntityId,
                title,
                message,
                referenceType,
                referenceId
            )
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                // Get notification ID from response
                const notificationId = response?.message?.Notification_ID || response?.Notification_ID || 0;

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification created successfully.'
                });

                // Reset form
                this.resetForm();

                // Emit notification ID to parent component
                if (notificationId > 0) {
                    this.notificationCreated.emit(notificationId);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    resetForm(): void {
        this.form.reset();
        this.submitted = false;
        this.loading = false;
        this.form.patchValue({
            referenceType: null,
            referenceId: null
        });
    }

    get f() {
        return this.form.controls;
    }

    get titleError(): string {
        return getTextFieldError(this.form.get('title'), 'Title', true);
    }

    get messageError(): string {
        return getTextFieldError(this.form.get('message'), 'Message', true);
    }

    private handleBusinessError(response: any): void {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (code) {
            case 'ERP11460':
                detail = 'Invalid Module ID';
                break;
            case 'ERP11461':
                detail = 'Invalid Notification Title';
                break;
            case 'ERP11462':
                detail = 'Invalid Notification Message';
                break;
            case 'ERP11463':
                detail = 'Invalid Reference Type';
                break;
            case 'ERP11464':
                detail = 'Invalid Reference ID';
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
        this.loading = false;
    }
}
