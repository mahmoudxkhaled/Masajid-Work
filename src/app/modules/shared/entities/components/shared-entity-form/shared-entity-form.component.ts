import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { EntityDetailsRefreshService } from 'src/app/core/services/entity-details-refresh.service';
import { IEntityDetails } from 'src/app/core/models/account-status.model';
import { Roles } from 'src/app/core/models/system-roles';
import { textFieldValidator, getTextFieldError, nameFieldValidator, getNameFieldError } from 'src/app/core/validators/text-field.validator';
import { Entity, EntityBackend } from 'src/app/modules/entity-administration/entities/models/entities.model';

type EntityFormContext = 'create' | 'update' | 'details';

@Component({
    selector: 'app-shared-entity-form',
    templateUrl: './shared-entity-form.component.html',
    styleUrls: ['./shared-entity-form.component.scss']
})
export class SharedEntityFormComponent implements OnInit, OnDestroy {
    form!: FormGroup;
    entityId: string = '';
    isEdit: boolean = false;
    loading: boolean = false;
    submitted: boolean = false;
    showParentSelector: boolean = false;
    showIsPersonal: boolean = false;
    showAccountSection: boolean = false;
    systemRole: number = 0;
    requestedSystemRole: number = 0;
    parentEntities: any[] = [];

    entitiesForSelection: Entity[] = [];
    selectedParentEntity?: Entity;
    parentEntityDialogVisible: boolean = false;
    entityTableFirst: number = 0;
    entityTableRows: number = 10;
    entityTableTotalRecords: number = 0;
    entityTableTextFilter: string = '';
    loadingEntitiesTable: boolean = false;
    isRegional: boolean = false;

    private subscriptions: Subscription[] = [];
    private rawEntitiesForSelection: EntityBackend[] = [];

    constructor(
        private fb: FormBuilder,
        private entitiesService: EntitiesService,
        private router: Router,
        private route: ActivatedRoute,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private languageDirService: LanguageDirService,
        private entityDetailsRefreshService: EntityDetailsRefreshService
    ) { }

    ngOnInit(): void {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';

        this.entityId = this.route.snapshot.paramMap.get('id') || '';
        this.isEdit = !!this.entityId;

        this.requestedSystemRole =
            this.route.snapshot.data['requestedSystemRole'] ??
            (this.localStorageService.getAccountDetails()?.System_Role_ID || 0);
        this.systemRole = this.requestedSystemRole;

        this.initForm();
        this.initializeRoleBasedLogic();
        this.subscriptions.push(
            this.languageDirService.userLanguageCode$.subscribe(() => {
                this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
                this.mapRawEntitiesForSelection();
            })
        );

        if (this.isEdit) {
            this.loadEntity();
        }
    }

