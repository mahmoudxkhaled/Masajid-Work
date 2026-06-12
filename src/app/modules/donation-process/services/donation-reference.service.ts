import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { DonationCategory, DonationCategoryBackend } from '../models/donation-category.model';
import { DonationRequestStatus, DonationRequestStatusBackend } from '../models/donation-request-status.model';
import { DonationType, DonationTypeBackend } from '../models/donation-type.model';

@Injectable({
  providedIn: 'root',
})
export class DonationReferenceService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  // #region API calls

  listDonationTypes(): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100100, this.getAccessToken(), []).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listDonationCategories(donationTypeId: number, activeOnly: boolean): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationTypeId.toString(), activeOnly.toString()];
    return this.apiServices.callAPI(100101, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listDonationRequestStatuses(): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100106, this.getAccessToken(), []).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  addDonationCategory(
    donationTypeId: number,
    code: string,
    name: string,
    isService: boolean,
    defaultOrder: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      donationTypeId.toString(),
      code,
      name,
      isService.toString(),
      defaultOrder.toString(),
    ];
    return this.apiServices.callAPI(100102, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  updateDonationCategory(
    donationCategoryId: number,
    code: string,
    name: string,
    isService: boolean,
    defaultOrder: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      donationCategoryId.toString(),
      code,
      name,
      isService.toString(),
      defaultOrder.toString(),
    ];
    return this.apiServices.callAPI(100103, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  activateDonationCategory(donationCategoryId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100104, this.getAccessToken(), [donationCategoryId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  deactivateDonationCategory(donationCategoryId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100105, this.getAccessToken(), [donationCategoryId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  // #endregion

  // #region Mapping

  mapDonationTypes(rawItems: DonationTypeBackend[]): DonationType[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems.map((item) => ({
      id: Number(item.Donation_Type_ID || 0),
      code: String(item.Code || ''),
      name: isRegional ? String(item.Name_Regional || item.Name || '') : String(item.Name || ''),
      description: isRegional
        ? String(item.Description_Regional || item.Description || '')
        : String(item.Description || ''),
      active: Boolean(item.Is_Active),
    }));
  }

  mapDonationCategories(rawItems: DonationCategoryBackend[]): DonationCategory[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems.map((item) => ({
      id: Number(item.Donation_Category_ID || 0),
      donationTypeId: Number(item.Donation_Type_ID || 0),
      code: String(item.Code || ''),
      name: isRegional ? String(item.Name_Regional || item.Name || '') : String(item.Name || ''),
      isService: Boolean(item.Is_Service),
      defaultOrder: Number(item.Default_Order || 0),
      active: Boolean(item.Is_Active),
    }));
  }

  mapDonationRequestStatuses(rawItems: DonationRequestStatusBackend[]): DonationRequestStatus[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems.map((item) => ({
      id: Number(item.Status_ID || 0),
      code: String(item.Code || ''),
      name: isRegional ? String(item.Name_Regional || item.Name || '') : String(item.Name || ''),
    }));
  }

  extractDictionaryItems<T>(message: Record<string, unknown> | undefined, key: string): T[] {
    const dictionary = message?.[key];
    if (!dictionary || typeof dictionary !== 'object') {
      return [];
    }
    return Object.values(dictionary as Record<string, T>);
  }

  // #endregion

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
