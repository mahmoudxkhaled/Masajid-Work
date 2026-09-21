import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  createEmptyBreakdownRequestListItem,
  DonationBreakdownRequestBackend,
  DonationBreakdownRequestListItem,
} from '../../../models/donation-breakdown-request.model';
import {
  getBreakdownStatusLabelKey,
  getBreakdownStatusSeverity,
} from '../../../models/donation-breakdown-request-status.model';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type BreakdownReviewListContext = 'list';

@Component({
  standalone: false,
  selector: 'app-breakdown-review-list',
  templateUrl: './breakdown-review-list.component.html',
  styleUrl: './breakdown-review-list.component.scss',
})
export class BreakdownReviewListComponent implements OnInit, OnDestroy {
  rows = 10;
  readonly rowsPerPageOptions = [10, 25, 50, 100];
  tableLoadingSpinner = true;

  items: DonationBreakdownRequestListItem[] = [];

  private rawItems: DonationBreakdownRequestBackend[] = [];
  private skeletonRows: DonationBreakdownRequestListItem[] = this.createSkeletonRows();
  private subscriptions: Subscription[] = [];

  constructor(
    private donationBreakdownService: DonationBreakdownService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshDisplay();
      }),
    );
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

  viewReview(row: DonationBreakdownRequestListItem, event?: Event): void {
    event?.stopPropagation();
    if (this.tableLoadingSpinner || !row.donationBreakdownRequestId) {
      return;
    }
    this.router.navigate(['/donations/admin/breakdown-review', row.donationBreakdownRequestId], {
      state: { returnTo: '/donations/admin/breakdown-review' },
    });
  }

  getStatusLabel(row: DonationBreakdownRequestListItem): string {
    return this.translate.getInstant(getBreakdownStatusLabelKey(row.statusId, row.statusCode));
  }

  getStatusSeverity(row: DonationBreakdownRequestListItem) {
    return getBreakdownStatusSeverity(row.statusId, row.statusCode);
  }

  // #region Load data
  private loadItems(): void {
    this.tableLoadingSpinner = true;
    const sub = this.donationBreakdownService.listBreakdownRequests(0).subscribe({
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
    const mapped = this.rawItems.map((item) =>
      this.donationBreakdownService.mapBreakdownRequestListItem(item),
    );
    this.items = this.donationBreakdownService.filterConfirmedBreakdownRequests(mapped);
  }
  // #endregion

  private createSkeletonRows(): DonationBreakdownRequestListItem[] {
    return Array.from({ length: this.rows }, () => createEmptyBreakdownRequestListItem());
  }

  private handleBusinessError(context: BreakdownReviewListContext, response: any): void {
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
      case 'DAP13000':
        return this.translate.getInstant('donations.breakdown.errors.invalidDonationRequestId');
      case 'DAP13033':
        return this.translate.getInstant('donations.breakdown.errors.actionNotAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.breakdown.errors.reviewAccessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.breakdown.errors.sessionExpired');
      default:
        return this.translate.getInstant('donations.breakdown.errors.actionFailed');
    }
  }
}
