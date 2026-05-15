import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { VirtualDrivesService } from '../services/virtual-drives.service';
import { VirtualDriveRow, VirtualDrivesFilters } from '../models/virtual-drive.model';




@Component({
    selector: 'app-virtual-drives-section',
    templateUrl: './virtual-drives-section.component.html',
    styleUrls: ['./virtual-drives-section.component.scss']
})
export class VirtualDrivesSectionComponent implements OnInit {

    @Output() virtualDrivesCountChange = new EventEmitter<number>();

    readonly virtualDrivesTableRows = 10;
    readonly virtualDrivesRowsPerPageOptions = [5, 10, 25, 50];

    isLoading$: Observable<boolean>;
    tableLoadingSpinner = false;

    entityFilterOptions = [
        { label: 'Account', value: -1 },
        { label: 'Entity', value: 1 },
        { label: 'Both', value: 0 }
    ];

    entityFilter = 0;

    driveTypeFilterOptions = [
        { label: 'fileSystem.admin.filterAll', value: null as boolean | null },
        { label: 'fileSystem.admin.driveTypeEntity', value: true },
        { label: 'fileSystem.admin.driveTypeAccount', value: false }
    ];

    statusFilterOptions = [
        { label: 'fileSystem.admin.filterAll', value: null as boolean | null },
        { label: 'fileSystem.entityAdminStatus.active', value: true },
        { label: 'fileSystem.admin.inactive', value: false }
    ];

    createDriveDialogVisible = false;
    renameDriveDialogVisible = false;
    updateCapacityDialogVisible = false;
    driveDetailsDialogVisible = false;
    confirmStatusDialogVisible = false;

    confirmStatusDrive: VirtualDriveRow | null = null;
    confirmStatusToActive = false;

    newDriveName = '';
    newDriveLicenseId = 3;
    newDriveCapacity = 100;
    renameDriveName = '';
    updateCapacityValue = 100;
    selectedDriveForRename: VirtualDriveRow | null = null;
    selectedDriveForCapacity: VirtualDriveRow | null = null;
    selectedDriveForDetails: VirtualDriveRow | null = null;

    virtualDrives: VirtualDriveRow[] = [];

    driveMenuItems: MenuItem[] = [];
    activeRowMenu?: { hide: () => void };
    selectedDriveForMenu: VirtualDriveRow | null = null;

    togglingDriveId: number | null = null;

    constructor(
        private translate: TranslationService,
        private messageService: MessageService,
        private virtualDrivesService: VirtualDrivesService
    ) {
        this.isLoading$ = this.virtualDrivesService.isLoadingSubject.asObservable();
    }

    ngOnInit(): void {
        this.buildDriveMenuItems();
        this.loadVirtualDrives();
    }


    buildDriveMenuItems(): void {
        const drive = this.selectedDriveForMenu;
        this.driveMenuItems = [
            {
                label: this.translate.getInstant('fileSystem.admin.viewDetails'),
                icon: 'pi pi-eye',
                command: () => {
                    if (drive) this.showDriveDetailsDialog(drive);
                }
            },
            {
                label: this.translate.getInstant('fileSystem.admin.renameDrive'),
                icon: 'pi pi-pencil',
                command: () => {
                    if (drive) this.showRenameDriveDialog(drive);
                }
            },
            {
                label: this.translate.getInstant('fileSystem.admin.updateCapacity'),
                icon: 'pi pi-chart-bar',
                command: () => {
                    if (drive) this.showUpdateCapacityDialog(drive);
                }
            }
        ];
        if (drive) {
            if (drive.active) {
                this.driveMenuItems.push({
                    label: this.translate.getInstant('fileSystem.admin.deactivateDrive'),
                    icon: 'pi pi-times',
                    command: () => this.showConfirmStatusDialog(drive, false)
                });
            } else {
                this.driveMenuItems.push({
                    label: this.translate.getInstant('fileSystem.admin.activateDrive'),
                    icon: 'pi pi-check',
                    command: () => this.showConfirmStatusDialog(drive, true)
                });
            }
        }
    }


