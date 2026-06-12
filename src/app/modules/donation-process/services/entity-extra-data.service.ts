import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { DonationEntityTypeId, EntityExtraData, EntityExtraDataBackend } from '../models/entity-extra-data.model';

@Injectable({
  providedIn: 'root',
})
export class EntityExtraDataService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  addEntityExtraData(entityId: number, entityTypeId: DonationEntityTypeId, countryCode: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [entityId.toString(), entityTypeId.toString(), countryCode];
    return this.apiServices.callAPI(112000, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  updateEntityExtraData(entityId: number, entityTypeId: DonationEntityTypeId, countryCode: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [entityId.toString(), entityTypeId.toString(), countryCode];
    return this.apiServices.callAPI(112001, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getEntityExtraData(entityId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(112004, this.getAccessToken(), [entityId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listEntitiesExtraData(
    entityTypeIdFilter: number,
    countryCodeFilter: string,
    lastEntityId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      entityTypeIdFilter.toString(),
      countryCodeFilter || '',
      lastEntityId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(112006, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  mapEntityExtraData(message: EntityExtraDataBackend): EntityExtraData {
    return {
      entityId: Number(message.Entity_ID || 0),
      entityTypeId: Number(message.Entity_Type_ID || 0) as DonationEntityTypeId,
      countryCode: String(message.Country_Code || ''),
    };
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
