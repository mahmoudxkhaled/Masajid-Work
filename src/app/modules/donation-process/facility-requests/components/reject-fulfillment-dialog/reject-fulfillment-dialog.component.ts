import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MessageService } from 'primeng/api';
import { TranslationService } from 'src/app/core/services/translation.service';
import { DonationFulfillmentService } from '../../../services/donation-fulfillment.service';

type RejectFulfillmentDialogContext = 'reject';

@Component({
  standalone: false,
  selector: 'app-reject-fulfillment-dialog',
  templateUrl: './reject-fulfillment-dialog.component.html',
  styleUrl: './reject-fulfillment-dialog.component.scss',
})
export class RejectFulfillmentDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() donationFulfillmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() rejected = new EventEmitter<void>();

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

  confirmReject(): void {
    if (!this.donationFulfillmentId) {
      return;
    }

    const note = String(this.responseNote || '').trim();
    if (!note) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.warning'),
        detail: this.translate.getInstant(
          'donations.facility.fulfillments.rejectDialog.validation.noteRequired',
        ),
      });
      return;
    }

    this.donationFulfillmentService.rejectFulfillment(this.donationFulfillmentId, note).subscribe({
      next: (response: any) => {
        console.log('rejectFulfillment response', response);
        if (!response?.success) {
          this.handleBusinessError('reject', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.facility.fulfillments.messages.rejected'),
        });
        this.closeDialog();
        this.rejected.emit();
      },
    });
  }

  private handleBusinessError(context: RejectFulfillmentDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
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

  private getRejectErrorMessage(code: string): string | null {
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
