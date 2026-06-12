import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestBackend, DonationRequestListItem } from '../../../models/donation-request.model';
import { DonationRequestStatus, DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityRequestsListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-facility-requests-list',
  templateUrl: './facility-requests-list.component.html',
  styleUrl: './facility-requests-list.component.scss',
})
export class FacilityRequestsListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];

  requests: DonationRequestListItem[] = [];
  statusOptions: { label: string; value: number | null }[] = [];
  selectedStatusId: number | null = null;
  textFilter = '';

  first = 0;
  totalRecords = 0;
  tableLoadingSpinner = false;

  private rawRequests: DonationRequestBackend[] = [];
  private rawStatuses: DonationRequestStatusBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
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

  onSearchInput(value: string): void {
    this.textFilter = value;
    this.first = 0;
    this.loadRequests();
  }

  onStatusFilterChange(): void {
    this.first = 0;
    this.loadRequests();
  }

  goToCreate(): void {
    this.router.navigate(['/donations/facility/requests/new']);
  }

  getStatusLabel(statusId: number): string {
    return this.statusLabelById[statusId] || '';
  }

  getStatusSeverity(statusId: number): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const code = this.rawStatuses.find((item) => Number(item.Status_ID) === statusId)?.Code || '';
    switch (String(code).toUpperCase()) {
      case 'DRAFT':
        return 'secondary';
      case 'PENDING_REVIEW':
        return 'warning';
      case 'PUBLISHED':
      case 'ACCEPTED':
      case 'VALIDATED':
      case 'CLOSED':
        return 'success';
      case 'REJECTED':
      case 'CANCELLED':
        return 'danger';
      case 'IN_FULFILLMENT':
      case 'FULFILLMENT_SUBMITTED':
      case 'OPEN_FOR_VALIDATION':
        return 'info';
      default:
        return 'info';
    }
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
    const entityId = Number(this.localStorageService.getEntityId() || 0);
    if (!entityId) {
      this.requests = [];
      this.totalRecords = 0;
      return;
    }

    this.tableLoadingSpinner = true;
    const currentPage = Math.floor(this.first / this.rows) + 1;
    const lastRequestId = -currentPage;
    const statusFilter = this.selectedStatusId ? [this.selectedStatusId] : [];

    const sub = this.donationRequestsService
      .listEntityDonationRequests(entityId, statusFilter, lastRequestId, this.rows, this.textFilter)
      .subscribe({
        next: (response: any) => {
          if (!response?.success) {
            this.handleBusinessError('list', response);
            return;
          }
          this.totalRecords = Number(response.message?.Total_Count || 0);
          this.rawRequests = this.donationRequestsService.extractDonationRequests(response.message);
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
    this.requests = this.donationRequestsService.mapDonationRequestListItems(this.rawRequests);
  }

  private remapStatuses(): void {
    const statuses: DonationRequestStatus[] = this.donationReferenceService.mapDonationRequestStatuses(this.rawStatuses);
    this.statusLabelById = statuses.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
    this.statusOptions = [
      { label: this.translate.getInstant('donations.shared.filters.allStatuses'), value: null },
      ...statuses.map((item) => ({ label: item.name, value: item.id })),
    ];
  }

  private handleBusinessError(context: FacilityRequestsListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        break;
    }

    if (detail) {
      this.messageService.add({
        severity: 'error',
        summary: this.translate.getInstant('common.error'),
        detail,
      });
    }
  }

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.requests.messages.notOwnerFacility');
      default:
        return null;
    }
  }
}
