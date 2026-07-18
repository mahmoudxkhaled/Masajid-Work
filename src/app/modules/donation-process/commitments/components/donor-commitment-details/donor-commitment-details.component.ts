import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCommitmentBackend, DonationCommitmentDetails } from '../../../models/donation-commitment.model';
import {
  canCancelCommitment,
  CommitmentStatusSeverity,
  getCommitmentStatusLabelKey,
  getCommitmentStatusSeverity,
} from '../../../models/donation-commitment-status.model';
import { DonationRequestWorkflowItem } from '../../../models/donation-request.model';
import { FulfillmentMode } from '../../../models/fulfillment-mode.model';
import { VendorOfferBackend, VendorOfferListItem } from '../../../models/vendor-offer.model';
import { DonationRequestsService } from '../../../facility-requests/services/donation-requests.service';
import { VendorOffersService } from '../../../vendor-offers/services/vendor-offers.service';
import { DonationCommitmentService } from '../../services/donation-commitment.service';

type DonorCommitmentDetailsContext = 'load' | 'listOffers';

@Component({
  standalone: false,
  selector: 'app-donor-commitment-details',
  templateUrl: './donor-commitment-details.component.html',
  styleUrl: './donor-commitment-details.component.scss',
})
export class DonorCommitmentDetailsComponent implements OnInit, OnDestroy {
  commitmentId = 0;
  loading = true;
  workflowLoading = false;
  offersLoading = false;
  offersMissingRequestId = false;
  details: DonationCommitmentDetails | null = null;
  workflowItems: DonationRequestWorkflowItem[] = [];
  vendorOffers: VendorOfferListItem[] = [];
  cancelDialogVisible = false;
  viewOfferDialogVisible = false;
  selectOfferDialogVisible = false;
  selectedOffer: VendorOfferListItem | null = null;

  fulfillmentModeLabel = '';
  charityLabel = '';
  charityRepLabel = '';
  statusLabel = '';
  statusSeverity: CommitmentStatusSeverity = 'secondary';

