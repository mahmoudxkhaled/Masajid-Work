import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { RolesService } from '../../../services/roles.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { textFieldValidator, getTextFieldError } from 'src/app/core/validators/text-field.validator';
import { Entity } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';

type RoleFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-role-form',
    templateUrl: './role-form.component.html',
    styleUrls: ['./role-form.component.scss']
})
export class RoleFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    roleId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Entity selection table properties
    entitiesForSelection: Entity[] = [];
    selectedEntity?: Entity;
    entityDialogVisible: boolean = false;
    entityTableFirst: number = 0;
    entityTableRows: number = 10;
    entityTableTotalRecords: number = 0;
    entityTableTextFilter: string = '';
    loadingEntitiesTable: boolean = false;
    requestedSystemRole: number = 0;
    entitySelectionHidden: boolean = false;

    /** Placeholder rows for entity selection table so skeleton cells show while loading. */
    get entityTableValue(): Entity[] {
        if (this.loadingEntitiesTable && this.entitiesForSelection.length === 0) {
            return Array(10).fill(null).map(() => ({} as Entity));
        }
        return this.entitiesForSelection;
    }

    private subscriptions: Subscription[] = [];

    constructor(
        private fb: FormBuilder,
        private rolesService: RolesService,
        private entitiesService: EntitiesService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';
    }

    ngOnInit(): void {
        this.roleId = this.route.snapshot.paramMap.get('id') || '';
        this.isEdit = !!this.roleId;
        this.initForm();

        // Scope for List_Entities filtering (Entity Admin vs System Admin screen).
        this.requestedSystemRole =
            this.route.snapshot.data['requestedSystemRole'] ??
            (this.localStorageService.getAccountDetails()?.System_Role_ID || 0);

        if (this.isEdit) {
            this.loadRole();
        } else {
            const queryParams = this.route.snapshot.queryParams;
            const entityIdFromQuery = queryParams['entityId'] ? Number(queryParams['entityId']) : 0;
            const entityIdFromStorage = Number(this.localStorageService.getEntityId()) || 0;

            if (entityIdFromQuery > 0) {
                this.entitySelectionHidden = true;
                this.form.patchValue({ entityId: entityIdFromQuery });
            } else if (entityIdFromStorage > 0) {
                this.entitySelectionHidden = true;
                this.form.patchValue({ entityId: entityIdFromStorage });
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            entityId: [0, [Validators.required, Validators.min(1)]],
            title: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]]
        });
    }

    loadRole(): void {
        if (!this.roleId) {
            return;
        }

        this.loading = true;
        const sub = this.rolesService.getEntityRoleDetails(Number(this.roleId)).subscribe({
            next: (response: any) => {
                console.log('response getEntityRoleDetails111', response);
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const role = response?.message ?? {};
                const entityId = role?.Entity_ID || 0;

                this.form.patchValue({
                    entityId: entityId,
                    title: role?.Title ?? '',
                    description: role?.Description ?? ''
                });

                // Set selected entity if entityId exists
                if (entityId && entityId !== 0) {
                    this.selectedEntity = undefined; // Will be resolved when dialog opens
                }
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

        const { entityId, title, description } = this.form.value;
        const isRegional = this.accountSettings?.Language !== 'English';

        this.loading = true;

        if (this.isEdit) {
            const sub = this.rolesService.updateEntityRole(
                Number(this.roleId),
                title.trim(),
                description.trim(),
                isRegional
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Role updated successfully.'
                    });

                    // Check if we came from entity details context
                    const queryParams = this.route.snapshot.queryParams;
                    const entityId = queryParams['entityId'];
                    if (entityId) {
                        this.router.navigate(['/entity-administration/entities', entityId]);
                    } else {
                        this.router.navigate(['/entity-administration/roles', this.roleId]);
                    }
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        // Create new role
        const sub = this.rolesService.createEntityRole(
            Number(entityId),
            title.trim(),
            description.trim()
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                const newRoleId = response?.message?.Entity_Role_ID;
                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Role created successfully.'
                });

                // Check if we came from entity details context
                const queryParams = this.route.snapshot.queryParams;
                const entityIdFromQuery = queryParams['entityId'];
                if (entityIdFromQuery) {
                    // Return to entity details
                    this.router.navigate(['/entity-administration/entities', entityIdFromQuery]);
                } else if (newRoleId) {
                    this.router.navigate(['/entity-administration/roles', newRoleId]);
                } else {
                    this.router.navigate(['/entity-administration/roles/list']);
                }
            },
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    cancel(): void {
        this.router.navigate(['/entity-administration/roles/list']);
    }

    get f() {
        return this.form.controls;
    }

    get titleError(): string {
        return getTextFieldError(this.f['title'], 'Title', this.submitted);
    }

    get descriptionError(): string {
        return getTextFieldError(this.f['description'], 'Description', this.submitted);
    }

    // Entity Selection Dialog Methods
    openEntityDialog(): void {
        this.entityDialogVisible = true;
        this.entityTableTextFilter = '';
        this.entityTableFirst = 0;
        this.loadEntitiesForSelection(true);
    }

    closeEntityDialog(): void {
        this.entityDialogVisible = false;
    }

    loadEntitiesForSelection(forceReload: boolean = false): void {
        if (this.entitiesService.isLoadingSubject.value && !forceReload) {
            return;
        }

        this.loadingEntitiesTable = true;

        const currentPage = Math.floor(this.entityTableFirst / this.entityTableRows) + 1;
        const lastEntityId = -currentPage;

        const sub = this.entitiesService.listEntities(
            lastEntityId,
            this.entityTableRows,
            this.entityTableTextFilter,
            this.requestedSystemRole
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.loadingEntitiesTable = false;
                    return;
                }

                this.entityTableTotalRecords = Number(response.message.Total_Count || 0);

                let entitiesData: any = {};
                const messageData = response.message.Entities_List || response.message.Entities || {};
                Object.keys(messageData).forEach((key) => {
                    const item = messageData[key];
                    if (typeof item === 'object' && item !== null && item.Entity_ID !== undefined) {
                        entitiesData[key] = item;
                    }
                });

                this.entitiesForSelection = Object.values(entitiesData).map((item: any) => {
                    return {
                        id: String(item?.Entity_ID || ''),
                        code: item?.Code || '',
                        name: this.isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
                        description: this.isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
                        parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
                        active: Boolean(item?.Is_Active),
                        isPersonal: Boolean(item?.Is_Personal)
                    };
                });

                this.loadingEntitiesTable = false;
            },
            error: () => {
                this.loadingEntitiesTable = false;
            }
        });

        this.subscriptions.push(sub);
    }

    onEntityTablePageChange(event: any): void {
        this.entityTableFirst = event.first;
        this.entityTableRows = event.rows;
        this.loadEntitiesForSelection(true);
    }

    onEntityTableSearchInput(event: Event): void {
        const target = event.target as HTMLInputElement;
        const searchValue = target?.value || '';
        this.entityTableTextFilter = searchValue;
        this.entityTableFirst = 0;
        this.loadEntitiesForSelection(true);
    }

    selectEntity(entity: Entity): void {
        this.selectedEntity = entity;
        this.form.patchValue({
            entityId: Number(entity.id)
        });
    }

    isEntitySelected(entity: Entity): boolean {
        return this.selectedEntity?.id === entity.id;
    }

    getEntityDisplayText(): string {
        const entityId = this.form.get('entityId')?.value || 0;
        if (entityId === 0) {
            return 'Select entity';
        }
        if (this.selectedEntity) {
            return `${this.selectedEntity.name} (${this.selectedEntity.code})`;
        }
        const entity = this.entitiesForSelection.find(e => e.id === String(entityId));
        if (entity) {
            return `${entity.name} (${entity.code})`;
        }
        return 'Select entity';
    }

    private handleBusinessError(context: RoleFormContext, response: any): void | null {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'create':
                detail = this.getCreationErrorMessage(code) || '';
                break;
            case 'update':
                detail = this.getUpdateErrorMessage(code) || '';
                break;
            case 'details':
                detail = this.getDetailsErrorMessage(code) || '';
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

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11310') {
            return 'Invalid Entity Role ID';
        }
        if (code === 'ERP11305') {
            return 'Access Denied to Entity Roles';
        }
        return null;
    }
}
