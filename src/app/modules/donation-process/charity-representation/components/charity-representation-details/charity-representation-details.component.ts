import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationCommitmentBackend, DonationCommitmentDetails } from '../../../models/donation-commitment.model';
import { FulfillmentMode } from '../../../models/fulfillment-mode.model';
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
  details: DonationCommitmentDetails | null = null;
  respondDialogVisible = false;
  respondMode: 'accept' | 'reject' = 'accept';

  fulfillmentModeLabel = '';
  charityLabel = '';
  charityRepLabel = '';

  private rawDetails: DonationCommitmentBackend | null = null;
  private subscriptions: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private charityRepresentationService: CharityRepresentationService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.commitmentId = Number(this.route.snapshot.paramMap.get('commitmentId') || 0);
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

  private loadDetails(): void {
    this.loading = true;
    const sub = this.charityRepresentationService.getDonationCommitmentDetails(this.commitmentId).subscribe({
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
      },
      error: () => {
        this.loading = false;
      },
    });
    this.subscriptions.push(sub);
  }

  // #endregion

  private refreshDisplay(): void {
    this.details = this.charityRepresentationService.mapCommitmentDetails(this.rawDetails);
    if (!this.details) {
      return;
    }

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
