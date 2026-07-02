import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subscription, forkJoin } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationRequestDetails, DonationRequestWorkflowItem } from '../../../models/donation-request.model';
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

  private rawStatuses: DonationRequestStatusBackend[] = [];
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationRequestsService: DonationRequestsService,
    private donationReferenceService: DonationReferenceService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
  ) { }

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.remapLabels();
      }),
    );
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

  private loadPageData(): void {
    this.loading = true;
    this.workflowLoading = true;

    const sub = forkJoin({
      statuses: this.donationReferenceService.listDonationRequestStatuses(),
      types: this.donationReferenceService.listDonationTypes(),
      details: this.donationRequestsService.getDonationRequestDetails(this.requestId),
      workflow: this.donationRequestsService.getDonationRequestWorkflow(this.requestId),
    }).subscribe({
      next: (results) => {
        console.log('getDonationRequestDetails response', results);
        if (results.statuses?.success) {
          this.rawStatuses = Object.values(results.statuses.message ?? {});
        }

        if (!results.details?.success) {
          this.handleBusinessError('load', results.details);
          this.loading = false;
          this.workflowLoading = false;
          return;
        }

        this.details = this.donationRequestsService.mapDonationRequestDetails(results.details.message);
        this.loading = false;

        if (results.workflow?.success) {
          this.workflowItems = this.donationRequestsService.mapDonationRequestWorkflow(results.workflow.message);
        }
        this.workflowLoading = false;

        this.resolveReferenceLabels(results.types);
      },
      error: () => {
        this.loading = false;
        this.workflowLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private resolveReferenceLabels(typesResponse: any): void {
    if (!this.details) {
      return;
    }

    if (!typesResponse?.success) {
      this.remapLabels();
      return;
    }

    const rawTypes = Object.values(typesResponse.message ?? {}) as DonationTypeBackend[];
    const mappedTypes = this.donationReferenceService.mapDonationTypes(rawTypes);
    if (!mappedTypes.length) {
      this.remapLabels();
      return;
    }

    const type = mappedTypes[0];
    this.typeLabel = type.name;

    const sub = this.donationReferenceService.listDonationCategories(type.id, false).subscribe({
      next: (response: any) => {
        if (!response?.success) {
          this.remapLabels();
          return;
        }
        const rawCategories = Object.values(response.message ?? {}) as DonationCategoryBackend[];
        const mappedCategories = this.donationReferenceService.mapDonationCategories(rawCategories);
        this.categoryLabel =
          mappedCategories.find((item) => item.id === this.details!.donationCategoryId)?.name || '';
        this.remapLabels();
      },
    });
    this.subscriptions.push(sub);
  }

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

  private remapLabels(): void {
    if (!this.details) {
      return;
    }

    const statuses = this.donationReferenceService.mapDonationRequestStatuses(this.rawStatuses);
    const status = statuses.find((item) => item.id === this.details!.statusId);
    this.statusLabel = status?.name || '';
    this.statusSeverity = this.getStatusSeverity(status?.code || '');
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
