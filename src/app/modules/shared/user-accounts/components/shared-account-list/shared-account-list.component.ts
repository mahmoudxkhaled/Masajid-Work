import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { textFieldValidator, getTextFieldError, nameFieldValidator, getNameFieldError } from 'src/app/core/validators/text-field.validator';
import { EntityAccount, Entity, EntityBackend } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';



@Component({
  selector: 'app-shared-account-list',
  templateUrl: './shared-account-list.component.html',
  styleUrl: './shared-account-list.component.scss'
})
export class SharedAccountListComponent implements OnInit, OnDestroy, OnChanges {
  @Input() entityId: string = '';
  @Input() requestedSystemRole: number = 0;
  @Output() accountCreated = new EventEmitter<string>();
  @Output() accountUpdated = new EventEmitter<void>();

  loadingAccounts: boolean = false;
  entityAccounts: EntityAccount[] = [];

  /** When loading and entityAccounts is empty, return placeholder rows so the table can show skeleton cells. */
  get tableValue(): EntityAccount[] {
    if (this.loadingAccounts && this.entityAccounts.length === 0) {
      return Array(10).fill(null).map(() => ({} as EntityAccount));
    }
    return this.entityAccounts;
  }

  // Pagination
  first: number = 0;
  rows: number = 10;
  totalRecords: number = 0;

  isRegional: boolean = false;

  // Entity roles map for lookup
  entityRolesMap: Map<number, string> = new Map();
  systemEntityRolesMap: Map<string, string> = new Map();
  loadedSystemEntityIds: Set<number> = new Set();

  /** Entity_ID -> display name for table column (filled via getEntityDetails). */
  accountEntityNamesMap: Map<number, string> = new Map();
  loadedAccountEntityNameIds: Set<number> = new Set();
  private lastAccountsSourceForMap: any[] = [];
  private rawContextEntity: any = null;
  private rawEntityRoles: any[] = [];
  private rawSystemRolesByEntityId: Map<number, any[]> = new Map();
  private rawAccountEntitiesById: Map<number, any> = new Map();
  private rawEntitiesForSelection: EntityBackend[] = [];
  private rawRolesForSelection: any[] = [];

  // Confirmation dialogs state
  deleteAccountDialog: boolean = false;
  accountToDelete?: EntityAccount;
  activateAccountDialog: boolean = false;
  accountToActivate?: EntityAccount;
  deactivateAccountDialog: boolean = false;
  accountToDeactivate?: EntityAccount;
  assignAdminDialog: boolean = false;
  accountToAssign?: EntityAccount;

  // Context menu
  otherAccountsMenuItems: any[] = [];
  currentAccount?: EntityAccount;
  activeRowMenu?: any;

  // Filters
  includeSubentities: boolean = false;
  activeOnly: boolean = false;
  textFilter: string = '';

  // Account creation form
  addAccountDialog: boolean = false;
  form!: FormGroup;
  loading: boolean = false;
  submitted: boolean = false;
  loadingEntity: boolean = false;
  entityName: string = '';
  entityDialogVisible: boolean = false;
  roleDialogVisible: boolean = false;
  loadingEntitiesTable: boolean = false;
  loadingRolesTable: boolean = false;
  entitiesForSelection: Entity[] = [];
  rolesForSelection: { id: number; title: string }[] = [];
  selectedCreateEntity?: Entity;
  selectedCreateRole?: { id: number; title: string };
  entityTableFirst: number = 0;
  entityTableRows: number = 10;
  entityTableTotalRecords: number = 0;
  entityTableTextFilter: string = '';
  roleTableFirst: number = 0;
  roleTableRows: number = 10;
  roleTableTotalRecords: number = 0;

  get entityTableValue(): Entity[] {
    if (this.loadingEntitiesTable && this.entitiesForSelection.length === 0) {
      return Array(10).fill(null).map(() => ({} as Entity));
    }
    return this.entitiesForSelection;
  }

  get roleTableValue(): { id: number; title: string }[] {
    if (this.loadingRolesTable && this.rolesForSelection.length === 0) {
      return Array(10).fill(null).map(() => ({ id: 0, title: '' }));
    }
    return this.rolesForSelection;
  }

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

