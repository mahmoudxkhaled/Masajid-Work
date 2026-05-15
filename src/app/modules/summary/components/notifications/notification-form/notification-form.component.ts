import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { NotificationsService } from '../../../services/notifications.service';
import { Notification } from '../../../models/notifications.model';

// Default Module ID for Summary module - should be configured based on actual module ID
const DEFAULT_MODULE_ID = 1;

type NotificationFormContext = 'create' | 'update';

@Component({
    selector: 'app-notification-form',
    templateUrl: './notification-form.component.html',
    styleUrls: ['./notification-form.component.scss']
})
export class NotificationFormComponent implements OnInit, OnDestroy, OnChanges {
    @Input() visible: boolean = false;
    @Input() notificationId?: number;
    @Input() isSystemNotification: boolean = true;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    notification: Notification | null = null;
    notificationCategories: any[] = [];
    currentEntityId: number = 0;
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
    }

    ngOnInit(): void {
        this.initForm();
        this.loadNotificationCategories();
    }

    ngOnChanges(changes: SimpleChanges): void {
        // When dialog opens
        if (changes['visible'] && this.visible) {
            this.resetForm();
            this.isEdit = !!this.notificationId;

            if (this.isEdit && this.notificationId) {
                // Use setTimeout to ensure notificationId is set
                setTimeout(() => {
                    this.loadNotification();
                }, 0);
            }
        }

        // Handle notificationId change when dialog is already open or when both change together
        if (changes['notificationId'] && this.visible) {
            const previousId = changes['notificationId'].previousValue;
            const currentId = changes['notificationId'].currentValue;

            // Only reload if ID actually changed
            if (previousId !== currentId) {
                this.isEdit = !!this.notificationId;
                if (this.isEdit && this.notificationId) {
                    setTimeout(() => {
                        this.loadNotification();
                    }, 0);
                } else {
                    this.resetForm();
                }
            }
        }
    }

    resetForm(): void {
        this.form.reset();
        this.submitted = false;
        this.notification = null;
        this.loading = false;
        this.form.patchValue({
            referenceType: null,
            referenceId: null
        });
    }

    closeDialog(): void {
        this.visible = false;
        this.visibleChange.emit(false);
        this.resetForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
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
        // Load System Categories
        if (this.permissionService.canListNotificationCategories()) {
            const sub = this.notificationsService.listNotificationCategories(0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const categories = response?.message?.Categories || [];
                        const systemCategories = Array.isArray(categories) ? categories : [];
                        this.notificationCategories = [...this.notificationCategories, ...systemCategories];
                    }
                }
            });
            this.subscriptions.push(sub);
        }

        // Load Entity Categories
        if (this.permissionService.canListEntityNotificationCategories() && this.currentEntityId > 0) {
            const sub = this.notificationsService.listEntityNotificationCategories(this.currentEntityId, 0, 100).subscribe({
                next: (response: any) => {
                    if (response?.success) {
                        const categories = response?.message?.Notification_Categories || response?.Notification_Categories || [];
                        const entityCategories = Array.isArray(categories) ? categories : [];
                        this.notificationCategories = [...this.notificationCategories, ...entityCategories];
                    }
                }
            });
            this.subscriptions.push(sub);
        }
    }

    loadNotification(): void {
        if (!this.notificationId) {
            return;
        }

        this.loading = true;
        const sub = (this.isSystemNotification
            ? this.notificationsService.getNotification(this.notificationId)
            : this.notificationsService.getEntityNotification(this.notificationId)
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                const notificationData = response?.message ?? {};

                // API returns snake_case format
                const notificationId = notificationData?.notification_ID || this.notificationId;
                const moduleId = notificationData?.module_ID || DEFAULT_MODULE_ID;
                const typeId = notificationData?.type_ID || 0;
                const categoryId = notificationData?.category_ID || 0;
                const entityId = notificationData?.entity_ID;
                const title = notificationData?.title || '';
                const titleRegional = notificationData?.title_Regional || '';
                const message = notificationData?.message || '';
                const messageRegional = notificationData?.message_Regional || '';
                const referenceType = notificationData?.reference_Type || null;
                const referenceId = notificationData?.reference_ID || null;
                const createdAt = notificationData?.created_At;

                this.notification = {
                    id: notificationId,
                    moduleId: moduleId,
                    typeId: typeId,
                    categoryId: categoryId,
                    entityId: entityId,
                    title: this.isRegional ? (titleRegional || title) : title,
                    message: this.isRegional ? (messageRegional || message) : message,
                    titleRegional: titleRegional,
                    messageRegional: messageRegional,
                    referenceType: referenceType,
                    referenceId: referenceId,
                    createdAt: createdAt,
                    isSystemNotification: this.isSystemNotification
                };

                const formTitle = this.isRegional && titleRegional ? titleRegional : title;
                const formMessage = this.isRegional && messageRegional ? messageRegional : message;

                this.form.patchValue({
                    categoryId: categoryId,
                    title: formTitle,
                    message: formMessage,
                    referenceType: referenceType,
                    referenceId: referenceId
                });
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
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

        if (this.isEdit && this.notificationId) {
            const sub = (this.isSystemNotification
                ? this.notificationsService.updateNotification(
                    this.notificationId,
                    categoryId,
                    title,
                    message,
                    this.isRegional,
                    referenceType,
                    referenceId
                )
                : this.notificationsService.updateEntityNotification(
                    this.notificationId,
                    categoryId,
                    title,
                    message,
                    this.isRegional,
                    referenceType,
                    referenceId
                )
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Notification updated successfully.'
                    });
                    this.closeDialog();
                    this.saved.emit();
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

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
                    this.handleBusinessError('create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Notification created successfully.'
                });
                this.closeDialog();
                this.saved.emit();
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.closeDialog();
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

    private handleBusinessError(context: NotificationFormContext | 'details', response: any): void | null {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (context) {
            case 'create':
                detail = this.getCreateErrorMessage(code);
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code);
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code);
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

        if (context !== 'details') {
            this.loading = false;
        }
        return null;
    }

    private getCreateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11460':
                return 'Invalid Module ID';
            case 'ERP11461':
                return 'Invalid Notification Title';
            case 'ERP11462':
                return 'Invalid Notification Message';
            case 'ERP11463':
                return 'Invalid Reference Type';
            case 'ERP11464':
                return 'Invalid Reference ID';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11465':
                return 'Invalid Notification ID';
            case 'ERP11461':
                return 'Invalid Notification Title';
            case 'ERP11462':
                return 'Invalid Notification Message';
            case 'ERP11463':
                return 'Invalid Reference Type';
            case 'ERP11464':
                return 'Invalid Reference ID';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11465':
                return 'Invalid Notification ID';
            default:
                return null;
        }
    }
}
