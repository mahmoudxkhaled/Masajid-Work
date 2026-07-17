import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import {
  DonationCommitmentBackend,
  DonationCommitmentDetails,
  RespondDonorRepresentationRequest,
} from '../../models/donation-commitment.model';
import { DonationCommitmentService } from '../../commitments/services/donation-commitment.service';

@Injectable({
  providedIn: 'root',
})
export class CharityRepresentationService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
    private donationCommitmentService: DonationCommitmentService,
  ) { }

  listRepresentationRequests(
    charityEntityId: number,
    pendingOnly: boolean,
    lastCommitmentId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      charityEntityId.toString(),
      pendingOnly.toString(),
      lastCommitmentId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(100600, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getDonationCommitmentDetails(donationCommitmentId: number): Observable<any> {
    return this.donationCommitmentService.getDonationCommitmentDetails(donationCommitmentId);
  }

  respondDonorRepresentation(dto: RespondDonorRepresentationRequest): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      dto.donationCommitmentId.toString(),
      dto.accept.toString(),
      String(dto.note || '').trim(),
    ];
    console.log('Respond Donor Representation request', params);
    return this.apiServices.callAPI(100601, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractCommitments(message: Record<string, unknown> | undefined): DonationCommitmentBackend[] {
    return this.donationCommitmentService.extractCommitments(message);
  }

  mapCommitments(rawItems: DonationCommitmentBackend[]) {
    return this.donationCommitmentService.mapCommitmentListItems(rawItems);
  }

  extractCommitmentDetails(message: Record<string, unknown> | null | undefined): DonationCommitmentBackend | null {
    return this.donationCommitmentService.extractCommitmentDetails(message);
  }

  mapCommitmentDetails(raw: DonationCommitmentBackend | null): DonationCommitmentDetails | null {
    return this.donationCommitmentService.mapDonationCommitmentDetails(raw);
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
