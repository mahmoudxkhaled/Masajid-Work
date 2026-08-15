import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationFulfillmentBackend,
  DonationFulfillmentListItem,
} from '../../../models/donation-fulfillment.model';
import { getFulfillmentStatusLabelKey } from '../../../models/donation-fulfillment-status.model';
import { DonationRequestDetails } from '../../../models/donation-request.model';
import {
  getDonationRequestStatusLabelKey,
} from '../../../models/donation-request-status.model';
import { getFulfilledByLabelKey } from '../../../models/fulfilled-by.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityRequestFulfillmentsContext = 'listFulfillments' | 'loadRequest';

@Component({
  standalone: false,
  selector: 'app-facility-request-fulfillments',
  templateUrl: './facility-request-fulfillments.component.html',
  styleUrl: './facility-request-fulfillments.component.scss',
})
export class FacilityRequestFulfillmentsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  fulfillmentsLoading = true;
  requestDetails: DonationRequestDetails | null = null;
  fulfillments: DonationFulfillmentListItem[] = [];
  requestStatusLabel = '';
  requestStatusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';
  returnTo: string | null = null;

  private rawFulfillments: DonationFulfillmentBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationFulfillmentService: DonationFulfillmentService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {
    const navState = this.router.getCurrentNavigation()?.extras?.state as { returnTo?: string } | undefined;
    this.returnTo = String(navState?.returnTo || history.state?.['returnTo'] || '').trim() || null;
  }

  get backLabelKey(): string {
    return this.returnTo
      ? 'donations.facility.fulfillments.actions.backToDonationRequest'
      : 'donations.facility.fulfillments.actions.backToList';
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    if (!this.returnTo) {
      this.returnTo = String(history.state?.['returnTo'] || '').trim() || null;
    }
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshLabels();
      }),
    );
    this.loadRequestDetails();
    this.loadFulfillments();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  goBack(): void {
    if (this.returnTo) {
      this.router.navigateByUrl(this.returnTo);
      return;
    }
    this.router.navigate(['/donations/facility/fulfillments']);
  }

  viewDetails(row: DonationFulfillmentListItem): void {
    const fulfillmentId = Number(row.id || 0);
    if (!this.requestId || !fulfillmentId) {
      return;
    }
    this.router.navigate(['/donations/facility/fulfillments', this.requestId, fulfillmentId], {
      state: this.returnTo ? { returnTo: this.returnTo } : undefined,
    });
  }

  getFulfilledByLabel(value: number): string {
    return this.translate.getInstant(getFulfilledByLabelKey(value));
  }

  getFulfillmentStatusLabel(row: DonationFulfillmentListItem): string {
    return this.translate.getInstant(getFulfillmentStatusLabelKey(row.statusId));
  }

  getNoteSummary(note: string): string {
    const value = String(note || '').trim();
    if (!value) {
      return '-';
    }
    return value.length > 80 ? `${value.slice(0, 80)}…` : value;
  }

  formatQuantity(): string {
    if (!this.requestDetails) {
      return '-';
    }
    const quantity = this.requestDetails.quantity;
    const unit = String(this.requestDetails.unit || '').trim();
    if (quantity == null || quantity === undefined) {
      return '-';
    }
    return unit ? `${quantity} ${unit}` : String(quantity);
  }

  formatCost(): string {
    if (!this.requestDetails?.estimatedCost) {
      return '-';
    }
    return `${this.requestDetails.estimatedCost} ${this.requestDetails.currencyCode || ''}`.trim();
  }

  getLocationLabel(): string {
    if (!this.requestDetails) {
      return '-';
    }
    const city = String(this.requestDetails.city || '').trim();
    const country = String(this.requestDetails.countryCode || '').trim();
    if (city && country) {
      return `${city} / ${country}`;
    }
    return city || country || '-';
  }

  // #region Load data
  private loadRequestDetails(): void {
    if (!this.requestId) {
      this.loading = false;
      return;
    }

    this.loading = true;
    const sub = this.donationRequestsService.getDonationRequestDetails(this.requestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('loadRequest', response);
          this.loading = false;
          return;
        }

        const raw = this.donationRequestsService.extractDonationRequestDetails(response.message);
        this.requestDetails = this.donationRequestsService.mapDonationRequestDetails(raw);
        this.refreshLabels();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadFulfillments(): void {
    if (!this.requestId) {
      this.fulfillments = [];
      this.fulfillmentsLoading = false;
      return;
    }

    this.fulfillmentsLoading = true;
    const sub = this.donationFulfillmentService.listFulfillments(this.requestId).subscribe({
      next: (response: any) => {
        console.log('listFulfillments response', response);
        if (!response?.success) {
          this.handleBusinessError('listFulfillments', response);
          this.rawFulfillments = [];
          this.fulfillments = [];
          this.fulfillmentsLoading = false;
          return;
        }

        this.rawFulfillments = Array.isArray(response.message) ? response.message : [];
        this.fulfillments = this.rawFulfillments.map((item) =>
          this.donationFulfillmentService.mapFulfillmentListItem(item),
        );
        this.fulfillmentsLoading = false;
      },
      error: () => {
        this.rawFulfillments = [];
        this.fulfillments = [];
        this.fulfillmentsLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }
  // #endregion

  private refreshLabels(): void {
    this.fulfillments = this.rawFulfillments.map((item) =>
      this.donationFulfillmentService.mapFulfillmentListItem(item),
    );
    if (!this.requestDetails) {
      this.requestStatusLabel = '';
      this.requestStatusSeverity = 'info';
      return;
    }
    this.requestStatusLabel = this.translate.getInstant(
      getDonationRequestStatusLabelKey(this.requestDetails.statusId),
    );
    this.requestStatusSeverity = this.getStatusSeverity(this.requestDetails.statusCode);
  }

  private getStatusSeverity(
    code: string,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    switch (String(code || '').toUpperCase()) {
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
      case 'FULFILLMENT_SUBMITTED':
      case 'IN_FULFILLMENT':
      case 'OPEN_FOR_VALIDATION':
        return 'info';
      default:
        return 'info';
    }
  }

  private handleBusinessError(context: FacilityRequestFulfillmentsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'listFulfillments':
        detail = this.getListFulfillmentsErrorMessage(code);
        break;
      case 'loadRequest':
        detail = this.getLoadRequestErrorMessage(code);
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

  private getListFulfillmentsErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.fulfillments.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getLoadRequestErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.fulfillments.errors.requestNotFound');
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.fulfillments.errors.notOwnerFacility');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
