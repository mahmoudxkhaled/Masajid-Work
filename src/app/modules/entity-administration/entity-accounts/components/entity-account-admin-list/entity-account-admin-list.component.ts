import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription, throwError } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { PermissionService } from 'src/app/core/services/permission.service';
import { textFieldValidator, getTextFieldError, nameFieldValidator, getNameFieldError } from 'src/app/core/validators/text-field.validator';
import { EntityAccount } from '../../../entities/models/entities.model';
import { EntitiesService } from '../../../entities/services/entities.service';
import { RolesService } from '../../../roles/services/roles.service';

interface EntityAdmin {
    accountId: string;
    userId: number;
    name: string;
    email: string;
    systemRoleId?: number;
    accountState: number; // 1 = Active, 0 = Inactive
    isActive?: boolean;
}

@Component({
    selector: 'app-entity-account-admin-list',
    templateUrl: './entity-account-admin-list.component.html',
    styleUrl: './entity-account-admin-list.component.scss'
})
export class EntityAccountAdminListComponent implements OnInit, OnDestroy, OnChanges {
    @Input() entityId: string = '';
    @Input() requestedSystemRole: number = 0;
    @Output() adminCreated = new EventEmitter<string>();
    @Output() adminUpdated = new EventEmitter<void>();

    loadingAdmins: boolean = false;
    entityAdmins: EntityAccount[] = [];

    /** When loading and entityAdmins is empty, return placeholder rows so the table can show skeleton cells. */
    get tableValue(): EntityAccount[] {
        if (this.loadingAdmins && this.entityAdmins.length === 0) {
            return Array(10).fill(null).map(() => ({} as EntityAccount));
        }
        return this.entityAdmins;
    }

    accountSettings: IAccountSettings;
    isRegional: boolean = false;

    // Entity roles map for lookup
    entityRolesMap: Map<number, string> = new Map();

    // Confirmation dialogs state
    deleteAccountDialog: boolean = false;
    accountToDelete?: EntityAccount;
    activateAccountDialog: boolean = false;
    accountToActivate?: EntityAccount;
    deactivateAccountDialog: boolean = false;
    accountToDeactivate?: EntityAccount;
    removeAdminDialog: boolean = false;
    adminToRemove?: EntityAccount;

    // Context menu
    menuItems: any[] = [];
    currentAdmin?: EntityAccount;

    // Admin creation form
    addAdminDialog: boolean = false;
    form!: FormGroup;
    loading: boolean = false;
    submitted: boolean = false;
    loadingEntity: boolean = false;
    entityName: string = '';

