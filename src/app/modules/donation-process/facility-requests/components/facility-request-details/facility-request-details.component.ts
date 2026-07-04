import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationRequestDetails,
  DonationRequestDetailsBackend,
  DonationRequestWorkflowItem,
} from '../../../models/donation-request.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationCategoryBackend } from '../../../models/donation-category.model';
import { DonationTypeBackend } from '../../../models/donation-type.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { DonationRequestsService } from '../../services/donation-requests.service';

type FacilityRequestDetailsContext = 'load' | 'submit' | 'delete';

@Component({
  standalone: false,
  selector: 'app-facility-request-details',
  templateUrl: './facility-request-details.component.html',
  styleUrl: './facility-request-details.component.scss',
})
export class FacilityRequestDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  workflowLoading = true;
  details: DonationRequestDetails | null = null;
  workflowItems: DonationRequestWorkflowItem[] = [];

  typeLabel = '';
  categoryLabel = '';
  statusLabel = '';
  statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';

  private rawDetails: DonationRequestDetailsBackend | null = null;
  private rawWorkflow: Record<string, unknown>[] = [];
  private statuses: DonationRequestStatusBackend[] = [];
  private rawTypes: DonationTypeBackend[] = [];
  private rawCategories: DonationCategoryBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private statusCodeById: Record<number, string> = {};
  private typeLabelById: Record<number, string> = {};
  private categoryLabelById: Record<number, string> = {};
  private categoryTypeIdById: Record<number, number> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) { }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
        this.buildTypeMaps();
        this.buildCategoryMaps();
        this.refreshDisplay();
      }),
    );
    this.loadLookups();
    this.loadPageData();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get isDraft(): boolean {
    return String(this.details?.statusCode || '').toUpperCase() === 'DRAFT';
  }

  backToList(): void {
    this.router.navigate(['/donations/facility/requests']);
  }

  goToEdit(): void {
    this.router.navigate(['/donations/facility/requests', this.requestId, 'edit']);
  }

  confirmSubmit(): void {
    this.confirmationService.confirm({
      message: this.translate.getInstant('donations.facility.requests.confirm.submitMessage'),
      header: this.translate.getInstant('donations.facility.requests.confirm.submitTitle'),
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.submitForReview(),
    });
  }

  confirmDelete(): void {
    this.confirmationService.confirm({
      message: this.translate.getInstant('donations.facility.requests.confirm.deleteMessage'),
      header: this.translate.getInstant('donations.facility.requests.confirm.deleteTitle'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteRequest(),
    });
  }

  formatCost(): string {
    if (!this.details?.estimatedCost) {
      return '-';
    }
    return `${this.details.estimatedCost} ${this.details.currencyCode || ''}`.trim();
  }

  formatCoordinates(): string {
    if (!this.details) {
      return '-';
    }
    return `${this.details.latitude}, ${this.details.longitude}`;
  }

  // #region Load data

  private loadLookups(): void {
    const sub = forkJoin({
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      types: this.donationReferenceService.listDonationTypes(),
    }).subscribe({
      next: (results) => {
        if (results.statuses?.success) {
          this.statuses = Object.values(results.statuses.message ?? {});
          this.buildStatusMaps();
        }

        if (!results.types?.success) {
          this.refreshDisplay();
          return;
        }

        this.rawTypes = Object.values(results.types.message ?? {}) as DonationTypeBackend[];
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
            console.log('listCategories response', categoryResponses);
            this.rawCategories = [];
            categoryResponses.forEach((response: any, index) => {
              if (!response?.success) {
                return;
              }
              const typeId = mappedTypes[index]?.id || 0;
              const items = Object.values(response.message ?? {}) as DonationCategoryBackend[];
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

  private loadPageData(): void {
    this.loading = true;
    this.workflowLoading = true;

    const sub = forkJoin({
      details: this.donationRequestsService.getDonationRequestDetails(this.requestId),
      workflow: this.donationRequestsService.getDonationRequestWorkflow(this.requestId),
    }).subscribe({
      next: (results) => {
        console.log('getDonationRequestDetails response', results);

        if (!results.details?.success) {
          this.handleBusinessError('load', results.details);
          this.loading = false;
          this.workflowLoading = false;
          return;
        }

        this.rawDetails = this.donationRequestsService.extractDonationRequestDetails(
          results.details.message ?? {},
        );

        if (results.workflow?.success) {
          this.rawWorkflow = this.donationRequestsService.extractWorkflowHistory(results.workflow.message);
        } else {
          this.rawWorkflow = [];
        }

        this.loading = false;
        this.workflowLoading = false;
        this.refreshDisplay();
      },
      error: () => {
        this.loading = false;
        this.workflowLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private refreshDisplay(): void {
    if (this.rawDetails) {
      this.details = this.donationRequestsService.mapDonationRequestDetails(this.rawDetails);
    }
    this.workflowItems = this.donationRequestsService.mapDonationRequestWorkflow(this.rawWorkflow);

    if (!this.details) {
      return;
    }

    this.statusLabel = this.statusLabelById[this.details.statusId] || '';
    this.statusSeverity = this.getStatusSeverity(this.statusCodeById[this.details.statusId] || '');
    this.categoryLabel = this.categoryLabelById[this.details.donationCategoryId] || '';

    const typeId =
      Number(this.details.donationTypeId || 0) ||
      Number(this.categoryTypeIdById[this.details.donationCategoryId] || 0);
    this.typeLabel = this.typeLabelById[typeId] || '';
  }

  private buildStatusMaps(): void {
    this.statusLabelById = {};
    this.statusCodeById = {};

    for (const item of this.statuses) {
      const id = Number(item.Donation_Request_Status_ID || 0);
      if (!id) {
        continue;
      }
      this.statusLabelById[id] = this.localStorageService.pickLocalizedField(
        String(item.Name || ''),
        String(item.Name_Regional || ''),
      );
      this.statusCodeById[id] = String(item.Code || '');
    }
  }

  private buildTypeMaps(): void {
    this.typeLabelById = {};
    for (const item of this.donationReferenceService.mapDonationTypes(this.rawTypes)) {
      if (!item.id) {
        continue;
      }
      this.typeLabelById[item.id] = item.name;
    }
  }

  private buildCategoryMaps(): void {
    this.categoryLabelById = {};
    this.categoryTypeIdById = {};

    for (const item of this.donationReferenceService.mapDonationCategories(this.rawCategories)) {
      if (!item.id) {
        continue;
      }
      this.categoryLabelById[item.id] = item.name;
      if (item.donationTypeId > 0) {
        this.categoryTypeIdById[item.id] = item.donationTypeId;
      }
    }
  }

  // #endregion

  private submitForReview(): void {
    const sub = this.donationRequestsService.submitDonationRequestForReview(this.requestId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('submit', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.requests.messages.submitted'),
        });
        this.loadPageData();
      },
    });
    this.subscriptions.push(sub);
  }

  private deleteRequest(): void {
    const sub = this.donationRequestsService.deleteDonationRequest(this.requestId).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('delete', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.requests.messages.deleted'),
        });
        this.router.navigate(['/donations/facility/requests']);
      },
    });
    this.subscriptions.push(sub);
  }

  private getStatusSeverity(code: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
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
      default:
        return 'info';
    }
  }

  private handleBusinessError(context: FacilityRequestDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'submit':
        detail = this.getSubmitErrorMessage(code);
        break;
      case 'delete':
        detail = this.getDeleteErrorMessage(code);
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
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      default:
        return null;
    }
  }

  private getSubmitErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      case 'DAP13010':
        return this.translate.getInstant('donations.facility.requests.errors.invalidStatusForAction');
      default:
        return null;
    }
  }

  private getDeleteErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.facility.requests.errors.invalidRequestId');
      case 'DAP13031':
        return this.translate.getInstant('donations.facility.requests.errors.deleteNotDraft');
      default:
        return null;
    }
  }
}
