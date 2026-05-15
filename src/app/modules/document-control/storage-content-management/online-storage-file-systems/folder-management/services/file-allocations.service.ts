import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

/**
 * Service for Storage (2B) File Allocation APIs (Stage 6).
 *
 * Function IDs (per docs): 1140–1146
 */
@Injectable({
  providedIn: 'root',
})
export class FileAllocationsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  /** List_Allocation_Types (1140). No input. */
  listAllocationTypes(): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1140, this.getAccessToken(), [])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Allocate_File (1141)
   * Input: File_ID, Folder_ID, File_System_ID, Allocation_Type
   */
  allocateFile(fileId: number, folderId: number, fileSystemId: number, allocationType: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
      allocationType.toString(),
    ];
    return this.apiService
      .callAPI(1141, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Get_File_Allocation_Details (1142)
   * Input: File_ID, Folder_ID, File_System_ID
   */
  getFileAllocationDetails(fileId: number, folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];
    return this.apiService
      .callAPI(1142, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Update_File_Allocation_Details (1143)
   * Input: File_ID, Folder_ID, File_System_ID, Allocation_Type
   */
  updateFileAllocationDetails(
    fileId: number,
    folderId: number,
    fileSystemId: number,
    allocationType: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
      allocationType.toString(),
    ];
    return this.apiService
      .callAPI(1143, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Delete_File_Allocation (1144)
   * Input: File_ID, Folder_ID, File_System_ID
   */
  deleteFileAllocation(fileId: number, folderId: number, fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
    ];
    return this.apiService
      .callAPI(1144, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Move_File (1145)
   * Input: File_ID, Folder_ID, File_System_ID, New_Parent_Folder_ID
   */
  moveFile(fileId: number, folderId: number, fileSystemId: number, newParentFolderId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileId.toString(),
      folderId.toString(),
      fileSystemId.toString(),
      newParentFolderId.toString(),
    ];
    return this.apiService
      .callAPI(1145, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  /**
   * Restore_Deleted_Files (1146)
   * Input: List<long> File_IDs, List<long> Folder_IDs, int File_System_ID
   */
  restoreDeletedFiles(fileIds: number[], folderIds: number[], fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      JSON.stringify(fileIds),
      JSON.stringify(folderIds),
      fileSystemId.toString(),
    ];
    return this.apiService
      .callAPI(1146, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}

