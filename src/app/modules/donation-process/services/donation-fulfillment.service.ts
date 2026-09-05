import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  DonationFulfillmentBackend,
  DonationFulfillmentDetails,
  DonationFulfillmentListItem,
  SubmitFulfillmentProofRequest,
} from '../models/donation-fulfillment.model';

@Injectable({
  providedIn: 'root',
})
export class DonationFulfillmentService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) { }

  submitFulfillmentProof(dto: SubmitFulfillmentProofRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationCommitmentId.toString(),
      dto.fulfilledBy.toString(),
      dto.donationVendorOfferId.toString(),
      String(dto.fulfillmentNote || '').trim(),
      dto.isRegional.toString(),
      this.formatIntegerList([]),
      '0',
      '0',
    ];
    console.log('submitFulfillmentProof params', params);
    return this.apiServices.callAPI(100800, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getFulfillmentDetails(donationFulfillmentId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100801, this.getAccessToken(), [donationFulfillmentId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  listFulfillments(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100802, this.getAccessToken(), [donationRequestId.toString()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  confirmFulfillment(donationFulfillmentId: number, responseNote: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationFulfillmentId.toString(), String(responseNote || '').trim()];
    console.log('confirmFulfillment params', params);
    return this.apiServices.callAPI(100803, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  rejectFulfillment(donationFulfillmentId: number, responseNote: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [donationFulfillmentId.toString(), String(responseNote || '').trim()];
    console.log('rejectFulfillment params', params);
    return this.apiServices.callAPI(100804, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractFulfillmentId(message: unknown): number {
    if (typeof message === 'number' || typeof message === 'string') {
      return Number(message);
    }
    if (message && typeof message === 'object') {
      const record = message as Record<string, unknown>;
      return Number(record['Donation_Fulfillment_ID'] ?? 0);
    }
    return 0;
  }

  extractFulfillmentDetails(message: unknown): DonationFulfillmentBackend | null {
    if (!message || typeof message !== 'object') {
      return null;
    }
    return message as DonationFulfillmentBackend;
  }

  mapFulfillmentListItem(raw: DonationFulfillmentBackend): DonationFulfillmentListItem {
    return {
      id: String(raw.Donation_Fulfillment_ID || ''),
      fulfilledBy: Number(raw.Fulfilled_By || 0),
      fulfillmentNote: this.localStorageService.pickRequestContentField(
        String(raw.Fulfillment_Note || ''),
        String(raw.Fulfillment_Note_Regional || ''),
      ),
      donationVendorOfferId: Number(raw.Donation_Vendor_Offer_ID || 0),
      statusId: Number(raw.Status || 0),
      createdAt: String(raw.Submitted_At || ''),
    };
  }

  mapFulfillmentDetails(raw: DonationFulfillmentBackend | null | undefined): DonationFulfillmentDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Fulfillment_ID || ''),
      donationCommitmentId: String(raw.Donation_Commitment_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      donorUserId: Number(raw.Donor_User_ID || 0),
      fulfilledBy: Number(raw.Fulfilled_By || 0),
      fulfillmentNote: this.localStorageService.pickRequestContentField(
        String(raw.Fulfillment_Note || ''),
        String(raw.Fulfillment_Note_Regional || ''),
      ),
      donationVendorOfferId: Number(raw.Donation_Vendor_Offer_ID || 0),
      statusId: Number(raw.Status || 0),
      createdAt: String(raw.Submitted_At || ''),
      facilityResponseUserId: Number(raw.Facility_Response_User_ID || 0),
      facilityResponseNote: String(raw.Facility_Response_Note || ''),
      facilityResponseAt: String(raw.Facility_Response_At || ''),
      validationOpensAt: String(raw.Validation_Opens_At || ''),
      rejectionConfirmedAt: String(raw.Rejection_Confirmed_At || ''),
      rejectionConfirmedByUserId: Number(raw.Rejection_Confirmed_By_User_ID || 0),
      rejectionValid: raw.Rejection_Valid == null ? null : Boolean(raw.Rejection_Valid),
    };
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
