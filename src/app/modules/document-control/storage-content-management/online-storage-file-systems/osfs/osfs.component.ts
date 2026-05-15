import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FsPermissionsService } from '../folder-management/services/fs-permissions.service';

export interface OsfsFileSystemCard {
  id: number;
  name: string;
  accessRight: number;
}

interface ListAccountFileSystemsMessageItem {
  file_system_id: number;
  file_system_name: string;
  access_right: string | number;
  access_right_type: string;
  permission_id: number;
}

@Component({
  selector: 'app-osfs',
  templateUrl: './osfs.component.html',
  styleUrls: ['./osfs.component.scss'],
})
export class OsfsComponent implements OnInit {
  fileSystems: OsfsFileSystemCard[] = [];
  loadingList = false;
  fileSystemId = 0;
  readonly cardSkeletonIndices = Array.from({ length: 15 }, (_, i) => i);

  constructor(
    private translate: TranslationService,
    private messageService: MessageService,
    private localStorageService: LocalStorageService,
    private fsPermissionsService: FsPermissionsService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe((pm) => {
      const raw = pm.get('fileSystemId');
      if (raw === null || raw === '') {
        this.fileSystemId = 0;
        this.loadAccountFileSystems();
        return;
      }
      const id = Number(raw);
      if (!Number.isFinite(id) || id <= 0) {
        void this.router.navigate(['/document-control/storage-content-management/osfs']);
        return;
      }
      this.fileSystemId = id;
    });
  }

  loadAccountFileSystems(): void {
    const accountId = this.localStorageService.getAccountDetails()?.Account_ID ?? 0;
    if (accountId <= 0) {
      this.fileSystems = [];
      return;
    }
    this.loadingList = true;
    this.fileSystems = [];
    this.fsPermissionsService.listAccountFileSystems(accountId, true).subscribe({
      next: (response: any) => {
        this.loadingList = false;
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.fileSystems = [];
          return;
        }
        this.fileSystems = Object.values(
          response.message as Record<string, ListAccountFileSystemsMessageItem>
        ).map((item) => ({
          id: item.file_system_id,
          name: item.file_system_name,
          accessRight: Number(item.access_right),
        }));
      },
      error: () => {
        this.loadingList = false;
        this.fileSystems = [];
      },
    });
  }

  openFileSystem(row: OsfsFileSystemCard): void {
    void this.router.navigate(['folder', row.id], { relativeTo: this.route });
  }

  fileSystemCardAccessRight(card: OsfsFileSystemCard | null | undefined): number {
    if (!card) {
      return -1;
    }
    return Number.isFinite(card.accessRight) ? card.accessRight : -1;
  }

  getAccessRightSeverity(accessRight: number): 'secondary' | 'info' | 'success' | 'warning' | 'danger' {
    if (accessRight <= 0) {
      return 'secondary';
    }
    if (accessRight === 1) {
      return 'info';
    }
    if (accessRight === 2) {
      return 'success';
    }
    if (accessRight === 3) {
      return 'warning';
    }
    if (accessRight >= 4) {
      return 'danger';
    }
    return 'secondary';
  }

  getAccessRightLabel(accessRight: number): string {
    switch (accessRight) {
      case 0:
        return this.translate.getInstant('fileSystem.permissions.accessRight.none');
      case 1:
        return this.translate.getInstant('fileSystem.permissions.accessRight.list');
      case 2:
        return this.translate.getInstant('fileSystem.permissions.accessRight.read');
      case 3:
        return this.translate.getInstant('fileSystem.permissions.accessRight.amend');
      case 4:
        return this.translate.getInstant('fileSystem.permissions.accessRight.modify');
      case 5:
        return this.translate.getInstant('fileSystem.permissions.accessRight.full');
      default:
        return this.translate.getInstant('fileSystem.permissions.accessRight.unknown');
    }
  }

  // #region Business errors
  private handleBusinessError(context: 'list', response: any): void {
    const code = String(response?.message || '');
    let detail = '';
    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code) || '';
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

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'ERP12296':
        return this.translate.getInstant('fileSystem.admin.errorInvalidAccountId');
      case 'ERP12000':
        return this.translate.getInstant('fileSystem.admin.errorAccessDenied');
      case 'ERP12007':
        return this.translate.getInstant('fileSystem.admin.errorAccessDeniedAction');
      default:
        return null;
    }
  }
  // #endregion
}
