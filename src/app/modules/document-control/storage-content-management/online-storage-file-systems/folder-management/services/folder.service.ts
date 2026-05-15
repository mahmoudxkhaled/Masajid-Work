import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

/**
 * Service responsible for calling the Storage (2B) Folder APIs.
 *
 * The style intentionally follows VirtualDrivesService so it is easy to understand:
 * - expose a simple isLoadingSubject
 * - wrap ApiService.callAPI
 * - keep parameters order exactly as documented in the API spec
 */
@Injectable({
  providedIn: 'root',
})
export class FolderService {
  /** Indicates if a Folder request is currently in progress. */
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) {}

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /**
   * Create_Folder (1130)
   * Input: File_System_ID, Folder_Name, Parent_Folder_ID
   */
  createFolder(
    fileSystemId: number,
    folderName: string,
    parentFolderId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      fileSystemId.toString(),
      folderName,
      parentFolderId.toString(),
    ];

    return this.apiService
      .callAPI(1130, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_Folder_Details (1131)
   * Input: Folder_ID, File_System_ID
   */
  getFolderDetails(folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1131, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Update_Folder_Details (1132)
   * Input: Folder_ID, File_System_ID, Folder_Name
   */
  updateFolderDetails(
    folderId: number,
    fileSystemId: number,
    folderName: string
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
      folderName,
    ];

    return this.apiService
      .callAPI(1132, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Delete_Folder (1133)
   * Input: Folder_ID, File_System_ID
   */
  deleteFolder(folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1133, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Move_Folder (1134)
   * Input: Folder_ID, File_System_ID, New_Parent_Folder_ID
   */
  moveFolder(
    folderId: number,
    fileSystemId: number,
    newParentFolderId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
      newParentFolderId.toString(),
    ];

    return this.apiService
      .callAPI(1134, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_Folder_Structure (1135)
   * Input: File_System_ID, One_Level_Only
   */
  getFolderStructure(
    fileSystemId: number,
    oneLevelOnly: boolean
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      fileSystemId.toString(),
      oneLevelOnly.toString(),
    ];

    return this.apiService
      .callAPI(1135, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_Folder_Contents (1136)
   * Input: Folder_ID, File_System_ID
   */
  getFolderContents(folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1136, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_Total_Folder_Size (1138)
   * Input: Folder_ID, File_System_ID
   * Output: long Total_Size (in response.message)
   */
  getTotalFolderSize(folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      folderId.toString(),
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1138, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_File_System_Recycle_Bin_Contents (1129)
   * Input: File_System_ID
   * Output: List Folders, List Files (in response.message)
   */
  getRecycleBinContents(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [fileSystemId.toString()];

    return this.apiService
      .callAPI(1129, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Restore_Deleted_Folders (1137)
   * Input: List<long> Folder_IDs, File_System_ID
   */
  restoreDeletedFolders(
    folderIds: number[],
    fileSystemId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const folderIdsParam = JSON.stringify(folderIds);

    const params: string[] = [
      folderIdsParam,
      fileSystemId.toString(),
    ];

    return this.apiService
      .callAPI(1137, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}