  private rawDetails: DonationCommitmentBackend | null = null;
  private rawWorkflow: Record<string, unknown>[] = [];
  private rawVendorOffers: VendorOfferBackend[] = [];
  private hasSelectedOffer = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private donationCommitmentService: DonationCommitmentService,
    private donationRequestsService: DonationRequestsService,
    private vendorOffersService: VendorOffersService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.commitmentId = Number(this.route.snapshot.paramMap.get('id') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.refreshDisplay();
      }),
    );
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get canCancel(): boolean {
    if (!this.details) {
      return false;
    }
    return canCancelCommitment(this.details.statusId);
  }

  backToList(): void {
    this.router.navigate(['/donations/commitments']);
  }

  openCancelDialog(): void {
    this.cancelDialogVisible = true;
  }

  onCommitmentCancelled(): void {
    this.loadDetails();
  }

  openViewOfferDialog(row: VendorOfferListItem): void {
    this.selectedOffer = row;
    this.viewOfferDialogVisible = true;
  }

  openSelectOfferDialog(row: VendorOfferListItem): void {
    this.selectedOffer = row;
    this.selectOfferDialogVisible = true;
  }

  onVendorOfferSelected(): void {
    this.loadDetails();
  }

  canSelectOffer(row: VendorOfferListItem): boolean {
    if (this.hasSelectedOffer) {
      return false;
    }
    const code = String(row.statusCode || '').toUpperCase();
    if (code === 'WITHDRAWN' || code === 'SELECTED' || code === 'EXPIRED') {
      return false;
    }
    return true;
  }

  formatOfferAmount(row: VendorOfferListItem): string {
    const amount = row.offerAmount;
    const currency = row.currencyCode || '';
    if (!amount && !currency) {
      return '-';
    }
    return currency ? `${amount} ${currency}` : String(amount);
  }

  getYesNo(value: boolean): string {
    return value
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  getOfferStatusLabel(row: VendorOfferListItem): string {
    if (row.statusCode) {
      return row.statusCode;
    }
    return row.statusId ? String(row.statusId) : '-';
  }

  getVendorLabel(row: VendorOfferListItem): string {
    if (!row.vendorEntityId) {
      return '-';
    }
    return `#${row.vendorEntityId}`;
  }

  getAnonymousLabel(): string {
    if (!this.details) {
      return '-';
    }
    return this.details.isAnonymous
      ? this.translate.getInstant('donations.browse.yes')
      : this.translate.getInstant('donations.browse.no');
  }

  // #region Load data

  private loadDetails(): void {
    this.loading = true;
    const sub = this.donationCommitmentService.getDonationCommitmentDetails(this.commitmentId).subscribe({
      next: (response: any) => {
        console.log('getDonationCommitmentDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        this.rawDetails = (response.message ?? null) as DonationCommitmentBackend | null;
        this.loading = false;
        this.refreshDisplay();
        this.loadWorkflow();
        this.loadVendorOffersAfterDetails();
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadWorkflow(): void {
    const donationRequestId = Number(this.details?.donationRequestId || 0);
    if (!donationRequestId) {
      this.rawWorkflow = [];
      this.workflowItems = [];
      return;
    }

    this.workflowLoading = true;
    const sub = this.donationRequestsService.getDonationRequestWorkflow(donationRequestId).subscribe({
      next: (response: any) => {
        console.log('getDonationRequestWorkflow response', response);
        if (!response?.success) {
          this.rawWorkflow = [];
          this.workflowItems = [];
          this.workflowLoading = false;
          return;
        }

        this.rawWorkflow = this.donationRequestsService.extractWorkflowHistory(response.message);
        this.workflowItems = this.donationRequestsService.mapDonationRequestWorkflow(this.rawWorkflow);
        this.workflowLoading = false;
      },
      error: () => {
        this.rawWorkflow = [];
        this.workflowItems = [];
        this.workflowLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  private loadVendorOffersAfterDetails(): void {
    const donationRequestId = Number(this.details?.donationRequestId || 0);
    if (!donationRequestId) {
      // TODO: backend should include Donation_Request_ID in 100502 commitment details
      this.offersMissingRequestId = true;
      this.rawVendorOffers = [];
      this.vendorOffers = [];
      this.hasSelectedOffer = false;
      this.offersLoading = false;
      return;
    }

    this.offersMissingRequestId = false;
    this.loadVendorOffers(donationRequestId);
  }

  private loadVendorOffers(donationRequestId: number): void {
    this.offersLoading = true;
    const sub = this.vendorOffersService.listVendorOffersForRequest(donationRequestId).subscribe({
      next: (response: any) => {
        console.log('listVendorOffersForRequest response', response);
        if (!response?.success) {
          this.handleBusinessError('listOffers', response);
          this.rawVendorOffers = [];
          this.vendorOffers = [];
          this.hasSelectedOffer = false;
          this.offersLoading = false;
          return;
        }

        const rawOffers = Array.isArray(response.message) ? (response.message as VendorOfferBackend[]) : [];
        this.rawVendorOffers = rawOffers;
        this.vendorOffers = rawOffers.map((item) => this.vendorOffersService.mapVendorOfferListItem(item));
        this.hasSelectedOffer = this.vendorOffers.some((offer) => {
          const code = String(offer.statusCode || '').toUpperCase();
          return code === 'SELECTED';
        });
        this.offersLoading = false;
      },
      error: () => {
        this.rawVendorOffers = [];
        this.vendorOffers = [];
        this.hasSelectedOffer = false;
        this.offersLoading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshDisplay(): void {
    this.details = this.donationCommitmentService.mapDonationCommitmentDetails(this.rawDetails);
    this.workflowItems = this.donationRequestsService.mapDonationRequestWorkflow(this.rawWorkflow);
    this.vendorOffers = this.rawVendorOffers.map((item) => this.vendorOffersService.mapVendorOfferListItem(item));
    this.hasSelectedOffer = this.vendorOffers.some((offer) => {
      const code = String(offer.statusCode || '').toUpperCase();
      return code === 'SELECTED';
    });
    if (!this.details) {
      return;
    }

    this.statusLabel = this.translate.getInstant(getCommitmentStatusLabelKey(this.details.statusId));
    this.statusSeverity = getCommitmentStatusSeverity(this.details.statusId);
    this.fulfillmentModeLabel = this.getFulfillmentModeLabel(this.details.fulfillmentMode);
    this.charityLabel = this.details.charityEntityId ? `#${this.details.charityEntityId}` : '-';
    this.charityRepLabel = this.details.charityRepUserId ? `#${this.details.charityRepUserId}` : '-';
  }

  private getFulfillmentModeLabel(mode: number): string {
    if (mode === FulfillmentMode.SelfFulfillment) {
      return this.translate.getInstant('donations.commitments.fulfillmentMode.selfFulfillment');
    }
    if (mode === FulfillmentMode.ViaCharityRepresentative) {
      return this.translate.getInstant('donations.commitments.fulfillmentMode.viaCharityRepresentative');
    }
    return '-';
  }

  private handleBusinessError(context: DonorCommitmentDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
        break;
      case 'listOffers':
        detail = this.getListOffersErrorMessage(code);
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
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.notDonor');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }

  private getListOffersErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13000':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.requestNotFound');
      case 'DAP13033':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.notAccessible');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.vendorOffers.errors.sessionExpired');
      default:
        return null;
    }
  }
}
