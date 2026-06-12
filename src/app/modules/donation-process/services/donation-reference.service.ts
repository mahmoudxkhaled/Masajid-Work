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
  ) { }

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
      isService.toString(),
      defaultOrder.toString(),
    ];
    console.log('updateDonationCategory params', params);
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
    return rawItems.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: this.readNumber(record, 'Donation_Type_ID'),
        code: this.readString(record, 'Code'),
        name: isRegional
          ? this.readString(record, 'Name_Regional') || this.readString(record, 'Name')
          : this.readString(record, 'Name'),
        description: isRegional
          ? this.readString(record, 'Description_Regional') || this.readString(record, 'Description')
          : this.readString(record, 'Description'),
        active: this.readBoolean(record, 'Is_Active'),
      };
    });
  }

  mapDonationCategories(rawItems: DonationCategoryBackend[]): DonationCategory[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          id: this.readNumber(record, 'Donation_Category_ID'),
          donationTypeId: this.readNumber(record, 'Donation_Type_ID'),
          code: this.readString(record, 'Code'),
          name: isRegional
            ? this.readString(record, 'Name_Regional') || this.readString(record, 'Name')
            : this.readString(record, 'Name'),
          isService: this.readBoolean(record, 'Is_Service'),
          defaultOrder: this.readNumber(record, 'Default_Order'),
          active: this.readBoolean(record, 'Is_Active'),
        };
      })
      .sort((a, b) => a.defaultOrder - b.defaultOrder);
  }

  mapDonationRequestStatuses(rawItems: DonationRequestStatusBackend[]): DonationRequestStatus[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems.map((item) => {
      const record = item as Record<string, unknown>;
      return {
        id: this.readNumber(record, 'Status_ID'),
        code: this.readString(record, 'Code'),
        name: isRegional
          ? this.readString(record, 'Name_Regional') || this.readString(record, 'Name')
          : this.readString(record, 'Name'),
      };
    });
  }

  parseListFromResponse<T>(response: any): T[] {
    if (!response?.success) {
      return [];
    }
    return this.extractDictionaryItems<T>(response.message);
  }

  toTypeDropdownOptions(rawTypes: DonationTypeBackend[]): { label: string; value: number }[] {
    return this.mapDonationTypes(rawTypes).map((item) => ({ label: item.name, value: item.id }));
  }

  extractDictionaryItems<T>(message: Record<string, unknown> | undefined, key?: string): T[] {
    if (!message) {
      return [];
    }

    let dictionary: unknown;

    if (key) {
      const nestedKey = key.charAt(0).toLowerCase() + key.slice(1);
      dictionary = message[key] ?? message[nestedKey];
    }

    if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
      dictionary = this.isIndexedItemDictionary(message) ? message : undefined;
    }

    if (!dictionary || typeof dictionary !== 'object' || Array.isArray(dictionary)) {
      return [];
    }

    return Object.values(dictionary as Record<string, T>);
  }

  private isIndexedItemDictionary(message: Record<string, unknown>): boolean {
    const entries = Object.entries(message);
    if (!entries.length) {
      return false;
    }

    return entries.every(
      ([entryKey, entryValue]) =>
        /^\d+$/.test(entryKey) &&
        entryValue !== null &&
        typeof entryValue === 'object' &&
        !Array.isArray(entryValue),
    );
  }

  private readString(item: Record<string, unknown>, key: string): string {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    const value = item[key] ?? item[camelKey];
    return value === undefined || value === null ? '' : String(value);
  }

  private readNumber(item: Record<string, unknown>, key: string): number {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    return Number(item[key] ?? item[camelKey] ?? 0);
  }

  private readBoolean(item: Record<string, unknown>, key: string): boolean {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    return Boolean(item[key] ?? item[camelKey]);
  }

  // #endregion

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
