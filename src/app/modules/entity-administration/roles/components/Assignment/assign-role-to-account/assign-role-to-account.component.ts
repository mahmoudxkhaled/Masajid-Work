import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { RolesService } from '../../../services/roles.service';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { EntityRole } from '../../../models/roles.model';

@Component({
    selector: 'app-assign-role-to-account',
    templateUrl: './assign-role-to-account.component.html',
    styleUrls: ['./assign-role-to-account.component.scss']
})
export class AssignRoleToAccountComponent implements OnInit, OnDestroy {
    private _visible: boolean = false;

    @Input()
    get visible(): boolean {
        return this._visible;
    }
    set visible(value: boolean) {
        this._visible = value;
        if (value) {
            this.prepareDialog();
        }
    }

    @Input() roleId: string = '';
    @Input() roleTitle: string = '';
    @Input() entityId: number = 0; // Optional: pre-filter roles by entity

    @Output() visibleChange = new EventEmitter<boolean>();
    @Output() assigned = new EventEmitter<void>();

    form!: FormGroup;
    loading: boolean = false;
    saving: boolean = false;

    // Role options (filtered by entity if entityId is provided)
    roleOptions: any[] = [];
    loadingRoles: boolean = false;

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private rolesService: RolesService,
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.initForm();
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    private initForm(): void {
        this.form = this.fb.group({
            accountId: [0, [Validators.required, Validators.min(1)]],
            roleId: [this.roleId || '', [Validators.required]]
        });
    }

    private prepareDialog(): void {
        // If roleId is provided, set it in the form
        if (this.roleId) {
            this.form.patchValue({ roleId: this.roleId });
        }

        // Load roles if entityId is provided
        if (this.entityId && this.entityId > 0) {
            this.loadRolesForEntity(this.entityId);
        } else if (this.roleId) {
            // If roleId is provided but no entityId, we can still use the roleId
            // The form already has it set
        }
    }

    private loadRolesForEntity(entityId: number): void {
        this.loadingRoles = true;
        const sub = this.rolesService.listEntityRoles(entityId, 0, 100).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const rolesData = response?.message?.Entity_Roles || {};
                    this.roleOptions = Object.values(rolesData).map((item: any) => {
                        return {
                            label: this.isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
                            value: String(item?.Entity_Role_ID || '')
                        };
                    });
                }
                this.loadingRoles = false;
            },
            error: () => {
                this.loadingRoles = false;
            }
        });

        this.subscriptions.push(sub);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const { accountId, roleId } = this.form.value;

        if (!accountId || accountId === 0) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select an account.'
            });
            return;
        }

        if (!roleId) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please select a role.'
            });
            return;
        }

        this.saving = true;
        const sub = this.rolesService.assignRoleToAccount(Number(roleId), Number(accountId)).subscribe({
            next: (response: any) => {
                this.saving = false;
                if (!response?.success) {
                    this.handleBusinessError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Role assigned to account successfully.'
                });

                this.assigned.emit();
                this.closeDialog();
            },
            error: () => {
                this.saving = false;
            }
        });

        this.subscriptions.push(sub);
    }

    closeDialog(): void {
        this.onVisibleChange(false);
    }

    onDialogHide(): void {
        this.onVisibleChange(false);
    }

    onVisibleChange(value: boolean): void {
        this._visible = value;
        this.visibleChange.emit(value);
        if (!value) {
            // Reset form when dialog closes
            this.form.reset();
            if (this.roleId) {
                this.form.patchValue({ roleId: this.roleId });
            }
        }
    }

    private handleBusinessError(response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (code) {
            case 'ERP11310':
                detail = 'Invalid Entity Role ID';
                break;
            case 'ERP11315':
                detail = 'Invalid Account ID';
                break;
            case 'ERP11305':
                detail = 'Access Denied to Entity Roles';
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
        return null;
    }
}
