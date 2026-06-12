import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { DonationCommitmentBackend, DonationCommitmentListItem } from '../../models/donation-commitment.model';

@Injectable({
  providedIn: 'root',
})
export class DonationCommitmentService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

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

  mapCommitmentListItems(rawItems: DonationCommitmentBackend[]): DonationCommitmentListItem[] {
    return rawItems.map((item) => ({
      id: String(item.Donation_Commitment_ID || ''),
      donationRequestId: String(item.Donation_Request_ID || ''),
      statusId: Number(item.Status_ID || 0),
      expectedClosureAt: String(item.Expected_Closure_At || ''),
      createdAt: String(item.Created_At || ''),
    }));
  }

  extractCommitments(message: Record<string, unknown> | undefined): DonationCommitmentBackend[] {
    const list = message?.['Commitments'];
    if (Array.isArray(list)) {
      return list as DonationCommitmentBackend[];
    }
    if (list && typeof list === 'object') {
      return Object.values(list as Record<string, DonationCommitmentBackend>);
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
