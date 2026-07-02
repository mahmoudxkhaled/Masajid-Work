import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, finalize } from 'rxjs';
import { ApiService } from 'src/app/core/api/api.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';

@Injectable({
  providedIn: 'root',
})
export class DonationAdminService {
  isLoadingSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private apiServices: ApiService,
    private localStorageService: LocalStorageService,
  ) {}

  listPendingReviewRequests(lastRequestId: number, filterCount: number, textFilter: string): Observable<any> {
    this.isLoadingSubject.next(true);
    const params = [lastRequestId.toString(), filterCount.toString(), textFilter || ''];
    return this.apiServices.callAPI(100300, this.getAccessToken(), params).pipe(
      finalize(() => this.isLoadingSubject.next(false)),
    );
  }

  private getAccessToken(): string {
    return this.localStorageService.getAccessToken();
  }
}
