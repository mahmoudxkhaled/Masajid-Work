import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { DonationRequestsService } from '../../facility-requests/services/donation-requests.service';

@Injectable({
  providedIn: 'root',
})
export class DonationAdminService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
    private donationRequestsService: DonationRequestsService,
  ) {}

  listPendingReviewRequests(lastRequestId: number, filterCount: number, textFilter: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [lastRequestId.toString(), filterCount.toString(), textFilter || ''];
    return this.apiServices.callAPI(100300, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  extractRequests(message: Record<string, unknown> | undefined) {
    return this.donationRequestsService.extractDonationRequests(message);
  }

  mapRequests(rawItems: Parameters<DonationRequestsService['mapDonationRequestListItems']>[0]) {
    return this.donationRequestsService.mapDonationRequestListItems(rawItems);
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
