import { Component, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface PermissionRow {
    roleKey: string;
    folderPath: string;
    accessKey: string;
}

@Component({
    selector: 'app-entity-storage-management',
    templateUrl: './entity-storage-management.component.html',
    styleUrls: ['./entity-storage-management.component.scss']
})
export class EntityStorageManagementComponent implements OnInit {
    addPermissionDialogVisible = false;
    editPermissionDialogVisible = false;
    syncUnderDevDialogVisible = false;

    selectedPermissionForEdit: PermissionRow | null = null;
    newPermissionRoleKey = 'fileSystem.entityAdminRoles.financeTeam';
    newPermissionPath = '/Finance';
    newPermissionAccessKey = 'fileSystem.entityAdminAccess.readWrite';
    editPermissionRoleKey = '';
    editPermissionPath = '';
    editPermissionAccessKey = '';

    roleOptions: { labelKey: string; value: string; label: string }[] = [];
    accessOptions: { labelKey: string; value: string; label: string }[] = [];

    entityFileSystemsCount = 0;

    permissions: PermissionRow[] = [
        { roleKey: 'fileSystem.entityAdminRoles.financeTeam', folderPath: '/Finance', accessKey: 'fileSystem.entityAdminAccess.readWrite' },
        { roleKey: 'fileSystem.entityAdminRoles.hrTeam', folderPath: '/HR', accessKey: 'fileSystem.entityAdminAccess.readWrite' },
        { roleKey: 'fileSystem.entityAdminRoles.allEmployees', folderPath: '/Shared', accessKey: 'fileSystem.entityAdminAccess.readDownload' }
    ];

    get ownedVirtualDrivesCount(): number {
        return 0;
    }

    trafficUploads = '0';
    trafficDownloads = '0';
    allowShareInternally = true;
    allowShareExternally = false;

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) {}

    ngOnInit(): void {
        this.roleOptions = [
            { labelKey: 'fileSystem.entityAdminRoles.financeTeam', value: 'fileSystem.entityAdminRoles.financeTeam', label: '' },
            { labelKey: 'fileSystem.entityAdminRoles.hrTeam', value: 'fileSystem.entityAdminRoles.hrTeam', label: '' },
            { labelKey: 'fileSystem.entityAdminRoles.allEmployees', value: 'fileSystem.entityAdminRoles.allEmployees', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
        this.accessOptions = [
            { labelKey: 'fileSystem.entityAdminAccess.readWrite', value: 'fileSystem.entityAdminAccess.readWrite', label: '' },
            { labelKey: 'fileSystem.entityAdminAccess.readDownload', value: 'fileSystem.entityAdminAccess.readDownload', label: '' }
        ].map(o => ({ ...o, label: this.translate.getInstant(o.labelKey) }));
    }

    getRoleLabel(row: PermissionRow): string {
        return this.translate.getInstant(row.roleKey);
    }

    getAccessLabel(row: PermissionRow): string {
        return this.translate.getInstant(row.accessKey);
    }

    showAddPermissionDialog(): void {
        this.newPermissionRoleKey = 'fileSystem.entityAdminRoles.financeTeam';
        this.newPermissionPath = '/Finance';
        this.newPermissionAccessKey = 'fileSystem.entityAdminAccess.readWrite';
        this.addPermissionDialogVisible = true;
    }

    hideAddPermissionDialog(): void {
        this.addPermissionDialogVisible = false;
    }

    onAddPermissionConfirm(): void {
        this.hideAddPermissionDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.addPermissionSuccess')
        });
    }

    showEditPermissionDialog(row: PermissionRow): void {
        this.selectedPermissionForEdit = row;
        this.editPermissionRoleKey = row.roleKey;
        this.editPermissionPath = row.folderPath;
        this.editPermissionAccessKey = row.accessKey;
        this.editPermissionDialogVisible = true;
    }

    hideEditPermissionDialog(): void {
        this.editPermissionDialogVisible = false;
        this.selectedPermissionForEdit = null;
    }

    onEditPermissionSave(): void {
        this.hideEditPermissionDialog();
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.updatePermissionSuccess')
        });
    }

    onDeletePermission(row: PermissionRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.entityAdmin.deletePermissionSuccess')
        });
    }

    showSyncUnderDevDialog(): void {
        this.syncUnderDevDialogVisible = true;
    }

    hideSyncUnderDevDialog(): void {
        this.syncUnderDevDialogVisible = false;
    }
}
