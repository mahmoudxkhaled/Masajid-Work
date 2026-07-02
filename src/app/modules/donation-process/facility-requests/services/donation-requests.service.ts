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

  extractDonationRequestId(message: Record<string, unknown> | undefined): number {
    return Number(message?.['Donation_Request_ID'] ?? 0);
  }

  mapDonationRequestDetails(raw: DonationRequestDetailsBackend | null | undefined): DonationRequestDetails | null {
    if (!raw) {
      return null;
    }

    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return {
      id: String(raw.Donation_Request_ID || ''),
      entityId: Number(raw.Entity_ID || 0),
      donationTypeId: Number(raw.Donation_Type_ID || 0),
      donationCategoryId: Number(raw.Donation_Category_ID || 0),
      title: isRegional
        ? String(raw.Title_Regional || raw.Title || '')
        : String(raw.Title || ''),
      description: isRegional
        ? String(raw.Description_Regional || raw.Description || '')
        : String(raw.Description || ''),
      statusId: Number(raw.Donation_Request_Status_ID || 0),
      statusCode: String(raw.Status_Code || ''),
      quantity: Number(raw.Quantity || 0),
      unit: String(raw.Unit || ''),
      estimatedCost: Number(raw.Estimated_Cost || 0),
      currencyCode: String(raw.Currency_Code || ''),
      needsInstallation: Boolean(raw.Needs_Installation),
      isRegional: Boolean(raw.Is_Regional),
      address: isRegional
        ? String(raw.Address_Regional || raw.Address || '')
        : String(raw.Address || ''),
      latitude: Number(raw.Latitude || 0),
      longitude: Number(raw.Longitude || 0),
      city: String(raw.City || ''),
      countryCode: String(raw.Country_Code || ''),
      reviewNote: String(raw.Admin_Review_Note || raw.Review_Note || ''),
      createdAt: String(raw.Created_At || ''),
    };
  }

  mapDonationRequestWorkflow(history: Record<string, unknown>[] | null | undefined): DonationRequestWorkflowItem[] {
    if (!history?.length) {
      return [];
    }

    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';

    return history.map((item) => ({
      statusId: Number(item['New_Status_ID'] ?? 0),
      statusName: isRegional
        ? String(item['Status_Name_Regional'] ?? item['Status_Name'] ?? '')
        : String(item['Status_Name'] ?? ''),
      changedAt: String(item['Created_At'] ?? ''),
      changedBy: String(item['Actor_User_ID'] ?? ''),
      note: String(item['Note'] ?? ''),
    }));
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
