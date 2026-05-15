import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { TranslationService } from 'src/app/core/services/translation.service';

@Component({
    selector: 'app-edit-role-dialog',
    templateUrl: './edit-role-dialog.component.html',
    styleUrls: ['./edit-role-dialog.component.scss']
})
export class EditRoleDialogComponent implements OnInit, OnChanges, OnDestroy {
    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (!value) {
            this.resetFormState();
        }
    }

    @Input() mode: 'create' | 'edit' = 'edit';
    @Input() entityIdForCreate: number = 0;
    @Input() entityName: string = '';
    @Input() roleId: string = '';
    @Input() roleTitle: string = '';

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() saved = new EventEmitter<void>();

    form!: FormGroup;
    loadingDetails: boolean = false;
    saving: boolean = false;

    private subscriptions: Subscription[] = [];
    private accountSettings?: IAccountSettings;

    constructor(
        private fb: FormBuilder,
        private rolesService: RolesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private translate: TranslationService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['visible']?.currentValue === true) {
            this.prepareDialog();
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]]
        });
    }

    private prepareDialog(): void {
        if (this.mode === 'create') {
            this.form.reset();
            this.loadingDetails = false;
            this.saving = false;
            return;
        }
        if (!this.roleId) {
            return;
        }
        this.loadRoleDetails();
    }

    private loadRoleDetails(): void {
        if (!this.roleId) {
            return;
        }

        this.loadingDetails = true;
        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response) => {
                console.log('response getEntityRoleDetails111', response);
                if (!response?.success) {
                    this.handleBusinessError(response, 'update');
                    this.loadingDetails = false;
                    return;
                }

                const details = response.message || {};
                const isRegional = this.accountSettings?.Language !== 'English';

                this.form.patchValue({
                    title: isRegional ? (details?.Title_Regional || details?.Title || '') : (details?.Title || ''),
                    description: isRegional ? (details?.Description_Regional || details?.Description || '') : (details?.Description || '')
                });

                this.loadingDetails = false;
            },
            error: () => {
                this.loadingDetails = false;
            }
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        if (this.mode === 'create') {
            this.form.markAllAsTouched();
            if (this.form.invalid || !this.entityIdForCreate || this.entityIdForCreate <= 0) {
                return;
            }
            const { title, description } = this.form.value;
            this.saving = true;
            const sub = this.rolesService
                .createEntityRole(this.entityIdForCreate, title.trim(), description.trim())
                .subscribe({
                    next: (response) => {
                        this.saving = false;
                        if (!response?.success) {
                            this.handleBusinessError(response, 'create');
                            return;
                        }
                        this.messageService.add({
                            severity: 'success',
                            summary: this.translate.getInstant('common.success'),
                            detail: this.translate.getInstant('entityRoles.messages.created')
                        });
                        this.saved.emit();
                        this.closeDialog();
                    },
                    error: () => {
                        this.saving = false;
                    }
                });
            this.subscriptions.push(sub);
            return;
        }

        if (this.form.invalid || !this.roleId) {
            this.form.markAllAsTouched();
            return;
        }

        const { title, description } = this.form.value;
        const isRegional = this.accountSettings?.Language !== 'English';

        this.saving = true;
        const sub = this.rolesService
            .updateEntityRole(
                Number(this.roleId),
                title.trim(),
                description.trim(),
                !!isRegional
            )
            .subscribe({
                next: (response) => {
                    this.saving = false;
                    if (!response?.success) {
                        this.handleBusinessError(response, 'update');
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: this.translate.getInstant('common.success'),
                        detail: this.translate.getInstant('entityRoles.messages.updated')
                    });

                    this.saved.emit();
                    this.closeDialog();
                },
                error: () => {
                    this.saving = false;
                }
            });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.visibleChange.emit(false);
    }

    onVisibleChange(value: boolean): void {
        this.visibleChange.emit(value);
    }

    private resetFormState(): void {
        this.form.reset();
        this.loadingDetails = false;
        this.saving = false;
    }

    private handleBusinessError(response: any, context: 'create' | 'update'): void | null {
        const code = String(response?.message || '');
        const detail =
            context === 'create' ? this.getCreationErrorMessage(code) : this.getUpdateErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail
            });
        }
        this.saving = false;
        return null;
    }

    private getCreationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11300':
                return 'Invalid Entity ID';
            case 'ERP11301':
                return 'Invalid Title Format';
            case 'ERP11302':
                return 'Invalid Description Format';
            case 'ERP11303':
                return 'Duplicate Title with another Role in the same Entity';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11310':
                return 'Invalid Entity Role ID';
            case 'ERP11301':
                return 'Invalid Title Format';
            case 'ERP11302':
                return 'Invalid Description Format';
            case 'ERP11303':
                return 'Duplicate Title with another Role in the same Entity';
            case 'ERP11305':
                return 'Access Denied to Entity Roles';
            default:
                return null;
        }
    }

    get titleError(): string {
        const control = this.form.get('title');
        return getTextFieldError(control, 'Title', control?.touched || false);
    }

    get descriptionError(): string {
        const control = this.form.get('description');
        return getTextFieldError(control, 'Description', control?.touched || false);
    }
}
