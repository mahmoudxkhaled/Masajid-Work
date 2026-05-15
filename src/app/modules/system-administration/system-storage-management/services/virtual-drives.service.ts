import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { VirtualDrivesFilters } from '../models/virtual-drive.model';


@Injectable({
  providedIn: 'root',
})
export class VirtualDrivesService {

  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiService: ApiService,
    private localStorageService: LocalStorageService
  ) { }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }


  listDrives(filters: VirtualDrivesFilters): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      filters.entityFilter.toString(),
      filters.licenseId.toString(),
      filters.activeOnly.toString(),
    ];
    console.log('listDrives params', params);

    return this.apiService
      .callAPI(1150, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  createDrive(
    driveName: string,
    licenseId: number,
    capacity: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [
      driveName,
      licenseId.toString(),
      capacity.toString(),
    ];

    return this.apiService
      .callAPI(1151, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  getDriveDetails(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1152, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  renameDrive(driveId: number, newName: string): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString(), newName];

    return this.apiService
      .callAPI(1153, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  updateDriveCapacity(
    driveId: number,
    newCapacity: number
  ): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString(), newCapacity.toString()];

    return this.apiService
      .callAPI(1154, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  activateDrive(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1155, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }


  deactivateDrive(driveId: number): Observable<any> {
    this.isLoadingSubject.next(true);

    const params: string[] = [driveId.toString()];

    return this.apiService
      .callAPI(1156, this.getAccessToken(), params)
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }
}