    // Account management dialogs
    viewAccountDetailsDialog: boolean = false;
    editAccountDescriptionDialog: boolean = false;
    updateAccountEmailDialog: boolean = false;
    updateAccountEntityDialogVisible: boolean = false;
    accountEmailForUpdate: string = '';
    selectedAccountForDetails?: EntityAccount;
    updateEmailForm!: FormGroup;
    savingAccountEmail: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private entitiesService: EntitiesService,
        private messageService: MessageService,
        private localStorageService: LocalStorageService,
        private permissionService: PermissionService,
        private fb: FormBuilder,
        private rolesService: RolesService,
        private translate: TranslationService
    ) {
        this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
        this.isRegional = this.accountSettings?.Language !== 'English';

        this.initForm();
    }

    ngOnInit(): void {
        this.initAccountManagementForms();
        if (this.entityId) {
            this.loadAdmins();
            this.loadEntity();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
            // Clear roles map when entity changes
            this.entityRolesMap.clear();
            this.loadAdmins();
            if (!this.entityName) {
                this.loadEntity();
            }
        }
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }

    /** Fetches the entity name from the API. */
    loadEntity(): void {
        if (!this.entityId) return;

        this.loadingEntity = true;
        const sub = this.entitiesService.getEntityDetails(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('entity', response);
                    return;
                }

                const entity = response?.message || {};
                this.entityName = this.isRegional
                    ? (entity?.Name_Regional || entity?.name_Regional || entity?.name || entity?.Name || '')
                    : (entity?.Name || entity?.name || '');
            },

            complete: () => this.loadingEntity = false
        });

        this.subscriptions.push(sub);
    }

    /** Fetches entity roles and creates a lookup map. */
    loadEntityRoles(): void {
        if (!this.entityId) {
            return;
        }

        const entityIdNum = parseInt(this.entityId, 10);
        if (isNaN(entityIdNum)) {
            return;
        }

        const sub = this.rolesService.listEntityRoles(entityIdNum, 0, 100).subscribe({
            next: (response: any) => {
                if (response?.success) {
                    const rolesData = response?.message?.Entity_Roles || {};
                    this.entityRolesMap.clear();

                    // Create lookup map: Entity_Role_ID -> Role Name
                    Object.values(rolesData).forEach((item: any) => {
                        const roleId = item?.Entity_Role_ID || 0;
                        const roleName = this.isRegional
                            ? (item?.Title_Regional || item?.Title || '')
                            : (item?.Title || '');
                        if (roleId > 0) {
                            this.entityRolesMap.set(roleId, roleName);
                        }
                    });
                    this.entityAdmins = this.entityAdmins.map((admin: EntityAccount) => {
                        const roleId = Number(admin.entityRoleId || 0);
                        return {
                            ...admin,
                            entityRoleId: roleId,
                            entityRoleName: roleId > 0 && this.entityRolesMap.has(roleId)
                                ? this.entityRolesMap.get(roleId) || 'N/A'
                                : 'N/A'
                        };
                    });
                }
            },
            error: () => {
                // If error occurs, clear the map
                this.entityRolesMap.clear();
            }
        });

        this.subscriptions.push(sub);
    }

    loadAdmins(): void {
        // Load entity roles first, then reload admins
        this.loadEntityRoles();
        this.reloadAdmins();
    }

    /** Fetches the list of entity administrators from the API. */
    reloadAdmins(): void {
        if (!this.entityId) {
            return;
        }

        this.loadingAdmins = true;

        const sub = this.entitiesService.getEntityAdmins(this.entityId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('admins', response);
                    return;
                }
                this.mapAccountsData(response?.message || {});
            },

            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    private mapAccountsData(accountsData: any): void {
        const accounts = accountsData || {};
        const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);

        this.entityAdmins = accountsArray.map((account: any) => {
            const accountId = String(account?.Account_ID || '');
            const userId = account?.User_ID || 0;
            const systemRoleId = account?.System_Role_ID || 0;
            const accountState = account?.Account_State || 0;
            const email = account?.Email || '';
            const roleName = this.permissionService.getRoleName(systemRoleId);
            const twoFA = account?.Two_FA || false;
            const lastLogin = account?.Last_Login || null;

            // Extract entity role ID and look up role name
            const entityRoleId = Number(account?.Entity_Role_ID || 0);
            const entityRoleName = entityRoleId > 0 && this.entityRolesMap.has(entityRoleId)
                ? this.entityRolesMap.get(entityRoleId) || 'N/A'
                : 'N/A';

            return {
                accountId,
                userId,
                email,
                systemRoleId,
                roleName,
                accountEntityId: account?.Entity_ID || 0,
                entityRoleId,
                entityRoleName,
                accountState,
                Two_FA: twoFA,
                Last_Login: lastLogin
            };
        });
    }

    confirmActivateAccount(admin: EntityAccount): void {
        this.accountToActivate = admin;
        this.activateAccountDialog = true;
    }

    onCancelActivateAccountDialog(): void {
        this.activateAccountDialog = false;
        this.accountToActivate = undefined;
    }

    /** Activates an account. Requires SystemAdmin role. */
    activateAccount(): void {
        if (!this.accountToActivate || !this.accountToActivate.email) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.activateAccount(this.accountToActivate.email).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('activate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account activated successfully.',
                    life: 3000
                });

                this.activateAccountDialog = false;
                this.accountToActivate = undefined;
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    confirmDeactivateAccount(admin: EntityAccount): void {
        this.accountToDeactivate = admin;
        this.deactivateAccountDialog = true;
    }

    onCancelDeactivateAccountDialog(): void {
        this.deactivateAccountDialog = false;
        this.accountToDeactivate = undefined;
    }

    /** Deactivates an account. Allowed for SystemAdmin and EntityAdmin. */
    deactivateAccount(): void {
        if (!this.accountToDeactivate || !this.accountToDeactivate.email) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.deactivateAccount(this.accountToDeactivate.email).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('deactivate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account deactivated successfully.',
                    life: 3000
                });

                this.deactivateAccountDialog = false;
                this.accountToDeactivate = undefined;
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    confirmDeleteAccount(admin: EntityAccount): void {
        this.accountToDelete = admin;
        this.deleteAccountDialog = true;
    }

    onCancelDeleteAccountDialog(): void {
        this.deleteAccountDialog = false;
        this.accountToDelete = undefined;
    }

    /** Deletes an account. Allowed for SystemAdmin and EntityAdmin. */
    deleteAccount(): void {
        if (!this.accountToDelete || !this.accountToDelete.email) {
            return;
        }

        const email = this.accountToDelete.email;
        this.loadingAdmins = true;

        const sub = this.entitiesService.deleteAccount(email).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleAccountError('delete', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account deleted successfully.',
                    life: 3000
                });

                this.deleteAccountDialog = false;
                this.accountToDelete = undefined;
                this.reloadAdmins();
                this.adminUpdated.emit();
            },
            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    confirmRemoveAdmin(admin: EntityAccount): void {
        this.adminToRemove = admin;
        this.removeAdminDialog = true;
    }

    onCancelRemoveAdminDialog(): void {
        this.removeAdminDialog = false;
        this.adminToRemove = undefined;
    }

    /** Removes admin rights and demotes the account to a system user. */
    removeAdmin(): void {
        if (!this.adminToRemove?.accountId || !this.entityId) {
            return;
        }

        this.loadingAdmins = true;
        const sub = this.entitiesService.deleteEntityAdmin(this.entityId, this.adminToRemove.accountId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleRemoveAdminError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Admin access removed. Account is now a system user.',
                    life: 3000
                });

                this.removeAdminDialog = false;
                this.adminToRemove = undefined;

                this.reloadAdmins();
                this.adminUpdated.emit();
            },

            complete: () => this.loadingAdmins = false
        });

        this.subscriptions.push(sub);
    }

    openMenu(menuRef: any, admin: EntityAccount, event: Event): void {
        this.currentAdmin = admin;
        this.configureMenuItems(admin);
        menuRef.toggle(event);
    }

    /**
     * Builds the context menu based on user permissions.
     * - Activate: SystemAdmin, Developer only
     * - Deactivate/Delete: SystemAdmin, Developer, EntityAdmin
     */
    private configureMenuItems(admin: EntityAccount): void {
        const menuItemsList: any[] = [];
        const canActivateAccount = this.permissionService.canActivateAccount();
        const canDeactivateAccount = this.permissionService.canDeactivateAccount();
        const canDeleteAccount = this.permissionService.canDeleteAccount();
        const canRemoveAdmin = this.permissionService.canRemoveEntityAdmin();
        const canGetAccountDetails = this.permissionService.can('Get_Account_Details');
        const canUpdateAccountDetails = this.permissionService.can('Update_Account_Details');
        const canUpdateAccountEmail = this.permissionService.can('Update_Account_Email');
        const canUpdateAccountEntity = this.permissionService.can('Update_Account_Entity');

        if (canGetAccountDetails) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.viewAccountDetails'),
                icon: 'pi pi-eye',
                command: () => this.currentAdmin && this.openViewAccountDetails(this.currentAdmin)
            });
        }

        if (canUpdateAccountDetails) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.editAccountDescription'),
                icon: 'pi pi-pencil',
                command: () => this.currentAdmin && this.openEditAccountDescription(this.currentAdmin)
            });
        }

        if (canUpdateAccountEmail) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.updateAccountEmail'),
                icon: 'pi pi-envelope',
                command: () => this.currentAdmin && this.openUpdateAccountEmail(this.currentAdmin)
            });
        }

        if (canUpdateAccountEntity) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.updateAccountEntity'),
                icon: 'pi pi-building',
                command: () => this.currentAdmin && this.openUpdateAccountEntity(this.currentAdmin)
            });
        }

        if (canActivateAccount && admin.accountState === 0) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.activateAccount'),
                icon: 'pi pi-check',
                command: () => this.currentAdmin && this.confirmActivateAccount(this.currentAdmin)
            });
        }

        if (canDeactivateAccount && admin.accountState === 1) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.deactivateAccount'),
                icon: 'pi pi-times',
                command: () => this.currentAdmin && this.confirmDeactivateAccount(this.currentAdmin)
            });
        }

        if (canDeleteAccount) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.deleteAccount'),
                icon: 'pi pi-trash',
                command: () => this.currentAdmin && this.confirmDeleteAccount(this.currentAdmin)
            });
        }

        if (canRemoveAdmin) {
            menuItemsList.push({
                label: this.translate.getInstant('entityAccounts.adminList.menu.removeAdminAccess'),
                icon: 'pi pi-user-minus',
                command: () => this.currentAdmin && this.confirmRemoveAdmin(this.currentAdmin)
            });
        }

        this.menuItems = menuItemsList;
    }

    getEntityName(): string {
        return this.entityName;
    }

    initForm(): void {
        this.form = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            firstName: ['', [Validators.required, nameFieldValidator()]],
            lastName: ['', [Validators.required, nameFieldValidator()]]
        });
    }

    initAccountManagementForms(): void {
        this.updateEmailForm = this.fb.group({
            accountId: [{ value: '', disabled: true }],
            currentEmail: [{ value: '', disabled: true }],
            newEmail: ['', [Validators.required, Validators.email]]
        });
    }

    get f() {
        return this.form.controls;
    }

    get firstNameError(): string {
        return getNameFieldError(this.f['firstName'], 'First name', this.submitted);
    }

    get lastNameError(): string {
        return getNameFieldError(this.f['lastName'], 'Last name', this.submitted);
    }

    navigateToCreateAdmin(): void {
        this.initForm();
        this.addAdminDialog = true;
    }

    onAdminCancelled(): void {
        this.addAdminDialog = false;
        this.form.reset();
        this.submitted = false;
    }

    /** Creates a new admin account with role and assigns it to the entity. */
    submit(): void {
        this.submitted = true;

        if (this.form.invalid || this.loading) {
            if (this.form.invalid) {
                this.messageService.add({
                    severity: 'warn',
                    summary: 'Validation',
                    detail: 'Please fill in all required fields correctly.'
                });
            }
            return;
        }

        const email = this.form.value.email;
        const firstName = this.form.value.firstName;
        const lastName = this.form.value.lastName;
        const entityIdNum = parseInt(this.entityId, 10);

        if (isNaN(entityIdNum)) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Invalid entity ID.'
            });
            return;
        }

        this.loading = true;

        // Generate random suffix to ensure unique role title
        const generateRandomString = (length: number): string => {
            const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            let result = '';
            for (let i = 0; i < length; i++) {
                result += letters.charAt(Math.floor(Math.random() * letters.length));
            }
            return result;
        };
        const uniqueSuffix = generateRandomString(8);
        const roleTitle = `${this.entityName} Entity Administrator ${uniqueSuffix}`;
        const roleDescription = `Default Entity Administrator role for ${this.entityName}`;

        const sub = this.entitiesService.createEntityRole(entityIdNum, roleTitle, roleDescription).pipe(
            switchMap((roleResponse: any) => {
                if (!roleResponse?.success) {
                    this.handleCreateEntityRoleError(roleResponse);
                    return throwError(() => roleResponse);
                }

                const entityRoleId = roleResponse.message.Entity_Role_ID;
                return this.entitiesService.createAccount(email, firstName, lastName, entityIdNum, entityRoleId);
            }),
            switchMap((accountResponse: any) => {
                if (!accountResponse?.success) {
                    this.handleCreateAccountError(accountResponse);
                    return throwError(() => accountResponse);
                }

                const accountId = String(accountResponse?.message?.User_ID || '');
                return this.entitiesService.assignEntityAdmin(this.entityId, accountId).pipe(
                    switchMap((assignResponse: any) => {
                        if (!assignResponse?.success) {
                            this.handleAccountError('assign', assignResponse);
                            return throwError(() => assignResponse);
                        }

                        this.messageService.add({
                            severity: 'success',
                            summary: 'Success',
                            detail: 'Admin account created and assigned successfully.',
                            life: 3000
                        });

                        this.form.reset();
                        this.submitted = false;
                        this.loading = false;
                        this.addAdminDialog = false;
                        this.adminCreated.emit(accountId);
                        this.adminUpdated.emit();
                        this.reloadAdmins();

                        return [assignResponse];
                    })
                );
            })
        ).subscribe({
            error: () => this.loading = false
        });

        this.subscriptions.push(sub);
    }

    private handleBusinessError(context: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getErrorMessage(context, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    private handleAccountError(operation: string, response: any): void {
        const code = String(response?.message || '');
        const detail = this.getAccountErrorMessage(operation, code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loadingAdmins = false;
        this.loading = false;
    }

    private handleRemoveAdminError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getRemoveAdminErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
        this.loadingAdmins = false;
    }

    private getErrorMessage(context: string, code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
            default:
                if (context === 'admins') {
                    return null;
                }
                return null;
        }
    }

    private getAccountErrorMessage(operation: string, code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID';
            case 'ERP11277':
                return 'Invalid account selected.';
            case 'ERP11278':
                return 'Account does not belong to this entity.';
        }

        switch (operation) {
            case 'activate':
                switch (code) {
                    case 'ERP11150':
                        return 'Invalid email address → The Entity does not have an account with this email address';
                    case 'ERP11151':
                        return 'The account is already active';
                    default:
                        return null;
                }
            case 'deactivate':
                switch (code) {
                    case 'ERP11150':
                        return 'Invalid email address → The Entity does not have an account with this email address';
                    case 'ERP11152':
                        return 'The account was already deactivated';
                    default:
                        return null;
                }
            case 'delete':
                switch (code) {
                    case 'ERP11150':
                        return 'Invalid email address → The Entity does not have an account with this email address';
                    case 'ERP11153':
                        return 'Account was already created. Deactivate_Account to be used instead';
                    default:
                        return null;
                }
            case 'assign':
                switch (code) {
                    case 'ERP11279':
                        return 'Account ID is not an admin of this entity.';
                    default:
                        return null;
                }
            default:
                return null;
        }
    }

    private getRemoveAdminErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11260':
                return 'Invalid Entity ID.';
            case 'ERP11279':
                return 'Invalid Account ID. This admin does not belong to the selected entity.';
            default:
                return null;
        }
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

    openViewAccountDetails(admin: EntityAccount): void {
        this.selectedAccountForDetails = admin;
        this.viewAccountDetailsDialog = true;
    }

    openEditAccountDescription(admin: EntityAccount): void {
        this.selectedAccountForDetails = admin;
        this.editAccountDescriptionDialog = true;
    }

    onAccountDetailsSaved(): void {
        this.adminUpdated.emit();
        this.loadAdmins();
    }

    openUpdateAccountEmail(admin: EntityAccount): void {
        this.selectedAccountForDetails = admin;
        this.updateEmailForm.patchValue({
            accountId: admin.accountId,
            currentEmail: admin.email,
            newEmail: ''
        });
        this.updateAccountEmailDialog = true;
    }

    openUpdateAccountEntity(admin: EntityAccount): void {
        this.selectedAccountForDetails = admin;
        this.accountEmailForUpdate = admin.email;
        this.updateAccountEntityDialogVisible = true;
    }


    saveAccountEmail(): void {
        if (this.updateEmailForm.invalid || !this.selectedAccountForDetails) {
            this.updateEmailForm.markAllAsTouched();
            return;
        }

        const { accountId, currentEmail, newEmail } = this.updateEmailForm.getRawValue();
        this.savingAccountEmail = true;

        const sub = this.entitiesService.updateAccountEmail(Number(accountId), currentEmail, newEmail).subscribe({
            next: (response: any) => {
                this.savingAccountEmail = false;
                if (!response?.success) {
                    this.handleUpdateAccountEmailError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account email updated successfully.'
                });

                this.updateAccountEmailDialog = false;
                this.updateEmailForm.reset();
                this.adminUpdated.emit();
                this.loadAdmins();
            },
            error: () => {
                this.savingAccountEmail = false;
            }
        });

        this.subscriptions.push(sub);
    }

    onAccountEntityUpdateSave(data: { email: string; entityId: number; entityRoleId: number }): void {
        const sub = this.entitiesService.updateAccountEntity(data.email, data.entityId, data.entityRoleId).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleUpdateAccountEntityError(response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: 'Account entity updated successfully.'
                });

                this.updateAccountEntityDialogVisible = false;
                this.adminUpdated.emit();
                this.loadAdmins();
            },
            error: () => {
                // Error handled by handleUpdateAccountEntityError
            }
        });

        this.subscriptions.push(sub);
    }

    onAccountEntityUpdateCancel(): void {
        this.updateAccountEntityDialogVisible = false;
    }

    onCloseUpdateAccountEmailDialog(): void {
        this.savingAccountEmail = false;
        this.updateAccountEmailDialog = false;
        this.updateEmailForm.reset();
    }

    private handleUpdateAccountEmailError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getUpdateAccountEmailErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    private handleUpdateAccountEntityError(response: any): void {
        const code = String(response?.message || '');
        const detail = this.getUpdateAccountEntityErrorMessage(code);

        if (detail) {
            this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail
            });
        }
    }

    private getUpdateAccountEmailErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11150':
                return 'Invalid email address -> The Entity does not have an account with this email address';
            case 'ERP11141':
                return 'An account with the same email already exists';
            case 'ERP11160':
                return '\'Account_ID\' not matching with \'Current Email\'';
            case 'ERP11161':
                return 'Invalid format for the \'New_Email\'';
            default:
                return null;
        }
    }

    private getUpdateAccountEntityErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP11150':
                return 'Invalid email address -> The Entity does not have an account with this email address';
            case 'ERP11144':
                return 'Invalid Entity ID -> The database does not have an Entity with this ID';
            case 'ERP11145':
                return 'Invalid Role ID -> The entity does not have a Role with this ID';
            default:
                return null;
        }
    }

    /** Returns true if the date is missing or before 2025 (used to display "Never"). */
    isDefaultDate(dateString: string | null | undefined): boolean {
        if (!dateString) {
            return true;
        }
        const date = new Date(dateString);
        return date.getFullYear() < 2025;
    }
}
