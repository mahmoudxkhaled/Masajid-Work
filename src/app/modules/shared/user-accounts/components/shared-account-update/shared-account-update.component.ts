import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { IAccountSettings } from 'src/app/core/models/account-status.model';
import { Entity, EntityBackend } from 'src/app/modules/entity-administration/entities/models/entities.model';
import { EntitiesService } from 'src/app/modules/entity-administration/entities/services/entities.service';
import { RolesService } from 'src/app/modules/entity-administration/roles/services/roles.service';

@Component({
  selector: 'app-shared-account-update',
  templateUrl: './shared-account-update.component.html',
  styleUrl: './shared-account-update.component.scss'
})
export class SharedAccountUpdateComponent implements OnInit, OnChanges, OnDestroy {
  @Input() visible: boolean = false;
  @Input() accountEmail: string = '';
  @Input() requestedSystemRole: number = 0;
  @Output() onSave = new EventEmitter<{ email: string; entityId: number; entityRoleId: number }>();
  @Output() onCancel = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();

  updateEntityForm!: FormGroup;

  // Entity selection table
  entitiesForSelection: Entity[] = [];
  selectedEntityForUpdate?: Entity;
  entityTableFirst: number = 0;
  entityTableRows: number = 10;
  entityTableTotalRecords: number = 0;
  entityTableTextFilter: string = '';
  loadingEntitiesTable: boolean = false;
  entitySelectionDialogVisible: boolean = false;

  /** Placeholder rows for entity selection table so skeleton cells show while loading. */
  get entityTableValue(): Entity[] {
    if (this.loadingEntitiesTable && this.entitiesForSelection.length === 0) {
      return Array(10).fill(null).map(() => ({} as Entity));
    }
    return this.entitiesForSelection;
  }

  // Entity Role dropdown options
  entityRoleOptions: any[] = [];
  loadingRoles: boolean = false;

  savingAccountEntity: boolean = false;
  loadingAccountDetails: boolean = false;
  accountSettings: IAccountSettings;
  isRegional: boolean = false;

