import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { DonationRequestBackend, DonationRequestListItem } from '../../models/donation-request.model';

@Injectable({
  providedIn: 'root',
})
export class DonationRequestsService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  createDonationRequest(params: string[]): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100200, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  updateDonationRequest(params: string[]): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100201, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
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

  listEntityDonationRequests(
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

  getDonationRequestWorkflow(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100206, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  mapDonationRequestListItems(rawItems: DonationRequestBackend[]): DonationRequestListItem[] {
    const isRegional = this.localStorageService.getPreferredLanguageCode() === 'ar';
    return rawItems.map((item) => ({
      id: String(item.Donation_Request_ID || ''),
      title: isRegional ? String(item.Title_Regional || item.Title || '') : String(item.Title || ''),
      statusId: Number(item.Status_ID || 0),
      categoryId: Number(item.Donation_Category_ID || 0),
      estimatedCost: Number(item.Estimated_Cost || 0),
      currencyCode: String(item.Currency_Code || ''),
      createdAt: String(item.Created_At || ''),
    }));
  }

  extractDonationRequests(message: Record<string, unknown> | undefined): DonationRequestBackend[] {
    const list = message?.['Donation_Requests'];
    if (Array.isArray(list)) {
      return list as DonationRequestBackend[];
    }
    if (list && typeof list === 'object') {
      return Object.values(list as Record<string, DonationRequestBackend>);
    }
    return [];
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
