import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { EntityAccount } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';

@Component({
  selector: 'app-shared-account-details',
  templateUrl: './shared-account-details.component.html',
  styleUrl: './shared-account-details.component.scss'
})
export class SharedAccountDetailsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() visible: boolean = false;
  @Input() account?: EntityAccount;
  @Input() dialogMode: 'viewEdit' | 'view' | 'editDescription' = 'viewEdit';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<void>();

  descriptionFormControl: FormControl = new FormControl('');

  // Account properties
  accountId: number = 0;
  email: string = '';
  userId: number = 0;
  entityId: number = 0;
  entityRoleId: number = 0;
  systemRoleNameLabel: string = '';
  entityNameLabel: string = '';
  entityRoleNameLabel: string = '';
  accountState: number = 0;
  description: string = '';
  descriptionRegional: string = '';
  originalDescription: string = '';

  loadingAccountDetails: boolean = false;
  savingAccountDetails: boolean = false;
  isRegional: boolean = false;

  private subscriptions: Subscription[] = [];
  private rawEntity: any = null;
  private rawRoles: any[] = [];

  constructor(
    private entitiesService: EntitiesService,
    private rolesService: RolesService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private permissionService: PermissionService
  ) {
    this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.mapDescriptionForCurrentLanguage();
        this.mapEntityAndRoleLabels();
      })
    );
    if (this.visible && this.account) {
      this.loadAccountDetails(this.account.email);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.account?.email) {
      return;
    }
    if (changes['visible']?.currentValue === true) {
      this.loadAccountDetails(this.account.email);
    } else if (changes['account'] && this.visible) {
      this.loadAccountDetails(this.account.email);
    }
  }

  get detailsTitleKey(): string {
    if (this.dialogMode === 'view') {
      return 'entityAccounts.details.viewTitle';
    }
    if (this.dialogMode === 'editDescription') {
      return 'entityAccounts.details.editDescriptionTitle';
    }
    return 'entityAccounts.details.title';
  }

  get descriptionReadonlyText(): string {
    const v = this.descriptionFormControl.value;
    if (v === null || v === undefined) {
      return '';
    }
    return String(v).trim();
  }

  get dialogContentWidth(): string {
    if (this.dialogMode === 'viewEdit' || this.dialogMode === 'editDescription') {
      return '520px';
    }
    return '420px';
  }

  getEntityDisplay(): string {
    const name = (this.entityNameLabel || '').trim();
    if (name) {
      return name;
    }
    return '';
  }

  getEntityRoleDisplay(): string {
    const name = (this.entityRoleNameLabel || '').trim();
    if (name) {
      return name;
    }
    return '';
  }

  /** Fetches account details from the API by email. */
  loadAccountDetails(email: string): void {
    this.loadingAccountDetails = true;
    const sub = this.entitiesService.getAccountDetails(email).subscribe({
      next: (response: any) => {
        this.loadingAccountDetails = false;
        if (!response?.success) {
          this.handleGetAccountDetailsError(response);
          return;
        }

        const accountData = response?.message || {};
        this.accountId = accountData.Account_ID || 0;
        this.email = accountData.Email || email;
        this.userId = accountData.User_ID || 0;
        this.entityId = accountData.Entity_ID || 0;
        this.entityRoleId = accountData.Entity_Role_ID || 0;
        const systemRoleId = Number(accountData.System_Role_ID || this.account?.systemRoleId || 0);
        this.systemRoleNameLabel = this.account?.roleName || '';
        if (systemRoleId > 0) {
          this.systemRoleNameLabel = this.permissionService.getRoleName(systemRoleId) || this.systemRoleNameLabel;
        }
        this.accountState = accountData.Account_State ?? 1;
        this.description = accountData.Description || '';
        this.descriptionRegional = accountData.Description_Regional || '';

        this.mapDescriptionForCurrentLanguage(true);
        this.resolveEntityAndRoleDisplay();
      },
      error: () => {
        this.loadingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  private resolveEntityAndRoleDisplay(): void {
    const eid = this.entityId;
    const rid = this.entityRoleId;
    this.entityNameLabel = '';
    this.entityRoleNameLabel = '';

    if (eid <= 0) {
      this.loadingAccountDetails = false;
      return;
    }

    const sub = this.entitiesService.getEntityDetails(String(eid)).subscribe({
      next: (res: any) => {
        if (res?.success) {
          this.rawEntity = res?.message || {};
          this.mapEntityAndRoleLabels();
        }

        if (rid > 0) {
          const roleSub = this.rolesService.listEntityRoles(eid, 0, 100).subscribe({
            next: (roleRes: any) => {
              if (roleRes?.success) {
                const rolesData = roleRes?.message?.Entity_Roles || {};
                this.rawRoles = Object.values(rolesData) as any[];
                this.mapEntityAndRoleLabels();
              }
              this.loadingAccountDetails = false;
            },
            error: () => {
              this.loadingAccountDetails = false;
            }
          });
          this.subscriptions.push(roleSub);
        } else {
          this.loadingAccountDetails = false;
        }
      },
      error: () => {
        this.loadingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  get isDescriptionModified(): boolean {
    return this.descriptionFormControl.value !== this.originalDescription;
  }

  /** Saves the account description to the API. */
  saveAccountDetails(): void {
    if (!this.account || !this.isDescriptionModified) {
      return;
    }

    const description = this.descriptionFormControl.value || '';
    this.savingAccountDetails = true;

    const sub = this.entitiesService.updateAccountDetails(this.email, description, this.isRegional).subscribe({
      next: (response: any) => {
        this.savingAccountDetails = false;
        if (!response?.success) {
          this.handleUpdateAccountDetailsError(response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account description updated successfully.'
        });

        this.originalDescription = description;
        this.saved.emit();
        if (this.dialogMode === 'editDescription') {
          this.closeDialog();
        }
      },
      error: () => {
        this.savingAccountDetails = false;
      }
    });

    this.subscriptions.push(sub);
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    if (this.isDescriptionModified) {
      this.descriptionFormControl.setValue(this.originalDescription, { emitEvent: false });
    }
  }

  getAccountStateText(): string {
    return this.accountState === 1 ? 'Active' : 'Inactive';
  }

  getAccountStateSeverity(): string {
    return this.accountState === 1 ? 'success' : 'danger';
  }

  onDialogHide(): void {
    this.closeDialog();
  }

  private mapDescriptionForCurrentLanguage(force: boolean = false): void {
    if (!force && this.isDescriptionModified) {
      return;
    }

    const descriptionToShow = this.isRegional
      ? (this.descriptionRegional || this.description)
      : (this.description || this.descriptionRegional);

    this.descriptionFormControl.setValue(descriptionToShow, { emitEvent: false });
    this.originalDescription = descriptionToShow;
  }

  private mapEntityAndRoleLabels(): void {
    if (this.rawEntity) {
      this.entityNameLabel = this.isRegional
        ? (this.rawEntity?.Name_Regional || this.rawEntity?.Name || '')
        : (this.rawEntity?.Name || '');
    }

    const role = this.rawRoles.find((item) => Number(item?.Entity_Role_ID || 0) === this.entityRoleId);
    if (role) {
      this.entityRoleNameLabel = this.isRegional
        ? (role?.Title_Regional || role?.Title || '')
        : (role?.Title || '');
    }
  }

  private handleGetAccountDetailsError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getGetAccountDetailsErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private handleUpdateAccountDetailsError(response: any): void {
    const code = String(response?.message || '');
    const detail = this.getUpdateAccountDetailsErrorMessage(code);

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail
      });
    }
  }

  private getGetAccountDetailsErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      default:
        return null;
    }
  }

  private getUpdateAccountDetailsErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP11150':
        return 'Invalid email address -> The Entity does not have an account with this email address';
      case 'ERP11154':
        return 'Invalid \'Description\' format';
      default:
        return null;
    }
  }
}
