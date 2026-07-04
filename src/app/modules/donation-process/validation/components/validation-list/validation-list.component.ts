import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestBackend } from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationValidationService } from '../../services/donation-validation.service';

@Component({
  standalone: false,
  selector: 'app-validation-list',
  templateUrl: './validation-list.component.html',
  styleUrl: './validation-list.component.scss',
})
export class ValidationListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestBackend[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private statuses: DonationRequestStatusBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private donationValidationService: DonationValidationService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
      }),
    );
    this.loadStatuses();
    this.loadRequests();
  }

  ngOnDestroy(): void {
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

  getTitle(row: DonationRequestBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(row.Title || ''),
      String(row.Title_Regional || ''),
    );
  }

  getStatusLabel(statusId: number): string {
    return this.statusLabelById[statusId] || '';
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
        this.statuses = Object.values(response.message?.Request_Statuses ?? {});
        this.buildStatusMaps();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationValidationService
      .listDonationsOpenForValidation([], lastRequestId, this.rows)
      .subscribe({
        next: (response: any) => {
          console.log('validation list response', response);
          if (!response?.success) {
            this.tableLoadingSpinner = false;
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.requests = response.message?.Donation_Requests ?? [];
        },
        error: () => {
          this.tableLoadingSpinner = false;
        },
        complete: () => {
          this.tableLoadingSpinner = false;
        },
      });
    this.subscriptions.push(sub);
  }

  private buildStatusMaps(): void {
    this.statusLabelById = {};
    for (const item of this.statuses) {
      const id = Number(item.Donation_Request_Status_ID || 0);
      if (!id) {
        continue;
      }
      this.statusLabelById[id] = this.localStorageService.pickLocalizedField(
        String(item.Name || ''),
        String(item.Name_Regional || ''),
      );
    }
  }
}