  private isSystemScope(): boolean {
    return String(this.entityId) === '0';
  }

  get canCreateAccount(): boolean {
    return true;
  }

  get isSystemCreateFlow(): boolean {
    return this.isSystemScope();
  }

  get isSystemUserAccountsPage(): boolean {
    return this.requestedSystemRole === 2;
  }

  constructor(
    private entitiesService: EntitiesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private permissionService: PermissionService,
    private fb: FormBuilder,
    private rolesService: RolesService,
    private languageDirService: LanguageDirService,
    private translationService: TranslationService
  ) {
    this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
  }

  ngOnInit(): void {
    this.applyIncludeSubentitiesMode();
    this.initForm();
    this.applyCreateFormValidators();
    this.initAccountManagementForms();
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.mapContextEntityName();
        this.mapRawEntityRoles();
        this.mapRawSystemRoles();
        this.mapRawAccountEntityNames();
        this.mapRawEntitiesForSelection();
        this.mapRawRolesForSelection();
        this.mapAccountsData(this.lastAccountsSourceForMap);
      })
    );

    if (this.entityId) {
      this.loadAccounts();
      if (!this.isSystemScope()) {
        this.loadEntity();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestedSystemRole']) {
      this.applyIncludeSubentitiesMode();
    }
    if (changes['entityId'] && !changes['entityId'].firstChange && this.entityId) {
      // Clear roles map when entity changes
      this.entityRolesMap.clear();
      this.systemEntityRolesMap.clear();
      this.loadedSystemEntityIds.clear();
      this.accountEntityNamesMap.clear();
      this.loadedAccountEntityNameIds.clear();
      this.loadAccounts();
      if (!this.entityName && !this.isSystemScope()) {
        this.loadEntity();
      }
    }

    if (changes['entityId']) {
      this.applyCreateFormValidators();
    }
  }

  private applyIncludeSubentitiesMode(): void {
    if (this.isSystemUserAccountsPage) {
      this.includeSubentities = true;
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
        this.rawContextEntity = response?.message || {};
        this.mapContextEntityName();
        const ctxId = parseInt(this.entityId, 10);
        if (!isNaN(ctxId) && ctxId > 0 && this.entityName) {
          this.accountEntityNamesMap.set(ctxId, this.entityName);
        }
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

    if (this.isSystemScope()) {
      this.entityRolesMap.clear();
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
          this.rawEntityRoles = Object.values(rolesData);
          this.mapRawEntityRoles();
        }
      },
      error: () => {
        // If error occurs, clear the map
        this.entityRolesMap.clear();
      }
    });

    this.subscriptions.push(sub);
  }

  loadAccounts(): void {
    // Load entity roles first, then reload accounts
    this.loadEntityRoles();
    this.reloadAccounts();
  }


  /** Fetches paginated accounts from the API. */
  reloadAccounts(): void {
    if (!this.entityId) {
      return;
    }

    this.loadingAccounts = true;

    // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastAccountId = -currentPage;

    const sub = this.entitiesService.getEntityAccountsList(
      this.entityId,
      this.includeSubentities,
      this.activeOnly,
      lastAccountId,
      this.rows,
      this.textFilter
    ).subscribe({
      next: (response: any) => {
        console.log('reloadAccounts response', response);
        if (!response?.success) {
          this.handleBusinessError('accounts', response);
          return;
        }
        this.totalRecords = Number(response.message.Total_Count || 0);
        const accountsData = response?.message?.Accounts || {};
        this.mapAccountsData(accountsData);
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  private mapAccountsData(accountsData: any): void {
    const accounts = accountsData || {};
    const accountsArray = Array.isArray(accounts) ? accounts : Object.values(accounts);
    this.lastAccountsSourceForMap = accountsArray;

    if (this.isSystemScope()) {
      this.loadSystemRolesForCurrentPage(accountsArray);
    }
    this.loadAccountEntityNamesForCurrentPage(accountsArray);

    this.entityAccounts = accountsArray.map((account: any) => {
      const accountId = String(account?.Account_ID || '');
      const userId = account?.User_ID || 0;
      const systemRoleId = account?.System_Role_ID || 0;
      const accountState = account?.Account_State || 0;
      const email = account?.Email || '';
      const roleName = this.permissionService.getRoleName(systemRoleId);
      const twoFA = account?.Two_FA || false;
      const lastLogin = account?.Last_Login || null;

      // Extract entity role ID and look up role name
      const accountEntityId = account?.Entity_ID || 0;
      const entityRoleId = account?.Entity_Role_ID || 0;
      const entityRoleName = this.resolveEntityRoleName(accountEntityId, entityRoleId);
      const entityNameLabel = this.resolveAccountEntityNameLabel(accountEntityId);

      return {
        accountId,
        userId,
        email,
        systemRoleId,
        roleName,
        accountEntityId,
        entityNameLabel,
        entityRoleId,
        entityRoleName,
        accountState,
        Two_FA: twoFA,
        Last_Login: lastLogin
      };
    });
  }

  private resolveAccountEntityNameLabel(accountEntityId: number): string | null | undefined {
    if (accountEntityId <= 0) {
      return null;
    }
    if (this.accountEntityNamesMap.has(accountEntityId)) {
      const name = this.accountEntityNamesMap.get(accountEntityId) || '';
      return name || null;
    }
    return undefined;
  }

  private loadAccountEntityNamesForCurrentPage(accountsArray: any[]): void {
    const entityIds = [...new Set(
      accountsArray
        .map((account: any) => Number(account?.Entity_ID || 0))
        .filter((id: number) => id > 0)
    )];

    entityIds.forEach((id: number) => {
      if (this.loadedAccountEntityNameIds.has(id)) {
        return;
      }
      this.loadedAccountEntityNameIds.add(id);
      const sub = this.entitiesService.getEntityDetails(String(id)).subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.accountEntityNamesMap.set(id, '');
            this.mapAccountsData(this.lastAccountsSourceForMap);
            return;
          }
          this.rawAccountEntitiesById.set(id, response?.message || {});
          this.mapRawAccountEntityNames();
          this.mapAccountsData(this.lastAccountsSourceForMap);
        },
        error: () => {
          this.accountEntityNamesMap.set(id, '');
          this.mapAccountsData(this.lastAccountsSourceForMap);
        }
      });
      this.subscriptions.push(sub);
    });
  }

  private resolveEntityRoleName(entityId: number, entityRoleId: number): string {
    if (entityRoleId <= 0) {
      return 'N/A';
    }

    if (this.isSystemScope()) {
      const roleKey = `${entityId}_${entityRoleId}`;
      return this.systemEntityRolesMap.get(roleKey) || String(entityRoleId);
    }

    return this.entityRolesMap.get(entityRoleId) || 'N/A';
  }

  private loadSystemRolesForCurrentPage(accountsArray: any[]): void {
    const entityIds = [...new Set(
      accountsArray
        .map((account: any) => Number(account?.Entity_ID || 0))
        .filter((entityId: number) => entityId > 0)
    )];

    entityIds.forEach((entityId: number) => {
      if (this.loadedSystemEntityIds.has(entityId)) {
        return;
      }

      this.loadedSystemEntityIds.add(entityId);
      const sub = this.rolesService.listEntityRoles(entityId, 0, 100).subscribe({
        next: (response: any) => {
          if (!response?.success) {
            return;
          }

          const rolesData = response?.message?.Entity_Roles || {};
          this.rawSystemRolesByEntityId.set(entityId, Object.values(rolesData));
          this.mapRawSystemRoles();

          // Refresh current page so role names appear after async role lookups complete.
          this.mapAccountsData(accountsArray);
        }
      });

      this.subscriptions.push(sub);
    });
  }

  onFilterChange(): void {
    this.first = 0;
    this.reloadAccounts();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const searchValue = target?.value || '';
    this.textFilter = searchValue;
    this.first = 0; // Reset to first page when filter changes
    this.reloadAccounts();
  }


  onPageChange(event: any): void {
    const nextFirst = event?.first ?? 0;
    const nextRows = event?.rows ?? this.rows;
    this.first = nextFirst;
    this.rows = nextRows;
    this.reloadAccounts();
  }


  initForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', [Validators.required, nameFieldValidator()]],
      lastName: ['', [Validators.required, nameFieldValidator()]],
      entityId: [null],
      entityRoleId: [null]
    });
  }

  private applyCreateFormValidators(): void {
    if (!this.form) {
      return;
    }

    const entityIdControl = this.form.get('entityId');
    const entityRoleIdControl = this.form.get('entityRoleId');

    if (this.isSystemScope()) {
      entityIdControl?.setValidators([Validators.required]);
    } else {
      entityIdControl?.clearValidators();
    }
    entityRoleIdControl?.setValidators([Validators.required]);

    entityIdControl?.updateValueAndValidity({ emitEvent: false });
    entityRoleIdControl?.updateValueAndValidity({ emitEvent: false });
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

  navigateToAddAccount(): void {
    if (!this.canCreateAccount) {
      return;
    }

    if (!this.form) {
      this.initForm();
    } else {
      this.form.reset();
      this.submitted = false;
    }

    if (!this.isSystemScope()) {
      const currentEntityId = Number(this.entityId || 0);
      this.form.patchValue({
        entityId: currentEntityId > 0 ? currentEntityId : null
      });
    }

    this.addAccountDialog = true;
  }

  onAddAccountDialogHide(): void {
    this.loading = false;
  }

  onAccountCancelled(): void {
    this.loading = false;
    this.addAccountDialog = false;
    this.form.reset();
    this.submitted = false;
    this.selectedCreateEntity = undefined;
    this.selectedCreateRole = undefined;
    this.entitiesForSelection = [];
    this.rolesForSelection = [];
    this.entityDialogVisible = false;
    this.roleDialogVisible = false;
    this.roleTableFirst = 0;
  }

  /** Creates a new account with role and assigns it to the entity. */
  submit(): void {
    if (!this.canCreateAccount) {
      return;
    }

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

    const selectedEntityId = Number(this.form.value.entityId || 0);
    const selectedEntityRoleId = Number(this.form.value.entityRoleId || 0);
    if (selectedEntityId <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid entity ID.'
      });
      return;
    }

    this.loading = true;
    const sub = this.entitiesService
      .createAccount(email, firstName, lastName, selectedEntityId, selectedEntityRoleId)
      .subscribe({
        next: (accountResponse: any) => {
          if (!accountResponse?.success) {
            this.handleCreateAccountError(accountResponse);
            return;
          }

          const accountId = String(accountResponse?.message?.User_ID || '');

          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Account created successfully.',
            life: 3000
          });

          this.form.reset();
          this.submitted = false;
          this.loading = false;
          this.addAccountDialog = false;
          this.selectedCreateEntity = undefined;
          this.selectedCreateRole = undefined;
          this.accountCreated.emit(accountId);
          this.accountUpdated.emit();
          this.reloadAccounts();
        },
        error: () => this.loading = false
      });

    this.subscriptions.push(sub);
  }

  openCreateEntityDialog(): void {
    this.entityDialogVisible = true;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    this.loadEntitiesForSelection(true);
  }

  closeCreateEntityDialog(): void {
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
        const entitiesData = response.message.Entities_List || response.message.Entities || {};

        this.rawEntitiesForSelection = Object.values(entitiesData) as EntityBackend[];
        this.mapRawEntitiesForSelection();
        this.loadingEntitiesTable = false;
      },
      error: () => this.loadingEntitiesTable = false
    });

    this.subscriptions.push(sub);
  }

  onEntityTablePageChange(event: any): void {
    this.entityTableFirst = event?.first ?? 0;
    this.entityTableRows = event?.rows ?? this.entityTableRows;
    this.loadEntitiesForSelection(true);
  }

  onEntityTableSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.entityTableTextFilter = target?.value || '';
    this.entityTableFirst = 0;
    this.loadEntitiesForSelection(true);
  }

  selectCreateEntity(entity: Entity): void {
    this.selectedCreateEntity = entity;
    this.selectedCreateRole = undefined;
    this.form.patchValue({
      entityId: Number(entity.id),
      entityRoleId: null
    });
  }

  isCreateEntitySelected(entity: Entity): boolean {
    return this.selectedCreateEntity?.id === entity.id;
  }

  getCreateEntityDisplayText(): string {
    if (!this.selectedCreateEntity) {
      return this.isRegional ? 'اختر الجهة' : 'Select entity';
    }
    return `${this.selectedCreateEntity.name} (${this.selectedCreateEntity.code})`;
  }

  openCreateRoleDialog(): void {
    const selectedEntityId = Number(this.form.get('entityId')?.value || 0);
    if (selectedEntityId <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: this.isRegional ? 'يرجى اختيار الجهة أولاً.' : 'Please select an entity first.'
      });
      return;
    }

    this.roleDialogVisible = true;
    this.roleTableFirst = 0;
    this.loadRolesForSelection(true);
  }

  closeCreateRoleDialog(): void {
    this.roleDialogVisible = false;
  }

  loadRolesForSelection(forceReload: boolean = false): void {
    const selectedEntityId = Number(this.form.get('entityId')?.value || 0);
    if (selectedEntityId <= 0) {
      return;
    }

    if (this.rolesService.isLoadingSubject.value && !forceReload) {
      return;
    }

    this.loadingRolesTable = true;
    const currentPage = Math.floor(this.roleTableFirst / this.roleTableRows) + 1;
    const lastRoleId = -currentPage;

    const sub = this.rolesService.listEntityRoles(selectedEntityId, lastRoleId, this.roleTableRows).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.loadingRolesTable = false;
          return;
        }

        this.roleTableTotalRecords = Number(response?.message?.Total_Count || 0);
        const rolesData = response?.message?.Entity_Roles || {};
        this.rawRolesForSelection = Object.values(rolesData);
        this.mapRawRolesForSelection();

        this.loadingRolesTable = false;
      },
      error: () => this.loadingRolesTable = false
    });

    this.subscriptions.push(sub);
  }

  onRoleTablePageChange(event: any): void {
    this.roleTableFirst = event?.first ?? 0;
    this.roleTableRows = event?.rows ?? this.roleTableRows;
    this.loadRolesForSelection(true);
  }

  selectCreateRole(role: { id: number; title: string }): void {
    this.selectedCreateRole = role;
    this.form.patchValue({ entityRoleId: role.id });
  }

  isCreateRoleSelected(role: { id: number; title: string }): boolean {
    return this.selectedCreateRole?.id === role.id;
  }

  getCreateRoleDisplayText(): string {
    if (!this.selectedCreateRole) {
      return this.isRegional ? 'اختر دور الجهة' : 'Select entity role';
    }
    return this.selectedCreateRole.title;
  }

  confirmActivateAccount(account: EntityAccount): void {
    this.accountToActivate = account;
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

    this.loadingAccounts = true;
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmDeactivateAccount(account: EntityAccount): void {
    this.accountToDeactivate = account;
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

    this.loadingAccounts = true;
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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmDeleteAccount(account: EntityAccount): void {
    this.accountToDelete = account;
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
    this.loadingAccounts = true;

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
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  confirmAssignAccountAsAdmin(account: EntityAccount): void {
    this.accountToAssign = account;
    this.assignAdminDialog = true;
  }

  onCancelAssignAdminDialog(): void {
    this.assignAdminDialog = false;
    this.accountToAssign = undefined;
  }

  /** Promotes an account to entity administrator. */
  assignAccountAsAdmin(): void {
    if (!this.accountToAssign?.accountId || !this.entityId) {
      return;
    }

    this.loadingAccounts = true;
    const sub = this.entitiesService.assignEntityAdmin(this.entityId, this.accountToAssign.accountId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleAssignAdminError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account assigned as entity administrator successfully.',
          life: 3000
        });

        this.assignAdminDialog = false;
        this.accountToAssign = undefined;
        this.reloadAccounts();
        this.accountUpdated.emit();
      },

      complete: () => this.loadingAccounts = false
    });

    this.subscriptions.push(sub);
  }

  openOtherAccountMenu(menuRef: any, account: EntityAccount, event: Event): void {
    this.currentAccount = account;
    this.configureOtherAccountMenuItems(account);
    if (this.activeRowMenu && this.activeRowMenu !== menuRef) {
      this.activeRowMenu.hide();
    }
    this.activeRowMenu = menuRef;
    menuRef.toggle(event);
  }

  onRowMenuHide(menuRef: any): void {
    if (this.activeRowMenu === menuRef) {
      this.activeRowMenu = undefined;
    }
  }

  /**
   * Builds the context menu based on user permissions.
   * - Activate: SystemAdmin, Developer only (when inactive)
   * - Deactivate/Delete: SystemAdmin, Developer, EntityAdmin
   */
  private configureOtherAccountMenuItems(account: EntityAccount): void {
    const menuItemsList: any[] = [];
    const canActivateAccount = this.permissionService.canActivateAccount();
    const canDeactivateAccount = this.permissionService.canDeactivateAccount();
    const canDeleteAccount = this.permissionService.canDeleteAccount();
    const canAssignAdmin = this.permissionService.canAssignAdmin();
    const canGetAccountDetails = this.permissionService.can('Get_Account_Details');
    const canUpdateAccountDetails = this.permissionService.can('Update_Account_Details');
    const canUpdateAccountEmail = this.permissionService.can('Update_Account_Email');
    const canUpdateAccountEntity = this.permissionService.can('Update_Account_Entity');

    if (canGetAccountDetails) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.viewAccountDetails'),
        icon: 'pi pi-eye',
        command: () => this.currentAccount && this.openViewAccountDetails(this.currentAccount)
      });
    }

    if (canUpdateAccountDetails) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.editAccountDescription'),
        icon: 'pi pi-pencil',
        command: () => this.currentAccount && this.openEditAccountDescription(this.currentAccount)
      });
    }

    if (canUpdateAccountEmail) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.updateAccountEmail'),
        icon: 'pi pi-envelope',
        command: () => this.currentAccount && this.openUpdateAccountEmail(this.currentAccount)
      });
    }

    if (canUpdateAccountEntity) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.updateAccountEntity'),
        icon: 'pi pi-building',
        command: () => this.currentAccount && this.openUpdateAccountEntity(this.currentAccount)
      });
    }

    if (canActivateAccount && account.accountState === 0) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.activateAccount'),
        icon: 'pi pi-check',
        command: () => this.currentAccount && this.confirmActivateAccount(this.currentAccount)
      });
    }

    if (canDeactivateAccount && account.accountState === 1) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.deactivateAccount'),
        icon: 'pi pi-times',
        command: () => this.currentAccount && this.confirmDeactivateAccount(this.currentAccount)
      });
    }

    if (canDeleteAccount) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.deleteAccount'),
        icon: 'pi pi-trash',
        command: () => this.currentAccount && this.confirmDeleteAccount(this.currentAccount)
      });
    }

    if (canAssignAdmin && this.isEligibleForAdmin(account)) {
      menuItemsList.push({
        label: this.translationService.getInstant('entityAccounts.list.menu.assignAsAdmin'),
        icon: 'pi pi-user-plus',
        command: () => this.currentAccount && this.confirmAssignAccountAsAdmin(this.currentAccount)
      });
    }

    this.otherAccountsMenuItems = menuItemsList;
  }

  private isEligibleForAdmin(account: EntityAccount): boolean {
    return account.systemRoleId !== 3;
  }

  getEntityName(): string {
    return this.entityName;
  }

  private mapContextEntityName(): void {
    if (!this.rawContextEntity) {
      return;
    }

    this.entityName = this.isRegional
      ? (this.rawContextEntity?.Name_Regional || this.rawContextEntity?.Name || '')
      : (this.rawContextEntity?.Name || '');

    const ctxId = parseInt(this.entityId, 10);
    if (!isNaN(ctxId) && ctxId > 0 && this.entityName) {
      this.accountEntityNamesMap.set(ctxId, this.entityName);
    }
  }

  private mapRawEntityRoles(): void {
    this.entityRolesMap.clear();
    this.rawEntityRoles.forEach((item: any) => {
      const roleId = item?.Entity_Role_ID || 0;
      const roleName = this.isRegional
        ? (item?.Title_Regional || item?.Title || '')
        : (item?.Title || '');
      if (roleId > 0) {
        this.entityRolesMap.set(roleId, roleName);
      }
    });
  }

  private mapRawSystemRoles(): void {
    this.systemEntityRolesMap.clear();
    this.rawSystemRolesByEntityId.forEach((roles, entityId) => {
      roles.forEach((item: any) => {
        const roleId = Number(item?.Entity_Role_ID || 0);
        if (roleId <= 0) {
          return;
        }

        const roleName = this.isRegional
          ? (item?.Title_Regional || item?.Title || '')
          : (item?.Title || '');
        this.systemEntityRolesMap.set(`${entityId}_${roleId}`, roleName || String(roleId));
      });
    });
  }

  private mapRawAccountEntityNames(): void {
    this.rawAccountEntitiesById.forEach((entity, id) => {
      const name = this.isRegional
        ? (entity?.Name_Regional || entity?.Name || '')
        : (entity?.Name || '');
      this.accountEntityNamesMap.set(id, name || '');
    });
  }

  private mapRawEntitiesForSelection(): void {
    this.entitiesForSelection = this.rawEntitiesForSelection.map((item) => ({
      id: String(item?.Entity_ID || ''),
      code: item?.Code || '',
      name: this.isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
      description: this.isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
      parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
      active: Boolean(item?.Is_Active),
      isPersonal: Boolean(item?.Is_Personal)
    }));

    if (this.selectedCreateEntity) {
      this.selectedCreateEntity =
        this.entitiesForSelection.find((entity) => entity.id === this.selectedCreateEntity?.id) ||
        this.selectedCreateEntity;
    }
  }

  private mapRawRolesForSelection(): void {
    this.rolesForSelection = this.rawRolesForSelection
      .map((item: any) => ({
        id: Number(item?.Entity_Role_ID || 0),
        title: this.isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || '')
      }))
      .filter((item: { id: number; title: string }) => item.id > 0);

    if (this.selectedCreateRole) {
      this.selectedCreateRole =
        this.rolesForSelection.find((role) => role.id === this.selectedCreateRole?.id) ||
        this.selectedCreateRole;
    }
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
    this.loadingAccounts = false;
    this.loading = false;
  }

  private handleAssignAdminError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getAssignAdminErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
    this.loadingAccounts = false;
  }

  private getErrorMessage(context: string, code: string): string | null {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID';
      case 'ERP11255':
        return 'Invalid value for the Filter_Count parameter, should be a minimum of 5 records, and a maximum of 100 records';
      case 'ERP11277':
        return 'Invalid account selected.';
      case 'ERP11278':
        return 'Account does not belong to this entity.';
      default:
        if (context === 'accounts') {
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
      default:
        return null;
    }
  }

  private getAssignAdminErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11260':
        return 'Invalid Entity ID.';
      case 'ERP11277':
        return 'Invalid account. Make sure the account exists and belongs to this entity tree.';
      case 'ERP11278':
        return 'The account must belong directly to this entity before it can be promoted.';
      default:
        return null;
    }
  }

  openViewAccountDetails(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.viewAccountDetailsDialog = true;
  }

  openEditAccountDescription(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.editAccountDescriptionDialog = true;
  }

  onAccountDetailsSaved(): void {
    this.accountUpdated.emit();
    this.reloadAccounts();
  }

  openUpdateAccountEmail(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.updateEmailForm.patchValue({
      accountId: account.accountId,
      currentEmail: account.email,
      newEmail: ''
    });
    this.updateAccountEmailDialog = true;
  }

  openUpdateAccountEntity(account: EntityAccount): void {
    this.selectedAccountForDetails = account;
    this.accountEmailForUpdate = account.email;
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
        this.accountUpdated.emit();
        this.reloadAccounts();
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
        this.accountUpdated.emit();
        this.reloadAccounts();
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

  /** Returns true if the date is missing or before 2025 (used to display "Never"). */
  isDefaultDate(dateString: string | null | undefined): boolean {
    if (!dateString) {
      return true;
    }
    const date = new Date(dateString);
    return date.getFullYear() < 2025;
  }

}
