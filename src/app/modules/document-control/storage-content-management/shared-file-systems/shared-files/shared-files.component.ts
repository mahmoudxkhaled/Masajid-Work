import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';

export interface SharedFileItem {
    name: string;
    sharedBy: string;
    permission: 'Read' | 'Write' | 'Download';
}

export interface MySharedFileSystemRow {
    id: number;
    name: string;
    accessLabel: string;
}

@Component({
    selector: 'app-shared-files',
    templateUrl: './shared-files.component.html',
    styleUrls: ['./shared-files.component.scss']
})
export class SharedFilesComponent {
    sharedFiles: SharedFileItem[] = [
        { name: 'Project-Brief.pdf', sharedBy: 'John ', permission: 'Read' },
        { name: 'Design-Specs.docx', sharedBy: 'Sarah ', permission: 'Write' },
        { name: 'Budget-Overview.xlsx', sharedBy: 'Finance ', permission: 'Download' },
        { name: 'Meeting-Minutes-Jan.pdf', sharedBy: 'Hassan', permission: 'Read' },
        { name: 'Contract-Draft.docx', sharedBy: 'Ahmed', permission: 'Write' }
    ];

    mySharedFileSystems: MySharedFileSystemRow[] = [
        { id: 1, name: 'Project Share', accessLabel: 'View & Edit' }
    ];

    downloadProgressVisible = false;
    downloadFileName = '';

    constructor(
        private translate: TranslationService,
        private messageService: MessageService
    ) { }

    onView(row: SharedFileItem): void {
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.sharedFiles.viewToastSummary'),
            detail: this.translate.getInstant('fileSystem.sharedFiles.viewToastDetail') + ' ' + row.name
        });
    }

    onDownload(row: SharedFileItem): void {
        this.downloadFileName = row.name;
        this.downloadProgressVisible = true;
    }

    hideDownloadProgress(): void {
        this.downloadProgressVisible = false;
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.sharedFiles.downloadSuccessSummary'),
            detail: this.translate.getInstant('fileSystem.sharedFiles.downloadSuccessDetail') + ' ' + this.downloadFileName
        });
    }

    getPermissionLabel(permission: string): string {
        const key = 'fileSystem.sharedFiles.permission' + permission.charAt(0).toUpperCase() + permission.slice(1).toLowerCase();
        return this.translate.getInstant(key);
    }

    getPermissionSeverity(permission: string): string {
        if (permission === 'Write') return 'success';
        if (permission === 'Download') return 'info';
        return 'secondary';
    }

    onCreateSharedFileSystem(): void {
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant('fileSystem.fileSharing.createSharedFileSystem')
        });
    }

    onCopyLink(_row: MySharedFileSystemRow): void {
        this.messageService.add({
            severity: 'success',
            summary: this.translate.getInstant('fileSystem.fileSharing.copyLink'),
            detail: this.translate.getInstant('fileSystem.fileSharing.accessLinksDescription')
        });
    }

    onCopyFromMain(mode: 'static' | 'linked'): void {
        const key = mode === 'static' ? 'fileSystem.fileSharing.staticCopy' : 'fileSystem.fileSharing.linkedCopy';
        this.messageService.add({
            severity: 'info',
            summary: this.translate.getInstant(key)
        });
    }
}
