import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { FulfillmentStatusId } from '../../../models/donation-fulfillment-status.model';
import {
  DonationRequestDetails,
  DonationRequestDetailsBackend,
} from '../../../models/donation-request.model';
import { getDonationRequestStatusLabelKey } from '../../../models/donation-request-status.model';
import {
  DonationValidationBackend,
  DonationValidationListItem,
  canSubmitDonationValidation,
} from '../../../models/donation-validation.model';
import {
  getDonationValidationResultLabelKey,
  getDonationValidationResultSeverity,
} from '../../../models/donation-validation-result.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';
import { DonationValidationService } from '../../services/donation-validation.service';

type ValidationRequestDetailsContext = 'loadRequest' | 'listValidations' | 'listFulfillments';

@Component({
  standalone: false,
  selector: 'app-validation-request-details',
  templateUrl: './validation-request-details.component.html',
  styleUrl: './validation-request-details.component.scss',
})
export class ValidationRequestDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  validationsLoading = true;
  requestDetails: DonationRequestDetails | null = null;
  validations: DonationValidationListItem[] = [];
  confirmedFulfillmentId = 0;
  requestStatusLabel = '';
  requestStatusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';
  submitDialogVisible = false;
  isOverdue = false;
  adminReviewedAt = '';

  private rawRequestDetails: DonationRequestDetailsBackend | null = null;
  private rawValidations: DonationValidationBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationValidationService: DonationValidationService,
    private donationFulfillmentService: DonationFulfillmentService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  get canSubmit(): boolean {
    return (
      canSubmitDonationValidation(this.requestDetails?.statusId) && this.confirmedFulfillmentId > 0
    );
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshLabels();
      }),
    );
    this.loadRequestDetails();
    this.loadValidations();
    this.loadConfirmedFulfillment();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  goBack(): void {
    this.router.navigate(['/donations/validation']);
  }

  openSubmitDialog(): void {
    if (!this.canSubmit) {
      return;
    }
    this.submitDialogVisible = true;
  }

  onValidationSubmitted(): void {
    this.loadValidations();
    this.loadRequestDetails();
  }

  viewValidations(): void {
    this.router.navigate(['/donations/validation', this.requestId, 'validations']);
  }

  viewValidationDetails(row: DonationValidationListItem): void {
    const validationId = Number(row.id || 0);
    if (!this.requestId || !validationId) {
      return;
    }
    this.router.navigate(['/donations/validation', this.requestId, 'validations', validationId]);
  }

  getDecisionLabel(result: number): string {
    return this.translate.getInstant(getDonationValidationResultLabelKey(result));
  }

  getDecisionSeverity(
    result: number,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return getDonationValidationResultSeverity(result);
  }

  formatQuantity(): string {
    if (!this.requestDetails) {
      return '-';
    }
    const quantity = this.requestDetails.quantity;
    const unit = this.requestDetails.unit || '';
    if (!quantity && !unit) {
      return '-';
    }
    return `${quantity || ''} ${unit}`.trim();
  }

  formatEstimatedCost(): string {
    if (!this.requestDetails?.estimatedCost) {
      return '-';
    }
    return `${this.requestDetails.estimatedCost} ${this.requestDetails.currencyCode || ''}`.trim();
  }

  formatLocation(): string {
    if (!this.requestDetails) {
      return '-';
    }
    return [this.requestDetails.city, this.requestDetails.countryCode].filter(Boolean).join(' / ') || '-';
  }

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
        this.rawRequestDetails = response.message as DonationRequestDetailsBackend;
        this.isOverdue = Boolean(response.message.Is_Overdue);
        this.adminReviewedAt = String(response.message.Admin_Reviewed_At || '');
        this.refreshLabels();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadValidations(): void {
    if (!this.requestId) {
      this.validationsLoading = false;
      return;
    }

    this.validationsLoading = true;
    const sub = this.donationValidationService.listRequestValidations(this.requestId).subscribe({
      next: (response: any) => {
        console.log('listRequestValidations response', response);
        if (!response?.success) {
          this.handleBusinessError('listValidations', response);
          this.validations = [];
          this.validationsLoading = false;
          return;
        }
        this.rawValidations = Array.isArray(response.message) ? response.message : [];
        const fulfillmentIdFromValidations = Number(
          this.rawValidations.find((item) => Number(item.Donation_Fulfillment_ID || 0) > 0)
            ?.Donation_Fulfillment_ID || 0,
        );
        if (fulfillmentIdFromValidations > 0) {
          this.confirmedFulfillmentId = fulfillmentIdFromValidations;
        }
        this.refreshLabels();
        this.validationsLoading = false;
      },
      error: () => {
        this.validations = [];
        this.validationsLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadConfirmedFulfillment(): void {
    if (!this.requestId) {
      return;
    }

    const sub = this.donationFulfillmentService.listFulfillments(this.requestId).subscribe({
      next: (response: any) => {
        console.log('listFulfillments response', response);
        if (!response?.success) {
          this.handleBusinessError('listFulfillments', response);
          this.confirmedFulfillmentId = 0;
          return;
        }
        const items = Array.isArray(response.message) ? response.message : [];
        const confirmed = items.find(
          (item: { Status?: number; Donation_Fulfillment_ID?: number }) =>
            Number(item.Status) === FulfillmentStatusId.Confirmed,
        );
        const fulfillmentId = Number(confirmed?.Donation_Fulfillment_ID || 0);
        if (fulfillmentId > 0) {
          this.confirmedFulfillmentId = fulfillmentId;
        }
      },
      error: () => {
        this.confirmedFulfillmentId = 0;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshLabels(): void {
    this.requestDetails = this.donationRequestsService.mapDonationRequestDetails(this.rawRequestDetails);
    this.validations = this.rawValidations.map((item) =>
      this.donationValidationService.mapValidationListItem(item),
    );
    this.requestStatusLabel = this.requestDetails
      ? this.translate.getInstant(getDonationRequestStatusLabelKey(this.requestDetails.statusId))
      : '';
    this.requestStatusSeverity = this.getStatusSeverity(this.requestDetails?.statusCode || '');
  }

  private getStatusSeverity(
    code: string,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const normalized = String(code || '').toUpperCase();
    if (normalized.includes('OPEN_FOR_VALIDATION')) {
      return 'info';
    }
    if (normalized.includes('VALIDATED') || normalized.includes('CLOSED')) {
      return 'success';
    }
    if (normalized.includes('REJECT') || normalized.includes('CANCEL')) {
      return 'danger';
    }
    return 'secondary';
  }

  private handleBusinessError(context: ValidationRequestDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'loadRequest':
        detail = this.getRequestErrorMessage(code);
        break;
      case 'listValidations':
        detail = this.getListValidationsErrorMessage(code);
        break;
      case 'listFulfillments':
        detail = this.getFulfillmentsErrorMessage(code);
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

  private getRequestErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.validation.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getListValidationsErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.validation.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getFulfillmentsErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.validation.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.validation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.validation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
