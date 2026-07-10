import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { BrowseDonationRequestsFilter } from '../../models/donation-request.model';

@Injectable({
  providedIn: 'root',
})
export class DonationBrowseService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  browseDonationRequests(filter: BrowseDonationRequestsFilter): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = this.buildBrowseParams(filter);
    return this.apiServices.callAPI(100400, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  getDonationRequestPublicDetails(donationRequestId: number): Observable<any> {
    this.isLoadingSubject.next(true);
    return this.apiServices.callAPI(100401, this.getAccessToken(), [donationRequestId.toString()]).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  private buildBrowseParams(filter: BrowseDonationRequestsFilter): string[] {
    // TODO: Confirm with backend if a different "ignore filter" convention applies for empty/zero values.
    return [
      this.formatIntegerList(filter.categoryFilter),
      String(filter.latitude ?? 0),
      String(filter.longitude ?? 0),
      String(filter.radiusKm ?? 0),
      String(filter.maxEstimatedCost ?? 0),
      filter.countryCode || '',
      filter.city || '',
      String(filter.sortBy ?? 0),
      String(filter.lastRequestId),
      String(filter.filterCount),
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
