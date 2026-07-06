import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  CreateDonationRequestRequest,
  DonationRequestDetails,
  DonationRequestDetailsBackend,
  DonationRequestWorkflowItem,
  ListEntityDonationRequestsRequest,
  UpdateDonationRequestRequest,
} from '../../models/donation-request.model';

@Injectable({
  providedIn: 'root',
})
export class DonationRequestsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) { }

  createDonationRequest(dto: CreateDonationRequestRequest): Observable<any> {
    return this.createDonationRequestRaw(this.buildCreateParams(dto));
  }

  updateDonationRequest(dto: UpdateDonationRequestRequest): Observable<any> {
    return this.updateDonationRequestRaw(this.buildUpdateParams(dto));
  }

  listEntityDonationRequests(filter: ListEntityDonationRequestsRequest): Observable<any> {
    return this.listEntityDonationRequestsRaw(
      filter.entityId,
      filter.statusFilter,
      filter.lastRequestId,
      filter.filterCount,
      filter.textFilter,
    );
  }

  submitDonationRequestForReview(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100202, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  deleteDonationRequest(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100203, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getDonationRequestDetails(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100204, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getDonationRequestWorkflow(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100206, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractDonationRequestId(message: unknown): number {
    return Number(message);
  }

  mapDonationRequestDetails(raw: DonationRequestDetailsBackend | null | undefined): DonationRequestDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Request_ID || ''),
      entityId: Number(raw.Entity_ID || 0),
      donationTypeId: Number(raw.Donation_Type_ID || 0),
      donationCategoryId: Number(raw.Donation_Category_ID || 0),
      title: this.localStorageService.pickRequestContentField(
        String(raw.Title || ''),
        String(raw.Title_Regional || ''),
      ),
      description: this.localStorageService.pickRequestContentField(
        String(raw.Description || ''),
        String(raw.Description_Regional || ''),
      ),
      statusId: Number(raw.Donation_Request_Status_ID || 0),
      statusCode: String(raw.Status_Code || ''),
      quantity: Number(raw.Quantity || 0),
      unit: String(raw.Unit || ''),
      estimatedCost: Number(raw.Estimated_Cost || 0),
      currencyCode: String(raw.Currency_Code || ''),
      needsInstallation: Boolean(raw.Needs_Installation),
      isRegional: Boolean(raw.Is_Regional),
      address: this.localStorageService.pickRequestContentField(
        String(raw.Address || ''),
        String(raw.Address_Regional || ''),
      ),
      latitude: Number(raw.Latitude || 0),
      longitude: Number(raw.Longitude || 0),
      city: String(raw.City || ''),
      countryCode: String(raw.Country_Code || ''),
      reviewNote: String(raw.Admin_Review_Note || raw.Review_Note || ''),
      createdAt: String(raw.Created_At || ''),
    };
  }

  extractDonationRequestDetails(message: Record<string, unknown> | undefined): DonationRequestDetailsBackend | null {
    if (!message) {
      return null;
    }

    const nested = message['Donation_Request'] ?? message['donation_Request'];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as DonationRequestDetailsBackend;
    }

    if (
      message['Donation_Request_ID'] !== undefined ||
      message['Donation_Category_ID'] !== undefined
    ) {
      return message as DonationRequestDetailsBackend;
    }

    return null;
  }

  extractWorkflowHistory(message: unknown): Record<string, unknown>[] {
    if (!message) {
      return [];
    }

    if (Array.isArray(message)) {
      return message as Record<string, unknown>[];
    }

    if (typeof message !== 'object') {
      return [];
    }

    const record = message as Record<string, unknown>;
    const nestedHistory = record['History'] ?? record['history'];
    if (nestedHistory) {
      return this.extractWorkflowHistory(nestedHistory);
    }

    return Object.values(record).filter(
      (entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry),
    ) as Record<string, unknown>[];
  }

  mapDonationRequestWorkflow(history: Record<string, unknown>[] | null | undefined): DonationRequestWorkflowItem[] {
    if (!history?.length) {
      return [];
    }

    return history.map((item) => ({
      statusId: Number(item['New_Status_ID'] ?? item['new_Status_ID'] ?? 0),
      statusName: this.localStorageService.pickLocalizedField(
        this.readWorkflowField(item, 'Status_Name'),
        this.readWorkflowField(item, 'Status_Name_Regional'),
      ),
      changedAt: this.readWorkflowField(item, 'Created_At'),
    }));
  }

  private readWorkflowField(item: Record<string, unknown>, key: string): string {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    for (const candidate of [key, camelKey]) {
      const value = item[candidate];
      if (value !== undefined && value !== null) {
        return String(value);
      }
    }
    return '';
  }

  private createDonationRequestRaw(params: string[]): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100200, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  private updateDonationRequestRaw(params: string[]): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100201, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  private listEntityDonationRequestsRaw(
    entityId: number,
    statusFilter: number[],
    lastRequestId: number,
    filterCount: number,
    textFilter: string,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      entityId.toString(),
      this.formatIntegerList(statusFilter),
      lastRequestId.toString(),
      filterCount.toString(),
      textFilter || '',
    ];
    return this.apiServices.callAPI(100205, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  private buildCreateParams(dto: CreateDonationRequestRequest): string[] {
    return [
      dto.entityId.toString(),
      dto.donationCategoryId.toString(),
      dto.title,
      dto.description,
      dto.isRegional.toString(),
      dto.quantity.toString(),
      dto.unit,
      dto.estimatedCost.toString(),
      dto.currencyCode.toUpperCase(),
      dto.needsInstallation.toString(),
      dto.address,
      dto.latitude.toString(),
      dto.longitude.toString(),
      dto.city,
      dto.countryCode.toUpperCase(),
    ];
  }

  private buildUpdateParams(dto: UpdateDonationRequestRequest): string[] {
    return [
      dto.donationRequestId.toString(),
      dto.donationCategoryId.toString(),
      dto.title,
      dto.description,
      dto.isRegional.toString(),
      dto.quantity.toString(),
      dto.unit,
      dto.estimatedCost.toString(),
      dto.currencyCode.toUpperCase(),
      dto.needsInstallation.toString(),
      dto.address,
      dto.latitude.toString(),
      dto.longitude.toString(),
      dto.city,
      dto.countryCode.toUpperCase(),
    ];
  }

  private formatIntegerList(numbers: number[]): string {
    if (!numbers || numbers.length === 0) {
      return '{}';
    }
    const uniqueNumbers = [...new Set(numbers)];
    return `{${uniqueNumbers.join(',')}}`;
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
