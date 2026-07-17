import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize, tap } from 'rxjs';
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
      tap((response) => console.log('listDonationRequestStatuses response', response)),
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
      this.localStorageService.isRegionalApiInput().toString(),
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
    return [...rawItems]
      .sort(
        (a, b) =>
          this.readNumber(a as Record<string, unknown>, 'Default_Order', ['default_Order']) -
          this.readNumber(b as Record<string, unknown>, 'Default_Order', ['default_Order']),
      )
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          id: this.readNumber(record, 'Donation_Type_ID'),
          code: this.readString(record, 'Code'),
          name: this.localStorageService.pickLocalizedField(
            this.readString(record, 'Name'),
            this.readString(record, 'Name_Regional'),
          ),
          description: this.localStorageService.pickLocalizedField(
            this.readString(record, 'Description'),
            this.readString(record, 'Description_Regional'),
          ),
          active: this.readBoolean(record, 'Is_Active', ['is_Active']),
        };
      })
      .filter((item) => item.id > 0);
  }

  mapDonationCategories(rawItems: DonationCategoryBackend[]): DonationCategory[] {
    return rawItems
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          id: this.readNumber(record, 'Donation_Category_ID'),
          donationTypeId: this.readNumber(record, 'Donation_Type_ID'),
          code: this.readString(record, 'Code'),
          name: this.localStorageService.pickLocalizedField(
            this.readString(record, 'Name'),
            this.readString(record, 'Name_Regional'),
          ),
          isService: this.readBoolean(record, 'Is_Service'),
          defaultOrder: this.readNumber(record, 'Default_Order'),
          active: this.readBoolean(record, 'Is_Active'),
        };
      })
      .sort((a, b) => a.defaultOrder - b.defaultOrder);
  }

  mapDonationRequestStatuses(rawItems: DonationRequestStatusBackend[]): DonationRequestStatus[] {
    return rawItems
      .map((item) => {
        const record = item as Record<string, unknown>;
        return {
          id: this.readNumber(record, 'Donation_Request_Status_ID', ['Status_ID']),
          code: this.readString(record, 'Code'),
          name: this.localStorageService.pickLocalizedField(
            this.readString(record, 'Name'),
            this.readString(record, 'Name_Regional'),
          ),
        };
      })
      .filter((item) => item.id > 0)
      .sort((a, b) => a.id - b.id);
  }

  extractDonationCategories(message: Record<string, unknown> | undefined): DonationCategoryBackend[] {
    return this.extractDictionaryItems<DonationCategoryBackend>(message, ['Donation_Categories']);
  }

  extractDonationTypes(message: Record<string, unknown> | undefined): DonationTypeBackend[] {
    return this.extractDictionaryItems<DonationTypeBackend>(message, ['Donation_Types']);
  }

  extractDonationRequestStatuses(message: Record<string, unknown> | undefined): DonationRequestStatusBackend[] {
    return this.extractDictionaryItems<DonationRequestStatusBackend>(message, [
      'Request_Statuses',
      'Donation_Request_Statuses',
    ]);
  }

  findStatusIdByCode(rawItems: DonationRequestStatusBackend[], code: string): number {
    const normalizedCode = code.toUpperCase();
    return (
      this.mapDonationRequestStatuses(rawItems).find((item) => item.code.toUpperCase() === normalizedCode)?.id ?? 0
    );
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

  extractDictionaryItems<T>(
    message: Record<string, unknown> | undefined,
    keys?: string | string[],
  ): T[] {
    if (!message) {
      return [];
    }

    const keyList = keys ? (Array.isArray(keys) ? keys : [keys]) : [];

    for (const key of keyList) {
      const nestedKey = key.charAt(0).toLowerCase() + key.slice(1);
      const dictionary = message[key] ?? message[nestedKey];
      if (dictionary && typeof dictionary === 'object' && !Array.isArray(dictionary)) {
        return Object.values(dictionary as Record<string, T>);
      }
    }

    if (this.isIndexedItemDictionary(message)) {
      return Object.values(message as Record<string, T>);
    }

    return [];
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

  private readString(item: Record<string, unknown>, key: string, alternateKeys: string[] = []): string {
    for (const candidate of this.buildKeyCandidates(key, alternateKeys)) {
      const value = item[candidate];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return '';
  }

  private readNumber(item: Record<string, unknown>, key: string, alternateKeys: string[] = []): number {
    for (const candidate of this.buildKeyCandidates(key, alternateKeys)) {
      const value = item[candidate];
      if (value !== undefined && value !== null && value !== '') {
        return Number(value);
      }
    }
    return 0;
  }

  private readBoolean(item: Record<string, unknown>, key: string, alternateKeys: string[] = []): boolean {
    for (const candidate of this.buildKeyCandidates(key, alternateKeys)) {
      const value = item[candidate];
      if (value !== undefined && value !== null) {
        return Boolean(value);
      }
    }
    return false;
  }

  private buildKeyCandidates(key: string, alternateKeys: string[]): string[] {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    return [...new Set([key, camelKey, ...alternateKeys])];
  }

  // #endregion

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
