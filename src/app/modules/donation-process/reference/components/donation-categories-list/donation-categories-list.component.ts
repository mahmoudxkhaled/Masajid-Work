import { Component, OnDestroy, OnInit } from '@angular/core';
import { MenuItem, MessageService } from 'primeng/api';
import { Observable, Subscription } from 'rxjs';
import { Roles } from 'src/app/core/models/system-roles';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { PermissionService } from 'src/app/core/services/permission.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCategory, DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';

type CategoryActionContext = 'list' | 'create' | 'update' | 'activate' | 'deactivate';

@Component({
  standalone: false,
  selector: 'app-donation-categories-list',
  templateUrl: './donation-categories-list.component.html',
  styleUrl: './donation-categories-list.component.scss',
})
export class DonationCategoriesListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  categories: DonationCategory[] = [];
  typeOptions: { label: string; value: number }[] = [];
  selectedTypeId: number | null = null;
  loadingTypes = true;
  tableLoadingSpinner = true;
  canManageCategories = false;

  formDialogVisible = false;
  formMode: 'create' | 'edit' = 'create';
  formCode = '';
  formName = '';
  formIsService = false;
  formDefaultOrder = 1;

  activationDialogVisible = false;
  currentCategoryForActivation: DonationCategory | null = null;

  menuItems: MenuItem[] = [];
  isLoading$: Observable<boolean>;

  private rawCategories: DonationCategoryBackend[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private subscriptions: Subscription[] = [];
  private currentCategory: DonationCategory | null = null;

  constructor(
    private donationReferenceService: DonationReferenceService,
    private languageDirService: LanguageDirService,
    private permissionService: PermissionService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {
    this.isLoading$ = this.donationReferenceService.isLoadingSubject.asObservable();
  }

  ngOnInit(): void {
    this.canManageCategories = this.permissionService.hasAnyRole([Roles.Developer, Roles.SystemAdministrator]);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapCategories();
        this.remapTypes();
      }),
    );
    this.loadTypes();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationCategory[] {
    if (this.tableLoadingSpinner && this.categories.length === 0) {
      return Array(this.rows).fill(null).map(() => ({
        id: 0,
        donationTypeId: 0,
        code: '',
        name: '',
        isService: false,
        defaultOrder: 0,
        active: false,
      }));
    }
    return this.categories;
  }

  onTypeChange(): void {
    this.loadCategories();
  }

  openCreateDialog(): void {
    if (!this.selectedTypeId) {
      return;
    }
    this.formMode = 'create';
    this.currentCategory = null;
    this.formCode = '';
    this.formName = '';
    this.formIsService = false;
    this.formDefaultOrder = 1;
    this.formDialogVisible = true;
  }

  openEditDialog(row: DonationCategory): void {
    this.formMode = 'edit';
    this.currentCategory = row;
    this.formCode = row.code;
    this.formName = row.name;
    this.formIsService = row.isService;
    this.formDefaultOrder = row.defaultOrder;
    this.formDialogVisible = true;
  }

  onFormDialogClose(): void {
    this.formDialogVisible = false;
    this.currentCategory = null;
  }

  saveCategory(): void {
    const code = this.formCode.trim();
    const name = this.formName.trim();
    const defaultOrder = Number(this.formDefaultOrder);

    if (!code || !name || defaultOrder <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant('donations.reference.categories.form.validationRequired'),
      });
      return;
    }

    if (this.formMode === 'create') {
      if (!this.selectedTypeId) {
        return;
      }
      this.donationReferenceService
        .addDonationCategory(this.selectedTypeId, code, name, this.formIsService, defaultOrder)
        .subscribe({
          next: (response: any) => {
            console.log('saveCategory response', response);
            if (!response?.success) {
              this.handleBusinessError('create', response);
              return;
            }
            this.messageService.add({
              severity: 'success',
              summary: this.translate.getInstant('common.success'),
              detail: this.translate.getInstant('donations.reference.categories.messages.created'),
            });
            this.formDialogVisible = false;
            this.loadCategories();
          },
        });
      return;
    }

    if (!this.currentCategory) {
      return;
    }

    this.donationReferenceService
      .updateDonationCategory(this.currentCategory.id, code, name, this.formIsService, defaultOrder)
      .subscribe({
        next: (response: any) => {
          console.log('saveCategory response', response);
          if (!response?.success) {
            this.handleBusinessError('update', response);
            return;
          }
          this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('common.success'),
            detail: this.translate.getInstant('donations.reference.categories.messages.updated'),
          });
          this.formDialogVisible = false;
          this.loadCategories();
        },
      });
  }

  openRowMenu(menuRef: { toggle: (event: Event) => void }, row: DonationCategory, event: Event): void {
    this.currentCategory = row;
    this.menuItems = this.buildMenuItems(row);
    menuRef.toggle(event);
  }

  openActivationDialog(row: DonationCategory): void {
    this.currentCategoryForActivation = row;
    this.activationDialogVisible = true;
  }

  onActivationDialogClose(): void {
    this.activationDialogVisible = false;
    this.currentCategoryForActivation = null;
  }

  confirmActivationToggle(): void {
    if (!this.currentCategoryForActivation) {
      return;
    }

    const category = this.currentCategoryForActivation;
    const activate = !category.active;
    const request$ = activate
      ? this.donationReferenceService.activateDonationCategory(category.id)
      : this.donationReferenceService.deactivateDonationCategory(category.id);

    request$.subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError(activate ? 'activate' : 'deactivate', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant(
            activate
              ? 'donations.reference.categories.messages.activated'
              : 'donations.reference.categories.messages.deactivated',
          ),
        });
        this.activationDialogVisible = false;
        this.currentCategoryForActivation = null;
        this.loadCategories();
      },
    });
  }

  // #region Load data

  private loadTypes(): void {
    this.loadingTypes = true;
    this.tableLoadingSpinner = true;
    const sub = this.donationReferenceService.listDonationTypes().subscribe({
      next: (response: any) => {
        this.rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(response);
        this.remapTypes();
        this.selectFirstTypeIfNeeded();
      },
      error: () => {
        this.loadingTypes = false;
        this.tableLoadingSpinner = false;
      },
      complete: () => {
        this.loadingTypes = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadCategories(): void {
    if (!this.selectedTypeId) {
      this.categories = [];
      return;
    }

    this.tableLoadingSpinner = true;
    const sub = this.donationReferenceService.listDonationCategories(this.selectedTypeId, false).subscribe({
      next: (response: any) => {
        console.log('loadCategories response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          return;
        }
        this.rawCategories = this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response);
        this.remapCategories();
      },
      error: () => {
        this.tableLoadingSpinner = false;
      },
      complete: () => {
        this.tableLoadingSpinner = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private selectFirstTypeIfNeeded(): void {
    if (!this.selectedTypeId && this.typeOptions.length > 0) {
      this.selectedTypeId = this.typeOptions[0].value;
      this.loadCategories();
      return;
    }
    this.tableLoadingSpinner = false;
  }

  private remapCategories(): void {
    this.categories = this.donationReferenceService.mapDonationCategories(this.rawCategories);
  }

  private remapTypes(): void {
    this.typeOptions = this.donationReferenceService.toTypeDropdownOptions(this.rawTypes);
  }

  // #endregion

  // #region Menu

  private buildMenuItems(row: DonationCategory): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: this.translate.getInstant('donations.reference.categories.actions.edit'),
        icon: 'pi pi-pencil',
        command: () => this.openEditDialog(row),
      },
    ];

    if (row.active) {
      items.push({
        label: this.translate.getInstant('donations.reference.categories.actions.deactivate'),
        icon: 'pi pi-ban',
        command: () => this.openActivationDialog(row),
      });
    } else {
      items.push({
        label: this.translate.getInstant('donations.reference.categories.actions.activate'),
        icon: 'pi pi-check',
        command: () => this.openActivationDialog(row),
      });
    }

    return items;
  }

  // #endregion

  // #region Business errors

  private handleBusinessError(context: CategoryActionContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        break;
      case 'create':
        detail = this.getCreateErrorMessage(code);
        break;
      case 'update':
        detail = this.getUpdateErrorMessage(code);
        break;
      case 'activate':
      case 'deactivate':
        detail = this.getActivateDeactivateErrorMessage(code);
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13002':
        return this.translate.getInstant('donations.reference.categories.errors.invalidTypeId');
      default:
        return null;
    }
  }

  private getCreateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13002':
        return this.translate.getInstant('donations.reference.categories.errors.invalidTypeId');
      case 'DAP13017':
        return this.translate.getInstant('donations.reference.categories.errors.invalidCode');
      case 'DAP13018':
        return this.translate.getInstant('donations.reference.categories.errors.invalidName');
      case 'DAP13034':
        return this.translate.getInstant('donations.reference.categories.errors.duplicateCode');
      case 'DAP13035':
        return this.translate.getInstant('donations.reference.categories.errors.invalidOrder');
      default:
        return null;
    }
  }

  private getUpdateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13001':
        return this.translate.getInstant('donations.reference.categories.errors.invalidCategoryId');
      case 'DAP13017':
        return this.translate.getInstant('donations.reference.categories.errors.invalidCode');
      case 'DAP13018':
        return this.translate.getInstant('donations.reference.categories.errors.invalidName');
      case 'DAP13034':
        return this.translate.getInstant('donations.reference.categories.errors.duplicateCode');
      case 'DAP13035':
        return this.translate.getInstant('donations.reference.categories.errors.invalidOrder');
      default:
        return null;
    }
  }

  private getActivateDeactivateErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13001':
        return this.translate.getInstant('donations.reference.categories.errors.invalidCategoryId');
      default:
        return null;
    }
  }

  // #endregion
}
