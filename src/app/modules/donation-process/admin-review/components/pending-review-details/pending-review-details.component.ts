import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
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
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { DonationAdminService } from '../../services/donation-admin.service';

type PendingReviewDetailsContext = 'load' | 'approve' | 'reject';

@Component({
  standalone: false,
  selector: 'app-pending-review-details',
  templateUrl: './pending-review-details.component.html',
  styleUrl: './pending-review-details.component.scss',
})
export class PendingReviewDetailsComponent implements OnInit, OnDestroy {
  requestId = 0;
  loading = true;
  workflowLoading = true;
  details: DonationRequestDetails | null = null;
  workflowItems: DonationRequestWorkflowItem[] = [];

  typeLabel = '';
  categoryLabel = '';
  statusLabel = '';
  statusSeverity: 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' = 'info';

  approveDialogVisible = false;
  rejectDialogVisible = false;
  locationMapVisible = false;
  reviewNote = '';

  isLoading$ = this.donationAdminService.isLoadingSubject.asObservable();

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
    private donationAdminService: DonationAdminService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
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

  get isPendingReview(): boolean {
    return String(this.details?.statusCode || '').toUpperCase() === 'PENDING_REVIEW';
  }

  backToList(): void {
    this.router.navigate(['/donations/admin/pending-review']);
  }

  openApproveDialog(): void {
    this.reviewNote = '';
    this.approveDialogVisible = true;
  }

  openRejectDialog(): void {
    this.reviewNote = '';
    this.rejectDialogVisible = true;
  }

  closeApproveDialog(): void {
    this.approveDialogVisible = false;
    this.reviewNote = '';
  }

  closeRejectDialog(): void {
    this.rejectDialogVisible = false;
    this.reviewNote = '';
  }

  confirmApprove(): void {
    const sub = this.donationAdminService.approveDonationRequest(this.requestId, this.reviewNote).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('approve', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.adminReview.messages.approved'),
        });
        this.closeApproveDialog();
        this.router.navigate(['/donations/admin/pending-review']);
      },
    });
    this.subscriptions.push(sub);
  }

  confirmReject(): void {
    const sub = this.donationAdminService.rejectDonationRequest(this.requestId, this.reviewNote).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.handleBusinessError('reject', response);
          return;
        }
        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.adminReview.messages.rejected'),
        });
        this.closeRejectDialog();
        this.router.navigate(['/donations/admin/pending-review']);
      },
    });
    this.subscriptions.push(sub);
  }

  formatCost(): string {
    if (!this.details?.estimatedCost) {
      return '-';
    }
    return `${this.details.estimatedCost} ${this.details.currencyCode || ''}`.trim();
  }

  openLocationMap(): void {
    this.locationMapVisible = true;
  }

  // #region Load data

  private loadLookups(): void {
    const sub = forkJoin({
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      types: this.donationReferenceService.listDonationTypes(),
    }).subscribe({
      next: (results) => {
        if (results.statuses?.success) {
          this.statuses = this.donationReferenceService.extractDictionaryItems<DonationRequestStatusBackend>(
            results.statuses.message,
            'Request_Statuses',
          );
          this.buildStatusMaps();
        }

        if (!results.types?.success) {
          this.refreshDisplay();
          return;
        }

        this.rawTypes = this.donationReferenceService.parseListFromResponse<DonationTypeBackend>(results.types);
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
            categoryResponses.forEach((response: any, index) => {
              if (!response?.success) {
                return;
              }
              const typeId = mappedTypes[index]?.id || 0;
              const items = this.donationReferenceService.parseListFromResponse<DonationCategoryBackend>(response);
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
    this.statusSeverity = this.getStatusSeverity(this.statusCodeById[this.details.statusId] || this.details.statusCode);
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

  private handleBusinessError(context: PendingReviewDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'approve':
        detail = this.getApproveErrorMessage(code);
        break;
      case 'reject':
        detail = this.getRejectErrorMessage(code);
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
        return this.translate.getInstant('donations.adminReview.errors.requestNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminReview.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminReview.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getApproveErrorMessage(code: string): string | null {
    return this.getActionErrorMessage(code);
  }

  private getRejectErrorMessage(code: string): string | null {
    return this.getActionErrorMessage(code);
  }

  private getActionErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.adminReview.errors.requestNotFound');
      case 'DAP13010':
        return this.translate.getInstant('donations.adminReview.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.adminReview.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.adminReview.errors.sessionExpired');
      default:
        return null;
    }
  }
}
