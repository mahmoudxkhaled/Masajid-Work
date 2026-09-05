import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationAttachmentOwnerType } from '../../../models/donation-attachment.constants';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationFulfillmentBackend } from '../../../models/donation-fulfillment.model';
import {
  getFulfillmentStatusLabelKey,
  getFulfillmentStatusSeverity,
} from '../../../models/donation-fulfillment-status.model';
import {
  DonationRequestDetails,
  DonationRequestDetailsBackend,
} from '../../../models/donation-request.model';
import {
  DonationRequestStatusBackend,
  canCloseDonationRequest,
  getDonationRequestStatusLabelKey,
  isDonationRequestClosingStatus,
} from '../../../models/donation-request-status.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import {
  DonationValidationBackend,
  DonationValidationListItem,
} from '../../../models/donation-validation.model';
import {
  getDonationValidationResultLabelKey,
  getDonationValidationResultSeverity,
} from '../../../models/donation-validation-result.model';
import { getFulfilledByLabelKey } from '../../../models/fulfilled-by.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationValidationService } from '../../../validation/services/donation-validation.service';

type ReadyToCloseDetailsContext = 'load' | 'listFulfillments' | 'listValidations';

@Component({
  standalone: false,
  selector: 'app-ready-to-close-details',
  templateUrl: './ready-to-close-details.component.html',
  styleUrl: './ready-to-close-details.component.scss',
})
export class ReadyToCloseDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  fulfillmentsLoading = true;
  validationsLoading = true;
  details: DonationRequestDetails | null = null;
  fulfillments: DonationFulfillmentBackend[] = [];
  validations: DonationValidationListItem[] = [];
  closeDialogVisible = false;

  typeLabel = '';
  categoryLabel = '';
  statusLabel = '';
  statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';

  readonly requestAttachmentOwnerType = DonationAttachmentOwnerType.DonationRequest;
  readonly fulfillmentAttachmentOwnerType = DonationAttachmentOwnerType.DonationFulfillment;
  readonly validationAttachmentOwnerType = DonationAttachmentOwnerType.DonationValidation;

  private rawDetails: DonationRequestDetailsBackend | null = null;
  private rawValidations: DonationValidationBackend[] = [];
  private statuses: DonationRequestStatusBackend[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private typeLabelById: Record<number, string> = {};
  private categoryLabelById: Record<number, string> = {};
  private categoryTypeIdById: Record<number, number> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationFulfillmentService: DonationFulfillmentService,
    private donationValidationService: DonationValidationService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  get canClose(): boolean {
    return canCloseDonationRequest(this.details?.statusId);
  }

  get showStatusUnverified(): boolean {
    if (this.loading || !this.details) {
      return false;
    }
    const statusId = Number(this.details.statusId || 0);
    return statusId <= 0;
  }

  get showCloseHiddenForClosingStatus(): boolean {
    if (this.loading || !this.details) {
      return false;
    }
    return isDonationRequestClosingStatus(this.details.statusId);
  }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('requestId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
        this.buildTypeMaps();
        this.buildCategoryMaps();
        this.refreshDisplay();
      }),
    );
    this.loadLookups();
    this.loadRequestDetails();
    this.loadFulfillments();
    this.loadValidations();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  backToList(): void {
    this.router.navigate(['/donations/admin/ready-to-close']);
  }

  openCloseDialog(): void {
    if (!this.canClose) {
      return;
    }
    this.closeDialogVisible = true;
  }

  onRequestClosed(): void {
    this.loadRequestDetails();
    this.loadFulfillments();
    this.loadValidations();
  }

  formatCost(): string {
    if (!this.details?.estimatedCost) {
      return '-';
    }
    return `${this.details.estimatedCost} ${this.details.currencyCode || ''}`.trim();
  }

  formatQuantity(): string {
    if (!this.details) {
      return '-';
    }
    if (!this.details.quantity && !this.details.unit) {
      return '-';
    }
    return `${this.details.quantity || ''} ${this.details.unit || ''}`.trim();
  }

  formatLocation(): string {
    if (!this.details) {
      return '-';
    }
    return [this.details.city, this.details.countryCode].filter(Boolean).join(' / ') || '-';
  }

  getFulfilledByLabel(fulfilledBy: number | undefined): string {
    return this.translate.getInstant(getFulfilledByLabelKey(Number(fulfilledBy || 0)));
  }

  getFulfillmentNote(item: DonationFulfillmentBackend): string {
    return this.localStorageService.pickRequestContentField(
      String(item.Fulfillment_Note || ''),
      String(item.Fulfillment_Note_Regional || ''),
    );
  }

  getFulfillmentStatusLabel(status: number | undefined): string {
    return this.translate.getInstant(getFulfillmentStatusLabelKey(Number(status || 0)));
  }

  getFulfillmentStatusSeverity(
    status: number | undefined,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return getFulfillmentStatusSeverity(Number(status || 0));
  }

  getDecisionLabel(result: number): string {
    return this.translate.getInstant(getDonationValidationResultLabelKey(result));
  }

  getDecisionSeverity(
    result: number,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return getDonationValidationResultSeverity(result);
  }

  formatVendorOfferId(vendorOfferId: number | null | undefined): string {
    const id = Number(vendorOfferId || 0);
    return id > 0 ? String(id) : '-';
  }

  getFulfillmentAttachmentOwnerId(item: DonationFulfillmentBackend): number {
    return Number(item.Donation_Fulfillment_ID || 0);
  }

  getValidationAttachmentOwnerId(item: DonationValidationListItem): number {
    return Number(item.id || 0);
  }

  // #region Load data

  private loadLookups(): void {
    const sub = forkJoin({
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      types: this.donationReferenceService.listDonationTypes(),
    }).subscribe({
      next: (results) => {
        if (results.statuses?.success) {
          this.statuses = Object.values(
            results.statuses.message as Record<string, DonationRequestStatusBackend>,
          );
          this.buildStatusMaps();
        }

        if (!results.types?.success) {
          this.refreshDisplay();
          return;
        }

        this.rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(
          results.types,
        );
        this.buildTypeMaps();

        const mappedTypes = this.donationReferenceService.mapDonationTypes(this.rawTypes);
        if (!mappedTypes.length) {
          this.rawCategories = [];
          this.buildCategoryMaps();
          this.refreshDisplay();
          return;
        }

        const categorySub = forkJoin(
          mappedTypes.map((type) => this.donationReferenceService.listDonationCategories(type.id, false)),
        ).subscribe({
          next: (categoryResponses) => {
            this.rawCategories = [];
            categoryResponses.forEach((response: any, index: number) => {
              if (!response?.success) {
                return;
              }
              const typeId = mappedTypes[index]?.id || 0;
              const items =
                this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response);
              items.forEach((item) => {
                this.rawCategories.push({
                  ...item,
                  Donation_Type_ID: Number(item.Donation_Type_ID || typeId),
                });
              });
            });
            this.buildCategoryMaps();
            this.refreshDisplay();
          },
        });
        this.subscriptions.push(categorySub);
      },
    });
    this.subscriptions.push(sub);
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
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }
        this.rawDetails = response.message as DonationRequestDetailsBackend;
        this.refreshDisplay();
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
          this.fulfillments = [];
          this.fulfillmentsLoading = false;
          return;
        }
        this.fulfillments = Array.isArray(response.message) ? response.message : [];
        this.fulfillmentsLoading = false;
      },
      error: () => {
        this.fulfillments = [];
        this.fulfillmentsLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadValidations(): void {
    if (!this.requestId) {
      this.validations = [];
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
        this.refreshDisplay();
        this.validationsLoading = false;
      },
      error: () => {
        this.validations = [];
        this.validationsLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshDisplay(): void {
    this.details = this.donationRequestsService.mapDonationRequestDetails(this.rawDetails);
    this.validations = this.rawValidations.map((item) =>
      this.donationValidationService.mapValidationListItem(item),
    );

    if (!this.details) {
      this.typeLabel = '';
      this.categoryLabel = '';
      this.statusLabel = '';
      this.statusSeverity = 'info';
      return;
    }

    const categoryId = this.details.donationCategoryId;
    this.categoryLabel = this.categoryLabelById[categoryId] || '-';
    const typeId = this.details.donationTypeId || this.categoryTypeIdById[categoryId] || 0;
    this.typeLabel = this.typeLabelById[typeId] || '-';
    this.statusLabel =
      this.statusLabelById[this.details.statusId] ||
      this.translate.getInstant(getDonationRequestStatusLabelKey(this.details.statusId));
    this.statusSeverity = this.getStatusSeverity(this.details.statusCode);
  }

  private getStatusSeverity(
    code: string,
  ): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const normalized = String(code || '').toUpperCase();
    if (normalized.includes('VALIDATED') || normalized.includes('CLOSED')) {
      return 'success';
    }
    if (normalized.includes('REJECT') || normalized.includes('CANCEL')) {
      return 'danger';
    }
    if (normalized.includes('BROKEN')) {
      return 'warning';
    }
    return 'info';
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

  private buildTypeMaps(): void {
    this.typeLabelById = {};
    for (const item of this.donationReferenceService.mapDonationTypes(this.rawTypes)) {
      this.typeLabelById[item.id] = item.name;
    }
  }

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    this.categoryTypeIdById = {};
    for (const item of this.donationReferenceService.mapDonationCategories(this.rawCategories)) {
      this.categoryLabelById[item.id] = item.name;
      this.categoryTypeIdById[item.id] = Number(item.donationTypeId || 0);
    }
  }

  private handleBusinessError(context: ReadyToCloseDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'listFulfillments':
        detail = this.getListErrorMessage(code);
        break;
      case 'listValidations':
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

  private getLoadErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.adminClose.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminClose.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminClose.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getListErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.adminClose.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminClose.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminClose.errors.sessionExpired');
      default:
        return null;
    }
  }
}