    private initializeRoleBasedLogic(): void {
        switch (this.systemRole) {
            case Roles.Developer:
                this.showParentSelector = true;
                this.showIsPersonal = true;
                this.showAccountSection = true;
                break;
            case Roles.SystemAdministrator:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.showAccountSection = true;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
            case Roles.EntityAdministrator:
                this.showParentSelector = true;
                this.showIsPersonal = false;
                this.showAccountSection = false;
                this.form.patchValue({ isPersonal: false });
                break;
            default:
                this.showParentSelector = false;
                this.showIsPersonal = false;
                this.showAccountSection = false;
                this.form.patchValue({ parentEntityId: 0, isPersonal: false });
                break;
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    initForm(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, textFieldValidator()]],
            name: ['', [Validators.required, textFieldValidator()]],
            description: ['', [Validators.required, textFieldValidator()]],
            parentEntityId: [0],
            isPersonal: [false],
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, nameFieldValidator()]],
            lastName: ['', [Validators.required, nameFieldValidator()]]
        });
    }

    openParentEntityDialog(): void {
        this.parentEntityDialogVisible = true;
        this.entityTableTextFilter = '';
        this.entityTableFirst = 0;
        this.loadEntitiesForSelection(true);
    }

    closeParentEntityDialog(): void {
        this.parentEntityDialogVisible = false;
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

                this.rawEntitiesForSelection = Object.values(entitiesData) as EntityBackend[];
                this.mapRawEntitiesForSelection();
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

    selectParentEntity(entity: Entity): void {
        this.selectedParentEntity = entity;
        this.form.patchValue({
            parentEntityId: Number(entity.id)
        });
    }

    selectRootEntity(): void {
        this.selectedParentEntity = undefined;
        this.form.patchValue({
            parentEntityId: 0
        });
        this.closeParentEntityDialog();
    }

    isParentEntitySelected(entity: Entity): boolean {
        return this.selectedParentEntity?.id === entity.id;
    }

    getParentEntityDisplayText(): string {
        const parentId = this.form.get('parentEntityId')?.value || 0;
        if (parentId === 0) {
            return 'Root Entity';
        }
        if (this.selectedParentEntity) {
            return `${this.selectedParentEntity.name} (${this.selectedParentEntity.code})`;
        }
        const entity = this.entitiesForSelection.find(e => e.id === String(parentId));
        if (entity) {
            return `${entity.name} (${entity.code})`;
        }
        return 'Select parent entity';
    }

    loadEntity(): void {
        if (!this.entityId) {
            return;
        }

        this.loading = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('details', response);
                    return;
                }

                const entity = response?.message ?? {};
                const parentId = entity?.Parent_Entity_ID;
                const parentEntityId = parentId === null || parentId === undefined || parentId === '' || parentId === '0'
                    ? 0
                    : Number(parentId) || 0;

                this.form.patchValue({
                    code: entity?.Code ?? '',
                    name: entity?.Name ?? '',
                    description: entity?.Description ?? '',
                    parentEntityId: parentEntityId,
                    isPersonal: entity?.Is_Personal || false
                });

                if (parentEntityId && parentEntityId !== 0) {
                    this.selectedParentEntity = undefined;
                } else {
                    this.selectedParentEntity = undefined;
                }

                if (!this.showIsPersonal) {
                    this.form.patchValue({ isPersonal: false });
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

        if (this.showAccountSection && !this.isEdit) {
            const accountFieldsValid = this.form.get('email')?.valid &&
                this.form.get('firstName')?.valid &&
                this.form.get('lastName')?.valid;
            if (!accountFieldsValid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields including account information.'
                });
                return;
            }
        }

        if (this.form.get('code')?.invalid || this.form.get('name')?.invalid || this.form.get('description')?.invalid) {
            this.messageService.add({
                severity: 'warn',
                summary: 'Validation',
                detail: 'Please fill in all required fields.'
            });
            return;
        }

        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';

        this.loading = true;
        const { code, name, description, parentEntityId, isPersonal, email, firstName, lastName } = this.form.value;

        if (this.isEdit) {
            const sub = this.entitiesService.updateEntityDetails(
                this.entityId,
                code,
                name,
                description,
                Number(parentEntityId) || 0,
                isRegional,
                isPersonal || false
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('update', response);
                        return;
                    }

                    const currentEntity = this.localStorageService.getEntityDetails() as IEntityDetails | null;
                    if (currentEntity && String(currentEntity.Entity_ID) === this.entityId) {
                        currentEntity.Name = name;
                        currentEntity.Name_Regional = name;
                        currentEntity.Description = description;
                        currentEntity.Description_Regional = description;
                        this.localStorageService.setItem('Entity_Details', currentEntity);
                        this.entityDetailsRefreshService.requestRefresh();
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Entity updated successfully.'
                    });
                    const baseRoute = this.route.parent ?? this.route;
                    this.router.navigate([this.entityId], { relativeTo: baseRoute });
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
            return;
        }

        const parentId = Number(parentEntityId) || 0;
        const isPersonalValue = isPersonal || false;

        if (this.systemRole === Roles.SystemAdministrator || this.systemRole === Roles.Developer) {
            this.validateEmailBeforeCreation(email, code, name, description, parentId, isPersonalValue, firstName, lastName);
            return;
        } else if (this.systemRole === Roles.EntityAdministrator) {
            const sub = this.entitiesService.addEntity(
                code,
                name,
                description,
                parentId,
                isPersonalValue
            ).subscribe({
                next: (response: any) => {
                    if (!response?.success) {
                        this.handleBusinessError('create', response);
                        return;
                    }

                    this.messageService.add({
                        severity: 'success',
                        summary: 'Success',
                        detail: 'Entity created successfully.'
                    });
                    const baseRoute = this.route.parent ?? this.route;
                    this.router.navigate(['list'], { relativeTo: baseRoute });
                },
                complete: () => this.loading = false
            });

            this.subscriptions.push(sub);
        }
    }

    cancel(): void {
        const baseRoute = this.route.parent ?? this.route;
        this.router.navigate(['list'], { relativeTo: baseRoute });
    }

    get f() {
        return this.form.controls;
    }

    get codeError(): string {
        return getTextFieldError(this.f['code'], 'Entity code', this.submitted);
    }

    get nameError(): string {
        return getTextFieldError(this.f['name'], 'Company name', this.submitted);
    }

    get emailError(): string {
        const control = this.f['email'];
        if (!this.showAccountSection) {
            return '';
        }
        if (control?.errors?.['required'] && this.submitted) {
            return 'Email is required.';
        }
        if (control?.errors?.['email'] && this.submitted) {
            return 'Please enter a valid email address.';
        }
        return '';
    }

    get firstNameError(): string {
        if (!this.showAccountSection) {
            return '';
        }
        return getNameFieldError(this.f['firstName'], 'First name', this.submitted);
    }

    get lastNameError(): string {
        if (!this.showAccountSection) {
            return '';
        }
        return getNameFieldError(this.f['lastName'], 'Last name', this.submitted);
    }

    private handleBusinessError(context: EntityFormContext, response: any): void | null {
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

    private mapRawEntitiesForSelection(): void {
        const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        let allEntities = this.rawEntitiesForSelection.map((item) => ({
            id: String(item?.Entity_ID || ''),
            code: item?.Code || '',
            name: isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
            description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
            parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
            active: Boolean(item?.Is_Active),
            isPersonal: Boolean(item?.Is_Personal)
        }));

        if (this.systemRole === Roles.EntityAdministrator) {
            allEntities = allEntities.filter(() => true);
        }

        if (this.isEdit && this.entityId) {
            allEntities = allEntities.filter((entity: Entity) => entity.id !== this.entityId);
        }

        this.entitiesForSelection = allEntities;
        if (this.selectedParentEntity) {
            this.selectedParentEntity =
                this.entitiesForSelection.find((entity) => entity.id === this.selectedParentEntity?.id) ||
                this.selectedParentEntity;
        }
    }

    private getCreationErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11250':
                return 'Invalid Parent Entity ID';
            case 'ERP11251':
                return 'Invalid \'Code\' format';
            case 'ERP11252':
                return 'Invalid \'Name\' format';
            case 'ERP11253':
                return 'Invalid \'Description\' format';
            case 'ERP11254':
                return 'The \'Code\' is not unique in the main root Entity tree. The administrator adding the entity should be notified to adjust the \'Code\' field';
            default:
                return null;
        }
    }

    private getUpdateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11250':
                return 'Invalid Parent Entity ID';
            case 'ERP11251':
                return 'Invalid \'Code\' format';
            case 'ERP11252':
                return 'Invalid \'Name\' format';
            case 'ERP11253':
                return 'Invalid \'Description\' format';
            case 'ERP11254':
                return 'The \'Code\' is not unique in the main root Entity tree. The administrator adding the entity should be notified to adjust the \'Code\' field';
            default:
                return null;
        }
    }

    private getDetailsErrorMessage(code: string): string | null {
        if (code === 'ERP11260') {
            return 'Invalid Entity ID';
        }

        return null;
    }

    private handleCreateEntityRoleError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateEntityRoleErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }

    private getCreateEntityRoleErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11300':
                return 'Invalid entity selected.';
            case 'ERP11301':
                return 'Invalid role title format.';
            case 'ERP11302':
                return 'Invalid role description format.';
            case 'ERP11303':
                return 'A role with this title already exists for this entity.';
            default:
                return null;
        }
    }

    private handleCreateAccountError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getCreateAccountErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loading = false;
    }

    private getCreateAccountErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11130':
                return 'Invalid email address format';
            case 'ERP11141':
                return 'An account with the same email already exists';
            case 'ERP11142':
                return 'Invalid First Name format -> Empty or contains special characters';
            case 'ERP11143':
                return 'Invalid Last Name format -> Empty or contains special characters';
            case 'ERP11144':
                return 'Invalid Entity ID -> The database does not have an Entity with this ID';
            case 'ERP11145':
                return 'Invalid Role ID -> The entity does not have a Role with this ID';
            default:
                return null;
        }
    }

    private validateEmailBeforeCreation(
        email: string,
        code: string,
        name: string,
        description: string,
        parentId: number,
        isPersonalValue: boolean,
        firstName: string,
        lastName: string
    ): void {
        const sub = this.entitiesService.getAccountDetails(email).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    this.messageService.add({
                        severity: 'error',
                        summary: 'Email Exists',
                        detail: 'An account with this email already exists. Please use a different email address.',
                        life: 5000
                    });
                    this.loading = false;
                    return;
                }
                this.proceedWithEntityCreation(code, name, description, parentId, isPersonalValue, email, firstName, lastName);
            },
            error: (error: any) => {
                const errorCode = String(error?.message || '');
                if (errorCode === 'ERP11150') {
                    this.proceedWithEntityCreation(code, name, description, parentId, isPersonalValue, email, firstName, lastName);
                } else {
                    this.handleBusinessError('create', error);
                }
            }
        });
        this.subscriptions.push(sub);
    }

    private proceedWithEntityCreation(
        code: string,
        name: string,
        description: string,
        parentId: number,
        isPersonalValue: boolean,
        email: string,
        firstName: string,
        lastName: string
    ): void {
        const sub = this.entitiesService.addEntity(
            code,
            name,
            description,
            parentId,
            isPersonalValue
        ).pipe(
            switchMap((entityResponse: any) => {
                if (!entityResponse?.success) {
                    this.handleBusinessError('create', entityResponse);
                    return throwError(() => entityResponse);
                }

                const entityId = entityResponse.message.Entity_ID;
                const roleTitle = `${name} Entity Administrator`;
                const roleDescription = `Default Entity Administrator role for ${name}`;

                return this.entitiesService.createEntityRole(entityId, roleTitle, roleDescription).pipe(
                    switchMap((roleResponse: any) => {
                        if (!roleResponse?.success) {
                            this.handleCreateEntityRoleError(roleResponse);
                            return throwError(() => roleResponse);
                        }

                        const entityRoleId = roleResponse.message.Entity_Role_ID;
                        return this.entitiesService.createAccount(email, firstName, lastName, entityId, entityRoleId);
                    })
                );
            })
        ).subscribe({
            next: (accountResponse: any) => {
                if (!accountResponse?.success) {
                    this.handleCreateAccountError(accountResponse);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Entity, role, and administrator account created successfully.'
                });
                const baseRoute = this.route.parent ?? this.route;
                this.router.navigate(['list'], { relativeTo: baseRoute });
            },
            error: () => this.loading = false,
            complete: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }
}
