import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MessageService } from 'primeng/api';
import { DonationCommitmentService } from '../../services/donation-commitment.service';
import { TranslationService } from 'src/app/core/services/translation.service';

type CancelCommitmentDialogContext = 'cancel';

@Component({
  standalone: false,
  selector: 'app-cancel-commitment-dialog',
  templateUrl: './cancel-commitment-dialog.component.html',
  styleUrl: './cancel-commitment-dialog.component.scss',
})
export class CancelCommitmentDialogComponent {
  @Input() visible = false;
  @Input() donationCommitmentId = 0;

  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() cancelled = new EventEmitter<void>();

  reason = '';
  isLoading$ = this.donationCommitmentService.isLoadingSubject.asObservable();

  constructor(
    private donationCommitmentService: DonationCommitmentService,
    private translate: TranslationService,
    private messageService: MessageService,
  ) { }

  closeDialog(): void {
    this.visible = false;
    this.visibleChange.emit(false);
    this.reason = '';
  }

  confirmCancel(): void {
    const trimmedReason = String(this.reason || '').trim();
    if (!trimmedReason) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.getInstant('common.error'),
        detail: this.translate.getInstant('donations.commitments.cancelDialog.validation.reasonRequired'),
      });
      return;
    }

    this.donationCommitmentService.cancelDonationCommitment(this.donationCommitmentId, trimmedReason).subscribe({
      next: (response: any) => {
        console.log('cancelDonationCommitment response', response);
        if (!response?.success) {
          this.handleBusinessError('cancel', response);
          return;
        }

        this.messageService.add({
          severity: 'success',
          summary: this.translate.getInstant('common.success'),
          detail: this.translate.getInstant('donations.commitments.messages.cancelled'),
        });
        this.closeDialog();
        this.cancelled.emit();
      },
    });
  }

  private handleBusinessError(context: CancelCommitmentDialogContext, response: any): void {
    const code = String(response?.message || '');
    let detail: string | null = null;

    switch (context) {
      case 'cancel':
        detail = this.getCancelErrorMessage(code);
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

  private getCancelErrorMessage(code: string): string | null {
    switch (code) {
      case 'DAP13003':
        return this.translate.getInstant('donations.commitments.errors.commitmentNotFound');
      case 'DAP13014':
        return this.translate.getInstant('donations.commitments.errors.notDonor');
      case 'DAP13010':
        return this.translate.getInstant('donations.commitments.errors.invalidStatus');
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
}