    openDriveMenu(menu: { toggle: (e: Event) => void; hide: () => void }, row: VirtualDriveRow, event: Event): void {
        if (this.activeRowMenu && this.activeRowMenu !== menu) {
            this.activeRowMenu.hide();
        }

        this.activeRowMenu = menu;
        this.selectedDriveForMenu = row;
        this.buildDriveMenuItems();
        menu.toggle(event);
    }

    onRowMenuHide(menu: { hide: () => void }): void {
        if (this.activeRowMenu === menu) {
            this.activeRowMenu = undefined;
        }
    }


    get virtualDrivesTableValue(): VirtualDriveRow[] {
        if (this.tableLoadingSpinner && this.virtualDrives.length === 0) {
            return Array(this.virtualDrivesTableRows).fill(null).map(() => ({
                id: 0,
                name: '',
                licenseId: 0,
                isEntity: false,
                capacity: 0,
                freeSpace: 0,
                active: false
            }));
        }
        return this.virtualDrives;
    }

    get showEntityFilter(): boolean {
        return true;
    }

    get showCreateButton(): boolean {
        return true;
    }

    get showActivateDeactivate(): boolean {
        return true;
    }


    private mapDriveToRow(item: any): VirtualDriveRow {
        const id = Number(item.drive_ID ?? 0);
        const name = String(item.name ?? '');
        const licenseId = Number(item.license_ID ?? 0);
        const isEntity = Boolean(item.is_Entity);
        const capacity = Number(item.capacity ?? 0);
        const freeSpace = Number(item.free_Space ?? 0);
        const active = Boolean(item.is_Active);
        return { id, name, licenseId, isEntity, capacity, freeSpace, active };
    }

    /** Display label for drive type: Entity or Account. */
    getDriveTypeDisplay(row: VirtualDriveRow): string {
        return row.isEntity
            ? this.translate.getInstant('fileSystem.admin.driveTypeEntity')
            : this.translate.getInstant('fileSystem.admin.driveTypeAccount');
    }


    private getCurrentFilters(): VirtualDrivesFilters {
        return {
            entityFilter: this.entityFilter,
            licenseId: 0,
            activeOnly: false
        };
    }


    loadVirtualDrives(): void {
        const filters = this.getCurrentFilters();
        this.tableLoadingSpinner = true;

        this.virtualDrivesService.listDrives(filters).subscribe({
            next: (response: any) => {
                console.log('response listDrives: ', response);
                if (!response?.success) {
                    this.handleBusinessError('list', response);
                    return;
                }
                const drivesRaw = response.message ?? [];

                const sorted = (drivesRaw || []).slice().sort((a: any, b: any) => {
                    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
                });

                this.virtualDrives = sorted.map((item: any) => this.mapDriveToRow(item));
                this.notifyVirtualDrivesCount();
            },
            complete: () => {
                this.tableLoadingSpinner = false;
            }
        });
    }

    private notifyVirtualDrivesCount(): void {
        this.virtualDrivesCountChange.emit(this.virtualDrives.length);
    }

    getDriveName(row: VirtualDriveRow): string {
        return row.name;
    }

    private readonly bytesPerGb = 1024 * 1024 * 1024;

    private gbToBytes(gb: number): number {
        return Math.round((gb ?? 0) * this.bytesPerGb);
    }

    private bytesToGb(bytes: number): number {
        const b = bytes ?? 0;
        if (b <= 0) return 0;
        return Math.round(b / this.bytesPerGb);
    }

    formatBytesToSize(bytes: number): string {
        const b = bytes ?? 0;
        const gb = b / (1024 * 1024 * 1024);
        if (gb >= 1) return gb.toFixed(2) + ' GB';
        const mb = b / (1024 * 1024);
        return mb >= 1 ? (mb.toFixed(2) + ' MB') : (b / 1024).toFixed(2) + ' KB';
    }

    getCapacityDisplay(row: VirtualDriveRow): string {
        return this.formatBytesToSize(row.capacity);
    }

    getFreeSpaceDisplay(row: VirtualDriveRow): string {
        return this.formatBytesToSize(row.freeSpace);
    }

