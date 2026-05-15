import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

/**
 * Service responsible for calling the Storage (2B) File APIs.
 *
 * The style intentionally follows FolderService so it is easy to understand:
 * - expose a simple isLoadingSubject
 * - wrap ApiService.callAPI
 * - keep parameters order exactly as documented in the API spec
 */
@Injectable({
  providedIn: 'root',
})
export class FileService {
  /** Indicates if a File request is currently in progress. */
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /**
   * Get_File_Details (1105)
   * Input: File_ID, Folder_ID, File_System_ID
   */
  getFileDetails(
    fileId: number,
    folderId: number,
    fileSystemId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1105, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Update_File_Details (1106)
   * Input: File_ID, Folder_ID, File_System_ID, Name, Type
   */
  updateFileDetails(
    fileId: number,
    folderId: number,
    fileSystemId: number,
    name: string,
    type: string
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
      name,
      type,
    ];
    console.log('params update file details', params);

    return this.apiService
      .callAPI(1114, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Delete_File_Allocation (1144)
   * Input: File_ID, Folder_ID, File_System_ID
   */
  deleteFileAllocation(
    fileId: number,
    folderId: number,
    fileSystemId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];
    console.log('params delete file allocation', params);

    return this.apiService
      .callAPI(1144, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Restore_Deleted_Files (1146)
   * Params: 1. List<long> File_IDs, 2. List<long> Folder_IDs, 3. int File_System_ID
   */
  restoreDeletedFiles(
    fileIds: number[],
    folderIds: number[],
    fileSystemId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const fileIdsParam = JSON.stringify(fileIds);
    const folderIdsParam = JSON.stringify(folderIds);
    const params: string[] = [fileIdsParam, folderIdsParam, fileSystemId.toString()];

    return this.apiService
      .callAPI(1146, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}
