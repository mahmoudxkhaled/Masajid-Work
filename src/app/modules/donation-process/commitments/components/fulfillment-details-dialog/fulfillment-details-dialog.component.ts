import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationFulfillmentDetails } from '../../../models/donation-fulfillment.model';
import { getFulfilledByLabelKey } from '../../../models/fulfilled-by.model';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';

type FulfillmentDetailsDialogContext = 'load';

@Component({
  standalone: false,
  selector: 'app-fulfillment-details-dialog',
  templateUrl: './fulfillment-details-dialog.component.html',
  styleUrl: './fulfillment-details-dialog.component.scss',
})
export class FulfillmentDetailsDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationFulfillmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;
  details: DonationFulfillmentDetails | null = null;
  fulfilledByLabel = '';
  statusLabel = '';

  constructor(
    private donationFulfillmentService: DonationFulfillmentService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible && this.donationFulfillmentId > 0) {
      this.loadDetails();
    }
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.details = null;
    this.fulfilledByLabel = '';
    this.statusLabel = '';
  }

  private loadDetails(): void {
    this.loading = true;
    this.details = null;

    this.donationFulfillmentService.getFulfillmentDetails(this.donationFulfillmentId).subscribe({
      next: (response: any) => {
        console.log('getFulfillmentDetails response', response);
        if (!response?.success) {
          this.handleBusinessError('load', response);
          this.loading = false;
          return;
        }

        const raw = this.donationFulfillmentService.extractFulfillmentDetails(response.message);
        this.details = this.donationFulfillmentService.mapFulfillmentDetails(raw);
        this.fulfilledByLabel = this.details
          ? this.translate.getInstant(getFulfilledByLabelKey(this.details.fulfilledBy))
          : '-';
        this.statusLabel = this.details?.statusCode
          || (this.details?.statusId ? String(this.details.statusId) : '-');
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
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
