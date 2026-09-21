import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  DonationBreakdownRequestStatus,
  resolveBreakdownStatusId,
} from '../models/donation-breakdown-request-status.model';
import {
  CreateBreakdownItemInput,
  CreateBreakdownRequestDto,
  DonationBreakdownItem,
  DonationBreakdownItemBackend,
  DonationBreakdownRequestBackend,
  DonationBreakdownRequestDetails,
  DonationBreakdownRequestListItem,
} from '../models/donation-breakdown-request.model';

@Injectable({
  providedIn: 'root',
})
export class DonationBreakdownService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  createBreakdownRequest(dto: CreateBreakdownRequestDto): Observable<any> {
    this.isLoadingSubject.next(true);
    console.log('createBreakdownRequest dto', dto);
    const apiItems = this.formatBreakdownItemsForApi(dto.items);
    console.log('createBreakdownRequest apiItems', apiItems);
    if (!apiItems.length || apiItems.length % 6 !== 0) {
      this.isLoadingSubject.next(false);
      throw new Error(
        'Invalid breakdown items format. Items must be flat List<string> with groups of 6.',
      );
    }

    const params = [
      dto.donationCommitmentId.toString(),
      JSON.stringify(apiItems),
      dto.isRegional.toString(),
    ];
    console.log('createBreakdownRequest params', params);
    return this.apiServices.callAPI(100900, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getBreakdownRequestDetails(donationBreakdownRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100901, this.getAccessToken(), [donationBreakdownRequestId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  listBreakdownRequests(donationRequestId: number, statusFilter: number[] = []): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationRequestId.toString(), this.formatIntegerList(statusFilter)];
    console.log('listBreakdownRequests params', params);
    return this.apiServices.callAPI(100902, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  confirmBreakdownRequest(donationBreakdownRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationBreakdownRequestId.toString()];
    console.log('confirmBreakdownRequest params', params);
    return this.apiServices.callAPI(100903, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  applyBreakdownRequest(donationBreakdownRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationBreakdownRequestId.toString()];
    console.log('applyBreakdownRequest params', params);
    return this.apiServices.callAPI(100904, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  rejectBreakdownRequest(donationBreakdownRequestId: number, rejectionNote: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationBreakdownRequestId.toString(), String(rejectionNote || '').trim()];
    console.log('rejectBreakdownRequest params', params);
    return this.apiServices.callAPI(100905, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractSubRequestIds(message: unknown): number[] {
    if (!message) {
      return [];
    }
    if (Array.isArray(message)) {
      return message.map((value) => Number(value)).filter((id) => id > 0);
    }
    if (typeof message !== 'object') {
      return [];
    }
    const record = message as Record<string, unknown>;
    const list =
      record['Sub_Request_IDs'] ??
      record['Sub_Donation_Request_IDs'] ??
      record['Created_Request_IDs'] ??
      record['Donation_Request_IDs'];
    if (Array.isArray(list)) {
      return list.map((value) => Number(value)).filter((id) => id > 0);
    }
    if (list && typeof list === 'object') {
      return Object.values(list as Record<string, unknown>)
        .map((value) => Number(value))
        .filter((id) => id > 0);
    }
    return [];
  }

  extractBreakdownRequestId(message: unknown): number {
    if (typeof message === 'number' || typeof message === 'string') {
      return Number(message);
    }
    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      return Number(record['Donation_Breakdown_Request_ID'] ?? 0);
    }
    return 0;
  }

  filterConfirmedBreakdownRequests(
    items: DonationBreakdownRequestListItem[],
  ): DonationBreakdownRequestListItem[] {
    return items.filter((item) => item.statusId === DonationBreakdownRequestStatus.Confirmed);
  }

  mapBreakdownRequestListItem(raw: DonationBreakdownRequestBackend): DonationBreakdownRequestListItem {
    const statusId = resolveBreakdownStatusId(raw.Status);
    const donationBreakdownRequestId = String(raw.Donation_Breakdown_Request_ID || '');
    return {
      id: donationBreakdownRequestId,
      donationBreakdownRequestId,
      donationCommitmentId: String(raw.Commitment_ID || ''),
      statusId,
      status: statusId,
      statusCode: '',
      facilityConfirmedAt: String(raw.Facility_Confirmed_At || ''),
      adminAppliedAt: String(raw.Admin_Applied_At || ''),
      rejectedAt: String(raw.Rejected_At || ''),
    };
  }

  mapBreakdownRequestDetails(
    raw: DonationBreakdownRequestBackend | null | undefined,
  ): DonationBreakdownRequestDetails | null {
    if (!raw) {
      return null;
    }
    const status = this.mapStatus(raw);
    return {
      id: String(raw.Donation_Breakdown_Request_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      donationCommitmentId: String(raw.Commitment_ID || ''),
      statusId: status.statusId,
      statusCode: status.statusCode,
      rejectionNote: String(raw.Rejection_Note || ''),
      items: this.extractItems(raw).map((item) => this.mapBreakdownItem(item)),
    };
  }

  private mapBreakdownItem(raw: DonationBreakdownItemBackend | unknown): DonationBreakdownItem {
    if (Array.isArray(raw)) {
      return {
        title: String(raw[0] || '').trim(),
        description: String(raw[1] || '').trim(),
        quantity: Number(raw[2] || 0),
        estimatedCost: Number(raw[3] || 0),
        currencyCode: String(raw[4] || '').trim().toUpperCase(),
        donorPortion: Boolean(raw[5]),
      };
    }

    const item = (raw || {}) as DonationBreakdownItemBackend;
    return {
      title: this.localStorageService.pickRequestContentField(
        String(item.Title || ''),
        String(item.Title_Regional || ''),
      ),
      description: this.localStorageService.pickRequestContentField(
        String(item.Description || ''),
        String(item.Description_Regional || ''),
      ),
      quantity: Number(item.Quantity || 0),
      estimatedCost: Number(item.Estimated_Cost || 0),
      currencyCode: String(item.Currency_Code || ''),
      donorPortion: Boolean(item.Is_Donor_Portion),
    };
  }

  private extractItems(raw: DonationBreakdownRequestBackend): Array<DonationBreakdownItemBackend | unknown> {
    const list = raw.Items;
    if (Array.isArray(list)) {
      return list;
    }
    if (list && typeof list === 'object') {
      return Object.values(list);
    }
    return [];
  }

  private mapStatus(raw: DonationBreakdownRequestBackend): { statusId: number; statusCode: string } {
    return {
      statusId: resolveBreakdownStatusId(raw.Status, String(raw.Status_Code || '')),
      statusCode: String(raw.Status_Code || ''),
    };
  }

  private formatBreakdownItemsForApi(items: CreateBreakdownItemInput[]): string[] {
    return items.flatMap((item) => [
      String(item.title || '').trim(),
      String(item.description || '').trim(),
      String(Number(item.quantity || 0)),
      String(Number(item.estimatedCost || 0)),
      String(item.currencyCode || '').trim().toUpperCase(),
      item.donorPortion ? 'true' : 'false',
    ]);
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
