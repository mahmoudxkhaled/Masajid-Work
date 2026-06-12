import { Component, OnDestroy, OnInit } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestBackend, DonationRequestListItem } from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationBrowseService } from '../../services/donation-browse.service';

@Component({
  standalone: false,
  selector: 'app-browse-donations-list',
  templateUrl: './browse-donations-list.component.html',
  styleUrl: './browse-donations-list.component.scss',
})
export class BrowseDonationsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestListItem[] = [];
  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private rawRequests: DonationRequestBackend[] = [];
  private rawStatuses: DonationRequestStatusBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private donationBrowseService: DonationBrowseService,
    private donationReferenceService: DonationReferenceService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapRequests();
        this.remapStatuses();
      }),
    );
    this.loadStatuses();
    this.loadRequests();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationRequestListItem[] {
    if (this.tableLoadingSpinner && this.requests.length === 0) {
      return Array(this.rows).fill(null).map(() => ({
        id: '',
        title: '',
        statusId: 0,
        categoryId: 0,
        estimatedCost: 0,
        currencyCode: '',
        createdAt: '',
      }));
    }
    return this.requests;
  }

  onPageChange(event: any): void {
    this.first = event?.first ?? 0;
    this.rows = event?.rows ?? this.rows;
    this.loadRequests();
  }

  getStatusLabel(statusId: number): string {
    return this.statusLabelById[statusId] || '';
  }

  getStatusSeverity(statusId: number): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const code = this.rawStatuses.find((item) => Number(item.Status_ID) === statusId)?.Code || '';
    if (String(code).toUpperCase() === 'PUBLISHED') {
      return 'success';
    }
    return 'info';
  }

  formatEstimatedCost(row: DonationRequestListItem): string {
    if (!row.estimatedCost) {
      return '-';
    }
    return `${row.estimatedCost} ${row.currencyCode || ''}`.trim();
  }

  private loadStatuses(): void {
    const sub = this.donationReferenceService.listDonationRequestStatuses().subscribe({
      next: (response: any) => {
        if (!response?.success) {
          return;
        }
        this.rawStatuses = this.donationReferenceService.extractDictionaryItems<DonationRequestStatusBackend>(
          response.message,
          'Request_Statuses',
        );
        this.remapStatuses();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadRequests(): void {
    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;

    const sub = this.donationBrowseService.browseDonationRequests([], lastRequestId, this.rows).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.tableLoadingSpinner = false;
          return;
        }
        this.totalRecords = Number(response.message?.Total_Count || 0);
        this.rawRequests = this.donationBrowseService.extractBrowseRequests(response.message);
        this.remapRequests();
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

  private remapRequests(): void {
    this.requests = this.donationBrowseService.mapBrowseRequests(this.rawRequests);
  }

  private remapStatuses(): void {
    const statuses = this.donationReferenceService.mapDonationRequestStatuses(this.rawStatuses);
    this.statusLabelById = statuses.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
  }
}
