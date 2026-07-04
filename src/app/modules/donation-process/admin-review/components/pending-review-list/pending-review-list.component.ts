import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationAdminService } from '../../services/donation-admin.service';

@Component({
  standalone: false,
  selector: 'app-pending-review-list',
  templateUrl: './pending-review-list.component.html',
  styleUrl: './pending-review-list.component.scss',
})
export class PendingReviewListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  textFilter = '';
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;
  initialLoading = true;

  private statuses: DonationRequestStatusBackend[] = [];
  private searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private donationAdminService: DonationAdminService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.loadStatuses();
    this.loadRequests();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationRequestBackend[] {
    if (this.tableLoadingSpinner && this.requests.length === 0) {
      return Array(this.rows).fill(null).map(() => ({}));
    }
    return this.requests;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadRequests();
  }

  onSearchInput(value: string): void {
    this.textFilter = value;
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    this.searchDebounceTimer = setTimeout(() => {
      this.first = 0;
      this.loadRequests();
    }, 300);
  }

  getTitle(row: DonationRequestBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(row.Title || ''),
      String(row.Title_Regional || ''),
    );
  }

  getPendingReviewStatusLabel(): string {
    const item = this.statuses.find((status) => String(status.Code || '').toUpperCase() === 'PENDING_REVIEW');
    return item ? this.getStatusName(item) : '';
  }

  formatEstimatedCost(row: DonationRequestBackend): string {
    if (!row.Estimated_Cost) {
      return '-';
    }
    return `${row.Estimated_Cost} ${row.Currency_Code || ''}`.trim();
  }

  private loadStatuses(): void {
    const sub = this.donationReferenceService.listDonationRequestStatuses().subscribe({
      next: (response: any) => {
        if (!response?.success) {
          return;
        }
        this.statuses = Object.values(response.message ?? {});
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationAdminService
      .listPendingReviewRequests(lastRequestId, this.rows, this.textFilter)
      .subscribe({
        next: (response: any) => {
          console.log('listPendingReviewRequests response', response);
          if (!response?.success) {
            this.tableLoadingSpinner = false;
            this.initialLoading = false;
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.requests = response.message?.Donation_Requests ?? [];
        },
        error: () => {
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
          this.initialLoading = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private getStatusName(item: DonationRequestStatusBackend): string {
    return this.localStorageService.pickLocalizedField(
      String(item.Name || ''),
      String(item.Name_Regional || ''),
    );
  }
}
