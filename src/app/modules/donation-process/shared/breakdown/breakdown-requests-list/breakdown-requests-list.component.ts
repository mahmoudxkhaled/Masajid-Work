import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  BreakdownScreenMode,
  createEmptyBreakdownRequestListItem,
  DonationBreakdownRequestBackend,
  DonationBreakdownRequestListItem,
} from '../../../models/donation-breakdown-request.model';
import {
  getBreakdownStatusFilterOptions,
  getBreakdownStatusLabelKey,
  getBreakdownStatusSeverity,
} from '../../../models/donation-breakdown-request-status.model';
import { DonationRequestDetails, DonationRequestDetailsBackend } from '../../../models/donation-request.model';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';

type BreakdownRequestsListContext = 'list' | 'loadRequest';

@Component({
  standalone: false,
  selector: 'app-breakdown-requests-list',
  templateUrl: './breakdown-requests-list.component.html',
  styleUrl: './breakdown-requests-list.component.scss',
})
export class BreakdownRequestsListComponent implements OnInit, OnDestroy {
  mode: BreakdownScreenMode = 'facility';
  requestId = 0;
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];
  tableLoadingSpinner = false;

  items: DonationBreakdownRequestListItem[] = [];
  statusOptions: { label: string; value: number | null }[] = [];
  selectedStatusId: number | null = null;
  requestLoading = false;
  requestDetails: DonationRequestDetails | null = null;

  private rawItems: DonationBreakdownRequestBackend[] = [];
  private rawRequestDetails: DonationRequestDetailsBackend | null = null;
  private skeletonRows: DonationBreakdownRequestListItem[] = this.createSkeletonRows();
  private returnTo = '';
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationBreakdownService: DonationBreakdownService,
    private donationRequestsService: DonationRequestsService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.mode = (this.route.snapshot.data['mode'] as BreakdownScreenMode) || 'facility';
    this.requestId = Number(
      this.route.snapshot.paramMap.get('requestId') || this.route.snapshot.paramMap.get('id') || 0,
    );
    this.returnTo = String(history.state?.['returnTo'] || this.defaultReturnTo());

    const toastDetailKey = history.state?.['toastDetailKey'];
    if (toastDetailKey) {
      const toastSeverity = String(history.state?.['toastSeverity'] || 'success');
      const { toastDetailKey: _removed, toastSeverity: _severityRemoved, ...restState } = history.state || {};
      history.replaceState(restState, '');
      setTimeout(() => {
        this.messageService.add({
          severity: toastSeverity === 'warn' ? 'warn' : 'success',
          summary: this.translate.getInstant(
            toastSeverity === 'warn' ? 'common.warning' : 'common.success',
          ),
          detail: this.translate.getInstant(String(toastDetailKey)),
        });
      });
    }

    this.rebuildStatusOptions();
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.rebuildStatusOptions();
        this.refreshDisplay();
        this.refreshRequestDisplay();
      }),
    );
    this.loadRequestDetails();
    this.loadItems();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get tableValue(): DonationBreakdownRequestListItem[] {
    if (this.tableLoadingSpinner && this.items.length === 0) {
      return this.skeletonRows;
    }
    return this.items;
  }

  get initialLoading(): boolean {
    return this.tableLoadingSpinner && this.items.length === 0;
  }

  backToRequest(): void {
    this.router.navigateByUrl(this.returnTo || this.defaultReturnTo());
  }

  viewDetails(row: DonationBreakdownRequestListItem): void {
    if (this.tableLoadingSpinner || !row.id) {
      return;
    }
    this.router.navigate(this.buildDetailsCommands(row.id), {
      state: { returnTo: this.returnTo },
    });
  }

  getStatusLabel(row: DonationBreakdownRequestListItem): string {
    return this.translate.getInstant(getBreakdownStatusLabelKey(row.statusId, row.statusCode));
  }

  getStatusSeverity(row: DonationBreakdownRequestListItem) {
    return getBreakdownStatusSeverity(row.statusId, row.statusCode);
  }

  onStatusFilterChange(): void {
    this.loadItems();
  }

  formatRequestQuantity(): string {
    if (!this.requestDetails) {
      return '-';
    }
    return `${this.requestDetails.quantity} ${this.requestDetails.unit || ''}`.trim() || '-';
  }

  formatRequestEstimatedCost(): string {
    if (!this.requestDetails?.estimatedCost) {
      return '-';
    }
    return `${this.requestDetails.estimatedCost} ${this.requestDetails.currencyCode || ''}`.trim();
  }

  private loadRequestDetails(): void {
    if (!this.requestId) {
      return;
    }

    this.requestLoading = true;
    const sub = this.donationRequestsService.getDonationRequestDetails(this.requestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('loadRequest', response);
          return;
        }
        this.rawRequestDetails = (response.message ?? null) as DonationRequestDetailsBackend | null;
        this.refreshRequestDisplay();
        this.requestLoading = false;
      },
      error: () => {
        this.requestLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshRequestDisplay(): void {
    this.requestDetails = this.rawRequestDetails
      ? this.donationRequestsService.mapDonationRequestDetails(this.rawRequestDetails)
      : null;
  }

  private loadItems(): void {
    if (!this.requestId) {
      this.items = [];
      this.rawItems = [];
      return;
    }

    this.tableLoadingSpinner = true;
    const statusFilter = this.selectedStatusId ? [this.selectedStatusId] : [];
    const sub = this.donationBreakdownService.listBreakdownRequests(this.requestId, statusFilter).subscribe({
      next: (response: any) => {
        console.log('listBreakdownRequests response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.rawItems = [];
          this.items = [];
          this.tableLoadingSpinner = false;
          return;
        }
        this.rawItems = response.message;
        this.refreshDisplay();
        this.tableLoadingSpinner = false;
      },
      error: () => {
        this.rawItems = [];
        this.items = [];
        this.tableLoadingSpinner = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshDisplay(): void {
    this.items = this.rawItems.map((item) => this.donationBreakdownService.mapBreakdownRequestListItem(item));
  }

  private rebuildStatusOptions(): void {
    this.statusOptions = getBreakdownStatusFilterOptions().map((option) => ({
      value: option.value,
      label: this.translate.getInstant(option.labelKey),
    }));
  }

  private createSkeletonRows(): DonationBreakdownRequestListItem[] {
    return Array.from({ length: this.rows }, () => createEmptyBreakdownRequestListItem());
  }

  private buildDetailsCommands(breakdownId: string): (string | number)[] {
    if (this.mode === 'facility') {
      return ['/donations/facility/requests', this.requestId, 'breakdown', breakdownId];
    }
    return ['/donations/admin/requests', this.requestId, 'breakdown', breakdownId];
  }

  private defaultReturnTo(): string {
    if (this.mode === 'facility') {
      return `/donations/facility/requests/${this.requestId}`;
    }
    return `/donations/admin/pending-review/${this.requestId}`;
  }

  private handleBusinessError(context: BreakdownRequestsListContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
        this.tableLoadingSpinner = false;
        break;
      case 'loadRequest':
        detail = this.getLoadRequestErrorMessage(code);
        this.requestDetails = null;
        this.requestLoading = false;
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
      case 'DAP13000':
        return this.translate.getInstant('donations.breakdown.errors.invalidDonationRequestId');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }

  private getLoadRequestErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.breakdown.errors.invalidDonationRequestId');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.accessDenied');
      default:
        return null;
    }
  }
}
