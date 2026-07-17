import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { LocalStorageService } from 'src/app/core/services/local-storage.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  CharityRepresentationDetails,
  DonationCommitmentBackend,
} from '../../../models/donation-commitment.model';
import { FulfillmentMode } from '../../../models/fulfillment-mode.model';
import { DonationRequestStatusBackend } from '../../../models/donation-request-status.model';
import { DonationReferenceService } from '../../../services/donation-reference.service';
import { CharityRepresentationService } from '../../services/charity-representation.service';

type CharityRepresentationDetailsContext = 'load';

@Component({
  standalone: false,
  selector: 'app-charity-representation-details',
  templateUrl: './charity-representation-details.component.html',
  styleUrl: './charity-representation-details.component.scss',
})
export class CharityRepresentationDetailsComponent implements OnInit, OnDestroy {
  commitmentId = 0;
  loading = true;
  details: CharityRepresentationDetails | null = null;
  respondDialogVisible = false;
  respondMode: 'accept' | 'reject' = 'accept';

  fulfillmentModeLabel = '';
  statusLabel = '';

  private rawDetails: DonationCommitmentBackend | null = null;
  private rawStatuses: DonationRequestStatusBackend[] = [];
  private statusLabelById: Record<number, string> = {};
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private charityRepresentationService: CharityRepresentationService,
    private donationReferenceService: DonationReferenceService,
    private localStorageService: LocalStorageService,
    private languageDirService: LanguageDirService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.commitmentId = Number(this.route.snapshot.paramMap.get('commitmentId') || 0);
    this.subscriptions.push(
      this.languageDirService.userLanguageCode$.subscribe(() => {
        this.buildStatusMaps();
        this.refreshDisplay();
      }),
    );
    this.loadStatuses();
    this.loadDetails();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  get canRespond(): boolean {
    if (!this.details) {
      return false;
    }
    return (
      this.details.fulfillmentMode === FulfillmentMode.ViaCharityRepresentative &&
      !this.details.charityRepUserId &&
      !this.details.cancelledAt &&
      !this.details.completedAt
    );
  }

  get showNotPending(): boolean {
    return !this.loading && Boolean(this.details) && !this.canRespond;
  }

  backToList(): void {
    this.router.navigate(['/donations/charity/representation']);
  }

  openAcceptDialog(): void {
    this.respondMode = 'accept';
    this.respondDialogVisible = true;
  }

  openRejectDialog(): void {
    this.respondMode = 'reject';
    this.respondDialogVisible = true;
  }

  onResponded(): void {
    this.router.navigate(['/donations/charity/representation']);
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

  private loadStatuses(): void {
    const sub = this.donationReferenceService.listDonationRequestStatuses().subscribe({
      next: (response: any) => {
        if (!response?.success) {
          return;
        }
        this.rawStatuses = this.donationReferenceService.extractDictionaryItems<DonationRequestStatusBackend>(
          response.message,
          'Request_Statuses',
        );
        this.buildStatusMaps();
        this.refreshDisplay();
      },
    });
    this.subscriptions.push(sub);
  }

  private loadDetails(): void {
    this.loading = true;
    const sub = this.charityRepresentationService.getDonationCommitmentDetails(this.commitmentId).subscribe({
      next: (response: any) => {
        console.log('Donation Commitment Details response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        this.rawDetails = (response.message ?? null) as DonationCommitmentBackend | null;
        this.loading = false;
        this.refreshDisplay();
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshDisplay(): void {
    if (!this.rawDetails) {
      this.details = null;
      return;
    }

    const item = this.rawDetails;
    this.details = {
      id: String(item.Donation_Commitment_ID || ''),
      donationRequestId: String(item.Donation_Request_ID || ''),
      donorUserId: Number(item.Donor_User_ID || 0),
      entityId: Number(item.Entity_ID || 0),
      statusId: Number(item.Status || 0),
      isAnonymous: Boolean(item.Is_Anonymous),
      fulfillmentMode: Number(item.Fulfillment_Mode || 0),
      charityEntityId: Number(item.Charity_Entity_ID || 0),
      charityRepUserId: item.Charity_Rep_User_ID != null ? Number(item.Charity_Rep_User_ID) : 0,
      expectedClosureAt: String(item.Expected_Closure_At || ''),
      acceptedAt: String(item.Accepted_At || ''),
      cancelledAt: item.Cancelled_At ? String(item.Cancelled_At) : '',
      cancelledByUserId: item.Cancelled_By_User_ID != null ? Number(item.Cancelled_By_User_ID) : 0,
      cancelReason: String(item.Cancel_Reason || ''),
      completedAt: item.Completed_At ? String(item.Completed_At) : '',
      title: this.localStorageService.pickRequestContentField(
        String(item.Request_Title || ''),
        String(item.Request_Title_Regional || ''),
      ),
    };

    this.fulfillmentModeLabel = this.getFulfillmentModeLabel(this.details.fulfillmentMode);
    this.statusLabel = this.statusLabelById[this.details.statusId] || '';
  }

  private buildStatusMaps(): void {
    const statuses = this.donationReferenceService.mapDonationRequestStatuses(this.rawStatuses);
    this.statusLabelById = statuses.reduce<Record<number, string>>((acc, item) => {
      acc[item.id] = item.name;
      return acc;
    }, {});
    if (this.details) {
      this.statusLabel = this.statusLabelById[this.details.statusId] || '';
    }
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

  private handleBusinessError(context: CharityRepresentationDetailsContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'load':
        detail = this.getLoadErrorMessage(code);
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
        return this.translate.getInstant('donations.charityRepresentation.errors.commitmentNotFound');
      case 'DAP13015':
        return this.translate.getInstant('donations.charityRepresentation.errors.notAssignedRepresentative');
      case 'DAP13010':
        return this.translate.getInstant('donations.charityRepresentation.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.charityRepresentation.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.charityRepresentation.errors.sessionExpired');
      default:
        return null;
    }
  }
}
