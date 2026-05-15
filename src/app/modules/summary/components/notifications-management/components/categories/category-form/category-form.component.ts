import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { NotificationCategory } from 'src/app/modules/summary/models/notifications.model';
import { NotificationsService } from 'src/app/modules/summary/services/notifications.service';

type CategoryFormContext = 'create' | 'update';

@Component({
    selector: 'app-category-form',
    templateUrl: './category-form.component.html',
    styleUrls: ['./category-form.component.scss']
})
export class CategoryFormComponent implements OnInit, OnDestroy, OnChanges {
    @Input() visible: boolean = false;
    @Input() categoryId?: number; // Optional: for edit mode
    @Input() isSystemCategory: boolean = true; // true for System, false for Entity
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    category: NotificationCategory | null = null;
    notificationTypes: any[] = [];
    currentEntityId: number = 0;

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
        this.loadNotificationTypes();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
            this.isEdit = !!this.categoryId;

            if (this.isEdit && this.categoryId) {
                this.loadCategory();
            }
        }
    }

    resetForm(): void {
        this.form.reset();
        this.submitted = false;
        this.category = null;
        this.loading = false;
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
            typeId: ['', [Validators.required]],
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]],
            sendEmail: [false],
            canBeUnsubscribed: [false]
        });
    }

    loadNotificationTypes(): void {
        if (!this.permissionService.canListNotificationTypes()) {
            return;
        }

        const sub = this.notificationsService.listNotificationTypes().subscribe({
            next: (response: any) => {
                if (response?.success) {
                    console.log('loadNotificationTypes response', response);
                    const typesData = response?.message || response?.Notification_Types || [];
                    // Map to the expected format for dropdown (using new API structure)
                    this.notificationTypes = Array.isArray(typesData) ? typesData.map((item: any) => ({
                        type_ID: item?.type_ID ?? 0,
                        title: item?.title || ''
                    })) : [];
                }
            }
        });
        this.subscriptions.push(sub);
    }

    loadCategory(): void {
        if (!this.categoryId) {
            return;
        }

        this.loading = true;
        const sub = (this.isSystemCategory
            ? this.notificationsService.getNotificationCategory(this.categoryId)
            : this.notificationsService.getEntityNotificationCategory(this.categoryId)
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                const categoryData = response?.message ?? {};

                this.category = {
                    id: categoryData?.Category_ID || this.categoryId,
                    typeId: categoryData?.Type_ID || 0,
                    title: this.isRegional ? (categoryData?.Title_Regional || categoryData?.Title || '') : (categoryData?.Title || ''),
                    description: this.isRegional ? (categoryData?.Description_Regional || categoryData?.Description || '') : (categoryData?.Description || ''),
                    titleRegional: categoryData?.Title_Regional,
                    descriptionRegional: categoryData?.Description_Regional,
                    sendEmail: Boolean(categoryData?.Send_Email),
                    canBeUnsubscribed: Boolean(categoryData?.Can_Be_Unsubscribed),
                    entityId: categoryData?.Entity_ID,
                    isSystemCategory: this.isSystemCategory
                };

                const title = this.isRegional && categoryData?.Title_Regional
                    ? categoryData.Title_Regional
                    : (categoryData?.Title || '');
                const description = this.isRegional && categoryData?.Description_Regional
                    ? categoryData.Description_Regional
                    : (categoryData?.Description || '');

                this.form.patchValue({
                    typeId: this.category?.typeId || 0,
                    title: title,
                    description: description,
                    sendEmail: this.category?.sendEmail ?? false,
                    canBeUnsubscribed: this.category?.canBeUnsubscribed ?? false
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
        const { typeId, title, description, sendEmail, canBeUnsubscribed } = this.form.value;

        // Ensure boolean values are never null - convert to false if null/undefined
        const sendEmailValue = sendEmail ?? 'false';
        const canBeUnsubscribedValue = canBeUnsubscribed ?? 'false';

        if (this.isEdit && this.categoryId) {
            const sub = (this.isSystemCategory
                ? this.notificationsService.updateNotificationCategory(
                    this.categoryId,
                    typeId,
                    title,
                    description,
                    sendEmailValue,
                    this.isRegional,
                    canBeUnsubscribedValue
                )
                : this.notificationsService.updateEntityNotificationCategory(
                    this.categoryId,
                    typeId,
                    title,
                    description,
                    sendEmailValue,
                    this.isRegional,
                    canBeUnsubscribedValue
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
                        detail: 'Category updated successfully.'
                    });
                    this.closeDialog();
                    this.saved.emit();
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Create new category
        const sub = (this.isSystemCategory
            ? this.notificationsService.createNotificationCategory(
                typeId,
                title,
                description,
                sendEmailValue,
                canBeUnsubscribedValue
            )
            : this.notificationsService.createEntityNotificationCategory(
                this.currentEntityId,
                typeId,
                title,
                description,
                sendEmailValue,
                canBeUnsubscribedValue
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
                    detail: 'Category created successfully.'
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

    get descriptionError(): string {
        return getTextFieldError(this.form.get('description'), 'Description', true);
    }

    private handleBusinessError(context: CategoryFormContext | 'details', response: any): void | null {
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
            case 'ERP11451':
                return 'Invalid Category Title';
            case 'ERP11452':
                return 'Invalid Category Description';
            case 'ERP11453':
                return 'Invalid Type ID';
            case 'ERP11455':
                return 'Invalid Entity ID';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11450':
                return 'Invalid Category ID';
            case 'ERP11451':
                return 'Invalid Category Title';
            case 'ERP11452':
                return 'Invalid Category Description';
            case 'ERP11453':
                return 'Invalid Type ID';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11450':
                return 'Invalid Category ID';
            default:
                return null;
        }
    }
}
