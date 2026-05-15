import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { FileSystemPermissionsService, FileSystemAccessPermissionRow } from '../services/file-system-permissions.service';
import { EntitiesService } from '../../entities/services/entities.service';
import { EntityGroupsService } from '../../entity-groups/services/entity-groups.service';
import { RolesService } from '../../roles/services/roles.service';
import type { AccountsAccessRightsMap } from '../models/file-system-permissions-list-response.model';

interface RelatedTargetOption {
  id: number;
  name: string;
  entityLabel: string;
}

interface AccessibleEntityRow {
  entityId: number;
  label: string;
  parentEntityId: number;
}

interface EffectiveAccountRow {
  accountId: number;
  accessRight: number;
  accountLabel: string;
  tableSearchText: string;
}

@Component({
  selector: 'app-file-systems-permissions',
  templateUrl: './file-systems-permissions.component.html',
  styleUrls: ['./file-systems-permissions.component.scss'],
})
export class FileSystemsPermissionsComponent implements OnInit {
  loadingPermissions = false;
  loadingPermissionTargets = false;

  selectedFileSystemId: number | null = null;
  fileSystemNameForTitle = '';

  permissions: FileSystemAccessPermissionRow[] = [];
  effectiveAccountRows: EffectiveAccountRow[] = [];
  selectedPermissionForRemove: FileSystemAccessPermissionRow | null = null;

  addDialogVisible = false;
  removeConfirmVisible = false;
  clearAllConfirmVisible = false;

  addAccessType: number | null = null;
  addAccessRight: number | null = null;
  selectedRelatedTargetIds: number[] = [];
  relatedTargetOptions: RelatedTargetOption[] = [];
  relatedTargetsSearchText = '';
  loadingRelatedTargets = false;
  relatedTargetsTouched = false;

  accessTypeOptions: { label: string; value: number }[] = [];


  accessTypeFilterOptions: { label: string; value: number }[] = [];
  accessRightOptions: { label: string; value: number }[] = [];
  readonly permissionsTableRows = 10;
  readonly permissionsRowsPerPageOptions = [10, 25, 50, 100];
  readonly effectiveAccessTableRows = 10;
  readonly effectiveAccessRowsPerPageOptions = [10, 25, 50, 100];
  currentEntityId = 0;
  isRegional = false;

