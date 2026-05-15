import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { EntityGroupsService } from '../../services/entity-groups.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Group } from 'src/app/modules/summary/models/groups.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';

type GroupFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-entity-group-form',
    templateUrl: './entity-group-form.component.html',
    styleUrls: ['./entity-group-form.component.scss']
})
export class EntityGroupFormComponent implements OnInit, OnDestroy, OnChanges {
    @Input() visible: boolean = false;
    @Input() groupId?: number;
    @Input() entityId?: number;
    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;
    currentEntityId: number = 0;
    group: Group | null = null;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private entityGroupsService: EntityGroupsService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible'] && this.visible) {
            this.resetForm();
            this.isEdit = !!this.groupId;
            this.currentEntityId = this.entityId || this.entityGroupsService.getCurrentEntityId();

            if (this.isEdit && this.groupId) {
                this.loadGroup();
            }
        }
    }

    resetForm(): void {
        this.form.reset();
        this.submitted = false;
        this.group = null;
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
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]]
        });
    }

    loadGroup(): void {
        if (!this.groupId) {
            return;
        }

        this.loading = true;
        const sub = this.entityGroupsService.getEntityGroup(this.groupId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }
                const groupData = response?.message ?? {};

                this.group = {
                    id: String(groupData?.Group_ID || groupData?.groupID || this.groupId),
                    title: this.isRegional ? (groupData?.Title_Regional || groupData?.title_Regional || groupData?.Title || groupData?.title || '') : (groupData?.Title || groupData?.title || ''),
                    description: this.isRegional ? (groupData?.Description_Regional || groupData?.description_Regional || groupData?.Description || groupData?.description || '') : (groupData?.Description || groupData?.description || ''),
                    entityId: groupData?.Entity_ID || groupData?.entityID || 0,
                    active: Boolean(groupData?.Is_Active !== undefined ? groupData.Is_Active : (groupData?.is_Active !== undefined ? groupData.is_Active : true)),
                    createAccountId: groupData?.Create_Account_ID || groupData?.createAccountID || 0
                };

                if (this.group.entityId <= 0) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Error',
                        detail: 'This is not an Entity Group.'
                    });
                    this.closeDialog();
                    return;
                }

                const title = this.isRegional && groupData?.Title_Regional
                    ? groupData.Title_Regional
                    : (groupData?.Title || groupData?.title || '');
                const description = this.isRegional && groupData?.Description_Regional
                    ? groupData.Description_Regional
                    : (groupData?.Description || groupData?.description || '');

                this.form.patchValue({
                    title: title,
                    description: description
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

        if (this.form.get('title')?.invalid || this.form.get('description')?.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        if (!this.entityGroupsService.isEntityAdmin()) {
            this.messageService.add({
                severity: 'error',
                summary: 'Access Denied',
                detail: 'Only Entity Administrators can manage Entity Groups.'
            });
            return;
        }

        this.loading = true;
        const { title, description } = this.form.value;

        if (this.isEdit && this.groupId) {
            const sub = this.entityGroupsService.updateEntityGroup(
                this.groupId,
                title,
                description,
                this.isRegional
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Entity Group updated successfully.'
                    });
                    this.closeDialog();
                    this.saved.emit();
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        if (this.currentEntityId <= 0) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid Entity ID. Cannot create Entity Group.'
            });
            this.loading = false;
            return;
        }
        const sub = this.entityGroupsService.createEntityGroup(title, description, this.currentEntityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Entity Group created successfully.'
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
        return getTextFieldError(this.f['title'], 'Group title', this.submitted);
    }

    get descriptionError(): string {
        return getTextFieldError(this.f['description'], 'Group description', this.submitted);
    }

    private handleBusinessError(context: GroupFormContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail: string | null = null;

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code);
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
        this.loading = false;
        return null;
    }

    private getCreationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11285':
                return 'Invalid \'Title\' format';
            case 'ERP11286':
                return 'Invalid \'Description\' format';
            case 'ERP11260':
                return 'Invalid Entity ID';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11290':
                return 'Invalid Group ID';
            case 'ERP11285':
                return 'Invalid \'Title\' format';
            case 'ERP11286':
                return 'Invalid \'Description\' format';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11290') {
            return 'Invalid Group ID';
        }

        return null;
    }
}
