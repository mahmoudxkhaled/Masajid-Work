import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { FileSystemsFilters } from '../models/file-system.model';


@Injectable({
  providedIn: 'root',
})
export class FileSystemsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }

  listFileSystemTypes(): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1120, this.getAccessToken(), [])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  listFileSystems(filters: FileSystemsFilters): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      filters.entityFilter.toString(),
      filters.driveId.toString(),
      filters.activeOnly.toString(),
    ];
    console.log('params list file systems', params);
    return this.apiService
      .callAPI(1121, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  createFileSystem(
    name: string,
    type: number,
    ownerId: number,
    isEntityId: boolean,
    driveId: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      name,
      type.toString(),
      ownerId.toString(),
      isEntityId ? 'true' : 'false',
      driveId.toString(),
    ];
    console.log('params create file system', params);
    return this.apiService
      .callAPI(1122, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  getFileSystemDetails(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1123, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  updateFileSystemDetails(
    fileSystemId: number,
    name: string,
    type: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [fileSystemId.toString(), name, type.toString()];
    console.log('params update file system details', params);
    return this.apiService
      .callAPI(1124, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  deleteFileSystem(fileSystemId: number, deleteAllContents: boolean): Observable<any> {
    this.isLoadingSubject.next(true);
    const params: string[] = [
      fileSystemId.toString(),
      deleteAllContents.toString()
    ];
    return this.apiService
      .callAPI(1125, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  restoreDeletedFileSystem(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1126, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  clearFileSystemRecycleBin(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1127, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  restoreFileSystemRecycleBinContents(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1128, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  getFileSystemRecycleBinContents(fileSystemId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiService
      .callAPI(1129, this.getAccessToken(), [fileSystemId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}
