import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  BreakdownScreenMode,
  DonationBreakdownRequestBackend,
  DonationBreakdownRequestListItem,
} from '../../../models/donation-breakdown-request.model';
import {
  getBreakdownStatusLabelKey,
  getBreakdownStatusSeverity,
} from '../../../models/donation-breakdown-request-status.model';
import { DonationBreakdownService } from '../../../services/donation-breakdown.service';

type BreakdownRequestsSectionContext = 'list';

@Component({
  standalone: false,
  selector: 'app-breakdown-requests-section',
  templateUrl: './breakdown-requests-section.component.html',
  styleUrl: './breakdown-requests-section.component.scss',
})
export class BreakdownRequestsSectionComponent implements OnChanges, OnDestroy {
  @Input() requestId = 0;
  @Input() commitmentId = 0;
  @Input() mode: BreakdownScreenMode = 'donor';
  @Input() showViewAll = false;
  @Input() hideWhenEmpty = false;
  @Output() hasItemsChange = new EventEmitter<boolean>();

  loading = false;
  missingRequestId = false;
  items: DonationBreakdownRequestListItem[] = [];

  private rawItems: DonationBreakdownRequestBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private donationBreakdownService: DonationBreakdownService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private router: Router,
  ) {
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshDisplay();
      }),
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['requestId']) {
      this.loadItems();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get showSection(): boolean {
    if (!this.hideWhenEmpty) {
      return true;
    }
    return !this.loading && this.items.length > 0;
  }

  getStatusLabel(row: DonationBreakdownRequestListItem): string {
    return this.translate.getInstant(getBreakdownStatusLabelKey(row.statusId, row.statusCode));
  }

  getStatusSeverity(row: DonationBreakdownRequestListItem) {
    return getBreakdownStatusSeverity(row.statusId, row.statusCode);
  }

  viewDetails(row: DonationBreakdownRequestListItem): void {
    if (this.loading || !row.id) {
      return;
    }
    this.router.navigate(this.buildDetailsCommands(row.id), {
      state: { returnTo: this.router.url },
    });
  }

  viewAll(): void {
    if (!this.requestId) {
      return;
    }
    const state = { returnTo: this.router.url };
    if (this.mode === 'facility') {
      this.router.navigate(['/donations/facility/requests', this.requestId, 'breakdown'], { state });
      return;
    }
    if (this.mode === 'admin') {
      this.router.navigate(['/donations/admin/requests', this.requestId, 'breakdown'], { state });
    }
  }

  private buildDetailsCommands(breakdownId: string): (string | number)[] {
    if (this.mode === 'donor') {
      return ['/donations/commitments', this.commitmentId, 'breakdown', breakdownId];
    }
    if (this.mode === 'facility') {
      return ['/donations/facility/requests', this.requestId, 'breakdown', breakdownId];
    }
    return ['/donations/admin/requests', this.requestId, 'breakdown', breakdownId];
  }

  private loadItems(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshDisplay();
      }),
    ];

    const requestId = Number(this.requestId || 0);
    if (!requestId) {
      this.missingRequestId = true;
      this.items = [];
      this.rawItems = [];
      this.loading = false;
      this.emitHasItems();
      return;
    }

    this.missingRequestId = false;
    this.loading = true;
    this.emitHasItems();
    const sub = this.donationBreakdownService.listBreakdownRequests(requestId, []).subscribe({
      next: (response: any) => {
        console.log('listBreakdownRequests response', response);
        if (!response?.success) {
          this.handleBusinessError('list', response);
          this.rawItems = [];
          this.items = [];
          this.loading = false;
          this.emitHasItems();
          return;
        }
        this.rawItems = response.message;
        this.refreshDisplay();
        this.loading = false;
        this.emitHasItems();
      },
      error: () => {
        this.rawItems = [];
        this.items = [];
        this.loading = false;
        this.emitHasItems();
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshDisplay(): void {
    this.items = this.rawItems.map((item) => this.donationBreakdownService.mapBreakdownRequestListItem(item));
  }

  private emitHasItems(): void {
    this.hasItemsChange.emit(!this.missingRequestId && !this.loading && this.items.length > 0);
  }

  private handleBusinessError(context: BreakdownRequestsSectionContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'list':
        detail = this.getListErrorMessage(code);
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
        return null;
    }
  }
}
