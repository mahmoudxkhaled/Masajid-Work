import { Component, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { LanguageDirService } from 'src/app/core/services/language-dir.service';
import { TranslationService } from 'src/app/core/services/translation.service';
import {
  DonationFulfillmentBackend,
  DonationFulfillmentDetails,
} from '../../../models/donation-fulfillment.model';
import { getFulfillmentStatusLabelKey } from '../../../models/donation-fulfillment-status.model';
import { getFulfilledByLabelKey } from '../../../models/fulfilled-by.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';

type FulfillmentDetailsDialogContext = 'load';

@Component({
  standalone: false,
  selector: 'app-fulfillment-details-dialog',
  templateUrl: './fulfillment-details-dialog.component.html',
  styleUrl: './fulfillment-details-dialog.component.scss',
})
export class FulfillmentDetailsDialogComponent implements OnChanges, OnDestroy {
  @Input() visible = false;
  @Input() donationFulfillmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;
  details: DonationFulfillmentDetails | null = null;
  fulfilledByLabel = '';
  statusLabel = '';

  private rawDetails: DonationFulfillmentBackend | null = null;
  private languageSub?: Subscription;

  constructor(
    private donationFulfillmentService: DonationFulfillmentService,
    private translate: TranslationService,
    private messageService: MessageService,
    private languageDirService: LanguageDirService,
  ) {
    this.languageSub = this.languageDirService.userLanguageCode$.subscribe(() => {
      this.refreshLabels();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.donationFulfillmentId > 0) {
      this.loadDetails();
    }
  }

  ngOnDestroy(): void {
    this.languageSub?.unsubscribe();
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.details = null;
    this.rawDetails = null;
    this.fulfilledByLabel = '';
    this.statusLabel = '';
  }

  private loadDetails(): void {
    this.loading = true;
    this.details = null;
    this.rawDetails = null;

    this.donationFulfillmentService.getFulfillmentDetails(this.donationFulfillmentId).subscribe({
      next: (response: any) => {
        console.log('getFulfillmentDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        this.rawDetails = this.donationFulfillmentService.extractFulfillmentDetails(response.message);
        this.refreshLabels();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  private refreshLabels(): void {
    this.details = this.donationFulfillmentService.mapFulfillmentDetails(this.rawDetails);
    this.fulfilledByLabel = this.details
      ? this.translate.getInstant(getFulfilledByLabelKey(this.details.fulfilledBy))
      : '-';
    this.statusLabel = this.details
      ? this.translate.getInstant(getFulfillmentStatusLabelKey(this.details.statusId))
      : '-';
  }

  private handleBusinessError(context: FulfillmentDetailsDialogContext, response: any): void {
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
      case 'DAP13005':
        return this.translate.getInstant('donations.commitments.errors.fulfillmentNotFound');
      case 'DAP11055':
        return this.translate.getInstant('donations.commitments.errors.accessDeniedAction');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.commitments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
