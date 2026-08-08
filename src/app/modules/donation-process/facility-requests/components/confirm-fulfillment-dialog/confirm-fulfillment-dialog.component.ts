import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';

type ConfirmFulfillmentDialogContext = 'confirm';

@Component({
  standalone: false,
  selector: 'app-confirm-fulfillment-dialog',
  templateUrl: './confirm-fulfillment-dialog.component.html',
  styleUrl: './confirm-fulfillment-dialog.component.scss',
})
export class ConfirmFulfillmentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationFulfillmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() confirmed = new EventEmitter<void>();

  responseNote = '';
  isLoading$ = this.donationFulfillmentService.isLoadingSubject.asObservable();

  constructor(
    private donationFulfillmentService: DonationFulfillmentService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible']?.currentValue === true) {
      this.responseNote = '';
    }
  }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.responseNote = '';
  }

  confirm(): void {
    if (!this.donationFulfillmentId) {
      return;
    }

    const note = String(this.responseNote || '').trim();
    this.donationFulfillmentService.confirmFulfillment(this.donationFulfillmentId, note).subscribe({
      next: (response: any) => {
        console.log('confirmFulfillment response', response);
        if (!response?.success) {
          this.handleBusinessError('confirm', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.fulfillments.messages.confirmed'),
        });
        this.closeDialog();
        this.confirmed.emit();
      },
    });
  }

  private handleBusinessError(context: ConfirmFulfillmentDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'confirm':
        detail = this.getConfirmErrorMessage(code);
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

  private getConfirmErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13005':
        return this.translate.getInstant('donations.facility.fulfillments.errors.fulfillmentNotFound');
      case 'DAP13013':
        return this.translate.getInstant('donations.facility.fulfillments.errors.notOwnerFacility');
      case 'DAP13010':
        return this.translate.getInstant('donations.facility.fulfillments.errors.invalidStatus');
      case 'DAP11055':
        return this.translate.getInstant('donations.facility.fulfillments.errors.accessDenied');
      case 'DAP11040':
      case 'DAP11041':
      case 'DAP11042':
        return this.translate.getInstant('donations.facility.fulfillments.errors.sessionExpired');
      default:
        return null;
    }
  }
}
