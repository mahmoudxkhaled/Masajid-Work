import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DonationValidationService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  listDonationsOpenForValidation(
    categoryFilter: number[],
    lastRequestId: number,
    filterCount: number,
  ): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [
      this.formatIntegerList(categoryFilter),
      '0',
      '0',
      '0',
      lastRequestId.toString(),
      filterCount.toString(),
    ];
    return this.apiServices.callAPI(110000, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
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
