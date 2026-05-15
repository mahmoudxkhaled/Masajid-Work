import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem, MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesService } from 'src/app/modules/system-administration/system-storage-management/services/virtual-drives.service';
import { FileSystemsService } from '../services/file-systems.service';
import { VirtualDrivesFilters } from 'src/app/modules/system-administration/system-storage-management/models/virtual-drive.model';
import { FileSystemListItem, FileSystemOwnerContext } from '../models/file-system.model';
import { FileSystemPermissionsService } from '../services/file-system-permissions.service';


@Component({
  selector: 'app-file-systems-section',
  templateUrl: './file-systems-section.component.html',
  styleUrls: ['./file-systems-section.component.scss']
})
export class FileSystemsSectionComponent implements OnInit {

  @Output() fileSystemsCountChange = new EventEmitter<number>();

  readonly fileSystemsTableRows = 10;
  readonly fileSystemsRowsPerPageOptions = [5, 10, 25, 50];

  fileSystems: FileSystemListItem[] = [];
  loadingFileSystems = false;

  permissionCounts: Record<number, number> = {};
  effectiveAccountCounts: Record<number, number> = {};
  loadingPermissionCounts = false;
  driveOptions: { id: number; name: string }[] = [];

  entityFilterFileSystems = 0;

  entityFilterOptions: { label: string; value: number }[] = [];

  driveFilterId = 0;

  activeOnlyFilter = false;

  fileSystemTypes: { id: number; name: string; description: string }[] = [];
  loadingTypes = false;
  creatingFileSystem = false;
  savingFileSystem = false;
  deletingFileSystem = false;
  detailsLoading = false;
  restoringRecycleBin = false;
  clearingRecycleBin = false;

  createDialogVisible = false;
  editDialogVisible = false;
  detailsDialogVisible = false;
  deleteConfirmVisible = false;

  newFileSystemName = '';

  newFileSystemScope: 'personal' | 'entity' = 'entity';
  newFileSystemTypeId: number | null = null;
  newFileSystemDriveId: number | null = null;
  selectedForEdit: FileSystemListItem | null = null;
  editFileSystemName = '';
  editFileSystemTypeId: number | null = null;
  selectedForDetails: FileSystemListItem | null = null;
  detailsData: { name: string; typeName: string; scopeKey: string; driveName: string; active: boolean; createdAt: string } | null = null;
  selectedForDelete: FileSystemListItem | null = null;
  deleteAllContents = false;

  fileSystemMenuItems: MenuItem[] = [];
  activeRowMenu?: { hide: () => void };
  selectedFileSystemForMenu: FileSystemListItem | null = null;
  restoringDeletedFileSystem = false;