    showCreateDriveDialog(): void {
        this.newDriveName = '';
        this.newDriveLicenseId = 3;
        this.newDriveCapacity = 100;
        this.createDriveDialogVisible = true;
    }

    hideCreateDriveDialog(): void {
        this.createDriveDialogVisible = false;
    }

    readonly maxCapacityGb = 200;

    onCreateDriveConfirm(): void {
        if (!this.newDriveName.trim()) {
            this.messageService.add({
                severity: 'error',
                summary: this.translate.getInstant('common.error'),
                detail: this.translate.getInstant('fileSystem.admin.virtualDrivesDriveNameRequired')
            });
            return;
        }
        const capacityGb = Number(this.newDriveCapacity) || 0;
        if (capacityGb < 1 || capacityGb > this.maxCapacityGb) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('fileSystem.admin.validation'),
                detail: this.translate.getInstant('fileSystem.admin.capacityMax200Validation')
            });
            return;
        }

        const capacityInBytes = this.gbToBytes(this.newDriveCapacity);
        this.virtualDrivesService.createDrive(
            this.newDriveName,
            this.newDriveLicenseId,
            capacityInBytes
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('create', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('fileSystem.admin.createDriveSuccess')
                });
                this.hideCreateDriveDialog();
                this.loadVirtualDrives();
            }
        });
    }

    showRenameDriveDialog(row: VirtualDriveRow): void {
        this.selectedDriveForRename = row;
        this.renameDriveName = this.getDriveName(row);
        this.renameDriveDialogVisible = true;
    }

    hideRenameDriveDialog(): void {
        this.renameDriveDialogVisible = false;
        this.selectedDriveForRename = null;
    }

    onRenameDriveSave(): void {
        if (!this.selectedDriveForRename || !this.renameDriveName.trim()) {
            return;
        }

        this.virtualDrivesService.renameDrive(
            this.selectedDriveForRename.id,
            this.renameDriveName
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('rename', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('fileSystem.admin.renameDriveSuccess')
                });
                this.hideRenameDriveDialog();
                this.loadVirtualDrives();
            }
        });
    }

    showUpdateCapacityDialog(row: VirtualDriveRow): void {
        this.selectedDriveForCapacity = row;
        this.updateCapacityValue = this.bytesToGb(row.capacity);
        this.updateCapacityDialogVisible = true;
    }

    hideUpdateCapacityDialog(): void {
        this.updateCapacityDialogVisible = false;
        this.selectedDriveForCapacity = null;
    }

    onUpdateCapacitySave(): void {
        if (!this.selectedDriveForCapacity) {
            return;
        }
        const capacityGb = Number(this.updateCapacityValue) || 0;
        if (capacityGb < 1 || capacityGb > this.maxCapacityGb) {
            this.messageService.add({
                severity: 'warn',
                summary: this.translate.getInstant('fileSystem.admin.validation'),
                detail: this.translate.getInstant('fileSystem.admin.capacityMax200Validation')
            });
            return;
        }

        const capacityInBytes = this.gbToBytes(this.updateCapacityValue);
        this.virtualDrivesService.updateDriveCapacity(
            this.selectedDriveForCapacity.id,
            capacityInBytes
        ).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('updateCapacity', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('fileSystem.admin.updateCapacitySuccess')
                });
                this.hideUpdateCapacityDialog();
                this.loadVirtualDrives();
            }
        });
    }

    onActivateDrive(row: VirtualDriveRow): void {
        this.virtualDrivesService.activateDrive(row.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('activate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('fileSystem.admin.activateDriveSuccess')
                });
                this.loadVirtualDrives();
            }
        });
    }

    onDeactivateDrive(row: VirtualDriveRow): void {
        this.virtualDrivesService.deactivateDrive(row.id).subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError('deactivate', response);
                    return;
                }

                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: this.translate.getInstant('fileSystem.admin.deactivateDriveSuccess')
                });
                this.loadVirtualDrives();
            }
        });
    }


    onStatusToggle(row: VirtualDriveRow, event: { checked?: boolean } | boolean): void {
        const checked = typeof event === 'boolean' ? event : (event?.checked ?? false);
        this.showConfirmStatusDialog(row, checked);
    }


    showConfirmStatusDialog(row: VirtualDriveRow, toActive: boolean): void {
        this.confirmStatusDrive = row;
        this.confirmStatusToActive = toActive;
        this.confirmStatusDialogVisible = true;
    }

    hideConfirmStatusDialog(): void {
        this.confirmStatusDialogVisible = false;
        this.confirmStatusDrive = null;
    }


    onCancelStatusChange(): void {
        if (this.confirmStatusDrive) {
            this.confirmStatusDrive.active = !this.confirmStatusToActive;
        }
        this.hideConfirmStatusDialog();
    }


    onConfirmStatusChange(): void {
        const row = this.confirmStatusDrive;
        if (!row) {
            this.hideConfirmStatusDialog();
            return;
        }
        const toActive = this.confirmStatusToActive;
        this.hideConfirmStatusDialog();
        this.togglingDriveId = row.id;

        const serviceCall = toActive
            ? this.virtualDrivesService.activateDrive(row.id)
            : this.virtualDrivesService.deactivateDrive(row.id);

        serviceCall.subscribe({
            next: (response: any) => {
                if (!response?.success) {
                    this.handleBusinessError(toActive ? 'activate' : 'deactivate', response);
                    row.active = !toActive;
                    return;
                }
                this.messageService.add({
                    severity: 'success',
                    summary: this.translate.getInstant('common.success'),
                    detail: toActive
                        ? this.translate.getInstant('fileSystem.admin.activateDriveSuccess')
                        : this.translate.getInstant('fileSystem.admin.deactivateDriveSuccess')
                });
                this.loadVirtualDrives();
            },
            error: () => {
                row.active = !toActive;
            },
            complete: () => {
                this.togglingDriveId = null;
            }
        });
    }

    showDriveDetailsDialog(row: VirtualDriveRow): void {
        this.selectedDriveForDetails = row;
        this.driveDetailsDialogVisible = true;
    }

    hideDriveDetailsDialog(): void {
        this.driveDetailsDialogVisible = false;
        this.selectedDriveForDetails = null;
    }


    private handleBusinessError(context: 'list' | 'create' | 'rename' | 'updateCapacity' | 'activate' | 'deactivate', response: any): void {
        const code = String(response?.message || '');
        let detail = '';

        switch (context) {
            case 'list':
                detail = this.getListErrorMessage(code) || '';
                break;
            case 'create':
                detail = this.getCreateErrorMessage(code) || '';
                break;
            case 'rename':
                detail = this.getRenameErrorMessage(code) || '';
                break;
            case 'updateCapacity':
                detail = this.getUpdateCapacityErrorMessage(code) || '';
                break;
            case 'activate':
            case 'deactivate':
                detail = this.getActivateDeactivateErrorMessage(code) || '';
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
            this.tableLoadingSpinner = false;
        }
    }

    private getListErrorMessage(code: string): string | null {
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

    private getCreateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12271':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesCreateErrorInvalidName');
            case 'ERP12272':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesCreateErrorInvalidLicense');
            case 'ERP12273':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesCreateErrorLicenseHasDrive');
            case 'ERP12274':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesCreateErrorInvalidCapacity');
            default:
                return null;
        }
    }

    private getRenameErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12271':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesRenameErrorInvalidName');
            case 'ERP12290':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesRenameErrorInvalidDriveId');
            default:
                return null;
        }
    }

    private getUpdateCapacityErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12274':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesUpdateCapacityErrorInvalidRange');
            case 'ERP12290':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesUpdateCapacityErrorInvalidDriveId');
            default:
                return null;
        }
    }

    private getActivateDeactivateErrorMessage(code: string): string | null {
        switch (code) {
            case 'ERP12290':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesStatusErrorInvalidDriveId');
            case 'ERP12291':
                return this.translate.getInstant('fileSystem.admin.virtualDrivesStatusErrorInactive');
            default:
                return null;
        }
    }
}