  private subscriptions: Subscription[] = [];
  private rawEntitiesForSelection: EntityBackend[] = [];
  private rawSelectedEntityForUpdate: EntityBackend | null = null;
  private rawEntityRoles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private entitiesService: EntitiesService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private rolesService: RolesService
  ) {
    this.accountSettings = this.localStorageService.getAccountSettings() as IAccountSettings;
    this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.initForm();
  }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
        this.mapRawEntitiesForSelection();
        this.mapSelectedEntityForUpdate();
        this.mapRawEntityRoles();
      })
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When dialog opens (visible becomes true) or accountEmail changes
    if (changes['visible']?.currentValue === true || changes['accountEmail']?.currentValue) {
      if (this.accountEmail) {
        this.loadAccountDetails();
      }
    }

    // When dialog closes, reset state
    if (changes['visible']?.previousValue === true && changes['visible']?.currentValue === false) {
      this.resetState();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm(): void {
    this.updateEntityForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      entityId: [0, [Validators.required, Validators.min(1)]],
      entityRoleId: [0, [Validators.required, Validators.min(1)]]
    });
  }

  private resetState(): void {
    this.loadingAccountDetails = false;
    this.updateEntityForm.reset();
    this.selectedEntityForUpdate = undefined;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    this.rawEntitiesForSelection = [];
    this.rawSelectedEntityForUpdate = null;
    this.rawEntityRoles = [];
    this.entitiesForSelection = [];
    this.entityRoleOptions = [];
  }

  loadAccountDetails(): void {
    if (!this.accountEmail) {
      return;
    }

    // Reset table state
    this.selectedEntityForUpdate = undefined;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    // Don't auto-load entities table - only load when dialog opens

    this.loadingAccountDetails = true;
    const sub = this.entitiesService
      .getAccountDetails(this.accountEmail)
      .pipe(finalize(() => (this.loadingAccountDetails = false)))
      .subscribe({
        next: (response: any) => {
          if (response?.success) {
            const accountData = response?.message || {};
            const currentEntityId = accountData.Entity_ID || 0;
            this.updateEntityForm.patchValue({
              email: this.accountEmail,
              entityId: currentEntityId,
              entityRoleId: accountData.Entity_Role_ID || 0
            });

            if (currentEntityId && currentEntityId > 0) {
              this.loadEntityRoles(currentEntityId);
              this.resolveSelectedEntityFromDetails(currentEntityId);
            }
          } else {
            this.updateEntityForm.patchValue({
              email: this.accountEmail,
              entityId: 0,
              entityRoleId: 0
            });
          }
        },
        error: () => {
          this.updateEntityForm.patchValue({
            email: this.accountEmail,
            entityId: 0,
            entityRoleId: 0
          });
        }
      });

    this.subscriptions.push(sub);
  }

  // Entity Selection Table Methods
  loadEntitiesForSelection(forceReload: boolean = false): void {
    if (this.entitiesService.isLoadingSubject.value && !forceReload) {
      return;
    }

    this.loadingEntitiesTable = true;

    // API uses negative page numbers: -1 = page 1, -2 = page 2, etc.
    const currentPage = Math.floor(this.entityTableFirst / this.entityTableRows) + 1;
    const lastEntityId = -currentPage;

    const requestedRoleValue =
      this.requestedSystemRole || (this.localStorageService.getAccountDetails()?.System_Role_ID || 0);

    const sub = this.entitiesService.listEntities(
      lastEntityId,
      this.entityTableRows,
      this.entityTableTextFilter,
      requestedRoleValue
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
    this.entityTableFirst = 0; // Reset to first page when filter changes
    this.loadEntitiesForSelection(true);
  }

  selectEntityForUpdate(entity: Entity): void {
    this.selectedEntityForUpdate = entity;
    this.rawSelectedEntityForUpdate =
      this.rawEntitiesForSelection.find((item) => String(item?.Entity_ID || '') === entity.id) || null;
    this.updateEntityForm.patchValue({
      entityId: Number(entity.id),
      entityRoleId: 0 // Clear role selection when entity changes
    });
    this.loadEntityRoles(Number(entity.id));
  }

  selectEntityById(entityId: string): void {
    const entity = this.entitiesForSelection.find(e => e.id === entityId);
    if (entity) {
      this.selectEntityForUpdate(entity);
    } else {
      this.updateEntityForm.patchValue({
        entityId: Number(entityId)
      });
      this.resolveSelectedEntityFromDetails(Number(entityId));
    }
  }

  loadEntityRoles(entityId: number): void {
    if (!entityId || entityId === 0) {
      this.entityRoleOptions = [];
      return;
    }

    this.loadingRoles = true;
    const sub = this.rolesService.listEntityRoles(entityId, 0, 100).subscribe({
      next: (response: any) => {
        if (response?.success) {
          const rolesData = response?.message?.Entity_Roles || {};
          this.rawEntityRoles = Object.values(rolesData);
          this.mapRawEntityRoles();
        } else {
          this.entityRoleOptions = [];
        }
        this.loadingRoles = false;
      },
      error: () => {
        this.entityRoleOptions = [];
        this.loadingRoles = false;
      }
    });

    this.subscriptions.push(sub);
  }

  isEntitySelected(entity: Entity): boolean {
    return this.selectedEntityForUpdate?.id === entity.id;
  }

  // Entity Selection Dialog Methods
  openEntitySelectionDialog(): void {
    this.entitySelectionDialogVisible = true;
    this.entityTableTextFilter = '';
    this.entityTableFirst = 0;
    this.loadEntitiesForSelection(true);

    // Try to select current entity if one is set
    const currentEntityId = this.updateEntityForm.get('entityId')?.value;
    if (currentEntityId && currentEntityId !== 0) {
      // Use setTimeout to ensure table is loaded first
      setTimeout(() => {
        this.selectEntityById(String(currentEntityId));
      }, 500);
    }
  }

  closeEntitySelectionDialog(): void {
    this.entitySelectionDialogVisible = false;
  }

  getSelectedEntityDisplayText(): string {
    if (this.selectedEntityForUpdate) {
      return `${this.selectedEntityForUpdate.name} (${this.selectedEntityForUpdate.code})`;
    }
    const entityId = this.updateEntityForm.get('entityId')?.value;
    if (entityId && entityId !== 0) {
      const entity = this.entitiesForSelection.find(e => e.id === String(entityId));
      if (entity) {
        return `${entity.name} (${entity.code})`;
      }
      return `#${entityId}`;
    }
    return 'Select entity';
  }

  private resolveSelectedEntityFromDetails(entityId: number): void {
    if (!entityId || entityId === 0) {
      return;
    }

    const sub = this.entitiesService.getEntityDetails(String(entityId)).subscribe({
      next: (res: any) => {
        if (!res?.success) {
          return;
        }
        const item = res?.message || {};
        this.rawSelectedEntityForUpdate = item;
        this.mapSelectedEntityForUpdate(entityId);
      }
    });

    this.subscriptions.push(sub);
  }

  saveAccountEntity(): void {
    if (this.updateEntityForm.invalid) {
      this.updateEntityForm.markAllAsTouched();
      return;
    }

    const { email, entityId, entityRoleId } = this.updateEntityForm.value;

    // Emit save event to parent component
    this.onSave.emit({
      email,
      entityId: Number(entityId),
      entityRoleId: Number(entityRoleId)
    });
  }

  onCloseDialog(): void {
    this.onClose.emit();
  }

  onCancelClick(): void {
    this.onCancel.emit();
  }

  private mapRawEntitiesForSelection(): void {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.entitiesForSelection = this.rawEntitiesForSelection.map((item) => this.mapEntity(item, isRegional));
    if (this.rawSelectedEntityForUpdate) {
      this.mapSelectedEntityForUpdate();
    }
  }

  private mapSelectedEntityForUpdate(fallbackId: number = 0): void {
    if (!this.rawSelectedEntityForUpdate) {
      return;
    }

    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.selectedEntityForUpdate = this.mapEntity(this.rawSelectedEntityForUpdate, isRegional, fallbackId);
  }

  private mapEntity(item: EntityBackend, isRegional: boolean, fallbackId: number = 0): Entity {
    return {
      id: String(item?.Entity_ID || fallbackId || ''),
      code: item?.Code || '',
      name: isRegional ? (item?.Name_Regional || item?.Name || '') : (item?.Name || ''),
      description: isRegional ? (item?.Description_Regional || item?.Description || '') : (item?.Description || ''),
      parentEntityId: item?.Parent_Entity_ID ? String(item?.Parent_Entity_ID) : '',
      active: Boolean(item?.Is_Active),
      isPersonal: Boolean(item?.Is_Personal)
    };
  }

  private mapRawEntityRoles(): void {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.entityRoleOptions = this.rawEntityRoles.map((item: any) => ({
      label: isRegional ? (item?.Title_Regional || item?.Title || '') : (item?.Title || ''),
      value: item?.Entity_Role_ID || 0
    }));
  }
}
