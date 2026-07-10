import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  AcceptDonationRequest,
  DonationCommitmentBackend,
  DonationCommitmentDetails,
  DonationCommitmentListItem,
  SetFulfillmentModeRequest,
} from '../../models/donation-commitment.model';
import { requiresCharityEntity } from '../../models/fulfillment-mode.model';

@Injectable({
  providedIn: 'root',
})
export class DonationCommitmentService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) { }

  acceptDonation(dto: AcceptDonationRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const charityEntityId = requiresCharityEntity(dto.fulfillmentMode) ? dto.charityEntityId : 0;
    const params = [
      dto.donationRequestId.toString(),
      dto.isAnonymous.toString(),
      dto.fulfillmentMode.toString(),
      charityEntityId.toString(),
      dto.expectedClosureAt,
    ];
    return this.apiServices.callAPI(100500, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  cancelDonationCommitment(donationCommitmentId: number, reason: string): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices
      .callAPI(100501, this.getAccessToken(), [donationCommitmentId.toString(), reason.trim()])
      .pipe(finalize(() => this.isLoadingSubject.next(false)));
  }

  getDonationCommitmentDetails(donationCommitmentId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100502, this.getAccessToken(), [donationCommitmentId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  listDonorCommitments(
    donorUserId: number,
    statusFilter: number[],
    lastCommitmentId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      donorUserId.toString(),
      this.formatIntegerList(statusFilter),
      lastCommitmentId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(100503, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  setDonationFulfillmentMode(dto: SetFulfillmentModeRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const charityEntityId = requiresCharityEntity(dto.fulfillmentMode) ? dto.charityEntityId : 0;
    const params = [
      dto.donationCommitmentId.toString(),
      dto.fulfillmentMode.toString(),
      charityEntityId.toString(),
    ];
    return this.apiServices.callAPI(100504, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractCommitments(message: Record<string, unknown> | undefined): DonationCommitmentBackend[] {
    const list = message?.['Commitments'] ?? message?.['commitments'];
    if (Array.isArray(list)) {
      return list as DonationCommitmentBackend[];
    }
    if (list && typeof list === 'object') {
      return Object.values(list as Record<string, DonationCommitmentBackend>);
    }
    return [];
  }

  mapCommitmentListItems(rawItems: DonationCommitmentBackend[]): DonationCommitmentListItem[] {
    return rawItems.map((item) => ({
      id: String(item.Donation_Commitment_ID || ''),
      donationRequestId: String(item.Donation_Request_ID || ''),
      entityId: Number(item.Entity_ID || 0),
      statusId: Number(item.Status_ID ?? item.Status ?? 0),
      title: this.localStorageService.pickRequestContentField(
        String(item.Request_Title || item.Title || ''),
        String(item.Request_Title_Regional || item.Title_Regional || ''),
      ),
      fulfillmentMode: Number(item.Fulfillment_Mode || 0),
      isAnonymous: Boolean(item.Is_Anonymous),
      expectedClosureAt: String(item.Expected_Closure_At || ''),
      acceptedAt: String(item.Accepted_At || ''),
    }));
  }

  mapDonationCommitmentDetails(raw: DonationCommitmentBackend | null | undefined): DonationCommitmentDetails | null {
    if (!raw) {
      return null;
    }

    return {
      id: String(raw.Donation_Commitment_ID || ''),
      donationRequestId: String(raw.Donation_Request_ID || ''),
      statusId: Number(raw.Status_ID ?? raw.Status ?? 0),
      statusCode: '',
      donorUserId: Number(raw.Donor_User_ID || 0),
      entityId: Number(raw.Entity_ID || 0),
      isAnonymous: Boolean(raw.Is_Anonymous),
      fulfillmentMode: Number(raw.Fulfillment_Mode || 0),
      charityEntityId: Number(raw.Charity_Entity_ID || 0),
      charityRepUserId: Number(raw.Charity_Rep_User_ID || 0),
      expectedClosureAt: String(raw.Expected_Closure_At || ''),
      acceptedAt: String(raw.Accepted_At || ''),
      cancelledAt: String(raw.Cancelled_At || ''),
      cancelledByUserId: Number(raw.Cancelled_By_User_ID || 0),
      cancelReason: String(raw.Cancel_Reason || ''),
      completedAt: String(raw.Completed_At || ''),
      title: this.localStorageService.pickRequestContentField(
        String(raw.Request_Title || raw.Title || ''),
        String(raw.Request_Title_Regional || raw.Title_Regional || ''),
      ),
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
