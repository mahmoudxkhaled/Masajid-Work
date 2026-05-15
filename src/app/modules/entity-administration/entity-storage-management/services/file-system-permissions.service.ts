import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import type { AccountsAccessRightsMap, ListFileSystemPermissionsMessage } from '../models/file-system-permissions-list-response.model';

export type FileSystemAccessType =
  | 'Account'
  | 'Group'
  | 'Role'
  | 'Entity'
  | 'Organization'
  | 'All'
  | 'Owner'
  | 'EntityAdmin';

export type FileSystemAccessRight = 'None' | 'List' | 'Read' | 'Amend' | 'Modify' | 'Full';

export interface FileSystemAccessPermissionRow {
  accessType: number;
  relatedIds: number[];
  accessRight: number;
  permissionId?: number | null;
  raw?: any;
  relatedTargetDisplay?: string;

  tableSearchText?: string;
}

export interface FileSystemPermissionsResult {
  permissions: FileSystemAccessPermissionRow[];
  accountsAccessRights: AccountsAccessRightsMap | null;
  raw: ListFileSystemPermissionsMessage | Record<string, unknown>;
}


@Injectable({ providedIn: 'root' })
export class FileSystemPermissionsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  listFileSystemPermissions(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1170, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  setFileSystemAccessPermission(
    fileSystemId: number,
    accessType: number,
    relatedIds: number[],
    accessRight: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      accessType.toString(),
      JSON.stringify(relatedIds ?? []),
      accessRight.toString(),
    ];
    return this.apiService
      .callAPI(1171, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  removeFileSystemAccessPermission(
    fileSystemId: number,
    accessType: number,
    relatedIds: number[]
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      accessType.toString(),
      JSON.stringify(relatedIds ?? []),
    ];
    return this.apiService
      .callAPI(1172, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  clearFileSystemPermissions(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1173, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  mapPermissionsResponse(response: any): FileSystemPermissionsResult {
    const message = response.message as ListFileSystemPermissionsMessage;
    const permissions: FileSystemAccessPermissionRow[] = message.access_Rights!.map((item) => {
      const permissionId = Number(item.permission_ID);
      return {
        accessType: Number(item.access_Right_Type),
        accessRight: Number(item.access_Right),
        permissionId,
        relatedIds: permissionId > 0 ? [permissionId] : [],
        raw: item,
      };
    });
    return {
      permissions,
      accountsAccessRights: message.accounts_Access_Rights as AccountsAccessRightsMap | null,
      raw: message,
    };
  }
}