  clearRecycleBinConfirmVisible = false;
  restoreRecycleBinConfirmVisible = false;
  restoreDeletedConfirmVisible = false;

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private localStorage: LocalStorageService,
    private virtualDrivesService: VirtualDrivesService,
    private fileSystemsService: FileSystemsService,
    private router: Router,
    private fileSystemPermissionsService: FileSystemPermissionsService
  ) { }

  get fileSystemsTableValue(): FileSystemListItem[] {
    if (this.loadingFileSystems && this.fileSystems.length === 0) {
      return Array(this.fileSystemsTableRows).fill(null).map(() => ({
        file_System_ID: 0,
        name: '',
        type: 0,
        guid: '',
        owner_ID: 0,
        is_Entity_FS: false,
        drive_ID: 0,
        created_At: '',
        created_By: 0,
        deleted_At: '',
        delete_Account_ID: 0
      }));
    }
    return this.fileSystems;
  }

  ngOnInit(): void {
    this.loadingFileSystems = true;
    this.buildEntityFilterOptions();
    this.loadDrives();
    this.loadTypes();
  }

  private buildEntityFilterOptions(): void {
    this.entityFilterOptions = [
      { label: this.translate.getInstant('fileSystem.admin.filterAccount'), value: -1 },
      { label: this.translate.getInstant('fileSystem.admin.filterEntity'), value: 1 },
      { label: this.translate.getInstant('fileSystem.admin.filterBoth'), value: 0 }
    ];
  }

  loadDrives(): void {
    const filters: VirtualDrivesFilters = {
      entityFilter: 0,
      licenseId: 0,
      activeOnly: false
    };
    this.virtualDrivesService.listDrives(filters).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('loadDrives', response);
          this.listFileSystems();
          return;
        }
        const list = response.message ?? [];
        this.driveOptions = list.map((item: any) => ({
          id: Number(item.drive_ID),
          name: item.name
        }));

        if (this.driveOptions.length > 0) {
          this.driveFilterId = this.driveOptions[0].id;
        }
        this.listFileSystems();
      },
      error: () => {
        this.listFileSystems();
      }
    });
  }

  listFileSystems(): void {
    this.loadingFileSystems = true;
    this.fileSystemsService.listFileSystems({
      entityFilter: this.entityFilterFileSystems,
      driveId: this.driveFilterId,
      activeOnly: this.activeOnlyFilter
    }).subscribe({
      next: (response: any) => {
        this.loadingFileSystems = false;
        if (!response?.success) {
          this.handleBusinessError('list', response);
          return;
        }
        const list = response.message ?? [];
        const sorted = (list || []).slice().sort((a: any, b: any) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
        this.fileSystems = sorted.map((item: any) => this.mapItemToRow(item));
        this.fileSystemsCountChange.emit(this.fileSystems.length);
        this.loadPermissionCountsForList();
      },
      error: () => this.loadingFileSystems = false
    });
  }

  getPermissionCount(row: FileSystemListItem): number {
    return this.permissionCounts[row.file_System_ID] ?? 0;
  }

  getEffectiveAccountsCount(row: FileSystemListItem): number {
    return this.effectiveAccountCounts[row.file_System_ID] ?? 0;
  }

  private loadPermissionCountsForList(): void {
    const activeIds = this.fileSystems
      .filter((fs) => this.isFileSystemActive(fs))
      .map((fs) => fs.file_System_ID);
    this.permissionCounts = {};
    this.effectiveAccountCounts = {};
    if (activeIds.length === 0) {
      this.loadingPermissionCounts = false;
      return;
    }
    this.loadingPermissionCounts = true;
    void this.fetchPermissionCountsForIds(activeIds).then(({ ruleCounts, effectiveAccountCounts }) => {
      this.permissionCounts = ruleCounts;
      this.effectiveAccountCounts = effectiveAccountCounts;
      this.loadingPermissionCounts = false;
    });
  }

  private async fetchPermissionCountsForIds(ids: number[]): Promise<{
    ruleCounts: Record<number, number>;
    effectiveAccountCounts: Record<number, number>;
  }> {
    const ruleCounts: Record<number, number> = {};
    const effectiveAccountCounts: Record<number, number> = {};
    await Promise.all(
      ids.map(async (id) => {
        let rules = 0;
        let accounts = 0;
        try {
          const response: any = await firstValueFrom(
            this.fileSystemPermissionsService.listFileSystemPermissions(id)
          );
          if (response?.success) {
            const mapped = this.fileSystemPermissionsService.mapPermissionsResponse(response);
            rules = mapped.permissions.length;
            const acc = mapped.accountsAccessRights;
            accounts =
              acc && typeof acc === 'object' && !Array.isArray(acc) ? Object.keys(acc).length : 0;
          }
        } catch {
          rules = 0;
          accounts = 0;
        }
        ruleCounts[id] = rules;
        effectiveAccountCounts[id] = accounts;
      })
    );
    return { ruleCounts, effectiveAccountCounts };
  }
  // #endregion

  loadTypes(): void {
    if (this.fileSystemTypes.length > 0) return;
    this.loadingTypes = true;
    this.fileSystemsService.listFileSystemTypes().subscribe({
      next: (response: any) => {
        this.loadingTypes = false;
        if (!response?.success) {
          this.handleBusinessError('loadTypes', response);
          return;
        }
        const list = response.message ?? [];
        this.fileSystemTypes = list.map((item: any) => {
          const id = Number(item?.['FS Type ID'] ?? 0);
          const name = String(item?.Title ?? '');
          const description = String(item?.Description ?? '');
          return { id, name, description };
        }).filter((t: { id: number; name: string; description: string }) => t.name !== '');
      },
      error: () => this.loadingTypes = false
    });
  }

  private mapItemToRow(item: any): FileSystemListItem {
    return {
      file_System_ID: Number(item?.file_System_ID ?? 0),
      name: String(item?.name ?? ''),
      type: Number(item?.type ?? 0),
      guid: String(item?.guid ?? ''),
      owner_ID: Number(item?.owner_ID ?? 0),
      is_Entity_FS: Boolean(item?.is_Entity_FS),
      drive_ID: Number(item?.drive_ID ?? 0),
      created_At: String(item?.created_At ?? ''),
      created_By: Number(item?.created_By ?? 0),
      deleted_At: String(item?.deleted_At ?? ''),
      delete_Account_ID: Number(item?.delete_Account_ID ?? 0)
    };
  }



  getFileSystemName(row: FileSystemListItem): string {
    return row?.name ?? '—';
  }

  getDriveName(row: FileSystemListItem): string {
    const drive = this.driveOptions.find((d) => d.id === (row?.drive_ID ?? 0));
    return drive?.name ?? '—';
  }

  getStatusLabel(row: FileSystemListItem): string {
    const deletedAt = row?.deleted_At ?? '';
    const isDeleted = typeof deletedAt === 'string' && deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
    return !isDeleted ? this.translate.getInstant('fileSystem.entityAdminStatus.active') : this.translate.getInstant('fileSystem.admin.inactive');
  }

  isFileSystemActive(row: FileSystemListItem): boolean {
    const deletedAt = row?.deleted_At ?? '';
    const isDeleted = typeof deletedAt === 'string' && deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
    return !isDeleted;
  }

  openFileSystemPermissionsAdmin(row: FileSystemListItem, options?: { scrollToEffectiveAccess?: boolean }): void {
    const id = Number(row?.file_System_ID ?? 0);
    if (id <= 0 || !this.isFileSystemActive(row)) {
      return;
    }
    const fileSystemName = String(row?.name ?? '').trim();
    const queryParams: Record<string, string | number> = { fileSystemId: id, fileSystemName };
    if (options?.scrollToEffectiveAccess) {
      queryParams['scrollTo'] = 'effective';
    }
    void this.router.navigate(
      ['/entity-administration/entity-storage-management/file-systems/permissions'],
      { queryParams }
    );
  }

  buildFileSystemMenuItems(): void {
    const row = this.selectedFileSystemForMenu;
    const isDeleted = row && !this.isFileSystemActive(row);

    if (isDeleted) {
      this.fileSystemMenuItems = [
        {
          label: this.translate.getInstant('fileSystem.entityAdmin.restoreFileSystem'),
          icon: 'pi pi-replay',
          command: () => this.showRestoreDeletedConfirm()
        }
      ];
      return;
    }

    this.fileSystemMenuItems = [
      {
        label: this.translate.getInstant('fileSystem.admin.viewDetails'),
        icon: 'pi pi-eye',
        command: () => { if (row) this.showDetailsDialog(row); }
      },
      {
        label: this.translate.getInstant('fileSystem.entityAdmin.managePermissions'),
        icon: 'pi pi-shield',
        command: () => { if (row) this.openFileSystemPermissionsAdmin(row); }
      },
      {
        label: this.translate.getInstant('fileSystem.entityAdmin.editFileSystem'),
        icon: 'pi pi-pencil',
        command: () => { if (row) this.showEditDialog(row); }
      },
      {
        label: this.translate.getInstant('fileSystem.entityAdmin.deleteFileSystem'),
        icon: 'pi pi-trash',
        command: () => { if (row) this.showDeleteConfirm(row); }
      },
      { separator: true },
      {
        label: this.translate.getInstant('fileSystem.companyStorage.restoreRecycleBinContents'),
        icon: 'pi pi-replay',
        command: () => this.showRestoreRecycleBinConfirm()
      },
      {
        label: this.translate.getInstant('fileSystem.companyStorage.clearRecycleBin'),
        icon: 'pi pi-trash',
        command: () => this.showClearRecycleBinConfirm()
      }
    ];
  }

  openFileSystemMenu(menu: { toggle: (e: Event) => void; hide: () => void }, row: FileSystemListItem, event: Event): void {
    if (this.activeRowMenu && this.activeRowMenu !== menu) {
      this.activeRowMenu.hide();
    }

    this.activeRowMenu = menu;
    this.selectedFileSystemForMenu = row;
    this.buildFileSystemMenuItems();
    menu.toggle(event);
  }

  onRowMenuHide(menu: { hide: () => void }): void {
    if (this.activeRowMenu === menu) {
      this.activeRowMenu = undefined;
    }
  }

  showRestoreDeletedConfirm(): void {
    this.restoreDeletedConfirmVisible = true;
  }

  hideRestoreDeletedConfirm(): void {
    this.restoreDeletedConfirmVisible = false;
  }

  showRestoreRecycleBinConfirm(): void {
    this.restoreRecycleBinConfirmVisible = true;
  }

  hideRestoreRecycleBinConfirm(): void {
    this.restoreRecycleBinConfirmVisible = false;
  }

  showClearRecycleBinConfirm(): void {
    this.clearRecycleBinConfirmVisible = true;
  }

  hideClearRecycleBinConfirm(): void {
    this.clearRecycleBinConfirmVisible = false;
  }

  onRestoreDeletedFileSystem(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.restoringDeletedFileSystem = true;
    this.fileSystemsService.restoreDeletedFileSystem(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.restoringDeletedFileSystem = false;
        if (!response?.success) {
          this.handleBusinessError('restoreDeleted', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.restoreFileSystemSuccess')
        });
        this.hideRestoreDeletedConfirm();
        this.listFileSystems();
      },
      error: () => this.restoringDeletedFileSystem = false
    });
  }

  onRestoreRecycleBinFromMenu(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.restoringRecycleBin = true;
    this.fileSystemsService.restoreFileSystemRecycleBinContents(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.restoringRecycleBin = false;
        if (!response?.success) {
          this.handleBusinessError('restoreRecycleBin', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.companyStorage.restoreSuccess')
        });
        this.hideRestoreRecycleBinConfirm();
        this.listFileSystems();
      },
      error: () => this.restoringRecycleBin = false
    });
  }

  onClearRecycleBinFromMenu(): void {
    const row = this.selectedFileSystemForMenu;
    if (!row) return;
    this.clearingRecycleBin = true;
    this.fileSystemsService.clearFileSystemRecycleBin(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.clearingRecycleBin = false;
        if (!response?.success) {
          this.handleBusinessError('clearRecycleBin', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.companyStorage.recycleBinCleared')
        });
        this.hideClearRecycleBinConfirm();
        this.listFileSystems();
      },
      error: () => this.clearingRecycleBin = false
    });
  }

  showCreateDialog(): void {
    this.newFileSystemName = '';
    this.newFileSystemTypeId = null;
    this.newFileSystemDriveId = this.driveOptions.length > 0 ? this.driveOptions[0].id : null;
    this.newFileSystemScope = 'entity';
    this.loadTypes();
    this.createDialogVisible = true;
  }

  hideCreateDialog(): void {
    this.createDialogVisible = false;
  }

  resolveOwner(): FileSystemOwnerContext {
    const account = this.localStorage.getAccountDetails();
    const entity = this.localStorage.getEntityDetails();
    let accountId = account?.Account_ID ?? 0;
    let entityId = entity?.Entity_ID ?? account?.Entity_ID ?? 0;
    if (accountId === 0 && entityId === 0) {
      accountId = 1;
      entityId = 1;
    }
    if (this.newFileSystemScope === 'entity') {
      return { ownerId: entityId, isEntityId: true };
    }
    return { ownerId: accountId, isEntityId: false };
  }

  onCreateConfirm(): void {
    if (!this.newFileSystemName.trim()) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemNameRequired') });
      return;
    }
    const driveId = this.newFileSystemDriveId;
    if (this.newFileSystemTypeId == null || driveId == null) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemTypeRequired') });
      return;
    }
    const { ownerId, isEntityId } = this.resolveOwner();
    this.creatingFileSystem = true;
    this.fileSystemsService.createFileSystem(
      this.newFileSystemName.trim(),
      this.newFileSystemTypeId,
      ownerId,
      isEntityId,
      driveId
    ).subscribe({
      next: (response: any) => {
        this.creatingFileSystem = false;
        if (!response?.success) {
          this.handleBusinessError('create', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.admin.createFileSystemSuccess')
        });
        this.hideCreateDialog();
        this.listFileSystems();
      },
      error: () => this.creatingFileSystem = false
    });
  }

  showEditDialog(row: FileSystemListItem): void {
    this.selectedForEdit = row;
    this.editFileSystemName = row.name;
    this.editFileSystemTypeId = row.type ?? null;
    if (this.fileSystemTypes.length === 0) this.loadTypes();
    this.editDialogVisible = true;
  }

  hideEditDialog(): void {
    this.editDialogVisible = false;
    this.selectedForEdit = null;
  }

  onEditSave(): void {
    if (!this.selectedForEdit) return;
    if (!this.editFileSystemName.trim()) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemNameRequired') });
      return;
    }
    const typeId = this.editFileSystemTypeId ?? this.selectedForEdit.type;
    if (typeId === null || typeId === undefined) {
      this.messageService.add({ severity: 'warn', summary: this.translate.getInstant('fileSystem.admin.validation'), detail: this.translate.getInstant('fileSystem.admin.fileSystemTypeRequired') });
      return;
    }
    this.savingFileSystem = true;
    this.fileSystemsService.updateFileSystemDetails(this.selectedForEdit.file_System_ID, this.editFileSystemName.trim(), typeId).subscribe({
      next: (response: any) => {
        this.savingFileSystem = false;
        if (!response?.success) {
          this.handleBusinessError('update', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.admin.updateFileSystemSuccess')
        });
        this.hideEditDialog();
        this.listFileSystems();
      },
      error: () => this.savingFileSystem = false
    });
  }

  showDetailsDialog(row: FileSystemListItem): void {
    this.selectedForDetails = row;
    this.detailsData = null;
    this.detailsDialogVisible = true;
    this.detailsLoading = true;
    this.fileSystemsService.getFileSystemDetails(row.file_System_ID).subscribe({
      next: (response: any) => {
        this.detailsLoading = false;
        if (!response?.success) {
          this.handleBusinessError('details', response);
          return;
        }
        const d = response.message;
        const name = d.name;
        const typeId = d.type;
        const typeName = this.fileSystemTypes.find(t => t.id === typeId)?.name ?? '—';
        const scopeKey = d.is_Entity_FS ? 'fileSystem.admin.scopeEntity' : 'fileSystem.admin.scopePersonal';
        const driveId = d.drive_ID;
        const drive = this.driveOptions.find(drv => drv.id === driveId);
        const driveName = drive?.name ?? '—';
        const deletedAt = d.deleted_At;
        const isDeleted = deletedAt !== '' && !deletedAt.startsWith('0001-01-01');
        const active = !isDeleted;
        const createdAt = d.created_At;
        this.detailsData = { name, typeName, scopeKey, driveName, active, createdAt };
      },
      error: () => this.detailsLoading = false
    });
  }

  hideDetailsDialog(): void {
    this.detailsDialogVisible = false;
    this.selectedForDetails = null;
    this.detailsData = null;
  }

  showDeleteConfirm(row: FileSystemListItem): void {
    this.selectedForDelete = row;
    this.deleteConfirmVisible = true;
  }

  hideDeleteConfirm(): void {
    this.deleteConfirmVisible = false;
    this.selectedForDelete = null;
    this.deleteAllContents = false;
  }

  onDeleteConfirm(): void {
    if (!this.selectedForDelete) return;
    this.deletingFileSystem = true;
    this.fileSystemsService.deleteFileSystem(this.selectedForDelete.file_System_ID, this.deleteAllContents).subscribe({
      next: (response: any) => {
        this.deletingFileSystem = false;
        if (!response?.success) {
          this.handleBusinessError('delete', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('fileSystem.entityAdmin.deleteFileSystemSuccess')
        });
        this.hideDeleteConfirm();
        this.listFileSystems();
      },
      error: () => this.deletingFileSystem = false
    });
  }

  private getFileSystemsBusinessErrorCode(response: any): string {
    let code = (response?.errorCode ?? response?.message?.code ?? response?.code ?? '').toString();
    if (!code && typeof response?.message === 'string' && /^(ERP|FWA)\d+$/.test(response.message)) {
      code = response.message;
    }
    return code;
  }

  private handleBusinessError(
    context:
      | 'loadDrives'
      | 'list'
      | 'loadTypes'
      | 'create'
      | 'update'
      | 'details'
      | 'delete'
      | 'restoreDeleted'
      | 'restoreRecycleBin'
      | 'clearRecycleBin',
    response: any
  ): void {
    const code = this.getFileSystemsBusinessErrorCode(response);
    let detail = '';

    switch (context) {
      case 'loadDrives':
        detail = this.getLoadDrivesErrorMessage(code) || '';
        break;
      case 'list':
        detail = this.getListFileSystemsErrorMessage(code) || '';
        break;
      case 'loadTypes':
        detail = this.getLoadTypesErrorMessage(code) || '';
        break;
      case 'create':
        detail = this.getCreateFileSystemErrorMessage(code) || '';
        break;
      case 'update':
        detail = this.getUpdateFileSystemErrorMessage(code) || '';
        break;
      case 'details':
        detail = this.getFileSystemDetailsErrorMessage(code) || '';
        break;
      case 'delete':
        detail = this.getDeleteFileSystemErrorMessage(code) || '';
        break;
      case 'restoreDeleted':
        detail = this.getRestoreDeletedFileSystemErrorMessage(code) || '';
        break;
      case 'restoreRecycleBin':
        detail = this.getRestoreRecycleBinErrorMessage(code) || '';
        break;
      case 'clearRecycleBin':
        detail = this.getClearRecycleBinErrorMessage(code) || '';
        break;
      default:
        detail = '';
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail
      });
    }

    if (context === 'list') {
      this.loadingFileSystems = false;
    }
  }

  private getLoadDrivesErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP12000':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorAccessDenied');
      case 'ERP12005':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorMissingToken');
      case 'ERP12006':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorInvalidToken');
      case 'ERP12012':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorDatabase');
      case 'ERP12248':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorInvalidEntityFilter');
      case 'ERP12290':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorInvalidDriveId');
      case 'ERP12292':
        return this.translate.getInstant('fileSystem.admin.virtualDrivesListErrorAccessDeniedOwner');
      default:
        return null;
    }
  }

  private getListFileSystemsErrorMessage(code: string): string | null {
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

  private getLoadTypesErrorMessage(code: string): string | null {
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

  private getCreateFileSystemErrorMessage(code: string): string | null {
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

  private getUpdateFileSystemErrorMessage(code: string): string | null {
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

  private getFileSystemDetailsErrorMessage(code: string): string | null {
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

  private getDeleteFileSystemErrorMessage(code: string): string | null {
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

  private getRestoreDeletedFileSystemErrorMessage(code: string): string | null {
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

  private getRestoreRecycleBinErrorMessage(code: string): string | null {
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

  private getClearRecycleBinErrorMessage(code: string): string | null {
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

}