  private appliedRouteFileSystemId: number | null = null;
  private accessibleEntitiesForTargetsCache: AccessibleEntityRow[] | null = null;
  private pendingScrollToEffectiveAccess = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private destroyRef: DestroyRef,
    private translate: TranslationService,
    private ngxTranslate: TranslateService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private fileSystemPermissionsService: FileSystemPermissionsService,
    private entitiesService: EntitiesService,
    private entityGroupsService: EntityGroupsService,
    private rolesService: RolesService
  ) { }

  ngOnInit(): void {
    this.currentEntityId = Number(this.localStorageService.getEntityId() || 0);
    this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    this.buildStaticOptions();
    this.languageDirService.userLanguageCode$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
      this.clearAccessibleEntitiesCache();
      if (this.addDialogVisible && this.addAccessType !== null) {
        this.loadRelatedTargets();
      }
      this.refreshPermissions();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('fileSystemId') || 0);
      const scrollToEffective = params.get('scrollTo') === 'effective';
      const nameFromQuery = String(params.get('fileSystemName') ?? '').trim();
      const titleName = id > 0 ? nameFromQuery || `#${id}` : '';
      if (id <= 0) {
        this.appliedRouteFileSystemId = null;
        this.fileSystemNameForTitle = '';
        this.redirectMissingFileSystemQuery();
        return;
      }
      this.fileSystemNameForTitle = titleName;
      if (this.appliedRouteFileSystemId === id) {
        if (scrollToEffective) {
          this.finishScrollToEffectiveFromNavigation();
        }
        return;
      }
      this.appliedRouteFileSystemId = id;
      this.selectedFileSystemId = id;
      this.permissions = [];
      this.effectiveAccountRows = [];
      this.pendingScrollToEffectiveAccess = scrollToEffective;
      this.refreshPermissions();
    });
  }

  private finishScrollToEffectiveFromNavigation(): void {
    this.clearScrollToQueryParam();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('effective-access-by-account')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    });
  }

  private clearScrollToQueryParam(): void {
    const q = { ...this.route.snapshot.queryParams };
    if (q['scrollTo'] !== 'effective') {
      return;
    }
    delete q['scrollTo'];
    void this.router.navigate([], { relativeTo: this.route, queryParams: q, replaceUrl: true });
  }

  private buildStaticOptions(): void {
    this.accessTypeOptions = [
      { label: this.translate.getInstant('fileSystem.permissions.accessType.account'), value: 0 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.group'), value: 1 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.role'), value: 2 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.entity'), value: 3 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.organization'), value: 4 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.all'), value: 5 },
    ];
    this.accessTypeFilterOptions = [
      ...this.accessTypeOptions,
      { label: this.translate.getInstant('fileSystem.permissions.accessType.owner'), value: 6 },
      { label: this.translate.getInstant('fileSystem.permissions.accessType.entityAdmin'), value: 7 },
    ];

    this.accessRightOptions = [
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.none'), value: 0 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.list'), value: 1 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.read'), value: 2 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.amend'), value: 3 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.modify'), value: 4 },
      { label: this.translate.getInstant('fileSystem.permissions.accessRight.full'), value: 5 },
    ];
  }

  private redirectMissingFileSystemQuery(): void {
    this.selectedFileSystemId = null;
    this.messageService.add({
      severity: 'warn',
      summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.missingFileSystemQueryTitle'),
      detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.missingFileSystemQueryMessage'),
    });
    void this.router.navigate(['/entity-administration/entity-storage-management']);
  }

  get permissionsTableSkeletonActive(): boolean {
    return (
      this.selectedFileSystemId != null &&
      this.loadingPermissions &&
      this.permissions.length === 0
    );
  }

  refreshPermissions(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.loadingPermissions = true;
    this.permissions = [];
    this.effectiveAccountRows = [];

    this.fileSystemPermissionsService.listFileSystemPermissions(this.selectedFileSystemId).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.pendingScrollToEffectiveAccess = false;
          this.handleBusinessError('listPermissions', response);
          return;
        }
        const mapped = this.fileSystemPermissionsService.mapPermissionsResponse(response);
        this.permissions = mapped.permissions;
        this.rebuildEffectiveAccountRows(mapped.accountsAccessRights);
        this.refreshPermissionTableSearchText();
        void Promise.all([this.resolveRelatedTargetDisplays(), this.resolveEffectiveAccountLabels()]).then(() => {
          if (this.pendingScrollToEffectiveAccess) {
            this.pendingScrollToEffectiveAccess = false;
            this.finishScrollToEffectiveFromNavigation();
          }
        });
      },
      error: () => {
        this.loadingPermissions = false;
        this.pendingScrollToEffectiveAccess = false;
      },
    });
  }

  showAddDialog(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.clearAccessibleEntitiesCache();
    this.addAccessType = null;
    this.addAccessRight = null;
    this.selectedRelatedTargetIds = [];
    this.relatedTargetOptions = [];
    this.relatedTargetsSearchText = '';
    this.relatedTargetsTouched = false;
    this.addDialogVisible = true;
  }

  hideAddDialog(): void {
    this.addDialogVisible = false;
    this.clearAccessibleEntitiesCache();
  }

  onAddConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    const accessType = this.addAccessType;
    const accessRight = this.addAccessRight;
    const requiresRelatedTargets = this.requiresRelatedTargets();
    const relatedIds = requiresRelatedTargets ? [...this.selectedRelatedTargetIds] : [];

    if (accessType == null) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.accessTypeRequired'),
      });
      return;
    }
    if (accessRight == null) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.accessRightRequired'),
      });
      return;
    }
    if (requiresRelatedTargets && relatedIds.length === 0) {
      this.relatedTargetsTouched = true;
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.validationTitle'),
        detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedIdsRequired'),
      });
      return;
    }

    this.loadingPermissions = true;
    this.fileSystemPermissionsService.setFileSystemAccessPermission(this.selectedFileSystemId, accessType, relatedIds, accessRight).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.handleBusinessError('addPermission', response);
          return;
        }
        this.hideAddDialog();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.addSuccess'),
        });
        this.refreshPermissions();
      },
      error: () => {
        this.loadingPermissions = false;
      },
    });
  }

  showRemoveConfirm(row: FileSystemAccessPermissionRow): void {
    this.selectedPermissionForRemove = row;
    this.removeConfirmVisible = true;
  }

  hideRemoveConfirm(): void {
    this.removeConfirmVisible = false;
    this.selectedPermissionForRemove = null;
  }

  onRemoveConfirm(): void {
    if (!this.selectedFileSystemId || !this.selectedPermissionForRemove) {
      return;
    }
    const row = this.selectedPermissionForRemove;
    this.loadingPermissions = true;
    this.fileSystemPermissionsService.removeFileSystemAccessPermission(this.selectedFileSystemId, row.accessType, row.relatedIds).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.handleBusinessError('removePermission', response);
          return;
        }
        this.hideRemoveConfirm();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.removeSuccess'),
        });
        this.refreshPermissions();
      },
      error: () => {
        this.loadingPermissions = false;
      },
    });
  }

  showClearAllConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.clearAllConfirmVisible = true;
  }

  hideClearAllConfirm(): void {
    this.clearAllConfirmVisible = false;
  }

  onClearAllConfirm(): void {
    if (!this.selectedFileSystemId) {
      return;
    }
    this.loadingPermissions = true;
    this.fileSystemPermissionsService.clearFileSystemPermissions(this.selectedFileSystemId).subscribe({
      next: (response: any) => {
        this.loadingPermissions = false;
        if (!response?.success) {
          this.handleBusinessError('clearPermission', response);
          return;
        }
        this.hideClearAllConfirm();
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.clearAllSuccess'),
        });
        this.refreshPermissions();
      },
      error: () => {
        this.loadingPermissions = false;
      },
    });
  }

  getAccessTypeLabel(accessType: number): string {
    switch (accessType) {
      case 0: return this.translate.getInstant('fileSystem.permissions.accessType.account');
      case 1: return this.translate.getInstant('fileSystem.permissions.accessType.group');
      case 2: return this.translate.getInstant('fileSystem.permissions.accessType.role');
      case 3: return this.translate.getInstant('fileSystem.permissions.accessType.entity');
      case 4: return this.translate.getInstant('fileSystem.permissions.accessType.organization');
      case 5: return this.translate.getInstant('fileSystem.permissions.accessType.all');
      case 6: return this.translate.getInstant('fileSystem.permissions.accessType.owner');
      case 7: return this.translate.getInstant('fileSystem.permissions.accessType.entityAdmin');
      default: return String(accessType);
    }
  }

  getAccessRightLabel(accessRight: number): string {
    switch (accessRight) {
      case 0: return this.translate.getInstant('fileSystem.permissions.accessRight.none');
      case 1: return this.translate.getInstant('fileSystem.permissions.accessRight.list');
      case 2: return this.translate.getInstant('fileSystem.permissions.accessRight.read');
      case 3: return this.translate.getInstant('fileSystem.permissions.accessRight.amend');
      case 4: return this.translate.getInstant('fileSystem.permissions.accessRight.modify');
      case 5: return this.translate.getInstant('fileSystem.permissions.accessRight.full');
      default: return String(accessRight);
    }
  }

  getAccessRightSeverity(accessRight: number): 'secondary' | 'info' | 'success' | 'warning' | 'danger' {
    if (accessRight <= 0) return 'secondary';
    if (accessRight === 1) return 'info';
    if (accessRight === 2) return 'success';
    if (accessRight === 3) return 'warning';
    return 'danger';
  }

  get permissionsTableValue(): FileSystemAccessPermissionRow[] {
    if (this.permissionsTableSkeletonActive) {
      return Array(this.permissionsTableRows).fill(null).map(() => ({
        accessType: 0,
        relatedIds: [],
        accessRight: 0,
        permissionId: null,
        relatedTargetDisplay: '',
        tableSearchText: '',
      }));
    }
    return this.permissions;
  }

  get effectiveAccountsTableSkeletonActive(): boolean {
    return (
      this.selectedFileSystemId != null &&
      this.loadingPermissions &&
      this.effectiveAccountRows.length === 0
    );
  }

  get effectiveAccountsTableValue(): EffectiveAccountRow[] {
    if (this.effectiveAccountsTableSkeletonActive) {
      return Array(this.effectiveAccessTableRows)
        .fill(null)
        .map(() => ({
          accountId: 0,
          accessRight: 0,
          accountLabel: '',
          tableSearchText: '',
        }));
    }
    return this.effectiveAccountRows;
  }

  formatEffectiveAccountCell(row: EffectiveAccountRow): string {
    const idPart = `#${row.accountId}`;
    if (!row.accountLabel?.trim() || row.accountLabel === idPart) {
      return idPart;
    }
    return row.accountLabel;
  }

  getRelatedTargetCellText(row: FileSystemAccessPermissionRow): string {
    if (row.relatedTargetDisplay) {
      return row.relatedTargetDisplay;
    }
    const id = Number(row.permissionId ?? row.relatedIds[0] ?? 0);
    if (id > 0) {
      return `#${id}`;
    }
    return '';
  }

  goBack(): void {
    this.router.navigate(['/entity-administration/entity-storage-management']);
  }

  onAccessTypeChange(): void {
    this.selectedRelatedTargetIds = [];
    this.relatedTargetOptions = [];
    this.relatedTargetsSearchText = '';
    this.relatedTargetsTouched = false;
    this.loadRelatedTargets();
  }

  requiresRelatedTargets(): boolean {
    return this.addAccessType != null && this.addAccessType !== 5;
  }

  get showRelatedTargetsEntityColumn(): boolean {
    return this.addAccessType !== 3 && this.addAccessType !== 4;
  }

  canSubmitAddPermission(): boolean {
    if (this.addAccessType == null || this.addAccessRight == null) {
      return false;
    }
    if (!this.requiresRelatedTargets()) {
      return true;
    }
    return this.selectedRelatedTargetIds.length > 0;
  }

  get filteredRelatedTargetOptions(): RelatedTargetOption[] {
    const text = String(this.relatedTargetsSearchText || '').trim().toLowerCase();
    if (!text) {
      return this.relatedTargetOptions;
    }
    return this.relatedTargetOptions.filter((item) =>
      item.name.toLowerCase().includes(text) ||
      item.entityLabel.toLowerCase().includes(text) ||
      String(item.id).includes(text)
    );
  }

  get selectedRelatedTargets(): RelatedTargetOption[] {
    if (this.selectedRelatedTargetIds.length === 0) {
      return [];
    }
    const selectedSet = new Set(this.selectedRelatedTargetIds);
    return this.relatedTargetOptions.filter((item) => selectedSet.has(item.id));
  }

  isRelatedTargetSelected(targetId: number): boolean {
    return this.selectedRelatedTargetIds.includes(targetId);
  }

  toggleRelatedTargetSelection(targetId: number): void {
    this.relatedTargetsTouched = true;
    if (this.isRelatedTargetSelected(targetId)) {
      this.selectedRelatedTargetIds = this.selectedRelatedTargetIds.filter((id) => id !== targetId);
      return;
    }
    this.selectedRelatedTargetIds = [...this.selectedRelatedTargetIds, targetId];
  }

  private loadRelatedTargets(): void {
    if (!this.requiresRelatedTargets()) {
      return;
    }

    if (this.addAccessType === 0) {
      this.loadAccountTargets();
      return;
    }
    if (this.addAccessType === 1) {
      this.loadGroupTargets();
      return;
    }
    if (this.addAccessType === 2) {
      this.loadRoleTargets();
      return;
    }
    if (this.addAccessType === 3) {
      this.loadEntityTargets(false);
      return;
    }
    if (this.addAccessType === 4) {
      this.loadEntityTargets(true);
    }
  }

  private clearAccessibleEntitiesCache(): void {
    this.accessibleEntitiesForTargetsCache = null;
  }

  private async getAccessibleEntitiesForTargets(): Promise<AccessibleEntityRow[]> {
    if (this.accessibleEntitiesForTargetsCache) {
      return this.accessibleEntitiesForTargetsCache;
    }
    const resolved = await this.fetchAllAccessibleEntities();
    this.accessibleEntitiesForTargetsCache = resolved;
    return resolved;
  }

  private async fetchAllAccessibleEntities(): Promise<AccessibleEntityRow[]> {
    const seen = new Set<number>();
    const out: AccessibleEntityRow[] = [];
    let page = 1;
    const pageSize = 100;
    let totalCount = 0;
    let safety = 0;
    while (safety < 50) {
      const res: any = await firstValueFrom(this.entitiesService.listEntities(-page, pageSize, ''));
      if (!res?.success) {
        break;
      }
      totalCount = Number(res.message?.Total_Count ?? 0);
      const messageData = res.message?.Entities_List ?? res.message?.Entities ?? {};
      const rawList = Array.isArray(messageData) ? messageData : Object.values(messageData);
      if (rawList.length === 0) {
        break;
      }
      for (const item of rawList) {
        const id = Number(item?.Entity_ID || 0);
        if (id <= 0 || seen.has(id)) {
          continue;
        }
        seen.add(id);
        const nameDefault = String(item?.Name || '').trim();
        const nameRegional = String(item?.Name_Regional || '').trim();
        const name = this.isRegional ? (nameRegional || nameDefault) : (nameDefault || nameRegional);
        const code = String(item?.Code || '').trim();
        const label = name && code ? `${name} (${code})` : (name || `#${id}`);
        const parentEntityId = Number(item?.Parent_Entity_ID || 0);
        out.push({ entityId: id, label, parentEntityId });
      }
      if (totalCount > 0 && out.length >= totalCount) {
        break;
      }
      if (rawList.length < pageSize) {
        break;
      }
      page++;
      safety++;
    }
    if (out.length === 0 && this.currentEntityId > 0) {
      const id = this.currentEntityId;
      const parentEntityId = Number(this.localStorageService.getParentEntityId() || 0);
      const label = this.ngxTranslate.instant('fileSystem.entityAdmin.permissionsAdmin.targetsFallbackEntityLabel', {
        id,
      });
      return [{ entityId: id, label, parentEntityId }];
    }
    return out;
  }

  private loadAccountTargets(): void {
    this.loadingRelatedTargets = true;
    void this.getAccessibleEntitiesForTargets().then(async (entities) => {
      if (entities.length === 0) {
        this.loadingRelatedTargets = false;
        this.relatedTargetOptions = [];
        return;
      }
      const merged = new Map<number, RelatedTargetOption>();
      let lastErrorResponse: any = null;
      let anySuccess = false;
      try {
        for (const { entityId, label } of entities) {
          try {
            const response: any = await firstValueFrom(
              this.entitiesService.getEntityAccountsList(
                entityId.toString(),
                true,
                true,
                0,
                100,
                ''
              )
            );
            if (!response?.success) {
              lastErrorResponse = response;
              continue;
            }
            anySuccess = true;
            const accountsData = response?.message?.Accounts || {};
            const list = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);
            for (const item of list) {
              const id = Number(item?.Account_ID || 0);
              if (id <= 0 || merged.has(id)) {
                continue;
              }
              const email = String(item?.Email || '').trim();
              const itemLabel = email || `#${id}`;
              merged.set(id, { id, name: itemLabel, entityLabel: label });
            }
          } catch {
            lastErrorResponse = {};
          }
        }
        if (!anySuccess && lastErrorResponse != null) {
          this.handleBusinessError('relatedAccounts', lastErrorResponse);
        }
        this.relatedTargetOptions = [...merged.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
      } finally {
        this.loadingRelatedTargets = false;
      }
    });
  }

  private loadGroupTargets(): void {
    this.loadingRelatedTargets = true;
    void this.getAccessibleEntitiesForTargets().then(async (entities) => {
      if (entities.length === 0) {
        this.loadingRelatedTargets = false;
        this.relatedTargetOptions = [];
        return;
      }
      const merged = new Map<number, RelatedTargetOption>();
      let lastErrorResponse: any = null;
      let anySuccess = false;
      try {
        for (const { entityId, label } of entities) {
          try {
            const response: any = await firstValueFrom(this.entityGroupsService.listEntityGroups(entityId, true));
            if (!response?.success) {
              lastErrorResponse = response;
              continue;
            }
            anySuccess = true;
            const groupsData = response?.message?.Account_Groups || response?.message || [];
            const list = Array.isArray(groupsData) ? groupsData : Object.values(groupsData);
            for (const item of list) {
              const id = Number(item?.groupID || item?.Group_ID || item?.ID || 0);
              if (id <= 0 || merged.has(id)) {
                continue;
              }
              const titleDefault = String(item?.title || item?.Title || '').trim();
              const titleRegional = String(item?.title_Regional || item?.Title_Regional || '').trim();
              const title = this.isRegional ? (titleRegional || titleDefault) : (titleDefault || titleRegional);
              const itemLabel = title || `#${id}`;
              merged.set(id, { id, name: itemLabel, entityLabel: label });
            }
          } catch {
            lastErrorResponse = {};
          }
        }
        if (!anySuccess && lastErrorResponse != null) {
          this.handleBusinessError('relatedGroups', lastErrorResponse);
        }
        this.relatedTargetOptions = [...merged.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
      } finally {
        this.loadingRelatedTargets = false;
      }
    });
  }

  private loadRoleTargets(): void {
    this.loadingRelatedTargets = true;
    void this.getAccessibleEntitiesForTargets().then(async (entities) => {
      if (entities.length === 0) {
        this.loadingRelatedTargets = false;
        this.relatedTargetOptions = [];
        return;
      }
      const merged = new Map<number, RelatedTargetOption>();
      let lastErrorResponse: any = null;
      let anySuccess = false;
      try {
        for (const { entityId, label } of entities) {
          try {
            const response: any = await firstValueFrom(this.rolesService.listEntityRoles(entityId, 0, 100));
            if (!response?.success) {
              lastErrorResponse = response;
              continue;
            }
            anySuccess = true;
            const rolesData = response?.message?.Entity_Roles || {};
            const list = Array.isArray(rolesData) ? rolesData : Object.values(rolesData);
            for (const item of list) {
              const id = Number(item?.Entity_Role_ID || item?.entity_Role_ID || 0);
              if (id <= 0 || merged.has(id)) {
                continue;
              }
              const titleDefault = String(item?.Title || '').trim();
              const titleRegional = String(item?.Title_Regional || '').trim();
              const title = this.isRegional ? (titleRegional || titleDefault) : (titleDefault || titleRegional);
              const itemLabel = title || `#${id}`;
              merged.set(id, { id, name: itemLabel, entityLabel: label });
            }
          } catch {
            lastErrorResponse = {};
          }
        }
        if (!anySuccess && lastErrorResponse != null) {
          this.handleBusinessError('relatedRoles', lastErrorResponse);
        }
        this.relatedTargetOptions = [...merged.values()].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
      } finally {
        this.loadingRelatedTargets = false;
      }
    });
  }

  private rebuildEffectiveAccountRows(map: AccountsAccessRightsMap | null): void {
    this.effectiveAccountRows = Object.entries(map ?? {})
      .map(([k, v]) => {
        const accountId = Number(k);
        const accessRight = Number(v);
        const accountLabel = `#${accountId}`;
        return {
          accountId,
          accessRight,
          accountLabel,
          tableSearchText: `${accountId} ${accountLabel} ${this.getAccessRightLabel(accessRight)}`.trim(),
        };
      })
      .sort((a, b) => a.accountId - b.accountId);
  }

  private async resolveEffectiveAccountLabels(): Promise<void> {
    if (this.effectiveAccountRows.length === 0) {
      return;
    }
    const ids = new Set(this.effectiveAccountRows.map((r) => r.accountId));
    const emails = await this.loadAccountEmailMap(ids);
    this.effectiveAccountRows = this.effectiveAccountRows.map((r) => {
      const accountLabel = emails.get(r.accountId) ?? r.accountLabel;
      return {
        ...r,
        accountLabel,
        tableSearchText: `${r.accountId} ${accountLabel} ${this.getAccessRightLabel(r.accessRight)}`,
      };
    });
  }

  // #region Related target display (list API)
  private async resolveRelatedTargetDisplays(): Promise<void> {
    if (!this.permissions.length) {
      return;
    }
    this.permissions = this.permissions.map((r) =>
      r.accessType === 5
        ? { ...r, relatedTargetDisplay: this.translate.getInstant('fileSystem.permissions.accessType.all') }
        : { ...r }
    );
    this.loadingPermissionTargets = true;
    try {
      const accountIds = new Set<number>();
      this.permissions.forEach((r) => {
        if (r.accessType === 0) {
          const id = Number(r.permissionId ?? r.relatedIds[0] ?? 0);
          if (id > 0) {
            accountIds.add(id);
          }
        }
      });
      const accountMap = await this.loadAccountEmailMap(accountIds);

      const groupIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 1)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const groupMap = new Map<number, string>();
      await Promise.all(
        groupIds.map(async (id) => {
          groupMap.set(id, await this.fetchGroupDisplayName(id));
        })
      );

      const roleIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 2)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const roleMap = new Map<number, string>();
      await Promise.all(
        roleIds.map(async (id) => {
          roleMap.set(id, await this.fetchRoleDisplayName(id));
        })
      );

      const entityIds = [
        ...new Set(
          this.permissions
            .filter((r) => r.accessType === 3 || r.accessType === 4)
            .map((r) => Number(r.permissionId ?? r.relatedIds[0] ?? 0))
            .filter((id) => id > 0)
        ),
      ];
      const entityMap = new Map<number, string>();
      await Promise.all(
        entityIds.map(async (id) => {
          entityMap.set(id, await this.fetchEntityDisplayName(id));
        })
      );

      this.permissions = this.permissions.map((row) => {
        if (row.accessType === 5) {
          return row;
        }
        const id = Number(row.permissionId ?? row.relatedIds[0] ?? 0);
        let relatedTargetDisplay = row.relatedTargetDisplay ?? '';
        switch (row.accessType) {
          case 0:
            relatedTargetDisplay = id > 0 ? (accountMap.get(id) ?? `#${id}`) : '';
            break;
          case 1:
            relatedTargetDisplay = id > 0 ? (groupMap.get(id) ?? `#${id}`) : '';
            break;
          case 2:
            relatedTargetDisplay = id > 0 ? (roleMap.get(id) ?? `#${id}`) : '';
            break;
          case 3:
          case 4:
            relatedTargetDisplay = id > 0 ? (entityMap.get(id) ?? `#${id}`) : '';
            break;
          case 6:
          case 7:
            relatedTargetDisplay =
              id > 0
                ? `${this.getAccessTypeLabel(row.accessType)} (#${id})`
                : this.getAccessTypeLabel(row.accessType);
            break;
          default:
            relatedTargetDisplay = id > 0 ? `#${id}` : '';
        }
        return { ...row, relatedTargetDisplay };
      });
    } finally {
      this.loadingPermissionTargets = false;
      this.refreshPermissionTableSearchText();
    }
  }

  private refreshPermissionTableSearchText(): void {
    this.permissions = this.permissions.map((row) => {
      const typeLabel = this.getAccessTypeLabel(row.accessType);
      const rightLabel = this.getAccessRightLabel(row.accessRight);
      const related = row.relatedTargetDisplay ?? this.getRelatedTargetCellText(row);
      const ids = (row.relatedIds || []).join(' ');
      const tableSearchText = [typeLabel, rightLabel, related, ids, String(row.permissionId ?? '')]
        .join(' ')
        .trim();
      return { ...row, tableSearchText };
    });
  }

  private async loadAccountEmailMap(neededIds: Set<number>): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (neededIds.size === 0) {
      return map;
    }
    const entities = await this.getAccessibleEntitiesForTargets();
    if (entities.length === 0) {
      return map;
    }
    for (const { entityId } of entities) {
      if ([...neededIds].every((id) => map.has(id))) {
        break;
      }
      let page = 1;
      const pageSize = 100;
      let safety = 0;
      while (safety < 80 && [...neededIds].some((id) => !map.has(id))) {
        const lastAccountId = -page;
        try {
          const res = await firstValueFrom(
            this.entitiesService.getEntityAccountsList(
              entityId.toString(),
              true,
              false,
              lastAccountId,
              pageSize,
              ''
            )
          );
          if (!res?.success) {
            break;
          }
          const accountsData = res.message?.Accounts ?? {};
          const list = Array.isArray(accountsData) ? accountsData : Object.values(accountsData);
          if (list.length === 0) {
            break;
          }
          list.forEach((a: any) => {
            const id = Number(a.Account_ID);
            const email = String(a.Email ?? '').trim();
            if (neededIds.has(id) && email) {
              map.set(id, email);
            }
          });
          page++;
          safety++;
          if (list.length < pageSize) {
            break;
          }
        } catch {
          break;
        }
      }
    }
    return map;
  }

  private async fetchGroupDisplayName(groupId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.entityGroupsService.getEntityGroup(groupId));
      if (!res?.success) {
        return `#${groupId}`;
      }
      const m = res.message || {};
      const titleDefault = String(m.Title || m.title || '').trim();
      const titleRegional = String(m.Title_Regional || m.title_Regional || '').trim();
      const name = this.isRegional ? titleRegional || titleDefault : titleDefault || titleRegional;
      return name || `#${groupId}`;
    } catch {
      return `#${groupId}`;
    }
  }

  private async fetchRoleDisplayName(roleId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.rolesService.getEntityRoleDetails(roleId));
      if (!res?.success) {
        return `#${roleId}`;
      }
      const role = res.message || {};
      const titleDefault = String(role.Title || '').trim();
      const titleRegional = String(role.Title_Regional || '').trim();
      const name = this.isRegional ? titleRegional || titleDefault : titleDefault || titleRegional;
      return name || `#${roleId}`;
    } catch {
      return `#${roleId}`;
    }
  }

  private async fetchEntityDisplayName(entityId: number): Promise<string> {
    try {
      const res = await firstValueFrom(this.entitiesService.getEntityDetails(String(entityId)));
      if (!res?.success) {
        return `#${entityId}`;
      }
      const e = res.message || {};
      const nameDefault = String(e.Name || e.name || '').trim();
      const nameRegional = String(e.Name_Regional || e.name_Regional || '').trim();
      const name = this.isRegional ? nameRegional || nameDefault : nameDefault || nameRegional;
      const code = String(e.Code || e.code || '').trim();
      if (name && code) {
        return `${name} (${code})`;
      }
      return name || `#${entityId}`;
    } catch {
      return `#${entityId}`;
    }
  }

  // #endregion

  private loadEntityTargets(rootsOnly: boolean): void {
    this.loadingRelatedTargets = true;
    void this.getAccessibleEntitiesForTargets()
      .then((entities) => {
        const filtered = rootsOnly ? entities.filter((e) => e.parentEntityId <= 0) : entities;
        this.relatedTargetOptions = filtered
          .map((e) => ({ id: e.entityId, name: e.label, entityLabel: '' }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      })
      .catch(() => {
        this.relatedTargetOptions = [];
      })
      .finally(() => {
        this.loadingRelatedTargets = false;
      });
  }

  // #region Business errors
  private getPermissionsAdminBusinessErrorCode(response: any): string {
    let code = (response?.errorCode ?? response?.message?.code ?? response?.code ?? '').toString();
    if (!code && typeof response?.message === 'string' && /^(ERP|FWA)\d+$/.test(response.message)) {
      code = response.message;
    }
    return code;
  }

  private handleBusinessError(
    context:
      | 'listPermissions'
      | 'addPermission'
      | 'removePermission'
      | 'clearPermission'
      | 'relatedAccounts'
      | 'relatedGroups'
      | 'relatedRoles'
      | 'relatedEntities',
    response: any
  ): void {
    const code = this.getPermissionsAdminBusinessErrorCode(response);
    let detail = '';

    switch (context) {
      case 'listPermissions':
      case 'addPermission':
      case 'removePermission':
      case 'clearPermission':
        detail = this.getPermissionsAdminFileSystemApiErrorMessage(code) || '';
        break;
      case 'relatedAccounts':
      case 'relatedGroups':
      case 'relatedRoles':
      case 'relatedEntities':
        detail = this.getRelatedTargetsLoadErrorMessage(code) || '';
        break;
      default:
        detail = '';
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getPermissionsAdminFileSystemApiErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'ERP12001':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpPermanent');
      case 'ERP12002':
        return this.translate.getInstant('fileSystem.admin.errorBlockedIpTemporary');
      case 'ERP12005':
        return this.translate.getInstant('fileSystem.admin.errorMissingStorageToken');
      case 'ERP12006':
        return this.translate.getInstant('fileSystem.admin.errorInvalidStorageToken');
      case 'ERP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      case 'ERP12008':
        return this.translate.getInstant('fileSystem.admin.errorInvalidRequestRouting');
      case 'ERP12009':
        return this.translate.getInstant('fileSystem.admin.errorRequestUnderDevelopment');
      case 'ERP12010':
        return this.translate.getInstant('fileSystem.admin.errorResponseManagement');
      case 'ERP12011':
        return this.translate.getInstant('fileSystem.admin.errorApiCallExecution');
      case 'ERP12012':
        return this.translate.getInstant('fileSystem.admin.errorFileServerDatabase');
      case 'ERP12240':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileId');
      case 'ERP12248':
        return this.translate.getInstant('fileSystem.admin.errorInvalidEntityFilter');
      case 'ERP12250':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFolderId');
      case 'ERP12260':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemId');
      case 'ERP12263':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocationType');
      case 'ERP12270':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemAccessToken');
      case 'ERP12280':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileAllocation');
      case 'ERP12290':
        return this.translate.getInstant('fileSystem.admin.errorInvalidDriveId');
      case 'ERP12291':
        return this.translate.getInstant('fileSystem.admin.errorDriveInactive');
      case 'ERP12292':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedDriveOwner');
      case 'ERP12293':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessType');
      case 'ERP12294':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccessRight');
      case 'ERP12295':
        return this.translate.getInstant('fileSystem.admin.errorNotEnoughFileSystemAccessRight');
      case 'ERP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'ERP12297':
        return this.translate.getInstant('fileSystem.admin.errorOwnerOrFullRequired');
      case 'ERP12298':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnReferenceAllocation');
      case 'ERP12299':
        return this.translate.getInstant('fileSystem.admin.errorActionNotAllowedOnCopyAllocation');
      case 'ERP12251':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'ERP12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'ERP12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      case 'ERP12267':
        return this.translate.getInstant('fileSystem.folderManagement.errorInvalidRestoreSelection');
      case 'FWA12251':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'FWA12252':
        return this.translate.getInstant('fileSystem.admin.errorInvalidFileSystemName');
      case 'FWA12255':
        return this.translate.getInstant('fileSystem.admin.errorFileSystemInUse');
      default:
        return null;
    }
  }

  private getRelatedTargetsLoadErrorMessage(code: string): string | null {
    const fromFs = this.getPermissionsAdminFileSystemApiErrorMessage(code);
    if (fromFs) {
      return fromFs;
    }
    switch (code) {
      case 'ERP11255':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11255');
      case 'ERP11260':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11260');
      case 'ERP11261':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11261');
      case 'ERP11262':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11262');
      case 'ERP11263':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11263');
      case 'ERP11270':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11270');
      case 'ERP11287':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11287');
      case 'ERP11288':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11288');
      case 'ERP11290':
        return this.translate.getInstant('fileSystem.entityAdmin.permissionsAdmin.relatedTargetsErrors.erp11290');
      default:
        return null;
    }
  }
  // #endregion
}

